import React, { useState } from 'react';
import { Calendar, Clock, MapPin, Users, Mic, Coffee, Briefcase, Award, ChevronDown, ChevronUp } from 'lucide-react';
import { Navbar } from '../../components/shared/Navbar';

// Demo agenda data
const agendaData = {
    day1: {
        date: "April 7, 2026",
        title: "Day 1 - Engineering, Tech & Sciences",
        sessions: [
            {
                time: "08:00 - 09:00",
                title: "Registration & Check-in",
                type: "registration",
                location: "Main Entrance",
                icon: <Users className="w-5 h-5" />
            },
            {
                time: "09:00 - 09:30",
                title: "Opening Ceremony",
                type: "ceremony",
                description: "Welcome address by ASU President and Career Center Director",
                location: "Main Hall",
                icon: <Award className="w-5 h-5" />
            },
            {
                time: "09:30 - 10:30",
                title: "Keynote: The Future of Engineering in Egypt",
                type: "keynote",
                speaker: "Dr. Ahmed Hassan - CEO, TechVision Egypt",
                location: "Main Hall",
                icon: <Mic className="w-5 h-5" />
            },
            {
                time: "10:30 - 11:00",
                title: "Networking Break",
                type: "break",
                location: "Exhibition Area",
                icon: <Coffee className="w-5 h-5" />
            },
            {
                time: "11:00 - 13:00",
                title: "Company Booths Open",
                type: "exhibition",
                description: "Visit 50+ companies from Engineering, IT, and Science sectors",
                location: "Exhibition Halls A & B",
                icon: <Briefcase className="w-5 h-5" />
            },
            {
                time: "13:00 - 14:00",
                title: "Lunch Break",
                type: "break",
                location: "Dining Area",
                icon: <Coffee className="w-5 h-5" />
            },
            {
                time: "14:00 - 15:00",
                title: "Panel: Career Paths in Software Development",
                type: "panel",
                speaker: "Industry Leaders from Google, Microsoft & Amazon",
                location: "Conference Room 1",
                icon: <Mic className="w-5 h-5" />
            },
            {
                time: "15:00 - 16:00",
                title: "Workshop: CV Building & LinkedIn Optimization",
                type: "workshop",
                speaker: "Career Center Team",
                location: "Workshop Room A",
                icon: <Users className="w-5 h-5" />
            },
            {
                time: "16:00 - 17:30",
                title: "On-Spot Interviews",
                type: "interviews",
                description: "Pre-scheduled interviews with participating companies",
                location: "Interview Rooms 1-10",
                icon: <Briefcase className="w-5 h-5" />
            },
            {
                time: "17:30 - 18:00",
                title: "Day 1 Closing Remarks",
                type: "ceremony",
                location: "Main Hall",
                icon: <Award className="w-5 h-5" />
            }
        ]
    },
    day2: {
        date: "April 8, 2026",
        title: "Day 2 - Business, Arts & Humanities",
        sessions: [
            {
                time: "08:00 - 09:00",
                title: "Registration & Check-in",
                type: "registration",
                location: "Main Entrance",
                icon: <Users className="w-5 h-5" />
            },
            {
                time: "09:00 - 09:30",
                title: "Day 2 Opening",
                type: "ceremony",
                description: "Welcome address and Day 1 highlights",
                location: "Main Hall",
                icon: <Award className="w-5 h-5" />
            },
            {
                time: "09:30 - 10:30",
                title: "Keynote: Leadership in the Modern Workplace",
                type: "keynote",
                speaker: "Dr. Layla Ibrahim - Regional Manager, Multinational Corp",
                location: "Main Hall",
                icon: <Mic className="w-5 h-5" />
            },
            {
                time: "10:30 - 11:00",
                title: "Networking Break",
                type: "break",
                location: "Exhibition Area",
                icon: <Coffee className="w-5 h-5" />
            },
            {
                time: "11:00 - 13:00",
                title: "Company Booths Open",
                type: "exhibition",
                description: "Visit 50+ companies from Business, Finance, and Media sectors",
                location: "Exhibition Halls A & B",
                icon: <Briefcase className="w-5 h-5" />
            },
            {
                time: "13:00 - 14:00",
                title: "Lunch Break",
                type: "break",
                location: "Dining Area",
                icon: <Coffee className="w-5 h-5" />
            },
            {
                time: "14:00 - 15:00",
                title: "Panel: Breaking into Marketing & Communications",
                type: "panel",
                speaker: "Marketing Directors from Leading Agencies",
                location: "Conference Room 1",
                icon: <Mic className="w-5 h-5" />
            },
            {
                time: "15:00 - 16:00",
                title: "Workshop: Interview Skills Masterclass",
                type: "workshop",
                speaker: "HR Experts Panel",
                location: "Workshop Room A",
                icon: <Users className="w-5 h-5" />
            },
            {
                time: "16:00 - 17:30",
                title: "On-Spot Interviews",
                type: "interviews",
                description: "Pre-scheduled interviews with participating companies",
                location: "Interview Rooms 1-10",
                icon: <Briefcase className="w-5 h-5" />
            },
            {
                time: "17:30 - 18:30",
                title: "Closing Ceremony & Raffle Draw",
                type: "ceremony",
                description: "Awards, acknowledgments, and exciting prizes",
                location: "Main Hall",
                icon: <Award className="w-5 h-5" />
            }
        ]
    }
};

const getTypeColor = (type: string) => {
    switch (type) {
        case 'keynote':
        case 'panel':
            return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800';
        case 'workshop':
            return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800';
        case 'exhibition':
        case 'interviews':
            return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800';
        case 'break':
            return 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800';
        case 'ceremony':
        case 'registration':
            return 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800';
        default:
            return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700';
    }
};

interface Session {
    time: string;
    title: string;
    type: string;
    location: string;
    icon: React.ReactNode;
    description?: string;
    speaker?: string;
}

const SessionCard: React.FC<{ session: Session }> = ({ session }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const hasDetails = session.description || session.speaker;

    return (
        <div
            className={`relative flex gap-4 md:gap-6 ${hasDetails ? 'cursor-pointer' : ''}`}
            onClick={() => hasDetails && setIsExpanded(!isExpanded)}
        >
            {/* Timeline line */}
            <div className="flex flex-col items-center">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${getTypeColor(session.type)} border-2 shadow-sm`}>
                    {session.icon}
                </div>
                <div className="w-0.5 flex-1 bg-gray-200 dark:bg-gray-700 mt-2"></div>
            </div>

            {/* Content */}
            <div className="flex-1 pb-8">
                <div className={`bg-white dark:bg-gray-800 rounded-xl p-4 md:p-6 shadow-md border border-gray-100 dark:border-gray-700 hover:shadow-lg transition-shadow ${hasDetails ? 'hover:border-red-200 dark:hover:border-red-800' : ''}`}>
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-semibold">
                            <Clock className="w-4 h-4" />
                            <span>{session.time}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm">
                            <MapPin className="w-4 h-4" />
                            <span>{session.location}</span>
                        </div>
                    </div>

                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                        {session.title}
                    </h3>

                    {hasDetails && (
                        <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 mt-2">
                            <span>Click for details</span>
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </div>
                    )}

                    {isExpanded && hasDetails && (
                        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 animate-fadeIn">
                            {session.speaker && (
                                <p className="text-gray-600 dark:text-gray-300 mb-2">
                                    <span className="font-medium">Speaker:</span> {session.speaker}
                                </p>
                            )}
                            {session.description && (
                                <p className="text-gray-600 dark:text-gray-400">
                                    {session.description}
                                </p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export const Agenda: React.FC = () => {
    const [activeDay, setActiveDay] = useState<'day1' | 'day2'>('day1');

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
                        <Calendar className="w-5 h-5 text-red-600 dark:text-red-400 mr-2" />
                        <span className="text-sm font-semibold text-red-700 dark:text-red-300">April 7-8, 2026</span>
                    </div>
                    <h1 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6 leading-tight">
                        Event <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-800 to-red-600">Agenda</span>
                    </h1>
                    <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed">
                        Two days packed with keynotes, panels, workshops, networking, and opportunities to connect with 100+ leading companies.
                    </p>
                </div>
            </div>

            {/* Day Tabs */}
            <section className="py-8 bg-gray-50 dark:bg-gray-900/50 sticky top-20 z-20">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex gap-4 justify-center">
                        <button
                            onClick={() => setActiveDay('day1')}
                            className={`flex-1 max-w-xs px-6 py-4 rounded-xl font-bold transition-all duration-300 ${activeDay === 'day1'
                                ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg shadow-red-500/30'
                                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
                                }`}
                        >
                            <div className="text-lg">Day 1</div>
                            <div className={`text-sm ${activeDay === 'day1' ? 'text-red-100' : 'text-gray-500 dark:text-gray-400'}`}>
                                April 7, 2026
                            </div>
                        </button>
                        <button
                            onClick={() => setActiveDay('day2')}
                            className={`flex-1 max-w-xs px-6 py-4 rounded-xl font-bold transition-all duration-300 ${activeDay === 'day2'
                                ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg shadow-red-500/30'
                                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
                                }`}
                        >
                            <div className="text-lg">Day 2</div>
                            <div className={`text-sm ${activeDay === 'day2' ? 'text-red-100' : 'text-gray-500 dark:text-gray-400'}`}>
                                April 8, 2026
                            </div>
                        </button>
                    </div>
                </div>
            </section>

            {/* Agenda Timeline */}
            <section className="py-12 md:py-20 bg-gray-50 dark:bg-gray-900/50">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="mb-8">
                        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">
                            {agendaData[activeDay].title}
                        </h2>
                        <p className="text-gray-600 dark:text-gray-400">
                            {agendaData[activeDay].date} • Dar El Deyafa, ASU Campus
                        </p>
                    </div>

                    <div className="space-y-0">
                        {agendaData[activeDay].sessions.map((session, index) => (
                            <SessionCard key={index} session={session} />
                        ))}
                    </div>
                </div>
            </section>

            {/* Legend */}
            <section className="py-12 bg-white dark:bg-gray-950">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 text-center">Session Types</h3>
                    <div className="flex flex-wrap justify-center gap-3">
                        {[
                            { type: 'keynote', label: 'Keynotes & Panels' },
                            { type: 'workshop', label: 'Workshops' },
                            { type: 'exhibition', label: 'Exhibition & Interviews' },
                            { type: 'break', label: 'Breaks' },
                            { type: 'ceremony', label: 'Ceremonies' }
                        ].map((item) => (
                            <div
                                key={item.type}
                                className={`px-4 py-2 rounded-full text-sm font-medium border ${getTypeColor(item.type)}`}
                            >
                                {item.label}
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </div>
    );
};

export default Agenda;
