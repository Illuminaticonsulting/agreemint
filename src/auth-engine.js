/**
 * AgreeMint — Auth Engine
 *
 * Self-registration system with email verification,
 * API key management, and tier-based access control.
 *
 * Tiers:
 *   free       — 3 agreements/month, no AI, no escrow
 *   starter    — 10 agreements/month, AI analysis, basic escrow ($29/mo)
 *   pro        — 50 agreements/month, full AI, full escrow, templates ($79/mo)
 *   enterprise — unlimited, priority, custom branding ($199/mo)
 */

const crypto = require('crypto');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

// ─── Tier Definitions ─────────────────────────────────
const TIERS = {
  free: {
    name: 'Free',
    price: 0,
    stripePriceId: null,
    limits: {
      agreementsPerMonth: 3,
      aiAnalysis: false,
      aiGeneration: false,
      escrow: false,
      storyProtocol: false,
      templateMarketplace: true,
      apiAccess: false,
      maxParties: 2,
      pdfExport: true,
      disputes: false,
      support: 'community'
    }
  },
  starter: {
    name: 'Starter',
    price: 2900, // cents
    stripePriceId: null, // set after Stripe product creation
    limits: {
      agreementsPerMonth: 10,
      aiAnalysis: true,
      aiGeneration: true,
      escrow: true,
      storyProtocol: true,
      templateMarketplace: true,
      apiAccess: false,
      maxParties: 5,
      pdfExport: true,
      disputes: true,
      support: 'email'
    }
  },
  pro: {
    name: 'Pro',
    price: 7900,
    stripePriceId: null,
    limits: {
      agreementsPerMonth: 50,
      aiAnalysis: true,
      aiGeneration: true,
      escrow: true,
      storyProtocol: true,
      templateMarketplace: true,
      apiAccess: true,
      maxParties: 20,
      pdfExport: true,
      disputes: true,
      support: 'priority'
    }
  },
  enterprise: {
    name: 'Enterprise',
    price: 19900,
    stripePriceId: null,
    limits: {
      agreementsPerMonth: 999999,
      aiAnalysis: true,
      aiGeneration: true,
      escrow: true,
      storyProtocol: true,
      templateMarketplace: true,
      apiAccess: true,
      maxParties: 100,
      pdfExport: true,
      disputes: true,
      support: 'dedicated'
    }
  }
};

// ─── User Registration ─────────────────────────────────
async function createUser(userData) {
  const { email, password, name, company } = userData;

  if (!email || !password) throw new Error('Email and password required');
  if (password.length < 6) throw new Error('Password must be at least 6 characters');

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) throw new Error('Invalid email format');

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  const verificationCode = crypto.randomBytes(3).toString('hex').toUpperCase(); // 6 char code
  const apiKey = `am_${crypto.randomBytes(24).toString('hex')}`; // API key

  return {
    id: uuidv4(),
    email: email.toLowerCase().trim(),
    passwordHash,
    name: name || email.split('@')[0],
    company: company || '',
    tier: 'free',
    role: 'user',
    apiKey,
    apiKeyActive: false, // activated on upgrade
    verified: false,
    verificationCode,
    verificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    usage: {
      agreementsThisMonth: 0,
      lastResetDate: new Date().toISOString(),
      totalAgreements: 0,
      totalEscrows: 0,
      totalIPRegistrations: 0
    },
    createdAt: new Date().toISOString(),
    lastLoginAt: null
  };
}

async function verifyPassword(plaintext, hash) {
  return bcrypt.compare(plaintext, hash);
}

function generateVerificationEmail(user) {
  return {
    subject: 'Verify your AgreeMint account',
    html: `
      <div style="font-family: Inter, Arial, sans-serif; max-width: 500px; margin: 0 auto; background: #111; color: #fff; padding: 40px; border-radius: 12px;">
        <h1 style="color: #c8a000; margin-bottom: 20px;">Welcome to AgreeMint</h1>
        <p>Hi ${user.name},</p>
        <p>Your verification code is:</p>
        <div style="background: #222; padding: 20px; border-radius: 8px; text-align: center; font-size: 32px; letter-spacing: 8px; font-weight: bold; color: #c8a000; margin: 20px 0;">
          ${user.verificationCode}
        </div>
        <p style="color: #999; font-size: 14px;">This code expires in 24 hours.</p>
        <hr style="border: 1px solid #333; margin: 20px 0;">
        <p style="color: #666; font-size: 12px;">KingPin Strategies — AgreeMint Platform</p>
      </div>
    `,
    text: `Welcome to AgreeMint. Your verification code is: ${user.verificationCode}. This code expires in 24 hours.`
  };
}

// ─── Usage Tracking ────────────────────────────────────
function checkUsageLimit(user, resource) {
  const tier = TIERS[user.tier] || TIERS.free;
  const limits = tier.limits;

  // Reset monthly counters
  const resetDate = new Date(user.usage.lastResetDate);
  const now = new Date();
  if (now.getMonth() !== resetDate.getMonth() || now.getFullYear() !== resetDate.getFullYear()) {
    user.usage.agreementsThisMonth = 0;
    user.usage.lastResetDate = now.toISOString();
  }

  switch (resource) {
    case 'agreement':
      return {
        allowed: user.usage.agreementsThisMonth < limits.agreementsPerMonth,
        used: user.usage.agreementsThisMonth,
        limit: limits.agreementsPerMonth,
        resource
      };
    case 'ai':
      return { allowed: limits.aiAnalysis, resource };
    case 'escrow':
      return { allowed: limits.escrow, resource };
    case 'story':
      return { allowed: limits.storyProtocol, resource };
    case 'api':
      return { allowed: limits.apiAccess, resource };
    case 'dispute':
      return { allowed: limits.disputes, resource };
    default:
      return { allowed: true, resource };
  }
}

function incrementUsage(user, resource) {
  switch (resource) {
    case 'agreement':
      user.usage.agreementsThisMonth++;
      user.usage.totalAgreements++;
      break;
    case 'escrow':
      user.usage.totalEscrows++;
      break;
    case 'story':
      user.usage.totalIPRegistrations++;
      break;
  }
}

// ─── API Key Validation ────────────────────────────────
function validateApiKey(apiKey) {
  if (!apiKey || !apiKey.startsWith('am_')) return null;
  return apiKey;
}

module.exports = {
  TIERS,
  createUser,
  verifyPassword,
  generateVerificationEmail,
  checkUsageLimit,
  incrementUsage,
  validateApiKey
};
