"""Helper functions module - 重构版本"""

def calculate_total_with_discount(items):
    total = 0
    for item in items:
        if item.get('price'):
            total += item['price'] * item.get('quantity', 1)
    return _apply_volume_discount(total)

def _apply_volume_discount(total):
    if total > 100:
        total *= 0.9
    if total > 500:
        total *= 0.85
    return total

def calculate_product_total(products):
    return calculate_total_with_discount(products)

def calculate_order_total(orders):
    return calculate_total_with_discount(orders)
