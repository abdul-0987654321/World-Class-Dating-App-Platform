/**
 * Store Screen
 * In-app store for purchasing coins, boosts, and super likes
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { paymentService, Product } from '../../services/payments/PaymentService';

interface StoreProduct {
  id: string;
  name: string;
  description: string;
  amount: number;
  price: number;
  icon: string;
  gradient: string[];
  badge?: string;
  type: 'coins' | 'boost' | 'superlike';
}

const COIN_PACKAGES: StoreProduct[] = [
  {
    id: 'coins_100',
    name: '100 Coins',
    description: 'Perfect for trying out',
    amount: 100,
    price: 4.99,
    icon: 'disc',
    gradient: ['#FFD700', '#FFA500'],
    type: 'coins',
  },
  {
    id: 'coins_500',
    name: '500 Coins',
    description: 'Most popular choice',
    amount: 500,
    price: 19.99,
    icon: 'disc',
    gradient: ['#FFD700', '#FFA500'],
    badge: 'Popular',
    type: 'coins',
  },
  {
    id: 'coins_1000',
    name: '1,000 Coins',
    description: 'Best value pack',
    amount: 1000,
    price: 34.99,
    icon: 'disc',
    gradient: ['#FFD700', '#FFA500'],
    badge: 'Best Value',
    type: 'coins',
  },
];

const BOOST_PACKAGES: StoreProduct[] = [
  {
    id: 'boost_1',
    name: '1 Boost',
    description: '30 minutes of visibility',
    amount: 1,
    price: 3.99,
    icon: 'flash',
    gradient: ['#EC4899', '#F97316'],
    type: 'boost',
  },
  {
    id: 'boost_5',
    name: '5 Boosts',
    description: 'Save 20% with bundle',
    amount: 5,
    price: 14.99,
    icon: 'flash',
    gradient: ['#EC4899', '#F97316'],
    badge: 'Save 20%',
    type: 'boost',
  },
];

const SUPERLIKE_PACKAGES: StoreProduct[] = [
  {
    id: 'superlike_5',
    name: '5 Super Likes',
    description: 'Stand out from the crowd',
    amount: 5,
    price: 4.99,
    icon: 'star',
    gradient: ['#3B82F6', '#8B5CF6'],
    type: 'superlike',
  },
  {
    id: 'superlike_25',
    name: '25 Super Likes',
    description: 'Never run out',
    amount: 25,
    price: 19.99,
    icon: 'star',
    gradient: ['#3B82F6', '#8B5CF6'],
    badge: 'Best Value',
    type: 'superlike',
  },
];

export const StoreScreen: React.FC<{ navigation: any; route: any }> = ({ navigation, route }) => {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [wallet, setWallet] = useState<any>(null);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<'coins' | 'boosts' | 'superlikes'>('coins');

  useEffect(() => {
    loadStore();
  }, []);

  const loadStore = async () => {
    try {
      setLoading(true);

      // Initialize payment service
      await paymentService.initialize();

      // Get available products
      const availableProducts = await paymentService.getConsumables();
      setProducts(availableProducts);

      // Get wallet balance
      const walletBalance = await paymentService.getWalletBalance();
      setWallet(walletBalance);
    } catch (error) {
      console.error('Failed to load store:', error);
      Alert.alert('Error', 'Failed to load store. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (product: StoreProduct) => {
    try {
      setPurchasing(product.id);

      // Determine product ID based on platform
      const productId = Platform.OS === 'ios' ? `com.flamoral.${product.id}` : product.id;

      // Find the IAP product
      const iapProduct = products.find((p) => p.productId === productId);

      if (!iapProduct) {
        Alert.alert('Error', 'Product not available. Please try again.');
        return;
      }

      // Purchase consumable
      const purchase = await paymentService.purchaseConsumable(productId);

      if (purchase) {
        Alert.alert('Success', `${product.name} added to your account!`, [
          {
            text: 'OK',
            onPress: () => loadStore(), // Reload to update wallet
          },
        ]);
      }
    } catch (error: any) {
      console.error('Purchase failed:', error);

      if (error.code !== 'E_USER_CANCELLED') {
        Alert.alert('Error', 'Failed to complete purchase. Please try again.');
      }
    } finally {
      setPurchasing(null);
    }
  };

  const renderProduct = (product: StoreProduct) => {
    const iapProduct = products.find((p) => p.productId.includes(product.id));

    return (
      <View key={product.id} style={styles.productCard}>
        {product.badge && (
          <View style={styles.productBadge}>
            <Text style={styles.productBadgeText}>{product.badge}</Text>
          </View>
        )}

        <LinearGradient colors={product.gradient} style={styles.productGradient}>
          <Ionicons name={product.icon as any} size={40} color="#FFF" />
        </LinearGradient>

        <View style={styles.productInfo}>
          <Text style={styles.productName}>{product.name}</Text>
          <Text style={styles.productDescription}>{product.description}</Text>
        </View>

        <TouchableOpacity
          style={styles.purchaseButton}
          onPress={() => handlePurchase(product)}
          disabled={purchasing !== null}
        >
          {purchasing === product.id ? (
            <ActivityIndicator color="#EC4899" />
          ) : (
            <Text style={styles.purchaseButtonText}>
              {iapProduct?.localizedPrice || `$${product.price.toFixed(2)}`}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#EC4899" />
        <Text style={styles.loadingText}>Loading store...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Store</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Wallet Balance */}
      <View style={styles.walletContainer}>
        <LinearGradient
          colors={['#EC4899', '#9333EA']}
          style={styles.walletGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <View style={styles.walletItem}>
            <Ionicons name="disc" size={24} color="#FFF" />
            <View style={styles.walletItemText}>
              <Text style={styles.walletLabel}>Coins</Text>
              <Text style={styles.walletValue}>{wallet?.coins || 0}</Text>
            </View>
          </View>

          <View style={styles.walletDivider} />

          <View style={styles.walletItem}>
            <Ionicons name="diamond" size={24} color="#FFF" />
            <View style={styles.walletItemText}>
              <Text style={styles.walletLabel}>Gems</Text>
              <Text style={styles.walletValue}>{wallet?.gems || 0}</Text>
            </View>
          </View>
        </LinearGradient>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'coins' && styles.tabActive]}
          onPress={() => setSelectedTab('coins')}
        >
          <Ionicons name="disc" size={20} color={selectedTab === 'coins' ? '#EC4899' : '#9CA3AF'} />
          <Text style={[styles.tabText, selectedTab === 'coins' && styles.tabTextActive]}>
            Coins
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, selectedTab === 'boosts' && styles.tabActive]}
          onPress={() => setSelectedTab('boosts')}
        >
          <Ionicons
            name="flash"
            size={20}
            color={selectedTab === 'boosts' ? '#EC4899' : '#9CA3AF'}
          />
          <Text style={[styles.tabText, selectedTab === 'boosts' && styles.tabTextActive]}>
            Boosts
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, selectedTab === 'superlikes' && styles.tabActive]}
          onPress={() => setSelectedTab('superlikes')}
        >
          <Ionicons
            name="star"
            size={20}
            color={selectedTab === 'superlikes' ? '#EC4899' : '#9CA3AF'}
          />
          <Text style={[styles.tabText, selectedTab === 'superlikes' && styles.tabTextActive]}>
            Super Likes
          </Text>
        </TouchableOpacity>
      </View>

      {/* Products */}
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.productsContainer}>
          {selectedTab === 'coins' && COIN_PACKAGES.map(renderProduct)}
          {selectedTab === 'boosts' && BOOST_PACKAGES.map(renderProduct)}
          {selectedTab === 'superlikes' && SUPERLIKE_PACKAGES.map(renderProduct)}
        </View>

        {/* Info Section */}
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>
            What can you do with {selectedTab === 'coins' ? 'coins' : selectedTab}?
          </Text>
          {selectedTab === 'coins' && (
            <View style={styles.infoList}>
              <View style={styles.infoItem}>
                <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                <Text style={styles.infoText}>Send virtual gifts</Text>
              </View>
              <View style={styles.infoItem}>
                <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                <Text style={styles.infoText}>Unlock premium filters</Text>
              </View>
              <View style={styles.infoItem}>
                <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                <Text style={styles.infoText}>Access exclusive features</Text>
              </View>
            </View>
          )}
          {selectedTab === 'boosts' && (
            <View style={styles.infoList}>
              <View style={styles.infoItem}>
                <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                <Text style={styles.infoText}>Get 10x more profile views</Text>
              </View>
              <View style={styles.infoItem}>
                <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                <Text style={styles.infoText}>Appear at the top of Discovery</Text>
              </View>
              <View style={styles.infoItem}>
                <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                <Text style={styles.infoText}>30 minutes of visibility</Text>
              </View>
            </View>
          )}
          {selectedTab === 'superlikes' && (
            <View style={styles.infoList}>
              <View style={styles.infoItem}>
                <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                <Text style={styles.infoText}>Stand out from regular likes</Text>
              </View>
              <View style={styles.infoItem}>
                <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                <Text style={styles.infoText}>3x more likely to match</Text>
              </View>
              <View style={styles.infoItem}>
                <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                <Text style={styles.infoText}>Show you're really interested</Text>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    paddingBottom: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  walletContainer: {
    marginHorizontal: 16,
    marginVertical: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  walletGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  walletItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  walletItemText: {
    marginLeft: 12,
  },
  walletLabel: {
    fontSize: 12,
    color: '#FFF',
    opacity: 0.9,
  },
  walletValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
  },
  walletDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#FFF',
    opacity: 0.3,
    marginHorizontal: 16,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#EC4899',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9CA3AF',
    marginLeft: 8,
  },
  tabTextActive: {
    color: '#EC4899',
  },
  scrollView: {
    flex: 1,
  },
  productsContainer: {
    padding: 16,
  },
  productCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  productBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  productBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFF',
  },
  productGradient: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productInfo: {
    flex: 1,
    marginLeft: 16,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  productDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  purchaseButton: {
    backgroundColor: '#FEF3F2',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    minWidth: 80,
    alignItems: 'center',
  },
  purchaseButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EC4899',
  },
  infoSection: {
    padding: 24,
    backgroundColor: '#FFF',
    marginTop: 8,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  infoList: {
    gap: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoText: {
    fontSize: 14,
    color: '#4B5563',
    marginLeft: 12,
  },
});

export default StoreScreen;
