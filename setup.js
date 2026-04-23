// Run once: node db/setup.js
import { neon } from '@neondatabase/serverless';
import 'dotenv/config';

const sql = neon(process.env.DATABASE_URL);

async function setup() {
  console.log('🔧 Setting up FoodShare database...');

  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id         SERIAL PRIMARY KEY,
      name       TEXT NOT NULL,
      email      TEXT UNIQUE NOT NULL,
      password   TEXT NOT NULL,
      area       TEXT,
      phone      TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  console.log('✅ users table ready');

  await sql`
    CREATE TABLE IF NOT EXISTS session (
      sid    VARCHAR NOT NULL PRIMARY KEY,
      sess   JSON    NOT NULL,
      expire TIMESTAMP(6) NOT NULL
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS session_expire_idx ON session (expire)`;
  console.log('✅ session table ready');

  await sql`
    CREATE TABLE IF NOT EXISTS listings (
      id          SERIAL PRIMARY KEY,
      user_id     INTEGER REFERENCES users(id) ON DELETE CASCADE,
      type        TEXT NOT NULL CHECK (type IN ('donate','request')),
      title       TEXT NOT NULL,
      description TEXT,
      category    TEXT NOT NULL,
      area        TEXT NOT NULL,
      expiry      TEXT,
      status      TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available','claimed')),
      claimed_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at  TIMESTAMPTZ DEFAULT NOW(),
      updated_at  TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  console.log('✅ listings table ready');

  const existing = await sql`SELECT COUNT(*) as count FROM listings`;
  if (parseInt(existing[0].count) === 0) {
    const { default: bcrypt } = await import('bcryptjs');
    const hash = await bcrypt.hash('seed1234', 10);
    const seedUser = await sql`
      INSERT INTO users (name, email, password, area)
      VALUES ('FoodShare Team', 'seed@foodshare.local', ${hash}, 'Mumbai')
      ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
      RETURNING id
    `;
    const uid = seedUser[0].id;
    await sql`
      INSERT INTO listings (user_id, type, title, description, category, area, expiry, status) VALUES
      (${uid}, 'donate',  'Surplus garden tomatoes',     'About 2 kg of ripe tomatoes from my terrace garden. Great for curries. Bring your own bag.', 'Produce',     'Bandra West',  'Today evening', 'available'),
      (${uid}, 'donate',  'Homemade banana bread',       'Two extra eggless, nut-free loaves. Best consumed within 2 days.',                            'Baked goods', 'Andheri West', 'Tomorrow noon', 'available'),
      (${uid}, 'request', 'Looking for rice or dal',     'Single working parent, short on groceries this week. Any dry staples would help greatly.',    'Packaged',    'Kurla',        'Flexible',      'available'),
      (${uid}, 'donate',  'Excess paneer from catering', 'About 500g fresh paneer from a cancelled event. Pickup tonight only.',                        'Dairy & eggs','Powai',        'Tonight only',  'available'),
      (${uid}, 'request', 'Fruits or snacks for kids',   'Running a small community daycare. Anything for 8 children would be wonderful.',              'Produce',     'Dharavi',      'Ongoing',       'available')
    `;
    console.log('✅ Seed data inserted');
  } else {
    console.log('ℹ️  Listings already exist, skipping seed');
  }

  console.log('\n🎉 Database ready! Run: npm run dev');
}

setup().catch(err => {
  console.error('❌ Setup failed:', err.message);
  process.exit(1);
});
