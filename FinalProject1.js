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
//  חלק 2: נתוני הדמה
//  כרגע אין שרת אמיתי, אז המידע נשמר כאן במערכים.
// ===================================================

// התראות שנכנסות למערכת לבד, אחת כל 45 שניות (המיקומים בקירוב)
// לכל התראה: סוג אירוע, מקום, מקור הדיווח, וקו רוחב וקו אורך בשביל המפה
const incoming = [
  { type: "חשד לאירוע ירי", place: "שדרות רבין, עפולה", source: "מצלמה חכמה", lat: 32.6075, lon: 35.2920 },
  { type: "חשד לפיגוע דריסה", place: "תחנה מרכזית, נוף הגליל", source: "דיווח אזרח", lat: 32.7046, lon: 35.3245 },
  { type: "חשד לפיגוע דקירה", place: "רחוב הרצל, בית שאן", source: "עמוד מצוקה", lat: 32.4975, lon: 35.4980 },
  { type: "ריצה המונית חריגה", place: "טיילת טבריה", source: "מצלמה חכמה", lat: 32.7915, lon: 35.5410 }
];

// אירועים שכבר הסתיימו ומוצגים בעמוד ההיסטוריה
// לכל אירוע: מספר, סוג, מקום, תאריך, שעת התחלה וסיום, משך בדקות, מי אימת אותו, ותקציר
const history = [
  { id: 1008, type: "חשד לפיגוע דקירה", place: "רחוב הבנים, טבריה", date: "17.11.2026", start: "18:42", end: "19:05", minutes: 23,
    sources: "עמוד מצוקה, 2 מצלמות, 4 דיווחי אזרחים", summary: "האירוע אומת תוך פחות מדקה. כוחות הגיעו למקום, והציבור באזור קיבל עדכון על סיום האירוע." },
  { id: 1007, type: "לחיצה על לחצן מצוקה", place: "עמוד 7, טיילת טבריה", date: "16.11.2026", start: "21:10", end: "21:16", minutes: 6,
    sources: "עמוד מצוקה, מצלמה", summary: "המוקד בדק את תמונת המצלמה וזיהה לחיצה בטעות. לא נשלחה התראה לציבור." },
  { id: 1006, type: "חשד לאירוע ירי", place: "שדרות ירושלים, עפולה", date: "14.11.2026", start: "13:27", end: "14:02", minutes: 35,
    sources: "3 מצלמות, 9 דיווחי אזרחים", summary: "המצלמות זיהו ריצה המונית. נשלחה התראה ברדיוס 8 ק״מ, והאירוע נסגר אחרי שהכוחות סרקו את האזור." },
  { id: 1005, type: "חשד לפיגוע דריסה", place: "צומת גולני", date: "12.11.2026", start: "07:55", end: "08:20", minutes: 25,
    sources: "מצלמה, 6 דיווחי אזרחים", summary: "האירוע אומת משני מקורות. נהגים והולכי רגל באזור קיבלו הנחיה להתרחק מהצומת." },
  { id: 1004, type: "ריצה המונית חריגה", place: "שוק העירייה, בית שאן", date: "10.11.2026", start: "11:03", end: "11:12", minutes: 9,
    sources: "2 מצלמות", summary: "התברר שהייתה זו תקלה במערכת הכריזה בשוק. האירוע נסגר בלי התראה לציבור." },
  { id: 1003, type: "חשד לפיגוע דקירה", place: "תחנה מרכזית, נוף הגליל", date: "07.11.2026", start: "16:40", end: "17:01", minutes: 21,
    sources: "עמוד מצוקה, מצלמה, 3 דיווחי אזרחים", summary: "עד ראייה לחץ על לחצן המצוקה. האירוע אומת, והמגיבים הראשונים הגיעו למיקום המדויק של העמוד." },
  { id: 1002, type: "לחיצה על לחצן מצוקה", place: "עמוד 2, רחוב הרצל, עפולה", date: "04.11.2026", start: "09:15", end: "09:31", minutes: 16,
    sources: "עמוד מצוקה, 2 דיווחי אזרחים", summary: "אדם נזקק לעזרה רפואית ברחוב. האירוע הועבר לגורמי ההצלה ונסגר." },
  { id: 1001, type: "חשד לאירוע ירי", place: "שכונת שפירא, טבריה", date: "01.11.2026", start: "22:48", end: "23:30", minutes: 42,
    sources: "2 מצלמות, 11 דיווחי אזרחים", summary: "האירוע הראשון שתועד במערכת. נשלחה התראה ברדיוס 10 ק״מ, והאירוע נסגר אחרי סריקות בשטח." }
];

// משתנים שמשתנים תוך כדי שהאתר רץ
let alerts = [];        // ההתראות הפעילות עכשיו
let nextId = 1009;      // המספר של האירוע הבא
let rounds = 0;         // כמה פעמים רץ העדכון
let myPos = null;       // המיקום שלי (אחרי שהדפדפן מזהה אותו)
let selectedId = null;  // ההתראה שנבחרה ומוצגת על המפה

const EVENT_LENGTH = 180;  // כמה שניות אירוע נשאר פעיל עד שהוא מסתיים (3 דקות)

// ---------- הגדרות להתראה לטלפון (ntfy) ----------
// שם "הערוץ" שאליו נשלחות ההתראות. רק מי שנרשם לשם הזה באפליקציית ntfy יקבל אותן,
// לכן כדאי לבחור שם ארוך שאף אחד לא ינחש
const NTFY_TOPIC = "aegis-naama-7f3k9q";

// הכתובת של האתר באינטרנט (למשל ב-GitHub Pages). לחיצה על ההתראה בטלפון פותחת את הכתובת הזאת
const SITE_URL = "https://naamaelbaz4-afk.github.io/aegis/";


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
    if (selected) marker.bindTooltip(alert.type, { permanent: true, direction: "top" });
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

  // מוסיפים את ההתראה ללוח
  const id = addAlert(type, place, "דיווח מהאתר", lat, lon);

  // שולחים התראה לטלפון
  notifyPhone(type, place, lat, lon);

  // מחזירים את הכפתור למצב הרגיל, עוברים לעמוד ההתראות ומראים את הדיווח על המפה
  document.getElementById("reportBtn").textContent = "דיווח על פיגוע";
  showPage("alerts");
  selectAlert(id);
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
function pressSOS() {
  const id = addAlert("לחיצה על לחצן מצוקה", "עמוד 12, רחוב הגליל, טבריה", "עמוד מצוקה", 32.7880, 35.5380);
  notifyPhone("לחיצה על לחצן מצוקה", "עמוד 12, רחוב הגליל, טבריה", 32.7880, 35.5380);
  showPage("alerts");
  selectAlert(id);
}

// שולחים התראה לטלפון דרך השירות ntfy (חינם, בלי הרשמה ובלי שרת משלנו)
// בהתראה יש קישור לאתר, ובקישור נמצאים כל פרטי האירוע: סוג, מקום ומיקום על המפה
function notifyPhone(type, place, lat, lon) {
  // מורידים תגיות HTML מהמקום (למשל <small> של רמת הדיוק), כי בהתראה יש רק טקסט
  const cleanPlace = place.replace(/<[^>]*>/g, "").trim();

  // בונים את הקישור: הכתובת של האתר ועוד הפרטים של האירוע אחרי סימן השאלה
  const params = new URLSearchParams({ type: type, place: cleanPlace });
  if (lat != null) {
    params.set("lat", lat.toFixed(5));
    params.set("lon", lon.toFixed(5));
  }
  const link = SITE_URL + "?" + params.toString();

  // שולחים את ההתראה לשרת של ntfy, והוא מעביר אותה לכל טלפון שרשום לערוץ
  fetch("https://ntfy.sh/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      topic: NTFY_TOPIC,
      title: "AEGIS: התראה באזורך",
      message: type + " · " + cleanPlace + "\nלחצו כדי לראות על המפה איפה האירוע ואיפה אתם.",
      tags: ["rotating_light"],  // אייקון של צופר משטרה בהתראה
      priority: 5,               // עדיפות הכי גבוהה: ההתראה מצלצלת וקופצת על המסך
      click: link                // מה נפתח כשלוחצים על ההתראה
    })
  }).catch(() => console.log("לא הצלחנו לשלוח התראה לטלפון"));
}

// כשנכנסים לאתר מהקישור שבהתראה: מציגים את האירוע מהקישור על המפה
function openAlertFromLink() {
  const params = new URLSearchParams(window.location.search);
  if (!params.has("type")) return;  // נכנסו לאתר רגיל, לא מהתראה

  const lat = params.has("lat") ? Number(params.get("lat")) : null;
  const lon = params.has("lon") ? Number(params.get("lon")) : null;
  // הטקסט מהקישור מוצג בדף, אז הופכים תווים כמו < לטקסט רגיל, כדי שאי אפשר יהיה להכניס דרכו קוד
  const safe = text => text.replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const id = addAlert(safe(params.get("type")), safe(params.get("place") || "מיקום לא ידוע"), "התראה שהתקבלה בטלפון", lat, lon);

  // עוברים לעמוד ההתראות ומסמנים את האירוע. כשהמיקום שלי יזוהה, המפה תראה את שנינו
  showPage("alerts");
  selectAlert(id);
}


// ===================================================
//  חלק 5: התראות בזמן אמת
// ===================================================

// מוסיפים התראה לראש הרשימה. age = כמה שניות היא כבר במערכת
// age = 0 הוא ערך ברירת מחדל: אם לא שולחים אותו, ההתראה חדשה לגמרי
function addAlert(type, place, source, lat, lon, age = 0) {
  const id = nextId++;  // לוקחים מספר לאירוע, ומעלים את המונה לאירוע הבא

  // unshift מוסיף לתחילת המערך, כדי שההתראה החדשה תופיע ראשונה
  alerts.unshift({ id, type, place, source, lat, lon, age, time: new Date(Date.now() - age * 1000) });

  renderAlerts();
  return id;  // מחזירים את המספר, כדי שאפשר יהיה לבחור את ההתראה מיד
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
          <h3>${alert.type}</h3>
          <div class="alert-info">
            <span>מיקום: <b>${alert.place}</b></span>
            <span>מקור: <b>${alert.source}</b></span>
            <span>מרחק ממך: <b>${distanceFromMe(alert)}</b></span>
            <span>התקבלה: <b>${alert.time.toLocaleTimeString("he-IL")}</b></span>
          </div>
        </div>
        <div class="status">${status.text}</div>
      </div>`;
  });

  // מכניסים את כל הכרטיסים לדף. אם אין התראות, מציגים הודעה
  document.getElementById("alertsList").innerHTML = html || '<div class="empty">אין כרגע אירועים פעילים. המערכת ממשיכה לנטר.</div>';

  // מעדכנים את המספרים בקופסאות ובתפריט
  document.getElementById("countNew").textContent = counts.new;
  document.getElementById("countChecking").textContent = counts.checking;
  document.getElementById("countConfirmed").textContent = counts.confirmed;
  document.getElementById("navCount").textContent = alerts.length;

  // מעדכנים גם את המפה
  drawMap();
}

// אירוע שהסתיים עובר לראש ההיסטוריה
function moveToHistory(alert) {
  const now = new Date();

  // יוצרים רשומה חדשה בהיסטוריה עם כל המידע על האירוע
  history.unshift({
    id: alert.id,
    type: alert.type,
    place: alert.place,
    date: now.toLocaleDateString("he-IL"),                       // התאריך של היום
    start: alert.time.toLocaleTimeString("he-IL").slice(0, 5),  // שעת ההתחלה, רק שעות ודקות
    end: now.toLocaleTimeString("he-IL").slice(0, 5),           // שעת הסיום
    minutes: Math.round(EVENT_LENGTH / 60),                     // משך האירוע בדקות
    sources: alert.source + ", מצלמות באזור",
    summary: "האירוע אומת וטופל, והציבור קיבל עדכון על סיומו."
  });

  renderHistory();
}

// רץ כל 5 שניות: ההתראות מתקדמות, ורק אירוע שהסתיים עובר להיסטוריה
function update() {
  rounds++;

  // כל ההתראות "מתבגרות" ב-5 שניות
  alerts.forEach(alert => alert.age += 5);

  // התראות שעבר עליהן כל הזמן של האירוע עוברות להיסטוריה
  alerts.filter(alert => alert.age >= EVENT_LENGTH).forEach(moveToHistory);

  // ונמחקות מרשימת ההתראות הפעילות
  alerts = alerts.filter(alert => alert.age < EVENT_LENGTH);

  // כל 45 שניות (כל 9 סיבובים) נכנסת התראה חדשה
  if (rounds % 9 === 0) {
    // בוחרים את ההתראה הבאה מרשימת הדמה, ובסוף הרשימה חוזרים להתחלה
    const next = incoming[(rounds / 9) % incoming.length];
    addAlert(next.type, next.place, next.source, next.lat, next.lon);
  }

  renderAlerts();
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
        <h3>${event.type}</h3>
        <div class="event-place">${event.place}</div>
        <div class="event-table">
          <span>תאריך</span><b>${event.date}</b>
          <span>התחלה</span><b>${event.start}</b>
          <span>סיום</span><b>${event.end}</b>
          <span>משך טיפול</span><b>${event.minutes} דקות</b>
          <span>אומת על ידי</span><b>${event.sources}</b>
        </div>
        <p>${event.summary}</p>
      </div>`;
  });

  // מכניסים את הכרטיסים לדף. אם החיפוש לא מצא כלום, מציגים הודעה
  document.getElementById("historyList").innerHTML = html || '<div class="empty">לא נמצאו אירועים מתאימים לחיפוש.</div>';

  // הסיכום שבראש העמוד: כמה אירועים, וכמה דקות טיפול בממוצע
  document.getElementById("historyTotal").textContent = history.length;
  document.getElementById("historyAvg").textContent = Math.round(totalMinutes / history.length);
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

// מצב התחלתי: שלוש התראות בשלבים שונים (המספר האחרון הוא כמה שניות הן כבר במערכת)
addAlert("לחיצה על לחצן מצוקה", "עמוד 4, רחוב יהודה הלוי, טבריה", "עמוד מצוקה", 32.7896, 35.5340, 120);
addAlert("חשד לאירוע ירי", "שדרות רבין, עפולה", "מצלמה חכמה", 32.6075, 35.2920, 40);
addAlert("חשד לפיגוע דריסה", "תחנה מרכזית, נוף הגליל", "דיווח אזרח", 32.7046, 35.3245, 0);

// אם נכנסו מהקישור שבהתראה, מציגים את האירוע
openAlertFromLink();

// מזהים את המיקום שלי, כדי להציג אותו על המפה ולחשב מרחקים
navigator.geolocation.getCurrentPosition(savePosition);

renderHistory();              // מציגים את ההיסטוריה
showClock();                  // מציגים את השעון מיד
setInterval(showClock, 1000); // ומעדכנים אותו כל שנייה
setInterval(update, 5000);    // ההתראות מתעדכנות כל 5 שניות