import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ENTITY_KINDS, entityKindLabel, useEntities, type EntityKind } from "@/hooks/useAppData";
import { Search, Plus, FileText } from "lucide-react";

export const Route = createFileRoute("/_authenticated/accounts/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "الحسابات | نظام إدارة المبيعات والمخزون" },
      { name: "description", content: "إدارة حسابات العملاء والموردين والموظفين مع بحث فوري وكشف حساب تفصيلي." },
      { property: "og:title", content: "الحسابات | نظام إدارة المبيعات والمخزون" },
      { property: "og:description", content: "إدارة حسابات العملاء والموردين والموظفين مع بحث فوري وكشف حساب تفصيلي." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AccountsPage,
});

function AccountsPage() {
  const qc = useQueryClient();
  const { data: entities } = useEntities();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | EntityKind>("all");
  const [form, setForm] = useState({ name: "", phone: "", kind: "customer" as EntityKind, notes: "", credit_limit: 0 });
  const [saving, setSaving] = useState(false);
  const [limits, setLimits] = useState<Record<string, string>>({});

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (entities ?? [])
      .filter((e) => filter === "all" || e.kind === filter)
      .filter((e) => !s || e.name.toLowerCase().includes(s) || (e.phone ?? "").includes(s));
  }, [entities, q, filter]);

  const add = async () => {
    if (!form.name.trim()) { toast.error("أدخل الاسم"); return; }
    setSaving(true);
    const { error } = await supabase.from("entities").insert({
      kind: form.kind,
      name: form.name.trim(),
      phone: form.phone.trim() || null,
      notes: form.notes.trim() || null,
      credit_limit: Number(form.credit_limit) || 0,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("تمت إضافة الحساب");
    setForm({ name: "", phone: "", kind: form.kind, notes: "", credit_limit: 0 });
    qc.invalidateQueries({ queryKey: ["entities"] });
  };

  const saveLimit = async (id: string) => {
    const value = Number(limits[id] ?? 0) || 0;
    const { error } = await supabase.from("entities").update({ credit_limit: value }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("تم تحديث سقف الدين");
    setLimits((l) => { const n = { ...l }; delete n[id]; return n; });
    qc.invalidateQueries({ queryKey: ["entities"] });
  };


  return (
    <AppShell title="الحسابات" subtitle="العملاء والموردين والموظفين">
      <div className="rounded-xl border bg-card p-4">
        <div className="grid gap-3 md:grid-cols-4">
          <div className="space-y-1.5">
            <Label>الاسم</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>رقم الجوال</Label>
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>التصنيف</Label>
            <select
              className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              value={form.kind}
              onChange={(e) => setForm({ ...form, kind: e.target.value as EntityKind })}
            >
              {ENTITY_KINDS.map((k) => (
                <option key={k.value} value={k.value}>{k.label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>ملاحظات</Label>
            <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>سقف الدين (0 = بدون حد)</Label>
            <Input
              type="number"
              min={0}
              value={form.credit_limit}
              onChange={(e) => setForm({ ...form, credit_limit: Number(e.target.value) || 0 })}
            />
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <Button onClick={add} disabled={saving}>
            <Plus className="size-4" /> إضافة حساب
          </Button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-56">
          <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pr-9"
            placeholder="ابحث بالاسم أو رقم الجوال..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <select
          className="h-9 rounded-md border bg-background px-3 text-sm"
          value={filter}
          onChange={(e) => setFilter(e.target.value as "all" | EntityKind)}
        >
          <option value="all">الكل</option>
          {ENTITY_KINDS.map((k) => (
            <option key={k.value} value={k.value}>{k.label}</option>
          ))}
        </select>
      </div>

      <div className="mt-3 space-y-2">
        {list.map((e) => (
          <Link
            key={e.id}
            to="/accounts/$id"
            params={{ id: e.id }}
            className="flex items-center justify-between gap-3 rounded-xl border bg-card p-3 transition-colors hover:bg-accent"
          >
            <div>
              <p className="font-bold">{e.name}</p>
              <p className="text-xs text-muted-foreground">
                {entityKindLabel(e.kind)} {e.phone ? `· ${e.phone}` : ""}
              </p>
            </div>
            <span className="flex items-center gap-1 text-xs text-primary">
              <FileText className="size-4" /> كشف حساب
            </span>
          </Link>
        ))}
        {!list.length && <p className="text-sm text-muted-foreground">لا توجد حسابات مطابقة.</p>}
      </div>
    </AppShell>
  );
}
