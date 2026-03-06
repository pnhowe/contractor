const path = require('path');
const webpack = require('webpack');

const settings = {
  entry: "./src/frontend/index.js",
  output: {
    filename: "[name].js",
    publicPath: "/",
    path: path.resolve("build")
  },
  resolve: {
    extensions: [".js", ".json", ".css"]
  },
  devtool: "eval-source-map",
  module: {
    rules: [
      {
        test: /\.js?$/,
        loader: 'babel-loader',
        exclude: /node_modules/,
        options: {
          presets: [
            "@babel/preset-env",
            "@babel/preset-react"
          ],
          plugins: [
            "@babel/plugin-proposal-class-properties",
            "@babel/plugin-transform-runtime"
          ]
        }
      },
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"]
      },
    ]
  },
  devServer: {
    static: path.resolve("src/www"),
    hot: true,
    historyApiFallback: true,
  },
  plugins: [
    new webpack.HotModuleReplacementPlugin(),
  ],
};

module.exports = settings;
