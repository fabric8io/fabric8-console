// <reference path="../../includes.ts"/>
module Github {

  export var context = '/github';

  export var hash = '#' + context;
  export var pluginName = 'Github';
  export var pluginPath = 'plugins/github/';
  export var templatePath = pluginPath + 'html/';
  export var log:Logging.Logger = Logger.get(pluginName);

  export function initScope($scope, $location, $routeParams) {

  }
}
