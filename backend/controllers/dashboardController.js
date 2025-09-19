const { pool } = require('../config/database');
const moment = require('moment');

class DashboardController {
    async getStats(req, res) {
        try {
            const today = moment().format('YYYY-MM-DD');

            // Pemasukan hari ini (service yang sudah bayar)
            const [incomeResult] = await pool.execute(
                'SELECT COALESCE(SUM(price), 0) AS todayIncome FROM services WHERE DATE(service_date) = ? AND payment_status = "Sudah Bayar"',
                [today]
            );

            // Pengeluaran hari ini
            const [expenseResult] = await pool.execute(
                'SELECT COALESCE(SUM(amount), 0) AS todayExpense FROM expenses WHERE DATE(expense_date) = ?',
                [today]
            );

            // Jumlah service hari ini
            const [servicesResult] = await pool.execute(
                'SELECT COUNT(*) AS todayServices FROM services WHERE DATE(service_date) = ?',
                [today]
            );

            // Total piutang (service yang belum bayar, semua waktu)
            const [piutangResult] = await pool.execute(
                'SELECT COALESCE(SUM(price), 0) AS totalPiutang FROM services WHERE payment_status = "Belum Bayar"'
            );

            // Revenue bulanan (12 bulan terakhir)
            const [monthlyRevenueResult] = await pool.execute(`
                SELECT DATE_FORMAT(service_date, '%b') AS month, COALESCE(SUM(price),0) AS total
                FROM services
                WHERE payment_status = 'Sudah Bayar' AND service_date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
                GROUP BY YEAR(service_date), MONTH(service_date)
                ORDER BY YEAR(service_date), MONTH(service_date)
            `);

            // Service terpopuler (top 5 jenis service berdasarkan jumlah transaksi)
            const [popularServicesResult] = await pool.execute(`
                SELECT service_type, COUNT(*) AS count
                FROM services
                WHERE payment_status = 'Sudah Bayar'
                GROUP BY service_type
                ORDER BY count DESC
                LIMIT 5
            `);

            res.json({
                success: true,
                data: {
                    todayIncome: parseFloat(incomeResult[0].todayIncome || 0),
                    todayExpense: parseFloat(expenseResult[0].todayExpense || 0),
                    todayServices: parseInt(servicesResult[0].todayServices || 0),
                    totalPiutang: parseFloat(piutangResult[0].totalPiutang || 0),
                    monthlyRevenue: monthlyRevenueResult,
                    popularServices: popularServicesResult
                }
            });
        } catch (error) {
            console.error('Error fetching dashboard stats:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch dashboard statistics',
                error: error.message
            });
        }
    }
}

module.exports = new DashboardController();