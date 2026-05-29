import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import { errors } from 'celebrate';

import { logger } from './middleware/logger.js';
import { notFoundHandler } from './middleware/notFoundHandler.js';
import { errorHandler } from './middleware/errorHandler.js';

import notesRoutes from './routes/notesRoutes.js';
import authRoutes from './routes/authRoutes.js';

import userRoutes from './routes/userRoutes.js';

import { connectMongoDB } from './db/connectMongoDB.js';

dotenv.config();

const app = express();

app.use(cors({
  origin: true,
  credentials: true,
}));

app.use(express.json());

app.use(cookieParser());

app.use(logger);

app.use(authRoutes);

app.use(notesRoutes);

app.use(userRoutes);

app.use(errors());

app.use(notFoundHandler);

app.use(errorHandler);

const PORT = process.env.PORT || 3000;

const bootstrap = async () => {
  try {
    await connectMongoDB();

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.log(error);
    process.exit(1);
  }
};

bootstrap();