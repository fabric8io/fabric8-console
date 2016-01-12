/// <reference path="angular2Helpers.ts"/>

module Angular2Core {

  // Component that actually holds the angular1 page
  class Angular1ViewShimClass {
    constructor() {
      log.debug("Angular1ViewShimClass");
      if (HawtioCore.injector) {
        var $rootScope = HawtioCore.injector.get('$rootScope');
        $rootScope.$apply();
      }
    }
  };

  export var Angular1ViewShim = Reflect.decorate([ng.core.Component({
    selector: 'angular1-view-shim',
    template: `
      <div id="main" class="container-fluid ng-cloak" ng-controller="HawtioNav.ViewController">
        <div ng-include src="viewPartial"></div>
      </div>
    `
  })], Angular1ViewShimClass);


  // Component that's just for routing
  class Angular1ViewClass {
    constructor() {
      log.debug("Angular1ViewClass");
    }
  }

  export var Angular1View = Reflect.decorate([ng.core.Component({
    selector: 'angular1-view',
    template: `<router-outlet></router-outlet>`,
    directives: [].concat(ng.router.ROUTER_DIRECTIVES)
  }), ng.router.RouteConfig([
    { path: '/*foo', component: Angular1ViewShim, name: 'Angular1ViewGlob' }
  ])], Angular1ViewClass);

}
