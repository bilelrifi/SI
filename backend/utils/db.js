import mongoose from "mongoose";

const connectDB = async () => {
  try {
    // Connecting to MongoDB without deprecated options
    const connection = await mongoose.connect(process.env.MONGO_URL || "mongodb://mongo:27017/mydb");
    console.log(`mongodb connected successfully`);
  } catch (error) {
    console.error("Error in connecting to MongoDB:", error.message);
    process.exit(1); // Exit the process if DB connection fails
  }
};

export default connectDB;
