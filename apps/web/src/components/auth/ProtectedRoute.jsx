import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function ProtectedRoute({ children }) {
  const { booting, isAuthenticated } = useAuth();

  if (booting) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-300">
        Loading...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
} 