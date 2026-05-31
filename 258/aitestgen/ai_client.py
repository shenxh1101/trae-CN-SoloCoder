import os
import json
import time
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass
from dotenv import load_dotenv

load_dotenv()


@dataclass
class TestCaseInput:
    name: str
    value: Any
    type: str  # normal, boundary, exception


@dataclass
class AIResponse:
    test_cases: List[Dict[str, Any]]
    reasoning: str = ""


class BaseAIClient:
    def __init__(self, model: str = None, timeout: int = 60):
        self.model = model
        self.timeout = timeout
        self._system_prompt = """
你是一个专业的软件测试工程师，擅长为Python和JavaScript代码生成高质量的单元测试用例。

请根据函数代码、函数签名和类型提示，生成全面的测试用例，包括：
1. 正常输入测试 - 验证函数在正常情况下的行为
2. 边界值测试 - 验证边界条件（空值、零值、最大值、最小值等）
3. 异常输入测试 - 验证函数对非法输入的处理

对于每个测试用例，请提供：
- test_name: 测试用例名称（描述性的）
- test_type: normal/boundary/exception
- inputs: 参数字典（key为参数名，value为参数值）
- expected: 期望的返回值（如果适用）
- exception: 期望抛出的异常类型（如果是异常测试）
- description: 测试用例描述

请以JSON格式返回，格式如下：
{
  "test_cases": [
    {
      "test_name": "test_function_normal_positive_numbers",
      "test_type": "normal",
      "inputs": {"param1": 5, "param2": 3},
      "expected": 8,
      "description": "Test addition with positive integers"
    }
  ],
  "reasoning": "Generated test cases covering normal, boundary, and exception scenarios"
}

重要：
- 生成的测试值应该与函数参数类型匹配
- 对于边界测试，考虑空字符串、0、负数、大数、None等
- 对于异常测试，考虑类型错误、值错误等
- 确保JSON格式正确，没有语法错误
- 不要生成Markdown格式的代码块，只返回纯JSON
"""

    def _build_prompt(self, function_name: str, function_code: str, parameters: List[Dict], 
                    return_type: Optional[str] = None, docstring: Optional[str] = None,
                    language: str = 'python') -> str:
        param_str = "\n".join([f"- {p['name']}: {p.get('type_hint', 'Any')}" for p in parameters])
        
        prompt = f"""
请为以下{language}函数生成单元测试用例：

函数名: {function_name}

函数签名参数:
{param_str}

{return_type and f'返回类型: {return_type}' or ''}

{docstring and f'文档字符串: {docstring}' or ''}

函数代码:
```
{function_code}
```

请生成至少3个正常测试、3个边界测试、2个异常测试。确保测试数据真实合理，能够有效测试函数逻辑。
"""
        return prompt

    def generate_test_cases(self, function_name: str, function_code: str, 
                           parameters: List[Dict], return_type: Optional[str] = None,
                           docstring: Optional[str] = None, 
                           language: str = 'python') -> AIResponse:
        raise NotImplementedError

    def _parse_json_response(self, response_text: str) -> Dict[str, Any]:
        response_text = response_text.strip()
        
        if response_text.startswith('```json'):
            response_text = response_text[7:-3] if response_text.endswith('```') else response_text[7:]
        elif response_text.startswith('```'):
            response_text = response_text[3:-3] if response_text.endswith('```') else response_text[3:]
        
        response_text = response_text.strip()
        
        try:
            return json.loads(response_text)
        except json.JSONDecodeError as e:
            json_start = response_text.find('{')
            json_end = response_text.rfind('}') + 1
            if json_start >= 0 and json_end > json_start:
                try:
                    return json.loads(response_text[json_start:json_end])
                except:
                    pass
            
            print(f"Warning: Could not parse JSON response: {e}")
            print(f"Response text: {response_text[:500]}")
            return {"test_cases": [], "reasoning": "Parse error"}


class OpenAIClient(BaseAIClient):
    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None, 
                 base_url: Optional[str] = None, timeout: int = 60):
        super().__init__(
            model or os.getenv("OPENAI_MODEL", "gpt-4o-mini"), 
            timeout
        )
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        self.base_url = base_url or os.getenv("OPENAI_API_BASE") or os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
        
        if not self.api_key:
            print("Warning: OPENAI_API_KEY not found, will use fallback test generation")

    def generate_test_cases(self, function_name: str, function_code: str, 
                           parameters: List[Dict], return_type: Optional[str] = None,
                           docstring: Optional[str] = None, 
                           language: str = 'python') -> AIResponse:
        if not self.api_key:
            return AIResponse(test_cases=[], reasoning="API key not available")
        
        try:
            import requests
            
            prompt = self._build_prompt(function_name, function_code, parameters, 
                                       return_type, docstring, language)
            
            messages = [
                {"role": "system", "content": self._system_prompt},
                {"role": "user", "content": prompt}
            ]
            
            response = requests.post(
                f"{self.base_url}/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": self.model,
                    "messages": messages,
                    "temperature": 0.2,
                    "response_format": {"type": "json_object"}
                },
                timeout=self.timeout
            )
            
            if response.status_code == 200:
                result = response.json()
                content = result['choices'][0]['message']['content']
                parsed = self._parse_json_response(content)
                return AIResponse(
                    test_cases=parsed.get('test_cases', []),
                    reasoning=parsed.get('reasoning', '')
                )
            else:
                print(f"OpenAI API error: {response.status_code} - {response.text}")
                return AIResponse(test_cases=[], reasoning=f"API error: {response.status_code}")
                
        except Exception as e:
            print(f"OpenAI API error: {e}")
            return AIResponse(test_cases=[], reasoning=f"Exception: {str(e)}")


class OllamaClient(BaseAIClient):
    def __init__(self, model: Optional[str] = None, 
                 base_url: Optional[str] = None, timeout: int = 120):
        super().__init__(
            model or os.getenv("OLLAMA_MODEL", "qwen2.5-coder:7b"), 
            timeout
        )
        self.base_url = (base_url or os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")).rstrip('/')

    def generate_test_cases(self, function_name: str, function_code: str, 
                           parameters: List[Dict], return_type: Optional[str] = None,
                           docstring: Optional[str] = None, 
                           language: str = 'python') -> AIResponse:
        try:
            import requests
            
            prompt = self._build_prompt(function_name, function_code, parameters, 
                                       return_type, docstring, language)
            
            full_prompt = f"{self._system_prompt}\n\n{prompt}"
            
            response = requests.post(
                f"{self.base_url}/api/generate",
                json={
                    "model": self.model,
                    "prompt": full_prompt,
                    "stream": False,
                    "options": {
                        "temperature": 0.2
                    }
                },
                timeout=self.timeout
            )
            
            if response.status_code == 200:
                result = response.json()
                content = result.get('response', '')
                parsed = self._parse_json_response(content)
                return AIResponse(
                    test_cases=parsed.get('test_cases', []),
                    reasoning=parsed.get('reasoning', '')
                )
            else:
                print(f"Ollama API error: {response.status_code} - {response.text}")
                return AIResponse(test_cases=[], reasoning=f"API error: {response.status_code}")
                
        except Exception as e:
            print(f"Ollama API error: {e}")
            return AIResponse(test_cases=[], reasoning=f"Exception: {str(e)}")


class AITestGenerator:
    def __init__(self, provider: str = "auto", api_key: Optional[str] = None, 
                 model: Optional[str] = None):
        self.client = self._create_client(provider, api_key, model)
        self.fallback_generator = FallbackGenerator()

    def _create_client(self, provider: str, api_key: Optional[str], model: Optional[str]) -> Optional[BaseAIClient]:
        env_provider = os.getenv("AI_PROVIDER", "").lower()
        if env_provider and provider == "auto":
            provider = env_provider
        
        if provider == "openai" or (provider == "auto" and os.getenv("OPENAI_API_KEY")):
            client = OpenAIClient(api_key=api_key, model=model)
            if client.api_key:
                return client
        elif provider == "ollama" or provider == "auto":
            try:
                import requests
                ollama_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
                response = requests.get(f"{ollama_url}/api/tags", timeout=2)
                if response.status_code == 200:
                    return OllamaClient(model=model)
            except Exception as e:
                if provider == "ollama":
                    print(f"Warning: Ollama not available at {os.getenv('OLLAMA_BASE_URL', 'http://localhost:11434')}: {e}")
        
        print("Warning: No AI provider available, using fallback test generation")
        return None

    def generate_test_cases(self, function_name: str, function_code: str,
                           parameters: List[Dict], return_type: Optional[str] = None,
                           docstring: Optional[str] = None,
                           language: str = 'python') -> List[Dict[str, Any]]:
        if self.client:
            response = self.client.generate_test_cases(
                function_name, function_code, parameters, return_type, docstring, language
            )
            if response.test_cases:
                return response.test_cases
        
        return self.fallback_generator.generate_test_cases(
            function_name, parameters, return_type, language
        )


class FallbackGenerator:
    def generate_test_cases(self, function_name: str, parameters: List[Dict],
                           return_type: Optional[str] = None, language: str = 'python') -> List[Dict[str, Any]]:
        test_cases = []
        
        params = [p for p in parameters if p.get('name') not in ['self', 'cls']]
        
        if not params:
            test_cases.append({
                "test_name": f"test_{function_name}_no_args",
                "test_type": "normal",
                "inputs": {},
                "description": f"Test {function_name} with no arguments"
            })
            return test_cases
        
        test_counter = {"normal": 0, "boundary": 0, "exception": 0}
        
        for param in params:
            param_name = param.get('name', '')
            type_hint = param.get('type_hint', '').lower()
            default_value = param.get('default_value')
            
            normal_values = self._get_normal_values(type_hint, default_value)
            for value in normal_values[:3]:
                inputs = {}
                for p in params:
                    if p.get('name') == param_name:
                        inputs[p.get('name')] = value
                    elif p.get('default_value'):
                        inputs[p.get('name')] = p.get('default_value')
                    else:
                        inputs[p.get('name')] = self._get_default_for_type(p.get('type_hint', ''))
                
                test_cases.append({
                    "test_name": f"test_{function_name}_normal_{param_name}_{test_counter['normal']}",
                    "test_type": "normal",
                    "inputs": inputs,
                    "description": f"Test {function_name} with {param_name} = {value}"
                })
                test_counter["normal"] += 1
            
            boundary_values = self._get_boundary_values(type_hint)
            for value in boundary_values[:3]:
                inputs = {}
                for p in params:
                    if p.get('name') == param_name:
                        inputs[p.get('name')] = value
                    elif p.get('default_value'):
                        inputs[p.get('name')] = p.get('default_value')
                    else:
                        inputs[p.get('name')] = self._get_default_for_type(p.get('type_hint', ''))
                
                test_cases.append({
                    "test_name": f"test_{function_name}_boundary_{param_name}_{test_counter['boundary']}",
                    "test_type": "boundary",
                    "inputs": inputs,
                    "description": f"Test {function_name} boundary with {param_name} = {value}"
                })
                test_counter["boundary"] += 1
            
            exception_values = self._get_exception_values(type_hint)
            for value, exc_type in exception_values[:2]:
                inputs = {}
                for p in params:
                    if p.get('name') == param_name:
                        inputs[p.get('name')] = value
                    elif p.get('default_value'):
                        inputs[p.get('name')] = p.get('default_value')
                    else:
                        inputs[p.get('name')] = self._get_default_for_type(p.get('type_hint', ''))
                
                test_cases.append({
                    "test_name": f"test_{function_name}_exception_{param_name}_{test_counter['exception']}",
                    "test_type": "exception",
                    "inputs": inputs,
                    "exception": exc_type,
                    "description": f"Test {function_name} raises {exc_type} with {param_name} = {value}"
                })
                test_counter["exception"] += 1
        
        return test_cases

    def _get_normal_values(self, type_hint: str, default_value: Optional[str]) -> List[Any]:
        if 'int' in type_hint:
            return [0, 1, 42, 100]
        elif 'str' in type_hint or 'string' in type_hint:
            return ["hello", "test", ""]
        elif 'float' in type_hint:
            return [0.0, 1.5, 3.14]
        elif 'bool' in type_hint:
            return [True, False]
        elif 'list' in type_hint:
            return [[], [1, 2, 3], ["a", "b"]]
        elif 'dict' in type_hint:
            return [{}, {"key": "value"}, {"a": 1}]
        elif default_value and default_value != 'None':
            try:
                return [eval(default_value)]
            except:
                return [default_value]
        else:
            return [None, "sample_value"]

    def _get_boundary_values(self, type_hint: str) -> List[Any]:
        if 'int' in type_hint:
            return [-1, 0, 1, -1000000, 1000000]
        elif 'str' in type_hint or 'string' in type_hint:
            return ["", "a" * 1000, None, "   "]
        elif 'float' in type_hint:
            return [0.0, -0.0, -1e10, 1e10]
        elif 'list' in type_hint:
            return [[], [1], None]
        elif 'dict' in type_hint:
            return [{}, None]
        else:
            return [None]

    def _get_exception_values(self, type_hint: str) -> List[Tuple[Any, str]]:
        exceptions = []
        if 'int' in type_hint:
            exceptions.append(("not_an_int", "TypeError"))
            exceptions.append((None, "TypeError"))
        elif 'str' in type_hint or 'string' in type_hint:
            exceptions.append((123, "TypeError"))
        elif 'float' in type_hint:
            exceptions.append(("not_float", "TypeError"))
        elif 'list' in type_hint:
            exceptions.append(("not_list", "TypeError"))
            exceptions.append((None, "AttributeError"))
        return exceptions

    def _get_default_for_type(self, type_hint: str) -> Any:
        type_hint = type_hint.lower()
        if 'int' in type_hint:
            return 0
        elif 'str' in type_hint or 'string' in type_hint:
            return '""'
        elif 'float' in type_hint:
            return 0.0
        elif 'bool' in type_hint:
            return False
        elif 'list' in type_hint:
            return '[]'
        elif 'dict' in type_hint:
            return '{}'
        else:
            return 'None'


def get_ai_generator(provider: str = "auto", api_key: Optional[str] = None, 
                     model: Optional[str] = None) -> AITestGenerator:
    return AITestGenerator(provider=provider, api_key=api_key, model=model)
