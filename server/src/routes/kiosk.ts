import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { snapshot,createHandoff,readHandoff,submitHandoff,sha256,canonical } from '../services/kiosk';
import { uploadsDir } from './media';

const router = Router();
router.get('/snapshot',asyncHandler(async(req,res)=>{
  const result = await snapshot(uploadsDir);
  // Include the media manifest in the HTTP validator, so replacing media at an
  // unchanged URL still sends fresh hashes. Payload revision remains its digest.
  const etag = '"'+sha256(result.payload+canonical(result.media))+'"';
  res.set({'ETag':etag,'Cache-Control':'no-cache'});
  if (req.headers['if-none-match']?.split(',').map(v=>v.trim().replace(/^W\//,'')).some(v=>v===etag||v==='*')) return res.status(304).end();
  res.json(result);
}));
router.post('/handoffs',asyncHandler(async(req,res)=>{
  res.set('Cache-Control','no-store');
  res.status(201).json(await createHandoff(req.body?.draft));
}));
router.get('/handoffs/:token',asyncHandler(async(req,res)=>{
  res.set('Cache-Control','no-store');
  res.json(await readHandoff(req.params.token));
}));
router.post('/handoffs/:token/submit',asyncHandler(async(req,res)=>{
  res.set('Cache-Control','no-store');
  res.json(await submitHandoff(req.params.token,req.body));
}));
export default router;
