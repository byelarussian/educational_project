from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth.models import User

from .models import Task, Category


class BackendAPITest(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='password123'
        )
        self.category = Category.objects.create(
            name='Work',
            description='Work related tasks',
            color='#ff0000'
        )
        self.client.force_authenticate(user=self.user)

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
