import React, { useState } from 'react';
import { Mic, Linkedin, Twitter, Globe, ChevronRight } from 'lucide-react';
import { Navbar } from '../../components/shared/Navbar';

// Speaker data - you can update this with real speaker information
const speakers = [
    {
        id: 1,
        name: "Dr. Ahmed Hassan",
        title: "CEO",
        company: "TechVision Egypt",
        image: "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=600&h=800&q=80",
        bio: "Leading technology innovator with 20+ years of experience in digital transformation and AI development across MENA region.",
        linkedin: "https://linkedin.com/in/example",
        twitter: "https://twitter.com/example",
        topic: "The Future of AI in Career Development"
    },
    {
        id: 2,
        name: "Eng. Sarah Mohamed",
        title: "HR Director",
        company: "Global Industries",
        image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=600&h=800&q=80",
        bio: "Expert in talent acquisition and development with a passion for bridging the gap between academia and industry.",
        linkedin: "https://linkedin.com/in/example",
        website: "https://example.com",
        topic: "Building Your Personal Brand"
    },
    {
        id: 3,
        name: "Dr. Omar Khalil",
        title: "Founder & CTO",
        company: "StartUp Hub",
        image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=600&h=800&q=80",
        bio: "Serial entrepreneur who has launched 5 successful startups and mentored over 100 young professionals.",
        linkedin: "https://linkedin.com/in/example",
        twitter: "https://twitter.com/example",
        topic: "Entrepreneurship & Innovation"
    },
    {
        id: 4,
        name: "Dr. Layla Ibrahim",
        title: "Regional Manager",
        company: "Multinational Corp",
        image: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=600&h=800&q=80",
        bio: "Seasoned executive with expertise in strategic planning and organizational development across various sectors.",
        linkedin: "https://linkedin.com/in/example",
        topic: "Leadership in the Modern Workplace"
    },
    {
        id: 5,
        name: "Eng. Khaled Youssef",
        title: "Senior Engineer",
        company: "Engineering Excellence",
        image: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=600&h=800&q=80",
        bio: "Award-winning engineer specializing in sustainable infrastructure and green technology solutions.",
        linkedin: "https://linkedin.com/in/example",
        website: "https://example.com",
        topic: "Engineering for a Sustainable Future"
    },
    {
        id: 6,
        name: "Dr. Nadia Mostafa",
        title: "Career Coach",
        company: "Success Pathways",
        image: "https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=600&h=800&q=80",
        bio: "Certified career coach with a track record of helping thousands of graduates land their dream jobs.",
        linkedin: "https://linkedin.com/in/example",
        twitter: "https://twitter.com/example",
        topic: "Acing Your Job Interview"
    },
    {
        id: 7,
        name: "Dr. Kareem Soliman",
        title: "Creative Director",
        company: "Design Matters",
        image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&h=800&q=80",
        bio: "Award-winning creative director helping brands tell their stories through compelling visual narratives.",
        linkedin: "https://linkedin.com/in/example",
        website: "https://example.com",
        topic: "The Power of Visual Storytelling"
    },
    {
        id: 8,
        name: "Eng. Mariam Faheem",
        title: "Product Manager",
        company: "Innovate Tech",
        image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=600&h=800&q=80",
        bio: "Product leader with extensive experience in agile methodologies and user-centered design principles.",
        linkedin: "https://linkedin.com/in/example",
        twitter: "https://twitter.com/example",
        topic: "Product Management 101"
    },
    {
        id: 9,
        name: "Mr. Tarek El-Sayed",
        title: "Financial Analyst",
        company: "Future Finance",
        image: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=600&h=800&q=80",
        bio: "Financial expert specializing in investment strategies and economic forecasting for emerging markets.",
        linkedin: "https://linkedin.com/in/example",
        topic: "Financial Literacy for Young Professionals"
    }
];

interface Speaker {
    id: number;
    name: string;
    title: string;
    company: string;
    image: string;
    bio: string;
    linkedin?: string;
    twitter?: string;
    website?: string;
    topic: string;
}

const SpeakerCard: React.FC<{ speaker: Speaker; index: number }> = ({ speaker, index }) => {
    const [isFlipped, setIsFlipped] = useState(false);

    const handleFlip = () => {
        setIsFlipped(!isFlipped);
    };

    const colorMap = [
        'from-blue-600/30 via-blue-500/15 to-blue-50/5 dark:from-blue-600/30 dark:via-blue-800/15 dark:to-blue-950/5',     // Blue
        'from-emerald-600/30 via-emerald-500/15 to-emerald-100/5 dark:from-emerald-800/30 dark:via-emerald-700/15 dark:to-emerald-950/5', // Darker Green
        'from-red-400/30 via-orange-300/15 to-orange-50/5 dark:from-red-600/30 dark:via-orange-800/15 dark:to-orange-950/5'   // Reddish Orange
    ];

    // Use index for diagonal distribution in 3-column grid to avoid vertical stacking
    // Pattern: 0, 1, 2, 1, 2, 0, 2, 0, 1...
    // Algorithm: (index + floor(index/3)) % 3
    const colorIndex = (index + Math.floor(index / 3)) % 3;

    const gradientClass = colorMap[colorIndex];

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
                            <img
                                src={speaker.image}
                                alt={speaker.name}
                                className="h-full w-auto object-cover max-w-full mx-auto transition-transform duration-500 group-hover:scale-105 relative z-10"
                                style={{
                                    maskImage: 'linear-gradient(to right, transparent, black 5%, black 95%, transparent)',
                                    WebkitMaskImage: 'linear-gradient(to right, transparent, black 5%, black 95%, transparent)'
                                }}
                                onError={(e) => {
                                    // Fallback to initials if image fails
                                    e.currentTarget.style.display = 'none';
                                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                }}
                            />
                            {/* Fallback Initials */}
                            <div className="hidden absolute inset-0 bg-gradient-to-br from-red-100 to-red-200 dark:from-red-900/30 dark:to-gray-800 flex items-center justify-center">
                                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center shadow-xl">
                                    <span className="text-4xl font-bold text-white">
                                        {speaker.name.split(' ').map(n => n[0]).join('')}
                                    </span>
                                </div>
                            </div>

                            {/* Gradient Overlay for text readability if needed, or just style */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20"></div>
                            {/* Decorative elements */}
                            <div className="absolute top-4 right-4 p-2 bg-white/20 dark:bg-black/20 backdrop-blur-sm rounded-full z-20">
                                <Mic className="w-5 h-5 text-red-600 dark:text-red-400" />
                            </div>
                        </div>

                        {/* Info Section */}
                        <div className="p-6">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                                {speaker.name}
                            </h3>
                            <p className="text-red-600 dark:text-red-400 font-medium mb-1">
                                {speaker.title}
                            </p>
                            <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
                                {speaker.company}
                            </p>

                            {/* Click to flip hint */}
                            <div className="flex items-center justify-center gap-2 text-sm text-gray-400 dark:text-gray-500 group-hover:text-red-500 transition-colors">
                                <span>Click to learn more</span>
                                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Back of card */}
                <div className="absolute w-full h-full backface-hidden rotate-y-180">
                    <div className="h-full bg-gradient-to-br from-red-600 to-red-700 dark:from-red-700 dark:to-red-900 rounded-2xl shadow-lg p-6 flex flex-col">
                        {/* Topic Badge */}
                        <div className="mb-4">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/20 backdrop-blur-sm text-white text-sm font-medium rounded-full">
                                <Mic className="w-4 h-4" />
                                Topic
                            </span>
                        </div>

                        <h4 className="text-xl font-bold text-white mb-4">
                            {speaker.topic}
                        </h4>

                        <p className="text-red-100 text-sm leading-relaxed flex-grow">
                            {speaker.bio}
                        </p>

                        {/* Social Links */}
                        <div className="flex gap-3 mt-4 pt-4 border-t border-white/20">
                            {speaker.linkedin && (
                                <a
                                    href={speaker.linkedin}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
                                >
                                    <Linkedin className="w-5 h-5 text-white" />
                                </a>
                            )}
                            {speaker.twitter && (
                                <a
                                    href={speaker.twitter}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
                                >
                                    <Twitter className="w-5 h-5 text-white" />
                                </a>
                            )}
                            {speaker.website && (
                                <a
                                    href={speaker.website}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
                                >
                                    <Globe className="w-5 h-5 text-white" />
                                </a>
                            )}
                        </div>

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
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                        {speakers.map((speaker, index) => (
                            <SpeakerCard key={speaker.id} speaker={speaker} index={index} />
                        ))}
                    </div>
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
