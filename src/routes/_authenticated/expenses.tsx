import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell, StatCard } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { money, dateOnly, num, todayISO, EXPENSE_CATEGORIES } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/expenses")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "المصروفات والإيجارات | نظام إدارة المبيعات والمخزون" },
      { name: "description", content: "تسجيل مصروفات النقل والعمالة والثلج والإيجارات ومتابعتها يومياً." },
      { property: "og:title", content: "المصروفات والإيجارات | نظام إدارة المبيعات والمخزون" },
      { property: "og:description", content: "تسجيل مصروفات النقل والعمالة والثلج والإيجارات ومتابعتها يومياً." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ExpensesPage,
});

function ExpensesPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    category: EXPENSE_CATEGORIES[0],
    amount: 0,
    description: "",
    expense_date: todayISO(),
    is_recurring: false,
  });

  const { data: rows } = useQuery({
    queryKey: ["expenses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expenses")
        .select("*")
        .order("expense_date", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  const total = (rows ?? []).reduce((a, r) => a + Number(r.amount), 0);

  const save = async () => {
    if (num(form.amount) <= 0) return toast.error("أدخل المبلغ");
    const { data: user } = await supabase.auth.getUser();
    const { error } = await supabase.from("expenses").insert({
      category: form.category,
      amount: num(form.amount),
      description: form.description || null,
      expense_date: form.expense_date,
      is_recurring: form.is_recurring,
      created_by: user.user?.id ?? null,
    });
    if (error) return toast.error(error.message);
    toast.success("تم حفظ المصروف");
    setForm({ ...form, amount: 0, description: "" });
    qc.invalidateQueries({ queryKey: ["expenses"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
  };

  return (
    <AppShell title="المصروفات والإيجارات" subtitle="تسجيل ومتابعة المصروفات">
      <div className="rounded-xl border bg-card p-4">
        <div className="grid gap-3 md:grid-cols-4">
          <div className="space-y-1.5">
            <Label>النوع</Label>
            <select
              className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            >
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>المبلغ</Label>
            <Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: num(e.target.value) })} />
          </div>
          <div className="space-y-1.5">
            <Label>التاريخ</Label>
            <Input type="date" value={form.expense_date} onChange={(e) => setForm({ ...form, expense_date: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>الوصف</Label>
            <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
        </div>
        <label className="mt-3 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.is_recurring}
            onChange={(e) => setForm({ ...form, is_recurring: e.target.checked })}
          />
          مصروف شهري متكرر (إيجار مثلاً)
        </label>
        <Button className="mt-3" onClick={save}>
          حفظ المصروف
        </Button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="إجمالي المعروض" value={money(total)} tone="bad" />
        <StatCard label="عدد العمليات" value={String(rows?.length ?? 0)} />
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs">
            <tr>
              <th className="p-2 text-right">التاريخ</th>
              <th className="p-2 text-right">النوع</th>
              <th className="p-2 text-right">الوصف</th>
              <th className="p-2 text-right">المبلغ</th>
            </tr>
          </thead>
          <tbody>
            {(rows ?? []).map((r) => (
              <tr key={r.id} className="border-t">
                <td className="p-2">{dateOnly(r.expense_date)}</td>
                <td className="p-2">{r.category}</td>
                <td className="p-2">{r.description ?? "-"}</td>
                <td className="p-2">{money(r.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
