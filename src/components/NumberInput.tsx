import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Props = Omit<React.ComponentProps<"input">, "value" | "onChange" | "type"> & {
  value: number;
  onValueChange: (n: number) => void;
  min?: number;
  max?: number;
  decimals?: number;
  allowNegative?: boolean;
};

/** حقل رقمي: يسمح بالكسور العشرية، يمنع الحروف والقيم غير الصحيحة، ويحدد الرقم عند التركيز */
export const NumberInput = React.forwardRef<HTMLInputElement, Props>(
  (
    {
      value,
      onValueChange,
      min = 0,
      max,
      decimals = 3,
      allowNegative = false,
      className,
      onBlur,
      onFocus,
      ...rest
    },
    ref,
  ) => {
    const [text, setText] = React.useState<string>(() => (value === 0 ? "" : String(value)));
    const [focused, setFocused] = React.useState(false);

    React.useEffect(() => {
      if (!focused) setText(value === 0 ? "" : String(value));
    }, [value, focused]);

    const pattern = React.useMemo(
      () =>
        new RegExp(
          `^${allowNegative ? "-?" : ""}\\d*${decimals > 0 ? `(\\.\\d{0,${decimals}})?` : ""}$`,
        ),
      [allowNegative, decimals],
    );

    const clamp = (n: number) => {
      let v = n;
      if (min !== undefined && v < min) v = min;
      if (max !== undefined && v > max) v = max;
      return v;
    };

    return (
      <Input
        ref={ref}
        type="text"
        inputMode={decimals > 0 ? "decimal" : "numeric"}
        dir="ltr"
        className={cn("text-right", className)}
        value={text}
        onFocus={(e) => {
          setFocused(true);
          e.currentTarget.select();
          onFocus?.(e);
        }}
        onChange={(e) => {
          const raw = e.target.value.replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
            .replace(/[،,]/g, ".")
            .trim();
          if (raw === "" ) { setText(""); onValueChange(0); return; }
          if (!pattern.test(raw)) return;
          setText(raw);
          const n = Number(raw);
          if (Number.isFinite(n)) onValueChange(n);
        }}
        onBlur={(e) => {
          setFocused(false);
          const n = Number(text);
          const safe = Number.isFinite(n) ? clamp(n) : min ?? 0;
          setText(safe === 0 ? "" : String(safe));
          onValueChange(safe);
          onBlur?.(e);
        }}
        {...rest}
      />
    );
  },
);

NumberInput.displayName = "NumberInput";
