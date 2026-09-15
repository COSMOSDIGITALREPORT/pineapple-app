const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('path');

const projectRoot = __dirname;
const realRoot = 'd:/cosmos internship/pineapple-app/pineappleandroidgirls';

const config = {
  watchFolders: [
    path.resolve(projectRoot),
    path.resolve(realRoot),
    path.resolve(realRoot, 'node_modules'),
    path.resolve(realRoot, 'node_modules/metro-runtime'),
  ],
  resolver: {
    nodeModulesPaths: [
      path.resolve(projectRoot, 'node_modules'),
      path.resolve(realRoot, 'node_modules'),
    ],
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
