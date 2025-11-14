import { Router } from 'express';
import { ObjectId } from 'mongodb';
import { connectDB } from '../db.js';
import { verifyJWT } from '../middleware/verifyJWT.js';

const router = Router();
// ---------- Create Purchase (Protected) ----------
router.post('/', verifyJWT, async (req, res) => {
  const { db } = await connectDB();
  const Purchases = db.collection('purchases');

// validate reviewId
  let reviewIdRaw = req.body?.reviewId;
  if (reviewIdRaw && typeof reviewIdRaw === 'object' && reviewIdRaw.$oid) {
    reviewIdRaw = reviewIdRaw.$oid;
  }
  if (!reviewIdRaw || !ObjectId.isValid(String(reviewIdRaw))) {
    return res.status(400).json({ message: 'reviewId is required/invalid' });
  }
  const _id = new ObjectId(String(reviewIdRaw));

  // check if review/food exists..
  let review = await db.collection('reviews').findOne({ _id });
  if (!review) {
    review = await db.collection('food_details').findOne({ _id });
  }
  if (!review) return res.status(404).json({ message: 'Review not found' });

  const doc = {
    reviewId: review._id.toString(),
    userEmail: req.user.email,
    foodName: review.foodName,
    restaurantName: review.restaurantName,
    location: review.location,
    foodImage: review.foodImage,
    rating: Number(review.rating ?? review.starRating ?? 0),
    createdAt: new Date(),
  };

  const result = await Purchases.insertOne(doc);
  res.json({ _id: result.insertedId, ...doc, purchased: true });
});


 // ---------- Get My Purchases (Protected) ----------
router.get('/mine', verifyJWT, async (req, res) => {
  const { db } = await connectDB();
  const items = await db
    .collection('purchases')
    .find({ userEmail: req.user.email })
    .sort({ createdAt: -1 })
    .toArray();

  res.json(items);
});

/**
 * DELETE /api/purchases/:id
 * effect: cancel a purchase (owned by current user)
 */
router.delete('/:id', verifyJWT, async (req, res) => {
  const { db } = await connectDB();
  const Purchases = db.collection('purchases');

  const pid = req.params.id;
  if (!ObjectId.isValid(pid)) {
    return res.status(400).json({ message: 'Invalid purchase id' });
  }

  const _id = new ObjectId(pid);
  const purchase = await Purchases.findOne({ _id });
  if (!purchase) return res.status(404).json({ message: 'Purchase not found' });

  // only owner can cancel
  if (purchase.userEmail !== req.user.email) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  await Purchases.deleteOne({ _id });
  res.json({ success: true });
});

export default router;
