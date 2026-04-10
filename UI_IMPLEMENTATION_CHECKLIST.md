# UI Implementation Checklist - Stocker

## 🎯 Overview

This checklist provides specific, actionable changes to transform Stocker's UI from "espantosa" to professional quality matching Supabase, Linear, Vercel, Stripe, and Notion.

---

## 📋 Phase 1: Foundation (Critical)

### 1.1 Update `globals.css` ✅ HIGH PRIORITY

**File:** `src/app/globals.css`

**Current Issues:**
- Plain gradient background (lines 6-8)
- Basic RGB colors
- No design tokens

**New Implementation:**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* Background - Dark theme default */
    --background: 0 0% 3.5%;           /* #09090b */
    --foreground: 0 0% 95%;           /* #f2f2f2 */
    
    /* Cards & Popovers */
    --card: 0 0% 5%;                  /* #0d0d0d */
    --card-foreground: 0 0% 95%;
    --popover: 0 0% 6%;               /* #0f0f0f */
    --popover-foreground: 0 0% 95%;
    
    /* Primary - Emerald for inventory theme */
    --primary: 152 69% 45%;           /* #10b981 */
    --primary-foreground: 0 0% 100%;
    
    /* Secondary */
    --secondary: 0 0% 10%;            /* #1a1a1a */
    --secondary-foreground: 0 0% 90%;
    
    /* Muted */
    --muted: 0 0% 12%;                /* #1f1f1f */
    --muted-foreground: 0 0% 60%;
    
    /* Accent */
    --accent: 0 0% 14%;               /* #242424 */
    --accent-foreground:  0% 90%;
    
    /* Borders */
    --border: 0 0% 15%;               /* #262626 */
    --input: 0 0% 15%;
    --ring: 152 69% 45%;
    
    /* Destructive */
    --destructive: 0 72% 51%;         /* #dc2626 */
    --destructive-foreground: 0 0% 100%;
    
    /* Radius */
    --radius: 0.75rem;
    
    /* Sidebar */
    --sidebar-background: 0 0% 4%;
    --sidebar-foreground: 0 0% 95%;
    --sidebar-primary: 152 69% 45%;
    --sidebar-primary-foreground: 0 0% 100%;
    --sidebar-accent: 0 0% 10%;
    --sidebar-accent-foreground: 0 0% 90%;
    --sidebar-border: 0 0% 12%;
  }

  /* Light mode */
  .light {
    --background: 0 0% 99%;
    --foreground: 0 0% 9%;
    --card: 0 0% 100%;
    --card-foreground: 0 0% 9%;
    --popover: 0 0% 100%;
    --popover-foreground: 0 0% 9%;
    --primary: 152 69% 40%;
    --primary-foreground: 0 0% 100%;
    --secondary: 0 0% 96%;
    --secondary-foreground: 0 0% 15%;
    --muted: 0 0% 96%;
    --muted-foreground: 0 0% 45%;
    --accent: 0 0% 94%;
    --accent-foreground: 0 0% 15%;
    --border: 0 0% 90%;
    --input: 0 0% 90%;
    --ring: 152 69% 40%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  
  body {
    @apply bg-background text-foreground antialiased;
    font-feature-settings: "rlig" 1, "calt" 1;
  }
}
```

### 1.2 Add Inter Font ✅ HIGH PRIORITY

**File:** `src/app/layout.tsx`

Add Inter font import:

```tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ 
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Stocker - Sistema de Gestión de Inventario",
  description: "Gestión de inventario para restaurantes y comercios",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="dark">
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
```

### 1.3 Update `tailwind.config.ts` ✅ HIGH PRIORITY

Add sidebar theme tokens:

```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
```

---

## 📋 Phase 2: Login Page (Critical)

### 2.1 Complete Rewrite of Login Layout ✅ HIGH PRIORITY

**File:** `src/app/(auth)/layout.tsx`

```tsx
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login - Stocker",
  description: "Iniciar sesión en Stocker - Sistema de Gestión de Inventario",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex">
      {/* Left side - Branding (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-emerald-600 via-emerald-700 to-zinc-900 overflow-hidden">
        {/* Abstract pattern overlay */}
        <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-5" />
        
        {/* Floating gradient orbs */}
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-emerald-400/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
        
        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center items-center p-12 text-white">
          <div className="mb-8">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm">
              <Package className="h-8 w-8 text-white" />
            </div>
          </div>
          
          <h1 className="text-4xl font-bold text-center mb-4">
            Gestiona tu inventario con inteligencia
          </h1>
          
          <p className="text-emerald-100 text-center max-w-md text-lg">
            Stocker te ayuda a mantener control total de tu inventario, 
            ventas y pedidos en un solo lugar.
          </p>
          
          {/* Feature highlights */}
          <div className="mt-12 grid gap-4 max-w-md">
            {[
              { icon: BarChart3, text: "Métricas en tiempo real" },
              { icon: Package, text: "Control de inventario" },
              { icon: Users, text: "Gestión multi-sucursal" },
            ].map((feature, i) => (
              <div key={i} className="flex items-center gap-3 text-emerald-100">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">
                  <feature.icon className="h-4 w-4" />
                </div>
                <span>{feature.text}</span>
              </div>
            ))}
          </div>
          
          {/* Testimonial */}
          <div className="mt-12 p-6 bg-white/10 backdrop-blur-sm rounded-2xl max-w-md">
            <p className="text-sm italic text-emerald-50 leading-relaxed">
              "Stocker redujo mis pérdidas de inventario en un 40%. 
              La interfaz es tan intuitiva que mi equipo aprendió en minutos."
            </p>
            <p className="text-xs mt-3 text-emerald-200">
              — María García, Restaurante El Buen Sabor
            </p>
          </div>
        </div>
      </div>
      
      {/* Right side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden mb-8 flex flex-col items-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary mb-4">
              <Package className="h-6 w-6 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Stocker</h1>
          </div>
          
          {children}
        </div>
      </div>
    </div>
  );
}

// Import icons
import { Package, BarChart3, Users } from "lucide-react";
```

### 2.2 Complete Rewrite of Login Page ✅ HIGH PRIORITY

**File:** `src/app/(auth)/login/page.tsx`

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/providers/AuthProvider";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter, CardHeader, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const { t } = useI18n();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await login(email, password);
      router.push("/");
    } catch (err) {
      setError(t("auth.loginError"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="border-0 shadow-2xl bg-card">
      <CardHeader className="space-y-1 pb-4">
        <CardTitle className="text-2xl font-bold tracking-tight">
          {t("auth.loginTitle")}
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          Ingresa tus credenciales para acceder a tu cuenta
        </CardDescription>
      </CardHeader>
      
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg">
              {error}
            </div>
          )}
          
          {/* Social Auth Buttons */}
          <div className="space-y-3">
            <Button 
              type="button" 
              variant="outline" 
              className="w-full bg-background hover:bg-accent/50 transition-colors"
              disabled={isLoading}
            >
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"
                />
              </svg>
              Continue with GitHub
            </Button>
          </div>
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">
                {t("auth.orContinueWith")}
              </span>
            </div>
          </div>
          
          {/* Email/Password Fields */}
          <div className="space-y-2">
            <Label htmlFor="email">{t("auth.email")}</Label>
            <Input
              id="email"
              type="email"
              placeholder="nombre@empresa.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
              className="bg-background"
            />
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">{t("auth.password")}</Label>
              <Link
                href="/forgot-password"
                className="text-xs text-primary hover:underline"
              >
                {t("auth.forgotPassword")}
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
              className="bg-background"
            />
          </div>
          
          <Button 
            type="submit" 
            className="w-full bg-primary hover:bg-primary/90" 
            disabled={isLoading}
          >
            {isLoading ? t("common.loading") : t("auth.login")}
          </Button>
        </CardContent>
        
        <CardFooter className="flex flex-col gap-4 pt-0">
          <p className="text-sm text-muted-foreground text-center">
            {t("auth.noAccount")}{" "}
            <Link href="/register" className="text-primary hover:underline font-medium">
              {t("auth.register")}
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
```

---

## 📋 Phase 3: Sidebar Improvements

### 3.1 Update Sidebar Styles ✅ HIGH PRIORITY

**File:** `src/components/layout/Sidebar.tsx`

Key changes:
1. Darker background (`bg-sidebar`)
2. Refined hover states
3. Better active state highlighting
4. Improved spacing

**Changes needed:**

```tsx
// Line 115-117: Update container classes
<aside
  className={cn(
    "flex h-screen flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300 ease-in-out",
    collapsed ? "w-[68px]" : "w-[260px]"
  )}
>

// Line 122-129: Update logo link
<Link 
  href="/" 
  className={cn(
    "flex items-center gap-2 transition-opacity",
    collapsed && "opacity-0 pointer-events-none"
  )}
>
  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
    <Box className="h-4 w-4 text-primary-foreground" />
  </div>
  {!collapsed && <span className="text-lg font-bold text-foreground">Stocker</span>}
</Link>

// Line 179-191: Update nav link styles
<Link
  key={item.key}
  href={getNavHref(item.key)}
  className={cn(
    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150",
    active
      ? "bg-primary text-primary-foreground shadow-sm"
      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground hover:translate-x-0.5",
    collapsed && "justify-center px-2"
  )}
  title={collapsed ? t(`nav.${item.key}`) : undefined}
>
  <Icon className="h-5 w-5 shrink-0" />
  {!collapsed && (
    <span className="truncate">{t(`nav.${item.key}`)}</span>
  )}
</Link>

// Line 248-259: Update user section
{user && !collapsed && (
  <div className="mb-2 rounded-lg bg-muted/50 px-3 py-2">
    <div className="font-medium text-sm text-foreground truncate">
      {user.name}
    </div>
    <div className="text-xs text-muted-foreground">
      {t(`roles.${role}`)}
    </div>
  </div>
)}
```

---

## 📋 Phase 4: Card & Dashboard Improvements

### 4.1 Update Card Component ✅ MEDIUM PRIORITY

**File:** `src/components/ui/card.tsx`

Add subtle shadow and hover states:

```tsx
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { hoverable?: boolean }
>(({ className, hoverable = false, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-lg border border-border bg-card text-card-foreground shadow-sm",
      hoverable && "transition-shadow hover:shadow-md cursor-pointer",
      className
    )}
    {...props}
  />
));
Card.displayName = "Card";

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
));
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
));
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
));
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
));
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
```

### 4.2 Update MetricCard ✅ MEDIUM PRIORITY

**File:** `src/components/dashboard/MetricCard.tsx`

```tsx
"use client";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    type: "increase" | "decrease" | "neutral";
    label?: string;
  };
  icon: LucideIcon;
  iconColor?: string;
  className?: string;
}

export function MetricCard({
  title,
  value,
  change,
  icon: Icon,
  iconColor = "text-primary",
  className,
}: MetricCardProps) {
  const TrendIcon = change?.type === "increase" 
    ? TrendingUp 
    : change?.type === "decrease" 
      ? TrendingDown 
      : Minus;

  const trendColor = change?.type === "increase"
    ? "text-emerald-500"
    : change?.type === "decrease"
      ? "text-red-500"
      : "text-muted-foreground";

  return (
    <Card className={cn("relative overflow-hidden", className)}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-2xl font-bold tracking-tight">{value}</h3>
              {change && (
                <div className={cn("flex items-center gap-1 text-xs", trendColor)}>
                  <TrendIcon className="h-3 w-3" />
                  <span>{Math.abs(change.value)}%</span>
                </div>
              )}
            </div>
            {change?.label && (
              <p className="text-xs text-muted-foreground">{change.label}</p>
            )}
          </div>
          <div className="rounded-lg bg-primary/10 p-2.5">
            <Icon className={cn("h-5 w-5", iconColor)} />
          </div>
        </div>
        
        {/* Subtle gradient accent */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
      </CardContent>
    </Card>
  );
}
```

---

## 📋 Phase 5: Typography & Polish

### 5.1 Add Separator Component ✅ LOW PRIORITY

**File:** `src/components/ui/separator.tsx`

```tsx
"use client";

import * as React from "react";
import * as SeparatorPrimitive from "@radix-ui/react-separator";
import { cn } from "@/lib/utils";

const Separator = React.forwardRef<
  React.ElementRef<typeof SeparatorPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SeparatorPrimitive.Root>
>(
  (
    { className, orientation = "horizontal", decorative = true, ...props },
    ref
  ) => (
    <SeparatorPrimitive.Root
      ref={ref}
      decorative={decorative}
      orientation={orientation}
      className={cn(
        "shrink-0 bg-border",
        orientation === "horizontal" ? "h-[1px] w-full" : "h-full w-[1px]",
        className
      )}
      {...props}
    />
  )
);
Separator.displayName = SeparatorPrimitive.Root.displayName;

export { Separator };
```

---

## ✅ Quick Win Checklist

### Immediate (Do First)
- [ ] Update `globals.css` with new color palette
- [ ] Add Inter font to `layout.tsx`
- [ ] Rewrite auth layout with split hero
- [ ] Rewrite login page with social auth buttons
- [ ] Update sidebar background and hover states

### Short-term (This Week)
- [ ] Update card component with subtle shadows
- [ ] Add Separator component
- [ ] Improve MetricCard styling
- [ ] Add dark mode toggle (optional)

### Long-term (Next Sprint)
- [ ] Add micro-interactions
- [ ] Implement toast notifications
- [ ] Add empty state illustrations
- [ ] Polish tables and forms

---

## 📝 Notes

### Key Differences from Current Implementation

1. **Background**: Replace gradient with solid dark color (`#09090b`)
2. **Login**: Split hero layout with illustration/testimonial side
3. **Colors**: Emerald primary (inventory theme) instead of generic blue
4. **Shadows**: Subtle, refined shadows instead of none
5. **Borders**: Barely visible borders (`#262626`)

### Design Philosophy

- **Less is More**: Remove visual noise
- **Dark by Default**: Professional, modern
- **Subtle Depth**: Shadows and borders sparingly
- **Purposeful Color**: Primary only for actions/active states

---

_Document created: January 21, 2025_
_Last updated: Ready for implementation_