import React, { useState, useEffect } from 'react';
import { Mic, Linkedin, Twitter, Globe, ChevronRight } from 'lucide-react';
import { Navbar } from '../../components/shared/Navbar';
import { supabase } from '../../lib/supabase';
import { motion } from 'framer-motion';

// Speaker type matching the database schema
interface Speaker {
    id: string;
    first_name: string;
    last_name: string;
    title: string;
    linkedin_url?: string;
    photo_url?: string;
}

const SpeakerCard: React.FC<{ speaker: Speaker }> = ({ speaker }) => {
    const [isFlipped, setIsFlipped] = useState(false);

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
                                    className="h-full w-auto object-cover max-w-full mx-auto transition-transform duration-500 group-hover:scale-105 relative z-10"
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
                    <div className="h-full bg-gradient-to-br from-red-600 to-red-700 dark:from-red-700 dark:to-red-900 rounded-2xl shadow-lg p-6 flex flex-col">
                        {/* Title Badge */}
                        <div className="mb-4">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/20 backdrop-blur-sm text-white text-sm font-medium rounded-full">
                                <Mic className="w-4 h-4" />
                                Speaker
                            </span>
                        </div>

                        <h4 className="text-xl font-bold text-white mb-4">
                            {fullName}
                        </h4>

                        <p className="text-red-100 text-sm leading-relaxed flex-grow">
                            {speaker.title}
                        </p>

                        {/* Social Links */}
                        {speaker.linkedin_url && (
                            <div className="flex gap-3 mt-4 pt-4 border-t border-white/20">
                                <a
                                    href={speaker.linkedin_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
                                >
                                    <Linkedin className="w-5 h-5 text-white" />
                                </a>
                            </div>
                        )}

                        {/* Click to flip back hint */}
                        <div className="mt-4 text-center text-sm text-red-200">
                            Click to flip back
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

    useEffect(() => {
        const fetchSpeakers = async () => {
            try {
                const { data, error } = await supabase
                    .from('speaker')
                    .select('id, first_name, last_name, title, linkedin_url, photo_url')
                    .order('created_at', { ascending: true });

                if (error) {
                    console.error('Error fetching speakers:', error);
                    return;
                }

                setSpeakers(data || []);
            } catch (err) {
                console.error('Error fetching speakers:', err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchSpeakers();
    }, []);

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
            <section className="py-12 md:py-20 bg-gray-50 dark:bg-gray-900/50">
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
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                            {speakers.map((speaker) => (
                                <SpeakerCard key={speaker.id} speaker={speaker} />
                            ))}
                        </div>
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
        </div>
    );
};

export default Speakers;
