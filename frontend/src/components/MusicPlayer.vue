<template>
  <!-- 全局音乐播放器：浮动控件，自动循环播放 -->
  <div class="music-player" :class="{ collapsed: collapsed }">
    <!-- 展开状态：显示完整播放器 -->
    <template v-if="!collapsed">
      <!-- 封面 + 动画 -->
      <div class="player-cover" :class="{ spinning: isPlaying }" @click="togglePlay">
        <div class="cover-ring"></div>
        <div class="cover-inner">
          <el-icon :size="24" color="#fff"><Headset /></el-icon>
        </div>
        <div v-if="isPlaying" class="playing-bar"><span></span><span></span><span></span></div>
      </div>

      <!-- 音乐信息 -->
      <div class="player-info">
        <div class="player-title" :title="currentMusic?.title">
          {{ currentMusic?.title || '暂无音乐' }}
        </div>
        <div class="player-artist">{{ currentMusic?.artist || '' }}</div>
      </div>

      <!-- 控制按钮 -->
      <div class="player-controls">
        <button class="ctrl-btn" :disabled="!musicList.length" @click="prevTrack">
          <el-icon :size="14"><RefreshLeft /></el-icon>
        </button>
        <button class="ctrl-btn play-btn" :disabled="!musicList.length" @click="togglePlay">
          <el-icon :size="18">
            <VideoPause v-if="isPlaying" />
            <VideoPlay v-else />
          </el-icon>
        </button>
        <button class="ctrl-btn" :disabled="!musicList.length" @click="nextTrack">
          <el-icon :size="14"><RefreshRight /></el-icon>
        </button>
        <button class="ctrl-btn collapse-btn" title="收起" @click="collapsed = true">
          <el-icon :size="12"><ArrowDown /></el-icon>
        </button>
      </div>

      <!-- 进度条 -->
      <div v-if="currentMusic" class="player-progress">
        <div class="progress-bar" @click="seek">
          <div class="progress-fill" :style="{ width: progressPercent + '%' }"></div>
        </div>
        <span class="progress-time">{{ formatTime(currentTime) }}</span>
      </div>
    </template>

    <!-- 收起状态：只显示小图标 -->
    <template v-else>
      <div class="mini-toggle" @click="collapsed = false">
        <div class="mini-cover" :class="{ spinning: isPlaying }">
          <el-icon :size="16" color="#fff"><Headset /></el-icon>
          <div v-if="isPlaying" class="playing-bar"><span></span><span></span><span></span></div>
        </div>
      </div>
    </template>

    <!-- 隐藏的音频元素 -->
    <audio
      ref="audioRef"
      :src="audioUrl"
      @timeupdate="onTimeUpdate"
      @ended="onEnded"
      @loadedmetadata="onLoadedMetadata"
      @play="isPlaying = true"
      @pause="isPlaying = false"
    ></audio>
  </div>
</template>

<script setup>
/**
 * 全局音乐播放器组件
 * 作用：前台页面固定浮动播放器，自动循环播放
 *
 * 功能特性：
 *   - 自动播放（用户首次交互后生效）
 *   - 循环播放列表
 *   - 播放/暂停控制
 *   - 上一首/下一首
 *   - 进度条显示
 *   - 收起/展开状态
 *   - 旋转封面动画
 */
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import {
  Headset,
  VideoPause,
  VideoPlay,
  RefreshLeft,
  RefreshRight,
  ArrowDown
} from '@element-plus/icons-vue';
import { getMusicList } from '../api/music';

/** 音乐列表 */
const musicList = ref([]);

/** 当前播放索引 */
const currentIndex = ref(-1);

/** 当前播放音乐 */
const currentMusic = computed(() => {
  if (currentIndex.value >= 0 && currentIndex.value < musicList.value.length) {
    return musicList.value[currentIndex.value];
  }
  return null;
});

/** 当前音乐URL */
const audioUrl = computed(() => {
  if (currentMusic.value) {
    return currentMusic.value.file_path;
  }
  return '';
});

/** 音频元素引用 */
const audioRef = ref(null);

/** 是否正在播放 */
const isPlaying = ref(false);

/** 当前播放时间 */
const currentTime = ref(0);

/** 音频总时长 */
const duration = ref(0);

/** 进度百分比 */
const progressPercent = computed(() => {
  if (duration.value > 0) {
    return (currentTime.value / duration.value) * 100;
  }
  return 0;
});

/** 是否收起 */
const collapsed = ref(false);

/** 用户是否已交互过 */
const hasUserInteracted = ref(false);

/**
 * 格式化时间（秒 -> mm:ss）
 * @param {number} sec - 秒数
 * @returns {string} 格式化后的时间字符串
 */
function formatTime(sec) {
  if (!sec || isNaN(sec)) return '00:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * 获取音乐列表
 */
async function fetchMusicList() {
  try {
    const res = await getMusicList();
    if (res.code === 200 && res.data?.length > 0) {
      musicList.value = res.data;
      // 自动播放第一首
      if (currentIndex.value === -1 && musicList.value.length > 0) {
        currentIndex.value = 0;
        // 用户已交互后自动播放
        if (hasUserInteracted.value) {
          nextTick(() => {
            playCurrent();
          });
        }
      }
    }
  } catch (e) {
    console.error('获取音乐列表失败：', e);
  }
}

/**
 * 播放当前音乐
 */
async function playCurrent() {
  if (!audioRef.value) return;
  try {
    await audioRef.value.play();
  } catch (e) {
    // 自动播放被浏览器阻止时的处理
    console.warn('自动播放被阻止，需要用户交互', e);
  }
}

/**
 * 切换播放/暂停
 */
function togglePlay() {
  if (!audioRef.value) return;
  if (audioRef.value.paused) {
    hasUserInteracted.value = true;
    audioRef.value.play();
  } else {
    audioRef.value.pause();
  }
}

/**
 * 上一首
 */
function prevTrack() {
  if (!musicList.value.length) return;
  currentIndex.value =
    currentIndex.value <= 0 ? musicList.value.length - 1 : currentIndex.value - 1;
  nextTick(() => {
    if (hasUserInteracted.value) playCurrent();
  });
}

/**
 * 下一首
 */
function nextTrack() {
  if (!musicList.value.length) return;
  currentIndex.value =
    currentIndex.value >= musicList.value.length - 1 ? 0 : currentIndex.value + 1;
  nextTick(() => {
    if (hasUserInteracted.value) playCurrent();
  });
}

/**
 * 跳转到指定位置
 * @param {MouseEvent} e - 点击事件
 */
function seek(e) {
  if (!audioRef.value || !duration.value) return;
  const rect = e.currentTarget.getBoundingClientRect();
  const percent = (e.clientX - rect.left) / rect.width;
  const time = percent * duration.value;
  audioRef.value.currentTime = time;
  currentTime.value = time;
}

/**
 * 时间更新回调
 */
function onTimeUpdate() {
  if (audioRef.value) {
    currentTime.value = audioRef.value.currentTime;
  }
}

/**
 * 播放结束回调（自动播放下一首）
 */
function onEnded() {
  nextTrack();
}

/**
 * 加载元数据回调
 */
function onLoadedMetadata() {
  if (audioRef.value) {
    duration.value = audioRef.value.duration;
  }
}

/**
 * 监听音频URL变化，自动播放
 */
watch(audioUrl, () => {
  if (audioRef.value && hasUserInteracted.value) {
    nextTick(() => {
      playCurrent();
    });
  }
});

/**
 * 用户首次交互检测：监听全局点击事件
 * 解决浏览器自动播放限制
 */
function handleFirstInteraction() {
  if (!hasUserInteracted.value && musicList.value.length > 0) {
    hasUserInteracted.value = true;
    // 尝试自动播放
    if (currentIndex.value === -1) {
      currentIndex.value = 0;
    }
    nextTick(() => {
      playCurrent();
    });
  }
  // 移除一次性监听
  document.removeEventListener('click', handleFirstInteraction);
  document.removeEventListener('keydown', handleFirstInteraction);
  document.removeEventListener('touchstart', handleFirstInteraction);
}

onMounted(() => {
  fetchMusicList();
  // 添加用户交互监听（解决自动播放限制）
  document.addEventListener('click', handleFirstInteraction);
  document.addEventListener('keydown', handleFirstInteraction);
  document.addEventListener('touchstart', handleFirstInteraction);
});

onUnmounted(() => {
  // 清理事件监听
  document.removeEventListener('click', handleFirstInteraction);
  document.removeEventListener('keydown', handleFirstInteraction);
  document.removeEventListener('touchstart', handleFirstInteraction);
  if (audioRef.value) {
    audioRef.value.pause();
  }
});
</script>

<style scoped>
/* 播放器容器 */
.music-player {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 9999;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 14px 18px;
  background: linear-gradient(135deg, rgba(30, 10, 15, 0.92), rgba(15, 20, 35, 0.92));
  border: 1px solid rgba(220, 38, 38, 0.25);
  border-radius: 50px;
  backdrop-filter: blur(12px);
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.5),
    0 0 20px rgba(220, 38, 38, 0.15);
  transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  animation: player-float-in 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
  min-width: 280px;
}

/* 展开状态动画 */
@keyframes player-float-in {
  from {
    opacity: 0;
    transform: translateY(30px) scale(0.9);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* 收起状态 */
.music-player.collapsed {
  padding: 8px;
  min-width: unset;
  gap: 0;
  cursor: pointer;
}

/* 封面区域 */
.player-cover {
  position: relative;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.cover-ring {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 2px solid rgba(220, 38, 38, 0.4);
  animation: ring-rotate 3s linear infinite;
}

.cover-inner {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: linear-gradient(135deg, #7f1d1d, #dc2626);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 12px rgba(220, 38, 38, 0.5);
  transition: transform 0.3s ease;
}

/* 封面旋转动画 */
.player-cover.spinning .cover-inner {
  animation: cover-spin 4s linear infinite;
}

@keyframes cover-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@keyframes ring-rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* 播放中的音频条动画 */
.playing-bar {
  position: absolute;
  bottom: -6px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 3px;
  align-items: flex-end;
}

.playing-bar span {
  width: 3px;
  height: 4px;
  background: #fca5a5;
  border-radius: 2px;
  animation: bar-bounce 0.8s ease-in-out infinite;
}

.playing-bar span:nth-child(1) {
  animation-delay: 0s;
  height: 6px;
}
.playing-bar span:nth-child(2) {
  animation-delay: 0.2s;
  height: 10px;
}
.playing-bar span:nth-child(3) {
  animation-delay: 0.4s;
  height: 8px;
}

@keyframes bar-bounce {
  0%,
  100% {
    transform: scaleY(0.4);
  }
  50% {
    transform: scaleY(1);
  }
}

/* 音乐信息 */
.player-info {
  display: flex;
  flex-direction: column;
  min-width: 120px;
  max-width: 160px;
}

.player-title {
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.player-artist {
  font-size: 11px;
  color: #94a3b8;
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 控制按钮组 */
.player-controls {
  display: flex;
  align-items: center;
  gap: 4px;
}

.ctrl-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.08);
  color: #e2e8f0;
  cursor: pointer;
  transition: all 0.2s ease;
}

.ctrl-btn:hover:not(:disabled) {
  background: rgba(220, 38, 38, 0.3);
  color: #fff;
  transform: scale(1.1);
}

.ctrl-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.play-btn {
  width: 38px;
  height: 38px;
  background: linear-gradient(135deg, #dc2626, #991b1b) !important;
  color: #fff !important;
  box-shadow: 0 0 12px rgba(220, 38, 38, 0.4);
}

.play-btn:hover:not(:disabled) {
  box-shadow: 0 0 18px rgba(220, 38, 38, 0.6);
}

/* 进度条 */
.player-progress {
  position: absolute;
  bottom: 4px;
  left: 20px;
  right: 20px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.progress-bar {
  flex: 1;
  height: 3px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  cursor: pointer;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #dc2626, #f87171);
  border-radius: 2px;
  transition: width 0.1s linear;
}

.progress-time {
  font-size: 10px;
  color: #64748b;
  min-width: 32px;
  text-align: right;
}

/* 收起状态 */
.mini-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
}

.mini-cover {
  position: relative;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: linear-gradient(135deg, #7f1d1d, #dc2626);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 0 16px rgba(220, 38, 38, 0.4);
  transition: transform 0.3s ease;
}

.mini-cover.spinning {
  animation: cover-spin 4s linear infinite;
}

/* 响应式：移动端调整 */
@media (max-width: 640px) {
  .music-player {
    bottom: 16px;
    right: 16px;
    padding: 10px 14px;
    min-width: 240px;
    gap: 12px;
  }

  .player-info {
    max-width: 100px;
  }

  .progress-time {
    display: none;
  }
}
</style>
