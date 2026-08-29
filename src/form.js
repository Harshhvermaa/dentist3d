/* ============================================================
   form.js — appointment form handling (front-end only demo)
   Replace the success branch with a real booking endpoint later.
   ============================================================ */
export function initAppointmentForm() {
  const form = document.getElementById('appointmentForm');
  const note = document.getElementById('formNote');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = new FormData(form);
    const name = (data.get('name') || '').toString().trim();
    const phone = (data.get('phone') || '').toString().trim();
    const service = (data.get('service') || '').toString().trim();

    if (!name || !phone || !service) {
      note.style.color = '#c0453f';
      note.textContent = 'Please fill in your name, phone and a service.';
      return;
    }

    // Demo only — no backend. Swap for your booking endpoint / email service.
    note.style.color = '';
    note.textContent = `Thanks, ${name.split(' ')[0]}! We'll call you at ${phone} to confirm.`;
    form.reset();
  });
}
