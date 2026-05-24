import { forwardRef } from "react";
import { sanitizePhone } from "@/lib/utils";

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "type" | "value"> & {
  value: string;
  onChange: (v: string) => void;
};

/**
 * Input global para celular / teléfono.
 * Bloquea letras y caracteres no telefónicos al tipear o pegar.
 */
export const PhoneInput = forwardRef<HTMLInputElement, Props>(function PhoneInput(
  { value, onChange, onPaste, className, placeholder, ...rest },
  ref,
) {
  return (
    <input
      ref={ref}
      type="tel"
      inputMode="tel"
      autoComplete="tel"
      value={value ?? ""}
      placeholder={placeholder ?? "Número de celular"}
      onChange={(e) => onChange(sanitizePhone(e.target.value))}
      onPaste={(e) => {
        const text = e.clipboardData.getData("text");
        const cleaned = sanitizePhone(text);
        if (cleaned !== text) {
          e.preventDefault();
          const input = e.currentTarget;
          const start = input.selectionStart ?? value.length;
          const end = input.selectionEnd ?? value.length;
          const next = value.slice(0, start) + cleaned + value.slice(end);
          onChange(sanitizePhone(next));
        }
        onPaste?.(e);
      }}
      className={className}
      {...rest}
    />
  );
});
