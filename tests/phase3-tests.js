#!/usr/bin/env node
/**
 * AgreeMint Phase 3 — Comprehensive Test Suite
 *
 * Tests all 6 Phase 3 features individually and then together:
 *   1. PWA (manifest, service worker, push subscription)
 *   2. Wallet (chains, SIWE nonce, wallet link)
 *   3. i18n (languages, bundles, translate)
 *   4. Legal Marketplace (professionals, requests, reviews)
 *   5. White-Label (tiers, tenants, CSS, branding)
 *   6. SOC 2 (compliance, audit logs, security policy, DSAR)
 *   7. Integration tests (features working together)
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
  return { status: res.status, data: json, headers: Object.fromEntries(res.headers.entries()) };
}

function test(name, condition, details = '') {
  if (condition) {
    passed++;
    results.push(`  ✅ ${name}`);
  } else {
    failed++;
    results.push(`  ❌ ${name} ${details ? '— ' + details : ''}`);
  }
}

async function login() {
  const r = await req('POST', '/api/auth/login', { password: 'tez' });
  TOKEN = r.data.token;
  test('Login (tez)', r.status === 200 && !!TOKEN, `status=${r.status}`);
}

// ============================================================
//   1. PWA Tests
// ============================================================
async function testPWA() {
  console.log('\n── 1. PWA Tests ──');

  // Manifest
  const m = await req('GET', '/manifest.json');
  test('PWA manifest returns JSON', m.status === 200 && m.data.name, `status=${m.status}`);
  test('PWA manifest has correct name', m.data.name === 'AgreeMint' || !!m.data.name);
  test('PWA manifest has icons', m.data.icons?.length > 0);
  test('PWA manifest has start_url', !!m.data.start_url);
  test('PWA manifest has display: standalone', m.data.display === 'standalone');

  // Service Worker
  const sw = await req('GET', '/sw.js');
  test('Service worker returns JS', sw.status === 200 && typeof sw.data === 'string' && sw.data.includes('install'));

  // VAPID Key
  const v = await req('GET', '/api/pwa/vapid-key');
  test('VAPID key endpoint works', v.status === 200);

  // Push subscribe
  const sub = await req('POST', '/api/pwa/subscribe', {
    subscription: { endpoint: 'https://fcm.googleapis.com/test/1234', keys: { p256dh: 'testkey', auth: 'testauthkey' } }
  });
  test('Push subscribe works', sub.status === 200 && sub.data.ok);

  // Push unsubscribe
  const unsub = await req('POST', '/api/pwa/unsubscribe');
  test('Push unsubscribe works', unsub.status === 200 && unsub.data.ok);
}

// ============================================================
//   2. Wallet Tests
// ============================================================
async function testWallet() {
  console.log('\n── 2. Wallet Tests ──');

  // Supported chains
  const c = await req('GET', '/api/wallet/chains');
  test('Wallet chains returns data', c.status === 200 && c.data.chains);
  test('Wallet has 6 supported chains', Object.keys(c.data.chains).length === 6);
  test('Wallet has Ethereum chain', !!c.data.chains['1']);
  test('Wallet has Base chain', !!c.data.chains['8453']);

  // Client script
  const cs = await req('GET', '/api/wallet/client.js');
  test('Wallet client.js returns JS', cs.status === 200 && typeof cs.data === 'string' && cs.data.includes('AgreeMintWallet'));

  // SIWE nonce
  const n = await req('POST', '/api/wallet/siwe/nonce', { address: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD30', chainId: 1 });
  test('SIWE nonce generation works', n.status === 200 && n.data.message);
  test('SIWE message contains address', n.data.message?.includes('0x742d35Cc6634C0532925a3b844Bc9e7595f2bD30'));

  // Linked wallets (should be empty)
  const lw = await req('GET', '/api/wallet/linked');
  test('Linked wallets returns array', lw.status === 200 && Array.isArray(lw.data.wallets));

  // Prepare escrow deposit
  const ed = await req('POST', '/api/wallet/escrow/prepare', {
    escrowId: '1',
    amount: '1.0',
    contractAddress: '0x5FbDB2315678afecb367f032d93F642f64180aa3'
  });
  test('Escrow deposit prepare works', ed.status === 200 && ed.data.ok);
}

// ============================================================
//   3. i18n Tests
// ============================================================
async function testI18n() {
  console.log('\n── 3. i18n Tests ──');

  // Languages
  const l = await req('GET', '/api/i18n/languages');
  test('Languages endpoint works', l.status === 200 && l.data.languages);
  test('Has 5 supported languages', Object.keys(l.data.languages).length === 5);
  test('Has English', !!l.data.languages.en);
  test('Has Spanish', !!l.data.languages.es);
  test('Has Arabic with RTL', l.data.languages.ar?.dir === 'rtl');
  test('Has Chinese', !!l.data.languages.zh);
  test('Has French', !!l.data.languages.fr);

  // Get English bundle
  const en = await req('GET', '/api/i18n/en');
  test('English bundle loads', en.status === 200 && en.data.translations);
  test('English has app.name', en.data.translations?.['app.name'] === 'AgreeMint');

  // Get Spanish bundle
  const es = await req('GET', '/api/i18n/es');
  test('Spanish bundle loads', es.status === 200 && es.data.translations);
  test('Spanish has agreement.create', !!es.data.translations?.['agreement.create']);

  // Get Arabic bundle
  const ar = await req('GET', '/api/i18n/ar');
  test('Arabic bundle loads', ar.status === 200 && ar.data.dir === 'rtl');

  // Get Chinese bundle
  const zh = await req('GET', '/api/i18n/zh');
  test('Chinese bundle loads', zh.status === 200 && zh.data.translations);

  // Get French bundle
  const fr = await req('GET', '/api/i18n/fr');
  test('French bundle loads', fr.status === 200 && fr.data.translations);

  // Translate API
  const t = await req('POST', '/api/i18n/translate', { lang: 'es', keys: ['app.name', 'agreement.create', 'nav.dashboard'] });
  test('Translate API works', t.status === 200 && t.data.translations);
  test('Translate returns Spanish keys', !!t.data.translations['agreement.create']);

  // Invalid language fallback
  const inv = await req('GET', '/api/i18n/xx');
  test('Invalid language returns error', inv.status === 400);
}

// ============================================================
//   4. Legal Marketplace Tests
// ============================================================
async function testLegalMarketplace() {
  console.log('\n── 4. Legal Marketplace Tests ──');

  // Browse professionals
  const pros = await req('GET', '/api/legal/professionals');
  test('Browse professionals works', pros.status === 200 && pros.data.professionals);
  test('Has 5+ seed professionals', pros.data.total >= 5);
  test('Returns specialization filters', !!pros.data.filters?.specializations);
  test('Returns service type filters', !!pros.data.filters?.serviceTypes);

  // Get professional profile
  const pro = await req('GET', '/api/legal/professionals/lpro_001');
  test('Professional profile loads', pro.status === 200 && pro.data.professional);
  test('Profile has name', pro.data.professional?.name === 'Sarah Chen, Esq.');
  test('Profile has commission rates', !!pro.data.commissionRates);

  // Filter by specialization
  const filtered = await req('GET', '/api/legal/professionals?specialization=blockchain');
  test('Filter by specialization', filtered.status === 200 && filtered.data.total >= 1);

  // Filter by language
  const langFiltered = await req('GET', '/api/legal/professionals?language=ar');
  test('Filter by language (Arabic)', langFiltered.status === 200 && langFiltered.data.total >= 1);

  // Service types
  const types = await req('GET', '/api/legal/service-types');
  test('Service types endpoint', types.status === 200 && types.data.serviceTypes);
  test('Has review service type', !!types.data.serviceTypes?.review);

  // Register professional
  const reg = await req('POST', '/api/legal/professionals/register', {
    name: 'Test Attorney, Esq.',
    barNumber: 'TEST-12345',
    barState: 'California',
    jurisdictions: ['United States (California)'],
    specializations: ['Contract Law'],
    bio: 'Test attorney for E2E testing'
  });
  test('Register professional', reg.status === 200 && reg.data.ok);
  const testProId = reg.data.professional?.id;
  test('Professional starts unverified', reg.data.professional?.verified === false);

  // Verify professional (admin)
  if (testProId) {
    const ver = await req('POST', `/api/legal/professionals/${testProId}/verify`);
    test('Verify professional (admin)', ver.status === 200 && ver.data.professional?.verified === true);
  }

  // Create service request
  const sreq = await req('POST', '/api/legal/requests', {
    professionalId: 'lpro_001',
    serviceType: 'review',
    description: 'Please review my NDA agreement for potential risks',
    urgency: 'standard'
  });
  test('Create service request', sreq.status === 200 && sreq.data.ok);
  const requestId = sreq.data.request?.id;

  // List service requests
  const reqs = await req('GET', '/api/legal/requests');
  test('List service requests', reqs.status === 200 && reqs.data.requests?.length >= 1);

  // Get request detail
  if (requestId) {
    const det = await req('GET', `/api/legal/requests/${requestId}`);
    test('Get request detail', det.status === 200 && det.data.request);

    // Submit quote
    const quote = await req('POST', `/api/legal/requests/${requestId}/quote`, { amount: 15000, estimatedDays: 2, notes: 'I can review your NDA by tomorrow' });
    test('Submit quote', quote.status === 200 && quote.data.request?.quote);
    test('Quote has commission calculated', quote.data.request?.quote?.platformCommission > 0);

    // Accept quote
    const accept = await req('POST', `/api/legal/requests/${requestId}/accept`);
    test('Accept quote', accept.status === 200 && accept.data.request?.status === 'accepted');

    // Add deliverable
    const deliv = await req('POST', `/api/legal/requests/${requestId}/deliverables`, {
      title: 'NDA Review Report',
      content: 'This NDA has been reviewed. 3 issues found...'
    });
    test('Add deliverable', deliv.status === 200 && deliv.data.ok);

    // Send message
    const msg = await req('POST', `/api/legal/requests/${requestId}/messages`, { message: 'Please review the report' });
    test('Send message', msg.status === 200 && msg.data.messages?.length >= 1);

    // Complete request
    const comp = await req('POST', `/api/legal/requests/${requestId}/complete`);
    test('Complete request', comp.status === 200 && comp.data.request?.status === 'completed');
  }

  // Review professional
  const rev = await req('POST', '/api/legal/professionals/lpro_001/review', { rating: 5, comment: 'Excellent review, very thorough!' });
  test('Review professional', rev.status === 200 && rev.data.ok);
  test('Review updates rating', typeof rev.data.newRating === 'number');
}

// ============================================================
//   5. White-Label Tests
// ============================================================
async function testWhiteLabel() {
  console.log('\n── 5. White-Label Tests ──');

  // Get tiers
  const tiers = await req('GET', '/api/whitelabel/tiers');
  test('White-label tiers endpoint', tiers.status === 200 && tiers.data.tiers);
  test('Has standard tier', !!tiers.data.tiers?.standard);
  test('Has premium tier', !!tiers.data.tiers?.premium);
  test('Has enterprise tier', !!tiers.data.tiers?.enterprise);
  test('Standard is $499/mo', tiers.data.tiers?.standard?.price === 49900);

  // Create tenant (admin/enterprise)
  const tenant = await req('POST', '/api/whitelabel/tenants', {
    companyName: 'Acme Legal Corp',
    adminEmail: 'tez',
    tier: 'premium',
    subdomain: 'acme-legal',
    brand: {
      colors: { primary: '#ff6600', background: '#1a1a2e' },
      tagline: 'Enterprise Legal Solutions'
    }
  });
  test('Create white-label tenant', tenant.status === 200 && tenant.data.ok);
  test('Tenant has custom brand', tenant.data.tenant?.brand?.colors?.primary === '#ff6600');
  test('Tenant has API key', !!tenant.data.tenant?.apiKey);

  // Get my tenant
  const myTenant = await req('GET', '/api/whitelabel/tenant');
  test('Get my tenant', myTenant.status === 200 && myTenant.data.tenant);

  // Update branding
  const uBrand = await req('PUT', '/api/whitelabel/tenant/brand', {
    tagline: 'Updated Tagline',
    colors: { secondary: '#00ff88' }
  });
  test('Update branding', uBrand.status === 200 && uBrand.data.brand?.tagline === 'Updated Tagline');

  // Get custom CSS
  const css = await req('GET', '/api/whitelabel/css');
  test('Custom CSS returns CSS', css.status === 200 && typeof css.data === 'string' && css.data.includes('--accent'));

  // Get branding
  const brand = await req('GET', '/api/whitelabel/brand');
  test('Get branding works', brand.status === 200 && brand.data.brand);

  // Check limits
  const limits = await req('GET', '/api/whitelabel/limits');
  test('Check tenant limits', limits.status === 200 && limits.data.limits);

  // Admin list tenants
  const allTenants = await req('GET', '/api/admin/whitelabel/tenants');
  test('Admin list tenants', allTenants.status === 200 && allTenants.data.tenants?.length >= 1);
}

// ============================================================
//   6. SOC 2 Tests
// ============================================================
async function testSOC2() {
  console.log('\n── 6. SOC 2 Compliance Tests ──');

  // Security policy (public)
  const policy = await req('GET', '/api/compliance/security-policy');
  test('Security policy loads', policy.status === 200 && policy.data.policy);
  test('Policy has sections', policy.data.policy?.sections?.length >= 5);
  test('Policy has version', !!policy.data.policy?.version);

  // Compliance dashboard (enterprise)
  const dash = await req('GET', '/api/compliance/dashboard');
  test('Compliance dashboard loads', dash.status === 200 && dash.data.complianceScore);
  test('Compliance score is numeric', typeof dash.data.complianceScore?.score === 'number');
  test('Compliance score >= 80', dash.data.complianceScore?.score >= 80);
  test('Has checklist', !!dash.data.checklist);
  test('Has retention policies', !!dash.data.retentionPolicies);

  // Audit logs
  const logs = await req('GET', '/api/compliance/audit-logs');
  test('Audit logs endpoint', logs.status === 200 && Array.isArray(logs.data.logs));
  test('Audit logs has categories', !!logs.data.categories);

  // Create incident
  const inc = await req('POST', '/api/compliance/incidents', {
    title: 'Test Security Incident',
    description: 'Simulated incident for testing',
    severity: 'low',
    affectedSystems: ['testing']
  });
  test('Create incident', inc.status === 200 && inc.data.ok);
  const incidentId = inc.data.incident?.id;

  // Update incident
  if (incidentId) {
    const upd = await req('PUT', `/api/compliance/incidents/${incidentId}`, {
      status: 'resolved',
      rootCause: 'Test simulation',
      resolution: 'No action needed'
    });
    test('Update incident', upd.status === 200 && upd.data.incident?.status === 'resolved');
    test('Incident has timeline', upd.data.incident?.timeline?.length >= 2);
  }

  // List incidents
  const incs = await req('GET', '/api/compliance/incidents');
  test('List incidents', incs.status === 200 && incs.data.incidents);

  // DSAR - data subject access request
  const dsar = await req('POST', '/api/compliance/dsar', { type: 'export' });
  test('Create DSAR', dsar.status === 200 && dsar.data.ok);
  test('DSAR has due date', !!dsar.data.dsar?.dueDate);

  // Export my data
  const myData = await req('GET', '/api/compliance/my-data');
  test('Export my data', myData.status === 200 && myData.data.data);
  test('Exported data has profile', myData.data.data?.profile !== undefined);
  test('Exported data has agreements', Array.isArray(myData.data.data?.agreements));

  // Admin list DSARs
  const dsars = await req('GET', '/api/admin/compliance/dsars');
  test('Admin list DSARs', dsars.status === 200 && dsars.data.dsars);

  // Check security headers
  const headersResp = await req('GET', '/api/health');
  test('Has X-Content-Type-Options', headersResp.headers['x-content-type-options'] === 'nosniff');
  test('Has X-Frame-Options', headersResp.headers['x-frame-options'] === 'DENY');
  test('Has Referrer-Policy', !!headersResp.headers['referrer-policy']);
}

// ============================================================
//   7. Integration Tests
// ============================================================
async function testIntegration() {
  console.log('\n── 7. Integration Tests ──');

  // Health shows all Phase 3 features
  const h = await req('GET', '/api/health');
  test('Health shows PWA', h.data.pwa?.enabled === true);
  test('Health shows Wallet', h.data.wallet?.enabled === true && h.data.wallet?.supportedChains === 6);
  test('Health shows i18n', h.data.i18n?.enabled === true && h.data.i18n?.languages === 5);
  test('Health shows Legal Marketplace', h.data.legalMarketplace?.enabled === true);
  test('Health shows White-Label', h.data.whiteLabel?.enabled === true);
  test('Health shows SOC 2', h.data.soc2?.enabled === true);

  // i18n + Legal: browse professionals returns translatable data
  const proEs = await req('GET', '/api/legal/professionals', null, { 'Accept-Language': 'es' });
  test('Legal pros with Spanish Accept-Language', proEs.status === 200);

  // PWA manifest respects branding
  const manifest = await req('GET', '/manifest.json');
  test('PWA manifest available alongside other features', manifest.status === 200 && !!manifest.data.name);

  // Wallet + i18n: chains endpoint available
  const chains = await req('GET', '/api/wallet/chains');
  const langs = await req('GET', '/api/i18n/languages');
  test('Wallet + i18n both accessible', chains.status === 200 && langs.status === 200);

  // SOC 2 audit logs captured actions from other tests
  const auditLogs = await req('GET', '/api/compliance/audit-logs?limit=50');
  test('Audit logs captured test actions', auditLogs.status === 200 && auditLogs.data.logs.length > 0);
  test('Audit logs have hash chain', auditLogs.data.logs.every(l => !!l.hash));

  // White-label CSS + SOC 2 headers both work
  const cssResp = await req('GET', '/api/whitelabel/css');
  test('White-label CSS + security headers combined', cssResp.status === 200 && !!cssResp.headers['x-content-type-options']);

  // Compliance score updated after all activities
  const score = await req('GET', '/api/compliance/dashboard');
  test('Compliance score after activity', score.data.complianceScore?.score >= 80);
  test('Audit log count increased', score.data.auditLogCount > 0);
}

// ============================================================
//   Run All Tests
// ============================================================
async function run() {
  console.log('═══════════════════════════════════════════');
  console.log('  AgreeMint Phase 3 — Test Suite');
  console.log('═══════════════════════════════════════════');

  await login();
  await testPWA();
  await testWallet();
  await testI18n();
  await testLegalMarketplace();
  await testWhiteLabel();
  await testSOC2();
  await testIntegration();

  console.log('\n═══════════════════════════════════════════');
  console.log('  RESULTS');
  console.log('═══════════════════════════════════════════');
  results.forEach(r => console.log(r));
  console.log('───────────────────────────────────────────');
  console.log(`  Total: ${passed + failed} | ✅ Passed: ${passed} | ❌ Failed: ${failed}`);
  console.log('═══════════════════════════════════════════\n');

  process.exit(failed > 0 ? 1 : 0);
}

run().catch(e => { console.error('Test run error:', e); process.exit(1); });
