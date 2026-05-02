import os
import json
import re
from prompts import build_analyze_prompt, EXPLAIN_PROMPT, CHAT_SYSTEM

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
        rag_context, rag_laws = get_rag_context(document)
        prompt = build_analyze_prompt(document, rag_context)
        try:
            raw = self._call(prompt)
            result = self._parse_json(raw)
            result['rag_used'] = bool(rag_context)
            result['rag_laws'] = rag_laws  # 참고한 법령명 목록
            return result
        except Exception as e:
            return {'error': str(e)}

    def analyze_document_stream(self, document: str, detail_level: str = 'normal'):
        """
        분석 결과를 SSE 이벤트로 스트리밍.
        yield {'meta': {...}}  — RAG 메타 (첫 번째)
        yield {'t': '...'}    — 텍스트 청크
        """
        from rag_service import get_rag_context
        rag_context, rag_laws = get_rag_context(document)
        prompt = build_analyze_prompt(document, rag_context, detail_level)

        yield {'meta': {'rag_used': bool(rag_context), 'rag_laws': rag_laws}}

        if self.provider == 'gemini':
            response = self.model.generate_content(prompt, stream=True)
            for chunk in response:
                if chunk.text:
                    yield {'t': chunk.text}

        elif self.provider == 'groq':
            stream = self.client.chat.completions.create(
                model=self.model_name,
                messages=[{'role': 'user', 'content': prompt}],
                temperature=0.3,
                stream=True,
            )
            for chunk in stream:
                delta = chunk.choices[0].delta.content
                if delta:
                    yield {'t': delta}

        elif self.provider == 'ollama':
            import ollama
            stream = ollama.chat(
                model=self.model_name,
                messages=[{'role': 'user', 'content': prompt}],
                stream=True,
            )
            for chunk in stream:
                delta = chunk['message']['content']
                if delta:
                    yield {'t': delta}

    def _call_with_messages(self, system: str, messages: list) -> str:
        """system prompt + 대화 기록으로 LLM 호출"""
        if self.provider == 'gemini':
            # Gemini는 단일 프롬프트로 변환
            parts = [system, '']
            for m in messages:
                prefix = '사용자' if m['role'] == 'user' else '상담사'
                parts.append(f"{prefix}: {m['content']}")
            response = self.model.generate_content('\n'.join(parts))
            return response.text

        elif self.provider == 'groq':
            all_msgs = [{'role': 'system', 'content': system}] + messages
            response = self.client.chat.completions.create(
                model=self.model_name,
                messages=all_msgs,
                temperature=0.5,
            )
            return response.choices[0].message.content

        elif self.provider == 'ollama':
            import ollama
            all_msgs = [{'role': 'system', 'content': system}] + messages
            response = ollama.chat(model=self.model_name, messages=all_msgs)
            return response['message']['content']

        raise ValueError(f'지원하지 않는 LLM_PROVIDER: {self.provider}')

    def chat_with_document(self, document: str, history: list, question: str) -> dict:
        system = CHAT_SYSTEM.format(document=document[:4000])  # 토큰 절약
        messages = history + [{'role': 'user', 'content': question}]
        try:
            answer = self._call_with_messages(system, messages)
            return {'answer': answer.strip()}
        except Exception as e:
            return {'error': str(e)}

    def explain_word(self, word: str, context: str = '') -> dict:
        prompt = EXPLAIN_PROMPT.format(word=word, context=context)
        try:
            raw = self._call(prompt)
            return self._parse_json(raw)
        except Exception as e:
            return {'error': str(e)}
