const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';
  
  return {
    entry: {
      background: './src/background/background.ts',
      content: './src/content/content.ts',
      popup: './src/popup/popup.ts'
    },
    
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: '[name].js',
      clean: true,
    },
    
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: 'ts-loader',
          exclude: /node_modules/,
        },
        {
          test: /\.css$/,
          use: [MiniCssExtractPlugin.loader, 'css-loader'],
        },
        {
          test: /\.(png|jpg|jpeg|gif|svg|ico)$/,
          type: 'asset/resource',
          generator: {
            filename: 'images/[name][ext]'
          }
        }
      ],
    },
    
    resolve: {
      extensions: ['.tsx', '.ts', '.js'],
      alias: {
        '@': path.resolve(__dirname, 'src'),
        '@/utils': path.resolve(__dirname, 'src/utils'),
        '@/content': path.resolve(__dirname, 'src/content'),
        '@/popup': path.resolve(__dirname, 'src/popup'),
        '@/background': path.resolve(__dirname, 'src/background')
      }
    },
    
    plugins: [
      new CopyWebpackPlugin({
        patterns: [
          {
            from: 'public',
            to: '.',
            globOptions: {
              ignore: ['**/.DS_Store']
            }
          }
        ],
      }),
      
      new HtmlWebpackPlugin({
        template: './src/popup/popup.html',
        filename: 'popup.html',
        chunks: ['popup'],
        inject: 'body'
      }),
      
      ...[
        new MiniCssExtractPlugin({
          filename: '[name].css'
        })
      ]
    ],
    
    optimization: {
      minimize: isProduction,
    },
    
    devtool: isProduction ? false : 'cheap-module-source-map',
    
    // Chrome extension specific settings
    target: 'web',
    
    stats: {
      errorDetails: true,
    }
  };
};