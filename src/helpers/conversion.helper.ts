import { readFile } from "fs/promises";
import path from "path";
import fs from "fs";

export type InputFile =
  | Express.Multer.File
  | {
      originalname: string;
      mimetype: string;
      buffer: Buffer;
    };

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function filesToImages(files: InputFile[]): Promise<string[]> {
  const images: string[] = [];

  for (const file of files) {
    const buffer = file.buffer;

    if (!buffer) {
      throw new Error(`File ${file.originalname} has no buffer`);
    }

    if (file.mimetype === "application/pdf") {
      const pdfImages = await pdfToImages(buffer);
      images.push(...pdfImages);
    } else {
      images.push(buffer.toString("base64"));
    }
  }

  return images;
}

export function saveFilesToLocal(
  files: InputFile[],
  directoryPath: string,
): string[] {
  fs.mkdirSync(directoryPath, { recursive: true });
  const timestamp = Date.now();
  const savedFilenames: string[] = [];
  for (const [i, file] of files.entries()) {
    const uniqueName = `${timestamp}_${i}_${file.originalname}`;
    fs.writeFileSync(path.join(directoryPath, uniqueName), file.buffer);
    savedFilenames.push(uniqueName);
  }
  return savedFilenames;
}

async function pdfToImages(buffer: Buffer): Promise<string[]> {
  const { createCanvas, DOMMatrix, ImageData, Path2D } =
    await import("@napi-rs/canvas");

  // Doit être fait AVANT l'import de pdfjs-dist : son module exécute
  // `new DOMMatrix()` au chargement (code top-level), donc les globales
  // doivent déjà exister au moment de l'import.
  (globalThis as any).DOMMatrix ??= DOMMatrix;
  (globalThis as any).ImageData ??= ImageData;
  (globalThis as any).Path2D ??= Path2D;

  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");

  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
  const pdfDoc = await loadingTask.promise;

  const images: string[] = [];
  for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale: 2.0 }); // scale 2 = meilleure résolution OCR
    const canvas = createCanvas(viewport.width, viewport.height);
    const context = canvas.getContext("2d");

    // pdfjs RenderParameters in Node require both canvas and canvasContext
    await page.render({
      canvas: canvas as unknown as HTMLCanvasElement,
      canvasContext: context as any,
      viewport,
    }).promise;

    // On extrait uniquement la partie base64 (sans le préfixe data:image/jpeg;base64,)
    const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
    images.push(dataUrl.substring(dataUrl.indexOf(",") + 1));
  }

  return images;
}

export async function localFileToInput(filePath: string) {
  const buffer = await readFile(filePath);

  return {
    originalname: path.basename(filePath),
    mimetype: "application/pdf", // ou détecté si besoin
    buffer,
  };
}
