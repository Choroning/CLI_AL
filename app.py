import os
import io
import json as _json_module
import tempfile
import zipfile
import subprocess
from xml.etree import ElementTree as ET
from flask import Flask, render_template, request, jsonify, Response
from dotenv import load_dotenv
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from llm_service import LLMService

load_dotenv()

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 10 * 1024 * 1024  # 최대 10MB

limiter = Limiter(
    get_remote_address,
    app=app,
    default_limits=[],
    storage_uri="memory://",
)

llm = LLMService()

# 행정 용어 사전: 앱 시작 시 1회 로드
_TERM_DICT = {}
_term_dict_path = os.path.join(os.path.dirname(__file__), 'static', 'data', 'term_dict.json')
if os.path.exists(_term_dict_path):
    with open(_term_dict_path, encoding='utf-8') as _f:
        _TERM_DICT = _json_module.load(_f)


@app.route('/')
def landing():
    return render_template('landing.html', active='home')

@app.route('/converter')
def index():
    return render_template('index.html', active='converter')

@app.route('/welfare')
def welfare_page():
    return render_template('welfare.html', active='welfare')

@app.route('/civil')
def civil_page():
    return render_template('civil.html', active='civil')

@app.route('/contract')
def contract_page():
    return render_template('contract.html', active='contract')

@app.route('/procedure')
def procedure_page():
    return render_template('procedure.html', active='procedure')

@app.route('/rights')
def rights_page():
    return render_template('rights.html', active='rights')


@app.route('/analyze', methods=['POST'])
@limiter.limit("10 per minute")
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
@limiter.limit("20 per minute")
def explain():
    data = request.get_json()
    if not data:
        return jsonify({'error': '요청 데이터가 없습니다.'}), 400

    word = data.get('word', '').strip()
    context = data.get('context', '').strip()

    if not word:
        return jsonify({'error': '단어를 입력해주세요.'}), 400

    # 용어 사전 우선 조회 (LLM 호출 없이 즉각 응답)
    if word in _TERM_DICT:
        entry = _TERM_DICT[word]
        return jsonify({'word': word, 'explanation': entry['explanation'], 'example': entry.get('example', '')})

    result = llm.explain_word(word, context)
    if 'error' in result:
        return jsonify(result), 500
    return jsonify(result)


@app.route('/welfare/match', methods=['POST'])
@limiter.limit("5 per minute")
def welfare_match():
    data = request.get_json()
    if not data:
        return jsonify({'error': '입력 데이터가 없습니다.'}), 400

    profile = {
        'age':         data.get('age', '정보 없음'),
        'household':   data.get('household', '정보 없음'),
        'income':      data.get('income', '정보 없음'),
        'disability':  data.get('disability', '없음'),
        'has_infant':  '예' if data.get('has_infant') else '아니오',
        'has_child':   '예' if data.get('has_child') else '아니오',
        'has_elderly': '예' if data.get('has_elderly') else '아니오',
        'region':      data.get('region', '전국'),
    }

    result = llm.match_welfare(profile)
    if 'error' in result:
        return jsonify(result), 500
    return jsonify(result)


@app.route('/contract/draft', methods=['POST'])
@limiter.limit("5 per minute")
def contract_draft():
    data = request.get_json()
    if not data:
        return jsonify({'error': '입력 데이터가 없습니다.'}), 400
    contract_type = data.get('contract_type', '기타 계약')
    situation     = data.get('situation', '').strip()
    if not situation:
        return jsonify({'error': '상황을 설명해주세요.'}), 400
    if len(situation) > 1000:
        return jsonify({'error': '1,000자 이하로 입력해주세요.'}), 400
    result = llm.draft_contract(contract_type, situation)
    if 'error' in result:
        return jsonify(result), 500
    return jsonify(result)


@app.route('/procedure/guide', methods=['POST'])
@limiter.limit("5 per minute")
def procedure_guide():
    data = request.get_json()
    if not data:
        return jsonify({'error': '입력 데이터가 없습니다.'}), 400
    procedure_type = data.get('procedure_type', '기타')
    situation      = data.get('situation', '').strip()
    if not situation:
        return jsonify({'error': '상황을 설명해주세요.'}), 400
    if len(situation) > 500:
        return jsonify({'error': '500자 이하로 입력해주세요.'}), 400
    result = llm.guide_procedure(procedure_type, situation)
    if 'error' in result:
        return jsonify(result), 500
    return jsonify(result)


@app.route('/rights/advise', methods=['POST'])
@limiter.limit("5 per minute")
def rights_advise():
    data = request.get_json()
    if not data:
        return jsonify({'error': '입력 데이터가 없습니다.'}), 400
    situation = data.get('situation', '').strip()
    if not situation:
        return jsonify({'error': '상황을 설명해주세요.'}), 400
    if len(situation) > 1000:
        return jsonify({'error': '1,000자 이하로 입력해주세요.'}), 400
    result = llm.advise_rights(situation)
    if 'error' in result:
        return jsonify(result), 500
    return jsonify(result)


@app.route('/civil/draft', methods=['POST'])
@limiter.limit("5 per minute")
def civil_draft():
    data = request.get_json()
    if not data:
        return jsonify({'error': '입력 데이터가 없습니다.'}), 400

    civil_type = data.get('civil_type', '민원')
    situation  = data.get('situation', '').strip()

    if not situation:
        return jsonify({'error': '상황을 설명해주세요.'}), 400
    if len(situation) > 1000:
        return jsonify({'error': '상황 설명이 너무 깁니다. 1,000자 이하로 입력해주세요.'}), 400

    result = llm.draft_civil(civil_type, situation)
    if 'error' in result:
        return jsonify(result), 500
    return jsonify(result)


_MAX_TEXT_CHARS = 10000  # LLM 입력 한도와 동일

@app.route('/upload', methods=['POST'])
def upload():
    if 'file' not in request.files:
        return jsonify({'error': '파일이 없습니다.'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': '파일을 선택해주세요.'}), 400

    filename = file.filename.lower()
    file_bytes = file.read()
    text = None

    if filename.endswith('.txt'):
        try:
            text = file_bytes.decode('utf-8')
        except UnicodeDecodeError:
            text = file_bytes.decode('cp949', errors='ignore')

    elif filename.endswith('.pdf'):
        try:
            import pdfplumber
            with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
                text = '\n'.join(page.extract_text() or '' for page in pdf.pages).strip()
        except ImportError:
            return jsonify({'error': 'PDF 지원을 위해 pdfplumber를 설치해주세요.'}), 500

    elif filename.endswith('.docx'):
        try:
            from docx import Document
            doc = Document(io.BytesIO(file_bytes))
            text = '\n'.join(p.text for p in doc.paragraphs if p.text.strip())
        except ImportError:
            return jsonify({'error': 'DOCX 지원을 위해 python-docx를 설치해주세요.'}), 500

    elif filename.endswith('.hwpx'):
        try:
            text = _extract_hwpx(file_bytes)
        except Exception as e:
            return jsonify({'error': f'HWPX 파싱 실패: {e}'}), 500

    elif filename.endswith('.hwp'):
        try:
            text = _extract_hwp(file_bytes)
        except Exception as e:
            return jsonify({'error': f'HWP 파싱 실패: {e}'}), 500

    else:
        return jsonify({'error': '.txt / .pdf / .docx / .hwp / .hwpx 파일만 지원합니다.'}), 400

    if text is None:
        return jsonify({'error': '파일을 읽을 수 없습니다.'}), 500

    if len(text) > _MAX_TEXT_CHARS:
        return jsonify({
            'error': f'추출된 텍스트가 너무 깁니다 ({len(text):,}자). '
                     f'AI 분석은 {_MAX_TEXT_CHARS:,}자 이하만 가능합니다. '
                     '문서 일부를 복사해서 붙여넣기 해주세요.',
            'too_long': True,
            'text': text[:_MAX_TEXT_CHARS],
        }), 413

    return jsonify({'text': text})


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


def _find_hwp5txt() -> str:
    """hwp5txt 실행 파일 경로 탐색"""
    import shutil
    path = shutil.which('hwp5txt')
    if path:
        return path
    candidates = [
        os.path.expanduser('~/Library/Python/3.9/bin/hwp5txt'),
        os.path.expanduser('~/Library/Python/3.10/bin/hwp5txt'),
        os.path.expanduser('~/Library/Python/3.11/bin/hwp5txt'),
        os.path.expanduser('~/.local/bin/hwp5txt'),
        '/usr/local/bin/hwp5txt',
    ]
    for c in candidates:
        if os.path.exists(c):
            return c
    return ''


def _extract_hwp(file_bytes: bytes) -> str:
    """HWP 바이너리 텍스트 추출 (pyhwp 사용)"""
    hwp5txt = _find_hwp5txt()
    if not hwp5txt:
        raise RuntimeError(
            'hwp5txt를 찾을 수 없습니다. '
            'pip install pyhwp 후 다시 시도해주세요.'
        )
    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(suffix='.hwp', delete=False) as f:
            f.write(file_bytes)
            tmp_path = f.name

        result = subprocess.run(
            [hwp5txt, tmp_path],
            capture_output=True, encoding='utf-8', errors='ignore', timeout=30
        )
        if result.returncode != 0:
            raise RuntimeError(result.stderr or 'hwp5txt 변환 실패')
        return result.stdout.strip()
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)


@app.route('/analyze/stream', methods=['POST'])
@limiter.limit("10 per minute")
def analyze_stream():
    data = request.get_json()
    if not data:
        return jsonify({'error': '요청 데이터가 없습니다.'}), 400

    document     = data.get('document', '').strip()
    detail_level = data.get('detail_level', 'normal')
    output_lang  = data.get('output_lang', 'ko')
    if output_lang not in ('ko', 'en', 'zh', 'vi', 'ja'):
        output_lang = 'ko'
    if not document:
        return jsonify({'error': '문서 내용을 입력해주세요.'}), 400
    if len(document) > 10000:
        return jsonify({'error': '문서가 너무 깁니다.'}), 400

    def generate():
        import json as _json
        try:
            for event in llm.analyze_document_stream(document, detail_level, output_lang):
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
