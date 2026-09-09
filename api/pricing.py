from decimal import Decimal

# Те же витринные цены, что на фронте (StoreProductCard): 800 / 1000 / 1500 ₽.
DISPLAY_PRICES = (Decimal('800'), Decimal('1000'), Decimal('1500'))


def resolve_product_price(product):
    """Стабильная цена витрины по id товара (или по названию/URL, если id нет)."""
    if product is None:
        return DISPLAY_PRICES[0]

    seed = getattr(product, 'id', None)
    if not seed:
        text = getattr(product, 'title', None) or getattr(product, 'product_url', None) or 'fam'
        seed = sum(ord(char) for char in str(text))

    return DISPLAY_PRICES[int(seed) % len(DISPLAY_PRICES)]
