"use client";

import React, { useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { extractImagesFromExcel } from '../utils/excelExtractor';
import { processImageWithOCR_API } from '../workers/ocrWorker';

// 1. Define the interface directly in this file to avoid missing module errors
export interface ProcessedRow {
  imageId: string;
  previewUrl: string;
  extractedText: string;
  grammarErrors: any[]; 
  status: 'clean' | 'error';
  blob: Blob;
}

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
        const { blob: imageBlob, previewUrl } = imageItem;

        // Process with OCR
        const rawText = await processImageWithOCR_API(imageBlob);

        // Update state ensuring it matches the ProcessedRow interface above
        setExtractedData(prev => [
          ...prev, 
          { 
            imageId: previewUrl, 
            previewUrl, 
            extractedText: rawText,
            grammarErrors: [], 
            status: rawText ? 'error' : 'clean', 
            blob: imageBlob 
          }
        ]);
      }
    }
  };

  const { getRootProps, getInputProps } = useDropzone({ onDrop });

  return (
    <div className="p-4">
      <div {...getRootProps()} className="border-2 border-dashed p-10 text-center cursor-pointer hover:bg-gray-50">
        <input {...getInputProps()} />
        <p>Drag & drop Excel files here</p>
      </div>

      <div className="grid grid-cols-2 gap-4 mt-8">
        {extractedData.map((row, index) => (
          <div key={index} className="border p-2">
            <img src={row.previewUrl} alt="extracted" className="w-32 h-32 object-contain" />
            <p className="mt-2 text-sm">{row.extractedText || "No text detected"}</p>
          </div>
        ))}
      </div>
    </div>
  );
}