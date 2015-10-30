/// <reference path="../../includes.ts"/>
/// <reference path="forgeHelpers.ts"/>
/// <reference path="forgePlugin.ts"/>

module Forge {

  export var CommandController = controller("CommandController",
    ["$scope", "$templateCache", "$location", "$routeParams", "$http", "$timeout", "ForgeApiURL", "ForgeModel",
      ($scope, $templateCache:ng.ITemplateCacheService, $location:ng.ILocationService, $routeParams, $http, $timeout, ForgeApiURL, ForgeModel) => {

        $scope.model = ForgeModel;

        $scope.resourcePath = $routeParams["path"] || $location.search()["path"] || "";
        $scope.id = $routeParams["id"];
        $scope.path = $routeParams["path"];

        $scope.avatar_url = localStorage["gogsAvatarUrl"];
        $scope.user = localStorage["gogsUser"];
        $scope.repoName = "";
        var pathSteps = $scope.resourcePath.split("/");
        if (pathSteps && pathSteps.length) {
          $scope.repoName = pathSteps[pathSteps.length - 1];
        }


        initScope($scope, $location, $routeParams);
        if ($scope.id === "devops-edit") {
          $scope.breadcrumbConfig = Developer.createProjectSettingsBreadcrumbs($scope.projectId);
          $scope.subTabConfig = Developer.createProjectSettingsSubNavBars($scope.projectId);
        }
        redirectToGogsLoginIfRequired($scope, $location);

        $scope.$completeLink = $scope.$projectLink;
        if ($scope.projectId) {

        }
        $scope.commandsLink = commandsLink($scope.resourcePath, $scope.projectId);
        $scope.completedLink = $scope.projectId ? UrlHelpers.join($scope.$projectLink, "environments") : $scope.$projectLink;

        $scope.entity = {
        };
        $scope.inputList = [$scope.entity];

        $scope.schema = getModelCommandInputs(ForgeModel, $scope.resourcePath, $scope.id);
        onSchemaLoad();

        function onRouteChanged() {
          console.log("route updated; lets clear the entity");
          $scope.entity = {
          };
          $scope.inputList = [$scope.entity];
          $scope.previousSchemaJson = "";
          $scope.schema = null;
          Core.$apply($scope);
          updateData();
        }

        $scope.$on('$routeChangeSuccess', onRouteChanged);

        $scope.execute = () => {
          // TODO check if valid...
          $scope.response = null;
          $scope.executing = true;
          $scope.invalid = false;
          $scope.validationError = null;
          var commandId = $scope.id;
          var resourcePath = $scope.resourcePath;
          var url = executeCommandApiUrl(ForgeApiURL, commandId);
          var request = {
            namespace: $scope.namespace,
            projectName: $scope.projectId,
            resource: resourcePath,
            inputList: $scope.inputList
          };
          url = createHttpUrl(url);
          log.info("About to post to " + url + " payload: " + angular.toJson(request));
          $http.post(url, request, createHttpConfig()).
            success(function (data, status, headers, config) {
              $scope.executing = false;
              $scope.invalid = false;
              $scope.validationError = null;
              if (data) {
                data.message = data.message || data.output;
                var wizardResults = data.wizardResults;
                if (wizardResults) {
                  angular.forEach(wizardResults.stepValidations, (validation) => {
                    if (!$scope.invalid && !validation.valid) {
                      var messages = validation.messages || [];
                      if (messages.length) {
                        var message = messages[0];
                        if (message) {
                          $scope.invalid = true;
                          $scope.validationError = message.description;
                          $scope.validationInput = message.inputName;
                        }
                      }
                    }
                  });
                  var stepInputs = wizardResults.stepInputs;
                  if (stepInputs) {
                    var schema = _.last(stepInputs);
                    if (schema) {
                      $scope.entity = {};
                      updateSchema(schema);
                      // lets copy across any default values from the schema
                      angular.forEach(schema["properties"], (property, name) => {
                        var value = property.value;
                        if (value) {
                          log.info("Adding entity." + name + " = " + value);
                          $scope.entity[name] = value;
                        }
                      });
                      $scope.inputList.push($scope.entity);

                      if (data.canMoveToNextStep) {
                        // lets clear the response we've another wizard page to do
                        data = null;
                      } else {
                        // otherwise indicate that the wizard just completed and lets hide the input form
                        $scope.wizardCompleted = true;
                      }
                    }
                  }
                }
              }
              if (!$scope.invalid) {
                $scope.response = data;
                var dataOrEmpty = (data || {});
                var status = (dataOrEmpty.status || "").toString().toLowerCase();
                $scope.responseClass = toBackgroundStyle(status);

                var outputProperties = (dataOrEmpty.outputProperties || {});
                var projectId = dataOrEmpty.projectName || outputProperties.fullName;
                if ($scope.response && projectId && $scope.id === 'project-new') {
                  $scope.response = null;
                  // lets forward to the devops edit page
                  var editPath = UrlHelpers.join(Developer.projectLink(projectId), "/forge/command/devops-edit");
                  log.info("Moving to the devops edit path: " + editPath);
                  $location.path(editPath);
                }
              }
              Core.$apply($scope);
            }).
            error(function (data, status, headers, config) {
              $scope.executing = false;
              log.warn("Failed to load " + url + " " + data + " " + status);
            });
        };

        $scope.$watchCollection("entity", () => {
          validate();
        });

        function updateSchema(schema) {
          if (schema) {
            // lets remove the values so that we can properly check when the schema really does change
            // otherwise the schema will change every time we type a character ;)
            var schemaWithoutValues = angular.copy(schema);
            angular.forEach(schemaWithoutValues.properties, (property) => {
              delete property["value"];
              delete property["enabled"];
            });
            var json = angular.toJson(schemaWithoutValues);
            if (json !== $scope.previousSchemaJson) {
              console.log("updated schema: " + json);
              $scope.previousSchemaJson = json;
              $scope.schema = schema;

              if ($scope.id === "project-new") {
                var entity = $scope.entity;
                // lets hide the target location!
                var properties = schema.properties || {};
                var overwrite = properties.overwrite;
                var catalog = properties.catalog;
                var targetLocation = properties.targetLocation;
                if (targetLocation) {
                  targetLocation.hidden = true;
                  if (overwrite) {
                    overwrite.hidden = true;
                  }
                  console.log("hiding targetLocation!");

                  // lets default the type
                  if (!entity.type) {
                    entity.type = "From Archetype Catalog";
                  }
                }
                if (catalog) {
                  if (!entity.catalog) {
                    entity.catalog = "fabric8";
                  }
                }
              }
            }
          }
        }

        function validate() {
          if ($scope.executing || $scope.validating) {
            return;
          }
          var newJson = angular.toJson($scope.entity);
          if (newJson === $scope.validatedEntityJson) {
            return;
          } else {
            $scope.validatedEntityJson = newJson;
          }
          var commandId = $scope.id;
          var resourcePath = $scope.resourcePath;
          var url = validateCommandApiUrl(ForgeApiURL, commandId);
          // lets put the entity in the last item in the list
          var inputList = [].concat($scope.inputList);
          inputList[inputList.length - 1] = $scope.entity;
          var request = {
            namespace: $scope.namespace,
            projectName: $scope.projectId,
            resource: resourcePath,
            inputList: $scope.inputList
          };
          url = createHttpUrl(url);
          //log.info("About to post to " + url + " payload: " + angular.toJson(request));
          $scope.validating = true;
          $http.post(url, request, createHttpConfig()).
            success(function (data, status, headers, config) {
              this.validation = data;
              //console.log("got validation " + angular.toJson(data, true));
              var wizardResults = data.wizardResults;
              if (wizardResults) {
                var stepInputs = wizardResults.stepInputs;
                if (stepInputs) {
                  var schema = _.last(stepInputs);
                  updateSchema(schema);
                }
              }
              Core.$apply($scope);

              /*
               * Lets throttle the validations so that we only fire another validation a little
               * after we've got a reply and only if the model has changed since then
               */
              $timeout(() => {
                $scope.validating = false;
                validate();
              }, 200);
            }).
            error(function (data, status, headers, config) {
              $scope.executing = false;
              log.warn("Failed to load " + url + " " + data + " " + status);
            });
        }

        updateData();

        function toBackgroundStyle(status) {
          if (!status) {
            status = "";
          }
          if (status.startsWith("suc")) {
            return "bg-success";
          }
          return "bg-warning"
        }

        function updateData() {
          $scope.item = null;
          var commandId = $scope.id;
          if (commandId) {
            var resourcePath = $scope.resourcePath;
            var url = commandInputApiUrl(ForgeApiURL, commandId, $scope.namespace, $scope.projectId, resourcePath);
            url = createHttpUrl(url);
            $http.get(url, createHttpConfig()).
              success(function (data, status, headers, config) {
                if (data) {
                  $scope.fetched = true;
                  console.log("updateData loaded schema");
                  updateSchema(data);
                  setModelCommandInputs(ForgeModel, $scope.resourcePath, $scope.id, $scope.schema);
                  onSchemaLoad();
                }
                Core.$apply($scope);
              }).
              error(function (data, status, headers, config) {
                log.warn("Failed to load " + url + " " + data + " " + status);
              });
          } else {
            Core.$apply($scope);
          }
        }

        function onSchemaLoad() {
          // lets update the value if its blank with the default values from the properties
          var schema = $scope.schema;
          $scope.fetched = schema;
          var entity = $scope.entity;
          if (schema) {
            angular.forEach(schema.properties, (property, key) => {
              var value = property.value;
              if (value && !entity[key]) {
                entity[key] = value;
              }
            });
          }
        }
      }]);
}
