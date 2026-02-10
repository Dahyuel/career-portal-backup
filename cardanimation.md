# Card Animation Implementation Guide

This guide demonstrates how to create polished, professional modal card animations using Framer Motion in React applications, based on the AttendeeProfileCard pattern.

## Core Animation Principles

### 1. Layered Animation Timing
Use staggered delays to create a natural reveal sequence:
- Backdrop: 0ms delay
- Card container: 0ms delay
- Header elements: 100-200ms delay
- Content sections: Incremental delays (100ms, 200ms, 300ms, etc.)

### 2. Motion Hierarchy
```
Backdrop (opacity) 
  └─> Card Container (opacity + scale + y)
       └─> Individual Elements (opacity + x/y + custom transforms)
```

## Implementation Patterns

### Modal Backdrop & Container

```jsx
import { motion, AnimatePresence } from 'framer-motion';

const ModalCard = ({ isOpen, onClose, children }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-[9999]">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Card Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden relative z-10"
            onClick={(e) => e.stopPropagation()}
          >
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
```

### Close Button Animation

```jsx
<motion.button
  initial={{ opacity: 0, scale: 0 }}
  animate={{ opacity: 1, scale: 1 }}
  transition={{ delay: 0.2 }}
  whileHover={{ scale: 1.1, rotate: 90 }}
  whileTap={{ scale: 0.9 }}
  onClick={onClose}
  className="absolute top-4 right-4 text-white/80 hover:text-white bg-black/20 hover:bg-black/40 rounded-full p-2 transition-all"
>
  <span className="material-symbols-outlined">close</span>
</motion.button>
```

### Profile Avatar/Icon Animation

```jsx
<motion.div
  initial={{ scale: 0, y: 20 }}
  animate={{ scale: 1, y: 0 }}
  transition={{ delay: 0.1, type: "spring" }}
  className="absolute -bottom-12 left-8"
>
  <div className="w-24 h-24 rounded-full border-4 border-white bg-white flex items-center justify-center shadow-md">
    <span className="material-symbols-outlined text-red-600 text-5xl">person</span>
  </div>
</motion.div>
```

### Tab Navigation with Active Indicator

```jsx
const [activeTab, setActiveTab] = useState('overview');

// Tab buttons
{['overview', 'documents', 'qrcode'].map((tab, index) => (
  <motion.button
    key={tab}
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.5 + index * 0.1 }}
    whileHover={{ y: -2 }}
    whileTap={{ y: 0 }}
    onClick={() => setActiveTab(tab)}
    className={`pb-2 text-sm font-semibold transition-colors relative ${
      activeTab === tab ? 'text-red-600' : 'text-gray-500'
    }`}
  >
    {tab}
    {activeTab === tab && (
      <motion.span
        layoutId="activeTab"
        className="absolute bottom-0 left-0 w-full h-0.5 bg-red-600 rounded-full"
      />
    )}
  </motion.button>
))}
```

### Tab Content Transitions

```jsx
<AnimatePresence mode="wait">
  {activeTab === 'overview' && (
    <motion.div
      key="overview"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.3 }}
    >
      {/* Content */}
    </motion.div>
  )}
  
  {activeTab === 'documents' && (
    <motion.div
      key="documents"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.3 }}
    >
      {/* Content */}
    </motion.div>
  )}
</AnimatePresence>
```

### List Item Stagger Animation

```jsx
{items.map((item, index) => (
  <motion.div
    key={item.id}
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.1 + index * 0.1 }}
    whileHover={{ y: -4 }}
  >
    {/* Item content */}
  </motion.div>
))}
```

### Field/Detail Animation Pattern

```jsx
{fields.map((field, index) => (
  <motion.div
    key={field.label}
    initial={{ opacity: 0, x: -10 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay: 0.2 + index * 0.1 }}
  >
    <p className="text-xs text-gray-500">{field.label}</p>
    <p className="text-sm font-medium text-gray-900">{field.value}</p>
  </motion.div>
))}
```

### Loading Spinner

```jsx
<motion.div
  animate={{ rotate: 360 }}
  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
  className="rounded-full h-12 w-12 border-b-2 border-red-600"
/>
```

### Button with Spinning Icon

```jsx
<motion.span
  animate={isLoading ? { rotate: 360 } : {}}
  transition={isLoading ? { duration: 1, repeat: Infinity, ease: "linear" } : {}}
  className="material-symbols-outlined"
>
  {isLoading ? 'progress_activity' : 'upload'}
</motion.span>
```

### Conditional Message Animations

```jsx
<AnimatePresence>
  {message && (
    <motion.span
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      className="text-xs font-medium text-green-600"
    >
      {message}
    </motion.span>
  )}
</AnimatePresence>
```

### Interactive Card Hover Effects

```jsx
<motion.div
  whileHover={{ y: -4 }}
  className="bg-gray-50 rounded-xl p-5 border border-gray-100"
>
  {/* Card content */}
</motion.div>
```

### Icon Scale Animation

```jsx
<motion.div
  initial={{ scale: 0 }}
  animate={{ scale: 1 }}
  transition={{ delay: 0.2, type: "spring" }}
  className="bg-blue-100 p-2 rounded-lg"
>
  <span className="material-symbols-outlined">description</span>
</motion.div>
```

### Nested Modal Pattern

```jsx
<AnimatePresence>
  {showNestedModal && (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full"
      >
        {/* Nested modal content */}
      </motion.div>
    </motion.div>
  )}
</AnimatePresence>
```

### Alert/Warning Modal Header

```jsx
<motion.div
  initial={{ opacity: 0, y: -20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ delay: 0.1 }}
  className="bg-red-50 p-6 flex flex-col items-center text-center"
>
  <motion.div
    initial={{ scale: 0, rotate: -180 }}
    animate={{ scale: 1, rotate: 0 }}
    transition={{ delay: 0.2, type: "spring" }}
    className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4"
  >
    <span className="material-symbols-outlined text-3xl text-red-600">warning</span>
  </motion.div>
  <motion.h3
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ delay: 0.3 }}
    className="text-xl font-bold text-gray-900"
  >
    Alert Title
  </motion.h3>
</motion.div>
```

## Animation Timing Reference

| Element Type | Initial Delay | Increment | Transition Type |
|--------------|---------------|-----------|-----------------|
| Backdrop | 0ms | - | default |
| Container | 0ms | - | spring (0.5s) |
| Close Button | 200ms | - | default |
| Avatar/Icon | 100ms | - | spring |
| Title/Header | 200ms | - | default |
| Subtitle | 300ms | - | default |
| Tabs | 500ms | 100ms/tab | default |
| Content Sections | 100ms | 100ms/item | default |
| List Items | 200ms | 100ms/item | default |
| Nested Fields | 200ms | 100ms/field | default |

## Best Practices

### 1. Use `AnimatePresence` for Conditional Rendering
Always wrap conditionally rendered animated components with `AnimatePresence`:
```jsx
<AnimatePresence>
  {isOpen && <MotionComponent />}
</AnimatePresence>
```

### 2. Add `mode="wait"` for Tab Switching
Ensures the exit animation completes before the enter animation starts:
```jsx
<AnimatePresence mode="wait">
  {activeTab === 'tab1' && <Content1 />}
  {activeTab === 'tab2' && <Content2 />}
</AnimatePresence>
```

### 3. Use `layoutId` for Shared Element Transitions
Perfect for active tab indicators:
```jsx
{activeTab === tab && (
  <motion.span layoutId="activeIndicator" className="..." />
)}
```

### 4. Prevent Event Bubbling
Always stop propagation on modal content to prevent accidental closes:
```jsx
onClick={(e) => e.stopPropagation()}
```

### 5. Z-Index Management
- Main backdrop: `z-[9999]`
- Nested modals: `z-[10000]`
- Modal content: `relative z-10`

### 6. Spring vs. Default Transitions
- **Spring**: Natural, bouncy feel for entrance animations
- **Default**: Smooth, controlled for exits and subtle movements

### 7. Hover and Tap States
Add micro-interactions for better UX:
```jsx
whileHover={{ scale: 1.05, y: -2 }}
whileTap={{ scale: 0.95 }}
```

### 8. Loading States
Use infinite rotation for spinners:
```jsx
animate={{ rotate: 360 }}
transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
```

### 9. Stagger Children Properly
Increment delays by 100ms for visual hierarchy:
```jsx
transition={{ delay: 0.2 + index * 0.1 }}
```

### 10. Exit Animations
Mirror entrance but slightly faster:
- Entrance: `duration: 0.5`
- Exit: `duration: 0.3`

## Common Animation Combinations

### Card Entrance
```jsx
initial={{ opacity: 0, scale: 0.95, y: 20 }}
animate={{ opacity: 1, scale: 1, y: 0 }}
exit={{ opacity: 0, scale: 0.95, y: 20 }}
transition={{ type: "spring", duration: 0.5 }}
```

### Slide In From Left
```jsx
initial={{ opacity: 0, x: -20 }}
animate={{ opacity: 1, x: 0 }}
exit={{ opacity: 0, x: 20 }}
transition={{ duration: 0.3 }}
```

### Pop In (Icon/Avatar)
```jsx
initial={{ scale: 0, rotate: -180 }}
animate={{ scale: 1, rotate: 0 }}
transition={{ delay: 0.2, type: "spring" }}
```

### Fade Up
```jsx
initial={{ opacity: 0, y: 20 }}
animate={{ opacity: 1, y: 0 }}
transition={{ delay: 0.1 }}
```

### Gentle Lift on Hover
```jsx
whileHover={{ y: -4 }}
```

## CSS Considerations

### Custom Scrollbar
```css
.custom-scrollbar::-webkit-scrollbar {
  width: 8px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}
```

### Backdrop Blur Support
```css
backdrop-blur-sm /* Tailwind utility */
/* Fallback for unsupported browsers */
@supports not (backdrop-filter: blur(8px)) {
  background-color: rgba(0, 0, 0, 0.8);
}
```

## Performance Tips

1. **Use `will-change` sparingly**: Only on elements that will animate
2. **Avoid animating expensive properties**: Prefer `transform` and `opacity`
3. **Use `layout` animations cautiously**: Can be performance-intensive
4. **Reduce motion for accessibility**:
```jsx
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const variants = {
  initial: prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: 20 },
  animate: prefersReducedMotion ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }
};
```

## Complete Component Template

```jsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const AnimatedCard = ({ isOpen, onClose, title, children }) => {
  const [activeTab, setActiveTab] = useState('tab1');
  
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-[9999]">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden relative z-10"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="relative h-32 bg-gradient-to-r from-blue-700 to-blue-600">
              <motion.button
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="absolute top-4 right-4 text-white bg-black/20 rounded-full p-2"
              >
                ×
              </motion.button>
            </div>

            {/* Content */}
            <div className="p-8">
              <motion.h2
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="text-2xl font-bold"
              >
                {title}
              </motion.h2>
              
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default AnimatedCard;
```

## Summary

This pattern creates professional, polished modal animations by:
- Layering animation timing for natural reveals
- Using spring transitions for organic movement
- Adding micro-interactions on hover/tap
- Managing z-index and event propagation properly
- Combining opacity, scale, and translation transforms
- Implementing tab transitions with shared layout animations

Apply these patterns consistently across your application for a cohesive, high-quality user experience.