import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Briefcase, Plus, AlertCircle, Loader2 } from 'lucide-react';
import { linkOccupationToDocument } from '@/lib/adminAuth';

export default function AddOccupationModal({ doc, document: docProp, isOpen, onClose, onSuccess }) {
  const docItem = doc || docProp;
  if (!isOpen || !docItem) return null;

  const [classificationSystem, setClassificationSystem] = useState('NCO-2015');
  const [classificationCode, setClassificationCode] = useState('');
  const [occupationName, setOccupationName] = useState('');
  const [relationshipType, setRelationshipType] = useState('aligned_nco');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!classificationCode.trim() || !occupationName.trim()) {
      setErrorMessage('Classification code and occupation name are required.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await linkOccupationToDocument(docItem.document_id, {
        classification_system: classificationSystem,
        classification_code: classificationCode,
        occupation_name: occupationName,
        relationship_type: relationshipType,
      });

      onSuccess(res);
      onClose();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to link occupation.');
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
        className="relative w-full max-w-md rounded-3xl border border-[#850E35]/60 p-6 sm:p-7 shadow-2xl text-left"
        style={{ backgroundColor: '#1C040E' }}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-950/60 border border-purple-500/40 text-purple-300">
              <Briefcase size={20} />
            </div>
            <div>
              <h4 className="text-base font-bold text-white">Link Occupation Standard</h4>
              <p className="text-xs text-[#FFBAC7]/70 truncate max-w-[240px]">
                {docItem.document_name}
              </p>
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

        {/* Error Notification */}
        {errorMessage && (
          <div className="mb-4 flex items-center gap-2 p-3 rounded-xl border border-rose-500/40 bg-rose-950/70 text-xs text-rose-200">
            <AlertCircle size={15} className="text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Classification System */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#FFA8B8] mb-1">
              Classification System <span className="text-rose-400">*</span>
            </label>
            <select
              value={classificationSystem}
              onChange={(e) => setClassificationSystem(e.target.value)}
              className="w-full rounded-xl bg-[#140209] border border-[#850E35]/60 px-3.5 py-2.5 text-white focus:border-[#C73659] focus:outline-hidden transition-colors cursor-pointer"
              style={{ backgroundColor: '#140209' }}
            >
              <option value="NCO-2015" className="bg-[#1C040E] text-white">NCO-2015 (National Classification of Occupations)</option>
              <option value="O*NET-SOC" className="bg-[#1C040E] text-white">O*NET-SOC (Standard Occupational Classification)</option>
              <option value="ISCO-08" className="bg-[#1C040E] text-white">ISCO-08 (International Standard)</option>
              <option value="Custom" className="bg-[#1C040E] text-white">Custom / Industry Framework</option>
            </select>
          </div>

          {/* Classification Code */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#FFA8B8] mb-1">
              Occupation Code <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={classificationCode}
              onChange={(e) => setClassificationCode(e.target.value)}
              placeholder="e.g. 2512.0101 or 15-1252.00"
              className="w-full rounded-xl bg-[#140209] border border-[#850E35]/60 px-3.5 py-2.5 text-white focus:border-[#C73659] focus:outline-hidden transition-colors font-mono"
            />
          </div>

          {/* Occupation Name */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#FFA8B8] mb-1">
              Occupation Title / Role <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={occupationName}
              onChange={(e) => setOccupationName(e.target.value)}
              placeholder="e.g. Software Developer / Cloud Architect"
              className="w-full rounded-xl bg-[#140209] border border-[#850E35]/60 px-3.5 py-2.5 text-white focus:border-[#C73659] focus:outline-hidden transition-colors"
            />
          </div>

          {/* Relationship Type */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#FFA8B8] mb-1">
              Relationship Type <span className="text-rose-400">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label
                className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-colors ${
                  relationshipType === 'aligned_nco'
                    ? 'border-[#C73659] bg-[#36081B]'
                    : 'border-[#850E35]/40 bg-[#140209] text-[#FFBAC7]/70'
                }`}
              >
                <input
                  type="radio"
                  name="relationship"
                  value="aligned_nco"
                  checked={relationshipType === 'aligned_nco'}
                  onChange={() => setRelationshipType('aligned_nco')}
                  className="accent-[#C73659]"
                />
                <span className="font-semibold text-white">Aligned NCO</span>
              </label>

              <label
                className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-colors ${
                  relationshipType === 'target_role'
                    ? 'border-[#C73659] bg-[#36081B]'
                    : 'border-[#850E35]/40 bg-[#140209] text-[#FFBAC7]/70'
                }`}
              >
                <input
                  type="radio"
                  name="relationship"
                  value="target_role"
                  checked={relationshipType === 'target_role'}
                  onChange={() => setRelationshipType('target_role')}
                  className="accent-[#C73659]"
                />
                <span className="font-semibold text-white">Target Role</span>
              </label>
            </div>
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
              className="flex items-center justify-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-purple-800 to-[#850E35] hover:brightness-110 shadow-lg shadow-purple-950/40 transition-all cursor-pointer disabled:opacity-60"
            >
              {isLoading ? (
                <>
                  <Loader2 size={14} className="animate-spin text-white" />
                  <span>Linking...</span>
                </>
              ) : (
                <>
                  <Plus size={14} />
                  <span>Link Occupation</span>
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
