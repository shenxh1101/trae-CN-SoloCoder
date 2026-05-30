from typing import Optional, List, Dict
from pathlib import Path
from datetime import datetime

from .models import Trip, DiaryEntry
from .manager import DiaryManager


class MapGenerator:
    def __init__(self, manager: Optional[DiaryManager] = None):
        self.manager = manager or DiaryManager()
        self.storage = self.manager.storage

    def generate_map(self, username: str, trip_id: str,
                     output_path: Optional[str] = None) -> str:
        trip = self.manager.get_trip(username, trip_id)
        if not trip:
            raise ValueError(f"旅行 '{trip_id}' 不存在")
        locations = self._collect_locations(trip)
        if not locations:
            raise ValueError("该旅行没有记录任何位置信息，请先在日记中添加位置坐标")
        html_content = self._build_html(trip, locations)
        if not output_path:
            maps_dir = self.storage.get_maps_dir(username)
            safe_name = "".join(c if c.isalnum() or c in "_-" else "_" for c in trip.name)
            output_path = str(maps_dir / f"{safe_name}_{trip.start_date}_map.html")
        Path(output_path).parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(html_content)
        return output_path

    def _collect_locations(self, trip: Trip) -> List[Dict]:
        locations = []
        for entry in trip.diary_entries:
            if entry.location and entry.location.latitude != 0 and entry.location.longitude != 0:
                locations.append({
                    "date": entry.date,
                    "name": entry.location.name,
                    "lat": entry.location.latitude,
                    "lng": entry.location.longitude,
                    "mood": entry.mood,
                    "content": entry.content[:200] + "..." if len(entry.content) > 200 else entry.content,
                    "expense": entry.get_total_expenses(),
                    "photo": entry.photo_path
                })
        locations.sort(key=lambda x: x["date"])
        return locations

    def _build_html(self, trip: Trip, locations: List[Dict]) -> str:
        center_lat = sum(l["lat"] for l in locations) / len(locations)
        center_lng = sum(l["lng"] for l in locations) / len(locations)
        locations_js = []
        for idx, loc in enumerate(locations):
            popup_content = self._build_popup_content(idx, loc)
            locations_js.append({
                "lat": loc["lat"],
                "lng": loc["lng"],
                "popup": popup_content,
                "date": loc["date"],
                "name": loc["name"]
            })
        import json
        locations_json = json.dumps(locations_js, ensure_ascii=False)
        path_coords = [[l["lat"], l["lng"]] for l in locations]
        path_json = json.dumps(path_coords, ensure_ascii=False)
        html = f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>旅行地图 - {trip.name}</title>
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'PingFang SC', 'Microsoft YaHei', sans-serif;
            height: 100vh;
            display: flex;
            flex-direction: column;
        }}
        .header {{
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px 30px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }}
        .header h1 {{ font-size: 24px; margin-bottom: 5px; }}
        .header .info {{
            font-size: 14px;
            opacity: 0.9;
            display: flex;
            gap: 20px;
            flex-wrap: wrap;
        }}
        .header .info span {{ display: flex; align-items: center; gap: 5px; }}
        #map {{
            flex: 1;
            width: 100%;
        }}
        .legend {{
            position: absolute;
            bottom: 30px;
            right: 30px;
            background: white;
            padding: 15px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            z-index: 1000;
            font-size: 13px;
        }}
        .legend h4 {{ margin-bottom: 10px; color: #333; }}
        .legend-item {{
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 5px;
        }}
        .legend-marker {{
            width: 20px;
            height: 20px;
            border-radius: 50%;
            background: #e74c3c;
            border: 2px solid white;
            box-shadow: 0 1px 3px rgba(0,0,0,0.3);
        }}
        .legend-line {{
            width: 20px;
            height: 3px;
            background: #3498db;
        }}
        .popup-content {{
            min-width: 200px;
            max-width: 300px;
        }}
        .popup-content h3 {{
            color: #2c3e50;
            margin-bottom: 5px;
            font-size: 16px;
        }}
        .popup-content .date {{
            color: #7f8c8d;
            font-size: 12px;
            margin-bottom: 8px;
        }}
        .popup-content .content {{
            color: #34495e;
            font-size: 13px;
            line-height: 1.5;
            margin-bottom: 8px;
        }}
        .popup-content .meta {{
            display: flex;
            gap: 10px;
            font-size: 12px;
            color: #95a5a6;
        }}
        .popup-content img {{
            max-width: 100%;
            border-radius: 4px;
            margin-top: 8px;
        }}
        .trip-info {{
            position: absolute;
            top: 100px;
            left: 30px;
            background: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            z-index: 1000;
            max-width: 250px;
        }}
        .trip-info h4 {{ color: #2c3e50; margin-bottom: 10px; }}
        .trip-info p {{ color: #7f8c8d; font-size: 13px; line-height: 1.6; }}
    </style>
</head>
<body>
    <div class="header">
        <h1>🗺️ {trip.name}</h1>
        <div class="info">
            <span>📍 {trip.destination}</span>
            <span>📅 {trip.start_date} ~ {trip.end_date}</span>
            <span>🏁 {len(locations)} 个停留点</span>
            <span>💰 总开销 ¥{trip.get_total_expenses():.2f}</span>
        </div>
    </div>
    <div id="map"></div>
    <div class="trip-info">
        <h4>📝 旅行简介</h4>
        <p>{trip.description or '暂无描述'}</p>
    </div>
    <div class="legend">
        <h4>📌 图例</h4>
        <div class="legend-item">
            <div class="legend-marker"></div>
            <span>停留位置</span>
        </div>
        <div class="legend-item">
            <div class="legend-line"></div>
            <span>旅行路线</span>
        </div>
    </div>
    <script>
        var map = L.map('map').setView([{center_lat:.6f}, {center_lng:.6f}], 10);
        L.tileLayer('https://{{s}}.tile.openstreetmap.org/{{z}}/{{x}}/{{y}}.png', {{
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }}).addTo(map);
        var locations = {locations_json};
        var pathCoords = {path_json};
        var customIcon = L.divIcon({{
            className: 'custom-marker',
            html: '<div style="background: #e74c3c; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"></div>',
            iconSize: [20, 20],
            iconAnchor: [10, 10]
        }});
        var bounds = [];
        locations.forEach(function(loc, index) {{
            bounds.push([loc.lat, loc.lng]);
            var marker = L.marker([loc.lat, loc.lng], {{ icon: customIcon }}).addTo(map);
            var numberIcon = L.divIcon({{
                className: 'number-marker',
                html: '<div style="background: #3498db; color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 12px; border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);">' + (index + 1) + '</div>',
                iconSize: [24, 24],
                iconAnchor: [12, 12]
            }});
            L.marker([loc.lat, loc.lng], {{ icon: numberIcon }}).addTo(map).bindPopup(loc.popup);
        }});
        if (pathCoords.length > 1) {{
            var pathLine = L.polyline(pathCoords, {{
                color: '#3498db',
                weight: 3,
                opacity: 0.7,
                dashArray: '10, 10'
            }}).addTo(map);
        }}
        if (bounds.length > 0) {{
            map.fitBounds(bounds, {{ padding: [50, 50] }});
        }}
    </script>
</body>
</html>"""
        return html

    def _build_popup_content(self, index: int, loc: Dict) -> str:
        html = f'<div class="popup-content">'
        html += f'<h3>#{index + 1} {loc["name"]}</h3>'
        html += f'<div class="date">📅 {loc["date"]}'
        if loc["mood"]:
            html += f' | 😊 {loc["mood"]}'
        html += '</div>'
        if loc["content"]:
            html += f'<div class="content">{loc["content"]}</div>'
        if loc["expense"] > 0:
            html += f'<div class="meta"><span>💰 ¥{loc["expense"]:.2f}</span></div>'
        if loc["photo"]:
            import pathlib
            photo_path = pathlib.Path(loc["photo"])
            if photo_path.exists():
                html += f'<img src="{photo_path.as_uri()}" alt="照片">'
        html += '</div>'
        return html
