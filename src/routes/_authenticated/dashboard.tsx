import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell, StatCard } from "@/components/AppShell";
import { money, todayISO } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/dashboard")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "لوحة اليوم | نظام إدارة المبيعات والمخزون" },
      { name: "description", content: "ملخص يومي للمبيعات والمشتريات والمصروفات والديون والربح الصافي." },
      { property: "og:title", content: "لوحة اليوم | نظام إدارة المبيعات والمخزون" },
      { property: "og:description", content: "ملخص يومي للمبيعات والمشتريات والمصروفات والديون والربح الصافي." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const today = todayISO();
  const { data } = useQuery({
    queryKey: ["dashboard", today],
    queryFn: async () => {
      const [inv, pur, exp, wst, wdr] = await Promise.all([
        supabase.from("invoices").select("total,paid,invoice_date").eq("invoice_date", today),
        supabase.from("purchases").select("total,paid,purchase_date").eq("purchase_date", today),
        supabase.from("expenses").select("amount").eq("expense_date", today),
        supabase.from("waste").select("loss_amount").eq("waste_date", today),
        supabase.from("owner_withdrawals").select("amount").eq("withdrawal_date", today),
      ]);
      const all = await supabase.from("invoices").select("total,paid");
      const sum = (rows: any[] | null, k: string) =>
        (rows ?? []).reduce((a, r) => a + Number(r[k] ?? 0), 0);
      const sales = sum(inv.data, "total");
      const salesPaid = sum(inv.data, "paid");
      const purchases = sum(pur.data, "total");
      const expenses = sum(exp.data, "amount");
      const waste = sum(wst.data, "loss_amount");
      const withdrawals = sum(wdr.data, "amount");
      const debtTotal = (all.data ?? []).reduce(
        (a, r) => a + (Number(r.total ?? 0) - Number(r.paid ?? 0)),
        0,
      );
      return {
        sales,
        salesPaid,
        salesDebt: sales - salesPaid,
        purchases,
        expenses,
        waste,
        withdrawals,
        debtTotal,
        net: sales - purchases - expenses - waste,
      };
    },
  });

  return (
    <AppShell title="لوحة اليوم" subtitle="ملخص حركة اليوم">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="مبيعات اليوم" value={money(data?.sales)} tone="good" />
        <StatCard label="المحصّل نقداً" value={money(data?.salesPaid)} />
        <StatCard label="آجل اليوم" value={money(data?.salesDebt)} tone="warn" />
        <StatCard label="مشتريات اليوم" value={money(data?.purchases)} />
        <StatCard label="المصروفات" value={money(data?.expenses)} tone="bad" />
        <StatCard label="الهالك" value={money(data?.waste)} tone="bad" />
        <StatCard label="مسحوبات شخصية" value={money(data?.withdrawals)} />
        <StatCard
          label="الربح الصافي"
          value={money(data?.net)}
          tone={(data?.net ?? 0) >= 0 ? "good" : "bad"}
        />
      </div>
      <div className="mt-4">
        <StatCard
          label="إجمالي الديون على العملاء"
          value={money(data?.debtTotal)}
          hint="مجموع الفواتير غير المسددة"
          tone="warn"
        />
      </div>
    </AppShell>
  );
}
