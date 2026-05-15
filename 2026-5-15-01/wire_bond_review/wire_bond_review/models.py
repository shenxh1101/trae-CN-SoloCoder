from dataclasses import dataclass, field
from typing import List, Dict, Optional, Tuple
from datetime import datetime
import numpy as np
from enum import Enum


class ShiftType(Enum):
    MORNING = "morning"
    AFTERNOON = "afternoon"
    NIGHT = "night"


class PackageType(Enum):
    STANDARD = "standard"
    STACKED = "stacked"
    SIP = "sip"
    FANOUT = "fanout"


class FailureMode(Enum):
    BALL_LIFT = "ball_lift"
    WIRE_BREAK = "wire_break"
    HEEL_BREAK = "heel_break"
    PAD_DAMAGE = "pad_damage"
    NO_FAILURE = "no_failure"


@dataclass
class ProcessWindow:
    power_min: float
    power_max: float
    time_min: float
    time_max: float
    force_min: float
    force_max: float
    temp_min: float
    temp_max: float
    pull_force_spec: float
    pull_force_lower_limit: float


@dataclass
class BondingParams:
    wafer_id: str
    chip_model: str
    machine_id: str
    station_id: str
    operator: str
    shift: ShiftType
    batch_id: str
    wire_batch: str
    package_type: PackageType
    timestamp: datetime
    power: float
    time_us: float
    force_grams: float
    temp_celsius: float
    is_ramping: bool = False
    cleanliness_level: Optional[int] = None
    tool_wear_hours: Optional[float] = None


@dataclass
class PullTest:
    wafer_id: str
    test_id: str
    wire_id: str
    pull_force_grams: float
    failure_mode: FailureMode
    is_sampling: bool = False
    test_timestamp: Optional[datetime] = None


@dataclass
class MachineProfile:
    machine_id: str
    station_id: str
    install_date: datetime
    total_bonds: int
    last_maintenance_date: datetime
    capillaries_used: int
    current_capillary_hours: float
    is_new_machine: bool = False
    ramp_up_start_date: Optional[datetime] = None


@dataclass
class WaferData:
    wafer_id: str
    chip_model: str
    bonding_params_list: List[BondingParams] = field(default_factory=list)
    pull_tests: List[PullTest] = field(default_factory=list)
    machine_profile: Optional[MachineProfile] = None
    
    @property
    def avg_pull_force(self) -> float:
        if not self.pull_tests:
            return 0.0
        return np.mean([pt.pull_force_grams for pt in self.pull_tests])
    
    @property
    def min_pull_force(self) -> float:
        if not self.pull_tests:
            return 0.0
        return np.min([pt.pull_force_grams for pt in self.pull_tests])
    
    @property
    def pull_force_std(self) -> float:
        if not self.pull_tests:
            return 0.0
        return np.std([pt.pull_force_grams for pt in self.pull_tests])
    
    @property
    def failure_rate(self) -> float:
        if not self.pull_tests:
            return 0.0
        failures = sum(1 for pt in self.pull_tests if pt.failure_mode != FailureMode.NO_FAILURE)
        return failures / len(self.pull_tests)
    
    @property
    def avg_power(self) -> float:
        if not self.bonding_params_list:
            return 0.0
        return np.mean([bp.power for bp in self.bonding_params_list])
    
    @property
    def avg_time(self) -> float:
        if not self.bonding_params_list:
            return 0.0
        return np.mean([bp.time_us for bp in self.bonding_params_list])
    
    @property
    def avg_force(self) -> float:
        if not self.bonding_params_list:
            return 0.0
        return np.mean([bp.force_grams for bp in self.bonding_params_list])
    
    @property
    def avg_temp(self) -> float:
        if not self.bonding_params_list:
            return 0.0
        return np.mean([bp.temp_celsius for bp in self.bonding_params_list])


@dataclass
class ProcessCheckResult:
    wafer_id: str
    param_deviations: List[Dict[str, any]] = field(default_factory=list)
    pull_force_anomalies: List[Dict[str, any]] = field(default_factory=list)
    station_inconsistencies: List[Dict[str, any]] = field(default_factory=list)
    overall_status: str = "PASS"
    risk_level: str = "LOW"


@dataclass
class CorrelationResult:
    param_name: str
    correlation_coeff: float
    p_value: float
    significance: str
    trend: str


@dataclass
class ClusterResult:
    cluster_id: int
    wafer_ids: List[str]
    dominant_failure_mode: FailureMode
    characteristic_params: Dict[str, float]
    size: int
    risk_level: str


@dataclass
class ParamAdjustment:
    param_name: str
    current_value: float
    suggested_value: float
    adjustment_direction: str
    expected_improvement: float
    confidence: float


@dataclass
class MachineRanking:
    machine_id: str
    station_id: str
    score: float
    risk_factors: List[str]
    maintenance_priority: str
    avg_pull_force: float
    failure_rate: float
    param_cv: float


@dataclass
class AnalysisDataset:
    wafers: Dict[str, WaferData] = field(default_factory=dict)
    process_windows: Dict[str, ProcessWindow] = field(default_factory=dict)
    machine_profiles: Dict[str, MachineProfile] = field(default_factory=dict)
    
    def add_wafer(self, wafer: WaferData) -> None:
        self.wafers[wafer.wafer_id] = wafer
    
    def get_wafer(self, wafer_id: str) -> Optional[WaferData]:
        return self.wafers.get(wafer_id)
    
    def get_all_wafer_ids(self) -> List[str]:
        return list(self.wafers.keys())
    
    def get_wafers_by_chip_model(self, chip_model: str) -> List[WaferData]:
        return [w for w in self.wafers.values() if w.chip_model == chip_model]
    
    def get_wafers_by_machine(self, machine_id: str) -> List[WaferData]:
        return [w for w in self.wafers.values() if w.bonding_params_list and w.bonding_params_list[0].machine_id == machine_id]
    
    def get_wafers_by_wire_batch(self, wire_batch: str) -> List[WaferData]:
        return [w for w in self.wafers.values() if w.bonding_params_list and w.bonding_params_list[0].wire_batch == wire_batch]
    
    def get_transition_batches(self) -> List[WaferData]:
        transition_wafers = []
        for wafer in self.wafers.values():
            if wafer.bonding_params_list:
                wire_batches = set(bp.wire_batch for bp in wafer.bonding_params_list)
                if len(wire_batches) > 1:
                    transition_wafers.append(wafer)
        return transition_wafers
