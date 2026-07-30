import { Node, mergeAttributes } from '@tiptap/core';

export const VideoExtension = Node.create({
  name: 'video',

  group: 'block',

  selectable: true,

  atom: true,

  addAttributes() {
    return {
      src: {
        default: null,
        parseHTML: (element) => {
          // 兼容两种格式：<video src="..."> 和 <video><source src="..."></video>
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
        tag: 'video'
      }
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'video',
      mergeAttributes(HTMLAttributes, {
        controls: 'controls',
        style: 'max-width: 100%; margin: 16px 0;'
      })
    ];
  },

  addCommands() {
    return {
      setVideo:
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

export default VideoExtension;
