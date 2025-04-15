import nodemailer from "nodemailer";
const sendApproveMail=async(adminEmail,adminPass,to,studentName,studentRollno,subjectList)=>{
    try{
        const transporter=nodemailer.createTransport({
            service:'gmail',
            auth:{
                user:adminEmail,
                pass:adminPass
            },
        });
        const info=await transporter.sendMail({
            from:`"Department HOD " <${adminEmail}>`,
            to,
            subject:"Enrollment approved",
            html:`
            <h3>Dear ${studentName},</h3>
               <p>${studentRollno}<p>
                <p>Your application for the following subjects has been <strong>approved</strong>:</p>
                <ul>
                    ${subjectList.map(sub => `<li>${sub}</li>`).join('')}
                </ul>
                <p>You can now track this in your profile.</p>
                <p>Regards,<br/>Admin Team</p>`
        });
        console.log("Email sent: " + info.response);
    }catch(err){
        console.error("Email error:", err);
    }
}
export  default sendApproveMail;