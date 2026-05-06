from io import BytesIO
from pathlib import Path
from zipfile import BadZipFile, ZipFile
import xml.etree.ElementTree as ET

from fastapi import HTTPException, UploadFile

from app.models import DocumentBlock, DocumentParseResponse, DocumentTableCell


SUPPORTED_EXTENSIONS = {".txt", ".md", ".hwpx", ".docx"}


async def parse_upload(file: UploadFile) -> DocumentParseResponse:
    filename = file.filename or "uploaded-document"
    extension = Path(filename).suffix.lower()
    content = await file.read()

    if extension not in SUPPORTED_EXTENSIONS:
        raise HTTPException(
            status_code=415,
            detail="지원하지 않는 파일 형식입니다. TXT, MD, HWPX, DOCX 파일을 업로드해 주세요.",
        )

    warnings: list[str] = []

    if extension in {".txt", ".md"}:
        blocks = _text_to_blocks(_decode_text(content))
    elif extension == ".hwpx":
        blocks = _extract_hwpx_blocks(content)
    else:
        blocks = _extract_docx_blocks(content)

    text = "\n".join(block.text for block in blocks).strip()
    if not text:
        warnings.append("문서에서 읽을 수 있는 텍스트를 찾지 못했습니다.")

    return DocumentParseResponse(
        filename=filename,
        extension=extension.removeprefix("."),
        text=text,
        blocks=blocks,
        warnings=warnings,
    )


def _decode_text(content: bytes) -> str:
    for encoding in ("utf-8-sig", "utf-8", "cp949", "euc-kr"):
        try:
            return content.decode(encoding)
        except UnicodeDecodeError:
            continue
    return content.decode("utf-8", errors="ignore")


def _extract_hwpx_blocks(content: bytes) -> list[DocumentBlock]:
    try:
        with ZipFile(BytesIO(content)) as archive:
            xml_names = [
                name
                for name in archive.namelist()
                if name.lower().endswith(".xml")
                and name.lower().startswith("contents/")
                and "section" in name.lower()
            ]
            xml_names.sort()
            xml_blocks = _mark_page_breaks(_xml_files_to_blocks(archive, xml_names))
            if xml_blocks:
                return xml_blocks

            preview_name = _find_preview_text(archive)
            if preview_name:
                preview_text = _decode_text(archive.read(preview_name))
                return _text_to_blocks(_clean_hwpx_preview_text(preview_text))

            return []
    except BadZipFile as exc:
        raise HTTPException(status_code=400, detail="HWPX 파일을 열 수 없습니다.") from exc


def _extract_docx_blocks(content: bytes) -> list[DocumentBlock]:
    try:
        with ZipFile(BytesIO(content)) as archive:
            names = [name for name in archive.namelist() if name.startswith("word/") and name.endswith(".xml")]
            priority = ["word/document.xml"] + sorted(name for name in names if name != "word/document.xml")
            return _xml_files_to_blocks(archive, [name for name in priority if name in names])
    except BadZipFile as exc:
        raise HTTPException(status_code=400, detail="DOCX 파일을 열 수 없습니다.") from exc


def _xml_files_to_blocks(archive: ZipFile, names: list[str]) -> list[DocumentBlock]:
    blocks: list[DocumentBlock] = []
    for name in names:
        blocks.extend(_extract_xml_blocks(archive.read(name)))
    return blocks


def _extract_xml_blocks(content: bytes) -> list[DocumentBlock]:
    try:
        root = ET.fromstring(content)
    except ET.ParseError:
        return []

    blocks: list[DocumentBlock] = []

    for node in root:
        blocks.extend(_extract_blocks_from_node(node))

    if blocks:
        return _dedupe_blocks(blocks)

    fallback = _normalize_inline_text(" ".join(root.itertext()))
    return _text_to_blocks(fallback)


def _extract_blocks_from_node(node: ET.Element) -> list[DocumentBlock]:
    name = _local_name(node.tag)

    if name == "tbl":
        table = _table_to_block(node)
        return [table] if table else []

    if name == "p":
        tables = [child for child in node.iter() if _local_name(child.tag) == "tbl"]
        if tables:
            return [block for table in tables if (block := _table_to_block(table))]

        text = _normalize_inline_text(" ".join(node.itertext()))
        if text:
            if _is_page_separator(text):
                return [DocumentBlock(type="pageBreak", text="", pageBreakBefore=True)]
            return [DocumentBlock(type=_guess_block_type(text), text=text)]
        return []

    blocks: list[DocumentBlock] = []
    for child in node:
        blocks.extend(_extract_blocks_from_node(child))
    return blocks


def _table_to_block(table_node: ET.Element) -> DocumentBlock | None:
    rows: list[list[DocumentTableCell]] = []

    for row_node in [node for node in table_node if _local_name(node.tag) == "tr"]:
        row: list[DocumentTableCell] = []
        for cell_node in [node for node in row_node if _local_name(node.tag) == "tc"]:
            text = _cell_text(cell_node)
            span_node = _first_child(cell_node, "cellSpan")
            col_span = _safe_int(span_node.attrib.get("colSpan") if span_node is not None else None, 1)
            row_span = _safe_int(span_node.attrib.get("rowSpan") if span_node is not None else None, 1)
            row.append(DocumentTableCell(text=text, colSpan=col_span, rowSpan=row_span))
        if any(cell.text for cell in row):
            rows.append(row)

    if not rows:
        return None

    text = "\n".join(" | ".join(cell.text for cell in row if cell.text) for row in rows)
    return DocumentBlock(type="table", text=text, rows=rows)


def _cell_text(cell_node: ET.Element) -> str:
    paragraphs: list[str] = []
    sub_list = _first_child(cell_node, "subList")
    text_root = sub_list if sub_list is not None else cell_node

    for paragraph in [node for node in text_root.iter() if _local_name(node.tag) == "p"]:
        paragraph_text = _normalize_inline_text(" ".join(paragraph.itertext()))
        if paragraph_text:
            paragraphs.append(paragraph_text)

    if paragraphs:
        return "\n".join(paragraphs)

    return _normalize_inline_text(" ".join(text_root.itertext()))


def _first_child(node: ET.Element, local_name: str) -> ET.Element | None:
    for child in node:
        if _local_name(child.tag) == local_name:
            return child
    return None


def _safe_int(value: str | None, fallback: int) -> int:
    try:
        if value is None:
            return fallback
        return max(1, int(value))
    except ValueError:
        return fallback


def _find_preview_text(archive: ZipFile) -> str | None:
    for name in archive.namelist():
        if name.lower() == "preview/prvtext.txt":
            return name
    return None


def _clean_hwpx_preview_text(text: str) -> str:
    # HWPX preview text often wraps visual table cells with angle brackets.
    # Keep those as line breaks so forms still read like their original layout.
    cleaned = text.replace("\r\n", "\n").replace("\r", "\n")
    cleaned = cleaned.replace("><", ">\n<")
    cleaned = cleaned.replace("<", "").replace(">", "")
    lines = [_normalize_inline_text(line) for line in cleaned.split("\n")]
    return "\n".join(line for line in lines if line)


def _text_to_blocks(text: str) -> list[DocumentBlock]:
    normalized = text.replace("\r\n", "\n").replace("\r", "\n")
    chunks = [chunk.strip() for chunk in normalized.split("\n") if chunk.strip()]
    blocks: list[DocumentBlock] = []
    for chunk in chunks:
        text = _normalize_inline_text(chunk)
        if _is_page_separator(text):
            blocks.append(DocumentBlock(type="pageBreak", text="", pageBreakBefore=True))
        else:
            blocks.append(DocumentBlock(type=_guess_block_type(text), text=text))
    return _mark_page_breaks(blocks)


def _guess_block_type(text: str) -> str:
    stripped = text.strip()
    if stripped.startswith(("-", "*", "•")) or stripped[:2].isdigit() and stripped[2:3] in {".", ")"}:
        return "list"
    if len(stripped) <= 32 and not stripped.endswith((".", "?", "!", "。", "！", "？")):
        return "heading"
    return "paragraph"


def _dedupe_blocks(blocks: list[DocumentBlock]) -> list[DocumentBlock]:
    deduped: list[DocumentBlock] = []
    previous = ("", "")
    for block in blocks:
        signature = (block.type, block.text)
        if signature == previous:
            continue
        deduped.append(block)
        previous = signature
    return deduped


def _mark_page_breaks(blocks: list[DocumentBlock]) -> list[DocumentBlock]:
    marked: list[DocumentBlock] = []
    pending_page_break = False

    for index, block in enumerate(blocks):
        if block.type == "pageBreak":
            pending_page_break = True
            continue

        if pending_page_break or _looks_like_back_page_heading(block):
            block.pageBreakBefore = bool(marked)
            pending_page_break = False

        marked.append(block)

    return marked


def _looks_like_back_page_heading(block: DocumentBlock) -> bool:
    if block.type == "table" and block.text.startswith("작 성 방 법"):
        return True
    return block.type == "heading" and block.text.replace(" ", "") in {"작성방법", "인구동향조사"}


def _is_page_separator(text: str) -> bool:
    stripped = text.strip()
    return len(stripped) >= 20 and set(stripped) <= {"-", "─", "_"}


def _normalize_inline_text(text: str) -> str:
    return " ".join(text.split()).strip()


def _local_name(tag: str) -> str:
    return tag.rsplit("}", 1)[-1]
