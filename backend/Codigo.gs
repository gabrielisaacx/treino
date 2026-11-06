/**
 * Treino Diário: backend em Google Sheets (Apps Script, web app).
 * Abas criadas sozinhas: Perfis, Dados, Placar.
 * Segurança: cada perfil tem um PIN (guardado só como hash). Sem o PIN certo nada é lido nem gravado.
 * Implantar como: Executar como "Eu" e acesso "Qualquer pessoa" (o PIN protege os dados).
 */
var MAX_CHUNK = 45000;   // limite da célula é 50.000 caracteres
var MAX_PARTS = 12;      // até ~540 KB por perfil

function doGet() { return out_({ ok: true, msg: "Treino Diário API" }); }

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var r = JSON.parse(e.postData.contents);
    return out_(handle_(r));
  } catch (err) {
    return out_({ ok: false, erro: String(err) });
  } finally {
    lock.releaseLock();
  }
}

function out_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

function sheet_(name, header) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var s = ss.getSheetByName(name);
  if (!s) {
    s = ss.insertSheet(name);
    s.getRange("A:A").setNumberFormat("@");
    s.appendRow(header);
    s.setFrozenRows(1);
  }
  return s;
}

function hash_(pin, id) {
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, "treino:" + id + ":" + pin);
  return bytes.map(function (b) { return ("0" + (b & 255).toString(16)).slice(-2); }).join("");
}

function normD_(v) {
  if (Object.prototype.toString.call(v) === "[object Date]") return Utilities.formatDate(v, Session.getScriptTimeZone(), "yyyy-MM-dd");
  return String(v);
}

function findRow_(sheet, col, value) {
  var vals = sheet.getDataRange().getValues();
  for (var i = 1; i < vals.length; i++) if (String(vals[i][col]) === value) return i + 1;
  return -1;
}

function handle_(r) {
  var id = String(r.p || "").toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 30);
  var pin = String(r.pin || "");
  if (!id || pin.length < 4) return { ok: false, erro: "Perfil ou PIN inválido (PIN com 4+ caracteres)." };

  var perfis = sheet_("Perfis", ["id", "nome", "pin_hash", "criado_em", "atualizado_em"]);
  var row = findRow_(perfis, 0, id);
  var h = hash_(pin, id);
  var now = new Date();

  if (row < 0) {
    if (r.a !== "login") return { ok: false, erro: "Perfil não existe. Faça login primeiro." };
    perfis.appendRow([id, String(r.nome || id).slice(0, 40), h, now, now]);
    return { ok: true, novo: true };
  }
  var saved = String(perfis.getRange(row, 3).getValue());
  if (saved !== h) return { ok: false, erro: "PIN incorreto." };

  if (r.a === "login") return { ok: true, novo: false };

  if (r.a === "save") {
    var data = String(r.data || "");
    var dados = sheet_("Dados", ["id", "atualizado_em", "parte1", "parte2", "parte3", "parte4", "parte5", "parte6", "parte7", "parte8", "parte9", "parte10", "parte11", "parte12"]);
    var parts = [];
    for (var i = 0; i < data.length; i += MAX_CHUNK) parts.push(data.substr(i, MAX_CHUNK));
    if (parts.length > MAX_PARTS) return { ok: false, erro: "Dados grandes demais para a planilha." };
    var line = [id, now];
    for (var k = 0; k < MAX_PARTS; k++) line.push(parts[k] || "");
    var dr = findRow_(dados, 0, id);
    if (dr < 0) dr = dados.getLastRow() + 1;
    dados.getRange(dr, 1, 1, line.length).setValues([line]);
    if (r.score && r.score.d) upsertScore_(id, r.score);
    perfis.getRange(row, 5).setValue(now);
    return { ok: true, em: now.getTime() };
  }

  if (r.a === "load") {
    var d2 = sheet_("Dados", ["id", "atualizado_em"]);
    var rr = findRow_(d2, 0, id);
    if (rr < 0) return { ok: true, data: "", em: 0 };
    var vals = d2.getRange(rr, 1, 1, 2 + MAX_PARTS).getValues()[0];
    var txt = "";
    for (var j = 2; j < vals.length; j++) txt += String(vals[j] || "");
    return { ok: true, data: txt, em: new Date(vals[1]).getTime() };
  }

  if (r.a === "score") {
    if (r.score && r.score.d) upsertScore_(id, r.score);
    return { ok: true };
  }

  if (r.a === "board") {
    // só pontos (nunca peso, medidas ou treinos): é o que os dois podem ver
    var since = String(r.since || "");
    var pl = sheet_("Placar", ["data", "perfil", "pontos", "detalhe", "atualizado_em"]).getDataRange().getValues();
    var nomes = {};
    var pv = perfis.getDataRange().getValues();
    for (var a = 1; a < pv.length; a++) nomes[String(pv[a][0])] = String(pv[a][1]);
    var map = {};
    for (var b = 1; b < pl.length; b++) {
      var d = normD_(pl[b][0]);
      if (d >= since) map[d + "|" + String(pl[b][1])] = { d: d, p: String(pl[b][1]), nome: nomes[String(pl[b][1])] || String(pl[b][1]), pts: Number(pl[b][2]) || 0, det: String(pl[b][3] || "") };
    }
    var rows = Object.keys(map).map(function (k) { return map[k]; });
    return { ok: true, rows: rows };
  }

  return { ok: false, erro: "Ação desconhecida." };
}

function upsertScore_(id, s) {
  var pl = sheet_("Placar", ["data", "perfil", "pontos", "detalhe", "atualizado_em"]);
  var vals = pl.getDataRange().getValues();
  var d = String(s.d), line = [d, id, Number(s.pts) || 0, String(s.det || "").slice(0, 2000), new Date()];
  for (var i = 1; i < vals.length; i++) {
    if (normD_(vals[i][0]) === d && String(vals[i][1]) === id) {
      pl.getRange(i + 1, 1).setNumberFormat("@");
      pl.getRange(i + 1, 1, 1, 5).setValues([line]);
      return;
    }
  }
  var nr = pl.getLastRow() + 1;
  pl.getRange(nr, 1).setNumberFormat("@");
  pl.getRange(nr, 1, 1, 5).setValues([line]);
}
