import re
import urllib.request
from urllib.parse import urljoin

from django.core.management.base import BaseCommand
from api.models import Product, ProductCategory


class Command(BaseCommand):
    """Management-команда: скачивает категории famshop.ru и складывает товары в БД.

    Запуск: python manage.py parse_famshop [--max-pages 5] [--category-urls URL ...]
    """
    help = 'Parse famshop.ru categories and products into the local database'

    def add_arguments(self, parser):
        """Добавляет CLI-флаги: список URL категорий и лимит страниц на категорию."""
        parser.add_argument(
            '--category-urls',
            nargs='*',
            default=[
                'https://famshop.ru/product-category/golovnye-ubory/',
                'https://famshop.ru/product-category/odezhda-i-aksessuary/',
            ],
            help='Category page URLs to parse',
        )
        parser.add_argument(
            '--max-pages',
            type=int,
            default=5,
            help='Maximum number of pages to parse for each category',
        )

    def handle(self, *args, **options):
        """Точка входа команды: обходит каждую категорию и парсит её страницы."""
        category_urls = options['category_urls']
        max_pages = options['max_pages']

        for category_url in category_urls:
            self.stdout.write(self.style.MIGRATE_HEADING(f'Parsing category {category_url}'))
            category = self.get_or_create_category(category_url)
            self.parse_category(category, category_url, max_pages)

    def get_or_create_category(self, category_url):
        """Находит или создаёт ProductCategory по slug из URL; обновляет url, если он изменился."""
        name = self.extract_category_name(category_url)
        slug = self.slugify(name)
        category, created = ProductCategory.objects.get_or_create(
            slug=slug,
            defaults={'name': name, 'url': category_url},
        )
        if not created and category.url != category_url:
            category.url = category_url
            category.save()
        return category

    def extract_category_name(self, category_url):
        """Достаёт человекочитаемое имя категории из последнего сегмента URL."""
        path = category_url.rstrip('/').split('/')[-1]
        path = path.replace('product-category', '')
        return path.replace('-', ' ').strip() or 'famshop'

    def slugify(self, value):
        """Превращает строку в slug: нижний регистр, только латиница, цифры и дефисы."""
        return re.sub(r'[^a-z0-9-]+', '-', value.lower()).strip('-')

    def parse_category(self, category, category_url, max_pages):
        """Листает страницы категории, вытаскивает карточки товаров и сохраняет их."""
        page = 1
        while page <= max_pages:
            url = category_url if page == 1 else self.build_page_url(category_url, page)
            self.stdout.write(f'  Fetching page {page}: {url}')
            html = self.fetch_html(url)
            if not html:
                self.stdout.write(self.style.WARNING(f'  Failed to load page {page}'))
                break
            products = self.extract_products(html)
            if not products:
                self.stdout.write(self.style.NOTICE('  No products found on page, stopping.'))
                break
            for product_data in products:
                self.save_product(product_data, category)
            page += 1

    def build_page_url(self, category_url, page):
        """Собирает URL пагинации WooCommerce: .../page/2/, .../page/3/ и т.д."""
        return category_url.rstrip('/') + f'/page/{page}/'

    def fetch_html(self, url):
        """Скачивает HTML страницы; при ошибке сети пишет в stderr и возвращает None."""
        try:
            with urllib.request.urlopen(url, timeout=20) as resp:
                return resp.read().decode('utf-8', errors='replace')
        except Exception as exc:
            self.stderr.write(str(exc))
            return None

    def extract_products(self, html):
        """Парсит блоки <li class="product-card"> и собирает словари с полями товара."""
        product_blocks = re.findall(r'<li class="product-card">(.*?)</li>', html, re.S)
        products = []
        for block in product_blocks:
            product_url = self.extract_first_match(block, r'href="([^"]+)"')
            image_url = self.extract_first_match(block, r'<img[^>]+src="([^"]+)"')
            title = self.extract_first_match(block, r'<h3 class="product-card__name">.*?<a[^>]*>(.*?)</a>', re.S)
            price = self.extract_first_match(block, r'class="woocommerce-Price-amount amount">.*?<bdi>([0-9\s,.]+)&nbsp;')
            currency = self.extract_first_match(block, r'woocommerce-Price-currencySymbol">([^<]+)<')
            brand = self.extract_first_match(block, r'<div class="product-card__brands">(.*?)</div>', re.S)
            tag = self.extract_first_match(block, r'<span class="product-card__tag">(.*?)</span>', re.S)

            title = self.clean_text(title)
            brand = self.clean_text(brand)
            tag = self.clean_text(tag)
            price = self.parse_price(price)
            currency = currency.strip() if currency else ''

            if not product_url or not title:
                continue

            products.append({
                'product_url': urljoin('https://famshop.ru', product_url),
                'title': title,
                'image_url': image_url,
                'price': price,
                'currency': currency,
                'brand': brand,
                'tag': tag,
            })
        return products

    def extract_first_match(self, text, pattern, flags=0):
        """Возвращает первую группу regex или пустую строку, если совпадения нет."""
        match = re.search(pattern, text, flags)
        return match.group(1).strip() if match else ''

    def clean_text(self, value):
        """Убирает HTML-теги и лишние переводы строк из куска разметки."""
        return re.sub(r'<[^>]+>', '', value or '').replace('\n', ' ').replace('\r', ' ').strip()

    def parse_price(self, value):
        """Превращает строку цены ('4 500,00') в float или None, если разобрать нельзя."""
        if not value:
            return None
        normalized = value.replace(' ', '').replace(',', '.')
        try:
            return float(normalized)
        except ValueError:
            return None

    def save_product(self, data, category):
        """Создаёт товар или обновляет его по уникальному product_url и привязывает к категории."""
        product, created = Product.objects.update_or_create(
            product_url=data['product_url'],
            defaults={
                'title': data['title'],
                'image_url': data['image_url'] or '',
                'price': data['price'],
                'currency': data['currency'],
                'brand': data['brand'],
                'tag': data['tag'],
                'category': category,
            }
        )
        if created:
            self.stdout.write(self.style.SUCCESS(f"    Created product: {product.title}"))
        else:
            self.stdout.write(self.style.SUCCESS(f"    Updated product: {product.title}"))
