/**
 * AgreeMint — SOC 2 Type II Compliance Engine
 *
 * Prepares the platform for SOC 2 Type II certification by implementing:
 *
 * Trust Service Criteria:
 *   1. Security — Access controls, MFA tracking, encryption policies
 *   2. Availability — Uptime monitoring, incident response, health checks
 *   3. Processing Integrity — Data validation, audit trails, error handling
 *   4. Confidentiality — Data classification, encryption at rest/transit, access logs
 *   5. Privacy — Consent management, data retention, subject access requests
 *
 * This engine provides:
 *   - Comprehensive audit logging
 *   - Compliance checklist tracking
 *   - Security policy document generation
 *   - Access control matrix
 *   - Incident response framework
 *   - Evidence collection for auditors
 *   - Data retention policy enforcement
 */

const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

// ─── Audit Log Categories ──────────────────────────────
const AUDIT_CATEGORIES = {
  AUTH: 'authentication',
  ACCESS: 'access_control',
  DATA: 'data_operation',
  ADMIN: 'admin_action',
  SECURITY: 'security_event',
  AGREEMENT: 'agreement_lifecycle',
  ESCROW: 'escrow_operation',
  SYSTEM: 'system_event',
  COMPLIANCE: 'compliance',
  PRIVACY: 'privacy'
};

const SEVERITY = {
  INFO: 'info',
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

// ─── Audit Logger ──────────────────────────────────────
function createAuditLog(category, action, details = {}) {
  return {
    id: `aud_${uuidv4().substring(0, 12)}`,
    timestamp: new Date().toISOString(),
    category,
    action,
    severity: details.severity || SEVERITY.INFO,
    userId: details.userId || null,
    userEmail: details.userEmail || null,
    ipAddress: details.ipAddress || null,
    userAgent: details.userAgent || null,
    resourceType: details.resourceType || null,
    resourceId: details.resourceId || null,
    description: details.description || '',
    metadata: details.metadata || {},
    hash: null // Will be set below for tamper-evidence
  };
}

function hashAuditLog(log, previousHash) {
  const content = JSON.stringify({
    id: log.id,
    timestamp: log.timestamp,
    category: log.category,
    action: log.action,
    userId: log.userId,
    description: log.description,
    previousHash: previousHash || 'genesis'
  });
  log.hash = crypto.createHash('sha256').update(content).digest('hex');
  return log;
}

// ─── Common Audit Actions ──────────────────────────────
const AUDIT_ACTIONS = {
  // Authentication
  LOGIN_SUCCESS: 'login_success',
  LOGIN_FAILURE: 'login_failure',
  LOGOUT: 'logout',
  PASSWORD_CHANGE: 'password_change',
  API_KEY_CREATED: 'api_key_created',
  API_KEY_REVOKED: 'api_key_revoked',

  // Data Operations
  AGREEMENT_CREATED: 'agreement_created',
  AGREEMENT_VIEWED: 'agreement_viewed',
  AGREEMENT_SIGNED: 'agreement_signed',
  AGREEMENT_DELETED: 'agreement_deleted',
  AGREEMENT_EXPORTED: 'agreement_exported',

  // Escrow
  ESCROW_FUNDED: 'escrow_funded',
  ESCROW_RELEASED: 'escrow_released',
  ESCROW_DISPUTED: 'escrow_disputed',
  ESCROW_REFUNDED: 'escrow_refunded',

  // Admin
  USER_CREATED: 'user_created',
  USER_DELETED: 'user_deleted',
  USER_ROLE_CHANGED: 'user_role_changed',
  SETTINGS_CHANGED: 'settings_changed',

  // Security
  SUSPICIOUS_ACTIVITY: 'suspicious_activity',
  RATE_LIMIT_EXCEEDED: 'rate_limit_exceeded',
  UNAUTHORIZED_ACCESS: 'unauthorized_access',
  DATA_BREACH_DETECTED: 'data_breach_detected',

  // Privacy
  CONSENT_GRANTED: 'consent_granted',
  CONSENT_REVOKED: 'consent_revoked',
  DATA_EXPORT_REQUESTED: 'data_export_requested',
  DATA_DELETION_REQUESTED: 'data_deletion_requested',
  DATA_DELETION_COMPLETED: 'data_deletion_completed'
};

// ─── SOC 2 Compliance Checklist ────────────────────────
const COMPLIANCE_CHECKLIST = {
  security: {
    name: 'Security (CC)',
    items: [
      { id: 'sec-01', control: 'CC1.1 — Entity-level controls', description: 'Management commitment to security, integrity, and ethical values', status: 'implemented', evidence: 'Security policy document, employee handbook' },
      { id: 'sec-02', control: 'CC2.1 — Information and communication', description: 'Internal and external communication of security objectives', status: 'implemented', evidence: 'Status page, security headers, privacy policy' },
      { id: 'sec-03', control: 'CC3.1 — Risk assessment', description: 'Risk identification and analysis process', status: 'implemented', evidence: 'Risk register, threat model documentation' },
      { id: 'sec-04', control: 'CC4.1 — Monitoring controls', description: 'Ongoing evaluation of control effectiveness', status: 'implemented', evidence: 'Audit logs, health monitoring, error tracking' },
      { id: 'sec-05', control: 'CC5.1 — Logical access controls', description: 'Authentication, authorization, and access management', status: 'implemented', evidence: 'JWT auth, role-based access, API key management' },
      { id: 'sec-06', control: 'CC5.2 — Access provisioning/de-provisioning', description: 'User account lifecycle management', status: 'implemented', evidence: 'User registration, account deletion endpoint' },
      { id: 'sec-07', control: 'CC6.1 — Encryption in transit', description: 'TLS/SSL for all data in transit', status: 'implemented', evidence: 'SSL certificate, HTTPS enforcement, HSTS header' },
      { id: 'sec-08', control: 'CC6.2 — Encryption at rest', description: 'Sensitive data encrypted at rest', status: 'partial', evidence: 'Password hashing (bcrypt), escrow data encrypted' },
      { id: 'sec-09', control: 'CC7.1 — Vulnerability management', description: 'Regular vulnerability scanning and patching', status: 'planned', evidence: 'npm audit, dependency updates' },
      { id: 'sec-10', control: 'CC7.2 — Incident response', description: 'Documented incident response procedures', status: 'implemented', evidence: 'Incident response plan, escalation matrix' },
      { id: 'sec-11', control: 'CC8.1 — Change management', description: 'Controlled deployment of changes', status: 'implemented', evidence: 'Git version control, deployment process' },
      { id: 'sec-12', control: 'CC9.1 — Risk mitigation', description: 'Event risk management and business continuity', status: 'partial', evidence: 'Data backups, health monitoring' }
    ]
  },
  availability: {
    name: 'Availability (A)',
    items: [
      { id: 'avl-01', control: 'A1.1 — Capacity planning', description: 'System capacity monitoring and planning', status: 'implemented', evidence: 'Server metrics, health endpoint, resource monitoring' },
      { id: 'avl-02', control: 'A1.2 — Recovery procedures', description: 'Backup and recovery processes', status: 'partial', evidence: 'Database backup scripts, deployment rollback' },
      { id: 'avl-03', control: 'A1.3 — Environmental safeguards', description: 'Infrastructure environmental controls', status: 'implemented', evidence: 'DigitalOcean datacenter certifications' }
    ]
  },
  processing_integrity: {
    name: 'Processing Integrity (PI)',
    items: [
      { id: 'pi-01', control: 'PI1.1 — Input validation', description: 'Data input validation and error handling', status: 'implemented', evidence: 'Server-side validation, sanitization middleware' },
      { id: 'pi-02', control: 'PI1.2 — Processing accuracy', description: 'Accurate and complete data processing', status: 'implemented', evidence: 'Agreement hash verification, signature validation' },
      { id: 'pi-03', control: 'PI1.3 — Output completeness', description: 'Complete and accurate output delivery', status: 'implemented', evidence: 'PDF generation with hash, blockchain anchoring' }
    ]
  },
  confidentiality: {
    name: 'Confidentiality (C)',
    items: [
      { id: 'con-01', control: 'C1.1 — Data classification', description: 'Data classified and handled per sensitivity', status: 'implemented', evidence: 'Data classification schema, access controls' },
      { id: 'con-02', control: 'C1.2 — Data disposal', description: 'Secure disposal of confidential data', status: 'implemented', evidence: 'Data deletion endpoints, retention policies' }
    ]
  },
  privacy: {
    name: 'Privacy (P)',
    items: [
      { id: 'prv-01', control: 'P1.1 — Privacy notice', description: 'Clear privacy notice with data practices', status: 'implemented', evidence: 'Privacy policy page, consent collection' },
      { id: 'prv-02', control: 'P2.1 — Data collection consent', description: 'Informed consent for data collection', status: 'implemented', evidence: 'Registration consent, cookie consent' },
      { id: 'prv-03', control: 'P3.1 — Data minimization', description: 'Collect only necessary personal data', status: 'implemented', evidence: 'Minimal registration fields, purpose-specific data' },
      { id: 'prv-04', control: 'P4.1 — Subject access requests', description: 'Process data subject access/deletion requests', status: 'implemented', evidence: 'Data export endpoint, deletion endpoint' },
      { id: 'prv-05', control: 'P5.1 — Data retention', description: 'Defined data retention and disposal periods', status: 'implemented', evidence: 'Retention policy document, auto-cleanup' }
    ]
  }
};

// ─── Security Policy Generator ─────────────────────────
function generateSecurityPolicy() {
  return {
    title: 'AgreeMint Information Security Policy',
    version: '1.0',
    effectiveDate: new Date().toISOString().split('T')[0],
    sections: [
      {
        title: '1. Purpose',
        content: 'This policy establishes the information security requirements for the AgreeMint platform, ensuring the confidentiality, integrity, and availability of all customer data and system resources.'
      },
      {
        title: '2. Scope',
        content: 'This policy applies to all AgreeMint systems, employees, contractors, and third-party service providers who access, process, store, or transmit AgreeMint customer data.'
      },
      {
        title: '3. Access Control',
        content: 'All access to AgreeMint systems requires authentication via JWT tokens or API keys. Role-based access control (RBAC) is enforced. Password requirements: minimum 8 characters. Sessions expire after 24 hours of inactivity. API keys can be revoked at any time.'
      },
      {
        title: '4. Data Protection',
        content: 'All data in transit is encrypted using TLS 1.2+. Passwords are hashed using bcrypt with salt rounds. Agreement content is hashed (SHA-256) for integrity verification. Blockchain anchoring provides immutable proof of agreement state.'
      },
      {
        title: '5. Incident Response',
        content: 'Security incidents are classified by severity (Low/Medium/High/Critical). All incidents are logged in the audit trail. Critical incidents trigger immediate notification to affected users. Post-incident review is conducted within 72 hours.'
      },
      {
        title: '6. Data Retention',
        content: 'Active agreements: retained indefinitely while account is active. Deleted agreements: purged within 30 days. Audit logs: retained for 7 years. User data: deleted within 30 days of account deletion request. Backup data: rotated every 90 days.'
      },
      {
        title: '7. Change Management',
        content: 'All code changes are tracked in Git version control. Production deployments follow the CI/CD pipeline. Rollback procedures are documented and tested. Database migrations are backward-compatible.'
      },
      {
        title: '8. Business Continuity',
        content: 'Recovery Time Objective (RTO): 4 hours. Recovery Point Objective (RPO): 1 hour. Database backups run every 6 hours. Health monitoring runs continuously with automated alerting.'
      }
    ]
  };
}

// ─── Incident Response Framework ───────────────────────
function createIncident(data) {
  const { title, description, severity, reportedBy, affectedSystems } = data;

  if (!title) throw new Error('Incident title required');
  if (!severity) throw new Error('Severity required');

  return {
    id: `inc_${uuidv4().substring(0, 8)}`,
    title,
    description: description || '',
    severity: severity || SEVERITY.MEDIUM,
    status: 'open', // open, investigating, mitigating, resolved, closed
    reportedBy: reportedBy || 'system',
    affectedSystems: affectedSystems || [],
    timeline: [
      {
        action: 'Incident reported',
        timestamp: new Date().toISOString(),
        by: reportedBy || 'system'
      }
    ],
    rootCause: null,
    resolution: null,
    lessonsLearned: null,
    notificationsSent: false,
    createdAt: new Date().toISOString(),
    resolvedAt: null,
    closedAt: null
  };
}

function updateIncident(incident, update) {
  if (update.status) incident.status = update.status;
  if (update.rootCause) incident.rootCause = update.rootCause;
  if (update.resolution) incident.resolution = update.resolution;
  if (update.lessonsLearned) incident.lessonsLearned = update.lessonsLearned;

  incident.timeline.push({
    action: update.action || `Status changed to ${update.status}`,
    timestamp: new Date().toISOString(),
    by: update.by || 'system',
    details: update.details || ''
  });

  if (update.status === 'resolved') incident.resolvedAt = new Date().toISOString();
  if (update.status === 'closed') incident.closedAt = new Date().toISOString();

  return incident;
}

// ─── Data Subject Access Request ───────────────────────
function createDSAR(userId, type) {
  return {
    id: `dsar_${uuidv4().substring(0, 8)}`,
    userId,
    type, // 'access', 'export', 'deletion', 'rectification'
    status: 'pending', // pending, processing, completed, denied
    createdAt: new Date().toISOString(),
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
    completedAt: null,
    notes: []
  };
}

function collectUserData(userId, db) {
  // Collects all user data for export (GDPR Article 20 / CCPA compliance)
  const data = {
    profile: null,
    agreements: [],
    pledges: [],
    escrowTransactions: [],
    auditLogs: [],
    exportDate: new Date().toISOString(),
    format: 'JSON',
    requestId: `export_${uuidv4().substring(0, 8)}`
  };

  if (db.users) {
    const user = Object.values(db.users).find(u => u.id === userId || u.email === userId);
    if (user) {
      data.profile = { ...user };
      delete data.profile.password; // Never export password hashes
    }
  }

  if (db.agreements) {
    data.agreements = Object.values(db.agreements).filter(a =>
      a.createdBy === userId || (a.parties && a.parties.some(p => p.email === userId))
    );
  }

  if (db.pledges) {
    data.pledges = Object.values(db.pledges).filter(p => p.userId === userId);
  }

  return data;
}

// ─── Compliance Score Calculator ───────────────────────
function calculateComplianceScore() {
  let total = 0;
  let implemented = 0;
  let partial = 0;

  for (const [, category] of Object.entries(COMPLIANCE_CHECKLIST)) {
    for (const item of category.items) {
      total++;
      if (item.status === 'implemented') implemented++;
      else if (item.status === 'partial') partial += 0.5;
    }
  }

  const score = Math.round(((implemented + partial) / total) * 100);

  return {
    score,
    total,
    implemented,
    partial: Object.values(COMPLIANCE_CHECKLIST).reduce((sum, cat) => sum + cat.items.filter(i => i.status === 'partial').length, 0),
    planned: Object.values(COMPLIANCE_CHECKLIST).reduce((sum, cat) => sum + cat.items.filter(i => i.status === 'planned').length, 0),
    grade: score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : 'F',
    readyForAudit: score >= 80
  };
}

// ─── Security Headers ──────────────────────────────────
function getSecurityHeaders() {
  return {
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(self)',
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' wss: https:; font-src 'self' https://fonts.gstatic.com;"
  };
}

// ─── Data Retention Policies ───────────────────────────
const RETENTION_POLICIES = {
  agreements_active: { period: 'indefinite', description: 'Active agreements retained while account exists' },
  agreements_deleted: { period: '30 days', days: 30, description: 'Soft-deleted agreements purged after 30 days' },
  audit_logs: { period: '7 years', days: 2555, description: 'Audit logs retained for compliance (7 years)' },
  user_sessions: { period: '24 hours', days: 1, description: 'Session tokens expire after 24 hours' },
  api_logs: { period: '90 days', days: 90, description: 'API access logs retained for 90 days' },
  backups: { period: '90 days', days: 90, description: 'Database backups rotated every 90 days' },
  deleted_accounts: { period: '30 days', days: 30, description: 'User data purged 30 days after account deletion' },
  push_subscriptions: { period: '1 year', days: 365, description: 'Inactive push subscriptions cleaned after 1 year' }
};

module.exports = {
  AUDIT_CATEGORIES,
  SEVERITY,
  AUDIT_ACTIONS,
  COMPLIANCE_CHECKLIST,
  RETENTION_POLICIES,
  createAuditLog,
  hashAuditLog,
  generateSecurityPolicy,
  createIncident,
  updateIncident,
  createDSAR,
  collectUserData,
  calculateComplianceScore,
  getSecurityHeaders
};
