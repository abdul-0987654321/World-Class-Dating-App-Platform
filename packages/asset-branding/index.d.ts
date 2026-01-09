/**
 * Flamoral Brand System - TypeScript Declarations
 */

export interface ColorToken {
  [key: string]: string | ColorToken;
}

export interface TypographyToken {
  fontFamily: { sans: string; mono: string; };
  fontSize: { [key: string]: string; };
  fontWeight: { [key: string]: number; };
  lineHeight: { [key: string]: number | string; };
  letterSpacing: { [key: string]: string; };
}

export interface SpacingToken { [key: string]: string; }
export interface BorderRadiusToken { [key: string]: string; }
export interface ShadowToken { [key: string]: string; }

export interface Tokens {
  colors: ColorToken;
  typography: TypographyToken;
  spacing: SpacingToken;
  borderRadius: BorderRadiusToken;
  shadows: ShadowToken;
}

export declare const tokens: Tokens;
export declare const colors: ColorToken;
export declare const typography: TypographyToken;
export declare const spacing: SpacingToken;
export declare const borderRadius: BorderRadiusToken;
export declare const shadows: ShadowToken;
export declare const icons: Record<string, string>;

export declare function getColor(path: string): string | undefined;
export declare function getCSSVariable(category: string, name: string): string;
export declare function toCSS(): string;

declare const _default: {
  tokens: Tokens;
  colors: ColorToken;
  typography: TypographyToken;
  spacing: SpacingToken;
  borderRadius: BorderRadiusToken;
  shadows: ShadowToken;
  getColor: typeof getColor;
  getCSSVariable: typeof getCSSVariable;
  toCSS: typeof toCSS;
  icons: Record<string, string>;
};

export default _default;