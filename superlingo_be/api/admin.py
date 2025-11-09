from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, Lesson

# Register your models here so they appear in the Django admin interface
admin.site.register(User, UserAdmin) # Use UserAdmin for better user management
admin.site.register(Lesson)