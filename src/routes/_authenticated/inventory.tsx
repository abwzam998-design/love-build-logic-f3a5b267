import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { money, dateOnly, num, SALE_UNITS } from "@/lib/format";
import { useProducts } from "@/hooks/useAppData";
import { ProductUnitsManager } from "@/components/ProductUnitsManager";

export const Route = createFileRoute("/_authenticated/inventory")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "المخزون والهالك | نظام إدارة المبيعات والمخزون" },
      { name: "description", content: "إدارة الأصناف والأسعار وتسجيل الهالك والجرد اليومي." },
      { property: "og:title", content: "المخزون والهالك | نظام إدارة المبيعات والمخزون" },
      { property: "og:description", content: "إدارة الأصناف والأسعار وتسجيل الهالك والجرد اليومي." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: InventoryPage,
});

function InventoryPage() {
  const qc = useQueryClient();
  const { data: products } = useProducts();
  const [p, setP] = useState({ name: "", unit: SALE_UNITS[0]!, cost_price: 0, sale_price: 0, stock_qty: 0 });
  const [w, setW] = useState({ item_name: "", quantity: 0, unit: SALE_UNITS[0]!, unit_cost: 0, reason: "" });

  const { data: waste } = useQuery({
    queryKey: ["waste"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("waste")
        .select("*")
        .order("waste_date", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });

  const addProduct = async () => {
    if (!p.name.trim()) { toast.error("أدخل اسم الصنف"); return; }
    const { error } = await supabase.from("products").insert({
      name: p.name.trim(),
      unit: p.unit,
      cost_price: num(p.cost_price),
      sale_price: num(p.sale_price),
      stock_qty: num(p.stock_qty),
    });
    if (error) { toast.error(error.message); return; }
    toast.success("تمت إضافة الصنف");
    setP({ name: "", unit: SALE_UNITS[0]!, cost_price: 0, sale_price: 0, stock_qty: 0 });
    qc.invalidateQueries({ queryKey: ["products"] });
  };

  const addWaste = async () => {
    if (!w.item_name.trim()) { toast.error("أدخل اسم الصنف"); return; }
    const { data: user } = await supabase.auth.getUser();
    const { error } = await supabase.from("waste").insert({
      item_name: w.item_name.trim(),
      quantity: num(w.quantity),
      unit: w.unit,
      unit_cost: num(w.unit_cost),
      loss_amount: num(w.quantity) * num(w.unit_cost),
      reason: w.reason || null,
      created_by: user.user?.id ?? null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("تم تسجيل الهالك");
    setW({ item_name: "", quantity: 0, unit: SALE_UNITS[0]!, unit_cost: 0, reason: "" });
    qc.invalidateQueries({ queryKey: ["waste"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
  };

  return (
    <AppShell title="المخزون والهالك" subtitle="الأصناف والأسعار والتالف">
      <div className="mb-4">
        <ProductUnitsManager />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border bg-card p-4">
          <h2 className="mb-3 font-bold">إضافة صنف</h2>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>الاسم</Label>
              <Input value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>الوحدة</Label>
              <select
                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                value={p.unit}
                onChange={(e) => setP({ ...p, unit: e.target.value })}
              >
                {SALE_UNITS.map((u) => (
                  <option key={u}>{u}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>سعر التكلفة</Label>
              <Input type="number" value={p.cost_price} onChange={(e) => setP({ ...p, cost_price: num(e.target.value) })} />
            </div>
            <div className="space-y-1.5">
              <Label>سعر البيع</Label>
              <Input type="number" value={p.sale_price} onChange={(e) => setP({ ...p, sale_price: num(e.target.value) })} />
            </div>
            <div className="space-y-1.5">
              <Label>الكمية</Label>
              <Input type="number" value={p.stock_qty} onChange={(e) => setP({ ...p, stock_qty: num(e.target.value) })} />
            </div>
          </div>
          <Button className="mt-3" onClick={addProduct}>
            حفظ الصنف
          </Button>
        </div>

        <div className="rounded-xl border bg-card p-4">
          <h2 className="mb-3 font-bold">تسجيل هالك</h2>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>الصنف</Label>
              <Input
                list="waste-products"
                value={w.item_name}
                onChange={(e) => {
                  const prod = products?.find((x) => x.name === e.target.value);
                  setW({
                    ...w,
                    item_name: e.target.value,
                    unit_cost: prod ? Number(prod.cost_price) : w.unit_cost,
                    unit: prod?.unit ?? w.unit,
                  });
                }}
              />
              <datalist id="waste-products">
                {(products ?? []).map((x) => (
                  <option key={x.id} value={x.name} />
                ))}
              </datalist>
            </div>
            <div className="space-y-1.5">
              <Label>الكمية</Label>
              <Input type="number" value={w.quantity} onChange={(e) => setW({ ...w, quantity: num(e.target.value) })} />
            </div>
            <div className="space-y-1.5">
              <Label>تكلفة الوحدة</Label>
              <Input type="number" value={w.unit_cost} onChange={(e) => setW({ ...w, unit_cost: num(e.target.value) })} />
            </div>
            <div className="space-y-1.5">
              <Label>السبب</Label>
              <Input value={w.reason} onChange={(e) => setW({ ...w, reason: e.target.value })} />
            </div>
          </div>
          <Button className="mt-3" onClick={addWaste}>
            حفظ الهالك
          </Button>
        </div>
      </div>

      <h2 className="mt-6 mb-2 text-base font-bold">الأصناف</h2>
      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs">
            <tr>
              <th className="p-2 text-right">الصنف</th>
              <th className="p-2 text-right">الوحدة</th>
              <th className="p-2 text-right">التكلفة</th>
              <th className="p-2 text-right">البيع</th>
              <th className="p-2 text-right">المخزون</th>
            </tr>
          </thead>
          <tbody>
            {(products ?? []).map((x) => (
              <tr key={x.id} className="border-t">
                <td className="p-2">{x.name}</td>
                <td className="p-2">{x.unit}</td>
                <td className="p-2">{money(x.cost_price)}</td>
                <td className="p-2">{money(x.sale_price)}</td>
                <td className="p-2">{x.stock_qty}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="mt-6 mb-2 text-base font-bold">سجل الهالك</h2>
      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs">
            <tr>
              <th className="p-2 text-right">التاريخ</th>
              <th className="p-2 text-right">الصنف</th>
              <th className="p-2 text-right">الكمية</th>
              <th className="p-2 text-right">الخسارة</th>
            </tr>
          </thead>
          <tbody>
            {(waste ?? []).map((x) => (
              <tr key={x.id} className="border-t">
                <td className="p-2">{dateOnly(x.waste_date)}</td>
                <td className="p-2">{x.item_name}</td>
                <td className="p-2">
                  {x.quantity} {x.unit}
                </td>
                <td className="p-2 text-destructive">{money(x.loss_amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
