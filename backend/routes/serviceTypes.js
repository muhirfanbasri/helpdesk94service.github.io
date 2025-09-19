const express = require('express');
const ServiceTypeController = require('../controllers/serviceTypeController');
const router = express.Router();

router.get('/', ServiceTypeController.getAll);
router.post('/', ServiceTypeController.add);
router.delete('/:id', ServiceTypeController.delete);

module.exports = router;