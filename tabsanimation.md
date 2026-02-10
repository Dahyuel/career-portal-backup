# Tab Animation Implementation Guide

This guide demonstrates how to create polished, professional tab-based dashboard animations using Framer Motion in React applications, based on the AttendeeDashboard pattern.

## Core Tab Animation Architecture

### 1. Tab System Structure
```
Navigation Bar (Fixed)
  └─> Tab Content Container (AnimatePresence)
       └─> Active Tab Content (Staggered Children)
            └─> Individual Components (Variants)
```

### 2. Animation Flow
1. User clicks tab → Navigation updates instantly
2. Old tab content exits with fade/slide
3. New tab content enters with fade/slide
4. Children elements stagger in sequentially

## Essential Animation Variants

### Container Variants (Parent)
```jsx
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1  // 100ms delay between each child
    }
  },
  exit: { opacity: 0 }
};
```

### Item Variants (Children)
```jsx
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3 }
  }
};
```

## Tab Content Wrapper Pattern

### Basic Implementation
```jsx
import { motion, AnimatePresence } from 'framer-motion';

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('home');

  return (
    <div className="dashboard">
      {/* Navigation */}
      <TabNavigation activeTab={activeTab} onChange={setActiveTab} />
      
      {/* Content Area */}
      <AnimatePresence mode="wait">
        <motion.div key={activeTab} className="h-full">
          {renderTabContent()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
```

### Individual Tab Render Function
```jsx
const renderHomeTab = () => (
  <motion.div
    className="space-y-6"
    variants={containerVariants}
    initial="hidden"
    animate="visible"
    exit="exit"
  >
    {/* Hero/Banner Section */}
    <motion.div variants={itemVariants}>
      {/* Banner content */}
    </motion.div>

    {/* Content Cards */}
    <motion.div variants={itemVariants}>
      {/* Card content */}
    </motion.div>

    {/* List Section */}
    <motion.div variants={itemVariants}>
      {/* List content */}
    </motion.div>
  </motion.div>
);
```

## Component-Level Animation Patterns

### 1. Hero/Welcome Banner Animation

```jsx
<motion.div
  variants={itemVariants}
  className="bg-gradient-to-br from-red-600 to-red-700 rounded-3xl p-8 relative overflow-hidden group"
>
  {/* Background Decoration */}
  <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
    <span className="material-symbols-outlined text-9xl text-white transform rotate-12">
      school
    </span>
  </div>

  {/* Content */}
  <div className="relative z-10">
    <h2 className="text-3xl font-bold text-white mb-2">
      Welcome, {firstName}!
    </h2>
    <p className="text-red-100 text-lg mb-6">
      Ready to explore new opportunities?
    </p>
    <button className="bg-white text-red-600 px-6 py-2.5 rounded-xl font-bold transition-all active:scale-95">
      My Profile
    </button>
  </div>
</motion.div>
```

### 2. Section Header Animation

```jsx
<div className="flex items-center gap-3 mb-2">
  <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
    <span className="material-symbols-outlined text-red-600">
      calendar_month
    </span>
  </div>
  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
    Event Schedule
  </h2>
</div>
```

### 3. Horizontal Scrolling Cards (Date Selector)

```jsx
<motion.div
  variants={itemVariants}
  className="overflow-x-auto pb-2"
>
  <div className="flex gap-3 md:grid md:grid-cols-3 lg:grid-cols-5 min-w-min">
    {dates.map((date, idx) => {
      const isSelected = selectedDay === date;
      
      return (
        <button
          key={date}
          onClick={() => setSelectedDay(date)}
          className={`flex-shrink-0 w-40 md:w-auto p-4 rounded-xl border-2 transition-all ${
            isSelected
              ? 'border-red-600 bg-red-50'
              : 'border-gray-200 bg-white hover:border-red-300'
          }`}
        >
          <div className="text-sm font-semibold mb-1">Day {idx + 1}</div>
          <div className="text-lg font-bold mb-1">
            {dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </div>
          <div className="text-xs text-gray-500">
            {events.length} event{events.length !== 1 ? 's' : ''}
          </div>
        </button>
      );
    })}
  </div>
</motion.div>
```

### 4. List/Feed Items with Stagger

```jsx
<motion.div
  variants={itemVariants}
  className="bg-white rounded-xl p-6 shadow-sm"
>
  <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
    <span className="material-symbols-outlined text-red-600">history</span>
    Recent Activity
  </h3>
  
  <div className="space-y-4">
    {activities.map((activity, idx) => (
      <div 
        key={idx} 
        className="flex items-start gap-4 pb-4 border-b border-gray-100 last:border-0"
      >
        <div className="bg-red-100 p-2 rounded-lg flex-shrink-0">
          <span className="material-symbols-outlined text-red-600">
            {getActivityIcon(activity.type)}
          </span>
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900">{activity.title}</p>
          <p className="text-sm text-gray-600">{activity.description}</p>
          <p className="text-xs text-gray-400 mt-1">
            {formatDate(activity.timestamp)}
          </p>
        </div>
      </div>
    ))}
  </div>
</motion.div>
```

### 5. Empty State Animation

```jsx
{items.length === 0 && (
  <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-100">
    <span className="material-symbols-outlined text-6xl text-gray-300 mb-3 block">
      search_off
    </span>
    <p className="text-lg font-semibold text-gray-600">No items found</p>
    <p className="text-sm text-gray-500 mt-1">Try adjusting your filters</p>
  </div>
)}
```

### 6. Search & Filter Bar Animation

```jsx
<motion.div
  variants={itemVariants}
  className="flex flex-col md:flex-row gap-3"
>
  {/* Search Input */}
  <div className="flex-1 relative">
    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
      search
    </span>
    <input
      type="text"
      placeholder="Search..."
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
      className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-red-600"
    />
  </div>

  {/* Filter Dropdown */}
  <select
    value={filter}
    onChange={(e) => setFilter(e.target.value)}
    className="px-4 py-3 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-red-600"
  >
    <option value="">All Types</option>
    <option value="type1">Type 1</option>
    <option value="type2">Type 2</option>
  </select>
</motion.div>
```

### 7. Grid Card Animation with Hover

```jsx
<motion.div
  variants={itemVariants}
  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
>
  {items.map((item) => (
    <motion.div
      key={item.id}
      whileHover={{ y: -5 }}
      onClick={() => handleClick(item)}
      className="group bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden cursor-pointer border border-slate-100 flex flex-col h-full"
    >
      {/* Image Header */}
      <div className="relative h-64 overflow-hidden">
        <img
          src={item.image}
          alt={item.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-90" />

        {/* Floating Badge */}
        <div className="absolute top-3 right-3 px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-md border border-white/20 text-white text-xs font-bold">
          {item.badge}
        </div>

        {/* Bottom Badge */}
        <div className="absolute bottom-3 left-3">
          <span className="inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase bg-blue-100 text-blue-800">
            {item.category}
          </span>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-5 flex flex-col flex-1">
        <h4 className="font-bold text-lg text-slate-900 mb-2 line-clamp-2">
          {item.title}
        </h4>
        
        <p className="text-sm text-slate-500 mb-4 line-clamp-2">
          {item.description}
        </p>

        {/* Metadata */}
        <div className="space-y-2.5 mb-auto">
          <div className="flex items-center gap-2.5 text-xs font-semibold text-slate-500">
            <span className="material-symbols-outlined text-sm text-red-500">
              calendar_today
            </span>
            {formatDate(item.date)}
          </div>
          
          <div className="flex items-center gap-2.5 text-xs font-semibold text-slate-500">
            <span className="material-symbols-outlined text-sm text-red-500">
              location_on
            </span>
            {item.location}
          </div>
        </div>

        {/* Footer Action */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
            <span className="material-symbols-outlined text-sm">group</span>
            {item.attendees}
          </div>

          <button className="px-4 py-2 rounded-lg text-sm font-bold bg-red-600 hover:bg-red-700 text-white hover:shadow-md active:scale-95 transition-all">
            Book Now
          </button>
        </div>
      </div>
    </motion.div>
  ))}
</motion.div>
```

### 8. Clickable List Cards

```jsx
<motion.div
  variants={itemVariants}
  className="space-y-4"
>
  {events.map((event) => (
    <button
      key={event.id}
      onClick={() => setSelectedEvent(event)}
      className="w-full border border-gray-200 rounded-xl p-4 hover:border-red-300 hover:bg-red-50/30 transition-all text-left"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <h4 className="font-semibold text-gray-900">{event.title}</h4>
          
          <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-gray-600">
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-base">schedule</span>
              {formatTime(event.start_time)}
            </span>
            
            {event.location && (
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-base">location_on</span>
                {event.location}
              </span>
            )}
          </div>
        </div>

        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
          {event.type}
        </span>
      </div>
    </button>
  ))}
</motion.div>
```

### 9. Job/Listing Card with Company Logo

```jsx
<motion.div
  key={job.id}
  variants={itemVariants}
  whileHover={{ y: -5 }}
  onClick={() => setSelectedJob(job)}
  className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col h-full group"
>
  <div className="flex items-start gap-4 mb-4">
    {/* Company Logo */}
    <div className="w-16 h-16 rounded-xl bg-white p-2 shadow-sm border border-slate-100 flex items-center justify-center flex-shrink-0 group-hover:border-red-100 transition-colors">
      {job.company?.logo ? (
        <img
          src={job.company.logo}
          alt={job.company.name}
          className="w-full h-full object-contain"
        />
      ) : (
        <span className="material-symbols-outlined text-slate-300 text-3xl">
          business
        </span>
      )}
    </div>

    {/* Title & Company */}
    <div className="flex-1 min-w-0">
      <h3 className="font-bold text-lg text-slate-900 truncate group-hover:text-red-600 transition-colors">
        {job.title}
      </h3>
      <p className="text-sm font-medium text-slate-500 truncate">
        {job.company.name}
      </p>
    </div>
  </div>

  {/* Tags */}
  <div className="space-y-3 flex-1">
    <div className="flex flex-wrap gap-2">
      <span className="px-2.5 py-1 rounded-md text-xs font-bold uppercase bg-blue-100 text-blue-800">
        {job.type}
      </span>
      
      {job.location && (
        <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 text-xs font-bold flex items-center gap-1">
          <span className="material-symbols-outlined text-[10px]">location_on</span>
          {job.location}
        </span>
      )}
    </div>

    <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed">
      {job.description}
    </p>
  </div>

  {/* Footer */}
  <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
    <span className="text-xs font-medium text-slate-400">
      Posted {formatDate(job.posted_at)}
    </span>

    {hasApplied ? (
      <span className="flex items-center gap-1 text-green-600 text-xs font-bold bg-green-50 px-2 py-1 rounded-md">
        <span className="material-symbols-outlined text-sm">check_circle</span>
        Applied
      </span>
    ) : (
      <span className="text-red-600 text-xs font-bold group-hover:translate-x-1 transition-transform flex items-center gap-1">
        View Details
        <span className="material-symbols-outlined text-sm">arrow_forward</span>
      </span>
    )}
  </div>
</motion.div>
```

### 10. Company/Brand Card

```jsx
<motion.div
  key={company.id}
  variants={itemVariants}
  whileHover={{ y: -5 }}
  onClick={() => setSelectedCompany(company)}
  className="group bg-white rounded-3xl p-6 shadow-sm hover:shadow-xl border border-gray-100 cursor-pointer transition-all duration-300 relative overflow-hidden"
>
  {/* Partner Badge */}
  <div className="absolute top-4 right-4 z-10">
    <span className="inline-block px-2 py-1 rounded-lg text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
      {company.partner_type}
    </span>
  </div>

  {/* Logo Area */}
  <div className="h-32 mb-6 flex items-center justify-center p-4 bg-gray-50 rounded-2xl group-hover:bg-gray-100 transition-colors">
    {company.logo ? (
      <img
        src={company.logo}
        alt={company.name}
        className="max-w-full max-h-full object-contain filter grayscale group-hover:grayscale-0 transition-all duration-300 transform group-hover:scale-110"
      />
    ) : (
      <span className="material-symbols-outlined text-4xl text-gray-300">
        business
      </span>
    )}
  </div>

  {/* Content */}
  <div>
    <h3 className="text-lg font-bold text-gray-900 mb-1 group-hover:text-red-600 transition-colors truncate">
      {company.name}
    </h3>
    
    <p className="text-sm text-gray-500 font-medium mb-3 truncate">
      {company.industry}
    </p>

    <div className="flex items-center justify-between text-xs text-gray-400 border-t border-gray-100 pt-3">
      <span className="flex items-center gap-1">
        <span className="material-symbols-outlined text-sm">storefront</span>
        Booth {company.booth_number || 'TBA'}
      </span>
      
      <span className="group-hover:translate-x-1 transition-transform text-red-500 font-bold flex items-center">
        View Details
        <span className="material-symbols-outlined text-sm">chevron_right</span>
      </span>
    </div>
  </div>
</motion.div>
```

## Loading States for Lazy-Loaded Tabs

### Spinner Pattern
```jsx
const renderLoadingState = () => (
  <div className="flex flex-col items-center justify-center py-20">
    <div className="relative w-16 h-16 mb-4">
      {/* Background Ring */}
      <div className="absolute inset-0 border-4 border-slate-200 dark:border-slate-800 rounded-full" />
      
      {/* Spinning Ring */}
      <motion.div
        className="absolute inset-0 border-4 border-transparent border-t-red-600 rounded-full"
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      />
    </div>
    
    <p className="text-gray-500 dark:text-gray-400 font-medium">
      Loading content...
    </p>
  </div>
);
```

### Conditional Rendering with Loading
```jsx
const renderScheduleTab = () => {
  if (loadingSchedule) {
    return renderLoadingState();
  }

  return (
    <motion.div
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      {/* Tab content */}
    </motion.div>
  );
};
```

## Tab Switching Logic

### Complete Tab System
```jsx
const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('home');
  
  // Scroll to top on tab change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [activeTab]);

  // Define navigation tabs
  const navItems = [
    { key: 'home', label: 'Home', icon: 'home' },
    { key: 'schedule', label: 'Schedule', icon: 'calendar_month' },
    { key: 'sessions', label: 'Sessions', icon: 'event' },
    { key: 'jobs', label: 'Jobs', icon: 'work' },
    { key: 'companies', label: 'Companies', icon: 'business' }
  ];

  // Render current tab content
  const renderContent = () => {
    switch (activeTab) {
      case 'home': return renderHomeTab();
      case 'schedule': return renderScheduleTab();
      case 'sessions': return renderSessionsTab();
      case 'jobs': return renderJobsTab();
      case 'companies': return renderCompaniesTab();
      default: return renderHomeTab();
    }
  };

  return (
    <div className="dashboard">
      <Navigation 
        items={navItems}
        active={activeTab}
        onChange={setActiveTab}
      />
      
      <div className="max-w-7xl mx-auto px-4 pt-2 pb-8">
        <AnimatePresence mode="wait">
          <motion.div key={activeTab} className="h-full">
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};
```

## Animation Timing Guidelines

| Component Type | Stagger Delay | Item Duration | Hover Effect |
|----------------|---------------|---------------|--------------|
| Container | 0ms | - | - |
| Hero/Banner | 0ms (first item) | 300ms | scale(1.02) |
| Section Cards | 100ms increment | 300ms | y: -5px |
| List Items | N/A | 300ms | bg-color change |
| Grid Cards | 0ms (grid layout) | 300ms | y: -5px, shadow-xl |
| Search/Filters | 100ms | 300ms | ring-2 (focus) |
| Empty States | 0ms | 300ms | - |
| Loading Spinners | - | 1000ms (rotate) | - |

## Best Practices

### 1. Use `AnimatePresence mode="wait"`
Ensures smooth transitions between tabs without overlap:
```jsx
<AnimatePresence mode="wait">
  <motion.div key={activeTab}>
    {renderContent()}
  </motion.div>
</AnimatePresence>
```

### 2. Always Key by Tab Name
Critical for AnimatePresence to track component changes:
```jsx
<motion.div key={activeTab}>  // ✅ Good
<motion.div key="content">    // ❌ Bad - won't trigger exit animations
```

### 3. Stagger Children Properly
Use container variants to orchestrate child animations:
```jsx
// Parent defines stagger timing
const containerVariants = {
  visible: {
    transition: { staggerChildren: 0.1 }
  }
};

// Children just define their own motion
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};
```

### 4. Optimize for Performance
- Use `whileHover` instead of CSS hover for GPU-accelerated animations
- Avoid animating expensive properties (width, height)
- Prefer `transform` and `opacity`
- Use `will-change` sparingly

### 5. Handle Loading States
Always show loading feedback for lazy-loaded content:
```jsx
if (loading) return <LoadingSpinner />;

return <AnimatedContent />;
```

### 6. Empty State UX
Provide helpful empty states with clear CTAs:
```jsx
{items.length === 0 && (
  <EmptyState
    icon="search_off"
    title="No results found"
    description="Try adjusting your filters"
    action={<ClearFiltersButton />}
  />
)}
```

### 7. Scroll Management
Reset scroll position on tab change:
```jsx
useEffect(() => {
  window.scrollTo(0, 0);
}, [activeTab]);
```

### 8. Lazy Load Tab Content
Only fetch data when tab is first accessed:
```jsx
const [loadedTabs, setLoadedTabs] = useState(new Set(['home']));

useEffect(() => {
  if (!loadedTabs.has(activeTab)) {
    fetchTabData(activeTab);
    setLoadedTabs(prev => new Set(prev).add(activeTab));
  }
}, [activeTab]);
```

## Accessibility Considerations

### Reduce Motion Support
```jsx
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: prefersReducedMotion ? 0 : 0.1
    }
  }
};

const itemVariants = {
  hidden: prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 20 },
  visible: prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }
};
```

### Keyboard Navigation
Ensure all interactive elements are keyboard accessible:
```jsx
<button
  onClick={handleClick}
  onKeyDown={(e) => e.key === 'Enter' && handleClick()}
  className="..."
>
  {content}
</button>
```

## Complete Tab Template

```jsx
const renderExampleTab = () => {
  if (loadingData) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <motion.div
          className="w-16 h-16 border-4 border-transparent border-t-red-600 rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
        <p className="text-gray-500 mt-4">Loading...</p>
      </div>
    );
  }

  return (
    <motion.div
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      {/* Section Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 bg-red-100 rounded-lg">
          <span className="material-symbols-outlined text-red-600">icon</span>
        </div>
        <h2 className="text-2xl font-bold">Tab Title</h2>
      </div>

      {/* Search & Filters */}
      <motion.div variants={itemVariants} className="flex gap-3">
        <input
          type="text"
          placeholder="Search..."
          className="flex-1 px-4 py-3 rounded-xl border focus:ring-2 focus:ring-red-600"
        />
        <select className="px-4 py-3 rounded-xl border">
          <option>All</option>
        </select>
      </motion.div>

      {/* Content Grid */}
      <motion.div variants={itemVariants} className="grid grid-cols-3 gap-6">
        {items.map((item) => (
          <motion.div
            key={item.id}
            whileHover={{ y: -5 }}
            className="bg-white rounded-xl p-6 shadow-sm hover:shadow-xl transition-all"
          >
            {/* Card content */}
          </motion.div>
        ))}
      </motion.div>

      {/* Empty State */}
      {items.length === 0 && (
        <motion.div variants={itemVariants} className="text-center py-12">
          <span className="material-symbols-outlined text-6xl text-gray-300">
            search_off
          </span>
          <p className="text-gray-600 mt-3">No items found</p>
        </motion.div>
      )}
    </motion.div>
  );
};
```

