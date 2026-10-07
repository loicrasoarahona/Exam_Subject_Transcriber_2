/* eslint-disable @typescript-eslint/no-explicit-any */
import express from 'express';
import multer from 'multer';
import { Ollama } from 'ollama';
import { Agent, fetch as undiciFetch } from 'undici';
import path from 'path';
import { readFile } from 'fs/promises';
import { filesToImages } from '../helpers/conversion.helper.js';


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

router.post('/extract-score', (req, res, next) => {
    upload.array('files')(req, res, err => {
        if (err) return res.status(400).json({ error: `Erreur multer: ${err.message}` });
        next();
    })
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

        // 3. Récupération du prompt dans les fichiers
        const filePath = path.join("src", "prompts", "Prompt_correction_copie.txt")
        let promptText = await readFile(filePath, "utf-8");

        // 4. Ajout du JSON dans le prompt
        const jsonPath = path.join("src", "prompts", "sujet_PC.json");
        const jsonContent = await readFile(jsonPath, "utf-8");
        promptText = promptText.replace("[replace_with_question_json]", jsonContent);

        // 5. Envoi de la requête multimodale à Ollama
        const response = await ollama.chat({
            model: MODEL,
            messages: [{ role: 'user', content: promptText, images }],
            format: 'json',  // équivalent de responseMimeType: 'application/json',
            options: {
                "num_ctx": 8192,
                "num_batch": 512,
                "num_thread": 6,
                "temperature": 0.2,
                num_predict: 2000
            }
        });

        const responseText = response.message.content;
        if (!responseText) {
            return res.status(502).json({ error: "Ollama n'a pas retourné de contenu valide." });
        }
        const jsonData = JSON.parse(responseText);

        res.json(jsonData);
    } catch (error) {
        console.error("Erreur lors de l'extraction du score:", error);
        return res.status(500).json({
            error: "Une erreur est survenue lors du traitement du document par Ollama."
        });
    }
})

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

        // 3. Récupération du prompt dans les fichiers
        const filePath = path.join('src', 'prompts', "Prompt_analyse_sujet.txt")
        const promptText = await readFile(filePath, "utf-8")

        // 4. Envoi de la requête multimodale à Ollama
        const response = await ollama.chat({
            model: MODEL,
            messages: [{ role: 'user', content: promptText, images }],
            format: 'json',  // équivalent de responseMimeType: 'application/json',
            options: {
                "num_ctx": 8192,
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
        // const jsonResultat = JSON.parse(responseText);

        res.json(responseText);


        // // Sauvegarde des fichiers vers le stockage backend
        // const uploadsDir = path.join(process.cwd(), 'uploads', 'exam-subjects');
        // fs.mkdirSync(uploadsDir, { recursive: true });

        // const timestamp = Date.now();
        // const savedFilenames: string[] = [];
        // for (const [i, file] of files.entries()) {
        //     const uniqueName = `${timestamp}_${i}_${file.originalname}`;
        //     fs.writeFileSync(path.join(uploadsDir, uniqueName), file.buffer);
        //     savedFilenames.push(uniqueName);
        // }


        // // Enregistrement en base de données
        // const examSubject = await ExamSubject.create({ transcriptionJson: JSON.stringify(jsonResultat) });
        // await Promise.all(
        //     savedFilenames.map(filename =>
        //         ExamSubjectFile.create({ filename, examSubjectId: examSubject.get('id') })
        //     )
        // );

        // return res.status(200).json({ success: true, donnees: jsonResultat });

    } catch (error) {
        console.error("Erreur lors de l'analyse du sujet:", error);
        return res.status(500).json({
            error: "Une erreur est survenue lors du traitement du document par Ollama."
        });
    }
})





export default router;