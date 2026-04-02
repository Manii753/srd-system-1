'use client';
import { useState } from 'react';
import Image from 'next/image';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

export default function ImageModal({ images = [], currentIndex = 0, onClose }) {
  const [index, setIndex] = useState(currentIndex);

  if (!images.length) return null;

  const prev = () => setIndex((i) => (i > 0 ? i - 1 : images.length - 1));
  const next = () => setIndex((i) => (i + 1) % images.length);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      {/* Close */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white text-app-text font-light hover:text-gray-300"
      >
        <X size={28} />
      </button>

      {/* Image */}
      <div className="relative w-[90vw] max-w-4xl h-[80vh] flex items-center justify-center">
        <Image
          src={images[index]}
          alt={`image-${index}`}
          fill
          className="object-contain rounded-lg"
        />

        {/* Navigation */}
        {images.length > 1 && (
          <>
            <button
              onClick={prev}
              className="absolute left-4 text-white/70 hover:text-white"
            >
              <ChevronLeft size={40} />
            </button>
            <button
              onClick={next}
              className="absolute right-4 text-white/70 hover:text-white"
            >
              <ChevronRight size={40} />
            </button>
          </>
        )}
      </div>

      {/* Counter */}
      <div className="absolute bottom-6 text-white/80 text-app-text">
        {index + 1} / {images.length}
      </div>
    </div>
  );
}

