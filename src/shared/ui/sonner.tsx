"use client";

import * as React from "react";
import { Toaster as Sonner, type ToasterProps } from "sonner";

/**
 * Toaster compatible con CRA/Vite (sin next-themes).
 * - Si detecta "dark" en <html class="dark"> usa theme="dark"
 * - Si no, usa theme="light"
 */
const Toaster = (props: ToasterProps) => {
  const [theme, setTheme] = React.useState<ToasterProps["theme"]>("light");

  React.useEffect(() => {
    const root = document.documentElement;

    const compute = () => {
      const isDark = root.classList.contains("dark");
      setTheme(isDark ? "dark" : "light");
    };

    compute();

    // Observa cambios de clase en <html> para actualizar theme automático
    const observer = new MutationObserver(compute);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });

    return () => observer.disconnect();
  }, []);

  return (
    <Sonner
      theme={theme}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-white group-[.toaster]:text-slate-900 group-[.toaster]:border-slate-200 group-[.toaster]:shadow-lg " +
            "dark:group-[.toaster]:bg-slate-900 dark:group-[.toaster]:text-slate-50 dark:group-[.toaster]:border-slate-700",
          description:
            "group-[.toast]:text-slate-600 dark:group-[.toast]:text-slate-300",
          actionButton:
            "group-[.toast]:bg-blue-600 group-[.toast]:text-white",
          cancelButton:
            "group-[.toast]:bg-slate-100 group-[.toast]:text-slate-900 dark:group-[.toast]:bg-slate-800 dark:group-[.toast]:text-slate-50",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
