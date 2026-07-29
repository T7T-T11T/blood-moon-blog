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
    // 分号
    'semi': ['error', 'always'],
    // 单引号
    'quotes': ['error', 'single', { avoidEscape: true }],
    // 缩进 2 空格
    'indent': ['error', 2],
    // 逗号末尾
    'comma-dangle': ['error', 'never'],
    // 大括号风格
    'brace-style': ['error', '1tbs', { allowSingleLine: true }],
    // 关键字前后空格
    'keyword-spacing': ['error', { before: true, after: true }],
    // Vue 模板多根元素（Vue 3 支持，关闭警告）
    'vue/no-multiple-template-root': 'off',
    // 单单词组件名（页面级组件允许单单词）
    'vue/multi-word-component-names': 'off',
    // Vue 组件名大小写
    'vue/component-name-in-template-casing': ['warn', 'PascalCase']
  }
};
