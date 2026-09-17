import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  buildEventReportHtml,
  defaultReportOptions,
  normalizeReportOptions,
  REPORT_CHARTS,
  REPORT_SECTIONS,
  type ReportChartType,
  type ReportOptions
} from './eventReport';
import type { EventStatistics } from './statisticsShared';

const OPTIONS_STORAGE_KEY = 'admin.eventReport.options';

const loadOptions = (): ReportOptions => {
  try {
    return normalizeReportOptions(JSON.parse(localStorage.getItem(OPTIONS_STORAGE_KEY) ?? 'null'));
  } catch {
    return defaultReportOptions();
  }
};

interface EventReportModalProps {
  stats: EventStatistics;
  generatedBy?: string | null;
  onClose: () => void;
}

/**
 * Previews the full event report, lets the admin customize it (sections and
 * bar / pie charts), and saves it as a PDF through the browser's print dialog
 * (vector output, so charts and Arabic text stay sharp).
 */
const EventReportModal: React.FC<EventReportModalProps> = ({ stats, generatedBy, onClose }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);
  const [options, setOptions] = useState<ReportOptions>(loadOptions);
  const [panelOpen, setPanelOpen] = useState(false);
  // Fixed for the whole preview, so toggling options doesn't change the "generated at" time.
  const [generatedAt] = useState(() => new Date());

  const html = useMemo(
    () => buildEventReportHtml(stats, { generatedBy, generatedAt }, options),
    [stats, generatedBy, generatedAt, options]
  );

  useEffect(() => {
    try {
      localStorage.setItem(OPTIONS_STORAGE_KEY, JSON.stringify(options));
    } catch {
      // Storage unavailable (private mode, blocked) — options just won't be remembered.
    }
  }, [options]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const visibleSections = REPORT_SECTIONS.filter((s) => options.sections[s.id]).length;

  const setSection = (id: keyof ReportOptions['sections'], value: boolean) =>
    setOptions((prev) => ({ ...prev, sections: { ...prev.sections, [id]: value } }));

  const setChart = (id: keyof ReportOptions['charts'], value: ReportChartType) =>
    setOptions((prev) => ({ ...prev, charts: { ...prev.charts, [id]: value } }));

  const setAllCharts = (value: ReportChartType) =>
    setOptions((prev) => ({
      ...prev,
      charts: Object.fromEntries(REPORT_CHARTS.map((c) => [c.id, value])) as ReportOptions['charts']
    }));

  const downloadPdf = () => {
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    win.focus();
    win.print();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-6">
      <motion.div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="event-report-title"
        className="relative z-10 w-full max-w-6xl h-full max-h-[94vh] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        initial={{ opacity: 0, scale: 0.97, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 12 }}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-red-600">summarize</span>
          </div>
          <div className="flex-1 min-w-0">
            <h2 id="event-report-title" className="text-lg font-bold text-slate-900 dark:text-white">Full event report</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Customize it, then download. In the print window, choose <b>Save as PDF</b>.
            </p>
          </div>
          <button
            onClick={() => setPanelOpen((v) => !v)}
            aria-expanded={panelOpen}
            className="md:hidden px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-lg">tune</span>
            Customize
          </button>
          <button
            onClick={downloadPdf}
            disabled={!ready || visibleSections === 0}
            className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-lg">picture_as_pdf</span>
            Download PDF
          </button>
          <button
            onClick={onClose}
            aria-label="Close report"
            className="w-10 h-10 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-500 transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="flex-1 min-h-0 flex flex-col md:flex-row">
          {/* Customize panel */}
          <aside
            className={`${panelOpen ? 'block' : 'hidden'} md:block w-full md:w-72 shrink-0 overflow-y-auto max-h-[45vh] md:max-h-none border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800`}
            aria-label="Customize report"
          >
            <div className="p-4 space-y-6">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Sections</h3>
                <ul className="space-y-0.5">
                  {REPORT_SECTIONS.map((s) => (
                    <li key={s.id}>
                      <label className="flex items-center gap-2.5 py-1.5 text-sm text-slate-700 dark:text-slate-200 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={options.sections[s.id]}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSection(s.id, e.target.checked)}
                          className="w-4 h-4 rounded accent-red-600"
                        />
                        {s.label}
                      </label>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Chart style</h3>
                <div className="flex gap-2 mb-3">
                  {([['bar', 'All bars', 'bar_chart'], ['pie', 'All pies', 'pie_chart']] as const).map(([value, label, icon]) => (
                    <button
                      key={value}
                      onClick={() => setAllCharts(value)}
                      className="flex-1 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center gap-1"
                    >
                      <span className="material-symbols-outlined text-sm">{icon}</span>
                      {label}
                    </button>
                  ))}
                </div>
                <ul className="space-y-2">
                  {REPORT_CHARTS.map((c) => {
                    const disabled = !options.sections[c.section];
                    return (
                      <li key={c.id} className={`flex items-center justify-between gap-2 ${disabled ? 'opacity-40' : ''}`}>
                        <span className="text-sm text-slate-700 dark:text-slate-200 truncate">{c.label}</span>
                        <div className="inline-flex shrink-0 rounded-lg bg-slate-100 dark:bg-slate-800 p-0.5" role="group" aria-label={`${c.label} chart style`}>
                          {(['bar', 'pie'] as const).map((t) => (
                            <button
                              key={t}
                              disabled={disabled}
                              onClick={() => setChart(c.id, t)}
                              aria-pressed={options.charts[c.id] === t}
                              title={t === 'bar' ? 'Bars' : 'Pie chart'}
                              className={`px-2 py-1 rounded-md flex items-center transition-colors disabled:cursor-not-allowed ${options.charts[c.id] === t
                                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                                : 'text-slate-500 dark:text-slate-400'
                                }`}
                            >
                              <span className="material-symbols-outlined text-base">{t === 'bar' ? 'bar_chart' : 'pie_chart'}</span>
                            </button>
                          ))}
                        </div>
                      </li>
                    );
                  })}
                </ul>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-3">
                  Pie charts show the 5 largest groups and combine the rest into “Other”. Charts over time and the attendee journey always stay as bars.
                </p>
              </div>

              <button
                onClick={() => setOptions(defaultReportOptions())}
                className="text-sm font-semibold text-red-600 hover:underline flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-base">restart_alt</span>
                Reset to default
              </button>
            </div>
          </aside>

          {/* Preview */}
          <div className="flex-1 min-h-0 bg-slate-200 dark:bg-slate-950 relative">
            {!ready && (
              <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-500">Preparing report...</div>
            )}
            {/* No scripts are allowed inside the report; same-origin is needed so the parent can call print(). */}
            <iframe
              ref={iframeRef}
              title="Full event report preview"
              srcDoc={html}
              sandbox="allow-same-origin allow-modals"
              onLoad={() => setReady(true)}
              className="w-full h-full border-0"
            />
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default EventReportModal;
