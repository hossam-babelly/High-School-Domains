/* =====================================================================
   بوصلة الاختصاص الجامعي — خادم بسيط يمنع إعارة الرمز بين الأجهزة
   ---------------------------------------------------------------------
   لا يحتاج أي مكتبة (بلا npm install). يقدّم index.html ويسجّل الرموز
   المستخدَمة في ملف redeemed.json بجانبه: أول جهاز يستخدم الرمز يملكه،
   وأي محاولة لاحقة بالرمز نفسه من أي جهاز تُرفض.

   التشغيل:      node server.js
   المنفذ:       PORT من متغيرات البيئة، أو 8080
   الربط بالصفحة: افتح index.html وضع في السطر var REDEEM_URL="";
                  القيمة "/api/redeem"  (إن كان الخادم يقدّم الصفحة نفسها)
                  أو الرابط الكامل      (إن كانت الصفحة مستضافة في مكان آخر)
   ملاحظة: احتفظ بنسخة احتياطية من redeemed.json — حذفه يعيد كل الرموز صالحة.
   ===================================================================== */
"use strict";
var http = require("http");
var fs   = require("fs");
var path = require("path");

var PORT     = process.env.PORT || 8080;
var CODE_LEN = 14;
var HERE     = __dirname;
var STORE    = path.join(HERE, "redeemed.json");
var PAGE     = fs.existsSync(path.join(HERE, "index.html"))
             ? path.join(HERE, "index.html")
             : path.join(HERE, "..", "index.html");

/* ---------- سجل الرموز ---------- */
var used = Object.create(null);
try {
  JSON.parse(fs.readFileSync(STORE, "utf8")).forEach(function (row) {
    used[typeof row === "string" ? row : row.code] = 1;
  });
} catch (e) { /* أول تشغيل: لا ملف بعد */ }

var writing = false, again = false;
function save() {
  if (writing) { again = true; return; }
  writing = true;
  var rows = Object.keys(used);
  var tmp  = STORE + ".tmp";
  fs.writeFile(tmp, JSON.stringify(rows), "utf8", function (err) {
    if (!err) { try { fs.renameSync(tmp, STORE); } catch (e2) {} }
    writing = false;
    if (again) { again = false; save(); }
  });
}

function redeem(code) {
  if (used[code]) return { ok: false, reason: "used" };
  used[code] = 1;
  save();
  return { ok: true };
}

/* ---------- الخادم ---------- */
function json(res, obj) {
  res.writeHead(200, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "no-store"
  });
  res.end(JSON.stringify(obj));
}

http.createServer(function (req, res) {
  var u = new URL(req.url, "http://localhost");

  if (u.pathname === "/api/redeem") {
    var code = String(u.searchParams.get("code") || "").trim();
    if (code.length !== CODE_LEN) return json(res, { ok: false, reason: "bad" });
    return json(res, redeem(code));
  }

  if (u.pathname === "/api/stats") {          /* عدّاد بسيط للاطّلاع */
    return json(res, { redeemed: Object.keys(used).length });
  }

  if (u.pathname === "/" || u.pathname === "/index.html") {
    return fs.readFile(PAGE, function (err, buf) {
      if (err) { res.writeHead(500); return res.end("index.html not found"); }
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(buf);
    });
  }

  res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("Not found");
}).listen(PORT, function () {
  console.log("بوصلة الاختصاص — يعمل على المنفذ " + PORT);
  console.log("الصفحة: " + PAGE);
  console.log("السجل: " + STORE + " (" + Object.keys(used).length + " رمزاً مستخدَماً)");
});
