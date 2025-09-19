const { pool } = require('../config/database');

class UserController {
    // Ambil semua data user
    static async getAllUsers(req, res) {
        try {
            const [rows] = await pool.execute('SELECT * FROM users');
            res.json({ success: true, data: rows });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    // Tambah user baru
    static async addUser(req, res) {
        try {
            const { name, username, password, email, role, is_active, photo } = req.body;
            // Cek apakah username sudah ada
            const [existing] = await pool.execute('SELECT id FROM users WHERE username = ?', [username]);
            if (existing.length > 0) {
                return res.status(400).json({ success: false, message: 'Username sudah digunakan, silakan pilih username lain.' });
            }
            const bcrypt = require('bcrypt');
            const saltRounds = 10;
            const hashedPassword = await bcrypt.hash(password, saltRounds);
            const activeValue = (is_active === true || is_active === 'true' || is_active === 1 || is_active === '1') ? 1 : 0;

            // If photo is provided (non-empty), include it in the INSERT so it's stored.
            // If not provided, omit the photo column so the database default/NULL is used
            if (photo && String(photo).trim() !== '') {
                await pool.execute(
                    'INSERT INTO users (name, username, password, email, role, is_active, photo) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    [name, username, hashedPassword, email, role, activeValue, photo]
                );
            } else {
                await pool.execute(
                    'INSERT INTO users (name, username, password, email, role, is_active) VALUES (?, ?, ?, ?, ?, ?)',
                    [name, username, hashedPassword, email, role, activeValue]
                );
            }
            res.json({ success: true, message: 'User berhasil ditambahkan' });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    // Hapus user
    static async deleteUser(req, res) {
        try {
            const { id } = req.params;
            await pool.execute('DELETE FROM users WHERE id = ?', [id]);
            res.json({ success: true, message: 'User berhasil dihapus' });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    // Update user
    static async updateUser(req, res) {
        try {
            const { id } = req.params;
            const { name, username, email, role, is_active, password, photo } = req.body;
            const activeValue = (is_active === true || is_active === 'true' || is_active === 1 || is_active === '1') ? 1 : 0;

            // Preserve existing photo when client does not provide a new one
            const [[existingRow]] = await pool.execute('SELECT photo FROM users WHERE id = ?', [id]);
            const existingPhoto = existingRow ? existingRow.photo : null;

            // Determine the photo value to use: if client provided a non-empty photo, use it;
            // otherwise keep the existing value.
            let photoToUse = existingPhoto;
            if (photo !== undefined && photo !== null && String(photo).trim() !== '') {
                photoToUse = photo;
            }

            // If password provided and non-empty, hash it and include in update
            if (password && String(password).trim() !== '') {
                const bcrypt = require('bcrypt');
                const saltRounds = 10;
                const hashedPassword = await bcrypt.hash(String(password), saltRounds);
                const [result] = await pool.execute(
                    'UPDATE users SET name = ?, username = ?, email = ?, role = ?, is_active = ?, password = ?, photo = ? WHERE id = ?',
                    [name, username, email, role, activeValue, hashedPassword, photoToUse, id]
                );
                if (result.affectedRows === 0) {
                    return res.status(404).json({ success: false, message: 'User tidak ditemukan' });
                }
            } else {
                const [result] = await pool.execute(
                    'UPDATE users SET name = ?, username = ?, email = ?, role = ?, is_active = ?, photo = ? WHERE id = ?',
                    [name, username, email, role, activeValue, photoToUse, id]
                );
                if (result.affectedRows === 0) {
                    return res.status(404).json({ success: false, message: 'User tidak ditemukan' });
                }
            }
            res.json({ success: true, message: 'User berhasil diupdate' });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
}

module.exports = UserController;