import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell, StatCard } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { money, dateOnly, num, todayISO } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/personal")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "السلف والمسحوبات | نظام إدارة المبيعات والمخزون" },
      { name: "description", content: "تسجيل سلف العمال والمسحوبات الشخصية للمالك ومتابعة أثرها على الأرباح." },
      { property: "og:title", content: "السلف والمسحوبات | نظام إدارة المبيعات والمخزون" },
      { property: "og:description", content: "تسجيل سلف العمال والمسحوبات الشخصية للمالك ومتابعة أثرها على الأرباح." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PersonalPage,
});

function PersonalPage() {
  const qc = useQueryClient();
  const [adv, setAdv] = useState({ person_name: "", amount: 0, advance_date: todayISO(), notes: "" });
  const [wd, setWd] = useState({ amount: 0, withdrawal_date: todayISO(), reason: "" });

  const { data: advances } = useQuery({
    queryKey: ["advances"],
    queryFn: async () => {
      const { data, error } = await supabase.from("advances").select("*").order("advance_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
  const { data: withdrawals } = useQuery({
    queryKey: ["withdrawals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("owner_withdrawals")
        .select("*")
        .order("withdrawal_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const saveAdvance = async () => {
    if (!adv.person_name.trim() || num(adv.amount) <= 0) return toast.error("أدخل الاسم والمبلغ");
    const { data: user } = await supabase.auth.getUser();
    const { error } = await supabase.from("advances").insert({
      person_name: adv.person_name.trim(),
      amount: num(adv.amount),
      advance_date: adv.advance_date,
      notes: adv.notes || null,
      created_by: user.user?.id ?? null,
    });
    if (error) return toast.error(error.message);
    toast.success("تم تسجيل السلفة");
    setAdv({ ...adv, person_name: "", amount: 0, notes: "" });
    qc.invalidateQueries({ queryKey: ["advances"] });
  };

  const saveWithdrawal = async () => {
    if (num(wd.amount) <= 0) return toast.error("أدخل المبلغ");
    const { data: user } = await supabase.auth.getUser();
    const { error } = await supabase.from("owner_withdrawals").insert({
      amount: num(wd.amount),
      withdrawal_date: wd.withdrawal_date,
      reason: wd.reason || null,
      created_by: user.user?.id ?? null,
    });
    if (error) return toast.error(error.message);
    toast.success("تم تسجيل المسحوب");
    setWd({ ...wd, amount: 0, reason: "" });
    qc.invalidateQueries({ queryKey: ["withdrawals"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const advOpen = (advances ?? []).reduce((a, r) => a + Number(r.amount) - Number(r.deducted), 0);
  const wdTotal = (withdrawals ?? []).reduce((a, r) => a + Number(r.amount), 0);

  return (
    <AppShell title="السلف والمسحوبات" subtitle="سلف العمال ومسحوبات المالك">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="سلف غير مسددة" value={money(advOpen)} tone="warn" />
        <StatCard label="إجمالي المسحوبات" value={money(wdTotal)} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border bg-card p-4">
          <h2 className="mb-3 font-bold">سلفة جديدة</h2>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>الاسم</Label>
              <Input value={adv.person_name} onChange={(e) => setAdv({ ...adv, person_name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>المبلغ</Label>
              <Input type="number" value={adv.amount} onChange={(e) => setAdv({ ...adv, amount: num(e.target.value) })} />
            </div>
            <div className="space-y-1.5">
              <Label>التاريخ</Label>
              <Input type="date" value={adv.advance_date} onChange={(e) => setAdv({ ...adv, advance_date: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>ملاحظات</Label>
              <Input value={adv.notes} onChange={(e) => setAdv({ ...adv, notes: e.target.value })} />
            </div>
          </div>
          <Button className="mt-3" onClick={saveAdvance}>
            حفظ السلفة
          </Button>
        </div>

        <div className="rounded-xl border bg-card p-4">
          <h2 className="mb-3 font-bold">مسحوب شخصي</h2>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>المبلغ</Label>
              <Input type="number" value={wd.amount} onChange={(e) => setWd({ ...wd, amount: num(e.target.value) })} />
            </div>
            <div className="space-y-1.5">
              <Label>التاريخ</Label>
              <Input type="date" value={wd.withdrawal_date} onChange={(e) => setWd({ ...wd, withdrawal_date: e.target.value })} />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label>السبب</Label>
              <Input value={wd.reason} onChange={(e) => setWd({ ...wd, reason: e.target.value })} />
            </div>
          </div>
          <Button className="mt-3" onClick={saveWithdrawal}>
            حفظ المسحوب
          </Button>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs">
              <tr>
                <th className="p-2 text-right">التاريخ</th>
                <th className="p-2 text-right">الاسم</th>
                <th className="p-2 text-right">المبلغ</th>
                <th className="p-2 text-right">المخصوم</th>
              </tr>
            </thead>
            <tbody>
              {(advances ?? []).map((a) => (
                <tr key={a.id} className="border-t">
                  <td className="p-2">{dateOnly(a.advance_date)}</td>
                  <td className="p-2">{a.person_name}</td>
                  <td className="p-2">{money(a.amount)}</td>
                  <td className="p-2">{money(a.deducted)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs">
              <tr>
                <th className="p-2 text-right">التاريخ</th>
                <th className="p-2 text-right">السبب</th>
                <th className="p-2 text-right">المبلغ</th>
              </tr>
            </thead>
            <tbody>
              {(withdrawals ?? []).map((w) => (
                <tr key={w.id} className="border-t">
                  <td className="p-2">{dateOnly(w.withdrawal_date)}</td>
                  <td className="p-2">{w.reason ?? "-"}</td>
                  <td className="p-2">{money(w.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
