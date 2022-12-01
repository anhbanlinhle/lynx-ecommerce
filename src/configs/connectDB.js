import mysql from 'mysql2/promise';

// create the connection to database
console.log('Creating connection pool...')

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  database: 'lynx',
  dateStrings: true
})

export default pool;