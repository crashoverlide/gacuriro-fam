import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { supabase } from "../config/supabase.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "gacuriro_dev_secret";

function signToken(id) {
  return jwt.sign({ id }, JWT_SECRET, { expiresIn: "30d" });
}

function shapeUser(u) {
  return {
    _id: u.id,
    id: u.id,
    username: u.username,
    email: u.email,
    fullName: u.full_name || "",
    bio: u.bio || "",
    avatar: u.avatar || "",
    location: u.location || "",
    birthday: u.birthday || "",
    onboardingDone: u.onboarding_done,
    postsCount: u.posts_count,
  };
}

router.post("/register", async (req, res) => {
  try {
    const { username, password, fullName, birthday, location, email } =
      req.body;
    if (!username || !password) {
      return res
        .status(400)
        .json({ message: "Username and password required" });
    }
    if (String(username).trim().length < 3) {
      return res.status(400).json({ message: "Username too short" });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ message: "Password too short" });
    }

    const uname = String(username).trim().toLowerCase();
    const mail = email
      ? String(email).toLowerCase()
      : `${uname}@gacuriro.local`;

    const { data: existing } = await supabase
      .from("users")
      .select("id")
      .or(`username.eq.${uname},email.eq.${mail}`)
      .maybeSingle();

    if (existing) {
      return res
        .status(400)
        .json({ message: "Username or email already exists" });
    }

    const hash = await bcrypt.hash(password, 10);
    const { data: user, error } = await supabase
      .from("users")
      .insert({
        username: uname,
        email: mail,
        password: hash,
        full_name: fullName || "",
        birthday: birthday || "",
        location: location || "",
        onboarding_done: true,
        email_verified: true,
      })
      .select("*")
      .single();

    if (error) return res.status(500).json({ message: error.message });

    const token = signToken(user.id);
    res.status(201).json({ user: shapeUser(user), token });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res
        .status(400)
        .json({ message: "Username and password required" });
    }

    const uname = String(username).trim().toLowerCase();
    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("username", uname)
      .maybeSingle();

    if (error || !user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ message: "Invalid credentials" });

    const token = signToken(user.id);
    res.json({ user: shapeUser(user), token });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/me", protect, async (req, res) => {
  res.json({ user: req.user });
});

export default router;