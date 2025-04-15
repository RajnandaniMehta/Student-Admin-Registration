toastr.options = {
    "positionClass": "toast-top-center"
  };
let formlogin=document.getElementById("formlgn");

formlogin.addEventListener("submit",async function(e){
    
    e.preventDefault();
    const formData=new FormData(this);
    const userData={
        email:formData.get("email"),
        password:formData.get("password"),
    };
    console.log(userData);
    try{
        const response=await fetch("http://localhost:8000/admin", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(userData),
        });
        const data=await response.json();
        if (response.ok) {
            toastr.success(data.message);
            setTimeout(() => {
                window.location.href = data.redirect;
            }, 2000);
        } else {
            toastr.error(data.message);
        }
    }catch(err){
        console.log(err);
    }
})

