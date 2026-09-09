from decimal import Decimal

from django.core.management.base import BaseCommand

from api.models import Order, OrderItem
from api.pricing import resolve_product_price


class Command(BaseCommand):
    help = 'Пересчитывает цены позиций заказов по витринным 800/1000/1500 ₽'

    def handle(self, *args, **options):
        updated_items = 0
        for item in OrderItem.objects.select_related('product').all():
            if item.product_id:
                price = resolve_product_price(item.product)
            else:
                price = item.price or Decimal('0')
            if item.price != price:
                item.price = price
                item.save(update_fields=['price'])
                updated_items += 1

        updated_orders = 0
        for order in Order.objects.prefetch_related('items').all():
            total = sum((row.price * row.quantity for row in order.items.all()), Decimal('0'))
            if order.total != total:
                order.total = total
                order.save(update_fields=['total'])
                updated_orders += 1

        self.stdout.write(
            self.style.SUCCESS(
                f'Обновлено позиций: {updated_items}, заказов: {updated_orders}'
            )
        )
