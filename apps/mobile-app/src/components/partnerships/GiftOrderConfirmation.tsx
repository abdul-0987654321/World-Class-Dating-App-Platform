import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Share } from 'react-native';

interface GiftOrder {
  id: string;
  confirmationNumber: string;
  productName: string;
  productDescription?: string;
  imageUrl?: string;
  recipientName: string;
  recipientAddress: string;
  senderName: string;
  giftMessage?: string;
  deliveryDate: string;
  deliveryTimeSlot?: string;
  totalAmount: number;
  currency: string;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  trackingNumber?: string;
  carrier?: string;
}

interface GiftOrderConfirmationProps {
  order: GiftOrder;
  onTrackOrder?: () => void;
  onContactSupport?: () => void;
  onCancel?: () => void;
  onReorder?: () => void;
  onClose?: () => void;
}

export const GiftOrderConfirmation: React.FC<GiftOrderConfirmationProps> = ({
  order,
  onTrackOrder,
  onContactSupport,
  onCancel,
  onReorder,
  onClose,
}) => {
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
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

  const getStatusConfig = (status: GiftOrder['status']) => {
    switch (status) {
      case 'confirmed':
        return {
          color: '#4CAF50',
          icon: 'C',
          label: 'Order Confirmed',
          description: 'Your gift is being prepared',
        };
      case 'pending':
        return {
          color: '#FFA500',
          icon: 'P',
          label: 'Processing',
          description: 'We are processing your order',
        };
      case 'shipped':
        return {
          color: '#2196F3',
          icon: 'S',
          label: 'Shipped',
          description: 'Your gift is on its way',
        };
      case 'delivered':
        return {
          color: '#9C27B0',
          icon: 'D',
          label: 'Delivered',
          description: 'Gift has been delivered',
        };
      case 'cancelled':
        return {
          color: '#FF4444',
          icon: 'X',
          label: 'Cancelled',
          description: 'Order has been cancelled',
        };
      default:
        return {
          color: '#999999',
          icon: '?',
          label: 'Unknown',
          description: '',
        };
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `I sent ${order.recipientName} a special gift - ${order.productName}! It should arrive on ${formatDate(order.deliveryDate)}.`,
        title: 'Gift Sent',
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const statusConfig = getStatusConfig(order.status);

  const getProgressStep = (status: GiftOrder['status']): number => {
    switch (status) {
      case 'pending':
        return 1;
      case 'confirmed':
        return 2;
      case 'shipped':
        return 3;
      case 'delivered':
        return 4;
      default:
        return 0;
    }
  };

  const progressStep = getProgressStep(order.status);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        {onClose && (
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeIcon}>X</Text>
          </TouchableOpacity>
        )}

        <View style={[styles.statusIconContainer, { backgroundColor: statusConfig.color + '20' }]}>
          <Text style={[styles.statusIcon, { color: statusConfig.color }]}>
            {statusConfig.icon}
          </Text>
        </View>

        <Text style={styles.statusLabel}>{statusConfig.label}</Text>
        <Text style={styles.statusDescription}>{statusConfig.description}</Text>
      </View>

      {order.status !== 'cancelled' && (
        <View style={styles.progressContainer}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${(progressStep / 4) * 100}%` }]} />
          </View>
          <View style={styles.progressLabels}>
            <View style={styles.progressLabelContainer}>
              <View style={[styles.progressDot, progressStep >= 1 && styles.progressDotActive]} />
              <Text style={styles.progressLabel}>Ordered</Text>
            </View>
            <View style={styles.progressLabelContainer}>
              <View style={[styles.progressDot, progressStep >= 2 && styles.progressDotActive]} />
              <Text style={styles.progressLabel}>Prepared</Text>
            </View>
            <View style={styles.progressLabelContainer}>
              <View style={[styles.progressDot, progressStep >= 3 && styles.progressDotActive]} />
              <Text style={styles.progressLabel}>Shipped</Text>
            </View>
            <View style={styles.progressLabelContainer}>
              <View style={[styles.progressDot, progressStep >= 4 && styles.progressDotActive]} />
              <Text style={styles.progressLabel}>Delivered</Text>
            </View>
          </View>
        </View>
      )}

      <View style={styles.productCard}>
        {order.imageUrl && (
          <Image source={{ uri: order.imageUrl }} style={styles.productImage} resizeMode="cover" />
        )}
        <View style={styles.productInfo}>
          <Text style={styles.productName}>{order.productName}</Text>
          {order.productDescription && (
            <Text style={styles.productDescription} numberOfLines={2}>
              {order.productDescription}
            </Text>
          )}
        </View>
      </View>

      <View style={styles.confirmationCard}>
        <Text style={styles.confirmationLabel}>Order Number</Text>
        <Text style={styles.confirmationNumber}>{order.confirmationNumber}</Text>
      </View>

      <View style={styles.detailsCard}>
        <Text style={styles.sectionTitle}>Delivery Details</Text>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Recipient</Text>
          <Text style={styles.detailValue}>{order.recipientName}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Delivery Address</Text>
          <Text style={styles.detailValue}>{order.recipientAddress}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Expected Delivery</Text>
          <Text style={styles.detailValueHighlight}>
            {formatDate(order.deliveryDate)}
            {order.deliveryTimeSlot && ` (${order.deliveryTimeSlot})`}
          </Text>
        </View>

        {order.trackingNumber && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Tracking</Text>
            <Text style={styles.detailValueLink}>
              {order.carrier && `${order.carrier}: `}
              {order.trackingNumber}
            </Text>
          </View>
        )}
      </View>

      {order.giftMessage && (
        <View style={styles.messageCard}>
          <Text style={styles.messageTitle}>Your Gift Message</Text>
          <View style={styles.messageContent}>
            <Text style={styles.messageQuote}>"</Text>
            <Text style={styles.messageText}>{order.giftMessage}</Text>
            <Text style={styles.messageQuoteEnd}>"</Text>
          </View>
          <Text style={styles.messageSender}>- {order.senderName}</Text>
        </View>
      )}

      <View style={styles.totalCard}>
        <Text style={styles.totalLabel}>Total Paid</Text>
        <Text style={styles.totalValue}>{formatPrice(order.totalAmount, order.currency)}</Text>
      </View>

      <View style={styles.actionsContainer}>
        {order.status === 'shipped' && onTrackOrder && (
          <TouchableOpacity style={styles.primaryButton} onPress={onTrackOrder}>
            <Text style={styles.primaryButtonText}>Track Package</Text>
          </TouchableOpacity>
        )}

        {order.status === 'delivered' && onReorder && (
          <TouchableOpacity style={styles.primaryButton} onPress={onReorder}>
            <Text style={styles.primaryButtonText}>Send Again</Text>
          </TouchableOpacity>
        )}

        <View style={styles.actionButtonRow}>
          <TouchableOpacity style={styles.secondaryButton} onPress={handleShare}>
            <Text style={styles.secondaryButtonText}>Share</Text>
          </TouchableOpacity>

          {onContactSupport && (
            <TouchableOpacity style={styles.secondaryButton} onPress={onContactSupport}>
              <Text style={styles.secondaryButtonText}>Contact Support</Text>
            </TouchableOpacity>
          )}
        </View>

        {(order.status === 'pending' || order.status === 'confirmed') && onCancel && (
          <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
            <Text style={styles.cancelButtonText}>Cancel Order</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.noteCard}>
        <Text style={styles.noteIcon}>H</Text>
        <Text style={styles.noteText}>
          We'll send you updates via email and push notifications as your gift makes its way to{' '}
          {order.recipientName}.
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 24,
    backgroundColor: '#FFF0F5',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeIcon: {
    fontSize: 16,
    color: '#666666',
  },
  statusIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusIcon: {
    fontSize: 32,
    fontWeight: '700',
  },
  statusLabel: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  statusDescription: {
    fontSize: 14,
    color: '#666666',
  },
  progressContainer: {
    padding: 20,
    backgroundColor: '#FFFFFF',
  },
  progressTrack: {
    height: 4,
    backgroundColor: '#EEEEEE',
    borderRadius: 2,
    marginBottom: 16,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FF6B6B',
    borderRadius: 2,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressLabelContainer: {
    alignItems: 'center',
  },
  progressDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#EEEEEE',
    marginBottom: 6,
  },
  progressDotActive: {
    backgroundColor: '#FF6B6B',
  },
  progressLabel: {
    fontSize: 11,
    color: '#999999',
  },
  productCard: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    marginRight: 16,
  },
  productInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  productName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  productDescription: {
    fontSize: 14,
    color: '#666666',
  },
  confirmationCard: {
    margin: 16,
    padding: 20,
    backgroundColor: '#FF6B6B',
    borderRadius: 16,
    alignItems: 'center',
  },
  confirmationLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#FFFFFF',
    opacity: 0.8,
    marginBottom: 8,
  },
  confirmationNumber: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 1,
    fontFamily: 'monospace',
  },
  detailsCard: {
    margin: 16,
    marginTop: 0,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 16,
  },
  detailRow: {
    marginBottom: 16,
  },
  detailLabel: {
    fontSize: 12,
    color: '#999999',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333333',
  },
  detailValueHighlight: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FF6B6B',
  },
  detailValueLink: {
    fontSize: 15,
    fontWeight: '500',
    color: '#5C6BC0',
  },
  messageCard: {
    margin: 16,
    marginTop: 0,
    padding: 20,
    backgroundColor: '#FFF0F5',
    borderRadius: 16,
    alignItems: 'center',
  },
  messageTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF6B6B',
    marginBottom: 12,
  },
  messageContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  messageQuote: {
    fontSize: 32,
    color: '#FF6B6B',
    marginRight: 4,
    marginTop: -8,
  },
  messageText: {
    flex: 1,
    fontSize: 16,
    fontStyle: 'italic',
    color: '#333333',
    lineHeight: 24,
    textAlign: 'center',
  },
  messageQuoteEnd: {
    fontSize: 32,
    color: '#FF6B6B',
    marginLeft: 4,
    alignSelf: 'flex-end',
    marginBottom: -8,
  },
  messageSender: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666666',
    marginTop: 12,
  },
  totalCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    margin: 16,
    marginTop: 0,
    padding: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  totalValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#4CAF50',
  },
  actionsContainer: {
    padding: 16,
  },
  primaryButton: {
    backgroundColor: '#FF6B6B',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  actionButtonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#333333',
    fontSize: 14,
    fontWeight: '600',
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: '#FF4444',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  cancelButtonText: {
    color: '#FF4444',
    fontSize: 14,
    fontWeight: '600',
  },
  noteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    padding: 16,
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    marginBottom: 32,
  },
  noteIcon: {
    fontSize: 20,
    color: '#4CAF50',
    marginRight: 12,
  },
  noteText: {
    flex: 1,
    fontSize: 13,
    color: '#2E7D32',
    lineHeight: 20,
  },
});

export default GiftOrderConfirmation;
