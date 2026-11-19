'use strict';
/**
 * biometricClient.js — HTTP client for the Python FastAPI biometric microservice.
 *
 * STUB — payload contract not yet agreed with Shree Sai Deekhshit.
 *
 * Questions pending agreement (Day 1 / Day 2):
 *   Q1. Enroll:  multipart field name for the image? ('palm_image'?)
 *   Q2. Enroll:  response shape? { success, template, method, shape }?
 *   Q3. Verify:  how is the stored template passed — form field, JSON, header?
 *   Q4. Verify:  response shape? { success, matched, similarity, method }?
 *   Q5. Similarity direction: higher = more similar?
 *
 * Once agreed, replace the TODO stubs below with real axios calls.
 */

// const axios = require('axios');
// const FormData = require('form-data');

const BASE_URL = () => process.env.BIOMETRIC_SERVICE_URL || 'http://127.0.0.1:8000';

/**
 * Enroll a palm image and get back a serialised template.
 * @param {Buffer} _imageBuffer
 * @param {string} _mimetype
 * @returns {Promise<{ template: string, method: string }>}
 */
async function enroll(_imageBuffer, _mimetype) {
  // TODO: implement once payload agreed with Shree Sai.
  // POST ${BASE_URL()}/process/enroll   multipart: palm_image
  throw new Error(`[biometricClient] enroll() not implemented yet. Base URL: ${BASE_URL()}`);
}

/**
 * Compare a probe image against a stored template.
 * @param {Buffer} _imageBuffer
 * @param {string} _mimetype
 * @param {string} _storedTemplate  base64 or as agreed
 * @returns {Promise<{ matched: boolean, similarity: number, method: string }>}
 */
async function verify(_imageBuffer, _mimetype, _storedTemplate) {
  // TODO: implement once payload agreed with Shree Sai.
  // POST ${BASE_URL()}/process/verify   multipart: palm_image + reference_template
  throw new Error(`[biometricClient] verify() not implemented yet. Base URL: ${BASE_URL()}`);
}

module.exports = { enroll, verify };
