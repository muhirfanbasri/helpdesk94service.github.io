const express = require('express');
const router = express.Router();
const StocksController = require('../controllers/stocksController');

router.get('/', StocksController.list);
router.get('/search', StocksController.search);
router.post('/seed', StocksController.seed);
router.post('/', StocksController.create);
router.get('/:id', StocksController.getOne);
router.put('/:id', StocksController.update);
router.delete('/:id', StocksController.delete);

module.exports = router;
