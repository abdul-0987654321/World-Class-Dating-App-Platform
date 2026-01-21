import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Share } from 'react-native';

interface Reservation {
  id: string;
  confirmationNumber: string;
  restaurantName: string;
  restaurantAddress: string;
  restaurantPhone?: string;
  imageUrl?: string;
  dateTime: string;
  partySize: number;
  specialRequests?: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  totalAmount?: number;
  currency?: string;
}

interface ReservationConfirmationProps {
  reservation: Reservation;
  onAddToCalendar?: () => void;
  onGetDirections?: () => void;
  onModify?: () => void;
  onCancel?: () => void;
  onClose?: () => void;
}

export const ReservationConfirmation: React.FC<ReservationConfirmationProps> = ({
  reservation,
  onAddToCalendar,
  onGetDirections,
  onModify,
  onCancel,
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

  const getStatusConfig = (status: Reservation['status']) => {
    switch (status) {
      case 'confirmed':
        return { color: '#4CAF50', icon: 'C', label: 'Confirmed' };
      case 'pending':
        return { color: '#FFA500', icon: 'P', label: 'Pending' };
      case 'completed':
        return { color: '#2196F3', icon: 'D', label: 'Completed' };
      case 'cancelled':
        return { color: '#FF4444', icon: 'X', label: 'Cancelled' };
      default:
        return { color: '#999999', icon: '?', label: 'Unknown' };
    }
  };

  const handleShare = async () => {
    const { date, time } = formatDateTime(reservation.dateTime);
    try {
      await Share.share({
        message: `Dinner reservation at ${reservation.restaurantName}\n\nDate: ${date}\nTime: ${time}\nParty size: ${reservation.partySize} guests\nConfirmation: ${reservation.confirmationNumber}\n\nAddress: ${reservation.restaurantAddress}`,
        title: `Reservation at ${reservation.restaurantName}`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const statusConfig = getStatusConfig(reservation.status);
  const { date, time } = formatDateTime(reservation.dateTime);

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
        <Text style={styles.headerTitle}>Reservation</Text>
      </View>

      {reservation.imageUrl && (
        <Image
          source={{ uri: reservation.imageUrl }}
          style={styles.restaurantImage}
          resizeMode="cover"
        />
      )}

      <View style={styles.restaurantInfo}>
        <Text style={styles.restaurantName}>{reservation.restaurantName}</Text>
        <Text style={styles.restaurantAddress}>{reservation.restaurantAddress}</Text>
        {reservation.restaurantPhone && (
          <Text style={styles.restaurantPhone}>{reservation.restaurantPhone}</Text>
        )}
      </View>

      <View style={styles.confirmationCard}>
        <Text style={styles.confirmationLabel}>Confirmation Number</Text>
        <Text style={styles.confirmationNumber}>{reservation.confirmationNumber}</Text>
      </View>

      <View style={styles.detailsCard}>
        <View style={styles.detailRow}>
          <View style={styles.detailIconContainer}>
            <Text style={styles.detailIcon}>D</Text>
          </View>
          <View style={styles.detailContent}>
            <Text style={styles.detailLabel}>Date</Text>
            <Text style={styles.detailValue}>{date}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.detailRow}>
          <View style={styles.detailIconContainer}>
            <Text style={styles.detailIcon}>T</Text>
          </View>
          <View style={styles.detailContent}>
            <Text style={styles.detailLabel}>Time</Text>
            <Text style={styles.detailValue}>{time}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.detailRow}>
          <View style={styles.detailIconContainer}>
            <Text style={styles.detailIcon}>P</Text>
          </View>
          <View style={styles.detailContent}>
            <Text style={styles.detailLabel}>Party Size</Text>
            <Text style={styles.detailValue}>
              {reservation.partySize} {reservation.partySize === 1 ? 'guest' : 'guests'}
            </Text>
          </View>
        </View>

        {reservation.specialRequests && (
          <>
            <View style={styles.divider} />
            <View style={styles.detailRow}>
              <View style={styles.detailIconContainer}>
                <Text style={styles.detailIcon}>N</Text>
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Special Requests</Text>
                <Text style={styles.detailValue}>{reservation.specialRequests}</Text>
              </View>
            </View>
          </>
        )}
      </View>

      {reservation.totalAmount && reservation.currency && (
        <View style={styles.paymentCard}>
          <Text style={styles.paymentLabel}>Prepaid Amount</Text>
          <Text style={styles.paymentAmount}>
            {new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: reservation.currency,
            }).format(reservation.totalAmount / 100)}
          </Text>
        </View>
      )}

      <View style={styles.actionsContainer}>
        <View style={styles.actionRow}>
          {onAddToCalendar && (
            <TouchableOpacity style={styles.actionButton} onPress={onAddToCalendar}>
              <View style={styles.actionIconContainer}>
                <Text style={styles.actionIcon}>C</Text>
              </View>
              <Text style={styles.actionText}>Add to Calendar</Text>
            </TouchableOpacity>
          )}

          {onGetDirections && (
            <TouchableOpacity style={styles.actionButton} onPress={onGetDirections}>
              <View style={styles.actionIconContainer}>
                <Text style={styles.actionIcon}>D</Text>
              </View>
              <Text style={styles.actionText}>Get Directions</Text>
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

      {reservation.status !== 'cancelled' && reservation.status !== 'completed' && (
        <View style={styles.manageContainer}>
          {onModify && (
            <TouchableOpacity style={styles.modifyButton} onPress={onModify}>
              <Text style={styles.modifyButtonText}>Modify Reservation</Text>
            </TouchableOpacity>
          )}

          {onCancel && (
            <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
              <Text style={styles.cancelButtonText}>Cancel Reservation</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <View style={styles.policyNote}>
        <Text style={styles.policyText}>
          Please arrive 10-15 minutes before your reservation time. Reservations may be released
          after 15 minutes past the booking time.
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
    backgroundColor: '#F8F9FA',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EEEEEE',
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
    fontSize: 14,
    fontWeight: '600',
    color: '#666666',
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  restaurantImage: {
    width: '100%',
    height: 180,
  },
  restaurantInfo: {
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  restaurantName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 8,
  },
  restaurantAddress: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 4,
  },
  restaurantPhone: {
    fontSize: 14,
    color: '#5C6BC0',
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
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 2,
    fontFamily: 'monospace',
  },
  detailsCard: {
    margin: 16,
    marginTop: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    overflow: 'hidden',
  },
  detailRow: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
  },
  detailIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FF6B6B20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  detailIcon: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF6B6B',
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: '#999999',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginLeft: 72,
  },
  paymentCard: {
    margin: 16,
    marginTop: 0,
    padding: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paymentLabel: {
    fontSize: 14,
    color: '#666666',
  },
  paymentAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4CAF50',
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
  manageContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  modifyButton: {
    backgroundColor: '#FF6B6B',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  modifyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: '#FF4444',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#FF4444',
    fontSize: 14,
    fontWeight: '600',
  },
  policyNote: {
    margin: 16,
    padding: 16,
    backgroundColor: '#FFF8E1',
    borderRadius: 12,
    marginBottom: 32,
  },
  policyText: {
    fontSize: 13,
    color: '#F57C00',
    lineHeight: 20,
    textAlign: 'center',
  },
});

export default ReservationConfirmation;
