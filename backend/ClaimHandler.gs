// ── ClaimHandler.gs ───────────────────────────────────────────────────────────
// Handles POST ?action=claim
// Body: { grade, class, number, name }
// Returns: { token } on success, { error } on failure.

function handleClaim(body) {
  var grade  = parseInt(body.grade,  10);
  var cls    = parseInt(body.class,  10);
  var number = parseInt(body.number, 10);
  var name   = String(body.name || '').trim();

  if (!grade || !cls || !number || !name) {
    return { error: '모든 필드를 입력해주세요' };
  }

  var sheet   = getSheet('students');
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

  // Pre-check outside the lock: find the student row and reject unknowns early.
  // No write happens here so there is no race condition.
  var rows   = sheetToObjects(sheet);
  var rowNum = -1;
  for (var i = 0; i < rows.length; i++) {
    var r = rows[i];
    if (
      Number(r.grade)  === grade  &&
      Number(r.class)  === cls    &&
      Number(r.number) === number &&
      String(r.name).trim() === name
    ) {
      rowNum = i + 2; // +1 for header, +1 for 1-based index
      break;
    }
  }

  if (rowNum === -1) {
    return { error: '학생 정보를 찾을 수 없습니다' };
  }

  // Acquire lock only for the claimed check + write so concurrent claims
  // for the same student cannot both generate and overwrite each other's token.
  var tokenCol     = headers.indexOf('token')      + 1;
  var claimedCol   = headers.indexOf('claimed')    + 1;
  var claimedAtCol = headers.indexOf('claimed_at') + 1;

  if (!tokenCol || !claimedCol || !claimedAtCol) {
    return { error: 'column not found — headers: ' + JSON.stringify(headers) + ', tokenCol: ' + tokenCol + ', claimedCol: ' + claimedCol + ', claimedAtCol: ' + claimedAtCol };
  }

  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(6000);
  } catch (_) {
    return { error: '서버가 혼잡합니다. 잠시 후 다시 시도해주세요.' };
  }

  try {
    // Re-read the single row inside the lock to get the authoritative claimed state.
    var claimedVal = sheet.getRange(rowNum, claimedCol).getValue();
    if (claimedVal === true) {
      var existingToken = sheet.getRange(rowNum, tokenCol).getValue();
      return { token: existingToken, name: name, alreadyClaimed: true };
    }

    var token = generateUUID();
    sheet.getRange(rowNum, tokenCol).setValue(token);
    sheet.getRange(rowNum, claimedCol).setValue(true);
    sheet.getRange(rowNum, claimedAtCol).setValue(new Date().toISOString());
    SpreadsheetApp.flush();

    return { token: token, name: name };
  } finally {
    lock.releaseLock();
  }
}
