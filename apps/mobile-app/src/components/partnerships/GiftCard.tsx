import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';

interface GiftProduct {
  id: string;
  partnerId: string;
  externalId: string;
  name: string;
  description?: string;
  category: string;
  price: number;
  originalPrice?: number;
  currency: string;
  imageUrls: string[];
  isRomantic: boolean;
  occasionTags: string[];
  rating?: number;
}

interface GiftCardProps {
  product: GiftProduct;
  onPress: (product: GiftProduct) => void;
  onSendGift?: (product: GiftProduct) => void;
  compact?: boolean;
}

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

export const GiftCard: React.FC<GiftCardProps> = ({
  product,
  onPress,
  onSendGift,
  compact = false,
}) => {
  const formatPrice = (price: number, currency: string): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(price);
  };

  const hasDiscount = product.originalPrice && product.originalPrice > product.price;

  const discountPercentage = hasDiscount
    ? Math.round(((product.originalPrice! - product.price) / product.originalPrice!) * 100)
    : 0;

  if (compact) {
    return (
      <TouchableOpacity
        style={styles.compactContainer}
        onPress={() => onPress(product)}
        activeOpacity={0.9}
      >
        <Image
          source={{
            uri: product.imageUrls[0] || 'https://via.placeholder.com/150x150',
          }}
          style={styles.compactImage}
          resizeMode="cover"
        />

        {product.isRomantic && (
          <View style={styles.compactRomanticBadge}>
            <Text style={styles.romanticIcon}>H</Text>
          </View>
        )}

        <View style={styles.compactContent}>
          <Text style={styles.compactName} numberOfLines={2}>
            {product.name}
          </Text>
          <Text style={styles.compactPrice}>{formatPrice(product.price, product.currency)}</Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity style={styles.container} onPress={() => onPress(product)} activeOpacity={0.9}>
      <Image
        source={{
          uri: product.imageUrls[0] || 'https://via.placeholder.com/300x300',
        }}
        style={styles.image}
        resizeMode="cover"
      />

      {product.isRomantic && (
        <View style={styles.romanticBadge}>
          <Text style={styles.romanticText}>Romantic Pick</Text>
        </View>
      )}

      {hasDiscount && (
        <View style={styles.saleBadge}>
          <Text style={styles.saleText}>{discountPercentage}% OFF</Text>
        </View>
      )}

      <View style={styles.content}>
        <Text style={styles.category}>{product.category.toUpperCase()}</Text>

        <Text style={styles.name} numberOfLines={2}>
          {product.name}
        </Text>

        {product.description && (
          <Text style={styles.description} numberOfLines={2}>
            {product.description}
          </Text>
        )}

        <View style={styles.tagsContainer}>
          {product.occasionTags.slice(0, 3).map((tag) => (
            <View key={tag} style={styles.tag}>
              <Text style={styles.tagText}>{tag.replace('_', ' ')}</Text>
            </View>
          ))}
        </View>

        <View style={styles.priceContainer}>
          <Text style={styles.price}>{formatPrice(product.price, product.currency)}</Text>
          {hasDiscount && (
            <Text style={styles.originalPrice}>
              {formatPrice(product.originalPrice!, product.currency)}
            </Text>
          )}
        </View>

        {onSendGift && (
          <TouchableOpacity style={styles.sendButton} onPress={() => onSendGift(product)}>
            <Text style={styles.sendButtonText}>Send as Gift</Text>
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
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  image: {
    width: '100%',
    height: CARD_WIDTH,
  },
  romanticBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: '#FF1493',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  romanticText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  saleBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#FF4444',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  saleText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  content: {
    padding: 12,
  },
  category: {
    fontSize: 10,
    color: '#999999',
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  description: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 8,
    lineHeight: 16,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  tag: {
    backgroundColor: '#FFF0F5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginRight: 6,
    marginBottom: 4,
  },
  tagText: {
    fontSize: 10,
    color: '#FF1493',
    textTransform: 'capitalize',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  price: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  originalPrice: {
    fontSize: 13,
    color: '#999999',
    textDecorationLine: 'line-through',
    marginLeft: 8,
  },
  sendButton: {
    backgroundColor: '#FF6B6B',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  // Compact styles
  compactContainer: {
    width: 120,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  compactImage: {
    width: 120,
    height: 100,
  },
  compactRomanticBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: '#FF1493',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  romanticIcon: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  compactContent: {
    padding: 8,
  },
  compactName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  compactPrice: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FF6B6B',
  },
});

export default GiftCard;
