<template>
  <div class="vditor-editor">
    <div v-if="editorLoading" class="editor-loading">正在准备写作空间…</div>
    <div v-else-if="editorError" class="editor-error">
      <strong>编辑器暂时没有加载成功</strong>
      <span>不会影响你的草稿；点击后重新尝试加载。</span>
      <button type="button" @click="loadEditor">重新加载编辑器</button>
    </div>
    <div ref="editorMount" class="vditor-mount"></div>
    <input ref="imageInput" class="visually-hidden" type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif,image/svg+xml" @change="handleMediaChange($event, 'image')" />
    <input ref="audioInput" class="visually-hidden" type="file" accept="audio/*" @change="handleMediaChange($event, 'audio')" />
    <input ref="videoInput" class="visually-hidden" type="file" accept="video/*" @change="handleMediaChange($event, 'video')" />
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { uploadAudio, uploadImage, uploadVideo } from '@/api/upload';

const props = defineProps({
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: '从这一刻开始记录……' }
});
const emit = defineEmits(['update:modelValue']);

const editorMount = ref(null);
const imageInput = ref(null);
const audioInput = ref(null);
const videoInput = ref(null);
const instance = ref(null);
const editorLoading = ref(true);
const editorError = ref(false);
let applyingExternalValue = false;
let turndown = null;

const limits = { image: 5 * 1024 * 1024, audio: 50 * 1024 * 1024, video: 200 * 1024 * 1024 };
const labels = { image: '图片', audio: '音频', video: '视频' };

function createTurndown(TurndownService) {
  const converter = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced', emDelimiter: '*' });
  // 旧编辑器保存的是 HTML；保留媒体标签，旧文和新插入的音视频都能在前台正确显示。
  converter.addRule('media', {
    filter: ['audio', 'video', 'source'],
    replacement(_content, node) { return `\n\n${node.outerHTML}\n\n`; }
  });
  return converter;
}

function looksLikeHtml(value) {
  return /<\s*\/?[a-z][^>]*>/i.test(value || '');
}

function toMarkdown(value) {
  if (!value || !looksLikeHtml(value)) return value || '';
  if (!turndown) return value;
  try {
    return turndown.turndown(value).trim();
  } catch (error) {
    console.warn('旧文章格式转换失败，将保留原内容：', error);
    return value;
  }
}

function mediaIcon(kind) {
  const icons = {
    image: '<svg viewBox="0 0 24 24"><path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5v-13Zm2 11 3.1-3.2 2.5 2.5 2.7-3.1 3.7 3.8V18H6v-1.5ZM9 8a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z"/></svg>',
    audio: '<svg viewBox="0 0 24 24"><path d="M5 9v6h3l4 3V6L8 9H5Zm10.5 3a3 3 0 0 0-1.5-2.6v5.2a3 3 0 0 0 1.5-2.6Zm0-6.1v2.1a4.5 4.5 0 0 1 0 8v2.1a6.5 6.5 0 0 0 0-12.2Z"/></svg>',
    video: '<svg viewBox="0 0 24 24"><path d="M4.5 6A1.5 1.5 0 0 0 3 7.5v9A1.5 1.5 0 0 0 4.5 18h10a1.5 1.5 0 0 0 1.5-1.5v-2.1l3.6 2.2c.6.4 1.4-.1 1.4-.8V8.2c0-.7-.8-1.2-1.4-.8L16 9.6V7.5A1.5 1.5 0 0 0 14.5 6h-10ZM10 9.5l3.2 2.5-3.2 2.5v-5Z"/></svg>'
  };
  return icons[kind];
}

function chooseMedia(kind) {
  ({ image: imageInput, audio: audioInput, video: videoInput }[kind])?.value?.click();
}

function validateMedia(file, kind) {
  if (!file.type.startsWith(`${kind}/`)) {
    ElMessage.error(`请选择有效的${labels[kind]}文件`);
    return false;
  }
  if (file.size > limits[kind]) {
    ElMessage.error(`${labels[kind]}不能超过 ${Math.round(limits[kind] / 1024 / 1024)}MB`);
    return false;
  }
  return true;
}

async function optimizeImage(file) {
  if (file.size <= 800 * 1024 || ['image/gif', 'image/svg+xml'].includes(file.type) || !window.createImageBitmap) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 2560 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', 0.84));
    return blob && blob.size < file.size
      ? new File([blob], `${file.name.replace(/\.[^.]+$/, '') || 'image'}.webp`, { type: 'image/webp' })
      : file;
  } catch (error) {
    console.warn('图片压缩失败，改用原图上传：', error);
    return file;
  }
}

function escapeAttribute(value) {
  return String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

async function handleMediaChange(event, kind) {
  const file = event.target.files?.[0];
  event.target.value = '';
  if (!file || !validateMedia(file, kind) || !instance.value) return;
  const uploaders = { image: uploadImage, audio: uploadAudio, video: uploadVideo };
  try {
    instance.value.tip(`正在上传${labels[kind]}…`, 0);
    const uploadFile = kind === 'image' ? await optimizeImage(file) : file;
    const result = await uploaders[kind](uploadFile);
    if (result.code !== 200 || !result.data?.url) throw new Error(result.message || '上传失败');
    const url = escapeAttribute(result.data.url);
    const media = kind === 'image'
      ? `![${String(file.name).replaceAll('[', '').replaceAll(']', '')}](${url})`
      : kind === 'audio'
        ? `<audio controls preload="metadata" src="${url}"></audio>`
        : `<video controls preload="metadata" src="${url}"></video>`;
    instance.value.insertValue(`\n\n${media}\n\n`);
    instance.value.tip(`${labels[kind]}已插入`, 1800);
  } catch (error) {
    console.error(`${labels[kind]}上传失败：`, error);
    instance.value.tip(error?.response?.data?.message || error?.message || '上传失败，请重试', 3000);
  }
}

function buildToolbar() {
  return [
    'emoji', 'headings', 'bold', 'italic', 'strike', '|',
    'quote', 'list', 'ordered-list', 'check', '|',
    'link', 'table', 'code', 'inline-code', 'line', '|',
    ...['image', 'audio', 'video'].map((kind) => ({
      name: `blog-${kind}`,
      icon: mediaIcon(kind),
      tip: `插入${labels[kind]}`,
      click: () => chooseMedia(kind)
    })),
    '|', 'undo', 'redo', 'edit-mode', 'both', 'fullscreen', 'outline'
  ];
}

function setEditorValue(value) {
  if (!instance.value) return;
  const markdown = toMarkdown(value);
  if (markdown === instance.value.getValue()) return;
  applyingExternalValue = true;
  instance.value.setValue(markdown, false);
  requestAnimationFrame(() => { applyingExternalValue = false; });
}

async function loadEditor() {
  if (!editorMount.value || instance.value) return;
  editorLoading.value = true;
  editorError.value = false;
  try {
    const [{ default: Vditor }, { default: TurndownService }] = await Promise.all([
      import('vditor'),
      import('turndown'),
      import('vditor/dist/index.css')
    ]);
    turndown = createTurndown(TurndownService);
  let editor;
  editor = new Vditor(editorMount.value, {
    mode: 'wysiwyg',
    lang: 'zh_CN',
    theme: 'classic',
    icon: 'ant',
    minHeight: 520,
    placeholder: props.placeholder,
    toolbar: buildToolbar(),
    toolbarConfig: { pin: true },
    counter: { enable: true, type: 'text' },
    cache: { enable: false },
    preview: { mode: 'editor', markdown: { autoSpace: true, toc: true, codeBlockPreview: true } },
    input(value) {
      if (!applyingExternalValue) emit('update:modelValue', value);
    },
    after() {
      instance.value = editor;
      setEditorValue(props.modelValue);
    }
  });
  } catch (error) {
    console.error('编辑器加载失败：', error);
    editorError.value = true;
  } finally {
    editorLoading.value = false;
  }
}

onMounted(() => {
  loadEditor();
});

watch(() => props.modelValue, (value) => {
  if (instance.value && value !== instance.value.getValue()) setEditorValue(value);
});

onBeforeUnmount(() => {
  instance.value?.destroy();
  instance.value = null;
});

defineExpose({ focus: () => instance.value?.focus() });
</script>

<style scoped>
.vditor-editor { position: relative; min-width: 0; }
.visually-hidden { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; clip-path: inset(50%); }
.editor-loading, .editor-error { display: grid; min-height: 520px; place-content: center; gap: 10px; padding: 28px; border: 1px solid #dfe7dc; border-radius: 18px; background: #fffefa; color: #587166; text-align: center; }
.editor-error strong { color: #7e5658; }
.editor-error span { color: #84938d; font-size: 13px; }
.editor-error button { justify-self: center; padding: 8px 14px; border: 0; border-radius: 10px; background: #e4f1e8; color: #356a55; font: inherit; cursor: pointer; }
:deep(.vditor) { border: 1px solid #dfe7dc; border-radius: 18px; overflow: hidden; background: #fffefa; box-shadow: 0 14px 35px rgba(68, 92, 76, 0.06); }
:deep(.vditor-toolbar) { padding: 9px 12px; background: #f4f8f1; border-bottom: 1px solid #e2eadf; }
:deep(.vditor-toolbar__item button) { border-radius: 9px; }
:deep(.vditor-toolbar__item button:hover), :deep(.vditor-toolbar__item--current button) { background: #dfeee5; color: #356a55; }
:deep(.vditor-reset) { color: #263b38; font-size: 16px; line-height: 1.9; }
:deep(.vditor-wysiwyg), :deep(.vditor-ir), :deep(.vditor-sv) { background: #fffefa; }
:deep(.vditor-counter) { color: #8a9b94; }
:deep(.vditor-resize) { background: #f4f8f1; }
</style>
