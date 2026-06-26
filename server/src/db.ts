import mongoose from 'mongoose';
import { env } from './env';

export async function connectDb(uri: string = env.MONGO_URI): Promise<typeof mongoose> {
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri);
  console.log(`[db] connected to ${uri}`);
  return mongoose;
}
