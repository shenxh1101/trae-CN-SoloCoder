import requests
import json
import logging
from typing import Dict, Optional, Tuple

logger = logging.getLogger(__name__)


class WebhookNotifier:
    TIMEOUT = 10
    RETRY_COUNT = 2

    @staticmethod
    def send_dingtalk(url: str, result: Dict) -> Tuple[bool, str]:
        if not url:
            return False, "Webhook URL为空"

        title = f"【高优先级邮件】{result.get('category', '未知分类')}"
        text = f"""
### 高优先级邮件提醒

**邮件摘要**: {result.get('summary', '')}

**分类**: {result.get('category', '')}
**优先级**: {result.get('priority', '')}
**情绪倾向**: {result.get('sentiment', '')}
**建议响应时间**: {result.get('suggested_response_time', '')}

**分类依据**: {result.get('category_explanation', '')}
**优先级依据**: {result.get('priority_explanation', '')}

**邮件内容**:
```
{result.get('content', '')[:500]}
```
        """.strip()

        payload = {
            "msgtype": "markdown",
            "markdown": {
                "title": title,
                "text": text
            },
            "at": {
                "isAtAll": True
            }
        }

        return WebhookNotifier._do_request(url, payload, "钉钉")

    @staticmethod
    def send_generic(url: str, data: Dict, platform: str = "generic") -> Tuple[bool, str]:
        if not url:
            return False, "Webhook URL为空"

        headers = {"Content-Type": "application/json"}
        payload = {
            "platform": platform,
            "timestamp": data.get("created_at", ""),
            "type": "high_priority_email",
            "data": {
                "email_id": data.get("email_id", ""),
                "summary": data.get("summary", ""),
                "category": data.get("category", ""),
                "priority": data.get("priority", ""),
                "sentiment": data.get("sentiment", ""),
                "content": data.get("content", ""),
                "suggested_response_time": data.get("suggested_response_time", "")
            }
        }

        return WebhookNotifier._do_request(url, payload, platform, headers)

    @staticmethod
    def _do_request(url: str, payload: Dict, platform: str,
                    headers: Dict = None) -> Tuple[bool, str]:
        last_error = ""
        for attempt in range(WebhookNotifier.RETRY_COUNT + 1):
            try:
                resp = requests.post(
                    url,
                    json=payload,
                    headers=headers,
                    timeout=WebhookNotifier.TIMEOUT
                )

                if resp.status_code >= 500:
                    last_error = f"{platform}服务端错误 (HTTP {resp.status_code})"
                    if attempt < WebhookNotifier.RETRY_COUNT:
                        continue
                    return False, last_error

                if platform == "钉钉":
                    try:
                        body = resp.json()
                    except (ValueError, json.JSONDecodeError):
                        last_error = f"{platform}返回非JSON响应 (HTTP {resp.status_code})"
                        return False, last_error

                    if body.get("errcode") == 0:
                        return True, "发送成功"
                    else:
                        last_error = f"{platform}返回错误: errcode={body.get('errcode')}, msg={body.get('errmsg', '')}"
                        return False, last_error

                if resp.status_code in [200, 201, 202]:
                    return True, "发送成功"
                else:
                    last_error = f"{platform}请求失败 (HTTP {resp.status_code})"
                    return False, last_error

            except requests.exceptions.Timeout:
                last_error = f"{platform}请求超时 ({WebhookNotifier.TIMEOUT}s)"
                logger.warning(f"Webhook超时 (尝试 {attempt+1}/{WebhookNotifier.RETRY_COUNT+1}): {url}")
                if attempt < WebhookNotifier.RETRY_COUNT:
                    continue

            except requests.exceptions.ConnectionError as e:
                last_error = f"{platform}连接失败: {str(e)[:100]}"
                logger.warning(f"Webhook连接错误: {last_error}")
                if attempt < WebhookNotifier.RETRY_COUNT:
                    continue

            except requests.exceptions.RequestException as e:
                last_error = f"{platform}请求异常: {str(e)[:100]}"
                logger.warning(f"Webhook请求异常: {last_error}")
                break

            except Exception as e:
                last_error = f"{platform}未知错误: {str(e)[:100]}"
                logger.error(f"Webhook未知错误: {last_error}")
                break

        return False, last_error
