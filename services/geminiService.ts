
import { GoogleGenAI, Modality } from "@google/genai";

const getMimeTypeFromDataUrl = (dataUrl: string): string | null => {
  const match = dataUrl.match(/^data:(.*?);base64,/);
  return match ? match[1] : null;
};

export const editImageWithGemini = async (
  base64ImageDataUrl: string,
  prompt: string
): Promise<string> => {
  try {
    if (!process.env.API_KEY) {
        throw new Error("API_KEY environment variable not set.");
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const mimeType = getMimeTypeFromDataUrl(base64ImageDataUrl);
    if (!mimeType) {
      throw new Error("Invalid data URL: could not determine MIME type.");
    }

    const base64Data = base64ImageDataUrl.split(',')[1];
    if (!base64Data) {
        throw new Error("Invalid data URL: could not extract base64 data.");
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Data,
              mimeType: mimeType,
            },
          },
          {
            text: prompt,
          },
        ],
      },
      config: {
        responseModalities: [Modality.IMAGE],
      },
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }

    throw new Error("No image data found in the API response.");
  } catch (error) {
    console.error("Error editing image with Gemini:", error);
    if (error instanceof Error) {
        throw new Error(`Failed to edit image: ${error.message}`);
    }
    throw new Error("An unknown error occurred while editing the image.");
  }
};
