/**
 * AgreeMint — Legal Professional Marketplace Engine
 *
 * Connects users with verified lawyers and paralegals who can:
 *   1. Review agreements for legal accuracy ($50-200/review)
 *   2. Customize agreements for specific needs ($100-500)
 *   3. Provide legal consultation ($150-400/hour)
 *   4. Create custom templates for the marketplace
 *   5. Serve as escrow arbiters ($200-1000/dispute)
 *
 * Revenue Model:
 *   - Platform commission: 15-25% of professional's fee
 *   - Standard reviews: 20% commission
 *   - Custom work: 15% commission
 *   - Dispute arbitration: 25% commission
 *
 * Verification:
 *   - Bar association lookup
 *   - License number verification
 *   - Jurisdictional qualification
 *   - Client ratings & reviews
 */

const { v4: uuidv4 } = require('uuid');

// ─── Commission Rates ──────────────────────────────────
const COMMISSION_RATES = {
  review: 0.20,       // 20%
  customize: 0.15,    // 15%
  consultation: 0.20, // 20%
  arbitration: 0.25,  // 25%
  template: 0.20      // 20% (template marketplace)
};

// ─── Service Types ─────────────────────────────────────
const SERVICE_TYPES = {
  review: {
    name: 'Agreement Review',
    description: 'Professional legal review of your agreement with risk assessment and recommendations',
    minPrice: 5000,  // $50
    maxPrice: 50000, // $500
    avgDuration: '24-48 hours',
    deliverable: 'Written review report with risk analysis and suggested changes'
  },
  customize: {
    name: 'Agreement Customization',
    description: 'Tailored modifications to an existing agreement for your specific needs',
    minPrice: 10000, // $100
    maxPrice: 100000, // $1000
    avgDuration: '2-5 business days',
    deliverable: 'Customized agreement with change summary'
  },
  consultation: {
    name: 'Legal Consultation',
    description: 'One-on-one video or chat consultation with a legal professional',
    minPrice: 15000, // $150/hr
    maxPrice: 80000, // $800/hr
    avgDuration: '30-60 minutes',
    deliverable: 'Consultation notes and action items'
  },
  draft: {
    name: 'Custom Drafting',
    description: 'Create a custom agreement from scratch based on your requirements',
    minPrice: 25000, // $250
    maxPrice: 200000, // $2000
    avgDuration: '3-7 business days',
    deliverable: 'Complete custom agreement ready for signing'
  },
  arbitration: {
    name: 'Dispute Arbitration',
    description: 'Serve as neutral arbiter in an escrow or agreement dispute',
    minPrice: 20000, // $200
    maxPrice: 200000, // $2000
    avgDuration: '5-14 business days',
    deliverable: 'Binding arbitration decision with written ruling'
  }
};

// ─── Specialization Categories ─────────────────────────
const SPECIALIZATIONS = [
  'Contract Law', 'Corporate Law', 'Intellectual Property', 'Employment Law',
  'Real Estate', 'Technology & SaaS', 'International Trade', 'Mergers & Acquisitions',
  'Startup & Venture Capital', 'Privacy & Data Protection', 'Blockchain & Crypto',
  'Non-Disclosure Agreements', 'Licensing', 'Dispute Resolution', 'Compliance & Regulatory',
  'Tax Law', 'Immigration', 'Family Law', 'Estate Planning', 'Securities Law'
];

// ─── Pre-loaded Professionals (Seed Data) ──────────────
const SEED_PROFESSIONALS = [
  {
    id: 'lpro_001',
    name: 'Sarah Chen, Esq.',
    title: 'Corporate Attorney',
    firm: 'Chen & Associates',
    barNumber: 'CA-328741',
    barState: 'California',
    jurisdictions: ['United States (California)', 'United States (Delaware)', 'United States (New York)'],
    specializations: ['Corporate Law', 'Startup & Venture Capital', 'Mergers & Acquisitions', 'Intellectual Property'],
    bio: 'Former BigLaw associate with 12+ years of experience in corporate transactions, venture capital financing, and M&A. Specializes in startup legal needs including SAFE notes, Series A financing, and IP protection strategies.',
    hourlyRate: 35000, // $350/hr
    reviewRate: 15000, // $150/review
    customizeRate: 30000, // $300/customize
    rating: 4.9,
    ratingCount: 87,
    completedJobs: 142,
    responseTime: '< 4 hours',
    verified: true,
    verifiedAt: '2025-11-15T00:00:00Z',
    languages: ['en', 'zh'],
    availability: 'available',
    avatar: '',
    createdAt: '2025-10-01T00:00:00Z'
  },
  {
    id: 'lpro_002',
    name: 'Marcus Williams, J.D.',
    title: 'Technology Counsel',
    firm: 'Williams Legal Tech',
    barNumber: 'NY-487293',
    barState: 'New York',
    jurisdictions: ['United States (New York)', 'United States (Delaware)'],
    specializations: ['Technology & SaaS', 'Privacy & Data Protection', 'Blockchain & Crypto', 'Licensing'],
    bio: 'Tech-focused attorney specializing in SaaS agreements, data privacy compliance (GDPR, CCPA), blockchain legal frameworks, and software licensing. Former in-house counsel at two Web3 startups.',
    hourlyRate: 30000,
    reviewRate: 10000,
    customizeRate: 25000,
    rating: 4.8,
    ratingCount: 63,
    completedJobs: 98,
    responseTime: '< 2 hours',
    verified: true,
    verifiedAt: '2025-12-01T00:00:00Z',
    languages: ['en'],
    availability: 'available',
    avatar: '',
    createdAt: '2025-10-15T00:00:00Z'
  },
  {
    id: 'lpro_003',
    name: 'Fatima Al-Rashidi, LL.M.',
    title: 'International Trade Attorney',
    firm: 'Al-Rashidi & Partners',
    barNumber: 'DIFC-001847',
    barState: 'UAE (DIFC)',
    jurisdictions: ['United Arab Emirates (DIFC)', 'United Kingdom', 'Singapore'],
    specializations: ['International Trade', 'Corporate Law', 'Compliance & Regulatory', 'Dispute Resolution'],
    bio: 'DIFC-qualified attorney with expertise in cross-border transactions, international trade law, and Gulf region regulatory compliance. Trilingual (English, Arabic, French) with extensive experience in MENA markets.',
    hourlyRate: 40000,
    reviewRate: 20000,
    customizeRate: 40000,
    rating: 4.7,
    ratingCount: 41,
    completedJobs: 67,
    responseTime: '< 6 hours',
    verified: true,
    verifiedAt: '2026-01-10T00:00:00Z',
    languages: ['en', 'ar', 'fr'],
    availability: 'available',
    avatar: '',
    createdAt: '2025-11-01T00:00:00Z'
  },
  {
    id: 'lpro_004',
    name: 'David Park, Esq.',
    title: 'IP & Employment Attorney',
    firm: 'Park Legal Group',
    barNumber: 'DE-192847',
    barState: 'Delaware',
    jurisdictions: ['United States (Delaware)', 'United States (California)'],
    specializations: ['Intellectual Property', 'Employment Law', 'Non-Disclosure Agreements', 'Licensing'],
    bio: 'IP and employment law specialist helping companies protect their innovations and build compliant workforces. Expert in NDA drafting, trade secret protection, non-compete agreements, and patent strategy.',
    hourlyRate: 28000,
    reviewRate: 8000,
    customizeRate: 20000,
    rating: 4.6,
    ratingCount: 52,
    completedJobs: 89,
    responseTime: '< 8 hours',
    verified: true,
    verifiedAt: '2025-12-20T00:00:00Z',
    languages: ['en'],
    availability: 'available',
    avatar: '',
    createdAt: '2025-10-20T00:00:00Z'
  },
  {
    id: 'lpro_005',
    name: 'Claire Moreau, Avocat',
    title: 'European Business Counsel',
    firm: 'Moreau Avocats',
    barNumber: 'PAR-A19283',
    barState: 'France (Paris Bar)',
    jurisdictions: ['France', 'European Union', 'United Kingdom', 'Singapore'],
    specializations: ['Corporate Law', 'Privacy & Data Protection', 'International Trade', 'Compliance & Regulatory'],
    bio: 'Paris-qualified avocat specializing in cross-border business transactions between Europe, UK, and Asia. GDPR compliance expert. Bilingual (French/English) with working knowledge of Mandarin.',
    hourlyRate: 32000,
    reviewRate: 12000,
    customizeRate: 28000,
    rating: 4.8,
    ratingCount: 38,
    completedJobs: 55,
    responseTime: '< 4 hours',
    verified: true,
    verifiedAt: '2026-01-05T00:00:00Z',
    languages: ['fr', 'en', 'zh'],
    availability: 'available',
    avatar: '',
    createdAt: '2025-11-10T00:00:00Z'
  }
];

// ─── Professional Registration ─────────────────────────

function registerProfessional(data) {
  const { name, title, firm, barNumber, barState, jurisdictions, specializations, bio, hourlyRate, reviewRate, customizeRate, languages } = data;

  if (!name || !barNumber || !barState) throw new Error('Name, bar number, and bar state required');
  if (!jurisdictions?.length) throw new Error('At least one jurisdiction required');
  if (!specializations?.length) throw new Error('At least one specialization required');

  return {
    id: `lpro_${uuidv4().substring(0, 8)}`,
    name,
    title: title || 'Attorney',
    firm: firm || 'Independent',
    barNumber,
    barState,
    jurisdictions: jurisdictions || [],
    specializations: specializations || [],
    bio: bio || '',
    hourlyRate: hourlyRate || 25000,
    reviewRate: reviewRate || 10000,
    customizeRate: customizeRate || 20000,
    rating: 0,
    ratingCount: 0,
    completedJobs: 0,
    responseTime: 'N/A',
    verified: false, // Admin must verify
    verifiedAt: null,
    languages: languages || ['en'],
    availability: 'pending_verification',
    avatar: '',
    reviews: [],
    earnings: { total: 0, pending: 0, paid: 0 },
    createdAt: new Date().toISOString()
  };
}

// ─── Service Request ───────────────────────────────────

function createServiceRequest(userId, professionalId, data) {
  const { serviceType, agreementId, description, budget, urgency } = data;

  if (!serviceType || !SERVICE_TYPES[serviceType]) throw new Error('Valid service type required');
  if (!description) throw new Error('Description of work required');

  return {
    id: `sreq_${uuidv4().substring(0, 8)}`,
    userId,
    professionalId,
    serviceType,
    agreementId: agreementId || null,
    description,
    budget: budget || null,
    urgency: urgency || 'standard', // standard, urgent, rush
    status: 'pending', // pending, accepted, in_progress, review, completed, cancelled, disputed
    commissionRate: COMMISSION_RATES[serviceType] || 0.20,
    quote: null,
    deliverables: [],
    messages: [],
    rating: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    acceptedAt: null,
    completedAt: null
  };
}

// ─── Quote Management ──────────────────────────────────

function submitQuote(request, quote) {
  const { amount, estimatedDays, notes } = quote;
  if (!amount) throw new Error('Quote amount required');

  request.quote = {
    amount,
    platformCommission: Math.round(amount * request.commissionRate),
    professionalEarns: Math.round(amount * (1 - request.commissionRate)),
    estimatedDays: estimatedDays || 3,
    notes: notes || '',
    submittedAt: new Date().toISOString()
  };
  request.status = 'quoted';
  request.updatedAt = new Date().toISOString();
  return request;
}

function acceptQuote(request) {
  if (request.status !== 'quoted') throw new Error('No quote to accept');
  request.status = 'accepted';
  request.acceptedAt = new Date().toISOString();
  request.updatedAt = new Date().toISOString();
  return request;
}

// ─── Deliverables ──────────────────────────────────────

function addDeliverable(request, deliverable) {
  const { title, content, fileUrl } = deliverable;
  if (!title) throw new Error('Deliverable title required');

  const d = {
    id: uuidv4().substring(0, 8),
    title,
    content: content || '',
    fileUrl: fileUrl || null,
    submittedAt: new Date().toISOString()
  };
  request.deliverables.push(d);
  request.status = 'review';
  request.updatedAt = new Date().toISOString();
  return d;
}

function completeRequest(request) {
  request.status = 'completed';
  request.completedAt = new Date().toISOString();
  request.updatedAt = new Date().toISOString();
  return request;
}

// ─── Messaging ─────────────────────────────────────────

function addMessage(request, from, message) {
  request.messages.push({
    from,
    message,
    timestamp: new Date().toISOString()
  });
  request.updatedAt = new Date().toISOString();
  return request;
}

// ─── Reviews ───────────────────────────────────────────

function reviewProfessional(professional, review) {
  const { rating, comment, requestId } = review;
  if (rating < 1 || rating > 5) throw new Error('Rating must be 1-5');

  const r = {
    rating,
    comment: (comment || '').substring(0, 1000),
    requestId: requestId || null,
    createdAt: new Date().toISOString()
  };
  if (!professional.reviews) professional.reviews = [];
  professional.reviews.push(r);

  // Recalculate average
  const total = professional.reviews.reduce((s, rev) => s + rev.rating, 0);
  professional.rating = Math.round((total / professional.reviews.length) * 10) / 10;
  professional.ratingCount = professional.reviews.length;

  return r;
}

// ─── Search & Filter ───────────────────────────────────

function searchProfessionals(professionals, filters = {}) {
  let results = [...professionals].filter(p => p.verified);

  if (filters.specialization) {
    results = results.filter(p => p.specializations.some(s => s.toLowerCase().includes(filters.specialization.toLowerCase())));
  }
  if (filters.jurisdiction) {
    results = results.filter(p => p.jurisdictions.some(j => j.toLowerCase().includes(filters.jurisdiction.toLowerCase())));
  }
  if (filters.language) {
    results = results.filter(p => p.languages.includes(filters.language));
  }
  if (filters.minRating) {
    results = results.filter(p => p.rating >= filters.minRating);
  }
  if (filters.maxRate) {
    results = results.filter(p => p.hourlyRate <= filters.maxRate);
  }
  if (filters.availability) {
    results = results.filter(p => p.availability === filters.availability);
  }
  if (filters.search) {
    const s = filters.search.toLowerCase();
    results = results.filter(p =>
      p.name.toLowerCase().includes(s) ||
      p.bio.toLowerCase().includes(s) ||
      p.specializations.some(sp => sp.toLowerCase().includes(s))
    );
  }

  // Sort
  switch (filters.sort) {
    case 'rating':   results.sort((a, b) => b.rating - a.rating); break;
    case 'price_low':  results.sort((a, b) => a.hourlyRate - b.hourlyRate); break;
    case 'price_high': results.sort((a, b) => b.hourlyRate - a.hourlyRate); break;
    case 'jobs':     results.sort((a, b) => b.completedJobs - a.completedJobs); break;
    default:         results.sort((a, b) => b.rating - a.rating); break;
  }

  return results;
}

module.exports = {
  COMMISSION_RATES,
  SERVICE_TYPES,
  SPECIALIZATIONS,
  SEED_PROFESSIONALS,
  registerProfessional,
  createServiceRequest,
  submitQuote,
  acceptQuote,
  addDeliverable,
  completeRequest,
  addMessage,
  reviewProfessional,
  searchProfessionals
};
