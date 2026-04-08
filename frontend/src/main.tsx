import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { LandingPage } from '@/pages/LandingPage';
import { LoginPage, RegisterPage } from '@/pages/AuthPages';
import { CanvasPage } from '@/pages/CanvasPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { MarketplacePage } from '@/pages/MarketplacePage';
import { PurchaseSuccessPage, PurchaseCancelPage } from '@/pages/PurchasePages';
import { AdminPage } from '@/pages/AdminPage';
import { OfferPage, ContactsPage, RefundPage, PrivacyPage } from '@/pages/LegalPages';
import '@/styles/globals.css';

function App() {
  const loadUser = useAuthStore((s) => s.loadUser);
  const loading = useAuthStore((s) => s.loading);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  if (loading) {
    return (
      <div className="min-h-screen bg-canvas-bg flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-neon-cyan/30 border-t-neon-cyan rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/canvas" element={<CanvasPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/marketplace" element={<MarketplacePage />} />
        <Route path="/purchase/success" element={<PurchaseSuccessPage />} />
        <Route path="/purchase/cancel" element={<PurchaseCancelPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/offer" element={<OfferPage />} />
        <Route path="/contacts" element={<ContactsPage />} />
        <Route path="/refund" element={<RefundPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
      </Routes>
    </BrowserRouter>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
