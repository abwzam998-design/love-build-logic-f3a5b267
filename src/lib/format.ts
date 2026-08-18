export const money = (n: number | string | null | undefined) =>
  Number(n ?? 0).toLocaleString("ar-EG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const dateTime = (v: string | Date) =>
  new Date(v).toLocaleString("ar-EG", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export const dateOnly = (v: string | Date) =>
  new Date(v).toLocaleDateString("ar-EG", { day: "2-digit", month: "2-digit", year: "numeric" });

export const todayISO = () => new Date().toISOString().slice(0, 10);

export const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export const SALE_UNITS = ["كجم", "خيشة", "صندوق", "حبة", "كرتون"];
export const SALE_KINDS = ["جملة", "تجزئة"];
export const PAYMENT_TYPES = ["نقدي", "آجل"];
export const EXPENSE_CATEGORIES = [
  "نقل",
  "عمالة",
  "ثلج",
  "كهرباء",
  "ماء",
  "إيجار",
  "صيانة",
  "أخرى",
];
