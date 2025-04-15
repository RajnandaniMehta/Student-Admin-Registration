import mongoose from "mongoose";
const adminSchema= new mongoose.Schema({
    name: {
        type: String,
        required:true
    },
    department:{
        type:String,
        required:true
    },
    email:{
        type:String,
        required:true
    },
    phoneNo:{
        type:Number,
        required:true
    },
    designation:{
        type:String,
    },
    password:{
        type:String,
        required:true
    },
    appPassword:{
        type:String,
        required:true
    }
});

const Admin=mongoose.model("Admin",adminSchema);
export default Admin;