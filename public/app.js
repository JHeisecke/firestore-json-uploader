const collectionNameInput = document.getElementById('collection-name');
const keyDropZone = document.getElementById('key-drop-zone');
const keyInput = document.getElementById('key-input');
const keyStatus = document.getElementById('key-status');

const dataDropZone = document.getElementById('data-drop-zone');
const dataInput = document.getElementById('data-input');
const dataFilesList = document.getElementById('data-files-list');

const uploadButton = document.getElementById('upload-button');
const statusLog = document.getElementById('status-log');

let serviceAccountFile = null;
let dataFiles = [];

function logMessage(message, isError = false) {
    const timestamp = new Date().toLocaleTimeString();
    const entry = document.createElement('div');
    entry.textContent = `[${timestamp}] ${message}`;
    if (isError) {
        entry.style.color = 'red';
    }
    statusLog.appendChild(entry);
    statusLog.scrollTop = statusLog.scrollHeight; // Scroll to bottom
}

function updateButtonState() {
    uploadButton.disabled = !(serviceAccountFile && dataFiles.length > 0);
}

function displayDataFiles() {
    dataFilesList.innerHTML = ''; // Clear list
    if (dataFiles.length === 0) {
        dataFilesList.innerHTML = '<li>None</li>';
    } else {
        dataFiles.forEach(file => {
            const li = document.createElement('li');
            li.textContent = file.name;
            dataFilesList.appendChild(li);
        });
    }
}

// --- Event Listeners ---

// Service Account File Selection
keyInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        serviceAccountFile = e.target.files[0];
        keyStatus.textContent = `Selected: ${serviceAccountFile.name}`;
        keyStatus.className = 'status loaded';
        logMessage(`Service account key file selected: ${serviceAccountFile.name}`);
        updateButtonState();
    }
});

// Data Files Selection
dataInput.addEventListener('change', (e) => {
    dataFiles = Array.from(e.target.files);
    displayDataFiles();
    logMessage(`${dataFiles.length} data file(s) selected.`);
    updateButtonState();
});

// Drag and Drop Handling (Simplified)
function setupDropZone(zone, fileHandler, isMultiple = false) {
    zone.addEventListener('dragover', (e) => {
        e.preventDefault();
        zone.classList.add('dragover');
    });
    zone.addEventListener('dragleave', (e) => {
        zone.classList.remove('dragover');
    });
    zone.addEventListener('drop', (e) => {
        e.preventDefault();
        zone.classList.remove('dragover');
        const files = Array.from(e.dataTransfer.files);
        fileHandler(files, isMultiple);
    });
}

setupDropZone(keyDropZone, (files) => {
    if (files.length > 0 && files[0].type === 'application/json') {
        serviceAccountFile = files[0];
        keyInput.files = new DataTransfer().files; // Clear input
        keyStatus.textContent = `Selected: ${serviceAccountFile.name}`;
        keyStatus.className = 'status loaded';
        logMessage(`Service account key file dropped: ${serviceAccountFile.name}`);
        updateButtonState();
    } else {
        logMessage('Invalid file dropped for service account key (must be one .json file).', true);
    }
}, false);

setupDropZone(dataDropZone, (files) => {
    dataFiles = files.filter(file => file.type === 'application/json');
    dataInput.files = new DataTransfer().files; // Clear input
    displayDataFiles();
    logMessage(`${dataFiles.length} valid data file(s) dropped.`);
    updateButtonState();
}, true);

// Upload Button Click
uploadButton.addEventListener('click', async () => {
    if (!serviceAccountFile || dataFiles.length === 0) {
        logMessage('Please select both a service account key and data files.', true);
        return;
    }

    uploadButton.disabled = true;
    logMessage('Starting upload process...');

    // 1. Upload Service Account Key
    const keyFormData = new FormData();
    keyFormData.append('serviceAccountKey', serviceAccountFile);

    try {
        logMessage('Initializing Firebase Admin SDK...');
        const keyResponse = await fetch('/initialize-firebase', {
            method: 'POST',
            body: keyFormData
        });

        const keyResult = await keyResponse.json();

        if (!keyResponse.ok) {
            throw new Error(keyResult.message || 'Failed to initialize Firebase.');
        }
        logMessage('Firebase Admin SDK initialized successfully.');

        // 2. Upload Data Files
        logMessage('Uploading data files...');
        const dataFormData = new FormData();
        dataFiles.forEach(file => {
            dataFormData.append('dataFiles', file);
        });

        const dataResponse = await fetch('/upload-data', {
            method: 'POST',
            body: dataFormData
        });

        const dataResult = await dataResponse.json();

        if (!dataResponse.ok) {
            throw new Error(dataResult.message || 'Failed to upload data files.');
        }

        logMessage('--- Upload Summary ---');
        (dataResult.results || []).forEach(res => {
             logMessage(`File "${res.filename}": ${res.status} (${res.message})`, !res.success);
        });
        logMessage('----------------------');
        logMessage('Upload process completed.');


    } catch (error) {
        logMessage(`Upload failed: ${error.message}`, true);
    } finally {
        // Re-enable button only if files are still selected
        updateButtonState();
    }
});

// Initial state
displayDataFiles();
updateButtonState();
logMessage("App ready. Select files to upload.");