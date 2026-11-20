'use strict';
/**
 * walletController.js — Read wallet balance.
 *
 * Route (Charan's file, NOT edited):
 *   GET /api/wallet   (auth middleware applied by router)
 */

const walletRepo = require('../repositories/walletRepository');

/**
 * GET /api/wallet
 * Returns: { wallet: { id, user_id, balance, updated_at } }
 */
async function getWallet(req, res) {
  const wallet = await walletRepo.getWallet(req.user.id);
  if (!wallet) {
    return res.status(404).json({ error: 'Wallet not found for this user.' });
  }
  return res.json({ wallet });
}

module.exports = { getWallet };
