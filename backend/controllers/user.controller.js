import { User } from "../models/user.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import getDataUri from "../utils/datauri.js";
import cloudinary from "../utils/cloudinary.js";


export const register = async (req, res) => {
  try {
    const { fullname, email, phoneNumber, password, role } = req.body;
    if (!fullname || !email || !phoneNumber || !password || !role) {
      return res.status(400).json({
        message: "Something is missing",
        success: false,
      });
    }
    const file = req.file;
    const fileUri = getDataUri(file);
    //const cloudResponse = await cloudinary.uploader.upload(fileUri.content);
    const cloudResponse = "https://res.cloudinary.com/demo/image/upload/sample.jpg"; //replacement with Dummy image replacement
    const user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({
        message: "User already exist with this email.",
        success: false,
      });
    }
    const hashedPassword =await  bcrypt.hash(password, 10);
    await User.create({
      fullname,
      email,
      phoneNumber,
      password: hashedPassword,
      role,
      profile:{
        profilePhoto: "cloudResponse.secure_url",
      }
    });

    return res.status(201).json({
      message: "Account created successfully.",
      success: true,
    });
  } catch (error) {
    console.log(error);
  }
};

export const login = async (req, res) => {
  try {
    const { email, password, role } = req.body; //role means recruiter or student

    // 1. Validate input
    if (!email || !password || !role) {
      return res.status(400).json({
        message: "Something is missing",
        success: false,
      });
    }

    // 2. Check user existence
    let user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({
        message: "Incorrect email or password.",
        success: false,
      });
    }

    // 3. Compare passwords
    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) {
      return res.status(400).json({ // FIXED!
        message: "Incorrect email or password.",
        success: false,
      });
    }

    // 4. Validate role
    if (role !== user.role) {
      return res.status(400).json({
        message: "Account doesn't exist with current role.",
        success: false,
      });
    }

    // 5. Generate token
    const tokenData = {
      userId: user._id,
    };
    const token = await jwt.sign(tokenData, process.env.SECRET_KEY, {
      expiresIn: "1d",
    });

    // 6. Prepare response user object
    user = {
      _id: user._id,
      fullname: user.fullname,
      email: user.email,
      phoneNumber: user.phoneNumber,
      role: user.role,
      profile: user.profile,
    };

    // 7. Send success response
    return res
      .status(200)
      .cookie("token", token, {
        maxAge: 5 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        sameSite: "None",  //changed from Strict to none!!
      })
      .json({
        message: `Welcome back ${user.fullname}`,
        user,
        success: true,
      });

  } catch (error) {
    console.error(error); // Updated error log
    return res.status(500).json({
      message: "Server error. Please try again later.",
      success: false,
    });
  }
};

export const logout = async (req, res) => {
  try {
    return res.status(200).cookie("token", "", { maxAge: 0 }).json({
      message: "Logged out successfully.",
      success: true,
    });
  } catch (error) {
    console.log(error);
  }
};


export const updateProfile = async(req,res) =>{
  try {
    const {fullname, email, phoneNumber, bio, skills} = req.body;
    const file = req.file;
    //cloudinary ayega idhar
    const fileUri = getDataUri(file);
    //const cloudResponse = await cloudinary.uploader.upload(fileUri.content);
    const cloudResponse = "https://res.cloudinary.com/demo/image/upload/sample.jpg"; //replacement with Dummy

    let skillsArray = [];
    if (skills) {
      skillsArray = skills.split(",").map(skill => skill.trim()); // Convert string to array and trim spaces
    }
    const userId = req.id;  // middleware authentication se aaiga.
    let user = await User.findById(userId);
    if(!user){
      return res.status(400).json({
        message:"User not found",
        success:false,
      });
    };
    //updating data.
    if(fullname) user.fullname = fullname;
    if(email) user.email = email;
    if(phoneNumber) user.phoneNumber = phoneNumber;
    if(bio) user.profile.bio = bio;
    if(skills) user.profile.skills = skillsArray;

    //resume comes later in this function.
    if(cloudResponse){
      user.profile.resume = cloudResponse.secure_url  //save the cloudinary url
      user.profile.resumeOriginalName = file.originalname //save the original file name.
    }
    await user.save();

      user = {
        _id: user._id,
        fullname: user.fullname,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: user.role,
        profile: user.profile,
    }

    return res.status(200).json({
      message:"Profile updated successfully.",
      user,
     success:true
    })
  } catch (error) {
    console.log(error);
  }
}
