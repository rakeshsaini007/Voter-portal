import { Voter } from '../types';

/**
 * Use relative URLs in production (same domain as the React app on Vercel).
 * For local dev, optionally set VITE_API_BASE to point to a local API server.
 */
const API_BASE = (import.meta as any).env?.VITE_API_BASE || '';

async function jsonOrThrow(res: Response) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed: ${res.status}`);
  return data;
}

export async function searchByEpic(epicNumber: string): Promise<Voter | null> {
  const url = `${API_BASE}/api/voter/${encodeURIComponent(epicNumber)}`;
  try {
    const result = await jsonOrThrow(await fetch(url));
    return (result.data && result.data[0]) || null;
  } catch (e: any) {
    if (e.message.toLowerCase().includes('no voter')) return null;
    throw e;
  }
}

export async function fetchByPart(partNo: string | number, page = 1, limit = 200): Promise<{ data: Voter[]; total: number }> {
  const url = `${API_BASE}/api/part/${encodeURIComponent(String(partNo))}?page=${page}&limit=${limit}`;
  const result = await jsonOrThrow(await fetch(url));
  return { data: result.data || [], total: result.total || 0 };
}

export interface SearchOpts {
  q?: string;
  partNo?: number | string;
  gender?: 'M' | 'F' | 'O';
  minAge?: number;
  maxAge?: number;
  page?: number;
  limit?: number;
}

export async function search(opts: SearchOpts): Promise<{ data: Voter[]; total: number }> {
  const params = new URLSearchParams();
  if (opts.q) params.set('q', opts.q);
  if (opts.partNo !== undefined && opts.partNo !== '') params.set('partNo', String(opts.partNo));
  if (opts.gender) params.set('gender', opts.gender);
  if (opts.minAge !== undefined) params.set('minAge', String(opts.minAge));
  if (opts.maxAge !== undefined) params.set('maxAge', String(opts.maxAge));
  params.set('page', String(opts.page ?? 1));
  params.set('limit', String(opts.limit ?? 50));

  const url = `${API_BASE}/api/search?${params.toString()}`;
  const result = await jsonOrThrow(await fetch(url));
  return { data: result.data || [], total: result.total || 0 };
}

export async function updateVoter(epicNumber: string, adharNumber: string, mobileNumber: string): Promise<string> {
  const url = `${API_BASE}/api/voter/${encodeURIComponent(epicNumber)}`;
  const result = await jsonOrThrow(
    await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adharNumber, mobileNumber }),
    })
  );
  return `Updated ${result.modified} record(s) successfully.`;
}
