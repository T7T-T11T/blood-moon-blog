/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  // 运行环境：Node.js + ES2022 语法
  env: {
    node: true,
    es2022: true
  },
  // 继承推荐规则集
  extends: ['eslint:recommended'],
  // 解析器选项
  parserOptions: {
    ecVersion: 'latest',
    sourceType: 'script'
  },
  // 忽略扫描的目录
  ignorePatterns: ['uploads/', 'node_modules/', 'scripts/'],
  rules: {
    // ========== 代码质量规则 ==========
    // 强制使用 === 而非 ==
    eqeqeq: ['warn', 'always'],
    // 禁止未使用变量（以 _ 开头的参数忽略）
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    // 禁止重新赋值 const
    'no-const-assign': 'error',
    // 禁止 var 声明
    'no-var': 'warn',
    // 允许 console.log（Node.js 服务端需要日志输出）
    'no-console': 'off',

    // ========== 格式化规则（交由 Prettier 统一管理，此处关闭避免冲突）==========
    indent: 'off',
    semi: 'off',
    quotes: 'off',
    'brace-style': 'off',
    'comma-dangle': 'off',
    'no-tabs': 'off',
    'eol-last': 'off',
    'no-multiple-empty-lines': 'off',
    'no-trailing-spaces': 'off'
  }
};