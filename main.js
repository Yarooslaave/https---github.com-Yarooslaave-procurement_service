const express = require('express');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const { body, validationResult } = require('express-validator');
const mysql = require('mysql2');
const path = require('path'); 
const exphbs = require('express-handlebars');
const bcrypt = require('bcryptjs');
const morgan = require('morgan');
const Handlebars = require('handlebars');

const port = process.env.PORT || 3000;

const app = express();

Handlebars.registerHelper('ifAdmin', function(role, options) {
  if(role === '1') {
    return options.fn(this);
  } else {
    return options.inverse(this);
  }
});


app.use(morgan('combined'));

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

const sessionStore = new MySQLStore({}, db.promise());

app.use(session({
    key: 'session_cookie_name',
    secret: 'session_cookie_secret',
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }
}));

app.set('views', path.join(__dirname, 'views')); 
app.use(express.urlencoded({ extended: false }));

app.get('/', (req, res) => {
    res.redirect('/login');
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

app.get('/products', (req, res) => {
    if (!req.session.loggedIn) {
        res.redirect('/login');
    } else {
        const sql = 'SELECT * FROM products';
        db.query(sql, (err, results) => {
            if (err) throw err;
            res.render('products', { products: results, loggedIn: req.session.loggedIn, username: req.session.username });
        });
    }
});

app.get('/products/:id/status', (req, res) => {
    if (req.session.role !== '1') {
        return res.status(403).send('У вас нет прав для выполнения этого действия');
    }

    const { id } = req.params;
    const sql = 'SELECT * FROM products WHERE id = ?';
    db.query(sql, [id], (err, results) => {
        if (err) throw err;
        res.render('status', { product: results[0] });
    });
});

app.post('/products/:id/status', (req, res) => {
    if (req.session.role !== '1') {
        return res.status(403).send('У вас нет прав для выполнения этого действия');
    }

    const { status } = req.body;
    const { id } = req.params;
    const sql = 'UPDATE products SET Status = ? WHERE id = ?';
    db.query(sql, [status, id], (err, results) => {
        if (err) throw err;
        res.redirect('/products');
    });
});

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
                    req.session.username = username;
                    req.session.role = results[0].role; // Сохранение в сессии
                    req.session.userId = results[0].id; // Сохраняем id пользователя в сессии
                    res.redirect('/products');
                } else {
                    res.render('login', { error: 'Неверный логин или пароль' });
                }
            });
        } else {
            res.render('login', { error: 'Неверный логин или пароль' });
        }
    });
});

app.get('/logout', (req, res) => {
    req.session.destroy(err => {
      if (err) {
        return res.redirect('/');
      }
    
      res.clearCookie('connect.sid');
      res.redirect('/login');
    });
});

app.get('/order', (req, res) => {
    if (req.session.loggedIn) {
        res.render('order', { loggedIn: req.session.loggedIn, username: req.session.username }); // отображаем страницу заказа
    } else {
        res.redirect('/login'); // перенаправляем на страницу входа
    }
});

// Создание заказа
app.post('/submit_order', (req, res) => {
    const { name, quantity, url, desirable_deadline } = req.body; // name теперь извлекается из req.body
    const author = req.session.username;
    const userId = req.session.userId;
    const sql = 'INSERT INTO products (name, quantity, url, desirable_deadline, author, Status) VALUES (?, ?, ?, ?, ?, "На рассмотрении")';
    db.query(sql, [name, quantity, url, desirable_deadline, author], (err, results) => { // Status убран из списка параметров
        if (err) throw err;
        res.redirect('/products');
    });
});

app.get('/order_admin', (req, res) => {
    if (req.session.loggedIn && req.session.role === 1) {
        res.render('order_admin', { loggedIn: req.session.loggedIn, username: req.session.username, admin: true}); // добавляем admin: true
    } else {
        res.redirect('/login'); // перенаправляем на страницу входа
    }
});

app.use((req, res, next) => {
  console.log(req.session);
  next();
});

app.listen (3000, () => {
    console.log(`Server running on port ${port}`);
});
