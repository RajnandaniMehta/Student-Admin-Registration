import mongoose from "mongoose";
export const subjectSchema= new mongoose.Schema({
    title: {
        type: String,
        required:true
    },
    courseCode:{
        type:String,
        required:true
    },
    department:{
        type:String,
        required:true
    },
    credit:{
        type:Number,
        default:0
    },
    category:{
        type:String,
        required:true
    },
    slot:{
        type:String,
        required:true
    }
});

const Subject=mongoose.model("Subject",subjectSchema);
export default Subject;