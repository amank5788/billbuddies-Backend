import mongoose from "mongoose";
const groupExpenseSchema = new mongoose.Schema({
    from: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    to: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    ],
    group: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Group'
    },
    amount: {
        type: Number,
        required: true,
    }
}, { timestamps: true })
export const GroupExpense= mongoose.model('GroupExpenseSchema', groupExpenseSchema)