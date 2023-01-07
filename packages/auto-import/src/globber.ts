import { readdir } from "node:fs/promises";
import path from "node:path";
import url, { fileURLToPath } from "node:url";
import pino from "pino";
import { pkgUp } from "pkg-up";
import { serial } from "./serial.js";

export type Globber = {
  directory?: string;
  routeFile?: string;
  startingDirectory: string;
  log?: pino.BaseLogger;
};

const getPackageType = async (directory: string) => {
  const nearestPackage = await pkgUp({ cwd: directory });
  if (nearestPackage) {
    return require(nearestPackage).type;
  }
};

export const globFiles = async (
  opts: Required<Globber> & { log?: pino.BaseLogger }
) => {
  const packageType = await getPackageType(opts.directory);
  const startingDirectory = path.dirname(fileURLToPath(opts.startingDirectory));
  const pluginsDirectory = path.join(startingDirectory, opts.directory);
  const routesDirectories = await readdir(pluginsDirectory);

  const importedFiles = await serial(
    routesDirectories.map((dir) => async () => {
      const osPath = path.join(
        pluginsDirectory,
        dir,
        `${opts.routeFile.replace(".js", "")}.js`
      );
      try {
        if (packageType === "module") {
          const importedPlugin = await import(url.pathToFileURL(osPath).href);
          return importedPlugin.default;
        }
        return require(osPath);
      } catch (e) {
        opts.log?.error(
          { error: e, path: osPath },
          "@efebia/fastify-auto-import error on importing plugin"
        );
        return null;
      }
    })
  );
  return importedFiles.filter((e) => e);
};
