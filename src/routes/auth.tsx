import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import logo from "@/assets/moath-soft-logo.png";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "تسجيل الدخول | نظام إدارة المبيعات والمخزون" },
      {
        name: "description",
        content: "سجّل الدخول لإدارة المبيعات والمشتريات والديون والمخزون ومتابعة الأرباح يومياً.",
      },
      { property: "og:title", content: "تسجيل الدخول | نظام إدارة المبيعات والمخزون" },
      {
        property: "og:description",
        content: "نظام متكامل لإدارة فواتير الجملة والتجزئة والديون ورسائل المطالبة عبر واتساب.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [accountType, setAccountType] = useState<"manager" | "seller">("seller");
  const [loading, setLoading] = useState(false);
  const [reset, setReset] = useState<null | "request" | "verify" | "password">(null);
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    navigate({ to: "/dashboard" });
  };

  const signUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: fullName, phone, role: accountType },
      },
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("تم إنشاء الحساب، يمكنك الدخول الآن");
    navigate({ to: "/dashboard" });
  };

  const sendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("تم إرسال رمز التحقق إلى بريدك");
    setReset("verify");
  };

  const verifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({ email, token: otp.trim(), type: "email" });
    setLoading(false);
    if (error) { toast.error("رمز غير صحيح أو منتهي"); return; }
    setReset("password");
  };

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("تم تحديث كلمة المرور");
    navigate({ to: "/dashboard" });
  };

  const google = async () => {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) { toast.error("تعذر تسجيل الدخول عبر جوجل"); return; }
    if (result.redirected) return;
    navigate({ to: "/dashboard" });
  };



  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-lg">
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
            <TabsTrigger value="signup">حساب جديد</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <form onSubmit={signIn} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="email">البريد الإلكتروني</Label>
                <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">كلمة المرور</Label>
                <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                تسجيل الدخول
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="signup">
            <form onSubmit={signUp} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="name">الاسم الكامل</Label>
                <Input id="name" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email2">البريد الإلكتروني</Label>
                <Input id="email2" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password2">كلمة المرور</Label>
                <Input id="password2" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>نوع الحساب</Label>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { v: "manager", t: "مدير", d: "كل الصلاحيات" },
                    { v: "seller", t: "كاشير", d: "المبيعات فقط" },
                  ] as const).map((o) => (
                    <button
                      key={o.v}
                      type="button"
                      onClick={() => setAccountType(o.v)}
                      className={
                        "rounded-lg border p-2.5 text-right transition-colors " +
                        (accountType === o.v
                          ? "border-primary bg-primary/10"
                          : "hover:bg-accent")
                      }
                    >
                      <span className="block text-sm font-semibold">{o.t}</span>
                      <span className="block text-xs text-muted-foreground">{o.d}</span>
                    </button>
                  ))}
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                إنشاء الحساب
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                حساب المدير يصل للأرباح والأسعار والمصروفات، والكاشير للمبيعات فقط
              </p>

            </form>
          </TabsContent>
        </Tabs>

        <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" /> أو <span className="h-px flex-1 bg-border" />
        </div>
        <Button variant="outline" className="w-full" onClick={google}>
          المتابعة عبر حساب جوجل
        </Button>
      </div>
    </div>
  );
}
