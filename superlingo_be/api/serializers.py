from rest_framework import serializers
from .models import User, Lesson, UserLessonProgress

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        # Expose experience_points on read, but not required on write
        fields = ('id', 'username', 'password', 'email', 'experience_points')
        extra_kwargs = {
            'password': {'write_only': True},
            'experience_points': {'read_only': True}
        }

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            password=validated_data['password']
        )
        return user

class LessonSerializer(serializers.ModelSerializer):
    # This line adds the 'completed' field
    completed = serializers.SerializerMethodField()

    class Meta:
        model = Lesson
        # Make sure 'completed' is in the fields list
        fields = ('id', 'title', 'level', 'topics', 'completed')

    # This function calculates the 'completed' field
    def get_completed(self, obj):
        user = self.context.get('request').user
        if user and user.is_authenticated:
            return UserLessonProgress.objects.filter(user=user, lesson=obj).exists()
        return False