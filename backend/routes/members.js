const express = require('express');
const MemberController = require('../controllers/memberController');
const router = express.Router();

router.get('/', MemberController.getAll);
router.post('/', MemberController.add);
router.put('/:id', MemberController.update);
router.delete('/:id', MemberController.delete);

module.exports = router;