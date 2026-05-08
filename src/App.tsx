import { Suspense, useEffect } from "react";
import { lazyWithRetry as lazy } from "@/lib/lazyWithRetry";
import posthog from "@/lib/posthog";
import ErrorBoundary from "@/components/ErrorBoundary";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import CookieBanner from "@/components/CookieBanner";
import FloatingProfileButton from "@/components/FloatingProfileButton";
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
const FakturakontrollNy = lazy(() => import("./pages/consultant/FakturakontrollNy"));
const ReferenserInfo = lazy(() => import("./pages/ReferenserInfo"));
const VerifyInfo = lazy(() => import("./pages/VerifyInfo"));

const Unsubscribe = lazy(() => import("./pages/Unsubscribe"));
const Academy = lazy(() => import("./pages/Academy"));
const CompensationPreview = lazy(() => import("./pages/CompensationPreview"));
const AgencyDashboard = lazy(() => import("./pages/AgencyDashboard"));
const AgencyIntyg = lazy(() => import("./pages/agency/Intyg"));
const SignRepresentation = lazy(() => import("./pages/SignRepresentation"));
const AgencyLanding = lazy(() => import("./pages/AgencyLanding"));
const AgencySignup = lazy(() => import("./pages/AgencySignup"));
const DemoLanding = lazy(() => import("./pages/DemoLanding"));
const ReferenceDemo = lazy(() => import("./pages/demo/ReferenceDemo"));
const LandingV2 = lazy(() => import("./pages/demo/LandingV2"));
const LandingExtras = lazy(() => import("./pages/demo/LandingExtras"));
const Campaign = lazy(() => import("./pages/Campaign"));
const UppdragsradarV2 = lazy(() => import("./pages/UppdragsradarV2"));
const MarketplaceHome = lazy(() => import("./pages/marketplace/MarketplaceHome"));
const EgetBolag = lazy(() => import("./pages/EgetBolag"));
const SharedDocuments = lazy(() => import("./pages/SharedDocuments"));

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
    if (posthog.has_opted_in_capturing()) {
      posthog.capture('$pageview');
    }
  }, [pathname]);

  return null;
}

function RedirectWithParams({ to }: { to: string }) {
  const location = useLocation();
  return <Navigate to={`${to}${location.search}`} replace />;
}

function LegacyVerifyRedirect() {
  const { applicationId } = useParams();
  // Defensive: route requires :applicationId, but fall back to /dokhus-info if it ever arrives empty
  if (!applicationId) return <Navigate to="/dokhus-info" replace />;
  return <Navigate to={`/samarbetsintyg/${applicationId}`} replace />;
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
              {/* ── Landing — Kivra-stil "Förhandla utifrån data, inte magkänsla" (LandingV2) ── */}
              <Route path="/" element={<LandingV2 />} />
              <Route path="/b2b" element={<Index />} />
              <Route path="/demo/landing-extras" element={<LandingExtras />} />
              <Route path="/v1" element={<SalaryCheck />} />

              {/* ── Auth (no layout) ──────────────── */}
              <Route path="/logga-in" element={<Login />} />
              <Route path="/registrera" element={<Signup />} />
              <Route path="/aterstall-losenord" element={<ResetPassword />} />
              <Route path="/for-bemanningsforetag" element={<AgencyLanding />} />
              <Route path="/registrera/bemanning" element={<AgencySignup />} />

              {/* ── Consultant Layout ─────────────── */}
              <Route element={<ConsultantLayout />}>
                <Route path="/consultant/forhandla" element={<Negotiate />} />
                <Route path="/consultant/fakturakontroll" element={<Fakturakontroll />} />
                <Route path="/consultant/fakturakontroll/ny" element={<ProtectedRoute><FakturakontrollNy /></ProtectedRoute>} />
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
                <Route path="/agency/intyg" element={<AgencyIntyg />} />
                {/* Future: /agency/settings */}
              </Route>

              {/* ── Public Dokhus Layout ──────────── */}
              <Route element={<PublicVerifyLayout />}>
                <Route path="/samarbetsintyg/:applicationId" element={<VerifyProof />} />
                {/* Legacy redirect: /verify/:id → /samarbetsintyg/:id */}
                <Route path="/verify/:applicationId" element={<LegacyVerifyRedirect />} />
                <Route path="/profil/:id" element={<PublicProfile />} />
                <Route path="/dokhus-info" element={<VerifyInfo />} />
                {/* Legacy redirect */}
                <Route path="/verify-info" element={<Navigate to="/dokhus-info" replace />} />
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
              <Route path="/uppdragsradar" element={<UppdragsradarV2 />} />

              {/* Hidden / protected routes */}
              <Route path="/dela" element={<ProtectedRoute><SharePreview /></ProtectedRoute>} />
              <Route path="/referenser-info" element={<ProtectedRoute><ReferenserInfo /></ProtectedRoute>} />
              <Route path="/eget-bolag" element={<EgetBolag />} />
              <Route path="/delade-dokument/:token" element={<SharedDocuments />} />
              <Route path="/admin" element={<ProtectedRoute allowedRoles={["admin"]}><Admin /></ProtectedRoute>} />
              <Route path="/marketplace" element={<ProtectedRoute><MarketplaceHome /></ProtectedRoute>} />
              <Route path="/dev/theme-preview" element={<ProtectedRoute allowedRoles={["admin"]}><ThemePreview /></ProtectedRoute>} />
              <Route path="/dev/analytics" element={<ProtectedRoute allowedRoles={["admin"]}><AnalyticsDashboard /></ProtectedRoute>} />
              <Route path="/dev/e2e-test" element={import.meta.env.PROD ? <NotFound /> : <E2ETest />} />
              <Route path="/demo" element={<DemoLanding />} />
              <Route path="/demo/referenser" element={<ReferenceDemo />} />
              <Route path="/demo/landing-v2" element={<LandingV2 />} />
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
          <FloatingProfileButton />
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
