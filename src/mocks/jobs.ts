// Mock job listings for the Jobs tab

export interface MockJob {
    id: string;
    title: string;
    company: string;
    company_icon: string;
    company_icon_color: string;
    location: string;
    type: 'Full-Time' | 'Part-Time' | 'Internship' | 'Co-op' | 'Remote';
    type_color: string;
    faculty: string;
    description: string;
    posted_ago: string;
    requirements: string[];
}

export const mockJobs: MockJob[] = [
    {
        id: '1',
        title: 'Senior Software Engineer',
        company: 'TechNova Systems',
        company_icon: 'terminal',
        company_icon_color: 'blue',
        location: 'Seattle, WA (Remote)',
        type: 'Full-Time',
        type_color: 'blue',
        faculty: 'Engineering',
        description: 'Join our team building next-generation cloud infrastructure',
        posted_ago: '2h ago',
        requirements: ['5+ years experience', 'React/Node.js', 'AWS/Azure']
    },
    {
        id: '2',
        title: 'UI/UX Design Intern',
        company: 'Creative Flow Agency',
        company_icon: 'brush',
        company_icon_color: 'amber',
        location: 'New York, NY',
        type: 'Internship',
        type_color: 'amber',
        faculty: 'Design',
        description: 'Learn from top designers while working on real client projects',
        posted_ago: '5h ago',
        requirements: ['Figma proficiency', 'Portfolio required', 'Design thinking']
    },
    {
        id: '3',
        title: 'Data Analyst',
        company: 'Global Metrics Corp',
        company_icon: 'database',
        company_icon_color: 'emerald',
        location: 'Austin, TX',
        type: 'Full-Time',
        type_color: 'emerald',
        faculty: 'Business',
        description: 'Analyze data trends and provide actionable insights',
        posted_ago: '1d ago',
        requirements: ['SQL/Python', 'Statistics background', 'Tableau/PowerBI']
    },
    {
        id: '4',
        title: 'Marketing Manager',
        company: 'Bright Future Brands',
        company_icon: 'campaign',
        company_icon_color: 'purple',
        location: 'San Francisco, CA',
        type: 'Full-Time',
        type_color: 'purple',
        faculty: 'Business',
        description: 'Lead marketing strategy for consumer brands',
        posted_ago: '2d ago',
        requirements: ['5+ years marketing', 'Digital marketing', 'Team leadership']
    },
    {
        id: '5',
        title: 'Product Designer',
        company: 'TechFlow Inc.',
        company_icon: 'token',
        company_icon_color: 'blue',
        location: 'San Francisco, CA',
        type: 'Full-Time',
        type_color: 'green',
        faculty: 'Design',
        description: 'Design beautiful, user-centered product experiences',
        posted_ago: '3h ago',
        requirements: ['Product design portfolio', 'Figma expert', 'User research']
    },
    {
        id: '6',
        title: 'Frontend Intern',
        company: 'Nova Scale Labs',
        company_icon: 'bolt',
        company_icon_color: 'orange',
        location: 'Remote (Global)',
        type: 'Internship',
        type_color: 'blue',
        faculty: 'Engineering',
        description: 'Build responsive web applications with modern frameworks',
        posted_ago: '1d ago',
        requirements: ['React/Vue knowledge', 'CSS/HTML', 'Git proficiency']
    },
    {
        id: '7',
        title: 'Financial Analyst',
        company: 'Global Peak Finance',
        company_icon: 'account_balance',
        company_icon_color: 'emerald',
        location: 'New York, NY',
        type: 'Full-Time',
        type_color: 'green',
        faculty: 'Business',
        description: 'Analyze financial data and market trends',
        posted_ago: '4h ago',
        requirements: ['Finance degree', 'Excel/modeling', 'CFA preferred']
    }
];
