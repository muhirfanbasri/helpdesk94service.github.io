const express = require('express');
const ExpenseController = require('../controllers/expenseController');
const router = express.Router();

router.get('/', ExpenseController.getAll);
router.post('/', ExpenseController.addExpense);
router.put('/:id', ExpenseController.updateExpense);
router.delete('/:id', ExpenseController.deleteExpense);

module.exports = router;