from django.contrib import admin
from .models import Task, Category, TaskCategory, Product, ProductCategory


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'description', 'color', 'created_at']
    list_filter = ['created_at']
    search_fields = ['name', 'description']
    ordering = ['name']


class TaskCategoryInline(admin.TabularInline):
    model = TaskCategory
    extra = 1


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ['title', 'status', 'priority', 'owner', 'created_at', 'due_date']
    list_filter = ['status', 'priority', 'created_at', 'owner']
    search_fields = ['title', 'description']
    ordering = ['-created_at']
    inlines = [TaskCategoryInline]
    
    def save_model(self, request, obj, form, change):
        if not change:  # If creating a new object
            obj.owner = request.user
        super().save_model(request, obj, form, change)


@admin.register(TaskCategory)
class TaskCategoryAdmin(admin.ModelAdmin):
    list_display = ['task', 'category']
    list_filter = ['category']
    search_fields = ['task__title', 'category__name']


@admin.register(ProductCategory)
class ProductCategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'slug', 'url', 'created_at']
    search_fields = ['name', 'slug']
    ordering = ['name']


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ['title', 'brand', 'price', 'currency', 'category', 'updated_at']
    list_filter = ['brand', 'currency', 'category']
    search_fields = ['title', 'brand', 'tag', 'product_url']
    ordering = ['-updated_at']