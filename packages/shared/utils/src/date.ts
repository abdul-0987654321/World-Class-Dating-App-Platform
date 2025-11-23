import { differenceInYears, format, formatDistanceToNow } from 'date-fns';

export const calculateAge = (dateOfBirth: string | Date): number => {
  return differenceInYears(new Date(), new Date(dateOfBirth));
};

export const isAgeValid = (dateOfBirth: string | Date, minAge: number = 18): boolean => {
  return calculateAge(dateOfBirth) >= minAge;
};

export const formatDate = (date: string | Date, formatString: string = 'PPP'): string => {
  return format(new Date(date), formatString);
};

export const formatTimeAgo = (date: string | Date): string => {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
};

export const formatLastSeen = (date: string | Date): string => {
  const now = new Date();
  const then = new Date(date);
  const diffMinutes = Math.floor((now.getTime() - then.getTime()) / 1000 / 60);

  if (diffMinutes < 1) return 'Active now';
  if (diffMinutes < 60) return `Active ${diffMinutes}m ago`;
  if (diffMinutes < 1440) return `Active ${Math.floor(diffMinutes / 60)}h ago`;
  return `Active ${Math.floor(diffMinutes / 1440)}d ago`;
};
