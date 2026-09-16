import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export const Footer: React.FC = () => {
    const [visitCount, setVisitCount] = useState<number | null>(null);

    useEffect(() => {
        const incrementVisit = async () => {
            try {
                // Increment and get new count on every page load
                const { data, error } = await supabase.rpc('increment_site_visitors');
                if (!error && data) {
                    setVisitCount(data as number);
                }
            } catch (err) {
                console.error('Error tracking visit:', err);
            }
        };

        incrementVisit();
    }, []);

    // Format number with commas  
    const formatNumber = (num: number) => num.toLocaleString();

    return (
        <footer className="bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300 py-4 transition-colors duration-300 border-t border-gray-200 dark:border-gray-800">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-center gap-3 flex-wrap">
                    <div className="bg-white rounded-full p-1 shadow-md">
                        <img
                            src="/images/Ain_Shams_logoo.png"
                            alt="Ain Shams University Logo"
                            className="h-8 w-8 rounded-full object-cover"
                        />
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">© Powered by FCIS ASU, All rights reserved.</p>

                    {visitCount !== null && (
                        <>
                            <span className="text-gray-300 dark:text-gray-600 text-sm select-none">|</span>
                            <div className="flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-red-500" style={{ fontSize: '16px' }}>
                                    visibility
                                </span>
                                <span className="text-sm text-gray-600 dark:text-gray-400">
                                    <span className="font-semibold">{formatNumber(visitCount)}</span> visits
                                </span>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </footer>
    );
};
