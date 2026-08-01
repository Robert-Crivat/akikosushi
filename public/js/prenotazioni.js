(function () {
  'use strict';

  const A = window.Akiko;
  const form = document.querySelector('[data-reservation-form]');
  const feedback = document.querySelector('[data-reservation-feedback]');

  function todayISO() {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - offset).toISOString().slice(0, 10);
  }

  function setFeedback(kind, message) {
    feedback.textContent = '';
    feedback.appendChild(A.el('div', 'alert alert--' + kind, message));
    feedback.classList.remove('hidden');
    feedback.scrollIntoView({ block: 'nearest' });
  }

  async function onSubmit(event) {
    event.preventDefault();
    if (!form.reportValidity()) return;

    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    feedback.classList.add('hidden');

    const data = new FormData(form);
    const payload = {
      name: String(data.get('name') || '').trim(),
      phone: String(data.get('phone') || '').trim(),
      email: String(data.get('email') || '').trim(),
      people: Number(data.get('people')),
      location: String(data.get('location') || ''),
      date: String(data.get('date') || ''),
      time: String(data.get('time') || ''),
      notes: String(data.get('notes') || '').trim(),
    };

    try {
      await A.postJSON('/api/reservations', payload);
      form.reset();
      form.classList.add('hidden');
      setFeedback('ok', 'Richiesta inviata! Ti contatteremo per confermare la prenotazione.');
    } catch (err) {
      setFeedback('error', err.message);
    } finally {
      button.disabled = false;
    }
  }

  function init() {
    if (!form) return;
    const date = form.querySelector('input[name="date"]');
    if (date) {
      date.min = todayISO();
      if (!date.value) date.value = todayISO();
    }
    form.addEventListener('submit', onSubmit);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
