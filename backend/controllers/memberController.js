const { pool } = require('../config/database');

class MemberController {
    // Ambil semua member
    static async getAll(req, res) {
        try {
            const [rows] = await pool.execute('SELECT * FROM members ORDER BY id DESC');
            res.json({ success: true, data: rows });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    // Tambah member baru
    static async add(req, res) {
    try {
        const { name, phone, email, address } = req.body;
        if (!name || !phone) {
            return res.status(400).json({ success: false, message: 'Nama dan telepon wajib diisi' });
        }
        // Generate kode member otomatis (misal: M001, M002, dst)
        const [rows] = await pool.execute('SELECT MAX(id) as maxId FROM members');
        const nextId = (rows[0].maxId || 0) + 1;
        const code = `M${String(nextId).padStart(3, '0')}`;

        await pool.execute(
            'INSERT INTO members (name, phone, email, address, code, join_date, is_active) VALUES (?, ?, ?, ?, ?, NOW(), 1)',
            [name, phone, email || '', address || '', code]
        );
        res.status(201).json({ success: true, message: 'Member berhasil ditambah' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}

// Edit member
static async update(req, res) {
    try {
        const { id } = req.params;
        const { name, phone, email, address } = req.body;
        if (!name || !phone) {
            return res.status(400).json({ success: false, message: 'Nama dan telepon wajib diisi' });
        }
        await pool.execute(
            'UPDATE members SET name=?, phone=?, email=?, address=? WHERE id=?',
            [name, phone, email || '', address || '', id]
        );
        res.json({ success: true, message: 'Member berhasil diupdate' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}


// Hapus member
static async delete(req, res) {
    try {
        let { id } = req.params;
        id = parseInt(id, 10);
        if (isNaN(id)) {
            return res.status(400).json({ success: false, message: 'ID tidak valid' });
        }
        const [result] = await pool.execute('DELETE FROM members WHERE id = ?', [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Member tidak ditemukan' });
        }
        res.json({ success: true, message: 'Member berhasil dihapus' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}


}

module.exports = MemberController;