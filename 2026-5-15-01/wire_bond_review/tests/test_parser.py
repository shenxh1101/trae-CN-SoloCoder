import pytest
import os
from wire_bond_review.parser import DataParser, load_dataset


class TestDataParser:
    def test_parse_bonding_params(self, bonding_params_csv):
        parser = DataParser()
        result = parser.parse_bonding_params_csv(bonding_params_csv)
        
        assert len(result) == 3
        assert "W001" in result
        assert len(result["W001"]) == 1
        assert result["W001"][0].power == 150

    def test_parse_pull_tests(self, pull_tests_csv):
        parser = DataParser()
        result = parser.parse_pull_tests_csv(pull_tests_csv)
        
        assert len(result) == 3
        assert "W001" in result
        assert len(result["W001"]) == 3
        assert result["W001"][0].pull_force_grams == 8.5

    def test_load_data(self, bonding_params_csv, pull_tests_csv):
        parser = DataParser()
        dataset = parser.load_data(bonding_params_csv, pull_tests_csv)
        
        assert len(dataset.wafers) == 3
        assert "W001" in dataset.wafers
        assert "W002" in dataset.wafers
        assert "W003" in dataset.wafers

    def test_load_dataset_function(self, bonding_params_csv, pull_tests_csv):
        dataset = load_dataset(bonding_params_csv, pull_tests_csv)
        
        assert len(dataset.wafers) == 3


class TestEnumParsing:
    def test_parse_shift_morning(self, bonding_params_csv):
        parser = DataParser()
        result = parser.parse_bonding_params_csv(bonding_params_csv)
        assert result["W001"][0].shift.value == "morning"

    def test_parse_shift_afternoon(self, bonding_params_csv):
        parser = DataParser()
        result = parser.parse_bonding_params_csv(bonding_params_csv)
        assert result["W003"][0].shift.value == "afternoon"

    def test_parse_package_type_standard(self, bonding_params_csv):
        parser = DataParser()
        result = parser.parse_bonding_params_csv(bonding_params_csv)
        assert result["W001"][0].package_type.value == "standard"

    def test_parse_package_type_stacked(self, bonding_params_csv):
        parser = DataParser()
        result = parser.parse_bonding_params_csv(bonding_params_csv)
        assert result["W003"][0].package_type.value == "stacked"

    def test_parse_failure_mode_no_failure(self, pull_tests_csv):
        parser = DataParser()
        result = parser.parse_pull_tests_csv(pull_tests_csv)
        assert result["W001"][0].failure_mode.value == "no_failure"

    def test_parse_failure_mode_ball_lift(self, pull_tests_csv):
        parser = DataParser()
        result = parser.parse_pull_tests_csv(pull_tests_csv)
        assert result["W002"][1].failure_mode.value == "ball_lift"
