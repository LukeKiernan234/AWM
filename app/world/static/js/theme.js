// Toggle Dark Mode Function
function toggleTheme() {
    const body = document.body;
    const button = document.getElementById("toggle-theme");

    console.log("Dark Mode button clicked"); // Debugging

    // Toggle the 'dark-mode' class on the body
    body.classList.toggle("dark-mode");

    // Update button text and styles based on mode
    if (body.classList.contains("dark-mode")) {
        button.textContent = "Enable Light Mode";
        button.classList.replace("btn-dark", "btn-light");
        console.log("light mode "); // Debugging
    } else {
        button.textContent = "Enable Dark Mode";
        button.classList.replace("btn-light", "btn-dark");
        console.log("Dark Mode button "); // Debugging
    }
}

// Attach the function to the button
document.addEventListener("DOMContentLoaded", function () {
    const themeButton = document.getElementById("toggle-theme");
    if (themeButton) {
        themeButton.addEventListener("click", toggleTheme);
    }
});
