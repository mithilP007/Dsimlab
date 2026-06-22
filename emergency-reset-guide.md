# SimLab Pilot — Emergency Reset Guide

This guide outlines emergency procedures to reset the database, run migrations, and restore a clean pilot onboarding state if the platform experiences a catastrophic database lock or data corruption during testing.

---

## 1. Database Backups

The database can be backed up manually using the PowerShell or Bash scripts located in the `scripts/` folder:
- **Windows (PowerShell):**
  ```powershell
  ./scripts/backup-database.ps1
  ```
- **Linux/macOS (Bash):**
  ```bash
  ./scripts/backup-database.sh
  ```
These scripts dump the Postgres database schema and records to a compressed file stored in the `d:\ads backend\tmp\backups\` directory.

---

## 2. Full Database Reset

To wipe all tables, recreate the schema, and apply clean migrations:

1. Stop the backend Node server process.
2. Open your terminal in the `apps/backend/` workspace.
3. Run the Prisma migrate reset command:
   ```bash
   npm run prisma:migrate reset
   ```
   *Warning: This will permanently delete all records, student progress, certificates, and class cohorts.*

---

## 3. Reseeding Pilot Accounts & Classrooms

After a database reset, you must reseed the pilot scenario, classrooms, and user accounts:

1. Navigate to the root directory `d:\ads backend`.
2. Run the pilot seed script:
   ```bash
   npm run seed-pilot
   ```
3. Generate the onboarding sheets (PDFs and CSV):
   ```bash
   npm run generate-pilot-sheets
   ```
4. Verify seeding using the DB query utility:
   ```bash
   node scripts/db-query.js
   ```

---

## 4. Resetting a Single Student Campaign Run

If a single student's daily campaign gets stuck or experiences processing issues, you can reset just that student's run without wiping other class records:

1. Log in to the database via Prisma Studio:
   ```bash
   npm run prisma:studio
   ```
2. Navigate to the `CampaignRun` model.
3. Find the student's email, delete their `CampaignRun` row (this will cascade delete their daily decisions, results, and processing jobs).
4. Have the student refresh their browser and click **Launch Daily Live Simulation** to start a clean campaign run.
