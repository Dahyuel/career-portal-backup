import { Building2, Users, BookOpen, Briefcase, Award, ExternalLink, Handshake, Calendar, BadgeCheck, Facebook, Linkedin, Instagram } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

import { Navbar } from '../../components/shared/Navbar';

const AnimatedCounter = ({ end, duration = 2000, suffix = "" }: { end: number, duration?: number, suffix?: string }) => {
    const [count, setCount] = useState(0);
    const countRef = useRef<HTMLSpanElement>(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    observer.disconnect();
                }
            },
            { threshold: 0.1 }
        );

        if (countRef.current) {
            observer.observe(countRef.current);
        }

        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        if (!isVisible) return;

        let startTime: number | null = null;
        let animationFrame: number;

        const animate = (timestamp: number) => {
            if (!startTime) startTime = timestamp;
            const progress = timestamp - startTime;
            const percentage = Math.min(progress / duration, 1);

            // Ease-in function (starts slow, ends fast): t^3
            const easeIn = (t: number) => t * t * t;

            const currentCount = Math.floor(easeIn(percentage) * end);
            setCount(currentCount);

            if (percentage < 1) {
                animationFrame = requestAnimationFrame(animate);
            } else {
                setCount(end);
            }
        };

        animationFrame = requestAnimationFrame(animate);

        return () => cancelAnimationFrame(animationFrame);
    }, [end, duration, isVisible]);

    return <span ref={countRef}>{count.toLocaleString()}{suffix}</span>;
};

export const AboutCareerCenter: React.FC = () => {


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

            {/* Our Impact & Reach (Moved) */}
            <section className="py-20 bg-white dark:bg-gray-950">
                <div className="max-w-[90rem] mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Our Impact & Reach</h2>
                        <div className="w-24 h-1 bg-gradient-to-r from-transparent via-red-600 to-transparent mx-auto rounded-full mb-6"></div>
                        <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">Growing together with our community of students and partners.</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 xl:gap-8">
                        {[
                            { value: 75000, suffix: "+", label: "Beneficiaries (Students & Alumni)", icon: <Users className="w-8 h-8 text-green-500" /> },
                            { value: 500, suffix: "+", label: "Trusted Employer Partners", icon: <Handshake className="w-8 h-8 text-blue-500" /> },
                            { value: 500, suffix: "+", label: "Career Education Programs Delivered", icon: <BookOpen className="w-8 h-8 text-yellow-500" /> },
                            { value: 57, suffix: "+", label: "Experiential Learning Activities", icon: <Briefcase className="w-8 h-8 text-purple-500" /> },
                            { value: 8, suffix: "", label: "Mega Career Events Hosted", icon: <Calendar className="w-8 h-8 text-red-500" /> }
                        ].map((stat, idx) => (
                            <div key={idx} className="flex flex-col items-center justify-center p-6 py-8 md:p-8 md:py-10 min-h-[240px] rounded-2xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 hover:border-red-100 dark:hover:border-red-900/50 transition-colors duration-300 w-full">
                                <div className="mb-5 p-5 bg-white dark:bg-gray-800 rounded-full shadow-sm">
                                    {stat.icon}
                                </div>
                                <div className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-3 text-center">
                                    <AnimatedCounter end={stat.value} suffix={stat.suffix} />
                                </div>
                                <div className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center leading-tight max-w-[220px]">{stat.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Our Purpose */}
            <section className="py-8 bg-gray-50 dark:bg-gray-900/50">
                <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col fade-in-up p-6 md:p-8 bg-white dark:bg-gray-800 rounded-3xl shadow-lg border border-gray-100 dark:border-gray-700 text-center relative overflow-hidden">

                        {/* Decorative background element */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-red-50 dark:bg-red-900/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 opacity-60"></div>
                        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-50 dark:bg-blue-900/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 opacity-60"></div>

                        <div className="relative z-10 flex flex-col items-center">
                            <div className="p-3 bg-gradient-to-br from-blue-100 to-blue-50 dark:from-blue-900/40 dark:to-blue-800/20 rounded-2xl mb-3 shadow-inner">
                                <Award className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Our Purpose</h2>
                            <p className="text-lg text-black dark:text-white leading-relaxed font-light">
                                We act as a strategic liaison, building robust corporate partnerships to provide our students with real-world
                                experiential learning. Simultaneously, we support our partners in discovering and attracting top-tier talent to fulfill their recruitment goals.
                            </p>
                        </div>
                    </div>
                </div>
            </section>



            {/* What We Do */}
            <section className="py-20 bg-gray-50 dark:bg-gray-900/30">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">What We Do</h2>
                        <div className="w-24 h-1 bg-gradient-to-r from-transparent via-red-600 to-transparent mx-auto rounded-full mb-6"></div>
                        <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                            Comprehensive support services designed to launch your career
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {[
                            {
                                icon: <BookOpen className="w-8 h-8 text-red-500" />,
                                title: "Career Education",
                                description: "Programs designed to sharpen soft skills and employability, including our Be-Ready bootcamp, targeted workshops, personalized career guidance, and business communication training."
                            },
                            {
                                icon: <Briefcase className="w-8 h-8 text-red-500" />,
                                title: "Experiential Learning",
                                description: "Bridging the gap between classroom and market through corporate site visits, mock interviews, case competitions, and professional simulations with industry leaders."
                            },
                            {
                                icon: <Handshake className="w-8 h-8 text-red-500" />,
                                title: "Matchmaking Events",
                                description: "Connecting talent with top opportunities through our flagship ASU Career Expo in April and the specialized Career Focus Week every October."
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

            {/* Video Section */}
            <section className="py-20 bg-white dark:bg-gray-950">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">See Us in Action</h2>
                        <div className="w-24 h-1 bg-gradient-to-r from-transparent via-red-600 to-transparent mx-auto rounded-full mb-6"></div>
                        <p className="text-gray-600 dark:text-gray-400">Discover how we empower students and connect them with opportunities</p>
                    </div>
                    <div className="relative pt-[56.25%] rounded-3xl overflow-hidden shadow-2xl border border-gray-100 dark:border-gray-800 group">
                        <iframe
                            className="absolute top-0 left-0 w-full h-full"
                            src="https://www.youtube.com/embed/LIVsHC1P9z4"
                            title="ASU Career Center Video"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                        ></iframe>
                    </div>
                </div>
            </section>

            {/* Free Services Notice */}
            {/* Free Services Notice */}
            <section className="py-16 bg-white dark:bg-gray-950">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="bg-slate-50 dark:bg-gray-800 rounded-3xl p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-8 border border-slate-100 dark:border-gray-700 shadow-sm relative overflow-hidden group hover:border-red-100 dark:hover:border-red-900/30 transition-colors duration-300">

                        <div className="flex-1 relative z-10 text-center md:text-left">
                            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Empowering Your Future <span className="text-red-600 dark:text-red-400">at No Cost</span></h2>
                            <p className="text-lg text-gray-700 dark:text-gray-300 leading-relaxed font-medium">
                                All our programs and services are free of charge for any student or graduate holding a valid <span className="text-red-600 dark:text-red-400 font-semibold">Ain Shams University ID</span> or <span className="text-red-600 dark:text-red-400 font-semibold">Graduation Certificate</span>. We are here to elevate your career journey.
                            </p>
                        </div>

                        <div className="relative z-10 flex-shrink-0">
                            <div className="p-6 bg-white dark:bg-gray-900 rounded-full shadow-md border border-gray-100 dark:border-gray-700 group-hover:scale-105 transition-transform duration-300">
                                <BadgeCheck className="w-20 h-20 text-red-600 dark:text-red-500" strokeWidth={1.5} />
                            </div>
                        </div>

                        {/* Decorative blobs */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-red-100 dark:bg-red-900/10 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2 opacity-50"></div>
                        <div className="absolute bottom-0 left-0 w-64 h-64 bg-slate-200 dark:bg-slate-700/20 rounded-full blur-3xl -translate-x-1/2 translate-y-1/2 opacity-50"></div>
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
                                <h2 className="text-3xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
                                    Are You an Employer?
                                </h2>
                                <div className="w-24 h-1 bg-gradient-to-r from-transparent via-red-600 to-transparent mx-auto lg:mx-0 rounded-full mb-8"></div>
                                <p className="text-xl text-gray-600 dark:text-gray-300 mb-10 leading-relaxed space-y-4">
                                    <span className="block mb-4">
                                        Are you interested in participating in our events or hiring top talent from Ain Shams University?
                                    </span>
                                    <span className="block mb-4">
                                        Join our network of over 150+ partners and connect with the brightest minds. We make recruitment easy, efficient, and effective.
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

                        {/* WhatsApp (Official Icon) */}
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

                        {/* TikTok (Official Icon) */}
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

        </div>
    );
};

export default AboutCareerCenter;