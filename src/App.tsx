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
const MarketEdge = lazy(() => import("./pages/MarketEdge"));
const AnalysisScreen = lazy(() => import("./pages/AnalysisScreen"));
const Teaser = lazy(() => import("./pages/Teaser"));
const ReferralLanding = lazy(() => import("./pages/ReferralLanding"));
const Report = lazy(() => import("./pages/Report"));
const AnestesiReport = lazy(() => import("./pages/AnestesiReport"));


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
// const Radar = lazy(() => import("./pages/Radar"));
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
const CompensationPreview = lazy(() => import("./pages/CompensationPreview"));
const AgencyDashboard = lazy(() => import("./pages/AgencyDashboard"));
const SignRepresentation = lazy(() => import("./pages/SignRepresentation"));
const AgencyLanding = lazy(() => import("./pages/AgencyLanding"));
const AgencySignup = lazy(() => import("./pages/AgencySignup"));
const DemoLanding = lazy(() => import("./pages/DemoLanding"));
const ReferenceDemo = lazy(() => import("./pages/demo/ReferenceDemo"));
const Campaign = lazy(() => import("./pages/Campaign"));

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
    if (typeof window.gtag === 'function') {
      window.gtag('config', 'G-8TKTZH3KZZ', { page_path: pathname });
    }
  }, [pathname]);

  return null;
}

function RedirectWithParams({ to }: { to: string }) {
  const location = useLocation();
  return <Navigate to={`${to}${location.search}`} replace />;
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
              {/* ── Landing — salary analysis funnel ── */}
              <Route path="/" element={<SalaryCheck />} />
              <Route path="/b2b" element={<Index />} />

              {/* ── Auth (no layout) ──────────────── */}
              <Route path="/logga-in" element={<Login />} />
              <Route path="/registrera" element={<Signup />} />
              <Route path="/aterstall-losenord" element={<ResetPassword />} />
              {/* Agency landing — hidden until actively marketed */}
              {/* <Route path="/for-bemanningsforetag" element={<AgencyLanding />} /> */}
              {/* <Route path="/registrera/bemanning" element={<AgencySignup />} /> */}

              {/* ── Consultant Layout ─────────────── */}
              <Route element={<ConsultantLayout />}>
                <Route path="/consultant/forhandla" element={<Negotiate />} />
                <Route path="/consultant/fakturakontroll" element={<Fakturakontroll />} />
                <Route path="/consultant/ersattning" element={<CompensationPreview />} />

                {/* Protected — require login */}
                <Route path="/consultant/profil" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                <Route path="/consultant/referenser" element={<ProtectedRoute allowedRoles={["admin"]}><Referenser /></ProtectedRoute>} />

                {/* Hidden until polished — require login */}
                <Route path="/consultant/salary-check" element={<Navigate to="/" replace />} />
                {/* <Route path="/consultant/radar" element={<ProtectedRoute><Radar /></ProtectedRoute>} /> */}
                <Route path="/consultant/academy" element={<ProtectedRoute><Academy /></ProtectedRoute>} />
              </Route>

              {/* ── Agency Layout ─────────────────── */}
              <Route element={<ProtectedRoute allowedRoles={["agency", "admin"]}><AgencyLayout /></ProtectedRoute>}>
                <Route path="/agency/dashboard" element={<AgencyDashboard />} />
                <Route path="/agency/market-edge" element={<MarketEdge />} />
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
              
              <Route path="/rapport/anestesisjukskoterska" element={<AnestesiReport />} />
              <Route path="/rapport/:reportId" element={<Report />} />
              
              <Route path="/vanliga-fragor" element={<FAQ />} />
              <Route path="/integritetspolicy" element={<PrivacyPolicy />} />
              <Route path="/referens/:token" element={<ReferenceForm />} />
              <Route path="/ping/:token" element={<PingResponse />} />
              <Route path="/sign/:token" element={<SignRepresentation />} />
              <Route path="/unsubscribe" element={<Unsubscribe />} />
              <Route path="/kampanj/:role" element={<Campaign />} />

              {/* Hidden / protected routes */}
              <Route path="/dela" element={<ProtectedRoute><SharePreview /></ProtectedRoute>} />
              <Route path="/referenser-info" element={<ProtectedRoute><ReferenserInfo /></ProtectedRoute>} />
              <Route path="/admin" element={<ProtectedRoute allowedRoles={["admin"]}><Admin /></ProtectedRoute>} />
              <Route path="/dev/theme-preview" element={<ProtectedRoute allowedRoles={["admin"]}><ThemePreview /></ProtectedRoute>} />
              <Route path="/dev/analytics" element={<ProtectedRoute allowedRoles={["admin"]}><AnalyticsDashboard /></ProtectedRoute>} />
              <Route path="/dev/e2e-test" element={import.meta.env.PROD ? <NotFound /> : <E2ETest />} />
              <Route path="/demo" element={<DemoLanding />} />
              <Route path="/demo/referenser" element={<ReferenceDemo />} />
              <Route path="/dev/demo" element={<Navigate to="/demo" replace />} />

              {/* ── Backwards-compat redirects ───── */}
              <Route path="/index" element={<Navigate to="/" replace />} />
              <Route path="/profil" element={<Navigate to="/consultant/profil" replace />} />
              {/* <Route path="/radar" element={<Navigate to="/consultant/radar" replace />} /> */}
              <Route path="/forhandla" element={<RedirectWithParams to="/consultant/forhandla" />} />
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
