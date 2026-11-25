// ===================================================
//  Service Worker - רץ ברקע בטלפון, גם כשהאפליקציה סגורה
//  התפקיד שלו: לקבל התראה מהשרת ולהציג אותה
// ===================================================

// כשמגיעה התראה מהשרת
self.addEventListener("push", event => {
  // התוכן שהשרת שלח: כותרת, טקסט וקישור
  let data = { title: "PLUMERA", body: "התקבלה התראה חדשה", url: "./" };
  try { data = event.data.json(); } catch (e) { }

  // מציגים את ההתראה על המסך
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "icon-192.png",
      badge: "icon-192.png",
      data: { url: data.url },
      requireInteraction: true   // ההתראה נשארת על המסך עד שלוחצים עליה
    })
  );
});

// כשלוחצים על ההתראה: פותחים את האתר על האירוע
self.addEventListener("notificationclick", event => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data.url));
});
