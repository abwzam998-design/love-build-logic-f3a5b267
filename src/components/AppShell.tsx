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
  Users,
  Crown,
  User,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/moath-soft-logo.png";

import { useRole, useSettings, useMyProfile, useIsSuperAdmin, useIsOwner } from "@/hooks/useAppData";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const NAV = [
  { to: "/dashboard", label: "لوحة اليوم", icon: LayoutDashboard, manager: false },
  { to: "/sales", label: "المبيعات", icon: ShoppingCart, manager: false },
  { to: "/ledger", label: "الإجماليات والديون", icon: Receipt, manager: false },
  { to: "/accounts", label: "الحسابات", icon: UserCog, manager: false },
  { to: "/followup", label: "متابعة العملاء", icon: Users, manager: false },
  { to: "/receipts", label: "السندات", icon: Receipt, manager: false },
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
  const isOwner = useIsOwner();
  const linkClass =
    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-sidebar-foreground/75 transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:translate-x-[-2px]";
  const activeProps = {
    className:
      "bg-sidebar-primary text-sidebar-primary-foreground font-bold shadow-[0_4px_14px_-4px_var(--sidebar-primary)]",
  };
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
      {(isManager || isSuperAdmin) && (
        <Link to="/admin" onClick={onNavigate} className={linkClass} activeProps={activeProps}>
          <ShieldCheck className="size-4 shrink-0" />
          إدارة المستخدمين
        </Link>
      )}
      {isOwner && (
        <Link to="/owner" onClick={onNavigate} className={linkClass} activeProps={activeProps}>
          <Crown className="size-4 shrink-0" />
          لوحة مالك المنصة
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
  const isOwner = useIsOwner();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const p = profile as
    | { is_active?: boolean; subscription_status?: string; trial_ends_at?: string | null }
    | null
    | undefined;
  const trialExpired =
    !!p?.trial_ends_at && new Date(p.trial_ends_at).getTime() < Date.now();
  const suspended =
    !!p &&
    !isSuperAdmin &&
    !isOwner &&
    (p.is_active === false || p.subscription_status === "suspended" || trialExpired);


  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

  const Brand = (
    <div className="border-b border-sidebar-border px-4 py-5">
      <div className="flex items-center gap-3">
        <div className="rounded-2xl bg-white/95 p-1.5 shadow-[0_4px_14px_-4px_rgba(0,0,0,0.4)]">
          <img
            src={logo}
            alt="شعار معاذ سوفت"
            width={816}
            height={816}
            className="size-8 shrink-0 object-contain"
          />
        </div>
        <div className="min-w-0">
          <p className="truncate text-base font-bold text-sidebar-foreground">
            {settings?.business_name ?? "نظام الإدارة"}
          </p>
          <p className="text-[11px] font-bold tracking-wide text-sidebar-primary">معاذ سوفت</p>
        </div>
      </div>
      <p className="mt-1.5 truncate text-xs text-sidebar-foreground/60">
        {user?.email} · {isManager ? "مدير" : "كاشير"}
      </p>
    </div>
  );



  if (suspended) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-secondary px-4">
        <div className="w-full max-w-md rounded-2xl border bg-card p-6 text-center shadow-lg">
          <img src={logo} alt="شعار معاذ سوفت" className="mx-auto size-16 object-contain" />
          <p className="mt-2 text-sm font-bold text-primary">معاذ سوفت</p>
          <h1 className="mt-3 text-lg font-bold text-destructive">
            {trialExpired ? "انتهت الفترة التجريبية" : "تم إيقاف الحساب"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {trialExpired
              ? "انتهت فترتك التجريبية. يرجى التواصل مع إدارة النظام لتفعيل الاشتراك."
              : "تم إيقاف حسابك / اشتراكك. يرجى التواصل مع إدارة النظام."}
          </p>
          <Button variant="outline" className="mt-5 w-full gap-2" onClick={signOut}>
            <LogOut className="size-4" /> تسجيل الخروج
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">

      <aside className="sidebar-surface sticky top-0 hidden h-screen w-64 shrink-0 flex-col lg:flex">
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
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b bg-card/80 px-4 py-3 shadow-sm backdrop-blur-md">
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
          <div className="flex shrink-0 items-center gap-1.5 lg:hidden">
            <img src={logo} alt="شعار معاذ سوفت" className="size-7 object-contain" />
            <span className="text-xs font-bold text-primary">معاذ سوفت</span>
          </div>
          <div className="min-w-0 flex-1">

            <h1 className="truncate text-lg font-bold text-foreground">{title}</h1>
            {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          {actions}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="shrink-0" aria-label="حساب المستخدم">
                <User className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-2 py-1.5 text-sm">
                <p className="font-semibold truncate">{profile?.full_name ?? user?.email ?? "المستخدم"}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/settings" className="w-full cursor-pointer">
                  الإعدادات
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/my-account" className="w-full cursor-pointer">
                  حسابي
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={signOut}
                className="cursor-pointer text-destructive focus:text-destructive"
              >
                <LogOut className="size-4 ml-2" />
                تسجيل الخروج
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <main className={cn("page-surface flex-1 p-4 md:p-6")}>{children}</main>
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
  const tones = {
    default: {
      bar: "from-chart-3 to-chart-3/60",
      icon: "bg-chart-3/10 text-chart-3",
      value: "text-foreground",
    },
    good: {
      bar: "from-primary to-primary-glow",
      icon: "bg-primary/10 text-primary",
      value: "text-primary",
    },
    bad: {
      bar: "from-destructive to-destructive/60",
      icon: "bg-destructive/10 text-destructive",
      value: "text-destructive",
    },
    warn: {
      bar: "from-chart-4 to-chart-4/60",
      icon: "bg-chart-4/15 text-chart-4",
      value: "text-chart-4",
    },
  }[tone];
  return (
    <div className="group relative overflow-hidden rounded-2xl border bg-card p-4 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-card-hover">
      <div className={cn("absolute inset-x-0 top-0 h-1 bg-gradient-to-l", tones.bar)} />
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className={cn("mt-1.5 text-2xl font-bold tabular-nums", tones.value)}>{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
