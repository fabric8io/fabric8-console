/// <reference path="angular2Plugin.ts"/>
/// <reference path="angular2Test.ts"/>

module Angular2Core {

  // component classes that are decorated via angular2 decorator functions below
  class RootComponentClass {
    public world = "World!";
    constructor() {
      log.debug("RootComponent loaded");
    }
  };

  // angular2 root component
  export var RootComponent = Reflect.decorate([ng.core.Component({
    selector: 'fabric8-app',
    styles: [`
      .hideme {
        color: #eeeeee;
      }
    `],
    template: `
      <p class='hideme'>Hello {{ world }}</p>
    `
  })], RootComponentClass);

  hawtioPluginLoader.registerPreBootstrapTask((next) => {
    // use the upgrade adapter to make this component a directive
    _module.directive('fabric8App', HawtioCore.UpgradeAdapter.downgradeNg2Component(RootComponent));
    next();
  });

}
