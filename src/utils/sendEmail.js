import nodemailer from "nodemailer";

const sendEmail = async (options) => {
  const transporter = nodemailer.createTransport({
    host: "smtp-relay.brevo.com",
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
    from: `baina<bainamagdy8@gmail.com>`,
    to: options.email,
    subject: options.subject,
    text: options.message,
  };

  await transporter.sendMail(mailOptions);
};

export default sendEmail;