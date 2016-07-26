/// <reference path="../../includes.ts"/>
/// <reference path="githubHelpers.ts"/>

module Github {

  export var _module = angular.module(pluginName, []);
  export var controller = PluginHelpers.createControllerFunction(_module, pluginName);
  export var route = PluginHelpers.createRoutingFunction(templatePath);

  _module.config(['$routeProvider', ($routeProvider:ng.route.IRouteProvider) => {
    $routeProvider.when(UrlHelpers.join(context, '/organisations'), route('organisations.html', false));
  }]);

  _module.run(['viewRegistry', 'HawtioNav', (viewRegistry, HawtioNav) => {
    viewRegistry['github'] = templatePath + 'layoutGithub.html';
  }]);

  hawtioPluginLoader.addModule(pluginName);

}
