import asyncio
import smtplib
import base64
import hashlib
import hmac
import json
import time
import urllib.parse
from email.mime.text import MIMEText
from email.header import Header
from datetime import datetime
from typing import Optional, Dict, Any

import aiohttp

from config import NotificationConfig, EmailConfig, WebhookConfig
from stats import CheckResult


class Notifier:
    def __init__(self, config: NotificationConfig):
        self.config = config
        self._last_notification_time: Dict[str, float] = {}
        self._notification_cooldown = 60

    async def send_alert(self, website_name: str, url: str, failure_count: int,
                         last_result: CheckResult, is_recovery: bool = False) -> None:
        message = self._format_alert_message(website_name, url, failure_count, last_result, is_recovery)

        if self.config.console.enabled:
            self._send_console_alert(message, is_recovery)

        if self.config.email.enabled:
            asyncio.create_task(self._send_email_alert(website_name, message, is_recovery))

        if self.config.webhook.enabled:
            asyncio.create_task(self._send_webhook_alert(website_name, message, is_recovery))

    def _format_alert_message(self, website_name: str, url: str, failure_count: int,
                              last_result: CheckResult, is_recovery: bool) -> str:
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        status = "恢复正常" if is_recovery else "故障告警"
        level = "INFO" if is_recovery else "CRITICAL"

        if is_recovery:
            return (
                f"[{level}] {timestamp} - {status}\n"
                f"网站: {website_name} ({url})\n"
                f"状态: 服务已恢复正常\n"
                f"响应时间: {last_result.response_time:.2f}s\n"
                f"状态码: {last_result.status_code}"
            )
        else:
            error_info = last_result.error_message or f"状态码异常: {last_result.status_code}"
            return (
                f"[{level}] {timestamp} - {status}\n"
                f"网站: {website_name} ({url})\n"
                f"连续失败次数: {failure_count}\n"
                f"错误信息: {error_info}\n"
                f"响应时间: {last_result.response_time:.2f}s\n"
                f"状态码: {last_result.status_code}"
            )

    def _send_console_alert(self, message: str, is_recovery: bool) -> None:
        separator = "!" * 60 if not is_recovery else "=" * 60
        print(f"\n{separator}")
        print(message)
        print(f"{separator}\n")

    async def _send_email_alert(self, website_name: str, message: str, is_recovery: bool) -> None:
        if not self._can_send_notification(f"email_{website_name}"):
            return

        email_config = self.config.email
        try:
            msg = MIMEText(message, "plain", "utf-8")
            subject = f"{'[恢复]' if is_recovery else '[告警]'} 网站监控 - {website_name}"
            msg["Subject"] = Header(subject, "utf-8")
            msg["From"] = email_config.from_addr
            msg["To"] = ", ".join(email_config.to_addrs)

            def _send():
                with smtplib.SMTP(email_config.smtp_host, email_config.smtp_port, timeout=10) as server:
                    if email_config.use_tls:
                        server.starttls()
                    server.login(email_config.smtp_username, email_config.smtp_password)
                    server.sendmail(email_config.from_addr, email_config.to_addrs, msg.as_string())

            await asyncio.to_thread(_send)
            self._update_notification_time(f"email_{website_name}")
        except Exception as e:
            print(f"发送邮件告警失败: {e}")

    async def _send_webhook_alert(self, website_name: str, message: str, is_recovery: bool) -> None:
        if not self._can_send_notification(f"webhook_{website_name}"):
            return

        webhook_config = self.config.webhook
        try:
            payload = self._build_webhook_payload(webhook_config, message, is_recovery)
            url = self._build_signed_url(webhook_config)

            async with aiohttp.ClientSession() as session:
                async with session.post(url, json=payload, timeout=10) as resp:
                    if resp.status != 200:
                        print(f"发送Webhook告警失败，状态码: {resp.status}")
                    else:
                        self._update_notification_time(f"webhook_{website_name}")
        except Exception as e:
            print(f"发送Webhook告警失败: {e}")

    def _build_webhook_payload(self, webhook_config: WebhookConfig, message: str, is_recovery: bool) -> Dict[str, Any]:
        if webhook_config.type == "dingtalk":
            return {
                "msgtype": "text",
                "text": {
                    "content": message
                },
                "at": {
                    "isAtAll": not is_recovery
                }
            }
        else:
            return {
                "message": message,
                "is_recovery": is_recovery,
                "timestamp": datetime.now().isoformat()
            }

    def _build_signed_url(self, webhook_config: WebhookConfig) -> str:
        if webhook_config.type == "dingtalk" and webhook_config.secret:
            timestamp = str(round(time.time() * 1000))
            secret_enc = webhook_config.secret.encode("utf-8")
            string_to_sign = f"{timestamp}\n{webhook_config.secret}"
            string_to_sign_enc = string_to_sign.encode("utf-8")
            hmac_code = hmac.new(secret_enc, string_to_sign_enc, digestmod=hashlib.sha256).digest()
            sign = urllib.parse.quote_plus(base64.b64encode(hmac_code))
            separator = "&" if "?" in webhook_config.url else "?"
            return f"{webhook_config.url}{separator}timestamp={timestamp}&sign={sign}"
        return webhook_config.url

    def _can_send_notification(self, key: str) -> bool:
        last_time = self._last_notification_time.get(key, 0)
        return (time.time() - last_time) >= self._notification_cooldown

    def _update_notification_time(self, key: str) -> None:
        self._last_notification_time[key] = time.time()
