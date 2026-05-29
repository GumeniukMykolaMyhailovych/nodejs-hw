import bcrypt from 'bcrypt';
import createHttpError from 'http-errors';

import { User } from '../models/user.js';
import { Session } from '../models/session.js';

import {
  createSession,
  setSessionCookies,
} from '../services/auth.js';

import jwt from 'jsonwebtoken';

import path from 'path';
import { fileURLToPath } from 'url';
import Handlebars from 'handlebars';

import { FIFTEEN_MINUTES } from '../constants/time.js';
import { sendMail } from '../utils/sendMail.js';
import { readTemplate } from '../utils/readTemplate.js';

const __filename = fileURLToPath(
  import.meta.url,
);

const __dirname = path.dirname(
  __filename,
);

export const registerUser = async (
  req,
  res,
  next,
) => {
  try {
    const { email, password } = req.body;

    const existingUser = await User.findOne({
      email,
    });

    if (existingUser) {
      throw createHttpError(
        400,
        'Email in use',
      );
    }

    const hashedPassword = await bcrypt.hash(
      password,
      10,
    );

    const user = await User.create({
      email,
      password: hashedPassword,
    });

    const session = await createSession(
      user._id,
    );

    setSessionCookies(res, session);

    res.status(201).json(user);
  } catch (error) {
    next(error);
  }
};

export const loginUser = async (
  req,
  res,
  next,
) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({
      email,
    });

    if (!user) {
      throw createHttpError(
        401,
        'Invalid credentials',
      );
    }

    const isPasswordEqual =
      await bcrypt.compare(
        password,
        user.password,
      );

    if (!isPasswordEqual) {
      throw createHttpError(
        401,
        'Invalid credentials',
      );
    }

    await Session.deleteOne({
      userId: user._id,
    });

    const session = await createSession(
      user._id,
    );

    setSessionCookies(res, session);

    res.status(200).json(user);
  } catch (error) {
    next(error);
  }
};

export const refreshUserSession = async (
  req,
  res,
  next,
) => {
  try {
    const {
      sessionId,
      refreshToken,
    } = req.cookies;

    const session = await Session.findOne({
      _id: sessionId,
      refreshToken,
    });

    if (!session) {
      throw createHttpError(
        401,
        'Session not found',
      );
    }

    if (
      new Date() >
      new Date(
        session.refreshTokenValidUntil,
      )
    ) {
      await Session.deleteOne({
        _id: session._id,
      });

      res.clearCookie('sessionId');

      res.clearCookie('accessToken');

      res.clearCookie('refreshToken');

      throw createHttpError(
        401,
        'Session token expired',
      );
    }

    await Session.deleteOne({
      _id: session._id,
    });

    const newSession = await createSession(
      session.userId,
    );

    setSessionCookies(res, newSession);

    res.status(200).json({
      message: 'Session refreshed',
    });
  } catch (error) {
    next(error);
  }
};

export const logoutUser = async (
  req,
  res,
  next,
) => {
  try {
    const { sessionId } = req.cookies;

    if (sessionId) {
      await Session.deleteOne({
        _id: sessionId,
      });
    }

    res.clearCookie('sessionId');

    res.clearCookie('accessToken');

    res.clearCookie('refreshToken');

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

export const requestResetEmail = async (
  req,
  res,
  next,
) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({
      email,
    });

    if (!user) {
      return res.status(200).json({
        message:
          'Password reset email sent successfully',
      });
    }

    const token = jwt.sign(
      {
        sub: user._id,
        email: user.email,
      },
      process.env.JWT_SECRET,
      {
        expiresIn:
          FIFTEEN_MINUTES / 1000,
      },
    );

    const resetLink = `${process.env.FRONTEND_DOMAIN}/reset-password?token=${token}`;

    const templatePath = path.join(
      __dirname,
      '../templates/reset-password-email.html',
    );

    const source =
      await readTemplate(
        templatePath,
      );

    const template =
      Handlebars.compile(source);

    const html = template({
      name: user.username,
      link: resetLink,
    });

try {
  await sendMail({
    to: user.email,
    subject: 'Reset password',
    html,
  });
} catch (error) {
  console.log('RESET EMAIL ERROR:');
  console.log(error);

  throw createHttpError(
    500,
    'Failed to send the email, please try again later.',
  );
}

    res.status(200).json({
      message:
        'Password reset email sent successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (
  req,
  res,
  next,
) => {
  try {
    const { token, password } =
      req.body;

    let payload;

    try {
      payload = jwt.verify(
        token,
        process.env.JWT_SECRET,
      );
    } catch {
      throw createHttpError(
        401,
        'Invalid or expired token',
      );
    }

    const user = await User.findOne({
      _id: payload.sub,
      email: payload.email,
    });

    if (!user) {
      throw createHttpError(
        404,
        'User not found',
      );
    }

    const hashedPassword =
      await bcrypt.hash(
        password,
        10,
      );

    user.password =
      hashedPassword;

    await user.save();

    res.status(200).json({
      message:
        'Password reset successfully',
    });
  } catch (error) {
    next(error);
  }
};

