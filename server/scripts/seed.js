// Seed script. Loads demo users + demo tickets into the database.
//
// Schema is no longer this script's responsibility — it lives in the
// migrations/ folder and is applied via `npm run migrate:up`. The
// `npm run seed` script in package.json runs migrations first, then
// invokes this file.

import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { pool, query } from '../src/db.js';

dotenv.config();

async function run() {
  // Reset the data tables. CASCADE clears child rows in ticket_history /
  // ticket_comments, RESTART IDENTITY resets the SERIAL counters so demo
  // IDs stay predictable between runs.
  await query('TRUNCATE TABLE tickets RESTART IDENTITY CASCADE;');
  await query('TRUNCATE TABLE users RESTART IDENTITY CASCADE;');

  const adminHash = await bcrypt.hash('admin1234', 10);
  const operatorHash = await bcrypt.hash('operator1234', 10);
  const viewerHash = await bcrypt.hash('viewer1234', 10);

  const usersResult = await query(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES
       ('Admin User', 'admin@nokia.com', $1, 'admin'),
       ('Operator', 'operator@nokia.com', $2, 'operator'),
       ('Viewer User', 'viewer@nokia.com', $3, 'viewer')
     RETURNING id, name`,
    [adminHash, operatorHash, viewerHash]
  );

  const userIdByName = Object.fromEntries(usersResult.rows.map((user) => [user.name, user.id]));

  await query(
    `INSERT INTO tickets (
      id,
      description,
      status,
      priority,
      assigned_group,
      service_type,
      submit_date,
      last_modified_date,
      close_date,
      company,
      product_categorization_tier1,
      product_categorization_tier2,
      product_categorization_tier3,
      categorization_tier1,
      aging,
      owner_user_id,
      assigned_person_user_id
    ) VALUES
      ('INC001301', 'Email delivery delayed for finance department', 'Open', 'High', 'Messaging Support', 'Email', '2026-04-10', '2026-04-11', NULL, 'Nokia', 'Infrastructure', 'Messaging', 'Exchange', 'Incident', 5, $1, $2),
      ('INC001302', 'VPN connection drops for remote sales employee', 'In Progress', 'Medium', 'Network Team', 'Access', '2026-04-11', '2026-04-13', NULL, 'Nokia', 'Network', 'Remote Access', 'VPN', 'Access Request', 4, $2, $1),
      ('INC001303', 'Laptop fails to boot after security patch installation', 'Resolved', 'High', 'Desktop Support', 'Hardware', '2026-04-08', '2026-04-12', '2026-04-12', 'Nokia', 'Workplace', 'Endpoint', 'Laptop', 'Hardware Issue', 7, $3, $2),
      ('INC001304', 'Office printer on floor 3 not responding to print jobs', 'Closed', 'Low', 'Field Support', 'Printer', '2026-04-09', '2026-04-13', '2026-04-13', 'Nokia', 'Workplace', 'Print Services', 'Printer', 'Service Restoration', 6, $1, $3),
      ('INC001305', 'CRM dashboard loading extremely slowly for support team', 'Open', 'Critical', 'Application Support', 'Application', '2026-04-14', '2026-04-15', NULL, 'Nokia', 'Application', 'Business Systems', 'CRM', 'Performance', 1, $2, $2),
      ('INC001306', 'Password reset requested by contractor account', 'Pending', 'Low', 'Service Desk', 'Account', '2026-04-15', '2026-04-15', NULL, 'Nokia', 'Identity', 'Account Services', 'Password', 'Request', 0, $3, $1),
      ('INC001307', 'Wi-Fi instability reported in conference room area', 'In Progress', 'Medium', 'Network Team', 'Network', '2026-04-12', '2026-04-14', NULL, 'Nokia', 'Network', 'Wireless', 'Wi-Fi', 'Connectivity', 3, $1, $2),
      ('INC001308', 'User unable to access shared drive after permissions update', 'Open', 'High', 'Service Desk', 'Access', '2026-04-13', '2026-04-14', NULL, 'Nokia', 'Storage', 'File Services', 'Shared Drive', 'Access Issue', 2, $2, $3),
      ('INC001309', 'Mobile device enrollment failed for new employee', 'Resolved', 'Medium', 'Desktop Support', 'Mobile', '2026-04-07', '2026-04-11', '2026-04-11', 'Nokia', 'Workplace', 'Mobile Services', 'Enrollment', 'Device Setup', 8, $1, $3),
      ('INC001310', 'Customer support portal returns 500 error on login', 'Open', 'Critical', 'Application Support', 'Web Portal', '2026-04-15', '2026-04-15', NULL, 'Nokia', 'Application', 'Web Services', 'Portal', 'Application Error', 0, $2, $1)`,
    [
      userIdByName['Admin User'],
      userIdByName['Operator'],
      userIdByName['Viewer User'],
    ]
  );

  console.log('Database seeded successfully.');
}

run()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
