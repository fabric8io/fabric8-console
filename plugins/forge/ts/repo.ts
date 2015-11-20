/// <reference path="../../includes.ts"/>
/// <reference path="forgeHelpers.ts"/>
/// <reference path="forgePlugin.ts"/>

module Forge {

  export var RepoController = controller("RepoController",
    ["$scope", "$templateCache", "$location", "$routeParams", "$http", "$timeout", "ForgeApiURL",
      ($scope, $templateCache:ng.ITemplateCacheService, $location:ng.ILocationService, $routeParams, $http, $timeout, ForgeApiURL) => {

        $scope.name = $routeParams["path"];

        initScope($scope, $location, $routeParams);
        redirectToSetupSecretsIfNotDefined($scope, $location);

        $scope.$on('$routeUpdate', ($event) => {
          updateData();
        });

        updateData();

        function updateData() {
          if ($scope.name) {
            var url = repoApiUrl(ForgeApiURL, $scope.name);
            url = createHttpUrl($scope.projectId, url);
            var config = createHttpConfig();
            $http.get(url, config).
              success(function (data, status, headers, config) {
                if (data) {
                  enrichRepo(data);
                }
                $scope.entity = data;
                $scope.fetched = true;
              }).
              error(function (data, status, headers, config) {
                log.warn("failed to load " + url + ". status: " + status + " data: " + data);
              });
          } else {
            $scope.fetched = true;
          }
        }
      }]);
}
