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

      var createdSecret = $location.search()["secret"];
      var projectClient = Kubernetes.createKubernetesClient("projects");

      $scope.requiredDataKeys = Kubernetes.httpsSecretDataKeys;
      $scope.sourceSecretNamespace = getSourceSecretNamespace(localStorage);
      $scope.setupSecretsLink = Developer.projectSecretsLink(ns, projectId);
      $scope.secretNamespaceLink = Developer.secretsNamespaceLink(ns, projectId, $scope.sourceSecretNamespace);

      getCurrentSecretName();

      log.debug("Found source secret namespace " + $scope.sourceSecretNamespace);
      log.debug("Found source secret for " + ns + "/" + projectId + " = " + $scope.sourceSecret);

      $scope.$on('$routeUpdate', ($event) => {
        updateData();
      });

      $scope.$on('kubernetesModelUpdated', function () {
        updateData();
      });

      $scope.tableConfig = {
        data: 'filteredSecrets',
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
      } else {
        selectedSecretName();
      }

      $scope.$watchCollection("tableConfig.selectedItems", () => {
        selectedSecretName();
      });

      function updateData() {
        checkNamespaceCreated();
        updateProject();
        Core.$apply($scope);
      }

      checkNamespaceCreated();

      function getCurrentSecretName() {
        var answer = null;
        if (createdSecret) {
          answer = createdSecret;
        } else {
          var localStoredSecretName = getProjectSourceSecret(localStorage, ns, projectId);
          if (localStoredSecretName) {
            // lets check that its valid and if not lets clear it
            if ($scope.personalSecrets && $scope.personalSecrets.length) {
              var valid = false;
              angular.forEach($scope.personalSecrets, (secret) => {
                if (localStoredSecretName === Kubernetes.getName(secret)) {
                  if (secretValid(secret, $scope.requiredDataKeys)) {
                    valid = true;
                  }
                }
              });
              if (!valid) {
                log.info("Clearing secret name configuration: " + localStoredSecretName + " as the secret no longer exists!");
                localStoredSecretName = "";
                setProjectSourceSecret(localStorage, ns, projectId, localStoredSecretName);
              }
            }
          }
          answer = localStoredSecretName;
        }
        $scope.sourceSecret = answer;
        return answer;
      }

      function selectedSecretName() {
        $scope.selectedSecretName = getCurrentSecretName();
        var selectedItems = $scope.tableConfig.selectedItems;
        if (selectedItems && selectedItems.length) {
          var secret = selectedItems[0];
          var name = Kubernetes.getName(secret);
          if (name) {
            $scope.selectedSecretName = name;
            if (createdSecret && name !== createdSecret) {
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
        var current = getCurrentSecretName();
        if (current) {
          angular.forEach($scope.personalSecrets, (secret) => {
            if (!selectedItems.length && current === Kubernetes.getName(secret)) {
              selectedItems.push(secret);
            }
          });
        }
        $scope.tableConfig.selectedItems = selectedItems;
        selectedSecretName();
      };

      $scope.canSave = () => {
        var selected = selectedSecretName();
        var current = getCurrentSecretName();
        return selected && (selected !== current || selected == createdSecret);
      };

      $scope.save = () => {
        var selected = selectedSecretName();
        if (selected) {
          setProjectSourceSecret(localStorage, ns, projectId, selected);

          if (!projectId) {
            // lets redirect back to the create project page
            $location.path(Developer.createProjectLink(ns));
          }
        }
      };

      checkNamespaceCreated();


      function updateProject() {
        angular.forEach($scope.model.buildconfigs, (project) => {
          if (projectId === Kubernetes.getName(project)) {
            $scope.project = project;
          }
        });
        $scope.gitUrl = Core.pathGet($scope.project, ['spec', 'source', 'git', 'uri']);
        var parser = parseUrl($scope.gitUrl);
        var kind = parser.protocol;
        // these kinds of URLs show up as http
        if (!$scope.gitUrl) {
          kind = "https";
        } else if ($scope.gitUrl && $scope.gitUrl.startsWith("git@")) {
          kind = "ssh";
        }
        var host = parser.host;
        var requiredDataKeys = Kubernetes.sshSecretDataKeys;
        if (kind && kind.startsWith('http')) {
          kind = 'https';
          requiredDataKeys = Kubernetes.httpsSecretDataKeys;
        } else {
          kind = 'ssh';
        }
        $scope.kind = kind;
        $scope.requiredDataKeys = requiredDataKeys;
        var savedUrl = $location.path();
        const newSecretPath = UrlHelpers.join("namespace", $scope.sourceSecretNamespace, "secretCreate?kind=" + kind + "&savedUrl=" + savedUrl);
        $scope.addNewSecretLink = (projectId) ?
          Developer.projectWorkspaceLink(ns, projectId, newSecretPath) :
          UrlHelpers.join(HawtioCore.documentBase(), Kubernetes.context, newSecretPath);

        var filteredSecrets = [];
        var selection = [];
        var currentSecretName = getCurrentSecretName();
        angular.forEach($scope.personalSecrets, (secret) => {
          var valid = secretValid(secret, requiredDataKeys);
          if (valid) {
            var secretName = Kubernetes.getName(secret);
            secret["_key"] = secretName;
            filteredSecrets.push(secret);
            if (secretName === currentSecretName) {
              selection.push(secret);
            }
          }
        });
        $scope.filteredSecrets = _.sortBy(filteredSecrets, "_key");
        $scope.tableConfig.selectedItems = selection;
      }

      function onPersonalSecrets(secrets) {
        $scope.personalSecrets = secrets;
        $scope.fetched = true;
        $scope.cancel();
        updateProject();
        Core.$apply($scope);
      }

      function onBuildConfigs(buildconfigs) {
        if (onBuildConfigs && !($scope.model.buildconfigs || []).length) {
          $scope.model.buildconfigs = buildconfigs;
        }
        updateProject();
      }

      function checkNamespaceCreated() {
        var namespaceName = getSourceSecretNamespace(localStorage);

        function watchSecrets() {
          log.info("watching secrets on namespace: " + namespaceName);
          Kubernetes.watch($scope, $element, "secrets", namespaceName, onPersonalSecrets);
          Kubernetes.watch($scope, $element, "buildconfigs", ns, onBuildConfigs);
          Core.$apply($scope);
        }

        if (!$scope.secretNamespace) {
          angular.forEach($scope.model.projects, (project) => {
            var name = Kubernetes.getName(project);
            if (name === namespaceName) {
              $scope.secretNamespace = project;
              watchSecrets();
            }
          });
        }

        if (!$scope.secretNamespace && $scope.model.projects && $scope.model.projects.length) {
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
              log.warn("Failed to create secret namespace: " + namespaceName + ": " + angular.toJson(err));
            });
        }
      }
    }]);
}
