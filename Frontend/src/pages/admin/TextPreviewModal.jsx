import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  FileText,
  AlertTriangle,
  Loader2,
  ChevronRight,
  ArrowLeft,
  Copy,
  Check,
  BookOpen,
} from 'lucide-react';
import { getDocumentTextPreview } from '@/lib/adminAuth';

export default function TextPreviewModal({ doc, document: docProp, isOpen, onClose }) {
  const docItem = doc || docProp;
  if (!isOpen || !docItem) return null;

  const [previewData, setPreviewData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  const [activeFullPage, setActiveFullPage] = useState(null);
  const [isLoadingPage, setIsLoadingPage] = useState(false);
  const [hasCopied, setHasCopied] = useState(false);

  const loadPreview = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await getDocumentTextPreview(docItem.document_id);
      setPreviewData(data);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to extract text from PDF.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    async function initLoad() {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const data = await getDocumentTextPreview(docItem.document_id);
        if (isMounted) {
          setPreviewData(data);
        }
      } catch (err) {
        if (isMounted) {
          setErrorMessage(err.message || 'Failed to extract text from PDF.');
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    initLoad();
    return () => {
      isMounted = false;
    };
  }, [docItem.document_id]);

  const handleOpenFullPage = async (pageNumber) => {
    setIsLoadingPage(true);
    setErrorMessage(null);
    try {
      const data = await getDocumentTextPreview(docItem.document_id, pageNumber);
      setActiveFullPage(data.single_page);
    } catch (err) {
      setErrorMessage(err.message || `Failed to load page ${pageNumber} text.`);
    } finally {
      setIsLoadingPage(false);
    }
  };

  const handleCopyText = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setHasCopied(true);
    setTimeout(() => setHasCopied(false), 2000);
  };

  if (typeof window === 'undefined' || !window.document?.body) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-3xl max-h-[90vh] flex flex-col rounded-3xl border border-[#850E35]/60 shadow-2xl text-left overflow-hidden"
        style={{ backgroundColor: '#1C040E' }}
      >
        {/* Modal Top Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-[#850E35]/40 shrink-0 bg-[#18030C]/80">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#850E35] to-[#C73659] text-white shadow-md">
              <BookOpen size={20} />
            </div>
            <div className="min-w-0">
              <h4 className="text-base sm:text-lg font-bold text-white truncate">
                {docItem.document_name}
              </h4>
              <p className="text-xs text-[#FFBAC7]/70 truncate font-mono">
                {docItem.storage_path} {previewData && `• ${previewData.total_pages} Pages`}
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

        {/* Modal Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          {errorMessage && (
            <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl border border-rose-500/40 bg-rose-950/70 text-xs text-rose-200">
              <div className="flex items-center gap-2">
                <AlertTriangle size={16} className="text-rose-400 shrink-0" />
                <span>{errorMessage}</span>
              </div>
              <button
                type="button"
                onClick={loadPreview}
                className="px-3 py-1 rounded-lg bg-rose-900 hover:bg-rose-800 text-white font-semibold transition-colors cursor-pointer shrink-0"
              >
                Retry
              </button>
            </div>
          )}

          {isLoading ? (
            <div className="py-20 text-center space-y-3">
              <Loader2 size={32} className="mx-auto text-[#C73659] animate-spin" />
              <p className="text-xs text-[#FFBAC7]">
                Parsing PDF with PyMuPDF, stripping headers/footers, and preparing previews...
              </p>
            </div>
          ) : activeFullPage ? (
            /* Full Single Page View */
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-[#850E35]/30">
                <button
                  type="button"
                  onClick={() => setActiveFullPage(null)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#FFA8B8] hover:text-white transition-colors cursor-pointer"
                >
                  <ArrowLeft size={14} />
                  <span>Back to Page List</span>
                </button>

                <div className="flex items-center gap-3">
                  <span className="text-xs text-[#FFBAC7]/70 font-mono">
                    Page {activeFullPage.page_number} of {previewData?.total_pages || '?'} ({activeFullPage.char_count} chars)
                  </span>

                  <button
                    type="button"
                    onClick={() => handleCopyText(activeFullPage.page_text)}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#290516] border border-[#850E35]/50 text-xs text-[#FFA8B8] hover:text-white transition-colors cursor-pointer"
                  >
                    {hasCopied ? (
                      <>
                        <Check size={12} className="text-emerald-400" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy size={12} />
                        <span>Copy Text</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {activeFullPage.low_text && (
                <div className="flex items-center gap-2 p-3 rounded-xl border border-amber-500/40 bg-amber-950/60 text-xs text-amber-200">
                  <AlertTriangle size={15} className="text-amber-400 shrink-0" />
                  <span>
                    Low Text Warning: Only {activeFullPage.char_count} characters detected on this page. It may be scanned or image-based (OCR is not implemented).
                  </span>
                </div>
              )}

              <div className="p-4 rounded-2xl bg-[#140209] border border-[#850E35]/40 font-mono text-xs leading-relaxed text-[#FFF5E4] max-h-[50vh] overflow-y-auto whitespace-pre-wrap selection:bg-[#C73659]/40">
                {activeFullPage.page_text || 'No text extracted on this page.'}
              </div>
            </div>
          ) : (
            /* Page Summary Cards List */
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-[#FFBAC7]">
                <span>Extracted {previewData?.pages?.length || 0} pages</span>
                <span className="text-[11px] text-[#FFBAC7]/60">
                  Repeated headers & footers automatically stripped
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {previewData?.pages?.map((page) => (
                  <div
                    key={page.page_number}
                    className="p-4 rounded-2xl bg-[#18030C] border border-[#850E35]/40 hover:border-[#C73659] transition-all space-y-2 group"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <span className="flex items-center justify-center h-6 w-6 rounded-lg bg-[#2D0616] border border-[#850E35]/60 text-[11px] font-bold text-white font-mono">
                          {page.page_number}
                        </span>
                        <span className="text-xs font-semibold text-white">
                          Page {page.page_number}
                        </span>
                        <span className="text-[11px] text-[#FFBAC7]/60 font-mono">
                          • {page.char_count} characters
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {page.low_text && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-950/70 border border-amber-500/40 text-[10px] font-bold text-amber-300">
                            <AlertTriangle size={11} className="text-amber-400" />
                            <span>Low Text (&lt;200)</span>
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => handleOpenFullPage(page.page_number)}
                          disabled={isLoadingPage}
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-[#290516] border border-[#850E35]/50 text-xs text-[#FFA8B8] hover:text-white hover:bg-[#850E35] transition-colors cursor-pointer"
                        >
                          <span>Full Text</span>
                          <ChevronRight size={13} />
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-[#FFBAC7]/80 line-clamp-2 font-mono bg-[#120107] p-2.5 rounded-xl border border-[#850E35]/20">
                      {page.snippet || '(Empty / Scanned page content)'}
                    </p>
                  </div>
                ))}
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
            Close Preview
          </button>
        </div>
      </div>
    </div>,
    window.document.body
  );
}
