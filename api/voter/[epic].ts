import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getVoters, toClientShape, setCors } from '../_lib/mongo';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  const epic = String(req.query.epic || '').trim().toUpperCase();
  if (!epic) return res.status(400).json({ error: 'Missing EPIC number' });

  try {
    const voters = await getVoters();

    if (req.method === 'GET') {
      const docs = await voters.find({ epic_number: epic }).limit(20).toArray();
      if (!docs.length) return res.status(404).json({ error: 'No voter found with this Epic Number.' });
      return res.json({ data: docs.map(toClientShape) });
    }

    if (req.method === 'PUT') {
      const { adharNumber, mobileNumber } = req.body || {};

      if (mobileNumber && !/^[6-9]\d{9}$/.test(String(mobileNumber))) {
        return res.status(400).json({ error: 'Invalid mobile number (must be 10 digits, starting 6-9).' });
      }
      if (adharNumber && !/^\d{12}$/.test(String(adharNumber))) {
        return res.status(400).json({ error: 'Aadhaar must be 12 digits.' });
      }

      const result = await voters.updateMany(
        { epic_number: epic },
        { $set: { aadhaar: adharNumber || null, mobile: mobileNumber || null, updated_at: new Date() } }
      );

      if (result.matchedCount === 0) return res.status(404).json({ error: 'No voter with this Epic Number.' });
      return res.json({ ok: true, matched: result.matchedCount, modified: result.modifiedCount });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}
