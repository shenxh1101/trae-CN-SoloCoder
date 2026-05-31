from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any
from enum import Enum


class Preference(Enum):
    FOOD = "美食"
    HISTORY = "历史文化"
    NATURE = "自然风光"
    SHOPPING = "购物"
    NIGHTLIFE = "夜生活"


class TransportType(Enum):
    WALK = "步行"
    BUS = "公交"
    SUBWAY = "地铁"
    TAXI = "出租车"
    HIGH_SPEED_RAIL = "高铁"
    FLIGHT = "飞机"
    LONG_DISTANCE_BUS = "长途汽车"


class WalkingIntensity(Enum):
    LOW = "低"
    MEDIUM = "中"
    HIGH = "高"


@dataclass
class Attraction:
    name: str
    city: str
    category: str
    rating: float
    review_count: int
    avg_visit_time: float
    ticket_price: float
    description: str
    walking_intensity: str = "中"
    reviews: List[str] = field(default_factory=list)
    location_hint: str = ""
    best_season: str = "全年"
    holiday_crowd_level: str = "中"

    def to_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "city": self.city,
            "category": self.category,
            "rating": self.rating,
            "review_count": self.review_count,
            "avg_visit_time": self.avg_visit_time,
            "ticket_price": self.ticket_price,
            "description": self.description,
            "walking_intensity": self.walking_intensity,
            "reviews": self.reviews,
            "location_hint": self.location_hint,
            "best_season": self.best_season,
            "holiday_crowd_level": self.holiday_crowd_level,
        }


@dataclass
class Restaurant:
    name: str
    city: str
    cuisine: str
    rating: float
    review_count: int
    avg_price: float
    description: str
    reviews: List[str] = field(default_factory=list)
    location_hint: str = ""
    must_try: List[str] = field(default_factory=list)
    business_hours: str = "10:00-22:00"

    def to_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "city": self.city,
            "cuisine": self.cuisine,
            "rating": self.rating,
            "review_count": self.review_count,
            "avg_price": self.avg_price,
            "description": self.description,
            "reviews": self.reviews,
            "location_hint": self.location_hint,
            "must_try": self.must_try,
            "business_hours": self.business_hours,
        }


@dataclass
class Transport:
    from_place: str
    to_place: str
    transport_type: TransportType
    duration: str
    cost: float
    tip: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return {
            "from_place": self.from_place,
            "to_place": self.to_place,
            "transport_type": self.transport_type.value,
            "duration": self.duration,
            "cost": self.cost,
            "tip": self.tip,
        }


@dataclass
class Activity:
    time_slot: str
    attraction: Optional[Attraction] = None
    restaurant: Optional[Restaurant] = None
    transport: Optional[Transport] = None
    description: str = ""
    booking_hint: str = ""

    def to_dict(self) -> Dict[str, Any]:
        result = {"time_slot": self.time_slot, "description": self.description}
        if self.attraction:
            result["attraction"] = self.attraction.to_dict()
        if self.restaurant:
            result["restaurant"] = self.restaurant.to_dict()
        if self.transport:
            result["transport"] = self.transport.to_dict()
        if self.booking_hint:
            result["booking_hint"] = self.booking_hint
        return result


@dataclass
class DayPlan:
    day_number: int
    city: str
    activities: List[Activity] = field(default_factory=list)
    total_cost: float = 0.0
    walking_intensity: str = "中"
    weather_hint: str = ""
    holiday_warning: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return {
            "day_number": self.day_number,
            "city": self.city,
            "activities": [a.to_dict() for a in self.activities],
            "total_cost": self.total_cost,
            "walking_intensity": self.walking_intensity,
            "weather_hint": self.weather_hint,
            "holiday_warning": self.holiday_warning,
        }


@dataclass
class TravelPlan:
    title: str
    destinations: List[str]
    days: List[DayPlan] = field(default_factory=list)
    total_budget: float = 0.0
    preferences: List[str] = field(default_factory=list)
    packing_list: List[str] = field(default_factory=list)
    text_map: str = ""
    budget_table: Dict[str, float] = field(default_factory=dict)
    plan_id: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return {
            "title": self.title,
            "destinations": self.destinations,
            "days": [d.to_dict() for d in self.days],
            "total_budget": self.total_budget,
            "preferences": self.preferences,
            "packing_list": self.packing_list,
            "text_map": self.text_map,
            "budget_table": self.budget_table,
            "plan_id": self.plan_id,
        }


@dataclass
class ShareRecord:
    plan_id: str
    plan_title: str
    likes: int = 0
    shared_at: str = ""
    feedbacks: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "plan_id": self.plan_id,
            "plan_title": self.plan_title,
            "likes": self.likes,
            "shared_at": self.shared_at,
            "feedbacks": self.feedbacks,
        }


@dataclass
class CityInfo:
    name: str
    province: str
    avg_temps: Dict[str, float] = field(default_factory=dict)
    transit_city_to: List[str] = field(default_factory=list)
    high_speed_rail_connections: Dict[str, str] = field(default_factory=dict)
    flight_connections: Dict[str, str] = field(default_factory=dict)
