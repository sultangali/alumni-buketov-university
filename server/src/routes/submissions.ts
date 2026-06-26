import { Router } from 'express';
import { Submission } from '../models/Submission';
import { requireAuth } from '../middleware/auth';
import { asyncHandler } from '../middleware/asyncHandler';

const router = Router();

function nowStamp() {
  return new Date().toISOString().slice(0, 16).replace('T', ' ');
}

// Public: create a submission (apply form).
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const body = req.body || {};
    const doc = await Submission.create({
      ...body,
      status: 'review',
      submittedAt: nowStamp(),
    });
    res.status(201).json(doc.toJSON());
  })
);

// Staff: list submissions, newest first.
router.get(
  '/',
  requireAuth,
  asyncHandler(async (_req, res) => {
    const list = await Submission.find().sort({ _id: -1 });
    res.json(list.map((d) => d.toJSON()));
  })
);

// Staff: approve / reject.
router.patch(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { action } = req.body || {};
    let status: string;
    if (action === 'approve') status = 'published';
    else if (action === 'reject') status = 'rejected';
    else return res.status(400).json({ error: 'action must be approve or reject' });

    const doc = await Submission.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    if (!doc) return res.status(404).json({ error: 'not found' });
    res.json(doc.toJSON());
  })
);

export default router;
