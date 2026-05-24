# ARCHITECTURE — Cafeteria Entrance Control System

> What this describes: how the system works at runtime.
> See [PRD.md](PRD.md) for requirements. See [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) for build order.

---

## Stack overview

| Layer | Technology | Why |
|-------|-----------|-----|
| Database | Google Sheets | Zero infra cost; admin can read raw data directly |
| Backend | Google Apps Script Web App | Runs server-side code against Sheets; free; no server to manage |
| Frontend | Static HTML + Vanilla JS | No build step; hostable on GitHub Pages or any CDN |
| QR generation | `qrcodejs` (local) | Client-side; no server round-trip needed |
| QR scanning | `html5-qrcode` (CDN) | Camera access via browser API |
| Email | Apps Script `MailApp` | Built-in; no SMTP config |

---

## Google Sheets schema

### Sheet: `students`

| Column | Type | Description |
|--------|------|-------------|
| `student_id` | string | Auto-generated row key (`{학년}-{반}-{번호}`) |
| `grade` | number | 학년 (1–3) |
| `class` | number | 반 |
| `number` | number | 번호 |
| `name` | string | 이름 |
| `token` | string | UUID v4 — encodes into QR; blank until claimed |
| `claimed` | boolean | `TRUE` once QR is issued |
| `claimed_at` | datetime | ISO timestamp of first claim |
| `email` | string | Optional; used for admin email delivery |

### Sheet: `entries`

| Column | Type | Description |
|--------|------|-------------|
| `date` | string | `YYYY-MM-DD` |
| `token` | string | Token that was scanned |
| `student_id` | string | Resolved from token |
| `name` | string | Denormalized for fast log display |
| `scanned_at` | datetime | ISO timestamp |
| `status` | string | `ALLOWED` or `DENIED` |
| `deny_reason` | string | Blank or `already_entered` / `invalid_token` |

---

## Apps Script Web App (backend)

Deployed as: **Execute as → Me**, **Who has access → Anyone**.

All requests hit a single URL. The action is selected via the `action` query parameter.

### Routing table

| Method | `action` | Description |
|--------|----------|-------------|
| GET | `claim` | Student claims a QR code |
| GET | `scan` | Staff scans a QR; returns allow/deny |
| POST | `admin` | Admin operations (password-gated) |

### `claim` flow

```
GET ?action=claim&grade=&class=&number=&name=

1. Find row in `students` where grade+class+number+name match
2. If not found → { error: "학생 정보를 찾을 수 없습니다" }
3. If claimed=TRUE → { error: "이미 발급되었습니다" }
4. Generate UUID v4 token
5. Write token, claimed=TRUE, claimed_at to sheet; flush before returning
6. Return { token, name }
   (client renders QR from token)
```

> **Why GET, not POST?** Apps Script POST responses are redirected to a
> `script.googleusercontent.com/echo?…` URL. That redirect response does not
> always carry `Access-Control-Allow-Origin`, so browsers block it (CORB).
> GET responses are returned directly without a redirect, avoiding the issue.

### `scan` flow

```
GET ?action=scan&token=<uuid>

1. Look up token in `students`
2. If not found → { result: "DENIED", reason: "invalid_token" }
3. Check today's `entries` for matching token
4. If already has ALLOWED entry → { result: "DENIED", reason: "already_entered", at: <time> }
5. Append ALLOWED row to `entries`
6. Return { result: "ALLOWED", name, student_id }
```

### `admin` operations (all require `password` field)

| `adminAction` | Description |
|--------------|-------------|
| `list_students` | Return all student rows |
| `list_entries` | Return entries for a given `date` |
| `reissue` | Clear token+claimed for a student_id; next claim generates new UUID |
| `email_qr` | Send email with QR image link to student's email |
| `add_student` | Add a new student row |

Password is validated server-side on every admin request. There is no session; the password travels in the POST body over HTTPS.

---

## Static frontend pages

All pages are self-contained HTML files. They call the Apps Script Web App URL stored in `config.js`.

### `claim.html`
- Form: 학년, 반, 번호, 이름
- On submit: GET to Apps Script `claim` (params URL-encoded; Korean name is percent-encoded automatically)
- On success: render QR code client-side using `qrcodejs` (`qrcode.min.js`, bundled locally) from the returned token
- Offer download button (canvas → PNG)

### `scan.html` (staff only)
- Opens device camera via `html5-qrcode`
- On decode: GET to Apps Script `scan`
- Display full-screen green (`ALLOWED`) or red (`DENIED`) with student name
- Play audio beep via Web Audio API (different tone for allowed vs denied)
- Auto-reset after 3 seconds

### `admin.html`
- Password prompt on load (stored in `sessionStorage`; cleared on tab close)
- Tabs: Students | Entry Log | Add Student
- Students tab: table with Reissue and Email QR actions per row
- Entry Log tab: date picker → fetch log → display table
- All actions call Apps Script `admin` endpoint with stored password

---

## Security model

| Concern | Mitigation |
|---------|-----------|
| Token guessing | UUID v4 = 122 bits of entropy; not feasible to brute-force |
| QR sharing | Admin detects via entry log (timestamp mismatch); reissues QR |
| Admin password exposure | HTTPS only; password not logged; no cookies or localStorage |
| Sheet direct access | Sheet is private; only the Apps Script service account can write |
| CORS | `claim` uses GET (no redirect); `ContentService` adds `Access-Control-Allow-Origin: *` automatically for `/exec` deployments set to "Anyone" |

---

## Deployment topology

```
[Student browser]
  claim.html → Apps Script URL → Google Sheets
              ← token (UUID)
  qrcode.js renders QR client-side

[Staff phone]
  scan.html → camera → html5-qrcode decodes
           → Apps Script URL → Google Sheets
           ← ALLOWED / DENIED

[Admin browser]
  admin.html → Apps Script URL (+ password) → Google Sheets
```

Static files are hosted on **GitHub Pages** (or any static host). The Apps Script Web App URL is set once in `config.js`.
