import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { logger } from '../../utils/logger';
import { FACULTIES } from '../../utils/constants';

interface CompanyData {
    company_name: string;
    industry: string;
    website: string;
    description: string;
    logo_url: string;
    target_faculties: string[];
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
        target_faculties: []
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
            target_faculties: initialData.target_faculties || []
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
            // Validate file type
            const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/svg+xml'];
            if (!allowedTypes.includes(file.type)) {
                throw new Error(`Invalid file type. Allowed: JPEG, PNG, SVG`);
            }
            if (file.size > 10 * 1024 * 1024) {
                throw new Error('File must be under 10MB');
            }

            const fileExt = file.name.split('.').pop()?.toLowerCase();
            const timestamp = Date.now();
            const random = Math.random().toString(36).substring(2, 8);
            const sanitized = file.name.replace(/[^a-zA-Z0-9.-]/g, '_').replace(/\.[^/.]+$/, '');
            const fileName = `${sanitized}_${timestamp}_${random}.${fileExt}`;
            const filePath = `${companyId}/${fileName}`;

            logger.log('📤 [UPLOAD] Uploading company logo to Companies bucket:', fileName);

            // Upload directly to the 'Companies' bucket (not 'Users')
            const { error: uploadError } = await supabase.storage
                .from('Companies')
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: true
                });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('Companies')
                .getPublicUrl(filePath);

            logger.log('✅ [UPLOAD] Logo uploaded:', publicUrl);
            setFormData(prev => ({ ...prev, logo_url: publicUrl }));
        } catch (err: any) {
            logger.error('Error uploading logo:', err);
            setError(err.message || 'Failed to upload logo');
        } finally {
            setUploading(false);
        }
    };

    const addFaculty = () => {
        setFormData(prev => ({ ...prev, target_faculties: [...prev.target_faculties, ''] }));
    };

    const updateFaculty = (index: number, value: string) => {
        setFormData(prev => {
            const updated = [...prev.target_faculties];
            updated[index] = value;
            return { ...prev, target_faculties: updated };
        });
    };

    const removeFaculty = (index: number) => {
        setFormData(prev => ({
            ...prev,
            target_faculties: prev.target_faculties.filter((_, i) => i !== index)
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { data, error: rpcError } = await supabase.rpc('update_company_details', {
                p_company_id: companyId,
                p_company_name: formData.company_name,
                p_industry: formData.industry,
                p_website: formData.website,
                p_description: formData.description,
                p_logo_url: formData.logo_url,
                p_target_faculties: formData.target_faculties
            });

            if (rpcError) throw rpcError;

            const result = data as any;
            if (result?.success === false) {
                setError(result.error || 'Failed to update company');
                return;
            }

            const EVENT_ID = profile?.event_id || 'aeddbdef-dc7b-406d-9a86-e3ed2e6b3ca5';
            await refreshProfile(EVENT_ID, undefined, undefined, true);

            onSave();
            onClose();
        } catch (err: any) {
            logger.error('Error updating company:', err);
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

                        {/* Target Faculties - outside the map, renders once */}
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.35 }}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                                    Target Faculties
                                </label>
                                <button
                                    type="button"
                                    onClick={addFaculty}
                                    className="flex items-center gap-1 text-sm text-red-600 hover:text-red-700 font-medium transition-colors"
                                >
                                    <span className="material-symbols-outlined text-base">add</span>
                                    Add Faculty
                                </button>
                            </div>

                            <AnimatePresence>
                                {formData.target_faculties.length === 0 && (
                                    <p className="text-sm text-slate-400 dark:text-slate-500 italic">
                                        No faculties added yet. Click "Add Faculty" to start.
                                    </p>
                                )}
                                {formData.target_faculties.map((faculty, index) => (
                                    <motion.div
                                        key={index}
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="flex items-center gap-2 mb-2"
                                    >
                                        <select
                                            value={faculty}
                                            onChange={e => updateFaculty(index, e.target.value)}
                                            className="flex-1 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500 outline-none transition-all"
                                        >
                                            <option value="" disabled>Select a faculty...</option>
                                            {FACULTIES.map(f => (
                                                <option key={f} value={f}>{f}</option>
                                            ))}
                                        </select>
                                        <button
                                            type="button"
                                            onClick={() => removeFaculty(index)}
                                            className="text-slate-400 hover:text-red-500 transition-colors"
                                        >
                                            <span className="material-symbols-outlined text-xl">remove_circle</span>
                                        </button>
                                    </motion.div>
                                ))}
                            </AnimatePresence>

                        </motion.div>
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
            </motion.div >
        </div >
    );
};

export default EditCompanyModal;