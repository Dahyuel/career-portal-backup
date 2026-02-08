import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Briefcase, Users, Calendar, Award, MapPin, Clock, Target, Sparkles, Building2, GraduationCap, Handshake } from 'lucide-react';
import { Navbar } from './shared/Navbar';

// Counter Animation Hook
const useCountUp = (end: number, duration: number = 2000, startOnView: boolean = true) => {
    const [count, setCount] = useState(0);
    const [hasStarted, setHasStarted] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!startOnView) {
            setHasStarted(true);
        }

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting && !hasStarted) {
                    setHasStarted(true);
                }
            },
            { threshold: 0.3 }
        );

        if (ref.current) {
            observer.observe(ref.current);
        }

        return () => observer.disconnect();
    }, [hasStarted, startOnView]);

    useEffect(() => {
        if (!hasStarted) return;

        let startTime: number;
        let animationFrame: number;

        const animate = (timestamp: number) => {
            if (!startTime) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / duration, 1);

            // Easing function for smooth animation
            const easeOutQuart = 1 - Math.pow(1 - progress, 4);
            setCount(Math.floor(easeOutQuart * end));

            if (progress < 1) {
                animationFrame = requestAnimationFrame(animate);
            }
        };

        animationFrame = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animationFrame);
    }, [end, duration, hasStarted]);

    return { count, ref };
};

// Counter Component
const AnimatedCounter: React.FC<{ value: number; suffix?: string; label: string; color?: string }> = ({ value, suffix = '+', label, color = 'text-red-600' }) => {
    const { count, ref } = useCountUp(value, 2000);

    return (
        <div
            ref={ref}
            className="bg-white dark:bg-gray-800 rounded-2xl p-6 md:p-8 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-red-100 dark:border-red-900/30 relative overflow-hidden group"
        >
            {/* Red glow effect */}
            <div className="absolute -top-10 -right-10 w-24 h-24 bg-red-500/10 rounded-full blur-2xl group-hover:bg-red-500/20 transition-all duration-300"></div>
            <div className={`text-3xl md:text-4xl font-bold mb-2 ${color} relative z-10`}>
                {count.toLocaleString()}{suffix}
            </div>
            <p className="text-gray-700 dark:text-gray-300 font-medium text-sm relative z-10">{label}</p>
        </div>
    );
};

export const LandingPage: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-white dark:bg-gray-950 transition-colors duration-300">
            {/* Navbar */}
            <Navbar />

            {/* Hero Section */}
            <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16 md:pt-20">
                {/* Background */}
                <div
                    className="absolute inset-0 bg-cover bg-center bg-no-repeat z-0"
                    style={{
                        backgroundImage: 'url("/images/w.JPG")',
                    }}
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-gray-900/85 via-gray-800/80 to-gray-900/85 dark:from-gray-950/95 dark:via-gray-900/90 dark:to-red-950/60"></div>
                </div>

                {/* Animated background elements - more subtle and reddish */}
                <div className="absolute inset-0 z-0 overflow-hidden">
                    <div className="absolute top-20 left-10 w-72 h-72 bg-red-500/10 rounded-full blur-3xl animate-pulse"></div>
                    <div className="absolute bottom-20 right-10 w-96 h-96 bg-red-400/8 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-red-300/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
                </div>

                {/* Hero Content */}
                <div className="relative z-10 text-center px-4 py-12 max-w-5xl mx-auto">
                    <div className="fade-in-up-blur">
                        <div className="mx-auto w-28 h-28 md:w-36 md:h-36 bg-white rounded-full flex items-center justify-center mb-6 shadow-2xl ring-4 ring-red-400/30 transform hover:scale-105 transition-transform duration-300">
                            <img
                                src="/images/logo.png"
                                alt="ASU Career Expo Logo"
                                className="w-24 h-24 md:w-32 md:h-32 rounded-full object-cover"
                            />
                        </div>
                        <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold text-white mb-4 tracking-tight drop-shadow-lg">
                            ASU <span className="text-red-400 drop-shadow-md">CAREER EXPO 2026</span>
                        </h1>
                        <p className="text-2xl sm:text-3xl md:text-4xl text-white font-light italic mb-4 drop-shadow-md">
                            Beyond Opportunities
                        </p>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 mb-8">
                            <div className="flex items-center gap-3 text-white">
                                <Calendar className="h-6 w-6 text-red-400" />
                                <span className="text-lg md:text-xl font-bold">April 7th - 8th, 2026</span>
                            </div>
                            <div className="hidden sm:block w-px h-8 bg-red-400/50"></div>
                            <div className="flex items-center gap-3 text-white">
                                <MapPin className="h-6 w-6 text-red-400" />
                                <span className="text-lg md:text-xl font-bold">Dar El Deyafa, ASU Campus</span>
                            </div>
                        </div>
                    </div>

                    {/* Feature highlights */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-8 fade-in-blur max-w-xs sm:max-w-none mx-auto" style={{ animationDelay: '0.3s' }}>
                        <div className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl p-2 sm:p-4 text-center border border-gray-100 dark:border-gray-700 shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
                            <Briefcase className="h-5 w-5 sm:h-7 sm:w-7 md:h-8 md:w-8 text-red-600 dark:text-red-400 mx-auto mb-1 sm:mb-2" />
                            <p className="text-gray-900 dark:text-white font-medium text-xs sm:text-sm"><strong>100+</strong> Companies</p>
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl p-2 sm:p-4 text-center border border-gray-100 dark:border-gray-700 shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
                            <Award className="h-5 w-5 sm:h-7 sm:w-7 md:h-8 md:w-8 text-red-600 dark:text-red-400 mx-auto mb-1 sm:mb-2" />
                            <p className="text-gray-900 dark:text-white font-medium text-xs sm:text-sm">Career Growth</p>
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl p-2 sm:p-4 text-center border border-gray-100 dark:border-gray-700 shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
                            <Calendar className="h-5 w-5 sm:h-7 sm:w-7 md:h-8 md:w-8 text-red-600 dark:text-red-400 mx-auto mb-1 sm:mb-2" />
                            <p className="text-gray-900 dark:text-white font-medium text-xs sm:text-sm">2-Day Event</p>
                        </div>
                    </div>

                    {/* Big text above buttons */}
                    <div className="mb-8 fade-in-up-blur" style={{ animationDelay: '0.4s' }}>
                        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2">
                            Connect . Elevate . Get Hired
                        </h2>
                    </div>

                    {/* CTA Buttons - ASU and Non-ASU Login */}
                    <div className="flex flex-col items-center justify-center fade-in-up-blur" style={{ animationDelay: '0.5s' }}>
                        <button
                            onClick={() => navigate('/login')}
                            className="group relative w-80 sm:w-96 inline-flex items-center justify-center gap-3 px-10 py-6 text-white bg-gradient-to-r from-red-500 to-red-600 rounded-2xl shadow-xl hover:shadow-red-500/40 hover:shadow-2xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 overflow-hidden border-2 border-red-400"
                        >
                            <span className="absolute inset-0 bg-gradient-to-r from-red-600 to-red-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
                            <div className="relative z-10 flex flex-col items-center">
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl font-bold uppercase tracking-wide drop-shadow-sm">Get Started</span>
                                    <ArrowRight className="h-6 w-6 stroke-[3] transform group-hover:translate-x-1 transition-transform duration-300" />
                                </div>
                                <span className="text-sm font-medium text-red-50/95 mt-1 tracking-wide">or login if you have an account</span>
                            </div>
                        </button>

                        {/* Open for All Notice */}
                        <p className="mt-16 text-base sm:text-lg md:text-xl text-white font-semibold text-center px-4">
                            This year it is open for ASU and Non-ASU Students and Alumni!
                        </p>

                        {/* Non-ASU Students Notice */}
                        <p className="mt-4 text-sm sm:text-base text-white/80 text-center px-4">
                            <span className="font-semibold text-white">Non-ASU Students?</span> Join the event via{' '}
                            <a
                                href="https://ticketmarche.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-red-300 font-semibold underline hover:text-red-200 transition-colors"
                            >
                                Ticket Marche
                            </a>{' '}
                            payment link.
                        </p>
                    </div>
                </div>
            </section>

            {/* About Section */}
            <section id="about" className="py-20 md:py-28 bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full text-sm font-medium mb-4">
                            <Target className="h-4 w-4" />
                            Why Attend
                        </span>
                        <h2 className="text-3xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6">
                            ASU Career Expo <span className="text-red-500">2026</span>
                        </h2>
                        <p className="text-lg text-gray-600 dark:text-gray-400 max-w-4xl mx-auto leading-relaxed">
                            ASU Career Expo 2026 is going beyond boundaries. Moving to the prestigious <strong>Dar El Deyafa</strong>,
                            we are hosting the largest talent-to-industry gathering. For the first time, we open our doors to
                            <strong> all job seekers in Egypt</strong> to meet <strong>100+ global and regional giants</strong>.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {/* Network Card */}
                        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 dark:border-gray-700 group hover:-translate-y-2">
                            <div className="w-14 h-14 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                                <Handshake className="h-7 w-7 text-white" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Network</h3>
                            <p className="text-gray-600 dark:text-gray-400">
                                Engage with HR leaders from Top Multinationals and expand your professional network.
                            </p>
                        </div>

                        {/* Elevate & Mentorship Card */}
                        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 dark:border-gray-700 group hover:-translate-y-2">
                            <div className="w-14 h-14 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                                <GraduationCap className="h-7 w-7 text-white" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Elevate & Mentorship</h3>
                            <p className="text-gray-600 dark:text-gray-400">
                                Access 200+ Mentors and Speakers through "Career Talks" and one-on-one coaching sessions.
                            </p>
                        </div>

                        {/* Get Hired Card */}
                        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 dark:border-gray-700 group hover:-translate-y-2">
                            <div className="w-14 h-14 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                                <Briefcase className="h-7 w-7 text-white" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Get Hired</h3>
                            <p className="text-gray-600 dark:text-gray-400">
                                Land your next role with on-spot interviews and exclusive job openings.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Why Attend Section */}
            <section id="features" className="py-20 md:py-28 bg-white dark:bg-gray-950 transition-colors duration-300">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid lg:grid-cols-2 gap-12 items-center">
                        <div>

                            <h2 className="text-3xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6">
                                Launch Your <span className="text-red-500">Dream Career</span>
                            </h2>
                            <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
                                Don't miss this opportunity to take the first step towards your dream career.
                            </p>

                            <div className="space-y-4">
                                <h4 className="font-semibold text-gray-900 dark:text-white text-lg mb-4">What You Will Gain?</h4>

                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <Briefcase className="h-5 w-5 text-red-600 dark:text-red-400" />
                                    </div>
                                    <h5 className="font-medium text-gray-800 dark:text-gray-200">Career guidance with experts</h5>
                                </div>

                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <Award className="h-5 w-5 text-red-600 dark:text-red-400" />
                                    </div>
                                    <h5 className="font-medium text-gray-800 dark:text-gray-200">Connection with your peers</h5>
                                </div>

                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <Users className="h-5 w-5 text-red-600 dark:text-red-400" />
                                    </div>
                                    <h5 className="font-medium text-gray-800 dark:text-gray-200">Internship Opportunities</h5>
                                </div>
                            </div>
                        </div>

                        {/* Stats with Counter Animation */}
                        <div className="grid grid-cols-2 gap-4 md:gap-6">
                            <AnimatedCounter value={100} label="Leading Companies" color="text-red-700" />
                            <AnimatedCounter value={15000} label="Targeted Attendees" color="text-blue-700" />
                            <AnimatedCounter value={200} label="Industry Speakers & Mentors" color="text-green-700" />
                            <AnimatedCounter value={19} suffix="" label="Faculties Covered" color="text-amber-700" />
                        </div>
                    </div>
                </div>
            </section>

            {/* Schedule Preview Section */}
            <section id="schedule" className="py-20 md:py-28 bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full text-sm font-medium mb-4">
                            <Clock className="h-4 w-4" />
                            Event Schedule
                        </span>
                        <h2 className="text-3xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6">
                            2 Days of <span className="text-red-500">Opportunities</span>
                        </h2>
                        <p className="text-lg text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
                            Each day is dedicated to specific faculties and industries. Find your day and join us!
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-10 max-w-5xl mx-auto">
                        {/* Day 1 Card */}
                        <div className="relative overflow-hidden bg-gradient-to-br from-red-500 to-red-600 rounded-3xl p-10 shadow-2xl transition-all duration-500 group hover:scale-[1.02] hover:shadow-red-500/30">
                            {/* Decorative elements */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl transform translate-x-10 -translate-y-10"></div>
                            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full blur-xl transform -translate-x-6 translate-y-6"></div>

                            <div className="relative z-10">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                        <Target className="h-8 w-8 text-white" />
                                    </div>
                                    <div className="inline-flex items-center justify-center px-5 py-2.5 bg-white/20 backdrop-blur-sm text-white rounded-full text-sm font-bold">
                                        April 7, 2026
                                    </div>
                                </div>
                                <h3 className="text-3xl md:text-4xl font-bold text-white mb-4">Day 1</h3>
                                <p className="text-red-100 text-lg leading-relaxed">
                                    Engineering, Computer Science, Medicine, Science, and Pharmacy faculties.
                                </p>
                            </div>
                        </div>

                        {/* Day 2 Card */}
                        <div className="relative overflow-hidden bg-gradient-to-br from-gray-800 to-gray-900 dark:from-gray-700 dark:to-gray-800 rounded-3xl p-10 shadow-2xl transition-all duration-500 group hover:scale-[1.02] hover:shadow-gray-500/20">
                            {/* Decorative elements */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-2xl transform translate-x-10 -translate-y-10"></div>
                            <div className="absolute bottom-0 left-0 w-24 h-24 bg-red-500/10 rounded-full blur-xl transform -translate-x-6 translate-y-6"></div>

                            <div className="relative z-10">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="w-16 h-16 bg-red-500/20 backdrop-blur-sm rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                        <Briefcase className="h-8 w-8 text-red-400" />
                                    </div>
                                    <div className="inline-flex items-center justify-center px-5 py-2.5 bg-red-500/20 backdrop-blur-sm text-red-300 rounded-full text-sm font-bold">
                                        April 8, 2026
                                    </div>
                                </div>
                                <h3 className="text-3xl md:text-4xl font-bold text-white mb-4">Day 2</h3>
                                <p className="text-gray-300 text-lg leading-relaxed">
                                    Business, Arts, Al-Alsun, Law, Mass Communication, and related faculties.
                                </p>
                            </div>
                        </div>
                    </div>


                </div>
            </section>

            {/* Partner Companies Section */}
            <section className="py-20 md:py-28 bg-white dark:bg-gray-950 transition-colors duration-300">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full text-sm font-medium mb-4">
                            <Building2 className="h-4 w-4" />
                            Our Partners
                        </span>
                        <h2 className="text-3xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6">
                            Leading <span className="text-red-500">Companies</span> Joining Us
                        </h2>
                        <p className="text-lg text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
                            Meet the industry giants and innovative companies looking for talented individuals like you.
                        </p>
                    </div>

                    {/* Company Logos Grid - Placeholder for user to add logos */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6 md:gap-8">
                        {/* Placeholder logo cards - Replace with actual company logos */}
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => (
                            <div
                                key={i}
                                className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6 flex items-center justify-center aspect-square border border-gray-200 dark:border-gray-700 hover:shadow-lg hover:border-red-200 dark:hover:border-red-900/50 transition-all duration-300 group"
                            >
                                <div className="text-gray-400 dark:text-gray-500 text-center">
                                    <Building2 className="h-10 w-10 mx-auto mb-2 group-hover:text-red-400 transition-colors" />
                                    <span className="text-xs font-medium">Logo {i}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    <p className="text-center text-gray-500 dark:text-gray-400 mt-8 text-sm">
                        And many more companies joining us...
                    </p>
                </div>
            </section>

            {/* Video Section - Previous Year Highlights */}
            <section className="py-20 md:py-28 bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full text-sm font-medium mb-4">
                            <Sparkles className="h-4 w-4" />
                            Highlights
                        </span>
                        <h2 className="text-3xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6">
                            Relive <span className="text-red-500">Last Year's</span> Success
                        </h2>
                        <p className="text-lg text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
                            Watch the highlights from our previous expo and see what awaits you this year.
                        </p>
                    </div>

                    {/* Video Container */}
                    <div className="max-w-4xl mx-auto">
                        <div className="relative rounded-3xl overflow-hidden shadow-2xl bg-gray-900 aspect-video group">
                            {/* Placeholder for video - Replace src with actual video */}
                            <video
                                className="w-full h-full object-cover"
                                controls
                                poster="/images/video-poster.jpg"
                            >
                                <source src="/videos/expo-2025-highlights.mp4" type="video/mp4" />
                                Your browser does not support the video tag.
                            </video>

                            {/* Decorative gradient overlay when video not playing */}
                            <div className="absolute inset-0 bg-gradient-to-t from-gray-900/60 via-transparent to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        </div>

                        <p className="text-center text-gray-500 dark:text-gray-400 mt-6 text-sm">
                            ASU Career Expo 2025 - Official Highlights Reel
                        </p>
                    </div>
                </div>
            </section>
        </div>
    );
};