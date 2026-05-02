import os
import io
import tempfile
import zipfile
import subprocess
from xml.etree import ElementTree as ET
from flask import Flask, render_template, request, jsonify, Response
from dotenv import load_dotenv
from llm_service import LLMService

load_dotenv()

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 20 * 1024 * 1024  # 최대 20MB

llm = LLMService()


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/analyze', methods=['POST'])
def analyze():
    data = request.get_json()
    if not data:
        return jsonify({'error': '요청 데이터가 없습니다.'}), 400

    document = data.get('document', '').strip()
    if not document:
        return jsonify({'error': '문서 내용을 입력해주세요.'}), 400
    if len(document) > 10000:
        return jsonify({'error': '문서가 너무 깁니다. 10,000자 이하로 입력해주세요.'}), 400

    result = llm.analyze_document(document)
    if 'error' in result:
        return jsonify(result), 500
    return jsonify(result)


@app.route('/explain', methods=['POST'])
def explain():
    data = request.get_json()
    if not data:
        return jsonify({'error': '요청 데이터가 없습니다.'}), 400

    word = data.get('word', '').strip()
    context = data.get('context', '').strip()

    if not word:
        return jsonify({'error': '단어를 입력해주세요.'}), 400

    result = llm.explain_word(word, context)
    if 'error' in result:
        return jsonify(result), 500
    return jsonify(result)


@app.route('/upload', methods=['POST'])
def upload():
    if 'file' not in request.files:
        return jsonify({'error': '파일이 없습니다.'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': '파일을 선택해주세요.'}), 400

    filename = file.filename.lower()
    file_bytes = file.read()

    if filename.endswith('.txt'):
        try:
            text = file_bytes.decode('utf-8')
        except UnicodeDecodeError:
            text = file_bytes.decode('cp949', errors='ignore')
        return jsonify({'text': text})

    elif filename.endswith('.pdf'):
        try:
            import pdfplumber
            with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
                text = '\n'.join(page.extract_text() or '' for page in pdf.pages)
            return jsonify({'text': text.strip()})
        except ImportError:
            return jsonify({'error': 'PDF 지원을 위해 pdfplumber를 설치해주세요: pip install pdfplumber'}), 500

    elif filename.endswith('.hwpx'):
        try:
            text = _extract_hwpx(file_bytes)
            return jsonify({'text': text})
        except Exception as e:
            return jsonify({'error': f'HWPX 파싱 실패: {e}'}), 500

    elif filename.endswith('.hwp'):
        try:
            text = _extract_hwp(file_bytes)
            return jsonify({'text': text})
        except Exception as e:
            return jsonify({'error': f'HWP 파싱 실패: {e}'}), 500

    return jsonify({'error': '.txt / .pdf / .hwp / .hwpx 파일만 지원합니다.'}), 400


def _extract_hwpx(file_bytes: bytes) -> str:
    """HWPX(ZIP+XML) 텍스트 추출"""
    texts = []
    with zipfile.ZipFile(io.BytesIO(file_bytes)) as z:
        section_files = sorted([
            n for n in z.namelist()
            if n.startswith('Contents/section') and n.endswith('.xml')
        ])
        if not section_files:
            # 구조가 다를 경우 fallback
            section_files = sorted([
                n for n in z.namelist() if n.endswith('.xml')
            ])
        for name in section_files:
            with z.open(name) as f:
                content = f.read().decode('utf-8', errors='ignore')
            root = ET.fromstring(content)
            for elem in root.iter():
                tag = elem.tag.split('}')[-1] if '}' in elem.tag else elem.tag
                if tag == 't' and elem.text:
                    texts.append(elem.text)
                elif tag in ('lineBreak', 'br'):
                    texts.append('\n')
    return ''.join(texts).strip()


def _extract_hwp(file_bytes: bytes) -> str:
    """HWP 바이너리 텍스트 추출 (pyhwp 사용)"""
    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(suffix='.hwp', delete=False) as f:
            f.write(file_bytes)
            tmp_path = f.name

        result = subprocess.run(
            ['hwp5txt', tmp_path],
            capture_output=True, encoding='utf-8', errors='ignore', timeout=30
        )
        if result.returncode != 0:
            raise RuntimeError(result.stderr or 'hwp5txt 변환 실패')
        return result.stdout.strip()
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)


@app.route('/analyze/stream', methods=['POST'])
def analyze_stream():
    data = request.get_json()
    if not data:
        return jsonify({'error': '요청 데이터가 없습니다.'}), 400

    document = data.get('document', '').strip()
    if not document:
        return jsonify({'error': '문서 내용을 입력해주세요.'}), 400
    if len(document) > 10000:
        return jsonify({'error': '문서가 너무 깁니다.'}), 400

    def generate():
        import json as _json
        try:
            for event in llm.analyze_document_stream(document):
                yield f"data: {_json.dumps(event, ensure_ascii=False)}\n\n"
        except Exception as e:
            yield f"data: {_json.dumps({'error': str(e)})}\n\n"
        yield "data: [DONE]\n\n"

    return Response(
        generate(),
        mimetype='text/event-stream',
        headers={'X-Accel-Buffering': 'no', 'Cache-Control': 'no-cache'},
    )


@app.route('/chat', methods=['POST'])
def chat():
    data = request.get_json()
    if not data:
        return jsonify({'error': '요청 데이터가 없습니다.'}), 400

    document = data.get('document', '').strip()
    history  = data.get('history', [])
    question = data.get('question', '').strip()

    if not question:
        return jsonify({'error': '질문을 입력해주세요.'}), 400
    if not document:
        return jsonify({'error': '먼저 문서를 분석해주세요.'}), 400
    if len(history) > 20:
        history = history[-20:]  # 최근 20개만 유지

    result = llm.chat_with_document(document, history, question)
    if 'error' in result:
        return jsonify(result), 500
    return jsonify(result)


if __name__ == '__main__':
    print(f'LLM Provider: {os.getenv("LLM_PROVIDER", "gemini")}')
    app.run(debug=True, host='0.0.0.0', port=5000)
