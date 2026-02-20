/**
 * AgreeMint — White-Label Engine
 *
 * Allows enterprise customers to reskin AgreeMint with their own branding.
 *
 * Pricing:
 *   - Standard:   $499/mo — custom colors, logo, name, email domain
 *   - Premium:    $999/mo — above + custom domain, custom templates, API access
 *   - Enterprise: $2499/mo — above + dedicated support, custom integrations, SLA
 *
 * Features:
 *   1. Tenant configuration (brand colors, logos, typography, company name)
 *   2. Custom domain mapping (CNAME)
 *   3. Branded PDF output (logo, watermark, footer)
 *   4. Custom CSS generation
 *   5. Branded email templates
 *   6. Isolated data (tenant-scoped queries)
 *   7. Subdomain routing
 */

const { v4: uuidv4 } = require('uuid');

// ─── Tier Definitions ──────────────────────────────────
const WHITELABEL_TIERS = {
  standard: {
    name: 'Standard White-Label',
    price: 49900,       // $499/mo
    features: ['custom_colors', 'custom_logo', 'custom_name', 'branded_emails', 'remove_agreemint_branding'],
    maxUsers: 50,
    maxAgreements: 500,
    support: 'email',
    apiAccess: false,
    customDomain: false
  },
  premium: {
    name: 'Premium White-Label',
    price: 99900,       // $999/mo
    features: ['custom_colors', 'custom_logo', 'custom_name', 'branded_emails', 'remove_agreemint_branding', 'custom_domain', 'custom_templates', 'api_access', 'priority_support'],
    maxUsers: 250,
    maxAgreements: 5000,
    support: 'priority',
    apiAccess: true,
    customDomain: true
  },
  enterprise: {
    name: 'Enterprise White-Label',
    price: 249900,      // $2499/mo
    features: ['custom_colors', 'custom_logo', 'custom_name', 'branded_emails', 'remove_agreemint_branding', 'custom_domain', 'custom_templates', 'api_access', 'priority_support', 'dedicated_account_manager', 'custom_integrations', 'sla_99_9', 'sso_saml', 'audit_logs', 'unlimited_users'],
    maxUsers: Infinity,
    maxAgreements: Infinity,
    support: 'dedicated',
    apiAccess: true,
    customDomain: true
  }
};

// ─── Default Brand Config ──────────────────────────────
const DEFAULT_BRAND = {
  companyName: 'AgreeMint',
  tagline: 'AI-Powered Agreement Platform',
  logo: '/img/logo.png',
  favicon: '/img/favicon.ico',
  colors: {
    primary: '#6366f1',
    primaryHover: '#818cf8',
    secondary: '#10b981',
    accent: '#f59e0b',
    background: '#0a0a0f',
    surface: '#12121a',
    surfaceLight: '#1a1a2e',
    text: '#e2e8f0',
    textMuted: '#94a3b8',
    border: '#ffffff10',
    error: '#ef4444',
    success: '#10b981',
    warning: '#f59e0b'
  },
  fonts: {
    primary: "'Inter', sans-serif",
    heading: "'Inter', sans-serif",
    mono: "'JetBrains Mono', monospace"
  },
  emailFrom: 'noreply@agreemint.io',
  emailReplyTo: 'support@agreemint.io',
  footerText: '© 2026 AgreeMint. All rights reserved.',
  privacyUrl: '/privacy',
  termsUrl: '/terms',
  supportUrl: '/support'
};

// ─── Create Tenant ─────────────────────────────────────
function createTenant(data) {
  const { companyName, adminEmail, tier, subdomain, customDomain, brand } = data;

  if (!companyName) throw new Error('Company name required');
  if (!adminEmail) throw new Error('Admin email required');
  if (!tier || !WHITELABEL_TIERS[tier]) throw new Error('Valid tier required: standard, premium, enterprise');
  if (!subdomain || !/^[a-z0-9-]+$/.test(subdomain)) throw new Error('Valid subdomain required (lowercase alphanumeric and hyphens)');

  const tierConfig = WHITELABEL_TIERS[tier];

  return {
    id: `tenant_${uuidv4().substring(0, 8)}`,
    companyName,
    adminEmail,
    tier,
    tierConfig,
    subdomain,
    customDomain: tierConfig.customDomain ? (customDomain || null) : null,
    brand: {
      ...DEFAULT_BRAND,
      companyName,
      ...(brand || {}),
      colors: { ...DEFAULT_BRAND.colors, ...(brand?.colors || {}) },
      fonts: { ...DEFAULT_BRAND.fonts, ...(brand?.fonts || {}) }
    },
    status: 'active',      // active, suspended, cancelled
    users: [],
    stats: { agreements: 0, users: 0, storage: 0 },
    apiKey: `wl_${uuidv4().replace(/-/g, '')}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    billingStartDate: new Date().toISOString()
  };
}

// ─── Update Branding ───────────────────────────────────
function updateBrand(tenant, brandUpdate) {
  if (brandUpdate.colors) {
    tenant.brand.colors = { ...tenant.brand.colors, ...brandUpdate.colors };
  }
  if (brandUpdate.fonts) {
    tenant.brand.fonts = { ...tenant.brand.fonts, ...brandUpdate.fonts };
  }
  if (brandUpdate.companyName) tenant.brand.companyName = brandUpdate.companyName;
  if (brandUpdate.tagline) tenant.brand.tagline = brandUpdate.tagline;
  if (brandUpdate.logo) tenant.brand.logo = brandUpdate.logo;
  if (brandUpdate.favicon) tenant.brand.favicon = brandUpdate.favicon;
  if (brandUpdate.footerText) tenant.brand.footerText = brandUpdate.footerText;
  if (brandUpdate.emailFrom) tenant.brand.emailFrom = brandUpdate.emailFrom;

  tenant.updatedAt = new Date().toISOString();
  return tenant;
}

// ─── Generate Custom CSS ───────────────────────────────
function generateCustomCSS(brand) {
  return `:root {
  /* White-Label Colors — ${brand.companyName} */
  --bg-primary: ${brand.colors.background};
  --bg-secondary: ${brand.colors.surface};
  --bg-tertiary: ${brand.colors.surfaceLight};
  --accent: ${brand.colors.primary};
  --accent-hover: ${brand.colors.primaryHover};
  --success: ${brand.colors.success};
  --warning: ${brand.colors.warning};
  --error: ${brand.colors.error};
  --text-primary: ${brand.colors.text};
  --text-secondary: ${brand.colors.textMuted};
  --border-color: ${brand.colors.border};
  --font-primary: ${brand.fonts.primary};
  --font-heading: ${brand.fonts.heading};
  --font-mono: ${brand.fonts.mono};
}

body {
  font-family: var(--font-primary);
  background: var(--bg-primary);
  color: var(--text-primary);
}

h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-heading);
}

code, pre {
  font-family: var(--font-mono);
}

.brand-logo {
  content: url('${brand.logo}');
}

.brand-name::after {
  content: '${brand.companyName}';
}

.brand-tagline::after {
  content: '${brand.tagline}';
}

.brand-footer::after {
  content: '${brand.footerText}';
}
`;
}

// ─── Generate Branded Email HTML ───────────────────────
function generateBrandedEmail(brand, subject, bodyHtml) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>${subject}</title></head>
<body style="margin:0;padding:0;background:${brand.colors.background};font-family:${brand.fonts.primary};">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
    <div style="text-align:center;margin-bottom:30px;">
      ${brand.logo ? `<img src="${brand.logo}" alt="${brand.companyName}" style="max-height:50px;">` : `<h1 style="color:${brand.colors.primary};margin:0;">${brand.companyName}</h1>`}
    </div>
    <div style="background:${brand.colors.surface};border-radius:12px;padding:30px;color:${brand.colors.text};">
      ${bodyHtml}
    </div>
    <div style="text-align:center;margin-top:20px;color:${brand.colors.textMuted};font-size:12px;">
      ${brand.footerText}
    </div>
  </div>
</body>
</html>`;
}

// ─── Generate Branded PDF Header ───────────────────────
function getPDFBranding(tenant) {
  if (!tenant) {
    return {
      companyName: DEFAULT_BRAND.companyName,
      logo: DEFAULT_BRAND.logo,
      footerText: DEFAULT_BRAND.footerText,
      colors: DEFAULT_BRAND.colors,
      watermark: null
    };
  }

  return {
    companyName: tenant.brand.companyName,
    logo: tenant.brand.logo,
    footerText: tenant.brand.footerText,
    colors: tenant.brand.colors,
    watermark: `Powered by ${tenant.brand.companyName}`
  };
}

// ─── Tenant Resolution ─────────────────────────────────
function resolveTenant(tenants, req) {
  // 1. Check X-Tenant-ID header
  const tenantId = req.headers['x-tenant-id'];
  if (tenantId) {
    const t = tenants.find(t => t.id === tenantId && t.status === 'active');
    if (t) return t;
  }

  // 2. Check API key
  const apiKey = req.headers['x-api-key'];
  if (apiKey?.startsWith('wl_')) {
    const t = tenants.find(t => t.apiKey === apiKey && t.status === 'active');
    if (t) return t;
  }

  // 3. Check subdomain
  const host = req.headers.host || '';
  const subdomain = host.split('.')[0];
  if (subdomain && subdomain !== 'www' && subdomain !== 'docs' && subdomain !== 'agreemint') {
    const t = tenants.find(t => t.subdomain === subdomain && t.status === 'active');
    if (t) return t;
  }

  // 4. Check custom domain
  const t = tenants.find(t => t.customDomain === host && t.status === 'active');
  if (t) return t;

  return null; // Default AgreeMint branding
}

// ─── Tenant Feature Check ──────────────────────────────
function tenantHasFeature(tenant, feature) {
  if (!tenant) return false;
  return tenant.tierConfig.features.includes(feature);
}

// ─── Tenant Usage Check ────────────────────────────────
function checkTenantLimits(tenant) {
  return {
    withinUserLimit: tenant.stats.users < tenant.tierConfig.maxUsers,
    withinAgreementLimit: tenant.stats.agreements < tenant.tierConfig.maxAgreements,
    usersUsed: tenant.stats.users,
    usersMax: tenant.tierConfig.maxUsers,
    agreementsUsed: tenant.stats.agreements,
    agreementsMax: tenant.tierConfig.maxAgreements
  };
}

module.exports = {
  WHITELABEL_TIERS,
  DEFAULT_BRAND,
  createTenant,
  updateBrand,
  generateCustomCSS,
  generateBrandedEmail,
  getPDFBranding,
  resolveTenant,
  tenantHasFeature,
  checkTenantLimits
};
