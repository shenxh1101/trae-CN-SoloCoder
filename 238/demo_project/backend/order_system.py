class OrderRepository:
    def __init__(self, products=None, inventory=None):
        self.orders = []
        self._products = products or []
        self._inventory = inventory or {}

    def create_order(self, customer_id, items, payment_method, shipping_address):
        order_id = f"ORD{len(self.orders) + 1:06d}"
        total = self._calculate_total(items)
        order = {
            "id": order_id,
            "customer_id": customer_id,
            "items": items,
            "total": total,
            "status": "created",
            "payment_method": payment_method,
            "shipping_address": shipping_address,
        }
        self._update_inventory(items)
        self.orders.append(order)
        return order

    def _calculate_total(self, items):
        total = 0
        for item in items:
            product = next((p for p in self._products if p["id"] == item["product_id"]), None)
            if product:
                total += product["price"] * item["quantity"]
            else:
                raise ValueError(f"Product {item['product_id']} not found")
        return self._apply_discounts(total, len(items))

    def _apply_discounts(self, total, item_count):
        if total > 100:
            total *= 0.9
        if total > 500:
            total *= 0.85
        if item_count > 10:
            total *= 0.95
        return total

    def _update_inventory(self, items):
        for item in items:
            self._inventory[item["product_id"]] -= item["quantity"]


class PaymentProcessor:
    def __init__(self):
        self.payments = []

    def process_payment(self, order_id, amount, method):
        fee = self._calculate_fee(method, amount)
        net = amount - fee
        self.payments.append({
            "order_id": order_id,
            "amount": amount,
            "fee": fee,
            "net": net,
            "method": method,
        })
        return True

    def _calculate_fee(self, method, amount):
        if method == "credit_card":
            return amount * 0.02
        elif method == "paypal":
            return amount * 0.03
        elif method == "bank_transfer":
            return 5
        return 0


class RefundService:
    def __init__(self, payments):
        self._payments = payments
        self.refunds = []

    def refund_order(self, order_id, reason):
        payment = next((p for p in self._payments if p["order_id"] == order_id), None)
        if not payment:
            return None
        refund_amount = self._calculate_refund(reason, payment)
        self.refunds.append({
            "order_id": order_id,
            "amount": refund_amount,
            "reason": reason,
        })
        return refund_amount

    def _calculate_refund(self, reason, payment):
        if reason == "defective" or reason == "wrong_item":
            return payment["amount"]
        return payment["net"]


class ShippingService:
    def __init__(self, orders):
        self._orders = orders
        self.shipping = []

    def ship_order(self, order_id, address):
        order = next((o for o in self._orders if o["id"] == order_id), None)
        if not order:
            return None
        shipping_cost = self._calculate_shipping_cost(order["total"])
        shipment = {
            "order_id": order_id,
            "address": address,
            "cost": shipping_cost,
            "status": "shipped",
            "tracking": f"TRK{len(self.shipping) + 1:06d}",
        }
        self.shipping.append(shipment)
        return shipment

    def _calculate_shipping_cost(self, order_total):
        if order_total > 200:
            return 0
        elif order_total > 100:
            return 5
        return 10


class ReportGenerator:
    def __init__(self, orders, refunds, shipping, inventory, products):
        self._orders = orders
        self._refunds = refunds
        self._shipping = shipping
        self._inventory = inventory
        self._products = products

    def generate_report(self, start_date, end_date, report_type):
        generators = {
            "sales": self._generate_sales_report,
            "refunds": self._generate_refund_report,
            "inventory": self._generate_inventory_report,
            "shipping": self._generate_shipping_report,
        }
        generator = generators.get(report_type)
        if not generator:
            raise ValueError("Unknown report type")
        return generator(start_date, end_date)

    def _generate_sales_report(self, start_date, end_date):
        total = 0
        count = 0
        for order in self._orders:
            if "created_at" in order and start_date <= order["created_at"] <= end_date:
                total += order["total"]
                count += 1
        return {"total_sales": total, "order_count": count}

    def _generate_refund_report(self, start_date, end_date):
        total = 0
        count = 0
        for refund in self._refunds:
            if "date" in refund and start_date <= refund["date"] <= end_date:
                total += refund["amount"]
                count += 1
        return {"total_refunds": total, "count": count}

    def _generate_inventory_report(self, start_date, end_date):
        return {"inventory": self._inventory.copy(), "product_count": len(self._products)}

    def _generate_shipping_report(self, start_date, end_date):
        total_cost = 0
        count = 0
        for shipment in self._shipping:
            if "shipped_at" in shipment and start_date <= shipment["shipped_at"] <= end_date:
                total_cost += shipment["cost"]
                count += 1
        return {"total_shipping_cost": total_cost, "shipment_count": count}
