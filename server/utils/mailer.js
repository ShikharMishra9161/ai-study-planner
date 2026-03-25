const nodemailer = require("nodemailer");

// Create transporter using Gmail SMTP
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Verify on startup
transporter.verify((error) => {
  if (error) {
    console.error("❌ Mailer connection failed:", error.message);
  } else {
    console.log("✅ Mailer is ready to send emails");
  }
});

// ── HTML email template ───────────────────────────────────────────────
const buildHTML = (taskList, userName = "Student") => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background:#060910;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#060910;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="580" cellpadding="0" cellspacing="0" style="background:#0d1117;border-radius:16px;border:1px solid #1e293b;overflow:hidden;max-width:580px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#22d3ee,#8b5cf6);padding:32px;text-align:center;">
              <p style="margin:0;font-size:28px;">⬡</p>
              <h1 style="margin:8px 0 4px;color:#060910;font-size:22px;font-weight:800;letter-spacing:-0.5px;">
                StudyAI
              </h1>
              <p style="margin:0;color:rgba(6,9,16,0.7);font-size:13px;">
                Your Daily Study Reminder
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 8px;color:#94a3b8;font-size:13px;">
                Hey ${userName} 👋
              </p>
              <h2 style="margin:0 0 20px;color:#e2e8f0;font-size:20px;font-weight:700;">
                You have pending tasks today
              </h2>
              <p style="margin:0 0 20px;color:#64748b;font-size:14px;line-height:1.6;">
                Here's what's waiting for you. Let's get them done!
              </p>

              <!-- Task list -->
              ${taskList.map(task => `
              <div style="background:#060910;border:1px solid #1e293b;border-left:3px solid #f59e0b;border-radius:10px;padding:12px 16px;margin-bottom:8px;">
                <p style="margin:0;color:#e2e8f0;font-size:14px;line-height:1.5;">
                  ◷ ${task}
                </p>
              </div>`).join("")}

              <!-- CTA Button -->
              <div style="text-align:center;margin-top:28px;">
                <a href="${process.env.CLIENT_URL || "http://localhost:5173"}/tasks"
                   style="display:inline-block;background:linear-gradient(135deg,#22d3ee,#8b5cf6);color:#060910;font-weight:700;font-size:14px;padding:14px 32px;border-radius:10px;text-decoration:none;">
                  View My Tasks →
                </a>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;border-top:1px solid #1e293b;text-align:center;">
              <p style="margin:0;color:#334155;font-size:12px;">
                AI Study Planner • You're receiving this because you have pending tasks
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

// ── Send email (plain text + HTML) ────────────────────────────────────
const sendEmail = async (to, subject, text, taskList = [], userName = "Student") => {
  try {
    const info = await transporter.sendMail({
      from:    `"AI Study Planner" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,    // plain text fallback
      html:    taskList.length > 0 ? buildHTML(taskList, userName) : undefined,
    });
    console.log(`📧 Email sent to ${to} — ID: ${info.messageId}`);
  } catch (error) {
    console.error(`❌ Failed to send email to ${to}:`, error.message);
  }
};

module.exports = sendEmail;