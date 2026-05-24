const Docker = require('dockerode');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');
const { getLanguageConfig, isLanguageSupported } = require('../utils/languageConfig');

let dockerAvailable = false;
let docker = null;

try {
  docker = new Docker({
    socketPath: process.env.DOCKER_SOCKET || '/var/run/docker.sock'
  });
  
  docker.ping((err) => {
    if (err) {
      console.warn('Docker not available, falling back to local execution mode');
      dockerAvailable = false;
    } else {
      console.log('Docker available for secure code execution');
      dockerAvailable = true;
    }
  });
} catch (err) {
  console.warn('Docker initialization failed, falling back to local execution mode');
  dockerAvailable = false;
}

const CODE_EXECUTION_TIMEOUT = parseInt(process.env.CODE_EXECUTION_TIMEOUT) || 30000;

const createTempDir = () => {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'code-exec-'));
};

const executeLocal = (code, language) => {
  return new Promise((resolve) => {
    const langConfig = getLanguageConfig(language);
    const tempDir = createTempDir();
    const filename = `main.${langConfig.extension}`;
    const filePath = path.join(tempDir, filename);
    
    fs.writeFileSync(filePath, code);
    
    let command;
    const options = {
      timeout: CODE_EXECUTION_TIMEOUT,
      maxBuffer: 1024 * 1024,
      cwd: tempDir
    };
    
    switch (language) {
      case 'javascript':
        command = `node ${filename}`;
        break;
      case 'python':
        command = `python3 ${filename} || python ${filename}`;
        break;
      case 'java':
        command = `javac ${filename} && java ${filename.replace('.java', '')}`;
        break;
      case 'go':
        command = `go run ${filename}`;
        break;
      default:
        resolve({
          success: false,
          error: `Local execution not available for ${langConfig.name}. Please install Docker for full multi-language support.`,
          stderr: ''
        });
        return;
    }
    
    exec(command, options, (error, stdout, stderr) => {
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch (e) {
        console.error('Error cleaning up temp dir:', e);
      }
      
      const result = {
        success: !error,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        error: error ? error.message : '',
        mode: 'local'
      };
      
      if (error && error.killed) {
        result.error = 'Execution timeout (30 seconds)';
      }
      
      if (!dockerAvailable) {
        result.warning = 'Running in local mode (less secure). Install Docker for isolated container execution.';
      }
      
      resolve(result);
    });
  });
};

const executeDocker = async (code, language) => {
  const langConfig = getLanguageConfig(language);
  const tempDir = createTempDir();
  const filename = `main.${langConfig.extension}`;
  const filePath = path.join(tempDir, filename);
  
  fs.writeFileSync(filePath, code);
  
  let container = null;
  let result = { success: false, stdout: '', stderr: '', error: '', mode: 'docker' };
  
  try {
    container = await docker.createContainer({
      Image: langConfig.dockerImage,
      Cmd: langConfig.command(filename),
      HostConfig: {
        Binds: [`${tempDir}:/app:ro`],
        Memory: 128 * 1024 * 1024,
        CpuQuota: 50000,
        NetworkMode: 'none',
        ReadonlyRootfs: true
      },
      Tty: false,
      AttachStdout: true,
      AttachStderr: true,
      User: 'nobody'
    });
    
    await container.start();
    
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error('Execution timeout (30 seconds)'));
      }, CODE_EXECUTION_TIMEOUT);
    });
    
    const executionPromise = container.wait();
    
    await Promise.race([executionPromise, timeoutPromise]);
    
    const stream = await container.logs({
      stdout: true,
      stderr: true,
      follow: false
    });
    
    const output = stream.toString('utf8');
    const lines = output.split('\n');
    
    result.stdout = lines.filter((_, i) => i % 2 === 0).join('\n').trim();
    result.stderr = lines.filter((_, i) => i % 2 === 1).join('\n').trim();
    result.success = true;
    
    const inspect = await container.inspect();
    if (inspect.State.ExitCode !== 0) {
      result.success = false;
      result.error = `Process exited with code ${inspect.State.ExitCode}`;
    }
    
  } catch (err) {
    result.success = false;
    result.error = err.message;
  } finally {
    if (container) {
      try {
        await container.stop({ t: 1 });
        await container.remove();
      } catch (e) {
        console.error('Error cleaning up container:', e);
      }
    }
    
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (e) {
      console.error('Error cleaning up temp dir:', e);
    }
  }
  
  return result;
};

const executeCode = async (code, language) => {
  if (!isLanguageSupported(language)) {
    return {
      success: false,
      error: `Unsupported language: ${language}`
    };
  }
  
  const langConfig = getLanguageConfig(language);
  
  if (!langConfig.dockerImage || !langConfig.command) {
    return {
      success: false,
      error: `Execution not supported for ${langConfig.name}`
    };
  }
  
  if (dockerAvailable && docker) {
    try {
      return await executeDocker(code, language);
    } catch (err) {
      console.warn('Docker execution failed, falling back to local:', err.message);
      return await executeLocal(code, language);
    }
  } else {
    return await executeLocal(code, language);
  }
};

const isDockerAvailable = () => dockerAvailable;

module.exports = {
  executeCode,
  isDockerAvailable
};
