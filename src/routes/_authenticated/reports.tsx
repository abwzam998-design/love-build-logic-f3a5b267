import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell, StatCard } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { money, todayISO, dateTime } from "@/lib/format";
import { useSettings } from "@/hooks/useAppData";
import { FileDown } from "lucide-react";

export const Route = createFileRoute("/_authenticated/reports")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "التقارير التفصيلية | نظام إدارة المبيعات والمخزون" },
      {
        name: "description",
        content: "تقارير تفصيلية: دخل اليوم والمبيعات والمشتريات والمصروفات ورصيد المخزون مع تصدير PDF.",
      },
      { property: "og:title", content: "التقارير التفصيلية | نظام إدارة المبيعات والمخزون" },
      {
        property: "og:description",
        content: "تقارير تفصيلية: دخل اليوم والمبيعات والمشتريات والمصروفات ورصيد المخزون مع تصدير PDF.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ReportsPage,
});

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

const sum = (rows: any[] | null | undefined, k: string) =>
  (rows ?? []).reduce((a, r) => a + Number(r[k] ?? 0), 0);

function ReportsPage() {
  const { data: settings } = useSettings();
  const [from, setFrom] = useState(todayISO().slice(0, 8) + "01");
  const [to, setTo] = useState(todayISO());

  const { data } = useQuery({
    queryKey: ["reports", from, to],
    queryFn: async () => {
      const today = todayISO();
      const toEnd = `${to}T23:59:59`;
      const [inv, pur, exp, wst, wdr, prods, payIn, payOut, invToday, expToday] = await Promise.all([
        supabase.from("invoices").select("total,paid,payment_type").gte("invoice_date", from).lte("invoice_date", toEnd),
        supabase.from("purchases").select("total,paid").gte("purchase_date", from).lte("purchase_date", toEnd),
        supabase.from("expenses").select("amount,category").gte("expense_date", from).lte("expense_date", to),
        supabase.from("waste").select("loss_amount").gte("waste_date", from).lte("waste_date", to),
        supabase.from("owner_withdrawals").select("amount").gte("withdrawal_date", from).lte("withdrawal_date", to),
        supabase.from("products").select("name,unit,stock_qty,cost_price,sale_price").order("name"),
        supabase.from("payments").select("amount").eq("direction", "in").gte("paid_at", from).lte("paid_at", toEnd),
        supabase.from("payments").select("amount").eq("direction", "out").gte("paid_at", from).lte("paid_at", toEnd),
        supabase.from("invoices").select("total,paid").gte("invoice_date", today).lte("invoice_date", `${today}T23:59:59`),
        supabase.from("expenses").select("amount").eq("expense_date", today),
      ]);

      const sales = sum(inv.data, "total");
      const purchases = sum(pur.data, "total");
      const expenses = sum(exp.data, "amount");
      const waste = sum(wst.data, "loss_amount");
      const withdrawals = sum(wdr.data, "amount");
      const products = (prods.data ?? []) as any[];
      const stockCost = products.reduce((a, p) => a + Number(p.stock_qty) * Number(p.cost_price), 0);
      const stockSale = products.reduce((a, p) => a + Number(p.stock_qty) * Number(p.sale_price), 0);

      const byCategory = Object.entries(
        (exp.data ?? []).reduce<Record<string, number>>((acc, e: any) => {
          acc[e.category] = (acc[e.category] ?? 0) + Number(e.amount);
          return acc;
        }, {}),
      ).sort((a, b) => b[1] - a[1]);

      const todaySales = sum(invToday.data, "total");
      const todayCollected = sum(invToday.data, "paid");
      const todayExpenses = sum(expToday.data, "amount");

      return {
        sales,
        collected: sum(inv.data, "paid"),
        credit: sales - sum(inv.data, "paid"),
        purchases,
        purchasePaid: sum(pur.data, "paid"),
        expenses,
        waste,
        withdrawals,
        receiptsIn: sum(payIn.data, "amount"),
        receiptsOut: sum(payOut.data, "amount"),
        stockCost,
        stockSale,
        products,
        byCategory,
        todaySales,
        todayCollected,
        todayExpenses,
        todayNet: todayCollected - todayExpenses,
        gross: sales - purchases,
        net: sales - purchases - expenses - waste,
      };
    },
  });

  const exportPdf = () => {
    if (!data) return;
    const currency = settings?.currency ?? "ريال";
    const business = settings?.business_name ?? "منشأتي";
    const line = (l: string, v: number) =>
      `<tr><td>${esc(l)}</td><td>${money(v)} ${esc(currency)}</td></tr>`;
    const html = `<!doctype html><html dir="rtl" lang="ar"><head><meta charset="utf-8" />
<title>تقرير ${esc(from)} - ${esc(to)}</title>
<style>
 body{font-family:"Tahoma","Arial",sans-serif;margin:0;padding:24px;color:#111}
 h1{font-size:20px;margin:0} h2{font-size:15px;margin:20px 0 6px}
 .muted{color:#555;font-size:12px;margin:2px 0}
 table{width:100%;border-collapse:collapse;font-size:13px}
 th,td{border:1px solid #bbb;padding:6px;text-align:right}
 th{background:#f1f1f1}
 @media print{body{padding:0}}
</style></head><body>
 <h1>${esc(business)}</h1>
 <p class="muted">تقرير تفصيلي من ${esc(from)} إلى ${esc(to)} — طُبع في ${dateTime(new Date())}</p>

 <h2>دخل اليوم</h2>
 <table>${line("مبيعات اليوم", data.todaySales)}${line("المحصّل اليوم", data.todayCollected)}${line(
      "مصروفات اليوم",
      data.todayExpenses,
    )}${line("صافي دخل اليوم", data.todayNet)}</table>

 <h2>ملخص الفترة</h2>
 <table>${line("المبيعات", data.sales)}${line("المحصّل من الفواتير", data.collected)}${line(
      "المبيعات الآجلة",
      data.credit,
    )}${line("سندات القبض", data.receiptsIn)}${line("المشتريات", data.purchases)}${line(
      "المدفوع للموردين",
      data.purchasePaid,
    )}${line("سندات الصرف", data.receiptsOut)}${line("المصروفات", data.expenses)}${line(
      "الهالك",
      data.waste,
    )}${line("المسحوبات الشخصية", data.withdrawals)}${line("الربح الإجمالي", data.gross)}${line(
      "الربح الصافي",
      data.net,
    )}</table>

 <h2>المصروفات حسب البند</h2>
 <table><thead><tr><th>البند</th><th>المبلغ</th></tr></thead><tbody>${
   data.byCategory.map(([c, v]) => `<tr><td>${esc(c)}</td><td>${money(v)} ${esc(currency)}</td></tr>`).join("") ||
   `<tr><td colspan="2">لا توجد مصروفات</td></tr>`
 }</tbody></table>

 <h2>رصيد المخزون</h2>
 <table><thead><tr><th>الصنف</th><th>الكمية</th><th>الوحدة</th><th>قيمة التكلفة</th><th>قيمة البيع</th></tr></thead><tbody>${
   data.products
     .map(
       (p: any) =>
         `<tr><td>${esc(p.name)}</td><td>${Number(p.stock_qty)}</td><td>${esc(p.unit)}</td><td>${money(
           Number(p.stock_qty) * Number(p.cost_price),
         )}</td><td>${money(Number(p.stock_qty) * Number(p.sale_price))}</td></tr>`,
     )
     .join("") || `<tr><td colspan="5">لا توجد أصناف</td></tr>`
 }</tbody><tfoot><tr><th colspan="3">الإجمالي</th><th>${money(data.stockCost)}</th><th>${money(
      data.stockSale,
    )}</th></tr></tfoot></table>
 <script>window.onload = () => { window.focus(); window.print(); };<\/script>
</body></html>`;
    const w = window.open("", "_blank");
    if (!w) { toast.error("فضلاً اسمح بالنوافذ المنبثقة لتصدير التقرير"); return; }
    w.document.write(html);
    w.document.close();
  };

  return (
    <AppShell title="التقارير التفصيلية" subtitle="دخل اليوم والمبيعات والمشتريات والمصروفات والمخزون">
      <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-card p-4">
        <div className="space-y-1.5">
          <Label>من</Label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>إلى</Label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <Button onClick={exportPdf} disabled={!data}>
          <FileDown className="size-4" /> تصدير PDF
        </Button>
      </div>

      <h2 className="mt-5 mb-2 text-base font-bold">دخل اليوم</h2>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="مبيعات اليوم" value={money(data?.todaySales)} tone="good" />
        <StatCard label="المحصّل اليوم" value={money(data?.todayCollected)} />
        <StatCard label="مصروفات اليوم" value={money(data?.todayExpenses)} tone="bad" />
        <StatCard
          label="صافي دخل اليوم"
          value={money(data?.todayNet)}
          tone={(data?.todayNet ?? 0) >= 0 ? "good" : "bad"}
        />
      </div>

      <h2 className="mt-5 mb-2 text-base font-bold">ملخص الفترة</h2>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="المبيعات" value={money(data?.sales)} tone="good" />
        <StatCard label="المحصّل" value={money(data?.collected)} />
        <StatCard label="المبيعات الآجلة" value={money(data?.credit)} tone="warn" />
        <StatCard label="سندات القبض" value={money(data?.receiptsIn)} />
        <StatCard label="المشتريات" value={money(data?.purchases)} />
        <StatCard label="سندات الصرف" value={money(data?.receiptsOut)} />
        <StatCard label="المصروفات" value={money(data?.expenses)} tone="bad" />
        <StatCard label="الهالك" value={money(data?.waste)} tone="bad" />
        <StatCard label="المسحوبات" value={money(data?.withdrawals)} />
        <StatCard label="الربح الإجمالي" value={money(data?.gross)} />
        <StatCard
          label="الربح الصافي"
          value={money(data?.net)}
          tone={(data?.net ?? 0) >= 0 ? "good" : "bad"}
        />
        <StatCard label="قيمة المخزون (تكلفة)" value={money(data?.stockCost)} hint={`بسعر البيع: ${money(data?.stockSale)}`} />
      </div>

      <h2 className="mt-5 mb-2 text-base font-bold">رصيد المخزون</h2>
      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs">
            <tr>
              <th className="p-2 text-right">الصنف</th>
              <th className="p-2 text-right">الكمية</th>
              <th className="p-2 text-right">الوحدة</th>
              <th className="p-2 text-right">قيمة التكلفة</th>
              <th className="p-2 text-right">قيمة البيع</th>
            </tr>
          </thead>
          <tbody>
            {(data?.products ?? []).map((p: any) => (
              <tr key={p.name} className="border-t">
                <td className="p-2">{p.name}</td>
                <td className="p-2">{Number(p.stock_qty)}</td>
                <td className="p-2">{p.unit}</td>
                <td className="p-2">{money(Number(p.stock_qty) * Number(p.cost_price))}</td>
                <td className="p-2">{money(Number(p.stock_qty) * Number(p.sale_price))}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!data?.products?.length && <p className="p-4 text-sm text-muted-foreground">لا توجد أصناف.</p>}
      </div>
    </AppShell>
  );
}
