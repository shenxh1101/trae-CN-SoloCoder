import uuid
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime
from .models import (
    Attraction,
    Restaurant,
    Transport,
    Activity,
    DayPlan,
    TravelPlan,
    TransportType,
)
from .data_loader import DataLoader


class TravelPlanner:
    def __init__(self, data_loader: Optional[DataLoader] = None):
        self.data_loader = data_loader or DataLoader()

    def parse_user_input(self, user_input: str) -> Tuple[List[str], int, List[str]]:
        destinations = []
        days = 0
        preferences = []
        
        prefs_keywords = ["美食", "历史文化", "自然风光", "购物", "夜生活"]
        for kw in prefs_keywords:
            if kw in user_input:
                preferences.append(kw)
        
        import re
        day_match = re.search(r"(\d+)天", user_input)
        if day_match:
            days = int(day_match.group(1))
        
        for city in self.data_loader.get_available_cities():
            if city in user_input:
                destinations.append(city)
        
        if not preferences:
            preferences = ["历史文化", "美食"]
        
        if days == 0:
            days = 3
        
        if not destinations:
            destinations = ["成都"]
        
        return destinations, days, preferences

    def _select_attractions_for_day(
        self, city: str, preferences: List[str], max_walking: Optional[str] = None
    ) -> List[Attraction]:
        if max_walking == "低":
            attractions = self.data_loader.filter_attractions_by_preferences(
                city, preferences, exclude_walking_intensity="高"
            )
            attractions = [a for a in attractions if a.walking_intensity in ["低", "中"]]
        elif max_walking == "极低":
            attractions = self.data_loader.filter_attractions_by_preferences(
                city, preferences, exclude_walking_intensity="高"
            )
            attractions = [a for a in attractions if a.walking_intensity == "低"]
        else:
            attractions = self.data_loader.filter_attractions_by_preferences(city, preferences)
        
        return attractions[:4]

    def _select_restaurants_for_day(self, city: str, preferences: List[str]) -> Tuple[Restaurant, Restaurant]:
        if "美食" in preferences:
            restaurants = self.data_loader.get_top_rated_restaurants(city, 5)
        else:
            restaurants = self.data_loader.get_restaurants_by_city(city)[:5]
        
        lunch = restaurants[0] if len(restaurants) > 0 else None
        dinner = restaurants[1] if len(restaurants) > 1 else lunch
        
        return lunch, dinner

    def _create_transport_activity(
        self, from_place: str, to_place: str, city: str
    ) -> Activity:
        transport = Transport(
            from_place=from_place,
            to_place=to_place,
            transport_type=TransportType.SUBWAY,
            duration="约30分钟",
            cost=5.0,
            tip=f"建议乘坐地铁或打车从{from_place}前往{to_place}",
        )
        return Activity(
            time_slot="交通",
            transport=transport,
            description=f"从{from_place}前往{to_place}",
        )

    def _get_booking_hint(self, item_name: str, item_type: str, city: str = "") -> str:
        from urllib.parse import quote
        
        city_codes = {
            "北京": {"ctrip": "1", "meituan": "1", "dianping": "2"},
            "上海": {"ctrip": "2", "meituan": "3", "dianping": "1"},
            "成都": {"ctrip": "234", "meituan": "59", "dianping": "8"},
            "重庆": {"ctrip": "158", "meituan": "45", "dianping": "9"},
            "西安": {"ctrip": "210", "meituan": "53", "dianping": "17"},
            "杭州": {"ctrip": "17", "meituan": "50", "dianping": "3"},
            "广州": {"ctrip": "16", "meituan": "4", "dianping": "4"},
            "深圳": {"ctrip": "27", "meituan": "10", "dianping": "7"},
        }
        
        code = city_codes.get(city, {"ctrip": "1", "meituan": "1", "dianping": "1"})
        
        platforms = {
            "携程": {
                "attraction": f"https://piao.ctrip.com/ticket/dest/t{code.get('ctrip', '1')}.html?keyword={quote(item_name)}",
                "restaurant": f"https://you.ctrip.com/food/city{code.get('ctrip', '1')}.html?keyword={quote(item_name)}",
                "hotel": f"https://hotels.ctrip.com/hotel/city{code.get('ctrip', '1')}.html",
                "domain": "piao.ctrip.com / hotels.ctrip.com"
            },
            "飞猪": {
                "attraction": f"https://s.fliggy.com/search?q={quote(item_name)}&cat=50022988&city={quote(city)}",
                "restaurant": f"https://s.fliggy.com/search?q={quote(item_name)}&cat=50022990&city={quote(city)}",
                "hotel": f"https://s.fliggy.com/search?q={quote(city)}&cat=50022989",
                "domain": "s.fliggy.com"
            },
            "美团": {
                "attraction": f"https://www.meituan.com/s/{quote(item_name)}/?mtt=1.sight%2Fpoi.0.0&cityId={code.get('meituan', '1')}",
                "restaurant": f"https://www.meituan.com/s/{quote(item_name)}/?mtt=1.food%2Fpoi.0.0&cityId={code.get('meituan', '1')}",
                "hotel": f"https://hotel.meituan.com/{quote(city)}/?cityId={code.get('meituan', '1')}",
                "domain": "www.meituan.com"
            },
            "大众点评": {
                "attraction": f"https://www.dianping.com/search/keyword/{code.get('dianping', '2')}/0_{quote(item_name)}",
                "restaurant": f"https://www.dianping.com/search/keyword/{code.get('dianping', '2')}/10_{quote(item_name)}",
                "hotel": f"https://www.dianping.com/search/keyword/{code.get('dianping', '2')}/20_{quote(city)}",
                "domain": "www.dianping.com"
            },
        }
        
        import random
        platform_names = list(platforms.keys())
        platform = random.choice(platform_names)
        
        if item_type in platforms[platform]:
            url = platforms[platform][item_type]
            domain = platforms[platform]["domain"]
        else:
            url = platforms[platform]["attraction"]
            domain = platforms[platform]["domain"]
        
        type_desc = {
            "attraction": "景点门票",
            "restaurant": "餐厅预订",
            "hotel": "酒店预订",
        }
        
        hint = f"【预订提示】去{platform}预订「{item_name}」{type_desc.get(item_type, '')}"
        link = f"🔗 预订链接: {url}"
        domain_info = f"   (域名: {domain})"
        
        return f"{hint}\n      {link}\n      {domain_info}"

    def generate_day_plan(
        self,
        day_number: int,
        city: str,
        preferences: List[str],
        max_walking: Optional[str] = None,
        travel_month: Optional[str] = None,
    ) -> DayPlan:
        attractions = self._select_attractions_for_day(city, preferences, max_walking)
        lunch_rest, dinner_rest = self._select_restaurants_for_day(city, preferences)
        
        activities = []
        total_cost = 0.0
        walking_intensity_levels = []
        
        morning_attraction = attractions[0] if len(attractions) > 0 else None
        if morning_attraction:
            activities.append(
                Activity(
                    time_slot="上午",
                    attraction=morning_attraction,
                    description=f"游览{morning_attraction.name}，感受{morning_attraction.description[:30]}...",
                    booking_hint=self._get_booking_hint(morning_attraction.name, "attraction", city),
                )
            )
            total_cost += morning_attraction.ticket_price
            walking_intensity_levels.append(morning_attraction.walking_intensity)
        
        if lunch_rest:
            if morning_attraction:
                activities.append(
                    self._create_transport_activity(morning_attraction.name, lunch_rest.name, city)
                )
                total_cost += 10.0
            
            activities.append(
                Activity(
                    time_slot="午餐",
                    restaurant=lunch_rest,
                    description=f"在{lunch_rest.name}享用午餐，品尝{lunch_rest.cuisine}",
                    booking_hint=self._get_booking_hint(lunch_rest.name, "restaurant", city),
                )
            )
            total_cost += lunch_rest.avg_price
        
        afternoon_attraction = attractions[1] if len(attractions) > 1 else None
        if afternoon_attraction:
            if lunch_rest:
                activities.append(
                    self._create_transport_activity(lunch_rest.name, afternoon_attraction.name, city)
                )
                total_cost += 10.0
            
            activities.append(
                Activity(
                    time_slot="下午",
                    attraction=afternoon_attraction,
                    description=f"游览{afternoon_attraction.name}，{afternoon_attraction.description[:30]}...",
                    booking_hint=self._get_booking_hint(afternoon_attraction.name, "attraction", city),
                )
            )
            total_cost += afternoon_attraction.ticket_price
            walking_intensity_levels.append(afternoon_attraction.walking_intensity)
        
        evening_attraction = attractions[2] if len(attractions) > 2 else None
        if evening_attraction:
            activities.append(
                self._create_transport_activity(
                    afternoon_attraction.name if afternoon_attraction else "午餐地点",
                    evening_attraction.name,
                    city,
                )
            )
            total_cost += 10.0
            
            activities.append(
                Activity(
                    time_slot="傍晚",
                    attraction=evening_attraction,
                    description=f"在{evening_attraction.name}欣赏夜景/夕阳",
                    booking_hint=self._get_booking_hint(evening_attraction.name, "attraction", city),
                )
            )
            total_cost += evening_attraction.ticket_price
            walking_intensity_levels.append(evening_attraction.walking_intensity)
        
        if dinner_rest:
            activities.append(
                self._create_transport_activity(
                    evening_attraction.name if evening_attraction else "下午景点",
                    dinner_rest.name,
                    city,
                )
            )
            total_cost += 10.0
            
            activities.append(
                Activity(
                    time_slot="晚餐",
                    restaurant=dinner_rest,
                    description=f"在{dinner_rest.name}享用晚餐，必尝：{', '.join(dinner_rest.must_try[:3])}",
                    booking_hint=self._get_booking_hint(dinner_rest.name, "restaurant", city),
                )
            )
            total_cost += dinner_rest.avg_price
        
        overall_walking = "中"
        if walking_intensity_levels:
            if "高" in walking_intensity_levels or "极高" in walking_intensity_levels:
                overall_walking = "高"
            elif all(w == "低" for w in walking_intensity_levels):
                overall_walking = "低"
        
        weather_hint = ""
        if travel_month:
            city_weather = self.data_loader.get_city_weather(city)
            if city_weather:
                weather_tips = city_weather.get("weather_tips", {})
                weather_hint = weather_tips.get(travel_month, "")
        
        holiday_warning = self._check_holiday_warning(city, travel_month)
        
        total_cost += 200
        
        return DayPlan(
            day_number=day_number,
            city=city,
            activities=activities,
            total_cost=total_cost,
            walking_intensity=overall_walking,
            weather_hint=weather_hint,
            holiday_warning=holiday_warning,
        )

    def _check_holiday_warning(self, city: str, travel_month: Optional[str]) -> str:
        if not travel_month:
            return ""
        
        import re
        from datetime import datetime
        
        year_match = re.search(r"(\d{4})年?", travel_month)
        if year_match:
            target_year = int(year_match.group(1))
        else:
            target_year = datetime.now().year
        
        month_num_match = re.search(r"(\d{1,2})月", travel_month)
        if not month_num_match:
            month_num_match = re.search(r"(\d{1,2})", travel_month)
        
        if not month_num_match:
            return ""
        target_month = month_num_match.group(1)
        target_month_int = int(target_month)
        
        def generate_holiday_dates(year):
            return {
                "元旦": {
                    "dates": [f"{year}-01-01"],
                    "crowd_index": 8,
                    "peak_day": f"{year}-01-01",
                    "months": ["1"]
                },
                "春节": {
                    "dates": [f"{year}-02-16", f"{year}-02-17", f"{year}-02-18", 
                            f"{year}-02-19", f"{year}-02-20", f"{year}-02-21", f"{year}-02-22"],
                    "crowd_index": 10,
                    "peak_day": f"{year}-02-18",
                    "months": ["2"]
                },
                "清明节": {
                    "dates": [f"{year}-04-04", f"{year}-04-05", f"{year}-04-06"],
                    "crowd_index": 8,
                    "peak_day": f"{year}-04-05",
                    "months": ["4"]
                },
                "劳动节": {
                    "dates": [f"{year}-05-01", f"{year}-05-02", f"{year}-05-03", 
                           f"{year}-05-04", f"{year}-05-05"],
                    "crowd_index": 9,
                    "peak_day": f"{year}-05-02",
                    "months": ["5"]
                },
                "端午节": {
                    "dates": [f"{year}-05-31", f"{year}-06-01", f"{year}-06-02"],
                    "crowd_index": 7,
                    "peak_day": f"{year}-06-01",
                    "months": ["5", "6"]
                },
                "中秋节": {
                    "dates": [f"{year}-09-25", f"{year}-09-26", f"{year}-09-27"],
                    "crowd_index": 7,
                    "peak_day": f"{year}-09-26",
                    "months": ["9"]
                },
                "国庆节": {
                    "dates": [f"{year}-10-01", f"{year}-10-02", f"{year}-10-03",
                           f"{year}-10-04", f"{year}-10-05", f"{year}-10-06", f"{year}-10-07"],
                    "crowd_index": 10,
                    "peak_day": f"{year}-10-03",
                    "months": ["10"]
                },
                "暑假": {
                    "dates": [f"{year}-07-01", f"{year}-07-15", f"{year}-08-01", f"{year}-08-15"],
                    "crowd_index": 7,
                    "peak_day": f"{year}-08-10",
                    "months": ["7", "8"]
                },
            }
        
        holiday_dates = generate_holiday_dates(target_year)
        
        holidays = self.data_loader.get_holidays()
        warnings = []
        
        for holiday in holidays.get("holidays", []):
            date_range = holiday.get("date", "")
            if target_month in date_range:
                holiday_name = holiday.get("name", "")
                crowd_level = holiday.get("crowd_level", "中")
                tip = holiday.get("tip", "")
                
                if holiday_name in holiday_dates and target_month in holiday_dates[holiday_name]["months"]:
                    info = holiday_dates[holiday_name]
                    dates = info["dates"]
                    dates_str = "、".join(dates[:3])
                    if len(dates) > 3:
                        dates_str += f" 等共{len(dates)}天"
                    
                    crowd_index = info["crowd_index"]
                    peak_day = info["peak_day"]
                    
                    crowd_bar = "█" * (crowd_index // 2) + "░" * (5 - crowd_index // 2)
                    
                    warning = (
                        f"⚠️ {target_year}年{holiday_name}假期（{dates_str}）\n"
                        f"   📅 高峰日: {peak_day}\n"
                        f"   📊 人流指数: {crowd_index}/10 {crowd_bar} ({crowd_level})\n"
                        f"   💡 提示: {tip}"
                    )
                    warnings.append(warning)
                else:
                    warning = f"⚠️ {holiday_name}期间人流量{crowd_level}，{tip}"
                    warnings.append(warning)
        
        city_specific = holidays.get("city_specific", {}).get(city, {})
        if target_month in city_specific.get("peak_months", []):
            for event in city_specific.get("special_events", []):
                if str(event.get("month")) == target_month:
                    warning = (
                        f"🎉 {city}{event['name']}（{target_year}年{target_month}月）\n"
                        f"   📊 人流指数: 7/10 ███░░\n"
                        f"   💡 提示: {event['tip']}"
                    )
                    warnings.append(warning)
                    break
            
            if not any("人流指数" in w for w in warnings[-1:] if warnings):
                warnings.append(
                    f"📈 {city}{travel_month}为旅游旺季，人流指数 6/10 ███░░\n"
                    f"   💡 建议提前2周预订住宿，价格优惠30%+"
                )
        
        return "\n".join(warnings)

    def _add_intercity_transport(
        self, day_plan: DayPlan, from_city: str, to_city: str
    ) -> DayPlan:
        transport_options = self.data_loader.get_transport_between_cities(from_city, to_city)
        
        transport_type = TransportType.HIGH_SPEED_RAIL
        transport_info = ""
        cost = 0.0
        
        if "high_speed_rail" in transport_options:
            transport_info = transport_options["high_speed_rail"]
            cost = float(transport_info.split("约")[1].split("元")[0])
            transport_type = TransportType.HIGH_SPEED_RAIL
        elif "flight" in transport_options:
            transport_info = transport_options["flight"]
            price_range = transport_info.split("约")[1].split("元")[0]
            cost = float(price_range.split("-")[0])
            transport_type = TransportType.FLIGHT
        
        transport = Transport(
            from_place=from_city,
            to_place=to_city,
            transport_type=transport_type,
            duration=transport_info.split("，")[0] if transport_info else "约2小时",
            cost=cost,
            tip=f"从{from_city}前往{to_city}的交通建议：{transport_info}",
        )
        
        transport_activity = Activity(
            time_slot="上午（跨城交通）",
            transport=transport,
            description=f"从{from_city}前往{to_city}",
            booking_hint=self._get_booking_hint(f"{from_city}-{to_city}", "hotel", to_city),
        )
        
        day_plan.activities.insert(0, transport_activity)
        day_plan.total_cost += cost
        
        return day_plan

    def generate_travel_plan(
        self,
        destinations: List[str],
        total_days: int,
        preferences: List[str],
        travel_month: Optional[str] = None,
    ) -> TravelPlan:
        plan_id = str(uuid.uuid4())[:8]
        
        num_destinations = len(destinations)
        days_per_city = total_days // num_destinations if num_destinations > 0 else total_days
        extra_days = total_days % num_destinations if num_destinations > 0 else 0
        
        day_plans = []
        current_day = 1
        
        for i, city in enumerate(destinations):
            city_days = days_per_city + (1 if i < extra_days else 0)
            
            for city_day in range(city_days):
                day_plan = self.generate_day_plan(
                    current_day, city, preferences, travel_month=travel_month
                )
                
                if i > 0 and city_day == 0:
                    prev_city = destinations[i - 1]
                    day_plan = self._add_intercity_transport(day_plan, prev_city, city)
                
                day_plans.append(day_plan)
                current_day += 1
        
        total_budget = sum(day.total_cost for day in day_plans)
        budget_table = self._generate_budget_table(day_plans)
        
        packing_list = self._generate_packing_list(destinations, preferences, travel_month)
        text_map = self._generate_text_map(destinations, day_plans)
        
        destinations_str = "、".join(destinations)
        title = f"{destinations_str}{total_days}日游计划"
        
        return TravelPlan(
            plan_id=plan_id,
            title=title,
            destinations=destinations,
            days=day_plans,
            total_budget=total_budget,
            preferences=preferences,
            packing_list=packing_list,
            text_map=text_map,
            budget_table=budget_table,
        )

    def _generate_budget_table(self, day_plans: List[DayPlan]) -> Dict[str, float]:
        budget = {"交通": 0.0, "住宿": 0.0, "餐饮": 0.0, "门票": 0.0, "其他": 0.0}
        
        for day in day_plans:
            for activity in day.activities:
                if activity.attraction:
                    budget["门票"] += activity.attraction.ticket_price
                if activity.restaurant:
                    budget["餐饮"] += activity.restaurant.avg_price
                if activity.transport:
                    budget["交通"] += activity.transport.cost
            budget["住宿"] += 200
        
        budget["其他"] = (budget["交通"] + budget["住宿"] + budget["餐饮"] + budget["门票"]) * 0.1
        
        return {k: round(v, 2) for k, v in budget.items()}

    def _generate_packing_list(
        self, destinations: List[str], preferences: List[str], travel_month: Optional[str]
    ) -> List[str]:
        packing = [
            "身份证/护照", "手机及充电器", "充电宝",
            "换洗衣物", "洗漱用品", "雨伞/雨衣",
            "常用药品", "口罩", "纸巾湿巾",
        ]
        
        if travel_month:
            for city in destinations:
                city_weather = self.data_loader.get_city_weather(city)
                if city_weather:
                    avg_temps = city_weather.get("avg_temps", {})
                    temp = avg_temps.get(travel_month, 20)
                    
                    if temp < 5:
                        packing.extend(["羽绒服", "保暖内衣", "帽子手套围巾"])
                    elif temp < 15:
                        packing.extend(["厚外套", "毛衣"])
                    elif temp < 25:
                        packing.extend(["薄外套", "长袖"])
                    else:
                        packing.extend(["短袖T恤", "防晒霜", "太阳镜", "遮阳帽"])
        
        if "自然风光" in preferences:
            packing.extend(["舒适运动鞋", "登山杖", "便携水杯"])
        
        if "美食" in preferences:
            packing.extend(["肠胃药", "消食片"])
        
        if "历史文化" in preferences:
            packing.extend(["相机", "充电宝"])
        
        return list(set(packing))

    def _generate_text_map(self, destinations: List[str], day_plans: List[DayPlan]) -> str:
        map_lines = []
        map_lines.append("=" * 60)
        map_lines.append("📍 旅行路线简易文本地图")
        map_lines.append("=" * 60)
        map_lines.append("")
        
        if len(destinations) > 1:
            map_lines.append("🚄 跨城市路线：")
            for i in range(len(destinations) - 1):
                transport = self.data_loader.get_transport_between_cities(
                    destinations[i], destinations[i + 1]
                )
                transport_str = "高铁" if "high_speed_rail" in transport else "飞机"
                map_lines.append(f"   {destinations[i]} → {destinations[i+1]} [{transport_str}]")
            map_lines.append("")
        
        for day in day_plans:
            map_lines.append(f"📅 第{day.day_number}天（{day.city}）：")
            locations = []
            for activity in day.activities:
                if activity.attraction:
                    locations.append(activity.attraction.name)
                elif activity.restaurant:
                    locations.append(activity.restaurant.name)
            
            if locations:
                map_lines.append("   游览路线：" + " → ".join(locations))
                map_lines.append(f"   步行强度：{day.walking_intensity}")
            map_lines.append("")
        
        map_lines.append("=" * 60)
        return "\n".join(map_lines)

    def adjust_plan(
        self, original_plan: TravelPlan, adjustment_request: str
    ) -> TravelPlan:
        import re
        
        new_days = []
        
        for day in original_plan.days:
            day_number = day.day_number
            
            day_match = re.search(r"第?(\d+)天", adjustment_request)
            target_day = int(day_match.group(1)) if day_match else None
            
            if target_day and target_day != day_number:
                new_days.append(day)
                continue
            
            max_walking = None
            if "不要太多步行" in adjustment_request or "少走路" in adjustment_request:
                max_walking = "低"
            elif "尽量少走" in adjustment_request or "不用走路" in adjustment_request:
                max_walking = "极低"
            
            if max_walking:
                new_day = self.generate_day_plan(
                    day_number, day.city, original_plan.preferences, max_walking=max_walking
                )
                new_days.append(new_day)
            else:
                new_days.append(day)
        
        total_budget = sum(day.total_cost for day in new_days)
        budget_table = self._generate_budget_table(new_days)
        
        new_plan = TravelPlan(
            plan_id=original_plan.plan_id,
            title=original_plan.title + "（已调整）",
            destinations=original_plan.destinations,
            days=new_days,
            total_budget=total_budget,
            preferences=original_plan.preferences,
            packing_list=original_plan.packing_list,
            text_map=self._generate_text_map(original_plan.destinations, new_days),
            budget_table=budget_table,
        )
        
        return new_plan
