import os
import re
from datetime import datetime
from pathlib import Path
from PIL import Image
import piexif
import exifread
import json
import csv


class ExifExtractor:
    def __init__(self):
        self.supported_extensions = {'.jpg', '.jpeg', '.tiff', '.tif'}

    def scan_images(self, folder_path, recursive=True):
        folder_path = Path(folder_path)
        images = []
        pattern = '**/*' if recursive else '*'
        for path in folder_path.glob(pattern):
            if path.is_file() and path.suffix.lower() in self.supported_extensions:
                images.append(str(path))
        return sorted(images)

    def _convert_to_degrees(self, value):
        d = float(value[0])
        m = float(value[1])
        s = float(value[2])
        return d + (m / 60.0) + (s / 3600.0)

    def _get_gps_coords(self, exif_data):
        try:
            lat_tag = exif_data.get('GPS GPSLatitude')
            lat_ref = exif_data.get('GPS GPSLatitudeRef')
            lon_tag = exif_data.get('GPS GPSLongitude')
            lon_ref = exif_data.get('GPS GPSLongitudeRef')

            if not all([lat_tag, lat_ref, lon_tag, lon_ref]):
                return None, None

            lat_values = [x.num / x.den if hasattr(x, 'num') else x for x in lat_tag.values]
            lon_values = [x.num / x.den if hasattr(x, 'num') else x for x in lon_tag.values]

            lat = self._convert_to_degrees(lat_values)
            lon = self._convert_to_degrees(lon_values)

            if lat_ref.values != 'N':
                lat = -lat
            if lon_ref.values != 'E':
                lon = -lon

            return round(lat, 6), round(lon, 6)
        except Exception:
            return None, None

    def _get_exif_value(self, exif_data, key, default='N/A'):
        try:
            tag = exif_data.get(key)
            if tag:
                if hasattr(tag, 'values'):
                    if isinstance(tag.values, list) and len(tag.values) > 0:
                        val = tag.values[0]
                        if hasattr(val, 'num') and hasattr(val, 'den'):
                            if val.den != 0:
                                return val.num / val.den
                            return val.num
                        return val
                    return tag.values
            return default
        except Exception:
            return default

    def _get_shutter_speed(self, exif_data):
        try:
            tag = exif_data.get('EXIF ExposureTime')
            if tag:
                val = tag.values[0]
                if hasattr(val, 'num') and hasattr(val, 'den'):
                    if val.num == 1:
                        return f"1/{val.den}s"
                    return f"{val.num}/{val.den}s"
                return f"{val}s"
            return 'N/A'
        except Exception:
            return 'N/A'

    def _get_aperture(self, exif_data):
        try:
            tag = exif_data.get('EXIF FNumber')
            if tag:
                val = tag.values[0]
                if hasattr(val, 'num') and hasattr(val, 'den'):
                    if val.den != 0:
                        return f"f/{val.num / val.den:.1f}"
                return f"f/{val}"
            return 'N/A'
        except Exception:
            return 'N/A'

    def _get_focal_length(self, exif_data):
        try:
            tag = exif_data.get('EXIF FocalLength')
            if tag:
                val = tag.values[0]
                if hasattr(val, 'num') and hasattr(val, 'den'):
                    if val.den != 0:
                        return f"{val.num / val.den:.1f}mm"
                return f"{val}mm"
            return 'N/A'
        except Exception:
            return 'N/A'

    def _get_flash_status(self, exif_data):
        try:
            tag = exif_data.get('EXIF Flash')
            if tag:
                flash_val = tag.values[0] if isinstance(tag.values, list) else tag.values
                flash_map = {
                    0: 'Flash did not fire',
                    1: 'Flash fired',
                    5: 'Flash fired, return not detected',
                    7: 'Flash fired, return detected',
                    9: 'Flash fired, compulsory',
                    13: 'Flash fired, compulsory, return not detected',
                    15: 'Flash fired, compulsory, return detected',
                    16: 'Flash did not fire, compulsory',
                    24: 'Flash did not fire, auto',
                    25: 'Flash fired, auto',
                    29: 'Flash fired, auto, return not detected',
                    31: 'Flash fired, auto, return detected',
                    32: 'No flash function',
                    65: 'Flash fired, red-eye reduction',
                    69: 'Flash fired, red-eye reduction, return not detected',
                    71: 'Flash fired, red-eye reduction, return detected',
                    73: 'Flash fired, compulsory, red-eye reduction',
                    77: 'Flash fired, compulsory, red-eye reduction, return not detected',
                    79: 'Flash fired, compulsory, red-eye reduction, return detected',
                    89: 'Flash fired, auto, red-eye reduction',
                    93: 'Flash fired, auto, return not detected, red-eye reduction',
                    95: 'Flash fired, auto, return detected, red-eye reduction'
                }
                return flash_map.get(flash_val, f'Unknown ({flash_val})')
            return 'N/A'
        except Exception:
            return 'N/A'

    def extract_exif(self, image_path):
        result = {
            'file_path': image_path,
            'file_name': os.path.basename(image_path),
            'file_size': os.path.getsize(image_path),
            'camera_make': 'N/A',
            'camera_model': 'N/A',
            'datetime': 'N/A',
            'aperture': 'N/A',
            'shutter_speed': 'N/A',
            'iso': 'N/A',
            'focal_length': 'N/A',
            'exposure_compensation': 'N/A',
            'flash': 'N/A',
            'gps_lat': None,
            'gps_lon': None,
            'gps_location': 'N/A'
        }

        try:
            with open(image_path, 'rb') as f:
                exif_data = exifread.process_file(f, details=False)

            result['camera_make'] = str(self._get_exif_value(exif_data, 'Image Make', 'N/A'))
            result['camera_model'] = str(self._get_exif_value(exif_data, 'Image Model', 'N/A'))

            dt_original = exif_data.get('EXIF DateTimeOriginal')
            dt_digitized = exif_data.get('EXIF DateTimeDigitized')
            dt_image = exif_data.get('Image DateTime')

            for dt_tag in [dt_original, dt_digitized, dt_image]:
                if dt_tag:
                    try:
                        dt_str = str(dt_tag.values)
                        dt = datetime.strptime(dt_str, '%Y:%m:%d %H:%M:%S')
                        result['datetime'] = dt.strftime('%Y-%m-%d %H:%M:%S')
                        result['datetime_obj'] = dt
                        break
                    except Exception:
                        pass

            result['aperture'] = self._get_aperture(exif_data)
            result['shutter_speed'] = self._get_shutter_speed(exif_data)
            result['iso'] = str(self._get_exif_value(exif_data, 'EXIF ISOSpeedRatings', 'N/A'))
            result['focal_length'] = self._get_focal_length(exif_data)

            exp_comp = self._get_exif_value(exif_data, 'EXIF ExposureBiasValue', 'N/A')
            if exp_comp != 'N/A':
                result['exposure_compensation'] = f"{exp_comp} EV"

            result['flash'] = self._get_flash_status(exif_data)

            lat, lon = self._get_gps_coords(exif_data)
            result['gps_lat'] = lat
            result['gps_lon'] = lon

        except Exception as e:
            pass

        return result

    def sort_results(self, results, sort_by='date', sort_order='asc'):
        if sort_by == 'date':
            def sort_key(x):
                dt = x.get('datetime_obj')
                if dt:
                    return (0, dt)
                return (1, x['file_name'])
            results.sort(key=sort_key, reverse=(sort_order == 'desc'))
        elif sort_by == 'name':
            results.sort(key=lambda x: x['file_name'], reverse=(sort_order == 'desc'))
        return results

    def extract_all(self, folder_path, recursive=True, sort_by='date', sort_order='asc'):
        images = self.scan_images(folder_path, recursive)
        results = []
        for img in images:
            exif = self.extract_exif(img)
            results.append(exif)

        if sort_by:
            self.sort_results(results, sort_by=sort_by, sort_order=sort_order)

        return results

    def export_csv(self, results, output_path):
        fieldnames = [
            'file_name', 'file_path', 'file_size',
            'camera_make', 'camera_model', 'datetime',
            'aperture', 'shutter_speed', 'iso', 'focal_length',
            'exposure_compensation', 'flash',
            'gps_lat', 'gps_lon', 'gps_location'
        ]
        with open(output_path, 'w', newline='', encoding='utf-8-sig') as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            for r in results:
                row = {k: r.get(k, '') for k in fieldnames}
                writer.writerow(row)
        return output_path

    def export_json(self, results, output_path):
        export_data = []
        for r in results:
            data = {k: v for k, v in r.items() if k != 'datetime_obj'}
            export_data.append(data)
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(export_data, f, ensure_ascii=False, indent=2)
        return output_path

    def extract_thumbnail(self, image_path, output_folder):
        try:
            img = Image.open(image_path)
            exif_data = img.info.get('exif')
            if not exif_data:
                return None
            exif_dict = piexif.load(exif_data)
            thumbnail = exif_dict.pop('thumbnail')
            if thumbnail:
                os.makedirs(output_folder, exist_ok=True)
                base_name = os.path.splitext(os.path.basename(image_path))[0]
                thumb_path = os.path.join(output_folder, f"{base_name}_thumb.jpg")
                with open(thumb_path, 'wb') as f:
                    f.write(thumbnail)
                return thumb_path
        except Exception:
            pass
        return None

    def extract_thumbnails_batch(self, image_paths, output_folder):
        results = []
        for path in image_paths:
            thumb = self.extract_thumbnail(path, output_folder)
            results.append({'original': path, 'thumbnail': thumb})
        return results

    def remove_exif(self, image_path, output_folder):
        try:
            os.makedirs(output_folder, exist_ok=True)
            img = Image.open(image_path)
            data = list(img.getdata())
            image_without_exif = Image.new(img.mode, img.size)
            image_without_exif.putdata(data)
            base_name = os.path.basename(image_path)
            output_path = os.path.join(output_folder, base_name)
            image_without_exif.save(output_path, quality=95)
            return output_path
        except Exception:
            return None

    def remove_exif_batch(self, image_paths, output_folder):
        results = []
        for path in image_paths:
            out = self.remove_exif(path, output_folder)
            results.append({'original': path, 'clean': out})
        return results

    def _resolve_rename_conflict(self, new_path):
        if not os.path.exists(new_path):
            return new_path
        base, ext = os.path.splitext(new_path)
        counter = 1
        while True:
            candidate = f"{base}_{counter:02d}{ext}"
            if not os.path.exists(candidate):
                return candidate
            counter += 1

    def rename_batch(self, image_paths):
        name_map = {}
        rename_plan = []
        results = []

        for path in sorted(image_paths):
            exif = self.extract_exif(path)
            dt_obj = exif.get('datetime_obj')
            if dt_obj:
                base_name = dt_obj.strftime('%Y%m%d_%H%M%S')
            else:
                base_name = 'unknown_date'
            ext = os.path.splitext(path)[1].lower()
            dir_name = os.path.dirname(path)
            if base_name not in name_map:
                name_map[base_name] = 0
                new_path = os.path.join(dir_name, f"{base_name}{ext}")
            else:
                name_map[base_name] += 1
                new_path = os.path.join(dir_name, f"{base_name}_{name_map[base_name]:02d}{ext}")

            rename_plan.append((path, new_path))

        used_targets = set()
        for i, (src, dst) in enumerate(rename_plan):
            if dst in used_targets and src != dst:
                dst = self._resolve_rename_conflict(dst)
            used_targets.add(dst)

            tmp_path = src + '.tmp_exif_rename'
            try:
                os.rename(src, tmp_path)
                rename_plan[i] = (tmp_path, dst)
            except Exception as e:
                results.append({'original': src, 'error': str(e)})
                rename_plan[i] = (None, None)

        for src, dst in rename_plan:
            if src is None:
                continue
            try:
                if os.path.exists(dst) and src != dst:
                    dst = self._resolve_rename_conflict(dst)
                os.rename(src, dst)
                original_name = src.replace('.tmp_exif_rename', '')
                results.append({'original': original_name, 'renamed': dst})
            except Exception as e:
                original_name = src.replace('.tmp_exif_rename', '')
                try:
                    os.rename(src, original_name)
                except Exception:
                    pass
                results.append({'original': original_name, 'error': str(e)})

        return results

    def search_by_camera(self, results, camera_model):
        camera_model = camera_model.lower()
        return [r for r in results if camera_model in r['camera_model'].lower() or camera_model in r['camera_make'].lower()]

    def search_by_date_range(self, results, start_date, end_date):
        filtered = []
        try:
            start_dt = datetime.strptime(start_date, '%Y-%m-%d')
            end_dt = datetime.strptime(end_date, '%Y-%m-%d')
            end_dt = end_dt.replace(hour=23, minute=59, second=59)
            for r in results:
                dt_obj = r.get('datetime_obj')
                if dt_obj and start_dt <= dt_obj <= end_dt:
                    filtered.append(r)
        except Exception:
            pass
        return filtered
