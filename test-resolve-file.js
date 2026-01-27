const fs = require('fs');
try {
    const resolved = require.resolve('tailwindcss-animate');
    fs.writeFileSync('resolve-output.txt', 'Resolved: ' + resolved);
} catch (e) {
    fs.writeFileSync('resolve-output.txt', 'Failed: ' + e.message);
}
