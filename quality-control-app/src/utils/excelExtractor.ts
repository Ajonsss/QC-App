import JSZip from 'jszip';
import * as XLSX from 'xlsx';

export async function extractImagesFromExcel(file: File) {
  const zip = new JSZip();
  const loadedZip = await zip.loadAsync(file);

  // 1. Load SheetJS to read the actual cell text
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];

  const images = [];
  const mediaFolder = loadedZip.folder('xl/media');
  if (!mediaFolder) return [];

  // This will store our Image Filename -> Cell Text mapping
  let imageToCaptionMap: Record<string, string> = {};

  try {
    const drawingXmlFile = loadedZip.file('xl/drawings/drawing1.xml');
    const drawingRelsFile = loadedZip.file('xl/drawings/_rels/drawing1.xml.rels');

    if (drawingXmlFile && drawingRelsFile) {
      const relsText = await drawingRelsFile.async('text');
      const drawingText = await drawingXmlFile.async('text');

      const parser = new DOMParser();
      const relsDoc = parser.parseFromString(relsText, 'text/xml');
      const drawingDoc = parser.parseFromString(drawingText, 'text/xml');

      // 1. Map the Relationship ID to the physical image file
      const relsMap: Record<string, string> = {};
      const relationships = relsDoc.getElementsByTagName('Relationship');
      for (let i = 0; i < relationships.length; i++) {
        const id = relationships[i].getAttribute('Id');
        const target = relationships[i].getAttribute('Target');
        if (id && target) {
            relsMap[id] = target.replace('../media/', '');
        }
      }

      // 2. Grab BOTH types of image anchors Excel uses
      const twoCellAnchors = Array.from(drawingDoc.getElementsByTagName('xdr:twoCellAnchor'));
      const oneCellAnchors = Array.from(drawingDoc.getElementsByTagName('xdr:oneCellAnchor'));
      const allAnchors = [...twoCellAnchors, ...oneCellAnchors];

      for (const anchor of allAnchors) {
         const fromNode = anchor.getElementsByTagName('xdr:from')[0];
         const toNode = anchor.getElementsByTagName('xdr:to')[0]; // To find the bottom of the image
         const picNode = anchor.getElementsByTagName('xdr:pic')[0];

         if (fromNode && picNode) {
             const fromCol = parseInt(fromNode.getElementsByTagName('xdr:col')[0]?.textContent || '0');
             const fromRow = parseInt(fromNode.getElementsByTagName('xdr:row')[0]?.textContent || '0');
             
             // If toNode exists, use it to find the bottom row, otherwise default to fromRow
             const toRow = toNode ? parseInt(toNode.getElementsByTagName('xdr:row')[0]?.textContent || '0') : fromRow;

             const blip = picNode.getElementsByTagName('a:blip')[0];
             const rId = blip?.getAttribute('r:embed');

             if (rId && relsMap[rId]) {
                 const imageName = relsMap[rId];
                 const colLetter = XLSX.utils.encode_col(fromCol);
                 
                 // Excel XML is 0-indexed, SheetJS is 1-indexed.
                 // We map out the three most likely places a user typed a caption:
                 const cellBehind = `${colLetter}${fromRow + 1}`; // Exactly behind top-left corner
                 const cellBelow = `${colLetter}${toRow + 2}`;    // The row immediately below the image
                 const cellAbove = `${colLetter}${fromRow}`;      // The row immediately above the image

                 // Smart Search: Check Below -> Above -> Behind
                 let captionText = "No caption detected";
                 
                 if (worksheet[cellBelow] && worksheet[cellBelow].v) {
                     captionText = worksheet[cellBelow].v.toString().trim();
                 } else if (worksheet[cellAbove] && worksheet[cellAbove].v) {
                     captionText = worksheet[cellAbove].v.toString().trim();
                 } else if (worksheet[cellBehind] && worksheet[cellBehind].v) {
                     captionText = worksheet[cellBehind].v.toString().trim();
                 }

                 imageToCaptionMap[imageName] = captionText;
             }
         }
      }
    }
  } catch (error) {
      console.warn("Could not map drawing anchors to cells:", error);
  }

  // 3. Extract the images and attach their newly found captions
  for (const relativePath in mediaFolder.files) {
    if (!mediaFolder.files[relativePath].dir) {
      const fileData = await mediaFolder.files[relativePath].async('blob');
      const previewUrl = URL.createObjectURL(fileData);

      const fileName = relativePath.split('/').pop() || "";
      const caption = imageToCaptionMap[fileName] || "No caption detected";

      images.push({ blob: fileData, previewUrl, caption });
    }
  }

  return images;
}