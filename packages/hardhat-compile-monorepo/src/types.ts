import "hardhat/types/config";

declare module "hardhat/types/config" {
  interface HardhatConfig {
    compileMonorepo: {
      /**
       * Array of monorepo packages (they should be able to be accessed by require(<package>))
       */
      paths: string[];
      /**
       * Output path (by default it's @efebia/hardhat-compile-monorepo)
       */
      path: string;
      /**
       * Boolean to indicate if you want to remove everything after compilation
       */
      keep: boolean;
    };
  }
  interface HardhatUserConfig {
    compileMonorepo: {
      /**
       * Array of monorepo packages (they should be able to be accessed by require(<package>))
       */
      paths: string[];
      /**
       * Output path (by default it's @efebia/hardhat-compile-monorepo)
       */
      path: string;
      /**
       * Boolean to indicate if you want to remove everything after compilation
       */
      keep: boolean;
    };
  }
}

export { };
