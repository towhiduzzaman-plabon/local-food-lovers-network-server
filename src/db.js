// server/db.js
import { MongoClient, ServerApiVersion } from 'mongodb';
import dotenv from 'dotenv';
dotenv.config();

if (!process.env.MONGODB_URI) {
  console.error('❌ MONGODB_URI missing in .env');
  process.exit(1);
}

export const DB_NAME = process.env.DB_NAME || 'sample_mflix';
export const REVIEWS_COLL = process.env.REVIEWS_COLL || 'food_details';
export const FAVORITES_COLL = process.env.FAVORITES_COLL || 'favorites';

const allowInsecure = process.env.ALLOW_INSECURE_TLS === 'true';

const client = new MongoClient(process.env.MONGODB_URI, {
  // Atlas stable API
  serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true },
  tlsAllowInvalidCertificates: allowInsecure,
  tlsAllowInvalidHostnames: allowInsecure,
  // connection stability
  maxPoolSize: 10,
  minPoolSize: 1,
  heartbeatFrequencyMS: 15000,
});

let connectedOnce = false;

export async function connectDB() {
  if (!connectedOnce) {
    await client.connect();
    connectedOnce = true;
  }
  const db = client.db(DB_NAME);
  return {
    db,
    Reviews: db.collection(REVIEWS_COLL),
    Favorites: db.collection(FAVORITES_COLL),
  };
}

export async function initDB() {
  await connectDB();
  await client.db(DB_NAME).command({ ping: 1 });
  console.log(`✅Pinged your deployment.You Successfully connected to MongoDB
     → db: ${DB_NAME} (collections: ${REVIEWS_COLL}, ${FAVORITES_COLL})`);
}
