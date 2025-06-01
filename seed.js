const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'maintenance.db');
const db = new Database(dbPath);

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

const alertData = [
  {
    id: "A-205",
    message: "Substation #A-205 voltage anomaly detected, requires immediate maintenance",
    time: "28 December 2024, 14:15",
    stationInfo: {
      number: "A-205",
      voltage: "35kV/10kV",
      commissionDate: "March 2016",
      capacity: "2×16MVA",
      location: "15 Rue de la Paix, 75001 Paris, France",
      status: "Partial Fault",
    },
    weather: {
      temperature: "-2°C",
      wind: "Force 3",
      visibility: "Good",
      condition: "Cloudy",
      suggestion:
        "Low temperature conditions. Ensure proper cold weather protection. Recommend starting maintenance after 10:00 AM.",
    },
    tools: [
      "Digital Multimeter",
      "Insulation Resistance Tester",
      "Clamp Ammeter",
      "Screwdriver Set",
      "Electrical Tape",
      "Safety Helmet",
      "Insulating Gloves",
      "Voltage Detector",
    ],
    parts: [
      { name: "35kV Lightning Arrester", stock: "In Stock", priority: "High" },
      { name: "10kV Switchgear Fuse", stock: "In Stock", priority: "Medium" },
      { name: "Voltage Transformer", stock: "Requires Allocation", priority: "Low" },
      { name: "Contactor", stock: "In Stock", priority: "Medium" },
    ],
    maintenanceSteps: [
      "Inspect 35kV lightning arrester - Found damaged insulator",
      "Replace lightning arrester insulator",
      "Test insulation resistance - Normal readings",
      "Restore power supply and conduct final testing",
    ],
    usedParts: "35kV Lightning Arrester Insulator × 1",
  },
  {
    id: "B-108",
    message: "Substation #B-108 transformer overheating alarm, temperature exceeds safety threshold",
    time: "28 December 2024, 15:42",
    stationInfo: {
      number: "B-108",
      voltage: "110kV/35kV",
      commissionDate: "August 2018",
      capacity: "1×50MVA",
      location: "42 Unter den Linden, 10117 Berlin, Germany",
      status: "Overheating Warning",
    },
    weather: {
      temperature: "8°C",
      wind: "Force 2",
      visibility: "Excellent",
      condition: "Clear",
      suggestion: "Excellent weather conditions. Safe to proceed with immediate maintenance.",
    },
    tools: [
      "Infrared Thermometer",
      "Oil Temperature Gauge",
      "Insulating Oil Tester",
      "Wrench Set",
      "Cooling Fan",
      "Safety Helmet",
      "Protective Suit",
      "Gas Detector",
    ],
    parts: [
      { name: "Transformer Cooler", stock: "In Stock", priority: "High" },
      { name: "Temperature Sensor", stock: "In Stock", priority: "High" },
      { name: "Insulating Oil", stock: "Sufficient", priority: "Medium" },
      { name: "Heat Sink", stock: "Requires Allocation", priority: "Medium" },
    ],
    maintenanceSteps: [
      "Inspect transformer temperature sensor - Found sensor malfunction",
      "Replace temperature sensor",
      "Check cooling system - Clean heat sinks",
      "Test temperature monitoring system - Normal operation",
    ],
    usedParts: "Temperature Sensor × 1",
  },
  {
    id: "C-312",
    message: "Substation #C-312 switchgear fault, unable to operate normally",
    time: "28 December 2024, 16:28",
    stationInfo: {
      number: "C-312",
      voltage: "10kV/0.4kV",
      commissionDate: "January 2020",
      capacity: "3×800kVA",
      location: "25 Via del Corso, 00186 Rome, Italy",
      status: "Switch Fault",
    },
    weather: {
      temperature: "18°C",
      wind: "Force 1",
      visibility: "Good",
      condition: "Light Rain",
      suggestion:
        "Light rain conditions. Take precautions for slip hazards and equipment waterproofing. Bring rain protection equipment.",
    },
    tools: [
      "Switch Tester",
      "Contact Resistance Tester",
      "Mechanical Characteristics Tester",
      "Hex Wrench",
      "Lubricating Oil",
      "Safety Helmet",
      "Insulating Boots",
      "Rain Cover",
    ],
    parts: [
      { name: "Vacuum Circuit Breaker", stock: "In Stock", priority: "High" },
      { name: "Operating Mechanism", stock: "Requires Allocation", priority: "High" },
      { name: "Auxiliary Switch", stock: "In Stock", priority: "Medium" },
      { name: "Spring Energy Storage Mechanism", stock: "In Stock", priority: "Low" },
    ],
    maintenanceSteps: [
      "Inspect vacuum circuit breaker - Found contact wear",
      "Replace vacuum circuit breaker",
      "Adjust operating mechanism",
      "Test switching function - Normal operation",
    ],
    usedParts: "Vacuum Circuit Breaker × 1",
  },
];

const insertStatement = db.prepare(`
  INSERT INTO alerts (
    id, message, time, stationInfo, weather, tools, parts, maintenanceSteps, usedParts
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertAlerts = db.transaction((data) => {
  for (const alert of data) {
    insertStatement.run(
      alert.id,
      alert.message,
      alert.time,
      JSON.stringify(alert.stationInfo), // Store objects/arrays as JSON strings
      JSON.stringify(alert.weather),
      JSON.stringify(alert.tools),
      JSON.stringify(alert.parts),
      JSON.stringify(alert.maintenanceSteps),
      alert.usedParts
    );
  }
});

try {
  db.exec('DELETE FROM alerts'); // Clear existing data before seeding
  insertAlerts(alertData);
  console.log('Database seeded successfully.');
} catch (error) {
  console.error('Error seeding database:', error);
} finally {
  db.close();
} 