import os
from flask import Flask, render_template, request, jsonify
from dotenv import load_dotenv
from llm_service import LLMService

load_dotenv()

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 2 * 1024 * 1024  # 파일 업로드 최대 2MB

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

    if filename.endswith('.txt'):
        try:
            text = file.read().decode('utf-8')
        except UnicodeDecodeError:
            text = file.read().decode('cp949', errors='ignore')
        return jsonify({'text': text})

    elif filename.endswith('.pdf'):
        try:
            import pdfplumber
            import io
            with pdfplumber.open(io.BytesIO(file.read())) as pdf:
                text = '\n'.join(
                    page.extract_text() or '' for page in pdf.pages
                )
            return jsonify({'text': text})
        except ImportError:
            return jsonify({'error': 'PDF 지원을 위해 pdfplumber를 설치해주세요: pip install pdfplumber'}), 500

    return jsonify({'error': '.txt 또는 .pdf 파일만 지원합니다.'}), 400


if __name__ == '__main__':
    print(f'LLM Provider: {os.getenv("LLM_PROVIDER", "gemini")}')
    app.run(debug=True, host='0.0.0.0', port=5000)
