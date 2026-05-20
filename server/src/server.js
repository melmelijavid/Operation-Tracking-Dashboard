import dotenv from 'dotenv';
import app from './app.js';
import { validateEnv } from './config.js';
import { startUrgentTicketScheduler, stopUrgentTicketScheduler } from './jobs/urgentTicketScheduler.js';

dotenv.config();
validateEnv();

const port = Number(process.env.PORT || 3001);

const server = app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
  startUrgentTicketScheduler();
});

// Process-level safety nets. The route-level errorHandler catches errors
// inside request handlers; these catch errors that escape Express entirely
// (timers, event listeners, db pool errors, etc.). We log loudly and exit
// — leaving the process in an unknown state risks data corruption, and a
// process supervisor (pm2/docker) should restart us.

process.on('unhandledRejection', (reason) => {
  console.error('[fatal] Unhandled promise rejection:');
  console.error(reason);
  shutdown(1);
});

process.on('uncaughtException', (error) => {
  console.error('[fatal] Uncaught exception:');
  console.error(error);
  shutdown(1);
});

function shutdown(code) {
  stopUrgentTicketScheduler();
  server.close(() => process.exit(code));
  // Hard-exit after 5s if graceful close hangs.
  setTimeout(() => process.exit(code), 5000).unref();
}
