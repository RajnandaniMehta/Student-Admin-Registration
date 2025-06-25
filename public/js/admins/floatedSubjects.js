toastr.options = {
    "positionClass": "toast-top-center"
};
function togglePreviousSubjects() {
    const section = document.getElementById("previousSubjects");
    section.style.display = (section.style.display === "none") ? "block" : "none";
}
function addNewSubject() {
    const container = document.getElementById("newSubjectsContainer");
    const html = `
        <div class="new-subject">
            <input type="text" name="title" placeholder="Title" required>
            <input type="text" name="courseCode" placeholder="Course Code" required>
            <input type="text" name="credit" placeholder="credit" required>
            <input type="text" name="category" placeholder="category" required>
            <input type="text" name="slot" placeholder="Slot" required>
            <button class="btn btn-secondary cancel" >Cancel</button>
        </div>
    `;
    container.insertAdjacentHTML("beforeend", html);
}



document.getElementById("newSubjectsContainer").addEventListener("click", function(e) {
    if (e.target.classList.contains("cancel")) {
        e.preventDefault();
        const newSubjectDiv = e.target.closest(".new-subject");
        if (newSubjectDiv) {
            newSubjectDiv.remove(); // remove the entire div on cancel
        }
        console.log("Cancel button clicked");
    }
});

let floatform = document.getElementById("floatform");
let adminId = document.body.getAttribute("data-admin-id");
floatform.addEventListener("submit", async function (e) {
    e.preventDefault();
    const formData = new FormData(this);
    const selectedSubjects = [];
    document.querySelectorAll('input[name="selectedSubjects"]:checked').forEach((checkbox) => {
        selectedSubjects.push(checkbox.value);
    });

    const newSubjects = [];
    document.querySelectorAll(".new-subject").forEach(div => {
        const title = div.querySelector('input[name="title"]').value;
        const courseCode = div.querySelector('input[name="courseCode"]').value;
        const credit = div.querySelector('input[name="credit"]').value;
        const category = div.querySelector('input[name="category"]').value;
        const slot = div.querySelector('input[name="slot"]').value;

        newSubjects.push({ title, courseCode, credit, category, slot });
    });
    const userData = {
        department: formData.get("department"),
        semester: formData.get("semester"),
        newSubjects: newSubjects,
        selectedSubjects: selectedSubjects
    };
    try {
        const response = await fetch(`http://localhost:8000/admin/${adminId}/subjects`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(userData),
        });
        const data = await response.json();
        if (response.ok) {
            toastr.success(data.message);
            setTimeout(() => {
                window.location.href = data.redirect;
            }, 2000);
        } else {
            toastr.error(data.message);
        }
    } catch (err) {
        console.log(err);
    }

})