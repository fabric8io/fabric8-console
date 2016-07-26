var gulp = require('gulp'),
    through = require('through'),
    wiredep = require('wiredep').stream,
    eventStream = require('event-stream'),
    gulpLoadPlugins = require('gulp-load-plugins'),
    fs = require('fs'),
    path = require('path'),
    size = require('gulp-size'),
    uri = require('urijs'),
    urljoin = require('url-join'),
    s = require('underscore.string'),
    hawtio = require('hawtio-node-backend'),
    del = require('del'),
    vinylPaths = require('vinyl-paths'),
    stringifyObject = require('stringify-object'),
    del = require('del'),
    file = require('gulp-file'),
    path = require('path'),
    argv= require('yargs').argv,
    foreach = require('gulp-foreach');

var plugins = gulpLoadPlugins({});
var pkg = require('./package.json');
var bower = require('./bower.json');
bower.packages = {};

var config = {
  main: '.',
  ts: ['plugins/**/*.ts'],
  testTs: ['test-plugins/**/*.ts'],
  less: './plugins/**/*.less',
  templates: ['plugins/**/*.html'],
  testTemplates: ['test-plugins/**/*.html'],
  templateModule: pkg.name + '-templates',
  testTemplateModule: pkg.name + '-test-templates',
  dist: './dist/',
  site: './site/',
  js: pkg.name + '.js',
  testJs: pkg.name + '-test.js',
  css: pkg.name + '.css',
  tsProject: plugins.typescript.createProject({
    target: 'ES5',
    module: 'commonjs',
    declarationFiles: true,
    noExternalResolve: false,
    removeComments: true
  }),
  testTsProject: plugins.typescript.createProject({
    target: 'ES5',
    module: 'commonjs',
    declarationFiles: false,
    noExternalResolve: false
  }),
};

var normalSizeOptions = {
    showFiles: true
}, gZippedSizeOptions  = {
    showFiles: true,
    gzip: true
};

gulp.task('bower', function() {
  return gulp.src('index.html')
    .pipe(wiredep({}))
    .pipe(gulp.dest('.'));
});

/** Adjust the reference path of any typescript-built plugin this project depends on */
gulp.task('path-adjust', function() {
  return gulp.src('libs/**/includes.d.ts')
    .pipe(plugins.replace(/"\.\.\/libs/gm, '"../../../libs'))
    .pipe(gulp.dest('libs'));
});

gulp.task('clean-defs', function() {
  return del('defs.d.ts');
});

gulp.task('example-tsc', ['tsc'], function() {
  var tsResult = gulp.src(config.testTs)
    .pipe(plugins.typescript(config.testTsProject))
    .on('error', plugins.notify.onError({
      onLast: true,
      message: '<%= error.message =>',
      title: 'Typescript compilation error - test'
    }));

    return tsResult.js
        .pipe(plugins.concat('test-compiled.js'))
        .pipe(gulp.dest('.'));
});

gulp.task('camel-icons', function () {
  var code = '/// <reference path="../../includes.ts"/>\n' +
          '  /// <reference path="forgeHelpers.ts"/>\n' +
          '\n' +
          '  module Forge {\n\n' +
          '    export var camelIcons = loadCamelIcons();\n\n' +
          '    export var camelEndpointIcons = loadCamelEndpointIcons();\n\n' +
          '    function loadCamelIcons() {\n' +
          '      var answer = {};';

  var fs = require('fs');

  fs.readdir('libs/hawtio-integration/img/icons/camel/', function (err, files) {
    if (err) throw err;
    files.forEach(function (file) {
      if (file.endsWith(".png")) {
        code = code + "\n      answer = addCamelIcon(answer, '" + file + "');";
      }
    });

    code = code + "\n      return answer;\n  }\n\n";

    code = code + "\n" +
            '    function loadCamelEndpointIcons() {\n' +
                      '      var answer = {};';

    fs.readdir('img/icons/camel/', function (err, files) {
      if (err) throw err;
      files.forEach(function (file) {
        if (file.endsWith(".png") || file.endsWith(".svg") || file.endsWith(".jpg")) {
          code = code + "\n      answer = addCamelEndpointIcon(answer, '" + file + "');";
        }
      });

      code = code + "\n      return answer;\n  }\n\n}\n";

      var fileName = 'plugins/forge/ts/camelIcons.ts';
      fs.writeFile(fileName, code, function (err) {
        if (err) {
          return console.log(err);
        }
        console.log("Generated: " + fileName);
      });
    });
  });

});

gulp.task('example-template', ['example-tsc'], function() {
  return gulp.src(config.testTemplates)
    .pipe(plugins.angularTemplatecache({
      filename: 'test-templates.js',
      root: 'test-plugins/',
      standalone: true,
      module: config.testTemplateModule,
      templateFooter: '}]); hawtioPluginLoader.addModule("' + config.testTemplateModule + '");'
    }))
    .pipe(gulp.dest('.'));
});

gulp.task('example-concat', ['example-template'], function() {
  return gulp.src(['test-compiled.js', 'test-templates.js'])
    .pipe(plugins.concat(config.testJs))
    .pipe(gulp.dest(config.dist));
});

gulp.task('example-clean', ['example-concat'], function() {
  return del(['test-templates.js', 'test-compiled.js']);
});

gulp.task('tsc', ['clean-defs'], function() {
  var cwd = process.cwd();
  var tsResult = gulp.src(config.ts)
    .pipe(plugins.sourcemaps.init())
    .pipe(plugins.typescript(config.tsProject))
    .on('error', plugins.notify.onError({
      onLast: true,
      message: '<%= error.message %>',
      title: 'Typescript compilation error'
    }))
    .on('error', function(error) {
      argv._.forEach(function(arg) {
        if (arg === 'build') {
          throw "Compilation error, halting build";
        }
      });
    });

    return eventStream.merge(
      tsResult.js
        .pipe(plugins.concat('compiled.js'))
        .pipe(plugins.sourcemaps.write())
        .pipe(gulp.dest('.')),
      tsResult.dts
        .pipe(gulp.dest('d.ts')))
        .pipe(plugins.filter('**/*.d.ts'))
        .pipe(plugins.concatFilenames('defs.d.ts', {
          root: cwd,
          prepend: '/// <reference path="',
          append: '"/>'
        }))
        .pipe(gulp.dest('.'));
});

gulp.task('less', function () {
  return gulp.src(config.less)
    .pipe(plugins.less({
      paths: [ path.join(__dirname, 'less', 'includes') ]
    }))
    .on('error', plugins.notify.onError({
      onLast: true,
      message: '<%= error.message %>',
      title: 'less file compilation error'
    }))
    .pipe(plugins.concat(config.css))
    .pipe(gulp.dest('./dist'));
});

gulp.task('template', ['tsc'], function() {
  return gulp.src(config.templates)
    .pipe(plugins.angularTemplatecache({
      filename: 'templates.js',
      root: 'plugins/',
      standalone: true,
      module: config.templateModule,
      templateFooter: '}]); hawtioPluginLoader.addModule("' + config.templateModule + '");'
    }))
    .pipe(gulp.dest('.'));
});

gulp.task('concat', ['template'], function() {
  var gZipSize = size(gZippedSizeOptions);
  return gulp.src(['compiled.js', 'templates.js'])
    .pipe(plugins.concat(config.js))
    .pipe(plugins.ngAnnotate())
    .on('error', plugins.notify.onError({
      onLast: true,
      message: '<%= error.message %>',
      title: 'ng-annotate error'
    }))
    .pipe(gulp.dest(config.dist));
});

gulp.task('clean', ['concat'], function() {
  return del(['templates.js', 'compiled.js']);
});

gulp.task('watch', ['build', 'build-example'], function() {
  plugins.watch(['libs/**/*.js', 'libs/**/*.css', 'index.html', config.dist + '/*'], function() {
    gulp.start('reload');
  });
  plugins.watch(['libs/**/*.d.ts', config.ts, config.templates], function() {
    gulp.start(['tsc', 'template', 'concat', 'clean']);
  });
  plugins.watch([config.testTs, config.testTemplates], function() {
    gulp.start(['example-tsc', 'example-template', 'example-concat', 'example-clean']);
  });
  plugins.watch(config.less, function() {
    gulp.start('less');
  });
});

function createConnectConfig() {
  // lets disable unauthorised TLS issues with kube REST API
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

  var kubeBase = process.env.KUBERNETES_MASTER || 'http://localhost:9000';
  var kube = uri(urljoin(kubeBase, 'api'));
  var kubeapis = uri(urljoin(kubeBase, 'apis'));
  var oapi = uri(urljoin(kubeBase, 'oapi'));
  console.log("Connecting to Kubernetes on: " + kube);

  var staticAssets = [{
      path: '/',
      dir: '.'
  }];

  var dirs = fs.readdirSync('./libs');
  dirs.forEach(function(dir) {
    var dir = './libs/' + dir;
    console.log("dir: ", dir);
    if (fs.statSync(dir).isDirectory()) {
      console.log("Adding directory to search path: ", dir);
      staticAssets.push({
        path: '/',
        dir: dir
      });
    }
  });

  var localProxies = [];
  if (process.env.LOCAL_APP_LIBRARY === "true") {
    localProxies.push({
        proto: "http",
        port: "8588",
        hostname: "localhost",
        path: '/kubernetes/api/v1beta2/proxy/services/app-library',
        targetPath: "/"
      });
    console.log("because of $LOCAL_APP_LIBRARY being true we are using a local proxy for /kubernetes/api/v1beta2/proxy/services/app-library" );
  }
  if (process.env.LOCAL_APIMAN === "true") {
    localProxies.push({
        proto: "http",
        port: "8998",
        hostname: "172.30.97.49",
        path: '/api/v1beta3/namespaces/default/services/apiman',
        targetPath: "/apiman"
      });
    console.log("because of $LOCAL_APIMAN being true we are using a local proxy for /kubernetes/api/v1beta2/proxy/services/apiman" );
  }
  if (process.env.LOCAL_FABRIC8_FORGE === "true") {
    localProxies.push({
        proto: "http",
        port: "8080",
        hostname: "localhost",
        path: '/kubernetes/api/v1beta2/proxy/services/fabric8-forge',
        targetPath: "/"
      });
    console.log("because of LOCAL_FABRIC8_FORGE being true we are using a local proxy for /kubernetes/api/v1beta2/proxy/services/fabric8-forge" );
  }
  if (process.env.LOCAL_GOGS_HOST) {
    var gogsPort = process.env.LOCAL_GOGS_PORT || "3000";
    //var gogsHostName = process.env.LOCAL_GOGS_HOST + ":" + gogsPort;
    var gogsHostName = process.env.LOCAL_GOGS_HOST;
    console.log("Using gogs host: " + gogsHostName);
    localProxies.push({
        proto: "http",
        port: gogsPort,
        hostname: gogsHostName,
        path: '/kubernetes/api/v1beta2/proxy/services/gogs-http-service',
        targetPath: "/"
      });
    console.log("because of LOCAL_GOGS_HOST being set we are using a local proxy for /kubernetes/api/v1beta2/proxy/services/gogs-http-service to point to http://"
    + process.env.LOCAL_GOGS_HOST + ":" + gogsPort);
  }
  if (process.env.LOCAL_JENKINSHIFT) {
    var jenkinshiftPort = process.env.LOCAL_JENKINSHIFT_PORT || "9090";
    var jenkinshiftHost = process.env.LOCAL_JENKINSHIFT;
    var proxyPath = '/api/v1/proxy/namespaces/default/services/templates/oapi/v1';
    console.log("Using jenkinshift host: " + jenkinshiftHost);
    localProxies.push({
        proto: "http",
        port: jenkinshiftPort,
        hostname: jenkinshiftHost,
        path: proxyPath,
        targetPath: "/oapi/v1"
      });
    localProxies.push({
        proto: "http",
        port: jenkinshiftPort,
        hostname: jenkinshiftHost,
        path: "/oapi/v1",
        targetPath: "/oapi/v1"
      });
    console.log("because of LOCAL_JENKINSHIFT being set we are using a local proxy for " + proxyPath + " to point to http://"
    + jenkinshiftHost + ":" + jenkinshiftPort);
  }
  var defaultProxies = [{
    proto: kube.protocol(),
    port: kube.port(),
    hostname: kube.hostname(),
    path: '/api',
    targetPath: kube.path()
  }, {
    proto: oapi.protocol(),
    port: oapi.port(),
    hostname: oapi.hostname(),
    path: '/oapi',
    targetPath: oapi.path()
  }, {
    proto: kubeapis.protocol(),
    port: kubeapis.port(),
    hostname: kubeapis.hostname(),
    path: '/apis',
    targetPath: kubeapis.path()
  }, {
    proto: kube.protocol(),
    hostname: kube.hostname(),
    port: kube.port(),
    path: '/jolokia',
    targetPath: '/hawtio/jolokia'
  }, {
    proto: kube.protocol(),
    hostname: kube.hostname(),
    port: kube.port(),
    path: '/git',
    targetPath: '/hawtio/git'
  }];

  if (process.env.DISABLE_PROXY === "true") {
    defaultProxies = [];
    localProxies = [];
  }

  var staticProxies = localProxies.concat(defaultProxies);
  var debugLoggingOfProxy = process.env.DEBUG_PROXY === "true";
  var useAuthentication = process.env.DISABLE_OAUTH !== "true";
  var googleClientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  var googleClientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;

  return {
    port: 9000,
    staticProxies: staticProxies,
    staticAssets: staticAssets,
    fallback: 'index.html',
    liveReload: {
      enabled: true
    },
    other: {
      oapi: oapi,
      kube: kube,
      kubeBase: kubeBase,
      googleClientId: googleClientId,
      googleClientSecret: googleClientSecret,
      debugLoggingOfProxy: debugLoggingOfProxy,
      useAuthentication: useAuthentication
    }
  };
};

function getVersionString() {
  return JSON.stringify({
    name: bower.name,
    version: bower.version,
    commitId: bower.commitId,
    packages: bower.packages
  }, undefined, 2);
}

function setupAndListen(hawtio, config) {
  hawtio.setConfig(config);
  var debugLoggingOfProxy = config.other.debugLoggingOfProxy;
  var useAuthentication = config.other.useAuthentication;
  var googleClientId = config.other.googleClientId;
  var googleClientSecret = config.other.googleClientSecret;
  var oapi = config.other.oapi;
  var kube = config.other.kube;
  var kubeBase = config.other.kubeBase;

  hawtio.use('/osconsole/config.js', function(req, res, next) {
    var config = {
      api: {
        openshift: {
          proto: oapi.protocol(),
          hostPort: oapi.host(),
          prefix: oapi.path()
        },
        k8s: {
          proto: kube.protocol(),
          hostPort: kube.host(),
          prefix: kube.path()
        }
      },
      github: {
        clientId: process.env.GITHUB_OAUTH_CLIENT_ID,
        clientSecret: process.env.GITHUB_OAUTH_CLIENT_SECRET
      }

    };
    if (googleClientId && googleClientSecret) {
      console.log("Using google client ID and client secred");
      // route the client to the proxy
      config.master_uri = "http://localhost:9000";
      config.google = {
        clientId: googleClientId,
        clientSecret: googleClientSecret,
        authenticationURI: "https://accounts.google.com/o/oauth2/auth",
        authorizationURI: "https://accounts.google.com/o/oauth2/auth",
        scope: "profile",
        redirectURI: "http://localhost:9000"
      };
    } else if (useAuthentication) {
      console.log("Using openshift OAuth");
      config.master_uri = kubeBase;
      config.openshift = {
        oauth_authorize_uri: urljoin(kubeBase, '/oauth/authorize'),
        oauth_client_id: 'fabric8'
      };
    } else {
      console.log("OAuth disabled");
      config.master_uri = kubeBase;
    }
    if (process.env.DISABLE_PROXY === "true") {
      config = {
        master_uri: process.env.KUBERNETES_MASTER
      }
    } else if (process.env.USE_PROXY) {
      config.master_uri = 'http://localhost:9000';
      config.api = {
        openshift: {
          proto: 'http',
          hostPort: 'localhost:9000',
          prefix: 'oapi'
        },
        k8s: {
          proto: 'http',
          hostPort: 'localhost:9000',
          prefix: 'api'
        }
      }
    }
    var answer = "window.OPENSHIFT_CONFIG = window.HAWTIO_OAUTH_CONFIG = " + stringifyObject(config);
    res.set('Content-Type', 'application/javascript');
    res.send(answer);
  });
  hawtio.use('/version.json', function(req, res, next) {
    var answer = getVersionString();
    res.set('Content-Type', 'application/javascript');
    res.send(answer);
  });
  hawtio.use('/', function(req, res, next) {
    var path = req.originalUrl;
    // avoid returning these files, they should get pulled from js
    if (s.startsWith(path, '/plugins/') && s.endsWith(path, 'html')) {
      console.log("returning 404 for: ", path);
      res.statusCode = 404;
      res.end();
    } else {
      if (debugLoggingOfProxy) {
        console.log("allowing: ", path);
      }
      next();
    }
  });
  hawtio.listen(function(server) {
    var host = server.address().address;
    var port = server.address().port;
    console.log("started from gulp file at ", host, ":", port);
  });
};

gulp.task('connect', ['collect-dep-versions', 'watch'], function() {
  var config = createConnectConfig();
  setupAndListen(hawtio, config);
});

gulp.task('reload', function() {
  gulp.src('.')
    .pipe(hawtio.reload());
});


// site tasks

gulp.task('site-fonts', function() {
  return gulp.src(['libs/**/*.woff', 'libs/**/*.woff2', 'libs/**/*.ttf'], { base: '.' })
    .pipe(plugins.flatten())
    .pipe(plugins.chmod(644))
    .pipe(plugins.dedupe({ same: false }))
    .pipe(plugins.debug({title: 'site font files'}))
    .pipe(gulp.dest(urljoin(config.site, 'fonts/')));
});

gulp.task('swf', function() {
  return gulp.src(['libs/**/*.swf'], { base: '.' })
    .pipe(plugins.flatten())
    .pipe(plugins.chmod(644))
    .pipe(plugins.dedupe({ same: false }))
    .pipe(plugins.debug({title: 'swf files'}))
    .pipe(gulp.dest(urljoin(config.site, 'img/'), { overwrite: false }));
});

gulp.task('site-files', ['swf', 'site-fonts'], function() {
  return gulp.src(['resources/**', 'favicon.ico', 'resources/**', 'images/**', 'img/**', 'osconsole/config.*.js.tmpl'], { nodir: true, base: '.'})
    .pipe(plugins.chmod(644))
    .pipe(plugins.debug({title: 'site files'}))
    .pipe(gulp.dest(config.site));
});

gulp.task('usemin', ['site-files'], function() {
  return gulp.src('index.html')
    .pipe(plugins.usemin({
      css: [plugins.minifyCss(), 'concat'],
      js: [
        plugins.sourcemaps.init({
          loadMaps: true
        }),
        plugins.uglify(),
        plugins.rev(),
        plugins.sourcemaps.write('./')
      ],
      js1: [
        plugins.sourcemaps.init({
          loadMaps: true
        }),
        plugins.uglify(),
        plugins.rev(),
        plugins.sourcemaps.write('./')
      ]
    }))
    .pipe(plugins.debug({title: 'usemin'}))
    .pipe(gulp.dest(config.site));
});

gulp.task('site-resources', ['site-files'], function() {
  return gulp.src(['libs/*/img/**', 'libs/*/images/**', 'libs/*/resources/**'], { nodir: true, followSymlinks: false })
    .pipe(plugins.debug({title: 'site resources origin'}))
    .pipe(plugins.rename2(function (file, filePath) {
      var parts = filePath.split(path.sep);
      var libs = parts.shift();
      var plugin = parts.shift();
      var kind = parts.shift();
      var answer = urljoin(config.site, kind, parts.join('/'));
      return answer;
    }))
    .pipe(plugins.debug({title: 'site resources destination'}))
    .on('error', function(error) {
      console.log("Caught error: ", error);
    })
    .pipe(gulp.dest(config.site));

});

function getJavaConsoleName() {
  return 'v' + pkg.properties['openshift-jvm-version'] + '-build.tar.gz';
}

function getJavaConsoleDir() {
  return 'openshift-jvm-' + pkg.properties['openshift-jvm-version'] + '-build';
}

gulp.task('download-java-console', function() {
  var base = 'https://github.com/hawtio/openshift-jvm/archive/'
  var name = getJavaConsoleName();
  return plugins.remoteSrc([name], { base: base })
    .pipe(gulp.dest(config.site));
});

gulp.task('fetch-java-console', ['download-java-console'], function() {
  var name = getJavaConsoleName();
  return gulp.src([urljoin('site', name)])
    .pipe(plugins.gunzip())
    .pipe(plugins.untar())
    .pipe(plugins.debug({ title: 'java console file: '}))
    .pipe(gulp.dest('.'));

});

gulp.task('rename-java-console', ['fetch-java-console'], function() {
  var dir = getJavaConsoleDir();
  return gulp.src([urljoin('site', dir, '**')])
           .pipe(gulp.dest(urljoin(config.site, 'java/')));
});

gulp.task('delete-tmp-dir', ['rename-java-console'], function() {
  return del(urljoin('site', getJavaConsoleDir()));
});

gulp.task('delete-download-file', ['rename-java-console'], function() {
  return del(urljoin('site', getJavaConsoleName()));
});

gulp.task('update-java-console-href', ['delete-tmp-dir', 'delete-download-file'], function() {
  return gulp.src([urljoin(config.site, 'java/index.html'), urljoin(config.site, 'java/404.html')])
    .pipe(plugins.regexReplace({ regex: '<base href="/"', replace: '<base href="/java/"' }))
    .pipe(plugins.regexReplace({ regex: 'img/logo-origin-thin.svg', replace: '/img/fabric8_logo.svg' }))
    .pipe(gulp.dest(urljoin(config.site, 'java/')));
});

gulp.task('404', ['usemin'], function() {
  return gulp.src(urljoin(config.site, 'index.html'))
    .pipe(plugins.rename('404.html'))
    .pipe(gulp.dest(config.site));
});

gulp.task('tweak-urls', ['usemin'], function() {
  return gulp.src(urljoin(config.site, 'style.css'))
    .pipe(plugins.replace(/url\(\.\.\//g, 'url('))
    .pipe(plugins.replace(/url\(libs\/bootstrap\/dist\//g, 'url('))
    .pipe(plugins.replace(/url\(libs\/patternfly\/components\/bootstrap\/dist\//g, 'url('))
    .pipe(plugins.debug({title: 'tweak-urls'}))
    .pipe(gulp.dest(config.site));
});

gulp.task('collect-dep-versions', ['get-commit-id'], function() {
  return gulp.src('libs/**/.bower.json')
    .pipe(plugins.foreach(function(stream, file) {
      var pkg = JSON.parse(file.contents.toString());
      bower.packages[pkg.name] = {
        version: pkg.version
      };
      return stream;
    }));
});

gulp.task('get-commit-id', function(cb) {
  plugins.git.exec({ args: 'rev-parse HEAD'}, function(err, stdout) {
    bower.commitId = stdout.trim();
    cb();
  });
});

gulp.task('write-version-json', ['site-files', 'collect-dep-versions'], function(cb) {
  fs.writeFile(urljoin(config.site, 'version.json'), getVersionString(), cb);
});

gulp.task('copy-images', ['404', 'tweak-urls'], function() {
  var dirs = fs.readdirSync('./libs');
  var patterns = [];
  dirs.forEach(function(dir) {
    var path = './libs/' + dir + "/img";
    try {
      if (fs.statSync(path).isDirectory()) {
        console.log("found image dir: " + path);
        var pattern = 'libs/' + dir + "/img/**";
        patterns.push(pattern);
      }
    } catch (e) {
      // ignore, file does not exist
    }
  });
  return gulp.src(patterns)
           .pipe(plugins.debug({ title: 'img-copy' }))
           .pipe(plugins.chmod(644))
           .pipe(gulp.dest(urljoin(config.site, 'img/')));
});

gulp.task('serve-site', function() {
  var conf = createConnectConfig();
  var staticAssets = [{
      path: '/',
      dir: config.site
  }];
  conf.staticAssets = staticAssets;
  conf.fallback = path.join(config.site, '404.html'),
  setupAndListen(hawtio, conf);
});

gulp.task('deploy', function() {
  return gulp.src([urljoin(config.site, '**'), urljoin(config.site, '**/*.*'), urljoin(config.site, '*.*')], { base: 'site' })
    .pipe(plugins.debug({title: 'deploy'}))
    .pipe(plugins.ghPages({
      branch: 'builds',
      push: false,
      message: "[ci skip] Update site"
    }));
});

gulp.task('site', ['site-fonts', 'swf', 'site-files', 'usemin', 'site-resources', 'tweak-urls', '404', 'copy-images', 'fetch-java-console', 'rename-java-console', 'delete-tmp-dir', 'update-java-console-href', 'write-version-json']);

gulp.task('build', ['bower', 'path-adjust', 'tsc', 'less', 'template', 'concat', 'clean']);

gulp.task('build-example', ['example-tsc', 'example-template', 'example-concat', 'example-clean']);

gulp.task('default', ['connect']);



