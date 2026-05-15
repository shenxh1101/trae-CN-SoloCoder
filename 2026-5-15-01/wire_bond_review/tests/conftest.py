import pytest
import tempfile
import os
from datetime import datetime
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from wire_bond_review.models import (
    BondingParams, PullTest, MachineProfile, WaferData,
    AnalysisDataset, ProcessWindow, ShiftType, PackageType, FailureMode
)


@pytest.fixture
def sample_bonding_params():
    return BondingParams(
        wafer_id="W001",
        chip_model="CHIP_A",
        machine_id="M01",
        station_id="S01",
        operator="John",
        shift=ShiftType.MORNING,
        batch_id="BATCH_001",
        wire_batch="WIRE_001",
        package_type=PackageType.STANDARD,
        timestamp=datetime(2024, 1, 15, 8, 30),
        power=150,
        time_us=25,
        force_grams=50,
        temp_celsius=180,
        is_ramping=False,
        cleanliness_level=8,
        tool_wear_hours=120.5
    )


@pytest.fixture
def sample_pull_test():
    return PullTest(
        wafer_id="W001",
        test_id="T001",
        wire_id="W001_01",
        pull_force_grams=8.5,
        failure_mode=FailureMode.NO_FAILURE,
        is_sampling=False,
        test_timestamp=datetime(2024, 1, 15, 10, 0)
    )


@pytest.fixture
def sample_machine_profile():
    return MachineProfile(
        machine_id="M01",
        station_id="S01",
        install_date=datetime(2023, 6, 15),
        total_bonds=1500000,
        last_maintenance_date=datetime(2024, 1, 10),
        capillaries_used=15,
        current_capillary_hours=120.5,
        is_new_machine=False,
        ramp_up_start_date=None
    )


@pytest.fixture
def sample_process_window():
    return ProcessWindow(
        power_min=140,
        power_max=160,
        time_min=20,
        time_max=30,
        force_min=40,
        force_max=60,
        temp_min=170,
        temp_max=190,
        pull_force_spec=8.0,
        pull_force_lower_limit=6.0
    )


@pytest.fixture
def sample_wafer(sample_bonding_params, sample_pull_test):
    wafer = WaferData(
        wafer_id="W001",
        chip_model="CHIP_A"
    )
    wafer.bonding_params_list = [sample_bonding_params]
    wafer.pull_tests = [sample_pull_test]
    return wafer


@pytest.fixture
def sample_dataset(sample_wafer, sample_machine_profile, sample_process_window):
    dataset = AnalysisDataset()
    dataset.add_wafer(sample_wafer)
    dataset.machine_profiles["M01"] = sample_machine_profile
    dataset.process_windows["CHIP_A"] = sample_process_window
    return dataset


@pytest.fixture
def temp_csv_dir():
    with tempfile.TemporaryDirectory() as tmpdir:
        yield tmpdir


@pytest.fixture
def bonding_params_csv(temp_csv_dir):
    csv_path = os.path.join(temp_csv_dir, "bonding_params.csv")
    with open(csv_path, "w") as f:
        f.write("""wafer_id,chip_model,machine_id,station_id,operator,shift,batch_id,wire_batch,package_type,timestamp,power,time_us,force_grams,temp_celsius,is_ramping,cleanliness_level,tool_wear_hours
W001,CHIP_A,M01,S01,John,morning,BATCH_001,WIRE_001,standard,2024-01-15T08:30:00,150,25,50,180,False,8,120.5
W002,CHIP_A,M01,S02,Mary,morning,BATCH_001,WIRE_001,standard,2024-01-15T09:00:00,155,28,55,185,False,7,122.0
W003,CHIP_B,M02,S01,Tom,afternoon,BATCH_002,WIRE_002,stacked,2024-01-15T14:00:00,160,30,60,190,False,9,95.5
""")
    return csv_path


@pytest.fixture
def pull_tests_csv(temp_csv_dir):
    csv_path = os.path.join(temp_csv_dir, "pull_tests.csv")
    with open(csv_path, "w") as f:
        f.write("""wafer_id,test_id,wire_id,pull_force_grams,failure_mode,is_sampling,test_timestamp
W001,T001,W001_01,8.5,no_failure,False,2024-01-15T10:00:00
W001,T002,W001_02,8.2,no_failure,False,2024-01-15T10:01:00
W001,T003,W001_03,7.8,no_failure,False,2024-01-15T10:02:00
W002,T004,W002_01,7.5,no_failure,False,2024-01-15T10:30:00
W002,T005,W002_02,7.2,ball_lift,False,2024-01-15T10:31:00
W003,T006,W003_01,6.5,no_failure,False,2024-01-15T16:00:00
""")
    return csv_path
