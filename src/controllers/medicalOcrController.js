const { resolveFile } = require('../utils/fileResolver');
const { processMedicalOcr } = require('../services/geminiOcrService');

/**
 * Controller for medical OCR.
 * Orchestrates file resolution and Gemini API processing.
 */
async function medicalOcrController(req, res, next) {
  try {
    console.log('--- Medical OCR Request Received ---');
    // 1. Resolve file (handle multipart or base64)
    const { base64, mimeType, inputMethod } = await resolveFile(req);
    console.log(`File resolved: mimeType=${mimeType}, inputMethod=${inputMethod}, base64Length=${base64?.length}`);

    // 2. Extract custom headers if any
    const customApiKey = req.headers['x-gemini-api-key'];
    const customModel = req.headers['x-gemini-model'];

    // 3. Process with Gemini
    const extractedData = await processMedicalOcr(base64, mimeType, customApiKey, customModel);

    // 4. Return success response
    return res.status(200).json({
      success: true,
      data: extractedData,
      meta: {
        model: "gemini-2.0-flash",
        input_method: inputMethod,
        processed_at: new Date().toISOString()
      }
    });

  } catch (error) {
    // Forward error to global error handler
    next(error);
  }
}

module.exports = { medicalOcrController };
