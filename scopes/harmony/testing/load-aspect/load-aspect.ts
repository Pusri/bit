import { resolve, join } from 'path';
import { getConsumerInfo, loadConsumer } from '@teambit/legacy/dist/consumer';
import { propogateUntil as propagateUntil } from '@teambit/legacy/dist/utils';
import { readdirSync } from 'fs';
import { ConfigOptions } from '@teambit/harmony/dist/harmony-config/harmony-config';
import { Harmony, Aspect } from '@teambit/harmony';
import { ComponentID } from '@teambit/component';
import { Config } from '@teambit/harmony/dist/harmony-config';
import { CLIAspect } from '@teambit/cli';
import { NodeAspect } from '@teambit/node';
import ComponentLoader from '@teambit/legacy/dist/consumer/component/component-loader';
import ComponentConfig from '@teambit/legacy/dist/consumer/config/component-config';
import ComponentOverrides from '@teambit/legacy/dist/consumer/config/component-overrides';
import { PackageJsonTransformer } from '@teambit/legacy/dist/consumer/component/package-json-transformer';
import ManyComponentsWriter from '@teambit/legacy/dist/consumer/component-ops/many-components-writer';
import { ExtensionDataList } from '@teambit/legacy/dist/consumer/config';
import WorkspaceConfig from '@teambit/legacy/dist/consumer/config/workspace-config';
import { DependencyResolver } from '@teambit/legacy/dist/consumer/component/dependencies/dependency-resolver';

function getPackageName(aspect: any, id: ComponentID) {
  return `@teambit/${id.name}`;
  // const [owner, name] = aspect.id.split('.');
  // return `@${owner}/${replaceAll(name, '/', '.')}`;
}

export async function loadAspect<T>(targetAspect: Aspect, cwd = process.cwd(), runtime = 'main'): Promise<T> {
  clearGlobalsIfNeeded();
  const config = await getConfig(cwd);
  const configMap = config.toObject();
  configMap['teambit.harmony/bit'] = {
    cwd,
  };

  // CLIAspect is needed for register the main runtime. NodeAspect is needed to get the default env if nothing
  // was configured. If it's not loaded here, it'll throw an error later that there is no node-env.
  const harmony = await Harmony.load([CLIAspect, NodeAspect, targetAspect], runtime, configMap);

  await harmony.run(async (aspect, runtimeDef) => {
    const id = ComponentID.fromString(aspect.id);
    const packageName = getPackageName(aspect, id);
    const mainFilePath = require.resolve(packageName);
    const packagePath = resolve(join(mainFilePath, '..'));
    const files = readdirSync(packagePath);
    const runtimePath = files.find((path) => path.includes(`.${runtimeDef.name}.runtime.js`));
    if (!runtimePath) throw new Error(`could not find runtime '${runtimeDef.name}' for aspect ID '${aspect.id}'`);
    // eslint-disable-next-line global-require, import/no-dynamic-require
    const runtimeC = require(join(packagePath, runtimePath));
    if (aspect.id === targetAspect.id) {
      targetAspect.addRuntime(runtimeC.default);
    }
  });

  return harmony.get(targetAspect.id);
}

export async function getConfig(cwd = process.cwd()) {
  const consumerInfo = await getConsumerInfo(cwd);
  const scopePath = propagateUntil(cwd);
  const globalConfigOpts = {
    name: '.bitrc.jsonc',
  };
  const configOpts: ConfigOptions = {
    global: globalConfigOpts,
    shouldThrow: false,
    cwd: consumerInfo?.path || scopePath,
  };

  if (consumerInfo) {
    const config = Config.load('workspace.jsonc', configOpts);
    return config;
  }

  if (scopePath && !consumerInfo) {
    return Config.load('scope.jsonc', configOpts);
  }

  return Config.loadGlobal(globalConfigOpts);
}

function clearGlobalsIfNeeded() {
  if (!loadConsumer.cache && !PackageJsonTransformer.packageJsonTransformersRegistry.length) {
    return;
  }
  delete loadConsumer.cache;
  ComponentLoader.onComponentLoadSubscribers = [];
  ComponentOverrides.componentOverridesLoadingRegistry = {};
  ComponentConfig.componentConfigLegacyLoadingRegistry = {};
  ComponentConfig.componentConfigLoadingRegistry = {};
  PackageJsonTransformer.packageJsonTransformersRegistry = [];
  // @ts-ignore
  DependencyResolver.getWorkspacePolicy = undefined;
  // @ts-ignore
  ManyComponentsWriter.externalInstaller = {};
  ExtensionDataList.coreExtensionsNames = new Map();
  // @ts-ignore
  WorkspaceConfig.workspaceConfigEnsuringRegistry = undefined;
  // @ts-ignore
  WorkspaceConfig.workspaceConfigIsExistRegistry = undefined;
  // @ts-ignore
  WorkspaceConfig.workspaceConfigLoadingRegistry = undefined;
}
