/// <reference path="mainPlugin.ts"/>

module Main {
  export var bodyController = _module.controller("Main.BodyController", (HawtioBranding, $scope) => {
    $scope.branding = HawtioBranding;
  });

  export var headController = _module.controller("Main.HeadController", (HawtioBranding, $scope, $element, $document) => {
    var branding = $scope.branding = HawtioBranding;
    $document.attr("title", branding.appName);
    $element.append('<link rel="shortcut icon" type="image/x-icon" href="' + branding.favIcon + '"/>');
    $element.append('<link rel="stylesheet" href="' + branding.css + '"/>');
  });
}
