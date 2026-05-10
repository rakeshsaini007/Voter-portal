/**
 * MongoDB connection helper for Vercel serverless functions.
 * Module-level cache survives across warm invocations so we don't
 * reconnect on every request.
 */
import { MongoClient, Db, Collection, Document } from 'mongodb';

const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://radiant:radiant@electoral.qgwtgva.mongodb.net/?appName=Electoral";
const DB_NAME = process.env.DB_NAME || 'elections';
const COLLECTION = process.env.MONGO_COLLECTION || 'voters_ac34';

if (!MONGO_URI) {
  throw new Error('MONGO_URI is missing. Please set it in Vercel Settings -> Environment Variables.');
}

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

export async function getDb(): Promise<Db> {
  if (cachedDb) return cachedDb;
  if (!cachedClient) {
    cachedClient = new MongoClient(MONGO_URI as string, {
      serverSelectionTimeoutMS: 5000,
      maxPoolSize: 10,
    });
    await cachedClient.connect();
  }
  cachedDb = cachedClient.db(DB_NAME);
  return cachedDb;
}

export async function getVoters(): Promise<Collection<Document>> {
  const db = await getDb();
  return db.collection(COLLECTION);
}

export function toClientShape(doc: any) {
  if (!doc) return null;
  return {
    EpicNumber: doc.epic_number ?? '',
    ACNo: doc.ac_no ?? 0,
    PartNo: doc.part_no ?? 0,
    SerialNo: doc.serial_no ?? 0,
    ElectorsName: doc.name_en ?? '',
    ElectorNameHindi: doc.name_hi ?? '',
    ElectorGender: doc.gender ?? '',
    Age: doc.age ?? 0,
    DOB: doc.dob ?? '',
    RelativeName: doc.relative_name_en ?? '',
    RelativeNameHindi: doc.relative_name_hi ?? '',
    Relativetype: doc.relative_type ?? '',
    AdharNumber: doc.aadhaar ?? '',
    MobileNumber: doc.mobile ?? '',
  };
}

export function setCors(res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}
