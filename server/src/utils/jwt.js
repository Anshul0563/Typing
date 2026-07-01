import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { env } from '../config/env.js';

export const signToken = (user) => jwt.sign(
  { sub: user._id.toString(), role: user.role },
  env.jwtSecret,
  { expiresIn: env.jwtExpiresIn }
);

export const verifyToken = (token) => jwt.verify(token, env.jwtSecret);

export const signTestToken = ({ userId, examId, paragraphId, startedAt, endsAt, durationSeconds }) => jwt.sign(
  { type: 'typing-test', sub: userId.toString(), examId: examId.toString(), paragraphId: paragraphId.toString(), startedAt, endsAt },
  env.jwtSecret,
  { expiresIn: durationSeconds + 300, jwtid: crypto.randomUUID() }
);

export const verifyTestToken = (token) => jwt.verify(token, env.jwtSecret);
