import { money, dateTime } from "./format";
import type { LedgerRow } from "./ledger";
import type { BusinessInfo } from "./invoiceDoc";

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

export type StatementInfo = {
  name: string;
  phone?: string | null;
  kindLabel: string;
  rows: LedgerRow[];
};

export function statementHtml(st: StatementInfo, biz: BusinessInfo) {
  const totalDebit = st.rows.reduce((a, r) => a + r.debit, 0);
  const totalCredit = st.rows.reduce((a, r) => a + r.credit, 0);
  const balance = totalDebit - totalCredit;

  const rows = st.rows
    .map((r) => {
      const items = (r.items ?? [])
        .map(
          (it) =>
            `<div class="it">${esc(it.item_name)} — ${Number(it.quantity)} ${esc(it.unit)} × ${money(
              it.price,
            )}${it.discount ? ` − خصم ${money(it.discount)}` : ""} = ${money(it.line_total)}</div>`,
        )
        .join("");
      return `<tr>
        <td>${dateTime(r.at)}</td>
        <td>${esc(r.desc)}${items}</td>
        <td>${r.debit ? money(r.debit) : "-"}</td>
        <td>${r.credit ? money(r.credit) : "-"}</td>
        <td>${money(Math.abs(r.balance))}</td>
      </tr>`;
    })
    .join("");

  return `<!doctype html>
<html dir="rtl" lang="ar"><head><meta charset="utf-8" />
<title>كشف حساب ${esc(st.name)}</title>
<style>
  *{box-sizing:border-box}
  body{font-family:"Tahoma","Arial",sans-serif;margin:0;padding:24px;color:#111}
  .head{display:flex;justify-content:space-between;border-bottom:2px solid #111;padding-bottom:12px}
  h1{margin:0;font-size:20px}
  .muted{color:#555;font-size:12px;margin:2px 0}
  table{width:100%;border-collapse:collapse;margin-top:16px;font-size:12px}
  th,td{border:1px solid #bbb;padding:6px;text-align:right;vertical-align:top}
  th{background:#f1f1f1}
  .it{color:#555;font-size:11px;margin-top:2px}
  .totals{margin-top:16px;width:300px;margin-inline-start:auto;font-size:14px}
  .totals div{display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px dashed #ccc}
  .big{font-weight:700;font-size:16px;border-bottom:none}
  .foot{margin-top:24px;text-align:center;font-size:12px;color:#666}
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
      <h1>كشف حساب تفصيلي</h1>
      <p class="muted">${esc(st.kindLabel)}: ${esc(st.name)}</p>
      ${st.phone ? `<p class="muted">جوال: ${esc(st.phone)}</p>` : ""}
      <p class="muted">تاريخ الطباعة: ${dateTime(new Date())}</p>
    </div>
  </div>

  <table>
    <thead><tr><th>التاريخ</th><th>البيان</th><th>مدين</th><th>الواصل</th><th>الرصيد</th></tr></thead>
    <tbody>${rows || `<tr><td colspan="5">لا توجد حركات</td></tr>`}</tbody>
  </table>

  <div class="totals">
    <div><span>إجمالي المستحق</span><span>${money(totalDebit)} ${esc(biz.currency)}</span></div>
    <div><span>إجمالي الواصل</span><span>${money(totalCredit)} ${esc(biz.currency)}</span></div>
    <div class="big"><span>${balance >= 0 ? "المتبقي عليه" : "المتبقي له"}</span><span>${money(
      Math.abs(balance),
    )} ${esc(biz.currency)}</span></div>
  </div>

  <p class="foot">شكراً لتعاملكم معنا — ${esc(biz.business)}</p>
  <script>window.onload = () => { window.focus(); window.print(); };<\/script>
</body></html>`;
}

export function printStatementPdf(st: StatementInfo, biz: BusinessInfo) {
  const w = window.open("", "_blank");
  if (!w) return false;
  w.document.write(statementHtml(st, biz));
  w.document.close();
  return true;
}

/** نص الكشف الكامل لإرساله عبر واتساب أو SMS */
export function statementText(st: StatementInfo, biz: BusinessInfo) {
  const totalDebit = st.rows.reduce((a, r) => a + r.debit, 0);
  const totalCredit = st.rows.reduce((a, r) => a + r.credit, 0);
  const balance = totalDebit - totalCredit;

  const body = st.rows
    .map((r) => {
      const head = `${dateTime(r.at)} — ${r.desc}`;
      const items = (r.items ?? [])
        .map(
          (it) =>
            `   • ${it.item_name} ${Number(it.quantity)} ${it.unit} × ${money(it.price)} = ${money(
              it.line_total,
            )}`,
        )
        .join("\n");
      const amount = r.debit
        ? `   مستحق: ${money(r.debit)} ${biz.currency}`
        : `   واصل: ${money(r.credit)} ${biz.currency}`;
      return [head, items, amount, `   الرصيد: ${money(Math.abs(r.balance))} ${biz.currency}`]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n");

  return [
    `*${biz.business}*`,
    `كشف حساب: ${st.name}`,
    `التاريخ: ${dateTime(new Date())}`,
    "",
    body || "لا توجد حركات",
    "",
    `إجمالي المستحق: ${money(totalDebit)} ${biz.currency}`,
    `إجمالي الواصل: ${money(totalCredit)} ${biz.currency}`,
    `${balance >= 0 ? "المتبقي عليكم" : "المتبقي لكم"}: ${money(Math.abs(balance))} ${biz.currency}`,
    "",
    "شكراً لتعاملكم معنا 🌟",
  ].join("\n");
}
