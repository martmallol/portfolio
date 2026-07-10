/*
 * Noise-shader gradient background (funkhaus.io style).
 * A full-screen WebGL quad: domain-warped simplex fbm noise drives a color
 * ramp (dark base -> blue -> green -> lime -> orange), plus animated film
 * grain. Falls back to the flat CSS background if WebGL is unavailable.
 */
(function () {
	var canvas = document.getElementById('bg-gl');
	if (!canvas) return;

	var gl = canvas.getContext('webgl', { antialias: false, alpha: false, depth: false, stencil: false, preserveDrawingBuffer: false });
	if (!gl) { canvas.parentNode.removeChild(canvas); return; }

	var VERT = [
		'attribute vec2 a_pos;',
		'void main(){ gl_Position = vec4(a_pos, 0.0, 1.0); }'
	].join('\n');

	var FRAG = [
		'precision highp float;',
		'uniform vec2 u_res;',
		'uniform float u_time;',

		/* 2D simplex noise (Ashima Arts / Ian McEwan, public domain) */
		'vec3 permute(vec3 x){ return mod(((x*34.0)+1.0)*x, 289.0); }',
		'float snoise(vec2 v){',
		'  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);',
		'  vec2 i = floor(v + dot(v, C.yy));',
		'  vec2 x0 = v - i + dot(i, C.xx);',
		'  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);',
		'  vec4 x12 = x0.xyxy + C.xxzz;',
		'  x12.xy -= i1;',
		'  i = mod(i, 289.0);',
		'  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));',
		'  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);',
		'  m = m*m; m = m*m;',
		'  vec3 x = 2.0 * fract(p * C.www) - 1.0;',
		'  vec3 h = abs(x) - 0.5;',
		'  vec3 ox = floor(x + 0.5);',
		'  vec3 a0 = x - ox;',
		'  m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);',
		'  vec3 g;',
		'  g.x = a0.x * x0.x + h.x * x0.y;',
		'  g.yz = a0.yz * x12.xz + h.yz * x12.yw;',
		'  return 130.0 * dot(m, g);',
		'}',

		'float fbm(vec2 p){',
		'  float f = 0.0, a = 0.55;',
		'  for (int i = 0; i < 3; i++) { f += a * snoise(p); p *= 1.9; a *= 0.45; }',
		'  return f;',
		'}',

		'void main(){',
		'  vec2 uv = gl_FragCoord.xy / u_res;',
		'  vec2 p = uv * vec2(u_res.x / u_res.y, 1.0) * 0.55;',
		'  float t = u_time * 0.045;',

		/* domain warp: one fbm field displaces another for the fluid look */
		'  vec2 q = vec2(fbm(p + vec2(0.0, t)), fbm(p + vec2(5.2, t * 1.3)));',
		'  float n = fbm(p + 1.25 * q + vec2(t * 0.5, -t * 0.3));',
		'  n = n * 0.5 + 0.5;',

		'  vec3 base = vec3(0.039, 0.039, 0.043);', /* #0a0a0b */
		'  vec3 c1 = vec3(1.0, 0.302, 0.0);',       /* #FF4D00 */
		'  vec3 c2 = vec3(0.851, 1.0, 0.247);',     /* #D9FF3F */
		'  vec3 c3 = vec3(0.0, 0.898, 0.627);',     /* #00E5A0 */
		'  vec3 c4 = vec3(0.357, 0.549, 1.0);',     /* #5B8CFF */

		/* dark-biased ramp with wide, soft transitions so the colors melt
		   into each other instead of forming hard contour bands */
		'  vec3 col = base;',
		'  col = mix(col, c4, smoothstep(0.50, 0.82, n) * 0.9);',
		'  col = mix(col, c3, smoothstep(0.63, 0.90, n) * 0.9);',
		'  col = mix(col, c2, smoothstep(0.75, 0.96, n) * 0.85);',
		'  col = mix(col, c1, smoothstep(0.85, 1.02, n) * 0.8);',
		'  col *= 0.7;',

		/* vignette: darker corners keep nav + footer legible */
		'  float vig = smoothstep(1.25, 0.35, length(uv - 0.5));',
		'  col *= mix(0.55, 1.0, vig);',

		/* animated film grain */
		'  float g = fract(sin(dot(gl_FragCoord.xy + mod(u_time * 60.0, 100.0), vec2(12.9898, 78.233))) * 43758.5453);',
		'  col += (g - 0.5) * 0.06;',

		'  gl_FragColor = vec4(col, 1.0);',
		'}'
	].join('\n');

	function compile(type, src) {
		var s = gl.createShader(type);
		gl.shaderSource(s, src);
		gl.compileShader(s);
		if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
			return null;
		}
		return s;
	}

	var vs = compile(gl.VERTEX_SHADER, VERT);
	var fs = compile(gl.FRAGMENT_SHADER, FRAG);
	if (!vs || !fs) { canvas.parentNode.removeChild(canvas); return; }

	var prog = gl.createProgram();
	gl.attachShader(prog, vs);
	gl.attachShader(prog, fs);
	gl.linkProgram(prog);
	if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { canvas.parentNode.removeChild(canvas); return; }
	gl.useProgram(prog);

	/* full-screen triangle strip */
	var buf = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, buf);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
	var loc = gl.getAttribLocation(prog, 'a_pos');
	gl.enableVertexAttribArray(loc);
	gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

	var uRes = gl.getUniformLocation(prog, 'u_res');
	var uTime = gl.getUniformLocation(prog, 'u_time');

	/* Render at reduced resolution — it's a soft gradient, and this keeps the
	   fbm cost low; the grain just gets a slightly chunkier, filmic look. */
	var SCALE = 0.6;
	function resize() {
		var w = Math.max(1, Math.round(canvas.clientWidth * SCALE));
		var h = Math.max(1, Math.round(canvas.clientHeight * SCALE));
		if (canvas.width !== w || canvas.height !== h) {
			canvas.width = w;
			canvas.height = h;
			gl.viewport(0, 0, w, h);
		}
	}

	var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	var start = performance.now();
	var raf = null;

	function draw(t) {
		resize();
		gl.uniform2f(uRes, canvas.width, canvas.height);
		gl.uniform1f(uTime, t);
		gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
	}

	function loop() {
		draw((performance.now() - start) / 1000);
		raf = requestAnimationFrame(loop);
	}

	if (reduced) {
		/* static frame — still a rich gradient, just not animated */
		draw(30.0);
		window.addEventListener('resize', function () { draw(30.0); });
	} else {
		loop();
		/* don't burn GPU while the tab is hidden */
		document.addEventListener('visibilitychange', function () {
			if (document.hidden) {
				if (raf) { cancelAnimationFrame(raf); raf = null; }
			} else if (!raf) {
				loop();
			}
		});
	}
})();
