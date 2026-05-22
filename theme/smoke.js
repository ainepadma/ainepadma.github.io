/**
 * Spooky Smoke Animation — WebGL2 background for Ainepadma.github.io
 * Uses a fractal Brownian motion shader with customizable tint color.
 * Place a <canvas id="smoke-canvas" data-color="#f5b351"> in the page,
 * include this script, and it will animate automatically.
 */
(() => {
    const canvas = document.getElementById('smoke-canvas');
    if (!canvas) return;

    const gl = canvas.getContext('webgl2', { alpha: false });
    if (!gl) return;

    /* ── Shader sources ── */
    const vertexSrc = `#version 300 es
precision highp float;
in vec4 position;
void main(){gl_Position=position;}`;

    const fragmentSrc = `#version 300 es
precision highp float;
out vec4 O;
uniform float time;
uniform vec2 resolution;
uniform vec3 u_color;

#define FC gl_FragCoord.xy
#define R resolution
#define T (time+660.)

float rnd(vec2 p){p=fract(p*vec2(12.9898,78.233));p+=dot(p,p+34.56);return fract(p.x*p.y);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p),u=f*f*(3.-2.*f);return mix(mix(rnd(i),rnd(i+vec2(1,0)),u.x),mix(rnd(i+vec2(0,1)),rnd(i+1.),u.x),u.y);}
float fbm(vec2 p){float t=.0,a=1.;for(int i=0;i<5;i++){t+=a*noise(p);p*=mat2(1,-1.2,.2,1.2)*2.;a*=.5;}return t;}

void main(){
    vec2 uv=(FC-.5*R)/R.y;
    vec3 col=vec3(1);
    uv.x+=.25;
    uv*=vec2(2,1);

    float n=fbm(uv*.28-vec2(T*.01,0));
    n=noise(uv*3.+n*2.);

    col.r-=fbm(uv+vec2(0,T*.015)+n);
    col.g-=fbm(uv*1.003+vec2(0,T*.015)+n+.003);
    col.b-=fbm(uv*1.006+vec2(0,T*.015)+n+.006);

    col=mix(col, u_color, dot(col,vec3(.21,.71,.07)));

    col=mix(vec3(.08),col,min(time*.1,1.));
    col=clamp(col,.08,1.);
    O=vec4(col,1);
}`;

    /* ── Compile & link ── */
    const compile = (type, src) => {
        const s = gl.createShader(type);
        gl.shaderSource(s, src);
        gl.compileShader(s);
        return s;
    };

    const vs = compile(gl.VERTEX_SHADER, vertexSrc);
    const fs = compile(gl.FRAGMENT_SHADER, fragmentSrc);
    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    /* ── Fullscreen quad ── */
    const vertices = new Float32Array([-1, 1, -1, -1, 1, 1, 1, -1]);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    const posLoc = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    /* ── Uniforms ── */
    const uRes = gl.getUniformLocation(program, 'resolution');
    const uTime = gl.getUniformLocation(program, 'time');
    const uColor = gl.getUniformLocation(program, 'u_color');

    /* ── Color from data attribute (default: site accent gold) ── */
    const hex = (canvas.getAttribute('data-color') || '#f5b351').replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;

    /* ── Resize ── */
    const resize = () => {
        const dpr = Math.max(1, window.devicePixelRatio || 1);
        canvas.width = window.innerWidth * dpr;
        canvas.height = window.innerHeight * dpr;
        gl.viewport(0, 0, canvas.width, canvas.height);
    };
    window.addEventListener('resize', resize);
    resize();

    /* ── Render loop ── */
    const render = (now) => {
        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.useProgram(program);
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.uniform2f(uRes, canvas.width, canvas.height);
        gl.uniform1f(uTime, now * 0.001);
        gl.uniform3f(uColor, r, g, b);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        requestAnimationFrame(render);
    };
    requestAnimationFrame(render);
})();
