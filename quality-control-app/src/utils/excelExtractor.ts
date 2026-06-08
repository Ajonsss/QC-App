import JSZip from 'jszip';

export interface ProcessedRow {
  imageId: string;
  previewUrl: string;
  blob: Blob;
  extractedText?: string;
  grammarErrors?: any[];
  status: 'pending' | 'processing' | 'clean' | 'error';
}

/**
 * Unzips an Excel file and extracts all images as local Blob URLs.
 */
export async function extractImagesFromExcel(
  file: File
): Promise<ProcessedRow[]> {
  const zip = new JSZip();
  const extractedRows: ProcessedRow[] = [];

  try {
    const zipContents = await zip.loadAsync(file);

    const mediaFiles = Object.keys(zipContents.files).filter(
      (fileName) =>
        fileName.startsWith('xl/media/') &&
        !zipContents.files[fileName].dir
    );

    for (const fileName of mediaFiles) {
      const fileData = await zipContents.files[fileName].async('blob');

      const previewUrl = URL.createObjectURL(fileData);

      extractedRows.push({
        imageId: fileName.replace('xl/media/', ''),
        previewUrl,
        blob: fileData,
        status: 'pending',
        extractedText: '',
        grammarErrors: [],
      });
    }

    return extractedRows;
  } catch (error) {
    console.error('Failed to extract images from Excel:', error);

    throw new Error(
      'Could not parse the Excel file. Make sure it is a valid .xlsx document.'
    );
  }
}