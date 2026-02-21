const mammoth = require('mammoth');

/**
 * Resolves the input file from either a multipart upload or a base64 JSON body.
 * @param {Object} req - The Express request object.
 * @returns {Promise<{base64: string, mimeType: string, inputMethod: string}>}
 */
async function resolveFile(req) {
  let buffer;
  let mimeType;

  if (req.file) {
    // Option A: multipart/form-data
    buffer = req.file.buffer;
    mimeType = req.file.mimetype;
  } else if (req.body.file_base64 && req.body.mime_type) {
    // Option B: application/json base64
    let base64String = req.body.file_base64;
    mimeType = req.body.mime_type;

    // Strip "data:...;base64," prefix if present
    if (base64String.includes(',')) {
      base64String = base64String.split(',')[1];
    }
    buffer = Buffer.from(base64String, 'base64');
  } else {
    throw new Error('No file provided in request.');
  }

  let base64;
  let inputMethod;

  if (mimeType.startsWith('image/')) {
    base64 = buffer.toString('base64');
    inputMethod = 'image';
  } else if (mimeType === 'application/pdf') {
    base64 = buffer.toString('base64');
    inputMethod = 'pdf';
  } else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    // DOCX conversion to plain text
    const result = await mammoth.extractRawText({ buffer });
    const text = result.value;
    base64 = Buffer.from(text).toString('base64');
    mimeType = 'text/plain';
    inputMethod = 'docx_as_text';
  } else if (mimeType === 'text/plain') {
    base64 = buffer.toString('base64');
    inputMethod = 'plain_text';
  } else {
    throw new Error(`Unsupported MIME type: ${mimeType}`);
  }

  return { base64, mimeType, inputMethod };
}

module.exports = { resolveFile };
