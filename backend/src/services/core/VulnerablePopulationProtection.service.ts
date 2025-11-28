/**
 * Vulnerable Population Protection Service
 * Handles protection for vulnerable users including:
 * - Age verification and underage detection
 * - Wellbeing detection and crisis resources
 * - Exploitation detection
 * - Mental health support resources
 */

import { SafetyRepository } from '../../repositories/Safety.repository';
import { UserRepository } from '../../repositories';
import { logger } from '../../utils/logger';
import {
  AgeVerificationCheck,
  AgeVerificationMethod,
  WellbeingSignal,
  WellbeingSignalType,
  WellbeingSignalStatus,
  CrisisResourceShown,
  CrisisResourceType,
} from '../../models/Safety.model';

interface CrisisResource {
  type: CrisisResourceType;
  name: string;
  contact: string;
  country: string;
  description: string;
  hours: string;
  website?: string;
}

interface WellbeingAnalysisResult {
  signalDetected: boolean;
  signalType?: WellbeingSignalType;
  confidence: number;
  suggestedResources: CrisisResourceType[];
  requiresImmediateAttention: boolean;
}

export class VulnerablePopulationProtectionService {
  private safetyRepo: SafetyRepository;
  private userRepo: UserRepository;

  // Crisis keywords for detection
  private readonly DISTRESS_KEYWORDS = [
    'depressed', 'depression', 'hopeless', 'worthless', 'empty',
    'alone', 'lonely', 'no one cares', 'nobody cares', 'give up',
    'can\'t go on', 'can\'t take it', 'end it all', 'no point',
  ];

  private readonly SELF_HARM_KEYWORDS = [
    'hurt myself', 'self harm', 'cutting', 'suicide', 'kill myself',
    'end my life', 'want to die', 'better off dead', 'suicidal',
    'overdose', 'not worth living',
  ];

  private readonly CRISIS_KEYWORDS = [
    'emergency', 'help me', 'scared', 'afraid', 'dangerous',
    'threatened', 'beaten', 'abused', 'raped', 'assault',
    'trafficking', 'forced', 'trapped', 'escape',
  ];

  private readonly EXPLOITATION_KEYWORDS = [
    'underage', 'minor', 'young', 'school', 'high school',
    'parent', 'pay for', 'money for', 'send money',
  ];

  // Crisis resources by country
  private readonly CRISIS_RESOURCES: CrisisResource[] = [
    // USA
    {
      type: 'suicide_hotline',
      name: 'National Suicide Prevention Lifeline',
      contact: '988',
      country: 'US',
      description: '24/7 crisis support for people in distress',
      hours: '24/7',
      website: 'https://988lifeline.org',
    },
    {
      type: 'crisis_text_line',
      name: 'Crisis Text Line',
      contact: 'Text HOME to 741741',
      country: 'US',
      description: 'Free 24/7 crisis support via text message',
      hours: '24/7',
      website: 'https://www.crisistextline.org',
    },
    {
      type: 'domestic_violence',
      name: 'National Domestic Violence Hotline',
      contact: '1-800-799-7233',
      country: 'US',
      description: 'Support for victims of domestic violence',
      hours: '24/7',
      website: 'https://www.thehotline.org',
    },
    {
      type: 'sexual_assault',
      name: 'RAINN National Sexual Assault Hotline',
      contact: '1-800-656-4673',
      country: 'US',
      description: 'Support for survivors of sexual violence',
      hours: '24/7',
      website: 'https://www.rainn.org',
    },
    {
      type: 'human_trafficking',
      name: 'National Human Trafficking Hotline',
      contact: '1-888-373-7888',
      country: 'US',
      description: 'Support for victims of human trafficking',
      hours: '24/7',
      website: 'https://humantraffickinghotline.org',
    },
    {
      type: 'mental_health',
      name: 'SAMHSA National Helpline',
      contact: '1-800-662-4357',
      country: 'US',
      description: 'Mental health and substance abuse treatment referrals',
      hours: '24/7',
      website: 'https://www.samhsa.gov/find-help/national-helpline',
    },
    // UK
    {
      type: 'suicide_hotline',
      name: 'Samaritans',
      contact: '116 123',
      country: 'UK',
      description: 'Emotional support for anyone in distress',
      hours: '24/7',
      website: 'https://www.samaritans.org',
    },
    {
      type: 'domestic_violence',
      name: 'National Domestic Abuse Helpline',
      contact: '0808 2000 247',
      country: 'UK',
      description: 'Support for victims of domestic abuse',
      hours: '24/7',
      website: 'https://www.nationaldahelpline.org.uk',
    },
    // Canada
    {
      type: 'suicide_hotline',
      name: 'Crisis Services Canada',
      contact: '1-833-456-4566',
      country: 'CA',
      description: 'National crisis support',
      hours: '24/7',
      website: 'https://www.crisisservicescanada.ca',
    },
    // Australia
    {
      type: 'suicide_hotline',
      name: 'Lifeline Australia',
      contact: '13 11 14',
      country: 'AU',
      description: 'Crisis support and suicide prevention',
      hours: '24/7',
      website: 'https://www.lifeline.org.au',
    },
    {
      type: 'sexual_assault',
      name: '1800RESPECT',
      contact: '1800 737 732',
      country: 'AU',
      description: 'Sexual assault and domestic violence support',
      hours: '24/7',
      website: 'https://www.1800respect.org.au',
    },
  ];

  constructor(safetyRepo: SafetyRepository, userRepo: UserRepository) {
    this.safetyRepo = safetyRepo;
    this.userRepo = userRepo;
  }

  // ============================================
  // Age Verification
  // ============================================

  /**
   * Perform age verification check
   */
  async performAgeVerification(
    userId: string,
    method: AgeVerificationMethod,
    data: {
      dateOfBirth?: Date;
      estimatedAge?: { min: number; max: number };
      confidenceScore?: number;
      verificationDetails?: Record<string, any>;
    }
  ): Promise<AgeVerificationCheck> {
    let passed = false;

    if (data.dateOfBirth) {
      const age = this.calculateAge(data.dateOfBirth);
      passed = age >= 18;
    } else if (data.estimatedAge) {
      // If minimum estimated age is 18+, pass
      passed = data.estimatedAge.min >= 18;
    }

    const check = await this.safetyRepo.createAgeVerificationCheck(userId, method, {
      verifiedDateOfBirth: data.dateOfBirth,
      estimatedAgeMin: data.estimatedAge?.min,
      estimatedAgeMax: data.estimatedAge?.max,
      confidenceScore: data.confidenceScore,
      passed,
      verificationDetails: data.verificationDetails,
    });

    if (!passed) {
      // Flag account for underage suspicion
      await this.safetyRepo.createAccountFlag(
        userId,
        'underage_suspected',
        'Age verification did not pass',
        { checkId: check.id, method }
      );

      // Restrict account
      await this.userRepo.updateStatus(userId, { is_active: false });

      logger.warn(`Age verification failed for user ${userId}`);
    }

    return check;
  }

  /**
   * Estimate age from photo using AI
   */
  async estimateAgeFromPhoto(
    userId: string,
    photoData: Buffer | string
  ): Promise<{ min: number; max: number; confidence: number }> {
    // In production, would use AI service like AWS Rekognition, Azure Face, etc.
    // Simulated response
    const estimatedAge = {
      min: 20,
      max: 30,
      confidence: 0.85,
    };

    // Record the check
    await this.performAgeVerification(userId, 'ai_estimate', {
      estimatedAge,
      confidenceScore: estimatedAge.confidence,
    });

    return estimatedAge;
  }

  /**
   * Check if user profile suggests underage
   */
  async checkProfileForUnderageIndicators(
    userId: string,
    bio: string,
    photos: string[]
  ): Promise<{
    isSuspicious: boolean;
    indicators: string[];
    confidence: number;
  }> {
    const indicators: string[] = [];
    let suspicionScore = 0;

    const lowerBio = bio.toLowerCase();

    // Check bio for underage indicators
    if (/\b(high school|hs|sophomore|junior|senior|freshman|grade \d+)\b/i.test(lowerBio)) {
      indicators.push('high_school_mention');
      suspicionScore += 0.4;
    }

    if (/\b(1[3-7]|thirteen|fourteen|fifteen|sixteen|seventeen)\s*(years?\s*old|yo|y\/o)?\b/i.test(lowerBio)) {
      indicators.push('underage_age_mention');
      suspicionScore += 0.8;
    }

    if (/\b(prom|homecoming|school\s*dance|after\s*school)\b/i.test(lowerBio)) {
      indicators.push('school_activity_mention');
      suspicionScore += 0.3;
    }

    if (/\b(mom|dad|parents?)\s*(don't|doesn't|won't)\s*know/i.test(lowerBio)) {
      indicators.push('hiding_from_parents');
      suspicionScore += 0.5;
    }

    // Check photos with AI age estimation would go here
    // For each photo, estimate age and flag if underage

    const isSuspicious = suspicionScore >= 0.5;

    if (isSuspicious) {
      await this.safetyRepo.createAccountFlag(
        userId,
        'underage_suspected',
        `Profile indicators suggest potential underage user: ${indicators.join(', ')}`,
        { indicators, suspicionScore }
      );

      logger.warn(`Underage indicators detected for user ${userId}: ${indicators.join(', ')}`);
    }

    return {
      isSuspicious,
      indicators,
      confidence: Math.min(suspicionScore, 1),
    };
  }

  // ============================================
  // Wellbeing Detection
  // ============================================

  /**
   * Analyze text for wellbeing concerns
   */
  async analyzeTextForWellbeing(
    userId: string,
    text: string,
    context: 'bio' | 'message' | 'comment'
  ): Promise<WellbeingAnalysisResult> {
    const lowerText = text.toLowerCase();
    let signalType: WellbeingSignalType | undefined;
    let confidence = 0;
    const suggestedResources: CrisisResourceType[] = [];
    let requiresImmediateAttention = false;

    // Check for self-harm/suicide keywords (highest priority)
    for (const keyword of this.SELF_HARM_KEYWORDS) {
      if (lowerText.includes(keyword)) {
        signalType = 'self_harm_mention';
        confidence = Math.max(confidence, 0.9);
        suggestedResources.push('suicide_hotline', 'crisis_text_line');
        requiresImmediateAttention = true;
        break;
      }
    }

    // Check for crisis keywords
    if (!signalType) {
      for (const keyword of this.CRISIS_KEYWORDS) {
        if (lowerText.includes(keyword)) {
          signalType = 'crisis_keywords';
          confidence = Math.max(confidence, 0.7);

          if (/abuse|beaten|assault/i.test(lowerText)) {
            suggestedResources.push('domestic_violence');
          }
          if (/rape|assault|sexual/i.test(lowerText)) {
            suggestedResources.push('sexual_assault');
          }
          if (/trafficking|forced|trapped/i.test(lowerText)) {
            suggestedResources.push('human_trafficking');
            requiresImmediateAttention = true;
          }
          break;
        }
      }
    }

    // Check for distress keywords
    if (!signalType) {
      let distressCount = 0;
      for (const keyword of this.DISTRESS_KEYWORDS) {
        if (lowerText.includes(keyword)) {
          distressCount++;
        }
      }
      if (distressCount >= 2) {
        signalType = 'distress_language';
        confidence = Math.min(0.4 + distressCount * 0.15, 0.85);
        suggestedResources.push('mental_health', 'crisis_text_line');
      }
    }

    // Check for exploitation indicators
    if (!signalType) {
      for (const keyword of this.EXPLOITATION_KEYWORDS) {
        if (lowerText.includes(keyword)) {
          signalType = 'exploitation_concern';
          confidence = Math.max(confidence, 0.6);
          suggestedResources.push('human_trafficking', 'general_helpline');
          break;
        }
      }
    }

    const signalDetected = !!signalType;

    // Record signal if detected
    if (signalDetected && signalType) {
      const signal = await this.safetyRepo.createWellbeingSignal(userId, signalType, {
        contentExcerpt: text.substring(0, 200),
        confidenceScore: confidence,
      });

      // Show resources if high confidence
      if (confidence >= 0.7) {
        await this.showCrisisResources(userId, signal.id, suggestedResources);
      }

      logger.info(`Wellbeing signal detected for user ${userId}: ${signalType}`);
    }

    return {
      signalDetected,
      signalType,
      confidence,
      suggestedResources,
      requiresImmediateAttention,
    };
  }

  /**
   * Show crisis resources to user
   */
  async showCrisisResources(
    userId: string,
    signalId: string | undefined,
    resourceTypes: CrisisResourceType[],
    country: string = 'US'
  ): Promise<CrisisResourceShown[]> {
    const resources = this.CRISIS_RESOURCES.filter(
      r => resourceTypes.includes(r.type) && r.country === country
    );

    const records: CrisisResourceShown[] = [];

    for (const resource of resources) {
      const record = await this.safetyRepo.recordCrisisResourceShown(userId, resource.type, {
        wellbeingSignalId: signalId,
        resourceCountry: resource.country,
        resourceName: resource.name,
        resourceContact: resource.contact,
      });
      records.push(record);
    }

    // Update signal status
    if (signalId) {
      await this.safetyRepo.updateWellbeingSignalStatus(signalId, 'resources_shown', true);
    }

    return records;
  }

  /**
   * Get crisis resources for a country
   */
  getCrisisResources(country: string = 'US', type?: CrisisResourceType): CrisisResource[] {
    let resources = this.CRISIS_RESOURCES.filter(r => r.country === country);

    if (type) {
      resources = resources.filter(r => r.type === type);
    }

    return resources;
  }

  /**
   * Record that user clicked on a crisis resource
   */
  async recordResourceClick(resourceId: string): Promise<void> {
    await this.safetyRepo.markCrisisResourceClicked(resourceId);
    logger.info(`Crisis resource clicked: ${resourceId}`);
  }

  // ============================================
  // Isolation Pattern Detection
  // ============================================

  /**
   * Detect isolation patterns in user behavior
   */
  async detectIsolationPatterns(userId: string): Promise<{
    isIsolated: boolean;
    indicators: string[];
    suggestedAction?: string;
  }> {
    // In production, would analyze:
    // - Sudden decrease in activity
    // - Unmatching all matches
    // - Deleting messages
    // - Removing photos
    // - Bio changes suggesting distress

    const indicators: string[] = [];
    let isolationScore = 0;

    // Check recent activity patterns
    // Simulated check
    const recentActivityDecline = false;
    if (recentActivityDecline) {
      indicators.push('activity_decline');
      isolationScore += 0.3;
    }

    // Check for unmatching behavior
    // Simulated check
    const massUnmatching = false;
    if (massUnmatching) {
      indicators.push('mass_unmatching');
      isolationScore += 0.4;
    }

    const isIsolated = isolationScore >= 0.5;

    if (isIsolated) {
      await this.safetyRepo.createWellbeingSignal(userId, 'isolation_pattern', {
        confidenceScore: isolationScore,
      });
    }

    return {
      isIsolated,
      indicators,
      suggestedAction: isIsolated ? 'Consider reaching out with supportive resources' : undefined,
    };
  }

  // ============================================
  // Harassment Victim Support
  // ============================================

  /**
   * Provide support resources after user reports harassment
   */
  async provideHarassmentVictimSupport(
    userId: string,
    harassmentType: string
  ): Promise<{
    resources: CrisisResource[];
    message: string;
  }> {
    let resourceTypes: CrisisResourceType[] = ['general_helpline'];
    let message = 'We take all reports seriously. Here are some resources that might help:';

    switch (harassmentType) {
      case 'sexual_harassment':
      case 'sexual_assault':
        resourceTypes = ['sexual_assault', 'crisis_text_line'];
        message = "We're sorry you experienced this. Your safety is our priority. Here are resources that can help:";
        break;

      case 'threatening_behavior':
      case 'stalking':
        resourceTypes = ['domestic_violence', 'crisis_text_line'];
        message = 'Your safety matters. If you feel in danger, please contact local authorities. Here are additional resources:';
        break;

      case 'hate_speech':
        resourceTypes = ['mental_health', 'crisis_text_line'];
        message = 'No one should experience hate. Here are resources for support:';
        break;
    }

    // Record wellbeing signal
    await this.safetyRepo.createWellbeingSignal(userId, 'harassment_victim', {
      confidenceScore: 1,
    });

    const resources = this.getCrisisResources('US').filter(r => resourceTypes.includes(r.type));

    // Show resources
    await this.showCrisisResources(userId, undefined, resourceTypes);

    return {
      resources,
      message,
    };
  }

  // ============================================
  // Private Helper Methods
  // ============================================

  private calculateAge(birthDate: Date): number {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return age;
  }
}
