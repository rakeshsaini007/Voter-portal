import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getVoters, toClientShape, setCors } from './_lib/mongo.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const q = String(req.query.q || '').trim();
    const partNo = req.query.partNo ? parseInt(String(req.query.partNo), 10) : undefined;
    const gender = req.query.gender ? String(req.query.gender).toUpperCase() : undefined;
    const minAge = req.query.minAge ? parseInt(String(req.query.minAge), 10) : undefined;
    const maxAge = req.query.maxAge ? parseInt(String(req.query.maxAge), 10) : undefined;
    const page = Math.max(1, parseInt(String(req.query.page || 1), 10));
    const limit = Math.min(200, parseInt(String(req.query.limit || 50), 10));
    const skip = (page - 1) * limit;

    const filter: any = {};

    if (q) {
      if (/^[A-Z]{2,4}\d{5,10}$/i.test(q)) {
        filter.epic_number = q.toUpperCase();
      } else if (/^\d{10}$/.test(q)) {
        filter.mobile = q;
      } else {
        filter.$text = { $search: q };
      }
    }

    if (typeof partNo === 'number' && !Number.isNaN(partNo)) filter.part_no = partNo;
    if (gender) filter.gender = gender;
    if (typeof minAge === 'number' || typeof maxAge === 'number') {
      filter.age = {};
      if (typeof minAge === 'number') filter.age.$gte = minAge;
      if (typeof maxAge === 'number') filter.age.$lte = maxAge;
    }

    const voters = await getVoters();
    const cursor = voters.find(filter).skip(skip).limit(limit);
    if (filter.$text) {
      cursor.project({ score: { $meta: 'textScore' } }).sort({ score: { $meta: 'textScore' } });
    } else {
      cursor.sort({ part_no: 1, serial_no: 1 });
    }

    const [docs, total] = await Promise.all([
      cursor.toArray(),
      voters.countDocuments(filter),
    ]);

    res.json({ total, page, limit, data: docs.map(toClientShape) });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}
