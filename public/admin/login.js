(function () {
  const form = document.getElementById('login-form');
  const submit = document.getElementById('login-submit');
  const msg = document.getElementById('login-msg');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    msg.textContent = '';
    submit.disabled = true;

    try {
      const loginUrl = window.AKIKO_API_BASE ? window.AKIKO_API_BASE + '/api/admin/login' : '/api/admin/login';
      const res = await fetch(loginUrl, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: document.getElementById('username').value,
          password: document.getElementById('password').value,
        }),
      });

      if (res.ok) {
        window.location.replace('dashboard.html');
        return;
      }

      const data = await res.json().catch(() => ({}));
      msg.textContent = data.error || 'Credenziali non valide.';
    } catch (err) {
      msg.textContent = 'Impossibile contattare il server. Riprova.';
    } finally {
      submit.disabled = false;
    }
  });
})();
