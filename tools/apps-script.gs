/* =====================================================================
   بوصلة الاختصاص الجامعي — خدمة تسجيل الرموز على Google Apps Script
   ---------------------------------------------------------------------
   الغاية: منع إعارة الرمز بين الأجهزة. أول جهاز يستخدم الرمز يملكه،
   وأي محاولة لاحقة بالرمز نفسه من أي جهاز تُرفض.
   تعمل مع الاستبيان المنشور كموقع ثابت (Render Blueprint) بلا أي خادم.

   خطوات النشر (خمس دقائق):
   1. افتح جدول Google جديداً (أو جدول مستخدمي دومينز).
   2. من القائمة: الإضافات ← Apps Script.
   3. امسح ما في المحرر والصق هذا الملف كاملاً ثم احفظ.
   4. اضغط «نشر» ← «عملية نشر جديدة» ← النوع: تطبيق ويب.
      - التنفيذ بصفة: أنا (Me)
      - من يملك حق الوصول: أي شخص (Anyone)   ← ضروري ليعمل من المتصفح
   5. انسخ الرابط المنتهي بـ /exec.
   6. افتح index.html وضع الرابط في السطر:  var REDEEM_URL="";
      ليصبح:  var REDEEM_URL="https://script.google.com/macros/s/.../exec";
   7. ارفع الملف وانتظر إعادة النشر على Render.

   ملاحظات:
   - تُنشأ ورقة باسم redeemed تلقائياً وتُسجَّل فيها الرموز مع وقت الاستخدام.
   - لإلغاء استخدام رمز (لطالب فقد نتيجته) احذف سطره من الورقة.
   - عند كل عملية نشر جديدة للسكربت يبقى الرابط نفسه إن اخترت «إدارة عمليات النشر».
   ===================================================================== */

var SHEET_ID   = "";          /* اتركه فارغاً لاستخدام الجدول المرتبط بالسكربت */
var SHEET_NAME = "redeemed";
var CODE_LEN   = 14;

function doGet(e) {
  var code = String((e && e.parameter && e.parameter.code) || "").trim();
  if (code.length !== CODE_LEN) return json({ ok: false, reason: "bad" });

  var lock = LockService.getScriptLock();
  try { lock.waitLock(20000); } catch (err) { return json({ ok: false, reason: "busy" }); }
  try {
    var sh  = sheet();
    var hit = sh.createTextFinder(code).matchEntireCell(true).findNext();
    if (hit) return json({ ok: false, reason: "used" });
    sh.appendRow([code, new Date()]);
    return json({ ok: true });
  } finally {
    lock.releaseLock();
  }
}

function sheet() {
  var ss = SHEET_ID ? SpreadsheetApp.openById(SHEET_ID) : SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow(["code", "redeemed_at"]);
  }
  return sh;
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/* اختبار سريع من داخل المحرر: يجب أن يعطي ok=true أول مرة و used ثانية مرة */
function testRedeem() {
  Logger.log(doGet({ parameter: { code: "TEST-CODE-1234" } }).getContent());
  Logger.log(doGet({ parameter: { code: "TEST-CODE-1234" } }).getContent());
}
