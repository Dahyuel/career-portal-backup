import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import Toast from '../shared/Toast';
import {
  adminGetFeedbackQuestionsRPC,
  adminUpsertFeedbackQuestionRPC,
  adminDeleteFeedbackQuestionRPC,
  adminReorderFeedbackQuestionsRPC,
  adminSetAllFeedbackQuestionsVisibilityRPC,
  adminGetFeedbackSubmissionsRPC,
  adminGetFeedbackStatsRPC,
  type FeedbackQuestion,
  type FeedbackQuestionType,
  type FeedbackSubmission
} from '../../lib/supabase';
import { logger } from '../../utils/logger';
import { getActiveEventId } from '../../lib/currentEvent';

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
  exit: { opacity: 0 }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  exit: { opacity: 0 }
};

const PAGE_SIZE = 10;

const ROLE_LABELS: Record<string, string> = {
  attendee: 'Attendee',
  volunteer: 'Volunteer',
  team_leader: 'Team Leader',
  building: 'Building Team',
  registration: 'Registration Team',
  info_desk: 'Info Desk',
  verification: 'Verification',
  tech_support: 'Technical Support'
};

const roleLabel = (role: string) => ROLE_LABELS[role] || role;

const roleBadgeClass = (role: string) =>
  role === 'attendee'
    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
    : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300';

/** Read-only star row used when showing a submitted rating. */
const StarDisplay: React.FC<{ rating: number }> = ({ rating }) => (
  <span className="inline-flex items-center gap-0.5" aria-label={`${rating} out of 5`}>
    {[1, 2, 3, 4, 5].map((s) => (
      <span
        key={s}
        className={`material-symbols-outlined text-base ${s <= rating ? 'text-amber-500' : 'text-gray-300 dark:text-slate-700'}`}
        style={s <= rating ? { fontVariationSettings: "'FILL' 1" } : undefined}
      >
        star
      </span>
    ))}
    <span className="ml-1.5 text-sm font-bold text-gray-700 dark:text-gray-300">{rating}/5</span>
  </span>
);

interface FeedbackManagementProps {
  eventId?: string;
}

/**
 * Admin feedback area: one sub-tab to author the questions respondents see,
 * one to read the submissions that came back.
 */
const FeedbackManagement: React.FC<FeedbackManagementProps> = ({ eventId = getActiveEventId() }) => {
  const [view, setView] = useState<'questions' | 'responses'>('questions');
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({
    show: false,
    message: '',
    type: 'success'
  });

  const notify = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ show: true, message, type });
  }, []);

  // ===== QUESTIONS =====
  const [questions, setQuestions] = useState<FeedbackQuestion[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(true);
  const [questionsError, setQuestionsError] = useState<string | null>(null);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<FeedbackQuestion | null>(null);
  const [deletingQuestion, setDeletingQuestion] = useState<FeedbackQuestion | null>(null);
  const [savingQuestion, setSavingQuestion] = useState(false);
  const [deletingPending, setDeletingPending] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [bulkVisibilityPending, setBulkVisibilityPending] = useState(false);

  // Question form
  const [formText, setFormText] = useState('');
  const [formType, setFormType] = useState<FeedbackQuestionType>('rating');
  const [formRequired, setFormRequired] = useState(false);
  const [formActive, setFormActive] = useState(false);

  const loadQuestions = useCallback(async () => {
    setQuestionsLoading(true);
    setQuestionsError(null);
    try {
      const { data, error } = await adminGetFeedbackQuestionsRPC(eventId);
      if (error) throw new Error(error.message);
      setQuestions(data || []);
    } catch (error: any) {
      logger.error('Error loading feedback questions:', error);
      setQuestionsError(error.message || 'Could not load questions');
    } finally {
      setQuestionsLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  const openAddQuestion = () => {
    setEditingQuestion(null);
    setFormText('');
    setFormType('rating');
    setFormRequired(false);
    setFormActive(false); // new questions start hidden
    setShowQuestionModal(true);
  };

  const openEditQuestion = (question: FeedbackQuestion) => {
    setEditingQuestion(question);
    setFormText(question.question_text);
    setFormType(question.question_type);
    setFormRequired(question.is_required);
    setFormActive(question.is_active ?? true);
    setShowQuestionModal(true);
  };

  const handleSaveQuestion = async () => {
    if (!formText.trim()) {
      notify('Question text is required', 'error');
      return;
    }

    setSavingQuestion(true);
    try {
      const { error } = await adminUpsertFeedbackQuestionRPC({
        questionText: formText.trim(),
        questionType: formType,
        questionId: editingQuestion?.id || null,
        isRequired: formRequired,
        isActive: formActive,
        eventId
      });
      if (error) throw new Error(error.message);

      notify(editingQuestion ? 'Question updated' : 'Question added');
      setShowQuestionModal(false);
      setEditingQuestion(null);
      await loadQuestions();
    } catch (error: any) {
      logger.error('Error saving feedback question:', error);
      notify(error.message || 'Could not save the question', 'error');
    } finally {
      setSavingQuestion(false);
    }
  };

  const handleDeleteQuestion = async () => {
    if (!deletingQuestion) return;

    setDeletingPending(true);
    try {
      const { error } = await adminDeleteFeedbackQuestionRPC(deletingQuestion.id, eventId);
      if (error) throw new Error(error.message);

      notify('Question deleted');
      setDeletingQuestion(null);
      await loadQuestions();
    } catch (error: any) {
      logger.error('Error deleting feedback question:', error);
      notify(error.message || 'Could not delete the question', 'error');
    } finally {
      setDeletingPending(false);
    }
  };

  const moveQuestion = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= questions.length || reordering) return;

    const reordered = [...questions];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    setQuestions(reordered); // optimistic

    setReordering(true);
    try {
      const { error } = await adminReorderFeedbackQuestionsRPC(reordered.map((q) => q.id), eventId);
      if (error) throw new Error(error.message);
    } catch (error: any) {
      logger.error('Error reordering feedback questions:', error);
      notify(error.message || 'Could not save the new order', 'error');
      await loadQuestions();
    } finally {
      setReordering(false);
    }
  };

  const setAllVisibility = async (isActive: boolean) => {
    if (bulkVisibilityPending || questions.length === 0) return;

    const previous = questions;
    setQuestions((prev) => prev.map((q) => ({ ...q, is_active: isActive }))); // optimistic

    setBulkVisibilityPending(true);
    try {
      const { error } = await adminSetAllFeedbackQuestionsVisibilityRPC(isActive, eventId);
      if (error) throw new Error(error.message);
      notify(isActive ? 'All questions are now visible' : 'All questions are now hidden');
    } catch (error: any) {
      logger.error('Error changing visibility of all questions:', error);
      setQuestions(previous);
      notify(error.message || 'Could not change visibility', 'error');
    } finally {
      setBulkVisibilityPending(false);
    }
  };

  // ===== RESPONSES =====
  const [submissions, setSubmissions] = useState<FeedbackSubmission[]>([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  const [submissionsError, setSubmissionsError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [stats, setStats] = useState<{
    total_submissions: number;
    attendee_count: number;
    volunteer_count: number;
    rating_summary: { id: string; question_text: string; average_rating: number; response_count: number }[];
  } | null>(null);

  const loadSubmissions = useCallback(async () => {
    setSubmissionsLoading(true);
    setSubmissionsError(null);
    try {
      const { data, error } = await adminGetFeedbackSubmissionsRPC({
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
        search: search || undefined,
        role: roleFilter || undefined,
        eventId
      });
      if (error) throw new Error(error.message);
      setSubmissions(data?.submissions || []);
      setTotal(data?.total || 0);
    } catch (error: any) {
      logger.error('Error loading feedback submissions:', error);
      setSubmissionsError(error.message || 'Could not load submissions');
    } finally {
      setSubmissionsLoading(false);
    }
  }, [eventId, page, search, roleFilter]);

  const loadStats = useCallback(async () => {
    try {
      const { data, error } = await adminGetFeedbackStatsRPC(eventId);
      if (error) throw new Error(error.message);
      setStats(data);
    } catch (error: any) {
      logger.error('Error loading feedback stats:', error);
    }
  }, [eventId]);

  useEffect(() => {
    if (view !== 'responses') return;
    loadSubmissions();
  }, [view, loadSubmissions]);

  useEffect(() => {
    if (view !== 'responses') return;
    loadStats();
  }, [view, loadStats]);

  // Reset to the first page whenever the filters change.
  useEffect(() => {
    setPage(1);
  }, [search, roleFilter]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const activeQuestionCount = useMemo(() => questions.filter((q) => q.is_active !== false).length, [questions]);

  // ===== RENDER: questions sub-tab =====
  const renderQuestions = () => (
    <motion.div key="questions" className="space-y-5" variants={containerVariants} initial="hidden" animate="visible" exit="exit">
      <motion.div variants={itemVariants} className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {questions.length} question{questions.length === 1 ? '' : 's'} total
            {questions.length > 0 && ` · ${activeQuestionCount} visible to respondents`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {questions.length > 0 && (() => {
            const allVisible = activeQuestionCount === questions.length;
            return (
              <button
                type="button"
                role="switch"
                aria-checked={allVisible}
                onClick={() => setAllVisibility(!allVisible)}
                disabled={bulkVisibilityPending}
                title={allVisible ? 'Hide every question from respondents' : 'Show every question to respondents'}
                className="flex items-center gap-3 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  {allVisible ? 'All visible' : 'Show all'}
                </span>
                <span
                  className={`relative w-11 h-6 rounded-full transition-colors ${allVisible ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-slate-600'}`}
                >
                  <motion.span
                    className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow"
                    animate={{ x: allVisible ? 20 : 0 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                </span>
              </button>
            );
          })()}
        <button
          onClick={openAddQuestion}
          className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-all flex items-center gap-2 active:scale-95"
        >
          <span className="material-symbols-outlined">add</span>
          Add Question
        </button>
        </div>
      </motion.div>

      {questionsLoading && (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="relative w-16 h-16 mb-4">
            <div className="absolute inset-0 border-4 border-slate-200 dark:border-slate-800 rounded-full" />
            <motion.div
              className="absolute inset-0 border-4 border-transparent border-t-red-600 rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            />
          </div>
          <p className="text-gray-500 dark:text-gray-400 font-medium">Loading questions...</p>
        </div>
      )}

      {!questionsLoading && questionsError && (
        <motion.div
          variants={itemVariants}
          className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 rounded-2xl p-5 flex items-start gap-4"
        >
          <span className="material-symbols-outlined text-red-500 mt-0.5">error</span>
          <div>
            <p className="font-semibold text-red-700 dark:text-red-300">Could not load questions</p>
            <p className="text-sm text-red-600 dark:text-red-400 mt-1">Please try again in a moment.</p>
            <button onClick={loadQuestions} className="mt-3 text-sm font-bold text-red-700 dark:text-red-300 hover:underline">
              Try again
            </button>
          </div>
        </motion.div>
      )}

      {!questionsLoading && !questionsError && questions.length === 0 && (
        <motion.div variants={itemVariants} className="text-center py-16">
          <span className="material-symbols-outlined text-6xl text-gray-300 dark:text-slate-700 block mb-3">quiz</span>
          <p className="font-bold text-gray-700 dark:text-gray-300">No questions yet</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Add your first question — it will appear in the Feedback tab for attendees and volunteers.
          </p>
        </motion.div>
      )}

      {!questionsLoading && !questionsError && questions.length > 0 && (
        <div className="space-y-3">
          {questions.map((question, index) => (
            <motion.div
              key={question.id}
              variants={itemVariants}
              className={`bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-5 shadow-sm ${question.is_active === false ? 'opacity-60' : ''
                }`}
            >
              <div className="flex items-start gap-4">
                {/* Reorder */}
                <div className="flex flex-col gap-1 shrink-0 pt-0.5">
                  <button
                    onClick={() => moveQuestion(index, -1)}
                    disabled={index === 0 || reordering}
                    aria-label="Move question up"
                    className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-slate-800 text-gray-500 hover:bg-gray-200 dark:hover:bg-slate-700 flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <span className="material-symbols-outlined text-base">keyboard_arrow_up</span>
                  </button>
                  <button
                    onClick={() => moveQuestion(index, 1)}
                    disabled={index === questions.length - 1 || reordering}
                    aria-label="Move question down"
                    className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-slate-800 text-gray-500 hover:bg-gray-200 dark:hover:bg-slate-700 flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <span className="material-symbols-outlined text-base">keyboard_arrow_down</span>
                  </button>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 dark:text-white break-words">
                    {index + 1}. {question.question_text}
                    {question.is_required && <span className="text-red-600 ml-1">*</span>}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${question.question_type === 'rating'
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                        : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300'
                        }`}
                    >
                      <span className="material-symbols-outlined text-xs">
                        {question.question_type === 'rating' ? 'star_rate' : 'edit_note'}
                      </span>
                      {question.question_type === 'rating' ? 'Rating 1–5' : 'Written answer'}
                    </span>
                    {question.is_required && (
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
                        Required
                      </span>
                    )}
                    <span
                      className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${question.is_active === false
                        ? 'bg-gray-200 text-gray-600 dark:bg-slate-800 dark:text-gray-400'
                        : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                        }`}
                    >
                      {question.is_active === false ? 'Hidden' : 'Visible'}
                    </span>
                    {!!question.answer_count && (
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-gray-400">
                        {question.answer_count} answer{question.answer_count === 1 ? '' : 's'}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => openEditQuestion(question)}
                    aria-label="Edit question"
                    className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/40 flex items-center justify-center transition-colors"
                  >
                    <span className="material-symbols-outlined text-lg">edit</span>
                  </button>
                  <button
                    onClick={() => setDeletingQuestion(question)}
                    aria-label="Delete question"
                    className="w-9 h-9 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/40 flex items-center justify-center transition-colors"
                  >
                    <span className="material-symbols-outlined text-lg">delete</span>
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );

  // ===== RENDER: responses sub-tab =====
  const renderResponses = () => (
    <motion.div key="responses" className="space-y-5" variants={containerVariants} initial="hidden" animate="visible" exit="exit">
      {/* Summary */}
      {stats && (
        <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Total Submissions', value: stats.total_submissions, icon: 'inbox', color: 'text-red-600 bg-red-100 dark:bg-red-900/30' },
            { label: 'From Attendees', value: stats.attendee_count, icon: 'school', color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30' },
            { label: 'From Volunteers', value: stats.volunteer_count, icon: 'volunteer_activism', color: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30' }
          ].map((card) => (
            <div key={card.label} className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-5 shadow-sm">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-3 ${card.color}`}>
                <span className="material-symbols-outlined">{card.icon}</span>
              </div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{card.label}</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{card.value}</p>
            </div>
          ))}
        </motion.div>
      )}

      {!!stats?.rating_summary?.length && (
        <motion.div variants={itemVariants} className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-5 shadow-sm">
          <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-amber-500">insights</span>
            Average Ratings
          </h3>
          <div className="space-y-3">
            {stats.rating_summary.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center gap-3">
                <p className="flex-1 min-w-[12rem] text-sm text-gray-700 dark:text-gray-300">{r.question_text}</p>
                <div className="flex-1 min-w-[8rem] h-2 rounded-full bg-gray-100 dark:bg-slate-800 overflow-hidden">
                  <div className="h-full bg-amber-500 rounded-full" style={{ width: `${(Number(r.average_rating) / 5) * 100}%` }} />
                </div>
                <span className="text-sm font-bold text-gray-900 dark:text-white whitespace-nowrap">
                  {Number(r.average_rating).toFixed(2)} / 5
                </span>
                <span className="text-xs text-gray-400 whitespace-nowrap">({r.response_count})</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Filters */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-400">search</span>
          <input
            type="text"
            value={searchInput}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchInput(e.target.value)}
            onKeyDown={(e: React.KeyboardEvent) => e.key === 'Enter' && setSearch(searchInput.trim())}
            placeholder="Search by name, personal ID, or email"
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setRoleFilter(e.target.value)}
          className="px-4 py-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500 transition-all"
        >
          <option value="">All roles</option>
          {Object.keys(ROLE_LABELS).map((role) => (
            <option key={role} value={role}>{ROLE_LABELS[role]}</option>
          ))}
        </select>
        <button
          onClick={() => setSearch(searchInput.trim())}
          className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined">filter_alt</span>
          Apply
        </button>
      </motion.div>

      {submissionsLoading && (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="relative w-16 h-16 mb-4">
            <div className="absolute inset-0 border-4 border-slate-200 dark:border-slate-800 rounded-full" />
            <motion.div
              className="absolute inset-0 border-4 border-transparent border-t-red-600 rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            />
          </div>
          <p className="text-gray-500 dark:text-gray-400 font-medium">Loading submissions...</p>
        </div>
      )}

      {!submissionsLoading && submissionsError && (
        <motion.div
          variants={itemVariants}
          className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 rounded-2xl p-5 flex items-start gap-4"
        >
          <span className="material-symbols-outlined text-red-500 mt-0.5">error</span>
          <div>
            <p className="font-semibold text-red-700 dark:text-red-300">Could not load submissions</p>
            <p className="text-sm text-red-600 dark:text-red-400 mt-1">Please try again in a moment.</p>
            <button onClick={loadSubmissions} className="mt-3 text-sm font-bold text-red-700 dark:text-red-300 hover:underline">
              Try again
            </button>
          </div>
        </motion.div>
      )}

      {!submissionsLoading && !submissionsError && submissions.length === 0 && (
        <motion.div variants={itemVariants} className="text-center py-16">
          <span className="material-symbols-outlined text-6xl text-gray-300 dark:text-slate-700 block mb-3">forum</span>
          <p className="font-bold text-gray-700 dark:text-gray-300">No feedback yet</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {search || roleFilter ? 'No submission matches these filters.' : 'Nobody has submitted feedback so far.'}
          </p>
        </motion.div>
      )}

      {!submissionsLoading && !submissionsError && submissions.length > 0 && (
        <React.Fragment>
          <div className="space-y-3">
            {submissions.map((submission) => {
              const isOpen = expanded.has(submission.id);
              return (
                <motion.div
                  key={submission.id}
                  variants={itemVariants}
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden"
                >
                  {/* Respondent identity */}
                  <button
                    onClick={() => toggleExpanded(submission.id)}
                    className="w-full text-left p-5 flex items-start gap-4 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center shrink-0">
                      <span className="text-white font-bold text-lg">
                        {submission.full_name?.charAt(0)?.toUpperCase() || '?'}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-bold text-gray-900 dark:text-white">{submission.full_name}</h4>
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${roleBadgeClass(submission.respondent_role)}`}>
                          {roleLabel(submission.respondent_role)}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-x-5 gap-y-1 mt-2 text-sm text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-base">badge</span>
                          {submission.personal_id || '—'}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-base">school</span>
                          {submission.faculty || '—'}
                        </span>
                        {submission.volunteer_id && (
                          <span className="flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-base">tag</span>
                            {submission.volunteer_id}
                          </span>
                        )}
                        <span className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-base">schedule</span>
                          {new Date(submission.submitted_at).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`material-symbols-outlined text-gray-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    >
                      expand_more
                    </span>
                  </button>

                  {/* Answers */}
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden"
                      >
                        <div className="px-5 pb-5 pt-1 border-t border-gray-100 dark:border-slate-800 space-y-4">
                          {(submission.university || submission.department || submission.team_name || submission.email) && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm pt-4">
                              {submission.email && (
                                <p className="text-gray-500 dark:text-gray-400">
                                  <span className="font-semibold text-gray-700 dark:text-gray-300">Email: </span>
                                  {submission.email}
                                </p>
                              )}
                              {submission.university && (
                                <p className="text-gray-500 dark:text-gray-400">
                                  <span className="font-semibold text-gray-700 dark:text-gray-300">University: </span>
                                  {submission.university}
                                </p>
                              )}
                              {submission.department && (
                                <p className="text-gray-500 dark:text-gray-400">
                                  <span className="font-semibold text-gray-700 dark:text-gray-300">Department: </span>
                                  {submission.department}
                                </p>
                              )}
                              {submission.team_name && (
                                <p className="text-gray-500 dark:text-gray-400">
                                  <span className="font-semibold text-gray-700 dark:text-gray-300">Team: </span>
                                  {submission.team_name}
                                </p>
                              )}
                            </div>
                          )}

                          {submission.answers.length === 0 ? (
                            <p className="text-sm text-gray-400 italic pt-2">No answers recorded.</p>
                          ) : (
                            submission.answers.map((answer) => (
                              <div key={answer.question_id} className="bg-gray-50 dark:bg-slate-800/60 rounded-xl p-4">
                                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                  {answer.question_text}
                                </p>
                                {answer.question_type === 'rating' ? (
                                  answer.rating ? (
                                    <StarDisplay rating={answer.rating} />
                                  ) : (
                                    <p className="text-sm italic text-gray-400">Not rated</p>
                                  )
                                ) : (
                                  <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
                                    {answer.answer_text || <span className="italic text-gray-400">No answer</span>}
                                  </p>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <motion.div variants={itemVariants} className="flex items-center justify-between gap-3 pt-2">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="px-4 py-2 text-sm font-bold text-gray-700 dark:text-gray-300">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </motion.div>
          )}
        </React.Fragment>
      )}
    </motion.div>
  );

  return (
    <motion.div className="space-y-6 p-4 sm:p-6" variants={containerVariants} initial="hidden" animate="visible" exit="exit">
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-center gap-4">
        <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-xl">
          <span className="material-symbols-outlined text-red-600">rate_review</span>
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Feedback</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Write the questions respondents see, and read what they sent back
          </p>
        </div>
      </motion.div>

      {/* Sub-tabs */}
      <motion.div variants={itemVariants} className="inline-flex p-1 rounded-xl bg-gray-100 dark:bg-slate-800">
        {([
          { key: 'questions', label: 'Questions', icon: 'quiz' },
          { key: 'responses', label: 'Responses', icon: 'forum' }
        ] as const).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setView(tab.key)}
            className={`px-5 py-2.5 rounded-lg font-bold text-sm transition-all flex items-center gap-2 ${view === tab.key
              ? 'bg-white dark:bg-slate-900 text-red-600 shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
          >
            <span className="material-symbols-outlined text-lg">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </motion.div>

      <AnimatePresence mode="wait">
        {view === 'questions' ? renderQuestions() : renderResponses()}
      </AnimatePresence>

      {/* Add / edit question modal */}
      <AnimatePresence>
        {showQuestionModal && (
          <motion.div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !savingQuestion && setShowQuestionModal(false)}
          >
            <motion.div
              className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-100 dark:border-slate-800"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-slate-800">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-red-600">{editingQuestion ? 'edit' : 'add_circle'}</span>
                  {editingQuestion ? 'Edit Question' : 'Add Question'}
                </h3>
                <button
                  onClick={() => setShowQuestionModal(false)}
                  disabled={savingQuestion}
                  aria-label="Close"
                  className="w-9 h-9 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-gray-500">close</span>
                </button>
              </div>

              <div className="p-5 space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Question text
                  </label>
                  <textarea
                    value={formText}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormText(e.target.value.slice(0, 500))}
                    rows={3}
                    maxLength={500}
                    placeholder="e.g. How would you rate the organisation of the event?"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all resize-y"
                  />
                  <p className="text-right text-xs text-gray-400 mt-1">{formText.length} / 500</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Answer type
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {([
                      { value: 'rating', label: 'Rating', hint: '1 to 5 stars', icon: 'star_rate' },
                      { value: 'text', label: 'Written', hint: 'Free text answer', icon: 'edit_note' }
                    ] as const).map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setFormType(option.value)}
                        className={`p-4 rounded-xl border-2 text-left transition-all ${formType === option.value
                          ? 'border-red-600 bg-red-50 dark:bg-red-900/20'
                          : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600'
                          }`}
                      >
                        <span
                          className={`material-symbols-outlined mb-1 block ${formType === option.value ? 'text-red-600' : 'text-gray-400'}`}
                        >
                          {option.icon}
                        </span>
                        <p className="font-bold text-gray-900 dark:text-white text-sm">{option.label}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{option.hint}</p>
                      </button>
                    ))}
                  </div>
                  {editingQuestion && editingQuestion.question_type !== formType && !!editingQuestion.answer_count && (
                    <p className="mt-2 text-sm text-amber-600 dark:text-amber-400 flex items-start gap-1.5">
                      <span className="material-symbols-outlined text-base">warning</span>
                      Changing the type discards the {editingQuestion.answer_count} answer
                      {editingQuestion.answer_count === 1 ? '' : 's'} already collected for this question.
                    </p>
                  )}
                </div>

                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formRequired}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormRequired(e.target.checked)}
                      className="w-5 h-5 rounded accent-red-600"
                    />
                    <span className="text-sm">
                      <span className="font-semibold text-gray-900 dark:text-white">Required</span>
                      <span className="text-gray-500 dark:text-gray-400"> — respondents must answer it</span>
                    </span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formActive}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormActive(e.target.checked)}
                      className="w-5 h-5 rounded accent-red-600"
                    />
                    <span className="text-sm">
                      <span className="font-semibold text-gray-900 dark:text-white">Visible</span>
                      <span className="text-gray-500 dark:text-gray-400"> — show it in the feedback form</span>
                    </span>
                  </label>
                </div>
              </div>

              <div className="flex gap-3 px-5 pb-5">
                <button
                  onClick={() => setShowQuestionModal(false)}
                  disabled={savingQuestion}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveQuestion}
                  disabled={savingQuestion || !formText.trim()}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 font-semibold text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {savingQuestion ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    editingQuestion ? 'Save Changes' : 'Add Question'
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete confirmation */}
      <AnimatePresence>
        {deletingQuestion && (
          <motion.div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-100 dark:border-slate-800"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
            >
              <div className="p-6 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <span className="material-symbols-outlined text-3xl text-red-600">delete</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Delete Question</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  &ldquo;{deletingQuestion.question_text}&rdquo;
                </p>
                {!!deletingQuestion.answer_count && (
                  <p className="text-sm text-red-600 dark:text-red-400 font-semibold mt-3">
                    This also deletes the {deletingQuestion.answer_count} answer
                    {deletingQuestion.answer_count === 1 ? '' : 's'} already submitted for it.
                  </p>
                )}
              </div>
              <div className="flex gap-3 px-6 pb-6">
                <button
                  onClick={() => setDeletingQuestion(null)}
                  disabled={deletingPending}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteQuestion}
                  disabled={deletingPending}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 font-semibold text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {deletingPending ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    'Yes, Delete'
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast.show && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast((prev) => ({ ...prev, show: false }))}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default FeedbackManagement;
