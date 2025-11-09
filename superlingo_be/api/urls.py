# /superlingo_be/api/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
# Import the NEW TTS view, remove old one
from .views import (
    register_user, login_user, chat_with_tutor, 
    generate_cloud_tts_audio, transcribe_audio, LessonViewSet,
    complete_lesson # <-- IMPORT NEW VIEW
)

router = DefaultRouter()
router.register(r'lessons', LessonViewSet, basename='lesson')

urlpatterns = [
    path('register/', register_user, name='register'),
    path('login/', login_user, name='login'),
    path('chat/', chat_with_tutor, name='chat-with-tutor'),
    path('transcribe-audio/', transcribe_audio, name='transcribe-audio'),
    path('generate-gemini-audio/', generate_cloud_tts_audio, name='generate-cloud-audio'),
    path('complete-lesson/', complete_lesson, name='complete-lesson'),
    path('', include(router.urls)),
]