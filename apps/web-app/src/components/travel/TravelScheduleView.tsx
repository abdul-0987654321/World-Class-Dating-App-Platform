import { authTokenService } from '@/services/auth-token.service';
import React, { useState, useEffect } from 'react';
import {
  Calendar,
  MapPin,
  Clock,
  Eye,
  Heart,
  Plus,
  Plane,
  X,
  Edit,
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';

interface TravelDestination {
  id: string;
  city: string;
  state?: string;
  country: string;
  country_code: string;
  start_date: string;
  end_date: string;
  status: 'scheduled' | 'active' | 'completed' | 'cancelled';
  is_active: boolean;
  show_on_profile: boolean;
  match_before_arrival: boolean;
  days_until_arrival?: number;
  days_remaining?: number;
  travel_notes?: string;
}

interface TravelScheduleViewProps {
  userId: string;
  onAddDestination: () => void;
  onEditDestination: (destination: TravelDestination) => void;
}

export const TravelScheduleView: React.FC<TravelScheduleViewProps> = ({
  userId,
  onAddDestination,
  onEditDestination,
}) => {
  const [destinations, setDestinations] = useState<TravelDestination[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDestinations();
  }, [userId]);

  const fetchDestinations = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/travel-mode/destinations', {
        headers: {
          Authorization: `Bearer ${await getAuthToken()}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setDestinations(data);
      }
    } catch (error) {
      console.error('Failed to fetch destinations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelDestination = async (destinationId: string) => {
    if (!confirm('Are you sure you want to cancel this trip?')) {
      return;
    }

    try {
      const response = await fetch(
        `/api/travel-mode/destinations/${destinationId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${await getAuthToken()}`,
          },
        }
      );

      if (response.ok) {
        fetchDestinations();
      } else {
        alert('Failed to cancel trip');
      }
    } catch (error) {
      console.error('Failed to cancel destination:', error);
      alert('Failed to cancel trip');
    }
  };

  const getAuthToken = async (): Promise<string> => {
    return authTokenService.getToken() || '';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-500" />
      </div>
    );
  }

  if (destinations.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-12 text-center">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Plane className="w-10 h-10 text-gray-400" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">
          No Travel Plans Yet
        </h3>
        <p className="text-gray-600 mb-6 max-w-md mx-auto">
          Add your first destination to start matching with people in different
          cities
        </p>
        <button
          onClick={onAddDestination}
          className="inline-flex items-center space-x-2 bg-red-500 text-white px-6 py-3 rounded-full hover:bg-red-600 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span className="font-semibold">Add Destination</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Your Travel Plans</h2>
        <button
          onClick={onAddDestination}
          className="inline-flex items-center space-x-2 bg-red-500 text-white px-4 py-2 rounded-full hover:bg-red-600 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span className="font-semibold">Add Destination</span>
        </button>
      </div>

      {destinations.map((destination) => {
        const startDate = new Date(destination.start_date);
        const endDate = new Date(destination.end_date);
        const duration = differenceInDays(endDate, startDate);

        return (
          <div
            key={destination.id}
            className={`bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow ${
              destination.is_active ? 'ring-2 ring-green-500' : ''
            }`}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center">
                  <MapPin className="w-6 h-6 text-red-500" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    {destination.city}
                    {destination.state && `, ${destination.state}`}
                  </h3>
                  <p className="text-gray-600">{destination.country}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {destination.is_active && (
                  <span className="px-3 py-1 bg-green-100 text-green-800 text-sm font-semibold rounded-full">
                    Active
                  </span>
                )}
                <span
                  className={`px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(
                    destination.status
                  )}`}
                >
                  {destination.status.charAt(0).toUpperCase() +
                    destination.status.slice(1)}
                </span>
              </div>
            </div>

            {/* Dates */}
            <div className="flex items-center space-x-4 mb-4 bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center space-x-2 flex-1">
                <Calendar className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="text-xs text-gray-500">Check-in</p>
                  <p className="font-semibold text-gray-900">
                    {format(startDate, 'MMM dd, yyyy')}
                  </p>
                </div>
              </div>
              <div className="text-gray-300">→</div>
              <div className="flex items-center space-x-2 flex-1">
                <Calendar className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="text-xs text-gray-500">Check-out</p>
                  <p className="font-semibold text-gray-900">
                    {format(endDate, 'MMM dd, yyyy')}
                  </p>
                </div>
              </div>
            </div>

            {/* Info */}
            <div className="flex flex-wrap gap-4 mb-4">
              <div className="flex items-center space-x-2 text-gray-600">
                <Clock className="w-4 h-4" />
                <span className="text-sm">{duration} days</span>
              </div>

              {destination.days_until_arrival !== undefined &&
                destination.days_until_arrival > 0 && (
                  <div className="flex items-center space-x-2 text-gray-600">
                    <Plane className="w-4 h-4" />
                    <span className="text-sm">
                      Arrives in {destination.days_until_arrival} days
                    </span>
                  </div>
                )}

              {destination.days_remaining !== undefined &&
                destination.days_remaining > 0 && (
                  <div className="flex items-center space-x-2 text-gray-600">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm">
                      {destination.days_remaining} days remaining
                    </span>
                  </div>
                )}
            </div>

            {/* Notes */}
            {destination.travel_notes && (
              <p className="text-gray-600 italic mb-4">
                "{destination.travel_notes}"
              </p>
            )}

            {/* Badges and Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              <div className="flex flex-wrap gap-2">
                {destination.show_on_profile && (
                  <span className="inline-flex items-center space-x-1 bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm">
                    <Eye className="w-3 h-3" />
                    <span>Visible on profile</span>
                  </span>
                )}
                {destination.match_before_arrival && (
                  <span className="inline-flex items-center space-x-1 bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm">
                    <Heart className="w-3 h-3" />
                    <span>Early matching</span>
                  </span>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => onEditDestination(destination)}
                  className="p-2 text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <Edit className="w-5 h-5" />
                </button>
                {destination.status === 'scheduled' && (
                  <button
                    onClick={() => handleCancelDestination(destination.id)}
                    className="px-4 py-2 text-red-600 border border-red-600 rounded-lg hover:bg-red-50 transition-colors text-sm font-semibold"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
