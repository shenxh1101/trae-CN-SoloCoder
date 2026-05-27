from typing import Dict, List
from datetime import datetime, timedelta
import calendar
from models import Account

class Visualization:
    @staticmethod
    def print_asset_curve(account: Account, max_points: int = 50):
        if not account.asset_history:
            print("暂无资产历史数据")
            return

        history = account.asset_history[-max_points:] if len(account.asset_history) > max_points else account.asset_history

        values = [v for _, v in history]
        if not values:
            return

        min_val = min(values)
        max_val = max(values)
        value_range = max_val - min_val if max_val != min_val else 1

        height = 20
        width = len(history)

        grid = [[' ' for _ in range(width)] for _ in range(height)]

        for i, (ts, val) in enumerate(history):
            normalized = (val - min_val) / value_range
            row = height - 1 - int(normalized * (height - 1))
            grid[row][i] = '█'

        print("\n" + "=" * 60)
        print(f"资产曲线 - {account.name}")
        print("=" * 60)

        for row in range(height):
            val_label = max_val - (max_val - min_val) * row / (height - 1)
            line = f"{val_label:10.0f} │"
            for col in range(width):
                line += grid[row][col]
            print(line)

        print(" " * 11 + "└" + "─" * width)

        if len(history) > 0:
            start_time = history[0][0].strftime("%H:%M:%S")
            end_time = history[-1][0].strftime("%H:%M:%S")
            print(" " * 12 + f"{start_time:^{width-10}}{end_time:>10}")

        print(f"\n初始资产: 100000.00 元")
        print(f"当前资产: {values[-1]:.2f} 元")
        total_return = ((values[-1] - 100000) / 100000) * 100
        print(f"总收益率: {total_return:+.2f}%")
        print("=" * 60 + "\n")

    @staticmethod
    def print_calendar_heatmap(account: Account):
        if not account.daily_snapshots:
            print("暂无每日资产快照数据")
            return

        snapshots = sorted(account.daily_snapshots.items())
        if not snapshots:
            return

        first_date = datetime.strptime(snapshots[0][0], "%Y-%m-%d").date()
        last_date = datetime.strptime(snapshots[-1][0], "%Y-%m-%d").date()

        values = [v for _, v in snapshots]
        initial_value = 100000.0
        returns = [(v - initial_value) / initial_value * 100 for v in values]

        max_return = max(max(returns), 0)
        min_return = min(min(returns), 0)

        date_to_return = {date: ret for (date, _), ret in zip(snapshots, returns)}

        print("\n" + "=" * 60)
        print(f"资产变化日历热力图 - {account.name}")
        print("=" * 60)
        print("图例: 深红色<-10%  红色<-5%  粉色<0%  浅绿>0%  绿色>5%  深绿>10%")
        print("-" * 60)

        current_date = first_date.replace(day=1)
        while current_date <= last_date:
            year = current_date.year
            month = current_date.month

            print(f"\n{year}年{month}月")
            print("一  二  三  四  五  六  日")

            cal = calendar.monthcalendar(year, month)

            for week in cal:
                week_str = ""
                for day in week:
                    if day == 0:
                        week_str += "    "
                    else:
                        date_str = f"{year}-{month:02d}-{day:02d}"
                        ret = date_to_return.get(date_str)
                        if ret is None:
                            week_str += "  . "
                        else:
                            color_code = Visualization._get_color_code(ret)
                            week_str += f"{color_code}{day:2d}\033[0m "
                print(week_str)

            current_date = (current_date + timedelta(days=32)).replace(day=1)

        print("\n" + "=" * 60 + "\n")

    @staticmethod
    def _get_color_code(return_val: float) -> str:
        if return_val <= -10:
            return "\033[41m\033[37m"
        elif return_val <= -5:
            return "\033[101m\033[30m"
        elif return_val < 0:
            return "\033[45m\033[37m"
        elif return_val == 0:
            return "\033[47m\033[30m"
        elif return_val < 5:
            return "\033[105m\033[30m"
        elif return_val < 10:
            return "\033[42m\033[37m"
        else:
            return "\033[42m\033[37m\033[1m"

    @staticmethod
    def print_price_history(stock_engine, stock_code: str, max_points: int = 40):
        history = stock_engine.get_price_history(stock_code)
        if not history:
            print("暂无价格数据")
            return

        stock = stock_engine.get_stock(stock_code)
        if not stock:
            return

        history = history[-max_points:] if len(history) > max_points else history
        values = [v for _, v in history]

        min_val = min(values)
        max_val = max(values)
        value_range = max_val - min_val if max_val != min_val else 1

        height = 15
        width = len(history)

        grid = [[' ' for _ in range(width)] for _ in range(height)]

        for i, (ts, val) in enumerate(history):
            normalized = (val - min_val) / value_range
            row = height - 1 - int(normalized * (height - 1))
            grid[row][i] = '█'

        print("\n" + "=" * 60)
        print(f"价格走势图 - {stock.name}({stock.code})")
        print(f"当前价格: {stock.price:.2f} 元  最高: {max_val:.2f} 元  最低: {min_val:.2f} 元")
        print("=" * 60)

        for row in range(height):
            val_label = max_val - (max_val - min_val) * row / (height - 1)
            line = f"{val_label:10.2f} │"
            for col in range(width):
                line += grid[row][col]
            print(line)

        print(" " * 11 + "└" + "─" * width)

        if len(history) > 0:
            start_time = history[0][0].strftime("%H:%M:%S")
            end_time = history[-1][0].strftime("%H:%M:%S")
            print(" " * 12 + f"{start_time:^{width-10}}{end_time:>10}")

        print("=" * 60 + "\n")
