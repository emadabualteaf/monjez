import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

pool.query("SELECT id, name, phone, password_hash FROM users WHERE phone = '0501234567'")
  .then(res => { 
    if (res.rows.length === 0) {
      console.log('User not found');
    } else {
      console.log('User found:');
      console.log(JSON.stringify(res.rows[0], null, 2)); 
    }
    pool.end(); 
  })
  .catch(err => { 
    console.error('Error:', err.message); 
  });
