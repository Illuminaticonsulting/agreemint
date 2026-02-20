/**
 * AgreeMint — Stripe Payment Engine
 *
 * Handles subscription management, one-time purchases, and
 * template marketplace payments through Stripe.
 *
 * Revenue streams:
 *   1. Subscriptions: Free → Starter ($29) → Pro ($79) → Enterprise ($199)
 *   2. Per-use purchases: Agreement generation ($15), analysis ($5), etc.
 *   3. Template marketplace: 20% platform commission
 *   4. Escrow fees: 0.5% of escrow value (handled on-chain)
 *   5. IP registration: $5 per Story Protocol registration
 *
 * Setup:
 *   1. Create Stripe account at https://stripe.com
 *   2. Set STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET in .env
 *   3. Create products/prices in Stripe Dashboard
 *   4. Set Stripe Price IDs in tier config
 *   5. Set webhook endpoint: https://docs.kingpinstrategies.com/api/stripe/webhook
 */

// ─── Config ─────────────────────────────────────────────
const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY || '';
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';
const PLATFORM_URL = process.env.BASE_URL || 'https://docs.kingpinstrategies.com';

let stripe = null;

function initStripe() {
  if (!STRIPE_SECRET) {
    console.log('  Stripe: NOT CONFIGURED (set STRIPE_SECRET_KEY in .env)');
    return false;
  }
  try {
    stripe = require('stripe')(STRIPE_SECRET);
    console.log('  Stripe: CONFIGURED');
    return true;
  } catch (e) {
    console.log('  Stripe: Module not installed (run: npm install stripe)');
    return false;
  }
}

// ─── Product & Price IDs ───────────────────────────────
// These are created in your Stripe Dashboard or via API
const STRIPE_PRODUCTS = {
  subscription_starter: {
    name: 'AgreeMint Starter',
    priceId: process.env.STRIPE_PRICE_STARTER || '',
    amount: 2900,
    interval: 'month'
  },
  subscription_pro: {
    name: 'AgreeMint Pro',
    priceId: process.env.STRIPE_PRICE_PRO || '',
    amount: 7900,
    interval: 'month'
  },
  subscription_enterprise: {
    name: 'AgreeMint Enterprise',
    priceId: process.env.STRIPE_PRICE_ENTERPRISE || '',
    amount: 19900,
    interval: 'month'
  },
  // One-time purchases
  agreement_generation: {
    name: 'AI Agreement Generation',
    priceId: process.env.STRIPE_PRICE_AGREEMENT || '',
    amount: 1500
  },
  agreement_analysis: {
    name: 'AI Risk Analysis',
    priceId: process.env.STRIPE_PRICE_ANALYSIS || '',
    amount: 500
  },
  ip_registration: {
    name: 'Story Protocol IP Registration',
    priceId: process.env.STRIPE_PRICE_IP || '',
    amount: 500
  },
  verification_cert: {
    name: 'Verification Certificate',
    priceId: process.env.STRIPE_PRICE_CERT || '',
    amount: 200
  }
};

// ─── Checkout Session ──────────────────────────────────

/**
 * Create a Stripe checkout session for subscription upgrade.
 */
async function createSubscriptionCheckout(userId, email, tier) {
  if (!stripe) return { error: 'Stripe not configured', checkoutUrl: null };

  const product = STRIPE_PRODUCTS[`subscription_${tier}`];
  if (!product || !product.priceId) {
    return { error: `No Stripe price configured for tier: ${tier}`, checkoutUrl: null };
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer_email: email,
      line_items: [{ price: product.priceId, quantity: 1 }],
      success_url: `${PLATFORM_URL}/settings?upgrade=success&tier=${tier}`,
      cancel_url: `${PLATFORM_URL}/pricing?cancelled=true`,
      metadata: {
        userId,
        tier,
        platform: 'agreemint'
      },
      subscription_data: {
        metadata: { userId, tier }
      }
    });

    return {
      checkoutUrl: session.url,
      sessionId: session.id
    };
  } catch (e) {
    console.error('[stripe] Checkout error:', e.message);
    return { error: e.message, checkoutUrl: null };
  }
}

/**
 * Create a Stripe checkout for one-time purchase (agreement, analysis, etc.).
 */
async function createOneTimeCheckout(userId, email, productKey, metadata = {}) {
  if (!stripe) return { error: 'Stripe not configured', checkoutUrl: null };

  const product = STRIPE_PRODUCTS[productKey];
  if (!product) return { error: `Unknown product: ${productKey}`, checkoutUrl: null };

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: email,
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: { name: product.name },
          unit_amount: product.amount
        },
        quantity: 1
      }],
      success_url: `${PLATFORM_URL}/purchase/success?product=${productKey}`,
      cancel_url: `${PLATFORM_URL}/pricing`,
      metadata: {
        userId,
        productKey,
        platform: 'agreemint',
        ...metadata
      }
    });

    return { checkoutUrl: session.url, sessionId: session.id };
  } catch (e) {
    console.error('[stripe] One-time checkout error:', e.message);
    return { error: e.message, checkoutUrl: null };
  }
}

/**
 * Create a Stripe checkout for template marketplace purchase.
 * Platform takes 20% commission.
 */
async function createTemplateCheckout(buyerEmail, template, sellerStripeAccountId) {
  if (!stripe) return { error: 'Stripe not configured', checkoutUrl: null };

  const price = template.price || 500; // default $5
  const platformFee = Math.round(price * 0.20); // 20% commission

  try {
    const sessionConfig = {
      mode: 'payment',
      customer_email: buyerEmail,
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: `Template: ${template.name}`,
            description: template.description || ''
          },
          unit_amount: price
        },
        quantity: 1
      }],
      success_url: `${PLATFORM_URL}/marketplace/purchase/success?template=${template.id}`,
      cancel_url: `${PLATFORM_URL}/marketplace`,
      metadata: {
        templateId: template.id,
        sellerId: template.authorId,
        platform: 'agreemint'
      }
    };

    // If seller has a connected Stripe account, use Stripe Connect
    if (sellerStripeAccountId) {
      sessionConfig.payment_intent_data = {
        application_fee_amount: platformFee,
        transfer_data: {
          destination: sellerStripeAccountId
        }
      };
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);
    return { checkoutUrl: session.url, sessionId: session.id };
  } catch (e) {
    console.error('[stripe] Template checkout error:', e.message);
    return { error: e.message, checkoutUrl: null };
  }
}

/**
 * Create a Stripe Customer Portal session for managing subscription.
 */
async function createPortalSession(stripeCustomerId) {
  if (!stripe || !stripeCustomerId) return { error: 'Not available', portalUrl: null };

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${PLATFORM_URL}/settings`
    });
    return { portalUrl: session.url };
  } catch (e) {
    return { error: e.message, portalUrl: null };
  }
}

// ─── Webhook Handler ───────────────────────────────────

/**
 * Process Stripe webhook events.
 * Returns { event, action } where action describes what to do.
 */
function processWebhookEvent(rawBody, signature) {
  if (!stripe || !STRIPE_WEBHOOK_SECRET) {
    return { error: 'Stripe webhooks not configured' };
  }

  try {
    const event = stripe.webhooks.constructEvent(rawBody, signature, STRIPE_WEBHOOK_SECRET);
    
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const { userId, tier, productKey, templateId } = session.metadata || {};

        if (session.mode === 'subscription') {
          return {
            action: 'upgrade_tier',
            userId,
            tier,
            stripeCustomerId: session.customer,
            stripeSubscriptionId: session.subscription
          };
        } else if (templateId) {
          return {
            action: 'template_purchased',
            templateId,
            buyerEmail: session.customer_email,
            sellerId: session.metadata.sellerId
          };
        } else if (productKey) {
          return {
            action: 'one_time_purchase',
            userId,
            productKey,
            metadata: session.metadata
          };
        }
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object;
        return {
          action: 'subscription_updated',
          stripeSubscriptionId: sub.id,
          stripeCustomerId: sub.customer,
          status: sub.status,
          tier: sub.metadata?.tier
        };
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        return {
          action: 'subscription_cancelled',
          stripeSubscriptionId: sub.id,
          stripeCustomerId: sub.customer,
          tier: 'free' // downgrade to free
        };
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        return {
          action: 'payment_failed',
          stripeCustomerId: invoice.customer,
          invoiceId: invoice.id,
          attemptCount: invoice.attempt_count
        };
      }

      default:
        return { action: 'ignored', eventType: event.type };
    }
  } catch (e) {
    console.error('[stripe] Webhook error:', e.message);
    return { error: e.message };
  }
}

// ─── Revenue Analytics ─────────────────────────────────

function getRevenueBreakdown(db) {
  const users = Object.values(db.registeredUsers || {});
  const templates = Object.values(db.templates || {});

  const subscribers = {
    free: users.filter(u => u.tier === 'free').length,
    starter: users.filter(u => u.tier === 'starter').length,
    pro: users.filter(u => u.tier === 'pro').length,
    enterprise: users.filter(u => u.tier === 'enterprise').length
  };

  const mrr = (subscribers.starter * 29) + (subscribers.pro * 79) + (subscribers.enterprise * 199);

  return {
    subscribers,
    mrr,
    arr: mrr * 12,
    totalUsers: users.length,
    templatesSold: templates.reduce((sum, t) => sum + (t.purchaseCount || 0), 0),
    templateRevenue: templates.reduce((sum, t) => sum + (t.totalRevenue || 0), 0),
    revenueStreams: {
      subscriptions: mrr,
      templateCommissions: Math.round(templates.reduce((sum, t) => sum + (t.totalRevenue || 0) * 0.20, 0)),
      perUsePurchases: 0, // tracked separately
      escrowFees: 0 // tracked on-chain
    }
  };
}

module.exports = {
  initStripe,
  STRIPE_PRODUCTS,
  createSubscriptionCheckout,
  createOneTimeCheckout,
  createTemplateCheckout,
  createPortalSession,
  processWebhookEvent,
  getRevenueBreakdown
};
