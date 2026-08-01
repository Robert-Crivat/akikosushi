(function () {
  'use strict';

  const A = window.Akiko;
  const root = document.querySelector('[data-location-page]');
  if (!root) return;
  const slug = root.dataset.locationPage;

  async function init() {
    try {
      const locations = await A.getLocations();
      const location = locations.find(function (l) { return l.slug === slug; });
      if (!location) throw new Error('Sede non trovata.');

      document.querySelectorAll('[data-loc-name]').forEach(function (n) { n.textContent = location.name; });
      document.querySelectorAll('[data-loc-address]').forEach(function (n) { n.textContent = location.address; });
      document.querySelectorAll('[data-loc-hours]').forEach(function (n) { n.textContent = location.hours; });

      document.querySelectorAll('[data-loc-tel]').forEach(function (n) {
        n.href = 'tel:' + location.phone;
        n.textContent = 'Chiama ' + location.phoneDisplay;
      });
      document.querySelectorAll('[data-loc-whatsapp]').forEach(function (n) {
        n.href = 'https://wa.me/' + location.whatsapp;
      });
      document.querySelectorAll('[data-loc-maps]').forEach(function (n) {
        n.href = A.mapsUrl(location);
      });
      document.querySelectorAll('[data-loc-prenota]').forEach(function (n) {
        n.href = '/prenotazioni.html?location=' + encodeURIComponent(location.slug);
      });
      document.querySelectorAll('[data-loc-ordina]').forEach(function (n) {
        n.href = '/ordina.html?location=' + encodeURIComponent(location.slug);
      });
    } catch (err) {
      const status = document.querySelector('[data-loc-status]');
      if (status) A.showError(status, err.message);
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
