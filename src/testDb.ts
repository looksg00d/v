import itemsPool from './dbConfig';

async function testDbConnection() {
    try {
        const client = await itemsPool.connect();
        console.log('Successfully connected to PostgreSQL');
        
        // Проверяем наличие таблиц
        const tables = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        `);
        console.log('Существующие таблицы:', tables.rows.map(row => row.table_name));

        // Проверяем содержимое таблицы rooms
        const rooms = await client.query('SELECT * FROM rooms');
        console.log('\nСодержимое таблицы rooms:');
        console.log(rooms.rows);

        // Проверяем содержимое таблицы messages
        const messages = await client.query('SELECT * FROM messages');
        console.log('\nСодержимое таблицы messages:');
        console.log(messages.rows);

        // Проверяем структуру таблицы messages
        const messageColumns = await client.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'messages'
        `);
        console.log('\nСтруктура таблицы messages:');
        console.log(messageColumns.rows);

        client.release(true);
    } catch (err) {
        console.error('Database connection error:', err);
    } finally {
        await itemsPool.end();
    }
}

testDbConnection(); 