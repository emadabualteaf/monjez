import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users' ORDER BY ordinal_position")
  .then(res => { 
    console.log(JSON.stringify(res.rows, null, 2)); 
    pool.end(); 
  })
  .catch(err => { 
    console.error('Error:', err.message); 
    process.exit(1); 
  });
