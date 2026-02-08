import React from 'react';

interface Company {
    id: string;
    company_name: string;
    industry: string | null;
    email: string | null;
    website: string | null;
    description: string | null;
    booth_number: string | null;
    logo_url: string | null;
    partner_type: 'platinum' | 'gold' | 'silver' | 'bronze' | 'startup' | null;
}

interface CompanyDetailModalProps {
    company: Company;
    onClose: () => void;
}

const CompanyDetailModal: React.FC<CompanyDetailModalProps> = ({ company, onClose }) => {
    const getPartnerTypeColor = (type: string | null) => {
        switch (type) {
            case 'platinum':
                return 'bg-slate-100 text-slate-800 border-slate-200'; // Platinum/Silver generic
            case 'gold':
                return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'silver':
                return 'bg-gray-100 text-gray-800 border-gray-200';
            case 'bronze':
                return 'bg-orange-100 text-orange-800 border-orange-200';
            case 'startup':
                return 'bg-blue-100 text-blue-800 border-blue-200';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    return (
        <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[9999]"
            onClick={onClose}
        >
            <div
                className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="float-right text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                    <span className="material-symbols-outlined">close</span>
                </button>

                {/* Header Section */}
                <div className="flex flex-col md:flex-row items-center gap-6 mb-8">
                    <div className="w-24 h-24 rounded-xl bg-gray-50 dark:bg-slate-800 flex items-center justify-center p-2 shadow-sm border border-gray-100">
                        {company.logo_url ? (
                            <img
                                src={company.logo_url}
                                alt={company.company_name}
                                className="w-full h-full object-contain"
                            />
                        ) : (
                            <span className="material-symbols-outlined text-gray-300 text-5xl">inventory_2</span>
                        )}
                    </div>
                    <div className="text-center md:text-left">
                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-2">
                            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
                                {company.company_name}
                            </h2>
                            {company.partner_type && (
                                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase border ${getPartnerTypeColor(company.partner_type)}`}>
                                    {company.partner_type} Partner
                                </span>
                            )}
                        </div>
                        {company.industry && (
                            <p className="text-lg text-gray-600 dark:text-gray-400 font-medium">
                                {company.industry}
                            </p>
                        )}
                    </div>
                </div>

                {/* Details Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                    {company.website && (
                        <a
                            href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-slate-800 rounded-xl hover:bg-gray-100 transition-colors"
                        >
                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                                <span className="material-symbols-outlined">language</span>
                            </div>
                            <div className="overflow-hidden">
                                <p className="text-sm text-gray-500 font-medium">Website</p>
                                <p className="text-gray-900 font-semibold truncate">Visit Website</p>
                            </div>
                            <span className="material-symbols-outlined text-gray-400 ml-auto">open_in_new</span>
                        </a>
                    )}

                    {company.email && (
                        <a
                            href={`mailto:${company.email}`}
                            className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-slate-800 rounded-xl hover:bg-gray-100 transition-colors"
                        >
                            <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
                                <span className="material-symbols-outlined">mail</span>
                            </div>
                            <div className="overflow-hidden">
                                <p className="text-sm text-gray-500 font-medium">Email</p>
                                <p className="text-gray-900 font-semibold truncate">{company.email}</p>
                            </div>
                        </a>
                    )}

                    {company.booth_number && (
                        <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-slate-800 rounded-xl">
                            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600">
                                <span className="material-symbols-outlined">storefront</span>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 font-medium">Booth Location</p>
                                <p className="text-gray-900 font-semibold">{company.booth_number}</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* About Section */}
                {company.description && (
                    <div className="mb-6">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <span className="material-symbols-outlined text-red-500">info</span>
                            About Company
                        </h3>
                        <p className="text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                            {company.description}
                        </p>
                    </div>
                )}

            </div>
        </div>
    );
};

export default CompanyDetailModal;
