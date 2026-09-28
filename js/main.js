import { profile, stack, projects, intro, outro, stops } from './data.js';
import {
  buildTimeline,
  sampleTimeline,
  smoothstep,
  lerp,
  lerpAngle,
  haversineKm,
  slerpLngLat,
} from './camera.js';
import { createMap, setActiveBeacon, setRoute } from './map.js';

const $ = (sel) => document.querySelector(sel);

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function link(href, text, className) {
  const a = el('a', className, text);
  a.href = href;
  if (/^https?:/.test(href)) {
    a.target = '_blank';
    a.rel = 'noopener';
  }
  return a;
}

function chips(items) {
  const ul = el('ul', 'chips');
  for (const item of items) ul.append(el('li', null, item));
  return ul;
}

const reducedQuery = matchMedia('(prefers-reduced-motion: reduce)');
let reduced = reducedQuery.matches;
reducedQuery.addEventListener('change', (e) => {
  reduced = e.matches;
});

// ---------- Static content ----------

function renderHero() {
  $('#hero-name').textContent = profile.name;
  $('#hero-title').textContent = profile.title;
  $('#hero-currently').textContent = profile.currently;
  $('#hero-tagline').textContent = profile.tagline;
  $('#nav-name').textContent = profile.name;
  $('#nav-resume').href = profile.resumeUrl;
}

function renderStory() {
  const story = $('#story');
  const section = (attrs) => {
    const s = document.createElement('section');
    for (const [k, v] of Object.entries(attrs)) s.dataset[k] = String(v);
    story.append(s);
    return s;
  };
  section({ seg: 'intro' });
  const stopSections = stops.map((_, i) => {
    section({ seg: 'transit', from: i === 0 ? 'intro' : i - 1, to: i });
    return section({ seg: 'stop', stop: i });
  });
  section({ seg: 'transit', from: stops.length - 1, to: 'outro' });
  section({ seg: 'outro' });
  return stopSections;
}

function renderCards() {
  const root = $('#cards');
  return stops.map((stop, i) => {
    const card = el('article', 'card');
    card.dataset.stop = String(i);
    card.setAttribute('aria-hidden', 'true');

    const head = el('header', 'card-head');
    const logo = el('img', 'card-logo');
    logo.src = stop.logo;
    logo.alt = '';
    logo.width = 40;
    logo.height = 40;
    const org = el('h2', 'card-org', stop.org);
    if (stop.current) org.append(el('span', 'card-now', 'NOW'));
    head.append(logo, org);

    const ul = el('ul', 'card-bullets');
    const bullets = stop.bullets.map((b) => {
      const li = el('li', null, b);
      ul.append(li);
      return li;
    });

    card.append(
      head,
      el('h3', 'card-role', stop.role),
      el('p', 'card-meta', `${stop.dates} · ${stop.city}`),
      ul,
    );
    root.append(card);
    return { card, bullets, last: -1, lastBullets: bullets.map(() => -1) };
  });
}

function renderRail(stopSections) {
  const rail = $('#rail');
  return stops.map((stop, i) => {
    const btn = el('button', 'rail-dot');
    btn.type = 'button';
    btn.setAttribute('aria-label', `Go to ${stop.org}`);
    btn.append(el('span', 'rail-label', stop.org), el('span', 'rail-mark'));
    btn.addEventListener('click', () => scrollToStop(stopSections[i]));
    rail.append(btn);
    return btn;
  });
}

function scrollToStop(section) {
  scrollTo({
    top: section.offsetTop + 0.3 * section.offsetHeight,
    behavior: reduced ? 'auto' : 'smooth',
  });
}

function renderProjects() {
  const grid = $('#project-grid');
  const modal = $('#video-modal');
  const player = $('#video-player');
  const title = $('#video-title');

  for (const project of projects) {
    const card = el('article', 'project');
    const meta = el('div', 'project-meta');
    meta.append(el('span', null, project.year));
    if (project.badge) meta.append(el('span', 'project-badge', project.badge));

    card.append(
      meta,
      el('h3', 'project-title', project.title),
      el('p', 'project-tagline', project.tagline),
      el('p', 'project-desc', project.description),
      chips(project.stack),
    );

    const links = el('div', 'project-links');
    if (project.links.github) links.append(link(project.links.github, 'GitHub ↗'));
    if (project.links.devpost) links.append(link(project.links.devpost, 'Devpost ↗'));
    if (project.video) {
      const btn = el('button', null, 'Watch demo ▶');
      btn.type = 'button';
      btn.addEventListener('click', () => {
        title.textContent = project.title;
        player.src = project.video;
        modal.showModal();
        player.play().catch(() => {});
      });
      links.append(btn);
    }
    if (links.childElementCount) card.append(links);
    grid.append(card);
  }

  $('#video-close').addEventListener('click', () => modal.close());
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.close();
  });
  modal.addEventListener('close', () => {
    player.pause();
    player.removeAttribute('src');
    player.load();
  });
}

function renderContact() {
  const list = $('#contact-links');
  const items = [
    ['Email', `mailto:${profile.email}`, profile.email],
    ['GitHub', profile.githubUrl, `@${profile.github}`],
    ['LinkedIn', profile.linkedinUrl, profile.linkedin],
    ['X', profile.xUrl, `@${profile.x}`],
    ['Résumé', profile.resumeUrl, 'resume.pdf'],
  ];
  for (const [kind, href, text] of items) {
    const li = el('li');
    const a = link(href, null);
    a.append(el('span', 'contact-kind', kind), document.createTextNode(text));
    li.append(a);
    list.append(li);
  }

  const stackRoot = $('#contact-stack');
  for (const [group, entries] of Object.entries(stack)) {
    const wrap = el('div', 'stack-group');
    wrap.append(el('p', 'stack-group-name', group), chips(entries));
    stackRoot.append(wrap);
  }

  $('#contact-copy').textContent = `© ${new Date().getFullYear()} ${profile.name}`;
}

// ---------- Boot ----------

renderHero();
const stopSections = renderStory();
const cards = renderCards();
const railDots = renderRail(stopSections);
renderProjects();
renderContact();

$('#nav-journey').addEventListener('click', (e) => {
  e.preventDefault();
  scrollToStop(stopSections[0]);
});

const map = createMap($('#map'), stops, intro);
if (!map) document.body.classList.add('no-map');

const hero = $('#hero');
const transitLabel = $('#transit-label');
const hud = $('#hud');

let timeline = [];
let legs = new Map(); // transit segment index -> full 64-point polyline
let routeKey = null;

function rebuildTimeline() {
  timeline = buildTimeline(document.querySelectorAll('[data-seg]'));
  legs = new Map();
  timeline.forEach((seg, i) => {
    if (seg.kind === 'transit' && typeof seg.from === 'number' && typeof seg.to === 'number') {
      legs.set(i, arc(stops[seg.from].center, stops[seg.to].center, 1, 64));
    }
  });
  routeKey = null;
}

function arc(a, b, upTo, n) {
  const pts = [];
  for (let k = 0; k < n; k++) pts.push(slerpLngLat(a, b, (upTo * k) / (n - 1)));
  return pts;
}

// Keep the focused office clear of the card: left column on desktop, bottom sheet on mobile.
function updateMapPadding() {
  if (!map) return;
  map.setPadding(
    innerWidth < 720
      ? { top: 0, right: 0, bottom: Math.round(innerHeight * 0.45), left: 0 }
      : { top: 0, right: 0, bottom: 0, left: Math.min(480, Math.round(innerWidth * 0.4)) },
  );
}

rebuildTimeline();
updateMapPadding();
addEventListener('resize', () => {
  rebuildTimeline();
  updateMapPadding();
});
addEventListener('load', rebuildTimeline);
document.fonts?.ready.then(rebuildTimeline);
// The route source is created on style.load; force a redraw once it exists.
map?.on('style.load', () => {
  routeKey = null;
});

// ---------- Overlay helpers ----------

const wrapLng = (lng) => ((((lng + 180) % 360) + 360) % 360) - 180;

function formatKm(km) {
  return km < 10 ? km.toFixed(1) : Math.round(km).toLocaleString('en-US');
}

function transitText(seg) {
  if (seg.from === 'intro') return 'Calgary, Alberta';
  if (seg.to === 'outro') return 'Back to orbit';
  const a = stops[seg.from];
  const b = stops[seg.to];
  const km = formatKm(haversineKm(a.center, b.center));
  return a.city === b.city ? `Across ${a.city} · ${km} km` : `${a.city} → ${b.city} · ${km} km`;
}

function hudText(cam) {
  const lat = cam.center[1];
  const lng = wrapLng(cam.center[0]);
  const altKm =
    ((40075.017 * Math.cos((lat * Math.PI) / 180)) / 2 ** cam.zoom) *
    (innerHeight / 512) /
    (2 * Math.tan((36.87 * Math.PI) / 360));
  const alt = altKm >= 1000 ? `${(altKm / 1000).toFixed(1)} Mm` : `${altKm.toFixed(1)} km`;
  return (
    `LAT ${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? 'N' : 'S'} · ` +
    `LNG ${Math.abs(lng).toFixed(4)}° ${lng >= 0 ? 'E' : 'W'} · ALT ${alt}`
  );
}

const cardOpacity = (p, shift = 0) =>
  smoothstep(0.05 + shift, 0.2 + shift, p) * (1 - smoothstep(0.8 + shift, 0.95 + shift, p));

const round3 = (x) => Math.round(x * 1000) / 1000;

function updateCards(seg, p) {
  cards.forEach((c, i) => {
    const active = seg.kind === 'stop' && seg.stop === i;
    const o = active ? round3(cardOpacity(p)) : 0;
    if (o !== c.last) {
      c.card.style.opacity = String(o);
      c.card.style.transform = `translateY(${(1 - o) * 24}px)`;
      c.card.style.visibility = o === 0 ? 'hidden' : 'visible';
      c.card.setAttribute('aria-hidden', o === 0 ? 'true' : 'false');
      c.last = o;
    }
    c.bullets.forEach((li, j) => {
      const ob = active ? round3(cardOpacity(p, 0.03 * j)) : 0;
      if (ob !== c.lastBullets[j]) {
        li.style.opacity = String(ob);
        li.style.transform = `translateY(${(1 - ob) * 10}px)`;
        c.lastBullets[j] = ob;
      }
    });
  });
}

let lastHero = -1;
let lastLabelOpacity = -1;
let lastLabelText = '';
let lastHud = '';
let lastActive;

function updateOverlays(sample, cam) {
  const seg = timeline[sample.seg];
  const p = sample.p;

  const heroO = seg.kind === 'intro' ? round3(1 - smoothstep(0, 0.6, p)) : 0;
  if (heroO !== lastHero) {
    hero.style.opacity = String(heroO);
    hero.style.visibility = heroO === 0 ? 'hidden' : 'visible';
    lastHero = heroO;
  }

  updateCards(seg, p);

  const labelO = seg.kind === 'transit' ? round3(Math.sin(Math.PI * p)) : 0;
  if (labelO !== lastLabelOpacity) {
    transitLabel.style.opacity = String(labelO);
    lastLabelOpacity = labelO;
  }
  if (seg.kind === 'transit') {
    const text = transitText(seg);
    if (text !== lastLabelText) {
      transitLabel.textContent = text;
      lastLabelText = text;
    }
  }

  if (sample.activeStop !== lastActive) {
    lastActive = sample.activeStop;
    setActiveBeacon(lastActive);
    railDots.forEach((dot, i) => {
      const on = i === lastActive;
      dot.classList.toggle('is-active', on);
      if (on) dot.setAttribute('aria-current', 'step');
      else dot.removeAttribute('aria-current');
    });
  }

  if (map) {
    const key = `${sample.seg}:${Math.round(p * 200)}`;
    if (key !== routeKey) {
      routeKey = key;
      const coords = [];
      for (const [i, line] of legs) if (i < sample.seg) coords.push(line);
      const pr = Math.round(p * 200) / 200;
      if (legs.has(sample.seg) && pr > 0) {
        const n = Math.max(2, Math.round(64 * pr) + 1);
        coords.push(arc(stops[seg.from].center, stops[seg.to].center, pr, n));
      }
      setRoute(map, coords);
    }
  }

  const text = hudText(cam);
  if (text !== lastHud) {
    hud.textContent = text;
    lastHud = text;
  }
}

// ---------- Frame loop ----------

let rotDeg = 0;
let cam = null;
let applied = null;
let lastT = null;
let running = false;

const touchesGlobe = (seg) =>
  seg.kind === 'intro' ||
  seg.kind === 'outro' ||
  (seg.kind === 'transit' &&
    (seg.from === 'intro' || seg.from === 'outro' || seg.to === 'intro' || seg.to === 'outro'));

function currentSegment(y) {
  const idx = timeline.findIndex((s) => y < s.top + s.height);
  return timeline[idx === -1 ? timeline.length - 1 : idx];
}

function changed(a, b) {
  if (!b) return true;
  return (
    Math.abs(a.center[0] - b.center[0]) > 1e-5 ||
    Math.abs(a.center[1] - b.center[1]) > 1e-5 ||
    Math.abs(a.zoom - b.zoom) > 1e-5 ||
    Math.abs(a.pitch - b.pitch) > 1e-5 ||
    Math.abs(a.bearing - b.bearing) > 1e-5
  );
}

function frame(t) {
  if (document.hidden) {
    running = false;
    return;
  }
  const dt = lastT == null ? 0 : Math.min(0.1, (t - lastT) / 1000);
  lastT = t;

  if (timeline.length) {
    const y = scrollY;
    if (!reduced && touchesGlobe(currentSegment(y))) rotDeg = (rotDeg + dt * 4) % 360;
    if (reduced) rotDeg = 0;

    const sample = sampleTimeline(timeline, y, {
      stops,
      intro,
      outro,
      rotDeg,
      mobile: innerWidth < 720,
    });
    const target = sample.camera;

    if (!cam) {
      cam = { ...target, center: [...target.center] };
    } else {
      const k = reduced ? 1 : 1 - Math.exp(-dt * 6);
      const dLng = ((((target.center[0] - cam.center[0]) % 360) + 540) % 360) - 180;
      cam = {
        center: [wrapLng(cam.center[0] + dLng * k), lerp(cam.center[1], target.center[1], k)],
        zoom: lerp(cam.zoom, target.zoom, k),
        pitch: lerp(cam.pitch, target.pitch, k),
        bearing: lerpAngle(cam.bearing, target.bearing, k),
      };
    }

    if (map && changed(cam, applied)) {
      map.jumpTo(cam);
      applied = cam;
    }

    updateOverlays(sample, cam);
  }

  requestAnimationFrame(frame);
}

function start() {
  if (running || document.hidden) return;
  running = true;
  lastT = null;
  requestAnimationFrame(frame);
}

document.addEventListener('visibilitychange', start);
start();
