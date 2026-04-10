# Implementation Guide - Stocker UI

> 🚀 **Guía de implementación inmediata** para transformar la UI de Stocker.

---

## 📋 Prioridad de Implementación

### FASE 1: Foundation (1-2 días) ✅ CRÍTICO

#### 1.1 Actualizar `globals.css`
```bash
# Ubicación: src/app/globals.css
```

**Cambios:**
- Reemplazar paleta de colores con la refinada
- Añadir CSS variables para tema oscuro
- Configurar Inter font family
- Añadir shadows y transitions

#### 1.2 Actualizar `tailwind.config.js`
```javascript
// Añadir configuración de tema
module.exports = {
  theme: {
    extend: {
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        // ... resto de colores
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
}
```

#### 1.3 Instalar dependencias
```bash
npm install lucide-react @radix-ui/react-collapsible class-variance-authority clsx tailwind-merge
```

---

### FASE 2: Components (2-3 días)

#### 2.1 KPICard Component
**Ubicación:** `src/components/dashboard/KPICard.tsx`

**Uso:**
```tsx
<KPICard
  title="Total Sales"
  value="$12,450"
  icon={<TrendingUp className="h-5 w-5" />}
  trend={{ value: 12, isPositive: true }}
  subtitle="from last month"
/>
```

**Características:**
- Hover con elevación sutil
- Gradiente overlay en hover
- Icono con fondo brand-subtle
- Trend con colores de estado

#### 2.2 SidebarNavItem Component
**Ubicación:** `src/components/layout/SidebarNavItem.tsx`

**Características:**
- Active state con background brand
- Hover con translateX(2px)
- Soporte para collapsed state
- Icono + label

#### 2.3 DataTable Component
**Ubicación:** `src/components/dashboard/DataTable.tsx`

**Características:**
- Header con background surface
- Hover states en rows
- Bordes refinados
- Paginación integrada

---

### FASE 3: Pages (2-3 días)

#### 3.1 Login Page Redesign
**Ubicación:** `src/app/(auth)/login/page.tsx`

**Layout:**
```
┌─────────────────────────────────────────────────────────────────┐
│                    [Logo]                                       │
├─────────────────────────┬───────────────────────────────────────┤
│                         │                                       │
│   BRANDING SIDE         │         FORM SIDE                     │
│   (50% width)           │         (50% width)                    │
│                         │                                       │
│   - Gradient background │   - Dark card                         │
│   - Abstract pattern    │   - Social auth buttons               │
│   - Testimonial         │   - Email/password inputs             │
│   - Tagline             │   - Sign in button                    │
│                         │   - Links                             │
│                         │                                       │
└─────────────────────────┴───────────────────────────────────────┘
```

**Implementación:**
```tsx
// Login page structure
<div className="min-h-screen bg-background flex">
  {/* Left: Branding */}
  <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-emerald-600 via-emerald-700 to-zinc-900 relative overflow-hidden">
    <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-10" />
    <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-emerald-400/10 rounded-full blur-3xl" />
    <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
    <div className="relative z-10 flex flex-col justify-center items-center p-12 text-white">
      <Logo className="h-12 w-12 mb-8" />
      <h2 className="text-3xl font-bold text-center mb-4">
        Gestiona tu inventario con inteligencia
      </h2>
      <p className="text-emerald-100 text-center max-w-md mb-8">
        Stocker te ayuda a mantener control total de tu inventario, ventas y pedidos en un solo lugar.
      </p>
      <div className="p-6 bg-white/10 backdrop-blur-sm rounded-2xl max-w-md">
        <p className="text-sm italic text-emerald-50">
          "Stocker redujo mis pérdidas de inventario en un 40%."
        </p>
        <p className="text-xs mt-2 text-emerald-200">— María García, Restaurante El Buen Sabor</p>
      </div>
    </div>
  </div>
  
  {/* Right: Form */}
  <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
    <Card className="w-full max-w-sm border-0 shadow-2xl bg-card">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">Welcome back</CardTitle>
        <CardDescription>Sign in to your account</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Social auth buttons */}
        <Button variant="outline" className="w-full">
          <Github className="mr-2 h-4 w-4" />
          Continue with GitHub
        </Button>
        <Button variant="outline" className="w-full">
          <Google className="mr-2 h-4 w-4" />
          Continue with Google
        </Button>
        
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">or</span>
          </div>
        </div>
        
        {/* Email/Password form */}
        <LoginForm />
      </CardContent>
    </Card>
  </div>
</div>
```

#### 3.2 Dashboard Page Layout
**Ubicación:** `src/app/(dashboard)/dashboard/page.tsx`

**Layout:**
```tsx
<div className="flex h-screen bg-background">
  <Sidebar />
  <main className="flex-1 overflow-y-auto">
    <Header />
    <div className="p-6 space-y-6">
      {/* Page Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Overview of your inventory</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Product
        </Button>
      </div>
      
      {/* KPI Cards Grid */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        <KPICard title="Total Sales" value="$12,450" icon={<TrendingUp />} trend={{ value: 12, isPositive: true }} />
        <KPICard title="Revenue" value="$8,230" icon={<DollarSign />} trend={{ value: 8, isPositive: true }} />
        <KPICard title="Products" value="234" icon={<Package />} trend={{ value: 3, isPositive: true }} />
        <KPICard title="Low Stock" value="5" icon={<AlertTriangle />} subtitle="items need attention" />
      </div>
      
      {/* Charts & Tables */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Sales Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <SalesChart />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <OrdersTable />
          </CardContent>
        </Card>
      </div>
    </div>
  </main>
</div>
```

---

### FASE 4: Polish (1-2 días)

#### 4.1 Micro-interactions
- Añadir hover states a todos los botones
- Añadir transiciones suaves (150-300ms)
- Implementar loading skeletons
- Añadir focus states para accesibilidad

#### 4.2 Dark/Light Mode Toggle
```tsx
// components/ThemeToggle.tsx
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
    >
      {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </Button>
  )
}
```

---

## 🎨 Paleta de Colores (Copy-Paste Ready)

### globals.css
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* Dark theme (default) */
    --background: 0 0% 3.5%;
    --foreground: 0 0% 95%;
    --card: 0 0% 5%;
    --card-foreground: 0 0% 95%;
    --popover: 0 0% 6%;
    --popover-foreground: 0 0% 95%;
    --primary: 152 69% 45%;
    --primary-foreground: 0 0% 100%;
    --secondary: 0 0% 10%;
    --secondary-foreground: 0 0% 90%;
    --muted: 0 0% 12%;
    --muted-foreground: 0 0% 60%;
    --accent: 0 0% 14%;
    --accent-foreground: 0 0% 90%;
    --destructive: 0 72% 51%;
    --destructive-foreground: 0 0% 100%;
    --border: 0 0% 15%;
    --input: 0 0% 15%;
    --ring: 152 69% 45%;
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
    @apply bg-background text-foreground;
    font-feature-settings: "rlig" 1, "calt" 1;
  }
  
  html {
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
}
```

---

## 📦 Archivos a Crear/Modificar

### Crear (New Files)
```
src/
├── components/
│   ├── dashboard/
│   │   ├── KPICard.tsx
│   │   ├── DataTable.tsx
│   │   ├── SalesChart.tsx
│   │   └── RecentOrders.tsx
│   └── layout/
│       ├── Sidebar.tsx
│       ├── SidebarNavItem.tsx
│       ├── Header.tsx
│       └── ThemeToggle.tsx
```

### Modificar (Existing Files)
```
src/
├── app/
│   ├── globals.css                    ← Paleta de colores
│   ├── layout.tsx                      ← Añadir Inter font
│   └── (auth)/login/page.tsx           ← Rediseño completo
├── components/
│   └── ui/
│       ├── card.tsx                    ← Añadir shadows
│       ├── button.tsx                  ← Refinar hover states
│       └── table.tsx                   ← Refinar estilos
```

---

## 🚀 Quick Start Commands

```bash
# 1. Install dependencies
npm install lucide-react @radix-ui/react-collapsible class-variance-authority clsx tailwind-merge

# 2. Update globals.css (copy from above)
# 3. Update tailwind.config.js (add theme extensions)
# 4. Create components following the specs
# 5. Test with npm run dev
```

---

## ✅ Definition of Done

Una tarea está completa cuando:

1. **✅ Código compila** - `npm run build` sin errores
2. **✅ Tests pasan** - `npm run test` sin fallos
3. **✅ Dark theme funciona** - Visually verified
4. **✅ Responsive design** - Mobile, tablet, desktop
5. **✅ Hover states** - Smooth transitions
6. **✅ Accessibility** - Focus states, contrast ratios
7. **✅ Performance** - No unnecessary re-renders

---

_Created: January 21, 2025_
_Based on: UI_SPECS.md research_