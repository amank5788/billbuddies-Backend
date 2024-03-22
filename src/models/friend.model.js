import mongoose from "mongoose";
const friendSchema = new mongoose.Schema({
    User1: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    User2: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, { timestamps: true })
export const Friend = mongoose.model('Friend', friendSchema);