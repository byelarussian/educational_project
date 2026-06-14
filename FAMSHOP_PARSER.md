# FamShop Parser Documentation

## Overview
The FamShop parser automatically scrapes product data from [famshop.ru](https://famshop.ru/) and stores it in the Django database.

## Features
- Parses product categories and their URLs
- Extracts product details: title, price, brand, image URL, tags
- Handles multi-page categories with automatic pagination
- Updates existing products when re-parsing
- Manages product categories separately from task categories

## Data Models

### ProductCategory
- `name`: Category name (e.g., "Головные уборы", "Одежда и аксессуары")
- `slug`: URL-safe slug (auto-generated)
- `url`: Original category URL
- `created_at`: Creation timestamp

### Product
- `title`: Product name/title
- `slug`: URL-safe slug (auto-generated)
- `product_url`: Direct link to product page (unique)
- `image_url`: Product image URL
- `price`: Price in RUB (decimal field)
- `currency`: Currency symbol (e.g., "₽")
- `brand`: Brand/collection name
- `tag`: Product tag (e.g., "Новинка", "Скидка")
- `category`: Foreign key to ProductCategory
- `created_at`: Creation timestamp
- `updated_at`: Last update timestamp

## Usage

### Run the Parser

```bash
# Parse default categories (all available pages)
python manage.py parse_famshop

# Limit parsing to first 3 pages per category
python manage.py parse_famshop --max-pages=3

# Parse specific URLs
python manage.py parse_famshop --category-urls https://famshop.ru/product-category/golovnye-ubory/
```

### Default Categories
The parser scrapes these categories by default:
- `https://famshop.ru/product-category/golovnye-ubory/` (Headwear)
- `https://famshop.ru/product-category/odezhda-i-aksessuary/` (Clothing & Accessories)

### Parser Options
- `--category-urls`: List of category URLs to parse (space-separated)
- `--max-pages`: Maximum number of pages to parse per category (default: 5)

## API Endpoints

### Product List
```
GET /api/v1/products/
GET /api/v1/products/?page=1
GET /api/v1/products/?search=NEW+ERA
GET /api/v1/products/?brand=New%20Era
GET /api/v1/products/?category=golovnye-ubory
GET /api/v1/products/?price__lt=5000
```

**Query Parameters:**
- `search`: Search by title, brand, or tag
- `brand`: Filter by brand
- `currency`: Filter by currency
- `category`: Filter by category slug
- `tag`: Filter by product tag
- `page`: Pagination (default: 1, 20 items per page)
- `ordering`: Sort by field (`price`, `-updated_at`, `-created_at`)

### Product Categories List
```
GET /api/v1/product-categories/
GET /api/v1/product-categories/?search=головные
```

### Products Grouped by Category
```
GET /api/v1/products/by_category/
```

Returns products organized by category with counts.

## HTML Parsing Details

### Selectors Used
- Product list: `<li class="product-card">`
- Product image: `<img src="..." class="attachment-...">`
- Product title: `<h3 class="product-card__name"><a>...`
- Product price: `<span class="woocommerce-Price-amount">`
- Brand info: `<div class="product-card__brands">`
- Tags: `<span class="product-card__tag">`

### Price Extraction
Prices are parsed from HTML entities like:
```html
<bdi>7,499.00&nbsp;<span class="woocommerce-Price-currencySymbol">&#8381;</span></bdi>
```

The parser normalizes commas to dots for float conversion.

## Data Quality

### Current Status (as of June 14, 2026)
- **Categories**: 2 (Headwear, Clothing & Accessories)
- **Total Products**: 58
  - Headwear: 36 products
  - Clothing & Accessories: 22 products

### Data Completeness
- **Price**: Not always available (some products marked as "Contact for price")
- **Image URL**: Usually present for main catalog products
- **Brand**: Extracted from product card brands section
- **Tags**: Limited to single tag per product (e.g., "Новинка" for new arrivals)

## Performance

### Parsing Speed
- ~1 page per 2-3 seconds (depends on network)
- Default max-pages=5: ~10-15 seconds per category
- Full parsing with updates: handles duplicates efficiently

### Database
- Uses `update_or_create()` to avoid duplicates
- Unique constraint on `product_url` field
- Efficient pagination with 20 items per page

## Admin Interface

Access parsed data via Django admin:
```
http://localhost:8000/admin/api/productcategory/
http://localhost:8000/admin/api/product/
```

## Notes

- Parser does NOT require external dependencies (uses built-in `urllib` and `re`)
- All parsing is UTF-8 safe with proper encoding handling
- Currency symbol is preserved as stored (usually "₽" for RUB)
- Pagination detection: stops when no products found on page
- HTTP timeout: 20 seconds per page request

## Future Enhancements

Potential improvements:
- Extract product descriptions
- Parse rating/reviews
- Handle sales/discounts
- Extract size/color variations
- Add scheduling/periodic parsing
- Implement rate limiting for respectful scraping
