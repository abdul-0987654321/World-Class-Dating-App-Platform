/**
 * Agora Service for React Native
 * Handles video/audio calling with Agora RTC SDK
 */

import {
  createAgoraRtcEngine,
  IRtcEngine,
  ChannelProfileType,
  ClientRoleType,
  RtcStats,
  VideoCanvas,
  VideoEncoderConfiguration,
  LocalVideoStreamState,
  LocalVideoStreamError,
  RemoteVideoState,
  RemoteVideoStateReason,
} from 'react-native-agora';
import { EventEmitter } from 'events';

export interface CallOptions {
  video?: boolean;
  audio?: boolean;
  videoQuality?: 'low' | 'medium' | 'high' | 'hd';
  enableBeauty?: boolean;
  enableNoiseSuppression?: boolean;
  enableEchoCancellation?: boolean;
}

export interface NetworkQuality {
  txQuality: number;
  rxQuality: number;
}

export class AgoraService extends EventEmitter {
  private engine: IRtcEngine | null = null;
  private appId: string;
  private isJoined: boolean = false;
  private currentChannel: string | null = null;
  private currentUid: number = 0;
  private remoteUsers: Set<number> = new Set();

  constructor(appId: string) {
    super();
    this.appId = appId;
  }

  /**
   * Initialize Agora Engine
   */
  async initialize(): Promise<void> {
    if (this.engine) {
      return;
    }

    try {
      this.engine = createAgoraRtcEngine();
      await this.engine.initialize({
        appId: this.appId,
        channelProfile: ChannelProfileType.ChannelProfileCommunication,
      });

      this.setupEventHandlers();
      this.emit('initialized');
    } catch (error) {
      console.error('Failed to initialize Agora engine:', error);
      throw error;
    }
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    if (!this.engine) return;

    // User joined
    this.engine.addListener('onUserJoined', (connection, remoteUid, elapsed) => {
      console.log('User joined:', remoteUid);
      this.remoteUsers.add(remoteUid);
      this.emit('user-joined', remoteUid);
    });

    // User offline
    this.engine.addListener('onUserOffline', (connection, remoteUid, reason) => {
      console.log('User offline:', remoteUid, reason);
      this.remoteUsers.delete(remoteUid);
      this.emit('user-left', remoteUid);
    });

    // Remote video state changed
    this.engine.addListener(
      'onRemoteVideoStateChanged',
      (connection, remoteUid, state, reason, elapsed) => {
        console.log('Remote video state changed:', remoteUid, state, reason);
        if (state === RemoteVideoState.RemoteVideoStateStarting) {
          this.emit('remote-video-started', remoteUid);
        } else if (state === RemoteVideoState.RemoteVideoStateStopped) {
          this.emit('remote-video-stopped', remoteUid);
        }
      }
    );

    // Local video state changed
    this.engine.addListener('onLocalVideoStateChanged', (source, state, error) => {
      console.log('Local video state changed:', state, error);
      this.emit('local-video-state-changed', state, error);
    });

    // Network quality
    this.engine.addListener('onNetworkQuality', (connection, remoteUid, txQuality, rxQuality) => {
      const quality: NetworkQuality = { txQuality, rxQuality };
      this.emit('network-quality', quality);
    });

    // RTC stats
    this.engine.addListener('onRtcStats', (connection, stats) => {
      this.emit('statistics', stats);
    });

    // Connection state changed
    this.engine.addListener('onConnectionStateChanged', (connection, state, reason) => {
      console.log('Connection state changed:', state, reason);
      this.emit('connection-state-changed', state, reason);
    });

    // Error
    this.engine.addListener('onError', (err, msg) => {
      console.error('Agora error:', err, msg);
      this.emit('error', { err, msg });
    });

    // Warning
    this.engine.addListener('onWarning', (warn, msg) => {
      console.warn('Agora warning:', warn, msg);
    });
  }

  /**
   * Join channel
   */
  async joinChannel(
    channelName: string,
    token: string,
    uid: number,
    options: CallOptions = {}
  ): Promise<void> {
    if (!this.engine) {
      throw new Error('Engine not initialized');
    }

    if (this.isJoined) {
      throw new Error('Already joined a channel');
    }

    try {
      // Enable video if needed
      if (options.video !== false) {
        await this.engine.enableVideo();
        await this.engine.startPreview();

        // Set video encoder configuration
        const videoConfig = this.getVideoEncoderConfig(options.videoQuality || 'medium');
        await this.engine.setVideoEncoderConfiguration(videoConfig);

        // Enable beauty effects if requested
        if (options.enableBeauty) {
          await this.engine.setBeautyEffectOptions(true, {
            lighteningContrastLevel: 1,
            lighteningLevel: 0.7,
            smoothnessLevel: 0.5,
            rednessLevel: 0.1,
          });
        }
      } else {
        await this.engine.disableVideo();
      }

      // Enable audio
      await this.engine.enableAudio();

      // Audio enhancement features
      if (options.enableNoiseSuppression !== false) {
        await this.engine.setAudioProfile(1, 1); // High quality audio
      }

      // Join channel
      await this.engine.joinChannel(token, channelName, uid, {
        clientRoleType: ClientRoleType.ClientRoleBroadcaster,
      });

      this.isJoined = true;
      this.currentChannel = channelName;
      this.currentUid = uid;

      this.emit('joined', channelName);
    } catch (error) {
      console.error('Failed to join channel:', error);
      this.isJoined = false;
      throw error;
    }
  }

  /**
   * Leave channel
   */
  async leaveChannel(): Promise<void> {
    if (!this.engine || !this.isJoined) {
      return;
    }

    try {
      await this.engine.leaveChannel();
      await this.engine.stopPreview();

      this.isJoined = false;
      this.currentChannel = null;
      this.currentUid = 0;
      this.remoteUsers.clear();

      this.emit('left');
    } catch (error) {
      console.error('Failed to leave channel:', error);
      throw error;
    }
  }

  /**
   * Toggle microphone
   */
  async toggleMicrophone(): Promise<boolean> {
    if (!this.engine) {
      throw new Error('Engine not initialized');
    }

    const enabled = await this.engine.isMicrophoneMuted();
    await this.engine.muteLocalAudioStream(!enabled);
    this.emit('audio-toggled', enabled);
    return enabled;
  }

  /**
   * Toggle camera
   */
  async toggleCamera(): Promise<boolean> {
    if (!this.engine) {
      throw new Error('Engine not initialized');
    }

    const enabled = await this.engine.isVideoEnabled();
    await this.engine.muteLocalVideoStream(!enabled);
    this.emit('video-toggled', enabled);
    return enabled;
  }

  /**
   * Switch camera (front/back)
   */
  async switchCamera(): Promise<void> {
    if (!this.engine) {
      throw new Error('Engine not initialized');
    }

    await this.engine.switchCamera();
    this.emit('camera-switched');
  }

  /**
   * Enable speaker
   */
  async enableSpeaker(enabled: boolean): Promise<void> {
    if (!this.engine) {
      throw new Error('Engine not initialized');
    }

    await this.engine.setEnableSpeakerphone(enabled);
    this.emit('speaker-toggled', enabled);
  }

  /**
   * Set video quality
   */
  async setVideoQuality(quality: 'low' | 'medium' | 'high' | 'hd'): Promise<void> {
    if (!this.engine) {
      throw new Error('Engine not initialized');
    }

    const config = this.getVideoEncoderConfig(quality);
    await this.engine.setVideoEncoderConfiguration(config);
    this.emit('video-quality-changed', quality);
  }

  /**
   * Get video encoder configuration
   */
  private getVideoEncoderConfig(quality: string): VideoEncoderConfiguration {
    const configs: Record<string, VideoEncoderConfiguration> = {
      low: {
        dimensions: { width: 320, height: 240 },
        frameRate: 15,
        bitrate: 200,
        minBitrate: 150,
      },
      medium: {
        dimensions: { width: 640, height: 480 },
        frameRate: 24,
        bitrate: 600,
        minBitrate: 400,
      },
      high: {
        dimensions: { width: 1280, height: 720 },
        frameRate: 30,
        bitrate: 1200,
        minBitrate: 800,
      },
      hd: {
        dimensions: { width: 1920, height: 1080 },
        frameRate: 30,
        bitrate: 2400,
        minBitrate: 1500,
      },
    };

    return configs[quality] || configs.medium;
  }

  /**
   * Get engine instance (for rendering)
   */
  getEngine(): IRtcEngine | null {
    return this.engine;
  }

  /**
   * Get remote users
   */
  getRemoteUsers(): number[] {
    return Array.from(this.remoteUsers);
  }

  /**
   * Check if joined
   */
  isInCall(): boolean {
    return this.isJoined;
  }

  /**
   * Get current channel
   */
  getCurrentChannel(): string | null {
    return this.currentChannel;
  }

  /**
   * Get current UID
   */
  getCurrentUid(): number {
    return this.currentUid;
  }

  /**
   * Destroy engine
   */
  async destroy(): Promise<void> {
    if (this.engine) {
      await this.leaveChannel();
      this.engine.release();
      this.engine = null;
    }
    this.removeAllListeners();
  }
}

export default AgoraService;
