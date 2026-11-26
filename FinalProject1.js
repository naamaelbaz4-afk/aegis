// ===================================================
//  חלק 1: העמודים והכניסה
//  לכל עמוד יש קובץ HTML משלו: login (כניסה והרשמה), index (בית),
//  alerts (התראות), about (אודות) ו-history (היסטוריה). כולם משתמשים בקובץ JS הזה.
// ===================================================

// באיזה עמוד אנחנו עכשיו: כתוב ב-data-page של ה-body בכל קובץ HTML
const PAGE = document.body.dataset.page;

// ---------- כניסה למערכת ----------
// אחרי כניסה מוצלחת השרת נותן "token": מחרוזת סודית שמזהה את המשתמש.
// שומרים אותה בדפדפן, ושולחים אותה לשרת בכל בקשה
const TOKEN = localStorage.getItem("plumeraToken");
const USERNAME = localStorage.getItem("plumeraUser");

// מוחקים את הקוד הקבוע של הגרסה הקודמת, שכבר לא בשימוש
localStorage.removeItem("aegisCode");

// בלי כניסה אי אפשר לראות את האתר: עוברים לעמוד הכניסה.
// ומי שכבר מחובר ונכנס לעמוד הכניסה, עובר לעמוד הבית
if (PAGE !== "login" && !TOKEN) location.replace("login.html");
if (PAGE === "login" && TOKEN) location.replace("index.html");

// מוחקים את פרטי הכניסה מהדפדפן
function clearLogin() {
  localStorage.removeItem("plumeraToken");
  localStorage.removeItem("plumeraUser");
}

// מעבר לעמוד אחר באתר, למשל goTo("alerts") פותח את alerts.html
function goTo(page, search = "") {
  location.href = page + ".html" + search;
}

// הקישור שבהתראה בטלפון פותח את האתר עם מספר האירוע.
// אם הוא נפתח בעמוד הבית, עוברים מיד לעמוד ההתראות עם אותם פרטים
if (PAGE === "home" && new URLSearchParams(location.search).has("id")) {
  location.replace("alerts.html" + location.search);
}

// לא כל האלמנטים נמצאים בכל עמוד (למשל המפה נמצאת רק בעמוד ההתראות),
// אז משנים טקסט רק אם האלמנט קיים בעמוד הנוכחי
function setText(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = value;
}
function setHTML(id, value) {
  const element = document.getElementById(id);
  if (element) element.innerHTML = value;
}


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

// המפה נמצאת רק בעמוד ההתראות. בשאר העמודים map נשאר null
let map = null;
let markers = null;

if (document.getElementById("map")) {
  // יוצרים מפה בתוך ה-div שה-id שלו הוא map, וממקמים אותה על צפון הארץ בזום 10
  map = L.map("map").setView([32.7, 35.4], 10);

  // המפה של OpenStreetMap: חינמית ולא צריכה מפתח
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap",  // הקרדיט שחייבים להציג למפה
    maxZoom: 19                      // כמה אפשר להתקרב
  }).addTo(map);

  // שכבה שמחזיקה את כל הנקודות שעל המפה, כדי שנוכל למחוק ולצייר אותן מחדש
  markers = L.layerGroup().addTo(map);
}

// הצבע של כל נקודה לפי מצב ההתראה: אדום, צהוב או כחול
const colors = { new: "#e5484d", checking: "#e09b00", confirmed: "#3b7dd8" };

// מציירים על המפה את כל ההתראות ואת המיקום שלי
function drawMap() {
  // אם אין מפה בעמוד הזה, אין מה לצייר
  if (!map) return;

  // מוחקים את כל הנקודות הישנות
  markers.clearLayers();

  // אם המיקום שלי ידוע: נקודה ירוקה עם הכיתוב "אני כאן"
  if (myPos) {
    L.circleMarker([myPos.lat, myPos.lon], { radius: 8, color: "white", weight: 2, fillColor: "#2f9e5b", fillOpacity: 1 })
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

  if (map && alert && alert.lat != null) {
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

  // המרחק בקילומטרים לפי נוסחת Haversine (מרחק על פני כדור הארץ)
  const rad = d => d * Math.PI / 180;
  const a = Math.sin(rad(alert.lat - myPos.lat) / 2) ** 2 +
            Math.cos(rad(myPos.lat)) * Math.cos(rad(alert.lat)) * Math.sin(rad(alert.lon - myPos.lon) / 2) ** 2;
  const km = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

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
  // אין בחירה של סוג אירוע: כל דיווח נשלח בשם אחד
  const type = "דיווח על פיגוע";

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
    // מחכים לכתובת (רחוב ועיר)
    place = await getAddress(lat, lon);
    // אם הכתובת לא הגיעה בפעם הראשונה, מנסים פעם נוספת
    if (place.startsWith("<span")) place = await getAddress(lat, lon);
  }

  // שולחים את הדיווח לשרת. השרת שומר אותו ושולח התראה לכל המשתמשים
  document.getElementById("reportBtn").textContent = "שולח את הדיווח...";
  const report = await notifyPhone(type, place, lat, lon, "דיווח מהאתר");

  // מחזירים את הכפתור למצב הרגיל, ועוברים לעמוד ההתראות עם מספר הדיווח, כדי שיופיע על המפה
  document.getElementById("reportBtn").textContent = "דיווח על פיגוע";
  if (!report) return;
  goTo("alerts", "?id=" + report.id);
}

// הופכים קואורדינטות לכתובת (רחוב ועיר) בעזרת OpenStreetMap, חינם ובלי מפתח
async function getAddress(lat, lon) {
  // try: מנסים. אם משהו נכשל, עוברים ל-catch
  try {
    // הכתובת של השירות, עם המיקום שלנו ובקשה לתשובה בעברית
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&accept-language=he`;

    // שולחים את הבקשה, ומחכים עד 10 שניות לתשובה
    const response = await fetch(url, { signal: AbortSignal.timeout(10000) });

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

// ---------- התראות לטלפון דרך השרת שלנו ----------

// שולחים בקשה לשרת ומחזירים את התשובה.
// אם המשתמש מחובר, מצרפים את ה-token בכותרת Authorization כדי שהשרת יידע מי הוא
async function callServer(path, data = {}) {
  const headers = { "Content-Type": "application/json" };
  const token = localStorage.getItem("plumeraToken");
  if (token) headers.Authorization = "Bearer " + token;

  const response = await fetch(SERVER_URL + path, {
    method: "POST",
    headers,
    body: JSON.stringify(data)
  });
  const result = await response.json();

  // 401 אומר שהחיבור פג תוקף או נמחק: צריך להתחבר מחדש
  if (response.status === 401 && path !== "/login") {
    clearLogin();
    location.replace("login.html");
  }
  return result;
}

// שולחים את הדיווח לשרת. השרת שומר אותו ושולח התראה לכל המשתמשים
// מחזירים את הדיווח כפי שנשמר בשרת (עם מספר אירוע ושעה), או null אם נכשל
async function notifyPhone(type, place, lat, lon, source) {
  // מורידים תגיות HTML מהמקום (למשל <small> של רמת הדיוק), כי בשרת נשמר רק טקסט
  const cleanPlace = place.replace(/<[^>]*>/g, "").trim();

  try {
    const result = await callServer("/report", { type, place: cleanPlace, lat, lon, source });
    if (!result.ok) {
      alert("השרת לא קיבל את הדיווח: " + result.error);
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
  try {
    const result = await callServer("/reports");
    if (!result.ok) return;
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

// כפתור "הפעלת התראות": הטלפון של המשתמש המחובר נרשם לקבלת התראות מהשרת
async function joinAlerts() {
  const status = document.getElementById("joinStatus");

  // בודקים שהדפדפן תומך בהתראות. באייפון צריך קודם להוסיף את האתר למסך הבית
  if (!swRegistration || !serverKey) {
    status.textContent = "אי אפשר להפעיל התראות כאן. באייפון: שיתוף ← הוספה למסך הבית, ולפתוח את PLUMERA משם.";
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

    // 3. שולחים לשרת את פרטי ההרשמה ואת המיקום. השרת שומר אותם בטבלת subscriptions
    status.textContent = "שומרים בשרת...";
    const result = await sendMyDetails(subscription);
    if (!result || !result.ok) {
      await subscription.unsubscribe();
      status.textContent = "השרת לא שמר את ההרשמה. נסו שוב.";
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
  return new Promise(resolve => {
    const send = (lat, lon) =>
      callServer("/subscribe", { subscription: subscription.toJSON(), lat, lon }).then(resolve, () => resolve(null));
    navigator.geolocation.getCurrentPosition(
      position => send(position.coords.latitude, position.coords.longitude),
      () => send(null, null),   // אם אין מיקום, נרשמים בלי מיקום ומקבלים את כל ההתראות
      { timeout: 10000, enableHighAccuracy: true }
    );
  });
}

// בכל פעם שפותחים את האפליקציה: מעדכנים בשרת את המיקום, כדי שהמרחק בהתראה יהיה מדויק
async function refreshMyLocation() {
  if (!("serviceWorker" in navigator) || !TOKEN) return;
  const subscription = swRegistration && await swRegistration.pushManager.getSubscription();
  if (subscription) {
    sendMyDetails(subscription);
    setText("joinStatus", "ההתראות פעילות בטלפון הזה ✓");
  }
}

// כשנכנסים לאתר מהקישור שבהתראה: מציגים את האירוע מהקישור על המפה
function openAlertFromLink() {
  const params = new URLSearchParams(window.location.search);
  if (!params.has("id")) return;  // נכנסו לעמוד רגיל, לא מהתראה או מדיווח

  // מחפשים את האירוע ברשימה שהגיעה מהשרת לפי המספר שלו
  const id = Number(params.get("id"));
  if (!reports.some(r => r.id === id)) {
    // אם הוא עוד לא ברשימה, בונים אותו מהפרטים שבקישור
    reports.unshift({
      id: id || Date.now(),
      type: params.get("type") || "דיווח על פיגוע",
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
  if (!alerts.some(a => a.id === eventId)) { location.replace("history.html"); return; }

  // אחרת מסמנים אותו על המפה. כשהמיקום שלי יזוהה, המפה תראה את שנינו
  selectAlert(eventId);
}

// ---------- עמוד הכניסה: כניסה, הרשמה ויציאה ----------

// מעבר בין הלשונית "כניסה" ללשונית "הרשמה"
function showTab(tab) {
  document.getElementById("loginForm").hidden = tab !== "login";
  document.getElementById("registerForm").hidden = tab !== "register";
  document.getElementById("tabLogin").classList.toggle("active", tab === "login");
  document.getElementById("tabRegister").classList.toggle("active", tab === "register");
  setText("loginStatus", "");
}

// אחרי כניסה או הרשמה מוצלחת: שומרים את ה-token ואת שם המשתמש, ועוברים לעמוד הבית
function finishLogin(result) {
  localStorage.setItem("plumeraToken", result.token);
  localStorage.setItem("plumeraUser", result.username);
  location.replace("index.html");
}

// כניסה עם שם משתמש וסיסמה
async function doLogin(event) {
  event.preventDefault();   // הטופס לא טוען את הדף מחדש
  setText("loginStatus", "מתחברים...");
  try {
    const result = await callServer("/login", {
      username: document.getElementById("loginUser").value.trim(),
      password: document.getElementById("loginPass").value
    });
    if (!result.ok) { setText("loginStatus", result.error); return; }
    finishLogin(result);
  } catch {
    setText("loginStatus", "אין חיבור לשרת. נסו שוב.");
  }
}

// הרשמה: קוד הצטרפות, שם משתמש וסיסמה פעמיים
async function doRegister(event) {
  event.preventDefault();
  const password = document.getElementById("regPass").value;
  if (password !== document.getElementById("regPass2").value) {
    setText("loginStatus", "שתי הסיסמאות לא זהות.");
    return;
  }
  setText("loginStatus", "יוצרים משתמש...");
  try {
    const result = await callServer("/register", {
      joinCode: document.getElementById("regCode").value.trim(),
      username: document.getElementById("regUser").value.trim(),
      password
    });
    if (!result.ok) { setText("loginStatus", result.error); return; }
    finishLogin(result);
  } catch {
    setText("loginStatus", "אין חיבור לשרת. נסו שוב.");
  }
}

// יציאה: השרת מוחק את החיבור, והטלפון הזה מפסיק לקבל התראות
async function logout() {
  if (!confirm("לצאת מהמערכת? הטלפון הזה יפסיק לקבל התראות עד הכניסה הבאה.")) return;
  try {
    const subscription = swRegistration && await swRegistration.pushManager.getSubscription();
    await callServer("/logout", { endpoint: subscription ? subscription.endpoint : null });
    if (subscription) await subscription.unsubscribe();
  } catch {
    console.log("לא הצלחנו להודיע לשרת על היציאה");
  }
  clearLogin();
  location.replace("login.html");
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
    // כל דיווח מוצג בשם אחד, ומורידים מהכתובת את "(דיוק של כ־X מטר)" של דיווחים ישנים
    r = { ...r, type: "דיווח על פיגוע", place: String(r.place).replace(/\s*\(דיוק של[^)]*\)/, "") };
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
            ${alert.reporter ? `<span>דיווח של: <b>${safe(alert.reporter)}</b></span>` : ""}
            <span>מרחק ממך: <b>${distanceFromMe(alert)}</b></span>
            <span>התקבלה: <b>${alert.time.toLocaleTimeString("he-IL")}</b></span>
          </div>
        </div>
        <div class="status">${status.text}</div>
      </div>`;
  });

  // מכניסים את כל הכרטיסים לדף. אם אין התראות, מציגים הודעה
  const emptyText = "אין כרגע אירועים פעילים. המערכת ממשיכה לנטר.";
  setHTML("alertsList", html || `<div class="empty">${emptyText}</div>`);

  // מעדכנים את המספרים בקופסאות (בעמוד ההתראות) ובתפריט (בכל העמודים)
  setText("countNew", counts.new);
  setText("countChecking", counts.checking);
  setText("countConfirmed", counts.confirmed);
  setText("navCount", alerts.length);

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
    reporter: r.reporter || "—",                           // שם המשתמש שדיווח (בעמוד המצוקה אין משתמש)
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
  // ההיסטוריה מוצגת רק בעמוד ההיסטוריה
  if (PAGE !== "history") return;

  // מה שהמשתמש הקליד בתיבת החיפוש
  const search = document.getElementById("search").value.trim();
  let html = "";
  let totalMinutes = 0;

  history.forEach(event => {
    // סוכמים את כל הדקות, בשביל הממוצע
    totalMinutes += event.minutes;

    // מציגים רק אירועים שמתאימים לחיפוש
    if (!(event.type + event.place + event.date + event.reporter).includes(search)) return;

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
          <span>דיווח של</span><b>${safe(event.reporter)}</b>
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
if (PAGE === "history") document.getElementById("search").oninput = renderHistory;


// ===================================================
//  חלק 7: הפעלה
//  הקוד כאן רץ פעם אחת, כשהדף נטען
// ===================================================

// שעון חי בעמוד ההתראות
function showClock() {
  setText("clock", new Date().toLocaleTimeString("he-IL"));
}

// בעמוד הכניסה לא טוענים כלום, רק מחכים שהמשתמש יתחבר
if (PAGE !== "login" && TOKEN) {
  // שם המשתמש המחובר בסרגל העליון
  setText("userName", USERNAME);

  // טוענים את הדיווחים מהשרת. בעמוד ההתראות: אם הגיעו עם מספר אירוע, מציגים אותו על המפה
  loadReports().then(() => { if (PAGE === "alerts") openAlertFromLink(); });

  // מכינים את ההתראות, ואם הטלפון כבר רשום מעדכנים בשרת את המיקום
  prepareNotifications().then(refreshMyLocation);

  // מזהים את המיקום שלי, כדי להציג אותו על המפה ולחשב מרחקים
  navigator.geolocation.getCurrentPosition(savePosition);

  showClock();                  // מציגים את השעון מיד
  setInterval(showClock, 1000); // ומעדכנים אותו כל שנייה
  setInterval(update, 5000);    // ההתראות מתעדכנות כל 5 שניות
}
