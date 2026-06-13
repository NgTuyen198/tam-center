const fs = require('fs');
const path = require('path');

// Target output file
const defaultOutputFile = 'exported_code.txt';
const outputFile = process.argv[2] || defaultOutputFile;
const outputFilePath = path.resolve(outputFile);

// Predefined ignored directories, files, and extensions
const IGNORED_DIRS = new Set([
  'node_modules',
  '.git',
  '.next',
  '.vercel',
  'out',
  'build',
  'coverage',
  '.yarn',
  '.gemini',
  'dist'
]);

const IGNORED_FILES = new Set([
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  '.DS_Store',
  path.basename(__filename),
  path.basename(outputFilePath)
]);

const IGNORED_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.webp', '.pdf',
  '.zip', '.tar', '.gz', '.rar', '.7z', '.woff', '.woff2', '.ttf', '.eot',
  '.mp3', '.mp4', '.wav', '.mov', '.avi', '.tsbuildinfo', '.db', '.sqlite'
]);

// Read and parse .gitignore patterns if it exists
let gitignorePatterns = [];
try {
  const gitignorePath = path.join(process.cwd(), '.gitignore');
  if (fs.existsSync(gitignorePath)) {
    const content = fs.readFileSync(gitignorePath, 'utf8');
    gitignorePatterns = content
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#'));
  }
} catch (err) {
  console.warn('⚠️ Could not read .gitignore:', err.message);
}

// Simple gitignore pattern matching
function matchPattern(relativePath, pattern) {
  const pathStr = relativePath.replace(/\\/g, '/');
  let cleanPattern = pattern.replace(/\\/g, '/');
  
  const isDirPattern = cleanPattern.endsWith('/');
  if (isDirPattern) {
    cleanPattern = cleanPattern.slice(0, -1);
  }
  
  if (cleanPattern.startsWith('/')) {
    cleanPattern = cleanPattern.substring(1);
    if (isDirPattern) {
      return pathStr.startsWith(cleanPattern + '/') || pathStr === cleanPattern;
    } else {
      const regexStr = '^' + cleanPattern.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$';
      try {
        const regex = new RegExp(regexStr);
        return regex.test(pathStr);
      } catch (e) {
        return false;
      }
    }
  } else {
    if (isDirPattern) {
      const parts = pathStr.split('/');
      return parts.includes(cleanPattern);
    } else {
      const regexStr = cleanPattern.replace(/\./g, '\\.').replace(/\*/g, '.*');
      try {
        const regex = new RegExp(regexStr);
        if (regex.test(pathStr)) return true;
        return pathStr.split('/').some(part => regex.test(part));
      } catch (e) {
        return false;
      }
    }
  }
}

// Helper to check if a file or directory is ignored
function isIgnored(filePath, relativePath, isDir = false) {
  const fileName = path.basename(filePath);
  
  // 1. Check exact ignored directories or files
  if (isDir) {
    if (IGNORED_DIRS.has(fileName)) return true;
  } else {
    if (IGNORED_FILES.has(fileName)) return true;
    const ext = path.extname(filePath).toLowerCase();
    if (IGNORED_EXTENSIONS.has(ext)) return true;
  }
  
  // 2. Also check if any path segment matches IGNORED_DIRS
  const parts = relativePath.split(/[/\\]/);
  if (parts.some(part => IGNORED_DIRS.has(part))) return true;
  
  // 3. Match against gitignore patterns
  for (const pattern of gitignorePatterns) {
    if (matchPattern(relativePath, pattern)) {
      return true;
    }
  }
  
  return false;
}

// Recursively find all source code files
function walkDir(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const relativePath = path.relative(process.cwd(), fullPath);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      if (isIgnored(fullPath, relativePath, true)) {
        continue;
      }
      walkDir(fullPath, fileList);
    } else if (stat.isFile()) {
      if (isIgnored(fullPath, relativePath, false)) {
        continue;
      }
      fileList.push({ fullPath, relativePath });
    }
  }
  return fileList;
}

// Build ASCII Directory Tree
function buildTree(filePaths) {
  const tree = {};
  for (const fp of filePaths) {
    const parts = fp.split(/[/\\]/);
    let current = tree;
    for (const part of parts) {
      if (!current[part]) {
        current[part] = {};
      }
      current = current[part];
    }
  }
  
  let treeStr = '';
  function renderTree(node, prefix = '') {
    const keys = Object.keys(node).sort((a, b) => {
      const aIsDir = Object.keys(node[a]).length > 0;
      const bIsDir = Object.keys(node[b]).length > 0;
      if (aIsDir && !bIsDir) return -1;
      if (!aIsDir && bIsDir) return 1;
      return a.localeCompare(b);
    });
    
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const isLast = i === keys.length - 1;
      const isDir = Object.keys(node[key]).length > 0;
      
      treeStr += `${prefix}${isLast ? '└── ' : '├── '}${key}${isDir ? '/' : ''}\n`;
      if (isDir) {
        renderTree(node[key], prefix + (isLast ? '    ' : '│   '));
      }
    }
  }
  renderTree(tree);
  return treeStr;
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

console.log('🔍 Scanning codebase files...');
const allFiles = walkDir(process.cwd());
console.log(`📁 Found ${allFiles.length} source files to export.`);

let outputContent = '';

// Generate tree
const directoryTree = buildTree(allFiles.map(f => f.relativePath));

// 1. Generate Header Meta
outputContent += `================================================================================
CODEBASE EXPORT SUMMARY
================================================================================
Generated on: ${new Date().toISOString()}
Export Directory: ${process.cwd()}
Total Files: ${allFiles.length}

DIRECTORY TREE:
${directoryTree}
================================================================================
\n\n`;

let totalLines = 0;
let totalChars = 0;

for (const file of allFiles) {
  try {
    const fileContent = fs.readFileSync(file.fullPath, 'utf8');
    const lines = fileContent.split('\n');
    
    totalLines += lines.length;
    totalChars += fileContent.length;
    
    outputContent += `================================================================================
FILE: ${file.relativePath}
================================================================================
${fileContent}

`;
    console.log(`✅ Exported: ${file.relativePath} (${lines.length} lines)`);
  } catch (err) {
    console.error(`❌ Failed to read ${file.relativePath}:`, err.message);
  }
}

// Write to final file
try {
  fs.writeFileSync(outputFilePath, outputContent, 'utf8');
  console.log('\n🎉 Codebase export completed successfully!');
  console.log(`📝 Output saved to: ${outputFile}`);
  console.log(`📊 Statistics:`);
  console.log(`   - Total Files: ${allFiles.length}`);
  console.log(`   - Total Lines: ${totalLines}`);
  console.log(`   - Total Size:  ${formatBytes(Buffer.byteLength(outputContent))}`);
  console.log(`   - Est. Tokens: ~${Math.round(totalChars / 4)}`);
} catch (err) {
  console.error('❌ Failed to write export file:', err.message);
}
