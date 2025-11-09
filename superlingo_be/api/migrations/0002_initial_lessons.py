# /superlingo_be/api/migrations/0002_add_lessons.py
from django.db import migrations

def create_initial_lessons(apps, schema_editor):
    Lesson = apps.get_model('api', 'Lesson')
    
    lesson_1_content = {
        "title": "Daily Routine",
        "activities": [
            {"type": "MATCHING", "title": "Match the pairs", "pairs": [["Wake up", "일어나다"], ["Breakfast", "아침밥"], ["Shower", "샤워"], ["Work", "일하다"]]},
            {"type": "ORDERING", "title": "Put the words in order", "prompt": "I eat breakfast", "words": ["breakfast", "I", "eat"]}
        ]
    }
    lesson_2_content = {
        "title": "Favorite Food",
        "activities": [
            {"type": "MATCHING", "title": "Match the foods", "pairs": [["Pizza", "피자"], ["Taco", "타코"], ["Sushi", "초밥"], ["Salad", "샐러드"]]},
            {"type": "LISTENING", "title": "Choose the correct word", "prompt_audio_text": "I like pizza", "options": ["Taco", "Pizza", "Salad"], "correct_answer": "Pizza"}
        ]
    }
    lesson_3_content = {
        "title": "Basic Speaking",
        "activities": [
            {"type": "SPEAKING", "title": "Say the sentence", "prompt": "I like pizza"},
            {"type": "SPEAKING", "title": "Say the sentence", "prompt": "I wake up in the morning"}
        ]
    }
    # Add 3 more lessons
    lesson_4_content = {
        "title": "Family Members",
        "activities": [
            {"type": "MATCHING", "title": "Match family", "pairs": [["Mother", "어머니"], ["Father", "아버지"], ["Brother", "형제"], ["Sister", "자매"]]},
            {"type": "ORDERING", "title": "Put the words in order", "prompt": "This is my mother", "words": ["my", "This", "is", "mother"]}
        ]
    }
    lesson_5_content = {
        "title": "Common Animals",
        "activities": [
            {"type": "LISTENING", "title": "What animal is it?", "prompt_audio_text": "The dog is big", "options": ["Cat", "Dog", "Bird"], "correct_answer": "Dog"},
            {"type": "SPEAKING", "title": "Say the sentence", "prompt": "The cat is small"}
        ]
    }
    lesson_6_content = {
        "title": "Level Up Review",
        "activities": [
            {"type": "ORDERING", "title": "Put the words in order", "prompt": "I love pizza", "words": ["pizza", "I", "love"]},
            {"type": "SPEAKING", "title": "Say the sentence", "prompt": "My father likes to work"}
        ]
    }

    Lesson.objects.create(title="Lesson 1 - Daily Routine", level="A1", topics=lesson_1_content, order=1)
    Lesson.objects.create(title="Lesson 2 - Favorite Food", level="A1", topics=lesson_2_content, order=2)
    Lesson.objects.create(title="Lesson 3 - Basic Speaking", level="A1", topics=lesson_3_content, order=3)
    Lesson.objects.create(title="Lesson 4 - Family Members", level="A1", topics=lesson_4_content, order=4)
    Lesson.objects.create(title="Lesson 5 - Common Animals", level="A1", topics=lesson_5_content, order=5)
    Lesson.objects.create(title="Lesson 6 - Level Up Review", level="A1", topics=lesson_6_content, order=6)


class Migration(migrations.Migration):
    dependencies = [('api', '0001_initial')]
    operations = [migrations.RunPython(create_initial_lessons)]