import React, { useState, useEffect, useRef } from 'react';
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  CircleCheck,
  AlertCircle,
  Loader2,
  Trash2,
  ShieldCheck,
  Sparkles,
  Database,
  ArrowRight,
  ExternalLink,
  RefreshCw,
  Clock,
  Layers,
} from 'lucide-react';
import { useAdminAuth } from '@/context/AdminAuthContext';
import AdminNavbar from './AdminNavbar';
import { CardGlare } from '@/components/CardGlare';
import { Button2 } from '@/components/Button2';
import { FileTypeBadge, getReadableFileSize } from '@/components/FileUpload';
import { uploadAdminPdf, getAdminDocuments } from '@/lib/adminAuth';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';

const ADMIN_STORAGE_KEY = 'syllometry_admin_documents_state';

function loadSavedAdminDocuments() {
  try {
    const raw = localStorage.getItem(ADMIN_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistAdminDocuments(docs) {
  try {
    localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(docs));
  } catch {}
}

export default function AdminDashboard() {
  const { admin } = useAdminAuth();

  const [selectedFile, setSelectedFile] = useState(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isActivelyUploading, setIsActivelyUploading] = useState(false);
  const [isIngesting, setIsIngesting] = useState(false);
  const [uploadSuccessDoc, setUploadSuccessDoc] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [documentList, setDocumentList] = useState(() => loadSavedAdminDocuments());

  const fileInputRef = useRef(null);
  const uploadTimerRef = useRef(null);

  // Sync initial list from server if online
  useEffect(() => {
    let isMounted = true;
    async function fetchServerDocuments() {
      try {
        const res = await getAdminDocuments();
        if (isMounted && res && Array.isArray(res.documents) && res.documents.length > 0) {
          setDocumentList((prev) => {
            const merged = [...res.documents];
            for (const item of prev) {
              if (!merged.some((m) => m.id === item.id || m.filename === item.filename)) {
                merged.push(item);
              }
            }
            persistAdminDocuments(merged);
            return merged;
          });
        }
      } catch (err) {
        console.warn('Admin documents fetch notice:', err.message);
      }
    }
    fetchServerDocuments();
    return () => {
      isMounted = false;
      if (uploadTimerRef.current) clearInterval(uploadTimerRef.current);
    };
  }, []);

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

    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      validateAndProcessFile(files[0]);
    }
  };

  const handleFileSelect = (e) => {
    const files = e.target?.files;
    if (files && files.length > 0) {
      validateAndProcessFile(files[0]);
    }
  };

  const validateAndProcessFile = (file) => {
    setErrorMessage(null);
    setUploadSuccessDoc(null);

    // 1. Validate PDF format
    const isPdf =
      file.type === 'application/pdf' ||
      file.name.toLowerCase().endsWith('.pdf');

    if (!isPdf) {
      setErrorMessage('Invalid file format. Only PDF documents (.pdf) are supported for administration.');
      return;
    }

    // 2. Validate size (Max 25MB)
    const maxBytes = 25 * 1024 * 1024;
    if (file.size > maxBytes) {
      setErrorMessage(`File size (${getReadableFileSize(file.size)}) exceeds the 25MB maximum limit.`);
      return;
    }

    if (file.size === 0) {
      setErrorMessage('The selected PDF file is empty (0 bytes).');
      return;
    }

    setSelectedFile(file);
    simulateUploadProgress(file);
  };

  const simulateUploadProgress = (file) => {
    setIsActivelyUploading(true);
    setUploadProgress(0);

    const totalDuration = 1800;
    const interval = 80;
    let elapsed = 0;

    if (uploadTimerRef.current) clearInterval(uploadTimerRef.current);

    uploadTimerRef.current = setInterval(() => {
      elapsed += interval;
      const progress = Math.min(100, Math.round((elapsed / totalDuration) * 100));
      setUploadProgress(progress);

      if (elapsed >= totalDuration) {
        clearInterval(uploadTimerRef.current);
        setIsActivelyUploading(false);
      }
    }, interval);
  };

  const handleClearSelection = () => {
    setSelectedFile(null);
    setUploadProgress(0);
    setIsActivelyUploading(false);
    setErrorMessage(null);
    if (uploadTimerRef.current) clearInterval(uploadTimerRef.current);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleIngestDocument = async () => {
    if (!selectedFile || isIngesting || isActivelyUploading) return;

    setIsIngesting(true);
    setErrorMessage(null);

    try {
      const res = await uploadAdminPdf(selectedFile);

      const newRecord = {
        id: res?.document_id || `doc-${Date.now()}`,
        filename: res?.filename || selectedFile.name,
        file_size: res?.file_size || selectedFile.size,
        status: res?.status || 'Ready for Ingestion Pipeline',
        uploaded_at: res?.uploaded_at || new Date().toISOString(),
        uploaded_by: admin?.email || 'admin@syllometry.com',
      };

      const updated = [newRecord, ...documentList.filter((d) => d.filename !== newRecord.filename)];
      setDocumentList(updated);
      persistAdminDocuments(updated);

      setUploadSuccessDoc(newRecord);
      setSelectedFile(null);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      setErrorMessage(err.message || 'Failed to ingest PDF into the administrative pipeline.');
    } finally {
      setIsIngesting(false);
    }
  };

  const handleDeleteDocument = (docId) => {
    const updated = documentList.filter((d) => d.id !== docId);
    setDocumentList(updated);
    persistAdminDocuments(updated);
  };

  const adminName =
    admin?.full_name?.split(' ')[0] ||
    admin?.email?.split('@')[0] ||
    'Administrator';

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1C040E] via-[#140209] to-[#0E0106] text-[#FFF5E4] pt-24 pb-16 selection:bg-[#C73659]/30 selection:text-white">
      {/* Top Fixed Admin Navigation */}
      <AdminNavbar />

      <div className="mx-auto max-w-[1450px] px-4 py-7 sm:px-6 lg:px-8 lg:py-9">
        {/* =========================================================
            1. WELCOME BANNER & SYSTEM STATUS PILLS
        ========================================================== */}
        <section id="admin-welcome" className="mb-8">
          <CardGlare
            theme="dark"
            innerClassName="bg-[#240614]/95 p-6 sm:p-8 rounded-2xl flex flex-col justify-between gap-6 md:flex-row md:items-end border border-[#850E35]/40 shadow-xl"
            className="rounded-3xl border border-[#850E35]/40 shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
          >
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white drop-shadow-sm">
                Welcome to SylloMetry Administration, {adminName}.
              </h1>

              <p className="mt-2 max-w-2xl text-xs sm:text-sm leading-relaxed text-[#FFBAC7]">
                Administrative ingestion portal for syllabus benchmarking, industry degree outlines,
                and technical competency standards extraction.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">

              <div className="px-4 py-2.5 rounded-xl bg-[#18030C] border border-[#850E35]/50 text-right">
                <p className="text-[10px] uppercase font-bold tracking-wider text-[#FFA8B8]">
                  Ingested Files
                </p>
                <p className="text-xl font-extrabold text-white">
                  {documentList.length} 
                </p>
              </div>
            </div>
          </CardGlare>
        </section>

        {/* =========================================================
            2. MAIN FEATURE: PDF UPLOAD INTERFACE
        ========================================================== */}
        <section id="admin-pdf-upload" className="mb-8">
          <div className="rounded-3xl border border-[#850E35]/40 bg-[#240614]/95 p-6 sm:p-8 shadow-xl backdrop-blur-md">
            {/* Header */}
            <div className="mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#850E35] to-[#B8194E] text-white shadow-lg shadow-[#850E35]/35">
                  <UploadCloud size={22} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white drop-shadow-sm">
                    Upload Industry Syllabus & Benchmark Documents
                  </h2>
                  <p className="mt-1 text-xs text-[#FFBAC7] max-w-2xl leading-relaxed">
                    Upload course catalogs, industry standard definitions, or technical certification curricula.
                    Documents uploaded here will be processed and indexed by the extraction and ingestion pipeline.
                  </p>
                </div>
              </div>
            </div>

            {/* Error Banner */}
            {errorMessage && (
              <div
                role="alert"
                className="mb-5 flex items-center justify-between gap-3 rounded-xl border border-rose-500/40 bg-rose-950/70 p-3.5 text-xs text-rose-200 animate-in fade-in duration-200"
              >
                <div className="flex items-center gap-2">
                  <AlertCircle size={16} className="text-rose-400 shrink-0" />
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

            {/* Hidden native input */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              onChange={handleFileSelect}
              className="hidden"
              id="admin-pdf-input"
            />

            {/* Dedicated Deep Velvet DropZone */}
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
                    Supports official PDF documents up to 25MB
                  </p>
                </div>

                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#240614] border border-[#850E35]/40 text-[11px] font-medium text-[#FFBAC7]">
                  <span>File type accepted:</span>
                  <span className="font-bold text-[#FFA8B8]">.PDF</span>
                </div>
              </div>
            ) : (
              /* Selected File Card with Upload Progress */
              <div className="space-y-4">
                <div className="relative overflow-hidden rounded-2xl border border-[#850E35]/50 bg-[#18030C] p-4 sm:p-5 shadow-md">
                  {/* Progress background fill */}
                  <div
                    className="absolute inset-y-0 left-0 bg-[#850E35]/20 transition-all duration-150 ease-out pointer-events-none rounded-xl"
                    style={{ width: `${uploadProgress}%` }}
                  />

                  <div className="relative flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <FileTypeBadge ext="PDF" className="shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm font-bold text-white truncate">
                          {selectedFile.name}
                        </p>
                        <p className="text-[11px] text-[#FFBAC7]/70">
                          {getReadableFileSize(selectedFile.size)} • PDF Document
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {isActivelyUploading ? (
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
                        disabled={isIngesting}
                        className="rounded-lg p-1.5 text-[#FFBAC7]/60 hover:bg-[#36081B] hover:text-rose-300 transition-colors cursor-pointer disabled:opacity-50"
                        title="Remove selected file"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[#100108]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#850E35] via-[#C73659] to-[#E36A6A] transition-all duration-150 ease-out"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>

                {/* Upload Action Trigger Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 border-t border-[#850E35]/30 animate-in fade-in duration-200">
                  <div className="flex items-center gap-2 text-xs text-[#FFBAC7]">
                    <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>
                      PDF ready for administrative ingestion pipeline ({getReadableFileSize(selectedFile.size)})
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <Button2
                      variant="secondary"
                      onClick={handleClearSelection}
                      disabled={isIngesting}
                      className="px-4 py-2 text-xs font-semibold text-[#FFBAC7] hover:text-white bg-[#18030C] hover:bg-[#2C0615] border border-[#850E35]/40 rounded-xl"
                    >
                      <span>Cancel</span>
                    </Button2>

                    <button
                      type="button"
                      onClick={handleIngestDocument}
                      disabled={isActivelyUploading || isIngesting}
                      className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#850E35] via-[#A81546] to-[#850E35] hover:brightness-110 px-6 py-2.5 text-xs sm:text-sm font-bold text-white shadow-lg shadow-[#850E35]/30 transition-all active:scale-95 disabled:opacity-60 cursor-pointer"
                    >
                      {isIngesting ? (
                        <>
                          <Loader2 size={15} className="animate-spin text-white" />
                          <span>Ingesting Document...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles size={15} />
                          <span>Ingest & Queue for Pipeline</span>
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
            3. POST-INGESTION SUCCESS NOTIFICATION CARD
        ========================================================== */}
        <AnimatePresence>
          {uploadSuccessDoc && (
            <motion.section
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.98 }}
              className="mb-8 rounded-3xl border border-emerald-500/40 bg-emerald-950/60 p-6 sm:p-7 shadow-lg backdrop-blur-md"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-xs">
                    <CircleCheck size={22} />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-emerald-200">
                      Document Successfully Ingested!
                    </h3>
                    <p className="mt-1 text-xs text-emerald-300 leading-relaxed max-w-xl">
                      <strong>{uploadSuccessDoc.filename}</strong> ({getReadableFileSize(uploadSuccessDoc.file_size)}) has been authenticated and queued into the ingestion pipeline for technical skill indexing.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={() => setUploadSuccessDoc(null)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-emerald-300 hover:text-white hover:bg-emerald-900/60 border border-emerald-500/40 transition-colors cursor-pointer"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* =========================================================
            4. ADMIN INGESTION QUEUE / RECENT DOCUMENTS
        ========================================================== */}
        <section id="admin-document-queue">
          <div className="rounded-3xl border border-[#850E35]/40 bg-[#240614]/95 p-6 sm:p-8 shadow-xl backdrop-blur-md">
            <div className="mb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2 drop-shadow-sm">
                  <FileText size={18} className="text-[#C73659]" />
                  <span>Administrative Ingestion Queue</span>
                </h3>
                <p className="text-xs text-[#FFBAC7] mt-0.5">
                  Track curriculum documents ingested for industry competency mapping.
                </p>
              </div>

              <span className="text-xs font-semibold text-[#FFA8B8] px-3 py-1 rounded-full bg-[#18030C] border border-[#850E35]/40">
                {documentList.length} Active Records
              </span>
            </div>

            {documentList.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#850E35]/35 bg-[#18030C]/50 p-8 text-center space-y-2">
                <FileText size={28} className="mx-auto text-[#850E35]/70" />
                <p className="text-sm font-semibold text-white">No documents ingested yet</p>
                <p className="text-xs text-[#FFBAC7]/70 max-w-md mx-auto">
                  Upload a PDF syllabus above to start feeding the document extraction and ingestion pipeline.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#850E35]/30 text-[#FFA8B8] uppercase tracking-wider text-[10px]">
                      <th className="pb-3 font-bold pl-2">Document</th>
                      <th className="pb-3 font-bold">Size</th>
                      <th className="pb-3 font-bold">Uploaded By</th>
                      <th className="pb-3 font-bold">Status</th>
                      <th className="pb-3 font-bold">Uploaded At</th>
                      <th className="pb-3 font-bold text-right pr-2">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#850E35]/20">
                    {documentList.map((doc, idx) => (
                      <tr
                        key={doc.id || idx}
                        className="hover:bg-[#1E0410]/80 transition-colors group"
                      >
                        <td className="py-3.5 pl-2 font-medium text-white flex items-center gap-2.5">
                          <FileTypeBadge ext="PDF" className="scale-75 -my-2 shrink-0" />
                          <span className="truncate max-w-[200px] sm:max-w-[300px]" title={doc.filename}>
                            {doc.filename}
                          </span>
                        </td>
                        <td className="py-3.5 text-[#FFBAC7]">
                          {getReadableFileSize(doc.file_size)}
                        </td>
                        <td className="py-3.5 text-[#FFBAC7]/70 font-mono text-[11px]">
                          {doc.uploaded_by || 'admin'}
                        </td>
                        <td className="py-3.5">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-950/60 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            <span>{doc.status || 'Ready for Ingestion Pipeline'}</span>
                          </span>
                        </td>
                        <td className="py-3.5 text-[#FFBAC7]/60 text-[11px] font-mono">
                          {doc.uploaded_at
                            ? new Date(doc.uploaded_at).toLocaleDateString() + ' ' + new Date(doc.uploaded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : 'Just now'}
                        </td>
                        <td className="py-3.5 text-right pr-2">
                          <button
                            type="button"
                            onClick={() => handleDeleteDocument(doc.id)}
                            className="p-1.5 rounded-lg text-[#FFBAC7]/50 hover:text-rose-300 hover:bg-rose-950/50 transition-colors cursor-pointer"
                            title="Remove document from queue"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
