const fs = require('fs');
const files = [
  'frontend/src/components/ProfileSetupModal.tsx',
  'frontend/src/app/verify/page.tsx',
  'frontend/src/components/RolePanels/AdminPanel.tsx',
  'frontend/src/components/RolePanels/StudentPanel.tsx',
  'frontend/src/components/RolePanels/SupervisorPanel.tsx'
];

files.forEach(f => {
  let code = fs.readFileSync(f, 'utf8');
  // Specifically target Tailwind classes on text inputs that might be white by default, adding robust dark text colors
  code = code.replace(/<input([^>]*)className="([^"]+)"/g, (match, prefix, cls) => {
    if (!cls.includes('text-gray-900') && !cls.includes('text-black')) {
        return `<input${prefix}className="${cls} text-gray-900"`;
    }
    return match;
  });
  
  code = code.replace(/<textarea([^>]*)className="([^"]+)"/g, (match, prefix, cls) => {
    if (!cls.includes('text-gray-900') && !cls.includes('text-black')) {
        return `<textarea${prefix}className="${cls} text-gray-900"`;
    }
    return match;
  });

  fs.writeFileSync(f, code);
});
console.log('UI inputs patched.');
