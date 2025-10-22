import React, { useState, useRef, useCallback } from 'react';
import { fileToBase64 } from './utils/fileUtils';
import { editImageWithGemini } from './services/geminiService';
import { UploadIcon, WandIcon, DownloadIcon, SpinnerIcon, CheckIcon } from './components/icons';

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

const REFINEMENT_PROMPTS = [
    'Make it darker',
    'Make it lighter',
    'Add highlights',
    'A softer shade',
    'More vibrant',
    'A more natural look'
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
  onDownload?: () => void;
};
const ImagePreview: React.FC<ImagePreviewProps> = ({ title, imageUrl, onDownload }) => (
  <div className="w-full h-full flex flex-col">
    <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-semibold text-slate-300">{title}</h3>
        {onDownload && (
            <button 
                onClick={onDownload} 
                className="flex items-center px-3 py-1.5 bg-sky-600 text-white rounded-md hover:bg-sky-700 transition-colors duration-200 text-sm">
                <DownloadIcon className="w-4 h-4 mr-2"/>
                Download
            </button>
        )}
    </div>
    <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-slate-800 shadow-lg">
      <img src={imageUrl} alt={title} className="object-contain w-full h-full" />
    </div>
  </div>
);


export default function App() {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [editedImage, setEditedImage] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [hoveredColor, setHoveredColor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        setError(null);
        setEditedImage(null);
        setSelectedColor(null);
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
    setEditedImage(null);

    const prompt = `Change the person's hair color to ${selectedColor}. Only change the hair color and nothing else in the image.`;

    try {
      const result = await editImageWithGemini(originalImage, prompt);
      setEditedImage(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefinement = async (refinementPrompt: string) => {
    if (!editedImage || !selectedColor) {
      setError("Please generate a base image before refining it.");
      return;
    }
    setIsLoading(true);
    setError(null);

    const prompt = `${refinementPrompt} for the person's ${selectedColor} hair. Only modify the hair.`;

    try {
      // Use the *edited* image as the source for refinement
      const result = await editImageWithGemini(editedImage, prompt);
      setEditedImage(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleDownload = () => {
    if(!editedImage) return;
    const link = document.createElement('a');
    link.href = editedImage;
    link.download = `edited-hair-color-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 font-sans p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="text-center mb-10">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-500">
            AI Hair Color Changer
          </h1>
          <p className="mt-4 text-lg text-slate-400">
            Upload a photo, pick a color, and refine your new look with AI.
          </p>
        </header>

        {error && (
            <div className="my-4 p-4 bg-red-900/50 border border-red-700 text-red-300 rounded-lg text-center" role="alert">
                {error}
            </div>
        )}

        <main className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Controls Column */}
          <div className="flex flex-col gap-8 p-6 bg-slate-800/50 rounded-2xl border border-slate-700">
            <div 
              className="w-full aspect-square cursor-pointer" 
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageUpload}
                accept="image/png, image/jpeg, image/webp"
                className="hidden"
              />
              {originalImage ? (
                <ImagePreview title="Original Image" imageUrl={originalImage} />
              ) : (
                <ImagePlaceholder text="Click to upload an image" />
              )}
            </div>
            
            <div className="flex flex-col gap-4">
              <label className="font-semibold text-slate-300">Choose a Color</label>
              <div className="flex flex-wrap gap-4 items-center justify-center sm:justify-start">
                {HAIR_COLORS.map(({ name, color }) => (
                  <div
                    key={name}
                    className="relative flex flex-col items-center"
                    onMouseEnter={() => setHoveredColor(name)}
                    onMouseLeave={() => setHoveredColor(null)}
                  >
                    {/* Custom Tooltip */}
                    <div className={`
                      absolute bottom-full mb-3 px-3 py-1 text-sm font-semibold text-white bg-slate-700 rounded-md shadow-lg
                      transition-all duration-200 ease-in-out z-10
                      ${hoveredColor === name ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1 pointer-events-none'}
                    `}>
                      {name}
                      {/* Tooltip Arrow */}
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
              className="w-full flex items-center justify-center p-4 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 disabled:bg-slate-700 disabled:text-slate-400 disabled:cursor-not-allowed transition-all duration-200 mt-auto"
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

            {editedImage && !isLoading && (
              <div className="flex flex-col pt-6 border-t border-slate-700">
                <label className="mb-3 font-semibold text-slate-300">Refine The Look</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {REFINEMENT_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => handleRefinement(prompt)}
                      disabled={isLoading}
                      className="px-3 py-2 text-sm text-center bg-slate-700 text-slate-200 rounded-md hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Result Column */}
          <div className="flex items-center justify-center p-6 bg-slate-800/50 rounded-2xl border border-slate-700 min-h-[300px] lg:min-h-full">
            <div className="w-full h-full relative">
                {isLoading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-800/80 backdrop-blur-sm rounded-xl z-10">
                        <SpinnerIcon className="w-12 h-12 animate-spin text-sky-400" />
                        <p className="mt-4 text-lg">Gemini is working its magic...</p>
                    </div>
                )}
                {editedImage ? (
                    <ImagePreview title="Edited Image" imageUrl={editedImage} onDownload={handleDownload}/>
                ) : (
                    <div className="flex items-center justify-center w-full h-full text-slate-400">
                        Your new hair color will appear here.
                    </div>
                )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}