import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useCurrentUser() {
  return useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data.user ?? null;
    },
  });
}

export function useRole() {
  const { data: user } = useCurrentUser();
  const query = useQuery({
    queryKey: ["role", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id);
      if (error) throw error;
      return (data ?? []).map((r) => r.role as string);
    },
  });
  const roles = query.data ?? [];
  return { roles, isManager: roles.includes("manager"), isLoading: query.isLoading, user };
}

export function useSettings() {
  return useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("settings").select("*").limit(1).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useProducts() {
  return useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function nextRef(prefix: string) {
  const d = new Date();
  const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(
    d.getDate(),
  ).padStart(2, "0")}-${String(d.getHours()).padStart(2, "0")}${String(d.getMinutes()).padStart(
    2,
    "0",
  )}${String(d.getSeconds()).padStart(2, "0")}`;
  return `${prefix}-${stamp}`;
}

export const SUPER_ADMIN_EMAIL = "math77@gmail.com";

export function useMyProfile() {
  const { data: user } = useCurrentUser();
  return useQuery({
    queryKey: ["my-profile", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useIsSuperAdmin() {
  const { data: user } = useCurrentUser();
  return (user?.email ?? "").toLowerCase() === SUPER_ADMIN_EMAIL;
}

/** مالك المنصة: البريد الشخصي أو دور system_owner */
export function useIsOwner() {
  const { roles, user } = useRole();
  return (
    (user?.email ?? "").toLowerCase() === SUPER_ADMIN_EMAIL || roles.includes("system_owner")
  );
}


export type EntityKind = "customer" | "supplier" | "employee";

export type Entity = {
  id: string;
  kind: string;
  name: string;
  phone: string | null;
  notes: string | null;
  opening_balance: number;
  credit_limit: number;
  is_active: boolean;
  created_at: string;
};

/** رصيد العميل الحالي (المتبقي عليه) */
export async function customerOutstanding(entityId: string) {
  const { data: ent } = await supabase
    .from("entities")
    .select("opening_balance, credit_limit, name, phone")
    .eq("id", entityId)
    .maybeSingle();
  const { data: invs } = await supabase
    .from("invoices")
    .select("total, paid")
    .eq("entity_id", entityId);
  const unpaid = (invs ?? []).reduce((a, i) => a + Number(i.total) - Number(i.paid), 0);
  return {
    balance: Number(ent?.opening_balance ?? 0) + unpaid,
    creditLimit: Number((ent as any)?.credit_limit ?? 0),
    name: ent?.name ?? "",
    phone: (ent?.phone as string | null) ?? null,
  };
}


export const ENTITY_KINDS: { value: EntityKind; label: string }[] = [
  { value: "customer", label: "عميل" },
  { value: "supplier", label: "مورد" },
  { value: "employee", label: "موظف" },
];

export const entityKindLabel = (k: string) =>
  ENTITY_KINDS.find((x) => x.value === k)?.label ?? k;

export function useEntities(kind?: EntityKind) {
  return useQuery({
    queryKey: ["entities", kind ?? "all"],
    queryFn: async () => {
      let q = supabase.from("entities").select("*").order("name");
      if (kind) q = q.eq("kind", kind);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as Entity[];
    },
  });
}

/** يعيد معرّف الحساب، وينشئه إن لم يكن موجوداً */
export async function ensureEntity(kind: EntityKind, name: string, phone?: string | null) {
  const clean = name.trim();
  if (!clean) return null;
  const { data: found } = await supabase
    .from("entities")
    .select("id")
    .eq("kind", kind)
    .ilike("name", clean)
    .limit(1)
    .maybeSingle();
  if (found?.id) {
    if (phone?.trim()) await supabase.from("entities").update({ phone: phone.trim() }).eq("id", found.id);
    return found.id as string;
  }
  const { data: created, error } = await supabase
    .from("entities")
    .insert({ kind, name: clean, phone: phone?.trim() || null })
    .select("id")
    .single();
  if (error) throw error;
  return created.id as string;
}

/** وحدات البيع الجاهزة لكل نوع معاملة */
export const RETAIL_UNIT_PRESETS = ["كيلو", "نص كيلو", "ربع كيلو", "5 كيلو", "حبة"];
export const WHOLESALE_UNIT_PRESETS = ["سلة", "كرتون", "طرد", "خيشة", "صندوق"];

export type ProductUnit = {
  id: string;
  product_id: string;
  sale_kind: string;
  name: string;
  factor: number;
  cost_price: number;
  sale_price: number;
  is_active: boolean;
};

export function useProductUnits(productId?: string | null) {
  return useQuery({
    queryKey: ["product-units", productId ?? "all"],
    queryFn: async () => {
      let q = supabase.from("product_units").select("*").order("sale_kind").order("name");
      if (productId) q = q.eq("product_id", productId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as ProductUnit[];
    },
  });
}
