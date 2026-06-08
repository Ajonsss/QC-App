// 1. NEW HELPER: The Image Compressor
const compressImage = async (blob: Blob, maxSizeMB: number = 1.4): Promise<Blob> => {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  
  // If the image is already small enough, skip compression entirely
  if (blob.size <= maxSizeBytes) {
    return blob;
  }

  console.warn(`Image is ${(blob.size / 1024 / 1024).toFixed(2)}MB. Compressing...`);

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);

    img.onload = () => {
      URL.revokeObjectURL(url); // Clean up memory
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        resolve(blob); // Fallback if browser fails to create canvas
        return;
      }

      // Scale down the physical dimensions by 20% to help drop file size
      const scale = 0.8; 
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;

      // Draw the scaled image
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Convert to a JPEG at 70% quality (drastically reduces file size)
      canvas.toBlob(
        (compressedBlob) => {
          if (compressedBlob) {
            resolve(compressedBlob);
          } else {
            resolve(blob); // Fallback
          }
        },
        'image/jpeg', // Force JPEG format
        0.7           // 70% quality compression
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(blob); // Fallback if image fails to load
    };

    img.src = url;
  });
};

// 2. YOUR MAIN FUNCTION
export async function processImageWithOCR_API(imageBlob: Blob): Promise<string> {
  if (!(imageBlob instanceof Blob)) {
    console.error("Invalid input: Expected a Blob, but received:", typeof imageBlob, imageBlob);
    return ""; 
  }

  // --- NEW COMPRESSION STEP ---
  // Pass the blob through our compressor before it hits the formData
  const safeBlob = await compressImage(imageBlob);

  const apiKey = 'K81448404688957'; // DO NOT FORGET TO PUT YOUR KEY BACK HERE
  const formData = new FormData();
  
  formData.append('apikey', apiKey);
  
  // We name it .jpg because our compressor specifically outputs a JPEG
  formData.append('file', safeBlob, 'image_file.jpg');

  // Force filetype to JPG
  formData.append('filetype', 'JPG'); 

  // --- API POWER-UPS ---
  formData.append('scale', 'true'); 
  formData.append('OCREngine', '2'); 
  formData.append('detectOrientation', 'true'); 

  try {
    const response = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();

    if (data.IsErroredOnProcessing) {
      console.error(`OCR.space API Error: ${JSON.stringify(data.ErrorMessage)}`);
      return "";
    }

    if (!data.ParsedResults) {
      console.warn("OCR.space API returned an unexpected response:", data);
      return ""; 
    }

    return data.ParsedResults?.[0]?.ParsedText || "";

  } catch (error) {
    console.error("OCR Processing failed:", error);
    return "";
  }
}