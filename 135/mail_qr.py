import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.utils import formataddr
import io
import base64
import qrcode

from config import (
    SMTP_HOST,
    SMTP_PORT,
    SMTP_USERNAME,
    SMTP_PASSWORD,
    SMTP_FROM_EMAIL,
    SMTP_USE_TLS
)


def generate_qr_code_base64(url: str) -> str:
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    img_str = base64.b64encode(buffer.getvalue()).decode()
    return f'data:image/png;base64,{img_str}'


def send_email(to_email: str, subject: str, body: str) -> bool:
    if not SMTP_HOST or not SMTP_USERNAME or not SMTP_PASSWORD:
        return False
    try:
        msg = MIMEMultipart()
        msg['From'] = formataddr(('文件分享服务', SMTP_FROM_EMAIL or SMTP_USERNAME))
        msg['To'] = to_email
        msg['Subject'] = subject
        msg.attach(MIMEText(body, 'plain', 'utf-8'))
        server = smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10)
        if SMTP_USE_TLS:
            server.starttls()
        server.login(SMTP_USERNAME, SMTP_PASSWORD)
        server.send_message(msg)
        server.quit()
        return True
    except Exception as e:
        print(f'Email send error: {e}')
        return False


def send_download_link_email(to_email: str, download_url: str, filename: str, expiry_info: str = '') -> bool:
    subject = f'文件分享: {filename}'
    body = f'''您收到了一个文件分享:

文件名: {filename}
下载链接: {download_url}

{expiry_info}

此邮件由文件分享服务自动发送，请勿直接回复。'''
    return send_email(to_email, subject, body)


def send_batch_share_email(to_email: str, share_url: str, file_count: int, expiry_info: str = '') -> bool:
    subject = f'批量文件分享: {file_count} 个文件'
    body = f'''您收到了一个批量文件分享:

文件数量: {file_count}
分享页面: {share_url}

{expiry_info}

此邮件由文件分享服务自动发送，请勿直接回复。'''
    return send_email(to_email, subject, body)
