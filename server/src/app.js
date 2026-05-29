// Must be imported before any route handlers so its monkey-patch on
// Express's Layer prototype is in place. Lets `async` route handlers
// throw and have the error reach our errorHandler instead of crashing
// the process or hanging the request.
import 'express-async-errors';

import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import { UPLOADS_ROOT } from './controllers/meController.js';
import adminRoutes from './routes/adminRoutes.js';
import assistantRoutes from './routes/assistantRoutes.js';
import authRoutes from './routes/authRoutes.js';
import meRoutes from './routes/meRoutes.js';
import messageRoutes from './routes/messageRoutes.js';
import siteRoutes from './routes/siteRoutes.js';
import teamRoutes from './routes/teamRoutes.js';
import ticketRoutes from './routes/ticketRoutes.js';
import userRoutes from './routes/userRoutes.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

const app = express();

// `credentials: true` is required so the browser will send/accept the
// httpOnly session cookie. The CORS_ORIGIN must be a specific origin
// (not '*') for credentialed requests to work.
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Serve uploaded user content (avatars, etc) statically. CORS is irrelevant
// for static files; Vite proxies /uploads/* to us in dev.
app.use('/uploads', express.static(UPLOADS_ROOT, { fallthrough: false }));

app.use('/api/auth', authRoutes);
app.use('/api/assistant', assistantRoutes);
app.use('/api/me', meRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/users', userRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/sites', siteRoutes);
app.use('/api/admin', adminRoutes);

// 404 for unmatched routes, then the catch-all error handler. Both must
// come after the routes above so they don't shadow real handlers.
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
