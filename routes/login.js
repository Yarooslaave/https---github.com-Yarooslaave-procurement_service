const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');

const app = express();

app.get("/login");

router.get('/', (req, res) => {
    res.render('login'); 
});

router.post('/', [
    body('username').notEmpty(),
    body('password').notEmpty()
], (req, res) => {
    // Ваш код для входа в систему
});

module.exports = router;
