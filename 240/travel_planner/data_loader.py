import json
import os
from typing import List, Dict, Any, Optional
from .models import Attraction, Restaurant


DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")


class DataLoader:
    def __init__(self, data_dir: str = DATA_DIR):
        self.data_dir = data_dir
        self.attractions: Dict[str, List[Attraction]] = {}
        self.restaurants: Dict[str, List[Restaurant]] = {}
        self.holidays: Dict[str, Any] = {}
        self.weather: Dict[str, Any] = {}
        self._load_all_data()

    def _load_json_file(self, filename: str) -> Any:
        filepath = os.path.join(self.data_dir, filename)
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                return json.load(f)
        except FileNotFoundError:
            return {}
        except json.JSONDecodeError:
            return {}

    def _load_all_data(self) -> None:
        attractions_data = self._load_json_file("attractions.json")
        for city, attractions in attractions_data.items():
            self.attractions[city] = [Attraction(**a) for a in attractions]

        restaurants_data = self._load_json_file("restaurants.json")
        for city, restaurants in restaurants_data.items():
            self.restaurants[city] = [Restaurant(**r) for r in restaurants]

        self.holidays = self._load_json_file("holidays.json")
        self.weather = self._load_json_file("weather.json")

    def get_attractions_by_city(self, city: str) -> List[Attraction]:
        return self.attractions.get(city, [])

    def get_attractions_by_category(self, city: str, category: str) -> List[Attraction]:
        attractions = self.get_attractions_by_city(city)
        return [a for a in attractions if a.category == category]

    def get_top_rated_attractions(self, city: str, limit: int = 5) -> List[Attraction]:
        attractions = self.get_attractions_by_city(city)
        return sorted(attractions, key=lambda x: x.rating, reverse=True)[:limit]

    def get_restaurants_by_city(self, city: str) -> List[Restaurant]:
        return self.restaurants.get(city, [])

    def get_restaurants_by_cuisine(self, city: str, cuisine: str) -> List[Restaurant]:
        restaurants = self.get_restaurants_by_city(city)
        return [r for r in restaurants if cuisine in r.cuisine]

    def get_top_rated_restaurants(self, city: str, limit: int = 5) -> List[Restaurant]:
        restaurants = self.get_restaurants_by_city(city)
        return sorted(restaurants, key=lambda x: x.rating, reverse=True)[:limit]

    def get_available_cities(self) -> List[str]:
        cities = set(self.attractions.keys()) | set(self.restaurants.keys())
        return sorted(list(cities))

    def get_city_weather(self, city: str) -> Dict[str, Any]:
        return self.weather.get(city, {})

    def get_holidays(self) -> Dict[str, Any]:
        return self.holidays

    def filter_attractions_by_preferences(
        self, city: str, preferences: List[str], exclude_walking_intensity: Optional[str] = None
    ) -> List[Attraction]:
        attractions = self.get_attractions_by_city(city)
        preference_map = {
            "美食": ["美食", "购物"],
            "历史文化": ["历史文化"],
            "自然风光": ["自然风光"],
            "购物": ["购物"],
            "夜生活": ["历史文化", "购物"],
        }
        
        matching_attractions = []
        for attr in attractions:
            for pref in preferences:
                if attr.category in preference_map.get(pref, []):
                    if exclude_walking_intensity and attr.walking_intensity == exclude_walking_intensity:
                        continue
                    matching_attractions.append(attr)
                    break
        
        return sorted(matching_attractions, key=lambda x: x.rating, reverse=True)

    def get_transport_between_cities(self, from_city: str, to_city: str) -> Dict[str, str]:
        transport = {}
        city_info = self.weather.get(from_city, {})
        
        if "high_speed_rail" in city_info and to_city in city_info["high_speed_rail"]:
            transport["high_speed_rail"] = city_info["high_speed_rail"][to_city]
        
        if "flight" in city_info and to_city in city_info["flight"]:
            transport["flight"] = city_info["flight"][to_city]
        
        return transport
