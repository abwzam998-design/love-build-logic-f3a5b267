import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NumberInput } from "@/components/NumberInput";
import { money, num, SALE_KINDS } from "@/lib/format";
import {
  RETAIL_UNIT_PRESETS,
  WHOLESALE_UNIT_PRESETS,
  useProducts,
  useProductUnits,
} from "@/hooks/useAppData";
import { Trash2 } from "lucide-react";

export function ProductUnitsManager() {
  const qc = useQueryClient();
  const { data: products } = useProducts();
  const [productId, setProductId] = useState<string>("");
  const { data: units } = useProductUnits(productId || null);
  const [form, setForm] = useState({
    sale_kind: "تجزئة",
    name: "كيلو",
    factor: 1,
    cost_price: 0,
    sale_price: 0,
  });

  const presets = form.sale_kind === "جملة" ? WHOLESALE_UNIT_PRESETS : RETAIL_UNIT_PRESETS;

  const add = async () => {
    if (!productId) { toast.error("اختر الصنف أولاً"); return; }
    if (!form.name.trim()) { toast.error("أدخل اسم الوحدة"); return; }
    const { error } = await supabase.from("product_units").insert({
      product_id: productId,
      sale_kind: form.sale_kind,
      name: form.name.trim(),
      factor: num(form.factor) || 1,
      cost_price: num(form.cost_price),
      sale_price: num(form.sale_price),
    });
    if (error) { toast.error(error.message); return; }
    toast.success("تمت إضافة الوحدة");
    setForm({ ...form, name: "", factor: 1, cost_price: 0, sale_price: 0 });
    qc.invalidateQueries({ queryKey: ["product-units"] });
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("product_units").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["product-units"] });
  };

  const group = (kind: string) => (units ?? []).filter((u) => u.sale_kind === kind);

  return (
    <div className="rounded-xl border bg-card p-4">
      <h2 className="mb-3 font-bold">وحدات الصنف (تجزئة / جملة)</h2>
      <div className="space-y-1.5">
        <Label>الصنف</Label>
        <select
          className="h-9 w-full rounded-md border bg-background px-3 text-sm"
          value={productId}
          onChange={(e) => setProductId(e.target.value)}
        >
          <option value="">اختر الصنف…</option>
          {(products ?? []).map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {productId && (
        <>
          <div className="mt-3 grid gap-3 md:grid-cols-5">
            <div className="space-y-1.5">
              <Label>القسم</Label>
              <select
                className="h-9 w-full rounded-md border bg-background px-2 text-sm"
                value={form.sale_kind}
                onChange={(e) =>
                  setForm({
                    ...form,
                    sale_kind: e.target.value,
                    name:
                      (e.target.value === "جملة" ? WHOLESALE_UNIT_PRESETS : RETAIL_UNIT_PRESETS)[0]!,
                  })
                }
              >
                {SALE_KINDS.map((k) => (
                  <option key={k}>{k}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>الوحدة</Label>
              <Input
                list="unit-presets"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              <datalist id="unit-presets">
                {presets.map((u) => (
                  <option key={u} value={u} />
                ))}
              </datalist>
            </div>
            <div className="space-y-1.5">
              <Label>المعامل (بالكيلو)</Label>
              <NumberInput
                value={form.factor}
                onValueChange={(n) => setForm({ ...form, factor: n })}
                min={0}
                decimals={3}
              />
            </div>
            <div className="space-y-1.5">
              <Label>التكلفة</Label>
              <NumberInput
                value={form.cost_price}
                onValueChange={(n) => setForm({ ...form, cost_price: n })}
                min={0}
                decimals={2}
              />
            </div>
            <div className="space-y-1.5">
              <Label>سعر البيع</Label>
              <NumberInput
                value={form.sale_price}
                onValueChange={(n) => setForm({ ...form, sale_price: n })}
                min={0}
                decimals={2}
              />
            </div>
          </div>
          <Button className="mt-3" onClick={add}>
            إضافة الوحدة
          </Button>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {SALE_KINDS.map((k) => (
              <div key={k} className="rounded-lg border p-3">
                <p className="mb-2 text-sm font-bold">{k}</p>
                {group(k).length === 0 && (
                  <p className="text-xs text-muted-foreground">لا توجد وحدات.</p>
                )}
                {group(k).map((u) => (
                  <div key={u.id} className="flex items-center justify-between gap-2 border-b py-1.5 text-sm last:border-0">
                    <span className="font-medium">{u.name}</span>
                    <span className="text-xs text-muted-foreground">
                      بيع {money(u.sale_price)} · تكلفة {money(u.cost_price)}
                    </span>
                    <Button variant="ghost" size="icon" onClick={() => remove(u.id)}>
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
