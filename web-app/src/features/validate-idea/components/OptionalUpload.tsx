/**
 * Vision2Real – Optional Supporting Context Component
 * Permanently visible context upload section for pitch decks, PRDs, research, PDFs, images, or notes.
 * Completely optional — validation never depends on uploaded files.
 */

import { useRef, type ChangeEvent, type DragEvent } from 'react';
import type { UploadedFileContext } from '@/types/validation';

interface OptionalUploadProps {
  files: UploadedFileContext[];
  onFilesChange: (files: UploadedFileContext[]) => void;
}

export function OptionalUpload({ files, onFilesChange }: OptionalUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFiles = (fileList: FileList) => {
    const newContexts: UploadedFileContext[] = Array.from(fileList).map((f) => ({
      id: `file_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: f.name,
      size: f.size,
      type: f.type || 'Document',
      uploadedAt: new Date().toISOString(),
      rawFile: f,
    }));

    onFilesChange([...files, ...newContexts]);
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleRemove = (id: string) => {
    onFilesChange(files.filter((f) => f.id !== id));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="v2r-upload-section">
      <div style={{ marginBottom: 'var(--space-md)' }}>
        <h4 style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--weight-bold)', color: 'var(--color-text-primary)' }}>
          Optional Supporting Context
        </h4>
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', marginTop: 'var(--space-4xs)', lineHeight: 'var(--leading-relaxed)' }}>
          Help Vision2Real better understand your idea. Uploading supporting documents is completely optional, but additional context can improve the quality of the validation.
        </p>
      </div>

      <div
        className="v2r-upload-dropzone"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
        aria-label="Upload supporting context documents"
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            fileInputRef.current?.click();
          }
        }}
      >
        <svg
          className="v2r-upload-dropzone__icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        <div className="v2r-upload-dropzone__title">
          Attach Supporting Documents (Optional)
        </div>
        <div className="v2r-upload-dropzone__subtitle">
          Pitch Deck, PRD, Market Research, PDFs, Images, Notes
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          style={{ display: 'none' }}
          onChange={handleInputChange}
          accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.png,.jpg,.jpeg,.md"
        />
      </div>

      {files.length > 0 && (
        <div className="v2r-upload-file-list" aria-label="Uploaded context files">
          {files.map((file) => (
            <div key={file.id} className="v2r-upload-chip">
              <span>📄 {file.name}</span>
              <span style={{ opacity: 0.6 }}>({formatFileSize(file.size)})</span>
              <button
                type="button"
                className="v2r-upload-chip__remove"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemove(file.id);
                }}
                aria-label={`Remove ${file.name}`}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
