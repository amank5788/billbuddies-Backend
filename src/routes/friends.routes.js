import { Router } from 'express'
import {verifyJWT} from '../middlewares/auth.middleware.js'
import { toggleFriend } from '../controllers/friend.controller.js'
const router = Router()
router.route('/toggle-friend').post(verifyJWT,toggleFriend)
export default router;
