import {verifyJWT} from '../middlewares/auth.middleware.js'
import { toggleFriend } from '../controllers/friend.controller.js'
import { Router } from 'express'
const router = Router()
router.route('/toggle-friend').post(toggleFriend)
export default router
