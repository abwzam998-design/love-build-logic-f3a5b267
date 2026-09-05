import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type OwnerRole = "system_owner" | "manager" | "seller" | "customer";

export type OwnerAccount = {
  id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  is_active: boolean;
  is_approved: boolean;
  subscription_status: string;
  trial_ends_at: string | null;
  owner_note: string | null;
  created_at: string;
  roles: OwnerRole[];
  is_owner: boolean;
};

export type OwnerOverview = {
  accounts: OwnerAccount[];
  stats: {
    users: number;
    pending: number;
    suspended: number;
    customers: number;
    suppliers: number;
    employees: number;
    invoices: number;
  };
};

async function assertOwner(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("is_system_owner" as any);
  if (error || !data) throw new Error("Forbidden");
}

async function guardTarget(admin: any, userId: string) {
  const { data } = await admin
    .from("profiles")
    .select("email")
    .eq("id", userId)
    .maybeSingle();
  return String((data as any)?.email ?? "").toLowerCase() === "math77@gmail.com";
}

export const getOwnerOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<OwnerOverview> => {
    await assertOwner(context as any);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [{ data: profiles }, { data: roles }, { data: entities }, { count: invoices }] =
      await Promise.all([
        supabaseAdmin
          .from("profiles")
          .select(
            "id, full_name, phone, email, is_active, is_approved, subscription_status, trial_ends_at, owner_note, created_at",
          )
          .order("created_at", { ascending: false }),
        supabaseAdmin.from("user_roles").select("user_id, role"),
        supabaseAdmin.from("entities").select("kind"),
        supabaseAdmin.from("invoices").select("id", { count: "exact", head: true }),
      ]);

    const accounts: OwnerAccount[] = ((profiles ?? []) as any[]).map((p) => {
      const list = ((roles ?? []) as any[])
        .filter((r) => r.user_id === p.id)
        .map((r) => r.role as OwnerRole);
      return {
        ...p,
        roles: list,
        is_owner:
          list.includes("system_owner") ||
          String(p.email ?? "").toLowerCase() === "math77@gmail.com",
      } as OwnerAccount;
    });

    const kinds = ((entities ?? []) as any[]).map((e) => e.kind);
    return {
      accounts,
      stats: {
        users: accounts.length,
        pending: accounts.filter((a) => !a.is_approved).length,
        suspended: accounts.filter((a) => a.is_approved && !a.is_active).length,
        customers: kinds.filter((k) => k === "customer").length,
        suppliers: kinds.filter((k) => k === "supplier").length,
        employees: kinds.filter((k) => k === "employee").length,
        invoices: invoices ?? 0,
      },
    };
  });

export const ownerSetRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string; role: OwnerRole }) => {
    if (!input?.userId) throw new Error("userId مطلوب");
    if (!["system_owner", "manager", "seller", "customer"].includes(input.role))
      throw new Error("نوع غير صالح");
    return input;
  })
  .handler(async ({ data, context }) => {
    await assertOwner(context as any);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (await guardTarget(supabaseAdmin, data.userId)) throw new Error("لا يمكن تعديل حساب المالك");
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId);
    const { error } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: data.userId, role: data.role as any });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const ownerSetAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { userId: string; approved?: boolean; active?: boolean; note?: string }) => {
      if (!input?.userId) throw new Error("userId مطلوب");
      return input;
    },
  )
  .handler(async ({ data, context }) => {
    await assertOwner(context as any);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (await guardTarget(supabaseAdmin, data.userId)) throw new Error("لا يمكن تعديل حساب المالك");
    const update: Record<string, unknown> = {};
    if (typeof data.approved === "boolean") update["is_approved"] = data.approved;
    if (typeof data.active === "boolean") update["is_active"] = data.active;
    if (typeof data.note === "string") update["owner_note"] = data.note;
    const { error } = await supabaseAdmin.from("profiles").update(update).eq("id", data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const ownerSetSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { userId: string; status: "trial" | "active" | "suspended"; trialDays?: number }) => {
      if (!input?.userId) throw new Error("userId مطلوب");
      if (!["trial", "active", "suspended"].includes(input.status)) throw new Error("حالة غير صالحة");
      return input;
    },
  )
  .handler(async ({ data, context }) => {
    await assertOwner(context as any);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (await guardTarget(supabaseAdmin, data.userId)) throw new Error("لا يمكن تعديل حساب المالك");

    const update: Record<string, unknown> = { subscription_status: data.status };
    if (data.status === "trial") {
      const days = Math.max(1, Math.min(365, Number(data.trialDays || 14)));
      update["trial_ends_at"] = new Date(Date.now() + days * 86400000).toISOString();
      update["is_active"] = true;
    } else if (data.status === "active") {
      update["trial_ends_at"] = null;
      update["is_active"] = true;
    } else {
      update["is_active"] = false;
    }
    const { error } = await supabaseAdmin.from("profiles").update(update).eq("id", data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const ownerSetPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string; password: string }) => {
    if (!input?.password || input.password.length < 6) throw new Error("كلمة المرور قصيرة");
    return input;
  })
  .handler(async ({ data, context }) => {
    await assertOwner(context as any);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (await guardTarget(supabaseAdmin, data.userId)) throw new Error("لا يمكن تعديل حساب المالك");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      password: data.password,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
