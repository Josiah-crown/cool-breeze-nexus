# Design System Documentation

## Overview

This application uses an **Industrial Dark Theme** design system optimized for IoT/machine monitoring interfaces. The design follows a HUD-inspired aesthetic with carefully crafted color tokens, gradients, and component styles.

---

## Color System

All colors are defined as **HSL values** in `src/index.css` and should be used via semantic tokens, never hardcoded.

### Core Colors

```css
--background: 220 15% 8%        /* Deep charcoal background */
--foreground: 210 20% 98%       /* Near-white text */
--card: 220 15% 12%             /* Card backgrounds */
--card-foreground: 210 20% 98%
--popover: 220 15% 10%
--popover-foreground: 210 20% 98%
```

### Primary (Blue - Main brand)
```css
--primary: 217 91% 60%           /* Bright blue */
--primary-foreground: 210 20% 98%
--primary-glow: 217 91% 70%      /* Lighter blue for glows */
```

### Secondary (Purple - Complementary)
```css
--secondary: 263 70% 50%         /* Purple accent */
--secondary-foreground: 210 20% 98%
```

### Accent (Cyan - Highlights)
```css
--accent: 180 100% 50%           /* Cyan for emphasis */
--accent-foreground: 220 15% 8%
--accent-glow: 180 100% 60%      /* Cyan glow */
```

### Status Colors
```css
--success: 142 71% 45%           /* Green for active/success */
--success-foreground: 210 20% 98%
--warning: 38 92% 50%            /* Amber for warnings */
--warning-foreground: 220 15% 8%
--destructive: 0 84% 60%         /* Red for errors */
--destructive-foreground: 210 20% 98%
```

### UI Elements
```css
--border: 217 33% 17%            /* Subtle borders */
--input: 217 33% 17%             /* Input borders */
--ring: 217 91% 60%              /* Focus rings */
--muted: 217 33% 17%             /* Muted backgrounds */
--muted-foreground: 215 20% 65%  /* Muted text */
```

### Specialized Panels
```css
--panel-bg: 220 15% 10%          /* Panel backgrounds */
--control-bg: 220 15% 14%        /* Control backgrounds */
--control-border: 217 33% 25%    /* Control borders */
--status-bg: 220 15% 12%         /* Status panel backgrounds */
```

---

## Using Colors in Components

### ✅ CORRECT - Use semantic tokens
```tsx
<div className="bg-card text-card-foreground">
<Button variant="default">Click me</Button>
<div className="border-border bg-muted">
<span className="text-primary">Highlighted</span>
```

### ❌ WRONG - Never use direct colors
```tsx
<div className="bg-gray-900 text-white">        /* Don't do this */
<div className="bg-blue-500">                   /* Don't do this */
<span className="text-[#3B82F6]">              /* Don't do this */
```

---

## Gradients

Defined in `src/index.css`:

```css
--gradient-primary: linear-gradient(135deg, hsl(217, 91%, 60%), hsl(263, 70%, 50%))
--gradient-accent: linear-gradient(135deg, hsl(180, 100%, 50%), hsl(217, 91%, 60%))
--gradient-panel: linear-gradient(180deg, hsl(220, 15%, 12%), hsl(220, 15%, 8%))
```

### Usage
```css
.custom-element {
  background: var(--gradient-primary);
}
```

---

## Shadows & Effects

```css
--shadow-glow: 0 0 20px -5px hsl(217 91% 60% / 0.5)
--shadow-accent: 0 0 20px -5px hsl(180 100% 50% / 0.5)
--shadow-panel: 0 4px 20px rgba(0, 0, 0, 0.3)
```

---

## Typography

- **Font Family**: System fonts (`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`)
- **Base Size**: 16px
- **Headings**: Use semantic HTML (`h1`, `h2`, etc.) with Tailwind utilities
- **Body Text**: `text-foreground` or `text-muted-foreground`

### Examples
```tsx
<h1 className="text-4xl font-bold text-foreground">Title</h1>
<p className="text-sm text-muted-foreground">Description</p>
```

---

## Component Variants

### Button Variants (from `src/components/ui/button.tsx`)

| Variant | Use Case | Classes |
|---------|----------|---------|
| `default` | Primary actions | Blue background, white text |
| `destructive` | Delete/remove | Red background |
| `outline` | Secondary actions | Border with hover |
| `secondary` | Alternative actions | Purple background |
| `ghost` | Minimal actions | Transparent with hover |
| `link` | Text links | Underlined text |

### Button Sizes
- `default`: `h-10 px-4 py-2`
- `sm`: `h-9 px-3`
- `lg`: `h-11 px-8`
- `icon`: `h-10 w-10`

---

## Custom Component Classes

### HUD Panels
```tsx
<div className="hud-panel">
  <!-- Creates angled corner effect -->
</div>
```

### HUD Buttons
```tsx
<button className="btn-control">
  <!-- Industrial-style button with glow -->
</button>

<button className="btn-nav">
  <!-- Navigation button variant -->
</button>
```

### Status Lights
```tsx
import StatusLight from '@/components/StatusLight';

<StatusLight status="active" label="Running" />
<StatusLight status="warning" label="Warning" />
<StatusLight status="error" label="Error" />
<StatusLight status="inactive" label="Offline" />
```

### Panels
```tsx
<div className="panel">
  <div className="panel-header">
    <h3 className="panel-title">Title</h3>
  </div>
  <!-- Panel content -->
</div>
```

---

## Animations

### Keyframes (from `src/index.css`)
```css
@keyframes spin { ... }          /* Rotating animation */
@keyframes glow { ... }          /* Pulsing glow effect */
```

### Transitions
```css
--transition-base: all 0.3s ease
```

### Usage
```tsx
<div className="transition-all duration-300 hover:scale-105">
  <!-- Smooth hover effect -->
</div>
```

---

## Responsive Design

### Breakpoints (Tailwind defaults)
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px
- `2xl`: 1400px (customized in `tailwind.config.ts`)

### Common Patterns
```tsx
{/* Mobile-first grid */}
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

{/* Responsive spacing */}
<div className="p-4 md:p-6 lg:p-8">

{/* Conditional visibility */}
<div className="hidden lg:block">
```

---

## Card Components

### Standard Card
```tsx
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>
    Content goes here
  </CardContent>
</Card>
```

---

## Best Practices

### 1. Always Use Semantic Tokens
Never hardcode colors. Use the design system tokens from `index.css`.

### 2. Maintain Contrast
- Text on dark backgrounds: Use `text-foreground` or `text-primary-foreground`
- Text on light backgrounds: Use `text-background` or adjust accordingly

### 3. Consistent Spacing
- Use Tailwind spacing scale: `gap-4`, `p-6`, `space-y-4`
- Stick to multiples of 4px (1 unit = 0.25rem = 4px)

### 4. Reuse Components
- Use existing UI components from `src/components/ui/`
- Create new reusable components for repeated patterns

### 5. Dark Mode Support
The system is designed for dark mode. All colors are defined with dark mode in mind.

---

## Customization Guide

### To Change Primary Brand Color
1. Open `src/index.css`
2. Modify `--primary` HSL values
3. Adjust `--primary-glow` for lighter variant
4. Update `--gradient-primary` if using gradients

### To Add New Status Color
1. Add to `src/index.css`:
   ```css
   --info: 200 95% 60%;
   --info-foreground: 210 20% 98%;
   ```
2. Add to `tailwind.config.ts`:
   ```ts
   info: {
     DEFAULT: "hsl(var(--info))",
     foreground: "hsl(var(--info-foreground))",
   }
   ```

### To Create New Button Variant
Edit `src/components/ui/button.tsx`:
```ts
const buttonVariants = cva("...", {
  variants: {
    variant: {
      // ... existing variants
      info: "bg-info text-info-foreground hover:bg-info/90",
    }
  }
});
```

---

## Component Examples

### Machine Card Layout
```tsx
<Card className="bg-card border-border">
  <CardHeader className="border-b border-border">
    <CardTitle className="text-foreground">Machine Name</CardTitle>
  </CardHeader>
  <CardContent className="p-6">
    <StatusLight status="active" label="Running" />
  </CardContent>
</Card>
```

### Control Panel
```tsx
<div className="panel">
  <div className="panel-header">
    <h3 className="panel-title">Controls</h3>
  </div>
  <div className="control-grid">
    <Button variant="default">Start</Button>
    <Button variant="destructive">Stop</Button>
  </div>
</div>
```

---

## File Structure

- **`src/index.css`** - All design tokens and custom component styles
- **`tailwind.config.ts`** - Tailwind configuration and color mapping
- **`src/components/ui/`** - Reusable UI components
- **`src/components/`** - Feature-specific components

---

## Quick Reference

| Need | Use |
|------|-----|
| Background | `bg-background` or `bg-card` |
| Text | `text-foreground` or `text-muted-foreground` |
| Border | `border-border` |
| Primary action | `<Button variant="default">` |
| Destructive action | `<Button variant="destructive">` |
| Status indicator | `<StatusLight status="active">` |
| Card container | `<Card>` with `<CardHeader>` and `<CardContent>` |
| Grid layout | `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4` |

---

## Support

For questions or to request new design system features, please refer to this document or the component source files in `src/components/ui/`.
