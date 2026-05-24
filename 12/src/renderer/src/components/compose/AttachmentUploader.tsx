import React, { useRef, useState } from 'react';
import type { Attachment } from '@shared/types';
import { Button } from '../ui/Button';
import { ProgressBar } from '../ui/ProgressBar';

interface AttachmentUploaderProps {
  attachments: Attachment[];
  onChange: (attachments: Attachment[]) => void;
  maxSize?: number;
  maxFiles?: number;
  disabled?: boolean;
}

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

const getFileIcon = (contentType: string) => {
  if (contentType.startsWith('image/')) {
    return (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    );
  }
  if (contentType.startsWith('video/')) {
    return (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    );
  }
  if (contentType.startsWith('audio/')) {
    return (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
      </svg>
    );
  }
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
};

interface UploadingFile {
  id: string;
  file: File;
  progress: number;
  error?: string;
}

export const AttachmentUploader: React.FC<AttachmentUploaderProps> = ({
  attachments,
  onChange,
  maxSize = 25 * 1024 * 1024,
  maxFiles = 10,
  disabled = false
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || disabled) return;

    const newFiles = Array.from(files);
    const remainingSlots = maxFiles - attachments.length - uploadingFiles.length;

    if (remainingSlots <= 0) {
      return;
    }

    const filesToProcess = newFiles.slice(0, remainingSlots);

    for (const file of filesToProcess) {
      if (file.size > maxSize) {
        continue;
      }

      const uploadId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const uploadingFile: UploadingFile = {
        id: uploadId,
        file,
        progress: 0
      };

      setUploadingFiles(prev => [...prev, uploadingFile]);

      try {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const attachment: Attachment = await window.api.attachment.create({
          filename: file.name,
          contentType: file.type,
          size: file.size,
          content: buffer
        });

        onChange([...attachments, attachment]);
      } catch (error) {
        setUploadingFiles(prev => prev.map(f => 
          f.id === uploadId 
            ? { ...f, error: '上传失败' }
            : f
        ));
      } finally {
        setUploadingFiles(prev => prev.filter(f => f.id !== uploadId));
      }
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleRemove = (attachmentId: string) => {
    onChange(attachments.filter(a => a.id !== attachmentId));
  };

  const handleBrowse = () => {
    inputRef.current?.click();
  };

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        multiple
        disabled={disabled}
        onChange={(e) => handleFileSelect(e.target.files)}
        className="hidden"
      />

      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleBrowse}
        className={`
          border-2 border-dashed rounded-lg p-4 text-center cursor-pointer
          transition-colors duration-200
          ${isDragging
            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
            : 'border-gray-300 dark:border-gray-600 hover:border-primary-400 dark:hover:border-primary-500'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <div className="flex flex-col items-center gap-2">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            拖拽文件到此处，或点击选择文件
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            最大 {formatFileSize(maxSize)} · 最多 {maxFiles} 个文件
          </p>
        </div>
      </div>

      {(attachments.length > 0 || uploadingFiles.length > 0) && (
        <div className="space-y-2">
          {uploadingFiles.map(uploading => (
            <div
              key={uploading.id}
              className="flex items-center gap-3 p-2 rounded-lg bg-gray-50 dark:bg-gray-800"
            >
              <div className="text-gray-400">
                {getFileIcon(uploading.file.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-700 dark:text-gray-300 truncate">
                  {uploading.file.name}
                </p>
                <ProgressBar
                  value={uploading.progress}
                  height="sm"
                  className="mt-1"
                />
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {formatFileSize(uploading.file.size)}
              </span>
            </div>
          ))}

          {attachments.map(attachment => (
            <div
              key={attachment.id}
              className="flex items-center gap-3 p-2 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <div className="text-gray-400">
                {getFileIcon(attachment.contentType)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-700 dark:text-gray-300 truncate">
                  {attachment.filename}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {formatFileSize(attachment.size)}
                </p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); handleRemove(attachment.id); }}
                disabled={disabled}
                className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AttachmentUploader;
