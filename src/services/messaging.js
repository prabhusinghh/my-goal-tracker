import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

// 🔴 Replace with your real config values
const firebaseConfig = {
  apiKey: "AIzaSyCbUz1ZhDpZyGvplqxZtFpVClWzs44oVU0",
  authDomain: "goal-ledger.firebaseapp.com",
  projectId: "goal-ledger",
  messagingSenderId: "784081171572",
  appId: "1:784081171572:web:16b29aef6f3c349ccb8d21",
};

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

// 🔥 Request notification permission + get token
export async function requestNotificationPermission(vapidKey) {
  try {
    const permission = await Notification.requestPermission();

    if (permission !== "granted") {
      console.log("Notification permission denied");
      return null;
    }

    const token = await getToken(messaging, {
      vapidKey: vapidKey,
    });

    if (token) {
      console.log("FCM Token:", token);
      return token;
    } else {
      console.log("No registration token available.");
      return null;
    }
  } catch (err) {
    console.error("Error getting token:", err);
    return null;
  }
}

// 🔥 Foreground message listener
export function listenForMessages() {
  onMessage(messaging, (payload) => {
    console.log("Message received in foreground:", payload);

    new Notification(payload.notification.title, {
      body: payload.notification.body,
      icon: "/favicon.svg",
    });
  });
}
