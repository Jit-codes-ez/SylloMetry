import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, FileText, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { ALLOWED_INDUSTRY_CATEGORIES, registerIndustryDocument } from '@/lib/adminAuth';

export default function RegisterDocumentModal({ file, isOpen, onClose, onSuccess }) {
  if (!isOpen || !file) return null;

  const defaultName = file.display_name?.replace(/\.pdf$/i, '') || file.name?.replace(/\.pdf$/i, '') || 'Industry Document';
  const defaultType = file.category || 'qualification_file';

  const [documentName, setDocumentName] = useState(defaultName);
  const [documentType, setDocumentType] = useState(defaultType);
  const [issuingOrg, setIssuingOrg] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [publishedDate, setPublishedDate] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!documentName.trim()) {
      setErrorMessage('Document name is required.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await registerIndustryDocument({
        document_name: documentName,
        document_type: documentType,
        issuing_organization: issuingOrg || null,
        source_url: sourceUrl || null,
        published_date: publishedDate || null,
        storage_path: file.storage_path,
      });

      onSuccess(res);
      onClose();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to register document.');
    } finally {
      setIsLoading(false);
    }
  };

  if (typeof window === 'undefined' || !window.document?.body) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-lg rounded-3xl border border-[#850E35]/60 p-6 sm:p-7 shadow-2xl text-left"
        style={{ backgroundColor: '#1C040E' }}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#850E35]/30 border border-[#850E35]/60 text-[#FFA8B8]">
              <FileText size={20} />
            </div>
            <div>
              <h4 className="text-base sm:text-lg font-bold text-white">Register Industry Document</h4>
              <p className="text-xs text-[#FFBAC7]/70">Index stored PDF in database for occupation linking</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="rounded-lg p-1.5 text-[#FFBAC7]/60 hover:text-white hover:bg-[#36081B] transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Error notification */}
        {errorMessage && (
          <div className="mb-4 flex items-center gap-2 p-3 rounded-xl border border-rose-500/40 bg-rose-950/70 text-xs text-rose-200">
            <AlertCircle size={15} className="text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Storage Path (Read Only) */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#FFA8B8] mb-1">
              Storage Object Path
            </label>
            <input
              type="text"
              readOnly
              value={file.storage_path}
              className="w-full rounded-xl bg-[#140209] border border-[#850E35]/40 px-3.5 py-2 font-mono text-[11px] text-[#FFBAC7]/70 focus:outline-hidden cursor-not-allowed select-all"
            />
          </div>

          {/* Document Name */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#FFA8B8] mb-1">
              Document Title <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={documentName}
              onChange={(e) => setDocumentName(e.target.value)}
              placeholder="e.g. AI & Cloud Engineer Qualification File"
              className="w-full rounded-xl bg-[#140209] border border-[#850E35]/60 px-3.5 py-2.5 text-white focus:border-[#C73659] focus:outline-hidden transition-colors"
            />
          </div>

          {/* Document Type */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#FFA8B8] mb-1">
              Document Classification Type <span className="text-rose-400">*</span>
            </label>
            <select
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value)}
              className="w-full rounded-xl bg-[#140209] border border-[#850E35]/60 px-3.5 py-2.5 text-white focus:border-[#C73659] focus:outline-hidden transition-colors cursor-pointer"
              style={{ backgroundColor: '#140209' }}
            >
              {ALLOWED_INDUSTRY_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value} className="bg-[#1C040E] text-white">
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          {/* Issuing Organization & Published Date Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#FFA8B8] mb-1">
                Issuing Organization
              </label>
              <input
                type="text"
                value={issuingOrg}
                onChange={(e) => setIssuingOrg(e.target.value)}
                placeholder="e.g. NCVET / NSDC / AWS"
                className="w-full rounded-xl bg-[#140209] border border-[#850E35]/60 px-3.5 py-2 text-white focus:border-[#C73659] focus:outline-hidden transition-colors"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#FFA8B8] mb-1">
                Published Date
              </label>
              <input
                type="date"
                value={publishedDate}
                onChange={(e) => setPublishedDate(e.target.value)}
                className="w-full rounded-xl bg-[#140209] border border-[#850E35]/60 px-3.5 py-2 text-white focus:border-[#C73659] focus:outline-hidden transition-colors cursor-pointer"
              />
            </div>
          </div>

          {/* Source URL */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#FFA8B8] mb-1">
              Source / Reference URL
            </label>
            <input
              type="url"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="https://..."
              className="w-full rounded-xl bg-[#140209] border border-[#850E35]/60 px-3.5 py-2 text-white focus:border-[#C73659] focus:outline-hidden transition-colors"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#850E35]/30">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-[#FFBAC7] hover:text-white bg-[#18030C] hover:bg-[#250514] border border-[#850E35]/40 transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center justify-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#850E35] to-[#C73659] hover:brightness-110 shadow-lg shadow-[#850E35]/30 transition-all cursor-pointer disabled:opacity-60"
            >
              {isLoading ? (
                <>
                  <Loader2 size={14} className="animate-spin text-white" />
                  <span>Registering...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={14} />
                  <span>Register Document</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    window.document.body
  );
}
