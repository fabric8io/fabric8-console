
/// <reference path="angular2Exports.ts"/>
/// <reference path="rootComponent.ts"/>

module Angular2Core {

  export var _module = angular.module(pluginName, []);

  export var bootstrap = new Promise((resolve, reject) => {
    log.debug("Bootstrapping angular2");
    log.debug("ng: ", ng);
    ng.platform.browser.bootstrap(RootComponent, [].concat(ng.router.ROUTER_PROVIDERS)).then((ref) => {
      resolve(ref);
    });

  });

  hawtioPluginLoader.registerPreBootstrapTask({
    name: 'angular2-bootstrap',
    task: (next) => {
      bootstrap.then((ref) => {
        log.debug("Angular 2 bootstrapped, root component: ", ref);
        next();
      });
    }
  });

  hawtioPluginLoader.addModule(pluginName);

}
