import React, { useState, useEffect } from 'react';
import { Building2, Star, Award, Trophy, Medal, Landmark, Loader2 } from '../../components/icons';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { supabase } from '../../lib/supabase';

interface Sponsor {
    name: string;
    logo: string;
}

interface SponsorCategory {
    tier: string;
    partnerTypes: string[]; // maps to partner_type values in DB
    icon: React.ReactNode;
    headerGradient: string;
    badgeBg: string;
    badgeText: string;
    glowColor: string;
    borderHover: string;
    dividerGradient: string;
    sponsors: Sponsor[];
    logoHeight: string;
    cardWidth: string;
}

// Tier configuration (without sponsors — those come from DB)
const tierConfig: Omit<SponsorCategory, 'sponsors'>[] = [
    {
        tier: 'Diamond',
        partnerTypes: ['diamond'],
        icon: <Trophy className="w-5 h-5" />,
        headerGradient: 'from-cyan-400 via-sky-400 to-blue-500',
        badgeBg: 'bg-gradient-to-r from-cyan-100 to-sky-100 dark:from-cyan-900/50 dark:to-sky-900/50',
        badgeText: 'text-cyan-700 dark:text-cyan-300',
        glowColor: 'hover:shadow-[0_8px_40px_0px_rgba(6,182,212,0.35)]',
        borderHover: 'hover:border-cyan-400 dark:hover:border-cyan-500',
        dividerGradient: 'from-cyan-400 to-sky-500',
        logoHeight: 'h-24 md:h-28',
        cardWidth: 'w-56 md:w-64',
    },
    {
        tier: 'Platinum',
        partnerTypes: ['platinum'],
        icon: <Award className="w-5 h-5" />,
        headerGradient: 'from-indigo-400 via-violet-400 to-purple-500',
        badgeBg: 'bg-gradient-to-r from-indigo-100 to-violet-100 dark:from-indigo-900/50 dark:to-violet-900/50',
        badgeText: 'text-indigo-700 dark:text-indigo-300',
        glowColor: 'hover:shadow-[0_8px_40px_0px_rgba(99,102,241,0.4)]',
        borderHover: 'hover:border-indigo-400 dark:hover:border-indigo-500',
        dividerGradient: 'from-indigo-400 to-violet-500',
        logoHeight: 'h-20 md:h-24',
        cardWidth: 'w-52 md:w-60',
    },
    {
        tier: 'Gold',
        partnerTypes: ['gold'],
        icon: <Star className="w-5 h-5" />,
        headerGradient: 'from-amber-400 via-yellow-400 to-orange-400',
        badgeBg: 'bg-gradient-to-r from-amber-100 to-yellow-100 dark:from-amber-900/50 dark:to-yellow-900/50',
        badgeText: 'text-amber-700 dark:text-amber-300',
        glowColor: 'hover:shadow-[0_8px_40px_0px_rgba(251,191,36,0.4)]',
        borderHover: 'hover:border-amber-400 dark:hover:border-amber-500',
        dividerGradient: 'from-amber-400 to-yellow-500',
        logoHeight: 'h-18 md:h-22',
        cardWidth: 'w-48 md:w-56',
    },
    {
        tier: 'Silver',
        partnerTypes: ['silver'],
        icon: <Medal className="w-5 h-5" />,
        headerGradient: 'from-gray-400 via-slate-400 to-gray-500',
        badgeBg: 'bg-gradient-to-r from-gray-100 to-slate-100 dark:from-gray-800/50 dark:to-slate-800/50',
        badgeText: 'text-gray-700 dark:text-gray-300',
        glowColor: 'hover:shadow-[0_8px_40px_0px_rgba(156,163,175,0.35)]',
        borderHover: 'hover:border-gray-400 dark:hover:border-gray-500',
        dividerGradient: 'from-gray-400 to-slate-500',
        logoHeight: 'h-16 md:h-20',
        cardWidth: 'w-44 md:w-52',
    },
    {
        tier: 'Exhibitors',
        partnerTypes: ['exhibitor_a', 'exhibitor_b'],
        icon: <Landmark className="w-5 h-5" />,
        headerGradient: 'from-rose-400 via-red-400 to-orange-400',
        badgeBg: 'bg-gradient-to-r from-rose-100 to-red-100 dark:from-rose-900/50 dark:to-red-900/50',
        badgeText: 'text-rose-700 dark:text-rose-300',
        glowColor: 'hover:shadow-[0_8px_40px_0px_rgba(244,63,94,0.3)]',
        borderHover: 'hover:border-rose-400 dark:hover:border-rose-500',
        dividerGradient: 'from-rose-400 to-red-500',
        logoHeight: 'h-14 md:h-18',
        cardWidth: 'w-40 md:w-48',
    },
    {
        tier: 'Student Activity Partners',
        partnerTypes: ['student_activity_partner'],
        icon: <Star className="w-5 h-5" />,
        headerGradient: 'from-fuchsia-400 via-pink-400 to-rose-500',
        badgeBg: 'bg-gradient-to-r from-fuchsia-100 to-pink-100 dark:from-fuchsia-900/50 dark:to-pink-900/50',
        badgeText: 'text-fuchsia-700 dark:text-fuchsia-300',
        glowColor: 'hover:shadow-[0_8px_40px_0px_rgba(217,70,239,0.35)]',
        borderHover: 'hover:border-fuchsia-400 dark:hover:border-fuchsia-500',
        dividerGradient: 'from-fuchsia-400 to-pink-500',
        logoHeight: 'h-14 md:h-18',
        cardWidth: 'w-40 md:w-48',
    },
    {
        tier: 'Community Partners',
        partnerTypes: ['community_partner'],
        icon: <Building2 className="w-5 h-5" />,
        headerGradient: 'from-lime-400 via-green-400 to-emerald-500',
        badgeBg: 'bg-gradient-to-r from-lime-100 to-green-100 dark:from-lime-900/50 dark:to-green-900/50',
        badgeText: 'text-lime-700 dark:text-lime-300',
        glowColor: 'hover:shadow-[0_8px_40px_0px_rgba(132,204,22,0.35)]',
        borderHover: 'hover:border-lime-400 dark:hover:border-lime-500',
        dividerGradient: 'from-lime-400 to-green-500',
        logoHeight: 'h-14 md:h-18',
        cardWidth: 'w-40 md:w-48',
    },
    {
        tier: 'Catering Partners',
        partnerTypes: ['catering_partner'],
        icon: <Medal className="w-5 h-5" />,
        headerGradient: 'from-orange-500 via-red-400 to-rose-500',
        badgeBg: 'bg-gradient-to-r from-orange-100 to-red-100 dark:from-orange-900/50 dark:to-red-900/50',
        badgeText: 'text-orange-700 dark:text-orange-300',
        glowColor: 'hover:shadow-[0_8px_40px_0px_rgba(234,88,12,0.35)]',
        borderHover: 'hover:border-orange-500 dark:hover:border-orange-400',
        dividerGradient: 'from-orange-500 to-red-500',
        logoHeight: 'h-14 md:h-18',
        cardWidth: 'w-40 md:w-48',
    },
    {
        tier: 'Career Coaching Partners',
        partnerTypes: ['career_coaching_partner'],
        icon: <Award className="w-5 h-5" />,
        headerGradient: 'from-sky-400 via-blue-400 to-indigo-500',
        badgeBg: 'bg-gradient-to-r from-sky-100 to-blue-100 dark:from-sky-900/50 dark:to-blue-900/50',
        badgeText: 'text-sky-700 dark:text-sky-300',
        glowColor: 'hover:shadow-[0_8px_40px_0px_rgba(14,165,233,0.35)]',
        borderHover: 'hover:border-sky-400 dark:hover:border-sky-500',
        dividerGradient: 'from-sky-400 to-blue-500',
        logoHeight: 'h-14 md:h-18',
        cardWidth: 'w-40 md:w-48',
    },
];

export const Partners: React.FC = () => {
    const [sponsorCategories, setSponsorCategories] = useState<SponsorCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchCompanies = async () => {
            try {
                setLoading(true);
                const { data, error: fetchError } = await supabase.rpc('get_partners');

                if (fetchError) {
                    console.error('Error fetching partners:', fetchError);
                    setError('Failed to load partners.');
                    return;
                }

                // Map RPC data into tier categories
                const categories: SponsorCategory[] = tierConfig
                    .map((config) => {
                        const sponsors: Sponsor[] = (data || [])
                            .filter((company: { partner_type: string }) =>
                                config.partnerTypes.includes(company.partner_type)
                            )
                            .map((company: { company_name: string; logo_url: string }) => ({
                                name: company.company_name,
                                logo: company.logo_url,
                            }));

                        return {
                            ...config,
                            sponsors,
                        };
                    })
                    .filter((category) => category.sponsors.length > 0); // Only show tiers with sponsors

                setSponsorCategories(categories);
            } catch (err) {
                console.error('Unexpected error:', err);
                setError('Failed to load partners.');
            } finally {
                setLoading(false);
            }
        };

        fetchCompanies();
    }, []);

    return (
        <div className="min-h-screen bg-white dark:bg-gray-950 transition-colors duration-300">
            <Navbar />

            {/* Hero Section */}
            <div className="relative pt-32 pb-12 md:pt-40 md:pb-20 overflow-hidden">
                <div className="absolute inset-0 z-0">
                    <div className="absolute inset-0 bg-gradient-to-b from-red-50/50 via-white to-white dark:from-red-900/10 dark:via-gray-950 dark:to-gray-950"></div>
                    <div className="absolute top-20 left-1/4 w-80 h-80 bg-red-100/40 dark:bg-red-900/10 rounded-full blur-3xl"></div>
                    <div className="absolute top-10 right-1/4 w-56 h-56 bg-amber-100/30 dark:bg-amber-900/10 rounded-full blur-3xl"></div>
                </div>

                <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <div className="inline-flex items-center justify-center p-2 bg-red-100 dark:bg-red-900/30 rounded-full mb-6 shadow-sm">
                        <Building2 className="w-5 h-5 text-red-600 dark:text-red-400 mr-2" />
                        <span className="text-sm font-semibold text-red-700 dark:text-red-300">Our Sponsors</span>
                    </div>
                    <h1 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6 leading-tight">
                        Leading{' '}
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-800 to-red-600">
                            Companies
                        </span>{' '}
                        Joining Us
                    </h1>
                    <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed">
                        Meet our partners — the industry giants looking for talented individuals like you.
                    </p>
                </div>
            </div>

            {/* Sponsor Categories */}
            <section className="py-12 md:py-20 bg-white dark:bg-gray-950">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-24">

                    {/* Loading State */}
                    {loading && (
                        <div className="flex flex-col items-center justify-center py-20">
                            <Loader2 className="w-10 h-10 text-red-500 animate-spin mb-4" />
                            <p className="text-gray-500 dark:text-gray-400 font-medium">Loading partners...</p>
                        </div>
                    )}

                    {/* Error State */}
                    {error && !loading && (
                        <div className="text-center py-20">
                            <p className="text-red-500 font-medium">{error}</p>
                        </div>
                    )}

                    {/* No Partners */}
                    {!loading && !error && sponsorCategories.length === 0 && (
                        <div className="text-center py-20">
                            <p className="text-gray-500 dark:text-gray-400 font-medium">Partners coming soon. Stay tuned!</p>
                        </div>
                    )}

                    {/* Sponsor Tiers */}
                    {!loading && !error && sponsorCategories.map((category) => (
                        <div key={category.tier}>
                            {/* Tier Header */}
                            <div className="flex items-center gap-4 mb-12">
                                <div
                                    className={`flex items-center gap-2 px-5 py-2 rounded-full ${category.badgeBg} ${category.badgeText} font-bold text-base tracking-wide shadow-sm`}
                                >
                                    {category.icon}
                                    <span>{category.tier}</span>
                                </div>
                                <div
                                    className={`flex-1 h-[2px] rounded-full bg-gradient-to-r ${category.dividerGradient} opacity-25`}
                                ></div>
                            </div>

                            {/* Sponsor Cards */}
                            <div className="flex flex-wrap justify-center gap-3 md:gap-8">
                                {category.sponsors.map((sponsor) => (
                                    <div
                                        key={sponsor.name}
                                        className={`
                                            group relative flex flex-col items-center
                                            w-[calc(50%-0.375rem)] md:w-48 h-44 md:h-56
                                            bg-white dark:bg-gray-900
                                            border border-gray-200 dark:border-gray-700
                                            ${category.borderHover}
                                            rounded-2xl md:rounded-3xl p-2.5 md:p-5
                                            shadow-sm ${category.glowColor}
                                            hover:-translate-y-2 cursor-default
                                            overflow-hidden
                                        `}
                                        style={{ transition: 'all 0.35s cubic-bezier(0.4,0,0.2,1)' }}
                                    >
                                        {/* Subtle top-edge gradient bar */}
                                        <div
                                            className={`absolute top-0 left-0 right-0 h-1 rounded-t-3xl bg-gradient-to-r ${category.headerGradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
                                        ></div>

                                        {/* Logo Container — fixed height */}
                                        <div className="flex items-center justify-center w-full h-28 mt-2">
                                            {sponsor.logo ? (
                                                <img
                                                    src={sponsor.logo}
                                                    alt={`${sponsor.name} logo`}
                                                    className="object-contain w-full h-full transition-transform duration-300 group-hover:scale-105"
                                                    onError={(e) => {
                                                        const img = e.target as HTMLImageElement;
                                                        img.style.display = 'none';
                                                        // Show the fallback sibling
                                                        const fallback = img.nextElementSibling as HTMLElement;
                                                        if (fallback) fallback.style.display = 'flex';
                                                    }}
                                                />
                                            ) : null}
                                            {/* Fallback icon (shown when no logo or image fails) */}
                                            <div
                                                className="items-center justify-center w-full h-full"
                                                style={{ display: sponsor.logo ? 'none' : 'flex' }}
                                            >
                                                <Building2 className="w-12 h-12 text-gray-300 dark:text-gray-600" />
                                            </div>
                                        </div>

                                        {/* Name — always at the bottom */}
                                        <p className="mt-auto text-xs font-semibold text-gray-500 dark:text-gray-400 text-center tracking-wide uppercase leading-tight line-clamp-2">
                                            {sponsor.name}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-24 mx-auto max-w-2xl px-4 space-y-4">
                    <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-2xl px-8 py-8 text-center">
                        <p className="text-base font-semibold text-gray-700 dark:text-gray-200">
                            More partners are joining us soon. Stay tuned!
                        </p>
                    </div>
                </div>
            </section>
            <Footer />
        </div>
    );
};

export default Partners;