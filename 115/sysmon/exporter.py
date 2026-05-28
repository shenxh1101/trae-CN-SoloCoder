import json
import os

from sysmon.storage import parse_csv_data, get_csv_filename, filter_by_time_range


def run_export(args):
    filepath = args.file or get_csv_filename()
    data = parse_csv_data(filepath)
    if not data:
        print(f"文件 {filepath} 无数据。")
        return

    if args.start or args.end:
        data = filter_by_time_range(data, args.start, args.end)
        if not data:
            print("筛选后无数据。")
            return

    output = args.output
    if not output:
        base = os.path.splitext(filepath)[0]
        output = base + ".json"

    with open(output, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"数据已导出为JSON: {output} ({len(data)} 条记录)")
