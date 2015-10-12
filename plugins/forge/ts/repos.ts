/// <reference path="../../includes.ts"/>
/// <reference path="forgeHelpers.ts"/>
/// <reference path="forgePlugin.ts"/>

module Forge {

  export var ReposController = controller("ReposController", ["$scope", "$dialog", "$window", "$templateCache", "$routeParams", "$location", "localStorage", "$http", "$timeout", "ForgeApiURL", "ServiceRegistry",
    ($scope, $dialog, $window, $templateCache, $routeParams, $location:ng.ILocationService, localStorage, $http, $timeout, ForgeApiURL, ServiceRegistry) => {

      log.info("repos controller start!");
      $scope.resourcePath = $routeParams["path"];
      $scope.commandsLink = commandsLink;

      var gogsUrl = ServiceRegistry.serviceLink(gogsServiceName);
      if (gogsUrl) {
        $scope.signUpUrl = UrlHelpers.join(gogsUrl, "user/sign_up");
        $scope.forgotPasswordUrl = UrlHelpers.join(gogsUrl, "user/forget_password");
      }
      initScope($scope, $location, $routeParams);

      $scope.tableConfig = {
        data: 'projects',
        showSelectionCheckbox: true,
        enableRowClickSelection: false,
        multiSelect: true,
        selectedItems: [],
        filterOptions: {
          filterText: $location.search()["q"] || ''
        },
        columnDefs: [
          {
            field: 'name',
            displayName: 'Repository Name',
            cellTemplate: $templateCache.get("repoTemplate.html")
          },
          {
            field: 'actions',
            displayName: 'Actions',
            cellTemplate: $templateCache.get("repoActionsTemplate.html")
          }
        ]
      };

      $scope.login = {
        authHeader: localStorage["gogsAuthorization"] || "",
        relogin: false,
        avatar_url: localStorage["gogsAvatarUrl"] || "",
        user: localStorage["gogsUser"] || "",
        password: "",
        email: localStorage["gogsEmail"] || ""
      };

      $scope.doLogin = () => {
        var login = $scope.login;
        var user = login.user;
        var password = login.password;
        if (user && password) {
          var userPwd = user + ':' + password;
          login.authHeader = 'Basic ' + (userPwd.encodeBase64());
          updateData();
        }
      };

      $scope.logout = () => {
        delete localStorage["gogsAuthorization"];
        $scope.login.authHeader = null;
        $scope.login.loggedIn = false;
        $scope.login.failed = false;
        loggedInToGogs = false;
      };


      $scope.openCommands = () => {
        var resourcePath = null;
        var selected = $scope.tableConfig.selectedItems;
        if (_.isArray(selected) && selected.length) {
          resourcePath = selected[0].path;
        }
        var link = commandsLink(resourcePath);
        log.info("moving to commands link: " + link);
        $location.path(link);
      };

      $scope.delete = (projects) => {
        UI.multiItemConfirmActionDialog(<UI.MultiItemConfirmActionOptions>{
          collection: projects,
          index: 'path',
          onClose: (result:boolean) => {
            if (result) {
              doDelete(projects);
            }
          },
          title: 'Delete projects?',
          action: 'The following projects will be removed (though the files will remain on your file system):',
          okText: 'Delete',
          okClass: 'btn-danger',
          custom: "This operation is permanent once completed!",
          customClass: "alert alert-warning"
        }).open();
      };

      function doDelete(projects) {
        angular.forEach(projects, (project) => {
          log.info("Deleting " + angular.toJson($scope.projects));
          var path = project.path;
          if (path) {
            var url = repoApiUrl(ForgeApiURL, path);
            $http.delete(url).
              success(function (data, status, headers, config) {
                updateData();
              }).
              error(function (data, status, headers, config) {
                log.warn("failed to load " + url + ". status: " + status + " data: " + data);
                var message = "Failed to POST to " + url + " got status: " + status;
                Core.notification('error', message);
              });
          }
        });
      }

      function updateData() {
        var authHeader = $scope.login.authHeader;
        var email = $scope.login.email || "";
        if (authHeader) {
          var url = reposApiUrl(ForgeApiURL);
          url = createHttpUrl(url, authHeader, email);
          var config = {
/*
            headers: {
              GogsAuthorization: authHeader,
              GogsEmail: email
            }
*/
          };
          $http.get(url, config).
            success(function (data, status, headers, config) {
              $scope.login.failed = false;
              $scope.login.loggedIn = true;
              loggedInToGogs = true;
              var avatar_url = null;
              if (status === 200) {
                if (!data || !angular.isArray(data)) {
                  data = [];
                }
                // lets store a successful login so that we hide the login page
                localStorage["gogsAuthorization"] = authHeader;
                localStorage["gogsEmail"] = email;
                localStorage["gogsUser"] = $scope.login.user || "";

                $scope.projects = _.sortBy(data, "name");
                angular.forEach($scope.projects, (repo) => {
                  enrichRepo(repo);
                  if (!avatar_url) {
                    avatar_url = Core.pathGet(repo, ["owner", "avatar_url"]);
                    if (avatar_url) {
                      $scope.login.avatar_url = avatar_url;
                      localStorage["gogsAvatarUrl"] = avatar_url;
                    }
                  }
                });
                $scope.fetched = true;
              }
            }).
            error(function (data, status, headers, config) {
              $scope.logout();
              $scope.login.failed = true;
              if (status !== 403) {
                log.warn("failed to load " + url + ". status: " + status + " data: " + data);
              }
            });
        }
      }

      updateData();

    }]);
}
