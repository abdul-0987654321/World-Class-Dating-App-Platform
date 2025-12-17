import { Knex } from 'knex';

/**
 * Seed: Development Subscriptions and Payments
 * Creates sample subscription and payment data for testing
 */
export async function seed(knex: Knex): Promise<void> {
  // Get subscription plan IDs
  const plans = await knex('subscription_plans')
    .select('id', 'tier')
    .whereIn('tier', ['ultra', 'mid', 'basic', 'free']);

  const ultraPlan = plans.find(p => p.tier === 'ultra');
  const midPlan = plans.find(p => p.tier === 'mid');
  const basicPlan = plans.find(p => p.tier === 'basic');
  const freePlan = plans.find(p => p.tier === 'free');

  // Sample subscriptions data
  const subscriptions = [
    // Alice - Ultra subscription (active)
    {
      user_id: '550e8400-e29b-41d4-a716-446655440001',
      plan_id: ultraPlan?.id,
      status: 'active',
      billing_cycle: 'yearly',
      stripe_subscription_id: 'sub_test_alice_ultra',
      stripe_customer_id: 'cus_test_alice',
      stripe_price_id: 'price_test_ultra_yearly',
      current_period_start: knex.raw("NOW() - INTERVAL '30 days'"),
      current_period_end: knex.raw("NOW() + INTERVAL '335 days'"),
      cancel_at_period_end: false,
      metadata: JSON.stringify({ source: 'web', campaign: 'winter2024' }),
    },
    // Bob - Mid subscription (active)
    {
      user_id: '550e8400-e29b-41d4-a716-446655440002',
      plan_id: midPlan?.id,
      status: 'active',
      billing_cycle: 'monthly',
      stripe_subscription_id: 'sub_test_bob_mid',
      stripe_customer_id: 'cus_test_bob',
      stripe_price_id: 'price_test_mid_monthly',
      current_period_start: knex.raw("NOW() - INTERVAL '15 days'"),
      current_period_end: knex.raw("NOW() + INTERVAL '15 days'"),
      cancel_at_period_end: false,
      metadata: JSON.stringify({ source: 'mobile', referral: 'friend' }),
    },
    // Carol - Basic subscription (active)
    {
      user_id: '550e8400-e29b-41d4-a716-446655440003',
      plan_id: basicPlan?.id,
      status: 'active',
      billing_cycle: '3_months',
      stripe_subscription_id: 'sub_test_carol_basic',
      stripe_customer_id: 'cus_test_carol',
      stripe_price_id: 'price_test_basic_3months',
      current_period_start: knex.raw("NOW() - INTERVAL '45 days'"),
      current_period_end: knex.raw("NOW() + INTERVAL '45 days'"),
      cancel_at_period_end: false,
      metadata: JSON.stringify({ source: 'web' }),
    },
    // David - Free tier (no subscription)
    {
      user_id: '550e8400-e29b-41d4-a716-446655440004',
      plan_id: freePlan?.id,
      status: 'active',
      billing_cycle: 'monthly',
      current_period_start: knex.fn.now(),
      current_period_end: knex.raw("NOW() + INTERVAL '30 days'"),
      cancel_at_period_end: false,
      metadata: JSON.stringify({ source: 'mobile' }),
    },
    // Emily - Mid subscription (active)
    {
      user_id: '550e8400-e29b-41d4-a716-446655440005',
      plan_id: midPlan?.id,
      status: 'active',
      billing_cycle: '6_months',
      stripe_subscription_id: 'sub_test_emily_mid',
      stripe_customer_id: 'cus_test_emily',
      stripe_price_id: 'price_test_mid_6months',
      current_period_start: knex.raw("NOW() - INTERVAL '60 days'"),
      current_period_end: knex.raw("NOW() + INTERVAL '120 days'"),
      cancel_at_period_end: false,
      metadata: JSON.stringify({ source: 'web', promo: 'SAVE20' }),
    },
    // Frank - Basic subscription (trialing)
    {
      user_id: '550e8400-e29b-41d4-a716-446655440006',
      plan_id: basicPlan?.id,
      status: 'trialing',
      billing_cycle: 'monthly',
      stripe_subscription_id: 'sub_test_frank_basic',
      stripe_customer_id: 'cus_test_frank',
      stripe_price_id: 'price_test_basic_monthly',
      current_period_start: knex.fn.now(),
      current_period_end: knex.raw("NOW() + INTERVAL '30 days'"),
      trial_start: knex.fn.now(),
      trial_end: knex.raw("NOW() + INTERVAL '7 days'"),
      cancel_at_period_end: false,
      metadata: JSON.stringify({ source: 'mobile', trial: 'first_time' }),
    },
  ];

  await knex('subscriptions').insert(subscriptions);

  // Sample payment methods data
  const paymentMethods = [
    // Alice's payment method
    {
      user_id: '550e8400-e29b-41d4-a716-446655440001',
      stripe_payment_method_id: 'pm_test_alice_visa',
      stripe_customer_id: 'cus_test_alice',
      type: 'card',
      card_brand: 'visa',
      card_last4: '4242',
      card_exp_month: 12,
      card_exp_year: 2025,
      card_funding: 'credit',
      billing_name: 'Alice Johnson',
      billing_email: 'alice.johnson@example.com',
      billing_address: JSON.stringify({
        line1: '123 Market St',
        city: 'San Francisco',
        state: 'CA',
        postal_code: '94102',
        country: 'US',
      }),
      is_default: true,
    },
    // Bob's payment method
    {
      user_id: '550e8400-e29b-41d4-a716-446655440002',
      stripe_payment_method_id: 'pm_test_bob_mastercard',
      stripe_customer_id: 'cus_test_bob',
      type: 'card',
      card_brand: 'mastercard',
      card_last4: '5555',
      card_exp_month: 6,
      card_exp_year: 2026,
      card_funding: 'debit',
      billing_name: 'Bob Smith',
      billing_email: 'bob.smith@example.com',
      billing_address: JSON.stringify({
        line1: '456 Sunset Blvd',
        city: 'Los Angeles',
        state: 'CA',
        postal_code: '90028',
        country: 'US',
      }),
      is_default: true,
    },
    // Carol's payment method
    {
      user_id: '550e8400-e29b-41d4-a716-446655440003',
      stripe_payment_method_id: 'pm_test_carol_amex',
      stripe_customer_id: 'cus_test_carol',
      type: 'card',
      card_brand: 'amex',
      card_last4: '0005',
      card_exp_month: 3,
      card_exp_year: 2027,
      card_funding: 'credit',
      billing_name: 'Carol Williams',
      billing_email: 'carol.williams@example.com',
      billing_address: JSON.stringify({
        line1: '789 Broadway',
        city: 'New York',
        state: 'NY',
        postal_code: '10003',
        country: 'US',
      }),
      is_default: true,
    },
    // Emily's payment method
    {
      user_id: '550e8400-e29b-41d4-a716-446655440005',
      stripe_payment_method_id: 'pm_test_emily_visa',
      stripe_customer_id: 'cus_test_emily',
      type: 'card',
      card_brand: 'visa',
      card_last4: '1234',
      card_exp_month: 9,
      card_exp_year: 2025,
      card_funding: 'credit',
      billing_name: 'Emily Davis',
      billing_email: 'emily.davis@example.com',
      billing_address: JSON.stringify({
        line1: '321 Michigan Ave',
        city: 'Chicago',
        state: 'IL',
        postal_code: '60601',
        country: 'US',
      }),
      is_default: true,
    },
    // Frank's payment method
    {
      user_id: '550e8400-e29b-41d4-a716-446655440006',
      stripe_payment_method_id: 'pm_test_frank_discover',
      stripe_customer_id: 'cus_test_frank',
      type: 'card',
      card_brand: 'discover',
      card_last4: '6789',
      card_exp_month: 11,
      card_exp_year: 2026,
      card_funding: 'credit',
      billing_name: 'Frank Miller',
      billing_email: 'frank.miller@example.com',
      billing_address: JSON.stringify({
        line1: '555 Pike St',
        city: 'Seattle',
        state: 'WA',
        postal_code: '98101',
        country: 'US',
      }),
      is_default: true,
    },
  ];

  await knex('payment_methods').insert(paymentMethods);

  // Sample transactions data
  const transactions = [
    // Alice's yearly Ultra subscription payment
    {
      user_id: '550e8400-e29b-41d4-a716-446655440001',
      subscription_id: (await knex('subscriptions')
        .select('id')
        .where('user_id', '550e8400-e29b-41d4-a716-446655440001')
        .first())?.id,
      stripe_payment_intent_id: 'pi_test_alice_1',
      stripe_invoice_id: 'in_test_alice_1',
      stripe_charge_id: 'ch_test_alice_1',
      type: 'subscription',
      status: 'succeeded',
      amount: 279.99,
      currency: 'USD',
      description: 'Flamoral Ultra - Yearly Subscription',
      metadata: JSON.stringify({ plan: 'ultra', cycle: 'yearly' }),
      processed_at: knex.raw("NOW() - INTERVAL '30 days'"),
    },
    // Bob's monthly Mid subscription payment
    {
      user_id: '550e8400-e29b-41d4-a716-446655440002',
      subscription_id: (await knex('subscriptions')
        .select('id')
        .where('user_id', '550e8400-e29b-41d4-a716-446655440002')
        .first())?.id,
      stripe_payment_intent_id: 'pi_test_bob_1',
      stripe_invoice_id: 'in_test_bob_1',
      stripe_charge_id: 'ch_test_bob_1',
      type: 'subscription_renewal',
      status: 'succeeded',
      amount: 19.99,
      currency: 'USD',
      description: 'Flamoral Mid - Monthly Subscription',
      metadata: JSON.stringify({ plan: 'mid', cycle: 'monthly' }),
      processed_at: knex.raw("NOW() - INTERVAL '15 days'"),
    },
    // Carol's 3-month Basic subscription payment
    {
      user_id: '550e8400-e29b-41d4-a716-446655440003',
      subscription_id: (await knex('subscriptions')
        .select('id')
        .where('user_id', '550e8400-e29b-41d4-a716-446655440003')
        .first())?.id,
      stripe_payment_intent_id: 'pi_test_carol_1',
      stripe_invoice_id: 'in_test_carol_1',
      stripe_charge_id: 'ch_test_carol_1',
      type: 'subscription',
      status: 'succeeded',
      amount: 24.99,
      currency: 'USD',
      description: 'Flamoral Basic - 3-Month Subscription',
      metadata: JSON.stringify({ plan: 'basic', cycle: '3_months' }),
      processed_at: knex.raw("NOW() - INTERVAL '45 days'"),
    },
    // Emily's 6-month Mid subscription payment
    {
      user_id: '550e8400-e29b-41d4-a716-446655440005',
      subscription_id: (await knex('subscriptions')
        .select('id')
        .where('user_id', '550e8400-e29b-41d4-a716-446655440005')
        .first())?.id,
      stripe_payment_intent_id: 'pi_test_emily_1',
      stripe_invoice_id: 'in_test_emily_1',
      stripe_charge_id: 'ch_test_emily_1',
      type: 'subscription',
      status: 'succeeded',
      amount: 89.99,
      currency: 'USD',
      description: 'Flamoral Mid - 6-Month Subscription (Promo: SAVE20)',
      metadata: JSON.stringify({ plan: 'mid', cycle: '6_months', promo: 'SAVE20' }),
      processed_at: knex.raw("NOW() - INTERVAL '60 days'"),
    },
    // Alice's coin purchase
    {
      user_id: '550e8400-e29b-41d4-a716-446655440001',
      stripe_payment_intent_id: 'pi_test_alice_coins',
      type: 'coin_purchase',
      status: 'succeeded',
      amount: 9.99,
      currency: 'USD',
      description: '100 Coins Purchase',
      metadata: JSON.stringify({ coins: 100, package: 'small' }),
      processed_at: knex.raw("NOW() - INTERVAL '10 days'"),
    },
    // Bob's boost purchase
    {
      user_id: '550e8400-e29b-41d4-a716-446655440002',
      stripe_payment_intent_id: 'pi_test_bob_boost',
      type: 'boost_purchase',
      status: 'succeeded',
      amount: 4.99,
      currency: 'USD',
      description: 'Profile Boost - 30 minutes',
      metadata: JSON.stringify({ boost_duration: 30 }),
      processed_at: knex.raw("NOW() - INTERVAL '5 days'"),
    },
  ];

  await knex('transactions').insert(transactions);

  console.log('✓ Seeded subscriptions, payment methods, and transactions');
}
