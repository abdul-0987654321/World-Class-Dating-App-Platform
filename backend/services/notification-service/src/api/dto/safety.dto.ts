/**
 * Date Safety Guardian DTOs
 * Data Transfer Objects for safety endpoints with validation
 */

// ============================================
// TRUSTED CONTACT DTOs
// ============================================

/**
 * DTO for creating a new trusted contact
 */
export interface CreateTrustedContactDto {
  name: string;
  phone: string;
  email?: string;
  relationship: 'friend' | 'family' | 'other';
  priority?: number; // 1 = primary, 2-5 = backup
}

/**
 * Validation for CreateTrustedContactDto
 */
export function validateCreateTrustedContactDto(dto: any): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!dto.name || typeof dto.name !== 'string' || dto.name.trim().length < 1) {
    errors.push('Name is required and must be a non-empty string');
  }

  if (!dto.phone || typeof dto.phone !== 'string') {
    errors.push('Phone is required and must be a string');
  } else if (!/^\+?[1-9]\d{7,14}$/.test(dto.phone.replace(/[\s\-\(\)]/g, ''))) {
    errors.push('Phone must be a valid phone number (E.164 format recommended)');
  }

  if (dto.email !== undefined && dto.email !== null) {
    if (typeof dto.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dto.email)) {
      errors.push('Email must be a valid email address');
    }
  }

  const validRelationships = ['friend', 'family', 'other'];
  if (!dto.relationship || !validRelationships.includes(dto.relationship)) {
    errors.push(`Relationship must be one of: ${validRelationships.join(', ')}`);
  }

  if (dto.priority !== undefined && dto.priority !== null) {
    if (typeof dto.priority !== 'number' || dto.priority < 1 || dto.priority > 5) {
      errors.push('Priority must be a number between 1 and 5');
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * DTO for verifying a trusted contact
 */
export interface VerifyContactDto {
  verificationCode: string;
}

/**
 * Validation for VerifyContactDto
 */
export function validateVerifyContactDto(dto: any): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!dto.verificationCode || typeof dto.verificationCode !== 'string' || dto.verificationCode.length < 4) {
    errors.push('Verification code is required and must be at least 4 characters');
  }

  return { valid: errors.length === 0, errors };
}

// ============================================
// DATE SESSION DTOs
// ============================================

/**
 * DTO for venue information
 */
export interface VenueInfoDto {
  name: string;
  address: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  type: 'restaurant' | 'bar' | 'cafe' | 'public_space' | 'other';
}

/**
 * DTO for creating a new date session
 */
export interface CreateDateSessionDto {
  matchId: string;
  matchName: string;
  scheduledAt: string; // ISO 8601 date string
  venue?: VenueInfoDto;
  checkInIntervalMinutes?: number; // Default: 30 minutes
}

/**
 * Validation for CreateDateSessionDto
 */
export function validateCreateDateSessionDto(dto: any): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!dto.matchId || typeof dto.matchId !== 'string' || dto.matchId.trim().length < 1) {
    errors.push('Match ID is required');
  }

  if (!dto.matchName || typeof dto.matchName !== 'string' || dto.matchName.trim().length < 1) {
    errors.push('Match name is required');
  }

  if (!dto.scheduledAt || typeof dto.scheduledAt !== 'string') {
    errors.push('Scheduled date is required');
  } else {
    const scheduledDate = new Date(dto.scheduledAt);
    if (isNaN(scheduledDate.getTime())) {
      errors.push('Scheduled date must be a valid ISO 8601 date string');
    }
  }

  if (dto.venue !== undefined && dto.venue !== null) {
    const venueValidation = validateVenueInfoDto(dto.venue);
    if (!venueValidation.valid) {
      errors.push(...venueValidation.errors.map(e => `Venue: ${e}`));
    }
  }

  if (dto.checkInIntervalMinutes !== undefined && dto.checkInIntervalMinutes !== null) {
    if (typeof dto.checkInIntervalMinutes !== 'number' ||
        dto.checkInIntervalMinutes < 5 ||
        dto.checkInIntervalMinutes > 120) {
      errors.push('Check-in interval must be between 5 and 120 minutes');
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validation for VenueInfoDto
 */
export function validateVenueInfoDto(dto: any): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!dto.name || typeof dto.name !== 'string' || dto.name.trim().length < 1) {
    errors.push('Venue name is required');
  }

  if (!dto.address || typeof dto.address !== 'string' || dto.address.trim().length < 1) {
    errors.push('Venue address is required');
  }

  if (dto.coordinates !== undefined && dto.coordinates !== null) {
    if (typeof dto.coordinates.latitude !== 'number' ||
        dto.coordinates.latitude < -90 ||
        dto.coordinates.latitude > 90) {
      errors.push('Latitude must be a number between -90 and 90');
    }
    if (typeof dto.coordinates.longitude !== 'number' ||
        dto.coordinates.longitude < -180 ||
        dto.coordinates.longitude > 180) {
      errors.push('Longitude must be a number between -180 and 180');
    }
  }

  const validVenueTypes = ['restaurant', 'bar', 'cafe', 'public_space', 'other'];
  if (!dto.type || !validVenueTypes.includes(dto.type)) {
    errors.push(`Venue type must be one of: ${validVenueTypes.join(', ')}`);
  }

  return { valid: errors.length === 0, errors };
}

/**
 * DTO for check-in during a date
 */
export interface CheckInDto {
  safetyRating?: number; // 1-5 scale
  notes?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
}

/**
 * Validation for CheckInDto
 */
export function validateCheckInDto(dto: any): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (dto.safetyRating !== undefined && dto.safetyRating !== null) {
    if (typeof dto.safetyRating !== 'number' || dto.safetyRating < 1 || dto.safetyRating > 5) {
      errors.push('Safety rating must be a number between 1 and 5');
    }
  }

  if (dto.notes !== undefined && dto.notes !== null) {
    if (typeof dto.notes !== 'string' || dto.notes.length > 500) {
      errors.push('Notes must be a string with maximum 500 characters');
    }
  }

  if (dto.location !== undefined && dto.location !== null) {
    if (typeof dto.location.latitude !== 'number' ||
        dto.location.latitude < -90 ||
        dto.location.latitude > 90) {
      errors.push('Location latitude must be a number between -90 and 90');
    }
    if (typeof dto.location.longitude !== 'number' ||
        dto.location.longitude < -180 ||
        dto.location.longitude > 180) {
      errors.push('Location longitude must be a number between -180 and 180');
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * DTO for triggering a panic alert
 */
export interface PanicAlertDto {
  currentLocation?: {
    latitude: number;
    longitude: number;
  };
  silentMode?: boolean; // If true, no visual/audio feedback on device
  message?: string; // Optional custom message to trusted contacts
}

/**
 * Validation for PanicAlertDto
 */
export function validatePanicAlertDto(dto: any): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (dto.currentLocation !== undefined && dto.currentLocation !== null) {
    if (typeof dto.currentLocation.latitude !== 'number' ||
        dto.currentLocation.latitude < -90 ||
        dto.currentLocation.latitude > 90) {
      errors.push('Location latitude must be a number between -90 and 90');
    }
    if (typeof dto.currentLocation.longitude !== 'number' ||
        dto.currentLocation.longitude < -180 ||
        dto.currentLocation.longitude > 180) {
      errors.push('Location longitude must be a number between -180 and 180');
    }
  }

  if (dto.silentMode !== undefined && dto.silentMode !== null) {
    if (typeof dto.silentMode !== 'boolean') {
      errors.push('Silent mode must be a boolean');
    }
  }

  if (dto.message !== undefined && dto.message !== null) {
    if (typeof dto.message !== 'string' || dto.message.length > 200) {
      errors.push('Message must be a string with maximum 200 characters');
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * DTO for ending a date session
 */
export interface EndDateSessionDto {
  safetyRating?: number; // 1-5 scale, final rating of the date
}

/**
 * Validation for EndDateSessionDto
 */
export function validateEndDateSessionDto(dto: any): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (dto.safetyRating !== undefined && dto.safetyRating !== null) {
    if (typeof dto.safetyRating !== 'number' || dto.safetyRating < 1 || dto.safetyRating > 5) {
      errors.push('Safety rating must be a number between 1 and 5');
    }
  }

  return { valid: errors.length === 0, errors };
}

// ============================================
// RESPONSE DTOs
// ============================================

export interface SafetyApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  errors?: string[];
}

export interface TrustedContactResponse {
  id: string;
  name: string;
  phone: string;
  email?: string;
  relationship: 'friend' | 'family' | 'other';
  priority: number;
  isVerified: boolean;
  verifiedAt?: string;
  createdAt: string;
}

export interface DateSessionResponse {
  id: string;
  matchId: string;
  matchName: string;
  status: string;
  venue?: VenueInfoDto;
  scheduledAt: string;
  startedAt?: string;
  endedAt?: string;
  checkInIntervalMinutes: number;
  lastCheckInAt?: string;
  missedCheckIns: number;
  safetyRating?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
