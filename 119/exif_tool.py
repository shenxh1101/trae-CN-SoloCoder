#!/usr/bin/env python3
import argparse
import os
import sys
from pathlib import Path

from exif_extractor import ExifExtractor
from exif_tools import HtmlReportGenerator, GeoLocator, KmlExporter, ExifComparator


def print_exif_table(results):
    if not results:
        print("未找到图片或EXIF信息")
        return

    print(f"\n{'='*100}")
    print(f"{'文件名':<30} {'相机型号':<20} {'拍摄时间':<20} {'参数':<20} GPS")
    print(f"{'='*100}")

    for r in results:
        gps_info = 'N/A'
        if r['gps_lat'] and r['gps_lon']:
            gps_info = f"{r['gps_lat']:.4f}, {r['gps_lon']:.4f}"
            if r.get('gps_location') and r['gps_location'] != 'N/A':
                gps_info += f" ({r['gps_location'][:30]}...)"

        params = f"{r['aperture']} {r['shutter_speed']} ISO{r['iso']}"
        print(f"{r['file_name'][:28]:<30} {r['camera_model'][:18]:<20} {r['datetime'][:19]:<20} {params[:20]:<20} {gps_info}")

    print(f"{'='*100}")
    print(f"共 {len(results)} 张图片\n")


def add_common_args(parser):
    parser.add_argument('--recursive', action='store_true', default=True,
                        help='递归扫描子文件夹（默认开启）')
    parser.add_argument('--no-recursive', action='store_true',
                        help='不递归扫描子文件夹，仅扫描顶层目录')
    parser.add_argument('--sort', choices=['date', 'name'], default='date',
                        help='排序方式: date=按拍摄时间(默认), name=按文件名')
    parser.add_argument('--order', choices=['asc', 'desc'], default='asc',
                        help='排序方向: asc=升序(默认), desc=降序')


def get_recursive_and_sort(args):
    recursive = not getattr(args, 'no_recursive', False) and getattr(args, 'recursive', True)
    sort_by = getattr(args, 'sort', 'date')
    sort_order = getattr(args, 'order', 'asc')
    return recursive, sort_by, sort_order


def main():
    parser = argparse.ArgumentParser(
        description='图片EXIF信息批量提取工具',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
使用示例:
  %(prog)s extract /path/to/images                         # 提取EXIF，按时间升序
  %(prog)s extract /path/to/images --sort date --order desc # 按拍摄时间降序
  %(prog)s extract /path/to/images --csv out.csv            # 导出为CSV
  %(prog)s extract /path/to/images --json out.json          # 导出为JSON
  %(prog)s extract /path/to/images --no-recursive           # 不递归扫描子文件夹
  %(prog)s thumbnail /path/to/images -o thumbs/             # 提取缩略图
  %(prog)s clean /path/to/images -o clean/                  # 清除EXIF信息
  %(prog)s rename /path/to/images                           # 按拍摄时间重命名
  %(prog)s rename /path/to/images --dry-run                 # 预览重命名
  %(prog)s search /path/to/images --camera Canon            # 按相机型号搜索
  %(prog)s search /path/to/images --date 2024-01-01 2024-12-31  # 按日期范围搜索
  %(prog)s search /path/to/images --camera Canon --sort date --order desc  # 搜索并降序
  %(prog)s html /path/to/images -o report.html              # 生成HTML图库报告
  %(prog)s geocode /path/to/images --online                 # 反向查询地理位置
  %(prog)s kml /path/to/images -o locations.kml             # 导出GPS为KML
  %(prog)s compare img1.jpg img2.jpg                        # 对比两张图片EXIF
        """
    )

    subparsers = parser.add_subparsers(dest='command', help='可用命令')

    extract_parser = subparsers.add_parser('extract', help='提取EXIF信息')
    extract_parser.add_argument('folder', help='图片文件夹路径')
    add_common_args(extract_parser)
    extract_parser.add_argument('--csv', help='导出为CSV文件')
    extract_parser.add_argument('--json', help='导出为JSON文件')

    thumb_parser = subparsers.add_parser('thumbnail', help='提取缩略图')
    thumb_parser.add_argument('folder', help='图片文件夹路径')
    thumb_parser.add_argument('-o', '--output', default='thumbnails', help='输出文件夹')
    thumb_parser.add_argument('--recursive', action='store_true', default=True,
                              help='递归扫描子文件夹（默认开启）')
    thumb_parser.add_argument('--no-recursive', action='store_true',
                              help='不递归扫描子文件夹')

    clean_parser = subparsers.add_parser('clean', help='清除EXIF信息')
    clean_parser.add_argument('folder', help='图片文件夹路径')
    clean_parser.add_argument('-o', '--output', default='clean_images', help='输出文件夹')
    clean_parser.add_argument('--recursive', action='store_true', default=True,
                              help='递归扫描子文件夹（默认开启）')
    clean_parser.add_argument('--no-recursive', action='store_true',
                              help='不递归扫描子文件夹')

    rename_parser = subparsers.add_parser('rename', help='按拍摄时间重命名')
    rename_parser.add_argument('folder', help='图片文件夹路径')
    rename_parser.add_argument('--recursive', action='store_true', default=True,
                              help='递归扫描子文件夹（默认开启）')
    rename_parser.add_argument('--no-recursive', action='store_true',
                              help='不递归扫描子文件夹')
    rename_parser.add_argument('--dry-run', action='store_true', help='仅显示重命名结果，不实际执行')

    search_parser = subparsers.add_parser('search', help='搜索图片')
    search_parser.add_argument('folder', help='图片文件夹路径')
    search_parser.add_argument('--camera', help='按相机型号搜索')
    search_parser.add_argument('--date', nargs=2, metavar=('START', 'END'),
                               help='按日期范围搜索 (YYYY-MM-DD YYYY-MM-DD)')
    search_parser.add_argument('--sort', choices=['date', 'name'], default='date',
                               help='排序方式: date=按拍摄时间(默认), name=按文件名')
    search_parser.add_argument('--order', choices=['asc', 'desc'], default='asc',
                               help='排序方向: asc=升序(默认), desc=降序')
    search_parser.add_argument('--csv', help='导出搜索结果为CSV')

    html_parser = subparsers.add_parser('html', help='生成HTML报告')
    html_parser.add_argument('folder', help='图片文件夹路径')
    html_parser.add_argument('-o', '--output', default='exif_report.html', help='输出HTML文件')
    html_parser.add_argument('--recursive', action='store_true', default=True,
                             help='递归扫描子文件夹（默认开启）')
    html_parser.add_argument('--no-recursive', action='store_true',
                             help='不递归扫描子文件夹')
    html_parser.add_argument('--sort', choices=['date', 'name'], default='date',
                             help='排序方式: date=按拍摄时间(默认), name=按文件名')
    html_parser.add_argument('--order', choices=['asc', 'desc'], default='asc',
                             help='排序方向: asc=升序(默认), desc=降序')
    html_parser.add_argument('--geocode', action='store_true', help='包含地理位置查询')
    html_parser.add_argument('--online', action='store_true', help='使用在线API查询地理位置')

    geocode_parser = subparsers.add_parser('geocode', help='反向查询地理位置')
    geocode_parser.add_argument('folder', help='图片文件夹路径')
    geocode_parser.add_argument('--online', action='store_true', help='使用在线API查询')
    geocode_parser.add_argument('--sort', choices=['date', 'name'], default='date',
                                help='排序方式: date=按拍摄时间(默认), name=按文件名')
    geocode_parser.add_argument('--order', choices=['asc', 'desc'], default='asc',
                                help='排序方向: asc=升序(默认), desc=降序')
    geocode_parser.add_argument('--csv', help='导出包含地理位置的CSV')

    kml_parser = subparsers.add_parser('kml', help='导出GPS为KML')
    kml_parser.add_argument('folder', help='图片文件夹路径')
    kml_parser.add_argument('-o', '--output', default='locations.kml', help='输出KML文件')
    kml_parser.add_argument('--recursive', action='store_true', default=True,
                            help='递归扫描子文件夹（默认开启）')
    kml_parser.add_argument('--no-recursive', action='store_true',
                            help='不递归扫描子文件夹')

    compare_parser = subparsers.add_parser('compare', help='对比两张图片EXIF')
    compare_parser.add_argument('image1', help='第一张图片路径')
    compare_parser.add_argument('image2', help='第二张图片路径')
    compare_parser.add_argument('--html', help='输出HTML对比报告')

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        return

    extractor = ExifExtractor()

    try:
        if args.command == 'extract':
            recursive, sort_by, sort_order = get_recursive_and_sort(args)
            print(f"正在扫描文件夹: {args.folder} {'(递归)' if recursive else '(非递归)'}")
            results = extractor.extract_all(args.folder, recursive=recursive,
                                            sort_by=sort_by, sort_order=sort_order)
            print_exif_table(results)

            if args.csv:
                extractor.export_csv(results, args.csv)
                print(f"已导出CSV: {args.csv}")
            if args.json:
                extractor.export_json(results, args.json)
                print(f"已导出JSON: {args.json}")

        elif args.command == 'thumbnail':
            recursive = not getattr(args, 'no_recursive', False)
            print(f"正在提取缩略图...")
            images = extractor.scan_images(args.folder, recursive=recursive)
            results = extractor.extract_thumbnails_batch(images, args.output)
            success = sum(1 for r in results if r['thumbnail'])
            print(f"成功提取 {success}/{len(results)} 个缩略图")
            print(f"输出文件夹: {args.output}")

        elif args.command == 'clean':
            recursive = not getattr(args, 'no_recursive', False)
            print(f"正在清除EXIF信息...")
            images = extractor.scan_images(args.folder, recursive=recursive)
            results = extractor.remove_exif_batch(images, args.output)
            success = sum(1 for r in results if r['clean'])
            print(f"成功处理 {success}/{len(results)} 张图片")
            print(f"输出文件夹: {args.output}")

        elif args.command == 'rename':
            recursive = not getattr(args, 'no_recursive', False)
            print(f"准备重命名图片... {'(递归)' if recursive else '(非递归)'}")
            images = extractor.scan_images(args.folder, recursive=recursive)

            if args.dry_run:
                print("(预览模式，不会实际重命名)")
                name_counts = {}
                for path in sorted(images):
                    exif = extractor.extract_exif(path)
                    dt_obj = exif.get('datetime_obj')
                    if dt_obj:
                        base_name = dt_obj.strftime('%Y%m%d_%H%M%S')
                    else:
                        base_name = 'unknown_date'
                    ext = os.path.splitext(path)[1].lower()
                    dir_name = os.path.dirname(path)
                    if base_name not in name_counts:
                        name_counts[base_name] = 0
                        new_path = os.path.join(dir_name, f"{base_name}{ext}")
                    else:
                        name_counts[base_name] += 1
                        new_path = os.path.join(dir_name, f"{base_name}_{name_counts[base_name]:02d}{ext}")
                    print(f"  {os.path.basename(path):<30} -> {os.path.basename(new_path)}")
            else:
                results = extractor.rename_batch(images)
                success = sum(1 for r in results if 'renamed' in r)
                print(f"成功重命名 {success}/{len(results)} 张图片")
                for r in results:
                    if 'renamed' in r:
                        print(f"  {os.path.basename(r['original'])} -> {os.path.basename(r['renamed'])}")
                    else:
                        print(f"  失败: {r.get('original')} - {r.get('error', '未知错误')}")

        elif args.command == 'search':
            sort_by = getattr(args, 'sort', 'date')
            sort_order = getattr(args, 'order', 'asc')
            results = extractor.extract_all(args.folder, sort_by=sort_by, sort_order=sort_order)
            filtered = results

            if args.camera:
                filtered = extractor.search_by_camera(filtered, args.camera)
                print(f"按相机型号 '{args.camera}' 搜索, 找到 {len(filtered)} 张图片")

            if args.date:
                filtered = extractor.search_by_date_range(filtered, args.date[0], args.date[1])
                print(f"按日期范围 {args.date[0]} ~ {args.date[1]} 搜索, 找到 {len(filtered)} 张图片")

            extractor.sort_results(filtered, sort_by=sort_by, sort_order=sort_order)
            print_exif_table(filtered)

            if args.csv:
                extractor.export_csv(filtered, args.csv)
                print(f"已导出搜索结果: {args.csv}")

        elif args.command == 'html':
            recursive = not getattr(args, 'no_recursive', False)
            sort_by = getattr(args, 'sort', 'date')
            sort_order = getattr(args, 'order', 'asc')
            print(f"正在生成HTML报告...")
            results = extractor.extract_all(args.folder, recursive=recursive,
                                            sort_by=sort_by, sort_order=sort_order)

            if args.geocode:
                print("正在查询地理位置...")
                geolocator = GeoLocator()
                results = geolocator.batch_geocode(results, use_online=args.online)

            generator = HtmlReportGenerator()
            generator.generate(results, args.output)
            print(f"HTML报告已生成: {args.output}")

        elif args.command == 'geocode':
            sort_by = getattr(args, 'sort', 'date')
            sort_order = getattr(args, 'order', 'asc')
            print(f"正在查询地理位置...")
            results = extractor.extract_all(args.folder, sort_by=sort_by, sort_order=sort_order)
            geolocator = GeoLocator()
            results = geolocator.batch_geocode(results, use_online=args.online)
            print_exif_table(results)

            if args.csv:
                extractor.export_csv(results, args.csv)
                print(f"已导出CSV: {args.csv}")

        elif args.command == 'kml':
            recursive = not getattr(args, 'no_recursive', False)
            print(f"正在导出KML...")
            results = extractor.extract_all(args.folder, recursive=recursive)
            exporter = KmlExporter()
            exporter.export(results, args.output)
            has_gps = sum(1 for r in results if r.get('gps_lat'))
            print(f"KML文件已导出: {args.output}")
            print(f"包含 {has_gps} 个有GPS信息的地点")

        elif args.command == 'compare':
            print(f"正在对比图片EXIF...")
            exif1 = extractor.extract_exif(args.image1)
            exif2 = extractor.extract_exif(args.image2)

            comparator = ExifComparator()
            comparator.print_comparison(exif1, exif2)

            if args.html:
                comparator.generate_html_diff(exif1, exif2, args.html)
                print(f"\nHTML对比报告已生成: {args.html}")

    except KeyboardInterrupt:
        print("\n操作已取消")
    except Exception as e:
        print(f"\n错误: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
