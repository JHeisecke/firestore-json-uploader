# Firestore Web Uploader

A simple, locally running web application built with Node.js and Express to facilitate uploading JSON data arrays to specific Firestore collections using the Firebase Admin SDK. Ideal for seeding initial data or performing bulk uploads during development.

## Features

*   Provides a web interface accessible via `localhost`.
*   Allows selecting or dragging & dropping the Firebase Service Account Key JSON file.
*   Allows selecting or dragging & dropping multiple JSON data files.
*   Optionally specify a target Firestore collection name for all selected data files.
*   If no collection name is specified, uses the filename (without extension) as the collection name for each respective file.
*   Uses the Firebase Admin SDK for secure backend operations.
*   Provides real-time status logging in the web interface.

## Prerequisites

*   **Node.js and npm:** Required to run the server and install dependencies. Download from [https://nodejs.org/](https://nodejs.org/).
*   **Firebase Project:** You need an existing Firebase project.
*   **Firebase Service Account Key:**
    *   Go to your Firebase Project Settings > Service accounts.
    *   Generate a new private key and download the JSON file.
    *   **IMPORTANT:** Treat this file like a password! It grants administrative access to your Firebase project.
*   **JSON Data Files:**
    *   Your data files must be valid JSON.
    *   Each file must contain a single JSON **array** `[...]`.
    *   Each **object** within the array **must** have a unique `id` field (string type, cannot be empty). This `id` will be used as the Firestore Document ID for that object.

## Setup and Installation

1.  **Navigate to Directory:** Open your terminal or command prompt and change into the project's root directory (the folder containing `server.js` and the `public` folder).
    ```bash
    cd path/to/your/firestore-web-uploader
    ```
2.  **Install Dependencies:** Run the following command to install the required Node.js packages:
    ```bash
    npm install
    ```
    This will download `express`, `firebase-admin`, `multer`, and `cors` into a `node_modules` folder.

## Running the Application

1.  **Start the Server:** From the project's root directory in your terminal, run:
    ```bash
    node server.js
    ```
2.  **Check Terminal Output:** You should see a confirmation message like:
    ```
    Firestore Uploader server running at http://localhost:3000
    Temporary uploads will be stored in the "uploads" folder.
    ```
3.  **Access the Web App:** Open your web browser and navigate to `http://localhost:3000`.

## Usage Instructions

1.  **Load Service Account Key:**
    *   Drag and drop your downloaded Firebase Service Account Key JSON file onto the first drop zone ("1. Service Account Key").
    *   Alternatively, click the file input below the drop zone to select the key file.
    *   The status below the drop zone should update to show the selected filename.
2.  **Select Data Files:**
    *   Drag and drop one or more JSON data files (containing arrays of objects with `id` fields) onto the second drop zone ("2. Data Files").
    *   Alternatively, click the file input below the drop zone to select multiple data files.
    *   The "Selected Files" list will update.
3.  **(Optional) Specify Target Collection:**
    *   If you want **all** selected files to be uploaded to the **same** Firestore collection, enter the desired collection name (e.g., `exercises`, `products`) in the "Target Firestore Collection" input field.
    *   If you leave this field **blank**, the uploader will use the filename (without the `.json` extension) as the collection name for *each individual file*. For example, `muscles.json` will upload to the `muscles` collection, and `chest_exercises.json` will upload to the `chest_exercises` collection.
4.  **Upload:**
    *   Once a service account key and at least one data file are selected, the "Initialize & Upload" button will become active.
    *   Click the button.
5.  **Monitor Logs:**
    *   Watch the "Status Log" section in the web app for real-time progress updates and any success/error messages.
    *   You can also check the terminal where `node server.js` is running for more detailed server-side logs.
6.  **Verify in Firestore:** After the process completes, check your Firestore database in the Firebase Console to confirm that the collections and documents have been created/updated as expected.

## Important Notes

*   **Document Overwrites:** The script uses the `id` from your JSON object as the Firestore Document ID. If a document with that specific ID already exists in the target collection, **it will be completely overwritten** with the data from your JSON file.
*   **Collection Creation:** If the target collection (either specified or derived from the filename) does not exist in Firestore, it will be created automatically when the first document is written.
*   **Batching:** The script uploads data in batches (default size 450 documents) to stay within Firestore limits.

## Security Warning!

*   Your Firebase **Service Account Key file grants administrative privileges** to your entire Firebase project.
*   **Treat this file like a password.** Do not share it, commit it to Git, or store it in an insecure location.
*   It is strongly recommended to add the filename of your key file (if you ever place it within the project folder) to your project's `.gitignore` file to prevent accidental commits.
*   This tool is intended for **local development use only** where you control access to the key file.