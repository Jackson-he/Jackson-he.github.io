<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

const invitation = {
  bride: '林予安',
  groom: '何以辰',
  dateLabel: '2026 年 10 月 18 日',
  weekday: '星期日',
  time: '16:30',
  ceremony: '户外证婚仪式',
  banquet: '18:30 晚宴',
  venue: '云栖湖畔礼堂',
  address: '杭州市西湖区云栖路 88 号',
  contact: '138 0000 0000',
  targetDate: '2026-10-18T16:30:00+08:00',
}

const highlights = [
  { label: '日期', value: invitation.dateLabel, meta: invitation.weekday },
  { label: '时间', value: invitation.time, meta: invitation.ceremony },
  { label: '地点', value: invitation.venue, meta: invitation.address },
  { label: '晚宴', value: invitation.banquet, meta: '请于仪式前 20 分钟入场' },
]

const schedule = [
  { time: '15:50', title: '宾客签到', detail: '迎宾区合影、领取席位卡' },
  { time: '16:30', title: '证婚仪式', detail: '草坪仪式正式开始' },
  { time: '17:20', title: '合影留念', detail: '亲友分组合影与自由拍照' },
  { time: '18:30', title: '婚礼晚宴', detail: '入席用餐，举杯同庆' },
]

const photoGallery = [
  { src: '/wedding/photo-01.jpg', alt: '新娘手捧花婚纱照', size: 'large' },
  { src: '/wedding/photo-02.jpg', alt: '新人戒指细节照', size: 'small' },
  { src: '/wedding/photo-03.jpg', alt: '新人牵手婚纱照', size: 'small' },
  { src: '/wedding/photo-04.jpg', alt: '户外婚礼仪式照', size: 'wide' },
  { src: '/wedding/photo-05.jpg', alt: '婚礼会场窗景', size: 'tall' },
  { src: '/wedding/photo-06.jpg', alt: '新人黑白婚纱照', size: 'tall' },
  { src: '/wedding/photo-07.jpg', alt: '戒指与花束细节', size: 'small' },
  { src: '/wedding/photo-08.jpg', alt: '新人旅行婚纱照', size: 'wide' },
  { src: '/wedding/photo-09.jpg', alt: '婚礼标识细节', size: 'small' },
  { src: '/wedding/photo-10.jpg', alt: '新娘捧花近景', size: 'tall' },
  { src: '/wedding/photo-11.jpg', alt: '婚礼花亭布置', size: 'wide' },
  { src: '/wedding/photo-12.jpg', alt: '山野新人婚纱照', size: 'wide' },
  { src: '/wedding/photo-13.jpg', alt: '草坪宴会桌椅', size: 'small' },
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

onMounted(() => {
  timerId = window.setInterval(() => {
    now.value = Date.now()
  }, 1000)
})

onBeforeUnmount(() => {
  window.clearInterval(timerId)
})
</script>

<template>
  <main class="wedding-invite">
    <section class="invite-hero" aria-labelledby="invite-title">
      <img
        class="invite-hero__image"
        src="/wedding/photo-01.jpg"
        alt="婚纱照背景"
      >
      <div class="invite-hero__shade" />
      <nav class="invite-nav" aria-label="页面导航">
        <RouterLink to="/" class="nav-link">返回首页</RouterLink>
        <a href="#gallery" class="nav-link">婚纱照</a>
      </nav>
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
          <a :href="`tel:${invitation.contact.replaceAll(' ', '')}`" class="secondary-action">联系新人</a>
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
            这些文字只是示例。你可以在这里写你们的相识、旅行、求婚、共同生活中的小片段，让收到请帖的人在翻看照片时，也读到属于你们的故事。
          </p>
          <p>
            愿那天有花、有风、有亲友的笑声，也有你们最想留下的每一个瞬间。
          </p>
        </div>
        <figure class="story-photo">
          <img src="/wedding/photo-08.jpg" alt="新人旅行婚纱照">
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
          <p>先放一组占位照片，后续替换成真实照片即可。</p>
        </div>
        <div class="photo-grid">
          <figure
            v-for="photo in photoGallery"
            :key="photo.src"
            class="photo-tile"
            :class="`photo-tile--${photo.size}`"
          >
            <img :src="photo.src" :alt="photo.alt" loading="lazy">
          </figure>
        </div>
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
          <a :href="`tel:${invitation.contact.replaceAll(' ', '')}`" class="secondary-action secondary-action--dark">
            RSVP
          </a>
        </div>
      </div>
    </section>

    <footer class="invite-footer">
      <p>{{ invitation.groom }} & {{ invitation.bride }}</p>
      <span>{{ invitation.dateLabel }} · {{ invitation.venue }}</span>
    </footer>
  </main>
</template>

<style scoped>
.wedding-invite {
  min-height: 100vh;
  background: #f8f5f0;
  color: #26302a;
  font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
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
  object-fit: cover;
}

.invite-hero__shade {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(180deg, rgba(14, 19, 15, 0.22) 0%, rgba(14, 19, 15, 0.82) 100%),
    linear-gradient(90deg, rgba(14, 19, 15, 0.72) 0%, rgba(14, 19, 15, 0.12) 70%);
}

.invite-nav {
  position: absolute;
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

.photo-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-auto-rows: 170px;
  grid-auto-flow: dense;
  gap: 12px;
}

.photo-tile {
  margin: 0;
  overflow: hidden;
  border-radius: 8px;
  background: #ddd5ca;
}

.photo-tile--large {
  grid-column: span 2;
  grid-row: span 2;
}

.photo-tile--wide {
  grid-column: span 2;
}

.photo-tile--tall {
  grid-row: span 2;
}

.photo-tile img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 420ms ease;
}

.photo-tile:hover img {
  transform: scale(1.04);
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

  .photo-grid {
    grid-auto-rows: 150px;
  }

  .photo-tile--large,
  .photo-tile--wide,
  .photo-tile--tall {
    grid-column: span 1;
    grid-row: span 1;
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
