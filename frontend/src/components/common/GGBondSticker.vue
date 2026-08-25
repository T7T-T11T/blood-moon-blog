<template>
  <figure
    class="ggbond-sticker"
    :class="[`size-${size}`, `tone-${currentMood.tone}`, { floating, 'has-caption': caption }]"
    :aria-label="`猪猪侠：${currentMood.label}`"
  >
    <span class="sticker-tape tape-a" aria-hidden="true"></span>
    <span class="sticker-tape tape-b" aria-hidden="true"></span>
    <img :src="currentMood.src" :alt="currentMood.label" loading="lazy" decoding="async" />
    <figcaption v-if="caption">{{ caption === true ? currentMood.label : caption }}</figcaption>
  </figure>
</template>

<script setup>
import { computed } from 'vue';
import { ggbondMoods } from '@/utils/ggbond';

const props = defineProps({
  mood: { type: String, default: 'cool' },
  size: { type: String, default: 'md' },
  caption: { type: [String, Boolean], default: false },
  floating: { type: Boolean, default: false }
});

const currentMood = computed(() => ggbondMoods[props.mood] || ggbondMoods.cool);
</script>

<style scoped>
.ggbond-sticker {
  --sticker-size: 116px;
  position: relative;
  display: inline-grid;
  width: var(--sticker-size);
  margin: 0;
  transform: rotate(-3deg);
  transition: transform 220ms ease;
  z-index: 2;
}

.ggbond-sticker:hover { transform: rotate(2deg) translateY(-5px) scale(1.04); }
.ggbond-sticker img {
  display: block;
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
  background: #fffdf7;
  border: 4px solid #ffffff;
  border-radius: 18px 13px 20px 12px;
  box-shadow: 5px 6px 0 #2f6fa9, 0 15px 28px rgba(74, 111, 143, .2);
}
.size-sm { --sticker-size: 52px; }
.size-lg { --sticker-size: 178px; }
.size-xl { --sticker-size: 230px; }
.sticker-tape { position: absolute; z-index: 1; width: 35%; height: 13px; background: rgba(255, 238, 187, .88); box-shadow: 0 1px 1px rgba(0,0,0,.12); }
.tape-a { top: -4px; left: -9px; transform: rotate(-29deg); }
.tape-b { right: -9px; bottom: -3px; transform: rotate(-29deg); }
figcaption { width: max-content; max-width: 148px; margin: 9px auto 0; padding: 4px 8px; color: #29334a; background: #fffdf7; font: 800 11px/1.2 var(--font-sans, sans-serif); box-shadow: 3px 3px 0 #4f8fdc; }
.floating { position: absolute; animation: sticker-bob 4s ease-in-out infinite; }
.tone-pink img { background: #ffd7e2; }
.tone-peach img { background: #ffd7b8; }
.tone-lemon img { background: #ffe889; }
.tone-sky img { background: #cbeaff; }
.tone-mint img { background: #c9f0dc; }
.tone-lavender img { background: #ddd5ff; }
@keyframes sticker-bob { 50% { transform: rotate(1deg) translateY(-10px); } }
@media (max-width: 640px) { .size-xl { --sticker-size: 150px; } .size-lg { --sticker-size: 116px; } }
</style>
