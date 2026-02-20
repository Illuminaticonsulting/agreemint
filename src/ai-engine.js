/**
 * AgreeMint — AI Contract Generation Engine
 *
 * Institutional-grade AI for generating, analyzing, negotiating,
 * and risk-scoring legal agreements across 20+ document types
 * and 8+ compliance frameworks.
 */

const OpenAI = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL = process.env.AI_MODEL || 'gpt-4o';

// ─── System Prompt ─────────────────────────────────────
const SYSTEM_PROMPT = `You are **AgreeMint AI**, an elite legal agreement generation and analysis engine used by institutional firms, law practices, and Fortune 500 companies worldwide.

You combine deep legal knowledge across multiple jurisdictions with precise contract drafting skills. You generate agreements that are:
- Legally enforceable and jurisdiction-aware
- Clear, unambiguous, and professionally formatted
- Comprehensive in coverage of obligations, rights, and remedies
- Balanced (unless instructed to favor one party)
- Compliant with relevant regulations (GDPR, CCPA, SOX, HIPAA, SEC, etc.)

**Output Rules:**
- Use proper legal formatting with numbered sections and subsections
- Include standard boilerplate (entire agreement, severability, amendments, notices, counterparts)
- Use defined terms consistently (capitalize and define on first use)
- Include governing law and dispute resolution clauses
- Add signature blocks with date lines
- Use Markdown formatting for structure
- Be thorough — institutional clients expect completeness

**Jurisdiction Awareness:**
When a jurisdiction is specified, tailor the agreement to local law (choice of law, statute of limitations, specific regulatory requirements, required disclosures).

**Risk Awareness:**
Flag any clauses that create unusual risk exposure, liability gaps, or regulatory concerns with [RISK NOTE] annotations.`;

// ─── Agreement Type Prompts ────────────────────────────
const AGREEMENT_PROMPTS = {

  'nda-mutual': `Generate a **Mutual Non-Disclosure Agreement (NDA)**.

Both parties are disclosing and receiving confidential information. Include:
- Clear definition of Confidential Information (broad but bounded)
- Mutual obligations of confidentiality
- Permitted disclosures (employees, advisors, legal requirements)
- Exclusions from confidentiality (public knowledge, independent development, prior knowledge)
- Term and survival period (default: 2 years term, 3 years survival)
- Return/destruction of materials clause
- No license grant clause
- Injunctive relief clause
- Residuals clause (optional, note if included)
- Non-solicitation of employees (optional)`,

  'nda-unilateral': `Generate a **Unilateral (One-Way) Non-Disclosure Agreement**.

Only one party (Discloser) shares confidential information with the other (Recipient). Include:
- Strong protections favoring the Discloser
- Specific standard of care (at least the same degree as own confidential info)
- Obligation to notify of unauthorized disclosure
- No reverse engineering clause
- Audit rights for the Discloser
- Clear remedies including liquidated damages option`,

  'msa': `Generate a **Master Service Agreement (MSA)**.

This is the overarching contract governing ongoing service relationships. Include:
- Scope of services (general, with SOW mechanism)
- Ordering process (SOW/Change Order procedure)
- Fees and payment terms (Net 30 default)
- Intellectual property ownership
- Representations and warranties
- Limitation of liability (with carve-outs)
- Indemnification (mutual)
- Insurance requirements
- Data protection and security obligations
- Termination (for cause and convenience)
- Force majeure
- Non-solicitation
- Dispute resolution (escalation ladder)
- Governing law
- Assignment restrictions
- Survival clause`,

  'sow': `Generate a **Statement of Work (SOW)** to be attached to an MSA.

Include:
- Project description and objectives
- Detailed scope of work with deliverables
- Timeline and milestones
- Acceptance criteria
- Resources and responsibilities (both parties)
- Fees and payment schedule (milestone-based)
- Change order process
- Assumptions and dependencies
- Out of scope items (explicit exclusions)
- Project governance and reporting`,

  'sla': `Generate a **Service Level Agreement (SLA)**.

Include:
- Service description and scope
- Performance metrics and KPIs with specific thresholds
- Uptime guarantees (e.g., 99.9%, 99.95%, 99.99%)
- Response time commitments (by severity level: P1, P2, P3, P4)
- Resolution time commitments
- Measurement methodology and reporting frequency
- Service credits and remedies for breaches
- Exclusions (scheduled maintenance, force majeure, client-caused issues)
- Escalation procedures
- Review and amendment process`,

  'employment': `Generate an **Employment Agreement**.

Include:
- Position, title, reporting structure
- Start date, employment type (at-will vs. fixed term)
- Compensation (base salary, bonus structure, equity if applicable)
- Benefits summary
- Work schedule and location (remote/hybrid/office)
- Duties and responsibilities
- Proprietary information and invention assignment
- Non-compete and non-solicitation
- Termination provisions (with/without cause, resignation, severance)
- Dispute resolution (arbitration clause)
- Governing law
- Section 409A compliance language (if deferred compensation)`,

  'contractor': `Generate an **Independent Contractor Agreement**.

Include:
- Scope of services
- Contractor status (explicit independent contractor, not employee)
- IRS/tax classification language
- Compensation and invoicing terms
- Expenses
- Intellectual property assignment (work-for-hire)
- Confidentiality
- Non-compete/non-solicitation (reasonable scope)
- Insurance and indemnification
- Termination (notice period)
- No benefits/employment rights disclaimer
- Tax reporting obligations (1099)`,

  'partnership': `Generate a **Partnership Agreement**.

Include:
- Partnership name, purpose, and principal place of business
- Capital contributions (initial and additional)
- Profit and loss allocation
- Management and voting rights
- Partner duties and restrictions
- Withdrawal and admission of partners
- Dissolution triggers and procedures
- Distribution of assets on dissolution
- Non-compete during and after partnership
- Dispute resolution
- Tax elections (Section 754, etc.)
- Buy-sell provisions (valuation method)
- Death/disability provisions`,

  'investment-safe': `Generate a **SAFE (Simple Agreement for Future Equity)**.

Follow the Y Combinator SAFE format and include:
- Investment amount
- Valuation cap
- Discount rate (if applicable)
- MFN (Most Favored Nation) provision option
- Conversion mechanics (Equity Financing, Liquidity Event, Dissolution)
- Definition of Equity Financing threshold
- Pro rata rights option
- Representations of the Company
- Representations of the Investor
- Miscellaneous (amendment, governing law, etc.)`,

  'investment-convertible': `Generate a **Convertible Note Agreement**.

Include:
- Principal amount and funding date
- Interest rate and accrual method
- Maturity date
- Conversion terms (automatic: qualified financing, optional: maturity)
- Valuation cap
- Discount rate
- Qualified financing threshold
- Prepayment restrictions
- Events of default
- Subordination
- Information rights
- Board observer rights (if applicable)
- Anti-dilution provisions`,

  'licensing': `Generate a **Licensing Agreement**.

Include:
- Licensed property/IP description
- Grant of license (exclusive vs. non-exclusive, territory, field of use)
- License fees and royalties (rate, calculation, payment schedule)
- Minimum royalty guarantees
- Sublicensing rights
- Quality control and approval rights
- IP ownership and improvements
- Audit rights
- Term and renewal
- Termination triggers
- Post-termination rights (sell-off period)
- Indemnification (IP infringement)
- Representations and warranties`,

  'ip-assignment': `Generate an **IP Assignment Agreement**.

Include:
- Description of assigned IP (patents, trademarks, copyrights, trade secrets, domain names)
- Assignment language (irrevocable, worldwide, all rights)
- Consideration
- Representations of ownership and non-encumbrance
- Further assurances (obligation to execute additional documents)
- Power of attorney for IP filings
- Moral rights waiver (where applicable)
- No retained rights
- Work product assignment (past and future)
- Cooperation obligations`,

  'advisory': `Generate an **Advisory Agreement**.

Include:
- Advisory role and responsibilities
- Time commitment (hours/month)
- Equity compensation (vesting schedule, cliff, acceleration)
- Cash compensation (if any)
- Expense reimbursement
- Confidentiality obligations
- IP assignment for contributions
- Non-compete/non-solicitation
- Term and termination
- Independent contractor status
- Board of Advisors membership terms`,

  'terms-of-service': `Generate **Terms of Service** for a technology platform.

Include:
- Acceptance of terms
- Account registration and responsibilities
- Acceptable use policy
- Intellectual property rights
- User content and licenses granted
- Privacy (reference to Privacy Policy)
- Payment terms and billing
- Subscription auto-renewal and cancellation
- Disclaimers (AS IS)
- Limitation of liability
- Indemnification
- Dispute resolution (binding arbitration, class action waiver)
- DMCA/copyright takedown procedure
- Modifications to terms
- Governing law
- Severability
- Contact information`,

  'privacy-policy': `Generate a **Privacy Policy** that is GDPR, CCPA, and international-compliant.

Include:
- Information collected (personal data, usage data, cookies)
- Legal basis for processing (GDPR Article 6)
- How information is used
- Data sharing and third parties
- International data transfers (SCCs, adequacy decisions)
- Data retention periods
- User rights (access, rectification, erasure, portability, objection)
- Right to opt-out of sale (CCPA)
- Children's privacy (COPPA)
- Security measures
- Cookie policy
- Do Not Track signals
- Data breach notification procedures
- DPO contact information
- Updates to policy`,

  'jv': `Generate a **Joint Venture Agreement**.

Include:
- JV name, purpose, and scope
- Structure (contractual JV vs. entity-based)
- Capital contributions and ownership percentages
- Management committee structure and voting
- Operating plan and budget approval
- Intellectual property contributions and ownership
- Revenue and expense sharing
- Non-compete restrictions
- Put/call options
- Deadlock resolution mechanism
- Term, extension, and termination
- Wind-down procedures
- Confidentiality between JV and parents
- Competition law compliance`,

  'llc-operating': `Generate an **LLC Operating Agreement**.

Include:
- Formation and purpose
- Members, capital contributions, and ownership percentages
- Management structure (member-managed vs. manager-managed)
- Voting rights and major decision thresholds
- Capital calls and additional contributions
- Distributions (timing, priority, tax distributions)
- Transfer restrictions (ROFR, tag-along, drag-along)
- Admission of new members
- Withdrawal and removal of members
- Dissolution triggers
- Tax elections and allocations (Section 704(b))
- Books. records, and reporting
- Indemnification of managers
- Amendment procedures`,

  'non-compete': `Generate a **Non-Compete / Non-Solicitation Agreement**.

Include:
- Restricted activities (clear and specific)
- Geographic scope (reasonable bounds)
- Duration (reasonable period — note enforceability varies by state)
- Non-solicitation of clients/customers
- Non-solicitation of employees
- Garden leave provisions (if applicable)
- Consideration (new employment, severance, bonus, etc.)
- Blue pencil / reformation clause
- Injunctive relief
- Enforceability acknowledgment
- State-specific carve-outs (note: California generally prohibits non-competes)`,

  'board-resolution': `Generate a **Board Resolution**.

Include:
- Company name and state of incorporation
- Date and type of meeting (regular/special/written consent)
- Quorum certification
- Resolved clauses (clearly numbered)
- Authorization specifics (who is authorized to do what)
- Ratification of prior actions (if applicable)
- Secretary certification
- Signature blocks for all directors`,

  'custom': `Generate a custom legal agreement based on the user's specific requirements. Generate a comprehensive, enforceable agreement following best practices for the type of contract described. Include all standard protective clauses and tailor the content to the specific situation described.`
};

// ─── Generate Agreement ────────────────────────────────
async function generateAgreement(type, details, options = {}) {
  const typePrompt = AGREEMENT_PROMPTS[type] || AGREEMENT_PROMPTS['custom'];

  const jurisdiction = options.jurisdiction || 'United States (Delaware)';
  const favorParty = options.favorParty || 'balanced';
  const complexity = options.complexity || 'institutional';

  const prompt = `${typePrompt}

**Jurisdiction:** ${jurisdiction}
**Drafting Stance:** ${favorParty === 'balanced' ? 'Balanced — fair to both parties' : `Favor ${favorParty} — protect their interests more aggressively`}
**Complexity Level:** ${complexity}
${options.additionalClauses ? `**Additional Requirements:** ${options.additionalClauses}` : ''}

**Party Details & Context:**
${details}

Generate the complete agreement now. Use proper legal formatting with numbered sections (1., 1.1, 1.1.1). Include [BRACKET PLACEHOLDERS] for any specific information not provided (dates, addresses, exact amounts if not specified).`;

  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: prompt }
    ],
    max_tokens: 8000,
    temperature: 0.3
  });

  return response.choices[0].message.content;
}

// ─── Analyze Agreement (Risk Scoring) ──────────────────
async function analyzeAgreement(agreementText, partyRole = 'neutral') {
  const prompt = `Analyze the following agreement from the perspective of ${partyRole === 'neutral' ? 'a neutral third party' : partyRole}. Provide an institutional-grade risk assessment.

**Required Analysis Format:**

## Risk Assessment Summary

### Overall Risk Score: [X/100]
(0 = no risk, 100 = extreme risk)

### Risk Breakdown by Category

| Category | Risk Level | Score | Key Concerns |
|----------|-----------|-------|--------------|
| Financial Exposure | Low/Medium/High/Critical | X/100 | ... |
| IP & Ownership | Low/Medium/High/Critical | X/100 | ... |
| Liability & Indemnification | Low/Medium/High/Critical | X/100 | ... |
| Termination Risk | Low/Medium/High/Critical | X/100 | ... |
| Compliance & Regulatory | Low/Medium/High/Critical | X/100 | ... |
| Data & Privacy | Low/Medium/High/Critical | X/100 | ... |
| Enforceability | Low/Medium/High/Critical | X/100 | ... |

### Critical Issues (Must Address)
Numbered list of showstopper issues.

### Warning Issues (Should Address)
Numbered list of concerning but non-critical issues.

### Missing Clauses
Standard clauses that are absent and should be added.

### Favorable Clauses
Clauses that are particularly well-drafted or protective.

### Negotiation Recommendations
Specific suggested changes with rationale.

### Compliance Check
- GDPR: Pass/Fail/N/A
- CCPA: Pass/Fail/N/A
- SOX: Pass/Fail/N/A
- HIPAA: Pass/Fail/N/A
- SEC: Pass/Fail/N/A
- Labor Law: Pass/Fail/N/A

---

**Agreement to Analyze:**

${agreementText}`;

  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: prompt }
    ],
    max_tokens: 4000,
    temperature: 0.2
  });

  return response.choices[0].message.content;
}

// ─── Negotiate / Suggest Counterproposal ───────────────
async function negotiateAgreement(agreementText, negotiationGoals, partyRole) {
  const prompt = `You are acting as legal counsel for "${partyRole}". Review the following agreement and generate a marked-up counterproposal.

**Negotiation Goals:**
${negotiationGoals}

**Instructions:**
1. Identify every clause that is unfavorable, unbalanced, or needs improvement for your client
2. For each issue, provide:
   - The original clause text
   - Your proposed revised language
   - Brief justification for the change
3. Rate each proposed change: Critical / Important / Nice-to-Have
4. Provide a negotiation strategy summary (what to push hard on, what to concede)

**Agreement:**

${agreementText}`;

  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: prompt }
    ],
    max_tokens: 6000,
    temperature: 0.3
  });

  return response.choices[0].message.content;
}

// ─── Extract Key Terms ─────────────────────────────────
async function extractKeyTerms(agreementText) {
  const prompt = `Extract all key terms, obligations, deadlines, and financial commitments from this agreement. Format as structured data.

**Required Output:**

## Key Terms Extracted

### Parties
- Party A: [Name, Role]
- Party B: [Name, Role]

### Financial Terms
| Item | Amount | Frequency | Due Date |
|------|--------|-----------|----------|

### Key Dates & Deadlines
| Event | Date | Consequence of Missing |
|-------|------|----------------------|

### Obligations by Party
**Party A must:**
1. ...

**Party B must:**
1. ...

### Restrictions
- Non-compete: [scope, duration, geography]
- Non-solicitation: [scope, duration]
- Confidentiality: [scope, duration, survival]

### Termination Triggers
| Trigger | Who Can Terminate | Notice Required | Consequences |
|---------|------------------|-----------------|--------------|

### Governing Law & Disputes
- Jurisdiction: ...
- Dispute Resolution: ...
- Prevailing Party Fees: Yes/No

### Insurance Requirements
...

### IP Ownership
...

---

**Agreement:**

${agreementText}`;

  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: prompt }
    ],
    max_tokens: 3000,
    temperature: 0.1
  });

  return response.choices[0].message.content;
}

// ─── Compare Two Versions ──────────────────────────────
async function compareVersions(version1, version2) {
  const prompt = `Compare these two versions of an agreement and provide a detailed redline analysis.

**Version 1 (Original):**
${version1}

**Version 2 (Revised):**
${version2}

**Required Output:**

## Redline Analysis

### Summary of Changes
Brief overview of what changed and the significance.

### Detailed Changes

For each change:
| # | Section | Change Type | Original Language | Revised Language | Impact Assessment |
|---|---------|-------------|-------------------|------------------|-------------------|

Change Types: Added, Removed, Modified, Moved

### Risk Impact
Did the changes increase or decrease risk? For whom?

### Recommendation
Accept / Reject / Negotiate further — with reasoning.`;

  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: prompt }
    ],
    max_tokens: 5000,
    temperature: 0.2
  });

  return response.choices[0].message.content;
}

// ─── Chat about Agreements ─────────────────────────────
async function legalChat(messages) {
  const apiMessages = [
    { role: 'system', content: SYSTEM_PROMPT + '\n\nYou are in conversational mode. Help the user with any agreement, contract, or legal question. Be specific, actionable, and cite relevant laws when applicable. If the user asks you to draft something, generate it in full.' },
    ...messages.map(m => ({ role: m.role, content: m.content }))
  ];

  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: apiMessages,
    max_tokens: 6000,
    temperature: 0.4
  });

  return response.choices[0].message.content;
}

module.exports = {
  generateAgreement,
  analyzeAgreement,
  negotiateAgreement,
  extractKeyTerms,
  compareVersions,
  legalChat,
  AGREEMENT_PROMPTS
};
