/* Reading feedback and screen inspection; the documentation stays visible without JavaScript. */
(function () {
  var article = document.querySelector('.documentation');
  if (!article) return;
  var progress = document.createElement('span'), frame = 0;
  progress.className = 'case-reading-progress';
  progress.setAttribute('aria-hidden', 'true');
  document.body.appendChild(progress);
  function updateProgress() {
    frame = 0;
    var top = article.getBoundingClientRect().top + window.scrollY;
    var distance = article.offsetHeight - window.innerHeight;
    var value = distance > 0 ? (window.scrollY - top) / distance : 0;
    progress.style.setProperty('--reading-progress', Math.max(0, Math.min(1, value)));
  }
  function scheduleProgress() { if (!frame) frame = requestAnimationFrame(updateProgress); }
  addEventListener('scroll', scheduleProgress, { passive: true });
  addEventListener('resize', scheduleProgress);
  if ('ResizeObserver' in window) new ResizeObserver(scheduleProgress).observe(article);
  scheduleProgress();

  var reduce = matchMedia('(prefers-reduced-motion: reduce)');
  if ('IntersectionObserver' in window && !reduce.matches) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        if (!reduce.matches) entry.target.classList.add('case-phase-arrive');
        observer.unobserve(entry.target);
      });
    }, { threshold: .15 });
    article.querySelectorAll('[data-node-id="792:83922"], [data-node-id="792:89338"]').forEach(function (image) {
      observer.observe(image);
    });
  }

  var dialog = document.createElement('dialog');
  if (typeof dialog.showModal !== 'function') return;
  dialog.className = 'case-preview';
  dialog.setAttribute('aria-labelledby', 'case-preview-title');
  dialog.innerHTML = '<div class="case-preview-header"><h2 id="case-preview-title">Screen detail</h2><button class="case-preview-close" type="button" autofocus>Close</button></div><img class="case-preview-image" alt="">';
  document.body.appendChild(dialog);
  var preview = dialog.querySelector('img'), title = dialog.querySelector('h2'), trigger;
  dialog.querySelector('button').addEventListener('click', function () { dialog.close(); });
  dialog.addEventListener('click', function (event) {
    var bounds = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) dialog.close();
  });
  dialog.addEventListener('close', function () {
    document.documentElement.classList.remove('case-preview-open');
    preview.removeAttribute('src');
    if (trigger && trigger.isConnected) trigger.focus({ preventScroll: true });
  });
  article.querySelectorAll('img[src$=".png"]').forEach(function (image) {
    var slot = image.closest('[data-name]'), label = slot && slot.getAttribute('data-name');
    if (!label || !/^(Screen ·|Employer ·|HUB ·|Public ·|apna-|quess-|betterplace-|indiamart-)/.test(label)) return;
    label = label.replace(/^Screen · /, '').replace(/-1440x900 1$/, '').replace(/ [123]$/, '');
    image.classList.add('case-zoom');
    image.setAttribute('role', 'button');
    image.setAttribute('tabindex', '0');
    image.setAttribute('aria-label', 'Enlarge ' + label);
    image.setAttribute('aria-haspopup', 'dialog');
    image.title = 'Click to enlarge';
    function openPreview() {
      trigger = image;
      title.textContent = label;
      preview.alt = label;
      preview.src = image.currentSrc || image.src;
      dialog.showModal();
      dialog.scrollTop = 0;
      document.documentElement.classList.add('case-preview-open');
    }
    image.addEventListener('click', openPreview);
    image.addEventListener('keydown', function (event) {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      openPreview();
    });
  });
})();
