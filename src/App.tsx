import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
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
import SitesMap from "./pages/SitesMap";
import Home from "./pages/Home";

const queryClient = new QueryClient();

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-foreground">Loading...</div>
    </div>;
  }
  
  return user ? <>{children}</> : <Navigate to="/" replace />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <ZoomWrapper>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/email-confirmation" element={<EmailConfirmation />} />
              <Route path="/setup-demo" element={<SetupDemo />} />
              <Route path="/email-template" element={<EmailTemplate />} />
              <Route path="/pharmacy-email-template" element={<PharmacyEmailTemplate />} />
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
              <Route path="/sites-map" element={
                <ProtectedRoute>
                  <SitesMap />
                </ProtectedRoute>
              } />
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </ZoomWrapper>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
