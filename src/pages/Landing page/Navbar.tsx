// Top menu of the public pages. Its logos, texts and links come from the active
// event's landing page content (Super Admin → Events → Landing page).

import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sun, Moon, Menu, X, ArrowRight } from '../../components/icons';
import { useTheme } from '../../contexts/ThemeContext';
import { getLandingContent } from '../../lib/currentEvent';
import { mergeLanding, safeUrl, type LandingContent } from '../../lib/landingContent';

interface NavbarProps {
    /** Used by the super admin preview; otherwise the active event's content. */
    content?: LandingContent['navbar'];
    /** Preview mode: sits in the page instead of floating, and does not navigate. */
    preview?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ content: override, preview = false }) => {
    const { toggleTheme, isDark } = useTheme();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const navigate = useNavigate();
    const content = useMemo(() => override ?? mergeLanding(getLandingContent()).navbar, [override]);

    if (!content.show) return null;

    const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
    const go = (path: string) => {
        if (preview) return;
        navigate(path);
        setIsMenuOpen(false);
    };

    const leftLogo = safeUrl(content.left_logo_url);
    const rightLogo = safeUrl(content.right_logo_url);
    const items = [
        { show: content.show_partners, label: content.partners_label, path: '/partners' },
        { show: content.show_speakers, label: content.speakers_label, path: '/speakers' },
        { show: content.show_about, label: content.about_label, path: '/about' }
    ].filter((item) => item.show && item.label);

    const position = preview ? 'relative mx-auto mt-4' : 'fixed top-4 left-1/2 -translate-x-1/2';

    return (
        <nav className={`${position} z-50 w-[95%] max-w-7xl bg-white/75 dark:bg-gray-900/75 backdrop-blur-md border border-white/20 dark:border-gray-700/30 shadow-lg ease-in-out transform-gpu ${isMenuOpen ? 'rounded-3xl duration-0' : 'rounded-full duration-300 transition-[border-radius,background-color]'}`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16 md:h-20">
                    {/* Left Logo - Links to Home */}
                    <a
                        href={preview ? undefined : '/'}
                        className="flex items-center cursor-pointer"
                    >
                        {leftLogo && (
                            <img
                                src={leftLogo}
                                alt=""
                                className="h-12 w-12 md:h-14 md:w-14 rounded-full object-cover shadow-md ring-2 ring-[color:var(--a-200)] dark:ring-[color:var(--a-500-30)]"
                            />
                        )}
                        {(content.org_name || content.org_subtitle) && (
                            <div className="ml-3 hidden sm:block">
                                <p className="text-md font-bold text-[color:var(--t-heading)] dark:text-white">{content.org_name}</p>
                                <p className="text-sm font-bold text-[color:var(--a-700)] dark:text-[color:var(--a-600)]">{content.org_subtitle}</p>
                            </div>
                        )}
                    </a>

                    {/* Center - Navigation (Desktop) */}
                    <div className="hidden md:flex items-center space-x-8">
                        {items.map((item) => (
                            <button
                                key={item.path}
                                onClick={() => go(item.path)}
                                className="text-gray-700 dark:text-gray-300 hover:text-[color:var(--a-600)] dark:hover:text-[color:var(--a-400)] font-semibold transition-colors"
                            >
                                {item.label}
                            </button>
                        ))}
                    </div>

                    {/* Right Side - Login, Theme Toggle, Logo, Mobile Menu Button */}
                    <div className="flex items-center space-x-3 md:space-x-4">
                        {content.login_label && (
                            <button
                                onClick={() => go('/login')}
                                className="hidden md:inline-flex group relative items-center justify-center px-6 py-2 bg-gradient-to-r from-[color:var(--a-500)] to-[color:var(--a-600)] rounded-full shadow-md hover:shadow-[color:var(--a-500-30)] hover:shadow-lg transition-all duration-300 transform hover:scale-105 overflow-hidden border border-[color:var(--a-400)]"
                            >
                                <span className="absolute inset-0 bg-gradient-to-r from-[color:var(--a-600)] to-[color:var(--a-700)] opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
                                <div className="relative z-10 flex items-center gap-2">
                                    <span className="text-sm font-bold text-white tracking-wide">{content.login_label}</span>
                                    <ArrowRight className="h-4 w-4 text-white transform group-hover:translate-x-1 transition-transform duration-300" />
                                </div>
                            </button>
                        )}

                        {/* Theme Toggle */}
                        <button
                            onClick={toggleTheme}
                            className="p-2 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-[color:var(--a-100)] dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-all duration-300 hover:scale-110"
                            aria-label="Toggle theme"
                        >
                            {isDark ? (
                                <Sun className="h-5 w-5 text-[color:var(--a-400)]" />
                            ) : (
                                <Moon className="h-5 w-5 text-gray-600" />
                            )}
                        </button>

                        {/* Right Logo with constant white background */}
                        {rightLogo && (
                            <div className="bg-white rounded-full p-1 shadow-md">
                                <img
                                    src={rightLogo}
                                    alt=""
                                    className="h-10 w-10 md:h-12 md:w-12 rounded-full object-cover"
                                />
                            </div>
                        )}

                        {/* Mobile Menu Button */}
                        {(items.length > 0 || content.login_label) && (
                            <button
                                onClick={toggleMenu}
                                className="md:hidden p-2 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-[color:var(--a-100)] dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-all duration-300"
                                aria-label="Toggle menu"
                            >
                                {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                            </button>
                        )}
                    </div>
                </div>

                {/* Mobile Menu Dropdown */}
                {isMenuOpen && (
                    <div className="md:hidden border-t border-gray-200 dark:border-gray-700 py-4 animate-fadeIn">
                        <div className="flex flex-col space-y-3">
                            {items.map((item) => (
                                <button
                                    key={item.path}
                                    onClick={() => go(item.path)}
                                    className="text-left text-gray-700 dark:text-gray-300 hover:text-[color:var(--a-600)] dark:hover:text-[color:var(--a-400)] font-semibold transition-colors px-2 py-2 rounded-lg hover:bg-[color:var(--a-50)] dark:hover:bg-gray-800 w-full"
                                >
                                    {item.label}
                                </button>
                            ))}

                            {content.login_label && (
                                <button
                                    onClick={() => go('/login')}
                                    className="mt-2 w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-[color:var(--a-500)] to-[color:var(--a-600)] text-white rounded-xl shadow-md hover:shadow-lg transition-all active:scale-95"
                                >
                                    <span className="font-bold">{content.login_label}</span>
                                    <ArrowRight className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </nav>
    );
};
