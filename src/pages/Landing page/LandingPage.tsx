import React, { useState, useEffect, useRef } from 'react';

import { ArrowRight, Briefcase, Users, Calendar, Award, MapPin, Clock, Target, Sparkles, GraduationCap, Handshake, ExternalLink, Ticket, Settings, Facebook, Linkedin, Instagram } from '../../components/icons';
import { Navbar } from './Navbar';
import { Footer } from './Footer';

// Event Ended Dismissable Popup Overlay
const EventEndedPopup: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    const [visible, setVisible] = useState(false);
    const [closing, setClosing] = useState(false);

    useEffect(() => {
        if (isOpen) {
            // Prevent body scrolling while popup is open
            document.body.style.overflow = 'hidden';
            // Trigger entrance animation
            const timer = setTimeout(() => setVisible(true), 100);
            return () => {
                clearTimeout(timer);
            };
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    const handleClose = () => {
        setClosing(true);
        setVisible(false);
        setTimeout(() => {
            setClosing(false);
            onClose();
        }, 500);
    };

    if (!isOpen && !closing) return null;

    return (
        <div className={`fixed inset-0 z-[60] flex items-start justify-center overflow-hidden pt-12 md:pt-16 pb-6 px-4 transition-opacity duration-500 ${closing ? 'opacity-0' : 'opacity-100'}`}>
            {/* Semi-transparent backdrop with blur */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose}></div>

            {/* Modal Card */}
            <div
                className={`relative z-10 w-full max-w-2xl mx-auto bg-gradient-to-br from-gray-900 via-gray-900 to-gray-950 rounded-3xl border-2 border-red-500/40 shadow-2xl shadow-red-500/10 overflow-hidden flex flex-col max-h-[90vh] transition-all duration-700 ease-out ${visible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-10 scale-95'
                    }`}
            >
                {/* Decorative glow orbs inside card */}
                <div className="absolute -top-20 -right-20 w-56 h-56 bg-red-500/10 rounded-full blur-3xl pointer-events-none"></div>
                <div className="absolute -bottom-20 -left-20 w-56 h-56 bg-red-400/8 rounded-full blur-3xl pointer-events-none"></div>

                {/* Close button — fixed at top right of card container */}
                <div className="absolute top-4 right-4 z-30">
                    <button
                        onClick={handleClose}
                        className="w-12 h-12 flex items-center justify-center rounded-full bg-white/10 border border-white/20 text-white/60 hover:text-white hover:bg-red-500/30 hover:border-red-400/50 transition-all duration-300 shadow-lg backdrop-blur-md"
                        aria-label="Close popup"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Card Content - Scrollable */}
                <div className="relative z-10 text-center px-6 sm:px-12 md:px-16 py-12 sm:py-16 overflow-y-auto custom-scrollbar">

                    {/* Top decorative line */}
                    <div className={`w-24 h-0.5 bg-gradient-to-r from-transparent via-red-500 to-transparent mx-auto mb-10 transition-all duration-1000 delay-300 ${visible ? 'opacity-100' : 'opacity-0'}`}></div>

                    {/* Logos Section: Career Center X CS */}
                    <div className={`flex items-center justify-center gap-6 sm:gap-10 mb-12 transition-all duration-1000 delay-400 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                        {/* Career Center Logo */}
                        <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/15 p-3 shadow-xl hover:scale-105 transition-transform duration-300">
                            <img
                                src="/images/landing/logo.png"
                                alt="ASU Career Center Logo"
                                className="w-full h-full object-contain"
                            />
                        </div>

                        {/* X separator */}
                        <span className="text-3xl sm:text-5xl font-bold text-red-500/80 select-none" style={{ fontFamily: 'serif' }}>×</span>

                        {/* CS Logo */}
                        <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/15 p-3 shadow-xl hover:scale-105 transition-transform duration-300">
                            <img
                                src="/images/cslogo.jpg"
                                alt="CS Logo"
                                className="w-full h-full object-contain rounded-lg"
                            />
                        </div>
                    </div>

                    {/* Main heading */}
                    <div className={`transition-all duration-1000 delay-500 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-3 tracking-tight leading-tight">
                            ASU Career Expo 26 has
                        </h1>
                        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-8 tracking-tight leading-tight">
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-red-500 to-amber-500">Officially Ended</span>
                        </h1>
                    </div>

                    {/* Divider */}
                    <div className={`w-12 h-0.5 bg-white/20 mx-auto mb-10 transition-all duration-1000 delay-600 ${visible ? 'opacity-100' : 'opacity-0'}`}></div>

                    {/* Thank you message container */}
                    <div className={`max-w-xl mx-auto space-y-12 transition-all duration-1000 delay-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>

                        {/* General Thank You */}
                        <div className="space-y-4">
                            <p className="text-xl sm:text-2xl text-white font-medium leading-snug">
                                Thank you to <span className="text-red-500 underline decoration-red-500/30 underline-offset-8 decoration-2">everyone</span> who made this event unforgettable.
                            </p>
                            <p className="text-sm sm:text-base text-gray-400 font-light leading-relaxed">
                                We hope you found it valuable and made meaningful connections, and most importantly, had a great time.
                            </p>
                        </div>

                        {/* Volunteer Special Shout-out */}
                        <div className="relative py-6 px-4 bg-white/5 rounded-2xl border border-white/10 overflow-hidden group">
                            <div className="absolute top-0 left-0 w-1 h-full bg-red-500"></div>
                            <div className="relative z-10 text-left sm:text-center">
                                <span className="inline-block text-[10px] uppercase tracking-widest text-red-400 font-bold mb-2">Special Recognition</span>
                                <h4 className="text-lg sm:text-xl font-bold text-white mb-2 italic">To our Amazing Volunteers</h4>
                                <p className="text-sm text-gray-400 leading-relaxed italic">
                                    "The backbone of this event — your presence, energy, and enthusiasm made all the difference. We are incredibly grateful for the community we've built together."
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Coming back badge */}
                    <div className={`mt-14 transition-all duration-1000 delay-[900ms] ${visible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-4 scale-90'}`}>
                        <div className="inline-flex items-center gap-3 px-4 py-3 sm:px-10 sm:py-5 bg-white/5 backdrop-blur-md border border-red-500/40 rounded-full shadow-2xl hover:bg-white/10 transition-all duration-300">
                            <span className="relative flex h-2 w-2 sm:h-2.5 sm:w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 sm:h-2.5 sm:w-2.5 bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"></span>
                            </span>
                            <span className="text-xs sm:text-base md:text-lg font-bold text-white tracking-wide whitespace-nowrap">
                                We're coming back <span className="text-red-500 animate-pulse">STRONGER</span> next year
                            </span>
                        </div>
                    </div>

                    {/* Bottom Space */}
                    <div className="h-12"></div>

                    {/* Edition tag */}
                    <div className={`mt-8 transition-all duration-1000 delay-[1100ms] ${visible ? 'opacity-100' : 'opacity-0'}`}>
                        <div className="flex items-center justify-center gap-2 sm:gap-4 opacity-40">
                            <div className="w-4 sm:w-8 h-px bg-gray-500"></div>
                            <p className="text-[9px] sm:text-[10px] md:text-xs text-gray-100 tracking-[0.15em] sm:tracking-[0.3em] uppercase font-medium whitespace-nowrap">
                                ASU Career Expo 2026 — 5th Edition
                            </p>
                            <div className="w-4 sm:w-8 h-px bg-gray-500"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

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
    const [showPopup, setShowPopup] = useState(true);

    return (
        <div className="min-h-screen bg-white dark:bg-gray-950 transition-colors duration-300">
            {/* Event Ended Dismissable Popup Overlay */}
            <EventEndedPopup isOpen={showPopup} onClose={() => setShowPopup(false)} />

            {/* Navbar */}
            <Navbar />

            {/* Hero Section */}
            <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16 md:pt-20">
                {/* Video Background */}
                <div className="absolute inset-0 z-0 overflow-hidden bg-gray-900">
                    <video
                        autoPlay
                        muted
                        loop
                        playsInline
                        className="absolute inset-0 w-full h-full object-cover"
                    >
                        <source src="/images/landing/EF25.mp4" type="video/mp4" />
                    </video>
                    <div className="absolute inset-0 bg-gradient-to-br from-gray-900/70 via-gray-800/60 to-gray-900/70 dark:from-gray-950/85 dark:via-gray-900/75 dark:to-red-950/50"></div>
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
                        <div className="mx-auto w-40 h-40 md:w-52 md:h-52 bg-[#8B1A1D] rounded-full flex items-center justify-center mb-8 shadow-2xl ring-4 ring-red-400/50 border-4 border-white transform hover:scale-105 transition-transform duration-300 p-1">
                            <img
                                src="/images/landing/career_expo_logo.png"
                                alt="ASU Career Expo Logo"
                                className="w-[90%] h-[90%] rounded-full object-contain"
                            />
                        </div>
                        <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold text-white mb-2 tracking-tight drop-shadow-lg">
                            ASU <span className="text-red-400 drop-shadow-md">CAREER EXPO 2026</span>
                        </h1>
                        <p className="text-2xl sm:text-3xl md:text-4xl font-semibold text-red-300 mb-4 drop-shadow-md">
                            5<sup>th</sup> Edition
                        </p>
                        <p className="text-2xl sm:text-3xl md:text-4xl text-white font-light italic mb-4 drop-shadow-md">
                            Beyond Opportunities
                        </p>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 mb-8">
                            <div className="flex items-center gap-3 text-white">
                                <Calendar className="h-6 w-6 text-red-400" />
                                <span className="text-lg md:text-xl font-bold">April 7th - 8th, 2026</span>
                            </div>
                            <div className="hidden sm:block w-px h-8 bg-red-400/50"></div>
                            <a
                                href="https://maps.app.goo.gl/SwGZ311XhHUGBCT68"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-3 text-white hover:text-red-300 transition-colors"
                                title="Open in Google Maps"
                            >
                                <span className="text-lg md:text-xl font-bold">Dar El Deyafa, ASU Campus</span>
                                <MapPin className="h-6 w-6 text-red-400" />
                            </a>
                        </div>
                    </div>

                    {/* Feature highlights */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-8 fade-in-blur max-w-xs sm:max-w-none mx-auto" style={{ animationDelay: '0.3s' }}>
                        <div className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl p-2 sm:p-4 text-center border border-gray-100 dark:border-gray-700 shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
                            <Briefcase className="h-5 w-5 sm:h-7 sm:w-7 md:h-8 md:w-8 text-red-600 dark:text-red-400 mx-auto mb-1 sm:mb-2" />
                            <p className="text-gray-900 dark:text-white font-medium text-xs sm:text-sm"><strong>100+ Companies</strong> </p>
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl p-2 sm:p-4 text-center border border-gray-100 dark:border-gray-700 shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
                            <Award className="h-5 w-5 sm:h-7 sm:w-7 md:h-8 md:w-8 text-red-600 dark:text-red-400 mx-auto mb-1 sm:mb-2" />
                            <p className="text-gray-900 dark:text-white font-medium text-xs sm:text-sm"><strong>200+ Speakers</strong></p>
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl p-2 sm:p-4 text-center border border-gray-100 dark:border-gray-700 shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
                            <Calendar className="h-5 w-5 sm:h-7 sm:w-7 md:h-8 md:w-8 text-red-600 dark:text-red-400 mx-auto mb-1 sm:mb-2" />
                            <p className="text-gray-900 dark:text-white font-medium text-xs sm:text-sm"><strong>2-Day Event</strong></p>
                        </div>
                    </div>

                    {/* Big text */}
                    <div className="mb-4 fade-in-up-blur" style={{ animationDelay: '0.4s' }}>
                        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2">
                            Connect . Elevate . Get Hired
                        </h2>
                    </div>
                </div>
            </section >

            {/* Registration Section - ASU & Non-ASU */}
            < section id="register-section" className="py-16 md:py-24 bg-red-50 dark:bg-gray-900 transition-colors duration-300 border-y border-red-100 dark:border-red-900/30" >
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                    {/* Section Header */}
                    <div className="text-center mb-12">
                        <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full text-sm font-medium mb-4">
                            <Ticket className="h-4 w-4" />
                            Open for Everyone
                        </span>
                        <h2 className="text-3xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
                            This year it's open for <span className="text-red-500">All</span> Students & Alumni!
                        </h2>
                        <p className="text-lg text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
                            Whether you're an ASU alumni/student or from another university, there's a path for you to join ASU Career Expo 2026.
                        </p>

                        {/* Central Register Here Button */}
                        <div className="mt-8">
                            <button
                                onClick={() => window.location.href = '/attendee-register'}
                                className="group/btn relative inline-flex items-center justify-center gap-4 px-16 py-7 text-white bg-gradient-to-r from-red-500 to-red-600 rounded-3xl shadow-lg hover:shadow-red-500/40 hover:shadow-xl transition-all duration-300 transform hover:scale-[1.03] overflow-hidden border-2 border-white/70 ring-1 ring-red-300"
                            >
                                <span className="absolute inset-0 bg-gradient-to-r from-red-600 to-red-700 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300"></span>
                                <div className="relative z-10 flex items-center gap-4">
                                    <span className="text-2xl font-bold uppercase tracking-wide">Register Here</span>
                                    <ArrowRight className="h-6 w-6 stroke-[3] transform group-hover/btn:translate-x-1 transition-transform duration-300" />
                                </div>
                            </button>
                            <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-3">or <a href="/login" className="text-red-500 hover:text-red-400 underline font-medium">login</a> if you already have an account</p>
                        </div>
                    </div>

                    {/* Two Column Layout */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 max-w-5xl mx-auto px-2 sm:px-0">

                        {/* ASU Students Card */}
                        <div className="relative overflow-hidden bg-white dark:bg-gray-800 rounded-3xl shadow-xl border-2 border-red-200 dark:border-red-900/40 transition-all duration-500 group hover:shadow-2xl hover:shadow-red-500/10 hover:-translate-y-1 flex flex-col">
                            {/* Decorative glow */}
                            <div className="absolute -top-10 -right-10 w-40 h-40 bg-red-500/10 rounded-full blur-3xl group-hover:bg-red-500/20 transition-all duration-500"></div>
                            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-red-400/10 rounded-full blur-2xl"></div>

                            {/* FREE Banner */}
                            <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-8 py-5 flex items-center justify-center gap-3">
                                <GraduationCap className="h-8 w-8 text-white" />
                                <span className="text-2xl sm:text-3xl font-extrabold text-white uppercase tracking-wide">Free Entry</span>
                            </div>

                            <div className="relative z-10 flex flex-col flex-grow p-5 sm:p-8 md:p-10">
                                <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-4">
                                    ASU Students & Alumni
                                </h3>
                                <p className="text-base sm:text-lg text-gray-700 dark:text-gray-300 mb-4 leading-relaxed font-medium">
                                    This event is <span className="text-green-600 dark:text-green-400 font-bold">completely free</span> for Ain Shams University students and alumni.
                                </p>
                                <p className="text-base sm:text-lg text-gray-700 dark:text-gray-300 leading-relaxed font-medium">
                                    <span className="font-bold text-red-600 dark:text-red-400">Note: </span>Registration is mandatory for all attendees, and be sure to upload valid enrollment proof of Ain Shams University to not get excluded.
                                </p>
                            </div>
                        </div>

                        {/* Non-ASU Students Card */}
                        <div className="relative overflow-hidden bg-white dark:bg-gradient-to-br dark:from-gray-700 dark:to-gray-800 rounded-3xl shadow-xl border-2 border-amber-200 dark:border-gray-700 transition-all duration-500 group hover:shadow-2xl hover:shadow-amber-500/10 hover:-translate-y-1 flex flex-col">
                            {/* Decorative glow */}
                            <div className="absolute -top-10 -right-10 w-40 h-40 bg-red-500/10 rounded-full blur-3xl group-hover:bg-red-500/20 transition-all duration-500"></div>
                            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-red-400/10 rounded-full blur-2xl"></div>

                            {/* PAID Banner */}
                            <div className="bg-gradient-to-r from-amber-500 to-orange-600 px-8 py-5 flex items-center justify-center gap-3">
                                <Ticket className="h-8 w-8 text-white" />
                                <span className="text-2xl sm:text-3xl font-extrabold text-white uppercase tracking-wide">Paid Entry</span>
                            </div>

                            <div className="relative z-10 flex flex-col flex-grow p-5 sm:p-8 md:p-10">
                                <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-4">
                                    Non-ASU Students & Alumni
                                </h3>
                                <p className="text-base sm:text-lg text-gray-700 dark:text-gray-300 mb-6 leading-relaxed font-medium">
                                    Students and alumni from other universities can join us by purchasing a ticket.
                                </p>

                                {/* Highlighted Price & Group Ticket */}
                                <div className="mt-auto">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {/* Individual Ticket Price */}
                                        <div className="sm:aspect-square bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-2 border-amber-300 dark:border-amber-600/50 rounded-xl flex flex-col items-center justify-center p-4 py-5 sm:p-4 hover:scale-[1.03] transition-transform duration-300">
                                            <Ticket className="h-7 w-7 text-amber-600 dark:text-amber-400 mb-2" />
                                            <span className="text-sm font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider mb-1">Individual ticket</span>
                                            <span className="text-4xl font-extrabold text-amber-600 dark:text-amber-400 leading-none">275</span>
                                            <span className="text-base font-bold text-amber-500 dark:text-amber-400 mt-1">EGP</span>
                                            <p className="text-amber-600 dark:text-amber-300 text-xs mt-1.5 font-semibold">For one person only</p>
                                        </div>

                                        {/* Group Ticket Offer */}
                                        <div className="relative sm:aspect-square bg-gradient-to-br from-red-500 to-red-600 dark:from-red-600 dark:to-red-700 rounded-xl flex flex-col items-center justify-center p-4 py-5 sm:p-4 shadow-lg shadow-red-500/20 overflow-hidden hover:scale-[1.03] transition-transform duration-300">
                                            <Users className="h-7 w-7 text-white mb-2" />
                                            <span className="text-sm font-bold text-red-100 uppercase tracking-wider mb-1">Group ticket</span>
                                            <span className="text-4xl font-extrabold text-white leading-none">5 <span className="text-base font-bold">for</span> 1100</span>
                                            <span className="text-base font-bold text-red-100 mt-1">EGP</span>
                                            <p className="text-red-200 text-xs mt-1.5 font-semibold">Save 275 EGP!</p>
                                        </div>
                                    </div>

                                    {/* Buy Ticket Link */}

                                </div>
                            </div>
                        </div>

                    </div>


                </div>
            </section >

            {/* About Section */}
            < section id="about" className="py-20 md:py-28 bg-gray-50 dark:bg-gray-900 transition-colors duration-300" >
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
                                Engage with experts from Top Leading companies and expand your professional network.
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
                                Land your next role with many opportunities and exclusive job openings.
                            </p>
                        </div>
                    </div>
                </div>
            </section >

            {/* Why Attend Section */}
            < section id="features" className="py-20 md:py-28 bg-white dark:bg-gray-950 transition-colors duration-300" >
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
                                    <h5 className="font-medium text-gray-800 dark:text-gray-200">Internship Opportunities</h5>
                                </div>

                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <Users className="h-5 w-5 text-red-600 dark:text-red-400" />
                                    </div>
                                    <h5 className="font-medium text-gray-800 dark:text-gray-200">Connection with your peers</h5>
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
            </section >

            {/* Schedule Preview Section */}
            < section id="schedule" className="py-20 md:py-28 bg-gray-50 dark:bg-gray-900 transition-colors duration-300" >
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
                        <div className="relative overflow-hidden bg-gradient-to-br from-red-500 to-red-600 rounded-3xl p-8 sm:p-10 shadow-2xl transition-all duration-500 group hover:scale-[1.02] hover:shadow-red-500/30">
                            {/* Decorative elements */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl transform translate-x-10 -translate-y-10"></div>
                            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full blur-xl transform -translate-x-6 translate-y-6"></div>

                            <div className="relative z-10 h-full flex flex-col">
                                <div className="flex flex-wrap items-center gap-4 mb-6">
                                    <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                        <Settings className="h-7 w-7 text-white" />
                                    </div>
                                    <div className="flex flex-col">
                                        <div className="inline-flex items-center justify-center px-4 py-1.5 bg-white/20 backdrop-blur-sm text-white rounded-full text-sm font-bold w-fit">
                                            April 7, 2026
                                        </div>
                                    </div>
                                </div>
                                <h3 className="text-2xl sm:text-3xl font-bold text-white mb-2">Day 1</h3>
                                <div className="text-white/90 font-semibold text-lg mb-4 border-b border-white/20 pb-2">
                                    Practical, Medical & Science Sectors
                                </div>
                                <ul className="text-red-50 space-y-3 text-sm sm:text-base flex-1">
                                    <li className="flex gap-2 items-center">
                                        <div className="w-1.5 h-1.5 rounded-full bg-white/60 flex-shrink-0"></div>
                                        <span>Engineering & Computer Science</span>
                                    </li>
                                    <li className="flex gap-2 items-center">
                                        <div className="w-1.5 h-1.5 rounded-full bg-white/60 flex-shrink-0"></div>
                                        <span>Medicine, Pharmacy, Dentistry & Nursing</span>
                                    </li>
                                    <li className="flex gap-2 items-center">
                                        <div className="w-1.5 h-1.5 rounded-full bg-white/60 flex-shrink-0"></div>
                                        <span>Science & Agriculture</span>
                                    </li>
                                </ul>
                                <div className="mt-6 pt-4 border-t border-white/20 flex items-center justify-center text-red-50 font-medium">
                                    <Clock className="w-4 h-4 mr-2" />
                                    <span>10:00 AM – 8:00 PM</span>
                                </div>
                            </div>
                        </div>

                        {/* Day 2 Card */}
                        <div className="relative overflow-hidden bg-gradient-to-br from-gray-800 to-gray-900 dark:from-gray-700 dark:to-gray-800 rounded-3xl p-8 sm:p-10 shadow-2xl transition-all duration-500 group hover:scale-[1.02] hover:shadow-gray-500/20">
                            {/* Decorative elements */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-2xl transform translate-x-10 -translate-y-10"></div>
                            <div className="absolute bottom-0 left-0 w-24 h-24 bg-red-500/10 rounded-full blur-xl transform -translate-x-6 translate-y-6"></div>

                            <div className="relative z-10 h-full flex flex-col">
                                <div className="flex flex-wrap items-center gap-4 mb-6">
                                    <div className="w-14 h-14 bg-red-500/20 backdrop-blur-sm rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                        <Briefcase className="h-7 w-7 text-red-400" />
                                    </div>
                                    <div className="flex flex-col">
                                        <div className="inline-flex items-center justify-center px-4 py-1.5 bg-red-500/20 backdrop-blur-sm text-red-300 rounded-full text-sm font-bold w-fit">
                                            April 8, 2026
                                        </div>
                                    </div>
                                </div>
                                <h3 className="text-2xl sm:text-3xl font-bold text-white mb-2">Day 2</h3>
                                <div className="text-white/90 font-semibold text-lg mb-4 border-b border-gray-600 pb-2">
                                    Business, Humanities & Social Sciences
                                </div>
                                <ul className="text-gray-300 space-y-3 text-sm sm:text-base flex-1">
                                    <li className="flex gap-2 items-center">
                                        <div className="w-1.5 h-1.5 rounded-full bg-red-500/60 flex-shrink-0"></div>
                                        <span>Business, Commerce & Management</span>
                                    </li>
                                    <li className="flex gap-2 items-center">
                                        <div className="w-1.5 h-1.5 rounded-full bg-red-500/60 flex-shrink-0"></div>
                                        <span>Languages (Al-Alsun), Arts & Archaeology</span>
                                    </li>
                                    <li className="flex gap-2 items-center">
                                        <div className="w-1.5 h-1.5 rounded-full bg-red-500/60 flex-shrink-0"></div>
                                        <span>Mass Communication & Law</span>
                                    </li>
                                    <li className="flex gap-2 items-center">
                                        <div className="w-1.5 h-1.5 rounded-full bg-red-500/60 flex-shrink-0"></div>
                                        <span>Education & Human Sciences</span>
                                    </li>
                                </ul>
                                <div className="mt-6 pt-4 border-t border-gray-700 flex items-center justify-center text-gray-400 font-medium">
                                    <Clock className="w-4 h-4 mr-2" />
                                    <span>10:00 AM – 8:00 PM</span>
                                </div>
                            </div>
                        </div>
                    </div>


                </div>
            </section >

            {/* Partner With Us / Are You an Employer Section */}
            <section className="py-20 md:py-28 bg-white dark:bg-gray-950 transition-colors duration-300">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-orange-50 to-red-50 dark:from-gray-900 dark:to-gray-800 border border-red-100 dark:border-gray-700 shadow-lg">

                        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 p-8 md:p-16 items-center relative z-10">
                            {/* Left Content - Takes 3 of 5 columns on large screens */}
                            <div className="text-center lg:text-left lg:col-span-3">
                                <h2 className="text-3xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
                                    Are You an Employer?
                                </h2>
                                <div className="w-24 h-1 bg-gradient-to-r from-transparent via-red-600 to-transparent mx-auto lg:mx-0 rounded-full mb-8"></div>
                                <p className="text-xl text-gray-600 dark:text-gray-300 mb-10 leading-relaxed space-y-4">
                                    <span className="block mb-4">
                                        Are you interested in participating in our events or hiring top talent from Ain Shams University?
                                    </span>
                                    <span className="block mb-4">
                                        Join our network of over 500+ partners and connect with the brightest minds. We make recruitment easy, efficient, and effective.
                                    </span>
                                    <span className="block font-medium text-gray-900 dark:text-white">
                                        Fill out our partnership form to discuss future collaborations.
                                    </span>
                                </p>

                                <div className="flex justify-center lg:justify-start">
                                    <a
                                        href="https://forms.gle/GcQDEVEgJPsQor2NA"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-8 py-4 bg-red-600 text-white rounded-full font-bold text-lg hover:bg-red-700 transition-all duration-300 shadow-lg hover:shadow-red-500/20 flex items-center"
                                    >
                                        <ExternalLink className="mr-2 w-5 h-5" />
                                        Get in touch
                                    </a>
                                </div>
                            </div>

                            {/* Right Visual - Handshake Icon - Takes 2 of 5 columns on large screens */}
                            <div className="flex justify-center items-center order-first lg:order-last lg:col-span-2">
                                <div className="relative">
                                    <div className="absolute inset-0 bg-red-200 dark:bg-red-900/40 rounded-full blur-3xl opacity-40 transform scale-125"></div>
                                    <Handshake className="relative w-40 h-40 md:w-48 md:h-48 lg:w-56 lg:h-56 text-red-600 dark:text-red-500 drop-shadow-2xl" strokeWidth={1} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>


            < section className="py-20 md:py-28 bg-gray-50 dark:bg-gray-900 transition-colors duration-300" >
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
                        <div className="relative rounded-3xl overflow-hidden shadow-2xl bg-gray-900 aspect-video">
                            <iframe
                                className="w-full h-full"
                                src="https://www.youtube.com/embed/l6LLgP62te0"
                                title="ASU Employment Fair 2025"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                allowFullScreen
                            ></iframe>
                        </div>

                        <p className="text-center text-gray-500 dark:text-gray-400 mt-6 text-sm">
                            ASU Employment Fair 2025 - Official Highlights
                        </p>
                    </div>
                </div>
            </section >

            {/* Social Media Section */}
            <section className="py-20 bg-gray-50 dark:bg-gray-900/50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Join Our Social Community</h2>
                        <div className="w-24 h-1 bg-gradient-to-r from-transparent via-red-600 to-transparent mx-auto rounded-full mb-6"></div>
                        <p className="text-gray-600 dark:text-gray-400">Stay updated with the latest opportunities and events</p>
                    </div>

                    <div className="flex flex-wrap justify-center items-center gap-8 md:gap-12">
                        {/* LinkedIn */}
                        <a href="https://www.linkedin.com/company/asucareercenter/" target="_blank" rel="noopener noreferrer"
                            className="group transition-transform duration-300 hover:-translate-y-2">
                            <div className="p-4 rounded-full bg-white dark:bg-gray-800 shadow-sm group-hover:bg-[#0077b5] group-hover:shadow-lg group-hover:shadow-blue-500/30 transition-all duration-300">
                                <Linkedin className="w-10 h-10 text-[#0077b5] group-hover:text-white transition-colors duration-300" strokeWidth={1.5} />
                            </div>
                        </a>

                        {/* Facebook */}
                        <a href="https://www.facebook.com/ASUCCOFFICIAL" target="_blank" rel="noopener noreferrer"
                            className="group transition-transform duration-300 hover:-translate-y-2">
                            <div className="p-4 rounded-full bg-white dark:bg-gray-800 shadow-sm group-hover:bg-[#1877f2] group-hover:shadow-lg group-hover:shadow-blue-600/30 transition-all duration-300">
                                <Facebook className="w-10 h-10 text-[#1877f2] group-hover:text-white transition-colors duration-300" strokeWidth={1.5} />
                            </div>
                        </a>

                        {/* Instagram */}
                        <a href="https://www.instagram.com/asucareercenter" target="_blank" rel="noopener noreferrer"
                            className="group transition-transform duration-300 hover:-translate-y-2">
                            <div className="p-4 rounded-full bg-white dark:bg-gray-800 shadow-sm group-hover:bg-gradient-to-tr group-hover:from-[#f09433] group-hover:via-[#dc2743] group-hover:to-[#bc1888] group-hover:shadow-lg group-hover:shadow-pink-500/30 transition-all duration-300">
                                <Instagram className="w-10 h-10 text-[#E4405F] group-hover:text-white transition-colors duration-300" strokeWidth={1.5} />
                            </div>
                        </a>

                        {/* WhatsApp */}
                        <a href="https://whatsapp.com/channel/0029Vb7KfyxL2ATrTuGIVG0X" target="_blank" rel="noopener noreferrer"
                            className="group transition-transform duration-300 hover:-translate-y-2">
                            <div className="p-4 rounded-full bg-white dark:bg-gray-800 shadow-sm group-hover:bg-[#25D366] group-hover:shadow-lg group-hover:shadow-green-500/30 transition-all duration-300">
                                <svg
                                    viewBox="0 0 24 24"
                                    className="w-10 h-10 text-[#25D366] group-hover:text-white fill-current transition-colors duration-300"
                                >
                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                                </svg>
                            </div>
                        </a>

                        {/* TikTok */}
                        <a href="https://www.tiktok.com/@asu.career.centre" target="_blank" rel="noopener noreferrer"
                            className="group transition-transform duration-300 hover:-translate-y-2">
                            <div className="p-4 rounded-full bg-white dark:bg-gray-800 shadow-sm group-hover:bg-black dark:group-hover:bg-white group-hover:shadow-lg group-hover:shadow-black/30 dark:group-hover:shadow-white/30 transition-all duration-300">
                                <svg
                                    viewBox="0 0 24 24"
                                    className="w-10 h-10 text-black dark:text-white group-hover:text-white dark:group-hover:text-black fill-current transition-colors duration-300"
                                >
                                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
                                </svg>
                            </div>
                        </a>
                    </div>
                </div>
            </section>

            <Footer />
        </div >
    );
};