/** تحويل رقم الجوال إلى بريد داخلي يستخدمه النظام للدخول */
export function phoneDigits(phone: string) {
  return (phone || "").replace(/[^\d]/g, "").replace(/^00/, "");
}

export function phoneToEmail(phone: string) {
  return `p${phoneDigits(phone)}@moathsoft.app`;
}

export function loginIdentifierToEmail(value: string) {
  const v = value.trim();
  return v.includes("@") ? v.toLowerCase() : phoneToEmail(v);
}

export function randomPassword() {
  return `tmp-${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 6)}`;
}
