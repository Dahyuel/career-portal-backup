import React, { useState } from 'react';
import SharedNavigation, { NavItem } from '../../components/shared/SharedNavigation';
import { useAuth } from '../../contexts/AuthContext';

export const EmployerDashboard: React.FC = () => {
    const { profile } = useAuth();
    const [activeTab, setActiveTab] = useState('home');

    const navItems: NavItem[] = [
        { key: 'home', label: 'Home', icon: 'dashboard' },
        { key: 'jobs', label: 'Jobs', icon: 'work' },
        { key: 'statistics', label: 'Statistics', icon: 'bar_chart' }
    ];

    const renderContent = () => {
        switch (activeTab) {
            case 'home':
                return (
                    <div className="text-center p-10">
                        <h2 className="text-2xl font-bold mb-4">Employer Home</h2>
                        <p className="text-gray-600">Welcome, {profile?.full_name}. This is your dashboard overview.</p>
                    </div>
                );
            case 'jobs':
                return (
                    <div className="text-center p-10">
                        <h2 className="text-2xl font-bold mb-4">Job Listings</h2>
                        <p className="text-gray-600">Manage your job postings here. (Coming Soon)</p>
                    </div>
                );
            case 'statistics':
                return (
                    <div className="text-center p-10">
                        <h2 className="text-2xl font-bold mb-4">Statistics</h2>
                        <p className="text-gray-600">View your recruitment analytics. (Coming Soon)</p>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <SharedNavigation
            navItems={navItems}
            activeItem={activeTab}
            onItemChange={setActiveTab}
            title="Employer Dashboard"
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="fade-in-up-blur">
                    {renderContent()}
                </div>
            </div>
        </SharedNavigation>
    );
};

export default EmployerDashboard;
