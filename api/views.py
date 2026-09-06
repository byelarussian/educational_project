import uuid
from decimal import Decimal

from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.authtoken.models import Token
from django_filters.rest_framework import DjangoFilterBackend
from django.contrib.auth.models import User
from django.db import transaction
from django.utils import timezone
from .models import Task, Category, Product, ProductCategory, CartItem, Order, OrderItem
from .serializers import (
    TaskSerializer, TaskCreateUpdateSerializer,
    CategorySerializer, UserSerializer, UserRegistrationSerializer,
    ProductSerializer, ProductCategorySerializer,
    ProfileUpdateSerializer, CartItemSerializer, CartAddSerializer,
    CartQuantitySerializer, OrderSerializer, get_or_create_profile,
    CheckoutContactSerializer, GuestCheckoutSerializer,
)


class AuthViewSet(viewsets.ViewSet):
    """Эндпоинты регистрации, входа и выхода. Доступны без токена, кроме logout."""
    permission_classes = [AllowAny]

    @action(detail=False, methods=['post'])
    def register(self, request):
        """POST /auth/register/ — создаёт пользователя и сразу выдаёт токен авторизации.

        Тело: username, email, password, password_confirm, опционально имя и фамилия.
        Успех: 201, { user, token }. Ошибки валидации: 400.
        """
        serializer = UserRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            token, _ = Token.objects.get_or_create(user=user)
            return Response({
                'user': UserSerializer(user).data,
                'token': token.key,
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'])
    def login(self, request):
        """POST /auth/login/ — проверяет логин/пароль и возвращает существующий или новый токен."""
        username = request.data.get('username')
        password = request.data.get('password')

        if not username or not password:
            return Response(
                {'error': 'Укажите логин и пароль'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            return Response(
                {'error': 'Неверный логин или пароль'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        if not user.check_password(password):
            return Response(
                {'error': 'Неверный логин или пароль'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        if not user.is_active:
            user.is_active = True
            user.save(update_fields=['is_active'])

        token, _ = Token.objects.get_or_create(user=user)
        return Response({
            'user': UserSerializer(user).data,
            'token': token.key,
        })

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def logout(self, request):
        """POST /auth/logout/ — удаляет токен текущего пользователя, после этого запросы с ним не пройдут."""
        try:
            request.user.auth_token.delete()
        except Token.DoesNotExist:
            pass
        return Response({'message': 'Logged out successfully'})


class TaskViewSet(viewsets.ModelViewSet):
    """CRUD задач только текущего пользователя: список, создание, правка, удаление, статистика."""
    serializer_class = TaskSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'priority', 'categories', 'due_date']
    search_fields = ['title', 'description']
    ordering_fields = ['created_at', 'updated_at', 'due_date', 'priority']
    ordering = ['-created_at']

    def get_queryset(self):
        """Отдаёт только задачи владельца запроса, сразу подгружая категории (без N+1)."""
        return Task.objects.filter(owner=self.request.user).prefetch_related('categories')

    def get_serializer_class(self):
        """На запись берёт TaskCreateUpdateSerializer (с category_ids), на чтение — полный TaskSerializer."""
        if self.action in ['create', 'update', 'partial_update']:
            return TaskCreateUpdateSerializer
        return TaskSerializer

    def create(self, request, *args, **kwargs):
        """Создаёт задачу через входной сериализатор, в ответе отдаёт полное представление с владельцем."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        task = serializer.save()

        output_serializer = TaskSerializer(task, context={'request': request})
        headers = self.get_success_headers(output_serializer.data)
        return Response(output_serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def update(self, request, *args, **kwargs):
        """Полное или частичное обновление задачи; в ответе снова полный TaskSerializer."""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        task = serializer.save()

        output_serializer = TaskSerializer(task, context={'request': request})
        return Response(output_serializer.data)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """GET /tasks/stats/ — счётчики задач пользователя по статусам и приоритетам."""
        queryset = self.get_queryset()
        stats = {
            'total': queryset.count(),
            'todo': queryset.filter(status='todo').count(),
            'in_progress': queryset.filter(status='in_progress').count(),
            'completed': queryset.filter(status='completed').count(),
            'high_priority': queryset.filter(priority='high').count(),
            'medium_priority': queryset.filter(priority='medium').count(),
            'low_priority': queryset.filter(priority='low').count(),
        }
        return Response(stats)

    @action(detail=True, methods=['patch'])
    def change_status(self, request, pk=None):
        """PATCH /tasks/{id}/change_status/ — меняет только статус (todo / in_progress / completed)."""
        task = self.get_object()
        new_status = request.data.get('status')

        if new_status not in ['todo', 'in_progress', 'completed']:
            return Response(
                {'error': 'Invalid status'},
                status=status.HTTP_400_BAD_REQUEST
            )

        task.status = new_status
        task.save()

        serializer = self.get_serializer(task)
        return Response(serializer.data)


class CategoryViewSet(viewsets.ModelViewSet):
    """CRUD категорий задач: список, поиск по имени/описанию, создание и удаление."""
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']


class UserViewSet(viewsets.ReadOnlyModelViewSet):
    """Список пользователей только для чтения плюс действия «я» и смена пароля."""
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['get', 'patch'])
    def me(self, request):
        """GET — текущий профиль; PATCH — обновление имени, email, телефона и адреса доставки."""
        if request.method == 'PATCH':
            serializer = ProfileUpdateSerializer(request.user, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
        return Response(UserSerializer(request.user).data)

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def change_password(self, request):
        """POST /users/change_password/ — проверяет старый пароль, ставит новый и перевыпускает токен.

        Старый токен становится недействительным, клиент должен сохранить новый.
        """
        user = request.user
        old_password = request.data.get('old_password')
        new_password = request.data.get('new_password')

        if not old_password or not new_password:
            return Response(
                {'error': 'Please provide old_password and new_password'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not user.check_password(old_password):
            return Response(
                {'error': 'Old password is incorrect'},
                status=status.HTTP_400_BAD_REQUEST
            )

        user.set_password(new_password)
        user.save()

        # Recreate token after password change
        Token.objects.filter(user=user).delete()
        token = Token.objects.create(user=user)

        return Response({
            'message': 'Password changed successfully',
            'token': token.key
        })


class ProductCategoryViewSet(viewsets.ReadOnlyModelViewSet):
    """Публичный список товарных категорий витрины (без авторизации)."""
    queryset = ProductCategory.objects.all()
    serializer_class = ProductCategorySerializer
    permission_classes = [AllowAny]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'slug']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']


class ProductViewSet(viewsets.ReadOnlyModelViewSet):
    """Публичный каталог товаров: фильтры по бренду/категории, поиск и группировка by_category."""
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    permission_classes = [AllowAny]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['brand', 'currency', 'category', 'tag']
    search_fields = ['title', 'brand', 'tag']
    ordering_fields = ['price', 'created_at', 'updated_at']
    ordering = ['-updated_at']

    @action(detail=False, methods=['get'])
    def by_category(self, request):
        """GET /products/by_category/ — категории с вложенными товарами для главной витрины."""
        categories = ProductCategory.objects.prefetch_related('products').all()
        data = []
        for cat in categories:
            data.append({
                'category': ProductCategorySerializer(cat).data,
                'products': ProductSerializer(cat.products.all(), many=True).data,
            })
        return Response(data)


def serialize_cart(user):
    """Собирает корзину пользователя: позиции, сумму и общее количество штук."""
    items = CartItem.objects.filter(user=user).select_related('product', 'product__category')
    total = sum((item.line_total for item in items), Decimal('0'))
    count = sum((item.quantity for item in items), 0)
    return {
        'items': CartItemSerializer(items, many=True).data,
        'total': str(total),
        'count': count,
    }


def generate_order_number():
    """Генерирует уникальный номер заказа: FAM + дата (ггммдд) + 6 символов UUID."""
    return timezone.now().strftime('FAM%y%m%d') + uuid.uuid4().hex[:6].upper()


class CartViewSet(viewsets.ViewSet):
    """Корзина текущего пользователя: список, добавление, смена количества, удаление, оформление."""
    permission_classes = [IsAuthenticated]

    def list(self, request):
        """GET /cart/ — текущая корзина: items, total, count."""
        return Response(serialize_cart(request.user))

    def create(self, request):
        """POST /cart/ — кладёт товар нужного размера в корзину; если позиция есть, увеличивает quantity."""
        serializer = CartAddSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        product_id = serializer.validated_data['product_id']
        quantity = serializer.validated_data['quantity']
        size = serializer.validated_data['size'].strip()

        try:
            product = Product.objects.get(pk=product_id)
        except Product.DoesNotExist:
            return Response({'error': 'Товар не найден'}, status=status.HTTP_404_NOT_FOUND)

        item, created = CartItem.objects.get_or_create(
            user=request.user,
            product=product,
            size=size,
            defaults={'quantity': quantity},
        )
        if not created:
            item.quantity += quantity
            item.save()

        return Response(serialize_cart(request.user), status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

    def partial_update(self, request, pk=None):
        """PATCH /cart/{id}/ — ставит новое количество позиции (только своей)."""
        serializer = CartQuantitySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            item = CartItem.objects.get(pk=pk, user=request.user)
        except CartItem.DoesNotExist:
            return Response({'error': 'Позиция не найдена'}, status=status.HTTP_404_NOT_FOUND)

        item.quantity = serializer.validated_data['quantity']
        item.save()
        return Response(serialize_cart(request.user))

    def destroy(self, request, pk=None):
        """DELETE /cart/{id}/ — убирает позицию из корзины и возвращает обновлённую корзину."""
        deleted, _ = CartItem.objects.filter(pk=pk, user=request.user).delete()
        if not deleted:
            return Response({'error': 'Позиция не найдена'}, status=status.HTTP_404_NOT_FOUND)
        return Response(serialize_cart(request.user))

    @action(detail=False, methods=['post'])
    def checkout(self, request):
        """POST /cart/checkout/ — создаёт заказ из корзины и очищает её.

        Контакты можно передать в теле запроса (страница /checkout);
        иначе берутся из профиля. Минимум: телефон, город, улица.
        """
        items = list(CartItem.objects.filter(user=request.user).select_related('product'))
        if not items:
            return Response({'error': 'Корзина пуста'}, status=status.HTTP_400_BAD_REQUEST)

        contact = CheckoutContactSerializer(data=request.data)
        profile = get_or_create_profile(request.user)
        payment_method = 'on_site'

        if contact.is_valid():
            data = contact.validated_data
            payment_method = data.get('payment_method') or 'on_site'
            request.user.first_name = data['first_name']
            request.user.last_name = data.get('last_name') or ''
            if data.get('email'):
                request.user.email = data['email']
            request.user.save()
            profile.phone = data['phone']
            profile.city = data['city']
            profile.street = data['street']
            profile.apartment = data.get('apartment') or ''
            profile.postal_code = data.get('postal_code') or ''
            profile.save()
        elif not profile.has_delivery_address:
            return Response(
                {'error': 'Заполните телефон и адрес доставки'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        else:
            payment_method = request.data.get('payment_method') or 'on_site'
            if payment_method not in ('cashless', 'on_site'):
                payment_method = 'on_site'

        with transaction.atomic():
            order = Order.objects.create(
                user=request.user,
                number=generate_order_number(),
                payment_method=payment_method,
                first_name=request.user.first_name,
                last_name=request.user.last_name,
                email=request.user.email,
                phone=profile.phone,
                city=profile.city,
                street=profile.street,
                apartment=profile.apartment,
                postal_code=profile.postal_code,
            )
            total = Decimal('0')
            for item in items:
                price = item.product.price or Decimal('0')
                OrderItem.objects.create(
                    order=order,
                    product=item.product,
                    title=item.product.title,
                    image_url=item.product.image_url or '',
                    price=price,
                    currency=item.product.currency or '₽',
                    size=item.size or '',
                    quantity=item.quantity,
                )
                total += price * item.quantity
            order.total = total
            order.save(update_fields=['total'])
            CartItem.objects.filter(user=request.user).delete()

        return Response(OrderSerializer(order).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'], permission_classes=[AllowAny], url_path='guest-checkout')
    def guest_checkout(self, request):
        """POST /cart/guest-checkout/ — заказ без регистрации (как на famshop checkout).

        Принимает контакты и список позиций; корзина в localStorage очищается на клиенте.
        """
        serializer = GuestCheckoutSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        product_ids = [item['product_id'] for item in data['items']]
        products = {
            product.id: product
            for product in Product.objects.filter(id__in=product_ids)
        }
        if len(products) != len(set(product_ids)):
            return Response({'error': 'Некоторые товары не найдены'}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            order = Order.objects.create(
                user=request.user if request.user.is_authenticated else None,
                number=generate_order_number(),
                payment_method=data.get('payment_method') or 'on_site',
                first_name=data['first_name'],
                last_name=data.get('last_name') or '',
                email=data.get('email') or '',
                phone=data['phone'],
                city=data['city'],
                street=data['street'],
                apartment=data.get('apartment') or '',
                postal_code=data.get('postal_code') or '',
            )
            total = Decimal('0')
            for item in data['items']:
                product = products[item['product_id']]
                price = product.price or Decimal('0')
                quantity = item['quantity']
                OrderItem.objects.create(
                    order=order,
                    product=product,
                    title=product.title,
                    image_url=product.image_url or '',
                    price=price,
                    currency=product.currency or '₽',
                    size=item['size'].strip(),
                    quantity=quantity,
                )
                total += price * quantity
            order.total = total
            order.save(update_fields=['total'])

            if request.user.is_authenticated:
                CartItem.objects.filter(user=request.user).delete()

        return Response(OrderSerializer(order).data, status=status.HTTP_201_CREATED)


class OrderViewSet(viewsets.ReadOnlyModelViewSet):
    """Список заказов текущего пользователя без пагинации — для вкладки «Заказы» в кабинете."""
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        """Только заказы владельца, сразу с позициями."""
        return Order.objects.filter(user=self.request.user).prefetch_related('items')
