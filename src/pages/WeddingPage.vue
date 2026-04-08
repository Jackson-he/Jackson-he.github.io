<script setup>
import { ref, onMounted } from 'vue'

const showContent = ref(false)
const hearts = ref([])
const petals = ref([])

onMounted(() => {
  // Stagger content appearance
  setTimeout(() => { showContent.value = true }, 300)

  // Generate floating hearts
  hearts.value = Array.from({ length: 12 }, (_, i) => i)
  // Generate falling petals
  petals.value = Array.from({ length: 30 }, (_, i) => i)
})
</script>

<template>
  <div class="wedding-page">
    <!-- Background gradient -->
    <div class="wedding-bg"></div>

    <!-- Falling petals -->
    <div class="petals-container">
      <span v-for="i in petals" :key="'p' + i" class="petal" :style="{ '--i': i }">❀</span>
    </div>

    <!-- Main content -->
    <div class="wedding-content" :class="{ visible: showContent }">
      <div class="wedding-rings">
        <svg width="80" height="80" viewBox="0 0 100 100" fill="none">
          <circle cx="35" cy="50" r="22" stroke="#d4af37" stroke-width="3" fill="none" opacity="0.9"/>
          <circle cx="65" cy="50" r="22" stroke="#d4af37" stroke-width="3" fill="none" opacity="0.9"/>
          <circle cx="35" cy="50" r="2" fill="#d4af37"/>
          <circle cx="65" cy="50" r="2" fill="#d4af37"/>
        </svg>
      </div>

      <p class="wedding-sub">Wang Ting Ting</p>
      <h1 class="wedding-title">Will You Marry Me?</h1>
      <p class="wedding-message">
        From the moment you came into my life,<br>
        everything changed for the better.<br>
        Every laugh, every tear, every moment with you<br>
        has made me who I am today.<br>
        <br>
        I want to spend forever making you happy.
      </p>

      <div class="wedding-actions">
        <button class="btn-yes" @click="onYes">Yes, I Will!</button>
        <button class="btn-maybe" @click="onMaybe">Hmm, let me think...</button>
      </div>

      <div class="wedding-footer">
        <span class="wedding-date">2026.04.08</span>
      </div>
    </div>

    <!-- Floating hearts background -->
    <div class="floating-hearts">
      <span v-for="i in hearts" :key="'h' + i" class="floating-heart" :style="{ '--i': i }">♥</span>
    </div>

    <!-- Celebration overlay (shown after Yes) -->
    <Transition name="celebrate">
      <div v-if="celebrating" class="celebration">
        <div class="celebration-bg"></div>
        <div class="celebration-content">
          <h1 class="celebrate-title">She Said Yes!</h1>
          <p class="celebrate-sub">Forever and always, Wang Ting Ting & Me</p>
          <div class="celebrate-hearts">
            <span v-for="i in 15" :key="i" class="big-heart" :style="{ '--i': i }">♥</span>
          </div>
        </div>
        <div class="confetti">
          <span v-for="i in 50" :key="'c' + i" class="confetti-piece" :style="{ '--i': i }"></span>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script>
export default {
  data() {
    return {
      celebrating: false,
      maybeCount: 0,
    }
  },
  methods: {
    onYes() {
      this.celebrating = true
    },
    onMaybe() {
      this.maybeCount++
      const yesBtn = document.querySelector('.btn-yes')
      const maybeBtn = document.querySelector('.btn-maybe')
      if (yesBtn && maybeBtn) {
        yesBtn.style.transform = `scale(${1 + this.maybeCount * 0.15})`
        maybeBtn.style.transform = `scale(${Math.max(0.3, 1 - this.maybeCount * 0.12)})`
        if (this.maybeCount >= 5) {
          maybeBtn.textContent = 'OK fine, I mean Yes...'
          maybeBtn.style.opacity = '0.5'
          maybeBtn.onclick = () => this.onYes()
        }
      }
    },
  },
}
</script>

<style scoped>
.wedding-page {
  position: fixed; inset: 0; z-index: 1000;
  display: flex; align-items: center; justify-content: center;
  overflow: hidden;
}
.wedding-bg {
  position: absolute; inset: 0;
  background: linear-gradient(135deg, #0f0508 0%, #1a0a10 30%, #2d1218 60%, #1a0a10 100%);
}

/* Falling petals */
.petals-container { position: absolute; inset: 0; overflow: hidden; pointer-events: none; }
.petal {
  position: absolute;
  font-size: 1.2rem;
  color: rgba(247,197,208,.35);
  top: -20px;
  left: calc(var(--i) * 3.33%);
  animation: petalFall 10s ease-in infinite;
  animation-delay: calc(var(--i) * 0.33s);
}
@keyframes petalFall {
  0%   { transform: translateY(0) rotate(0deg); opacity: 0; }
  5%   { opacity: 0.6; }
  90%  { opacity: 0.1; }
  100% { transform: translateY(110vh) rotate(360deg); opacity: 0; }
}

/* Main content */
.wedding-content {
  position: relative; z-index: 2;
  text-align: center; padding: 24px;
  opacity: 0; transform: translateY(40px);
  transition: opacity 1s ease-out, transform 1s ease-out;
}
.wedding-content.visible {
  opacity: 1; transform: translateY(0);
}

.wedding-rings {
  margin: 0 auto 24px;
  animation: ringGlow 3s ease-in-out infinite;
}
@keyframes ringGlow {
  0%, 100% { filter: drop-shadow(0 0 8px rgba(212,175,55,.3)); }
  50% { filter: drop-shadow(0 0 20px rgba(212,175,55,.6)); }
}

.wedding-sub {
  margin: 0; font-family: 'Georgia', 'Times New Roman', serif;
  font-style: italic; font-size: 1.1rem;
  color: #c9a96e; letter-spacing: 0.18em;
  margin-bottom: 12px;
}
.wedding-title {
  margin: 0 0 28px; font-family: 'Georgia', 'Times New Roman', serif;
  font-size: clamp(2.2rem, 7vw, 4.2rem); font-weight: 400;
  color: #f7c5d0; line-height: 1.2;
  text-shadow: 0 0 60px rgba(247,197,208,.25);
  letter-spacing: 0.02em;
}
.wedding-message {
  margin: 0 auto 44px; max-width: 500px;
  font-size: 0.95rem; line-height: 1.9;
  color: rgba(247,197,208,.5);
  font-style: italic;
}

.wedding-actions {
  display: flex; gap: 20px; justify-content: center; align-items: center;
  flex-wrap: wrap; margin-bottom: 48px;
}
.btn-yes {
  padding: 18px 52px; border: none; border-radius: 50px;
  background: linear-gradient(135deg, #c9a96e, #e8c88a);
  color: #1a0a10; font-size: 1.15rem; font-weight: 600;
  letter-spacing: 0.08em; cursor: pointer;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  box-shadow: 0 4px 24px rgba(201,169,110,.4);
}
.btn-yes:hover {
  transform: scale(1.05);
  box-shadow: 0 6px 32px rgba(201,169,110,.6);
}
.btn-maybe {
  user-select: none;
  padding: 12px 28px; border: 1px solid rgba(247,197,208,.15);
  border-radius: 50px; background: transparent;
  color: rgba(247,197,208,.3); font-size: 0.82rem;
  cursor: pointer; transition: transform 0.3s ease, opacity 0.3s ease;
}
.btn-maybe:hover {
  color: rgba(247,197,208,.5);
}

.wedding-footer {
  border-top: 1px solid rgba(201,169,110,.15);
  padding-top: 20px;
}
.wedding-date {
  font-family: 'Georgia', serif;
  font-size: 0.85rem; color: rgba(201,169,110,.4);
  letter-spacing: 0.15em;
}

/* Floating hearts */
.floating-hearts { position: absolute; inset: 0; pointer-events: none; overflow: hidden; }
.floating-heart {
  position: absolute;
  font-size: 1.4rem;
  color: rgba(232,67,106,.15);
  bottom: -20px;
  left: calc(var(--i) * 8.33%);
  animation: floatUp 8s ease-in-out infinite;
  animation-delay: calc(var(--i) * 0.67s);
}
@keyframes floatUp {
  0%   { transform: translateY(0) scale(1); opacity: 0; }
  10%  { opacity: 0.3; }
  90%  { opacity: 0.05; }
  100% { transform: translateY(-110vh) scale(0.5); opacity: 0; }
}

/* Celebration screen */
.celebration {
  position: fixed; inset: 0; z-index: 2000;
  display: flex; align-items: center; justify-content: center;
  overflow: hidden;
}
.celebration-bg {
  position: absolute; inset: 0;
  background: radial-gradient(ellipse at center, #2d1218 0%, #0f0508 100%);
}
.celebration-content {
  position: relative; z-index: 2; text-align: center;
}
.celebrate-title {
  font-family: 'Georgia', serif;
  font-size: clamp(2.5rem, 8vw, 5rem);
  font-weight: 400; color: #e8c88a;
  text-shadow: 0 0 40px rgba(232,200,138,.3);
  margin: 0 0 16px;
}
.celebrate-sub {
  font-family: 'Georgia', serif;
  font-style: italic; font-size: 1.1rem;
  color: rgba(247,197,208,.6);
  margin: 0 0 40px;
}
.celebrate-hearts {
  display: flex; justify-content: center; gap: 12px; flex-wrap: wrap;
  max-width: 500px; margin: 0 auto;
}
.big-heart {
  font-size: 2rem; color: #e8436a;
  animation: pulse 1.5s ease-in-out infinite;
  animation-delay: calc(var(--i) * 0.1s);
}
@keyframes pulse {
  0%, 100% { transform: scale(1); opacity: 0.6; }
  50% { transform: scale(1.3); opacity: 1; }
}

/* Confetti */
.confetti { position: absolute; inset: 0; overflow: hidden; pointer-events: none; }
.confetti-piece {
  position: absolute;
  width: 8px; height: 8px;
  top: -10px;
  left: calc(var(--i) * 2%);
  background: hsl(calc(var(--i) * 25), 80%, 70%);
  border-radius: 2px;
  animation: confettiFall 4s ease-in infinite;
  animation-delay: calc(var(--i) * 0.08s);
}
@keyframes confettiFall {
  0%   { transform: translateY(0) rotate(0deg); opacity: 1; }
  100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
}

/* Transitions */
.celebrate-enter-active { animation: fadeInUp 0.8s ease-out both; }
.celebrate-enter-from { opacity: 0; }
</style>
