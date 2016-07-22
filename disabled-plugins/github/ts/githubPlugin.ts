/// <reference path="../../includes.ts"/>
/// <reference path="githubHelpers.ts"/>

module Github {

  export var _module = angular.module(pluginName, ['hawtio-core', 'hawtio-ui', 'satellizer']);
  export var controller = PluginHelpers.createControllerFunction(_module, pluginName);
  export var route = PluginHelpers.createRoutingFunction(templatePath);

  _module.config(['$routeProvider', '$authProvider', ($routeProvider:ng.route.IRouteProvider, $authProvider) => {

    $routeProvider.when(UrlHelpers.join(context, '/organisations'), route('organisations.html', false));

    $authProvider.github({
      type: '2.0',
      authorizationEndpoint: 'https://github.com/login/oauth/authorize',
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

  _module.run(['viewRegistry', 'HawtioNav', '$auth', (viewRegistry, HawtioNav, $auth) => {
    viewRegistry['github'] = templatePath + 'layoutGithub.html';
    var token = localStorage['githubToken'];
    if (token) {
      log.debug("Setting token on $auth service");
      $auth.setToken(token);
      localStorage.removeItem('githubToken');
    }
  }]);

  hawtioPluginLoader.addModule(pluginName);

  hawtioPluginLoader.registerPreBootstrapTask({
    name: 'GithubTokenReader',
    task: (next) => {
      var uri = new URI();
      var search = uri.search(true);
      var token = search['code'];
      if (token) {
        log.debug("Found github token");
        localStorage['githubToken'] = token;
        delete search['code'];
        uri.search(search);
        window.location.href = uri.toString();
      }
      next();
    }
  });
}
