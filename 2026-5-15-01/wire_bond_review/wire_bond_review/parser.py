import pandas as pd
import numpy as np
from datetime import datetime
from typing import List, Dict, Optional
import os
from .models import (
    BondingParams, PullTest, MachineProfile, WaferData, 
    AnalysisDataset, ProcessWindow, ShiftType, PackageType, FailureMode
)


class DataParser:
    def __init__(self):
        self.dataset = AnalysisDataset()
    
    def parse_bonding_params_csv(self, file_path: str) -> Dict[str, List[BondingParams]]:
        df = pd.read_csv(file_path)
        wafer_params = {}
        
        for _, row in df.iterrows():
            shift = self._parse_shift(row.get('shift', 'morning'))
            package_type = self._parse_package_type(row.get('package_type', 'standard'))
            
            params = BondingParams(
                wafer_id=str(row['wafer_id']),
                chip_model=str(row['chip_model']),
                machine_id=str(row['machine_id']),
                station_id=str(row['station_id']),
                operator=str(row.get('operator', 'unknown')),
                shift=shift,
                batch_id=str(row['batch_id']),
                wire_batch=str(row['wire_batch']),
                package_type=package_type,
                timestamp=datetime.fromisoformat(str(row['timestamp'])),
                power=float(row['power']),
                time_us=float(row['time_us']),
                force_grams=float(row['force_grams']),
                temp_celsius=float(row['temp_celsius']),
                is_ramping=bool(row.get('is_ramping', False)),
                cleanliness_level=int(row['cleanliness_level']) if pd.notna(row.get('cleanliness_level')) else None,
                tool_wear_hours=float(row['tool_wear_hours']) if pd.notna(row.get('tool_wear_hours')) else None
            )
            
            wafer_id = params.wafer_id
            if wafer_id not in wafer_params:
                wafer_params[wafer_id] = []
            wafer_params[wafer_id].append(params)
        
        return wafer_params
    
    def parse_pull_tests_csv(self, file_path: str) -> Dict[str, List[PullTest]]:
        df = pd.read_csv(file_path)
        wafer_tests = {}
        
        for _, row in df.iterrows():
            failure_mode = self._parse_failure_mode(row.get('failure_mode', 'no_failure'))
            
            test = PullTest(
                wafer_id=str(row['wafer_id']),
                test_id=str(row['test_id']),
                wire_id=str(row['wire_id']),
                pull_force_grams=float(row['pull_force_grams']),
                failure_mode=failure_mode,
                is_sampling=bool(row.get('is_sampling', False)),
                test_timestamp=datetime.fromisoformat(str(row['test_timestamp'])) if pd.notna(row.get('test_timestamp')) else None
            )
            
            wafer_id = test.wafer_id
            if wafer_id not in wafer_tests:
                wafer_tests[wafer_id] = []
            wafer_tests[wafer_id].append(test)
        
        return wafer_tests
    
    def parse_machine_profiles_csv(self, file_path: str) -> Dict[str, MachineProfile]:
        df = pd.read_csv(file_path)
        profiles = {}
        
        for _, row in df.iterrows():
            profile = MachineProfile(
                machine_id=str(row['machine_id']),
                station_id=str(row['station_id']),
                install_date=datetime.fromisoformat(str(row['install_date'])),
                total_bonds=int(row['total_bonds']),
                last_maintenance_date=datetime.fromisoformat(str(row['last_maintenance_date'])),
                capillaries_used=int(row['capillaries_used']),
                current_capillary_hours=float(row['current_capillary_hours']),
                is_new_machine=bool(row.get('is_new_machine', False)),
                ramp_up_start_date=datetime.fromisoformat(str(row['ramp_up_start_date'])) if pd.notna(row.get('ramp_up_start_date')) else None
            )
            profiles[profile.machine_id] = profile
        
        return profiles
    
    def parse_process_windows_csv(self, file_path: str) -> Dict[str, ProcessWindow]:
        df = pd.read_csv(file_path)
        windows = {}
        
        for _, row in df.iterrows():
            window = ProcessWindow(
                power_min=float(row['power_min']),
                power_max=float(row['power_max']),
                time_min=float(row['time_min']),
                time_max=float(row['time_max']),
                force_min=float(row['force_min']),
                force_max=float(row['force_max']),
                temp_min=float(row['temp_min']),
                temp_max=float(row['temp_max']),
                pull_force_spec=float(row['pull_force_spec']),
                pull_force_lower_limit=float(row['pull_force_lower_limit'])
            )
            windows[str(row['chip_model'])] = window
        
        return windows
    
    def load_data(self, 
                  bonding_params_path: str,
                  pull_tests_path: str,
                  machine_profiles_path: Optional[str] = None,
                  process_windows_path: Optional[str] = None) -> AnalysisDataset:
        
        wafer_params = self.parse_bonding_params_csv(bonding_params_path)
        wafer_tests = self.parse_pull_tests_csv(pull_tests_path)
        
        all_wafer_ids = set(wafer_params.keys()) | set(wafer_tests.keys())
        
        for wafer_id in all_wafer_ids:
            params_list = wafer_params.get(wafer_id, [])
            tests = wafer_tests.get(wafer_id, [])
            
            if params_list:
                chip_model = params_list[0].chip_model
            else:
                chip_model = tests[0].wafer_id.split('_')[0] if tests else 'UNKNOWN'
            
            wafer = WaferData(
                wafer_id=wafer_id,
                chip_model=chip_model,
                bonding_params_list=params_list,
                pull_tests=tests
            )
            self.dataset.add_wafer(wafer)
        
        if machine_profiles_path and os.path.exists(machine_profiles_path):
            profiles = self.parse_machine_profiles_csv(machine_profiles_path)
            self.dataset.machine_profiles = profiles
            
            for wafer in self.dataset.wafers.values():
                if wafer.bonding_params_list:
                    machine_id = wafer.bonding_params_list[0].machine_id
                    if machine_id in profiles:
                        wafer.machine_profile = profiles[machine_id]
        
        if process_windows_path and os.path.exists(process_windows_path):
            windows = self.parse_process_windows_csv(process_windows_path)
            self.dataset.process_windows = windows
        
        return self.dataset
    
    def _parse_shift(self, value: str) -> ShiftType:
        value = value.lower()
        if 'morning' in value or 'day' in value:
            return ShiftType.MORNING
        elif 'afternoon' in value or 'swing' in value:
            return ShiftType.AFTERNOON
        elif 'night' in value or 'grave' in value:
            return ShiftType.NIGHT
        return ShiftType.MORNING
    
    def _parse_package_type(self, value: str) -> PackageType:
        value = value.lower()
        if 'stack' in value or '3d' in value or 'multi' in value:
            return PackageType.STACKED
        elif 'sip' in value or 'system' in value:
            return PackageType.SIP
        elif 'fanout' in value or 'fo' in value:
            return PackageType.FANOUT
        return PackageType.STANDARD
    
    def _parse_failure_mode(self, value: str) -> FailureMode:
        value = value.lower()
        if 'ball' in value or 'lift' in value:
            return FailureMode.BALL_LIFT
        elif 'wire' in value and 'break' in value:
            return FailureMode.WIRE_BREAK
        elif 'heel' in value:
            return FailureMode.HEEL_BREAK
        elif 'pad' in value or 'damage' in value:
            return FailureMode.PAD_DAMAGE
        return FailureMode.NO_FAILURE


def load_dataset(bonding_params_path: str,
                 pull_tests_path: str,
                 machine_profiles_path: Optional[str] = None,
                 process_windows_path: Optional[str] = None) -> AnalysisDataset:
    parser = DataParser()
    return parser.load_data(
        bonding_params_path,
        pull_tests_path,
        machine_profiles_path,
        process_windows_path
    )
