import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getVoters, toClientShape, setCors } from '../_lib/mongo';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const partNo = parseInt(String(req.query.partNo || ''), 10);
    if (Number.isNaN(partNo)) return res.status(400).json({ error: 'Invalid Part No.' });

    const page = Math.max(1, parseInt(String(req.query.page || 1), 10));
    const limit = Math.min(500, parseInt(String(req.query.limit || 200), 10));
    const skip = (page - 1) * limit;

    const voters = await getVoters();
    const [docs, total] = await Promise.all([
      voters.find({ part_no: partNo }).sort({ serial_no: 1 }).skip(skip).limit(limit).toArray(),
      voters.countDocuments({ part_no: partNo }),
    ]);

    res.json({ total, page, limit, data: docs.map(toClientShape) });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}
