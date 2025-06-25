import mongoose from "mongoose";

export const applicationSchema = new mongoose.Schema({
    studentId:{
        type:String,
        required:true
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
    subjects: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "Subject"
          }],
    formStatus: { type: String, default: 'Not Approved' }
});

applicationSchema.index({ studentId: 1, semester: 1 }, { unique: true });

const Application = mongoose.model("Application", applicationSchema);
export default Application;
