# /superlingo_be/api/views.py
from django.contrib.auth import authenticate
from django.conf import settings
from django.http import HttpResponse
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from .models import Lesson
from .serializers import UserSerializer, LessonSerializer
import google.generativeai as genai
from google.cloud import texttospeech # Import Google Cloud TTS client
import os
import traceback # Import traceback for better error logging
import base64  
from google.cloud import speech
from .models import Lesson, UserLessonProgress

# --- Configure APIs ---
gemini_model = None
tts_client = None # Google Cloud TTS Client
speech_client = None 

gemini_api_configured = False
gcloud_tts_configured = False
gcloud_stt_configured = False


try:
    # Gemini Setup
    GOOGLE_API_KEY = os.environ.get('GOOGLE_API_KEY')
    if not GOOGLE_API_KEY or GOOGLE_API_KEY == 'YOUR_GEMINI_API_KEY_HERE':
        raise ValueError("GOOGLE_API_KEY missing or placeholder.")
    genai.configure(api_key=GOOGLE_API_KEY)
    gemini_model = genai.GenerativeModel('gemini-2.5-flash') # Use stable model name
    gemini_api_configured = True
    print("Gemini API configured successfully.")
except Exception as e:
    print(f"FATAL ERROR: Could not configure Gemini API: {e}")
    print(traceback.format_exc()) # Print full traceback

try:
    if os.environ.get('GOOGLE_APPLICATION_CREDENTIALS'):
        tts_client = texttospeech.TextToSpeechClient()
        gcloud_tts_configured = True
        print("Google Cloud TTS client configured successfully.")
        
        speech_client = speech.SpeechClient()
        gcloud_stt_configured = True
        print("Google Cloud STT client configured successfully.")
    else:
        raise ValueError("GOOGLE_APPLICATION_CREDENTIALS environment variable not set.")
except Exception as e:
    print(f"FATAL ERROR: Could not configure Google Cloud TTS client: {e}")
    print(traceback.format_exc()) # Print full traceback


# --- register_user and login_user (remain the same) ---
@api_view(['POST']) 
@permission_classes([permissions.AllowAny])
def register_user(request): # ... (same code) ...
    serializer = UserSerializer(data=request.data)
    if serializer.is_valid(): serializer.save(); return Response(serializer.data, status=status.HTTP_201_CREATED)
    print(f"Reg failed: {serializer.errors}"); return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def login_user(request):
    username = request.data.get('username')
    password = request.data.get('password')
    user = authenticate(username=username, password=password)
    if user:
        token, _ = Token.objects.get_or_create(user=user)
        print(f"Login OK: {username}")
        # --- FIX 1: You must return the experience_points ---
        return Response({
            'token': token.key,
            'experience_points': user.experience_points
        })
        # --- END FIX ---
    print(f"Login Fail: {username}")
    return Response({'error': 'Invalid Credentials'}, status=status.HTTP_400_BAD_REQUEST)


# --- chat_with_tutor (Corrected API Call Logic) ---
@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def chat_with_tutor(request):
    if not gemini_api_configured or not gemini_model: # Check flag
        print("Error: Gemini model not initialized/configured.");
        return Response({'error': 'AI model not configured.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    user_message = request.data.get('message', '')
    activity_context = request.data.get('context', {})
    lesson_title = request.data.get('lesson_title', 'this lesson')

    if not user_message: return Response({'error': 'No message provided'}, status=status.HTTP_400_BAD_REQUEST)

    # --- Dynamic Prompt Engineering (Same logic) ---
    base_prompt = f"""You are Betterlingo, a friendly English tutor AI...""" # Keep your full prompt
    activity_prompt = "Ask a simple question..."
    # ... (Keep the rest of your dynamic prompt generation logic based on activity_type) ...
    activity_type = activity_context.get('type')
    if activity_type == "MATCHING":
        words = [p[0] for p in activity_context.get('pairs', []) if isinstance(p, list) and len(p)>0]
        activity_prompt = f"Student is matching vocabulary: {', '.join(words)}. ANSWER IN KOREAN. First, find out what exactly the user needs help with for THIS ACTIVITY. Serveral words are given in random order, user is trying to match the korean-english word pairs"
    elif activity_type == "ORDERING":
        sentence = activity_context.get('prompt', '')
        activity_prompt = f"Student practiced sentence: '{sentence}'. ANSWER IN KOREAN. First, find out what exactly the user needs help with for this activity. explain grammer why each words in sentences comes there and what's their purpose, with examples."
    elif activity_type == "LISTENING":
         word = activity_context.get('correct_answer', '')
         activity_prompt = f"Student identified word '{word}'.ANSWER IN KOREAN. First, find out what exactly the user needs help with for this activity. Teach them the actual pronunciation vs spelling."
    elif activity_type == "SPEAKING":
            sentence = activity_context.get('prompt', '')
            activity_prompt = f"Student practiced speaking the sentence: '{sentence}'. ANSWER IN KOREAN. First, find out what exactly the user needs help with for this activity. Focus on pronunciation, intonation, or specific tricky words in that sentence. Offer to break it down for them."
    system_instruction = base_prompt + "\n" + activity_prompt
    # --- FINAL CORRECTED GEMINI CALL ---
    # Create a new model instance WITH the system instruction
    model_with_system_prompt = genai.GenerativeModel(
        'gemini-2.5-flash',
        system_instruction=system_instruction
    )
    prompt_content = f"Student said: {user_message}" # Content is just the user message

    try:
        print(f"Sending prompt to Gemini Chat. User: {user_message}")
        response = model_with_system_prompt.generate_content(
             prompt_content, # Pass only user message here
             generation_config=genai.types.GenerationConfig(temperature=0.7),
             # Do NOT pass system_instruction here again
        )
        print("Received response from Gemini Chat.")

        ai_reply = "Sorry, I didn't get that. Could you rephrase?"
        # Add more robust checks for safety/blocking
        if response.candidates:
             candidate = response.candidates[0]
             if candidate.content and candidate.content.parts:
                 ai_reply = candidate.content.parts[0].text.strip()
             elif candidate.finish_reason != genai.types.Candidate.FinishReason.STOP:
                 print(f"Gemini response blocked. Reason: {candidate.finish_reason}")
                 ai_reply = "I'm sorry, I can't respond to that topic."
             else: print("Gemini response was empty but not blocked.")
        else: print("Gemini response had no candidates.")

        return Response({'reply': ai_reply})

    except Exception as e:
        print(f"Error calling Gemini API: {e}")
        print(traceback.format_exc()) # Log the full traceback
        fallback_reply = "Sorry, AI error."; return Response({'reply': fallback_reply}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def generate_cloud_tts_audio(request):
    if not gcloud_tts_configured or not tts_client: # Check flag and client
        print("Error: Google Cloud TTS client not initialized/configured.")
        return Response({'error': 'AI Audio model is not configured.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    text_to_speak = request.data.get('text', '')
    if not text_to_speak: return Response({'error': 'No text provided for audio'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        print(f"Sending text to Google Cloud TTS: '{text_to_speak}'")
        synthesis_input = texttospeech.SynthesisInput(text=text_to_speak)
        voice = texttospeech.VoiceSelectionParams(language_code="en-US", name="en-US-Studio-O")
        audio_config = texttospeech.AudioConfig(audio_encoding=texttospeech.AudioEncoding.MP3)
        
        response = tts_client.synthesize_speech(input=synthesis_input, voice=voice, audio_config=audio_config)
        print("Received audio response from Google Cloud TTS.")

        # --- 2. THIS IS THE FIX ---
        # Encode the raw MP3 audio content into Base64
        audio_base64 = base64.b64encode(response.audio_content).decode('utf-8')
        
        # Create a data URI string, which Expo AV can play directly
        data_uri = f'data:audio/mpeg;base64,{audio_base64}'
        
        # Send a JSON response containing the data URI
        return Response({'audioUrl': data_uri}, status=status.HTTP_200_OK) 
        # --- END FIX ---

    except Exception as e:
        print(f"Error calling Google Cloud TTS API: {e}"); print(traceback.format_exc());
        return Response({'error': f'Failed audio gen: {e}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)



@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def transcribe_audio(request):
    if not gcloud_stt_configured:
        print("Error: Google Cloud STT client not initialized/configured.")
        return Response({'error': 'Audio transcription not configured.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    audio_base64 = request.data.get('audio_base64')
    correct_prompt = request.data.get('prompt')
    # --- ADD THIS LINE ---
    platform = request.data.get('platform', 'native') # Get platform, default to native

    if not audio_base64 or not correct_prompt:
        return Response({'error': 'Missing audio data or correct prompt'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        audio_content = base64.b64decode(audio_base64)
        audio = speech.RecognitionAudio(content=audio_content)

        # --- THIS IS THE FIX ---
        # Use the correct config based on the platform
        if platform == 'web':
            print("Using WEB config (WEBM_OPUS)")
            # Web sends WEBM_OPUS.
            # Google requires sample_rate_hertz to be OMITTED for this format.
            config = speech.RecognitionConfig(
                encoding=speech.RecognitionConfig.AudioEncoding.WEBM_OPUS,
                language_code="en-US"
            )
        else:
            print("Using NATIVE config (LINEAR16)")
            # Native (iOS/Android) sends LINEAR16 at 16000Hz
            config = speech.RecognitionConfig(
                encoding=speech.RecognitionConfig.AudioEncoding.LINEAR16,
                sample_rate_hertz=16000,
                language_code="en-US"
            )
        # --- END OF FIX ---

        print("Sending audio to Google Cloud STT...")
        response = speech_client.recognize(config=config, audio=audio)
        print("Received response from Google Cloud STT.")

        if not response.results or not response.results[0].alternatives:
            print("STT: No speech detected.")
            # Use a generic message, not Korean
            return Response({'is_correct': False, 'transcribed_text': '[No speech detected]'})

        transcription = response.results[0].alternatives[0].transcript.strip()
        print(f"Transcribed: '{transcription}'")

        transcribed_norm = ''.join(c.lower() for c in transcription if c.isalnum() or c.isspace()).strip()
        correct_norm = ''.join(c.lower() for c in correct_prompt if c.isalnum() or c.isspace()).strip()
        
        is_correct = (transcribed_norm == correct_norm)

        print(f"Comparison: '{transcribed_norm}' vs '{correct_norm}' -> {is_correct}")

        return Response({
            'is_correct': is_correct,
            'transcribed_text': transcription
        })

    except Exception as e:
        print(f"Error calling Google Cloud STT API: {e}")
        print(traceback.format_exc())
        return Response({'error': f'Failed to transcribe audio: {e}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def complete_lesson(request):
    lesson_id = request.data.get('lesson_id')
    user = request.user

    if not lesson_id:
        return Response({'error': 'lesson_id not provided'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        lesson = Lesson.objects.get(id=lesson_id)
    except Lesson.DoesNotExist:
        return Response({'error': 'Lesson not found'}, status=status.HTTP_404_NOT_FOUND)

    # --- FIX 3: Correct logic. Use 'created' not 'progress.completed' ---
    # get_or_create checks if the (user, lesson) pair exists.
    # 'created' will be True if this is the first time, False otherwise.
    progress, created = UserLessonProgress.objects.get_or_create(
        user=user,
        lesson=lesson
    )

    xp_gained = 0
    if created:
        # Only add XP if the lesson was just completed
        xp_gained = 100 
        user.experience_points += xp_gained
        user.save()
        print(f"User {user.username} completed {lesson.title}. Total XP: {user.experience_points}")
    else:
        print(f"User {user.username} already completed {lesson.title}. No XP added.")
    # --- END FIX ---

    return Response({
        'status': 'Lesson completed',
        'xp_gained': xp_gained,
        'total_experience_points': user.experience_points
    }, status=status.HTTP_200_OK)

# --- LessonViewSet (remains the same) ---
class LessonViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Lesson.objects.all().order_by('id')
    serializer_class = LessonSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    # --- THIS IS THE MISSING PIECE ---
    # This function passes the 'request' object to the serializer
    # so the serializer can access request.user
    def get_serializer_context(self):
        context = super().get_serializer_context()
        context.update({'request': self.request})
        return context