import { Group } from "../models/group.model.js";
import { apiError } from "../utils/apiError.js";
import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { UserGroup } from "../models/UserAndGroup.model.js";
import mongoose from "mongoose";
import { Friend } from '../models/friend.model.js'
import { User } from "../models/user.model.js";
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
const fetchUserGroup = asyncHandler(async (req, res) => {
    const user_id = req?.user_id
    const groups = await UserGroup.find({
        user: user_id
    })
    if (!groups) {
        throw new apiError(404, 'no groups found!!')
    }
    res.status(200).json(new apiResponse(200, groups, 'groups fetched!!'))
})

const addtogroup = asyncHandler(async (req, res) => {
    const { user_id, group_id } = req.body;

    // Validate user_id and group_id
    if (!user_id || !group_id || !mongoose.isValidObjectId(user_id) || !mongoose.isValidObjectId(group_id)) {
        throw new apiError(401, 'Send valid user and group id, required !!');
    }

    // Find the group
    const group = await Group.findById(group_id);
    if (!group) {
        throw new apiError(404, 'No group found with this id');
    }

    // Find the user
    const user = await User.findById(user_id);
    if (!user) {
        throw new apiError(404, 'User not found !!');
    }

    // Get the current members of the group
    const members = group.members;

    // Find all friendships involving the user
    const friendships = await Friend.find({ $or: [{ user1: user_id }, { user2: user_id }] });

    // Extract the friend IDs
    const friendIds = friendships.flatMap(friendship => {
        return friendship.user1.toString() === user_id ? friendship.user2 : friendship.user1;
    });

    // Find non-friends from the group members
    const nonfriends = members.filter(member => !friendIds.includes(member.toString()));

    // Add non-friends as friends
    for (const nonfriend of nonfriends) {
        const newFriend = await Friend.create({
            user1: user_id,
            user2: nonfriend
        });
        if (!newFriend) {
            throw new apiError(500, 'Unable to add friend in group membership!!');
        }
    }

    // Update group members
    const newMembers = [...members, user_id];
    const newMemberadded = await Group.findByIdAndUpdate(group_id, { members: newMembers }, { new: true });
    if (!newMemberadded) {
        throw new apiError(500, 'Problem in adding a new member to group !!');
    }

    res.status(200).json(new apiResponse(200, newMemberadded, 'Added successfully'));
});

export { createGroup,addtogroup };
