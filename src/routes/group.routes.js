import { Router } from "express";
import { fetchUserGroup,addMembertogroup,createGroup } from "../controllers/group.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
const router = Router()

router.route('/create-group').post(verifyJWT,createGroup)
router.route('/add-to-group').post(verifyJWT,addMembertogroup)
router.route('/fetch-user-group').post(verifyJWT,fetchUserGroup)
export default router;