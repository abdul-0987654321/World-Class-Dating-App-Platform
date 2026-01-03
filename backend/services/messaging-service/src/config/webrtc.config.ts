/**
 * WebRTC Configuration
 * TURN/STUN server settings for video and voice calls
 */

function optionalSecret(name: string): string | undefined {
  return process.env[name];
}

export interface ICEServer {
  urls: string | string[];
  username?: string;
  credential?: string;
  credentialType?: 'password' | 'oauth';
}

export interface WebRTCConfig {
  iceServers: ICEServer[];
  iceTransportPolicy?: 'all' | 'relay';
  iceCandidatePoolSize?: number;
  bundlePolicy?: 'balanced' | 'max-compat' | 'max-bundle';
  rtcpMuxPolicy?: 'negotiate' | 'require';
}

export const webrtcConfig = {
  // TURN server configuration
  turnServerUrl: process.env.TURN_SERVER_URL || '',
  turnUsername: process.env.TURN_USERNAME || '',
  turnPassword: process.env.TURN_PASSWORD || '',

  // Twilio TURN (optional)
  twilioAccountSid: optionalSecret('TWILIO_ACCOUNT_SID'),
  twilioAuthToken: optionalSecret('TWILIO_AUTH_TOKEN'),
  twilioTurnUsername: process.env.TWILIO_TURN_USERNAME || '',
  twilioTurnPassword: process.env.TWILIO_TURN_PASSWORD || '',

  // Xirsys TURN (optional)
  xirsysChannel: process.env.XIRSYS_CHANNEL || '',
  xirsysHost: process.env.XIRSYS_HOST || 'turn.xirsys.com',
  xirsysUsername: process.env.XIRSYS_USERNAME || '',
  xirsysPassword: process.env.XIRSYS_PASSWORD || '',

  // Call settings
  callTimeoutMs: parseInt(process.env.CALL_TIMEOUT_MS || '60000', 10),
  maxCallDurationMs: parseInt(process.env.MAX_CALL_DURATION_MS || '7200000', 10),
  audioForceRelay: process.env.AUDIO_FORCE_RELAY === 'true',
};

export const agoraConfig = {
  appId: process.env.AGORA_APP_ID || '',
  appCertificate: optionalSecret('AGORA_APP_CERTIFICATE'),
  tokenExpiryTime: parseInt(process.env.AGORA_TOKEN_EXPIRY || '3600', 10),
};

/**
 * Get the default WebRTC ICE configuration
 */
export function getDefaultICEConfig(): WebRTCConfig {
  const config: WebRTCConfig = {
    iceServers: [
      // Google STUN servers (free, reliable)
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun4.l.google.com:19302' },
    ],
    iceTransportPolicy: 'all',
    iceCandidatePoolSize: 10,
    bundlePolicy: 'max-bundle',
    rtcpMuxPolicy: 'require',
  };

  // Add custom TURN server if configured
  if (webrtcConfig.turnServerUrl) {
    config.iceServers.push({
      urls: webrtcConfig.turnServerUrl,
      username: webrtcConfig.turnUsername,
      credential: webrtcConfig.turnPassword,
      credentialType: 'password',
    });
  }

  // Add Twilio TURN servers if configured
  if (webrtcConfig.twilioAccountSid && webrtcConfig.twilioAuthToken) {
    config.iceServers.push({
      urls: 'turn:global.turn.twilio.com:3478?transport=udp',
      username: webrtcConfig.twilioTurnUsername,
      credential: webrtcConfig.twilioTurnPassword,
    });
  }

  // Add Xirsys TURN servers if configured
  if (webrtcConfig.xirsysChannel) {
    config.iceServers.push({
      urls: [
        `turn:${webrtcConfig.xirsysHost}:80?transport=udp`,
        `turn:${webrtcConfig.xirsysHost}:3478?transport=udp`,
        `turn:${webrtcConfig.xirsysHost}:443?transport=tcp`,
      ],
      username: webrtcConfig.xirsysUsername,
      credential: webrtcConfig.xirsysPassword,
    });
  }

  return config;
}

export default { webrtcConfig, agoraConfig, getDefaultICEConfig };
