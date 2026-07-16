require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 5000;

// Dynamic active session tokens
const activeSessions = new Set();

// Default admin credentials from env or fallback
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'admin123';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// MySQL Connection Pool
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '3308'),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Admin Authentication Middleware
function authenticateAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    if (activeSessions.has(token)) {
      return next();
    }
  }
  return res.status(401).json({ success: false, error: 'Yetkisiz erişim. Lütfen tekrar giriş yapın.' });
}

// API Endpoints

// 1. Admin Login
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  
  if (username === ADMIN_USER && password === ADMIN_PASS) {
    const sessionToken = crypto.randomBytes(32).toString('hex');
    activeSessions.add(sessionToken);
    return res.json({ success: true, token: sessionToken });
  }
  
  return res.status(401).json({ success: false, error: 'Geçersiz kullanıcı adı veya şifre!' });
});

// 2. Admin Logout
app.post('/api/logout', authenticateAdmin, (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader.substring(7);
  activeSessions.delete(token);
  res.json({ success: true, message: 'Başarıyla çıkış yapıldı.' });
});

// 3. Get All Posts (Publicly Accessible)
app.get('/api/posts', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM posts ORDER BY created_at DESC');
    res.json({ success: true, posts: rows });
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ success: false, error: 'Yazılar yüklenirken bir hata oluştu.' });
  }
} );

// 4. Create a Post (Admin Protected)
app.post('/api/posts', authenticateAdmin, async (req, res) => {
  const { title, summary, content } = req.body;
  
  if (!title || !summary || !content) {
    return res.status(400).json({ success: false, error: 'Başlık, özet ve içerik alanları zorunludur.' });
  }

  try {
    const [result] = await pool.query(
      'INSERT INTO posts (title, summary, content) VALUES (?, ?, ?)',
      [title, summary, content]
    );
    res.json({
      success: true,
      post: { id: result.insertId, title, summary, content, created_at: new Date() }
    });
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({ success: false, error: 'İçerik kaydedilirken hata oluştu.' });
  }
});

// 5. Update a Post (Admin Protected)
app.put('/api/posts/:id', authenticateAdmin, async (req, res) => {
  const { id } = req.params;
  const { title, summary, content } = req.body;

  if (!title || !summary || !content) {
    return res.status(400).json({ success: false, error: 'Başlık, özet ve içerik alanları zorunludur.' });
  }

  try {
    const [result] = await pool.query(
      'UPDATE posts SET title = ?, summary = ?, content = ? WHERE id = ?',
      [title, summary, content, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: 'Yazı bulunamadı.' });
    }

    res.json({ success: true, message: 'Yazı başarıyla güncellendi.' });
  } catch (error) {
    console.error('Error updating post:', error);
    res.status(500).json({ success: false, error: 'Yazı güncellenirken hata oluştu.' });
  }
});

// 6. Delete a Post (Admin Protected)
app.delete('/api/posts/:id', authenticateAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await pool.query('DELETE FROM posts WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: 'Yazı bulunamadı.' });
    }

    res.json({ success: true, message: 'Yazı başarıyla silindi.' });
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({ success: false, error: 'Yazı silinirken hata oluştu.' });
  }
});

// Fallback for single page app routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
