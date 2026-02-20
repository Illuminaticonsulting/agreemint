/**
 * AgreeMint — Template Marketplace Engine
 *
 * Users can create, sell, and buy pre-made agreement templates.
 * Revenue model: 20% platform commission on every sale.
 *
 * Template types:
 *   - Free templates (drives adoption)
 *   - Premium templates ($2-$25)
 *   - Custom/enterprise templates ($50+)
 *
 * Features:
 *   - Author profiles with earnings tracking
 *   - Star ratings and reviews
 *   - Usage analytics (downloads, active agreements)
 *   - Category filtering and search
 *   - Jurisdiction variants
 *   - Version history
 */

const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

// ─── Pre-loaded Templates ──────────────────────────────
// Platform-provided templates (free with subscription, $5 without)
const PLATFORM_TEMPLATES = [
  {
    id: 'tpl_mutual_nda',
    name: 'Mutual NDA — Standard',
    description: 'Standard mutual non-disclosure agreement suitable for most business discussions, partnerships, and collaborations.',
    category: 'Confidentiality',
    type: 'mutual_nda',
    price: 500, // $5
    authorId: 'platform',
    authorName: 'AgreeMint',
    jurisdiction: 'United States (Delaware)',
    tags: ['nda', 'confidentiality', 'standard', 'mutual'],
    rating: 4.8,
    ratingCount: 124,
    purchaseCount: 890,
    content: `# MUTUAL NON-DISCLOSURE AGREEMENT

This Mutual Non-Disclosure Agreement ("Agreement") is entered into as of [DATE] between:

**Party A:** [PARTY_A_NAME], a [ENTITY_TYPE] organized under the laws of [JURISDICTION] ("Disclosing Party")

**Party B:** [PARTY_B_NAME], a [ENTITY_TYPE] organized under the laws of [JURISDICTION] ("Receiving Party")

## 1. PURPOSE
The parties wish to explore a potential business relationship ("Purpose") and, in connection therewith, may disclose Confidential Information to each other.

## 2. DEFINITION OF CONFIDENTIAL INFORMATION
"Confidential Information" means any non-public information disclosed by either party, whether orally, in writing, or electronically, including but not limited to: trade secrets, business plans, financial information, customer lists, technical data, product designs, and proprietary methodologies.

## 3. OBLIGATIONS
Each party agrees to:
(a) Hold Confidential Information in strict confidence
(b) Not disclose to third parties without written consent
(c) Use only for the Purpose described herein
(d) Protect with at least the same degree of care as its own confidential information

## 4. EXCLUSIONS
Confidential Information does not include information that:
(a) Is or becomes publicly available without breach
(b) Was known prior to disclosure
(c) Is independently developed without use of Confidential Information
(d) Is disclosed pursuant to court order with prompt notice

## 5. TERM
This Agreement is effective for [DURATION] years from the date of execution. Obligations of confidentiality survive for [SURVIVAL_PERIOD] years after termination.

## 6. RETURN OF MATERIALS
Upon termination, each party shall return or destroy all Confidential Information and certify destruction in writing.

## 7. REMEDIES
Both parties acknowledge that breach may cause irreparable harm, and the non-breaching party shall be entitled to equitable relief including injunctive relief.

## 8. GOVERNING LAW
This Agreement shall be governed by the laws of [JURISDICTION].

## 9. ENTIRE AGREEMENT
This Agreement constitutes the entire agreement between the parties regarding Confidential Information and supersedes all prior agreements.

IN WITNESS WHEREOF, the parties have executed this Agreement as of the date first written above.`,
    variables: ['PARTY_A_NAME', 'PARTY_B_NAME', 'ENTITY_TYPE', 'JURISDICTION', 'DATE', 'DURATION', 'SURVIVAL_PERIOD'],
    featured: true,
    createdAt: '2025-01-01T00:00:00.000Z'
  },
  {
    id: 'tpl_freelancer',
    name: 'Freelancer / Independent Contractor',
    description: 'Comprehensive independent contractor agreement covering scope, payment, IP assignment, and confidentiality.',
    category: 'Employment',
    type: 'independent_contractor',
    price: 1000, // $10
    authorId: 'platform',
    authorName: 'AgreeMint',
    jurisdiction: 'United States (California)',
    tags: ['freelancer', 'contractor', 'independent', 'gig', 'work'],
    rating: 4.7,
    ratingCount: 89,
    purchaseCount: 567,
    content: `# INDEPENDENT CONTRACTOR AGREEMENT

This Independent Contractor Agreement ("Agreement") is made effective as of [DATE] between:

**Client:** [CLIENT_NAME] ("Client")
**Contractor:** [CONTRACTOR_NAME] ("Contractor")

## 1. SERVICES
Contractor agrees to perform the following services: [SCOPE_OF_WORK]

## 2. COMPENSATION
Client shall pay Contractor [PAYMENT_AMOUNT] [PAYMENT_SCHEDULE] for services rendered. Payment is due within [PAYMENT_TERMS] days of invoice.

## 3. TERM
This Agreement begins on [START_DATE] and continues until [END_DATE] or completion of services, whichever comes first.

## 4. INDEPENDENT CONTRACTOR STATUS
Contractor is an independent contractor, not an employee. Contractor is responsible for all taxes, insurance, and benefits.

## 5. INTELLECTUAL PROPERTY
All work product created under this Agreement is "work made for hire" and shall be the exclusive property of Client. Contractor assigns all rights, title, and interest.

## 6. CONFIDENTIALITY
Contractor shall not disclose Client's confidential information during or after the term of this Agreement.

## 7. NON-SOLICITATION
During the term and for [NON_SOLICIT_PERIOD] months after, Contractor shall not solicit Client's employees or customers.

## 8. TERMINATION
Either party may terminate with [NOTICE_PERIOD] days written notice. Client shall pay for all services rendered through termination.

## 9. LIMITATION OF LIABILITY
Contractor's liability shall not exceed the total fees paid under this Agreement.

## 10. GOVERNING LAW
This Agreement is governed by the laws of [JURISDICTION].`,
    variables: ['CLIENT_NAME', 'CONTRACTOR_NAME', 'SCOPE_OF_WORK', 'PAYMENT_AMOUNT', 'PAYMENT_SCHEDULE', 'PAYMENT_TERMS', 'START_DATE', 'END_DATE', 'NON_SOLICIT_PERIOD', 'NOTICE_PERIOD', 'JURISDICTION', 'DATE'],
    featured: true,
    createdAt: '2025-01-01T00:00:00.000Z'
  },
  {
    id: 'tpl_safe_note',
    name: 'SAFE Note (Y Combinator Style)',
    description: 'Simple Agreement for Future Equity. Standard post-money SAFE used by startups and angel investors.',
    category: 'Investment',
    type: 'safe',
    price: 1500, // $15
    authorId: 'platform',
    authorName: 'AgreeMint',
    jurisdiction: 'United States (Delaware)',
    tags: ['safe', 'investment', 'startup', 'equity', 'vc', 'angel'],
    rating: 4.9,
    ratingCount: 45,
    purchaseCount: 234,
    content: `# SAFE (SIMPLE AGREEMENT FOR FUTURE EQUITY)

THIS CERTIFIES THAT in exchange for the payment by [INVESTOR_NAME] (the "Investor") of $[INVESTMENT_AMOUNT] (the "Purchase Amount") on or about [DATE], [COMPANY_NAME], a [STATE] corporation (the "Company"), hereby issues to the Investor the right to certain shares of the Company's capital stock, subject to the terms set forth below.

## 1. EVENTS
### (a) Equity Financing
If there is an Equity Financing before the termination of this SAFE, the Company will automatically issue to the Investor a number of shares of Safe Preferred Stock equal to the Purchase Amount divided by the Conversion Price.

**Valuation Cap:** $[VALUATION_CAP]
**Discount Rate:** [DISCOUNT_RATE]%

### (b) Liquidity Event
If there is a Liquidity Event before the termination of this SAFE, the Investor will receive the greater of: (i) the Purchase Amount, or (ii) the Purchase Amount divided by the Liquidity Price multiplied by the Liquidity Event proceeds.

### (c) Dissolution Event
If there is a Dissolution Event before this SAFE terminates, the Company will pay the Investor an amount equal to the Purchase Amount.

## 2. DEFINITIONS
**"Conversion Price"** means either: (a) the Valuation Cap divided by the Company Capitalization, or (b) the price per share of Standard Preferred Stock sold in the Equity Financing multiplied by the Discount Rate, whichever is lower.

## 3. COMPANY REPRESENTATIONS
The Company represents that it is duly organized, validly existing, and in good standing, and has the power to execute this SAFE.

## 4. INVESTOR REPRESENTATIONS
The Investor represents that they are an accredited investor and that the Purchase Amount is not derived from illegal activity.

## 5. MISCELLANEOUS
This SAFE is governed by [STATE] law. Any disputes shall be resolved through binding arbitration.`,
    variables: ['INVESTOR_NAME', 'INVESTMENT_AMOUNT', 'COMPANY_NAME', 'STATE', 'VALUATION_CAP', 'DISCOUNT_RATE', 'DATE'],
    featured: true,
    createdAt: '2025-01-01T00:00:00.000Z'
  },
  {
    id: 'tpl_service_agreement',
    name: 'Master Service Agreement',
    description: 'Comprehensive MSA for service providers. Covers SLAs, liability, IP, data protection, and payment terms.',
    category: 'Services',
    type: 'msa',
    price: 1200,
    authorId: 'platform',
    authorName: 'AgreeMint',
    jurisdiction: 'United States (New York)',
    tags: ['msa', 'service', 'saas', 'consulting', 'enterprise'],
    rating: 4.6,
    ratingCount: 67,
    purchaseCount: 445,
    content: `# MASTER SERVICE AGREEMENT\n\nEffective Date: [DATE]\n\nBetween [PROVIDER_NAME] ("Provider") and [CLIENT_NAME] ("Client").\n\n## 1. SERVICES\nProvider shall perform services as described in one or more Statements of Work ("SOW") attached hereto.\n\n## 2. PAYMENT\nClient shall pay Provider [RATE] per [BILLING_PERIOD]. Invoices are due within [NET_DAYS] days.\n\n## 3. TERM\nThis MSA is effective for [TERM_YEARS] year(s) and auto-renews unless terminated with [NOTICE_DAYS] days notice.\n\n## 4. SERVICE LEVELS\nProvider commits to [SLA_UPTIME]% uptime. Credits apply for downtime exceeding SLA.\n\n## 5. INTELLECTUAL PROPERTY\nPre-existing IP remains with its owner. Work product IP is assigned to Client upon payment.\n\n## 6. CONFIDENTIALITY\nBoth parties shall protect confidential information for [CONFIDENTIALITY_YEARS] years.\n\n## 7. DATA PROTECTION\nProvider shall comply with applicable data protection laws including GDPR and CCPA.\n\n## 8. LIABILITY\nTotal liability is capped at [LIABILITY_CAP] times fees paid in the preceding 12 months.\n\n## 9. INDEMNIFICATION\nEach party indemnifies the other against third-party claims arising from breach of this Agreement.\n\n## 10. GOVERNING LAW\nGoverned by [JURISDICTION] law.`,
    variables: ['PROVIDER_NAME', 'CLIENT_NAME', 'RATE', 'BILLING_PERIOD', 'NET_DAYS', 'TERM_YEARS', 'NOTICE_DAYS', 'SLA_UPTIME', 'CONFIDENTIALITY_YEARS', 'LIABILITY_CAP', 'JURISDICTION', 'DATE'],
    featured: false,
    createdAt: '2025-01-15T00:00:00.000Z'
  },
  {
    id: 'tpl_ip_license',
    name: 'IP Licensing Agreement',
    description: 'License intellectual property with configurable royalty terms, territory, and exclusivity.',
    category: 'Intellectual Property',
    type: 'licensing',
    price: 800,
    authorId: 'platform',
    authorName: 'AgreeMint',
    jurisdiction: 'United States (Delaware)',
    tags: ['license', 'ip', 'royalty', 'patent', 'trademark', 'copyright'],
    rating: 4.5,
    ratingCount: 32,
    purchaseCount: 189,
    content: `# INTELLECTUAL PROPERTY LICENSE AGREEMENT\n\nThis License Agreement is entered into as of [DATE] between [LICENSOR_NAME] ("Licensor") and [LICENSEE_NAME] ("Licensee").\n\n## 1. GRANT OF LICENSE\nLicensor grants Licensee a [EXCLUSIVITY] [LICENSE_TYPE] license to [LICENSED_RIGHTS] the Licensed IP described in Exhibit A.\n\n## 2. TERRITORY\nThis license is valid in: [TERRITORY]\n\n## 3. TERM\nThe license term is [TERM] years, renewable upon mutual agreement.\n\n## 4. ROYALTIES\nLicensee shall pay Licensor a royalty of [ROYALTY_RATE]% of Net Revenue, payable [PAYMENT_FREQUENCY].\n\n## 5. MINIMUM ROYALTY\nMinimum annual royalty of $[MIN_ROYALTY] applies.\n\n## 6. QUALITY CONTROL\nLicensor retains the right to approve all uses of the Licensed IP.\n\n## 7. SUBLICENSING\n[SUBLICENSE_PERMITTED]. [SUBLICENSE_TERMS]\n\n## 8. TERMINATION\nEither party may terminate for material breach with 30 days notice.\n\n## 9. GOVERNING LAW\nGoverned by [JURISDICTION] law.`,
    variables: ['LICENSOR_NAME', 'LICENSEE_NAME', 'EXCLUSIVITY', 'LICENSE_TYPE', 'LICENSED_RIGHTS', 'TERRITORY', 'TERM', 'ROYALTY_RATE', 'PAYMENT_FREQUENCY', 'MIN_ROYALTY', 'SUBLICENSE_PERMITTED', 'SUBLICENSE_TERMS', 'JURISDICTION', 'DATE'],
    featured: false,
    createdAt: '2025-02-01T00:00:00.000Z'
  }
];

// ─── Marketplace Functions ─────────────────────────────

/**
 * Create a new template for the marketplace.
 * Users can sell their own agreement templates.
 */
function createTemplate(authorId, authorName, templateData) {
  const {
    name, description, category, type,
    content, variables, jurisdiction,
    price = 0, tags = []
  } = templateData;

  if (!name || !content) throw new Error('Template name and content required');

  return {
    id: `tpl_${uuidv4().substring(0, 8)}`,
    name,
    description: description || '',
    category: category || 'Custom',
    type: type || 'custom',
    content,
    contentHash: crypto.createHash('sha256').update(content).digest('hex'),
    variables: variables || extractVariables(content),
    jurisdiction: jurisdiction || 'Global',
    price: Math.max(0, parseInt(price) || 0), // cents
    authorId,
    authorName,
    tags: tags.map(t => t.toLowerCase()),
    rating: 0,
    ratingCount: 0,
    reviews: [],
    purchaseCount: 0,
    totalRevenue: 0,
    featured: false,
    approved: price === 0, // free templates auto-approved, paid need review
    version: 1,
    versions: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

/**
 * Extract [VARIABLE] placeholders from template content.
 */
function extractVariables(content) {
  const matches = content.match(/\[([A-Z_]+)\]/g) || [];
  return [...new Set(matches.map(m => m.replace(/[\[\]]/g, '')))];
}

/**
 * Fill template variables with actual values.
 */
function fillTemplate(template, values = {}) {
  let content = template.content;
  for (const [key, value] of Object.entries(values)) {
    content = content.replace(new RegExp(`\\[${key}\\]`, 'g'), value);
  }
  return content;
}

/**
 * Add a review to a template.
 */
function addReview(template, userId, review) {
  const { rating, title, comment } = review;
  if (rating < 1 || rating > 5) throw new Error('Rating must be 1-5');

  // Check if user already reviewed
  if (template.reviews.find(r => r.userId === userId)) {
    throw new Error('Already reviewed this template');
  }

  template.reviews.push({
    userId,
    rating,
    title: title || '',
    comment: comment || '',
    createdAt: new Date().toISOString()
  });

  // Recalculate average
  template.ratingCount = template.reviews.length;
  template.rating = Math.round(
    (template.reviews.reduce((sum, r) => sum + r.rating, 0) / template.ratingCount) * 10
  ) / 10;

  template.updatedAt = new Date().toISOString();
}

/**
 * Record a template purchase.
 */
function recordPurchase(template, buyerId) {
  template.purchaseCount++;
  template.totalRevenue += template.price;
  template.updatedAt = new Date().toISOString();

  return {
    templateId: template.id,
    buyerId,
    price: template.price,
    platformFee: Math.round(template.price * 0.20), // 20% commission
    sellerEarnings: template.price - Math.round(template.price * 0.20),
    purchasedAt: new Date().toISOString()
  };
}

/**
 * Search templates by query and filters.
 */
function searchTemplates(templates, query = {}) {
  let results = [...templates];

  if (query.search) {
    const s = query.search.toLowerCase();
    results = results.filter(t =>
      t.name.toLowerCase().includes(s) ||
      t.description.toLowerCase().includes(s) ||
      t.tags.some(tag => tag.includes(s))
    );
  }

  if (query.category) {
    results = results.filter(t => t.category === query.category);
  }

  if (query.type) {
    results = results.filter(t => t.type === query.type);
  }

  if (query.jurisdiction) {
    results = results.filter(t => t.jurisdiction === query.jurisdiction || t.jurisdiction === 'Global');
  }

  if (query.minRating) {
    results = results.filter(t => t.rating >= query.minRating);
  }

  if (query.maxPrice !== undefined) {
    results = results.filter(t => t.price <= query.maxPrice);
  }

  if (query.freeOnly) {
    results = results.filter(t => t.price === 0);
  }

  if (query.featured) {
    results = results.filter(t => t.featured);
  }

  // Sort
  switch (query.sort) {
    case 'popular':
      results.sort((a, b) => b.purchaseCount - a.purchaseCount);
      break;
    case 'rating':
      results.sort((a, b) => b.rating - a.rating);
      break;
    case 'price_low':
      results.sort((a, b) => a.price - b.price);
      break;
    case 'price_high':
      results.sort((a, b) => b.price - a.price);
      break;
    case 'newest':
    default:
      results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  return results;
}

module.exports = {
  PLATFORM_TEMPLATES,
  createTemplate,
  extractVariables,
  fillTemplate,
  addReview,
  recordPurchase,
  searchTemplates
};
