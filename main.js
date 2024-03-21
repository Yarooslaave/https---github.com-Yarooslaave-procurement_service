const express = require('express');
const session = require('express-session');
const { body, validationResult } = require('express-validator');
const mysql = require('mysql2');
const path = require('path'); 
const exphbs = require('express-handlebars');
const bcrypt = require('bcryptjs');
const loginRoutes = require('./routes/login');
const registerRoutes = require('./routes/register');
const productsRoutes = require('./routes/products');

const port = process.env.PORT || 3000;

const app = express();


const hbs = exphbs.create({
  defaultLayout: 'main',
  extname: 'hbs',
});

app.engine('hbs', hbs.engine);
app.set('view engine', 'hbs');
app.set('views', 'views');

const db = mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
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


app.set('views', path.join(__dirname, 'views')); 
app.use(express.urlencoded({ extended: false }));

app.get('/login', (req, res) => {
    res.render('login'); 
});

app.post('/login', [
    body('username').notEmpty(),
    body('password').notEmpty()
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { username, password } = req.body;

    const sql = 'SELECT * FROM users WHERE username = ?';
    db.query(sql, [username], (err, results) => {
        if (err) throw err;

        if (results.length > 0) {
            bcrypt.compare(password, results[0].password, function(err, result) {
                if(result == true) {
                    req.session.loggedIn = true;
                    res.redirect('/login');
                } else {
                    res.render('login', { error: 'Неверный логин или пароль' });
                }
            });
        } else {
            res.render('login', { error: 'Неверный логин или пароль' });
        }
    });
});

app.get('/register', (req, res) => {
    res.render('register');
});

app.post('/register', [
    body('username').notEmpty(),
    body('password').notEmpty(),
    body('email').isEmail()
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { username, password, email } = req.body;

    bcrypt.hash(password, 10, function(err, hash) {
        const sql = 'INSERT INTO users (username, password, email) VALUES (?, ?, ?)';
        db.query(sql, [username, hash, email], (err, results) => {
            if (err) throw err;

            res.redirect('/register');
        });
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

app.use('/login', loginRoutes);
app.use('/register', registerRoutes);
app.use('/products', productsRoutes);

app.listen (3000, () => {
    console.log(`Server running on port ${port}`);
});
