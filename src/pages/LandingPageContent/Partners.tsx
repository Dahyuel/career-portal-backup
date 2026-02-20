import React from 'react';
import { Building2, Star, Award, Trophy, Medal } from 'lucide-react';
import { Navbar } from '../../components/shared/Navbar';

interface Sponsor {
    name: string;
    logo: string;
}

interface SponsorCategory {
    tier: string;
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

const sponsorCategories: SponsorCategory[] = [
    {
        tier: 'Diamond',
        icon: <Trophy className="w-5 h-5" />,
        headerGradient: 'from-cyan-400 via-sky-400 to-blue-500',
        badgeBg: 'bg-gradient-to-r from-cyan-100 to-sky-100 dark:from-cyan-900/50 dark:to-sky-900/50',
        badgeText: 'text-cyan-700 dark:text-cyan-300',
        glowColor: 'hover:shadow-[0_8px_40px_0px_rgba(6,182,212,0.35)]',
        borderHover: 'hover:border-cyan-400 dark:hover:border-cyan-500',
        dividerGradient: 'from-cyan-400 to-sky-500',
        logoHeight: 'h-32 md:h-40',
        cardWidth: 'w-72 md:w-80',
        sponsors: [
            { name: 'Banque Misr', logo: '/images/SponsorsLogos/Banque Misr.png' },
        ],
    },
    {
        tier: 'Platinum',
        icon: <Award className="w-5 h-5" />,
        headerGradient: 'from-indigo-400 via-violet-400 to-purple-500',
        badgeBg: 'bg-gradient-to-r from-indigo-100 to-violet-100 dark:from-indigo-900/50 dark:to-violet-900/50',
        badgeText: 'text-indigo-700 dark:text-indigo-300',
        glowColor: 'hover:shadow-[0_8px_40px_0px_rgba(99,102,241,0.4)]',
        borderHover: 'hover:border-indigo-400 dark:hover:border-indigo-500',
        dividerGradient: 'from-indigo-400 to-violet-500',
        logoHeight: 'h-28 md:h-36',
        cardWidth: 'w-68 md:w-72',
        sponsors: [
            { name: 'Ejada', logo: '/images/SponsorsLogos/Ejada.png' },
        ],
    },
    {
        tier: 'Gold',
        icon: <Star className="w-5 h-5" />,
        headerGradient: 'from-amber-400 via-yellow-400 to-orange-400',
        badgeBg: 'bg-gradient-to-r from-amber-100 to-yellow-100 dark:from-amber-900/50 dark:to-yellow-900/50',
        badgeText: 'text-amber-700 dark:text-amber-300',
        glowColor: 'hover:shadow-[0_8px_40px_0px_rgba(251,191,36,0.4)]',
        borderHover: 'hover:border-amber-400 dark:hover:border-amber-500',
        dividerGradient: 'from-amber-400 to-yellow-500',
        logoHeight: 'h-24 md:h-32',
        cardWidth: 'w-64 md:w-72',
        sponsors: [
            { name: 'El Sewedy Electric', logo: '/images/SponsorsLogos/Elsewedy.png' },
        ],
    },
    {
        tier: 'Silver',
        icon: <Medal className="w-5 h-5" />,
        headerGradient: 'from-gray-400 via-slate-400 to-gray-500',
        badgeBg: 'bg-gradient-to-r from-gray-100 to-slate-100 dark:from-gray-800/50 dark:to-slate-800/50',
        badgeText: 'text-gray-700 dark:text-gray-300',
        glowColor: 'hover:shadow-[0_8px_40px_0px_rgba(156,163,175,0.35)]',
        borderHover: 'hover:border-gray-400 dark:hover:border-gray-500',
        dividerGradient: 'from-gray-400 to-slate-500',
        logoHeight: 'h-20 md:h-28',
        cardWidth: 'w-56 md:w-64',
        sponsors: [
            { name: 'Premier Services & Recruitment', logo: '/images/SponsorsLogos/Premier.png' },
            { name: 'Just HR', logo: '/images/SponsorsLogos/Just HR.png' },
            { name: 'Korra Energi', logo: '/images/SponsorsLogos/Korra.png' },
            { name: 'Nestlé', logo: '/images/SponsorsLogos/Nestle.png' },
            { name: 'Fine Hygienic Holding', logo: '/images/SponsorsLogos/Fine hygienic holding.png' },
            { name: 'Talabat', logo: '/images/SponsorsLogos/Talabat.png' },
        ],
    },
];

export const Partners: React.FC = () => {
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
                        Meet our sponsors — the industry giants looking for talented individuals like you.
                    </p>
                </div>
            </div>

            {/* Sponsor Categories */}
            <section className="py-12 md:py-20 bg-white dark:bg-gray-950">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-24">
                    {sponsorCategories.map((category) => (
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
                            <div className="flex flex-wrap justify-center gap-8 md:gap-10">
                                {category.sponsors.map((sponsor) => (
                                    <div
                                        key={sponsor.name}
                                        className={`
                                            group relative flex flex-col items-center justify-center
                                            ${category.cardWidth}
                                            bg-white dark:bg-gray-900
                                            border border-gray-200 dark:border-gray-700
                                            ${category.borderHover}
                                            rounded-3xl p-8 md:p-10
                                            shadow-sm ${category.glowColor}
                                            transition-all duration-400
                                            hover:-translate-y-2 cursor-default
                                            overflow-hidden
                                        `}
                                        style={{ transition: 'all 0.35s cubic-bezier(0.4,0,0.2,1)' }}
                                    >
                                        {/* Subtle top-edge gradient bar */}
                                        <div
                                            className={`absolute top-0 left-0 right-0 h-1 rounded-t-3xl bg-gradient-to-r ${category.headerGradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
                                        ></div>

                                        {/* Logo */}
                                        <div className="flex items-center justify-center w-full py-2">
                                            <img
                                                src={sponsor.logo}
                                                alt={`${sponsor.name} logo`}
                                                className={`object-contain ${category.logoHeight} w-full transition-transform duration-300 group-hover:scale-105`}
                                                style={{ maxWidth: '100%' }}
                                            />
                                        </div>

                                        {/* Name */}
                                        <p className="mt-5 text-sm font-semibold text-gray-500 dark:text-gray-400 text-center tracking-wide uppercase">
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
                    <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                        <span className="font-bold text-red-500 dark:text-red-400">📌 Note: </span>
                        These are our event sponsors. Many other exhibitors are joining us.
                    </p>
                </div>
            </section>
        </div>
    );
};

export default Partners;