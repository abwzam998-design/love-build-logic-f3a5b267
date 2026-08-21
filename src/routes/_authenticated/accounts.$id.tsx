import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell, StatCard } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NumberInput } from "@/components/NumberInput";
import { MessageButtons } from "@/components/MessageButtons";
import { money, dateTime, todayISO } from "@/lib/format";
import { buildLedger, type LedgerRow } from "@/lib/ledger";
import { entityKindLabel, useSettings, nextRef, type Entity } from "@/hooks/useAppData";
import { buildMessage } from "@/lib/whatsapp";
import { ArrowRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/accounts/$id")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "كشف حساب تفصيلي | نظام إدارة المبيعات والمخزون" },
      { name: "description", content: "كشف حساب زمني بالحركات والمبالغ الواصلة والرصيد المتبقي لكل عميل أو مورد." },
      { property: "og:title", content: "كشف حساب تفصيلي | نظام إدارة المبيعات والمخزون" },
      { property: "og:description", content: "كشف حساب زمني بالحركات والمبالغ الواصلة والرصيد المتبقي لكل عميل أو مورد." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AccountLedgerPage,
});

function AccountLedgerPage() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const { data: settings } = useSettings();
  const [amount, setAmount] = useState(0);
  const [payDate, setPayDate] = useState(todayISO());
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const { data } = useQuery({
    queryKey: ["account-ledger", id],
    queryFn: async () => {
      const { data: entity, error } = await supabase
        .from("entities")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      const ent = entity as unknown as Entity | null;
      if (!ent) return null;

      const [inv, pur, pay] = await Promise.all([
        supabase.from("invoices").select("*").or(`entity_id.eq.${id},customer_name.eq.${ent.name}`),
        supabase.from("purchases").select("*").or(`entity_id.eq.${id},supplier_name.eq.${ent.name}`),
        supabase.from("payments").select("*").eq("entity_id", id),
      ]);

      const invoices = (inv.data ?? []) as any[];
      const purchases = (pur.data ?? []) as any[];
      const payments = (pay.data ?? []) as any[];

      const invIds = invoices.map((i) => i.id);
      const purIds = purchases.map((p) => p.id);
      const [invItems, purItems] = await Promise.all([
        invIds.length
          ? supabase.from("invoice_items").select("*").in("invoice_id", invIds)
          : Promise.resolve({ data: [] as any[] }),
        purIds.length
          ? supabase.from("purchase_items").select("*").in("purchase_id", purIds)
          : Promise.resolve({ data: [] as any[] }),
      ]);

      const isCustomer = ent.kind === "customer";
      const docs = isCustomer
        ? invoices.map((i) => ({
            id: i.id,
            no: i.invoice_no,
            at: i.invoice_date,
            total: Number(i.total),
            paid: Number(i.paid),
            discount: Number(i.discount ?? 0),
          }))
        : purchases.map((p) => ({
            id: p.id,
            no: p.purchase_no,
            at: p.purchase_date,
            total: Number(p.total),
            paid: Number(p.paid),
            discount: Number(p.discount ?? 0),
          }));

      const items = isCustomer
        ? ((invItems.data ?? []) as any[]).map((i) => ({
            parent_id: i.invoice_id,
            item_name: i.item_name,
            quantity: Number(i.quantity),
            unit: i.unit,
            price: Number(i.unit_price),
            discount: Number(i.discount ?? 0),
            line_total: Number(i.line_total),
          }))
        : ((purItems.data ?? []) as any[]).map((i) => ({
            parent_id: i.purchase_id,
            item_name: i.item_name,
            quantity: Number(i.quantity),
            unit: i.unit,
            price: Number(i.unit_cost),
            discount: Number(i.discount ?? 0),
            line_total: Number(i.line_total),
          }));

      const rows = buildLedger({
        kind: ent.kind,
        openingBalance: Number(ent.opening_balance ?? 0),
        docs,
        payments: payments.map((p) => ({
          id: p.id,
          amount: Number(p.amount),
          paid_at: p.paid_at,
          direction: p.direction ?? "in",
          receipt_no: p.receipt_no ?? null,
          method: p.method ?? null,
          notes: p.notes ?? null,
          invoice_id: p.invoice_id ?? null,
          purchase_id: p.purchase_id ?? null,
        })),
        items,
        docLabel: isCustomer ? "فاتورة بيع" : "فاتورة شراء",
      });

      return { entity: ent, rows };
    },
  });

  const entity = data?.entity;
  const rows: LedgerRow[] = data?.rows ?? [];
  const totalDebit = rows.reduce((a, r) => a + r.debit, 0);
  const totalCredit = rows.reduce((a, r) => a + r.credit, 0);
  const balance = totalDebit - totalCredit;

  const addPayment = async () => {
    if (!entity) return;
    if (amount <= 0) { toast.error("أدخل مبلغ الواصل"); return; }
    setSaving(true);
    const { data: user } = await supabase.auth.getUser();
    const { error } = await supabase.from("payments").insert({
      ref_type: entity.kind === "customer" ? "invoice" : "purchase",
      entity_id: entity.id,
      direction: entity.kind === "customer" ? "in" : "out",
      receipt_no: nextRef(entity.kind === "customer" ? "RCV" : "PAY"),
      amount,
      notes: notes.trim() || null,
      paid_at: new Date(`${payDate}T${new Date().toTimeString().slice(0, 8)}`).toISOString(),
      created_by: user.user?.id ?? null,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("تم تسجيل الواصل");
    setAmount(0);
    setNotes("");
    qc.invalidateQueries({ queryKey: ["account-ledger", id] });
    qc.invalidateQueries({ queryKey: ["receipts"] });
  };

  const statementMsg = buildMessage(
    settings?.statement_message_template ?? "{name}: المتبقي {amount} {currency}",
    {
      name: entity?.name ?? "",
      amount: Math.abs(balance),
      total: totalDebit,
      paid: totalCredit,
      currency: settings?.currency ?? "ريال",
      business: settings?.business_name ?? "",
    },
  );

  return (
    <AppShell
      title={entity ? `كشف حساب: ${entity.name}` : "كشف حساب"}
      subtitle={entity ? `${entityKindLabel(entity.kind)}${entity.phone ? ` · ${entity.phone}` : ""}` : ""}
    >
      <Link to="/accounts" className="mb-3 inline-flex items-center gap-1 text-sm text-primary">
        <ArrowRight className="size-4" /> رجوع للحسابات
      </Link>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="إجمالي المستحق" value={money(totalDebit)} />
        <StatCard label="إجمالي الواصل" value={money(totalCredit)} tone="good" />
        <StatCard
          label={balance >= 0 ? "المتبقي عليه" : "المتبقي له"}
          value={money(Math.abs(balance))}
          tone="warn"
        />
        <StatCard label="عدد الحركات" value={String(rows.length)} />
      </div>

      <div className="mt-4 rounded-xl border bg-card p-4">
        <p className="mb-3 font-bold">تسجيل واصل / سند</p>
        <div className="grid gap-3 md:grid-cols-4">
          <div className="space-y-1.5">
            <Label>المبلغ</Label>
            <NumberInput value={amount} onValueChange={setAmount} min={0} decimals={2} />
          </div>
          <div className="space-y-1.5">
            <Label>التاريخ</Label>
            <Input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label>البيان</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <MessageButtons phone={entity?.phone} message={statementMsg} />
          <Button onClick={addPayment} disabled={saving}>حفظ السند</Button>
        </div>
      </div>

      <h2 className="mt-6 mb-2 text-base font-bold">الحركات</h2>
      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs">
            <tr>
              <th className="p-2 text-right">التاريخ والوقت</th>
              <th className="p-2 text-right">البيان</th>
              <th className="p-2 text-right">مدين</th>
              <th className="p-2 text-right">الواصل</th>
              <th className="p-2 text-right">المتبقي</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t align-top">
                <td className="whitespace-nowrap p-2">{dateTime(r.at)}</td>
                <td className="p-2">
                  <p>{r.desc}</p>
                  {!!r.items?.length && (
                    <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                      {r.items.map((it, idx) => (
                        <li key={idx}>
                          {it.item_name} — {it.quantity} {it.unit} × {money(it.price)}
                          {it.discount ? ` − خصم ${money(it.discount)}` : ""} = {money(it.line_total)}
                        </li>
                      ))}
                    </ul>
                  )}
                </td>
                <td className="p-2">{r.debit ? money(r.debit) : "-"}</td>
                <td className="p-2 text-emerald-600">{r.credit ? money(r.credit) : "-"}</td>
                <td className="p-2 font-bold">{money(Math.abs(r.balance))}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <p className="p-4 text-sm text-muted-foreground">لا توجد حركات.</p>}
      </div>
    </AppShell>
  );
}
