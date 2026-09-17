import React, { useState, useEffect, useRef, useMemo } from 'react';

import { ArrowRight, Users, Calendar, MapPin, Clock, Target, Sparkles, Handshake, ExternalLink, Ticket, Facebook, Linkedin, Instagram } from '../../components/icons';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { getLandingContent } from '../../lib/currentEvent';
import { mergeLanding, safeUrl, toYouTubeEmbed, type LandingContent } from '../../lib/landingContent';
import { cleanLines, renderRich } from '../../lib/richText';
import { landingIcon } from '../../lib/landingIcons';

// Everything on this page comes from the active event's landing page content,
// edited by super admins (Events tab). Missing content falls back to the defaults.
// Colours come from CSS variables set from the event's theme (see lib/theme.ts).

// Event Ended Dismissable Popup Overlay
const EventEndedPopup: React.FC<{ isOpen: boolean; onClose: () => void; content: LandingContent['ended_popup'] }> = ({ isOpen, onClose, content }) => {
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

    const logos = cleanLines(content.logos).map(safeUrl).filter((url): url is string => !!url);

    return (
        <div className={`fixed inset-0 z-[60] flex items-start justify-center overflow-hidden pt-12 md:pt-16 pb-6 px-4 transition-opacity duration-500 ${closing ? 'opacity-0' : 'opacity-100'}`}>
            {/* Semi-transparent backdrop with blur */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose}></div>

            {/* Modal Card */}
            <div
                className={`relative z-10 w-full max-w-2xl mx-auto bg-gradient-to-br from-gray-900 via-gray-900 to-gray-950 rounded-3xl border-2 border-[color:var(--a-500-40)] shadow-2xl shadow-[color:var(--a-500-10)] overflow-hidden flex flex-col max-h-[90vh] transition-all duration-700 ease-out ${visible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-10 scale-95'
                    }`}
            >
                {/* Decorative glow orbs inside card */}
                <div className="absolute -top-20 -right-20 w-56 h-56 bg-[color:var(--a-500-10)] rounded-full blur-3xl pointer-events-none"></div>
                <div className="absolute -bottom-20 -left-20 w-56 h-56 bg-[color:var(--a-400-8)] rounded-full blur-3xl pointer-events-none"></div>

                {/* Close button */}
                <div className="absolute top-4 right-4 z-30">
                    <button
                        onClick={handleClose}
                        className="w-12 h-12 flex items-center justify-center rounded-full bg-white/10 border border-white/20 text-white/60 hover:text-white hover:bg-[color:var(--a-500-30)] hover:border-[color:var(--a-400-50)] transition-all duration-300 shadow-lg backdrop-blur-md"
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
                    <div className={`w-24 h-0.5 bg-gradient-to-r from-transparent via-[color:var(--a-500)] to-transparent mx-auto mb-10 transition-all duration-1000 delay-300 ${visible ? 'opacity-100' : 'opacity-0'}`}></div>

                    {/* Logos */}
                    {logos.length > 0 && (
                        <div className={`flex items-center justify-center gap-6 sm:gap-10 mb-12 transition-all duration-1000 delay-400 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                            {logos.map((logo, i) => (
                                <React.Fragment key={logo + i}>
                                    {i > 0 && (
                                        <span className="text-3xl sm:text-5xl font-bold text-[color:var(--a-500-80)] select-none" style={{ fontFamily: 'serif' }}>×</span>
                                    )}
                                    <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/15 p-3 shadow-xl hover:scale-105 transition-transform duration-300">
                                        <img src={logo} alt="" className="w-full h-full object-contain rounded-lg" />
                                    </div>
                                </React.Fragment>
                            ))}
                        </div>
                    )}

                    {/* Main heading */}
                    <div className={`transition-all duration-1000 delay-500 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-3 tracking-tight leading-tight">
                            {content.title}
                        </h1>
                        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-8 tracking-tight leading-tight">
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[color:var(--a-400)] via-[color:var(--a-500)] to-amber-500">{content.title_highlight}</span>
                        </h1>
                    </div>

                    {/* Divider */}
                    <div className={`w-12 h-0.5 bg-white/20 mx-auto mb-10 transition-all duration-1000 delay-600 ${visible ? 'opacity-100' : 'opacity-0'}`}></div>

                    {/* Thank you message container */}
                    <div className={`max-w-xl mx-auto space-y-12 transition-all duration-1000 delay-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>

                        {/* General Thank You */}
                        <div className="space-y-4">
                            <p className="text-xl sm:text-2xl text-white font-medium leading-snug">
                                {renderRich(content.thanks, 'text-[color:var(--a-500)] underline decoration-[color:var(--a-500-30)] underline-offset-8 decoration-2')}
                            </p>
                            {content.subtext && (
                                <p className="text-sm sm:text-base text-gray-400 font-light leading-relaxed">{content.subtext}</p>
                            )}
                        </div>

                        {/* Volunteer Special Shout-out */}
                        {(content.volunteers_title || content.volunteers_text) && (
                            <div className="relative py-6 px-4 bg-white/5 rounded-2xl border border-white/10 overflow-hidden group">
                                <div className="absolute top-0 left-0 w-1 h-full bg-[color:var(--a-500)]"></div>
                                <div className="relative z-10 text-left sm:text-center">
                                    <span className="inline-block text-[10px] uppercase tracking-widest text-[color:var(--a-400)] font-bold mb-2">{content.volunteers_label}</span>
                                    <h4 className="text-lg sm:text-xl font-bold text-white mb-2 italic">{content.volunteers_title}</h4>
                                    <p className="text-sm text-gray-400 leading-relaxed italic">{content.volunteers_text}</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Coming back badge */}
                    {content.badge && (
                        <div className={`mt-14 transition-all duration-1000 delay-[900ms] ${visible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-4 scale-90'}`}>
                            <div className="inline-flex items-center gap-3 px-4 py-3 sm:px-10 sm:py-5 bg-white/5 backdrop-blur-md border border-[color:var(--a-500-40)] rounded-full shadow-2xl hover:bg-white/10 transition-all duration-300">
                                <span className="relative flex h-2 w-2 sm:h-2.5 sm:w-2.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[color:var(--a-400)] opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 sm:h-2.5 sm:w-2.5 bg-[color:var(--a-500)]"></span>
                                </span>
                                <span className="text-xs sm:text-base md:text-lg font-bold text-white tracking-wide whitespace-nowrap">
                                    {renderRich(content.badge, 'text-[color:var(--a-500)] animate-pulse')}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Bottom Space */}
                    <div className="h-12"></div>

                    {/* Edition tag */}
                    {content.edition_tag && (
                        <div className={`mt-8 transition-all duration-1000 delay-[1100ms] ${visible ? 'opacity-100' : 'opacity-0'}`}>
                            <div className="flex items-center justify-center gap-2 sm:gap-4 opacity-40">
                                <div className="w-4 sm:w-8 h-px bg-gray-500"></div>
                                <p className="text-[9px] sm:text-[10px] md:text-xs text-gray-100 tracking-[0.15em] sm:tracking-[0.3em] uppercase font-medium whitespace-nowrap">
                                    {content.edition_tag}
                                </p>
                                <div className="w-4 sm:w-8 h-px bg-gray-500"></div>
                            </div>
                        </div>
                    )}
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

// Counter Component — its colour is one of the four picked in the dashboard.
const AnimatedCounter: React.FC<{ value: number; suffix?: string; label: string; colourVar: string }> = ({ value, suffix = '+', label, colourVar }) => {
    const { count, ref } = useCountUp(value, 2000);

    return (
        <div
            ref={ref}
            className="bg-white dark:bg-gray-800 rounded-2xl p-6 md:p-8 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-[color:var(--a-100)] dark:border-[color:var(--a-900-30)] relative overflow-hidden group"
        >
            {/* Accent glow effect */}
            <div className="absolute -top-10 -right-10 w-24 h-24 bg-[color:var(--a-500-10)] rounded-full blur-2xl group-hover:bg-[color:var(--a-500-20)] transition-all duration-300"></div>
            <div className="text-3xl md:text-4xl font-bold mb-2 relative z-10" style={{ color: `var(${colourVar})` }}>
                {count.toLocaleString()}{suffix}
            </div>
            <p className="text-gray-700 dark:text-gray-300 font-medium text-sm relative z-10">{label}</p>
        </div>
    );
};

const ABOUT_GRID: Record<number, string> = { 1: 'max-w-xl mx-auto', 2: 'md:grid-cols-2 max-w-4xl mx-auto', 3: 'md:grid-cols-3' };
const DAYS_GRID: Record<number, string> = { 1: 'max-w-xl', 2: 'md:grid-cols-2 max-w-5xl', 3: 'md:grid-cols-2 lg:grid-cols-3 max-w-6xl', 4: 'md:grid-cols-2 max-w-5xl' };

interface LandingPageProps {
    /** Content to show instead of the active event's (used by the super admin preview). */
    content?: LandingContent;
    /** Preview mode: the menu sits in the page and nothing navigates away. */
    preview?: boolean;
}

export const LandingPage: React.FC<LandingPageProps> = ({ content: override, preview = false }) => {
    const content = useMemo(() => override ?? mergeLanding(getLandingContent()), [override]);
    const [showPopup, setShowPopup] = useState(content.ended_popup.show);
    const { hero, registration, about, gains, schedule, employer, highlights, social } = content;

    const go = (path: string | null) => {
        if (!preview && path) window.location.href = path;
    };

    const heroHighlights = hero.highlights.filter((h) => h.label.trim()).slice(0, 3);
    const heroLogo = safeUrl(hero.logo_url);
    const heroVideo = safeUrl(hero.video_url);
    const mapUrl = safeUrl(hero.map_url);
    const registerUrl = safeUrl(registration.register_url) ?? '/attendee-register';
    const aboutCards = about.cards.filter((c) => c.title || c.text).slice(0, 3);
    const gainItems = gains.items.filter((i) => i.text.trim());
    const stats = gains.stats.filter((s) => s.label).slice(0, 4);
    const days = schedule.days.filter((d) => d.title || d.date).slice(0, 4);
    const employerUrl = safeUrl(employer.form_url);
    // The highlights video is either a file uploaded by an admin or a YouTube link.
    const highlightFile = safeUrl(highlights.video_url);
    const highlightIsFile = !!highlightFile && /\.(mp4|webm)(\?|$)/i.test(highlightFile);
    const videoEmbed = highlightIsFile ? null : toYouTubeEmbed(highlights.video_url);

    const socialLinks = {
        linkedin: safeUrl(social.linkedin),
        facebook: safeUrl(social.facebook),
        instagram: safeUrl(social.instagram),
        whatsapp: safeUrl(social.whatsapp),
        tiktok: safeUrl(social.tiktok)
    };
    const hasSocial = Object.values(socialLinks).some(Boolean);

    return (
        <div className="min-h-screen bg-[color:var(--bg-page)] dark:bg-gray-950 transition-colors duration-300">
            {/* Event Ended Dismissable Popup Overlay */}
            <EventEndedPopup isOpen={showPopup} onClose={() => setShowPopup(false)} content={content.ended_popup} />

            <Navbar content={content.navbar} preview={preview} />

            {/* Hero Section */}
            <section className={`relative min-h-screen flex items-center justify-center overflow-hidden ${preview ? 'pt-4' : 'pt-16 md:pt-20'}`}>
                {/* Video Background */}
                <div className="absolute inset-0 z-0 overflow-hidden bg-gray-900">
                    {heroVideo && (
                        <video
                            key={heroVideo}
                            autoPlay
                            muted
                            loop
                            playsInline
                            className="absolute inset-0 w-full h-full object-cover"
                        >
                            <source src={heroVideo} />
                        </video>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-br from-gray-900/70 via-gray-800/60 to-gray-900/70 dark:from-gray-950/85 dark:via-gray-900/75 dark:to-[color:var(--a-950-50)]"></div>
                </div>

                {/* Animated background elements */}
                <div className="absolute inset-0 z-0 overflow-hidden">
                    <div className="absolute top-20 left-10 w-72 h-72 bg-[color:var(--a-500-10)] rounded-full blur-3xl animate-pulse"></div>
                    <div className="absolute bottom-20 right-10 w-96 h-96 bg-[color:var(--a-400-8)] rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[color:var(--a-300-5)] rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
                </div>

                {/* Hero Content */}
                <div className="relative z-10 text-center px-4 py-12 max-w-5xl mx-auto">
                    <div className="fade-in-up-blur">
                        {heroLogo && (
                            <div className="mx-auto w-40 h-40 md:w-52 md:h-52 bg-[color:var(--a-800)] rounded-full flex items-center justify-center mb-8 shadow-2xl ring-4 ring-[color:var(--a-400-50)] border-4 border-white transform hover:scale-105 transition-transform duration-300 p-1">
                                <img
                                    src={heroLogo}
                                    alt="Event logo"
                                    className="w-[90%] h-[90%] rounded-full object-contain"
                                />
                            </div>
                        )}
                        <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold text-[color:var(--t-ondark)] mb-2 tracking-tight drop-shadow-lg">
                            {renderRich(hero.title, 'text-[color:var(--a-400)] drop-shadow-md')}
                        </h1>
                        {hero.edition && (
                            <p className="text-2xl sm:text-3xl md:text-4xl font-semibold text-[color:var(--a-300)] mb-4 drop-shadow-md">
                                {hero.edition}
                            </p>
                        )}
                        {hero.tagline && (
                            <p className="text-2xl sm:text-3xl md:text-4xl text-[color:var(--t-ondark)] font-light italic mb-4 drop-shadow-md">
                                {hero.tagline}
                            </p>
                        )}

                        {(hero.dates || hero.venue) && (
                            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 mb-8">
                                {hero.dates && (
                                    <div className="flex items-center gap-3 text-[color:var(--t-ondark)]">
                                        <Calendar className="h-6 w-6 text-[color:var(--a-400)]" />
                                        <span className="text-lg md:text-xl font-bold">{hero.dates}</span>
                                    </div>
                                )}
                                {hero.dates && hero.venue && <div className="hidden sm:block w-px h-8 bg-[color:var(--a-400-50)]"></div>}
                                {hero.venue && (mapUrl ? (
                                    <a
                                        href={mapUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-3 text-[color:var(--t-ondark)] hover:text-[color:var(--a-300)] transition-colors"
                                        title="Open in Google Maps"
                                    >
                                        <span className="text-lg md:text-xl font-bold">{hero.venue}</span>
                                        <MapPin className="h-6 w-6 text-[color:var(--a-400)]" />
                                    </a>
                                ) : (
                                    <div className="flex items-center gap-3 text-[color:var(--t-ondark)]">
                                        <span className="text-lg md:text-xl font-bold">{hero.venue}</span>
                                        <MapPin className="h-6 w-6 text-[color:var(--a-400)]" />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Feature highlights */}
                    {heroHighlights.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-8 fade-in-blur max-w-xs sm:max-w-none mx-auto" style={{ animationDelay: '0.3s' }}>
                            {heroHighlights.map((highlight, i) => {
                                const Icon = landingIcon(highlight.icon);
                                return (
                                    <div key={i} className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl p-2 sm:p-4 text-center border border-gray-100 dark:border-gray-700 shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
                                        <Icon className="h-5 w-5 sm:h-7 sm:w-7 md:h-8 md:w-8 text-[color:var(--a-600)] dark:text-[color:var(--a-400)] mx-auto mb-1 sm:mb-2" />
                                        <p className="text-[color:var(--t-heading)] dark:text-white font-medium text-xs sm:text-sm"><strong>{highlight.label}</strong></p>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Big text */}
                    {hero.slogan && (
                        <div className="mb-4 fade-in-up-blur" style={{ animationDelay: '0.4s' }}>
                            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[color:var(--t-ondark)] mb-2">
                                {hero.slogan}
                            </h2>
                        </div>
                    )}
                </div>
            </section>

            {/* Registration Section */}
            {registration.show && (
                <section id="register-section" className="py-16 md:py-24 bg-[color:var(--a-50)] dark:bg-gray-900 transition-colors duration-300 border-y border-[color:var(--a-100)] dark:border-[color:var(--a-900-30)]">
                    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                        {/* Section Header */}
                        <div className="text-center mb-12">
                            {registration.badge && (
                                <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-[color:var(--a-100)] dark:bg-[color:var(--a-900-30)] text-[color:var(--a-600)] dark:text-[color:var(--a-400)] rounded-full text-sm font-medium mb-4">
                                    <Ticket className="h-4 w-4" />
                                    {registration.badge}
                                </span>
                            )}
                            <h2 className="text-3xl md:text-5xl font-bold text-[color:var(--t-heading)] dark:text-white mb-4">
                                {renderRich(registration.heading)}
                            </h2>
                            {registration.text && (
                                <p className="text-lg text-[color:var(--t-body)] dark:text-gray-400 max-w-3xl mx-auto">
                                    {renderRich(registration.text)}
                                </p>
                            )}

                            {/* Register button */}
                            <div className="mt-8">
                                <button
                                    onClick={() => go(registerUrl)}
                                    className="group/btn relative inline-flex items-center justify-center gap-4 px-16 py-7 text-white bg-gradient-to-r from-[color:var(--a-500)] to-[color:var(--a-600)] rounded-3xl shadow-lg hover:shadow-[color:var(--a-500-40)] hover:shadow-xl transition-all duration-300 transform hover:scale-[1.03] overflow-hidden border-2 border-white/70 ring-1 ring-[color:var(--a-300)]"
                                >
                                    <span className="absolute inset-0 bg-gradient-to-r from-[color:var(--a-600)] to-[color:var(--a-700)] opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300"></span>
                                    <div className="relative z-10 flex items-center gap-4">
                                        <span className="text-2xl font-bold uppercase tracking-wide">{registration.button_label || 'Register Here'}</span>
                                        <ArrowRight className="h-6 w-6 stroke-[3] transform group-hover/btn:translate-x-1 transition-transform duration-300" />
                                    </div>
                                </button>
                                {(registration.login_line || registration.login_link_label) && (
                                    <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-3">
                                        {registration.login_line}{' '}
                                        {registration.login_link_label && (
                                            <a href={preview ? undefined : '/login'} className="text-[color:var(--a-500)] hover:text-[color:var(--a-400)] underline font-medium">
                                                {registration.login_link_label}
                                            </a>
                                        )}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Cards */}
                        <div className={`grid grid-cols-1 gap-6 md:gap-8 mx-auto px-2 sm:px-0 ${registration.show_non_asu ? 'md:grid-cols-2 max-w-5xl' : 'max-w-2xl'}`}>

                            {/* ASU Students Card */}
                            <div className="relative overflow-hidden bg-white dark:bg-gray-800 rounded-3xl shadow-xl border-2 border-[color:var(--a-200)] dark:border-[color:var(--a-900-40)] transition-all duration-500 group hover:shadow-2xl hover:shadow-[color:var(--a-500-10)] hover:-translate-y-1 flex flex-col">
                                <div className="absolute -top-10 -right-10 w-40 h-40 bg-[color:var(--a-500-10)] rounded-full blur-3xl group-hover:bg-[color:var(--a-500-20)] transition-all duration-500"></div>
                                <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-[color:var(--a-400-10)] rounded-full blur-2xl"></div>

                                {registration.asu_banner && (
                                    <div className="px-8 py-5 flex items-center justify-center gap-3 bg-gradient-to-r from-[color:var(--free-from)] to-[color:var(--free-to)]">
                                        {(() => { const Icon = landingIcon('graduation'); return <Icon className="h-8 w-8 text-white" />; })()}
                                        <span className="text-2xl sm:text-3xl font-extrabold text-white uppercase tracking-wide">{registration.asu_banner}</span>
                                    </div>
                                )}

                                <div className="relative z-10 flex flex-col flex-grow p-5 sm:p-8 md:p-10">
                                    <h3 className="text-2xl sm:text-3xl font-bold text-[color:var(--t-heading)] dark:text-white mb-4">
                                        {registration.asu_title}
                                    </h3>
                                    <p className="text-base sm:text-lg text-gray-700 dark:text-gray-300 mb-4 leading-relaxed font-medium">
                                        {renderRich(registration.asu_text, 'text-[color:var(--free-to)] font-bold')}
                                    </p>
                                    {registration.asu_note && (
                                        <p className="text-base sm:text-lg text-gray-700 dark:text-gray-300 leading-relaxed font-medium">
                                            {registration.note_prefix && (
                                                <span className="font-bold text-[color:var(--a-600)] dark:text-[color:var(--a-400)]">{registration.note_prefix} </span>
                                            )}
                                            {renderRich(registration.asu_note)}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Non-ASU Students Card */}
                            {registration.show_non_asu && (
                                <div className="relative overflow-hidden bg-white dark:bg-gradient-to-br dark:from-gray-700 dark:to-gray-800 rounded-3xl shadow-xl border-2 border-[color:var(--paid-from)] dark:border-gray-700 transition-all duration-500 group hover:shadow-2xl hover:-translate-y-1 flex flex-col">
                                    <div className="absolute -top-10 -right-10 w-40 h-40 bg-[color:var(--a-500-10)] rounded-full blur-3xl group-hover:bg-[color:var(--a-500-20)] transition-all duration-500"></div>
                                    <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-[color:var(--a-400-10)] rounded-full blur-2xl"></div>

                                    {registration.non_asu_banner && (
                                        <div className="px-8 py-5 flex items-center justify-center gap-3 bg-gradient-to-r from-[color:var(--paid-from)] to-[color:var(--paid-to)]">
                                            <Ticket className="h-8 w-8 text-white" />
                                            <span className="text-2xl sm:text-3xl font-extrabold text-white uppercase tracking-wide">{registration.non_asu_banner}</span>
                                        </div>
                                    )}

                                    <div className="relative z-10 flex flex-col flex-grow p-5 sm:p-8 md:p-10">
                                        <h3 className="text-2xl sm:text-3xl font-bold text-[color:var(--t-heading)] dark:text-white mb-4">
                                            {registration.non_asu_title}
                                        </h3>
                                        <p className="text-base sm:text-lg text-gray-700 dark:text-gray-300 mb-6 leading-relaxed font-medium">
                                            {renderRich(registration.non_asu_text)}
                                        </p>

                                        {(registration.individual_price || registration.group_price) && (
                                            <div className="mt-auto">
                                                <div className={`grid grid-cols-1 gap-3 ${registration.individual_price && registration.group_price ? 'sm:grid-cols-2' : ''}`}>
                                                    {registration.individual_price && (
                                                        <div className="sm:aspect-square rounded-xl flex flex-col items-center justify-center p-4 py-5 sm:p-4 hover:scale-[1.03] transition-transform duration-300 border-2 bg-white dark:bg-gray-800/60" style={{ borderColor: 'var(--paid-from)' }}>
                                                            <Ticket className="h-7 w-7 mb-2" style={{ color: 'var(--paid-to)' }} />
                                                            <span className="text-sm font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--paid-to)' }}>{registration.individual_label}</span>
                                                            <span className="text-4xl font-extrabold leading-none text-center" style={{ color: 'var(--paid-to)' }}>{registration.individual_price}</span>
                                                            <span className="text-base font-bold mt-1" style={{ color: 'var(--paid-from)' }}>{registration.currency}</span>
                                                            {registration.individual_note && (
                                                                <p className="text-xs mt-1.5 font-semibold" style={{ color: 'var(--paid-to)' }}>{registration.individual_note}</p>
                                                            )}
                                                        </div>
                                                    )}

                                                    {registration.group_price && (
                                                        <div className="relative sm:aspect-square rounded-xl flex flex-col items-center justify-center p-4 py-5 sm:p-4 shadow-lg overflow-hidden hover:scale-[1.03] transition-transform duration-300 bg-gradient-to-br from-[color:var(--a-500)] to-[color:var(--a-600)]">
                                                            <Users className="h-7 w-7 text-white mb-2" />
                                                            <span className="text-sm font-bold text-white/80 uppercase tracking-wider mb-1">{registration.group_label}</span>
                                                            <span className="text-3xl font-extrabold text-white leading-none text-center">{registration.group_price}</span>
                                                            <span className="text-base font-bold text-white/80 mt-1">{registration.currency}</span>
                                                            {registration.group_note && (
                                                                <p className="text-white/80 text-xs mt-1.5 font-semibold">{registration.group_note}</p>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                        </div>
                    </div>
                </section>
            )}

            {/* About Section */}
            {about.show && (
                <section id="about" className="py-20 md:py-28 bg-[color:var(--bg-section)] dark:bg-gray-900 transition-colors duration-300">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="text-center mb-16">
                            {about.badge && (
                                <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-[color:var(--a-100)] dark:bg-[color:var(--a-900-30)] text-[color:var(--a-600)] dark:text-[color:var(--a-400)] rounded-full text-sm font-medium mb-4">
                                    <Target className="h-4 w-4" />
                                    {about.badge}
                                </span>
                            )}
                            <h2 className="text-3xl md:text-5xl font-bold text-[color:var(--t-heading)] dark:text-white mb-6">
                                {renderRich(about.heading)}
                            </h2>
                            {about.text && (
                                <p className="text-lg text-[color:var(--t-body)] dark:text-gray-400 max-w-4xl mx-auto leading-relaxed">
                                    {renderRich(about.text)}
                                </p>
                            )}
                        </div>

                        {aboutCards.length > 0 && (
                            <div className={`grid gap-8 ${ABOUT_GRID[aboutCards.length]}`}>
                                {aboutCards.map((card, i) => {
                                    const Icon = landingIcon(card.icon, 'handshake');
                                    return (
                                        <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 dark:border-gray-700 group hover:-translate-y-2">
                                            <div className="w-14 h-14 bg-gradient-to-br from-[color:var(--a-500)] to-[color:var(--a-600)] rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                                                <Icon className="h-7 w-7 text-white" />
                                            </div>
                                            <h3 className="text-xl font-bold text-[color:var(--t-heading)] dark:text-white mb-3">{card.title}</h3>
                                            <p className="text-[color:var(--t-body)] dark:text-gray-400">{renderRich(card.text)}</p>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </section>
            )}

            {/* What you gain */}
            {gains.show && (
                <section id="features" className="py-20 md:py-28 bg-[color:var(--bg-page)] dark:bg-gray-950 transition-colors duration-300">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className={`grid gap-12 items-center ${stats.length > 0 ? 'lg:grid-cols-2' : ''}`}>
                            <div>
                                <h2 className="text-3xl md:text-5xl font-bold text-[color:var(--t-heading)] dark:text-white mb-6">
                                    {renderRich(gains.heading)}
                                </h2>
                                {gains.text && (
                                    <p className="text-lg text-[color:var(--t-body)] dark:text-gray-400 mb-8 leading-relaxed">
                                        {renderRich(gains.text)}
                                    </p>
                                )}

                                {gainItems.length > 0 && (
                                    <div className="space-y-4">
                                        {gains.list_title && (
                                            <h4 className="font-semibold text-[color:var(--t-heading)] dark:text-white text-lg mb-4">{gains.list_title}</h4>
                                        )}
                                        {gainItems.map((item, i) => {
                                            const Icon = landingIcon(item.icon);
                                            return (
                                                <div key={i} className="flex items-center gap-4">
                                                    <div className="w-10 h-10 bg-[color:var(--a-100)] dark:bg-[color:var(--a-900-30)] rounded-lg flex items-center justify-center flex-shrink-0">
                                                        <Icon className="h-5 w-5 text-[color:var(--a-600)] dark:text-[color:var(--a-400)]" />
                                                    </div>
                                                    <h5 className="font-medium text-gray-800 dark:text-gray-200">{item.text}</h5>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Stats with Counter Animation */}
                            {stats.length > 0 && (
                                <div className="grid grid-cols-2 gap-4 md:gap-6">
                                    {stats.map((stat, i) => (
                                        <AnimatedCounter
                                            key={i}
                                            value={Number(stat.value) || 0}
                                            suffix={stat.suffix}
                                            label={stat.label}
                                            colourVar={`--stat-${(i % 4) + 1}`}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </section>
            )}

            {/* Schedule */}
            {schedule.show && (
                <section id="schedule" className="py-20 md:py-28 bg-[color:var(--bg-section)] dark:bg-gray-900 transition-colors duration-300">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="text-center mb-16">
                            {schedule.badge && (
                                <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-[color:var(--a-100)] dark:bg-[color:var(--a-900-30)] text-[color:var(--a-600)] dark:text-[color:var(--a-400)] rounded-full text-sm font-medium mb-4">
                                    <Clock className="h-4 w-4" />
                                    {schedule.badge}
                                </span>
                            )}
                            <h2 className="text-3xl md:text-5xl font-bold text-[color:var(--t-heading)] dark:text-white mb-6">
                                {renderRich(schedule.heading)}
                            </h2>
                            {schedule.text && (
                                <p className="text-lg text-[color:var(--t-body)] dark:text-gray-400 max-w-3xl mx-auto">
                                    {renderRich(schedule.text)}
                                </p>
                            )}
                        </div>

                        {days.length > 0 && (
                            <div className={`grid gap-10 mx-auto ${DAYS_GRID[days.length]}`}>
                                {days.map((day, i) => {
                                    const accent = i % 2 === 0;
                                    const items = cleanLines(day.items);
                                    const Icon = landingIcon(day.icon, 'calendar');
                                    return accent ? (
                                        <div key={i} className="relative overflow-hidden bg-gradient-to-br from-[color:var(--a-500)] to-[color:var(--a-600)] rounded-3xl p-8 sm:p-10 shadow-2xl transition-all duration-500 group hover:scale-[1.02]">
                                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl transform translate-x-10 -translate-y-10"></div>
                                            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full blur-xl transform -translate-x-6 translate-y-6"></div>

                                            <div className="relative z-10 h-full flex flex-col">
                                                <div className="flex flex-wrap items-center gap-4 mb-6">
                                                    <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                                        <Icon className="h-7 w-7 text-white" />
                                                    </div>
                                                    {day.date && (
                                                        <div className="inline-flex items-center justify-center px-4 py-1.5 bg-white/20 backdrop-blur-sm text-white rounded-full text-sm font-bold w-fit">
                                                            {day.date}
                                                        </div>
                                                    )}
                                                </div>
                                                <h3 className="text-2xl sm:text-3xl font-bold text-white mb-2">{day.title}</h3>
                                                {day.subtitle && (
                                                    <div className="text-white/90 font-semibold text-lg mb-4 border-b border-white/20 pb-2">{day.subtitle}</div>
                                                )}
                                                <ul className="text-white/90 space-y-3 text-sm sm:text-base flex-1">
                                                    {items.map((item, j) => (
                                                        <li key={j} className="flex gap-2 items-center">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-white/60 flex-shrink-0"></div>
                                                            <span>{item}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                                {day.hours && (
                                                    <div className="mt-6 pt-4 border-t border-white/20 flex items-center justify-center text-white/90 font-medium">
                                                        <Clock className="w-4 h-4 mr-2" />
                                                        <span>{day.hours}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <div key={i} className="relative overflow-hidden bg-gradient-to-br from-gray-800 to-gray-900 dark:from-gray-700 dark:to-gray-800 rounded-3xl p-8 sm:p-10 shadow-2xl transition-all duration-500 group hover:scale-[1.02]">
                                            <div className="absolute top-0 right-0 w-32 h-32 bg-[color:var(--a-500-10)] rounded-full blur-2xl transform translate-x-10 -translate-y-10"></div>
                                            <div className="absolute bottom-0 left-0 w-24 h-24 bg-[color:var(--a-500-10)] rounded-full blur-xl transform -translate-x-6 translate-y-6"></div>

                                            <div className="relative z-10 h-full flex flex-col">
                                                <div className="flex flex-wrap items-center gap-4 mb-6">
                                                    <div className="w-14 h-14 bg-[color:var(--a-500-20)] backdrop-blur-sm rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                                        <Icon className="h-7 w-7 text-[color:var(--a-400)]" />
                                                    </div>
                                                    {day.date && (
                                                        <div className="inline-flex items-center justify-center px-4 py-1.5 bg-[color:var(--a-500-20)] backdrop-blur-sm text-[color:var(--a-300)] rounded-full text-sm font-bold w-fit">
                                                            {day.date}
                                                        </div>
                                                    )}
                                                </div>
                                                <h3 className="text-2xl sm:text-3xl font-bold text-white mb-2">{day.title}</h3>
                                                {day.subtitle && (
                                                    <div className="text-white/90 font-semibold text-lg mb-4 border-b border-gray-600 pb-2">{day.subtitle}</div>
                                                )}
                                                <ul className="text-gray-300 space-y-3 text-sm sm:text-base flex-1">
                                                    {items.map((item, j) => (
                                                        <li key={j} className="flex gap-2 items-center">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-[color:var(--a-500-60)] flex-shrink-0"></div>
                                                            <span>{item}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                                {day.hours && (
                                                    <div className="mt-6 pt-4 border-t border-gray-700 flex items-center justify-center text-gray-400 font-medium">
                                                        <Clock className="w-4 h-4 mr-2" />
                                                        <span>{day.hours}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </section>
            )}

            {/* Employers */}
            {employer.show && (
                <section className="py-20 md:py-28 bg-[color:var(--bg-page)] dark:bg-gray-950 transition-colors duration-300">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[color:var(--a-50)] to-[color:var(--a-100)] dark:from-gray-900 dark:to-gray-800 border border-[color:var(--a-100)] dark:border-gray-700 shadow-lg">

                            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 p-8 md:p-16 items-center relative z-10">
                                <div className="text-center lg:text-left lg:col-span-3">
                                    <h2 className="text-3xl md:text-5xl font-bold text-[color:var(--t-heading)] dark:text-white mb-4">
                                        {employer.heading}
                                    </h2>
                                    <div className="w-24 h-1 bg-gradient-to-r from-transparent via-[color:var(--a-600)] to-transparent mx-auto lg:mx-0 rounded-full mb-8"></div>
                                    <div className="text-xl text-[color:var(--t-body)] dark:text-gray-300 mb-10 leading-relaxed">
                                        {cleanLines(employer.paragraphs).map((paragraph, i, all) => (
                                            <p key={i} className={`mb-4 ${i === all.length - 1 && all.length > 1 ? 'font-medium text-[color:var(--t-heading)] dark:text-white' : ''}`}>
                                                {renderRich(paragraph)}
                                            </p>
                                        ))}
                                    </div>

                                    {employerUrl && (
                                        <div className="flex justify-center lg:justify-start">
                                            <a
                                                href={employerUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="px-8 py-4 bg-[color:var(--a-600)] text-white rounded-full font-bold text-lg hover:bg-[color:var(--a-700)] transition-all duration-300 shadow-lg hover:shadow-[color:var(--a-500-20)] flex items-center"
                                            >
                                                <ExternalLink className="mr-2 w-5 h-5" />
                                                {employer.button_label || 'Get in touch'}
                                            </a>
                                        </div>
                                    )}
                                </div>

                                <div className="flex justify-center items-center order-first lg:order-last lg:col-span-2">
                                    <div className="relative">
                                        <div className="absolute inset-0 bg-[color:var(--a-200)] dark:bg-[color:var(--a-900-40)] rounded-full blur-3xl opacity-40 transform scale-125"></div>
                                        <Handshake className="relative w-40 h-40 md:w-48 md:h-48 lg:w-56 lg:h-56 text-[color:var(--a-600)] dark:text-[color:var(--a-500)] drop-shadow-2xl" strokeWidth={1} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            )}

            {/* Highlights video */}
            {highlights.show && (videoEmbed || highlightIsFile) && (
                <section className="py-20 md:py-28 bg-[color:var(--bg-section)] dark:bg-gray-900 transition-colors duration-300">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="text-center mb-16">
                            {highlights.badge && (
                                <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-[color:var(--a-100)] dark:bg-[color:var(--a-900-30)] text-[color:var(--a-600)] dark:text-[color:var(--a-400)] rounded-full text-sm font-medium mb-4">
                                    <Sparkles className="h-4 w-4" />
                                    {highlights.badge}
                                </span>
                            )}
                            <h2 className="text-3xl md:text-5xl font-bold text-[color:var(--t-heading)] dark:text-white mb-6">
                                {renderRich(highlights.heading)}
                            </h2>
                            {highlights.text && (
                                <p className="text-lg text-[color:var(--t-body)] dark:text-gray-400 max-w-3xl mx-auto">
                                    {renderRich(highlights.text)}
                                </p>
                            )}
                        </div>

                        <div className="max-w-4xl mx-auto">
                            <div className="relative rounded-3xl overflow-hidden shadow-2xl bg-gray-900 aspect-video">
                                {videoEmbed ? (
                                    <iframe
                                        className="w-full h-full"
                                        src={videoEmbed}
                                        title={highlights.caption || 'Event highlights'}
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                        allowFullScreen
                                    ></iframe>
                                ) : (
                                    <video className="w-full h-full object-cover" src={highlightFile ?? undefined} controls playsInline preload="metadata" />
                                )}
                            </div>

                            {highlights.caption && (
                                <p className="text-center text-gray-500 dark:text-gray-400 mt-6 text-sm">
                                    {highlights.caption}
                                </p>
                            )}
                        </div>
                    </div>
                </section>
            )}

            {/* Social Media */}
            {social.show && hasSocial && (
                <section className="py-20 bg-[color:var(--bg-section)] dark:bg-gray-900/50">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="text-center mb-12">
                            <h2 className="text-3xl font-bold text-[color:var(--t-heading)] dark:text-white mb-4">{social.heading}</h2>
                            <div className="w-24 h-1 bg-gradient-to-r from-transparent via-[color:var(--a-600)] to-transparent mx-auto rounded-full mb-6"></div>
                            {social.text && <p className="text-[color:var(--t-body)] dark:text-gray-400">{social.text}</p>}
                        </div>

                        <div className="flex flex-wrap justify-center items-center gap-8 md:gap-12">
                            {socialLinks.linkedin && (
                                <a href={socialLinks.linkedin} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn"
                                    className="group transition-transform duration-300 hover:-translate-y-2">
                                    <div className="p-4 rounded-full bg-white dark:bg-gray-800 shadow-sm group-hover:bg-[#0077b5] group-hover:shadow-lg group-hover:shadow-blue-500/30 transition-all duration-300">
                                        <Linkedin className="w-10 h-10 text-[#0077b5] group-hover:text-white transition-colors duration-300" strokeWidth={1.5} />
                                    </div>
                                </a>
                            )}

                            {socialLinks.facebook && (
                                <a href={socialLinks.facebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook"
                                    className="group transition-transform duration-300 hover:-translate-y-2">
                                    <div className="p-4 rounded-full bg-white dark:bg-gray-800 shadow-sm group-hover:bg-[#1877f2] group-hover:shadow-lg group-hover:shadow-blue-600/30 transition-all duration-300">
                                        <Facebook className="w-10 h-10 text-[#1877f2] group-hover:text-white transition-colors duration-300" strokeWidth={1.5} />
                                    </div>
                                </a>
                            )}

                            {socialLinks.instagram && (
                                <a href={socialLinks.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram"
                                    className="group transition-transform duration-300 hover:-translate-y-2">
                                    <div className="p-4 rounded-full bg-white dark:bg-gray-800 shadow-sm group-hover:bg-gradient-to-tr group-hover:from-[#f09433] group-hover:via-[#dc2743] group-hover:to-[#bc1888] group-hover:shadow-lg group-hover:shadow-pink-500/30 transition-all duration-300">
                                        <Instagram className="w-10 h-10 text-[#E4405F] group-hover:text-white transition-colors duration-300" strokeWidth={1.5} />
                                    </div>
                                </a>
                            )}

                            {socialLinks.whatsapp && (
                                <a href={socialLinks.whatsapp} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp"
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
                            )}

                            {socialLinks.tiktok && (
                                <a href={socialLinks.tiktok} target="_blank" rel="noopener noreferrer" aria-label="TikTok"
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
                            )}
                        </div>
                    </div>
                </section>
            )}

            <Footer content={content.footer} preview={preview} />
        </div>
    );
};
