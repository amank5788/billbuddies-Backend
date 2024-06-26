import { Group } from "../models/group.model.js";
import { apiError } from "../utils/apiError.js";
import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { UserGroup } from "../models/UserAndGroup.model.js";
import mongoose from "mongoose";
import { GroupExpense } from "../models/groupExpense.model.js";
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

const addMembertogroup = asyncHandler(async (req, res) => {
    const { user_id, group_id } = req.body;

    // Validate user_id and group_id
    if (!user_id || !group_id || !mongoose.isValidObjectId(user_id) || !mongoose.isValidObjectId(group_id)) {
        throw new apiError(401, 'Send valid user and group id, required !!');
    }

    // Start a database transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    // Find the group
    const group = await Group.findById(group_id).session(session);
    if (!group) {
        await session.abortTransaction();
        session.endSession();
        throw new apiError(404, 'No group found with this id');
    }

    // Find the user
    const user = await User.findById(user_id).session(session);
    if (!user) {
        await session.abortTransaction();
        session.endSession();
        throw new apiError(404, 'User not found !!');
    }

    try {
        // Get the current members of the group
        const members = group.members;
        
        // Find all friendships involving the user
        const friendships = await Friend.find({ $or: [{ user1: user_id }, { user2: user_id }] }).session(session);

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
            }).session(session);
            if (!newFriend) {
                await session.abortTransaction();
                session.endSession();
                throw new apiError(500, 'Unable to add friend in group membership!!');
            }
        }

        // Update group members
        const newMembers = [...members, user_id];
        const newMemberadded = await Group.findByIdAndUpdate(group_id, { members: newMembers }, { new: true }).session(session);
        if (!newMemberadded) {
            await session.abortTransaction();
            session.endSession();
            throw new apiError(500, 'Problem in adding a new member to group !!');
        }

        // Create group expenses
        for (const mem of newMembers) {
            const grpExpFromNewToOldMembers = await GroupExpense.create({
                from: user_id,
                to: mem,
                group: group_id,
                amount: 0
            }).session(session);
            const grpExpFromOldToNewMemeber = await GroupExpense.create({
                from: mem,
                to: user_id,
                group: group_id,
                amount: 0
            }).session(session);
            if (!grpExpFromNewToOldMembers || !grpExpFromOldToNewMemeber) {
                await session.abortTransaction();
                session.endSession();
                throw new apiError(500, 'Error while adding initial expense for the new member !!');
            }
        }

        // Commit the transaction
        await session.commitTransaction();

        // Close the session
        session.endSession();

        res.status(200).json(new apiResponse(200, newMemberadded, 'Added successfully'));
    } catch (error) {
        // Rollback the transaction on error
        await session.abortTransaction();

        // Close the session
        session.endSession();

        // Forward the error to the error handling middleware
        throw error;
    }
});


export { createGroup,addMembertogroup,fetchUserGroup };
