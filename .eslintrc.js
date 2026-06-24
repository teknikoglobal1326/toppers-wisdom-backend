module.exports = {
  env: { node: true, es2020: true, commonjs: true },
  extends: ['eslint:recommended'],
  rules: {
    'no-unused-vars':  ['error', { argsIgnorePattern: '^_' }],
    'no-undef':        'error',
    'eqeqeq':         'error',
    'no-console':      'error',   // always use logger
    'no-var':          'error',
    'prefer-const':    'error',
  },
}