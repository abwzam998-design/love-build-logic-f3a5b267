import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell, StatCard } from "@/components/AppShell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { money, todayISO } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/reports")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "التقارير | نظام إدارة المبيعات والمخزون" },
      { name: "description", content: "تقارير المبيعات والمشتريات والمصروفات والأرباح خلال فترة محددة." },
      { property: "og:title", content: "التقارير | نظام إدارة المبيعات والمخزون" },
      { property: "og:description", content: "تقارير المبيعات والمشتريات والمصروفات والأرباح خلال فترة محددة." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ReportsPage,
});

function ReportsPage() {
  const [from, setFrom] = useState(todayISO().slice(0, 8) + "01");
  const [to, setTo] = useState(todayISO());

  const { data } = useQuery({
    queryKey: ["reports", from, to],
    queryFn: async () => {
      const [inv, pur, exp, wst, wdr] = await Promise.all([
        supabase.from("invoices").select("total,paid").gte("invoice_date", from).lte("invoice_date", to),
        supabase.from("purchases").select("total,paid").gte("purchase_date", from).lte("purchase_date", to),
        supabase.from("expenses").select("amount").gte("expense_date", from).lte("expense_date", to),
        supabase.from("waste").select("loss_amount").gte("waste_date", from).lte("waste_date", to),
        supabase.from("owner_withdrawals").select("amount").gte("withdrawal_date", from).lte("withdrawal_date", to),
      ]);
      const sum = (rows: any[] | null, k: string) => (rows ?? []).reduce((a, r) => a + Number(r[k] ?? 0), 0);
      const sales = sum(inv.data, "total");
      const purchases = sum(pur.data, "total");
      const expenses = sum(exp.data, "amount");
      const waste = sum(wst.data, "loss_amount");
      const withdrawals = sum(wdr.data, "amount");
      return {
        sales,
        collected: sum(inv.data, "paid"),
        purchases,
        expenses,
        waste,
        withdrawals,
        gross: sales - purchases,
        net: sales - purchases - expenses - waste,
      };
    },
  });

  return (
    <AppShell title="التقارير" subtitle="حسب الفترة">
      <div className="flex flex-wrap gap-3 rounded-xl border bg-card p-4">
        <div className="space-y-1.5">
          <Label>من</Label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>إلى</Label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="المبيعات" value={money(data?.sales)} tone="good" />
        <StatCard label="المحصّل" value={money(data?.collected)} />
        <StatCard label="المشتريات" value={money(data?.purchases)} />
        <StatCard label="المصروفات" value={money(data?.expenses)} tone="bad" />
        <StatCard label="الهالك" value={money(data?.waste)} tone="bad" />
        <StatCard label="المسحوبات" value={money(data?.withdrawals)} />
        <StatCard label="الربح الإجمالي" value={money(data?.gross)} />
        <StatCard
          label="الربح الصافي"
          value={money(data?.net)}
          tone={(data?.net ?? 0) >= 0 ? "good" : "bad"}
        />
      </div>
    </AppShell>
  );
}
