# PRD — Cafeteria Entrance Control System

> See [ARCHITECTURE.md](ARCHITECTURE.md) for how it works. See [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) for build order.

## Problem
The school cafeteria has no reliable way to verify that only enrolled students enter. A student can enter multiple times, or send someone else in their place, with no way for staff to detect or respond.

## Goals
- Each enrolled student claims a unique QR code from a self-service web page using their school identity (학년 + 반 + 번호 + 이름).
- QR codes are valid indefinitely — they never expire on their own.
- Staff scan the QR with a mobile device; the system immediately shows green (allowed) or red (denied) with an audio beep.
- A student can enter once per day. Attempting to enter a second time is denied.
- If a student shares their QR (fraud), an admin can reissue. The old QR is instantly invalid, and the student must re-claim a new one at `/claim`.
- Admins can email a student their QR directly from the admin panel.
- Admins can view a full entry log per day.

## Non-goals (v1)
- Offline support (system requires network)
- Meal selection or nutritional tracking
- Automated fraud detection (humans detect fraud via the entry log)

## Roles
| Role | Access |
|------|--------|
| Admin | Student management, QR reissue, email delivery, entry log |
| Staff | Scanner page only |
| Student | Self-service `/claim` page (no login required) |

## QR lifecycle
```
Admin creates student record
        ↓
Student visits /claim → enters 학년 + 반 + 번호 + 이름
        ↓
QR issued → valid indefinitely
        ↓  (second /claim attempt → blocked: "이미 발급되었습니다")
        ↓  (fraud detected)
Admin reissues → old QR immediately invalid
        ↓
Student visits /claim again → new QR issued once
```

## Fraud detection flow
1. A student who shared their QR is denied "already entered at HH:MM" when they arrive.
2. The student reports to admin, who checks the entry log (timestamp shown).
3. Admin reissues the QR — the shared copy is instantly invalidated.
4. Admin notifies the student to visit `/claim` to get a new QR (optionally via email).


