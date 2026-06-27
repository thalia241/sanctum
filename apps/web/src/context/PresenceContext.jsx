import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getSocket } from "../lib/socket";
import { getPresence } from "../api/presence";
import { useAuth } from "./AuthContext";

const PresenceContext = createContext(null);

export function PresenceProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  const [presenceMap, setPresenceMap] = useState({});

  useEffect(() => {
    if (!isAuthenticated || !user) {
      setPresenceMap({});
      return;
    }

    const socket = getSocket();

    function handlePresenceUpdate(payload) {
      const userId = String(payload?.userId || "");
      if (!userId) return;

      setPresenceMap((prev) => ({
        ...prev,
        [userId]: {
          isOnline: Boolean(payload?.isOnline),
          lastActiveAt: payload?.lastActiveAt || null,
        },
      }));
    }

    socket.on("presence:update", handlePresenceUpdate);

    return () => {
      socket.off("presence:update", handlePresenceUpdate);
    };
  }, [isAuthenticated, user?.id, user?._id]);

  async function refreshPresence(ids = []) {
    const data = await getPresence(ids);
    setPresenceMap((prev) => ({
      ...prev,
      ...(data?.presence || {}),
    }));
    return data?.presence || {};
  }

  function getUserPresence(userId) {
    return presenceMap[String(userId)] || { isOnline: false, lastActiveAt: null };
  }

  const value = useMemo(
    () => ({
      presenceMap,
      refreshPresence,
      getUserPresence,
    }),
    [presenceMap]
  );

  return (
    <PresenceContext.Provider value={value}>
      {children}
    </PresenceContext.Provider>
  );
}

export function usePresence() {
  const ctx = useContext(PresenceContext);
  if (!ctx) {
    throw new Error("usePresence must be used inside PresenceProvider");
  }
  return ctx;
} 