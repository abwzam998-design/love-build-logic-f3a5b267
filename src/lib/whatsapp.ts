import { money, dateOnly } from "./format";

export type MessageVars = {
  name: string;
  amount: number;
  total?: number;
  paid?: number;
  invoice?: string;
  date?: string | Date;
  currency: string;
  business: string;
};

export function buildMessage(template: string, v: MessageVars) {
  return template
    .replaceAll("{name}", v.name)
    .replaceAll("{amount}", money(v.amount))
    .replaceAll("{total}", money(v.total ?? 0))
    .replaceAll("{paid}", money(v.paid ?? 0))
    .replaceAll("{invoice}", v.invoice ?? "")
    .replaceAll("{date}", v.date ? dateOnly(v.date) : "")
    .replaceAll("{currency}", v.currency)
    .replaceAll("{business}", v.business);
}

export function normalizePhone(phone: string | null | undefined) {
  if (!phone) return "";
  return phone.replace(/[^\d]/g, "").replace(/^00/, "");
}

export function openWhatsApp(phone: string | null | undefined, message: string) {
  const p = normalizePhone(phone);
  const url = p
    ? `https://wa.me/${p}?text=${encodeURIComponent(message)}`
    : `https://wa.me/?text=${encodeURIComponent(message)}`;
  window.open(url, "_blank", "noopener");
}

export function openSMS(phone: string | null | undefined, message: string) {
  const p = normalizePhone(phone);
  const url = `sms:${p ? `+${p}` : ""}?&body=${encodeURIComponent(message)}`;
  window.location.href = url;
}
