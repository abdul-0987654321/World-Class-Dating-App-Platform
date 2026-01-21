import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Button } from '../common/Button';

// Note: In production, would use react-native-video and react-native-camera
// For now, showing the interface structure

export interface VideoProfile {
  id?: string;
  url?: string;
  thumbnailUrl?: string;
  duration: number; // in seconds
}

interface VideoProfileProps {
  video?: VideoProfile;
  onRecord: () => void;
  onUpload: (videoUri: string) => Promise<{ url: string; thumbnailUrl: string }>;
  onDelete?: () => void;
}

type RecordingState = 'idle' | 'recording' | 'recorded' | 'uploading';

export const VideoProfile: React.FC<VideoProfileProps> = ({
  video,
  onRecord,
  onUpload,
  onDelete,
}) => {
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordedVideoUri, setRecordedVideoUri] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showRecordModal, setShowRecordModal] = useState(false);

  const recordingTimer = useRef<NodeJS.Timeout | null>(null);

  const MAX_DURATION = 30; // 30 seconds

  const handleStartRecording = () => {
    setShowRecordModal(true);
    startRecording();
  };

  const startRecording = () => {
    // In production, would use react-native-camera to start recording
    setRecordingState('recording');
    setRecordingTime(0);

    recordingTimer.current = setInterval(() => {
      setRecordingTime((prev) => {
        const newTime = prev + 1;
        if (newTime >= MAX_DURATION) {
          stopRecording();
          return MAX_DURATION;
        }
        return newTime;
      });
    }, 1000);
  };

  const stopRecording = () => {
    if (recordingTimer.current) {
      clearInterval(recordingTimer.current);
      recordingTimer.current = null;
    }

    // In production, would get the recorded video URI
    const mockVideoUri = 'file:///path/to/recorded/video.mp4';
    setRecordedVideoUri(mockVideoUri);
    setRecordingState('recorded');
  };

  const handleRerecord = () => {
    setRecordedVideoUri(null);
    setRecordingTime(0);
    startRecording();
  };

  const handleUseVideo = async () => {
    if (!recordedVideoUri) return;

    setRecordingState('uploading');
    try {
      const { url, thumbnailUrl } = await onUpload(recordedVideoUri);
      Alert.alert('Success', 'Your video profile has been uploaded!');
      setShowRecordModal(false);
      setRecordingState('idle');
      setRecordedVideoUri(null);
    } catch (error: any) {
      Alert.alert('Upload Failed', error.message || 'Failed to upload video');
      setRecordingState('recorded');
      console.error('Video upload error:', error);
    }
  };

  const handleCancelRecording = () => {
    if (recordingTimer.current) {
      clearInterval(recordingTimer.current);
      recordingTimer.current = null;
    }
    setShowRecordModal(false);
    setRecordingState('idle');
    setRecordedVideoUri(null);
    setRecordingTime(0);
  };

  const handleDeleteVideo = () => {
    Alert.alert('Delete Video Profile', 'Are you sure you want to delete your video profile?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          if (onDelete) {
            onDelete();
          }
        },
      },
    ]);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderExistingVideo = () => {
    if (!video || !video.url) return null;

    return (
      <View style={styles.existingVideoContainer}>
        <View style={styles.videoPreview}>
          {/* In production, would use Video component from react-native-video */}
          {video.thumbnailUrl && (
            <View style={styles.videoThumbnail}>
              <Text style={styles.playIcon}>▶</Text>
              <Text style={styles.videoDuration}>{formatTime(video.duration)}</Text>
            </View>
          )}
        </View>

        <View style={styles.videoActions}>
          <Button
            title="Re-record Video"
            onPress={handleStartRecording}
            variant="outline"
            style={styles.actionButton}
          />
          <Button
            title="Delete Video"
            onPress={handleDeleteVideo}
            variant="danger"
            style={styles.actionButton}
          />
        </View>
      </View>
    );
  };

  const renderNoVideo = () => {
    return (
      <View style={styles.noVideoContainer}>
        <View style={styles.noVideoIcon}>
          <Text style={styles.noVideoIconText}>🎥</Text>
        </View>
        <Text style={styles.noVideoTitle}>Add a Video Profile</Text>
        <Text style={styles.noVideoDescription}>
          Stand out with a 15-30 second video. Show your personality and get more matches!
        </Text>

        <View style={styles.benefits}>
          <View style={styles.benefit}>
            <Text style={styles.benefitIcon}>✓</Text>
            <Text style={styles.benefitText}>Get up to 3x more matches</Text>
          </View>
          <View style={styles.benefit}>
            <Text style={styles.benefitIcon}>✓</Text>
            <Text style={styles.benefitText}>Show your personality</Text>
          </View>
          <View style={styles.benefit}>
            <Text style={styles.benefitIcon}>✓</Text>
            <Text style={styles.benefitText}>Build trust faster</Text>
          </View>
        </View>

        <Button
          title="Record Video"
          onPress={handleStartRecording}
          fullWidth
          style={styles.recordButton}
        />
      </View>
    );
  };

  const renderRecordingModal = () => {
    return (
      <Modal
        visible={showRecordModal}
        animationType="slide"
        transparent={false}
        onRequestClose={handleCancelRecording}
      >
        <View style={styles.recordingContainer}>
          {/* Camera view would go here - react-native-camera */}
          <View style={styles.cameraView}>
            <Text style={styles.cameraPlaceholder}>Camera View (react-native-camera)</Text>
          </View>

          {/* Recording controls overlay */}
          <View style={styles.recordingOverlay}>
            {recordingState === 'recording' && (
              <View style={styles.recordingIndicator}>
                <View style={styles.recordingDot} />
                <Text style={styles.recordingTime}>
                  {formatTime(recordingTime)} / {formatTime(MAX_DURATION)}
                </Text>
              </View>
            )}

            <View style={styles.recordingControls}>
              {recordingState === 'recording' ? (
                <TouchableOpacity style={styles.stopButton} onPress={stopRecording}>
                  <View style={styles.stopButtonInner} />
                </TouchableOpacity>
              ) : recordingState === 'recorded' ? (
                <View style={styles.recordedControls}>
                  <Button
                    title="Re-record"
                    onPress={handleRerecord}
                    variant="outline"
                    style={styles.recordedButton}
                  />
                  <Button
                    title="Use This Video"
                    onPress={handleUseVideo}
                    loading={recordingState === 'uploading'}
                    disabled={recordingState === 'uploading'}
                    style={styles.recordedButton}
                  />
                </View>
              ) : null}
            </View>

            {recordingState === 'uploading' && (
              <View style={styles.uploadingOverlay}>
                <ActivityIndicator size="large" color="#FFF" />
                <Text style={styles.uploadingText}>Uploading...</Text>
              </View>
            )}
          </View>

          {/* Close button */}
          <TouchableOpacity
            style={styles.closeRecordingButton}
            onPress={handleCancelRecording}
            disabled={recordingState === 'uploading'}
          >
            <Text style={styles.closeRecordingText}>✕</Text>
          </TouchableOpacity>

          {/* Tips */}
          {recordingState === 'idle' && (
            <View style={styles.tipsContainer}>
              <Text style={styles.tipsTitle}>Recording Tips:</Text>
              <Text style={styles.tipText}>• Find good lighting</Text>
              <Text style={styles.tipText}>• Keep it natural and authentic</Text>
              <Text style={styles.tipText}>• Smile and be yourself</Text>
              <Text style={styles.tipText}>• Keep it between 15-30 seconds</Text>
            </View>
          )}
        </View>
      </Modal>
    );
  };

  return (
    <View style={styles.container}>
      {video && video.url ? renderExistingVideo() : renderNoVideo()}
      {renderRecordingModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  // Existing video styles
  existingVideoContainer: {
    padding: 20,
  },
  videoPreview: {
    width: '100%',
    aspectRatio: 9 / 16,
    borderRadius: 16,
    backgroundColor: '#000',
    marginBottom: 20,
    overflow: 'hidden',
  },
  videoThumbnail: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIcon: {
    fontSize: 64,
    color: '#FFF',
  },
  videoDuration: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  videoActions: {
    gap: 12,
  },
  actionButton: {
    marginBottom: 12,
  },
  // No video styles
  noVideoContainer: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noVideoIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  noVideoIconText: {
    fontSize: 48,
  },
  noVideoTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  noVideoDescription: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  benefits: {
    width: '100%',
    marginBottom: 32,
  },
  benefit: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  benefitIcon: {
    fontSize: 20,
    color: '#4CAF50',
    marginRight: 12,
    fontWeight: 'bold',
  },
  benefitText: {
    fontSize: 15,
    color: '#333',
  },
  recordButton: {
    marginTop: 16,
  },
  // Recording modal styles
  recordingContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  cameraView: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraPlaceholder: {
    color: '#FFF',
    fontSize: 16,
  },
  recordingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#F44336',
    marginRight: 8,
  },
  recordingTime: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  recordingControls: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  stopButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopButtonInner: {
    width: 32,
    height: 32,
    backgroundColor: '#F44336',
    borderRadius: 4,
  },
  recordedControls: {
    flexDirection: 'row',
    gap: 16,
    paddingHorizontal: 20,
  },
  recordedButton: {
    flex: 1,
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadingText: {
    color: '#FFF',
    fontSize: 16,
    marginTop: 16,
  },
  closeRecordingButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeRecordingText: {
    color: '#FFF',
    fontSize: 24,
  },
  tipsContainer: {
    position: 'absolute',
    bottom: 140,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
    padding: 16,
  },
  tipsTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  tipText: {
    color: '#FFF',
    fontSize: 14,
    lineHeight: 22,
  },
});
