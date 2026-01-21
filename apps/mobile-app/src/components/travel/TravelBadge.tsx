import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface TravelBadgeProps {
  city: string;
  country?: string;
  daysUntilArrival?: number;
  daysRemaining?: number;
  isActive: boolean;
  size?: 'small' | 'medium' | 'large';
}

export const TravelBadge: React.FC<TravelBadgeProps> = ({
  city,
  country,
  daysUntilArrival,
  daysRemaining,
  isActive,
  size = 'medium',
}) => {
  const getDisplayText = () => {
    if (isActive) {
      if (daysRemaining !== undefined && daysRemaining > 0) {
        return `In ${city} for ${daysRemaining} more ${daysRemaining === 1 ? 'day' : 'days'}`;
      }
      return `Currently in ${city}`;
    } else if (daysUntilArrival !== undefined && daysUntilArrival > 0) {
      return `Traveling to ${city} in ${daysUntilArrival} ${
        daysUntilArrival === 1 ? 'day' : 'days'
      }`;
    }
    return `Traveling to ${city}`;
  };

  const getIconName = () => {
    if (isActive) {
      return 'map-marker';
    }
    return 'airplane';
  };

  const getBadgeStyle = () => {
    switch (size) {
      case 'small':
        return styles.badgeSmall;
      case 'large':
        return styles.badgeLarge;
      default:
        return styles.badgeMedium;
    }
  };

  const getTextStyle = () => {
    switch (size) {
      case 'small':
        return styles.textSmall;
      case 'large':
        return styles.textLarge;
      default:
        return styles.textMedium;
    }
  };

  return (
    <View style={[styles.container, getBadgeStyle()]}>
      <View style={styles.iconContainer}>
        <Icon
          name={getIconName()}
          size={size === 'small' ? 14 : size === 'large' ? 20 : 16}
          color="#FF6B6B"
        />
      </View>
      <Text style={[styles.text, getTextStyle()]} numberOfLines={1}>
        {getDisplayText()}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5F5',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
  },
  badgeSmall: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  badgeMedium: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  badgeLarge: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  iconContainer: {
    marginRight: 6,
  },
  text: {
    color: '#FF6B6B',
    fontWeight: '600',
  },
  textSmall: {
    fontSize: 11,
  },
  textMedium: {
    fontSize: 13,
  },
  textLarge: {
    fontSize: 15,
  },
});
