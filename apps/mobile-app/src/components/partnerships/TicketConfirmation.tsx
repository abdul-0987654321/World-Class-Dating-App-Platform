import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Share,
} from 'react-native';

interface Ticket {
  ticketType: string;
  seatSection?: string;
  seatRow?: string;
  seatNumber?: string;
  price: number;
}

interface TicketPurchase {
  id: string;
  confirmationNumber: string;
  eventName: string;
  venueName: string;
  venueAddress: string;
  imageUrl?: string;
  eventDateTime: string;
  tickets: Ticket[];
  totalAmount: number;
  currency: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'refunded';
  qrCode?: string;
  barcode?: string;
}

interface TicketConfirmationProps {
  purchase: TicketPurchase;
  onAddToCalendar?: () => void;
  onGetDirections?: () => void;
  onViewTickets?: () => void;
  onRefund?: () => void;
  onClose?: () => void;
}

export const TicketConfirmation: React.FC<TicketConfirmationProps> = ({
  purchase,
  onAddToCalendar,
  onGetDirections,
  onViewTickets,
  onRefund,
  onClose,
}) => {
  const formatDateTime = (dateString: string): { date: string; time: string } => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }),
      time: date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }),
    };
  };

  const formatPrice = (amount: number, currency: string): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount / 100);
  };

  const getStatusConfig = (status: TicketPurchase['status']) => {
    switch (status) {
      case 'confirmed':
        return { color: '#4CAF50', icon: 'C', label: 'Confirmed' };
      case 'pending':
        return { color: '#FFA500', icon: 'P', label: 'Processing' };
      case 'completed':
        return { color: '#2196F3', icon: 'D', label: 'Completed' };
      case 'cancelled':
        return { color: '#FF4444', icon: 'X', label: 'Cancelled' };
      case 'refunded':
        return { color: '#9C27B0', icon: 'R', label: 'Refunded' };
      default:
        return { color: '#999999', icon: '?', label: 'Unknown' };
    }
  };

  const handleShare = async () => {
    const { date, time } = formatDateTime(purchase.eventDateTime);
    try {
      await Share.share({
        message: `I'm going to ${purchase.eventName}!\n\nDate: ${date}\nTime: ${time}\nVenue: ${purchase.venueName}\n\nConfirmation: ${purchase.confirmationNumber}`,
        title: `Tickets to ${purchase.eventName}`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const statusConfig = getStatusConfig(purchase.status);
  const { date, time } = formatDateTime(purchase.eventDateTime);
  const ticketCount = purchase.tickets.length;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        {onClose && (
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeIcon}>X</Text>
          </TouchableOpacity>
        )}

        <View
          style={[
            styles.statusIconContainer,
            { backgroundColor: statusConfig.color + '20' },
          ]}
        >
          <Text style={[styles.statusIcon, { color: statusConfig.color }]}>
            {statusConfig.icon}
          </Text>
        </View>

        <Text style={styles.statusLabel}>{statusConfig.label}</Text>
        <Text style={styles.headerTitle}>
          {ticketCount} {ticketCount === 1 ? 'Ticket' : 'Tickets'}
        </Text>
      </View>

      {purchase.imageUrl && (
        <Image
          source={{ uri: purchase.imageUrl }}
          style={styles.eventImage}
          resizeMode="cover"
        />
      )}

      <View style={styles.eventInfo}>
        <Text style={styles.eventName}>{purchase.eventName}</Text>
        <Text style={styles.venueName}>{purchase.venueName}</Text>
        <Text style={styles.venueAddress}>{purchase.venueAddress}</Text>
      </View>

      <View style={styles.confirmationCard}>
        <Text style={styles.confirmationLabel}>Order Confirmation</Text>
        <Text style={styles.confirmationNumber}>
          {purchase.confirmationNumber}
        </Text>
      </View>

      <View style={styles.dateTimeCard}>
        <View style={styles.dateTimeSection}>
          <Text style={styles.dateTimeLabel}>DATE</Text>
          <Text style={styles.dateTimeValue}>{date}</Text>
        </View>
        <View style={styles.dateTimeDivider} />
        <View style={styles.dateTimeSection}>
          <Text style={styles.dateTimeLabel}>TIME</Text>
          <Text style={styles.dateTimeValue}>{time}</Text>
        </View>
      </View>

      <View style={styles.ticketsCard}>
        <Text style={styles.sectionTitle}>Your Tickets</Text>
        {purchase.tickets.map((ticket, index) => (
          <View key={index} style={styles.ticketRow}>
            <View style={styles.ticketInfo}>
              <Text style={styles.ticketType}>{ticket.ticketType}</Text>
              {ticket.seatSection && (
                <Text style={styles.seatInfo}>
                  Section {ticket.seatSection}
                  {ticket.seatRow && `, Row ${ticket.seatRow}`}
                  {ticket.seatNumber && `, Seat ${ticket.seatNumber}`}
                </Text>
              )}
            </View>
            <Text style={styles.ticketPrice}>
              {formatPrice(ticket.price, purchase.currency)}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.totalCard}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Subtotal</Text>
          <Text style={styles.totalValue}>
            {formatPrice(
              purchase.tickets.reduce((sum, t) => sum + t.price, 0),
              purchase.currency
            )}
          </Text>
        </View>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Fees</Text>
          <Text style={styles.totalValue}>
            {formatPrice(
              purchase.totalAmount -
                purchase.tickets.reduce((sum, t) => sum + t.price, 0),
              purchase.currency
            )}
          </Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.totalRow}>
          <Text style={styles.grandTotalLabel}>Total Paid</Text>
          <Text style={styles.grandTotalValue}>
            {formatPrice(purchase.totalAmount, purchase.currency)}
          </Text>
        </View>
      </View>

      {purchase.status === 'confirmed' && (
        <TouchableOpacity style={styles.viewTicketsButton} onPress={onViewTickets}>
          <View style={styles.qrIconContainer}>
            <Text style={styles.qrIcon}>QR</Text>
          </View>
          <View style={styles.viewTicketsContent}>
            <Text style={styles.viewTicketsTitle}>View Mobile Tickets</Text>
            <Text style={styles.viewTicketsSubtitle}>
              Show this at the venue entrance
            </Text>
          </View>
          <Text style={styles.viewTicketsArrow}>{'>'}</Text>
        </TouchableOpacity>
      )}

      <View style={styles.actionsContainer}>
        <View style={styles.actionRow}>
          {onAddToCalendar && (
            <TouchableOpacity style={styles.actionButton} onPress={onAddToCalendar}>
              <View style={styles.actionIconContainer}>
                <Text style={styles.actionIcon}>C</Text>
              </View>
              <Text style={styles.actionText}>Calendar</Text>
            </TouchableOpacity>
          )}

          {onGetDirections && (
            <TouchableOpacity style={styles.actionButton} onPress={onGetDirections}>
              <View style={styles.actionIconContainer}>
                <Text style={styles.actionIcon}>D</Text>
              </View>
              <Text style={styles.actionText}>Directions</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
            <View style={styles.actionIconContainer}>
              <Text style={styles.actionIcon}>S</Text>
            </View>
            <Text style={styles.actionText}>Share</Text>
          </TouchableOpacity>
        </View>
      </View>

      {purchase.status === 'confirmed' && onRefund && (
        <View style={styles.refundContainer}>
          <TouchableOpacity style={styles.refundButton} onPress={onRefund}>
            <Text style={styles.refundButtonText}>Request Refund</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.infoNote}>
        <Text style={styles.infoTitle}>Important Information</Text>
        <Text style={styles.infoText}>
          - Tickets will be available 24 hours before the event{'\n'}
          - Please arrive 30 minutes early for entry{'\n'}
          - Screenshot your tickets in case of connectivity issues{'\n'}
          - Tickets are non-transferable
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
    backgroundColor: '#1A1A2E',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeIcon: {
    fontSize: 16,
    color: '#FFFFFF',
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
    fontSize: 14,
    fontWeight: '600',
    color: '#B4B4C7',
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  eventImage: {
    width: '100%',
    height: 200,
  },
  eventInfo: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  eventName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 8,
  },
  venueName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 4,
  },
  venueAddress: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
  },
  confirmationCard: {
    margin: 16,
    padding: 20,
    backgroundColor: '#5C6BC0',
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
  dateTimeCard: {
    flexDirection: 'row',
    margin: 16,
    marginTop: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    overflow: 'hidden',
  },
  dateTimeSection: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
  },
  dateTimeDivider: {
    width: 1,
    backgroundColor: '#EEEEEE',
  },
  dateTimeLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#999999',
    letterSpacing: 1,
    marginBottom: 8,
  },
  dateTimeValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    textAlign: 'center',
  },
  ticketsCard: {
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
  ticketRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  ticketInfo: {
    flex: 1,
  },
  ticketType: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  seatInfo: {
    fontSize: 13,
    color: '#666666',
  },
  ticketPrice: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
    marginLeft: 16,
  },
  totalCard: {
    margin: 16,
    marginTop: 0,
    padding: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  totalLabel: {
    fontSize: 14,
    color: '#666666',
  },
  totalValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333333',
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 12,
  },
  grandTotalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  grandTotalValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#4CAF50',
  },
  viewTicketsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    marginTop: 0,
    padding: 16,
    backgroundColor: '#1A1A2E',
    borderRadius: 16,
  },
  qrIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  qrIcon: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  viewTicketsContent: {
    flex: 1,
  },
  viewTicketsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  viewTicketsSubtitle: {
    fontSize: 13,
    color: '#B4B4C7',
  },
  viewTicketsArrow: {
    fontSize: 18,
    color: '#B4B4C7',
  },
  actionsContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  actionButton: {
    alignItems: 'center',
  },
  actionIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionIcon: {
    fontSize: 20,
    color: '#5C6BC0',
  },
  actionText: {
    fontSize: 12,
    color: '#666666',
    fontWeight: '500',
  },
  refundContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  refundButton: {
    borderWidth: 1,
    borderColor: '#FF4444',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  refundButtonText: {
    color: '#FF4444',
    fontSize: 14,
    fontWeight: '600',
  },
  infoNote: {
    margin: 16,
    padding: 16,
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    marginBottom: 32,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1976D2',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#1976D2',
    lineHeight: 22,
  },
});

export default TicketConfirmation;
