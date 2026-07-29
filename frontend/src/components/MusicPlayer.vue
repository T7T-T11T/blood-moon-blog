<template>
  <!-- 全局音乐播放器：底部浮动条，自动循环播放 -->
  <div v-if="musicList.length > 0" class="music-player" :class="{ collapsed: collapsed }">
    <!-- 展开状态：底部播放条 -->
    <template v-if="!collapsed">
      <!-- 播放控制按钮组 -->
      <div class="player-controls">
        <button class="ctrl-btn" :disabled="!musicList.length" title="上一首" @click="prevTrack">
          <el-icon :size="14"><RefreshLeft /></el-icon>
        </button>
        <button
          class="ctrl-btn play-btn"
          :disabled="!musicList.length"
          :title="isPlaying ? '暂停' : '播放'"
          @click="togglePlay"
        >
          <el-icon :size="16">
            <VideoPause v-if="isPlaying" />
            <VideoPlay v-else />
          </el-icon>
        </button>
        <button class="ctrl-btn" :disabled="!musicList.length" title="下一首" @click="nextTrack">
          <el-icon :size="14"><RefreshRight /></el-icon>
        </button>
      </div>

      <!-- 音乐信息 + 音频跳动指示器 -->
      <div class="player-info">
        <div v-if="isPlaying" class="audio-bars"><span></span><span></span><span></span></div>
        <div class="info-text">
          <span class="player-title" :title="currentMusic?.title">
            {{ currentMusic?.title || '暂无音乐' }}
          </span>
          <span v-if="currentMusic?.artist" class="player-artist">— {{ currentMusic.artist }}</span>
        </div>
      </div>

      <!-- 进度条 + 时间 -->
      <div class="player-progress">
        <span class="progress-time">{{ formatTime(currentTime) }}</span>
        <div class="progress-bar" @click="seek">
          <div class="progress-fill" :style="{ width: progressPercent + '%' }"></div>
        </div>
        <span class="progress-time">{{ formatTime(duration) }}</span>
      </div>

      <!-- 收起按钮 -->
      <button class="ctrl-btn collapse-btn" title="收起" @click="collapsed = true">
        <el-icon :size="12"><ArrowDown /></el-icon>
      </button>
    </template>

    <!-- 收起状态：小播放按钮 -->
    <template v-else>
      <button
        class="ctrl-btn play-btn mini-play"
        :title="isPlaying ? '暂停' : '展开播放器'"
        @click="collapsed = false"
      >
        <el-icon :size="16">
          <VideoPause v-if="isPlaying" />
          <VideoPlay v-else />
        </el-icon>
      </button>
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
 * 作用：前台页面底部浮动播放条，自动循环播放
 *
 * 功能特性：
 *   - 自动播放（用户首次交互后生效，解决浏览器自动播放限制）
 *   - 循环播放列表
 *   - 播放/暂停/上一首/下一首控制
 *   - 进度条显示与跳转
 *   - 收起/展开状态
 *   - 音频跳动指示器动画
 */
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import {
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

/** 当前播放音乐对象 */
const currentMusic = computed(() => {
  if (currentIndex.value >= 0 && currentIndex.value < musicList.value.length) {
    return musicList.value[currentIndex.value];
  }
  return null;
});

/** 当前音乐文件URL */
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

/** 当前播放时间（秒） */
const currentTime = ref(0);

/** 音频总时长（秒） */
const duration = ref(0);

/** 进度百分比 */
const progressPercent = computed(() => {
  if (duration.value > 0) {
    return (currentTime.value / duration.value) * 100;
  }
  return 0;
});

/** 是否收起为迷你模式 */
const collapsed = ref(false);

/** 用户是否已交互过（用于解决浏览器自动播放限制） */
const hasUserInteracted = ref(false);

/**
 * 格式化时间为 mm:ss 格式
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
 * 从后端拉取已启用的音乐，初始化播放索引
 */
async function fetchMusicList() {
  try {
    const res = await getMusicList();
    if (res.code === 200 && res.data?.length > 0) {
      musicList.value = res.data;
      // 设置第一首为当前曲目
      if (currentIndex.value === -1 && musicList.value.length > 0) {
        currentIndex.value = 0;
        // 用户已交互过则自动播放
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
 * 浏览器自动播放限制可能导致 play() 失败
 */
async function playCurrent() {
  if (!audioRef.value) return;
  try {
    await audioRef.value.play();
  } catch (e) {
    console.warn('自动播放被阻止，等待用户交互', e);
  }
}

/**
 * 切换播放/暂停状态
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
 * 切换到上一首
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
 * 切换到下一首
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
 * 点击进度条跳转到指定位置
 * @param {MouseEvent} e - 鼠标点击事件
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
 * 音频时间更新回调
 */
function onTimeUpdate() {
  if (audioRef.value) {
    currentTime.value = audioRef.value.currentTime;
  }
}

/**
 * 播放结束回调，自动播放下一首
 */
function onEnded() {
  nextTrack();
}

/**
 * 音频元数据加载完成回调
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
 * 用户首次交互检测
 * 浏览器要求用户必须先与页面交互才能自动播放音频
 */
function handleFirstInteraction() {
  if (!hasUserInteracted.value && musicList.value.length > 0) {
    hasUserInteracted.value = true;
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
  // 添加用户交互监听（解决浏览器自动播放限制）
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
/* ========== 播放器容器 ========== */
.music-player {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 10px 24px;
  background: linear-gradient(180deg, rgba(10, 5, 8, 0.85), rgba(15, 8, 12, 0.95));
  border-top: 1px solid rgba(220, 38, 38, 0.2);
  backdrop-filter: blur(16px);
  box-shadow: 0 -4px 24px rgba(0, 0, 0, 0.4);
  transition: all 0.3s ease;
  animation: player-slide-up 0.5s ease-out;
}

@keyframes player-slide-up {
  from {
    opacity: 0;
    transform: translateY(100%);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 收起状态：右下角小圆按钮 */
.music-player.collapsed {
  left: auto;
  right: 24px;
  bottom: 24px;
  padding: 0;
  border: none;
  background: transparent;
  backdrop-filter: none;
  box-shadow: none;
  border-radius: 50%;
}

/* ========== 控制按钮组 ========== */
.player-controls {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

/* 通用按钮样式 */
.ctrl-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
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

/* 播放按钮：红色主色 */
.play-btn {
  width: 36px;
  height: 36px;
  background: linear-gradient(135deg, #dc2626, #991b1b) !important;
  color: #fff !important;
  box-shadow: 0 0 10px rgba(220, 38, 38, 0.4);
}

.play-btn:hover:not(:disabled) {
  box-shadow: 0 0 16px rgba(220, 38, 38, 0.6);
}

/* 收起状态的迷你播放按钮 */
.mini-play {
  width: 44px;
  height: 44px;
  box-shadow: 0 4px 16px rgba(220, 38, 38, 0.4);
}

/* ========== 音乐信息区 ========== */
.player-info {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex-shrink: 1;
  overflow: hidden;
}

.info-text {
  display: flex;
  align-items: baseline;
  gap: 6px;
  overflow: hidden;
  white-space: nowrap;
}

.player-title {
  font-size: 13px;
  font-weight: 500;
  color: #fff;
  overflow: hidden;
  text-overflow: ellipsis;
}

.player-artist {
  font-size: 11px;
  color: #94a3b8;
  flex-shrink: 0;
}

/* 音频跳动指示器 */
.audio-bars {
  display: flex;
  align-items: flex-end;
  gap: 2px;
  height: 14px;
  flex-shrink: 0;
}

.audio-bars span {
  width: 3px;
  background: #f87171;
  border-radius: 2px;
  animation: audio-bar 0.8s ease-in-out infinite;
}

.audio-bars span:nth-child(1) {
  animation-delay: 0s;
}
.audio-bars span:nth-child(2) {
  animation-delay: 0.2s;
}
.audio-bars span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes audio-bar {
  0%,
  100% {
    height: 4px;
  }
  50% {
    height: 14px;
  }
}

/* ========== 进度条区 ========== */
.player-progress {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
  max-width: 300px;
}

.progress-bar {
  flex: 1;
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  cursor: pointer;
  overflow: hidden;
  transition: height 0.2s ease;
}

.progress-bar:hover {
  height: 6px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #dc2626, #f87171);
  border-radius: 2px;
  transition: width 0.1s linear;
}

.progress-time {
  font-size: 11px;
  color: #64748b;
  min-width: 36px;
  text-align: center;
  flex-shrink: 0;
}

/* 收起按钮 */
.collapse-btn {
  flex-shrink: 0;
}

/* ========== 响应式：移动端 ========== */
@media (max-width: 768px) {
  .music-player {
    padding: 8px 12px;
    gap: 10px;
  }

  .player-progress {
    max-width: 120px;
  }

  .player-artist {
    display: none;
  }

  .progress-time {
    font-size: 10px;
    min-width: 30px;
  }
}

@media (max-width: 480px) {
  .player-progress {
    display: none;
  }

  .player-info {
    flex: 1;
  }
}
</style>
