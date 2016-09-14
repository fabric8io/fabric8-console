/// <reference path="mainPlugin.ts"/>

module Main {
  var defaultBranding = 'fabric8-branding';
  hawtioPluginLoader.registerPreBootstrapTask({
    name: 'ConsoleBranding',
    depends: 'KubernetesApiInit',
    task: (next) => {
      var config = window['OPENSHIFT_CONFIG'];
      var branding = defaultBranding;
      if (config) {
        branding = <string>_.get(config, 'branding.kind') || defaultBranding;
      }
      log.info("Using branding: ", branding);
      hawtioPluginLoader.addModule(branding);
      next();
    }
  });

  var branding = angular.module('hawtio-branding', []);
  branding.run((HawtioBranding, $document) => {
    Logger.get('hawtio-branding').debug("Loaded");
    if (angular.isFunction(HawtioBranding.load)) {
      HawtioBranding.load(HawtioBranding);
    }
  });

  var fabric8Branding = angular.module(defaultBranding, ['hawtio-branding']);
  fabric8Branding.constant('HawtioBranding', {
    kind: 'fabric8-branding',
    appName: 'fabric8-console',
    appLogo: 'resources/branding/fabric8/img/fabric8_logo_white.svg',
    favIcon: 'resources/branding/fabric8/img/favicon.ico',
    css: 'resources/branding/fabric8/style.css',
    load: (self) => {
      Logger.get('fabric8-branding').debug("Applied");
    }
  });

  var redhatBranding = angular.module('redhat-branding', ['hawtio-branding']);
  redhatBranding.constant('HawtioBranding', {
    kind: 'redhat-branding',
    appName: 'Red Hat iPaas Console',
    appLogo: 'resources/branding/redhat/img/test.svg',
    favIcon: 'resources/branding/redhat/img/favicon.ico',
    css: 'resources/branding/redhat/style.css',
    load: (self) => {
      Logger.get('redhat-branding').debug("Applied");
    }
  });

}
