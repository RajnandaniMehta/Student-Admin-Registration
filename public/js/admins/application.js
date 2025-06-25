function showReason() {
    const container = document.getElementById("reason");
    container.style.display = (container.style.display === "none") ? "block" : "none";
}
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
    const disapproveButtons = document.querySelectorAll(".dis-approve-btn");

    disapproveButtons.forEach(button => {
        button.addEventListener("click", async (e) => {
            e.preventDefault();
            const studentCard = button.closest(".student-card");
            const studentId = studentCard.dataset.studentId;
            const appId= studentCard.dataset.appId;
            const form = studentCard.querySelector("form");
            const formData = new FormData(form);
            const msg=formData.get("disMsg")
            
            fetch(`/admin/${adminId}/disapprove`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ studentId: studentId ,appId:appId,disMsg:msg})
            })
            .then(res => res.json())
            .then(data => {
                alert(data.message);
                location.reload();
                
            })
            .catch(err => {
                console.error("Error approving student:", err);
            });
        });
    });

});

