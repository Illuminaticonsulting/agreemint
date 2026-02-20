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
  // Base: kept/total ratio * 70
  // Bonus: volume bonus up to 10 points
  // Bonus: streak bonus up to 10 points (consecutive kept)
  // Bonus: checkin streak bonus up to 5 points (self-pledge daily streaks)
  // Bonus: GPS verified bonus up to 5 points
  const ratio = kept / total;
  let score = Math.round(ratio * 70);

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

  // Self-pledge daily check-in streak bonus
  const maxDailyStreak = Math.max(0, ...pledges.filter(p => p.mode === 'self').map(p => p.currentStreak || 0));
  const checkinStreakBonus = Math.min(5, Math.floor(maxDailyStreak / 3));
  score += checkinStreakBonus;

  // GPS/verified check-in bonus - rewards real-world verification
  const gpsVerifiedCount = pledges.reduce((sum, p) => sum + (p.checkins || []).filter(c => c.method === 'gps_verified').length, 0);
  const gpsBonus = Math.min(5, Math.floor(gpsVerifiedCount / 5));
  score += gpsBonus;

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
    checkinStreakBonus,
    gpsBonus,
    maxDailyStreak,
    ratio: Math.round(ratio * 100)
  };
}

// ─── Pledge Modes ──────────────────────────────────────
// 'mutual'  — between 2 people, counterparty confirms/denies
// 'self'    — personal accountability, verified by GPS/time/photo/streak

// ─── Self-Pledge Verification Types ────────────────────
const VERIFICATION_TYPES = {
  gps: {
    id: 'gps',
    name: 'Location Check-in',
    icon: '&#128205;',
    description: 'GPS confirms you visited the location',
    fields: ['locationName', 'latitude', 'longitude', 'radiusMeters']
  },
  timed: {
    id: 'timed',
    name: 'Time-Stamped Check-in',
    icon: '&#9200;',
    description: 'Check in before a daily deadline',
    fields: ['dailyDeadline']  // e.g. "06:00"
  },
  photo: {
    id: 'photo',
    name: 'Photo Proof',
    icon: '&#128247;',
    description: 'Upload a photo as evidence',
    fields: []
  },
  streak: {
    id: 'streak',
    name: 'Daily Streak',
    icon: '&#128293;',
    description: 'Check in daily to maintain your streak',
    fields: []
  },
  peer: {
    id: 'peer',
    name: 'Peer Witness',
    icon: '&#128101;',
    description: 'Another person confirms your completion',
    fields: ['witnessHandle']
  },
  date_mutual: {
    id: 'date_mutual',
    name: 'Date Confirmation',
    icon: '&#128140;',
    description: 'Both people confirm the date happened and rate the experience',
    fields: ['dateLocation', 'dateTime']
  }
};

// ─── Self-Pledge Templates ─────────────────────────────
const SELF_PLEDGE_TEMPLATES = [
  {
    id: 'gym',
    name: 'Hit the Gym',
    icon: '&#127947;',
    category: 'fitness',
    defaultTitle: 'Go to the gym',
    description: 'Commit to visiting your gym regularly',
    verification: 'gps',
    fields: { locationName: '', latitude: null, longitude: null, radiusMeters: 200 },
    frequencyOptions: ['daily', '3x/week', '5x/week'],
    scoreMultiplier: 1.2
  },
  {
    id: 'running',
    name: 'Go Running',
    icon: '&#127939;',
    category: 'fitness',
    defaultTitle: 'Run every morning',
    description: 'Track your runs with GPS route verification',
    verification: 'gps',
    fields: { locationName: 'Running route start', latitude: null, longitude: null, radiusMeters: 500 },
    frequencyOptions: ['daily', '3x/week', '5x/week'],
    scoreMultiplier: 1.2
  },
  {
    id: 'wake_early',
    name: 'Wake Up Early',
    icon: '&#9728;',
    category: 'personal',
    defaultTitle: 'Wake up before 6:00 AM',
    description: 'Check in before your deadline to prove you\'re up',
    verification: 'timed',
    fields: { dailyDeadline: '06:00' },
    frequencyOptions: ['daily', 'weekdays'],
    scoreMultiplier: 1.0
  },
  {
    id: 'no_spending',
    name: 'No Unnecessary Spending',
    icon: '&#128176;',
    category: 'financial',
    defaultTitle: 'No eating out for 30 days',
    description: 'Track your no-spend streak with daily check-ins',
    verification: 'streak',
    fields: {},
    frequencyOptions: ['daily'],
    scoreMultiplier: 1.0
  },
  {
    id: 'study',
    name: 'Study / Learn',
    icon: '&#128218;',
    category: 'education',
    defaultTitle: 'Study 2 hours every day',
    description: 'Log your study sessions. Photo proof optional.',
    verification: 'timed',
    fields: { dailyDeadline: '23:59' },
    frequencyOptions: ['daily', 'weekdays'],
    scoreMultiplier: 1.1
  },
  {
    id: 'diet',
    name: 'Clean Eating',
    icon: '&#129367;',
    category: 'fitness',
    defaultTitle: 'Eat clean for 21 days',
    description: 'Photo-prove your healthy meals',
    verification: 'photo',
    fields: {},
    frequencyOptions: ['daily'],
    scoreMultiplier: 1.1
  },
  {
    id: 'meditation',
    name: 'Meditate',
    icon: '&#129496;',
    category: 'personal',
    defaultTitle: 'Meditate 10 minutes daily',
    description: 'Build a consistent meditation practice',
    verification: 'streak',
    fields: {},
    frequencyOptions: ['daily'],
    scoreMultiplier: 1.0
  },
  {
    id: 'sobriety',
    name: 'Sobriety / Quit Habit',
    icon: '&#128170;',
    category: 'personal',
    defaultTitle: 'No smoking for 60 days',
    description: 'Daily check-in to maintain your sobriety/quit streak',
    verification: 'streak',
    fields: {},
    frequencyOptions: ['daily'],
    scoreMultiplier: 1.3
  },
  {
    id: 'reading',
    name: 'Read Daily',
    icon: '&#128214;',
    category: 'education',
    defaultTitle: 'Read 30 pages every day',
    description: 'Log pages or chapters completed each day',
    verification: 'streak',
    fields: {},
    frequencyOptions: ['daily'],
    scoreMultiplier: 1.0
  },
  {
    id: 'custom',
    name: 'Custom Goal',
    icon: '&#127919;',
    category: 'personal',
    defaultTitle: '',
    description: 'Define your own goal with any verification method',
    verification: 'streak',
    fields: {},
    frequencyOptions: ['daily', '3x/week', '5x/week', 'weekly'],
    scoreMultiplier: 0.8
  }
];

// ─── Date Pledge Templates ─────────────────────────────
const DATE_PLEDGE_TEMPLATES = [
  {
    id: 'first_date',
    name: 'First Date',
    icon: '&#9749;',
    category: 'dating',
    defaultTitle: 'I will show up to our first date',
    description: 'Promise to actually show up, be on time, and be respectful',
    pledges: [
      'I will show up on time',
      'I will be honest about who I am',
      'I will be respectful regardless of chemistry',
      'I will not ghost after the date'
    ],
    scoreWeight: 1.5
  },
  {
    id: 'no_ghosting',
    name: 'No Ghosting',
    icon: '&#128123;',
    category: 'dating',
    defaultTitle: 'I will not ghost — I\'ll communicate honestly',
    description: 'Commit to giving a clear yes or no instead of disappearing',
    pledges: [
      'I will respond within 24 hours',
      'If I\'m not interested I\'ll say so respectfully',
      'I won\'t leave someone hanging'
    ],
    scoreWeight: 2.0
  },
  {
    id: 'honest_intentions',
    name: 'Honest Intentions',
    icon: '&#128172;',
    category: 'dating',
    defaultTitle: 'I\'m upfront about what I\'m looking for',
    description: 'Be clear about your intentions — relationship, casual, friendship',
    pledges: [
      'I will be honest about what I want',
      'I won\'t mislead about my relationship status',
      'My photos are recent and accurate'
    ],
    scoreWeight: 1.8
  },
  {
    id: 'safe_meetup',
    name: 'Safe Meetup',
    icon: '&#128737;',
    category: 'dating',
    defaultTitle: 'I agree to meet in a safe public place',
    description: 'Commit to safety-first dating — public locations, respectful boundaries',
    pledges: [
      'We will meet in a public place',
      'I will respect boundaries',
      'I will not pressure for a private location'
    ],
    scoreWeight: 1.5
  },
  {
    id: 'split_fair',
    name: 'Fair & Clear on $',
    icon: '&#128176;',
    category: 'dating',
    defaultTitle: 'We agree on how to handle the bill upfront',
    description: 'No awkward bill moments — agree on splitting, treating, or alternating',
    pledges: [
      'We will discuss the bill arrangement beforehand',
      'No guilt-tripping about money',
      'Keep it fair and comfortable for both'
    ],
    scoreWeight: 1.0
  },
  {
    id: 'second_date',
    name: 'Second Date Promise',
    icon: '&#10084;',
    category: 'dating',
    defaultTitle: 'We both agree to go on a second date',
    description: 'Lock in that second date — both people commit',
    pledges: [
      'We will plan a second date within a week',
      'We will follow through on the plan',
      'If plans change, we communicate early'
    ],
    scoreWeight: 1.3
  },
  {
    id: 'exclusive_talk',
    name: 'Exclusivity Talk',
    icon: '&#128142;',
    category: 'dating',
    defaultTitle: 'We agree to be exclusive',
    description: 'Make the exclusivity commitment official and on-chain',
    pledges: [
      'We are exclusively dating each other',
      'We will communicate openly about our relationship',
      'If feelings change, we talk first'
    ],
    scoreWeight: 2.5
  },
  {
    id: 'real_photos',
    name: 'Real Photos Pledge',
    icon: '&#128247;',
    category: 'dating',
    defaultTitle: 'My profile photos are real and recent',
    description: 'Promise your dating profile is honest — no catfishing',
    pledges: [
      'All my photos are from the last 12 months',
      'No extreme filters that change how I look',
      'My bio is truthful'
    ],
    scoreWeight: 1.2
  }
];

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
    counterpartyId = null,
    // New fields for modes
    mode = 'self',               // 'self' or 'mutual'
    counterpartyHandle = null,   // for mutual mode
    counterpartyProvider = null,  // for mutual mode
    // Self-pledge fields
    templateId = null,
    verificationType = 'streak',
    frequency = 'daily',
    targetDays = 30,
    locationName = null,
    latitude = null,
    longitude = null,
    radiusMeters = 200,
    dailyDeadline = null
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
    reactions: { vouch: 0, doubt: 0 },

    // Mode
    mode,

    // Mutual pledge fields
    counterpartyHandle: (mode === 'mutual' || mode === 'date') ? counterpartyHandle : null,
    counterpartyProvider: (mode === 'mutual' || mode === 'date') ? counterpartyProvider : null,
    counterpartyAccepted: (mode === 'mutual' || mode === 'date') ? false : null,
    counterpartyUserId: null,

    // Self-pledge fields
    templateId: mode === 'self' ? templateId : (mode === 'date' ? templateId : null),
    verificationType: mode === 'self' ? verificationType : (mode === 'date' ? 'date_mutual' : (mode === 'mutual' ? 'peer' : 'streak')),
    frequency: mode === 'self' ? frequency : null,
    targetDays: mode === 'self' ? targetDays : null,
    currentStreak: 0,
    longestStreak: 0,
    totalCheckins: 0,
    checkins: [],  // { date, time, verified, method, lat?, lng?, photoUrl?, note? }

    // Date-specific fields
    dateLocation: pledgeData.dateLocation || null,
    dateTime: pledgeData.dateTime || null,
    dateSubPledges: pledgeData.dateSubPledges || [],  // individual commitments within the date pledge
    dateRatings: {},  // { userId: { showedUp: bool, honest: bool, respectful: bool, wouldDateAgain: bool, note: '' } }

    // Location verification
    locationName: locationName || null,
    latitude: latitude || null,
    longitude: longitude || null,
    radiusMeters: radiusMeters || 200,

    // Time verification
    dailyDeadline: dailyDeadline || null
  };

  return pledge;
}

// ─── Check-in for Self-Pledges ─────────────────────────

function processCheckin(pledge, checkinData) {
  const { latitude, longitude, timestamp, photoUrl, note } = checkinData;
  const now = new Date(timestamp || Date.now());
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toTimeString().split(' ')[0].substring(0, 5);

  // Prevent duplicate check-ins for same day
  if (pledge.checkins.some(c => c.date === dateStr)) {
    return { success: false, error: 'Already checked in today' };
  }

  let verified = false;
  let method = pledge.verificationType;

  // GPS verification
  if (pledge.verificationType === 'gps' && pledge.latitude && pledge.longitude) {
    if (latitude && longitude) {
      const dist = haversineDistance(latitude, longitude, pledge.latitude, pledge.longitude);
      verified = dist <= (pledge.radiusMeters || 200);
      method = verified ? 'gps_verified' : 'gps_failed';
    } else {
      method = 'gps_no_location';
      verified = false;
    }
  }

  // Timed verification
  if (pledge.verificationType === 'timed' && pledge.dailyDeadline) {
    const deadlineParts = pledge.dailyDeadline.split(':');
    const deadlineMinutes = parseInt(deadlineParts[0]) * 60 + parseInt(deadlineParts[1]);
    const checkinMinutes = now.getHours() * 60 + now.getMinutes();
    verified = checkinMinutes <= deadlineMinutes;
    method = verified ? 'timed_verified' : 'timed_late';
  }

  // Photo verification — mark as submitted (manual review potentially)
  if (pledge.verificationType === 'photo') {
    verified = !!photoUrl;
    method = verified ? 'photo_submitted' : 'photo_missing';
  }

  // Streak / daily check-in — self-reported, always accepted
  if (pledge.verificationType === 'streak') {
    verified = true;
    method = 'streak_checkin';
  }

  const checkin = {
    date: dateStr,
    time: timeStr,
    verified,
    method,
    latitude: latitude || null,
    longitude: longitude || null,
    photoUrl: photoUrl || null,
    note: note || null,
    timestamp: now.toISOString()
  };

  pledge.checkins.push(checkin);
  pledge.totalCheckins++;

  // Calculate streak
  updateStreak(pledge);

  // Check if pledge is completed (hit target days)
  if (pledge.targetDays && pledge.checkins.filter(c => c.verified).length >= pledge.targetDays) {
    pledge.status = 'kept';
    pledge.resolvedAt = now.toISOString();
    pledge.resolution = {
      status: 'kept',
      resolvedBy: 'auto_complete',
      timestamp: now.toISOString(),
      hash: hashPledge({ pledgeId: pledge.id, resolution: 'kept', resolvedBy: 'auto_complete' })
    };
  }

  return { success: true, checkin, streak: pledge.currentStreak, verified, pledge };
}

function updateStreak(pledge) {
  const verifiedDates = pledge.checkins
    .filter(c => c.verified)
    .map(c => c.date)
    .sort()
    .reverse();

  if (verifiedDates.length === 0) {
    pledge.currentStreak = 0;
    return;
  }

  // Count consecutive days from today backwards
  let streak = 0;
  const today = new Date().toISOString().split('T')[0];
  let checkDate = today;

  for (let i = 0; i < 400; i++) {
    if (verifiedDates.includes(checkDate)) {
      streak++;
      // Go to previous day
      const d = new Date(checkDate);
      d.setDate(d.getDate() - 1);
      checkDate = d.toISOString().split('T')[0];
    } else if (i === 0) {
      // Today not checked in yet; check yesterday
      const d = new Date(checkDate);
      d.setDate(d.getDate() - 1);
      checkDate = d.toISOString().split('T')[0];
      continue;
    } else {
      break;
    }
  }

  pledge.currentStreak = streak;
  if (streak > pledge.longestStreak) pledge.longestStreak = streak;
}

// ─── Haversine Distance (meters) ───────────────────────

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth radius in meters
  const toRad = deg => deg * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
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
  { id: 'social', name: 'Social Impact', icon: '&#127758;', description: 'Community and charity pledges' },
  { id: 'dating', name: 'Dating', icon: '&#128140;', description: 'Dating pledges — show up, be honest, no ghosting' }
];

// ─── Calculate Dating Score ─────────────────────────────

function calculateDatingScore(user) {
  const datePledges = (user.pledges || []).filter(p => p.mode === 'date');
  if (datePledges.length === 0) return { datingScore: 0, grade: 'NEW', totalDates: 0, showedUp: 0, ghosted: 0, badges: [] };

  const kept = datePledges.filter(p => p.status === 'kept').length;
  const broken = datePledges.filter(p => p.status === 'broken').length;
  const total = kept + broken;
  if (total === 0) return { datingScore: 50, grade: 'PENDING', totalDates: datePledges.length, showedUp: 0, ghosted: 0, badges: [] };

  const ratio = kept / total;
  let score = Math.round(ratio * 80);

  // Volume bonus — more dates completed = more trustworthy
  score += Math.min(10, Math.floor(total / 2));

  // Rating bonus from counterparty feedback
  let positiveRatings = 0;
  let totalRatings = 0;
  datePledges.forEach(p => {
    Object.values(p.dateRatings || {}).forEach(r => {
      totalRatings++;
      if (r.showedUp) positiveRatings++;
      if (r.honest) positiveRatings++;
      if (r.respectful) positiveRatings++;
      if (r.wouldDateAgain) positiveRatings++;
    });
  });
  if (totalRatings > 0) score += Math.min(10, Math.round((positiveRatings / (totalRatings * 4)) * 10));

  score = Math.min(100, Math.max(0, score));

  // Badges
  const badges = [];
  if (kept >= 1) badges.push('&#9989; Shows Up');
  if (kept >= 5) badges.push('&#11088; Reliable');
  if (kept >= 10) badges.push('&#128142; Consistent');
  if (broken === 0 && total >= 3) badges.push('&#128123; Never Ghosted');
  const noGhostPledges = datePledges.filter(p => p.templateId === 'no_ghosting' && p.status === 'kept').length;
  if (noGhostPledges >= 3) badges.push('&#128172; Good Communicator');
  const honestPledges = datePledges.filter(p => p.templateId === 'honest_intentions' && p.status === 'kept').length;
  if (honestPledges >= 2) badges.push('&#128588; Honest About Intentions');
  const safeCount = datePledges.filter(p => p.templateId === 'safe_meetup' && p.status === 'kept').length;
  if (safeCount >= 2) badges.push('&#128737; Safety-Conscious');

  let grade;
  if (score >= 90) grade = 'DIAMOND';
  else if (score >= 75) grade = 'GOLD';
  else if (score >= 60) grade = 'SILVER';
  else if (score >= 40) grade = 'BRONZE';
  else grade = 'UNTRUSTWORTHY';

  return {
    datingScore: score,
    grade,
    totalDates: datePledges.length,
    showedUp: kept,
    ghosted: broken,
    badges,
    positiveRatings,
    totalRatings
  };
}

module.exports = {
  ESCROW_CURRENCIES,
  ESCROW_RULE_PRESETS,
  VERIFICATION_TYPES,
  SELF_PLEDGE_TEMPLATES,
  DATE_PLEDGE_TEMPLATES,
  calculateSocialScore,
  calculateDatingScore,
  createPledge,
  resolvePledge,
  processCheckin,
  updateStreak,
  haversineDistance,
  hashPledge,
  PLEDGE_CATEGORIES
};
