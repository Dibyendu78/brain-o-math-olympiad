// utils/mailer.js
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const sendStatusUpdateEmail = async ({ to, name, status, registrationId, reason }) => {
  const subject = `Brain-O-Math Registration Status: ${status.toUpperCase()}`;
  const html = `
    <h3>Dear ${name},</h3>
    <p>Your school's application (Registration ID: <strong>${registrationId}</strong>) has been <strong>${status}</strong>.</p>
    ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
    <p>Thank you for participating in the Brain-O-Math Olympiad.</p>
    <p>Best regards,<br/>Brain-O-Math Team</p>
  `;

  await transporter.sendMail({
    from: `"Brain-O-Math" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html
  });
};

module.exports = { sendStatusUpdateEmail };
