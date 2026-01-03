import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Image,
} from 'react-native';

type OrderType = 'reservation' | 'ticket' | 'gift';
type OrderStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';

interface UnifiedOrder {
  id: string;
  orderType: OrderType;
  status: OrderStatus;
  partnerName: string;
  itemName: string;
  totalAmount: number;
  currency: string;
  createdAt: string;
  scheduledDate?: string;
  imageUrl?: string;
  confirmationNumber?: string;
}

interface OrderHistoryListProps {
  orders: UnifiedOrder[];
  onOrderPress: (order: UnifiedOrder) => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  emptyMessage?: string;
}

export const OrderHistoryList: React.FC<OrderHistoryListProps> = ({
  orders,
  onOrderPress,
  onRefresh,
  isRefreshing = false,
  emptyMessage = 'No orders yet. Start planning your perfect date!',
}) => {
  const [filter, setFilter] = useState<OrderType | 'all'>('all');

  const getOrderIcon = (type: OrderType): string => {
    switch (type) {
      case 'reservation':
        return 'R';
      case 'ticket':
        return 'T';
      case 'gift':
        return 'G';
      default:
        return 'O';
    }
  };

  const getOrderTypeLabel = (type: OrderType): string => {
    switch (type) {
      case 'reservation':
        return 'Restaurant';
      case 'ticket':
        return 'Event';
      case 'gift':
        return 'Gift';
      default:
        return 'Order';
    }
  };

  const getStatusColor = (status: OrderStatus): string => {
    switch (status) {
      case 'pending':
        return '#FFA500';
      case 'confirmed':
        return '#4CAF50';
      case 'completed':
        return '#2196F3';
      case 'cancelled':
        return '#FF4444';
      default:
        return '#999999';
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatPrice = (amount: number, currency: string): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount / 100);
  };

  const filteredOrders = filter === 'all'
    ? orders
    : orders.filter((order) => order.orderType === filter);

  const renderFilterButton = (type: OrderType | 'all', label: string) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        filter === type && styles.filterButtonActive,
      ]}
      onPress={() => setFilter(type)}
    >
      <Text
        style={[
          styles.filterButtonText,
          filter === type && styles.filterButtonTextActive,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderOrderItem = ({ item }: { item: UnifiedOrder }) => (
    <TouchableOpacity
      style={styles.orderCard}
      onPress={() => onOrderPress(item)}
      activeOpacity={0.9}
    >
      <View style={styles.orderHeader}>
        <View
          style={[
            styles.orderTypeIcon,
            { backgroundColor: getStatusColor(item.status) + '20' },
          ]}
        >
          <Text
            style={[styles.orderTypeIconText, { color: getStatusColor(item.status) }]}
          >
            {getOrderIcon(item.orderType)}
          </Text>
        </View>

        <View style={styles.orderInfo}>
          <Text style={styles.orderTypeBadge}>
            {getOrderTypeLabel(item.orderType).toUpperCase()}
          </Text>
          <Text style={styles.orderName} numberOfLines={1}>
            {item.itemName}
          </Text>
          <Text style={styles.partnerName}>{item.partnerName}</Text>
        </View>

        {item.imageUrl && (
          <Image
            source={{ uri: item.imageUrl }}
            style={styles.orderImage}
            resizeMode="cover"
          />
        )}
      </View>

      <View style={styles.orderDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Status</Text>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(item.status) + '20' },
            ]}
          >
            <Text
              style={[styles.statusText, { color: getStatusColor(item.status) }]}
            >
              {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
            </Text>
          </View>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>
            {item.scheduledDate ? 'Scheduled' : 'Ordered'}
          </Text>
          <Text style={styles.detailValue}>
            {formatDate(item.scheduledDate || item.createdAt)}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Total</Text>
          <Text style={styles.priceValue}>
            {formatPrice(item.totalAmount, item.currency)}
          </Text>
        </View>
      </View>

      {item.confirmationNumber && (
        <View style={styles.confirmationContainer}>
          <Text style={styles.confirmationLabel}>Confirmation #</Text>
          <Text style={styles.confirmationNumber}>{item.confirmationNumber}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Text style={styles.emptyIcon}>H</Text>
      </View>
      <Text style={styles.emptyTitle}>No Orders Found</Text>
      <Text style={styles.emptyMessage}>{emptyMessage}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.filterContainer}>
        {renderFilterButton('all', 'All')}
        {renderFilterButton('reservation', 'Dining')}
        {renderFilterButton('ticket', 'Events')}
        {renderFilterButton('gift', 'Gifts')}
      </View>

      <FlatList
        data={filteredOrders}
        renderItem={renderOrderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor="#FF6B6B"
              colors={['#FF6B6B']}
            />
          ) : undefined
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: '#F5F5F5',
  },
  filterButtonActive: {
    backgroundColor: '#FF6B6B',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666666',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  orderHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  orderTypeIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  orderTypeIconText: {
    fontSize: 18,
    fontWeight: '700',
  },
  orderInfo: {
    flex: 1,
  },
  orderTypeBadge: {
    fontSize: 10,
    fontWeight: '600',
    color: '#999999',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  orderName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  partnerName: {
    fontSize: 13,
    color: '#666666',
  },
  orderImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginLeft: 12,
  },
  orderDetails: {
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 13,
    color: '#999999',
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '500',
    color: '#333333',
  },
  priceValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  confirmationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  confirmationLabel: {
    fontSize: 12,
    color: '#666666',
  },
  confirmationNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#5C6BC0',
    fontFamily: 'monospace',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF0F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyIcon: {
    fontSize: 32,
    color: '#FF6B6B',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});

export default OrderHistoryList;
