import { Node, mergeAttributes } from '@tiptap/core';

export const AudioExtension = Node.create({
  name: 'audio',

  group: 'block',

  selectable: true,

  atom: true,

  addAttributes() {
    return {
      src: {
        default: null,
        parseHTML: (element) => {
          // 兼容两种格式：<audio src="..."> 和 <audio><source src="..."></audio>
          const directSrc = element.getAttribute('src');
          if (directSrc) return directSrc;
          const source = element.querySelector('source');
          return source?.getAttribute('src') || null;
        },
        renderHTML: (attributes) => {
          return { src: attributes.src };
        }
      },
      controls: {
        default: true,
        parseHTML: (element) => {
          return element.hasAttribute('controls') || element.querySelector('source') !== null;
        },
        renderHTML: (attributes) => {
          return { controls: attributes.controls };
        }
      }
    };
  },

  parseHTML() {
    return [
      {
        tag: 'audio'
      }
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'audio',
      mergeAttributes(HTMLAttributes, {
        controls: 'controls',
        style: 'max-width: 100%; margin: 16px 0;'
      })
    ];
  },

  addCommands() {
    return {
      setAudio:
        (options) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: options
          });
        }
    };
  }
});

export default AudioExtension;
