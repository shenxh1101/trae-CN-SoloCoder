
from calculator import divide

import pytest






def test_divide_normal_positive_numbers():
    # Test division with positive integers
    
    result = divide(
        a=10, 
        b=2
    )
    
    assert result == 5.0
    
    



def test_divide_normal_negative_numerator():
    # Test division with negative numerator
    
    result = divide(
        a=-10, 
        b=2
    )
    
    assert result == -5.0
    
    



def test_divide_normal_negative_denominator():
    # Test division with negative denominator
    
    result = divide(
        a=10, 
        b=-2
    )
    
    assert result == -5.0
    
    



def test_divide_normal_both_negative():
    # Test division with both negative numbers
    
    result = divide(
        a=-10, 
        b=-2
    )
    
    assert result == 5.0
    
    



def test_divide_normal_float_result():
    # Test division resulting in float
    
    result = divide(
        a=7, 
        b=2
    )
    
    assert result == 3.5
    
    



def test_divide_boundary_zero_numerator():
    # Test division with zero numerator
    
    result = divide(
        a=0, 
        b=5
    )
    
    assert result == 0.0
    
    



def test_divide_boundary_large_numbers():
    # Test division with large numbers
    
    result = divide(
        a=1000000, 
        b=1000
    )
    
    assert result == 1000.0
    
    



def test_divide_boundary_small_numbers():
    # Test division with small result
    
    result = divide(
        a=1, 
        b=1000
    )
    
    assert result == 0.001
    
    



def test_divide_exception_divide_by_zero():
    # Test division by zero raises ValueError
    
    with pytest.raises(ValueError):
        divide(
            a=10, 
            b=0
        )
    



def test_divide_exception_zero_divided_by_zero():
    # Test zero divided by zero raises ValueError
    
    with pytest.raises(ValueError):
        divide(
            a=0, 
            b=0
        )
    




