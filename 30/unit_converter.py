#!/usr/bin/env python3
import argparse
import json
import os
import sys
import re
from difflib import get_close_matches
from pathlib import Path


CONFIG_FILE = Path.home() / ".unit_converter_config.json"

UNITS = {
    "length": {
        "m": {"name": "米", "factor": 1.0},
        "km": {"name": "千米", "factor": 1000.0},
        "mi": {"name": "英里", "factor": 1609.344},
        "ft": {"name": "英尺", "factor": 0.3048},
        "in": {"name": "英寸", "factor": 0.0254},
        "cm": {"name": "厘米", "factor": 0.01},
        "mm": {"name": "毫米", "factor": 0.001},
        "yd": {"name": "码", "factor": 0.9144},
        "nm": {"name": "海里", "factor": 1852.0},
        "ly": {"name": "光年", "factor": 9.461e15},
    },
    "mass": {
        "kg": {"name": "千克", "factor": 1.0},
        "g": {"name": "克", "factor": 0.001},
        "lb": {"name": "磅", "factor": 0.453592},
        "oz": {"name": "盎司", "factor": 0.0283495},
        "t": {"name": "吨", "factor": 1000.0},
        "mg": {"name": "毫克", "factor": 1e-6},
        "st": {"name": "英石", "factor": 6.35029},
        "ct": {"name": "克拉", "factor": 0.0002},
    },
    "temperature": {
        "c": {"name": "摄氏度"},
        "f": {"name": "华氏度"},
        "k": {"name": "开尔文"},
        "r": {"name": "兰氏度"},
        "re": {"name": "列氏度"},
    },
    "area": {
        "m2": {"name": "平方米", "factor": 1.0},
        "km2": {"name": "平方千米", "factor": 1e6},
        "ha": {"name": "公顷", "factor": 10000.0},
        "acre": {"name": "英亩", "factor": 4046.86},
        "ft2": {"name": "平方英尺", "factor": 0.092903},
        "in2": {"name": "平方英寸", "factor": 0.00064516},
        "cm2": {"name": "平方厘米", "factor": 0.0001},
        "mi2": {"name": "平方英里", "factor": 2.59e6},
    },
    "volume": {
        "m3": {"name": "立方米", "factor": 1.0},
        "l": {"name": "升", "factor": 0.001},
        "ml": {"name": "毫升", "factor": 1e-6},
        "gal": {"name": "加仑", "factor": 0.00378541},
        "qt": {"name": "夸脱", "factor": 0.000946353},
        "pt": {"name": "品脱", "factor": 0.000473176},
        "cup": {"name": "杯", "factor": 0.000236588},
        "ft3": {"name": "立方英尺", "factor": 0.0283168},
        "in3": {"name": "立方英寸", "factor": 1.63871e-5},
    },
    "speed": {
        "m/s": {"name": "米每秒", "factor": 1.0},
        "km/h": {"name": "千米每小时", "factor": 0.277778},
        "mph": {"name": "英里每小时", "factor": 0.44704},
        "knot": {"name": "节", "factor": 0.514444},
        "ft/s": {"name": "英尺每秒", "factor": 0.3048},
        "mach": {"name": "马赫", "factor": 340.29},
        "light": {"name": "光速", "factor": 299792458.0},
    },
    "time": {
        "s": {"name": "秒", "factor": 1.0},
        "min": {"name": "分钟", "factor": 60.0},
        "h": {"name": "小时", "factor": 3600.0},
        "d": {"name": "天", "factor": 86400.0},
        "wk": {"name": "周", "factor": 604800.0},
        "mo": {"name": "月", "factor": 2592000.0},
        "yr": {"name": "年", "factor": 31536000.0},
        "ms": {"name": "毫秒", "factor": 0.001},
        "us": {"name": "微秒", "factor": 1e-6},
    },
    "energy": {
        "j": {"name": "焦耳", "factor": 1.0},
        "kj": {"name": "千焦", "factor": 1000.0},
        "cal": {"name": "卡路里", "factor": 4.184},
        "kcal": {"name": "千卡", "factor": 4184.0},
        "wh": {"name": "瓦时", "factor": 3600.0},
        "kwh": {"name": "千瓦时", "factor": 3.6e6},
        "ev": {"name": "电子伏", "factor": 1.60218e-19},
        "btu": {"name": "英热单位", "factor": 1055.06},
    },
    "power": {
        "w": {"name": "瓦特", "factor": 1.0},
        "kw": {"name": "千瓦", "factor": 1000.0},
        "hp": {"name": "马力", "factor": 745.7},
        "ps": {"name": "公制马力", "factor": 735.499},
        "btu/h": {"name": "英热单位每小时", "factor": 0.293071},
        "mw": {"name": "兆瓦", "factor": 1e6},
        "gw": {"name": "吉瓦", "factor": 1e9},
    },
    "pressure": {
        "pa": {"name": "帕斯卡", "factor": 1.0},
        "kpa": {"name": "千帕", "factor": 1000.0},
        "bar": {"name": "巴", "factor": 1e5},
        "atm": {"name": "标准大气压", "factor": 101325.0},
        "psi": {"name": "磅每平方英寸", "factor": 6894.76},
        "mmhg": {"name": "毫米汞柱", "factor": 133.322},
        "inhg": {"name": "英寸汞柱", "factor": 3386.39},
        "torr": {"name": "托", "factor": 133.322},
    },
}

ALL_UNITS = {}
UNIT_CATEGORY = {}
for category, units in UNITS.items():
    for unit_symbol, unit_info in units.items():
        ALL_UNITS[unit_symbol] = unit_info
        UNIT_CATEGORY[unit_symbol] = category


def temp_convert(value, from_unit, to_unit):
    from_unit = from_unit.lower()
    to_unit = to_unit.lower()
    
    celsius = None
    if from_unit == "c":
        celsius = value
    elif from_unit == "f":
        celsius = (value - 32) * 5 / 9
    elif from_unit == "k":
        celsius = value - 273.15
    elif from_unit == "r":
        celsius = (value - 491.67) * 5 / 9
    elif from_unit == "re":
        celsius = value * 5 / 4
    
    if celsius is None:
        raise ValueError(f"不支持的温度单位: {from_unit}")
    
    if to_unit == "c":
        return celsius
    elif to_unit == "f":
        return celsius * 9 / 5 + 32
    elif to_unit == "k":
        return celsius + 273.15
    elif to_unit == "r":
        return celsius * 9 / 5 + 491.67
    elif to_unit == "re":
        return celsius * 4 / 5
    
    raise ValueError(f"不支持的温度单位: {to_unit}")


def convert(value, from_unit, to_unit):
    original_from = from_unit
    original_to = to_unit
    from_unit = from_unit.lower()
    to_unit = to_unit.lower()
    
    if from_unit not in UNIT_CATEGORY:
        from_unit = suggest_unit(from_unit)
    if to_unit not in UNIT_CATEGORY:
        to_unit = suggest_unit(to_unit)
    
    return from_unit, to_unit, _do_convert(value, from_unit, to_unit)


def _do_convert(value, from_unit, to_unit):
    from_cat = UNIT_CATEGORY.get(from_unit)
    to_cat = UNIT_CATEGORY.get(to_unit)
    
    if not from_cat or not to_cat:
        raise ValueError(f"无法识别的单位: {from_unit} 或 {to_unit}")
    
    if from_cat != to_cat:
        raise ValueError(f"单位类别不匹配: {from_unit}({from_cat}) -> {to_unit}({to_cat})")
    
    if from_cat == "temperature":
        return temp_convert(value, from_unit, to_unit)
    
    from_factor = UNITS[from_cat][from_unit]["factor"]
    to_factor = UNITS[to_cat][to_unit]["factor"]
    base_value = value * from_factor
    return base_value / to_factor


def suggest_unit(input_str):
    input_str = input_str.lower()
    all_symbols = list(ALL_UNITS.keys())
    
    if input_str in all_symbols:
        return input_str
    
    english_names = {
        "meter": "m", "meters": "m", "metre": "m", "metres": "m",
        "kilometer": "km", "kilometers": "km", "kilometre": "km", "kilometres": "km",
        "mile": "mi", "miles": "mi",
        "foot": "ft", "feet": "ft",
        "inch": "in", "inches": "in",
        "centimeter": "cm", "centimeters": "cm", "centimetre": "cm", "centimetres": "cm",
        "millimeter": "mm", "millimeters": "mm", "millimetre": "mm", "millimetres": "mm",
        "yard": "yd", "yards": "yd",
        "kilogram": "kg", "kilograms": "kg",
        "gram": "g", "grams": "g",
        "pound": "lb", "pounds": "lb",
        "ounce": "oz", "ounces": "oz",
        "ton": "t", "tons": "t", "tonne": "t", "tonnes": "t",
        "celsius": "c", "centigrade": "c",
        "fahrenheit": "f",
        "kelvin": "k",
        "rankine": "r",
        "reaumur": "re", "réaumur": "re",
        "liter": "l", "liters": "l", "litre": "l", "litres": "l",
        "gallon": "gal", "gallons": "gal",
        "quart": "qt", "quarts": "qt",
        "pint": "pt", "pints": "pt",
        "atmosphere": "atm", "atmospheres": "atm",
        "bar": "bar", "bars": "bar",
        "pascal": "pa", "pascals": "pa",
        "watt": "w", "watts": "w",
        "kilowatt": "kw", "kilowatts": "kw",
        "horsepower": "hp",
        "joule": "j", "joules": "j",
        "calorie": "cal", "calories": "cal",
        "hour": "h", "hours": "h",
        "minute": "min", "minutes": "min",
        "second": "s", "seconds": "s",
        "day": "d", "days": "d",
        "week": "wk", "weeks": "wk",
        "month": "mo", "months": "mo",
        "year": "yr", "years": "yr",
    }
    
    if input_str in english_names:
        matched = english_names[input_str]
        print(f"提示: '{input_str}' 匹配英文名称 -> '{matched}'")
        return matched
    
    prefix_matches = [s for s in all_symbols if s.startswith(input_str)]
    if prefix_matches:
        print(f"提示: '{input_str}' 匹配前缀 '{prefix_matches[0]}'")
        return prefix_matches[0]
    
    contains_matches = [s for s in all_symbols if input_str in s]
    if contains_matches:
        print(f"提示: '{input_str}' 包含于 '{contains_matches[0]}'")
        return contains_matches[0]
    
    suffix_matches = [s for s in all_symbols if s.endswith(input_str)]
    if suffix_matches:
        print(f"提示: '{input_str}' 匹配后缀 '{suffix_matches[0]}'")
        return suffix_matches[0]
    
    for en_name, symbol in english_names.items():
        if input_str in en_name or en_name in input_str:
            print(f"提示: '{input_str}' 匹配英文 '{en_name}' -> '{symbol}'")
            return symbol
    
    matches = get_close_matches(input_str, all_symbols, n=5, cutoff=0.4)
    if matches:
        for m in matches:
            if UNIT_CATEGORY[m] == "length" and "mi" in m:
                print(f"提示: '{input_str}' 模糊匹配 '{m}'")
                return m
        print(f"提示: '{input_str}' 模糊匹配 '{matches[0]}'")
        return matches[0]
    
    for symbol, info in ALL_UNITS.items():
        name = info["name"]
        if input_str in name or name in input_str:
            print(f"提示: '{input_str}' 匹配中文名称 '{name}' -> '{symbol}'")
            return symbol
    
    chinese_prefix = {
        "千": "k", "米": "m", "厘": "c", "毫": "m", "公": "",
        "英": "", "华": "f", "摄": "c", "开": "k",
        "公里": "km", "千米": "km", "公斤": "kg",
    }
    for zh, en in chinese_prefix.items():
        if input_str.startswith(zh) and en:
            for s in all_symbols:
                if s.startswith(en):
                    print(f"提示: '{input_str}' 中文前缀匹配 '{s}'")
                    return s
    
    raise ValueError(f"未找到匹配的单位: {input_str}")


def format_result(value, sig_digits=None, scientific=False):
    if sig_digits is not None:
        if scientific:
            return f"{value:.{sig_digits}e}"
        return f"{value:.{sig_digits}g}"
    if scientific:
        return f"{value:e}"
    return f"{value:g}"


class UnitConverter:
    def __init__(self):
        self.aliases = {}
        self.history = []
        self.last_result = None
        self.sig_digits = None
        self.scientific = False
        self.load_config()
    
    def load_config(self):
        if CONFIG_FILE.exists():
            try:
                with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                    config = json.load(f)
                    self.aliases = config.get("aliases", {})
                    self.history = config.get("history", [])
                    self.sig_digits = config.get("sig_digits")
                    self.scientific = config.get("scientific", False)
            except Exception as e:
                print(f"警告: 加载配置失败: {e}")
    
    def save_config(self):
        try:
            config = {
                "aliases": self.aliases,
                "history": self.history[-50:],
                "sig_digits": self.sig_digits,
                "scientific": self.scientific,
            }
            with open(CONFIG_FILE, "w", encoding="utf-8") as f:
                json.dump(config, f, ensure_ascii=False, indent=2)
        except Exception as e:
            print(f"警告: 保存配置失败: {e}")
    
    def add_to_history(self, value, from_unit, to_unit, result):
        record = {
            "value": value,
            "from_unit": from_unit,
            "to_unit": to_unit,
            "result": result,
        }
        self.history.append(record)
        if len(self.history) > 50:
            self.history = self.history[-50:]
        self.last_result = record
        self.save_config()
    
    def run_conversion(self, value, from_unit, to_unit):
        from_unit, to_unit, result = convert(value, from_unit, to_unit)
        formatted = format_result(result, self.sig_digits, self.scientific)
        
        from_name = ALL_UNITS.get(from_unit.lower(), {}).get("name", from_unit)
        to_name = ALL_UNITS.get(to_unit.lower(), {}).get("name", to_unit)
        
        output = f"{value} {from_unit}({from_name}) = {formatted} {to_unit}({to_name})"
        print(output)
        
        self.add_to_history(value, from_unit, to_unit, result)
        return result
    
    def parse_input(self, input_str):
        input_str = input_str.strip()
        
        if input_str.startswith("!") and self.last_result:
            value = self.last_result["result"]
            from_unit = self.last_result["to_unit"]
            to_unit = self.last_result["from_unit"]
            print(f"反向换算: {value} {from_unit} -> {to_unit}")
            return self.run_conversion(value, from_unit, to_unit)
        
        if input_str.lower() == "rerun" and self.history:
            last = self.history[-1]
            print(f"重新执行: {last['value']} {last['from_unit']} -> {last['to_unit']}")
            return self.run_conversion(last["value"], last["from_unit"], last["to_unit"])
        
        if re.match(r"^rerun\s+\d+$", input_str.lower()):
            idx = int(input_str.lower().split()[1]) - 1
            if 0 <= idx < len(self.history):
                record = self.history[idx]
                print(f"重新执行第{idx+1}条: {record['value']} {record['from_unit']} -> {record['to_unit']}")
                return self.run_conversion(record["value"], record["from_unit"], record["to_unit"])
            else:
                print(f"错误: 历史记录索引超出范围 (共有{len(self.history)}条记录)")
                return None
        
        parts = input_str.split()
        if len(parts) == 2 and parts[0].lower() in self.aliases:
            alias = self.aliases[parts[0].lower()]
            try:
                value = float(parts[1])
                return self.run_conversion(value, alias["from"], alias["to"])
            except ValueError:
                print(f"错误: 无效的数值 '{parts[1]}'")
                return None
        
        if len(parts) == 3:
            try:
                value = float(parts[0])
                from_unit = parts[1]
                to_unit = parts[2]
                return self.run_conversion(value, from_unit, to_unit)
            except ValueError as e:
                print(f"错误: {e}")
                return None
        
        print("错误: 输入格式不正确。使用: <数值> <原单位> <目标单位> 或 <别名> <数值>")
        return None
    
    def batch_convert(self, input_file, output_file):
        try:
            with open(input_file, "r", encoding="utf-8") as f:
                lines = f.readlines()
        except Exception as e:
            print(f"错误: 无法读取输入文件: {e}")
            return
        
        results = []
        for i, line in enumerate(lines, 1):
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            
            parts = line.split()
            if len(parts) == 3:
                try:
                    value = float(parts[0])
                    from_unit = parts[1]
                    to_unit = parts[2]
                    from_unit, to_unit, result = convert(value, from_unit, to_unit)
                    formatted = format_result(result, self.sig_digits, self.scientific)
                    results.append(f"{value} {from_unit} {to_unit} = {formatted} {to_unit}")
                    self.add_to_history(value, from_unit, to_unit, result)
                except Exception as e:
                    results.append(f"{line} # 错误: {e}")
            elif len(parts) == 2 and parts[0].lower() in self.aliases:
                try:
                    alias = self.aliases[parts[0].lower()]
                    value = float(parts[1])
                    from_u, to_u, result = convert(value, alias["from"], alias["to"])
                    formatted = format_result(result, self.sig_digits, self.scientific)
                    results.append(f"{parts[0]} {value} = {formatted} {to_u}")
                    self.add_to_history(value, from_u, to_u, result)
                except Exception as e:
                    results.append(f"{line} # 错误: {e}")
            else:
                results.append(f"{line} # 错误: 格式不正确")
        
        try:
            with open(output_file, "w", encoding="utf-8") as f:
                f.write("\n".join(results) + "\n")
            print(f"批量换算完成，结果已保存到 {output_file}")
        except Exception as e:
            print(f"错误: 无法写入输出文件: {e}")
    
    def save_alias(self, alias_name, from_unit, to_unit):
        alias_name = alias_name.lower()
        self.aliases[alias_name] = {"from": from_unit, "to": to_unit}
        self.save_config()
        print(f"别名已保存: {alias_name} = {from_unit} -> {to_unit}")
    
    def remove_alias(self, alias_name):
        alias_name = alias_name.lower()
        if alias_name in self.aliases:
            del self.aliases[alias_name]
            self.save_config()
            print(f"别名已删除: {alias_name}")
        else:
            print(f"错误: 别名不存在: {alias_name}")
    
    def list_aliases(self):
        if not self.aliases:
            print("暂无保存的别名")
            return
        print("已保存的别名:")
        for name, info in sorted(self.aliases.items()):
            print(f"  {name}: {info['from']} -> {info['to']}")
    
    def show_history(self, n=None):
        if not self.history:
            print("暂无换算历史")
            return
        
        items = self.history[-n:] if n else self.history
        start_idx = len(self.history) - len(items) + 1
        
        print(f"换算历史 (最近{len(self.history)}条):")
        for i, record in enumerate(items, start_idx):
            from_name = ALL_UNITS.get(record["from_unit"].lower(), {}).get("name", "")
            to_name = ALL_UNITS.get(record["to_unit"].lower(), {}).get("name", "")
            formatted = format_result(record["result"], self.sig_digits, self.scientific)
            print(f"  [{i}] {record['value']} {record['from_unit']}({from_name}) = {formatted} {record['to_unit']}({to_name})")
    
    def generate_table(self, category=None):
        categories = [category] if category else UNITS.keys()
        
        for cat in categories:
            if cat not in UNITS:
                print(f"错误: 未知类别 '{cat}'")
                continue
            
            units = UNITS[cat]
            unit_list = sorted(units.keys())
            
            print(f"\n{'='*60}")
            print(f"{cat.upper()} - {get_category_name(cat)} 换算表")
            print(f"{'='*60}")
            
            header = " " * 8 + "".join(f"{u:>10}" for u in unit_list)
            print(header)
            print("-" * len(header))
            
            for from_u in unit_list:
                row = f"{from_u:>7} "
                for to_u in unit_list:
                    if cat == "temperature":
                        val = temp_convert(1.0, from_u, to_u)
                    else:
                        from_f = units[from_u]["factor"]
                        to_f = units[to_u]["factor"]
                        val = from_f / to_f
                    row += f"{val:>10.4g}"
                print(row)
            print()
    
    def set_precision(self, sig_digits=None, scientific=None):
        if sig_digits is not None:
            self.sig_digits = sig_digits
            print(f"有效数字位数已设置为: {sig_digits}")
        if scientific is not None:
            self.scientific = scientific
            print(f"科学计数法已{'开启' if scientific else '关闭'}")
        self.save_config()
    
    def interactive_mode(self):
        print("\n=== 交互式单位换算模式 ===")
        print("输入 'help' 查看帮助, 'q' 或 'exit' 退出")
        print("格式: <数值> <原单位> <目标单位> 或 <别名> <数值>")
        print("其他命令: history, aliases, ! (反向), rerun, rerun N")
        print("=" * 40)
        
        while True:
            try:
                user_input = input("\n[换算] ").strip()
            except (EOFError, KeyboardInterrupt):
                print("\n退出交互式模式")
                break
            
            if not user_input:
                continue
            
            cmd = user_input.lower()
            
            if cmd in ["q", "exit", "quit"]:
                print("退出交互式模式")
                break
            
            if cmd == "help":
                self._show_help()
                continue
            
            if cmd == "history":
                self.show_history(10)
                continue
            
            if cmd == "aliases":
                self.list_aliases()
                continue
            
            if cmd.startswith("table"):
                parts = cmd.split()
                cat = parts[1] if len(parts) > 1 else None
                self.generate_table(cat)
                continue
            
            if cmd.startswith("precision"):
                parts = cmd.split()
                if len(parts) >= 2:
                    try:
                        self.set_precision(sig_digits=int(parts[1]))
                    except ValueError:
                        print("错误: 有效数字必须是整数")
                else:
                    self.set_precision(sig_digits=None)
                continue
            
            if cmd.startswith("sci"):
                parts = cmd.split()
                if len(parts) >= 2:
                    self.set_precision(scientific=parts[1].lower() in ["on", "1", "true"])
                else:
                    self.set_precision(scientific=not self.scientific)
                continue
            
            if cmd.startswith("alias"):
                parts = user_input.split()
                if len(parts) == 4 and parts[1].lower() == "save":
                    self.save_alias(parts[2], parts[3].split("2")[0], parts[3].split("2")[1])
                elif len(parts) == 3 and parts[1].lower() == "rm":
                    self.remove_alias(parts[2])
                elif len(parts) == 2 and parts[1].lower() == "list":
                    self.list_aliases()
                else:
                    print("用法: alias save <名称> <原单位>2<目标单位> | alias rm <名称> | alias list")
                continue
            
            self.parse_input(user_input)
    
    def _show_help(self):
        help_text = """
可用命令:
  换算: <数值> <原单位> <目标单位>    例如: 100 km mi
        <别名> <数值>                例如: m2ft 10
  !                                 反向换算上次结果
  rerun [N]                         重新执行上次/第N次换算
  history [N]                       显示最近N条历史记录
  aliases                           列出所有别名
  alias save <名称> <from>2<to>     保存别名 (如: alias save m2ft m2ft)
  alias rm <名称>                   删除别名
  table [类别]                      显示换算表 (类别: length, mass, temp, ...)
  precision <N>                     设置有效数字位数 (N=0 关闭)
  sci [on|off]                      切换科学计数法
  help                              显示此帮助
  q/exit/quit                       退出
        """
        print(help_text)


def get_category_name(category):
    names = {
        "length": "长度",
        "mass": "质量",
        "temperature": "温度",
        "area": "面积",
        "volume": "体积",
        "speed": "速度",
        "time": "时间",
        "energy": "能量",
        "power": "功率",
        "pressure": "压力",
    }
    return names.get(category, category)


def main():
    parser = argparse.ArgumentParser(description="多功能单位换算工具")
    parser.add_argument("values", nargs="*", help="换算参数: <数值> <原单位> <目标单位>")
    parser.add_argument("-i", "--interactive", action="store_true", help="进入交互式模式")
    parser.add_argument("-b", "--batch", nargs=2, metavar=("INPUT", "OUTPUT"), help="批量换算: 输入文件 输出文件")
    parser.add_argument("--table", nargs="?", const="all", metavar="CATEGORY", help="显示换算表,可选指定类别")
    parser.add_argument("--alias", nargs="+", help="别名操作: save <名称> <from>2<to> | rm <名称> | list")
    parser.add_argument("--history", nargs="?", const=10, type=int, metavar="N", help="显示最近N条历史记录")
    parser.add_argument("--precision", type=int, metavar="N", help="设置有效数字位数")
    parser.add_argument("--scientific", action="store_true", help="使用科学计数法")
    parser.add_argument("--no-scientific", action="store_true", help="不使用科学计数法")
    parser.add_argument("--list-categories", action="store_true", help="列出所有支持的单位类别")
    parser.add_argument("--list-units", metavar="CATEGORY", help="列出指定类别的所有单位")
    
    args = parser.parse_args()
    converter = UnitConverter()
    
    if args.list_categories:
        print("支持的单位类别:")
        for cat in UNITS:
            print(f"  {cat} ({get_category_name(cat)}): {len(UNITS[cat])}种单位")
        return
    
    if args.list_units:
        cat = args.list_units.lower()
        if cat not in UNITS:
            print(f"错误: 未知类别 '{cat}'")
            return
        print(f"{cat} ({get_category_name(cat)}) 的单位:")
        for symbol, info in sorted(UNITS[cat].items()):
            print(f"  {symbol}: {info['name']}")
        return
    
    if args.precision is not None or args.scientific or args.no_scientific:
        sig_digits = None if args.precision == 0 else args.precision
        scientific = None
        if args.scientific:
            scientific = True
        elif args.no_scientific:
            scientific = False
        converter.set_precision(sig_digits=sig_digits, scientific=scientific)
    
    if args.history is not None:
        converter.show_history(args.history)
        return
    
    if args.alias:
        op = args.alias[0].lower()
        if op == "save" and len(args.alias) == 3:
            parts = args.alias[2].split("2")
            if len(parts) == 2:
                converter.save_alias(args.alias[1], parts[0], parts[1])
            else:
                print("错误: 单位格式应为 <from>2<to>, 如 m2ft")
        elif op == "rm" and len(args.alias) == 2:
            converter.remove_alias(args.alias[1])
        elif op == "list":
            converter.list_aliases()
        else:
            print("用法: --alias save <名称> <from>2<to> | --alias rm <名称> | --alias list")
        return
    
    if args.table:
        if args.table == "all":
            converter.generate_table()
        else:
            converter.generate_table(args.table.lower())
        return
    
    if args.batch:
        converter.batch_convert(args.batch[0], args.batch[1])
        return
    
    if args.interactive:
        converter.interactive_mode()
        return
    
    if args.values:
        converter.parse_input(" ".join(args.values))
        return
    
    parser.print_help()
    print("\n示例:")
    print("  单位换算: python unit_converter.py 100 km mi")
    print("  交互式:   python unit_converter.py -i")
    print("  批量:     python unit_converter.py -b input.txt output.txt")
    print("  换算表:   python unit_converter.py --table length")
    print("  存别名:   python unit_converter.py --alias save m2ft m2ft")
    print("  用别名:   python unit_converter.py m2ft 10")


if __name__ == "__main__":
    main()
