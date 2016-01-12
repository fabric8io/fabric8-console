/// <reference path="angular2Helpers.ts"/>

module Angular2Core {

  class Angular2TestClass {
    public world = "World!"
    constructor() {
      log.debug("Angular2Test loaded");
    }
  };

  // Really basic and simple angular2 component
  export var Angular2Test = Reflect.decorate([ng.core.Component({
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



}
