from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Task, Category, TaskCategory


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name']


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'description', 'color', 'created_at']


class TaskSerializer(serializers.ModelSerializer):
    owner = UserSerializer(read_only=True)
    categories = CategorySerializer(many=True, read_only=True)
    
    class Meta:
        model = Task
        fields = [
            'id', 'title', 'description', 'priority', 'status',
            'created_at', 'updated_at', 'due_date', 'owner', 'categories'
        ]
        read_only_fields = ['created_at', 'updated_at', 'owner']
    
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
        task = super().create(validated_data)
        
        if category_ids:
            categories = Category.objects.filter(id__in=category_ids)
            task.categories.set(categories)
        
        return task
    
    def update(self, instance, validated_data):
        category_ids = validated_data.pop('category_ids', None)
        task = super().update(instance, validated_data)
        
        if category_ids is not None:
            categories = Category.objects.filter(id__in=category_ids)
            task.categories.set(categories)
        
        return task
