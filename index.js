const express = require("express");
const mongoose = require("mongoose");
const userRouter = require("./routes/user");
const cookieParser = require("cookie-parser");
const cors = require("cors");

const app = express();
app.use(cors({
    origin: 'https://chic-kelpie-a8e23a.netlify.app', // Your frontend URL
    credentials: true // Allow credentials
}));
app.use(express.json());
app.use(cookieParser());


app.use("/auth", userRouter);


mongoose.connect("mongodb+srv://test:test@cluster0.l7dbh.mongodb.net/internshipportal").then(() => {
    console.log("Connected to MongoDB");
});


app.listen(4000, () => {
    console.log("Server is running on port 4000");
});
