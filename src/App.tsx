import { Suspense, useEffect, useRef } from "react";
import { lazyWithRetry as lazy } from "@/lib/lazyWithRetry";
import { trackPageview } from "@/lib/posthog";
import ErrorBoundary from "@/components/ErrorBoundary";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import CookieBanner from "@/components/CookieBanner";
import ProtectedRoute from "@/components/ProtectedRoute";

// Layouts
import ConsultantLayout from "@/layouts/ConsultantLayout";

// Lazy-loaded routes — endast löneanalys-flödet + auth/admin/legal
const Home = lazy(() => import("./pages/Home"));
const AnalysisScreen = lazy(() => import("./pages/AnalysisScreen"));
const Report = lazy(() => import("./pages/Report"));
const AnestesiReport = lazy(() => import("./pages/AnestesiReport"));
const BollnasAllmanspecialistReport = lazy(() => import("./pages/BollnasAllmanspecialistReport"));
const AllmanmedicinReport = lazy(() => import("./pages/AllmanmedicinReport"));
const SjukskoterskaReport = lazy(() => import("./pages/SjukskoterskaReport"));
const LakareSpecialtyReport = lazy(() => import("./pages/LakareSpecialtyReport"));
const Campaign = lazy(() => import("./pages/Campaign"));

const Admin = lazy(() => import("./pages/Admin"));
const AnalyticsDashboard = lazy(() => import("./pages/AnalyticsDashboard"));
const AgentApiKeys = lazy(() => import("./pages/admin/AgentApiKeys"));
const AdminHealth = lazy(() => import("./pages/admin/Health"));

const FAQ = lazy(() => import("./pages/FAQ"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const Unsubscribe = lazy(() => import("./pages/Unsubscribe"));
const NotFound = lazy(() => import("./pages/NotFound"));

const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/Signup"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Profile = lazy(() => import("./pages/Profile"));
const Negotiate = lazy(() => import("./pages/Negotiate"));

const queryClient = new QueryClient();

const Loading = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <Loader2 className="w-6 h-6 animate-spin text-primary" />
  </div>
);

function ScrollToTop() {
  const { pathname } = useLocation();
  const isFirstRender = useRef(true);

  useEffect(() => {
    window.scrollTo(0, 0);
    if (!isFirstRender.current) {
      const main = document.getElementById("main-content");
      if (main) main.focus({ preventScroll: true });
    } else {
      isFirstRender.current = false;
    }
    // GA4 borttaget — PostHog hanterar pageviews via trackPageview().
    trackPageview();
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
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:shadow-lg"
          >
            Hoppa till innehåll
          </a>
          <Suspense fallback={<Loading />}>
            <main id="main-content" role="main" tabIndex={-1} aria-label="Huvudinnehåll">
            <Routes>
              {/* ── Löneanalys (enda synliga produkten) ── */}
              <Route path="/" element={<Home />} />
              <Route path="/resultat/:leadId" element={<AnalysisScreen />} />
              <Route path="/rapport/anestesisjukskoterska" element={<AnestesiReport />} />
              <Route path="/rapport/lakare-allmanmedicin" element={<AllmanmedicinReport />} />
              <Route path="/rapport/sjukskoterska" element={<SjukskoterskaReport />} />
              <Route path="/rapport/legitimerad-sjukskoterska" element={<SjukskoterskaReport />} />
              <Route path="/rapport/leg-sjukskoterska" element={<SjukskoterskaReport />} />
              <Route path="/rapport/allmansjukskoterska" element={<SjukskoterskaReport />} />
              <Route path="/rapport/leg-ssk" element={<SjukskoterskaReport />} />
              <Route path="/rapport/ssk" element={<SjukskoterskaReport />} />
              {DOCTOR_SPECIALTY_REPORTS.map((r) => (
                <Route key={r.slug} path={`/rapport/${r.slug}`} element={<LakareSpecialtyReport />} />
              ))}
              <Route path="/Bollnas/lakare-alm" element={<BollnasAllmanspecialistReport />} />
              <Route path="/bollnas/lakare-alm" element={<BollnasAllmanspecialistReport />} />
              <Route path="/rapport/:reportId" element={<Report />} />
              <Route path="/kampanj/:role" element={<Campaign />} />

              {/* ── Auth ── */}
              <Route path="/logga-in" element={<Login />} />
              <Route path="/registrera" element={<Signup />} />
              <Route path="/aterstall-losenord" element={<ResetPassword />} />
              <Route path="/unsubscribe" element={<Unsubscribe />} />

              {/* ── Profil (inloggad) ── */}
              <Route element={<ConsultantLayout />}>
                <Route path="/consultant/profil" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              </Route>

              {/* ── Legal ── */}
              <Route path="/vanliga-fragor" element={<FAQ />} />
              <Route path="/integritetspolicy" element={<PrivacyPolicy />} />

              {/* ── Admin ── */}
              <Route path="/admin" element={<ProtectedRoute allowedRoles={["admin"]}><Admin /></ProtectedRoute>} />
              <Route path="/admin/agent-api-keys" element={<ProtectedRoute allowedRoles={["admin"]}><AgentApiKeys /></ProtectedRoute>} />
              <Route path="/admin/health" element={<ProtectedRoute allowedRoles={["admin"]}><AdminHealth /></ProtectedRoute>} />
              <Route path="/dev/analytics" element={<ProtectedRoute allowedRoles={["admin"]}><AnalyticsDashboard /></ProtectedRoute>} />

              {/* ── Backwards-compat / gömda produktrouter → tillbaka till löneanalysen ── */}
              <Route path="/index" element={<Navigate to="/" replace />} />
              <Route path="/v1" element={<Navigate to="/" replace />} />
              <Route path="/b2b" element={<Navigate to="/" replace />} />
              <Route path="/profil" element={<Navigate to="/consultant/profil" replace />} />
              <Route path="/consultant/salary-check" element={<Navigate to="/" replace />} />
              <Route path="/consultant/forhandla" element={<ProtectedRoute><Negotiate /></ProtectedRoute>} />
              <Route path="/consultant/fakturakontroll/*" element={<Navigate to="/" replace />} />
              <Route path="/consultant/ersattning" element={<Navigate to="/" replace />} />
              <Route path="/consultant/referenser" element={<Navigate to="/" replace />} />
              <Route path="/consultant/academy" element={<Navigate to="/" replace />} />
              <Route path="/consultant/agent-access" element={<Navigate to="/" replace />} />
              <Route path="/forhandla" element={<Navigate to="/consultant/forhandla" replace />} />
              <Route path="/fakturakontroll" element={<Navigate to="/" replace />} />
              <Route path="/referenser" element={<Navigate to="/" replace />} />
              <Route path="/academy" element={<Navigate to="/" replace />} />
              <Route path="/marketplace" element={<Navigate to="/" replace />} />
              <Route path="/eget-bolag" element={<Navigate to="/" replace />} />
              <Route path="/uppdragsradar" element={<Navigate to="/" replace />} />
              <Route path="/for-bemanningsforetag" element={<Navigate to="/" replace />} />
              <Route path="/registrera/bemanning" element={<Navigate to="/" replace />} />
              <Route path="/agency/*" element={<Navigate to="/" replace />} />
              <Route path="/din-data" element={<Navigate to="/" replace />} />
              <Route path="/dokhus-info" element={<Navigate to="/" replace />} />
              <Route path="/verify-info" element={<Navigate to="/" replace />} />
              <Route path="/verify" element={<Navigate to="/" replace />} />
              <Route path="/verify/:applicationId" element={<Navigate to="/" replace />} />
              <Route path="/samarbetsintyg/:applicationId" element={<Navigate to="/" replace />} />
              <Route path="/profil/:id" element={<Navigate to="/" replace />} />
              <Route path="/referens/:token" element={<Navigate to="/" replace />} />
              <Route path="/ping/:token" element={<Navigate to="/" replace />} />
              <Route path="/sign/:token" element={<Navigate to="/" replace />} />
              <Route path="/delade-dokument/:token" element={<Navigate to="/" replace />} />
              <Route path="/dela" element={<Navigate to="/" replace />} />
              <Route path="/referenser-info" element={<Navigate to="/" replace />} />
              <Route path="/demo" element={<Navigate to="/" replace />} />
              <Route path="/demo/*" element={<Navigate to="/" replace />} />
              <Route path="/dev/demo" element={<Navigate to="/" replace />} />
              <Route path="/dev/theme-preview" element={<Navigate to="/" replace />} />
              <Route path="/dev/e2e-test" element={<Navigate to="/" replace />} />

              {/* ── Catch-all ── */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            </main>
          </Suspense>
          <CookieBanner />
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
