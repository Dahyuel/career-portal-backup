// Mock user profiles for the application

export interface MockUser {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    personal_id: string;
    role: 'attendee' | 'volunteer' | 'team_leader' | 'admin' | 'registration' | 'building' | 'info_desk' | 'employer';
    phone?: string;
    university?: string;
    faculty?: string;
    gender?: 'male' | 'female';
    degree_level?: 'student' | 'graduate';
    class?: string;
    program?: string;
    event_entry?: boolean;
    building_entry?: boolean;
    volunteer_id?: string;
    employer_id?: string;
    profile_complete?: boolean;
    created_at?: string;
    score?: number;
    cv_path?: string;
}

export const mockUsers: MockUser[] = [
    {
        id: '1',
        first_name: 'Ahmed',
        last_name: 'Hassan',
        email: 'ahmed.hassan@example.com',
        personal_id: '123456',
        role: 'attendee',
        phone: '+201234567890',
        university: 'Ain Shams University',
        faculty: 'Faculty of Engineering',
        gender: 'male',
        degree_level: 'student',
        class: 'Senior',
        program: 'Computer Engineering',
        event_entry: true,
        building_entry: true,
        profile_complete: true,
        created_at: '2025-01-15T10:00:00Z'
    },
    {
        id: '2',
        first_name: 'Sara',
        last_name: 'Mohamed',
        email: 'sara.mohamed@example.com',
        personal_id: '234567',
        role: 'attendee',
        phone: '+201234567891',
        university: 'Cairo University',
        faculty: 'Faculty of Computer Science',
        gender: 'female',
        degree_level: 'student',
        class: 'Junior',
        program: 'Computer Science',
        event_entry: true,
        building_entry: false,
        profile_complete: true,
        created_at: '2025-01-16T11:00:00Z'
    },
    {
        id: '3',
        first_name: 'Omar',
        last_name: 'Ali',
        email: 'omar.ali@example.com',
        personal_id: '345678',
        role: 'volunteer',
        phone: '+201234567892',
        university: 'Ain Shams University',
        faculty: 'Faculty of Business Administration',
        gender: 'male',
        volunteer_id: 'VOL001',
        profile_complete: true,
        created_at: '2025-01-10T09:00:00Z'
    },
    {
        id: '4',
        first_name: 'Fatma',
        last_name: 'Ibrahim',
        email: 'fatma.ibrahim@example.com',
        personal_id: '456789',
        role: 'team_leader',
        phone: '+201234567893',
        university: 'Ain Shams University',
        faculty: 'Faculty of Engineering',
        gender: 'female',
        volunteer_id: 'TL001',
        profile_complete: true,
        created_at: '2025-01-08T08:00:00Z'
    },
    {
        id: '5',
        first_name: 'Mahmoud',
        last_name: 'Sayed',
        email: 'mahmoud.sayed@example.com',
        personal_id: '567890',
        role: 'admin',
        profile_complete: true,
        created_at: '2025-01-01T00:00:00Z'
    }
];

export const getCurrentMockUser = (): MockUser => {
    // Get user from localStorage or return default
    const savedUser = localStorage.getItem('mockCurrentUser');
    if (savedUser) {
        return JSON.parse(savedUser);
    }
    // Default to first attendee
    return mockUsers[0];
};

export const setCurrentMockUser = (user: MockUser) => {
    localStorage.setItem('mockCurrentUser', JSON.stringify(user));
};
