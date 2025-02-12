import webpack from 'webpack'
import packageJson from './package.json'
import MiniCssExtractPlugin from 'mini-css-extract-plugin'
import HtmlWebpackPlugin from 'html-webpack-plugin'
import TerserPlugin from 'terser-webpack-plugin'
import autoprefixer from 'autoprefixer'
import customMedia from 'postcss-custom-media'
import url from 'postcss-url'
import mapObject from 'object-loops/map'
import mapKeys from 'object-loops/map-keys'
import SpeedMeasurePlugin from 'speed-measure-webpack-plugin'
import { BundleAnalyzerPlugin } from 'webpack-bundle-analyzer'
import Visualizer from 'webpack-visualizer-plugin'
import { dirname, relative, resolve, basename, path } from 'path'
import nodeExternals from 'webpack-node-externals'
import CopyPlugin from 'copy-webpack-plugin'

// NODE_ENV can be one of: development | staging | test | production
const NODE_ENV = process.env.NODE_ENV || 'production'

// TEST_ENV can be one of: undefined | deployment when NODE_ENV=test
const TEST_ENV = process.env.TEST_ENV

// For production, test, and staging we should build production ready code
// i.e. fully minified so that testing staging is as realistic as possible
const PRODUCTION_BUILD = NODE_ENV !== 'development'

const SDK_TOKEN_FACTORY_SECRET = process.env.SDK_TOKEN_FACTORY_SECRET || 'NA'

const SDK_ENV = process.env.SDK_ENV || 'idv'

const baseRules = () => {
  return [
    {
      test: /\.(js|ts)x?$/,
      loader: 'babel-loader',
      options: { configFile: resolve('.babelrc') },
      include: [
        resolve('src'),
        resolve('node_modules/@onfido/castor'),
        resolve('node_modules/@onfido/castor-react'),
        resolve('node_modules/strip-ansi'),
        resolve('node_modules/ansi-regex'),
      ],
    },
  ]
}

const baseStyleLoaders = (modules, withSourceMap) => [
  //ref: https://github.com/unicorn-standard/pacomo The standard used for naming the CSS classes
  //ref: https://github.com/webpack/loader-utils#interpolatename The parsing rules used by webpack
  {
    loader: 'css-loader',
    options: {
      sourceMap: withSourceMap,
      modules: modules
        ? {
            getLocalIdent: (context, localIdentName, localName) => {
              const basePath = relative(
                `${__dirname}/src/components`,
                context.resourcePath
              )
              const baseDirFormatted = dirname(basePath).replace('/', '-')
              return `onfido-sdk-ui-${baseDirFormatted}-${localName}`
            },
          }
        : modules,
    },
  },
  {
    loader: 'postcss-loader',
    options: {
      plugins: () => [
        customMedia({
          importFrom: `${__dirname}/src/components/Theme/custom-media.css`,
        }),
        autoprefixer(),
        url({ url: 'inline' }),
      ],
      sourceMap: withSourceMap,
    },
  },
  {
    loader: 'sass-loader',
    options: {
      sourceMap: withSourceMap,
    },
  },
]

const baseStyleRules = ({
  disableExtractToFile = false,
  withSourceMap = true,
} = {}) =>
  [
    {
      rule: 'exclude',
      modules: true,
    },
    {
      rule: 'include',
      modules: false,
    },
  ].map(({ rule, modules }) => ({
    test: /\.(css|scss)$/,
    [rule]: [`${__dirname}/node_modules`],
    use: [
      disableExtractToFile || !PRODUCTION_BUILD
        ? 'style-loader'
        : MiniCssExtractPlugin.loader,
      ...baseStyleLoaders(modules, withSourceMap),
    ],
  }))

const WOOPRA_DEV_DOMAIN = 'dev-onfido-js-sdk.com'
const WOOPRA_DOMAIN = 'onfido-js-sdk.com'

const PROD_CONFIG = {
  ONFIDO_API_URL: 'https://api.onfido.com',
  ONFIDO_SDK_URL: 'https://sdk.onfido.com',
  ONFIDO_TERMS_URL: 'https://onfido.com/termsofuse',
  JWT_FACTORY: 'https://token-factory.onfido.com/sdk_token',
  US_JWT_FACTORY: 'https://token-factory.us.onfido.com/sdk_token',
  CA_JWT_FACTORY: 'https://token-factory.ca.onfido.com/sdk_token',
  DESKTOP_SYNC_URL: 'https://sync.onfido.com',
  MOBILE_URL: 'https://id.onfido.com',
  SMS_DELIVERY_URL: 'https://telephony.onfido.com',
  PUBLIC_PATH: `https://assets.onfido.com/web-sdk-releases/${packageJson.version}/`,
  USER_CONSENT_URL: 'https://assets.onfido.com/consent/user_consent.html',
  AUTH_URL: 'https://api.eu.onfido.com',
  RESTRICTED_XDEVICE_FEATURE_ENABLED: true,
  WOOPRA_DOMAIN,
}

const TEST_DEPLOYMENT_CONFIG = {
  ...PROD_CONFIG,
  PUBLIC_PATH: '/',
  MOBILE_URL: '/',
  RESTRICTED_XDEVICE_FEATURE_ENABLED: false,
  WOOPRA_DOMAIN: WOOPRA_DEV_DOMAIN,
}

const TEST_E2E_CONFIG = {
  ...TEST_DEPLOYMENT_CONFIG,
  ONFIDO_API_URL: 'https://localhost:8080/api',
  JWT_FACTORY: 'https://localhost:8080/token-factory/sdk_token',
  US_JWT_FACTORY: 'https://localhost:8080/token-factory/sdk_token',
  CA_JWT_FACTORY: 'https://localhost:8080/token-factory/sdk_token',
  SMS_DELIVERY_URL: 'https://localhost:8080/telephony',
}

const STAGING_CONFIG = {
  ONFIDO_API_URL: 'https://api.eu-west-1.dev.onfido.xyz',
  ONFIDO_SDK_URL: 'https://mobile-sdk.eu-west-1.dev.onfido.xyz',
  ONFIDO_TERMS_URL: 'https://dev.onfido.com/termsofuse',
  JWT_FACTORY: 'https://sdk-token-factory.eu-west-1.dev.onfido.xyz/sdk_token',
  US_JWT_FACTORY:
    'https://sdk-token-factory.eu-west-1.dev.onfido.xyz/sdk_token',
  CA_JWT_FACTORY:
    'https://sdk-token-factory.eu-west-1.dev.onfido.xyz/sdk_token',
  DESKTOP_SYNC_URL: 'https://cross-device-sync.eu-west-1.dev.onfido.xyz',
  MOBILE_URL: '/',
  SMS_DELIVERY_URL: 'https://telephony.eu-west-1.dev.onfido.xyz',
  PUBLIC_PATH: '/',
  AUTH_URL: 'https://api-gateway.eu-west-1.dev.onfido.xyz/',
  RESTRICTED_XDEVICE_FEATURE_ENABLED: false,
  WOOPRA_DOMAIN: WOOPRA_DEV_DOMAIN,

  // @TODO: clean-up this config when v4 APIs are live
  USE_V4_APIS_FOR_DOC_VIDEO: process.env.USE_V4_APIS_FOR_DOC_VIDEO,
}

const DEVELOPMENT_CONFIG = {
  ...PROD_CONFIG,
  PUBLIC_PATH: '/',
  MOBILE_URL: '/',
  RESTRICTED_XDEVICE_FEATURE_ENABLED: false,
  WOOPRA_DOMAIN: WOOPRA_DEV_DOMAIN,
}

const CONFIG_MAP = {
  development: DEVELOPMENT_CONFIG,
  staging: STAGING_CONFIG,
  test: TEST_ENV === 'deployment' ? TEST_DEPLOYMENT_CONFIG : TEST_E2E_CONFIG,
  production: PROD_CONFIG,
}

const CONFIG = CONFIG_MAP[NODE_ENV]

const formatDefineHash = (defineHash) =>
  mapObject(
    mapKeys(defineHash, (key) => `process.env.${key}`),
    (value) => JSON.stringify(value)
  )
const WOOPRA_WINDOW_KEY = 'onfidoSafeWindow8xmy484y87m239843m20'

const basePlugins = (bundle_name = '') => [
  new Visualizer({
    filename: `./reports/statistics.html`,
  }),
  new BundleAnalyzerPlugin({
    analyzerMode: 'static',
    openAnalyzer: false,
    reportFilename: `${__dirname}/dist/reports/bundle_${
      bundle_name === 'npm' ? 'npm_size.html' : `${SDK_ENV}_dist_size.html`
    }`,
    defaultSizes: 'gzip',
  }),
  new webpack.NoEmitOnErrorsPlugin(),
  new webpack.DefinePlugin(
    formatDefineHash({
      ...CONFIG,
      NODE_ENV,
      SDK_ENV,
      PRODUCTION_BUILD,
      SDK_VERSION: packageJson.version,
      // We use a Base 32 version string for the cross-device flow, to make URL
      // string support easier...
      // ref: https://en.wikipedia.org/wiki/Base32
      // NOTE: please leave the BASE_32_VERSION be! It is updated automatically by
      // the release script 🤖
      BASE_32_VERSION: 'CN',
      PRIVACY_FEATURE_ENABLED: false,
      JWT_FACTORY: CONFIG.JWT_FACTORY,
      US_JWT_FACTORY: CONFIG.US_JWT_FACTORY,
      CA_JWT_FACTORY: CONFIG.CA_JWT_FACTORY,
      SDK_TOKEN_FACTORY_SECRET,
      WOOPRA_WINDOW_KEY,
      WOOPRA_IMPORT: `imports-loader?this=>${WOOPRA_WINDOW_KEY},window=>${WOOPRA_WINDOW_KEY}!wpt/wpt.min.js`,
    })
  ),
]

const baseConfig = {
  mode: PRODUCTION_BUILD ? 'production' : 'development',
  context: `${__dirname}/src`,
  entry: './index.tsx',

  resolve: {
    extensions: ['.jsx', '.js', '.tsx', '.ts', '.scss', '.json'],
    modules: [`${__dirname}/node_modules`, `${__dirname}/src`],
    alias: {
      react: 'preact/compat',
      'react-dom': 'preact/compat',
      '~contexts': `${__dirname}/src/contexts`,
      '~locales': `${__dirname}/src/locales`,
      '~types': `${__dirname}/src/types`,
      '~utils': `${__dirname}/src/components/utils`,
      '~auth-sdk': `${__dirname}/auth-sdk/FaceTec`,
      'socket.io-client': resolve(
        'node_modules/socket.io-client/dist/socket.io.js'
      ),
    },
  },

  optimization: {
    nodeEnv: false, // otherwise it gets set by mode, see: https://webpack.js.org/concepts/mode/
  },

  stats: {
    colors: true,
    // Examine all modules
    maxModules: Infinity,
    // Display bailout reasons
    optimizationBailout: false,
  },

  node: {
    global: true,
    process: false,
    Buffer: false,
    __filename: false,
    __dirname: false,
    setImmediate: false,
  },

  devtool: PRODUCTION_BUILD ? 'source-map' : 'eval-cheap-source-map',
}

const configDist = () => ({
  ...baseConfig,

  entry: {
    [`onfido${SDK_ENV === 'Auth' ? SDK_ENV : ''}`]: './index.tsx',
    demo: './demo/demo.tsx',
    previewer: './demo/previewer.tsx',
  },

  output: {
    library: `Onfido${SDK_ENV === 'Auth' ? SDK_ENV : ''}`,
    libraryTarget: 'umd',
    path: `${__dirname}/dist`,
    publicPath: CONFIG.PUBLIC_PATH,
    filename: '[name].min.js',
    chunkFilename: `onfido${SDK_ENV === 'Auth' ? SDK_ENV : ''}.[name].min.js`,
  },
  module: {
    rules: [
      ...baseRules(),
      ...baseStyleRules(),
      {
        test: /\.(svg|woff2?|ttf|eot|jpe?g|png|gif)(\?.*)?$/i,
        use: ['file-loader?name=images/[name]_[hash:base64:5].[ext]'],
      },
    ],
  },

  optimization: {
    minimizer: [
      ...(PRODUCTION_BUILD
        ? [
            new TerserPlugin({
              cache: true,
              parallel: true,
              sourceMap: true,
              terserOptions: {
                output: {
                  preamble: `/* Onfido${
                    SDK_ENV === 'Auth' ? SDK_ENV : 'IDV'
                  } SDK ${packageJson.version} */`,
                  comments: '/^!/',
                },
              },
              extractComments: {
                condition: /^\**!|@preserve|@license|@cc_on/i,
                filename: (filename) => {
                  const filenameNoExtension = basename(filename, '.min.js')
                  return `${filenameNoExtension}.LICENSES.txt`
                },
                banner: (licenseFile) => {
                  return `License information can be found in ${licenseFile}`
                },
              },
            }),
          ]
        : []),
    ],
  },

  plugins: [
    ...basePlugins(),
    ...(SDK_ENV === 'Auth'
      ? [
          new CopyPlugin({
            patterns: [
              {
                from: `${__dirname}/auth-sdk`,
                to: `${__dirname}/dist/auth-sdk`,
              },
            ],
          }),
        ]
      : []),
    new MiniCssExtractPlugin({
      filename: 'style.css',
      chunkFilename: `onfido${SDK_ENV === 'Auth' ? SDK_ENV : ''}.[name].css`,
    }),
    new HtmlWebpackPlugin({
      template: './demo/demo.ejs',
      filename: 'index.html',
      minify: { collapseWhitespace: true },
      inject: 'body',
      JWT_FACTORY: CONFIG.JWT_FACTORY,
      DESKTOP_SYNC_URL: CONFIG.DESKTOP_SYNC_URL,
      chunks: ['onfido', 'demo'],
    }),
    new HtmlWebpackPlugin({
      template: './demo/previewer.ejs',
      filename: 'previewer/index.html',
      minify: { collapseWhitespace: true },
      inject: 'body',
      JWT_FACTORY: CONFIG.JWT_FACTORY,
      DESKTOP_SYNC_URL: CONFIG.DESKTOP_SYNC_URL,
      chunks: ['previewer'],
    }),
    ...(PRODUCTION_BUILD
      ? [
          new webpack.LoaderOptionsPlugin({
            minimize: true,
            debug: false,
          }),
        ]
      : []),
  ],

  devServer: {
    port: process.env.PORT || 8080,
    host: '0.0.0.0',
    publicPath: '/',
    contentBase: './dist',
    historyApiFallback: true,
    disableHostCheck: true, // necessary to test in IE with virtual box, since it goes through a proxy, see: https://github.com/webpack/webpack-dev-server/issues/882
  },
})

const configNpmLib = () => ({
  ...baseConfig,
  name: 'npm-library',
  output: {
    libraryTarget: 'commonjs2',
    path: `${__dirname}/lib`,
    filename: 'index.js',
  },
  module: {
    rules: [
      ...baseRules(),
      ...baseStyleRules({
        disableExtractToFile: true,
        withSourceMap: false,
      }),
    ],
  },
  plugins: [
    ...basePlugins('npm'),
    new webpack.optimize.LimitChunkCountPlugin({
      maxChunks: 1,
    }),
  ],
  target: 'node',
  externals: [
    nodeExternals({
      modulesFromFile: {
        include: ['dependencies'],
      },
    }),
  ],
})

const smp = new SpeedMeasurePlugin()

export default SDK_ENV === 'Auth'
  ? [smp.wrap(configDist())]
  : [smp.wrap(configDist()), configNpmLib()]
