/**
 * AgreeMint — Template & Clause Library
 *
 * Institutional-grade template catalog with pre-built agreement
 * types and a modular clause library for mix-and-match assembly.
 */

// ─── Agreement Type Catalog ────────────────────────────
const AGREEMENT_TYPES = {
  'nda-mutual': {
    name: 'Mutual NDA',
    category: 'Confidentiality',
    icon: '🔒',
    description: 'Both parties share and protect confidential information.',
    complexity: 'Standard',
    avgPages: '4-6',
    commonUse: 'Business discussions, partnerships, due diligence',
    jurisdictionNotes: 'Enforceable in all US states. EU requires GDPR addendum for personal data.'
  },
  'nda-unilateral': {
    name: 'Unilateral NDA',
    category: 'Confidentiality',
    icon: '🔐',
    description: 'One party discloses, one party protects. Stronger protection for discloser.',
    complexity: 'Standard',
    avgPages: '3-5',
    commonUse: 'Hiring freelancers, vendor evaluations, investor presentations',
    jurisdictionNotes: 'Standard enforceability. Consider trade secret laws by state.'
  },
  'msa': {
    name: 'Master Service Agreement',
    category: 'Services',
    icon: '📋',
    description: 'Overarching contract for ongoing service relationships with SOW mechanism.',
    complexity: 'Complex',
    avgPages: '12-20',
    commonUse: 'IT services, consulting, agency relationships, SaaS implementations',
    jurisdictionNotes: 'Include data processing addendum for GDPR. Consider SCC requirements.'
  },
  'sow': {
    name: 'Statement of Work',
    category: 'Services',
    icon: '📝',
    description: 'Project-specific scope, deliverables, and milestones under an MSA.',
    complexity: 'Standard',
    avgPages: '3-8',
    commonUse: 'Project engagements, milestone-based work, custom development',
    jurisdictionNotes: 'Should reference governing MSA terms.'
  },
  'sla': {
    name: 'Service Level Agreement',
    category: 'Services',
    icon: '📊',
    description: 'Performance guarantees with measurable KPIs and service credits.',
    complexity: 'Complex',
    avgPages: '6-12',
    commonUse: 'Cloud services, managed IT, telecom, hosting, SaaS',
    jurisdictionNotes: 'May need to comply with sector-specific regulations.'
  },
  'employment': {
    name: 'Employment Agreement',
    category: 'Employment',
    icon: '👔',
    description: 'Comprehensive employment contract with compensation, duties, and restrictions.',
    complexity: 'Complex',
    avgPages: '8-15',
    commonUse: 'Full-time hires, executive employment, key employees',
    jurisdictionNotes: 'Labor law varies significantly by state/country. Non-competes banned in CA, CO, MN, ND, OK.'
  },
  'contractor': {
    name: 'Independent Contractor',
    category: 'Employment',
    icon: '🔧',
    description: 'Engagement of independent contractors with proper classification language.',
    complexity: 'Standard',
    avgPages: '5-8',
    commonUse: 'Freelancers, consultants, project-based workers',
    jurisdictionNotes: 'IRS 20-factor test. CA AB5 creates stricter classification. EU has different tests.'
  },
  'partnership': {
    name: 'Partnership Agreement',
    category: 'Entity Formation',
    icon: '🤝',
    description: 'Governs partnerships including profit sharing, management, and dissolution.',
    complexity: 'Complex',
    avgPages: '15-25',
    commonUse: 'Business partnerships, professional practices, real estate ventures',
    jurisdictionNotes: 'UPA/RUPA governs. State-specific filing may be required.'
  },
  'investment-safe': {
    name: 'SAFE Agreement',
    category: 'Investment',
    icon: '💰',
    description: 'Simple Agreement for Future Equity. Y Combinator standard for seed funding.',
    complexity: 'Standard',
    avgPages: '5-8',
    commonUse: 'Seed funding, angel investment, pre-seed rounds',
    jurisdictionNotes: 'SEC Regulation D compliance. Accredited investor verification recommended.'
  },
  'investment-convertible': {
    name: 'Convertible Note',
    category: 'Investment',
    icon: '📈',
    description: 'Debt instrument that converts to equity upon qualifying events.',
    complexity: 'Complex',
    avgPages: '8-12',
    commonUse: 'Bridge financing, seed rounds, angel investment',
    jurisdictionNotes: 'Securities law compliance required. State blue sky laws may apply.'
  },
  'licensing': {
    name: 'Licensing Agreement',
    category: 'Intellectual Property',
    icon: '📜',
    description: 'Grant rights to use intellectual property with royalties and restrictions.',
    complexity: 'Complex',
    avgPages: '10-18',
    commonUse: 'Software licensing, brand licensing, patent licensing, content licensing',
    jurisdictionNotes: 'IP law varies by country. Consider WIPO treaties for international licensing.'
  },
  'ip-assignment': {
    name: 'IP Assignment',
    category: 'Intellectual Property',
    icon: '🏷️',
    description: 'Transfer ownership of intellectual property rights.',
    complexity: 'Standard',
    avgPages: '4-6',
    commonUse: 'Startup IP from founders, work-for-hire, acquisition of patents/trademarks',
    jurisdictionNotes: 'Must be recorded with USPTO for patents/trademarks. Copyright transfers require writing.'
  },
  'advisory': {
    name: 'Advisory Agreement',
    category: 'Governance',
    icon: '🎓',
    description: 'Engage advisors with equity or cash compensation and defined obligations.',
    complexity: 'Standard',
    avgPages: '4-6',
    commonUse: 'Startup advisors, board of advisors, industry experts',
    jurisdictionNotes: 'Equity grants may require 409A valuation. Consider securities law for options.'
  },
  'terms-of-service': {
    name: 'Terms of Service',
    category: 'Platform',
    icon: '📱',
    description: 'User agreement for technology platforms and applications.',
    complexity: 'Complex',
    avgPages: '10-20',
    commonUse: 'SaaS, mobile apps, marketplaces, websites',
    jurisdictionNotes: 'GDPR, CCPA, COPPA compliance. Consumer protection laws apply. Arbitration clauses may be limited in EU.'
  },
  'privacy-policy': {
    name: 'Privacy Policy',
    category: 'Platform',
    icon: '🛡️',
    description: 'Data privacy policy compliant with GDPR, CCPA, and international regulations.',
    complexity: 'Complex',
    avgPages: '8-15',
    commonUse: 'Any business collecting personal data',
    jurisdictionNotes: 'Must comply with GDPR (EU), CCPA/CPRA (CA), LGPD (Brazil), PIPEDA (Canada), POPIA (South Africa).'
  },
  'jv': {
    name: 'Joint Venture',
    category: 'Entity Formation',
    icon: '🏗️',
    description: 'Establish a joint venture with governance, contributions, and exit provisions.',
    complexity: 'Complex',
    avgPages: '15-25',
    commonUse: 'Real estate development, international expansion, R&D collaborations',
    jurisdictionNotes: 'Competition/antitrust clearance may be required. Tax structuring is critical.'
  },
  'llc-operating': {
    name: 'LLC Operating Agreement',
    category: 'Entity Formation',
    icon: '🏢',
    description: 'Governs LLC operations, member rights, distributions, and management.',
    complexity: 'Complex',
    avgPages: '15-30',
    commonUse: 'LLC formation, multi-member LLCs, real estate holding companies',
    jurisdictionNotes: 'Required in some states (NY, MO). Delaware and WY are most LLC-friendly.'
  },
  'non-compete': {
    name: 'Non-Compete / Non-Solicitation',
    category: 'Employment',
    icon: '⛔',
    description: 'Restrict competitive activities and solicitation of clients/employees.',
    complexity: 'Standard',
    avgPages: '3-5',
    commonUse: 'Key employees, executives, acquisition targets, franchise agreements',
    jurisdictionNotes: 'BANNED in CA. FTC proposed nationwide ban. Many states restrict scope/duration. Must have consideration.'
  },
  'board-resolution': {
    name: 'Board Resolution',
    category: 'Governance',
    icon: '🏛️',
    description: 'Formal board of directors resolution authorizing corporate actions.',
    complexity: 'Simple',
    avgPages: '1-3',
    commonUse: 'Authorizing contracts, officer appointments, banking, major transactions',
    jurisdictionNotes: 'Must follow bylaws for meeting/consent requirements.'
  },
  'custom': {
    name: 'Custom Agreement',
    category: 'Custom',
    icon: '✨',
    description: 'AI generates a custom agreement tailored to your specific needs.',
    complexity: 'Varies',
    avgPages: 'Varies',
    commonUse: 'Any unique agreement type not covered by templates',
    jurisdictionNotes: 'AI will tailor to specified jurisdiction.'
  }
};

// ─── Jurisdiction Database ─────────────────────────────
const JURISDICTIONS = [
  { code: 'US-DE', name: 'United States (Delaware)', popular: true },
  { code: 'US-NY', name: 'United States (New York)', popular: true },
  { code: 'US-CA', name: 'United States (California)', popular: true },
  { code: 'US-TX', name: 'United States (Texas)', popular: true },
  { code: 'US-FL', name: 'United States (Florida)', popular: true },
  { code: 'US-IL', name: 'United States (Illinois)', popular: false },
  { code: 'US-WA', name: 'United States (Washington)', popular: false },
  { code: 'US-MA', name: 'United States (Massachusetts)', popular: false },
  { code: 'US-CO', name: 'United States (Colorado)', popular: false },
  { code: 'US-GA', name: 'United States (Georgia)', popular: false },
  { code: 'UK', name: 'United Kingdom (England & Wales)', popular: true },
  { code: 'UK-SC', name: 'United Kingdom (Scotland)', popular: false },
  { code: 'CA-ON', name: 'Canada (Ontario)', popular: true },
  { code: 'CA-BC', name: 'Canada (British Columbia)', popular: false },
  { code: 'CA-QC', name: 'Canada (Quebec)', popular: false },
  { code: 'EU-DE', name: 'Germany', popular: true },
  { code: 'EU-FR', name: 'France', popular: false },
  { code: 'EU-NL', name: 'Netherlands', popular: false },
  { code: 'EU-IE', name: 'Ireland', popular: true },
  { code: 'SG', name: 'Singapore', popular: true },
  { code: 'HK', name: 'Hong Kong', popular: true },
  { code: 'AU', name: 'Australia (New South Wales)', popular: false },
  { code: 'AE-DIFC', name: 'UAE (DIFC)', popular: true },
  { code: 'AE', name: 'UAE (Mainland)', popular: false },
  { code: 'CH', name: 'Switzerland', popular: false },
  { code: 'JP', name: 'Japan', popular: false },
  { code: 'IN', name: 'India', popular: false },
  { code: 'BR', name: 'Brazil', popular: false },
  { code: 'KY', name: 'Cayman Islands', popular: true },
  { code: 'BVI', name: 'British Virgin Islands', popular: false },
];

// ─── Categories ────────────────────────────────────────
const CATEGORIES = [
  { id: 'all', name: 'All Templates', icon: '📁' },
  { id: 'Confidentiality', name: 'Confidentiality', icon: '🔒' },
  { id: 'Services', name: 'Services', icon: '📋' },
  { id: 'Employment', name: 'Employment', icon: '👔' },
  { id: 'Entity Formation', name: 'Entity Formation', icon: '🏢' },
  { id: 'Investment', name: 'Investment', icon: '💰' },
  { id: 'Intellectual Property', name: 'IP & Licensing', icon: '📜' },
  { id: 'Governance', name: 'Governance', icon: '🏛️' },
  { id: 'Platform', name: 'Platform & Privacy', icon: '📱' },
  { id: 'Custom', name: 'Custom', icon: '✨' }
];

module.exports = { AGREEMENT_TYPES, JURISDICTIONS, CATEGORIES };
