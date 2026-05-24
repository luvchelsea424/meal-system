// ── Code.gs ───────────────────────────────────────────────────────────────────
// Entry points for the Apps Script Web App.
//
// Deploy settings:
//   Execute as:    Me
//   Who can access: Anyone
//
// All POST requests must use Content-Type: text/plain (JSON body as string) to
// avoid CORS preflight. Apps Script does not handle OPTIONS requests.

function doGet(e) {
  try {
    var action = e.parameter.action;

    if (action === 'scan') {
      var token = e.parameter.token;
      if (!token) return jsonResponse({ error: 'token parameter is required' });
      return jsonResponse(handleScan(token));
    }

    if (action === 'claim') return jsonResponse(handleClaim(e.parameter));

    return jsonResponse({ error: 'unknown action: ' + action });
  } catch (err) {
    return jsonResponse({ error: err.message });
  }
}

function doPost(e) {
  try {
    if (!e.postData || !e.postData.contents) {
      return jsonResponse({ error: 'request body is required' });
    }

    var body = JSON.parse(e.postData.contents);
    var action = (e.parameter && e.parameter.action) || body.action;

    if (action === 'claim') return jsonResponse(handleClaim(body));
    if (action === 'admin') return jsonResponse(handleAdmin(body));

    return jsonResponse({ error: 'unknown action: ' + action });
  } catch (err) {
    return jsonResponse({ error: err.message });
  }
}
