// Helper to compress massive Excel images so they pass the 1.5MB API limit
const compressImage = async (blob: Blob, maxSizeBytes: number): Promise<Blob> => {
  if (blob.size <= maxSizeBytes) return blob;

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);
    
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(blob);
      
      ctx.drawImage(img, 0, 0);
      canvas.toBlob((compressedBlob) => {
        resolve(compressedBlob || blob);
      }, 'image/jpeg', 0.7); // Forces compression to a lightweight JPEG
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(blob);
    };
    
    img.src = url;
  });
};

export async function processImageWithOCR_API(imageBlob: Blob): Promise<string> {
  try {
    // 1. Safety Check
    if (!(imageBlob instanceof Blob)) {
      console.error("Skipped: Input is not a valid Blob object.");
      return "";
    }

    // 2. Compress if necessary
    const compressedBlob = await compressImage(imageBlob, 1400000); // 1.4MB limit

    // 3. THE FIX: Safely determine file type without crashing
    let fileType = 'JPG'; // Our safe default
    if (compressedBlob.type && compressedBlob.type.includes('/')) {
      fileType = compressedBlob.type.split('/')[1].toUpperCase();
      // Ensure we don't accidentally send something weird
      if (fileType !== 'PNG' && fileType !== 'JPG' && fileType !== 'JPEG') {
          fileType = 'JPG'; 
      }
    }

    // 4. Build API Request with Power-Ups
    const formData = new FormData();
    // DON'T FORGET TO PASTE YOUR ACTUAL OCR.SPACE API KEY HERE!
    formData.append("apikey", process.env.NEXT_PUBLIC_OCR_API_KEY || "YOUR_FALLBACK_KEY"); 
    formData.append("file", compressedBlob, `image.${fileType.toLowerCase()}`);
    formData.append("filetype", fileType);
    
    // OCR Power-ups for blurry/small images
    formData.append("scale", "true");
    formData.append("OCREngine", "2");
    formData.append("detectOrientation", "true");

    const response = await fetch("https://api.ocr.space/parse/image", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();
    
    if (data.IsErroredOnProcessing) {
      console.error("OCR API Error:", data.ErrorMessage);
      return "";
    }

    return data.ParsedResults?.[0]?.ParsedText || "";

  } catch (error: any) {
    console.error("OCR Processing failed:", error);
    return "";
  }
}