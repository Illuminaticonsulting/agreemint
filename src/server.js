/**
 * AgreeMint -- AI-Powered Agreement Platform
 *
 * Institutional-grade server for generating, managing, signing,
 * and verifying legal agreements with AI intelligence,
 * cryptographic verification, and compliance automation.
 */

require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const helmet = require('helmet');

const { generateAgreement, analyzeAgreement, negotiateAgreement, extractKeyTerms, compareVersions, legalChat } = require('./ai-engine');
const { hashDocument, createAuditEntry, signAgreement, generateCertificate, verifyDocumentIntegrity, generateVerificationToken } = require('./crypto-engine');
const { generatePDF, generateCertificatePDF, formatType } = require('./pdf-engine');
const { AGREEMENT_TYPES, JURISDICTIONS, CATEGORIES } = require('./templates');
const { createAnchorRecord, prepareStoryRegistration, prepareEscrowTransaction, generateOnChainProof, ESCROW_ABI, STORY_CONTRACTS: BC_STORY_CONTRACTS, ESCROW_CURRENCIES, ESCROW_RULE_PRESETS, createEscrowOnChain, getEscrowOnChain, getEscrowsByUser, getEscrowByAgreementHash, getContractStatus } = require('./blockchain-engine');
const { calculateSocialScore, calculateDatingScore, createPledge, resolvePledge, processCheckin, hashPledge, PLEDGE_CATEGORIES, VERIFICATION_TYPES, SELF_PLEDGE_TEMPLATES, DATE_PLEDGE_TEMPLATES } = require('./kyw-engine');
const { initTransport, notifyAgreementSent, notifyPartySigned, notifyDisputeRaised, notifyDisputeResolved, notifyEscrowEvent } = require('./notification-engine');

// ── New Engines ──
const { TIERS, createUser, verifyPassword, generateVerificationEmail, checkUsageLimit, incrementUsage, validateApiKey } = require('./auth-engine');
const { registerAgreementAsIP, verifyIPRegistration, generateLicenseTerms, generateIPMetadata } = require('./story-engine');
const { initStripe, createSubscriptionCheckout, createOneTimeCheckout, createTemplateCheckout, createPortalSession, processWebhookEvent, getRevenueBreakdown, STRIPE_PRODUCTS } = require('./stripe-engine');
const { PLATFORM_TEMPLATES, createTemplate, fillTemplate, addReview, recordPurchase, searchTemplates } = require('./marketplace-engine');
const { handleInteraction, registerCommands, PER_USE_PRICING, verifyDiscordSignature } = require('./discord-bot');

const app = express();
const PORT = process.env.PORT || 3500;
const PLATFORM = process.env.PLATFORM_NAME || 'AgreeMint';

// ---- Data Directory ----
const DATA_DIR = path.join(__dirname, '..', 'data');
const AGREEMENTS_DIR = path.join(DATA_DIR, 'agreements');
const PDFS_DIR = path.join(DATA_DIR, 'pdfs');
const AUDIT_DIR = path.join(DATA_DIR, 'audit');
const SESSIONS_DIR = path.join(DATA_DIR, 'sessions');

[DATA_DIR, AGREEMENTS_DIR, PDFS_DIR, AUDIT_DIR, SESSIONS_DIR].forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

// ---- Middleware ----
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: '5mb' }));
app.use(express.static(path.join(__dirname, '..', 'public')));

// ---- Data Store ----
const DB_FILE = path.join(DATA_DIR, 'db.json');
let db = { agreements: {}, sessions: {}, users: {}, audit: [], pledges: {}, kywUsers: {}, disputes: {}, registeredUsers: {}, templates: {}, purchases: [], apiKeys: {} };

function loadDB() {
  try {
    if (fs.existsSync(DB_FILE)) {
      db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
      // Ensure all expected collections exist (migration safety)
      if (!db.agreements) db.agreements = {};
      if (!db.sessions) db.sessions = {};
      if (!db.users) db.users = {};
      if (!db.audit) db.audit = [];
      if (!db.pledges) db.pledges = {};
      if (!db.kywUsers) db.kywUsers = {};
      if (!db.disputes) db.disputes = {};
      if (!db.registeredUsers) db.registeredUsers = {};
      if (!db.templates) db.templates = {};
      if (!db.purchases) db.purchases = [];
      if (!db.apiKeys) db.apiKeys = {};
    }
  } catch (e) {
    console.error('DB load error:', e.message);
  }
}

// Seed platform templates
function seedTemplates() {
  PLATFORM_TEMPLATES.forEach(t => {
    if (!db.templates[t.id]) db.templates[t.id] = t;
  });
}

function saveDB() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
  } catch (e) {
    console.error('DB save error:', e.message);
  }
}

loadDB();
seedTemplates();
saveDB();

// ---- Auth Middleware ----
// Legacy admin users (tez/kingpin) still work for backward compat
const USERS = {
  tez: { name: 'Tez', role: 'admin' },
  kingpin: { name: 'Kingpin', role: 'admin' }
};
let authTokens = {};

function requireAuth(req, res, next) {
  const token = req.headers['x-auth-token'] || req.query.token;
  
  // Check API key auth
  const apiKey = req.headers['x-api-key'];
  if (apiKey) {
    const keyRecord = db.apiKeys[apiKey];
    if (keyRecord && keyRecord.active) {
      const user = db.registeredUsers[keyRecord.userId];
      if (user) {
        req.user = { email: user.email, name: user.name, role: user.role, tier: user.tier, userId: user.id, viaApiKey: true };
        return next();
      }
    }
    return res.status(401).json({ error: 'Invalid API key' });
  }

  if (!token || !authTokens[token]) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  req.user = authTokens[token];
  next();
}

// Tier-gate middleware
function requireTier(minTier) {
  const tierOrder = ['free', 'starter', 'pro', 'enterprise', 'admin'];
  return (req, res, next) => {
    const userTier = req.user?.tier || (req.user?.role === 'admin' ? 'admin' : 'free');
    if (tierOrder.indexOf(userTier) >= tierOrder.indexOf(minTier)) return next();
    res.status(403).json({ error: `Requires ${minTier} tier or above. Current: ${userTier}`, upgrade: '/api/pricing' });
  };
}

// ============================================================
//   AUTH ENDPOINTS
// ============================================================

// ---- Register new account ----
app.post('/api/auth/register', async (req, res) => {
  const { email, password, name, company } = req.body;
  try {
    // Check if email already exists
    const existing = Object.values(db.registeredUsers).find(u => u.email === (email || '').toLowerCase().trim());
    if (existing) return res.status(400).json({ error: 'Email already registered' });

    const user = await createUser({ email, password, name, company });
    db.registeredUsers[user.id] = user;

    // Create API key mapping
    db.apiKeys[user.apiKey] = { userId: user.id, active: false, createdAt: user.createdAt };

    const token = uuidv4();
    authTokens[token] = { email: user.email, name: user.name, role: user.role, tier: user.tier, userId: user.id };

    // Send verification email
    const verifyEmail = generateVerificationEmail(user);
    const { sendEmail } = require('./notification-engine');
    sendEmail(user.email, verifyEmail.subject, verifyEmail.html, verifyEmail.text).catch(() => {});

    saveDB();
    res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name, tier: user.tier, verified: user.verified },
      verificationCode: user.verificationCode, // included so user can verify even without email
      apiKey: user.apiKey
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ---- Verify email ----
app.post('/api/auth/verify-email', (req, res) => {
  const { email, code } = req.body;
  const user = Object.values(db.registeredUsers).find(u => u.email === (email || '').toLowerCase().trim());
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (user.verified) return res.json({ ok: true, alreadyVerified: true });

  if (user.verificationCode !== (code || '').toUpperCase()) {
    return res.status(400).json({ error: 'Invalid verification code' });
  }

  if (new Date(user.verificationExpires) < new Date()) {
    return res.status(400).json({ error: 'Verification code expired' });
  }

  user.verified = true;
  user.verifiedAt = new Date().toISOString();
  saveDB();
  res.json({ ok: true, verified: true });
});

// ---- Login (supports both legacy password and email/password) ----
app.post('/api/auth/login', async (req, res) => {
  const { password, email } = req.body;

  // New-style login: email + password
  if (email) {
    const user = Object.values(db.registeredUsers).find(u => u.email === email.toLowerCase().trim());
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    user.lastLoginAt = new Date().toISOString();
    const token = uuidv4();
    authTokens[token] = { email: user.email, name: user.name, role: user.role, tier: user.tier, userId: user.id };
    saveDB();
    return res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role, tier: user.tier, verified: user.verified, apiKey: user.apiKey }
    });
  }

  // Legacy login: password only (tez/kingpin)
  const pwd = (password || '').toLowerCase().trim();
  const user = USERS[pwd];
  if (user) {
    const token = uuidv4();
    authTokens[token] = { email: pwd, name: user.name, role: user.role, tier: 'enterprise', loginAt: new Date().toISOString() };
    return res.json({ token, user: { email: pwd, name: user.name, role: user.role, tier: 'enterprise' } });
  }
  res.status(401).json({ error: 'Wrong credentials' });
});

app.get('/api/auth/verify', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

app.post('/api/auth/logout', requireAuth, (req, res) => {
  const token = req.headers['x-auth-token'];
  delete authTokens[token];
  res.json({ ok: true });
});

// ============================================================
//   TEMPLATE & CONFIG ENDPOINTS
// ============================================================

app.get('/api/templates', (req, res) => {
  res.json({ types: AGREEMENT_TYPES, categories: CATEGORIES, jurisdictions: JURISDICTIONS });
});

// ============================================================
//   AGREEMENT ENDPOINTS
// ============================================================

// ---- Create / Generate Agreement ----
app.post('/api/agreements', requireAuth, async (req, res) => {
  const { type, title, details, content: manualContent, parties, jurisdiction, favorParty, complexity, additionalClauses } = req.body;

  if (!type || (!details && !manualContent)) {
    return res.status(400).json({ error: 'Type and either details or content are required' });
  }

  const id = uuidv4();

  try {
    // Use provided content or generate via AI
    const content = manualContent || await generateAgreement(type, details, {
      jurisdiction: jurisdiction || 'United States (Delaware)',
      favorParty: favorParty || 'balanced',
      complexity: complexity || 'institutional',
      additionalClauses
    });

    const agreement = {
      id,
      type,
      title: title || `${(AGREEMENT_TYPES[type] || {}).name || type} Agreement`,
      content,
      contentHash: hashDocument(content),
      details,
      parties: parties || [],
      jurisdiction: jurisdiction || 'United States (Delaware)',
      favorParty: favorParty || 'balanced',
      status: 'draft',
      version: 1,
      versions: [{
        version: 1,
        content,
        contentHash: hashDocument(content),
        createdAt: new Date().toISOString(),
        createdBy: req.user.email
      }],
      signatures: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: req.user.email,
      verificationToken: generateVerificationToken(id)
    };

    db.agreements[id] = agreement;

    // Audit
    db.audit.push(createAuditEntry(id, 'CREATED', req.user.email, { type, jurisdiction }));

    saveDB();
    res.json(agreement);
  } catch (err) {
    console.error('Generate error:', err.message);
    res.status(500).json({ error: 'AI generation error: ' + err.message });
  }
});

// ---- List Agreements ----
app.get('/api/agreements', requireAuth, (req, res) => {
  const { status, type, search } = req.query;
  let list = Object.values(db.agreements)
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

  if (status) list = list.filter(a => a.status === status);
  if (type) list = list.filter(a => a.type === type);
  if (search) {
    const s = search.toLowerCase();
    list = list.filter(a => a.title.toLowerCase().includes(s) || a.details.toLowerCase().includes(s));
  }

  // Return summary (not full content)
  const summaries = list.map(a => ({
    id: a.id,
    type: a.type,
    title: a.title,
    status: a.status,
    jurisdiction: a.jurisdiction,
    parties: a.parties,
    version: a.version,
    signatureCount: a.signatures.length,
    partyCount: a.parties.length,
    createdAt: a.createdAt,
    updatedAt: a.updatedAt
  }));

  res.json(summaries);
});

// ---- Get Agreement ----
app.get('/api/agreements/:id', requireAuth, (req, res) => {
  const agreement = db.agreements[req.params.id];
  if (!agreement) return res.status(404).json({ error: 'Agreement not found' });
  res.json(agreement);
});

// ---- Update Agreement Content ----
app.put('/api/agreements/:id', requireAuth, (req, res) => {
  const agreement = db.agreements[req.params.id];
  if (!agreement) return res.status(404).json({ error: 'Agreement not found' });
  if (agreement.status === 'signed') return res.status(400).json({ error: 'Cannot edit a signed agreement' });

  const { content, title, parties } = req.body;

  if (content) {
    agreement.version++;
    agreement.content = content;
    agreement.contentHash = hashDocument(content);
    agreement.versions.push({
      version: agreement.version,
      content,
      contentHash: hashDocument(content),
      createdAt: new Date().toISOString(),
      createdBy: req.user.email
    });
  }

  if (title) agreement.title = title;
  if (parties) agreement.parties = parties;
  agreement.updatedAt = new Date().toISOString();

  db.audit.push(createAuditEntry(agreement.id, 'UPDATED', req.user.email, { version: agreement.version }));
  saveDB();
  res.json(agreement);
});

// ---- Delete Agreement ----
app.delete('/api/agreements/:id', requireAuth, (req, res) => {
  if (!db.agreements[req.params.id]) return res.status(404).json({ error: 'Agreement not found' });
  const title = db.agreements[req.params.id].title;
  delete db.agreements[req.params.id];
  db.audit.push(createAuditEntry(req.params.id, 'DELETED', req.user.email, { title }));
  saveDB();
  res.json({ ok: true });
});

// ---- Send for Signature ----
app.post('/api/agreements/:id/send', requireAuth, async (req, res) => {
  const agreement = db.agreements[req.params.id];
  if (!agreement) return res.status(404).json({ error: 'Agreement not found' });

  agreement.status = 'pending';
  agreement.updatedAt = new Date().toISOString();
  db.audit.push(createAuditEntry(agreement.id, 'SENT_FOR_SIGNATURE', req.user.email));
  saveDB();

  // Send email notifications to all parties
  const signUrl = `/sign/${agreement.id}?token=${agreement.verificationToken}`;
  const emailResults = await notifyAgreementSent(agreement);

  res.json({ ok: true, status: 'pending', signUrl, notifications: emailResults });
});

// ---- Sign Agreement ----
app.post('/api/agreements/:id/sign', (req, res) => {
  const agreement = db.agreements[req.params.id];
  if (!agreement) return res.status(404).json({ error: 'Agreement not found' });

  const { name, email, token } = req.body;
  if (!name || !email) return res.status(400).json({ error: 'Name and email required' });

  // Verify token
  if (token !== agreement.verificationToken) {
    const authToken = req.headers['x-auth-token'];
    if (!authToken || !authTokens[authToken]) {
      return res.status(403).json({ error: 'Invalid signing token' });
    }
  }

  // Check if already signed by this email
  if (agreement.signatures.find(s => s.signerEmail === email || s.email === email)) {
    return res.status(400).json({ error: 'Already signed by this party' });
  }

  const ip = req.ip || req.connection.remoteAddress;
  const signature = signAgreement(agreement, { name, email, ip });
  agreement.signatures.push(signature);

  // Check if all parties have signed
  const allSigned = agreement.parties.length > 0 &&
    agreement.parties.every(p => agreement.signatures.some(s => (s.signerEmail || s.email) === p.email));

  if (allSigned) {
    agreement.status = 'signed';

    // ── Auto-register as IP Asset on Story Protocol ──
    registerAgreementAsIP(agreement).then(result => {
      if (result.success) {
        agreement.ipAsset = result.ipAsset;
        agreement.ipAsset.autoRegistered = true;
        db.audit.push(createAuditEntry(agreement.id, 'IP_REGISTERED', 'system', {
          chain: result.ipAsset.chain,
          contentHash: result.ipAsset.contentHash,
          simulated: result.simulated
        }));
        saveDB();
        console.log(`[story] IP registered for agreement ${agreement.id}: ${result.ipAsset.contentHash}`);
      }
    }).catch(e => console.error('[story] Auto-register error:', e.message));
  }

  agreement.updatedAt = new Date().toISOString();
  db.audit.push(createAuditEntry(agreement.id, 'SIGNED', email, { ip }));
  saveDB();

  // Notify other parties about the signature
  notifyPartySigned(agreement, name, email).catch(e => console.error('Notify error:', e));

  res.json({ ok: true, signature, allSigned, status: agreement.status });
});

// ============================================================
//   AI ANALYSIS ENDPOINTS
// ============================================================

// ---- Analyze / Risk Score ----
app.post('/api/agreements/:id/analyze', requireAuth, async (req, res) => {
  const agreement = db.agreements[req.params.id];
  if (!agreement) return res.status(404).json({ error: 'Agreement not found' });

  try {
    const analysis = await analyzeAgreement(agreement.content, req.body.partyRole || 'neutral');
    db.audit.push(createAuditEntry(agreement.id, 'ANALYZED', req.user.email));
    saveDB();
    res.json({ analysis });
  } catch (err) {
    res.status(500).json({ error: 'Analysis error: ' + err.message });
  }
});

// ---- Negotiate ----
app.post('/api/agreements/:id/negotiate', requireAuth, async (req, res) => {
  const agreement = db.agreements[req.params.id];
  if (!agreement) return res.status(404).json({ error: 'Agreement not found' });

  const { goals, partyRole } = req.body;
  if (!goals) return res.status(400).json({ error: 'Negotiation goals required' });

  try {
    const result = await negotiateAgreement(agreement.content, goals, partyRole || 'our side');
    db.audit.push(createAuditEntry(agreement.id, 'NEGOTIATION_ANALYSIS', req.user.email));
    saveDB();
    res.json({ result });
  } catch (err) {
    res.status(500).json({ error: 'Negotiation error: ' + err.message });
  }
});

// ---- Extract Key Terms ----
app.post('/api/agreements/:id/extract', requireAuth, async (req, res) => {
  const agreement = db.agreements[req.params.id];
  if (!agreement) return res.status(404).json({ error: 'Agreement not found' });

  try {
    const terms = await extractKeyTerms(agreement.content);
    db.audit.push(createAuditEntry(agreement.id, 'TERMS_EXTRACTED', req.user.email));
    saveDB();
    res.json({ terms });
  } catch (err) {
    res.status(500).json({ error: 'Extraction error: ' + err.message });
  }
});

// ---- Compare Versions ----
app.post('/api/agreements/:id/compare', requireAuth, async (req, res) => {
  const agreement = db.agreements[req.params.id];
  if (!agreement) return res.status(404).json({ error: 'Agreement not found' });

  const { version1, version2 } = req.body;
  const v1 = agreement.versions.find(v => v.version === version1);
  const v2 = agreement.versions.find(v => v.version === version2);
  if (!v1 || !v2) return res.status(400).json({ error: 'Version not found' });

  try {
    const result = await compareVersions(v1.content, v2.content);
    res.json({ result });
  } catch (err) {
    res.status(500).json({ error: 'Compare error: ' + err.message });
  }
});

// ---- Analyze uploaded/pasted agreement ----
app.post('/api/analyze', requireAuth, async (req, res) => {
  const { content, partyRole } = req.body;
  if (!content) return res.status(400).json({ error: 'Agreement content required' });

  try {
    const analysis = await analyzeAgreement(content, partyRole || 'neutral');
    res.json({ analysis });
  } catch (err) {
    res.status(500).json({ error: 'Analysis error: ' + err.message });
  }
});

// ============================================================
//   PDF & VERIFICATION ENDPOINTS
// ============================================================

// ---- Download PDF ----
app.get('/api/agreements/:id/pdf', requireAuth, async (req, res) => {
  const agreement = db.agreements[req.params.id];
  if (!agreement) return res.status(404).json({ error: 'Agreement not found' });

  try {
    const pdfPath = path.join(PDFS_DIR, `${agreement.id}.pdf`);
    await generatePDF(agreement, pdfPath);
    db.audit.push(createAuditEntry(agreement.id, 'PDF_GENERATED', req.user.email));
    saveDB();
    res.download(pdfPath, `${agreement.title.replace(/[^a-zA-Z0-9 ]/g, '')}.pdf`);
  } catch (err) {
    console.error('PDF error:', err);
    res.status(500).json({ error: 'PDF generation error: ' + err.message });
  }
});

// ---- Verification Certificate ----
app.get('/api/agreements/:id/certificate', requireAuth, async (req, res) => {
  const agreement = db.agreements[req.params.id];
  if (!agreement) return res.status(404).json({ error: 'Agreement not found' });

  const cert = generateCertificate(agreement);
  const certPath = path.join(PDFS_DIR, `cert-${agreement.id}.pdf`);

  try {
    await generateCertificatePDF(cert, certPath);
    db.audit.push(createAuditEntry(agreement.id, 'CERTIFICATE_GENERATED', req.user.email));
    saveDB();
    res.download(certPath, `Certificate-${agreement.title.replace(/[^a-zA-Z0-9 ]/g, '')}.pdf`);
  } catch (err) {
    res.status(500).json({ error: 'Certificate error: ' + err.message });
  }
});

// ---- Verify Document ----
app.get('/api/agreements/:id/verify', (req, res) => {
  const agreement = db.agreements[req.params.id];
  if (!agreement) return res.status(404).json({ error: 'Agreement not found' });

  const result = verifyDocumentIntegrity(agreement);
  res.json(result);
});

// ---- Get Audit Trail ----
app.get('/api/agreements/:id/audit', requireAuth, (req, res) => {
  const trail = db.audit.filter(e => e.agreementId === req.params.id);
  res.json(trail);
});

// ============================================================
//   CHAT ENDPOINT
// ============================================================

app.post('/api/chat', requireAuth, async (req, res) => {
  const { sessionId, message } = req.body;
  if (!message) return res.status(400).json({ error: 'Message required' });

  let session = db.sessions[sessionId];
  if (!session) {
    const id = sessionId || uuidv4();
    session = { id, messages: [], createdAt: new Date().toISOString() };
    db.sessions[id] = session;
  }

  session.messages.push({ role: 'user', content: message, timestamp: new Date().toISOString() });

  try {
    const response = await legalChat(session.messages);
    session.messages.push({ role: 'assistant', content: response, timestamp: new Date().toISOString() });
    saveDB();
    res.json({ response, sessionId: session.id });
  } catch (err) {
    res.status(500).json({ error: 'Chat error: ' + err.message });
  }
});

// ============================================================
//   DASHBOARD STATS
// ============================================================

app.get('/api/stats', requireAuth, (req, res) => {
  const agreements = Object.values(db.agreements);
  const now = new Date();
  const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

  res.json({
    total: agreements.length,
    draft: agreements.filter(a => a.status === 'draft').length,
    pending: agreements.filter(a => a.status === 'pending').length,
    signed: agreements.filter(a => a.status === 'signed').length,
    expired: agreements.filter(a => a.status === 'expired').length,
    disputed: agreements.filter(a => a.status === 'disputed').length,
    cancelled: agreements.filter(a => a.status === 'cancelled').length,
    resolved: agreements.filter(a => a.status === 'resolved').length,
    activeDisputes: Object.values(db.disputes || {}).filter(d => d.status === 'open').length,
    recentActivity: db.audit.slice(-20).reverse(),
    last30Days: agreements.filter(a => new Date(a.createdAt) > thirtyDaysAgo).length,
    byType: Object.entries(
      agreements.reduce((acc, a) => { acc[a.type] = (acc[a.type] || 0) + 1; return acc; }, {})
    ).sort((a, b) => b[1] - a[1]),
    apiConfigured: !!process.env.OPENAI_API_KEY
  });
});

// ============================================================
//   BLOCKCHAIN & ESCROW ENDPOINTS
// ============================================================

// ---- Register agreement on Story Protocol ----
app.post('/api/agreements/:id/register', requireAuth, (req, res) => {
  const agreement = db.agreements[req.params.id];
  if (!agreement) return res.status(404).json({ error: 'Agreement not found' });

  const registration = prepareStoryRegistration(agreement);

  // Store anchor record
  if (!agreement.blockchain) agreement.blockchain = {};
  agreement.blockchain.anchor = registration.anchor;
  agreement.blockchain.registrationPrepared = true;
  agreement.blockchain.preparedAt = new Date().toISOString();
  agreement.updatedAt = new Date().toISOString();

  db.audit.push(createAuditEntry(agreement.id, 'BLOCKCHAIN_REGISTRATION_PREPARED', req.user.email));
  saveDB();

  res.json(registration);
});

// ---- Confirm on-chain registration (after wallet tx) ----
app.post('/api/agreements/:id/register/confirm', requireAuth, (req, res) => {
  const agreement = db.agreements[req.params.id];
  if (!agreement) return res.status(404).json({ error: 'Agreement not found' });

  const { txHash, blockNumber, ipAssetId } = req.body;
  if (!txHash) return res.status(400).json({ error: 'Transaction hash required' });

  if (!agreement.blockchain) agreement.blockchain = {};
  agreement.blockchain.registered = true;
  agreement.blockchain.txHash = txHash;
  agreement.blockchain.blockNumber = blockNumber;
  agreement.blockchain.ipAssetId = ipAssetId;
  agreement.blockchain.registeredAt = new Date().toISOString();
  agreement.blockchain.network = 'Story Protocol (Odyssey)';
  agreement.updatedAt = new Date().toISOString();

  db.audit.push(createAuditEntry(agreement.id, 'REGISTERED_ON_CHAIN', req.user.email, { txHash, network: 'Story Protocol' }));
  saveDB();

  res.json({ ok: true, blockchain: agreement.blockchain });
});

// ---- Get on-chain verification proof ----
app.get('/api/agreements/:id/proof', (req, res) => {
  const agreement = db.agreements[req.params.id];
  if (!agreement) return res.status(404).json({ error: 'Agreement not found' });

  const proof = generateOnChainProof(agreement, agreement.blockchain || {});
  res.json(proof);
});

// ---- Prepare escrow for agreement ----
app.post('/api/agreements/:id/escrow', requireAuth, (req, res) => {
  const agreement = db.agreements[req.params.id];
  if (!agreement) return res.status(404).json({ error: 'Agreement not found' });

  const { type, partyB, arbiter, token, currency, amount, rules, metadata } = req.body;
  if (!partyB || !amount) return res.status(400).json({ error: 'partyB and amount required' });

  const anchor = createAnchorRecord(agreement);
  const escrowTx = prepareEscrowTransaction({
    type: type || 'Sale',
    partyB,
    arbiter: arbiter || req.body.arbiterAddress,
    currency: currency || 'ETH',
    token: token,
    amount,
    agreementHash: anchor.contentHash,
    agreementId: agreement.id,
    rules: rules || {},
    metadata: { ...metadata, title: agreement.title }
  });

  // Store escrow prep data
  if (!agreement.escrow) agreement.escrow = {};
  agreement.escrow.prepared = true;
  agreement.escrow.preparedAt = new Date().toISOString();
  agreement.escrow.amount = amount;
  agreement.escrow.currency = currency || 'ETH';
  agreement.escrow.type = type || 'Sale';
  agreement.escrow.rules = escrowTx.rules;
  agreement.escrow.partyAAccepted = true;
  agreement.escrow.partyBAccepted = false;
  agreement.updatedAt = new Date().toISOString();

  db.audit.push(createAuditEntry(agreement.id, 'ESCROW_PREPARED', req.user.email, { amount, type, currency }));
  saveDB();

  res.json({ escrowTx, anchor, abi: ESCROW_ABI, currencies: ESCROW_CURRENCIES });
});

// ---- Confirm escrow creation (after wallet tx) ----
app.post('/api/agreements/:id/escrow/confirm', requireAuth, (req, res) => {
  const agreement = db.agreements[req.params.id];
  if (!agreement) return res.status(404).json({ error: 'Agreement not found' });

  const { txHash, escrowId, network } = req.body;
  if (!txHash) return res.status(400).json({ error: 'Transaction hash required' });

  if (!agreement.escrow) agreement.escrow = {};
  agreement.escrow.created = true;
  agreement.escrow.txHash = txHash;
  agreement.escrow.escrowId = escrowId;
  agreement.escrow.network = network || 'Base';
  agreement.escrow.createdAt = new Date().toISOString();
  agreement.updatedAt = new Date().toISOString();

  db.audit.push(createAuditEntry(agreement.id, 'ESCROW_CREATED_ON_CHAIN', req.user.email, { txHash, escrowId }));
  saveDB();

  res.json({ ok: true, escrow: agreement.escrow });
});

// ---- Get blockchain config (for frontend wallet connection) ----
app.get('/api/blockchain/config', requireAuth, (req, res) => {
  res.json({
    storyProtocol: {
      rpcUrl: process.env.STORY_RPC_URL || 'https://odyssey.storyrpc.io',
      chainId: process.env.STORY_CHAIN_ID || '1516',
      contracts: BC_STORY_CONTRACTS,
      explorer: 'https://explorer.story.foundation'
    },
    escrow: {
      rpcUrl: process.env.ESCROW_RPC_URL || 'https://mainnet.base.org',
      chainId: process.env.ESCROW_CHAIN_ID || '8453',
      contract: process.env.ESCROW_CONTRACT_ADDRESS || '',
      explorer: 'https://basescan.org',
      currencies: ESCROW_CURRENCIES,
      rulePresets: ESCROW_RULE_PRESETS
    },
    abi: ESCROW_ABI
  });
});

// ---- Public verification page ----
app.get('/verify/:id', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'verify.html'));
});

// ---- Mutual escrow acceptance ----
app.post('/api/agreements/:id/escrow/accept', (req, res) => {
  const agreement = db.agreements[req.params.id];
  if (!agreement) return res.status(404).json({ error: 'Agreement not found' });
  if (!agreement.escrow || !agreement.escrow.prepared) return res.status(400).json({ error: 'No escrow prepared' });

  const { party, wallet, signature } = req.body;
  if (!party || !wallet) return res.status(400).json({ error: 'Party name and wallet required' });

  if (!agreement.escrow.acceptances) agreement.escrow.acceptances = [];
  
  // Check not already accepted by this wallet
  if (agreement.escrow.acceptances.find(a => a.wallet.toLowerCase() === wallet.toLowerCase())) {
    return res.status(400).json({ error: 'Already accepted by this wallet' });
  }

  agreement.escrow.acceptances.push({
    party,
    wallet,
    signature: signature || null,
    acceptedAt: new Date().toISOString()
  });

  // Check if both parties accepted
  const bothAccepted = agreement.escrow.acceptances.length >= 2;
  agreement.escrow.bothAccepted = bothAccepted;
  agreement.updatedAt = new Date().toISOString();

  db.audit.push(createAuditEntry(agreement.id, 'ESCROW_ACCEPTED', party, { wallet }));
  saveDB();

  // Notify on acceptance
  notifyEscrowEvent(agreement, 'accepted', `${party} has accepted the escrow terms.`).catch(e => console.error('Notify error:', e));

  res.json({ ok: true, bothAccepted, acceptances: agreement.escrow.acceptances });
});

// ---- Escrow currencies & rules config (public) ----
app.get('/api/escrow/config', (req, res) => {
  res.json({
    currencies: ESCROW_CURRENCIES,
    rulePresets: ESCROW_RULE_PRESETS
  });
});

// ════════════════════════════════════════════════════════
//   ON-CHAIN ESCROW (Real Smart Contract Interaction)
// ════════════════════════════════════════════════════════

// ---- Contract status check ----
app.get('/api/escrow/status', async (req, res) => {
  try {
    const status = await getContractStatus();
    res.json(status);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ---- Create escrow ON-CHAIN ----
app.post('/api/agreements/:id/escrow/deploy', requireAuth, async (req, res) => {
  const agreement = db.agreements[req.params.id];
  if (!agreement) return res.status(404).json({ error: 'Agreement not found' });

  const { type, partyB, arbiter, currency, amount, metadata } = req.body;
  if (!partyB || !amount) return res.status(400).json({ error: 'partyB and amount required' });

  // Create anchor hash for the agreement
  const anchor = createAnchorRecord(agreement);

  // Deploy escrow to the blockchain
  const result = await createEscrowOnChain({
    type: type || 'Sale',
    partyB,
    arbiter,
    currency: currency || 'ETH',
    amount,
    agreementHash: anchor.contentHash,
    agreementId: agreement.id,
    metadata: { ...metadata, title: agreement.title }
  });

  if (result.success) {
    // Store on-chain escrow data
    if (!agreement.escrow) agreement.escrow = {};
    agreement.escrow.onChain = true;
    agreement.escrow.txHash = result.txHash;
    agreement.escrow.escrowId = result.escrowId;
    agreement.escrow.blockNumber = result.blockNumber;
    agreement.escrow.contract = result.contract;
    agreement.escrow.network = result.network;
    agreement.escrow.explorerUrl = result.explorerUrl;
    agreement.escrow.deployedAt = new Date().toISOString();
    agreement.escrow.amount = amount;
    agreement.escrow.currency = currency || 'ETH';
    agreement.escrow.type = type || 'Sale';
    agreement.updatedAt = new Date().toISOString();

    db.audit.push(createAuditEntry(agreement.id, 'ESCROW_DEPLOYED_ON_CHAIN', req.user.email, {
      txHash: result.txHash,
      escrowId: result.escrowId,
      amount,
      currency
    }));
    saveDB();

    notifyEscrowEvent(agreement, 'created', `Escrow deployed on-chain. TX: ${result.txHash}`).catch(() => {});
  }

  res.json(result);
});

// ---- Read escrow state FROM chain ----
app.get('/api/escrow/:escrowId/chain', async (req, res) => {
  try {
    const result = await getEscrowOnChain(parseInt(req.params.escrowId));
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ---- Get escrows by user wallet address ----
app.get('/api/escrow/user/:address', async (req, res) => {
  try {
    const result = await getEscrowsByUser(req.params.address);
    if (result.success && result.escrowIds.length > 0) {
      // Fetch full details for each escrow
      const escrows = [];
      for (const id of result.escrowIds) {
        const detail = await getEscrowOnChain(parseInt(id));
        if (detail.success) escrows.push(detail.escrow);
      }
      res.json({ success: true, escrows });
    } else {
      res.json(result);
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ---- Look up escrow by agreement hash ----
app.get('/api/escrow/agreement/:hash', async (req, res) => {
  try {
    const result = await getEscrowByAgreementHash(req.params.hash);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ============================================================
//   DISPUTE RESOLUTION
// ============================================================

/**
 * Agreement status lifecycle:
 * draft → pending → signed → (disputed → resolved | cancelled)
 * Escrow lifecycle:
 * prepared → accepted → funded → (released | disputed → arbiter_ruled → released/refunded)
 */

// ---- Raise a Dispute ----
app.post('/api/agreements/:id/dispute', requireAuth, async (req, res) => {
  const agreement = db.agreements[req.params.id];
  if (!agreement) return res.status(404).json({ error: 'Agreement not found' });
  if (agreement.status !== 'signed' && agreement.status !== 'active') {
    return res.status(400).json({ error: 'Can only dispute signed/active agreements' });
  }

  const { reason, category, evidence, proposedResolution } = req.body;
  if (!reason) return res.status(400).json({ error: 'Dispute reason required' });

  const disputeId = uuidv4();
  const now = new Date().toISOString();
  const disputeWindowDays = agreement.escrow?.rules?.disputeWindowDays || 14;
  const deadline = new Date(Date.now() + disputeWindowDays * 24 * 60 * 60 * 1000).toISOString();

  const dispute = {
    id: disputeId,
    agreementId: agreement.id,
    raisedBy: req.user.email,
    raisedByName: req.user.name,
    reason,
    category: category || 'general',
    evidence: evidence || [],
    proposedResolution: proposedResolution || null,
    status: 'open',
    responses: [],
    deadline,
    disputeWindowDays,
    arbiter: agreement.escrow?.arbiter || null,
    createdAt: now,
    updatedAt: now,
    resolvedAt: null,
    resolution: null
  };

  db.disputes[disputeId] = dispute;
  agreement.status = 'disputed';
  agreement.activeDisputeId = disputeId;
  if (agreement.escrow) agreement.escrow.status = 'disputed';
  agreement.updatedAt = now;

  db.audit.push(createAuditEntry(agreement.id, 'DISPUTE_RAISED', req.user.email, { disputeId, reason, deadline }));
  saveDB();

  // Notify all parties
  notifyDisputeRaised(agreement, req.user.name || req.user.email, reason).catch(e => console.error('Notify error:', e));

  res.json({ dispute, agreement: { id: agreement.id, status: agreement.status } });
});

// ---- Respond to a Dispute ----
app.post('/api/agreements/:id/dispute/respond', requireAuth, (req, res) => {
  const agreement = db.agreements[req.params.id];
  if (!agreement) return res.status(404).json({ error: 'Agreement not found' });
  if (agreement.status !== 'disputed') return res.status(400).json({ error: 'No active dispute' });

  const dispute = db.disputes[agreement.activeDisputeId];
  if (!dispute) return res.status(404).json({ error: 'Dispute not found' });

  const { message, evidence, counterProposal } = req.body;
  if (!message) return res.status(400).json({ error: 'Response message required' });

  dispute.responses.push({
    from: req.user.email,
    fromName: req.user.name,
    message,
    evidence: evidence || [],
    counterProposal: counterProposal || null,
    createdAt: new Date().toISOString()
  });
  dispute.updatedAt = new Date().toISOString();

  db.audit.push(createAuditEntry(agreement.id, 'DISPUTE_RESPONSE', req.user.email, { disputeId: dispute.id }));
  saveDB();

  res.json({ dispute });
});

// ---- Resolve Dispute (by mutual agreement or arbiter) ----
app.post('/api/agreements/:id/dispute/resolve', requireAuth, (req, res) => {
  const agreement = db.agreements[req.params.id];
  if (!agreement) return res.status(404).json({ error: 'Agreement not found' });
  if (agreement.status !== 'disputed') return res.status(400).json({ error: 'No active dispute' });

  const dispute = db.disputes[agreement.activeDisputeId];
  if (!dispute) return res.status(404).json({ error: 'Dispute not found' });

  const { resolution, releaseTo, splitPercentage, resolverRole } = req.body;
  if (!resolution) return res.status(400).json({ error: 'Resolution description required' });

  const now = new Date().toISOString();
  dispute.status = 'resolved';
  dispute.resolution = resolution;
  dispute.resolvedBy = req.user.email;
  dispute.resolvedByName = req.user.name;
  dispute.resolverRole = resolverRole || 'party';
  dispute.resolvedAt = now;
  dispute.releaseTo = releaseTo || null;
  dispute.splitPercentage = splitPercentage || null;
  dispute.updatedAt = now;

  // Update agreement status
  agreement.status = 'resolved';
  agreement.activeDisputeId = null;
  if (agreement.escrow) {
    if (releaseTo) {
      agreement.escrow.status = 'resolved';
      agreement.escrow.releaseTo = releaseTo;
    }
    if (splitPercentage) {
      agreement.escrow.status = 'split';
      agreement.escrow.splitPercentage = splitPercentage;
    }
  }
  agreement.updatedAt = now;

  db.audit.push(createAuditEntry(agreement.id, 'DISPUTE_RESOLVED', req.user.email, { disputeId: dispute.id, resolution, releaseTo }));
  saveDB();

  // Notify all parties
  notifyDisputeResolved(agreement, resolution, req.user.name || req.user.email).catch(e => console.error('Notify error:', e));

  res.json({ dispute, agreement: { id: agreement.id, status: agreement.status } });
});

// ---- Cancel Agreement (if allowed) ----
app.post('/api/agreements/:id/cancel', requireAuth, (req, res) => {
  const agreement = db.agreements[req.params.id];
  if (!agreement) return res.status(404).json({ error: 'Agreement not found' });
  if (agreement.status === 'cancelled') return res.status(400).json({ error: 'Already cancelled' });

  // Check cancellation policy
  const policy = agreement.escrow?.rules?.cancellationPolicy || 'mutual';
  if (agreement.status === 'signed' && policy === 'none') {
    return res.status(403).json({ error: 'Cancellation not allowed per agreement rules' });
  }

  const { reason } = req.body;
  const now = new Date().toISOString();

  agreement.status = 'cancelled';
  agreement.cancelledBy = req.user.email;
  agreement.cancelledAt = now;
  agreement.cancellationReason = reason || 'No reason provided';
  if (agreement.escrow) agreement.escrow.status = 'cancelled';
  agreement.updatedAt = now;

  db.audit.push(createAuditEntry(agreement.id, 'CANCELLED', req.user.email, { reason }));
  saveDB();

  res.json({ ok: true, status: 'cancelled' });
});

// ---- Get Dispute Details ----
app.get('/api/agreements/:id/dispute', requireAuth, (req, res) => {
  const agreement = db.agreements[req.params.id];
  if (!agreement) return res.status(404).json({ error: 'Agreement not found' });

  // Return active dispute or history
  const disputes = Object.values(db.disputes).filter(d => d.agreementId === req.params.id);
  const active = agreement.activeDisputeId ? db.disputes[agreement.activeDisputeId] : null;

  res.json({ active, history: disputes });
});

// ---- Get All Disputes (admin) ----
app.get('/api/disputes', requireAuth, (req, res) => {
  const disputes = Object.values(db.disputes)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const enriched = disputes.map(d => {
    const agreement = db.agreements[d.agreementId];
    return {
      ...d,
      agreementTitle: agreement?.title || 'Unknown',
      agreementType: agreement?.type || 'Unknown'
    };
  });

  res.json(enriched);
});

// ---- Notification Settings (test email) ----
app.post('/api/notifications/test', requireAuth, async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });

  const { sendEmail } = require('./notification-engine');
  const result = await sendEmail(
    email,
    'Test Notification',
    '<h2>AgreeMint Notifications Working!</h2><p>If you received this, email notifications are properly configured.</p>',
    'AgreeMint test notification'
  );

  res.json(result);
});

// ============================================================
//   KEEP YOUR WORD — FREE SOCIAL SCORE PRODUCT
// ============================================================

// ---- KYW Auth: Social Login (link-based verification) ----
app.post('/api/kyw/auth/social', (req, res) => {
  const { provider, handle, displayName, profileUrl, avatarUrl } = req.body;
  if (!provider || !handle) return res.status(400).json({ error: 'Provider and handle required' });

  const validProviders = ['twitter', 'x', 'instagram', 'google', 'github', 'tinder', 'hinge', 'bumble'];
  if (!validProviders.includes(provider.toLowerCase())) {
    return res.status(400).json({ error: 'Invalid provider. Use: twitter, x, instagram, google, github' });
  }

  const normalizedProvider = provider.toLowerCase() === 'x' ? 'twitter' : provider.toLowerCase();
  const userId = `${normalizedProvider}:${handle.toLowerCase().replace('@', '')}`;

  if (!db.kywUsers[userId]) {
    db.kywUsers[userId] = {
      id: userId,
      provider: normalizedProvider,
      handle: handle.replace('@', ''),
      displayName: displayName || handle,
      profileUrl: profileUrl || '',
      avatarUrl: avatarUrl || '',
      pledges: [],
      joinedAt: new Date().toISOString(),
      verified: false,
      verificationCode: uuidv4().substring(0, 8).toUpperCase()
    };
  }

  const user = db.kywUsers[userId];
  const token = uuidv4();
  authTokens[token] = { userId, role: 'kyw_user', provider: normalizedProvider, handle: user.handle };

  saveDB();
  res.json({
    token,
    user: {
      id: userId,
      handle: user.handle,
      displayName: user.displayName,
      provider: user.provider,
      avatarUrl: user.avatarUrl,
      verified: user.verified,
      verificationCode: user.verificationCode,
      score: calculateSocialScore(user)
    }
  });
});

// ---- KYW Verify social account (post verification code in bio) ----
app.post('/api/kyw/auth/verify', (req, res) => {
  const token = req.headers['x-auth-token'];
  if (!token || !authTokens[token]) return res.status(401).json({ error: 'Not authenticated' });

  const { userId } = authTokens[token];
  const user = db.kywUsers[userId];
  if (!user) return res.status(404).json({ error: 'User not found' });

  user.verified = true;
  user.verifiedAt = new Date().toISOString();
  saveDB();

  res.json({ ok: true, verified: true });
});

// ---- KYW: Get user profile / score ----
app.get('/api/kyw/profile/:userId', (req, res) => {
  const user = db.kywUsers[req.params.userId];
  if (!user) return res.status(404).json({ error: 'User not found' });

  res.json({
    id: user.id,
    handle: user.handle,
    displayName: user.displayName,
    provider: user.provider,
    avatarUrl: user.avatarUrl,
    verified: user.verified,
    joinedAt: user.joinedAt,
    score: calculateSocialScore(user),
    pledges: user.pledges.filter(p => p.isPublic).map(p => ({
      id: p.id,
      title: p.title,
      category: p.category,
      status: p.status,
      deadline: p.deadline,
      hasStake: p.hasStake,
      contentHash: p.contentHash,
      createdAt: p.createdAt,
      resolvedAt: p.resolvedAt,
      mode: p.mode || 'self',
      verificationType: p.verificationType,
      templateId: p.templateId,
      currentStreak: p.currentStreak || 0,
      longestStreak: p.longestStreak || 0,
      totalCheckins: p.totalCheckins || 0,
      targetDays: p.targetDays,
      frequency: p.frequency,
      locationName: p.locationName,
      counterpartyHandle: p.counterpartyHandle,
      counterpartyAccepted: p.counterpartyAccepted,
      checkins: p.checkins || [],
      reactions: p.reactions,
      dateLocation: p.dateLocation,
      dateTime: p.dateTime,
      dateSubPledges: p.dateSubPledges || [],
      dateRatings: p.dateRatings || {},
      description: p.description
    }))
  });
});

// ---- KYW: Create pledge ----
app.post('/api/kyw/pledges', (req, res) => {
  const token = req.headers['x-auth-token'];
  if (!token || !authTokens[token]) return res.status(401).json({ error: 'Not authenticated' });

  const { userId } = authTokens[token];
  const user = db.kywUsers[userId];
  if (!user) return res.status(404).json({ error: 'User not found' });

  const pledge = createPledge(userId, req.body);

  // For mutual pledges, link to counterparty if they exist
  if ((pledge.mode === 'mutual' || pledge.mode === 'date') && pledge.counterpartyHandle && pledge.counterpartyProvider) {
    const cpId = `${pledge.counterpartyProvider}:${pledge.counterpartyHandle.toLowerCase().replace('@', '')}`;
    if (db.kywUsers[cpId]) {
      pledge.counterpartyUserId = cpId;
    }
  }

  user.pledges.push(pledge);
  db.pledges[pledge.id] = { ...pledge, userHandle: user.handle, userProvider: user.provider };
  saveDB();

  res.json({ pledge, score: calculateSocialScore(user) });
});

// ---- KYW: Get public pledge feed ----
app.get('/api/kyw/feed', (req, res) => {
  const { category, status, limit } = req.query;
  let pledges = Object.values(db.pledges)
    .filter(p => p.isPublic)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  if (category) pledges = pledges.filter(p => p.category === category);
  if (status) pledges = pledges.filter(p => p.status === status);

  const max = parseInt(limit) || 50;
  pledges = pledges.slice(0, max);

  // Attach user scores
  const feed = pledges.map(p => {
    const user = db.kywUsers[p.userId];
    return {
      ...p,
      user: user ? {
        handle: user.handle,
        provider: user.provider,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        verified: user.verified,
        score: calculateSocialScore(user)
      } : null
    };
  });

  res.json(feed);
});

// ---- KYW: Resolve pledge (kept/broken) ----
app.post('/api/kyw/pledges/:id/resolve', (req, res) => {
  const token = req.headers['x-auth-token'];
  if (!token || !authTokens[token]) return res.status(401).json({ error: 'Not authenticated' });

  const { userId } = authTokens[token];
  const user = db.kywUsers[userId];
  if (!user) return res.status(404).json({ error: 'User not found' });

  const { resolution } = req.body; // 'kept' or 'broken'
  if (!['kept', 'broken'].includes(resolution)) return res.status(400).json({ error: 'Resolution must be "kept" or "broken"' });

  const pledge = user.pledges.find(p => p.id === req.params.id);
  if (!pledge) return res.status(404).json({ error: 'Pledge not found' });
  if (pledge.status !== 'active') return res.status(400).json({ error: 'Pledge is already resolved' });

  resolvePledge(pledge, resolution, userId);

  // Update in global pledges too
  if (db.pledges[pledge.id]) {
    db.pledges[pledge.id] = { ...pledge, userHandle: user.handle, userProvider: user.provider };
  }

  saveDB();
  res.json({ pledge, score: calculateSocialScore(user) });
});

// ---- KYW: React to pledge (vouch/doubt) ----
app.post('/api/kyw/pledges/:id/react', (req, res) => {
  const { reaction } = req.body; // 'vouch' or 'doubt'
  if (!['vouch', 'doubt'].includes(reaction)) return res.status(400).json({ error: 'Reaction must be "vouch" or "doubt"' });

  const pledge = db.pledges[req.params.id];
  if (!pledge) return res.status(404).json({ error: 'Pledge not found' });

  pledge.reactions[reaction] = (pledge.reactions[reaction] || 0) + 1;

  // Also update in user's pledge array
  const user = db.kywUsers[pledge.userId];
  if (user) {
    const userPledge = user.pledges.find(p => p.id === req.params.id);
    if (userPledge) userPledge.reactions = pledge.reactions;
  }

  saveDB();
  res.json({ reactions: pledge.reactions });
});

// ---- KYW: Get single pledge ----
app.get('/api/kyw/pledges/:id', (req, res) => {
  const pledge = db.pledges[req.params.id];
  if (!pledge) return res.status(404).json({ error: 'Pledge not found' });

  const user = db.kywUsers[pledge.userId];
  res.json({
    pledge,
    user: user ? {
      handle: user.handle,
      provider: user.provider,
      displayName: user.displayName,
      verified: user.verified,
      score: calculateSocialScore(user)
    } : null
  });
});

// ---- KYW: Leaderboard ----
app.get('/api/kyw/leaderboard', (req, res) => {
  const users = Object.values(db.kywUsers)
    .map(u => ({
      id: u.id,
      handle: u.handle,
      provider: u.provider,
      displayName: u.displayName,
      avatarUrl: u.avatarUrl,
      verified: u.verified,
      score: calculateSocialScore(u)
    }))
    .filter(u => u.score.totalPledges > 0)
    .sort((a, b) => b.score.score - a.score.score)
    .slice(0, 50);

  res.json(users);
});

// ---- KYW: Categories ----
app.get('/api/kyw/categories', (req, res) => {
  res.json(PLEDGE_CATEGORIES);
});

// ---- KYW: Stats ----
app.get('/api/kyw/stats', (req, res) => {
  const allPledges = Object.values(db.pledges);
  res.json({
    totalUsers: Object.keys(db.kywUsers).length,
    totalPledges: allPledges.length,
    activePledges: allPledges.filter(p => p.status === 'active').length,
    keptPledges: allPledges.filter(p => p.status === 'kept').length,
    brokenPledges: allPledges.filter(p => p.status === 'broken').length,
    categories: PLEDGE_CATEGORIES
  });
});

// ---- KYW: Check-in for self-pledges ----
app.post('/api/kyw/pledges/:id/checkin', (req, res) => {
  const token = req.headers['x-auth-token'];
  if (!token || !authTokens[token]) return res.status(401).json({ error: 'Not authenticated' });

  const { userId } = authTokens[token];
  const user = db.kywUsers[userId];
  if (!user) return res.status(404).json({ error: 'User not found' });

  const pledge = user.pledges.find(p => p.id === req.params.id);
  if (!pledge) return res.status(404).json({ error: 'Pledge not found' });
  if (pledge.status !== 'active') return res.status(400).json({ error: 'Pledge is already resolved' });
  if (pledge.mode !== 'self') return res.status(400).json({ error: 'Check-ins are for self-pledges only' });

  const result = processCheckin(pledge, {
    latitude: req.body.latitude,
    longitude: req.body.longitude,
    timestamp: req.body.timestamp || new Date().toISOString(),
    photoUrl: req.body.photoUrl,
    note: req.body.note
  });

  if (!result.success) return res.status(400).json({ error: result.error });

  // Sync to global pledges
  if (db.pledges[pledge.id]) {
    db.pledges[pledge.id] = { ...pledge, userHandle: user.handle, userProvider: user.provider };
  }
  saveDB();

  res.json({
    checkin: result.checkin,
    streak: pledge.currentStreak,
    longestStreak: pledge.longestStreak,
    totalCheckins: pledge.totalCheckins,
    verified: result.verified,
    score: calculateSocialScore(user),
    pledgeStatus: pledge.status
  });
});

// ---- KYW: Mutual pledge — counterparty accepts ----
app.post('/api/kyw/pledges/:id/accept', (req, res) => {
  const token = req.headers['x-auth-token'];
  if (!token || !authTokens[token]) return res.status(401).json({ error: 'Not authenticated' });

  const { userId } = authTokens[token];
  const pledge = db.pledges[req.params.id];
  if (!pledge) return res.status(404).json({ error: 'Pledge not found' });
  if (pledge.mode !== 'mutual' && pledge.mode !== 'date') return res.status(400).json({ error: 'Not a mutual/date pledge' });

  // Check the accepting user matches the counterparty
  const user = db.kywUsers[userId];
  if (!user) return res.status(404).json({ error: 'User not found' });
  const userHandle = user.handle.toLowerCase();
  const cpHandle = (pledge.counterpartyHandle || '').toLowerCase().replace('@', '');

  if (userHandle !== cpHandle) return res.status(403).json({ error: 'You are not the counterparty for this pledge' });

  pledge.counterpartyAccepted = true;
  pledge.counterpartyUserId = userId;

  // Also add to counterparty's pledges as a linked reference
  if (!user.pledges.find(p => p.id === pledge.id)) {
    user.pledges.push({ ...pledge, linkedRole: 'counterparty' });
  }

  // Update creator's copy
  const creator = db.kywUsers[pledge.userId];
  if (creator) {
    const creatorPledge = creator.pledges.find(p => p.id === pledge.id);
    if (creatorPledge) {
      creatorPledge.counterpartyAccepted = true;
      creatorPledge.counterpartyUserId = userId;
    }
  }

  saveDB();
  res.json({ ok: true, pledge });
});

// ---- KYW: Mutual pledge — counterparty confirms kept/broken ----
app.post('/api/kyw/pledges/:id/confirm', (req, res) => {
  const token = req.headers['x-auth-token'];
  if (!token || !authTokens[token]) return res.status(401).json({ error: 'Not authenticated' });

  const { userId } = authTokens[token];
  const { resolution } = req.body;
  if (!['kept', 'broken'].includes(resolution)) return res.status(400).json({ error: 'Resolution must be "kept" or "broken"' });

  const pledge = db.pledges[req.params.id];
  if (!pledge) return res.status(404).json({ error: 'Pledge not found' });
  if (pledge.mode !== 'mutual' && pledge.mode !== 'date') return res.status(400).json({ error: 'Not a mutual/date pledge' });
  if (pledge.status !== 'active') return res.status(400).json({ error: 'Pledge already resolved' });
  if (!pledge.counterpartyAccepted) return res.status(400).json({ error: 'Counterparty has not accepted yet' });
  if (pledge.counterpartyUserId !== userId) return res.status(403).json({ error: 'Only the counterparty can confirm' });

  // Resolve the pledge
  const creator = db.kywUsers[pledge.userId];
  if (creator) {
    const creatorPledge = creator.pledges.find(p => p.id === pledge.id);
    if (creatorPledge) resolvePledge(creatorPledge, resolution, userId);
  }

  resolvePledge(pledge, resolution, userId);

  // Update counter party's copy
  const cpUser = db.kywUsers[userId];
  if (cpUser) {
    const cpPledge = cpUser.pledges.find(p => p.id === pledge.id);
    if (cpPledge) resolvePledge(cpPledge, resolution, userId);
  }

  saveDB();
  res.json({ ok: true, pledge, creatorScore: creator ? calculateSocialScore(creator) : null });
});

// ---- KYW: Self-pledge templates ----
app.get('/api/kyw/templates', (req, res) => {
  res.json(SELF_PLEDGE_TEMPLATES);
});

// ---- KYW: Date pledge templates ----
app.get('/api/kyw/date-templates', (req, res) => {
  res.json(DATE_PLEDGE_TEMPLATES);
});

// ---- KYW: Rate a date (after date pledge is complete) ----
app.post('/api/kyw/pledges/:id/rate', (req, res) => {
  const token = req.headers['x-auth-token'];
  if (!token || !authTokens[token]) return res.status(401).json({ error: 'Not authenticated' });

  const { userId } = authTokens[token];
  const pledge = db.pledges[req.params.id];
  if (!pledge) return res.status(404).json({ error: 'Pledge not found' });
  if (pledge.mode !== 'date') return res.status(400).json({ error: 'Not a date pledge' });
  if (pledge.userId !== userId && pledge.counterpartyUserId !== userId) return res.status(403).json({ error: 'Not your pledge' });

  const { showedUp, honest, respectful, wouldDateAgain, note } = req.body;
  if (!pledge.dateRatings) pledge.dateRatings = {};
  pledge.dateRatings[userId] = {
    showedUp: !!showedUp,
    honest: !!honest,
    respectful: !!respectful,
    wouldDateAgain: !!wouldDateAgain,
    note: (note || '').substring(0, 500),
    ratedAt: new Date().toISOString()
  };

  // Update the pledge in creator and counterparty's copies too
  const creator = db.kywUsers[pledge.userId];
  if (creator) {
    const cp = creator.pledges.find(p => p.id === pledge.id);
    if (cp) { if (!cp.dateRatings) cp.dateRatings = {}; cp.dateRatings[userId] = pledge.dateRatings[userId]; }
  }
  const cpUser = pledge.counterpartyUserId ? db.kywUsers[pledge.counterpartyUserId] : null;
  if (cpUser) {
    const cp2 = cpUser.pledges.find(p => p.id === pledge.id);
    if (cp2) { if (!cp2.dateRatings) cp2.dateRatings = {}; cp2.dateRatings[userId] = pledge.dateRatings[userId]; }
  }

  saveDB();
  res.json({ ok: true, dateRatings: pledge.dateRatings });
});

// ---- KYW: Public shareable dating profile ----
app.get('/api/kyw/dating-profile/:userId', (req, res) => {
  const user = db.kywUsers[req.params.userId];
  if (!user) return res.status(404).json({ error: 'User not found' });

  const datingScore = calculateDatingScore(user);
  const socialScore = calculateSocialScore(user);
  const datePledges = (user.pledges || []).filter(p => p.mode === 'date' && p.isPublic).map(p => ({
    id: p.id,
    title: p.title,
    templateId: p.templateId,
    status: p.status,
    createdAt: p.createdAt,
    resolvedAt: p.resolvedAt,
    dateLocation: p.dateLocation,
    dateSubPledges: p.dateSubPledges,
    counterpartyHandle: p.counterpartyHandle,
    dateRatings: p.dateRatings || {}
  }));

  res.json({
    handle: user.handle,
    displayName: user.displayName,
    provider: user.provider,
    verified: user.verified,
    joinedAt: user.joinedAt,
    socialScore,
    datingScore,
    datePledges,
    shareUrl: `${req.protocol}://${req.get('host')}/kyw/dating/${user.id}`
  });
});

// ---- KYW: Dating profile shareable page ----
app.get('/kyw/dating/:userId', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'keepyourword.html'));
});

// ---- KYW: Verification types ----
app.get('/api/kyw/verification-types', (req, res) => {
  res.json(VERIFICATION_TYPES);
});

// ---- KYW: Pledges awaiting my acceptance (mutual) ----
app.get('/api/kyw/pending', (req, res) => {
  const token = req.headers['x-auth-token'];
  if (!token || !authTokens[token]) return res.status(401).json({ error: 'Not authenticated' });

  const { userId } = authTokens[token];
  const user = db.kywUsers[userId];
  if (!user) return res.status(404).json({ error: 'User not found' });

  const pending = Object.values(db.pledges).filter(p =>
    (p.mode === 'mutual' || p.mode === 'date') &&
    p.status === 'active' &&
    !p.counterpartyAccepted &&
    (p.counterpartyHandle || '').toLowerCase().replace('@', '') === user.handle.toLowerCase()
  ).map(p => {
    const creator = db.kywUsers[p.userId];
    return {
      ...p,
      user: creator ? { handle: creator.handle, displayName: creator.displayName, provider: creator.provider, verified: creator.verified, score: calculateSocialScore(creator) } : null
    };
  });

  res.json(pending);
});

// ---- Keep Your Word standalone page ----
app.get('/keepyourword', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'keepyourword.html'));
});
app.get('/kyw', (req, res) => {
  res.redirect('/keepyourword');
});

// ============================================================
//   STORY PROTOCOL — IP REGISTRATION
// ============================================================

// ---- Manual IP registration for any agreement ----
app.post('/api/agreements/:id/ip/register', requireAuth, async (req, res) => {
  const agreement = db.agreements[req.params.id];
  if (!agreement) return res.status(404).json({ error: 'Agreement not found' });

  if (agreement.ipAsset && !req.body.force) {
    return res.json({ alreadyRegistered: true, ipAsset: agreement.ipAsset });
  }

  try {
    const result = await registerAgreementAsIP(agreement);
    if (result.success) {
      agreement.ipAsset = result.ipAsset;
      db.audit.push(createAuditEntry(agreement.id, 'IP_REGISTERED', req.user.email, {
        chain: result.ipAsset.chain,
        contentHash: result.ipAsset.contentHash,
        simulated: result.simulated
      }));
      saveDB();
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'IP registration error: ' + err.message });
  }
});

// ---- Verify IP registration ----
app.get('/api/agreements/:id/ip/verify', (req, res) => {
  const agreement = db.agreements[req.params.id];
  if (!agreement) return res.status(404).json({ error: 'Agreement not found' });
  res.json(verifyIPRegistration(agreement));
});

// ---- Generate license terms for IP ----
app.post('/api/agreements/:id/ip/license', requireAuth, (req, res) => {
  const agreement = db.agreements[req.params.id];
  if (!agreement) return res.status(404).json({ error: 'Agreement not found' });
  if (!agreement.ipAsset) return res.status(400).json({ error: 'Agreement not registered as IP' });

  const terms = generateLicenseTerms(agreement, req.body);
  res.json(terms);
});

// ---- Get IP metadata ----
app.get('/api/agreements/:id/ip/metadata', (req, res) => {
  const agreement = db.agreements[req.params.id];
  if (!agreement) return res.status(404).json({ error: 'Agreement not found' });
  res.json(generateIPMetadata(agreement));
});

// ---- Batch register all signed agreements as IP ----
app.post('/api/ip/register-all', requireAuth, async (req, res) => {
  const signed = Object.values(db.agreements).filter(a => a.status === 'signed' && !a.ipAsset);
  const results = [];

  for (const agreement of signed) {
    try {
      const result = await registerAgreementAsIP(agreement);
      if (result.success) {
        agreement.ipAsset = result.ipAsset;
        db.audit.push(createAuditEntry(agreement.id, 'IP_REGISTERED', req.user.email, {
          chain: result.ipAsset.chain, batch: true
        }));
        results.push({ id: agreement.id, title: agreement.title, success: true });
      }
    } catch (e) {
      results.push({ id: agreement.id, title: agreement.title, success: false, error: e.message });
    }
  }

  saveDB();
  res.json({ total: signed.length, registered: results.filter(r => r.success).length, results });
});

// ============================================================
//   STRIPE — PAYMENTS & SUBSCRIPTIONS
// ============================================================

// ---- Pricing page data ----
app.get('/api/pricing', (req, res) => {
  res.json({
    tiers: TIERS,
    perUse: PER_USE_PRICING,
    products: STRIPE_PRODUCTS
  });
});

// ---- Create subscription checkout ----
app.post('/api/stripe/checkout/subscription', requireAuth, async (req, res) => {
  const { tier } = req.body;
  if (!['starter', 'pro', 'enterprise'].includes(tier)) {
    return res.status(400).json({ error: 'Invalid tier' });
  }
  const result = await createSubscriptionCheckout(req.user.userId || req.user.email, req.user.email, tier);
  res.json(result);
});

// ---- Create one-time purchase checkout ----
app.post('/api/stripe/checkout/purchase', requireAuth, async (req, res) => {
  const { product, metadata } = req.body;
  if (!product) return res.status(400).json({ error: 'Product key required' });
  const result = await createOneTimeCheckout(req.user.userId || req.user.email, req.user.email, product, metadata);
  res.json(result);
});

// ---- Customer portal (manage subscription) ----
app.post('/api/stripe/portal', requireAuth, async (req, res) => {
  const user = db.registeredUsers[req.user.userId];
  if (!user?.stripeCustomerId) return res.status(400).json({ error: 'No Stripe subscription found' });
  const result = await createPortalSession(user.stripeCustomerId);
  res.json(result);
});

// ---- Stripe webhook ----
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const sig = req.headers['stripe-signature'];
  const result = processWebhookEvent(req.body, sig);

  if (result.error) {
    console.error('[stripe webhook]', result.error);
    return res.status(400).json({ error: result.error });
  }

  // Process the action
  switch (result.action) {
    case 'upgrade_tier': {
      const user = Object.values(db.registeredUsers).find(u => u.id === result.userId);
      if (user) {
        user.tier = result.tier;
        user.stripeCustomerId = result.stripeCustomerId;
        user.stripeSubscriptionId = result.stripeSubscriptionId;
        if (user.apiKey) {
          user.apiKeyActive = ['pro', 'enterprise'].includes(result.tier);
          if (db.apiKeys[user.apiKey]) db.apiKeys[user.apiKey].active = user.apiKeyActive;
        }
        // Update active auth tokens
        Object.values(authTokens).forEach(t => { if (t.userId === user.id) t.tier = result.tier; });
        saveDB();
      }
      break;
    }

    case 'subscription_cancelled': {
      const user = Object.values(db.registeredUsers).find(u => u.stripeCustomerId === result.stripeCustomerId);
      if (user) {
        user.tier = 'free';
        user.apiKeyActive = false;
        if (db.apiKeys[user.apiKey]) db.apiKeys[user.apiKey].active = false;
        Object.values(authTokens).forEach(t => { if (t.userId === user.id) t.tier = 'free'; });
        saveDB();
      }
      break;
    }

    case 'template_purchased': {
      const template = db.templates[result.templateId];
      if (template) {
        recordPurchase(template, result.buyerEmail);
        db.purchases.push({ type: 'template', templateId: result.templateId, buyerEmail: result.buyerEmail, at: new Date().toISOString() });
        saveDB();
      }
      break;
    }
  }

  res.json({ received: true, action: result.action });
});

// ---- Revenue analytics (admin) ----
app.get('/api/revenue', requireAuth, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  res.json(getRevenueBreakdown(db));
});

// ============================================================
//   TEMPLATE MARKETPLACE
// ============================================================

// ---- Browse templates ----
app.get('/api/marketplace/templates', (req, res) => {
  const allTemplates = Object.values(db.templates).filter(t => t.approved !== false);
  const results = searchTemplates(allTemplates, {
    search: req.query.search,
    category: req.query.category,
    type: req.query.type,
    jurisdiction: req.query.jurisdiction,
    minRating: req.query.minRating ? parseFloat(req.query.minRating) : undefined,
    maxPrice: req.query.maxPrice !== undefined ? parseInt(req.query.maxPrice) : undefined,
    freeOnly: req.query.free === 'true',
    featured: req.query.featured === 'true',
    sort: req.query.sort || 'popular'
  });

  // Don't expose full content in listing
  const listing = results.map(t => ({
    id: t.id,
    name: t.name,
    description: t.description,
    category: t.category,
    type: t.type,
    price: t.price,
    priceFormatted: t.price === 0 ? 'Free' : `$${(t.price / 100).toFixed(2)}`,
    authorName: t.authorName,
    jurisdiction: t.jurisdiction,
    tags: t.tags,
    rating: t.rating,
    ratingCount: t.ratingCount,
    purchaseCount: t.purchaseCount,
    featured: t.featured,
    variables: t.variables
  }));

  res.json({ templates: listing, total: listing.length });
});

// ---- Get template details ----
app.get('/api/marketplace/templates/:id', (req, res) => {
  const template = db.templates[req.params.id];
  if (!template) return res.status(404).json({ error: 'Template not found' });

  // Return content preview (first 500 chars) for free, full for purchased/owned/subscriber
  const token = req.headers['x-auth-token'];
  const user = token && authTokens[token];
  const isOwner = user?.userId === template.authorId || user?.role === 'admin';
  const isSubscriber = user && ['starter', 'pro', 'enterprise'].includes(user.tier);
  const isFree = template.price === 0;

  res.json({
    ...template,
    content: (isOwner || isSubscriber || isFree) ? template.content : template.content.substring(0, 500) + '\n\n[... Subscribe or purchase to view full template ...]',
    fullAccess: isOwner || isSubscriber || isFree
  });
});

// ---- Create new template (sell on marketplace) ----
app.post('/api/marketplace/templates', requireAuth, (req, res) => {
  try {
    const template = createTemplate(req.user.userId || req.user.email, req.user.name, req.body);
    db.templates[template.id] = template;
    saveDB();
    res.json(template);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ---- Purchase template (creates checkout or grants for subscribers) ----
app.post('/api/marketplace/templates/:id/purchase', requireAuth, async (req, res) => {
  const template = db.templates[req.params.id];
  if (!template) return res.status(404).json({ error: 'Template not found' });

  const userTier = req.user.tier || 'free';
  const isSubscriber = ['starter', 'pro', 'enterprise'].includes(userTier);

  // Subscribers get platform templates free
  if (template.authorId === 'platform' && isSubscriber) {
    const purchase = recordPurchase(template, req.user.userId || req.user.email);
    purchase.method = 'subscription';
    purchase.price = 0;
    db.purchases.push({ type: 'template', templateId: template.id, userId: req.user.userId, method: 'subscription', at: new Date().toISOString() });
    saveDB();
    return res.json({ purchased: true, method: 'subscription', template });
  }

  // Free templates
  if (template.price === 0) {
    const purchase = recordPurchase(template, req.user.userId || req.user.email);
    db.purchases.push({ type: 'template', templateId: template.id, userId: req.user.userId, method: 'free', at: new Date().toISOString() });
    saveDB();
    return res.json({ purchased: true, method: 'free', template });
  }

  // Paid template — create Stripe checkout
  const result = await createTemplateCheckout(req.user.email, template);
  res.json({ purchased: false, ...result });
});

// ---- Use template (fill variables and create agreement) ----
app.post('/api/marketplace/templates/:id/use', requireAuth, (req, res) => {
  const template = db.templates[req.params.id];
  if (!template) return res.status(404).json({ error: 'Template not found' });

  const filledContent = fillTemplate(template, req.body.variables || {});
  const id = uuidv4();

  const agreement = {
    id,
    type: template.type,
    title: req.body.title || template.name,
    content: filledContent,
    contentHash: hashDocument(filledContent),
    details: `Created from template: ${template.name}`,
    parties: req.body.parties || [],
    jurisdiction: req.body.jurisdiction || template.jurisdiction,
    favorParty: 'balanced',
    status: 'draft',
    version: 1,
    versions: [{
      version: 1,
      content: filledContent,
      contentHash: hashDocument(filledContent),
      createdAt: new Date().toISOString(),
      createdBy: req.user.email
    }],
    signatures: [],
    fromTemplate: template.id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: req.user.email,
    verificationToken: generateVerificationToken(id)
  };

  db.agreements[id] = agreement;
  db.audit.push(createAuditEntry(id, 'CREATED_FROM_TEMPLATE', req.user.email, { templateId: template.id }));
  saveDB();

  res.json(agreement);
});

// ---- Review template ----
app.post('/api/marketplace/templates/:id/review', requireAuth, (req, res) => {
  const template = db.templates[req.params.id];
  if (!template) return res.status(404).json({ error: 'Template not found' });

  try {
    addReview(template, req.user.userId || req.user.email, req.body);
    saveDB();
    res.json({ ok: true, rating: template.rating, ratingCount: template.ratingCount });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ============================================================
//   DISCORD BOT INTERACTIONS
// ============================================================

// ---- Discord interactions endpoint (webhook) ----
app.post('/api/discord/interactions', express.raw({ type: 'application/json' }), async (req, res) => {
  const body = typeof req.body === 'string' ? req.body : req.body.toString();
  let interaction;
  try {
    interaction = JSON.parse(body);
  } catch {
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  // PING (Discord verification)
  if (interaction.type === 1) {
    return res.json({ type: 1 });
  }

  // SLASH COMMAND
  if (interaction.type === 2) {
    const response = await handleInteraction(interaction, {
      db,
      calculateSocialScore,
      generateAgreement,
      createAnchorRecord
    });
    return res.json(response);
  }

  res.json({ type: 4, data: { content: 'Interaction type not supported' } });
});

// ---- Register Discord commands (admin) ----
app.post('/api/discord/register-commands', requireAuth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  const ok = await registerCommands();
  res.json({ ok, commandCount: 7 });
});

// ============================================================
//   USER MANAGEMENT & API KEYS
// ============================================================

// ---- Get current user profile ----
app.get('/api/user/profile', requireAuth, (req, res) => {
  const user = db.registeredUsers[req.user.userId];
  if (!user) {
    // Legacy user
    return res.json({
      email: req.user.email,
      name: req.user.name,
      role: req.user.role,
      tier: req.user.tier || 'enterprise',
      legacy: true
    });
  }

  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    company: user.company,
    tier: user.tier,
    role: user.role,
    verified: user.verified,
    apiKey: user.apiKey,
    apiKeyActive: user.apiKeyActive,
    usage: user.usage,
    limits: TIERS[user.tier]?.limits || TIERS.free.limits,
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt
  });
});

// ---- Upgrade tier (internal, after Stripe confirms) ----
app.post('/api/user/upgrade', requireAuth, (req, res) => {
  const user = db.registeredUsers[req.user.userId];
  if (!user) return res.status(400).json({ error: 'Register for an account first' });

  const { tier } = req.body;
  if (!TIERS[tier]) return res.status(400).json({ error: 'Invalid tier' });

  user.tier = tier;
  user.apiKeyActive = ['pro', 'enterprise'].includes(tier);
  if (db.apiKeys[user.apiKey]) db.apiKeys[user.apiKey].active = user.apiKeyActive;
  authTokens[req.headers['x-auth-token']].tier = tier;
  saveDB();

  res.json({ ok: true, tier, limits: TIERS[tier].limits });
});

// ---- Regenerate API key ----
app.post('/api/user/api-key/regenerate', requireAuth, (req, res) => {
  const user = db.registeredUsers[req.user.userId];
  if (!user) return res.status(400).json({ error: 'Not a registered user' });

  // Delete old key
  if (db.apiKeys[user.apiKey]) delete db.apiKeys[user.apiKey];

  // Generate new key
  const crypto = require('crypto');
  user.apiKey = `am_${crypto.randomBytes(24).toString('hex')}`;
  db.apiKeys[user.apiKey] = { userId: user.id, active: user.apiKeyActive, createdAt: new Date().toISOString() };
  saveDB();

  res.json({ apiKey: user.apiKey, active: user.apiKeyActive });
});

// ---- List all users (admin) ----
app.get('/api/admin/users', requireAuth, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });

  const users = Object.values(db.registeredUsers).map(u => ({
    id: u.id,
    email: u.email,
    name: u.name,
    company: u.company,
    tier: u.tier,
    verified: u.verified,
    usage: u.usage,
    createdAt: u.createdAt,
    lastLoginAt: u.lastLoginAt
  }));

  res.json({ users, total: users.length });
});

// ============================================================
//   HEALTH
// ============================================================

app.get('/api/health', async (req, res) => {
  let escrowStatus = { configured: false };
  try {
    escrowStatus = await getContractStatus();
  } catch (e) { /* ignore */ }

  res.json({
    status: 'ok',
    platform: PLATFORM,
    apiConfigured: !!process.env.OPENAI_API_KEY,
    model: process.env.AI_MODEL || 'gpt-4o',
    agreements: Object.keys(db.agreements).length,
    registeredUsers: Object.keys(db.registeredUsers).length,
    templates: Object.keys(db.templates).length,
    escrowContract: escrowStatus,
    storyProtocol: { configured: !!process.env.STORY_RPC_URL, rpc: process.env.STORY_RPC_URL || 'https://odyssey.storyrpc.io' },
    stripe: { configured: !!process.env.STRIPE_SECRET_KEY },
    discord: { configured: !!process.env.DISCORD_BOT_TOKEN },
    uptime: process.uptime()
  });
});

// ============================================================
//   PUBLIC SIGNING PAGE
// ============================================================

app.get('/sign/:id', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'sign.html'));
});

// ---- Get agreement for signing (public, limited info) ----
app.get('/api/public/agreements/:id', (req, res) => {
  const agreement = db.agreements[req.params.id];
  if (!agreement) return res.status(404).json({ error: 'Agreement not found' });

  const token = req.query.token;
  if (token !== agreement.verificationToken) {
    return res.status(403).json({ error: 'Invalid token' });
  }

  // Return limited info for public signing
  res.json({
    id: agreement.id,
    title: agreement.title,
    type: agreement.type,
    content: agreement.content,
    parties: agreement.parties,
    status: agreement.status,
    signatures: agreement.signatures.map(s => ({ name: s.name, signedAt: s.signedAt })),
    jurisdiction: agreement.jurisdiction
  });
});

// ============================================================
//   CATCH-ALL
// ============================================================

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// ============================================================
//   START
// ============================================================

// Initialize services
initTransport();
initStripe();
registerCommands().catch(() => {});

app.listen(PORT, () => {
  console.log(`\n  ${PLATFORM} -- AI Agreement Platform`);
  console.log('  ' + '='.repeat(40));
  console.log(`  Running at:  http://localhost:${PORT}`);
  console.log(`  API Key:     ${process.env.OPENAI_API_KEY ? 'Configured' : 'Missing (set OPENAI_API_KEY in .env)'}`);
  console.log(`  Model:       ${process.env.AI_MODEL || 'gpt-4o'}`);
  console.log(`  Agreements:  ${Object.keys(db.agreements).length}`);
  console.log(`  Users:       ${Object.keys(db.registeredUsers).length}`);
  console.log(`  Templates:   ${Object.keys(db.templates).length}`);
  console.log(`  Disputes:    ${Object.keys(db.disputes || {}).length}`);
  console.log(`  Notify:      ${process.env.NOTIFY_ENABLED === 'true' ? 'ENABLED' : 'disabled (set NOTIFY_ENABLED=true)'}`);
  console.log(`  Story Proto: ${process.env.STORY_RPC_URL ? 'Configured' : 'Default (Odyssey)'}`);
  console.log(`  Stripe:      ${process.env.STRIPE_SECRET_KEY ? 'ENABLED' : 'disabled (set STRIPE_SECRET_KEY)'}`);
  console.log(`  Discord:     ${process.env.DISCORD_BOT_TOKEN ? 'ENABLED' : 'disabled (set DISCORD_BOT_TOKEN)'}`);
  console.log('');
});
