import { createServer, preview, build, transformWithOxc } from 'vite';
import react from '@vitejs/plugin-react';
import os from 'os';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


process.chdir(__dirname);

function getNetworkAddress() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      const family = typeof iface.family === 'string' ? iface.family : `IPv${iface.family}`;
      if (family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return null;
}

async function startServer() {
  const isBuild = process.argv.includes('--build');
  const isPreview = process.argv.includes('--preview') || process.env.NODE_ENV === 'production';

  const jsToJsxPlugin = {
    name: 'treat-js-files-as-jsx',
    enforce: 'pre',
    async transform(code, id) {
      if (!id.match(/src\/.*\.js(\?.*)?$/)) return null;
      return transformWithOxc(code, id, {
        lang: 'jsx',
      });
    },
  };

  try {
    const pkgPath = path.join(__dirname, 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    const appName = pkg.name || 'digital-engine';

    if (isBuild) {
      console.log('Building for production...');
      await build({
        root: __dirname,
        configFile: false,
        plugins: [
          jsToJsxPlugin,
          react(),
        ],
        build: {
          outDir: 'build',
          sourcemap: false,
        },
      });
      console.log('\x1b[32m%s\x1b[0m', 'Build completed successfully!');
      return;
    }

    let server;
    let port;
    const defaultPort = Number(process.env.PORT) || 3000;

    if (isPreview) {
      server = await preview({
        root: __dirname,
        configFile: false,
        build: {
          outDir: 'build',
        },
        preview: {
          port: defaultPort,
          host: true,
          allowedHosts: true,
        },
        logLevel: 'warn',
      });
      const address = server.httpServer.address();
      port = typeof address === 'string' ? defaultPort : address.port;
    } else {
      server = await createServer({
        root: __dirname,
        configFile: false,
        plugins: [
          jsToJsxPlugin,
          react(),
        ],
        server: {
          port: defaultPort,
          host: true,
        },
        optimizeDeps: {
          entries: ['index.html'],
          esbuildOptions: {
            loader: {
              '.js': 'jsx',
            },
          },
          rolldownOptions: {
            moduleTypes: {
              '.js': 'jsx',
            },
          },
        },
        logLevel: 'warn',
      });
      await server.listen();
      const address = server.httpServer.address();
      port = typeof address === 'string' ? defaultPort : address.port;
    }

    const networkIp = getNetworkAddress();


    console.clear();

    console.log('\x1b[32m%s\x1b[0m', 'Compiled successfully!');
    console.log();
    console.log(`You can now view \x1b[1m${appName}\x1b[22m in the browser.`);
    console.log();
    console.log(`  \x1b[1mLocal:\x1b[22m            http://localhost:\x1b[1m${port}\x1b[22m`);
    if (networkIp) {
      console.log(`  \x1b[1mOn Your Network:\x1b[22m  http://${networkIp}:\x1b[1m${port}\x1b[22m`);
    }
    console.log();
    if (!isPreview) {
      console.log('Note that the development build is not optimized.');
      console.log('To create a production build, use \x1b[36mnpm run build\x1b[0m.');
    } else {
      console.log('This is a production preview server.');
    }
    console.log();

  } catch (error) {
    console.error('\x1b[31mFailed to run server/build:\x1b[0m', error);
    process.exit(1);
  }
}

startServer();
