/**
 * AgreeMint -- Full-Featured AI Agreement Platform
 * Frontend Application (v2.0)
 */
// Global error handler: show all JS errors as toast
window.onerror = function(message, source, lineno, colno, error) {
  var msg = '[JS Error] ' + message + ' at ' + (source||'') + ':' + lineno + ':' + colno;
  try {
    var c = document.getElementById('toast-container');
    if (c) {
      var t = document.createElement('div');
      t.className = 'toast toast-error';
      t.textContent = msg;
      c.appendChild(t);
      setTimeout(function(){ t.remove(); }, 8000);
    }
  } catch(e) {}
  return false;
};

(function () {
  'use strict';

  // State
  let authToken = localStorage.getItem('authToken');
  let userEmail = localStorage.getItem('userEmail') || '';
  let userName = localStorage.getItem('userName') || '';
  let userTier = localStorage.getItem('userTier') || 'free';
  let userId = localStorage.getItem('userId') || '';
  let currentPage = 'dashboard';
  let templates = [];
  let categories = [];
  let jurisdictions = [];
  let agreements = [];
  let chatSessionId = null;
  let chatMessages = [];
  let authMode = 'login';

  // DOM Refs
  const loginScreen = document.getElementById('login-screen');
  const appScreen = document.getElementById('app-screen');
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const loginError = document.getElementById('login-error');
  const pageContent = document.getElementById('page-content');
  const genOverlay = document.getElementById('generating-overlay');
  const genText = document.getElementById('gen-text');

  // Sanitizer (DOMPurify)
  function sanitize(html) {
    if (typeof DOMPurify !== 'undefined') return DOMPurify.sanitize(html);
    return html;
  }

  // Escape HTML
  function esc(str) {
    if (!str) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // Time ago
  function timeAgo(ts) {
    if (!ts) return '';
    var diff = Date.now() - new Date(ts).getTime();
    var mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return mins + 'm ago';
    var hrs = Math.floor(mins / 60);
    if (hrs < 24) return hrs + 'h ago';
    var days = Math.floor(hrs / 24);
    if (days < 30) return days + 'd ago';
    return new Date(ts).toLocaleDateString();
  }

  // API Helper
  async function api(method, url, body) {
    var opts = { method: method, headers: { 'Content-Type': 'application/json' } };
    if (authToken) opts.headers['x-auth-token'] = authToken;
    if (body) opts.body = JSON.stringify(body);
    var r = await fetch(url, opts);
    var data = await r.json();
    if (!r.ok) throw new Error(data.error || 'Request failed');
    return data;
  }

  // Toast
  function toast(msg, type) {
    type = type || 'info';
    var c = document.getElementById('toast-container');
    var t = document.createElement('div');
    t.className = 'toast toast-' + type;
    t.textContent = msg;
    c.appendChild(t);
    setTimeout(function(){ t.remove(); }, 4000);
  }

  // Auth Tabs
  var socialDividerLogin = document.getElementById('social-divider-login');
  var socialButtonsLogin = document.getElementById('social-buttons-login');
  var socialRegister = document.getElementById('social-buttons-register');
  document.querySelectorAll('.auth-tab').forEach(function(tab) {
    tab.addEventListener('click', function() {
      authMode = tab.dataset.tab;
      document.querySelectorAll('.auth-tab').forEach(function(t){ t.classList.remove('active'); });
      tab.classList.add('active');
      loginForm.style.display = authMode === 'login' ? 'block' : 'none';
      registerForm.style.display = authMode === 'register' ? 'block' : 'none';
      // Toggle social buttons by ID
      if (socialDividerLogin) socialDividerLogin.style.display = authMode === 'login' ? 'block' : 'none';
      if (socialButtonsLogin) socialButtonsLogin.style.display = authMode === 'login' ? 'flex' : 'none';
      if (socialRegister) socialRegister.style.display = authMode === 'register' ? 'block' : 'none';
      loginError.style.display = 'none';
    });
  });

  // Login
  loginForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    loginError.style.display = 'none';
    try {
      var email2 = document.getElementById('login-email').value.trim();
      var password3 = document.getElementById('login-password').value;
      if (!password3) throw new Error('Password is required');
      var body = email2 ? { email: email2, password: password3 } : { password: password3 };
      var data2 = await api('POST', '/api/auth/login', body);
      authToken = data2.token;
      userEmail = data2.user.email;
      userName = data2.user.name || data2.user.email;
      userTier = data2.user.tier || 'enterprise';
      userId = data2.user.id || '';
      localStorage.setItem('authToken', authToken);
      localStorage.setItem('userEmail', userEmail);
      localStorage.setItem('userName', userName);
      localStorage.setItem('userTier', userTier);
      localStorage.setItem('userId', userId);
      showApp();
    } catch (err) {
      loginError.textContent = err.message;
      loginError.style.display = 'block';
    }
  });

  // Register
  registerForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    loginError.style.display = 'none';
    try {
      var name = document.getElementById('reg-name').value.trim();
      var email = document.getElementById('reg-email').value.trim();
      var company = document.getElementById('reg-company').value.trim();
      var password = document.getElementById('reg-password').value;
      var password2 = document.getElementById('reg-password2').value;
      if (!email) throw new Error('Email is required');
      if (!password) throw new Error('Password is required');
      if (password !== password2) throw new Error('Passwords do not match');
      if (password.length < 8) throw new Error('Password must be at least 8 characters');
      var data = await api('POST', '/api/auth/register', { email: email, password: password, name: name, company: company });
      authToken = data.token;
      userEmail = data.user.email;
      userName = data.user.name || email;
      userTier = data.user.tier || 'free';
      userId = data.user.id || '';
      localStorage.setItem('authToken', authToken);
      localStorage.setItem('userEmail', userEmail);
      localStorage.setItem('userName', userName);
      localStorage.setItem('userTier', userTier);
      localStorage.setItem('userId', userId);
      toast('Account created! Welcome to AgreeMint', 'success');
      showApp();
    } catch (err) {
      loginError.textContent = err.message;
      loginError.style.display = 'block';
    }
  });

  function logout() {
    api('POST', '/api/auth/logout').catch(function(){});
    authToken = null;
    localStorage.removeItem('authToken');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userName');
    localStorage.removeItem('userTier');
    localStorage.removeItem('userId');
    loginScreen.style.display = 'flex';
    appScreen.style.display = 'none';
  }

  // Show App
  async function showApp() {
    loginScreen.style.display = 'none';
    appScreen.style.display = 'flex';
    document.getElementById('user-email').textContent = userEmail;
    document.getElementById('user-avatar').textContent = (userName || userEmail || 'A').charAt(0).toUpperCase();
    document.getElementById('logout-btn').onclick = logout;
    document.getElementById('topbar-toggle').onclick = function(){
      document.getElementById('sidebar').classList.add('open');
      document.getElementById('sidebar-backdrop').classList.add('active');
    };
    var closeSidebar = function(){
      document.getElementById('sidebar').classList.remove('open');
      document.getElementById('sidebar-backdrop').classList.remove('active');
    };
    document.getElementById('sidebar-close').onclick = closeSidebar;
    document.getElementById('sidebar-backdrop').onclick = closeSidebar;
    document.getElementById('fab-new').onclick = function(){ navigate('create'); };
    document.querySelectorAll('.nav-item[data-page]').forEach(function(btn) {
      btn.onclick = function(){ navigate(btn.dataset.page); };
    });
    try {
      var cfg = await api('GET', '/api/templates');
      templates = cfg.types || [];
      categories = cfg.categories || [];
      jurisdictions = cfg.jurisdictions || [];
    } catch(e) {}
    navigate('dashboard');
  }

  // Navigation
  window._nav = function(page, extra) { navigate(page, extra); };
  var _viewId = null;
  function navigate(page, extra) {
    currentPage = page;
    if (extra) _viewId = extra;
    document.querySelectorAll('.nav-item').forEach(function(n){ n.classList.remove('active'); });
    var active = document.querySelector('.nav-item[data-page="' + page + '"]');
    if (active) active.classList.add('active');
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebar-backdrop').classList.remove('active');
    switch(page) {
      case 'dashboard': renderDashboard(); break;
      case 'agreements': renderAgreements(); break;
      case 'create': renderCreate(); break;
      case 'templates': renderTemplates(); break;
      case 'analyze': renderAnalyze(); break;
      case 'chat': renderChat(); break;
      case 'view': renderView(_viewId); break;
      case 'escrow': renderEscrow(); break;
      case 'onchain': renderOnChain(); break;
      case 'marketplace': renderMarketplace(); break;
      case 'legal-marketplace': renderLegalMarketplace(); break;
      case 'wallet': renderWallet(); break;
      case 'analytics': renderAnalytics(); break;
      case 'profile': renderProfile(); break;
      default: renderDashboard();
    }
  }

  /* ========================================
   * DASHBOARD
   * ======================================== */
  async function renderDashboard() {
    pageContent.innerHTML = '<div class="loading"><div class="spinner"></div> Loading dashboard...</div>';
    try {
      var results = await Promise.all([api('GET', '/api/stats'), api('GET', '/api/agreements')]);
      var stats = results[0];
      var agrs = results[1];
      agreements = agrs;
      document.getElementById('agreement-count').textContent = agrs.length;
      var recent = agrs.slice(0, 5);
      var activity = (stats.recentActivity || []).slice(0, 8);
      pageContent.innerHTML = sanitize(
        '<div class="page-header"><div><h1>&#128202; Dashboard</h1><p>Welcome back, ' + esc(userName || userEmail) + '</p></div>' +
        '<div class="page-actions"><button class="btn btn-primary" onclick="window._nav(\'create\')">&#10010; New Agreement</button></div></div>' +
        '<div class="stats-grid">' +
        '<div class="stat-card accent"><span class="stat-icon">&#128196;</span><div class="stat-label">Total Agreements</div><div class="stat-value">' + (stats.total || 0) + '</div></div>' +
        '<div class="stat-card blue"><span class="stat-icon">&#9998;</span><div class="stat-label">Drafts</div><div class="stat-value">' + (stats.drafts || 0) + '</div></div>' +
        '<div class="stat-card yellow"><span class="stat-icon">&#9203;</span><div class="stat-label">Pending</div><div class="stat-value">' + (stats.pending || 0) + '</div></div>' +
        '<div class="stat-card green"><span class="stat-icon">&#10004;</span><div class="stat-label">Signed</div><div class="stat-value">' + (stats.signed || 0) + '</div></div>' +
        '</div>' +
        '<div class="dashboard-grid">' +
        '<div class="create-section"><h2>&#128196; Recent Agreements</h2><div class="agreements-list">' +
        (recent.length === 0 ? '<div class="empty-state"><div class="empty-icon">&#128196;</div><h3>No agreements yet</h3><p>Create your first agreement to get started</p></div>' : recent.map(function(a){ return agreementCard(a); }).join('')) +
        '</div></div>' +
        '<div class="create-section"><h2>&#128337; Recent Activity</h2><div class="activity-feed">' +
        (activity.length === 0 ? '<p style="color:var(--text-muted);font-size:13px;">No activity yet</p>' : activity.map(function(a){ return '<div class="activity-item"><span class="activity-action">' + esc(a.action) + '</span><span class="activity-time">' + timeAgo(a.timestamp) + '</span></div>'; }).join('')) +
        '</div></div></div>'
      );
    } catch(err) {
      pageContent.innerHTML = '<div class="empty-state"><h3>Error loading dashboard</h3><p>' + esc(err.message) + '</p></div>';
    }
  }

  /* ========================================
   * AGREEMENTS LIST
   * ======================================== */
  async function renderAgreements() {
    pageContent.innerHTML = '<div class="loading"><div class="spinner"></div> Loading...</div>';
    try {
      agreements = await api('GET', '/api/agreements');
      document.getElementById('agreement-count').textContent = agreements.length;
      pageContent.innerHTML = sanitize(
        '<div class="page-header"><div><h1>&#128196; Agreements</h1><p>' + agreements.length + ' total</p></div>' +
        '<div class="page-actions"><button class="btn btn-primary" onclick="window._nav(\'create\')">&#10010; New Agreement</button></div></div>' +
        '<div class="search-bar">' +
        '<input class="form-input" id="agr-search" placeholder="Search agreements..." oninput="window._filterAgreements()">' +
        '<select class="form-select" id="agr-status-filter" style="width:160px;" onchange="window._filterAgreements()">' +
        '<option value="">All Status</option><option value="draft">Draft</option><option value="pending">Pending</option>' +
        '<option value="signed">Signed</option><option value="disputed">Disputed</option><option value="cancelled">Cancelled</option></select></div>' +
        '<div class="agreements-list" id="agreements-list">' +
        (agreements.length === 0 ? '<div class="empty-state"><div class="empty-icon">&#128196;</div><h3>No agreements yet</h3><button class="btn btn-primary" onclick="window._nav(\'create\')">&#10010; Create</button></div>' : agreements.map(function(a){ return agreementCard(a); }).join('')) +
        '</div>'
      );
    } catch(err) {
      pageContent.innerHTML = '<div class="empty-state"><h3>Error</h3><p>' + esc(err.message) + '</p></div>';
    }
  }

  window._filterAgreements = function() {
    var q = (document.getElementById('agr-search').value || '').toLowerCase();
    var status = document.getElementById('agr-status-filter').value;
    var filtered = agreements.filter(function(a) {
      if (status && a.status !== status) return false;
      if (q && !(a.title || '').toLowerCase().includes(q) && !(a.type || '').toLowerCase().includes(q)) return false;
      return true;
    });
    document.getElementById('agreements-list').innerHTML = sanitize(
      filtered.length === 0 ? '<div class="empty-state"><h3>No matching agreements</h3></div>' : filtered.map(function(a){ return agreementCard(a); }).join('')
    );
  };

  function agreementCard(a) {
    var icons = { draft: '&#9998;', pending: '&#9203;', signed: '&#10004;', disputed: '&#9888;', cancelled: '&#10060;' };
    return '<div class="agreement-card" onclick="window._nav(\'view\',\'' + a.id + '\')">' +
      '<div class="agreement-icon">' + (icons[a.status] || '&#128196;') + '</div>' +
      '<div class="agreement-info"><h3>' + esc(a.title || 'Untitled') + '</h3>' +
      '<div class="agreement-meta"><span>' + esc(a.type || '') + '</span><span>' + timeAgo(a.createdAt) + '</span><span>' + (a.parties || []).length + ' parties</span></div></div>' +
      '<span class="status-badge status-' + (a.status || 'draft') + '">' + (a.status || 'draft').toUpperCase() + '</span></div>';
  }

  /* ========================================
   * CREATE AGREEMENT
   * ======================================== */
  function renderCreate(preType) {
    var typeOpts = templates.map(function(t){ return '<option value="' + esc(t.id) + '"' + (preType === t.id ? ' selected' : '') + '>' + esc(t.name) + '</option>'; }).join('');
    var jurOpts = jurisdictions.map(function(j){ return '<option value="' + esc(j.id) + '">' + esc(j.name) + '</option>'; }).join('');
    pageContent.innerHTML = sanitize(
      '<div class="page-header"><div><h1>&#10010; Create Agreement</h1><p>AI-powered agreement generation</p></div></div>' +
      '<div class="create-section"><h2>&#128203; Agreement Details</h2>' +
      '<div class="form-row"><div class="form-group"><label>Agreement Type</label><select class="form-select" id="create-type">' + typeOpts + '</select></div>' +
      '<div class="form-group"><label>Jurisdiction</label><select class="form-select" id="create-jurisdiction">' + jurOpts + '</select></div></div>' +
      '<div class="form-group"><label>Title</label><input class="form-input" id="create-title" placeholder="e.g. Marketing Services Agreement"></div>' +
      '<div class="form-row"><div class="form-group"><label>Your Stance</label><select class="form-select" id="create-stance">' +
      '<option value="neutral">Neutral / Balanced</option><option value="protective">Protective</option><option value="aggressive">Aggressive</option><option value="collaborative">Collaborative</option></select></div>' +
      '<div class="form-group"><label>Upload Document <span style="color:var(--text-muted);font-weight:400;">(optional)</span></label><input class="form-input" type="file" id="create-upload" accept=".pdf,.doc,.docx,.txt"></div></div></div>' +
      '<div class="create-section"><h2>&#128101; Parties</h2><div id="parties-container">' +
      '<div class="party-row"><input class="form-input" placeholder="Party name" value="' + esc(userName || '') + '"><input class="form-input" placeholder="Email" value="' + esc(userEmail || '') + '"><input class="form-input" placeholder="Role"></div>' +
      '<div class="party-row"><input class="form-input" placeholder="Party name"><input class="form-input" placeholder="Email"><input class="form-input" placeholder="Role"><button class="remove-party" onclick="this.parentElement.remove()">x</button></div>' +
      '</div><button class="btn btn-secondary btn-sm" style="margin-top:12px;" onclick="window._addParty()">+ Add Party</button></div>' +
      '<div class="create-section"><h2>&#128221; Details</h2>' +
      '<div class="form-group"><label>Key Terms and Details</label><textarea class="form-textarea" id="create-details" rows="6" placeholder="Describe key terms, deliverables, payment, timeline..."></textarea></div>' +
      '<div class="form-group"><label>Additional Clauses <span style="color:var(--text-muted);font-weight:400;">(optional)</span></label><textarea class="form-textarea" id="create-clauses" rows="3" placeholder="Specific clauses to include..."></textarea></div></div>' +
      '<button class="btn btn-primary" onclick="window._generateAgreement()" style="width:auto;padding:14px 40px;">&#9878; Generate Agreement with AI</button>'
    );
  }

  window._addParty = function() {
    var c = document.getElementById('parties-container');
    var row = document.createElement('div');
    row.className = 'party-row';
    row.innerHTML = '<input class="form-input" placeholder="Party name"><input class="form-input" placeholder="Email"><input class="form-input" placeholder="Role"><button class="remove-party" onclick="this.parentElement.remove()">x</button>';
    c.appendChild(row);
  };

  window._generateAgreement = async function() {
    var type = document.getElementById('create-type').value;
    var jurisdiction = document.getElementById('create-jurisdiction').value;
    var title = document.getElementById('create-title').value.trim();
    var stance = document.getElementById('create-stance').value;
    var details = document.getElementById('create-details').value.trim();
    var additionalClauses = document.getElementById('create-clauses').value.trim();
    var partyRows = document.querySelectorAll('#parties-container .party-row');
    var parties = [];
    partyRows.forEach(function(row) {
      var inputs = row.querySelectorAll('input');
      var name = inputs[0] && inputs[0].value.trim();
      var email = inputs[1] && inputs[1].value.trim();
      var role = inputs[2] && inputs[2].value.trim();
      if (name) parties.push({ name: name, email: email, role: role });
    });
    if (!details) { toast('Please describe the agreement details', 'error'); return; }
    if (parties.length < 2) { toast('Add at least 2 parties', 'error'); return; }
    genText.textContent = 'AI is generating your agreement...';
    genOverlay.style.display = 'flex';
    try {
      var data = await api('POST', '/api/agreements', { type: type, jurisdiction: jurisdiction, title: title, stance: stance, parties: parties, details: details, additionalClauses: additionalClauses });
      genOverlay.style.display = 'none';
      toast('Agreement created!', 'success');
      navigate('view', data.agreement.id);
    } catch(err) {
      genOverlay.style.display = 'none';
      toast('Error: ' + err.message, 'error');
    }
  };

  /* ========================================
   * TEMPLATES
   * ======================================== */
  function renderTemplates() {
    var typeGrid = templates.map(function(t) {
      return '<div class="template-card" onclick="window._nav(\'create\',\'' + esc(t.id) + '\')">' +
        '<h3>' + esc(t.name) + '</h3>' +
        '<p>' + esc(t.description || '') + '</p>' +
        '<span class="template-category">' + esc(t.category || '') + '</span></div>';
    }).join('');
    pageContent.innerHTML = sanitize(
      '<div class="page-header"><div><h1>&#128203; Templates</h1><p>' + templates.length + ' agreement types available</p></div></div>' +
      '<div class="search-bar"><input class="form-input" id="tpl-search" placeholder="Search templates..." oninput="window._filterTemplates()"></div>' +
      '<div class="template-grid" id="template-grid">' + typeGrid + '</div>'
    );
  }

  window._filterTemplates = function() {
    var q = (document.getElementById('tpl-search').value || '').toLowerCase();
    var filtered = templates.filter(function(t) {
      return !q || (t.name || '').toLowerCase().includes(q) || (t.description || '').toLowerCase().includes(q) || (t.category || '').toLowerCase().includes(q);
    });
    document.getElementById('template-grid').innerHTML = sanitize(
      filtered.map(function(t) {
        return '<div class="template-card" onclick="window._nav(\'create\',\'' + esc(t.id) + '\')">' +
          '<h3>' + esc(t.name) + '</h3><p>' + esc(t.description || '') + '</p>' +
          '<span class="template-category">' + esc(t.category || '') + '</span></div>';
      }).join('')
    );
  };

  /* ========================================
   * ANALYZE AGREEMENT
   * ======================================== */
  function renderAnalyze() {
    pageContent.innerHTML = sanitize(
      '<div class="page-header"><div><h1>&#128270; Analyze Agreement</h1><p>AI-powered risk and clause analysis</p></div></div>' +
      '<div class="create-section"><h2>&#128196; Paste Agreement</h2>' +
      '<div class="form-group"><label>Agreement Text</label><textarea class="form-textarea" id="analyze-text" rows="12" placeholder="Paste your agreement text here..."></textarea></div>' +
      '<div class="form-row"><div class="form-group"><label>Your Role</label><select class="form-select" id="analyze-role"><option value="neutral">Neutral</option><option value="party_a">Party A</option><option value="party_b">Party B</option></select></div>' +
      '<div class="form-group"><label>Focus Area</label><select class="form-select" id="analyze-focus"><option value="general">General</option><option value="risks">Risks</option><option value="obligations">Obligations</option><option value="financials">Financials</option></select></div></div>' +
      '<button class="btn btn-primary" onclick="window._analyzeText()" style="padding:12px 32px;">&#128270; Analyze</button></div>' +
      '<div id="analyze-result" style="margin-top:24px;"></div>'
    );
  }

  window._analyzeText = async function() {
    var text = document.getElementById('analyze-text').value.trim();
    if (!text) { toast('Paste agreement text first', 'error'); return; }
    genText.textContent = 'AI is analyzing...';
    genOverlay.style.display = 'flex';
    try {
      var data = await api('POST', '/api/analyze', { text: text, role: document.getElementById('analyze-role').value, focus: document.getElementById('analyze-focus').value });
      genOverlay.style.display = 'none';
      document.getElementById('analyze-result').innerHTML = sanitize(
        '<div class="analysis-result"><h2>&#128270; Analysis Results</h2><div class="content-body">' + (typeof marked !== 'undefined' ? marked.parse(data.analysis || '') : esc(data.analysis || '')) + '</div></div>'
      );
    } catch(err) {
      genOverlay.style.display = 'none';
      toast('Error: ' + err.message, 'error');
    }
  };

  /* ========================================
   * AI CHAT
   * ======================================== */
  function renderChat() {
    pageContent.innerHTML = sanitize(
      '<div class="page-header"><div><h1>&#128172; AI Legal Chat</h1><p>Ask questions about agreements and legal topics</p></div>' +
      '<div class="page-actions"><button class="btn btn-secondary btn-sm" onclick="window._newChat()">&#10010; New Chat</button></div></div>' +
      '<div class="chat-container"><div class="chat-messages" id="chat-messages">' +
      (chatMessages.length === 0 ? '<div class="empty-state"><div class="empty-icon">&#128172;</div><h3>Start a conversation</h3><p>Ask about contract clauses, legal terms, or compliance</p></div>' : chatMessages.map(function(m){ return '<div class="chat-msg ' + m.role + '"><div class="msg-bubble">' + sanitize(typeof marked !== 'undefined' ? marked.parse(m.content) : esc(m.content)) + '</div></div>'; }).join('')) +
      '</div><div class="chat-input-area"><textarea class="form-textarea" id="chat-input" rows="2" placeholder="Type your legal question..." onkeydown="if(event.key===\'Enter\'&&!event.shiftKey){event.preventDefault();window._sendChat();}"></textarea>' +
      '<button class="btn btn-primary" onclick="window._sendChat()">Send</button></div></div>'
    );
    var el = document.getElementById('chat-messages');
    if (el) el.scrollTop = el.scrollHeight;
  }

  window._newChat = function() {
    chatSessionId = null;
    chatMessages = [];
    renderChat();
  };

  window._sendChat = async function() {
    var input = document.getElementById('chat-input');
    var msg = input.value.trim();
    if (!msg) return;
    input.value = '';
    chatMessages.push({ role: 'user', content: msg });
    var msgArea = document.getElementById('chat-messages');
    msgArea.innerHTML = chatMessages.map(function(m){ return '<div class="chat-msg ' + m.role + '"><div class="msg-bubble">' + sanitize(typeof marked !== 'undefined' ? marked.parse(m.content) : esc(m.content)) + '</div></div>'; }).join('');
    msgArea.innerHTML += '<div class="chat-msg assistant"><div class="msg-bubble"><em>Thinking...</em></div></div>';
    msgArea.scrollTop = msgArea.scrollHeight;
    try {
      var body = { message: msg };
      if (chatSessionId) body.sessionId = chatSessionId;
      var data = await api('POST', '/api/chat', body);
      if (data.sessionId) chatSessionId = data.sessionId;
      chatMessages.push({ role: 'assistant', content: data.response || data.message || '' });
    } catch(err) {
      chatMessages.push({ role: 'assistant', content: 'Error: ' + err.message });
    }
    msgArea.innerHTML = chatMessages.map(function(m){ return '<div class="chat-msg ' + m.role + '"><div class="msg-bubble">' + sanitize(typeof marked !== 'undefined' ? marked.parse(m.content) : esc(m.content)) + '</div></div>'; }).join('');
    msgArea.scrollTop = msgArea.scrollHeight;
  };

  /* ========================================
   * VIEW AGREEMENT
   * ======================================== */
  async function renderView(id) {
    if (!id) { navigate('agreements'); return; }
    pageContent.innerHTML = '<div class="loading"><div class="spinner"></div> Loading...</div>';
    try {
      var a = await api('GET', '/api/agreements/' + id);
      var isDraft = a.status === 'draft';
      var isPending = a.status === 'pending';
      var isDisputed = a.status === 'disputed';
      var btns = [];
      btns.push('<button class="btn btn-sm btn-secondary" onclick="window._downloadPDF(\'' + id + '\')">&#128196; PDF</button>');
      btns.push('<button class="btn btn-sm btn-secondary" onclick="window._downloadCert(\'' + id + '\')">&#128272; Certificate</button>');
      btns.push('<button class="btn btn-sm btn-secondary" onclick="window._analyzeAgreement(\'' + id + '\')">&#128270; Analyze</button>');
      btns.push('<button class="btn btn-sm btn-secondary" onclick="window._extractTerms(\'' + id + '\')">&#128209; Extract Terms</button>');
      btns.push('<button class="btn btn-sm btn-secondary" onclick="window._registerOnChain(\'' + id + '\')">&#9939; On-Chain</button>');
      btns.push('<button class="btn btn-sm btn-secondary" onclick="window._openEscrowModal(\'' + id + '\')">&#128274; Escrow</button>');
      if (isDraft) {
        btns.push('<button class="btn btn-sm btn-primary" onclick="window._sendForSign(\'' + id + '\')">&#9998; Send for Signature</button>');
        btns.push('<button class="btn btn-sm btn-secondary" onclick="window._editAgreement(\'' + id + '\')">&#9998; Edit</button>');
        btns.push('<button class="btn btn-sm btn-danger" onclick="window._deleteAgreement(\'' + id + '\')">&#128465; Delete</button>');
      }
      if (isDisputed) btns.push('<button class="btn btn-sm btn-secondary" onclick="window._viewDispute(\'' + id + '\')">&#9888; View Dispute</button>');
      if (!isDisputed && !isDraft) btns.push('<button class="btn btn-sm btn-danger" onclick="window._openDisputeModal(\'' + id + '\')">&#9888; Dispute</button>');
      if (isPending) {
        btns.push('<button class="btn btn-sm btn-danger" onclick="window._cancelAgreement(\'' + id + '\')">&#10060; Cancel</button>');
        btns.push('<button class="btn btn-sm btn-secondary" onclick="window._setupWorkflow(\'' + id + '\')">&#128260; Workflow</button>');
      }
      var contentHtml = typeof marked !== 'undefined' ? marked.parse(a.content || '') : esc(a.content || '').replace(/\n/g,'<br>');
      pageContent.innerHTML = sanitize(
        '<div class="page-header"><div><h1>' + esc(a.title || 'Agreement') + '</h1>' +
        '<p style="display:flex;align-items:center;gap:8px;"><span class="status-badge status-' + a.status + '">' + (a.status || 'draft').toUpperCase() + '</span> ' + esc(a.type || '') + ' - ' + esc(a.jurisdiction || '') + '</p></div>' +
        '<div class="page-actions" style="flex-wrap:wrap;">' + btns.join('') + '</div></div>' +
        '<div class="agreement-view"><div class="agreement-content-panel"><div class="content-body" id="agreement-body">' + contentHtml + '</div></div>' +
        '<div class="side-panel">' +
        '<div class="side-card"><h3>Details</h3>' +
        '<div class="detail-row"><span class="detail-label">Type</span><span class="detail-value">' + esc(a.type || '') + '</span></div>' +
        '<div class="detail-row"><span class="detail-label">Jurisdiction</span><span class="detail-value">' + esc(a.jurisdiction || '') + '</span></div>' +
        '<div class="detail-row"><span class="detail-label">Created</span><span class="detail-value">' + (a.createdAt ? new Date(a.createdAt).toLocaleDateString() : '') + '</span></div>' +
        '<div class="detail-row"><span class="detail-label">Hash</span><span class="detail-value" style="font-size:11px;word-break:break-all;">' + esc((a.contentHash || '').substring(0,16)) + '...</span></div></div>' +
        '<div class="side-card"><h3>Parties</h3><div class="party-list">' +
        (a.parties || []).map(function(p){ return '<div class="party-item"><div class="party-avatar">' + (p.name || '?').charAt(0).toUpperCase() + '</div><div><div class="party-name">' + esc(p.name || 'Unknown') + '</div><div class="party-email">' + esc(p.email || '') + '</div></div><div class="party-signed">' + (p.signed ? '&#10004;' : '&#9203;') + '</div></div>'; }).join('') +
        '</div></div>' +
        '<div class="side-card"><h3>Audit Trail</h3><div class="activity-feed">' +
        (a.auditTrail || []).slice(-10).reverse().map(function(e){ return '<div class="activity-item"><span class="activity-action">' + esc(e.action || '') + '</span><span class="activity-time">' + timeAgo(e.timestamp) + '</span></div>'; }).join('') +
        '</div></div></div></div>' +
        '<div id="analysis-container" style="margin-top:24px;"></div>'
      );
    } catch(err) {
      pageContent.innerHTML = '<div class="empty-state"><h3>Error</h3><p>' + esc(err.message) + '</p></div>';
    }
  }

  /* ========================================
   * AGREEMENT ACTIONS
   * ======================================== */
  window._downloadPDF = async function(id) {
    try {
      var r = await fetch('/api/agreements/' + id + '/pdf', { headers: { 'x-auth-token': authToken } });
      if (!r.ok) throw new Error('PDF generation failed');
      var blob = await r.blob();
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a'); a.href = url; a.download = 'agreement-' + id + '.pdf'; a.click(); URL.revokeObjectURL(url);
      toast('PDF downloaded', 'success');
    } catch(err) { toast('Error: ' + err.message, 'error'); }
  };

  window._downloadCert = async function(id) {
    try {
      var r = await fetch('/api/agreements/' + id + '/certificate', { headers: { 'x-auth-token': authToken } });
      if (!r.ok) throw new Error('Certificate generation failed');
      var blob = await r.blob();
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a'); a.href = url; a.download = 'certificate-' + id + '.pdf'; a.click(); URL.revokeObjectURL(url);
      toast('Certificate downloaded', 'success');
    } catch(err) { toast('Error: ' + err.message, 'error'); }
  };

  window._analyzeAgreement = async function(id) {
    genText.textContent = 'AI is analyzing...';
    genOverlay.style.display = 'flex';
    try {
      var data = await api('POST', '/api/agreements/' + id + '/analyze');
      genOverlay.style.display = 'none';
      var c = document.getElementById('analysis-container');
      if (c) {
        c.innerHTML = sanitize('<div class="analysis-result"><h2>&#128270; AI Analysis</h2><div class="content-body">' + (typeof marked !== 'undefined' ? marked.parse(data.analysis || '') : esc(data.analysis || '')) + '</div></div>');
        c.scrollIntoView({behavior:'smooth'});
      }
    } catch(err) { genOverlay.style.display = 'none'; toast('Error: ' + err.message, 'error'); }
  };

  window._extractTerms = async function(id) {
    genText.textContent = 'Extracting terms...';
    genOverlay.style.display = 'flex';
    try {
      var data = await api('POST', '/api/agreements/' + id + '/extract');
      genOverlay.style.display = 'none';
      var c = document.getElementById('analysis-container');
      if (c) {
        c.innerHTML = sanitize('<div class="analysis-result"><h2>&#128209; Extracted Terms</h2><div class="content-body">' + (typeof marked !== 'undefined' ? marked.parse(data.terms || '') : esc(data.terms || '')) + '</div></div>');
        c.scrollIntoView({behavior:'smooth'});
      }
    } catch(err) { genOverlay.style.display = 'none'; toast('Error: ' + err.message, 'error'); }
  };

  window._sendForSign = async function(id) {
    if (!confirm('Send this agreement for signature?')) return;
    genText.textContent = 'Sending for signature...';
    genOverlay.style.display = 'flex';
    try {
      await api('POST', '/api/agreements/' + id + '/send');
      genOverlay.style.display = 'none';
      toast('Agreement sent for signature!', 'success');
      navigate('view', id);
    } catch(err) { genOverlay.style.display = 'none'; toast('Error: ' + err.message, 'error'); }
  };

  window._deleteAgreement = async function(id) {
    if (!confirm('Delete this agreement permanently?')) return;
    try { await api('DELETE', '/api/agreements/' + id); toast('Deleted', 'success'); navigate('agreements'); }
    catch(err) { toast('Error: ' + err.message, 'error'); }
  };

  window._editAgreement = async function(id) {
    var c = document.getElementById('analysis-container');
    if (!c) return;
    try {
      var a = await api('GET', '/api/agreements/' + id);
      c.innerHTML = sanitize(
        '<div class="analysis-result"><h2>&#9998; Edit Agreement</h2>' +
        '<div class="form-group" style="margin-top:16px;"><label>Title</label><input class="form-input" id="edit-title" value="' + esc(a.title || '') + '"></div>' +
        '<div class="form-group"><label>Content (Markdown)</label><textarea class="form-textarea" id="edit-content" rows="20" style="min-height:400px;font-family:monospace;">' + esc(a.content || '') + '</textarea></div>' +
        '<div style="display:flex;gap:12px;margin-top:16px;"><button class="btn btn-primary" onclick="window._saveEdit(\'' + id + '\')">&#10004; Save</button><button class="btn btn-secondary" onclick="document.getElementById(\'analysis-container\').innerHTML=\'\'">Cancel</button></div></div>'
      );
      c.scrollIntoView({behavior:'smooth'});
    } catch(err) { toast('Error: ' + err.message, 'error'); }
  };

  window._saveEdit = async function(id) {
    var title = document.getElementById('edit-title').value.trim();
    var content = document.getElementById('edit-content').value;
    try { await api('PUT', '/api/agreements/' + id, { title: title, content: content }); toast('Updated!', 'success'); navigate('view', id); }
    catch(err) { toast('Error: ' + err.message, 'error'); }
  };

  window._setupWorkflow = async function(id) {
    var c = document.getElementById('analysis-container');
    if (!c) return;
    try {
      var a = await api('GET', '/api/agreements/' + id);
      var signers = (a.parties || []).filter(function(p){ return p.email; });
      c.innerHTML = sanitize(
        '<div class="analysis-result"><h2>&#128260; Signing Workflow</h2>' +
        '<p style="color:var(--text-muted);margin:8px 0 16px;">Configure signing order.</p>' +
        '<div class="form-group"><label>Mode</label><select class="form-select" id="wf-mode"><option value="parallel">Parallel (all at once)</option><option value="sequential">Sequential (ordered)</option></select></div>' +
        '<div class="form-group"><label>Signers</label>' +
        signers.map(function(s,i){ return '<div style="padding:12px;background:var(--bg-tertiary);border-radius:var(--radius-sm);margin-bottom:8px;display:flex;align-items:center;gap:12px;"><span style="color:var(--accent);font-weight:700;">#' + (i+1) + '</span><div><div style="font-weight:500;">' + esc(s.name) + '</div><div style="font-size:12px;color:var(--text-muted);">' + esc(s.email) + '</div></div><span style="margin-left:auto;">' + (s.signed ? '<span style="color:var(--green);">&#10004; Signed</span>' : '<span style="color:var(--yellow);">&#9203; Pending</span>') + '</span></div>'; }).join('') +
        '</div><div style="display:flex;gap:12px;"><button class="btn btn-primary" onclick="window._saveWorkflow(\'' + id + '\')">Save Workflow</button><button class="btn btn-secondary" onclick="window._sendReminders(\'' + id + '\')">&#128232; Send Reminders</button></div></div>'
      );
      c.scrollIntoView({behavior:'smooth'});
    } catch(err) { toast('Error: ' + err.message, 'error'); }
  };

  window._saveWorkflow = async function(id) {
    var mode = document.getElementById('wf-mode').value;
    try { await api('POST', '/api/agreements/' + id + '/workflow', { mode: mode }); toast('Workflow saved!', 'success'); }
    catch(err) { toast('Error: ' + err.message, 'error'); }
  };

  window._sendReminders = async function(id) {
    try { await api('POST', '/api/agreements/' + id + '/remind'); toast('Reminders sent!', 'success'); }
    catch(err) { toast('Error: ' + err.message, 'error'); }
  };

  /* ========================================
   * ESCROW
   * ======================================== */
  function renderEscrow() {
    pageContent.innerHTML = sanitize(
      '<div class="page-header"><div><h1>&#128274; Escrow</h1><p>Blockchain-powered escrow for agreements</p></div></div>' +
      '<div class="create-section"><h2>Active Escrows</h2><div id="escrow-list"><div class="loading"><div class="spinner"></div> Loading...</div></div></div>'
    );
    loadEscrows();
  }

  async function loadEscrows() {
    try {
      var data = await api('GET', '/api/escrow');
      var list = data.escrows || [];
      var el = document.getElementById('escrow-list');
      if (!el) return;
      if (list.length === 0) {
        el.innerHTML = '<div class="empty-state"><h3>No active escrows</h3><p>Create an escrow from any agreement</p></div>';
      } else {
        el.innerHTML = sanitize(list.map(function(e) {
          return '<div class="agreement-card"><div class="agreement-icon">&#128274;</div><div class="agreement-info"><h3>Escrow #' + esc(e.id || '').substring(0,8) + '</h3><div class="agreement-meta"><span>' + esc(e.crypto || 'ETH') + '</span><span>' + esc(e.amount || '0') + '</span><span>' + esc(e.status || '') + '</span></div></div><span class="status-badge status-' + (e.status === 'funded' ? 'signed' : 'pending') + '">' + esc(e.status || 'pending').toUpperCase() + '</span></div>';
        }).join(''));
      }
    } catch(err) {
      var el = document.getElementById('escrow-list');
      if (el) el.innerHTML = '<div class="empty-state"><h3>Error</h3><p>' + esc(err.message) + '</p></div>';
    }
  }

  window._openEscrowModal = async function(id) {
    var c = document.getElementById('analysis-container');
    if (!c) return;
    c.innerHTML = sanitize(
      '<div class="analysis-result"><h2>&#128274; Create Escrow</h2>' +
      '<div class="form-group"><label>Cryptocurrency</label><select class="form-select" id="escrow-crypto"><option value="ETH">Ethereum (ETH)</option><option value="BTC">Bitcoin (BTC)</option><option value="USDT">Tether (USDT)</option><option value="USDC">USD Coin (USDC)</option><option value="SOL">Solana (SOL)</option><option value="MATIC">Polygon (MATIC)</option></select></div>' +
      '<div class="form-group"><label>Amount</label><input class="form-input" id="escrow-amount" type="number" step="0.0001" placeholder="0.00"></div>' +
      '<div class="form-group"><label>Release Conditions</label><textarea class="form-textarea" id="escrow-conditions" rows="3" placeholder="Describe conditions for release..."></textarea></div>' +
      '<button class="btn btn-primary" onclick="window._createEscrow(\'' + id + '\')">Create Escrow</button></div>'
    );
    c.scrollIntoView({behavior:'smooth'});
  };

  window._createEscrow = async function(id) {
    var crypto = document.getElementById('escrow-crypto').value;
    var amount = document.getElementById('escrow-amount').value;
    var conditions = document.getElementById('escrow-conditions').value;
    if (!amount) { toast('Enter amount', 'error'); return; }
    try {
      await api('POST', '/api/escrow', { agreementId: id, crypto: crypto, amount: parseFloat(amount), conditions: conditions });
      toast('Escrow created!', 'success');
      document.getElementById('analysis-container').innerHTML = '';
    } catch(err) { toast('Error: ' + err.message, 'error'); }
  };

  /* ========================================
   * ON-CHAIN
   * ======================================== */
  function renderOnChain() {
    pageContent.innerHTML = sanitize(
      '<div class="page-header"><div><h1>&#9939; On-Chain Registry</h1><p>Agreements registered on blockchain</p></div></div>' +
      '<div class="create-section"><div id="onchain-list"><div class="loading"><div class="spinner"></div> Loading...</div></div></div>'
    );
    loadOnChain();
  }

  async function loadOnChain() {
    try {
      var data = await api('GET', '/api/blockchain/records');
      var list = data.records || [];
      var el = document.getElementById('onchain-list');
      if (!el) return;
      if (list.length === 0) {
        el.innerHTML = '<div class="empty-state"><h3>No on-chain records</h3><p>Register agreements on blockchain from the agreement view</p></div>';
      } else {
        el.innerHTML = sanitize(list.map(function(r) {
          return '<div class="agreement-card"><div class="agreement-icon">&#9939;</div><div class="agreement-info"><h3>' + esc(r.agreementId || '').substring(0,12) + '...</h3><div class="agreement-meta"><span>' + esc(r.chain || 'ethereum') + '</span><span>Tx: ' + esc((r.txHash || '').substring(0,12)) + '...</span><span>' + timeAgo(r.timestamp) + '</span></div></div></div>';
        }).join(''));
      }
    } catch(err) {
      var el = document.getElementById('onchain-list');
      if (el) el.innerHTML = '<div class="empty-state"><h3>Error</h3><p>' + esc(err.message) + '</p></div>';
    }
  }

  window._registerOnChain = async function(id) {
    if (!confirm('Register this agreement on blockchain?')) return;
    genText.textContent = 'Registering on blockchain...';
    genOverlay.style.display = 'flex';
    try {
      var data = await api('POST', '/api/blockchain/register', { agreementId: id });
      genOverlay.style.display = 'none';
      toast('Registered on-chain! Tx: ' + (data.txHash || '').substring(0,12) + '...', 'success');
    } catch(err) { genOverlay.style.display = 'none'; toast('Error: ' + err.message, 'error'); }
  };

  /* ========================================
   * DISPUTE
   * ======================================== */
  window._openDisputeModal = async function(id) {
    var c = document.getElementById('analysis-container');
    if (!c) return;
    c.innerHTML = sanitize(
      '<div class="analysis-result"><h2>&#9888; File Dispute</h2>' +
      '<div class="form-group"><label>Reason</label><textarea class="form-textarea" id="dispute-reason" rows="4" placeholder="Describe the dispute reason..."></textarea></div>' +
      '<div class="form-group"><label>Evidence (optional)</label><textarea class="form-textarea" id="dispute-evidence" rows="3" placeholder="Supporting evidence..."></textarea></div>' +
      '<button class="btn btn-danger" onclick="window._fileDispute(\'' + id + '\')">File Dispute</button></div>'
    );
    c.scrollIntoView({behavior:'smooth'});
  };

  window._fileDispute = async function(id) {
    var reason = document.getElementById('dispute-reason').value.trim();
    if (!reason) { toast('Provide a reason', 'error'); return; }
    try {
      await api('POST', '/api/agreements/' + id + '/dispute', { reason: reason, evidence: document.getElementById('dispute-evidence').value });
      toast('Dispute filed', 'success');
      navigate('view', id);
    } catch(err) { toast('Error: ' + err.message, 'error'); }
  };

  window._viewDispute = async function(id) {
    try {
      var data = await api('GET', '/api/agreements/' + id + '/dispute');
      var c = document.getElementById('analysis-container');
      if (c) {
        c.innerHTML = sanitize(
          '<div class="analysis-result"><h2>&#9888; Dispute Details</h2>' +
          '<div class="detail-row"><span class="detail-label">Status</span><span class="detail-value">' + esc(data.status || '') + '</span></div>' +
          '<div class="detail-row"><span class="detail-label">Reason</span><span class="detail-value">' + esc(data.reason || '') + '</span></div>' +
          '<div class="detail-row"><span class="detail-label">Filed</span><span class="detail-value">' + timeAgo(data.filedAt) + '</span></div>' +
          (data.resolution ? '<div class="detail-row"><span class="detail-label">Resolution</span><span class="detail-value">' + esc(data.resolution) + '</span></div>' : '') +
          '</div>'
        );
        c.scrollIntoView({behavior:'smooth'});
      }
    } catch(err) { toast('Error: ' + err.message, 'error'); }
  };

  window._cancelAgreement = async function(id) {
    if (!confirm('Cancel this agreement?')) return;
    try { await api('POST', '/api/agreements/' + id + '/cancel'); toast('Agreement cancelled', 'success'); navigate('view', id); }
    catch(err) { toast('Error: ' + err.message, 'error'); }
  };

  /* ========================================
   * TEMPLATE MARKETPLACE
   * ======================================== */
  async function renderMarketplace() {
    pageContent.innerHTML = '<div class="loading"><div class="spinner"></div> Loading marketplace...</div>';
    try {
      var data = await api('GET', '/api/marketplace/templates');
      var items = data.templates || data || [];
      pageContent.innerHTML = sanitize(
        '<div class="page-header"><div><h1>&#127979; Template Marketplace</h1><p>Browse and purchase professional templates</p></div></div>' +
        '<div class="search-bar">' +
        '<input class="form-input" id="mp-search" placeholder="Search marketplace..." oninput="window._filterMarketplace()">' +
        '<select class="form-select" id="mp-category" style="width:180px;" onchange="window._filterMarketplace()">' +
        '<option value="">All Categories</option>' +
        categories.map(function(c){ return '<option value="' + esc(c) + '">' + esc(c) + '</option>'; }).join('') +
        '</select></div>' +
        '<div class="marketplace-grid" id="mp-grid">' +
        (items.length === 0 ? '<div class="empty-state"><h3>No templates in marketplace yet</h3></div>' :
        items.map(function(t) {
          return '<div class="marketplace-card">' +
            '<div class="mp-header"><h3>' + esc(t.name || t.title || '') + '</h3><span class="mp-price">' + (t.price === 0 || !t.price ? 'Free' : '$' + t.price) + '</span></div>' +
            '<p style="color:var(--text-muted);font-size:13px;margin:8px 0;">' + esc((t.description || '').substring(0,120)) + '</p>' +
            '<div class="mp-stats"><span class="mp-category">' + esc(t.category || '') + '</span>' +
            '<span class="mp-rating">&#11088; ' + (t.rating || '4.5') + '</span>' +
            '<span>' + (t.downloads || 0) + ' uses</span></div>' +
            '<div class="mp-author">By ' + esc(t.author || 'AgreeMint') + '</div>' +
            '<div style="margin-top:12px;display:flex;gap:8px;">' +
            '<button class="btn btn-sm btn-primary" onclick="window._useTemplate(\'' + esc(t.id || '') + '\')">Use Template</button>' +
            '<button class="btn btn-sm btn-secondary" onclick="window._previewTemplate(\'' + esc(t.id || '') + '\')">Preview</button></div></div>';
        }).join('')) +
        '</div>'
      );
      window._mpItems = items;
    } catch(err) {
      pageContent.innerHTML = '<div class="empty-state"><h3>Error loading marketplace</h3><p>' + esc(err.message) + '</p></div>';
    }
  }

  window._filterMarketplace = function() {
    var q = (document.getElementById('mp-search').value || '').toLowerCase();
    var cat = document.getElementById('mp-category').value;
    var items = (window._mpItems || []).filter(function(t) {
      if (cat && (t.category || '') !== cat) return false;
      if (q && !(t.name || t.title || '').toLowerCase().includes(q) && !(t.description || '').toLowerCase().includes(q)) return false;
      return true;
    });
    document.getElementById('mp-grid').innerHTML = sanitize(
      items.length === 0 ? '<div class="empty-state"><h3>No matching templates</h3></div>' :
      items.map(function(t) {
        return '<div class="marketplace-card">' +
          '<div class="mp-header"><h3>' + esc(t.name || t.title || '') + '</h3><span class="mp-price">' + (t.price === 0 || !t.price ? 'Free' : '$' + t.price) + '</span></div>' +
          '<p style="color:var(--text-muted);font-size:13px;margin:8px 0;">' + esc((t.description || '').substring(0,120)) + '</p>' +
          '<div class="mp-stats"><span class="mp-category">' + esc(t.category || '') + '</span>' +
          '<span class="mp-rating">&#11088; ' + (t.rating || '4.5') + '</span></div>' +
          '<div style="margin-top:12px;"><button class="btn btn-sm btn-primary" onclick="window._useTemplate(\'' + esc(t.id || '') + '\')">Use</button></div></div>';
      }).join('')
    );
  };

  window._useTemplate = function(templateId) {
    navigate('create', templateId);
  };

  window._previewTemplate = async function(templateId) {
    try {
      var data = await api('GET', '/api/marketplace/templates/' + templateId);
      var t = data.template || data;
      var modal = document.createElement('div');
      modal.className = 'modal-overlay';
      modal.onclick = function(e){ if(e.target === modal) modal.remove(); };
      modal.innerHTML = '<div class="modal" style="max-width:700px;"><div class="modal-header"><h2>' + esc(t.name || t.title || '') + '</h2><button class="modal-close" onclick="this.closest(\'.modal-overlay\').remove()">x</button></div>' +
        '<div class="modal-body"><p>' + esc(t.description || '') + '</p>' +
        '<div style="margin:16px 0;"><span class="mp-category">' + esc(t.category || '') + '</span> <span class="mp-price" style="margin-left:8px;">' + (t.price === 0 || !t.price ? 'Free' : '$' + t.price) + '</span></div>' +
        '<div class="content-body" style="max-height:400px;overflow-y:auto;">' + sanitize(typeof marked !== 'undefined' ? marked.parse(t.content || t.template || 'No preview available') : esc(t.content || t.template || 'No preview available')) + '</div>' +
        '<button class="btn btn-primary" style="margin-top:16px;" onclick="window._useTemplate(\'' + esc(t.id || '') + '\');this.closest(\'.modal-overlay\').remove();">Use This Template</button></div></div>';
      document.body.appendChild(modal);
    } catch(err) { toast('Error: ' + err.message, 'error'); }
  };

  /* ========================================
   * LEGAL MARKETPLACE
   * ======================================== */
  async function renderLegalMarketplace() {
    pageContent.innerHTML = '<div class="loading"><div class="spinner"></div> Loading...</div>';
    try {
      var data = await api('GET', '/api/legal-marketplace/professionals');
      var pros = data.professionals || data || [];
      pageContent.innerHTML = sanitize(
        '<div class="page-header"><div><h1>&#9878; Legal Professionals</h1><p>Connect with verified legal experts</p></div></div>' +
        '<div class="tab-bar"><button class="tab-btn active" onclick="window._legalTab(\'pros\',this)">Professionals</button><button class="tab-btn" onclick="window._legalTab(\'requests\',this)">My Requests</button></div>' +
        '<div id="legal-content">' +
        '<div class="search-bar"><input class="form-input" id="legal-search" placeholder="Search by specialty..." oninput="window._filterLegal()"></div>' +
        '<div class="marketplace-grid" id="legal-grid">' +
        (pros.length === 0 ? '<div class="empty-state"><h3>No professionals listed yet</h3><p>Check back soon for verified legal experts</p></div>' :
        pros.map(function(p) {
          return '<div class="professional-card">' +
            '<div class="prof-avatar">' + (p.name || '?').charAt(0).toUpperCase() + '</div>' +
            '<div class="prof-info"><div class="prof-name">' + esc(p.name || '') + '</div>' +
            '<div class="prof-specialization">' + esc(p.specialization || p.specialty || '') + '</div>' +
            '<div class="prof-meta"><span>&#11088; ' + (p.rating || '4.5') + '</span><span>' + (p.reviews || 0) + ' reviews</span>' +
            '<span>' + (p.hourlyRate ? '$' + p.hourlyRate + '/hr' : 'Contact for pricing') + '</span></div></div>' +
            '<button class="btn btn-sm btn-primary" onclick="window._contactPro(\'' + esc(p.id || '') + '\')">Contact</button></div>';
        }).join('')) +
        '</div></div>'
      );
      window._legalPros = pros;
    } catch(err) {
      pageContent.innerHTML = '<div class="empty-state"><h3>Error</h3><p>' + esc(err.message) + '</p></div>';
    }
  }

  window._legalTab = function(tab, btn) {
    document.querySelectorAll('.tab-btn').forEach(function(b){ b.classList.remove('active'); });
    btn.classList.add('active');
    if (tab === 'requests') {
      loadMyRequests();
    } else {
      renderLegalMarketplace();
    }
  };

  window._filterLegal = function() {
    var q = (document.getElementById('legal-search').value || '').toLowerCase();
    var filtered = (window._legalPros || []).filter(function(p) {
      return !q || (p.name || '').toLowerCase().includes(q) || (p.specialization || p.specialty || '').toLowerCase().includes(q);
    });
    document.getElementById('legal-grid').innerHTML = sanitize(
      filtered.length === 0 ? '<div class="empty-state"><h3>No matching professionals</h3></div>' :
      filtered.map(function(p) {
        return '<div class="professional-card"><div class="prof-avatar">' + (p.name || '?').charAt(0).toUpperCase() + '</div>' +
          '<div class="prof-info"><div class="prof-name">' + esc(p.name) + '</div><div class="prof-specialization">' + esc(p.specialization || p.specialty || '') + '</div></div>' +
          '<button class="btn btn-sm btn-primary" onclick="window._contactPro(\'' + esc(p.id || '') + '\')">Contact</button></div>';
      }).join('')
    );
  };

  window._contactPro = async function(proId) {
    var el = document.getElementById('legal-content');
    if (!el) return;
    el.innerHTML = sanitize(
      '<div class="create-section"><h2>&#128232; Service Request</h2>' +
      '<div class="form-group"><label>Service Type</label><select class="form-select" id="sr-type"><option value="review">Agreement Review</option><option value="draft">Custom Drafting</option><option value="consultation">Legal Consultation</option><option value="negotiation">Negotiation Support</option></select></div>' +
      '<div class="form-group"><label>Description</label><textarea class="form-textarea" id="sr-desc" rows="4" placeholder="Describe what you need help with..."></textarea></div>' +
      '<div class="form-group"><label>Budget (optional)</label><input class="form-input" id="sr-budget" type="number" placeholder="USD"></div>' +
      '<div style="display:flex;gap:12px;"><button class="btn btn-primary" onclick="window._submitRequest(\'' + proId + '\')">Submit Request</button><button class="btn btn-secondary" onclick="window._nav(\'legal-marketplace\')">Cancel</button></div></div>'
    );
  };

  window._submitRequest = async function(proId) {
    var type = document.getElementById('sr-type').value;
    var desc = document.getElementById('sr-desc').value.trim();
    if (!desc) { toast('Describe your request', 'error'); return; }
    try {
      await api('POST', '/api/legal-marketplace/requests', { professionalId: proId, type: type, description: desc, budget: document.getElementById('sr-budget').value || null });
      toast('Request submitted!', 'success');
      navigate('legal-marketplace');
    } catch(err) { toast('Error: ' + err.message, 'error'); }
  };

  async function loadMyRequests() {
    var el = document.getElementById('legal-content');
    if (!el) return;
    el.innerHTML = '<div class="loading"><div class="spinner"></div> Loading...</div>';
    try {
      var data = await api('GET', '/api/legal-marketplace/requests');
      var reqs = data.requests || data || [];
      el.innerHTML = sanitize(
        '<div class="agreements-list">' +
        (reqs.length === 0 ? '<div class="empty-state"><h3>No service requests yet</h3></div>' :
        reqs.map(function(r) {
          return '<div class="agreement-card"><div class="agreement-icon">&#9878;</div><div class="agreement-info"><h3>' + esc(r.type || '') + '</h3><div class="agreement-meta"><span>' + esc(r.status || '') + '</span><span>' + timeAgo(r.createdAt) + '</span></div></div><span class="status-badge status-' + (r.status === 'completed' ? 'signed' : 'pending') + '">' + (r.status || 'pending').toUpperCase() + '</span></div>';
        }).join('')) +
        '</div>'
      );
    } catch(err) { el.innerHTML = '<div class="empty-state"><h3>Error</h3><p>' + esc(err.message) + '</p></div>'; }
  }

  /* ========================================
   * WALLET
   * ======================================== */
  async function renderWallet() {
    pageContent.innerHTML = '<div class="loading"><div class="spinner"></div> Loading wallet...</div>';
    try {
      var data = await api('GET', '/api/wallet');
      var wallets = data.wallets || [];
      var chains = [
        { name: 'Ethereum', symbol: 'ETH', icon: '&#9830;' },
        { name: 'Polygon', symbol: 'MATIC', icon: '&#9830;' },
        { name: 'Solana', symbol: 'SOL', icon: '&#9788;' },
        { name: 'Bitcoin', symbol: 'BTC', icon: '&#8383;' },
        { name: 'Avalanche', symbol: 'AVAX', icon: '&#9650;' }
      ];
      pageContent.innerHTML = sanitize(
        '<div class="page-header"><div><h1>&#128091; Wallet</h1><p>Manage your connected wallets</p></div>' +
        '<div class="page-actions"><button class="btn btn-primary" onclick="window._connectWallet()">&#128279; Connect Wallet</button></div></div>' +
        '<div class="create-section"><h2>Connected Wallets</h2>' +
        (wallets.length === 0 ? '<div class="empty-state"><h3>No wallets connected</h3><p>Connect a wallet to use escrow and on-chain features</p></div>' :
        '<div class="marketplace-grid">' + wallets.map(function(w) {
          return '<div class="wallet-card"><div style="display:flex;align-items:center;gap:12px;"><div style="width:40px;height:40px;border-radius:50%;background:var(--accent);display:flex;align-items:center;justify-content:center;font-size:20px;">&#128091;</div><div><div style="font-weight:600;">' + esc(w.chain || 'Ethereum') + '</div><div style="font-size:12px;color:var(--text-muted);word-break:break-all;">' + esc(w.address || '') + '</div></div></div></div>';
        }).join('') + '</div>') +
        '</div>' +
        '<div class="create-section"><h2>Supported Chains</h2><div class="marketplace-grid">' +
        chains.map(function(c) {
          return '<div class="wallet-card"><div style="display:flex;align-items:center;gap:12px;"><span style="font-size:24px;">' + c.icon + '</span><div><div style="font-weight:600;">' + c.name + '</div><div style="font-size:12px;color:var(--text-muted);">' + c.symbol + '</div></div></div></div>';
        }).join('') +
        '</div></div>'
      );
    } catch(err) {
      pageContent.innerHTML = '<div class="empty-state"><h3>Error</h3><p>' + esc(err.message) + '</p></div>';
    }
  }

  window._connectWallet = async function() {
    if (typeof window.ethereum !== 'undefined') {
      try {
        var accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        if (accounts && accounts[0]) {
          await api('POST', '/api/wallet/connect', { address: accounts[0], chain: 'ethereum' });
          toast('Wallet connected: ' + accounts[0].substring(0,8) + '...', 'success');
          renderWallet();
        }
      } catch(err) { toast('Error: ' + err.message, 'error'); }
    } else {
      toast('Please install MetaMask or another Web3 wallet', 'error');
    }
  };

  /* ========================================
   * ANALYTICS
   * ======================================== */
  async function renderAnalytics() {
    pageContent.innerHTML = '<div class="loading"><div class="spinner"></div> Loading analytics...</div>';
    try {
      var results = await Promise.all([api('GET', '/api/stats'), api('GET', '/api/agreements')]);
      var stats = results[0];
      var agrs = results[1];

      // Compute chart data
      var statusCounts = { draft: 0, pending: 0, signed: 0, disputed: 0, cancelled: 0 };
      var typeCounts = {};
      var monthlyCounts = {};
      agrs.forEach(function(a) {
        statusCounts[a.status] = (statusCounts[a.status] || 0) + 1;
        typeCounts[a.type || 'Other'] = (typeCounts[a.type || 'Other'] || 0) + 1;
        if (a.createdAt) {
          var m = new Date(a.createdAt).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
          monthlyCounts[m] = (monthlyCounts[m] || 0) + 1;
        }
      });

      pageContent.innerHTML = sanitize(
        '<div class="page-header"><div><h1>&#128200; Analytics</h1><p>Agreement insights and trends</p></div></div>' +
        '<div class="stats-grid">' +
        '<div class="stat-card accent"><div class="stat-label">Total</div><div class="stat-value">' + agrs.length + '</div></div>' +
        '<div class="stat-card green"><div class="stat-label">Signed</div><div class="stat-value">' + (statusCounts.signed || 0) + '</div></div>' +
        '<div class="stat-card yellow"><div class="stat-label">Pending</div><div class="stat-value">' + (statusCounts.pending || 0) + '</div></div>' +
        '<div class="stat-card blue"><div class="stat-label">Drafts</div><div class="stat-value">' + (statusCounts.draft || 0) + '</div></div>' +
        '</div>' +
        '<div class="analytics-grid">' +
        '<div class="chart-card"><h3>Agreement Status</h3><canvas id="chart-status" width="300" height="300"></canvas></div>' +
        '<div class="chart-card"><h3>Monthly Activity</h3><canvas id="chart-monthly" width="400" height="300"></canvas></div>' +
        '<div class="chart-card"><h3>Agreement Types</h3><canvas id="chart-types" width="400" height="300"></canvas></div>' +
        '<div class="chart-card"><h3>Activity Summary</h3>' +
        '<div style="padding:16px;">' +
        '<div class="detail-row"><span class="detail-label">Completion Rate</span><span class="detail-value">' + (agrs.length > 0 ? Math.round((statusCounts.signed / agrs.length) * 100) : 0) + '%</span></div>' +
        '<div class="detail-row"><span class="detail-label">Avg. per Month</span><span class="detail-value">' + (Object.keys(monthlyCounts).length > 0 ? Math.round(agrs.length / Object.keys(monthlyCounts).length) : 0) + '</span></div>' +
        '<div class="detail-row"><span class="detail-label">Dispute Rate</span><span class="detail-value">' + (agrs.length > 0 ? Math.round((statusCounts.disputed / agrs.length) * 100) : 0) + '%</span></div>' +
        '<div class="detail-row"><span class="detail-label">Most Common Type</span><span class="detail-value">' + esc(Object.keys(typeCounts).sort(function(a,b){ return typeCounts[b]-typeCounts[a]; })[0] || 'N/A') + '</span></div>' +
        '</div></div></div>'
      );

      // Draw charts with Chart.js
      if (typeof Chart !== 'undefined') {
        // Status doughnut
        new Chart(document.getElementById('chart-status'), {
          type: 'doughnut',
          data: {
            labels: ['Draft', 'Pending', 'Signed', 'Disputed', 'Cancelled'],
            datasets: [{
              data: [statusCounts.draft, statusCounts.pending, statusCounts.signed, statusCounts.disputed, statusCounts.cancelled],
              backgroundColor: ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#6b7280']
            }]
          },
          options: { responsive: true, plugins: { legend: { position: 'bottom', labels: { color: '#94a3b8' } } } }
        });

        // Monthly bar
        var monthLabels = Object.keys(monthlyCounts);
        new Chart(document.getElementById('chart-monthly'), {
          type: 'bar',
          data: {
            labels: monthLabels,
            datasets: [{ label: 'Agreements', data: monthLabels.map(function(m){ return monthlyCounts[m]; }), backgroundColor: '#8b5cf6' }]
          },
          options: { responsive: true, scales: { y: { beginAtZero: true, ticks: { color: '#94a3b8' } }, x: { ticks: { color: '#94a3b8' } } }, plugins: { legend: { labels: { color: '#94a3b8' } } } }
        });

        // Types horizontal bar
        var typeLabels = Object.keys(typeCounts).slice(0, 10);
        new Chart(document.getElementById('chart-types'), {
          type: 'bar',
          data: {
            labels: typeLabels,
            datasets: [{ label: 'Count', data: typeLabels.map(function(t){ return typeCounts[t]; }), backgroundColor: '#06b6d4' }]
          },
          options: { indexAxis: 'y', responsive: true, scales: { x: { beginAtZero: true, ticks: { color: '#94a3b8' } }, y: { ticks: { color: '#94a3b8', font: { size: 11 } } } }, plugins: { legend: { labels: { color: '#94a3b8' } } } }
        });
      }
    } catch(err) {
      pageContent.innerHTML = '<div class="empty-state"><h3>Error</h3><p>' + esc(err.message) + '</p></div>';
    }
  }

  /* ========================================
   * PROFILE & SETTINGS
   * ======================================== */
  async function renderProfile() {
    pageContent.innerHTML = '<div class="loading"><div class="spinner"></div> Loading profile...</div>';
    try {
      var data = await api('GET', '/api/user/profile');
      var user = data.user || data || {};
      pageContent.innerHTML = sanitize(
        '<div class="page-header"><div><h1>&#128100; Profile & Settings</h1><p>Manage your account</p></div></div>' +
        '<div class="profile-grid">' +
        '<div class="profile-section"><h2>Account Information</h2>' +
        '<div class="detail-row"><span class="detail-label">Name</span><span class="detail-value">' + esc(user.name || userName || '') + '</span></div>' +
        '<div class="detail-row"><span class="detail-label">Email</span><span class="detail-value">' + esc(user.email || userEmail || '') + '</span></div>' +
        '<div class="detail-row"><span class="detail-label">Company</span><span class="detail-value">' + esc(user.company || '') + '</span></div>' +
        '<div class="detail-row"><span class="detail-label">Tier</span><span class="detail-value"><span class="tier-badge tier-' + esc(user.tier || userTier) + '">' + esc(user.tier || userTier).toUpperCase() + '</span></span></div>' +
        '<div class="detail-row"><span class="detail-label">Member Since</span><span class="detail-value">' + (user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A') + '</span></div>' +
        '</div>' +
        '<div class="profile-section"><h2>API Key</h2>' +
        '<div class="detail-row"><span class="detail-label">Your API Key</span><span class="detail-value" style="font-family:monospace;font-size:12px;word-break:break-all;" id="api-key-display">' + esc(user.apiKey || 'Not generated') + '</span></div>' +
        '<div style="display:flex;gap:12px;margin-top:12px;">' +
        '<button class="btn btn-sm btn-secondary" onclick="window._copyApiKey()">&#128203; Copy</button>' +
        '<button class="btn btn-sm btn-secondary" onclick="window._regenApiKey()">&#128260; Regenerate</button></div></div>' +
        '<div class="profile-section"><h2>Usage Stats</h2>' +
        '<div class="detail-row"><span class="detail-label">Agreements Created</span><span class="detail-value">' + (user.agreementCount || 0) + '</span></div>' +
        '<div class="detail-row"><span class="detail-label">AI Analyses</span><span class="detail-value">' + (user.analysisCount || 0) + '</span></div>' +
        '<div class="detail-row"><span class="detail-label">Templates Used</span><span class="detail-value">' + (user.templateCount || 0) + '</span></div></div>' +
        '<div class="profile-section"><h2>Preferences</h2>' +
        '<div class="form-group"><label>Default Jurisdiction</label><select class="form-select" id="pref-jurisdiction" onchange="window._savePreference(\'jurisdiction\',this.value)">' +
        '<option value="">Select...</option>' + jurisdictions.map(function(j){ return '<option value="' + esc(j.id) + '"' + (user.defaultJurisdiction === j.id ? ' selected' : '') + '>' + esc(j.name) + '</option>'; }).join('') +
        '</select></div>' +
        '<div class="form-group"><label>Language</label><select class="form-select" id="pref-language" onchange="window._savePreference(\'language\',this.value)">' +
        '<option value="en">English</option><option value="es">Spanish</option><option value="fr">French</option><option value="de">German</option><option value="ar">Arabic</option><option value="zh">Chinese</option><option value="ja">Japanese</option>' +
        '</select></div></div></div>'
      );
    } catch(err) {
      pageContent.innerHTML = '<div class="empty-state"><h3>Error</h3><p>' + esc(err.message) + '</p></div>';
    }
  }

  window._copyApiKey = function() {
    var key = document.getElementById('api-key-display');
    if (key && navigator.clipboard) {
      navigator.clipboard.writeText(key.textContent);
      toast('API key copied', 'success');
    }
  };

  window._regenApiKey = async function() {
    if (!confirm('Regenerate your API key? The old key will stop working.')) return;
    try {
      var data = await api('POST', '/api/user/api-key/regenerate');
      document.getElementById('api-key-display').textContent = data.apiKey || 'Error';
      toast('API key regenerated', 'success');
    } catch(err) { toast('Error: ' + err.message, 'error'); }
  };

  window._savePreference = async function(key, value) {
    try {
      var body = {};
      body[key] = value;
      await api('PUT', '/api/user/preferences', body);
      toast('Preference saved', 'success');
    } catch(err) { toast('Error: ' + err.message, 'error'); }
  };

  /* ========================================
   * AUTO LOGIN / OAUTH CALLBACK
   * ======================================== */
  // Handle OAuth callback: ?token=xxx&email=xxx&name=xxx&tier=xxx&userId=xxx
  var urlParams = new URLSearchParams(window.location.search);
  var oauthToken = urlParams.get('token');
  if (oauthToken) {
    authToken = oauthToken;
    userEmail = urlParams.get('email') || '';
    userName = urlParams.get('name') || userEmail;
    userTier = urlParams.get('tier') || 'free';
    userId = urlParams.get('userId') || '';
    localStorage.setItem('authToken', authToken);
    localStorage.setItem('userEmail', userEmail);
    localStorage.setItem('userName', userName);
    localStorage.setItem('userTier', userTier);
    localStorage.setItem('userId', userId);
    // Clean URL
    window.history.replaceState({}, document.title, '/');
    toast('Signed in with ' + (urlParams.get('provider') || 'social account'), 'success');
    showApp();
  } else if (urlParams.get('auth_error')) {
    loginError.textContent = decodeURIComponent(urlParams.get('auth_error'));
    loginError.style.display = 'block';
    window.history.replaceState({}, document.title, '/');
  } else if (authToken) {
    showApp();
  }

})();
