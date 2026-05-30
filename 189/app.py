import os
import re
import io
import zipfile
import smtplib
import requests
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders
from datetime import datetime
from flask import Flask, render_template, request, send_file, jsonify, Response
import markdown
from markdown.extensions.toc import TocExtension
from markdown.extensions.fenced_code import FencedCodeExtension
from markdown.extensions.codehilite import CodeHiliteExtension
from pygments.formatters import HtmlFormatter
import bleach

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 100 * 1024 * 1024
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['OUTPUT_FOLDER'] = 'outputs'

os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
os.makedirs(app.config['OUTPUT_FOLDER'], exist_ok=True)

CODE_THEMES = {
    'monokai': 'Monokai',
    'solarized-light': 'Solarized Light',
    'vs': 'VS Code',
    'github-dark': 'GitHub Dark',
    'dracula': 'Dracula',
    'nord': 'Nord'
}

ALLOWED_TAGS = [
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'p', 'br', 'strong', 'em', 'i', 'b', 'u', 's', 'sub', 'sup',
    'ul', 'ol', 'li', 'dl', 'dt', 'dd',
    'blockquote', 'pre', 'code', 'div', 'span',
    'a', 'img', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'hr', 'details', 'summary', 'input', 'label'
]

ALLOWED_ATTRIBUTES = {
    '*': ['class', 'id', 'style'],
    'a': ['href', 'title', 'target', 'rel'],
    'img': ['src', 'alt', 'title', 'width', 'height'],
    'input': ['type', 'checked', 'disabled'],
    'table': ['border'],
    'th': ['colspan', 'rowspan'],
    'td': ['colspan', 'rowspan']
}

def sanitize_html(html_content):
    return bleach.clean(
        html_content,
        tags=ALLOWED_TAGS,
        attributes=ALLOWED_ATTRIBUTES,
        strip=True,
        protocols=['http', 'https', 'mailto', 'data']
    )

def get_pygments_css(style_name):
    formatter = HtmlFormatter(style=style_name)
    return formatter.get_style_defs('.codehilite')

def markdown_to_html(md_content, code_theme='monokai', custom_css='', generate_toc=True):
    extensions = [
        FencedCodeExtension(),
        CodeHiliteExtension(linenums=False, css_class='codehilite'),
        'markdown.extensions.tables',
        'markdown.extensions.admonition',
        'markdown.extensions.footnotes',
        'markdown.extensions.attr_list',
        'markdown.extensions.def_list',
        'markdown.extensions.abbr',
        'markdown.extensions.md_in_html'
    ]
    
    if generate_toc:
        extensions.append(TocExtension(permalink=True, toc_depth='2-6'))
    
    md = markdown.Markdown(extensions=extensions, output_format='html5')
    html_body = md.convert(md_content)
    toc = md.toc if generate_toc and hasattr(md, 'toc') else ''
    
    html_body = sanitize_html(html_body)
    toc = sanitize_html(toc)
    
    pygments_css = get_pygments_css(code_theme)
    
    full_html = render_template(
        'template.html',
        content=html_body,
        toc=toc,
        pygments_css=pygments_css,
        custom_css=custom_css,
        title='Document'
    )
    
    return full_html, html_body, toc

def extract_image_links(md_content):
    pattern = r'!\[.*?\]\((https?://.*?)\)'
    links = re.findall(pattern, md_content)
    return list(set(links))

def download_images(image_links, output_dir):
    downloaded = []
    os.makedirs(output_dir, exist_ok=True)
    
    for idx, url in enumerate(image_links):
        for attempt in range(3):
            try:
                response = requests.get(url, timeout=15, stream=True,
                                        headers={'User-Agent': 'Mozilla/5.0'})
                if response.status_code == 200:
                    ext = url.split('.')[-1].split('?')[0].lower()
                    if ext not in ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp']:
                        ext = 'png'
                    filename = f'image_{idx + 1}.{ext}'
                    filepath = os.path.join(output_dir, filename)
                    with open(filepath, 'wb') as f:
                        for chunk in response.iter_content(chunk_size=8192):
                            f.write(chunk)
                    downloaded.append({'url': url, 'filename': filename})
                    break
            except Exception as e:
                if attempt == 2:
                    print(f"Error downloading {url}: {e}")
    
    return downloaded

@app.route('/')
def index():
    return render_template('index.html', code_themes=CODE_THEMES)

@app.route('/convert', methods=['POST'])
def convert():
    md_content = ''
    custom_css = ''
    
    if 'file' in request.files and request.files['file'].filename:
        file = request.files['file']
        if file.filename.endswith('.md'):
            md_content = file.read().decode('utf-8')
    elif 'text' in request.form and request.form['text']:
        md_content = request.form['text']
    
    if 'css_file' in request.files and request.files['css_file'].filename:
        css_file = request.files['css_file']
        custom_css = css_file.read().decode('utf-8')
    
    code_theme = request.form.get('code_theme', 'monokai')
    generate_toc = request.form.get('generate_toc') == 'on'
    
    if not md_content:
        return jsonify({'error': 'No Markdown content provided'}), 400
    
    full_html, html_body, toc = markdown_to_html(
        md_content, 
        code_theme=code_theme,
        custom_css=custom_css,
        generate_toc=generate_toc
    )
    
    return jsonify({
        'full_html': full_html,
        'html_body': html_body,
        'toc': toc
    })

@app.route('/api/convert', methods=['POST'])
def api_convert():
    data = request.get_json()
    if not data or 'markdown' not in data:
        return jsonify({'error': 'No Markdown content provided'}), 400
    
    md_content = data['markdown']
    code_theme = data.get('code_theme', 'monokai')
    generate_toc = data.get('generate_toc', True)
    custom_css = data.get('custom_css', '')
    
    full_html, html_body, toc = markdown_to_html(
        md_content,
        code_theme=code_theme,
        custom_css=custom_css,
        generate_toc=generate_toc
    )
    
    return jsonify({
        'html': full_html,
        'html_body': html_body,
        'toc': toc
    })

@app.route('/batch-convert', methods=['POST'])
def batch_convert():
    if 'zip_file' not in request.files:
        return jsonify({'error': 'No ZIP file provided'}), 400
    
    zip_file = request.files['zip_file']
    code_theme = request.form.get('code_theme', 'monokai')
    generate_toc = request.form.get('generate_toc') == 'on'
    custom_css = ''
    
    if 'css_file' in request.files and request.files['css_file'].filename:
        css_file = request.files['css_file']
        custom_css = css_file.read().decode('utf-8')
    
    memory_zip = io.BytesIO()
    
    with zipfile.ZipFile(zip_file, 'r') as zin:
        with zipfile.ZipFile(memory_zip, 'w') as zout:
            for item in zin.infolist():
                if item.filename.endswith('.md') and not item.is_dir():
                    md_content = zin.read(item.filename).decode('utf-8')
                    full_html, _, _ = markdown_to_html(
                        md_content,
                        code_theme=code_theme,
                        custom_css=custom_css,
                        generate_toc=generate_toc
                    )
                    html_filename = item.filename[:-3] + '.html'
                    zout.writestr(html_filename, full_html)
    
    memory_zip.seek(0)
    
    return send_file(
        memory_zip,
        mimetype='application/zip',
        as_attachment=True,
        download_name='converted_html.zip'
    )

@app.route('/merge-convert', methods=['POST'])
def merge_convert():
    files = request.files.getlist('files')
    if not files:
        return jsonify({'error': 'No files provided'}), 400
    
    code_theme = request.form.get('code_theme', 'monokai')
    generate_toc = request.form.get('generate_toc') == 'on'
    custom_css = ''
    
    if 'css_file' in request.files and request.files['css_file'].filename:
        css_file = request.files['css_file']
        custom_css = css_file.read().decode('utf-8')
    
    md_files = []
    for f in files:
        if f.filename.endswith('.md'):
            md_files.append((f.filename, f.read().decode('utf-8')))
    
    md_files.sort(key=lambda x: x[0])
    
    merged_content = '\n\n---\n\n'.join([content for _, content in md_files])
    
    full_html, _, _ = markdown_to_html(
        merged_content,
        code_theme=code_theme,
        custom_css=custom_css,
        generate_toc=generate_toc
    )
    
    return jsonify({'html': full_html})

@app.route('/extract-images', methods=['POST'])
def extract_images():
    md_content = ''
    
    if 'file' in request.files and request.files['file'].filename:
        file = request.files['file']
        if file.filename.endswith('.md'):
            md_content = file.read().decode('utf-8')
    elif 'text' in request.form and request.form['text']:
        md_content = request.form['text']
    
    if not md_content:
        return jsonify({'error': 'No Markdown content provided'}), 400
    
    image_links = extract_image_links(md_content)
    
    if not image_links:
        return jsonify({'message': 'No images found', 'images': []})
    
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    output_dir = os.path.join(app.config['OUTPUT_FOLDER'], f'images_{timestamp}')
    
    downloaded = download_images(image_links, output_dir)
    
    memory_zip = io.BytesIO()
    with zipfile.ZipFile(memory_zip, 'w') as zf:
        for img_info in downloaded:
            img_path = os.path.join(output_dir, img_info['filename'])
            if os.path.exists(img_path):
                zf.write(img_path, img_info['filename'])
    
    memory_zip.seek(0)
    
    return send_file(
        memory_zip,
        mimetype='application/zip',
        as_attachment=True,
        download_name='extracted_images.zip'
    )

@app.route('/send-email', methods=['POST'])
def send_email():
    data = request.get_json()
    
    required_fields = ['to_email', 'smtp_server', 'smtp_port', 'smtp_user', 'smtp_password', 'html_content']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'Missing required field: {field}'}), 400
    
    msg = MIMEMultipart('alternative')
    msg['Subject'] = data.get('subject', 'Converted HTML Document')
    msg['From'] = data['smtp_user']
    msg['To'] = data['to_email']
    
    html_part = MIMEText(data['html_content'], 'html')
    msg.attach(html_part)
    
    if data.get('attach_html'):
        part = MIMEBase('application', 'octet-stream')
        part.set_payload(data['html_content'])
        encoders.encode_base64(part)
        part.add_header(
            'Content-Disposition',
            'attachment',
            filename='document.html'
        )
        msg.attach(part)
    
    try:
        with smtplib.SMTP(data['smtp_server'], int(data['smtp_port'])) as server:
            server.starttls()
            server.login(data['smtp_user'], data['smtp_password'])
            server.send_message(msg)
        return jsonify({'success': True, 'message': 'Email sent successfully'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/download-html', methods=['POST'])
def download_html():
    html_content = request.form.get('html_content', '')
    if not html_content:
        return jsonify({'error': 'No HTML content provided'}), 400
    
    memory_file = io.BytesIO()
    memory_file.write(html_content.encode('utf-8'))
    memory_file.seek(0)
    
    return send_file(
        memory_file,
        mimetype='text/html',
        as_attachment=True,
        download_name='document.html'
    )

if __name__ == '__main__':
    app.run(debug=True, port=5000)
