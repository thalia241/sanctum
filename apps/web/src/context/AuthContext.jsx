import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getMe, login as loginRequest, register as registerRequest } from "../api/auth";
import { disconnectSocket, reconnectSocketWithToken } from "../lib/socket";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    async function bootstrap() {
      const token = localStorage.getItem("sanctum_token");
      if (!token) {
        setBooting(false);
        return;
      }

      try {
        const data = await getMe();
        setUser(data.user ?? data);
        reconnectSocketWithToken();
      } catch {
        localStorage.removeItem("sanctum_token");
        disconnectSocket();
        setUser(null);
      } finally {
        setBooting(false);
      }
    }

    bootstrap();
  }, []);

  async function login(email, password) {
    const data = await loginRequest({ email, password });
    const token = data.token || data.accessToken;

    if (!token) {
      throw new Error("No token returned from login");
    }

    localStorage.setItem("sanctum_token", token);
    reconnectSocketWithToken();

    if (data.user) {
      setUser(data.user);
      return data.user;
    }

    const me = await getMe();
    setUser(me.user ?? me);
    return me.user ?? me;
  }

  async function register(username, email, password) {
    const data = await registerRequest({ username, email, password });
    const token = data.token || data.accessToken;

    if (!token) {
      throw new Error("No token returned from register");
    }

    localStorage.setItem("sanctum_token", token);
    reconnectSocketWithToken();

    if (data.user) {
      setUser(data.user);
      return data.user;
    }

    const me = await getMe();
    setUser(me.user ?? me);
    return me.user ?? me;
  }

  async function refreshMe() {
    const me = await getMe();
    const nextUser = me.user ?? me;
    setUser(nextUser);
    return nextUser;
  }

  function updateCurrentUser(patchOrUpdater) {
    setUser((prev) => {
      if (!prev) return prev;

      if (typeof patchOrUpdater === "function") {
        return patchOrUpdater(prev);
      }

      return {
        ...prev,
        ...patchOrUpdater,
      };
    });
  }

  function logout() {
    localStorage.removeItem("sanctum_token");
    disconnectSocket();
    setUser(null);
  }

  const value = useMemo(
    () => ({
      user,
      booting,
      isAuthenticated: Boolean(user),
      login,
      register,
      logout,
      refreshMe,
      updateCurrentUser,
    }),
    [user, booting]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return ctx;
} 