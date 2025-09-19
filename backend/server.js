const express = require('express');
const session = require('express-session');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
require('dotenv').config();

const { testConnection } = require('./config/database');



// Import routes
const serviceRoutes = require('./routes/services');
const expenseRoutes = require('./routes/expenses');
const serviceTypeRoutes = require('./routes/serviceTypes');
const memberRoutes = require('./routes/members');
const dashboardRoutes = require('./routes/dashboard');
const reportRoutes = require('./routes/report');
const userRoutes = require('./routes/users');
const stocksRoutes = require('./routes/stocks');
const authResetRoutes = require('./routes/authReset');

const app = express();
const PORT = process.env.PORT || 3000;
const { pool } = require('./config/database');
const bcrypt = require('bcrypt'); // pastikan sudah install bcrypt



// Middleware
// Enable CORS with credentials so the browser can send/receive cookies for sessions
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session middleware (after CORS so Access-Control headers are present on responses that set cookies)
app.use(session({
    secret: 'servicehpsecret',
    resave: false,
    saveUninitialized: true,
    cookie: {
        maxAge: 24 * 60 * 60 * 1000,
        sameSite: 'lax', // allow sending cookie on same-site navigations
        secure: false // set to true when using HTTPS in production
    }
}));

// Serve static files (frontend)
app.use(express.static(path.join(__dirname, '../')));

// Configure multer for image uploads to ../img
const imgDir = path.join(__dirname, '..', 'img');
if (!fs.existsSync(imgDir)) fs.mkdirSync(imgDir, { recursive: true });
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, imgDir);
    },
    filename: function (req, file, cb) {
        // keep original name but avoid collisions by prefixing timestamp
        const unique = Date.now() + '_' + file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
        cb(null, unique);
    }
});
const upload = multer({ storage: storage, fileFilter: (req, file, cb) => {
    if (!/\.(png|jpe?g|gif|webp|svg)$/i.test(file.originalname)) {
        return cb(new Error('Invalid file type'), false);
    }
    cb(null, true);
}});

// File upload endpoint used by frontend to save images into img folder
app.post('/api/upload', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    res.json({ success: true, filename: req.file.filename, url: `/img/${req.file.filename}` });
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../index.html'));
});
// Serve statusservice.html at /statusservice
app.get('/statusservice', (req, res) => {
    res.sendFile(path.join(__dirname, '../statusservice.html'));
});
// API Routes
app.use('/api/services', serviceRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/service-types', serviceTypeRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/report', reportRoutes);
app.use('/api/users', userRoutes);
app.use('/api/stocks', stocksRoutes);
app.use('/api', authResetRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'Service HP API is running',
        timestamp: new Date().toISOString()
    });
});

// Get current session user
app.get('/api/session', (req, res) => {
    if (req.session && req.session.user) {
        res.json({ success: true, user: req.session.user });
    } else {
        res.json({ success: false, message: 'Belum login' });
    }
});

// Logout - destroy session
app.post('/api/logout', (req, res) => {
    if (req.session) {
        req.session.destroy(err => {
            if (err) return res.status(500).json({ success: false, message: 'Logout gagal' });
            res.json({ success: true });
        });
    } else {
        res.json({ success: true });
    }
});

// Serve frontend for any non-API routes
app.get('/frontend/*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// List image files from the img folder (for selecting user photos)
app.get('/api/images', (req, res) => {
    const imgDir = path.join(__dirname, '..', 'img');
    fs.readdir(imgDir, (err, files) => {
        if (err) return res.status(500).json({ success: false, message: 'Could not read images directory' });
        // Filter common image extensions
        const images = files.filter(f => /\.(png|jpe?g|gif|webp|svg)$/i.test(f));
        res.json({ success: true, data: images });
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: 'Something went wrong!',
        error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
});

// Start server
app.listen(PORT, async () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    await testConnection();
});


app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const [rows] = await pool.execute(
            'SELECT * FROM users WHERE username = ?',
            [username]
        );
        if (rows.length > 0) {
            const user = rows[0];
            // Bandingkan password dengan hash di database
            const match = await bcrypt.compare(password, user.password);
            if (match) {
                // Update last_login in database then re-read the user row so we return the timestamp
                try {
                    await pool.execute('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);
                    // include photo so frontend can render avatar
                    const [updatedRows] = await pool.execute('SELECT id, name, username, role, last_login, photo FROM users WHERE id = ?', [user.id]);
                    const updatedUser = updatedRows[0] || user;

                    // Simpan user ke session (include last_login and photo)
                    req.session.user = {
                        id: updatedUser.id,
                        name: updatedUser.name,
                        username: updatedUser.username,
                        role: updatedUser.role,
                        last_login: updatedUser.last_login,
                        photo: updatedUser.photo
                    };

                    res.json({ success: true, user: req.session.user });
                } catch (e) {
                    // If update/select fails, still set session without last_login
                    req.session.user = {
                        id: user.id,
                        name: user.name,
                        username: user.username,
                        role: user.role,
                        photo: user.photo
                    };
                    res.json({ success: true, user: req.session.user, warning: 'Could not persist last_login' });
                }
            } else {
                res.json({ success: false, message: 'Password salah!' });
            }
        } else {
            res.json({ success: false, message: 'Username tidak ditemukan!' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

