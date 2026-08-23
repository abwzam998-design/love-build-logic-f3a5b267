import { money, dateTime } from "./format";

export type InvoiceDocItem = {
  item_name: string;
  quantity: number | string;
  unit: string;
  unit_price: number | string;
  discount: number | string;
  line_total: number | string;
};

export type InvoiceDoc = {
  invoice_no: string;
  customer_name: string;
  customer_phone?: string | null;
  invoice_date: string;
  payment_type: string;
  total: number | string;
  paid: number | string;
  discount?: number | string;
  notes?: string | null;
  items: InvoiceDocItem[];
};

export type BusinessInfo = {
  business: string;
  currency: string;
  phone?: string | null;
  address?: string | null;
};

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

export function invoiceHtml(inv: InvoiceDoc, biz: BusinessInfo) {
  const remaining = Number(inv.total) - Number(inv.paid);
  const rows = inv.items
    .map(
      (it, idx) => `<tr>
        <td>${idx + 1}</td>
        <td>${esc(it.item_name)}</td>
        <td>${Number(it.quantity)}</td>
        <td>${esc(it.unit)}</td>
        <td>${money(it.unit_price)}</td>
        <td>${money(it.discount)}</td>
        <td>${money(it.line_total)}</td>
      </tr>`,
    )
    .join("");

  return `<!doctype html>
<html dir="rtl" lang="ar"><head><meta charset="utf-8" />
<title>فاتورة ${esc(inv.invoice_no)}</title>
<style>
  *{box-sizing:border-box}
  body{font-family:"Tahoma","Arial",sans-serif;margin:0;padding:24px;color:#111}
  .head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #111;padding-bottom:12px}
  h1{margin:0;font-size:20px}
  .muted{color:#555;font-size:12px;margin:2px 0}
  table{width:100%;border-collapse:collapse;margin-top:16px;font-size:13px}
  th,td{border:1px solid #bbb;padding:6px;text-align:right}
  th{background:#f1f1f1}
  .totals{margin-top:16px;width:280px;margin-inline-start:auto;font-size:14px}
  .totals div{display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px dashed #ccc}
  .big{font-weight:700;font-size:16px;border-bottom:none}
  .foot{margin-top:28px;text-align:center;font-size:12px;color:#666}
  @media print{body{padding:0}}
</style></head>
<body>
  <div class="head">
    <div>
      <h1>${esc(biz.business)}</h1>
      ${biz.phone ? `<p class="muted">هاتف: ${esc(biz.phone)}</p>` : ""}
      ${biz.address ? `<p class="muted">${esc(biz.address)}</p>` : ""}
    </div>
    <div style="text-align:left">
      <h1>فاتورة مبيعات</h1>
      <p class="muted">رقم: ${esc(inv.invoice_no)}</p>
      <p class="muted">التاريخ: ${dateTime(inv.invoice_date)}</p>
      <p class="muted">نوع الدفع: ${esc(inv.payment_type)}</p>
    </div>
  </div>

  <p style="margin-top:14px"><b>العميل:</b> ${esc(inv.customer_name)}${
    inv.customer_phone ? ` — ${esc(inv.customer_phone)}` : ""
  }</p>

  <table>
    <thead><tr><th>#</th><th>الصنف</th><th>الكمية</th><th>الوحدة</th><th>السعر</th><th>الخصم</th><th>الإجمالي</th></tr></thead>
    <tbody>${rows || `<tr><td colspan="7">لا توجد أصناف</td></tr>`}</tbody>
  </table>

  <div class="totals">
    <div><span>الإجمالي</span><span>${money(inv.total)} ${esc(biz.currency)}</span></div>
    <div><span>الخصم</span><span>${money(inv.discount ?? 0)} ${esc(biz.currency)}</span></div>
    <div><span>المدفوع</span><span>${money(inv.paid)} ${esc(biz.currency)}</span></div>
    <div class="big"><span>المتبقي</span><span>${money(remaining)} ${esc(biz.currency)}</span></div>
  </div>

  ${inv.notes ? `<p class="muted" style="margin-top:12px">ملاحظات: ${esc(inv.notes)}</p>` : ""}
  <p class="foot">شكراً لتعاملكم معنا — ${esc(biz.business)}</p>
  <script>window.onload = () => { window.focus(); window.print(); };<\/script>
</body></html>`;
}

/** يفتح الفاتورة في نافذة طباعة لحفظها كملف PDF */
export function printInvoicePdf(inv: InvoiceDoc, biz: BusinessInfo) {
  const w = window.open("", "_blank");
  if (!w) return false;
  w.document.write(invoiceHtml(inv, biz));
  w.document.close();
  return true;
}

/** نص الفاتورة الكامل لإرساله عبر واتساب */
export function invoiceText(inv: InvoiceDoc, biz: BusinessInfo) {
  const remaining = Number(inv.total) - Number(inv.paid);
  const lines = inv.items
    .map(
      (it, i) =>
        `${i + 1}. ${it.item_name} — ${Number(it.quantity)} ${it.unit} × ${money(it.unit_price)} = ${money(
          it.line_total,
        )}`,
    )
    .join("\n");
  return [
    `*${biz.business}*`,
    `فاتورة رقم: ${inv.invoice_no}`,
    `التاريخ: ${dateTime(inv.invoice_date)}`,
    `العميل: ${inv.customer_name}`,
    "",
    "*الأصناف:*",
    lines || "-",
    "",
    `الإجمالي: ${money(inv.total)} ${biz.currency}`,
    `الخصم: ${money(inv.discount ?? 0)} ${biz.currency}`,
    `المدفوع: ${money(inv.paid)} ${biz.currency}`,
    `المتبقي: ${money(remaining)} ${biz.currency}`,
    "",
    "شكراً لتعاملكم معنا 🌟",
  ].join("\n");
}
