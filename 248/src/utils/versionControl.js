const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

const VERSIONS_DIR = path.resolve('./.aicg/versions');
const COMPONENTS_INDEX = path.join(VERSIONS_DIR, 'components.json');

function ensureDirs() {
  if (!fs.existsSync(VERSIONS_DIR)) {
    fs.mkdirSync(VERSIONS_DIR, { recursive: true });
  }
  if (!fs.existsSync(COMPONENTS_INDEX)) {
    fs.writeFileSync(COMPONENTS_INDEX, JSON.stringify({ components: [] }, null, 2), 'utf8');
  }
}

function loadComponentsIndex() {
  ensureDirs();
  try {
    return JSON.parse(fs.readFileSync(COMPONENTS_INDEX, 'utf8'));
  } catch (e) {
    return { components: [] };
  }
}

function saveComponentsIndex(index) {
  ensureDirs();
  fs.writeFileSync(COMPONENTS_INDEX, JSON.stringify(index, null, 2), 'utf8');
}

async function saveInitialVersion(description, result, framework) {
  ensureDirs();
  
  const componentId = result.componentId;
  const componentName = result.name || 'component';
  const timestamp = new Date().toISOString();
  
  const componentDir = path.join(VERSIONS_DIR, componentId);
  const v1Dir = path.join(componentDir, 'v1');
  
  fs.mkdirSync(v1Dir, { recursive: true });
  
  const versionMetadata = {
    version: 1,
    createdAt: timestamp,
    description,
    framework,
    isAIGenerated: result.isAIGenerated !== false,
    type: 'original'
  };
  
  fs.writeFileSync(
    path.join(v1Dir, 'metadata.json'),
    JSON.stringify(versionMetadata, null, 2),
    'utf8'
  );
  
  fs.writeFileSync(
    path.join(v1Dir, `code.${getFileExtension(framework)}`),
    result.code,
    'utf8'
  );
  
  if (result.example) {
    fs.writeFileSync(
      path.join(v1Dir, `example.${getFileExtension(framework)}`),
      result.example,
      'utf8'
    );
  }
  
  if (result.props) {
    fs.writeFileSync(
      path.join(v1Dir, 'props.json'),
      JSON.stringify(result.props, null, 2),
      'utf8'
    );
  }
  
  if (result.structure) {
    fs.writeFileSync(
      path.join(v1Dir, 'structure.json'),
      JSON.stringify(result.structure, null, 2),
      'utf8'
    );
  }
  
  const index = loadComponentsIndex();
  const existingComponent = index.components.find(c => c.id === componentId);
  
  if (!existingComponent) {
    index.components.push({
      id: componentId,
      name: componentName,
      createdAt: timestamp,
      updatedAt: timestamp,
      latestVersion: 1,
      versions: [1],
      description,
      framework
    });
  } else {
    existingComponent.name = componentName;
    existingComponent.updatedAt = timestamp;
  }
  
  saveComponentsIndex(index);
  
  return {
    componentId,
    version: 1,
    path: v1Dir
  };
}

async function openInEditor(componentId, version = null) {
  ensureDirs();
  
  const componentDir = path.join(VERSIONS_DIR, componentId);
  if (!fs.existsSync(componentDir)) {
    throw new Error(`Component ${componentId} not found`);
  }
  
  const index = loadComponentsIndex();
  const component = index.components.find(c => c.id === componentId);
  if (!component) {
    throw new Error(`Component ${componentId} not found in index`);
  }
  
  if (version === null) {
    version = component.latestVersion;
  }
  
  const versionDir = path.join(componentDir, `v${version}`);
  if (!fs.existsSync(versionDir)) {
    throw new Error(`Version v${version} not found for component ${componentId}`);
  }
  
  const codeFile = fs.readdirSync(versionDir).find(f => 
    f.startsWith('code.') && !f.endsWith('.json')
  );
  
  if (!codeFile) {
    throw new Error(`Code file not found for version v${version}`);
  }
  
  const codeFilePath = path.join(versionDir, codeFile);
  const originalCode = fs.readFileSync(codeFilePath, 'utf8');
  
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aicg-edit-'));
  const tempFile = path.join(tempDir, codeFile);
  fs.writeFileSync(tempFile, originalCode, 'utf8');
  
  const editor = process.env.EDITOR || (process.platform === 'win32' ? 'notepad' : 'nano');
  
  console.log(`\nOpening editor: ${editor}`);
  console.log(`Edit the code, save, and close the editor to continue...\n`);
  
  try {
    execSync(`${editor} "${tempFile}"`, { stdio: 'inherit' });
  } catch (e) {
    console.log(`Editor command failed, trying system default...`);
    try {
      if (process.platform === 'darwin') {
        execSync(`open -t "${tempFile}"`, { stdio: 'inherit' });
      } else if (process.platform === 'win32') {
        execSync(`notepad "${tempFile}"`, { stdio: 'inherit' });
      } else {
        execSync(`xdg-open "${tempFile}"`, { stdio: 'inherit' });
      }
    } catch (e2) {
      throw new Error(`Could not open editor. Please set EDITOR environment variable or edit the file manually at: ${tempFile}`);
    }
  }
  
  const modifiedCode = fs.readFileSync(tempFile, 'utf8');
  
  const hasChanges = modifiedCode.trim() !== originalCode.trim();
  
  if (hasChanges) {
    const newVersion = component.latestVersion + 1;
    const newVersionDir = path.join(componentDir, `v${newVersion}`);
    
    fs.mkdirSync(newVersionDir, { recursive: true });
    
    const newMetadata = {
      version: newVersion,
      createdAt: new Date().toISOString(),
      description: component.description,
      framework: component.framework,
      isAIGenerated: false,
      type: 'modified',
      parentVersion: version,
      changedBy: 'user'
    };
    
    fs.writeFileSync(
      path.join(newVersionDir, 'metadata.json'),
      JSON.stringify(newMetadata, null, 2),
      'utf8'
    );
    
    fs.writeFileSync(
      path.join(newVersionDir, `code.${getFileExtension(component.framework)}`),
      modifiedCode,
      'utf8'
    );
    
    fs.writeFileSync(
      path.join(newVersionDir, `original.${getFileExtension(component.framework)}`),
      originalCode,
      'utf8'
    );
    
    const diff = generateDiff(originalCode, modifiedCode);
    fs.writeFileSync(
      path.join(newVersionDir, 'diff.txt'),
      diff,
      'utf8'
    );
    
    const oldVersionMetadata = JSON.parse(fs.readFileSync(path.join(versionDir, 'metadata.json'), 'utf8'));
    if (oldVersionMetadata.example) {
      fs.writeFileSync(
        path.join(newVersionDir, `example.${getFileExtension(component.framework)}`),
        oldVersionMetadata.example,
        'utf8'
      );
    }
    
    const updatedIndex = loadComponentsIndex();
    const updatedComponent = updatedIndex.components.find(c => c.id === componentId);
    updatedComponent.latestVersion = newVersion;
    updatedComponent.versions.push(newVersion);
    updatedComponent.updatedAt = new Date().toISOString();
    saveComponentsIndex(updatedIndex);
    
    try {
      fs.rmSync(tempDir, { recursive: true });
    } catch (e) {
      console.log(`Note: Could not clean up temp directory: ${tempDir}`);
    }
    
    return {
      componentId,
      oldVersion: version,
      newVersion,
      hasChanges: true,
      diff,
      path: newVersionDir
    };
  } else {
    try {
      fs.rmSync(tempDir, { recursive: true });
    } catch (e) {
      console.log(`Note: Could not clean up temp directory: ${tempDir}`);
    }
    
    return {
      componentId,
      version,
      hasChanges: false,
      message: 'No changes detected'
    };
  }
}

function generateDiff(original, modified) {
  const originalLines = original.split('\n');
  const modifiedLines = modified.split('\n');
  
  const maxLines = Math.max(originalLines.length, modifiedLines.length);
  let diff = '';
  
  for (let i = 0; i < maxLines; i++) {
    const origLine = originalLines[i];
    const modLine = modifiedLines[i];
    
    if (origLine !== modLine) {
      if (origLine !== undefined) {
        diff += `- ${origLine}\n`;
      }
      if (modLine !== undefined) {
        diff += `+ ${modLine}\n`;
      }
    }
  }
  
  return diff || '(No line-by-line differences detected - whitespace only changes)';
}

function getComponent(componentId) {
  const index = loadComponentsIndex();
  const component = index.components.find(c => c.id === componentId);
  
  if (!component) {
    return null;
  }
  
  const componentDir = path.join(VERSIONS_DIR, componentId);
  const versions = {};
  
  for (const v of component.versions) {
    const versionDir = path.join(componentDir, `v${v}`);
    if (fs.existsSync(versionDir)) {
      const metadata = JSON.parse(fs.readFileSync(path.join(versionDir, 'metadata.json'), 'utf8'));
      
      const files = fs.readdirSync(versionDir);
      const versionData = { metadata };
      
      files.forEach(file => {
        const filePath = path.join(versionDir, file);
        if (file.endsWith('.json') && file !== 'metadata.json') {
          versionData[file.replace('.json', '')] = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        } else if (file === 'diff.txt') {
          versionData.diff = fs.readFileSync(filePath, 'utf8');
        } else if (!file.endsWith('.json')) {
          versionData[file.replace(/\.[^.]+$/, '')] = fs.readFileSync(filePath, 'utf8');
        }
      });
      
      versions[`v${v}`] = versionData;
    }
  }
  
  return {
    ...component,
    versions
  };
}

function listComponents(limit = 20) {
  const index = loadComponentsIndex();
  return index.components
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .slice(0, limit);
}

function getVersionById(componentId, version) {
  const component = getComponent(componentId);
  if (!component) return null;
  
  return component.versions[`v${version}`] || null;
}

function getFileExtension(framework) {
  switch (framework.toLowerCase()) {
    case 'react':
      return 'jsx';
    case 'vue':
      return 'vue';
    case 'native':
    default:
      return 'html';
  }
}

async function saveVersions(description, result, framework, originalCode = null) {
  if (originalCode || !result.componentId) {
    return saveInitialVersion(description, result, framework);
  }
  return saveInitialVersion(description, result, framework);
}

function listVersions() {
  return listComponents();
}

function getVersionDir(versionDir) {
  const fullPath = path.join(VERSIONS_DIR, versionDir);
  if (!fs.existsSync(fullPath)) return null;
  
  const files = fs.readdirSync(fullPath);
  const result = {};
  
  files.forEach(file => {
    const filePath = path.join(fullPath, file);
    if (file.endsWith('.json')) {
      result[file.replace('.json', '')] = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } else {
      result[file.replace(/\.[^.]+$/, '')] = fs.readFileSync(filePath, 'utf8');
    }
  });
  
  return result;
}

module.exports = {
  saveInitialVersion,
  openInEditor,
  getComponent,
  listComponents,
  getVersionById,
  getFileExtension,
  generateDiff,
  saveVersions,
  listVersions,
  getVersion: getVersionDir
};
