import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Alert,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import { Button } from '../common/Button';
// import { RNCamera } from 'react-native-camera'; // Uncomment when package is installed
// import Video from 'react-native-video'; // Uncomment when package is installed

interface VideoRecorderProps {
  visible: boolean;
  maxDuration?: number; // in seconds
  onRecordComplete: (videoUri: string) => void;
  onCancel: () => void;
}

type RecordingState = 'idle' | 'recording' | 'recorded' | 'uploading';

export const VideoRecorder: React.FC<VideoRecorderProps> = ({
  visible,
  maxDuration = 30,
  onRecordComplete,
  onCancel,
}) => {
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordedVideoUri, setRecordedVideoUri] = useState<string | null>(null);
  const [cameraType, setCameraType] = useState<'front' | 'back'>('front');
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  const recordingTimer = useRef<NodeJS.Timeout | null>(null);
  const cameraRef = useRef<any>(null);

  useEffect(() => {
    if (visible) {
      checkPermissions();
    }
    return () => {
      if (recordingTimer.current) {
        clearInterval(recordingTimer.current);
      }
    };
  }, [visible]);

  const checkPermissions = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.CAMERA,
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        ]);

        const cameraGranted = granted[PermissionsAndroid.PERMISSIONS.CAMERA] === 'granted';
        const audioGranted = granted[PermissionsAndroid.PERMISSIONS.RECORD_AUDIO] === 'granted';

        setHasPermission(cameraGranted && audioGranted);
      } catch (err) {
        console.error('Permission error:', err);
        setHasPermission(false);
      }
    } else {
      // iOS permissions are handled by react-native-camera
      setHasPermission(true);
    }
  };

  const startRecording = async () => {
    if (!cameraRef.current) return;

    try {
      setRecordingState('recording');
      setRecordingTime(0);

      // Start timer
      recordingTimer.current = setInterval(() => {
        setRecordingTime((prev) => {
          const newTime = prev + 1;
          if (newTime >= maxDuration) {
            stopRecording();
            return maxDuration;
          }
          return newTime;
        });
      }, 1000);

      // Start camera recording
      // Uncomment when react-native-camera is installed:
      // const options = { quality: RNCamera.Constants.VideoQuality['720p'], maxDuration };
      // const data = await cameraRef.current.recordAsync(options);
      // Mock data for now:
      const data = { uri: 'file:///mock/video.mp4' };

      setRecordedVideoUri(data.uri);
      setRecordingState('recorded');
    } catch (error) {
      console.error('Recording failed:', error);
      Alert.alert('Error', 'Failed to start recording');
      setRecordingState('idle');
    }
  };

  const stopRecording = async () => {
    if (recordingTimer.current) {
      clearInterval(recordingTimer.current);
      recordingTimer.current = null;
    }

    if (cameraRef.current && recordingState === 'recording') {
      // Uncomment when react-native-camera is installed:
      // cameraRef.current.stopRecording();
    }
  };

  const handleRerecord = () => {
    setRecordedVideoUri(null);
    setRecordingTime(0);
    setRecordingState('idle');
  };

  const handleUseVideo = () => {
    if (recordedVideoUri) {
      onRecordComplete(recordedVideoUri);
      handleClose();
    }
  };

  const handleClose = () => {
    if (recordingTimer.current) {
      clearInterval(recordingTimer.current);
      recordingTimer.current = null;
    }
    setRecordingState('idle');
    setRecordedVideoUri(null);
    setRecordingTime(0);
    onCancel();
  };

  const toggleCamera = () => {
    setCameraType(prev => prev === 'front' ? 'back' : 'front');
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderCamera = () => {
    if (hasPermission === false) {
      return (
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionText}>Camera permission is required</Text>
          <Button title="Grant Permission" onPress={checkPermissions} style={styles.permissionButton} />
        </View>
      );
    }

    if (hasPermission === null) {
      return <ActivityIndicator size="large" color="#FFF" />;
    }

    // Uncomment when react-native-camera is installed:
    /*
    return (
      <RNCamera
        ref={cameraRef}
        style={styles.camera}
        type={cameraType === 'front' ? RNCamera.Constants.Type.front : RNCamera.Constants.Type.back}
        flashMode={RNCamera.Constants.FlashMode.off}
        androidCameraPermissionOptions={{
          title: 'Permission to use camera',
          message: 'We need your permission to use your camera',
          buttonPositive: 'Ok',
          buttonNegative: 'Cancel',
        }}
        androidRecordAudioPermissionOptions={{
          title: 'Permission to use audio recording',
          message: 'We need your permission to use your audio',
          buttonPositive: 'Ok',
          buttonNegative: 'Cancel',
        }}
      />
    );
    */

    // Mock camera view
    return (
      <View style={styles.cameraPlaceholder}>
        <Text style={styles.cameraPlaceholderText}>Camera View</Text>
        <Text style={styles.cameraPlaceholderSubtext}>
          Install react-native-camera for actual recording
        </Text>
      </View>
    );
  };

  const renderPreview = () => {
    if (!recordedVideoUri) return null;

    // Uncomment when react-native-video is installed:
    /*
    return (
      <Video
        source={{ uri: recordedVideoUri }}
        style={styles.videoPreview}
        controls
        resizeMode="contain"
        paused={false}
        repeat
      />
    );
    */

    // Mock preview
    return (
      <View style={styles.videoPreview}>
        <Text style={styles.previewText}>Video Preview</Text>
        <Text style={styles.previewSubtext}>{recordedVideoUri}</Text>
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={handleClose}>
      <View style={styles.container}>
        {recordingState === 'recorded' ? renderPreview() : renderCamera()}

        {/* Recording indicator */}
        {recordingState === 'recording' && (
          <View style={styles.recordingIndicator}>
            <View style={styles.recordingDot} />
            <Text style={styles.recordingTime}>
              {formatTime(recordingTime)} / {formatTime(maxDuration)}
            </Text>
          </View>
        )}

        {/* Controls */}
        <View style={styles.controls}>
          {recordingState === 'idle' && (
            <>
              <TouchableOpacity style={styles.flipButton} onPress={toggleCamera}>
                <Text style={styles.flipButtonText}>Flip</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.recordButton} onPress={startRecording}>
                <View style={styles.recordButtonInner} />
              </TouchableOpacity>
              <View style={styles.placeholder} />
            </>
          )}

          {recordingState === 'recording' && (
            <TouchableOpacity style={styles.stopButton} onPress={stopRecording}>
              <View style={styles.stopButtonInner} />
            </TouchableOpacity>
          )}

          {recordingState === 'recorded' && (
            <View style={styles.recordedControls}>
              <Button
                title="Re-record"
                onPress={handleRerecord}
                variant="outline"
                style={styles.controlButton}
              />
              <Button
                title="Use Video"
                onPress={handleUseVideo}
                style={styles.controlButton}
              />
            </View>
          )}
        </View>

        {/* Close button */}
        <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>

        {/* Tips */}
        {recordingState === 'idle' && (
          <View style={styles.tips}>
            <Text style={styles.tipsTitle}>Recording Tips:</Text>
            <Text style={styles.tipText}>• Find good lighting</Text>
            <Text style={styles.tipText}>• Keep it natural and authentic</Text>
            <Text style={styles.tipText}>• Look at the camera and smile</Text>
            <Text style={styles.tipText}>• Keep it between 15-{maxDuration} seconds</Text>
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  cameraPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#333',
  },
  cameraPlaceholderText: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  cameraPlaceholderSubtext: {
    color: '#AAA',
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  videoPreview: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  previewSubtext: {
    color: '#AAA',
    fontSize: 12,
    marginTop: 8,
  },
  recordingIndicator: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
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
  controls: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
  },
  flipButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  flipButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordButtonInner: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#F44336',
  },
  stopButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stopButtonInner: {
    width: 32,
    height: 32,
    backgroundColor: '#F44336',
    borderRadius: 4,
  },
  placeholder: {
    width: 60,
  },
  recordedControls: {
    flexDirection: 'row',
    gap: 16,
    width: '100%',
  },
  controlButton: {
    flex: 1,
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#FFF',
    fontSize: 24,
  },
  tips: {
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
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  permissionText: {
    color: '#FFF',
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  permissionButton: {
    minWidth: 200,
  },
});
