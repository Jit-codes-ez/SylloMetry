import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Download,
  RefreshCw,
  Filter,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { useAdminAuth } from '@/context/AdminAuthContext';
import AdminNavbar from './AdminNavbar';
import { CardGlare } from '@/components/CardGlare';
import { Button2 } from '@/components/Button2';
import { FileTypeBadge, getReadableFileSize } from '@/components/FileUpload';
import {
  ALLOWED_INDUSTRY_CATEGORIES,
  uploadIndustryFile,
  listIndustryFiles,
  getIndustryFileDownloadUrl,
  getRegisteredIndustryDocuments,
} from '@/lib/adminAuth';
import ExtractSkillsModal from './ExtractSkillsModal';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';

// Format category values into human-readable strings (strictly 2 categories)
const CATEGORY_LABELS = {
  qualification_file: 'Qualification File',
  job_description: 'Job Description',
};

// Theme-aligned badge classes for category visualization
const CATEGORY_STYLES = {
  qualification_file: 'bg-[#3A1024] text-[#FFA8B8] border-[#850E35]/60',
  job_description: 'bg-[#290F38] text-[#E9D5FF] border-[#7E22CE]/40',
};

// Strips redundant repeated .pdf extensions (e.g., file.pdf.pdf -> file.pdf)
const cleanFileName = (filename) => {
  if (!filename) return '';
  return filename.replace(/(?:\.pdf)+$/i, '') + '.pdf';
};

export default function AdminDashboard() {
  const { admin } = useAdminAuth();

  // Upload Form State
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('qualification_file');
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSuccessDoc, setUploadSuccessDoc] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  // Stored Files List State
  const [files, setFiles] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalSizeBytes, setTotalSizeBytes] = useState(0);
  const [isLoadingFiles, setIsLoadingFiles] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Registered Documents State (used for mapping and statistics)
  const [registeredDocs, setRegisteredDocs] = useState([]);

  // Active Download Action State
  const [downloadingPath, setDownloadingPath] = useState(null);

  // Extract Skills Modal State
  const [docToExtractSkills, setDocToExtractSkills] = useState(null);

  const fileInputRef = useRef(null);
  const progressIntervalRef = useRef(null);

  // ---------------------------------------------------------------------------
  // Load stored industry files from backend API
  // ---------------------------------------------------------------------------
  const fetchFiles = useCallback(async () => {
    setIsLoadingFiles(true);
    try {
      const offset = (currentPage - 1) * pageSize;
      const res = await listIndustryFiles({
        category: categoryFilter,
        limit: pageSize,
        offset,
      });

      if (res && res.success) {
        setFiles(res.files || []);
        setTotalCount(res.total_count || 0);
        setTotalSizeBytes(res.total_size_bytes || 0);
      }
    } catch (err) {
      console.error('Failed to load stored industry files:', err);
      setErrorMessage(err.message || 'Failed to fetch stored documents from Supabase storage.');
    } finally {
      setIsLoadingFiles(false);
    }
  }, [categoryFilter, currentPage]);

  // ---------------------------------------------------------------------------
  // Load registered documents with linked occupations
  // ---------------------------------------------------------------------------
  const fetchRegisteredDocs = useCallback(async () => {
    try {
      const docs = await getRegisteredIndustryDocuments();
      setRegisteredDocs(docs || []);
    } catch (err) {
      console.error('Failed to load registered documents:', err);
    }
  }, []);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  useEffect(() => {
    fetchRegisteredDocs();
  }, [fetchRegisteredDocs]);

  // Clean up progress timer on unmount
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, []);

  // Auto-dismiss upload success notification after 3.5 seconds
  useEffect(() => {
    if (!uploadSuccessDoc) return;
    const timer = setTimeout(() => {
      setUploadSuccessDoc(null);
    }, 3500);
    return () => clearTimeout(timer);
  }, [uploadSuccessDoc]);

  // Set of registered storage paths to identify registration status in stored files table
  const registeredPathSet = new Set(registeredDocs.map((d) => d.storage_path));

  // ---------------------------------------------------------------------------
  // Drag and Drop & File Picker Handlers
  // ---------------------------------------------------------------------------
  const handleDragIn = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
  };

  const handleDragOut = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);

    const droppedFiles = e.dataTransfer?.files;
    if (droppedFiles && droppedFiles.length > 0) {
      validateAndSetFile(droppedFiles[0]);
    }
  };

  const handleFileSelect = (e) => {
    const pickedFiles = e.target?.files;
    if (pickedFiles && pickedFiles.length > 0) {
      validateAndSetFile(pickedFiles[0]);
    }
  };

  const validateAndSetFile = (file) => {
    setErrorMessage(null);
    setUploadSuccessDoc(null);

    // 1. Validate PDF extension and MIME type
    const isPdfExtension = file.name.toLowerCase().endsWith('.pdf');
    const isPdfMime = file.type === 'application/pdf' || file.type === '';

    if (!isPdfExtension || !isPdfMime) {
      setErrorMessage('Invalid file format. Only PDF documents (.pdf) are allowed.');
      return;
    }

    // 2. Validate maximum file size (5 MB limit)
    const maxBytes = 5 * 1024 * 1024;
    if (file.size > maxBytes) {
      setErrorMessage(`File size (${getReadableFileSize(file.size)}) exceeds the strict 5 MB limit.`);
      return;
    }

    // 3. Reject empty files
    if (file.size === 0) {
      setErrorMessage('The selected PDF file is empty (0 bytes).');
      return;
    }

    setSelectedFile(file);
    setUploadProgress(0);
  };

  const handleClearSelection = () => {
    setSelectedFile(null);
    setUploadProgress(0);
    setIsUploading(false);
    setErrorMessage(null);
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ---------------------------------------------------------------------------
  // Submit Upload to Backend Endpoint
  // ---------------------------------------------------------------------------
  const handleUploadSubmit = async () => {
    if (!selectedFile || isUploading) return;

    setIsUploading(true);
    setErrorMessage(null);
    setUploadProgress(15);

    progressIntervalRef.current = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressIntervalRef.current);
          return 90;
        }
        return prev + 15;
      });
    }, 150);

    try {
      const res = await uploadIndustryFile(selectedFile, selectedCategory);

      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      setUploadProgress(100);

      setUploadSuccessDoc({
        document_id: res.document_id,
        document_name: cleanFileName(res.document_name || selectedFile.name),
        document_type: res.document_type || selectedCategory,
        storage_path: res.storage_path,
        size_bytes: res.file?.size_bytes || selectedFile.size,
      });
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';

      // Refresh both stored files and registered docs
      await fetchFiles();
      await fetchRegisteredDocs();
    } catch (err) {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      setErrorMessage(err.message || 'Failed to upload document to Supabase storage.');
    } finally {
      setIsUploading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Secure Signed Download Handler (60s TTL)
  // ---------------------------------------------------------------------------
  const handleDownload = async (storagePath, displayName) => {
    setDownloadingPath(storagePath);
    try {
      const signedUrl = await getIndustryFileDownloadUrl(storagePath);
      if (!signedUrl) throw new Error('Signed URL was not returned by server.');

      const link = document.createElement('a');
      link.href = signedUrl;
      link.setAttribute('download', displayName || 'document.pdf');
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Download error:', err);
      setErrorMessage(err.message || 'Failed to obtain temporary download URL.');
    } finally {
      setDownloadingPath(null);
    }
  };



  const adminName =
    admin?.full_name?.split(' ')[0] ||
    admin?.email?.split('@')[0] ||
    'Administrator';

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1C040E] via-[#140209] to-[#0E0106] text-[#FFF5E4] pt-24 pb-16 selection:bg-[#C73659]/30 selection:text-white">
      {/* Top Fixed Admin Navigation */}
      <AdminNavbar />

      {/* Top Floating Notification (Auto-fades in 3-4 seconds) */}
      <AnimatePresence>
        {uploadSuccessDoc && (
          <div className="fixed top-24 inset-x-0 flex justify-center z-[100] pointer-events-none px-4">
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-emerald-950/95 border border-emerald-500/60 text-emerald-100 shadow-2xl backdrop-blur-md text-xs sm:text-sm font-semibold tracking-wide pointer-events-auto"
            >
              <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
              <span className="truncate max-w-sm sm:max-w-md">
                <strong>{cleanFileName(uploadSuccessDoc.document_name)}</strong> uploaded successfully!
              </span>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="mx-auto max-w-[1450px] px-4 py-7 sm:px-6 lg:px-8 lg:py-9 space-y-8">
        {/* =========================================================
            1. WELCOME BANNER & REPOSITORY STORAGE METRICS
        ========================================================== */}
        <section id="admin-welcome">
          <CardGlare
            theme="dark"
            innerClassName="bg-[#240614]/95 p-6 sm:p-8 rounded-3xl flex flex-col justify-between gap-6 md:flex-row md:items-end border border-[#850E35]/40 shadow-xl"
            className="rounded-3xl border border-[#850E35]/40 shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
          >
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white drop-shadow-sm">
                Welcome to SylloMetry Administration, {adminName}.
              </h1>

              <p className="mt-2 max-w-2xl text-xs sm:text-sm leading-relaxed text-[#FFBAC7]">
                Repository for industry curriculum datasets, qualification files, and competency benchmarks linked to national occupational standards.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <div className="px-4 py-2.5 rounded-xl bg-[#18030C] border border-[#850E35]/50 text-right min-w-[110px]">
                <p className="text-[10px] uppercase font-bold tracking-wider text-[#FFA8B8]">
                  Stored Files
                </p>
                <p className="text-xl text-center font-extrabold text-white">
                  {totalCount}
                </p>
              </div>

              <div className="px-4 py-2.5 rounded-xl bg-[#18030C] border border-[#850E35]/50 text-right min-w-[120px]">
                <p className="text-[10px] uppercase font-bold tracking-wider text-[#FFA8B8]">
                  Storage Used
                </p>
                <p className="text-xl text-center font-extrabold text-[#FFA8B8]">
                  {(totalSizeBytes / (1024 * 1024)).toFixed(2)} MB
                </p>
              </div>
            </div>
          </CardGlare>
        </section>

        {/* Global Error Notification */}
        {errorMessage && (
          <div
            role="alert"
            className="flex items-center justify-between gap-3 rounded-2xl border border-rose-500/40 bg-rose-950/80 p-4 text-xs text-rose-200 animate-in fade-in duration-200"
          >
            <div className="flex items-center gap-2.5">
              <AlertCircle size={17} className="text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="text-rose-300 hover:text-white text-xs font-bold underline cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}



        {/* =========================================================
            2. MAIN FEATURE: PDF UPLOAD INTERFACE
        ========================================================== */}
        <section id="admin-pdf-upload">
          <div className="rounded-3xl border border-[#850E35]/40 bg-[#240614]/95 p-6 sm:p-8 shadow-xl backdrop-blur-md">
            {/* Header */}
            <div className="mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#850E35] to-[#B8194E] text-white shadow-lg shadow-[#850E35]/35">
                  <UploadCloud size={22} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white drop-shadow-sm">
                    Upload Industry PDF Document
                  </h2>
                  <p className="mt-1 text-xs text-[#FFBAC7] max-w-2xl leading-relaxed">
                    Store qualification files, job descriptions, and curricula in the private bucket. Documents are strictly preserved in their original form for extraction, skill mapping, and prompt reprocessing.
                  </p>
                </div>
              </div>
            </div>

            {/* Category Selector Dropdown */}
            <div className="mb-5">
              <label htmlFor="industry-category" className="block text-xs font-bold uppercase tracking-wider text-[#FFA8B8] mb-2">
                Document Classification Category <span className="text-rose-400">*</span>
              </label>
              <div className="relative max-w-md">
                <select
                  id="industry-category"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  disabled={isUploading}
                  className="w-full appearance-none rounded-xl bg-[#18030C] border border-[#850E35]/60 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white focus:border-[#C73659] focus:outline-hidden transition-colors cursor-pointer disabled:opacity-50"
                  style={{ backgroundColor: '#18030C' }}
                >
                  {ALLOWED_INDUSTRY_CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value} className="bg-[#1C040E] text-white">
                      {cat.label}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-[#FFA8B8]">
                  <Filter size={14} />
                </div>
              </div>
            </div>

            {/* Hidden native input */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              onChange={handleFileSelect}
              className="hidden"
              id="admin-pdf-input"
            />

            {/* Velvet DropZone */}
            {!selectedFile ? (
              <div
                onDragOver={handleDragIn}
                onDragEnter={handleDragIn}
                onDragLeave={handleDragOut}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  'group relative flex flex-col items-center justify-center gap-3.5 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-all duration-200 ease-out select-none cursor-pointer',
                  isDraggingOver
                    ? 'border-[#C73659] bg-[#36081B]/80 scale-[1.006] shadow-lg shadow-[#850E35]/25'
                    : 'border-[#850E35]/50 bg-[#18030C]/70 hover:border-[#C73659] hover:bg-[#200410]'
                )}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#850E35]/50 bg-[#2D0616] text-[#E36A6A] shadow-md group-hover:scale-105 transition-transform duration-200">
                  <UploadCloud size={24} />
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-semibold text-white">
                    <span className="text-[#FFA8B8] underline underline-offset-4 hover:text-white">
                      Click to browse
                    </span>{' '}
                    or drag and drop your PDF here
                  </p>
                  <p className="text-xs text-[#FFBAC7]/70">
                    Supports official PDF documents up to 5 MB (application/pdf)
                  </p>
                </div>

                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-[#240614] border border-[#850E35]/40 text-[11px] font-medium text-[#FFBAC7]">
                  <span>Target Category:</span>
                  <span className="font-bold text-[#FFA8B8]">
                    {CATEGORY_LABELS[selectedCategory] || selectedCategory}
                  </span>
                </div>
              </div>
            ) : (
              /* Selected File Card with Progress */
              <div className="space-y-4">
                <div className="relative overflow-hidden rounded-2xl border border-[#850E35]/50 bg-[#18030C] p-4 sm:p-5 shadow-md">
                  <div
                    className="absolute inset-y-0 left-0 bg-[#850E35]/20 transition-all duration-150 ease-out pointer-events-none rounded-xl"
                    style={{ width: `${uploadProgress}%` }}
                  />

                  <div className="relative flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <FileTypeBadge ext="PDF" className="shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm font-bold text-white truncate">
                          {cleanFileName(selectedFile.name)}
                        </p>
                        <p className="text-[11px] text-[#FFBAC7]/70">
                          {getReadableFileSize(selectedFile.size)} • Category:{' '}
                          <span className="text-[#FFA8B8] font-semibold">
                            {CATEGORY_LABELS[selectedCategory]}
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {isUploading ? (
                        <div className="flex items-center gap-2 text-xs font-semibold text-[#FFA8B8]">
                          <Loader2 size={14} className="animate-spin text-[#E36A6A]" />
                          <span>{uploadProgress}%</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/60 text-emerald-300 border border-emerald-500/40 text-xs font-bold">
                          <CheckCircle2 size={13} className="text-emerald-400" />
                          <span>Ready</span>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={handleClearSelection}
                        disabled={isUploading}
                        className="rounded-lg p-1.5 text-[#FFBAC7]/60 hover:bg-[#36081B] hover:text-rose-300 transition-colors cursor-pointer disabled:opacity-50"
                        title="Remove selected file"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {isUploading && (
                    <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[#100108]">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#850E35] via-[#C73659] to-[#E36A6A] transition-all duration-150 ease-out"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 border-t border-[#850E35]/30 animate-in fade-in duration-200">
                  <div className="flex items-center gap-2 text-xs text-[#FFBAC7]">
                    <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>
                      Ready to store in {selectedCategory} ({getReadableFileSize(selectedFile.size)})
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <Button2
                      variant="secondary"
                      onClick={handleClearSelection}
                      disabled={isUploading}
                      className="px-4 py-2 text-xs font-semibold text-[#FFBAC7] hover:text-white bg-[#18030C] hover:bg-[#2C0615] border border-[#850E35]/40 rounded-xl"
                    >
                      <span>Cancel</span>
                    </Button2>

                    <button
                      type="button"
                      onClick={handleUploadSubmit}
                      disabled={isUploading}
                      className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#850E35] via-[#A81546] to-[#850E35] hover:brightness-110 px-6 py-2.5 text-xs sm:text-sm font-bold text-white shadow-lg shadow-[#850E35]/30 transition-all active:scale-95 disabled:opacity-60 cursor-pointer"
                    >
                      {isUploading ? (
                        <>
                          <Loader2 size={15} className="animate-spin text-white" />
                          <span>Uploading to Storage...</span>
                        </>
                      ) : (
                        <>
                          <UploadCloud size={15} />
                          <span>Upload & Store in Bucket</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* =========================================================
            3. STORED FILES LIST & ACTIONS
        ========================================================== */}
        <section id="admin-stored-files">
          <div className="rounded-3xl border border-[#850E35]/40 bg-[#240614]/95 p-6 sm:p-8 shadow-xl backdrop-blur-md">
            {/* Top Toolbar: Title, Category Filter & Refresh */}
            <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2 drop-shadow-sm">
                  <FileText size={18} className="text-[#C73659]" />
                  <span>Stored Industry PDF Files</span>
                </h3>
                <p className="text-xs text-[#FFBAC7] mt-0.5">
                  Review original curriculum PDFs. Register files to link them with occupational benchmarks.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Category Filter Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                  <button
                    type="button"
                    onClick={() => {
                      setCategoryFilter('');
                      setCurrentPage(1);
                    }}
                    className={cn(
                      'px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap',
                      categoryFilter === ''
                        ? 'bg-[#850E35] text-white shadow-md shadow-[#850E35]/30'
                        : 'bg-[#18030C] text-[#FFBAC7]/70 hover:text-white hover:bg-[#250514] border border-[#850E35]/40'
                    )}
                  >
                    All Categories
                  </button>
                  {ALLOWED_INDUSTRY_CATEGORIES.map((cat) => (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => {
                        setCategoryFilter(cat.value);
                        setCurrentPage(1);
                      }}
                      className={cn(
                        'px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap',
                        categoryFilter === cat.value
                          ? 'bg-[#850E35] text-white shadow-md shadow-[#850E35]/30'
                          : 'bg-[#18030C] text-[#FFBAC7]/70 hover:text-white hover:bg-[#250514] border border-[#850E35]/40'
                      )}
                    >
                      {cat.label}
                    </button>
                  ))}


                {/* Refresh Button */}
                <Button2
                  type="button"
                  onClick={fetchFiles}
                  disabled={isLoadingFiles}
                  className="p-2 rounded-xl bg-[#18030C] border border-[#850E35]/40 text-[#FFA8B8] hover:text-white hover:bg-[#290516] transition-colors cursor-pointer disabled:opacity-50"
                  title="Refresh files from storage"
                >
                  <RefreshCw size={15} className={cn(isLoadingFiles && 'animate-spin')} />
                </Button2>
                </div>
              </div>
            </div>

            {/* Table or Empty State */}
            {isLoadingFiles ? (
              <div className="rounded-2xl border border-dashed border-[#850E35]/35 bg-[#18030C]/50 p-12 text-center space-y-3">
                <Loader2 size={28} className="mx-auto text-[#C73659] animate-spin" />
                <p className="text-xs text-[#FFBAC7]">Loading files from Supabase Storage...</p>
              </div>
            ) : files.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#850E35]/35 bg-[#18030C]/50 p-10 text-center space-y-2">
                <FileText size={32} className="mx-auto text-[#850E35]/70" />
                <p className="text-sm font-semibold text-white">No industry files found</p>
                <p className="text-xs text-[#FFBAC7]/70 max-w-md mx-auto">
                  {categoryFilter
                    ? `No documents have been uploaded under the '${CATEGORY_LABELS[categoryFilter] || categoryFilter}' category yet.`
                    : 'Upload a PDF file using the form above to store it in the private bucket.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#850E35]/30 text-[#FFA8B8] uppercase tracking-wider text-[10px]">
                      <th className="pb-3 font-bold pl-2">Document Name</th>
                      <th className="pb-3 font-bold">Category</th>
                      <th className="pb-3 font-bold">Size</th>
                      <th className="pb-3 font-bold">Uploaded Date</th>
                      <th className="pb-3 font-bold text-right pr-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#850E35]/20">
                    {files.map((file) => {
                      const isDownloadingThis = downloadingPath === file.storage_path;
                      const registeredDoc = registeredDocs.find((d) => d.storage_path === file.storage_path);
                      const isRegistered = Boolean(registeredDoc);
                      const categoryClass = CATEGORY_STYLES[file.category] || 'bg-[#3A1024] text-[#FFA8B8] border-[#850E35]/60';
                      const formattedDate = file.upload_date
                        ? new Date(file.upload_date).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          }) +
                          ' ' +
                          new Date(file.upload_date).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : 'Unknown';

                      return (
                        <tr
                          key={file.storage_path}
                          className="hover:bg-[#1E0410]/80 transition-colors group"
                        >
                          {/* File Display Name */}
                          <td className="py-3.5 pl-2 font-medium text-white flex items-center gap-2.5">
                            <FileTypeBadge ext="PDF" className="scale-75 -my-2 shrink-0" />
                            <div className="min-w-0">
                              <span className="truncate block max-w-[200px] sm:max-w-[300px] font-semibold text-white" title={cleanFileName(file.display_name)}>
                                {cleanFileName(file.display_name)}
                              </span>
                              <span className="text-[10px] text-[#FFBAC7]/50 font-mono block truncate max-w-[200px] sm:max-w-[300px]">
                                {file.storage_path}
                              </span>
                            </div>
                          </td>

                          {/* Category Badge */}
                          <td className="py-3.5 text-[#FFBAC7] font-medium whitespace-nowrap">
                              {CATEGORY_LABELS[file.category] || file.category}
                          </td>

                          {/* Size */}
                          <td className="py-3.5 text-[#FFBAC7] font-medium whitespace-nowrap">
                            {getReadableFileSize(file.size_bytes)}
                          </td>

                          {/* Upload Date */}
                          <td className="py-3.5 text-[#FFBAC7]/70 text-[11px] font-mono whitespace-nowrap">
                            {formattedDate}
                          </td>

                          {/* Actions: Extract Skills & Download */}
                          <td className="py-3.5 text-right pr-2 whitespace-nowrap">
                            <div className="inline-flex items-center gap-2 justify-end">
                              {/* Extract Skills Button */}
                              {registeredDoc && (
                                <button
                                  type="button"
                                  onClick={() => setDocToExtractSkills(registeredDoc)}
                                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#F5C563] via-[#E8B145] to-[#D99B26] hover:brightness-105 border border-[#FCE19C]/60 text-[#2B0712] text-xs font-extrabold tracking-wide shadow-md shadow-black/40 transition-all active:scale-95 cursor-pointer"
                                  >
                                  <Sparkles size={14} className="text-[#590922] fill-[#590922]/20" />
                                  <span>Extract Skills</span>
                                </button>
                              )}

                              {/* 60-Second Signed Download */}
                              <button
                                type="button"
                                onClick={() => handleDownload(file.storage_path, cleanFileName(file.display_name))}
                                disabled={isDownloadingThis}
                                className="p-1.5 rounded-lg text-[#FFA8B8] hover:text-white hover:bg-[#850E35]/50 border border-[#850E35]/40 transition-colors cursor-pointer disabled:opacity-50"
                                title="Download Document"
                              >
                                {isDownloadingThis ? (
                                  <Loader2 size={14} className="animate-spin text-white" />
                                ) : (
                                  <Download size={14} />
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls */}
            {totalCount > pageSize && (
              <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-[#850E35]/30 text-xs text-[#FFBAC7]">
                <p>
                  Showing{' '}
                  <span className="font-bold text-white">
                    {Math.min(totalCount, (currentPage - 1) * pageSize + 1)}
                  </span>{' '}
                  to{' '}
                  <span className="font-bold text-white">
                    {Math.min(totalCount, currentPage * pageSize)}
                  </span>{' '}
                  of <span className="font-bold text-white">{totalCount}</span> documents
                </p>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage <= 1 || isLoadingFiles}
                    className="p-1.5 rounded-lg bg-[#18030C] border border-[#850E35]/40 text-[#FFA8B8] hover:text-white disabled:opacity-40 transition-colors cursor-pointer disabled:cursor-not-allowed"
                    title="Previous page"
                  >
                    <ChevronLeft size={16} />
                  </button>

                  <span className="px-3 py-1 rounded-lg bg-[#18030C] border border-[#850E35]/40 text-xs font-semibold text-white">
                    Page {currentPage} of {totalPages}
                  </span>

                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages || isLoadingFiles}
                    className="p-1.5 rounded-lg bg-[#18030C] border border-[#850E35]/40 text-[#FFA8B8] hover:text-white disabled:opacity-40 transition-colors cursor-pointer disabled:cursor-not-allowed"
                    title="Next page"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* =========================================================
          4. EXTRACT SKILLS MODAL
      ========================================================== */}
      {docToExtractSkills && (
        <ExtractSkillsModal
          doc={docToExtractSkills}
          document={docToExtractSkills}
          isOpen={Boolean(docToExtractSkills)}
          onClose={() => setDocToExtractSkills(null)}
          onSuccess={() => fetchRegisteredDocs()}
        />
      )}
    </div>
  );
}
