import type { InputHTMLAttributes, SelectHTMLAttributes, ReactNode } from "react";

interface FieldWrapperProps {
  label: string;
  htmlFor: string;
  error?: string;
  children: ReactNode;
}

export function FieldWrapper({ label, htmlFor, error, children }: FieldWrapperProps) {
  return (
    <div className="mb-4">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      {children}
      {error && <p className="text-xs text-status-disabled mt-1">{error}</p>}
    </div>
  );
}

type TextInputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
};

export function TextInput({ label, error, id, ...rest }: TextInputProps) {
  const inputId = id || label.toLowerCase().replace(/\s+/g, "-");
  return (
    <FieldWrapper label={label} htmlFor={inputId} error={error}>
      <input
        id={inputId}
        {...rest}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
      />
    </FieldWrapper>
  );
}

type SelectInputProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  error?: string;
  options: { label: string; value: string }[];
};

export function SelectInput({ label, error, id, options, ...rest }: SelectInputProps) {
  const selectId = id || label.toLowerCase().replace(/\s+/g, "-");
  return (
    <FieldWrapper label={label} htmlFor={selectId} error={error}>
      <select
        id={selectId}
        {...rest}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </FieldWrapper>
  );
}
