// Navbar with mobile hamburger menu

import React, { useState } from 'react';
import { Sun, Moon, Menu, X } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

export const Navbar: React.FC = () => {
    const { toggleTheme, isDark } = useTheme();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

    return (
        <nav className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-7xl bg-white/75 dark:bg-gray-900/75 backdrop-blur-md border border-white/20 dark:border-gray-700/30 shadow-lg ease-in-out transform-gpu ${isMenuOpen ? 'rounded-3xl duration-0' : 'rounded-full duration-300 transition-[border-radius,background-color]'}`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16 md:h-20">
                    {/* Left Logo - Career Center - Links to Home */}
                    <a href="/" className="flex items-center cursor-pointer">
                        <img
                            src="/images/logo.png"
                            alt="Career Center Logo"
                            className="h-12 w-12 md:h-14 md:w-14 rounded-full object-cover shadow-md ring-2 ring-red-200 dark:ring-red-500/30"
                        />
                        <div className="ml-3 hidden sm:block">
                            <p className="text-md font-bold text-gray-900 dark:text-white">Ain Shams University</p>
                            <p className="text-sm font-bold text-red-700 dark:text-red-600">Career Center</p>
                        </div>
                    </a>

                    {/* Center - Navigation / Title (Desktop) */}
                    <div className="hidden md:flex items-center space-x-8">
                        <a href="/#about" className="text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 font-semibold transition-colors">About</a>
                        <a href="/#features" className="text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 font-semibold transition-colors">Why Attend</a>
                        <a href="/#schedule" className="text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 font-semibold transition-colors">Schedule</a>
                    </div>

                    {/* Right Side - Theme Toggle, ASU Logo, Mobile Menu Button */}
                    <div className="flex items-center space-x-3 md:space-x-4">
                        {/* Theme Toggle */}
                        <button
                            onClick={toggleTheme}
                            className="p-2 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-red-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-all duration-300 hover:scale-110"
                            aria-label="Toggle theme"
                        >
                            {isDark ? (
                                <Sun className="h-5 w-5 text-red-400" />
                            ) : (
                                <Moon className="h-5 w-5 text-gray-600" />
                            )}
                        </button>

                        {/* Right Logo - Ain Shams University with constant white background */}
                        <div className="bg-white rounded-full p-1 shadow-md">
                            <img
                                src="/images/logo_ain_shams.png"
                                alt="Ain Shams University Logo"
                                className="h-10 w-10 md:h-12 md:w-12 rounded-full object-cover"
                            />
                        </div>

                        {/* Mobile Menu Button */}
                        <button
                            onClick={toggleMenu}
                            className="md:hidden p-2 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-red-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-all duration-300"
                            aria-label="Toggle menu"
                        >
                            {isMenuOpen ? (
                                <X className="h-5 w-5" />
                            ) : (
                                <Menu className="h-5 w-5" />
                            )}
                        </button>
                    </div>
                </div>

                {/* Mobile Menu Dropdown */}
                {isMenuOpen && (
                    <div className="md:hidden border-t border-gray-200 dark:border-gray-700 py-4 animate-fadeIn">
                        <div className="flex flex-col space-y-3">
                            <a
                                href="/#about"
                                onClick={() => setIsMenuOpen(false)}
                                className="text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 font-semibold transition-colors px-2 py-2 rounded-lg hover:bg-red-50 dark:hover:bg-gray-800"
                            >
                                About
                            </a>
                            <a
                                href="/#features"
                                onClick={() => setIsMenuOpen(false)}
                                className="text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 font-semibold transition-colors px-2 py-2 rounded-lg hover:bg-red-50 dark:hover:bg-gray-800"
                            >
                                Why Attend
                            </a>
                            <a
                                href="/#schedule"
                                onClick={() => setIsMenuOpen(false)}
                                className="text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 font-semibold transition-colors px-2 py-2 rounded-lg hover:bg-red-50 dark:hover:bg-gray-800"
                            >
                                Schedule
                            </a>
                        </div>
                    </div>
                )}
            </div>
        </nav>
    );
};
