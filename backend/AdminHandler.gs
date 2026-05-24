// ── AdminHandler.gs ───────────────────────────────────────────────────────────
// Handles POST ?action=admin
// All operations require { password } in the body.

function handleAdmin(body) {
  if (!checkAdminPassword(body.password)) {
    return { error: '비밀번호가 올바르지 않습니다' };
  }

  var op = body.adminAction;
  if (op === 'list_students') return adminListStudents();
  if (op === 'list_entries')  return adminListEntries(body.date);
  if (op === 'reissue')       return adminReissue(body.grade, body.class, body.number);
  if (op === 'email_qr')      return adminEmailQR(body.grade, body.class, body.number, body.qr_url);
  if (op === 'add_student')   return adminAddStudent(body);

  return { error: '알 수 없는 작업: ' + op };
}

// ── Sub-handlers ──────────────────────────────────────────────────────────────

function adminListStudents() {
  return { students: sheetToObjects(getSheet('students')) };
}

function adminListEntries(date) {
  var target  = date || today();
  var entries = sheetToObjects(getSheet('entries'));
  return {
    entries: entries.filter(function (e) { return e.date === target; }),
    date:    target
  };
}

function adminReissue(grade, cls, number) {
  grade  = parseInt(grade,  10);
  cls    = parseInt(cls,    10);
  number = parseInt(number, 10);
  if (!grade || !cls || !number) return { error: 'grade, class, number are required' };

  var sheet   = getSheet('students');
  var rows    = sheetToObjects(sheet);
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

  for (var i = 0; i < rows.length; i++) {
    var r = rows[i];
    if (Number(r.grade) === grade && Number(r.class) === cls && Number(r.number) === number) {
      var rowNum = i + 2;
      sheet.getRange(rowNum, headers.indexOf('token')      + 1).setValue('');
      sheet.getRange(rowNum, headers.indexOf('claimed')    + 1).setValue(false);
      sheet.getRange(rowNum, headers.indexOf('claimed_at') + 1).setValue('');
      return { success: true };
    }
  }

  return { error: '학생을 찾을 수 없습니다' };
}

function adminEmailQR(grade, cls, number, qrUrl) {
  grade  = parseInt(grade,  10);
  cls    = parseInt(cls,    10);
  number = parseInt(number, 10);
  if (!grade || !cls || !number || !qrUrl) return { error: 'grade, class, number, qr_url are required' };

  var sheet    = getSheet('students');
  var students = sheetToObjects(sheet);

  for (var i = 0; i < students.length; i++) {
    var s = students[i];
    if (Number(s.grade) !== grade || Number(s.class) !== cls || Number(s.number) !== number) continue;
    if (!s.email)   return { error: '이메일이 등록되어 있지 않습니다' };
    if (!s.claimed) return { error: 'QR이 아직 발급되지 않은 학생입니다' };

    MailApp.sendEmail({
      to:       s.email,
      subject:  '[급식실] ' + s.name + ' 학생 QR 코드',
      htmlBody: [
        '<p>' + s.name + ' 학생 (' + s.grade + '학년 ' + s.class + '반 ' + s.number + '번),</p>',
        '<p>급식실 입장 QR 코드를 아래 링크에서 확인하고 저장하세요.</p>',
        '<p><a href="' + qrUrl + '">' + qrUrl + '</a></p>',
        '<p>QR 코드 이미지를 저장해 두면 오프라인에서도 사용할 수 있습니다.</p>',
        '<hr><p style="color:#888;font-size:12px">급식 관리 시스템 자동 발송 메일입니다.</p>'
      ].join('')
    });

    return { success: true };
  }

  return { error: '학생을 찾을 수 없습니다' };
}

function adminAddStudent(body) {
  var grade  = parseInt(body.grade,  10);
  var cls    = parseInt(body.class,  10);
  var number = parseInt(body.number, 10);
  var name   = String(body.name  || '').trim();
  var email  = String(body.email || '').trim();

  if (!grade || !cls || !number || !name) {
    return { error: '학년, 반, 번호, 이름은 필수입니다' };
  }

  var sheet = getSheet('students');
  var rows  = sheetToObjects(sheet);

  for (var i = 0; i < rows.length; i++) {
    var r = rows[i];
    if (Number(r.grade) === grade && Number(r.class) === cls && Number(r.number) === number) {
      return { error: '이미 등록된 학생입니다 (' + grade + '-' + cls + '-' + number + ')' };
    }
  }

  // Column order must match the sheet: grade, class, number, name, token, claimed, claimed_at, email
  sheet.appendRow([grade, cls, number, name, '', false, '', email]);
  return { success: true };
}
