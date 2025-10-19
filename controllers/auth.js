// controllers/auth.js
import jwt from "jsonwebtoken";
import Student from "../models/students.js";
import Admin from "../models/admins.js";
import fetch from "node-fetch";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES = process.env.JWT_EXPIRES || "1d";

export const googleLogin = (req, res) => {
  const type = req.query.type; // "student" or "admin"
  const redirect_uri = process.env.GOOGLE_REDIRECT_URI;
  const scope = "https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile";
  const state = type;

  const oauth_url = `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${redirect_uri}&scope=${scope}&state=${state}`;
  res.redirect(oauth_url);
};

// Step 2: Google OAuth callback
export const googleCallback = async (req, res) => {
  const { code, state } = req.query; // state = "student" or "admin"

  // Exchange code for access token
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI,
      grant_type: "authorization_code",
    }),
  });
  const tokenData = await tokenRes.json();
  const access_token = tokenData.access_token;

  // Fetch user info from Google
  const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${access_token}` },
  });
  const profile = await userRes.json();

  try {
    let user;
    if (state === "student") {
      user = await Student.findOne({ studentEmail: profile.email });
      if (!user) return res.status(400).send("Student not registered");
      const token = jwt.sign({ id: user._id, role: "student" }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
      res.cookie("student_jwt", token, { httpOnly: true, path: "/student" });
      return res.redirect(`/student/${user._id}`);
    } else if (state === "admin") {
      user = await Admin.findOne({ email: profile.email });
      if (!user) return res.status(400).send("Admin not registered");
      const token = jwt.sign({ id: user._id, role: "admin" }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
      res.cookie("admin_jwt", token, { httpOnly: true, path: "/admin" });
      return res.redirect(`/admin/${user._id}`);
    } else {
      return res.status(400).send("Invalid role");
    }
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
};
