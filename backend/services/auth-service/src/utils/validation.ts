/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength
 * SECURITY: Must contain uppercase, lowercase, number, special char, min 12 chars
 * Production-grade password policy for a dating platform handling sensitive personal data
 */
export function isValidPassword(password: string): boolean {
  const minLength = 12;
  const maxLength = 128; // Prevent DoS via bcrypt with extremely long passwords
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

  return (
    password.length >= minLength &&
    password.length <= maxLength &&
    hasUppercase &&
    hasLowercase &&
    hasNumber &&
    hasSpecialChar
  );
}

/**
 * Validate that user is at least 18 years old
 */
export function isValidAge(dateOfBirth: string | Date): boolean {
  const dob = new Date(dateOfBirth);
  const today = new Date();
  const minAge = 18;

  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }

  return age >= minAge;
}

/**
 * Validate phone number format
 */
export function isValidPhoneNumber(phone: string): boolean {
  // Allow international format with optional + prefix
  const phoneRegex = /^\+?[1-9]\d{6,14}$/;
  return phoneRegex.test(phone.replace(/[\s-]/g, ''));
}
