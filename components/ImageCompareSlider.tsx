import React, { useState, useRef, useCallback, MouseEvent as ReactMouseEvent, TouchEvent as ReactTouchEvent } from 'react';
import { DownloadIcon } from './icons';

interface ImageCompareSliderProps {
  originalImageUrl: string;
  editedImageUrl: string;
  onDownload: () => void;
}

const ImageCompareSlider: React.FC<ImageCompareSliderProps> = ({ originalImageUrl, editedImageUrl, onDownload }) => {
  const [sliderPosition, setSliderPosition] = useState(50);
  const isDragging = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMove = useCallback((clientX: number) => {
    if (!isDragging.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percent = (x / rect.width) * 100;
    setSliderPosition(percent);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    handleMove(e.clientX);
  }, [handleMove]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (e.touches[0]) {
      handleMove(e.touches[0].clientX);
    }
  }, [handleMove]);
  
  const handleInteractionEnd = useCallback(() => {
    isDragging.current = false;
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleInteractionEnd);
    window.removeEventListener('touchmove', handleTouchMove);
    window.removeEventListener('touchend', handleInteractionEnd);
  }, [handleMouseMove, handleTouchMove]);

  const handleInteractionStart = useCallback((e: ReactMouseEvent | ReactTouchEvent) => {
    e.preventDefault();
    isDragging.current = true;
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleInteractionEnd);
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleInteractionEnd);
  }, [handleInteractionEnd, handleMouseMove, handleTouchMove]);

  return (
    <div className="w-full h-full flex flex-col">
       <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-semibold text-slate-300">Before & After Comparison</h3>
            <button 
                onClick={onDownload} 
                className="flex items-center px-3 py-1.5 bg-sky-600 text-white rounded-md hover:bg-sky-700 transition-colors duration-200 text-sm">
                <DownloadIcon className="w-4 h-4 mr-2"/>
                Download Edited
            </button>
        </div>
      <div
        ref={containerRef}
        className="relative w-full aspect-square rounded-xl overflow-hidden cursor-ew-resize select-none bg-slate-800 shadow-lg"
      >
        <img
          src={originalImageUrl}
          alt="Original"
          className="absolute top-0 left-0 w-full h-full object-contain pointer-events-none"
        />
        <div
          className="absolute top-0 left-0 w-full h-full object-contain pointer-events-none overflow-hidden"
          style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
        >
          <img
            src={editedImageUrl}
            alt="Edited"
            className="absolute top-0 left-0 w-full h-full object-contain pointer-events-none"
          />
        </div>
        <div
          className="absolute top-0 bottom-0 w-1 bg-white/50 backdrop-blur-sm"
          style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }}
        >
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 border-2 border-white shadow-lg cursor-ew-resize flex items-center justify-center touch-none"
            onMouseDown={handleInteractionStart}
            onTouchStart={handleInteractionStart}
            role="separator"
            aria-valuenow={sliderPosition}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Image comparison slider"
          >
            <svg className="w-6 h-6 text-slate-700 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageCompareSlider;
