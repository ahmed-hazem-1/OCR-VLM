document.addEventListener('DOMContentLoaded', () => {
    const dropzone = document.getElementById('dropzone');
    const fileInput = document.getElementById('file-input');
    const browseBtn = document.getElementById('browse-btn');
    const processBtn = document.getElementById('process-btn');
    const clearBtn = document.getElementById('clear-btn');
    const fileInfo = document.getElementById('file-info');
    const filenameLabel = document.getElementById('filename');
    const resultsSection = document.getElementById('results-section');
    const loading = document.getElementById('loading');
    const output = document.getElementById('output');
    const errorBox = document.getElementById('error-box');
    const humanPreview = document.getElementById('human-preview');
    const apiKeyInput = document.getElementById('api-key-input');
    const modelSelect = document.getElementById('model-select');
    const checkModelsBtn = document.getElementById('check-models-btn');
    const modelGroup = document.getElementById('model-group');

    let selectedFile = null;
    // On Netlify, we use relative paths thanks to redirects
    const API_BASE_URL = '';

    // Trigger file input on browse button click
    browseBtn.addEventListener('click', () => fileInput.click());

    // Trigger file input on dropzone click
    dropzone.addEventListener('click', () => fileInput.click());

    // Handle drag events
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
        }, false);
    });

    ['dragenter', 'dragover'].forEach(eventName => {
        dropzone.addEventListener(eventName, () => dropzone.classList.add('dragover'), false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, () => dropzone.classList.remove('dragover'), false);
    });

    // Handle file drop
    dropzone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        handleFiles(files);
    });

    // Handle file selection via input
    fileInput.addEventListener('change', (e) => {
        handleFiles(e.target.files);
    });

    function handleFiles(files) {
        if (files.length > 0) {
            selectedFile = files[0];
            filenameLabel.textContent = selectedFile.name;
            fileInfo.classList.remove('hidden');
            processBtn.disabled = false;
            errorBox.classList.add('hidden');
        }
    }

    // Clear selection
    clearBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        resetUI();
    });

    function resetUI() {
        selectedFile = null;
        fileInput.value = '';
        fileInfo.classList.add('hidden');
        processBtn.disabled = true;
        resultsSection.classList.add('hidden');
        errorBox.classList.add('hidden');
        output.textContent = '';
    }

    // Process file
    processBtn.addEventListener('click', async () => {
        if (!selectedFile) return;

        // UI State: Loading
        loading.classList.remove('hidden');
        resultsSection.classList.remove('hidden');
        processBtn.disabled = true;
        errorBox.classList.add('hidden');
        output.textContent = 'Waiting for AI response...';

        const formData = new FormData();
        formData.append('file', selectedFile);

        const headers = {};
        if (apiKeyInput.value.trim()) {
            headers['x-gemini-api-key'] = apiKeyInput.value.trim();
        }
        
        // Ensure we send a valid model string or nothing to let backend default
        if (modelSelect.value && modelSelect.value !== 'undefined') {
            headers['x-gemini-model'] = modelSelect.value;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/medical-ocr`, {
                method: 'POST',
                body: formData,
                headers: headers
            });

            const result = await response.json();

            if (result.success) {
                output.textContent = JSON.stringify(result, null, 2);
                renderHumanPreview(result.data);
            } else {
                showError(result.error?.message || 'Failed to process document');
            }
        } catch (err) {
            showError('Network error or server is down.');
            console.error(err);
        } finally {
            loading.classList.add('hidden');
            processBtn.disabled = false;
        }
    });

    function showError(msg) {
        errorBox.textContent = `Error: ${msg}`;
        errorBox.classList.remove('hidden');
        resultsSection.classList.add('hidden');
    }

    // Check Available Models
    checkModelsBtn.addEventListener('click', async () => {
        const apiKey = apiKeyInput.value.trim();
        if (!apiKey) {
            showError('Please enter an API key first.');
            return;
        }

        checkModelsBtn.disabled = true;
        checkModelsBtn.textContent = 'Checking...';
        errorBox.classList.add('hidden');

        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
            const data = await response.json();

            if (data.models) {
                // Filter for models that support generateContent and are Gemini models
                const availableModels = data.models.filter(m => 
                    m.supportedGenerationMethods.includes('generateContent') && 
                    m.name.includes('gemini')
                );

                modelSelect.innerHTML = '';
                availableModels.forEach(m => {
                    const modelId = m.name.split('/models/')[1];
                    const option = document.createElement('option');
                    option.value = modelId;
                    option.textContent = m.displayName || modelId;
                    modelSelect.appendChild(option);
                });

                modelGroup.classList.remove('hidden');
            } else if (data.error) {
                showError(`API Error: ${data.error.message}`);
            }
        } catch (err) {
            showError('Failed to fetch models. Check your network or API key.');
            console.error(err);
        } finally {
            checkModelsBtn.disabled = false;
            checkModelsBtn.textContent = 'Check Models';
        }
    });

    function renderHumanPreview(data) {
        humanPreview.innerHTML = '';
        humanPreview.classList.remove('hidden');

        let markdown = `# ${data.document_type.replace('_', ' ').toUpperCase()}\n\n`;
        markdown += `**Confidence:** ${data.confidence.toUpperCase()} | **Date:** ${data.date || 'N/A'}\n\n`;

        markdown += `## Patient Information\n`;
        markdown += `- **Name:** ${data.patient_info?.name || 'N/A'}\n`;
        markdown += `- **Age:** ${data.patient_info?.age || 'N/A'}\n`;
        markdown += `- **Gender:** ${data.patient_info?.gender || 'N/A'}\n`;
        markdown += `- **Patient ID:** ${data.patient_info?.patient_id || 'N/A'}\n\n`;

        if (data.doctor_info?.name) {
            markdown += `## Doctor Information\n`;
            markdown += `- **Doctor:** ${data.doctor_info.name}\n`;
            markdown += `- **Specialization:** ${data.doctor_info.specialization || 'N/A'}\n`;
            markdown += `- **Hospital:** ${data.doctor_info.hospital || 'N/A'}\n\n`;
        }

        if (data.diagnosis) {
            markdown += `## Diagnosis\n${data.diagnosis}\n\n`;
        }

        if (data.medications?.length > 0) {
            markdown += `## Medications\n`;
            data.medications.forEach(m => {
                markdown += `### ${m.name}\n`;
                markdown += `- **Dosage:** ${m.dosage || 'N/A'}\n`;
                markdown += `- **Frequency:** ${m.frequency || 'N/A'}\n`;
                markdown += `- **Duration:** ${m.duration || 'N/A'}\n`;
                markdown += `- **Instructions:** ${m.instructions || 'N/A'}\n\n`;
            });
        }

        if (data.lab_results?.length > 0) {
            markdown += `## Lab Results\n`;
            markdown += `| Test Name | Value | Unit | Reference Range | Status |\n`;
            markdown += `| :--- | :--- | :--- | :--- | :--- |\n`;
            data.lab_results.forEach(l => {
                markdown += `| ${l.test_name} | ${l.value} | ${l.unit || 'N/A'} | ${l.reference_range || 'N/A'} | **${l.status.toUpperCase()}** |\n`;
            });
            markdown += `\n`;
        }

        if (data.findings?.length > 0) {
            markdown += `## Clinical Findings\n`;
            data.findings.forEach(f => {
                markdown += `- ${f}\n`;
            });
            markdown += `\n`;
        }

        if (data.notes) {
            markdown += `## Additional Notes\n${data.notes}\n`;
        }

        const markdownDiv = document.createElement('div');
        markdownDiv.className = 'markdown-content';
        markdownDiv.innerHTML = marked.parse(markdown);
        humanPreview.appendChild(markdownDiv);
    }
});
