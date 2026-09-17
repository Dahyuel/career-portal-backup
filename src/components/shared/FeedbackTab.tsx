import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import Toast from './Toast';
import {
  getFeedbackQuestionsRPC,
  getMyFeedbackRPC,
  submitFeedbackRPC,
  type FeedbackQuestion,
  type FeedbackAnswerInput
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

const RATING_LABELS = ['Very poor', 'Poor', 'Okay', 'Good', 'Excellent'];

interface RatingInputProps {
  value: number | null;
  onChange: (value: number) => void;
  disabled?: boolean;
}

const RatingInput: React.FC<RatingInputProps> = ({ value, onChange, disabled }) => {
  const [hovered, setHovered] = useState<number | null>(null);
  const shown = hovered ?? value;

  return (
    <div>
      <div className="flex items-center gap-2" role="radiogroup">
        {[1, 2, 3, 4, 5].map((score) => {
          const filled = shown !== null && score <= shown;
          return (
            <motion.button
              key={score}
              type="button"
              role="radio"
              aria-checked={value === score}
              aria-label={`${score} out of 5 — ${RATING_LABELS[score - 1]}`}
              disabled={disabled}
              onClick={() => onChange(score)}
              onMouseEnter={() => !disabled && setHovered(score)}
              onMouseLeave={() => setHovered(null)}
              whileHover={disabled ? {} : { scale: 1.12 }}
              whileTap={disabled ? {} : { scale: 0.92 }}
              className={`w-11 h-11 rounded-xl flex items-center justify-center transition-colors disabled:cursor-not-allowed ${filled
                ? 'bg-amber-100 dark:bg-amber-900/30'
                : 'bg-gray-100 dark:bg-slate-800'
                }`}
            >
              <span
                className={`material-symbols-outlined text-xl ${filled ? 'text-amber-500' : 'text-gray-400 dark:text-slate-600'}`}
                style={filled ? { fontVariationSettings: "'FILL' 1" } : undefined}
              >
                star
              </span>
            </motion.button>
          );
        })}
        <span className="ml-2 text-sm font-semibold text-gray-500 dark:text-gray-400 min-w-[5.5rem]">
          {shown ? RATING_LABELS[shown - 1] : 'Not rated'}
        </span>
      </div>
    </div>
  );
};

interface FeedbackTabProps {
  /** Defaults to the current event. */
  eventId?: string;
  /** Shown under the page heading; tailor it per dashboard if you like. */
  subtitle?: string;
}

/**
 * Event feedback form shared by the attendee dashboard and every volunteer
 * dashboard. Questions are authored by admins and come in two shapes: a free
 * text answer, or a 1–5 rating.
 */
const FeedbackTab: React.FC<FeedbackTabProps> = ({
  eventId = getActiveEventId(),
  subtitle = 'Tell us how the event went for you. Your answers help us improve.'
}) => {
  const [questions, setQuestions] = useState<FeedbackQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, { answer_text?: string; rating?: number }>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);
  const [feedbackOpen, setFeedbackOpen] = useState(true);
  const [missing, setMissing] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({
    show: false,
    message: '',
    type: 'success'
  });

  const loadFeedback = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [questionsResult, mineResult] = await Promise.all([
        getFeedbackQuestionsRPC(eventId),
        getMyFeedbackRPC(eventId)
      ]);

      if (questionsResult.error) throw new Error(questionsResult.error.message);
      setQuestions(questionsResult.data || []);
      setFeedbackOpen(questionsResult.open);

      if (mineResult.error) {
        // A failed read of my own submission is not fatal — the form still works.
        logger.error('Error loading my feedback:', mineResult.error);
      } else if (mineResult.data?.submitted) {
        setAlreadySubmitted(true);
        setSubmittedAt(mineResult.data.submitted_at || null);
        const prefill: Record<string, { answer_text?: string; rating?: number }> = {};
        (mineResult.data.answers || []).forEach((a: FeedbackAnswerInput) => {
          prefill[a.question_id] = {
            answer_text: a.answer_text || undefined,
            rating: a.rating || undefined
          };
        });
        setAnswers(prefill);
      }
    } catch (error: any) {
      logger.error('Error loading feedback:', error);
      setLoadError(error.message || 'Could not load the feedback form');
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    loadFeedback();
  }, [loadFeedback]);

  const setAnswer = useCallback((questionId: string, value: { answer_text?: string; rating?: number }) => {
    setAnswers((prev) => ({ ...prev, [questionId]: { ...prev[questionId], ...value } }));
    setMissing((prev) => {
      if (!prev.has(questionId)) return prev;
      const next = new Set(prev);
      next.delete(questionId);
      return next;
    });
  }, []);

  const answeredCount = useMemo(
    () =>
      questions.filter((q) => {
        const a = answers[q.id];
        return q.question_type === 'rating' ? !!a?.rating : !!a?.answer_text?.trim();
      }).length,
    [questions, answers]
  );

  // Feedback is final once submitted.
  const readOnly = alreadySubmitted;

  const handleSubmit = async () => {
    // Required questions must be answered before anything is sent.
    const missingRequired = new Set(
      questions
        .filter((q) => {
          if (!q.is_required) return false;
          const a = answers[q.id];
          return q.question_type === 'rating' ? !a?.rating : !a?.answer_text?.trim();
        })
        .map((q) => q.id)
    );

    if (missingRequired.size > 0) {
      setMissing(missingRequired);
      setToast({ show: true, message: 'Please answer all required questions', type: 'error' });
      return;
    }

    const payload: FeedbackAnswerInput[] = questions
      .map((q): FeedbackAnswerInput | null => {
        const a = answers[q.id];
        if (q.question_type === 'rating') {
          return a?.rating ? { question_id: q.id, rating: a.rating } : null;
        }
        const text = a?.answer_text?.trim();
        return text ? { question_id: q.id, answer_text: text } : null;
      })
      .filter((a): a is FeedbackAnswerInput => a !== null);

    if (payload.length === 0) {
      setToast({ show: true, message: 'Answer at least one question before submitting', type: 'error' });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await submitFeedbackRPC(payload, eventId);
      if (error) throw new Error(error.message);

      setAlreadySubmitted(true);
      setSubmittedAt(new Date().toISOString());
      setToast({ show: true, message: 'Thank you! Your feedback has been submitted', type: 'success' });
    } catch (error: any) {
      logger.error('Error submitting feedback:', error);
      setToast({ show: true, message: error.message || 'Could not submit your feedback', type: 'error' });
      // Submitted earlier (e.g. from another tab) — show the saved, read-only answers.
      if (/already submitted/i.test(error.message || '')) loadFeedback();
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <div className="relative w-16 h-16 mb-4">
          <div className="absolute inset-0 border-4 border-slate-200 dark:border-slate-800 rounded-full" />
          <motion.div
            className="absolute inset-0 border-4 border-transparent border-t-red-600 rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />
        </div>
        <p className="text-gray-500 dark:text-gray-400 font-medium">Loading feedback form...</p>
      </div>
    );
  }

  return (
    <motion.div className="space-y-6" variants={containerVariants} initial="hidden" animate="visible" exit="exit">
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-center gap-4">
        <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-xl">
          <span className="material-symbols-outlined text-red-600">rate_review</span>
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Event Feedback</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>
        </div>
      </motion.div>

      {loadError && (
        <motion.div
          variants={itemVariants}
          className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 rounded-2xl p-5 flex items-start gap-4"
        >
          <span className="material-symbols-outlined text-red-500 mt-0.5">error</span>
          <div className="flex-1">
            <p className="font-semibold text-red-700 dark:text-red-300">Could not load the form</p>
            <p className="text-sm text-red-600 dark:text-red-400 mt-1">Please try again in a moment.</p>
            <button onClick={loadFeedback} className="mt-3 text-sm font-bold text-red-700 dark:text-red-300 hover:underline">
              Try again
            </button>
          </div>
        </motion.div>
      )}

      {/* Closed by a super admin: people who already answered still see their answers below. */}
      {!loadError && !feedbackOpen && !alreadySubmitted && (
        <motion.div variants={itemVariants} className="text-center py-20">
          <span className="material-symbols-outlined text-6xl text-gray-300 dark:text-slate-700 block mb-3">lock_clock</span>
          <p className="font-bold text-gray-700 dark:text-gray-300">Feedback is closed</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            The feedback form is not accepting answers right now. Please check back later.
          </p>
        </motion.div>
      )}

      {!loadError && feedbackOpen && questions.length === 0 && (
        <motion.div variants={itemVariants} className="text-center py-20">
          <span className="material-symbols-outlined text-6xl text-gray-300 dark:text-slate-700 block mb-3">forum</span>
          <p className="font-bold text-gray-700 dark:text-gray-300">No feedback questions yet</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            The organisers have not published any questions. Please check back later.
          </p>
        </motion.div>
      )}

      {!loadError && questions.length > 0 && (feedbackOpen || alreadySubmitted) && (
        <React.Fragment>
          {/* Submitted banner */}
          <AnimatePresence>
            {alreadySubmitted && (
              <motion.div
                variants={itemVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-900/50 rounded-2xl p-5 flex items-start gap-4"
              >
                <span className="material-symbols-outlined text-emerald-600 mt-0.5">task_alt</span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-emerald-700 dark:text-emerald-300">Feedback submitted</p>
                  <p className="text-sm text-emerald-600 dark:text-emerald-400 mt-1">
                    {submittedAt
                      ? `You submitted your feedback on ${new Date(submittedAt).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit'
                      })}.`
                      : 'Thank you for your feedback.'}
                    {' Submitted feedback cannot be changed.'}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Progress */}
          {!readOnly && (
            <motion.div variants={itemVariants} className="flex items-center gap-3">
              <div className="flex-1 h-2 rounded-full bg-gray-100 dark:bg-slate-800 overflow-hidden">
                <motion.div
                  className="h-full bg-red-600 rounded-full"
                  initial={false}
                  animate={{ width: `${questions.length ? (answeredCount / questions.length) * 100 : 0}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <span className="text-sm font-semibold text-gray-500 dark:text-gray-400 whitespace-nowrap">
                {answeredCount} / {questions.length} answered
              </span>
            </motion.div>
          )}

          {/* Questions */}
          <div className="space-y-4">
            {questions.map((question, index) => {
              const answer = answers[question.id];
              const isMissing = missing.has(question.id);

              return (
                <motion.div
                  key={question.id}
                  variants={itemVariants}
                  className={`bg-white dark:bg-slate-900 rounded-2xl border p-5 sm:p-6 shadow-sm transition-colors ${isMissing
                    ? 'border-red-400 dark:border-red-700'
                    : 'border-gray-100 dark:border-slate-800'
                    }`}
                >
                  <div className="flex items-start gap-3 mb-4">
                    <span className="w-7 h-7 shrink-0 rounded-lg bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 text-xs font-bold flex items-center justify-center mt-0.5">
                      {index + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {question.question_text}
                        {question.is_required && <span className="text-red-600 ml-1">*</span>}
                      </p>
                      <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400">
                        <span className="material-symbols-outlined text-xs">
                          {question.question_type === 'rating' ? 'star_rate' : 'edit_note'}
                        </span>
                        {question.question_type === 'rating' ? 'Rating 1–5' : 'Written answer'}
                      </span>
                    </div>
                  </div>

                  {question.question_type === 'rating' ? (
                    <RatingInput
                      value={answer?.rating ?? null}
                      onChange={(rating) => setAnswer(question.id, { rating })}
                      disabled={readOnly}
                    />
                  ) : readOnly ? (
                    <p className="text-gray-600 dark:text-gray-300 whitespace-pre-wrap bg-gray-50 dark:bg-slate-800 rounded-xl p-4">
                      {answer?.answer_text || <span className="italic text-gray-400">No answer given</span>}
                    </p>
                  ) : (
                    <React.Fragment>
                      <textarea
                        value={answer?.answer_text || ''}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                          setAnswer(question.id, { answer_text: e.target.value.slice(0, 2000) })
                        }
                        rows={4}
                        maxLength={2000}
                        placeholder="Type your answer here..."
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all resize-y"
                      />
                      <p className="text-right text-xs text-gray-400 mt-1">
                        {(answer?.answer_text || '').length} / 2000
                      </p>
                    </React.Fragment>
                  )}

                  {isMissing && (
                    <p className="text-sm text-red-600 dark:text-red-400 font-medium mt-2 flex items-center gap-1">
                      <span className="material-symbols-outlined text-base">error</span>
                      This question is required
                    </p>
                  )}
                </motion.div>
              );
            })}
          </div>

          {/* Actions */}
          {!readOnly && (
            <motion.div variants={itemVariants} className="flex flex-wrap gap-3 justify-end pb-4">
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="px-8 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-all disabled:opacity-50 flex items-center gap-2 active:scale-95"
              >
                {submitting ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <span className="material-symbols-outlined">send</span>
                )}
                Submit Feedback
              </button>
            </motion.div>
          )}
        </React.Fragment>
      )}

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

export default FeedbackTab;
