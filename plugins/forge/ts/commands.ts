/// <reference path="../../includes.ts"/>
/// <reference path="forgePlugin.ts"/>

module Forge {

  export var CommandsController = controller("CommandsController", ["$scope", "$dialog", "$window", "$templateCache", "$routeParams", "$location", "localStorage", "$http", "$timeout", "ForgeApiURL", "ForgeModel",
    ($scope, $dialog, $window, $templateCache, $routeParams, $location:ng.ILocationService, localStorage, $http, $timeout, ForgeApiURL, ForgeModel) => {

      $scope.model = ForgeModel;
      $scope.resourcePath = $routeParams["path"] || $location.search()["path"] || "";
      $scope.repoName = "";
      $scope.projectDescription = $scope.resourcePath || "";
      var pathSteps = $scope.projectDescription.split("/");
      if (pathSteps && pathSteps.length) {
        $scope.repoName = pathSteps[pathSteps.length - 1];
      }
      if (!$scope.projectDescription.startsWith("/") && $scope.projectDescription.length > 0) {
        $scope.projectDescription = "/" + $scope.projectDescription;
      }

      $scope.avatar_url = localStorage["gogsAvatarUrl"];
      $scope.user = localStorage["gogsUser"];

      $scope.commands = getModelCommands(ForgeModel, $scope.resourcePath);
      $scope.fetched = $scope.commands.length !== 0;

      initScope($scope, $location, $routeParams);
      redirectToSetupSecretsIfNotDefined($scope, $location);


      $scope.tableConfig = {
        data: 'commands',
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
            displayName: 'Name',
            cellTemplate: $templateCache.get("idTemplate.html")
          },
          {
            field: 'description',
            displayName: 'Description'
          },
          {
            field: 'category',
            displayName: 'Category'
          }
        ]
      };

      function commandMatches(command) {
        var filterText = $scope.tableConfig.filterOptions.filterText;
        return commandMatchesText(command, filterText);
      }

      $scope.commandSelector = {
        filterText: "",
        folders: [],
        selectedCommands: [],
        expandedFolders: {},

        isOpen: (folder) => {
          var filterText = $scope.tableConfig.filterOptions.filterText;
          if (filterText !== '' || $scope.commandSelector.expandedFolders[folder.id]) {
            return "opened";
          }
          return "closed";
        },

        clearSelected: () => {
          $scope.commandSelector.expandedFolders = {};
          Core.$apply($scope);
        },

        updateSelected: () => {
          // lets update the selected apps
          var selectedCommands = [];
          angular.forEach($scope.model.appFolders, (folder) => {
            var apps = folder.apps.filter((app) => app.selected);
            if (apps) {
              selectedCommands = selectedCommands.concat(apps);
            }
          });
          $scope.commandSelector.selectedCommands = selectedCommands.sortBy("name");
        },

        select: (command, flag) => {
          var id = command.name;
/*
          app.selected = flag;
*/
          $scope.commandSelector.updateSelected();
        },

        getSelectedClass: (app) => {
          if (app.abstract) {
            return "abstract";
          }
          if (app.selected) {
            return "selected";
          }
          return "";
        },

        showCommand: (command) => {
          return commandMatches(command);
        },

        showFolder: (folder) => {
          var filterText = $scope.tableConfig.filterOptions.filterText;
          return !filterText || folder.commands.some((app) => commandMatches(app));
        }
      };


      var url = UrlHelpers.join(ForgeApiURL, "commands", $scope.namespace, $scope.projectId, $scope.resourcePath);
      url = createHttpUrl($scope.projectId, url);
      log.info("Fetching commands from: " + url);
      $http.get(url, createHttpConfig()).
        success(function (data, status, headers, config) {
          if (angular.isArray(data) && status === 200) {
            var resourcePath = $scope.resourcePath;
            var folderMap = {};
            var folders = [];
            $scope.commands = _.sortBy(data, "name");
            angular.forEach($scope.commands, (command) => {
              var id = command.id || command.name;
              command.$link = commandLink($scope.projectId, id, resourcePath);

              var name = command.name || command.id;
              var folderName = command.category;
              var shortName = name;
              var names = name.split(":", 2);
              if (names != null && names.length > 1) {
                folderName = names[0];
                shortName = names[1].trim();
              }
              if (folderName === "Project/Build") {
                folderName = "Project";
              }
              command.$shortName = shortName;
              command.$folderName = folderName;
              var folder = folderMap[folderName];
              if (!folder) {
                folder = {
                  name: folderName,
                  commands: []
                };
                folderMap[folderName] = folder;
                folders.push(folder);
              }
              folder.commands.push(command);
            });
            folders = _.sortBy(folders, "name");
            angular.forEach(folders, (folder) => {
              folder.commands = _.sortBy(folder.commands, "$shortName");
            });
            $scope.commandSelector.folders = folders;

            setModelCommands($scope.model, $scope.resourcePath, $scope.commands);
            $scope.fetched = true;
          }
        }).
        error(function (data, status, headers, config) {
          log.warn("failed to load " + url + ". status: " + status + " data: " + data);
        });

    }]);
}
