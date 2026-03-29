import { Navigate, Outlet } from "react-router-dom";
import { useAuth, type AppRole } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children?: React.ReactNode;
  allowedRoles?: AppRole[];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, loading, role } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/logga-in" replace />;
  }

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    const target = role === "agency" ? "/agency/dashboard" : "/consultant/profil";
    return <Navigate to={target} replace />;
  }

  // If children are provided, render them; otherwise render Outlet for layout usage
  return <>{children || <Outlet />}</>;
}
