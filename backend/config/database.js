const mongoose = require('mongoose');
const winston  = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(), winston.format.errors({ stack: true }), winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});
if (process.env.NODE_ENV !== 'production')
  logger.add(new winston.transports.Console({ format: winston.format.simple() }));

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    logger.info(`MongoDB Connected: ${conn.connection.host}`);
    console.log(`🍃 MongoDB Connected: ${conn.connection.host}`);
  } catch (err) {
    logger.error(err);
    console.error('❌ DB connection failed');
    process.exit(1);
  }
};

mongoose.connection.on('disconnected', () => logger.info('MongoDB disconnected'));
process.on('SIGINT', async () => { await mongoose.connection.close(); process.exit(0); });

module.exports = { connectDB, logger };
