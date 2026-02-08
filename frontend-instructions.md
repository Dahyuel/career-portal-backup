# Frontend Design System

## 🎨 Core Principles
- **Modern & Clean**: Professional, minimalist with ample whitespace
- **Consistent**: Unified design language
- **Accessible**: Clear hierarchy, good contrast
- **Responsive**: Mobile-first approach
- **Primary Color**: Orange `#FF7E47`

## 🌈 Color System

### Primary
- Orange: `#FF7E47`

### Semantic Colors
- Success: `bg-green-100 text-green-800` / `bg-emerald-100 text-emerald-800`
- Info: `bg-blue-100 text-blue-800`
- Special: `bg-purple-100 text-purple-800`
- Warning: `bg-amber-100 text-amber-800`
- Error: `bg-red-100 text-red-800`
- Neutral: `bg-slate-100 text-slate-600`

### Backgrounds
- Light: `bg-white`, borders: `border-gray-200`
- Dark: `bg-slate-900`, borders: `border-slate-800`

## 📐 Layout

### Container
```jsx
<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
```

### Grids
```jsx
// 2 columns
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">

// 3 columns
<div className="grid grid-cols-1 md:grid-cols-3 gap-6">

// Responsive
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
```

### Spacing
- Small: `gap-2` to `gap-4`
- Medium: `gap-6`
- Large: `gap-8`

## 🎴 Components

### 1. Hero Banner
```jsx
<div 
  className="relative rounded-2xl overflow-hidden shadow-xl p-8 md:p-12 min-h-[300px] flex flex-col justify-center text-white" 
  style={{ background: 'linear-gradient(135deg, #FF7E47 0%, #FF7E47 60%, #ffffff 130%)' }}
>
  <p className="uppercase tracking-widest text-orange-100 font-semibold text-xs mb-2">
    Dashboard
  </p>
  <h1 className="text-4xl md:text-5xl font-bold mb-4">
    Welcome, {user?.first_name}
  </h1>
  <p className="text-lg text-orange-50 opacity-90 max-w-md mb-8">
    Description text
  </p>
  <button className="bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white px-8 py-3 rounded-full font-bold transition-all flex items-center gap-2 w-fit">
    <span className="material-symbols-outlined text-xl">icon</span>
    Button Text
  </button>
  <div className="absolute bottom-0 right-0 w-64 h-64 bg-white/20 rounded-full -mb-32 -mr-32 blur-3xl"></div>
</div>
```

### 2. Stat Card
```jsx
<div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
  <div className="flex items-center justify-between">
    <div>
      <p className="text-gray-600 text-sm font-medium mb-1">Label</p>
      <p className="text-4xl font-bold text-gray-900">{value}</p>
    </div>
    <div className="bg-blue-100 p-4 rounded-xl">
      <span className="material-symbols-outlined text-blue-600 text-3xl">icon</span>
    </div>
  </div>
</div>
```

### 3. Content Card
```jsx
<div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
  <div className="flex items-start gap-4">
    <div className="w-14 h-14 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
      <span className="material-symbols-outlined text-blue-600 text-2xl">icon</span>
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-start justify-between gap-3 mb-2">
        <h3 className="text-lg font-bold text-gray-900">Title</h3>
        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
          Badge
        </span>
      </div>
      <p className="text-gray-600 text-sm mb-3">Description</p>
      <button className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-6 py-2 rounded-lg font-semibold hover:shadow-md transition-shadow">
        Action
      </button>
    </div>
  </div>
</div>
```

### 4. Buttons

**Primary (Gradient)**
```jsx
<button className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-6 py-2 rounded-lg font-semibold hover:shadow-md transition-shadow">
  Action
</button>
```

**Secondary**
```jsx
<button className="bg-white border border-gray-200 px-6 py-3 rounded-xl font-semibold hover:border-orange-300 transition-colors">
  Action
</button>
```

### 5. Badges
```jsx
// Type badge colors
const colors = {
  'Workshop': 'bg-purple-100 text-purple-800',
  'Seminar': 'bg-amber-100 text-amber-800',
  'Networking': 'bg-emerald-100 text-emerald-800',
  'Full-Time': 'bg-blue-100 text-blue-800',
  'Internship': 'bg-amber-100 text-amber-800',
};

<span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
  Badge
</span>
```

### 6. Form Inputs
```jsx
// Search
<div className="relative">
  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
    search
  </span>
  <input
    type="text"
    placeholder="Search..."
    className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500"
  />
</div>

// Select
<select className="px-4 py-3 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500">
  <option>Option</option>
</select>
```

### 7. Modal
```jsx
<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
  <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
    <div className="text-center">
      <div className="bg-gradient-to-r from-orange-500 to-red-500 w-24 h-24 rounded-full mx-auto flex items-center justify-center mb-4">
        <span className="material-symbols-outlined text-white text-5xl">person</span>
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Title</h2>
      <p className="text-gray-600 mb-6">Description</p>
      <button className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white py-3 rounded-xl font-semibold mb-3">
        Primary
      </button>
      <button className="w-full bg-gray-200 text-gray-700 py-3 rounded-xl font-semibold">
        Secondary
      </button>
    </div>
  </div>
</div>
```

## 📱 Responsive

### Breakpoints
- `sm`: 640px
- `md`: 768px  
- `lg`: 1024px
- `xl`: 1280px

### Patterns
```jsx
// Grid stacking
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

// Hide/show
<div className="hidden lg:block"></div>
<div className="lg:hidden"></div>

// Text sizing
<h1 className="text-4xl md:text-5xl font-bold">

// Padding
<div className="p-4 md:p-6 lg:p-8">
```

## 🎭 Icons & Typography

### Icons
Material Symbols Outlined
```jsx
<span className="material-symbols-outlined">icon_name</span>
```

Common: `home`, `calendar_month`, `event`, `work`, `business`, `notifications`, `person`, `search`, `location_on`

### Typography
```jsx
// Headings
<h1 className="text-4xl md:text-5xl font-bold">
<h2 className="text-2xl font-bold">
<h3 className="text-xl font-bold">
<h4 className="text-lg font-bold">

// Body
<p className="text-base">      // Normal
<p className="text-sm">       // Small
<p className="text-xs">       // Extra small

// Weights
font-medium    // 500
font-semibold  // 600
font-bold      // 700

// Colors
text-gray-900  // Primary
text-gray-600  // Secondary
text-gray-400  // Tertiary
```

## ✨ Animations

```jsx
// Transitions
transition-all
transition-colors
transition-shadow
transition-transform

// Hover effects
hover:shadow-md transition-shadow
hover:scale-105 transition-transform
hover:border-orange-300 transition-colors

// Active (mobile)
active:scale-95 transition-transform
```

## 🌓 Dark Mode

```jsx
<div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
  Content
</div>
```

Common classes:
- `bg-white dark:bg-slate-900`
- `text-slate-900 dark:text-slate-100`
- `border-slate-200 dark:border-slate-800`

## ✅ Best Practices

### DO
- Use orange `#FF7E47` for CTAs and active states
- Use gradient: `linear-gradient(135deg, #FF7E47 0%, #FF7E47 60%, #ffffff 130%)`
- Add hover effects: `hover:shadow-md transition-shadow`
- Use Material Icons consistently
- Apply rounded corners: `rounded-xl`, `rounded-full`
- Maintain spacing: `gap-6`, `p-6`
- Include focus states: `focus:ring-2 focus:ring-orange-500`

### DON'T
- Mix icon libraries
- Skip mobile responsiveness
- Forget transitions on interactive elements
- Hardcode colors when Tailwind utilities exist
- Skip accessibility features

## 📋 Quick Recipes

### Dashboard Page
```jsx
<SharedNavigation navItems={navItems} activeItem={activeTab} onItemChange={setActiveTab}>
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    {/* Hero */}
    {/* Stats Grid */}
    {/* Content */}
  </div>
</SharedNavigation>
```

### Empty State
```jsx
<div className="bg-white rounded-xl p-12 text-center shadow-sm border border-gray-100">
  <span className="material-symbols-outlined text-gray-300 text-6xl mb-3">icon</span>
  <p className="text-gray-500">No items found</p>
</div>
```

---
**Version**: 1.0 | **Last Updated**: 2026-02-08