try {
    const resolved = require.resolve('tailwindcss-animate');
    console.log('Resolved:', resolved);
} catch (e) {
    console.error('Failed to resolve:', e.message);
}
