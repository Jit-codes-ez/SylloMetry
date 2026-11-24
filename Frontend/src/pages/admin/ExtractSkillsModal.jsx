import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FileText,
  Briefcase,
  Plus,
  Trash2,
  Layers,
  ArrowRight,
  RefreshCw,
  Search,
  Check,
  Play,
  Info,
  Filter,
  Tag,
  BookOpen,
  Wrench,
  Cpu,
  BookmarkCheck,
  ShieldAlert,
  RotateCcw,
  RotateCcwClock,
  RotateCw,
  Brain,
} from 'lucide-react';
import {
  getDocumentExtractionPreview,
  saveDocumentOccupationsBatch,
  startSkillExtraction,
  getExtractionJobStatus,
  saveDocumentSkills,
  getGeminiModels,
  getDocumentExtractionStatus,
} from '@/lib/adminAuth';

import geminiLogo from '/logos/gemini.svg';
import groqLogo from '/logos/groq.svg';

const getProviderLogo = (model) => {
  if (!model) return geminiLogo;
  const prov = String(model.provider || '').toLowerCase();
  const mId = String(model.model_id || '').toLowerCase();
  const mKey = String(model.model_key || '').toLowerCase();
  const isGroq =
    prov === 'groq' ||
    mId.startsWith('openai/') ||
    mId.includes('groq') ||
    mKey.includes('groq') ||
    mKey.includes('gpt');
  return isGroq ? groqLogo : geminiLogo;
};

const getProviderAlt = (model) => {
  if (!model) return 'Google Gemini logo';
  const prov = String(model.provider || '').toLowerCase();
  const mId = String(model.model_id || '').toLowerCase();
  const mKey = String(model.model_key || '').toLowerCase();
  const isGroq =
    prov === 'groq' ||
    mId.startsWith('openai/') ||
    mId.includes('groq') ||
    mKey.includes('groq') ||
    mKey.includes('gpt');
  return isGroq ? 'Groq logo' : 'Google Gemini logo';
};

const FALLBACK_GEMINI_MODELS = [
  {
    model_key: 'gemini-3.1-flash-lite',
    model_id: 'gemini-3.1-flash-lite',
    provider: 'Google Gemini',
    display_name: 'Gemini 3.1 Flash-Lite',
    tag: '(Standard)',
    description: 'Standard primary extraction option optimized for rapid document processing, balanced consistency, and low latency.',
    is_enabled: true,
  },
  {
    model_key: 'gemini-3.5-flash-lite',
    model_id: 'gemini-3.5-flash-lite',
    provider: 'Google Gemini',
    display_name: 'Gemini 3.5 Flash-Lite',
    tag: 'Most Reliable',
    description: 'Most reliable extraction model offering strict negative constraint adherence, comprehensive extraction accuracy, and high quality.',
    is_enabled: true,
  },
  {
    model_key: 'gpt-oss-120b',
    model_id: 'openai/gpt-oss-120b',
    provider: 'Groq',
    display_name: 'GPT-OSS 120B',
    tag: 'Faster',
    description: 'Faster open-weight reasoning model via Groq LPU inference for high-speed technical skill extraction.',
    is_enabled: true,
  },
];

export default function ExtractSkillsModal({
  doc,
  document: docProp,
  isOpen,
  onClose,
  onSuccess,
}) {
  const docItem = doc || docProp;
  if (!isOpen || !docItem) return null;

  // Active Tab: 'skills' (Extracted Skills), 'occupations' (Occupation/Role), 'text' (Complete Extracted Text)
  const [activeTab, setActiveTab] = useState('occupations');

  // Loading & Error States for Initial Preview (Part 3)
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  // Extracted Data (Part 3)
  const [pages, setPages] = useState([]);
  const [totalCharacters, setTotalCharacters] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Editable Occupations State (Part 3)
  const [occupations, setOccupations] = useState([]);

  // Submission & Validation States for Occupations (Part 3)
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submitSuccess, setSubmitSuccess] = useState(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isOccupationsSaved, setIsOccupationsSaved] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  // Part 4: Gemini Skill Extraction & Temporary Review States
  const [isExtractingSkills, setIsExtractingSkills] = useState(false);
  const [extractionJobId, setExtractionJobId] = useState(null);
  const [extractionProgress, setExtractionProgress] = useState({
    windows_done: 0,
    total_windows: 0,
    current_step: '',
  });
  const [extractionError, setExtractionError] = useState(null);
  const [extractedSkills, setExtractedSkills] = useState([]);
  const [isSkillsExtracted, setIsSkillsExtracted] = useState(false);

  // Multi-Model AI Extraction States (Gemini & Groq)
  const [availableModels, setAvailableModels] = useState(FALLBACK_GEMINI_MODELS);
  const [selectedModel, setSelectedModel] = useState('gemini-3.1-flash-lite'); // Gemini 3.1 Flash-Lite (Standard) (Primary/Default) default
  const [activeJobModelDisplayName, setActiveJobModelDisplayName] = useState(null);
  const [activeJobExtractionMethod, setActiveJobExtractionMethod] = useState(null);

  // Part 5: Transactional Skill Saving States
  const [isSavingSkills, setIsSavingSkills] = useState(false);
  const [saveSkillsSuccess, setSaveSkillsSuccess] = useState(null);
  const [saveSkillsError, setSaveSkillsError] = useState(null);
  const [isSkillsSaved, setIsSkillsSaved] = useState(false);
  const [saveSummary, setSaveSummary] = useState(null);

  // Part 4 Filters & Search in Skill Review Interface
  const [skillSearchQuery, setSkillSearchQuery] = useState('');
  const [skillTypeFilter, setSkillTypeFilter] = useState('all');

  // Text Filter / Search inside Complete Extracted Text
  const [textSearchQuery, setTextSearchQuery] = useState('');
  const [selectedPageFilter, setSelectedPageFilter] = useState('all');

  // Polling ref for cleanup
  const pollingRef = useRef(null);

  const startPollingJob = (jobId, fallbackModelDisplayName = null, fallbackExtMethod = null) => {
    if (pollingRef.current) clearInterval(pollingRef.current);

    pollingRef.current = setInterval(async () => {
      try {
        const statusRes = await getExtractionJobStatus(jobId);

        if (statusRes.progress) {
          setExtractionProgress(statusRes.progress);
        }
        if (statusRes.selected_model) {
          setActiveJobModelDisplayName(statusRes.selected_model);
        }
        if (statusRes.extraction_method) {
          setActiveJobExtractionMethod(statusRes.extraction_method);
        }

        if (
          statusRes.status === 'completed' ||
          statusRes.status === 'completed_with_warnings' ||
          statusRes.status === 'done'
        ) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
          setIsExtractingSkills(false);
          setIsSkillsExtracted(true);

          const finalModelName = statusRes.selected_model || fallbackModelDisplayName || 'Gemini';
          const finalExtMethod = statusRes.extraction_method || fallbackExtMethod;
          if (finalModelName) setActiveJobModelDisplayName(finalModelName);
          if (finalExtMethod) setActiveJobExtractionMethod(finalExtMethod);

          const rawSkills = statusRes.extracted_skills || [];
          const mappedSkills = rawSkills.map((s, idx) => ({
            temp_id: s.temp_id || `skill_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 4)}`,
            skill_name: String(s.skill_name || ''),
            skill_type: String(s.skill_type || 'tool').toLowerCase(),
            skill_category: String(s.skill_category || ''),
            description: String(s.description || ''),
            depth_cue: String(s.depth_cue || ''),
            raw_phrase: String(s.raw_phrase || ''),
            evidence_quote: String(s.evidence_quote || ''),
            page_number: s.page_number ?? 1,
            verified_page_number: s.verified_page_number ?? s.page_number ?? 1,
            quote_validation_status: String(s.quote_validation_status || 'exact_page_match'),
            section_name: String(s.section_name || ''),
            confidence_score: typeof s.confidence_score === 'number' ? s.confidence_score : (s.confidence ?? 0.0),
            aliases: Array.isArray(s.aliases) ? s.aliases : [],
            extraction_method: s.extraction_method || finalExtMethod || `llm/${statusRes.model_key || 'gemini-3.1-flash-lite'}/v2`,
          }));

          setExtractedSkills(mappedSkills);
        } else if (statusRes.status === 'failed') {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
          setIsExtractingSkills(false);
          setExtractionError(
            statusRes.error || 'Skill extraction failed. Please retry.'
          );
        }
      } catch (pollErr) {
        console.error('Error polling extraction job:', pollErr);
      }
    }, 2000);
  };

  // Clear polling interval on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, []);

  // Fetch extraction preview, allowlisted models, and existing job status on modal open
  useEffect(() => {
    let isMounted = true;

    async function loadExtractionData() {
      setIsLoading(true);
      setFetchError(null);
      setSubmitError(null);
      setSubmitSuccess(null);

      try {
        const res = await getDocumentExtractionPreview(docItem.document_id);
        if (!isMounted) return;

        setPages(res.pages || []);
        setTotalPages(res.total_pages || (res.pages ? res.pages.length : 0));
        setTotalCharacters(res.total_characters || 0);

        // Map occupations with unique local client IDs for editing
        const mappedOccs = (res.occupations || []).map((o, idx) => ({
          id: `occ_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 4)}`,
          occupation_code: String(o.occupation_code || ''),
          occupation_name: String(o.occupation_name || ''),
          source_page: o.source_page ?? null,
        }));

        setOccupations(mappedOccs);

        // If occupations were already submitted previously in DB, mark complete to enable Extract Skills
        if (res.is_already_submitted) {
          setIsSubmitted(true);
          setIsOccupationsSaved(true);
        } else {
          setIsSubmitted(false);
          setIsOccupationsSaved(false);
        }
      } catch (err) {
        if (!isMounted) return;
        setFetchError(
          err.message ||
            'Failed to extract text from the PDF document. It may be empty or scanned.'
        );
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadExtractionData();

    // Fetch allowlisted models from backend
    getGeminiModels()
      .then((res) => {
        if (isMounted && res && res.models && res.models.length > 0) {
          setAvailableModels(res.models);
        }
      })
      .catch((err) => {
        console.warn('Could not load Gemini models from backend, using defaults:', err);
      });

    // Check if an extraction job is active or completed for this document
    getDocumentExtractionStatus(docItem.document_id)
      .then((statusRes) => {
        if (!isMounted) return;
        const latest = statusRes?.latest_job;
        if (latest) {
          const mName = latest.summary_data?.selected_model || latest.selected_model;
          const mKey = latest.summary_data?.model_key || latest.model_key;
          const extMethod = latest.summary_data?.extraction_method || latest.extraction_method;
          if (mName) setActiveJobModelDisplayName(mName);
          if (extMethod) setActiveJobExtractionMethod(extMethod);
          if (mKey) setSelectedModel(mKey);

          if (latest.status === 'in_progress' || latest.status === 'running') {
            setIsExtractingSkills(true);
            setExtractionJobId(latest.job_id);
            setActiveTab('skills');
            startPollingJob(latest.job_id, mName, extMethod);
          } else if (
            (latest.status === 'completed' || latest.status === 'completed_with_warnings' || latest.status === 'done') &&
            latest.extraction_data &&
            latest.extraction_data.length > 0
          ) {
            setIsSkillsExtracted(true);
            const rawSkills = latest.extraction_data || [];
            const mappedSkills = rawSkills.map((s, idx) => ({
              temp_id: s.temp_id || `skill_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 4)}`,
              skill_name: String(s.skill_name || ''),
              skill_type: String(s.skill_type || 'tool').toLowerCase(),
              skill_category: String(s.skill_category || ''),
              description: String(s.description || ''),
              depth_cue: String(s.depth_cue || ''),
              raw_phrase: String(s.raw_phrase || ''),
              evidence_quote: String(s.evidence_quote || ''),
              page_number: s.page_number ?? 1,
              verified_page_number: s.verified_page_number ?? s.page_number ?? 1,
              quote_validation_status: String(s.quote_validation_status || 'exact_page_match'),
              section_name: String(s.section_name || ''),
              confidence_score: typeof s.confidence_score === 'number' ? s.confidence_score : (s.confidence ?? 0.0),
              aliases: Array.isArray(s.aliases) ? s.aliases : [],
              extraction_method: s.extraction_method || extMethod || `llm/${mKey || 'gemini-3.1-flash-lite'}/v2`,
            }));
            setExtractedSkills(mappedSkills);
          }
        }
      })
      .catch((err) => {
        console.warn('Could not check extraction status:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [docItem.document_id]);

  // Handle Input Changes for Occupations (Part 3)
  const handleOccupationChange = (id, field, value) => {
    setOccupations((prev) =>
      prev.map((occ) => (occ.id === id ? { ...occ, [field]: value } : occ))
    );
    setValidationErrors((prev) => {
      if (!prev[id]) return prev;
      const updated = { ...prev };
      delete updated[id]?.[field];
      return updated;
    });
    setSubmitError(null);
    setIsOccupationsSaved(false);
  };

  // Add a new empty occupation row (Part 3)
  const handleAddOccupation = () => {
    const newId = `occ_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    setOccupations((prev) => [
      ...prev,
      {
        id: newId,
        occupation_code: '',
        occupation_name: '',
        source_page: null,
      },
    ]);
    setSubmitError(null);
    setIsOccupationsSaved(false);
  };

  // Remove an occupation row (Part 3)
  const handleRemoveOccupation = (id) => {
    setOccupations((prev) => prev.filter((occ) => occ.id !== id));
    setValidationErrors((prev) => {
      const updated = { ...prev };
      delete updated[id];
      return updated;
    });
    setSubmitError(null);
    setIsOccupationsSaved(false);
  };

  // Validate occupations before submission (Part 3)
  const validateForm = () => {
    const errors = {};
    let hasError = false;

    if (occupations.length === 0) {
      setSubmitError('At least one occupation or target role must be listed.');
      return false;
    }

    const seenCodes = new Set();

    occupations.forEach((occ, idx) => {
      const rowErrors = {};
      const code = String(occ.occupation_code || '').trim();
      const name = String(occ.occupation_name || '').trim();

      if (!code) {
        rowErrors.occupation_code = 'Occupation Code is required.';
        hasError = true;
      } else if (code.length > 50) {
        rowErrors.occupation_code = 'Max 50 characters allowed.';
        hasError = true;
      } else if (seenCodes.has(code.toLowerCase())) {
        rowErrors.occupation_code = 'Duplicate code in table.';
        hasError = true;
      } else {
        seenCodes.add(code.toLowerCase());
      }

      if (name.length > 255) {
        rowErrors.occupation_name = 'Max 255 characters allowed.';
        hasError = true;
      }

      if (Object.keys(rowErrors).length > 0) {
        errors[occ.id] = rowErrors;
      }
    });

    setValidationErrors(errors);

    if (hasError) {
      setSubmitError(
        'Please correct the highlighted errors in the occupation table before submitting.'
      );
      return false;
    }

    return true;
  };

  // Submit Occupations to Backend (Part 3)
  const handleSubmitOccupations = async () => {
    if (isSubmitting || (isSubmitted && isOccupationsSaved)) return;
    setSubmitError(null);
    setSubmitSuccess(null);

    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const payload = occupations.map((occ) => ({
        occupation_code: String(occ.occupation_code).trim(),
        occupation_name: String(occ.occupation_name).trim(),
        source_page: occ.source_page ?? null,
      }));

      const res = await saveDocumentOccupationsBatch(
        docItem.document_id,
        payload
      );

      setSubmitSuccess(
        res.message || 'Occupations and associations saved successfully!'
      );
      setIsSubmitted(true);
      setIsOccupationsSaved(true);

      if (onSuccess) onSuccess();
    } catch (err) {
      setSubmitError(err.message || 'Failed to save occupations. Please retry.');
      setIsOccupationsSaved(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  // =========================================================================
  // PART 4: GEMINI SKILL EXTRACTION & REVIEW HANDLERS
  // =========================================================================

  const handleStartSkillExtraction = async () => {
    if (!isSubmitted) return;

    if (!selectedModel) {
      setActiveTab('skills');
      setExtractionError('Please select an AI extraction model before starting.');
      return;
    }

    // Switch to skills tab immediately
    setActiveTab('skills');
    setIsExtractingSkills(true);
    setExtractionError(null);
    setExtractionProgress({
      windows_done: 0,
      total_windows: 0,
      current_step: 'Initiating AI skill extraction...',
    });

    try {
      const chosenModelObj = availableModels.find((m) => m.model_key === selectedModel);
      const chosenName = chosenModelObj?.display_name || selectedModel;
      setActiveJobModelDisplayName(chosenName);

      // Start skill extraction background job with admin-selected model
      const startRes = await startSkillExtraction(docItem.document_id, false, selectedModel);
      const jobId = startRes.job_id;
      setExtractionJobId(jobId);

      const jobModelName = startRes.selected_model || chosenName;
      const jobExtMethod = startRes.extraction_method;
      setActiveJobModelDisplayName(jobModelName);
      if (jobExtMethod) setActiveJobExtractionMethod(jobExtMethod);

      startPollingJob(jobId, jobModelName, jobExtMethod);
    } catch (err) {
      setIsExtractingSkills(false);
      setExtractionError(
        err.message || 'Failed to start skill extraction. Please retry.'
      );
    }
  };

  // Update a single skill field in the editable review state
  const handleSkillChange = (tempId, field, value) => {
    setExtractedSkills((prev) =>
      prev.map((skill) => {
        if (skill.temp_id !== tempId) return skill;
        return {
          ...skill,
          [field]: value,
        };
      })
    );
    setIsSkillsSaved(false);
    setSaveSkillsError(null);
  };

  // Remove a skill completely from the review state
  const handleRemoveSkill = (tempId) => {
    setExtractedSkills((prev) => prev.filter((skill) => skill.temp_id !== tempId));
    setIsSkillsSaved(false);
    setSaveSkillsError(null);
  };

  // Part 5: Save Reviewed Skills and Evidence to Database
  const handleSaveSkills = async () => {
    if (isSavingSkills || isSkillsSaved) return;
    setSaveSkillsError(null);
    setSaveSkillsSuccess(null);

    if (extractedSkills.length === 0) {
      setSaveSkillsError('No skills available to save.');
      return;
    }

    // Client-side pre-validation
    let hasValidationError = false;
    for (let i = 0; i < extractedSkills.length; i++) {
      const s = extractedSkills[i];
      if (!s.skill_name || !s.skill_name.trim()) {
        setSaveSkillsError(`Skill #${i + 1} has an empty skill name. Please provide a name.`);
        hasValidationError = true;
        break;
      }
      if (!s.evidence_quote || !s.evidence_quote.trim()) {
        setSaveSkillsError(`Skill #${i + 1} ('${s.skill_name}') is missing supporting evidence.`);
        hasValidationError = true;
        break;
      }
    }

    if (hasValidationError) return;

    setIsSavingSkills(true);
    try {
      const res = await saveDocumentSkills(docItem.document_id, extractedSkills);
      setIsSkillsSaved(true);
      setSaveSummary(res);
      setSaveSkillsSuccess(
        `Skills and evidence saved successfully! (${res.new_skills_created || 0} new skills created, ${res.reused_skills_count || 0} canonical skills reused, ${res.evidence_inserted || 0} evidence rows saved).`
      );

      // Trigger parent file list refresh
      if (onSuccess) onSuccess();
    } catch (err) {
      setSaveSkillsError(err.message || 'Failed to save skills and evidence. Please retry.');
    } finally {
      setIsSavingSkills(false);
    }
  };

  // Handle Re-Extract: Return to the Extract Skills (model selection) page
  const handleReExtract = () => {
    setActiveTab('skills');
    setIsSkillsExtracted(false);
    setIsSkillsSaved(false);
    setSaveSkillsSuccess(null);
    setSaveSkillsError(null);
    setExtractionError(null);
  };

  // Filter skills by search query and skill_type
  const filteredSkills = extractedSkills.filter((skill) => {
    if (skillTypeFilter !== 'all' && skill.skill_type !== skillTypeFilter) {
      return false;
    }
    if (skillSearchQuery.trim()) {
      const q = skillSearchQuery.trim().toLowerCase();
      const inName = skill.skill_name?.toLowerCase().includes(q);
      const inCategory = skill.skill_category?.toLowerCase().includes(q);
      const inDesc = skill.description?.toLowerCase().includes(q);
      const inPhrase = skill.raw_phrase?.toLowerCase().includes(q);
      const inEvidence = skill.evidence_quote?.toLowerCase().includes(q);
      const inAliases = (skill.aliases || []).some((a) => a.toLowerCase().includes(q));
      return inName || inCategory || inDesc || inPhrase || inEvidence || inAliases;
    }
    return true;
  });

  // Calculate counts for filters
  const skillCountsByType = {
    all: extractedSkills.length,
    tool: extractedSkills.filter((s) => s.skill_type === 'tool').length,
    technique: extractedSkills.filter((s) => s.skill_type === 'technique').length,
    concept: extractedSkills.filter((s) => s.skill_type === 'concept').length,
    domain_knowledge: extractedSkills.filter((s) => s.skill_type === 'domain_knowledge').length,
  };

  if (typeof window === 'undefined' || !window.document?.body) {
    return null;
  }

  // Filter pages for Complete Extracted Text tab
  const filteredPages = pages.filter((page) => {
    if (
      selectedPageFilter !== 'all' &&
      page.page_number !== Number(selectedPageFilter)
    ) {
      return false;
    }
    if (textSearchQuery.trim()) {
      return (
        page.text
          ?.toLowerCase()
          .includes(textSearchQuery.trim().toLowerCase()) ||
        String(page.page_number).includes(textSearchQuery.trim())
      );
    }
    return true;
  });

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl max-h-[94vh] flex flex-col rounded-3xl border border-[#850E35]/60 shadow-2xl text-left overflow-hidden bg-[#18030C]">
        {/* =========================================================
            1. MODAL TOP HEADER
        ========================================================== */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[#850E35]/40 shrink-0 bg-[#200410]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#850E35] to-[#C73659] text-white shadow-md">
              <Sparkles size={20} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-bold text-white tracking-wide truncate">
                  Extraction & Skill Review
                </h3>
              </div>
              <p className="text-xs text-[#FFBAC7]/70 truncate font-mono mt-0.5">
                {docItem.document_name}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-[#FFBAC7]/60 hover:text-white hover:bg-[#36081B] transition-colors cursor-pointer shrink-0 ml-3"
            title="Close Review"
          >
            <X size={18} />
          </button>
        </div>

        {/* =========================================================
            2. THREE-TAB SWITCHER BAR
        ========================================================== */}
        <div className="flex items-center justify-between px-5 pt-3 border-b border-[#850E35]/30 bg-[#16020A] shrink-0 overflow-x-auto">
          <div className="flex items-center gap-2">

          {/* Tab 1: Complete Extracted Text (Part 3) */}
            <button
              type="button"
              onClick={() => setActiveTab('text')}
              className={`flex items-center gap-2 px-4 py-2.5 border-b-2 text-xs sm:text-sm font-bold tracking-wide transition-colors cursor-pointer ${
                activeTab === 'text'
                  ? 'border-[#C73659] text-white bg-[#220412]/50 rounded-t-lg'
                  : 'border-transparent text-[#FFBAC7]/60 hover:text-[#FFBAC7] hover:bg-[#200410]/30 rounded-t-lg'
              }`}
            >
              <FileText size={15} />
              <span>Complete Extracted Text</span>
              <span className="px-2 py-0.5 rounded-full bg-[#36081B] text-[11px] font-mono text-[#FFA8B8]">
                {totalPages} pgs
              </span>
            </button>
          </div>
            {/* Tab 2: Occupation / Role (Part 3) */}
            <button
              type="button"
              onClick={() => setActiveTab('occupations')}
              className={`flex items-center gap-2 px-4 py-2.5 border-b-2 text-xs sm:text-sm font-bold tracking-wide transition-colors cursor-pointer ${
                activeTab === 'occupations'
                  ? 'border-[#C73659] text-white bg-[#220412]/50 rounded-t-lg'
                  : 'border-transparent text-[#FFBAC7]/60 hover:text-[#FFBAC7] hover:bg-[#200410]/30 rounded-t-lg'
              }`}
            >
              <Briefcase size={15} />
              <span>Occupation / Role</span>
              <span className="px-2 py-0.5 rounded-full bg-[#36081B] text-[11px] font-mono text-[#FFA8B8]">
                {occupations.length}
              </span>
            </button>

          {/* Tab 3: Extracted Skills (Part 4) */}
            <button
              type="button"
              onClick={() => setActiveTab('skills')}
              className={`flex items-center gap-2 px-4 py-2.5 border-b-2 text-xs sm:text-sm font-bold tracking-wide transition-colors cursor-pointer ${
                activeTab === 'skills'
                  ? 'border-[#F5C563] text-white bg-[#220412]/50 rounded-t-lg'
                  : 'border-transparent text-[#FFBAC7]/60 hover:text-[#FFBAC7] hover:bg-[#200410]/30 rounded-t-lg'
              }`}
            >
              <Sparkles
                size={15}
                className={isExtractingSkills ? 'text-[#F5C563]' : ''}
              />
              <span>Skill Extraction</span>
              <span className="px-2 py-0.5 rounded-full bg-[#36081B] text-[11px] font-mono text-[#F5C563]">
                {isExtractingSkills ? '...' : extractedSkills.length}
              </span>
            </button>

          {/* Submission / Extraction Status Pill */}
          <div className="hidden sm:flex items-center gap-2 pb-2">
            {isSkillsExtracted ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 text-xs font-semibold">
                <CheckCircle2 size={13} className="text-emerald-400" />
                {extractedSkills.length} Skills Extracted
              </span>
            ) : isSubmitted ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-950/60 border border-amber-500/40 text-amber-200 text-xs font-medium">
                Occupations Saved
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#200410] border border-[#850E35]/50 text-[#FFBAC7]/60 text-xs">
                Pending Occupation Submit
              </span>
            )}
          </div>
        </div>

        {/* =========================================================
            3. MAIN CONTENT BODY (TABS)
        ========================================================== */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* Loading Initial State (Part 3) */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center p-14 space-y-4 text-center">
              <Loader2 size={36} className="text-[#C73659] animate-spin" />
              <div className="space-y-1">
                <p className="text-sm font-bold text-white">
                  Extracting PDF text & identifying occupations...
                </p>
                <p className="text-xs text-[#FFBAC7]/60">
                  Parsing pages with PyMuPDF and executing deterministic section
                  matching without LLM.
                </p>
              </div>
            </div>
          )}

          {/* Initial Fetch Error State */}
          {!isLoading && fetchError && (
            <div className="rounded-2xl border border-rose-500/50 bg-rose-950/80 p-6 space-y-3">
              <div className="flex items-center gap-2.5 text-rose-200 font-bold text-sm">
                <AlertCircle size={18} className="text-rose-400 shrink-0" />
                <span>Text Extraction Failed</span>
              </div>
              <p className="text-xs text-rose-200/90 leading-relaxed font-mono">
                {fetchError}
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 rounded-xl bg-rose-900/60 hover:bg-rose-900 border border-rose-500/50 text-xs font-bold text-white transition-colors cursor-pointer"
                >
                  Reload Document
                </button>
              </div>
            </div>
          )}

          {!isLoading && !fetchError && (
            <>
              {/* Global Error/Success Alerts */}
              {submitError && (
                <div className="flex items-center gap-2.5 p-3.5 rounded-xl border border-rose-500/50 bg-rose-950/80 text-rose-200 text-xs font-medium animate-in fade-in duration-200">
                  <AlertCircle size={16} className="text-rose-400 shrink-0" />
                  <span>{submitError}</span>
                </div>
              )}

              {submitSuccess && (
                <div className="flex items-center gap-2.5 p-3.5 rounded-xl border border-emerald-500/50 bg-emerald-950/80 text-emerald-200 text-xs font-medium animate-in fade-in duration-200">
                  <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                  <span>{submitSuccess}</span>
                </div>
              )}

              {/* =====================================================
                  TAB 1: EXTRACTED SKILLS (PART 4 & PART 5)
              ====================================================== */}
              {activeTab === 'skills' && (
                <div className="space-y-4">
                  {/* Save Skills Success Alert (Part 5) */}
                  {saveSkillsSuccess && (
                    <div className="flex items-center gap-2.5 p-3.5 rounded-xl border border-emerald-500/50 bg-emerald-950/80 text-emerald-200 text-xs font-medium animate-in fade-in duration-200">
                      <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                      <span>{saveSkillsSuccess}</span>
                    </div>
                  )}

                  {/* Save Skills Error Alert (Part 5) */}
                  {saveSkillsError && (
                    <div className="flex items-center gap-2.5 p-3.5 rounded-xl border border-rose-500/50 bg-rose-950/80 text-rose-200 text-xs font-medium animate-in fade-in duration-200">
                      <AlertCircle size={16} className="text-rose-400 shrink-0" />
                      <span>{saveSkillsError}</span>
                    </div>
                  )}

                  {/* State 1: In-Flight Skill Extraction Progress */}
                  {isExtractingSkills && (
                    <div className="p-8 rounded-3xl bg-[#200410] border border-[#F5C563]/40 space-y-6 text-center shadow-xl">
                      <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-2xl bg-gradient-to-br from-[#F5C563] to-[#D99B26] text-[#2B0712] shadow-lg ">
                        <RotateCw
                          size={30}
                          className={isExtractingSkills ? 'animate-spin text-[#200410]' : ''}
                        />
                      </div>

                      <div className="space-y-2 max-w-lg mx-auto">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#36081B] border border-[#F5C563]/40 text-[#F5C563] text-xs font-semibold mx-auto">
                          <Brain size={13} />
                          <span>Active Model: <strong>{activeJobModelDisplayName || availableModels.find((m) => m.model_key === selectedModel)?.display_name || 'AI Model'}</strong></span>
                        </div>
                        <h4 className="text-base font-bold text-white tracking-wide">
                          Extracting Technical Skills
                        </h4>
                        <p className="text-xs text-[#FFBAC7]/70 leading-relaxed font-mono">
                          {extractionProgress.current_step ||
                            'Analyzing PDF page windows and verifying source evidence...'}
                        </p>
                      </div>

                      {/* Progress Bar */}
                      <div className="max-w-md mx-auto space-y-2">
                        <div className="h-2.5 w-full bg-[#120208] rounded-full overflow-hidden border border-[#850E35]/40 p-0.5">
                          <div
                            className="h-full bg-gradient-to-r from-[#F5C563] to-[#E8B145] rounded-full transition-all duration-300 shadow-sm"
                            style={{
                              width: `${
                                extractionProgress.total_windows > 0
                                  ? Math.min(
                                      100,
                                      Math.round(
                                        (extractionProgress.windows_done /
                                          extractionProgress.total_windows) *
                                          100
                                      )
                                    )
                                  : 10
                              }%`,
                            }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[11px] font-mono text-[#FFBAC7]/60">
                          <span>
                            Window {extractionProgress.windows_done} of{' '}
                            {extractionProgress.total_windows || '?'}
                          </span>
                          <span>
                            {extractionProgress.total_windows > 0
                              ? `${Math.round(
                                  (extractionProgress.windows_done /
                                    extractionProgress.total_windows) *
                                    100
                                )}%`
                              : 'Starting...'}
                          </span>
                        </div>
                      </div>

                      <p className="text-[11px] text-[#FFBAC7]/50 italic">
                        Model locked for this extraction job. Preserving exact quotations, character matching, and confidence.
                      </p>
                    </div>
                  )}

                  {/* State 2: Extraction Failure with Retry Button */}
                  {!isExtractingSkills && extractionError && (
                    <div className="rounded-2xl border border-rose-500/50 bg-rose-950/80 p-6 space-y-3 text-left">
                      <div className="flex items-center gap-2.5 text-rose-200 font-bold text-sm">
                        <AlertCircle size={18} className="text-rose-400 shrink-0" />
                        <span>Skill Extraction Error</span>
                      </div>
                      <p className="text-xs text-rose-200/90 leading-relaxed font-mono">
                        {extractionError}
                      </p>
                      <div className="pt-2 flex items-center gap-3">
                        <button
                          type="button"
                          onClick={handleStartSkillExtraction}
                          className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#F5C563] to-[#D99B26] hover:brightness-105 text-[#2B0712] text-xs font-bold transition-all cursor-pointer shadow-md"
                        >
                          Retry Skill Extraction
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveTab('occupations')}
                          className="px-4 py-2 rounded-xl bg-[#200410] border border-[#850E35]/60 hover:bg-[#36081B] text-xs font-semibold text-white transition-colors cursor-pointer"
                        >
                          Review Occupations
                        </button>
                      </div>
                    </div>
                  )}

                  {/* State 3: Admin-Selectable Multi-Model AI Extraction */}
                  {!isExtractingSkills && !extractionError && !isSkillsExtracted && (
                    <div className="p-6 sm:p-8 rounded-3xl bg-[#200410] border border-[#850E35]/40 space-y-6 text-left shadow-lg">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#850E35]/40 pb-5">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-white font-bold text-base">
                            <Cpu size={18} className="text-[#F5C563]" />
                            <h4>Select AI Extraction Model</h4>
                          </div>
                          <p className="text-xs text-[#FFBAC7]/70">
                            Select one of the supported AI models below before starting technical skill extraction.
                          </p>
                        </div>
                      </div>

                      {/* 3 Selectable Radio Cards */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                        {availableModels.map((model) => {
                          const isSelected = selectedModel === model.model_key;
                          const providerName =
                            model.provider ||
                            (model.model_id?.startsWith('openai') ? 'Groq' : 'Google Gemini');
                          return (
                            <div
                              key={model.model_key}
                              onClick={() => {
                                if (!isExtractingSkills) {
                                  setSelectedModel(model.model_key);
                                  setExtractionError(null);
                                }
                              }}
                              className={`relative flex flex-col justify-between p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer select-none ${
                                isSelected
                                  ? 'bg-gradient-to-b from-[#3D0A1E] to-[#260513] border-[#F5C563] shadow-lg shadow-[#F5C563]/10 ring-1 ring-[#F5C563]'
                                  : 'bg-[#18030C]/90 hover:bg-[#250514] border-[#850E35]/40 hover:border-[#C73659]/70 text-[#FFBAC7]/70'
                              }`}
                            >
                              <div className="space-y-2.5">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    {(() => {
                                      if (!model.tag) return null;
                                      const raw = String(model.tag).trim();
                                      const parenMatches = raw.match(/\(([^)]+)\)/g);
                                      const tagList = parenMatches && parenMatches.length > 0
                                        ? parenMatches.map((m) => m.replace(/[()]/g, '').trim())
                                        : [raw.replace(/[()]/g, '').trim()];

                                      return tagList.map((tagText, tIdx) => {
                                        const isPrimaryDefault = /primary|default/i.test(tagText);
                                        const isMostReliable = /reliable/i.test(tagText);
                                        const isFaster = /fast/i.test(tagText);
                                        const isStandard = /standard/i.test(tagText);

                                        let colorClass = 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300';
                                        if (isPrimaryDefault) {
                                          colorClass = 'bg-[#F5C563]/20 border-[#F5C563]/60 text-[#F5C563]';
                                        } else if (isMostReliable) {
                                          colorClass = 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300';
                                        } else if (isFaster) {
                                          colorClass = 'bg-purple-500/20 border-purple-500/50 text-purple-300';
                                        } else if (isStandard) {
                                          colorClass = 'bg-sky-500/20 border-sky-500/50 text-sky-300';
                                        }

                                        return (
                                          <span
                                            key={tIdx}
                                            className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md border ${colorClass}`}
                                          >
                                            {tagText}
                                          </span>
                                        );
                                      });
                                    })()}
                                  </div>
                                  <div
                                    className={`h-4 w-4 rounded-full border flex items-center justify-center transition-all ${
                                      isSelected
                                        ? 'border-[#F5C563] bg-[#F5C563]'
                                        : 'border-[#FFBAC7]/40 bg-[#120208]'
                                    }`}
                                  >
                                    {isSelected && (
                                      <div className="h-1.5 w-1.5 rounded-full bg-[#200410]" />
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center gap-3 pt-0.5">
                                  <div className="w-8 h-8 rounded-xl bg-[#260514] border border-[#850E35]/50 flex items-center justify-center p-1.5 shrink-0 shadow-inner">
                                    <img
                                      src={getProviderLogo(model)}
                                      alt={getProviderAlt(model)}
                                      className="w-full h-full object-contain"
                                      loading="lazy"
                                    />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <h5
                                      className={`text-sm font-bold tracking-wide transition-colors truncate ${
                                        isSelected ? 'text-white' : 'text-[#FFBAC7]'
                                      }`}
                                    >
                                      {model.display_name}
                                    </h5>
                                    <p className="text-[11px] font-mono text-[#FFBAC7]/50 mt-0.5 truncate">
                                      {model.model_id}
                                    </p>
                                  </div>
                                </div>

                                <p className="text-xs text-[#FFBAC7]/70 leading-relaxed">
                                  {model.description}
                                </p>
                              </div>

                              <div className="pt-4 mt-3 border-t border-[#850E35]/30 flex items-center justify-between text-[11px]">
                                <span
                                  className={
                                    isSelected
                                      ? 'text-[#F5C563] font-semibold'
                                      : 'text-[#FFBAC7]/40'
                                  }
                                >
                                  {isSelected ? 'Selected Model' : 'Click to Select'}
                                </span>
                                {isSelected && <Check size={14} className="text-[#F5C563]" />}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Informative Selection Status Banner */}
                      {!selectedModel ? (
                        <div className="flex items-center gap-2 p-3 rounded-xl bg-[#2E0818]/70 border border-[#850E35]/50 text-xs text-[#FFA8B8]">
                          <Info size={15} className="text-[#F5C563] shrink-0" />
                          <span>
                            Please select one of the AI models above to unlock skill extraction. No model is preselected by default.
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-[#2D0717] border border-[#F5C563]/40 text-xs text-[#F5C563]">
                          <div className="flex items-center gap-2">
                            <img
                              src={getProviderLogo(availableModels.find((m) => m.model_key === selectedModel))}
                              alt=""
                              aria-hidden="true"
                              className="w-4 h-4 object-contain shrink-0"
                            />
                            <span>
                              Ready to extract with{' '}
                              <strong>
                                {
                                  availableModels.find(
                                    (m) => m.model_key === selectedModel
                                  )?.display_name
                                }
                              </strong>
                            </span>
                          </div>
                          <span className="font-mono text-[11px] text-[#FFBAC7]/70">
                            llm/
                            {
                              availableModels.find((m) => m.model_key === selectedModel)
                                ?.model_id
                            }
                            /v2
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* State 4: Extraction Succeeded - Editable Review Interface */}
                  {!isExtractingSkills && isSkillsExtracted && (
                    <div className="space-y-4">
                      {/* Filter & Search Bar */}
                      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 p-3.5 rounded-2xl bg-[#200410] border border-[#850E35]/40 text-xs">
                        {/* Search Input */}
                        <div className="relative flex-1">
                          <Search
                            size={14}
                            className="absolute left-3 top-2.5 text-[#FFBAC7]/50 pointer-events-none"
                          />
                          <input
                            type="text"
                            value={skillSearchQuery}
                            onChange={(e) => setSkillSearchQuery(e.target.value)}
                            placeholder="Filter skills by name, evidence, category, or alias..."
                            className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-[#140209] border border-[#850E35]/40 text-white placeholder:text-[#FFBAC7]/40 text-xs focus:outline-none focus:border-[#C73659]"
                          />
                        </div>

                        {/* Type Filter Pills */}
                        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
                          {[
                            { key: 'all', label: 'All', count: skillCountsByType.all },
                            { key: 'tool', label: 'Tool', count: skillCountsByType.tool },
                            { key: 'technique', label: 'Technique', count: skillCountsByType.technique },
                            { key: 'concept', label: 'Concept', count: skillCountsByType.concept },
                            { key: 'domain_knowledge', label: 'Domain', count: skillCountsByType.domain_knowledge },
                          ].map((t) => (
                            <button
                              key={t.key}
                              type="button"
                              onClick={() => setSkillTypeFilter(t.key)}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                                skillTypeFilter === t.key
                                  ? 'bg-[#C73659] text-white shadow-sm'
                                  : 'bg-[#18030C] text-[#FFBAC7]/60 hover:text-white border border-[#850E35]/40'
                              }`}
                            >
                              {t.label}{' '}
                              <span className="opacity-75 font-mono text-[10px]">
                                ({t.count})
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Review State Summary Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1 text-xs text-[#FFBAC7]/70">
                        <span>
                          Showing <strong className="text-white">{filteredSkills.length}</strong> of{' '}
                          <strong className="text-white">{extractedSkills.length}</strong> extracted skills
                        </span>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#36081B] border border-[#F5C563]/50 text-[#F5C563] text-[11px] font-semibold">
                            <Brain size={12} />
                            <span>Extracted via {activeJobModelDisplayName || availableModels.find((m) => m.model_key === selectedModel)?.display_name || 'AI Model'}</span>
                          </span>
                          <span className="text-[11px] font-mono text-[#F5C563] bg-[#2E0818] border border-[#850E35]/50 px-2.5 py-0.5 rounded-full">
                            Temporary Review State
                          </span>
                        </div>
                      </div>

                      {/* Empty Skills State */}
                      {filteredSkills.length === 0 && (
                        <div className="p-10 rounded-2xl bg-[#200410]/70 border border-[#850E35]/30 text-center space-y-2">
                          <p className="text-sm font-semibold text-white">
                            No skills found matching your filter criteria.
                          </p>
                          <p className="text-xs text-[#FFBAC7]/50">
                            Clear your search term or switch to another skill type filter.
                          </p>
                        </div>
                      )}

                      {/* Editable Skills Cards List */}
                      <div className="space-y-4">
                        {filteredSkills.map((skill, index) => {
                          const typeBadgeColor = {
                            tool: 'bg-cyan-950/70 border-cyan-500/50 text-cyan-300',
                            technique: 'bg-emerald-950/70 border-emerald-500/50 text-emerald-300',
                            concept: 'bg-purple-950/70 border-purple-500/50 text-purple-300',
                            domain_knowledge: 'bg-amber-950/70 border-amber-500/50 text-amber-300',
                          }[skill.skill_type] || 'bg-[#36081B] border-[#850E35]/60 text-[#FFA8B8]';

                          return (
                            <div
                              key={skill.temp_id}
                              className="rounded-2xl border border-[#850E35]/50 bg-[#200410] p-4 sm:p-5 space-y-3.5 shadow-md hover:border-[#C73659]/70 transition-all text-left"
                            >
                              {/* Header Row: Skill Name, Skill Type Selector, Read-Only Confidence, Delete Action */}
                              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-[#850E35]/30">
                                <div className="flex-1 w-full flex items-center gap-2">
                                  <span className="text-xs font-mono text-[#FFBAC7]/40 w-6 shrink-0">
                                    #{index + 1}
                                  </span>
                                  <input
                                    type="text"
                                    value={skill.skill_name}
                                    onChange={(e) =>
                                      handleSkillChange(skill.temp_id, 'skill_name', e.target.value)
                                    }
                                    placeholder="Canonical Skill Name"
                                    className="flex-1 px-3 py-1.5 rounded-xl bg-[#140209] border border-[#850E35]/60 text-white font-bold text-sm tracking-wide focus:outline-none focus:border-[#C73659]"
                                  />
                                </div>

                                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                                  {/* Skill Type Dropdown (Strictly 4 Allowed Types) */}
                                  <div className="relative shrink-0">
                                    <select
                                      value={skill.skill_type}
                                      onChange={(e) =>
                                        handleSkillChange(skill.temp_id, 'skill_type', e.target.value)
                                      }
                                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border focus:outline-none cursor-pointer ${typeBadgeColor}`}
                                    >
                                      <option value="tool" className="bg-[#18030C] text-cyan-300">
                                        tool
                                      </option>
                                      <option value="technique" className="bg-[#18030C] text-emerald-300">
                                        technique
                                      </option>
                                      <option value="concept" className="bg-[#18030C] text-purple-300">
                                        concept
                                      </option>
                                      <option value="domain_knowledge" className="bg-[#18030C] text-amber-300">
                                        domain_knowledge
                                      </option>
                                    </select>
                                  </div>

                                  {/* Read-Only Confidence Score Badge */}
                                  <div
                                    title="Temporary review confidence score from LLM (Read-only)"
                                    className="px-2.5 py-1 rounded-xl bg-[#280516] border border-[#850E35]/60 text-[#F5C563] text-xs font-mono font-bold shrink-0 select-none cursor-default"
                                  >
                                    {(skill.confidence_score * 100).toFixed(1)}%
                                  </div>

                                  {/* Delete Skill Action (No approve/reject buttons) */}
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveSkill(skill.temp_id)}
                                    title="Remove this skill entirely"
                                    className="p-1.5 rounded-lg text-[#FFBAC7]/40 hover:text-rose-300 hover:bg-rose-950/60 transition-colors cursor-pointer shrink-0"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </div>

                              {/* Details Grid: Skill Category, Depth Cue, Raw Phrase */}
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div>
                                  <label className="block text-[11px] font-semibold text-[#FFBAC7]/70 mb-1">
                                    Skill Category
                                  </label>
                                  <input
                                    type="text"
                                    value={skill.skill_category || ''}
                                    onChange={(e) =>
                                      handleSkillChange(skill.temp_id, 'skill_category', e.target.value)
                                    }
                                    placeholder="e.g. Network Security"
                                    className="w-full px-3 py-1.5 rounded-xl bg-[#140209] border border-[#850E35]/40 text-xs text-[#FFA8B8] focus:outline-none focus:border-[#C73659]"
                                  />
                                </div>

                                <div>
                                  <label className="block text-[11px] font-semibold text-[#FFBAC7]/70 mb-1">
                                    Depth Cue (Action Verb)
                                  </label>
                                  <input
                                    type="text"
                                    value={skill.depth_cue || ''}
                                    onChange={(e) =>
                                      handleSkillChange(skill.temp_id, 'depth_cue', e.target.value)
                                    }
                                    placeholder="e.g. configure, implement"
                                    className="w-full px-3 py-1.5 rounded-xl bg-[#140209] border border-[#850E35]/40 text-xs text-[#FFA8B8] focus:outline-none focus:border-[#C73659]"
                                  />
                                </div>

                                <div>
                                  <label className="block text-[11px] font-semibold text-[#FFBAC7]/70 mb-1">
                                    Raw Phrase in Source
                                  </label>
                                  <input
                                    type="text"
                                    value={skill.raw_phrase || ''}
                                    onChange={(e) =>
                                      handleSkillChange(skill.temp_id, 'raw_phrase', e.target.value)
                                    }
                                    placeholder="e.g. configuring Docker containers"
                                    className="w-full px-3 py-1.5 rounded-xl bg-[#140209] border border-[#850E35]/40 text-xs text-[#FFA8B8] focus:outline-none focus:border-[#C73659]"
                                  />
                                </div>
                              </div>

                              {/* Description */}
                              <div>
                                <label className="block text-[11px] font-semibold text-[#FFBAC7]/70 mb-1">
                                  Description
                                </label>
                                <textarea
                                  rows={2}
                                  value={skill.description || ''}
                                  onChange={(e) =>
                                    handleSkillChange(skill.temp_id, 'description', e.target.value)
                                  }
                                  placeholder="Brief technical description of what this skill entails..."
                                  className="w-full px-3 py-1.5 rounded-xl bg-[#140209] border border-[#850E35]/40 text-xs text-white/90 focus:outline-none focus:border-[#C73659] leading-relaxed resize-y"
                                />
                              </div>

                              {/* Aliases */}
                              <div>
                                <label className="block text-[11px] font-semibold text-[#FFBAC7]/70 mb-1">
                                  Aliases (comma-separated acronyms / technical synonyms)
                                </label>
                                <input
                                  type="text"
                                  value={(skill.aliases || []).join(', ')}
                                  onChange={(e) => {
                                    const parsed = e.target.value
                                      .split(',')
                                      .map((a) => a.trim())
                                      .filter(Boolean);
                                    handleSkillChange(skill.temp_id, 'aliases', parsed);
                                  }}
                                  placeholder="e.g. K8s, Kube, Container Orchestration"
                                  className="w-full px-3 py-1.5 rounded-xl bg-[#140209] border border-[#850E35]/40 text-xs text-[#FFA8B8] focus:outline-none focus:border-[#C73659]"
                                />
                              </div>

                              {/* Supporting Evidence Quote & Verification Status */}
                              <div className="space-y-1.5 pt-1">
                                <div className="flex items-center justify-between text-[11px]">
                                  <label className="font-semibold text-[#FFBAC7]/70">
                                    Supporting Evidence Quote
                                  </label>

                                  {/* Verification Status Pill */}
                                  {skill.quote_validation_status === 'page_mismatch' ||
                                  (skill.verified_page_number &&
                                    skill.verified_page_number !== skill.page_number) ? (
                                    <span className="inline-flex items-center gap-1 text-amber-300 font-mono text-[10px] bg-amber-950/60 border border-amber-500/40 px-2 py-0.5 rounded-md">
                                      <Info size={11} />
                                      Stated: p.{skill.page_number} → Verified: p.{skill.verified_page_number}
                                    </span>
                                  ) : skill.quote_validation_status === 'exact_page_match' ? (
                                    <span className="inline-flex items-center gap-1 text-emerald-300 font-mono text-[10px] bg-emerald-950/60 border border-emerald-500/40 px-2 py-0.5 rounded-md">
                                      <CheckCircle2 size={11} />
                                      Verified on p.{skill.page_number}
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-rose-300 font-mono text-[10px] bg-rose-950/60 border border-rose-500/40 px-2 py-0.5 rounded-md">
                                      <AlertCircle size={11} />
                                      Quote unverified in text
                                    </span>
                                  )}
                                </div>

                                <textarea
                                  rows={2}
                                  value={skill.evidence_quote}
                                  onChange={(e) =>
                                    handleSkillChange(skill.temp_id, 'evidence_quote', e.target.value)
                                  }
                                  placeholder="Exact contiguous quotation from source PDF..."
                                  className="w-full px-3 py-1.5 rounded-xl bg-[#120208] border border-[#850E35]/50 text-xs text-white font-mono leading-relaxed focus:outline-none focus:border-[#C73659] resize-y"
                                />
                              </div>

                              {/* Source Page & Section Name */}
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                                <div>
                                  <label className="block text-[11px] font-semibold text-[#FFBAC7]/70 mb-1">
                                    Source Page
                                  </label>
                                  <input
                                    type="number"
                                    min={1}
                                    max={totalPages || 999}
                                    value={skill.page_number}
                                    onChange={(e) =>
                                      handleSkillChange(
                                        skill.temp_id,
                                        'page_number',
                                        Number(e.target.value) || 1
                                      )
                                    }
                                    className="w-full px-3 py-1.5 rounded-xl bg-[#140209] border border-[#850E35]/40 text-xs text-white font-mono focus:outline-none focus:border-[#C73659]"
                                  />
                                </div>

                                <div className="sm:col-span-2">
                                  <label className="block text-[11px] font-semibold text-[#FFBAC7]/70 mb-1">
                                    Section / NOS Name
                                  </label>
                                  <input
                                    type="text"
                                    value={skill.section_name || ''}
                                    onChange={(e) =>
                                      handleSkillChange(skill.temp_id, 'section_name', e.target.value)
                                    }
                                    placeholder="e.g. NOS 1: Network Configuration | Knowledge"
                                    className="w-full px-3 py-1.5 rounded-xl bg-[#140209] border border-[#850E35]/40 text-xs text-[#FFA8B8] focus:outline-none focus:border-[#C73659]"
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* =====================================================
                  TAB 2: COMPLETE EXTRACTED TEXT (PART 3)
              ====================================================== */}
              {activeTab === 'text' && (
                <div className="space-y-4">
                  {/* Controls Bar: Search & Page Filter */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-2xl bg-[#200410] border border-[#850E35]/40 text-xs">
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      <div className="relative flex-1 sm:w-64">
                        <Search
                          size={14}
                          className="absolute left-3 top-2.5 text-[#FFBAC7]/50 pointer-events-none"
                        />
                        <input
                          type="text"
                          value={textSearchQuery}
                          onChange={(e) => setTextSearchQuery(e.target.value)}
                          placeholder="Search in extracted text..."
                          className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-[#140209] border border-[#850E35]/40 text-white placeholder:text-[#FFBAC7]/40 text-xs focus:outline-none focus:border-[#C73659]"
                        />
                      </div>

                      <select
                        value={selectedPageFilter}
                        onChange={(e) => setSelectedPageFilter(e.target.value)}
                        className="px-3 py-1.5 rounded-xl bg-[#140209] border border-[#850E35]/40 text-xs text-[#FFA8B8] focus:outline-none focus:border-[#C73659] cursor-pointer"
                      >
                        <option value="all">All Pages ({totalPages})</option>
                        {pages.map((p) => (
                          <option key={p.page_number} value={p.page_number}>
                            Page {p.page_number} ({p.char_count} chars)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="text-[11px] font-mono text-[#FFBAC7]/60">
                      Total Characters:{' '}
                      <strong className="text-white">
                        {totalCharacters.toLocaleString()}
                      </strong>
                    </div>
                  </div>

                  {/* Page-by-page display */}
                  <div className="space-y-4 max-h-[55vh] overflow-y-auto pr-1">
                    {filteredPages.length === 0 ? (
                      <div className="p-8 rounded-2xl bg-[#200410]/60 border border-[#850E35]/30 text-center space-y-2">
                        <p className="text-sm font-semibold text-white">
                          No matching text found.
                        </p>
                        <p className="text-xs text-[#FFBAC7]/50">
                          Try searching for a different word or select 'All Pages'.
                        </p>
                      </div>
                    ) : (
                      filteredPages.map((page) => (
                        <div
                          key={page.page_number}
                          className="rounded-2xl border border-[#850E35]/40 bg-[#1F0412] overflow-hidden"
                        >
                          <div className="flex items-center justify-between px-4 py-2 border-b border-[#850E35]/30 bg-[#260516]">
                            <div className="flex items-center gap-2">
                              <span className="flex h-5 w-5 items-center justify-center rounded-md bg-[#850E35] text-[10px] font-bold text-white">
                                {page.page_number}
                              </span>
                              <span className="text-xs font-bold text-white">
                                Page {page.page_number}
                              </span>
                            </div>
                            <span className="text-[11px] font-mono text-[#FFBAC7]/60">
                              {page.char_count} chars
                            </span>
                          </div>

                          <div className="p-4 text-xs font-mono text-white/90 leading-relaxed whitespace-pre-wrap max-h-72 overflow-y-auto select-text">
                            {page.text || (
                              <span className="italic text-[#FFBAC7]/40">
                                (Empty page or no printable text detected)
                              </span>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* =====================================================
                  TAB 3: OCCUPATION / ROLE (PART 3)
              ====================================================== */}
              {activeTab === 'occupations' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-[#200410] border border-[#850E35]/40 text-xs">
                    <div className="space-y-0.5">
                      <h4 className="font-bold text-white tracking-wide">
                        Extracted Occupations & Classification Codes
                      </h4>
                      <p className="text-[11px] text-[#FFBAC7]/70">
                        {docItem.document_type === 'job_description'
                          ? 'Extracted job title/target roles for this document. Verify or add codes.'
                          : 'Deterministic extraction from Section 1, Field 14 (NCO/ISCO codes).'}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleAddOccupation}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#850E35] hover:bg-[#A81545] border border-[#C73659]/60 text-white text-xs font-bold transition-all active:scale-95 cursor-pointer shrink-0"
                    >
                      <Plus size={14} />
                      <span>Add Occupation</span>
                    </button>
                  </div>

                  {/* Occupations Table */}
                  <div className="overflow-x-auto rounded-2xl border border-[#850E35]/40 bg-[#1D0310]">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#2B0617] border-b border-[#850E35]/40 text-[#FFA8B8] font-bold uppercase tracking-wider text-[10px]">
                        <tr>
                          <th className="py-3 px-3 w-12 text-center">#</th>
                          <th className="py-3 px-4 w-44">
                            Occupation Code <span className="text-rose-400">*</span>
                          </th>
                          <th className="py-3 px-4">Occupation Name / Title</th>
                          <th className="py-3 px-3 w-16 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#850E35]/25">
                        {occupations.length === 0 ? (
                          <tr>
                            <td
                              colSpan={5}
                              className="py-8 text-center text-xs text-[#FFBAC7]/60"
                            >
                              No occupations found. Click{' '}
                              <strong className="text-white">Add Occupation</strong> to
                              insert one.
                            </td>
                          </tr>
                        ) : (
                          occupations.map((occ, idx) => {
                            const rowErrors = validationErrors[occ.id] || {};
                            return (
                              <tr
                                key={occ.id}
                                className="hover:bg-[#250414] transition-colors"
                              >
                                <td className="py-2.5 px-3 text-center text-[#FFBAC7]/50 font-mono text-[11px]">
                                  {idx + 1}
                                </td>

                                {/* Occupation Code */}
                                <td className="py-2.5 px-4 align-top">
                                  <input
                                    type="text"
                                    value={occ.occupation_code}
                                    onChange={(e) =>
                                      handleOccupationChange(
                                        occ.id,
                                        'occupation_code',
                                        e.target.value
                                      )
                                    }
                                    placeholder="e.g. 2522.0201"
                                    className={`w-full px-2.5 py-1.5 rounded-lg bg-[#140209] border text-xs font-mono font-bold text-white focus:outline-none transition-colors ${
                                      rowErrors.occupation_code
                                        ? 'border-rose-500 bg-rose-950/20'
                                        : 'border-[#850E35]/50 focus:border-[#C73659]'
                                    }`}
                                  />
                                  {rowErrors.occupation_code && (
                                    <p className="text-[10px] text-rose-400 mt-1 font-sans">
                                      {rowErrors.occupation_code}
                                    </p>
                                  )}
                                </td>

                                {/* Occupation Name */}
                                <td className="py-2.5 px-4 align-top">
                                  <input
                                    type="text"
                                    value={occ.occupation_name}
                                    onChange={(e) =>
                                      handleOccupationChange(
                                        occ.id,
                                        'occupation_name',
                                        e.target.value
                                      )
                                    }
                                    placeholder="e.g. Security Analyst (or leave empty if unresolved)"
                                    className={`w-full px-2.5 py-1.5 rounded-lg bg-[#140209] border text-xs text-white focus:outline-none transition-colors ${
                                      rowErrors.occupation_name
                                        ? 'border-rose-500 bg-rose-950/20'
                                        : 'border-[#850E35]/50 focus:border-[#C73659]'
                                    }`}
                                  />
                                  {rowErrors.occupation_name && (
                                    <p className="text-[10px] text-rose-400 mt-1 font-sans">
                                      {rowErrors.occupation_name}
                                    </p>
                                  )}
                                </td>

                                {/* Action */}
                                <td className="py-2.5 px-3 text-center align-middle">
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveOccupation(occ.id)}
                                    title="Remove this occupation row"
                                    className="p-1.5 rounded-lg text-[#FFBAC7]/40 hover:text-rose-300 hover:bg-rose-950/60 transition-colors cursor-pointer"
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* =========================================================
            4. MODAL FOOTER BAR WITH CONTEXTUAL ACTIONS
        ========================================================== */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 sm:p-5 border-t border-[#850E35]/40 bg-[#200410] shrink-0">
          {/* Status info on the left */}
          <div className="flex items-center gap-2 text-xs text-[#FFBAC7]/70">
            {activeTab === 'skills' ? (
              isSkillsSaved ? (
                <span className="flex items-center gap-1.5 text-emerald-300 font-semibold">
                  <CheckCircle2 size={14} className="text-emerald-400" />
                  <span>
                    Saved: {saveSummary?.new_skills_created ?? 0} new • {saveSummary?.reused_skills_count ?? 0} reused • {saveSummary?.evidence_inserted ?? 0} evidence
                  </span>
                </span>
              ) : isSkillsExtracted ? (
                <span className="flex items-center gap-1.5 text-[#F5C563] font-semibold">
                  <BookmarkCheck size={14} className="text-[#F5C563]" />
                  <span>Reviewing {extractedSkills.length} skills • Ready to save</span>
                </span>
              ) : isExtractingSkills ? (
                <span className="flex items-center gap-1.5 text-[#F5C563] font-semibold">
                  <Loader2 size={14} className="animate-spin text-[#F5C563]" />
                  <span>Extraction in progress...</span>
                </span>
              ) : (
                <span>Submit occupations to unlock skill extraction.</span>
              )
            ) : isSubmitted ? (
              isOccupationsSaved ? (
                <span className="flex items-center gap-1.5 text-emerald-300 font-semibold">
                  <CheckCircle2 size={14} className="text-emerald-400" />
                  <span>Occupations saved • Ready for Skill Extraction</span>
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-amber-300 font-semibold">
                  <AlertCircle size={14} className="text-amber-400" />
                  <span>Unsaved occupation changes • Ready to update</span>
                </span>
              )
            ) : (
              <span>Submit reviewed occupations to unlock Skill Extraction.</span>
            )}
          </div>

          {/* Action buttons on the right */}
          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            {activeTab === 'skills' ? (
              <>
                {!isSkillsExtracted && !isExtractingSkills ? (
                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    {extractedSkills.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setIsSkillsExtracted(true)}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#200410] border border-[#850E35]/60 hover:bg-[#36081B] text-xs font-semibold text-[#FFA8B8] hover:text-white transition-colors cursor-pointer"
                      >
                        <ArrowRight size={14} className="rotate-180" />
                        <span>Return to Current Review ({extractedSkills.length} skills)</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={handleStartSkillExtraction}
                      disabled={!isSubmitted || !selectedModel || isExtractingSkills}
                      title={
                        !isSubmitted
                          ? 'Submit reviewed occupations first'
                          : !selectedModel
                          ? 'Select an AI model above to enable extraction'
                          : `Start skill extraction with ${availableModels.find((m) => m.model_key === selectedModel)?.display_name}`
                      }
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#F5C563] via-[#E8B145] to-[#D99B26] hover:brightness-105 border border-[#FCE19C]/60 text-[#2B0712] text-xs font-extrabold tracking-wide shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Play size={15} />
                      <span>
                        {selectedModel
                          ? `Start Extraction with ${
                              availableModels.find(
                                (m) => m.model_key === selectedModel
                              )?.display_name
                            }`
                          : 'Select Model to Extract Skills'}
                      </span>
                    </button>
                  </div>
                ) : (
                  <>
                    {extractionError && (
                      <button
                        type="button"
                        onClick={handleStartSkillExtraction}
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#F5C563] to-[#D99B26] hover:brightness-105 text-[#2B0712] text-xs font-bold transition-all cursor-pointer shadow-md"
                      >
                        <RefreshCw size={14} />
                        <span>Retry Extraction</span>
                      </button>
                    )}

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleReExtract}
                        disabled={isSavingSkills || isExtractingSkills}
                        title="Return to the Extract Skills page to select a model and re-run extraction"
                        className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-[#850E35]/60 bg-[#200410] hover:bg-[#36081B] text-[#FFA8B8] hover:text-white text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <RotateCcw size={14} />
                        <span>Re-Extract</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleSaveSkills}
                        disabled={
                          isSavingSkills ||
                          isSkillsSaved ||
                          !isSkillsExtracted ||
                          extractedSkills.length === 0
                        }
                        title={
                          isSkillsSaved
                            ? 'All reviewed skills and evidence have been saved to the database.'
                            : 'Save reviewed skills and evidence to database'
                        }
                        className={`inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs font-extrabold tracking-wide shadow-md transition-all ${
                          isSkillsSaved
                            ? 'bg-emerald-950/70 border border-emerald-500/50 text-emerald-300 opacity-90 cursor-not-allowed pointer-events-none shadow-none'
                            : isSavingSkills
                            ? 'bg-emerald-600/80 border border-emerald-400/60 text-white opacity-70 cursor-not-allowed'
                            : 'bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:brightness-110 border border-emerald-300/60 text-slate-950 shadow-emerald-950/40 active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed'
                        }`}
                      >
                        {isSavingSkills ? (
                          <>
                            <Loader2 size={15} className="animate-spin text-white" />
                            <span>Saving Skills...</span>
                          </>
                        ) : isSkillsSaved ? (
                          <>
                            <CheckCircle2 size={15} className="text-emerald-400" />
                            <span>Saved to Database</span>
                          </>
                        ) : (
                          <>
                            <Check size={15} />
                            <span>Save Skills</span>
                          </>
                        )}
                      </button>
                    </div>
                  </>
                )}
              </>
            ) : (
              <>
                {/* Primary Action 1: Submit / Update Occupations */}
                <button
                  type="button"
                  onClick={handleSubmitOccupations}
                  disabled={
                    isSubmitting ||
                    isLoading ||
                    Boolean(fetchError) ||
                    (isSubmitted && isOccupationsSaved)
                  }
                  title={
                    isSubmitted && isOccupationsSaved
                      ? 'Occupations are saved to database. Make changes to update.'
                      : isSubmitted
                      ? 'Update occupations in database'
                      : 'Submit reviewed occupations to database'
                  }
                  className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold tracking-wide shadow-md transition-all ${
                    isSubmitted && isOccupationsSaved
                      ? 'bg-emerald-950/70 border border-emerald-500/50 text-emerald-300 opacity-90 cursor-not-allowed pointer-events-none shadow-none'
                      : isSubmitting
                      ? 'bg-[#850E35]/80 border border-[#C73659]/60 text-white opacity-70 cursor-not-allowed'
                      : 'bg-[#850E35] hover:bg-[#A81545] border border-[#C73659]/60 text-white shadow-md active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed'
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={15} className="animate-spin text-white" />
                      <span>Saving Occupations...</span>
                    </>
                  ) : isSubmitted && isOccupationsSaved ? (
                    <>
                      <CheckCircle2 size={15} className="text-emerald-400" />
                      <span>Occupations Saved</span>
                    </>
                  ) : (
                    <>
                      <Check size={15} />
                      <span>{isSubmitted ? 'Update Occupations' : 'Submit'}</span>
                    </>
                  )}
                </button>

                {/* Primary Action 2: Start Skill Extraction */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('skills');
                    if (selectedModel) {
                      handleStartSkillExtraction();
                    }
                  }}
                  disabled={!isSubmitted || isSubmitting || isExtractingSkills}
                  title={
                    !isSubmitted
                      ? 'Please Submit reviewed occupations first to enable this action'
                      : !selectedModel
                      ? 'Proceed to select AI extraction model'
                      : `Start extraction with ${availableModels.find((m) => m.model_key === selectedModel)?.display_name}`
                  }
                  className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-extrabold tracking-wide transition-all shadow-md active:scale-95 ${
                    isSubmitted
                      ? 'bg-gradient-to-r from-[#F5C563] via-[#E8B145] to-[#D99B26] hover:brightness-105 border border-[#FCE19C]/60 text-[#2B0712] cursor-pointer'
                      : 'bg-[#2E0818] border border-[#850E35]/40 text-[#FFBAC7]/40 cursor-not-allowed opacity-60'
                  }`}
                >
                  <Play
                    size={15}
                    className={isSubmitted ? 'text-[#590922]' : 'text-[#FFBAC7]/30'}
                  />
                  <span>
                    {isSubmitted && selectedModel
                      ? `Extract with ${
                          availableModels.find((m) => m.model_key === selectedModel)
                            ?.display_name
                        }`
                      : 'Start Skill Extraction'}
                  </span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>,
    window.document.body
  );
}
