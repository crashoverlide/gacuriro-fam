import jwt from "jsonwebtoken";
import { supabase } from "../config/supabase.js";

export async function protect(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Not authorized" });
    }
    const token = header.split(" ")[1];
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "gacuriro_dev_secret"
    );

    const { data: user, error } = await supabase
      .from("users")
      .select(
        "id, username, email, full_name, bio, avatar, location, birthday, website, is_private, onboarding_done, posts_count, created_at"
      )
      .eq("id", decoded.id)
      .single();

    if (error || !user) {
      return res.status(401).json({ message: "User not found" });
    }

    req.user = {
      _id: user.id,
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.full_name || "",
      bio: user.bio || "",
      avatar: user.avatar || "",
      location: user.location || "",
      birthday: user.birthday || "",
      website: user.website || "",
      isPrivate: user.is_private,
      onboardingDone: user.onboarding_done,
      postsCount: user.posts_count,
      createdAt: user.created_at,
    };
    next();
  } catch {
    return res.status(401).json({ message: "Not authorized" });
  }
}

export default protect;