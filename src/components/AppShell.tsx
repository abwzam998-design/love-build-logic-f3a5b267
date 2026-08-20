import { Link, useNavigate } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import {
  LayoutDashboard,
  ShoppingCart,
  Truck,
  Receipt,
  Wallet,
  Boxes,
  UserCog,
  BarChart3,
  Settings,
  Menu,
  LogOut,
  ShieldCheck,

} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/moath-soft-logo.png";

import { useRole, useSettings, useMyProfile, useIsSuperAdmin } from "@/hooks/useAppData";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/dashboard", label: "لوحة اليوم", icon: LayoutDashboard, manager: false },
  { to: "/sales", label: "المبيعات", icon: ShoppingCart, manager: false },
  { to: "/ledger", label: "الإجماليات والديون", icon: Receipt, manager: false },
  { to: "/purchases", label: "المشتريات والموردين", icon: Truck, manager: false },
  { to: "/inventory", label: "المخزون والهالك", icon: Boxes, manager: true },
  { to: "/expenses", label: "المصروفات والإيجارات", icon: Wallet, manager: true },
  { to: "/personal", label: "السلف والمسحوبات", icon: UserCog, manager: true },
  { to: "/reports", label: "التقارير", icon: BarChart3, manager: true },
  { to: "/settings", label: "الإعدادات", icon: Settings, manager: false },
] as const;

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const { isManager } = useRole();
  const isSuperAdmin = useIsSuperAdmin();
  const linkClass =
    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground";
  const activeProps = { className: "bg-sidebar-primary text-sidebar-primary-foreground" };
  return (
    <nav className="flex flex-col gap-1">
      {NAV.filter((n) => !n.manager || isManager).map((n) => (
        <Link
          key={n.to}
          to={n.to}
          onClick={onNavigate}
          className={linkClass}
          activeProps={activeProps}
        >
          <n.icon className="size-4 shrink-0" />
          {n.label}
        </Link>
      ))}
      {isSuperAdmin && (
        <Link to="/admin" onClick={onNavigate} className={linkClass} activeProps={activeProps}>
          <ShieldCheck className="size-4 shrink-0" />
          إدارة الاشتراكات
        </Link>
      )}
    </nav>
  );
}


export function AppShell({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const { data: settings } = useSettings();
  const { isManager, user } = useRole();
  const { data: profile } = useMyProfile();
  const isSuperAdmin = useIsSuperAdmin();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const suspended = !!profile && profile.is_active === false && !isSuperAdmin;


  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

  const Brand = (
    <div className="border-b border-sidebar-border px-4 py-4">
      <div className="flex items-center gap-2">
        <img
          src={logo}
          alt="شعار معاذ سوفت"
          width={816}
          height={816}
          className="size-9 shrink-0 object-contain"
        />
        <div className="min-w-0">
          <p className="text-base font-bold text-sidebar-foreground">
            {settings?.business_name ?? "نظام الإدارة"}
          </p>
          <p className="text-[11px] font-medium text-primary">معاذ سوفت</p>
        </div>
      </div>
      <p className="mt-1.5 truncate text-xs text-sidebar-foreground/60">
        {user?.email} · {isManager ? "مدير" : "كاشير"}
      </p>
    </div>
  );


  return (
    <div className="flex min-h-screen bg-background">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-sidebar lg:flex">
        {Brand}
        <div className="flex-1 overflow-y-auto p-3">
          <NavLinks />
        </div>
        <div className="p-3">
          <Button variant="ghost" className="w-full justify-start gap-2" onClick={signOut}>
            <LogOut className="size-4" /> تسجيل الخروج
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b bg-card/90 px-4 py-3 backdrop-blur">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="lg:hidden">
                <Menu className="size-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 bg-sidebar p-0">
              {Brand}
              <div className="p-3">
                <NavLinks onNavigate={() => setOpen(false)} />
                <Button variant="ghost" className="mt-2 w-full justify-start gap-2" onClick={signOut}>
                  <LogOut className="size-4" /> تسجيل الخروج
                </Button>
              </div>
            </SheetContent>
          </Sheet>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-bold text-foreground">{title}</h1>
            {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          {actions}
        </header>
        <main className={cn("flex-1 p-4 md:p-6")}>{children}</main>
      </div>
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "good" | "bad" | "warn";
}) {
  const toneClass = {
    default: "text-foreground",
    good: "text-primary",
    bad: "text-destructive",
    warn: "text-chart-4",
  }[tone];
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className={cn("mt-1 text-2xl font-bold tabular-nums", toneClass)}>{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
