const { pool } = require('../config/database');

class ServiceTypeController {
    // Ambil semua jenis service
    static async getAll(req, res) {
        try {
            const [rows] = await pool.execute('SELECT * FROM service_types ORDER BY id DESC');
            res.json({ success: true, data: rows });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    // Tambah jenis service baru
    static async add(req, res) {
        try {
            const { name } = req.body;
            if (!name) return res.status(400).json({ success: false, message: 'Nama jenis service wajib diisi' });

            await pool.execute('INSERT INTO service_types (name) VALUES (?)', [name]);
            res.status(201).json({ success: true, message: 'Jenis service berhasil ditambah' });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
    // Hapus Jenis Service 
static async delete(req, res) {
        try {
            let { id } = req.params;
            id = parseInt(id, 10);
            if (isNaN(id)) {
                return res.status(400).json({ success: false, message: 'ID tidak valid' });
            }
            const [result] = await pool.execute('DELETE FROM service_types WHERE id = ?', [id]);
            if (result.affectedRows === 0) {
                return res.status(404).json({ success: false, message: 'Jenis service tidak ditemukan' });
            }
            res.json({ success: true, message: 'Jenis service berhasil dihapus' });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
}

module.exports = ServiceTypeController;