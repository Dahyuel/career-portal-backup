// Mock statistics for dashboard displays

export interface MockStatistics {
    total_attendees: number;
    total_volunteers: number;
    total_sessions: number;
    total_companies: number;
    checked_in_attendees: number;
    active_sessions: number;
    building_occupancy: number;
    team_members: number;
    scored_attendees: number;
    average_score: number;
}

export const mockStatistics: MockStatistics = {
    total_attendees: 1245,
    total_volunteers: 89,
    total_sessions: 32,
    total_companies: 18,
    checked_in_attendees: 876,
    active_sessions: 8,
    building_occupancy: 450,
    team_members: 12,
    scored_attendees: 234,
    average_score: 450
};

// Mock leaderboard data
export interface MockLeaderboardEntry {
    rank: number;
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    score: number;
    university: string;
}

export const mockLeaderboard: MockLeaderboardEntry[] = [
    { rank: 1, id: '1', first_name: 'Ahmed', last_name: 'Hassan', email: 'ahmed@example.com', score: 850, university: 'Ain Shams University' },
    { rank: 2, id: '2', first_name: 'Sara', last_name: 'Mohamed', email: 'sara@example.com', score: 720, university: 'Cairo University' },
    { rank: 3, id: '3', first_name: 'Omar', last_name: 'Ali', email: 'omar@example.com', score: 680, university: 'Ain Shams University' },
];

// Mock team data
export interface MockTeamMember {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    volunteer_id: string;
    assigned_sessions: number;
    completed_tasks: number;
}

export const mockTeamMembers: MockTeamMember[] = [
    { id: '1', first_name: 'Fatma', last_name: 'Ibrahim', email: 'fatma@example.com', volunteer_id: 'VOL001', assigned_sessions: 5, completed_tasks: 12 },
    { id: '2', first_name: 'Mahmoud', last_name: 'Sayed', email: 'mahmoud@example.com', volunteer_id: 'VOL002', assigned_sessions: 4, completed_tasks: 10 },
];

// Mock activities for volunteers
export interface MockActivity {
    id: string;
    type: string;
    description: string;
    timestamp: string;
    points?: number;
}

export const mockActivities: MockActivity[] = [
    { id: '1', type: 'session', description: 'Attended AI Workshop', timestamp: '2025-10-19T10:30:00Z', points: 50 },
    { id: '2', type: 'volunteer', description: 'Helped with registration', timestamp: '2025-10-19T09:00:00Z', points: 30 },
];
