import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

pool.query("SELECT id, name, phone, password_hash FROM users ORDER BY created_at DESC LIMIT 5")
  .then(res => { 
    console.log('Users in database:');
    console.log(JSON.stringify(res.rows, null, 2)); 
    pool.end(); 
  })
  .catch(err => { 
    console.error('Error:', err.message); 
  });
