const express = require("express");
const userRouter = express.Router();
const userModel = require("../models/user");
const Applied = require("../models/Applied");
const bcrypt = require("bcryptjs"); 
const jwt = require("jsonwebtoken");
const appliedOpportunity = require("../models/Applied");
const auth = require("../middlewares/auth");
const multer = require('multer');
const upload = multer({ dest: 'uploads/' }); 
const fs = require('fs');

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
  res.cookie("token", token, { httpOnly: true, secure: true, sameSite: "None" });
  res.status(201).json({ message: "User  logged in successfully", token });
});

// logout route
userRouter.post("/logout", auth, (req, res) => {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      secure: true,
      sameSite: "None"
    });
    res.status(200).json({ status: true, message: "Logged out successfully" });
  } catch (error) {
    console.error("Error during logout:", error);
    res.status(500).json({ status: false, message: "Internal server error" });
  }
});

//apply route
userRouter.post("/apply", auth, upload.single('resume'), async (req, res) => {
  try {
    const {
      id,title,company_name,duration,fullName,email,phone,degree,fieldOfStudy,university,graduationDate,skills} = req.body;
    const userId = req.user.email;
    if (!id) {
      return res.status(400).json({ message: "Opportunity ID is required" });
    }
    if (!req.file) {
      return res.status(400).json({ message: "Resume is required" });
    }
    const alreadyApplied = await Applied.findOne({ userId, id });
    if (alreadyApplied) {
      return res.status(400).json({ message: "You have already applied for this opportunity" });
    }
    const resumeBuffer = fs.readFileSync(req.file.path);
    const newAppliedOpportunity = new Applied({
      userId,id,title,company_name,duration,fullName,email,phone,degree,fieldOfStudy,university,graduationDate,skills,resume: resumeBuffer,resumePath: req.file ? req.file.path : null, 
    });
    await newAppliedOpportunity.save();
    fs.unlinkSync(req.file.path);
    res.status(201).json({ message: "Opportunity applied successfully" });
  } catch (error) {
    console.error("Error in apply route:", error);
    res.status(500).json({ message: "Internal server error" });
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

// get application route
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

// Update Application Route
userRouter.put("/applied/:id", auth, upload.single('resume'), async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.email;
        const application = await Applied.findOne({ _id: id, userId });
        if (!application) {
            return res.status(404).json({ message: "Application not found" });
        }
        const {
            title, company_name, duration, fullName, email, phone, degree, fieldOfStudy, university, graduationDate, skills } = req.body;
 
        application.title = title || application.title;
        application.company_name = company_name || application.company_name;
        application.duration = duration || application.duration;
        application.fullName = fullName || application.fullName;
        application.email = email || application.email;
        application.phone = phone || application.phone;
        application.degree = degree || application.degree;
        application.fieldOfStudy = fieldOfStudy || application.fieldOfStudy;
        application.university = university || application.university;
        application.graduationDate = graduationDate || application.graduationDate;
        application.skills = skills || application.skills; 
        if (req.file) { 
            if (application.resumePath) {
                fs.unlinkSync(application.resumePath);  
            }
            application.resumePath = req.file.path;  
        }
        await application.save();
        res.status(200).json({ message: "Application updated successfully", application });
    } catch (error) {
        console.error("Error updating application:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// delete opportunity
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

//profile route
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

// Update Profile Route
userRouter.put("/profile", auth, async (req, res) => {
  try {
    const { username, password, linkedin } = req.body;  
    const userId = req.user.email;
    const user = await userModel.findOne({ email: userId });
    if (!user) {
      return res.status(404).json({ message: "User  not found" });
    }
    if (username) {
      user.username = username;
    }
    if (linkedin) {
      user.linkedin = linkedin; 
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
        email: user.email,
        linkedin: user.linkedin,
      }
    });
  } catch (error) {
    console.error("Error updating user profile:", error);
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
      sameSite: "None"
    });
    res.status(200).json({ message: "User  and associated data deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// route to add skills
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
  
//route to display skills
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

// router to update skills
userRouter.put("/profile/skills", auth, async (req, res) => {
  try {
    const { skills } = req.body; 
    const userId = req.user.email; 
    const user = await userModel.findOne({ email: userId });
    if (!user) {
      return res.status(404).json({ message: "User  not found" });
    }
    user.skills = skills; 
    await user.save();
    res.status(200).json({ message: "Skills updated successfully", skills: user.skills });
  } catch (error) {
    console.error("Error updating skills:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

//route to add projects
userRouter.post("/profile/projects", auth, async (req, res) => {
  try {
    const { title, description, link } = req.body;
    const userId = req.user.email;
    const user = await userModel.findOne({ email: userId });
    if (!user) {
      return res.status(404).json({ message: "User  not found" });
    }
    if (!user.projects) {
      user.projects = [];
    }
    const newProject = { title, description, link };
    user.projects.push(newProject);
    await user.save();
    res.status(200).json({ message: "Project added successfully", projects: user.projects });
  } catch (error) {
    console.error("Error adding project:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Get User Projects Route
userRouter.get("/profile/projects", auth, async (req, res) => {
  try {
    const userId = req.user.email;  
    const user = await userModel.findOne({ email: userId });
    if (!user) {
      return res.status(404).json({ message: "User  not found" });
    }
    res.status(200).json({ projects: user.projects || [] });  
  } catch (error) {
    console.error("Error fetching projects:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Update Project Route
userRouter.put("/profile/projects/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, link } = req.body;  
    const userId = req.user.email; 
    const user = await userModel.findOne({ email: userId });
    if (!user) {
      return res.status(404).json({ message: "User  not found" });
    } 
    const projectIndex = user.projects.findIndex(project => project._id.toString() === id);
    if (projectIndex === -1) {
      return res.status(404).json({ message: "Project not found" });
    } 
    user.projects[projectIndex] = { title, description, link };
    await user.save(); 
    res.status(200).json({ message: "Project updated successfully", project: user.projects[projectIndex] });
  } catch (error) {
    console.error("Error updating project:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Delete Project Route
userRouter.delete("/profile/projects/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.email;

    const user = await userModel.findOne({ email: userId });
    if (!user) {
      return res.status(404).json({ message: "User  not found" });
    }
    user.projects = user.projects.filter(project => project._id.toString() !== id);
    await user.save();
    res.status(200).json({ message: "Project deleted successfully" });
  } catch (error) {
    console.error("Error deleting project:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// search route
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