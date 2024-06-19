// script1.js

document.addEventListener("DOMContentLoaded", function() {
    // Add any JavaScript code you want to run after the DOM is fully loaded

    // Example: Change the background color of the body when the page loads
    document.body.style.backgroundColor = "#e0f7fa";

    // Example: Add an event listener to navigation links
    const navLinks = document.querySelectorAll("nav ul li a");
    navLinks.forEach(link => {
        link.addEventListener("click", function() {
            alert("You clicked a navigation link!");
        });
    });
});
