/* eslint-disable @typescript-eslint/no-explicit-any */
import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { Ollama } from 'ollama';
import { Agent, fetch as undiciFetch } from 'undici';
import { ScoreExtraction } from '../models/score-extraction.model.js';
import ExamSubjectRepository from '../repositories/exam-subject.repository.js';

// Agent avec timeouts désactivés : les analyses Ollama (vision + gros contexte)
// peuvent dépasser les 5 minutes par défaut d'undici (UND_ERR_HEADERS_TIMEOUT)
const longTimeoutDispatcher = new Agent({
    headersTimeout: 0,
    bodyTimeout: 0,
});

const ollama = new Ollama({
    fetch: ((url: any, options: any) => undiciFetch(url, { ...options, dispatcher: longTimeoutDispatcher })) as unknown as typeof fetch
}); // pointe vers http://localhost:11434 par défaut
const MODEL = 'gemma3:12b';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });


// ─────────────────────────────────────────────
// Helper : convertit un buffer PDF en tableau
// de chaînes base64 (une par page)
// Dépendances : pdfjs-dist  @napi-rs/canvas
// npm install pdfjs-dist @napi-rs/canvas
// ─────────────────────────────────────────────
async function pdfToImages(buffer: Buffer): Promise<string[]> {
    const { createCanvas, DOMMatrix, ImageData, Path2D } = await import('@napi-rs/canvas');

    // Doit être fait AVANT l'import de pdfjs-dist : son module exécute
    // `new DOMMatrix()` au chargement (code top-level), donc les globales
    // doivent déjà exister au moment de l'import.
    (globalThis as any).DOMMatrix ??= DOMMatrix;
    (globalThis as any).ImageData ??= ImageData;
    (globalThis as any).Path2D ??= Path2D;

    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');

    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
    const pdfDoc = await loadingTask.promise;

    const images: string[] = [];
    for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale: 2.0 }); // scale 2 = meilleure résolution OCR
        const canvas = createCanvas(viewport.width, viewport.height);
        const context = canvas.getContext('2d');

        // pdfjs RenderParameters in Node require both canvas and canvasContext
        await page.render({ canvas: canvas as unknown as HTMLCanvasElement, canvasContext: context as any, viewport }).promise;

        // On extrait uniquement la partie base64 (sans le préfixe data:image/jpeg;base64,)
        const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
        images.push(dataUrl.substring(dataUrl.indexOf(',') + 1));
    }

    return images;
}

// ─────────────────────────────────────────────
// Helper : transforme les fichiers uploadés
// en tableau de base64 prêt pour Ollama
// ─────────────────────────────────────────────
async function filesToImages(files: Express.Multer.File[]): Promise<string[]> {
    const images: string[] = [];
    for (const file of files) {
        if (file.mimetype === 'application/pdf') {
            // PDF → conversion page par page en images
            const pdfImages = await pdfToImages(file.buffer);
            images.push(...pdfImages);
        } else {
            // JPEG / PNG → base64 direct
            images.push(file.buffer.toString('base64'));
        }
    }
    return images;
}


// ─────────────────────────────────────────────
// POST /transcribe
// Analyse un sujet d'examen et retourne le JSON
// des sections / questions
// ─────────────────────────────────────────────
router.post('/transcribe', (req, res, next) => {
    upload.array('files')(req, res, (err) => {
        if (err) return res.status(400).json({ error: `Erreur multer: ${err.message}` });
        next();
    });
}, async (req, res) => {
    try {
        // 1. Vérification de la présence des fichiers
        const files = req.files as Express.Multer.File[];
        if (!files || files.length === 0) {
            return res.status(400).json({ error: "Aucun fichier n'a été fourni dans le champ 'files'." });
        }

        // Validation rapide du type de fichier accepté
        const typesAcceptes = ['image/jpeg', 'image/png', 'application/pdf'];
        for (const file of files) {
            if (!typesAcceptes.includes(file.mimetype)) {
                return res.status(400).json({
                    error: `Format non supporté pour "${file.originalname}". Fournissez des JPEG, PNG ou PDF.`
                });
            }
        }

        // 2. Conversion des fichiers en images base64
        const images = await filesToImages(files);

        // 3. Rédaction du prompt
        const promptText = `Tu es un assistant spécialisé dans l'analyse de sujets d'examens scolaires.
        On te fournit un document (PDF ou image) contenant un sujet d'examen écrit.
        Ta tâche :
        1. Analyse le document et identifie les grandes sections thématiques globales présentes (par exemple : Géométrie dans le plan, Algèbre, Chimie, Mécanique, Électricité, etc.).
        2. Pour chaque section, regroupe les numéros des questions ou sous-questions qui lui appartiennent.
        3. Ne liste pas les questions de manière trop détaillée : on veut uniquement les grands groupes thématiques et les identifiants de questions associés (ex : '1a', 'B2', '3', etc.).
        Format de réponse attendu :
        Retourne uniquement un objet JSON valide, sans texte autour, sans markdown, sans explication. Le JSON doit respecter cette structure :
        {"sections": [{"theme": "Nom du thème","questions": ["1", "2a", "2b","3"]},{"theme": "Autre thème","questions": ["A1", "A2", "B1"]}]}
        Ne retourne rien d'autre que ce JSON.`;

        // 4. Envoi de la requête multimodale à Ollama
        const response = await ollama.chat({
            model: MODEL,
            messages: [{ role: 'user', content: promptText, images }],
            format: 'json',  // équivalent de responseMimeType: 'application/json',
            options: {
                "num_ctx": 2048,
                "num_batch": 512,
                "num_thread": 6,
                "temperature": 0.2
            }
        });

        const responseText = response.message.content;
        if (!responseText) {
            return res.status(502).json({ error: "Ollama n'a pas retourné de contenu valide." });
        }

        // 5. Analyse de la réponse
        const jsonResultat = JSON.parse(responseText);

        // Sauvegarde des fichiers vers le stockage backend
        const uploadsDir = path.join(process.cwd(), 'uploads', 'exam-subjects');
        fs.mkdirSync(uploadsDir, { recursive: true });

        const timestamp = Date.now();
        const savedFilenames: string[] = [];
        for (const [i, file] of files.entries()) {
            const uniqueName = `${timestamp}_${i}_${file.originalname}`;
            fs.writeFileSync(path.join(uploadsDir, uniqueName), file.buffer);
            savedFilenames.push(uniqueName);
        }


        // Enregistrement en base de données
        // const examSubject = await ExamSubject.create({ transcriptionJson: JSON.stringify(jsonResultat) });
        // await Promise.all(
        //     savedFilenames.map(filename =>
        //         ExamSubjectFile.create({ filename, examSubjectId: examSubject.get('id') })
        //     )
        // );

        return res.status(200).json({ success: true, donnees: jsonResultat });

    } catch (error) {
        console.error("Erreur lors de l'analyse du sujet:", error);
        return res.status(500).json({
            error: "Une erreur est survenue lors du traitement du document par Ollama."
        });
    }
});


// ─────────────────────────────────────────────
// POST /extract-scores
// Lit une copie corrigée et extrait les notes
// par question à partir du JSON du sujet
// ─────────────────────────────────────────────
router.post('/extract-scores', (req, res, next) => {
    upload.array('files')(req, res, (err) => {
        if (err) return res.status(400).json({ error: `Erreur multer: ${err.message}` });
        next();
    });
}, async (req, res) => {
    try {
        // désactivation des timeouts pour les requêtes longues (analyse de documents + OCR)
        req.setTimeout(0);
        res.setTimeout(0);


        // 1. Vérification de la présence des fichiers
        const files = req.files as Express.Multer.File[];
        if (!files || files.length === 0) {
            return res.status(400).json({ error: "Aucun fichier n'a été fourni dans le champ 'files'." });
        }

        // Validation rapide du type de fichier accepté
        const typesAcceptes = ['image/jpeg', 'image/png', 'application/pdf'];
        for (const file of files) {
            if (!typesAcceptes.includes(file.mimetype)) {
                return res.status(400).json({
                    error: `Format non supporté pour "${file.originalname}". Fournissez des JPEG, PNG ou PDF.`
                });
            }
        }

        // 2. Récupération du modèle de sujet en base
        const subjectId = req.query['subjectId'];
        if (!subjectId || typeof subjectId !== 'string') {
            return res.status(400).json({ error: `missing query parameter "subjectId"` });
        }
        const subject = await ExamSubjectRepository.findById(parseInt(subjectId));
        if (subject == null) {
            return res.status(404).json({ error: `subject ${subjectId} does not exist` });
        }
        const transcriptionJson = subject.getDataValue('transcriptionJson');

        // 3. Conversion des fichiers en images base64
        const images = await filesToImages(files);

        // 4. Rédaction du prompt
        const promptText = `Tu es un assistant spécialisé dans la correction de copies d'examens scolaires.
        On te fournit :
        1. Un objet JSON décrivant les sections et questions d'un sujet d'examen.
        2. Une image ou un PDF contenant la copie traitée par un élève, sur laquelle des notes ont été attribuées par le correcteur (écrites en rouge).
        Ta tâche :
        1. Lire attentivement la copie et repérer les scores écrits en rouge associés à chaque question.
        2. Pour chaque question du JSON, renseigner le score obtenu par l'élève.
        3. Calculer le total de points par section.
        4. Retourner le JSON enrichi avec les scores.
        Voici le JSON de base à enrichir :
        ${JSON.stringify(transcriptionJson)}
        Format de réponse attendu :
        Retourne uniquement un objet JSON valide, sans texte autour, sans markdown, sans explication. Le JSON doit respecter cette structure :
        {"success":true,"donnees":{"sections":[{"theme":"Nom du thème","questions":[{"id":"1","score":0},{"id":"2a","score":1.5}],"total":1.5}],"note_finale":0,"note_sur":20}}
        Si une note n'est pas lisible ou absente pour une question, attribuer 0 par défaut. Ne retourne rien d'autre que ce JSON.`;

        // 5. Envoi de la requête multimodale à Ollama
        const response = await ollama.chat({
            model: MODEL,
            messages: [{ role: 'user', content: promptText, images }],
            format: 'json',
            options: {
                "num_ctx": 2048,
                "num_batch": 512,
                "num_thread": 6,
                "temperature": 0.2
            }
        });

        const responseText = response.message.content;
        if (!responseText) {
            return res.status(502).json({ error: "Ollama n'a pas retourné de contenu valide." });
        }

        // 6. Analyse de la réponse
        const jsonResult = JSON.parse(responseText);

        // Sauvegarde des fichiers vers le stockage backend
        const uploadsDir = path.join(process.cwd(), 'uploads', 'exam-copies');
        fs.mkdirSync(uploadsDir, { recursive: true });

        const timestamp = Date.now();
        for (const [i, file] of files.entries()) {
            const uniqueName = `${timestamp}_${i}_${file.originalname}`;
            fs.writeFileSync(path.join(uploadsDir, uniqueName), file.buffer);
        }


        // Enregistrement en base de données
        await ScoreExtraction.create({
            extractionJson: JSON.stringify(jsonResult),
            examSubjectId: parseInt(subjectId)
        });

        return res.status(200).json(jsonResult);

    } catch (error) {
        console.error("Erreur d'extraction", error);
        return res.status(500).json({
            error: "Une erreur est survenue lors de l'extraction"
        });
    }
});

export default router;