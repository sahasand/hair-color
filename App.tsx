
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { fileToBase64 } from './utils/fileUtils';
import { editImageWithGemini } from './services/geminiService';
import { UploadIcon, WandIcon, DownloadIcon, SpinnerIcon, CheckIcon, UndoIcon, RedoIcon } from './components/icons';
import ImageCompareSlider from './components/ImageCompareSlider';

const HAIR_COLORS = [
    // Natural Blondes
    { name: 'Platinum Blonde', color: '#E2DED5' },
    { name: 'Golden Blonde', color: '#f5e6a8' },
    { name: 'Ash Blonde', color: '#BDB5A7' },
    { name: 'Honey Blonde', color: '#D4A76A' },

    // Natural Brunettes
    { name: 'Light Brown', color: '#A9886C' },
    { name: 'Chestnut Brown', color: '#8B5A3D' },
    { name: 'Chocolate Brown', color: '#6d4c41' },
    { name: 'Espresso', color: '#4E342E' },

    // Natural Reds
    { name: 'Ginger', color: '#B85B3F' },
    { name: 'Auburn', color: '#A52A2A' },
    { name: 'Copper', color: '#B3672B' },

    // Blacks & Grays
    { name: 'Soft Black', color: '#2C2C2C' },
    { name: 'Jet Black', color: '#0A0A0A' },
    { name: 'Silver Gray', color: '#C0C0C0' },
    
    // Fantasy & Vivids
    { name: 'Pastel Pink', color: '#F8C8DC' },
    { name: 'Magenta', color: '#D9017A' },
    { name: 'Lavender', color: '#E6E6FA' },
    { name: 'Deep Purple', color: '#4B0082' },
    { name: 'Sky Blue', color: '#87CEEB' },
    { name: 'Emerald Green', color: '#50C878' },
    { name: 'Fiery Orange', color: '#FF7518' },
];

const REFINEMENTS = [
    { id: 'darkness', label: 'Darken', prompt: (value: number) => `Make the hair ${value}% darker` },
    { id: 'lightness', label: 'Lighten', prompt: (value: number) => `Make the hair ${value}% lighter` },
    { id: 'highlights', label: 'Highlights', prompt: (value: number) => `Add highlights with ${value}% intensity` },
    { id: 'vibrancy', label: 'Vibrancy', prompt: (value: number) => `Make the hair color ${value}% more vibrant` },
    { id: 'softness', label: 'Soften Shade', prompt: (value: number) => `Make the hair shade ${value}% softer` },
    { id: 'naturalness', label: 'Natural Look', prompt: (value: number) => `Make the hair look ${value}% more natural` },
];

type ImagePlaceholderProps = {
  text: string;
};
const ImagePlaceholder: React.FC<ImagePlaceholderProps> = ({ text }) => (
  <div className="flex flex-col items-center justify-center w-full h-full border-2 border-dashed border-slate-600 rounded-xl bg-slate-800/50 text-slate-400">
    <UploadIcon className="w-12 h-12 mb-4" />
    <span className="text-center">{text}</span>
  </div>
);

type ImagePreviewProps = {
  title: string;
  imageUrl: string;
};
const ImagePreview: React.FC<ImagePreviewProps> = ({ title, imageUrl }) => (
  <div className="w-full h-full flex flex-col">
    <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-semibold text-slate-300">{title}</h3>
    </div>
    <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-slate-800 shadow-lg">
      <img src={imageUrl} alt={title} className="object-contain w-full h-full" />
    </div>
  </div>
);


export default function App() {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [hoveredColor, setHoveredColor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [refinementValues, setRefinementValues] = useState<Record<string, number>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);
  const debounceTimer = useRef<number | null>(null);

  const editedImage = history[historyIndex] ?? null;

  useEffect(() => {
    // Cleanup timeout on component unmount
    return () => {
        if (debounceTimer.current) {
            clearTimeout(debounceTimer.current);
        }
    };
  }, []);

  const handleImageUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        setError(null);
        setHistory([]);
        setHistoryIndex(-1);
        setSelectedColor(null);
        setRefinementValues({});
        const base64 = await fileToBase64(file);
        setOriginalImage(base64);
      } catch (err) {
        setError("Failed to load image. Please try another file.");
      }
    }
  }, []);

  const handleSubmit = async () => {
    if (!originalImage || !selectedColor) {
      setError("Please upload an image and select a hair color.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setRefinementValues({}); // Reset refinement sliders for a new base color

    const prompt = `Change the person's hair color to ${selectedColor}. Only change the hair color and nothing else in the image.`;

    try {
      const result = await editImageWithGemini(originalImage, prompt);
      // Add to history, creating a new branch if we have undone steps
      const newHistory = [...history.slice(0, historyIndex + 1), result];
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefinement = useCallback(async (refinementPrompt: string) => {
    const currentImage = history[historyIndex];
    if (!currentImage || !selectedColor) {
      setError("Please generate a base image before refining it.");
      return;
    }
    setIsLoading(true);
    setError(null);

    const prompt = `${refinementPrompt} for the person's ${selectedColor} hair. Only modify the hair.`;

    try {
      const result = await editImageWithGemini(currentImage, prompt);
      const newHistory = [...history.slice(0, historyIndex + 1), result];
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  }, [history, historyIndex, selectedColor]);

  const handleRefinementChange = useCallback((refinementId: string, value: number, promptFn: (val: number) => string) => {
    setRefinementValues(prev => ({ ...prev, [refinementId]: value }));

    if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = window.setTimeout(() => {
        if (value > 0) { // Only apply if slider is not at 0
            const prompt = promptFn(value);
            handleRefinement(prompt);
        }
    }, 500);
  }, [handleRefinement]);
  
  const handleDownload = () => {
    if(!editedImage) return;
    const link = document.createElement('a');
    link.href = editedImage;
    link.download = `edited-hair-color-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleUndo = () => {
      if (historyIndex > 0) {
          setHistoryIndex(historyIndex - 1);
          setRefinementValues({}); // Reset sliders on undo for simplicity
      }
  };

  const handleRedo = () => {
      if (historyIndex < history.length - 1) {
          setHistoryIndex(historyIndex + 1);
          setRefinementValues({}); // Reset sliders on redo for simplicity
      }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 font-sans p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="text-center mb-10">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-500">
            AI Hair Color Changer
          </h1>
          <p className="mt-4 text-lg text-slate-400">
            Try on a new hair color in seconds. Upload a photo to begin.
          </p>
        </header>

        {error && (
            <div className="my-4 p-4 bg-red-900/50 border border-red-700 text-red-300 rounded-lg text-center" role="alert">
                {error}
            </div>
        )}

        <main className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Controls Column */}
          <div className="lg:col-span-1 flex flex-col gap-8 p-6 bg-slate-800/50 rounded-2xl border border-slate-700 h-fit">
            
            <div>
                <h3 className="text-lg font-semibold text-slate-300 mb-3">1. Upload Photo</h3>
                <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors"
                >
                    <UploadIcon className="w-5 h-5" />
                    <span>{originalImage ? 'Change Photo' : 'Select a Photo'}</span>
                </button>
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                    accept="image/png, image/jpeg, image/webp"
                    className="hidden"
                />
            </div>
            
            <div className={`flex flex-col gap-4 transition-opacity duration-300 ${!originalImage ? 'opacity-50 pointer-events-none' : ''}`}>
              <h3 className="text-lg font-semibold text-slate-300">2. Choose a Color</h3>
              <div className="flex flex-wrap gap-4 items-center justify-center sm:justify-start">
                {HAIR_COLORS.map(({ name, color }) => (
                  <div
                    key={name}
                    className="relative flex flex-col items-center"
                    onMouseEnter={() => setHoveredColor(name)}
                    onMouseLeave={() => setHoveredColor(null)}
                  >
                    <div className={`
                      absolute bottom-full mb-3 px-3 py-1 text-sm font-semibold text-white bg-slate-700 rounded-md shadow-lg
                      transition-all duration-200 ease-in-out z-10
                      ${hoveredColor === name ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1 pointer-events-none'}
                    `}>
                      {name}
                      <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-slate-700"></div>
                    </div>

                    <button
                      onClick={() => setSelectedColor(name)}
                      disabled={!originalImage || isLoading}
                      className={`
                        w-10 h-10 rounded-full border-2 border-white/10 focus:outline-none transition-all duration-200 ease-in-out flex items-center justify-center
                        ${selectedColor === name ? 'ring-2 ring-offset-2 ring-offset-slate-800/50 ring-indigo-500 scale-110' : 'hover:scale-110'}
                        ${(!originalImage || isLoading) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                      `}
                      style={{ backgroundColor: color }}
                      aria-label={`Select ${name} hair color`}
                    >
                      {selectedColor === name && <CheckIcon className="w-5 h-5 text-white" style={{ filter: 'drop-shadow(0 1px 1px rgb(0 0 0 / 0.7))' }} />}
                    </button>
                  </div>
                ))}
              </div>
            </div>
            
            <button
              onClick={handleSubmit}
              disabled={!originalImage || !selectedColor || isLoading}
              className="w-full flex items-center justify-center p-4 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 disabled:bg-slate-700 disabled:text-slate-400 disabled:cursor-not-allowed transition-all duration-200"
            >
              {isLoading && !editedImage ? (
                <>
                  <SpinnerIcon className="animate-spin -ml-1 mr-3 h-5 w-5" />
                  Generating...
                </>
              ) : (
                <>
                  <WandIcon className="w-5 h-5 mr-2" />
                  Change Hair Color
                </>
              )}
            </button>

            {editedImage && (
              <div className="flex flex-col pt-6 border-t border-slate-700">
                <div className="flex justify-between items-center mb-3">
                    <h3 className="text-lg font-semibold text-slate-300">3. Refine The Look</h3>
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={handleUndo} 
                            disabled={historyIndex <= 0 || isLoading}
                            className="p-2 rounded-md bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            aria-label="Undo change"
                        >
                            <UndoIcon className="w-5 h-5"/>
                        </button>
                        <button 
                            onClick={handleRedo} 
                            disabled={historyIndex >= history.length - 1 || isLoading}
                            className="p-2 rounded-md bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            aria-label="Redo change"
                        >
                            <RedoIcon className="w-5 h-5"/>
                        </button>
                    </div>
                </div>
                <div className={`flex flex-col gap-4 ${isLoading ? 'opacity-50 pointer-events-none' : ''}`}>
                    {REFINEMENTS.map(({ id, label, prompt }) => (
                        <div key={id}>
                            <label htmlFor={id} className="flex justify-between items-center text-sm font-medium text-slate-300 mb-1">
                                <span>{label}</span>
                                <span className="text-slate-400 font-mono text-xs bg-slate-700/50 px-1.5 py-0.5 rounded">{refinementValues[id] || 0}%</span>
                            </label>
                            <input
                                id={id}
                                type="range"
                                min="0"
                                max="100"
                                step="1"
                                value={refinementValues[id] || 0}
                                onChange={(e) => handleRefinementChange(id, parseInt(e.target.value, 10), prompt)}
                                disabled={isLoading}
                                className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                                aria-label={`${label} intensity`}
                            />
                        </div>
                    ))}
                </div>
              </div>
            )}
          </div>

          {/* Result Column */}
          <div className="lg:col-span-2 flex items-center justify-center p-6 bg-slate-800/50 rounded-2xl border border-slate-700 min-h-[400px] lg:min-h-full">
            <div className="w-full h-full relative">
                {isLoading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-800/80 backdrop-blur-sm rounded-xl z-10">
                        <SpinnerIcon className="w-12 h-12 animate-spin text-sky-400" />
                        <p className="mt-4 text-lg">Gemini is working its magic...</p>
                        <p className="text-sm text-slate-400">Refining the image...</p>
                    </div>
                )}
                
                {!originalImage ? (
                    <ImagePlaceholder text="Upload an image to get started" />
                ) : !editedImage ? (
                    <ImagePreview title="Original Image" imageUrl={originalImage} />
                ) : (
                    <ImageCompareSlider
                        originalImageUrl={originalImage}
                        editedImageUrl={editedImage}
                        onDownload={handleDownload}
                    />
                )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
