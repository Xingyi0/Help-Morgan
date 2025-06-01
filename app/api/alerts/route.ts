import { NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'data', 'maintenance.db');
const db = new Database(dbPath, { verbose: console.log });

// Initialize database table if it doesn't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS alerts (
    id TEXT PRIMARY KEY,
    message TEXT,
    time TEXT,
    stationInfo TEXT,
    weather TEXT,
    tools TEXT,
    parts TEXT,
    maintenanceSteps TEXT,
    usedParts TEXT
  );
`);

export async function GET() {
  try {
    const alerts = db.prepare('SELECT * FROM alerts').all();
    return NextResponse.json(alerts);
  } catch (error) {
    console.error('Error fetching alerts:', error);
    return NextResponse.json({ error: 'Failed to fetch alerts' }, { status: 500 });
  }
} 