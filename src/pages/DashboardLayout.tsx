import React from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import TopTaskbar from "@/components/TopTaskbar";

const DashboardLayout: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <TopTaskbar
        subtitle={
          user ? `Welcome, ${user.name} (${user.role.replace("_", " ")})` : "Demo dashboard · sample data"
        }
      />

      <div className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6">
        {user && (
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <NavLink
              to="/dashboard"
              end
              className={({ isActive }) =>
                [
                  "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                  isActive ? "bg-foreground text-primary-foreground" : "bg-card text-foreground hover:bg-muted",
                ].join(" ")
              }
            >
              Machines
            </NavLink>
            <NavLink
              to="/dashboard/sites"
              className={({ isActive }) =>
                [
                  "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                  isActive ? "bg-foreground text-primary-foreground" : "bg-card text-foreground hover:bg-muted",
                ].join(" ")
              }
            >
              Sites
            </NavLink>
            <NavLink
              to="/dashboard/alerts"
              className={({ isActive }) =>
                [
                  "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                  isActive ? "bg-foreground text-primary-foreground" : "bg-card text-foreground hover:bg-muted",
                ].join(" ")
              }
            >
              Alerts
            </NavLink>
          </div>
        )}

        <div className="rounded-2xl border border-border bg-card">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;

