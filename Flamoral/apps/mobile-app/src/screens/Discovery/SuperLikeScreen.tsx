/**
 * Super Like Screen
 * Displays information about Super Likes and allows purchase
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { InAppPurchaseService, CONSUMABLE_SKUS } from '@services/iap/InAppPurchaseService';
import { Product } from 'react-native-iap';
import axios from 'axios';

interface SuperLikePack {
  sku: string;
  count: number;
  price: string;
  popular?: boolean;
  savings?: string;
}

const SuperLikeScreen: React.FC = () => {
  const navigation = useNavigation();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [currentBalance, setCurrentBalance] = useState(0);

  useEffect(() => {
    initialize();
  }, []);

  const initialize = async () => {
    try {
      await InAppPurchaseService.initialize();
      const availableProducts = await InAppPurchaseService.getConsumableProducts();

      // Filter for super like products
      const superLikeProducts = availableProducts.filter(p =>
        p.productId.includes('superlikes')
      );
      setProducts(superLikeProducts);

      // Get current balance
      await loadBalance();
    } catch (error) {
      console.error('Failed to initialize:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadBalance = async () => {
    try {
      const response = await axios.get(`${process.env.API_URL}/api/users/balance`);
      setCurrentBalance(response.data.superLikes || 0);
    } catch (error) {
      console.error('Failed to load balance:', error);
    }
  };

  const handlePurchase = async (productId: string) => {
    try {
      setPurchasing(true);

      const result = await InAppPurchaseService.purchaseProduct(productId);

      if (result.success) {
        Alert.alert(
          'Purchase Successful',
          'Super Likes have been added to your account!',
          [{ text: 'OK', onPress: () => loadBalance() }]
        );
      } else if (result.error && !result.error.includes('cancelled')) {
        Alert.alert('Purchase Failed', result.error);
      }
    } catch (error) {
      console.error('Purchase error:', error);
      Alert.alert('Purchase Failed', 'Something went wrong. Please try again.');
    } finally {
      setPurchasing(false);
    }
  };

  const getSuperLikePacks = (): SuperLikePack[] => {
    return [
      {
        sku: CONSUMABLE_SKUS.SUPER_LIKES_5,
        count: 5,
        price: products.find(p => p.productId === CONSUMABLE_SKUS.SUPER_LIKES_5)?.localizedPrice || '$4.99',
      },
      {
        sku: CONSUMABLE_SKUS.SUPER_LIKES_25,
        count: 25,
        price: products.find(p => p.productId === CONSUMABLE_SKUS.SUPER_LIKES_25)?.localizedPrice || '$19.99',
        popular: true,
        savings: 'Save 20%',
      },
      {
        sku: CONSUMABLE_SKUS.SUPER_LIKES_60,
        count: 60,
        price: products.find(p => p.productId === CONSUMABLE_SKUS.SUPER_LIKES_60)?.localizedPrice || '$39.99',
        savings: 'Save 33%',
      },
    ];
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00AEEF" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="close" size={28} color="#1A1A1A" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.iconContainer}>
          <View style={styles.starIconBg}>
            <Icon name="star" size={64} color="#00AEEF" />
          </View>
        </View>

        <Text style={styles.title}>Super Like</Text>
        <Text style={styles.subtitle}>
          Stand out with a Super Like! You're 3x more likely to match.
        </Text>

        <View style={styles.balanceCard}>
          <Icon name="star" size={24} color="#00AEEF" />
          <Text style={styles.balanceText}>
            You have <Text style={styles.balanceCount}>{currentBalance}</Text> Super Likes
          </Text>
        </View>

        <View style={styles.benefitsSection}>
          <Text style={styles.benefitsTitle}>What is a Super Like?</Text>

          <View style={styles.benefitRow}>
            <Icon name="check-circle" size={24} color="#00AEEF" />
            <Text style={styles.benefitText}>
              Shows up first in their queue
            </Text>
          </View>

          <View style={styles.benefitRow}>
            <Icon name="check-circle" size={24} color="#00AEEF" />
            <Text style={styles.benefitText}>
              Sends a notification they've been Super Liked
            </Text>
          </View>

          <View style={styles.benefitRow}>
            <Icon name="check-circle" size={24} color="#00AEEF" />
            <Text style={styles.benefitText}>
              Highlighted with a blue star on your profile
            </Text>
          </View>

          <View style={styles.benefitRow}>
            <Icon name="check-circle" size={24} color="#00AEEF" />
            <Text style={styles.benefitText}>
              3x more likely to match
            </Text>
          </View>
        </View>

        <View style={styles.packsSection}>
          <Text style={styles.packsTitle}>Get More Super Likes</Text>

          {getSuperLikePacks().map((pack) => (
            <TouchableOpacity
              key={pack.sku}
              style={[
                styles.packCard,
                pack.popular && styles.packCardPopular,
              ]}
              onPress={() => handlePurchase(pack.sku)}
              disabled={purchasing}
            >
              {pack.popular && (
                <View style={styles.popularBadge}>
                  <Text style={styles.popularText}>MOST POPULAR</Text>
                </View>
              )}

              <View style={styles.packContent}>
                <View style={styles.packLeft}>
                  <Icon name="star" size={32} color="#00AEEF" />
                  <View style={styles.packInfo}>
                    <Text style={styles.packCount}>{pack.count} Super Likes</Text>
                    {pack.savings && (
                      <Text style={styles.packSavings}>{pack.savings}</Text>
                    )}
                  </View>
                </View>

                <View style={styles.packRight}>
                  <Text style={styles.packPrice}>{pack.price}</Text>
                  <Text style={styles.packPricePerUnit}>
                    ${(parseFloat(pack.price.replace(/[^0-9.]/g, '')) / pack.count).toFixed(2)} each
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.premiumCta}>
          <Text style={styles.premiumCtaText}>
            Get unlimited Super Likes with Flamoral Premium
          </Text>
          <TouchableOpacity
            style={styles.premiumButton}
            onPress={() => navigation.navigate('Subscription' as never)}
          >
            <Text style={styles.premiumButtonText}>Learn More</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  starIconBg: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#E6F7FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  balanceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E6F7FF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 32,
  },
  balanceText: {
    fontSize: 16,
    color: '#1A1A1A',
    marginLeft: 12,
  },
  balanceCount: {
    fontWeight: 'bold',
    color: '#00AEEF',
  },
  benefitsSection: {
    marginBottom: 32,
  },
  benefitsTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 16,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  benefitText: {
    fontSize: 16,
    color: '#333333',
    marginLeft: 12,
    flex: 1,
  },
  packsSection: {
    marginBottom: 32,
  },
  packsTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 16,
  },
  packCard: {
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
  },
  packCardPopular: {
    borderColor: '#00AEEF',
    borderWidth: 3,
  },
  popularBadge: {
    position: 'absolute',
    top: -12,
    left: '50%',
    transform: [{ translateX: -60 }],
    backgroundColor: '#00AEEF',
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 12,
  },
  popularText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  packContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  packLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  packInfo: {
    marginLeft: 12,
  },
  packCount: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  packSavings: {
    fontSize: 14,
    fontWeight: '500',
    color: '#00C853',
  },
  packRight: {
    alignItems: 'flex-end',
  },
  packPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  packPricePerUnit: {
    fontSize: 12,
    color: '#999999',
  },
  premiumCta: {
    backgroundColor: '#F5F5F5',
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  premiumCtaText: {
    fontSize: 16,
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 16,
  },
  premiumButton: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 24,
  },
  premiumButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default SuperLikeScreen;
