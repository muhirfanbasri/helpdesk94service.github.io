const { pool } = require('../config/database');

class ServiceController {
    // Get all services
    static async getAllServices(req, res) {
        try {
            const [rows] = await pool.execute(`
                SELECT s.*, m.code as member_code,
                       CASE WHEN s.service_stock_sku IS NOT NULL AND s.service_stock_sku <> '' THEN 'stok' ELSE 'jenis' END as source
                FROM services s 
                LEFT JOIN members m ON s.member_id = m.id 
                ORDER BY s.created_at DESC
            `);
            
            res.json({
                success: true,
                data: rows
            });
        } catch (error) {
            console.error('Error fetching services:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch services',
                error: error.message
            });
        }
    }

    // Add new service
    static async addService(req, res) {
        try {
            const {
                service_date,
                customer_name,
                customer_phone,
                service_type,
                price,
                service_stock_sku,
                member_status,
                payment_status,
                notes
            } = req.body;

            // Check if customer is a member
            let member_id = null;
            if (member_status === 'Member') {
                const [memberRows] = await pool.execute(
                    'SELECT id FROM members WHERE phone = ? AND is_active = TRUE',
                    [customer_phone]
                );
                if (memberRows.length > 0) {
                    member_id = memberRows[0].id;
                }
            }

            // If a service_stock_sku was provided, validate it exists in stocks
            let validatedSku = null;
            if (service_stock_sku) {
                const [stockRows] = await pool.execute(
                    'SELECT sku FROM stocks WHERE sku = ? LIMIT 1',
                    [service_stock_sku]
                );
                if (stockRows.length === 0) {
                    return res.status(400).json({
                        success: false,
                        message: 'Invalid service_stock_sku: SKU not found'
                    });
                }
                validatedSku = stockRows[0].sku;
            }

            const [result] = await pool.execute(`
                INSERT INTO services (
                    service_date, customer_name, customer_phone, 
                    service_type, price, service_stock_sku, member_status, payment_status, 
                    notes, member_id
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                service_date, customer_name, customer_phone,
                service_type, price, validatedSku, member_status, payment_status,
                notes, member_id
            ]);

            // Get the inserted service
            const [newService] = await pool.execute(
                'SELECT * FROM services WHERE id = ?',
                [result.insertId]
            );

            res.status(201).json({
                success: true,
                message: 'Service added successfully',
                data: newService[0]
            });
        } catch (error) {
            console.error('Error adding service:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to add service',
                error: error.message
            });
        }
    }

    // Update payment status
    static async updatePaymentStatus(req, res) {
        try {
            const { id } = req.params;
            const { payment_status } = req.body;

            await pool.execute(
                'UPDATE services SET payment_status = ? WHERE id = ?',
                [payment_status, id]
            );

            const [updatedService] = await pool.execute(
                'SELECT * FROM services WHERE id = ?',
                [id]
            );

            res.json({
                success: true,
                message: 'Payment status updated successfully',
                data: updatedService[0]
            });
        } catch (error) {
            console.error('Error updating payment status:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update payment status',
                error: error.message
            });
        }
    }

    // Delete service
    static async deleteService(req, res) {
        try {
            const { id } = req.params;

            await pool.execute('DELETE FROM services WHERE id = ?', [id]);

            res.json({
                success: true,
                message: 'Service deleted successfully'
            });
        } catch (error) {
            console.error('Error deleting service:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete service',
                error: error.message
            });
        }
    }

    // Get piutang (unpaid services)
    static async getPiutang(req, res) {
        try {
            const [rows] = await pool.execute(`
                SELECT s.*, 
                       CASE WHEN s.service_stock_sku IS NOT NULL AND s.service_stock_sku <> '' THEN 'stok' ELSE 'jenis' END as source
                FROM services s
                WHERE payment_status = 'Belum Bayar' 
                ORDER BY service_date ASC
            `);

            res.json({
                success: true,
                data: rows
            });
        } catch (error) {
            console.error('Error fetching piutang:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch piutang',
                error: error.message
            });
        }
    }

    // Track service by phone + date (used by public tracking page)
    static async track(req, res) {
        try {
            const { phone, date } = req.query;
            if (!phone) return res.status(400).json({ success: false, message: 'phone query param required' });

            // normalize phone: remove non-digits and convert leading 62 -> 0
            let norm = String(phone).replace(/\D/g, '');
            if (norm.startsWith('62')) norm = '0' + norm.slice(2);
            if (norm.startsWith('+62')) norm = '0' + norm.slice(3);

            // find exact match by normalized phone and date if provided
            const params = [ '%' + norm.replace(/[^0-9]/g, '') + '%' ];
            let dateClause = '';
            if (date) {
                // accept date in YYYY-MM-DD and compare DATE(service_date)
                dateClause = ' AND DATE(service_date) = ?';
                params.push(date);
            }

            const query = `
                SELECT s.*, m.code as member_code,
                       CASE WHEN s.service_stock_sku IS NOT NULL AND s.service_stock_sku <> '' THEN 'stok' ELSE 'jenis' END as source
                FROM services s
                LEFT JOIN members m ON s.member_id = m.id
                WHERE REPLACE(REPLACE(s.customer_phone, ' ', ''), '-', '') LIKE ? ${dateClause}
                ORDER BY s.service_date DESC
            `;

            const [rows] = await pool.execute(query, params);

            // prepare suggestions (other dates for same normalized phone)
            const suggestionQuery = `
                SELECT service_date
                FROM services
                WHERE REPLACE(REPLACE(customer_phone, ' ', ''), '-', '') LIKE ?
                ORDER BY service_date DESC
            `;
            const [sugs] = await pool.execute(suggestionQuery, [ '%' + norm.replace(/[^0-9]/g, '') + '%' ]);

            res.json({ success: true, data: rows, suggestions: sugs.map(r => r.service_date) });
        } catch (error) {
            console.error('Error in track:', error);
            res.status(500).json({ success: false, message: 'Failed to track service', error: error.message });
        }
    }
}

module.exports = ServiceController;