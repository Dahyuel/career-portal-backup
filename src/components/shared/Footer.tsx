import React from 'react';

export const Footer: React.FC = () => {
    return (
        <footer className="bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300 py-4 transition-colors duration-300 border-t border-gray-200 dark:border-gray-800">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-center gap-3">
                    <div className="bg-white rounded-full p-1 shadow-md">
                        <img
                            src="/images/logo_ain_shams.png"
                            alt="Ain Shams University Logo"
                            className="h-8 w-8 rounded-full object-cover"
                        />
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 text-sm text-center">© Powered by FCIS ASU, All rights reserved.</p>
                </div>
            </div>
        </footer>
    );
};
