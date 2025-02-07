import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const itemsPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    },
    // Дополнительные параметры для стабильности соединения
    max: 5, // уменьшаем максимальное количество соединений
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000, // увеличиваем таймаут
    keepAlive: true // включаем поддержание соединения
});

// Обработчик ошибок пула
itemsPool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1); // в случае критической ошибки перезапускаем процесс
});

// Проверка соединения при старте
itemsPool.connect((err, client, done) => {
    if (err) {
        console.error('Error connecting to the database:', err);
    } else {
        console.log('Successfully connected to database');
        done(); // освобождаем клиента обратно в пул
    }
});

export default itemsPool; 