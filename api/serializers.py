from django.utils import timezone
from rest_framework import serializers
from django.contrib.auth.models import User
from .models import (
    Task, Category, Product, ProductCategory,
    UserProfile, CartItem, Order, OrderItem,
)


def get_or_create_profile(user):
    """Находит профиль пользователя или создаёт пустой, если его ещё нет.

    Нужен, чтобы кабинет и сериализаторы всегда могли читать телефон и адрес,
    даже у старых аккаунтов, созданных до появления UserProfile.
    """
    profile, _ = UserProfile.objects.get_or_create(user=user)
    return profile


class UserSerializer(serializers.ModelSerializer):
    """Отдаёт данные аккаунта вместе с полями профиля (телефон, адрес).

    Поля профиля не лежат в таблице User — их подмешивают методы get_*.
    """
    phone = serializers.SerializerMethodField()
    city = serializers.SerializerMethodField()
    street = serializers.SerializerMethodField()
    apartment = serializers.SerializerMethodField()
    postal_code = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'phone', 'city', 'street', 'apartment', 'postal_code',
        ]

    def get_phone(self, obj):
        """Телефон из профиля пользователя."""
        return get_or_create_profile(obj).phone

    def get_city(self, obj):
        """Город доставки из профиля."""
        return get_or_create_profile(obj).city

    def get_street(self, obj):
        """Улица и дом из профиля."""
        return get_or_create_profile(obj).street

    def get_apartment(self, obj):
        """Квартира из профиля."""
        return get_or_create_profile(obj).apartment

    def get_postal_code(self, obj):
        """Почтовый индекс из профиля."""
        return get_or_create_profile(obj).postal_code


class ProfileUpdateSerializer(serializers.Serializer):
    """Принимает PATCH личного кабинета: имя, email, телефон и адрес.

    Часть полей пишет в User, часть — в связанный UserProfile.
    """
    first_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    last_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    email = serializers.EmailField(required=False, allow_blank=True)
    phone = serializers.CharField(max_length=32, required=False, allow_blank=True)
    city = serializers.CharField(max_length=120, required=False, allow_blank=True)
    street = serializers.CharField(max_length=200, required=False, allow_blank=True)
    apartment = serializers.CharField(max_length=50, required=False, allow_blank=True)
    postal_code = serializers.CharField(max_length=20, required=False, allow_blank=True)

    def update(self, instance, validated_data):
        """Сохраняет переданные поля в User и UserProfile, остальное не трогает."""
        for field in ('first_name', 'last_name', 'email'):
            if field in validated_data:
                setattr(instance, field, validated_data[field])
        instance.save()

        profile = get_or_create_profile(instance)
        for field in ('phone', 'city', 'street', 'apartment', 'postal_code'):
            if field in validated_data:
                setattr(profile, field, validated_data[field])
        profile.save()
        return instance


class UserRegistrationSerializer(serializers.ModelSerializer):
    """Регистрация: проверяет совпадение паролей и создаёт пользователя через create_user."""
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'password_confirm', 'first_name', 'last_name']

    def validate(self, data):
        """Сравнивает password и password_confirm; при несовпадении возвращает ошибку валидации."""
        if data['password'] != data.pop('password_confirm'):
            raise serializers.ValidationError({'password': 'Passwords do not match'})
        return data

    def create(self, validated_data):
        """Создаёт пользователя с хешированным паролем (не сохраняет пароль открытым текстом)."""
        return User.objects.create_user(**validated_data)


class CategorySerializer(serializers.ModelSerializer):
    """JSON категории задач: id, имя, описание, цвет, дата создания."""
    class Meta:
        model = Category
        fields = ['id', 'name', 'description', 'color', 'created_at']


class TaskSerializer(serializers.ModelSerializer):
    """Полное представление задачи для чтения: владелец, категории и вычисляемые поля срока."""
    owner = UserSerializer(read_only=True)
    categories = CategorySerializer(many=True, read_only=True)
    is_overdue = serializers.SerializerMethodField()
    days_until_due = serializers.SerializerMethodField()

    class Meta:
        model = Task
        fields = [
            'id', 'title', 'description', 'priority', 'status',
            'created_at', 'updated_at', 'due_date', 'owner', 'categories',
            'is_overdue', 'days_until_due',
        ]
        read_only_fields = ['created_at', 'updated_at', 'owner', 'is_overdue', 'days_until_due']

    def get_is_overdue(self, obj):
        """True, если у задачи есть срок и он уже прошёл."""
        return bool(obj.due_date and obj.due_date < timezone.now())

    def get_days_until_due(self, obj):
        """Сколько полных дней осталось до срока; None если срока нет, 0 если срок уже наступил."""
        if not obj.due_date:
            return None
        delta = obj.due_date - timezone.now()
        return max(delta.days, 0)

    def create(self, validated_data):
        """Создаёт задачу и сразу ставит владельцем текущего пользователя из request."""
        validated_data['owner'] = self.context['request'].user
        return super().create(validated_data)


class TaskCreateUpdateSerializer(serializers.ModelSerializer):
    """Входные данные создания/правки задачи: поля задачи плюс список id категорий."""
    category_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False
    )

    class Meta:
        model = Task
        fields = [
            'title', 'description', 'priority', 'status',
            'due_date', 'category_ids'
        ]

    def create(self, validated_data):
        """Создаёт задачу текущего пользователя и привязывает выбранные категории."""
        category_ids = validated_data.pop('category_ids', [])
        validated_data['owner'] = self.context['request'].user
        task = Task.objects.create(**validated_data)

        if category_ids:
            categories = Category.objects.filter(id__in=category_ids)
            task.categories.set(categories)

        return task

    def update(self, instance, validated_data):
        """Обновляет поля задачи; категории меняет только если category_ids передали явно."""
        category_ids = validated_data.pop('category_ids', None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if category_ids is not None:
            categories = Category.objects.filter(id__in=category_ids)
            instance.categories.set(categories)

        return instance


class ProductCategorySerializer(serializers.ModelSerializer):
    """Категория витрины плюс количество товаров в ней."""
    products_count = serializers.SerializerMethodField()

    class Meta:
        model = ProductCategory
        fields = ['id', 'name', 'slug', 'url', 'created_at', 'products_count']
        read_only_fields = ['slug', 'created_at', 'products_count']

    def get_products_count(self, obj):
        """Сколько товаров привязано к этой категории."""
        return obj.products.count()


class ProductSerializer(serializers.ModelSerializer):
    """Карточка товара для витрины, корзины и каталога: цена, бренд, вложенная категория."""
    category = ProductCategorySerializer(read_only=True)

    class Meta:
        model = Product
        fields = [
            'id', 'title', 'slug', 'product_url', 'image_url', 'price',
            'currency', 'brand', 'tag', 'category', 'created_at', 'updated_at'
        ]
        read_only_fields = ['slug', 'created_at', 'updated_at']


class CartItemSerializer(serializers.ModelSerializer):
    """Позиция корзины: товар, количество и сумма строки строкой (чтобы JSON не потерял копейки)."""
    product = ProductSerializer(read_only=True)
    line_total = serializers.SerializerMethodField()

    class Meta:
        model = CartItem
        fields = ['id', 'product', 'quantity', 'line_total', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']

    def get_line_total(self, obj):
        """Сумма позиции как строка, например '9000.00'."""
        return str(obj.line_total)


class CartAddSerializer(serializers.Serializer):
    """Тело POST /cart/: какой товар и сколько штук добавить."""
    product_id = serializers.IntegerField()
    quantity = serializers.IntegerField(min_value=1, default=1, required=False)


class CartQuantitySerializer(serializers.Serializer):
    """Тело PATCH /cart/:id/ — новое количество позиции, не меньше 1."""
    quantity = serializers.IntegerField(min_value=1)


class OrderItemSerializer(serializers.ModelSerializer):
    """Строка заказа для кабинета: снимок товара и сумма строки."""
    line_total = serializers.SerializerMethodField()

    class Meta:
        model = OrderItem
        fields = ['id', 'product', 'title', 'image_url', 'price', 'currency', 'quantity', 'line_total']

    def get_line_total(self, obj):
        """Сумма строки заказа строкой."""
        return str(obj.line_total)


class OrderSerializer(serializers.ModelSerializer):
    """Заказ целиком: статус, контакты, состав и человекочитаемый адрес одной строкой."""
    items = OrderItemSerializer(many=True, read_only=True)
    status_label = serializers.CharField(source='get_status_display', read_only=True)
    address_line = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            'id', 'number', 'status', 'status_label', 'first_name', 'last_name',
            'email', 'phone', 'city', 'street', 'apartment', 'postal_code',
            'address_line', 'total', 'items', 'created_at', 'updated_at',
        ]

    def get_address_line(self, obj):
        """Склеивает город, улицу, квартиру и индекс в одну строку для экрана заказа."""
        parts = [obj.city, obj.street]
        if obj.apartment:
            parts.append(f'кв. {obj.apartment}')
        if obj.postal_code:
            parts.append(obj.postal_code)
        return ', '.join(part for part in parts if part)
