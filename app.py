import os
import io
import json as _json_module
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

# 행정 용어 사전: 앱 시작 시 1회 로드
_TERM_DICT = {}
_term_dict_path = os.path.join(os.path.dirname(__file__), 'static', 'data', 'term_dict.json')
if os.path.exists(_term_dict_path):
    with open(_term_dict_path, encoding='utf-8') as _f:
        _TERM_DICT = _json_module.load(_f)


@app.route('/')
def index():
    return render_template('index.html', active='converter')

@app.route('/welfare')
def welfare_page():
    return render_template('welfare.html', active='welfare')

@app.route('/civil')
def civil_page():
    return render_template('civil.html', active='civil')


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

    # 용어 사전 우선 조회 (LLM 호출 없이 즉각 응답)
    if word in _TERM_DICT:
        entry = _TERM_DICT[word]
        return jsonify({'word': word, 'explanation': entry['explanation'], 'example': entry.get('example', '')})

    result = llm.explain_word(word, context)
    if 'error' in result:
        return jsonify(result), 500
    return jsonify(result)


@app.route('/welfare/match', methods=['POST'])
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


@app.route('/civil/draft', methods=['POST'])
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

    document     = data.get('document', '').strip()
    detail_level = data.get('detail_level', 'normal')
    if not document:
        return jsonify({'error': '문서 내용을 입력해주세요.'}), 400
    if len(document) > 10000:
        return jsonify({'error': '문서가 너무 깁니다.'}), 400

    def generate():
        import json as _json
        try:
            for event in llm.analyze_document_stream(document, detail_level):
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
