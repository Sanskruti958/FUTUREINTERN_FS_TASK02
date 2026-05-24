# ⚡ NexusCRM — Lead Intelligence

A clean, dark-themed CRM for managing website contact-form leads.
No build step required — open `index.html` directly in any modern browser.

---

## 📁 File Structure

```
NexusCRM/
├── index.html   — App shell, layout & modals
├── style.css    — Full dark-executive theme (CSS variables)
├── app.js       — All logic: state, CRUD, rendering, export
└── README.md    — This file
```

---

## ✨ Features

| Feature | Details |
|---|---|
| **Lead Pipeline** | Table with name, email, company, source, status badge, score bar |
| **Add / Edit Lead** | Modal form — name, email, company, phone, source, status, initial note |
| **Lead Scoring** | Auto-computed 0–100 score; colour-coded green / amber / red |
| **Status Management** | Change status (New → Contacted → Converted → Lost) from detail panel |
| **Notes & Follow-ups** | Add timestamped notes; press Enter or click Add |
| **Activity Timeline** | Auto-logs status changes and note additions |
| **Search** | Live search across name, email, company |
| **Filter** | Filter chips per status |
| **Sort** | Cycle: Newest · Oldest · Highest Score · Name A–Z |
| **CSV Export** | Downloads all leads as a dated CSV file |
| **Toast Notifications** | Non-blocking feedback for every action |
| **XSS Protection** | `escHtml()` sanitises all user data before DOM injection |

---

## 🚀 Quick Start

```bash
# Option 1 — just open the file
open index.html

# Option 2 — serve locally (avoids any browser file:// restrictions)
npx serve .
# or
python3 -m http.server 3000
```

---

## 🔌 Adding a Real Backend

The in-memory `leads[]` array is the only thing to replace.
Each function that mutates state is clearly commented — swap with `fetch()` calls:

```js
// Example: replace seedLeads() with an API call
async function seedLeads() {
  const res  = await fetch('/api/leads');
  leads      = await res.json();
  render();
}

// Example: replace the create branch in saveLead()
const newLead = await fetch('/api/leads', {
  method:  'POST',
  headers: { 'Content-Type': 'application/json' },
  body:    JSON.stringify({ name, email, company, phone, source, status })
}).then(r => r.json());
leads.unshift(newLead);
```

### Recommended Stack
| Layer | Tech |
|---|---|
| Frontend | This repo (vanilla JS) or React port |
| API | Node.js + Express |
| Database | MongoDB (mongoose) or PostgreSQL |
| Auth | JWT + bcrypt or Passport.js |
| Hosting | Vercel / Railway / Render |

---

## 🔐 Admin Auth (recommended for production)

Add a login gate before `render()` is called:

```js
const token = localStorage.getItem('crm_token');
if (!token) { window.location.href = '/login.html'; }
```

Send the token as `Authorization: Bearer <token>` in every `fetch()` call.

---

## 🎨 Theming

All colours live in `:root` CSS variables in `style.css`.
Swap the values to rebrand instantly — no code changes needed.

---

## 📄 License

MIT — free for personal and commercial use.
