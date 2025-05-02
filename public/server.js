const express = require('express');
const admin = require('firebase-admin');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const port = 3000; // You can change this port if needed

// --- Configuration ---
const UPLOAD_FOLDER = path.join(__dirname, 'uploads');
// --- End Configuration ---

// Ensure upload folder exists
if (!fs.existsSync(UPLOAD_FOLDER)) {
    fs.mkdirSync(UPLOAD_FOLDER);
}

// CORS Middleware (allow requests from the frontend)
app.use(cors()); // Adjust origins for production if needed

// Middleware to serve static files (HTML, CSS, JS)
app.use(express.static(path.join(__dirname)));

// Multer setup for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, UPLOAD_FOLDER); // Store uploads in the 'uploads' folder
    },
    filename: function (req, file, cb) {
        // Keep original filename (safer might be to generate unique names)
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });

// --- Global State (simplistic for local app) ---
let firebaseApp = null;
let firestoreDb = null;
// --- End Global State ---

// --- API Endpoints ---

// Endpoint to receive service account key and initialize Firebase
app.post('/initialize-firebase', upload.single('serviceAccountKey'), (req, res) => {
    if (firebaseApp) {
        console.log("Firebase already initialized.");
        return res.status(200).json({ success: true, message: 'Firebase already initialized.' });
    }

    if (!req.file) {
        return res.status(400).json({ success: false, message: 'No service account key file uploaded.' });
    }

    const keyFilePath = req.file.path;
    console.log(`Received service account key file: ${keyFilePath}`);

    try {
        const serviceAccount = JSON.parse(fs.readFileSync(keyFilePath, 'utf8'));

        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
            // databaseURL: "https://YOUR_PROJECT_ID.firebaseio.com" // Optional
        });

        firebaseApp = admin.app();
        firestoreDb = admin.firestore();
        console.log('Firebase Admin SDK initialized successfully.');

        // Clean up the uploaded key file after initialization (optional but recommended)
        fs.unlink(keyFilePath, (err) => {
            if (err) console.error("Error deleting temp key file:", err);
        });

        res.status(200).json({ success: true, message: 'Firebase Admin SDK initialized successfully.' });

    } catch (error) {
        console.error('Error initializing Firebase Admin SDK:', error);
        // Clean up file even on error
        fs.unlink(keyFilePath, (err) => {
            if (err) console.error("Error deleting temp key file:", err);
        });
        firebaseApp = null;
        firestoreDb = null;
        res.status(500).json({ success: false, message: `Firebase initialization failed: ${error.message}` });
    }
});

// Endpoint to receive data files and upload to Firestore
app.post('/upload-data', upload.array('dataFiles'), async (req, res) => {
    if (!firebaseApp || !firestoreDb) {
        return res.status(400).json({ success: false, message: 'Firebase not initialized. Upload service account key first.' });
    }
    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ success: false, message: 'No data files uploaded.' });
    }

    console.log(`Received ${req.files.length} data files for upload.`);
    const db = firestoreDb;
    const uploadResults = [];

    for (const file of req.files) {
        const filePath = file.path;
        const originalFilename = file.originalname;
        const collectionName = path.basename(originalFilename, path.extname(originalFilename)); // e.g., "muscles" from "muscles.json"
        let fileResult = { filename: originalFilename, status: 'pending', message: '', success: false };

        console.log(`Processing file: ${originalFilename} for collection: ${collectionName}`);

        try {
            // 1. Read and Parse JSON
            const fileContent = fs.readFileSync(filePath, 'utf8');
            const dataArray = JSON.parse(fileContent);

            if (!Array.isArray(dataArray)) {
                throw new Error('JSON file does not contain a valid array.');
            }

            // 2. Upload to Firestore
            const collectionRef = db.collection(collectionName);
            const batchSize = 450;
            let batch = db.batch();
            let count = 0;
            let batchCount = 0;
            let itemsProcessed = 0;

            for (const item of dataArray) {
                itemsProcessed++;
                 if (!item || typeof item.id !== 'string' || item.id === '') {
                     console.warn(`Skipping item in ${originalFilename} due to missing or invalid 'id'. Index: ${itemsProcessed - 1}`);
                     continue; // Skip items without a valid string ID
                 }
                 const docRef = collectionRef.doc(item.id);
                 batch.set(docRef, item);
                 count++;
                 batchCount++;

                 if (batchCount === batchSize || itemsProcessed === dataArray.length) {
                     console.log(`Committing batch of ${batchCount} for ${originalFilename}...`);
                     await batch.commit();
                     console.log(`Batch committed for ${originalFilename}.`);
                     batch = db.batch(); // Reset batch
                     batchCount = 0;
                 }
            }

            fileResult.status = 'Success';
            fileResult.message = `Uploaded ${count} valid documents.`;
            fileResult.success = true;
            console.log(`Successfully processed ${originalFilename}. Uploaded ${count} documents.`);

        } catch (error) {
            console.error(`Error processing file ${originalFilename}:`, error);
            fileResult.status = 'Error';
            fileResult.message = error.message || 'Unknown error during processing or upload.';
            fileResult.success = false;
        } finally {
            // Clean up the uploaded data file
            fs.unlink(filePath, (err) => {
                if (err) console.error(`Error deleting temp data file ${filePath}:`, err);
            });
            uploadResults.push(fileResult);
        }
    }

    console.log("Finished processing all files.");
    res.status(200).json({ success: true, message: 'Data upload process finished.', results: uploadResults });
});


// Basic root route (optional - could serve index.html directly)
app.get('/', (req, res) => {
    // Log the path we are trying to send
    const indexPath = path.join(__dirname);
    console.log(`Attempting to send file for GET / request: ${indexPath}`);
    res.sendFile(indexPath, (err) => {
        if (err) {
            console.error("Error sending index.html:", err);
            // Send an error response if the file couldn't be sent
            res.status(err.status || 500).end();
        } else {
            console.log("Successfully sent index.html");
        }
    });
});

// Start the server
app.listen(port, () => {
    console.log(`Firestore Uploader server running at http://localhost:${port}`);
});