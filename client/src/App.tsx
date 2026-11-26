import { Suspense, lazy } from "react";
import { Route, Routes } from "react-router-dom";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { AppShell } from "@/components/layout/AppShell";
import { DashboardNotFound } from "@/pages/dashboard/DashboardNotFound";
import { ForbiddenPage } from "@/pages/ForbiddenPage";
import { NotFoundPage } from "@/pages/NotFoundPage";

const ForgotPasswordPage = lazy(() =>
  import("@/pages/auth/ForgotPasswordPage").then((module) => ({ default: module.ForgotPasswordPage })),
);
const LoginPage = lazy(() =>
  import("@/pages/auth/LoginPage").then((module) => ({ default: module.LoginPage })),
);
const RegisterPage = lazy(() =>
  import("@/pages/auth/RegisterPage").then((module) => ({ default: module.RegisterPage })),
);
const ResetPasswordPage = lazy(() =>
  import("@/pages/auth/ResetPasswordPage").then((module) => ({ default: module.ResetPasswordPage })),
);
const AdminOverview = lazy(() =>
  import("@/pages/dashboard/AdminOverview").then((module) => ({ default: module.AdminOverview })),
);
const AgentOverview = lazy(() =>
  import("@/pages/dashboard/AgentOverview").then((module) => ({ default: module.AgentOverview })),
);
const BuyerOverview = lazy(() =>
  import("@/pages/dashboard/BuyerOverview").then((module) => ({ default: module.BuyerOverview })),
);
const ProfilePage = lazy(() =>
  import("@/pages/dashboard/ProfilePage").then((module) => ({ default: module.ProfilePage })),
);
const AdminApprovalsPage = lazy(() =>
  import("@/pages/admin/AdminApprovalsPage").then((module) => ({ default: module.AdminApprovalsPage })),
);
const AdminAuditPage = lazy(() =>
  import("@/pages/admin/AdminAuditPage").then((module) => ({ default: module.AdminAuditPage })),
);
const AdminListingsPage = lazy(() =>
  import("@/pages/admin/AdminListingsPage").then((module) => ({ default: module.AdminListingsPage })),
);
const AdminUsersPage = lazy(() =>
  import("@/pages/admin/AdminUsersPage").then((module) => ({ default: module.AdminUsersPage })),
);
const AdminSettingsPage = lazy(() =>
  import("@/pages/admin/AdminSettingsPage").then((module) => ({ default: module.AdminSettingsPage })),
);
const AgentAnalyticsPage = lazy(() =>
  import("@/pages/agent/AgentAnalyticsPage").then((module) => ({ default: module.AgentAnalyticsPage })),
);
const HomePage = lazy(() =>
  import("@/pages/HomePage").then((module) => ({ default: module.HomePage })),
);
const PropertiesPage = lazy(() =>
  import("@/pages/PropertiesPage").then((module) => ({ default: module.PropertiesPage })),
);
const PropertyDetailPage = lazy(() =>
  import("@/pages/PropertyDetailPage").then((module) => ({ default: module.PropertyDetailPage })),
);
const AgentListingsPage = lazy(() =>
  import("@/pages/agent/AgentListingsPage").then((module) => ({ default: module.AgentListingsPage })),
);
const ListingWizardPage = lazy(() =>
  import("@/pages/agent/ListingWizardPage").then((module) => ({ default: module.ListingWizardPage })),
);
const FavoritesPage = lazy(() =>
  import("@/pages/favorites/FavoritesPage").then((module) => ({ default: module.FavoritesPage })),
);
const AgentLeadsPage = lazy(() =>
  import("@/pages/inquiries/AgentLeadsPage").then((module) => ({ default: module.AgentLeadsPage })),
);
const BuyerInquiriesPage = lazy(() =>
  import("@/pages/inquiries/BuyerInquiriesPage").then((module) => ({ default: module.BuyerInquiriesPage })),
);
const MessagesPage = lazy(() =>
  import("@/pages/messages/MessagesPage").then((module) => ({ default: module.MessagesPage })),
);
const AgentsPage = lazy(() =>
  import("@/pages/agents/AgentsPage").then((module) => ({ default: module.AgentsPage })),
);
const AgentProfilePage = lazy(() =>
  import("@/pages/agents/AgentsPage").then((module) => ({ default: module.AgentProfilePage })),
);
const ContactAgentPage = lazy(() =>
  import("@/pages/agents/ContactAgentPage").then((module) => ({
    default: module.ContactAgentPage,
  })),
);
const AboutPage = lazy(() =>
  import("@/pages/static/InfoPages").then((module) => ({ default: module.AboutPage })),
);
const ContactPage = lazy(() =>
  import("@/pages/static/InfoPages").then((module) => ({ default: module.ContactPage })),
);
const FaqPage = lazy(() =>
  import("@/pages/static/InfoPages").then((module) => ({ default: module.FaqPage })),
);
const PrivacyPage = lazy(() =>
  import("@/pages/static/InfoPages").then((module) => ({ default: module.PrivacyPage })),
);
const TermsPage = lazy(() =>
  import("@/pages/static/InfoPages").then((module) => ({ default: module.TermsPage })),
);
const ListPropertyPage = lazy(() =>
  import("@/pages/static/InfoPages").then((module) => ({ default: module.ListPropertyPage })),
);

function RouteFallback() {
  return (
    <div className="shell-container py-16" role="status" aria-live="polite">
      <div className="mx-auto h-6 w-40 animate-pulse rounded-md bg-line" />
      <p className="mt-3 text-center text-sm text-body">Loading…</p>
    </div>
  );
}

export function App() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      <Route
        path="/account"
        element={
          <ProtectedRoute roles={["buyer"]}>
            <DashboardShell role="buyer" />
          </ProtectedRoute>
        }
      >
        <Route index element={<BuyerOverview />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="favorites" element={<FavoritesPage />} />
        <Route path="saved-searches" element={<FavoritesPage initialTab="searches" />} />
        <Route path="inquiries" element={<BuyerInquiriesPage />} />
        <Route path="messages" element={<MessagesPage />} />
        <Route path="messages/:conversationId" element={<MessagesPage />} />
        <Route
          path="*"
          element={<DashboardNotFound role="buyer" />}
        />
      </Route>

      <Route
        path="/agent"
        element={
          <ProtectedRoute roles={["agent"]}>
            <DashboardShell role="agent" />
          </ProtectedRoute>
        }
      >
        <Route index element={<AgentOverview />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="listings" element={<AgentListingsPage />} />
        <Route path="listings/new" element={<ListingWizardPage />} />
        <Route path="listings/:id/edit" element={<ListingWizardPage />} />
        <Route path="leads" element={<AgentLeadsPage />} />
        <Route path="messages" element={<MessagesPage />} />
        <Route path="messages/:conversationId" element={<MessagesPage />} />
        <Route path="analytics" element={<AgentAnalyticsPage />} />
        <Route path="*" element={<DashboardNotFound role="agent" />} />
      </Route>

      <Route
        path="/admin"
        element={
          <ProtectedRoute roles={["admin"]}>
            <DashboardShell role="admin" />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminOverview />} />
        <Route path="approvals" element={<AdminApprovalsPage />} />
        <Route path="listings" element={<AdminListingsPage />} />
        <Route path="agents" element={<AdminUsersPage fixedRole="agent" />} />
        <Route path="users" element={<AdminUsersPage />} />
        <Route
          path="inquiries"
          element={
            <AgentLeadsPage
              title="Inquiries"
              description="Every lead across the platform, with buyer contact details, property context, and moderation notes."
            />
          }
        />
        <Route path="audit" element={<AdminAuditPage />} />
        <Route path="settings" element={<AdminSettingsPage />} />
        <Route path="*" element={<DashboardNotFound role="admin" />} />
      </Route>

      <Route element={<AppShell />}>
        <Route index element={<HomePage />} />

        <Route path="properties" element={<PropertiesPage />} />
        <Route path="properties/:slug" element={<PropertyDetailPage />} />
        <Route
          path="agents"
          element={
            <ProtectedRoute roles={["buyer", "agent", "admin"]}>
              <AgentsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="agents/:id/contact"
          element={
            <ProtectedRoute roles={["buyer", "agent", "admin"]}>
              <ContactAgentPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="agents/:id"
          element={
            <ProtectedRoute roles={["buyer", "agent", "admin"]}>
              <AgentProfilePage />
            </ProtectedRoute>
          }
        />
        <Route path="list-property" element={<ListPropertyPage />} />
        <Route
          path="favorites"
          element={
            <ProtectedRoute roles={["buyer", "agent", "admin"]}>
              <FavoritesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="saved-searches"
          element={
            <ProtectedRoute roles={["buyer", "agent", "admin"]}>
              <FavoritesPage initialTab="searches" />
            </ProtectedRoute>
          }
        />
        <Route
          path="messages"
          element={
            <ProtectedRoute roles={["buyer", "agent", "admin"]}>
              <MessagesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="messages/:conversationId"
          element={
            <ProtectedRoute roles={["buyer", "agent", "admin"]}>
              <MessagesPage />
            </ProtectedRoute>
          }
        />
        <Route path="about" element={<AboutPage />} />
        <Route path="contact" element={<ContactPage />} />
        <Route path="faq" element={<FaqPage />} />
        <Route path="privacy" element={<PrivacyPage />} />
        <Route path="terms" element={<TermsPage />} />

        <Route path="forbidden" element={<ForbiddenPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
      </Routes>
    </Suspense>
  );
}