# Django REST Framework Backend

A robust Django REST Framework backend application with task management functionality.

## Features

- **Task Management**: Create, read, update, and delete tasks
- **Categories**: Organize tasks with categories
- **User Management**: User authentication and authorization
- **Filtering & Search**: Advanced filtering and search capabilities
- **REST API**: Full RESTful API with DRF
- **CORS Support**: Cross-origin resource sharing enabled
- **Admin Interface**: Django admin panel for easy management

## API Endpoints

### Tasks
- `GET /api/v1/tasks/` - List all tasks for authenticated user
- `POST /api/v1/tasks/` - Create a new task
- `GET /api/v1/tasks/{id}/` - Retrieve a specific task
- `PUT /api/v1/tasks/{id}/` - Update a specific task
- `PATCH /api/v1/tasks/{id}/` - Partially update a specific task
- `DELETE /api/v1/tasks/{id}/` - Delete a specific task
- `GET /api/v1/tasks/stats/` - Get task statistics
- `PATCH /api/v1/tasks/{id}/change_status/` - Change task status

### Categories
- `GET /api/v1/categories/` - List all categories
- `POST /api/v1/categories/` - Create a new category
- `GET /api/v1/categories/{id}/` - Retrieve a specific category
- `PUT /api/v1/categories/{id}/` - Update a specific category
- `PATCH /api/v1/categories/{id}/` - Partially update a specific category
- `DELETE /api/v1/categories/{id}/` - Delete a specific category

### Users
- `GET /api/v1/users/` - List all users
- `GET /api/v1/users/{id}/` - Retrieve a specific user
- `GET /api/v1/users/me/` - Get current user info

### Authentication
- `GET /api-auth/login/` - Login page
- `GET /api-auth/logout/` - Logout page

## Models

### Task
- `title`: Task title (required)
- `description`: Task description (optional)
- `priority`: Priority level (low, medium, high)
- `status`: Task status (todo, in_progress, completed)
- `created_at`: Creation timestamp
- `updated_at`: Last update timestamp
- `due_date`: Due date (optional)
- `owner`: Task owner (User foreign key)

### Category
- `name`: Category name (unique)
- `description`: Category description (optional)
- `color`: Hex color code for UI representation
- `created_at`: Creation timestamp

### TaskCategory
- Many-to-many relationship between Tasks and Categories

## Installation & Setup

1. **Clone the repository and navigate to the project directory**

2. **Create and activate virtual environment:**
   ```bash
   python -m venv venv
   
   # On Windows
   venv\Scripts\activate
   
   # On macOS/Linux
   source venv/bin/activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Run migrations:**
   ```bash
   python manage.py makemigrations
   python manage.py migrate
   ```

5. **Create superuser (optional):**
   ```bash
   python manage.py createsuperuser
   ```

6. **Run the development server:**
   ```bash
   python manage.py runserver
   ```

The API will be available at `http://localhost:8000/api/v1/`
Admin panel will be available at `http://localhost:8000/admin/`

## Configuration

### Environment Variables
The application uses Django's default settings. For production, consider setting:
- `SECRET_KEY`: Django secret key
- `DEBUG`: Set to False for production
- `ALLOWED_HOSTS`: Add your domain names
- `DATABASE_URL`: Database connection string

### CORS Settings
Currently configured to allow all origins for development. Update `CORS_ALLOWED_ORIGINS` in settings.py for production.

### REST Framework Settings
- Pagination: 20 items per page
- Permissions: AllowAny (update for production)
- Filtering: DjangoFilterBackend, SearchFilter, OrderingFilter

## Usage Examples

### Creating a Task
```bash
curl -X POST http://localhost:8000/api/v1/tasks/ \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Complete project",
    "description": "Finish the Django backend implementation",
    "priority": "high",
    "status": "todo"
  }'
```

### Filtering Tasks
```bash
# Get high priority tasks
curl "http://localhost:8000/api/v1/tasks/?priority=high"

# Search tasks by title
curl "http://localhost:8000/api/v1/tasks/?search=project"

# Get completed tasks ordered by creation date
curl "http://localhost:8000/api/v1/tasks/?status=completed&ordering=-created_at"
```

### Getting Task Statistics
```bash
curl http://localhost:8000/api/v1/tasks/stats/
```

## Development

### Project Structure
```
django_backend/
├── backend/              # Django project settings
│   ├── __init__.py
│   ├── settings.py       # Main settings file
│   ├── urls.py          # Main URL configuration
│   └── wsgi.py          # WSGI configuration
├── api/                 # Main API application
│   ├── migrations/      # Database migrations
│   ├── __init__.py
│   ├── models.py        # Database models
│   ├── serializers.py   # DRF serializers
│   ├── views.py         # API views
│   ├── urls.py          # API URL patterns
│   └── admin.py         # Admin configuration
├── manage.py            # Django management script
├── requirements.txt     # Python dependencies
└── README.md           # This file
```

### Adding New Features
1. Create models in `api/models.py`
2. Create serializers in `api/serializers.py`
3. Create views in `api/views.py`
4. Add URL patterns in `api/urls.py`
5. Run migrations: `python manage.py makemigrations && python manage.py migrate`

## Testing

Run tests with:
```bash
python manage.py test
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is open source and available under the MIT License.

