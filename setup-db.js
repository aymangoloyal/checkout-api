const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'checkout_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
});

async function setupDatabase() {
    const client = await pool.connect();

    try {
        console.log('🚀 Setting up database...');

        // Read and execute schema
        const schemaPath = path.join(__dirname, 'src', 'utils', 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');

        await client.query(schema);
        console.log('✅ Database schema created successfully');

        console.log('🎉 Database setup completed!');
        console.log('📚 You can now start the API with: npm run dev');

    } catch (error) {
        console.error('❌ Error setting up database:', error.message);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

setupDatabase();
