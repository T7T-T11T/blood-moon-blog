import cool from '@/assets/ggbond/cool-jacket.jpg';
import scream from '@/assets/ggbond/scream.jpg';
import confused from '@/assets/ggbond/confused.jpg';
import sly from '@/assets/ggbond/sly.jpg';
import heartEyes from '@/assets/ggbond/heart-eyes.jpg';
import leaving from '@/assets/ggbond/leaving.jpg';
import exhausted from '@/assets/ggbond/exhausted.jpg';
import smileWorld from '@/assets/ggbond/smile-world.jpg';
import teary from '@/assets/ggbond/teary.jpg';
import late from '@/assets/ggbond/late.jpg';
import princess from '@/assets/ggbond/princess.jpg';
import fishing from '@/assets/ggbond/fishing.jpg';
import grumpy from '@/assets/ggbond/grumpy.jpg';
import iceWalk from '@/assets/ggbond/ice-walk.gif';
import tongue from '@/assets/ggbond/tongue.gif';
import underwater from '@/assets/ggbond/underwater.gif';
import beeKing from '@/assets/ggbond/bee-king.gif';
import spinWalk from '@/assets/ggbond/spin-walk.gif';
import sausage from '@/assets/ggbond/sausage.gif';
import rainLeaf from '@/assets/ggbond/rain-leaf.gif';
import intro from '@/assets/ggbond/intro.gif';
import upsideDown from '@/assets/ggbond/upside-down.gif';
import sleeping from '@/assets/ggbond/sleeping.gif';
import happyWave from '@/assets/ggbond/happy-wave.gif';
import floorRoll from '@/assets/ggbond/floor-roll.gif';

/**
 * 猪猪侠不是一张横幅，而是站点的「情绪系统」。
 * 页面可以按语境取用不同角色，避免所有页面重复同一张图。
 */
export const ggbondMoods = {
  cool: { src: cool, label: '今天穿得很正式', tone: 'sky' },
  scream: { src: scream, label: '啊？还能这样', tone: 'lemon' },
  confused: { src: confused, label: '让我想一下', tone: 'mint' },
  sly: { src: sly, label: '我好像懂了', tone: 'peach' },
  heartEyes: { src: heartEyes, label: '这篇有点喜欢', tone: 'pink' },
  leaving: { src: leaving, label: '我先溜一步', tone: 'lemon' },
  exhausted: { src: exhausted, label: '真的加载不动了', tone: 'lavender' },
  smileWorld: { src: smileWorld, label: '今天也要笑脸相迎', tone: 'mint' },
  teary: { src: teary, label: '看得有点感动', tone: 'sky' },
  late: { src: late, label: '臣来迟了', tone: 'peach' },
  princess: { src: princess, label: '公主也来逛博客', tone: 'pink' },
  fishing: { src: fishing, label: '这里暂时没钓到内容', tone: 'sky' },
  grumpy: { src: grumpy, label: '今天就会阴阳怪气', tone: 'lavender' },
  iceWalk: { src: iceWalk, label: '沿着时间线散步', tone: 'sky' },
  tongue: { src: tongue, label: '调皮一下', tone: 'peach' },
  underwater: { src: underwater, label: '潜入话题海洋', tone: 'sky' },
  beeKing: { src: beeKing, label: '蜂王驾到', tone: 'lemon' },
  spinWalk: { src: spinWalk, label: '数据正在转圈赶来', tone: 'mint' },
  sausage: { src: sausage, label: '闻到新文章了', tone: 'peach' },
  rainLeaf: { src: rainLeaf, label: '下雨也要继续逛', tone: 'mint' },
  intro: { src: intro, label: '我是 Bond，GG Bond', tone: 'lemon' },
  upsideDown: { src: upsideDown, label: '换个角度找分类', tone: 'lavender' },
  sleeping: { src: sleeping, label: '页脚先睡一步', tone: 'pink' },
  happyWave: { src: happyWave, label: '交个朋友吧', tone: 'mint' },
  floorRoll: { src: floorRoll, label: '这路怎么走歪了', tone: 'lavender' }
};

export const ggbondMoodList = Object.entries(ggbondMoods).map(([key, value]) => ({ key, ...value }));

const readingMoodKeys = ['sly', 'teary', 'late', 'princess', 'grumpy', 'rainLeaf', 'sausage', 'smileWorld', 'scream'];

export function getGGBondMood(seed = 0) {
  const key = readingMoodKeys[Math.abs(seed) % readingMoodKeys.length];
  return { key, ...ggbondMoods[key] };
}
