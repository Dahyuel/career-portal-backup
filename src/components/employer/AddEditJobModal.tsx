import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { logger } from '../../utils/logger';

interface JobPosition {
    id?: string;
    title: string;
    job_type: string;
    employment_mode: string;
    description: string;
    location: string;
    experience_level: string;
    required_skills: string;
    is_active: boolean;
    company_id?: string;
    event_id?: string;
    employer_id?: string;
}

interface AddEditJobModalProps {
    job: JobPosition | null;
    companyId: string;
    employerId: string;
    eventId: string;
    onClose: () => void;
    onSave: () => void;
}

const AddEditJobModal: React.FC<AddEditJobModalProps> = ({ job, companyId, employerId, eventId, onClose, onSave }) => {
    const [formData, setFormData] = useState<JobPosition>({
        title: '',
        job_type: 'full-time',
        employment_mode: 'on-site',
        description: '',
        location: '',
        experience_level: 'entry',
        required_skills: '',
        is_active: true
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (job) {
            setFormData({
                ...job,
                required_skills: job.required_skills
            });
        }
    }, [job]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        if (!eventId) {
            setError('Event ID is missing. Please try reloading the page.');
            setLoading(false);
            return;
        }

        if (!companyId || !employerId) {
            setError('Missing company or employer information. Please try reloading the page.');
            setLoading(false);
            return;
        }

        try {
            const { error } = await supabase.rpc('employer_upsert_job', {
                _job_id: job?.id || null,
                _title: formData.title || '',
                _description: formData.description || '',
                _location: formData.location || '',
                _job_type: formData.job_type || 'full-time',
                _employment_mode: formData.employment_mode || 'on-site',
                _experience_level: formData.experience_level || 'entry',
                _required_skills: formData.required_skills || '',
                _is_active: formData.is_active ?? true,
                _company_id: companyId,
                _event_id: eventId,
            });

            if (error) throw error;

            onSave();
            onClose();
        } catch (err: any) {
            logger.error('Error saving job:', err);
            setError(err.message || 'Failed to save job');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-[9999]">
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
                className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 relative z-10 flex flex-col max-h-[90vh]"
                onClick={e => e.stopPropagation()}
            >
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                    <motion.h2
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-xl font-bold text-slate-800 dark:text-white"
                    >
                        {job?.id ? 'Edit Job' : 'Add New Job'}
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

                <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                    <AnimatePresence>
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm border border-red-200 dark:border-red-800 overflow-hidden"
                            >
                                {error}
                            </motion.div>
                        )}
                    </AnimatePresence>
                    <form id="job-form" onSubmit={handleSubmit} className="space-y-4">
                        {[
                            { label: 'Job Title', name: 'title', type: 'text', placeholder: 'e.g. Senior Frontend Engineer' },
                            {
                                grid: [
                                    { label: 'Job Type', name: 'job_type', type: 'select', options: ['full-time', 'part-time', 'internship', 'contract', 'freelance'] },
                                    { label: 'Employment Mode', name: 'employment_mode', type: 'select', options: ['on-site', 'remote', 'hybrid'] }
                                ]
                            },
                            {
                                grid: [
                                    { label: 'Experience Level', name: 'experience_level', type: 'select', options: ['entry', 'junior', 'mid', 'senior', 'lead', 'executive'] },
                                    { label: 'Location', name: 'location', type: 'text', placeholder: 'e.g. Cairo, Egypt' }
                                ]
                            },
                            { label: 'Description', name: 'description', type: 'textarea', placeholder: 'Job responsibilities, benefits, etc.', rows: 4 },
                            { label: 'Required Skills', name: 'required_skills', type: 'textarea', placeholder: 'e.g. React, TypeScript, Node.js (comma separated)', rows: 2 }
                        ].map((field, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 + idx * 0.05 }}
                            >
                                {field.grid ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {field.grid.map(f => (
                                            <div key={f.name}>
                                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{f.label}</label>
                                                {f.type === 'select' ? (
                                                    <select
                                                        name={f.name}
                                                        value={(formData as any)[f.name]}
                                                        onChange={handleChange}
                                                        className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all appearance-none"
                                                    >
                                                        {f.options?.map(opt => (
                                                            <option key={opt} value={opt}>{opt.charAt(0).toUpperCase() + opt.slice(1).replace('-', ' ')}</option>
                                                        ))}
                                                    </select>
                                                ) : (
                                                    <input
                                                        type={f.type}
                                                        name={f.name}
                                                        value={(formData as any)[f.name]}
                                                        onChange={handleChange}
                                                        className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all"
                                                        placeholder={f.placeholder}
                                                    />
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{field.label}</label>
                                        {field.type === 'textarea' ? (
                                            <textarea
                                                name={field.name}
                                                value={(formData as any)[field.name]}
                                                onChange={handleChange}
                                                required
                                                rows={field.rows}
                                                className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all resize-none"
                                                placeholder={field.placeholder}
                                            />
                                        ) : (
                                            <input
                                                type={field.type}
                                                name={field.name}
                                                value={(formData as any)[field.name]}
                                                onChange={handleChange}
                                                required
                                                className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all"
                                                placeholder={field.placeholder}
                                            />
                                        )}
                                    </div>
                                )}
                            </motion.div>
                        ))}
                    </form>
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-3"
                >
                    <button
                        onClick={onClose}
                        type="button"
                        className="px-5 py-2.5 rounded-xl text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        form="job-form"
                        type="submit"
                        disabled={loading}
                        className="px-5 py-2.5 rounded-xl bg-red-600 text-white font-medium hover:bg-red-700 transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {loading && <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>}
                        {job?.id ? 'Update Job' : 'Create Job'}
                    </button>
                </motion.div>
            </motion.div>
        </div>
    );
};

export default AddEditJobModal;