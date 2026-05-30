import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
from typing import Optional


class EmailSender:
    def __init__(self, smtp_host: str, smtp_port: int, smtp_user: str,
                 smtp_password: str, from_addr: str, to_addr: str,
                 use_tls: bool = True):
        self.smtp_host = smtp_host
        self.smtp_port = smtp_port
        self.smtp_user = smtp_user
        self.smtp_password = smtp_password
        self.from_addr = from_addr
        self.to_addr = to_addr
        self.use_tls = use_tls

    def send_report(self, subject: str, body: str,
                    attachment_path: Optional[str] = None) -> tuple:
        if not all([self.smtp_host, self.smtp_user, self.smtp_password,
                    self.from_addr, self.to_addr]):
            return False, "SMTP配置不完整，请在配置文件中设置邮箱信息"

        msg = MIMEMultipart()
        msg["Subject"] = subject
        msg["From"] = self.from_addr
        msg["To"] = self.to_addr

        html_body = self._markdown_to_html(body)
        msg.attach(MIMEText(html_body, "html", "utf-8"))

        if attachment_path and os.path.isfile(attachment_path):
            with open(attachment_path, "rb") as f:
                part = MIMEBase("application", "octet-stream")
                part.set_payload(f.read())
            encoders.encode_base64(part)
            filename = os.path.basename(attachment_path)
            part.add_header("Content-Disposition", f"attachment; filename={filename}")
            msg.attach(part)

        try:
            if self.use_tls:
                server = smtplib.SMTP(self.smtp_host, self.smtp_port)
                server.ehlo()
                server.starttls()
                server.ehlo()
            else:
                server = smtplib.SMTP_SSL(self.smtp_host, self.smtp_port)

            server.login(self.smtp_user, self.smtp_password)
            server.sendmail(self.from_addr, [self.to_addr], msg.as_string())
            server.quit()
            return True, f"报告已发送至 {self.to_addr}"
        except smtplib.SMTPAuthenticationError:
            return False, "SMTP认证失败，请检查用户名和密码"
        except smtplib.SMTPConnectError:
            return False, f"无法连接到SMTP服务器 {self.smtp_host}:{self.smtp_port}"
        except Exception as e:
            return False, f"发送邮件失败: {e}"

    def _markdown_to_html(self, md_text: str) -> str:
        import re
        html = md_text
        html = re.sub(r'^### (.+)$', r'<h3>\1</h3>', html, flags=re.MULTILINE)
        html = re.sub(r'^## (.+)$', r'<h2>\1</h2>', html, flags=re.MULTILINE)
        html = re.sub(r'^# (.+)$', r'<h1>\1</h1>', html, flags=re.MULTILINE)
        html = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', html)
        html = re.sub(r'`([^`]+)`', r'<code>\1</code>', html)
        html = re.sub(r'^\|(.+)\|$', self._table_row_to_html, html, flags=re.MULTILINE)
        html = re.sub(r'^\s*$', '<br>', html, flags=re.MULTILINE)

        has_table = '|' in md_text
        if has_table:
            html = html.replace('<br><tr>', '<tr>')

        return f"""<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
             background: #f6f8fa; color: #24292e; padding: 20px; max-width: 900px; margin: 0 auto;">
<div style="background: white; padding: 24px; border-radius: 8px; border: 1px solid #e1e4e8;">
{html}
</div>
</body>
</html>"""

    def _table_row_to_html(self, match):
        content = match.group(1)
        cells = content.split('|')
        if all(set(c.strip()) <= {'-', ':', ' '} for c in cells):
            return ''
        cells_html = ''.join(f'<td style="border:1px solid #ddd;padding:8px;">{c.strip()}</td>' for c in cells)
        return f'<tr>{cells_html}</tr>'
