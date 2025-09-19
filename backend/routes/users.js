const express = require('express');
const UserController = require('../controllers/userController');
const router = express.Router();

router.get('/', UserController.getAllUsers);
router.post('/', UserController.addUser);
router.delete('/:id', UserController.deleteUser);
router.put('/:id', UserController.updateUser);

module.exports = router;