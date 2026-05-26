import React, { useEffect, useMemo, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut, Menu } from "lucide-react";
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

type TopTaskbarProps = {
  title?: string;
  subtitle?: string;
  rightActions?: React.ReactNode;
  logoHref?: string;
};

const TopTaskbar: React.FC<TopTaskbarProps> = ({ title = "Cmonitor", subtitle, rightActions, logoHref = "/" }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const tabs: { label: string; to: string; show: boolean }[] = useMemo(() => [
    { label: "Home", to: "/", show: true },
    { label: "Pricing", to: "/pricing", show: true },
    { label: "Information", to: "/information", show: true },
    { label: "Account", to: "/account", show: Boolean(user) },
  ], [user]);

  const visibleTabs = tabs.filter((t) => t.show);

  return (
    <header
      className={[
        "sticky top-0 z-50 w-full border-b bg-background/75 backdrop-blur supports-[backdrop-filter]:bg-background/60",
        "border-border",
        isScrolled ? "shadow-[var(--shadow)]" : "shadow-none",
      ].join(" ")}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <a href={logoHref} className="flex min-w-0 items-center gap-3">
          <div className="flex h-[3.15rem] shrink-0 aspect-[1024/535] items-center justify-center overflow-hidden rounded-md border border-border bg-[#1a1f1a] px-1 shadow-sm">
            <img
              src="/3.png"
              alt="Crown Technologies"
              width={1024}
              height={535}
              className="h-full w-full object-contain"
            />
          </div>
          <div className="min-w-0 leading-tight">
            <div className="truncate text-sm font-semibold text-foreground">{title}</div>
            <div className="truncate text-xs text-muted-foreground">{subtitle ?? (user ? "Signed in" : "Monitoring platform")}</div>
          </div>
        </a>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 md:flex">
          {visibleTabs.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.to === "/"}
              className={({ isActive }) =>
                [
                  "rounded-full px-3 py-2 text-xs font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-[var(--glow-primary)]"
                    : "text-foreground/80 hover:bg-muted hover:text-foreground",
                ].join(" ")
              }
            >
              {t.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {/* Desktop actions */}
          <div className="hidden items-center gap-2 md:flex">
            {rightActions ? (
              rightActions
            ) : !user ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => navigate("/dashboard/demo")}
                  className="border-border"
                >
                  Demo dashboard
                </Button>
                <Button onClick={() => navigate("/login?source=home")} className="bg-foreground text-primary-foreground hover:bg-foreground/90">
                  Client Login
                </Button>
              </>
            ) : (
              <>
                <Button onClick={() => navigate("/dashboard")} className="bg-foreground text-primary-foreground hover:bg-foreground/90">
                  Dashboard
                </Button>
                <Button
                  variant="outline"
                  onClick={async () => {
                    await logout();
                    navigate("/", { replace: true });
                  }}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </Button>
              </>
            )}
          </div>

          {/* Mobile menu */}
          <div className="md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" aria-label="Open menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[320px] p-5">
                <SheetHeader className="pr-8">
                  <SheetTitle>Menu</SheetTitle>
                </SheetHeader>

                <div className="mt-5 grid gap-2">
                  {visibleTabs.map((t) => (
                    <SheetClose asChild key={t.to}>
                      <NavLink
                        to={t.to}
                        end={t.to === "/"}
                        className={({ isActive }) =>
                          [
                            "rounded-xl border px-4 py-3 text-sm font-medium transition-colors",
                            isActive
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-background hover:bg-muted text-foreground",
                          ].join(" ")
                        }
                      >
                        {t.label}
                      </NavLink>
                    </SheetClose>
                  ))}
                </div>

                <div className="mt-6 grid gap-2 border-t border-border pt-4">
                  {rightActions ? (
                    rightActions
                  ) : !user ? (
                    <>
                      <SheetClose asChild>
                        <Button variant="outline" onClick={() => navigate("/dashboard/demo")} className="w-full">
                          Demo dashboard
                        </Button>
                      </SheetClose>
                      <SheetClose asChild>
                        <Button onClick={() => navigate("/login?source=home")} className="w-full bg-foreground text-primary-foreground hover:bg-foreground/90">
                          Client Login
                        </Button>
                      </SheetClose>
                    </>
                  ) : (
                    <>
                      <SheetClose asChild>
                        <Button onClick={() => navigate("/dashboard")} className="w-full bg-foreground text-primary-foreground hover:bg-foreground/90">
                          Dashboard
                        </Button>
                      </SheetClose>
                      <SheetClose asChild>
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={async () => {
                            await logout();
                            navigate("/", { replace: true });
                          }}
                        >
                          <LogOut className="mr-2 h-4 w-4" />
                          Logout
                        </Button>
                      </SheetClose>
                    </>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
};

export default TopTaskbar;

