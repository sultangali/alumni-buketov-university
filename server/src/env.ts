import dotenv from 'dotenv';

dotenv.config();

export const env = {
  PORT: parseInt(process.env.PORT || '4000', 10),
  MONGO_URI: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/alumni',
  JWT_SECRET: process.env.JWT_SECRET || 'dev-secret-change-me',
};
