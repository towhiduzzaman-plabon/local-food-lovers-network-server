import jwt from 'jsonwebtoken';


export function verifyJWT(req, res, next) {
const token = req.cookies?.token || (req.headers.authorization?.startsWith('Bearer ') && req.headers.authorization.split(' ')[1]);
if (!token) return res.status(401).json({ message: 'Unauthorized' });
try {
const decoded = jwt.verify(token, process.env.JWT_SECRET);
req.user = decoded; // {email}
next();
} catch (e) {
return res.status(401).json({ message: 'Invalid token' });
}
}