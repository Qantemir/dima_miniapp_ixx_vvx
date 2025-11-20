type ClassDictionary = Record<string, boolean | string | number | null | undefined>;
type ClassArray = ClassValue[];
type ClassValue = ClassArray | ClassDictionary | string | number | boolean | null | undefined;

const toValue = (input: ClassValue): string => {
  if (!input && input !== 0) {
    return "";
  }

  if (typeof input === "string" || typeof input === "number") {
    return `${input}`;
  }

  if (Array.isArray(input)) {
    return input.map(toValue).filter(Boolean).join(" ");
  }

  if (typeof input === "object") {
    return Object.entries(input as ClassDictionary)
      .filter(([, value]) => Boolean(value))
      .map(([key]) => key)
      .join(" ");
  }

  if (typeof input === "boolean") {
    return input ? "true" : "false";
  }

  return "";
};

export function clsx(...values: ClassValue[]): string {
  return values.map(toValue).filter(Boolean).join(" ").trim();
}

export default clsx;

