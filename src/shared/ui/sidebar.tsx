"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { PanelLeft } from "lucide-react";

import { cn } from "../../lib/utils";
import { Button } from "./button";

type SidebarContextType = {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
};

const SidebarContext = React.createContext<SidebarContextType | null>(null);

function useSidebar() {
  const ctx = React.useContext(SidebarContext);
  if (!ctx) throw new Error("useSidebar must be used within a SidebarProvider");
  return ctx;
}

export function SidebarProvider({
  defaultOpen = true,
  children,
}: {
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(defaultOpen);
  const toggle = React.useCallback(() => setOpen((v) => !v), []);
  return (
    <SidebarContext.Provider value={{ open, setOpen, toggle }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function SidebarTrigger({
  className,
  ...props
}: React.ComponentProps<typeof Button>) {
  const { toggle } = useSidebar();
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={toggle}
      className={cn("h-10 w-10 rounded-xl", className)}
      {...props}
    >
      <PanelLeft className="h-5 w-5" />
      <span className="sr-only">Toggle Sidebar</span>
    </Button>
  );
}

const sidebarVariants = cva(
  "group/sidebar fixed inset-y-0 left-0 z-40 flex h-svh flex-col border-r bg-white transition-all duration-200",
  {
    variants: {
      size: {
        default: "w-[280px]",
        icon: "w-[76px]",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
);

export interface SidebarProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof sidebarVariants> {}

export function Sidebar({ className, size, ...props }: SidebarProps) {
  const { open } = useSidebar();
  return (
    <div
      data-state={open ? "expanded" : "collapsed"}
      className={cn(
        sidebarVariants({ size }),
        open ? "w-[280px]" : "w-[76px]",
        className
      )}
      {...props}
    />
  );
}

export function SidebarInset({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const { open } = useSidebar();

  const ml = open ? "ml-[280px]" : "ml-[76px]";

  return (
    <div
      className={cn(
        "min-h-svh min-w-0 bg-slate-50 overflow-x-hidden", // ✅ SIN w-full
        ml,
        className
      )}
      {...props}
    />
  );
}


export function SidebarHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("shrink-0", className)} {...props} />;
}

export function SidebarFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mt-auto shrink-0", className)} {...props} />;
}

export function SidebarContent({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex min-h-0 flex-1 flex-col overflow-hidden", className)} {...props} />
  );
}

export function SidebarGroup({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-2", className)} {...props} />;
}

export function SidebarGroupLabel({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-2", className)} {...props} />;
}

export function SidebarGroupContent({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("", className)} {...props} />;
}

export function SidebarMenu({
  className,
  ...props
}: React.HTMLAttributes<HTMLUListElement>) {
  return <ul className={cn("grid gap-1", className)} {...props} />;
}

export function SidebarMenuItem({
  className,
  ...props
}: React.HTMLAttributes<HTMLLIElement>) {
  return <li className={cn("", className)} {...props} />;
}

const sidebarMenuButtonVariants = cva(
  "w-full flex items-center gap-3 px-3 py-2 text-sm rounded-xl transition-colors outline-none focus-visible:ring-2 focus-visible:ring-blue-200",
  {
    variants: {
      isActive: {
        true: "bg-slate-100 text-slate-900",
        false: "text-slate-700 hover:bg-slate-50",
      },
    },
    defaultVariants: {
      isActive: false,
    },
  }
);

export interface SidebarMenuButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof sidebarMenuButtonVariants> {
  asChild?: boolean;
}

export function SidebarMenuButton({
  className,
  isActive,
  asChild,
  ...props
}: SidebarMenuButtonProps) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(sidebarMenuButtonVariants({ isActive }), className)} {...props} />;
}
