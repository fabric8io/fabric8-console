/// <reference path="angular2Test.ts"/>

module Angular2Core {

  // component classes that are decorated via angular2 decorator functions below
  class RootComponentClass {
    constructor() {
      log.debug("RootComponent loaded");
    }
  };

  // angular2 root component
  export var RootComponent = Reflect.decorate([ng.core.Component({
    selector: 'fabric8-app',
    template: `
      <nav class="navbar navbar-default navbar-fixed-top navbar-pf" role="navigation">
        <div class="navbar-header" hawtio-extension name="hawtio-header">
          <a class="navbar-brand" href="/"><img src="img/fabric8_logo_white.svg"></a>
        </div>
        <ul class="nav navbar-nav navbar-utility">
          <li>
            <a [routerLink]="['Angular2Test']">Angular2 Page</a>
          </li>
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
