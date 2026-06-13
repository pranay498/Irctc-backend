# Prisma Database Setup & Migration Guide

This guide walks you through the step-by-step process of defining schemas, creating database tables, and generating client libraries using **Prisma ORM** in this project.

---

## 1. Setup & Configuration (Once per service)

1. **Install Dependencies**:
   ```bash
   npm install @prisma/client
   npm install -D prisma
   ```

2. **Initialize Prisma**:
   ```bash
   npx prisma init
   ```
   This generates a `prisma/` folder with `schema.prisma` and creates/appends to your `.env` file.

3. **Configure Database Connection**:
   Update `DATABASE_URL` in your `.env` file to connect to your PostgreSQL instance:
   ```env
   DATABASE_URL="postgresql://postgres:pranay@localhost:5433/admin_service"
   ```

---

## 2. Defining Models (schema.prisma)

Define your tables inside `prisma/schema.prisma` using models.

Example:
```prisma
model Station {
  id        String   @id @default(uuid())
  name      String   @unique
  code      String   @unique
  city      String
  state     String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("stations") // Maps the model to a custom table name in PostgreSQL
}
```

---

## 3. Pushing Schema Changes (Creating Tables)

Every time you edit your `schema.prisma` file, you must sync it with the database.

### During Development (Fast Prototyping)
To sync your schema directly and create the tables without managing SQL migration history:
1. Make sure you are in the service directory containing the schema:
   ```bash
   cd Admin-service
   ```
2. Run the push command:
   ```bash
   npx prisma db push
   ```

### In Production / Team Development (Migrations)
If you want to track changes using SQL migration scripts:
1. Run the migrate command:
   ```bash
   npx prisma migrate dev --name <migration_name>
   ```
   *Example:* `npx prisma migrate dev --name init_database`
   This creates SQL files in `prisma/migrations/` and updates your database tables.

---

## 4. Rebuilding Prisma Client Types

Prisma automatically regenerates client types after running `db push` or `migrate dev`. If you ever need to manually rebuild the typescript types:
```bash
npx prisma generate
```

---

## 5. Using Prisma in Your Code

To query or insert data in your services/controllers, import the initialized `prisma` instance:

```typescript
import { prisma } from "../config/prisma";

// Example: Inserting a Station
const newStation = await prisma.station.create({
  data: {
    name: "New Delhi",
    code: "NDLS",
    city: "Delhi",
    state: "Delhi",
  },
});

// Example: Finding a Station
const station = await prisma.station.findUnique({
  where: { code: "NDLS" },
});
```
