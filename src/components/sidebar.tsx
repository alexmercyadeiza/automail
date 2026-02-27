import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import type { ReactNode } from "react";

type NavItem = {
  name: string;
  href: string;
  exact?: boolean;
  icon: ReactNode;
};

const navItems: NavItem[] = [
  {
    name: "Dashboard",
    href: "/",
    exact: true,
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
      />
    ),
  },
  {
    name: "Broadcasts",
    href: "/broadcasts",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"
      />
    ),
  },
  {
    name: "Campaigns",
    href: "/campaigns",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
      />
    ),
  },
  {
    name: "Team",
    href: "/team",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
      />
    ),
  },
];

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const pathname = location.pathname;

  const handleSignOut = () => {
    document.cookie = "auth_session=; path=/; max-age=0";
    navigate({ to: "/login" });
  };

  return (
    <aside className="w-64 bg-white border-r border-neutral-200/70 h-full flex flex-col">
      <div className="p-6 border-b border-neutral-200/70">
        <img src="/logo.svg" alt="automail" className="h-5" />
      </div>

      <nav className="flex-1 px-4 py-6 space-y-2">
        {navItems.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          return (
            <Link
              key={item.name}
              to={item.href}
              className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                isActive
                  ? "text-neutral-900 font-semibold"
                  : "text-neutral-500 hover:text-neutral-700"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full transition-colors ${
                  isActive
                    ? "bg-green-400"
                    : "bg-neutral-300 group-hover:bg-neutral-400"
                }`}
              />
              <svg
                className={`h-5 w-5 transition-colors ${
                  isActive
                    ? "text-neutral-900"
                    : "text-neutral-400 group-hover:text-neutral-600"
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                {item.icon}
              </svg>
              <span className="tracking-tight">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-neutral-200/70">
        <button
          type="button"
          onClick={handleSignOut}
          className="group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-neutral-500 transition-colors hover:text-red-600"
        >
          <svg
            className="h-5 w-5 transition-colors group-hover:text-red-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
          </svg>
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  );
}
