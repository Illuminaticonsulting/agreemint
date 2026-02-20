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
const { createAnchorRecord, prepareStoryRegistration, prepareEscrowTransaction, generateOnChainProof, ESCROW_ABI, STORY_CONTRACTS } = require('./blockchain-engine');

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
let db = { agreements: {}, sessions: {}, users: {}, audit: [] };

function loadDB() {
  try {
    if (fs.existsSync(DB_FILE)) {
      db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    }
  } catch (e) {
    console.error('DB load error:', e.message);
  }
}

function saveDB() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
  } catch (e) {
    console.error('DB save error:', e.message);
  }
}

loadDB();

// ---- Auth Middleware ----
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@agreemint.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin';
let authTokens = {};

function requireAuth(req, res, next) {
  const token = req.headers['x-auth-token'] || req.query.token;
  if (!token || !authTokens[token]) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  req.user = authTokens[token];
  next();
}

// ============================================================
//   AUTH ENDPOINTS
// ============================================================

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
    const token = uuidv4();
    authTokens[token] = { email, role: 'admin', loginAt: new Date().toISOString() };
    return res.json({ token, user: { email, role: 'admin' } });
  }
  res.status(401).json({ error: 'Invalid credentials' });
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
  const { type, title, details, parties, jurisdiction, favorParty, complexity, additionalClauses } = req.body;

  if (!type || !details) {
    return res.status(400).json({ error: 'Type and details are required' });
  }

  const id = uuidv4();

  try {
    // Generate agreement content via AI
    const content = await generateAgreement(type, details, {
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
app.post('/api/agreements/:id/send', requireAuth, (req, res) => {
  const agreement = db.agreements[req.params.id];
  if (!agreement) return res.status(404).json({ error: 'Agreement not found' });

  agreement.status = 'pending';
  agreement.updatedAt = new Date().toISOString();
  db.audit.push(createAuditEntry(agreement.id, 'SENT_FOR_SIGNATURE', req.user.email));
  saveDB();
  res.json({ ok: true, status: 'pending', signUrl: `/sign/${agreement.id}?token=${agreement.verificationToken}` });
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
  if (agreement.signatures.find(s => s.email === email)) {
    return res.status(400).json({ error: 'Already signed by this party' });
  }

  const ip = req.ip || req.connection.remoteAddress;
  const signature = signAgreement(agreement, { name, email, ip });
  agreement.signatures.push(signature);

  // Check if all parties have signed
  const allSigned = agreement.parties.length > 0 &&
    agreement.parties.every(p => agreement.signatures.some(s => s.email === p.email));

  if (allSigned) {
    agreement.status = 'signed';
  }

  agreement.updatedAt = new Date().toISOString();
  db.audit.push(createAuditEntry(agreement.id, 'SIGNED', email, { ip }));
  saveDB();

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

  const { type, partyB, arbiter, token, amount, metadata } = req.body;
  if (!partyB || !amount) return res.status(400).json({ error: 'partyB and amount required' });

  const anchor = createAnchorRecord(agreement);
  const escrowTx = prepareEscrowTransaction({
    type: type || 'Sale',
    partyB,
    arbiter: arbiter || req.body.arbiterAddress,
    token: token || '0x0000000000000000000000000000000000000000',
    amount,
    agreementHash: anchor.contentHash,
    agreementId: agreement.id,
    metadata: { ...metadata, title: agreement.title }
  });

  // Store escrow prep data
  if (!agreement.escrow) agreement.escrow = {};
  agreement.escrow.prepared = true;
  agreement.escrow.preparedAt = new Date().toISOString();
  agreement.escrow.amount = amount;
  agreement.escrow.type = type || 'Sale';
  agreement.updatedAt = new Date().toISOString();

  db.audit.push(createAuditEntry(agreement.id, 'ESCROW_PREPARED', req.user.email, { amount, type }));
  saveDB();

  res.json({ escrowTx, anchor, abi: ESCROW_ABI });
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
      contracts: STORY_CONTRACTS,
      explorer: 'https://explorer.story.foundation'
    },
    escrow: {
      rpcUrl: process.env.ESCROW_RPC_URL || 'https://mainnet.base.org',
      chainId: process.env.ESCROW_CHAIN_ID || '8453',
      contract: process.env.ESCROW_CONTRACT_ADDRESS || '',
      explorer: 'https://basescan.org'
    },
    abi: ESCROW_ABI
  });
});

// ---- Public verification page ----
app.get('/verify/:id', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'verify.html'));
});

// ============================================================
//   HEALTH
// ============================================================

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    platform: PLATFORM,
    apiConfigured: !!process.env.OPENAI_API_KEY,
    model: process.env.AI_MODEL || 'gpt-4o',
    agreements: Object.keys(db.agreements).length,
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

app.listen(PORT, () => {
  console.log(`\n  ${PLATFORM} -- AI Agreement Platform`);
  console.log('  ' + '='.repeat(40));
  console.log(`  Running at:  http://localhost:${PORT}`);
  console.log(`  API Key:     ${process.env.OPENAI_API_KEY ? 'Configured' : 'Missing (set OPENAI_API_KEY in .env)'}`);
  console.log(`  Model:       ${process.env.AI_MODEL || 'gpt-4o'}`);
  console.log(`  Agreements:  ${Object.keys(db.agreements).length}`);
  console.log('');
});
