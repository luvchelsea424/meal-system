// ── ScanHandler.gs ────────────────────────────────────────────────────────────
// Handles GET ?action=scan&token=<uuid>
// Returns: { result: 'ALLOWED'|'DENIED', ... }
//
// Duplicate check reads only `today_entries` (max ~800 rows, constant size).
// `entries` is the permanent log and grows unboundedly, but is never read here.
// `today_entries` is auto-cleared inside the lock when the date rolls over.

function handleScan(token) {
  var studentsSheet = getSheet('students');
  var students      = sheetToObjects(studentsSheet);

  // Student lookup is read-only — no race condition, keep it outside the lock.
  var student = null;
  for (var i = 0; i < students.length; i++) {
    if (students[i].token === token) {
      student = students[i];
      break;
    }
  }

  if (!student) {
    return { result: 'DENIED', reason: 'invalid_token' };
  }

  var todayStr     = today();
  var entriesSheet = getSheet('entries');

  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(6000);
  } catch (_) {
    return { result: 'DENIED', reason: 'server_busy' };
  }

  var nowIso;
  try {
    // Fresh sheet reference inside the lock avoids stale cached data.
    var todaySheet = getOrCreateTodayEntriesSheet();

    // Single read covers date check + duplicate check.
    var allRows = todaySheet.getDataRange().getValues();

    if (allRows.length > 1) {
      var firstDateRaw = allRows[1][0];
      var firstDate = (firstDateRaw instanceof Date)
        ? Utilities.formatDate(firstDateRaw, 'Asia/Seoul', 'yyyy-MM-dd')
        : String(firstDateRaw);
      if (firstDate !== todayStr) {
        todaySheet.deleteRows(2, allRows.length - 1);
        allRows = [allRows[0]];
      }
    }

    // Duplicate check — columns: date(0) | token(1) | scanned_at(2)
    for (var j = 1; j < allRows.length; j++) {
      if (allRows[j][1] === token) {
        return {
          result: 'DENIED',
          reason: 'already_entered',
          at:     allRows[j][2],
          name:   student.name
        };
      }
    }

    nowIso = new Date().toISOString();
    todaySheet.appendRow([todayStr, token, nowIso, student.grade, student.class, student.number, student.name]);
    SpreadsheetApp.flush();
  } finally {
    lock.releaseLock();
  }

  // entries is append-only during scan — no race condition, write outside the lock.
  entriesSheet.appendRow([todayStr, token, student.grade, student.class, student.number, student.name, nowIso, 'ALLOWED', '']);

  return {
    result: 'ALLOWED',
    name:   student.name,
    grade:  student.grade,
    class:  student.class,
    number: student.number
  };
}
