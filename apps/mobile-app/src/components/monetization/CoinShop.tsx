import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Button } from '../common/Button';

export interface CoinPackage {
  id: string;
  coins: number;
  price: number;
  bonus?: number;
  popular?: boolean;
  bestValue?: boolean;
  discount?: number;
  limitedOffer?: boolean;
}

interface CoinShopProps {
  currentBalance: number;
  onPurchase: (packageId: string) => Promise<void>;
  onRestorePurchases: () => Promise<void>;
}

const COIN_PACKAGES: CoinPackage[] = [
  {
    id: 'coins_50',
    coins: 50,
    price: 4.99,
  },
  {
    id: 'coins_100',
    coins: 100,
    price: 9.99,
    bonus: 10,
    popular: true,
  },
  {
    id: 'coins_200',
    coins: 200,
    price: 17.99,
    bonus: 30,
    discount: 10,
  },
  {
    id: 'coins_500',
    coins: 500,
    price: 39.99,
    bonus: 100,
    bestValue: true,
    discount: 20,
  },
];

const COIN_USES = [
  { icon: '⭐', name: 'Super Like', cost: 1, description: 'Stand out to someone special' },
  { icon: '🔥', name: 'Boost', cost: 5, description: '30 minutes of increased visibility' },
  { icon: '↩️', name: 'Rewind', cost: 1, description: 'Undo your last swipe' },
  { icon: '👀', name: 'See Who Likes You', cost: 3, description: 'Reveal who already likes you' },
  { icon: '✓✓', name: 'Read Receipts', cost: 2, description: 'See when messages are read' },
  { icon: '💎', name: 'Premium Prompts', cost: 2, description: 'AI-generated icebreakers' },
];

export const CoinShop: React.FC<CoinShopProps> = ({
  currentBalance,
  onPurchase,
  onRestorePurchases,
}) => {
  const [isLoading, setIsLoading] = useState<string | null>(null);

  const handlePurchase = async (packageId: string) => {
    setIsLoading(packageId);
    try {
      await onPurchase(packageId);

      const pkg = COIN_PACKAGES.find((p) => p.id === packageId);
      const totalCoins = pkg ? pkg.coins + (pkg.bonus || 0) : 0;

      Alert.alert('Purchase Successful!', `You've received ${totalCoins} coins!`, [{ text: 'OK' }]);
    } catch (error: any) {
      Alert.alert(
        'Purchase Failed',
        error.message || 'Unable to complete purchase. Please try again.'
      );
      console.error('Coin purchase error:', error);
    } finally {
      setIsLoading(null);
    }
  };

  const handleRestore = async () => {
    setIsLoading('restore');
    try {
      await onRestorePurchases();
      Alert.alert('Restored', 'Your purchases have been restored successfully.');
    } catch (error: any) {
      Alert.alert(
        'Restore Failed',
        error.message || 'Unable to restore purchases. Please try again.'
      );
      console.error('Restore error:', error);
    } finally {
      setIsLoading(null);
    }
  };

  const calculateSavings = (pkg: CoinPackage): number => {
    // Calculate value compared to smallest package (base: 50 coins = $4.99)
    const baseValue = 4.99 / 50; // $0.0998 per coin
    const packageValue = pkg.price / pkg.coins;
    const savings = ((baseValue - packageValue) / baseValue) * 100;
    return Math.max(0, Math.round(savings));
  };

  const getTotalCoins = (pkg: CoinPackage): number => {
    return pkg.coins + (pkg.bonus || 0);
  };

  const renderCoinPackage = (pkg: CoinPackage) => {
    const totalCoins = getTotalCoins(pkg);
    const savings = calculateSavings(pkg);
    const isLoadingThis = isLoading === pkg.id;

    return (
      <TouchableOpacity
        key={pkg.id}
        style={[
          styles.packageCard,
          (pkg.popular || pkg.bestValue) && styles.packageCardHighlighted,
        ]}
        onPress={() => handlePurchase(pkg.id)}
        disabled={isLoadingThis}
      >
        {pkg.popular && (
          <View style={[styles.badge, styles.badgePopular]}>
            <Text style={styles.badgeText}>Most Popular</Text>
          </View>
        )}
        {pkg.bestValue && (
          <View style={[styles.badge, styles.badgeBestValue]}>
            <Text style={styles.badgeText}>Best Value</Text>
          </View>
        )}
        {pkg.limitedOffer && (
          <View style={[styles.badge, styles.badgeLimited]}>
            <Text style={styles.badgeText}>Limited Offer</Text>
          </View>
        )}

        <View style={styles.packageHeader}>
          <View style={styles.coinIconContainer}>
            <Text style={styles.coinIcon}>💰</Text>
          </View>
          <View style={styles.packageInfo}>
            <Text style={styles.packageCoins}>{pkg.coins} Coins</Text>
            {pkg.bonus && pkg.bonus > 0 && (
              <View style={styles.bonusContainer}>
                <Text style={styles.bonusText}>+ {pkg.bonus} Bonus</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.packageDetails}>
          <Text style={styles.totalCoins}>{totalCoins} Total Coins</Text>
          {savings > 0 && <Text style={styles.savingsText}>{savings}% more value</Text>}
        </View>

        <View style={styles.packageFooter}>
          <Text style={styles.packagePrice}>${pkg.price.toFixed(2)}</Text>
          {isLoadingThis ? (
            <ActivityIndicator size="small" color="#E91E63" />
          ) : (
            <Text style={styles.buyButton}>Buy Now</Text>
          )}
        </View>

        {pkg.discount && pkg.discount > 0 && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>{pkg.discount}% OFF</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderCoinUse = (use: (typeof COIN_USES)[0]) => {
    return (
      <View key={use.name} style={styles.useCard}>
        <View style={styles.useIcon}>
          <Text style={styles.useIconText}>{use.icon}</Text>
        </View>
        <View style={styles.useInfo}>
          <Text style={styles.useName}>{use.name}</Text>
          <Text style={styles.useDescription}>{use.description}</Text>
        </View>
        <View style={styles.useCost}>
          <Text style={styles.useCostNumber}>{use.cost}</Text>
          <Text style={styles.useCostLabel}>coins</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.balanceContainer}>
          <Text style={styles.balanceLabel}>Your Balance</Text>
          <View style={styles.balanceDisplay}>
            <Text style={styles.balanceIcon}>💰</Text>
            <Text style={styles.balanceAmount}>{currentBalance}</Text>
            <Text style={styles.balanceCoins}>coins</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Buy Coins</Text>
          <Text style={styles.sectionSubtitle}>
            Use coins to unlock premium features and boost your profile
          </Text>

          <View style={styles.packagesGrid}>
            {COIN_PACKAGES.map((pkg) => renderCoinPackage(pkg))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What can you do with coins?</Text>
          <View style={styles.usesList}>{COIN_USES.map((use) => renderCoinUse(use))}</View>
        </View>

        <TouchableOpacity
          style={styles.restoreButton}
          onPress={handleRestore}
          disabled={isLoading === 'restore'}
        >
          {isLoading === 'restore' ? (
            <ActivityIndicator size="small" color="#E91E63" />
          ) : (
            <Text style={styles.restoreButtonText}>Restore Purchases</Text>
          )}
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>• Coins are virtual currency used within the app</Text>
          <Text style={styles.footerText}>• Coins do not expire and remain in your account</Text>
          <Text style={styles.footerText}>
            • Unused coins cannot be refunded or exchanged for cash
          </Text>
          <Text style={styles.footerText}>
            • Payment will be charged to your Apple ID/Google Play account
          </Text>
          <TouchableOpacity>
            <Text style={styles.footerLink}>Terms of Service</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: '#FFF',
    paddingHorizontal: 20,
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  balanceContainer: {
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  balanceDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#FFB74D',
  },
  balanceIcon: {
    fontSize: 24,
    marginRight: 8,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FF9800',
    marginRight: 8,
  },
  balanceCoins: {
    fontSize: 16,
    color: '#FF9800',
    fontWeight: '600',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  section: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    lineHeight: 20,
  },
  packagesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  packageCard: {
    width: '48%',
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    margin: '1%',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    position: 'relative',
  },
  packageCardHighlighted: {
    borderColor: '#E91E63',
    backgroundColor: '#FFF5F8',
  },
  badge: {
    position: 'absolute',
    top: -10,
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
  },
  badgePopular: {
    backgroundColor: '#E91E63',
  },
  badgeBestValue: {
    backgroundColor: '#4CAF50',
  },
  badgeLimited: {
    backgroundColor: '#FF9800',
  },
  badgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  packageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  coinIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFF3E0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  coinIcon: {
    fontSize: 28,
  },
  packageInfo: {
    flex: 1,
  },
  packageCoins: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  bonusContainer: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  bonusText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  packageDetails: {
    marginBottom: 12,
  },
  totalCoins: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  savingsText: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '600',
  },
  packageFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  packagePrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#E91E63',
  },
  buyButton: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E91E63',
  },
  discountBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#FF5252',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  discountText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  usesList: {
    marginTop: 8,
  },
  useCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  useIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  useIconText: {
    fontSize: 24,
  },
  useInfo: {
    flex: 1,
  },
  useName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  useDescription: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  useCost: {
    alignItems: 'center',
    paddingLeft: 12,
  },
  useCostNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF9800',
  },
  useCostLabel: {
    fontSize: 11,
    color: '#999',
  },
  restoreButton: {
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    marginHorizontal: 20,
  },
  restoreButtonText: {
    fontSize: 16,
    color: '#E91E63',
    fontWeight: '600',
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    lineHeight: 18,
    marginBottom: 6,
  },
  footerLink: {
    fontSize: 12,
    color: '#E91E63',
    fontWeight: '600',
    marginTop: 8,
  },
});
