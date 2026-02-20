/**
 * AgreeMint — Blockchain Verification Engine
 *
 * Handles:
 * 1. Document hash anchoring to Story Protocol (IP blockchain)
 * 2. On-chain agreement registration as IP Assets
 * 3. Escrow state tracking (reads from smart contract)
 * 4. Verification certificate generation with on-chain proof
 *
 * Story Protocol: https://docs.story.foundation
 * Uses Story's IP Asset Registry to register agreements as IP,
 * giving each document a verifiable on-chain identity.
 */

const crypto = require('crypto');
const { ESCROW_CURRENCIES, ESCROW_RULE_PRESETS } = require('./kyw-engine');

// ─── Story Protocol Config ─────────────────────────────
const STORY_RPC = process.env.STORY_RPC_URL || 'https://odyssey.storyrpc.io';
const STORY_API = process.env.STORY_API_URL || 'https://api.story.foundation/api/v1';
const STORY_CHAIN_ID = process.env.STORY_CHAIN_ID || '1516';  // Story Odyssey testnet

// Story Protocol contract addresses (Odyssey testnet)
const STORY_CONTRACTS = {
  ipAssetRegistry: '0x1a9d0d28a0422F26D31Be72Edc6f13ea4371E11B',
  registrationModule: '0xf49da534215DA7b48E57A41d3200C82Cef584715',
  licensingModule: '0xd81fd78f557b457b4350cB95D20b547bFEb4C99d'
};

// ─── EVM Config (for Escrow Contract) ──────────────────
const ESCROW_RPC = process.env.ESCROW_RPC_URL || process.env.BASE_RPC_URL || 'https://mainnet.base.org';
const ESCROW_CONTRACT = process.env.ESCROW_CONTRACT_ADDRESS || '';

// ─── Document Hash Anchoring ───────────────────────────

/**
 * Create a hash anchor record for on-chain registration.
 * This creates the metadata that will be stored on Story Protocol.
 */
function createAnchorRecord(agreement) {
  const contentHash = crypto.createHash('sha256').update(agreement.content).digest('hex');
  const metadataHash = crypto.createHash('sha256').update(JSON.stringify({
    id: agreement.id,
    type: agreement.type,
    title: agreement.title,
    jurisdiction: agreement.jurisdiction,
    parties: agreement.parties.map(p => p.name),
    version: agreement.version,
    createdAt: agreement.createdAt
  })).digest('hex');

  return {
    agreementId: agreement.id,
    contentHash: `0x${contentHash}`,
    metadataHash: `0x${metadataHash}`,
    combinedHash: `0x${crypto.createHash('sha256').update(contentHash + metadataHash).digest('hex')}`,
    timestamp: new Date().toISOString(),
    chainId: STORY_CHAIN_ID,
    type: agreement.type,
    title: agreement.title,
    jurisdiction: agreement.jurisdiction,
    parties: agreement.parties.map(p => ({ name: p.name, role: p.role })),
    version: agreement.version
  };
}

/**
 * Register an agreement as an IP Asset on Story Protocol.
 * Returns the registration data (tx would be submitted by frontend wallet).
 */
function prepareStoryRegistration(agreement) {
  const anchor = createAnchorRecord(agreement);

  // Story Protocol IP metadata standard
  const ipMetadata = {
    name: `AgreeMint: ${agreement.title}`,
    description: `Legal agreement registered on Story Protocol. Type: ${agreement.type}. Jurisdiction: ${agreement.jurisdiction}.`,
    image: '', // Could generate an agreement preview image
    attributes: [
      { trait_type: 'Agreement Type', value: agreement.type },
      { trait_type: 'Jurisdiction', value: agreement.jurisdiction },
      { trait_type: 'Version', value: String(agreement.version) },
      { trait_type: 'Parties', value: String(agreement.parties.length) },
      { trait_type: 'Status', value: agreement.status },
      { trait_type: 'Content Hash', value: anchor.contentHash },
      { trait_type: 'Platform', value: 'AgreeMint' },
      { trait_type: 'Created', value: agreement.createdAt }
    ],
    external_url: `https://docs.kingpinstrategies.com/verify/${agreement.id}`
  };

  // The transaction data for registering on Story
  return {
    anchor,
    ipMetadata,
    registrationData: {
      to: STORY_CONTRACTS.ipAssetRegistry,
      chainId: STORY_CHAIN_ID,
      rpcUrl: STORY_RPC,
      // ABI-encoded call to register(address,uint256,bytes32,bytes)
      method: 'register',
      params: {
        nftContract: '0x0000000000000000000000000000000000000000', // Will be set by NFT mint
        tokenId: 0,   // Will be set after NFT mint
        metadataHash: anchor.combinedHash,
        metadata: JSON.stringify(ipMetadata)
      }
    },
    verificationUrl: `https://explorer.story.foundation/ipa/${anchor.combinedHash}`
  };
}

/**
 * Prepare escrow creation transaction data.
 * This returns the data needed for the frontend wallet to submit.
 */
function prepareEscrowTransaction(escrowData) {
  const {
    type = 'Sale',     // Sale, Bet, Service, Custom
    partyB,
    arbiter,
    currency = 'ETH',
    token,
    amount,
    agreementHash,
    agreementId,
    rules = {},
    metadata = {}
  } = escrowData;

  const escrowTypes = { Sale: 0, Bet: 1, Service: 2, Custom: 3 };

  // Resolve token address from currency
  const currencyInfo = ESCROW_CURRENCIES[currency] || ESCROW_CURRENCIES.ETH;
  const tokenAddress = token || currencyInfo.address || '0x0000000000000000000000000000000000000000';

  // Merge rules with preset if applicable
  const rulePreset = ESCROW_RULE_PRESETS[type.toLowerCase()] || ESCROW_RULE_PRESETS.standard;
  const finalRules = { ...rulePreset, ...rules };

  return {
    contract: ESCROW_CONTRACT,
    chainId: process.env.ESCROW_CHAIN_ID || '8453',  // Base mainnet
    rpcUrl: ESCROW_RPC,
    method: 'createEscrow',
    currency: currencyInfo,
    rules: finalRules,
    params: {
      _type: escrowTypes[type] || 3,
      _partyB: partyB,
      _arbiter: arbiter,
      _token: tokenAddress,
      _amount: amount,
      _agreementHash: agreementHash,
      _agreementId: agreementId,
      _metadata: JSON.stringify({ ...metadata, currency: currency, rules: finalRules })
    },
    value: (currencyInfo.type === 'native' || tokenAddress === '0x0000000000000000000000000000000000000000') ? amount : '0',
    abi: ESCROW_ABI
  };
}

/**
 * Generate on-chain verification data for an agreement.
 * This can be verified by anyone with the document.
 */
function generateOnChainProof(agreement, chainRecord) {
  const contentHash = crypto.createHash('sha256').update(agreement.content).digest('hex');

  return {
    verified: true,
    platform: 'AgreeMint',
    agreement: {
      id: agreement.id,
      title: agreement.title,
      type: agreement.type,
      contentHash: `0x${contentHash}`,
      version: agreement.version
    },
    chain: {
      network: 'Story Protocol (Odyssey)',
      chainId: STORY_CHAIN_ID,
      txHash: chainRecord?.txHash || null,
      blockNumber: chainRecord?.blockNumber || null,
      ipAssetId: chainRecord?.ipAssetId || null,
      registeredAt: chainRecord?.registeredAt || null
    },
    escrow: chainRecord?.escrowId ? {
      escrowId: chainRecord.escrowId,
      state: chainRecord.escrowState,
      amount: chainRecord.escrowAmount,
      network: 'Base',
      contract: ESCROW_CONTRACT
    } : null,
    verification: {
      verifyUrl: `https://docs.kingpinstrategies.com/verify/${agreement.id}`,
      explorerUrl: chainRecord?.txHash ? `https://explorer.story.foundation/tx/${chainRecord.txHash}` : null,
      timestamp: new Date().toISOString()
    }
  };
}

// ─── Escrow ABI (for frontend) ─────────────────────────
const ESCROW_ABI = [
  {
    name: 'createEscrow',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { name: '_type', type: 'uint8' },
      { name: '_partyB', type: 'address' },
      { name: '_arbiter', type: 'address' },
      { name: '_token', type: 'address' },
      { name: '_amount', type: 'uint256' },
      { name: '_agreementHash', type: 'bytes32' },
      { name: '_agreementId', type: 'string' },
      { name: '_metadata', type: 'string' }
    ],
    outputs: [{ name: '', type: 'uint256' }]
  },
  {
    name: 'deposit',
    type: 'function',
    stateMutability: 'payable',
    inputs: [{ name: '_id', type: 'uint256' }],
    outputs: []
  },
  {
    name: 'depositToken',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: '_id', type: 'uint256' },
      { name: '_amount', type: 'uint256' }
    ],
    outputs: []
  },
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: '_id', type: 'uint256' },
      { name: '_releaseTo', type: 'address' }
    ],
    outputs: []
  },
  {
    name: 'raiseDispute',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: '_id', type: 'uint256' }],
    outputs: []
  },
  {
    name: 'cancel',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: '_id', type: 'uint256' }],
    outputs: []
  },
  {
    name: 'getEscrow',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '_id', type: 'uint256' }],
    outputs: [{
      name: '',
      type: 'tuple',
      components: [
        { name: 'id', type: 'uint256' },
        { name: 'escrowType', type: 'uint8' },
        { name: 'state', type: 'uint8' },
        { name: 'partyA', type: 'address' },
        { name: 'partyB', type: 'address' },
        { name: 'arbiter', type: 'address' },
        { name: 'token', type: 'address' },
        { name: 'amount', type: 'uint256' },
        { name: 'partyADeposit', type: 'uint256' },
        { name: 'partyBDeposit', type: 'uint256' },
        { name: 'agreementHash', type: 'bytes32' },
        { name: 'agreementId', type: 'string' },
        { name: 'partyAApproved', type: 'bool' },
        { name: 'partyBApproved', type: 'bool' },
        { name: 'releaseTo', type: 'address' },
        { name: 'createdAt', type: 'uint256' },
        { name: 'resolvedAt', type: 'uint256' },
        { name: 'metadata', type: 'string' }
      ]
    }]
  },
  {
    name: 'getUserEscrows',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '_user', type: 'address' }],
    outputs: [{ name: '', type: 'uint256[]' }]
  },
  {
    name: 'getEscrowByAgreement',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '_hash', type: 'bytes32' }],
    outputs: [{
      name: '',
      type: 'tuple',
      components: [
        { name: 'id', type: 'uint256' },
        { name: 'escrowType', type: 'uint8' },
        { name: 'state', type: 'uint8' },
        { name: 'partyA', type: 'address' },
        { name: 'partyB', type: 'address' },
        { name: 'amount', type: 'uint256' }
      ]
    }]
  },
  {
    name: 'EscrowCreated',
    type: 'event',
    inputs: [
      { name: 'id', type: 'uint256', indexed: true },
      { name: 'partyA', type: 'address', indexed: true },
      { name: 'partyB', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
      { name: 'agreementHash', type: 'bytes32', indexed: false }
    ]
  }
];

module.exports = {
  createAnchorRecord,
  prepareStoryRegistration,
  prepareEscrowTransaction,
  generateOnChainProof,
  ESCROW_ABI,
  STORY_CONTRACTS,
  STORY_RPC,
  ESCROW_RPC,
  ESCROW_CURRENCIES,
  ESCROW_RULE_PRESETS
};
