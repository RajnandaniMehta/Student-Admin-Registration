import mongoose from "mongoose";
import Subject from "../models/subjects.js";
import data from "./Data.js";

const MONGO_URL="mongodb://127.0.0.1:27017/CollegeWebsite";

main().then(()=>{
    console.log("Connected to DB");
}).catch((err) =>{
    console.log(err);
})
async function main(){
    await mongoose.connect(MONGO_URL);
}

const initDB = async () =>{
    await Subject.deleteMany({});
    await Subject.insertMany(data);
}
initDB();