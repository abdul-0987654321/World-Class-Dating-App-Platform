#!/usr/bin/env node
/**
 * Stripe Products Setup Script (CommonJS version)
 *
 * Creates subscription products and prices in Stripe for Flamoral dating app.
 *
 * Usage:
 *   set STRIPE_SECRET_KEY=sk_live_xxx
 *   node infrastructure/scripts/setup-stripe-products.cjs
 *
 * Dry run (preview without creating):
 *   set DRY_RUN=true
 *   node infrastructure/scripts/setup-stripe-products.cjs
 */

const Stripe = require('stripe');

// Configuration
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const DRY_RUN = process.env.DRY_RUN === 'true';

if (!STRIPE_SECRET_KEY) {
  console.error('Error: STRIPE_SECRET_KEY environment variable is required');
  console.error('Usage: set STRIPE_SECRET_KEY=sk_live_xxx && node setup-stripe-products.cjs');
  process.exit(1);
}

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

// Subscription tiers matching stripe-products.ts
const TIERS = [
  {
    key: 'basic',
    name: 'Flamoral Basic',
    description: 'Unlimited swipes, see who likes you, and 5 Super Likes per day',
    priceMonthly: 999, // $9.99 in cents
    features: [
      'Unlimited daily swipes',
      '5 Super Likes per day',
      '1 Boost per month',
      'See who likes you',
    ],
  },
  {
    key: 'plus',
    name: 'Flamoral Plus',
    description: 'Everything in Basic plus advanced filters, read receipts, and incognito mode',
    priceMonthly: 1999, // $19.99 in cents
    features: [
      'Everything in Basic',
      '10 Super Likes per day',
      '3 Boosts per month',
      'Advanced filters',
      'Read receipts',
      'Incognito mode',
    ],
  },
  {
    key: 'premium',
    name: 'Flamoral Premium',
    description: 'Everything in Plus with unlimited Super Likes, video dating, and AI matchmaking',
    priceMonthly: 2999, // $29.99 in cents
    features: [
      'Everything in Plus',
      'Unlimited Super Likes',
      '5 Boosts per month',
      'Video dating',
      'AI matchmaking',
      'AI icebreakers',
    ],
  },
  {
    key: 'premium_plus',
    name: 'Flamoral Premium+',
    description: 'Everything in Premium plus Passport, message before match, and priority support',
    priceMonthly: 3999, // $39.99 in cents
    features: [
      'Everything in Premium',
      '10 Boosts per month',
      'Passport (change location)',
      'Message before match',
      'Priority support',
    ],
  },
  {
    key: 'elite',
    name: 'Flamoral Elite',
    description: 'The ultimate dating experience with dedicated coach and VIP badge',
    priceMonthly: 5999, // $59.99 in cents
    features: [
      'Everything in Premium+',
      'Unlimited Boosts',
      'VIP badge',
      'Dedicated dating coach',
      'Background verified badge',
    ],
  },
];

async function findExistingProduct(name) {
  const products = await stripe.products.list({ limit: 100 });
  return products.data.find(p => p.name === name && p.active);
}

async function findExistingPrice(productId) {
  const prices = await stripe.prices.list({ product: productId, limit: 100 });
  return prices.data.find(p => p.active && p.recurring?.interval === 'month');
}

async function createProductAndPrice(tier) {
  console.log(`\nProcessing: ${tier.name}`);

  // Check for existing product
  let product = await findExistingProduct(tier.name);

  if (product) {
    console.log(`  Product already exists: ${product.id}`);
  } else if (DRY_RUN) {
    console.log(`  [DRY RUN] Would create product: ${tier.name}`);
    product = { id: `prod_dryrun_${tier.key}` };
  } else {
    product = await stripe.products.create({
      name: tier.name,
      description: tier.description,
      metadata: {
        tier: tier.key,
        app: 'flamoral',
      },
      marketing_features: tier.features.map(f => ({ name: f })),
    });
    console.log(`  Created product: ${product.id}`);
  }

  // Check for existing price
  let price = product.id.startsWith('prod_dryrun') ? null : await findExistingPrice(product.id);

  if (price) {
    console.log(`  Price already exists: ${price.id} ($${(price.unit_amount / 100).toFixed(2)}/month)`);
  } else if (DRY_RUN) {
    console.log(`  [DRY RUN] Would create price: $${(tier.priceMonthly / 100).toFixed(2)}/month`);
    price = { id: `price_dryrun_${tier.key}` };
  } else {
    price = await stripe.prices.create({
      product: product.id,
      unit_amount: tier.priceMonthly,
      currency: 'usd',
      recurring: {
        interval: 'month',
      },
      metadata: {
        tier: tier.key,
      },
    });
    console.log(`  Created price: ${price.id} ($${(tier.priceMonthly / 100).toFixed(2)}/month)`);
  }

  return { product, price, tier };
}

async function main() {
  console.log('='.repeat(60));
  console.log('Flamoral Stripe Products Setup');
  console.log('='.repeat(60));

  if (DRY_RUN) {
    console.log('\n[DRY RUN MODE - No changes will be made]');
  }

  // Verify Stripe connection
  try {
    const account = await stripe.accounts.retrieve();
    console.log(`\nConnected to Stripe account: ${account.id || 'verified'}`);
  } catch (error) {
    console.error('\nFailed to connect to Stripe:', error.message);
    process.exit(1);
  }

  // Warn about live keys
  if (STRIPE_SECRET_KEY.startsWith('sk_live') && !DRY_RUN) {
    console.log('\n⚠️  WARNING: Using LIVE Stripe keys!');
    console.log('    Products will be created in your live account.');
    console.log('    Waiting 5 seconds... (Ctrl+C to cancel)\n');
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  // Create products and prices
  const results = [];
  for (const tier of TIERS) {
    try {
      const result = await createProductAndPrice(tier);
      results.push(result);
    } catch (error) {
      console.error(`  Error: ${error.message}`);
    }
  }

  // Output summary
  console.log('\n' + '='.repeat(60));
  console.log('Summary - Environment Variables');
  console.log('='.repeat(60));
  console.log('\nAdd these to your Railway shared variables:\n');

  for (const { product, price, tier } of results) {
    const envPrefix = `STRIPE_PRICE_${tier.key.toUpperCase()}`;
    const prodPrefix = `STRIPE_PRODUCT_${tier.key.toUpperCase()}`;
    console.log(`${prodPrefix}=${product.id}`);
    console.log(`${envPrefix}=${price.id}`);
  }

  console.log('\n' + '='.repeat(60));
  console.log('Setup complete!');
  console.log('='.repeat(60));
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
