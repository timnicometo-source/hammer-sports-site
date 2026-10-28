(() => {
  'use strict';
  const gallery = document.querySelector('#action-gallery');
  if (!gallery) return;
  const filters = document.querySelector('#action-filters');
  const status = document.querySelector('#action-status');
  const counter = document.querySelector('#action-counter');
  const dialog = document.querySelector('#action-lightbox');
  const fullImage = document.querySelector('#action-full-image');
  const fullCaption = document.querySelector('#action-full-caption');
  const closeButton = document.querySelector('#action-close');
  const previousButton = document.querySelector('#action-prev');
  const nextButton = document.querySelector('#action-next');
  let photos = [];
  let visible = [];
  let currentIndex = 0;
  let activeSport = 'All Photos';
  let lastTrigger = null;

  function make(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  function drawFilters() {
    filters.replaceChildren();
    const sports = [...new Set(photos.map(photo => photo.sport).filter(Boolean))].sort((a,b) => a === 'Uncategorized' ? 1 : b === 'Uncategorized' ? -1 : a.localeCompare(b));
    // Don't present misleading filters until photos have been assigned actual sports.
    if (!sports.length) { filters.hidden = true; return; }
    filters.hidden = false;
    ['All Photos', ...sports].forEach(sport => {
      const button = make('button', 'action-filter' + (sport === activeSport ? ' is-active' : ''), sport);
      button.type = 'button';
      button.setAttribute('aria-pressed', String(sport === activeSport));
      button.addEventListener('click', () => {
        activeSport = sport;
        drawFilters();
        drawGallery();
      });
      filters.append(button);
    });
  }

  function drawGallery() {
    visible = photos.filter(p => activeSport === 'All Photos' || p.sport === activeSport);
    gallery.replaceChildren();
    visible.forEach((photo, index) => {
      const card = make('button', 'action-photo');
      card.type = 'button';
      card.setAttribute('aria-label', `Enlarge photo ${index + 1}${photo.sport && photo.sport !== 'Uncategorized' ? ', ' + photo.sport : ''}`);
      const image = make('img');
      image.src = photo.src;
      image.alt = photo.alt || 'Hammer Sports officials in action';
      image.loading = 'lazy';
      image.decoding = 'async';
      image.addEventListener('error', () => { card.classList.add('action-photo-unavailable'); image.alt = ''; const message = make('span', 'action-unavailable', 'Photo format unavailable in this browser'); card.append(message); });
      card.append(image);
      card.addEventListener('click', () => { lastTrigger = card; openPhoto(index); });
      gallery.append(card);
    });
    counter.textContent = `${visible.length} photo${visible.length === 1 ? '' : 's'}`;
    status.textContent = visible.length ? '' : 'No photos in this category yet.';
  }

  function openPhoto(index) {
    if (!visible.length || !dialog.showModal) return;
    currentIndex = (index + visible.length) % visible.length;
    const photo = visible[currentIndex];
    fullImage.src = photo.src;
    fullImage.alt = photo.alt || 'Hammer Sports officials in action';
    fullCaption.textContent = photo.caption || '';
    fullCaption.hidden = !photo.caption;
    if (!dialog.open) dialog.showModal();
    closeButton.focus();
  }

  closeButton.addEventListener('click', () => dialog.close());
  previousButton.addEventListener('click', () => openPhoto(currentIndex - 1));
  nextButton.addEventListener('click', () => openPhoto(currentIndex + 1));
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  dialog.addEventListener('close', () => { fullImage.removeAttribute('src'); lastTrigger?.focus(); });
  document.addEventListener('keydown', event => {
    if (!dialog.open) return;
    if (event.key === 'ArrowRight') { event.preventDefault(); openPhoto(currentIndex + 1); }
    if (event.key === 'ArrowLeft') { event.preventDefault(); openPhoto(currentIndex - 1); }
  });

  fetch('/assets/data/photos.json', { cache: 'no-cache' })
    .then(response => { if (!response.ok) throw new Error(`HTTP ${response.status}`); return response.json(); })
    .then(data => {
      if (!Array.isArray(data)) throw new Error('Photo data must be an array');
      photos = data.filter(p => p && typeof p.src === 'string' && p.src.startsWith('/') && true);
      drawFilters();
      drawGallery();
    })
    .catch(error => {
      console.error('Officials in Action gallery:', error);
      status.textContent = 'The photo gallery could not be loaded. Please try again later.';
    });
})();
