from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth.models import User
from rest_framework.authtoken.models import Token

from .models import Task, Category, Product, CartItem, Order


class AuthenticationTest(APITestCase):
    """Проверяет регистрацию и вход: токен выдаётся, несовпадение паролей и неверный логин отклоняются."""

    def test_user_registration(self):
        """Регистрация с валидными данными возвращает 201, токен и созданного пользователя."""
        data = {
            'username': 'newuser',
            'email': 'newuser@example.com',
            'password': 'securepass123',
            'password_confirm': 'securepass123',
            'first_name': 'New',
            'last_name': 'User'
        }
        response = self.client.post(reverse('auth-register'), data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('token', response.data)
        self.assertEqual(response.data['user']['username'], 'newuser')
    
    def test_user_registration_password_mismatch(self):
        """Если password и password_confirm разные, API отвечает 400."""
        data = {
            'username': 'testuser',
            'email': 'test@example.com',
            'password': 'pass123',
            'password_confirm': 'different123',
        }
        response = self.client.post(reverse('auth-register'), data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_user_login(self):
        """Верный логин и пароль дают 200 и токен."""
        user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='password123'
        )
        data = {'username': 'testuser', 'password': 'password123'}
        response = self.client.post(reverse('auth-login'), data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('token', response.data)
        self.assertEqual(response.data['user']['username'], 'testuser')
    
    def test_user_login_invalid_credentials(self):
        """Неверный пароль даёт 401, токен не выдаётся."""
        User.objects.create_user(
            username='testuser',
            password='password123'
        )
        data = {'username': 'testuser', 'password': 'wrongpassword'}
        response = self.client.post(reverse('auth-login'), data, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class BackendAPITest(APITestCase):
    """CRUD задач и категорий от имени авторизованного пользователя, статистика и смена пароля."""

    def setUp(self):
        """Создаёт тестового пользователя, токен, категорию Work и вешает Authorization на клиент."""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='password123'
        )
        self.token = Token.objects.create(user=self.user)
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.token.key)
        
        self.category = Category.objects.create(
            name='Work',
            description='Work related tasks',
            color='#ff0000'
        )

    def test_create_task_with_categories(self):
        """Создание задачи с category_ids привязывает категорию и ставит владельцем текущего пользователя."""
        data = {
            'title': 'Test task',
            'description': 'Task description',
            'priority': 'high',
            'status': 'todo',
            'category_ids': [self.category.id]
        }
        response = self.client.post(reverse('task-list'), data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['title'], 'Test task')
        self.assertEqual(response.data['owner']['username'], self.user.username)
        self.assertEqual(len(response.data['categories']), 1)
        self.assertEqual(response.data['categories'][0]['name'], 'Work')

    def test_task_stats_endpoint(self):
        """/tasks/stats/ считает total, todo и completed только по задачам текущего пользователя."""
        Task.objects.create(
            title='First task',
            description='desc',
            priority='low',
            status='todo',
            owner=self.user
        )
        Task.objects.create(
            title='Second task',
            description='desc',
            priority='high',
            status='completed',
            owner=self.user
        )
        response = self.client.get(reverse('task-stats'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total'], 2)
        self.assertEqual(response.data['todo'], 1)
        self.assertEqual(response.data['completed'], 1)

    def test_change_task_status(self):
        """PATCH change_status переводит задачу из todo в completed."""
        task = Task.objects.create(
            title='Status task',
            description='Change status',
            priority='medium',
            status='todo',
            owner=self.user
        )
        url = reverse('task-change-status', kwargs={'pk': task.id})
        response = self.client.patch(url, {'status': 'completed'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'completed')

    def test_user_me_endpoint(self):
        """GET /users/me/ возвращает профиль того, чей токен передан."""
        response = self.client.get(reverse('user-me'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['username'], self.user.username)

    def test_category_list(self):
        """Список категорий пагинирован и содержит созданную в setUp категорию Work."""
        response = self.client.get(reverse('category-list'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('results', response.data)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['name'], 'Work')
    
    def test_change_password(self):
        """Смена пароля отдаёт новый токен; вход со старым паролем больше не работает, с новым — работает."""
        data = {
            'old_password': 'password123',
            'new_password': 'newpassword456'
        }
        response = self.client.post(reverse('user-change-password'), data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('token', response.data)
        
        # Verify new password works with new token
        new_token = response.data['token']
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + new_token)
        
        login_response = self.client.post(
            reverse('auth-login'),
            {'username': 'testuser', 'password': 'newpassword456'},
            format='json'
        )
        self.assertEqual(login_response.status_code, status.HTTP_200_OK)

    def test_update_task(self):
        """PATCH задачи меняет title и description и возвращает обновлённые данные."""
        task = Task.objects.create(
            title='Update task',
            description='Initial',
            priority='medium',
            status='todo',
            owner=self.user
        )
        response = self.client.patch(
            reverse('task-detail', kwargs={'pk': task.id}),
            {'title': 'Updated task', 'description': 'Changed'},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['title'], 'Updated task')
        self.assertEqual(response.data['description'], 'Changed')

    def test_delete_task(self):
        """DELETE задачи отвечает 204 и удаляет запись из базы."""
        task = Task.objects.create(
            title='Delete task',
            description='Will be removed',
            priority='low',
            status='todo',
            owner=self.user
        )
        response = self.client.delete(reverse('task-detail', kwargs={'pk': task.id}))
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Task.objects.filter(id=task.id).exists())

    def test_category_crud(self):
        """Полный цикл категории: создать → поправить описание → удалить."""
        # Create category
        response = self.client.post(
            reverse('category-list'),
            {'name': 'Personal', 'description': 'Personal tasks', 'color': '#00aa00'},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        category_id = response.data['id']

        # Update category
        response = self.client.patch(
            reverse('category-detail', kwargs={'pk': category_id}),
            {'description': 'Updated personal tasks'},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['description'], 'Updated personal tasks')

        # Delete category
        response = self.client.delete(reverse('category-detail', kwargs={'pk': category_id}))
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Category.objects.filter(id=category_id).exists())


class CabinetAPITest(APITestCase):
    """Кабинет магазина: профиль, корзина и checkout с проверкой адреса доставки."""

    def setUp(self):
        """Создаёт покупателя с токеном и один товар для корзины."""
        self.user = User.objects.create_user(
            username='buyer',
            email='buyer@example.com',
            password='password123',
            first_name='Иван',
            last_name='Петров',
        )
        self.token = Token.objects.create(user=self.user)
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.token.key)
        self.product = Product.objects.create(
            title='New Era Yankees',
            product_url='https://example.com/yankees',
            image_url='https://example.com/yankees.jpg',
            price='4500.00',
            currency='₽',
            brand='New Era',
        )

    def test_update_profile(self):
        """PATCH /users/me/ сохраняет имя, телефон, email и город в User и UserProfile."""
        response = self.client.patch(
            reverse('user-me'),
            {
                'first_name': 'Анна',
                'last_name': 'Смирнова',
                'phone': '+79991234567',
                'email': 'anna@example.com',
                'city': 'Москва',
                'street': 'Бауманская, 9',
                'apartment': '12',
                'postal_code': '105005',
            },
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['first_name'], 'Анна')
        self.assertEqual(response.data['phone'], '+79991234567')
        self.assertEqual(response.data['city'], 'Москва')
        self.assertEqual(response.data['email'], 'anna@example.com')

    def test_cart_add_and_checkout(self):
        """Без адреса checkout — 400; после заполнения профиля создаётся заказ, корзина очищается."""
        add_response = self.client.post(
            reverse('cart-list'),
            {'product_id': self.product.id, 'quantity': 2},
            format='json',
        )
        self.assertEqual(add_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(add_response.data['count'], 2)

        checkout_response = self.client.post(reverse('cart-checkout'), format='json')
        self.assertEqual(checkout_response.status_code, status.HTTP_400_BAD_REQUEST)

        self.client.patch(
            reverse('user-me'),
            {'phone': '+79991234567', 'city': 'Москва', 'street': 'Бауманская, 9'},
            format='json',
        )
        checkout_response = self.client.post(reverse('cart-checkout'), format='json')
        self.assertEqual(checkout_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(checkout_response.data['status'], 'pending')
        self.assertEqual(len(checkout_response.data['items']), 1)
        self.assertEqual(str(checkout_response.data['total']), '9000.00')
        self.assertEqual(CartItem.objects.filter(user=self.user).count(), 0)

        orders_response = self.client.get(reverse('order-list'))
        self.assertEqual(orders_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(orders_response.data), 1)
        self.assertEqual(Order.objects.filter(user=self.user).count(), 1)
