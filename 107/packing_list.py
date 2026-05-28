from typing import List, Dict


class PackingListGenerator:
    def __init__(self):
        self.general_template = [
            "身份证/护照",
            "钱包/现金/银行卡",
            "手机及充电器",
            "充电宝",
            "耳机",
            "洗漱用品（牙刷、牙膏、洗面奶）",
            "毛巾",
            "纸巾/湿巾",
            "雨伞/雨衣",
            "墨镜",
            "防晒霜",
            "常用药品（感冒药、肠胃药、创可贴）",
        ]

        self.climate_items: Dict[str, List[str]] = {
            "tropical": [
                "短袖T恤",
                "短裤",
                "凉鞋/拖鞋",
                "泳衣",
                "遮阳帽",
                "驱蚊液",
                "薄外套（空调房）",
            ],
            "cold": [
                "厚外套/羽绒服",
                "毛衣/保暖内衣",
                "长裤",
                "保暖袜子",
                "围巾",
                "手套",
                "保暖帽",
                "雪地靴",
            ],
            "temperate": [
                "长袖衬衫",
                "薄外套",
                "长裤",
                "运动鞋",
            ],
            "rainy": [
                "雨衣",
                "防水鞋",
                "防水袋",
                "速干衣物",
            ],
            "mountain": [
                "登山鞋",
                "登山杖",
                "冲锋衣",
                "速干衣裤",
                "头灯",
                "保温杯",
            ],
            "beach": [
                "泳衣",
                "沙滩裤",
                "人字拖",
                "沙滩巾",
                "潜水装备",
            ],
        }

        self.city_mapping: Dict[str, List[str]] = {
            "三亚": ["tropical", "beach"],
            "海口": ["tropical", "beach"],
            "西双版纳": ["tropical"],
            "哈尔滨": ["cold"],
            "漠河": ["cold"],
            "长春": ["cold"],
            "沈阳": ["cold"],
            "北京": ["temperate"],
            "上海": ["temperate"],
            "广州": ["tropical"],
            "深圳": ["tropical"],
            "杭州": ["temperate"],
            "成都": ["temperate"],
            "重庆": ["temperate"],
            "西安": ["temperate"],
            "张家界": ["mountain"],
            "黄山": ["mountain"],
            "泰山": ["mountain"],
            "华山": ["mountain"],
            "厦门": ["beach", "temperate"],
            "青岛": ["beach", "temperate"],
            "大连": ["beach", "cold"],
        }

    def get_climate_types(self, destination: str) -> List[str]:
        for city, climates in self.city_mapping.items():
            if city in destination:
                return climates
        return ["temperate"]

    def generate_packing_list(self, destination: str) -> List[str]:
        climate_types = self.get_climate_types(destination)
        packing_list = self.general_template.copy()

        for climate in climate_types:
            if climate in self.climate_items:
                packing_list.extend(self.climate_items[climate])

        return list(dict.fromkeys(packing_list))

    def get_template(self) -> List[str]:
        return self.general_template.copy()

    def add_to_template(self, item: str) -> None:
        if item not in self.general_template:
            self.general_template.append(item)

    def remove_from_template(self, item: str) -> bool:
        if item in self.general_template:
            self.general_template.remove(item)
            return True
        return False

    def add_climate_items(self, climate: str, items: List[str]) -> None:
        if climate not in self.climate_items:
            self.climate_items[climate] = []
        for item in items:
            if item not in self.climate_items[climate]:
                self.climate_items[climate].append(item)
