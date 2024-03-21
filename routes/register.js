const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');

router.get('/', (req, res) => {
    res.render('register');
});

router.post('/', [
    body('username').notEmpty(),
    body('password').notEmpty(),
    body('email').isEmail()
], (req, res) => {
    // Ваш код для регистрации
});

module.exports = router;
