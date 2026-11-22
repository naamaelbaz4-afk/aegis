// ===================================================
//  חלק 1: מעבר בין העמודים
//  כל ארבעת העמודים נמצאים באותו קובץ HTML.
//  הקוד מסתיר את כולם ומציג רק את העמוד שנבחר.
// ===================================================

// פונקציה שמקבלת שם של עמוד (home / alerts / about / history) ומציגה אותו
function showPage(id) {
  // עוברים על כל העמודים: לעמוד שנבחר מוסיפים את המחלקה active (מוצג), ומהשאר מורידים אותה (מוסתרים)
  document.querySelectorAll(".page").forEach(page => page.classList.toggle("active", page.id === id));

  // אותו דבר לכפתורים בתפריט: הכפתור של העמוד הנוכחי מסומן
  document.querySelectorAll(".nav-btn").forEach(btn => btn.classList.toggle("active", btn.dataset.page === id));

  // גוללים לראש הדף
  window.scrollTo(0, 0);

  // המפה צריכה לחשב מחדש את הגודל שלה כשהעמוד שלה מופיע, אחרת היא נראית שבורה
  if (id === "alerts") map.invalidateSize();
}

// כל אלמנט ב-HTML עם data-page (כפתורי התפריט, הלוגו, כפתורים בעמוד הבית)
// מקבל אירוע לחיצה שמעביר לעמוד שכתוב בו
document.querySelectorAll("[data-page]").forEach(element => {
  element.onclick = () => showPage(element.dataset.page);
});


// ===================================================
//  חלק 2: הדיווחים
//  אין יותר נתוני דמה: כל הדיווחים מגיעים מהשרת,
//  ורק אני והחברים שהצטרפו עם הקוד יכולים לדווח.
// ===================================================

// כל הדיווחים מהשרת, מ-48 השעות האחרונות (של כל חברי המערכת)
let reports = [];
// מתוכם: האירועים הפעילים עכשיו, והאירועים שהסתיימו (ההיסטוריה)
let alerts = [];
let history = [];

let myPos = null;       // המיקום שלי (אחרי שהדפדפן מזהה אותו)
let selectedId = null;  // ההתראה שנבחרה ומוצגת על המפה
let timeOffset = 0;     // ההפרש בין השעון של השרת לשעון של המכשיר
let rounds = 0;         // כמה פעמים רץ העדכון

const EVENT_LENGTH = 180;  // כמה שניות אירוע נשאר פעיל עד שהוא עובר להיסטוריה (3 דקות)

// הטקסט בדיווחים מגיע מאנשים אחרים, אז הופכים תווים כמו < לטקסט רגיל,
// כדי שאי אפשר יהיה להכניס דרכו קוד לאתר
const safe = text => String(text).replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

// ---------- הגדרות השרת ----------
// הכתובת של השרת שלנו ב-Cloudflare (מעתיקים אותה מדף ה-Worker אחרי שיוצרים אותו)
const SERVER_URL = "https://aegis-server.naamaelbaz4.workers.dev";


// ===================================================
//  חלק 3: המפה (Leaflet + OpenStreetMap, חינם ובלי מפתח)
// ===================================================

// יוצרים מפה בתוך ה-div שה-id שלו הוא map, וממקמים אותה על צפון הארץ בזום 10
const map = L.map("map").setView([32.7, 35.4], 10);

// המפה של OpenStreetMap: חינמית ולא צריכה מפתח. הצבעים הכהים מגיעים מ-CSS
L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap",  // הקרדיט שחייבים להציג למפה
  maxZoom: 19                      // כמה אפשר להתקרב
}).addTo(map);

// שכבה שמחזיקה את כל הנקודות שעל המפה, כדי שנוכל למחוק ולצייר אותן מחדש
const markers = L.layerGroup().addTo(map);

// הצבע של כל נקודה לפי מצב ההתראה: אדום, צהוב או כחול
const colors = { new: "#ff3d57", checking: "#ffb627", confirmed: "#4c8dff" };

// מציירים על המפה את כל ההתראות ואת המיקום שלי
function drawMap() {
  // מוחקים את כל הנקודות הישנות
  markers.clearLayers();

  // אם המיקום שלי ידוע: נקודה ירוקה עם הכיתוב "אני כאן"
  if (myPos) {
    L.circleMarker([myPos.lat, myPos.lon], { radius: 8, color: "white", weight: 2, fillColor: "#2ecc71", fillOpacity: 1 })
      .bindTooltip("אני כאן", { permanent: true, direction: "bottom" })
      .addTo(markers);
  }

  // נקודה לכל התראה פעילה
  alerts.forEach(alert => {
    if (alert.lat == null) return;  // דיווח בלי מיקום לא מופיע על המפה
    const selected = alert.id === selectedId;  // האם זו ההתראה שנבחרה

    // עיגול בצבע של מצב ההתראה. ההתראה שנבחרה מצוירת גדולה יותר
    const marker = L.circleMarker([alert.lat, alert.lon], {
      radius: selected ? 13 : 8, color: "white", weight: 2,
      fillColor: colors[getStatus(alert.age).cls], fillOpacity: 1
    }).addTo(markers);

    // לחיצה על הנקודה בוחרת את ההתראה
    marker.on("click", () => selectAlert(alert.id));

    // מעל ההתראה שנבחרה מופיע סוג האירוע
    if (selected) marker.bindTooltip(safe(alert.type), { permanent: true, direction: "top" });
  });
}

// לחיצה על התראה: המפה מראה גם את האירוע וגם אותי
function selectAlert(id) {
  selectedId = id;

  // מוצאים את ההתראה לפי המספר שלה
  const alert = alerts.find(a => a.id === id);

  if (alert && alert.lat != null) {
    // הנקודות שהמפה צריכה להראות: האירוע, ואם המיקום שלי ידוע, גם אני
    const points = [[alert.lat, alert.lon]];
    if (myPos) points.push([myPos.lat, myPos.lon]);

    // המפה זזה ומתקרבת כך שכל הנקודות נכנסות למסך
    map.fitBounds(points, { padding: [70, 70], maxZoom: 16 });
  }

  // מציירים מחדש, כדי שההתראה שנבחרה תסומן ברשימה ועל המפה
  renderAlerts();
}

// המרחק האמיתי ביני לבין האירוע
function distanceFromMe(alert) {
  // אם המיקום שלי או של האירוע לא ידוע, אי אפשר לחשב
  if (!myPos || alert.lat == null) return "לא ידוע";

  // Leaflet מחשבת את המרחק במטרים, ומחלקים ב-1000 כדי לקבל קילומטרים
  const km = map.distance([myPos.lat, myPos.lon], [alert.lat, alert.lon]) / 1000;

  // פחות מ-100 מטר נחשב "במקום". אחרת מציגים מספר עם ספרה אחת אחרי הנקודה
  return km < 0.1 ? "במקום" : km.toFixed(1) + " ק״מ";
}

// שומרים את המיקום שהדפדפן זיהה
function savePosition(position) {
  myPos = {
    lat: position.coords.latitude,                   // קו רוחב
    lon: position.coords.longitude,                  // קו אורך
    accuracy: Math.round(position.coords.accuracy)  // ברדיוס של כמה מטרים המיקום מדויק
  };
  // אם יש התראה מסומנת: מזיזים את המפה כך שיראו גם אותה וגם אותי.
  // אחרת רק מציירים מחדש, כדי שהמרחקים והנקודה "אני כאן" יתעדכנו
  if (selectedId !== null) selectAlert(selectedId);
  else renderAlerts();
}


// ===================================================
//  חלק 4: דיווח על פיגוע
// ===================================================

// כפתור הדיווח בעמוד הבית: מזהה לבד את המיקום של המדווח
function sendReport() {
  // סוג האירוע שנבחר ברשימה
  const type = document.getElementById("reportType").value;

  // משנים את הטקסט של הכפתור, כדי שהמשתמש יידע שמשהו קורה
  document.getElementById("reportBtn").textContent = "מאתר את המיקום שלך...";

  // מבקשים מהדפדפן את המיקום (בפעם הראשונה הוא שואל אם לאשר)
  navigator.geolocation.getCurrentPosition(
    // אם המיקום זוהה: שומרים אותו וממשיכים לדיווח
    position => {
      savePosition(position);
      finishReport(type, myPos.lat, myPos.lon);
    },
    // אם המיקום לא זוהה: הדיווח נשלח בכל זאת, בלי מיקום
    () => finishReport(type, null, null),
    // מחכים עד 10 שניות, ומבקשים את המיקום הכי מדויק (GPS אם יש)
    { timeout: 10000, enableHighAccuracy: true }
  );
}

// משלימים את הדיווח: מוצאים כתובת, מוסיפים התראה ועוברים לעמוד ההתראות
// async אומר שהפונקציה יכולה לחכות (await) לתשובה מהאינטרנט
async function finishReport(type, lat, lon) {
  let place = "המיקום לא זוהה";

  if (lat != null) {
    document.getElementById("reportBtn").textContent = "מאתר את הכתובת...";
    // מחכים לכתובת, ומוסיפים לידה את רמת הדיוק
    place = await getAddress(lat, lon) + ` <small>(דיוק של כ־${myPos.accuracy} מטר)</small>`;
  }

  // שולחים את הדיווח לשרת. השרת שומר אותו ושולח התראה לכל מי שבטווח
  document.getElementById("reportBtn").textContent = "שולח את הדיווח...";
  const report = await notifyPhone(type, place, lat, lon, "דיווח מהאתר");

  // מחזירים את הכפתור למצב הרגיל, עוברים לעמוד ההתראות ומראים את הדיווח על המפה
  document.getElementById("reportBtn").textContent = "דיווח על פיגוע";
  if (!report) return;
  showPage("alerts");
  selectAlert(report.id);
}

// הופכים קואורדינטות לכתובת (רחוב ועיר) בעזרת OpenStreetMap, חינם ובלי מפתח
async function getAddress(lat, lon) {
  // try: מנסים. אם משהו נכשל, עוברים ל-catch
  try {
    // הכתובת של השירות, עם המיקום שלנו ובקשה לתשובה בעברית
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&accept-language=he`;

    // שולחים את הבקשה, ומחכים עד 5 שניות לתשובה
    const response = await fetch(url, { signal: AbortSignal.timeout(5000) });

    // הופכים את התשובה לאובייקט שאפשר לקרוא ממנו
    const data = await response.json();
    const a = data.address;

    // אם יש רחוב: רחוב ומספר בית. אם אין (למשל בתוך קמפוס): שם המקום
    const first = a.road ? (a.road + " " + (a.house_number || "")).trim() : data.name;

    // העיר: לוקחים את הראשון שקיים מבין עיר, יישוב, כפר או מועצה
    const city = a.city || a.town || a.village || a.municipality || "";

    // מחברים את שני החלקים עם פסיק, ומדלגים על חלק ריק
    return [first, city].filter(part => part).join(", ") || data.display_name;
  } catch {
    // אם אין אינטרנט או שהשירות לא ענה, מציגים קואורדינטות
    return `<span dir="ltr">${lat.toFixed(4)}, ${lon.toFixed(4)}</span>`;
  }
}

// לחיצה על כפתור SOS באיור, בדיוק כמו בעמוד המצוקה האמיתי
// לעמוד יש מיקום קבוע, אז לא צריך לזהות מיקום
async function pressSOS() {
  const report = await notifyPhone("לחיצה על לחצן מצוקה", "עמוד 12, רחוב הגליל, טבריה", 32.7880, 35.5380, "עמוד מצוקה");
  if (!report) return;
  showPage("alerts");
  selectAlert(report.id);
}

// ---------- התראות לטלפון דרך השרת שלנו ----------

// הקוד הסודי נשמר בדפדפן, כדי שלא צריך להקליד אותו כל פעם
function getCode() {
  let code = localStorage.getItem("aegisCode");
  if (!code) {
    code = prompt("כדי לדווח צריך את קוד ההצטרפות:");
    if (code) localStorage.setItem("aegisCode", code.trim());
  }
  return code ? code.trim() : null;
}

// שולחים בקשה לשרת עם הקוד הסודי, ומחזירים את התשובה
async function callServer(path, data) {
  const response = await fetch(SERVER_URL + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
  return response.json();
}

// שולחים את הדיווח לשרת. השרת שומר אותו, מחליט מי בטווח ושולח לו התראה
// מחזירים את הדיווח כפי שנשמר בשרת (עם מספר אירוע ושעה), או null אם נכשל
async function notifyPhone(type, place, lat, lon, source) {
  const code = getCode();
  if (!code) return null;

  // מורידים תגיות HTML מהמקום (למשל <small> של רמת הדיוק), כי בשרת נשמר רק טקסט
  const cleanPlace = place.replace(/<[^>]*>/g, "").trim();

  try {
    const result = await callServer("/report", { code, type, place: cleanPlace, lat, lon, source });
    if (!result.ok) {
      alert("השרת לא קיבל את הדיווח: " + result.error);
      if (result.error === "קוד שגוי") localStorage.removeItem("aegisCode");
      return null;
    }
    console.log("ההתראה נשלחה ל-" + result.sent + " טלפונים");

    // מוסיפים את הדיווח לרשימה מיד, בלי לחכות לטעינה הבאה מהשרת
    reports.unshift(result.report);
    rebuild();
    return result.report;
  } catch {
    alert("לא הצלחנו להתחבר לשרת. הדיווח לא נשלח.");
    return null;
  }
}

// טוענים מהשרת את כל הדיווחים מ-48 השעות האחרונות
async function loadReports() {
  const code = localStorage.getItem("aegisCode");
  if (!code) { rebuild(); return; }   // בלי קוד אין גישה לדיווחים
  try {
    const result = await callServer("/reports", { code });
    if (!result.ok) {
      if (result.error === "קוד שגוי") localStorage.removeItem("aegisCode");
      return;
    }
    reports = result.reports;
    timeOffset = result.now - Date.now();   // כדי שכל המכשירים יחשבו זמן לפי השעון של השרת
    rebuild();
  } catch {
    console.log("לא הצלחנו לטעון דיווחים מהשרת");
  }
}

// מכינים מראש את ה-Service Worker ואת המפתח של השרת,
// כי באייפון ההרשמה חייבת לקרות מיד כשלוחצים על הכפתור, בלי לחכות לאינטרנט
let swRegistration = null;
let serverKey = null;
async function prepareNotifications() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
  try {
    swRegistration = await navigator.serviceWorker.register("sw.js");
    serverKey = (await (await fetch(SERVER_URL + "/key")).json()).key;
  } catch {
    console.log("לא הצלחנו להכין את ההתראות");
  }
}

// כפתור "הפעלת התראות": נרשמים לקבלת התראות מהשרת
async function joinAlerts() {
  const status = document.getElementById("joinStatus");
  const code = document.getElementById("joinCode").value.trim() || localStorage.getItem("aegisCode");
  if (!code) { status.textContent = "צריך להכניס את קוד ההצטרפות."; return; }

  // בודקים שהדפדפן תומך בהתראות. באייפון צריך קודם להוסיף את האתר למסך הבית
  if (!swRegistration || !serverKey) {
    status.textContent = "אי אפשר להפעיל התראות כאן. באייפון: שיתוף ← הוספה למסך הבית, ולפתוח את AEGIS משם.";
    return;
  }

  try {
    // 1. מבקשים רשות להציג התראות
    const permission = await Notification.requestPermission();
    if (permission !== "granted") { status.textContent = "צריך לאשר התראות כדי לקבל אותן."; return; }

    // 2. נרשמים להתראות עם המפתח הציבורי של השרת
    const subscription = await swRegistration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: serverKey
    });

    // 3. בודקים את הקוד ושולחים לשרת את פרטי ההרשמה ואת המיקום
    status.textContent = "בודקים את הקוד...";
    localStorage.setItem("aegisCode", code);
    const result = await sendMyDetails(subscription);
    if (!result || !result.ok) {
      localStorage.removeItem("aegisCode");
      await subscription.unsubscribe();
      status.textContent = "הקוד לא נכון.";
      return;
    }
    status.textContent = "מעולה! ההתראות פעילות בטלפון הזה ✓";
    loadReports();
  } catch (err) {
    status.textContent = "משהו השתבש: " + err.message;
  }
}

// שולחים לשרת את פרטי ההרשמה ואת המיקום העדכני
function sendMyDetails(subscription) {
  const code = localStorage.getItem("aegisCode");
  return new Promise(resolve => {
    const send = (lat, lon) =>
      callServer("/subscribe", { code, subscription: subscription.toJSON(), lat, lon }).then(resolve, () => resolve(null));
    navigator.geolocation.getCurrentPosition(
      position => send(position.coords.latitude, position.coords.longitude),
      () => send(null, null),   // אם אין מיקום, נרשמים בלי מיקום ומקבלים את כל ההתראות
      { timeout: 10000, enableHighAccuracy: true }
    );
  });
}

// בכל פעם שפותחים את האפליקציה: מעדכנים בשרת את המיקום, כדי שהסינון לפי מרחק יהיה מדויק
async function refreshMyLocation() {
  if (!("serviceWorker" in navigator) || !localStorage.getItem("aegisCode")) return;
  const subscription = swRegistration && await swRegistration.pushManager.getSubscription();
  if (subscription) {
    sendMyDetails(subscription);
    document.getElementById("joinStatus").textContent = "ההתראות פעילות בטלפון הזה ✓";
  }
}

// כשנכנסים לאתר מהקישור שבהתראה: מציגים את האירוע מהקישור על המפה
function openAlertFromLink() {
  const params = new URLSearchParams(window.location.search);
  if (!params.has("type")) return;  // נכנסו לאתר רגיל, לא מהתראה

  // מחפשים את האירוע ברשימה שהגיעה מהשרת לפי המספר שלו
  const id = Number(params.get("id"));
  if (!reports.some(r => r.id === id)) {
    // אם הוא עוד לא ברשימה, בונים אותו מהפרטים שבקישור
    reports.unshift({
      id: id || Date.now(),
      type: params.get("type"),
      place: params.get("place") || "מיקום לא ידוע",
      source: "התראה שהתקבלה בטלפון",
      lat: params.has("lat") ? Number(params.get("lat")) : null,
      lon: params.has("lon") ? Number(params.get("lon")) : null,
      time: Date.now() + timeOffset
    });
    rebuild();
  }

  // אם האירוע כבר הסתיים (עברו יותר מ-3 דקות), הוא נמצא בעמוד ההיסטוריה
  const eventId = id || reports[0].id;
  if (!alerts.some(a => a.id === eventId)) { showPage("history"); return; }

  // אחרת עוברים לעמוד ההתראות ומסמנים אותו. כשהמיקום שלי יזוהה, המפה תראה את שנינו
  showPage("alerts");
  selectAlert(eventId);
}

// ===================================================
//  חלק 5: התראות בזמן אמת
// ===================================================

// מחלקים את הדיווחים לפעילים ולהיסטוריה, לפי כמה זמן עבר מאז הדיווח
function rebuild() {
  const now = Date.now() + timeOffset;
  alerts = [];
  history = [];
  reports.forEach(r => {
    const age = (now - r.time) / 1000;   // כמה שניות עברו מאז הדיווח
    if (age < EVENT_LENGTH) alerts.push({ ...r, age, time: new Date(r.time) });
    else history.push(toHistory(r));
  });
  renderAlerts();
  renderHistory();
}

// המצב של ההתראה נקבע לפי כמה זמן היא במערכת
// cls הוא שם המחלקה לצבע ב-CSS, ו-text הוא מה שמוצג למשתמש
function getStatus(age) {
  if (age < 20) return { cls: "new", text: "התראה חדשה" };       // 20 השניות הראשונות
  if (age < 60) return { cls: "checking", text: "באימות" };        // עד דקה
  return { cls: "confirmed", text: "מאומת · כוחות בדרך" };          // עד שהאירוע מסתיים
}

// בונים את רשימת ההתראות על המסך
function renderAlerts() {
  // מונים כמה התראות יש בכל מצב, בשביל הקופסאות שבראש העמוד
  const counts = { new: 0, checking: 0, confirmed: 0 };
  let html = "";

  alerts.forEach(alert => {
    const status = getStatus(alert.age);
    counts[status.cls]++;

    // בונים כרטיס HTML לכל התראה. ${...} מכניס ערך של משתנה לתוך הטקסט
    // לחיצה על הכרטיס קוראת ל-selectAlert ומראה את ההתראה על המפה
    html += `
      <div class="alert ${status.cls} ${alert.id === selectedId ? "selected" : ""}" onclick="selectAlert(${alert.id})">
        <div>
          <h3>${safe(alert.type)}</h3>
          <div class="alert-info">
            <span>מיקום: <b>${safe(alert.place)}</b></span>
            <span>מקור: <b>${safe(alert.source)}</b></span>
            <span>מרחק ממך: <b>${distanceFromMe(alert)}</b></span>
            <span>התקבלה: <b>${alert.time.toLocaleTimeString("he-IL")}</b></span>
          </div>
        </div>
        <div class="status">${status.text}</div>
      </div>`;
  });

  // מכניסים את כל הכרטיסים לדף. אם אין התראות, מציגים הודעה
  const emptyText = localStorage.getItem("aegisCode")
    ? "אין כרגע אירועים פעילים. המערכת ממשיכה לנטר."
    : "כדי לראות דיווחים צריך להצטרף עם קוד, בקופסה \"קבלת התראות לטלפון\" בעמוד הבית.";
  document.getElementById("alertsList").innerHTML = html || `<div class="empty">${emptyText}</div>`;

  // מעדכנים את המספרים בקופסאות ובתפריט
  document.getElementById("countNew").textContent = counts.new;
  document.getElementById("countChecking").textContent = counts.checking;
  document.getElementById("countConfirmed").textContent = counts.confirmed;
  document.getElementById("navCount").textContent = alerts.length;

  // מעדכנים גם את המפה
  drawMap();
}

// הופכים דיווח שהסתיים לרשומה בהיסטוריה
function toHistory(r) {
  const start = new Date(r.time);
  const end = new Date(r.time + EVENT_LENGTH * 1000);
  return {
    id: r.id,
    type: r.type,
    place: r.place,
    date: start.toLocaleDateString("he-IL"),               // התאריך של הדיווח
    start: start.toLocaleTimeString("he-IL").slice(0, 5),  // שעת הדיווח, רק שעות ודקות
    end: end.toLocaleTimeString("he-IL").slice(0, 5),      // השעה שבה האירוע הסתיים
    minutes: Math.round(EVENT_LENGTH / 60),                // משך האירוע בדקות
    sources: r.source,
    summary: "האירוע הסתיים. הוא יימחק מההיסטוריה 48 שעות אחרי הדיווח."
  };
}

// רץ כל 5 שניות: אירוע שעברו עליו 3 דקות עובר להיסטוריה,
// וכל 20 שניות טוענים מהשרת דיווחים חדשים של החברים
function update() {
  rounds++;
  if (rounds % 4 === 0) loadReports();
  else rebuild();
}

// ===================================================
//  חלק 6: היסטוריה
// ===================================================

// בונים את כרטיסי האירועים בעמוד ההיסטוריה
function renderHistory() {
  // מה שהמשתמש הקליד בתיבת החיפוש
  const search = document.getElementById("search").value.trim();
  let html = "";
  let totalMinutes = 0;

  history.forEach(event => {
    // סוכמים את כל הדקות, בשביל הממוצע
    totalMinutes += event.minutes;

    // מציגים רק אירועים שמתאימים לחיפוש
    if (!(event.type + event.place + event.date).includes(search)) return;

    // כרטיס HTML לכל אירוע
    html += `
      <div class="event">
        <div class="event-top">
          <span class="event-id">אירוע #${event.id}</span>
          <span class="ended">הסתיים</span>
        </div>
        <h3>${safe(event.type)}</h3>
        <div class="event-place">${safe(event.place)}</div>
        <div class="event-table">
          <span>תאריך</span><b>${event.date}</b>
          <span>התחלה</span><b>${event.start}</b>
          <span>סיום</span><b>${event.end}</b>
          <span>משך טיפול</span><b>${event.minutes} דקות</b>
          <span>מקור הדיווח</span><b>${safe(event.sources)}</b>
        </div>
        <p>${event.summary}</p>
      </div>`;
  });

  // מכניסים את הכרטיסים לדף. אם החיפוש לא מצא כלום, מציגים הודעה
  const emptyText = history.length ? "לא נמצאו אירועים מתאימים לחיפוש." : "עוד אין אירועים שהסתיימו ב-48 השעות האחרונות.";
  document.getElementById("historyList").innerHTML = html || `<div class="empty">${emptyText}</div>`;

  // הסיכום שבראש העמוד: כמה אירועים, וכמה דקות טיפול בממוצע
  document.getElementById("historyTotal").textContent = history.length;
  document.getElementById("historyAvg").textContent = history.length ? Math.round(totalMinutes / history.length) : 0;
}

// בכל פעם שמקלידים בתיבת החיפוש, הרשימה מתעדכנת
document.getElementById("search").oninput = renderHistory;


// ===================================================
//  חלק 7: הפעלה
//  הקוד כאן רץ פעם אחת, כשהדף נטען
// ===================================================

// שעון חי בעמוד ההתראות
function showClock() {
  document.getElementById("clock").textContent = new Date().toLocaleTimeString("he-IL");
}

// טוענים את הדיווחים מהשרת, ואם נכנסו מהקישור שבהתראה מציגים את האירוע
loadReports().then(openAlertFromLink);

// מכינים את ההתראות, ואם הטלפון כבר רשום מעדכנים בשרת את המיקום
prepareNotifications().then(refreshMyLocation);

// מזהים את המיקום שלי, כדי להציג אותו על המפה ולחשב מרחקים
navigator.geolocation.getCurrentPosition(savePosition);

showClock();                  // מציגים את השעון מיד
setInterval(showClock, 1000); // ומעדכנים אותו כל שנייה
setInterval(update, 5000);    // ההתראות מתעדכנות כל 5 שניות