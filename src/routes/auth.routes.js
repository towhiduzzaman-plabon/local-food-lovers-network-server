import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { verifyFirebaseIdToken } from '../firebaseAdmin.js';

const router = Router();

router.post('/session', async (req, res) => {
  try {
    const { idToken } = req.body || {};
    if (!idToken) return res.status(400).json({ message: 'idToken required' });

    const decoded = await verifyFirebaseIdToken(idToken);
    const email = decoded?.email;
    if (!email) return res.status(403).json({ message: 'Email missing' });

    const token = jwt.sign({ email }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES || '7d',
    });

    res.cookie('token', token, {
      httpOnly: true,
      sameSite: process.env.COOKIE_SECURE === 'true' ? 'none' : 'lax',
      secure: process.env.COOKIE_SECURE === 'true',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({ success: true });
  } catch (e) {
    console.error('Session exchange failed:', e.message);
    res.status(401).json({ message: 'Invalid Firebase ID token' });
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    sameSite: process.env.COOKIE_SECURE === 'true' ? 'none' : 'lax',
    secure: process.env.COOKIE_SECURE === 'true',
  });
  res.json({ success: true });
});

export default router;
