import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell, StatCard } from "@/components/AppShell";
import { Input } from "@/components/ui/input";
import { MessageButtons } from "@/components/MessageButtons";
import { money } from "@/lib/format";
import { useSettings, type Entity } from "@/hooks/useAppData";
import { buildMessage } from "@/lib/whatsapp";
import { Search, FileText } from "lucide-react";

export const Route = createFileRoute("/_authenticated/followup")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "متابعة العملاء | نظام إدارة المبيعات والمخزون" },
      {
        name: "description",
        content: "متابعة العملاء: إجمالي الديون والمتبقي وعدد الفواتير والسندات والدفعات لكل عميل.",
      },
      { property: "og:title", content: "متابعة العملاء | نظام إدارة المبيعات والمخزون" },
      {
        property: "og:description",
        content: "متابعة العملاء: إجمالي الديون والمتبقي وعدد الفواتير والسندات والدفعات لكل عميل.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: FollowUpPage,
});

type Row = {
  id: string;
  name: string;
  phone: string | null;
  creditLimit: number;
  invoices: number;
  total: number;
  paidOnInvoices: number;
  receipts: number;
  receiptsCount: number;
  opening: number;
  remaining: number;
};

function FollowUpPage() {
  const { data: settings } = useSettings();
  const [q, setQ] = useState("");
  const [onlyDebt, setOnlyDebt] = useState(true);

  const { data: rows } = useQuery({
    queryKey: ["customer-followup"],
    queryFn: async (): Promise<Row[]> => {
      const [ents, invs, pays] = await Promise.all([
        supabase.from("entities").select("*").eq("kind", "customer").order("name"),
        supabase.from("invoices").select("id,entity_id,customer_name,total,paid"),
        supabase.from("payments").select("id,entity_id,amount,direction,invoice_id"),
      ]);
      const entities = ((ents.data ?? []) as unknown as Entity[]).map((e) => ({ ...e }));
      const invoices = (invs.data ?? []) as any[];
      const payments = (pays.data ?? []) as any[];

      return entities.map((e) => {
        const mine = invoices.filter((i) => i.entity_id === e.id || i.customer_name === e.name);
        const total = mine.reduce((a, i) => a + Number(i.total), 0);
        const paidOnInvoices = mine.reduce((a, i) => a + Number(i.paid), 0);
        const standalone = payments.filter(
          (p) => p.entity_id === e.id && (p.direction ?? "in") === "in" && !p.invoice_id,
        );
        const receipts = standalone.reduce((a, p) => a + Number(p.amount), 0);
        const opening = Number(e.opening_balance ?? 0);
        return {
          id: e.id,
          name: e.name,
          phone: e.phone,
          creditLimit: Number(e.credit_limit ?? 0),
          invoices: mine.length,
          total,
          paidOnInvoices,
          receipts,
          receiptsCount: payments.filter((p) => p.entity_id === e.id).length,
          opening,
          remaining: opening + total - paidOnInvoices - receipts,
        };
      });
    },
  });

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (rows ?? [])
      .filter((r) => !s || r.name.toLowerCase().includes(s) || (r.phone ?? "").includes(s))
      .filter((r) => !onlyDebt || r.remaining > 0.001)
      .sort((a, b) => b.remaining - a.remaining);
  }, [rows, q, onlyDebt]);

  const totalDebt = (rows ?? []).reduce((a, r) => a + Math.max(0, r.remaining), 0);
  const totalSales = (rows ?? []).reduce((a, r) => a + r.total, 0);
  const totalPaid = (rows ?? []).reduce((a, r) => a + r.paidOnInvoices + r.receipts, 0);

  const msgFor = (r: Row) =>
    buildMessage(settings?.debt_message_template ?? "{name}: المتبقي {amount} {currency}", {
      name: r.name,
      amount: r.remaining,
      total: r.total,
      paid: r.paidOnInvoices + r.receipts,
      currency: settings?.currency ?? "ريال",
      business: settings?.business_name ?? "منشأتي",
    });

  return (
    <AppShell title="متابعة العملاء" subtitle="الديون والمتبقي وعدد الفواتير والسندات">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="إجمالي الديون" value={money(totalDebt)} tone="warn" />
        <StatCard label="إجمالي المبيعات" value={money(totalSales)} tone="good" />
        <StatCard label="إجمالي المحصّل" value={money(totalPaid)} />
        <StatCard label="عدد العملاء" value={String((rows ?? []).length)} />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1">
          <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pr-9"
            placeholder="ابحث باسم العميل أو رقم الجوال..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={onlyDebt} onChange={(e) => setOnlyDebt(e.target.checked)} />
          المدينون فقط
        </label>
      </div>

      <div className="mt-3 overflow-x-auto rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs">
            <tr>
              <th className="p-2 text-right">العميل</th>
              <th className="p-2 text-right">عدد الفواتير</th>
              <th className="p-2 text-right">إجمالي المبيعات</th>
              <th className="p-2 text-right">المدفوع + السندات</th>
              <th className="p-2 text-right">المتبقي</th>
              <th className="p-2 text-right">سقف الدين</th>
              <th className="p-2 text-right">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {list.map((r) => {
              const over = r.creditLimit > 0 && r.remaining >= r.creditLimit;
              return (
                <tr key={r.id} className="border-t align-top">
                  <td className="p-2">
                    <p className="font-bold">{r.name}</p>
                    <p className="text-xs text-muted-foreground">{r.phone ?? "-"}</p>
                  </td>
                  <td className="p-2">{r.invoices}</td>
                  <td className="p-2">{money(r.total)}</td>
                  <td className="p-2 text-emerald-600">
                    {money(r.paidOnInvoices + r.receipts)}
                    <span className="block text-xs text-muted-foreground">
                      {r.receiptsCount} سند/دفعة
                    </span>
                  </td>
                  <td className={`p-2 font-bold ${over ? "text-destructive" : ""}`}>
                    {money(r.remaining)}
                  </td>
                  <td className="p-2">{r.creditLimit ? money(r.creditLimit) : "بدون حد"}</td>
                  <td className="p-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        to="/accounts/$id"
                        params={{ id: r.id }}
                        className="inline-flex items-center gap-1 text-xs text-primary"
                      >
                        <FileText className="size-4" /> كشف الحساب
                      </Link>
                      <MessageButtons phone={r.phone} message={msgFor(r)} />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!list.length && <p className="p-4 text-sm text-muted-foreground">لا توجد نتائج.</p>}
      </div>
    </AppShell>
  );
}
