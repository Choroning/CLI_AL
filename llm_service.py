import os
import json
import re
from prompts import build_analyze_prompt, EXPLAIN_PROMPT

# .env 또는 환경변수에서 LLM_PROVIDER 읽음
# 지원 값: 'gemini' | 'groq' | 'ollama'
PROVIDER = os.getenv('LLM_PROVIDER', 'gemini')


class LLMService:
    def __init__(self):
        self.provider = PROVIDER
        self._init_client()

    def _init_client(self):
        if self.provider == 'gemini':
            import google.generativeai as genai
            genai.configure(api_key=os.getenv('GEMINI_API_KEY'))
            self.model = genai.GenerativeModel('gemini-2.0-flash')

        elif self.provider == 'groq':
            from groq import Groq
            self.client = Groq(api_key=os.getenv('GROQ_API_KEY'))
            self.model_name = os.getenv('GROQ_MODEL', 'llama-3.3-70b-versatile')

        elif self.provider == 'ollama':
            # ollama는 별도 설치 필요: https://ollama.ai
            self.model_name = os.getenv('OLLAMA_MODEL', 'gemma2:9b')

    def _call(self, prompt: str) -> str:
        if self.provider == 'gemini':
            response = self.model.generate_content(prompt)
            return response.text

        elif self.provider == 'groq':
            response = self.client.chat.completions.create(
                model=self.model_name,
                messages=[{'role': 'user', 'content': prompt}],
                temperature=0.3,
            )
            return response.choices[0].message.content

        elif self.provider == 'ollama':
            import ollama
            response = ollama.chat(
                model=self.model_name,
                messages=[{'role': 'user', 'content': prompt}],
            )
            return response['message']['content']

        raise ValueError(f'지원하지 않는 LLM_PROVIDER: {self.provider}')

    def _parse_json(self, text: str) -> dict:
        # 마크다운 코드블록 제거
        text = re.sub(r'```(?:json)?\s*', '', text).strip()
        # JSON 객체 추출
        match = re.search(r'\{.*\}', text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group())
            except json.JSONDecodeError as e:
                return {'error': f'JSON 파싱 실패: {e}', 'raw': text}
        return {'error': '응답에서 JSON을 찾을 수 없습니다.', 'raw': text}

    def analyze_document(self, document: str) -> dict:
        from rag_service import get_rag_context
        rag_context = get_rag_context(document)
        prompt = build_analyze_prompt(document, rag_context)
        try:
            raw = self._call(prompt)
            result = self._parse_json(raw)
            result['rag_used'] = bool(rag_context)  # 프론트에서 뱃지 표시용
            return result
        except Exception as e:
            return {'error': str(e)}

    def explain_word(self, word: str, context: str = '') -> dict:
        prompt = EXPLAIN_PROMPT.format(word=word, context=context)
        try:
            raw = self._call(prompt)
            return self._parse_json(raw)
        except Exception as e:
            return {'error': str(e)}
