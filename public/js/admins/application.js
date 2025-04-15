
document.addEventListener("DOMContentLoaded", () => {
    let adminId = document.body.getAttribute("data-admin-id");
    const approveButtons = document.querySelectorAll(".approve-btn");

    approveButtons.forEach(button => {
        button.addEventListener("click", () => {
            const studentCard = button.closest(".student-card");
            const studentId = studentCard.dataset.studentId;
            const appId= studentCard.dataset.appId;
            console.log(studentId);
            console.log(appId);
            fetch(`/admin/${adminId}/approve`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ studentId: studentId ,appId:appId})
            })
            .then(res => res.json())
            .then(data => {
                alert("Student approved!");
                location.reload();
            })
            .catch(err => {
                console.error("Error approving student:", err);
            });
        });
    });
});

// let aprBtns=document.querySelectorAll(".approve-btn");
// for(let btn of aprBtns){
//     sendEmail()
// }
// function sendEmail(){
//     Email.send({
//         Host : "s1.maildns.net",
//         Username : "username",
//         Password : "password",
//         To : 'them@website.com',
//         From : "you@isp.com",
//         Subject : "This is the subject",
//         Body : "And this is the body"
//     }).then(
//       message => alert(message)
//     );
// }