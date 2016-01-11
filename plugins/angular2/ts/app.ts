
declare var ng:any;
declare var Reflect:any;

module Angular2Core {

  var templatePath = 'plugins/angular2/html';
  var log = Logger.get('angular2-core');
  var pluginName = 'hawtio-angular2-shim';

  var _module = angular.module(pluginName, []);

  _module.config(['$provide', ($provide) => {
    $provide.decorator('$route', ['$delegate', ($delegate) => {
      /*
      log.debug("Current routes: ", $delegate);
      _.forOwn($delegate.routes, (routeConfig, path) => {
        log.debug("Path: ", path, " routeConfig: ", routeConfig);
      });
      */
      return $delegate;
    }]);
  }]);

  hawtioPluginLoader.addModule(pluginName);

  // bootstrap angular2
  /*
  document.addEventListener('DOMContentLoaded', () => {
    log.debug("Bootstrapping angular2");
    log.debug("ng: ", ng);
    ng.platform.browser.bootstrap(RootComponent, [].concat(ng.router.ROUTER_PROVIDERS));
    //ng.platform.browser.bootstrap(RootComponent);
  });
  */

  hawtioPluginLoader.registerPreBootstrapTask((next) => {
    log.debug("Bootstrapping angular2");
    log.debug("ng: ", ng);
    ng.platform.browser.bootstrap(RootComponent, [].concat(ng.router.ROUTER_PROVIDERS));
  });

  // component classes that are decorated via angular2 decorator functions below
  class RootComponentClass {
    constructor() {
      log.debug("RootComponent loaded");
    }
  };

  class Angular1ViewShimClass {
    constructor() {
      log.debug("Angular1ViewShimClass");
    }
  };

  class Angular1ViewClass {
    constructor() {
      log.debug("Angular1View loaded");
    }
  };

  class Angular2TestClass {
    public world = "World!"
    constructor() {
      log.debug("Angular2Test loaded");
    }
  };

  // Really basic and simple angular2 component
  var Angular2Test = Reflect.decorate([ng.core.Component({
    selector: 'angular2-test',
    template: `
      <div class="row">
        <div class="col-md-12">
          <p>&nbsp;</p><p>&nbsp;</p>
          <div>Hello {{ world }}</div>
          <a [routerLink]="['Workspaces', 'Angular1ViewGlob']">Back</a>
        </div>
      </div>
    `,
    directives: [].concat(ng.router.ROUTER_DIRECTIVES)
  })], Angular2TestClass);


  // Angular2 component that shows whatever the current angular1 view should be
  var Angular1ViewShim = Reflect.decorate([ng.core.Component({
    selector: 'angular1-view-shim',
    template: `
      <div id="main" class="container-fluid ng-cloak" ng-controller="HawtioNav.ViewController">
        <div ng-include src="viewPartial"></div>
      </div>
    `
  })], Angular1ViewShimClass);


  // angular2 component that adds routes that insert the Angular1ViewShim so that angular1 views can be displayed
  var Angular1View = Reflect.decorate([ng.core.Component({
    selector: 'angular1-view',
    template: `<router-outlet></router-outlet>`,
    directives: [].concat(ng.router.ROUTER_DIRECTIVES)
  }), ng.router.RouteConfig([
    { path: '/', component: Angular1ViewShim, name: 'Angular1View' },
    { path: '/*path', component: Angular1ViewShim, name: 'Angular1ViewGlob' }
  ])], Angular1ViewClass);


  // angular2 root component
  var RootComponent = Reflect.decorate([ng.core.Component({
    selector: 'fabric8-app',
    template: `
      <nav class="navbar navbar-default navbar-fixed-top navbar-pf" role="navigation">
        <div class="navbar-header" hawtio-extension name="hawtio-header">
          <a class="navbar-brand" href="/"><img src="img/fabric8_logo_white.svg"></a>
        </div>
        <ul class="nav navbar-nav navbar-utility">
          <li class="dropdown">
            <a href="#" class="dropdown-toggle" data-toggle="dropdown">
              <span class="pficon pficon-user"></span>
              User <b class="caret"></b>
            </a>
            <ul class="dropdown-menu" hawtio-extension name="hawtio-user"></ul>
          </li>
        </ul>
      </nav>
      <router-outlet></router-outlet>
      <div class="row">
        <div class="col-md-12">
          <a [routerLink]="['Angular2Test']">Test</a>
        </div>
      </div>
    `,
    directives: [].concat(ng.router.ROUTER_DIRECTIVES)
  }), ng.router.RouteConfig([
    { path: '/angular2test', component: Angular2Test, name: 'Angular2Test' },
    { path: '/workspaces/...', component: Angular1View, name: 'Workspaces' },
    { path: '/kubernetes/...', component: Angular1View, name: 'Kubernetes' },
    { path: '/namespaces/...', component: Angular1View, name: 'Namespaces' },
    { path: '/', redirectTo: ['Workspaces', 'Angular1ViewGlob'] },
  ])], RootComponentClass);

}
