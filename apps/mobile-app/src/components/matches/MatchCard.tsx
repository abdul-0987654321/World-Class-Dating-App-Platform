import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { MatchExpirationTimer } from './MatchExpirationTimer';

interface Match {
  id: string;
  name: string;
  age: number;
  photo: string;
  bio?: string;
  interests?: string[];
  compatibility?: number;
  verified?: boolean;
  lastActive?: string;
  expiresAt?: Date | string;
  expired?: boolean;
  firstMessageSent?: boolean;
  extended?: boolean;
}

interface MatchCardProps {
  match: Match;
  onPress: () => void;
  isPremium?: boolean;
  onExtend?: () => void;
}

export const MatchCard: React.FC<MatchCardProps> = ({
  match,
  onPress,
  isPremium = false,
  onExtend,
}) => {
  const canExtend =
    match.expiresAt && !match.expired && !match.firstMessageSent && !match.extended && isPremium;

  return (
    <TouchableOpacity style={[styles.card, match.expired && styles.expiredCard]} onPress={onPress}>
      <Image source={{ uri: match.photo }} style={styles.image} />
      <View style={styles.info}>
        <View style={styles.header}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>
              {match.name}, {match.age}
            </Text>
            {match.verified && (
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedIcon}>✓</Text>
              </View>
            )}
          </View>
          {match.compatibility && (
            <View style={styles.compatibilityBadge}>
              <Text style={styles.compatibilityText}>{match.compatibility}%</Text>
            </View>
          )}
        </View>

        {match.bio && (
          <Text style={styles.bio} numberOfLines={1}>
            {match.bio}
          </Text>
        )}

        {match.interests && match.interests.length > 0 && (
          <View style={styles.interestsRow}>
            {match.interests.slice(0, 3).map((interest, index) => (
              <View key={index} style={styles.interestTag}>
                <Text style={styles.interestText}>{interest}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.footer}>
          {match.expiresAt && (
            <MatchExpirationTimer
              expiresAt={match.expiresAt}
              expired={match.expired}
              firstMessageSent={match.firstMessageSent}
            />
          )}

          {match.lastActive && <Text style={styles.lastActive}>{match.lastActive}</Text>}
        </View>

        {canExtend && onExtend && (
          <TouchableOpacity
            style={styles.extendButton}
            onPress={(e) => {
              e.stopPropagation();
              onExtend();
            }}
          >
            <Text style={styles.extendButtonText}>+24h Extend</Text>
          </TouchableOpacity>
        )}

        {match.expired && isPremium && (
          <View style={styles.expiredBanner}>
            <Text style={styles.expiredBannerText}>Tap to Rematch (Premium)</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  expiredCard: {
    opacity: 0.7,
  },
  image: {
    width: 100,
    height: 140,
  },
  info: {
    flex: 1,
    padding: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  verifiedBadge: {
    backgroundColor: '#2196F3',
    borderRadius: 10,
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  verifiedIcon: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  compatibilityBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  compatibilityText: {
    color: '#4CAF50',
    fontSize: 12,
    fontWeight: '600',
  },
  bio: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
  },
  interestsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  interestTag: {
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    marginRight: 6,
    marginBottom: 4,
  },
  interestText: {
    fontSize: 11,
    color: '#666',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  lastActive: {
    fontSize: 11,
    color: '#999',
  },
  extendButton: {
    backgroundColor: '#9C27B0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  extendButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  expiredBanner: {
    backgroundColor: '#FFF3E0',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#FFB74D',
  },
  expiredBannerText: {
    color: '#F57C00',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
});
