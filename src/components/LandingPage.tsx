import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Briefcase, Users, Calendar, Award, MapPin, Clock, Target, Sparkles, Building2, GraduationCap, Handshake } from 'lucide-react';
import { Navbar } from './shared/Navbar';

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
                                alt="ASU Career Week Logo"
                                className="w-24 h-24 md:w-32 md:h-32 rounded-full object-cover"
                            />
                        </div>
                        <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold text-white mb-4 tracking-tight drop-shadow-lg">
                            ASU <span className="text-red-400 drop-shadow-md">Employment Fair 2026 </span>
                        </h1>
                        <p className="text-lg sm:text-xl md:text-2xl text-red-100 max-w-3xl mx-auto leading-relaxed mb-4 drop-shadow-md">
                            Your gateway to exceptional career opportunities and professional growth
                        </p>
                        <div className="flex flex-wrap items-center justify-center gap-4 text-red-200 text-sm md:text-base mb-8 drop-shadow-md">
                            <span className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                April, 2026
                            </span>
                            <span className="flex items-center gap-2">
                                <MapPin className="h-4 w-4" />
                                Ain Shams University Campus
                            </span>
                        </div>
                    </div>

                    {/* Feature highlights */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 mb-10 fade-in-blur" style={{ animationDelay: '0.3s' }}>
                        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 text-center border border-gray-100 dark:border-gray-700 shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
                            <Briefcase className="h-7 w-7 md:h-8 md:w-8 text-red-600 dark:text-red-400 mx-auto mb-2" />
                            <p className="text-gray-900 dark:text-white font-medium text-md"><strong >90+</strong> Companies</p>
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 text-center border border-gray-100 dark:border-gray-700 shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
                            <Calendar className="h-7 w-7 md:h-8 md:w-8 text-red-600 dark:text-red-400 mx-auto mb-2" />
                            <p className="text-gray-900 dark:text-white font-medium text-sm">2-Day Event</p>
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 text-center border border-gray-100 dark:border-gray-700 shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
                            <Award className="h-7 w-7 md:h-8 md:w-8 text-red-600 dark:text-red-400 mx-auto mb-2" />
                            <p className="text-gray-900 dark:text-white font-medium text-sm">Career Growth</p>
                        </div>
                    </div>

                    {/* Big text above buttons */}
                    <div className="mb-8 fade-in-up-blur" style={{ animationDelay: '0.4s' }}>
                        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2">
                            Ready to Start Your Journey?
                        </h2>
                        <p className="text-lg text-white/80">This year, it is open for ASU and Non-ASU Students!</p>
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
                    </div>
                </div>
            </section>

            {/* About Section */}
            <section id="about" className="py-20 md:py-28 bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full text-sm font-medium mb-4">
                            <Sparkles className="h-4 w-4" />
                            About The Event
                        </span>
                        <h2 className="text-3xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6">
                            Egypt's Largest <span className="text-red-500">Career Fair</span>
                        </h2>
                        <p className="text-lg text-gray-600 dark:text-gray-400 max-w-3xl mx-auto leading-relaxed">
                            ASU Career Week is the premier career event that connects talented students and graduates
                            with leading companies across Egypt. Join thousands of ambitious professionals in this
                            transformative experience.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 dark:border-gray-700 group hover:-translate-y-2">
                            <div className="w-14 h-14 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                                <Building2 className="h-7 w-7 text-white" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Top Companies</h3>
                            <p className="text-gray-600 dark:text-gray-400">
                                Connect with 50+ leading companies including multinational corporations, startups,
                                and government organizations actively hiring fresh talent.
                            </p>
                        </div>

                        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 dark:border-gray-700 group hover:-translate-y-2">
                            <div className="w-14 h-14 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                                <GraduationCap className="h-7 w-7 text-white" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Career Workshops</h3>
                            <p className="text-gray-600 dark:text-gray-400">
                                Attend exclusive workshops on CV writing, interview skills, personal branding,
                                and industry insights from leading professionals.
                            </p>
                        </div>

                        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 dark:border-gray-700 group hover:-translate-y-2">
                            <div className="w-14 h-14 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                                <Handshake className="h-7 w-7 text-white" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Networking</h3>
                            <p className="text-gray-600 dark:text-gray-400">
                                Build meaningful connections with industry leaders, HR managers, and fellow
                                ambitious students to expand your professional network.
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
                            <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full text-sm font-medium mb-4">
                                <Target className="h-4 w-4" />
                                Why Attend
                            </span>
                            <h2 className="text-3xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6">
                                Launch Your <span className="text-red-500">Dream Career</span>
                            </h2>
                            <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
                                Don't miss this opportunity to take the first step towards your dream career.
                                ASU Career Week offers everything you need to stand out in today's competitive job market.
                            </p>

                            <div className="space-y-4">
                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <Briefcase className="h-5 w-5 text-red-600 dark:text-red-400" />
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-gray-900 dark:text-white mb-1">On-Spot Interviews</h4>
                                        <p className="text-gray-600 dark:text-gray-400 text-sm">Get interviewed directly by company representatives and receive immediate feedback.</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <Users className="h-5 w-5 text-red-600 dark:text-red-400" />
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-gray-900 dark:text-white mb-1">Mentorship Sessions</h4>
                                        <p className="text-gray-600 dark:text-gray-400 text-sm">One-on-one guidance from industry experts to help you navigate your career path.</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <Award className="h-5 w-5 text-red-600 dark:text-red-400" />
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-gray-900 dark:text-white mb-1">Certificates & Prizes</h4>
                                        <p className="text-gray-600 dark:text-gray-400 text-sm">Earn participation certificates and compete for exciting prizes and internship opportunities.</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-2 gap-4 md:gap-6">
                            <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-2xl p-6 md:p-8 text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
                                <div className="text-4xl md:text-5xl font-bold mb-2">50+</div>
                                <p className="text-red-100 font-medium">Companies</p>
                            </div>
                            <div className="bg-gray-900 dark:bg-gray-800 rounded-2xl p-6 md:p-8 text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
                                <div className="text-4xl md:text-5xl font-bold mb-2">2K+</div>
                                <p className="text-gray-400 font-medium">Attendees</p>
                            </div>
                            <div className="bg-gray-900 dark:bg-gray-800 rounded-2xl p-6 md:p-8 text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
                                <div className="text-4xl md:text-5xl font-bold mb-2">30+</div>
                                <p className="text-gray-400 font-medium">Workshops</p>
                            </div>
                            <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-2xl p-6 md:p-8 text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
                                <div className="text-4xl md:text-5xl font-bold mb-2">6</div>
                                <p className="text-red-100 font-medium">Days</p>
                            </div>
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
                            6 Days of <span className="text-red-500">Opportunities</span>
                        </h2>
                        <p className="text-lg text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
                            Each day is packed with exciting activities, workshops, and networking opportunities.
                            Register now to access the full schedule.
                        </p>
                    </div>

                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[
                            { day: 'Day 1', title: 'Opening Ceremony & Industry Panels', desc: 'Kickoff with keynote speakers and panel discussions' },
                            { day: 'Day 2', title: 'Technology & Engineering', desc: 'Tech companies, coding challenges, and workshops' },
                            { day: 'Day 3', title: 'Business & Finance', desc: 'Banking, consulting, and business opportunities' },
                            { day: 'Day 4', title: 'Healthcare & Sciences', desc: 'Medical and pharmaceutical companies' },
                            { day: 'Day 5', title: 'Creative Industries', desc: 'Marketing, design, and media companies' },
                            { day: 'Day 6', title: 'Closing & Networking', desc: 'Final interviews and networking gala' },
                        ].map((item, index) => (
                            <div
                                key={index}
                                className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 dark:border-gray-700 group hover:-translate-y-2"
                            >
                                <div className="inline-flex items-center justify-center px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full text-sm font-bold mb-4">
                                    {item.day}
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{item.title}</h3>
                                <p className="text-gray-600 dark:text-gray-400 text-sm">{item.desc}</p>
                            </div>
                        ))}
                    </div>


                </div>
            </section>
        </div>
    );
};