from django.db import models
from django.contrib.auth.models import User
from django.utils.text import slugify


class Task(models.Model):
    """Задача текущего пользователя: заголовок, статус, приоритет и срок.

    Связана с владельцем (User) и с категориями через промежуточную таблицу TaskCategory.
    Используется менеджером задач на фронтенде (/tasks).
    """
    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
    ]

    STATUS_CHOICES = [
        ('todo', 'To Do'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
    ]

    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='medium')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='todo')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    due_date = models.DateTimeField(null=True, blank=True)
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='tasks')
    categories = models.ManyToManyField('Category', through='TaskCategory', related_name='tasks', blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        """Человекочитаемое имя задачи в админке и отладке."""
        return self.title


class Category(models.Model):
    """Категория для группировки задач (название, описание, цвет метки)."""
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    color = models.CharField(max_length=7, default='#007bff')  # Hex color code
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = "Categories"
        ordering = ['name']

    def __str__(self):
        """Возвращает название категории для отображения в админке."""
        return self.name


class TaskCategory(models.Model):
    """Связь many-to-many между задачей и категорией: одна пара task+category уникальна."""
    task = models.ForeignKey(Task, on_delete=models.CASCADE)
    category = models.ForeignKey(Category, on_delete=models.CASCADE)

    class Meta:
        unique_together = ['task', 'category']


class ProductCategory(models.Model):
    """Категория витрины магазина (головные уборы, одежда и т.д.), часто создаётся парсером FamShop."""
    name = models.CharField(max_length=200, unique=True)
    slug = models.SlugField(max_length=200, unique=True)
    url = models.URLField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = 'Product Categories'
        ordering = ['name']

    def __str__(self):
        """Возвращает название товарной категории."""
        return self.name

    def save(self, *args, **kwargs):
        """Перед записью в БД заполняет slug из названия, если slug ещё пустой."""
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)


class Product(models.Model):
    """Товар витрины: цена, бренд, ссылка на оригинал, картинка и категория.

    Уникальность задаётся product_url — повторный парсинг обновляет ту же карточку.
    """
    title = models.CharField(max_length=300)
    slug = models.SlugField(max_length=300, blank=True)
    product_url = models.URLField(unique=True)
    image_url = models.URLField(blank=True)
    price = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    currency = models.CharField(max_length=10, blank=True)
    brand = models.CharField(max_length=200, blank=True)
    tag = models.CharField(max_length=100, blank=True)
    category = models.ForeignKey(ProductCategory, on_delete=models.SET_NULL, null=True, blank=True, related_name='products')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']

    def __str__(self):
        """Возвращает название товара."""
        return self.title

    def save(self, *args, **kwargs):
        """Перед записью заполняет slug из названия товара, если его ещё нет."""
        if not self.slug:
            self.slug = slugify(self.title)
        super().save(*args, **kwargs)


class UserProfile(models.Model):
    """Расширение аккаунта Django User: телефон и адрес доставки для оформления заказа."""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    phone = models.CharField(max_length=32, blank=True)
    city = models.CharField(max_length=120, blank=True)
    street = models.CharField(max_length=200, blank=True)
    apartment = models.CharField(max_length=50, blank=True)
    postal_code = models.CharField(max_length=20, blank=True)

    def __str__(self):
        """Подпись профиля в админке: Profile <логин>."""
        return f'Profile {self.user.username}'

    @property
    def has_delivery_address(self):
        """True, если заполнены телефон, город и улица — минимум для checkout."""
        return bool(self.phone and self.city and self.street)


class CartItem(models.Model):
    """Позиция корзины: один товар пользователя и его количество. Пара user+product уникальна."""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='cart_items')
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='cart_items')
    quantity = models.PositiveIntegerField(default=1)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['user', 'product']
        ordering = ['-created_at']

    def __str__(self):
        """Кратко показывает, чей это товар в корзине."""
        return f'{self.user.username} × {self.product.title}'

    @property
    def line_total(self):
        """Сумма позиции: цена товара × количество. Если цены нет — 0."""
        if self.product.price is None:
            return 0
        return self.product.price * self.quantity


class Order(models.Model):
    """Оформленный заказ: снимок контактов/адреса, статус доставки и итоговая сумма.

    Позиции корзины копируются в OrderItem, после чего корзина очищается.
    """
    STATUS_CHOICES = [
        ('pending', 'Оформлен'),
        ('processing', 'В сборке'),
        ('shipped', 'В пути'),
        ('delivered', 'Доставлен'),
        ('cancelled', 'Отменён'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='orders')
    number = models.CharField(max_length=24, unique=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    first_name = models.CharField(max_length=150, blank=True)
    last_name = models.CharField(max_length=150, blank=True)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=32, blank=True)
    city = models.CharField(max_length=120, blank=True)
    street = models.CharField(max_length=200, blank=True)
    apartment = models.CharField(max_length=50, blank=True)
    postal_code = models.CharField(max_length=20, blank=True)
    total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        """Номер заказа (например FAM260904AB12CD) для админки и кабинета."""
        return self.number


class OrderItem(models.Model):
    """Строка заказа: копия названия, цены и картинки на момент покупки.

    product может стать NULL, если товар удалят из каталога — история заказа сохранится.
    """
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.SET_NULL, null=True, blank=True, related_name='order_items')
    title = models.CharField(max_length=300)
    image_url = models.URLField(blank=True)
    price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    currency = models.CharField(max_length=10, blank=True, default='₽')
    quantity = models.PositiveIntegerField(default=1)

    def __str__(self):
        """Показывает номер заказа и название позиции."""
        return f'{self.order.number}: {self.title}'

    @property
    def line_total(self):
        """Стоимость строки заказа: зафиксированная цена × количество."""
        return self.price * self.quantity
