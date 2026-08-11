import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import url, { fileURLToPath } from "node:url";
import pino from "pino";
import pkgUp from "pkg-up";

export type Globber = {
  directory?: string;
  routeFile?: string;
  startingDirectory: string;
  log?: pino.BaseLogger;
  excludedDirectories?: string[];
  recursive?: boolean;
};

const getPackageType = async (directory: string) => {
  const nearestPackage = await pkgUp({ cwd: directory });
  if (nearestPackage) {
    if ('require' in global) {
      return require(nearestPackage).type;
    }
    const file = await readFile(nearestPackage, { encoding: 'utf-8' });
    return JSON.parse(file).type;
  }
};

const collectRecursivePlugins = async (
  dir: string,
  opts: { routeFile: string; packageType: string; excludedDirectories: string[]; log?: pino.BaseLogger }
): Promise<any[]> => {
  const entries = await readdir(dir, { withFileTypes: true });
  const dirEntries = entries.filter(
    (entry) => entry.isDirectory() && !opts.excludedDirectories.includes(entry.name)
  );

  const perDirResults = await Promise.all(
    dirEntries.map(async (entry) => {
      const subDir = path.join(dir, entry.name);
      const subEntries = await readdir(subDir);
      const routeFileName = opts.routeFile.replace('.js', '');
      const hasRouteFile = subEntries.some(
        (f) => f === `${routeFileName}.js` || f === `${routeFileName}.ts`
      );

      const own: any[] = [];
      if (hasRouteFile) {
        const osPath = path.join(
          subDir,
          opts.packageType === 'module' ? `${routeFileName}.js` : routeFileName
        );
        const href = url.pathToFileURL(osPath).href;
        try {
          if (opts.packageType === 'module') {
            const imported = await import(href);
            if (imported.default) own.push(imported.default);
          } else {
            const imported = require(osPath);
            if (imported) own.push(imported);
          }
        } catch (e) {
          opts.log?.error(
            { error: e, path: osPath },
            '@efebia/fastify-auto-import error on importing plugin'
          );
          throw e;
        }
      }

      const nested = await collectRecursivePlugins(subDir, opts);
      return [...own, ...nested];
    })
  );

  return perDirResults.flat();
};

export const globFiles = async (
  opts: Required<Globber> & { log?: pino.BaseLogger }
) => {
  const packageType = await getPackageType(opts.directory);
  const startingDirectory = packageType === 'module' ? path.dirname(fileURLToPath(opts.startingDirectory)) : opts.startingDirectory;
  const pluginsDirectory = path.join(startingDirectory, opts.directory);

  if (opts.recursive) {
    const plugins = await collectRecursivePlugins(pluginsDirectory, {
      routeFile: opts.routeFile,
      packageType,
      excludedDirectories: opts.excludedDirectories,
      log: opts.log,
    });
    return plugins.filter(Boolean);
  }

  const routesDirectories = await readdir(pluginsDirectory);

  const filteredDirectories = routesDirectories.filter(dir => !opts.excludedDirectories.includes(dir))
  
  const importedFiles = await Promise.all(
    filteredDirectories.map(async (dir) => {
      const osPath = path.join(
        pluginsDirectory,
        dir,
        packageType === 'module' ? `${opts.routeFile.replace(".js", "")}.js` : opts.routeFile.replace(".js", "")
      );
      const href = url.pathToFileURL(osPath).href
      try {
        if (packageType === "module") {
          const importedPlugin = await import(href);
          return importedPlugin.default;
        }
        return require(osPath);
      } catch (e) {
        console.log(e);
        opts.log?.error(
          { error: e, path: osPath },
          "@efebia/fastify-auto-import error on importing plugin"
        );
        throw e
      }
    })
  );
  return importedFiles.filter((e) => e);
};
