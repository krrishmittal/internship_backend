const express = require("express");
const userRouter = express.Router();
const userModel = require("../models/user");
const Applied = require("../models/Applied");
const bcrypt = require("bcryptjs"); // Use bcryptjs instead of bcrypt
const jwt = require("jsonwebtoken");
const appliedOpportunity = require("../models/Applied");
const auth = require("../middlewares/auth");

// Signup Route
userRouter.post("/signup", async (req, res) => {
  const { username, email, password } = req.body;
  const user = await userModel.findOne({ email });
  if (user) {
    return res.status(400).json({ message: "User  already exists" });
  }
  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser  = new userModel({ username, email, password: hashedPassword });
  await newUser .save();
  res.status(201).json({ message: "User  created successfully" });
});

// Login Route
userRouter.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await userModel.findOne({ email });
  if (!user) {
    return res.status(401).json({ message: "User  does not exist" });
  }
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res.status(401).json({ message: "Invalid credentials" });
  }
  const token = jwt.sign({ email: user.email }, "jwtkey", { expiresIn: "4h" });
  res.cookie("token", token, { httpOnly: true, secure: true, sameSite: "Lax" });
  res.status(201).json({ message: "User  logged in successfully", token });
});


// Apply Route
userRouter.post("/apply", auth, async (req, res) => {
  try {
    const { opportunityId, title, company_name, duration } = req.body;
    const userId = req.user.email;
    const alreadyApplied = await appliedOpportunity.findOne({
      userId,
      id: opportunityId,
    });
    if (alreadyApplied) {
      return res.status(400).json({ message: "You have already applied for this opportunity" });
    }
    const newAppliedOpportunity = new appliedOpportunity({
      userId,
      id: opportunityId,
      title,
      company_name,
      duration,
    });
    await newAppliedOpportunity.save();
    res.status(201).json({ message: "Opportunity applied successfully" });
  } catch (error) {
    console.error("Error in apply route:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

userRouter.get("/applied/:opportunityId", auth, async (req, res) => {
  try {
    const { opportunityId } = req.params;
    const userId = req.user.email;
    const alreadyApplied = await appliedOpportunity.findOne({
      userId,
      id: opportunityId,
    });
    if (alreadyApplied) {
      return res.status(200).json({ applied: true });
    } else {
      return res.status(200).json({ applied: false });
    }
  } catch (error) {
    console.error("Error checking applied status:", error);
    return res.status(500).json({ status: false, message: "Internal server error" });
  }
});

userRouter.get("/applied", auth, async (req, res) => {
  try {
    const userId = req.user.email;
    const appliedOpportunities = await appliedOpportunity.find({ userId });
    return res.status(200).json(appliedOpportunities);
  } catch (error) {
    console.error("Error fetching applied opportunities:", error);
    return res.status(400).json({ status: false, message: "Bad request" });
  }
});

userRouter.post("/logout", auth, (req, res) => {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      secure: true,
      sameSite: "Lax"
    });
    res.status(200).json({ status: true, message: "Logged out successfully" });
  } catch (error) {
    console.error("Error during logout:", error);
    res.status(500).json({ status: false, message: "Internal server error" });
  }
});

userRouter.get("/profile", auth, async (req, res) => {
  try {
    const userEmail = req.user.email; // Get email from token
    const user = await userModel.findOne({ email: userEmail });
    if (!user) {
      return res.status(404).json({ message: "User  not found" });
    }
    res.status(200).json({
      name: user.username,
      email: user.email,
      id: user._id,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

userRouter.put("/profile", auth, async (req, res) => {
  try {
    const { username, password } = req.body;
    const userId = req.user.email;
    const user = await userModel.findOne({ email: userId });
    if (!user) {
        return res.status(404).json({ message: "User  not found" });
      }
      if (username) {
        user.username = username;
      }
      if (password) {
        const hashedPassword = await bcrypt.hash(password, 10);
        user.password = hashedPassword;
      }
      await user.save();
      res.status(200).json({
        message: "User  details updated successfully",
        user: {
          username: user.username,
          email: user.email
        }
      });
    } catch (error) {
      console.error("Error updating user profile:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
userRouter.delete("/applied/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.email;
  const deletedOpportunity = await appliedOpportunity.findOneAndDelete({
      _id: id,
      userId,
    });
    if (!deletedOpportunity) {
      return res.status(404).json({ message: "Opportunity not found" });
    }
    res.status(200).json({ message: "Opportunity deleted successfully" });
  } catch (error) {
    console.error("Error deleting opportunity:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});
  
// Route to delete the user
userRouter.delete("/profile", auth, async (req, res) => {
  try {
    const userId = req.user.email;
    const deleteResult = await Applied.deleteMany({ userId });
    const deletedUser  = await userModel.findOneAndDelete({ email: userId });
    if (!deletedUser ) {
      return res.status(404).json({ message: "User  not found" });
    }
    res.clearCookie("token", {
      httpOnly: true,
      secure: true,
      sameSite: "Lax"
    });
    res.status(200).json({ message: "User  and associated data deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});
  
// Route to delete the user by ID
userRouter.delete("/profile/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;
    if (id !== req.user.id) {
      return res.status(403).json({ message: "You cannot delete another user." });
    }
    await appliedOpportunity.deleteMany({ userId: req.user.email });
    const deletedUser  = await userModel.findByIdAndDelete(id);
    if (!deletedUser ) {
      return res.status(404).json({ message: "User  not found" });
    }
    res.clearCookie("token", {
      httpOnly: true,
      secure: true,
      sameSite: "Lax"
    });
    res.status(200).json({ message: "User  and associated data deleted successfully" });
  } catch (error) {
    console.error("Error deleting profile:", error);
    res.status(500).json({ message: "Server error" });
  }
});
  
userRouter.post("/profile/skills", auth, async (req, res) => {
   try {
    const { skill } = req.body;
    const userId = req.user.email;
    const user = await userModel.findOne({ email: userId });
    if (!user) {
      return res.status(404).json({ message: "User  not found" });
    }
    if (!user.skills.includes(skill)) {
      user.skills.push(skill);
      await user.save();
    }
    res.status(200).json({ message: "Skill added successfully", skills: user.skills });
  } catch (error) {
    console.error("Error adding skill:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});
  
userRouter.get("/profile/skills", auth, async (req, res) => {
  try {
    const userId = req.user.email; 
    const user = await userModel.findOne({ email: userId });
    if (!user) {
      return res.status(404).json({ message: "User  not found" });
    }
    res.status(200).json({ skills: user.skills }); 
  } catch (error) {
    console.error("Error fetching skills:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

userRouter.put("/profile/skills", auth, async (req, res) => {
  try {
    const { skills } = req.body; 
    const userId = req.user.email; 
    const user = await userModel.findOne({ email: userId });
    if (!user) {
      return res.status(404).json({ message: "User  not found" });
    }
    user.skills = skills; // Update skills
    await user.save();
    res.status(200).json({ message: "Skills updated successfully", skills: user.skills });
  } catch (error) {
    console.error("Error updating skills:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});


userRouter.get("/search", auth, async (req, res) => {
  try {
      const { query } = req.query;
      const userId = req.user.email;
      const opportunities = await appliedOpportunity.find({
          userId,
          $or: [
              { title: { $regex: query, $options: "i" } },
              { company_name: { $regex: query, $options: "i" } },
          ],
      });

      return res.status(200).json(opportunities);
  } catch (error) {
      console.error("Error searching opportunities:", error);
      return res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = userRouter;