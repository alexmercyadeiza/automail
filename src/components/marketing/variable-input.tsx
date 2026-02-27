import { useMemo } from "react";

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  id?: string;
  className?: string;
};

export default function VariableInput({
  value,
  onChange,
  placeholder,
  required,
  id,
  className,
}: Props) {
  const highlighted = useMemo(() => {
    if (!value) return null;

    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    const regex = /\{[a-zA-Z_]+\}/g;

    for (const match of value.matchAll(regex)) {
      if (match.index === undefined) continue;

      if (match.index > lastIndex) {
        parts.push(
          <span key={`text-${lastIndex}`}>
            {value.slice(lastIndex, match.index)}
          </span>,
        );
      }

      parts.push(
        <span
          key={`var-${match.index}`}
          className="rounded bg-purple-100 px-1 py-0.5 font-medium text-purple-600"
        >
          {match[0]}
        </span>,
      );

      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < value.length) {
      parts.push(
        <span key={`text-${lastIndex}`}>{value.slice(lastIndex)}</span>,
      );
    }

    return parts;
  }, [value]);

  return (
    <div className={`relative ${className ?? ""}`}>
      {value && (
        <div className="pointer-events-none absolute inset-0 px-3 py-2 text-sm text-neutral-900 whitespace-pre-wrap wrap-break-word">
          {highlighted}
        </div>
      )}
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        id={id}
        className="w-full bg-transparent px-3 py-2 text-sm text-neutral-900 focus:outline-none"
        style={{
          color: value ? "transparent" : undefined,
          caretColor: "#111",
        }}
      />
    </div>
  );
}
