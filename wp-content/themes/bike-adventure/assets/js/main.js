document.addEventListener('DOMContentLoaded', function () {
	var header = document.querySelector('.site-header');
	var toggle = document.querySelector('.nav-toggle');
	var nav = document.querySelector('.main-nav');

	// Two thresholds (hysteresis) so small scrolls and trackpad bounce near
	// the top don't flip the header back and forth every frame.
	var ticking = false;
	function updateHeader() {
		ticking = false;
		if (!header || header.classList.contains('is-inner')) return;
		var y = window.scrollY;
		if (y > 80) {
			header.classList.add('is-scrolled');
		} else if (y < 20) {
			header.classList.remove('is-scrolled');
		}
	}
	function onScroll() {
		if (!ticking) {
			ticking = true;
			window.requestAnimationFrame(updateHeader);
		}
	}
	window.addEventListener('scroll', onScroll, { passive: true });
	updateHeader();

	// Homepage hero slider
	var heroEl = document.querySelector('.hero');
	var heroSlider = document.querySelector('.hero-slider');
	if (heroEl && heroSlider) {
		var slides = Array.prototype.slice.call(heroSlider.querySelectorAll('.hero-slide'));
		var dots = Array.prototype.slice.call(document.querySelectorAll('.hero-dot'));
		var prevBtn = document.querySelector('.hero-nav-prev');
		var nextBtn = document.querySelector('.hero-nav-next');
		var current = 0;
		var timer = null;
		var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

		function goToSlide(index) {
			slides[current].classList.remove('is-active');
			if (dots[current]) dots[current].classList.remove('is-active');
			current = (index + slides.length) % slides.length;
			slides[current].classList.add('is-active');
			if (dots[current]) dots[current].classList.add('is-active');
		}

		function nextSlide() { goToSlide(current + 1); }
		function prevSlide() { goToSlide(current - 1); }

		function stopAutoplay() {
			if (timer) clearInterval(timer);
			timer = null;
		}
		function startAutoplay() {
			if (prefersReducedMotion || slides.length < 2) return;
			stopAutoplay();
			timer = setInterval(nextSlide, 8000);
		}

		dots.forEach(function (dot, i) {
			dot.addEventListener('click', function () { goToSlide(i); startAutoplay(); });
		});
		if (nextBtn) nextBtn.addEventListener('click', function () { nextSlide(); startAutoplay(); });
		if (prevBtn) prevBtn.addEventListener('click', function () { prevSlide(); startAutoplay(); });

		heroEl.addEventListener('mouseenter', stopAutoplay);
		heroEl.addEventListener('mouseleave', startAutoplay);
		heroEl.addEventListener('focusin', stopAutoplay);
		heroEl.addEventListener('focusout', startAutoplay);

		startAutoplay();
	}

	if (toggle && nav) {
		toggle.addEventListener('click', function () {
			var open = nav.classList.toggle('is-open');
			toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
		});
	}

	// Scroll-reveal for content sections
	var revealEls = document.querySelectorAll('.reveal, .reveal-stagger');
	var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	if (revealEls.length) {
		if ('IntersectionObserver' in window && !prefersReducedMotion) {
			var revealObserver = new IntersectionObserver(function (entries) {
				entries.forEach(function (entry) {
					if (entry.isIntersecting) {
						entry.target.classList.add('is-visible');
						revealObserver.unobserve(entry.target);
					}
				});
			}, { threshold: 0.15 });
			revealEls.forEach(function (el) { revealObserver.observe(el); });
		} else {
			revealEls.forEach(function (el) { el.classList.add('is-visible'); });
		}
	}

	// Animated stat counters
	var counters = document.querySelectorAll('[data-count]');
	if (counters.length && 'IntersectionObserver' in window) {
		var observer = new IntersectionObserver(function (entries) {
			entries.forEach(function (entry) {
				if (!entry.isIntersecting) return;
				var el = entry.target;
				var target = parseInt(el.getAttribute('data-count'), 10) || 0;
				var duration = 1400;
				var start = null;

				function step(timestamp) {
					if (!start) start = timestamp;
					var progress = Math.min((timestamp - start) / duration, 1);
					el.textContent = Math.floor(progress * target).toLocaleString();
					if (progress < 1) {
						window.requestAnimationFrame(step);
					} else {
						el.textContent = target.toLocaleString();
					}
				}
				window.requestAnimationFrame(step);
				observer.unobserve(el);
			});
		}, { threshold: 0.4 });

		counters.forEach(function (el) { observer.observe(el); });
	}

	// Reusable multi-group filter system: any number of independent filter
	// groups (each a .filter-group with data-filter-group="name"), each with
	// .filter-pill buttons (data-filter="value" or "all"). An item is shown
	// only if it matches every active group. Item values are space-separated
	// in data-{groupName} so an item can belong to more than one value per
	// group (e.g. a photo tagged with two categories).
	function initFilterGroups(containerSelector, itemSelector, emptyStateSelector) {
		var container = document.querySelector(containerSelector);
		if (!container) return;
		var groups = container.querySelectorAll('.filter-group');
		if (!groups.length) return;
		var items = document.querySelectorAll(itemSelector);
		var emptyState = emptyStateSelector ? document.querySelector(emptyStateSelector) : null;
		var activeFilters = {};

		groups.forEach(function (group) {
			var groupName = group.getAttribute('data-filter-group');
			activeFilters[groupName] = 'all';

			group.querySelectorAll('.filter-pill').forEach(function (pill) {
				pill.addEventListener('click', function () {
					group.querySelectorAll('.filter-pill').forEach(function (p) { p.classList.remove('is-active'); });
					pill.classList.add('is-active');
					activeFilters[groupName] = pill.getAttribute('data-filter');

					var visibleCount = 0;
					items.forEach(function (item) {
						var show = Object.keys(activeFilters).every(function (key) {
							var value = activeFilters[key];
							if (value === 'all') return true;
							var itemValues = (item.getAttribute('data-' + key) || '').split(' ');
							return itemValues.indexOf(value) !== -1;
						});
						item.classList.toggle('is-hidden', !show);
						if (show) visibleCount++;
					});
					if (emptyState) emptyState.style.display = visibleCount === 0 ? 'block' : 'none';
				});
			});
		});
	}

	initFilterGroups('.tour-filters', '.tour-card', '.filter-empty-state');
	initFilterGroups('.gallery-filters', '.gallery-item', '.filter-empty-state');

	// Contact page map (coordinates come from Customizer → Site Settings).
	var mapEl = document.getElementById('contact-map');
	if (mapEl && typeof L !== 'undefined' && window.bikeAdventureMap) {
		var pos = [window.bikeAdventureMap.lat, window.bikeAdventureMap.lng];
		var map = L.map(mapEl, { scrollWheelZoom: false }).setView(pos, 13);
		L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
			attribution: '&copy; OpenStreetMap contributors'
		}).addTo(map);
		L.marker(pos).addTo(map).bindPopup(window.bikeAdventureMap.label);
	}

	// Lightbox for the Gallery page
	var overlay = document.getElementById('lightbox');
	if (overlay) {
		var overlayImg = overlay.querySelector('img');
		document.querySelectorAll('.lightbox-trigger').forEach(function (trigger) {
			trigger.addEventListener('click', function (e) {
				e.preventDefault();
				overlayImg.src = trigger.getAttribute('href');
				overlayImg.alt = trigger.getAttribute('data-caption') || '';
				overlay.classList.add('is-open');
			});
		});
		function closeLightbox() {
			overlay.classList.remove('is-open');
			overlayImg.src = '';
		}
		overlay.addEventListener('click', function (e) {
			if (e.target === overlay || e.target.classList.contains('lightbox-close')) closeLightbox();
		});
		document.addEventListener('keydown', function (e) {
			if (e.key === 'Escape' && overlay.classList.contains('is-open')) closeLightbox();
		});
	}
});
