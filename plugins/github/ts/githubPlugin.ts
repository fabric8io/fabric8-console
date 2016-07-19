/// <reference path="../../includes.ts"/>
/// <reference path="githubHelpers.ts"/>

module Github {

  export var _module = angular.module(pluginName, ['hawtio-core', 'hawtio-ui', 'satellizer']);
  export var controller = PluginHelpers.createControllerFunction(_module, pluginName);
  export var route = PluginHelpers.createRoutingFunction(templatePath);

  _module.config(['$routeProvider', '$authProvider', ($routeProvider:ng.route.IRouteProvider, $authProvider) => {

    $routeProvider.when(UrlHelpers.join(context, '/organisations'), route('organisations.html', false));

    $authProvider.github({
      clientId: githubClientId
      //redirectUri: window.location.origin
    });

/*
    $authProvider.github({
      url: '/auth/github',
      authorizationEndpoint: 'https://github.com/login/oauth/authorize',
      redirectUri: window.location.origin,
      optionalUrlParams: ['scope'],
      scope: ['user:email'],
      scopeDelimiter: ' ',
      type: '2.0',
      popupOptions: { width: 1020, height: 618 }
    });
*/

  }]);

  _module.run(['viewRegistry', 'HawtioNav', (viewRegistry, HawtioNav) => {
    viewRegistry['github'] = templatePath + 'layoutGithub.html';
  }]);

  hawtioPluginLoader.addModule(pluginName);
}
