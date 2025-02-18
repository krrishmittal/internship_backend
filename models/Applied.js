const mongoose = require("mongoose");

const AppliedSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
    },
    id: {
        type: Number,
        required: true,
    },
    title: {
        type: String,
        required: true,
    },
    company_name: {
        type: String,
        required: true,
    },
    duration: {
        type: String, // Change this to String
        required: true,
    },
});

const Applied = mongoose.model("Applied", AppliedSchema);

module.exports = Applied;