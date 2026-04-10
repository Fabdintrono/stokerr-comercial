# UI Specifications - Stocker Dashboard

> 🎯 **Objective**: Transform Stocker's UI from "espantosa" to **WOW-level professional** dashboard matching the quality of Linear, Stripe, Supabase, Toast POS, and premium SaaS dashboards from Dribbble.

---

## 🔍 Research Summary (January 21, 2025)

### Dashboards Investigados

| Dashboard | URL | Key Takeaway | Screenshot |
|-----------|-----|--------------|------------|
| **Linear** | linear.app | Clean, minimal, dark theme, excellent hierarchy | `/home/fabriziodp/.openclaw/media/browser/29303747-644b-43c6-96e6-041b158012e7.jpg` |
| **Toast POS** | toasttab.com | Restaurant-focused, hero sections, trust badges | `/home/fabriziodp/.openclaw/media/browser/5c3544ae-58c0-4a51-88e0-b17720a7353e.png` |
| **Square** | squareup.com/dashboard | Clean login, professional branding | `/home/fabriziodp/.openclaw/media/browser/77fc53b8-9428-49db-8e6b-122f647003c0.png` |
| **Supabase** | supabase.com/dashboard | Modern dark theme, excellent auth flow | `/home/fabriziodp/.openclaw/media/browser/80b41a87-9526-4394-aec6-b802e3fe7c2a.png` |
| **Dribbble Inventory** | dribbble.com/search/inventory-dashboard | Grid cards, vibrant accents, clean data viz | `/home/fabriziodp/.openclaw/media/browser/47b5f32e-b81d-4479-b147-bee7558e5707.jpg` |
| **Dribbble POS Dark** | dribbble.com/search/POS-dashboard-dark-mode | Dark theme excellence, neon accents | `/home/fabriziodp/.openclaw/media/browser/7c302506-7f2f-4ec0-9c60-3105299e819b.jpg` |
| **Dribbble Restaurant** | dribbble.com/search/restaurant-management-dashboard | KPI cards, sidebar navigation, charts | `/home/fabriziodp/.openclaw/media/browser/2adef279-5bd4-41b5-bb02-80887153110f.jpg` |
| **Dribbble Warehouse** | dribbble.com/search/warehouse-management-system | Industrial feel, data tables, metrics | `/home/fabriziodp/.openclaw/media/browser/c4c52892-b864-4648-b379-501461f6fff1.jpg` |
| **Dribbble SaaS Premium** | dribbble.com/search/SaaS-dashboard-premium | Premium feel, gradients, modern components | `/home/fabriziodp/.openclaw/media/browser/daf84bb5-8739-4f8e-8a3f-5689b6d8ec67.jpg` |

## 📋 Executive Summary

After analyzing the reference UIs (Supabase, Linear, Vercel, Stripe, Notion), the key differentiators are:

| Aspect | Current Stocker | Reference Standard |
|--------|-----------------|-------------------|
| **Background** | Plain gradient | Dark/brand gradient with subtle texture |
| **Login** | Basic card, no hero | Split layout with illustration/branding |
| **Sidebar** | Functional but plain | Collapsible, elegant, refined hover states |
| **Colors** | Generic HSL tokens | Refined dark palette with brand accent |
| **Cards** | Flat | Subtle shadows, refined borders |
| **Typography** | Default | Hierarchical, Inter/SF Pro style |

---

## 🎨 Color Palette

### Dark Mode (Primary)

```css
/* Base colors - Inspired by Linear/Vercel dark theme */
--background: 0 0% 3.5%;        /* #09090b - Near black */
--foreground: 0 0% 95%;         /* #f2f2f2 - Off-white */

--card: 0 0% 5%;                /* #0d0d0d - Slightly lighter than bg */
--card-foreground: 0 0% 95%;

--popover: 0 0% 6%;             /* #0f0f0f */
--popover-foreground: 0 0% 95%;

/* Primary - Vibrant accent (emerald/teal for stock/inventory theme) */
--primary: 152 69% 45%;         /* #10b981 - Emerald 500 */
--primary-foreground: 0 0% 100%;

--secondary: 0 0% 10%;          /* #1a1a1a */
--secondary-foreground: 0 0% 90%;

--muted: 0 0% 12%;              /* #1f1f1f */
--muted-foreground: 0 0% 60%;

--accent: 0 0% 14%;             /* #242424 */
--accent-foreground: 0 0% 90%;

/* Border - Subtle, barely visible */
--border: 0 0% 15%;             /* #262626 */
--input: 0 0% 15%;
--ring: 152 69% 45%;            /* Match primary */

/* Status colors */
--destructive: 0 72% 51%;       /* #dc2626 */
--destructive-foreground: 0 0% 100%;

--success: 142 76% 36%;         /* #16a34a */
--warning: 38 92% 50%;          /* #f59e0b */
--info: 199 89% 48%;            /* #0ea5e9 */
```

### Light Mode (Secondary)

```css
/* Light theme - Clean, professional */
--background: 0 0% 99%;         /* #fdfdfd */
--foreground: 0 0% 9%;          /* #171717 */

--card: 0 0% 100%;
--card-foreground: 0 0% 9%;

--popover: 0 0% 100%;
--popover-foreground: 0 0% 9%;

--primary: 152 69% 40%;          /* Slightly darker for contrast */
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
```

### Design Tokens

```css
:root {
  --radius: 0.75rem;           /* 12px - Slightly larger, more modern */
  --radius-lg: 1rem;           /* 16px */
  --radius-sm: 0.5rem;         /* 8px */
  
  /* Shadows */
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
  
  /* Sidebar */
  --sidebar-width: 260px;
  --sidebar-collapsed-width: 68px;
  --sidebar-bg: 0 0% 4%;       /* Slightly lighter than bg */
}
```

---

## 📝 Typography

### Font Stack

```css
/* Primary font - Clean, modern */
--font-sans: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;

/* Monospace - For code/numbers */
--font-mono: "JetBrains Mono", "SF Mono", Monaco, "Cascadia Code", monospace;
```

### Type Scale

```css
/* Headings - Semibold, tight line-height */
--text-xs: 0.75rem;      /* 12px */
--text-sm: 0.875rem;     /* 14px */
--text-base: 1rem;       /* 16px */
--text-lg: 1.125rem;     /* 18px */
--text-xl: 1.25rem;      /* 20px */
--text-2xl: 1.5rem;      /* 24px */
--text-3xl: 1.875rem;    /* 30px */
--text-4xl: 2.25rem;     /* 36px */

/* Line heights */
--leading-tight: 1.25;
--leading-normal: 1.5;
--leading-relaxed: 1.625;

/* Letter spacing for headings */
--tracking-tight: -0.025em;
--tracking-normal: 0;
```

### Hierarchy

| Element | Size | Weight | Color | Notes |
|---------|------|--------|-------|-------|
| Page Title | 2xl / 24px | 600 (semibold) | foreground | tracking-tight |
| Section Title | lg / 18px | 600 | foreground | |
| Card Title | base / 16px | 600 | foreground | |
| Body | sm / 14px | 400 | foreground | |
| Muted Text | sm / 14px | 400 | muted-foreground | |
| Caption | xs / 12px | 500 | muted-foreground | |

---

## 🔐 Login Page Design

### Layout: Split Hero (Recommended)

**Structure:**
```
┌─────────────────────────────────────────────────────────────┐
│                        [Logo]                               │
├───────────────────────────┬─────────────────────────────────┤
│                           │                                 │
│    ILLUSTRATION SIDE      │         FORM SIDE              │
│                           │                                 │
│    - Abstract gradient    │     - Welcome back             │
│    - 3D illustration      │     - Email input              │
│      or pattern           │     - Password input            │
│    - Testimonial/quote    │     - Continue with GitHub     │
│      (optional)           │     - Continue with Google      │
│                           │     - Sign in button            │
│                           │     - Forgot password link      │
│                           │     - Sign up link              │
│                           │                                 │
└───────────────────────────┴─────────────────────────────────┘
```

### Login Form Specifications

```tsx
// Container
<div className="min-h-screen bg-background flex">
  {/* Left side - Branding/Illustration */}
  <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-emerald-600 via-emerald-700 to-zinc-900 relative overflow-hidden">
    {/* Abstract pattern overlay */}
    <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-10" />
    
    {/* Floating elements */}
    <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-emerald-400/10 rounded-full blur-3xl" />
    <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
    
    {/* Center content */}
    <div className="relative z-10 flex flex-col justify-center items-center p-12 text-white">
      {/* Logo */}
      <div className="mb-8">
        <Logo className="h-12 w-12" />
      </div>
      
      {/* Tagline */}
      <h2 className="text-3xl font-bold text-center mb-4">
        Gestiona tu inventario con inteligencia
      </h2>
      <p className="text-emerald-100 text-center max-w-md">
        Stocker te ayuda a mantener control total de tu inventario, ventas y pedidos en un solo lugar.
      </p>
      
      {/* Testimonial (optional) */}
      <div className="mt-12 p-6 bg-white/10 backdrop-blur-sm rounded-2xl max-w-md">
        <p className="text-sm italic text-emerald-50">
          "Stocker redujo mis pérdidas de inventario en un 40%. 
          La interfaz es tan intuitiva que mi equipo aprendió en minutos."
        </p>
        <p className="text-xs mt-2 text-emerald-200">— María García, Restaurante El Buen Sabor</p>
      </div>
    </div>
  </div>
  
  {/* Right side - Form */}
  <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
    <div className="w-full max-w-sm">
      {/* Mobile logo */}
      <div className="lg:hidden mb-8 flex justify-center">
        <Logo />
      </div>
      
      <Card className="border-0 shadow-2xl">
        {/* ... form content ... */}
      </Card>
    </div>
  </div>
</div>
```

### Social Auth Buttons

```tsx
// GitHub Button
<Button
  variant="outline"
  className="w-full bg-background hover:bg-accent/50 transition-colors"
>
  <Github className="mr-2 h-4 w-4" />
  Continue with GitHub
</Button>

// Google Button  
<Button
  variant="outline"
  className="w-full bg-background hover:bg-accent/50 transition-colors"
>
  <Google className="mr-2 h-4 w-4" />
  Continue with Google
</Button>
```

---

## 📊 Sidebar Design

### Specifications

```tsx
// Sidebar container
<aside className={cn(
  "flex h-screen flex-col border-r border-border bg-sidebar transition-all duration-300",
  collapsed ? "w-[68px]" : "w-[260px]"
)}>
  
  {/* Logo section */}
  <div className="h-16 flex items-center border-b border-border px-3">
    <Link href="/" className="flex items-center gap-2">
      <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
        <Package className="h-4 w-4 text-primary-foreground" />
      </div>
      {!collapsed && (
        <span className="text-lg font-semibold text-foreground">Stocker</span>
      )}
    </Link>
    
    {/* Collapse toggle */}
    <Button
      variant="ghost"
      size="icon"
      className="ml-auto h-8 w-8"
      onClick={() => setCollapsed(!collapsed)}
    >
      {collapsed ? <ChevronRight /> : <ChevronLeft />}
    </Button>
  </div>
  
  {/* Navigation - refined hover states */}
  <nav className="flex-1 overflow-y-auto py-4 px-2">
    {/* ... nav items ... */}
  </nav>
  
  {/* User section */}
  <div className="border-t border-border p-2">
    {/* ... user info ... */}
  </div>
</aside>
```

### Navigation Item Styles

```css
/* Base nav link */
.nav-link {
  @apply flex items-center gap-3 rounded-lg px-3 py-2;
  @apply text-sm font-medium;
  @apply text-muted-foreground;
  @apply transition-all duration-150;
}

/* Hover state - subtle background change */
.nav-link:hover {
  @apply bg-accent text-accent-foreground;
}

/* Active state - prominent, clear */
.nav-link.active {
  @apply bg-primary text-primary-foreground;
  @apply shadow-sm;
}

/* Collapsed state */
.nav-link.collapsed {
  @apply justify-center px-2;
}

/* Icon styling */
.nav-link svg {
  @apply h-5 w-5 shrink-0;
}
```

### Group Headers

```tsx
// Section label
<div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
  {groupLabel}
</div>
```

---

## 🃏 Dashboard Cards

### Metric Cards (Key Performance Indicators)

```tsx
<Card className="border-border/50 bg-card hover:border-border transition-colors">
  <CardHeader className="flex flex-row items-center justify-between pb-2">
    <CardTitle className="text-sm font-medium text-muted-foreground">
      {title}
    </CardTitle>
    <Icon className="h-4 w-4 text-muted-foreground" />
  </CardHeader>
  <CardContent>
    <div className="text-2xl font-bold tracking-tight">
      {value}
    </div>
    {trend && (
      <p className="text-xs text-muted-foreground mt-1">
        <span className={cn(
          trend > 0 ? "text-emerald-500" : "text-red-500"
        )}>
          {trend > 0 ? "↑" : "↓"} {Math.abs(trend)}%
        </span>
        {" from last month"}
      </p>
    )}
  </CardContent>
</Card>
```

### Data Tables

```tsx
// Modern table with hover states
<div className="rounded-lg border border-border overflow-hidden">
  <Table>
    <TableHeader className="bg-muted/50">
      <TableRow className="hover:bg-muted/50 border-border">
        <TableHead className="text-muted-foreground font-medium">
          Product
        </TableHead>
        {/* ... more headers ... */}
      </TableRow>
    </TableHeader>
    <TableBody>
      <TableRow className="hover:bg-muted/30 transition-colors border-border">
        {/* ... cells ... */}
      </TableRow>
    </TableBody>
  </Table>
</div>
```

---

## 🎭 Animations & Transitions

### Recommended Durations

| Action | Duration | Easing |
|--------|----------|--------|
| Hover state | 150ms | ease-out |
| Sidebar collapse | 300ms | ease-in-out |
| Modal open/close | 200ms | ease-out |
| Toast notification | 300ms | ease-out |
| Page transition | 150ms | ease-out |
| Loading spinner | 1000ms | linear (loop) |

### Micro-interactions

```css
/* Button press */
.btn:active {
  transform: scale(0.98);
}

/* Card hover */
.card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  border-color: var(--border-hover);
}

/* Input focus */
input:focus {
  ring-offset: 2px;
  ring-color: var(--primary);
}

/* Sidebar nav item */
.nav-item {
  transition: all 150ms ease-out;
}

.nav-item:hover {
  background: var(--accent);
  transform: translateX(2px);
}
```

---

## 📱 Responsive Breakpoints

```css
/* Tailwind defaults (recommended) */
sm: 640px   /* Mobile landscape */
md: 768px   /* Tablet */
lg: 1024px  /* Desktop */
xl: 1280px  /* Large desktop */
2xl: 1536px /* Extra large */

/* Sidebar behavior */
/* Mobile (< lg): Hidden, hamburger menu */
/* Desktop (>= lg): Visible, collapsible */

/* Login split layout */
/* Mobile (< lg): Single column, form only */
/* Desktop (>= lg): Split hero with illustration */
```

---

## 🔧 Component Updates Required

### 1. globals.css (Critical)

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* Dark theme as default */
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
    --sidebar-ring: 152 69% 45%;
  }

  /* Light mode override */
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
  
  /* Better text rendering */
  html {
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
}
```

### 2. Login Page (Complete Rewrite)

**File:** `src/app/(auth)/login/page.tsx`

- Remove basic card-centered layout
- Implement split hero layout
- Add social auth buttons (GitHub, Google)
- Add subtle background gradient/pattern
- Add testimonial or feature highlight
- Refined spacing and typography

### 3. Sidebar Updates

**File:** `src/components/layout/Sidebar.tsx`

- Darker background (`bg-sidebar`)
- Refined hover states with subtle color change
- Active state with primary color highlight
- Smoother collapse animation
- Better typography hierarchy
- User section with role badge

### 4. Card Component Updates

**File:** `src/components/ui/card.tsx`

- Add subtle shadow by default
- Refined border colors
- Hover state for interactive cards
- Better header/body spacing

### 5. Header Component

**File:** `src/components/layout/Header.tsx`

- Clean, minimal design
- Global search with keyboard shortcut hint
- User avatar with dropdown
- Theme toggle (light/dark)

---

## ✅ Priority Changes

### High Priority (Must Have)
1. ✅ Update `globals.css` with new color palette
2. ✅ Redesign login page with split hero layout
3. ✅ Update sidebar styles and hover states
4. ✅ Add Inter font family
5. ✅ Update card shadows and borders

### Medium Priority (Should Have)
6. ⬜ Add social auth buttons (GitHub, Google)
7. ⬜ Implement theme toggle (light/dark)
8. ⬜ Add loading states and skeletons
9. ⬜ Improve table styling

### Low Priority (Nice to Have)
10. ⬜ Add micro-interactions (hover effects, transitions)
11. ⬜ Add toast notifications
12. ⬜ Add empty states illustrations
13. ⬜ Add charts/graphs styling

---

## 📚 Reference Screenshots

Screenshots captured from reference UIs:

1. **Supabase Login** - `/home/fabriziodp/.openclaw/media/browser/86983b1c-a4f7-413c-adf4-7b273fc56bd4.png`
   - Clean dark gradient
   - Social auth prominent
   - Testimonial on right
   
2. **Linear Landing** - `/home/fabriziodp/.openclaw/media/browser/1f00cca7-28f1-4490-bfd3-16c2d32e4740.jpg`
   - Vibrant gradient hero
   - Modern illustration style
   - Clean CTA buttons

3. **Vercel Login** - `/home/fabriziodp/.openclaw/media/browser/65a06a2a-40d4-47b9-8e25-049136f4d3e8.png`
   - Dark theme, terminal aesthetic
   - Minimal, developer-focused
   - Strong branding

4. **Stripe Login** - `/home/fabriziodp/.openclaw/media/browser/70655bd0-465c-4ef6-9297-c29704c3e934.png`
   - Professional gradient
   - Split layout
   - Illustration on side

5. **Notion Login** - `/home/fabriziodp/.openclaw/media/browser/085f4189-cc6b-4053-941a-51049ecf675e.png`
   - Sketch illustration style
   - Soft, welcoming colors
   - Clean form design

---

## 🎯 Key Design Principles

1. **Less is More** - Remove unnecessary visual noise
2. **Dark by Default** - Professional, modern, easier on eyes
3. **Subtle Depth** - Use shadows and borders sparingly
4. **Consistent Spacing** - 4px/8px grid system
5. **Purposeful Color** - Primary color only for actions/active states
6. **Typography Hierarchy** - Clear visual hierarchy with size/weight
7. **Micro-interactions** - Subtle animations improve perceived quality
8. **Accessibility** - Contrast ratios, focus states, keyboard navigation

---

## 📦 Required Packages

```bash
# Already installed (verify versions)
npm list tailwindcss-animate
npm list lucide-react
npm list @radix-ui/react-collapsible
npm list class-variance-authority
npm list clsx
npm list tailwind-merge

# Add if missing
npm install lucide-react @radix-ui/react-collapsible
```

---

## 🚀 Implementation Order

1. **Day 1**: Update color palette and typography in `globals.css`
2. **Day 2**: Redesign login page with split hero layout
3. **Day 3**: Update sidebar styles and navigation
4. **Day 4**: Update dashboard cards and tables
5. **Day 5**: Add micro-interactions and polish

---

## 📐 ASCII Wireframes

### Dashboard Principal - Layout Completo

```
┌────────────────────────────────────────────────────────────────────────────────────────────┐
│  HEADER                                                              [🔍] [🔔] [Avatar ▼] │
│  ┌─────────────────────────────────────────────────────────────────────────────────────┐  │
│  │ Dashboard                                    [Search... ⌘K]    [🔔] [●●●] [JD ▼]   │  │
│  └─────────────────────────────────────────────────────────────────────────────────────┘  │
├──────────────┬───────────────────────────────────────────────────────────────────────────┤
│              │                                                                             │
│  SIDEBAR     │   MAIN CONTENT                                                             │
│  ┌────────┐  │   ┌───────────────────────────────────────────────────────────────────┐   │
│  │ 📦     │  │   │                                                                   │   │
│  │ Stocker│  │   │  PAGE TITLE                                                       │   │
│  └────────┘  │   │  Dashboard                                                         │   │
│  ─ ─ ─ ─ ─   │   │  ──────────────────────────────────────────────────────────────── │   │
│              │   │                                                                   │   │
│  OVERVIEW    │   │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐   │   │
│  ├ Dashboard │   │  │   📊        │ │   💰        │ │   📦        │ │   ⚠️        │   │   │
│  ├ Products  │   │  │   Sales     │ │   Revenue   │ │   Products  │ │   Low Stock │   │   │
│  └ Inventory │   │  │             │ │             │ │             │ │             │   │   │
│              │   │  │   $12,450   │ │   $8,230    │ │   234       │ │   5         │   │   │
│  ORDERS      │   │  │   ↑ 12%     │ │   ↑ 8%      │ │   ↑ 3%      │ │   items     │   │   │
│  ├ Orders    │   │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘   │   │
│  └ Sales     │   │                                                                   │   │
│              │   │  ┌───────────────────────────────────────────────────────────────┐   │   │
│  MANAGEMENT   │   │  │                                                               │   │   │
│  ├ Suppliers │   │  │  📈 SALES TREND                                               │   │   │
│  ├ Customers │   │  │  ──────────────────────────────────────────────────────────    │   │   │
│  └ Reports   │   │  │                                                               │   │   │
│              │   │  │      ▄▄▄                                                       │   │   │
│  SETTINGS    │   │  │     █████▄                                                    │   │   │
│  ├ Settings  │   │  │    ████████▄                                                   │   │   │
│  └ Users     │   │  │   ███████████▄▄▄▄▄                                             │   │   │
│              │   │  │  ████████████████████▄                                          │   │   │
│  ─ ─ ─ ─ ─   │   │  │ Mon Tue Wed Thu Fri Sat Sun                                    │   │   │
│  [👤 User]   │   │  │                                                               │   │   │
│  Admin       │   │  └───────────────────────────────────────────────────────────────┘   │   │
│              │   │                                                                   │   │
│              │   │  ┌───────────────────────────────────────────────────────────────┐   │   │
│              │   │  │  📋 RECENT ORDERS                                    [View All →] │   │   │
│              │   │  │  ──────────────────────────────────────────────────────────    │   │   │
│              │   │  │  │ Order ID  │ Customer    │ Items │ Total  │ Status │ Date │   │   │
│              │   │  │  ├───────────┼─────────────┼───────┼────────┼────────┼──────┤   │   │
│              │   │  │  │ #12345    │ John Doe    │ 3     │ $45.00 │ ✓ Done │ Today│   │   │
│              │   │  │  │ #12344    │ Jane Smith  │ 2     │ $32.50 │ ⏳ Pend│ 1d   │   │   │
│              │   │  │  │ #12343    │ Bob Wilson  │ 5     │ $78.25 │ ✓ Done │ 2d   │   │   │
│              │   │  │  └───────────────────────────────────────────────────────────┘   │   │
│              │   │                                                                   │   │
│              │   └───────────────────────────────────────────────────────────────────┘   │
└──────────────┴───────────────────────────────────────────────────────────────────────────┘
```

### KPI Card Específica (Wireframe Detallado)

```
┌─────────────────────────────────────────┐
│                                         │
│   KPI METRIC CARD                       │
│   ───────────────────────────────────── │
│                                         │
│   ┌──────────────────────┐              │
│   │                      │              │
│   │   [Icon]             │   Title     │
│   │    📊                │   Total Sales│
│   │                      │              │
│   └──────────────────────┘              │
│                                         │
│   ┌──────────────────────┐              │
│   │                      │              │
│   │   $12,450.00         │   Value     │
│   │   ↑ 12.5%           │   Trend     │
│   │                      │              │
│   └──────────────────────┘              │
│                                         │
│   ┌──────────────────────────────────┐  │
│   │ from last month                  │  │
│   └──────────────────────────────────┘  │
│                                         │
└─────────────────────────────────────────┘

CSS Equivalent:
┌─────────────────────────────────────────┐
│ .kpi-card {                             │
│   padding: 24px;                        │
│   border-radius: 12px;                  │
│   background: hsl(var(--card));         │
│   border: 1px solid hsl(var(--border)); │
│   box-shadow: 0 1px 3px rgba(0,0,0,.1); │
│ }                                       │
│                                         │
│ .kpi-icon {                             │
│   width: 40px;                         │
│   height: 40px;                         │
│   border-radius: 10px;                  │
│   background: hsl(var(--primary)/.1);   │
│   color: hsl(var(--primary));           │
│ }                                       │
│                                         │
│ .kpi-value {                            │
│   font-size: 28px;                      │
│   font-weight: 700;                     │
│   line-height: 1;                       │
│   tracking: -0.025em;                   │
│ }                                       │
│                                         │
│ .kpi-trend {                            │
│   font-size: 12px;                      │
│   color: hsl(var(--success));           │
│   display: flex;                        │
│   align-items: center;                  │
│   gap: 4px;                             │
│ }                                       │
└─────────────────────────────────────────┘
```

### Tabla de Datos Moderna (Wireframe)

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                                                                     │
│   DATA TABLE                                                                        │
│   ───────────────────────────────────────────────────────────────────────────────── │
│                                                                                     │
│   ┌─────────────────────────────────────────────────────────────────────────────┐   │
│   │ [🔍 Search...]                              [Filter ▼] [Export ▼] [+ Add] │   │
│   └─────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                     │
│   ┌──────────┬──────────────┬────────┬─────────┬──────────┬──────────────────────┐ │
│   │ □ Select │ Name         │ SKU    │ Stock   │ Price    │ Actions              │ │
│   │          │              │        │         │          │                      │ │
│   ├──────────┼──────────────┼────────┼─────────┼──────────┼──────────────────────┤ │
│   │ □        │ 📦 Widget A  │ SKU001 │ 234     │ $12.50   │ [Edit] [Delete] [•••]│ │
│   │ □        │ 📦 Widget B  │ SKU002 │ 45      │ $24.00   │ [Edit] [Delete] [•••]│ │
│   │ □        │ 📦 Widget C  │ SKU003 │ 12      │ $8.99    │ [Edit] [Delete] [•••]│ │
│   │ □        │ 📦 Widget D  │ SKU004 │ 89      │ $15.75   │ [Edit] [Delete] [•••]│ │
│   └──────────┴──────────────┴────────┴─────────┴──────────┴──────────────────────┘ │
│                                                                                     │
│   ┌─────────────────────────────────────────────────────────────────────────────┐   │
│   │ Showing 1-10 of 234 items                        [< Prev] [1] [2] [3] [>]   │   │
│   └─────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                     │
└─────────────────────────────────────────────────────────────────────────────────────┘

CSS Specifications:
──────────────────────────────────────────────────────────────────────────────────────
Table Header:
  background: hsl(var(--muted) / 0.5)
  padding: 12px 16px
  font-weight: 600
  font-size: 12px
  text-transform: uppercase
  letter-spacing: 0.05em
  color: hsl(var(--muted-foreground))

Table Row:
  border-bottom: 1px solid hsl(var(--border))
  transition: background 150ms ease

Table Row Hover:
  background: hsl(var(--accent) / 0.5)

Pagination:
  padding: 16px
  border-top: 1px solid hsl(var(--border))
  font-size: 14px
```

### Sidebar Mejorada (Wireframe)

```
┌──────────────────────┐
│                      │
│  ┌────────────────┐  │
│  │   📦           │  │
│  │   Stocker      │  │
│  └────────────────┘  │
│                      │
│  ┌────────────────┐  │
│  │   [◀]          │  │   ← Collapse button
│  └────────────────┘  │
│                      │
│  ─────────────────── │
│                      │
│  OVERVIEW            │   ← Section label (uppercase, small)
│  ├ ┌──────────────┐ │
│  │ │ 🏠 Dashboard │ │   ← Active state
│  │ │   Dashboard  │ │     (highlighted background)
│  │ └──────────────┘ │
│  ├ ┌──────────────┐ │
│  │ │ 📦 Products  │ │   ← Inactive state
│  │ │   Products   │ │     (transparent bg)
│  │ └──────────────┘ │
│  └ ┌──────────────┐ │
│    │ 📊 Inventory│ │
│    │   Inventory  │ │
│    └──────────────┘ │
│                      │
│  ─────────────────── │
│                      │
│  ORDERS              │
│  ├ ┌──────────────┐ │
│  │ │ 🛒 Orders    │ │
│  │ │   Orders     │ │
│  │ └──────────────┘ │
│  └ ┌──────────────┐ │
│    │ 💵 Sales     │ │
│    │   Sales      │ │
│    └──────────────┘ │
│                      │
│  ─────────────────── │
│                      │
│  MANAGEMENT          │
│  ├ ┌──────────────┐ │
│  │ │ 👥 Suppliers │ │
│  │ │   Suppliers  │ │
│  │ └──────────────┘ │
│  ├ ┌──────────────┐ │
│  │ │ 👤 Customers │ │
│  │ │   Customers  │ │
│  │ └──────────────┘ │
│  └ ┌──────────────┐ │
│    │ 📄 Reports   │ │
│    │   Reports    │ │
│    └──────────────┘ │
│                      │
│  ─────────────────── │
│                      │
│  SETTINGS            │
│  ├ ┌──────────────┐ │
│  │ │ ⚙️ Settings  │ │
│  │ │   Settings   │ │
│  │ └──────────────┘ │
│  └ ┌──────────────┐ │
│    │ 👤 Users     │ │
│    │   Users      │ │
│    └──────────────┘ │
│                      │
│  ─────────────────── │
│                      │
│  ┌────────────────┐  │
│  │  ● John Doe    │  │   ← User section
│  │  Admin         │  │     (avatar + name + role)
│  │  [Sign Out]    │  │
│  └────────────────┘  │
│                      │
└──────────────────────┘

CSS Specifications:
──────────────────────────────────────────────────────────────────────────────────────
Sidebar Container:
  width: 260px (collapsed: 68px)
  background: hsl(var(--sidebar-background))
  border-right: 1px solid hsl(var(--sidebar-border))

Nav Item Base:
  padding: 8px 12px
  border-radius: 8px
  font-size: 14px
  font-weight: 500
  color: hsl(var(--muted-foreground))
  transition: all 150ms ease

Nav Item Hover:
  background: hsl(var(--sidebar-accent))
  color: hsl(var(--sidebar-accent-foreground))

Nav Item Active:
  background: hsl(var(--sidebar-primary))
  color: hsl(var(--sidebar-primary-foreground))
  box-shadow: 0 1px 2px rgba(0,0,0,0.1)

Section Label:
  font-size: 11px
  font-weight: 600
  text-transform: uppercase
  letter-spacing: 0.05em
  color: hsl(var(--muted-foreground) / 0.5)
  padding: 8px 12px
  margin-top: 16px

User Section:
  border-top: 1px solid hsl(var(--sidebar-border))
  padding: 12px
  background: hsl(var(--sidebar-background) / 0.5)
```

### Login Page - Split Layout (Wireframe)

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                                                                     │
│  ┌─────────────────────────────────┐  ┌─────────────────────────────────────────┐  │
│  │                                 │  │                                         │  │
│  │     BRANDING/ILLUSTRATION      │  │            LOGIN FORM                   │  │
│  │     ────────────────────────   │  │            ─────────────────────────    │  │
│  │                                 │  │                                         │  │
│  │         ┌─────────────┐         │  │         ┌──────────────────────┐       │  │
│  │         │   📦        │         │  │         │                      │       │  │
│  │         │   Stocker   │         │  │         │   Welcome back       │       │  │
│  │         └─────────────┘         │  │         │                      │       │  │
│  │                                 │  │         │   Sign in to your     │       │  │
│  │    ┌───────────────────────┐    │  │         │   account             │       │  │
│  │    │                       │    │  │         └──────────────────────┘       │  │
│  │    │  Gestiona tu         │    │  │                                         │  │
│  │    │  inventario con      │    │  │         ┌──────────────────────┐       │  │
│  │    │  inteligencia        │    │  │         │  [GitHub] Continue   │       │  │
│  │    │                       │    │  │         │  with GitHub         │       │  │
│  │    └───────────────────────┘    │  │         └──────────────────────┘       │  │
│  │                                 │  │                                         │  │
│  │    ┌───────────────────────┐    │  │         ─────── or ───────           │  │
│  │    │ "Stocker redujo mis   │    │  │                                         │  │
│  │    │  pérdidas en 40%..." │    │  │         ┌──────────────────────┐       │  │
│  │    │                       │    │  │         │  [Google] Continue   │       │  │
│  │    │  — María García       │    │  │         │  with Google         │       │  │
│  │    └───────────────────────┘    │  │         └──────────────────────┘       │  │
│  │                                 │  │                                         │  │
│  │    [Abstract 3D graphics]      │  │         ─────────────────────────       │  │
│  │    [or gradient pattern]        │  │                                         │  │
│  │                                 │  │         ┌──────────────────────┐       │  │
│  │                                 │  │         │  Email               │       │  │
│  │                                 │  │         │  [________________]  │       │  │
│  │                                 │  │         └──────────────────────┘       │  │
│  │                                 │  │                                         │  │
│  │                                 │  │         ┌──────────────────────┐       │  │
│  │                                 │  │         │  Password            │       │  │
│  │                                 │  │         │  [________________]  │       │  │
│  │                                 │  │         └──────────────────────┘       │  │
│  │                                 │  │                                         │  │
│  │                                 │  │         [Remember me]  [Forgot pass?]   │  │
│  │                                 │  │                                         │  │
│  │                                 │  │         ┌──────────────────────┐       │  │
│  │                                 │  │         │  [Sign In]           │       │  │
│  │                                 │  │         └──────────────────────┘       │  │
│  │                                 │  │                                         │  │
│  │                                 │  │         Don't have an account?          │  │
│  │                                 │  │         [Sign up]                      │  │
│  │                                 │  │                                         │  │
│  └─────────────────────────────────┘  └─────────────────────────────────────────┘  │
│                                                                                     │
│  Left: 50% width, gradient background                                              │
│  Right: 50% width, dark/card background                                            │
│                                                                                     │
└─────────────────────────────────────────────────────────────────────────────────────┘

CSS Specifications:
──────────────────────────────────────────────────────────────────────────────────────
Split Container:
  display: flex
  min-height: 100vh

Left Side (Branding):
  width: 50%
  background: linear-gradient(135deg, hsl(152, 69%, 35%), hsl(152, 69%, 45%), hsl(0, 0%, 10%))
  position: relative
  overflow: hidden

Left Side Overlay:
  position: absolute
  inset: 0
  background-image: url('/grid-pattern.svg')
  opacity: 0.1

Left Side Blur Elements:
  .blur-circle {
    position: absolute
    border-radius: 50%
    filter: blur(64px)
    background: hsl(var(--primary) / 0.1)
  }

Right Side (Form):
  width: 50%
  display: flex
  align-items: center
  justify-content: center
  background: hsl(var(--background))

Form Container:
  max-width: 400px
  padding: 32px
```

---

## 🎨 Paleta de Colores Refinada (Extraída de Dashboards Investigados)

### Colores de Linear (Dark Theme)
```css
/* Linear usa un tema oscuro muy refinado */
--linear-bg: #0a0a0a;
--linear-surface: #111111;
--linear-border: #1a1a1a;
--linear-text: #f0f0f0;
--linear-text-secondary: #737373;
--linear-accent: #5e5ce6;  /* Violeta */
--linear-success: #30a14e;
--linear-warning: #d29922;
--linear-error: #f85149;
```

### Colores de Supabase (Dark Theme)
```css
/* Supabase tiene un verde/teal más vibrante */
--supabase-bg: #0a0a0a;
--supabase-surface: #161618;
--supabase-border: #292929;
--supabase-text: #ededed;
--supabase-text-secondary: #8b8b8b;
--supabase-accent: #3ecf8e;  /* Verde brillante */
--supabase-success: #2da44e;
--supabase-warning: #bb8009;
--supabase-error: #da3633;
```

### Colores de Toast POS (Brand)
```css
/* Toast usa naranja/coral como brand */
--toast-primary: #ff6b35;
--toast-secondary: #ff8c42;
--toast-bg-dark: #1a1a1a;
--toast-text: #ffffff;
```

### Paleta Final para Stocker (Recomendada)
```css
/* Basada en Linear + Supabase + Dribbble dashboards */
:root {
  /* Background layers */
  --background: #09090b;
  --surface: #0f0f0f;
  --surface-elevated: #151515;
  
  /* Borders */
  --border: #1f1f1f;
  --border-subtle: #171717;
  --border-focus: #2a2a2a;
  
  /* Text */
  --text: #fafafa;
  --text-secondary: #8a8a8a;
  --text-tertiary: #525252;
  
  /* Brand - Emerald/Teal para inventario */
  --brand: #10b981;
  --brand-hover: #059669;
  --brand-subtle: rgba(16, 185, 129, 0.1);
  
  /* Status */
  --success: #22c55e;
  --warning: #f59e0b;
  --error: #ef4444;
  --info: #3b82f6;
  
  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.4);
  --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.5);
  --shadow-glow: 0 0 20px rgba(16, 185, 129, 0.15);
  
  /* Radii */
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  
  /* Transitions */
  --transition-fast: 150ms ease;
  --transition-normal: 200ms ease;
  --transition-slow: 300ms ease;
}
```

---

## 🧩 Componentes Específicos (Tailwind/CSS)

### KPI Card Component
```tsx
// components/dashboard/KPICard.tsx
interface KPICardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  subtitle?: string;
}

export function KPICard({ title, value, icon, trend, subtitle }: KPICardProps) {
  return (
    <div className="group relative overflow-hidden rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 transition-all duration-200 hover:border-[hsl(var(--border-focus))] hover:shadow-md">
      {/* Subtle gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-transparent to-[hsl(var(--brand)/0.03)] opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
      
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between pb-4">
          <span className="text-sm font-medium text-[hsl(var(--text-secondary))]">
            {title}
          </span>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[hsl(var(--brand-subtle))]">
            {icon}
          </div>
        </div>
        
        {/* Value */}
        <div className="text-3xl font-bold tracking-tight text-[hsl(var(--text))]">
          {value}
        </div>
        
        {/* Trend */}
        {trend && (
          <div className="mt-2 flex items-center gap-1.5">
            <span className={cn(
              "text-sm font-medium",
              trend.isPositive ? "text-[hsl(var(--success))]" : "text-[hsl(var(--error))]"
            )}>
              {trend.isPositive ? "↑" : "↓"} {Math.abs(trend.value)}%
            </span>
            <span className="text-xs text-[hsl(var(--text-tertiary))]">
              {subtitle || "from last month"}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
```

### Modern Data Table
```tsx
// components/dashboard/DataTable.tsx
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function DataTable({ columns, data }) {
  return (
    <div className="overflow-hidden rounded-xl border border-[hsl(var(--border))]">
      <Table>
        <TableHeader className="bg-[hsl(var(--surface))]">
          <TableRow className="border-[hsl(var(--border))] hover:bg-[hsl(var(--surface))]">
            {columns.map((col) => (
              <TableHead 
                key={col.key}
                className="text-xs font-semibold uppercase tracking-wide text-[hsl(var(--text-secondary))]"
              >
                {col.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row, i) => (
            <TableRow 
              key={row.id}
              className="border-[hsl(var(--border))] transition-colors hover:bg-[hsl(var(--surface-elevated))]"
            >
              {columns.map((col) => (
                <TableCell key={col.key} className="text-sm text-[hsl(var(--text))]">
                  {col.render ? col.render(row) : row[col.key]}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
```

### Sidebar Nav Item
```tsx
// components/layout/SidebarNavItem.tsx
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

export function SidebarNavItem({ icon, label, href, isActive, isCollapsed }) {
  return (
    <Link
      to={href}
      className={cn(
        "group flex items-center gap-3 rounded-lg px-3 py-2 transition-all duration-150",
        isActive
          ? "bg-[hsl(var(--brand))] text-[hsl(var(--text))] shadow-sm"
          : "text-[hsl(var(--text-secondary))] hover:bg-[hsl(var(--surface-elevated))] hover:text-[hsl(var(--text))]",
        isCollapsed && "justify-center px-2"
      )}
    >
      <span className="h-5 w-5 shrink-0">{icon}</span>
      {!isCollapsed && (
        <span className="text-sm font-medium">{label}</span>
      )}
    </Link>
  );
}
```

---

## 📱 Responsive Design Specs

### Breakpoints (Tailwind)
```css
/* Mobile First Approach */
sm: 640px   /* Landscape phones */
md: 768px   /* Tablets */
lg: 1024px  /* Desktop */
xl: 1280px  /* Large desktop */
2xl: 1536px /* Extra large */
```

### Sidebar Behavior
```tsx
// Mobile: Hidden, hamburger menu toggle
// Tablet: Collapsible overlay
// Desktop: Always visible, collapsible width

const sidebarVariants = {
  mobile: {
    position: "fixed",
    transform: "translateX(-100%)",
    width: "260px",
    zIndex: 50,
    transition: "transform 300ms ease"
  },
  tablet: {
    position: "fixed",
    transform: "translateX(0)",
    width: "260px",
    zIndex: 40,
  },
  desktop: {
    position: "relative",
    width: collapsed ? "68px" : "260px",
    transition: "width 300ms ease"
  }
};
```

### Grid Layout (Dashboard)
```tsx
// Mobile: 1 column
// Tablet: 2 columns
// Desktop: 4 columns

<div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
  {/* KPI Cards */}
</div>
```

---

## 🎭 Animations & Micro-interactions

### Hover States
```css
/* Card hover */
.card {
  transition: all 200ms ease;
}
.card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

/* Button press */
.btn:active {
  transform: scale(0.98);
}

/* Nav item hover */
.nav-item {
  transition: all 150ms ease;
}
.nav-item:hover {
  background: var(--surface-elevated);
  transform: translateX(2px);
}
```

### Loading States
```tsx
// Skeleton loader for KPI cards
<div className="animate-pulse space-y-4">
  <div className="h-4 w-24 rounded bg-[hsl(var(--surface-elevated))]" />
  <div className="h-8 w-32 rounded bg-[hsl(var(--surface-elevated))]" />
  <div className="h-3 w-20 rounded bg-[hsl(var(--surface-elevated))]" />
</div>
```

---

## ✅ Implementation Checklist

### Phase 1: Foundation
- [ ] Update `globals.css` with refined color palette
- [ ] Update `tailwind.config.js` with new theme values
- [ ] Add Inter font family
- [ ] Update CSS variables for dark theme

### Phase 2: Components
- [ ] Create `KPICard` component
- [ ] Update `Sidebar` with new styles
- [ ] Update `DataTable` with modern styling
- [ ] Create `SidebarNavItem` component
- [ ] Add loading skeletons

### Phase 3: Pages
- [ ] Redesign login page with split layout
- [ ] Update dashboard page layout
- [ ] Update product list page
- [ ] Update inventory page

### Phase 4: Polish
- [ ] Add micro-interactions
- [ ] Add hover states
- [ ] Add loading states
- [ ] Test responsive design
- [ ] Add dark/light mode toggle

---

_Document updated: January 21, 2025_
_Research based on: Linear, Supabase, Stripe, Toast POS, Square, and premium Dribbble dashboards_
_Wireframes: ASCII art representations of final UI components_