

const { pool } = require('../config/database');

class ExpenseController {
    // Ambil semua data pengeluaran
    static async getAll(req, res) {
        try {
            const [rows] = await pool.execute('SELECT * FROM expenses ORDER BY id DESC');
            res.json({ success: true, data: rows });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
    static async addExpense(req, res) {
        try {
            const { expense_date, category, description, amount, notes } = req.body;
            if (!expense_date || !category || !description || !amount) {
                return res.status(400).json({ success: false, message: 'Tanggal, kategori, deskripsi, dan jumlah wajib diisi' });
            }
            await pool.execute(
                'INSERT INTO expenses (expense_date, category, description, amount, notes) VALUES (?, ?, ?, ?, ?)',
                [expense_date, category, description, amount, notes || '']
            );
            res.status(201).json({ success: true, message: 'Pengeluaran berhasil ditambah' });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    // Delete expense
   static async deleteExpense(req, res) {
        try {
            const { id } = req.params;

            await pool.execute('DELETE FROM expenses WHERE id = ?', [id]);

            res.json({
                success: true,
                message: 'Expense deleted successfully'
            });
        } catch (error) {
            console.error('Error deleting expense:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete expense',
                error: error.message
            });
        }
    } 
static async updateExpense(req, res) {
        try {
            const { id } = req.params;
            const { expense_date, category, description, amount, notes } = req.body;
            await pool.execute(
                'UPDATE expenses SET expense_date = ?, category = ?, description = ?, amount = ?, notes = ? WHERE id = ?',
                [expense_date, category, description, amount, notes || '', id]
            );
            res.json({ success: true, message: 'Expense updated successfully' });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
}
module.exports = ExpenseController;