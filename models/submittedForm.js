import mongoose from "mongoose";
import { subjectSchema } from "./subjects.js";
export const applicationSchema = new mongoose.Schema({
    id:{
        type:String
    },
    name:{
        type:String,
        required:true
    },
    rollno:{
        type:String,
        required:true
    },
    department: {
        type: String,
        required: true
    },
    semester: {
        type: Number,
        required: true
    },
    subjects: [subjectSchema],
    formStatus: { type: String, default: 'Not Approved' }
});
applicationSchema.index({ rollno: 1, semester: 1 }, { unique: true });

const Application = mongoose.model("Application", applicationSchema);
export default Application;
