const mongoose = require("mongoose");

const roleSchema = new mongoose.Schema(
{
    communityId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Community",
        required: true,
        index: true
    },

    name: {
        type: String,
        required: true
    },

    isPaidRole: {
        type: Boolean,
        default: false
    }

},
{ timestamps: true }
);

module.exports = mongoose.model("Role", roleSchema);