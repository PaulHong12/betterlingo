# /superlingo_be/api/migrations/0003_add_speaking_activity.py
from django.db import migrations

def create_speaking_lesson(apps, schema_editor):
    Lesson = apps.get_model('api', 'Lesson')
    
    lesson_3_content = {
        "title": "Basic Speaking",
        "activities": [
            {
                "type": "SPEAKING",
                "title": "Say the sentence",
                "prompt": "I like pizza" # This is the "true text"
            },
            {
                "type": "SPEAKING",
                "title": "Say the sentence",
                "prompt": "I wake up in the morning"
            }
        ]
    }
    
    Lesson.objects.create(title="Lesson 3 - Basic Speaking", level="A1", topics=lesson_3_content)

class Migration(migrations.Migration):
    # This migration depends on the previous data migration
    dependencies = [('api', '0002_initial_lessons')] 
    operations = [migrations.RunPython(create_speaking_lesson)]