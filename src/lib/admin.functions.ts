import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type AppUserRole = "manager" | "seller" | "customer";

export type AdminUser = {
  id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  is_active: boolean;
  is_approved: boolean;
  entity_id: string | null;
  created_at: string;
  role: AppUserRole | null;
};

async function assertManager(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "manager",
  });
  if (error || !data) throw new Error("Forbidden");
}

export const listAppUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminUser[]> => {
    await assertManager(context as any);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profiles, error } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, phone, email, is_active, is_approved, entity_id, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const { data: roles } = await supabaseAdmin.from("user_roles").select("user_id, role");
    return (profiles ?? []).map((p: any) => ({
      ...p,
      role: (roles ?? []).find((r: any) => r.user_id === p.id)?.role ?? null,
    })) as AdminUser[];
  });

export const approveAppUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string; role: AppUserRole; password?: string }) => {
    if (!input?.userId) throw new Error("userId مطلوب");
    if (!["manager", "seller", "customer"].includes(input.role)) throw new Error("نوع غير صالح");
    if (input.password && input.password.length < 6) throw new Error("كلمة المرور قصيرة");
    return input;
  })
  .handler(async ({ data, context }) => {
    await assertManager(context as any);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (data.password) {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
        password: data.password,
      });
      if (error) throw new Error(error.message);
    }

    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId);
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: data.userId, role: data.role as any });
    if (roleError) throw new Error(roleError.message);

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, phone, entity_id")
      .eq("id", data.userId)
      .maybeSingle();

    let entityId = (profile as any)?.entity_id ?? null;
    if (data.role === "customer" && !entityId) {
      const name = (profile as any)?.full_name?.trim() || (profile as any)?.phone || "عميل";
      const { data: found } = await supabaseAdmin
        .from("entities")
        .select("id")
        .eq("kind", "customer")
        .ilike("name", name)
        .limit(1)
        .maybeSingle();
      if (found?.id) entityId = found.id;
      else {
        const { data: created, error: entError } = await supabaseAdmin
          .from("entities")
          .insert({ kind: "customer", name, phone: (profile as any)?.phone ?? null })
          .select("id")
          .single();
        if (entError) throw new Error(entError.message);
        entityId = created.id;
      }
    }

    const { error: profError } = await supabaseAdmin
      .from("profiles")
      .update({ is_approved: true, is_active: true, entity_id: entityId })
      .eq("id", data.userId);
    if (profError) throw new Error(profError.message);

    return { ok: true };
  });

export const setAppUserActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string; active: boolean }) => input)
  .handler(async ({ data, context }) => {
    await assertManager(context as any);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const update: Record<string, unknown> = { is_active: data.active };
    if (!data.active) update['is_approved'] = false;
    else update['is_approved'] = true;
    const { error } = await supabaseAdmin.from("profiles").update(update as never).eq("id", data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setAppUserPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string; password: string }) => {
    if (!input?.password || input.password.length < 6) throw new Error("كلمة المرور قصيرة");
    return input;
  })
  .handler(async ({ data, context }) => {
    await assertManager(context as any);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      password: data.password,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
