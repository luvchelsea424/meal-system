# Cafeteria Entrance Control System

QR-based cafeteria entrance control for schools. Students claim a QR code once; staff scan it at the door; admins manage the roster and entry log.

See [_docs/PRD.md](_docs/PRD.md) for what and why. See [_docs/ARCHITECTURE.md](_docs/ARCHITECTURE.md) for how it works.

---

## Deployment

All code is already written. Follow the steps below in order.

### Phase 0 — Google Sheets

1. Create a new Google Spreadsheet named `meal-system`.
2. Rename **Sheet1** → `students` and add columns in this exact order:
   ```
   grade | class | number | name | token | claimed | claimed_at | email
   ```
3. Add a second sheet → `entries` with columns:
   ```
   date | token | grade | class | number | name | scanned_at | status | deny_reason
   ```
4. Freeze the header row on both sheets.
5. Note the **Spreadsheet ID** from the URL — the string between `/d/` and `/edit`.

> The `today_entries` sheet is created automatically by Apps Script on the first QR scan. You do not need to create it manually.
> On the first scan after midnight (KST), all data rows from the previous day are automatically deleted (header row is kept). The permanent entry log accumulates separately in the `entries` sheet.

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

Open `docs/config.js` and replace the placeholder with the Web App URL from Phase 1:

```js
const CONFIG = {
  apiUrl: 'PASTE_APPS_SCRIPT_URL_HERE',
};
```

---

### Phase 3 — Deploy frontend

1. Push the entire repository to GitHub.
2. Enable **GitHub Pages** (Settings → Pages → branch: `main`, folder: `/docs`).
3. Share the URLs with the right audience:
   - `/claim.html` → students (claim QR)
   - `/scan.html` → staff (scan QR)
   - `/admin.html` → admins
   - `/view.html` → QR viewer linked from admin emails (do not share directly)

---

## Smoke test checklist

Run through each flow before going live:

- [ ] Student claims QR → QR image renders → token visible in `students` sheet
- [ ] Student claims again → existing QR shown ("이미 발급된 QR 코드입니다")
- [ ] Staff scans valid QR → green screen "입장 허용" → entry row appears in `entries` sheet
- [ ] Staff scans same QR again same day → red screen with "오늘 이미 입장함 (HH:MM)"
- [ ] Staff scans unknown token → red screen with "등록되지 않은 QR 코드"
- [ ] Admin reissues → old QR now returns "등록되지 않은 QR 코드"
- [ ] Student claims after reissue → new QR issued
- [ ] Admin emails QR → student receives `view.html?token=...` link
- [ ] Admin entry log tab → shows correct entries for selected date

---

## Roles

| Role | Page |
|---|---|
| Student | `/claim.html` — claim QR (no login) |
| Staff | `/scan.html` — scan QR at the door |
| Admin | `/admin.html` — manage students, reissue QR, send email, view entry log |
| Student (email link) | `/view.html` — view and save QR received by email |
