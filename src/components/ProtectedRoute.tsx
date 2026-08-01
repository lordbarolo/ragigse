import { Navigate, Outlet, useLocation } from "@/lib/router-compat";
import { useAuth, type AppRole } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";
import { buildAuthQuery } from "@/lib/authIntent";

interface ProtectedRouteProps {
  children?: React.ReactNode;
  allowedRoles?: AppRole[];
}

// Map protected paths → intent label used by /logga-in & /registrera so the
// auth view explains *why* the user is there instead of feeling like a dead-end.
function inferIntent(pathname: string): string | null {
  if (pathname.startsWith("/consultant/forhandla")) return "negotiate";
  return null;
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, loading, role } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    const redirectPath = `${location.pathname}${location.search}`;
    const intent = inferIntent(location.pathname);
    const query = intent
      ? buildAuthQuery(redirectPath, intent)
      : `?redirect=${encodeURIComponent(redirectPath)}`;
    return <Navigate to={`/logga-in${query}`} replace />;
  }

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    const target = role === "agency" ? "/agency/dashboard" : "/consultant/profil";
    return <Navigate to={target} replace />;
  }

  // If children are provided, render them; otherwise render Outlet for layout usage
  return <>{children || <Outlet />}</>;
}

