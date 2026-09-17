// Footer of the public pages. Logo, text and the visit counter come from the active
// event's landing page content (Super Admin → Events → Landing page).
import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { logger } from '../../utils/logger';
import { getLandingContent } from '../../lib/currentEvent';
import { mergeLanding, safeUrl, type LandingContent } from '../../lib/landingContent';

interface FooterProps {
    /** Used by the super admin preview; otherwise the active event's content. */
    content?: LandingContent['footer'];
    /** Preview mode: does not count the visit. */
    preview?: boolean;
}

export const Footer: React.FC<FooterProps> = ({ content: override, preview = false }) => {
    const [visitCount, setVisitCount] = useState<number | null>(null);
    const content = useMemo(() => override ?? mergeLanding(getLandingContent()).footer, [override]);
    const countVisits = content.show && content.show_visits && !preview;

    useEffect(() => {
        if (!countVisits) return;
        const incrementVisit = async () => {
            try {
                // Increment and get new count on every page load
                const { data, error } = await supabase.rpc('increment_site_visitors');
                if (!error && data) {
                    setVisitCount(data as number);
                }
            } catch (err) {
                logger.error('Error tracking visit:', err);
            }
        };

        incrementVisit();
    }, [countVisits]);

    if (!content.show) return null;

    // Format number with commas
    const formatNumber = (num: number) => num.toLocaleString();
    const logo = safeUrl(content.logo_url);

    return (
        <footer className="bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300 py-4 transition-colors duration-300 border-t border-gray-200 dark:border-gray-800">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-center gap-3 flex-wrap">
                    {logo && (
                        <div className="bg-white rounded-full p-1 shadow-md">
                            <img
                                src={logo}
                                alt=""
                                className="h-8 w-8 rounded-full object-cover"
                            />
                        </div>
                    )}
                    {content.text && <p className="text-gray-600 dark:text-gray-400 text-sm">{content.text}</p>}

                    {content.show_visits && visitCount !== null && (
                        <>
                            <span className="text-gray-300 dark:text-gray-600 text-sm select-none">|</span>
                            <div className="flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-[color:var(--a-500)]" style={{ fontSize: '16px' }}>
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
