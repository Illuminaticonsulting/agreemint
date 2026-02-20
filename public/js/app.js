/**
 * AgreeMint -- Frontend Application
 *
 * Handles auth, dashboard, agreement CRUD, AI tools,
 * template browsing, chat, and document management.
 */
(function () {
  'use strict';

  // ─── State ─────────────────────────────────────────────
  let authToken = localStorage.getItem('agreemint_token');
  let userEmail = localStorage.getItem('agreemint_email');
  let currentPage = 'dashboard';
  let templates = {};
  let categories = [];
  let jurisdictions = [];
  let agreements = [];
  let chatSessionId = null;
  let chatMessages = [];

  // ─── DOM ───────────────────────────────────────────────
  const loginScreen = document.getElementById('login-screen');
  const appScreen = document.getElementById('app-screen');
  const loginForm = document.getElementById('login-form');
  const loginError = document.getElementById('login-error');
  const pageContent = document.getElementById('page-content');
  const sidebar = document.getElementById('sidebar');
  const genOverlay = document.getElementById('generating-overlay');
  const genText = document.getElementById('gen-text');
  const toastContainer = document.getElementById('toast-container');

  // ─── API Helper ────────────────────────────────────────
  async function api(method, url, body) {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' }
    };
    if (authToken) opts.headers['x-auth-token'] = authToken;
    if (body) opts.body = JSON.stringify(body);

    const res = await fetch(url, opts);
    if (res.status === 401) {
      logout();
      throw new Error('Session expired');
    }
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  }

  // ─── Toast ─────────────────────────────────────────────
  function toast(msg, type = 'info') {
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.textContent = msg;
    toastContainer.appendChild(el);
    setTimeout(() => el.remove(), 4000);
  }

  // ─── Auth ──────────────────────────────────────────────
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const password = document.getElementById('login-password').value;
    try {
      const data = await api('POST', '/api/auth/login', { password });
      authToken = data.token;
      userEmail = data.user.name || data.user.email;
      localStorage.setItem('agreemint_token', authToken);
      localStorage.setItem('agreemint_email', userEmail);
      showApp();
    } catch (err) {
      loginError.textContent = err.message;
      loginError.style.display = 'block';
    }
  });

  function logout() {
    authToken = null;
    userEmail = null;
    localStorage.removeItem('agreemint_token');
    localStorage.removeItem('agreemint_email');
    loginScreen.style.display = 'flex';
    appScreen.style.display = 'none';
  }

  document.getElementById('logout-btn').addEventListener('click', () => {
    api('POST', '/api/auth/logout', {}).catch(() => {});
    logout();
  });

  async function showApp() {
    loginScreen.style.display = 'none';
    appScreen.style.display = 'flex';
    document.getElementById('user-email').textContent = userEmail;
    document.getElementById('user-avatar').textContent = (userEmail || 'A')[0].toUpperCase();

    // Load templates
    try {
      const t = await api('GET', '/api/templates');
      templates = t.types;
      categories = t.categories;
      jurisdictions = t.jurisdictions;
    } catch (e) { console.error(e); }

    navigate('dashboard');
  }

  // ─── Navigation ────────────────────────────────────────
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => navigate(btn.dataset.page));
  });

  document.getElementById('topbar-toggle').addEventListener('click', () => sidebar.classList.toggle('open'));
  document.getElementById('sidebar-close').addEventListener('click', () => sidebar.classList.remove('open'));

  function navigate(page, extra) {
    currentPage = page;
    sidebar.classList.remove('open');
    document.querySelectorAll('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.page === page));

    switch (page) {
      case 'dashboard': renderDashboard(); break;
      case 'agreements': renderAgreements(); break;
      case 'create': renderCreate(extra); break;
      case 'templates': renderTemplates(); break;
      case 'analyze': renderAnalyze(); break;
      case 'chat': renderChat(); break;
      case 'view': renderView(extra); break;
      case 'escrow': renderEscrow(); break;
      case 'onchain': renderOnChain(); break;
      default: renderDashboard();
    }
  }

  // ─── Dashboard ─────────────────────────────────────────
  async function renderDashboard() {
    pageContent.innerHTML = '<div class="loading"><div class="spinner"></div> Loading dashboard...</div>';

    try {
      const [stats, agrs] = await Promise.all([
        api('GET', '/api/stats'),
        api('GET', '/api/agreements')
      ]);
      agreements = agrs;
      document.getElementById('agreement-count').textContent = stats.total;

      pageContent.innerHTML = `
        <div class="page-header">
          <div>
            <h1>Dashboard</h1>
            <p>Agreement intelligence at a glance</p>
          </div>
          <div class="page-actions">
            <button class="btn btn-primary" onclick="window._nav('create')">+ Create Agreement</button>
          </div>
        </div>

        <div class="stats-grid">
          <div class="stat-card accent">
            <span class="stat-icon">&#128196;</span>
            <div class="stat-label">Total Agreements</div>
            <div class="stat-value">${stats.total}</div>
          </div>
          <div class="stat-card blue">
            <span class="stat-icon">&#9998;</span>
            <div class="stat-label">Drafts</div>
            <div class="stat-value">${stats.draft}</div>
          </div>
          <div class="stat-card yellow">
            <span class="stat-icon">&#9203;</span>
            <div class="stat-label">Pending Signature</div>
            <div class="stat-value">${stats.pending}</div>
          </div>
          <div class="stat-card green">
            <span class="stat-icon">&#10004;</span>
            <div class="stat-label">Signed</div>
            <div class="stat-value">${stats.signed}</div>
          </div>
        </div>

        ${!stats.apiConfigured ? '<div style="background:var(--red-dim);border:1px solid var(--red);border-radius:var(--radius);padding:16px;margin-bottom:20px;color:var(--red);font-size:14px;">&#9888; OpenAI API key not configured. Set OPENAI_API_KEY in .env to enable AI features.</div>' : ''}

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;">
          <div>
            <h2 style="font-size:16px;margin-bottom:16px;">Recent Agreements</h2>
            ${agrs.length === 0 ? '<div class="empty-state"><div class="empty-icon">&#128196;</div><h3>No agreements yet</h3><p>Create your first agreement to get started</p></div>' :
              agrs.slice(0, 5).map(a => agreementCard(a)).join('')}
          </div>
          <div>
            <h2 style="font-size:16px;margin-bottom:16px;">Recent Activity</h2>
            <div class="activity-feed">
              ${stats.recentActivity.length === 0 ? '<p style="color:var(--text-muted);font-size:13px;padding:20px 0;">No activity yet</p>' :
                stats.recentActivity.slice(0, 8).map(a => `
                  <div class="activity-item">
                    <span class="activity-action">${a.action.replace(/_/g, ' ')}</span>
                    <span style="color:var(--text-muted);font-size:12px;">${a.actor}</span>
                    <span class="activity-time">${timeAgo(a.timestamp)}</span>
                  </div>
                `).join('')}
            </div>
          </div>
        </div>
      `;
    } catch (err) {
      pageContent.innerHTML = `<div class="empty-state"><div class="empty-icon">&#9888;</div><h3>Error</h3><p>${err.message}</p></div>`;
    }
  }

  // ─── Agreements List ───────────────────────────────────
  async function renderAgreements() {
    pageContent.innerHTML = '<div class="loading"><div class="spinner"></div> Loading agreements...</div>';

    try {
      agreements = await api('GET', '/api/agreements');
      document.getElementById('agreement-count').textContent = agreements.length;

      pageContent.innerHTML = `
        <div class="page-header">
          <div>
            <h1>Agreements</h1>
            <p>${agreements.length} total agreements</p>
          </div>
          <div class="page-actions">
            <button class="btn btn-primary" onclick="window._nav('create')">+ Create Agreement</button>
          </div>
        </div>

        <div class="category-filter">
          <button class="category-btn active" data-filter="all">All</button>
          <button class="category-btn" data-filter="draft">Drafts</button>
          <button class="category-btn" data-filter="pending">Pending</button>
          <button class="category-btn" data-filter="signed">Signed</button>
        </div>

        <div class="agreements-list" id="agreements-list">
          ${agreements.length === 0 ?
            '<div class="empty-state"><div class="empty-icon">&#128196;</div><h3>No agreements yet</h3><p>Create your first agreement using AI</p><button class="btn btn-primary" onclick="window._nav(\'create\')">+ Create Agreement</button></div>' :
            agreements.map(a => agreementCard(a)).join('')}
        </div>
      `;

      // Filter buttons
      pageContent.querySelectorAll('.category-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          pageContent.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          const filter = btn.dataset.filter;
          const filtered = filter === 'all' ? agreements : agreements.filter(a => a.status === filter);
          document.getElementById('agreements-list').innerHTML = filtered.length === 0 ?
            '<div class="empty-state"><p>No agreements match this filter</p></div>' :
            filtered.map(a => agreementCard(a)).join('');
        });
      });
    } catch (err) {
      pageContent.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${err.message}</p></div>`;
    }
  }

  function agreementCard(a) {
    const typeInfo = templates[a.type] || { icon: '&#128196;', name: a.type };
    return `
      <div class="agreement-card" onclick="window._nav('view', '${a.id}')">
        <div class="agreement-icon">${typeInfo.icon || '&#128196;'}</div>
        <div class="agreement-info">
          <h3>${esc(a.title)}</h3>
          <div class="agreement-meta">
            <span>${typeInfo.name || a.type}</span>
            <span>v${a.version}</span>
            <span>${a.parties.length} parties</span>
            <span>${timeAgo(a.updatedAt)}</span>
          </div>
        </div>
        <span class="status-badge status-${a.status}">${a.status}</span>
      </div>
    `;
  }

  // ─── Create Agreement ──────────────────────────────────
  function renderCreate(preselectedType) {
    const typeOptions = Object.entries(templates).map(([k, v]) =>
      `<option value="${k}" ${k === preselectedType ? 'selected' : ''}>${v.icon} ${v.name}</option>`
    ).join('');

    const jurisdictionOptions = jurisdictions.map(j =>
      `<option value="${j.name}" ${j.code === 'US-DE' ? 'selected' : ''}>${j.name}</option>`
    ).join('');

    pageContent.innerHTML = `
      <div class="page-header">
        <div>
          <h1>Create Agreement</h1>
          <p>Generate an institutional-grade agreement with AI</p>
        </div>
      </div>

      <div class="create-section">
        <h2>&#9878; Agreement Details</h2>
        <div class="form-group">
          <label>Agreement Type</label>
          <select class="form-select" id="create-type">${typeOptions}</select>
        </div>
        <div id="type-info" style="background:var(--bg-tertiary);border-radius:var(--radius-sm);padding:14px;margin-bottom:16px;font-size:13px;color:var(--text-secondary);"></div>
        <div class="form-group">
          <label>Title (optional)</label>
          <input class="form-input" id="create-title" placeholder="Auto-generated if left blank">
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Jurisdiction / Governing Law</label>
            <select class="form-select" id="create-jurisdiction">${jurisdictionOptions}</select>
          </div>
          <div class="form-group">
            <label>Drafting Stance</label>
            <select class="form-select" id="create-favor">
              <option value="balanced">Balanced (Fair to both)</option>
              <option value="Party A">Favor Party A</option>
              <option value="Party B">Favor Party B</option>
            </select>
          </div>
        </div>
      </div>

      <div class="create-section">
        <h2>&#128100; Parties</h2>
        <div id="parties-container">
          <div class="party-row">
            <input class="form-input" placeholder="Party A Name" data-field="name">
            <input class="form-input" placeholder="Email" data-field="email">
            <input class="form-input" placeholder='Role (e.g. "Discloser")' data-field="role">
          </div>
          <div class="party-row">
            <input class="form-input" placeholder="Party B Name" data-field="name">
            <input class="form-input" placeholder="Email" data-field="email">
            <input class="form-input" placeholder='Role (e.g. "Recipient")' data-field="role">
          </div>
        </div>
        <button class="btn btn-secondary btn-sm" style="margin-top:8px" onclick="addPartyRow()">+ Add Party</button>
      </div>

      <div class="create-section">
        <h2>&#128221; Details & Context</h2>
        <div class="form-group">
          <label>Describe the agreement in plain English</label>
          <textarea class="form-textarea" id="create-details" rows="6" placeholder="Example: We need an NDA between KingPin Strategies and a freelance UI designer. The designer will have access to our platform wireframes, codebase architecture docs, and user data schemas. We want a 2-year term with a 5-year survival period for trade secrets. Include a non-solicitation clause for 1 year."></textarea>
        </div>
        <div class="form-group">
          <label>Additional Clauses or Requirements (optional)</label>
          <textarea class="form-textarea" id="create-additional" rows="3" placeholder="Any specific clauses, amounts, dates, or requirements..."></textarea>
        </div>
      </div>

      <div style="display:flex;gap:12px;justify-content:flex-end;">
        <button class="btn btn-secondary" onclick="window._nav('dashboard')">Cancel</button>
        <button class="btn btn-primary" id="generate-btn" onclick="generateAgreement()">&#9878; Generate Agreement</button>
      </div>
    `;

    // Show type info
    const typeSelect = document.getElementById('create-type');
    function updateTypeInfo() {
      const t = templates[typeSelect.value];
      document.getElementById('type-info').innerHTML = t ?
        `<strong>${t.name}</strong> - ${t.description}<br><span style="color:var(--text-muted)">${t.complexity} complexity | ${t.avgPages} pages | ${t.commonUse}</span>` : '';
    }
    typeSelect.addEventListener('change', updateTypeInfo);
    updateTypeInfo();
  }

  window.addPartyRow = function () {
    const container = document.getElementById('parties-container');
    const row = document.createElement('div');
    row.className = 'party-row';
    row.innerHTML = `
      <input class="form-input" placeholder="Party Name" data-field="name">
      <input class="form-input" placeholder="Email" data-field="email">
      <input class="form-input" placeholder="Role" data-field="role">
      <button class="remove-party" onclick="this.parentElement.remove()">&times;</button>
    `;
    container.appendChild(row);
  };

  window.generateAgreement = async function () {
    const type = document.getElementById('create-type').value;
    const title = document.getElementById('create-title').value;
    const jurisdiction = document.getElementById('create-jurisdiction').value;
    const favorParty = document.getElementById('create-favor').value;
    const details = document.getElementById('create-details').value;
    const additionalClauses = document.getElementById('create-additional').value;

    if (!details.trim()) {
      toast('Please describe the agreement', 'error');
      return;
    }

    // Collect parties
    const partyRows = document.querySelectorAll('#parties-container .party-row');
    const parties = [];
    partyRows.forEach(row => {
      const name = row.querySelector('[data-field="name"]').value.trim();
      const email = row.querySelector('[data-field="email"]').value.trim();
      const role = row.querySelector('[data-field="role"]').value.trim();
      if (name) parties.push({ name, email, role });
    });

    genText.textContent = 'Generating agreement...';
    genOverlay.style.display = 'flex';

    try {
      const agreement = await api('POST', '/api/agreements', {
        type, title, details, parties, jurisdiction, favorParty, additionalClauses
      });
      genOverlay.style.display = 'none';
      toast('Agreement generated successfully', 'success');
      navigate('view', agreement.id);
    } catch (err) {
      genOverlay.style.display = 'none';
      toast('Error: ' + err.message, 'error');
    }
  };

  // ─── View Agreement ────────────────────────────────────
  async function renderView(id) {
    pageContent.innerHTML = '<div class="loading"><div class="spinner"></div> Loading agreement...</div>';

    try {
      const a = await api('GET', `/api/agreements/${id}`);
      const typeInfo = templates[a.type] || { icon: '&#128196;', name: a.type };
      const contentHtml = marked.parse(a.content);

      pageContent.innerHTML = `
        <div class="page-header">
          <div>
            <h1>${esc(a.title)}</h1>
            <p>${typeInfo.name} | ${a.jurisdiction} | Version ${a.version}</p>
          </div>
          <div class="page-actions">
            <button class="btn btn-secondary btn-sm" onclick="downloadPDF('${a.id}')">&#128196; Download PDF</button>
            <button class="btn btn-secondary btn-sm" onclick="downloadCert('${a.id}')">&#128274; Verification Certificate</button>
            <button class="btn btn-secondary btn-sm" onclick="analyzeThis('${a.id}')">&#128270; Risk Analysis</button>
            <button class="btn btn-secondary btn-sm" onclick="extractTerms('${a.id}')">&#128203; Extract Terms</button>
            <button class="btn btn-secondary btn-sm" onclick="registerOnChain('${a.id}')" style="border-color:var(--green);color:var(--green);">&#9939; Register On-Chain</button>
            <button class="btn btn-secondary btn-sm" onclick="openEscrowModal('${a.id}')" style="border-color:#f59e0b;color:#f59e0b;">&#128274; Create Escrow</button>
            ${a.status === 'draft' ? `<button class="btn btn-primary btn-sm" onclick="sendForSign('${a.id}')">&#9998; Send for Signature</button>` : ''}
            ${a.status === 'draft' ? `<button class="btn btn-danger btn-sm" onclick="deleteAgreement('${a.id}')">Delete</button>` : ''}
          </div>
        </div>

        <div class="agreement-view">
          <div class="agreement-content-panel">
            <div class="content-body">${contentHtml}</div>
          </div>
          <div class="side-panel">
            <div class="side-card">
              <h3>Status</h3>
              <div style="text-align:center;padding:8px 0;">
                <span class="status-badge status-${a.status}" style="font-size:14px;padding:6px 16px;">${a.status.toUpperCase()}</span>
              </div>
            </div>
            <div class="side-card">
              <h3>Details</h3>
              <div class="detail-row"><span class="detail-label">Type</span><span class="detail-value">${typeInfo.name}</span></div>
              <div class="detail-row"><span class="detail-label">Jurisdiction</span><span class="detail-value">${a.jurisdiction}</span></div>
              <div class="detail-row"><span class="detail-label">Version</span><span class="detail-value">${a.version}</span></div>
              <div class="detail-row"><span class="detail-label">Created</span><span class="detail-value">${new Date(a.createdAt).toLocaleDateString()}</span></div>
              <div class="detail-row"><span class="detail-label">Hash</span><span class="detail-value" style="font-size:10px;word-break:break-all;">${a.contentHash.substring(0, 24)}...</span></div>
            </div>
            <div class="side-card">
              <h3>Parties (${a.parties.length})</h3>
              <div class="party-list">
                ${a.parties.map(p => {
                  const signed = a.signatures.find(s => s.email === p.email);
                  return `
                    <div class="party-item">
                      <div class="party-avatar">${(p.name || '?')[0]}</div>
                      <div>
                        <div class="party-name">${esc(p.name)}</div>
                        <div class="party-email">${esc(p.email || 'No email')} ${p.role ? '(' + esc(p.role) + ')' : ''}</div>
                      </div>
                      <span class="party-signed">${signed ? '&#10004;' : '&#9675;'}</span>
                    </div>
                  `;
                }).join('')}
              </div>
              ${a.status === 'pending' ? `<div style="margin-top:12px;font-size:12px;color:var(--text-muted);">Sign URL: <input class="form-input" style="font-size:11px;margin-top:4px;" value="${window.location.origin}/sign/${a.id}?token=${a.verificationToken}" onclick="this.select()"></div>` : ''}
            </div>
            <div class="side-card">
              <h3>Audit Trail</h3>
              <div id="audit-trail" style="font-size:12px;color:var(--text-muted);">Loading...</div>
            </div>
          </div>
        </div>

        <div id="analysis-container"></div>
      `;

      // Load audit trail
      try {
        const trail = await api('GET', `/api/agreements/${id}/audit`);
        document.getElementById('audit-trail').innerHTML = trail.length === 0 ? '<p>No audit entries</p>' :
          trail.slice(-10).reverse().map(e => `<div style="padding:4px 0;border-bottom:1px solid var(--border);">${e.action.replace(/_/g, ' ')} <span style="float:right">${timeAgo(e.timestamp)}</span></div>`).join('');
      } catch (e) {}
    } catch (err) {
      pageContent.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${err.message}</p></div>`;
    }
  }

  // ─── Agreement Actions ─────────────────────────────────
  window.downloadPDF = async function (id) {
    try {
      const res = await fetch(`/api/agreements/${id}/pdf`, { headers: { 'x-auth-token': authToken } });
      if (!res.ok) throw new Error('PDF generation failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'agreement.pdf'; a.click();
      URL.revokeObjectURL(url);
      toast('PDF downloaded', 'success');
    } catch (err) {
      toast('Error: ' + err.message, 'error');
    }
  };

  window.downloadCert = async function (id) {
    try {
      const res = await fetch(`/api/agreements/${id}/certificate`, { headers: { 'x-auth-token': authToken } });
      if (!res.ok) throw new Error('Certificate generation failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'certificate.pdf'; a.click();
      URL.revokeObjectURL(url);
      toast('Certificate downloaded', 'success');
    } catch (err) {
      toast('Error: ' + err.message, 'error');
    }
  };

  window.analyzeThis = async function (id) {
    genText.textContent = 'Analyzing agreement for risks...';
    genOverlay.style.display = 'flex';
    try {
      const data = await api('POST', `/api/agreements/${id}/analyze`, { partyRole: 'neutral' });
      genOverlay.style.display = 'none';
      document.getElementById('analysis-container').innerHTML = `<div class="analysis-result"><h2>&#128270; Risk Analysis</h2><div class="content-body">${marked.parse(data.analysis)}</div></div>`;
      toast('Analysis complete', 'success');
    } catch (err) {
      genOverlay.style.display = 'none';
      toast('Error: ' + err.message, 'error');
    }
  };

  window.extractTerms = async function (id) {
    genText.textContent = 'Extracting key terms...';
    genOverlay.style.display = 'flex';
    try {
      const data = await api('POST', `/api/agreements/${id}/extract`);
      genOverlay.style.display = 'none';
      document.getElementById('analysis-container').innerHTML = `<div class="analysis-result"><h2>&#128203; Key Terms</h2><div class="content-body">${marked.parse(data.terms)}</div></div>`;
      toast('Terms extracted', 'success');
    } catch (err) {
      genOverlay.style.display = 'none';
      toast('Error: ' + err.message, 'error');
    }
  };

  window.sendForSign = async function (id) {
    try {
      const data = await api('POST', `/api/agreements/${id}/send`);
      toast('Agreement sent for signature', 'success');
      navigate('view', id);
    } catch (err) {
      toast('Error: ' + err.message, 'error');
    }
  };

  window.deleteAgreement = async function (id) {
    if (!confirm('Delete this agreement? This cannot be undone.')) return;
    try {
      await api('DELETE', `/api/agreements/${id}`);
      toast('Agreement deleted', 'success');
      navigate('agreements');
    } catch (err) {
      toast('Error: ' + err.message, 'error');
    }
  };

  // ─── Templates Page ────────────────────────────────────
  function renderTemplates() {
    const catButtons = categories.map(c =>
      `<button class="category-btn ${c.id === 'all' ? 'active' : ''}" data-cat="${c.id}">${c.icon} ${c.name}</button>`
    ).join('');

    const cards = Object.entries(templates).map(([k, v]) =>
      `<div class="template-card" data-type="${k}" data-category="${v.category}" onclick="window._nav('create', '${k}')">
        <div class="template-icon">${v.icon}</div>
        <h3>${v.name}</h3>
        <p>${v.description}</p>
        <div class="template-meta">
          <span>${v.complexity}</span>
          <span>${v.avgPages} pages</span>
        </div>
      </div>`
    ).join('');

    pageContent.innerHTML = `
      <div class="page-header">
        <div>
          <h1>Templates</h1>
          <p>20+ institutional-grade agreement templates</p>
        </div>
      </div>
      <div class="category-filter">${catButtons}</div>
      <div class="templates-grid" id="templates-grid">${cards}</div>
    `;

    pageContent.querySelectorAll('.category-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        pageContent.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const cat = btn.dataset.cat;
        document.querySelectorAll('.template-card').forEach(card => {
          card.style.display = (cat === 'all' || card.dataset.category === cat) ? '' : 'none';
        });
      });
    });
  }

  // ─── Analyze Page ──────────────────────────────────────
  function renderAnalyze() {
    pageContent.innerHTML = `
      <div class="page-header">
        <div>
          <h1>Analyze Agreement</h1>
          <p>Paste any agreement to get an AI-powered risk analysis</p>
        </div>
      </div>

      <div class="create-section">
        <h2>&#128270; Paste Agreement Text</h2>
        <div class="form-group">
          <textarea class="form-textarea" id="analyze-content" rows="12" placeholder="Paste the full agreement text here..."></textarea>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Your Role / Perspective</label>
            <select class="form-select" id="analyze-role">
              <option value="neutral">Neutral (objective analysis)</option>
              <option value="Party A / the company">Party A (protect our interests)</option>
              <option value="Party B / the counterparty">Party B (protect counterparty)</option>
            </select>
          </div>
          <div class="form-group" style="display:flex;align-items:flex-end;">
            <button class="btn btn-primary" onclick="runAnalysis()">&#128270; Analyze</button>
          </div>
        </div>
      </div>
      <div id="analyze-result"></div>
    `;
  }

  window.runAnalysis = async function () {
    const content = document.getElementById('analyze-content').value;
    if (!content.trim()) { toast('Paste agreement text first', 'error'); return; }

    genText.textContent = 'Analyzing agreement...';
    genOverlay.style.display = 'flex';

    try {
      const data = await api('POST', '/api/analyze', {
        content, partyRole: document.getElementById('analyze-role').value
      });
      genOverlay.style.display = 'none';
      document.getElementById('analyze-result').innerHTML = `<div class="analysis-result"><div class="content-body">${marked.parse(data.analysis)}</div></div>`;
      toast('Analysis complete', 'success');
    } catch (err) {
      genOverlay.style.display = 'none';
      toast('Error: ' + err.message, 'error');
    }
  };

  // ─── Chat Page ─────────────────────────────────────────
  function renderChat() {
    pageContent.innerHTML = `
      <div class="chat-container">
        <div class="chat-messages" id="chat-messages">
          ${chatMessages.length === 0 ? `
            <div class="empty-state" style="margin:auto;">
              <div class="empty-icon">&#9878;</div>
              <h3>Legal AI Assistant</h3>
              <p>Ask any legal question, get help drafting clauses, or discuss contract strategy</p>
              <div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-top:12px;">
                <button class="btn btn-secondary btn-sm" onclick="window._chatPrompt('What are the key differences between a SAFE and a Convertible Note?')">SAFE vs Convertible Note</button>
                <button class="btn btn-secondary btn-sm" onclick="window._chatPrompt('Draft a force majeure clause that covers pandemics and cyber attacks')">Force Majeure Clause</button>
                <button class="btn btn-secondary btn-sm" onclick="window._chatPrompt('What should I include in an NDA for a software development contractor?')">Contractor NDA</button>
                <button class="btn btn-secondary btn-sm" onclick="window._chatPrompt('Explain indemnification vs limitation of liability')">Indemnification explained</button>
              </div>
            </div>
          ` : chatMessages.map(m => chatBubble(m)).join('')}
        </div>
        <div class="chat-input-area">
          <div class="chat-input-row">
            <textarea class="chat-input" id="chat-input" rows="1" placeholder="Ask a legal question or request a clause..."></textarea>
            <button class="chat-send" id="chat-send" onclick="sendChat()">Send</button>
          </div>
        </div>
      </div>
    `;

    const input = document.getElementById('chat-input');
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(); }
    });

    // Scroll to bottom
    const msgs = document.getElementById('chat-messages');
    msgs.scrollTop = msgs.scrollHeight;
  }

  window._chatPrompt = function (text) {
    document.getElementById('chat-input').value = text;
    sendChat();
  };

  window.sendChat = async function () {
    const input = document.getElementById('chat-input');
    const message = input.value.trim();
    if (!message) return;

    chatMessages.push({ role: 'user', content: message });
    input.value = '';

    const msgs = document.getElementById('chat-messages');
    // Clear empty state
    const emptyState = msgs.querySelector('.empty-state');
    if (emptyState) emptyState.remove();

    msgs.innerHTML += chatBubble({ role: 'user', content: message });
    msgs.innerHTML += '<div id="chat-loading" class="chat-message assistant"><div class="msg-avatar">&#9878;</div><div class="msg-content"><div class="spinner" style="margin:4px auto;"></div></div></div>';
    msgs.scrollTop = msgs.scrollHeight;

    try {
      const data = await api('POST', '/api/chat', { sessionId: chatSessionId, message });
      chatSessionId = data.sessionId;
      chatMessages.push({ role: 'assistant', content: data.response });

      const loading = document.getElementById('chat-loading');
      if (loading) loading.remove();

      msgs.innerHTML += chatBubble({ role: 'assistant', content: data.response });
      msgs.scrollTop = msgs.scrollHeight;
    } catch (err) {
      const loading = document.getElementById('chat-loading');
      if (loading) loading.remove();
      toast('Error: ' + err.message, 'error');
    }
  };

  function chatBubble(m) {
    const avatar = m.role === 'user' ? '&#128100;' : '&#9878;';
    const content = m.role === 'assistant' ? marked.parse(m.content) : esc(m.content);
    return `<div class="chat-message ${m.role}"><div class="msg-avatar">${avatar}</div><div class="msg-content">${content}</div></div>`;
  }

  // ─── Helpers ───────────────────────────────────────────
  function esc(s) {
    if (!s) return '';
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function timeAgo(dateStr) {
    const d = new Date(dateStr);
    const now = new Date();
    const seconds = Math.floor((now - d) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return Math.floor(seconds / 60) + 'm ago';
    if (seconds < 86400) return Math.floor(seconds / 3600) + 'h ago';
    if (seconds < 604800) return Math.floor(seconds / 86400) + 'd ago';
    return d.toLocaleDateString();
  }

  // Global navigation helper
  window._nav = function (page, extra) { navigate(page, extra); };

  // ─── Escrow Page ───────────────────────────────────────
  function renderEscrow() {
    pageContent.innerHTML = `
      <div class="page-header">
        <div>
          <h1>&#128274; Escrow</h1>
          <p>Multi-crypto escrow with adjustable rules, mutual verification, and on-chain settlement</p>
        </div>
      </div>

      <div class="stats-grid">
        <div class="stat-card" style="border-color:#f59e0b;">
          <span class="stat-icon">&#128176;</span>
          <div class="stat-label">Escrow Type</div>
          <div class="stat-value" style="font-size:16px;">Sale / Bet / Service / Milestone</div>
        </div>
        <div class="stat-card" style="border-color:var(--green);">
          <span class="stat-icon">&#9939;</span>
          <div class="stat-label">Networks</div>
          <div class="stat-value" style="font-size:16px;">Base / Story</div>
        </div>
        <div class="stat-card" style="border-color:var(--accent);">
          <span class="stat-icon">&#128274;</span>
          <div class="stat-label">Currencies</div>
          <div class="stat-value" style="font-size:16px;">BTC / ETH / USDT / USDC / XMR / DAI</div>
        </div>
        <div class="stat-card" style="border-color:#ef4444;">
          <span class="stat-icon">&#9878;</span>
          <div class="stat-label">Verification</div>
          <div class="stat-value" style="font-size:16px;">Mutual Acceptance Required</div>
        </div>
      </div>

      <div class="create-section">
        <h2>How AgreeMint Escrow Works</h2>
        <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:16px;margin-top:16px;">
          <div style="text-align:center;padding:20px;background:var(--bg-tertiary);border-radius:var(--radius);">
            <div style="font-size:32px;margin-bottom:8px;">1&#65039;&#8419;</div>
            <strong>Create Agreement</strong>
            <p style="font-size:13px;color:var(--text-muted);margin-top:4px;">AI-generated contract with terms</p>
          </div>
          <div style="text-align:center;padding:20px;background:var(--bg-tertiary);border-radius:var(--radius);">
            <div style="font-size:32px;margin-bottom:8px;">2&#65039;&#8419;</div>
            <strong>Set Currency & Rules</strong>
            <p style="font-size:13px;color:var(--text-muted);margin-top:4px;">Choose BTC, ETH, USDT, XMR. Set timeouts, disputes, fees</p>
          </div>
          <div style="text-align:center;padding:20px;background:var(--bg-tertiary);border-radius:var(--radius);">
            <div style="font-size:32px;margin-bottom:8px;">3&#65039;&#8419;</div>
            <strong>Both Parties Accept</strong>
            <p style="font-size:13px;color:var(--text-muted);margin-top:4px;">Mutual verification - both must sign and approve escrow terms</p>
          </div>
          <div style="text-align:center;padding:20px;background:var(--bg-tertiary);border-radius:var(--radius);">
            <div style="font-size:32px;margin-bottom:8px;">4&#65039;&#8419;</div>
            <strong>Deposit Funds</strong>
            <p style="font-size:13px;color:var(--text-muted);margin-top:4px;">Lock crypto in smart contract tied to agreement hash</p>
          </div>
          <div style="text-align:center;padding:20px;background:var(--bg-tertiary);border-radius:var(--radius);">
            <div style="font-size:32px;margin-bottom:8px;">5&#65039;&#8419;</div>
            <strong>Settle or Dispute</strong>
            <p style="font-size:13px;color:var(--text-muted);margin-top:4px;">Both approve release, or arbiter resolves disputes</p>
          </div>
        </div>
      </div>

      <div class="create-section">
        <h2>Supported Currencies</h2>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:12px;">
          <div style="padding:20px;background:var(--bg-tertiary);border-radius:var(--radius);border-left:3px solid #627eea;">
            <h3 style="color:#627eea;margin-bottom:8px;">&#9830; ETH - Ethereum</h3>
            <p style="font-size:13px;color:var(--text-secondary);">Native ETH on Base. No wrapping needed. Lowest fees.</p>
          </div>
          <div style="padding:20px;background:var(--bg-tertiary);border-radius:var(--radius);border-left:3px solid #f7931a;">
            <h3 style="color:#f7931a;margin-bottom:8px;">&#8383; BTC - Bitcoin</h3>
            <p style="font-size:13px;color:var(--text-secondary);">Wrapped BTC (WBTC) on Base network. Bridge your BTC to use escrow.</p>
          </div>
          <div style="padding:20px;background:var(--bg-tertiary);border-radius:var(--radius);border-left:3px solid #26a17b;">
            <h3 style="color:#26a17b;margin-bottom:8px;">&#8378; USDT - Tether</h3>
            <p style="font-size:13px;color:var(--text-secondary);">Stablecoin pegged to USD. Ideal for sales and service contracts.</p>
          </div>
          <div style="padding:20px;background:var(--bg-tertiary);border-radius:var(--radius);border-left:3px solid #2775ca;">
            <h3 style="color:#2775ca;margin-bottom:8px;">&#36; USDC - USD Coin</h3>
            <p style="font-size:13px;color:var(--text-secondary);">Regulated stablecoin by Circle. Reliable dollar-denominated escrow.</p>
          </div>
          <div style="padding:20px;background:var(--bg-tertiary);border-radius:var(--radius);border-left:3px solid #ff6600;">
            <h3 style="color:#ff6600;margin-bottom:8px;">&#9432; XMR - Monero</h3>
            <p style="font-size:13px;color:var(--text-secondary);">Private escrow via atomic swap bridge. Maximum confidentiality.</p>
          </div>
          <div style="padding:20px;background:var(--bg-tertiary);border-radius:var(--radius);border-left:3px solid #f5ac37;">
            <h3 style="color:#f5ac37;margin-bottom:8px;">&#9670; DAI - Stablecoin</h3>
            <p style="font-size:13px;color:var(--text-secondary);">Decentralized stablecoin by MakerDAO. No central issuer.</p>
          </div>
        </div>
      </div>

      <div class="create-section">
        <h2>Escrow Rule Presets</h2>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-top:12px;">
          <div style="padding:20px;background:var(--bg-tertiary);border-radius:var(--radius);border-left:3px solid var(--accent);">
            <h3 style="color:var(--accent);margin-bottom:8px;">&#128274; Standard</h3>
            <p style="font-size:13px;color:var(--text-secondary);">Both approve. Arbiter resolves disputes. 30-day timeout. 0.5% fee.</p>
          </div>
          <div style="padding:20px;background:var(--bg-tertiary);border-radius:var(--radius);border-left:3px solid #f59e0b;">
            <h3 style="color:#f59e0b;margin-bottom:8px;">&#127918; Bet / Wager</h3>
            <p style="font-size:13px;color:var(--text-secondary);">Equal deposits. Arbiter declares winner. 90-day timeout. 1% fee.</p>
          </div>
          <div style="padding:20px;background:var(--bg-tertiary);border-radius:var(--radius);border-left:3px solid var(--green);">
            <h3 style="color:var(--green);margin-bottom:8px;">&#128722; Sale / Purchase</h3>
            <p style="font-size:13px;color:var(--text-secondary);">Buyer deposits. Seller delivers. Buyer confirms. 14-day timeout.</p>
          </div>
          <div style="padding:20px;background:var(--bg-tertiary);border-radius:var(--radius);border-left:3px solid #8b5cf6;">
            <h3 style="color:#8b5cf6;margin-bottom:8px;">&#128203; Milestone</h3>
            <p style="font-size:13px;color:var(--text-secondary);">Partial releases at milestones. 180-day timeout. 0.75% fee.</p>
          </div>
          <div style="padding:20px;background:var(--bg-tertiary);border-radius:var(--radius);border-left:3px solid #3b82f6;">
            <h3 style="color:#3b82f6;margin-bottom:8px;">&#9200; Time-Locked</h3>
            <p style="font-size:13px;color:var(--text-secondary);">Auto-releases after timer expires. No disputes. 0.25% fee.</p>
          </div>
          <div style="padding:20px;background:var(--bg-tertiary);border-radius:var(--radius);border-left:3px solid var(--green);">
            <h3 style="color:var(--green);margin-bottom:8px;">&#129309; Keep Your Word</h3>
            <p style="font-size:13px;color:var(--text-secondary);">Stake on a pledge. Lose funds if you break your word. Free.</p>
          </div>
        </div>
      </div>

      <div class="create-section">
        <h2>Create Escrow</h2>
        <p style="color:var(--text-muted);margin-bottom:16px;">Select an existing agreement or create a new one, then set up escrow from the agreement view.</p>
        <div style="display:flex;gap:12px;">
          <button class="btn btn-primary" onclick="window._nav('create')">+ Create Agreement First</button>
          <button class="btn btn-secondary" onclick="window._nav('agreements')">Select Existing Agreement</button>
        </div>
      </div>

      <div class="create-section">
        <h2>Smart Contract Details</h2>
        <div style="background:var(--bg);padding:16px;border-radius:var(--radius-sm);font-family:monospace;font-size:13px;color:var(--text-secondary);overflow-x:auto;">
          <div style="margin-bottom:8px;"><span style="color:var(--accent);">Contract:</span> AgreeMintEscrow.sol</div>
          <div style="margin-bottom:8px;"><span style="color:var(--accent);">Network:</span> Base (Chain ID: 8453)</div>
          <div style="margin-bottom:8px;"><span style="color:var(--accent);">Security:</span> ReentrancyGuard, SafeERC20</div>
          <div style="margin-bottom:8px;"><span style="color:var(--accent);">Currencies:</span> ETH, BTC (WBTC), USDT, USDC, XMR (atomic swap), DAI</div>
          <div style="margin-bottom:8px;"><span style="color:var(--accent);">Rules:</span> Adjustable timeout, auto-release, milestones, disputes</div>
          <div><span style="color:var(--accent);">Verification:</span> Mutual acceptance required before funds lock</div>
        </div>
      </div>
    `;
  }

  window.registerOnChain = async function(id) {
    genText.textContent = 'Preparing Story Protocol registration...';
    genOverlay.style.display = 'flex';
    try {
      const data = await api('POST', '/api/agreements/' + id + '/register');
      genOverlay.style.display = 'none';
      const container = document.getElementById('analysis-container');
      if (container) {
        container.innerHTML = '<div class="analysis-result"><h2>&#9939; Story Protocol Registration</h2>' +
          '<div class="content-body">' +
          '<p><strong>Document anchored for on-chain registration.</strong></p>' +
          '<p>Content Hash: <code>' + data.anchor.contentHash + '</code></p>' +
          '<p>Metadata Hash: <code>' + data.anchor.metadataHash + '</code></p>' +
          '<p>Combined Hash: <code>' + data.anchor.combinedHash + '</code></p>' +
          '<p>Chain: Story Protocol (Odyssey) | Chain ID: ' + data.anchor.chainId + '</p>' +
          '<hr style="border-color:var(--border);margin:16px 0;">' +
          '<p style="color:var(--text-muted);">To complete registration, connect a wallet with Story Protocol testnet IP tokens and submit the transaction.</p>' +
          '<p><strong>Explorer:</strong> <a href="' + data.verificationUrl + '" target="_blank" style="color:var(--accent);">' + data.verificationUrl + '</a></p>' +
          '</div></div>';
      }
      toast('Document anchored for on-chain registration', 'success');
    } catch(err) {
      genOverlay.style.display = 'none';
      toast('Error: ' + err.message, 'error');
    }
  };

  window.openEscrowModal = async function(id) {
    const container = document.getElementById('analysis-container');
    if (!container) return;
    container.innerHTML = `
      <div class="analysis-result">
        <h2>&#128274; Create Escrow for This Agreement</h2>
        <p style="color:var(--text-muted);margin:8px 0 16px;">Both parties must accept escrow terms before funds are locked.</p>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:16px;">
          <div class="form-group">
            <label>Escrow Type</label>
            <select class="form-select" id="escrow-type" onchange="updateEscrowRules()">
              <option value="Sale">Sale / Purchase</option>
              <option value="Bet">Bet / Wager</option>
              <option value="Service">Service Contract</option>
              <option value="Custom">Custom</option>
            </select>
          </div>
          <div class="form-group">
            <label>Currency</label>
            <select class="form-select" id="escrow-currency">
              <option value="ETH">ETH - Ethereum (native)</option>
              <option value="BTC">BTC - Bitcoin (WBTC)</option>
              <option value="USDT">USDT - Tether USD</option>
              <option value="USDC">USDC - USD Coin</option>
              <option value="XMR">XMR - Monero (atomic swap)</option>
              <option value="DAI">DAI - Stablecoin</option>
            </select>
          </div>
          <div class="form-group">
            <label>Amount</label>
            <input class="form-input" id="escrow-amount" placeholder="e.g. 1.5 (in token units)">
          </div>
          <div class="form-group">
            <label>Counterparty Wallet Address</label>
            <input class="form-input" id="escrow-partyB" placeholder="0x...">
          </div>
          <div class="form-group">
            <label>Arbiter Wallet (dispute resolver)</label>
            <input class="form-input" id="escrow-arbiter" placeholder="0x...">
          </div>
          <div class="form-group">
            <label>Timeout (days)</label>
            <input class="form-input" id="escrow-timeout" type="number" value="30" min="1">
          </div>
        </div>
        <div style="margin-top:16px;padding:16px;background:var(--bg-tertiary);border-radius:var(--radius-sm);border:1px solid var(--border);">
          <h3 style="margin-bottom:12px;">&#9881; Adjustable Rules</h3>
          <div id="escrow-rules-display" style="font-size:13px;color:var(--text-secondary);"></div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px;">
            <label style="font-size:13px;display:flex;align-items:center;gap:8px;">
              <input type="checkbox" id="rule-both-deposit"> Both parties must deposit
            </label>
            <label style="font-size:13px;display:flex;align-items:center;gap:8px;">
              <input type="checkbox" id="rule-refund-timeout" checked> Refund on timeout
            </label>
            <label style="font-size:13px;display:flex;align-items:center;gap:8px;">
              <input type="checkbox" id="rule-partial-release"> Allow partial release
            </label>
            <label style="font-size:13px;display:flex;align-items:center;gap:8px;">
              <input type="checkbox" id="rule-delivery-confirm"> Require delivery confirmation
            </label>
          </div>
          <div class="form-group" style="margin-top:12px;">
            <label style="font-size:12px;">Dispute Window (days)</label>
            <input class="form-input" id="rule-dispute-window" type="number" value="7" min="0" style="max-width:200px;">
          </div>
        </div>
        <div style="display:flex;gap:12px;margin-top:16px;">
          <button class="btn btn-primary" onclick="prepareEscrow('${id}')">&#128274; Prepare Escrow Transaction</button>
        </div>
        <div id="escrow-result"></div>
      </div>
    `;
    updateEscrowRules();
  };

  window.updateEscrowRules = function() {
    const type = document.getElementById('escrow-type').value;
    const presets = { Sale: 'Buyer deposits, seller delivers, buyer confirms.', Bet: 'Equal deposits, arbiter decides winner.', Service: 'Client deposits milestone, contractor delivers.', Custom: 'Fully customizable rules.' };
    const el = document.getElementById('escrow-rules-display');
    if (el) el.textContent = presets[type] || '';
  };

  window.prepareEscrow = async function(id) {
    const type = document.getElementById('escrow-type').value;
    const currency = document.getElementById('escrow-currency').value;
    const amount = document.getElementById('escrow-amount').value;
    const partyB = document.getElementById('escrow-partyB').value;
    const arbiter = document.getElementById('escrow-arbiter').value;
    const timeout = document.getElementById('escrow-timeout').value;

    if (!amount || !partyB || !arbiter) { toast('Fill in all required fields', 'error'); return; }

    const rules = {
      timeoutDays: parseInt(timeout) || 30,
      requireBothDeposit: document.getElementById('rule-both-deposit').checked,
      refundOnTimeout: document.getElementById('rule-refund-timeout').checked,
      allowPartialRelease: document.getElementById('rule-partial-release').checked,
      deliveryConfirmation: document.getElementById('rule-delivery-confirm').checked,
      disputeWindowDays: parseInt(document.getElementById('rule-dispute-window').value) || 7
    };

    genText.textContent = 'Preparing escrow transaction...';
    genOverlay.style.display = 'flex';
    try {
      const data = await api('POST', '/api/agreements/' + id + '/escrow', { type, currency, amount, partyB, arbiter, rules });
      genOverlay.style.display = 'none';
      const cur = data.escrowTx.currency || {};
      document.getElementById('escrow-result').innerHTML =
        '<div style="margin-top:20px;padding:20px;background:var(--bg-tertiary);border-radius:var(--radius);border:1px solid var(--green);">' +
        '<h3 style="color:var(--green);">&#10004; Escrow Transaction Ready</h3>' +
        '<p><strong>Currency:</strong> ' + (cur.symbol || currency) + ' (' + (cur.name || '') + ')</p>' +
        '<p><strong>Amount:</strong> ' + amount + ' ' + (cur.symbol || '') + '</p>' +
        '<p><strong>Agreement Hash:</strong> <code>' + data.anchor.contentHash + '</code></p>' +
        '<p><strong>Contract:</strong> <code>' + (data.escrowTx.contract || 'Not deployed yet') + '</code></p>' +
        '<p><strong>Network:</strong> Base (Chain ID: ' + data.escrowTx.chainId + ')</p>' +
        '<p style="margin-top:12px;font-size:13px;color:var(--text-muted);">&#128274; Both parties must accept the escrow terms. Share the agreement link with the counterparty to get their acceptance.</p>' +
        '<p style="margin-top:8px;font-size:13px;color:var(--yellow);">Connect your wallet to submit this transaction on-chain.</p>' +
        '</div>';
      toast('Escrow ready - ' + currency + ' on Base', 'success');
    } catch(err) {
      genOverlay.style.display = 'none';
      toast('Error: ' + err.message, 'error');
    }
  };

  // ─── On-Chain Verify Page ──────────────────────────────
  function renderOnChain() {
    pageContent.innerHTML = `
      <div class="page-header">
        <div>
          <h1>&#9939; On-Chain Verification</h1>
          <p>Verify agreements registered on Story Protocol blockchain</p>
        </div>
      </div>

      <div class="create-section">
        <h2>Story Protocol Integration</h2>
        <p style="margin-bottom:16px;color:var(--text-secondary);">Every AgreeMint agreement can be registered as an IP Asset on Story Protocol, creating an immutable on-chain record that anyone can verify.</p>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">
          <div style="padding:20px;background:var(--bg-tertiary);border-radius:var(--radius);">
            <h3 style="color:var(--accent);margin-bottom:8px;">How It Works</h3>
            <ul style="font-size:13px;color:var(--text-secondary);padding-left:20px;line-height:2;">
              <li>Agreement content is SHA-256 hashed</li>
              <li>Hash + metadata registered on Story Protocol</li>
              <li>Creates immutable on-chain IP Asset</li>
              <li>Anyone can verify the document against the hash</li>
              <li>Tamper-proof: any change invalidates the hash</li>
            </ul>
          </div>
          <div style="padding:20px;background:var(--bg-tertiary);border-radius:var(--radius);">
            <h3 style="color:var(--green);margin-bottom:8px;">Why Story Protocol?</h3>
            <ul style="font-size:13px;color:var(--text-secondary);padding-left:20px;line-height:2;">
              <li>Purpose-built for intellectual property</li>
              <li>Native IP Asset registry with metadata</li>
              <li>Licensing module for agreement terms</li>
              <li>Royalty & payment tracking built-in</li>
              <li>Cross-chain composability</li>
            </ul>
          </div>
        </div>
      </div>

      <div class="create-section">
        <h2>Verify an Agreement</h2>
        <div class="form-group">
          <label>Agreement ID or Content Hash</label>
          <input class="form-input" id="verify-input" placeholder="Paste agreement ID or 0x hash...">
        </div>
        <button class="btn btn-primary" onclick="verifyOnChain()">&#9939; Verify</button>
        <div id="verify-result" style="margin-top:20px;"></div>
      </div>

      <div class="create-section">
        <h2>Registered Agreements</h2>
        <div id="registered-list">
          <p style="color:var(--text-muted);font-size:13px;">Agreements that have been registered on-chain will appear here.</p>
        </div>
      </div>
    `;

    // Load registered agreements
    loadRegisteredAgreements();
  }

  window.verifyOnChain = async function() {
    const input = document.getElementById('verify-input').value.trim();
    if (!input) { toast('Enter an agreement ID or hash', 'error'); return; }

    try {
      const data = await api('GET', '/api/agreements/' + input + '/proof');
      document.getElementById('verify-result').innerHTML =
        '<div style="padding:20px;background:var(--bg-tertiary);border-radius:var(--radius);border:1px solid var(--green);">' +
        '<h3 style="color:var(--green);">&#10004; Document Verified</h3>' +
        '<div style="margin-top:12px;font-size:13px;">' +
        '<div style="padding:4px 0;"><strong>Title:</strong> ' + esc(data.agreement.title) + '</div>' +
        '<div style="padding:4px 0;"><strong>Type:</strong> ' + data.agreement.type + '</div>' +
        '<div style="padding:4px 0;"><strong>Content Hash:</strong> <code>' + data.agreement.contentHash + '</code></div>' +
        '<div style="padding:4px 0;"><strong>Chain:</strong> ' + (data.chain.network || 'Not yet registered') + '</div>' +
        (data.chain.txHash ? '<div style="padding:4px 0;"><strong>TX:</strong> <a href="' + data.verification.explorerUrl + '" target="_blank" style="color:var(--accent);">' + data.chain.txHash.substring(0,20) + '...</a></div>' : '') +
        (data.escrow ? '<div style="padding:4px 0;"><strong>Escrow:</strong> ID #' + data.escrow.escrowId + ' | ' + data.escrow.state + '</div>' : '') +
        '</div></div>';
    } catch(err) {
      document.getElementById('verify-result').innerHTML =
        '<div style="padding:16px;background:var(--bg-tertiary);border:1px solid var(--red);border-radius:var(--radius);color:var(--red);">Could not verify: ' + err.message + '</div>';
    }
  };

  async function loadRegisteredAgreements() {
    try {
      const agrs = await api('GET', '/api/agreements');
      const registered = agrs.filter(a => a.blockchain && a.blockchain.registered);
      const el = document.getElementById('registered-list');
      if (!el) return;
      if (registered.length === 0) {
        el.innerHTML = '<p style="color:var(--text-muted);font-size:13px;">No agreements registered on-chain yet. Go to an agreement and click "Register On-Chain" to get started.</p>';
        return;
      }
      el.innerHTML = registered.map(a =>
        '<div class="agreement-card" onclick="window._nav(\'view\',\'' + a.id + '\')">' +
        '<div class="agreement-icon">&#9939;</div>' +
        '<div class="agreement-info"><h3>' + esc(a.title) + '</h3><div class="agreement-meta"><span>Registered on Story Protocol</span></div></div>' +
        '<span class="status-badge status-signed">ON-CHAIN</span></div>'
      ).join('');
    } catch(e) {}
  }

  // ─── Init ──────────────────────────────────────────────
  if (authToken) {
    api('GET', '/api/auth/verify').then(() => showApp()).catch(() => logout());
  }

})();
