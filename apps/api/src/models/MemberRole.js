const mongoose = require("mongoose");

const memberRoleSchema = new mongoose.Schema(
{
    communityId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Community",
        required: true,
        index: true
    },

    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },

    roleId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Role",
        required: true
    }
},
{ timestamps: true }
);

module.exports = mongoose.model("MemberRole", memberRoleSchema);