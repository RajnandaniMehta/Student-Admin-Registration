import mongoose from "mongoose";

const floatedSubjectSchema = new mongoose.Schema({
    subjectId: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subject', 
        required: true
    }],
    department: {
        type: String,
        required: true
    },
    semester: {
        type: Number,
        required: true
    },
    floatedAt: {
        type: Date,
        default: Date.now
    },
    floatedBy: {
        type: String,
        default: 'admin'
    }
});

const FloatedSubject = mongoose.model("FloatedSubject", floatedSubjectSchema);
export default FloatedSubject;
