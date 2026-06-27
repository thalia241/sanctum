import { io } from "socket.io-client";

let socket = null;

export function getSocket() {
  if (socket) return socket;

  const token = localStorage.getItem("sanctum_token");

  socket = io(import.meta.env.VITE_SOCKET_URL, {
    transports: ["websocket"],
    auth: {
      token,
    },
  });

  return socket;
}

export function reconnectSocketWithToken() {
  if (socket) {
    socket.auth = {
      token: localStorage.getItem("sanctum_token"),
    };

    if (!socket.connected) {
      socket.connect();
    }
  }
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
} 