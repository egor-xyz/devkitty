// Focus handling
document.body.classList.add('is-focused');
window.addEventListener('focus', () => {
  document.body.classList.add('is-focused');
});
window.addEventListener('blur', () => {
  document.body.classList.remove('is-focused');
});
