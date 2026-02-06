import React, { useState } from 'react';
import { Building2, Briefcase, Users, LayoutDashboard, Clock } from 'lucide-react';
import SharedNavigation, { NavItem } from '../../components/shared/SharedNavigation';
import { useAuth } from '../../contexts/AuthContext';

export const EmployerDashboard: React.FC = () => {
    const { profile } = useAuth();
    const [activeTab, setActiveTab] = useState('home');

    // Placeholder stats for now
    const stats = {
        activeListings: 0,
        applications: 0,
        views: 0
    };

    const navItems: NavItem[] = [
        { key: 'home', label: 'Home', icon: LayoutDashboard }
    ];

    return (
        <SharedNavigation
            navItems={navItems}
            activeItem={activeTab}
            onItemChange={setActiveTab}
            title="Employer Dashboard"
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Subtitle */}
                <div className="mb-6">
                    <p className="text-lg text-gray-600">
                        Welcome back, {profile?.first_name}! Manage your company profile and job listings.
                    </p>
                </div>

                <div className="fade-in-up-blur">
                    {/* Stats Cards Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto grid-stagger-blur mb-8">
                        <div className="bg-white rounded-xl shadow-sm border border-orange-100 p-6 card-hover-enhanced dashboard-card">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600">Active Listings</p>
                                    <p className="text-3xl font-bold text-red-600">{stats.activeListings}</p>
                                </div>
                                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                                    <Briefcase className="h-6 w-6 text-red-600" />
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-xl shadow-sm border border-orange-100 p-6 card-hover-enhanced dashboard-card">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600">Total Applications</p>
                                    <p className="text-3xl font-bold text-blue-600">{stats.applications}</p>
                                </div>
                                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                                    <Users className="h-6 w-6 text-blue-600" />
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-xl shadow-sm border border-orange-100 p-6 card-hover-enhanced dashboard-card">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600">Profile Views</p>
                                    <p className="text-3xl font-bold text-purple-600">{stats.views}</p>
                                </div>
                                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                                    <LayoutDashboard className="h-6 w-6 text-purple-600" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Main Content Area */}
                    <div className="max-w-6xl mx-auto">
                        <div className="bg-white rounded-xl shadow-sm border border-orange-100 p-8 fade-in-blur card-hover dashboard-card text-center">
                            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                <Building2 className="h-10 w-10 text-red-500" />
                            </div>

                            <h3 className="text-2xl font-bold text-gray-900 mb-2">
                                {profile?.employer_id ? `Employer ID: ${profile.employer_id}` : 'Welcome to the Fair'}
                            </h3>

                            <p className="text-gray-600 max-w-2xl mx-auto mb-8">
                                Thank you for participating in the ASU Employment Fair. This dashboard will be your central hub for managing your company's presence, reviewing applications, and connecting with students.
                            </p>

                            <div className="inline-flex items-center justify-center px-4 py-2 bg-orange-50 text-orange-700 rounded-lg border border-orange-100">
                                <Clock className="w-4 h-4 mr-2" />
                                <span>More features coming soon</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </SharedNavigation>
    );
};

export default EmployerDashboard;

