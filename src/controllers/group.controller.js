import { Group } from "../models/group.model.js";
import { apiError } from "../utils/apiError.js";
import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { UserGroup } from "../models/UserAndGroup.model.js";
const createGroup = asyncHandler(async (req, res) => {
    const { groupName, members } = req.body;

    // Validate request body
    if (!groupName || !members) {
        throw new apiError(400, 'Please provide a group name and members.');
    }
    if (!Array.isArray(members) || members.length < 2) {
        throw new apiError(400, 'At least 2 members are required. send array of members');
    }

    // Create the group
    const group = await Group.create({
        groupName,
        members
    });

    if (!group) {
        throw new apiError(500, 'Error in creating group.');
    }

    // Respond with success message and created group
    res.status(201).json(new apiResponse(201, group, 'Group created successfully.'));
});
const fetchUserGroup = asyncHandler(async(req,res)=>{
      const user_id = req?.user_id
      const groups = await UserGroup.find({
        user:user_id
      })
      if(!groups){
        throw new apiError(404,'no groups found!!')
      }
      res.status(200).json(new apiResponse(200,groups,'groups fetched!!'))
})
export { createGroup };
