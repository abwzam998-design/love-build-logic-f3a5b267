import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useRole, useSettings } from "@/hooks/useAppData";

export const Route = createFileRoute("/_authenticated/settings")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "الإعدادات | نظام إدارة المبيعات والمخزون" },
      { name: "description", content: "بيانات المحل والعملة وقوالب رسائل الواتساب للمطالبات وكشوف الحساب." },
      { property: "og:title", content: "الإعدادات | نظام إدارة المبيعات والمخزون" },
      { property: "og:description", content: "بيانات المحل والعملة وقوالب رسائل الواتساب للمطالبات وكشوف الحساب." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const qc = useQueryClient();
  const { isManager } = useRole();
  const { data } = useSettings();
  const [form, setForm] = useState({
    business_name: "",
    phone: "",
    address: "",
    currency: "",
    debt_message_template: "",
    statement_message_template: "",
  });

  useEffect(() => {
    if (data) {
      setForm({
        business_name: data.business_name ?? "",
        phone: data.phone ?? "",
        address: data.address ?? "",
        currency: data.currency ?? "",
        debt_message_template: data.debt_message_template ?? "",
        statement_message_template: data.statement_message_template ?? "",
      });
    }
  }, [data]);

  const save = async () => {
    if (!data?.id) { toast.error("لا توجد إعدادات للتعديل"); return; }
    const { error } = await supabase.from("settings").update(form).eq("id", data.id);
    if (error) { toast.error(error.message); return; }
    toast.success("تم حفظ الإعدادات");
    qc.invalidateQueries({ queryKey: ["settings"] });
  };

  return (
    <AppShell title="الإعدادات" subtitle="بيانات المحل وقوالب الرسائل">
      <div className="max-w-2xl space-y-4 rounded-xl border bg-card p-4">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label>اسم المحل</Label>
            <Input
              value={form.business_name}
              disabled={!isManager}
              onChange={(e) => setForm({ ...form, business_name: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>الجوال</Label>
            <Input value={form.phone} disabled={!isManager} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>العنوان</Label>
            <Input value={form.address} disabled={!isManager} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>العملة</Label>
            <Input value={form.currency} disabled={!isManager} onChange={(e) => setForm({ ...form, currency: e.target.value })} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>قالب رسالة المطالبة</Label>
          <Textarea
            rows={4}
            value={form.debt_message_template}
            disabled={!isManager}
            onChange={(e) => setForm({ ...form, debt_message_template: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label>قالب كشف الحساب</Label>
          <Textarea
            rows={4}
            value={form.statement_message_template}
            disabled={!isManager}
            onChange={(e) => setForm({ ...form, statement_message_template: e.target.value })}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          المتغيرات المتاحة: {"{name}"} {"{amount}"} {"{total}"} {"{paid}"} {"{invoice}"} {"{date}"} {"{currency}"}{" "}
          {"{business}"}
        </p>
        {isManager && <Button onClick={save}>حفظ الإعدادات</Button>}
      </div>
    </AppShell>
  );
}
