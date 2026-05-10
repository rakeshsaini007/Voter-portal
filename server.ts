import express, { Request, Response } from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { getVoters, toClientShape } from "./api/_lib/mongo.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/health", async (req: Request, res: Response) => {
    try {
      const voters = await getVoters();
      const count = await voters.estimatedDocumentCount();
      res.json({
        ok: true,
        docs: count,
        db: "elections",
        collection: "voters_ac34",
      });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  app.get("/api/search", async (req: Request, res: Response) => {
    try {
      const q = String(req.query.q || "").trim();
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

      if (typeof partNo === "number" && !Number.isNaN(partNo)) filter.part_no = partNo;
      if (gender) filter.gender = gender;
      if (typeof minAge === "number" || typeof maxAge === "number") {
        filter.age = {};
        if (typeof minAge === "number") filter.age.$gte = minAge;
        if (typeof maxAge === "number") filter.age.$lte = maxAge;
      }

      const voters = await getVoters();
      const cursor = voters.find(filter).skip(skip).limit(limit);
      if (filter.$text) {
        cursor.project({ score: { $meta: "textScore" } }).sort({ score: { $meta: "textScore" } });
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
  });

  app.get("/api/voter/:epic", async (req: Request, res: Response) => {
    const epic = String(req.params.epic || "").trim().toUpperCase();
    if (!epic) return res.status(400).json({ error: "Missing EPIC number" });

    try {
      const voters = await getVoters();
      const docs = await voters.find({ epic_number: epic }).limit(20).toArray();
      if (!docs.length) return res.status(404).json({ error: "No voter found with this Epic Number." });
      res.json({ data: docs.map(toClientShape) });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put("/api/voter/:epic", async (req: Request, res: Response) => {
    const epic = String(req.params.epic || "").trim().toUpperCase();
    if (!epic) return res.status(400).json({ error: "Missing EPIC number" });

    try {
      const { adharNumber, mobileNumber } = req.body || {};
      if (mobileNumber && !/^[6-9]\d{9}$/.test(String(mobileNumber))) {
        return res.status(400).json({ error: "Invalid mobile number (must be 10 digits, starting 6-9)." });
      }
      if (adharNumber && !/^\d{12}$/.test(String(adharNumber))) {
        return res.status(400).json({ error: "Aadhaar must be 12 digits." });
      }

      const voters = await getVoters();
      const result = await voters.updateMany(
        { epic_number: epic },
        { $set: { aadhaar: adharNumber || null, mobile: mobileNumber || null, updated_at: new Date() } }
      );

      if (result.matchedCount === 0) return res.status(404).json({ error: "No voter with this Epic Number." });
      res.json({ ok: true, matched: result.matchedCount, modified: result.modifiedCount });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/part/:partNo", async (req: Request, res: Response) => {
    try {
      const partNo = parseInt(String(req.params.partNo || ""), 10);
      if (Number.isNaN(partNo)) return res.status(400).json({ error: "Invalid Part No." });

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
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
