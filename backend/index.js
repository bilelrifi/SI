import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './utils/db.js';
dotenv.config({});
import userRoute from "./routes/user.route.js";
import companyRoute from "./routes/company.route.js";
import jobRoute from "./routes/job.route.js";
import applicationRoute from "./routes/application.route.js";
import masterDataRoute from "./routes/master.route.js"; 
//jb bhi import use kro saath me uska extension bhi likho

const app = express();
const PORT = process.env.PORT || 3000;

//middleware 
app.use(express.json());   //hum json pass krenge.
app.use(express.urlencoded({extended:true}));
app.use(cookieParser());
const corsOptions = {
  origin: [
    'http://localhost:5173',  
    'http://localhost:8080',  
  ],
  credentials:true,
}
app.use(cors(corsOptions));

app.use("/api/v1/user",userRoute);
app.use("/api/v1/company",companyRoute);
app.use("/api/v1/job",jobRoute);
app.use("/api/v1/application",applicationRoute);
app.use("/api/v1/master", masterDataRoute); 

//http://localhost:8000/api/v1/user/register

app.listen(PORT, ()=>{
  connectDB();
  console.log(`Server is running at post ${PORT}`);
})