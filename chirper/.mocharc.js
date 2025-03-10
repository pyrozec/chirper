module.exports = {
    recursive: true,
    reporter: 'spec',
    timeout: 5000,
    require: 'chai/register-assert',
    spec: 'test/**/*.test.js'
};