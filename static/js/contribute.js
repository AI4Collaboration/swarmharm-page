const message = document.getElementById('contact-message');
const form = message.form;
let topic = '';
document.querySelectorAll('.contribution-paths a').forEach(link => {
  link.addEventListener('click', () => {
    topic = link.firstChild.textContent.trim();
    document.getElementById('contact-title').textContent = topic;
    message.placeholder = link.dataset.prompt;
    requestAnimationFrame(() => message.focus({preventScroll:true}));
  });
});
form.addEventListener('formdata', event => {
  if (topic) event.formData.set(message.name, topic + '\n\n' + message.value);
});
