from django.apps import AppConfig


class ApiConfig(AppConfig):
    """Конфиг приложения api: модели, API, сигналы профиля.

    default_auto_field задаёт тип первичного ключа для новых моделей.
    """
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'api'

    def ready(self):
        """Подключает signals.py при старте Django, чтобы профиль создавался вместе с User."""
        from . import signals  # noqa: F401
