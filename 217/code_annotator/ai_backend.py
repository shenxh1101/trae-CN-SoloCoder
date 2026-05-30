import json
import os
import socket
import urllib.error
from typing import Optional, Tuple
from . import CodeBlock, CodeBlockType


class AIServiceError(Exception):
    pass


class AIBackend:
    def __init__(self, api_url: str = None, api_key: str = None, model: str = None,
                 language: str = "en", backend_type: str = "openai"):
        self.api_url = api_url or os.environ.get("ANNOTATOR_API_URL", "http://localhost:11434/v1")
        self.api_key = api_key or os.environ.get("ANNOTATOR_API_KEY", "")
        self.model = model or os.environ.get("ANNOTATOR_MODEL", "qwen2.5-coder:7b")
        self.language = language
        self.backend_type = backend_type.lower()

    def get_config(self) -> dict:
        return {
            "api_url": self.api_url,
            "api_key": "*" * len(self.api_key) if self.api_key else "",
            "model": self.model,
            "backend_type": self.backend_type,
            "language": self.language,
        }

    def test_connection(self) -> Tuple[bool, str]:
        try:
            import urllib.request
            import ssl

            if self.backend_type == "openai":
                url = f"{self.api_url.rstrip('/')}/models"
            else:
                url = f"{self.api_url.rstrip('/')}/api/tags"

            headers = {"Content-Type": "application/json"}
            if self.api_key and self.backend_type == "openai":
                headers["Authorization"] = f"Bearer {self.api_key}"

            req = urllib.request.Request(url, headers=headers, method="GET")
            ctx = ssl.create_default_context()
            ctx.check_hostname = False
            ctx.verify_mode = ssl.CERT_NONE

            with urllib.request.urlopen(req, context=ctx, timeout=10) as resp:
                if resp.status == 200:
                    data = json.loads(resp.read().decode("utf-8"))
                    models = []
                    if self.backend_type == "openai":
                        models = [m["id"] for m in data.get("data", [])]
                    else:
                        models = [m["name"] for m in data.get("models", [])]

                    model_found = self.model in models
                    if model_found:
                        return True, f"Connected successfully! Model '{self.model}' is available."
                    else:
                        model_list = ", ".join(models[:5])
                        if len(models) > 5:
                            model_list += ", ..."
                        return True, (f"Connected! Model '{self.model}' not found. "
                                      f"Available: {model_list}")
                else:
                    return False, f"Unexpected status code: {resp.status}"

        except urllib.error.URLError as e:
            if isinstance(e.reason, socket.timeout):
                return False, f"Connection timed out. Is the server running at {self.api_url}?"
            elif isinstance(e.reason, ConnectionRefusedError):
                return False, f"Connection refused. Is the server running at {self.api_url}?"
            else:
                return False, f"Connection failed: {str(e.reason)}"
        except urllib.error.HTTPError as e:
            if e.code == 401:
                return False, "Authentication failed. Check your API key."
            elif e.code == 404:
                return False, f"Endpoint not found (404). Check API URL: {self.api_url}"
            else:
                return False, f"HTTP error {e.code}: {e.reason}"
        except Exception as e:
            return False, f"Unexpected error: {str(e)}"

    def generate_comment(self, block: CodeBlock) -> str:
        prompt = self._build_prompt(block)

        if self.backend_type == "ollama":
            return self._call_ollama_api(prompt)
        else:
            return self._call_openai_api(prompt)

    def _build_prompt(self, block: CodeBlock) -> str:
        lang_name = {"en": "English", "zh": "Chinese"}.get(self.language, "English")

        block_type_desc = {
            CodeBlockType.FUNCTION: "function",
            CodeBlockType.METHOD: "method",
            CodeBlockType.CLASS: "class",
            CodeBlockType.COMPLEX_LOGIC: "complex logic block",
        }.get(block.block_type, "code block")

        params_info = ""
        if block.params:
            params_info = f"\nParameters: {', '.join(block.params)}"

        return_info = ""
        if block.return_type:
            return_info = f"\nReturn type: {block.return_type}"

        parent_info = ""
        if block.parent_class:
            parent_info = f"\nParent class: {block.parent_class}"

        prompt = (
            f"You are a code documentation expert. Generate a concise, clear, and accurate "
            f"natural language comment for the following {block_type_desc}.\n\n"
            f"Requirements:\n"
            f"1. Write the comment in {lang_name}.\n"
            f"2. Describe what the code does, not how it does it.\n"
            f"3. Be concise - 1-3 sentences for functions, 1 sentence for logic blocks.\n"
            f"4. Do NOT include any formatting markers like triple quotes, JSDoc markers, or JavaDoc markers.\n"
            f"5. Output ONLY the plain text description, nothing else.\n"
            f"6. Do not include @param, @return, Args:, Returns: etc. - those will be added automatically.\n\n"
            f"Code:\n```\n{block.code}\n```"
            f"{params_info}{return_info}{parent_info}"
        )

        return prompt

    def _call_openai_api(self, prompt: str) -> str:
        import urllib.request
        import ssl

        url = f"{self.api_url.rstrip('/')}/chat/completions"
        payload = json.dumps({
            "model": self.model,
            "messages": [
                {"role": "system", "content": "You are a code documentation expert. Generate concise, accurate comments."},
                {"role": "user", "content": prompt},
            ],
            "temperature": 0.3,
            "max_tokens": 200,
        }).encode("utf-8")

        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"

        req = urllib.request.Request(url, data=payload, headers=headers, method="POST")
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE

        try:
            with urllib.request.urlopen(req, context=ctx, timeout=60) as resp:
                result = json.loads(resp.read().decode("utf-8"))
                content = result["choices"][0]["message"]["content"].strip()
                return self._clean_response(content)
        except urllib.error.URLError as e:
            if isinstance(e.reason, socket.timeout):
                raise AIServiceError(
                    f"Connection timed out after 60 seconds. "
                    f"Please check if {self.api_url} is reachable and try again."
                )
            elif isinstance(e.reason, ConnectionRefusedError):
                raise AIServiceError(
                    f"Connection refused at {self.api_url}. "
                    f"Please start your AI server (e.g., Ollama with 'ollama serve') "
                    f"or check the API URL configuration."
                )
            else:
                raise AIServiceError(f"Connection failed: {str(e.reason)}")
        except urllib.error.HTTPError as e:
            if e.code == 401:
                raise AIServiceError(
                    "Authentication failed (401). Please check your API key."
                )
            elif e.code == 404:
                raise AIServiceError(
                    f"Endpoint not found (404). API URL: {url}. "
                    f"For Ollama OpenAI-compatible endpoint, use: http://localhost:11434/v1"
                )
            elif e.code == 400:
                error_body = e.read().decode("utf-8", errors="ignore")
                raise AIServiceError(
                    f"Bad request (400). Model '{self.model}' may not be available. "
                    f"Error: {error_body[:200]}"
                )
            else:
                raise AIServiceError(f"HTTP error {e.code}: {e.reason}")
        except (KeyError, IndexError) as e:
            raise AIServiceError(f"Unexpected response format from API: {str(e)}")
        except Exception as e:
            raise AIServiceError(f"AI generation failed: {str(e)}")

    def _call_ollama_api(self, prompt: str) -> str:
        import urllib.request
        import ssl

        url = f"{self.api_url.rstrip('/')}/api/generate"
        payload = json.dumps({
            "model": self.model,
            "prompt": prompt,
            "stream": False,
            "options": {
                "temperature": 0.3,
                "num_predict": 200,
            },
        }).encode("utf-8")

        headers = {"Content-Type": "application/json"}
        req = urllib.request.Request(url, data=payload, headers=headers, method="POST")
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE

        try:
            with urllib.request.urlopen(req, context=ctx, timeout=120) as resp:
                result = json.loads(resp.read().decode("utf-8"))
                content = result.get("response", "").strip()
                if not content:
                    raise AIServiceError("Empty response from Ollama API")
                return self._clean_response(content)
        except urllib.error.URLError as e:
            if isinstance(e.reason, socket.timeout):
                raise AIServiceError(
                    f"Connection timed out after 120 seconds. "
                    f"Model '{self.model}' may be loading, please try again."
                )
            elif isinstance(e.reason, ConnectionRefusedError):
                raise AIServiceError(
                    f"Connection refused at {self.api_url}. "
                    f"Please start Ollama with 'ollama serve' and try again."
                )
            else:
                raise AIServiceError(f"Ollama connection failed: {str(e.reason)}")
        except urllib.error.HTTPError as e:
            if e.code == 404:
                raise AIServiceError(
                    f"Model '{self.model}' not found. "
                    f"Try 'ollama pull {self.model}' to download it first."
                )
            else:
                error_body = e.read().decode("utf-8", errors="ignore")
                raise AIServiceError(f"Ollama HTTP error {e.code}: {error_body[:200]}")
        except json.JSONDecodeError:
            raise AIServiceError("Invalid JSON response from Ollama API")
        except Exception as e:
            raise AIServiceError(f"Ollama generation failed: {str(e)}")

    def _clean_response(self, text: str) -> str:
        text = text.strip()
        for marker in ['"""', "'''", "/**", "*/", "//"]:
            text = text.replace(marker, "")
        lines = text.split('\n')
        cleaned = []
        for line in lines:
            line = line.strip()
            line = line.lstrip('*').strip()
            line = line.lstrip('#').strip()
            if line:
                cleaned.append(line)
        return ' '.join(cleaned) if cleaned else text
