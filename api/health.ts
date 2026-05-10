import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getVoters, setCors } from './_lib/mongo.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const voters = await getVoters();
    const count = await voters.estimatedDocumentCount();
    res.json({
      ok: true,
      docs: count,
      db: process.env.DB_NAME || 'elections',
      collection: process.env.MONGO_COLLECTION || 'voters_ac34',
    });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message });
  }
}
