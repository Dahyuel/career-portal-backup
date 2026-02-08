import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

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
    const { signOut, profile } = useAuth();
    const navigate = useNavigate();
    const [showProfileDropdown, setShowProfileDropdown] = useState(false);
    const [showMobileProfileDropdown, setShowMobileProfileDropdown] = useState(false);
    const [showNotificationDropdown, setShowNotificationDropdown] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);

    const profileDropdownRef = useRef<HTMLDivElement>(null);
    const mobileProfileDropdownRef = useRef<HTMLDivElement>(null);
    const notificationDropdownRef = useRef<HTMLDivElement>(null);

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
                setShowNotificationDropdown(false);
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
            // Navigate to login page after successful logout
            navigate('/login', { replace: true });
        } catch (error) {
            console.error('Logout error:', error);
            // Force redirect on error
            window.location.href = '/login';
        } finally {
            // Fallback redirect if navigation hasn't happened
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
        setShowNotificationDropdown(false); // Close the dropdown
        onNotificationClick?.(notification); // Pass to parent only
    };

    const unreadCount = notifications.filter((n: any) => !n.is_read).length;

    return (
        <div className="flex min-h-screen bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 transition-colors duration-200">
            {/* Desktop Sidebar */}
            {/* Desktop Sidebar */}
            <aside className={`${navItems.length > 0 ? 'lg:flex' : 'hidden'} hidden flex-col w-80 h-screen sticky top-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 z-50`}>
                {/* Logo and Brand */}
                <div className="p-6 flex items-center gap-3">
                    <img src="/images/logo.png" alt="Logo" className="w-12 h-12 object-contain shrink-0" />
                    <span className="text-xl font-bold tracking-tight text-slate-800 dark:text-white leading-tight">
                        {title}
                    </span>
                </div>

                {/* Navigation Menu */}
                <nav className="flex-1 px-4 mt-4 space-y-2 overflow-y-auto">
                    {navItems.map((item) => (
                        <button
                            key={item.key}
                            onClick={() => onItemChange(item.key)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all ${activeItem === item.key
                                ? 'bg-primary/10 text-primary'
                                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-primary'
                                }`}
                            style={activeItem === item.key ? { color: '#DC2626', backgroundColor: 'rgba(220, 38, 38, 0.1)' } : {}}
                        >
                            <span className="material-symbols-outlined">{item.icon}</span>
                            <span>{item.label}</span>
                        </button>
                    ))}
                </nav>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 min-w-0">
                {/* Desktop Header */}
                <header className={`hidden lg:flex ${navItems.length === 0 ? 'justify-between' : 'justify-end'} items-center px-8 py-4 lg:py-6 gap-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40`}>
                    {navItems.length === 0 && (
                        <div className="flex items-center gap-3">
                            <img src="/images/logo.png" alt="Logo" className="w-10 h-10 object-contain shrink-0" />
                            <span className="text-xl font-bold tracking-tight text-slate-800 dark:text-white leading-tight">
                                {title}
                            </span>
                        </div>
                    )}

                    <div className="flex items-center gap-4">
                        {/* Notification Icon with Dropdown */}
                        <div className="relative" ref={notificationDropdownRef}>
                            <button
                                onClick={() => setShowNotificationDropdown(!showNotificationDropdown)}
                                className="relative h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
                            >
                                <span className="material-symbols-outlined">notifications</span>
                                {unreadCount > 0 && (
                                    <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-900"></span>
                                )}
                            </button>

                            {/* Desktop Notification Dropdown */}
                            {showNotificationDropdown && (
                                <div className="absolute top-14 right-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-[60] w-80 max-h-96 overflow-y-auto">
                                    <div className="p-4 border-b border-slate-200 dark:border-slate-800">
                                        <h3 className="text-lg font-bold text-slate-800 dark:text-white">Notifications</h3>
                                    </div>
                                    <div className="py-2">
                                        {notifications.length > 0 ? (
                                            notifications.map((notification: any, index: number) => (
                                                <div
                                                    key={index}
                                                    className={`px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer border-b border-slate-100 dark:border-slate-800/50 last:border-0 ${!notification.is_read ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''
                                                        }`}
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
                                </div>
                            )}
                        </div>

                        {/* Profile Icon with Dropdown */}
                        <div className="relative" ref={profileDropdownRef}>
                            <button
                                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                                className="h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
                            >
                                <span className="material-symbols-outlined">person</span>
                            </button>

                            {/* Desktop Profile Dropdown */}
                            {showProfileDropdown && (
                                <div className="absolute top-14 right-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-[60] min-w-[180px]">
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
                                        {profile?.role !== 'attendee' && (
                                            <button
                                                onClick={() => {
                                                    setShowProfileDropdown(false);
                                                    // TODO: Implement leaderboard modal
                                                }}
                                                className="w-full flex items-center gap-3 px-4 py-3 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                                            >
                                                <span className="material-symbols-outlined text-xl">leaderboard</span>
                                                <span className="font-medium">Leaderboard</span>
                                            </button>
                                        )}
                                        <button
                                            onClick={() => {
                                                setShowProfileDropdown(false);
                                                // Navigate to settings - you can add onSettingsClick prop if needed
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
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                {/* Mobile Header */}
                <header className="lg:hidden bg-white dark:bg-slate-900 px-6 py-4 flex items-center justify-between z-40 sticky top-0 border-b border-slate-200 dark:border-slate-800">
                    {/* Logo */}
                    <div className="flex items-center gap-3">
                        <img src="/images/logo.png" alt="Logo" className="w-10 h-10 object-contain shrink-0" />
                        <h1 className="text-xl font-bold tracking-tight text-slate-800 dark:text-white leading-tight">
                            {title}
                        </h1>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Notification Icon */}
                        <button
                            onClick={() => setShowNotificationDropdown(!showNotificationDropdown)}
                            className="relative h-9 w-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 cursor-pointer active:scale-95 transition-transform"
                        >
                            <span className="material-symbols-outlined text-xl">notifications</span>
                            {unreadCount > 0 && (
                                <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-900"></span>
                            )}
                        </button>

                        {/* Profile Dropdown Button */}
                        <button
                            onClick={() => setShowMobileProfileDropdown(!showMobileProfileDropdown)}
                            className="relative h-9 w-9 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 active:scale-95 transition-transform"
                        >
                            <span className="material-symbols-outlined">person</span>
                        </button>
                    </div>
                </header>

                {/* Mobile Notification Dropdown */}
                {showNotificationDropdown && (
                    <div ref={notificationDropdownRef} className="lg:hidden absolute top-[73px] right-6 left-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-[60] max-h-96 overflow-y-auto">
                        <div className="p-4 border-b border-slate-200 dark:border-slate-800">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white">Notifications</h3>
                        </div>
                        <div className="py-2">
                            {notifications.length > 0 ? (
                                notifications.map((notification: any, index: number) => (
                                    <div
                                        key={index}
                                        className={`px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer border-b border-slate-100 dark:border-slate-800/50 last:border-0 ${!notification.is_read ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''
                                            }`}
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
                    </div>
                )}

                {/* Mobile Profile Dropdown Menu */}
                {showMobileProfileDropdown && (
                    <div ref={mobileProfileDropdownRef} className="lg:hidden absolute top-[73px] right-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-[55] min-w-[180px]">
                        <nav className="py-2">
                            <button
                                onClick={() => {
                                    setShowMobileProfileDropdown(false);
                                    onProfileClick?.();
                                }}
                                className="w-full flex items-center gap-3 px-4 py-3 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                            >
                                <span className="material-symbols-outlined text-xl">person</span>
                                <span className="font-medium">Profile</span>
                            </button>
                            {profile?.role !== 'attendee' && (
                                <button
                                    onClick={() => {
                                        setShowMobileProfileDropdown(false);
                                        // TODO: Implement leaderboard modal
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-3 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                                >
                                    <span className="material-symbols-outlined text-xl">leaderboard</span>
                                    <span className="font-medium">Leaderboard</span>
                                </button>
                            )}
                            <button
                                onClick={() => {
                                    setShowMobileProfileDropdown(false);
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
                    </div>
                )}

                {/* Content */}
                <div className="p-6 lg:p-8 pb-32 lg:pb-8">
                    {children}
                </div>
            </main>

            {/* Mobile Bottom Navigation - Floating Dock */}
            {!hideDock && navItems.length > 0 && (
                <div className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-[450px] z-50">
                    <nav className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 px-4 py-3 rounded-[28px] shadow-2xl flex justify-between items-center overflow-x-auto">
                        {navItems.map((item) => (
                            <button
                                key={item.key}
                                onClick={() => onItemChange(item.key)}
                                className={`flex flex-col items-center gap-1 transition-colors min-w-[60px] ${activeItem === item.key
                                    ? 'text-primary'
                                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                                    }`}
                                style={activeItem === item.key ? { color: '#DC2626' } : {}}
                            >
                                <span className="material-symbols-outlined">{item.icon}</span>
                                <span className="text-[10px] font-bold">{item.label}</span>
                            </button>
                        ))}
                    </nav>
                </div>
            )}


        </div>
    );
};

export default SharedNavigation;