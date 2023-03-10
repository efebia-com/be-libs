// Derived from this HH plugin: https://github.com/ItsNickBarry/hardhat-dependency-compiler that only allows single files

import fs from "fs";
import glob from "glob";
import { task } from "hardhat/config";
import { HardhatPluginError } from "hardhat/plugins";
import path from "path";

import { TASK_COMPILE } from "hardhat/builtin-tasks/task-names";

import { packageName } from "./constants";
import "./types";

const generate = function (dependency: string) {
  return [
    "// SPDX-License-Identifier: UNLICENSED",
    "pragma solidity >0.0.0;",
    `import '${dependency}';`,
  ]
    .map((l) => `${l}\n`)
    .join("");
};

// eslint-disable-next-line no-undef
task(TASK_COMPILE, async (args, hre, runSuper) => {
  const config = hre.config.compileMonorepo;

  const directory = path.resolve(hre.config.paths.sources, config.path);

  if (!directory.startsWith(hre.config.paths.sources)) {
    throw new HardhatPluginError(
      packageName,
      "resolved path must be inside of sources directory"
    );
  }

  if (directory === hre.config.paths.sources) {
    throw new HardhatPluginError(
      packageName,
      "resolved path must not be sources directory"
    );
  }

  if (fs.existsSync(directory)) {
    const segments = packageName.split("/");
    const lastElement = segments.pop();
    // If there's an existing tracker, than delete the entire directory
    if (
      fs.existsSync(
        path.resolve(directory, segments.join("/"), `.${lastElement}`)
      )
    ) {
      fs.rmSync(directory, { recursive: true });
    } else {
      throw new HardhatPluginError(
        packageName,
        `temporary source directory must have been generated by ${packageName}`
      );
    }
  } else {
    fs.mkdirSync(directory, { recursive: true });
  }

  const segments = packageName.split("/");
  const lastElement = segments.pop();
  // Create the tracker directory
  fs.mkdirSync(path.resolve(directory, segments.join("/")), {
    recursive: true,
  });
  // Create the tracker
  fs.writeFileSync(
    path.resolve(directory, segments.join("/"), `.${lastElement}`),
    `directory approved for write access by ${packageName}\n`
  );

  // Loop through every dependency
  for (const dependency of config.paths) {
    const fullPath = path.join(directory, dependency);

    if (!fs.existsSync(path.dirname(fullPath))) {
      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    }

    let files = [{ path: fullPath, dependency }];

    // Path is a directory -> maybe a module
    if (!path.extname(dependency)) {
      const modulePath = require.resolve(dependency);
      const pathDetails = path.parse(modulePath);
      const packageJsonPath = path.join(pathDetails.dir, "package.json");
      const packageJson = require(packageJsonPath);
      const packageJsonFiles = packageJson.files[0] || "**/*.sol";
      const resolvedGlobFiles = glob.sync(packageJsonFiles, {
        cwd: pathDetails.dir,
      });

      files = resolvedGlobFiles.map((globbedFile) => {
        const currentPath = path.join(
          directory,
          `${dependency}/${globbedFile}`
        );

        fs.mkdirSync(path.dirname(currentPath), { recursive: true });

        return {
          path: currentPath,
          dependency: `${dependency}/${globbedFile}`,
        };
      });
    }

    for (const file of files) {
      fs.writeFileSync(file.path, generate(file.dependency));
    }
  }

  try {
    await runSuper();
  } finally {
    if (!config.keep) {
      fs.rmSync(directory, { recursive: true });
      if (
        fs.existsSync(hre.config.paths.sources) &&
        fs.readdirSync(hre.config.paths.sources).length === 0
      ) {
        fs.rmSync(hre.config.paths.sources, { recursive: true });
      }
    }
  }
});
