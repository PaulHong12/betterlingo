import React, { useState, useEffect, useMemo, useRef, createContext, useContext } from 'react';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, SafeAreaView, Image, FlatList, ActivityIndicator, Platform, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import Voice from '@react-native-voice/voice';
import * as FileSystem from 'expo-file-system';

const API_URL = 'http://192.168.35.243:8000/api';

const Stack = createStackNavigator();
const AuthContext = createContext();

const AuthInput = ({ placeholder, value, onChangeText, secureTextEntry = false, keyboardType = 'default' }) => (
    <TextInput
        placeholder={placeholder}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        style={styles.authInput}
        placeholderTextColor="#A9A9A9"
        keyboardType={keyboardType}
        autoCapitalize="none"
    />
);
const AuthButton = ({ title, onPress, disabled = false }) => (
    <TouchableOpacity
        style={[styles.authButton, disabled && { backgroundColor: '#a9a9a9' }]}
        onPress={onPress}
        disabled={disabled}
    >
        <Text style={styles.authButtonText}>{title}</Text>
    </TouchableOpacity>
);

const LevelBar = () => {
    const { experience, level } = useContext(AuthContext);
    const progressPercent = (experience % 300) / 300 * 100;

    return (
        <View style={styles.levelBarContainer}>
            <Text style={styles.levelText}>Level {level}</Text>
            <View style={styles.levelBarOuter}>
                <View style={[styles.levelBarInner, { width: `${progressPercent}%` }]} />
            </View>
            <Text style={styles.levelText}>{experience} XP</Text>
        </View>
    );
};

const LoginScreen = ({ navigation }) => {
    const { signIn } = useContext(AuthContext);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const handleLogin = async () => {
        if (!username || !password) { alert('Enter user/pass.'); return; } setLoading(true);
        try {
            const response = await fetch(`${API_URL}/login/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });
            const data = await response.json();
            if (data.token) {
                signIn(data.token, data.experience_points);
            } else { alert('Login failed.'); }
        } catch (error) { console.error(error); alert('Login error.'); }
        finally { setLoading(false); }
    };
    return (
        <SafeAreaView style={styles.authContainer}>
            <Image source={require('./assets/icon.png')} style={styles.logo} />
            <Text style={styles.appName}>Betterlingo</Text>
            <Text style={styles.tagline}>Login</Text>
            <AuthInput placeholder="Username" value={username} onChangeText={setUsername} />
            <AuthInput placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry />
            <AuthButton title={loading ? "Logging in..." : "Login"} onPress={handleLogin} disabled={loading} />
            <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
                <Text style={styles.switchAuthText}>Sign up</Text>
            </TouchableOpacity>
        </SafeAreaView>
    );
};
const SignUpScreen = ({ navigation }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const handleSignUp = async () => {
        if (!username || !password || !email) { alert('Fill fields.'); return; } setLoading(true);
        try {
            const response = await fetch(`${API_URL}/register/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password, email }),
            });
            if (response.ok) {
                alert('Sign up OK! Login.');
                navigation.navigate('Login');
            } else {
                const errorData = await response.json();
                const msg = errorData.username ? errorData.username[0] : JSON.stringify(errorData);
                alert(`Sign up fail: ${msg}`);
            }
        } catch (error) { console.error(error); alert('Sign up error.'); }
        finally { setLoading(false); }
    };
    return (
        <SafeAreaView style={styles.authContainer}>
            <Image source={require('./assets/icon.png')} style={styles.logo} />
            <Text style={styles.appName}>Betterlingo</Text>
            <Text style={styles.tagline}>Create account</Text>
            <AuthInput placeholder="Username" value={username} onChangeText={setUsername} />
            <AuthInput placeholder="Email" value={email} onChangeText={setEmail} keyboardType="email-address" />
            <AuthInput placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry />
            <AuthButton title={loading ? "Creating..." : "Sign Up"} onPress={handleSignUp} disabled={loading} />
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={styles.switchAuthText}>Have account? Login</Text>
            </TouchableOpacity>
        </SafeAreaView>
    );
};
const LessonPage = ({ navigation }) => {
    const { token, signOut } = useContext(AuthContext);
    const [lessons, setLessons] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            fetchLessons();
        });
        return unsubscribe;
    }, [navigation, token]);

    const fetchLessons = async () => {
        if (!token) { signOut(); return; }
        setLoading(true);
        try {
            const response = await fetch(`${API_URL}/lessons/`, { headers: { 'Authorization': `Token ${token}` } });
            if (!response.ok) { if (response.status === 401) { signOut(); } else { throw new Error(`HTTP ${response.status}`); } return; }
            const data = await response.json();
            if (Array.isArray(data)) { setLessons(data); }
        } catch (error) { console.error("Fetch lessons:", error); alert('Could not fetch lessons.'); }
        finally { setLoading(false); }
    };

    if (loading) { return <SafeAreaView style={styles.pageContainer}><LevelBar /><ActivityIndicator size="large" color="#FFC700" /></SafeAreaView>; }
    return (
        <SafeAreaView style={styles.pageContainer}>
            <LevelBar />
            <Text style={styles.pageTitle}>Lessons</Text>
            <FlatList data={lessons} keyExtractor={item => item.id.toString()} renderItem={({ item }) => {
                try {
                    const lessonContent = item.topics;
                    if (!lessonContent || !lessonContent.title) return null;
                    return (
                        <TouchableOpacity
                            style={[styles.lessonItem, item.completed && styles.lessonItemCompleted]}
                            onPress={() => navigation.navigate('Lesson', { lesson: item })}
                        >
                            <Text style={styles.lessonTitle}>{lessonContent.title}</Text>
                            {item.completed && <Text style={styles.checkmark}>✅</Text>}
                        </TouchableOpacity>
                    );
                } catch (e) { console.error("Render lesson:", e); return null; }
            }} />
            <AuthButton title="Sign Out" onPress={signOut} />
        </SafeAreaView>
    );
};

const WordMatchingActivity = ({ activity, onComplete }) => {
    const originalPairs = useMemo(() => activity.pairs || [], [activity.pairs]);
    const [pairsState, setPairsState] = useState(() => originalPairs.map(p => ({ p, matched: false })));
    const [selected, setSelected] = useState([]);
    const shuffledWords = useMemo(() => originalPairs.flat().sort(() => 0.5 - Math.random()), [originalPairs]);
    useEffect(() => {
        if (selected.length !== 2) return;
        const [first, second] = selected;
        let isMatch = false;
        for (const pair of originalPairs) {
            if ((pair[0] === first && pair[1] === second) || (pair[0] === second && pair[1] === first)) {
                isMatch = true;
                break;
            }
        }
        if (isMatch) {
            setPairsState(current => current.map(item => (item.p.includes(first) && item.p.includes(second)) ? { ...item, matched: true } : item));
            setSelected([]);
        } else {
            const timer = setTimeout(() => setSelected([]), 500);
            return () => clearTimeout(timer);
        }
    }, [selected, originalPairs]);
    useEffect(() => {
        if (pairsState.length > 0 && pairsState.every(p => p.matched)) {
            const timer = setTimeout(() => onComplete(), 500);
            return () => clearTimeout(timer);
        }
    }, [pairsState, onComplete]);
    const handleSelect = (word) => {
        const pairInfo = pairsState.find(({ p }) => p.includes(word));
        const isMatched = pairInfo?.matched;
        if (!isMatched && selected.length < 2 && !selected.includes(word)) {
            setSelected(current => [...current, word]);
        }
    };
    return (
        <View style={styles.activityContainer}>
            <Text style={styles.activityTitle}>{activity.title}</Text>
            <View style={styles.wordBank}>
                {shuffledWords.map((word, index) => {
                    const pairInfo = pairsState.find(({ p }) => p.includes(word));
                    const isMatched = pairInfo?.matched;
                    const isSelected = selected.includes(word);
                    return (
                        <TouchableOpacity
                            key={`${word}-${index}`}
                            style={[
                                styles.wordOption,
                                isSelected && !isMatched && styles.wordSelected,
                                isMatched && styles.wordMatched,
                            ]}
                            onPress={() => handleSelect(word)}
                            disabled={isMatched || (selected.length >= 2 && !isSelected)}
                        >
                            <Text style={styles.wordOptionText}>{word}</Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
};
const WordOrderingActivity = ({ activity, onComplete }) => {
    const initialWords = useMemo(() => [...(activity.words || [])].sort(() => 0.5 - Math.random()), [activity.words]);
    const [wordOptions, setWordOptions] = useState(initialWords);
    const [orderedSentence, setOrderedSentence] = useState([]);
    const [isCorrect, setIsCorrect] = useState(null);
    const handleSelectOption = (word, index) => {
        setOrderedSentence(prev => [...prev, word]);
        setWordOptions(prev => prev.filter((w, i) => i !== index));
        setIsCorrect(null);
    };
    const handleDeselect = (word, index) => {
        setWordOptions(prev => [...prev, word]);
        setOrderedSentence(prev => prev.filter((w, i) => i !== index));
        setIsCorrect(null);
    };
    const checkAnswer = () => {
        const correct = orderedSentence.join(' ') === activity.prompt;
        setIsCorrect(correct);
        if (correct) {
            setTimeout(() => onComplete(), 1000);
        } else {
            alert('Try again!');
        }
    };
    return (
        <View style={styles.activityContainer}>
            <Text style={styles.activityTitle}>{activity.title}</Text>
            <View style={[styles.wordBank, styles.sentenceBank]}>
                {orderedSentence.map((word, index) => (
                    <TouchableOpacity key={`${word}-${index}`} style={styles.wordOption} onPress={() => handleDeselect(word, index)}>
                        <Text style={styles.wordOptionText}>{word}</Text>
                    </TouchableOpacity>
                ))}
                {orderedSentence.length === 0 && <Text style={styles.placeholderText}>Tap words</Text>}
            </View>
            <View style={styles.wordBank}>
                {wordOptions.map((word, index) => (
                    <TouchableOpacity key={`${word}-${index}`} style={styles.wordOption} onPress={() => handleSelectOption(word, index)}>
                        <Text style={styles.wordOptionText}>{word}</Text>
                    </TouchableOpacity>
                ))}
            </View>
            <AuthButton
                title={isCorrect === true ? "Correct!" : "Check"}
                onPress={checkAnswer}
                disabled={wordOptions.length > 0 || isCorrect === true}
            />
            {isCorrect === false && <Text style={styles.tryAgainText}>Try again!</Text>}
        </View>
    );
};
const ListeningActivity = ({ activity, onComplete }) => {
    const [sound, setSound] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [selectedAnswer, setSelectedAnswer] = useState(null);
    const { token } = useContext(AuthContext);
    const playSound = async () => {
        if (isPlaying) return;
        setIsPlaying(true);
        let newSound = null;
        try {
            if (!token) {
                alert("Auth error.");
                setIsPlaying(false);
                return;
            }
            const response = await fetch(`${API_URL}/generate-gemini-audio/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Token ${token}` },
                body: JSON.stringify({ text: activity.prompt_audio_text })
            });
            if (!response.ok) {
                throw new Error(`Audio generation failed: ${response.status}`);
            }

            const data = await response.json();
            const uri = data.audioUrl;
            if (!uri) {
                throw new Error("No audioUrl in response");
            }

            await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
            const { sound } = await Audio.Sound.createAsync({ uri: uri }, { shouldPlay: true });
            newSound = sound;
            setSound(newSound);
            newSound.setOnPlaybackStatusUpdate(status => {
                if (status.didJustFinish) {
                    newSound.unloadAsync();
                    setSound(null);
                    setIsPlaying(false);
                } else if (!status.isLoaded && status.error) {
                    console.error("Playback Error:", status.error);
                    setIsPlaying(false);
                }
            });
        } catch (error) {
            console.error("Sound Fetch Error:", error);
            alert("Could not get audio.");
            setIsPlaying(false);
        }
    };
    useEffect(() => {
        return sound ? () => {
            sound.unloadAsync();
        } : undefined;
    }, [sound]);
    const handleSelectAnswer = (option) => {
        setSelectedAnswer(option);
        if (option === activity.correct_answer) {
            setTimeout(() => onComplete(), 500);
        } else {
            alert('Incorrect!');
            setTimeout(() => setSelectedAnswer(null), 1000);
        }
    };
    return (
        <View style={styles.activityContainer}>
            <Text style={styles.activityTitle}>{activity.title}</Text>
            <TouchableOpacity onPress={playSound} style={styles.soundButton} disabled={isPlaying}>
                {isPlaying ? <ActivityIndicator color="#4B4B4B" /> : <Text style={{ fontSize: 50 }}>🔊</Text>}
            </TouchableOpacity>
            <View style={styles.choiceContainer}>
                {activity.options.map(option => (
                    <TouchableOpacity
                        key={option}
                        style={[
                            styles.choiceButton,
                            selectedAnswer === option && styles.choiceSelected
                        ]}
                        onPress={() => handleSelectAnswer(option)}
                        disabled={selectedAnswer !== null}
                    >
                        <Text style={styles.choiceButtonText}>{option}</Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
};

const SpeakingActivity = ({ activity, onComplete }) => {
    const { token } = useContext(AuthContext);
    const [recording, setRecording] = useState(null);
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [result, setResult] = useState(null);
    const [transcribedText, setTranscribedText] = useState('');

    const startRecording = async () => {
        try {
            const perm = await Audio.requestPermissionsAsync();
            if (!perm.granted) {
                alert("Microphone permission is required to record.");
                return;
            }
            await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });

            console.log('Starting recording..');
            setResult(null);
            setTranscribedText('');

            const recordingOptions = {
                isMeteringEnabled: true,
                android: {
                    extension: '.wav',
                    outputFormat: Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_PCM_16BIT,
                    audioEncoder: Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_PCM_16BIT,
                    sampleRate: 16000,
                    numberOfChannels: 1,
                },
                ios: {
                    extension: '.wav',
                    audioQuality: Audio.RECORDING_OPTION_IOS_AUDIO_QUALITY_MAX,
                    outputFormat: Audio.RECORDING_OPTION_IOS_OUTPUT_FORMAT_LINEARPCM,
                    sampleRate: 16000,
                    numberOfChannels: 1,
                    bitRate: 256000,
                    linearPCMBitDepth: 16,
                    linearPCMIsBigEndian: false,
                    linearPCMIsFloat: false,
                },
                web: {},
            };

            const { recording } = await Audio.Recording.createAsync(
                recordingOptions
            );

            setRecording(recording);
            setIsRecording(true);
            console.log('Recording started');
        } catch (err) {
            console.error('Failed to start recording', err);
            alert('Failed to start recording.');
        }
    };

 const stopRecording = async () => {
        console.log('Stopping recording..');
        setIsRecording(false);
        setIsProcessing(true);
        try {
            await recording.stopAndUnloadAsync();
            await Audio.setAudioModeAsync({ allowsRecordingIOS: false });

            const uri = recording.getURI();
            console.log('Recording stopped and stored at', uri);

            let audioBase64;

            if (Platform.OS === 'web') {
                console.log('Using web fetch/FileReader for blob');
                const response = await fetch(uri);
                const blob = await response.blob();
                
                audioBase64 = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onerror = reject;
                    reader.onload = () => {
                        const base64Data = reader.result.split(',')[1];
                        resolve(base64Data);
                    };
                    reader.readAsDataURL(blob);
                });

            } else {
                console.log('Using native FileSystem for file');
                audioBase64 = await FileSystem.readAsStringAsync(uri, {
                    encoding: 'base64'
                });
            }

            // --- THIS IS THE FIX ---
            // Send the platform to the backend
            const response = await fetch(`${API_URL}/transcribe-audio/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Token ${token}` },
                body: JSON.stringify({
                    audio_base64: audioBase64,
                    prompt: activity.prompt,
                    platform: Platform.OS // <-- ADD THIS LINE
                })
            });
            // --- END OF FIX ---

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || "Backend processing failed");
            }

            console.log("Backend response:", data);
            setTranscribedText(data.transcribed_text);
            if (data.is_correct) {
                setResult('correct');
                setTimeout(() => onComplete(), 1500);
            } else {
                setResult('incorrect');
            }

        } catch (err) {
            console.error('Failed to stop/process recording', err);
            alert(`Error: ${err.message}`);
        } finally {
            setIsProcessing(false);
            setRecording(null);
        }
    };
    
    return (
        <View style={styles.activityContainer}>
            <Text style={styles.activityTitle}>{activity.title}</Text>
            <Text style={styles.speakingPrompt}>"{activity.prompt}"</Text>

            <TouchableOpacity
                onPress={isRecording ? stopRecording : startRecording}
                style={[styles.soundButton, isRecording && styles.micButtonActive]}
                disabled={isProcessing}
            >
                {isProcessing ? (
                    <ActivityIndicator color="#4B4B4B" />
                ) : isRecording ? (
                    <Text style={{ fontSize: 50 }}>⏹</Text>
                ) : (
                    <Text style={{ fontSize: 50 }}>🎤</Text>
                )}
            </TouchableOpacity>

            {transcribedText ? (
                <View>
                    <Text style={styles.tryAgainText}>You said: "{transcribedText}"</Text>
                </View>
            ) : null}

            {result === 'correct' && <Text style={styles.correctText}>Correct!</Text>}
            {result === 'incorrect' && <Text style={styles.tryAgainText}>Not quite. Try again!</Text>}
        </View>
    );
};


const LessonScreen = ({ route, navigation }) => {
    const { lesson } = route.params || {};
    const [activityIndex, setActivityIndex] = useState(0);
    const { token, addExperience } = useContext(AuthContext);

    const lessonContent = lesson?.topics;
    if (!lessonContent || !Array.isArray(lessonContent.activities) || lessonContent.activities.length === 0) { return <SafeAreaView style={styles.pageContainer}><Text>Error: Invalid lesson data.</Text></SafeAreaView>; }

    const handleActivityComplete = () => {
        if (activityIndex < lessonContent.activities.length - 1) {
            setActivityIndex(prevIndex => prevIndex + 1);
        } else {
            completeLesson();
        }
    };
    
    const completeLesson = async () => {
         try {
             const response = await fetch(`${API_URL}/complete-lesson/`, {
                 method: 'POST',
                 headers: { 'Content-Type': 'application/json', 'Authorization': `Token ${token}` },
                 body: JSON.stringify({ lesson_id: lesson.id })
             });
             if (!response.ok) {
                 throw new Error("Failed to save progress to backend.");
             }
             const data = await response.json();
             addExperience(data.total_experience_points);
             navigation.navigate('Score');
         } catch (error) {
              console.error("Failed to complete lesson:", error);
              alert("Error saving progress. Please try again.");
              navigation.navigate('Score');
         }
    };

    const currentActivity = lessonContent.activities[activityIndex];
    let activityComponent;
    switch (currentActivity?.type) {
        case 'MATCHING': activityComponent = <WordMatchingActivity activity={currentActivity} onComplete={handleActivityComplete} />; break;
        case 'ORDERING': activityComponent = <WordOrderingActivity activity={currentActivity} onComplete={handleActivityComplete} />; break;
        case 'LISTENING': activityComponent = <ListeningActivity activity={currentActivity} onComplete={handleActivityComplete} />; break;
        case 'SPEAKING': activityComponent = <SpeakingActivity activity={currentActivity} onComplete={handleActivityComplete} />; break;
        default: activityComponent = <Text>Unknown activity type: {currentActivity?.type}</Text>;
    }
    return (
        <SafeAreaView style={styles.pageContainer}>
            <LevelBar />
            <Text style={styles.pageTitle}>{lessonContent.title} (Step {activityIndex + 1}/{lessonContent.activities.length})</Text>
            <ScrollView style={{ flex: 1 }}>{activityComponent}</ScrollView>
            <AuthButton title="Practice with AI Tutor" onPress={() => navigation.navigate('Chat', { lessonTitle: lessonContent.title, activityContext: currentActivity })} />
        </SafeAreaView>
    );
};


const ChatScreen = ({ route, navigation }) => {
    const { lessonTitle, activityContext } = route.params || {};
    const { token } = useContext(AuthContext);
    const [messages, setMessages] = useState([]);
    const [isListening, setIsListening] = useState(false);
    const [isResponding, setIsResponding] = useState(false);
    const [inputText, setInputText] = useState('');
    const flatListRef = useRef();
    useEffect(() => {
        if (Platform.OS !== 'web') {
            Voice.onSpeechError = (e) => { console.error('STT Error:', e); setIsListening(false); };
            Voice.onSpeechResults = (e) => { if (e.value && e.value[0]) { handleUserMessage(e.value[0]); } setIsListening(false); };
            Voice.onSpeechEnd = () => setIsListening(false);
        }
        const firstMessage = `Okay, let's practice "${activityContext?.title || lessonTitle}". Ask me anything or try using the key words!`;
        setMessages([{ role: 'tutor', content: firstMessage }]);
        return () => {
            if (Platform.OS !== 'web') {
                Voice.destroy().then(Voice.removeAllListeners);
            }
        };
    }, [lessonTitle, activityContext]);
    const handleUserMessage = (text) => {
        if (!text || text.trim() === '' || isResponding || !token) return;
        const newMessage = { role: 'user', content: text.trim() };
        setMessages(prev => [...prev, newMessage]);
        setInputText('');
        getAIResponse(text.trim());
    };
    const getAIResponse = async (userMessage) => {
        if (!activityContext || isResponding || !token) return;
        setIsResponding(true);
        try {
            const response = await fetch(`${API_URL}/chat/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Token ${token}` },
                body: JSON.stringify({ message: userMessage, context: activityContext, lesson_title: lessonTitle }),
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            if (data.reply) {
                const aiMessage = { role: 'tutor', content: data.reply };
                setMessages(prev => [...prev, aiMessage]);
            } else {
                throw new Error('Invalid AI response');
            }
        } catch (error) {
            console.error("AI Error:", error);
            alert('AI response failed.');
        } finally {
            setIsResponding(false);
        }
    };
    const toggleListen = async () => {
        if (Platform.OS === 'web') {
            alert("Voice not supported.");
            return;
        }
        if (isListening) {
            try { await Voice.stop(); } catch (e) { console.error("Voice stop:", e); }
            setIsListening(false);
        } else {
            try { await Voice.start('en-US'); setIsListening(true); } catch (e) { console.error("Voice start:", e); setIsListening(false); }
        }
    };
    return (
        <SafeAreaView style={styles.pageContainer}>
            <LevelBar />
            <Text style={styles.pageTitle}>AI Tutor: {lessonTitle}</Text>
            <FlatList
                ref={flatListRef}
                data={messages}
                keyExtractor={(_, index) => index.toString()}
                onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
                renderItem={({ item }) => (
                    <View style={[styles.messageBubble, item.role === 'user' ? styles.userBubble : styles.tutorBubble]}>
                        <Text style={styles.messageText}>{item.content}</Text>
                    </View>
                )}
                style={{ flex: 1, marginVertical: 10 }}
            />
            {isResponding && <ActivityIndicator style={{ marginVertical: 5 }} color="#FFC700" />}
            <View style={styles.inputArea}>
                <TextInput
                    style={styles.chatInput}
                    value={inputText}
                    onChangeText={setInputText}
                    placeholder="Type or tap mic..."
                    onSubmitEditing={() => handleUserMessage(inputText)}
                />
                {Platform.OS !== 'web' && (
                    <TouchableOpacity
                        style={[styles.smallMicButton, isListening && styles.micButtonActive]}
                        onPress={toggleListen}
                        disabled={isResponding}
                    >
                        <Image source={require('./assets/icon.png')} style={{ width: 25, height: 25 }} />
                    </TouchableOpacity>
                )}
                <TouchableOpacity
                    style={styles.sendButton}
                    onPress={() => handleUserMessage(inputText)}
                    disabled={isResponding || !inputText.trim()}
                >
                    <Text>Send</Text>
                </TouchableOpacity>
            </View>
            <AuthButton title="Back to Lesson" onPress={() => navigation.goBack()} />
        </SafeAreaView>
    );
};

const ScoreScreen = ({ navigation }) => (
    <SafeAreaView style={[styles.pageContainer, { justifyContent: 'center', alignItems: 'center' }]}>
        <Image source={require('./assets/icon.png')} style={{ width: 150, height: 150, resizeMode: 'contain' }} />
        <Text style={styles.scoreText}>Lesson Complete!</Text>
        <Text style={styles.scoreNumber}>+100 XP</Text>
        <View style={{ marginTop: 40, width: '100%' }}>
            <AuthButton title="Continue" onPress={() => navigation.replace('LessonPage')} />
        </View>
    </SafeAreaView>
);

function App() {
    const [userToken, setUserToken] = useState(null);
    const [experience, setExperience] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    const level = useMemo(() => 1 + Math.floor(experience / 300), [experience]);

    useEffect(() => {
        const bootstrapAsync = async () => {
            let token; let xp;
            try {
                token = await AsyncStorage.getItem('userToken');
                xp = await AsyncStorage.getItem('userXP');
            } catch (e) { console.error("Failed to load async storage", e) }
            setUserToken(token);
            setExperience(xp ? parseInt(xp, 10) : 0);
            setIsLoading(false);
        };
        bootstrapAsync();
    }, []);

    const authContext = useMemo(() => ({
        signIn: async (token, initialXp) => {
            const xpToStore = initialXp !== undefined ? initialXp : 0;
            await AsyncStorage.setItem('userToken', token);
            await AsyncStorage.setItem('userXP', xpToStore.toString());
            setUserToken(token);
            setExperience(xpToStore);
        },
        signOut: async () => {
            await AsyncStorage.removeItem('userToken');
            await AsyncStorage.removeItem('userXP');
            setUserToken(null);
            setExperience(0);
        },
        addExperience: async (totalXp) => {
            setExperience(totalXp);
            try {
                await AsyncStorage.setItem('userXP', totalXp.toString());
            } catch (e) { console.error("Failed to save XP", e) }
        },
        token: userToken,
        experience: experience,
        level: level,
    }), [userToken, experience, level]);

    if (isLoading) {
        return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size="large" /></View>;
    }

    return (
        <AuthContext.Provider value={authContext}>
            <NavigationContainer>
                <Stack.Navigator screenOptions={{ headerShown: false, cardStyle: { backgroundColor: '#F0FFF0' } }}>
                    {userToken == null ? (
                        <>
                            <Stack.Screen name="Login" component={LoginScreen} />
                            <Stack.Screen name="SignUp" component={SignUpScreen} />
                        </>
                    ) : (
                        <>
                            <Stack.Screen name="LessonPage" component={LessonPage} />
                            <Stack.Screen name="Lesson" component={LessonScreen} />
                            <Stack.Screen name="Chat" component={ChatScreen} />
                            <Stack.Screen name="Score" component={ScoreScreen} />
                        </>
                    )}
                </Stack.Navigator>
            </NavigationContainer>
        </AuthContext.Provider>
    );
}

const styles = StyleSheet.create({
    authContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#F0FFF0' },
    logo: { width: 100, height: 100, marginBottom: 20, resizeMode: 'contain' },
    appName: { fontSize: 32, fontWeight: 'bold', color: '#4B4B4B', marginBottom: 5 },
    tagline: { fontSize: 16, color: '#6E6E6E', marginBottom: 30 },
    authInput: { width: '100%', backgroundColor: '#FFFFFF', padding: 15, borderRadius: 10, marginBottom: 15, fontSize: 16, borderWidth: 1, borderColor: '#E0E0E0' },
    authButton: { width: '100%', backgroundColor: '#FFC700', padding: 15, borderRadius: 10, alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5, marginTop: 10, boxShadow: '0 2px 5px rgba(0,0,0,0.1)' },
    authButtonText: { fontSize: 16, fontWeight: 'bold', color: '#4B4B4B' },
    switchAuthText: { color: '#6E6E6E', marginTop: 20 },
    pageContainer: { flex: 1, backgroundColor: '#F0FFF0', paddingHorizontal: 20, paddingTop: 10 },
    levelBarContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, padding: 8, elevation: 1, marginBottom: 10 },
    levelText: { fontSize: 14, fontWeight: 'bold', color: '#4B4B4B', marginHorizontal: 8 },
    levelBarOuter: { flex: 1, height: 12, backgroundColor: '#E0E0E0', borderRadius: 6 },
    levelBarInner: { height: '100%', backgroundColor: '#58cc02', borderRadius: 6 },
    pageTitle: { fontSize: 24, fontWeight: 'bold', color: '#4B4B4B', marginVertical: 15, textAlign: 'center' },
    lessonItem: { backgroundColor: '#FFFFFF', padding: 20, borderRadius: 15, marginBottom: 15, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' },
    lessonItemCompleted: { backgroundColor: '#e8f5e9' },
    lessonTitle: { fontSize: 18, fontWeight: '600', color: '#4B4B4B' },
    checkmark: { fontSize: 24, color: 'green' },
    scoreText: { fontSize: 24, color: '#4B4B4B', marginTop: 20 },
    scoreNumber: { fontSize: 72, fontWeight: 'bold', color: '#4B4B4B' },
    activityContainer: { flex: 1, width: '100%', padding: 15, backgroundColor: '#fff', borderRadius: 15, marginBottom: 15 },
    activityTitle: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 20, color: '#4B4B4B' },
    wordBank: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginBottom: 20, minHeight: 60, paddingVertical: 10 },
    wordOption: { backgroundColor: '#FFFFFF', paddingVertical: 10, paddingHorizontal: 15, borderRadius: 20, margin: 5, borderWidth: 2, borderColor: '#dcdcdc', elevation: 1 },
    wordOptionText: { fontSize: 16, color: '#333' },
    wordSelected: { backgroundColor: '#FFDEAD', borderColor: '#FFC700' },
    wordMatched: { backgroundColor: '#e0e0e0', borderColor: '#c0c0c0', opacity: 0.5 },
    sentenceBank: { backgroundColor: '#f0f0f0', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#e0e0e0' },
    placeholderText: { color: '#aaa', fontStyle: 'italic', alignSelf: 'center' },
    tryAgainText: { color: 'red', textAlign: 'center', marginTop: 10, fontWeight: 'bold' },
    correctText: { color: 'green', textAlign: 'center', marginTop: 10, fontWeight: 'bold', fontSize: 18 },
    soundButton: { alignSelf: 'center', marginVertical: 30, backgroundColor: '#fff', padding: 20, borderRadius: 50, elevation: 3, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5, boxShadow: '0 3px 5px rgba(0,0,0,0.1)' },
    choiceContainer: { marginTop: 20 },
    choiceButton: { backgroundColor: '#FFFFFF', padding: 15, borderRadius: 10, marginBottom: 10, borderWidth: 2, borderColor: '#e0e0e0' },
    choiceSelected: { borderColor: '#FFC700', backgroundColor: '#FFFACD' },
    choiceButtonText: { textAlign: 'center', fontSize: 16, fontWeight: '500' },
    speakingPrompt: { fontSize: 20, fontStyle: 'italic', color: '#333', marginVertical: 20, padding: 15, backgroundColor: '#f0f0f0', borderRadius: 5, textAlign: 'center' },
    inputArea: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderTopWidth: 1, borderColor: '#E0E0E0', backgroundColor: '#fff' },
    chatInput: { flex: 1, borderWidth: 1, borderColor: '#ccc', borderRadius: 20, paddingHorizontal: 15, paddingVertical: 10, marginRight: 8, backgroundColor: '#fff' },
    sendButton: { paddingHorizontal: 15, paddingVertical: 10, backgroundColor: '#FFC700', borderRadius: 20 },
    chatList: { flex: 1 },
    messageBubble: { padding: 10, borderRadius: 15, marginVertical: 3, maxWidth: '80%' },
    userBubble: { backgroundColor: '#FFDEAD', alignSelf: 'flex-end' },
    tutorBubble: { backgroundColor: '#E0E0E0', alignSelf: 'flex-start' },
    messageText: { fontSize: 15, color: '#4B4B4B' },
    smallMicButton: { backgroundColor: '#FFC700', width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 8 },
    micButtonActive: { backgroundColor: '#ff725e' },
});

export default App;