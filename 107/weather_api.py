import requests
from datetime import date
from typing import Optional, Dict, List


class WeatherAPI:
    def __init__(self):
        self.base_url = "https://api.open-meteo.com/v1/forecast"
        self.geocoding_url = "https://geocoding-api.open-meteo.com/v1/search"

    def get_coordinates(self, location: str) -> Optional[Dict[str, float]]:
        try:
            params = {
                "name": location,
                "count": 1,
                "language": "zh",
                "format": "json",
            }
            response = requests.get(self.geocoding_url, params=params, timeout=10)
            data = response.json()

            if "results" in data and data["results"]:
                result = data["results"][0]
                return {
                    "latitude": result["latitude"],
                    "longitude": result["longitude"],
                    "name": result.get("name", location),
                    "country": result.get("country", ""),
                }
        except Exception as e:
            print(f"获取坐标失败: {e}")
        return None

    def get_weather_forecast(
        self, location: str, start_date: date, end_date: date
    ) -> Optional[List[Dict]]:
        coords = self.get_coordinates(location)
        if not coords:
            print(f"找不到地点: {location}")
            return None

        try:
            params = {
                "latitude": coords["latitude"],
                "longitude": coords["longitude"],
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat(),
                "daily": "temperature_2m_max,temperature_2m_min,precipitation_probability_max,weathercode",
                "timezone": "auto",
            }
            response = requests.get(self.base_url, params=params, timeout=10)
            data = response.json()

            if "daily" in data:
                daily = data["daily"]
                forecast = []
                for i in range(len(daily["time"])):
                    weather_code = daily["weathercode"][i]
                    forecast.append(
                        {
                            "date": daily["time"][i],
                            "temp_max": daily["temperature_2m_max"][i],
                            "temp_min": daily["temperature_2m_min"][i],
                            "precipitation_prob": daily["precipitation_probability_max"][i],
                            "weather": self._weather_code_to_description(weather_code),
                            "location": coords["name"],
                        }
                    )
                return forecast
        except Exception as e:
            print(f"获取天气失败: {e}")
        return None

    def _weather_code_to_description(self, code: int) -> str:
        weather_codes = {
            0: "晴朗",
            1: "大部晴朗",
            2: "局部多云",
            3: "阴天",
            45: "有雾",
            48: "雾凇",
            51: "小毛毛雨",
            53: "毛毛雨",
            55: "大毛毛雨",
            56: "冻毛毛雨",
            57: "大冻毛毛雨",
            61: "小雨",
            63: "中雨",
            65: "大雨",
            66: "冻雨",
            67: "大冻雨",
            71: "小雪",
            73: "中雪",
            75: "大雪",
            77: "雪粒",
            80: "小阵雨",
            81: "阵雨",
            82: "大阵雨",
            85: "小阵雪",
            86: "大阵雪",
            95: "雷暴",
            96: "雷暴伴小冰雹",
            99: "雷暴伴大冰雹",
        }
        return weather_codes.get(code, "未知天气")

    def print_forecast(self, forecast: List[Dict]) -> None:
        if not forecast:
            return

        print(f"\n🌤️  {forecast[0]['location']} 天气预报")
        print("=" * 60)
        print(f"{'日期':<12} {'天气':<10} {'最高温':>8} {'最低温':>8} {'降水概率':>8}")
        print("-" * 60)
        for day in forecast:
            print(
                f"{day['date']:<12} {day['weather']:<10} "
                f"{day['temp_max']:>6.1f}°C {day['temp_min']:>6.1f}°C "
                f"{day['precipitation_prob']:>7}%"
            )
        print("=" * 60)
