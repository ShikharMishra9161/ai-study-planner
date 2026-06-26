const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI,{
      //connection pool settings
      maxPoolSize: 20,
      minPoolSize: 2,

     // Timeout Settings
     serverSelectionTimeoutMS: 5000,
     socketTimeoutMS: 45000,
    });
    console.log("mongoDB connected");

  }catch(error){
    console.log("mongoDB connection failed:", error.message);
    process.exit(1);
  }

};

module.exports = connectDB;