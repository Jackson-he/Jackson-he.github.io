<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const productImages = ref(['/ring-detail.jpg', '/ring-main.jpg', '/ring-side.jpg', '/ring-plain.jpg'])
const activeImage = ref(0)

const ringOverlays = ref([
  '/ring-detail-transparent.png',
  '/ring-main-transparent.png',
  '/ring-side-transparent.png',
  '/ring-plain-transparent.png',
])

// Background colors extracted from each product image
const bgColors = ref(['#efefea', '#f2f1ed', '#f2f1ed', '#f2f1ed'])
const activeBg = computed(() => bgColors.value[activeImage.value])

// Ring center position as percentage (center of each image)
const ringCenters = ref([
  { x: 50, y: 50 },
  { x: 50, y: 50 },
  { x: 50, y: 50 },
  { x: 50, y: 50 },
])
const activeCenter = computed(() => ringCenters.value[activeImage.value])

// --- drag ---
const dragging = ref(false)
const bgOpacity = ref(1) // fades as ring is pulled away
const wishSelected = ref(false) // ring is draggable only when wishlist is toggled
const dx = ref(0)
const dy = ref(0)
let dragStart = { x: 0, y: 0 }
let dragOff = { x: 0, y: 0 }
let moved = false

const fadeThreshold = 12  // px before bg starts fading
const fadeMaxDist   = 160 // px where bg is fully transparent

function wishToggle() {
  wishSelected.value = !wishSelected.value
  if (!wishSelected.value) {
    // Reset ring position when deselected
    dx.value = 0; dy.value = 0; bgOpacity.value = 1; dragging.value = false
  }
}

function onDown(e) {
  if (!wishSelected.value) return
  dragging.value = true; bgOpacity.value = 1; moved = false
  dragStart = {
    x: e.touches?.[0]?.clientX ?? e.clientX,
    y: e.touches?.[0]?.clientY ?? e.clientY,
  }
  dragOff = { x: dx.value, y: dy.value }
  // Bind to window so mousemove works even when cursor leaves element's bounding box
  const isTouch = e.type === 'touchstart'
  if (isTouch) {
    window.addEventListener('touchmove', onMove, { passive: false })
    window.addEventListener('touchend', onUp)
    window.addEventListener('touchcancel', onUp)
  } else {
    e.preventDefault()
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }
}

function onMove(e) {
  if (!dragging.value) return
  const x = e.touches?.[0]?.clientX ?? e.clientX
  const y = e.touches?.[0]?.clientY ?? e.clientY
  if (Math.abs(x - dragStart.x) > 3 || Math.abs(y - dragStart.y) > 3) moved = true
  dx.value = dragOff.x + (x - dragStart.x)
  dy.value = dragOff.y + (y - dragStart.y)
  const dist = Math.sqrt(dx.value ** 2 + dy.value ** 2)
  bgOpacity.value = dist <= fadeThreshold ? 1 : 0
}

function onUp() {
  window.removeEventListener('mousemove', onMove)
  window.removeEventListener('mouseup', onUp)
  window.removeEventListener('touchmove', onMove)
  window.removeEventListener('touchend', onUp)
  window.removeEventListener('touchcancel', onUp)
  dragging.value = false
}

function onTitleClick() {
  const dist = Math.sqrt(dx.value ** 2 + dy.value ** 2)
  if (dist >= fadeMaxDist) {
    router.push('/wedding')
  }
}

function animateBack() {
  const dur   = 450
  const start = performance.now()
  const fromDx = dx.value, fromDy = dy.value
  const fromBg = bgOpacity.value
  function step(now) {
    const t    = Math.min((now - start) / dur, 1)
    const ease = 1 - Math.pow(1 - t, 3)
    dx.value      = fromDx * (1 - ease)
    dy.value      = fromDy * (1 - ease)
    bgOpacity.value = 1 - (1 - fromBg) * (1 - ease)
    if (t < 1) requestAnimationFrame(step)
    else { dx.value = 0; dy.value = 0; bgOpacity.value = 1; dragging.value = false }
  }
  requestAnimationFrame(step)
}

function switchImg(i) {
  activeImage.value = i
  dx.value = 0; dy.value = 0; bgOpacity.value = 1; dragging.value = false
}
</script>

<template>
  <div class="cartier-page">
    <header class="header">
      <button class="hdr-btn"><b/><b/><b/></button>
      <button class="hdr-btn">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
          <circle cx="11" cy="11" r="7"/><path d="M16.5 16.5L21 21"/>
        </svg>
      </button>
      <a href="#" class="logo">Cartier</a>
      <button class="hdr-btn">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/>
        </svg>
      </button>
      <button class="hdr-btn">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
          <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 01-8 0"/>
        </svg>
      </button>
    </header>

    <nav class="breadcrumb">
      <a href="#">Home</a><span>/</span><a href="#">Jewelry</a><span>/</span><a href="#">Wedding Bands</a><span>/</span><span class="breadcrumb--cur">Love</span>
    </nav>

    <main class="product">
      <div class="gallery">
        <!-- Image area: bg color + photo + ring overlay -->
        <div class="img-wrap" :style="{ '--bg': activeBg }">
          <!-- Background photo — fades out as ring is pulled away -->
          <img
            class="bg"
            :style="{ opacity: bgOpacity }"
            :src="productImages[activeImage]"
            alt="LOVE ring"
            draggable="false"
          />
        </div>

        <!-- Draggable transparent ring overlay (PNG with alpha channel) -->
        <img
          class="ring-fly"
          :class="{ drag: dragging, active: wishSelected }"
          :src="ringOverlays[activeImage]"
          alt=""
          draggable="false"
          :style="{
            transform: `translate(${dx}px, ${dy}px)`,
          }"
          @mousedown="onDown"
          @touchstart="onDown"
        />

        <!-- Thumbs -->
        <div class="thumbs">
          <button v-for="(img, i) in productImages" :key="i"
            :class="['thumb', { on: i === activeImage }]" @click="switchImg(i)">
            <img :src="img" alt=""/>
          </button>
        </div>
      </div>

      <div class="info">
        <h1 class="title" @click="onTitleClick">LOVE Ring, Small Model, 1 Diamond</h1>
        <p class="desc">The LOVE collection began with the iconic bracelet created in New York in 1969. An ode to love in its most contemporary form, the collection features a circular motif and screw details that are as modern today as when they were first imagined.</p>
        <p class="price">$2,640</p>
        <div class="actions">
          <button class="add" disabled>Add to Bag</button>
          <button class="wish" :class="{ on: wishSelected }" aria-label="Wishlist" @click="wishToggle">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
          </button>
        </div>
        <!-- <p class="hint">拖动戒指到任意位置</p> -->
      </div>
    </main>
  </div>
</template>

<style scoped>
.cartier-page { max-width:100%; min-height:100vh; background:#fff; color:#181818; font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif }
.header { display:flex; align-items:center; justify-content:space-between; padding:16px 24px; border-bottom:1px solid #e8e8e8; background:#fff; position:sticky; top:0; z-index:10 }
.hdr-btn { display:inline-flex; flex-direction:column; justify-content:center; width:36px; height:36px; border:none; background:transparent; color:#181818; cursor:pointer; border-radius:50%; transition:background .2s }
.hdr-btn:hover { background:rgba(0,0,0,.04) }
.hdr-btn b { display:block; width:16px; height:1.5px; background:#181818; margin:3px 0 }
.logo { font-family:'Georgia','Times New Roman',serif; font-style:italic; font-size:1.6rem; color:#181818; text-decoration:none }
.breadcrumb { padding:16px 24px; font-size:.78rem; font-weight:500; letter-spacing:.1em; text-transform:uppercase; color:#888; display:flex; flex-wrap:wrap; gap:4px 8px; align-items:center }
.breadcrumb a { color:#888; text-decoration:none }
.breadcrumb a:hover { color:#181818 }
.breadcrumb span { color:#c0c0c0 }
.breadcrumb--cur { color:#181818 }
.product { display:flex; max-width:1100px; margin:0 auto; padding:0 24px 60px; gap:4px }

/* Gallery */
.gallery {
  flex:1 1 520px; max-width:600px;
  display:flex; flex-direction:column; gap:16px;
  position:relative;
}

/* Image wrapper — bg color is underneath the photo */
.img-wrap {
  flex-shrink: 0;
  width:100%; aspect-ratio:1/1;
  border-radius:12px; overflow:hidden;
  position:relative; background:var(--bg);
}

/* Static background photo — fades to reveal --bg underneath */
.bg {
  position:absolute; inset:0;
  width:100%; height:100%; object-fit:cover;
  display:block; user-select:none; -webkit-user-drag:none;
  pointer-events:none;
  transition: opacity 0.15s ease-out;
}

/* Draggable transparent ring overlay */
.ring-fly {
  position:absolute;
  left:0; top:0;
  width:100%;
  /* height:100%; */
  object-fit:cover;
  z-index:5;
  cursor:grab;
  user-select:none;
  -webkit-user-select:none;
  touch-action:none;
  pointer-events:auto;
}
.ring-fly.drag {
  z-index:10; cursor:grabbing;
  filter:drop-shadow(0 6px 20px rgba(0,0,0,.15));
}
.ring-fly.active {
  pointer-events: auto;
}
.ring-fly:not(.active) {
  cursor: default;
  pointer-events: none;
}

/* Thumbs */
.thumbs { display:flex; gap:10px; overflow-x:auto; padding-bottom:4px;flex-shrink: 0; }
.thumb { flex-shrink:0; width:64px; height:64px; border:2px solid transparent; border-radius:8px; overflow:hidden; background:transparent; cursor:pointer; padding:0; opacity:.55; transition:opacity .2s,border-color .2s }
.thumb.on { opacity:1; border-color:#181818 }
.thumb img { width:100%; height:100%; object-fit:cover }

/* Info */
.info { flex:1 1 340px; max-width:440px; display:flex; flex-direction:column; gap:20px; align-self:start; padding-top:8px }
.title { margin:0; font-size:1.55rem; font-weight:600; letter-spacing:.02em; text-transform:uppercase; line-height:1.25 }
.desc { margin:0; font-size:.9rem; line-height:1.78; color:#555 }
.price { margin:0; font-size:1.2rem; font-weight:600 }
.actions { display:flex; gap:12px; margin-top:8px }
.add { flex:1; padding:16px 24px; border:none; border-radius:6px; background:#e8e8e8; color:#999; font-size:.88rem; font-weight:500; letter-spacing:.1em; text-transform:uppercase; cursor:not-allowed }
.wish { display:inline-flex; align-items:center; justify-content:center; width:56px; height:56px; border:1.5px solid #181818; border-radius:6px; background:transparent; color:#181818; cursor:pointer; transition:background .2s,color .2s,border-color .2s }
.wish.on { background:#181818; color:#fff; border-color:#181818 }
.wish:hover { background:#181818; color:#fff }
.hint { margin:0; font-size:.82rem; color:#aaa }

@media(max-width:768px) {
  .header { padding:12px 16px }
  .breadcrumb { padding:12px 16px; font-size:.7rem }
  .product { flex-direction:column; padding:0 16px 40px; gap: 4px }
  .gallery { flex:none; max-width:100% }
  .info { flex:none; max-width:100% }
  .title { font-size:1.3rem }
}

</style>
