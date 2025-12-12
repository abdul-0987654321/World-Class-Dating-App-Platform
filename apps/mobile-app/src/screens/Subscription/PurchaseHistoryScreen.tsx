/**
 * Purchase History Screen
 * Shows past transactions and receipts
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Platform,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { paymentService } from '../../services/payments/PaymentService';

interface Transaction {
  id: string;
  type: 'subscription' | 'coins' | 'boost' | 'superlike';
  productName: string;
  amount: number;
  currency: string;
  status: 'completed' | 'pending' | 'failed' | 'refunded';
  date: Date;
  transactionId: string;
  provider: 'apple_iap' | 'google_play' | 'stripe';
}

export const PurchaseHistoryScreen: React.FC<{ navigation: any; route: any }> = ({
  navigation,
  route,
}) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  useEffect(() => {
    loadPurchaseHistory();
  }, []);

  const loadPurchaseHistory = async () => {
    try {
      setLoading(true);
      const history = await paymentService.getPurchaseHistory();

      // Transform API response to Transaction format
      const formattedTransactions: Transaction[] = history.map((item: any) => ({
        id: item.id || item.transactionId,
        type: item.type || 'subscription',
        productName: item.productName || item.description,
        amount: item.amount || 0,
        currency: item.currency || 'USD',
        status: item.status || 'completed',
        date: new Date(item.createdAt || item.date),
        transactionId: item.transactionId || item.id,
        provider: item.provider || 'stripe',
      }));

      setTransactions(formattedTransactions);
    } catch (error) {
      console.error('Failed to load purchase history:', error);
      Alert.alert('Error', 'Failed to load purchase history. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadPurchaseHistory();
  };

  const handleViewReceipt = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    // In a real app, this would open a modal with detailed receipt information
    Alert.alert(
      'Transaction Details',
      `Transaction ID: ${transaction.transactionId}\n` +
        `Product: ${transaction.productName}\n` +
        `Amount: ${transaction.currency} ${transaction.amount.toFixed(2)}\n` +
        `Status: ${transaction.status}\n` +
        `Date: ${transaction.date.toLocaleDateString()}`,
      [
        {
          text: 'Close',
          style: 'cancel',
        },
        {
          text: 'Contact Support',
          onPress: () => navigation.navigate('Support', { transactionId: transaction.transactionId }),
        },
      ]
    );
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'completed':
        return '#10B981';
      case 'pending':
        return '#F59E0B';
      case 'failed':
        return '#EF4444';
      case 'refunded':
        return '#6B7280';
      default:
        return '#9CA3AF';
    }
  };

  const getStatusIcon = (status: string): string => {
    switch (status) {
      case 'completed':
        return 'checkmark-circle';
      case 'pending':
        return 'time';
      case 'failed':
        return 'close-circle';
      case 'refunded':
        return 'return-up-back';
      default:
        return 'help-circle';
    }
  };

  const getTypeIcon = (type: string): string => {
    switch (type) {
      case 'subscription':
        return 'ribbon';
      case 'coins':
        return 'disc';
      case 'boost':
        return 'flash';
      case 'superlike':
        return 'star';
      default:
        return 'bag';
    }
  };

  const renderTransaction = ({ item }: { item: Transaction }) => (
    <TouchableOpacity
      style={styles.transactionCard}
      onPress={() => handleViewReceipt(item)}
      activeOpacity={0.7}
    >
      <View style={styles.transactionIcon}>
        <Ionicons name={getTypeIcon(item.type) as any} size={24} color="#EC4899" />
      </View>

      <View style={styles.transactionInfo}>
        <Text style={styles.transactionProduct}>{item.productName}</Text>
        <View style={styles.transactionMeta}>
          <Ionicons
            name={getStatusIcon(item.status) as any}
            size={16}
            color={getStatusColor(item.status)}
          />
          <Text style={[styles.transactionStatus, { color: getStatusColor(item.status) }]}>
            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
          </Text>
          <Text style={styles.transactionDate}>
            {item.date.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </Text>
        </View>
      </View>

      <View style={styles.transactionAmount}>
        <Text style={styles.transactionPrice}>
          {item.currency} ${item.amount.toFixed(2)}
        </Text>
        <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="receipt-outline" size={64} color="#D1D5DB" />
      <Text style={styles.emptyStateTitle}>No Purchase History</Text>
      <Text style={styles.emptyStateText}>
        Your purchase history will appear here once you make your first purchase.
      </Text>
      <TouchableOpacity
        style={styles.emptyStateButton}
        onPress={() => navigation.navigate('SubscriptionPlans')}
      >
        <Text style={styles.emptyStateButtonText}>Browse Plans</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#EC4899" />
        <Text style={styles.loadingText}>Loading purchase history...</Text>
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
        <Text style={styles.headerTitle}>Purchase History</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Summary Stats */}
      {transactions.length > 0 && (
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{transactions.length}</Text>
            <Text style={styles.statLabel}>Total Purchases</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              ${transactions
                .filter((t) => t.status === 'completed')
                .reduce((sum, t) => sum + t.amount, 0)
                .toFixed(2)}
            </Text>
            <Text style={styles.statLabel}>Total Spent</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {transactions.filter((t) => t.status === 'completed').length}
            </Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
        </View>
      )}

      {/* Transaction List */}
      <FlatList
        data={transactions}
        renderItem={renderTransaction}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContainer,
          transactions.length === 0 && styles.listContainerEmpty,
        ]}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#EC4899"
          />
        }
      />
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
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  listContainer: {
    padding: 16,
  },
  listContainerEmpty: {
    flex: 1,
    justifyContent: 'center',
  },
  transactionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  transactionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FEF3F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionProduct: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  transactionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  transactionStatus: {
    fontSize: 12,
    fontWeight: '500',
  },
  transactionDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  transactionAmount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  transactionPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 32,
  },
  emptyStateButton: {
    backgroundColor: '#EC4899',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyStateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
});

export default PurchaseHistoryScreen;
