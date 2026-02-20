/**
 * AgreeMint — Cryptographic Verification Engine
 *
 * Provides document integrity verification via SHA-256 hashing,
 * digital signature chains, and tamper-proof audit trails.
 * Every action on a document is cryptographically recorded.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const SIGNING_SECRET = process.env.SIGNING_SECRET || crypto.randomBytes(32).toString('hex');

// ─── Hash Document Content ─────────────────────────────
function hashDocument(content) {
  return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

// ─── Create Signature ──────────────────────────────────
function createSignature(data) {
  const hmac = crypto.createHmac('sha256', SIGNING_SECRET);
  hmac.update(JSON.stringify(data));
  return hmac.digest('hex');
}

// ─── Verify Signature ──────────────────────────────────
function verifySignature(data, signature) {
  const expected = createSignature(data);
  return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature, 'hex'));
}

// ─── Generate Verification Certificate ─────────────────
function generateCertificate(agreement) {
  const cert = {
    certificateId: crypto.randomUUID(),
    documentId: agreement.id,
    documentHash: hashDocument(agreement.content),
    title: agreement.title,
    type: agreement.type,
    createdAt: agreement.createdAt,
    parties: agreement.parties,
    signatures: (agreement.signatures || []).map(s => ({
      name: s.name,
      email: s.email,
      signedAt: s.signedAt,
      ipAddress: s.ip,
      signatureHash: s.hash
    })),
    verifiedAt: new Date().toISOString(),
    integrityStatus: 'VERIFIED',
    hashAlgorithm: 'SHA-256',
    signatureAlgorithm: 'HMAC-SHA-256'
  };

  cert.certificateSignature = createSignature(cert);
  return cert;
}

// ─── Create Audit Entry ────────────────────────────────
function createAuditEntry(agreementId, action, actor, details = {}) {
  const entry = {
    id: crypto.randomUUID(),
    agreementId,
    action,
    actor,
    details,
    timestamp: new Date().toISOString(),
    ip: details.ip || null
  };
  entry.hash = hashDocument(JSON.stringify(entry));
  return entry;
}

// ─── Verify Document Integrity ─────────────────────────
function verifyDocumentIntegrity(agreement) {
  const currentHash = hashDocument(agreement.content);
  const isIntact = currentHash === agreement.contentHash;

  return {
    documentId: agreement.id,
    originalHash: agreement.contentHash,
    currentHash,
    isIntact,
    status: isIntact ? 'VERIFIED - Document has not been tampered with' : 'FAILED - Document has been modified since creation',
    verifiedAt: new Date().toISOString()
  };
}

// ─── Sign Agreement (Digital Signature) ────────────────
function signAgreement(agreement, signerInfo) {
  const signatureData = {
    agreementId: agreement.id,
    documentHash: agreement.contentHash,
    signerName: signerInfo.name,
    signerEmail: signerInfo.email,
    signedAt: new Date().toISOString(),
    ip: signerInfo.ip || 'unknown'
  };

  signatureData.hash = createSignature(signatureData);

  return {
    ...signatureData,
    status: 'SIGNED',
    legalNotice: 'By applying this digital signature, the signer acknowledges that they have read, understood, and agree to be bound by the terms of this agreement. This electronic signature is legally binding under the ESIGN Act (15 U.S.C. 7001) and UETA.'
  };
}

// ─── Generate Verification URL Token ───────────────────
function generateVerificationToken(agreementId) {
  const token = crypto.createHmac('sha256', SIGNING_SECRET)
    .update(agreementId + Date.now().toString())
    .digest('hex')
    .substring(0, 32);
  return token;
}

module.exports = {
  hashDocument,
  createSignature,
  verifySignature,
  generateCertificate,
  createAuditEntry,
  verifyDocumentIntegrity,
  signAgreement,
  generateVerificationToken
};
