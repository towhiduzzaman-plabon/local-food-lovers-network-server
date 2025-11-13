import { Router } from 'express';
import { connectDB } from '../db.js';
import { verifyJWT } from '../middleware/verifyJWT.js';
import { ObjectId } from 'mongodb';

const router = Router();

const FALLBACK_IMG =
  'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?q=80&w=1200&auto=format&fit=crop';

// normalize: DB ডক -> অ্যাপ শেইপ (rating/createdAt নিশ্চিত)
const normalize = (d) => ({
  ...d,
  rating: d.rating ?? d.starRating ?? 0,
  createdAt: d.createdAt ?? d.date ?? new Date(),
  foodImage: d.foodImage || FALLBACK_IMG, // ✅ সার্ভার-লেভেল fallback
});

// ---------- Create (Protected) ----------
router.post('/', verifyJWT, async (req, res) => {
  const { Reviews } = await connectDB();
  const b = req.body || {};

  const rating = Number(b.rating ?? b.starRating ?? 0);
  const createdAt = b.createdAt ? new Date(b.createdAt) : new Date();

  const doc = {
    foodName: b.foodName,
    foodImage: b.foodImage,
    restaurantName: b.restaurantName,
    location: b.location,
    starRating: rating,
    reviewText: b.reviewText,
    userEmail: req.user.email,
    userName: b.userName || '',
    date: createdAt
  };

  if (!doc.foodName || !doc.restaurantName || !doc.reviewText) {
    return res.status(400).json({ message: 'Missing fields' });
  }

  const result = await Reviews.insertOne(doc);
  res.json(normalize({ _id: result.insertedId, ...doc }));
});

// ---------- Read All (Public) + Search ----------
router.get('/', async (req, res) => {
  const { Reviews } = await connectDB();
  const { q, page = 1, limit = 12 } = req.query;
  const filter = q ? { foodName: { $regex: q, $options: 'i' } } : {};

  const cursor = Reviews.find(filter).sort({ date: -1, createdAt: -1 });
  const total = await cursor.count();
  const docs = await cursor
    .skip((page - 1) * limit)
    .limit(Number(limit))
    .toArray();

  res.json({
    total,
    page: Number(page),
    limit: Number(limit),
    data: docs.map(normalize)
  });
});

// ---------- Featured Top 6 ----------
router.get('/featured', async (_req, res) => {
  const { Reviews } = await connectDB();
  const docs = await Reviews
    .find({})
    .sort({ starRating: -1, rating: -1, date: -1, createdAt: -1 })
    .limit(6)
    .toArray();

  res.json(docs.map(normalize));
});

// ---------- Read One ----------
router.get('/:id', async (req, res) => {
  const { Reviews } = await connectDB();
  const doc = await Reviews.findOne({ _id: new ObjectId(req.params.id) });
  if (!doc) return res.status(404).json({ message: 'Not found' });
  res.json(normalize(doc));
});

// ---------- Update (Protected, only owner) ----------
router.put('/:id', verifyJWT, async (req, res) => {
  const { Reviews } = await connectDB();
  const _id = new ObjectId(req.params.id);
  const existing = await Reviews.findOne({ _id });
  if (!existing) return res.status(404).json({ message: 'Not found' });
  if (existing.userEmail !== req.user.email) return res.status(403).json({ message: 'Forbidden' });

  const b = req.body || {};
  const rating = Number(b.rating ?? b.starRating ?? existing.starRating ?? 0);

  const update = {
    $set: {
      foodName: b.foodName ?? existing.foodName,
      foodImage: b.foodImage ?? existing.foodImage,
      restaurantName: b.restaurantName ?? existing.restaurantName,
      location: b.location ?? existing.location,
      starRating: rating,
      reviewText: b.reviewText ?? existing.reviewText,
    }
  };

  await Reviews.updateOne({ _id }, update);
  const after = await Reviews.findOne({ _id });
  res.json(normalize(after));
});

// ---------- Delete (Protected, only owner) ----------
router.delete('/:id', verifyJWT, async (req, res) => {
  const { Reviews, Favorites } = await connectDB();
  const _id = new ObjectId(req.params.id);
  const existing = await Reviews.findOne({ _id });
  if (!existing) return res.status(404).json({ message: 'Not found' });
  if (existing.userEmail !== req.user.email) return res.status(403).json({ message: 'Forbidden' });

  await Reviews.deleteOne({ _id });
  await Favorites.deleteMany({ reviewId: _id.toString() });
  res.json({ success: true });
});

export default router;
