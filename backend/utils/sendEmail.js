const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});


const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

const sendEmail = async (to, subject, text) => {
  try {

    await resend.emails.send({
      from: "onboarding@resend.dev",
      to: to,
      subject: subject,
      text: text
    });

    console.log("Email sent successfully");

  } catch (error) {
    console.error("Email error:", error);
  }
};

module.exports = sendEmail;
