import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Soporte para __dirname en ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to ensure directory exists
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Helper to move file if exists
function moveFile(src, dest) {
  const absSrc = path.join(__dirname, src);
  const absDest = path.join(__dirname, dest);
  if (fs.existsSync(absSrc)) {
    ensureDir(path.dirname(absDest));
    fs.renameSync(absSrc, absDest);
    console.log(`Moved: ${src} -> ${dest}`);
  }
}

// 1. Crear carpetas base
const baseDirs = [
  'src/pages',
  'src/features/automoderation',
  'src/features/templates',
  'src/features/welcome',
  'src/features/channels',
  'src/components/layout',
  'src/components/shared',
  'src/contexts',
  'src/utils',
  'src/assets'
];
baseDirs.forEach(ensureDir);

// 2. Mover páginas principales
const pages = [
  'Dashboard.tsx',
  'Login.tsx',
  'Templates.tsx',
  'AutoModeration.tsx',
  'CreateChannel.tsx',
  'ReactionRoles.tsx',
  'SocialNotifications.tsx',
  'JoinRoles.tsx',
  'WelcomeMessages.tsx'
];
pages.forEach(page =>
  moveFile(`src/components/pages/${page}`, `src/pages/${page}`)
);

// 3. Mover features (ejemplo WelcomeMessages)
const welcomeFeatures = [
  'BoostMessages.tsx',
  'ImageConfig.tsx',
  'JoinMessages.tsx',
  'LeaveMessages.tsx'
];
welcomeFeatures.forEach(f =>
  moveFile(`src/components/pages/WelcomeMessages/${f}`, `src/features/welcome/${f}`)
);

// 4. Mover channels features
moveFile('src/components/shared/ChannelListDisplay.tsx', 'src/features/channels/ChannelListDisplay.tsx');
moveFile('src/components/shared/ChannelSelector.tsx', 'src/features/channels/ChannelSelector.tsx');

// 5. Mover layout y shared
moveFile('src/components/layout/HeaderControls.tsx', 'src/components/layout/HeaderControls.tsx');
moveFile('src/components/layout/Sidebar.tsx', 'src/components/layout/Sidebar.tsx');
// Si tienes más componentes shared, agrégalos aquí

// 6. Mover contextos y utils (si no están ya)
moveFile('src/contexts/ThemeContext.tsx', 'src/contexts/ThemeContext.tsx');
moveFile('src/contexts/TemplateContext.tsx', 'src/contexts/TemplateContext.tsx');
moveFile('src/utils/index.ts', 'src/utils/index.ts');
moveFile('src/utils/formatSectionName.ts', 'src/utils/formatSectionName.ts');

console.log('✅ Organización completada. Revisa los imports en tus archivos si es necesario.'); 