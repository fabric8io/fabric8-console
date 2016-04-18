/// <reference path="../../includes.ts"/>
/// <reference path="forgeHelpers.ts"/>
/// <reference path="forgePlugin.ts"/>

module Forge {

  export var ReposController = controller("ReposController", ["$scope", "$dialog", "$window", "$element", "$templateCache", "$routeParams", "$location", "localStorage", "$http", "$timeout", "ForgeApiURL", "KubernetesModel", "ServiceRegistry",
    ($scope, $dialog, $window, $element, $templateCache, $routeParams, $location:ng.ILocationService, localStorage, $http, $timeout, ForgeApiURL, KubernetesModel: Kubernetes.KubernetesModelService, ServiceRegistry) => {

      $scope.model = KubernetesModel;
      $scope.resourcePath = $routeParams["path"];
      $scope.commandsLink = (path) => commandsLink(path, $scope.projectId);

      initScope($scope, $location, $routeParams);
      $scope.breadcrumbConfig.push({
        label: "Create Project"
      });
      $scope.subTabConfig = [];


      $scope.$on('kubernetesModelUpdated', function () {
        updateLinks();
        Core.$apply($scope);
      });

      var projectId = null;
      var ns = $scope.namespace;
      $scope.sourceSecret = getProjectSourceSecret(localStorage, ns, projectId);

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
          login.authHeader = 'Basic ' + btoa(userPwd);
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
        var link = commandsLink(resourcePath, $scope.projectId);
        log.info("moving to commands link: " + link);
        Kubernetes.goToPath($location, link);
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


      updateLinks();
      watchSecrets();

      function onPersonalSecrets(secrets) {
        if ($scope.sourceSecret) {
          var found = false;
          angular.forEach(secrets, (secret) => {
            var name = Kubernetes.getName(secret);
            if (name === $scope.sourceSecret) {
              // lets verify that it has the valid fields
              var requiredDataKeys = Kubernetes.httpsSecretDataKeys;
              var valid = secretValid(secret, requiredDataKeys);
              if (valid) {
                found = true;
              } else {
                log.warn("secret " + name + " is not valid, it does not contain keys: " + requiredDataKeys + " so clearing!");
              }
            }
          });
          if (!found) {
            $scope.sourceSecret = "";
          }
        }
        Core.$apply($scope);
      }

      function watchSecrets() {
        var namespaceName = getSourceSecretNamespace(localStorage);
        Kubernetes.watch($scope, $element, "secrets", namespaceName, onPersonalSecrets);
      }

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

      function updateLinks() {
        var $gogsLink = ServiceRegistry.serviceReadyLink(gogsServiceName);
        if ($gogsLink) {
          $scope.signUpUrl = UrlHelpers.join($gogsLink, "user/sign_up");
          $scope.forgotPasswordUrl = UrlHelpers.join($gogsLink, "user/forget_password");
        }
        $scope.$gogsLink = $gogsLink;
        $scope.$forgeLink = ServiceRegistry.serviceReadyLink(Kubernetes.fabric8ForgeServiceName);

        $scope.$hasCDPipelineTemplate = _.any($scope.model.templates, (t) => "cd-pipeline" === Kubernetes.getName(t));

        var expectedRCS = [Kubernetes.gogsServiceName, Kubernetes.fabric8ForgeServiceName, Kubernetes.jenkinsServiceName];
        var requiredRCs = {};
        var ns = Kubernetes.currentKubernetesNamespace();
        var runningCDPipeline = true;
        angular.forEach(expectedRCS, (rcName) => {
          var rc = $scope.model.getReplicationController(ns, rcName);
          if (rc) {
            requiredRCs[rcName] = rc;
          } else {
            runningCDPipeline = false;
          }
        });
        $scope.$requiredRCs = requiredRCs;
        $scope.$runningCDPipeline = runningCDPipeline;
        var url = "";
        url = $location.url();
        if (!url) {
          url = window.location.toString();
        }
        // TODO should we support any other template namespaces?
        var templateNamespace = "default";
        $scope.$runCDPipelineLink = "/kubernetes/namespace/" + templateNamespace + "/templates/" + ns + "?q=cd-pipeline&returnTo=" + encodeURIComponent(url);
      }

      function updateData() {
        var authHeader = $scope.login.authHeader;
        var email = $scope.login.email || "";
        if (authHeader) {
          var url = reposApiUrl(ForgeApiURL);
          url = createHttpUrl($scope.projectId, url, authHeader, email);
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
