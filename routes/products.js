const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
    const sql = 'SELECT * FROM products';
    db.query(sql, (err, results) => {
        if (err) throw err;
        res.render('products', { products: results });
    });
});

module.exports = router;
