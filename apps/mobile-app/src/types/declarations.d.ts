/**
 * Type declarations for third-party modules without TypeScript definitions
 */

/// <reference types="node" />

// React Native Animated component type augmentation
import 'react-native';

declare module 'react-native' {
  namespace Animated {
    class View extends React.Component<Animated.AnimatedProps<ViewProps>> {}
    class Text extends React.Component<Animated.AnimatedProps<TextProps>> {}
    class Image extends React.Component<Animated.AnimatedProps<ImageProps>> {}
    class ScrollView extends React.Component<Animated.AnimatedProps<ScrollViewProps>> {}
    class FlatList<ItemT = any> extends React.Component<Animated.AnimatedProps<FlatListProps<ItemT>>> {}
  }
}

// Global Node.js namespace for React Native
declare namespace NodeJS {
  interface Timeout {}
  interface Timer {}
}

// Process environment for React Native
declare const process: {
  env: {
    [key: string]: string | undefined;
    NODE_ENV: 'development' | 'production' | 'test';
    API_URL?: string;
    GOOGLE_WEB_CLIENT_ID?: string;
    GOOGLE_IOS_CLIENT_ID?: string;
    STRIPE_PUBLISHABLE_KEY?: string;
  };
};

// React Native Vector Icons
declare module 'react-native-vector-icons/Feather' {
  import { Component } from 'react';
  import { TextStyle } from 'react-native';

  interface IconProps {
    name: string;
    size?: number;
    color?: string;
    style?: TextStyle;
  }

  export default class Icon extends Component<IconProps> {}
}

declare module 'react-native-vector-icons/Ionicons' {
  import { Component } from 'react';
  import { TextStyle } from 'react-native';

  interface IconProps {
    name: string;
    size?: number;
    color?: string;
    style?: TextStyle;
  }

  export default class Icon extends Component<IconProps> {}
}

declare module 'react-native-vector-icons/MaterialCommunityIcons' {
  import { Component } from 'react';
  import { TextStyle } from 'react-native';

  interface IconProps {
    name: string;
    size?: number;
    color?: string;
    style?: TextStyle;
  }

  export default class Icon extends Component<IconProps> {}
}

declare module 'react-native-vector-icons/MaterialIcons' {
  import { Component } from 'react';
  import { TextStyle } from 'react-native';

  interface IconProps {
    name: string;
    size?: number;
    color?: string;
    style?: TextStyle;
  }

  export default class Icon extends Component<IconProps> {}
}

// Expo and React Native modules
declare module 'expo-blur' {
  import { Component } from 'react';
  import { ViewStyle } from 'react-native';

  interface BlurViewProps {
    intensity?: number;
    tint?: 'light' | 'dark' | 'default';
    style?: ViewStyle;
    children?: React.ReactNode;
  }

  export class BlurView extends Component<BlurViewProps> {}
}

declare module 'react-native-circular-progress' {
  import { Component } from 'react';
  import { ViewStyle } from 'react-native';

  interface CircularProgressProps {
    size: number;
    width: number;
    fill: number;
    tintColor?: string;
    backgroundColor?: string;
    rotation?: number;
    lineCap?: 'butt' | 'round' | 'square';
    style?: ViewStyle;
    children?: (fill: number) => React.ReactNode;
  }

  export class CircularProgress extends Component<CircularProgressProps> {}
  export class AnimatedCircularProgress extends Component<CircularProgressProps> {}
}

declare module 'react-native-background-timer' {
  const BackgroundTimer: {
    runBackgroundTimer(callback: () => void, delay: number): void;
    stopBackgroundTimer(): void;
    start(delay?: number): void;
    stop(): void;
    setTimeout(callback: () => void, timeout: number): number;
    clearTimeout(timeoutId: number): void;
    setInterval(callback: () => void, timeout: number): number;
    clearInterval(intervalId: number): void;
  };

  export default BackgroundTimer;
}

declare module 'react-native-incall-manager' {
  const InCallManager: {
    start(options?: { media?: 'audio' | 'video'; ringback?: string }): void;
    stop(options?: { busytone?: string }): void;
    turnScreenOff(): void;
    turnScreenOn(): void;
    setKeepScreenOn(enable: boolean): void;
    setSpeakerphoneOn(enable: boolean): void;
    setForceSpeakerphoneOn(flag: boolean | -1): void;
    setMicrophoneMute(enable: boolean): void;
    startRingtone(ringtone?: string, vibrate?: boolean, ios_category?: string, seconds?: number): void;
    stopRingtone(): void;
    startRingback(ringback?: string): void;
    stopRingback(): void;
    startProximitySensor(): void;
    stopProximitySensor(): void;
    checkCameraPermission(): Promise<string>;
    checkRecordPermission(): Promise<string>;
    requestCameraPermission(): Promise<string>;
    requestRecordPermission(): Promise<string>;
    getIsWiredHeadsetPluggedIn(): Promise<boolean>;
  };

  export default InCallManager;
}

declare module '@react-native-community/netinfo' {
  export interface NetInfoState {
    type: string;
    isConnected: boolean | null;
    isInternetReachable: boolean | null;
    details: any;
  }

  const NetInfo: {
    addEventListener(listener: (state: NetInfoState) => void): () => void;
    fetch(): Promise<NetInfoState>;
    refresh(): Promise<NetInfoState>;
  };

  export function addEventListener(listener: (state: NetInfoState) => void): () => void;
  export function fetch(): Promise<NetInfoState>;
  export function useNetInfo(): NetInfoState;

  export default NetInfo;
}

declare module '@react-native-community/slider' {
  import { Component } from 'react';
  import { ViewStyle } from 'react-native';

  interface SliderProps {
    value?: number;
    minimumValue?: number;
    maximumValue?: number;
    step?: number;
    onValueChange?: (value: number) => void;
    onSlidingStart?: (value: number) => void;
    onSlidingComplete?: (value: number) => void;
    minimumTrackTintColor?: string;
    maximumTrackTintColor?: string;
    thumbTintColor?: string;
    disabled?: boolean;
    style?: ViewStyle;
  }

  export default class Slider extends Component<SliderProps> {}
}

declare module '@react-navigation/native-stack' {
  import { ParamListBase, RouteProp } from '@react-navigation/native';

  export interface NativeStackNavigationProp<
    ParamList extends ParamListBase,
    RouteName extends keyof ParamList = string
  > {
    navigate<T extends keyof ParamList>(
      ...args: ParamList[T] extends undefined
        ? [screen: T]
        : [screen: T, params: ParamList[T]]
    ): void;
    goBack(): void;
    reset(state: any): void;
    setParams(params: any): void;
    push<T extends keyof ParamList>(
      ...args: ParamList[T] extends undefined
        ? [screen: T]
        : [screen: T, params: ParamList[T]]
    ): void;
    pop(count?: number): void;
    popToTop(): void;
    replace<T extends keyof ParamList>(
      ...args: ParamList[T] extends undefined
        ? [screen: T]
        : [screen: T, params: ParamList[T]]
    ): void;
  }

  export type NativeStackScreenProps<
    ParamList extends ParamListBase,
    RouteName extends keyof ParamList = string
  > = {
    navigation: NativeStackNavigationProp<ParamList, RouteName>;
    route: RouteProp<ParamList, RouteName>;
  };

  export function createNativeStackNavigator<ParamList extends ParamListBase>(): any;
}

// Social Auth SDKs
declare module '@react-native-google-signin/google-signin' {
  export interface User {
    user: {
      id: string;
      name: string | null;
      email: string;
      photo: string | null;
      familyName: string | null;
      givenName: string | null;
    };
    scopes: string[];
    idToken: string | null;
    serverAuthCode: string | null;
  }

  export interface ConfigureParams {
    scopes?: string[];
    webClientId?: string;
    iosClientId?: string;
    offlineAccess?: boolean;
    hostedDomain?: string;
    forceCodeForRefreshToken?: boolean;
    accountName?: string;
    profileImageSize?: number;
  }

  export const GoogleSignin: {
    configure(options?: ConfigureParams): void;
    hasPlayServices(options?: { showPlayServicesUpdateDialog?: boolean }): Promise<boolean>;
    signIn(): Promise<User>;
    signInSilently(): Promise<User>;
    signOut(): Promise<null>;
    revokeAccess(): Promise<null>;
    isSignedIn(): Promise<boolean>;
    getCurrentUser(): Promise<User | null>;
    clearCachedAccessToken(token: string): Promise<string>;
    getTokens(): Promise<{ idToken: string; accessToken: string }>;
  };

  export const statusCodes: {
    SIGN_IN_CANCELLED: string;
    IN_PROGRESS: string;
    PLAY_SERVICES_NOT_AVAILABLE: string;
  };
}

declare module '@invertase/react-native-apple-authentication' {
  export interface AppleRequestResponse {
    user: string;
    email: string | null;
    fullName: {
      givenName: string | null;
      familyName: string | null;
      middleName: string | null;
      namePrefix: string | null;
      nameSuffix: string | null;
      nickname: string | null;
    } | null;
    realUserStatus: number;
    identityToken: string | null;
    authorizationCode: string | null;
    nonce?: string;
    state?: string;
  }

  export interface AppleAuthRequestOperation {
    requestedOperation?: number;
    requestedScopes?: number[];
    user?: string;
    state?: string;
    nonce?: string;
  }

  export const appleAuth: {
    isSupported: boolean;
    performRequest(request: AppleAuthRequestOperation): Promise<AppleRequestResponse>;
    getCredentialStateForUser(user: string): Promise<number>;
    onCredentialRevoked(listener: () => void): () => void;
    Operation: {
      IMPLICIT: number;
      LOGIN: number;
      REFRESH: number;
      LOGOUT: number;
    };
    Scope: {
      EMAIL: number;
      FULL_NAME: number;
    };
    State: {
      REVOKED: number;
      AUTHORIZED: number;
      NOT_FOUND: number;
      TRANSFERRED: number;
    };
    Error: {
      CANCELED: string;
      FAILED: string;
      INVALID_RESPONSE: string;
      NOT_HANDLED: string;
      UNKNOWN: string;
    };
  };

  export const AppleAuthRequestOperation: {
    IMPLICIT: number;
    LOGIN: number;
    REFRESH: number;
    LOGOUT: number;
  };

  export const AppleAuthRequestScope: {
    EMAIL: number;
    FULL_NAME: number;
  };

  export const AppleAuthCredentialState: {
    REVOKED: number;
    AUTHORIZED: number;
    NOT_FOUND: number;
    TRANSFERRED: number;
  };

  export const AppleAuthRealUserStatus: {
    UNSUPPORTED: number;
    UNKNOWN: number;
    LIKELY_REAL: number;
  };

  export const AppleAuthError: {
    CANCELED: string;
    FAILED: string;
    INVALID_RESPONSE: string;
    NOT_HANDLED: string;
    UNKNOWN: string;
  };
}

declare module 'react-native-fbsdk-next' {
  export interface LoginResult {
    isCancelled: boolean;
    grantedPermissions?: string[];
    declinedPermissions?: string[];
  }

  export const LoginManager: {
    logInWithPermissions(permissions: string[]): Promise<LoginResult>;
    logOut(): void;
    setLoginBehavior(behavior: string): void;
  };

  export const AccessToken: {
    getCurrentAccessToken(): Promise<{
      accessToken: string;
      applicationID: string;
      userID: string;
      permissions: string[];
      declinedPermissions: string[];
      accessTokenSource: string;
      expirationTime: number;
      lastRefreshTime: number;
      dataAccessExpirationTime: number;
    } | null>;
    refreshCurrentAccessTokenAsync(): Promise<any>;
  };

  export const Profile: {
    getCurrentProfile(): Promise<{
      userID: string;
      email: string | null;
      name: string | null;
      firstName: string | null;
      lastName: string | null;
      middleName: string | null;
      imageURL: string | null;
      linkURL: string | null;
    } | null>;
  };

  export const GraphRequest: new (
    path: string,
    config: { httpMethod?: string; version?: string; parameters?: any; accessToken?: string },
    callback: (error: any, result: any) => void
  ) => any;

  export const GraphRequestManager: new () => {
    addRequest(request: any): any;
    start(): void;
  };

  export const Settings: {
    initializeSDK(): void;
    setAppID(appID: string): void;
  };
}

declare module 'react-native-google-mobile-ads' {
  import { Component } from 'react';
  import { ViewStyle } from 'react-native';

  export interface BannerAdProps {
    unitId: string;
    size: BannerAdSize;
    requestOptions?: RequestOptions;
    onAdLoaded?: () => void;
    onAdFailedToLoad?: (error: Error) => void;
    onAdOpened?: () => void;
    onAdClosed?: () => void;
    style?: ViewStyle;
  }

  export interface RequestOptions {
    requestNonPersonalizedAdsOnly?: boolean;
    keywords?: string[];
    contentUrl?: string;
    networkExtras?: { [key: string]: string };
  }

  export enum BannerAdSize {
    BANNER = 'BANNER',
    LARGE_BANNER = 'LARGE_BANNER',
    MEDIUM_RECTANGLE = 'MEDIUM_RECTANGLE',
    FULL_BANNER = 'FULL_BANNER',
    LEADERBOARD = 'LEADERBOARD',
    SMART_BANNER = 'SMART_BANNER',
    ANCHORED_ADAPTIVE_BANNER = 'ANCHORED_ADAPTIVE_BANNER',
  }

  export class BannerAd extends Component<BannerAdProps> {}

  export const InterstitialAd: {
    createForAdRequest(unitId: string, requestOptions?: RequestOptions): any;
  };

  export const RewardedAd: {
    createForAdRequest(unitId: string, requestOptions?: RequestOptions): any;
  };

  export const TestIds: {
    BANNER: string;
    INTERSTITIAL: string;
    REWARDED: string;
    APP_OPEN: string;
    REWARDED_INTERSTITIAL: string;
  };

  export const AdEventType: {
    LOADED: string;
    ERROR: string;
    OPENED: string;
    CLICKED: string;
    CLOSED: string;
  };

  export const RewardedAdEventType: {
    LOADED: string;
    EARNED_REWARD: string;
  };

  export function useInterstitialAd(unitId: string, requestOptions?: RequestOptions): {
    isLoaded: boolean;
    isClosed: boolean;
    error: Error | undefined;
    load: () => void;
    show: () => void;
  };

  export function useRewardedAd(unitId: string, requestOptions?: RequestOptions): {
    isLoaded: boolean;
    isClosed: boolean;
    isEarnedReward: boolean;
    reward: { type: string; amount: number } | undefined;
    error: Error | undefined;
    load: () => void;
    show: () => void;
  };
}

// Agora SDK - updated for newer versions
declare module 'react-native-agora' {
  import { Component } from 'react';
  import { ViewStyle } from 'react-native';

  export interface RtcEngineContext {
    appId: string;
  }

  export interface IRtcEngine {
    enableVideo(): Promise<void>;
    enableAudio(): Promise<void>;
    disableVideo(): Promise<void>;
    disableAudio(): Promise<void>;
    setChannelProfile(profile: ChannelProfileType | number): Promise<void>;
    setClientRole(role: ClientRoleType | number): Promise<void>;
    setVideoEncoderConfiguration(config: VideoEncoderConfiguration): Promise<void>;
    joinChannel(token: string | null, channelId: string, uid: number, options?: ChannelMediaOptions): Promise<void>;
    leaveChannel(): Promise<void>;
    muteLocalAudioStream(mute: boolean): Promise<void>;
    muteLocalVideoStream(mute: boolean): Promise<void>;
    switchCamera(): Promise<void>;
    destroy(): void;
    addListener(event: string, callback: (...args: any[]) => void): void;
    removeListener(event: string, callback: (...args: any[]) => void): void;
    removeAllListeners(event?: string): void;
    getRtcStats(): Promise<RtcStats>;
  }

  export interface VideoEncoderConfiguration {
    dimensions?: { width: number; height: number };
    frameRate?: number;
    bitrate?: number;
    minBitrate?: number;
    orientationMode?: number;
    degradationPreference?: number;
    mirrorMode?: number;
  }

  export interface ChannelMediaOptions {
    publishCameraTrack?: boolean;
    publishMicrophoneTrack?: boolean;
    autoSubscribeAudio?: boolean;
    autoSubscribeVideo?: boolean;
    clientRoleType?: ClientRoleType | number;
  }

  export interface RtcStats {
    totalDuration: number;
    txBytes: number;
    rxBytes: number;
    txKBitRate: number;
    rxKBitRate: number;
    txAudioKBitRate: number;
    rxAudioKBitRate: number;
    txVideoKBitRate: number;
    rxVideoKBitRate: number;
    txPacketLossRate: number;
    rxPacketLossRate: number;
    userCount: number;
    cpuAppUsage: number;
    cpuTotalUsage: number;
    gatewayRtt: number;
    memoryAppUsageRatio: number;
    memoryTotalUsageRatio: number;
    memoryAppUsageInKbytes: number;
  }

  // Legacy enums (kept for compatibility)
  export const ChannelProfile: {
    Communication: number;
    LiveBroadcasting: number;
    Game: number;
  };

  export const ClientRole: {
    Broadcaster: number;
    Audience: number;
  };

  export const VideoMirrorMode: {
    Auto: number;
    Enabled: number;
    Disabled: number;
  };

  export enum ChannelProfileType {
    ChannelProfileCommunication = 0,
    ChannelProfileLiveBroadcasting = 1,
    ChannelProfileGame = 2,
  }

  export enum ClientRoleType {
    ClientRoleBroadcaster = 1,
    ClientRoleAudience = 2,
  }

  export enum VideoMirrorModeType {
    VideoMirrorModeAuto = 0,
    VideoMirrorModeEnabled = 1,
    VideoMirrorModeDisabled = 2,
  }

  export function createAgoraRtcEngine(): IRtcEngine;

  // RtcSurfaceView component
  export interface RtcSurfaceViewProps {
    canvas?: VideoCanvas;
    style?: ViewStyle;
    zOrderOnTop?: boolean;
    zOrderMediaOverlay?: boolean;
  }

  export class RtcSurfaceView extends Component<RtcSurfaceViewProps> {}

  export interface VideoCanvas {
    uid?: number;
    renderMode?: number;
    mirrorMode?: number;
    sourceType?: number;
    setupMode?: number;
  }

  // Legacy support - some apps use default export
  const RtcEngine: {
    create(appId: string): Promise<IRtcEngine>;
    createWithContext(context: RtcEngineContext): Promise<IRtcEngine>;
  };

  export { VideoCanvas };
  export default RtcEngine;
}

// React Native Reanimated - useAnimatedGestureHandler is deprecated
declare module 'react-native-reanimated' {
  import { Component } from 'react';
  import { ViewStyle, ViewProps, TextStyle, ImageStyle } from 'react-native';

  export interface SharedValue<T> {
    value: T;
  }

  export function useSharedValue<T>(initialValue: T): SharedValue<T>;
  export function useAnimatedStyle<T extends ViewStyle | TextStyle | ImageStyle>(
    updater: () => T,
    deps?: any[]
  ): T;

  // Deprecated but still available for backward compatibility
  export function useAnimatedGestureHandler<
    Event extends object,
    Context extends object = Record<string, unknown>
  >(
    handlers: {
      onStart?: (event: Event, context: Context) => void;
      onActive?: (event: Event, context: Context) => void;
      onEnd?: (event: Event, context: Context) => void;
      onCancel?: (event: Event, context: Context) => void;
      onFail?: (event: Event, context: Context) => void;
      onFinish?: (event: Event, context: Context, isCanceledOrFailed: boolean) => void;
    },
    deps?: any[]
  ): (event: Event) => void;

  export function useAnimatedScrollHandler(
    handlers: {
      onScroll?: (event: any, context: any) => void;
      onBeginDrag?: (event: any, context: any) => void;
      onEndDrag?: (event: any, context: any) => void;
      onMomentumBegin?: (event: any, context: any) => void;
      onMomentumEnd?: (event: any, context: any) => void;
    },
    deps?: any[]
  ): any;

  export function withSpring<T>(value: T, config?: any): T;
  export function withTiming<T>(value: T, config?: any, callback?: (finished?: boolean) => void): T;
  export function withDecay(config?: any): any;
  export function withDelay(delayMs: number, animation: any): any;
  export function withSequence(...animations: any[]): any;
  export function withRepeat(animation: any, numberOfReps?: number, reverse?: boolean, callback?: (finished?: boolean) => void): any;
  export function runOnJS<T extends (...args: any[]) => any>(fn: T): T;
  export function runOnUI<T extends (...args: any[]) => any>(fn: T): T;
  export function interpolate(value: number, inputRange: number[], outputRange: number[], extrapolation?: any): number;
  export function interpolateColor(value: number, inputRange: number[], outputRange: string[]): string;
  export function cancelAnimation(sharedValue: SharedValue<any>): void;
  export function makeMutable<T>(initialValue: T): SharedValue<T>;
  export function useDerivedValue<T>(updater: () => T, deps?: any[]): SharedValue<T>;
  export function useAnimatedRef<T extends Component>(): { current: T | null };
  export function measure(animatedRef: any): { x: number; y: number; width: number; height: number; pageX: number; pageY: number } | null;

  export const Extrapolate: {
    EXTEND: string;
    CLAMP: string;
    IDENTITY: string;
  };

  export const Easing: {
    linear: any;
    ease: any;
    quad: any;
    cubic: any;
    poly: (n: number) => any;
    sin: any;
    circle: any;
    exp: any;
    elastic: (bounciness?: number) => any;
    back: (s?: number) => any;
    bounce: any;
    bezier: (x1: number, y1: number, x2: number, y2: number) => any;
    in: (easing: any) => any;
    out: (easing: any) => any;
    inOut: (easing: any) => any;
  };

  // Animated components
  export const View: Component<ViewProps>;
  export const Text: Component<any>;
  export const Image: Component<any>;
  export const ScrollView: Component<any>;
  export const FlatList: Component<any>;

  const Animated: {
    View: Component<ViewProps>;
    Text: Component<any>;
    Image: Component<any>;
    ScrollView: Component<any>;
    FlatList: Component<any>;
    createAnimatedComponent: <T extends Component>(component: T) => T;
  };

  export default Animated;
}

// PanGestureHandler event with nativeEvent
declare module 'react-native-gesture-handler' {
  import { Component } from 'react';
  import { ViewProps } from 'react-native';

  export interface GestureEvent<T = {}> {
    nativeEvent: T;
  }

  export interface PanGestureHandlerEventPayload {
    translationX: number;
    translationY: number;
    velocityX: number;
    velocityY: number;
    absoluteX: number;
    absoluteY: number;
    x: number;
    y: number;
    state: number;
  }

  export type PanGestureHandlerGestureEvent = GestureEvent<PanGestureHandlerEventPayload> & PanGestureHandlerEventPayload;

  export interface PanGestureHandlerProps extends ViewProps {
    enabled?: boolean;
    minPointers?: number;
    maxPointers?: number;
    minDist?: number;
    minVelocity?: number;
    minVelocityX?: number;
    minVelocityY?: number;
    activeOffsetX?: number | number[];
    activeOffsetY?: number | number[];
    failOffsetX?: number | number[];
    failOffsetY?: number | number[];
    avgTouches?: boolean;
    enableTrackpadTwoFingerGesture?: boolean;
    onGestureEvent?: (event: PanGestureHandlerGestureEvent) => void;
    onHandlerStateChange?: (event: PanGestureHandlerGestureEvent) => void;
    children?: React.ReactNode;
  }

  export class PanGestureHandler extends Component<PanGestureHandlerProps> {}
  export class TapGestureHandler extends Component<any> {}
  export class LongPressGestureHandler extends Component<any> {}
  export class GestureHandlerRootView extends Component<ViewProps & { children?: React.ReactNode }> {}

  export const State: {
    UNDETERMINED: number;
    FAILED: number;
    BEGAN: number;
    CANCELLED: number;
    ACTIVE: number;
    END: number;
  };
}

// Messaging service types
declare module '../../services/api/messaging' {
  export interface Message {
    id: string;
    conversationId: string;
    senderId: string;
    content: string;
    type: 'text' | 'image' | 'gif' | 'voice';
    mediaUrl?: string;
    createdAt: string;
    readAt?: string;
  }

  export interface Conversation {
    id: string;
    participants: string[];
    lastMessage?: Message;
    createdAt: string;
    updatedAt: string;
  }

  export interface MessagingService {
    getConversations(): Promise<Conversation[]>;
    getMessages(conversationId: string, page?: number): Promise<Message[]>;
    sendMessage(conversationId: string, content: string, type?: string): Promise<Message>;
    markAsRead(conversationId: string): Promise<void>;
  }
}

// Additional native module declarations
declare module 'react-native-keychain' {
  export interface UserCredentials {
    username: string;
    password: string;
    service?: string;
  }
  export function setGenericPassword(username: string, password: string, options?: any): Promise<boolean>;
  export function getGenericPassword(options?: any): Promise<UserCredentials | false>;
  export function resetGenericPassword(options?: any): Promise<boolean>;
}

declare module 'expo-local-authentication' {
  export enum AuthenticationType {
    FINGERPRINT = 1,
    FACIAL_RECOGNITION = 2,
    IRIS = 3,
  }
  export function hasHardwareAsync(): Promise<boolean>;
  export function isEnrolledAsync(): Promise<boolean>;
  export function authenticateAsync(options?: any): Promise<{ success: boolean; error?: string }>;
}

declare module 'react-native-haptic-feedback' {
  export type HapticFeedbackTypes =
    | 'selection'
    | 'impactLight'
    | 'impactMedium'
    | 'impactHeavy'
    | 'notificationSuccess'
    | 'notificationWarning'
    | 'notificationError';
  export function trigger(type: HapticFeedbackTypes, options?: any): void;
  const HapticFeedback: { trigger: typeof trigger };
  export default HapticFeedback;
}

declare module 'react-native-config' {
  const Config: { [key: string]: string };
  export default Config;
}

declare module '@sentry/react-native' {
  export function init(options: any): void;
  export function captureException(error: Error, context?: any): void;
  export function captureMessage(message: string, level?: string): void;
  export function setUser(user: any): void;
  export function setTag(key: string, value: string): void;
  export function setContext(name: string, context: any): void;
  export function addBreadcrumb(breadcrumb: any): void;
  export const Severity: { Debug: string; Info: string; Warning: string; Error: string; Fatal: string };
}

declare module 'jail-monkey' {
  export function isJailBroken(): boolean;
  export function canMockLocation(): boolean;
  export function isOnExternalStorage(): boolean;
  export function isDebuggedMode(): boolean;
}

declare module 'react-native-screen-capture' {
  export function enableSecureView(): void;
  export function disableSecureView(): void;
  export function addListener(event: string, callback: () => void): any;
}

declare module 'react-native-iap' {
  export interface Purchase {
    productId: string;
    transactionId?: string;
    transactionReceipt?: string;
    purchaseToken?: string;
    originalTransactionIdentifierIOS?: string;
  }
  export interface Product {
    productId: string;
    title: string;
    description: string;
    price: string;
    currency: string;
    localizedPrice: string;
  }
  export interface Subscription extends Product {
    subscriptionPeriodNumberIOS?: string;
    subscriptionPeriodUnitIOS?: string;
  }
  export function initConnection(): Promise<boolean>;
  export function endConnection(): Promise<void>;
  export function getProducts(options: any): Promise<Product[]>;
  export function getSubscriptions(options: any): Promise<Subscription[]>;
  export function requestPurchase(options: any): Promise<Purchase>;
  export function requestSubscription(options: any): Promise<Purchase>;
  export function finishTransaction(options: any): Promise<string>;
  export function getPurchaseHistory(): Promise<Purchase[]>;
  export function getAvailablePurchases(): Promise<Purchase[]>;
  export function consumePurchaseAndroid(token: string): Promise<void>;
  export const purchaseUpdatedListener: (callback: (purchase: Purchase) => void) => any;
  export const purchaseErrorListener: (callback: (error: any) => void) => any;
}
