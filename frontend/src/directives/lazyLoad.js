/**
 * v-lazy 图片懒加载指令
 *
 * 用法：
 *   <img v-lazy="imageUrl" />
 *   <div v-lazy:bg="imageUrl"></div>  背景图懒加载
 *
 * 基于 IntersectionObserver，图片进入视口时才加载。
 * 加载前显示透明占位，加载后淡入显示。
 */

const observerMap = new WeakMap();
let globalObserver = null;

function getObserver() {
  if (!globalObserver) {
    globalObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const el = entry.target;
            const handlers = observerMap.get(el);
            if (handlers) {
              handlers.load();
              globalObserver.unobserve(el);
              observerMap.delete(el);
            }
          }
        });
      },
      {
        rootMargin: '200px 0px',
        threshold: 0.01
      }
    );
  }
  return globalObserver;
}

function loadImage(el, src) {
  const img = new Image();
  img.onload = () => {
    el.src = src;
    el.classList.add('lazy-loaded');
    el.style.opacity = '1';
  };
  img.onerror = () => {
    // 加载失败：保留占位
    el.classList.add('lazy-error');
  };
  img.src = src;
}

function loadBackground(el, src) {
  const img = new Image();
  img.onload = () => {
    el.style.backgroundImage = `url(${src})`;
    el.classList.add('lazy-loaded');
  };
  img.onerror = () => {
    el.classList.add('lazy-error');
  };
  img.src = src;
}

export default {
  mounted(el, binding) {
    const src = binding.value;
    if (!src) return;

    // 初始状态：透明占位
    el.style.opacity = '0';
    el.style.transition = 'opacity 0.4s ease';

    // 判断是否为背景图模式
    const isBackground = binding.arg === 'bg';

    const handlers = {
      load: () => {
        if (isBackground) {
          loadBackground(el, src);
        } else {
          loadImage(el, src);
        }
      }
    };

    observerMap.set(el, handlers);
    getObserver().observe(el);
  },

  unmounted(el) {
    const observer = getObserver();
    observer.unobserve(el);
    observerMap.delete(el);
  }
};
