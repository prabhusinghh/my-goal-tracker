const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

exports.scheduledReminder = functions.pubsub
  .schedule("* * * * *") // Runs every minute
  .timeZone("Asia/Kolkata")
  .onRun(async (context) => {
    console.log("Checking scheduled reminders...");

    // For now, we just send test push to all registered tokens
    const message = {
      notification: {
        title: "Goal Ledger Reminder",
        body: "This is your scheduled test reminder 🚀",
      },
      topic: "allUsers",
    };

    try {
      await admin.messaging().send(message);
      console.log("Reminder sent successfully.");
    } catch (error) {
      console.error("Error sending reminder:", error);
    }

    return null;
  });
