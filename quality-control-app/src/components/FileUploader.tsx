"use client";

import React, { useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { extractImagesFromExcel } from '../utils/excelExtractor';
import { processImageWithOCR_API } from '../workers/ocrWorker';
import { checkGrammar } from '../utils/languageTool';

export interface ProcessedRow {
  imageId: string;
  previewUrl: string;
  caption: string;
  extractedText: string;
  grammarErrors: any[]; 
  status: 'clean' | 'error';
  blob: Blob;
}

// THE NEW HELPER: Measures the physical pixels of the image
const getImageDimensions = (url: string): Promise<{ width: number, height: number }> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.width, height: img.height });
    img.onerror = () => resolve({ width: 0, height: 0 }); // Failsafe
    img.src = url;
  });
};

export default function FileUploader() {
  const [extractedData, setExtractedData] = useState<ProcessedRow[]>([]);

  // Cleanup Blob URLs to prevent memory leaks
  useEffect(() => {
    return () => {
      extractedData.forEach(item => {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      });
    };
  }, [extractedData]);

  const onDrop = async (acceptedFiles: File[]) => {
    for (const file of acceptedFiles) {
      const images = await extractImagesFromExcel(file);
      
      for (const imageItem of images) {
        const { blob: imageBlob, previewUrl, caption } = imageItem;

        console.log(`Checking extracted image - Size: ${imageBlob.size} bytes`);

        // 1. The Size Gate
        if (imageBlob.size < 5000) {
          console.log("Skipped: Artifact is too small.");
          URL.revokeObjectURL(previewUrl);
          continue; 
        }

        // 2. THE NEW DIMENSION GATE
        const dimensions = await getImageDimensions(previewUrl);
        if (dimensions.width < 50 || dimensions.height < 50) {
          console.log(`Skipped: Ghost image detected by dimensions (${dimensions.width}x${dimensions.height}).`);
          URL.revokeObjectURL(previewUrl);
          continue; // Toss it out before it hits the API!
        }

        // 3. Get text from OCR.space
        const rawText = await processImageWithOCR_API(imageBlob);

        // 4. Check for grammar/spelling errors
        let grammarErrors: any[] = [];
        if (rawText.trim()) {
          try {
            grammarErrors = await checkGrammar(rawText);
          } catch (error) {
            console.error("Grammar check failed:", error);
          }
        }

        // 5. Determine if the image is 'clean' or has 'errors'
        const status = grammarErrors.length > 0 ? 'error' : 'clean';

        setExtractedData(prev => [
          ...prev, 
          { 
            imageId: previewUrl, 
            previewUrl, 
            caption,
            extractedText: rawText,
            grammarErrors, 
            status, 
            blob: imageBlob 
          }
        ]);
      }
    }
  };

  const { getRootProps, getInputProps } = useDropzone({ onDrop });

  return (
    <div className="p-4">
      <div {...getRootProps()} className="rounded-[30px] bg-white/30 backdrop-blur-xs border-1 border p-10 text-center cursor-pointer hover:bg-white-100">
        <input {...getInputProps()} />
        <p>Drag & drop Excel files here</p>
      </div>

      <div className="grid grid-cols-2 gap-6 mt-8">
        {extractedData.map((row, index) => (
          <div key={index} className={`border p-4 rounded-[30px] shadow-sm ${row.status === 'error' ? 'backdrop-blur-lg border-red-300 bg-red/20' : 'backdrop-blur-lg border-green-300 bg-white/20'}`}>
            
            {/* The Evidence (Image & Caption) */}
            <div className="backdrop-blur-xs mb-4 bg-white/10 border p-3 rounded-[22px]">
              <div className="flex justify-center mb-3">
                <img src={row.previewUrl} alt="extracted" className="border border-white max-w-full h-48 object-contain rounded-[18px]" />
              </div>
              
              <div className="bg-white/25 p-4 rounded-[18px] border border-gray-200">
                <span className="text-xs font-bold text-white uppercase tracking-wider">Excel Caption</span>
                <p className="text-sm text-gray-800 font-medium mt-1">{row.caption}</p>
              </div>
            </div>
            
            {/* The Findings (Text & Errors) */}
            <div>
              <h3 className="font-bold text-white mb-2">Extracted Text:</h3>
              <p className="text-sm text-white bg-white/30 p-3 border rounded-[20px] mb-4">
                {row.extractedText || "No text detected."}
              </p>

              {row.grammarErrors && row.grammarErrors.length > 0 ? (
                <div>
                  <h4 className="font-bold text-red-600 mb-2">Errors Found:</h4>
                  <ul className="space-y-3">
                    {row.grammarErrors.map((err: any, errIdx: number) => {
                      const badWord = row.extractedText.substring(err.offset, err.offset + err.length);
                      const suggestion = err.replacements[0]?.value || "No suggestion";

                      return (
                        <li key={errIdx} className="text-sm bg-white p-2 border border-red-200 rounded">
                          <p className="font-semibold text-gray-800 mb-1">{err.message}</p>
                          <div className="flex items-center gap-2">
                            <span className="line-through text-red-500">{badWord}</span>
                            <span className="text-gray-400">➔</span>
                            <span className="font-bold text-green-600">{suggestion}</span>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : (
                <p className="text-sm font-bold text-white-600">No spelling or grammar errors detected!</p>
              )}
            </div>

          </div>
        ))}
      </div>
    </div>
  );
}