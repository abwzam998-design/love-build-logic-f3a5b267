import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import logo from "@/assets/moath-soft-logo.png";
import { loginIdentifierToEmail, phoneToEmail, phoneDigits, randomPassword } from "@/lib/phoneAuth";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "تسجيل الدخول | نظام إدارة المبيعات والمخزون" },
      {
        name: "description",
        content: "سجّل الدخول برقم جوالك وكلمة المرور لإدارة المبيعات والديون والمخزون.",
      },
      { property: "og:title", content: "تسجيل الدخول | نظام إدارة المبيعات والمخزون" },
      {
        property: "og:description",
        content: "دخول برقم الجوال وكلمة مرور يحددها المدير، مع مراجعة طلبات التسجيل.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [signupPhone, setSignupPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const email = loginIdentifierToEmail(identifier);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setLoading(false);
      toast.error("كلمة المرور أو رقم الجوال غير صحيح. تأكد من الرمز المُسلّم لك من الإدارة.");
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("is_approved, is_active")
      .eq("id", data.user!.id)
      .maybeSingle();
    const p = profile as { is_approved?: boolean; is_active?: boolean } | null;
    if (p && (p.is_approved === false || p.is_active === false)) {
      await supabase.auth.signOut();
      setLoading(false);
      toast.error("حسابك قيد الانتظار أو تم إيقافه من قبل الإدارة. لا يمكنك الدخول إلا بموافقة المدير.");
      return;
    }

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user!.id);
    setLoading(false);
    const list = (roles ?? []).map((r) => r.role as string);
    if (list.includes("system_owner")) navigate({ to: "/owner" });
    else if (list.includes("manager") || list.includes("seller")) navigate({ to: "/dashboard" });
    else navigate({ to: "/my-account" });
  };

  const signUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phoneDigits(signupPhone).length < 7) {
      toast.error("أدخل رقم جوال صحيح");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: phoneToEmail(signupPhone),
      password: randomPassword(),
      options: { data: { full_name: fullName.trim(), phone: signupPhone.trim() } },
    });
    await supabase.auth.signOut();
    setLoading(false);
    if (error) {
      toast.error(
        error.message.toLowerCase().includes("already")
          ? "هذا الرقم مسجل مسبقاً"
          : "تعذر إرسال الطلب، حاول مرة أخرى",
      );
      return;
    }
    setSent(true);
    toast.success("تم إرسال طلب تسجيلك بنجاح");
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-sidebar px-4 py-10">
      <div className="pointer-events-none absolute -top-32 -left-32 size-96 rounded-full bg-primary/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 size-96 rounded-full bg-primary-glow/25 blur-3xl" />
      <div className="pointer-events-none absolute top-1/4 right-1/4 size-40 rounded-full bg-chart-4/20 blur-2xl" />
      <div className="relative w-full max-w-md rounded-3xl border bg-card p-6 shadow-[0_24px_60px_-16px_rgba(0,0,0,0.45)]">
        <div className="mb-6 text-center">
          <img
            src={logo}
            alt="شعار معاذ سوفت"
            width={816}
            height={816}
            className="mx-auto size-16 object-contain"
          />
          <p className="mt-2 text-sm font-bold tracking-wide text-primary">معاذ سوفت</p>
          <h1 className="mt-1 text-xl font-bold">نظام إدارة المبيعات والمخزون</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            فواتير، ديون، مصروفات، وأرباح صافية في مكان واحد
          </p>
        </div>

        <Tabs defaultValue="login">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">دخول</TabsTrigger>
            <TabsTrigger value="signup">طلب حساب جديد</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <form onSubmit={signIn} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="identifier">رقم الجوال</Label>
                <Input
                  id="identifier"
                  inputMode="tel"
                  required
                  placeholder="مثال: 7XXXXXXXX"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">كلمة المرور / رمز الدخول</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                تسجيل الدخول
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                كلمة المرور يحددها لك مدير النظام وتصلك عبر واتساب أو رسالة نصية.
              </p>
            </form>
          </TabsContent>

          <TabsContent value="signup">
            {sent ? (
              <div className="space-y-3 rounded-2xl border bg-secondary/40 p-4 text-center">
                <p className="text-sm font-bold text-primary">تم إرسال طلب تسجيلك بنجاح</p>
                <p className="text-sm text-muted-foreground">
                  سيتم مراجعة طلبك من قبل الإدارة وإرسال كلمة السر / رمز التفعيل إلى رقم هاتفك فور
                  الموافقة.
                </p>
                <Button variant="outline" className="w-full" onClick={() => setSent(false)}>
                  إرسال طلب آخر
                </Button>
              </div>
            ) : (
              <form onSubmit={signUp} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="name">الاسم الكامل</Label>
                  <Input
                    id="name"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone">رقم الجوال</Label>
                  <Input
                    id="phone"
                    inputMode="tel"
                    required
                    value={signupPhone}
                    onChange={(e) => setSignupPhone(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  إرسال طلب التسجيل
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  لا حاجة لاختيار نوع الحساب، الإدارة تحدده عند الموافقة.
                </p>
              </form>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
