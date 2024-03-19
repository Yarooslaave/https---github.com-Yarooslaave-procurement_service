const express = require('express');
const session = require('express-session');
const { body, validationResult } = require('express-validator'); 
const mysql = require('mysql2');
const hbs = require('express-handlebars');
const path = require('path'); 

const app = express();
const port = process.env.PORT || 3000;

const db = mysql.createConnection({
    host: 'localhost',
    user: '127.0.0.1',
    password: '',
    database: 'procurement_service'
});

db.connect((err) => {
    if (err) throw err;
    console.log('Connected to MySQL database');
});

app.use(session({
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: true
}));

app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views')); 
app.use(express.urlencoded({ extended: false }));
app.use(expressValidator()); 
app.get('/login', (req, res) => {
    res.render('login'); 
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;

    const sql = 'SELECT * FROM users WHERE username = ? AND password = ?';
    db.query(sql, [username, password], (err, results) => {
        if (err) throw err;

        if (results.length > 0) {
            req.session.loggedIn = true;
            res.redirect('/dashboard');
        } else {
            res.render('login', { error: 'Неверный логин или пароль' });
        }
    });
});

app.use((req, res, next) => {
    if (req.session.loggedIn) {
        next();
    } else {
        res.redirect('/login');
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
