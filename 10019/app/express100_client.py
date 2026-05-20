import random
from datetime import datetime, timedelta
from typing import Dict, List


class Express100MockClient:
    COURIER_MAP = {
        "sf": "顺丰速运",
        "yt": "圆通速递",
        "zt": "中通快递",
        "yd": "韵达快递",
        "ems": "EMS",
        "jd": "京东物流",
        "sto": "申通快递",
        "db": "德邦快递",
    }

    STATUS_FLOW = [
        ("pending", "快递已揽收"),
        ("in_transit", "快件在运输途中"),
        ("in_transit", "快件到达【{city}】转运中心"),
        ("in_transit", "快件离开【{city}】，已发往【{next_city}】"),
        ("out_for_delivery", "快件正在派送中，派件员：{name}，电话：{phone}"),
        ("signed", "快件已签收，签收人：{signer}"),
    ]

    ABNORMAL_STATUSES = [
        ("abnormal", "快件异常：地址不详，正在联系收件人"),
        ("abnormal", "快件异常：收件人电话无法接通"),
        ("abnormal", "快件异常：天气原因延误"),
    ]

    CITIES = ["北京", "上海", "广州", "深圳", "杭州", "成都", "武汉", "西安", "南京", "重庆"]
    NAMES = ["张三", "李四", "王五", "赵六", "陈七", "刘八"]

    @classmethod
    def _generate_courier_name(cls, courier_code: str) -> str:
        return cls.COURIER_MAP.get(courier_code.lower(), "其他快递")

    @classmethod
    def _generate_phone(cls) -> str:
        return f"138{random.randint(10000000, 99999999)}"

    @classmethod
    def _generate_tracking_history(cls, tracking_number: str, courier_code: str) -> List[Dict]:
        random.seed(hash(tracking_number) % 1000000)
        
        is_abnormal = random.random() < 0.1
        history = []
        now = datetime.now()
        
        courier_name = cls._generate_courier_name(courier_code)
        total_steps = len(cls.STATUS_FLOW)
        
        if is_abnormal:
            abnormal_step = random.randint(2, total_steps - 1)
        else:
            abnormal_step = -1
        
        current_city = random.choice(cls.CITIES)
        time_offset = total_steps * 12
        
        for i, (status, desc_template) in enumerate(cls.STATUS_FLOW):
            event_time = now - timedelta(hours=time_offset)
            time_offset -= 12
            
            if i == abnormal_step:
                abnormal_status, abnormal_desc = random.choice(cls.ABNORMAL_STATUSES)
                history.append({
                    "time": event_time.strftime("%Y-%m-%d %H:%M:%S"),
                    "status": abnormal_status,
                    "description": abnormal_desc,
                    "location": random.choice(cls.CITIES),
                })
                time_offset += 6
                event_time = now - timedelta(hours=time_offset)
            
            city = random.choice(cls.CITIES)
            next_city = random.choice([c for c in cls.CITIES if c != city])
            name = random.choice(cls.NAMES)
            phone = cls._generate_phone()
            signer = random.choice(cls.NAMES)
            
            description = desc_template.format(
                city=city,
                next_city=next_city,
                name=name,
                phone=phone,
                signer=signer
            )
            
            if i == 0:
                description = f"【{courier_name}】{description}"
            
            history.append({
                "time": event_time.strftime("%Y-%m-%d %H:%M:%S"),
                "status": status,
                "description": description,
                "location": city if "到达" in description or "离开" in description else None,
            })
        
        history.sort(key=lambda x: x["time"], reverse=True)
        return history

    @classmethod
    async def get_tracking_info(cls, tracking_number: str, courier_code: str) -> Dict:
        history = cls._generate_tracking_history(tracking_number, courier_code)
        
        latest = history[0] if history else {
            "status": "pending",
            "description": "暂无物流信息",
            "time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        }
        
        return {
            "message": "ok",
            "nu": tracking_number,
            "com": courier_code,
            "company": cls._generate_courier_name(courier_code),
            "status": latest["status"],
            "latest_status": latest["description"],
            "latest_time": latest["time"],
            "data": history,
        }

    @classmethod
    async def batch_query(cls, tracking_list: List[Dict]) -> List[Dict]:
        results = []
        for item in tracking_list:
            result = await cls.get_tracking_info(
                item["tracking_number"],
                item["courier_code"]
            )
            results.append(result)
        return results
