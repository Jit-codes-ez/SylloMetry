import React, { useId, useRef, useState, useEffect } from 'react';
import {
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Trash2,
  RotateCcw,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Returns a human-readable file size string.
 * @param {number} bytes
 * @returns {string}
 */
export const getReadableFileSize = (bytes) => {
  if (!bytes || bytes === 0) return '0 KB';
  const suffixes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.floor(bytes / Math.pow(1024, i)) + ' ' + (suffixes[i] || 'MB');
};

/**
 * SVG Dog-Eared File Badge matching Untitled UI File Icons
 */
export function FileTypeBadge({ ext = '', isFailed = false, isInvalid = false, className = '' }) {
  const cleanExt = (ext || 'FILE').toUpperCase().replace('.', '');

  let fill = '#E11D48'; // Default PDF Red
  let flap = '#FDA4AF';

  if (isFailed || isInvalid) {
    fill = '#E11D48';
    flap = '#FECDD3';
  } else if (['JPG', 'JPEG', 'PNG', 'GIF', 'SVG', 'WEBP', 'AVIF'].includes(cleanExt)) {
    fill = '#7C3AED'; // Purple
    flap = '#C4B5FD';
  } else if (['PDF'].includes(cleanExt)) {
    fill = '#EF4444'; // Red
    flap = '#FCA5A5';
  } else if (['DOC', 'DOCX', 'TXT', 'RTF'].includes(cleanExt)) {
    fill = '#2563EB'; // Blue
    flap = '#93C5FD';
  } else if (['XLS', 'XLSX', 'CSV'].includes(cleanExt)) {
    fill = '#059669'; // Emerald
    flap = '#6EE7B7';
  } else if (['ZIP', 'RAR', '7Z', 'TAR'].includes(cleanExt)) {
    fill = '#D97706'; // Amber
    flap = '#FDE68A';
  } else {
    fill = '#64748B'; // Slate
    flap = '#CBD5E1';
  }

  return (
    <div className={cn('relative flex h-11 w-9 shrink-0 items-center justify-center select-none drop-shadow-xs', className)}>
      <svg width="36" height="44" viewBox="0 0 36 44" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Main Paper Outline with Folded Top Right Corner */}
        <path
          d="M0 4.5C0 2.01472 2.01472 0 4.5 0H23.5L36 12.5V39.5C36 41.9853 33.9853 44 31.5 44H4.5C2.01472 44 0 41.9853 0 39.5V4.5Z"
          fill={fill}
        />
        {/* Top-Right Dog-Ear Flap */}
        <path
          d="M23.5 0V9C23.5 10.933 25.067 12.5 27 12.5H36L23.5 0Z"
          fill={flap}
          fillOpacity="0.5"
        />
        {/* File Extension Text */}
        <text
          x="18"
          y="31"
          fill="white"
          fontSize="9"
          fontWeight="800"
          textAnchor="middle"
          fontFamily="Inter, system-ui, -apple-system, sans-serif"
          letterSpacing="0.04em"
        >
          {cleanExt.slice(0, 4)}
        </text>
      </svg>
    </div>
  );
}

/**
 * DropZone Component
 */
export const FileUploadDropZone = ({
  className,
  hint = 'SVG, PNG, JPG or GIF (max. 800×400px)',
  isDisabled = false,
  isLimitReached = false,
  disabledHint = 'Delete the uploaded file below to upload another',
  accept,
  allowsMultiple = true,
  maxSize = 15 * 1024 * 1024,
  onDropFiles,
  onDropUnacceptedFiles,
  onSizeLimitExceed,
  children,
}) => {
  const id = useId();
  const inputRef = useRef(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const isFileTypeAccepted = (file) => {
    if (!accept) return true;
    const acceptedTypes = accept.split(',').map((t) => t.trim().toLowerCase());
    const fileExt = `.${file.name.split('.').pop()?.toLowerCase()}`;
    const fileMime = file.type?.toLowerCase() || '';

    return acceptedTypes.some((type) => {
      if (type.startsWith('.')) {
        return fileExt === type;
      }
      if (type.endsWith('/*')) {
        const prefix = type.split('/')[0];
        return fileMime.startsWith(`${prefix}/`);
      }
      return fileMime === type;
    });
  };

  const handleDragIn = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isDisabled) return;
    setIsDraggingOver(true);
  };

  const handleDragOut = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isDisabled) return;
    setIsDraggingOver(false);
  };

  const processFiles = (filesList) => {
    if (isDisabled) return;
    setErrorMessage(null);
    const files = Array.from(filesList || []);
    if (!files.length) return;

    const acceptedFiles = [];
    const unacceptedFiles = [];
    const oversizedFiles = [];

    const filesToProcess = allowsMultiple ? files : files.slice(0, 1);

    filesToProcess.forEach((file) => {
      if (maxSize && file.size > maxSize) {
        oversizedFiles.push(file);
      } else if (isFileTypeAccepted(file)) {
        acceptedFiles.push(file);
      } else {
        unacceptedFiles.push(file);
      }
    });

    if (oversizedFiles.length > 0) {
      setErrorMessage(`File exceeds ${getReadableFileSize(maxSize)} limit.`);
      onSizeLimitExceed?.(oversizedFiles);
    }

    if (unacceptedFiles.length > 0) {
      setErrorMessage('Unsupported file format.');
      onDropUnacceptedFiles?.(unacceptedFiles);
    }

    if (acceptedFiles.length > 0) {
      onDropFiles?.(acceptedFiles);
    }

    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isDisabled) return;
    handleDragOut(e);
    processFiles(e.dataTransfer.files);
  };

  const handleInputChange = (e) => {
    if (isDisabled) return;
    processFiles(e.target.files);
  };

  return (
    <div
      onDragOver={handleDragIn}
      onDragEnter={handleDragIn}
      onDragLeave={handleDragOut}
      onDrop={handleDrop}
      className={cn(
        'group relative flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-[#850E35]/25 bg-[#FFF5E4]/40 px-6 py-8 text-center transition-all duration-200 ease-out select-none',
        isDraggingOver && !isDisabled && 'border-[#850E35] bg-[#850E35]/5 scale-[1.006] shadow-sm',
        isDisabled
          ? 'cursor-not-allowed opacity-60 bg-[#FFF5E4]/20 border-[#850E35]/15'
          : 'cursor-pointer hover:border-[#850E35]/50 hover:bg-[#FFF5E4]/70',
        errorMessage && 'border-red-400 bg-red-50/40',
        className
      )}
      onClick={() => !isDisabled && inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        id={id}
        type="file"
        className="sr-only"
        disabled={isDisabled}
        accept={accept}
        multiple={allowsMultiple}
        onChange={handleInputChange}
      />

      {children || (
        <>
          {/* Cloud Upload Icon Badge */}
          <div
            className={cn(
              'flex h-11 w-11 items-center justify-center rounded-xl border border-[#850E35]/15 bg-white text-[#850E35] shadow-xs transition-transform duration-200',
              !isDisabled && 'group-hover:scale-105',
              isDisabled && 'opacity-50 text-[#850E35]/50',
              errorMessage && 'border-red-200 text-red-600 bg-white'
            )}
          >
            <UploadCloud className="h-5 w-5 stroke-[2]" />
          </div>

          <div className="flex flex-col items-center gap-1">
            <div className="flex flex-wrap items-center justify-center gap-1 text-sm">
              {isDisabled ? (
                <>
                  <span className="font-semibold text-[#850E35]/60">
                    Upload disabled
                  </span>
                  {isLimitReached && (
                    <span className="text-[#850E35]/50">
                      (1 file limit reached)
                    </span>
                  )}
                </>
              ) : (
                <>
                  <span className="font-semibold text-[#850E35] underline underline-offset-2 transition-colors hover:text-[#6F0A2B]">
                    Click to upload
                  </span>
                  <span className="text-[#850E35]/70">or drag and drop</span>
                </>
              )}
            </div>

            <p className={cn(
              'text-xs transition-colors',
              errorMessage ? 'text-red-500 font-medium' : isDisabled ? 'text-[#850E35]/50 font-medium' : 'text-[#850E35]/60'
            )}>
              {errorMessage || (isDisabled && isLimitReached ? disabledHint : hint)}
            </p>
          </div>
        </>
      )}
    </div>
  );
};

/**
 * File List Item Component supporting all states:
 * 1. Uploading with Progress fill & percentage
 * 2. 100% Completed
 * 3. Cancelled / Failed Card with Red outline & Try Again action
 * 4. Wrong File Warning Card with alert message
 */
export const FileListItem = ({
  name,
  size,
  progress = 100,
  failed = false,
  isInvalid = false,
  errorMessage,
  onDelete,
  onRetry,
  className,
}) => {
  const isComplete = !failed && !isInvalid && progress === 100;
  const isUploading = !failed && !isInvalid && progress < 100;
  const ext = name.split('.').pop() || '';

  return (
    <li
      className={cn(
        'relative flex items-center gap-3.5 rounded-2xl border p-4 shadow-xs transition-all duration-200 overflow-hidden',
        // Failed / Cancelled state: Red outline
        failed
          ? 'border-2 border-red-500 bg-red-50/20 ring-1 ring-red-500/20'
          : isInvalid
          ? 'border-2 border-amber-500/90 bg-amber-50/25 ring-1 ring-amber-500/20'
          : 'border-[#850E35]/12 bg-white hover:border-[#850E35]/25',
        className
      )}
    >
      {/* Progress Fill Background (as seen in Untitled UI demo) */}
      {isUploading && (
        <div
          className="absolute inset-y-0 left-0 bg-[#850E35]/8 dark:bg-white/10 transition-all duration-300 pointer-events-none rounded-xl"
          style={{ width: `${progress}%` }}
        />
      )}

      {/* File Type Dog-Eared Badge */}
      <FileTypeBadge ext={ext} isFailed={failed} isInvalid={isInvalid} />

      {/* File Details */}
      <div className="relative z-10 flex min-w-0 flex-1 flex-col justify-center">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-semibold text-[#1E040D] max-w-[280px] sm:max-w-md" title={name}>
            {name}
          </p>

          {/* Delete / Remove Action */}
          {onDelete && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="rounded-lg p-1 text-[#850E35]/40 transition-colors hover:bg-[#850E35]/10 hover:text-[#850E35] active:scale-95 cursor-pointer"
              title="Remove file"
            >
              <Trash2 className="h-4 w-4 stroke-[1.8]" />
            </button>
          )}
        </div>

        {/* State Indicators */}
        {failed ? (
          /* Cancelled / Upload Failed State */
          <div className="mt-1">
            <p className="text-xs text-[#1E040D]/65 font-medium">
              Upload failed, please try again
            </p>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="mt-1 text-xs font-bold text-red-600 hover:text-red-700 hover:underline cursor-pointer transition-colors"
              >
                Try again
              </button>
            )}
          </div>
        ) : isInvalid ? (
          /* Wrong File Warning Card */
          <div className="mt-1 flex items-center gap-1.5 text-xs text-amber-700 font-medium">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-600" />
            <span>{errorMessage || 'Wrong file format or size limit exceeded'}</span>
          </div>
        ) : (
          /* Normal Uploading or Completed State */
          <div className="mt-1 flex items-center gap-2 text-xs text-[#1E040D]/70 font-medium">
            <span>{getReadableFileSize(size)}</span>

            <span className="text-[#850E35]/30">|</span>

            {isComplete ? (
              <div className="flex items-center gap-1.5 text-emerald-600 font-semibold">
                <CheckCircle2 className="h-4 w-4 stroke-[2.5]" />
                <span>100%</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-[#850E35] font-semibold">
                <Loader2 className="h-4 w-4 animate-spin text-[#850E35]" />
                <span>{progress}%</span>
              </div>
            )}
          </div>
        )}

        {/* Thin Linear Progress Bar for active uploads */}
        {isUploading && (
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#850E35]/15">
            <div
              className="h-full rounded-full bg-[#850E35] transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>
    </li>
  );
};

export const FileUploadRoot = ({ className, children, ...props }) => (
  <div className={cn('flex flex-col gap-4 w-full', className)} {...props}>
    {children}
  </div>
);

export const FileUploadList = ({ className, children, ...props }) => (
  <ul className={cn('flex flex-col gap-3 w-full', className)} {...props}>
    {children}
  </ul>
);

/**
 * Compound FileUpload namespace
 */
export const FileUpload = {
  Root: FileUploadRoot,
  DropZone: FileUploadDropZone,
  List: FileUploadList,
  Item: FileListItem,
  ListItemProgressBar: FileListItem,
};

/**
 * Default Plug-and-Play FileUpload component with built-in state handling
 */
export default function FileUploadComponent({
  hint = 'SVG, PNG, JPG or GIF (max. 800×400px)',
  maxSize = 15 * 1024 * 1024,
  maxFiles = 1,
  accept,
  allowsMultiple = false,
  isDisabled = false,
  initialFiles = [],
  onFilesChange,
  className,
  ...props
}) {
  const [files, setFiles] = useState(initialFiles);

  const effectiveMaxFiles = allowsMultiple ? (maxFiles ?? Infinity) : 1;
  const isLimitReached = files.length >= effectiveMaxFiles;
  const isDropzoneDisabled = isDisabled || isLimitReached;

  // Smoothly animate progress for newly uploaded files
  useEffect(() => {
    const activeUploading = files.some((f) => !f.failed && !f.isInvalid && f.progress < 100);
    if (!activeUploading) return;

    const interval = setInterval(() => {
      setFiles((prev) => {
        let reachedComplete = false;
        const next = prev.map((item) => {
          if (!item.failed && !item.isInvalid && item.progress < 100) {
            const nextProgress = Math.min(100, item.progress + 25);
            if (nextProgress === 100) {
              reachedComplete = true;
            }
            return {
              ...item,
              progress: nextProgress,
            };
          }
          return item;
        });

        if (reachedComplete) {
          const completed = next.filter((f) => !f.failed && !f.isInvalid && f.progress === 100);
          onFilesChange?.(completed.map((i) => i.file || i));
        }

        return next;
      });
    }, 250);

    return () => clearInterval(interval);
  }, [files, onFilesChange]);

  const handleDropFiles = (acceptedFiles) => {
    if (isDropzoneDisabled) return;

    const availableSlots = Math.max(0, effectiveMaxFiles - files.length);
    const filesToTake = allowsMultiple ? acceptedFiles.slice(0, availableSlots) : acceptedFiles.slice(0, 1);

    if (!filesToTake.length) return;

    const newItems = filesToTake.map((file) => ({
      id: Math.random().toString(36).substring(2, 9),
      file,
      name: file.name,
      size: file.size,
      progress: 15, // Starts upload animation
      failed: false,
      isInvalid: false,
    }));

    const updated = allowsMultiple ? [...files, ...newItems] : newItems;
    setFiles(updated);
    // Only emit 100% completed files - not files currently in progress of being uploaded
    const completed = updated.filter((f) => !f.failed && !f.isInvalid && f.progress === 100);
    onFilesChange?.(completed.map((i) => i.file || i));
  };

  const handleDropUnacceptedFiles = (unacceptedFiles) => {
    if (isDropzoneDisabled) return;

    const invalidItems = Array.from(unacceptedFiles || []).map((file) => ({
      id: Math.random().toString(36).substring(2, 9),
      file,
      name: file.name,
      size: file.size,
      progress: 0,
      failed: false,
      isInvalid: true,
      errorMessage: 'Wrong file format • Unsupported file type',
    }));

    const updated = allowsMultiple ? [...files, ...invalidItems] : invalidItems;
    setFiles(updated);
    const completed = updated.filter((f) => !f.failed && !f.isInvalid && f.progress === 100);
    onFilesChange?.(completed.map((i) => i.file || i));
  };

  const handleSizeLimitExceed = (oversizedFiles) => {
    if (isDropzoneDisabled) return;

    const invalidItems = Array.from(oversizedFiles || []).map((file) => ({
      id: Math.random().toString(36).substring(2, 9),
      file,
      name: file.name,
      size: file.size,
      progress: 0,
      failed: false,
      isInvalid: true,
      errorMessage: `File exceeds maximum ${getReadableFileSize(maxSize)} limit`,
    }));

    const updated = allowsMultiple ? [...files, ...invalidItems] : invalidItems;
    setFiles(updated);
    const completed = updated.filter((f) => !f.failed && !f.isInvalid && f.progress === 100);
    onFilesChange?.(completed.map((i) => i.file || i));
  };

  const handleDelete = (id) => {
    const updated = files.filter((f) => f.id !== id);
    setFiles(updated);
    const completed = updated.filter((f) => !f.failed && !f.isInvalid && f.progress === 100);
    onFilesChange?.(completed.map((i) => i.file || i));
  };

  const handleRetry = (id) => {
    setFiles((prev) => {
      const next = prev.map((item) => {
        if (item.id === id) {
          return {
            ...item,
            failed: false,
            isInvalid: false,
            progress: 20, // restarts upload animation
          };
        }
        return item;
      });
      const completed = next.filter((f) => !f.failed && !f.isInvalid && f.progress === 100);
      onFilesChange?.(completed.map((i) => i.file || i));
      return next;
    });
  };

  return (
    <FileUpload.Root className={className} {...props}>
      <FileUpload.DropZone
        hint={hint}
        maxSize={maxSize}
        accept={accept}
        allowsMultiple={allowsMultiple}
        isDisabled={isDropzoneDisabled}
        isLimitReached={isLimitReached}
        disabledHint="Delete the uploaded file below to upload another"
        onDropFiles={handleDropFiles}
        onDropUnacceptedFiles={handleDropUnacceptedFiles}
        onSizeLimitExceed={handleSizeLimitExceed}
      />

      {files.length > 0 && (
        <FileUpload.List>
          {files.map((item) => (
            <FileUpload.Item
              key={item.id}
              name={item.name}
              size={item.size}
              progress={item.progress}
              failed={item.failed}
              isInvalid={item.isInvalid}
              errorMessage={item.errorMessage}
              onDelete={() => handleDelete(item.id)}
              onRetry={() => handleRetry(item.id)}
            />
          ))}
        </FileUpload.List>
      )}
    </FileUpload.Root>
  );
}
