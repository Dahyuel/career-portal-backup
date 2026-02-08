import React from 'react';
import { Building2, Target, Users, BookOpen, Briefcase, Award, ArrowRight, Mail, ExternalLink, Sparkles, Handshake, Facebook, Instagram, Linkedin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '../../components/shared/Navbar';

export const AboutCareerCenter: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-white dark:bg-gray-950 transition-colors duration-300">
            <Navbar />

            {/* Hero Section */}
            <div className="relative pt-32 pb-12 md:pt-40 md:pb-20 overflow-hidden">
                <div className="absolute inset-0 z-0">
                    <div className="absolute inset-0 bg-gradient-to-b from-red-50/50 via-white to-white dark:from-red-900/10 dark:via-gray-950 dark:to-gray-950"></div>
                </div>

                <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col-reverse md:flex-row items-center gap-8 md:gap-16">
                        {/* Left Content */}
                        <div className="flex-1 text-center md:text-left">
                            <div className="inline-flex items-center justify-center p-2 bg-red-100 dark:bg-red-900/30 rounded-full mb-6 fade-in-down shadow-sm">
                                <Building2 className="w-5 h-5 text-red-600 dark:text-red-400 mr-2" />
                                <span className="text-sm font-semibold text-red-700 dark:text-red-300">Established 2020</span>
                            </div>
                            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6 fade-in-up leading-tight">
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-800 to-red-600">About</span> ASU Career Center
                            </h1>
                            <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 mb-8 fade-in-up delay-100 leading-relaxed">
                                The ASU Career Center is dedicated to bridging the gap between academic excellence and professional success, providing students and alumni with the tools, resources, and connections needed to thrive in today's competitive job market.
                            </p>
                        </div>

                        {/* Right Image/Logo - Smaller */}
                        <div className="flex-1 flex justify-center md:justify-end fade-in-right">
                            <div className="relative w-48 h-48 md:w-72 md:h-72">
                                <div className="absolute inset-0 bg-red-200 dark:bg-red-900/20 rounded-full blur-3xl opacity-30 animate-pulse"></div>
                                <img
                                    src="/images/logo.png"
                                    alt="Career Center Logo"
                                    className="relative w-full h-full object-contain drop-shadow-xl hover:scale-105 transition-transform duration-500"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div >

            {/* Mission & Vision */}
            <section className="py-12 bg-gray-50 dark:bg-gray-900/50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch pt-0">
                        <div className="flex flex-col space-y-4 fade-in-left p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 h-full">
                            <div className="flex items-center space-x-4">
                                <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-xl">
                                    <Target className="w-8 h-8 text-red-600 dark:text-red-400" />
                                </div>
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Our Mission</h2>
                            </div>
                            <p className="text-gray-600 dark:text-gray-300 leading-relaxed flex-grow">
                                To empower Ain Shams University students and graduates by providing comprehensive career guidance, professional development opportunities, and bridging connections with top-tier employers.
                            </p>
                        </div>
                        <div className="flex flex-col space-y-4 fade-in-right p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 h-full">
                            <div className="flex items-center space-x-4">
                                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                                    <Award className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                                </div>
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Our Vision</h2>
                            </div>
                            <p className="text-gray-600 dark:text-gray-300 leading-relaxed flex-grow">
                                To be the leading university career center in the region, recognized for excellence in career development and strong industry partnerships.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Reformatted Stats Section */}
            <section className="py-20 bg-white dark:bg-gray-950">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Our Impact & Reach</h2>
                        <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">Growing together with our community of students and partners.</p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                        {[
                            { number: "50+", label: "Annual Events", icon: <Sparkles className="w-6 h-6 text-yellow-500" /> },
                            { number: "150+", label: "Partners", icon: <Building2 className="w-6 h-6 text-blue-500" /> },
                            { number: "10k+", label: "Students", icon: <Users className="w-6 h-6 text-green-500" /> },
                            { number: "95%", label: "Satisfaction", icon: <Award className="w-6 h-6 text-purple-500" /> }
                        ].map((stat, idx) => (
                            <div key={idx} className="flex flex-col items-center justify-center p-6 rounded-2xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 hover:border-red-100 dark:hover:border-red-900/50 transition-colors duration-300">
                                <div className="mb-3 p-3 bg-white dark:bg-gray-800 rounded-full shadow-sm">
                                    {stat.icon}
                                </div>
                                <div className="text-4xl font-bold text-gray-900 dark:text-white mb-1">{stat.number}</div>
                                <div className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{stat.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* What We Do */}
            <section className="py-20 bg-gray-50 dark:bg-gray-900/30">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">What We Do</h2>
                        <div className="w-24 h-1 bg-red-600 mx-auto rounded-full mb-6"></div>
                        <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                            Comprehensive support services designed to launch your career
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {[
                            {
                                icon: <BookOpen className="w-8 h-8 text-red-500" />,
                                title: "Career Counseling",
                                description: "One-on-one guidance to help you discover your path, refine your resume, and prepare for interviews."
                            },
                            {
                                icon: <Users className="w-8 h-8 text-red-500" />,
                                title: "Networking Events",
                                description: "Regular meetups, industry talks, and alumni networking sessions to expand your professional circle."
                            },
                            {
                                icon: <Briefcase className="w-8 h-8 text-red-500" />,
                                title: "Employment Fairs",
                                description: "Our flagship annual event connecting thousands of students with leading local and international companies."
                            }
                        ].map((item, index) => (
                            <div key={index} className="group p-8 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 hover:shadow-xl hover:shadow-red-500/5 transition-all duration-300 hover:-translate-y-2">
                                <div className="mb-6 bg-gray-50 dark:bg-gray-900 p-4 rounded-xl inline-block shadow-sm group-hover:bg-red-50 dark:group-hover:bg-red-900/20 transition-colors">
                                    {item.icon}
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">{item.title}</h3>
                                <p className="text-gray-600 dark:text-gray-400">
                                    {item.description}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Partner With Us Section - Two Column Layout */}
            <section className="py-24 bg-white dark:bg-gray-950">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-orange-50 to-red-50 dark:from-gray-900 dark:to-gray-800 border border-red-100 dark:border-gray-700 shadow-lg">

                        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 p-8 md:p-16 items-center relative z-10">
                            {/* Left Content - Takes 3 of 5 columns on large screens */}
                            <div className="text-center lg:text-left lg:col-span-3">
                                <h2 className="text-3xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6">
                                    Are You an Employer?
                                </h2>
                                <p className="text-xl text-gray-600 dark:text-gray-300 mb-10 leading-relaxed space-y-4">
                                    <span className="block mb-4">
                                        Are you interested in participating in our events or hiring top talent from Ain Shams University?
                                    </span>
                                    <span className="block mb-4">
                                        Join our network of over 150+ partners and connect with the brightest minds. We make recruitment easy, efficient, and effective.
                                    </span>
                                    <span className="block font-medium text-gray-900 dark:text-white">
                                        Reach out to discuss future collaborations at{' '}
                                        <a href="mailto:asuc@asu.eg" className="text-red-600 hover:text-red-700 underline decoration-red-200 underline-offset-4 transition-colors">asuc@asu.eg</a>
                                        {' '}or{' '}
                                        <a href="mailto:cc@asu.eg" className="text-red-600 hover:text-red-700 underline decoration-red-200 underline-offset-4 transition-colors">cc@asu.eg</a>
                                    </span>
                                </p>

                                <div className="flex justify-center lg:justify-start">
                                    <a
                                        href="mailto:careercenter@asu.edu.eg"
                                        className="px-8 py-4 bg-red-600 text-white rounded-full font-bold text-lg hover:bg-red-700 transition-all duration-300 shadow-lg hover:shadow-red-500/20 flex items-center"
                                    >
                                        <Mail className="mr-2 w-5 h-5" />
                                        Get in Touch
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

            {/* Social Media Section */}
            <section className="py-12 bg-white dark:bg-gray-950">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center">
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Follow Us</h3>
                        <div className="flex justify-center gap-6">
                            <a
                                href="https://facebook.com/asucareer"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group p-4 bg-gray-100 dark:bg-gray-800 rounded-full hover:bg-blue-600 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/50 hover:scale-110"
                            >
                                <Facebook className="w-7 h-7 text-gray-600 dark:text-gray-400 group-hover:text-white transition-colors" />
                            </a>
                            <a
                                href="https://instagram.com/asucareer"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group p-4 bg-gray-100 dark:bg-gray-800 rounded-full hover:bg-gradient-to-br hover:from-purple-600 hover:via-pink-500 hover:to-orange-400 transition-all duration-300 hover:shadow-lg hover:shadow-pink-500/50 hover:scale-110"
                            >
                                <Instagram className="w-7 h-7 text-gray-600 dark:text-gray-400 group-hover:text-white transition-colors" />
                            </a>
                            <a
                                href="https://linkedin.com/company/asucareer"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group p-4 bg-gray-100 dark:bg-gray-800 rounded-full hover:bg-sky-700 transition-all duration-300 hover:shadow-lg hover:shadow-sky-500/50 hover:scale-110"
                            >
                                <Linkedin className="w-7 h-7 text-gray-600 dark:text-gray-400 group-hover:text-white transition-colors" />
                            </a>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default AboutCareerCenter;
