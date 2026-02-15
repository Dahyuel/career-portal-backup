import React from 'react';
import { Building2 } from 'lucide-react';
import { Navbar } from '../../components/shared/Navbar';

export const Partners: React.FC = () => {
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
                        <Building2 className="w-5 h-5 text-red-600 dark:text-red-400 mr-2" />
                        <span className="text-sm font-semibold text-red-700 dark:text-red-300">Our Partners</span>
                    </div>
                    <h1 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6 leading-tight">
                        Leading <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-800 to-red-600">Companies</span> Joining Us
                    </h1>
                    <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed">
                        Meet our sponsors, the industry giants, looking for talented individuals like you.
                    </p>
                </div>
            </div>

            {/* Partners Grid Section */}
            <section className="py-12 md:py-20 bg-white dark:bg-gray-950">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    {/* Company Logos Grid - Placeholder for user to add logos */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6 md:gap-8">
                        {/* Placeholder logo cards - Replace with actual company logos */}
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => (
                            <div
                                key={i}
                                className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6 flex items-center justify-center aspect-square border border-gray-200 dark:border-gray-700 hover:shadow-lg hover:border-red-200 dark:hover:border-red-900/50 transition-all duration-300 group"
                            >
                                <div className="text-gray-400 dark:text-gray-500 text-center">
                                    <Building2 className="h-10 w-10 mx-auto mb-2 group-hover:text-red-400 transition-colors" />
                                    <span className="text-xs font-medium">Logo {i}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    <p className="text-center text-gray-500 dark:text-gray-400 mt-8 text-sm">
                        And many more companies joining us...
                    </p>
                </div>
            </section>
        </div>
    );
};

export default Partners;
