import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
from .config import settings


class EmailService:
    @staticmethod
    async def send_email(
        to_email: str,
        subject: str,
        body: str,
        is_html: bool = False
    ) -> bool:
        if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
            print(f"[MOCK EMAIL] To: {to_email}")
            print(f"Subject: {subject}")
            print(f"Body:\n{body}\n")
            return True
        
        try:
            msg = MIMEMultipart()
            msg["From"] = settings.SMTP_FROM_EMAIL
            msg["To"] = to_email
            msg["Subject"] = subject
            
            msg.attach(MIMEText(body, "html" if is_html else "plain", "utf-8"))
            
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
                server.starttls()
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.send_message(msg)
            
            return True
        except Exception as e:
            print(f"Email send error: {e}")
            return False

    @staticmethod
    async def send_status_notification(
        to_email: str,
        tracking_number: str,
        status: str,
        latest_status: str
    ) -> bool:
        status_text = {
            "signed": "已签收",
            "abnormal": "异常",
            "out_for_delivery": "派送中",
        }.get(status, status)
        
        subject = f"【物流通知】快递 {tracking_number} {status_text}"
        body = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">物流状态更新</h2>
            <p>您好！您关注的快递有新的状态更新：</p>
            <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 15px 0;">
                <p><strong>快递单号：</strong>{tracking_number}</p>
                <p><strong>当前状态：</strong><span style="color: {'#e74c3c' if status == 'abnormal' else '#27ae60'};">{status_text}</span></p>
                <p><strong>最新详情：</strong>{latest_status}</p>
            </div>
            <p style="color: #666; font-size: 12px;">此邮件由系统自动发送，请勿直接回复。</p>
        </div>
        """
        
        return await EmailService.send_email(to_email, subject, body, is_html=True)
