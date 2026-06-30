import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { StaffUser } from '../models/StaffUser';
import { env } from '../env';
import { asyncHandler } from '../middleware/asyncHandler';
import { currentEntry, todayStr, type WeeklyHash } from '../auth/weeklyPasswords';

const router = Router();

router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { username, password } = req.body || {};
    // must be plain strings — guards against NoSQL operator injection ($ne, etc.)
    if (typeof username !== 'string' || typeof password !== 'string' || !username || !password) {
      return res.status(400).json({ error: 'username and password required' });
    }
    const user = await StaffUser.findOne({ username });
    if (!user) {
      return res.status(401).json({ error: 'invalid credentials' });
    }
    // Accounts with weekly-rotating passwords (admin) accept only the password
    // for the current week; everyone else uses their static passwordHash.
    const weekly = user.get('weeklyPasswords') as WeeklyHash[] | undefined;
    let ok = false;
    if (Array.isArray(weekly) && weekly.length) {
      const cur = currentEntry(weekly, todayStr());
      ok = cur ? await bcrypt.compare(password, cur.hash) : false;
    } else {
      ok = await bcrypt.compare(password, user.passwordHash);
    }
    if (!ok) {
      return res.status(401).json({ error: 'invalid credentials' });
    }
    if (user.status === 'suspended') {
      return res.status(403).json({ error: 'account suspended' });
    }
    const token = jwt.sign(
      { sub: String(user._id), username: user.username, role: user.role, fac: user.fac },
      env.JWT_SECRET,
      { expiresIn: '12h' }
    );
    res.json({ token, role: user.role, username: user.username, fac: user.fac });
  })
);

export default router;
