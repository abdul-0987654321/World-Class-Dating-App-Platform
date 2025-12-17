import React, { useState, useEffect } from 'react';
import { Plane, MapPin } from 'lucide-react';

interface TravelModeToggleProps {
  userId: string;
  onToggle?: (enabled: boolean) => void;
}

export const TravelModeToggle: React.FC<TravelModeToggleProps> = ({
  userId,
  onToggle,
}) => {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isTraveling, setIsTraveling] = useState(false);

  useEffect(() => {
    fetchTravelModeStatus();
  }, [userId]);

  const fetchTravelModeStatus = async () => {
    try {
      const response = await fetch('/api/v1/travel-mode/status', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setEnabled(data.settings.travel_mode_enabled);
        setIsTraveling(data.is_traveling);
      }
    } catch (error) {
      console.error('Failed to fetch travel mode status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async () => {
    const newValue = !enabled;

    try {
      const response = await fetch('/api/v1/travel-mode/settings', {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          travel_mode_enabled: newValue,
        }),
      });

      if (response.ok) {
        setEnabled(newValue);
        onToggle?.(newValue);
      } else {
        alert('Failed to update travel mode settings');
      }
    } catch (error) {
      console.error('Failed to toggle travel mode:', error);
      alert('Failed to update travel mode');
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-2/3"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div
            className={`w-12 h-12 rounded-full flex items-center justify-center ${
              enabled ? 'bg-red-50' : 'bg-gray-100'
            }`}
          >
            <Plane
              className={`w-6 h-6 ${enabled ? 'text-red-500' : 'text-gray-400'}`}
            />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Travel Mode</h3>
            <p className="text-sm text-gray-600">
              {isTraveling
                ? 'Currently traveling'
                : 'Find matches in different locations'}
            </p>
          </div>
        </div>

        <button
          onClick={handleToggle}
          className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
            enabled ? 'bg-red-500' : 'bg-gray-300'
          }`}
        >
          <span
            className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
              enabled ? 'translate-x-7' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {isTraveling && (
        <div className="mt-4 flex items-center space-x-2 bg-red-50 px-4 py-2 rounded-lg">
          <MapPin className="w-4 h-4 text-red-500" />
          <span className="text-sm font-medium text-red-700">Traveling</span>
        </div>
      )}
    </div>
  );
};
