import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell, StatCard } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { money, num } from "@/lib/format";
import { useSettings } from "@/hooks/useAppData";
import { buildMessage } from "@/lib/whatsapp";
import { MessageButtons } from "@/components/MessageButtons";

export const Route = createFileRoute("/_authenticated/ledger")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "الإجماليات والديون | نظام إدارة المبيعات والمخزون" },
      { name: "description", content: "متابعة ديون العملاء وتسجيل الدفعات وإرسال رسائل المطالبة عبر واتساب." },
      { property: "og:title", content: "الإجماليات والديون | نظام إدارة المبيعات والمخزون" },
      { property: "og:description", content: "متابعة ديون العملاء وتسجيل الدفعات وإرسال رسائل المطالبة عبر واتساب." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LedgerPage,
});

function LedgerPage() {
  const qc = useQueryClient();
  const { data: settings } = useSettings();
  const [amounts, setAmounts] = useState<Record<string, number>>({});

  const { data: rows } = useQuery({
    queryKey: ["debts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .order("invoice_date", { ascending: false });
      if (error) throw error;
      return (data ?? []).filter((i) => Number(i.total) - Number(i.paid) > 0.001);
    },
  });

  const totalDebt = (rows ?? []).reduce(
    (a, r) => a + Number(r.total) - Number(r.paid),
    0,
  );

  const pay = async (invoice: any) => {
    const amount = num(amounts[invoice.id]);
    const remaining = Number(invoice.total) - Number(invoice.paid);
    if (amount <= 0) { toast.error("أدخل مبلغ الدفعة"); return; }
    if (amount > remaining + 0.001) { toast.error("المبلغ أكبر من المتبقي"); return; }
    const { data: user } = await supabase.auth.getUser();
    const { error } = await supabase.from("payments").insert({
      ref_type: "invoice",
      invoice_id: invoice.id,
      amount,
      created_by: user.user?.id ?? null,
    });
    if (error) { toast.error(error.message); return; }
    const { error: upErr } = await supabase
      .from("invoices")
      .update({ paid: Number(invoice.paid) + amount })
      .eq("id", invoice.id);
    if (upErr) { toast.error(upErr.message); return; }
    toast.success("تم تسجيل الدفعة");
    setAmounts((a) => ({ ...a, [invoice.id]: 0 }));
    qc.invalidateQueries({ queryKey: ["debts"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const remind = (invoice: any) => {
    const msg = buildMessage(settings?.debt_message_template ?? "{name} لديك مبلغ {amount}", {
      name: invoice.customer_name,
      amount: Number(invoice.total) - Number(invoice.paid),
      total: Number(invoice.total),
      paid: Number(invoice.paid),
      invoice: invoice.invoice_no,
      date: invoice.invoice_date,
      currency: settings?.currency ?? "ريال",
      business: settings?.business_name ?? "",
    });
    openWhatsApp(invoice.customer_phone, msg);
  };

  return (
    <AppShell title="الإجماليات والديون" subtitle="الفواتير غير المسددة">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="إجمالي الديون" value={money(totalDebt)} tone="warn" />
        <StatCard label="عدد الفواتير" value={String(rows?.length ?? 0)} />
      </div>

      <div className="mt-4 space-y-3">
        {(rows ?? []).map((i) => {
          const remaining = Number(i.total) - Number(i.paid);
          return (
            <div key={i.id} className="rounded-xl border bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-bold">{i.customer_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {i.invoice_no} · إجمالي {money(i.total)} · مدفوع {money(i.paid)}
                  </p>
                </div>
                <p className="text-lg font-bold text-destructive">{money(remaining)}</p>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Input
                  type="number"
                  className="w-32"
                  placeholder="دفعة"
                  value={amounts[i.id] ?? ""}
                  onChange={(e) => setAmounts((a) => ({ ...a, [i.id]: num(e.target.value) }))}
                />
                <Button onClick={() => pay(i)}>تسديد</Button>
                <MessageButtons phone={i.customer_phone} message={buildMsg(i)} />
              </div>
            </div>
          );
        })}
        {!rows?.length && <p className="text-sm text-muted-foreground">لا توجد ديون حالياً.</p>}
      </div>
    </AppShell>
  );
}
