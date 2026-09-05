import jwt from "jsonwebtoken";

const SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET || "";

export async function verifySupabaseToken(token) {
  if (!SUPABASE_JWT_SECRET) {
    throw new Error("SUPABASE_JWT_SECRET missing in .env");
  }
  const payload = jwt.verify(token, SUPABASE_JWT_SECRET);
  return payload;
}