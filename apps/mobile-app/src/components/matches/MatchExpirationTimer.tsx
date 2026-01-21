import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface MatchExpirationTimerProps {
  expiresAt: Date | string;
  expired?: boolean;
  firstMessageSent?: boolean;
  onExpire?: () => void;
}

export const MatchExpirationTimer: React.FC<MatchExpirationTimerProps> = ({
  expiresAt,
  expired = false,
  firstMessageSent = false,
  onExpire,
}) => {
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [isUrgent, setIsUrgent] = useState<boolean>(false);

  useEffect(() => {
    // Don't show timer if message was sent or already expired
    if (firstMessageSent || expired) {
      return;
    }

    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const expiryTime = new Date(expiresAt).getTime();
      const difference = expiryTime - now;

      if (difference <= 0) {
        setTimeLeft('Expired');
        if (onExpire) {
          onExpire();
        }
        return;
      }

      const hours = Math.floor(difference / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));

      // Mark as urgent if less than 6 hours
      setIsUrgent(hours < 6);

      if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m`);
      } else {
        setTimeLeft(`${minutes}m`);
      }
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [expiresAt, expired, firstMessageSent, onExpire]);

  // Don't render if message was sent
  if (firstMessageSent) {
    return null;
  }

  // Show expired badge
  if (expired) {
    return (
      <View style={[styles.container, styles.expiredContainer]}>
        <Text style={styles.expiredIcon}>⏰</Text>
        <Text style={styles.expiredText}>Expired</Text>
      </View>
    );
  }

  // Don't render if no time left to show
  if (!timeLeft) {
    return null;
  }

  return (
    <View style={[styles.container, isUrgent && styles.urgentContainer]}>
      <Text style={styles.icon}>⏱️</Text>
      <Text style={[styles.text, isUrgent && styles.urgentText]}>{timeLeft}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 4,
  },
  urgentContainer: {
    backgroundColor: '#FFEBEE',
  },
  expiredContainer: {
    backgroundColor: '#F5F5F5',
  },
  icon: {
    fontSize: 14,
  },
  text: {
    fontSize: 13,
    fontWeight: '600',
    color: '#F57C00',
  },
  urgentText: {
    color: '#D32F2F',
  },
  expiredIcon: {
    fontSize: 14,
  },
  expiredText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#757575',
  },
});
