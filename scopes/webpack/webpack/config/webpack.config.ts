/* eslint-disable complexity */
import camelcase from 'camelcase';
import webpack, { Configuration } from 'webpack';
import { generateExternals } from '@teambit/webpack.modules.generate-externals';
import { isUndefined, omitBy } from 'lodash';
import type { BundlerContext, BundlerHtmlConfig, Target } from '@teambit/bundler';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import WebpackAssetsManifest from 'webpack-assets-manifest';
import { fallbacks } from './webpack-fallbacks';
import { fallbacksProvidePluginConfig } from './webpack-fallbacks-provide-plugin-config';
import { fallbacksAliases } from './webpack-fallbacks-aliases';

export function configFactory(target: Target, context: BundlerContext): Configuration {
  let truthyEntries =
    Array.isArray(target.entries) && target.entries.length ? target.entries.filter(Boolean) : target.entries || {};
  if (Array.isArray(truthyEntries) && !truthyEntries.length) {
    truthyEntries = {};
  }
  const dev = Boolean(context.development);
  const htmlConfig = target.html ?? context.html;
  const htmlPlugins = htmlConfig ? generateHtmlPlugins(htmlConfig) : undefined;
  const shouldExternalizePeers =
    (target.externalizePeer ?? context.externalizePeer) && target.peers && target.peers.length;
  const externals = shouldExternalizePeers ? (getExternals(target.peers || []) as any) : undefined;
  const splitChunks = target.chunking?.splitChunks;

  const config: Configuration = {
    mode: dev ? 'development' : 'production',
    // Stop compilation early in production
    bail: true,
    // These are the "entry points" to our application.
    // This means they will be the "root" imports that are included in JS bundle.
    // @ts-ignore
    entry: truthyEntries,

    infrastructureLogging: {
      level: 'error',
    },

    output: {
      // The build folder.
      path: `${target.outputPath}/public`,
    },
    stats: {
      errorDetails: true,
    },

    resolve: {
      alias: fallbacksAliases,

      fallback: fallbacks,
    },

    plugins: [new webpack.ProvidePlugin(fallbacksProvidePluginConfig), getAssetManifestPlugin()],
  };

  if (target.filename) {
    config.output = config.output || {};
    config.output.filename = target.filename;
  }

  if (target.chunkFilename) {
    config.output = config.output || {};
    config.output.chunkFilename = target.chunkFilename;
  }

  if (target.runtimeChunkName) {
    config.optimization = config.optimization || {};
    config.optimization.runtimeChunk = {
      name: target.runtimeChunkName,
    };
  }

  if (splitChunks) {
    config.optimization = config.optimization || {};
    config.optimization.splitChunks = {
      chunks: 'all',
      name: false,
    };
  }

  if (htmlPlugins && htmlPlugins.length) {
    if (!config.plugins) {
      config.plugins = [];
    }
    config.plugins = config.plugins.concat(htmlPlugins);
  }
  if (externals) {
    config.externals = externals;
  }
  return config;
}

function getAssetManifestPlugin() {
  return new WebpackAssetsManifest({ entrypoints: true });
}

function generateHtmlPlugins(configs: BundlerHtmlConfig[]) {
  return configs.map((config) => generateHtmlPlugin(config));
}
function generateHtmlPlugin(config: BundlerHtmlConfig) {
  const baseConfig = {
    filename: config.filename,
    chunks: config.chunks,
    title: config.title,
    templateContent: config.templateContent,
    minify: config.minify,
    cache: false,
    chunksSortMode: 'auto' as const,
  };
  if (baseConfig.chunks && baseConfig.chunks.length) {
    // Make sure the order is that the preview root coming after the preview def
    // we can't make it like this on the entries using depend on because this will
    // prevent the splitting between different preview defs
    // @ts-ignore
    baseConfig.chunksSortMode = 'manual' as const;
  }
  const filteredConfig = omitBy(baseConfig, isUndefined);
  return new HtmlWebpackPlugin(filteredConfig);
}

export function getExternals(deps: string[]) {
  return generateExternals(deps, {
    transformName: (depName) => camelcase(depName.replace('@', '').replace('/', '-'), { pascalCase: true }),
  });
}
