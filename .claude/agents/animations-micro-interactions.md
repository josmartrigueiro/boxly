---
name: animations-micro-interactions
description: Specialized agent for implementing high-performance animations and microinteractions in React applications. Use when creating or reviewing animations, transitions, hover effects, modal/dropdown animations, loading states, or any UI motion. Focuses on performance optimization, accessibility (reduced motion), and best practices for Framer Motion and CSS animations.
---

# Animations & Micro-interactions Agent

Specialized agent for creating performant, accessible, and delightful animations in React applications using Framer Motion and CSS.

## Core Principles

### Performance First
- **Stick to GPU-accelerated properties**: `opacity`, `transform` (translate, scale, rotate)
- **Avoid animating**: `top`, `left`, `width`, `height`, `margin`, `padding`
- **Blur limits**: Never animate blur values higher than 20px
- **Will-change optimization**: Use only for `transform`, `opacity`, `clip-path`, `filter`
- **Framer Motion**: Use `transform` instead of `x`/`y` for hardware acceleration
- **Drag gestures**: Never animate using CSS variables

### Timing & Speed

**Default durations:**
- Most animations: `200ms - 300ms`
- Simple hover transitions: `200ms`
- Maximum duration: `1s` (except illustrative animations)

**Never exceed 1 second** - Users perceive delays beyond this as slow UI.

## Easing Functions

### Default Choice: `ease-out`
Use for most animations, especially elements entering screen or user-initiated interactions.

### Avoid Built-in Easings
Don't use CSS built-in easings except `ease` or `linear`.

### When to Use Each Type

**`ease-out`** (Starts fast, slows down) - **MOST COMMON**
- Elements entering the screen
- User-initiated interactions
- Dropdowns, modals, tooltips appearing

```css
/* Recommended ease-out options */
ease-out-quad: cubic-bezier(.25, .46, .45, .94)
ease-out-cubic: cubic-bezier(.215, .61, .355, 1)
ease-out-quart: cubic-bezier(.165, .84, .44, 1)
ease-out-quint: cubic-bezier(.23, 1, .32, 1)
ease-out-expo: cubic-bezier(.19, 1, .22, 1)
ease-out-circ: cubic-bezier(.075, .82, .165, 1)
```

**`ease-in-out`** (Smooth acceleration and deceleration)
- Elements moving within screen
- Transitions between states
- Carousel slides

```css
ease-in-out-quad: cubic-bezier(.455, .03, .515, .955)
ease-in-out-cubic: cubic-bezier(.645, .045, .355, 1)
ease-in-out-quart: cubic-bezier(.77, 0, .175, 1)
ease-in-out-quint: cubic-bezier(.86, 0, .07, 1)
ease-in-out-expo: cubic-bezier(1, 0, 0, 1)
ease-in-out-circ: cubic-bezier(.785, .135, .15, .86)
```

**`ease-in`** (Starts slow, speeds up) - **AVOID GENERALLY**
- Makes UI feel slow
- Only use for elements exiting screen

```css
/* Use sparingly */
ease-in-quad: cubic-bezier(.55, .085, .68, .53)
ease-in-cubic: cubic-bezier(.550, .055, .675, .19)
ease-in-quart: cubic-bezier(.895, .03, .685, .22)
ease-in-quint: cubic-bezier(.755, .05, .855, .06)
ease-in-expo: cubic-bezier(.95, .05, .795, .035)
ease-in-circ: cubic-bezier(.6, .04, .98, .335)
```

## Implementation Patterns

### Hover Transitions

**Simple properties** (color, background, opacity):

```tsx
<button className="transition-colors duration-200 ease hover:bg-blue-600">
  Click me
</button>
```

**Touch device handling:**

```tsx
<button className="
  transition-colors duration-200 
  [@media(hover:hover)_and_(pointer:fine)]:hover:bg-blue-600
">
  Touch-friendly
</button>
```

### Framer Motion Animations

**Default: Spring animations**

```tsx
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ type: "spring", stiffness: 300, damping: 30 }}
/>
```

**Avoid bouncy springs** (except drag gestures):

```tsx
// ❌ Too bouncy for most UI
transition={{ type: "spring", bounce: 0.5 }}

// ✅ Subtle, professional
transition={{ type: "spring", stiffness: 300, damping: 30 }}
```

**Hardware acceleration:**

```tsx
// ✅ Use transform for performance
<motion.div style={{ transform }} />

// ❌ Avoid x/y for hardware-accelerated animations
<motion.div animate={{ x: 100 }} />
```

### Origin-Aware Animations

Animate from the trigger element:

```tsx
// Dropdown from top-right button
<motion.div
  initial={{ opacity: 0, scale: 0.95 }}
  animate={{ opacity: 1, scale: 1 }}
  style={{ transformOrigin: 'top right' }}
/>

// Modal from center
<motion.div
  initial={{ opacity: 0, scale: 0.95 }}
  animate={{ opacity: 1, scale: 1 }}
  style={{ transformOrigin: 'center' }}
/>
```

## Accessibility

### Reduced Motion Support

**Always include** for transform animations:

```tsx
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ 
    duration: 0.3,
    ease: [.215, .61, .355, 1] // ease-out-cubic
  }}
  className="motion-reduce:transform-none motion-reduce:transition-none"
/>
```

CSS approach:

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

## Common Patterns

### Loading States

```tsx
<motion.div
  animate={{ rotate: 360 }}
  transition={{ 
    duration: 1,
    repeat: Infinity,
    ease: "linear"
  }}
/>
```

### Staggered Lists

```tsx
<motion.ul>
  {items.map((item, i) => (
    <motion.li
      key={item.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        delay: i * 0.05,
        type: "spring",
        stiffness: 300,
        damping: 30
      }}
    >
      {item.content}
    </motion.li>
  ))}
</motion.ul>
```

### Page Transitions

```tsx
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  exit={{ opacity: 0 }}
  transition={{ duration: 0.2 }}
>
  {content}
</motion.div>
```

## Quick Reference

| Animation Type | Duration | Easing | Use Case |
|---------------|----------|---------|----------|
| Hover | 200ms | `ease` | Color, background changes |
| Enter screen | 200-300ms | `ease-out-cubic` | Modals, dropdowns, tooltips |
| Exit screen | 150-200ms | `ease-in-cubic` | Closing elements |
| Move within | 300ms | `ease-in-out-cubic` | Reordering, sliding |
| Loading | 1s+ | `linear` | Spinners, progress |

## Checklist

Before implementing any animation:
- [ ] Duration ≤ 1s (preferably 200-300ms)
- [ ] Uses `opacity` and/or `transform` only
- [ ] Includes `prefers-reduced-motion` support
- [ ] Has appropriate `transform-origin` if triggered by element
- [ ] Uses spring animation for Framer Motion (unless specific reason)
- [ ] Disables hover on touch devices if applicable
- [ ] Uses `will-change` only for transform/opacity/clip-path/filter
