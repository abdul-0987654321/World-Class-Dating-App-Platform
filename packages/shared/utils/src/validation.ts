import { EMAIL_REGEX, PHONE_REGEX, PASSWORD_MIN_LENGTH } from '@flamoral/constants';

export const isValidEmail = (email: string): boolean => {
  return EMAIL_REGEX.test(email);
};

export const isValidPhone = (phone: string): boolean => {
  return PHONE_REGEX.test(phone);
};

export const isValidPassword = (password: string): boolean => {
  return password.length >= PASSWORD_MIN_LENGTH;
};

export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

export const sanitizeInput = (input: string): string => {
  return input.trim().replace(/[<>]/g, '');
};
