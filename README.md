# Cafeteria Entrance Control System

QR-based cafeteria entrance control for schools. Students claim a QR code once; staff scan it at the door; admins manage the roster and entry log.

See [docs/PRD.md](docs/PRD.md) for what and why. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for how it works.

---

## Deployment

All code is already written. Follow the steps below in order.

### Phase 0 — Google Sheets

1. Create a new Google Spreadsheet named `meal-system`.
2. Rename **Sheet1** → `students` and add columns in this exact order:
   ```
   student_id | grade | class | number | name | token | claimed | claimed_at | email
   ```
3. Add a second sheet → `entries` with columns:
   ```
   date | token | student_id | name | scanned_at | status | deny_reason
   ```
4. Freeze the header row on both sheets.
5. Note the **Spreadsheet ID** from the URL — the string between `/d/` and `/edit`.

---

### Phase 1 — Apps Script backend

1. Open the spreadsheet → **Extensions → Apps Script**.
2. Rename the default project to `meal-system-backend`.
3. Create five files and paste the contents from `backend/` into each:

   | Apps Script file | Local file |
   |---|---|
   | `Code.gs` | `backend/Code.gs` |
   | `ClaimHandler.gs` | `backend/ClaimHandler.gs` |
   | `ScanHandler.gs` | `backend/ScanHandler.gs` |
   | `AdminHandler.gs` | `backend/AdminHandler.gs` |
   | `Utils.gs` | `backend/Utils.gs` |

4. Go to **Project Settings → Script Properties** and add:
   | Property | Value |
   |---|---|
   | `ADMIN_PASSWORD` | your chosen admin password |

5. Click **Deploy → New Deployment → Web App**:
   - Execute as: **Me**
   - Who has access: **Anyone**
6. Copy the **Web App URL** — you will need it in the next step.

---

### Phase 2 — Frontend config

Open `frontend/config.js` and replace the placeholder with the Web App URL from Phase 1:

```js
const CONFIG = {
  apiUrl: 'PASTE_APPS_SCRIPT_URL_HERE',
};
```

---

### Phase 3 — Deploy frontend

1. Push the `frontend/` folder to a GitHub repository.
2. Enable **GitHub Pages** (Settings → Pages → branch: `main`, folder: `/` or `/docs`).
3. Share the URLs with the right audience:
   - `/claim.html` → students
   - `/scan.html` → staff
   - `/admin.html` → admins

---

## Smoke test checklist

Run through each flow before going live:

- [ ] Student claims QR → QR image renders → token visible in Sheets
- [ ] Student claims again → "이미 발급되었습니다" shown
- [ ] Staff scans valid QR → green screen → entry row appears in Sheets
- [ ] Staff scans same QR again same day → red screen with "already entered"
- [ ] Staff scans unknown token → red screen with "invalid token"
- [ ] Admin reissues → old QR now returns "invalid token"
- [ ] Student claims after reissue → new QR issued
- [ ] Admin emails QR → student receives email
- [ ] Admin entry log → shows correct entries for selected date

---

## Roles

| Role | Page |
|---|---|
| Student | `/claim.html` — claim QR (no login) |
| Staff | `/scan.html` — scan QR at the door |
| Admin | `/admin.html` — manage students, reissue QR, view entry log |
