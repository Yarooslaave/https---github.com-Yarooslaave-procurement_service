const express = require('express');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const { body, validationResult } = require('express-validator');
const path = require('path'); 
const exphbs = require('express-handlebars');
const bcrypt = require('bcryptjs');
const morgan = require('morgan'); //Логирование
const rfs = require("rotating-file-stream");
const Handlebars = require('handlebars');
const moment = require('moment');
const db = require('./vendor/db.js');

const port = process.env.PORT || 3000;

const app = express();
let id = null;
Handlebars.registerHelper('ifAdmin', function(role, options) {
  if(role == 1) {
    return options.fn(this);
  } else {
    return options.inverse(this);
  }
});

Handlebars.registerHelper('date', function(value) {
    return moment(value).format('DD/MM/YY');
});

Handlebars.registerHelper('eq', function(a, b) {
    return a === b;
  });

  //Я использую библиотеку morgan для логирования
const rfsStream = rfs.createStream("log.txt", {
    size: '10M', 
    interval: '1d', 
    compress: 'gzip' 
});

app.use(morgan(function (tokens, req, res) {
  return [
    '[' + new Date().toISOString() + ']', 
    tokens.method(req, res),
    tokens.url(req, res),
    tokens.status(req, res),
    tokens.res(req, res, 'content-length'), '-'
  ].join(' ');
}, {
    stream: rfsStream // Записываем логи в файл
}));
  

const hbs = exphbs.create({
  defaultLayout: 'main',
  extname: 'hbs',
});

app.engine('hbs', hbs.engine);
app.set('view engine', 'hbs');
app.set('views', 'views');

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
    res.render('index', {
      loggedIn: req.session.loggedIn, 
      username: req.session.username, 
      role: req.session.role 
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

    db.registerUser(username, password, email, (err, results) => {
        if (err) throw err;
        res.redirect('/register');
    });
});

app.get('/products', async (req, res) => {
    if (!req.session.loggedIn) {
        res.redirect('/login');
    } else {
        db.getProducts(id, (err, results) => {
            if (err) throw err;
            res.render('products', { 
                products: results, 
                loggedIn: req.session.loggedIn, 
                username: req.session.username, 
                role: req.session.role 
            });
        });
    }
});

app.get('/order_admin', (req, res) => {
    if (!req.session.loggedIn) {
        res.redirect('/login');
    } else {
        db.getOrderAdmin((err, results) => {
            if (err) throw err;
            res.render('order_admin', { 
                order_admin: results, 
                loggedIn: req.session.loggedIn, 
                username: req.session.username, 
                role: req.session.role 
            });
        });
    }
});

app.post('/update_status', (req, res) => {
    const { id, status } = req.body;
    
    db.updateStatus(id, status, (err, results) => {
        if (err) throw err;
        res.redirect('/order_admin');
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

    db.login(username, password, (err, user) => {
        if (err) {
            res.render('login', { error: 'Неверный логин или пароль' });
        } else {
            req.session.loggedIn = true;
            req.session.username = username;
            req.session.role = user.role; // Сохранение в сессии
            req.session.userId = user.id; // Сохраняем id пользователя в сессии
            id = user.id

            // Проверка роли пользователя и перенаправление на соответствующую страницу
            if (user.role == 1) {
                res.redirect('/order_admin');
            } else if (user.role == 0) {
                res.redirect('/products');
            } else {
                res.redirect('/');
            }
        }
    });
});


app.get('/logout', (req, res) => {
    db.logout(req, (err) => {
        if (err) {
            return res.redirect('/');
        }
    
        res.clearCookie('connect.sid');
        res.redirect('/login');
    });
});

app.get('/order', (req, res) => {
    db.order(req, (err, data) => {
        if (err) {
            res.redirect('/login');
        } else {
            res.render('order', data);
        }
    });
});

// Создание заказа
app.post('/submit_order', (req, res) => {
    const { name, quantity, url, desirable_deadline } = req.body;
    const author = req.session.username;
    const userId = req.session.userId;
    
    db.submitOrder(name, quantity, url, desirable_deadline, author, userId, (err, results) => {
        if (err) throw err;
        res.redirect('/products');
    });
});

app.get('/order_admin', (req, res) => {
    db.orderAdmin(req, (err, data) => {
        if (err) {
            res.redirect('/login');
        } else {
            res.render('order_admin', data);
        }
    });
});

app.listen (3000, () => {
    console.log(`Server running on port ${port}`);
});
