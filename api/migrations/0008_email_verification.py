from django.db import migrations, models
import django.db.models.deletion
import uuid


def mark_existing_profiles_verified(apps, schema_editor):
    UserProfile = apps.get_model('api', 'UserProfile')
    UserProfile.objects.all().update(email_verified=True)


class Migration(migrations.Migration):

    dependencies = [
        ('auth', '0012_alter_user_first_name_max_length'),
        ('api', '0007_order_payment_method'),
    ]

    operations = [
        migrations.AddField(
            model_name='userprofile',
            name='email_verified',
            field=models.BooleanField(default=False),
        ),
        migrations.RunPython(mark_existing_profiles_verified, migrations.RunPython.noop),
        migrations.CreateModel(
            name='EmailVerificationToken',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('token', models.UUIDField(default=uuid.uuid4, editable=False, unique=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('used_at', models.DateTimeField(blank=True, null=True)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='email_tokens', to='auth.user')),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
    ]
