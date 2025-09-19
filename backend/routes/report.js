const express = require('express');
const ReportController = require('../controllers/reportController');
const router = express.Router();

// Summary laporan (pemasukan, pengeluaran, total service, detail)
router.get('/summary', ReportController.getReportSummary);

// Download laporan service (CSV)
router.get('/service', ReportController.downloadServiceReport);

// Data service untuk laporan detail
router.get('/service-data', ReportController.getServiceReportData);

module.exports = router;