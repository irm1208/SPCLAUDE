import React, { useState, useEffect } from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { useLocation } from "wouter";
import { ArrowLeft, User, Home, FlaskConical, Calculator } from "lucide-react";

const SESSION_KEY = "peps:portal_session";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const Button = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'destructive' | 'outline' | 'ghost', size?: 'sm' | 'md' | 'lg' | 'icon' }>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    const variants = {
      primary: "bg-primary text-primary-foreground shadow-sm hover:opacity-90 active:scale-[0.98]",
      secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 active:scale-[0.98]",
      destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 active:scale-[0.98]",
      outline: "border-2 border-input bg-card hover:bg-accent hover:text-accent-foreground active:scale-[0.98]",
      ghost: "hover:bg-accent hover:text-accent-foreground active:scale-[0.98]",
    };
    const sizes = {
      sm: "h-9 px-4 text-sm rounded-lg",
      md: "h-11 px-5 py-2 rounded-xl font-medium text-sm",
      lg: "h-14 px-8 py-3 rounded-xl text-base font-semibold",
      icon: "h-10 w-10 flex items-center justify-center rounded-xl",
    };

    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap transition-all duration-150 disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-xl border border-border bg-card text-card-foreground shadow-sm",
        className
      )}
      {...props}
    />
  )
);
Card.displayName = "Card";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      className={cn(
        "flex h-11 w-full rounded-xl border border-input bg-background px-4 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      ref={ref}
      {...props}
    />
  )
);
Input.displayName = "Input";

export const Label = React.forwardRef<HTMLLabelElement, React.LabelHTMLAttributes<HTMLLabelElement>>(
  ({ className, ...props }, ref) => (
    <label ref={ref} className={cn("text-sm font-semibold leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-foreground", className)} {...props} />
  )
);
Label.displayName = "Label";


function AccountButton() {
  const [, setLocation] = useLocation();
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    const check = () => setLoggedIn(!!localStorage.getItem(SESSION_KEY));
    check();
    window.addEventListener("storage", check);
    return () => window.removeEventListener("storage", check);
  }, []);

  return (
    <button
      onClick={() => setLocation("/account")}
      title={loggedIn ? "My Account" : "Sign in"}
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-colors"
      style={loggedIn
        ? { background: "var(--t-blue-25)", color: "#93C5FD" }
        : { background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)" }}
    >
      <User className="w-3.5 h-3.5" />
      {loggedIn ? "Account" : "Login"}
    </button>
  );
}

const DESKTOP_TABS = [
  { id: "home", label: "Home", icon: Home, path: "/" },
  { id: "protocols", label: "Protocols", icon: FlaskConical, path: "/protocols" },
  { id: "calculator", label: "Calc", icon: Calculator, path: "/calculator" },
];

export const TopNav = ({ title, showBack = false, active }: { title?: string, showBack?: boolean, active?: string }) => {
  const [location, setLocation] = useLocation();

  return (
    <header className="sticky top-0 z-40 w-full" style={{ background: "var(--t-bg)" }}>
      <div className="flex h-14 items-center px-4 max-w-5xl mx-auto gap-3">
        {showBack ? (
          <button
            onClick={() => setLocation("/")}
            className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/10 shrink-0 hover:bg-white/15 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-white" />
          </button>
        ) : null}
        <h1 className="text-sm font-bold text-white truncate shrink-0">
          {title || "Salt & Peps"}
        </h1>

        <nav className="hidden md:flex items-center gap-1 flex-1 ml-2">
          {DESKTOP_TABS.map(tab => {
            const isActive = active ? active === tab.id : location === tab.path;
            return (
              <button
                key={tab.id}
                onClick={() => setLocation(tab.path)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                style={isActive
                  ? { background: "var(--t-blue-25)", color: "#93C5FD" }
                  : { color: "rgba(255,255,255,0.55)" }}
              >
                <tab.icon className="w-3.5 h-3.5" strokeWidth={isActive ? 2.5 : 2} />
                {tab.label}
              </button>
            );
          })}
        </nav>

        <div className="flex items-center gap-2 ml-auto">
          <AccountButton />
        </div>
      </div>
    </header>
  );
};
