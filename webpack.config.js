const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');

// Flag to enable bundle analysis
const ANALYZE_BUNDLE = process.env.ANALYZE === 'true';
const isProduction = process.env.NODE_ENV === 'production';

const baseConfig = {
  entry: './src/index.ts',
  plugins: [
    new HtmlWebpackPlugin({
      title: 'base64-encoded-state-in-url-test',
      template: './src/index.html'
    }),
    new MiniCssExtractPlugin({
      filename: '[name].[contenthash].css',
      chunkFilename: '[id].[contenthash].css',
    }),
  ],
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@state': path.resolve(__dirname, 'src/state'),
      '@components': path.resolve(__dirname, 'src/components'),
      '@utils': path.resolve(__dirname, 'src/utils'),
    }
  },
  output: {
    filename: '[name].[contenthash].js',
    path: path.resolve(__dirname, 'dist'),
    clean: true,
    chunkFilename: '[name].[contenthash].chunk.js',
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: [
          {
            loader: 'ts-loader',
            options: {
              transpileOnly: true,
            },
          },
        ],
        exclude: /node_modules/,
      },
      {
        test: /\.css$/i,
        use: [
          // Use MiniCssExtractPlugin in production, style-loader in development
          isProduction ? MiniCssExtractPlugin.loader : 'style-loader',
          'css-loader',
        ],
      },
    ],
  },
  optimization: {
    // Enable tree shaking
    usedExports: true,
    // Minimize in production
    minimize: isProduction,
    // Split chunks for better caching
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        // Split vendor chunks
        vendors: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          priority: -10,
          chunks: 'all',
        },
        // Split common dependencies
        common: {
          test: /[\\/]node_modules[\\/](pubsub-js|fuse\.js|uuid|buffer)[\\/]/,
          name: 'common',
          priority: 10,
          chunks: 'all',
        },
      },
    },
  },
  devServer: {
    watchFiles: ["src/*.html", "src/**/*.ts", "src/**/*.css"],
    hot: true,
  },
  devtool: isProduction ? false : 'source-map',
};

// Add bundle analyzer in analysis mode
if (ANALYZE_BUNDLE) {
  baseConfig.plugins.push(new BundleAnalyzerPlugin());
}

module.exports = baseConfig;
