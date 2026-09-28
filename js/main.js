import { profile, stack, projects, stops } from './data.js';
import { $, el, link, chips } from './dom.js';
import { createGame } from './game.js';
import { setSound, soundOn } from './audio.js';

const videoModal = $('#video-modal');
const videoPlayer = $('#video-player');
const videoTitle = $('#video-title');
const info = $('#info');
const infoBody = $('#info-body');

// ---------- Shared builders ----------

function contactItems() {
  return [
    ['Email', `mailto:${profile.email}`, profile.email],
    ['GitHub', profile.githubUrl, `@${profile.github}`],
    ['LinkedIn', profile.linkedinUrl, profile.linkedin],
    ['X', profile.xUrl, `@${profile.x}`],
    ['Résumé', profile.resumeUrl, 'resume.pdf'],
  ];
}

function fillContactList(list) {
  for (const [kind, href, text] of contactItems()) {
    const li = el('li');
    const a = link(href, null);
    a.append(el('span', 'contact-kind', kind), document.createTextNode(text));
    li.append(a);
    list.append(li);
  }
  return list;
}

function stackGroups(root) {
  for (const [group, entries] of Object.entries(stack)) {
    const wrap = el('div', 'stack-group');
    wrap.append(el('p', 'stack-group-name', group), chips(entries));
    root.append(wrap);
  }
  return root;
}

function logoImg(stop, className) {
  const img = el('img', className);
  img.src = stop.logo;
  img.alt = '';
  img.width = 32;
  img.height = 32;
  return img;
}

function playVideo(project) {
  videoTitle.textContent = project.title;
  videoPlayer.src = project.video;
  videoModal.showModal();
  videoPlayer.play().catch(() => {});
}

function projectLinks(project, className) {
  const links = el('div', className);
  if (project.links.github) links.append(link(project.links.github, 'GitHub ↗'));
  if (project.links.devpost) links.append(link(project.links.devpost, 'Devpost ↗'));
  if (project.video) {
    const btn = el('button', null, 'Watch demo ▶');
    btn.type = 'button';
    btn.addEventListener('click', () => playVideo(project));
    links.append(btn);
  }
  return links;
}

// ---------- Résumé page ----------

function renderResume() {
  $('#r-name').textContent = profile.name;
  $('#r-title').textContent = profile.title;
  $('#r-currently').textContent = profile.currently;
  $('#r-tagline').textContent = profile.tagline;

  const exp = $('#r-exp-list');
  for (const stop of stops) {
    const card = el('article', 'r-card');
    const head = el('div', 'r-card-head');
    head.append(logoImg(stop, 'r-logo'), el('h3', 'r-org', stop.org));
    if (stop.current) head.append(el('span', 'pill', 'NOW'));
    const bullets = el('ul', 'r-bullets');
    for (const b of stop.bullets) bullets.append(el('li', null, b));
    card.append(head, el('p', 'r-role', stop.role), el('p', 'r-meta', `${stop.dates} · ${stop.city}`), bullets);
    exp.append(card);
  }

  const grid = $('#r-proj-list');
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
    const links = projectLinks(project, 'project-links');
    if (links.childElementCount) card.append(links);
    grid.append(card);
  }

  fillContactList($('#contact-links'));
  stackGroups($('#contact-stack'));
  $('#contact-copy').textContent = `© ${new Date().getFullYear()} ${profile.name}`;

  $('#video-close').addEventListener('click', () => videoModal.close());
  videoModal.addEventListener('click', (e) => {
    if (e.target === videoModal) videoModal.close();
  });
  videoModal.addEventListener('close', () => {
    videoPlayer.pause();
    videoPlayer.removeAttribute('src');
    videoPlayer.load();
  });
}

// ---------- Info dialog ----------

function stopContent(i) {
  const stop = stops[i];
  const head = el('div', 'info-head');
  head.append(logoImg(stop, 'info-logo'), el('h2', 'info-title', stop.org));
  if (stop.current) head.append(el('span', 'pill', 'NOW'));
  const bullets = el('ul', 'info-bullets');
  for (const b of stop.bullets) bullets.append(el('li', null, b));
  return [
    el('p', 'eyebrow', `WORLD ${i + 1}`),
    head,
    el('p', 'info-tagline', stop.role),
    el('p', 'info-meta', `${stop.dates} · ${stop.city}`),
    bullets,
  ];
}

function projectContent(k) {
  const project = projects[k];
  const nodes = [
    el('p', 'eyebrow', `PROJECT ${k + 1}/${projects.length}`),
    el('h2', 'info-title', project.title),
    el('p', 'info-meta', [project.year, project.badge].filter(Boolean).join(' · ')),
    el('p', 'info-tagline', project.tagline),
    el('p', 'info-desc', project.description),
    chips(project.stack),
  ];
  const links = projectLinks(project, 'info-links');
  if (links.childElementCount) nodes.push(links);
  return nodes;
}

function goalContent() {
  return [
    el('p', 'eyebrow', 'COURSE CLEAR!'),
    el('h2', 'info-title', profile.name),
    el('p', 'info-tagline', "Thanks for playing. Let's talk:"),
    fillContactList(el('ul', 'contact-links')),
    stackGroups(el('div', 'info-stack')),
  ];
}

function openInfo(nodes) {
  infoBody.replaceChildren(...nodes);
  game?.pause();
  if (!info.open) info.showModal();
}

$('#info-close').addEventListener('click', () => info.close());
info.addEventListener('click', (e) => {
  if (e.target === info) info.close();
});
info.addEventListener('close', () => {
  if (document.body.classList.contains('mode-play')) game?.resume();
  $('#stage').focus?.({ preventScroll: true });
});

// ---------- HUD ----------

const soundBtn = $('#sound-toggle');
function updateSoundLabel() {
  soundBtn.textContent = soundOn() ? '♪ ON' : '♪ OFF';
  soundBtn.setAttribute('aria-pressed', String(soundOn()));
}

function onHud(state) {
  $('#hud-zone').textContent = state.zone;
  $('#hud-coins').textContent = `COINS ${state.coinsFound.size}/${state.level.blocks.size}`;
  $('#hud-bugs').textContent = `BUGS ${state.bugs}`;
  updateSoundLabel();
}

// ---------- Modes ----------

let mode = null;
function setMode(next) {
  mode = next;
  const body = document.body;
  body.classList.remove('mode-title', 'mode-play', 'mode-resume');
  body.classList.add(`mode-${next}`);
  $('#resume').classList.toggle('sr-only', next !== 'resume');
  if (next === 'resume') history.replaceState(null, '', '#resume');
  else if (location.hash) history.replaceState(null, '', location.pathname + location.search);

  if (next === 'play') {
    game.resume();
    $('#stage').focus?.({ preventScroll: true });
  } else game?.pause();
  if (next === 'resume') scrollTo(0, 0);
}

// ---------- Boot ----------

renderResume();
$('#hud-name').textContent = profile.name;
$('#title-name').textContent = profile.name;
$('#title-title').textContent = profile.title;
$('#title-currently').textContent = profile.currently;

const game = createGame({
  canvas: $('#game'),
  stops,
  projects,
  onHit: (block) => openInfo(block.kind === 'stop' ? stopContent(block.index) : projectContent(block.index)),
  onGoal: () => openInfo(goalContent()),
  onHud,
});

if (game) {
  game.start();
  onHud(game.state);
} else {
  $('#play-btn').hidden = true;
}

$('#start-btn').addEventListener('click', () => setMode('play'));
$('#title-skip').addEventListener('click', () => setMode('resume'));
$('#skip-btn').addEventListener('click', () => setMode('resume'));
$('#play-btn').addEventListener('click', () => setMode('play'));
soundBtn.addEventListener('click', () => {
  setSound(!soundOn());
  updateSoundLabel();
});
addEventListener('keydown', (e) => {
  if (mode !== 'title' || !game) return;
  if (e.target instanceof HTMLButtonElement) return; // buttons handle Enter/Space natively
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    setMode('play');
  }
});

const startInResume =
  !game || location.hash === '#resume' || matchMedia('(prefers-reduced-motion: reduce)').matches;
setMode(startInResume ? 'resume' : 'title');
updateSoundLabel();
