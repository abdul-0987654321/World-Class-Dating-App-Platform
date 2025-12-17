import { Platform, Vibration } from 'react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

/**
 * Haptic feedback utilities for enhanced UX
 */

export enum HapticType {
  Selection = 'selection',
  Light = 'impactLight',
  Medium = 'impactMedium',
  Heavy = 'impactHeavy',
  Success = 'notificationSuccess',
  Warning = 'notificationWarning',
  Error = 'notificationError',
  Rigid = 'rigid',
  Soft = 'soft',
}

const hapticOptions = {
  enableVibrateFallback: true,
  ignoreAndroidSystemSettings: false,
};

export class HapticsManager {
  private static isEnabled: boolean = true;

  static setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  static trigger(type: HapticType = HapticType.Selection): void {
    if (!this.isEnabled) {
      return;
    }

    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      try {
        ReactNativeHapticFeedback.trigger(type, hapticOptions);
      } catch (error) {
        console.error('Haptic feedback failed:', error);
        // Fallback to simple vibration
        this.fallbackVibration(type);
      }
    }
  }

  private static fallbackVibration(type: HapticType): void {
    switch (type) {
      case HapticType.Light:
      case HapticType.Selection:
        Vibration.vibrate(10);
        break;
      case HapticType.Medium:
        Vibration.vibrate(20);
        break;
      case HapticType.Heavy:
        Vibration.vibrate(30);
        break;
      case HapticType.Success:
        Vibration.vibrate([0, 10, 20, 10]);
        break;
      case HapticType.Warning:
        Vibration.vibrate([0, 15, 30, 15]);
        break;
      case HapticType.Error:
        Vibration.vibrate([0, 20, 40, 20, 40]);
        break;
      default:
        Vibration.vibrate(15);
    }
  }

  // Convenience methods for common actions
  static selection(): void {
    this.trigger(HapticType.Selection);
  }

  static lightImpact(): void {
    this.trigger(HapticType.Light);
  }

  static mediumImpact(): void {
    this.trigger(HapticType.Medium);
  }

  static heavyImpact(): void {
    this.trigger(HapticType.Heavy);
  }

  static success(): void {
    this.trigger(HapticType.Success);
  }

  static warning(): void {
    this.trigger(HapticType.Warning);
  }

  static error(): void {
    this.trigger(HapticType.Error);
  }

  // Context-specific haptics
  static swipeCard(): void {
    this.trigger(HapticType.Light);
  }

  static match(): void {
    this.trigger(HapticType.Success);
  }

  static like(): void {
    this.trigger(HapticType.Medium);
  }

  static superLike(): void {
    this.trigger(HapticType.Heavy);
  }

  static messageSent(): void {
    this.trigger(HapticType.Light);
  }

  static messageReceived(): void {
    this.trigger(HapticType.Medium);
  }

  static buttonPress(): void {
    this.trigger(HapticType.Selection);
  }

  static toggleSwitch(): void {
    this.trigger(HapticType.Selection);
  }

  static pullToRefresh(): void {
    this.trigger(HapticType.Light);
  }

  static longPress(): void {
    this.trigger(HapticType.Medium);
  }

  static invalidAction(): void {
    this.trigger(HapticType.Warning);
  }

  static criticalAction(): void {
    this.trigger(HapticType.Heavy);
  }
}

export default HapticsManager;
