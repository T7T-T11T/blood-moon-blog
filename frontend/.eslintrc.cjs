/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  env: {
    browser: true,
    node: true,
    es2022: true
  },
  extends: [
    'eslint:recommended',
    'plugin:vue/vue3-recommended',
    'prettier'
  ],
  parser: 'vue-eslint-parser',
  parserOptions: {
    ecVersion: 'latest',
    sourceType: 'module'
  },
  plugins: ['vue'],
  // 排除不需要扫描的目录
  ignorePatterns: ['dist/', 'node_modules/', '*.config.js'],
  rules: {
    // 允许 console.log（开发环境需要）
    'no-console': 'off',
    // 允许未使用变量（以 _ 开头的除外）
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    // 格式化规则（缩进/分号/引号/逗号/大括号/空格）交由 Prettier 统一管理，
    // eslint-config-prettier 会自动关闭与之冲突的样式规则，此处不再显式声明
    // Vue 模板多根元素（Vue 3 支持，关闭警告）
    'vue/no-multiple-template-root': 'off',
    // 单单词组件名（页面级组件允许单单词）
    'vue/multi-word-component-names': 'off',
    // Vue 组件名大小写
    'vue/component-name-in-template-casing': ['warn', 'PascalCase']
  }
};
