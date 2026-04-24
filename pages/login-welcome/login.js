const form = document.getElementById("loginForm");
const email = document.getElementById("email");
const password = document.getElementById("password");
const remember = document.getElementById("remember");
const errorMsg = document.getElementById("errorMsg");

// وقتی فرم سابمیت میشه
form.addEventListener("submit", function (e) {
  e.preventDefault();

  errorMsg.textContent = "";

  // ذخیره ایمیل اگه تیک خورده
  if (remember.checked) {
    localStorage.setItem("savedEmail", email.value);
  } else {
    localStorage.removeItem("savedEmail");
  }

  // dummy login
  if (email.value === "melika@gmail.com" && password.value === "admin") {
    window.location.href = "welcome.html";
  } else {
    errorMsg.textContent = "Invalid email or password";
  }
});


// وقتی صفحه لود میشه
window.addEventListener("load", () => {
  const saved = localStorage.getItem("savedEmail");

  if (saved) {
    email.value = saved;
    remember.checked = true;
  }
});
window.addEventListener("load", () => {
  document.querySelectorAll(".social").forEach(btn => {
    btn.addEventListener("click", () => {
      alert("Social login is not implemented yet");
    });
  });
});