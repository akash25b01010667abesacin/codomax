document.addEventListener('DOMContentLoaded', () => {
  const yearNode = document.getElementById('year');
  if (yearNode) {
    yearNode.textContent = new Date().getFullYear();
  }

  const toggle = document.querySelector('.nav-toggle');
  const navLinks = document.querySelector('.nav-links');

  if (toggle && navLinks) {
    toggle.addEventListener('click', () => {
      const isOpen = navLinks.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(isOpen));
    });
  }

  const forms = document.querySelectorAll('form');
  forms.forEach((form) => {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const feedback = form.querySelector('.feedback');
      const isValid = Array.from(form.querySelectorAll('input, textarea')).every((field) => field.checkValidity());

      if (!isValid) {
        feedback.textContent = 'Please complete every required field.';
        return;
      }

      feedback.textContent = form.dataset.feedback || 'Submission received.';
      form.reset();
    });
  });
});
