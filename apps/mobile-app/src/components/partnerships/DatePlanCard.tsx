import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
} from 'react-native';

interface PlanItem {
  type: 'restaurant' | 'event' | 'gift';
  name: string;
  description?: string;
  imageUrl?: string;
  time?: string;
  price: number;
  currency: string;
}

interface DatePlan {
  id: string;
  title: string;
  description: string;
  vibe: 'romantic' | 'adventure' | 'casual' | 'fancy' | 'creative';
  duration: string;
  totalBudget: {
    min: number;
    max: number;
    currency: string;
  };
  items: PlanItem[];
  matchPercentage?: number;
}

interface DatePlanCardProps {
  plan: DatePlan;
  onPress: (plan: DatePlan) => void;
  onBookAll?: (plan: DatePlan) => void;
  onSave?: (plan: DatePlan) => void;
  compact?: boolean;
}

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 32;
const COMPACT_WIDTH = 280;

export const DatePlanCard: React.FC<DatePlanCardProps> = ({
  plan,
  onPress,
  onBookAll,
  onSave,
  compact = false,
}) => {
  const getVibeConfig = (vibe: DatePlan['vibe']) => {
    switch (vibe) {
      case 'romantic':
        return { color: '#FF1493', icon: 'H', label: 'Romantic' };
      case 'adventure':
        return { color: '#FF6B35', icon: 'A', label: 'Adventure' };
      case 'casual':
        return { color: '#4CAF50', icon: 'C', label: 'Casual' };
      case 'fancy':
        return { color: '#9C27B0', icon: 'F', label: 'Fancy' };
      case 'creative':
        return { color: '#2196F3', icon: 'CR', label: 'Creative' };
      default:
        return { color: '#666666', icon: '?', label: 'Unknown' };
    }
  };

  const getItemTypeIcon = (type: PlanItem['type']): string => {
    switch (type) {
      case 'restaurant':
        return 'R';
      case 'event':
        return 'E';
      case 'gift':
        return 'G';
      default:
        return 'I';
    }
  };

  const getItemTypeLabel = (type: PlanItem['type']): string => {
    switch (type) {
      case 'restaurant':
        return 'Dining';
      case 'event':
        return 'Experience';
      case 'gift':
        return 'Surprise';
      default:
        return 'Item';
    }
  };

  const formatBudget = (min: number, max: number, currency: string): string => {
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
    });
    if (min === max) {
      return formatter.format(min / 100);
    }
    return `${formatter.format(min / 100)} - ${formatter.format(max / 100)}`;
  };

  const formatPrice = (price: number, currency: string): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
    }).format(price / 100);
  };

  const vibeConfig = getVibeConfig(plan.vibe);

  if (compact) {
    return (
      <TouchableOpacity
        style={styles.compactContainer}
        onPress={() => onPress(plan)}
        activeOpacity={0.9}
      >
        <View style={styles.compactImageContainer}>
          {plan.items[0]?.imageUrl ? (
            <Image
              source={{ uri: plan.items[0].imageUrl }}
              style={styles.compactImage}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.compactImagePlaceholder, { backgroundColor: vibeConfig.color + '30' }]}>
              <Text style={[styles.compactImagePlaceholderText, { color: vibeConfig.color }]}>
                {vibeConfig.icon}
              </Text>
            </View>
          )}
          <View style={[styles.compactVibeBadge, { backgroundColor: vibeConfig.color }]}>
            <Text style={styles.compactVibeText}>{vibeConfig.label}</Text>
          </View>
        </View>

        <View style={styles.compactContent}>
          <Text style={styles.compactTitle} numberOfLines={2}>
            {plan.title}
          </Text>

          <View style={styles.compactMeta}>
            <Text style={styles.compactDuration}>{plan.duration}</Text>
            <Text style={styles.compactBudget}>
              {formatBudget(plan.totalBudget.min, plan.totalBudget.max, plan.totalBudget.currency)}
            </Text>
          </View>

          {plan.matchPercentage && (
            <View style={styles.compactMatchContainer}>
              <View style={styles.matchBar}>
                <View style={[styles.matchFill, { width: `${plan.matchPercentage}%` }]} />
              </View>
              <Text style={styles.compactMatchText}>{plan.matchPercentage}% match</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onPress(plan)}
      activeOpacity={0.95}
    >
      <View style={styles.header}>
        <View style={[styles.vibeBadge, { backgroundColor: vibeConfig.color }]}>
          <Text style={styles.vibeIcon}>{vibeConfig.icon}</Text>
          <Text style={styles.vibeText}>{vibeConfig.label}</Text>
        </View>

        {plan.matchPercentage && (
          <View style={styles.matchBadge}>
            <Text style={styles.matchPercentage}>{plan.matchPercentage}%</Text>
            <Text style={styles.matchLabel}>Match</Text>
          </View>
        )}
      </View>

      <Text style={styles.title}>{plan.title}</Text>
      <Text style={styles.description}>{plan.description}</Text>

      <View style={styles.metaContainer}>
        <View style={styles.metaItem}>
          <Text style={styles.metaIcon}>T</Text>
          <Text style={styles.metaText}>{plan.duration}</Text>
        </View>
        <View style={styles.metaItem}>
          <Text style={styles.metaIcon}>$</Text>
          <Text style={styles.metaText}>
            {formatBudget(plan.totalBudget.min, plan.totalBudget.max, plan.totalBudget.currency)}
          </Text>
        </View>
        <View style={styles.metaItem}>
          <Text style={styles.metaIcon}>#</Text>
          <Text style={styles.metaText}>{plan.items.length} activities</Text>
        </View>
      </View>

      <View style={styles.timeline}>
        {plan.items.map((item, index) => (
          <View key={index} style={styles.timelineItem}>
            <View style={styles.timelineConnector}>
              <View style={[styles.timelineDot, { backgroundColor: vibeConfig.color }]}>
                <Text style={styles.timelineDotText}>{index + 1}</Text>
              </View>
              {index < plan.items.length - 1 && <View style={styles.timelineLine} />}
            </View>

            <View style={styles.timelineContent}>
              <View style={styles.itemCard}>
                {item.imageUrl && (
                  <Image
                    source={{ uri: item.imageUrl }}
                    style={styles.itemImage}
                    resizeMode="cover"
                  />
                )}
                <View style={styles.itemInfo}>
                  <View style={styles.itemTypeRow}>
                    <Text style={[styles.itemTypeBadge, { color: vibeConfig.color }]}>
                      {getItemTypeLabel(item.type)}
                    </Text>
                    {item.time && <Text style={styles.itemTime}>{item.time}</Text>}
                  </View>
                  <Text style={styles.itemName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  {item.description && (
                    <Text style={styles.itemDescription} numberOfLines={2}>
                      {item.description}
                    </Text>
                  )}
                  <Text style={styles.itemPrice}>
                    {formatPrice(item.price, item.currency)}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.actions}>
        {onSave && (
          <TouchableOpacity style={styles.saveButton} onPress={() => onSave(plan)}>
            <Text style={styles.saveButtonText}>Save</Text>
          </TouchableOpacity>
        )}
        {onBookAll && (
          <TouchableOpacity
            style={[styles.bookButton, { backgroundColor: vibeConfig.color }]}
            onPress={() => onBookAll(plan)}
          >
            <Text style={styles.bookButtonText}>Book Entire Date</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: CARD_WIDTH,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  vibeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  vibeIcon: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    marginRight: 6,
  },
  vibeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  matchBadge: {
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  matchPercentage: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  matchLabel: {
    fontSize: 10,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 22,
    marginBottom: 16,
  },
  metaContainer: {
    flexDirection: 'row',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  metaItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaIcon: {
    fontSize: 12,
    color: '#999999',
    marginRight: 6,
  },
  metaText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#333333',
  },
  timeline: {
    marginBottom: 20,
  },
  timelineItem: {
    flexDirection: 'row',
  },
  timelineConnector: {
    alignItems: 'center',
    width: 32,
  },
  timelineDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timelineDotText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#EEEEEE',
    marginVertical: 4,
  },
  timelineContent: {
    flex: 1,
    marginLeft: 12,
    marginBottom: 16,
  },
  itemCard: {
    flexDirection: 'row',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    overflow: 'hidden',
  },
  itemImage: {
    width: 80,
    height: 80,
  },
  itemInfo: {
    flex: 1,
    padding: 12,
  },
  itemTypeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  itemTypeBadge: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  itemTime: {
    fontSize: 11,
    color: '#999999',
  },
  itemName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  itemDescription: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333333',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  saveButton: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666666',
  },
  bookButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  bookButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Compact styles
  compactContainer: {
    width: COMPACT_WIDTH,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  compactImageContainer: {
    position: 'relative',
    height: 140,
  },
  compactImage: {
    width: '100%',
    height: '100%',
  },
  compactImagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  compactImagePlaceholderText: {
    fontSize: 32,
    fontWeight: '700',
  },
  compactVibeBadge: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  compactVibeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  compactContent: {
    padding: 14,
  },
  compactTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  compactMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  compactDuration: {
    fontSize: 13,
    color: '#666666',
  },
  compactBudget: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333333',
  },
  compactMatchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  matchBar: {
    flex: 1,
    height: 4,
    backgroundColor: '#EEEEEE',
    borderRadius: 2,
    marginRight: 8,
    overflow: 'hidden',
  },
  matchFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 2,
  },
  compactMatchText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4CAF50',
  },
});

export default DatePlanCard;
