'use client';

import { useState, useRef, useEffect } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';

/**
 * ImageUpload — Drag & drop or paste (Ctrl+V) image upload for costing product photos.
 * Images are stored as base64 in the costing document.
 * onChange supports both direct arrays and functional updates.
 */
export default function ImageUpload({ images = [], onChange, disabled }) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const processFile = (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be under 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const newImage = {
        url: e.target.result,
        caption: file.name.replace(/\.[^.]+$/, ''),
      };
      onChangeRef.current?.((prev) => [...(prev || []), newImage]);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;

    const files = Array.from(e.dataTransfer.files);
    files.forEach(processFile);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(processFile);
    e.target.value = '';
  };

  const handleRemove = (idx) => {
    onChangeRef.current?.((prev) => (prev || []).filter((_, i) => i !== idx));
  };

  const handleCaptionChange = (idx, caption) => {
    onChangeRef.current?.((prev) => (prev || []).map((img, i) => i === idx ? { ...img, caption } : img));
  };

  // Paste images from the clipboard (Ctrl+V / right-click → paste) anywhere
  // while the costing form is editable.
  useEffect(() => {
    if (disabled) return;
    const onPaste = (e) => {
      const items = e.clipboardData?.items ? Array.from(e.clipboardData.items) : [];
      const files = items
        .filter(i => i.type.startsWith('image/'))
        .map(i => i.getAsFile())
        .filter(Boolean);
      if (!files.length) return;
      e.preventDefault();
      files.forEach((file) => {
        if (!file.type.startsWith('image/')) return;
        if (file.size > 5 * 1024 * 1024) {
          alert('Image must be under 5MB');
          return;
        }
        const reader = new FileReader();
        reader.onload = (ev) => {
          onChangeRef.current?.((prev) => [
            ...(prev || []),
            { url: ev.target.result, caption: (file.name || 'Pasted image').replace(/\.[^.]+$/, '') },
          ]);
        };
        reader.readAsDataURL(file);
      });
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [disabled]);

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      {!disabled && (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className={`
            border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors
            ${isDragging
              ? 'border-blue-400 bg-blue-50'
              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }
          `}
        >
          <Upload size={20} className="mx-auto mb-1 text-gray-400" />
          <p className="text-[11px] text-gray-500">
            Drag & drop product photos, paste (Ctrl+V) or <span className="text-blue-500 font-medium">browse</span>
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5">PNG, JPG up to 5MB</p>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      )}

      {/* Image previews */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {images.map((img, idx) => (
            <div key={idx} className="relative group border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
              {/* Remove button */}
              {!disabled && (
                <button
                  onClick={() => handleRemove(idx)}
                  className="absolute top-1 right-1 z-10 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={10} />
                </button>
              )}

              {/* Image preview */}
              <div className="aspect-square bg-gray-100 flex items-center justify-center">
                {img.url ? (
                  <img
                    src={img.url}
                    alt={img.caption || 'Product photo'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <ImageIcon size={24} className="text-gray-300" />
                )}
              </div>

              {/* Caption input */}
              {!disabled && (
                <input
                  value={img.caption || ''}
                  onChange={e => handleCaptionChange(idx, e.target.value)}
                  placeholder="Caption..."
                  className="w-full text-[10px] px-2 py-1 border-t border-gray-200 bg-white outline-none focus:bg-blue-50"
                />
              )}
            </div>
          ))}
        </div>
      )}

      {images.length === 0 && disabled && (
        <div className="text-center py-4 text-gray-400 text-xs">
          No images attached
        </div>
      )}
    </div>
  );
}