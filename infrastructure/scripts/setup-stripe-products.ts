/**
 * Stripe Products & Prices Setup Script
 *
 * This script creates the subscription products and prices in Stripe
 * for the Flamoral dating app platform.
 *
 * Usage:
 *   1. Install dependencies: npm install stripe dotenv
 *   2. Set your Stripe secret key in .env or pass as environment variable
 *   3. Run with ts-node: npx ts-node infrastructure/scripts/setup-stripe-products.ts
 *      Or compile and run: npx tsc infrastructure/scripts/setup-stripe-products.ts && node infrastructure/scripts/setup-stripe-products.js
 *
 * Environment Variables:
 *   STRIPE_SECRET_KEY - Your Stripe secret key (required)
 *   DRY_RUN - Set to "true" to preview without creating (optional)
 *
 * After running, add the output IDs to your environment variables:
 *   STRIPE_PRODUCT_BASIC, STRIPE_PRICE_BASIC
 *   STRIPE_PRODUCT_PLUS, STRIPE_PRICE_PLUS
 *   STRIPE_PRODUCT_PREMIUM, STRIPE_PRICE_PREMIUM
 *   STRIPE_PRODUCT_PREMIUM_PLUS, STRIPE_PRICE_PREMIUM_PLUS
 *   STRIPE_PRODUCT_ELITE, STRIPE_PRICE_ELITE
 */

import Stripe from 'stripe';

// Configuration for subscription tiers
interface TierConfig {
  key: string;
  name: string;
  description: string;
  priceInCents: number;
  features: string[];
  metadata: Record<string, string>;
}

const SUBSCRIPTION_TIERS: TierConfig[] = [
  {
    key: 'basic',
    name: 'Flamoral Basic',
    description: 'Essential features for getting started with premium dating',
    priceInCents: 999, // $9.99
    features: [
      'Unlimited daily swipes',
      '5 Super Likes per day',
      '1 Boost per month',
      'See who likes you',
    ],
    metadata: {
      tier: 'basic',
      dailySwipes: 'unlimited',
      superLikesPerDay: '5',
      boostsPerMonth: '1',
    },
  },
  {
    key: 'plus',
    name: 'Flamoral Plus',
    description: 'Enhanced features for serious daters',
    priceInCents: 1999, // $19.99
    features: [
      'Everything in Basic',
      '10 Super Likes per day',
      '3 Boosts per month',
      'Advanced filters',
      'Read receipts',
      'Incognito mode',
    ],
    metadata: {
      tier: 'plus',
      dailySwipes: 'unlimited',
      superLikesPerDay: '10',
      boostsPerMonth: '3',
      advancedFilters: 'true',
      readReceipts: 'true',
      incognitoMode: 'true',
    },
  },
  {
    key: 'premium',
    name: 'Flamoral Premium',
    description: 'Premium experience with AI-powered matching',
    priceInCents: 2999, // $29.99
    features: [
      'Everything in Plus',
      'Unlimited Super Likes',
      '5 Boosts per month',
      'Video dating',
      'AI matchmaking',
      'AI icebreakers',
    ],
    metadata: {
      tier: 'premium',
      dailySwipes: 'unlimited',
      superLikesPerDay: 'unlimited',
      boostsPerMonth: '5',
      videoDating: 'true',
      aiMatchmaking: 'true',
      aiIcebreakers: 'true',
    },
  },
  {
    key: 'premium_plus',
    name: 'Flamoral Premium+',
    description: 'The complete dating experience with priority features',
    priceInCents: 3999, // $39.99
    features: [
      'Everything in Premium',
      '10 Boosts per month',
      'Passport (change location)',
      'Message before matching',
      'Priority support',
    ],
    metadata: {
      tier: 'premium_plus',
      dailySwipes: 'unlimited',
      superLikesPerDay: 'unlimited',
      boostsPerMonth: '10',
      passport: 'true',
      messageBeforeMatch: 'true',
      prioritySupport: 'true',
    },
  },
  {
    key: 'elite',
    name: 'Flamoral Elite',
    description: 'The ultimate VIP dating experience',
    priceInCents: 5999, // $59.99
    features: [
      'Everything in Premium+',
      'Unlimited Boosts',
      'VIP badge',
      'Dedicated dating coach',
      'Background verified badge',
    ],
    metadata: {
      tier: 'elite',
      dailySwipes: 'unlimited',
      superLikesPerDay: 'unlimited',
      boostsPerMonth: 'unlimited',
      vipBadge: 'true',
      dedicatedCoach: 'true',
      backgroundVerified: 'true',
    },
  },
];

interface CreatedIds {
  tier: string;
  productId: string;
  priceId: string;
  productName: string;
  priceAmount: string;
}

async function findExistingProduct(
  stripe: Stripe,
  tierKey: string
): Promise<Stripe.Product | null> {
  try {
    // Search for products with matching metadata
    const products = await stripe.products.list({
      active: true,
      limit: 100,
    });

    const existing = products.data.find(
      (product) =>
        product.metadata?.tier === tierKey ||
        product.name.toLowerCase().includes(tierKey.replace('_', ' '))
    );

    return existing || null;
  } catch (error) {
    console.error(`Error searching for existing product: ${error}`);
    return null;
  }
}

async function findExistingPrice(
  stripe: Stripe,
  productId: string,
  amountInCents: number
): Promise<Stripe.Price | null> {
  try {
    const prices = await stripe.prices.list({
      product: productId,
      active: true,
      type: 'recurring',
      limit: 100,
    });

    const existing = prices.data.find(
      (price) => price.unit_amount === amountInCents && price.recurring?.interval === 'month'
    );

    return existing || null;
  } catch (error) {
    console.error(`Error searching for existing price: ${error}`);
    return null;
  }
}

async function createProductAndPrice(
  stripe: Stripe,
  tier: TierConfig,
  dryRun: boolean
): Promise<CreatedIds | null> {
  console.log(`\n--- Processing ${tier.name} ---`);

  // Check for existing product
  const existingProduct = await findExistingProduct(stripe, tier.key);

  let product: Stripe.Product;

  if (existingProduct) {
    console.log(`  Found existing product: ${existingProduct.id}`);
    product = existingProduct;

    // Check for existing price
    const existingPrice = await findExistingPrice(stripe, existingProduct.id, tier.priceInCents);

    if (existingPrice) {
      console.log(`  Found existing price: ${existingPrice.id}`);
      return {
        tier: tier.key,
        productId: existingProduct.id,
        priceId: existingPrice.id,
        productName: tier.name,
        priceAmount: `$${(tier.priceInCents / 100).toFixed(2)}/month`,
      };
    }
  } else {
    if (dryRun) {
      console.log(`  [DRY RUN] Would create product: ${tier.name}`);
      console.log(`    Description: ${tier.description}`);
      console.log(`    Features: ${tier.features.join(', ')}`);
      return null;
    }

    // Create product
    console.log(`  Creating product: ${tier.name}`);
    product = await stripe.products.create({
      name: tier.name,
      description: tier.description,
      metadata: tier.metadata,
      // Marketing features for the pricing table
      marketing_features: tier.features.map((feature) => ({
        name: feature,
      })),
    });
    console.log(`  Created product: ${product.id}`);
  }

  // Create price
  if (dryRun) {
    console.log(`  [DRY RUN] Would create price: $${(tier.priceInCents / 100).toFixed(2)}/month`);
    return null;
  }

  console.log(`  Creating price: $${(tier.priceInCents / 100).toFixed(2)}/month`);
  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: tier.priceInCents,
    currency: 'usd',
    recurring: {
      interval: 'month',
    },
    metadata: {
      tier: tier.key,
    },
  });
  console.log(`  Created price: ${price.id}`);

  return {
    tier: tier.key,
    productId: product.id,
    priceId: price.id,
    productName: tier.name,
    priceAmount: `$${(tier.priceInCents / 100).toFixed(2)}/month`,
  };
}

async function main(): Promise<void> {
  console.log('='.repeat(60));
  console.log('Flamoral Stripe Products & Prices Setup');
  console.log('='.repeat(60));

  // Get Stripe secret key
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

  if (!stripeSecretKey) {
    console.error('\nError: STRIPE_SECRET_KEY environment variable is required');
    console.error('Set it via: export STRIPE_SECRET_KEY=sk_live_...');
    process.exit(1);
  }

  // Validate key format
  if (!stripeSecretKey.startsWith('sk_')) {
    console.error('\nError: Invalid Stripe secret key format');
    console.error('Key should start with sk_live_ (production) or sk_test_ (testing)');
    process.exit(1);
  }

  const isLiveMode = stripeSecretKey.startsWith('sk_live_');
  const dryRun = process.env.DRY_RUN === 'true';

  console.log(`\nMode: ${isLiveMode ? 'LIVE (Production)' : 'TEST'}`);
  console.log(`Dry Run: ${dryRun ? 'YES (no changes will be made)' : 'NO'}`);

  if (isLiveMode && !dryRun) {
    console.log('\n*** WARNING: You are about to create LIVE products! ***');
    console.log('Press Ctrl+C within 5 seconds to cancel...');
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }

  // Initialize Stripe
  const stripe = new Stripe(stripeSecretKey, {
    apiVersion: '2025-01-27.acacia',
  });

  // Verify connection
  try {
    await stripe.balance.retrieve();
    console.log('\nStripe connection verified successfully');
  } catch (error) {
    console.error('\nError: Failed to connect to Stripe');
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }

  // Create products and prices
  const results: CreatedIds[] = [];

  for (const tier of SUBSCRIPTION_TIERS) {
    try {
      const result = await createProductAndPrice(stripe, tier, dryRun);
      if (result) {
        results.push(result);
      }
    } catch (error) {
      console.error(`\nError creating ${tier.name}:`);
      console.error(error instanceof Error ? error.message : error);

      // Continue with other tiers
      continue;
    }
  }

  // Output summary
  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));

  if (dryRun) {
    console.log('\n[DRY RUN] No products or prices were created.');
    console.log('Remove DRY_RUN=true to create actual products.');
    return;
  }

  if (results.length === 0) {
    console.log('\nNo new products or prices were created.');
    return;
  }

  console.log('\nCreated/Found Products and Prices:');
  console.log('-'.repeat(60));

  for (const result of results) {
    console.log(`\n${result.productName} (${result.priceAmount}):`);
    console.log(`  Product ID: ${result.productId}`);
    console.log(`  Price ID:   ${result.priceId}`);
  }

  // Output environment variables
  console.log('\n' + '='.repeat(60));
  console.log('ENVIRONMENT VARIABLES');
  console.log('='.repeat(60));
  console.log('\nAdd these to your .env file or environment configuration:\n');

  for (const result of results) {
    const envKey = result.tier.toUpperCase();
    console.log(`STRIPE_PRODUCT_${envKey}=${result.productId}`);
    console.log(`STRIPE_PRICE_${envKey}=${result.priceId}`);
  }

  // Output for Azure/cloud deployment
  console.log('\n' + '-'.repeat(60));
  console.log('For Azure Key Vault or cloud secrets:\n');

  for (const result of results) {
    const envKey = result.tier.toUpperCase().replace('_', '-');
    console.log(`stripe-product-${envKey.toLowerCase()}: ${result.productId}`);
    console.log(`stripe-price-${envKey.toLowerCase()}: ${result.priceId}`);
  }

  console.log('\n' + '='.repeat(60));
  console.log('Setup complete!');
  console.log('='.repeat(60));
}

// Run the script
main().catch((error) => {
  console.error('\nFatal error:', error);
  process.exit(1);
});
