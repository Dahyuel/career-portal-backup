import React, { useState, useRef, useEffect, forwardRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

// Navigation item type
export interface NavItem {
    key: string;
    label: string;
    icon: string; // Material icon name
}

interface SharedNavigationProps {
    children: React.ReactNode;
    navItems: NavItem[];
    activeItem: string;
    onItemChange: (key: string) => void;
    title?: string;
    notifications?: any[];
    onNotificationClick?: (notification: any) => void;
    onProfileClick?: () => void;
    hideDock?: boolean;
}

// --- Independent Sub-Components ---

const SidebarLogo = ({ animate }: { animate: boolean }) => (
    <motion.div
        className="p-6 flex items-center gap-3"
        initial={animate ? { opacity: 0, y: -20 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
    >
        <img
            src="/images/logo.png"
            alt="Logo"
            className="w-12 h-12 object-contain shrink-0"
        />
        <span className="text-xl font-bold tracking-tight text-slate-800 dark:text-white leading-tight">
            ASU Employment Fair
        </span>
    </motion.div>
);

const SidebarButton = forwardRef<HTMLButtonElement, { item: NavItem; index: number; activeItem: string; onItemChange: (key: string) => void; animate: boolean }>(({ item, index, activeItem, onItemChange, animate }, ref) => {
    const isActive = activeItem === item.key;
    return (
        <motion.button
            ref={ref}
            key={item.key}
            onClick={() => onItemChange(item.key)}
            initial={animate ? { opacity: 0, x: -20 } : false}
            animate={{ opacity: 1, x: 0 }}
            transition={animate ? {
                duration: 0.3,
                delay: 0.1 + (index * 0.05), // Reduced delay for snappier feel
                ease: "easeOut"
            } : {}}
            whileHover={{ scale: 1.02, x: 5 }}
            whileTap={{ scale: 0.98 }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-colors ${isActive
                ? 'bg-primary/10 text-primary'
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-primary'
                }`}
            style={isActive ? { color: '#DC2626', backgroundColor: 'rgba(220, 38, 38, 0.1)' } : {}}
        >
            <span className="material-symbols-outlined">{item.icon}</span>
            <span>{item.label}</span>
        </motion.button>
    );
});

const TopBarIcon = ({
    icon,
    onClick,
    badgeCount,
    isActive = false
}: {
    icon: string,
    onClick: () => void,
    badgeCount?: number,
    isActive?: boolean
}) => (
    <motion.button
        onClick={onClick}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        className={`relative h-10 w-10 rounded-full flex items-center justify-center cursor-pointer transition-colors ${isActive
            ? 'bg-primary/10 text-primary ring-2 ring-primary/50'
            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
    >
        <span className="material-symbols-outlined">{icon}</span>
        {badgeCount !== undefined && badgeCount > 0 && (
            <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-900"
            />
        )}
    </motion.button>
);

const MobileDockItem = ({ item, activeItem, onItemChange }: { item: NavItem; activeItem: string; onItemChange: (key: string) => void }) => {
    const isActive = activeItem === item.key;
    return (
        <motion.button
            key={item.key}
            onClick={() => onItemChange(item.key)}
            whileHover={{ y: -5 }}
            whileTap={{ scale: 0.9 }}
            className={`flex flex-col items-center gap-1 transition-colors min-w-[60px] ${isActive
                ? 'text-primary'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                }`}
            style={isActive ? { color: '#DC2626' } : {}}
        >
            <span className="material-symbols-outlined">{item.icon}</span>
            <span className="text-[10px] font-bold">{item.label}</span>
        </motion.button>
    );
};



const SharedNavigation: React.FC<SharedNavigationProps> = ({
    children,
    navItems,
    activeItem,
    onItemChange,
    title = "ASU Employment Fair",
    notifications = [],
    onNotificationClick,
    onProfileClick,
    hideDock = false
}) => {
    const { signOut } = useAuth();
    const navigate = useNavigate();

    const [showProfileDropdown, setShowProfileDropdown] = useState(false);
    const [showMobileProfileDropdown, setShowMobileProfileDropdown] = useState(false);
    const [showNotificationDropdown, setShowNotificationDropdown] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);

    // Animation control state - initializes from sessionStorage
    const [shouldAnimate, setShouldAnimate] = useState(() => {
        const hasAnimated = sessionStorage.getItem('nav_animated');
        return !hasAnimated;
    });

    const profileDropdownRef = useRef<HTMLDivElement>(null);
    const mobileProfileDropdownRef = useRef<HTMLDivElement>(null);
    const notificationDropdownRef = useRef<HTMLDivElement>(null);
    const mobileNotificationDropdownRef = useRef<HTMLDivElement>(null);

    // Set animation flag in sessionStorage after first mount
    useEffect(() => {
        if (shouldAnimate) {
            sessionStorage.setItem('nav_animated', 'true');
            // Disable animation for future renders in this session
            // We use a timeout to let the initial animation play
            const timer = setTimeout(() => {
                setShouldAnimate(false);
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [shouldAnimate]);

    // Click outside to close dropdowns
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
                setShowProfileDropdown(false);
            }
            if (mobileProfileDropdownRef.current && !mobileProfileDropdownRef.current.contains(event.target as Node)) {
                setShowMobileProfileDropdown(false);
            }
            if (notificationDropdownRef.current && !notificationDropdownRef.current.contains(event.target as Node)) {
                // Check if it's also outside mobile notification dropdown
                if (!mobileNotificationDropdownRef.current || !mobileNotificationDropdownRef.current.contains(event.target as Node)) {
                    setShowNotificationDropdown(false);
                }
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSignOut = async () => {
        if (loggingOut) return;

        setLoggingOut(true);
        setShowProfileDropdown(false);
        setShowMobileProfileDropdown(false);

        try {
            await signOut();
            navigate('/login', { replace: true });
        } catch (error) {
            console.error('Logout error:', error);
            window.location.href = '/login';
        } finally {
            setTimeout(() => {
                if (window.location.pathname !== '/login') {
                    window.location.href = '/login';
                }
                setLoggingOut(false);
            }, 1000);
        }
    };

    const handleNotificationClick = (notification: any, e?: React.MouseEvent) => {
        if (e) {
            e.stopPropagation();
        }
        setShowNotificationDropdown(false);
        onNotificationClick?.(notification);
    };

    const unreadCount = notifications.filter((n: any) => !n.is_read).length;

    return (
        <div className="flex min-h-screen bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 transition-colors duration-200">
            {/* Desktop Sidebar */}
            <aside className={`${navItems.length > 0 ? 'lg:flex' : 'hidden'} hidden flex-col w-80 h-screen sticky top-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 z-50`}>
                <SidebarLogo animate={shouldAnimate} />

                {/* Navigation Menu */}
                <nav className="flex-1 px-4 mt-4 space-y-2 overflow-y-auto">
                    {navItems.map((item, index) => (
                        <SidebarButton
                            key={item.key}
                            item={item}
                            index={index}
                            activeItem={activeItem}
                            onItemChange={onItemChange}
                            animate={shouldAnimate}
                        />
                    ))}
                </nav>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 min-w-0">
                {/* Desktop Header */}
                <header className={`hidden lg:flex ${navItems.length === 0 ? 'justify-between' : 'justify-end'} items-center px-8 py-4 lg:py-6 gap-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40`}>
                    {navItems.length === 0 && (
                        <motion.div
                            className="flex items-center gap-3"
                            initial={shouldAnimate ? { opacity: 0, x: -20 } : false}
                            animate={{ opacity: 1, x: 0 }}
                        >
                            <img src="/images/logo.png" alt="Logo" className="w-10 h-10 object-contain shrink-0" />
                            <span className="text-xl font-bold tracking-tight text-slate-800 dark:text-white leading-tight">
                                {title}
                            </span>
                        </motion.div>
                    )}

                    <div className="flex items-center gap-4">
                        {/* Notification Icon with Dropdown */}
                        <div className="relative" ref={notificationDropdownRef}>
                            <TopBarIcon
                                icon="notifications"
                                onClick={() => setShowNotificationDropdown(!showNotificationDropdown)}
                                badgeCount={unreadCount}
                                isActive={showNotificationDropdown}
                            />

                            {/* Desktop Notification Dropdown */}
                            <AnimatePresence>
                                {showNotificationDropdown && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                        transition={{ duration: 0.2 }}
                                        className="absolute top-14 right-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-[60] w-80 max-h-96 overflow-y-auto"
                                    >
                                        <div className="p-4 border-b border-slate-200 dark:border-slate-800">
                                            <h3 className="text-lg font-bold text-slate-800 dark:text-white">Notifications</h3>
                                        </div>
                                        <div className="py-2">
                                            {notifications.length > 0 ? (
                                                notifications.map((notification: any, index: number) => (
                                                    <div
                                                        key={index}
                                                        className={`px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer border-b border-slate-100 dark:border-slate-800/50 last:border-0 ${!notification.is_read ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''}`}
                                                        onClick={(e) => handleNotificationClick(notification, e)}
                                                    >
                                                        <div className="flex gap-3">
                                                            <div className="shrink-0 mt-1">
                                                                <span className="material-symbols-outlined text-primary" style={{ color: '#DC2626' }}>
                                                                    {notification.type === 'success' ? 'check_circle' : 'info'}
                                                                </span>
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-sm font-semibold text-slate-800 dark:text-white mb-1">
                                                                    {notification.title || 'Notification'}
                                                                </p>
                                                                <p className="text-xs text-slate-600 dark:text-slate-400">
                                                                    {notification.message}
                                                                </p>
                                                                {notification.created_at && (
                                                                    <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                                                                        {new Date(notification.created_at).toLocaleDateString()}
                                                                    </p>
                                                                )}
                                                            </div>
                                                            {!notification.is_read && (
                                                                <div className="shrink-0">
                                                                    <span className="w-2 h-2 bg-blue-500 rounded-full block"></span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="px-4 py-8 text-center">
                                                    <span className="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-700 mb-2 block">
                                                        notifications_off
                                                    </span>
                                                    <p className="text-sm text-slate-500 dark:text-slate-400">No notifications</p>
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Profile Icon with Dropdown */}
                        <div className="relative" ref={profileDropdownRef}>
                            <TopBarIcon
                                icon="person"
                                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                                isActive={showProfileDropdown}
                            />

                            {/* Desktop Profile Dropdown */}
                            <AnimatePresence>
                                {showProfileDropdown && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                        transition={{ duration: 0.2 }}
                                        className="absolute top-14 right-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-[60] min-w-[180px]"
                                    >
                                        <nav className="py-2">
                                            <button
                                                onClick={() => {
                                                    setShowProfileDropdown(false);
                                                    onProfileClick?.();
                                                }}
                                                className="w-full flex items-center gap-3 px-4 py-3 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                                            >
                                                <span className="material-symbols-outlined text-xl">person</span>
                                                <span className="font-medium">Profile</span>
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setShowProfileDropdown(false);
                                                    // Navigate to settings
                                                }}
                                                className="w-full flex items-center gap-3 px-4 py-3 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                                            >
                                                <span className="material-symbols-outlined text-xl">settings</span>
                                                <span className="font-medium">Settings</span>
                                            </button>
                                            <div className="border-t border-slate-200 dark:border-slate-800 my-1"></div>
                                            <button
                                                type="button"
                                                onClick={handleSignOut}
                                                disabled={loggingOut}
                                                className="w-full flex items-center gap-3 px-4 py-3 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all disabled:opacity-50"
                                            >
                                                <span className="material-symbols-outlined text-xl">logout</span>
                                                <span className="font-medium">{loggingOut ? 'Logging out...' : 'Logout'}</span>
                                            </button>
                                        </nav>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </header>

                {/* Mobile Header */}
                <header className="lg:hidden bg-white dark:bg-slate-900 px-6 py-4 flex items-center justify-between z-40 sticky top-0 border-b border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                        <img src="/images/logo.png" alt="Logo" className="w-10 h-10 object-contain shrink-0" />
                        <h1 className="text-xl font-bold tracking-tight text-slate-800 dark:text-white leading-tight">
                            {title}
                        </h1>
                    </div>

                    <div className="flex items-center gap-3">
                        <TopBarIcon
                            icon="notifications"
                            onClick={() => setShowNotificationDropdown(!showNotificationDropdown)}
                            badgeCount={unreadCount}
                            isActive={showNotificationDropdown}
                        />

                        <TopBarIcon
                            icon="person"
                            onClick={() => setShowMobileProfileDropdown(!showMobileProfileDropdown)}
                            isActive={showMobileProfileDropdown}
                        />
                    </div>

                    {/* Mobile Dropdowns */}
                    <AnimatePresence>
                        {showNotificationDropdown && (
                            <motion.div
                                ref={mobileNotificationDropdownRef}
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                transition={{ duration: 0.2 }}
                                className="absolute top-[73px] right-6 left-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-[60] max-h-96 overflow-y-auto"
                            >
                                {/* Notification content duplicated here */}
                                <div className="p-4 border-b border-slate-200 dark:border-slate-800">
                                    <h3 className="text-lg font-bold text-slate-800 dark:text-white">Notifications</h3>
                                </div>
                                <div className="py-2">
                                    {notifications.length > 0 ? (
                                        notifications.map((notification: any, index: number) => (
                                            <div
                                                key={index}
                                                className="px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer border-b border-slate-100 dark:border-slate-800/50 last:border-0"
                                                onClick={(e) => handleNotificationClick(notification, e)}
                                            >
                                                <p className="text-sm font-semibold">{notification.title}</p>
                                                <p className="text-xs text-slate-600">{notification.message}</p>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="px-4 py-8 text-center text-slate-500">No notifications</div>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <AnimatePresence>
                        {showMobileProfileDropdown && (
                            <motion.div
                                ref={mobileProfileDropdownRef}
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                transition={{ duration: 0.2 }}
                                className="absolute top-[73px] right-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-[55] min-w-[180px]"
                            >
                                <nav className="py-2">
                                    <button
                                        onClick={() => {
                                            setShowMobileProfileDropdown(false);
                                            onProfileClick?.();
                                        }}
                                        className="w-full flex items-center gap-3 px-4 py-3 text-slate-700 hover:bg-slate-50"
                                    >
                                        <span className="material-symbols-outlined">person</span>
                                        <span>Profile</span>
                                    </button>
                                    <button
                                        onClick={handleSignOut}
                                        className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50"
                                    >
                                        <span className="material-symbols-outlined">logout</span>
                                        <span>Logout</span>
                                    </button>
                                </nav>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </header>

                {/* Content */}
                <div className="p-6 lg:p-8 pb-32 lg:pb-8">
                    {children}
                </div>
            </main>

            {/* Mobile Bottom Navigation - Floating Dock */}
            {!hideDock && navItems.length > 0 && (
                <div className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-[450px] z-50">
                    <motion.nav
                        initial={shouldAnimate ? { y: 100, opacity: 0 } : false}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ duration: 0.5, type: "spring" }}
                        className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 px-4 py-3 rounded-[28px] shadow-2xl flex justify-between items-center overflow-x-auto"
                    >
                        {navItems.map((item) => (
                            <MobileDockItem
                                key={item.key}
                                item={item}
                                activeItem={activeItem}
                                onItemChange={onItemChange}
                            />
                        ))}
                    </motion.nav>
                </div>
            )}
        </div>
    );
};

export default SharedNavigation;