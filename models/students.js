import mongoose from "mongoose";

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
    subjects: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Subject"
      }],
    activity:[{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Application"
      }]
});
const Student=mongoose.model("Student",studentSchema);
export default Student;