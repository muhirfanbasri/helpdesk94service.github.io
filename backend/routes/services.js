const express = require('express');
const ServiceController = require('../controllers/serviceController');

const router = express.Router();

router.get('/', ServiceController.getAllServices);
router.get('/track', ServiceController.track);
router.post('/', ServiceController.addService);
router.put('/:id/payment', ServiceController.updatePaymentStatus);
router.delete('/:id', ServiceController.deleteService);
router.get('/piutang', ServiceController.getPiutang);

module.exports = router;