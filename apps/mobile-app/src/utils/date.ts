/**
 * Date and time utilities
 */

export const formatMessageTime = (timestamp: number): string => {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) {
    return 'Just now';
  } else if (minutes < 60) {
    return `${minutes}m ago`;
  } else if (hours < 24) {
    return `${hours}h ago`;
  } else if (days < 7) {
    return `${days}d ago`;
  } else {
    const date = new Date(timestamp);
    return date.toLocaleDateString();
  }
};

export const formatDistance = (meters: number): string => {
  if (meters < 1000) {
    return `${Math.round(meters)}m away`;
  } else {
    const km = meters / 1000;
    return `${km.toFixed(1)}km away`;
  }
};

export const calculateAge = (birthdate: Date): number => {
  const today = new Date();
  let age = today.getFullYear() - birthdate.getFullYear();
  const monthDiff = today.getMonth() - birthdate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthdate.getDate())) {
    age--;
  }

  return age;
};

export const formatDateOfBirth = (date: Date): string => {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

export const getTimeOfDay = (): 'morning' | 'afternoon' | 'evening' | 'night' => {
  const hour = new Date().getHours();

  if (hour >= 5 && hour < 12) {
    return 'morning';
  } else if (hour >= 12 && hour < 17) {
    return 'afternoon';
  } else if (hour >= 17 && hour < 21) {
    return 'evening';
  } else {
    return 'night';
  }
};

export const getGreeting = (): string => {
  const timeOfDay = getTimeOfDay();
  const greetings = {
    morning: 'Good morning',
    afternoon: 'Good afternoon',
    evening: 'Good evening',
    night: 'Good evening',
  };
  return greetings[timeOfDay];
};

export const isToday = (timestamp: number): boolean => {
  const today = new Date();
  const date = new Date(timestamp);

  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
};

export const isYesterday = (timestamp: number): boolean => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const date = new Date(timestamp);

  return (
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear()
  );
};

export const formatChatTimestamp = (timestamp: number): string => {
  if (isToday(timestamp)) {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  } else if (isYesterday(timestamp)) {
    return 'Yesterday';
  } else {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  }
};

export default {
  formatMessageTime,
  formatDistance,
  calculateAge,
  formatDateOfBirth,
  getTimeOfDay,
  getGreeting,
  isToday,
  isYesterday,
  formatChatTimestamp,
};
