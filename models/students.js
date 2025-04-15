import mongoose from "mongoose";
import {subjectSchema} from "./subjects.js";
import {applicationSchema} from "./submittedForm.js";

const studentSchema = new mongoose.Schema({
    name:{
        type:String,
        required:true
    },
    id:{
        type:Number,
        required:true
    },
    rollno:{
        type:String,
        required:true
    },
    currSemester: {
        type: Number,
        default : 1
    },
    department:{
        type:String,
        required:true
    },
    password:{
        type:String,
        required:true
    },
    fatherName:{ type:String},
    permanentAddress:{type:String},
    parentMobNo:{type:Number},
    parentEmail:{type:String},
    presentAddress:{type:String,
        required:true
    },
    studentNo:{type:Number,
        required:true
    },
    studentEmail:{ type:String,
        required:true
    },
    subjects: [subjectSchema],
    activity:[applicationSchema]
});
const Student=mongoose.model("Student",studentSchema);
export default Student;