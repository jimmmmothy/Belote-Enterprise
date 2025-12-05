import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret'; // change for prod

export const signToken = (userId: string, email: string, username: string) => {
  return jwt.sign({ userId, email, username }, JWT_SECRET, { expiresIn: '15m' });
};

export const verifyToken = (token: string) => {
  return jwt.verify(token, JWT_SECRET);
};
