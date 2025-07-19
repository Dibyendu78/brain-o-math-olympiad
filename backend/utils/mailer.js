// backend/utils/mailer.js
const nodemailer = require('nodemailer');

// == Email transporter (Gmail SMTP) ==
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,    // Set your Gmail in .env
    pass: process.env.EMAIL_PASS     // And your app password
  }
});

// === Utility for tabular student list in emails ===
const formatStudentRow = (s, index, status) => `
  <tr>
    <td>${index + 1}</td>
    <td>${s.name}</td>
    <td>${s.class}</td>
    <td>${Array.isArray(s.subjects) ? s.subjects.join(', ') : s.subjects}</td>
    <td>${status === 'rejected' ? 'Rejected' : 'Confirmed'}</td>
  </tr>
`;


// === 1. Status Update to Coordinator (verified/rejected) ===
const sendStatusUpdateEmail = async ({
  registrationId,
  status,
  coordinatorEmail,
  coordinatorName,
  coordinatorPhone,
  schoolName,
  students
}) => {
  const subject = `Confirmation of ${status === 'verified'
    ? 'Payment Verification and Student Registration'
    : 'Application Status'} – Brain-O-Math Olympiad 2025`;

  const studentList = students.length
    ? `
    <div style="margin-top:20px">
      <table border="1" cellspacing="0" cellpadding="8" style="width:100%; border-collapse:collapse; font-family:Arial, sans-serif;">
        <thead>
          <tr style="background-color:#f2f2f2;">
            <th>Sl. No.</th>
            <th>Student Name</th>
            <th>Class</th>
            <th>Subject(s) Opted</th>
            <th>Registration Status</th>
          </tr>
        </thead>
        <tbody>
          ${students.map((s, i) => formatStudentRow(s, i, status)).join('')}

        </tbody>
      </table>
    </div>`
    : '';

  const html = `
    <p>Dear <strong>${coordinatorName}</strong>,</p>
    <p>${status === 'verified'
      ? `We are pleased to inform you that the payment for the Brain-O-Math Olympiad 2025 has been successfully <strong>verified</strong>, and the following student(s) from your school have been successfully registered.`
      : `We regret to inform you that your application (Registration ID: ${registrationId}) has been <strong>rejected</strong>. Please contact us for more details.`}
    </p>
    <hr/>
    <p>
      <strong>School Name:</strong> ${schoolName}<br/>
      <strong>Coordinator Name:</strong> ${coordinatorName}<br/>
      <strong>Contact:</strong> ${coordinatorEmail} / ${coordinatorPhone}
    </p>
    ${studentList}
    <hr/>
    ${status === 'verified'
      ? `<p><strong>Note:</strong> The admit cards will be shared with you by <strong>28th July 2025</strong> via WhatsApp/Email. Kindly ensure that students bring the admit card and reach the venue on time.</p>`
      : ''}
    <p>If you have any questions or need further assistance, please feel free to contact us.</p>
    <p>Warm regards,<br/>
      <strong>Organizing Team</strong><br/>
      Brain-O-Math Olympiad 2025<br/>
      Doon Heritage School, Siliguri<br/>
      📧 krishnendupatra57@gmail.com<br/>
      📞 +91 73846 8703
    </p>
  `;

  await transporter.sendMail({
    from: `"Brain-O-Math" <${process.env.EMAIL_USER}>`,
    to: coordinatorEmail,
    subject,
    html
  });
};

// === 2. Registration Acknowledgement (Pending Verification) ===
const sendRegistrationAcknowledgementEmail = async ({
  coordinatorEmail,
  coordinatorName,
  schoolName,
  contact,
  registrationId,
  studentCount,
  submittedAt
}) => {
  const subject = `Registration Form Received – Brain-O-Math Olympiad 2025 (Pending Payment Verification)`;

  const html = `
    <p>Dear <strong>${coordinatorName}</strong>,</p>
    <p>Thank you for submitting the registration form for the Interschool <strong>Brain-O-Math Olympiad 2025</strong>, organized by Doon Heritage School, Siliguri.</p>
    <p>Your registration ID is: <b style="color:#3858e9">${registrationId}</b></p>
    <p>Your submission is now under verification. Our team will review and verify the payment within 24 hours.</p>
    <p>Once the payment is confirmed, you will receive a final confirmation email with the list of successfully registered students.</p>
    <hr/>
    <p>
      <strong>Submission Details (For Reference):</strong><br/>
      School Name: ${schoolName}<br/>
      Coordinator Name: ${coordinatorName}<br/>
      Contact Info: ${contact}<br/>
      No. of Students Submitted: ${studentCount}<br/>
      Submission Date: ${new Date(submittedAt).toLocaleString()}
    </p>
    <hr/>
    <p>If there are any issues with the payment or documents, our team will contact you promptly.</p>
    <p>Warm regards,<br/>
      <strong>Organizing Team</strong><br/>
      Brain-O-Math Olympiad 2025<br/>
      Doon Heritage School, Siliguri<br/>
      📧 krishnendupatra57@gmail.com<br/>
      📞 +91 73846 87034
    </p>
  `;

  await transporter.sendMail({
    from: `"Brain-O-Math" <${process.env.EMAIL_USER}>`,
    to: coordinatorEmail,
    subject,
    html
  });
};


// === 3. Coordinator Welcome Email ===
const sendCoordinatorWelcomeEmail = async ({ coordinatorName, coordinatorEmail, coordinatorPhone }) => {
  const password = coordinatorPhone.slice(-4); // last 4 digits
  const subject = `Welcome to Brain-O-Math Olympiad 2025 Portal – Account Created Successfully`;

  const html = `
    <p>Dear <strong>${coordinatorName}</strong>,</p>
    <p>Welcome aboard!</p>
    <p>Your account for the Interschool <strong>Brain-O-Math Olympiad 2025</strong> portal has been successfully created.</p>
    <p>You can now log in to access your dashboard, submit registrations, and track application status.</p>
    <h3>🧾 Login Credentials:</h3>
    <ul>
      <li><strong>Login ID (Email):</strong> ${coordinatorEmail}</li>
      <li><strong>Password:</strong> ${password}</li>
    </ul>
    <p>If you encounter any issues accessing your account or have questions, feel free to reach out to us.</p>
    <p>We look forward to your active participation in this exciting academic journey!</p>
    <p>Warm regards,<br/>
      Organizing Team<br/>
      Brain-O-Math Olympiad 2025<br/>
      Doon Heritage School, Siliguri<br/>
      📧 krishnendupatra57@gmail.com<br/>
      📞 +91 73846 87034
    </p>
  `;

  await transporter.sendMail({
    from: `"Brain-O-Math" <${process.env.EMAIL_USER}>`,
    to: coordinatorEmail,
    subject,
    html
  });
};

// === Exports ===
module.exports = {
  sendStatusUpdateEmail,
  sendRegistrationAcknowledgementEmail,
  sendCoordinatorWelcomeEmail
};
