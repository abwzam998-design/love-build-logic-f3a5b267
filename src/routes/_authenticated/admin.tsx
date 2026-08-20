import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Switch } from "@/components/ui/switch";
import { useIsSuperAdmin } from "@/hooks/useAppData";

export const Route = createFileRoute("/_authenticated/admin")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "إدارة الاشتراكات | نظام إدارة المبيعات والمخزون" },
      { name: "description", content: "لوحة المالك لتفعيل أو إيقاف حسابات العملاء والموظفين عن بُعد." },
      { property: "og:title", content: "إدارة الاشتراكات | نظام إدارة المبيعات والمخزون" },
      { property: "og:description", content: "تفعيل وإيقاف حسابات المستخدمين والاشتراكات فوراً." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const isSuperAdmin = useIsSuperAdmin();
  const qc = useQueryClient();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin-users"],
    enabled: isSuperAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, phone, is_active, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: roles = [] } = useQuery({
    queryKey: ["admin-roles"],
    enabled: isSuperAdmin,
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("user_id, role");
      if (error) throw error;
      return data ?? [];
    },
  });

  const toggle = async (id: string, next: boolean) => {
    const { error } = await supabase.from("profiles").update({ is_active: next }).eq("id", id);
    if (error) {
      toast.error("تعذر تحديث الحالة");
      return;
    }
    toast.success(next ? "تم تفعيل الحساب" : "تم إيقاف الحساب");
    qc.invalidateQueries({ queryKey: ["admin-users"] });
  };

  if (!isSuperAdmin) {
    return (
      <AppShell title="غير مصرح" subtitle="هذه الصفحة مخصصة لمالك النظام فقط">
        <div className="rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground">
          لا تملك صلاحية الوصول لهذه الصفحة.
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="إدارة الاشتراكات" subtitle="تفعيل أو إيقاف أي حساب فوراً">
      <div className="space-y-3">
        {isLoading && <p className="text-sm text-muted-foreground">جارِ التحميل…</p>}
        {users.map((u) => {
          const role = roles.find((r) => r.user_id === u.id)?.role;
          return (
            <div
              key={u.id}
              className="flex items-center justify-between gap-3 rounded-xl border bg-card p-4 shadow-sm"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">{u.full_name || u.email}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {u.email} {u.phone ? `· ${u.phone}` : ""} · {role === "manager" ? "مدير" : "كاشير"}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className={u.is_active ? "text-xs text-primary" : "text-xs text-destructive"}>
                  {u.is_active ? "مُفعّل" : "موقوف"}
                </span>
                <Switch checked={!!u.is_active} onCheckedChange={(v) => toggle(u.id, v)} />
              </div>
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}
