/// <reference path="../../includes.ts"/>
/// <reference path="forgeHelpers.ts"/>

module Forge {

  export var _module = angular.module(pluginName, ['hawtio-core', 'hawtio-ui']);
  export var controller = PluginHelpers.createControllerFunction(_module, pluginName);
  export var route = PluginHelpers.createRoutingFunction(templatePath);

  _module.config(['$routeProvider', ($routeProvider:ng.route.IRouteProvider) => {

    //console.log("Listening on: " + UrlHelpers.join(context, '/createProject'));

    $routeProvider.when(UrlHelpers.join(context, '/createProject'), route('createProject.html', false))
      .when(UrlHelpers.join(context, '/repos/:path*'), route('repo.html', false))
      .when(UrlHelpers.join(context, '/repos'), route('repos.html', false));

    angular.forEach([context, '/workspaces/:namespace/projects/:project/forge', '/workspaces/:namespace/forge'], (path) => {
      $routeProvider
        .when(UrlHelpers.join(path, '/commands'), route('commands.html', false))
        .when(UrlHelpers.join(path, '/commands/:path*'), route('commands.html', false))
        .when(UrlHelpers.join(path, '/command/:id'), route('command.html', false))
        .when(UrlHelpers.join(path, '/command/:id/:path*'), route('command.html', false));
    });

    angular.forEach([context, '/workspaces/:namespace/projects/:project/forge', '/workspaces/:namespace/projects/forge'], (path) => {
      $routeProvider
        .when(UrlHelpers.join(path, '/secrets'), route('secrets.html', false))
        .when(UrlHelpers.join(path, '/secretsRequired'), route('secretsRequired.html', false));
    });

    // project perspectives
    angular.forEach(['/workspaces/:namespace/projects/:project/forge'], (path) => {
      $routeProvider
        .when(UrlHelpers.join(path, '/camelOverview'), route('camelOverview.html', false))
        .when(UrlHelpers.join(path, '/camelRoutes'), route('camelRoutes.html', false))
        .when(UrlHelpers.join(path, '/camelAddComponent'), route('camelAddComponent.html', false))
        .when(UrlHelpers.join(path, '/camelAddEndpoint'), route('camelAddEndpoint.html', false))
        .when(UrlHelpers.join(path, '/funktionOverview'), route('funktionOverview.html', false));
    });

  }]);

  _module.factory('ForgeApiURL', ['$q', '$rootScope', ($q:ng.IQService, $rootScope:ng.IRootScopeService) => {
    return Kubernetes.kubernetesApiUrl() + "/proxy" + Kubernetes.kubernetesNamespacePath() + "/services/fabric8-forge:80/api/forge";
  }]);


  _module.factory('ForgeProject', ['$q', '$rootScope', ($q:ng.IQService, $rootScope:ng.IRootScopeService) => {
    return new ForgeProjectService();
  }]);


  _module.factory('ForgeModel', ['$q', '$rootScope', ($q:ng.IQService, $rootScope:ng.IRootScopeService) => {
    return {
      rootProject: {},
      projects: []
    }
  }]);

  _module.run(['viewRegistry', 'HawtioNav', (viewRegistry, HawtioNav) => {
    viewRegistry['forge'] = templatePath + 'layoutForge.html';
  }]);

  hawtioPluginLoader.addModule(pluginName);
}
