import pytest
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from calculator import divide, calculate


class TestDivideCoverage:
    """Test cases for divide function with partial coverage"""
    
    def test_divide_normal(self):
        """Test normal division - covers happy path"""
        assert divide(10, 2) == 5.0
    
    def test_divide_negative(self):
        """Test division with negative numbers"""
        assert divide(-10, 2) == -5.0
        assert divide(10, -2) == -5.0
    
    def test_divide_float_result(self):
        """Test division resulting in float"""
        assert divide(7, 2) == 3.5
    
    # Note: We are NOT testing the b == 0 case intentionally
    # to show uncovered branch in coverage report


class TestCalculateCoverage:
    """Test cases for calculate function with partial coverage"""
    
    def test_calculate_add(self):
        """Test calculate with add operation"""
        assert calculate('add', 5, 3) == 8
    
    def test_calculate_subtract(self):
        """Test calculate with subtract operation"""
        assert calculate('subtract', 10, 3) == 7
    
    # Note: We are NOT testing 'multiply', 'divide', and invalid operations
    # to show uncovered branches


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
