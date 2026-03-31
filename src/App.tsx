import { lazy, Suspense, useEffect } from "react";
import ErrorBoundary from "@/components/ErrorBoundary";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import CookieBanner from "@/components/CookieBanner";
import Index from "./pages/Index";
import ProtectedRoute from "@/components/ProtectedRoute";

// Layouts
import ConsultantLayout from "@/layouts/ConsultantLayout";
import AgencyLayout from "@/layouts/AgencyLayout";
import PublicVerifyLayout from "@/layouts/PublicVerifyLayout";

// Lazy-loaded routes
const SalaryCheck = lazy(() => import("./pages/consultant/SalaryCheck"));
const AnalysisScreen = lazy(() => import("./pages/AnalysisScreen"));
const Teaser = lazy(() => import("./pages/Teaser"));
const ReferralLanding = lazy(() => import("./pages/ReferralLanding"));
const Report = lazy(() => import("./pages/Report"));
const PaymentSuccess = lazy(() => import("./pages/PaymentSuccess"));
const Compare = lazy(() => import("./pages/Compare"));
const E2ETest = lazy(() => import("./pages/E2ETest"));
const AnalyticsDashboard = lazy(() => import("./pages/AnalyticsDashboard"));
const Admin = lazy(() => import("./pages/Admin"));
const FAQ = lazy(() => import("./pages/FAQ"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const ThemePreview = lazy(() => import("./pages/ThemePreview"));
const SharePreview = lazy(() => import("./pages/SharePreview"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/Signup"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Profile = lazy(() => import("./pages/Profile"));
const Radar = lazy(() => import("./pages/Radar"));
const Negotiate = lazy(() => import("./pages/Negotiate"));
const Referenser = lazy(() => import("./pages/Referenser"));
const ReferenceForm = lazy(() => import("./pages/ReferenceForm"));
const PingResponse = lazy(() => import("./pages/PingResponse"));
const PublicProfile = lazy(() => import("./pages/PublicProfile"));
const VerifyProof = lazy(() => import("./pages/VerifyProof"));
const Fakturakontroll = lazy(() => import("./pages/Fakturakontroll"));
const ReferenserInfo = lazy(() => import("./pages/ReferenserInfo"));
const VerifyInfo = lazy(() => import("./pages/VerifyInfo"));

const Unsubscribe = lazy(() => import("./pages/Unsubscribe"));
const Academy = lazy(() => import("./pages/Academy"));
const AgencyDashboard = lazy(() => import("./pages/AgencyDashboard"));
const SignRepresentation = lazy(() => import("./pages/SignRepresentation"));
const AgencyLanding = lazy(() => import("./pages/AgencyLanding"));
const AgencySignup = lazy(() => import("./pages/AgencySignup"));

const queryClient = new QueryClient();

const Loading = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <Loader2 className="w-6 h-6 animate-spin text-primary" />
  </div>
);

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ScrollToTop />
          <Suspense fallback={<Loading />}>
            <Routes>
              {/* ── B2B Landing ────────────────────── */}
              <Route path="/" element={<Index />} />

              {/* ── Auth (no layout) ──────────────── */}
              <Route path="/logga-in" element={<Login />} />
              <Route path="/registrera" element={<Signup />} />
              <Route path="/aterstall-losenord" element={<ResetPassword />} />

              {/* ── Consultant Layout ─────────────── */}
              <Route element={<ConsultantLayout />}>
                <Route path="/consultant/salary-check" element={<SalaryCheck />} />
                <Route path="/consultant/profil" element={<Profile />} />
                <Route path="/consultant/radar" element={<Radar />} />
                <Route path="/consultant/forhandla" element={<Negotiate />} />
                <Route path="/consultant/referenser" element={<Referenser />} />
                <Route path="/consultant/fakturakontroll" element={<Fakturakontroll />} />
                <Route path="/consultant/academy" element={<Academy />} />
              </Route>

              {/* ── Agency Layout ─────────────────── */}
              <Route element={<ProtectedRoute allowedRoles={["agency", "admin"]}><AgencyLayout /></ProtectedRoute>}>
                <Route path="/agency/dashboard" element={<AgencyDashboard />} />
                {/* Future: /agency/requests, /agency/settings */}
              </Route>

              {/* ── Public Verify Layout ──────────── */}
              <Route element={<PublicVerifyLayout />}>
                <Route path="/verify/:applicationId" element={<VerifyProof />} />
                <Route path="/profil/:id" element={<PublicProfile />} />
                <Route path="/verify-info" element={<VerifyInfo />} />
              </Route>

              {/* ── Public routes (no layout) ────── */}
              <Route path="/resultat/:leadId" element={<AnalysisScreen />} />
              <Route path="/referral/:token" element={<ReferralLanding />} />
              <Route path="/betalning-klar" element={<PaymentSuccess />} />
              <Route path="/rapport/:reportId" element={<Report />} />
              <Route path="/jamfor" element={<Compare />} />
              <Route path="/vanliga-fragor" element={<FAQ />} />
              <Route path="/integritetspolicy" element={<PrivacyPolicy />} />
              <Route path="/referens/:token" element={<ReferenceForm />} />
              <Route path="/ping/:token" element={<PingResponse />} />
              <Route path="/sign/:token" element={<SignRepresentation />} />
              <Route path="/dela" element={<SharePreview />} />
              <Route path="/unsubscribe" element={<Unsubscribe />} />
              <Route path="/referenser-info" element={<ReferenserInfo />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/dev/theme-preview" element={<ThemePreview />} />
              <Route path="/dev/analytics" element={<AnalyticsDashboard />} />
              {import.meta.env.DEV && (
                <Route path="/dev/e2e-test" element={<E2ETest />} />
              )}

              {/* ── Backwards-compat redirects ───── */}
              <Route path="/profil" element={<Navigate to="/consultant/profil" replace />} />
              <Route path="/radar" element={<Navigate to="/consultant/radar" replace />} />
              <Route path="/forhandla" element={<Navigate to="/consultant/forhandla" replace />} />
              <Route path="/referenser" element={<Navigate to="/consultant/referenser" replace />} />
              <Route path="/fakturakontroll" element={<Navigate to="/consultant/fakturakontroll" replace />} />
              <Route path="/academy" element={<Navigate to="/consultant/academy" replace />} />

              {/* ── Catch-all ─────────────────────── */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
          <CookieBanner />
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
