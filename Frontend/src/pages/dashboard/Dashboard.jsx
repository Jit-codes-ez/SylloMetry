import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  CircleCheck,
  Code2,
  FileText,
  Loader2,
  RefreshCw,
  Sparkles,
  Target,
  UploadCloud,
  X,
} from "lucide-react";
import FileUpload from "@/components/FileUpload";
import { DashboardSkeleton } from "@/components/ClassicSkeleton";
import { motion, AnimatePresence } from "motion/react";

const CURRICULUM_STORAGE_KEY = "syllometry_curriculum_state";

export function loadSavedCurriculum() {
  try {
    const raw = localStorage.getItem(CURRICULUM_STORAGE_KEY);
    if (!raw) return { files: [], analysisComplete: false };
    const parsed = JSON.parse(raw);
    const files = Array.isArray(parsed?.files) ? parsed.files : [];
    const validFiles = files.filter(
      (f) => f && typeof f.name === "string" && f.name.trim().length > 0
    );
    return {
      files: validFiles,
      analysisComplete: Boolean(parsed?.analysisComplete && validFiles.length > 0),
    };
  } catch (err) {
    console.error("Failed to read curriculum from localStorage", err);
    return { files: [], analysisComplete: false };
  }
}

export function persistCurriculum(files, isAnalyzed) {
  try {
    if (!files || files.length === 0) {
      localStorage.removeItem(CURRICULUM_STORAGE_KEY);
      return;
    }
    const cleanFiles = files.map((f, idx) => ({
      id: f.id || `doc-${idx}-${Date.now()}`,
      name: f.name || "Curriculum.pdf",
      size: typeof f.size === "number" ? f.size : 0,
      type: f.type || "application/pdf",
      lastModified: f.lastModified || Date.now(),
      progress: 100,
    }));
    const data = {
      files: cleanFiles,
      analysisComplete: Boolean(isAnalyzed),
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(CURRICULUM_STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.error("Failed to write curriculum to localStorage", err);
  }
}

export default function Dashboard({ isLoading = false }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Lazy-initialize curriculum and analysis state from localStorage
  const [savedData] = useState(() => loadSavedCurriculum());
  const [uploadedCurriculum, setUploadedCurriculum] = useState(() => savedData.files);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isWarningModalOpen, setIsWarningModalOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(() => savedData.analysisComplete);
  const [countdown, setCountdown] = useState(4); // 4-second countdown
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStep, setScanStep] = useState("Parsing document structure...");

  const timerRef = useRef(null);
  const uploadedCurriculumRef = useRef(uploadedCurriculum);

  useEffect(() => {
    uploadedCurriculumRef.current = uploadedCurriculum;
  }, [uploadedCurriculum]);

  // Handle ?new=true and ?warn=no_curriculum query params
  useEffect(() => {
    if (searchParams.get("new") === "true") {
      setUploadedCurriculum([]);
      setAnalysisComplete(false);
      setIsAnalyzing(false);
      persistCurriculum([], false);
      setSearchParams({}, { replace: true });
    } else if (searchParams.get("warn") === "no_curriculum") {
      setIsWarningModalOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const handleAnalyzeCurriculum = () => {
    setIsModalOpen(true);
    setIsAnalyzing(true);
    setAnalysisComplete(false);
    setScanProgress(0);
    setCountdown(4);
    setScanStep("Parsing curriculum document...");

    const filesToAnalyze = (uploadedCurriculumRef.current?.length > 0
      ? uploadedCurriculumRef.current
      : uploadedCurriculum) || [];

    const totalDuration = 4000; // 4 seconds total
    const interval = 100;
    let elapsed = 0;

    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      elapsed += interval;
      const progress = Math.min(100, Math.round((elapsed / totalDuration) * 100));
      setScanProgress(progress);

      const remainingSec = Math.max(0, Math.ceil((totalDuration - elapsed) / 1000));
      setCountdown(remainingSec);

      if (elapsed >= 1000 && elapsed < 2000) {
        setScanStep("Extracting technical competencies & course topics...");
      } else if (elapsed >= 2000 && elapsed < 3200) {
        setScanStep("Benchmarking skills against industry hiring criteria...");
      } else if (elapsed >= 3200 && elapsed < 4000) {
        setScanStep("Finalizing readiness score & career roadmap...");
      }

      if (elapsed >= totalDuration) {
        clearInterval(timerRef.current);
        setIsAnalyzing(false);
        setAnalysisComplete(true);
        setScanStep("Analysis complete!");
        persistCurriculum(filesToAnalyze, true);
        // Do NOT redirect automatically. The user will click "View Analytics"
      }
    }, interval);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  if (isLoading) {
    return <DashboardSkeleton theme="syllometry" shimmer={true} />;
  }

  const userName =
    user?.full_name?.split(" ")[0] ||
    user?.user_metadata?.full_name?.split(" ")[0] ||
    user?.email?.split("@")[0] ||
    "Scholar";

  return (
    <div className="min-h-screen bg-[#FFFBF1] text-[#850E35] pt-24 pb-16">
      <div className="mx-auto max-w-[1450px] px-4 py-7 sm:px-6 lg:px-8 lg:py-9">

        {/* =========================================================
            WELCOME BANNER & QUICK ACTIONS
        ========================================================== */}
        <section id="dashboard-home" className="mb-8">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <div className="mb-2 flex items-center gap-2">
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-[#850E35] sm:text-4xl">
                Welcome to SylloMetry, {userName}.
              </h1>
              <p className="mt-2 max-w-xl text-xs sm:text-sm leading-relaxed text-[#850E35]/65">
                Upload your university curriculum to benchmark your skills, uncover gaps,
                and generate a personalized career roadmap.
              </p>
            </div>
          </div>
        </section>

        {/* =========================================================
            CURRICULUM UPLOAD SECTION
        ========================================================== */}
        <section id="curriculum-upload" className="mb-8">
          <div className="rounded-3xl border border-[#850E35]/15 bg-white p-6 sm:p-8 shadow-sm">
            <div className="mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#850E35] text-white shadow-xs">
                    <UploadCloud size={20} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-[#850E35]">
                      Upload Your Academic Curriculum
                    </h2>
                    <p className="mt-1 text-xs text-[#850E35]/60 max-w-2xl leading-relaxed">
                      Upload your university syllabus, degree course outline, or technical transcript.
                      SylloMetry’s AI parses your course content and benchmarks your skill readiness
                      against real-time industry hiring standards.
                    </p>
                  </div>
                </div>
              </div>

              {analysisComplete && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold self-start">
                  <CircleCheck size={14} />
                  <span>Syllabus Analyzed</span>
                </span>
              )}
            </div>

            {/* File Upload Component */}
            <FileUpload
              hint="Supported formats: PDF, DOCX, DOC, TXT (Max 15MB)"
              accept=".pdf,.doc,.docx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
              allowsMultiple={false}
              maxFiles={1}
              maxSize={15 * 1024 * 1024}
              initialFiles={uploadedCurriculum}
              onFilesChange={(files) => {
                setUploadedCurriculum(files);
                if (!files || files.length === 0) {
                  setAnalysisComplete(false);
                  setIsAnalyzing(false);
                  persistCurriculum([], false);
                } else {
                  setAnalysisComplete(false);
                  setIsAnalyzing(false);
                  persistCurriculum(files, false);
                }
              }}
            />

            {/* Analyze Trigger Bar */}
            {uploadedCurriculum.length > 0 && (
              <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-5 border-t border-[#850E35]/10 animate-in fade-in duration-300">
                <div className="flex items-center gap-2 text-xs text-[#850E35]/70">
                  <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-medium">
                    Curriculum uploaded ({uploadedCurriculum[0]?.name || "Document"}) • Ready for AI analysis
                  </span>
                </div>

                <button
                  type="button"
                  id="analyze-curriculum-btn"
                  onClick={handleAnalyzeCurriculum}
                  disabled={isAnalyzing}
                  className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-[#850E35] px-6 py-3.5 text-xs font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#6e092c] active:translate-y-0 disabled:opacity-60 cursor-pointer"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 size={16} className="animate-spin text-white" />
                      <span>Analyzing Curriculum...</span>
                    </>
                  ) : analysisComplete ? (
                    <>
                      <CircleCheck size={16} />
                      <span>Re-Analyze Curriculum</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} />
                      <span>Analyze My Curriculum</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </section>

        {/* =========================================================
            POST-ANALYSIS SUCCESS CARD (Shown after modal is closed)
        ========================================================== */}
        {analysisComplete && !isAnalyzing && (
          <section className="mb-8 rounded-3xl border border-emerald-500/25 bg-emerald-50/50 p-6 sm:p-8 animate-in fade-in duration-400">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-xs">
                  <CircleCheck size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-emerald-950">
                      Curriculum Analysis Ready!
                    </h3>
                  </div>
                  <p className="mt-1 text-xs text-emerald-800/80 max-w-xl leading-relaxed">
                    Your course outline has been successfully benchmarked against industry standards.
                    Your skill profile, priority gaps, career readiness score, and simulation lab are
                    ready in your dedicated analytics dashboard.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 shrink-0">
                <Link
                  to="/dashboard/analytics"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#850E35] text-white text-xs font-bold shadow-md hover:bg-[#6e092c] transition-all cursor-pointer"
                >
                  <BarChart3 size={16} />
                  <span>Open Full Analytics</span>
                  <ArrowRight size={14} />
                </Link>

                <button
                  type="button"
                  onClick={() => {
                    setUploadedCurriculum([]);
                    setAnalysisComplete(false);
                    setIsAnalyzing(false);
                    persistCurriculum([], false);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-3 rounded-xl border border-[#850E35]/20 bg-white text-[#850E35] text-xs font-bold hover:bg-[#FFF5E4] transition-all cursor-pointer"
                >
                  <RefreshCw size={13} />
                  <span>Upload Another</span>
                </button>
              </div>
            </div>
          </section>
        )}

      </div>

      {/* =========================================================
          ANALYSIS MODAL (Countdown + Round Load Animation + Success State)
      ========================================================== */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!isAnalyzing) setIsModalOpen(false);
              }}
              className="fixed inset-0 bg-black/50 backdrop-blur-xs"
            />

            {/* Modal Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-md rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-[#850E35]/15 z-10 overflow-hidden"
            >
              {/* Close Button (Only active when not analyzing) */}
              {!isAnalyzing && (
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="absolute right-5 top-5 p-1.5 rounded-xl text-[#850E35]/60 hover:text-[#850E35] hover:bg-[#FFF5E4] transition-colors cursor-pointer"
                  aria-label="Close modal"
                >
                  <X size={18} />
                </button>
              )}

              {/* 1. ANALYZING / COUNTDOWN STATE */}
              {isAnalyzing && (
                <div className="text-center py-2">

                  <h3 className="text-xl font-bold text-[#850E35]">
                    Analyzing Your Curriculum
                  </h3>

                  <p className="mt-1 text-xs text-[#850E35]/60 max-w-xs mx-auto">
                    Benchmarking course topics against industry competencies.
                  </p>

                  {/* Circular Countdown Progress Ring */}
                  <div className="relative mx-auto my-6 flex h-32 w-32 items-center justify-center">
                    <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 120 120">
                      {/* Background Ring */}
                      <circle
                        cx="60"
                        cy="60"
                        r="50"
                        stroke="#FFF5E4"
                        strokeWidth="8"
                        fill="none"
                      />
                      {/* Animated Progress Ring */}
                      <circle
                        cx="60"
                        cy="60"
                        r="50"
                        stroke="#850E35"
                        strokeWidth="8"
                        strokeLinecap="round"
                        fill="none"
                        strokeDasharray={2 * Math.PI * 50}
                        strokeDashoffset={2 * Math.PI * 50 * (1 - scanProgress / 100)}
                        className="transition-all duration-150 ease-linear"
                      />
                    </svg>

                    {/* Center Countdown Display */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                      <span className="text-3xl font-extrabold text-[#850E35] tracking-tight">
                        {countdown}s
                      </span>
                      <span className="text-[9px] font-bold uppercase tracking-wider text-[#850E35]/50">
                        Estimated
                      </span>
                    </div>
                  </div>

                  {/* Step status and percentage */}
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-[#850E35] min-h-[1.25rem]">
                      {scanStep}
                    </p>
                    <p className="text-[11px] font-semibold text-[#850E35]/50">
                      {scanProgress}% Completed
                    </p>
                  </div>
                </div>
              )}

              {/* 2. SUCCESS STATE (Displays after completion, does NOT auto-redirect) */}
              {analysisComplete && !isAnalyzing && (
                <div className="text-center py-2 animate-in fade-in zoom-in-95 duration-300">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 shadow-xs">
                    <CheckCircle2 size={34} />
                  </div>

                  <h3 className="text-2xl font-bold tracking-tight text-[#850E35] mt-5 mb-6 flex flex-wrap justify-center gap-2">
                    Curriculum Analyzed!
                  </h3>

                  {/* Quick Summary Chips
                  <div className="mt-5 mb-6 flex flex-wrap justify-center gap-2">
                  </div> */}

                  {/* Button to see analytics (Redirects to Analytics.jsx) */}
                  <div className="space-y-2">
                    <Link
                      to="/dashboard/analytics"
                      className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl bg-[#850E35] text-white text-sm font-bold shadow-md hover:bg-[#6e092c] transition-all cursor-pointer"
                    >
                      <BarChart3 size={17} />
                      <span>View Analytics</span>
                      <ArrowRight size={15} />
                    </Link>

                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="w-full py-2 text-xs font-semibold text-[#850E35]/60 hover:text-[#850E35] transition-colors cursor-pointer"
                    >
                      Close & Stay on Dashboard
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* =========================================================
          WARNING MODAL: Curriculum Analysis Required
      ========================================================== */}
      <AnimatePresence>
        {isWarningModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsWarningModalOpen(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-xs"
            />

            {/* Modal Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-md rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-[#850E35]/15 z-10 overflow-hidden text-center"
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setIsWarningModalOpen(false)}
                className="absolute right-5 top-5 p-1.5 rounded-xl text-[#850E35]/60 hover:text-[#850E35] hover:bg-[#FFF5E4] transition-colors cursor-pointer"
                aria-label="Close modal"
              >
                <X size={18} />
              </button>

              {/* Warning Icon Badge */}
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 shadow-xs">
                <AlertTriangle size={32} />
              </div>

              {/* Heading */}
              <h3 className="text-xl font-bold tracking-tight text-[#850E35]">
                Curriculum Analysis Required
              </h3>

              {/* Dynamic Description */}
              <p className="mt-2 text-xs sm:text-sm text-[#850E35]/70 leading-relaxed max-w-sm mx-auto">
                {uploadedCurriculum.length > 0
                  ? "Your curriculum document has been uploaded but has not been analyzed yet. Please run AI analysis to unlock your skill readiness and deep analytics."
                  : "Analytics are only available after uploading and analyzing your academic syllabus or course outline with SylloMetry's AI."}
              </p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* =========================================================
          WARNING MODAL: Curriculum Analysis Required
      ========================================================== */}
      <AnimatePresence>
        {isWarningModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsWarningModalOpen(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-xs"
            />

            {/* Modal Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-md rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-[#850E35]/15 z-10 overflow-hidden text-center"
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setIsWarningModalOpen(false)}
                className="absolute right-5 top-5 p-1.5 rounded-xl text-[#850E35]/60 hover:text-[#850E35] hover:bg-[#FFF5E4] transition-colors cursor-pointer"
                aria-label="Close modal"
              >
                <X size={18} />
              </button>

              {/* Warning Icon Badge */}
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 shadow-xs">
                <AlertTriangle size={32} />
              </div>

              {/* Heading */}
              <h3 className="text-xl font-bold tracking-tight text-[#850E35]">
                Curriculum Analysis Required
              </h3>

              {/* Dynamic Description */}
              <p className="mt-2 text-xs sm:text-sm text-[#850E35]/70 leading-relaxed max-w-sm mx-auto">
                {uploadedCurriculum.length > 0
                  ? "Your curriculum document has been uploaded but has not been analyzed yet. Please run AI analysis to unlock your skill readiness and deep analytics."
                  : "Analytics are only available after uploading and analyzing your academic syllabus or course outline with SylloMetry's AI."}
              </p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
