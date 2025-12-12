/**
 * Agora SDK Service for Web
 * Handles all Agora RTC operations for video/voice calling
 */

import AgoraRTC, {
  IAgoraRTCClient,
  ICameraVideoTrack,
  IMicrophoneAudioTrack,
  IRemoteVideoTrack,
  IRemoteAudioTrack,
  ILocalVideoTrack,
  ILocalAudioTrack,
  UID,
  ClientConfig,
  VideoEncoderConfiguration,
} from 'agora-rtc-sdk-ng';
import { EventEmitter } from 'events';

export interface AgoraConfig {
  appId: string;
  mode?: 'rtc' | 'live';
  codec?: 'vp8' | 'vp9' | 'h264';
}

export interface CallOptions {
  video?: boolean;
  audio?: boolean;
  videoQuality?: 'low' | 'medium' | 'high' | 'hd';
  enableBeauty?: boolean;
  enableNoiseSuppression?: boolean;
  enableEchoCancellation?: boolean;
}

export interface NetworkQuality {
  uplink: number;
  downlink: number;
  delay: number;
  packetLoss: number;
}

export interface CallStatistics {
  duration: number;
  sendBitrate: number;
  receiveBitrate: number;
  sendPacketLossRate: number;
  receivePacketLossRate: number;
  videoSendResolution?: { width: number; height: number };
  videoReceiveResolution?: { width: number; height: number };
  audioSendBitrate: number;
  audioReceiveBitrate: number;
}

export class AgoraService extends EventEmitter {
  private client: IAgoraRTCClient | null = null;
  private localAudioTrack: IMicrophoneAudioTrack | null = null;
  private localVideoTrack: ICameraVideoTrack | null = null;
  private remoteUsers: Map<UID, { audio: IRemoteAudioTrack | null; video: IRemoteVideoTrack | null }> = new Map();
  private config: AgoraConfig;
  private isJoined: boolean = false;
  private currentChannel: string | null = null;
  private currentUid: UID | null = null;
  private statsInterval: NodeJS.Timeout | null = null;

  constructor(config: AgoraConfig) {
    super();
    this.config = config;
    this.initializeClient();
  }

  /**
   * Initialize Agora RTC Client
   */
  private initializeClient(): void {
    const clientConfig: ClientConfig = {
      mode: this.config.mode || 'rtc',
      codec: this.config.codec || 'vp8',
    };

    this.client = AgoraRTC.createClient(clientConfig);
    this.setupEventHandlers();

    // Enable dual stream mode for adaptive bitrate
    this.client.enableDualStream().catch((err) => {
      console.warn('Failed to enable dual stream:', err);
    });
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    if (!this.client) return;

    this.client.on('user-published', async (user, mediaType) => {
      await this.client!.subscribe(user, mediaType);

      const remoteUser = this.remoteUsers.get(user.uid) || { audio: null, video: null };

      if (mediaType === 'video') {
        remoteUser.video = user.videoTrack || null;
        this.emit('remote-video-added', user.uid, user.videoTrack);
      }

      if (mediaType === 'audio') {
        remoteUser.audio = user.audioTrack || null;
        user.audioTrack?.play();
        this.emit('remote-audio-added', user.uid, user.audioTrack);
      }

      this.remoteUsers.set(user.uid, remoteUser);
      this.emit('user-joined', user.uid);
    });

    this.client.on('user-unpublished', (user, mediaType) => {
      const remoteUser = this.remoteUsers.get(user.uid);
      if (remoteUser) {
        if (mediaType === 'video') {
          remoteUser.video = null;
          this.emit('remote-video-removed', user.uid);
        }
        if (mediaType === 'audio') {
          remoteUser.audio = null;
          this.emit('remote-audio-removed', user.uid);
        }
      }
    });

    this.client.on('user-left', (user) => {
      this.remoteUsers.delete(user.uid);
      this.emit('user-left', user.uid);
    });

    this.client.on('connection-state-change', (curState, prevState, reason) => {
      this.emit('connection-state-change', { curState, prevState, reason });
    });

    this.client.on('network-quality', (stats) => {
      const quality: NetworkQuality = {
        uplink: stats.uplinkNetworkQuality,
        downlink: stats.downlinkNetworkQuality,
        delay: 0,
        packetLoss: 0,
      };
      this.emit('network-quality', quality);
    });

    this.client.on('exception', (event) => {
      console.error('Agora exception:', event);
      this.emit('error', event);
    });
  }

  /**
   * Join a channel
   */
  async joinChannel(
    channelName: string,
    token: string,
    uid: UID,
    options: CallOptions = {}
  ): Promise<void> {
    if (!this.client) {
      throw new Error('Agora client not initialized');
    }

    if (this.isJoined) {
      throw new Error('Already joined a channel');
    }

    try {
      // Join the channel
      await this.client.join(this.config.appId, channelName, token, uid);
      this.isJoined = true;
      this.currentChannel = channelName;
      this.currentUid = uid;

      // Create and publish local tracks
      const tracks: (ILocalAudioTrack | ILocalVideoTrack)[] = [];

      if (options.audio !== false) {
        this.localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack({
          encoderConfig: 'music_standard',
          AEC: options.enableEchoCancellation !== false,
          ANS: options.enableNoiseSuppression !== false,
        });
        tracks.push(this.localAudioTrack);
      }

      if (options.video !== false) {
        const videoConfig = this.getVideoEncoderConfig(options.videoQuality || 'medium');
        this.localVideoTrack = await AgoraRTC.createCameraVideoTrack({
          encoderConfig: videoConfig,
        });

        // Apply beauty effects if enabled
        if (options.enableBeauty) {
          await this.localVideoTrack.setBeautyEffect(true, {
            lighteningContrastLevel: 1,
            lighteningLevel: 0.7,
            smoothnessLevel: 0.5,
            rednessLevel: 0.1,
          });
        }

        tracks.push(this.localVideoTrack);
        this.emit('local-video-track', this.localVideoTrack);
      }

      // Publish tracks
      if (tracks.length > 0) {
        await this.client.publish(tracks);
      }

      this.emit('local-audio-track', this.localAudioTrack);
      this.emit('joined', channelName);

      // Start collecting statistics
      this.startStatsCollection();
    } catch (error) {
      this.isJoined = false;
      this.currentChannel = null;
      this.currentUid = null;
      console.error('Failed to join channel:', error);
      throw error;
    }
  }

  /**
   * Leave the current channel
   */
  async leaveChannel(): Promise<void> {
    if (!this.client || !this.isJoined) {
      return;
    }

    try {
      // Stop stats collection
      this.stopStatsCollection();

      // Stop and close local tracks
      if (this.localAudioTrack) {
        this.localAudioTrack.stop();
        this.localAudioTrack.close();
        this.localAudioTrack = null;
      }

      if (this.localVideoTrack) {
        this.localVideoTrack.stop();
        this.localVideoTrack.close();
        this.localVideoTrack = null;
      }

      // Leave channel
      await this.client.leave();
      this.isJoined = false;
      this.currentChannel = null;
      this.currentUid = null;
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
    if (!this.localAudioTrack) {
      throw new Error('No local audio track');
    }

    const enabled = this.localAudioTrack.enabled;
    await this.localAudioTrack.setEnabled(!enabled);
    this.emit('audio-toggled', !enabled);
    return !enabled;
  }

  /**
   * Toggle camera
   */
  async toggleCamera(): Promise<boolean> {
    if (!this.localVideoTrack) {
      throw new Error('No local video track');
    }

    const enabled = this.localVideoTrack.enabled;
    await this.localVideoTrack.setEnabled(!enabled);
    this.emit('video-toggled', !enabled);
    return !enabled;
  }

  /**
   * Switch camera (front/back)
   */
  async switchCamera(): Promise<void> {
    if (!this.localVideoTrack) {
      throw new Error('No local video track');
    }

    const devices = await AgoraRTC.getCameras();
    if (devices.length < 2) {
      throw new Error('Only one camera available');
    }

    const currentDevice = this.localVideoTrack.getMediaStreamTrack().getSettings().deviceId;
    const nextDevice = devices.find((device) => device.deviceId !== currentDevice);

    if (nextDevice) {
      await this.localVideoTrack.setDevice(nextDevice.deviceId);
      this.emit('camera-switched', nextDevice.deviceId);
    }
  }

  /**
   * Start screen sharing
   */
  async startScreenShare(): Promise<void> {
    if (!this.client || !this.isJoined) {
      throw new Error('Not in a call');
    }

    try {
      // Create screen track
      const screenTrack = await AgoraRTC.createScreenVideoTrack({
        encoderConfig: '1080p_1',
      });

      // Unpublish camera track
      if (this.localVideoTrack) {
        await this.client.unpublish([this.localVideoTrack]);
        this.localVideoTrack.stop();
      }

      // Publish screen track
      const tracksToPublish = Array.isArray(screenTrack) ? screenTrack : [screenTrack];
      await this.client.publish(tracksToPublish);

      // Store original video track
      const originalVideoTrack = this.localVideoTrack;
      this.localVideoTrack = (Array.isArray(screenTrack) ? screenTrack[0] : screenTrack) as any;

      this.emit('screen-share-started', screenTrack);

      // Handle screen share stop event
      (Array.isArray(screenTrack) ? screenTrack[0] : screenTrack).on('track-ended', async () => {
        await this.stopScreenShare(originalVideoTrack ?? undefined);
      });
    } catch (error) {
      console.error('Failed to start screen share:', error);
      throw error;
    }
  }

  /**
   * Stop screen sharing
   */
  async stopScreenShare(originalVideoTrack?: ICameraVideoTrack): Promise<void> {
    if (!this.client || !this.isJoined) {
      return;
    }

    try {
      // Stop screen track
      if (this.localVideoTrack) {
        await this.client.unpublish([this.localVideoTrack]);
        this.localVideoTrack.stop();
        this.localVideoTrack.close();
      }

      // Resume camera track
      if (originalVideoTrack) {
        this.localVideoTrack = originalVideoTrack;
        await this.client.publish([this.localVideoTrack]);
        this.emit('local-video-track', this.localVideoTrack);
      }

      this.emit('screen-share-stopped');
    } catch (error) {
      console.error('Failed to stop screen share:', error);
      throw error;
    }
  }

  /**
   * Set video quality
   */
  async setVideoQuality(quality: 'low' | 'medium' | 'high' | 'hd'): Promise<void> {
    if (!this.client || !this.localVideoTrack) {
      throw new Error('No active video track');
    }

    const config = this.getVideoEncoderConfig(quality);
    await this.localVideoTrack.setEncoderConfiguration(config);
    this.emit('video-quality-changed', quality);
  }

  /**
   * Get video encoder configuration
   */
  private getVideoEncoderConfig(quality: string): VideoEncoderConfiguration {
    const configs: Record<string, VideoEncoderConfiguration> = {
      low: { width: 320, height: 240, frameRate: 15, bitrateMin: 200, bitrateMax: 400 },
      medium: { width: 640, height: 480, frameRate: 24, bitrateMin: 400, bitrateMax: 800 },
      high: { width: 1280, height: 720, frameRate: 30, bitrateMin: 800, bitrateMax: 1500 },
      hd: { width: 1920, height: 1080, frameRate: 30, bitrateMin: 1500, bitrateMax: 3000 },
    };

    return configs[quality] || configs.medium;
  }

  /**
   * Get local video track
   */
  getLocalVideoTrack(): ICameraVideoTrack | null {
    return this.localVideoTrack;
  }

  /**
   * Get local audio track
   */
  getLocalAudioTrack(): IMicrophoneAudioTrack | null {
    return this.localAudioTrack;
  }

  /**
   * Get remote video track
   */
  getRemoteVideoTrack(uid: UID): IRemoteVideoTrack | null {
    return this.remoteUsers.get(uid)?.video || null;
  }

  /**
   * Get remote audio track
   */
  getRemoteAudioTrack(uid: UID): IRemoteAudioTrack | null {
    return this.remoteUsers.get(uid)?.audio || null;
  }

  /**
   * Get all remote users
   */
  getRemoteUsers(): UID[] {
    return Array.from(this.remoteUsers.keys());
  }

  /**
   * Start collecting call statistics
   */
  private startStatsCollection(): void {
    this.statsInterval = setInterval(async () => {
      if (!this.client || !this.isJoined) {
        return;
      }

      try {
        const stats = this.client.getRTCStats();
        const localVideoStats = this.localVideoTrack
          ? this.client.getLocalVideoStats()
          : undefined;
        const localAudioStats = this.localAudioTrack
          ? this.client.getLocalAudioStats()
          : undefined;

        const callStats: CallStatistics = {
          duration: stats.Duration,
          sendBitrate: stats.SendBitrate || 0,
          receiveBitrate: stats.RecvBitrate || 0,
          sendPacketLossRate: stats.OutgoingAvailableBandwidth || 0,
          receivePacketLossRate: 0,
          videoSendResolution: localVideoStats
            ? { width: localVideoStats.sendResolutionWidth!, height: localVideoStats.sendResolutionHeight! }
            : undefined,
          audioSendBitrate: localAudioStats?.sendBitrate || 0,
          audioReceiveBitrate: 0,
        };

        this.emit('statistics', callStats);
      } catch (error) {
        console.error('Failed to get stats:', error);
      }
    }, 2000);
  }

  /**
   * Stop collecting statistics
   */
  private stopStatsCollection(): void {
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
      this.statsInterval = null;
    }
  }

  /**
   * Enable/disable audio volume indication
   */
  enableAudioVolumeIndicator(interval: number = 200): void {
    if (!this.client) return;
    this.client.enableAudioVolumeIndicator();

    this.client.on('volume-indicator', (volumes) => {
      this.emit('volume-indicator', volumes);
    });
  }

  /**
   * Get current connection state
   */
  getConnectionState(): string {
    return this.client?.connectionState || 'DISCONNECTED';
  }

  /**
   * Check if currently in a call
   */
  isInCall(): boolean {
    return this.isJoined;
  }

  /**
   * Get current channel name
   */
  getCurrentChannel(): string | null {
    return this.currentChannel;
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.leaveChannel().catch(console.error);
    this.removeAllListeners();
  }
}

export default AgoraService;
