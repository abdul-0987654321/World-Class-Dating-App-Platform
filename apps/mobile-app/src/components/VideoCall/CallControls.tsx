/**
 * Call Controls Component
 * In-call control buttons for video/audio calls
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';

interface CallControlsProps {
  isMuted: boolean;
  isVideoEnabled: boolean;
  isSpeakerOn: boolean;
  isAudioOnly?: boolean;
  showSwitchCamera?: boolean;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onToggleSpeaker: () => void;
  onSwitchCamera?: () => void;
  onEndCall: () => void;
  style?: any;
}

const CallControls: React.FC<CallControlsProps> = ({
  isMuted,
  isVideoEnabled,
  isSpeakerOn,
  isAudioOnly = false,
  showSwitchCamera = true,
  onToggleMute,
  onToggleVideo,
  onToggleSpeaker,
  onSwitchCamera,
  onEndCall,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.controlsRow}>
        {/* Mute/Unmute */}
        <TouchableOpacity
          style={[styles.controlButton, isMuted && styles.controlButtonActive]}
          onPress={onToggleMute}
          activeOpacity={0.7}
        >
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>{isMuted ? '🔇' : '🎤'}</Text>
          </View>
          <Text style={styles.label}>{isMuted ? 'Unmute' : 'Mute'}</Text>
        </TouchableOpacity>

        {/* Video Toggle (only for video calls) */}
        {!isAudioOnly && (
          <TouchableOpacity
            style={[
              styles.controlButton,
              !isVideoEnabled && styles.controlButtonActive,
            ]}
            onPress={onToggleVideo}
            activeOpacity={0.7}
          >
            <View style={styles.iconContainer}>
              <Text style={styles.icon}>{isVideoEnabled ? '📹' : '📷'}</Text>
            </View>
            <Text style={styles.label}>
              {isVideoEnabled ? 'Stop' : 'Start'}
            </Text>
          </TouchableOpacity>
        )}

        {/* End Call */}
        <TouchableOpacity
          style={[styles.controlButton, styles.endCallButton]}
          onPress={onEndCall}
          activeOpacity={0.7}
        >
          <View style={[styles.iconContainer, styles.endCallIcon]}>
            <Text style={styles.icon}>📞</Text>
          </View>
          <Text style={styles.label}>End</Text>
        </TouchableOpacity>

        {/* Speaker Toggle */}
        <TouchableOpacity
          style={[
            styles.controlButton,
            isSpeakerOn && styles.controlButtonActive,
          ]}
          onPress={onToggleSpeaker}
          activeOpacity={0.7}
        >
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>{isSpeakerOn ? '🔊' : '🔈'}</Text>
          </View>
          <Text style={styles.label}>Speaker</Text>
        </TouchableOpacity>

        {/* Switch Camera (only for video calls) */}
        {!isAudioOnly && showSwitchCamera && onSwitchCamera && (
          <TouchableOpacity
            style={styles.controlButton}
            onPress={onSwitchCamera}
            activeOpacity={0.7}
          >
            <View style={styles.iconContainer}>
              <Text style={styles.icon}>🔄</Text>
            </View>
            <Text style={styles.label}>Flip</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 16,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  controlButton: {
    alignItems: 'center',
    padding: 8,
    borderRadius: 12,
    minWidth: 60,
  },
  controlButtonActive: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  endCallButton: {
    // Special styling for end call button
  },
  endCallIcon: {
    backgroundColor: '#FF4444',
  },
  icon: {
    fontSize: 26,
  },
  label: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '500',
    textAlign: 'center',
  },
});

export default CallControls;
