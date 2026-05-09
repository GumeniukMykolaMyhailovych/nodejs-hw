import mongoose from 'mongoose';

export const connectMongoDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL);

    console.log('✅ MongoDB connection established successfully');
  } catch (error) {
    console.log(error);

    throw error;
  }
};