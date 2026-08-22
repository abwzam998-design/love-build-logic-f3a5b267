import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell, StatCard } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NumberInput } from "@/components/NumberInput";
import { EntityPicker } from "@/components/EntityPicker";
import { money, dateTime, todayISO } from "@/lib/format";
import {
  ensureEntity,
  nextRef,
  useEntities,
  type Entity,
  type EntityKind,
} from "@/hooks/useAppData";
import { Search, FileText } from "lucide-react";

export const Route = createFileRoute("/_authenticated/receipts")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "السندات والواصل | نظام إدارة المبيعات والمخزون" },
      {
        name: "description",
        content: "سندات القبض والصرف: تسجيل الواصل من العملاء والمدفوع للموردين وتحديث الأرصدة فوراً.",
      },
      { property: "og:title", content: "السندات والواصل | نظام إدارة المبيعات والمخزون" },
      {
        property: "og:description",
        content: "سندات القبض والصرف: تسجيل الواصل من العملاء والمدفوع للموردين وتحديث الأرصدة فوراً.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ReceiptsPage,
});

const METHODS = ["نقدي", "تحويل", "شيك"];

function ReceiptsPage() {
  const qc = useQueryClient();
  const { data: entities } = useEntities();
  const [direction, setDirection] = useState<"in" | "out">("in");
  const [kind, setKind] = useState<EntityKind>("customer");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [picked, setPicked] = useState<Entity | null>(null);
  const [amount, setAmount] = useState(0);
  const [method, setMethod] = useState(METHODS[0]!);
  const [payDate, setPayDate] = useState(todayISO());
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [q, setQ] = useState("");

  const { data: rows } = useQuery({
    queryKey: ["receipts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .order("paid_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const nameById = useMemo(() => {
    const m = new Map<string, Entity>();
    for (const e of entities ?? []) m.set(e.id, e);
    return m;
  }, [entities]);

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (rows ?? []).filter((r) => {
      if (!s) return true;
      const ent = r.entity_id ? nameById.get(r.entity_id) : null;
      return (
        (ent?.name ?? "").toLowerCase().includes(s) ||
        (ent?.phone ?? "").includes(s) ||
        (r.receipt_no ?? "").toLowerCase().includes(s)
      );
    });
  }, [rows, q, nameById]);

  const totalIn = (rows ?? [])
    .filter((r) => (r.direction ?? "in") === "in")
    .reduce((a, r) => a + Number(r.amount), 0);
  const totalOut = (rows ?? [])
    .filter((r) => r.direction === "out")
    .reduce((a, r) => a + Number(r.amount), 0);

  const save = async () => {
    if (!name.trim()) {
      toast.error("اختر الحساب");
      return;
    }
    if (amount <= 0) {
      toast.error("أدخل المبلغ");
      return;
    }
    setSaving(true);
    try {
      const entityId = picked?.id ?? (await ensureEntity(kind, name, phone));
      const { data: user } = await supabase.auth.getUser();
      const { error } = await supabase.from("payments").insert({
        ref_type: direction === "in" ? "invoice" : "purchase",
        entity_id: entityId,
        direction,
        method,
        receipt_no: nextRef(direction === "in" ? "RCV" : "PAY"),
        amount,
        notes: notes.trim() || null,
        paid_at: new Date(
          `${payDate}T${new Date().toTimeString().slice(0, 8)}`,
        ).toISOString(),
        created_by: user.user?.id ?? null,
      });
      if (error) throw error;
      toast.success(direction === "in" ? "تم حفظ سند القبض" : "تم حفظ سند الصرف");
      setAmount(0);
      setNotes("");
      setName("");
      setPhone("");
      setPicked(null);
      qc.invalidateQueries({ queryKey: ["receipts"] });
      qc.invalidateQueries({ queryKey: ["account-ledger"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    } catch (e: any) {
      toast.error(e?.message ?? "تعذر الحفظ");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell title="السندات والواصل" subtitle="سندات القبض والصرف">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="إجمالي المقبوض" value={money(totalIn)} tone="good" />
        <StatCard label="إجمالي المصروف" value={money(totalOut)} tone="bad" />
        <StatCard label="الصافي" value={money(totalIn - totalOut)} />
        <StatCard label="عدد السندات" value={String(rows?.length ?? 0)} />
      </div>

      <div className="mt-4 rounded-xl border bg-card p-4">
        <div className="mb-3 flex gap-2">
          <Button
            variant={direction === "in" ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setDirection("in");
              setKind("customer");
              setPicked(null);
            }}
          >
            سند قبض
          </Button>
          <Button
            variant={direction === "out" ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setDirection("out");
              setKind("supplier");
              setPicked(null);
            }}
          >
            سند صرف
          </Button>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="space-y-1.5">
            <Label>نوع الحساب</Label>
            <select
              className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              value={kind}
              onChange={(e) => {
                setKind(e.target.value as EntityKind);
                setPicked(null);
              }}
            >
              <option value="customer">عميل</option>
              <option value="supplier">مورد</option>
              <option value="employee">موظف</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>الاسم</Label>
            <EntityPicker
              kind={kind}
              name={name}
              phone={phone}
              namePlaceholder="اكتب أول حرف للبحث"
              onPick={(v) => {
                setName(v.name);
                setPhone(v.phone);
                setPicked(v.entity);
              }}
            />
          </div>
          <div className="space-y-1.5">
            <Label>رقم الجوال</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>المبلغ</Label>
            <NumberInput value={amount} onValueChange={setAmount} min={0} decimals={2} />
          </div>
          <div className="space-y-1.5">
            <Label>طريقة الدفع</Label>
            <select
              className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              value={method}
              onChange={(e) => setMethod(e.target.value)}
            >
              {METHODS.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>التاريخ</Label>
            <Input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} />
          </div>
          <div className="space-y-1.5 md:col-span-3">
            <Label>البيان</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <Button onClick={save} disabled={saving}>
            حفظ السند
          </Button>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <div className="relative min-w-56 flex-1">
          <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pr-9"
            placeholder="بحث بالاسم أو الجوال أو رقم السند"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </div>

      <div className="mt-3 overflow-x-auto rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs">
            <tr>
              <th className="p-2 text-right">رقم السند</th>
              <th className="p-2 text-right">التاريخ والوقت</th>
              <th className="p-2 text-right">الحساب</th>
              <th className="p-2 text-right">النوع</th>
              <th className="p-2 text-right">المبلغ</th>
              <th className="p-2 text-right">البيان</th>
              <th className="p-2 text-right"></th>
            </tr>
          </thead>
          <tbody>
            {list.map((r) => {
              const ent = r.entity_id ? nameById.get(r.entity_id) : null;
              const inbound = (r.direction ?? "in") === "in";
              return (
                <tr key={r.id} className="border-t">
                  <td className="whitespace-nowrap p-2">{r.receipt_no ?? "-"}</td>
                  <td className="whitespace-nowrap p-2">{dateTime(r.paid_at)}</td>
                  <td className="p-2">{ent?.name ?? "-"}</td>
                  <td className="p-2">{inbound ? "قبض" : "صرف"}</td>
                  <td className={`p-2 font-bold ${inbound ? "text-emerald-600" : "text-destructive"}`}>
                    {money(r.amount)}
                  </td>
                  <td className="p-2">{r.notes ?? ""}</td>
                  <td className="p-2">
                    {ent && (
                      <Link
                        to="/accounts/$id"
                        params={{ id: ent.id }}
                        className="inline-flex items-center gap-1 text-primary"
                      >
                        <FileText className="size-4" /> كشف
                      </Link>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!list.length && <p className="p-4 text-sm text-muted-foreground">لا توجد سندات.</p>}
      </div>
    </AppShell>
  );
}
