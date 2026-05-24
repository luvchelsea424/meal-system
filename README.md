# 급식실 입장 관리 시스템

학교를 위한 QR 기반 급식실 입장 관리 시스템입니다. 학생은 QR 코드를 한 번 발급받고, 교직원은 입구에서 스캔하며, 관리자는 명단과 입장 기록을 관리합니다.

무엇을, 왜 만들었는지는 [_docs/PRD.md](_docs/PRD.md)를, 작동 방식은 [_docs/ARCHITECTURE.md](_docs/ARCHITECTURE.md)를 참고하세요.

---

## 배포 방법

코드는 이미 모두 작성되어 있습니다. 아래 단계를 순서대로 따라주세요.

### 0단계 — Google Sheets 설정

1. `meal-system`이라는 이름의 새 Google 스프레드시트를 만듭니다.
2. **Sheet1**의 이름을 `students`로 변경하고, 아래 순서대로 열을 추가합니다:
   ```
   grade | class | number | name | token | claimed | claimed_at | email
   ```
3. 두 번째 시트를 `entries`로 추가하고 다음 열을 만듭니다:
   ```
   date | token | grade | class | number | name | scanned_at | status | deny_reason
   ```
4. 두 시트 모두 헤더 행을 고정합니다.
5. URL에서 `/d/`와 `/edit` 사이의 문자열인 **스프레드시트 ID**를 메모해 둡니다.

> `today_entries` 시트는 첫 번째 QR 스캔 시 Apps Script가 자동으로 생성합니다. 직접 만들 필요 없습니다.
> 날짜가 바뀐 후 첫 번째 스캔이 들어오면 이전 날의 데이터 행이 자동으로 삭제됩니다 (헤더 행은 유지). 영구 입장 기록은 `entries` 시트에 별도로 누적됩니다.

---

### 1단계 — Apps Script 백엔드 설정

1. 스프레드시트를 열고 **확장 프로그램 → Apps Script**로 이동합니다.
2. 기본 프로젝트 이름을 `meal-system-backend`로 변경합니다.
3. 파일 5개를 만들고 `backend/` 폴더의 내용을 각각 붙여넣습니다:

   | Apps Script 파일 | 로컬 파일 |
   |---|---|
   | `Code.gs` | `backend/Code.gs` |
   | `ClaimHandler.gs` | `backend/ClaimHandler.gs` |
   | `ScanHandler.gs` | `backend/ScanHandler.gs` |
   | `AdminHandler.gs` | `backend/AdminHandler.gs` |
   | `Utils.gs` | `backend/Utils.gs` |

4. **프로젝트 설정 → 스크립트 속성**으로 이동해 다음을 추가합니다:
   | 속성 | 값 |
   |---|---|
   | `ADMIN_PASSWORD` | 설정할 관리자 비밀번호 |

5. **배포 → 새 배포 → 웹 앱**을 클릭합니다:
   - 실행 계정: **나**
   - 액세스 권한: **모든 사용자**
6. **웹 앱 URL**을 복사합니다 — 다음 단계에서 필요합니다.

---

### 2단계 — 프론트엔드 설정

`docs/config.js`를 열고 1단계에서 복사한 웹 앱 URL로 플레이스홀더를 교체합니다:

```js
const CONFIG = {
  apiUrl: 'PASTE_APPS_SCRIPT_URL_HERE',
};
```

---

### 3단계 — 프론트엔드 배포

1. 전체 저장소를 GitHub에 푸시합니다.
2. **GitHub Pages**를 활성화합니다 (Settings → Pages → branch: `main`, folder: `/docs`).
3. 해당 대상에게 URL을 공유합니다:
   - `/claim.html` → 학생 (QR 발급)
   - `/scan.html` → 교직원 (QR 스캔)
   - `/admin.html` → 관리자
   - `/view.html` → 이메일로 발송된 QR 링크 (학생용, 직접 공유하지 않음)

---

## 스모크 테스트 체크리스트

운영 전에 각 흐름을 확인하세요:

- [ ] 학생이 QR 발급 → QR 이미지 렌더링 → Sheets `students`에 토큰 확인
- [ ] 학생이 재발급 시도 → 기존 QR 코드가 그대로 표시됨 ("이미 발급된 QR 코드입니다")
- [ ] 교직원이 유효한 QR 스캔 → 초록 화면 "입장 허용" → Sheets `entries`에 행 추가
- [ ] 교직원이 당일 동일 QR 재스캔 → 빨간 화면 "오늘 이미 입장함 (HH:MM)"
- [ ] 교직원이 알 수 없는 토큰 스캔 → 빨간 화면 "등록되지 않은 QR 코드"
- [ ] 관리자가 재발급 → 이전 QR이 "등록되지 않은 QR 코드" 반환
- [ ] 재발급 후 학생이 발급 → 새 QR 발급
- [ ] 관리자가 QR 이메일 전송 → 학생이 `view.html?token=...` 링크 수신
- [ ] 관리자 입장 로그 탭 → 선택한 날짜의 입장 내역 정확히 표시

---

## 역할

| 역할 | 페이지 |
|---|---|
| 학생 | `/claim.html` — QR 발급 (로그인 불필요) |
| 교직원 | `/scan.html` — 입구에서 QR 스캔 |
| 관리자 | `/admin.html` — 학생 관리, QR 재발급, 이메일 발송, 입장 로그 조회 |
| 학생 (이메일 링크) | `/view.html` — 이메일로 받은 QR 코드 열람 및 저장 |
