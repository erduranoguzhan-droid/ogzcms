require('dotenv').config();
const mysql = require('mysql2/promise');

async function initializeDatabase() {
  console.log('Connecting to database to initialize tables...');
  
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '3308'),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    console.log('Connected successfully. Creating "posts" table if it does not exist...');

    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS posts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        summary VARCHAR(500) NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    await connection.query(createTableQuery);
    console.log('Table "posts" initialized successfully.');

    // Insert sample post if empty
    const [rows] = await connection.query('SELECT COUNT(*) as count FROM posts');
    if (rows[0].count === 0) {
      console.log('Table is empty. Inserting a welcome post...');
      const insertWelcomePost = `
        INSERT INTO posts (title, summary, content) 
        VALUES (
          'Hoş Geldiniz!', 
          'Tek sayfalık modern CMS uygulamanıza hoş geldiniz. Bu ilk örnek yazıdır.', 
          'Bu, MySQL veritabanına bağlı tek sayfalık CMS uygulamanızın ilk içeriğidir. Admin paneline giriş yaparak bu yazıyı düzenleyebilir, silebilir veya yeni yazılar ekleyebilirsiniz.'
        );
      `;
      await connection.query(insertWelcomePost);
      console.log('Welcome post inserted successfully.');
    }

    await connection.end();
    console.log('Database initialization complete.');
    process.exit(0);
  } catch (error) {
    console.error('Error during database initialization:', error);
    process.exit(1);
  }
}

initializeDatabase();
