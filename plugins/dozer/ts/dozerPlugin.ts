/// <reference path="dozerHelpers.ts"/>
/// <reference path="schemaConfigure.ts"/>

module Dozer {

  export var _module = angular.module(pluginName, []);

  _module.constant('dozerPaths', ['/workspaces/:namespace/projects/:project/forge']);

  _module.run(() => {
    Dozer.schemaConfigure();
    log.debug("running");
  });

  hawtioPluginLoader.addModule(pluginName);

}
