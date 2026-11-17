'use strict';
const axios       = require('axios');
const FormData    = require('form-data');

const BASE_URL = () => process.env.BIOMETRIC_SERVICE_URL || 'http://127.0.0.1:8000';

/**
 * Send a palm image to the biometric service for enrollment.
 * @param {Buffer} imageBuffer
 * @param {string} mimetype  'image/png' | 'image/jpeg'
 * @returns {{ template: string, method: string }}
 */
async function enroll(imageBuffer, mimetype) {
  const form = new FormData();
  form.append('palm_image', imageBuffer, {
    filename: 'palm.jpg',
    contentType: mimetype,
  });

  try {
    const { data } = await axios.post(`${BASE_URL()}/process/enroll`, form, {
      headers: form.getHeaders(),
      timeout: 30_000,
    });
    if (!data.success) {
      throw Object.assign(new Error(data.error || 'Enrollment processing failed'), { status: 422 });
    }
    return { template: data.template, method: data.method };
  } catch (err) {
    if (err.status) throw err;
    throw Object.assign(
      new Error(`Biometric service unavailable: ${err.message}`),
      { status: 503 }
    );
  }
}

/**
 * Ask the biometric service to compare a probe image against a stored template.
 * The similarity score is returned; the threshold is applied by the caller.
 * @param {Buffer} imageBuffer
 * @param {string} mimetype
 * @param {string} referenceTemplate  base64-encoded stored template
 * @returns {{ matched: boolean, similarity: number, method: string }}
 */
async function verify(imageBuffer, mimetype, referenceTemplate) {
  const form = new FormData();
  form.append('palm_image', imageBuffer, {
    filename: 'palm.jpg',
    contentType: mimetype,
  });
  form.append('reference_template', referenceTemplate);

  try {
    const { data } = await axios.post(`${BASE_URL()}/process/verify`, form, {
      headers: form.getHeaders(),
      timeout: 30_000,
    });
    if (!data.success) {
      throw Object.assign(new Error(data.error || 'Verification processing failed'), { status: 422 });
    }
    return { matched: data.matched, similarity: data.similarity, method: data.method };
  } catch (err) {
    if (err.status) throw err;
    throw Object.assign(
      new Error(`Biometric service unavailable: ${err.message}`),
      { status: 503 }
    );
  }
}

module.exports = { enroll, verify };
