/**
 * Tax Calculation Service
 *
 * Handles tax calculation for different regions including:
 * - US (state-level sales tax with nexus consideration)
 * - EU (VAT with reverse charge for B2B)
 * - UK (VAT at 20%)
 * - Canada (GST/HST/PST)
 * - Australia (GST at 10%)
 *
 * P0-003: Tax calculation implementation
 */

import { createLogger } from '@flamoral/backend-shared';

const logger = createLogger('tax-calculation-service');

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Supported tax types
 */
export type TaxType = 'VAT' | 'GST' | 'HST' | 'PST' | 'SALES_TAX' | 'NONE';

/**
 * Tax jurisdiction information
 */
export interface TaxJurisdiction {
  country: string;
  state?: string;
  postalCode?: string;
  name: string;
  type: TaxType;
}

/**
 * Individual tax rate configuration
 */
export interface TaxRate {
  jurisdiction: TaxJurisdiction;
  rate: number; // As decimal (e.g., 0.20 for 20%)
  type: TaxType;
  name: string;
  description?: string;
  isCompound?: boolean; // For compound taxes like Canada PST in some provinces
  appliesTo?: 'all' | 'digital' | 'physical';
}

/**
 * Tax breakdown item for detailed reporting
 */
export interface TaxBreakdownItem {
  name: string;
  rate: number;
  amount: number;
  type: TaxType;
  jurisdiction: string;
}

/**
 * Tax calculation result
 */
export interface TaxResult {
  taxAmount: number;
  taxRate: number; // Combined effective rate
  taxType: TaxType;
  jurisdiction: TaxJurisdiction;
  breakdown: TaxBreakdownItem[];
  isReverseCharge: boolean; // For EU B2B transactions
  isTaxExempt: boolean;
  exemptionReason?: string;
  currency: string;
  calculatedAt: Date;
}

/**
 * Tax exemption record
 */
export interface TaxExemption {
  id: string;
  userId: string;
  exemptionType: 'business' | 'nonprofit' | 'government' | 'reseller' | 'diplomatic';
  vatNumber?: string;
  certificateId?: string;
  country: string;
  state?: string;
  validFrom: Date;
  validUntil?: Date;
  isVerified: boolean;
  verifiedAt?: Date;
}

/**
 * Input for tax calculation
 */
export interface TaxCalculationInput {
  amount: number;
  currency?: string;
  country: string;
  state?: string;
  postalCode?: string;
  isB2B?: boolean;
  vatNumber?: string;
  userId?: string;
  productType?: 'subscription' | 'digital_goods' | 'physical_goods';
}

/**
 * Stripe Tax integration placeholder config
 */
export interface StripeTaxConfig {
  enabled: boolean;
  automaticTax: boolean;
  taxBehavior: 'exclusive' | 'inclusive';
}

// ============================================================================
// Tax Rate Configuration (Static Data)
// ============================================================================

/**
 * US State Sales Tax Rates
 * Note: These are base state rates. Local taxes may apply additionally.
 * Digital goods taxability varies by state.
 */
const US_STATE_TAX_RATES: Record<string, { rate: number; hasLocalTax: boolean; taxesDigital: boolean }> = {
  AL: { rate: 0.04, hasLocalTax: true, taxesDigital: true },
  AK: { rate: 0, hasLocalTax: true, taxesDigital: false }, // No state tax, local only
  AZ: { rate: 0.056, hasLocalTax: true, taxesDigital: true },
  AR: { rate: 0.065, hasLocalTax: true, taxesDigital: true },
  CA: { rate: 0.0725, hasLocalTax: true, taxesDigital: false },
  CO: { rate: 0.029, hasLocalTax: true, taxesDigital: true },
  CT: { rate: 0.0635, hasLocalTax: false, taxesDigital: true },
  DE: { rate: 0, hasLocalTax: false, taxesDigital: false }, // No sales tax
  DC: { rate: 0.06, hasLocalTax: false, taxesDigital: true },
  FL: { rate: 0.06, hasLocalTax: true, taxesDigital: true },
  GA: { rate: 0.04, hasLocalTax: true, taxesDigital: false },
  HI: { rate: 0.04, hasLocalTax: true, taxesDigital: true },
  ID: { rate: 0.06, hasLocalTax: true, taxesDigital: true },
  IL: { rate: 0.0625, hasLocalTax: true, taxesDigital: false },
  IN: { rate: 0.07, hasLocalTax: false, taxesDigital: true },
  IA: { rate: 0.06, hasLocalTax: true, taxesDigital: true },
  KS: { rate: 0.065, hasLocalTax: true, taxesDigital: true },
  KY: { rate: 0.06, hasLocalTax: false, taxesDigital: true },
  LA: { rate: 0.0445, hasLocalTax: true, taxesDigital: true },
  ME: { rate: 0.055, hasLocalTax: false, taxesDigital: false },
  MD: { rate: 0.06, hasLocalTax: false, taxesDigital: true },
  MA: { rate: 0.0625, hasLocalTax: false, taxesDigital: false },
  MI: { rate: 0.06, hasLocalTax: false, taxesDigital: false },
  MN: { rate: 0.06875, hasLocalTax: true, taxesDigital: true },
  MS: { rate: 0.07, hasLocalTax: true, taxesDigital: true },
  MO: { rate: 0.04225, hasLocalTax: true, taxesDigital: false },
  MT: { rate: 0, hasLocalTax: false, taxesDigital: false }, // No sales tax
  NE: { rate: 0.055, hasLocalTax: true, taxesDigital: true },
  NV: { rate: 0.0685, hasLocalTax: true, taxesDigital: false },
  NH: { rate: 0, hasLocalTax: false, taxesDigital: false }, // No sales tax
  NJ: { rate: 0.06625, hasLocalTax: false, taxesDigital: true },
  NM: { rate: 0.05125, hasLocalTax: true, taxesDigital: true },
  NY: { rate: 0.04, hasLocalTax: true, taxesDigital: true },
  NC: { rate: 0.0475, hasLocalTax: true, taxesDigital: true },
  ND: { rate: 0.05, hasLocalTax: true, taxesDigital: false },
  OH: { rate: 0.0575, hasLocalTax: true, taxesDigital: true },
  OK: { rate: 0.045, hasLocalTax: true, taxesDigital: true },
  OR: { rate: 0, hasLocalTax: false, taxesDigital: false }, // No sales tax
  PA: { rate: 0.06, hasLocalTax: true, taxesDigital: true },
  RI: { rate: 0.07, hasLocalTax: false, taxesDigital: true },
  SC: { rate: 0.06, hasLocalTax: true, taxesDigital: true },
  SD: { rate: 0.045, hasLocalTax: true, taxesDigital: true },
  TN: { rate: 0.07, hasLocalTax: true, taxesDigital: true },
  TX: { rate: 0.0625, hasLocalTax: true, taxesDigital: true },
  UT: { rate: 0.061, hasLocalTax: true, taxesDigital: true },
  VT: { rate: 0.06, hasLocalTax: true, taxesDigital: true },
  VA: { rate: 0.053, hasLocalTax: true, taxesDigital: false },
  WA: { rate: 0.065, hasLocalTax: true, taxesDigital: true },
  WV: { rate: 0.06, hasLocalTax: true, taxesDigital: true },
  WI: { rate: 0.05, hasLocalTax: true, taxesDigital: true },
  WY: { rate: 0.04, hasLocalTax: true, taxesDigital: true },
};

/**
 * EU VAT Rates (Standard rates for digital services)
 */
const EU_VAT_RATES: Record<string, number> = {
  AT: 0.20, // Austria
  BE: 0.21, // Belgium
  BG: 0.20, // Bulgaria
  HR: 0.25, // Croatia
  CY: 0.19, // Cyprus
  CZ: 0.21, // Czech Republic
  DK: 0.25, // Denmark
  EE: 0.22, // Estonia
  FI: 0.24, // Finland
  FR: 0.20, // France
  DE: 0.19, // Germany
  GR: 0.24, // Greece
  HU: 0.27, // Hungary
  IE: 0.23, // Ireland
  IT: 0.22, // Italy
  LV: 0.21, // Latvia
  LT: 0.21, // Lithuania
  LU: 0.17, // Luxembourg
  MT: 0.18, // Malta
  NL: 0.21, // Netherlands
  PL: 0.23, // Poland
  PT: 0.23, // Portugal
  RO: 0.19, // Romania
  SK: 0.20, // Slovakia
  SI: 0.22, // Slovenia
  ES: 0.21, // Spain
  SE: 0.25, // Sweden
};

/**
 * Canadian Province Tax Rates
 * GST: 5% federal (all provinces)
 * HST: Combined federal + provincial (some provinces)
 * PST: Provincial sales tax (some provinces, on top of GST)
 */
const CANADA_TAX_RATES: Record<string, { gst: number; hst?: number; pst?: number; qst?: number }> = {
  AB: { gst: 0.05 }, // Alberta - GST only
  BC: { gst: 0.05, pst: 0.07 }, // British Columbia - GST + PST
  MB: { gst: 0.05, pst: 0.07 }, // Manitoba - GST + PST
  NB: { hst: 0.15 }, // New Brunswick - HST
  NL: { hst: 0.15 }, // Newfoundland and Labrador - HST
  NT: { gst: 0.05 }, // Northwest Territories - GST only
  NS: { hst: 0.15 }, // Nova Scotia - HST
  NU: { gst: 0.05 }, // Nunavut - GST only
  ON: { hst: 0.13 }, // Ontario - HST
  PE: { hst: 0.15 }, // Prince Edward Island - HST
  QC: { gst: 0.05, qst: 0.09975 }, // Quebec - GST + QST
  SK: { gst: 0.05, pst: 0.06 }, // Saskatchewan - GST + PST
  YT: { gst: 0.05 }, // Yukon - GST only
};

/**
 * States where we have tax nexus (must collect tax)
 * In production, this should be configurable and stored in database
 */
const US_NEXUS_STATES: Set<string> = new Set([
  'CA', 'NY', 'TX', 'FL', 'WA', 'PA', 'IL', 'OH', 'GA', 'NC',
  'NJ', 'VA', 'MI', 'AZ', 'MA', 'TN', 'IN', 'MO', 'MD', 'CO',
]);

// ============================================================================
// Tax Calculation Service
// ============================================================================

export class TaxCalculationService {
  private taxExemptions: Map<string, TaxExemption> = new Map();
  private stripeTaxConfig: StripeTaxConfig;

  constructor() {
    this.stripeTaxConfig = {
      enabled: process.env.STRIPE_TAX_ENABLED === 'true',
      automaticTax: process.env.STRIPE_AUTOMATIC_TAX === 'true',
      taxBehavior: (process.env.STRIPE_TAX_BEHAVIOR as 'exclusive' | 'inclusive') || 'exclusive',
    };

    logger.info('TaxCalculationService initialized', {
      stripeTaxEnabled: this.stripeTaxConfig.enabled,
    });
  }

  // ==========================================================================
  // Main Tax Calculation Methods
  // ==========================================================================

  /**
   * Calculate tax for a given amount and location
   */
  calculateTax(
    amount: number,
    country: string,
    state?: string,
    postalCode?: string,
    options?: {
      isB2B?: boolean;
      vatNumber?: string;
      userId?: string;
      productType?: 'subscription' | 'digital_goods' | 'physical_goods';
      currency?: string;
    }
  ): TaxResult {
    const input: TaxCalculationInput = {
      amount,
      country: country.toUpperCase(),
      state: state?.toUpperCase(),
      postalCode,
      currency: options?.currency || 'USD',
      isB2B: options?.isB2B,
      vatNumber: options?.vatNumber,
      userId: options?.userId,
      productType: options?.productType || 'subscription',
    };

    logger.debug('Calculating tax', { input });

    // Check for Stripe Tax integration
    if (this.stripeTaxConfig.enabled && this.stripeTaxConfig.automaticTax) {
      // In production, delegate to Stripe Tax API
      logger.info('Stripe Tax is enabled - would delegate to Stripe Tax API');
      // return this.calculateWithStripeTax(input);
    }

    // Check for tax exemption
    if (input.userId) {
      const exemption = this.checkUserExemption(input.userId, input.country, input.state);
      if (exemption) {
        return this.createExemptResult(input, exemption);
      }
    }

    // Route to appropriate regional calculator
    switch (input.country) {
      case 'US':
        return this.calculateUSTax(input);
      case 'GB':
      case 'UK':
        return this.calculateUKTax(input);
      case 'AU':
        return this.calculateAustraliaTax(input);
      case 'CA':
        return this.calculateCanadaTax(input);
      default:
        if (this.isEUCountry(input.country)) {
          return this.calculateEUTax(input);
        }
        return this.createNoTaxResult(input);
    }
  }

  /**
   * Get tax rates for a given location
   */
  getTaxRates(country: string, state?: string): TaxRate[] {
    const rates: TaxRate[] = [];
    const countryUpper = country.toUpperCase();
    const stateUpper = state?.toUpperCase();

    switch (countryUpper) {
      case 'US':
        if (stateUpper && US_STATE_TAX_RATES[stateUpper]) {
          const stateRate = US_STATE_TAX_RATES[stateUpper];
          if (stateRate.rate > 0) {
            rates.push({
              jurisdiction: {
                country: 'US',
                state: stateUpper,
                name: `${stateUpper} Sales Tax`,
                type: 'SALES_TAX',
              },
              rate: stateRate.rate,
              type: 'SALES_TAX',
              name: `${stateUpper} State Sales Tax`,
              description: stateRate.hasLocalTax ? 'Base state rate; local taxes may apply' : 'State rate only',
              appliesTo: stateRate.taxesDigital ? 'all' : 'physical',
            });
          }
        } else {
          // Return all US state rates
          for (const [st, config] of Object.entries(US_STATE_TAX_RATES)) {
            if (config.rate > 0) {
              rates.push({
                jurisdiction: {
                  country: 'US',
                  state: st,
                  name: `${st} Sales Tax`,
                  type: 'SALES_TAX',
                },
                rate: config.rate,
                type: 'SALES_TAX',
                name: `${st} State Sales Tax`,
                appliesTo: config.taxesDigital ? 'all' : 'physical',
              });
            }
          }
        }
        break;

      case 'GB':
      case 'UK':
        rates.push({
          jurisdiction: {
            country: 'GB',
            name: 'United Kingdom VAT',
            type: 'VAT',
          },
          rate: 0.20,
          type: 'VAT',
          name: 'UK VAT',
          description: 'Standard VAT rate',
          appliesTo: 'all',
        });
        break;

      case 'AU':
        rates.push({
          jurisdiction: {
            country: 'AU',
            name: 'Australian GST',
            type: 'GST',
          },
          rate: 0.10,
          type: 'GST',
          name: 'Australian GST',
          description: 'Goods and Services Tax',
          appliesTo: 'all',
        });
        break;

      case 'CA':
        if (stateUpper && CANADA_TAX_RATES[stateUpper]) {
          const provinceTax = CANADA_TAX_RATES[stateUpper];
          if (provinceTax.hst) {
            rates.push({
              jurisdiction: {
                country: 'CA',
                state: stateUpper,
                name: `${stateUpper} HST`,
                type: 'HST',
              },
              rate: provinceTax.hst,
              type: 'HST',
              name: `${stateUpper} Harmonized Sales Tax`,
              description: 'Combined federal and provincial tax',
              appliesTo: 'all',
            });
          } else {
            rates.push({
              jurisdiction: {
                country: 'CA',
                state: stateUpper,
                name: 'Federal GST',
                type: 'GST',
              },
              rate: provinceTax.gst,
              type: 'GST',
              name: 'Federal GST',
              description: 'Federal Goods and Services Tax',
              appliesTo: 'all',
            });

            if (provinceTax.pst) {
              rates.push({
                jurisdiction: {
                  country: 'CA',
                  state: stateUpper,
                  name: `${stateUpper} PST`,
                  type: 'PST',
                },
                rate: provinceTax.pst,
                type: 'PST',
                name: `${stateUpper} Provincial Sales Tax`,
                appliesTo: 'all',
              });
            }

            if (provinceTax.qst) {
              rates.push({
                jurisdiction: {
                  country: 'CA',
                  state: 'QC',
                  name: 'Quebec QST',
                  type: 'PST',
                },
                rate: provinceTax.qst,
                type: 'PST',
                name: 'Quebec Sales Tax',
                description: 'Calculated on amount + GST (compound)',
                isCompound: true,
                appliesTo: 'all',
              });
            }
          }
        }
        break;

      default:
        if (this.isEUCountry(countryUpper) && EU_VAT_RATES[countryUpper]) {
          rates.push({
            jurisdiction: {
              country: countryUpper,
              name: `${countryUpper} VAT`,
              type: 'VAT',
            },
            rate: EU_VAT_RATES[countryUpper],
            type: 'VAT',
            name: `${countryUpper} Value Added Tax`,
            description: 'Standard VAT rate for digital services',
            appliesTo: 'all',
          });
        }
    }

    return rates;
  }

  /**
   * Validate a tax exemption for a user
   */
  validateTaxExemption(userId: string, exemptionId: string): boolean {
    const key = `${userId}:${exemptionId}`;
    const exemption = this.taxExemptions.get(key);

    if (!exemption) {
      logger.debug('Tax exemption not found', { userId, exemptionId });
      return false;
    }

    // Check if exemption is valid
    const now = new Date();
    if (exemption.validFrom > now) {
      logger.debug('Tax exemption not yet valid', { userId, exemptionId });
      return false;
    }

    if (exemption.validUntil && exemption.validUntil < now) {
      logger.debug('Tax exemption expired', { userId, exemptionId });
      return false;
    }

    if (!exemption.isVerified) {
      logger.debug('Tax exemption not verified', { userId, exemptionId });
      return false;
    }

    return true;
  }

  // ==========================================================================
  // Regional Tax Calculators
  // ==========================================================================

  /**
   * Calculate US sales tax
   */
  private calculateUSTax(input: TaxCalculationInput): TaxResult {
    const breakdown: TaxBreakdownItem[] = [];
    let totalTaxRate = 0;
    let totalTaxAmount = 0;
    const productType = input.productType || 'subscription';

    // Digital goods (subscriptions) are not taxed in all states
    const isDigital = productType === 'subscription' || productType === 'digital_goods';

    if (input.state && US_STATE_TAX_RATES[input.state]) {
      const stateConfig = US_STATE_TAX_RATES[input.state];

      // Check if we have nexus in this state
      if (!US_NEXUS_STATES.has(input.state)) {
        logger.debug('No nexus in state', { state: input.state });
        return this.createNoTaxResult(input, 'No nexus in state');
      }

      // Check if digital goods are taxed
      if (isDigital && !stateConfig.taxesDigital) {
        logger.debug('Digital goods not taxed in state', { state: input.state });
        return this.createNoTaxResult(input, 'Digital goods exempt in state');
      }

      // Apply state tax
      if (stateConfig.rate > 0) {
        const stateTaxAmount = Math.round(input.amount * stateConfig.rate);
        totalTaxRate += stateConfig.rate;
        totalTaxAmount += stateTaxAmount;

        breakdown.push({
          name: `${input.state} State Sales Tax`,
          rate: stateConfig.rate,
          amount: stateTaxAmount,
          type: 'SALES_TAX',
          jurisdiction: `US-${input.state}`,
        });
      }

      // Note: In production, would also calculate local taxes based on postal code
      // This would require integration with a tax data provider like Avalara or TaxJar
    }

    return {
      taxAmount: totalTaxAmount,
      taxRate: totalTaxRate,
      taxType: 'SALES_TAX',
      jurisdiction: {
        country: 'US',
        state: input.state,
        postalCode: input.postalCode,
        name: input.state ? `${input.state}, United States` : 'United States',
        type: 'SALES_TAX',
      },
      breakdown,
      isReverseCharge: false,
      isTaxExempt: totalTaxAmount === 0,
      currency: input.currency || 'USD',
      calculatedAt: new Date(),
    };
  }

  /**
   * Calculate EU VAT
   */
  private calculateEUTax(input: TaxCalculationInput): TaxResult {
    const breakdown: TaxBreakdownItem[] = [];

    // Check for B2B reverse charge
    if (input.isB2B && input.vatNumber) {
      // In production, validate VAT number via VIES
      const isValidVAT = this.validateVATNumber(input.vatNumber);
      if (isValidVAT) {
        return {
          taxAmount: 0,
          taxRate: 0,
          taxType: 'VAT',
          jurisdiction: {
            country: input.country,
            name: `${input.country} (B2B Reverse Charge)`,
            type: 'VAT',
          },
          breakdown: [],
          isReverseCharge: true,
          isTaxExempt: false,
          exemptionReason: 'B2B reverse charge - customer accounts for VAT',
          currency: input.currency || 'EUR',
          calculatedAt: new Date(),
        };
      }
    }

    // Get VAT rate for country
    const vatRate = EU_VAT_RATES[input.country] || 0.20;
    const vatAmount = Math.round(input.amount * vatRate);

    breakdown.push({
      name: `${input.country} VAT`,
      rate: vatRate,
      amount: vatAmount,
      type: 'VAT',
      jurisdiction: input.country,
    });

    return {
      taxAmount: vatAmount,
      taxRate: vatRate,
      taxType: 'VAT',
      jurisdiction: {
        country: input.country,
        name: `${input.country} VAT`,
        type: 'VAT',
      },
      breakdown,
      isReverseCharge: false,
      isTaxExempt: false,
      currency: input.currency || 'EUR',
      calculatedAt: new Date(),
    };
  }

  /**
   * Calculate UK VAT
   */
  private calculateUKTax(input: TaxCalculationInput): TaxResult {
    const vatRate = 0.20; // 20% standard rate
    const vatAmount = Math.round(input.amount * vatRate);

    // Check for B2B with valid VAT number (post-Brexit, only UK VAT numbers for UK)
    if (input.isB2B && input.vatNumber?.startsWith('GB')) {
      // In production, validate with HMRC
      return {
        taxAmount: 0,
        taxRate: 0,
        taxType: 'VAT',
        jurisdiction: {
          country: 'GB',
          name: 'United Kingdom (B2B)',
          type: 'VAT',
        },
        breakdown: [],
        isReverseCharge: true,
        isTaxExempt: false,
        exemptionReason: 'B2B - reverse charge applies',
        currency: input.currency || 'GBP',
        calculatedAt: new Date(),
      };
    }

    return {
      taxAmount: vatAmount,
      taxRate: vatRate,
      taxType: 'VAT',
      jurisdiction: {
        country: 'GB',
        name: 'United Kingdom VAT',
        type: 'VAT',
      },
      breakdown: [
        {
          name: 'UK VAT',
          rate: vatRate,
          amount: vatAmount,
          type: 'VAT',
          jurisdiction: 'GB',
        },
      ],
      isReverseCharge: false,
      isTaxExempt: false,
      currency: input.currency || 'GBP',
      calculatedAt: new Date(),
    };
  }

  /**
   * Calculate Australian GST
   */
  private calculateAustraliaTax(input: TaxCalculationInput): TaxResult {
    const gstRate = 0.10; // 10% GST
    const gstAmount = Math.round(input.amount * gstRate);

    // Australian GST threshold for digital supplies is AUD 75,000
    // For individual transactions, GST always applies to B2C

    return {
      taxAmount: gstAmount,
      taxRate: gstRate,
      taxType: 'GST',
      jurisdiction: {
        country: 'AU',
        name: 'Australia GST',
        type: 'GST',
      },
      breakdown: [
        {
          name: 'Australian GST',
          rate: gstRate,
          amount: gstAmount,
          type: 'GST',
          jurisdiction: 'AU',
        },
      ],
      isReverseCharge: false,
      isTaxExempt: false,
      currency: input.currency || 'AUD',
      calculatedAt: new Date(),
    };
  }

  /**
   * Calculate Canadian GST/HST/PST
   */
  private calculateCanadaTax(input: TaxCalculationInput): TaxResult {
    const breakdown: TaxBreakdownItem[] = [];
    let totalTaxAmount = 0;
    let totalTaxRate = 0;
    let primaryTaxType: TaxType = 'GST';

    if (!input.state || !CANADA_TAX_RATES[input.state]) {
      // Default to GST only if province unknown
      const gstRate = 0.05;
      const gstAmount = Math.round(input.amount * gstRate);

      return {
        taxAmount: gstAmount,
        taxRate: gstRate,
        taxType: 'GST',
        jurisdiction: {
          country: 'CA',
          name: 'Canada (GST)',
          type: 'GST',
        },
        breakdown: [
          {
            name: 'Federal GST',
            rate: gstRate,
            amount: gstAmount,
            type: 'GST',
            jurisdiction: 'CA',
          },
        ],
        isReverseCharge: false,
        isTaxExempt: false,
        currency: input.currency || 'CAD',
        calculatedAt: new Date(),
      };
    }

    const provinceTax = CANADA_TAX_RATES[input.state];

    if (provinceTax.hst) {
      // HST provinces (combined federal + provincial)
      const hstAmount = Math.round(input.amount * provinceTax.hst);
      totalTaxAmount = hstAmount;
      totalTaxRate = provinceTax.hst;
      primaryTaxType = 'HST';

      breakdown.push({
        name: `${input.state} HST`,
        rate: provinceTax.hst,
        amount: hstAmount,
        type: 'HST',
        jurisdiction: `CA-${input.state}`,
      });
    } else {
      // GST + PST provinces
      const gstAmount = Math.round(input.amount * provinceTax.gst);
      totalTaxAmount += gstAmount;
      totalTaxRate += provinceTax.gst;

      breakdown.push({
        name: 'Federal GST',
        rate: provinceTax.gst,
        amount: gstAmount,
        type: 'GST',
        jurisdiction: 'CA',
      });

      if (provinceTax.pst) {
        const pstAmount = Math.round(input.amount * provinceTax.pst);
        totalTaxAmount += pstAmount;
        totalTaxRate += provinceTax.pst;

        breakdown.push({
          name: `${input.state} PST`,
          rate: provinceTax.pst,
          amount: pstAmount,
          type: 'PST',
          jurisdiction: `CA-${input.state}`,
        });
      }

      if (provinceTax.qst) {
        // Quebec QST is compound (calculated on amount + GST)
        const qstBase = input.amount + gstAmount;
        const qstAmount = Math.round(qstBase * provinceTax.qst);
        totalTaxAmount += qstAmount;
        // Effective rate is slightly higher due to compound calculation
        totalTaxRate += provinceTax.qst * (1 + provinceTax.gst);

        breakdown.push({
          name: 'Quebec QST',
          rate: provinceTax.qst,
          amount: qstAmount,
          type: 'PST',
          jurisdiction: 'CA-QC',
        });
      }
    }

    return {
      taxAmount: totalTaxAmount,
      taxRate: totalTaxRate,
      taxType: primaryTaxType,
      jurisdiction: {
        country: 'CA',
        state: input.state,
        name: `${input.state}, Canada`,
        type: primaryTaxType,
      },
      breakdown,
      isReverseCharge: false,
      isTaxExempt: false,
      currency: input.currency || 'CAD',
      calculatedAt: new Date(),
    };
  }

  // ==========================================================================
  // Helper Methods
  // ==========================================================================

  /**
   * Check if country is in EU
   */
  private isEUCountry(country: string): boolean {
    return Object.prototype.hasOwnProperty.call(EU_VAT_RATES, country);
  }

  /**
   * Validate VAT number format (basic validation)
   * In production, use VIES API for EU VAT validation
   */
  private validateVATNumber(vatNumber: string): boolean {
    if (!vatNumber || vatNumber.length < 4) {
      return false;
    }

    // Basic format validation
    const vatRegex = /^[A-Z]{2}[A-Z0-9]{2,12}$/;
    return vatRegex.test(vatNumber.toUpperCase().replace(/\s/g, ''));
  }

  /**
   * Check if user has a valid tax exemption
   */
  private checkUserExemption(
    userId: string,
    country: string,
    state?: string
  ): TaxExemption | null {
    // In production, query database for user exemptions
    for (const [, exemption] of this.taxExemptions) {
      if (
        exemption.userId === userId &&
        exemption.country === country &&
        (!state || exemption.state === state || !exemption.state)
      ) {
        const now = new Date();
        if (
          exemption.isVerified &&
          exemption.validFrom <= now &&
          (!exemption.validUntil || exemption.validUntil > now)
        ) {
          return exemption;
        }
      }
    }
    return null;
  }

  /**
   * Create a result for exempt transactions
   */
  private createExemptResult(
    input: TaxCalculationInput,
    exemption: TaxExemption
  ): TaxResult {
    return {
      taxAmount: 0,
      taxRate: 0,
      taxType: 'NONE',
      jurisdiction: {
        country: input.country,
        state: input.state,
        name: input.state ? `${input.state}, ${input.country}` : input.country,
        type: 'NONE',
      },
      breakdown: [],
      isReverseCharge: false,
      isTaxExempt: true,
      exemptionReason: `Tax exempt: ${exemption.exemptionType} (${exemption.certificateId || exemption.vatNumber || exemption.id})`,
      currency: input.currency || 'USD',
      calculatedAt: new Date(),
    };
  }

  /**
   * Create a result for no tax scenarios
   */
  private createNoTaxResult(input: TaxCalculationInput, reason?: string): TaxResult {
    return {
      taxAmount: 0,
      taxRate: 0,
      taxType: 'NONE',
      jurisdiction: {
        country: input.country,
        state: input.state,
        postalCode: input.postalCode,
        name: input.state ? `${input.state}, ${input.country}` : input.country,
        type: 'NONE',
      },
      breakdown: [],
      isReverseCharge: false,
      isTaxExempt: reason ? true : false,
      exemptionReason: reason,
      currency: input.currency || 'USD',
      calculatedAt: new Date(),
    };
  }

  // ==========================================================================
  // Tax Exemption Management
  // ==========================================================================

  /**
   * Register a tax exemption for a user
   */
  async registerTaxExemption(exemption: Omit<TaxExemption, 'isVerified' | 'verifiedAt'>): Promise<TaxExemption> {
    const fullExemption: TaxExemption = {
      ...exemption,
      isVerified: false,
      verifiedAt: undefined,
    };

    // In production, save to database
    const key = `${exemption.userId}:${exemption.id}`;
    this.taxExemptions.set(key, fullExemption);

    logger.info('Tax exemption registered', {
      userId: exemption.userId,
      exemptionId: exemption.id,
      type: exemption.exemptionType,
    });

    return fullExemption;
  }

  /**
   * Verify a tax exemption
   * In production, this would involve:
   * - VIES validation for EU VAT numbers
   * - Certificate verification for US exemptions
   * - Manual review for other types
   */
  async verifyTaxExemption(userId: string, exemptionId: string): Promise<boolean> {
    const key = `${userId}:${exemptionId}`;
    const exemption = this.taxExemptions.get(key);

    if (!exemption) {
      return false;
    }

    // Simulate verification (in production, call external APIs)
    if (exemption.vatNumber) {
      const isValidVAT = this.validateVATNumber(exemption.vatNumber);
      if (!isValidVAT) {
        logger.warn('Invalid VAT number format', { vatNumber: exemption.vatNumber });
        return false;
      }
    }

    exemption.isVerified = true;
    exemption.verifiedAt = new Date();
    this.taxExemptions.set(key, exemption);

    logger.info('Tax exemption verified', { userId, exemptionId });
    return true;
  }

  /**
   * Revoke a tax exemption
   */
  async revokeTaxExemption(userId: string, exemptionId: string): Promise<boolean> {
    const key = `${userId}:${exemptionId}`;
    const deleted = this.taxExemptions.delete(key);

    if (deleted) {
      logger.info('Tax exemption revoked', { userId, exemptionId });
    }

    return deleted;
  }

  // ==========================================================================
  // Stripe Tax Integration (Placeholder)
  // ==========================================================================

  /**
   * Get Stripe Tax configuration for automatic tax calculation
   * This is a placeholder for Stripe Tax integration
   */
  getStripeTaxSettings(): StripeTaxConfig {
    return { ...this.stripeTaxConfig };
  }

  /**
   * Calculate tax using Stripe Tax API
   * Placeholder for future Stripe Tax integration
   */
  async calculateWithStripeTax(input: TaxCalculationInput): Promise<TaxResult> {
    // In production, this would:
    // 1. Create a Stripe Tax Calculation
    // 2. Return the calculated tax from Stripe

    logger.info('Stripe Tax calculation requested (placeholder)', {
      amount: input.amount,
      country: input.country,
    });

    // For now, fall back to internal calculation
    return this.calculateTax(
      input.amount,
      input.country,
      input.state,
      input.postalCode,
      {
        isB2B: input.isB2B,
        vatNumber: input.vatNumber,
        userId: input.userId,
        productType: input.productType,
        currency: input.currency,
      }
    );
  }

  /**
   * Create tax transaction record for Stripe Tax reporting
   * Placeholder for Stripe Tax transaction recording
   */
  async recordTaxTransaction(
    transactionId: string,
    taxResult: TaxResult,
    amount: number
  ): Promise<void> {
    // In production, this would record the transaction in Stripe Tax
    logger.info('Tax transaction recorded (placeholder)', {
      transactionId,
      taxAmount: taxResult.taxAmount,
      jurisdiction: taxResult.jurisdiction.name,
    });
  }

  // ==========================================================================
  // Utility Methods
  // ==========================================================================

  /**
   * Get supported countries
   */
  getSupportedCountries(): string[] {
    const countries = new Set<string>();

    // US
    countries.add('US');

    // UK
    countries.add('GB');

    // Australia
    countries.add('AU');

    // Canada
    countries.add('CA');

    // EU countries
    for (const country of Object.keys(EU_VAT_RATES)) {
      countries.add(country);
    }

    return Array.from(countries).sort();
  }

  /**
   * Check if tax collection is required for a country
   */
  isTaxCollectionRequired(country: string): boolean {
    const supportedCountries = this.getSupportedCountries();
    return supportedCountries.includes(country.toUpperCase());
  }

  /**
   * Format tax amount for display
   */
  formatTaxAmount(amount: number, currency: string): string {
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    });
    return formatter.format(amount / 100); // Convert from cents
  }

  /**
   * Calculate total with tax
   */
  calculateTotalWithTax(amount: number, taxResult: TaxResult): number {
    return amount + taxResult.taxAmount;
  }
}

// Export singleton instance
export const taxCalculationService = new TaxCalculationService();
export default taxCalculationService;
