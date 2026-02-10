import React from 'react';

const DashboardLoading: React.FC = () => {
    return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-red-50 flex items-center justify-center">
            <div className="text-center">
                <div className="relative mb-8">
                    <div className="w-24 h-24 border-8 border-red-100 border-t-red-600 rounded-full animate-spin mx-auto"></div>
                    <span className="material-symbols-outlined absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-red-600 text-4xl">
                        school
                    </span>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Loading Your Dashboard</h2>
                <p className="text-gray-600">Please wait while we prepare everything for you...</p>
            </div>
        </div>
    );
};

export default DashboardLoading;
