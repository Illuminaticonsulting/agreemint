/**
 * AgreeMint — Keep Your Word Engine
 *
 * A free, standalone social reputation system.
 * Users sign in with social media (X, Instagram, Google),
 * make public pledges/promises, and build an on-chain
 * reputation score based on whether they keep their word.
 *
 * The pledge hash gets anchored to Story Protocol,
 * creating an immutable record of commitments.
 */

const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

// ─── Supported Currencies for Escrow ───────────────────
const ESCROW_CURRENCIES = {
  ETH: {
    symbol: 'ETH',
    name: 'Ethereum',
    icon: 'E',
    type: 'native',
    network: 'Base',
    chainId: '8453',
    decimals: 18,
    address: '0x0000000000000000000000000000000000000000'
  },
  BTC: {
    symbol: 'BTC',
    name: 'Bitcoin',
    icon: 'B',
    type: 'wrapped',
    network: 'Base',
    chainId: '8453',
    decimals: 8,
    address: '0x236aa50979D5f3De3Bd1Eeb40E81137F22ab794b', // WBTC on Base
    note: 'Wrapped BTC (WBTC) on Base network'
  },
  USDT: {
    symbol: 'USDT',
    name: 'Tether USD',
    icon: 'T',
    type: 'erc20',
    network: 'Base',
    chainId: '8453',
    decimals: 6,
    address: '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2', // USDT on Base
  },
  USDC: {
    symbol: 'USDC',
    name: 'USD Coin',
    icon: 'C',
    type: 'erc20',
    network: 'Base',
    chainId: '8453',
    decimals: 6,
    address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC on Base
  },
  XMR: {
    symbol: 'XMR',
    name: 'Monero',
    icon: 'M',
    type: 'atomic-swap',
    network: 'Monero',
    decimals: 12,
    address: null,
    note: 'Monero escrow via atomic swap bridge or manual verification'
  },
  DAI: {
    symbol: 'DAI',
    name: 'DAI Stablecoin',
    icon: 'D',
    type: 'erc20',
    network: 'Base',
    chainId: '8453',
    decimals: 18,
    address: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb', // DAI on Base
  }
};

// ─── Escrow Rule Presets ───────────────────────────────
const ESCROW_RULE_PRESETS = {
  standard: {
    name: 'Standard Escrow',
    description: 'Both parties must approve release. Arbiter resolves disputes.',
    autoRelease: false,
    timeoutDays: 30,
    requireBothDeposit: true,
    allowPartialRelease: false,
    disputeWindowDays: 7,
    platformFeeBps: 50,
    cancellationPolicy: 'mutual',  // mutual, creator, none
    refundOnTimeout: true
  },
  bet: {
    name: 'Bet / Wager',
    description: 'Both deposit equal amounts. Arbiter declares winner. Loser forfeits.',
    autoRelease: false,
    timeoutDays: 90,
    requireBothDeposit: true,
    requireEqualDeposit: true,
    allowPartialRelease: false,
    disputeWindowDays: 14,
    platformFeeBps: 100,
    cancellationPolicy: 'mutual',
    refundOnTimeout: true
  },
  sale: {
    name: 'Sale / Purchase',
    description: 'Buyer deposits. Seller delivers. Buyer confirms receipt to release.',
    autoRelease: false,
    timeoutDays: 14,
    requireBothDeposit: false,
    buyerDepositsOnly: true,
    allowPartialRelease: false,
    disputeWindowDays: 7,
    platformFeeBps: 50,
    cancellationPolicy: 'creator',
    refundOnTimeout: true,
    deliveryConfirmation: true
  },
  milestone: {
    name: 'Milestone-Based',
    description: 'Funds released in stages as milestones are completed.',
    autoRelease: false,
    timeoutDays: 180,
    requireBothDeposit: false,
    allowPartialRelease: true,
    milestones: [],
    disputeWindowDays: 14,
    platformFeeBps: 75,
    cancellationPolicy: 'mutual',
    refundOnTimeout: false
  },
  timelock: {
    name: 'Time-Locked',
    description: 'Funds auto-release to recipient after the timelock expires.',
    autoRelease: true,
    autoReleaseDays: 30,
    timeoutDays: null,
    requireBothDeposit: false,
    allowPartialRelease: false,
    disputeWindowDays: 0,
    platformFeeBps: 25,
    cancellationPolicy: 'none',
    refundOnTimeout: false
  },
  keepyourword: {
    name: 'Keep Your Word Pledge',
    description: 'Stake crypto on a public promise. Lose stake if you break your word.',
    autoRelease: false,
    timeoutDays: 365,
    requireBothDeposit: false,
    stakerDepositsOnly: true,
    allowPartialRelease: false,
    disputeWindowDays: 30,
    platformFeeBps: 0,
    cancellationPolicy: 'none',
    refundOnTimeout: false,
    socialVerification: true
  }
};

// ─── Social Score Calculation ──────────────────────────

function calculateSocialScore(user) {
  const pledges = user.pledges || [];
  if (pledges.length === 0) return { score: 50, grade: 'NEW', totalPledges: 0, kept: 0, broken: 0 };

  const kept = pledges.filter(p => p.status === 'kept').length;
  const broken = pledges.filter(p => p.status === 'broken').length;
  const pending = pledges.filter(p => p.status === 'active').length;
  const total = kept + broken;

  if (total === 0) return { score: 50, grade: 'PENDING', totalPledges: pledges.length, kept: 0, broken: 0, pending };

  // Score from 0–100
  // Base: kept/total ratio * 80
  // Bonus: volume bonus up to 10 points (more pledges = more reliable)
  // Bonus: streak bonus up to 10 points (consecutive kept pledges)
  const ratio = kept / total;
  let score = Math.round(ratio * 80);

  // Volume bonus
  const volumeBonus = Math.min(10, Math.floor(total / 3));
  score += volumeBonus;

  // Streak bonus — count consecutive kept from most recent
  let streak = 0;
  const sorted = [...pledges].filter(p => p.status !== 'active').sort((a, b) => new Date(b.resolvedAt) - new Date(a.resolvedAt));
  for (const p of sorted) {
    if (p.status === 'kept') streak++;
    else break;
  }
  const streakBonus = Math.min(10, streak * 2);
  score += streakBonus;

  score = Math.min(100, Math.max(0, score));

  let grade;
  if (score >= 90) grade = 'DIAMOND';
  else if (score >= 75) grade = 'GOLD';
  else if (score >= 60) grade = 'SILVER';
  else if (score >= 40) grade = 'BRONZE';
  else grade = 'UNTRUSTWORTHY';

  return {
    score,
    grade,
    totalPledges: pledges.length,
    kept,
    broken,
    pending,
    streak,
    volumeBonus,
    streakBonus,
    ratio: Math.round(ratio * 100)
  };
}

// ─── Create Pledge ─────────────────────────────────────

function createPledge(userId, pledgeData) {
  const {
    title,
    description,
    deadline,
    category = 'personal',
    isPublic = true,
    stakeAmount = 0,
    stakeCurrency = null,
    witnessRequired = false,
    witnessId = null,
    counterpartyId = null
  } = pledgeData;

  const id = uuidv4();
  const now = new Date().toISOString();

  const pledge = {
    id,
    userId,
    title,
    description,
    category,
    status: 'active',
    isPublic,
    stakeAmount,
    stakeCurrency,
    hasStake: stakeAmount > 0,
    witnessRequired,
    witnessId,
    counterpartyId,
    deadline: deadline || null,
    contentHash: hashPledge({ title, description, userId, deadline }),
    createdAt: now,
    resolvedAt: null,
    resolution: null,
    verifications: [],
    reactions: { vouch: 0, doubt: 0 }
  };

  return pledge;
}

function hashPledge(data) {
  return '0x' + crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
}

// ─── Verify / Resolve Pledge ───────────────────────────

function resolvePledge(pledge, resolution, resolvedBy) {
  pledge.status = resolution; // 'kept' or 'broken'
  pledge.resolvedAt = new Date().toISOString();
  pledge.resolution = {
    status: resolution,
    resolvedBy,
    timestamp: new Date().toISOString(),
    hash: hashPledge({ pledgeId: pledge.id, resolution, resolvedBy })
  };
  return pledge;
}

// ─── Pledge Categories ─────────────────────────────────

const PLEDGE_CATEGORIES = [
  { id: 'business', name: 'Business', icon: '&#128188;', description: 'Business commitments and deals' },
  { id: 'personal', name: 'Personal', icon: '&#127775;', description: 'Personal goals and promises' },
  { id: 'bet', name: 'Bet / Wager', icon: '&#127922;', description: 'Bets and predictions' },
  { id: 'fitness', name: 'Fitness', icon: '&#128170;', description: 'Health and fitness goals' },
  { id: 'financial', name: 'Financial', icon: '&#128176;', description: 'Money and investment commitments' },
  { id: 'relationship', name: 'Relationship', icon: '&#129309;', description: 'Promises to others' },
  { id: 'education', name: 'Education', icon: '&#128218;', description: 'Learning and growth pledges' },
  { id: 'social', name: 'Social Impact', icon: '&#127758;', description: 'Community and charity pledges' }
];

module.exports = {
  ESCROW_CURRENCIES,
  ESCROW_RULE_PRESETS,
  calculateSocialScore,
  createPledge,
  resolvePledge,
  hashPledge,
  PLEDGE_CATEGORIES
};
