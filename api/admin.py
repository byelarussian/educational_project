from django.contrib import admin
from .models import (
    Task, Category, TaskCategory, Product, ProductCategory,
    UserProfile, CartItem, Order, OrderItem,
)


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    """Админка категорий задач: поиск по имени, фильтр по дате создания."""
    list_display = ['name', 'description', 'color', 'created_at']
    list_filter = ['created_at']
    search_fields = ['name', 'description']
    ordering = ['name']


class TaskCategoryInline(admin.TabularInline):
    """Таблица категорий прямо на странице задачи: можно привязать несколько меток."""
    model = TaskCategory
    extra = 1


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    """Админка задач: фильтры по статусу/приоритету, вложенные категории."""
    list_display = ['title', 'status', 'priority', 'owner', 'created_at', 'due_date']
    list_filter = ['status', 'priority', 'created_at', 'owner']
    search_fields = ['title', 'description']
    ordering = ['-created_at']
    inlines = [TaskCategoryInline]

    def save_model(self, request, obj, form, change):
        """При создании задачи из админки владельцем ставится текущий сотрудник, а не чужой аккаунт."""
        if not change:  # If creating a new object
            obj.owner = request.user
        super().save_model(request, obj, form, change)


@admin.register(TaskCategory)
class TaskCategoryAdmin(admin.ModelAdmin):
    """Отдельный список связей задача↔категория, если нужно править их без карточки задачи."""
    list_display = ['task', 'category']
    list_filter = ['category']
    search_fields = ['task__title', 'category__name']


@admin.register(ProductCategory)
class ProductCategoryAdmin(admin.ModelAdmin):
    """Категории витрины: имя, slug, исходный URL FamShop."""
    list_display = ['name', 'slug', 'url', 'created_at']
    search_fields = ['name', 'slug']
    ordering = ['name']


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    """Товары витрины: бренд, цена, категория, поиск по названию и ссылке."""
    list_display = ['title', 'brand', 'price', 'currency', 'category', 'updated_at']
    list_filter = ['brand', 'currency', 'category']
    search_fields = ['title', 'brand', 'tag', 'product_url']
    ordering = ['-updated_at']


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    """Профили покупателей: телефон и адрес доставки."""
    list_display = ['user', 'phone', 'city', 'street']
    search_fields = ['user__username', 'phone', 'city']


@admin.register(CartItem)
class CartItemAdmin(admin.ModelAdmin):
    """Текущие корзины пользователей: кто что положил и сколько."""
    list_display = ['user', 'product', 'quantity', 'updated_at']
    list_filter = ['updated_at']


class OrderItemInline(admin.TabularInline):
    """Позиции заказа на карточке заказа; extra=0 — пустых строк не добавляем."""
    model = OrderItem
    extra = 0


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    """Заказы магазина: номер, статус, сумма; внутри — состав заказа."""
    list_display = ['number', 'user', 'status', 'payment_method', 'total', 'created_at']
    list_filter = ['status', 'payment_method', 'created_at']
    search_fields = ['number', 'user__username', 'phone']
    inlines = [OrderItemInline]
