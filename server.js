require('dotenv').config();

const express = require('express');
const Database = require('better-sqlite3');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Rate limit the whole API: 20 requests per minute per client.
const limiter = rateLimit({
    windowMs: 60 * 1000,
    max: 20,
    message: {
        error: 'Too many requests, please try again later.'
    }
});
app.use(limiter);

// Open/create the SQLite database and orders table.
const db = new Database('laundry.db');
db.exec(`
    CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customerName TEXT NOT NULL,
        loadCount INTEGER NOT NULL,
        status TEXT NOT NULL,
        dropOffTime TEXT NOT NULL
    )
`);

const allowedStatuses = ['Pending', 'Washing', 'Ready for Pickup', 'Claimed'];

// Validate every provided field and collect all errors together.
// For POST, all fields are required. For PUT, only supplied fields are checked.
function validateOrder(data, partial = false) {
    const errors = [];

    if (!partial || Object.prototype.hasOwnProperty.call(data, 'customerName')) {
        if (typeof data.customerName !== 'string' || data.customerName.trim() === '') {
            errors.push('customerName is required and must be a non-empty string.');
        }
    }

    if (!partial || Object.prototype.hasOwnProperty.call(data, 'loadCount')) {
        if (typeof data.loadCount !== 'number' || !Number.isFinite(data.loadCount) || data.loadCount <= 0) {
            errors.push('loadCount must be a positive number.');
        }
    }

    if (!partial || Object.prototype.hasOwnProperty.call(data, 'status')) {
        if (!allowedStatuses.includes(data.status)) {
            errors.push('status must be one of: ' + allowedStatuses.join(', ') + '.');
        }
    }

    if (!partial || Object.prototype.hasOwnProperty.call(data, 'dropOffTime')) {
        if (typeof data.dropOffTime !== 'string' || data.dropOffTime.trim() === '') {
            errors.push('dropOffTime is required and must be a non-empty string.');
        }
    }

    return errors;
}

function requireApiKey(req, res, next) {
    const key = req.headers['x-api-key'];

    if (!key || key !== process.env.API_KEY) {
        const error = new Error('Invalid or missing API key.');
        error.statusCode = 401;
        return next(error);
    }

    next();
}

function sendValidationErrors(errors, res) {
    return res.status(400).json({ errors });
}

// GET all orders (no API key required).
app.get('/orders', (req, res, next) => {
    try {
        const orders = db.prepare('SELECT * FROM orders ORDER BY id').all();
        res.json(orders);
    } catch (err) {
        next(err);
    }
});

// GET one order by ID (no API key required).
app.get('/orders/:id', (req, res, next) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({ error: 'Order ID must be a positive integer.' });
        }

        const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
        if (!order) {
            const error = new Error('Order not found.');
            error.statusCode = 404;
            throw error;
        }

        res.json(order);
    } catch (err) {
        next(err);
    }
});

// POST a new order (API key required).
app.post('/orders', requireApiKey, (req, res, next) => {
    try {
        const data = req.body || {};
        const errors = validateOrder(data);

        if (errors.length > 0) {
            return sendValidationErrors(errors, res);
        }

        const result = db.prepare(`
            INSERT INTO orders (customerName, loadCount, status, dropOffTime)
            VALUES (@customerName, @loadCount, @status, @dropOffTime)
        `).run({
            customerName: data.customerName.trim(),
            loadCount: data.loadCount,
            status: data.status,
            dropOffTime: data.dropOffTime.trim()
        });

        const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(result.lastInsertRowid);
        res.status(201).json(order);
    } catch (err) {
        next(err);
    }
});

// PUT updates only fields included in the request body (API key required).
app.put('/orders/:id', requireApiKey, (req, res, next) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({ error: 'Order ID must be a positive integer.' });
        }

        const existing = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
        if (!existing) {
            const error = new Error('Order not found.');
            error.statusCode = 404;
            throw error;
        }

        const data = req.body || {};
        const fields = ['customerName', 'loadCount', 'status', 'dropOffTime'];
        const suppliedFields = fields.filter(field =>
            Object.prototype.hasOwnProperty.call(data, field)
        );

        if (suppliedFields.length === 0) {
            return res.status(400).json({
                error: 'Provide at least one field to update: customerName, loadCount, status, or dropOffTime.'
            });
        }

        const errors = validateOrder(data, true);
        if (errors.length > 0) {
            return sendValidationErrors(errors, res);
        }

        const updated = {
            customerName: existing.customerName,
            loadCount: existing.loadCount,
            status: existing.status,
            dropOffTime: existing.dropOffTime
        };

        for (const field of suppliedFields) {
            updated[field] = field === 'customerName' || field === 'dropOffTime'
                ? data[field].trim()
                : data[field];
        }

        db.prepare(`
            UPDATE orders
            SET customerName = @customerName,
                loadCount = @loadCount,
                status = @status,
                dropOffTime = @dropOffTime
            WHERE id = @id
        `).run({ ...updated, id });

        const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
        res.json(order);
    } catch (err) {
        next(err);
    }
});

// DELETE an order (API key required).
app.delete('/orders/:id', requireApiKey, (req, res, next) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({ error: 'Order ID must be a positive integer.' });
        }

        const result = db.prepare('DELETE FROM orders WHERE id = ?').run(id);
        if (result.changes === 0) {
            const error = new Error('Order not found.');
            error.statusCode = 404;
            throw error;
        }

        res.json({ message: 'Order deleted successfully.' });
    } catch (err) {
        next(err);
    }
});

// Handle unknown routes.
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found.' });
});

// Central error handler.
app.use((err, req, res, next) => {
    if (res.headersSent) {
        return next(err);
    }

    res.status(err.statusCode || 500).json({
        error: err.message || 'Internal server error.'
    });
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
