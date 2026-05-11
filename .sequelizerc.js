require('dotenv').config()

module.exports = {
    development: {
        username: process.env.DB_USERNAME || 'zaadi',
        password: process.env.DB_PASSWORD || 'zaadi_dev_password',
        database: process.env.DB_NAME || 'zaadi_kitchen',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        dialect: 'postgres',
        dialectOptions: process.env.DB_SSL === 'true' ? {
            ssl: {
                require: true,
                rejectUnauthorized: false
            }
        } : {},
    },
    test: {
        username: process.env.DB_USERNAME || 'zaadi',
        password: process.env.DB_PASSWORD || 'zaadi_dev_password',
        database: process.env.DB_NAME || 'zaadi_kitchen_test',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        dialect: 'postgres',
    },
    production: {
        username: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT || '5432', 10),
        dialect: 'postgres',
        logging: false,
        dialectOptions: process.env.DB_SSL === 'true' ? {
            ssl: {
                require: true,
                rejectUnauthorized: false
            }
        } : {},
    },
}
