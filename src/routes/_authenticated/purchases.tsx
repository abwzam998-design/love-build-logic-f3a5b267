import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { money, dateOnly, num, SALE_UNITS, PAYMENT_TYPES } from "@/lib/format";
import { nextRef, useProducts } from "@/hooks/useAppData";
import { Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/purchases")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "المشتريات والموردين | نظام إدارة المبيعات والمخزون" },
      { name: "description", content: "تسجيل فواتير الشراء من الموردين ومتابعة المستحق عليهم." },
      { property: "og:title", content: "المشتريات والموردين | نظام إدارة المبيعات والمخزون" },
      { property: "og:description", content: "تسجيل فواتير الشراء من الموردين ومتابعة المستحق عليهم." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PurchasesPage,
});

type Line = { item_name: string; quantity: number; unit: string; unit_cost: number; product_id: string | null };
const emptyLine: Line = { item_name: "", quantity: 1, unit: SALE_UNITS[0]!, unit_cost: 0, product_id: null };

function PurchasesPage() {
  const qc = useQueryClient();
  const { data: products } = useProducts();
  const [supplierName, setSupplierName] = useState("");
  const [supplierPhone, setSupplierPhone] = useState("");
  const [paymentType, setPaymentType] = useState(PAYMENT_TYPES[0]!);
  const [paid, setPaid] = useState(0);
  const [lines, setLines] = useState<Line[]>([{ ...emptyLine }]);
  const [editingId, setEditingId] = useState<string | null>(null);

  const total = lines.reduce((a, l) => a + num(l.quantity) * num(l.unit_cost), 0);

  const { data: rows } = useQuery({
    queryKey: ["purchases-recent"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchases")
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
    setSupplierName("");
    setSupplierPhone("");
    setPaymentType(PAYMENT_TYPES[0]!);
    setPaid(0);
    setLines([{ ...emptyLine }]);
  };

  const editPurchase = async (p: any) => {
    const { data: items, error } = await supabase
      .from("purchase_items")
      .select("*")
      .eq("purchase_id", p.id);
    if (error) { toast.error(error.message); return; }
    setEditingId(p.id);
    setSupplierName(p.supplier_name ?? "");
    setSupplierPhone(p.supplier_phone ?? "");
    setPaymentType(p.payment_type ?? PAYMENT_TYPES[0]!);
    setPaid(Number(p.paid ?? 0));
    setLines(
      (items ?? []).length
        ? (items ?? []).map((it) => ({
            item_name: it.item_name,
            quantity: Number(it.quantity),
            unit: it.unit,
            unit_cost: Number(it.unit_cost),
            product_id: it.product_id ?? null,
          }))
        : [{ ...emptyLine }],
    );
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deletePurchase = async (p: any) => {
    if (!window.confirm(`حذف فاتورة الشراء ${p.purchase_no}؟`)) return;
    await supabase.from("payments").delete().eq("purchase_id", p.id);
    await supabase.from("purchase_items").delete().eq("purchase_id", p.id);
    const { error } = await supabase.from("purchases").delete().eq("id", p.id);
    if (error) { toast.error(error.message); return; }
    if (editingId === p.id) resetForm();
    toast.success("تم حذف الفاتورة");
    qc.invalidateQueries({ queryKey: ["purchases-recent"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
    qc.invalidateQueries({ queryKey: ["account-ledger"] });
  };

  const save = async () => {
    if (!supplierName.trim()) { toast.error("أدخل اسم المورد"); return; }
    const valid = lines.filter((l) => l.item_name.trim() && num(l.quantity) > 0);
    if (!valid.length) { toast.error("أضف صنفاً واحداً على الأقل"); return; }
    const { data: user } = await supabase.auth.getUser();
    const payload = {
      supplier_name: supplierName.trim(),
      supplier_phone: supplierPhone.trim() || null,
      payment_type: paymentType,
      total,
      paid: paymentType === "نقدي" ? total : num(paid),
    };

    let pur: any;
    if (editingId) {
      const { data, error } = await supabase
        .from("purchases")
        .update(payload)
        .eq("id", editingId)
        .select()
        .single();
      if (error || !data) { toast.error(error?.message ?? "تعذر التعديل"); return; }
      pur = data;
      await supabase.from("purchase_items").delete().eq("purchase_id", editingId);
    } else {
      const { data, error } = await supabase
        .from("purchases")
        .insert({ ...payload, purchase_no: nextRef("PUR"), created_by: user.user?.id ?? null })
        .select()
        .single();
      if (error || !data) { toast.error(error?.message ?? "تعذر الحفظ"); return; }
      pur = data;
    }

    const { error: itemsError } = await supabase.from("purchase_items").insert(
      valid.map((l) => ({
        purchase_id: pur.id,
        item_name: l.item_name.trim(),
        product_id: l.product_id,
        quantity: num(l.quantity),
        unit: l.unit,
        unit_cost: num(l.unit_cost),
        line_total: num(l.quantity) * num(l.unit_cost),
      })),
    );
    if (itemsError) { toast.error(itemsError.message); return; }
    toast.success(editingId ? "تم تعديل فاتورة الشراء" : "تم حفظ فاتورة الشراء");
    resetForm();
    qc.invalidateQueries({ queryKey: ["purchases-recent"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
    qc.invalidateQueries({ queryKey: ["account-ledger"] });
  };

  return (
    <AppShell title="المشتريات والموردين" subtitle="فاتورة شراء جديدة">
      <div className="rounded-xl border bg-card p-4">
        <div className="grid gap-3 md:grid-cols-4">
          <div className="space-y-1.5">
            <Label>اسم المورد</Label>
            <Input value={supplierName} onChange={(e) => setSupplierName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>رقم الجوال</Label>
            <Input value={supplierPhone} onChange={(e) => setSupplierPhone(e.target.value)} />
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
            <Label>المدفوع</Label>
            <Input
              type="number"
              value={paymentType === "نقدي" ? total : paid}
              disabled={paymentType === "نقدي"}
              onChange={(e) => setPaid(num(e.target.value))}
            />
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {lines.map((l, i) => (
            <div key={i} className="grid gap-2 rounded-lg border p-3 md:grid-cols-5">
              <div className="md:col-span-2">
                <Input
                  list="purchase-products"
                  placeholder="اسم الصنف"
                  value={l.item_name}
                  onChange={(e) => {
                    const p = products?.find((x) => x.name === e.target.value);
                    setLine(i, {
                      item_name: e.target.value,
                      product_id: p?.id ?? null,
                      unit_cost: p ? Number(p.cost_price) : l.unit_cost,
                      unit: p?.unit ?? l.unit,
                    });
                  }}
                />
              </div>
              <Input
                type="number"
                placeholder="الكمية"
                value={l.quantity}
                onChange={(e) => setLine(i, { quantity: num(e.target.value) })}
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
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  placeholder="التكلفة"
                  value={l.unit_cost}
                  onChange={(e) => setLine(i, { unit_cost: num(e.target.value) })}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setLines((ls) => ls.filter((_, idx) => idx !== i))}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          ))}
          <datalist id="purchase-products">
            {(products ?? []).map((p) => (
              <option key={p.id} value={p.name} />
            ))}
          </datalist>
          <Button variant="outline" onClick={() => setLines((ls) => [...ls, { ...emptyLine }])}>
            <Plus className="size-4" /> إضافة صنف
          </Button>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
          <p className="text-lg font-bold">الإجمالي: {money(total)}</p>
          <Button onClick={save}>حفظ الفاتورة</Button>
        </div>
      </div>

      <h2 className="mt-6 mb-2 text-base font-bold">آخر المشتريات</h2>
      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs">
            <tr>
              <th className="p-2 text-right">الرقم</th>
              <th className="p-2 text-right">المورد</th>
              <th className="p-2 text-right">التاريخ</th>
              <th className="p-2 text-right">الإجمالي</th>
              <th className="p-2 text-right">المتبقي</th>
            </tr>
          </thead>
          <tbody>
            {(rows ?? []).map((p) => (
              <tr key={p.id} className="border-t">
                <td className="p-2">{p.purchase_no}</td>
                <td className="p-2">{p.supplier_name}</td>
                <td className="p-2">{dateOnly(p.purchase_date)}</td>
                <td className="p-2">{money(p.total)}</td>
                <td className="p-2">{money(Number(p.total) - Number(p.paid))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
