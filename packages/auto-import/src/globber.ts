import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import url, { fileURLToPath } from "node:url";
import pino from "pino";
import pkgUp from "pkg-up";
import { serial } from "./serial.js";

export type Globber = {
  directory?: string;
  routeFile?: string;
  startingDirectory: string;
  log?: pino.BaseLogger;
  excludedDirectories?: string[];
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

export const globFiles = async (
  opts: Required<Globber> & { log?: pino.BaseLogger }
) => {
  const packageType = await getPackageType(opts.directory);
  const startingDirectory = packageType === 'module' ? path.dirname(fileURLToPath(opts.startingDirectory)) : opts.startingDirectory;
  const pluginsDirectory = path.join(startingDirectory, opts.directory);
  const routesDirectories = await readdir(pluginsDirectory);

  const filteredDirectories = routesDirectories.filter(dir => !opts.excludedDirectories.includes(dir))
    
  const importedFiles = await serial(
    filteredDirectories.map((dir) => async () => {
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
