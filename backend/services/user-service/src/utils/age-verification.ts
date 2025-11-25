/**
 * Age Verification Utilities
 *
 * Provides functions to validate user age and ensure compliance
 * with 18+ requirement for dating app usage.
 */

export const MINIMUM_AGE = 18;
export const MAXIMUM_AGE = 100; // Reasonable upper limit

/**
 * Calculate age from date of birth
 */
export function calculateAge(dateOfBirth: Date | string): number {
  const dob = typeof dateOfBirth === 'string' ? new Date(dateOfBirth) : dateOfBirth;
  const today = new Date();

  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();

  // Adjust if birthday hasn't occurred this year yet
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }

  return age;
}

/**
 * Check if date of birth meets minimum age requirement
 */
export function isAgeEligible(dateOfBirth: Date | string): boolean {
  const age = calculateAge(dateOfBirth);
  return age >= MINIMUM_AGE && age <= MAXIMUM_AGE;
}

/**
 * Validate date of birth format and value
 */
export function isValidDateOfBirth(dateOfBirth: Date | string): boolean {
  try {
    const dob = typeof dateOfBirth === 'string' ? new Date(dateOfBirth) : dateOfBirth;

    // Check if valid date
    if (isNaN(dob.getTime())) {
      return false;
    }

    // Check if date is not in the future
    if (dob > new Date()) {
      return false;
    }

    // Check if date is not too far in the past (older than 120 years)
    const minDate = new Date();
    minDate.setFullYear(minDate.getFullYear() - 120);
    if (dob < minDate) {
      return false;
    }

    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Get the minimum allowed date of birth (18 years ago)
 */
export function getMinimumDateOfBirth(): Date {
  const date = new Date();
  date.setFullYear(date.getFullYear() - MINIMUM_AGE);
  return date;
}

/**
 * Get the maximum allowed date of birth (100 years ago)
 */
export function getMaximumDateOfBirth(): Date {
  const date = new Date();
  date.setFullYear(date.getFullYear() - MAXIMUM_AGE);
  return date;
}

/**
 * Format date of birth for display
 */
export function formatDateOfBirth(dateOfBirth: Date | string): string {
  const dob = typeof dateOfBirth === 'string' ? new Date(dateOfBirth) : dateOfBirth;
  return dob.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Comprehensive age verification check with detailed error
 */
export function verifyAge(dateOfBirth: Date | string): {
  valid: boolean;
  age?: number;
  error?: string;
} {
  // Validate date format
  if (!isValidDateOfBirth(dateOfBirth)) {
    return {
      valid: false,
      error: 'Invalid date of birth format or value',
    };
  }

  const age = calculateAge(dateOfBirth);

  // Check minimum age
  if (age < MINIMUM_AGE) {
    return {
      valid: false,
      age,
      error: `You must be at least ${MINIMUM_AGE} years old to use this service`,
    };
  }

  // Check maximum age (sanity check)
  if (age > MAXIMUM_AGE) {
    return {
      valid: false,
      age,
      error: 'Invalid date of birth - age exceeds reasonable limit',
    };
  }

  return {
    valid: true,
    age,
  };
}

/**
 * Generate age range for display (e.g., "25-30")
 */
export function getAgeRange(age: number, rangeSize: number = 5): string {
  const lowerBound = Math.floor(age / rangeSize) * rangeSize;
  const upperBound = lowerBound + rangeSize - 1;
  return `${lowerBound}-${upperBound}`;
}

export default {
  MINIMUM_AGE,
  MAXIMUM_AGE,
  calculateAge,
  isAgeEligible,
  isValidDateOfBirth,
  getMinimumDateOfBirth,
  getMaximumDateOfBirth,
  formatDateOfBirth,
  verifyAge,
  getAgeRange,
};
