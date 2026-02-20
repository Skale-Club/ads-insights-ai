import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { DashboardProvider } from "@/contexts/DashboardContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Analytics } from "@vercel/analytics/react";

// Pages
import LoginPage from "@/pages/Login";
import AuthCallback from "@/pages/AuthCallback";

import ConnectGoogleAdsPage from "@/pages/ConnectGoogleAds";
import OverviewPage from "@/pages/dashboard/Overview";
import CampaignsPage from "@/pages/dashboard/Campaigns";
import KeywordsPage from "@/pages/dashboard/Keywords";
import SearchTermsPage from "@/pages/dashboard/SearchTerms";
import RecommendationsPage from "@/pages/dashboard/Recommendations";
import SettingsPage from "@/pages/Settings";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <DashboardProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/auth/callback" element={<AuthCallback />} />


              {/* Protected routes */}
              <Route
                path="/connect/ads"
                element={
                  <ProtectedRoute>
                    <ConnectGoogleAdsPage />
                  </ProtectedRoute>
                }
              />

              {/* Dashboard routes */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <DashboardLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="overview" replace />} />
                <Route path="overview" element={<OverviewPage />} />
                <Route path="campaigns" element={<CampaignsPage />} />
                <Route path="keywords" element={<KeywordsPage />} />
                <Route path="search-terms" element={<SearchTermsPage />} />
                <Route path="recommendations" element={<RecommendationsPage />} />
              </Route>

              {/* Settings */}
              <Route
                path="/settings"
                element={
                  <ProtectedRoute>
                    <DashboardLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<SettingsPage />} />
              </Route>

              {/* Redirect root to login or dashboard */}
              <Route path="/" element={<Navigate to="/login" replace />} />

              {/* Catch-all */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
          <Analytics />
        </DashboardProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
