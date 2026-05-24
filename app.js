/**
 * NexusCRM — app.js
 * All client-side logic: state, rendering, CRUD, filtering, export
 *
 * Architecture (single-file, no framework):
 *   leads[]  → in-memory data store (swap for fetch() calls to add a backend)
 *   render() → full re-render on every state change
 *   Modals   → show/hide via display property + animation classes
 */

'use strict';

/* ══════════════════════════════════════════════
   CONSTANTS
══════════════════════════════════════════════ */
const SOURCES = [
  'Contact Form', 'LinkedIn', 'Referral',
  'Cold Email', 'Website Chat', 'Advertisement', 'Event'
];

const AVATAR_COLORS = [
  '#6c63ff', '#f43f5e', '#10b981',
  '#f59e0b', '#3b82f6', '#14b8a6'
];

const SORT_MODES = ['Newest', 'Oldest', 'Highest Score', 'Name A–Z'];

/* ══════════════════════════════════════════════
   STATE
══════════════════════════════════════════════ */
let leads    = [];   // Array of lead objects
let filter   = 'all'; // 'all' | 'new' | 'contacted' | 'converted' | 'lost'
let sortMode = 0;    // index into SORT_MODES
let editId   = null; // id of lead currently being edited (null = new lead)
let toastTimer;      // reference to auto-dismiss timeout

/* ══════════════════════════════════════════════
   HELPERS
══════════════════════════════════════════════ */

/** Generate a short unique ID */
function uid() {
  return Math.random().toString(36).slice(2, 10);
}

/** Get 1-2 initials from a full name */
function initials(name) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

/** Pick a stable avatar color from a name */
function avatarColor(name) {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
}

/** Format an ISO date string to readable short form */
function fmt(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: '2-digit'
  });
}

/**
 * Compute a lead score (5–100) based on profile completeness + status.
 * In a real app this would come from the backend / ML model.
 */
function score(lead) {
  let s = 40;
  if (lead.company) s += 15;
  if (lead.phone)   s += 10;
  if (lead.status === 'contacted') s += 15;
  if (lead.status === 'converted') s += 35;
  if (lead.status === 'lost')      s -= 10;
  s += Math.floor(lead._rand * 20); // small random spread per lead
  return Math.min(100, Math.max(5, s));
}

/** Map score to a traffic-light color */
function scoreColor(s) {
  return s >= 80 ? '#10b981' : s >= 50 ? '#f59e0b' : '#f43f5e';
}

/* ══════════════════════════════════════════════
   SEED DATA  (replace with API call in production)
══════════════════════════════════════════════ */
function seedLeads() {
  const rows = [
    ['Arjun Mehta',   'arjun@techinno.in',    'TechInno Pvt',    '+91 9876543210'],
    ['Priya Kapoor',  'priya.k@brandly.com',   'Brandly Studio',  '+91 9765432109'],
    ['Rohan Desai',   'rohan@growthco.in',     'GrowthCo',        '+91 9654321098'],
    ['Sneha Iyer',    'sneha.iyer@nexasoft.io', 'NexaSoft',       '+91 9543210987'],
    ['Vikram Nair',   'vikram@startupx.in',    'StartupX',        '+91 9432109876'],
    ['Kavya Reddy',   'kavya@marketpro.in',    'MarketPro',       '+91 9321098765'],
    ['Aditya Joshi',  'adi.j@cloudbase.io',    'CloudBase',       '+91 9210987654'],
    ['Meera Pillai',  'meera@designwave.in',   'DesignWave',      '+91 9109876543'],
  ];

  const statuses = ['new', 'new', 'contacted', 'contacted', 'converted', 'lost'];

  leads = rows.map(([name, email, company, phone], i) => ({
    id:       uid(),
    name,
    email,
    company,
    phone,
    source:   SOURCES[i % SOURCES.length],
    status:   statuses[i % statuses.length],
    notes: [{
      id:   uid(),
      text: 'Initial contact established via website form.',
      date: new Date(Date.now() - 86400000 * 3).toISOString()
    }],
    created:  new Date(Date.now() - 86400000 * (8 - i)).toISOString(),
    activity: [{
      a: 'Lead created',
      t: new Date(Date.now() - 86400000 * (8 - i)).toISOString()
    }],
    _rand: Math.random() // frozen random spread used in score()
  }));
}

/* ══════════════════════════════════════════════
   RENDER — STATS
══════════════════════════════════════════════ */
function renderStats() {
  const total     = leads.length;
  const converted = leads.filter(l => l.status === 'converted').length;
  const newLeads  = leads.filter(l => l.status === 'new').length;
  const rate      = total ? Math.round(converted / total * 100) : 0;

  document.getElementById('total-badge').textContent = total;
  document.getElementById('stats-grid').innerHTML = `
    <div class="stat-card purple">
      <div class="stat-top">
        <div class="stat-icon purple">📋</div>
        <span class="stat-delta delta-up">↑ 12%</span>
      </div>
      <div class="stat-num">${total}</div>
      <div class="stat-label">Total Leads</div>
    </div>

    <div class="stat-card green">
      <div class="stat-top">
        <div class="stat-icon green">✅</div>
        <span class="stat-delta delta-up">↑ 8%</span>
      </div>
      <div class="stat-num">${converted}</div>
      <div class="stat-label">Converted</div>
    </div>

    <div class="stat-card gold">
      <div class="stat-top">
        <div class="stat-icon gold">🎯</div>
        <span class="stat-delta delta-up">↑ 3%</span>
      </div>
      <div class="stat-num">${rate}%</div>
      <div class="stat-label">Conversion Rate</div>
    </div>

    <div class="stat-card coral">
      <div class="stat-top">
        <div class="stat-icon coral">🔵</div>
        <span class="stat-delta delta-up">+${newLeads}</span>
      </div>
      <div class="stat-num">${newLeads}</div>
      <div class="stat-label">New This Week</div>
    </div>
  `;
}

/* ══════════════════════════════════════════════
   RENDER — LEADS TABLE
══════════════════════════════════════════════ */

/** Return filtered + sorted subset of leads */
function getFiltered() {
  // Status filter
  let arr = filter === 'all' ? [...leads] : leads.filter(l => l.status === filter);

  // Search filter
  const q = document.getElementById('search-input').value.toLowerCase().trim();
  if (q) {
    arr = arr.filter(l =>
      l.name.toLowerCase().includes(q) ||
      l.email.toLowerCase().includes(q) ||
      (l.company || '').toLowerCase().includes(q)
    );
  }

  // Sort
  if (sortMode === 0) arr.sort((a, b) => new Date(b.created) - new Date(a.created));
  if (sortMode === 1) arr.sort((a, b) => new Date(a.created) - new Date(b.created));
  if (sortMode === 2) arr.sort((a, b) => score(b) - score(a));
  if (sortMode === 3) arr.sort((a, b) => a.name.localeCompare(b.name));

  return arr;
}

function renderLeads() {
  const arr  = getFiltered();
  const body = document.getElementById('leads-body');

  if (!arr.length) {
    body.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🔍</div>
        <div class="empty-text">No leads found</div>
        <div class="empty-sub">Try adjusting your filters or add a new lead</div>
      </div>`;
    return;
  }

  body.innerHTML = arr.map(l => {
    const s   = score(l);
    const sc  = scoreColor(s);
    const ac  = avatarColor(l.name);
    const ini = initials(l.name);
    const cap = str => str.charAt(0).toUpperCase() + str.slice(1);

    return `
      <div class="lead-row" onclick="openDetail('${l.id}')">

        <!-- Lead name + avatar -->
        <div class="lead-name">
          <div class="lead-avatar" style="background:${ac}">${ini}</div>
          <div>
            <div class="lead-name-text">${escHtml(l.name)}</div>
            <div class="lead-email">${escHtml(l.email)}</div>
          </div>
        </div>

        <!-- Company + phone -->
        <div class="lead-company">
          ${escHtml(l.company || '—')}
          <br>
          <span style="font-size:11px;color:var(--text3)">${escHtml(l.phone || '')}</span>
        </div>

        <!-- Source -->
        <div><span class="source-tag">${escHtml(l.source)}</span></div>

        <!-- Status badge -->
        <div><span class="badge badge-${l.status}">${cap(l.status)}</span></div>

        <!-- Score bar -->
        <div class="score-bar">
          <div class="score-track">
            <div class="score-fill" style="width:${s}%;background:${sc}"></div>
          </div>
          <span class="score-num">${s}</span>
        </div>

        <!-- Date added -->
        <div class="date-cell">${fmt(l.created)}</div>

        <!-- Action buttons (stop propagation so row click doesn't fire) -->
        <div class="action-btns" onclick="event.stopPropagation()">
          <div class="icon-btn" onclick="openEdit('${l.id}')" title="Edit">✏️</div>
          <div class="icon-btn danger" onclick="deleteLead('${l.id}')" title="Delete">🗑</div>
        </div>
      </div>`;
  }).join('');
}

/** Full re-render */
function render() {
  renderStats();
  renderLeads();
}

/* ══════════════════════════════════════════════
   FILTER & SORT CONTROLS
══════════════════════════════════════════════ */
function setFilter(f, el) {
  filter = f;
  document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
  if (el) el.classList.add('active');
  renderLeads();
}

function applyFilters() {
  renderLeads(); // called on search input
}

function cycleSort() {
  sortMode = (sortMode + 1) % SORT_MODES.length;
  document.getElementById('sort-label').textContent = SORT_MODES[sortMode];
  renderLeads();
}

/* ══════════════════════════════════════════════
   ADD / EDIT MODAL
══════════════════════════════════════════════ */
function openAddModal() {
  editId = null;
  document.getElementById('modal-title').textContent = 'Add New Lead';
  document.getElementById('modal-sub').textContent   = 'Fill in the lead details below';

  // Clear all form fields
  ['name', 'company', 'email', 'phone', 'note'].forEach(k => {
    document.getElementById('f-' + k).value = '';
  });
  document.getElementById('f-source').value = 'Contact Form';
  document.getElementById('f-status').value = 'new';

  document.getElementById('form-modal').style.display = 'flex';
}

function openEdit(id) {
  const lead = leads.find(l => l.id === id);
  if (!lead) return;

  editId = id;
  document.getElementById('modal-title').textContent = 'Edit Lead';
  document.getElementById('modal-sub').textContent   = 'Update the lead information';

  document.getElementById('f-name').value    = lead.name;
  document.getElementById('f-company').value = lead.company || '';
  document.getElementById('f-email').value   = lead.email;
  document.getElementById('f-phone').value   = lead.phone  || '';
  document.getElementById('f-source').value  = lead.source;
  document.getElementById('f-status').value  = lead.status;
  document.getElementById('f-note').value    = ''; // new note field only

  document.getElementById('form-modal').style.display = 'flex';
}

function saveLead() {
  const name  = document.getElementById('f-name').value.trim();
  const email = document.getElementById('f-email').value.trim();

  if (!name || !email) {
    showToast('⚠️', 'Name and Email are required.');
    return;
  }

  const note    = document.getElementById('f-note').value.trim();
  const company = document.getElementById('f-company').value.trim();
  const phone   = document.getElementById('f-phone').value.trim();
  const source  = document.getElementById('f-source').value;
  const status  = document.getElementById('f-status').value;

  if (editId) {
    // ── UPDATE existing lead ──
    const lead = leads.find(l => l.id === editId);
    if (!lead) return;

    const prevStatus = lead.status;
    Object.assign(lead, { name, company, email, phone, source, status });

    if (note) {
      lead.notes.unshift({ id: uid(), text: note, date: new Date().toISOString() });
    }
    if (prevStatus !== status) {
      lead.activity.unshift({ a: `Status changed to ${status}`, t: new Date().toISOString() });
    }
    showToast('✅', 'Lead updated successfully!');

  } else {
    // ── CREATE new lead ──
    const newLead = {
      id:       uid(),
      name, email, company, phone, source, status,
      notes:    note ? [{ id: uid(), text: note, date: new Date().toISOString() }] : [],
      created:  new Date().toISOString(),
      activity: [{ a: 'Lead created', t: new Date().toISOString() }],
      _rand:    Math.random()
    };
    leads.unshift(newLead);
    showToast('🎉', 'New lead added!');
  }

  closeModal('form-modal');
  render();
}

/* ══════════════════════════════════════════════
   DELETE
══════════════════════════════════════════════ */
function deleteLead(id) {
  if (!confirm('Delete this lead? This cannot be undone.')) return;
  leads = leads.filter(l => l.id !== id);
  render();
  showToast('🗑', 'Lead deleted.');
}

/* ══════════════════════════════════════════════
   DETAIL MODAL
══════════════════════════════════════════════ */
function openDetail(id) {
  const lead = leads.find(l => l.id === id);
  if (!lead) return;

  const s   = score(lead);
  const sc  = scoreColor(s);
  const ac  = avatarColor(lead.name);
  const ini = initials(lead.name);
  const cap = str => str.charAt(0).toUpperCase() + str.slice(1);

  const statusOpts = ['new', 'contacted', 'converted', 'lost'].map(st => `
    <div class="status-opt ${st}${lead.status === st ? ' sel' : ''}"
         onclick="changeStatus('${lead.id}','${st}',this)">
      ${cap(st)}
    </div>`).join('');

  const notesList = lead.notes.length
    ? lead.notes.map(n => `
        <div class="note-item">
          <div class="note-date">${fmt(n.date)}</div>
          <div class="note-text">${escHtml(n.text)}</div>
        </div>`).join('')
    : '<div style="color:var(--text3);font-size:13px;padding:10px 0">No notes yet.</div>';

  const activityList = lead.activity.slice(0, 8).map(a => `
    <div class="timeline-item">
      <div class="timeline-dot"></div>
      <div>
        <div class="timeline-text">${escHtml(a.a)}</div>
        <div class="timeline-time">${fmt(a.t)}</div>
      </div>
    </div>`).join('');

  document.getElementById('detail-content').innerHTML = `
    <!-- Header -->
    <div class="modal-head" style="border-bottom:1px solid var(--border);padding-bottom:20px;margin-bottom:0">
      <div style="display:flex;align-items:center;gap:14px">
        <div class="lead-avatar"
             style="background:${ac};width:48px;height:48px;font-size:16px;border-radius:14px">
          ${ini}
        </div>
        <div>
          <div class="modal-title">${escHtml(lead.name)}</div>
          <div class="modal-sub">${escHtml(lead.email)} · ${escHtml(lead.company || '—')}</div>
        </div>
      </div>
      <button class="close-btn" onclick="closeModal('detail-modal')">✕</button>
    </div>

    <div class="modal-body">
      <!-- Status selector -->
      <div class="section-label">Update Status</div>
      <div class="status-select-row">${statusOpts}</div>

      <!-- Detail fields -->
      <div class="detail-grid">
        <div class="detail-item">
          <div class="detail-label">📞 Phone</div>
          <div class="detail-value">${escHtml(lead.phone || '—')}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">📡 Source</div>
          <div class="detail-value">${escHtml(lead.source)}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">📅 Added</div>
          <div class="detail-value">${fmt(lead.created)}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">💯 Score</div>
          <div class="detail-value" style="color:${sc}">${s} / 100</div>
        </div>
      </div>

      <!-- Notes -->
      <div class="section-label">Notes & Follow-ups</div>
      <div class="notes-list">${notesList}</div>

      <div style="display:flex;gap:8px;margin-bottom:20px">
        <input class="form-input" style="flex:1"
               id="note-inp-${lead.id}"
               placeholder="Add a note or follow-up…"
               onkeydown="if(event.key==='Enter') addNote('${lead.id}')"/>
        <button class="btn btn-primary" onclick="addNote('${lead.id}')">Add</button>
      </div>

      <!-- Activity timeline -->
      <div class="section-label">Activity</div>
      <div class="activity-timeline">${activityList}</div>
    </div>

    <!-- Footer -->
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeModal('detail-modal')">Close</button>
      <button class="btn btn-primary"
              onclick="closeModal('detail-modal'); openEdit('${lead.id}')">
        ✏️ Edit Lead
      </button>
    </div>
  `;

  document.getElementById('detail-modal').style.display = 'flex';
}

/* ── Change status from inside the detail modal ── */
function changeStatus(id, newStatus, el) {
  const lead = leads.find(l => l.id === id);
  if (!lead || lead.status === newStatus) return;

  lead.status = newStatus;
  lead.activity.unshift({ a: `Status changed to ${newStatus}`, t: new Date().toISOString() });

  // Update selected chip visually
  el.closest('.status-select-row')
    .querySelectorAll('.status-opt')
    .forEach(e => e.classList.remove('sel'));
  el.classList.add('sel');

  render();
  showToast('✅', `Status → ${newStatus}`);
}

/* ── Add note from inside the detail modal ── */
function addNote(id) {
  const lead = leads.find(l => l.id === id);
  if (!lead) return;

  const inp  = document.getElementById('note-inp-' + id);
  const text = inp.value.trim();
  if (!text) { showToast('⚠️', 'Please type a note first.'); return; }

  lead.notes.unshift({ id: uid(), text, date: new Date().toISOString() });
  lead.activity.unshift({ a: 'Note added', t: new Date().toISOString() });

  inp.value = '';
  openDetail(id); // re-render the modal with updated notes
  render();
  showToast('📝', 'Note saved!');
}

/* ══════════════════════════════════════════════
   MODAL HELPERS
══════════════════════════════════════════════ */
function closeModal(id) {
  document.getElementById(id).style.display = 'none';
}

function closeOnBg(event, id) {
  if (event.target.id === id) closeModal(id);
}

/* ══════════════════════════════════════════════
   NAV / VIEW SWITCHING
══════════════════════════════════════════════ */
function setView(view) {
  document.querySelectorAll('.nav-item').forEach((el, i) => {
    el.classList.toggle('active', ['leads', 'analytics', 'contacts', 'settings'][i] === view);
  });
  if (view !== 'leads') {
    showToast('🚧', 'Coming soon — Lead Pipeline is live!');
  }
}

/* ══════════════════════════════════════════════
   CSV EXPORT
══════════════════════════════════════════════ */
function exportCSV() {
  const headers = ['Name', 'Email', 'Company', 'Phone', 'Source', 'Status', 'Score', 'Created'];
  const rows = leads.map(l => [
    l.name, l.email, l.company || '', l.phone || '',
    l.source, l.status, score(l), fmt(l.created)
  ]);

  const csv = [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const a = document.createElement('a');
  a.href     = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
  a.download = `leads_export_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();

  showToast('⬇️', 'Export downloaded!');
}

/* ══════════════════════════════════════════════
   TOAST NOTIFICATIONS
══════════════════════════════════════════════ */
function showToast(icon, message) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<span class="toast-icon">${icon}</span>${escHtml(message)}`;
  document.body.appendChild(toast);

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast && toast.remove(), 2800);
}

/* ══════════════════════════════════════════════
   SECURITY HELPER
══════════════════════════════════════════════ */
/** Escape user-supplied strings before injecting into innerHTML */
function escHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* ══════════════════════════════════════════════
   INIT
══════════════════════════════════════════════ */
seedLeads();
render();
