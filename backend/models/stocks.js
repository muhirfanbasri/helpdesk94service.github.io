const { pool } = require('../config/database');

const StocksModel = {
    async getAll() {
        const [rows] = await pool.execute('SELECT * FROM stocks ORDER BY id DESC');
        return rows;
    },

    async getById(id) {
        const [rows] = await pool.execute('SELECT * FROM stocks WHERE id = ?', [id]);
        return rows[0];
    },

    async getBySku(sku) {
        const [rows] = await pool.execute('SELECT * FROM stocks WHERE sku = ?', [sku]);
        return rows[0];
    },

    async getByBarcode(barcode) {
        const [rows] = await pool.execute('SELECT * FROM stocks WHERE barcode = ?', [barcode]);
        return rows[0];
    },

    async create({ sku, barcode = null, name, category = null, qty = 0, price = 0, notes = null }) {
        const [result] = await pool.execute(
            'INSERT INTO stocks (sku, barcode, name, category, qty, price, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())',
            [sku, barcode || null, name, category, qty, price, notes]
        );
        const [rows] = await pool.execute('SELECT * FROM stocks WHERE id = ?', [result.insertId]);
        return rows[0];
    },

    async updateById(id, { sku, barcode = null, name, category = null, qty = 0, price = 0, notes = null }) {
        await pool.execute(
            'UPDATE stocks SET sku = ?, barcode = ?, name = ?, category = ?, qty = ?, price = ?, notes = ?, updated_at = NOW() WHERE id = ?',
            [sku, barcode || null, name, category, qty, price, notes, id]
        );
        const [rows] = await pool.execute('SELECT * FROM stocks WHERE id = ?', [id]);
        return rows[0];
    },

    async updateBySku(sku, data) {
        await pool.execute(
            'UPDATE stocks SET sku = ?, barcode = ?, name = ?, category = ?, qty = ?, price = ?, notes = ?, updated_at = NOW() WHERE sku = ?',
            [data.sku, data.barcode || null, data.name, data.category, data.qty, data.price, data.notes, sku]
        );
        const [rows] = await pool.execute('SELECT * FROM stocks WHERE sku = ?', [data.sku]);
        return rows[0];
    },

    async deleteById(id) {
        const [result] = await pool.execute('DELETE FROM stocks WHERE id = ?', [id]);
        return result.affectedRows;
    },

    async deleteBySku(sku) {
        const [result] = await pool.execute('DELETE FROM stocks WHERE sku = ?', [sku]);
        return result.affectedRows;
    }
};

module.exports = StocksModel;
