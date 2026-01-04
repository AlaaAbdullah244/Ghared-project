// import nodemailer from "nodemailer";

// const sendEmail = async (options) => {
//   // Create a transporter
//   const transporter = nodemailer.createTransport({
//     service: "Gmail", // Or use 'host' and 'port' for other providers
//     auth: {
//       user: process.env.EMAIL_USERNAME,
//       pass: process.env.EMAIL_PASSWORD,
//     },
//   });

//   // Define email options
//   const mailOptions = {
//     from: "System Notification <no-reply@system.com>",
//     to: options.email,
//     subject: options.subject,
//     text: options.message,
//   };

//   // Send the email
//   await transporter.sendMail(mailOptions);
// };

// export default sendEmail;
import nodemailer from "nodemailer";

const sendEmail = async (options) => {
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 2525,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    // 👇👇 أضف هذا الجزء لحل مشكلة الشهادة 👇👇
    tls: {
      rejectUnauthorized: false
    }
  });

  const mailOptions = {
    from: `"University System" <${process.env.EMAIL_USER}>`,
    to: options.email,
    subject: options.subject,
    text: options.message,
  };

  await transporter.sendMail(mailOptions);
};

export default sendEmail;