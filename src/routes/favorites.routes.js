import { Router } from 'express';
import { connectDB } from '../db.js';
import { verifyJWT } from '../middleware/verifyJWT.js';


const router = Router();


// Add favorite (Protected)
router.post('/', verifyJWT, async (req, res) => {
const { Favorites } = await connectDB();
const { reviewId, foodName, restaurantName, foodImage } = req.body || {};
if (!reviewId) return res.status(400).json({ message: 'reviewId required' });
const doc = { reviewId, userEmail: req.user.email, foodName, restaurantName, foodImage, createdAt: new Date() };
const exists = await Favorites.findOne({ reviewId, userEmail: req.user.email });
if (exists) return res.json({ success: true, already: true });
const result = await Favorites.insertOne(doc);
res.json({ success: true, insertedId: result.insertedId });
});


// List my favorites (Protected)
router.get('/me', verifyJWT, async (req, res) => {
const { Favorites } = await connectDB();
const docs = await Favorites.find({ userEmail: req.user.email }).sort({ createdAt: -1 }).toArray();
res.json(docs);
});


// Delete favorite (Protected)
router.delete('/:id', verifyJWT, async (req, res) => {
const { Favorites } = await connectDB();
const { id } = req.params;
const result = await Favorites.deleteOne({ _id: new (await import('mongodb')).ObjectId(id), userEmail: req.user.email });
res.json({ success: result.deletedCount === 1 });
});


export default router;