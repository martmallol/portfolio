(function () {
	var MOBILE_MAX = 640;

	/* MARTIN MALLOL always spans the full page width, on every screen and zoom level */
	function fitName() {
		var el = document.getElementById('bigname');
		if (!el || !el.parentElement) return;
		var p = el.parentElement;
		var cs = getComputedStyle(p);
		var avail = p.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
		if (avail <= 0) return;

		el.style.whiteSpace = 'nowrap';
		el.style.display = 'block';
		el.style.width = '100%';

		/* Two-pass fit: the second pass corrects sub-pixel rounding so the
		   text lands flush on both edges regardless of browser zoom. */
		var base = 400;
		el.style.fontSize = base + 'px';
		var w = el.scrollWidth;
		if (w <= 0) return;
		var size = base * avail / w;
		el.style.fontSize = size + 'px';

		w = el.scrollWidth;
		if (w > 0) {
			size = size * avail / w;
			el.style.fontSize = size + 'px';
		}
	}

	/*
	 * Project grid (4 projects). The grid is now full-width (4 equal columns
	 * spanning the page, like the title) and fills the available height — all
	 * handled in CSS. Nothing to compute here except clearing any stale inline
	 * styles left over from older layouts.
	 */
	function fitCards() {
		var grid = document.getElementById('cards');
		if (!grid) return;
		grid.style.gridTemplateColumns = '';
		grid.style.gridAutoRows = '';
	}

	/* "BUENOS AIRES, AR" stretches (via letter-spacing) to span exactly the
	   same width as "MARTIN MALLOL" above it in the navbar brand block. */
	function fitBrandLoc() {
		var nameEl = document.querySelector('.brand-name');
		var locEl = document.querySelector('.brand-loc');
		if (!nameEl || !locEl) return;

		var target = nameEl.getBoundingClientRect().width;
		var text = locEl.textContent;
		if (target <= 0 || !text) return;

		locEl.style.letterSpacing = '0px';
		var natural = locEl.getBoundingClientRect().width;
		if (natural <= 0) return;

		var extra = (target - natural) / text.length;
		locEl.style.letterSpacing = extra + 'px';
	}

	function layout() { fitName(); fitCards(); fitBrandLoc(); }

	/* footer copyright year — always the current year, no manual updates */
	function setYear() {
		var el = document.getElementById('year');
		if (el) el.textContent = new Date().getFullYear();
	}

	/* 3D tilt on the project tiles */
	function initTilt() {
		var cards = document.querySelectorAll('.cards > a');
		cards.forEach(function (c) {
			if (c._tilt) return;
			c.addEventListener('mouseenter', function () {
				c.style.transition = 'transform .1s ease-out, border-color .22s, box-shadow .22s';
			});
			c.addEventListener('mousemove', function (e) {
				var r = c.getBoundingClientRect();
				var px = (e.clientX - r.left) / r.width - 0.5;
				var py = (e.clientY - r.top) / r.height - 0.5;
				c.style.transform = 'rotateX(' + (-py * 7).toFixed(2) + 'deg) rotateY(' + (px * 7).toFixed(2) + 'deg) translateY(-5px) scale(1.025)';
			});
			c.addEventListener('mouseleave', function () {
				c.style.transition = 'transform .35s cubic-bezier(.2,.8,.2,1), border-color .22s, box-shadow .22s';
				c.style.transform = '';
			});
			c._tilt = true;
		});
	}

	/* Live GitHub star counts. The HTML already carries a baked-in fallback
	   value, so if the API is rate-limited/offline (or the repo is private)
	   the shown number simply stays as-is. */
	function loadStars() {
		document.querySelectorAll('.proj[data-repo]').forEach(function (a) {
			var repo = a.getAttribute('data-repo');
			var out = a.querySelector('[data-stars] .stars-n');
			if (!repo || !out) return;
			fetch('https://api.github.com/repos/' + repo, {
				headers: { 'Accept': 'application/vnd.github+json' }
			})
				.then(function (r) { return r.ok ? r.json() : null; })
				.then(function (d) {
					if (d && typeof d.stargazers_count === 'number') {
						out.textContent = d.stargazers_count;
					}
				})
				.catch(function () { /* keep fallback */ });
		});
	}

	window.addEventListener('resize', layout);
	/* Browser zoom does not always fire window.resize; visualViewport catches it. */
	if (window.visualViewport) {
		window.visualViewport.addEventListener('resize', layout);
	}
	if (window.ResizeObserver) {
		var ro = new ResizeObserver(layout);
		var el = document.getElementById('bigname');
		if (el && el.parentElement) ro.observe(el.parentElement);
	}
	[0, 60, 150, 350, 800, 1500].forEach(function (t) { setTimeout(layout, t); });
	requestAnimationFrame(layout);
	if (document.fonts && document.fonts.ready) document.fonts.ready.then(layout);
	initTilt();
	loadStars();
	setYear();
})();
