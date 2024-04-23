const mysql = require('mysql2');
const bcrypt = require('bcryptjs');

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

db.registerUser = function(username, password, email, callback) {
    bcrypt.hash(password, 10, function(err, hash) {
        const sql = 'INSERT INTO users (username, password, email) VALUES (?, ?, ?)';
        db.query(sql, [username, hash, email], callback);
    });
};

db.getProducts = function(id, callback) {
    const sql = 'SELECT * FROM products WHERE userid = ?';
    this.query(sql, [id], callback);
};

db.getOrderAdmin = function(callback) {
    const sql = 'SELECT * FROM products';
    this.query(sql, callback);
};

db.updateStatus = function(id, status, callback) {
    const sql = 'UPDATE products SET Status = ? WHERE id = ?';
    this.query(sql, [status, id], callback);
};

db.login = function(username, password, callback) {
    const sql = 'SELECT * FROM users WHERE username = ?';
    this.query(sql, [username], (err, results) => {
        if (err) callback(err);

        if (results.length > 0) {
            bcrypt.compare(password, results[0].password, function(err, result) {
                if(result == true) {
                    callback(null, results[0]);
                } else {
                    callback(new Error('Неверный логин или пароль'));
                }
            });
        } else {
            callback(new Error('Неверный логин или пароль'));
        }
    });
};

db.logout = function(req, callback) {
    req.session.destroy(callback);
};

db.order = function(req, callback) {
    if (req.session.loggedIn) {
        callback(null, { loggedIn: req.session.loggedIn, username: req.session.username });
    } else {
        callback(new Error('Not logged in'));
    }
};

db.submitOrder = function(name, quantity, url, desirable_deadline, author, userId, callback) {
    const sql = 'INSERT INTO products (name, quantity, url, desirable_deadline, author, Status, userid) VALUES (?, ?, ?, ?, ?, "На рассмотрении", ?)';
    this.query(sql, [name, quantity, url, desirable_deadline, author, userId], callback);
};

db.orderAdmin = function(req, callback) {
    if (req.session.loggedIn && req.session.role == '1') {
        callback(null, {                 
            loggedIn: req.session.loggedIn, 
            username: req.session.username, 
            role: req.session.role 
        }); 
    } else {
        callback(new Error('Not logged in'));
    }
};

module.exports = db;
