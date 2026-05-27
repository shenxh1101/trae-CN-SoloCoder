#!/usr/bin/env python3
import argparse
import json
import csv
import os
import shutil
import random
import zipfile
from datetime import datetime, timedelta
from collections import defaultdict

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "weather_data")
RECORDS_FILE = os.path.join(DATA_DIR, "weather_records.json")
SUBSCRIPTIONS_FILE = os.path.join(DATA_DIR, "subscriptions.json")
CONFIG_FILE = os.path.join(DATA_DIR, "config.json")
BACKUP_DIR = os.path.join(DATA_DIR, "backups")

MOCK_CONDITIONS = ["Sunny", "Cloudy", "Rainy", "Partly Cloudy", "Snowy", "Windy", "Foggy", "Thunderstorm"]

RED = "\033[91m"
YELLOW = "\033[93m"
RESET = "\033[0m"


def init_storage():
    os.makedirs(DATA_DIR, exist_ok=True)
    os.makedirs(BACKUP_DIR, exist_ok=True)
    for f, default in [
        (RECORDS_FILE, []),
        (SUBSCRIPTIONS_FILE, []),
        (CONFIG_FILE, {"temp_threshold_low": 0, "temp_threshold_high": 35})
    ]:
        if not os.path.exists(f):
            with open(f, "w", encoding="utf-8") as fp:
                json.dump(default, fp, indent=2, ensure_ascii=False)


def load_json(path):
    with open(path, "r", encoding="utf-8") as fp:
        return json.load(fp)


def save_json(path, data):
    with open(path, "w", encoding="utf-8") as fp:
        json.dump(data, fp, indent=2, ensure_ascii=False)


def fetch_weather(city):
    temp = round(random.uniform(-10, 40), 1)
    humidity = random.randint(20, 95)
    condition = random.choice(MOCK_CONDITIONS)
    return {
        "date": datetime.now().strftime("%Y-%m-%d"),
        "city": city,
        "temperature": temp,
        "humidity": humidity,
        "condition": condition,
        "timestamp": datetime.now().isoformat()
    }


def save_record(record):
    records = load_json(RECORDS_FILE)
    records.append(record)
    save_json(RECORDS_FILE, records)


def check_threshold(temp):
    config = load_json(CONFIG_FILE)
    low = config.get("temp_threshold_low", 0)
    high = config.get("temp_threshold_high", 35)
    warnings = []
    if temp < low:
        warnings.append(f"{YELLOW}⚠️  WARNING: Temperature {temp}°C is below threshold {low}°C!{RESET}")
    if temp > high:
        warnings.append(f"{RED}⚠️  WARNING: Temperature {temp}°C is above threshold {high}°C!{RESET}")
    return warnings


def cmd_query(args):
    record = fetch_weather(args.city)
    save_record(record)
    print(f"🌤️  Current weather in {record['city']}:")
    print(f"   Date:        {record['date']}")
    print(f"   Temperature: {record['temperature']}°C")
    print(f"   Humidity:    {record['humidity']}%")
    print(f"   Condition:   {record['condition']}")
    for w in check_threshold(record["temperature"]):
        print(w)
    print("✅ Record saved.")


def cmd_add_city(args):
    subs = load_json(SUBSCRIPTIONS_FILE)
    if args.city in subs:
        print(f"ℹ️  {args.city} is already in subscriptions.")
        return
    subs.append(args.city)
    save_json(SUBSCRIPTIONS_FILE, subs)
    print(f"✅ Added {args.city} to subscriptions.")


def cmd_remove_city(args):
    subs = load_json(SUBSCRIPTIONS_FILE)
    if args.city not in subs:
        print(f"ℹ️  {args.city} is not in subscriptions.")
        return
    subs.remove(args.city)
    save_json(SUBSCRIPTIONS_FILE, subs)
    print(f"✅ Removed {args.city} from subscriptions.")


def cmd_list_cities(args):
    subs = load_json(SUBSCRIPTIONS_FILE)
    if not subs:
        print("ℹ️  No subscribed cities.")
        return
    print("📋 Subscribed cities:")
    for i, city in enumerate(subs, 1):
        print(f"   {i}. {city}")


def cmd_update_all(args):
    subs = load_json(SUBSCRIPTIONS_FILE)
    if not subs:
        print("ℹ️  No subscribed cities. Add some with 'add-city'.")
        return
    print(f"🔄 Updating weather for {len(subs)} cities...\n")
    for city in subs:
        record = fetch_weather(city)
        save_record(record)
        print(f"📍 {record['city']}: {record['temperature']}°C, {record['humidity']}%, {record['condition']}")
        for w in check_threshold(record["temperature"]):
            print(f"   {w}")
    print("\n✅ All cities updated.")


def cmd_history(args):
    records = load_json(RECORDS_FILE)
    filtered = [r for r in records if r["city"] == args.city]
    if args.start_date:
        filtered = [r for r in filtered if r["date"] >= args.start_date]
    if args.end_date:
        filtered = [r for r in filtered if r["date"] <= args.end_date]
    if not filtered:
        print(f"ℹ️  No records found for {args.city}.")
        return
    print(f"📜 Weather history for {args.city}:")
    print(f"   {'Date':<12} {'Temp(°C)':<10} {'Humidity':<10} {'Condition':<15}")
    print(f"   {'-'*12} {'-'*10} {'-'*10} {'-'*15}")
    for r in sorted(filtered, key=lambda x: x["date"]):
        print(f"   {r['date']:<12} {r['temperature']:<10.1f} {r['humidity']:<10} {r['condition']:<15}")


def cmd_stats(args):
    records = load_json(RECORDS_FILE)
    year, month = map(int, args.month.split("-"))
    filtered = [
        r for r in records
        if r["city"] == args.city
        and r["date"].startswith(f"{year:04d}-{month:02d}")
    ]
    if not filtered:
        print(f"ℹ️  No records found for {args.city} in {args.month}.")
        return
    temps = [r["temperature"] for r in filtered]
    print(f"📊 Statistics for {args.city} ({args.month}):")
    print(f"   Average temperature: {sum(temps)/len(temps):.1f}°C")
    print(f"   Highest temperature: {max(temps):.1f}°C")
    print(f"   Lowest temperature:  {min(temps):.1f}°C")
    print(f"   Records count:       {len(filtered)}")


def ascii_chart(data, height=10, width=50):
    if not data:
        return ""
    values = [d[1] for d in data]
    labels = [d[0] for d in data]
    n = len(values)
    vmin, vmax = min(values), max(values)
    if vmin == vmax:
        vmin -= 1
        vmax += 1
    col_pos = []
    for i in range(n):
        if n == 1:
            col_pos.append(width // 2)
        else:
            col_pos.append(int(i * (width - 1) / (n - 1)))
    row_pos = []
    for val in values:
        ratio = (val - vmin) / (vmax - vmin)
        row_pos.append(int((1 - ratio) * (height - 1)))
    grid = [[' ' for _ in range(width)] for _ in range(height)]
    for i in range(n):
        col = col_pos[i]
        row = row_pos[i]
        grid[row][col] = '●'
        if i > 0:
            pc, pr = col_pos[i - 1], row_pos[i - 1]
            cc, cr = col, row
            dc = cc - pc
            dr = cr - pr
            steps = max(abs(dc), abs(dr), 1)
            for s in range(1, steps):
                t = s / steps
                ic = int(round(pc + dc * t))
                ir = int(round(pr + dr * t))
                ic = max(0, min(width - 1, ic))
                ir = max(0, min(height - 1, ir))
                if grid[ir][ic] == ' ':
                    if dr == 0:
                        grid[ir][ic] = '─'
                    elif dc == 0:
                        grid[ir][ic] = '│'
                    elif (dr > 0 and dc > 0) or (dr < 0 and dc < 0):
                        grid[ir][ic] = '╲'
                    else:
                        grid[ir][ic] = '╱'
    chart = []
    for row_idx in range(height):
        y_val = vmax - (vmax - vmin) * row_idx / (height - 1)
        line = ''.join(grid[row_idx])
        chart.append(f" {y_val:>6.1f}°C │ {line}")
    chart.append(f"        └{'─' * width}")
    label_line = "         "
    shown = set()
    if n <= 15:
        step = 1
    else:
        step = max(1, n // 10)
    for i in range(0, n, step):
        c = col_pos[i]
        lbl = labels[i][5:]
        pad = c - (len(label_line) - 9)
        if pad > 0:
            label_line += ' ' * pad + lbl
            shown.add(i)
    if n - 1 not in shown and n > 1:
        c = col_pos[n - 1]
        lbl = labels[n - 1][5:]
        pad = c - (len(label_line) - 9)
        if pad > 0:
            label_line += ' ' * pad + lbl
    chart.append(label_line)
    return "\n".join(chart)


def cmd_trend(args):
    records = load_json(RECORDS_FILE)
    city = args.city
    today = datetime.now().date()
    date_map = {}
    for r in records:
        if r["city"] == city:
            d = r["date"]
            if d not in date_map or r["timestamp"] > date_map[d]["timestamp"]:
                date_map[d] = r
    data_points = []
    for i in range(6, -1, -1):
        d = (today - timedelta(days=i)).strftime("%Y-%m-%d")
        if d in date_map:
            data_points.append((d, date_map[d]["temperature"]))
        else:
            mock = fetch_weather(city)
            mock["date"] = d
            save_record(mock)
            data_points.append((d, mock["temperature"]))
    print(f"📈 7-Day temperature trend for {city}:")
    print()
    print(ascii_chart(data_points))
    print()
    for d, t in data_points:
        print(f"   {d}: {t:.1f}°C")


def cmd_export_csv(args):
    records = load_json(RECORDS_FILE)
    if args.city:
        records = [r for r in records if r["city"] == args.city]
    if not records:
        print("ℹ️  No records to export.")
        return
    with open(args.output, "w", newline="", encoding="utf-8") as fp:
        writer = csv.DictWriter(fp, fieldnames=["date", "city", "temperature", "humidity", "condition", "timestamp"])
        writer.writeheader()
        for r in sorted(records, key=lambda x: (x["city"], x["date"])):
            writer.writerow(r)
    print(f"✅ Exported {len(records)} records to {args.output}")


def cmd_set_threshold(args):
    config = load_json(CONFIG_FILE)
    if args.low is not None:
        config["temp_threshold_low"] = args.low
    if args.high is not None:
        config["temp_threshold_high"] = args.high
    save_json(CONFIG_FILE, config)
    print(f"✅ Thresholds set: Low={config['temp_threshold_low']}°C, High={config['temp_threshold_high']}°C")


def cmd_compare(args):
    records = load_json(RECORDS_FILE)
    date_str = args.date or datetime.now().strftime("%Y-%m-%d")
    city1_records = [r for r in records if r["city"] == args.city1 and r["date"] == date_str]
    city2_records = [r for r in records if r["city"] == args.city2 and r["date"] == date_str]
    for city, recs in [(args.city1, city1_records), (args.city2, city2_records)]:
        if not recs:
            mock = fetch_weather(city)
            mock["date"] = date_str
            save_record(mock)
            if city == args.city1:
                city1_records = [mock]
            else:
                city2_records = [mock]
    r1 = city1_records[-1]
    r2 = city2_records[-1]
    print(f"⚖️  Comparison on {date_str}:")
    print(f"   {'Metric':<15} {args.city1:<15} {args.city2:<15} {'Difference':<15}")
    print(f"   {'-'*15} {'-'*15} {'-'*15} {'-'*15}")
    print(f"   {'Temperature':<15} {r1['temperature']:<15.1f} {r2['temperature']:<15.1f} {abs(r1['temperature']-r2['temperature']):<15.1f}°C")
    print(f"   {'Humidity':<15} {r1['humidity']:<15} {r2['humidity']:<15} {abs(r1['humidity']-r2['humidity']):<15}%")
    print(f"   {'Condition':<15} {r1['condition']:<15} {r2['condition']:<15} {'-':<15}")


def cmd_monthly_report(args):
    records = load_json(RECORDS_FILE)
    year, month = map(int, args.month.split("-"))
    month_str = f"{year:04d}-{month:02d}"
    filtered = [
        r for r in records
        if r["city"] == args.city
        and r["date"].startswith(month_str)
    ]
    last_day = (datetime(year, month + 1, 1) - timedelta(days=1)).day if month < 12 else 31
    for day in range(1, last_day + 1):
        d = f"{year:04d}-{month:02d}-{day:02d}"
        if not any(r["date"] == d for r in filtered):
            mock = fetch_weather(args.city)
            mock["date"] = d
            save_record(mock)
            filtered.append(mock)
    filtered = sorted(filtered, key=lambda x: x["date"])
    temps = [r["temperature"] for r in filtered]
    rainy_days = sum(1 for r in filtered if "rain" in r["condition"].lower())
    snowy_days = sum(1 for r in filtered if "snow" in r["condition"].lower())
    avg_temp = sum(temps) / len(temps)
    print(f"📅 Monthly Weather Report - {args.city} ({month_str})")
    print("=" * 60)
    print(f"   Average temperature: {avg_temp:.1f}°C")
    print(f"   Highest temperature: {max(temps):.1f}°C")
    print(f"   Lowest temperature:  {min(temps):.1f}°C")
    print(f"   Rainy days:          {rainy_days}/{len(filtered)}")
    print(f"   Snowy days:          {snowy_days}/{len(filtered)}")
    print()
    print("   📈 Temperature Change Curve:")
    chart_data = [(r["date"], r["temperature"]) for r in filtered]
    print(ascii_chart(chart_data, height=10, width=60))
    print()
    low_threshold = load_json(CONFIG_FILE).get("temp_threshold_low", 0)
    high_threshold = load_json(CONFIG_FILE).get("temp_threshold_high", 35)
    below_days = sum(1 for t in temps if t < low_threshold)
    above_days = sum(1 for t in temps if t > high_threshold)
    if below_days > 0:
        print(f"   {YELLOW}⚠️  {below_days} day(s) below low threshold ({low_threshold}°C){RESET}")
    if above_days > 0:
        print(f"   {RED}⚠️  {above_days} day(s) above high threshold ({high_threshold}°C){RESET}")
    print()


def cmd_backup(args):
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_file = os.path.join(BACKUP_DIR, f"weather_backup_{timestamp}.zip")
    with zipfile.ZipFile(backup_file, "w", zipfile.ZIP_DEFLATED) as zf:
        for f in [RECORDS_FILE, SUBSCRIPTIONS_FILE, CONFIG_FILE]:
            if os.path.exists(f):
                zf.write(f, os.path.basename(f))
    print(f"✅ Backup created: {backup_file}")


def cmd_restore(args):
    backup_file = args.backup_file
    if not os.path.exists(backup_file):
        print(f"❌ Backup file not found: {backup_file}")
        return
    with zipfile.ZipFile(backup_file, "r") as zf:
        zf.extractall(DATA_DIR)
    print(f"✅ Restored from backup: {backup_file}")


def cmd_list_backups(args):
    backups = sorted([f for f in os.listdir(BACKUP_DIR) if f.endswith(".zip")])
    if not backups:
        print("ℹ️  No backups found.")
        return
    print("📦 Backups:")
    for b in backups:
        path = os.path.join(BACKUP_DIR, b)
        size = os.path.getsize(path)
        print(f"   {b} ({size} bytes)")


def cmd_add_record(args):
    record = {
        "date": args.date or datetime.now().strftime("%Y-%m-%d"),
        "city": args.city,
        "temperature": args.temperature,
        "humidity": args.humidity,
        "condition": args.condition,
        "timestamp": datetime.now().isoformat()
    }
    save_record(record)
    print(f"✅ Added manual record: {record}")
    for w in check_threshold(record["temperature"]):
        print(w)


def cmd_extremes(args):
    records = load_json(RECORDS_FILE)
    if args.city:
        records = [r for r in records if r["city"] == args.city]
    if not records:
        print("ℹ️  No records found.")
        return
    sorted_by_temp = sorted(records, key=lambda x: x["temperature"], reverse=True)
    print(f"🔥 Hottest {'3 days' if not args.city else f'records in {args.city}'}:")
    for i, r in enumerate(sorted_by_temp[:3], 1):
        print(f"   {i}. {r['date']} | {r['city']:<15} {r['temperature']:>6.1f}°C | {r['condition']}")
    print()
    print(f"❄️  Coldest {'3 days' if not args.city else f'records in {args.city}'}:")
    for i, r in enumerate(sorted_by_temp[-3:], 1):
        print(f"   {i}. {r['date']} | {r['city']:<15} {r['temperature']:>6.1f}°C | {r['condition']}")


def main():
    init_storage()
    parser = argparse.ArgumentParser(description="🌤️  Weather Data Recording Tool")
    subparsers = parser.add_subparsers(dest="command", help="Available commands")

    p = subparsers.add_parser("query", help="Query current weather for a city")
    p.add_argument("city", help="City name")
    p.set_defaults(func=cmd_query)

    p = subparsers.add_parser("add-city", help="Add a city to subscriptions")
    p.add_argument("city", help="City name")
    p.set_defaults(func=cmd_add_city)

    p = subparsers.add_parser("remove-city", help="Remove a city from subscriptions")
    p.add_argument("city", help="City name")
    p.set_defaults(func=cmd_remove_city)

    p = subparsers.add_parser("list-cities", help="List subscribed cities")
    p.set_defaults(func=cmd_list_cities)

    p = subparsers.add_parser("update-all", help="Update weather for all subscribed cities")
    p.set_defaults(func=cmd_update_all)

    p = subparsers.add_parser("history", help="View weather history")
    p.add_argument("city", help="City name")
    p.add_argument("--start-date", help="Start date (YYYY-MM-DD)")
    p.add_argument("--end-date", help="End date (YYYY-MM-DD)")
    p.set_defaults(func=cmd_history)

    p = subparsers.add_parser("stats", help="Show monthly statistics")
    p.add_argument("city", help="City name")
    p.add_argument("month", help="Month (YYYY-MM)")
    p.set_defaults(func=cmd_stats)

    p = subparsers.add_parser("trend", help="Show 7-day temperature trend chart")
    p.add_argument("city", help="City name")
    p.set_defaults(func=cmd_trend)

    p = subparsers.add_parser("export-csv", help="Export records to CSV")
    p.add_argument("output", help="Output CSV file path")
    p.add_argument("--city", help="Filter by city")
    p.set_defaults(func=cmd_export_csv)

    p = subparsers.add_parser("set-threshold", help="Set temperature alert thresholds")
    p.add_argument("--low", type=float, help="Low temperature threshold (°C)")
    p.add_argument("--high", type=float, help="High temperature threshold (°C)")
    p.set_defaults(func=cmd_set_threshold)

    p = subparsers.add_parser("compare", help="Compare weather between two cities")
    p.add_argument("city1", help="First city")
    p.add_argument("city2", help="Second city")
    p.add_argument("--date", help="Date (YYYY-MM-DD), default: today")
    p.set_defaults(func=cmd_compare)

    p = subparsers.add_parser("monthly-report", help="Generate monthly weather report")
    p.add_argument("city", help="City name")
    p.add_argument("month", help="Month (YYYY-MM)")
    p.set_defaults(func=cmd_monthly_report)

    p = subparsers.add_parser("backup", help="Backup weather data")
    p.set_defaults(func=cmd_backup)

    p = subparsers.add_parser("restore", help="Restore weather data from backup")
    p.add_argument("backup_file", help="Backup file path")
    p.set_defaults(func=cmd_restore)

    p = subparsers.add_parser("list-backups", help="List all backups")
    p.set_defaults(func=cmd_list_backups)

    p = subparsers.add_parser("add-record", help="Add a weather record from command line")
    p.add_argument("city", help="City name")
    p.add_argument("temperature", type=float, help="Temperature (°C)")
    p.add_argument("humidity", type=int, help="Humidity (%)")
    p.add_argument("condition", help="Weather condition")
    p.add_argument("--date", help="Date (YYYY-MM-DD), default: today")
    p.set_defaults(func=cmd_add_record)

    p = subparsers.add_parser("extremes", help="Show hottest and coldest 3 days")
    p.add_argument("--city", help="Filter by city")
    p.set_defaults(func=cmd_extremes)

    args = parser.parse_args()
    if args.command is None:
        parser.print_help()
        return
    args.func(args)


if __name__ == "__main__":
    main()
