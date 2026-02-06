// Mock companies for the application

export interface MockCompany {
    id: string;
    name: string;
    logo_url?: string;
    description?: string;
    website?: string;
    booth_number?: string;
    partner_type?: string;
}

export const mockCompanies: MockCompany[] = [
    {
        id: '1',
        name: 'Tech Solutions Inc.',
        logo_url: 'https://via.placeholder.com/200',
        description: 'Leading software development company',
        website: 'https://techsolutions.example.com',
        booth_number: 'A-101',
        partner_type: 'Strategic Partner'
    },
    {
        id: '2',
        name: 'Digital Innovations',
        logo_url: 'https://via.placeholder.com/200',
        description: 'AI and Machine Learning specialists',
        website: 'https://digitalinnovations.example.com',
        booth_number: 'A-102',
        partner_type: 'Main Partners'
    },
    {
        id: '3',
        name: 'Cloud Systems',
        logo_url: 'https://via.placeholder.com/200',
        description: 'Cloud infrastructure and services',
        website: 'https://cloudsystems.example.com',
        booth_number: 'B-201',
        partner_type: 'Tech Partners'
    }
];
