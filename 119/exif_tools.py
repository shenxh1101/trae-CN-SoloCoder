import os
import base64
import io
from PIL import Image
import simplekml
import requests
import reverse_geocoder as rg
from difflib import HtmlDiff
import json


class HtmlReportGenerator:
    def __init__(self):
        self.html_template = """
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>图片EXIF信息报告</title>
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; padding: 20px; }}
        .header {{ text-align: center; margin-bottom: 30px; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 10px; }}
        .header h1 {{ font-size: 28px; margin-bottom: 10px; }}
        .header p {{ opacity: 0.9; }}
        .stats {{ display: flex; justify-content: center; gap: 30px; margin-top: 15px; }}
        .stat-item {{ text-align: center; }}
        .stat-value {{ font-size: 24px; font-weight: bold; }}
        .stat-label {{ font-size: 12px; opacity: 0.8; }}
        .gallery {{ display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 20px; max-width: 1600px; margin: 0 auto; }}
        .card {{ background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); transition: transform 0.2s; }}
        .card:hover {{ transform: translateY(-5px); box-shadow: 0 5px 20px rgba(0,0,0,0.15); }}
        .card-image {{ height: 250px; background: #eee; display: flex; align-items: center; justify-content: center; overflow: hidden; }}
        .card-image img {{ max-width: 100%; max-height: 100%; object-fit: cover; }}
        .card-body {{ padding: 15px; }}
        .card-title {{ font-size: 16px; font-weight: 600; margin-bottom: 10px; color: #333; word-break: break-all; }}
        .card-table {{ width: 100%; font-size: 13px; }}
        .card-table td {{ padding: 4px 0; vertical-align: top; }}
        .card-table td:first-child {{ color: #666; width: 100px; }}
        .card-table td:last-child {{ color: #333; font-weight: 500; }}
        .gps-badge {{ display: inline-block; background: #e3f2fd; color: #1976d2; padding: 2px 8px; border-radius: 10px; font-size: 11px; }}
        .no-gps {{ color: #999; }}
        .footer {{ text-align: center; margin-top: 40px; padding: 20px; color: #666; font-size: 12px; }}
        .filter-bar {{ display: flex; gap: 10px; margin-bottom: 20px; justify-content: center; flex-wrap: wrap; }}
        .filter-bar input, .filter-bar select {{ padding: 8px 12px; border: 1px solid #ddd; border-radius: 5px; font-size: 14px; }}
        .filter-bar input {{ width: 200px; }}
        @media (max-width: 600px) {{
            .gallery {{ grid-template-columns: 1fr; }}
            .stats {{ flex-direction: column; gap: 10px; }}
        }}
    </style>
</head>
<body>
    <div class="header">
        <h1>📷 图片EXIF信息报告</h1>
        <p>共 {total_images} 张图片</p>
        <div class="stats">
            <div class="stat-item">
                <div class="stat-value">{with_gps}</div>
                <div class="stat-label">含GPS信息</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">{with_camera}</div>
                <div class="stat-label">含相机信息</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">{with_datetime}</div>
                <div class="stat-label">含拍摄时间</div>
            </div>
        </div>
    </div>
    <div class="filter-bar">
        <input type="text" id="search" placeholder="搜索文件名、相机型号...">
        <select id="sort">
            <option value="name">按文件名排序</option>
            <option value="date" selected>按拍摄时间排序</option>
            <option value="camera">按相机型号排序</option>
        </select>
    </div>
    <div class="gallery" id="gallery">
        {cards}
    </div>
    <div class="footer">
        <p>生成时间: {generated_at} | EXIF Tool Report</p>
    </div>
    <script>
        const cards = document.querySelectorAll('.card');
        const searchInput = document.getElementById('search');
        const sortSelect = document.getElementById('sort');
        const gallery = document.getElementById('gallery');
        
        function filterCards() {{
            const query = searchInput.value.toLowerCase();
            cards.forEach(card => {{
                const text = card.textContent.toLowerCase();
                card.style.display = text.includes(query) ? 'block' : 'none';
            }});
        }}
        
        function sortCards() {{
            const sortBy = sortSelect.value;
            const cardsArray = Array.from(cards);
            cardsArray.sort((a, b) => {{
                const aVal = a.dataset[sortBy] || '';
                const bVal = b.dataset[sortBy] || '';
                return aVal.localeCompare(bVal);
            }});
            cardsArray.forEach(card => gallery.appendChild(card));
        }}
        
        searchInput.addEventListener('input', filterCards);
        sortSelect.addEventListener('change', sortCards);
    </script>
</body>
</html>
"""

    def _generate_thumbnail_base64(self, image_path, size=(300, 200)):
        try:
            img = Image.open(image_path)
            img.thumbnail(size)
            buffer = io.BytesIO()
            img.save(buffer, format='JPEG', quality=85)
            return base64.b64encode(buffer.getvalue()).decode()
        except Exception:
            return None

    def _generate_card(self, exif_data):
        img_b64 = self._generate_thumbnail_base64(exif_data['file_path'])
        img_tag = f'<img src="data:image/jpeg;base64,{img_b64}" alt="preview">' if img_b64 else '<span style="color:#999">预览不可用</span>'
        
        gps_html = ''
        if exif_data['gps_lat'] and exif_data['gps_lon']:
            gps_html = f'<span class="gps-badge">📍 {exif_data["gps_lat"]:.4f}, {exif_data["gps_lon"]:.4f}</span>'
            if exif_data.get('gps_location') and exif_data['gps_location'] != 'N/A':
                gps_html += f'<br><small>{exif_data["gps_location"]}</small>'
        else:
            gps_html = '<span class="no-gps">无GPS信息</span>'

        data_date = exif_data.get('datetime', '').replace('-', '').replace(':', '').replace(' ', '')
        data_camera = f"{exif_data.get('camera_make', '')} {exif_data.get('camera_model', '')}".strip()

        card_html = f'''
        <div class="card" data-name="{exif_data['file_name']}" data-date="{data_date}" data-camera="{data_camera}">
            <div class="card-image">{img_tag}</div>
            <div class="card-body">
                <div class="card-title">{exif_data['file_name']}</div>
                <table class="card-table">
                    <tr><td>相机</td><td>{exif_data.get('camera_make', 'N/A')} {exif_data.get('camera_model', 'N/A')}</td></tr>
                    <tr><td>拍摄时间</td><td>{exif_data.get('datetime', 'N/A')}</td></tr>
                    <tr><td>参数</td><td>{exif_data.get('aperture', 'N/A')} {exif_data.get('shutter_speed', 'N/A')} ISO {exif_data.get('iso', 'N/A')}</td></tr>
                    <tr><td>焦距</td><td>{exif_data.get('focal_length', 'N/A')}</td></tr>
                    <tr><td>闪光灯</td><td>{exif_data.get('flash', 'N/A')}</td></tr>
                    <tr><td>GPS</td><td>{gps_html}</td></tr>
                </table>
            </div>
        </div>
        '''
        return card_html

    def generate(self, exif_list, output_path):
        from datetime import datetime
        cards_html = ''
        for exif in exif_list:
            cards_html += self._generate_card(exif)

        total = len(exif_list)
        with_gps = sum(1 for e in exif_list if e.get('gps_lat'))
        with_camera = sum(1 for e in exif_list if e.get('camera_model') != 'N/A')
        with_datetime = sum(1 for e in exif_list if e.get('datetime') != 'N/A')

        html = self.html_template.format(
            total_images=total,
            with_gps=with_gps,
            with_camera=with_camera,
            with_datetime=with_datetime,
            generated_at=datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            cards=cards_html
        )

        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(html)
        return output_path


class GeoLocator:
    def __init__(self):
        self.cache = {}

    def reverse_geocode_offline(self, lat, lon):
        if not lat or not lon:
            return None
        key = (round(lat, 4), round(lon, 4))
        if key in self.cache:
            return self.cache[key]
        try:
            results = rg.search([(lat, lon)])
            if results:
                r = results[0]
                location = f"{r.get('admin1', '')}, {r.get('cc', '')}"
                if r.get('name'):
                    location = f"{r['name']}, {location}"
                self.cache[key] = location.strip(', ')
                return self.cache[key]
        except Exception:
            pass
        return None

    def reverse_geocode_online(self, lat, lon):
        if not lat or not lon:
            return None
        try:
            url = f"https://nominatim.openstreetmap.org/reverse?format=json&lat={lat}&lon={lon}&zoom=10&addressdetails=0"
            headers = {'User-Agent': 'ExifTool/1.0'}
            response = requests.get(url, headers=headers, timeout=5)
            if response.status_code == 200:
                data = response.json()
                return data.get('display_name')
        except Exception:
            pass
        return None

    def batch_geocode(self, exif_list, use_online=False):
        for exif in exif_list:
            lat, lon = exif.get('gps_lat'), exif.get('gps_lon')
            if lat and lon:
                if use_online:
                    loc = self.reverse_geocode_online(lat, lon) or self.reverse_geocode_offline(lat, lon)
                else:
                    loc = self.reverse_geocode_offline(lat, lon)
                exif['gps_location'] = loc or 'N/A'
            else:
                exif['gps_location'] = 'N/A'
        return exif_list


class KmlExporter:
    def export(self, exif_list, output_path):
        kml = simplekml.Kml()
        kml.document.name = "图片拍摄位置"
        
        folder = kml.newfolder(name="照片地点")
        
        for exif in exif_list:
            lat, lon = exif.get('gps_lat'), exif.get('gps_lon')
            if lat and lon:
                pnt = folder.newpoint()
                pnt.name = exif.get('file_name', 'Unknown')
                description = f"""
                <![CDATA[
                <b>{exif.get('file_name')}</b><br>
                相机: {exif.get('camera_make', '')} {exif.get('camera_model', '')}<br>
                时间: {exif.get('datetime', '')}<br>
                参数: {exif.get('aperture', '')} {exif.get('shutter_speed', '')} ISO {exif.get('iso', '')}<br>
                坐标: {lat:.6f}, {lon:.6f}
                ]]>
                """
                pnt.description = description
                pnt.coords = [(lon, lat)]
                pnt.style.iconstyle.icon.href = 'http://maps.google.com/mapfiles/kml/paddle/red-circle.png'
                pnt.style.iconstyle.scale = 0.8
        
        kml.save(output_path)
        return output_path


class ExifComparator:
    def compare(self, exif1, exif2):
        keys_to_compare = [
            'camera_make', 'camera_model', 'datetime',
            'aperture', 'shutter_speed', 'iso', 'focal_length',
            'exposure_compensation', 'flash', 'gps_lat', 'gps_lon'
        ]
        
        differences = []
        for key in keys_to_compare:
            v1 = exif1.get(key, 'N/A')
            v2 = exif2.get(key, 'N/A')
            if v1 != v2:
                differences.append({
                    'field': key,
                    'image1': v1,
                    'image2': v2,
                    'different': True
                })
            else:
                differences.append({
                    'field': key,
                    'image1': v1,
                    'image2': v2,
                    'different': False
                })
        
        return differences

    def generate_html_diff(self, exif1, exif2, output_path):
        file1 = exif1.get('file_name', 'Image 1')
        file2 = exif2.get('file_name', 'Image 2')
        
        differences = self.compare(exif1, exif2)
        
        html_head = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>EXIF对比报告</title>
    <style>
        body {{ font-family: sans-serif; margin: 20px; }}
        h1 {{ color: #333; }}
        .diff-table {{ width: 100%; border-collapse: collapse; margin-top: 20px; }}
        .diff-table th, .diff-table td {{ border: 1px solid #ddd; padding: 10px; text-align: left; }}
        .diff-table th {{ background: #f5f5f5; }}
        .different {{ background: #ffebee; }}
        .same {{ background: #e8f5e9; }}
        .field-name {{ font-weight: bold; width: 150px; }}
        .header-info {{ display: flex; gap: 20px; margin-bottom: 20px; }}
        .info-box {{ flex: 1; padding: 15px; background: #f5f5f5; border-radius: 5px; }}
    </style>
</head>
<body>
    <h1>EXIF对比报告</h1>
    <div class="header-info">
        <div class="info-box">
            <strong>图片1:</strong> {file1}<br>
            <small>{exif1.get('file_path', '')}</small>
        </div>
        <div class="info-box">
            <strong>图片2:</strong> {file2}<br>
            <small>{exif2.get('file_path', '')}</small>
        </div>
    </div>
    <table class="diff-table">
        <tr>
            <th>字段</th>
            <th>图片1</th>
            <th>图片2</th>
        </tr>
"""
        
        rows = ""
        for diff in differences:
            row_class = 'different' if diff['different'] else 'same'
            rows += f"""
        <tr class="{row_class}">
            <td class="field-name">{diff['field']}</td>
            <td>{diff['image1']}</td>
            <td>{diff['image2']}</td>
        </tr>
"""
        
        html_tail = """
    </table>
</body>
</html>
"""
        html = html_head + rows + html_tail
        
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(html)
        return output_path

    def print_comparison(self, exif1, exif2):
        differences = self.compare(exif1, exif2)
        
        print(f"\n{'='*60}")
        print(f"EXIF对比: {exif1.get('file_name')} vs {exif2.get('file_name')}")
        print(f"{'='*60}")
        
        for diff in differences:
            marker = "≠" if diff['different'] else "="
            if diff['different']:
                print(f"{marker} {diff['field']:<25} {str(diff['image1']):<20} | {str(diff['image2']):<20}")
            else:
                print(f"{marker} {diff['field']:<25} {str(diff['image1']):<40}")
        
        diff_count = sum(1 for d in differences if d['different'])
        print(f"\n共发现 {diff_count} 处差异")
