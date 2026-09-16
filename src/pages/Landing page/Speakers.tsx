import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, Linkedin, ChevronRight, ChevronLeft, Calendar } from '../../components/icons';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { supabase } from '../../lib/supabase';
import { motion } from 'framer-motion';
import { logger } from '../../utils/logger';

const SPEAKERS_PER_PAGE = 18;

// Speaker type matching the database schema
interface Speaker {
    id: string;
    first_name: string;
    last_name: string;
    title: string;
    linkedin_url?: string;
    photo_url?: string;
    appearance_title?: string;
    appearance_type?: string;
    appearance_start_time?: string;
    source?: 'session' | 'schedule';
}

const SpeakerCard: React.FC<{ speaker: Speaker }> = ({ speaker }) => {
    const [isFlipped, setIsFlipped] = useState(false);

    // Reset flipped state when the speaker changes (e.g., during pagination if components are reused)
    useEffect(() => {
        setIsFlipped(false);
    }, [speaker]);

    const handleFlip = () => {
        setIsFlipped(!isFlipped);
    };

    const fullName = `${speaker.first_name} ${speaker.last_name}`;
    const gradientClass = 'from-red-500/45 via-orange-400/30 to-orange-100/15 dark:from-red-600/45 dark:via-orange-700/30 dark:to-orange-900/15';

    return (
        <div
            className="perspective-1000 h-[420px] cursor-pointer group"
            onClick={handleFlip}
        >
            <div
                className={`relative w-full h-full transition-transform duration-700 transform-style-3d ${isFlipped ? 'rotate-y-180' : ''}`}
            >
                {/* Front of card */}
                <div className="absolute w-full h-full backface-hidden">
                    <div className="h-full bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden hover:shadow-xl transition-shadow duration-300">
                        {/* Image Section */}
                        <div className={`relative h-64 overflow-hidden bg-gradient-to-br ${gradientClass} flex items-center justify-center`}>
                            {speaker.photo_url ? (
                                <img
                                    src={speaker.photo_url}
                                    alt={fullName}
                                    className="h-full w-auto object-cover max-w-full mx-auto transition-transform duration-500 group-hover:scale-105"
                                    style={{
                                        maskImage: 'linear-gradient(to right, transparent, black 5%, black 95%, transparent)',
                                        WebkitMaskImage: 'linear-gradient(to right, transparent, black 5%, black 95%, transparent)'
                                    }}
                                    onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                        e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                    }}
                                />
                            ) : null}
                            {/* Fallback Initials */}
                            <div className={`${speaker.photo_url ? 'hidden' : ''} absolute inset-0 bg-gradient-to-br from-red-100 to-red-200 dark:from-red-900/30 dark:to-gray-800 flex items-center justify-center`}>
                                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center shadow-xl">
                                    <span className="text-4xl font-bold text-white">
                                        {fullName.split(' ').map(n => n[0]).join('')}
                                    </span>
                                </div>
                            </div>

                            {/* Gradient Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20"></div>
                            {/* Decorative elements */}
                            <div className="absolute top-4 right-4 p-2 bg-white/20 dark:bg-black/20 backdrop-blur-sm rounded-full z-20">
                                <Mic className="w-5 h-5 text-red-600 dark:text-red-400" />
                            </div>
                        </div>

                        {/* Info Section */}
                        <div className="p-6">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                                {fullName}
                            </h3>
                            <p className="text-red-600 dark:text-red-400 font-medium mb-1">
                                {speaker.title}
                            </p>

                            {/* Click to flip hint */}
                            <div className="flex items-center justify-center gap-2 text-sm text-gray-400 dark:text-gray-500 group-hover:text-red-500 transition-colors mt-4">
                                <span>Click to learn more</span>
                                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Back of card */}
                <div className="absolute w-full h-full backface-hidden rotate-y-180">
                    <div className="h-full bg-gradient-to-br from-red-600 to-red-700 dark:from-red-700 dark:to-red-900 rounded-2xl shadow-lg p-6 flex flex-col overflow-hidden">
                        {/* Title Badge */}
                        <div className="mb-3">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/20 backdrop-blur-sm text-white text-sm font-medium rounded-full">
                                <Mic className="w-4 h-4" />
                                Speaker
                            </span>
                        </div>

                        <h4 className="text-xl font-bold text-white mb-2">
                            {fullName}
                        </h4>

                        <p className="text-red-100 text-sm leading-relaxed">
                            {speaker.title}
                        </p>

                        {/* Session/Schedule Info */}
                        {speaker.appearance_title && (
                            <div className="mt-4 p-3.5 bg-white/10 backdrop-blur-sm rounded-xl border border-white/15">
                                <div className="flex items-center gap-2 mb-2">
                                    <Calendar className="w-4 h-4 text-red-200" />
                                    <span className="text-xs font-semibold text-red-200 uppercase tracking-wider">
                                        {speaker.source === 'schedule' ? 'Schedule' : 'Session'}
                                    </span>
                                </div>
                                <p className="text-white font-semibold text-sm mb-1.5">
                                    {speaker.appearance_title}
                                </p>
                                {speaker.appearance_type && (
                                    <span className="inline-block mt-2 px-2 py-0.5 bg-white/15 text-white/90 text-[10px] font-bold uppercase tracking-wider rounded-full">
                                        {speaker.appearance_type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                                    </span>
                                )}
                            </div>
                        )}
                        {/* Social Links + Flip hint */}
                        <div className="mt-auto pt-3">
                            {speaker.linkedin_url && (
                                <div className="flex gap-3 mb-3 pt-3 border-t border-white/20">
                                    <a
                                        href={speaker.linkedin_url.startsWith('http') ? speaker.linkedin_url : `https://${speaker.linkedin_url}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
                                    >
                                        <Linkedin className="w-5 h-5 text-white" />
                                    </a>
                                </div>
                            )}
                            <div className="text-center text-sm text-red-200">
                                Click to flip back
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const Speakers: React.FC = () => {
    const [speakers, setSpeakers] = useState<Speaker[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const gridRef = useRef<HTMLDivElement>(null);

    const totalPages = Math.ceil(speakers.length / SPEAKERS_PER_PAGE);
    const startIndex = (currentPage - 1) * SPEAKERS_PER_PAGE;
    const paginatedSpeakers = speakers.slice(startIndex, startIndex + SPEAKERS_PER_PAGE);

    const goToPage = useCallback((page: number) => {
        setCurrentPage(page);
        // Scroll to the top of the grid section
        gridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, []);

    useEffect(() => {
        const fetchSpeakers = async () => {
            try {
                const { data, error } = await supabase.rpc('get_speakers');

                if (error) {
                    logger.error('Error fetching speakers:', error);
                    return;
                }

                setSpeakers(data || []);
            } catch (err) {
                logger.error('Error fetching speakers:', err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchSpeakers();
    }, []);

    // Generate page numbers to display
    const getPageNumbers = () => {
        const pages: (number | '...')[] = [];
        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            pages.push(1);
            if (currentPage > 3) pages.push('...');
            for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
                pages.push(i);
            }
            if (currentPage < totalPages - 2) pages.push('...');
            pages.push(totalPages);
        }
        return pages;
    };

    return (
        <div className="min-h-screen bg-white dark:bg-gray-950 transition-colors duration-300">
            <Navbar />

            {/* Hero Section */}
            <div className="relative pt-32 pb-12 md:pt-40 md:pb-20 overflow-hidden">
                <div className="absolute inset-0 z-0">
                    <div className="absolute inset-0 bg-gradient-to-b from-red-50/50 via-white to-white dark:from-red-900/10 dark:via-gray-950 dark:to-gray-950"></div>
                </div>

                <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <div className="inline-flex items-center justify-center p-2 bg-red-100 dark:bg-red-900/30 rounded-full mb-6 shadow-sm">
                        <Mic className="w-5 h-5 text-red-600 dark:text-red-400 mr-2" />
                        <span className="text-sm font-semibold text-red-700 dark:text-red-300">Industry Leaders</span>
                    </div>
                    <h1 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6 leading-tight">
                        Our <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-800 to-red-600">Speakers</span>
                    </h1>
                    <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed">
                        Meet the industry experts and thought leaders who will share their insights, experiences, and career advice at ASU Career Expo 2026.
                    </p>
                </div>
            </div>

            {/* Speakers Grid */}
            <section ref={gridRef} className="py-12 md:py-20 bg-gray-50 dark:bg-gray-900/50 scroll-mt-24">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <div className="relative w-16 h-16 mb-4">
                                <div className="absolute inset-0 border-4 border-slate-200 dark:border-slate-800 rounded-full" />
                                <motion.div
                                    className="absolute inset-0 border-4 border-transparent border-t-red-600 rounded-full"
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                />
                            </div>
                            <p className="text-gray-500 dark:text-gray-400 font-medium">Loading speakers...</p>
                        </div>
                    ) : speakers.length === 0 ? (
                        <div className="text-center py-20">
                            <span className="material-symbols-outlined text-6xl text-gray-300 dark:text-gray-700 mb-3 block">
                                mic_off
                            </span>
                            <p className="text-lg font-semibold text-gray-600 dark:text-gray-400">Speakers will be announced soon</p>
                            <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">Check back later for our lineup</p>
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                                {paginatedSpeakers.map((speaker) => (
                                    <SpeakerCard key={speaker.id} speaker={speaker} />
                                ))}
                            </div>

                            {/* Pagination Controls */}
                            {totalPages > 1 && (
                                <div className="mt-12 flex flex-col items-center gap-4">
                                    <div className="flex items-center gap-2">
                                        {/* Previous Button */}
                                        <button
                                            onClick={() => goToPage(currentPage - 1)}
                                            disabled={currentPage === 1}
                                            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-red-50 hover:border-red-200 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:border-red-800 dark:hover:text-red-400 shadow-sm"
                                        >
                                            <ChevronLeft className="w-4 h-4" />
                                            <span className="hidden sm:inline">Previous</span>
                                        </button>

                                        {/* Page Numbers */}
                                        <div className="flex items-center gap-1.5">
                                            {getPageNumbers().map((page, idx) =>
                                                page === '...' ? (
                                                    <span key={`dots-${idx}`} className="px-2 text-gray-400 dark:text-gray-600 text-sm">
                                                        ···
                                                    </span>
                                                ) : (
                                                    <button
                                                        key={page}
                                                        onClick={() => goToPage(page as number)}
                                                        className={`w-10 h-10 rounded-xl text-sm font-semibold transition-all duration-200 ${currentPage === page
                                                                ? 'bg-gradient-to-br from-red-600 to-red-700 text-white shadow-md shadow-red-500/25'
                                                                : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-red-50 hover:border-red-200 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:border-red-800 dark:hover:text-red-400'
                                                            }`}
                                                    >
                                                        {page}
                                                    </button>
                                                )
                                            )}
                                        </div>

                                        {/* Next Button */}
                                        <button
                                            onClick={() => goToPage(currentPage + 1)}
                                            disabled={currentPage === totalPages}
                                            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-red-50 hover:border-red-200 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:border-red-800 dark:hover:text-red-400 shadow-sm"
                                        >
                                            <span className="hidden sm:inline">Next</span>
                                            <ChevronRight className="w-4 h-4" />
                                        </button>
                                    </div>

                                    {/* Page Info */}
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        Showing {startIndex + 1}–{Math.min(startIndex + SPEAKERS_PER_PAGE, speakers.length)} of {speakers.length} speakers
                                    </p>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </section>

            {/* Call to Action */}
            <section className="py-16 bg-white dark:bg-gray-950">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-4">
                        More Speakers Coming Soon!
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-8">
                        We're adding more incredible speakers to our lineup. Stay tuned for updates and don't miss the opportunity to learn from the best in the industry.
                    </p>
                </div>
            </section>
            <Footer />
        </div>
    );
};

export default Speakers;
