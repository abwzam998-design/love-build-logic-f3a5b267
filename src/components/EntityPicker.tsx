import { useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { useEntities, type EntityKind, type Entity } from "@/hooks/useAppData";
import { cn } from "@/lib/utils";

type Props = {
  kind: EntityKind;
  name: string;
  phone: string;
  onPick: (v: { name: string; phone: string; entity: Entity | null }) => void;
  namePlaceholder?: string;
};

/** اختيار حساب مع اقتراح فوري من أول حرف */
export function EntityPicker({ kind, name, phone, onPick, namePlaceholder }: Props) {
  const { data: entities } = useEntities(kind);
  const [open, setOpen] = useState(false);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const matches = useMemo(() => {
    const q = name.trim().toLowerCase();
    const list = entities ?? [];
    if (!q) return list.slice(0, 8);
    return list
      .filter(
        (e) =>
          e.name.toLowerCase().includes(q) || (e.phone ?? "").toLowerCase().includes(q),
      )
      .slice(0, 8);
  }, [entities, name]);

  return (
    <div className="relative">
      <Input
        value={name}
        placeholder={namePlaceholder}
        autoComplete="off"
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setOpen(true);
          onPick({ name: e.target.value, phone, entity: null });
        }}
        onBlur={() => {
          blurTimer.current = setTimeout(() => setOpen(false), 150);
        }}
      />
      {open && matches.length > 0 && (
        <ul className="absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-md border bg-popover p-1 shadow-md">
          {matches.map((e) => (
            <li key={e.id}>
              <button
                type="button"
                className={cn(
                  "flex w-full items-center justify-between gap-2 rounded px-2 py-2 text-right text-sm",
                  "hover:bg-accent hover:text-accent-foreground",
                )}
                onMouseDown={(ev) => ev.preventDefault()}
                onClick={() => {
                  if (blurTimer.current) clearTimeout(blurTimer.current);
                  onPick({ name: e.name, phone: e.phone ?? "", entity: e });
                  setOpen(false);
                }}
              >
                <span className="font-medium">{e.name}</span>
                <span className="text-xs text-muted-foreground">{e.phone ?? ""}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
