export type LedgerRow = {
  id: string;
  at: string;
  type: "invoice" | "purchase" | "receipt" | "opening";
  ref: string;
  desc: string;
  /** مدين: ما له علينا للمورد/الموظف أو ما عليه للعميل حسب النوع */
  debit: number;
  credit: number;
  balance: number;
  items?: {
    item_name: string;
    quantity: number;
    unit: string;
    price: number;
    discount: number;
    line_total: number;
  }[];
};

type Doc = {
  id: string;
  no: string;
  at: string;
  total: number;
  paid: number;
  discount?: number;
  notes?: string | null;
};

type Pay = {
  id: string;
  amount: number;
  paid_at: string;
  direction: string;
  receipt_no: string | null;
  method?: string | null;
  notes: string | null;
  invoice_id: string | null;
  purchase_id: string | null;
};

type Item = {
  parent_id: string;
  item_name: string;
  quantity: number;
  unit: string;
  price: number;
  discount: number;
  line_total: number;
};

/**
 * يبني كشف حساب زمني.
 * kind = customer: الفاتورة مدين، السداد دائن.
 * kind = supplier/employee: الشراء/المستحق دائن، الصرف مدين.
 */
export function buildLedger(opts: {
  kind: string;
  openingBalance?: number;
  docs: Doc[];
  payments: Pay[];
  items: Item[];
  docLabel: string;
}): LedgerRow[] {
  const { kind, openingBalance = 0, docs, payments, items, docLabel } = opts;
  const isCustomer = kind === "customer";
  const rows: LedgerRow[] = [];

  if (openingBalance) {
    rows.push({
      id: "opening",
      at: docs[0]?.at ?? new Date(0).toISOString(),
      type: "opening",
      ref: "-",
      desc: "رصيد افتتاحي",
      debit: isCustomer ? openingBalance : 0,
      credit: isCustomer ? 0 : openingBalance,
      balance: 0,
    });
  }

  for (const d of docs) {
    rows.push({
      id: d.id,
      at: d.at,
      type: isCustomer ? "invoice" : "purchase",
      ref: d.no,
      desc: `${docLabel} ${d.no}${d.discount ? ` (خصم ${d.discount})` : ""}`,
      debit: isCustomer ? d.total : 0,
      credit: isCustomer ? 0 : d.total,
      balance: 0,
      items: items
        .filter((i) => i.parent_id === d.id)
        .map((i) => ({
          item_name: i.item_name,
          quantity: Number(i.quantity),
          unit: i.unit,
          price: Number(i.price),
          discount: Number(i.discount ?? 0),
          line_total: Number(i.line_total),
        })),
    });

    // دفعة مسجّلة وقت إنشاء المستند وغير موجودة كسند مستقل
    const linked = payments
      .filter((p) => p.invoice_id === d.id || p.purchase_id === d.id)
      .reduce((a, p) => a + Number(p.amount), 0);
    const initial = Number(d.paid) - linked;
    if (initial > 0.001) {
      rows.push({
        id: `${d.id}-initial`,
        at: d.at,
        type: "receipt",
        ref: d.no,
        desc: isCustomer ? "واصل مع الفاتورة" : "مدفوع مع فاتورة الشراء",
        debit: isCustomer ? 0 : initial,
        credit: isCustomer ? initial : 0,
        balance: 0,
      });
    }
  }

  for (const p of payments) {
    const inbound = p.direction !== "out";
    rows.push({
      id: p.id,
      at: p.paid_at,
      type: "receipt",
      ref: p.receipt_no ?? "-",
      desc: `${inbound ? "سند قبض" : "سند صرف"}${p.method ? ` - ${p.method}` : ""}${
        p.notes ? ` - ${p.notes}` : ""
      }`,
      debit: inbound ? 0 : Number(p.amount),
      credit: inbound ? Number(p.amount) : 0,
      balance: 0,
    });
  }

  rows.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
  let running = 0;
  for (const r of rows) {
    running += r.debit - r.credit;
    r.balance = running;
  }
  return rows;
}
