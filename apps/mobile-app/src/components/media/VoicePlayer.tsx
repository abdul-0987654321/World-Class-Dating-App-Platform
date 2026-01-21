import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
// import AudioRecorderPlayer from 'react-native-audio-recorder-player'; // Install when needed

interface VoicePlayerProps {
  audioUrl: string;
  duration: number;
  waveformData?: number[];
  onPlaybackComplete?: () => void;
  style?: any;
  showWaveform?: boolean;
  compact?: boolean;
}

const VoicePlayer: React.FC<VoicePlayerProps> = ({
  audioUrl,
  duration,
  waveformData = [],
  onPlaybackComplete,
  style,
  showWaveform = true,
  compact = false,
}) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [playbackDuration, setPlaybackDuration] = useState<number>(duration);

  const audioRecorderPlayer = useRef<any>(null); // AudioRecorderPlayer instance
  const progressAnim = useRef(new Animated.Value(0)).current;
  const waveformAnims = useRef(waveformData.map(() => new Animated.Value(1))).current;

  useEffect(() => {
    // Animate waveform when playing
    if (isPlaying && showWaveform) {
      animateWaveform();
    }

    return () => {
      cleanup();
    };
  }, [isPlaying]);

  const cleanup = () => {
    if (audioRecorderPlayer.current) {
      audioRecorderPlayer.current.stopPlayer();
      audioRecorderPlayer.current.removePlayBackListener();
    }
  };

  const animateWaveform = () => {
    const animations = waveformAnims.map((anim, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: 1.5,
            duration: 300 + index * 50,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 1,
            duration: 300 + index * 50,
            useNativeDriver: true,
          }),
        ])
      )
    );

    Animated.stagger(50, animations).start();
  };

  const togglePlayback = async () => {
    if (isPlaying) {
      await pausePlayback();
    } else {
      await startPlayback();
    }
  };

  const startPlayback = async () => {
    try {
      setIsLoading(true);

      // Uncomment when react-native-audio-recorder-player is installed:
      /*
      const msg = await audioRecorderPlayer.current.startPlayer(audioUrl);

      audioRecorderPlayer.current.addPlayBackListener((e: any) => {
        const progress = e.currentPosition / e.duration;
        const currentSec = Math.floor(e.currentPosition / 1000);

        setCurrentTime(currentSec);
        setPlaybackDuration(Math.floor(e.duration / 1000));

        // Update progress animation
        Animated.timing(progressAnim, {
          toValue: progress,
          duration: 100,
          useNativeDriver: false,
        }).start();

        if (e.currentPosition === e.duration) {
          handlePlaybackComplete();
        }
      });
      */

      // Mock playback for now
      setIsPlaying(true);
      setIsLoading(false);

      // Simulate progress
      const totalSteps = duration * 10;
      let step = 0;

      const interval = setInterval(() => {
        step++;
        const progress = step / totalSteps;
        const currentSec = Math.floor((duration * step) / totalSteps);

        setCurrentTime(currentSec);

        Animated.timing(progressAnim, {
          toValue: progress,
          duration: 100,
          useNativeDriver: false,
        }).start();

        if (step >= totalSteps) {
          clearInterval(interval);
          handlePlaybackComplete();
        }
      }, 100);
    } catch (error) {
      console.error('Playback failed:', error);
      setIsLoading(false);
      setIsPlaying(false);
    }
  };

  const pausePlayback = async () => {
    try {
      // Uncomment when react-native-audio-recorder-player is installed:
      // await audioRecorderPlayer.current.pausePlayer();

      setIsPlaying(false);
    } catch (error) {
      console.error('Pause failed:', error);
    }
  };

  const stopPlayback = async () => {
    try {
      // Uncomment when react-native-audio-recorder-player is installed:
      // await audioRecorderPlayer.current.stopPlayer();
      // audioRecorderPlayer.current.removePlayBackListener();

      setIsPlaying(false);
      setCurrentTime(0);
      progressAnim.setValue(0);
    } catch (error) {
      console.error('Stop failed:', error);
    }
  };

  const handlePlaybackComplete = () => {
    setIsPlaying(false);
    setCurrentTime(0);
    progressAnim.setValue(0);
    if (onPlaybackComplete) {
      onPlaybackComplete();
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (compact) {
    return (
      <View style={[styles.compactContainer, style]}>
        <TouchableOpacity
          onPress={togglePlayback}
          style={styles.compactPlayButton}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Icon name={isPlaying ? 'pause' : 'play'} size={20} color="#FFF" />
          )}
        </TouchableOpacity>

        <View style={styles.compactWaveform}>
          {waveformData.slice(0, 30).map((amplitude, index) => (
            <View
              key={index}
              style={[
                styles.compactWaveformBar,
                {
                  height: Math.max(3, amplitude / 3),
                  backgroundColor: isPlaying ? '#FF6B6B' : '#DDD',
                },
              ]}
            />
          ))}
        </View>

        <Text style={styles.compactTime}>
          {isPlaying ? formatTime(currentTime) : formatTime(duration)}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      {/* Play/Pause Button */}
      <TouchableOpacity onPress={togglePlayback} style={styles.playButton} disabled={isLoading}>
        {isLoading ? (
          <ActivityIndicator size="small" color="#FFF" />
        ) : (
          <Icon name={isPlaying ? 'pause' : 'play'} size={28} color="#FFF" />
        )}
      </TouchableOpacity>

      {/* Waveform or Progress Bar */}
      <View style={styles.centerContent}>
        {showWaveform && waveformData.length > 0 ? (
          <View style={styles.waveformContainer}>
            <View style={styles.waveform}>
              {waveformData.map((amplitude, index) => {
                const progress = progressAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, waveformData.length],
                });

                return (
                  <Animated.View
                    key={index}
                    style={[
                      styles.waveformBar,
                      {
                        height: Math.max(4, amplitude / 2),
                        backgroundColor:
                          isPlaying && index <= currentTime * (waveformData.length / duration)
                            ? '#FF6B6B'
                            : '#DDD',
                      },
                    ]}
                  />
                );
              })}
            </View>
          </View>
        ) : (
          <View style={styles.progressBarContainer}>
            <Animated.View
              style={[
                styles.progressBar,
                {
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
          </View>
        )}

        {/* Time Display */}
        <View style={styles.timeContainer}>
          <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
          <Text style={styles.durationText}>/ {formatTime(playbackDuration)}</Text>
        </View>
      </View>

      {/* Stop Button (when playing) */}
      {isPlaying && (
        <TouchableOpacity onPress={stopPlayback} style={styles.stopButton}>
          <Icon name="stop" size={20} color="#666" />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: 12,
    gap: 12,
  },
  playButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  centerContent: {
    flex: 1,
  },
  waveformContainer: {
    marginBottom: 8,
  },
  waveform: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    height: 40,
  },
  waveformBar: {
    flex: 1,
    borderRadius: 1,
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: '#DDD',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#FF6B6B',
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  timeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  durationText: {
    fontSize: 12,
    color: '#999',
    marginLeft: 4,
  },
  stopButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Compact styles
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 20,
    padding: 8,
    gap: 8,
  },
  compactPlayButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  compactWaveform: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
    height: 24,
  },
  compactWaveformBar: {
    flex: 1,
    borderRadius: 1,
  },
  compactTime: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
    minWidth: 40,
    textAlign: 'right',
  },
});

export default VoicePlayer;
