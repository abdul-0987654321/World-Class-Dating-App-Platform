import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Animated,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
// import AudioRecorderPlayer from 'react-native-audio-recorder-player'; // Install when needed

interface VoiceRecorderProps {
  maxDuration?: number; // Maximum recording duration in seconds (default: 60)
  onRecordingComplete: (audioPath: string, duration: number, waveformData: number[]) => void;
  onCancel: () => void;
  context?: 'profile' | 'prompt' | 'message';
}

const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  maxDuration = 60,
  onRecordingComplete,
  onCancel,
  context = 'message',
}) => {
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [recordingTime, setRecordingTime] = useState<number>(0);
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const [waveformData, setWaveformData] = useState<number[]>([]);
  const [audioPath, setAudioPath] = useState<string>('');

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const waveformTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const audioRecorderPlayer = useRef<any>(null); // AudioRecorderPlayer instance

  useEffect(() => {
    checkPermissions();
    startPulseAnimation();

    return () => {
      cleanup();
    };
  }, []);

  const checkPermissions = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: 'Microphone Permission',
            message: 'This app needs access to your microphone to record voice notes.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );

        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          setHasPermission(true);
        } else {
          Alert.alert(
            'Permission Denied',
            'Microphone permission is required to record voice notes.',
            [{ text: 'OK', onPress: onCancel }]
          );
        }
      } catch (err) {
        console.error('Permission error:', err);
        Alert.alert('Error', 'Failed to request microphone permission.');
      }
    } else {
      // iOS permissions are handled by the library
      setHasPermission(true);
    }
  };

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const cleanup = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    if (waveformTimerRef.current) {
      clearInterval(waveformTimerRef.current);
    }
    if (audioRecorderPlayer.current) {
      audioRecorderPlayer.current.stopRecorder();
    }
  };

  const startRecording = async () => {
    if (!hasPermission) {
      Alert.alert('Permission Required', 'Please grant microphone permission.');
      return;
    }

    try {
      setIsRecording(true);
      setRecordingTime(0);
      setWaveformData([]);

      // Start recording (mock for now)
      // Uncomment when react-native-audio-recorder-player is installed:
      /*
      const path = Platform.select({
        ios: 'voice-note.m4a',
        android: `${RNFS.DocumentDirectoryPath}/voice-note.mp3`,
      });

      await audioRecorderPlayer.current.startRecorder(path);
      audioRecorderPlayer.current.addRecordBackListener((e: any) => {
        // Update recording time
        const time = Math.floor(e.currentPosition / 1000);
        setRecordingTime(time);

        // Update waveform (simplified - use actual metering in production)
        const amplitude = Math.random() * 100; // e.currentMetering or similar
        setWaveformData(prev => [...prev, amplitude].slice(-50)); // Keep last 50 samples

        if (time >= maxDuration) {
          stopRecording();
        }
      });
      */

      // Mock recording for now
      const mockPath = 'file:///mock/audio.mp3';
      setAudioPath(mockPath);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          const newTime = prev + 1;
          if (newTime >= maxDuration) {
            stopRecording();
            return maxDuration;
          }
          return newTime;
        });
      }, 1000);

      // Simulate waveform generation
      waveformTimerRef.current = setInterval(() => {
        const amplitude = 20 + Math.random() * 80;
        setWaveformData((prev) => [...prev, amplitude].slice(-50));
      }, 100);
    } catch (error) {
      console.error('Recording failed:', error);
      Alert.alert('Error', 'Failed to start recording. Please try again.');
      cleanup();
      setIsRecording(false);
    }
  };

  const stopRecording = async () => {
    try {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      if (waveformTimerRef.current) {
        clearInterval(waveformTimerRef.current);
        waveformTimerRef.current = null;
      }

      // Uncomment when react-native-audio-recorder-player is installed:
      /*
      const result = await audioRecorderPlayer.current.stopRecorder();
      audioRecorderPlayer.current.removeRecordBackListener();
      setAudioPath(result);
      */

      setIsRecording(false);
      setIsPaused(false);

      // Only proceed if recording was longer than 1 second
      if (recordingTime < 1) {
        Alert.alert('Too Short', 'Please record a longer voice note.');
        return;
      }

      onRecordingComplete(audioPath || 'file:///mock/audio.mp3', recordingTime, waveformData);
    } catch (error) {
      console.error('Stop recording failed:', error);
      Alert.alert('Error', 'Failed to stop recording.');
    }
  };

  const pauseRecording = async () => {
    try {
      // Uncomment when react-native-audio-recorder-player is installed:
      // await audioRecorderPlayer.current.pauseRecorder();

      setIsPaused(true);

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      if (waveformTimerRef.current) {
        clearInterval(waveformTimerRef.current);
        waveformTimerRef.current = null;
      }
    } catch (error) {
      console.error('Pause recording failed:', error);
    }
  };

  const resumeRecording = async () => {
    try {
      // Uncomment when react-native-audio-recorder-player is installed:
      // await audioRecorderPlayer.current.resumeRecorder();

      setIsPaused(false);

      // Resume timer
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          const newTime = prev + 1;
          if (newTime >= maxDuration) {
            stopRecording();
            return maxDuration;
          }
          return newTime;
        });
      }, 1000);

      // Resume waveform
      waveformTimerRef.current = setInterval(() => {
        const amplitude = 20 + Math.random() * 80;
        setWaveformData((prev) => [...prev, amplitude].slice(-50));
      }, 100);
    } catch (error) {
      console.error('Resume recording failed:', error);
    }
  };

  const cancelRecording = () => {
    cleanup();
    setIsRecording(false);
    setIsPaused(false);
    setRecordingTime(0);
    setWaveformData([]);
    onCancel();
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getContextTitle = (): string => {
    switch (context) {
      case 'profile':
        return 'Record Voice Intro';
      case 'prompt':
        return 'Answer with Voice';
      case 'message':
        return 'Voice Message';
      default:
        return 'Voice Recording';
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{getContextTitle()}</Text>
        <TouchableOpacity onPress={cancelRecording} style={styles.closeButton}>
          <Icon name="close" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      {/* Waveform visualization */}
      <View style={styles.waveformContainer}>
        {waveformData.length > 0 ? (
          <View style={styles.waveform}>
            {waveformData.map((amplitude, index) => (
              <View
                key={index}
                style={[
                  styles.waveformBar,
                  {
                    height: Math.max(4, amplitude),
                    opacity: isRecording && !isPaused ? 1 : 0.5,
                  },
                ]}
              />
            ))}
          </View>
        ) : (
          <View style={styles.waveformPlaceholder}>
            <Icon name="waveform" size={64} color="#DDD" />
            <Text style={styles.placeholderText}>Tap to start recording</Text>
          </View>
        )}
      </View>

      {/* Timer */}
      <View style={styles.timerContainer}>
        <Text style={styles.timerText}>{formatTime(recordingTime)}</Text>
        <Text style={styles.maxTimeText}>/ {formatTime(maxDuration)}</Text>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        {!isRecording ? (
          <TouchableOpacity onPress={startRecording} style={styles.recordButton}>
            <Animated.View style={[styles.recordButtonInner, { transform: [{ scale: pulseAnim }] }]}>
              <Icon name="microphone" size={32} color="#FFF" />
            </Animated.View>
          </TouchableOpacity>
        ) : (
          <View style={styles.recordingControls}>
            <TouchableOpacity
              onPress={isPaused ? resumeRecording : pauseRecording}
              style={styles.controlButton}
            >
              <Icon name={isPaused ? 'play' : 'pause'} size={28} color="#333" />
            </TouchableOpacity>

            <TouchableOpacity onPress={stopRecording} style={styles.stopButton}>
              <Icon name="stop" size={28} color="#FFF" />
            </TouchableOpacity>

            <TouchableOpacity onPress={cancelRecording} style={styles.controlButton}>
              <Icon name="delete" size={28} color="#F44336" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Hints */}
      <View style={styles.hints}>
        {!isRecording ? (
          <>
            <Text style={styles.hintText}>• Find a quiet place</Text>
            <Text style={styles.hintText}>• Speak clearly and naturally</Text>
            <Text style={styles.hintText}>• Max {maxDuration} seconds</Text>
          </>
        ) : (
          <Text style={styles.hintText}>
            {isPaused ? 'Recording paused' : 'Recording in progress...'}
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 8,
  },
  waveformContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    marginBottom: 20,
    padding: 20,
  },
  waveform: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    height: 100,
  },
  waveformBar: {
    width: 4,
    borderRadius: 2,
    backgroundColor: '#FF6B6B',
  },
  waveformPlaceholder: {
    alignItems: 'center',
  },
  placeholderText: {
    marginTop: 16,
    fontSize: 16,
    color: '#999',
  },
  timerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'baseline',
    marginBottom: 30,
  },
  timerText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#333',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  maxTimeText: {
    fontSize: 20,
    color: '#999',
    marginLeft: 8,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  controls: {
    alignItems: 'center',
    marginBottom: 20,
  },
  recordButton: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  recordButtonInner: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordingControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  controlButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  stopButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  hints: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
  },
  hintText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
    textAlign: 'center',
  },
});

export default VoiceRecorder;
