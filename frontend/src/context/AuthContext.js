import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { connectSocket, disconnectSocket } from "../utils/socket";
import { API_URL } from "../config";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem("gf_token"));
  const [loading, setLoading] = useState(true);

  const applySession = (nextUser, nextToken) => {
    setUser(nextUser);
    setToken(nextToken);
    if (nextToken) localStorage.setItem("gf_token", nextToken);
    else localStorage.removeItem("gf_token");
    if (nextUser?._id) connectSocket(nextUser._id);
    else disconnectSocket();
  };

  useEffect(() => {
    const boot = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`${API_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.user) {
          applySession(data.user, token);
        } else {
          applySession(null, null);
        }
      } catch {
        applySession(null, null);
      } finally {
        setLoading(false);
      }
    };
    boot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const register = async ({ username, password, fullName, birthday, location }) => {
    const res = await fetch(`${API_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username,
        password,
        fullName,
        birthday,
        location,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || "Sign up failed");
    applySession(data.user, data.token);
    return data;
  };

  const login = async ({ username, password }) => {
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || "Login failed");
    applySession(data.user, data.token);
    return data;
  };

  const logout = () => {
    applySession(null, null);
  };

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      register,
      login,
      logout,
      pendingVerify: false,
      loginGoogle: async () => {
        throw new Error("Google login disabled — use username login");
      },
    }),
    [user, token, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}