import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { LandingPage } from '@/pages/LandingPage';
import { LoginPage, RegisterPage } from '@/pages/AuthPages';
import { CanvasPage } from '@/pages/CanvasPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { SubscribePage, SubscribeSuccessPage, SubscribeCancelPage } from '@/pages/SubscribePage';
import { OfferPage, ContactsPage, RefundPage, PrivacyPage } from '@/pages/LegalPages';
import { AdminPage } from '@/pages/AdminPage';
import { LeaderboardPage } from '@/pages/LeaderboardPage';
import { ReferralPage } from '@/pages/ReferralPage';
import { ClansListPage, CreateClanPage, MyClanPage, ClanDetailPage, ClanInvitePage } from '@/pages/ClanPages';
import { ShopPage, AchievementsPage } from '@/pages/EconomyPages';
import { ServerWakingOverlay } from '@/components/layout/ServerWakingOverlay';
import '@/styles/globals.css';

function App() {
  const loadUser = useAuthStore((s) => s.loadUser);
  const loading = useAuthStore((s) => s.loading);
  useEffect(() => { loadUser(); }, [loadUser]);

  if (loading) {
    return (
      <div className="min-h-screen bg-canvas-bg flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <BrowserRouter>
      <ServerWakingOverlay />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/canvas" element={<CanvasPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/subscribe" element={<SubscribePage />} />
        <Route path="/subscribe/success" element={<SubscribeSuccessPage />} />
        <Route path="/subscribe/cancel" element={<SubscribeCancelPage />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
        <Route path="/referral" element={<ReferralPage />} />
        <Route path="/clans" element={<ClansListPage />} />
        <Route path="/clans/create" element={<CreateClanPage />} />
        <Route path="/clans/my" element={<MyClanPage />} />
        <Route path="/clans/invite/:code" element={<ClanInvitePage />} />
        <Route path="/clans/:id" element={<ClanDetailPage />} />
        <Route path="/shop" element={<ShopPage />} />
        <Route path="/achievements" element={<AchievementsPage />} />
        <Route path="/offer" element={<OfferPage />} />
        <Route path="/contacts" element={<ContactsPage />} />
        <Route path="/refund" element={<RefundPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/admin" element={<AdminPage />} />
      </Routes>
    </BrowserRouter>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><App /></React.StrictMode>,
);
