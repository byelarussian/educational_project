"""Маршруты REST API приложения api.

DefaultRouter сам создаёт набор URL для каждого ViewSet:
  /auth/register/, /auth/login/, /auth/logout/
  /tasks/, /tasks/{id}/, /tasks/stats/, /tasks/{id}/change_status/
  /categories/, /users/me/, /users/change_password/
  /product-categories/, /products/, /products/by_category/
  /cart/, /cart/{id}/, /cart/checkout/
  /orders/
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'auth', views.AuthViewSet, basename='auth')
router.register(r'tasks', views.TaskViewSet, basename='task')
router.register(r'categories', views.CategoryViewSet)
router.register(r'users', views.UserViewSet)
router.register(r'product-categories', views.ProductCategoryViewSet)
router.register(r'products', views.ProductViewSet)
router.register(r'cart', views.CartViewSet, basename='cart')
router.register(r'orders', views.OrderViewSet, basename='order')

urlpatterns = [
    path('', include(router.urls)),
]
