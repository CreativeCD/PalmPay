'use strict';
/**
 * biometricClient.js — HTTP client for the Python FastAPI biometric microservice.
 *
 * API contract agreed with Shree Sai (biometric Python service):
 *
 *  POST /process/enroll
 *    multipart field:  palm_image (file, image/png or image/jpeg)
 *    response:         { success: bool, template: string (base64), method: string, shape: [h,w] }
 *
 *  POST /process/verify
 *    multipart fields: palm_image (file), reference_template (string Form field)
 *    response:         { success: bool, matched: false (always), similarity: float, method: string }
 *    NOTE: matched is ALWAYS false from Python service.
 *          Threshold comparison is done here in Express using BIOMETRIC_THRESHOLD env var.
 *
 *  Similarity direction: higher cosine similarity → more similar (range: [-1, 1]).
 *
 * Environment variables:
 *   BIOMETRIC_SERVICE_URL  default: http://127.0.0.1:8000
 *   BIOMETRIC_THRESHOLD    default: 0.60
 */

const axios    = require('axios');
const FormData = require('form-data');

const BASE_URL   = () => process.env.BIOMETRIC_SERVICE_URL || 'http://127.0.0.1:8000';
const THRESHOLD  = () => parseFloat(process.env.BIOMETRIC_THRESHOLD) || 0.60;

/**
 * Enroll a palm image and retrieve a serialised template from the Python service.
 *
 * @param {Buffer} imageBuffer   raw image bytes (PNG or JPEG)
 * @param {string} mimetype      e.g. 'image/png'
 * @returns {Promise<{ template: string, method: string }>}
 * @throws {Error} if the Python service returns an error or is unreachable
 */
async function enroll(imageBuffer, mimetype) {
  const form = new FormData();
  form.append('palm_image', imageBuffer, {
    filename:    'palm.png',
    contentType: mimetype || 'image/png',
  });

  const { data } = await axios.post(`${BASE_URL()}/process/enroll`, form, {
    headers: form.getHeaders(),
    timeout: 15000,
  });

  if (!data.success) {
    throw new Error(`[biometricClient] enroll failed: ${JSON.stringify(data)}`);
  }

  return { template: data.template, method: data.method };
}

/**
 * Compare a probe palm image against a stored template.
 * This function applies the threshold and returns a final `matched` decision.
 *
 * @param {Buffer} imageBuffer      raw probe image bytes
 * @param {string} mimetype
 * @param {string} storedTemplate   base64 string retrieved from biometric_templates table
 * @returns {Promise<{ matched: boolean, similarity: number, method: string }>}
 */
async function verify(imageBuffer, mimetype, storedTemplate) {
  const form = new FormData();
  form.append('palm_image', imageBuffer, {
    filename:    'probe.png',
    contentType: mimetype || 'image/png',
  });
  form.append('reference_template', storedTemplate);

  const { data } = await axios.post(`${BASE_URL()}/process/verify`, form, {
    headers: form.getHeaders(),
    timeout: 15000,
  });

  if (!data.success) {
    throw new Error(`[biometricClient] verify failed: ${JSON.stringify(data)}`);
  }

  // Express backend applies the threshold — Python service always returns matched: false
  const similarity = data.similarity;
  const matched    = similarity >= THRESHOLD();

  return { matched, similarity, method: data.method };
}

module.exports = { enroll, verify, threshold: THRESHOLD };
