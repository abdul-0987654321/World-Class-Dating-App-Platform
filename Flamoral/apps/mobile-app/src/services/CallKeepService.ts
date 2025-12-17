/**
 * CallKeep Service for React Native
 * Handles native call UI and background call states
 */

import RNCallKeep from 'react-native-callkeep';
import { Platform } from 'react-native';
import { EventEmitter } from 'events';

export interface CallKeepOptions {
  ios: {
    appName: string;
    supportsVideo: boolean;
    includesCallsInRecents: boolean;
  };
  android: {
    alertTitle: string;
    alertDescription: string;
    cancelButton: string;
    okButton: string;
    additionalPermissions: string[];
    foregroundService: {
      channelId: string;
      channelName: string;
      notificationTitle: string;
    };
  };
}

export class CallKeepService extends EventEmitter {
  private isSetup: boolean = false;
  private activeCallUuid: string | null = null;

  /**
   * Setup CallKeep
   */
  setup(options: CallKeepOptions): void {
    if (this.isSetup) {
      return;
    }

    try {
      RNCallKeep.setup({
        ios: {
          appName: options.ios.appName,
          supportsVideo: options.ios.supportsVideo,
          includesCallsInRecents: options.ios.includesCallsInRecents,
        },
        android: {
          alertTitle: options.android.alertTitle,
          alertDescription: options.android.alertDescription,
          cancelButton: options.android.cancelButton,
          okButton: options.android.okButton,
          additionalPermissions: options.android.additionalPermissions,
          foregroundService: {
            channelId: options.android.foregroundService.channelId,
            channelName: options.android.foregroundService.channelName,
            notificationTitle: options.android.foregroundService.notificationTitle,
          },
        },
      });

      this.setupEventListeners();
      this.isSetup = true;
    } catch (error) {
      console.error('Failed to setup CallKeep:', error);
    }
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Answer call
    RNCallKeep.addEventListener('answerCall', ({ callUUID }) => {
      console.log('Answer call:', callUUID);
      this.emit('answer-call', callUUID);
    });

    // End call
    RNCallKeep.addEventListener('endCall', ({ callUUID }) => {
      console.log('End call:', callUUID);
      this.emit('end-call', callUUID);
    });

    // Mute call
    RNCallKeep.addEventListener('didPerformSetMutedCallAction', ({ muted, callUUID }) => {
      console.log('Set muted:', muted, callUUID);
      this.emit('set-muted', { callUUID, muted });
    });

    // Hold call
    RNCallKeep.addEventListener('didToggleHoldCallAction', ({ hold, callUUID }) => {
      console.log('Toggle hold:', hold, callUUID);
      this.emit('toggle-hold', { callUUID, hold });
    });

    // DTMF
    RNCallKeep.addEventListener('didPerformDTMFAction', ({ digits, callUUID }) => {
      console.log('DTMF:', digits, callUUID);
    });

    // Display incoming call
    RNCallKeep.addEventListener('didDisplayIncomingCall', ({ error, callUUID, handle }) => {
      if (error) {
        console.error('Error displaying incoming call:', error);
      } else {
        console.log('Displayed incoming call:', callUUID, handle);
      }
    });
  }

  /**
   * Display incoming call
   */
  displayIncomingCall(
    uuid: string,
    handle: string,
    localizedCallerName: string,
    hasVideo: boolean = false
  ): void {
    try {
      RNCallKeep.displayIncomingCall(uuid, handle, localizedCallerName, 'generic', hasVideo);
      this.activeCallUuid = uuid;
      console.log('Displaying incoming call:', uuid, localizedCallerName);
    } catch (error) {
      console.error('Failed to display incoming call:', error);
    }
  }

  /**
   * Start outgoing call
   */
  startCall(uuid: string, handle: string, contactName: string, hasVideo: boolean = false): void {
    try {
      RNCallKeep.startCall(uuid, handle, contactName, 'generic', hasVideo);
      this.activeCallUuid = uuid;
      console.log('Starting outgoing call:', uuid, contactName);
    } catch (error) {
      console.error('Failed to start call:', error);
    }
  }

  /**
   * Answer incoming call
   */
  answerIncomingCall(uuid: string): void {
    try {
      if (Platform.OS === 'android') {
        RNCallKeep.answerIncomingCall(uuid);
      }
      console.log('Answering incoming call:', uuid);
    } catch (error) {
      console.error('Failed to answer call:', error);
    }
  }

  /**
   * End call
   */
  endCall(uuid: string): void {
    try {
      RNCallKeep.endCall(uuid);
      if (this.activeCallUuid === uuid) {
        this.activeCallUuid = null;
      }
      console.log('Ending call:', uuid);
    } catch (error) {
      console.error('Failed to end call:', error);
    }
  }

  /**
   * End all calls
   */
  endAllCalls(): void {
    try {
      RNCallKeep.endAllCalls();
      this.activeCallUuid = null;
      console.log('Ending all calls');
    } catch (error) {
      console.error('Failed to end all calls:', error);
    }
  }

  /**
   * Reject call
   */
  rejectCall(uuid: string): void {
    try {
      RNCallKeep.rejectCall(uuid);
      if (this.activeCallUuid === uuid) {
        this.activeCallUuid = null;
      }
      console.log('Rejecting call:', uuid);
    } catch (error) {
      console.error('Failed to reject call:', error);
    }
  }

  /**
   * Set call on hold
   */
  setOnHold(uuid: string, hold: boolean): void {
    try {
      RNCallKeep.setOnHold(uuid, hold);
      console.log('Set on hold:', uuid, hold);
    } catch (error) {
      console.error('Failed to set on hold:', error);
    }
  }

  /**
   * Set muted
   */
  setMutedCall(uuid: string, muted: boolean): void {
    try {
      RNCallKeep.setMutedCall(uuid, muted);
      console.log('Set muted:', uuid, muted);
    } catch (error) {
      console.error('Failed to set muted:', error);
    }
  }

  /**
   * Update display
   */
  updateDisplay(uuid: string, displayName: string, handle: string): void {
    try {
      RNCallKeep.updateDisplay(uuid, displayName, handle);
      console.log('Update display:', uuid, displayName);
    } catch (error) {
      console.error('Failed to update display:', error);
    }
  }

  /**
   * Check if device supports CallKeep
   */
  isCallActive(uuid: string): boolean {
    return this.activeCallUuid === uuid;
  }

  /**
   * Get active call UUID
   */
  getActiveCallUuid(): string | null {
    return this.activeCallUuid;
  }

  /**
   * Request permissions
   */
  async checkPermissions(): Promise<boolean> {
    try {
      if (Platform.OS === 'android') {
        const permissions = await RNCallKeep.checkPhoneAccountPermission();
        return permissions;
      }
      return true;
    } catch (error) {
      console.error('Failed to check permissions:', error);
      return false;
    }
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.endAllCalls();
    this.removeAllListeners();
  }
}

export default CallKeepService;
