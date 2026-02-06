// Mock events/schedule data for Schedule tab

export interface MockEvent {
    id: string;
    title: string;
    description: string;
    start_time: string;
    end_time: string;
    location: string;
    type: 'Fair' | 'Workshop' | 'Seminar' | 'Networking' | 'Break';
    type_color: string;
    speaker?: string;
    attendee_count: number;
    day: number; // 1-5 for Mon-Fri
    date: string; // Display date like "OCT 24"
}

export const mockEvents: MockEvent[] = [
    // Day 1 - Monday (Oct 22)
    {
        id: 'e1',
        title: 'Engineering Career Fair',
        description: 'Meet top tech companies and explore opportunities',
        start_time: '09:00 AM',
        end_time: '01:00 PM',
        location: 'Memorial Union, Grand Ballroom',
        type: 'Fair',
        type_color: 'blue',
        attendee_count: 120,
        day: 1,
        date: 'OCT 22'
    },
    {
        id: 'e2',
        title: 'Resume Mastery Workshop',
        description: 'Learn to craft the perfect resume',
        start_time: '10:30 AM',
        end_time: '11:30 AM',
        location: 'Room 302, Student Union',
        type: 'Workshop',
        type_color: 'purple',
        speaker: 'Marcus Thompson',
        attendee_count: 45,
        day: 1,
        date: 'OCT 22'
    },
    {
        id: 'e3',
        title: 'Landing Your First Tech Internship',
        description: 'Insider tips from industry professionals',
        start_time: '01:00 PM',
        end_time: '02:30 PM',
        location: 'Zoom Webinar',
        type: 'Seminar',
        type_color: 'amber',
        speaker: 'Dr. Sarah Jenkins',
        attendee_count: 210,
        day: 1,
        date: 'OCT 22'
    },
    {
        id: 'e4',
        title: 'Coffee with Recruiters',
        description: 'Casual networking with company recruiters',
        start_time: '03:30 PM',
        end_time: '05:30 PM',
        location: 'Alumni Lounge',
        type: 'Networking',
        type_color: 'emerald',
        attendee_count: 80,
        day: 1,
        date: 'OCT 22'
    },

    // Day 2 - Tuesday (Oct 23)
    {
        id: 'e5',
        title: 'Engineering Career Fair Opening',
        description: 'Grand opening of the career fair',
        start_time: '09:00 AM',
        end_time: '10:30 AM',
        location: 'Main Exhibition Hall',
        type: 'Fair',
        type_color: 'blue',
        attendee_count: 12,
        day: 2,
        date: 'OCT 23'
    },
    {
        id: 'e6',
        title: 'Keynote: Future of AI in Tech',
        description: 'Leading experts discuss AI trends',
        start_time: '11:30 AM',
        end_time: '12:30 PM',
        location: 'Auditorium B',
        type: 'Seminar',
        type_color: 'amber',
        speaker: 'Dr. Alan Watts',
        attendee_count: 85,
        day: 2,
        date: 'OCT 23'
    },
    {
        id: 'e7',
        title: 'Networking Lunch Break',
        description: 'Casual networking over lunch',
        start_time: '01:00 PM',
        end_time: '02:00 PM',
        location: 'Student Lounge',
        type: 'Break',
        type_color: 'slate',
        attendee_count: 0,
        day: 2,
        date: 'OCT 23'
    },
    {
        id: 'e8',
        title: 'Resume Clinic with Top Recruiters',
        description: 'Get personalized resume feedback',
        start_time: '02:30 PM',
        end_time: '04:00 PM',
        location: 'Rooms 204-208',
        type: 'Workshop',
        type_color: 'purple',
        attendee_count: 24,
        day: 2,
        date: 'OCT 23'
    },
    {
        id: 'e9',
        title: 'Closing Remarks & Awards',
        description: 'Day wrap-up and recognition',
        start_time: '04:30 PM',
        end_time: '05:30 PM',
        location: 'Main Exhibition Hall',
        type: 'Seminar',
        type_color: 'amber',
        attendee_count: 38,
        day: 2,
        date: 'OCT 23'
    },

    // Day 3 - Wednesday (Oct 24)
    {
        id: 'e10',
        title: 'Tech Interview Prep',
        description: 'Practice technical interview questions',
        start_time: '01:00 PM',
        end_time: '02:30 PM',
        location: 'Room 302',
        type: 'Workshop',
        type_color: 'purple',
        attendee_count: 55,
        day: 3,
        date: 'OCT 24'
    },
    {
        id: 'e11',
        title: 'Networking 101',
        description: 'Master the art of professional networking',
        start_time: '02:30 PM',
        end_time: '04:00 PM',
        location: 'Virtual Session',
        type: 'Seminar',
        type_color: 'amber',
        attendee_count: 42,
        day: 3,
        date: 'OCT 24'
    },

    // Day 4 - Thursday (Oct 25)
    {
        id: 'e12',
        title: 'Product Management 101',
        description: 'Introduction to product management',
        start_time: '09:00 AM',
        end_time: '10:30 AM',
        location: 'Room 402',
        type: 'Seminar',
        type_color: 'amber',
        speaker: 'Elena Rodriguez',
        attendee_count: 67,
        day: 4,
        date: 'OCT 25'
    },

    // Day 5 - Friday (Oct 26)
    {
        id: 'e13',
        title: 'Morning Fair Access',
        description: 'Early access to career fair',
        start_time: '09:00 AM',
        end_time: '12:00 PM',
        location: 'Main Hall',
        type: 'Fair',
        type_color: 'blue',
        attendee_count: 95,
        day: 5,
        date: 'OCT 26'
    },
    {
        id: 'e14',
        title: 'Networking Dinner',
        description: 'Evening networking event with recruiters',
        start_time: '06:00 PM',
        end_time: '09:00 PM',
        location: 'Grand Ballroom',
        type: 'Networking',
        type_color: 'emerald',
        attendee_count: 78,
        day: 5,
        date: 'OCT 26'
    },
];

export const getEventsByDay = (day: number): MockEvent[] => {
    return mockEvents.filter(event => event.day === day);
};
