import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "../components/auth/ProtectedRoute";

import LandingPage from "../pages/LandingPage/LandingPage"; 
import LoginPage from "../pages/LoginPage";
import RegisterPage from "../pages/RegisterPage";
import DashboardPage from "../pages/DashboardPage";
import CommunityPage from "../pages/CommunityPage";
import CreateCommunityPage from "../pages/CreateCommunityPage";
import NotificationsPage from "../pages/NotificationsPage";
import DiscoveryPage from "../pages/DiscoveryPage";
import CommunitySettingsPage from "../pages/CommunitySettingsPage";
import CommunityAnalyticsPage from "../pages/CommunityAnalyticsPage";
import CommunityTiersManagePage from "../pages/CommunityTiersManagePage";
import CommunityBillingPage from "../pages/CommunityBillingPage";
import CommunityRolesPage from "../pages/CommunityRolesPage";
import CommunityMembersPage from "../pages/CommunityMembersPage";
import CommunityModerationLogPage from "../pages/CommunityModerationLogPage";
import CommunityAppealsPage from "../pages/CommunityAppealsPage";
import InvitePreviewPage from "../pages/InvitePreviewPage";
import ProfilePage from "../pages/ProfilePage";
import EditProfilePage from "../pages/EditProfilePage";
import FriendsPage from "../pages/FriendsPage";
import MediaLibraryPage from "../pages/MediaLibraryPage";
import SearchPage from "../pages/SearchPage";
import InboxPage from "../pages/InboxPage";
import OnboardingPage from "../pages/OnboardingPage";
import PublicCommunityPreviewPage from "../pages/PublicCommunityPreviewPage";

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/c/:slug" element={<PublicCommunityPreviewPage />} />

        <Route
          path="/"
          element={
            <LandingPage />
          }
        />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
            <DashboardPage />
            </ProtectedRoute>
          }
        />

        <Route path="/app" element={<Navigate to="/dashboard" replace />} />

        <Route
          path="/communities/new"
          element={
            <ProtectedRoute>
              <CreateCommunityPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/communities/:slug"
          element={
            <ProtectedRoute>
              <CommunityPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/communities/:slug/settings"
          element={
            <ProtectedRoute>
              <CommunitySettingsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/communities/:slug/analytics"
          element={
            <ProtectedRoute>
              <CommunityAnalyticsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/communities/:slug/tiers/manage"
          element={
            <ProtectedRoute>
              <CommunityTiersManagePage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/communities/:slug/billing"
          element={
            <ProtectedRoute>
              <CommunityBillingPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/communities/:slug/roles"
          element={
            <ProtectedRoute>
              <CommunityRolesPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/communities/:slug/members"
          element={
            <ProtectedRoute>
              <CommunityMembersPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/communities/:slug/moderation-logs"
          element={
            <ProtectedRoute>
              <CommunityModerationLogPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/communities/:slug/appeals"
          element={
            <ProtectedRoute>
              <CommunityAppealsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              <NotificationsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/discover"
          element={
            <ProtectedRoute>
              <DiscoveryPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/invite/:code"
          element={
            <ProtectedRoute>
              <InvitePreviewPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/u/:username"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/me/edit"
          element={
            <ProtectedRoute>
              <EditProfilePage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/friends"
          element={
            <ProtectedRoute>
              <FriendsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/inbox"
          element={
            <ProtectedRoute>
              <InboxPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/welcome"
          element={
            <ProtectedRoute>
              <OnboardingPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/media"
          element={
            <ProtectedRoute>
              <MediaLibraryPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/search"
          element={
            <ProtectedRoute>
              <SearchPage />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
} 