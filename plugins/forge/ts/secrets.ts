/// <reference path="../../includes.ts"/>
/// <reference path="forgeHelpers.ts"/>
/// <reference path="secretHelpers.ts"/>

module Forge {


  export var SecretsController = controller("SecretsController", ["$scope", "$dialog", "$window", "$element", "$templateCache", "$routeParams", "$location", "localStorage", "$http", "$timeout", "ForgeApiURL", "ForgeModel", "KubernetesModel",
    ($scope, $dialog, $window, $element, $templateCache, $routeParams, $location:ng.ILocationService, localStorage, $http, $timeout, ForgeApiURL, ForgeModel, KubernetesModel) => {

      $scope.model = KubernetesModel;

      initScope($scope, $location, $routeParams);
      $scope.breadcrumbConfig = Developer.createProjectSettingsBreadcrumbs($scope.projectId);
      $scope.subTabConfig = Developer.createProjectSettingsSubNavBars($scope.projectId);

      var projectId = $scope.projectId;
      var ns = $scope.namespace;
      var userName = Kubernetes.currentUserName();
      $scope.sourceSecret = getProjectSourceSecret(localStorage, ns, projectId);

      var createdSecret = $location.search()["secret"];

      var projectClient = Kubernetes.createKubernetesClient("projects");
      $scope.sourceSecretNamespace = getSourceSecretNamespace(localStorage);

      log.info("Found source secret namespace " + $scope.sourceSecretNamespace);
      log.info("Found source secret for " + ns + "/" + projectId + " = " + $scope.sourceSecret);

      // TODO deduce the kind from the buildConfig git url
      var kind = "ssh";
      var savedUrl = $location.path();
      $scope.addNewSecretLink = Developer.projectWorkspaceLink(ns, projectId, UrlHelpers.join("namespace", $scope.sourceSecretNamespace, "secretCreate?kind=" + kind + "&savedUrl=" + savedUrl));

      $scope.$on('kubernetesModelUpdated', function () {
        checkNamespaceCreated();
      });

      $scope.tableConfig = {
        data: 'personalSecrets',
        showSelectionCheckbox: true,
        enableRowClickSelection: true,
        multiSelect: false,
        selectedItems: [],
        filterOptions: {
          filterText: $location.search()["q"] || ''
        },
        columnDefs: [
          {
            field: '_key',
            displayName: 'Secret Name',
            defaultSort: true,
            cellTemplate: '<div class="ngCellText nowrap">{{row.entity.metadata.name}}</div>'
          },
          {
            field: '$labelsText',
            displayName: 'Labels',
            cellTemplate: $templateCache.get("labelTemplate.html")
          },
        ]
      };

      if (createdSecret) {
        $location.search("secret", null);
        $scope.selectedSecretName = createdSecret;
        log.info("========= setting the selected secret to: " + $scope.selectedSecretName);
      } else {
        selectedSecretName();
      }

      $scope.$watchCollection("tableConfig.selectedItems", () => {
        selectedSecretName();
      });

      function selectedSecretName() {
        $scope.selectedSecretName = createdSecret || getProjectSourceSecret(localStorage, ns, projectId);
        var selectedItems = $scope.tableConfig.selectedItems;
        if (selectedItems && selectedItems.length) {
          var secret = selectedItems[0];
          const name = Kubernetes.getName(secret);
          if (name) {
            $scope.selectedSecretName = name;
            if (createdSecret && name !== createdSecret) {
              log.info("----- clearing the createdSecret!");
              // lets clear the previously created secret
              createdSecret = null;
            }
          }
        }
        return $scope.selectedSecretName;
      }

      $scope.cancel = () => {
        var selectedItems = $scope.tableConfig.selectedItems;
        selectedItems.splice(0, selectedItems.length);
        var current = createdSecret || getProjectSourceSecret(localStorage, ns, projectId);
        if (current) {
          angular.forEach($scope.personalSecrets, (secret) => {
            if (!selectedItems.length && current === Kubernetes.getName(secret)) {
              selectedItems.push(secret);
            }
          });
        }
        $scope.tableConfig.selectedItems = selectedItems;
        selectedSecretName();
        log.info("==== cancel for selection: " + current + " generated selectedItems: " + selectedItems + " has selection: " + $scope.selectedSecretName);
      };

      $scope.canSave = () => {
        var selected = selectedSecretName();
        var current = getProjectSourceSecret(localStorage, ns, projectId);
        return selected && selected !== current;
      };

      $scope.save = () => {
        var selected = selectedSecretName();
        if (selected) {
          setProjectSourceSecret(localStorage, ns, projectId, selected);
        }
      };

      checkNamespaceCreated();


      function onPersonalSecrets(secrets) {
        $scope.personalSecrets = secrets;
        $scope.fetched = true;
        $scope.cancel();
        Core.$apply($scope);
      }

      function checkNamespaceCreated() {
        var namespaceName = $scope.sourceSecretNamespace;

        function watchSecrets() {
          log.info("watching secrets on namespace: " + namespaceName);
          Kubernetes.watch($scope, $element, "secrets", namespaceName, onPersonalSecrets);
          Core.$apply($scope);
        }

        if (!$scope.secretNamespace) {
          angular.forEach($scope.model.projects, (project) => {
            var name = Kubernetes.getName(project);
            if (name === namespaceName) {
              log.info("Found secret namespace! " + name);
              $scope.secretNamespace = project;
              watchSecrets();
            }
          });
        }

        if (!$scope.secretNamespace && $scope.model.projects && $scope.model.projects.length) {
          // lets create a new namespace!
          log.info("Creating a new namespace for the user secrets.... " + namespaceName);
          var project = {
            apiVersion: Kubernetes.defaultApiVersion,
            kind: "Project",
            metadata: {
              name: namespaceName,
              labels: {
                user: userName,
                group: 'secrets',
                project: 'source'
              }
            }
          };

          projectClient.put(project,
            (data) => {
              $scope.secretNamespace = project;
              watchSecrets();
            },
            (err) => {
              Core.notification('error', "Failed to create secret namespace: " + namespaceName + "\n" + err);
            });
        }
      }

    }]);
}
