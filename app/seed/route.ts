import bcrypt from 'bcrypt';
import { db } from '@vercel/postgres';
import { invoices, customers, revenue, users } from '../lib/placeholder-data';

const client = await db.connect();

async function seedUsers() {
  await client.sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;
  await client.sql`
     CREATE TABLE IF NOT EXISTS users (
       id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
       name VARCHAR(255) NOT NULL,
       email TEXT NOT NULL UNIQUE,
       password TEXT NOT NULL
     );
   `;

  const insertedUsers = await Promise.all(
    users.map(async (user) => {
      const hashedPassword = await bcrypt.hash(user.password, 10);
      return client.sql`
         INSERT INTO users (id, name, email, password)
         VALUES (${user.id}, ${user.name}, ${user.email}, ${hashedPassword})
         ON CONFLICT (id) DO NOTHING;
       `;
    }),
  );

  return insertedUsers;
}

async function seedInvoices() {
  await client.sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;

  await client.sql`
     CREATE TABLE IF NOT EXISTS invoices (
       id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
       customer_id UUID NOT NULL,
       amount INT NOT NULL,
       status VARCHAR(255) NOT NULL,
       date DATE NOT NULL
     );
   `;

  const insertedInvoices = await Promise.all(
    invoices.map(
      (invoice) => client.sql`
         INSERT INTO invoices (customer_id, amount, status, date)
         VALUES (${invoice.customer_id}, ${invoice.amount}, ${invoice.status}, ${invoice.date})
         ON CONFLICT (id) DO NOTHING;
       `,
    ),
  );

  return insertedInvoices;
}

async function seedCustomers() {
  await client.sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;

  await client.sql`
     CREATE TABLE IF NOT EXISTS customers (
       id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
       name VARCHAR(255) NOT NULL,
       email VARCHAR(255) NOT NULL,
       image_url VARCHAR(255) NOT NULL
     );
   `;

  const insertedCustomers = await Promise.all(
    customers.map(
      (customer) => client.sql`
         INSERT INTO customers (id, name, email, image_url)
         VALUES (${customer.id}, ${customer.name}, ${customer.email}, ${customer.image_url})
         ON CONFLICT (id) DO NOTHING;
       `,
    ),
  );

  return insertedCustomers;
}

async function seedRevenue() {
  await client.sql`
     CREATE TABLE IF NOT EXISTS revenue (
       month VARCHAR(4) NOT NULL UNIQUE,
       revenue INT NOT NULL
     );
   `;

  const insertedRevenue = await Promise.all(
    revenue.map(
      (rev) => client.sql`
         INSERT INTO revenue (month, revenue)
         VALUES (${rev.month}, ${rev.revenue})
         ON CONFLICT (month) DO NOTHING;
       `,
    ),
  );

  return insertedRevenue;
}

async function seedBiggestBuy() {
  // Create the biggestBuy table with the UNIQUE constraint on name
  await client.sql`
    CREATE TABLE IF NOT EXISTS biggestBuy (
      name VARCHAR(255) NOT NULL UNIQUE,
      amount INT NOT NULL
    );
  `;

  // Fetch the biggest purchase for each customer
  const { rows: biggestBuy } = await client.sql`
    SELECT customers.name AS name, MAX(invoices.amount) AS amount
    FROM customers
    JOIN invoices ON customers.id = invoices.customer_id
    GROUP BY customers.name;
  `;

  // Safeguard against an empty result set
  if (!biggestBuy || biggestBuy.length === 0) return [];

  // Insert the biggest purchases into the biggestBuy table
  const insertedBuys = await Promise.all(
    biggestBuy.map((purchase) =>
      client.sql`
        INSERT INTO biggestBuy (name, amount)
        VALUES (${purchase.name}, ${purchase.amount});
      `
    )
  );

  return insertedBuys;
}


export async function GET() {
  try {
    await client.sql`BEGIN`;
    await seedUsers();
    await seedCustomers();
    await seedInvoices();
    await seedRevenue();
    await client.sql`COMMIT`;
    await seedBiggestBuy();
    await client.sql`COMMIT`;

    return Response.json({ message: 'Database seeded successfully' });
  } catch (error) {
    await client.sql`ROLLBACK`;
    return Response.json({ error }, { status: 500 });
  }
}
