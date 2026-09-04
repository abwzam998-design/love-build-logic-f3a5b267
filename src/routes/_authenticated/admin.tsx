import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { MessageButtons } from "@/components/MessageButtons";
import { useRole, useSettings } from "@/hooks/useAppData";
import {
  approveAppUser,
  listAppUsers,
  setAppUserActive,
  setAppUserPassword,
  type AppUserRole,
} from "@/lib/admin.functions";
import { Search, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "إدارة المستخدمين | نظام إدارة المبيعات والمخزون" },
      {
        name: "description",
        content: "مراجعة طلبات الحسابات الجديدة، تحديد نوع الحساب وكلمة المرور، وإيقاف أو تفعيل أي مستخدم.",
      },
      { property: "og:title", content: "إدارة المستخدمين | نظام إدارة المبيعات والمخزون" },
      {
        property: "og:description",
        content: "الموافقة على الحسابات الجديدة وإرسال كلمة السر للعميل عبر واتساب أو رسالة نصية.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminPage,
});

const ROLES: { value: AppUserRole; label: string }[] = [
  { value: "manager", label: "مدير" },
  { value: "seller", label: "كاشير" },
  { value: "customer", label: "عميل" },
];

const roleLabel = (r: string | null) => ROLES.find((x) => x.value === r)?.label ?? "بدون صلاحية";

function AdminPage() {
  const { isManager, isLoading: roleLoading } = useRole();
  const { data: settings } = useSettings();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"pending" | "active">("pending");
  const [draft, setDraft] = useState<Record<string, { role: AppUserRole; password: string }>>({});

  const fetchUsers = useServerFn(listAppUsers);
  const approve = useServerFn(approveAppUser);
  const setActive = useServerFn(setAppUserActive);
  const setPassword = useServerFn(setAppUserPassword);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin-app-users"],
    enabled: isManager,
    queryFn: () => fetchUsers({} as never),
  });

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return users
      .filter((u) => (tab === "pending" ? !u.is_approved : u.is_approved))
      .filter(
        (u) =>
          !s ||
          (u.full_name ?? "").toLowerCase().includes(s) ||
          (u.phone ?? "").includes(s) ||
          (u.email ?? "").toLowerCase().includes(s),
      );
  }, [users, q, tab]);

  const draftOf = (id: string, role: string | null) =>
    draft[id] ?? { role: (role as AppUserRole) ?? "customer", password: "" };

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-app-users"] });

  const doApprove = async (id: string) => {
    const d = draftOf(id, null);
    try {
      await approve({ data: { userId: id, role: d.role, ...(d.password ? { password: d.password } : {}) } });
      toast.success("تمت الموافقة على الحساب");
      refresh();
    } catch {
      toast.error("تعذر تنفيذ العملية");
    }
  };

  const doPassword = async (id: string) => {
    const d = draftOf(id, null);
    if (d.password.length < 6) {
      toast.error("كلمة المرور يجب ألا تقل عن 6 أحرف");
      return;
    }
    try {
      await setPassword({ data: { userId: id, password: d.password } });
      toast.success("تم تحديث كلمة المرور");
    } catch {
      toast.error("تعذر تحديث كلمة المرور");
    }
  };

  const doToggle = async (id: string, active: boolean) => {
    try {
      await setActive({ data: { userId: id, active } });
      toast.success(active ? "تم تفعيل الحساب" : "تم إيقاف الحساب");
      refresh();
    } catch {
      toast.error("تعذر تحديث الحالة");
    }
  };

  const welcomeText = (name: string, phone: string | null, role: AppUserRole, password: string) =>
    `مرحباً ${name || "بك"} 👋\nتم تفعيل حسابك لدى ${settings?.business_name ?? "النظام"}.\nنوع الحساب: ${roleLabel(role)}\nرقم الدخول: ${phone ?? ""}\nكلمة السر: ${password || "(حددها المدير)"}\nيمكنك الدخول الآن عبر التطبيق.`;

  if (!roleLoading && !isManager) {
    return (
      <AppShell title="غير مصرح" subtitle="هذه الصفحة مخصصة للمدير فقط">
        <div className="rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground">
          لا تملك صلاحية الوصول لهذه الصفحة.
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="إدارة المستخدمين" subtitle="طلبات التسجيل، الصلاحيات، كلمات المرور، والإيقاف">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1">
          <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pr-9"
            placeholder="ابحث بالاسم أو رقم الجوال..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Button variant={tab === "pending" ? "default" : "outline"} onClick={() => setTab("pending")}>
            طلبات معلّقة ({users.filter((u) => !u.is_approved).length})
          </Button>
          <Button variant={tab === "active" ? "default" : "outline"} onClick={() => setTab("active")}>
            الحسابات المفعّلة ({users.filter((u) => u.is_approved).length})
          </Button>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {isLoading && <p className="text-sm text-muted-foreground">جارِ التحميل…</p>}
        {list.map((u) => {
          const d = draftOf(u.id, u.role);
          return (
            <div key={u.id} className="rounded-2xl border bg-card p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">{u.full_name || u.phone || u.email}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {u.phone ?? "بدون رقم"} · {roleLabel(u.role)} ·{" "}
                    {u.is_approved ? (u.is_active ? "مُفعّل" : "موقوف") : "بانتظار الموافقة"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-xs text-muted-foreground">إيقاف / تفعيل</span>
                  <Switch
                    checked={!!u.is_active && u.is_approved}
                    onCheckedChange={(v) => doToggle(u.id, v)}
                  />
                </div>
              </div>

              <div className="mt-3 grid gap-3 border-t pt-3 md:grid-cols-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">نوع الحساب</Label>
                  <select
                    className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                    value={d.role}
                    onChange={(e) =>
                      setDraft((s) => ({ ...s, [u.id]: { ...d, role: e.target.value as AppUserRole } }))
                    }
                  >
                    {ROLES.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">كلمة السر / رمز الدخول</Label>
                  <Input
                    value={d.password}
                    placeholder="6 أحرف على الأقل"
                    onChange={(e) =>
                      setDraft((s) => ({ ...s, [u.id]: { ...d, password: e.target.value } }))
                    }
                  />
                </div>
                <div className="flex items-end gap-2">
                  <Button className="flex-1" onClick={() => doApprove(u.id)}>
                    <ShieldCheck className="size-4" />
                    {u.is_approved ? "حفظ التعديلات" : "موافقة وتفعيل"}
                  </Button>
                  <Button variant="outline" onClick={() => doPassword(u.id)}>
                    تعيين كلمة السر
                  </Button>
                </div>
              </div>

              <div className="mt-3 border-t pt-3">
                <p className="mb-2 text-xs text-muted-foreground">إرسال بيانات الدخول للعميل:</p>
                <MessageButtons
                  phone={u.phone}
                  message={welcomeText(u.full_name ?? "", u.phone, d.role, d.password)}
                />
              </div>
            </div>
          );
        })}
        {!isLoading && !list.length && (
          <p className="text-sm text-muted-foreground">لا توجد حسابات في هذه القائمة.</p>
        )}
      </div>
    </AppShell>
  );
}
