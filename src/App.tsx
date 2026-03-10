import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Loader2 } from "lucide-react";
import Index from "./pages/Index";

// Lazy-loaded routes for code splitting
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
const MyAnalyses = lazy(() => import("./pages/MyAnalyses"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const Loading = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <Loader2 className="w-6 h-6 animate-spin text-primary" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/resultat/:leadId" element={<Teaser />} />
            <Route path="/referral/:token" element={<ReferralLanding />} />
            <Route path="/betalning-klar" element={<PaymentSuccess />} />
            <Route path="/rapport/:reportId" element={<Report />} />
            <Route path="/jamfor" element={<Compare />} />
            <Route path="/vanliga-fragor" element={<FAQ />} />
            <Route path="/integritetspolicy" element={<PrivacyPolicy />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/dev/theme-preview" element={<ThemePreview />} />
            {import.meta.env.DEV && (
              <>
                <Route path="/dev/e2e-test" element={<E2ETest />} />
                <Route path="/dev/analytics" element={<AnalyticsDashboard />} />
              </>
            )}
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
