import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { money, todayISO } from "@/lib/format";
import { useProducts } from "@/hooks/useAppData";
import { Upload } from "lucide-react";

export type DayItemRow = {
  item_name: string;
  sale_kind: string | null;
  unit: string | null;
  quantity: number;
  total: number;
  cost: number;
  profit: number;
};

export function DailySalesSummary() {
  const qc = useQueryClient();
  const day = todayISO();
  const { data: products } = useProducts();

  const { data: rows } = useQuery({
    queryKey: ["daily-items", day],
    queryFn: async () => {
      const { data: invs, error } = await supabase
        .from("invoices")
        .select("id")
        .gte("invoice_date", day)
        .lte("invoice_date", `${day}T23:59:59`);
      if (error) throw error;
      const ids = (invs ?? []).map((i) => i.id);
      if (!ids.length) return [] as DayItemRow[];
      const { data: items, error: e2 } = await supabase
        .from("invoice_items")
        .select("*")
        .in("invoice_id", ids);
      if (e2) throw e2;
      const map = new Map<string, DayItemRow>();
      for (const it of items ?? []) {
        const cost =
          Number(
            (products ?? []).find((p) => p.id === it.product_id || p.name === it.item_name)
              ?.cost_price ?? 0,
          ) * Number(it.quantity);
        const cur =
          map.get(it.item_name) ??
          ({
            item_name: it.item_name,
            sale_kind: it.sale_kind,
            unit: it.unit,
            quantity: 0,
            total: 0,
            cost: 0,
            profit: 0,
          } as DayItemRow);
        cur.quantity += Number(it.quantity);
        cur.total += Number(it.line_total);
        cur.cost += cost;
        cur.profit = cur.total - cur.cost;
        map.set(it.item_name, cur);
      }
      return [...map.values()].sort((a, b) => b.total - a.total);
    },
  });

  const { data: posted } = useQuery({
    queryKey: ["daily-postings", day],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("daily_postings")
        .select("*")
        .eq("post_date", day);
      if (error) throw error;
      return data ?? [];
    },
  });

  const post = async (list: DayItemRow[]) => {
    if (!list.length) { toast.error("لا توجد مبيعات لترحيلها"); return; }
    const { data: user } = await supabase.auth.getUser();
    const { error } = await supabase.from("daily_postings").upsert(
      list.map((r) => ({
        post_date: day,
        item_name: r.item_name,
        sale_kind: r.sale_kind,
        unit: r.unit,
        quantity: r.quantity,
        total: r.total,
        cost: r.cost,
        profit: r.profit,
        created_by: user.user?.id ?? null,
      })),
      { onConflict: "post_date,item_name" },
    );
    if (error) { toast.error(error.message); return; }
    toast.success("تم الترحيل إلى دفتر الأستاذ");
    qc.invalidateQueries({ queryKey: ["daily-postings"] });
  };

  const isPosted = (name: string) => (posted ?? []).some((p: any) => p.item_name === name);
  const totals = (rows ?? []).reduce(
    (a, r) => ({ total: a.total + r.total, profit: a.profit + r.profit }),
    { total: 0, profit: 0 },
  );

  return (
    <div className="mt-6 rounded-xl border bg-card p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-bold">مبيعات اليوم حسب الصنف</h2>
          <p className="text-xs text-muted-foreground">
            الإجمالي {money(totals.total)} · الربح التقديري {money(totals.profit)}
          </p>
        </div>
        <Button onClick={() => post(rows ?? [])}>
          <Upload className="size-4" /> ترحيل كل الأصناف
        </Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs">
            <tr>
              <th className="p-2 text-right">الصنف</th>
              <th className="p-2 text-right">الكمية</th>
              <th className="p-2 text-right">الإجمالي</th>
              <th className="p-2 text-right">الربح</th>
              <th className="p-2 text-right">ترحيل</th>
            </tr>
          </thead>
          <tbody>
            {(rows ?? []).map((r) => (
              <tr key={r.item_name} className="border-t">
                <td className="p-2 font-medium">{r.item_name}</td>
                <td className="p-2">
                  {r.quantity} {r.unit ?? ""}
                </td>
                <td className="p-2">{money(r.total)}</td>
                <td className="p-2">{money(r.profit)}</td>
                <td className="p-2">
                  <Button
                    variant={isPosted(r.item_name) ? "outline" : "default"}
                    size="sm"
                    onClick={() => post([r])}
                  >
                    {isPosted(r.item_name) ? "مُرحّل - تحديث" : "ترحيل"}
                  </Button>
                </td>
              </tr>
            ))}
            {!rows?.length && (
              <tr>
                <td className="p-3 text-muted-foreground" colSpan={5}>
                  لا توجد مبيعات اليوم.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
