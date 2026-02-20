/**
 * AgreeMint — Template & Clause Library
 *
 * Institutional-grade template catalog with 45+ agreement
 * types, 65+ jurisdictions, and 16 categories covering
 * every major industry and legal domain.
 */

// ─── Agreement Type Catalog ────────────────────────────
const AGREEMENT_TYPES = {
  // ── Confidentiality ──
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

  // ── Services ──
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
  'consulting': {
    name: 'Consulting Agreement',
    category: 'Services',
    icon: '💼',
    description: 'Engagement of a consultant for professional advisory services.',
    complexity: 'Standard',
    avgPages: '5-10',
    commonUse: 'Management consulting, IT consulting, strategy advisory',
    jurisdictionNotes: 'Distinguish from employment. Include IP assignment and non-compete clauses.'
  },

  // ── Employment ──
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
  'non-compete': {
    name: 'Non-Compete / Non-Solicitation',
    category: 'Employment',
    icon: '⛔',
    description: 'Restrict competitive activities and solicitation of clients/employees.',
    complexity: 'Standard',
    avgPages: '3-5',
    commonUse: 'Key employees, executives, acquisition targets, franchise agreements',
    jurisdictionNotes: 'BANNED in CA. FTC proposed nationwide ban. Many states restrict scope/duration.'
  },
  'offer-letter': {
    name: 'Offer Letter',
    category: 'Employment',
    icon: '✉️',
    description: 'Formal job offer with compensation details and contingencies.',
    complexity: 'Simple',
    avgPages: '2-4',
    commonUse: 'New hires, transfers, promotions',
    jurisdictionNotes: 'At-will vs. fixed-term varies by jurisdiction. Include disclaimers.'
  },
  'severance': {
    name: 'Severance Agreement',
    category: 'Employment',
    icon: '📦',
    description: 'Separation terms with severance pay, release of claims, and transition provisions.',
    complexity: 'Standard',
    avgPages: '5-10',
    commonUse: 'Layoffs, terminations, mutual separations, executive exits',
    jurisdictionNotes: 'OWBPA requires 21/45 day consideration for age 40+. State laws on final pay vary.'
  },

  // ── Entity Formation ──
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
  'shareholder': {
    name: 'Shareholder Agreement',
    category: 'Entity Formation',
    icon: '📊',
    description: 'Governs rights and obligations of shareholders in a corporation.',
    complexity: 'Complex',
    avgPages: '15-25',
    commonUse: 'Startups, closely held corps, family businesses, multi-investor companies',
    jurisdictionNotes: 'Must be consistent with articles/bylaws. Drag-along/tag-along rights common.'
  },
  'bylaws': {
    name: 'Corporate Bylaws',
    category: 'Entity Formation',
    icon: '📘',
    description: 'Internal governance rules for a corporation covering meetings, officers, and procedures.',
    complexity: 'Complex',
    avgPages: '10-20',
    commonUse: 'Corporation formation, corporate restructuring',
    jurisdictionNotes: 'Must comply with state corporate statutes (e.g., DGCL for Delaware).'
  },

  // ── Investment ──
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
  'term-sheet': {
    name: 'Term Sheet',
    category: 'Investment',
    icon: '📄',
    description: 'Non-binding summary of proposed investment terms for negotiation.',
    complexity: 'Standard',
    avgPages: '3-6',
    commonUse: 'VC funding rounds, M&A negotiations, private equity',
    jurisdictionNotes: 'Typically non-binding except for exclusivity and confidentiality.'
  },
  'subscription': {
    name: 'Subscription Agreement',
    category: 'Investment',
    icon: '🔖',
    description: 'Investor subscribes for securities in a private placement.',
    complexity: 'Complex',
    avgPages: '8-15',
    commonUse: 'Private placements, fund investments, Reg D offerings',
    jurisdictionNotes: 'Must comply with SEC and state blue sky laws. Accredited investor reps required.'
  },

  // ── Intellectual Property ──
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
  'software-license': {
    name: 'Software License Agreement',
    category: 'Intellectual Property',
    icon: '💻',
    description: 'License software with usage rights, restrictions, warranties, and support terms.',
    complexity: 'Complex',
    avgPages: '8-15',
    commonUse: 'SaaS, on-premise software, OEM licensing, white-label',
    jurisdictionNotes: 'UCC Article 2 may apply. EU Software Directive considerations.'
  },

  // ── Governance ──
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
  'voting': {
    name: 'Voting Agreement',
    category: 'Governance',
    icon: '🗳️',
    description: 'Agreement among shareholders regarding how they will vote their shares.',
    complexity: 'Standard',
    avgPages: '5-10',
    commonUse: 'Venture financing, board composition, founder agreements',
    jurisdictionNotes: 'Must comply with state corporate law. Cannot be irrevocable indefinitely.'
  },

  // ── Platform ──
  'terms-of-service': {
    name: 'Terms of Service',
    category: 'Platform',
    icon: '📱',
    description: 'User agreement for technology platforms and applications.',
    complexity: 'Complex',
    avgPages: '10-20',
    commonUse: 'SaaS, mobile apps, marketplaces, websites',
    jurisdictionNotes: 'GDPR, CCPA, COPPA compliance. Consumer protection laws. Arbitration may be limited in EU.'
  },
  'privacy-policy': {
    name: 'Privacy Policy',
    category: 'Platform',
    icon: '🛡️',
    description: 'Data privacy policy compliant with GDPR, CCPA, and international regulations.',
    complexity: 'Complex',
    avgPages: '8-15',
    commonUse: 'Any business collecting personal data',
    jurisdictionNotes: 'GDPR (EU), CCPA/CPRA (CA), LGPD (Brazil), PIPEDA (Canada), POPIA (South Africa).'
  },
  'dpa': {
    name: 'Data Processing Agreement',
    category: 'Platform',
    icon: '🔐',
    description: 'GDPR-compliant DPA for controllers engaging data processors.',
    complexity: 'Complex',
    avgPages: '8-15',
    commonUse: 'SaaS vendors, cloud providers, marketing platforms, analytics tools',
    jurisdictionNotes: 'Required under GDPR Article 28. Include SCCs for international transfers.'
  },
  'cookie-policy': {
    name: 'Cookie & Tracking Policy',
    category: 'Platform',
    icon: '🍪',
    description: 'Cookie consent and tracking technology disclosure for websites and apps.',
    complexity: 'Simple',
    avgPages: '3-5',
    commonUse: 'Websites, web apps, e-commerce platforms',
    jurisdictionNotes: 'EU ePrivacy Directive, GDPR, CCPA. Active consent required in EU.'
  },

  // ── Real Estate ──
  'lease-commercial': {
    name: 'Commercial Lease',
    category: 'Real Estate',
    icon: '🏬',
    description: 'Lease agreement for commercial office, retail, or industrial space.',
    complexity: 'Complex',
    avgPages: '15-30',
    commonUse: 'Office leases, retail leases, warehouse leases, coworking agreements',
    jurisdictionNotes: 'Varies significantly by state/country. Triple-net vs gross lease structures.'
  },
  'lease-residential': {
    name: 'Residential Lease',
    category: 'Real Estate',
    icon: '🏠',
    description: 'Standard residential rental agreement between landlord and tenant.',
    complexity: 'Standard',
    avgPages: '8-15',
    commonUse: 'Apartment rental, house rental, room rental, vacation rental',
    jurisdictionNotes: 'Tenant protection laws vary widely. Rent control in some jurisdictions.'
  },
  'purchase-agreement': {
    name: 'Real Estate Purchase Agreement',
    category: 'Real Estate',
    icon: '🏡',
    description: 'Contract for the sale and purchase of real property.',
    complexity: 'Complex',
    avgPages: '12-25',
    commonUse: 'Home purchase, commercial property acquisition, land sales',
    jurisdictionNotes: 'Must comply with state real estate laws. Title insurance and escrow vary by state.'
  },
  'property-management': {
    name: 'Property Management Agreement',
    category: 'Real Estate',
    icon: '🔑',
    description: 'Engage a property manager to oversee rental properties.',
    complexity: 'Standard',
    avgPages: '6-12',
    commonUse: 'Landlords with multiple properties, vacation rentals, commercial buildings',
    jurisdictionNotes: 'Property manager licensing requirements vary by state.'
  },

  // ── Finance ──
  'loan': {
    name: 'Loan Agreement',
    category: 'Finance',
    icon: '🏦',
    description: 'Agreement for lending money with interest, repayment schedule, and collateral.',
    complexity: 'Complex',
    avgPages: '8-15',
    commonUse: 'Business loans, personal loans, inter-company loans, shareholder loans',
    jurisdictionNotes: 'Usury laws limit interest rates. Truth in Lending Act (TILA) for consumer loans.'
  },
  'promissory-note': {
    name: 'Promissory Note',
    category: 'Finance',
    icon: '💵',
    description: 'Unconditional promise to pay a specified sum with defined terms.',
    complexity: 'Standard',
    avgPages: '3-5',
    commonUse: 'Loans between parties, real estate financing, business financing',
    jurisdictionNotes: 'UCC Article 3 governs negotiable instruments. State usury limits apply.'
  },
  'guaranty': {
    name: 'Personal / Corporate Guaranty',
    category: 'Finance',
    icon: '🛡️',
    description: 'Guarantor promises to fulfill obligations if primary obligor defaults.',
    complexity: 'Standard',
    avgPages: '3-6',
    commonUse: 'Lease guarantees, loan guarantees, contract performance guarantees',
    jurisdictionNotes: 'Suretyship laws vary. Written guaranty required under Statute of Frauds.'
  },

  // ── Construction ──
  'construction': {
    name: 'Construction Contract',
    category: 'Construction',
    icon: '🏗️',
    description: 'Agreement for construction services including scope, schedule, and payment.',
    complexity: 'Complex',
    avgPages: '15-30',
    commonUse: 'General contracting, new construction, renovations, commercial build-outs',
    jurisdictionNotes: 'Mechanic\'s lien laws vary by state. Bonding requirements may apply.'
  },
  'subcontractor': {
    name: 'Subcontractor Agreement',
    category: 'Construction',
    icon: '🔨',
    description: 'Engagement of subcontractor by general contractor for specific trade work.',
    complexity: 'Standard',
    avgPages: '6-12',
    commonUse: 'Electrical, plumbing, HVAC, painting, concrete subcontracting',
    jurisdictionNotes: 'Flow-down clauses from prime contract. Lien waiver requirements.'
  },
  'lien-waiver': {
    name: 'Lien Waiver',
    category: 'Construction',
    icon: '📋',
    description: 'Waiver of mechanic\'s lien rights upon receipt of payment.',
    complexity: 'Simple',
    avgPages: '1-3',
    commonUse: 'Construction payment processing, draw requests',
    jurisdictionNotes: 'Conditional vs unconditional. Statutory forms required in many states (CA, TX, FL).'
  },

  // ── Healthcare ──
  'baa': {
    name: 'Business Associate Agreement (BAA)',
    category: 'Healthcare',
    icon: '🏥',
    description: 'HIPAA-required agreement for business associates handling protected health information.',
    complexity: 'Complex',
    avgPages: '6-12',
    commonUse: 'Healthcare IT vendors, billing services, consulting, cloud providers',
    jurisdictionNotes: 'Required by HIPAA. HITECH Act imposes breach notification requirements.'
  },
  'patient-consent': {
    name: 'Patient Consent Form',
    category: 'Healthcare',
    icon: '⚕️',
    description: 'Informed consent for medical treatment, procedures, or data sharing.',
    complexity: 'Standard',
    avgPages: '3-6',
    commonUse: 'Medical procedures, telehealth, clinical trials, data sharing',
    jurisdictionNotes: 'State-specific informed consent requirements. HIPAA privacy notice required.'
  },
  'telehealth': {
    name: 'Telehealth Services Agreement',
    category: 'Healthcare',
    icon: '📞',
    description: 'Terms for providing healthcare services via telemedicine technology.',
    complexity: 'Complex',
    avgPages: '8-15',
    commonUse: 'Virtual doctor visits, remote monitoring, online therapy',
    jurisdictionNotes: 'State licensure requirements. Interstate telehealth compacts. DEA for prescriptions.'
  },

  // ── Entertainment & Media ──
  'talent': {
    name: 'Talent / Artist Agreement',
    category: 'Entertainment',
    icon: '🎬',
    description: 'Engagement of talent, actors, musicians, or influencers for productions or campaigns.',
    complexity: 'Standard',
    avgPages: '6-12',
    commonUse: 'Film, TV, music, advertising, influencer marketing, live events',
    jurisdictionNotes: 'CA Talent Agencies Act. SAG-AFTRA/IATSE union requirements. Right of publicity.'
  },
  'production': {
    name: 'Production Agreement',
    category: 'Entertainment',
    icon: '🎥',
    description: 'Agreement for producing media content including film, video, or audio productions.',
    complexity: 'Complex',
    avgPages: '10-20',
    commonUse: 'Film production, TV shows, commercials, podcasts, music videos',
    jurisdictionNotes: 'Union requirements. State film tax credits. Chain of title required.'
  },
  'content-license': {
    name: 'Content License',
    category: 'Entertainment',
    icon: '🎵',
    description: 'License digital content including music, video, images, or written works.',
    complexity: 'Standard',
    avgPages: '5-10',
    commonUse: 'Stock media, music sync, publishing rights, content syndication',
    jurisdictionNotes: 'Copyright law governs. DMCA provisions. International Berne Convention.'
  },

  // ── Sales & Distribution ──
  'distribution': {
    name: 'Distribution Agreement',
    category: 'Sales',
    icon: '🚚',
    description: 'Appoint a distributor for products or services in a defined territory.',
    complexity: 'Complex',
    avgPages: '10-18',
    commonUse: 'Product distribution, wholesale, retail channels, international expansion',
    jurisdictionNotes: 'Anti-trust/competition law. EU block exemption. Termination protection.'
  },
  'franchise': {
    name: 'Franchise Agreement',
    category: 'Sales',
    icon: '🏪',
    description: 'Grant franchise rights including brand, systems, territory, and fees.',
    complexity: 'Complex',
    avgPages: '25-50',
    commonUse: 'Restaurant franchises, retail franchises, service franchises',
    jurisdictionNotes: 'FTC Franchise Rule (FDD). State registration required in 14+ states.'
  },
  'reseller': {
    name: 'Reseller / Channel Partner',
    category: 'Sales',
    icon: '🤝',
    description: 'Authorize a reseller to sell products or services on behalf of the vendor.',
    complexity: 'Standard',
    avgPages: '6-12',
    commonUse: 'Software resellers, VAR agreements, channel partnerships, affiliate programs',
    jurisdictionNotes: 'Consider anti-trust for price restrictions. Export control compliance.'
  },
  'purchase-order': {
    name: 'Purchase Order / Supply Agreement',
    category: 'Sales',
    icon: '📦',
    description: 'Order goods or establish ongoing supply relationship with a vendor.',
    complexity: 'Standard',
    avgPages: '4-8',
    commonUse: 'Procurement, manufacturing, wholesale purchasing, supply chain',
    jurisdictionNotes: 'UCC Article 2 governs sale of goods. CISG for international sales.'
  },

  // ── Personal & Family ──
  'prenuptial': {
    name: 'Prenuptial Agreement',
    category: 'Personal',
    icon: '💍',
    description: 'Pre-marriage agreement governing property rights, finances, and spousal support.',
    complexity: 'Complex',
    avgPages: '8-15',
    commonUse: 'Marriage, blended families, high net worth individuals, business owners',
    jurisdictionNotes: 'UPAA governs. Must have financial disclosure. Cannot modify child support.'
  },
  'personal-loan': {
    name: 'Personal Loan Agreement',
    category: 'Personal',
    icon: '💳',
    description: 'Simple loan agreement between individuals for personal lending.',
    complexity: 'Simple',
    avgPages: '2-4',
    commonUse: 'Loans between friends, family loans, personal financing',
    jurisdictionNotes: 'State usury limits apply. IRS imputed interest rules for below-market loans.'
  },
  'power-of-attorney': {
    name: 'Power of Attorney',
    category: 'Personal',
    icon: '⚖️',
    description: 'Authorize an agent to act on your behalf in legal or financial matters.',
    complexity: 'Standard',
    avgPages: '3-6',
    commonUse: 'Healthcare proxy, financial management, real estate transactions',
    jurisdictionNotes: 'Must comply with UPOAA. Durable vs non-durable. Notarization often required.'
  },

  // ── Custom ──
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
  // United States — Major States
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
  // US — Additional States
  { code: 'US-NV', name: 'United States (Nevada)', popular: false },
  { code: 'US-WY', name: 'United States (Wyoming)', popular: false },
  { code: 'US-NJ', name: 'United States (New Jersey)', popular: false },
  { code: 'US-PA', name: 'United States (Pennsylvania)', popular: false },
  { code: 'US-OH', name: 'United States (Ohio)', popular: false },
  { code: 'US-VA', name: 'United States (Virginia)', popular: false },
  { code: 'US-NC', name: 'United States (North Carolina)', popular: false },
  { code: 'US-AZ', name: 'United States (Arizona)', popular: false },
  { code: 'US-MI', name: 'United States (Michigan)', popular: false },
  { code: 'US-MN', name: 'United States (Minnesota)', popular: false },
  { code: 'US-MD', name: 'United States (Maryland)', popular: false },
  { code: 'US-TN', name: 'United States (Tennessee)', popular: false },
  { code: 'US-OR', name: 'United States (Oregon)', popular: false },
  { code: 'US-CT', name: 'United States (Connecticut)', popular: false },
  { code: 'US-HI', name: 'United States (Hawaii)', popular: false },
  { code: 'US-DC', name: 'United States (District of Columbia)', popular: false },
  // United Kingdom
  { code: 'UK', name: 'United Kingdom (England & Wales)', popular: true },
  { code: 'UK-SC', name: 'United Kingdom (Scotland)', popular: false },
  { code: 'UK-NI', name: 'United Kingdom (Northern Ireland)', popular: false },
  // Canada
  { code: 'CA-ON', name: 'Canada (Ontario)', popular: true },
  { code: 'CA-BC', name: 'Canada (British Columbia)', popular: false },
  { code: 'CA-QC', name: 'Canada (Quebec)', popular: false },
  { code: 'CA-AB', name: 'Canada (Alberta)', popular: false },
  // Europe — Major
  { code: 'EU-DE', name: 'Germany', popular: true },
  { code: 'EU-FR', name: 'France', popular: false },
  { code: 'EU-NL', name: 'Netherlands', popular: false },
  { code: 'EU-IE', name: 'Ireland', popular: true },
  { code: 'EU-ES', name: 'Spain', popular: false },
  { code: 'EU-IT', name: 'Italy', popular: false },
  { code: 'EU-PT', name: 'Portugal', popular: false },
  { code: 'EU-BE', name: 'Belgium', popular: false },
  { code: 'EU-AT', name: 'Austria', popular: false },
  { code: 'EU-SE', name: 'Sweden', popular: false },
  { code: 'EU-DK', name: 'Denmark', popular: false },
  { code: 'EU-FI', name: 'Finland', popular: false },
  { code: 'EU-PL', name: 'Poland', popular: false },
  { code: 'EU-CZ', name: 'Czech Republic', popular: false },
  { code: 'EU-RO', name: 'Romania', popular: false },
  { code: 'EU-LU', name: 'Luxembourg', popular: false },
  { code: 'EU-GR', name: 'Greece', popular: false },
  // Nordics & Eastern Europe
  { code: 'NO', name: 'Norway', popular: false },
  { code: 'IS', name: 'Iceland', popular: false },
  { code: 'EE', name: 'Estonia', popular: false },
  // Switzerland
  { code: 'CH', name: 'Switzerland', popular: false },
  // Asia-Pacific
  { code: 'SG', name: 'Singapore', popular: true },
  { code: 'HK', name: 'Hong Kong', popular: true },
  { code: 'JP', name: 'Japan', popular: false },
  { code: 'IN', name: 'India', popular: false },
  { code: 'KR', name: 'South Korea', popular: false },
  { code: 'CN', name: 'China (Mainland)', popular: false },
  { code: 'TW', name: 'Taiwan', popular: false },
  { code: 'TH', name: 'Thailand', popular: false },
  { code: 'MY', name: 'Malaysia', popular: false },
  { code: 'PH', name: 'Philippines', popular: false },
  { code: 'ID', name: 'Indonesia', popular: false },
  { code: 'VN', name: 'Vietnam', popular: false },
  // Australia & New Zealand
  { code: 'AU', name: 'Australia (New South Wales)', popular: false },
  { code: 'AU-VIC', name: 'Australia (Victoria)', popular: false },
  { code: 'NZ', name: 'New Zealand', popular: false },
  // Middle East
  { code: 'AE-DIFC', name: 'UAE (DIFC)', popular: true },
  { code: 'AE', name: 'UAE (Mainland)', popular: false },
  { code: 'AE-ADGM', name: 'UAE (ADGM)', popular: false },
  { code: 'SA', name: 'Saudi Arabia', popular: false },
  { code: 'QA', name: 'Qatar', popular: false },
  { code: 'BH', name: 'Bahrain', popular: false },
  { code: 'IL', name: 'Israel', popular: false },
  // Africa
  { code: 'ZA', name: 'South Africa', popular: false },
  { code: 'NG', name: 'Nigeria', popular: false },
  { code: 'KE', name: 'Kenya', popular: false },
  { code: 'GH', name: 'Ghana', popular: false },
  { code: 'EG', name: 'Egypt', popular: false },
  { code: 'MA', name: 'Morocco', popular: false },
  // Latin America
  { code: 'BR', name: 'Brazil', popular: false },
  { code: 'MX', name: 'Mexico', popular: false },
  { code: 'CO', name: 'Colombia', popular: false },
  { code: 'CL', name: 'Chile', popular: false },
  { code: 'AR', name: 'Argentina', popular: false },
  { code: 'PE', name: 'Peru', popular: false },
  // Caribbean & Offshore
  { code: 'KY', name: 'Cayman Islands', popular: true },
  { code: 'BVI', name: 'British Virgin Islands', popular: false },
  { code: 'BM', name: 'Bermuda', popular: false },
  { code: 'BS', name: 'Bahamas', popular: false },
  { code: 'JM', name: 'Jamaica', popular: false },
  { code: 'PR', name: 'Puerto Rico', popular: false },
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
  { id: 'Real Estate', name: 'Real Estate', icon: '🏠' },
  { id: 'Finance', name: 'Finance & Lending', icon: '🏦' },
  { id: 'Construction', name: 'Construction', icon: '🏗️' },
  { id: 'Healthcare', name: 'Healthcare', icon: '🏥' },
  { id: 'Entertainment', name: 'Entertainment & Media', icon: '🎬' },
  { id: 'Sales', name: 'Sales & Distribution', icon: '🚚' },
  { id: 'Personal', name: 'Personal & Family', icon: '👤' },
  { id: 'Custom', name: 'Custom', icon: '✨' }
];

module.exports = { AGREEMENT_TYPES, JURISDICTIONS, CATEGORIES };
