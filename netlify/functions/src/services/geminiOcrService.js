const axios = require('axios');

const SYSTEM_PROMPT = `You are a highly accurate medical document OCR specialist.
Carefully analyze this medical file — it may be an image, a scanned PDF,
a text document, or a Word file converted to text.
Extract ALL visible or readable medical information.

Rules:
- Be precise; transcribe values exactly as they appear.
- If a field is not visible or not applicable, set its value to null.
- For dates, use YYYY-MM-DD format where possible.
- For lab results, determine status (normal/high/low/critical)
  based on the reference range shown.
- Return confidence as:
    high   → image/document is clear and fully legible
    medium → partially legible or low quality scan
    low    → very unclear, heavy noise, or mostly unreadable`;

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    document_type: {
      type: "string",
      enum: ["prescription", "lab_report", "radiology_report", "discharge_summary", "clinical_note", "unknown"]
    },
    patient_info: {
      type: "object",
      properties: {
        name: { type: "string" },
        age: { type: "string" },
        gender: { type: "string" },
        patient_id: { type: "string" },
        contact: { type: "string" }
      },
      propertyOrdering: ["name", "age", "gender", "patient_id", "contact"]
    },
    doctor_info: {
      type: "object",
      properties: {
        name: { type: "string" },
        specialization: { type: "string" },
        license_number: { type: "string" },
        hospital: { type: "string" }
      },
      propertyOrdering: ["name", "specialization", "license_number", "hospital"]
    },
    date: { type: "string" },
    diagnosis: { type: "string" },
    medications: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          dosage: { type: "string" },
          frequency: { type: "string" },
          duration: { type: "string" },
          route: { type: "string" },
          instructions: { type: "string" }
        },
        propertyOrdering: ["name", "dosage", "frequency", "duration", "route", "instructions"]
      }
    },
    findings: {
      type: "array",
      items: { type: "string" }
    },
    lab_results: {
      type: "array",
      items: {
        type: "object",
        properties: {
          test_name: { type: "string" },
          value: { type: "string" },
          unit: { type: "string" },
          reference_range: { type: "string" },
          status: { type: "string", enum: ["normal", "high", "low", "critical"] }
        },
        propertyOrdering: ["test_name", "value", "unit", "reference_range", "status"]
      }
    },
    notes: { type: "string" },
    confidence: {
      type: "string",
      enum: ["high", "medium", "low"]
    }
  },
  required: ["document_type", "patient_info", "date", "confidence"],
  propertyOrdering: ["document_type", "patient_info", "doctor_info", "date", "diagnosis", "medications", "findings", "lab_results", "notes", "confidence"]
};

/**
 * Sends file to Gemini API for OCR and data extraction.
 * @param {string} base64 - Base64 encoded file content.
 * @param {string} mimeType - MIME type of the file.
 * @param {string} [customApiKey] - User provided API key.
 * @param {string} [customModel] - User selected model.
 * @returns {Promise<Object>} - Extracted data.
 */
async function processMedicalOcr(base64, mimeType, customApiKey, customModel) {
  const apiKey = customApiKey || process.env.GEMINI_API_KEY;
  console.log(`Processing with API Key: ${customApiKey ? 'USER-PROVIDED' : 'SERVER-DEFAULT'} and Model: ${customModel || 'gemini-2.0-flash'}`);
  console.log(`API Key Length: ${apiKey?.length}`);

  let apiUrl;
  if (customModel && customModel !== 'undefined' && customModel.trim() !== '') {
    // If custom model is provided, use the v1beta base URL
    apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${customModel}:generateContent`;
  } else {
    // Fallback to the URL in .env, or a hardcoded default if .env is missing it
    apiUrl = process.env.GEMINI_API_URL || 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
  }
  
  console.log(`Using API URL: ${apiUrl}`);

  const payload = {
    contents: [
      {
        parts: [
          {
            inline_data: {
              mime_type: mimeType,
              data: base64
            }
          },
          {
            text: SYSTEM_PROMPT
          }
        ]
      }
    ],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
      temperature: 0.1,
      maxOutputTokens: 4096
    }
  };

  try {
    const response = await axios.post(`${apiUrl}?key=${apiKey}`, payload, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 90000 // 90 seconds
    });

    const resultText = response.data.candidates[0].content.parts[0].text;
    return JSON.parse(resultText);
  } catch (error) {
    console.error('Gemini API Error details:', error.response ? JSON.stringify(error.response.data, null, 2) : error.message);
    
    if (error.response && error.response.data && error.response.data.error) {
      const apiError = error.response.data.error;
      const statusCode = error.response.status;
      const message = apiError.message || 'Unknown Gemini API Error';
      
      // Customize message based on status
      if (statusCode === 429) {
        throw new Error(`Gemini API Quota Exceeded: ${message}`);
      } else if (statusCode === 403 || statusCode === 401) {
        throw new Error(`Gemini API Auth Error: ${message} (Check your API Key)`);
      } else if (statusCode === 404) {
        throw new Error(`Gemini API Model Error: ${message} (Selected model might not exist for your region/key)`);
      }
      
      throw new Error(`Gemini API Error (${statusCode}): ${message}`);
    }
    
    throw new Error(`Failed to process medical document: ${error.message}`);
  }
}

module.exports = { processMedicalOcr };
