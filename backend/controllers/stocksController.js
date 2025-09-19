const { pool } = require('../config/database');

class StocksController {
    // List all stocks
    static async list(req, res) {
        try {
            const [rows] = await pool.execute('SELECT * FROM stocks ORDER BY created_at DESC');
            res.json({ success: true, data: rows });
        } catch (error) {
            console.error('Error listing stocks:', error);
            res.status(500).json({ success: false, message: 'Failed to list stocks', error: error.message });
        }
    }

    // Get single stock by id or sku
    static async getOne(req, res) {
        try {
            const { id } = req.params;
            // try by numeric id first
            let rows;
            if (/^\d+$/.test(id)) {
                [rows] = await pool.execute('SELECT * FROM stocks WHERE id = ?', [id]);
            } else {
                [rows] = await pool.execute('SELECT * FROM stocks WHERE sku = ?', [id]);
            }
            if (!rows || rows.length === 0) return res.status(404).json({ success: false, message: 'Stock not found' });
            res.json({ success: true, data: rows[0] });
        } catch (error) {
            console.error('Error getting stock:', error);
            res.status(500).json({ success: false, message: 'Failed to get stock', error: error.message });
        }
    }

    // Create stock
    static async create(req, res) {
        try {
            const { sku, barcode, name, category, qty, price, notes } = req.body;
            const [result] = await pool.execute(
                'INSERT INTO stocks (sku, barcode, name, category, qty, price, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [sku, barcode || null, name, category || null, qty || 0, price || 0, notes || null]
            );
            const [rows] = await pool.execute('SELECT * FROM stocks WHERE id = ?', [result.insertId]);
            res.status(201).json({ success: true, data: rows[0] });
        } catch (error) {
            console.error('Error creating stock:', error);
            res.status(500).json({ success: false, message: 'Failed to create stock', error: error.message });
        }
    }

    // Update stock
    static async update(req, res) {
        try {
            const { id } = req.params;
            const { sku, barcode, name, category, qty, price, notes } = req.body;
            // Accept numeric id or sku in URL
            if (/^\d+$/.test(id)) {
                await pool.execute('UPDATE stocks SET sku = ?, barcode = ?, name = ?, category = ?, qty = ?, price = ?, notes = ? WHERE id = ?', [sku, barcode || null, name, category || null, qty || 0, price || 0, notes || null, id]);
                const [rows] = await pool.execute('SELECT * FROM stocks WHERE id = ?', [id]);
                return res.json({ success: true, data: rows[0] });
            }
            await pool.execute('UPDATE stocks SET sku = ?, barcode = ?, name = ?, category = ?, qty = ?, price = ?, notes = ? WHERE sku = ?', [sku, barcode || null, name, category || null, qty || 0, price || 0, notes || null, id]);
            const [rows] = await pool.execute('SELECT * FROM stocks WHERE sku = ?', [sku]);
            res.json({ success: true, data: rows[0] });
        } catch (error) {
            console.error('Error updating stock:', error);
            res.status(500).json({ success: false, message: 'Failed to update stock', error: error.message });
        }
    }

    // Delete stock
    static async delete(req, res) {
        try {
            const { id } = req.params;
            if (/^\d+$/.test(id)) {
                await pool.execute('DELETE FROM stocks WHERE id = ?', [id]);
            } else {
                await pool.execute('DELETE FROM stocks WHERE sku = ?', [id]);
            }
            res.json({ success: true, message: 'Stock deleted' });
        } catch (error) {
            console.error('Error deleting stock:', error);
            res.status(500).json({ success: false, message: 'Failed to delete stock', error: error.message });
        }
    }

    // Seed sample stocks if table empty (convenience endpoint for development)
    static async seed(req, res) {
        try {
            const [rows] = await pool.execute('SELECT COUNT(*) as cnt FROM stocks');
            const count = rows && rows[0] ? rows[0].cnt : 0;
            if (count > 0) {
                const [all] = await pool.execute('SELECT * FROM stocks ORDER BY id DESC');
                return res.json({ success: true, data: all, message: 'Stocks already present' });
            }

            const samples = [
                ['SKU-001','BC-0001','Charger USB-C', 'Aksesoris', 25, 75000.00, 'Charger original compatible'],
                ['SKU-002','BC-0002','Glass Screen Protector', 'Aksesoris', 100, 15000.00, 'Untuk berbagai tipe'],
                ['SKU-003','BC-0003','Baterai Replacement','Spare Parts', 40, 125000.00, 'Baterai for popular models'],
                ['SKU-004','BC-0004','Kabel Data Micro USB','Aksesoris', 60, 20000.00, 'Kabel berkualitas']
            ];

            const insertPromises = samples.map(s => pool.execute(
                'INSERT INTO stocks (sku, barcode, name, category, qty, price, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())',
                s
            ));
            await Promise.all(insertPromises);

            const [newRows] = await pool.execute('SELECT * FROM stocks ORDER BY id DESC');
            res.json({ success: true, data: newRows, message: 'Seeded sample stocks' });
        } catch (error) {
            console.error('Error seeding stocks:', error);
            res.status(500).json({ success: false, message: 'Failed to seed stocks', error: error.message });
        }
    }

    // Search stocks by barcode or sku (query param: barcode or sku)
    static async search(req, res) {
        try {
            const { barcode, sku } = req.query;
            if (barcode) {
                const [rows] = await pool.execute('SELECT * FROM stocks WHERE barcode = ? LIMIT 1', [barcode]);
                if (!rows || rows.length === 0) return res.status(404).json({ success: false, message: 'Stock not found' });
                return res.json({ success: true, data: rows[0] });
            }
            if (sku) {
                const [rows] = await pool.execute('SELECT * FROM stocks WHERE sku = ? LIMIT 1', [sku]);
                if (!rows || rows.length === 0) return res.status(404).json({ success: false, message: 'Stock not found' });
                return res.json({ success: true, data: rows[0] });
            }
            // If no specific param, return all (small result)
            const [all] = await pool.execute('SELECT * FROM stocks ORDER BY id DESC');
            res.json({ success: true, data: all });
        } catch (error) {
            console.error('Error searching stocks:', error);
            res.status(500).json({ success: false, message: 'Failed to search stocks', error: error.message });
        }
    }
}

module.exports = StocksController;
