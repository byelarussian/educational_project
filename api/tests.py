from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth.models import User
from rest_framework.authtoken.models import Token

from .models import Task, Category


class AuthenticationTest(APITestCase):
    def test_user_registration(self):
        """Test user registration"""
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
        """Test registration with mismatched passwords"""
        data = {
            'username': 'testuser',
            'email': 'test@example.com',
            'password': 'pass123',
            'password_confirm': 'different123',
        }
        response = self.client.post(reverse('auth-register'), data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_user_login(self):
        """Test user login"""
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
        """Test login with invalid credentials"""
        User.objects.create_user(
            username='testuser',
            password='password123'
        )
        data = {'username': 'testuser', 'password': 'wrongpassword'}
        response = self.client.post(reverse('auth-login'), data, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class BackendAPITest(APITestCase):
    def setUp(self):
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
        response = self.client.get(reverse('user-me'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['username'], self.user.username)

    def test_category_list(self):
        response = self.client.get(reverse('category-list'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('results', response.data)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['name'], 'Work')
    
    def test_change_password(self):
        """Test password change endpoint"""
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
