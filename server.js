require("dotenv").config();
const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");
const axios = require("axios");
const rateLimit = require("express-rate-limit");
const jwt = require("jsonwebtoken");

const app = express();
app.use(cors());
app.use(express.json());

////////////////////////////////////////////////
// Rate Limit
////////////////////////////////////////////////
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
}));

////////////////////////////////////////////////
// Firebase
////////////////////////////////////////////////
const serviceAccount = require("./firebase-admin.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

////////////////////////////////////////////////
// Mail
////////////////////////////////////////////////
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL,
    pass: process.env.APP_PASSWORD
  }
});

////////////////////////////////////////////////
// Helpers
////////////////////////////////////////////////
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isStrongPassword(password) {
  return password.length >= 6 &&
    /[A-Z]/.test(password) &&
    /[0-9]/.test(password);
}

async function verifyCaptcha(token) {
  const response = await axios.post(
    "https://www.google.com/recaptcha/api/siteverify",
    null,
    {
      params: {
        secret: process.env.RECAPTCHA_SECRET,
        response: token
      }
    }
  );
  return response.data.success;
}

////////////////////////////////////////////////
// SIGNUP
////////////////////////////////////////////////

app.post("/signup/send-otp", async (req, res) => {
  const { email, captchaToken } = req.body;

  if (!isValidEmail(email))
    return res.status(400).json({ message: "Invalid email" });

  if (!await verifyCaptcha(captchaToken))
    return res.status(400).json({ message: "Captcha failed" });

  const userRef = db.collection("users").doc(email);
  const doc = await userRef.get();

  if (doc.exists)
    return res.status(400).json({ message: "User exists" });

  const otp = Math.floor(100000 + Math.random() * 900000);

  await userRef.set({
    otp,
    otpExpires: Date.now() + 5 * 60 * 1000,
    loginAttempts: 0,
    lockUntil: null,
    lastOtpTime: Date.now()
  });

  await transporter.sendMail({
    to: email,
    subject: "Signup OTP",
    text: `Your OTP is ${otp}`
  });

  res.json({ message: "OTP Sent" });
});

app.post("/signup/verify", async (req, res) => {
  const { email, otp, password } = req.body;

  if (!isStrongPassword(password))
    return res.status(400).json({
      message: "Weak password"
    });

  const userRef = db.collection("users").doc(email);
  const doc = await userRef.get();

  if (!doc.exists)
    return res.status(400).json({ message: "User not found" });

  const user = doc.data();

  if (Date.now() > user.otpExpires)
    return res.status(400).json({ message: "OTP expired" });

  if (parseInt(otp) !== user.otp)
    return res.status(400).json({ message: "Invalid OTP" });

  const hash = await bcrypt.hash(password, 10);

  await userRef.update({
    password: hash,
    otp: null
  });

  res.json({ message: "Signup Successful" });
});

////////////////////////////////////////////////
// LOGIN
////////////////////////////////////////////////

app.post("/login/send-otp", async (req, res) => {
  const { email, captchaToken } = req.body;

  if (!await verifyCaptcha(captchaToken))
    return res.status(400).json({ message: "Captcha failed" });

  const userRef = db.collection("users").doc(email);
  const doc = await userRef.get();

  if (!doc.exists)
    return res.status(400).json({ message: "User not found" });

  const user = doc.data();

  if (Date.now() - user.lastOtpTime < 60000)
    return res.status(400).json({
      message: "Wait before resend"
    });

  const otp = Math.floor(100000 + Math.random() * 900000);

  await userRef.update({
    otp,
    otpExpires: Date.now() + 5 * 60 * 1000,
    lastOtpTime: Date.now()
  });

  await transporter.sendMail({
    to: email,
    subject: "Login OTP",
    text: `Your OTP is ${otp}`
  });

  res.json({ message: "OTP Sent" });
});

app.post("/login/verify", async (req, res) => {
  const { email, otp, password } = req.body;

  const userRef = db.collection("users").doc(email);
  const doc = await userRef.get();

  if (!doc.exists)
    return res.status(400).json({ message: "User not found" });

  const user = doc.data();

  if (user.lockUntil && user.lockUntil > Date.now())
    return res.status(400).json({
      message: "Account locked"
    });

  if (Date.now() > user.otpExpires)
    return res.status(400).json({ message: "OTP expired" });

  if (parseInt(otp) !== user.otp)
    return res.status(400).json({ message: "Invalid OTP" });

  const match = await bcrypt.compare(password, user.password);

  if (!match) {
    const attempts = (user.loginAttempts || 0) + 1;

    if (attempts >= 3) {
      await userRef.update({
        loginAttempts: attempts,
        lockUntil: Date.now() + 5 * 60 * 1000
      });
      return res.status(400).json({
        message: "Locked 5 minutes"
      });
    }

    await userRef.update({ loginAttempts: attempts });
    return res.status(400).json({
      message: "Wrong password"
    });
  }

  await userRef.update({
    loginAttempts: 0,
    lockUntil: null
  });

  const token = jwt.sign(
    { email },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );

  const ip =
    req.headers["x-forwarded-for"] ||
    req.socket.remoteAddress;

  await db.collection("loginLogs").add({
    email,
    ip,
    time: Date.now()
  });

  res.json({
    message: "Login Successful",
    token
  });
});

////////////////////////////////////////////////
app.listen(5000, () =>
  console.log("Server running on port 5000")
);
