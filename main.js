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
	 * Project grid (4 projects). Cards are always SQUARE and grow with the page,
	 * capped at 190px so the grid stays a compact centered block.
	 *  - desktop, wide: a single horizontal row of 4
	 *  - desktop, tall/narrow (not mobile): a 2x2 grid (bigger squares than a row would allow)
	 *  - mobile (<=640px): a single column (handled by CSS; here we just clear inline styles)
	 * We compute the square size each layout yields and pick whichever is larger.
	 */
	function fitCards() {
		var grid = document.getElementById('cards');
		var main = document.getElementById('mainrow');
		var card = document.getElementById('card');
		var root = document.querySelector('.root');
		if (!grid || !main || !card || !root) return;

		var count = grid.children.length;

		if (window.innerWidth <= MOBILE_MAX) {
			grid.style.gridTemplateColumns = '';
			grid.style.gridAutoRows = '';
			return;
		}

		var pad = 0, gap = 14, breathing = 30, gapCwrap = 10; /* .card no longer has padding (frame removed) */
		var cwrap = card.parentElement;
		var label = cwrap.querySelector('.card-label');
		var labelH = label ? label.getBoundingClientRect().height : 0;
		var availCardH = main.clientHeight - labelH - gapCwrap - breathing;
		var cs = getComputedStyle(root);
		var contentW = root.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);

		// Square size for an arbitrary cols x rows arrangement, bounded by both
		// the available width and height of the card container.
		function squareFor(cols, rows) {
			var byW = (contentW - (cols - 1) * gap - 2 * pad) / cols;
			var byH = (availCardH - (rows - 1) * gap - 2 * pad) / rows;
			return Math.min(byW, byH);
		}

		// Row of 4 vs 2x2 — take whichever produces the larger square.
		var rowCell = squareFor(count, 1);
		var gridCell = squareFor(2, 2);

		var cols, cell;
		if (gridCell > rowCell) { cols = 2; cell = gridCell; }
		else { cols = count; cell = rowCell; }

		cell = Math.min(cell, 190);
		cell = Math.max(cell, 84);
		grid.style.gridTemplateColumns = 'repeat(' + cols + ', ' + cell + 'px)';
		grid.style.gridAutoRows = cell + 'px';
	}

	function layout() { fitName(); fitCards(); }

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
})();
