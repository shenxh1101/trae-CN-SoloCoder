import pytest
from unittest.mock import patch, MagicMock
from mymodule import my_function, MyClass


def test_my_function_with_valid_input():
    """Test my_function with normal valid input values."""
    result = my_function(a=10, b=20)
    assert result == 30


def test_my_function_with_zero_values():
    # Test boundary condition with zero values
    result = my_function(a=0, b=0)
    assert result == 0


def test_my_function_raises_type_error():
    with pytest.raises(TypeError):
        my_function(a="invalid", b=20)


class TestMyClass:
    @pytest.fixture
    def instance(self):
        return MyClass()

    def test_my_class_method(self, instance):
        """Test the method of MyClass."""
        result = instance.method(42)
        assert result == 42
