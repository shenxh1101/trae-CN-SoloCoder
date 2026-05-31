import os
import requests


def calculate_sum(a: int, b: int) -> int:
    """Calculate sum of two integers"""
    return a + b


def get_user_data(user_id: int) -> dict:
    """Fetch user data from API"""
    response = requests.get(f"https://api.example.com/users/{user_id}")
    if response.status_code == 200:
        return response.json()
    else:
        return {}


class Calculator:
    """A simple calculator class"""
    
    def __init__(self, initial_value: int = 0):
        self.value = initial_value
    
    def add(self, amount: int) -> int:
        """Add amount to value"""
        self.value += amount
        return self.value
    
    def multiply(self, factor: int) -> int:
        """Multiply value by factor"""
        if factor == 0:
            return 0
        elif factor < 0:
            raise ValueError("Factor cannot be negative")
        self.value *= factor
        return self.value
    
    def divide(self, divisor: int) -> float:
        """Divide value by divisor"""
        if divisor == 0:
            raise ValueError("Cannot divide by zero")
        result = self.value / divisor
        self.value = result
        return result
