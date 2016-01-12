/// <reference path="angular2Plugin.ts"/>

module Angular2Core {


  // ignore everything in this file for now, nothing to see here, please move along


  var log = Logger.get('angular2-router-shim');

  // pull out ngRoute and hawtio-nav from plugin list so we don't use any of that stuff
  // also our module needs to be near the front of the list so our providers are available
  /*
  hawtioPluginLoader.registerPreBootstrapTask({
    name: 'disable-ngroute',
    depends: ['angular2-bootstrap'],
    task: (next) => {
      var modules = (<any>hawtioPluginLoader).modules;
      _.remove(modules, (name) => {
        log.debug("Checking module name: ", name);
        //return name === 'ngRoute' || name === 'hawtio-nav' || name === pluginName;
        return name === pluginName;
      });
      var index = modules.indexOf('ngRoute');
      modules.splice(index + 1, 0, pluginName);
      log.debug("Modules: ", modules); 
      next();
    }
  });
  */

  var routes:any = {};

  // shim for $route
  class DummyRouteProvider {

    constructor() {
      log.debug("Created dummy $routeProvider");
    }
    public caseInsensitiveMatch = false;

    private router = new Promise((resolve, reject) => {
      bootstrap.then((ref) => {
        var injector = ref.injector;
        var router = injector.get(ng.router.Router);
        resolve(router);
      });
    });

    public $get = ['$rootScope', ($rootScope) => {
      var $route = {
        reload: () => {

        },
        updateParams: (newParams) => {

        }
      };
      $rootScope.$on('$locationChangeStart', ($event) => { this.prepareRoute($event, $rootScope); });
      $rootScope.$on('$locationChangeSuccess', ($event) => { this.commitRoute($event, $rootScope); });
      return $route;
    }];

    public prepareRoute($locationEvent, $rootScope) {
      $rootScope.$broadcast('$routeChangeStart');
    }

    public commitRoute($locationEvent, $rootScope) {
      $rootScope.$broadcast('$routeChangeSuccess');
    }

    public when(path, route) {
      routes[path] = route;
      this.router.then((router) => {
        router.config([{
          path: path,
          component: Angular1ViewShim
        }]).then(() => {
          log.debug("Added route for path: ", path);
        }, (reason) => {
          log.debug("failed to add route for path: ", path, " reason: ", reason);
        });
      });
      return this;
    }

    public otherwise(params) {
      routes['null'] = params;
      return this;
    }
  }; 

  // _module.provider('$route', DummyRouteProvider);



  // this copies stuff into the angular2 router, won't be necessary
  /*
  _module.config(['$provide', ($provide) => {
    log.debug("RootComponent: ", RootComponent);
    var paths = [];
    $provide.decorator('$route', ['$delegate', '$q', ($delegate, $q) => {
      log.debug("Current routes: ", $delegate);
      _.forOwn($delegate.routes, (routeConfig, path) => {
        if (path !== 'null' && 
            !_.endsWith(path, '/') &&
            !_.startsWith(path, '/workspaces/:workspace/projects/:project')) {
          paths.push(path);
        }
      });

      var routes:any = _.map(paths, (path) => {
        return {
          path: path,
          component: Angular1ViewShim,
        };
      });

      bootstrap.then((ref) => {
        log.debug("componentRef: ", ref);
        _.forEach(routes, (route:any) => {
          log.debug("Route: ", route.path);
        });
        var injector = ref.injector;
        var router = injector.get(ng.router.Router);
        router.config(routes).then(() => {
          log.debug("Added angular1 routes to angular2 router");
        });
      });

      return $delegate;
    }]);
  }]);
  */


}
