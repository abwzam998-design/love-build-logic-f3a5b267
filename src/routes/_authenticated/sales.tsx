import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NumberInput } from "@/components/NumberInput";
import { EntityPicker } from "@/components/EntityPicker";
import { money, dateOnly, num, SALE_KINDS, SALE_UNITS, PAYMENT_TYPES } from "@/lib/format";
import {
  customerOutstanding,
  ensureEntity,
  nextRef,
  useProducts,
  useSettings,
  type Entity,
} from "@/hooks/useAppData";
import { openWhatsApp } from "@/lib/whatsapp";
import { invoiceText, printInvoicePdf, type InvoiceDoc } from "@/lib/invoiceDoc";
import { Trash2, Plus, FileDown, Send, Pencil, X } from "lucide-react";

export const Route = createFileRoute("/_authenticated/sales")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "المبيعات | نظام إدارة المبيعات والمخزون" },
      { name: "description", content: "تسجيل فواتير البيع بالجملة والتجزئة نقداً أو آجلاً مع أصناف متعددة." },
      { property: "og:title", content: "المبيعات | نظام إدارة المبيعات والمخزون" },
      { property: "og:description", content: "تسجيل فواتير البيع بالجملة والتجزئة نقداً أو آجلاً مع أصناف متعددة." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SalesPage,
});

type Line = {
  item_name: string;
  quantity: number;
  unit: string;
  unit_price: number;
  discount: number;
  sale_kind: string;
  product_id: string | null;
};

const emptyLine: Line = {
  item_name: "",
  quantity: 1,
  unit: SALE_UNITS[0]!,
  unit_price: 0,
  discount: 0,
  sale_kind: SALE_KINDS[0]!,
  product_id: null,
};

const lineTotal = (l: Line) =>
  Math.max(0, num(l.quantity) * num(l.unit_price) - num(l.discount));

function SalesPage() {
  const qc = useQueryClient();
  const { data: products } = useProducts();
  const { data: settings } = useSettings();
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [picked, setPicked] = useState<Entity | null>(null);
  const [paymentType, setPaymentType] = useState(PAYMENT_TYPES[0]!);
  const [paid, setPaid] = useState(0);
  const [lines, setLines] = useState<Line[]>([{ ...emptyLine }]);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const total = lines.reduce((a, l) => a + lineTotal(l), 0);
  const totalDiscount = lines.reduce((a, l) => a + num(l.discount), 0);

  const { data: invoices } = useQuery({
    queryKey: ["invoices-recent"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });

  const setLine = (i: number, patch: Partial<Line>) =>
    setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));

  const resetForm = () => {
    setEditingId(null);
    setCustomerName("");
    setCustomerPhone("");
    setPicked(null);
    setPaid(0);
    setPaymentType(PAYMENT_TYPES[0]!);
    setLines([{ ...emptyLine }]);
  };

  const editInvoice = async (inv: any) => {
    const { data: items, error } = await supabase
      .from("invoice_items")
      .select("*")
      .eq("invoice_id", inv.id);
    if (error) { toast.error(error.message); return; }
    setEditingId(inv.id);
    setCustomerName(inv.customer_name ?? "");
    setCustomerPhone(inv.customer_phone ?? "");
    setPicked(null);
    setPaymentType(inv.payment_type ?? PAYMENT_TYPES[0]!);
    setPaid(Number(inv.paid ?? 0));
    setLines(
      (items ?? []).length
        ? (items ?? []).map((it) => ({
            item_name: it.item_name,
            quantity: Number(it.quantity),
            unit: it.unit,
            unit_price: Number(it.unit_price),
            discount: Number(it.discount ?? 0),
            sale_kind: it.sale_kind ?? SALE_KINDS[0]!,
            product_id: it.product_id ?? null,
          }))
        : [{ ...emptyLine }],
    );
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteInvoice = async (inv: any) => {
    if (!window.confirm(`حذف الفاتورة ${inv.invoice_no}؟ سيتم حذف أصنافها وسنداتها.`)) return;
    await supabase.from("payments").delete().eq("invoice_id", inv.id);
    await supabase.from("invoice_items").delete().eq("invoice_id", inv.id);
    const { error } = await supabase.from("invoices").delete().eq("id", inv.id);
    if (error) { toast.error(error.message); return; }
    if (editingId === inv.id) resetForm();
    toast.success("تم حذف الفاتورة");
    qc.invalidateQueries({ queryKey: ["invoices-recent"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
    qc.invalidateQueries({ queryKey: ["receipts"] });
    qc.invalidateQueries({ queryKey: ["account-ledger"] });
  };

  const shareInvoice = async (inv: any, mode: "pdf" | "wa") => {
    const { data: items, error } = await supabase
      .from("invoice_items")
      .select("*")
      .eq("invoice_id", inv.id);
    if (error) { toast.error(error.message); return; }
    const doc: InvoiceDoc = {
      invoice_no: inv.invoice_no,
      customer_name: inv.customer_name,
      customer_phone: inv.customer_phone,
      invoice_date: inv.invoice_date,
      payment_type: inv.payment_type,
      total: inv.total,
      paid: inv.paid,
      discount: inv.discount,
      notes: inv.notes,
      items: (items ?? []).map((it) => ({
        item_name: it.item_name,
        quantity: it.quantity,
        unit: it.unit,
        unit_price: it.unit_price,
        discount: it.discount,
        line_total: it.line_total,
      })),
    };
    const biz = {
      business: settings?.business_name ?? "منشأتي",
      currency: settings?.currency ?? "ريال",
      phone: settings?.phone ?? null,
      address: settings?.address ?? null,
    };
    if (mode === "pdf") {
      if (!printInvoicePdf(doc, biz)) toast.error("فضلاً اسمح بالنوافذ المنبثقة لطباعة الفاتورة");
    } else {
      openWhatsApp(inv.customer_phone, invoiceText(doc, biz));
    }
  };

  const save = async () => {
    if (!customerName.trim()) { toast.error("أدخل اسم العميل"); return; }
    const valid = lines.filter((l) => l.item_name.trim() && num(l.quantity) > 0);
    if (!valid.length) { toast.error("أضف صنفاً واحداً على الأقل"); return; }
    setSaving(true);
    try {
      const paidAmount = paymentType === "نقدي" ? total : num(paid);
      const entityId = picked?.id ?? (await ensureEntity("customer", customerName, customerPhone));

      // منع تجاوز سقف الدين للعميل
      const newDebt = total - paidAmount;
      if (entityId && newDebt > 0) {
        const info = await customerOutstanding(entityId);
        if (info.creditLimit > 0 && info.balance + newDebt > info.creditLimit) {
          const currency = settings?.currency ?? "ريال";
          const business = settings?.business_name ?? "منشأتي";
          const msg =
            `السلام عليكم ${info.name || customerName} 👋\n` +
            `لقد وصلتم إلى الحد الأقصى المسموح به للدين (${money(info.creditLimit)} ${currency}).\n` +
            `الرصيد الحالي عليكم: ${money(info.balance)} ${currency}.\n` +
            `نرجو التكرم بسداد ما عليكم لإتمام عمليات الشراء الآجلة. شكراً لتعاملكم معنا - ${business}`;
          toast.error("تم إيقاف البيع الآجل: العميل تجاوز سقف الدين");
          openWhatsApp(info.phone || customerPhone, msg);
          setSaving(false);
          return;
        }
      }

      const { data: user } = await supabase.auth.getUser();
      const { data: inv, error } = await supabase
        .from("invoices")
        .insert({
          invoice_no: nextRef("INV"),
          customer_name: customerName.trim(),
          customer_phone: customerPhone.trim() || null,
          entity_id: entityId,
          payment_type: paymentType,
          sale_type: valid[0]!.sale_kind,
          total,
          paid: paidAmount,
          discount: totalDiscount,
          created_by: user.user?.id ?? null,
        })
        .select()
        .single();
      if (error || !inv) throw error ?? new Error("تعذر الحفظ");

      const { error: itemsError } = await supabase.from("invoice_items").insert(
        valid.map((l) => ({
          invoice_id: inv.id,
          item_name: l.item_name.trim(),
          product_id: l.product_id,
          quantity: num(l.quantity),
          unit: l.unit,
          unit_price: num(l.unit_price),
          discount: num(l.discount),
          line_total: lineTotal(l),
          sale_kind: l.sale_kind,
        })),
      );
      if (itemsError) throw itemsError;

      if (paidAmount > 0 && entityId) {
        await supabase.from("payments").insert({
          ref_type: "invoice",
          invoice_id: inv.id,
          entity_id: entityId,
          direction: "in",
          method: "نقدي",
          receipt_no: nextRef("RCV"),
          amount: paidAmount,
          notes: `واصل مع الفاتورة ${inv.invoice_no}`,
          created_by: user.user?.id ?? null,
        });
      }

      toast.success("تم حفظ الفاتورة");
      setCustomerName("");
      setCustomerPhone("");
      setPicked(null);
      setPaid(0);
      setLines([{ ...emptyLine }]);
      qc.invalidateQueries({ queryKey: ["invoices-recent"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["receipts"] });
      qc.invalidateQueries({ queryKey: ["entities"] });
    } catch (e: any) {
      toast.error(e?.message ?? "تعذر الحفظ");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell title="المبيعات" subtitle="فاتورة بيع جديدة">
      <div className="rounded-xl border bg-card p-4">
        <div className="grid gap-3 md:grid-cols-4">
          <div className="space-y-1.5">
            <Label>اسم العميل</Label>
            <EntityPicker
              kind="customer"
              name={customerName}
              phone={customerPhone}
              namePlaceholder="اكتب أول حرف للبحث"
              onPick={(v) => {
                setCustomerName(v.name);
                setCustomerPhone(v.phone);
                setPicked(v.entity);
              }}
            />
          </div>
          <div className="space-y-1.5">
            <Label>رقم الجوال</Label>
            <Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>نوع الدفع</Label>
            <select
              className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              value={paymentType}
              onChange={(e) => setPaymentType(e.target.value)}
            >
              {PAYMENT_TYPES.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>الواصل (المدفوع)</Label>
            <NumberInput
              value={paymentType === "نقدي" ? total : paid}
              onValueChange={setPaid}
              disabled={paymentType === "نقدي"}
              min={0}
              decimals={2}
            />
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {lines.map((l, i) => (
            <div key={i} className="grid gap-2 rounded-lg border p-3 md:grid-cols-7">
              <div className="md:col-span-2">
                <Input
                  list="products-list"
                  placeholder="اسم الصنف"
                  value={l.item_name}
                  onChange={(e) => {
                    const p = products?.find((x) => x.name === e.target.value);
                    setLine(i, {
                      item_name: e.target.value,
                      product_id: p?.id ?? null,
                      unit_price: p ? Number(p.sale_price) : l.unit_price,
                      unit: p?.unit ?? l.unit,
                    });
                  }}
                />
              </div>
              <NumberInput
                placeholder="الكمية"
                value={l.quantity}
                onValueChange={(n) => setLine(i, { quantity: n })}
                min={0}
                decimals={3}
              />
              <select
                className="h-9 rounded-md border bg-background px-2 text-sm"
                value={l.unit}
                onChange={(e) => setLine(i, { unit: e.target.value })}
              >
                {SALE_UNITS.map((u) => (
                  <option key={u}>{u}</option>
                ))}
              </select>
              <NumberInput
                placeholder="السعر"
                value={l.unit_price}
                onValueChange={(n) => setLine(i, { unit_price: n })}
                min={0}
                decimals={2}
              />
              <NumberInput
                placeholder="الخصم"
                value={l.discount}
                onValueChange={(n) => setLine(i, { discount: n })}
                min={0}
                decimals={2}
              />
              <div className="flex items-center gap-2">
                <select
                  className="h-9 flex-1 rounded-md border bg-background px-2 text-sm"
                  value={l.sale_kind}
                  onChange={(e) => setLine(i, { sale_kind: e.target.value })}
                >
                  {SALE_KINDS.map((k) => (
                    <option key={k}>{k}</option>
                  ))}
                </select>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setLines((ls) => ls.filter((_, idx) => idx !== i))}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground md:col-span-7">
                إجمالي السطر: {money(lineTotal(l))}
              </p>
            </div>
          ))}
          <datalist id="products-list">
            {(products ?? []).map((p) => (
              <option key={p.id} value={p.name} />
            ))}
          </datalist>
          <Button variant="outline" onClick={() => setLines((ls) => [...ls, { ...emptyLine }])}>
            <Plus className="size-4" /> إضافة صنف
          </Button>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
          <div>
            <p className="text-lg font-bold">الإجمالي: {money(total)}</p>
            <p className="text-xs text-muted-foreground">
              الخصم: {money(totalDiscount)} · المتبقي:{" "}
              {money(total - (paymentType === "نقدي" ? total : num(paid)))}
            </p>
          </div>
          <Button onClick={save} disabled={saving}>
            حفظ الفاتورة
          </Button>
        </div>
      </div>

      <h2 className="mt-6 mb-2 text-base font-bold">آخر الفواتير</h2>
      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs">
            <tr>
              <th className="p-2 text-right">الرقم</th>
              <th className="p-2 text-right">العميل</th>
              <th className="p-2 text-right">التاريخ</th>
              <th className="p-2 text-right">الإجمالي</th>
              <th className="p-2 text-right">المتبقي</th>
              <th className="p-2 text-right">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {(invoices ?? []).map((i) => (
              <tr key={i.id} className="border-t">
                <td className="p-2">{i.invoice_no}</td>
                <td className="p-2">{i.customer_name}</td>
                <td className="p-2">{dateOnly(i.invoice_date)}</td>
                <td className="p-2">{money(i.total)}</td>
                <td className="p-2">{money(Number(i.total) - Number(i.paid))}</td>
                <td className="p-2">
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" onClick={() => shareInvoice(i, "pdf")}>
                      <FileDown className="size-4" /> PDF
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => shareInvoice(i, "wa")}>
                      <Send className="size-4" /> واتساب
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
