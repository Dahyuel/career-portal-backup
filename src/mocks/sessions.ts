// Mock sessions for the application

export interface MockSession {
    id: string;
    title: string;
    description: string;
    speaker: string;
    speaker_photo_url?: string;
    speaker_linkedin_url?: string;
    start_time: string;
    end_time: string;
    location: string;
    capacity: number;
    current_bookings: number;
    current_attendees: number;
    session_type: string;
}

export const mockSessions: MockSession[] = [
    {
        id: '1',
        title: 'Introduction to AI and Machine Learning',
        description: 'Learn the fundamentals of AI and ML with practical examples',
        speaker: 'Dr. Ahmed Farid',
        speaker_photo_url: 'https://via.placeholder.com/150',
        speaker_linkedin_url: 'https://linkedin.com/in/example',
        start_time: '2025-10-19T10:00:00Z',
        end_time: '2025-10-19T12:00:00Z',
        location: 'Hall A',
        capacity: 100,
        current_bookings: 75,
        current_attendees: 60,
        session_type: 'Workshop'
    },
    {
        id: '2',
        title: 'Career Development Strategies',
        description: 'Tips and tricks for advancing your career in tech',
        speaker: 'Sara Mahmoud',
        start_time: '2025-10-19T14:00:00Z',
        end_time: '2025-10-19T16:00:00Z',
        location: 'Hall B',
        capacity: 150,
        current_bookings: 120,
        current_attendees: 100,
        session_type: 'Talk'
    },
    {
        id: '3',
        title: 'Web Development Bootcamp',
        description: 'Full-stack web development from scratch',
        speaker: 'Mohamed Essam',
        start_time: '2025-10-20T10:00:00Z',
        end_time: '2025-10-20T13:00:00Z',
        location: 'Lab 1',
        capacity: 50,
        current_bookings: 50,
        current_attendees: 45,
        session_type: 'Workshop'
    }
];
