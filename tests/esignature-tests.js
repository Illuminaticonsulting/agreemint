#!/usr/bin/env node
/**
 * AgreeMint E-Signature — Comprehensive Test Suite
 *
 * Tests all e-signature features:
 *   1. E-Sign Engine (OTP, workflow, signature records, decline)
 *   2. E-Sign Config endpoint
 *   3. OTP send & verify flow
 *   4. Enhanced sign with signature methods (draw, type, upload)
 *   5. Decline to sign flow
 *   6. Signing workflow (sequential/parallel)
 *   7. Signing reminders
 *   8. Pending signers endpoint
 */

const BASE = process.env.BASE_URL || 'http://localhost:3500';
let TOKEN = '';
let passed = 0;
let failed = 0;
const results = [];

async function req(method, path, body, headers = {}) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json', ...headers }
  };
  if (TOKEN) opts.headers['x-auth-token'] = TOKEN;
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`${BASE}${path}`, opts);
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = text; }
  return { status: res.status, data: json };
}

function test(name, condition, details = '') {
  if (condition) {
    passed++;
    results.push(`  ✅ ${name}`);
  } else {
    failed++;
    results.push(`  ❌ ${name}${details ? ' — ' + details : ''}`);
  }
}

// ─── Unit Tests: E-Signature Engine ─────────────────────

function unitTests() {
  console.log('\n── Unit Tests: E-Signature Engine ──\n');

  const esign = require('../src/esignature-engine');

  // Test 1: OTP generation
  const otp = esign.generateOTP();
  test('OTP is 6 digits', /^\d{6}$/.test(otp), `Got: ${otp}`);

  // Test 2: Signer verification creation
  const verification = esign.createSignerVerification('test@example.com');
  test('Signer verification created', verification.email === 'test@example.com' && verification.otp && !verification.verified);

  // Test 3: OTP verification — correct
  const result1 = esign.verifyOTP(verification, verification.otp);
  test('OTP correct → verified', result1.valid === true);

  // Test 4: OTP verification — already verified
  const result2 = esign.verifyOTP(verification, verification.otp);
  test('OTP already verified', result2.valid === true && result2.reason === 'Already verified');

  // Test 5: OTP verification — wrong code
  const v2 = esign.createSignerVerification('test2@example.com');
  const result3 = esign.verifyOTP(v2, '000000');
  test('OTP wrong code rejected', result3.valid === false);

  // Test 6: OTP verification — expired
  const v3 = esign.createSignerVerification('test3@example.com');
  v3.expiresAt = new Date(Date.now() - 1000).toISOString();
  const result4 = esign.verifyOTP(v3, v3.otp);
  test('OTP expired rejected', result4.valid === false && result4.reason.includes('expired'));

  // Test 7: Signing workflow creation — parallel
  const mockAgreement = {
    id: 'test-1',
    parties: [
      { name: 'Alice', email: 'alice@test.com', role: 'Seller' },
      { name: 'Bob', email: 'bob@test.com', role: 'Buyer' }
    ]
  };
  const wfParallel = esign.createSigningWorkflow(mockAgreement, 'parallel');
  test('Parallel workflow created', wfParallel.mode === 'parallel' && wfParallel.steps.length === 2);

  // Test 8: Parallel — everyone can sign
  test('Parallel: all can sign at once',
    esign.isSignersTurn(wfParallel, 'alice@test.com') && esign.isSignersTurn(wfParallel, 'bob@test.com'));

  // Test 9: Sequential workflow creation
  const wfSeq = esign.createSigningWorkflow(mockAgreement, 'sequential', [0, 1]);
  test('Sequential workflow created', wfSeq.mode === 'sequential' && wfSeq.currentStep === 0);

  // Test 10: Sequential — correct turn order
  test('Sequential: first signer can sign', esign.isSignersTurn(wfSeq, 'alice@test.com'));
  test('Sequential: second signer cannot yet', !esign.isSignersTurn(wfSeq, 'bob@test.com'));

  // Test 11: Advance workflow
  wfSeq.steps[0].status = 'signed';
  esign.advanceWorkflow(wfSeq);
  test('Sequential: workflow advanced to step 2', wfSeq.currentStep === 1);
  test('Sequential: second signer now can sign', wfSeq.steps[1].canSign === true);

  // Test 12: Decline to sign
  const wfDecline = esign.createSigningWorkflow(mockAgreement, 'parallel');
  const declineResult = esign.declineToSign(mockAgreement, wfDecline, 'bob@test.com', 'Changed my mind');
  test('Decline recorded', declineResult.declined === true && declineResult.reason === 'Changed my mind');

  // Test 13: Decline — already declined throws
  let declineErr = false;
  try { esign.declineToSign(mockAgreement, wfDecline, 'bob@test.com', 'Again'); } catch (e) { declineErr = true; }
  test('Double decline throws error', declineErr);

  // Test 14: Create signature record
  const sigRecord = esign.createSignatureRecord(mockAgreement, {
    name: 'Alice', email: 'alice@test.com', ip: '127.0.0.1',
    userAgent: 'TestAgent/1.0', method: 'draw',
    signatureImage: 'data:image/png;base64,abc123',
    consentToERecords: true
  });
  test('Signature record created', sigRecord.status === 'SIGNED' && sigRecord.method === 'draw' && sigRecord.signatureImage === 'data:image/png;base64,abc123');
  test('Signature record has hash', sigRecord.hash && sigRecord.hash.length === 64);
  test('Consent recorded', sigRecord.consentToERecords === true && sigRecord.consentTimestamp);

  // Test 15: Signing audit entry
  const auditEntry = esign.createSigningAuditEntry('agreement_signed', { agreementId: 'test-1', email: 'alice@test.com' });
  test('Audit entry created', auditEntry.action === 'agreement_signed' && auditEntry.entryHash);

  // Test 16: Reminder creation
  const wfReminder = esign.createSigningWorkflow(mockAgreement, 'parallel');
  const reminder = esign.createReminder(wfReminder, 'alice@test.com');
  test('Reminder created', reminder && reminder.email === 'alice@test.com');

  // Test 17: Reminder for signed party returns null
  wfReminder.steps[0].status = 'signed';
  const noReminder = esign.createReminder(wfReminder, 'alice@test.com');
  test('No reminder for signed party', noReminder === null);

  // Test 18: Pending signers
  const wfPend = esign.createSigningWorkflow(mockAgreement, 'parallel');
  wfPend.steps[0].status = 'signed';
  const pending = esign.getPendingSigners(wfPend);
  test('Pending signers correct', pending.length === 1 && pending[0].email === 'bob@test.com');

  // Test 19: Signature methods constant
  test('Signature methods defined', Object.keys(esign.SIGNATURE_METHODS).length >= 5);

  // Test 20: Signature fonts available
  test('Signature fonts available', esign.SIGNATURE_FONTS.length >= 6);

  // Test 21: Next signer — parallel
  const nextPar = esign.getNextSigner(wfPend);
  test('Next signer (parallel) returns pending', nextPar.length === 1);

  // Test 22: Workflow modes
  test('Workflow modes defined', Object.keys(esign.WORKFLOW_MODES).length >= 3);
}

// ─── Integration Tests: API Endpoints ───────────────────

async function integrationTests() {
  console.log('\n── Integration Tests: E-Signature API ──\n');

  // Login first (legacy: password-only)
  const login = await req('POST', '/api/auth/login', { password: 'tez' });
  test('Auth login', login.status === 200 && login.data.token, `Status: ${login.status}`);
  TOKEN = login.data.token;

  // Test 23: E-Sign config endpoint
  const config = await req('GET', '/api/esign/config');
  test('E-Sign config returns methods', config.status === 200 && config.data.methods && config.data.fonts);
  test('E-Sign config has features', config.data.features?.drawSignature && config.data.features?.otpVerification);

  // Test 24: Create agreement for signing tests
  const createRes = await req('POST', '/api/agreements', {
    title: 'E-Sign Test Agreement',
    type: 'nda',
    content: 'This is a test NDA for e-signature testing.',
    parties: [
      { name: 'Alice Sender', email: 'alice@test.com', role: 'Discloser' },
      { name: 'Bob Signer', email: 'bob@test.com', role: 'Recipient' }
    ],
    jurisdiction: 'US - Delaware'
  });
  test('Create test agreement', (createRes.status === 200 || createRes.status === 201) && createRes.data.id);
  const agId = createRes.data.id;
  const agToken = createRes.data.verificationToken;

  // Test 25: Send for signature
  const sendRes = await req('POST', `/api/agreements/${agId}/send`);
  test('Send for signature', sendRes.status === 200 && sendRes.data.signUrl);

  // Test 26: Configure signing workflow (sequential)
  const wfRes = await req('POST', `/api/agreements/${agId}/workflow`, { mode: 'sequential', order: [0, 1] });
  test('Create sequential workflow', wfRes.status === 200 && wfRes.data.workflow?.mode === 'sequential');

  // Test 27: Get signing workflow
  const getWf = await req('GET', `/api/agreements/${agId}/workflow`);
  test('Get workflow', getWf.status === 200 && getWf.data.workflow?.mode === 'sequential');

  // Test 28: Send OTP
  const otpRes = await req('POST', '/api/esign/send-otp', {
    agreementId: agId, email: 'alice@test.com', token: agToken
  });
  test('Send OTP', otpRes.status === 200 && otpRes.data.ok);

  // Test 29: Verify OTP with wrong code
  const badOtp = await req('POST', '/api/esign/verify-otp', {
    agreementId: agId, email: 'alice@test.com', otp: '000000', token: agToken
  });
  test('Wrong OTP rejected', badOtp.status === 400);

  // Test 30: Sign with draw method (Alice, first in order)
  const signDrawRes = await req('POST', `/api/agreements/${agId}/sign`, {
    token: agToken,
    name: 'Alice Sender',
    email: 'alice@test.com',
    method: 'draw',
    signatureImage: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
    consentToERecords: true
  });
  test('Sign with draw method', signDrawRes.status === 200 && signDrawRes.data.signature?.method === 'draw');
  test('Signature has image', !!signDrawRes.data.signature?.signatureImage);
  test('Consent recorded in signature', signDrawRes.data.signature?.consentToERecords === true);

  // Test 31: Duplicate sign rejected
  const dupSign = await req('POST', `/api/agreements/${agId}/sign`, {
    token: agToken, name: 'Alice Sender', email: 'alice@test.com', method: 'click'
  });
  test('Duplicate sign rejected', dupSign.status === 400 && dupSign.data.error?.includes('Already signed'));

  // Test 32: Sign with type method (Bob, second in order)
  const signTypeRes = await req('POST', `/api/agreements/${agId}/sign`, {
    token: agToken,
    name: 'Bob Signer',
    email: 'bob@test.com',
    method: 'type',
    typedText: 'Bob Signer',
    fontId: 'dancing',
    signatureImage: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
    consentToERecords: true
  });
  test('Sign with type method', signTypeRes.status === 200 && signTypeRes.data.signature?.method === 'type');
  test('All parties signed', signTypeRes.data.allSigned === true);

  // Test 33: Pending signers (should be empty now)
  const pendRes = await req('GET', `/api/agreements/${agId}/pending-signers`);
  test('Pending signers empty after all signed', pendRes.status === 200 && pendRes.data.pending?.length === 0);
  test('Signed count correct', pendRes.data.signed === 2);

  // ── Decline Flow Tests ──

  // Create another agreement for decline test
  const ag2 = await req('POST', '/api/agreements', {
    title: 'Decline Test Agreement',
    type: 'service-agreement',
    content: 'Agreement that will be declined.',
    parties: [
      { name: 'Charlie', email: 'charlie@test.com', role: 'Provider' },
      { name: 'Diana', email: 'diana@test.com', role: 'Client' }
    ],
    jurisdiction: 'US - California'
  });
  const ag2Id = ag2.data.id;
  const ag2Token = ag2.data.verificationToken;

  await req('POST', `/api/agreements/${ag2Id}/send`);

  // Test 34: Decline to sign
  const declineRes = await req('POST', `/api/agreements/${ag2Id}/decline`, {
    token: ag2Token,
    email: 'diana@test.com',
    name: 'Diana',
    reason: 'Terms are unfavorable'
  });
  test('Decline to sign works', declineRes.status === 200 && declineRes.data.declined === true);

  // Test 35: Pending signers shows decline
  const pend2 = await req('GET', `/api/agreements/${ag2Id}/pending-signers`);
  test('Declined shown in pending', pend2.data.declined?.length === 1 && pend2.data.declined[0].reason === 'Terms are unfavorable');

  // ── Reminder Tests ──

  // Create agreement for reminder test
  const ag3 = await req('POST', '/api/agreements', {
    title: 'Reminder Test Agreement',
    type: 'nda',
    content: 'Agreement for reminder testing.',
    parties: [
      { name: 'Eve', email: 'eve@test.com' },
      { name: 'Frank', email: 'frank@test.com' }
    ],
    jurisdiction: 'US - New York'
  });
  const ag3Id = ag3.data.id;
  await req('POST', `/api/agreements/${ag3Id}/send`);

  // Test 36: Send signing reminder
  const remindRes = await req('POST', `/api/agreements/${ag3Id}/remind`, { email: 'frank@test.com' });
  test('Signing reminder sent', remindRes.status === 200 && remindRes.data.ok);

  // Test 37: Reminder for non-party rejected
  const remindBad = await req('POST', `/api/agreements/${ag3Id}/remind`, { email: 'unknown@test.com' });
  test('Reminder for non-party rejected', remindBad.status === 400);

  // Test 38: OTP with bad token rejected
  const otpBadToken = await req('POST', '/api/esign/send-otp', {
    agreementId: agId, email: 'alice@test.com', token: 'bad-token'
  });
  test('OTP with bad token rejected', otpBadToken.status === 403);

  // Test 39: Decline with bad token rejected
  const declineBad = await req('POST', `/api/agreements/${ag2Id}/decline`, {
    token: 'bad-token', email: 'charlie@test.com', name: 'Charlie'
  });
  test('Decline with bad token rejected', declineBad.status === 403);

  // Test 40: Health endpoint includes e-signature
  const health = await req('GET', '/api/health');
  test('Health has e-signature', health.data.eSignature?.enabled === true);
  test('Health shows signature methods count', health.data.eSignature?.methods >= 5);
}

// ─── Run All Tests ──────────────────────────────────────

async function main() {
  console.log('═══════════════════════════════════════════════');
  console.log('  AgreeMint E-Signature Test Suite');
  console.log('═══════════════════════════════════════════════');

  // Unit tests (no server needed)
  unitTests();

  // Integration tests (need server running)
  try {
    await integrationTests();
  } catch (err) {
    console.error('\n  ⚠️  Integration test error:', err.message);
    console.error('  Make sure the server is running on', BASE);
  }

  // Results
  console.log('\n═══════════════════════════════════════════════');
  console.log('  RESULTS');
  console.log('═══════════════════════════════════════════════');
  results.forEach(r => console.log(r));
  console.log(`\n  Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
  console.log('═══════════════════════════════════════════════\n');

  process.exit(failed > 0 ? 1 : 0);
}

main();
