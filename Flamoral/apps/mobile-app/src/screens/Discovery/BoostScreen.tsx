/**
 * Boost Screen
 * Displays information about Profile Boost and allows purchase
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

const BoostScreen: React.FC = () => {
  const navigation = useNavigation();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [boostsBalance, setBoostsBalance] = useState(0);
  const [activeBoost, setActiveBoost] = useState<{
    active: boolean;
    expiresAt: string | null;
  }>({ active: false, expiresAt: null });

  useEffect(() => {
    initialize();
  }, []);

  const initialize = async () => {
    try {
      await InAppPurchaseService.initialize();
      const availableProducts = await InAppPurchaseService.getConsumableProducts();

      const boostProducts = availableProducts.filter(p =>
        p.productId.includes('boosts')
      );
      setProducts(boostProducts);

      await loadBalance();
      await checkActiveBoost();
    } catch (error) {
      console.error('Failed to initialize:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadBalance = async () => {
    try {
      const response = await axios.get(`${process.env.API_URL}/api/users/balance`);
      setBoostsBalance(response.data.boosts || 0);
    } catch (error) {
      console.error('Failed to load balance:', error);
    }
  };

  const checkActiveBoost = async () => {
    try {
      const response = await axios.get(`${process.env.API_URL}/api/users/active-boost`);
      setActiveBoost(response.data);
    } catch (error) {
      console.error('Failed to check active boost:', error);
    }
  };

  const handlePurchase = async (productId: string) => {
    try {
      setPurchasing(true);
      const result = await InAppPurchaseService.purchaseProduct(productId);

      if (result.success) {
        Alert.alert(
          'Purchase Successful',
          'Boosts have been added to your account!',
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

  const handleActivateBoost = async () => {
    if (boostsBalance <= 0) {
      Alert.alert(
        'No Boosts Available',
        'Purchase Boosts to activate one.',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      setPurchasing(true);
      await axios.post(`${process.env.API_URL}/api/users/activate-boost`);

      setBoostsBalance(prev => prev - 1);
      await checkActiveBoost();

      Alert.alert(
        'Boost Activated!',
        'Your profile is now being shown to more people for the next 30 minutes.',
        [{ text: 'Great!', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('Failed to activate boost:', error);
      Alert.alert('Error', 'Failed to activate Boost. Please try again.');
    } finally {
      setPurchasing(false);
    }
  };

  const getRemainingTime = (): string => {
    if (!activeBoost.active || !activeBoost.expiresAt) return '';

    const now = new Date().getTime();
    const expiresAt = new Date(activeBoost.expiresAt).getTime();
    const remaining = Math.max(0, expiresAt - now);

    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);

    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#9C27B0" />
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
          <View style={styles.boostIconBg}>
            <Icon name="rocket" size={64} color="#9C27B0" />
          </View>
        </View>

        <Text style={styles.title}>Boost</Text>
        <Text style={styles.subtitle}>
          Be the top profile in your area for 30 minutes to get more matches!
        </Text>

        {activeBoost.active ? (
          <View style={styles.activeBoostCard}>
            <Icon name="rocket-launch" size={32} color="#9C27B0" />
            <View style={styles.activeBoostText}>
              <Text style={styles.activeBoostTitle}>Boost Active!</Text>
              <Text style={styles.activeBoostTime}>
                Time remaining: {getRemainingTime()}
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.balanceCard}>
            <Icon name="rocket" size={24} color="#9C27B0" />
            <Text style={styles.balanceText}>
              You have <Text style={styles.balanceCount}>{boostsBalance}</Text> Boosts
            </Text>
          </View>
        )}

        {!activeBoost.active && boostsBalance > 0 && (
          <TouchableOpacity
            style={styles.activateButton}
            onPress={handleActivateBoost}
            disabled={purchasing}
          >
            {purchasing ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Icon name="rocket-launch" size={24} color="#FFFFFF" />
                <Text style={styles.activateButtonText}>Activate Boost Now</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        <View style={styles.benefitsSection}>
          <Text style={styles.benefitsTitle}>How Boost Works</Text>

          <View style={styles.benefitRow}>
            <Icon name="account-multiple" size={24} color="#9C27B0" />
            <Text style={styles.benefitText}>
              Your profile appears first to people nearby
            </Text>
          </View>

          <View style={styles.benefitRow}>
            <Icon name="clock-outline" size={24} color="#9C27B0" />
            <Text style={styles.benefitText}>
              Lasts for 30 minutes
            </Text>
          </View>

          <View style={styles.benefitRow}>
            <Icon name="eye" size={24} color="#9C27B0" />
            <Text style={styles.benefitText}>
              Get up to 10x more profile views
            </Text>
          </View>

          <View style={styles.benefitRow}>
            <Icon name="heart-multiple" size={24} color="#9C27B0" />
            <Text style={styles.benefitText}>
              Increase your chances of matching
            </Text>
          </View>
        </View>

        <View style={styles.packsSection}>
          <Text style={styles.packsTitle}>Get More Boosts</Text>

          {[
            { sku: CONSUMABLE_SKUS.BOOSTS_1, count: 1, price: '$3.99' },
            { sku: CONSUMABLE_SKUS.BOOSTS_5, count: 5, price: '$14.99', popular: true, savings: 'Save 25%' },
            { sku: CONSUMABLE_SKUS.BOOSTS_10, count: 10, price: '$24.99', savings: 'Save 37%' },
          ].map((pack) => (
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
                  <Text style={styles.popularText}>BEST VALUE</Text>
                </View>
              )}

              <View style={styles.packContent}>
                <View style={styles.packLeft}>
                  <Icon name="rocket" size={32} color="#9C27B0" />
                  <View style={styles.packInfo}>
                    <Text style={styles.packCount}>
                      {pack.count} {pack.count === 1 ? 'Boost' : 'Boosts'}
                    </Text>
                    {pack.savings && (
                      <Text style={styles.packSavings}>{pack.savings}</Text>
                    )}
                  </View>
                </View>

                <View style={styles.packRight}>
                  <Text style={styles.packPrice}>{pack.price}</Text>
                  {pack.count > 1 && (
                    <Text style={styles.packPricePerUnit}>
                      ${(parseFloat(pack.price.replace('$', '')) / pack.count).toFixed(2)} each
                    </Text>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.premiumCta}>
          <Text style={styles.premiumCtaText}>
            Get monthly Boosts with Flamoral Premium
          </Text>
          <TouchableOpacity
            style={styles.premiumButton}
            onPress={() => navigation.navigate('Subscription' as never)}
          >
            <Text style={styles.premiumButtonText}>Learn More</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.tipsSection}>
          <Text style={styles.tipsTitle}>Pro Tips</Text>
          <Text style={styles.tipText}>
            • Activate Boost during peak hours (7-10 PM) for maximum visibility
          </Text>
          <Text style={styles.tipText}>
            • Make sure your profile is complete with great photos
          </Text>
          <Text style={styles.tipText}>
            • Combine with Super Likes for even better results
          </Text>
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
  boostIconBg: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F3E5F5',
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
    backgroundColor: '#F3E5F5',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  balanceText: {
    fontSize: 16,
    color: '#1A1A1A',
    marginLeft: 12,
  },
  balanceCount: {
    fontWeight: 'bold',
    color: '#9C27B0',
  },
  activeBoostCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3E5F5',
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#9C27B0',
  },
  activeBoostText: {
    marginLeft: 16,
    flex: 1,
  },
  activeBoostTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#9C27B0',
    marginBottom: 4,
  },
  activeBoostTime: {
    fontSize: 16,
    color: '#666666',
  },
  activateButton: {
    backgroundColor: '#9C27B0',
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  activateButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
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
    borderColor: '#9C27B0',
    borderWidth: 3,
  },
  popularBadge: {
    position: 'absolute',
    top: -12,
    left: '50%',
    transform: [{ translateX: -50 }],
    backgroundColor: '#9C27B0',
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
  tipsSection: {
    backgroundColor: '#FFF9C4',
    padding: 20,
    borderRadius: 12,
    marginBottom: 24,
  },
  tipsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  tipText: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 8,
    lineHeight: 20,
  },
});

export default BoostScreen;
