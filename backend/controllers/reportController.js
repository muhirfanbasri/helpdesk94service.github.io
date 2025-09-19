
const { pool } = require('../config/database');

class ReportController {
    // Summary laporan: total pemasukan, pengeluaran, laba/rugi, total service, detail pemasukan/pengeluaran
    static async getReportSummary(req, res) {
    try {
        let { startDate, endDate } = req.query;

        // Normalisasi format tanggal ke YYYY-MM-DD
        function normalizeDate(dateStr) {
            if (!dateStr) return '';
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return '';
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            return `${yyyy}-${mm}-${dd}`;
        }
        startDate = normalizeDate(startDate);
        endDate = normalizeDate(endDate);

        // Query summary
        let incomeQuery = 'SELECT COALESCE(SUM(price),0) AS totalIncome FROM services WHERE payment_status = "Sudah Bayar"';
        let expenseQuery = 'SELECT COALESCE(SUM(amount),0) AS totalExpense FROM expenses';
        let serviceCountQuery = 'SELECT COUNT(*) AS totalServices FROM services WHERE payment_status = "Sudah Bayar"';
        let incomeTypeQuery = 'SELECT service_type, COALESCE(SUM(price),0) AS total, COUNT(*) AS count FROM services WHERE payment_status = "Sudah Bayar"';
        let expenseCatQuery = 'SELECT category, COALESCE(SUM(amount),0) AS total, COUNT(*) AS count FROM expenses';

        const params = [];
        const expenseParams = [];
        const countParams = [];
        const incomeTypeParams = [];
        const expenseCatParams = [];

        // Filter tanggal jika ada
        if (startDate && endDate) {
            incomeQuery += ' AND DATE(service_date) BETWEEN ? AND ?';
            expenseQuery += ' WHERE DATE(expense_date) BETWEEN ? AND ?'; // <-- GANTI AND menjadi WHERE
            serviceCountQuery += ' AND DATE(service_date) BETWEEN ? AND ?';
            incomeTypeQuery += ' AND DATE(service_date) BETWEEN ? AND ?';
            expenseCatQuery += ' WHERE DATE(expense_date) BETWEEN ? AND ?';
            params.push(startDate, endDate);
            expenseParams.push(startDate, endDate);
            countParams.push(startDate, endDate);
            incomeTypeParams.push(startDate, endDate);
            expenseCatParams.push(startDate, endDate);
        }

        incomeTypeQuery += ' GROUP BY service_type';
        expenseCatQuery += ' GROUP BY category';

        // Eksekusi query
        const [incomeResult] = await pool.execute(incomeQuery, params);
        const [expenseResult] = await pool.execute(expenseQuery, expenseParams);
        const [serviceCountResult] = await pool.execute(serviceCountQuery, countParams);
        const [incomeByType] = await pool.execute(incomeTypeQuery, incomeTypeParams);
        const [expenseByCategory] = await pool.execute(expenseCatQuery, expenseCatParams);

        // Response
        res.json({
            success: true,
            data: {
                totalIncome: parseFloat(incomeResult[0]?.totalIncome || 0),
                totalExpense: parseFloat(expenseResult[0]?.totalExpense || 0),
                totalServices: parseInt(serviceCountResult[0]?.totalServices || 0),
                incomeByType,
                expenseByCategory
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}

    // Download laporan service (CSV)
    static async downloadServiceReport(req, res) {
        try {
            const [rows] = await pool.execute(`
                SELECT s.id, s.service_date, s.price, s.service_type, m.name as member_name
                FROM services s
                LEFT JOIN members m ON s.member_id = m.id
                ORDER BY s.service_date DESC
            `);

            let csv = 'ID,Tanggal,Service,Harga,Member\n';
            rows.forEach(row => {
                csv += `${row.id},"${row.service_date}","${row.service_type}",${row.price},"${row.member_name || ''}"\n`;
            });

            res.header('Content-Type', 'text/csv');
            res.attachment('laporan_service.csv');
            res.send(csv);
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    // Endpoint: data service untuk laporan detail
    static async getServiceReportData(req, res) {
        try {
            const [rows] = await pool.execute(`
                SELECT s.id, s.service_date, s.price, s.service_type, m.name as member_name
                FROM services s
                LEFT JOIN members m ON s.member_id = m.id
                ORDER BY s.service_date DESC
            `);
            res.json({ success: true, data: rows });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
}

module.exports = ReportController;