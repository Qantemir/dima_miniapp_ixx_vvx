import * as React from "react";

import { cn } from "@/lib/utils";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, style, readOnly, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      style={{
        fontSize: '16px', // Предотвращает зум на iOS (минимум 16px)
        WebkitAppearance: 'none', // Убирает стили iOS
        WebkitTapHighlightColor: 'transparent', // Убирает подсветку при тапе на iOS
        ...style,
      }}
      ref={ref}
      // Явно разрешаем ввод на мобильных устройствах
      inputMode="text"
      autoComplete="off"
      readOnly={readOnly} // Явно передаем readOnly, если не передан - undefined (разрешено)
      // Гарантируем, что элемент может получить фокус
      tabIndex={readOnly ? -1 : 0}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
