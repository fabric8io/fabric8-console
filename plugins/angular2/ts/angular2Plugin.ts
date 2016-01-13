
/// <reference path="angular2Exports.ts"/>
/// <reference path="angular2Helpers.ts"/>

module Angular2Core {

  export var _module = angular.module(pluginName, []);

  hawtioPluginLoader.registerPreBootstrapTask((next) => {
    if (HawtioCore.UpgradeAdapter) {
      log.debug("Adding HTTP and Router providers");
      HawtioCore.UpgradeAdapter.addProvider(ng.http.HTTP_PROVIDERS);
      HawtioCore.UpgradeAdapter.addProvider(ng.router.ROUTER_PROVIDERS);
    }
    next();
  });

  /*
  hawtioPluginLoader.registerPreBootstrapTask((next) => {
    ng.router.ROUTER_DIRECTIVES.forEach((directive) => {
      _module.directive(_.camelCase(directive.name), HawtioCore.UpgradeAdapter.downgradeNg2Component(directive));
    });
  });
  */

  hawtioPluginLoader.addModule(pluginName);

}
