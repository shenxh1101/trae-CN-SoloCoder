import pytest
from datetime import datetime
from wire_bond_review.models import (
    BondingParams, PullTest, MachineProfile, WaferData,
    AnalysisDataset, ProcessWindow, ShiftType, PackageType, FailureMode
)


class TestBondingParams:
    def test_create_bonding_params(self, sample_bonding_params):
        assert sample_bonding_params.wafer_id == "W001"
        assert sample_bonding_params.chip_model == "CHIP_A"
        assert sample_bonding_params.machine_id == "M01"
        assert sample_bonding_params.shift == ShiftType.MORNING
        assert sample_bonding_params.power == 150
        assert sample_bonding_params.time_us == 25
        assert sample_bonding_params.force_grams == 50
        assert sample_bonding_params.temp_celsius == 180


class TestPullTest:
    def test_create_pull_test(self, sample_pull_test):
        assert sample_pull_test.wafer_id == "W001"
        assert sample_pull_test.pull_force_grams == 8.5
        assert sample_pull_test.failure_mode == FailureMode.NO_FAILURE
        assert sample_pull_test.is_sampling == False


class TestMachineProfile:
    def test_create_machine_profile(self, sample_machine_profile):
        assert sample_machine_profile.machine_id == "M01"
        assert sample_machine_profile.total_bonds == 1500000
        assert sample_machine_profile.current_capillary_hours == 120.5
        assert sample_machine_profile.is_new_machine == False


class TestProcessWindow:
    def test_create_process_window(self, sample_process_window):
        assert sample_process_window.power_min == 140
        assert sample_process_window.power_max == 160
        assert sample_process_window.pull_force_spec == 8.0
        assert sample_process_window.pull_force_lower_limit == 6.0


class TestWaferData:
    def test_create_wafer(self, sample_wafer):
        assert sample_wafer.wafer_id == "W001"
        assert sample_wafer.chip_model == "CHIP_A"

    def test_avg_pull_force(self, sample_wafer):
        assert sample_wafer.avg_pull_force == 8.5

    def test_min_pull_force(self, sample_wafer):
        assert sample_wafer.min_pull_force == 8.5

    def test_failure_rate_no_failures(self, sample_wafer):
        assert sample_wafer.failure_rate == 0.0

    def test_avg_power(self, sample_wafer):
        assert sample_wafer.avg_power == 150


class TestAnalysisDataset:
    def test_create_dataset(self, sample_dataset):
        assert len(sample_dataset.wafers) == 1

    def test_add_wafer(self, sample_dataset):
        assert "W001" in sample_dataset.wafers

    def test_get_wafer(self, sample_dataset):
        retrieved = sample_dataset.get_wafer("W001")
        assert retrieved == sample_dataset.wafers["W001"]

    def test_get_all_wafer_ids(self, sample_dataset):
        ids = sample_dataset.get_all_wafer_ids()
        assert "W001" in ids

    def test_get_wafers_by_chip_model(self, sample_dataset):
        wafers = sample_dataset.get_wafers_by_chip_model("CHIP_A")
        assert len(wafers) == 1
        assert wafers[0].chip_model == "CHIP_A"

    def test_get_transition_batches_no_transition(self, sample_dataset):
        transitions = sample_dataset.get_transition_batches()
        assert len(transitions) == 0


class TestEnums:
    def test_shift_type_enum(self):
        assert ShiftType.MORNING.value == "morning"
        assert ShiftType.AFTERNOON.value == "afternoon"
        assert ShiftType.NIGHT.value == "night"

    def test_package_type_enum(self):
        assert PackageType.STANDARD.value == "standard"
        assert PackageType.STACKED.value == "stacked"
        assert PackageType.SIP.value == "sip"
        assert PackageType.FANOUT.value == "fanout"

    def test_failure_mode_enum(self):
        assert FailureMode.NO_FAILURE.value == "no_failure"
        assert FailureMode.BALL_LIFT.value == "ball_lift"
        assert FailureMode.WIRE_BREAK.value == "wire_break"
        assert FailureMode.HEEL_BREAK.value == "heel_break"
        assert FailureMode.PAD_DAMAGE.value == "pad_damage"
