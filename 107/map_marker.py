from typing import List
from urllib.parse import quote


class MapMarker:
    @staticmethod
    def generate_baidu_map_link(locations: List[str]) -> str:
        if not locations:
            return ""

        markers = "|".join([f"name:{quote(loc)}" for loc in locations])
        return f"https://api.map.baidu.com/marker?location={quote(locations[0])}&title={quote(locations[0])}&content={quote(' | '.join(locations))}&output=html"

    @staticmethod
    def generate_amap_link(locations: List[str]) -> str:
        if not locations:
            return ""

        markers = "|".join(
            [f"{quote(loc)},,{quote(loc)}" for loc in locations]
        )
        return f"https://uri.amap.com/marker?markers={markers}&src=travelplanner"

    @staticmethod
    def generate_search_links(destination: str) -> dict:
        return {
            "百度地图": f"https://map.baidu.com/search/{quote(destination)}",
            "高德地图": f"https://ditu.amap.com/search?query={quote(destination)}",
            "Google地图": f"https://www.google.com/maps/search/{quote(destination)}",
        }

    @classmethod
    def print_map_links(cls, locations: List[str], destination: str = "") -> None:
        print("\n🗺️ 地图链接")
        print("=" * 60)

        if destination:
            print(f"\n目的地 '{destination}' 搜索链接:")
            search_links = cls.generate_search_links(destination)
            for name, link in search_links.items():
                print(f"  {name}: {link}")

        if locations:
            print(f"\n行程地点标记:")
            print(f"  百度地图: {cls.generate_baidu_map_link(locations[:5])}")
            print(f"  高德地图: {cls.generate_amap_link(locations[:5])}")
            print("  (最多显示5个地点)")

        if locations:
            print(f"\n行程地点列表:")
            for i, loc in enumerate(locations, 1):
                print(f"  {i}. {loc}")
        print("=" * 60)
