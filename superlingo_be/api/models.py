from django.db import models
from django.contrib.auth.models import AbstractUser

class User(AbstractUser):
    # Add email field and new experience field
    email = models.EmailField(unique=True, blank=False)
    experience_points = models.IntegerField(default=0)

class Lesson(models.Model):
    title = models.CharField(max_length=100) # This will be like "Lesson 1 - Daily Routine"
    level = models.CharField(max_length=10)
    topics = models.JSONField() # This holds the activities, title, etc.
    order = models.IntegerField(default=0) # To keep lessons in order

    class Meta:
        ordering = ['order']

    def __str__(self):
        return self.title

# NEW Model to track which user completed which lesson
class UserLessonProgress(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE)
    completed = models.BooleanField(default=False)

    class Meta:
        # Ensure a user can only have one entry per lesson
        unique_together = ('user', 'lesson')