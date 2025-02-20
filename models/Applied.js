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
        type: String,
        required: true,
    },
    fullName: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
    },
    phone: {
        type: String,
        required: true,
    },
    degree: {
        type: String,
        required: true,
    },
    fieldOfStudy: {
        type: String,
        required: true,
    },
    university: {
        type: String,
        required: true,
    },
    graduationDate: {
        type: Date,
        required: true,
    },
    skills: {
        type: String,
        required: true,
    },
    resume: {
        type: Buffer,
        required: true,
    },
    resumePath: {
        type: String,
        required: false,
    },
});

const Applied = mongoose.model("Applied", AppliedSchema);

module.exports = Applied;