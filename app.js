'use strict';

// This is a read-only static storybook. Edit content/memories.json to add stories.
// No accounts, tokens, local storage, upload endpoint or backend is required.
const chapterLabels = { pregnancy: '還未見面', birth: '你好，承熹', growing: '一起長大' };
const kindLabels = { memory: '日常回憶', milestone: '每個第一次', letter: '寫給你的信' };
const supportedMime = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif',
  'video/mp4', 'video/quicktime', 'video/webm'
]);
const state = {
  profile: { name: '許承熹', birthday: '2025-09-20', birthTime: '15:08' },
  memories: [], filter: 'all', mediaFilter: 'all', sort: 'asc', cover: null
};
const byId = (id) => document.getElementById(id);
const isPhoto = (file) => file.mime.startsWith('image/');
const dotDate = (date) => date ? date.replaceAll('-', '.') : '日期待補';
const originalCover = byId('cover-window').firstElementChild.cloneNode(true);
let heroSlideshow = null;
const timelineSlideshows = new Set();

function el(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function icon(name, size = 24) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'icon');
  svg.setAttribute('width', size);
  svg.setAttribute('height', size);
  svg.setAttribute('aria-hidden', 'true');
  const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  use.setAttribute('href', '#icon-' + name);
  svg.append(use);
  return svg;
}

function calendarDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  if (year < 1000 || month < 1 || month > 12 || day < 1) return false;
  const actual = new Date(Date.UTC(year, month - 1, day));
  return actual.getUTCFullYear() === year && actual.getUTCMonth() === month - 1 && actual.getUTCDate() === day;
}

function calendarMonth(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}$/.test(value)) return false;
  const [year, month] = value.split('-').map(Number);
  return year >= 1000 && month >= 1 && month <= 12;
}

function validAgeMonths(value) {
  return Number.isInteger(value) && value >= 0 && value <= 120;
}

function memoryDateLabel(memory) {
  if (memory.date) return dotDate(memory.date);
  if (calendarMonth(memory.dateMonth)) {
    const [year, month] = memory.dateMonth.split('-').map(Number);
    return `${year}年${month}月`;
  }
  return validAgeMonths(memory.ageMonths) ? `${memory.ageMonths}個月` : '日期待補';
}

function memorySortKey(memory) {
  if (memory.date) return Date.parse(memory.date + 'T00:00:00Z');
  if (calendarMonth(memory.dateMonth)) {
    const [year, month] = memory.dateMonth.split('-').map(Number);
    // The first day is only a sorting key; a month-only capture date stays null.
    return Date.UTC(year, month - 1, 1);
  }
  if (!validAgeMonths(memory.ageMonths)) return null;
  const [year, month, day] = state.profile.birthday.split('-').map(Number);
  const target = new Date(Date.UTC(year, month - 1 + memory.ageMonths, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  // The anniversary is only a sorting key; an unknown capture date stays null.
  return Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), Math.min(day, lastDay));
}

function compareMemoryDates(a, b, direction = 'asc') {
  const first = memorySortKey(a);
  const second = memorySortKey(b);
  if (first === null) return second === null ? 0 : 1;
  if (second === null) return -1;
  return (direction === 'asc' ? 1 : -1) * (first - second);
}

function todayHK() {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: 'Asia/Hong_Kong', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(new Date());
  const part = (type) => parts.find((entry) => entry.type === type).value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

function ageLabel(date) {
  if (!calendarDate(date)) return '';
  const birthday = state.profile.birthday;
  if (date < birthday) return '期待初次見面';
  const [birthYear, birthMonth, birthDay] = birthday.split('-').map(Number);
  const [year, month, day] = date.split('-').map(Number);
  let months = (year - birthYear) * 12 + month - birthMonth;
  const anniversary = (count) => {
    const first = new Date(Date.UTC(birthYear, birthMonth - 1 + count, 1));
    const lastDay = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
    return Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), Math.min(birthDay, lastDay));
  };
  const now = Date.UTC(year, month - 1, day);
  if (now < anniversary(months)) months -= 1;
  const days = Math.floor((now - anniversary(months)) / 86400000);
  return [Math.floor(months / 12) ? `${Math.floor(months / 12)}歲` : '',
    months % 12 ? `${months % 12}個月` : '', days ? `${days}日` : ''].filter(Boolean).join(' ') || '出生的第一天';
}

// Only HTTPS or project-relative files can become media URLs. In particular,
// protocol-relative, root-relative, javascript:, data:, file: and traversal URLs
// are rejected. Local media stays inside this Pages site's base directory.
function safeMediaUrl(value) {
  if (typeof value !== 'string' || !value || value !== value.trim()) return null;
  if (/[\u0000-\u001f\u007f\\]/.test(value)) return null;
  try {
    if (/^https:\/\//i.test(value)) {
      const url = new URL(value);
      return url.protocol === 'https:' && !url.username && !url.password ? url.href : null;
    }
    if (/^[a-z][a-z\d+.-]*:/i.test(value) || /^[/?#]/.test(value)) return null;
    const decodedPath = decodeURIComponent(value.split(/[?#]/)[0]);
    if (decodedPath.includes('\\') || decodedPath.split('/').some((part) => part === '..')) return null;
    const base = new URL('./', document.baseURI);
    const resolved = new URL(value, base);
    if (resolved.origin !== base.origin || !resolved.pathname.startsWith(base.pathname)) return null;
    return value;
  } catch {
    return null;
  }
}

function readContent(data) {
  if (!data || typeof data !== 'object' || !Array.isArray(data.memories)) throw new Error('Invalid story data');
  let skipped = 0;
  const profile = data.profile && typeof data.profile === 'object' ? data.profile : {};
  state.profile = {
    name: typeof profile.name === 'string' && profile.name.trim() ? profile.name.trim().slice(0, 80) : '許承熹',
    birthday: calendarDate(profile.birthday) ? profile.birthday : '2025-09-20',
    birthTime: typeof profile.birthTime === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(profile.birthTime) ? profile.birthTime : '15:08'
  };
  const memories = [];
  const seenIds = new Set();
  for (const source of data.memories) {
    if (!source || typeof source !== 'object' || typeof source.id !== 'string' || !source.id.trim() ||
        seenIds.has(source.id) || typeof source.title !== 'string' || !source.title.trim() ||
        (source.date != null && source.date !== '' && !calendarDate(source.date)) || !Object.hasOwn(chapterLabels, source.chapter) ||
        !Object.hasOwn(kindLabels, source.kind)) {
      skipped += 1;
      continue;
    }
    const media = [];
    for (const file of Array.isArray(source.media) ? source.media : []) {
      const url = file && typeof file === 'object' ? safeMediaUrl(file.url) : null;
      if (!url || typeof file.mime !== 'string' || !supportedMime.has(file.mime.toLowerCase())) {
        skipped += 1;
        continue;
      }
      media.push({
        id: typeof file.id === 'string' ? file.id : `${source.id}-media-${media.length + 1}`,
        name: typeof file.name === 'string' ? file.name.slice(0, 200) : '',
        mime: file.mime.toLowerCase(), size: Number.isFinite(file.size) ? file.size : 0, url
      });
    }
    const date = calendarDate(source.date) ? source.date : null;
    seenIds.add(source.id);
    memories.push({
      id: source.id, title: source.title.trim().slice(0, 120), date,
      dateMonth: calendarMonth(source.dateMonth) ? source.dateMonth : null,
      ageMonths: validAgeMonths(source.ageMonths) ? source.ageMonths : null,
      chapter: source.chapter, kind: source.kind,
      note: typeof source.note === 'string' ? source.note.slice(0, 10000) : '',
      featured: source.featured === true,
      createdAt: typeof source.createdAt === 'string' ? source.createdAt : date || '', media
    });
  }
  state.memories = memories;
  return skipped;
}

function updateProfile() {
  byId('profile-eyebrow').textContent = 'THE STORY OF ' + state.profile.name;
  byId('age-label').textContent = '承熹今天 ' + ageLabel(todayHK());
  const [year, month, day] = state.profile.birthday.split('-');
  byId('birth-stamp-day').textContent = `${day} · ${month}`;
  byId('birth-stamp-time').textContent = `${year} · ${state.profile.birthTime}`;
  byId('footer-years').textContent = `${year} — ${todayHK().slice(0, 4)} · 我們的故事，未完待續。`;
}

function photo(file, alt, className, lazy = true) {
  const image = el('img', className);
  image.src = file.url;
  image.alt = alt;
  image.decoding = 'async';
  image.loading = lazy ? 'lazy' : 'eager';
  image.referrerPolicy = 'no-referrer';
  image.addEventListener('error', () => {
    const fallback = el('div', `${className || ''} media-unavailable`, '相片暫時未能顯示');
    image.replaceWith(fallback);
  }, { once: true });
  return image;
}

function renderCover() {
  state.cover = [...state.memories]
    .filter((memory) => memory.featured && memory.media.some(isPhoto))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] || null;
  const window = byId('cover-window');
  if (state.cover) {
    window.replaceChildren(photo(state.cover.media.find(isPhoto), state.cover.title, '', false));
    byId('cover-link').setAttribute('aria-label', '閱讀精選回憶：' + state.cover.title);
  } else {
    window.replaceChildren(originalCover.cloneNode(true));
    byId('cover-link').setAttribute('aria-label', '翻開承熹的相簿');
  }
}

function initHeroSlideshow() {
  if (heroSlideshow) return;
  const memory = state.memories.find((item) => item.id === 'newborn-portraits');
  const files = memory ? memory.media.filter(isPhoto) : [];
  const hero = document.querySelector('.hero');
  if (!hero || !files.length) return;
  hero.firstElementChild.classList.add('hero-intro');
  const background = el('div', 'hero-slideshow');
  background.setAttribute('aria-hidden', 'true');
  const controls = el('div', 'hero-slideshow-controls');
  controls.setAttribute('role', 'group');
  controls.setAttribute('aria-label', '初生寫真背景輪播');
  controls.hidden = true;
  const dots = el('div', 'slideshow-dots');
  const toggle = el('button', 'slideshow-toggle');
  toggle.type = 'button';
  controls.append(el('span', 'slideshow-caption', '初生寫真 · ' + dotDate(memory.date)), dots, toggle);
  hero.prepend(background);
  hero.append(controls);
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let paused = motion.matches;
  let visible = true;
  let active = -1;
  let timer = null;
  const slides = [];
  const activate = (index) => {
    if (!slides[index].ready) return;
    active = index;
    for (const [position, slide] of slides.entries()) {
      const current = position === active;
      slide.image.classList.toggle('is-active', current);
      slide.button.classList.toggle('is-active', current);
      slide.button.setAttribute('aria-pressed', String(current));
    }
    hero.classList.add('has-slideshow');
    controls.hidden = false;
  };
  const sync = () => {
    clearInterval(timer);
    timer = null;
    toggle.textContent = paused ? '播放輪播' : '暫停輪播';
    const ready = slides.filter((slide) => slide.ready);
    toggle.disabled = ready.length < 2;
    if (paused || !visible || document.hidden || byId('memory-dialog').open || ready.length < 2) return;
    timer = setInterval(() => {
      const next = ready[(ready.findIndex((slide) => slide === slides[active]) + 1) % ready.length];
      activate(slides.indexOf(next));
    }, 3000);
  };
  heroSlideshow = { sync };
  toggle.addEventListener('click', () => { paused = !paused; sync(); });
  motion.addEventListener('change', (event) => { paused = event.matches; sync(); });
  if (typeof IntersectionObserver === 'function') {
    heroSlideshow.observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      sync();
    });
    heroSlideshow.observer.observe(hero);
  }
  for (const [index, file] of files.entries()) {
    const image = el('img', 'hero-slide');
    image.alt = '';
    image.decoding = 'async';
    image.referrerPolicy = 'no-referrer';
    const button = el('button', 'slideshow-dot');
    button.type = 'button';
    button.disabled = true;
    button.setAttribute('aria-label', `顯示第 ${index + 1} 張初生寫真`);
    button.setAttribute('aria-pressed', 'false');
    button.addEventListener('click', () => { paused = true; activate(index); sync(); });
    const slide = { image, button, ready: false };
    slides.push(slide);
    dots.append(button);
    background.append(image);
    image.src = file.url;
    image.decode().then(() => {
      slide.ready = true;
      button.disabled = false;
      if (active < 0) activate(index);
      sync();
    }).catch(() => { sync(); });
  }
  sync();
}

function syncHeroSlideshow() {
  if (heroSlideshow) heroSlideshow.sync();
}

function birthCard() {
  const card = el('div', 'birth-entry');
  const illustration = el('div', 'birth-illustration');
  illustration.append(icon('flower', 46));
  const text = el('div');
  text.append(el('h3', '', '你好，承熹。'));
  const [year, month, day] = state.profile.birthday.split('-').map(Number);
  const [hour, minute] = state.profile.birthTime.split(':').map(Number);
  const clock = `${hour < 12 ? '上午' : '下午'} ${hour % 12 || 12} 時 ${String(minute).padStart(2, '0')} 分。`;
  const description = el('p');
  description.append(document.createTextNode(`${year} 年 ${month} 月 ${day} 日，${clock}`), el('br'), document.createTextNode('我們的故事，從此多了一個你。'));
  text.append(description);
  card.append(illustration, text);
  return card;
}

function memoryMedia(memory) {
  if (!memory.media.length) return null;
  const grid = el('div', 'memory-media' + (memory.media.length > 1 && memory.media.length % 2 ? ' memory-media-odd' : ''));
  const counts = { photo: memory.media.filter(isPhoto).length, video: memory.media.filter((file) => !isPhoto(file)).length };
  const positions = { photo: 0, video: 0 };
  for (const file of memory.media) {
    const picture = isPhoto(file);
    const type = picture ? 'photo' : 'video';
    const label = `${picture ? '相片' : '影片'} ${++positions[type]}/${counts[type]}`;
    const figure = el('figure', 'memory-media-item');
    if (picture) {
      const button = el('button', 'memory-photo-button');
      button.type = 'button';
      button.setAttribute('aria-label', `放大${label}：${memory.title}`);
      button.append(photo(file, `${memory.title} · ${label}`, 'memory-photo'));
      button.addEventListener('click', () => showMemory(memory, file));
      figure.append(button);
    } else {
      const video = el('video', 'memory-video');
      video.src = file.url;
      video.controls = true;
      video.playsInline = true;
      video.preload = 'metadata';
      video.setAttribute('aria-label', `${memory.title} · ${label}`);
      video.addEventListener('error', () => {
        const message = el('p', 'media-unavailable', '這段影片暫時未能播放。');
        const original = el('a', '', '開啟原檔');
        original.href = file.url;
        original.target = '_blank';
        original.rel = 'noopener noreferrer';
        message.append(original);
        figure.prepend(message);
      }, { once: true });
      figure.append(video);
    }
    figure.append(el('figcaption', 'memory-media-caption', label));
    grid.append(figure);
  }
  return grid;
}

function syncTimelineSlideshows() {
  for (const slideshow of timelineSlideshows) slideshow.sync();
}

function disposeTimelineSlideshows() {
  for (const slideshow of timelineSlideshows) slideshow.dispose();
}

function memorySlideshow(memory) {
  const files = memory.media;
  const root = el('section', 'memory-slideshow');
  root.setAttribute('aria-label', `${memory.title}，${files.length} 張相片`);
  root.setAttribute('aria-roledescription', '相片輪播');
  const stage = el('button', 'memory-slideshow-stage');
  stage.type = 'button';
  const slides = files.map((file, index) => {
    const slide = el('span', 'memory-slideshow-slide');
    slide.classList.toggle('is-active', index === 0);
    slide.setAttribute('aria-hidden', String(index !== 0));
    slide.append(photo(file, `${memory.title} · 相片 ${index + 1}/${files.length}`, 'memory-slideshow-photo'));
    stage.append(slide);
    return slide;
  });
  const controls = el('div', 'memory-slideshow-controls');
  controls.setAttribute('role', 'group');
  controls.setAttribute('aria-label', '相片輪播控制');
  const previous = el('button', 'memory-slideshow-arrow previous');
  const next = el('button', 'memory-slideshow-arrow');
  for (const [button, label] of [[previous, '上一張相片'], [next, '下一張相片']]) {
    button.type = 'button';
    button.setAttribute('aria-label', label);
    button.disabled = files.length < 2;
    button.append(icon('chevron', 18));
  }
  const counter = el('span', 'memory-slideshow-counter');
  counter.setAttribute('aria-atomic', 'true');
  const toggle = el('button', 'memory-slideshow-toggle');
  toggle.type = 'button';
  toggle.disabled = files.length < 2;
  controls.append(previous, counter, next, toggle);
  root.append(stage, controls);

  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let paused = motion.matches;
  let active = 0;
  let disposed = false;
  let timer = null;
  let observer = null;
  let visible = typeof IntersectionObserver !== 'function';
  function activate(index) {
    if (disposed) return;
    active = (index + files.length) % files.length;
    for (const [position, slide] of slides.entries()) {
      slide.classList.toggle('is-active', position === active);
      slide.setAttribute('aria-hidden', String(position !== active));
    }
    for (const index of [active, (active + 1) % files.length]) {
      const image = slides[index].querySelector('img');
      if (image) image.loading = 'eager';
    }
    counter.textContent = `${active + 1} / ${files.length}`;
    counter.setAttribute('aria-label', `第 ${active + 1} 張，共 ${files.length} 張相片`);
    stage.setAttribute('aria-label', `放大第 ${active + 1} 張相片：${memory.title}`);
  }
  function sync() {
    clearInterval(timer);
    timer = null;
    if (disposed) return;
    toggle.textContent = paused ? '播放' : '暫停';
    toggle.setAttribute('aria-label', paused ? '播放相片輪播' : '暫停相片輪播');
    counter.setAttribute('aria-live', paused ? 'polite' : 'off');
    if (paused || !visible || document.hidden || byId('memory-dialog').open || files.length < 2) return;
    timer = setInterval(() => {
      if (!disposed && !paused && visible && !document.hidden && !byId('memory-dialog').open) activate(active + 1);
    }, 3000);
  }
  function navigate(index) {
    if (disposed) return;
    paused = true;
    sync();
    activate(index);
  }
  function onMotionChange(event) {
    if (disposed) return;
    paused = event.matches;
    sync();
  }
  const controller = {
    sync,
    dispose() {
      disposed = true;
      clearInterval(timer);
      timer = null;
      if (observer) observer.disconnect();
      motion.removeEventListener('change', onMotionChange);
      timelineSlideshows.delete(controller);
    }
  };
  timelineSlideshows.add(controller);
  motion.addEventListener('change', onMotionChange);
  if (typeof IntersectionObserver === 'function') {
    observer = new IntersectionObserver(([entry]) => {
      if (disposed) return;
      visible = entry.isIntersecting;
      sync();
    });
    observer.observe(root);
  }
  previous.addEventListener('click', () => navigate(active - 1));
  next.addEventListener('click', () => navigate(active + 1));
  toggle.addEventListener('click', () => {
    if (disposed) return;
    paused = !paused;
    sync();
  });
  stage.addEventListener('click', () => { if (!disposed) showMemory(memory, files[active]); });
  root.addEventListener('keydown', (event) => {
    const destination = { ArrowLeft: active - 1, ArrowRight: active + 1, Home: 0, End: files.length - 1 };
    if (!Object.hasOwn(destination, event.key)) return;
    event.preventDefault();
    navigate(destination[event.key]);
  });
  activate(0);
  sync();
  return root;
}

function memoryCard(memory) {
  const card = el('article', 'memory-entry memory-expanded');
  card.setAttribute('aria-label', memory.title);
  card.setAttribute('data-memory-id', memory.id);
  const body = el('div', 'entry-body');
  body.append(el('span', 'entry-tag', kindLabels[memory.kind] + (memory.featured ? ' · 精選' : '')),
    el('h3', '', memory.title), el('p', '', memory.note || `${memory.media.length} 個珍貴瞬間`));
  card.append(body);
  const media = memory.id === 'portraits-202602' && memory.media.length && memory.media.every(isPhoto)
    ? memorySlideshow(memory) : memoryMedia(memory);
  if (media) card.append(media);
  return card;
}

function renderTimeline() {
  disposeTimelineSlideshows();
  const memories = state.memories.filter((memory) => memory.kind !== 'letter' &&
    (state.filter === 'all' || memory.chapter === state.filter || state.filter === 'milestone' && memory.kind === 'milestone'));
  const items = [...memories];
  if (state.filter === 'all' || state.filter === 'birth') items.push({ builtin: true, date: state.profile.birthday });
  items.sort((a, b) => compareMemoryDates(a, b, state.sort));
  const fragment = document.createDocumentFragment();
  for (const item of items) {
    const row = el('div', 'timeline-row');
    const date = el('div', 'timeline-date', memoryDateLabel(item));
    date.append(el('span', '', item.builtin ? '我們的第一天' : chapterLabels[item.chapter]));
    row.append(date, item.builtin ? birthCard() : memoryCard(item));
    fragment.append(row);
  }
  byId('timeline').replaceChildren(fragment);
  byId('timeline').hidden = items.length === 0;
  byId('story-empty').hidden = items.length !== 0;
  byId('story-count').textContent = `${memories.length} 段回憶`;
  byId('chapter-invitations').hidden = state.memories.length > 0 || state.filter !== 'all';
  for (const button of document.querySelectorAll('[data-filter]')) {
    const active = button.dataset.filter === state.filter;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  }
}

function renderGallery() {
  const media = state.memories.flatMap((memory) => memory.media.map((file) => ({ memory, file })));
  const visible = media.filter(({ file }) => state.mediaFilter === 'all' ||
    state.mediaFilter === 'photo' && isPhoto(file) || state.mediaFilter === 'video' && !isPhoto(file));
  const fragment = document.createDocumentFragment();
  for (const { memory, file } of visible) {
    const tile = el('button', 'gallery-tile');
    tile.type = 'button';
    tile.setAttribute('aria-label', `查看${isPhoto(file) ? '相片' : '影片'}：${memory.title}`);
    const frame = el('div', 'gallery-image' + (isPhoto(file) ? '' : ' video-placeholder'));
    if (isPhoto(file)) frame.append(photo(file, memory.title));
    else frame.append(icon('play', 38));
    const badge = el('span', 'media-badge');
    badge.append(icon(isPhoto(file) ? 'camera' : 'play', 10), document.createTextNode(isPhoto(file) ? '相片' : '影片'));
    frame.append(badge);
    tile.append(frame, el('h3', '', memory.title), el('small', '', memoryDateLabel(memory)));
    tile.addEventListener('click', () => showMemory(memory, file));
    fragment.append(tile);
  }
  byId('gallery').replaceChildren(fragment);
  byId('gallery').hidden = visible.length === 0;
  byId('album-empty').hidden = media.length !== 0 || state.mediaFilter !== 'all';
  byId('album-filter-empty').hidden = visible.length > 0 || media.length === 0 && state.mediaFilter === 'all';
  byId('album-filter-empty').textContent = `這裏還未有${state.mediaFilter === 'video' ? '影片' : state.mediaFilter === 'photo' ? '相片' : '回憶'}，故事等我們慢慢放進來。`;
  byId('media-count').textContent = `${visible.length} 個瞬間`;
  for (const button of document.querySelectorAll('[data-media-filter]')) {
    const active = button.dataset.mediaFilter === state.mediaFilter;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  }
}

function renderLetters() {
  const letters = state.memories.filter((memory) => memory.kind === 'letter').sort((a, b) => compareMemoryDates(a, b, 'desc'));
  const fragment = document.createDocumentFragment();
  for (const memory of letters) {
    const card = el('article', 'letter-card memory-expanded');
    card.setAttribute('aria-label', memory.title);
    card.setAttribute('data-memory-id', memory.id);
    const body = el('div', 'entry-body');
    body.append(el('small', '', memoryDateLabel(memory)), el('h3', '', memory.title), el('p', '', memory.note));
    card.append(body);
    const media = memoryMedia(memory);
    if (media) card.append(media);
    fragment.append(card);
  }
  byId('letters-grid').replaceChildren(fragment);
  byId('letters-grid').hidden = letters.length === 0;
  byId('letters-empty').hidden = letters.length !== 0;
}

function showMemory(memory, chosenFile) {
  for (const video of document.querySelectorAll('.memory-media video')) video.pause();
  const dialog = byId('memory-dialog');
  byId('dialog-title').textContent = memory.title;
  byId('dialog-date').textContent = [memoryDateLabel(memory), chapterLabels[memory.chapter], ageLabel(memory.date), kindLabels[memory.kind]].filter(Boolean).join(' · ');
  byId('dialog-note').textContent = memory.note;
  byId('dialog-note').hidden = !memory.note;
  const fragment = document.createDocumentFragment();
  let chosenFigure = null;
  for (const file of memory.media) {
    const figure = el('figure');
    if (file === chosenFile) chosenFigure = figure;
    if (isPhoto(file)) figure.append(photo(file, memory.title, '', false));
    else {
      const video = el('video');
      video.src = file.url;
      video.controls = true;
      video.playsInline = true;
      video.preload = 'metadata';
      video.setAttribute('aria-label', memory.title);
      video.addEventListener('error', () => {
        figure.prepend(el('p', 'media-unavailable', '這段影片暫時未能播放，可試試開啟原檔。'));
      }, { once: true });
      figure.append(video);
    }
    const caption = el('figcaption');
    const original = el('a', '', '開啟原檔');
    original.href = file.url;
    original.target = '_blank';
    original.rel = 'noopener noreferrer';
    caption.append(el('span', '', file.name || (isPhoto(file) ? '珍貴相片' : '珍貴影片')), original);
    figure.append(caption);
    fragment.append(figure);
  }
  byId('dialog-media').replaceChildren(fragment);
  document.body.classList.add('dialog-open');
  dialog.showModal();
  syncHeroSlideshow();
  syncTimelineSlideshows();
  dialog.scrollTop = 0;
  byId('dialog-close').focus({ preventScroll: true });
  if (chosenFigure && memory.media.indexOf(chosenFile) > 0) {
    requestAnimationFrame(() => chosenFigure.scrollIntoView({ block: 'start', behavior: 'instant' }));
  }
}

function renderAll() {
  updateProfile();
  renderCover();
  initHeroSlideshow();
  renderTimeline();
  renderGallery();
  renderLetters();
}

async function load() {
  byId('loading').hidden = false;
  byId('load-error').hidden = true;
  byId('reload').disabled = true;
  try {
    const response = await fetch('./content/memories.json', { cache: 'no-cache' });
    if (!response.ok) throw new Error('Story could not be loaded');
    const skipped = readContent(await response.json());
    if (skipped) {
      byId('load-error-message').textContent = '有部分回憶或相片暫時未能顯示。';
      byId('load-error').hidden = false;
    }
  } catch {
    byId('load-error-message').textContent = '暫時未能讀取回憶，請重新載入；如仍未能開啟，可查看頁尾的使用說明。';
    byId('load-error').hidden = false;
  } finally {
    byId('loading').hidden = true;
    byId('reload').disabled = false;
    renderAll();
  }
}

for (const button of document.querySelectorAll('[data-filter]')) {
  button.addEventListener('click', () => { state.filter = button.dataset.filter; renderTimeline(); });
}
for (const button of document.querySelectorAll('[data-chapter]')) {
  button.addEventListener('click', () => {
    state.filter = button.dataset.chapter;
    renderTimeline();
    byId('story').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  });
}
for (const button of document.querySelectorAll('[data-media-filter]')) {
  button.addEventListener('click', () => { state.mediaFilter = button.dataset.mediaFilter; renderGallery(); });
}
byId('story-sort').addEventListener('change', (event) => { state.sort = event.target.value; renderTimeline(); });
byId('cover-link').addEventListener('click', (event) => {
  if (state.cover) { event.preventDefault(); showMemory(state.cover); }
});
byId('reload').addEventListener('click', load);
byId('dialog-close').addEventListener('click', () => byId('memory-dialog').close());
byId('memory-dialog').addEventListener('click', (event) => {
  if (event.target !== byId('memory-dialog')) return;
  const rect = event.target.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) event.target.close();
});
byId('memory-dialog').addEventListener('close', () => {
  for (const video of byId('dialog-media').querySelectorAll('video')) video.pause();
  byId('dialog-media').replaceChildren();
  document.body.classList.remove('dialog-open');
  syncHeroSlideshow();
  syncTimelineSlideshows();
});
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) updateProfile();
  syncHeroSlideshow();
  syncTimelineSlideshows();
});
setInterval(updateProfile, 60000);
renderAll();
void load();
