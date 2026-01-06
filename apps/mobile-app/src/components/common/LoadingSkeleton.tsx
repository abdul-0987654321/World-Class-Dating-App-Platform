import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, ViewStyle } from 'react-native';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 20,
  borderRadius = 4,
  style,
}) => {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [animatedValue]);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width: width as any,
          height,
          borderRadius,
          opacity,
        } as any,
        style,
      ]}
    />
  );
};

export const ProfileCardSkeleton: React.FC = () => {
  return (
    <View style={styles.profileCard}>
      <Skeleton height={400} borderRadius={12} />
      <View style={styles.profileInfo}>
        <Skeleton width="60%" height={24} style={styles.nameSkeleton} />
        <Skeleton width="40%" height={16} style={styles.detailsSkeleton} />
      </View>
    </View>
  );
};

export const MessageListSkeleton: React.FC = () => {
  return (
    <View style={styles.messageList}>
      {[1, 2, 3, 4, 5].map((item) => (
        <View key={item} style={styles.messageItem}>
          <Skeleton width={48} height={48} borderRadius={24} />
          <View style={styles.messageContent}>
            <Skeleton width="40%" height={16} style={styles.messageNameSkeleton} />
            <Skeleton width="80%" height={14} style={styles.messageTextSkeleton} />
          </View>
        </View>
      ))}
    </View>
  );
};

export const MatchGridSkeleton: React.FC = () => {
  return (
    <View style={styles.matchGrid}>
      {[1, 2, 3, 4, 5, 6].map((item) => (
        <View key={item} style={styles.matchItem}>
          <Skeleton width={100} height={100} borderRadius={12} />
          <Skeleton width="80%" height={14} style={styles.matchNameSkeleton} />
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: '#E1E9EE',
  },
  profileCard: {
    padding: 16,
  },
  profileInfo: {
    marginTop: 12,
  },
  nameSkeleton: {
    marginBottom: 8,
  },
  detailsSkeleton: {
    marginBottom: 4,
  },
  messageList: {
    padding: 16,
  },
  messageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  messageContent: {
    flex: 1,
    marginLeft: 12,
  },
  messageNameSkeleton: {
    marginBottom: 8,
  },
  messageTextSkeleton: {
    marginBottom: 4,
  },
  matchGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    justifyContent: 'space-between',
  },
  matchItem: {
    width: '48%',
    marginBottom: 16,
  },
  matchNameSkeleton: {
    marginTop: 8,
  },
});

export default Skeleton;
