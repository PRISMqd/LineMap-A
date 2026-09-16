(() => {
  'use strict';

  const form = document.getElementById('pilot-form');
  const status = document.getElementById('pilot-status');

  if (!form || !status) return;

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    status.textContent = 'Pilot intake is not enabled on this build. No information was sent or stored.';
    status.hidden = false;
    status.focus();
  });
})();
