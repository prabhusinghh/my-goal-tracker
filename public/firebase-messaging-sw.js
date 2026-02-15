importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyCbUz1ZhDpZyGvplqxZtFpVClWzs44oVU0",
  authDomain: "goal-ledger.firebaseapp.com",
  projectId: "goal-ledger",
  messagingSenderId: "784081171572",
  appId: "1:784081171572:web:16b29aef6f3c349ccb8d21",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);

  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/favicon.svg'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
