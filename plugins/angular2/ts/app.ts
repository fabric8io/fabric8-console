
declare var ng:any;

module Angular2Core {

  var templatePath = 'plugins/angular2/html';
  var log = Logger.get('angular2-core');

  var RootComponent = ng.core.Component({
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
            <ul class="dropdown-menu" hawtio-extension name="hawtio-user">
              <!--
              <li>
                <a href="#">Link</a>
              </li>
              -->
            </ul>
          </li>
        </ul>
      </nav>

      <div id="main" class="container-fluid ng-cloak" ng-controller="HawtioNav.ViewController">
        <div ng-include src="viewPartial"></div>
      </div>
    `
  }).Class({
    constructor: () => {
      log.debug("RootComponent loaded");
    }
  });

  // bootstrap angular2
  document.addEventListener('DOMContentLoaded', () => {
    log.debug("Bootstrapping angular2");
    ng.platform.browser.bootstrap(RootComponent);
  });

}
