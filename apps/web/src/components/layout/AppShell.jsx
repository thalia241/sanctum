import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useEffect, useMemo, useState } from "react";
import { listNotifications } from "../../api/notifications";
import {
  applyThemeToDocument,
  resolveTheme,
  accentButtonStyle,
} from "../../lib/theme";

function NavLinkItem({ to, children, isActive, accentColor, badge }) {
  return (
    <Link
      to={to}
      className="rounded-lg px-3 py-2 text-sm transition"
      style={
        isActive
          ? {
              backgroundColor: `${accentColor}22`,
              color: accentColor,
              border: `1px solid ${accentColor}44`,
            }
          : undefined
      }
    >
      <span className="inline-flex items-center gap-2">
        {children}
        {badge ? (
          <span
            className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
            style={{
              backgroundColor: `${accentColor}22`,
              border: `1px solid ${accentColor}44`,
              color: accentColor,
            }}
          >
            {badge}
          </span>
        ) : null}
      </span>
    </Link>
  );
}

function getCoreOnboardingCount(user) {
  const actions = user?.onboarding?.actions || {};
  const completed = [
    actions.profileSavedAt,
    actions.themeChosenAt,
    actions.joinedCommunityAt,
    actions.sentFriendRequestAt,
    actions.createdPostAt,
  ].filter(Boolean).length;

  return completed;
}

export default function AppShell({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);

  const theme = useMemo(() => resolveTheme(user?.theme || {}), [user?.theme]);
  const onboardingCount = getCoreOnboardingCount(user);
  const onboardingComplete = Boolean(user?.onboarding?.completedAt);
  const onboardingBadge = onboardingComplete ? null : `${onboardingCount}/5`;

  useEffect(() => {
    applyThemeToDocument(theme);
  }, [theme]);

  useEffect(() => {
    async function loadNotifications() {
      try {
        const data = await listNotifications();
        const unread = (data.notifications || []).filter((n) => !n.readAt).length;
        setUnreadCount(unread);
      } catch (err) {
        console.error("Failed to load notifications", err);
      }
    }

    loadNotifications();
  }, []);

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div
      className="min-h-screen"
      style={{
        backgroundColor: theme.backgroundColor,
        color: theme.textColor,
      }}
    >
      <header
        className="sticky top-0 z-20 border-b backdrop-blur"
        style={{
          backgroundColor: `${theme.backgroundColor}ee`,
          borderColor: `${theme.accentColor}22`,
        }}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4">
          <Link
            to="/"
            className="text-lg font-bold tracking-tight"
            style={{ color: theme.accentColor }}
          >
            Sanctum
          </Link>

          <nav className="flex flex-wrap items-center gap-2 text-sm">
            <NavLinkItem
              to="/"
              isActive={location.pathname === "/"}
              accentColor={theme.accentColor}
            >
              Dashboard
            </NavLinkItem>

            <NavLinkItem
              to={`/u/${user?.username}`}
              isActive={location.pathname.startsWith(`/u/${user?.username || ""}`)}
              accentColor={theme.accentColor}
            >
              Profile
            </NavLinkItem>

            <NavLinkItem
              to="/friends"
              isActive={location.pathname.startsWith("/friends")}
              accentColor={theme.accentColor}
            >
              Friends
            </NavLinkItem>

            <NavLinkItem
              to="/inbox"
              isActive={location.pathname.startsWith("/inbox")}
              accentColor={theme.accentColor}
            >
              Inbox
            </NavLinkItem>

            <NavLinkItem
              to="/media"
              isActive={location.pathname.startsWith("/media")}
              accentColor={theme.accentColor}
            >
              Media
            </NavLinkItem>

            <NavLinkItem
              to="/discover"
              isActive={location.pathname.startsWith("/discover")}
              accentColor={theme.accentColor}
            >
              Discover
            </NavLinkItem>

            <NavLinkItem
              to="/search"
              isActive={location.pathname.startsWith("/search")}
              accentColor={theme.accentColor}
            >
              Search
            </NavLinkItem>

            {!onboardingComplete ? (
              <NavLinkItem
                to="/welcome"
                isActive={location.pathname.startsWith("/welcome")}
                accentColor={theme.accentColor}
                badge={onboardingBadge}
              >
                Welcome
              </NavLinkItem>
            ) : null}

            <Link
              to="/notifications"
              className="relative rounded-lg px-3 py-2 text-sm transition"
              style={
                location.pathname.startsWith("/notifications")
                  ? {
                      backgroundColor: `${theme.accentColor}22`,
                      color: theme.accentColor,
                      border: `1px solid ${theme.accentColor}44`,
                    }
                  : undefined
              }
            >
              Notifications
              {unreadCount > 0 ? (
                <span
                  className="ml-2 rounded-full px-2 py-0.5 text-xs font-semibold"
                  style={{
                    backgroundColor: theme.accentColor,
                    color: "#0f172a",
                  }}
                >
                  {unreadCount}
                </span>
              ) : null}
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <span className="hidden text-sm md:block" style={{ color: `${theme.textColor}bb` }}>
              @{user?.username}
            </span>
            <button
              onClick={handleLogout}
              className="rounded-lg px-3 py-2 text-sm font-medium transition hover:opacity-90"
              style={accentButtonStyle(theme)}
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    </div>
  );
} 