<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const invitation = {
  bride: '王婷婷',
  groom: '何绪杰',
  dateLabel: '2026 年 11 月 1 日',
  weekday: '星期日',
  time: '12:08',
  ceremony: '户外证婚仪式',
  banquet: '12:08 午宴',
  venue: '寻山公馆1963',
  address: '长沙市芙蓉区东湖街道滨河路东湖公园Herepark-B栋',
  contact: '184731883882',
  targetDate: '2026-11-01T04:08:00.000Z',
}

const highlights = [
  { label: '日期', value: invitation.dateLabel, meta: invitation.weekday },
  { label: '时间', value: invitation.time, meta: invitation.ceremony },
  { label: '地点', value: invitation.venue, meta: invitation.address },
  { label: '午宴', value: invitation.banquet, meta: '请于仪式前 20 分钟入场' },
]

const schedule = [
  { time: '12:08', title: '宾客签到', detail: '迎宾区合影、领取席位卡' },
  { time: '12:08', title: '证婚仪式', detail: '草坪仪式正式开始' },
  { time: '12:08', title: '合影留念', detail: '亲友分组合影与自由拍照' },
  { time: '12:08', title: '婚礼晚宴', detail: '入席用餐，举杯同庆' },
]

// 01~11 为 3:4 竖图，12 为 4:3 横图，orientation 决定裁切时的取景位置
const photoGallery = [
  { src: '/wedding-1/01.JPG', alt: '新娘手捧花婚纱照', orientation: 'portrait' },
  { src: '/wedding-1/02.jpg', alt: '新人戒指细节照', orientation: 'portrait' },
  { src: '/wedding-1/03.jpg', alt: '新人牵手婚纱照', orientation: 'portrait' },
  { src: '/wedding-1/04.jpg', alt: '户外婚礼仪式照', orientation: 'portrait' },
  { src: '/wedding-1/05.jpg', alt: '婚礼会场窗景', orientation: 'portrait' },
  { src: '/wedding-1/06.jpg', alt: '新人黑白婚纱照', orientation: 'portrait' },
  { src: '/wedding-1/07.jpg', alt: '戒指与花束细节', orientation: 'portrait' },
  { src: '/wedding-1/08.jpg', alt: '新人旅行婚纱照', orientation: 'portrait' },
  { src: '/wedding-1/09.JPG', alt: '新娘捧花近景', orientation: 'portrait' },
  { src: '/wedding-1/10.JPG', alt: '婚礼花亭布置', orientation: 'portrait' },
  { src: '/wedding-1/11.JPG', alt: '新人相依婚纱照', orientation: 'portrait' },
  { src: '/wedding-1/12.JPG', alt: '新人旅行横版合影', orientation: 'landscape' },
]

const now = ref(Date.now())
const targetTime = new Date(invitation.targetDate).getTime()
let timerId

const countdown = computed(() => {
  const diff = Math.max(0, targetTime - now.value)
  const dayMs = 24 * 60 * 60 * 1000
  const hourMs = 60 * 60 * 1000
  const minuteMs = 60 * 1000

  return [
    { label: '天', value: Math.floor(diff / dayMs) },
    { label: '时', value: Math.floor((diff % dayMs) / hourMs) },
    { label: '分', value: Math.floor((diff % hourMs) / minuteMs) },
    { label: '秒', value: Math.floor((diff % minuteMs) / 1000) },
  ]
})

const lightboxIndex = ref(-1)
const lightboxOpen = computed(() => lightboxIndex.value >= 0)
const currentPhoto = computed(() => photoGallery[lightboxIndex.value] ?? null)
let touchStartX = 0

function openPhoto(index) {
  lightboxIndex.value = index
}

function closePhoto() {
  lightboxIndex.value = -1
}

function stepPhoto(delta) {
  const total = photoGallery.length
  lightboxIndex.value = (lightboxIndex.value + delta + total) % total
}

function handleKeydown(event) {
  if (!lightboxOpen.value) return

  if (event.key === 'Escape') closePhoto()
  else if (event.key === 'ArrowRight') stepPhoto(1)
  else if (event.key === 'ArrowLeft') stepPhoto(-1)
}

function handleTouchStart(event) {
  touchStartX = event.changedTouches[0].clientX
}

function handleTouchEnd(event) {
  const deltaX = event.changedTouches[0].clientX - touchStartX
  if (Math.abs(deltaX) > 48) stepPhoto(deltaX < 0 ? 1 : -1)
}

watch(lightboxOpen, (open) => {
  document.body.style.overflow = open ? 'hidden' : ''
})

const audioEl = ref(null)
const isPlaying = ref(false)
const userPaused = ref(false)
let gestureUnlocked = false

async function startMusic() {
  const el = audioEl.value
  if (!el) return false

  try {
    await el.play()
    return true
  } catch {
    return false
  }
}

function toggleMusic() {
  const el = audioEl.value
  if (!el) return

  if (el.paused) {
    userPaused.value = false
    startMusic()
  } else {
    userPaused.value = true
    el.pause()
  }
}

// 浏览器会拦截自动播放，首次点击/触摸页面时再尝试启动
function bindGestureUnlock() {
  if (gestureUnlocked) return
  gestureUnlocked = true

  const unlock = async () => {
    if (userPaused.value) return
    const started = await startMusic()
    if (started) removeUnlock()
  }

  const removeUnlock = () => {
    gestureUnlocked = false
    document.removeEventListener('click', unlock)
    document.removeEventListener('touchstart', unlock)
  }

  document.addEventListener('click', unlock)
  document.addEventListener('touchstart', unlock)
}

onMounted(async () => {
  timerId = window.setInterval(() => {
    now.value = Date.now()
  }, 1000)
  window.addEventListener('keydown', handleKeydown)

  if (audioEl.value) audioEl.value.volume = 0.55
  const started = await startMusic()
  if (!started) bindGestureUnlock()
})

onBeforeUnmount(() => {
  window.clearInterval(timerId)
  window.removeEventListener('keydown', handleKeydown)
  document.body.style.overflow = ''
  audioEl.value?.pause()
})
</script>

<template>
  <main class="wedding-invite">
    <audio
      ref="audioEl"
      src="/wedding-1/bg-music.mp3"
      loop
      preload="auto"
      @play="isPlaying = true"
      @pause="isPlaying = false"
    />

    <button
      type="button"
      class="music-toggle"
      :class="{ 'music-toggle--paused': !isPlaying }"
      :aria-pressed="isPlaying"
      :aria-label="isPlaying ? '暂停背景音乐' : '播放背景音乐'"
      :title="isPlaying ? '暂停背景音乐' : '播放背景音乐'"
      @click="toggleMusic"
    >
      <span class="music-toggle__disc" :class="{ 'is-spinning': isPlaying }" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
          <path d="M9 18V6.5l10-2V16" stroke-linecap="round" stroke-linejoin="round" />
          <circle cx="6.5" cy="18" r="2.5" />
          <circle cx="16.5" cy="16" r="2.5" />
        </svg>
      </span>
    </button>

    <section class="invite-hero" aria-labelledby="invite-title">
      <img
        class="invite-hero__image"
        src="/wedding-1/09.JPG?url"
        alt="婚纱照背景"
      >
      <div class="invite-hero__shade" />
      <div class="invite-hero__content">
        <p class="invite-kicker">Wedding Invitation</p>
        <h1 id="invite-title" class="invite-title">
          {{ invitation.groom }} & {{ invitation.bride }}
        </h1>
        <p class="invite-date">
          {{ invitation.dateLabel }} · {{ invitation.weekday }} · {{ invitation.time }}
        </p>
        <p class="invite-copy">
          我们将在秋日的湖畔许下关于一生的承诺，诚邀你来到现场，见证这段故事进入新的篇章。
        </p>
        <div class="invite-actions" aria-label="主要操作">
          <a href="#details" class="primary-action">查看婚礼信息</a>
          <nav class="invite-nav" aria-label="页面导航">
            <a href="#gallery" class="nav-link">婚纱照</a>
          </nav>
        </div>
      </div>
    </section>

    <section id="details" class="detail-band">
      <div class="section-inner">
        <div class="section-heading">
          <p class="section-kicker">Details</p>
          <h2>婚礼信息</h2>
        </div>
        <div class="detail-grid">
          <article v-for="item in highlights" :key="item.label" class="detail-item">
            <p>{{ item.label }}</p>
            <h3>{{ item.value }}</h3>
            <span>{{ item.meta }}</span>
          </article>
        </div>
      </div>
    </section>

    <section class="countdown-band" aria-label="婚礼倒计时">
      <div class="section-inner countdown-layout">
        <div>
          <p class="section-kicker">Save the Date</p>
          <h2>距离婚礼还有</h2>
        </div>
        <div class="countdown-grid">
          <div v-for="item in countdown" :key="item.label" class="countdown-item">
            <strong>{{ String(item.value).padStart(2, '0') }}</strong>
            <span>{{ item.label }}</span>
          </div>
        </div>
      </div>
    </section>

    <section class="story-band">
      <div class="section-inner story-layout">
        <div class="story-copy">
          <p class="section-kicker">Our Story</p>
          <h2>从相遇到并肩</h2>
          <p>
            在漫长而平凡的日子里遇见彼此，从此所有的日常都有了回音。一起走过的街巷、看过的日落、说过的晚安，慢慢堆成了我们想共度一生的理由。
          </p>
          <p>
            我们没有轰轰烈烈的传奇，只有一份越相处越笃定的心意。往后的岁月里，想把清晨的第一缕光，和深夜的最后一盏灯，都留给同一个人。
          </p>
          <p>
            谨以此日，敬邀你来到现场。愿有花、有风、有亲友的笑声，也有我们最想留下的每一个瞬间——和你一起。
          </p>
        </div>
        <figure class="story-photo">
          <img src="/wedding-1/12.JPG?url" alt="新人旅行婚纱照">
        </figure>
      </div>
    </section>

    <section class="schedule-band">
      <div class="section-inner schedule-layout">
        <div class="section-heading">
          <p class="section-kicker">Timeline</p>
          <h2>当天流程</h2>
        </div>
        <div class="schedule-list">
          <article v-for="item in schedule" :key="item.time" class="schedule-item">
            <time>{{ item.time }}</time>
            <div>
              <h3>{{ item.title }}</h3>
              <p>{{ item.detail }}</p>
            </div>
          </article>
        </div>
      </div>
    </section>

    <section id="gallery" class="gallery-band">
      <div class="section-inner">
        <div class="section-heading section-heading--center">
          <p class="section-kicker">Photos</p>
          <h2>婚纱照相册</h2>
        </div>
        <div class="photo-grid">
          <button
            v-for="(photo, index) in photoGallery"
            :key="photo.src"
            type="button"
            class="photo-tile"
            :class="`photo-tile--${photo.orientation}`"
            :aria-label="`查看大图：${photo.alt}`"
            @click="openPhoto(index)"
          >
            <img :src="photo.src" :alt="photo.alt" loading="lazy" decoding="async">
            <span class="photo-tile__zoom" aria-hidden="true">+</span>
          </button>
        </div>
        <p class="photo-hint">点击任意照片可查看大图</p>
      </div>
    </section>

    <section id="venue" class="venue-band">
      <div class="section-inner venue-layout">
        <div>
          <p class="section-kicker">Venue</p>
          <h2>{{ invitation.venue }}</h2>
          <p>{{ invitation.address }}</p>
        </div>
        <div class="venue-actions">
          <a
            class="primary-action primary-action--dark"
            href="https://map.baidu.com/"
            target="_blank"
            rel="noopener noreferrer"
          >
            打开地图
          </a>
        </div>
      </div>
    </section>

    <footer class="invite-footer">
      <p>{{ invitation.groom }} & {{ invitation.bride }}</p>
      <span>{{ invitation.dateLabel }} · {{ invitation.venue }}</span>
    </footer>

    <Teleport to="body">
      <Transition name="lightbox">
        <div
          v-if="lightboxOpen && currentPhoto"
          class="lightbox"
          role="dialog"
          aria-modal="true"
          aria-label="婚纱照大图预览"
          @click.self="closePhoto"
          @touchstart.passive="handleTouchStart"
          @touchend.passive="handleTouchEnd"
        >
          <button type="button" class="lightbox__close" aria-label="关闭大图" @click="closePhoto">
            ×
          </button>
          <button
            type="button"
            class="lightbox__nav lightbox__nav--prev"
            aria-label="上一张"
            @click="stepPhoto(-1)"
          >
            ‹
          </button>
          <figure class="lightbox__figure">
            <img :src="currentPhoto.src" :alt="currentPhoto.alt">
            <figcaption>
              {{ currentPhoto.alt }}
              <span>{{ lightboxIndex + 1 }} / {{ photoGallery.length }}</span>
            </figcaption>
          </figure>
          <button
            type="button"
            class="lightbox__nav lightbox__nav--next"
            aria-label="下一张"
            @click="stepPhoto(1)"
          >
            ›
          </button>
        </div>
      </Transition>
    </Teleport>
  </main>
</template>

<style scoped>
.wedding-invite {
  min-height: 100vh;
  background: #f8f5f0;
  color: #26302a;
  font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

.music-toggle {
  position: fixed;
  right: 20px;
  bottom: 20px;
  z-index: 1000;
  width: 48px;
  height: 48px;
  display: grid;
  place-items: center;
  padding: 0;
  border: 1px solid rgba(38, 48, 42, 0.16);
  border-radius: 50%;
  background: rgba(255, 253, 248, 0.92);
  color: #26302a;
  cursor: pointer;
  box-shadow: 0 10px 26px rgba(20, 26, 20, 0.18);
  backdrop-filter: blur(10px);
  transition: transform 180ms ease, background 180ms ease;
}

.music-toggle:hover {
  transform: translateY(-2px);
  background: #fffdf8;
}

.music-toggle:focus-visible {
  outline: 2px solid #b79b68;
  outline-offset: 2px;
}

.music-toggle__disc {
  width: 22px;
  height: 22px;
  display: grid;
  place-items: center;
}

.music-toggle__disc svg {
  width: 100%;
  height: 100%;
}

.music-toggle__disc.is-spinning {
  animation: music-spin 3.4s linear infinite;
}

@keyframes music-spin {
  to {
    transform: rotate(360deg);
  }
}

.music-toggle--paused .music-toggle__disc {
  opacity: 0.5;
}

.music-toggle--paused::after {
  content: '';
  position: absolute;
  inset: 0;
  margin: auto;
  width: 26px;
  height: 1.5px;
  border-radius: 2px;
  background: currentColor;
  opacity: 0.6;
  transform: rotate(-45deg);
}

.invite-hero {
  position: relative;
  min-height: 88svh;
  display: flex;
  align-items: flex-end;
  overflow: hidden;
  background: #1f261f;
}

.invite-hero__image {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.invite-hero__shade {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(180deg, rgba(14, 19, 15, 0.22) 0%, rgba(14, 19, 15, 0.82) 100%),
    linear-gradient(90deg, rgba(14, 19, 15, 0.72) 0%, rgba(14, 19, 15, 0.12) 70%);
}

.invite-nav {
  z-index: 3;
  top: 24px;
  left: 24px;
  right: 24px;
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.nav-link,
.primary-action,
.secondary-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: 10px 18px;
  border-radius: 8px;
  letter-spacing: 0;
  transition: transform 180ms ease, background 180ms ease, border-color 180ms ease;
}

.nav-link {
  border: 1px solid rgba(255, 255, 255, 0.3);
  background: rgba(20, 24, 20, 0.26);
  color: #fffaf2;
  backdrop-filter: blur(12px);
}

.nav-link:hover,
.primary-action:hover,
.secondary-action:hover {
  transform: translateY(-1px);
}

.invite-hero__content {
  position: relative;
  z-index: 2;
  width: min(960px, calc(100% - 48px));
  margin: 0 auto;
  padding: 0 0 72px;
  color: #fffaf2;
}

.invite-kicker,
.section-kicker {
  margin: 0 0 12px;
  color: #b79b68;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: uppercase;
}

.invite-title {
  margin: 0;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 5rem;
  font-weight: 400;
  line-height: 1.04;
  letter-spacing: 0;
}

.invite-date {
  margin: 20px 0 0;
  font-size: 1.08rem;
  color: rgba(255, 250, 242, 0.86);
  letter-spacing: 0;
}

.invite-copy {
  max-width: 650px;
  margin: 22px 0 0;
  color: rgba(255, 250, 242, 0.78);
  font-size: 1.05rem;
  line-height: 1.9;
}

.invite-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 34px;
}

.primary-action {
  border: 1px solid #d5b778;
  background: #d5b778;
  color: #20261f;
  font-weight: 700;
}

.secondary-action {
  border: 1px solid rgba(255, 250, 242, 0.42);
  background: rgba(255, 250, 242, 0.08);
  color: #fffaf2;
  font-weight: 700;
}

.primary-action--dark {
  border-color: #26302a;
  background: #26302a;
  color: #fffaf2;
}

.secondary-action--dark {
  border-color: rgba(38, 48, 42, 0.26);
  background: transparent;
  color: #26302a;
}

.section-inner {
  width: min(1120px, calc(100% - 48px));
  margin: 0 auto;
}

.detail-band,
.story-band,
.schedule-band,
.gallery-band,
.venue-band {
  padding: 84px 0;
}

.detail-band {
  background: #f8f5f0;
}

.section-heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 32px;
}

.section-heading--center {
  display: block;
  max-width: 680px;
  margin: 0 auto 34px;
  text-align: center;
}

.section-heading h2,
.story-copy h2,
.countdown-layout h2,
.venue-layout h2 {
  margin: 0;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 2.4rem;
  font-weight: 400;
  line-height: 1.18;
  letter-spacing: 0;
}

.section-heading p:not(.section-kicker),
.story-copy p,
.venue-layout p {
  margin: 14px 0 0;
  color: #657066;
  line-height: 1.85;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
}

.detail-item,
.schedule-item {
  border: 1px solid rgba(75, 86, 75, 0.14);
  border-radius: 8px;
  background: #fffdf8;
}

.detail-item {
  padding: 24px;
}

.detail-item p {
  margin: 0 0 14px;
  color: #9b7c48;
  font-size: 0.82rem;
  font-weight: 700;
}

.detail-item h3 {
  margin: 0;
  color: #26302a;
  font-size: 1.32rem;
  font-weight: 700;
  letter-spacing: 0;
}

.detail-item span {
  display: block;
  margin-top: 10px;
  color: #657066;
  line-height: 1.6;
}

.countdown-band {
  padding: 56px 0;
  background: #26302a;
  color: #fffaf2;
}

.countdown-layout {
  display: grid;
  grid-template-columns: 0.85fr 1.15fr;
  align-items: center;
  gap: 40px;
}

.countdown-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(96px, 1fr));
  gap: 12px;
}

.countdown-item {
  border: 1px solid rgba(255, 250, 242, 0.18);
  border-radius: 8px;
  padding: 22px 16px;
  text-align: center;
  background: rgba(255, 250, 242, 0.06);
}

.countdown-item strong {
  display: block;
  font-size: 2.4rem;
  line-height: 1;
  font-family: Georgia, 'Times New Roman', serif;
  font-weight: 400;
  letter-spacing: 0;
}

.countdown-item span {
  display: block;
  margin-top: 10px;
  color: rgba(255, 250, 242, 0.7);
}

.story-band {
  background: #e8efe4;
}

.story-layout {
  display: grid;
  grid-template-columns: minmax(0, 0.9fr) minmax(320px, 1.1fr);
  align-items: center;
  gap: 48px;
}

.story-copy p {
  font-size: 1.02rem;
}

.story-photo {
  margin: 0;
  aspect-ratio: 5 / 4;
  overflow: hidden;
  border-radius: 8px;
}

.story-photo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.schedule-band {
  background: #fffdf8;
}

.schedule-layout {
  display: grid;
  grid-template-columns: 0.8fr 1.2fr;
  gap: 48px;
}

.schedule-list {
  display: grid;
  gap: 12px;
}

.schedule-item {
  display: grid;
  grid-template-columns: 92px 1fr;
  gap: 18px;
  padding: 22px;
}

.schedule-item time {
  color: #9b7c48;
  font-size: 1.2rem;
  font-family: Georgia, 'Times New Roman', serif;
}

.schedule-item h3 {
  margin: 0;
  font-size: 1.08rem;
  letter-spacing: 0;
}

.schedule-item p {
  margin: 8px 0 0;
  color: #657066;
  line-height: 1.7;
}

.gallery-band {
  background: #f8f5f0;
}

.gallery-band .section-inner {
  width: min(1400px, calc(100% - 48px));
}

.photo-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
}

.photo-tile {
  position: relative;
  display: block;
  margin: 0;
  padding: 0;
  border: 0;
  border-radius: 8px;
  overflow: hidden;
  background: #efe9e0;
  aspect-ratio: 3 / 4;
  cursor: pointer;
}

.photo-tile img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center 30%;
  transition: transform 420ms ease;
}

.photo-tile--landscape img {
  object-position: center;
}

.photo-tile:hover img,
.photo-tile:focus-visible img {
  transform: scale(1.05);
}

.photo-tile:focus-visible {
  outline: 2px solid #b79b68;
  outline-offset: 2px;
}

.photo-tile__zoom {
  position: absolute;
  right: 12px;
  bottom: 12px;
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: rgba(20, 24, 20, 0.42);
  color: #fffaf2;
  font-size: 1.3rem;
  line-height: 1;
  opacity: 0;
  backdrop-filter: blur(6px);
  transition: opacity 200ms ease;
}

.photo-tile:hover .photo-tile__zoom,
.photo-tile:focus-visible .photo-tile__zoom {
  opacity: 1;
}

.photo-hint {
  margin: 22px 0 0;
  color: #657066;
  font-size: 0.9rem;
  text-align: center;
}

.lightbox {
  position: fixed;
  inset: 0;
  z-index: 999;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 24px;
  background: rgba(12, 16, 13, 0.92);
  backdrop-filter: blur(6px);
}

.lightbox__figure {
  margin: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  max-width: min(1100px, 100%);
}

.lightbox__figure img {
  display: block;
  max-width: 100%;
  max-height: 82svh;
  width: auto;
  height: auto;
  object-fit: contain;
  border-radius: 6px;
}

.lightbox__figure figcaption {
  display: flex;
  align-items: center;
  gap: 12px;
  color: rgba(255, 250, 242, 0.82);
  font-size: 0.92rem;
}

.lightbox__figure figcaption span {
  color: #b79b68;
}

.lightbox__close,
.lightbox__nav {
  flex: none;
  display: grid;
  place-items: center;
  border: 1px solid rgba(255, 250, 242, 0.28);
  border-radius: 50%;
  background: rgba(20, 24, 20, 0.4);
  color: #fffaf2;
  cursor: pointer;
  transition: background 180ms ease, transform 180ms ease;
}

.lightbox__close {
  position: absolute;
  top: 20px;
  right: 20px;
  width: 44px;
  height: 44px;
  font-size: 1.6rem;
  line-height: 1;
}

.lightbox__nav {
  width: 48px;
  height: 48px;
  font-size: 2rem;
  line-height: 1;
  padding-bottom: 4px;
}

.lightbox__close:hover,
.lightbox__nav:hover {
  background: rgba(213, 183, 120, 0.9);
  color: #20261f;
  transform: translateY(-1px);
}

.lightbox-enter-active,
.lightbox-leave-active {
  transition: opacity 220ms ease;
}

.lightbox-enter-from,
.lightbox-leave-to {
  opacity: 0;
}

.venue-band {
  background: #d7ddcf;
}

.venue-layout {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
}

.venue-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: flex-end;
}

.invite-footer {
  padding: 36px 24px 42px;
  background: #26302a;
  color: #fffaf2;
  text-align: center;
}

.invite-footer p {
  margin: 0;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 1.8rem;
  letter-spacing: 0;
}

.invite-footer span {
  display: block;
  margin-top: 10px;
  color: rgba(255, 250, 242, 0.66);
}

@media (max-width: 920px) {
  .invite-title {
    font-size: 3.6rem;
  }

  .detail-grid,
  .photo-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .countdown-layout,
  .story-layout,
  .schedule-layout {
    grid-template-columns: 1fr;
  }

  .section-heading {
    display: block;
  }
}

@media (max-width: 620px) {
  .invite-hero {
    min-height: 86svh;
  }

  .invite-nav {
    top: 14px;
    left: 14px;
    right: 14px;
  }

  .nav-link {
    min-height: 40px;
    padding: 8px 12px;
    font-size: 0.88rem;
  }

  .invite-hero__content,
  .section-inner {
    width: min(100% - 32px, 1120px);
  }

  .invite-hero__content {
    padding-bottom: 42px;
  }

  .invite-title {
    font-size: 2.72rem;
  }

  .invite-date,
  .invite-copy {
    font-size: 0.98rem;
  }

  .detail-band,
  .story-band,
  .schedule-band,
  .gallery-band,
  .venue-band {
    padding: 58px 0;
  }

  .section-heading h2,
  .story-copy h2,
  .countdown-layout h2,
  .venue-layout h2 {
    font-size: 2rem;
  }

  .detail-grid,
  .countdown-grid {
    grid-template-columns: 1fr 1fr;
  }

  .music-toggle {
    right: 14px;
    bottom: 14px;
    width: 44px;
    height: 44px;
  }

  .gallery-band .section-inner {
    width: min(100% - 32px, 1400px);
  }

  .photo-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .lightbox {
    padding: 12px;
  }

  .lightbox__figure img {
    max-height: 72svh;
  }

  .lightbox__nav {
    position: absolute;
    bottom: 20px;
    width: 44px;
    height: 44px;
  }

  .lightbox__nav--prev {
    left: 20px;
  }

  .lightbox__nav--next {
    right: 20px;
  }

  .schedule-item {
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .venue-layout {
    display: block;
  }

  .venue-actions {
    justify-content: flex-start;
    margin-top: 22px;
  }
}
</style>
