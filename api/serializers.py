from django.utils import timezone
from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Task, Category, Product, ProductCategory


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name']


class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'password_confirm', 'first_name', 'last_name']

    def validate(self, data):
        if data['password'] != data.pop('password_confirm'):
            raise serializers.ValidationError({'password': 'Passwords do not match'})
        return data

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'description', 'color', 'created_at']


class TaskSerializer(serializers.ModelSerializer):
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
        return bool(obj.due_date and obj.due_date < timezone.now())

    def get_days_until_due(self, obj):
        if not obj.due_date:
            return None
        delta = obj.due_date - timezone.now()
        return max(delta.days, 0)

    def create(self, validated_data):
        validated_data['owner'] = self.context['request'].user
        return super().create(validated_data)


class TaskCreateUpdateSerializer(serializers.ModelSerializer):
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
        category_ids = validated_data.pop('category_ids', [])
        validated_data['owner'] = self.context['request'].user
        task = Task.objects.create(**validated_data)

        if category_ids:
            categories = Category.objects.filter(id__in=category_ids)
            task.categories.set(categories)

        return task

    def update(self, instance, validated_data):
        category_ids = validated_data.pop('category_ids', None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if category_ids is not None:
            categories = Category.objects.filter(id__in=category_ids)
            instance.categories.set(categories)

        return instance


class ProductCategorySerializer(serializers.ModelSerializer):
    products_count = serializers.SerializerMethodField()

    class Meta:
        model = ProductCategory
        fields = ['id', 'name', 'slug', 'url', 'created_at', 'products_count']
        read_only_fields = ['slug', 'created_at', 'products_count']

    def get_products_count(self, obj):
        return obj.products.count()


class ProductSerializer(serializers.ModelSerializer):
    category = ProductCategorySerializer(read_only=True)

    class Meta:
        model = Product
        fields = [
            'id', 'title', 'slug', 'product_url', 'image_url', 'price',
            'currency', 'brand', 'tag', 'category', 'created_at', 'updated_at'
        ]
        read_only_fields = ['slug', 'created_at', 'updated_at']

