document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('startBtn');
  btn.addEventListener('click', () => {
    document.body.classList.add('fade-out');
    setTimeout(() => { window.location.href = 'products.html'; }, 360);
  });
});
