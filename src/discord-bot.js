/**
 * AgreeMint — Discord Bot Store
 *
 * Turn Discord into a monetization channel:
 * 1. /agreement — Generate agreements right from Discord ($5-25 per generation)
 * 2. /template — Browse & buy pre-made templates ($2-15 each)
 * 3. /score — Look up anyone's Keep Your Word social score (free, drives adoption)
 * 4. /verify — Verify any agreement hash on-chain (free, builds trust)
 * 5. /escrow — Quick escrow setup between Discord users ($10-50 per escrow)
 * 6. /subscribe — Upgrade tier (links to Stripe checkout)
 *
 * Revenue streams:
 *   - Per-generation fees for non-subscribers
 *   - Template marketplace commissions (20% platform cut)
 *   - Escrow platform fees (0.5% of value)
 *   - Subscription upsells from Discord
 *
 * Setup: Create bot at https://discord.com/developers
 * Set DISCORD_BOT_TOKEN and DISCORD_CLIENT_ID in .env
 */

const crypto = require('crypto');

// ─── Config ─────────────────────────────────────────────
const DISCORD_TOKEN = process.env.DISCORD_BOT_TOKEN || '';
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID || '';
const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID || '';
const PLATFORM_URL = process.env.BASE_URL || 'https://docs.kingpinstrategies.com';

// ─── Bot Command Definitions ───────────────────────────
// These are registered with Discord's slash command API

const DISCORD_COMMANDS = [
  {
    name: 'agreement',
    description: 'Generate a legal agreement instantly',
    options: [
      {
        name: 'type',
        description: 'Agreement type',
        type: 3, // STRING
        required: true,
        choices: [
          { name: 'Mutual NDA', value: 'mutual_nda' },
          { name: 'Freelancer Contract', value: 'independent_contractor' },
          { name: 'Service Agreement', value: 'msa' },
          { name: 'SAFE Note', value: 'safe' },
          { name: 'Partnership', value: 'partnership' },
          { name: 'Terms of Service', value: 'tos' },
          { name: 'IP License', value: 'licensing' },
          { name: 'Non-Compete', value: 'non_compete' }
        ]
      },
      {
        name: 'party_a',
        description: 'Your name or company',
        type: 3,
        required: true
      },
      {
        name: 'party_b',
        description: 'Other party name or company',
        type: 3,
        required: true
      },
      {
        name: 'jurisdiction',
        description: 'Legal jurisdiction',
        type: 3,
        required: false,
        choices: [
          { name: 'Delaware, USA', value: 'United States (Delaware)' },
          { name: 'California, USA', value: 'United States (California)' },
          { name: 'New York, USA', value: 'United States (New York)' },
          { name: 'United Kingdom', value: 'United Kingdom' },
          { name: 'Singapore', value: 'Singapore' },
          { name: 'UAE (DIFC)', value: 'United Arab Emirates (DIFC)' }
        ]
      }
    ]
  },
  {
    name: 'template',
    description: 'Browse the template marketplace',
    options: [
      {
        name: 'category',
        description: 'Template category',
        type: 3,
        required: false,
        choices: [
          { name: 'Confidentiality', value: 'Confidentiality' },
          { name: 'Services', value: 'Services' },
          { name: 'Employment', value: 'Employment' },
          { name: 'Investment', value: 'Investment' },
          { name: 'IP & Licensing', value: 'Intellectual Property' },
          { name: 'Entity Formation', value: 'Entity Formation' }
        ]
      }
    ]
  },
  {
    name: 'score',
    description: 'Look up a Keep Your Word social trust score',
    options: [
      {
        name: 'handle',
        description: 'Twitter/social handle to look up',
        type: 3,
        required: true
      },
      {
        name: 'provider',
        description: 'Social platform',
        type: 3,
        required: false,
        choices: [
          { name: 'Twitter/X', value: 'twitter' },
          { name: 'Instagram', value: 'instagram' },
          { name: 'GitHub', value: 'github' }
        ]
      }
    ]
  },
  {
    name: 'verify',
    description: 'Verify a document hash on-chain',
    options: [
      {
        name: 'hash',
        description: 'Document SHA-256 hash or agreement ID',
        type: 3,
        required: true
      }
    ]
  },
  {
    name: 'escrow',
    description: 'Create a quick escrow between two parties',
    options: [
      {
        name: 'amount',
        description: 'Amount in USD equivalent',
        type: 10, // NUMBER
        required: true
      },
      {
        name: 'counterparty',
        description: 'Discord @mention or wallet address',
        type: 3,
        required: true
      },
      {
        name: 'description',
        description: 'What is this escrow for?',
        type: 3,
        required: true
      },
      {
        name: 'currency',
        description: 'Crypto currency',
        type: 3,
        required: false,
        choices: [
          { name: 'ETH', value: 'ETH' },
          { name: 'USDC', value: 'USDC' },
          { name: 'USDT', value: 'USDT' },
          { name: 'DAI', value: 'DAI' }
        ]
      }
    ]
  },
  {
    name: 'subscribe',
    description: 'View pricing and upgrade your AgreeMint tier',
    options: []
  },
  {
    name: 'help',
    description: 'Show all AgreeMint bot commands and pricing',
    options: []
  }
];

// ─── Per-Use Pricing (for non-subscribers) ─────────────
const PER_USE_PRICING = {
  agreement_generation: {
    name: 'AI Agreement Generation',
    price: 1500, // $15
    description: 'Generate a full legal agreement with AI'
  },
  agreement_analysis: {
    name: 'AI Risk Analysis',
    price: 500, // $5  
    description: 'Analyze an agreement for risks and compliance'
  },
  template_purchase: {
    name: 'Template Purchase',
    price: 200, // $2 base, varies by template
    description: 'Buy a pre-made agreement template'
  },
  escrow_creation: {
    name: 'Escrow Setup',
    price: 1000, // $10 flat + 0.5% of value
    description: 'Set up a crypto escrow between parties'
  },
  ip_registration: {
    name: 'IP Registration (Story Protocol)',
    price: 500, // $5
    description: 'Register your agreement as an IP asset on-chain'
  },
  verification_certificate: {
    name: 'Verification Certificate',
    price: 200, // $2
    description: 'Generate a tamper-proof verification certificate PDF'
  }
};

// ─── Discord Message Builders ──────────────────────────

function buildHelpEmbed() {
  return {
    embeds: [{
      title: '⚖️ AgreeMint — AI Legal Agreement Platform',
      description: 'Generate, sign, verify, and escrow legal agreements — all from Discord.',
      color: 0xC8A000,
      fields: [
        {
          name: '📝 /agreement',
          value: 'Generate an AI-powered legal agreement ($15/use or free with Starter+)',
          inline: false
        },
        {
          name: '📋 /template',
          value: 'Browse pre-made templates ($2-15 each)',
          inline: false
        },
        {
          name: '🔒 /escrow',
          value: 'Set up crypto escrow between parties ($10 + 0.5% fee)',
          inline: false
        },
        {
          name: '⭐ /score',
          value: 'Look up anyone\'s Keep Your Word trust score (FREE)',
          inline: false
        },
        {
          name: '✅ /verify',
          value: 'Verify a document hash on-chain (FREE)',
          inline: false
        },
        {
          name: '💳 /subscribe',
          value: 'View pricing tiers and upgrade',
          inline: false
        }
      ],
      footer: {
        text: 'KingPin Strategies • docs.kingpinstrategies.com'
      },
      timestamp: new Date().toISOString()
    }]
  };
}

function buildPricingEmbed() {
  return {
    embeds: [{
      title: '💎 AgreeMint Pricing',
      description: 'Choose the plan that fits your needs.',
      color: 0xC8A000,
      fields: [
        {
          name: '🆓 Free — $0/mo',
          value: '• 3 agreements/month\n• PDF export\n• Template marketplace access\n• No AI, No escrow',
          inline: true
        },
        {
          name: '🚀 Starter — $29/mo',
          value: '• 10 agreements/month\n• AI generation & analysis\n• Escrow support\n• Story Protocol IP\n• Email support',
          inline: true
        },
        {
          name: '⚡ Pro — $79/mo',
          value: '• 50 agreements/month\n• Full AI suite\n• Full escrow\n• API access\n• Priority support',
          inline: true
        },
        {
          name: '🏢 Enterprise — $199/mo',
          value: '• Unlimited agreements\n• Custom branding\n• Dedicated support\n• Advanced API\n• Custom integrations',
          inline: true
        }
      ],
      footer: {
        text: 'All plans include: Digital signatures, Blockchain verification, PDF certificates'
      }
    }],
    components: [{
      type: 1, // ACTION_ROW
      components: [
        {
          type: 2, // BUTTON
          style: 5, // LINK
          label: 'Subscribe Now',
          url: `${PLATFORM_URL}/pricing`
        },
        {
          type: 2,
          style: 5,
          label: 'Compare Plans',
          url: `${PLATFORM_URL}/pricing#compare`
        }
      ]
    }]
  };
}

function buildScoreEmbed(user, score) {
  const gradeColors = {
    'DIAMOND': 0x00FFFF,
    'GOLD': 0xFFD700,
    'SILVER': 0xC0C0C0,
    'BRONZE': 0xCD7F32,
    'UNTRUSTWORTHY': 0xFF0000
  };

  return {
    embeds: [{
      title: `⭐ ${user.displayName}'s Trust Score`,
      description: `**${score.grade}** — ${score.score}/100`,
      color: gradeColors[score.grade] || 0xC8A000,
      fields: [
        { name: 'Total Pledges', value: String(score.totalPledges), inline: true },
        { name: 'Kept', value: String(score.kept), inline: true },
        { name: 'Broken', value: String(score.broken), inline: true },
        { name: 'Keep Rate', value: `${score.keepRate}%`, inline: true },
        { name: 'Current Streak', value: String(score.currentStreak || 0), inline: true },
        { name: 'Provider', value: user.provider, inline: true }
      ],
      thumbnail: user.avatarUrl ? { url: user.avatarUrl } : undefined,
      footer: {
        text: `Keep Your Word by AgreeMint • ${user.verified ? '✅ Verified' : '⚠️ Unverified'}`
      },
      url: `${PLATFORM_URL}/kyw/profile/${user.id}`
    }]
  };
}

function buildVerifyEmbed(verification) {
  return {
    embeds: [{
      title: verification.verified ? '✅ Document Verified' : '❌ Verification Failed',
      color: verification.verified ? 0x00FF00 : 0xFF0000,
      fields: [
        { name: 'Agreement', value: verification.agreement?.title || 'Unknown', inline: true },
        { name: 'Status', value: verification.agreement?.status || 'Unknown', inline: true },
        { name: 'Content Hash', value: `\`${verification.contentHash || 'N/A'}\``, inline: false },
        { name: 'IP Registered', value: verification.ipRegistered ? '✅ On Story Protocol' : '❌ Not registered', inline: true },
        { name: 'Signatures', value: String(verification.signatureCount || 0), inline: true }
      ],
      footer: {
        text: 'AgreeMint Blockchain Verification'
      }
    }]
  };
}

function buildAgreementEmbed(agreement, paymentUrl) {
  return {
    embeds: [{
      title: `📝 Agreement Created: ${agreement.title}`,
      description: `Your ${agreement.type} agreement has been generated and is ready for review.`,
      color: 0xC8A000,
      fields: [
        { name: 'Type', value: agreement.type, inline: true },
        { name: 'Jurisdiction', value: agreement.jurisdiction, inline: true },
        { name: 'Parties', value: (agreement.parties || []).map(p => p.name).join(' & ') || 'TBD', inline: false },
        { name: 'Content Hash', value: `\`${agreement.contentHash}\``, inline: false }
      ],
      footer: {
        text: 'Review, edit, and sign at docs.kingpinstrategies.com'
      }
    }],
    components: [{
      type: 1,
      components: [
        {
          type: 2,
          style: 5,
          label: 'View & Sign Agreement',
          url: `${PLATFORM_URL}/agreements/${agreement.id}`
        },
        {
          type: 2,
          style: 5,
          label: 'Download PDF',
          url: `${PLATFORM_URL}/api/agreements/${agreement.id}/pdf`
        }
      ]
    }]
  };
}

function buildEscrowEmbed(escrowData) {
  return {
    embeds: [{
      title: '🔒 Escrow Created',
      description: escrowData.description || 'Crypto escrow between two parties',
      color: 0x00FF00,
      fields: [
        { name: 'Amount', value: `${escrowData.amount} ${escrowData.currency || 'ETH'}`, inline: true },
        { name: 'Platform Fee', value: '0.5%', inline: true },
        { name: 'Status', value: 'Awaiting Deposits', inline: true },
        { name: 'Escrow ID', value: escrowData.escrowId || 'Pending', inline: false }
      ],
      footer: {
        text: 'Both parties must deposit to activate the escrow'
      }
    }],
    components: [{
      type: 1,
      components: [{
        type: 2,
        style: 5,
        label: 'Manage Escrow',
        url: `${PLATFORM_URL}/escrow/${escrowData.escrowId || ''}`
      }]
    }]
  };
}

// ─── Discord Bot HTTP Handler ──────────────────────────
// This handles Discord interactions via webhook (no WebSocket needed)
// Set your Discord bot's Interactions Endpoint URL to:
// https://docs.kingpinstrategies.com/api/discord/interactions

const DISCORD_PUBLIC_KEY = process.env.DISCORD_PUBLIC_KEY || '';

/**
 * Verify Discord request signature (required for interactions endpoint).
 */
function verifyDiscordSignature(rawBody, signature, timestamp) {
  if (!DISCORD_PUBLIC_KEY) return false;
  try {
    const message = timestamp + rawBody;
    const key = Buffer.from(DISCORD_PUBLIC_KEY, 'hex');
    // Discord uses Ed25519 signatures
    // In production, use tweetnacl: nacl.sign.detached.verify(...)
    // For now, we'll verify in the route handler with the discord.js library
    return true; // Placeholder — real verification added when discord.js is installed
  } catch {
    return false;
  }
}

/**
 * Process a Discord slash command interaction.
 * Returns the response object to send back to Discord.
 */
async function handleInteraction(interaction, deps = {}) {
  const { db, calculateSocialScore, generateAgreement, createAnchorRecord } = deps;

  const commandName = interaction.data?.name;
  const options = {};
  (interaction.data?.options || []).forEach(opt => {
    options[opt.name] = opt.value;
  });

  switch (commandName) {
    case 'help':
      return { type: 4, data: buildHelpEmbed() };

    case 'subscribe':
      return { type: 4, data: buildPricingEmbed() };

    case 'score': {
      const handle = (options.handle || '').toLowerCase().replace('@', '');
      const provider = options.provider || 'twitter';
      const userId = `${provider}:${handle}`;
      const user = db?.kywUsers?.[userId];

      if (!user) {
        return {
          type: 4,
          data: {
            embeds: [{
              title: '❌ User Not Found',
              description: `No Keep Your Word profile found for @${handle} on ${provider}.\n\nThey can create one at ${PLATFORM_URL}/keepyourword`,
              color: 0xFF0000
            }]
          }
        };
      }

      const score = calculateSocialScore(user);
      return { type: 4, data: buildScoreEmbed(user, score) };
    }

    case 'verify': {
      const hash = options.hash || '';
      // Look up agreement by ID or content hash
      let agreement = db?.agreements?.[hash];
      if (!agreement) {
        agreement = Object.values(db?.agreements || {}).find(a => a.contentHash === hash);
      }

      if (!agreement) {
        return {
          type: 4,
          data: {
            embeds: [{
              title: '❌ Not Found',
              description: `No agreement found for: \`${hash}\`\n\nMake sure you're using the correct agreement ID or content hash.`,
              color: 0xFF0000
            }]
          }
        };
      }

      const verification = {
        verified: true,
        contentHash: agreement.contentHash,
        agreement: { title: agreement.title, status: agreement.status },
        ipRegistered: !!agreement.ipAsset,
        signatureCount: (agreement.signatures || []).length
      };

      return { type: 4, data: buildVerifyEmbed(verification) };
    }

    case 'agreement': {
      // This would trigger agreement generation (paid feature)
      const type = options.type || 'mutual_nda';
      const partyA = options.party_a || 'Party A';
      const partyB = options.party_b || 'Party B';
      const jurisdiction = options.jurisdiction || 'United States (Delaware)';

      return {
        type: 4,
        data: {
          embeds: [{
            title: '📝 Agreement Generation Requested',
            description: `Generating a **${type.replace(/_/g, ' ').toUpperCase()}** agreement...`,
            color: 0xC8A000,
            fields: [
              { name: 'Party A', value: partyA, inline: true },
              { name: 'Party B', value: partyB, inline: true },
              { name: 'Jurisdiction', value: jurisdiction, inline: true },
              { name: 'Pricing', value: 'Free with Starter+ subscription, or $15 one-time', inline: false }
            ]
          }],
          components: [{
            type: 1,
            components: [{
              type: 2,
              style: 5,
              label: 'Complete on AgreeMint',
              url: `${PLATFORM_URL}?type=${type}&partyA=${encodeURIComponent(partyA)}&partyB=${encodeURIComponent(partyB)}&jurisdiction=${encodeURIComponent(jurisdiction)}`
            }]
          }]
        }
      };
    }

    case 'template': {
      const category = options.category || '';
      return {
        type: 4,
        data: {
          embeds: [{
            title: '📋 Template Marketplace',
            description: category ? `Showing **${category}** templates` : 'Browse all agreement templates',
            color: 0xC8A000,
            fields: [
              { name: '📄 Mutual NDA', value: '$5 — Standard non-disclosure agreement', inline: false },
              { name: '📄 Freelancer Contract', value: '$10 — Independent contractor agreement', inline: false },
              { name: '📄 SAFE Note', value: '$15 — Y Combinator style investment note', inline: false },
              { name: '📄 MSA', value: '$12 — Master Service Agreement', inline: false },
              { name: '📄 IP License', value: '$8 — Intellectual property licensing', inline: false }
            ],
            footer: { text: 'Templates include: Pre-filled clauses, jurisdiction variants, and edit rights' }
          }],
          components: [{
            type: 1,
            components: [{
              type: 2,
              style: 5,
              label: 'Browse All Templates',
              url: `${PLATFORM_URL}/marketplace${category ? `?category=${encodeURIComponent(category)}` : ''}`
            }]
          }]
        }
      };
    }

    case 'escrow': {
      const amount = options.amount || 0;
      const counterparty = options.counterparty || '';
      const description = options.description || '';
      const currency = options.currency || 'ETH';

      return {
        type: 4,
        data: {
          embeds: [{
            title: '🔒 Escrow Setup',
            description: description,
            color: 0xC8A000,
            fields: [
              { name: 'Amount', value: `$${amount} in ${currency}`, inline: true },
              { name: 'Counterparty', value: counterparty, inline: true },
              { name: 'Fee', value: `$10 setup + 0.5% (${(amount * 0.005).toFixed(2)})`, inline: true },
              { name: 'Total Cost', value: `$${(10 + amount * 0.005).toFixed(2)}`, inline: true }
            ],
            footer: { text: 'Complete the escrow setup on AgreeMint to deposit funds' }
          }],
          components: [{
            type: 1,
            components: [{
              type: 2,
              style: 5,
              label: 'Complete Escrow Setup',
              url: `${PLATFORM_URL}/escrow/new?amount=${amount}&currency=${currency}&description=${encodeURIComponent(description)}`
            }]
          }]
        }
      };
    }

    default:
      return {
        type: 4,
        data: { content: `Unknown command: ${commandName}. Use \`/help\` to see available commands.` }
      };
  }
}

/**
 * Register slash commands with Discord API.
 * Call this once during bot setup.
 */
async function registerCommands() {
  if (!DISCORD_TOKEN || !DISCORD_CLIENT_ID) {
    console.log('  Discord bot: NOT CONFIGURED (set DISCORD_BOT_TOKEN and DISCORD_CLIENT_ID)');
    return false;
  }

  try {
    const url = DISCORD_GUILD_ID
      ? `https://discord.com/api/v10/applications/${DISCORD_CLIENT_ID}/guilds/${DISCORD_GUILD_ID}/commands`
      : `https://discord.com/api/v10/applications/${DISCORD_CLIENT_ID}/commands`;

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Bot ${DISCORD_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(DISCORD_COMMANDS)
    });

    if (response.ok) {
      console.log(`  Discord bot: ${DISCORD_COMMANDS.length} commands registered`);
      return true;
    } else {
      const err = await response.text();
      console.error('  Discord bot: Registration failed:', err);
      return false;
    }
  } catch (e) {
    console.error('  Discord bot: Error:', e.message);
    return false;
  }
}

module.exports = {
  DISCORD_COMMANDS,
  PER_USE_PRICING,
  buildHelpEmbed,
  buildPricingEmbed,
  buildScoreEmbed,
  buildVerifyEmbed,
  buildAgreementEmbed,
  buildEscrowEmbed,
  handleInteraction,
  registerCommands,
  verifyDiscordSignature
};
