const cron = require("node-cron");
const Task = require("../models/Task");
const sendEmail = require("../utils/mailer");

// Runs every day at 9 AM
// Change to "* * * * *" temporarily to test every minute
cron.schedule("0 9 * * *", async () => {
  console.log("🔔 Running Reminder Job...");

  try {
    const tasks = await Task.find({ status: "pending" }).populate("userId");

    // Group tasks by user
    const userMap = {};
    tasks.forEach((task) => {
      if (!task.userId || !task.userId.email) return;

      const email = task.userId.email;
      if (!userMap[email]) {
        userMap[email] = {
          name:  task.userId.name || "Student",
          tasks: [],
        };
      }
      userMap[email].tasks.push(task.task);
    });

    if (Object.keys(userMap).length === 0) {
      console.log("✅ No pending tasks — no emails sent.");
      return;
    }

    // Send email to each user
    for (const email in userMap) {
      const { name, tasks: taskList } = userMap[email];

      const plainText = `Hey ${name}!\n\nYou have ${taskList.length} pending tasks:\n\n${
        taskList.map(t => `- ${t}`).join("\n")
      }\n\nLet's finish them today 🚀\n\nAI Study Planner`;

      await sendEmail(
        email,
        `📚 You have ${taskList.length} pending tasks today`,
        plainText,
        taskList, // passed to HTML template
        name,     // passed to HTML template
      );
    }

    console.log(`✅ Reminder emails sent to ${Object.keys(userMap).length} user(s).`);
  } catch (err) {
    console.error("Reminder job error:", err.message);
  }
});