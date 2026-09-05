import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell, StatCard } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useMyProfile } from "@/hooks/useAppData";
import { money } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/my-account")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "حسابي | معاذ سوفت" },
      {
        name: "description",
        content: "كشف حسابك الشخصي: فواتيرك، مدفوعاتك، والمبلغ المتبقي عليك.",
      },
      { property: "og:title", content: "حسابي | معاذ سوفت" },
      { property: "og:description", content: "اطّلع على فواتيرك ومدفوعاتك ورصيدك المتبقي." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MyAccountPage,
});

function MyAccountPage() {
  const { data: profile } = useMyProfile();
  const entityId = (profile as { entity_id?: string | null } | null | undefined)?.entity_id ?? null;

  const { data, isLoading } = useQuery({
    queryKey: ["my-account", entityId],
    enabled: !!entityId,
    queryFn: async () => {
      const [{ data: invoices }, { data: payments }] = await Promise.all([
        supabase
          .from("invoices")
          .select("id, invoice_no, invoice_date, total, paid")
          .eq("entity_id", entityId!)
          .order("invoice_date", { ascending: false }),
        supabase
          .from("payments")
          .select("id, amount, paid_at, notes")
          .eq("entity_id", entityId!)
          .order("paid_at", { ascending: false }),
      ]);
      return { invoices: invoices ?? [], payments: payments ?? [] };
    },
  });

  const invoices = data?.invoices ?? [];
  const total = invoices.reduce((a, i) => a + Number(i.total), 0);
  const paid = invoices.reduce((a, i) => a + Number(i.paid), 0);

  return (
    <AppShell title="حسابي" subtitle="كشف حسابك الشخصي">
      {!entityId ? (
        <div className="rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground">
          لم يتم ربط حسابك بملف عميل بعد. يرجى التواصل مع الإدارة.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            <StatCard label="إجمالي المشتريات" value={money(total)} />
            <StatCard label="المدفوع" value={money(paid)} tone="good" />
            <StatCard label="المتبقي" value={money(total - paid)} tone="bad" />
          </div>

          <h2 className="mt-6 mb-2 text-sm font-bold">فواتيري</h2>
          <div className="space-y-2">
            {isLoading && <p className="text-sm text-muted-foreground">جارِ التحميل…</p>}
            {invoices.map((i) => (
              <div
                key={i.id}
                className="flex items-center justify-between rounded-xl border bg-card p-3 text-sm shadow-card"
              >
                <div>
                  <p className="font-bold">{i.invoice_no}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(i.invoice_date).toLocaleDateString("ar")}
                  </p>
                </div>
                <div className="text-left">
                  <p className="font-bold tabular-nums">{money(Number(i.total))}</p>
                  <p className="text-xs text-muted-foreground tabular-nums">
                    متبقي {money(Number(i.total) - Number(i.paid))}
                  </p>
                </div>
              </div>
            ))}
            {!isLoading && !invoices.length && (
              <p className="text-sm text-muted-foreground">لا توجد فواتير.</p>
            )}
          </div>

          <h2 className="mt-6 mb-2 text-sm font-bold">سنداتي</h2>
          <div className="space-y-2">
            {(data?.payments ?? []).map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-xl border bg-card p-3 text-sm shadow-card"
              >
                <span className="text-xs text-muted-foreground">
                  {new Date(p.paid_at).toLocaleDateString("ar")}
                </span>
                <span className="font-bold tabular-nums text-primary">{money(Number(p.amount))}</span>
              </div>
            ))}
            {!(data?.payments ?? []).length && (
              <p className="text-sm text-muted-foreground">لا توجد سندات.</p>
            )}
          </div>
        </>
      )}
    </AppShell>
  );
}
