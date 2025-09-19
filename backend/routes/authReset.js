const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');
const { pool } = require('../config/database');

// Utility: generate 6-digit reset code
function generateResetCode() {
    return String(Math.floor(100000 + Math.random() * 900000)); // 6-digit
}

// Helper to get password_reset row by email
async function getResetByEmail(email) {
    const [rows] = await pool.execute('SELECT * FROM password_resets WHERE email = ? ORDER BY id DESC LIMIT 1', [email]);
    return rows && rows.length ? rows[0] : null;
}

// Mailer support (uses SMTP from env or falls back to Ethereal for dev)
let mailerTransporter = null;
let mailerIsTestAccount = false;
async function initMailer() {
    if (mailerTransporter) return mailerTransporter;
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
        mailerTransporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT) || 587,
            secure: String(process.env.SMTP_SECURE) === 'true',
            auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        });
        mailerIsTestAccount = false;
        console.log('Mailer: using SMTP', process.env.SMTP_HOST);
    } else {
        const testAccount = await nodemailer.createTestAccount();
        mailerTransporter = nodemailer.createTransport({
            host: 'smtp.ethereal.email',
            port: 587,
            secure: false,
            auth: { user: testAccount.user, pass: testAccount.pass }
        });
        mailerIsTestAccount = true;
        console.log('Mailer: using Ethereal test account', testAccount.user);
    }
    return mailerTransporter;
}

async function sendResetEmail(toEmail, code) {
    try {
        await initMailer();
        if (!mailerTransporter) throw new Error('No mail transporter available');

        const from = process.env.FROM_EMAIL || process.env.SMTP_USER || 'no-reply@example.com';
        const subject = 'Service HP — Reset Password';

        // Plain-text fallback
        const text = `Anda meminta reset password untuk akun ini.\nKode reset: ${code}\nKode berlaku selama 15 menit.\n\nJika Anda tidak meminta reset password, abaikan pesan ini.`;

        // HTML template (simple, mobile-friendly)
        const html = `
        <div style="font-family: Inter, Roboto, Arial, Helvetica, sans-serif; color:#0f172a;">
          <div style="max-width:600px;margin:0 auto;padding:24px;background:#ffffff;border-radius:12px;box-shadow:0 6px 18px rgba(2,6,23,0.08)">
            <div style="text-align:center;margin-bottom:12px">
              <img src="cid:logo@servicehp" alt="Service HP" style="width:72px;height:72px;object-fit:contain;" />
            </div>
            <h2 style="margin:0 0 8px;color:#0b2446">Reset Password</h2>
            <p style="margin:0 0 18px;color:#475569">Gunakan kode di bawah ini untuk mereset password Anda. Kode berlaku 15 menit.</p>
            <div style="text-align:center;margin:18px 0">
              <div style="display:inline-block;padding:16px 22px;border-radius:8px;background:linear-gradient(90deg,#0ea5e9,#6366f1);color:white;font-weight:700;font-size:20px;letter-spacing:2px">${code}</div>
            </div>
            <p style="color:#64748b;font-size:13px;margin-top:18px">Jika Anda tidak meminta reset password, abaikan email ini atau hubungi administrator.</p>
            <hr style="border:none;border-top:1px solid #eef2ff;margin:18px 0" />
            <p style="color:#94a3b8;font-size:12px;margin:0">Service HP — Management System</p>
          </div>
        </div>
        `;

        // Optionally embed a small inline logo if available
        const attachments = [];
        const logoPath = path.join(__dirname, '..', '..', 'img', 'helpdesk.png');
        try {
            if (fs.existsSync(logoPath)) {
                attachments.push({ filename: 'logo.png', path: logoPath, cid: 'logo@servicehp' });
            }
        } catch (e) {
            // ignore
        }

        const info = await mailerTransporter.sendMail({ from, to: toEmail, subject, text, html, attachments });
        if (mailerIsTestAccount) {
            const preview = nodemailer.getTestMessageUrl(info);
            console.log(`[mail preview] ${preview}`);
            return { ok: true, preview };
        }
        return { ok: true };
    } catch (err) {
        console.error('sendResetEmail error', err && err.message ? err.message : err);
        return { ok: false, error: err && err.message ? err.message : String(err) };
    }
}

// POST /forgot-password
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body || {};
        if (!email) return res.status(400).json({ success: false, message: 'Email harus diisi' });

        // Optionally check whether email exists; to avoid enumeration we return success regardless
        const [rows] = await pool.execute('SELECT id, email FROM users WHERE email = ?', [email]);
        const exists = rows && rows.length > 0;

        // Rate limiting: check last_sent in DB (prevent rapid re-request)
        const existing = await getResetByEmail(email);
        const now = new Date();
        if (existing && existing.last_sent && (now - new Date(existing.last_sent) < 10 * 1000)) {
            return res.status(429).json({ success: false, message: 'Tunggu beberapa saat sebelum meminta kode lagi.' });
        }

        const code = generateResetCode();
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

        // Insert new reset row
        await pool.execute(
            'INSERT INTO password_resets (email, code, expires_at, attempts, last_sent) VALUES (?, ?, ?, ?, ?)',
            [email, code, expiresAt, 0, now]
        );

        // Attempt to send email. If mail sending fails, log but still return success
        const mailResult = await sendResetEmail(email, code);
        if (!mailResult.ok) {
            console.error('Mail send failed for forgot-password:', mailResult.error);
            // For development, include the error in the response to speed debugging, but still 200
            const respPayload = { success: true, message: 'Kode reset telah dibuat dan disimpan. Jika email terdaftar, instruksi akan dikirim.' };
            if (process.env.NODE_ENV === 'development') respPayload.note = `mail error: ${mailResult.error}`;
            return res.json(respPayload);
        }

        const respPayload = { success: true, message: 'Kode reset telah dikirim ke email jika terdaftar.' };
        if (mailResult.preview) respPayload.preview = mailResult.preview;
        return res.json(respPayload);
    } catch (err) {
        console.error('forgot-password error', err);
        return res.status(500).json({ success: false, message: 'Gagal memproses permintaan.' });
    }
});

// POST /resend-reset-code
router.post('/resend-reset-code', async (req, res) => {
    try {
        const { email } = req.body || {};
        if (!email) return res.status(400).json({ success: false, message: 'Email harus diisi' });

        const now = new Date();
        const existing = await getResetByEmail(email);
        if (existing && existing.last_sent && (now - new Date(existing.last_sent) < 10 * 1000)) {
            return res.status(429).json({ success: false, message: 'Tunggu beberapa saat sebelum mengirim ulang kode.' });
        }

        // If existing is still valid, reuse code; otherwise create new code
        let code;
        if (existing && new Date(existing.expires_at) > now && existing.code) {
            code = existing.code;
        } else {
            code = generateResetCode();
        }

        const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
        await pool.execute(
            'INSERT INTO password_resets (email, code, expires_at, attempts, last_sent) VALUES (?, ?, ?, ?, ?)',
            [email, code, expiresAt, 0, now]
        );

        // send email (log failures but still return success to client)
        const mailResult = await sendResetEmail(email, code);
        if (!mailResult.ok) {
            console.error('Mail send failed for resend-reset-code:', mailResult.error);
            const resp = { success: true, message: 'Kode reset telah dibuat. Jika email terdaftar, instruksi akan dikirim.' };
            if (process.env.NODE_ENV === 'development') resp.note = `mail error: ${mailResult.error}`;
            return res.json(resp);
        }
        const resp = { success: true, message: 'Kode reset dikirim ulang jika email terdaftar.' };
        if (mailResult.preview) resp.preview = mailResult.preview;
        return res.json(resp);
    } catch (err) {
        console.error('resend-reset-code error', err);
        return res.status(500).json({ success: false, message: 'Gagal memproses permintaan.' });
    }
});

// POST /reset-password
router.post('/reset-password', async (req, res) => {
    try {
        const { email, code, newPassword } = req.body || {};
        if (!email || !code || !newPassword) return res.status(400).json({ success: false, message: 'Data tidak lengkap' });

        const entry = await getResetByEmail(email);
        if (!entry) return res.status(400).json({ success: false, message: 'Kode tidak ditemukan atau sudah kadaluarsa.' });
        const now = new Date();
        if (now > new Date(entry.expires_at)) {
            // Optionally remove expired rows
            await pool.execute('DELETE FROM password_resets WHERE id = ?', [entry.id]);
            return res.status(400).json({ success: false, message: 'Kode telah kadaluarsa.' });
        }
        if (String(entry.code).trim() !== String(code).trim()) {
            // increment attempts
            await pool.execute('UPDATE password_resets SET attempts = attempts + 1 WHERE id = ?', [entry.id]);
            return res.status(400).json({ success: false, message: 'Kode reset salah.' });
        }

        // Find user
        const [rows] = await pool.execute('SELECT id FROM users WHERE email = ?', [email]);
        if (!rows || rows.length === 0) {
            // Delete used reset and return error
            await pool.execute('DELETE FROM password_resets WHERE id = ?', [entry.id]);
            return res.status(400).json({ success: false, message: 'Email tidak ditemukan.' });
        }

        const userId = rows[0].id;
        // Hash new password
        const hashed = await bcrypt.hash(newPassword, 10);
        await pool.execute('UPDATE users SET password = ? WHERE id = ?', [hashed, userId]);

        // Clear the reset entries for this email (remove all)
        await pool.execute('DELETE FROM password_resets WHERE email = ?', [email]);

        return res.json({ success: true, message: 'Password berhasil diubah.' });
    } catch (err) {
        console.error('reset-password error', err);
        return res.status(500).json({ success: false, message: 'Gagal memproses permintaan.' });
    }
});

module.exports = router;
