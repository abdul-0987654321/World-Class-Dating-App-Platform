import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

interface NetworkErrorProps {
  onRetry?: () => void;
  message?: string;
  showRetry?: boolean;
}

const NetworkError: React.FC<NetworkErrorProps> = ({
  onRetry,
  message = 'Unable to connect to the network',
  showRetry = true,
}) => {
  return (
    <View style={styles.container}>
      <Icon name="cloud-offline" size={64} color="#8E8E93" />
      <Text style={styles.title}>No Connection</Text>
      <Text style={styles.message}>{message}</Text>
      {showRetry && onRetry && (
        <TouchableOpacity
          style={styles.retryButton}
          onPress={onRetry}
          accessibilityRole="button"
          accessibilityLabel="Retry connection"
        >
          <Icon name="refresh" size={18} color="#FFFFFF" style={styles.retryIcon} />
          <Text style={styles.retryText}>Try Again</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F2F2F7',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    marginTop: 16,
  },
  message: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 20,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 24,
  },
  retryIcon: {
    marginRight: 8,
  },
  retryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default NetworkError;
