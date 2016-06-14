/// <reference path="dozerHelpers.ts"/>
/// <reference path="schemaConfigure.ts"/>

module Dozer {

  export var _module = angular.module(pluginName, []);

  _module.constant('dozerPaths', ['/workspaces/:namespace/projects/:projectId/forge']);

  _module.run((SchemaRegistry) => {
    Dozer.schemaConfigure(SchemaRegistry);
    log.debug("running");
  });

  hawtioPluginLoader.addModule(pluginName);

}
