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
  },

  // ── Real Estate ──────────────────────────────────────
  {
    id: 'tpl_commercial_lease',
    name: 'Commercial Lease Agreement',
    description: 'Comprehensive commercial lease for office, retail, or industrial space with NNN and CAM provisions.',
    category: 'Real Estate',
    type: 'lease-commercial',
    price: 2000,
    authorId: 'platform',
    authorName: 'AgreeMint',
    jurisdiction: 'United States (New York)',
    tags: ['lease', 'commercial', 'office', 'retail', 'real estate', 'landlord', 'tenant'],
    rating: 4.7,
    ratingCount: 78,
    purchaseCount: 412,
    content: `# COMMERCIAL LEASE AGREEMENT

This Commercial Lease Agreement ("Lease") is entered into as of [DATE] between:

**Landlord:** [LANDLORD_NAME], with an address at [LANDLORD_ADDRESS] ("Landlord")
**Tenant:** [TENANT_NAME], a [ENTITY_TYPE] organized under the laws of [STATE] ("Tenant")

## 1. PREMISES
Landlord leases to Tenant the premises located at [PROPERTY_ADDRESS], consisting of approximately [SQUARE_FOOTAGE] rentable square feet on the [FLOOR] floor ("Premises"), as outlined in Exhibit A.

## 2. TERM
The Lease term commences on [START_DATE] and expires on [END_DATE] (the "Term"). Tenant shall have [RENEWAL_OPTIONS] option(s) to renew for [RENEWAL_TERM] year(s) each upon [RENEWAL_NOTICE] days' prior written notice.

## 3. BASE RENT
Tenant shall pay monthly base rent of $[MONTHLY_RENT] ($[ANNUAL_RENT_PSF] per rentable square foot per annum), payable in advance on the first day of each calendar month.

### 3.1 Rent Escalation
Base rent shall increase by [ESCALATION_RATE]% on each anniversary of the Commencement Date.

## 4. ADDITIONAL RENT — OPERATING EXPENSES
### 4.1 NNN / Modified Gross
This Lease is structured as a [LEASE_TYPE] lease. Tenant shall pay its Pro Rata Share ([PRO_RATA_SHARE]%) of:
(a) Real property taxes and assessments
(b) Property insurance premiums
(c) Common Area Maintenance (CAM) charges

### 4.2 CAM Charges
Estimated monthly CAM charges: $[CAM_ESTIMATE]. Landlord shall provide annual reconciliation within 90 days of year-end.

## 5. SECURITY DEPOSIT
Tenant shall deposit $[SECURITY_DEPOSIT] as security. Deposit shall be returned within 30 days of Lease termination, less deductions for damages.

## 6. USE OF PREMISES
Tenant shall use the Premises solely for [PERMITTED_USE] and for no other purpose without Landlord's written consent.

## 7. TENANT IMPROVEMENTS
Landlord shall provide a tenant improvement allowance of $[TI_ALLOWANCE] ($[TI_PSF] per square foot). Tenant shall submit plans for Landlord's approval.

## 8. MAINTENANCE AND REPAIRS
Landlord shall maintain structural elements, roof, and building systems. Tenant shall maintain the interior of the Premises in good condition.

## 9. INSURANCE
Tenant shall maintain commercial general liability insurance with limits of not less than $[INSURANCE_LIMIT] per occurrence and $[INSURANCE_AGGREGATE] aggregate.

## 10. ASSIGNMENT AND SUBLETTING
Tenant shall not assign or sublet without Landlord's prior written consent, which shall not be unreasonably withheld.

## 11. DEFAULT AND REMEDIES
If Tenant fails to pay rent within [GRACE_PERIOD] days or breaches any term, Landlord may pursue remedies including termination, re-entry, and damages.

## 12. GOVERNING LAW
This Lease is governed by the laws of [JURISDICTION].

IN WITNESS WHEREOF, the parties have executed this Lease as of the date first written above.`,
    variables: ['LANDLORD_NAME', 'LANDLORD_ADDRESS', 'TENANT_NAME', 'ENTITY_TYPE', 'STATE', 'PROPERTY_ADDRESS', 'SQUARE_FOOTAGE', 'FLOOR', 'START_DATE', 'END_DATE', 'RENEWAL_OPTIONS', 'RENEWAL_TERM', 'RENEWAL_NOTICE', 'MONTHLY_RENT', 'ANNUAL_RENT_PSF', 'ESCALATION_RATE', 'LEASE_TYPE', 'PRO_RATA_SHARE', 'CAM_ESTIMATE', 'SECURITY_DEPOSIT', 'PERMITTED_USE', 'TI_ALLOWANCE', 'TI_PSF', 'INSURANCE_LIMIT', 'INSURANCE_AGGREGATE', 'GRACE_PERIOD', 'JURISDICTION', 'DATE'],
    featured: true,
    createdAt: '2025-02-15T00:00:00.000Z'
  },
  {
    id: 'tpl_residential_lease',
    name: 'Residential Lease Agreement',
    description: 'Standard residential rental agreement between landlord and tenant with security deposit and maintenance provisions.',
    category: 'Real Estate',
    type: 'lease-residential',
    price: 800,
    authorId: 'platform',
    authorName: 'AgreeMint',
    jurisdiction: 'United States (California)',
    tags: ['lease', 'residential', 'rental', 'apartment', 'house', 'landlord', 'tenant'],
    rating: 4.6,
    ratingCount: 156,
    purchaseCount: 1245,
    content: `# RESIDENTIAL LEASE AGREEMENT

This Residential Lease Agreement ("Lease") is dated [DATE] between:

**Landlord:** [LANDLORD_NAME] ("Landlord")
**Tenant:** [TENANT_NAME] ("Tenant")

## 1. PROPERTY
Landlord leases to Tenant the property located at [PROPERTY_ADDRESS] ("Premises"), including [INCLUDED_ITEMS].

## 2. TERM
This Lease begins on [START_DATE] and ends on [END_DATE]. After the initial term, the Lease converts to a month-to-month tenancy unless either party gives [NOTICE_DAYS] days' written notice.

## 3. RENT
Monthly rent is $[MONTHLY_RENT], due on the [DUE_DAY] of each month. Late fee of $[LATE_FEE] applies after [GRACE_DAYS] grace days.

## 4. SECURITY DEPOSIT
Tenant shall pay a security deposit of $[SECURITY_DEPOSIT]. Deposit will be returned within [RETURN_DAYS] days of move-out, less deductions for damages beyond normal wear and tear.

## 5. UTILITIES
Tenant shall pay: [TENANT_UTILITIES]. Landlord shall pay: [LANDLORD_UTILITIES].

## 6. OCCUPANCY
The Premises shall be occupied only by: [AUTHORIZED_OCCUPANTS]. Maximum occupancy: [MAX_OCCUPANTS] persons.

## 7. PETS
[PET_POLICY]. Pet deposit: $[PET_DEPOSIT].

## 8. MAINTENANCE
Tenant shall maintain the Premises in clean and sanitary condition. Landlord is responsible for structural repairs and major systems.

## 9. ENTRY BY LANDLORD
Landlord may enter with [ENTRY_NOTICE] hours' notice for repairs, inspections, or showings, except in emergencies.

## 10. TERMINATION
Either party may terminate with [TERMINATION_NOTICE] days' written notice. Early termination fee: $[EARLY_TERMINATION_FEE].

## 11. GOVERNING LAW
This Lease is governed by the laws of [JURISDICTION].

AGREED AND SIGNED:`,
    variables: ['LANDLORD_NAME', 'TENANT_NAME', 'PROPERTY_ADDRESS', 'INCLUDED_ITEMS', 'START_DATE', 'END_DATE', 'NOTICE_DAYS', 'MONTHLY_RENT', 'DUE_DAY', 'LATE_FEE', 'GRACE_DAYS', 'SECURITY_DEPOSIT', 'RETURN_DAYS', 'TENANT_UTILITIES', 'LANDLORD_UTILITIES', 'AUTHORIZED_OCCUPANTS', 'MAX_OCCUPANTS', 'PET_POLICY', 'PET_DEPOSIT', 'ENTRY_NOTICE', 'TERMINATION_NOTICE', 'EARLY_TERMINATION_FEE', 'JURISDICTION', 'DATE'],
    featured: true,
    createdAt: '2025-02-15T00:00:00.000Z'
  },
  {
    id: 'tpl_purchase_agreement',
    name: 'Real Estate Purchase Agreement',
    description: 'Standard contract for the sale and purchase of real property with contingencies, inspections, and closing provisions.',
    category: 'Real Estate',
    type: 'purchase-agreement',
    price: 1500,
    authorId: 'platform',
    authorName: 'AgreeMint',
    jurisdiction: 'United States (Texas)',
    tags: ['purchase', 'sale', 'real estate', 'property', 'closing', 'escrow'],
    rating: 4.8,
    ratingCount: 67,
    purchaseCount: 334,
    content: `# REAL ESTATE PURCHASE AGREEMENT

This Purchase Agreement ("Agreement") is entered into on [DATE] between:

**Seller:** [SELLER_NAME] ("Seller")
**Buyer:** [BUYER_NAME] ("Buyer")

## 1. PROPERTY
Seller agrees to sell and Buyer agrees to purchase the real property located at [PROPERTY_ADDRESS], legally described as [LEGAL_DESCRIPTION] ("Property").

## 2. PURCHASE PRICE
The total purchase price is $[PURCHASE_PRICE] payable as follows:
(a) Earnest money deposit: $[EARNEST_MONEY] within [DEPOSIT_DAYS] days
(b) Balance at closing: $[BALANCE_AT_CLOSING]

## 3. FINANCING CONTINGENCY
This Agreement is contingent upon Buyer obtaining [FINANCING_TYPE] financing with:
- Loan amount: $[LOAN_AMOUNT]
- Interest rate not exceeding [MAX_INTEREST_RATE]%
- Term: [LOAN_TERM] years
Buyer shall apply within [APPLICATION_DAYS] days and obtain commitment within [COMMITMENT_DAYS] days.

## 4. INSPECTION CONTINGENCY
Buyer has [INSPECTION_DAYS] days to conduct inspections. Buyer may request repairs, negotiate credits, or terminate.

## 5. APPRAISAL CONTINGENCY
This Agreement is contingent upon the Property appraising at not less than $[APPRAISAL_MINIMUM].

## 6. TITLE
Seller shall convey marketable title by [DEED_TYPE] deed, free of encumbrances except [PERMITTED_EXCEPTIONS].

## 7. CLOSING
Closing shall occur on or before [CLOSING_DATE] at [CLOSING_LOCATION]. Closing costs allocated per local custom.

## 8. POSSESSION
Buyer shall receive possession on [POSSESSION_DATE].

## 9. HOME WARRANTY
[WARRANTY_PROVISION]

## 10. DEFAULT
If Buyer defaults, Seller may retain earnest money as liquidated damages. If Seller defaults, Buyer may pursue specific performance.

## 11. GOVERNING LAW
This Agreement is governed by the laws of [JURISDICTION].`,
    variables: ['SELLER_NAME', 'BUYER_NAME', 'PROPERTY_ADDRESS', 'LEGAL_DESCRIPTION', 'PURCHASE_PRICE', 'EARNEST_MONEY', 'DEPOSIT_DAYS', 'BALANCE_AT_CLOSING', 'FINANCING_TYPE', 'LOAN_AMOUNT', 'MAX_INTEREST_RATE', 'LOAN_TERM', 'APPLICATION_DAYS', 'COMMITMENT_DAYS', 'INSPECTION_DAYS', 'APPRAISAL_MINIMUM', 'DEED_TYPE', 'PERMITTED_EXCEPTIONS', 'CLOSING_DATE', 'CLOSING_LOCATION', 'POSSESSION_DATE', 'WARRANTY_PROVISION', 'JURISDICTION', 'DATE'],
    featured: false,
    createdAt: '2025-02-20T00:00:00.000Z'
  },

  // ── Healthcare ───────────────────────────────────────
  {
    id: 'tpl_hipaa_baa',
    name: 'HIPAA Business Associate Agreement',
    description: 'HIPAA-compliant BAA for business associates handling protected health information (PHI).',
    category: 'Healthcare',
    type: 'baa',
    price: 1200,
    authorId: 'platform',
    authorName: 'AgreeMint',
    jurisdiction: 'United States (Delaware)',
    tags: ['hipaa', 'baa', 'healthcare', 'phi', 'compliance', 'medical'],
    rating: 4.9,
    ratingCount: 54,
    purchaseCount: 389,
    content: `# BUSINESS ASSOCIATE AGREEMENT

This Business Associate Agreement ("BAA") is entered into as of [DATE] between:

**Covered Entity:** [COVERED_ENTITY_NAME] ("Covered Entity")
**Business Associate:** [BA_NAME] ("Business Associate")

pursuant to the Health Insurance Portability and Accountability Act of 1996 ("HIPAA"), the Health Information Technology for Economic and Clinical Health Act ("HITECH Act"), and applicable regulations (collectively, "HIPAA Rules").

## 1. DEFINITIONS
Terms used in this BAA shall have the same meaning as in the HIPAA Rules. "Protected Health Information" or "PHI" means individually identifiable health information.

## 2. OBLIGATIONS OF BUSINESS ASSOCIATE
Business Associate agrees to:
(a) Use or disclose PHI only as permitted under this BAA or as Required by Law
(b) Implement appropriate Administrative, Physical, and Technical Safeguards
(c) Report any Security Incident or Breach to Covered Entity within [BREACH_NOTICE_HOURS] hours
(d) Ensure subcontractors agree to the same restrictions (flow-down)
(e) Make PHI available to individuals for access and amendment requests
(f) Maintain an accounting of disclosures for [ACCOUNTING_YEARS] years
(g) Make internal practices available to HHS for compliance review

## 3. PERMITTED USES AND DISCLOSURES
Business Associate may use PHI for: [PERMITTED_PURPOSES]

Business Associate may not use or disclose PHI for marketing, sale of PHI, or fundraising without prior written authorization.

## 4. MINIMUM NECESSARY STANDARD
Business Associate shall limit use and disclosure to the minimum amount of PHI necessary to accomplish the intended purpose.

## 5. SECURITY REQUIREMENTS
Business Associate shall implement security measures including:
(a) Encryption of PHI at rest and in transit
(b) Access controls and authentication
(c) Audit logging and monitoring
(d) Employee training on HIPAA compliance
(e) Regular risk assessments

## 6. BREACH NOTIFICATION
Business Associate shall notify Covered Entity of any Breach of Unsecured PHI without unreasonable delay and no later than [BREACH_NOTICE_HOURS] hours after discovery.

## 7. TERM AND TERMINATION
This BAA is effective for [TERM_YEARS] years and may be terminated by either party for material breach with [CURE_DAYS] days' opportunity to cure.

## 8. RETURN/DESTRUCTION OF PHI
Upon termination, Business Associate shall return or destroy all PHI within [DESTRUCTION_DAYS] days and certify destruction in writing.

## 9. INDEMNIFICATION
Business Associate shall indemnify Covered Entity against any claims arising from Business Associate's breach of this BAA.

## 10. GOVERNING LAW
This BAA is governed by the laws of [JURISDICTION] and applicable federal law.`,
    variables: ['COVERED_ENTITY_NAME', 'BA_NAME', 'BREACH_NOTICE_HOURS', 'ACCOUNTING_YEARS', 'PERMITTED_PURPOSES', 'TERM_YEARS', 'CURE_DAYS', 'DESTRUCTION_DAYS', 'JURISDICTION', 'DATE'],
    featured: true,
    createdAt: '2025-02-20T00:00:00.000Z'
  },
  {
    id: 'tpl_telehealth',
    name: 'Telehealth Services Agreement',
    description: 'Terms for providing healthcare services via telemedicine platforms, compliant with state telehealth laws.',
    category: 'Healthcare',
    type: 'telehealth',
    price: 1500,
    authorId: 'platform',
    authorName: 'AgreeMint',
    jurisdiction: 'United States (California)',
    tags: ['telehealth', 'telemedicine', 'healthcare', 'virtual', 'medical', 'remote'],
    rating: 4.6,
    ratingCount: 34,
    purchaseCount: 178,
    content: `# TELEHEALTH SERVICES AGREEMENT

This Telehealth Services Agreement ("Agreement") is effective as of [DATE] between:

**Provider:** [PROVIDER_NAME], a [PROVIDER_TYPE] licensed in [PROVIDER_STATE] ("Provider")
**Patient/Client:** [PATIENT_NAME] ("Patient")

## 1. SERVICES
Provider will deliver telehealth services including: [SERVICES_DESCRIPTION] via [PLATFORM_NAME] platform.

## 2. INFORMED CONSENT
Patient acknowledges and consents to:
(a) Services delivered via video, audio, or secure messaging
(b) Technology limitations and potential disruptions
(c) Emergency protocols — Patient must call 911 for emergencies
(d) Patient location: [PATIENT_STATE] (Provider must be licensed in this state)

## 3. PRIVACY AND SECURITY
Provider shall maintain HIPAA-compliant technology and practices. Sessions may be recorded only with Patient's explicit consent.

## 4. FEES AND PAYMENT
Consultation fee: $[CONSULTATION_FEE] per [SESSION_TYPE]. Payment due [PAYMENT_TERMS]. Insurance billing: [INSURANCE_ACCEPTED].

## 5. PRESCRIPTIONS
Provider [MAY_PRESCRIBE] prescribe medications via telehealth in accordance with [STATE] law and DEA regulations.

## 6. MEDICAL RECORDS
Records maintained for [RECORD_RETENTION] years per state requirements. Patient may request records at any time.

## 7. LIMITATIONS
Telehealth is not appropriate for all conditions. Provider retains discretion to require in-person evaluation.

## 8. TERMINATION
Either party may terminate with [NOTICE_DAYS] days' notice. Provider shall assist with continuity of care upon termination.

## 9. GOVERNING LAW
This Agreement is governed by the laws of [JURISDICTION].`,
    variables: ['PROVIDER_NAME', 'PROVIDER_TYPE', 'PROVIDER_STATE', 'PATIENT_NAME', 'SERVICES_DESCRIPTION', 'PLATFORM_NAME', 'PATIENT_STATE', 'CONSULTATION_FEE', 'SESSION_TYPE', 'PAYMENT_TERMS', 'INSURANCE_ACCEPTED', 'MAY_PRESCRIBE', 'STATE', 'RECORD_RETENTION', 'NOTICE_DAYS', 'JURISDICTION', 'DATE'],
    featured: false,
    createdAt: '2025-02-25T00:00:00.000Z'
  },

  // ── Construction ─────────────────────────────────────
  {
    id: 'tpl_construction',
    name: 'Construction Contract',
    description: 'General construction contract with scope, schedule, payment applications, change orders, and warranty provisions.',
    category: 'Construction',
    type: 'construction',
    price: 2000,
    authorId: 'platform',
    authorName: 'AgreeMint',
    jurisdiction: 'United States (Florida)',
    tags: ['construction', 'contractor', 'building', 'renovation', 'general contractor'],
    rating: 4.7,
    ratingCount: 45,
    purchaseCount: 267,
    content: `# CONSTRUCTION CONTRACT

This Construction Contract ("Contract") is entered into as of [DATE] between:

**Owner:** [OWNER_NAME] ("Owner")
**Contractor:** [CONTRACTOR_NAME], License #[CONTRACTOR_LICENSE] ("Contractor")

## 1. PROJECT
Contractor shall furnish all labor, materials, and equipment to complete: [PROJECT_DESCRIPTION] at [PROJECT_ADDRESS] ("Project").

## 2. CONTRACT SUM
The total contract sum is $[CONTRACT_AMOUNT]. Pricing basis: [PRICING_TYPE] (Fixed Price / Cost Plus / GMP).

## 3. SCHEDULE
- Commencement Date: [START_DATE]
- Substantial Completion: [COMPLETION_DATE]
- Final Completion: [FINAL_COMPLETION_DATE]
- Liquidated Damages: $[DAILY_LD] per day for late completion

## 4. PAYMENT
### 4.1 Progress Payments
Contractor shall submit monthly payment applications. Owner shall pay within [PAYMENT_DAYS] days of approved application.

### 4.2 Retainage
Owner shall retain [RETAINAGE_PERCENT]% of each payment until substantial completion.

## 5. CHANGE ORDERS
No changes without written Change Order signed by both parties. Change orders shall include adjusted cost and schedule.

## 6. INSURANCE
Contractor shall maintain:
(a) Commercial General Liability: $[CGL_LIMIT] per occurrence
(b) Workers' Compensation: statutory limits
(c) Builder's Risk: full replacement value

## 7. WARRANTY
Contractor warrants all work for [WARRANTY_YEARS] year(s) from substantial completion.

## 8. LIEN WAIVERS
Contractor shall provide conditional lien waivers with each payment application and unconditional waivers upon payment.

## 9. DISPUTE RESOLUTION
Disputes shall be resolved through: [DISPUTE_METHOD] (Mediation / Arbitration / Litigation) in [JURISDICTION].

## 10. GOVERNING LAW
This Contract is governed by the laws of [JURISDICTION].`,
    variables: ['OWNER_NAME', 'CONTRACTOR_NAME', 'CONTRACTOR_LICENSE', 'PROJECT_DESCRIPTION', 'PROJECT_ADDRESS', 'CONTRACT_AMOUNT', 'PRICING_TYPE', 'START_DATE', 'COMPLETION_DATE', 'FINAL_COMPLETION_DATE', 'DAILY_LD', 'PAYMENT_DAYS', 'RETAINAGE_PERCENT', 'CGL_LIMIT', 'WARRANTY_YEARS', 'DISPUTE_METHOD', 'JURISDICTION', 'DATE'],
    featured: true,
    createdAt: '2025-03-01T00:00:00.000Z'
  },
  {
    id: 'tpl_subcontractor',
    name: 'Subcontractor Agreement',
    description: 'Agreement between general contractor and subcontractor with flow-down provisions and lien waivers.',
    category: 'Construction',
    type: 'subcontractor',
    price: 1000,
    authorId: 'platform',
    authorName: 'AgreeMint',
    jurisdiction: 'United States (Texas)',
    tags: ['subcontractor', 'construction', 'trade', 'plumbing', 'electrical', 'hvac'],
    rating: 4.5,
    ratingCount: 38,
    purchaseCount: 198,
    content: `# SUBCONTRACTOR AGREEMENT

This Subcontractor Agreement ("Agreement") is dated [DATE] between:

**Contractor:** [CONTRACTOR_NAME] ("Contractor")
**Subcontractor:** [SUBCONTRACTOR_NAME], License #[SUB_LICENSE] ("Subcontractor")

## 1. PROJECT
Project: [PROJECT_NAME] located at [PROJECT_ADDRESS]
Owner: [OWNER_NAME]

## 2. SCOPE OF WORK
Subcontractor shall perform: [SCOPE_OF_WORK] as described in Exhibit A.

## 3. CONTRACT SUM
Subcontract price: $[SUBCONTRACT_AMOUNT]. Payment terms: [PAYMENT_TERMS].

## 4. SCHEDULE
- Start Date: [START_DATE]
- Completion Date: [COMPLETION_DATE]
- Subcontractor shall comply with the Project schedule.

## 5. FLOW-DOWN
All applicable terms of the Prime Contract between Contractor and Owner are incorporated by reference.

## 6. INSURANCE
Subcontractor shall maintain commercial general liability ($[INSURANCE_LIMIT] per occurrence) and workers' compensation (statutory).

## 7. LIEN WAIVERS
Subcontractor shall provide conditional lien waivers with each pay application and unconditional waivers upon payment.

## 8. WARRANTY
Subcontractor warrants work for [WARRANTY_PERIOD] from date of acceptance.

## 9. INDEMNIFICATION
Subcontractor shall indemnify Contractor against claims arising from Subcontractor's work.

## 10. GOVERNING LAW
Governed by the laws of [JURISDICTION].`,
    variables: ['CONTRACTOR_NAME', 'SUBCONTRACTOR_NAME', 'SUB_LICENSE', 'PROJECT_NAME', 'PROJECT_ADDRESS', 'OWNER_NAME', 'SCOPE_OF_WORK', 'SUBCONTRACT_AMOUNT', 'PAYMENT_TERMS', 'START_DATE', 'COMPLETION_DATE', 'INSURANCE_LIMIT', 'WARRANTY_PERIOD', 'JURISDICTION', 'DATE'],
    featured: false,
    createdAt: '2025-03-01T00:00:00.000Z'
  },

  // ── Entertainment & Media ────────────────────────────
  {
    id: 'tpl_talent',
    name: 'Talent / Artist Agreement',
    description: 'Engagement agreement for talent, actors, musicians, or influencers with compensation and rights provisions.',
    category: 'Entertainment',
    type: 'talent',
    price: 1200,
    authorId: 'platform',
    authorName: 'AgreeMint',
    jurisdiction: 'United States (California)',
    tags: ['talent', 'artist', 'actor', 'musician', 'influencer', 'entertainment'],
    rating: 4.6,
    ratingCount: 42,
    purchaseCount: 234,
    content: `# TALENT / ARTIST AGREEMENT

This Talent Agreement ("Agreement") is entered into as of [DATE] between:

**Producer/Client:** [CLIENT_NAME] ("Client")
**Talent:** [TALENT_NAME], p/k/a [STAGE_NAME] ("Talent")

## 1. ENGAGEMENT
Client engages Talent to provide: [SERVICES_DESCRIPTION] for: [PROJECT_NAME].

## 2. TERM
Engagement period: [START_DATE] through [END_DATE]. Shooting/recording dates: [PRODUCTION_DATES].

## 3. COMPENSATION
(a) Base fee: $[BASE_FEE]
(b) Residuals/royalties: [RESIDUAL_TERMS]
(c) Per diem: $[PER_DIEM] per production day
(d) Travel and accommodation: [TRAVEL_PROVISIONS]

## 4. GRANT OF RIGHTS
Talent grants Client [RIGHTS_GRANTED] rights to use Talent's name, likeness, voice, and performance in connection with [USAGE_DESCRIPTION] for [USAGE_TERM] in [TERRITORY].

## 5. EXCLUSIVITY
During the term, Talent [EXCLUSIVITY_TERMS].

## 6. CREDIT
Talent shall receive credit as: [CREDIT_FORMAT]. Position: [CREDIT_POSITION].

## 7. APPROVAL RIGHTS
Talent has approval over: [APPROVAL_RIGHTS].

## 8. MORALS CLAUSE
If Talent engages in conduct that brings disrepute, Client may terminate this Agreement.

## 9. UNION STATUS
Talent [IS_UNION] a member of [UNION_NAME]. This engagement [IS_UNION_PRODUCTION] subject to union requirements.

## 10. GOVERNING LAW
This Agreement is governed by the laws of [JURISDICTION].`,
    variables: ['CLIENT_NAME', 'TALENT_NAME', 'STAGE_NAME', 'SERVICES_DESCRIPTION', 'PROJECT_NAME', 'START_DATE', 'END_DATE', 'PRODUCTION_DATES', 'BASE_FEE', 'RESIDUAL_TERMS', 'PER_DIEM', 'TRAVEL_PROVISIONS', 'RIGHTS_GRANTED', 'USAGE_DESCRIPTION', 'USAGE_TERM', 'TERRITORY', 'EXCLUSIVITY_TERMS', 'CREDIT_FORMAT', 'CREDIT_POSITION', 'APPROVAL_RIGHTS', 'IS_UNION', 'UNION_NAME', 'IS_UNION_PRODUCTION', 'JURISDICTION', 'DATE'],
    featured: true,
    createdAt: '2025-03-05T00:00:00.000Z'
  },
  {
    id: 'tpl_content_license',
    name: 'Content / Music License',
    description: 'License digital content including music, video, images, or written works with sync and usage rights.',
    category: 'Entertainment',
    type: 'content-license',
    price: 800,
    authorId: 'platform',
    authorName: 'AgreeMint',
    jurisdiction: 'United States (New York)',
    tags: ['content', 'music', 'license', 'sync', 'media', 'publishing', 'copyright'],
    rating: 4.5,
    ratingCount: 56,
    purchaseCount: 312,
    content: `# CONTENT LICENSE AGREEMENT

This Content License Agreement ("Agreement") is dated [DATE] between:

**Licensor:** [LICENSOR_NAME] ("Licensor")
**Licensee:** [LICENSEE_NAME] ("Licensee")

## 1. LICENSED CONTENT
Licensor grants Licensee a license to use: [CONTENT_DESCRIPTION] ("Content") as described in Exhibit A.

## 2. LICENSE GRANT
[EXCLUSIVITY] [LICENSE_SCOPE] license to [PERMITTED_USES] the Content in [TERRITORY] for [LICENSE_TERM].

## 3. PERMITTED USES
Content may be used for: [PERMITTED_MEDIA] including [DISTRIBUTION_CHANNELS].

## 4. RESTRICTIONS
Licensee shall not: (a) sublicense without consent, (b) modify the Content without approval, (c) use beyond the scope, (d) remove credits or watermarks.

## 5. COMPENSATION
(a) License fee: $[LICENSE_FEE]
(b) Royalties: [ROYALTY_RATE]% of [ROYALTY_BASE]
(c) Advances: $[ADVANCE_AMOUNT]
(d) Payment schedule: [PAYMENT_SCHEDULE]

## 6. CREDIT
Licensee shall credit Licensor as: [CREDIT_TEXT].

## 7. REPRESENTATIONS
Licensor represents it owns all rights to the Content and has authority to grant this license.

## 8. TERMINATION
This license terminates on [EXPIRATION_DATE] or upon material breach with [CURE_DAYS] days to cure.

## 9. GOVERNING LAW
Governed by the laws of [JURISDICTION].`,
    variables: ['LICENSOR_NAME', 'LICENSEE_NAME', 'CONTENT_DESCRIPTION', 'EXCLUSIVITY', 'LICENSE_SCOPE', 'PERMITTED_USES', 'TERRITORY', 'LICENSE_TERM', 'PERMITTED_MEDIA', 'DISTRIBUTION_CHANNELS', 'LICENSE_FEE', 'ROYALTY_RATE', 'ROYALTY_BASE', 'ADVANCE_AMOUNT', 'PAYMENT_SCHEDULE', 'CREDIT_TEXT', 'EXPIRATION_DATE', 'CURE_DAYS', 'JURISDICTION', 'DATE'],
    featured: false,
    createdAt: '2025-03-05T00:00:00.000Z'
  },

  // ── Finance & Lending ────────────────────────────────
  {
    id: 'tpl_loan',
    name: 'Loan Agreement',
    description: 'Comprehensive loan agreement with interest, repayment schedule, collateral, and default provisions.',
    category: 'Finance',
    type: 'loan',
    price: 1200,
    authorId: 'platform',
    authorName: 'AgreeMint',
    jurisdiction: 'United States (Delaware)',
    tags: ['loan', 'lending', 'finance', 'interest', 'collateral', 'debt'],
    rating: 4.7,
    ratingCount: 63,
    purchaseCount: 356,
    content: `# LOAN AGREEMENT

This Loan Agreement ("Agreement") is dated [DATE] between:

**Lender:** [LENDER_NAME] ("Lender")
**Borrower:** [BORROWER_NAME] ("Borrower")

## 1. LOAN AMOUNT
Lender agrees to lend Borrower the principal sum of $[LOAN_AMOUNT] ("Loan").

## 2. INTEREST
Interest rate: [INTEREST_RATE]% per annum, calculated on a [CALCULATION_BASIS] basis. Default interest: additional [DEFAULT_RATE]% above the stated rate.

## 3. REPAYMENT
(a) Monthly payment: $[MONTHLY_PAYMENT]
(b) First payment date: [FIRST_PAYMENT_DATE]
(c) Maturity date: [MATURITY_DATE]
(d) Amortization: [AMORTIZATION_TYPE]

## 4. PREPAYMENT
Borrower [MAY_PREPAY] prepay without penalty. [PREPAYMENT_TERMS].

## 5. COLLATERAL
The Loan is [SECURED_STATUS]. Collateral: [COLLATERAL_DESCRIPTION]. Borrower grants a security interest in the collateral.

## 6. REPRESENTATIONS
Borrower represents that: financial statements are accurate, no pending litigation materially affecting ability to repay, and authority to enter this Agreement.

## 7. COVENANTS
Borrower shall: (a) maintain insurance on collateral, (b) provide financial statements [REPORTING_FREQUENCY], (c) not incur additional debt exceeding $[DEBT_LIMIT] without consent.

## 8. EVENTS OF DEFAULT
(a) Failure to make payment within [GRACE_DAYS] days
(b) Breach of any covenant
(c) Bankruptcy or insolvency
(d) Material adverse change

## 9. REMEDIES
Upon default, Lender may accelerate the entire balance, exercise rights against collateral, and pursue legal remedies.

## 10. GOVERNING LAW
Governed by the laws of [JURISDICTION].`,
    variables: ['LENDER_NAME', 'BORROWER_NAME', 'LOAN_AMOUNT', 'INTEREST_RATE', 'CALCULATION_BASIS', 'DEFAULT_RATE', 'MONTHLY_PAYMENT', 'FIRST_PAYMENT_DATE', 'MATURITY_DATE', 'AMORTIZATION_TYPE', 'MAY_PREPAY', 'PREPAYMENT_TERMS', 'SECURED_STATUS', 'COLLATERAL_DESCRIPTION', 'REPORTING_FREQUENCY', 'DEBT_LIMIT', 'GRACE_DAYS', 'JURISDICTION', 'DATE'],
    featured: true,
    createdAt: '2025-03-10T00:00:00.000Z'
  },
  {
    id: 'tpl_promissory_note',
    name: 'Promissory Note',
    description: 'Simple promissory note for personal or business loans between parties.',
    category: 'Finance',
    type: 'promissory-note',
    price: 500,
    authorId: 'platform',
    authorName: 'AgreeMint',
    jurisdiction: 'Global',
    tags: ['note', 'promissory', 'loan', 'iou', 'debt', 'personal'],
    rating: 4.8,
    ratingCount: 89,
    purchaseCount: 678,
    content: `# PROMISSORY NOTE

**Principal Amount:** $[PRINCIPAL_AMOUNT]
**Date:** [DATE]
**Location:** [LOCATION]

FOR VALUE RECEIVED, [BORROWER_NAME] ("Maker") promises to pay to the order of [LENDER_NAME] ("Payee") the principal sum of $[PRINCIPAL_AMOUNT], together with interest at the rate of [INTEREST_RATE]% per annum.

## PAYMENT TERMS
[PAYMENT_SCHEDULE]

Payments shall commence on [FIRST_PAYMENT_DATE] and continue until the principal and all accrued interest are paid in full.

## MATURITY
The entire unpaid balance of principal and interest shall be due and payable on [MATURITY_DATE].

## PREPAYMENT
This Note [MAY_PREPAY] be prepaid in whole or in part without penalty.

## LATE CHARGES
If any payment is more than [GRACE_DAYS] days late, Maker shall pay a late charge of [LATE_FEE_PERCENT]% of the overdue amount.

## DEFAULT
The entire unpaid balance becomes immediately due upon: failure to make any payment when due, Maker's bankruptcy, or any material misrepresentation.

## WAIVER
Maker waives presentment, demand, notice of dishonor, and protest.

## GOVERNING LAW
This Note is governed by the laws of [JURISDICTION].

____________________________
[BORROWER_NAME], Maker

____________________________
[LENDER_NAME], Payee`,
    variables: ['BORROWER_NAME', 'LENDER_NAME', 'PRINCIPAL_AMOUNT', 'INTEREST_RATE', 'PAYMENT_SCHEDULE', 'FIRST_PAYMENT_DATE', 'MATURITY_DATE', 'MAY_PREPAY', 'GRACE_DAYS', 'LATE_FEE_PERCENT', 'JURISDICTION', 'DATE', 'LOCATION'],
    featured: false,
    createdAt: '2025-03-10T00:00:00.000Z'
  },

  // ── Sales & Distribution ─────────────────────────────
  {
    id: 'tpl_distribution',
    name: 'Distribution Agreement',
    description: 'Appoint a distributor for products in a defined territory with exclusivity and performance requirements.',
    category: 'Sales',
    type: 'distribution',
    price: 1500,
    authorId: 'platform',
    authorName: 'AgreeMint',
    jurisdiction: 'United States (New York)',
    tags: ['distribution', 'distributor', 'wholesale', 'territory', 'channel'],
    rating: 4.6,
    ratingCount: 34,
    purchaseCount: 187,
    content: `# DISTRIBUTION AGREEMENT

This Distribution Agreement ("Agreement") is dated [DATE] between:

**Supplier:** [SUPPLIER_NAME] ("Supplier")
**Distributor:** [DISTRIBUTOR_NAME] ("Distributor")

## 1. APPOINTMENT
Supplier appoints Distributor as its [EXCLUSIVITY] distributor for the Products listed in Exhibit A within [TERRITORY] ("Territory").

## 2. PRODUCTS
Products: [PRODUCT_DESCRIPTION]. Supplier may modify product line with [MODIFICATION_NOTICE] days' notice.

## 3. TERM
Initial term: [INITIAL_TERM] years, commencing [START_DATE]. Auto-renews for [RENEWAL_TERM] year periods unless terminated with [NOTICE_DAYS] days' notice.

## 4. MINIMUM PURCHASE
Distributor commits to minimum annual purchases of $[MINIMUM_PURCHASE]. Failure to meet minimums may result in loss of exclusivity.

## 5. PRICING AND PAYMENT
(a) Distributor discount: [DISCOUNT_PERCENT]% off MSRP
(b) Payment terms: net [PAYMENT_DAYS] days
(c) Supplier may adjust pricing with [PRICE_NOTICE] days' notice

## 6. MARKETING
Distributor shall use commercially reasonable efforts to promote and sell Products. Distributor shall not make unauthorized claims about Products.

## 7. INTELLECTUAL PROPERTY
Distributor may use Supplier's trademarks solely for authorized distribution. All IP remains Supplier's property.

## 8. WARRANTY AND RETURNS
Supplier provides standard product warranty of [WARRANTY_PERIOD]. Returns subject to Supplier's return policy.

## 9. NON-COMPETE
During the term and [NON_COMPETE_MONTHS] months after, Distributor shall not distribute competing products in the Territory.

## 10. GOVERNING LAW
Governed by the laws of [JURISDICTION].`,
    variables: ['SUPPLIER_NAME', 'DISTRIBUTOR_NAME', 'EXCLUSIVITY', 'TERRITORY', 'PRODUCT_DESCRIPTION', 'MODIFICATION_NOTICE', 'INITIAL_TERM', 'START_DATE', 'RENEWAL_TERM', 'NOTICE_DAYS', 'MINIMUM_PURCHASE', 'DISCOUNT_PERCENT', 'PAYMENT_DAYS', 'PRICE_NOTICE', 'WARRANTY_PERIOD', 'NON_COMPETE_MONTHS', 'JURISDICTION', 'DATE'],
    featured: false,
    createdAt: '2025-03-15T00:00:00.000Z'
  },
  {
    id: 'tpl_franchise',
    name: 'Franchise Agreement',
    description: 'Grant franchise rights including brand, systems, territory, fees, and operational requirements.',
    category: 'Sales',
    type: 'franchise',
    price: 2500,
    authorId: 'platform',
    authorName: 'AgreeMint',
    jurisdiction: 'United States (Delaware)',
    tags: ['franchise', 'brand', 'license', 'restaurant', 'retail', 'business'],
    rating: 4.8,
    ratingCount: 28,
    purchaseCount: 145,
    content: `# FRANCHISE AGREEMENT

This Franchise Agreement ("Agreement") is entered into as of [DATE] between:

**Franchisor:** [FRANCHISOR_NAME] ("Franchisor")
**Franchisee:** [FRANCHISEE_NAME] ("Franchisee")

## 1. GRANT OF FRANCHISE
Franchisor grants Franchisee the right to operate a [BRAND_NAME] franchise at [LOCATION_ADDRESS] ("Franchised Business").

## 2. TERRITORY
Franchisee receives a [TERRITORY_TYPE] territory defined as: [TERRITORY_DESCRIPTION]. [TERRITORY_PROTECTION].

## 3. TERM
Initial term: [INITIAL_TERM] years. Renewal: [RENEWAL_TERMS].

## 4. FEES
(a) Initial franchise fee: $[INITIAL_FEE]
(b) Ongoing royalty: [ROYALTY_PERCENT]% of gross revenue
(c) Advertising fund: [AD_FUND_PERCENT]% of gross revenue
(d) Technology fee: $[TECH_FEE] per month
(e) Transfer fee: $[TRANSFER_FEE]

## 5. TRAINING AND SUPPORT
Franchisor shall:
(a) Provide [TRAINING_DURATION] of initial training
(b) Supply operations manual
(c) Ongoing support via [SUPPORT_CHANNELS]

## 6. OPERATIONS
Franchisee shall:
(a) Operate in accordance with the Operations Manual
(b) Maintain quality standards
(c) Use only approved suppliers
(d) Maintain required operating hours

## 7. INTELLECTUAL PROPERTY
Franchisee may use the Marks solely in connection with the Franchised Business. All IP remains Franchisor's property.

## 8. NON-COMPETE
During the term and [POST_TERM_MONTHS] months after, Franchisee shall not operate a competing business within [NON_COMPETE_RADIUS] miles.

## 9. TERMINATION
Franchisor may terminate for: failure to pay fees, breach of operations standards, bankruptcy, or abandonment.

## 10. GOVERNING LAW
Governed by the laws of [JURISDICTION].`,
    variables: ['FRANCHISOR_NAME', 'FRANCHISEE_NAME', 'BRAND_NAME', 'LOCATION_ADDRESS', 'TERRITORY_TYPE', 'TERRITORY_DESCRIPTION', 'TERRITORY_PROTECTION', 'INITIAL_TERM', 'RENEWAL_TERMS', 'INITIAL_FEE', 'ROYALTY_PERCENT', 'AD_FUND_PERCENT', 'TECH_FEE', 'TRANSFER_FEE', 'TRAINING_DURATION', 'SUPPORT_CHANNELS', 'POST_TERM_MONTHS', 'NON_COMPETE_RADIUS', 'JURISDICTION', 'DATE'],
    featured: false,
    createdAt: '2025-03-15T00:00:00.000Z'
  },

  // ── Employment Expansion ─────────────────────────────
  {
    id: 'tpl_employment',
    name: 'Employment Agreement — Executive',
    description: 'Comprehensive executive employment agreement with compensation, equity, severance, and restrictive covenants.',
    category: 'Employment',
    type: 'employment',
    price: 1500,
    authorId: 'platform',
    authorName: 'AgreeMint',
    jurisdiction: 'United States (New York)',
    tags: ['employment', 'executive', 'compensation', 'equity', 'c-suite', 'hire'],
    rating: 4.8,
    ratingCount: 56,
    purchaseCount: 345,
    content: `# EXECUTIVE EMPLOYMENT AGREEMENT

This Employment Agreement ("Agreement") is effective as of [DATE] between:

**Employer:** [COMPANY_NAME], a [STATE] [ENTITY_TYPE] ("Company")
**Executive:** [EXECUTIVE_NAME] ("Executive")

## 1. POSITION
Executive is hired as [TITLE], reporting to [REPORTS_TO]. Principal office: [OFFICE_LOCATION].

## 2. TERM
Employment commences [START_DATE] and continues for [INITIAL_TERM] years, automatically renewing for [RENEWAL_TERM] year periods, subject to termination provisions.

## 3. COMPENSATION
(a) Base salary: $[BASE_SALARY] per year, paid [PAYROLL_FREQUENCY]
(b) Signing bonus: $[SIGNING_BONUS]
(c) Annual bonus target: [BONUS_TARGET]% of base salary
(d) Equity: [EQUITY_GRANT] [EQUITY_TYPE] vesting over [VESTING_SCHEDULE]
(e) Benefits: Company standard benefits package

## 4. DUTIES
Executive shall devote substantially all business time to Company duties. Board membership at up to [OUTSIDE_BOARDS] outside organizations permitted with approval.

## 5. TERMINATION
### 5.1 By Company Without Cause
Company may terminate without cause with [NOTICE_PERIOD] days' notice. Severance: [SEVERANCE_MONTHS] months base salary plus COBRA continuation.

### 5.2 By Executive for Good Reason
Executive may resign for Good Reason (material reduction in duties, compensation, or relocation beyond [RELOCATION_MILES] miles). Same severance as 5.1.

### 5.3 For Cause
No severance. Cause includes: willful misconduct, conviction of felony, material breach.

### 5.4 Change of Control
If terminated within [COC_MONTHS] months of a change of control: [COC_SEVERANCE_MONTHS] months salary plus accelerated equity vesting.

## 6. RESTRICTIVE COVENANTS
(a) Non-compete: [NON_COMPETE_MONTHS] months post-termination in [NON_COMPETE_SCOPE]
(b) Non-solicitation: [NON_SOLICIT_MONTHS] months for employees and clients
(c) Confidentiality: perpetual
(d) IP assignment: all work product

## 7. GOVERNING LAW
Governed by the laws of [JURISDICTION].`,
    variables: ['COMPANY_NAME', 'STATE', 'ENTITY_TYPE', 'EXECUTIVE_NAME', 'TITLE', 'REPORTS_TO', 'OFFICE_LOCATION', 'START_DATE', 'INITIAL_TERM', 'RENEWAL_TERM', 'BASE_SALARY', 'PAYROLL_FREQUENCY', 'SIGNING_BONUS', 'BONUS_TARGET', 'EQUITY_GRANT', 'EQUITY_TYPE', 'VESTING_SCHEDULE', 'OUTSIDE_BOARDS', 'NOTICE_PERIOD', 'SEVERANCE_MONTHS', 'RELOCATION_MILES', 'COC_MONTHS', 'COC_SEVERANCE_MONTHS', 'NON_COMPETE_MONTHS', 'NON_COMPETE_SCOPE', 'NON_SOLICIT_MONTHS', 'JURISDICTION', 'DATE'],
    featured: true,
    createdAt: '2025-03-20T00:00:00.000Z'
  },
  {
    id: 'tpl_consulting',
    name: 'Consulting Agreement',
    description: 'Professional consulting engagement with deliverables, fees, IP assignment, and confidentiality.',
    category: 'Services',
    type: 'consulting',
    price: 800,
    authorId: 'platform',
    authorName: 'AgreeMint',
    jurisdiction: 'Global',
    tags: ['consulting', 'advisory', 'professional', 'strategy', 'engagement'],
    rating: 4.7,
    ratingCount: 72,
    purchaseCount: 489,
    content: `# CONSULTING AGREEMENT

This Consulting Agreement ("Agreement") is dated [DATE] between:

**Client:** [CLIENT_NAME] ("Client")
**Consultant:** [CONSULTANT_NAME] ("Consultant")

## 1. SERVICES
Consultant shall provide: [SERVICES_DESCRIPTION]. Deliverables: [DELIVERABLES].

## 2. TERM
From [START_DATE] to [END_DATE], with option to extend by mutual agreement.

## 3. COMPENSATION
(a) Fee structure: [FEE_TYPE] — $[FEE_AMOUNT] per [FEE_UNIT]
(b) Estimated total: $[ESTIMATED_TOTAL]
(c) Expenses: [EXPENSE_POLICY]
(d) Payment: Net [PAYMENT_DAYS] days from invoice

## 4. INDEPENDENT CONTRACTOR
Consultant is an independent contractor, not an employee. Consultant is responsible for own taxes and benefits.

## 5. INTELLECTUAL PROPERTY
All work product is "work made for hire" and belongs to Client. Consultant assigns all rights. Consultant retains pre-existing IP.

## 6. CONFIDENTIALITY
Consultant shall protect Client's confidential information during and for [CONFIDENTIALITY_YEARS] years after the engagement.

## 7. NON-SOLICITATION
During the term and [NON_SOLICIT_MONTHS] months after, Consultant shall not solicit Client's employees.

## 8. LIMITATION OF LIABILITY
Consultant's total liability shall not exceed [LIABILITY_CAP].

## 9. TERMINATION
Either party may terminate with [NOTICE_DAYS] days' written notice. Client pays for services rendered through termination.

## 10. GOVERNING LAW
This Agreement is governed by the laws of [JURISDICTION].`,
    variables: ['CLIENT_NAME', 'CONSULTANT_NAME', 'SERVICES_DESCRIPTION', 'DELIVERABLES', 'START_DATE', 'END_DATE', 'FEE_TYPE', 'FEE_AMOUNT', 'FEE_UNIT', 'ESTIMATED_TOTAL', 'EXPENSE_POLICY', 'PAYMENT_DAYS', 'CONFIDENTIALITY_YEARS', 'NON_SOLICIT_MONTHS', 'LIABILITY_CAP', 'NOTICE_DAYS', 'JURISDICTION', 'DATE'],
    featured: false,
    createdAt: '2025-03-20T00:00:00.000Z'
  },

  // ── Platform & Privacy ──────────────────────────────
  {
    id: 'tpl_privacy_policy',
    name: 'Privacy Policy — GDPR/CCPA Compliant',
    description: 'Comprehensive privacy policy compliant with GDPR, CCPA/CPRA, and international data protection laws.',
    category: 'Platform',
    type: 'privacy-policy',
    price: 1000,
    authorId: 'platform',
    authorName: 'AgreeMint',
    jurisdiction: 'Global',
    tags: ['privacy', 'gdpr', 'ccpa', 'data protection', 'policy', 'compliance'],
    rating: 4.8,
    ratingCount: 98,
    purchaseCount: 892,
    content: `# PRIVACY POLICY

**Effective Date:** [EFFECTIVE_DATE]
**Last Updated:** [LAST_UPDATED]

[COMPANY_NAME] ("we," "us," or "our") operates [WEBSITE_URL] and [APP_NAME] (the "Services"). This Privacy Policy explains how we collect, use, disclose, and safeguard personal information.

## 1. INFORMATION WE COLLECT
### 1.1 Information You Provide
- Account data: name, email, phone number
- Payment information: processed securely via [PAYMENT_PROCESSOR]
- Communications: support tickets, feedback
- User content: [USER_CONTENT_TYPES]

### 1.2 Automatically Collected
- Device information, IP address, browser type
- Usage data, page views, clicks
- Cookies and similar technologies (see Cookie Policy)

### 1.3 Third-Party Sources
- [THIRD_PARTY_SOURCES]

## 2. HOW WE USE YOUR INFORMATION
- Provide and improve the Services
- Process transactions
- Send communications (with opt-out)
- Ensure security and prevent fraud
- Comply with legal obligations
- [ADDITIONAL_USES]

## 3. LEGAL BASIS (GDPR)
- Consent, contract performance, legitimate interests, legal obligation

## 4. DATA SHARING
We share data with:
- Service providers under contract
- Legal authorities when required
- Business partners with your consent
We do NOT sell personal information.

## 5. YOUR RIGHTS
### GDPR (EU/EEA): Access, rectification, erasure, portability, restriction, objection
### CCPA/CPRA (California): Know, delete, opt-out, non-discrimination
### Contact: [PRIVACY_EMAIL]

## 6. DATA RETENTION
We retain personal data for [RETENTION_PERIOD] or as required by law.

## 7. INTERNATIONAL TRANSFERS
Data may be transferred to [DATA_LOCATIONS]. We use Standard Contractual Clauses for EU transfers.

## 8. SECURITY
We implement industry-standard security measures including encryption, access controls, and regular audits.

## 9. CHILDREN
Services are not directed to children under [MINIMUM_AGE]. We do not knowingly collect children's data.

## 10. CHANGES
We may update this policy and will notify you via [NOTIFICATION_METHOD].

## 11. CONTACT
Data Protection Officer: [DPO_NAME]
Email: [PRIVACY_EMAIL]
Address: [COMPANY_ADDRESS]`,
    variables: ['COMPANY_NAME', 'WEBSITE_URL', 'APP_NAME', 'PAYMENT_PROCESSOR', 'USER_CONTENT_TYPES', 'THIRD_PARTY_SOURCES', 'ADDITIONAL_USES', 'PRIVACY_EMAIL', 'RETENTION_PERIOD', 'DATA_LOCATIONS', 'MINIMUM_AGE', 'NOTIFICATION_METHOD', 'DPO_NAME', 'COMPANY_ADDRESS', 'EFFECTIVE_DATE', 'LAST_UPDATED'],
    featured: true,
    createdAt: '2025-03-25T00:00:00.000Z'
  },
  {
    id: 'tpl_dpa',
    name: 'Data Processing Agreement (DPA)',
    description: 'GDPR Article 28 compliant DPA for data controllers engaging processors with SCCs.',
    category: 'Platform',
    type: 'dpa',
    price: 1200,
    authorId: 'platform',
    authorName: 'AgreeMint',
    jurisdiction: 'European Union',
    tags: ['dpa', 'gdpr', 'data processing', 'controller', 'processor', 'privacy'],
    rating: 4.9,
    ratingCount: 42,
    purchaseCount: 298,
    content: `# DATA PROCESSING AGREEMENT

This Data Processing Agreement ("DPA") is entered into as of [DATE] between:

**Controller:** [CONTROLLER_NAME] ("Controller")
**Processor:** [PROCESSOR_NAME] ("Processor")

pursuant to Article 28 of Regulation (EU) 2016/679 (General Data Protection Regulation, "GDPR").

## 1. DEFINITIONS
Terms shall have the meaning given in the GDPR: "Personal Data," "Processing," "Data Subject," "Controller," "Processor," "Sub-processor."

## 2. SCOPE AND PURPOSE
Processor processes Personal Data on behalf of Controller for: [PROCESSING_PURPOSE].
Data subjects: [DATA_SUBJECT_CATEGORIES].
Categories of data: [DATA_CATEGORIES].
Duration: [PROCESSING_DURATION].

## 3. PROCESSOR OBLIGATIONS
Processor shall:
(a) Process only on documented instructions from Controller
(b) Ensure personnel are bound by confidentiality
(c) Implement appropriate technical and organizational measures (Article 32)
(d) Assist Controller with Data Subject requests
(e) Assist with DPIAs and prior consultation
(f) Delete or return all Personal Data upon termination
(g) Make available all information necessary for audits

## 4. SUB-PROCESSORS
Processor [MAY_SUBPROCESS] engage Sub-processors with prior [CONSENT_TYPE] consent. Current Sub-processors: [SUB_PROCESSOR_LIST].
Processor shall impose equivalent obligations on Sub-processors.

## 5. INTERNATIONAL TRANSFERS
Transfers outside the EEA require: [TRANSFER_MECHANISM] (SCCs / Adequacy Decision / BCRs).

## 6. SECURITY MEASURES
Processor implements: encryption, pseudonymization, access controls, regular testing, incident response procedures.

## 7. DATA BREACH
Processor shall notify Controller within [BREACH_HOURS] hours of becoming aware of a Personal Data breach, including: nature, categories affected, consequences, and measures taken.

## 8. AUDITS
Controller may audit Processor's compliance with [AUDIT_NOTICE] days' notice, during business hours, no more than [AUDIT_FREQUENCY].

## 9. TERM AND TERMINATION
This DPA is coterminous with the main services agreement. Post-termination: Processor shall delete Personal Data within [DELETION_DAYS] days.

## 10. LIABILITY
Liability under this DPA is subject to the limitations in the main services agreement.`,
    variables: ['CONTROLLER_NAME', 'PROCESSOR_NAME', 'PROCESSING_PURPOSE', 'DATA_SUBJECT_CATEGORIES', 'DATA_CATEGORIES', 'PROCESSING_DURATION', 'MAY_SUBPROCESS', 'CONSENT_TYPE', 'SUB_PROCESSOR_LIST', 'TRANSFER_MECHANISM', 'BREACH_HOURS', 'AUDIT_NOTICE', 'AUDIT_FREQUENCY', 'DELETION_DAYS', 'DATE'],
    featured: true,
    createdAt: '2025-03-25T00:00:00.000Z'
  },
  {
    id: 'tpl_terms_of_service',
    name: 'Terms of Service — SaaS',
    description: 'Comprehensive terms of service for SaaS platforms and web applications with subscription billing.',
    category: 'Platform',
    type: 'terms-of-service',
    price: 1200,
    authorId: 'platform',
    authorName: 'AgreeMint',
    jurisdiction: 'United States (Delaware)',
    tags: ['terms', 'tos', 'saas', 'platform', 'subscription', 'webapp'],
    rating: 4.7,
    ratingCount: 86,
    purchaseCount: 723,
    content: `# TERMS OF SERVICE

**Effective Date:** [EFFECTIVE_DATE]

These Terms of Service ("Terms") govern your use of [SERVICE_NAME] operated by [COMPANY_NAME] ("we," "us," or "Company").

## 1. ACCEPTANCE
By accessing or using the Service, you agree to be bound by these Terms. If you do not agree, do not use the Service.

## 2. DESCRIPTION OF SERVICE
[SERVICE_NAME] provides: [SERVICE_DESCRIPTION]. Features may be modified at any time with notice.

## 3. ACCOUNTS
You must provide accurate information. You are responsible for maintaining account security. Minimum age: [MINIMUM_AGE].

## 4. SUBSCRIPTION AND BILLING
(a) Plans: [PLAN_TIERS]
(b) Billing cycle: [BILLING_CYCLE]
(c) Free trial: [FREE_TRIAL_DAYS] days
(d) Auto-renewal unless cancelled before billing date
(e) Refund policy: [REFUND_POLICY]

## 5. USER CONTENT
You retain ownership of content you create. You grant us a license to host, display, and process your content to provide the Service.

## 6. ACCEPTABLE USE
You agree not to: violate laws, infringe IP, distribute malware, harass users, reverse engineer, or circumvent security.

## 7. INTELLECTUAL PROPERTY
The Service, including code, design, and trademarks, is our property. Your license is limited to using the Service per these Terms.

## 8. PRIVACY
Your data is handled per our Privacy Policy at [PRIVACY_URL].

## 9. DISCLAIMERS
THE SERVICE IS PROVIDED "AS IS." WE DISCLAIM ALL WARRANTIES EXPRESS OR IMPLIED.

## 10. LIMITATION OF LIABILITY
OUR TOTAL LIABILITY SHALL NOT EXCEED THE FEES PAID IN THE [LIABILITY_PERIOD] MONTHS PRECEDING THE CLAIM.

## 11. INDEMNIFICATION
You shall indemnify us against claims arising from your use of the Service or violation of these Terms.

## 12. DISPUTE RESOLUTION
Disputes shall be resolved through [DISPUTE_METHOD] in [JURISDICTION]. Class action waiver applies where permitted.

## 13. TERMINATION
We may suspend or terminate your account for violation of these Terms with [NOTICE_DAYS] days' notice (immediate for egregious violations).

## 14. MODIFICATIONS
We may update these Terms. Continued use after changes constitutes acceptance.

## 15. GOVERNING LAW
Governed by the laws of [JURISDICTION].

## 16. CONTACT
[COMPANY_NAME], [COMPANY_ADDRESS], [SUPPORT_EMAIL]`,
    variables: ['SERVICE_NAME', 'COMPANY_NAME', 'SERVICE_DESCRIPTION', 'MINIMUM_AGE', 'PLAN_TIERS', 'BILLING_CYCLE', 'FREE_TRIAL_DAYS', 'REFUND_POLICY', 'PRIVACY_URL', 'LIABILITY_PERIOD', 'DISPUTE_METHOD', 'NOTICE_DAYS', 'COMPANY_ADDRESS', 'SUPPORT_EMAIL', 'JURISDICTION', 'EFFECTIVE_DATE'],
    featured: true,
    createdAt: '2025-04-01T00:00:00.000Z'
  },

  // ── Entity Formation ─────────────────────────────────
  {
    id: 'tpl_llc_operating',
    name: 'LLC Operating Agreement',
    description: 'Multi-member LLC operating agreement with management, distributions, transfers, and dissolution provisions.',
    category: 'Entity Formation',
    type: 'llc-operating',
    price: 1500,
    authorId: 'platform',
    authorName: 'AgreeMint',
    jurisdiction: 'United States (Delaware)',
    tags: ['llc', 'operating agreement', 'entity', 'formation', 'members'],
    rating: 4.8,
    ratingCount: 76,
    purchaseCount: 534,
    content: `# LIMITED LIABILITY COMPANY OPERATING AGREEMENT

of [COMPANY_NAME] LLC

This Operating Agreement ("Agreement") is entered into as of [DATE] by and among the Members listed in Exhibit A.

## 1. FORMATION
The Company was formed as a [STATE] limited liability company on [FORMATION_DATE]. Articles of Organization filed with [FILING_OFFICE].

## 2. PURPOSE
The Company is formed for: [COMPANY_PURPOSE] and any lawful business.

## 3. MEMBERS AND CAPITAL
| Member | Capital Contribution | Ownership % |
|--------|---------------------|-------------|
| [MEMBER_1_NAME] | $[MEMBER_1_CONTRIBUTION] | [MEMBER_1_PERCENT]% |
| [MEMBER_2_NAME] | $[MEMBER_2_CONTRIBUTION] | [MEMBER_2_PERCENT]% |

Additional capital contributions require unanimous consent unless specified otherwise.

## 4. MANAGEMENT
The Company is [MANAGEMENT_TYPE]-managed.
Manager(s): [MANAGER_NAMES]
Decisions requiring [MAJOR_DECISION_THRESHOLD]% vote: sale of assets, new debt, new members, dissolution.

## 5. DISTRIBUTIONS
Distributions shall be made [DISTRIBUTION_FREQUENCY] in accordance with Members' ownership percentages, after maintaining minimum reserves of $[RESERVE_AMOUNT].

## 6. TAX ELECTIONS
The Company elects to be taxed as: [TAX_CLASSIFICATION]. Tax Matters Partner: [TAX_MATTERS_PARTNER].

## 7. TRANSFER RESTRICTIONS
No Member may transfer interest without [TRANSFER_APPROVAL]. Other Members have a right of first refusal for [ROFR_DAYS] days.

## 8. DISSOLUTION
The Company dissolves upon: (a) unanimous vote, (b) bankruptcy, (c) [DISSOLUTION_EVENTS].

## 9. GOVERNING LAW
Governed by the laws of [JURISDICTION].`,
    variables: ['COMPANY_NAME', 'STATE', 'FORMATION_DATE', 'FILING_OFFICE', 'COMPANY_PURPOSE', 'MEMBER_1_NAME', 'MEMBER_1_CONTRIBUTION', 'MEMBER_1_PERCENT', 'MEMBER_2_NAME', 'MEMBER_2_CONTRIBUTION', 'MEMBER_2_PERCENT', 'MANAGEMENT_TYPE', 'MANAGER_NAMES', 'MAJOR_DECISION_THRESHOLD', 'DISTRIBUTION_FREQUENCY', 'RESERVE_AMOUNT', 'TAX_CLASSIFICATION', 'TAX_MATTERS_PARTNER', 'TRANSFER_APPROVAL', 'ROFR_DAYS', 'DISSOLUTION_EVENTS', 'JURISDICTION', 'DATE'],
    featured: true,
    createdAt: '2025-04-01T00:00:00.000Z'
  },
  {
    id: 'tpl_shareholder',
    name: 'Shareholder Agreement',
    description: 'Agreement governing rights and obligations of shareholders including drag-along, tag-along, and ROFR.',
    category: 'Entity Formation',
    type: 'shareholder',
    price: 2000,
    authorId: 'platform',
    authorName: 'AgreeMint',
    jurisdiction: 'United States (Delaware)',
    tags: ['shareholder', 'stockholder', 'equity', 'startup', 'corporation', 'governance'],
    rating: 4.7,
    ratingCount: 38,
    purchaseCount: 212,
    content: `# SHAREHOLDER AGREEMENT

This Shareholder Agreement ("Agreement") is entered into as of [DATE] by and among:

**Company:** [COMPANY_NAME], a [STATE] corporation ("Company")
**Shareholders:** Listed in Schedule A

## 1. SHARES
The authorized capital consists of [AUTHORIZED_SHARES] shares. Current allocation per Schedule A.

## 2. BOARD OF DIRECTORS
(a) Board size: [BOARD_SIZE] directors
(b) Investor directors: [INVESTOR_DIRECTORS]
(c) Founder directors: [FOUNDER_DIRECTORS]
(d) Independent directors: [INDEPENDENT_DIRECTORS]

## 3. PROTECTIVE PROVISIONS
The following require [PROTECTIVE_VOTE] approval:
(a) Issuance of new equity
(b) Debt exceeding $[DEBT_THRESHOLD]
(c) Amendment to charter/bylaws
(d) Sale, merger, or dissolution
(e) Related party transactions

## 4. RIGHT OF FIRST REFUSAL
Before any transfer, selling Shareholder must offer shares to existing Shareholders pro rata. ROFR period: [ROFR_DAYS] days.

## 5. TAG-ALONG RIGHTS
If a Shareholder sells [TAG_THRESHOLD]% or more, other Shareholders may participate on the same terms.

## 6. DRAG-ALONG RIGHTS
If Shareholders holding [DRAG_THRESHOLD]% approve a sale, they may compel remaining Shareholders to sell on the same terms.

## 7. PREEMPTIVE RIGHTS
Shareholders have the right to participate in future issuances to maintain their pro rata ownership.

## 8. VESTING
Founder shares vest over [VESTING_YEARS] years with a [CLIFF_MONTHS] month cliff. Acceleration: [ACCELERATION_TYPE].

## 9. NON-COMPETE
Shareholders shall not compete for [NON_COMPETE_YEARS] years during and after involvement.

## 10. GOVERNING LAW
Governed by the laws of [JURISDICTION].`,
    variables: ['COMPANY_NAME', 'STATE', 'AUTHORIZED_SHARES', 'BOARD_SIZE', 'INVESTOR_DIRECTORS', 'FOUNDER_DIRECTORS', 'INDEPENDENT_DIRECTORS', 'PROTECTIVE_VOTE', 'DEBT_THRESHOLD', 'ROFR_DAYS', 'TAG_THRESHOLD', 'DRAG_THRESHOLD', 'VESTING_YEARS', 'CLIFF_MONTHS', 'ACCELERATION_TYPE', 'NON_COMPETE_YEARS', 'JURISDICTION', 'DATE'],
    featured: false,
    createdAt: '2025-04-05T00:00:00.000Z'
  },

  // ── Personal & Family ────────────────────────────────
  {
    id: 'tpl_prenuptial',
    name: 'Prenuptial Agreement',
    description: 'Pre-marriage agreement governing property rights, separate vs. marital property, and spousal support.',
    category: 'Personal',
    type: 'prenuptial',
    price: 2000,
    authorId: 'platform',
    authorName: 'AgreeMint',
    jurisdiction: 'United States (New York)',
    tags: ['prenuptial', 'prenup', 'marriage', 'family', 'property', 'personal'],
    rating: 4.5,
    ratingCount: 34,
    purchaseCount: 167,
    content: `# PRENUPTIAL AGREEMENT

This Prenuptial Agreement ("Agreement") is entered into on [DATE] between:

**Party A:** [PARTY_A_NAME], of [PARTY_A_ADDRESS] ("Party A")
**Party B:** [PARTY_B_NAME], of [PARTY_B_ADDRESS] ("Party B")

who intend to marry on or about [WEDDING_DATE] ("the Parties").

## RECITALS
Each Party enters into this Agreement voluntarily, with full knowledge of the other's financial condition. Each Party has had the opportunity to consult independent legal counsel.

## 1. SEPARATE PROPERTY
The following shall remain Separate Property:
(a) Property owned before marriage (Schedule A)
(b) Inheritances and gifts received individually
(c) Income from Separate Property
(d) [ADDITIONAL_SEPARATE_PROPERTY]

## 2. MARITAL PROPERTY
The following shall be Marital Property subject to equitable division:
(a) Income earned during the marriage
(b) Property acquired jointly during the marriage
(c) [ADDITIONAL_MARITAL_PROPERTY]

## 3. REAL PROPERTY
The marital home: [HOME_ADDRESS]. Treatment: [HOME_TREATMENT].
Other real property per Schedule B.

## 4. BUSINESS INTERESTS
[PARTY_A_NAME]'s business: [BUSINESS_NAME]. Treatment: [BUSINESS_TREATMENT].

## 5. RETIREMENT AND INVESTMENT ACCOUNTS
Pre-marital accounts remain separate. Contributions during marriage treated as: [RETIREMENT_TREATMENT].

## 6. SPOUSAL SUPPORT
In the event of divorce: [SPOUSAL_SUPPORT_TERMS].

## 7. DEBT
Pre-marital debt remains the responsibility of the incurring party. Debt schedule attached as Schedule C.

## 8. FINANCIAL DISCLOSURE
Both parties have exchanged full financial disclosures attached as Exhibits.

## 9. MODIFICATION
This Agreement may only be modified by written agreement signed by both Parties.

## 10. GOVERNING LAW
Governed by the laws of [JURISDICTION].

ACKNOWLEDGED:
Each Party confirms they have read this Agreement, had opportunity for independent counsel, and sign voluntarily.`,
    variables: ['PARTY_A_NAME', 'PARTY_A_ADDRESS', 'PARTY_B_NAME', 'PARTY_B_ADDRESS', 'WEDDING_DATE', 'ADDITIONAL_SEPARATE_PROPERTY', 'ADDITIONAL_MARITAL_PROPERTY', 'HOME_ADDRESS', 'HOME_TREATMENT', 'BUSINESS_NAME', 'BUSINESS_TREATMENT', 'RETIREMENT_TREATMENT', 'SPOUSAL_SUPPORT_TERMS', 'JURISDICTION', 'DATE'],
    featured: false,
    createdAt: '2025-04-05T00:00:00.000Z'
  },
  {
    id: 'tpl_power_of_attorney',
    name: 'Power of Attorney',
    description: 'Authorize an agent to act on your behalf in legal, financial, or healthcare matters.',
    category: 'Personal',
    type: 'power-of-attorney',
    price: 600,
    authorId: 'platform',
    authorName: 'AgreeMint',
    jurisdiction: 'Global',
    tags: ['power of attorney', 'poa', 'agent', 'proxy', 'healthcare', 'financial'],
    rating: 4.6,
    ratingCount: 67,
    purchaseCount: 445,
    content: `# POWER OF ATTORNEY

I, [PRINCIPAL_NAME], of [PRINCIPAL_ADDRESS] ("Principal"), hereby appoint [AGENT_NAME], of [AGENT_ADDRESS] ("Agent"), as my Attorney-in-Fact.

## 1. TYPE
This is a [POA_TYPE] Power of Attorney (General / Limited / Durable / Springing).
[SPRINGING_CONDITION]

## 2. POWERS GRANTED
Agent is authorized to act on my behalf in the following matters:
[POWERS_GRANTED]

Including but not limited to:
(a) Banking and financial transactions
(b) Real property transactions
(c) Tax matters
(d) Insurance and benefits
(e) Legal proceedings
(f) [ADDITIONAL_POWERS]

## 3. LIMITATIONS
Agent shall NOT: [LIMITATIONS]

## 4. COMPENSATION
Agent shall [COMPENSATION_TERMS] for services rendered.

## 5. SUCCESSOR AGENT
If Agent is unable or unwilling to serve: [SUCCESSOR_AGENT_NAME] shall serve as successor Agent.

## 6. DURATION
This Power of Attorney:
(a) Effective date: [EFFECTIVE_DATE]
(b) Expires: [EXPIRATION_DATE] or upon revocation
(c) [DURABILITY_CLAUSE]

## 7. REVOCATION
I may revoke this Power of Attorney at any time by written notice to Agent.

## 8. THIRD PARTY RELIANCE
Third parties may rely on this Power of Attorney. Agent's authority is not affected by my subsequent disability or incapacity (if durable).

## 9. GOVERNING LAW
Governed by the laws of [JURISDICTION].

SIGNED AND ACKNOWLEDGED:

STATE OF [STATE]
COUNTY OF [COUNTY]`,
    variables: ['PRINCIPAL_NAME', 'PRINCIPAL_ADDRESS', 'AGENT_NAME', 'AGENT_ADDRESS', 'POA_TYPE', 'SPRINGING_CONDITION', 'POWERS_GRANTED', 'ADDITIONAL_POWERS', 'LIMITATIONS', 'COMPENSATION_TERMS', 'SUCCESSOR_AGENT_NAME', 'EFFECTIVE_DATE', 'EXPIRATION_DATE', 'DURABILITY_CLAUSE', 'STATE', 'COUNTY', 'JURISDICTION'],
    featured: false,
    createdAt: '2025-04-10T00:00:00.000Z'
  },

  // ── Software & Tech ──────────────────────────────────
  {
    id: 'tpl_software_license',
    name: 'Software License Agreement',
    description: 'License software with usage rights, restrictions, SLA, warranties, and support terms.',
    category: 'Intellectual Property',
    type: 'software-license',
    price: 1200,
    authorId: 'platform',
    authorName: 'AgreeMint',
    jurisdiction: 'United States (California)',
    tags: ['software', 'license', 'saas', 'technology', 'subscription', 'api'],
    rating: 4.7,
    ratingCount: 58,
    purchaseCount: 378,
    content: `# SOFTWARE LICENSE AGREEMENT

This Software License Agreement ("Agreement") is effective as of [DATE] between:

**Licensor:** [LICENSOR_NAME] ("Licensor")
**Licensee:** [LICENSEE_NAME] ("Licensee")

## 1. SOFTWARE
Licensor licenses to Licensee the software known as [SOFTWARE_NAME] version [SOFTWARE_VERSION] ("Software"), including documentation.

## 2. LICENSE GRANT
Licensor grants Licensee a [EXCLUSIVITY] [LICENSE_TYPE] license to use the Software:
(a) Authorized users: [AUTHORIZED_USERS]
(b) Deployment: [DEPLOYMENT_TYPE]
(c) Territory: [TERRITORY]

## 3. RESTRICTIONS
Licensee shall not: reverse engineer, decompile, sublicense, modify (except via APIs), or use for competing products.

## 4. FEES
(a) License fee: $[LICENSE_FEE] per [FEE_PERIOD]
(b) Support fee: $[SUPPORT_FEE] per year
(c) Additional users: $[PER_USER_FEE] per user per month

## 5. SUPPORT AND MAINTENANCE
Licensor provides:
(a) [SUPPORT_LEVEL] support during [SUPPORT_HOURS]
(b) Bug fixes and security patches
(c) [UPDATES_INCLUDED] major version upgrades
(d) Response time: [RESPONSE_SLA]

## 6. WARRANTIES
Licensor warrants the Software will materially conform to documentation for [WARRANTY_PERIOD] from delivery. Licensor does NOT warrant uninterrupted or error-free operation.

## 7. INTELLECTUAL PROPERTY
All IP rights in the Software remain with Licensor. Licensee's data remains Licensee's property.

## 8. DATA AND SECURITY
Licensor shall implement industry-standard security measures. Licensee data processed per [DPA_REFERENCE].

## 9. LIMITATION OF LIABILITY
TOTAL LIABILITY SHALL NOT EXCEED FEES PAID IN THE PRECEDING [LIABILITY_MONTHS] MONTHS. NEITHER PARTY IS LIABLE FOR INDIRECT, CONSEQUENTIAL, OR PUNITIVE DAMAGES.

## 10. TERM AND TERMINATION
Term: [LICENSE_TERM]. Auto-renews unless terminated with [NOTICE_DAYS] days' notice. Upon termination, Licensor provides data export for [EXPORT_DAYS] days.

## 11. GOVERNING LAW
Governed by the laws of [JURISDICTION].`,
    variables: ['LICENSOR_NAME', 'LICENSEE_NAME', 'SOFTWARE_NAME', 'SOFTWARE_VERSION', 'EXCLUSIVITY', 'LICENSE_TYPE', 'AUTHORIZED_USERS', 'DEPLOYMENT_TYPE', 'TERRITORY', 'LICENSE_FEE', 'FEE_PERIOD', 'SUPPORT_FEE', 'PER_USER_FEE', 'SUPPORT_LEVEL', 'SUPPORT_HOURS', 'UPDATES_INCLUDED', 'RESPONSE_SLA', 'WARRANTY_PERIOD', 'DPA_REFERENCE', 'LIABILITY_MONTHS', 'LICENSE_TERM', 'NOTICE_DAYS', 'EXPORT_DAYS', 'JURISDICTION', 'DATE'],
    featured: false,
    createdAt: '2025-04-10T00:00:00.000Z'
  },

  // ── Investment Expansion ─────────────────────────────
  {
    id: 'tpl_convertible_note',
    name: 'Convertible Promissory Note',
    description: 'Convertible debt instrument for startup financing with discount, cap, and auto-conversion.',
    category: 'Investment',
    type: 'investment-convertible',
    price: 1500,
    authorId: 'platform',
    authorName: 'AgreeMint',
    jurisdiction: 'United States (Delaware)',
    tags: ['convertible', 'note', 'debt', 'startup', 'investment', 'seed', 'bridge'],
    rating: 4.8,
    ratingCount: 41,
    purchaseCount: 198,
    content: `# CONVERTIBLE PROMISSORY NOTE

**Principal Amount:** $[PRINCIPAL_AMOUNT]
**Issue Date:** [DATE]

FOR VALUE RECEIVED, [COMPANY_NAME], a [STATE] corporation ("Company"), promises to pay to [INVESTOR_NAME] ("Holder") the principal sum of $[PRINCIPAL_AMOUNT], together with interest.

## 1. INTEREST
Simple interest at [INTEREST_RATE]% per annum. Interest accrues and is not payable until conversion or maturity.

## 2. MATURITY
Unless converted earlier, the principal and accrued interest are due on [MATURITY_DATE] ("Maturity Date").

## 3. CONVERSION
### 3.1 Qualified Financing
Upon a Qualified Financing (raising $[QUALIFIED_THRESHOLD] or more), this Note automatically converts into the equity securities issued at a conversion price equal to the LESSER of:
(a) [DISCOUNT_RATE]% of the price per share paid by investors, OR
(b) $[VALUATION_CAP] divided by the Fully Diluted Capitalization ("Cap Price")

### 3.2 Non-Qualified Financing
Upon a financing below the Qualified Financing threshold, Holder may elect to convert at the Cap Price.

### 3.3 Change of Control
Upon a Change of Control before conversion, Holder receives the GREATER of: (a) [COC_MULTIPLE]x the principal plus accrued interest, or (b) the amount payable if converted at the Cap Price.

## 4. PREPAYMENT
Company may not prepay this Note without Holder's written consent.

## 5. SUBORDINATION
This Note is [SUBORDINATION_STATUS] to existing and future indebtedness.

## 6. REPRESENTATIONS
Company represents: duly organized, authorized to issue this Note, and no violation of existing agreements.

## 7. EVENTS OF DEFAULT
(a) Failure to pay at maturity
(b) Voluntary or involuntary bankruptcy
(c) Material breach of representations

## 8. GOVERNING LAW
Governed by the laws of [JURISDICTION].

[COMPANY_NAME]
By: ________________________
Name: [SIGNATORY_NAME]
Title: [SIGNATORY_TITLE]`,
    variables: ['COMPANY_NAME', 'STATE', 'INVESTOR_NAME', 'PRINCIPAL_AMOUNT', 'INTEREST_RATE', 'MATURITY_DATE', 'QUALIFIED_THRESHOLD', 'DISCOUNT_RATE', 'VALUATION_CAP', 'COC_MULTIPLE', 'SUBORDINATION_STATUS', 'SIGNATORY_NAME', 'SIGNATORY_TITLE', 'JURISDICTION', 'DATE'],
    featured: false,
    createdAt: '2025-04-15T00:00:00.000Z'
  },

  // ── Governance ───────────────────────────────────────
  {
    id: 'tpl_advisory',
    name: 'Advisor Agreement with Equity',
    description: 'Standard advisory agreement with equity compensation, vesting, and FAST framework.',
    category: 'Governance',
    type: 'advisory',
    price: 800,
    authorId: 'platform',
    authorName: 'AgreeMint',
    jurisdiction: 'United States (Delaware)',
    tags: ['advisor', 'advisory', 'equity', 'startup', 'vesting', 'mentor'],
    rating: 4.7,
    ratingCount: 52,
    purchaseCount: 289,
    content: `# ADVISOR AGREEMENT

This Advisor Agreement ("Agreement") is effective as of [DATE] between:

**Company:** [COMPANY_NAME], a [STATE] [ENTITY_TYPE] ("Company")
**Advisor:** [ADVISOR_NAME] ("Advisor")

## 1. ADVISORY ROLE
Company engages Advisor to provide: [ADVISORY_SCOPE].
Engagement level: [ENGAGEMENT_LEVEL] (Strategic / Standard / Expert).
Expected time commitment: [HOURS_PER_MONTH] hours per month.

## 2. TERM
Initial term: [INITIAL_TERM] months, with automatic renewal for [RENEWAL_TERM] month periods.

## 3. COMPENSATION
### 3.1 Equity
Company grants Advisor [EQUITY_AMOUNT] [EQUITY_TYPE] (stock options / restricted stock).
Exercise price: $[EXERCISE_PRICE] per share (if options).
409A Fair Market Value: $[FMV] per share.

### 3.2 Vesting
Vesting over [VESTING_MONTHS] months with [CLIFF_MONTHS] month cliff. Upon termination, unvested shares are forfeited.

### 3.3 Cash Compensation
[CASH_COMPENSATION]

## 4. INTELLECTUAL PROPERTY
All IP created in connection with advisory services is assigned to Company.

## 5. CONFIDENTIALITY
Advisor shall maintain confidentiality of Company information indefinitely.

## 6. NO CONFLICTS
Advisor represents no conflicts with existing obligations and will disclose any future conflicts.

## 7. INDEPENDENT CONTRACTOR
Advisor is an independent contractor, not an employee.

## 8. TERMINATION
Either party may terminate with [NOTICE_DAYS] days' notice.

## 9. GOVERNING LAW
Governed by the laws of [JURISDICTION].`,
    variables: ['COMPANY_NAME', 'STATE', 'ENTITY_TYPE', 'ADVISOR_NAME', 'ADVISORY_SCOPE', 'ENGAGEMENT_LEVEL', 'HOURS_PER_MONTH', 'INITIAL_TERM', 'RENEWAL_TERM', 'EQUITY_AMOUNT', 'EQUITY_TYPE', 'EXERCISE_PRICE', 'FMV', 'VESTING_MONTHS', 'CLIFF_MONTHS', 'CASH_COMPENSATION', 'NOTICE_DAYS', 'JURISDICTION', 'DATE'],
    featured: false,
    createdAt: '2025-04-15T00:00:00.000Z'
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
