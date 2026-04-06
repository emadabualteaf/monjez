import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name")
  .then(res => { 
    console.log('Tables in database:', res.rows.map(r => r.table_name).join(', ')); 
    pool.end(); 
  })
  .catch(err => { 
    console.error('Error:', err.message); 
  });
