/**
 * Type declarations for external modules without TypeScript definitions
 */

declare module 'expo-linear-gradient' {
  import { ComponentType } from 'react';
  import { ViewProps } from 'react-native';

  export interface LinearGradientProps extends ViewProps {
    colors: string[];
    start?: { x: number; y: number };
    end?: { x: number; y: number };
    locations?: number[];
  }

  export const LinearGradient: ComponentType<LinearGradientProps>;
}

declare module 'react-native-linear-gradient' {
  import { ComponentType } from 'react';
  import { ViewProps } from 'react-native';

  export interface LinearGradientProps extends ViewProps {
    colors: string[];
    start?: { x: number; y: number };
    end?: { x: number; y: number };
    locations?: number[];
    useAngle?: boolean;
    angle?: number;
    angleCenter?: { x: number; y: number };
  }

  const LinearGradient: ComponentType<LinearGradientProps>;
  export default LinearGradient;
}

declare module 'react-native-iap' {
  export interface Product {
    productId: string;
    price: string;
    currency: string;
    localizedPrice: string;
    title: string;
    description: string;
  }

  export interface Purchase {
    productId: string;
    transactionId: string;
    transactionDate: number;
    transactionReceipt: string;
    purchaseToken?: string;
  }

  export interface Subscription extends Product {
    subscriptionPeriodNumberIOS?: string;
    subscriptionPeriodUnitIOS?: string;
    introductoryPrice?: string;
    introductoryPricePaymentModeIOS?: string;
    introductoryPriceNumberOfPeriodsIOS?: string;
    introductoryPriceSubscriptionPeriodIOS?: string;
    freeTrialPeriodAndroid?: string;
    introductoryPriceCyclesAndroid?: number;
    introductoryPricePeriodAndroid?: string;
    subscriptionPeriodAndroid?: string;
  }

  export function initConnection(): Promise<boolean>;
  export function endConnection(): Promise<void>;
  export function getProducts(skus: string[]): Promise<Product[]>;
  export function getSubscriptions(skus: string[]): Promise<Subscription[]>;
  export function requestPurchase(
    sku: string,
    andDangerouslyFinishTransactionAutomaticallyIOS?: boolean
  ): Promise<Purchase>;
  export function requestSubscription(
    sku: string,
    andDangerouslyFinishTransactionAutomaticallyIOS?: boolean
  ): Promise<Purchase>;
  export function finishTransaction(purchase: Purchase, isConsumable?: boolean): Promise<string>;
  export function getAvailablePurchases(): Promise<Purchase[]>;
  export function getPurchaseHistory(): Promise<Purchase[]>;
  export function validateReceiptIos(receiptBody: object, isTest?: boolean): Promise<object>;
  export function validateReceiptAndroid(
    packageName: string,
    productId: string,
    productToken: string,
    accessToken: string,
    isSub?: boolean
  ): Promise<object>;
  export function clearTransactionIOS(): Promise<void>;
  export function clearProductsIOS(): Promise<void>;

  export const purchaseUpdatedListener: (listener: (purchase: Purchase) => void) => () => void;
  export const purchaseErrorListener: (listener: (error: Error) => void) => () => void;
}

declare module '@expo/vector-icons' {
  import { ComponentType } from 'react';
  import { TextProps } from 'react-native';

  export interface IconProps extends TextProps {
    name: string;
    size?: number;
    color?: string;
  }

  export const AntDesign: ComponentType<IconProps>;
  export const Entypo: ComponentType<IconProps>;
  export const EvilIcons: ComponentType<IconProps>;
  export const Feather: ComponentType<IconProps>;
  export const FontAwesome: ComponentType<IconProps>;
  export const FontAwesome5: ComponentType<IconProps>;
  export const Fontisto: ComponentType<IconProps>;
  export const Foundation: ComponentType<IconProps>;
  export const Ionicons: ComponentType<IconProps>;
  export const MaterialCommunityIcons: ComponentType<IconProps>;
  export const MaterialIcons: ComponentType<IconProps>;
  export const Octicons: ComponentType<IconProps>;
  export const SimpleLineIcons: ComponentType<IconProps>;
  export const Zocial: ComponentType<IconProps>;
}

declare module '@react-native-community/datetimepicker' {
  import { ComponentType } from 'react';

  export type IOSMode = 'date' | 'time' | 'datetime' | 'countdown';
  export type AndroidMode = 'date' | 'time';
  export type Display = 'default' | 'spinner' | 'calendar' | 'clock' | 'compact' | 'inline';

  export interface DateTimePickerEvent {
    type: 'set' | 'dismissed';
    nativeEvent: {
      timestamp: number;
    };
  }

  export interface DateTimePickerProps {
    value: Date;
    mode?: IOSMode | AndroidMode;
    display?: Display;
    onChange?: (event: DateTimePickerEvent, date?: Date) => void;
    maximumDate?: Date;
    minimumDate?: Date;
    timeZoneOffsetInMinutes?: number;
    timeZoneOffsetInSeconds?: number;
    dayOfWeekFormat?: string;
    dateFormat?: string;
    firstDayOfWeek?: number;
    textColor?: string;
    accentColor?: string;
    themeVariant?: 'light' | 'dark';
    locale?: string;
    is24Hour?: boolean;
    minuteInterval?: 1 | 2 | 3 | 4 | 5 | 6 | 10 | 12 | 15 | 20 | 30;
    style?: object;
    disabled?: boolean;
    testID?: string;
  }

  const DateTimePicker: ComponentType<DateTimePickerProps>;
  export default DateTimePicker;
}
