import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AppShell, StatCard } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { MessageButtons } from "@/components/MessageButtons";
import { useIsOwner, useSettings } from "@/hooks/useAppData";
import {
  getOwnerOverview,
  ownerSetAccess,
  ownerSetPassword,
  ownerSetRole,
  ownerSetSubscription,
  type OwnerRole,
} from "@/lib/owner.functions";
import { Crown, Search } from "lucide-react";

export const Route = createFileRoute("/_authenticated/owner")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "لوحة مالك المنصة | معاذ سوفت" },
      {
        name: "description",
        content:
          "لوحة عليا لمالك المنصة: عرض جميع الحسابات والمتاجر، تفعيل أو حظر أي مستخدم، تغيير الصلاحيات، وإدارة الفترات التجريبية والاشتراكات.",
      },
      { property: "og:title", content: "لوحة مالك المنصة | معاذ سوفت" },
      {
        property: "og:description",
        content: "تحكم كامل بالحسابات والصلاحيات والاشتراكات في النظام.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: OwnerPage,
});

const ROLES: { value: OwnerRole; label: string }[] = [
  { value: "manager", label: "مدير" },
  { value: "seller", label: "كاشير" },
  { value: "customer", label: "عميل" },
];

const roleLabel = (r: string | undefined) =>
  r === "system_owner" ? "مالك المنصة" : ROLES.find((x) => x.value === r)?.label ?? "بدون صلاحية";

const randomCode = () => String(Math.floor(100000 + Math.random() * 900000));

const statusLabel = (s: string) =>
  ({ trial: "فترة تجريبية", active: "اشتراك فعّال", suspended: "موقوف", owner: "المالك" })[s] ?? s;

function OwnerPage() {
  const isOwner = useIsOwner();
  const { data: settings } = useSettings();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [draft, setDraft] = useState<
    Record<string, { role: OwnerRole; password: string; days: string }>
  >({});

  const fetchOverview = useServerFn(getOwnerOverview);
  const setRole = useServerFn(ownerSetRole);
  const setAccess = useServerFn(ownerSetAccess);
  const setSubscription = useServerFn(ownerSetSubscription);
  const setPassword = useServerFn(ownerSetPassword);

  const { data, isLoading } = useQuery({
    queryKey: ["owner-overview"],
    enabled: isOwner,
    queryFn: () => fetchOverview({} as never),
  });

  const accounts = data?.accounts ?? [];
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return accounts;
    return accounts.filter(
      (a) =>
        (a.full_name ?? "").toLowerCase().includes(s) ||
        (a.phone ?? "").includes(s) ||
        (a.email ?? "").toLowerCase().includes(s),
    );
  }, [accounts, q]);

  const refresh = () => qc.invalidateQueries({ queryKey: ["owner-overview"] });
  const draftOf = (id: string, role?: string) =>
    draft[id] ?? { role: ((role as OwnerRole) ?? "seller"), password: "", days: "14" };
  const patch = (id: string, v: Partial<{ role: OwnerRole; password: string; days: string }>) =>
    setDraft((s) => ({ ...s, [id]: { ...draftOf(id), ...v } }));

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    try {
      await fn();
      toast.success(ok);
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذر تنفيذ العملية");
    }
  };

  if (!isOwner) {
    return (
      <AppShell title="غير مصرح" subtitle="لوحة مالك المنصة">
        <div className="rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground">
          هذه اللوحة مخصصة لمالك المنصة فقط.
        </div>
      </AppShell>
    );
  }

  const s = data?.stats;

  return (
    <AppShell title="لوحة مالك المنصة" subtitle="تحكم كامل بالحسابات والصلاحيات والاشتراكات">
      <div className="mb-4 flex items-center gap-2 rounded-2xl border bg-card p-3 shadow-card">
        <Crown className="size-5 text-chart-4" />
        <p className="text-sm font-bold">صلاحية المالك المطلق مفعّلة على حسابك</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="المستخدمون" value={String(s?.users ?? 0)} tone="good" />
        <StatCard label="طلبات معلّقة" value={String(s?.pending ?? 0)} tone="warn" />
        <StatCard label="حسابات موقوفة" value={String(s?.suspended ?? 0)} tone="bad" />
        <StatCard label="الفواتير" value={String(s?.invoices ?? 0)} />
        <StatCard label="العملاء" value={String(s?.customers ?? 0)} />
        <StatCard label="الموردون" value={String(s?.suppliers ?? 0)} />
        <StatCard label="الموظفون" value={String(s?.employees ?? 0)} />
        <StatCard label="المتجر" value={settings?.business_name ?? "-"} />
      </div>

      <div className="relative mt-5">
        <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pr-9"
          placeholder="ابحث بالاسم أو الجوال أو البريد..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <div className="mt-4 space-y-3">
        {isLoading && <p className="text-sm text-muted-foreground">جارِ التحميل…</p>}
        {list.map((u) => {
          const d = draftOf(u.id, u.roles[0]);
          const expired =
            !!u.trial_ends_at && new Date(u.trial_ends_at).getTime() < Date.now();
          return (
            <div key={u.id} className="rounded-2xl border bg-card p-4 shadow-card">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">
                    {u.full_name || u.phone || u.email}
                    {u.is_owner && <span className="mr-2 text-xs text-chart-4">مالك المنصة</span>}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {u.phone ?? "بدون رقم"} · {roleLabel(u.roles[0])} ·{" "}
                    {statusLabel(u.subscription_status)}
                    {u.trial_ends_at &&
                      ` · ${expired ? "انتهت التجربة" : `تنتهي ${new Date(u.trial_ends_at).toLocaleDateString("ar")}`}`}
                  </p>
                </div>
                {!u.is_owner && (
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-xs text-muted-foreground">تفعيل / حظر</span>
                    <Switch
                      checked={u.is_active && u.is_approved}
                      onCheckedChange={(v) =>
                        run(
                          () => setAccess({ data: { userId: u.id, active: v, approved: v } }),
                          v ? "تم التفعيل" : "تم الحظر",
                        )
                      }
                    />
                  </div>
                )}
              </div>

              {!u.is_owner && (
                <>
                  <div className="mt-3 grid gap-3 border-t pt-3 md:grid-cols-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">الصلاحية</Label>
                      <div className="flex gap-2">
                        <select
                          className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                          value={d.role}
                          onChange={(e) => patch(u.id, { role: e.target.value as OwnerRole })}
                        >
                          {ROLES.map((r) => (
                            <option key={r.value} value={r.value}>
                              {r.label}
                            </option>
                          ))}
                        </select>
                        <Button
                          variant="outline"
                          onClick={() =>
                            run(
                              () => setRole({ data: { userId: u.id, role: d.role } }),
                              "تم تغيير الصلاحية",
                            )
                          }
                        >
                          حفظ
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs">رمز الدخول</Label>
                      <div className="flex gap-2">
                        <Input
                          value={d.password}
                          placeholder="6 أحرف على الأقل"
                          onChange={(e) => patch(u.id, { password: e.target.value })}
                        />
                        <Button variant="outline" onClick={() => patch(u.id, { password: randomCode() })}>
                          توليد
                        </Button>
                        <Button
                          onClick={() =>
                            run(
                              () => setPassword({ data: { userId: u.id, password: d.password } }),
                              "تم تعيين الرمز",
                            )
                          }
                        >
                          تعيين
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs">الفترة التجريبية (أيام)</Label>
                      <div className="flex gap-2">
                        <Input
                          inputMode="numeric"
                          value={d.days}
                          onChange={(e) => patch(u.id, { days: e.target.value })}
                        />
                        <Button
                          variant="outline"
                          onClick={() =>
                            run(
                              () =>
                                setSubscription({
                                  data: {
                                    userId: u.id,
                                    status: "trial",
                                    trialDays: Number(d.days || 14),
                                  },
                                }),
                              "تم تحديد الفترة التجريبية",
                            )
                          }
                        >
                          تجريبي
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2 border-t pt-3">
                    <Button
                      variant="outline"
                      onClick={() =>
                        run(
                          () => setSubscription({ data: { userId: u.id, status: "active" } }),
                          "تم تفعيل الاشتراك",
                        )
                      }
                    >
                      اشتراك فعّال
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() =>
                        run(
                          () => setSubscription({ data: { userId: u.id, status: "suspended" } }),
                          "تم إيقاف النظام عن المستخدم",
                        )
                      }
                    >
                      إيقاف فوري
                    </Button>
                    <MessageButtons
                      phone={u.phone}
                      message={`مرحباً ${u.full_name || ""}\nتم تفعيل حسابك لدى ${settings?.business_name ?? "النظام"}.\nرقم الدخول: ${u.phone ?? ""}\nرمز الدخول: ${d.password || "(حدده المالك)"}\nالصلاحية: ${roleLabel(d.role)}`}
                    />
                  </div>
                </>
              )}
            </div>
          );
        })}
        {!isLoading && !list.length && (
          <p className="text-sm text-muted-foreground">لا توجد حسابات مطابقة.</p>
        )}
      </div>
    </AppShell>
  );
}
