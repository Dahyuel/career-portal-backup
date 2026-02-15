import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase, uploadFile } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface CompanyData {
    company_name: string;
    industry: string;
    website: string;
    description: string;
    logo_url: string;
    booth_number: string;
}

interface EditCompanyModalProps {
    companyId: string;
    initialData: Partial<CompanyData>;
    onClose: () => void;
    onSave: () => void;
}

const EditCompanyModal: React.FC<EditCompanyModalProps> = ({ companyId, initialData, onClose, onSave }) => {
    const { profile, refreshProfile } = useAuth();
    const [formData, setFormData] = useState<CompanyData>({
        company_name: '',
        industry: '',
        website: '',
        description: '',
        logo_url: '',
        booth_number: ''
    });
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setFormData({
            company_name: initialData.company_name || '',
            industry: initialData.industry || '',
            website: initialData.website || '',
            description: initialData.description || '',
            logo_url: initialData.logo_url || '',
            booth_number: initialData.booth_number || ''
        });
    }, [initialData]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        setError(null);

        try {
            const { data, error } = await uploadFile('company-logo', companyId, file);

            if (error) throw error;
            if (data?.url) {
                setFormData(prev => ({ ...prev, logo_url: data.url }));
            }
        } catch (err: any) {
            console.error('Error uploading logo:', err);
            setError(err.message || 'Failed to upload logo');
        } finally {
            setUploading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { error: updateError } = await supabase
                .from('companies')
                .update({
                    company_name: formData.company_name,
                    industry: formData.industry,
                    website: formData.website,
                    description: formData.description,
                    logo_url: formData.logo_url,
                    booth_number: formData.booth_number
                })
                .eq('id', companyId);

            if (updateError) throw updateError;

            // Get event_id from profile or use default
            const EVENT_ID = profile?.event_id || 'aeddbdef-dc7b-406d-9a86-e3ed2e6b3ca5';

            // Force refresh profile to get updated company data
            await refreshProfile(EVENT_ID, undefined, undefined, true);

            onSave();
            onClose();
        } catch (err: any) {
            console.error('Error updating company:', err);
            setError(err.message || 'Failed to update company');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-[10000]">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ type: "spring", duration: 0.5 }}
                className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden relative z-10 flex flex-col max-h-[90vh]"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                    <motion.h2
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-xl font-bold text-slate-800 dark:text-white"
                    >
                        Edit Company Details
                    </motion.h2>
                    <motion.button
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2 }}
                        whileHover={{ scale: 1.1, rotate: 90 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </motion.button>
                </div>

                {/* Form Content */}
                <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                    <AnimatePresence>
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm border border-red-200 dark:border-red-800"
                            >
                                {error}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <form id="company-form" onSubmit={handleSubmit} className="space-y-4">
                        {/* Logo Upload */}
                        <div className="flex justify-center mb-6">
                            <div className="relative group">
                                <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center overflow-hidden bg-slate-50 dark:bg-slate-800">
                                    {formData.logo_url ? (
                                        <img src={formData.logo_url} alt="Logo" className="w-full h-full object-contain p-2" />
                                    ) : (
                                        <span className="material-symbols-outlined text-slate-400 text-3xl">add_photo_alternate</span>
                                    )}
                                    {uploading && (
                                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                            <span className="material-symbols-outlined animate-spin text-white">progress_activity</span>
                                        </div>
                                    )}
                                </div>
                                <label className="absolute inset-0 cursor-pointer flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 rounded-2xl">
                                    <span className="text-white text-xs font-bold">Change Logo</span>
                                    <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" disabled={uploading} />
                                </label>
                            </div>
                        </div>

                        {[
                            { label: 'Company Name', name: 'company_name', type: 'text', placeholder: 'e.g. Tech Corp', required: true },
                            { label: 'Industry', name: 'industry', type: 'text', placeholder: 'e.g. Software Development' },
                            { label: 'Website', name: 'website', type: 'url', placeholder: 'https://example.com' },
                            { label: 'Booth Number', name: 'booth_number', type: 'text', placeholder: 'e.g. A-12' },
                            { label: 'Description', name: 'description', type: 'textarea', placeholder: 'About your company...', rows: 4 }
                        ].map((field, idx) => (
                            <motion.div
                                key={field.name}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 + idx * 0.05 }}
                            >
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    {field.label}
                                    {field.required && <span className="text-red-500 ml-1">*</span>}
                                </label>
                                {field.type === 'textarea' ? (
                                    <textarea
                                        name={field.name}
                                        value={(formData as any)[field.name]}
                                        onChange={handleChange}
                                        rows={field.rows}
                                        className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500 outline-none transition-all resize-none"
                                        placeholder={field.placeholder}
                                    />
                                ) : (
                                    <input
                                        type={field.type}
                                        name={field.name}
                                        value={(formData as any)[field.name]}
                                        onChange={handleChange as any}
                                        required={field.required}
                                        className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500 outline-none transition-all"
                                        placeholder={field.placeholder}
                                    />
                                )}
                            </motion.div>
                        ))}
                    </form>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        type="button"
                        className="px-5 py-2.5 rounded-xl text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        form="company-form"
                        type="submit"
                        disabled={loading || uploading}
                        className="px-5 py-2.5 rounded-xl bg-red-600 text-white font-medium hover:bg-red-700 transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {loading ? <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span> : null}
                        Save Changes
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

export default EditCompanyModal;