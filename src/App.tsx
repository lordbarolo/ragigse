import { lazy, Suspense, useEffect } from "react";
import ErrorBoundary from "@/components/ErrorBoundary";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import CookieBanner from "@/components/CookieBanner";
import Index from "./pages/Index";

// Lazy-loaded routes for code splitting
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
const ReijdarChat = lazy(() => import("./components/radar/ReijdarChat"));
const Unsubscribe = lazy(() => import("./pages/Unsubscribe"));
const Academy = lazy(() => import("./pages/Academy"));

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
              <Route path="/" element={<Index />} />
              <Route path="/resultat/:leadId" element={<AnalysisScreen />} />
              <Route path="/referral/:token" element={<ReferralLanding />} />
              <Route path="/betalning-klar" element={<PaymentSuccess />} />
              <Route path="/rapport/:reportId" element={<Report />} />
              <Route path="/jamfor" element={<Compare />} />
              <Route path="/radar" element={<Radar />} />
              <Route path="/forhandla" element={<Negotiate />} />
              <Route path="/referenser" element={<Referenser />} />
              <Route path="/vanliga-fragor" element={<FAQ />} />
              <Route path="/integritetspolicy" element={<PrivacyPolicy />} />
              <Route path="/logga-in" element={<Login />} />
              <Route path="/registrera" element={<Signup />} />
              <Route path="/aterstall-losenord" element={<ResetPassword />} />
              <Route path="/profil" element={<Profile />} />
              <Route path="/referens/:token" element={<ReferenceForm />} />
              <Route path="/ping/:token" element={<PingResponse />} />
              <Route path="/profil/:id" element={<PublicProfile />} />
              <Route path="/verify/:applicationId" element={<VerifyProof />} />
              <Route path="/fakturakontroll" element={<Fakturakontroll />} />
              <Route path="/referenser-info" element={<ReferenserInfo />} />
              <Route path="/verify-info" element={<VerifyInfo />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/dela" element={<SharePreview />} />
              <Route path="/dev/theme-preview" element={<ThemePreview />} />
              <Route path="/dev/analytics" element={<AnalyticsDashboard />} />
              {import.meta.env.DEV && (
                <Route path="/dev/e2e-test" element={<E2ETest />} />
              )}
              <Route path="/unsubscribe" element={<Unsubscribe />} />
              <Route path="/academy" element={<Academy />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
          <ReijdarChat />
          <CookieBanner />
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
