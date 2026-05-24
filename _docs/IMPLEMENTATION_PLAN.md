# IMPLEMENTATION PLAN — Cafeteria Entrance Control System

> Build order for the system described in [PRD.md](PRD.md).
> Runtime architecture is in [ARCHITECTURE.md](ARCHITECTURE.md).

---

## Phase 0 — Google Sheets setup

**Goal:** Establish the data store before writing any code.

- [ ] Create a new Google Spreadsheet named `meal-system`
- [ ] Rename Sheet1 → `students`; add columns in order:
  `student_id | grade | class | number | name | token | claimed | claimed_at | email`
- [ ] Add a second sheet → `entries`; add columns:
  `date | token | student_id | name | scanned_at | status | deny_reason`
- [ ] Freeze the header row on both sheets
- [ ] Note the Spreadsheet ID from the URL (needed in Phase 1)

---

## Phase 1 — Apps Script backend

**Goal:** A single deployed Web App that handles all API calls.

### 1-A: Project setup
- [ ] Open Extensions → Apps Script in the spreadsheet
- [ ] Rename default project to `meal-system-backend`
- [ ] Create files: `Code.gs`, `ClaimHandler.gs`, `ScanHandler.gs`, `AdminHandler.gs`, `Utils.gs`

### 1-B: `Utils.gs` — shared helpers
- [ ] `getSheet(name)` — returns the named sheet
- [ ] `generateUUID()` — UUID v4 via `Utilities.getUuid()`
- [ ] `today()` — returns `YYYY-MM-DD` string in KST
- [ ] `jsonResponse(data, status)` — wraps `ContentService.createTextOutput` with CORS headers
- [ ] `checkAdminPassword(password)` — compares against `PropertiesService.getScriptProperties().getProperty('ADMIN_PASSWORD')`

### 1-C: `ClaimHandler.gs`
- [ ] `handleClaim(body)`:
  - Find row matching `grade + class + number + name`
  - Return 404 if no match
  - Return 409 `{ error: "이미 발급되었습니다" }` if `claimed === TRUE`
  - Write `token = generateUUID()`, `claimed = TRUE`, `claimed_at = new Date()`
  - Return `{ token }`

### 1-D: `ScanHandler.gs`
- [ ] `handleScan(token)`:
  - Find student row by token
  - Return `{ result: "DENIED", reason: "invalid_token" }` if not found
  - Check `entries` sheet for today + this token with status `ALLOWED`
  - Return `{ result: "DENIED", reason: "already_entered", at: <scanned_at> }` if duplicate
  - Append `ALLOWED` row to `entries`
  - Return `{ result: "ALLOWED", name, student_id }`

### 1-E: `AdminHandler.gs`
- [ ] `handleAdmin(body)`:
  - Validate password via `checkAdminPassword`; return 403 on failure
  - Route to sub-handlers by `body.adminAction`:
    - `list_students` — return all rows from `students`
    - `list_entries` — return rows from `entries` filtered by `body.date`
    - `reissue` — clear `token`, `claimed`, `claimed_at` for `body.student_id`
    - `email_qr` — send email via `MailApp.sendEmail`; body contains QR deep-link URL
    - `add_student` — append new row; auto-generate `student_id`

### 1-F: `Code.gs` — router
- [ ] `doGet(e)` — route to `handleScan` when `action=scan`
- [ ] `doPost(e)` — parse JSON body; route to `handleClaim` or `handleAdmin`
- [ ] Wrap all handlers in try/catch; return `{ error: message }` on unexpected failures

### 1-G: Configure and deploy
- [ ] Set `ADMIN_PASSWORD` in Project Settings → Script Properties
- [ ] Deploy → New Deployment → Web App
  - Execute as: **Me**
  - Who has access: **Anyone**
- [ ] Copy the Web App URL — this goes into `config.js` in Phase 2

---

## Phase 2 — Static frontend

**Goal:** Three HTML pages that call the Apps Script Web App.

### 2-A: Shared config
- [ ] Create `config.js`:
  ```js
  const CONFIG = {
    apiUrl: 'PASTE_APPS_SCRIPT_URL_HERE',
  };
  ```
- [ ] All pages include `<script src="config.js">` before their own script

### 2-B: `claim.html`
- [ ] Form inputs: 학년 (select 1–3), 반 (number), 번호 (number), 이름 (text)
- [ ] On submit: POST to `CONFIG.apiUrl?action=claim` with JSON body
- [ ] On `200`: render QR in `<canvas>` using `qrcode.js` from token value
- [ ] On `409`: show "이미 발급되었습니다" message
- [ ] On `404`: show "학생 정보를 찾을 수 없습니다" message
- [ ] "QR 저장" button: `canvas.toBlob` → download as PNG

### 2-C: `scan.html`
- [ ] Load `html5-qrcode` from CDN
- [ ] Start camera scanner on page load (request camera permission)
- [ ] On decode: GET `CONFIG.apiUrl?action=scan&token=<decoded>`
- [ ] On `ALLOWED`: show full-screen green overlay with student name; play 800 Hz beep (0.3 s)
- [ ] On `DENIED`: show full-screen red overlay with deny reason; play 200 Hz beep (0.5 s)
- [ ] Auto-dismiss overlay after 3 s; resume scanner
- [ ] Audio via `AudioContext` (no external files needed)

### 2-D: `admin.html`
- [ ] Password modal on load; store in `sessionStorage` as `adminPw`
- [ ] Tab: **Students**
  - Table columns: 학년, 반, 번호, 이름, 이메일, 발급여부, 발급일시, Actions
  - "재발급" button → `adminAction: reissue` → confirm dialog first
  - "QR 이메일" button → `adminAction: email_qr` (only if email is set)
- [ ] Tab: **입장 로그**
  - Date input (default: today)
  - Fetch on date change → display table with columns: 시간, 이름, 학년/반/번호, 결과, 사유
- [ ] Tab: **학생 추가**
  - Form: 학년, 반, 번호, 이름, 이메일 (optional)
  - Submit → `adminAction: add_student`

---

## Phase 3 — Deployment

**Goal:** Live and accessible to students and staff.

- [ ] Push `claim.html`, `scan.html`, `admin.html`, `config.js` to a GitHub repository
- [ ] Enable GitHub Pages (branch: `main`, folder: `/` or `/docs`)
- [ ] Verify `claim.html` is reachable; test the claim flow end-to-end
- [ ] Verify `scan.html` opens camera; scan a claimed QR
- [ ] Verify `admin.html` loads student list with correct password
- [ ] Share `scan.html` URL with staff; share `claim.html` URL with students

---

## Phase 4 — Smoke test checklist

Run through each flow before going live:

- [ ] Student claims QR → QR image renders → token visible in Sheets
- [ ] Student claims again → "이미 발급되었습니다" shown
- [ ] Staff scans valid QR → green screen → entry row in Sheets
- [ ] Staff scans same QR again same day → red screen with "already_entered"
- [ ] Staff scans unknown token → red screen with "invalid_token"
- [ ] Admin reissues → token cleared in Sheets → old QR now returns "invalid_token"
- [ ] Student claims after reissue → new QR issued → new token in Sheets
- [ ] Admin email QR → student receives email (if email is set)
- [ ] Admin entry log → shows correct entries for selected date

---

## Out of scope for v1

- Bulk student import (CSV upload)
- Offline / PWA mode
- Automated fraud detection / alerts
- Role-based access (staff vs admin separation on frontend)
