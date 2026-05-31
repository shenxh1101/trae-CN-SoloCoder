from typing import Optional, Union, List


def add(a: int, b: int) -> int:
    """Add two integers"""
    return a + b


def subtract(a: int, b: int) -> int:
    """Subtract b from a"""
    return a - b


def multiply(a: int, b: int) -> int:
    """Multiply two integers"""
    return a * b


def divide(a: int, b: int) -> float:
    """Divide a by b, raises ValueError if b is zero"""
    if b == 0:
        raise ValueError("Cannot divide by zero")
    return a / b


def calculate(operation: str, a: int, b: int) -> Optional[Union[int, float]]:
    """
    Perform calculation based on operation string
    
    Args:
        operation: One of 'add', 'subtract', 'multiply', 'divide'
        a: First operand
        b: Second operand
    
    Returns:
        Calculation result or None if operation is invalid
    """
    if operation == 'add':
        return add(a, b)
    elif operation == 'subtract':
        return subtract(a, b)
    elif operation == 'multiply':
        return multiply(a, b)
    elif operation == 'divide':
        return divide(a, b)
    else:
        return None


def is_prime(n: int) -> bool:
    """
    Check if a number is prime
    
    Args:
        n: Integer to check
    
    Returns:
        True if n is prime, False otherwise
    """
    if n < 2:
        return False
    if n == 2:
        return True
    if n % 2 == 0:
        return False
    for i in range(3, int(n ** 0.5) + 1, 2):
        if n % i == 0:
            return False
    return True


def fibonacci(n: int) -> List[int]:
    """
    Generate Fibonacci sequence up to n terms
    
    Args:
        n: Number of terms to generate
    
    Returns:
        List of Fibonacci numbers
    
    Raises:
        ValueError: If n is negative
    """
    if n < 0:
        raise ValueError("n must be non-negative")
    if n == 0:
        return []
    if n == 1:
        return [0]
    result = [0, 1]
    for i in range(2, n):
        result.append(result[i-1] + result[i-2])
    return result


def get_number_category(n: int) -> str:
    """
    Categorize a number
    
    Args:
        n: Integer to categorize
    
    Returns:
        Category string: 'negative', 'zero', 'small_positive', or 'large_positive'
    """
    if n < 0:
        return 'negative'
    elif n == 0:
        return 'zero'
    elif n < 100:
        return 'small_positive'
    else:
        return 'large_positive'


class StringProcessor:
    """A simple string processing class"""
    
    def __init__(self, text: str = ""):
        self.text = text
    
    def reverse(self) -> str:
        """Reverse the text"""
        return self.text[::-1]
    
    def to_uppercase(self) -> str:
        """Convert to uppercase"""
        return self.text.upper()
    
    def to_lowercase(self) -> str:
        """Convert to lowercase"""
        return self.text.lower()
    
    def count_words(self) -> int:
        """Count the number of words"""
        if not self.text.strip():
            return 0
        return len(self.text.split())
    
    def truncate(self, max_length: int) -> str:
        """
        Truncate text to max_length
        
        Args:
            max_length: Maximum length of output string
        
        Returns:
            Truncated string with '...' if needed
        """
        if max_length <= 0:
            raise ValueError("max_length must be positive")
        if len(self.text) <= max_length:
            return self.text
        if max_length <= 3:
            return '.' * max_length
        return self.text[:max_length-3] + '...'
    
    def contains(self, substring: str, case_sensitive: bool = True) -> bool:
        """
        Check if substring is present in text
        
        Args:
            substring: Substring to search for
            case_sensitive: Whether to perform case-sensitive search
        
        Returns:
            True if substring is found
        """
        if not case_sensitive:
            return substring.lower() in self.text.lower()
        return substring in self.text
