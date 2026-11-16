import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Sparkles,
  Play,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Clock,
  Layers,
  ShieldCheck,
  ChevronRight,
  Database,
  Info,
  Check,
  Copy,
} from 'lucide-react';
import { startSkillExtraction, getExtractionJobStatus } from '@/lib/adminAuth';
import { Button2 } from '@/components/Button2';

const SKILL_TYPE_BADGES = {
  tool: 'bg-blue-950/70 text-blue-300 border-blue-500/40',
  technique: 'bg-emerald-950/70 text-emerald-300 border-emerald-500/40',
  concept: 'bg-purple-950/70 text-purple-300 border-purple-500/40',
  domain_knowledge: 'bg-amber-950/70 text-amber-300 border-amber-500/40',
  soft_skill: 'bg-rose-950/70 text-rose-300 border-rose-500/40',
};

export default function ExtractSkillsModal({ doc, document: docProp, isOpen, onClose, onSuccess }) {
  const docItem = doc || docProp;
  if (!isOpen || !docItem) return null;

  const [dryRun, setDryRun] = useState(false);
  const [jobId, setJobId] = useState(null);
  const [jobStatus, setJobStatus] = useState('idle'); // 'idle' | 'running' | 'done' | 'failed'
  const [progress, setProgress] = useState({ windows_done: 0, total_windows: 0, current_step: '' });
  const [summary, setSummary] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [activeTab, setActiveTab] = useState('accepted'); // 'accepted' | 'rejected'
  const [copiedQuoteIdx, setCopiedQuoteIdx] = useState(null);

  const pollIntervalRef = useRef(null);

  // Poll job status while running
  useEffect(() => {
    if (!jobId || jobStatus !== 'running') {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      return;
    }

    const pollJob = async () => {
      try {
        const job = await getExtractionJobStatus(jobId);
        if (job.progress) setProgress(job.progress);

        if (job.status === 'done') {
          setJobStatus('done');
          setSummary(job.summary);
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          if (!dryRun && onSuccess) onSuccess();
        } else if (job.status === 'failed') {
          setJobStatus('failed');
          setErrorMessage(job.error || 'Extraction job failed.');
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    };

    pollIntervalRef.current = setInterval(pollJob, 2500);
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [jobId, jobStatus, dryRun, onSuccess]);

  const handleStartExtraction = async () => {
    setJobStatus('running');
    setErrorMessage(null);
    setSummary(null);
    setProgress({ windows_done: 0, total_windows: 0, current_step: 'Submitting extraction task...' });

    try {
      const res = await startSkillExtraction(docItem.document_id, dryRun);
      setJobId(res.job_id);
    } catch (err) {
      setJobStatus('failed');
      setErrorMessage(err.message || 'Failed to start skill extraction job.');
    }
  };

  const handleCopy = (text, idx) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedQuoteIdx(idx);
    setTimeout(() => setCopiedQuoteIdx(null), 1800);
  };

  const handleReset = () => {
    setJobId(null);
    setJobStatus('idle');
    setSummary(null);
    setErrorMessage(null);
    setProgress({ windows_done: 0, total_windows: 0, current_step: '' });
  };

  if (typeof window === 'undefined' || !window.document?.body) {
    return null;
  }

  const progressPercent =
    progress.total_windows > 0
      ? Math.min(100, Math.round((progress.windows_done / progress.total_windows) * 100))
      : 5;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl border border-[#850E35]/60 shadow-2xl text-left overflow-hidden"
        style={{ backgroundColor: '#1C040E' }}
      >
        {/* Modal Top Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-[#850E35]/40 shrink-0 bg-[#18030C]/80">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#850E35] to-[#C73659] text-white shadow-md">
              <Sparkles size={20} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="text-base sm:text-lg font-bold text-white truncate">
                  LLM Skill Extraction
                </h4>
              </div>
              <p className="text-xs text-[#FFBAC7]/70 truncate font-mono">
                {docItem.document_name}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#FFBAC7]/60 hover:text-white hover:bg-[#36081B] transition-colors cursor-pointer shrink-0 ml-3"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {/* Global Error Banner */}
          {errorMessage && (
            <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl border border-rose-500/40 bg-rose-950/70 text-xs text-rose-200">
              <div className="flex items-center gap-2">
                <AlertTriangle size={16} className="text-rose-400 shrink-0" />
                <span>{errorMessage}</span>
              </div>
              {jobStatus === 'failed' && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-3 py-1 rounded-lg bg-rose-900 hover:bg-rose-800 text-white font-semibold transition-colors cursor-pointer shrink-0"
                >
                  Retry
                </button>
              )}
            </div>
          )}

          {/* =========================================================
              VIEW 1: IDLE / CONFIGURATION STATE
          ========================================================== */}
          {jobStatus === 'idle' && (
            <div className="space-y-5">
              <div className="p-4 rounded-2xl bg-[#140209] border border-[#850E35]/40 space-y-3">
                <h5 className="text-xs font-bold uppercase tracking-wider text-[#FFA8B8] flex items-center gap-2">
                  <Info size={14} className="text-[#E36A6A]" />
                  <span>Pipeline Architecture & Extraction Guardrails</span>
                </h5>
                <ul className="text-xs text-[#FFBAC7]/80 space-y-1.5 list-disc list-inside leading-relaxed">
                  <li>
                    <strong>Sequential 2-Page Windows:</strong> Context is chunked and streamed with section continuity hints.
                  </li>
                  <li>
                    <strong>Deterministic Extraction:</strong> Uses official Google GenAI with temperature 0 and structured JSON schema.
                  </li>
                  <li>
                    <strong>Strict Quote Verification:</strong> Quotes are normalized (Unicode NFKC, hyphenated line break repair, case-folding) and verified against page text. Unverified items are strictly rejected.
                  </li>
                  <li>
                    <strong>Rate Throttled:</strong> Windows are paced ~6 seconds apart with 3-attempt exponential backoff.
                  </li>
                </ul>
              </div>

              {/* Dry Run Toggle Box */}
              <div
                onClick={() => setDryRun((prev) => !prev)}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  dryRun
                    ? 'border-[#C73659] bg-[#2D0616]'
                    : 'border-[#850E35]/40 bg-[#140209] hover:border-[#850E35]'
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="dryRunCheckbox"
                    checked={dryRun}
                    onChange={(e) => setDryRun(e.target.checked)}
                    className="mt-0.5 accent-[#C73659] h-4 w-4 rounded cursor-pointer"
                  />
                  <div>
                    <label
                      htmlFor="dryRunCheckbox"
                      className="text-xs font-bold text-white cursor-pointer select-none"
                    >
                      Dry Run Mode (Recommended for testing prompts & audits)
                    </label>
                    <p className="text-[11px] text-[#FFBAC7]/70 mt-0.5 select-none leading-relaxed">
                      Runs the complete Gemini LLM prompt and quote verification logic without writing any records to the <code>skills</code> or <code>skill_evidence</code> tables. Returns up to 20 sample accepted skills and 10 rejected items with audit reasons.
                    </p>
                  </div>
                </div>
              </div>

              {/* Start Extraction Action */}
              <div className="pt-2 flex justify-end">
                <Button2
                  type="button"
                  onClick={handleStartExtraction}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#850E35] to-[#B8194E] hover:brightness-110 shadow-lg shadow-[#850E35]/40 transition-all cursor-pointer"
                >
                  <Play size={14} className="fill-white" />
                  <span>{dryRun ? 'Start Dry Run Extraction' : 'Start Live Extraction'}</span>
                </Button2>
              </div>
            </div>
          )}

          {/* =========================================================
              VIEW 2: LIVE PROGRESS STATE
          ========================================================== */}
          {jobStatus === 'running' && (
            <div className="py-10 space-y-6 text-center max-w-lg mx-auto">
              <div className="relative flex items-center justify-center">
                <div className="h-16 w-16 rounded-full border-4 border-[#850E35]/30 border-t-[#C73659] animate-spin" />
                <Sparkles size={24} className="absolute text-[#FFA8B8] animate-pulse" />
              </div>

              <div className="space-y-2">
                <h5 className="text-sm font-bold text-white">
                  {dryRun ? 'Extracting Skills (Dry Run)...' : 'Extracting & Validating Skills...'}
                </h5>
                <p className="text-xs text-[#FFBAC7] font-mono leading-relaxed">
                  {progress.current_step || 'Processing document windows with Gemini...'}
                </p>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1.5 text-left">
                <div className="flex justify-between text-xs font-mono text-[#FFBAC7]/70">
                  <span>
                    Window {progress.windows_done} of {progress.total_windows || '?'}
                  </span>
                  <span>{progressPercent}%</span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-[#140209] border border-[#850E35]/40 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#850E35] via-[#C73659] to-[#FFA8B8] transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              <p className="text-[11px] text-[#FFBAC7]/50">
                Rate-throttled at ~6s per window to ensure reliable execution without API quota drops.
              </p>
            </div>
          )}

          {/* =========================================================
              VIEW 3: COMPLETED / SUMMARY STATE
          ========================================================== */}
          {jobStatus === 'done' && summary && (
            <div className="space-y-5">
              {/* Top Status Banner */}
              <div
                className={`p-4 rounded-2xl border flex items-center justify-between gap-4 ${
                  summary.dry_run
                    ? 'bg-[#2D0616] border-[#C73659]/70 text-white'
                    : 'bg-emerald-950/60 border-emerald-500/40 text-emerald-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <CheckCircle2
                    size={22}
                    className={summary.dry_run ? 'text-[#FFA8B8]' : 'text-emerald-400'}
                  />
                  <div>
                    <h5 className="text-xs font-extrabold uppercase tracking-wider">
                      {summary.dry_run ? 'Dry Run Complete — Zero DB Rows Modified' : 'Live Skill Extraction Successful!'}
                    </h5>
                    <p className="text-xs text-[#FFBAC7] mt-0.5">
                      Analyzed {summary.pages_total} pages across {summary.windows_total} windows in{' '}
                      {summary.duration_seconds}s.
                    </p>
                  </div>
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
                <div className="p-3.5 rounded-xl bg-[#140209] border border-[#850E35]/40 space-y-1">
                  <p className="text-[10px] uppercase font-bold tracking-wider text-[#FFA8B8]">
                    LLM Candidates
                  </p>
                  <p className="text-xl font-extrabold text-white">
                    {summary.items_returned_by_llm}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-[#140209] border border-[#850E35]/40 space-y-1">
                  <p className="text-[10px] uppercase font-bold tracking-wider text-emerald-400">
                    {summary.dry_run ? 'Verified Samples' : 'Evidence Inserted'}
                  </p>
                  <p className="text-xl font-extrabold text-emerald-400">
                    {summary.dry_run ? summary.sample_accepted_items?.length : summary.evidence_inserted}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-[#140209] border border-[#850E35]/40 space-y-1">
                  <p className="text-[10px] uppercase font-bold tracking-wider text-[#FFA8B8]">
                    New Skills Added
                  </p>
                  <p className="text-xl font-extrabold text-white">
                    {summary.new_skills_created}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-[#140209] border border-[#850E35]/40 space-y-1">
                  <p className="text-[10px] uppercase font-bold tracking-wider text-amber-400">
                    Duplicates Skipped
                  </p>
                  <p className="text-xl font-extrabold text-amber-300">
                    {summary.duplicates_skipped}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-[#140209] border border-[#850E35]/40 space-y-1">
                  <p className="text-[10px] uppercase font-bold tracking-wider text-rose-400">
                    Quote Not Found
                  </p>
                  <p className="text-xl font-extrabold text-rose-300">
                    {summary.items_rejected_quote_not_found}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-[#140209] border border-[#850E35]/40 space-y-1">
                  <p className="text-[10px] uppercase font-bold tracking-wider text-rose-400">
                    Invalid Fields
                  </p>
                  <p className="text-xl font-extrabold text-rose-300">
                    {summary.items_rejected_invalid_fields}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-[#140209] border border-[#850E35]/40 space-y-1">
                  <p className="text-[10px] uppercase font-bold tracking-wider text-[#FFA8B8]">
                    Windows Processed
                  </p>
                  <p className="text-xl font-extrabold text-white">
                    {summary.windows_processed} / {summary.windows_total}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-[#140209] border border-[#850E35]/40 space-y-1">
                  <p className="text-[10px] uppercase font-bold tracking-wider text-[#FFA8B8]">
                    Elapsed Time
                  </p>
                  <p className="text-xl font-extrabold text-white font-mono">
                    {summary.duration_seconds}s
                  </p>
                </div>
              </div>

              {/* Sample Tabs */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 border-b border-[#850E35]/40 pb-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('accepted')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                      activeTab === 'accepted'
                        ? 'bg-[#850E35] text-white shadow-sm'
                        : 'text-[#FFBAC7]/70 hover:text-white'
                    }`}
                  >
                    Sample Accepted Skills ({summary.sample_accepted_items?.length || 0})
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('rejected')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                      activeTab === 'rejected'
                        ? 'bg-rose-950 text-rose-200 border border-rose-500/40 shadow-sm'
                        : 'text-[#FFBAC7]/70 hover:text-white'
                    }`}
                  >
                    Sample Rejected Items ({summary.sample_rejected_items?.length || 0})
                  </button>
                </div>

                {/* Tab 1: Accepted Skills */}
                {activeTab === 'accepted' && (
                  <div className="space-y-2.5 max-h-[38vh] overflow-y-auto pr-1">
                    {summary.sample_accepted_items?.length === 0 ? (
                      <p className="text-xs text-[#FFBAC7]/60 py-6 text-center">
                        No accepted skills captured in sample list.
                      </p>
                    ) : (
                      summary.sample_accepted_items.map((item, idx) => (
                        <div
                          key={idx}
                          className="p-3.5 rounded-2xl bg-[#140209] border border-[#850E35]/40 space-y-2 text-xs"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white text-sm">
                                {item.skill_name}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${
                                  SKILL_TYPE_BADGES[item.skill_type] || 'bg-[#240614] text-white'
                                }`}
                              >
                                {item.skill_type}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 text-[#FFBAC7]/70 font-mono text-[11px]">
                              <span>Page {item.page_number}</span>
                              <span>•</span>
                              <span>Confidence: {item.confidence}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 text-[11px] text-[#FFA8B8]">
                            <span>
                              Verb / Depth Cue: <code className="text-white font-mono">{item.depth_cue}</code>
                            </span>
                            <span>•</span>
                            <span className="truncate max-w-sm">
                              Section: {item.section_name}
                            </span>
                          </div>

                          <div className="relative p-2.5 rounded-xl bg-[#0F0107] border border-[#850E35]/25 text-[#FFBAC7]/90 font-mono text-[11px] leading-relaxed">
                            <p>"{item.evidence_quote}"</p>
                            <button
                              type="button"
                              onClick={() => handleCopy(item.evidence_quote, idx)}
                              className="absolute top-2 right-2 text-[#FFA8B8] hover:text-white transition-colors cursor-pointer"
                              title="Copy quote"
                            >
                              {copiedQuoteIdx === idx ? (
                                <Check size={13} className="text-emerald-400" />
                              ) : (
                                <Copy size={13} />
                              )}
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Tab 2: Rejected Items */}
                {activeTab === 'rejected' && (
                  <div className="space-y-2.5 max-h-[38vh] overflow-y-auto pr-1">
                    {summary.sample_rejected_items?.length === 0 ? (
                      <p className="text-xs text-emerald-300 py-6 text-center">
                        Zero items rejected! All candidate quotes were verified cleanly on page text.
                      </p>
                    ) : (
                      summary.sample_rejected_items.map((item, idx) => (
                        <div
                          key={idx}
                          className="p-3.5 rounded-2xl bg-rose-950/40 border border-rose-500/30 space-y-2 text-xs"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <span className="font-bold text-white">
                              {item.item?.skill_name || 'Candidate Skill'}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-950 border border-rose-500/50 text-rose-300">
                              Rejected
                            </span>
                          </div>

                          <p className="text-rose-200 text-xs font-semibold">
                            Reason: {item.reason}
                          </p>

                          {item.item?.evidence_quote && (
                            <p className="p-2 rounded-xl bg-black/40 border border-rose-500/20 text-[#FFBAC7]/70 font-mono text-[11px]">
                              Quote: "{item.item.evidence_quote}"
                            </p>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-[#850E35]/40 flex justify-end bg-[#18030C]/80 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-semibold text-[#FFBAC7] hover:text-white bg-[#18030C] hover:bg-[#250514] border border-[#850E35]/40 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    window.document.body
  );
}
