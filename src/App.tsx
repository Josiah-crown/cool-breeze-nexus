import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { LegalComplianceProvider, useLegalCompliance } from "@/contexts/LegalComplianceContext";
import { ZoomWrapper } from "@/components/ZoomWrapper";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";
import EmailConfirmation from "./pages/EmailConfirmation";
import SetupDemo from "./pages/SetupDemo";
import EmailTemplate from "./pages/EmailTemplate";
import PharmacyEmailTemplate from "./pages/PharmacyEmailTemplate";
import BuildingControl from "./pages/BuildingControl";
import BuildingDesigner from "./pages/BuildingDesigner";
import Buildings from "./pages/Buildings";
import BuildingHumidity from "./pages/BuildingHumidity";
import BuildingLayoutEditor from "./pages/BuildingLayoutEditor";
import SitesMap from "./pages/SitesMap";
import Sites from "./pages/Sites";
import Home from "./pages/Home";
import Pricing from "./pages/Pricing";
import Account from "./pages/Account";
import LegalDocument from "./pages/LegalDocument";
import CheckoutSuccess from "./pages/CheckoutSuccess";
import Information from "./pages/Information";
import DashboardLayout from "./pages/DashboardLayout";
import AlertHistory from "./pages/AlertHistory";

const queryClient = new QueryClient();

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  const { state: legalState, skipLegalGate, reload } = useLegalCompliance();

  useEffect(() => {
    if (user?.id && !skipLegalGate) {
      void reload();
    }
  }, [location.pathname, user?.id, skipLegalGate, reload]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login?source=home" replace state={{ from: location.pathname }} />;
  }

  if (!skipLegalGate && legalState === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-foreground">Loading...</div>
      </div>
    );
  }

  if (!skipLegalGate && legalState === "incomplete") {
    const p = location.pathname;
    if (p !== "/account" && !p.startsWith("/legal/")) {
      return <Navigate to="/account" replace state={{ from: location.pathname, requireLegal: true }} />;
    }
  }

  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <ZoomWrapper>
          <BrowserRouter>
            <LegalComplianceProvider>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/email-confirmation" element={<EmailConfirmation />} />
              <Route path="/setup-demo" element={<SetupDemo />} />
              <Route path="/email-template" element={<EmailTemplate />} />
              <Route path="/pharmacy-email-template" element={<PharmacyEmailTemplate />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/offers" element={<Navigate to="/pricing" replace />} />
              <Route path="/offers/:offerId" element={<Navigate to="/pricing" replace />} />
              <Route path="/legal/:key" element={<LegalDocument />} />
              <Route path="/checkout/success" element={<CheckoutSuccess />} />
              <Route path="/information" element={<Information />} />
              <Route path="/maintenance" element={<Navigate to="/information" replace />} />
              <Route path="/building-control" element={
                <ProtectedRoute>
                  <BuildingControl />
                </ProtectedRoute>
              } />
              <Route path="/building-designer" element={
                <ProtectedRoute>
                  <BuildingDesigner />
                </ProtectedRoute>
              } />
              <Route path="/buildings" element={
                <ProtectedRoute>
                  <Buildings />
                </ProtectedRoute>
              } />
              <Route path="/buildings/:buildingId" element={
                <ProtectedRoute>
                  <BuildingHumidity />
                </ProtectedRoute>
              } />
              <Route path="/buildings/:buildingId/designer" element={
                <ProtectedRoute>
                  <BuildingLayoutEditor />
                </ProtectedRoute>
              } />
              <Route path="/sites-map" element={
                <ProtectedRoute>
                  <SitesMap />
                </ProtectedRoute>
              } />
              <Route path="/sites" element={
                <ProtectedRoute>
                  <Sites />
                </ProtectedRoute>
              } />
              <Route
                path="/dashboard/*"
                element={
                  <ProtectedRoute>
                    <DashboardLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Dashboard embedded />} />
                <Route path="sites" element={<Sites embedded />} />
                <Route path="buildings" element={<Navigate to="/dashboard/sites" replace />} />
                <Route path="alerts" element={<AlertHistory />} />
              </Route>
              <Route path="/account" element={
                <ProtectedRoute>
                  <Account />
                </ProtectedRoute>
              } />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            </LegalComplianceProvider>
          </BrowserRouter>
        </ZoomWrapper>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
