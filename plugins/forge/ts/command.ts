/// <reference path="../../includes.ts"/>
/// <reference path="forgeHelpers.ts"/>
/// <reference path="commandOverrides.ts"/>
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
          $scope.subTabConfig = Developer.createProjectSubNavBars($scope.projectId);
          $scope.tabs = Developer.createProjectSettingsSubNavBars($scope.projectId);
        }
        redirectToSetupSecretsIfNotDefined($scope, $location);

        // for camel commands lets cancel / complete back to the camel perspective
        if ($scope.id && $scope.id.startsWith("camel-")) {
          $scope.$projectLink = Forge.projectCamelOverviewLink($scope.namespace, $scope.projectId);
        }

        $scope.$completeLink = $scope.$projectLink;
        $scope.commandsLink = commandsLink($scope.resourcePath, $scope.projectId);
        //$scope.completedLink = $scope.projectId ? UrlHelpers.join($scope.$projectLink, "environments") : $scope.$projectLink;
        $scope.completedLink = $scope.$completeLink;

        $scope.entity = {
        };
        $scope.inputList = [$scope.entity];

/*
        $scope.schema = getModelCommandInputs(ForgeModel, $scope.resourcePath, $scope.id);
        onSchemaLoad();
*/

        $scope.startup = true;

        function checkIfShouldMoveToPage2() {
          // lets move to the second page if specified via parameters...
          var search = $location.search();
          var pageNumber = search["_page"];
          if (pageNumber && $scope.inputList.length < 2 && $scope.startup) {
            angular.forEach(search, (value, key) => {
              if (key && !key.startsWith("_")) {
                // TODO we could try check this against the schema to avoid bad properties?
                // though maybe the REST API in fabric8-forge could do that for us?
                $scope.entity[key] = value;
              }
            });
            $scope.inputList = [$scope.entity];
            if (pageNumber > 1) {
              return true;
            }
          }
          return false;
        }

        function onRouteChanged() {
          console.log("route updated; lets clear the entity");
          $scope.entity = {
          };
          $scope.inputList = [$scope.entity];
          $scope.previousSchemaJson = "";
          $scope.schema = null;
          if (checkIfShouldMoveToPage2()) {
            $scope.moveToPage2OnStartup = true;
            $scope.execute();
          } else {
            updateData();
          }
          Core.$apply($scope);
        }

        $scope.$on('$routeChangeSuccess', onRouteChanged);

        $scope.isFormValid = () => {
          var schema = $scope.schema || {};
          var properties = schema.properties || {};
          var entity = $scope.entity || {};
          var valid = true;
          var missingFields = [];
          angular.forEach(schema.required, (propertyName) => {
            var value = entity[propertyName];
            if (!value) {
              valid = false;
              var property = properties[propertyName] || {};
              var title = property.title || propertyName;
              missingFields.push(title);
            }
          });
          var validationMessage = "";
          if (missingFields.length) {
            if (missingFields.length == 1) {
              validationMessage = "required field: " + missingFields[0];
            } else {
              validationMessage = "required fields: " + missingFields.join(", ");
            }
          }
          $scope.validationMessage = validationMessage;
          return valid;
        };

        $scope.execute = () => {
          // TODO check if valid...
          $scope.response = null;
          $scope.executing = true;
          $scope.invalid = false;
          $scope.validationError = null;
          var commandId = $scope.id;
          var resourcePath = $scope.resourcePath;
          var url = executeCommandApiUrl(ForgeApiURL, commandId);
          var inputList = $scope.inputList;
          inputList[inputList.length - 1] = postProcessEntity($scope.entity);
          var request = {
            namespace: $scope.namespace,
            projectName: $scope.projectId,
            resource: resourcePath,
            inputList: inputList
          };
          url = createHttpUrl($scope.projectId, url);
          log.info("About to post to " + url + " payload: " + angular.toJson(request));
          $http.post(url, request, createHttpConfig()).
            success(function (data, status, headers, config) {
            try {
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
                          if ($scope.startup && $scope.moveToPage2OnStartup) {
                            // ignore the errors as we're loading the first page and haven't started with a pre-populated entity
                          } else {
                            $scope.invalid = true;
                            $scope.validationError = message.description;
                            $scope.validationInput = message.inputName;
                          }
                        }
                      }
                    }
                  });
                  var stepInputs = wizardResults.stepInputs;
                  if (stepInputs) {
                    var schema = _.last(stepInputs);
                    if (schema) {
                      $scope.entity = {};
                      // lets copy across any default values from the schema

                      function copyValuesFromSchema() {
                        angular.forEach(schema["properties"], (property, name) => {
                          var value = property.value;
                          if (value) {
                            log.info("Adding entity." + name + " = " + value);
                            $scope.entity[name] = value;
                          }
                        });
                      }

                      copyValuesFromSchema();
                      $scope.inputList.push($scope.entity);

                      $timeout(() => {
                        // lets do this async to be sure they don't get overwritten by the form widget
                        copyValuesFromSchema();
                      }, 200);

                      updateSchema(schema);

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
                  // lets set the secret name if its null
                  if (!getProjectSourceSecret(localStorage, $scope.namespace, projectId)) {
                    var defaultSecretName = getProjectSourceSecret(localStorage, $scope.namespace, null);
                    setProjectSourceSecret(localStorage, $scope.namespace, projectId, defaultSecretName);
                  }
                  var editPath = UrlHelpers.join(Developer.projectLink(projectId), "/forge/command/devops-edit");
                  //var editPath = Developer.projectSecretsLink($scope.namespace, projectId);
                  log.info("Moving to the secrets edit path: " + editPath);
                  $location.path(editPath);
                }
              }
            } catch (e) {
              log.error("Failed to process execute() results: " + e, e);
            }
            $scope.startup = false;
            $scope.executing = false;
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
              //console.log("updated schema: " + json);
              $scope.previousSchemaJson = json;
              $scope.schema = schema;
              configureCommands($timeout, $templateCache, $scope.id, $scope.entity, schema);
            }
          }
        }

        function validate() {
          if ($scope.wizardCompleted || $scope.executing || $scope.validating) {
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
/*
          var inputList = [].concat($scope.inputList);
          inputList[inputList.length - 1] = postProcessEntity($scope.entity);
*/
          var inputList = $scope.inputList;
          inputList[inputList.length - 1] = postProcessEntity($scope.entity);
          var request = {
            namespace: $scope.namespace,
            projectName: $scope.projectId,
            resource: resourcePath,
            inputList: inputList
          };
          url = createHttpUrl($scope.projectId, url);
          $scope.validating = true;
          $http.post(url, request, createHttpConfig()).
            success(function (data, status, headers, config) {
              $scope.validation = data;
              //console.debug("got validation " + angular.toJson(data, true));
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

        if (checkIfShouldMoveToPage2()) {
          $scope.fetched = true;
        } else {
          updateData();
        }

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
            url = createHttpUrl($scope.projectId, url);
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

        function postProcessEntity(entity) {
          var answer = {};
          angular.forEach(entity, (value, key) => {
            // no values should typically be objects, so lets transform them
            if (!angular.isArray(value) && angular.isObject(value)) {
              // lets convert the value to a string
              var textValue = value.label || value.id || value.name || value.$id || value._key;
              log.info("Converting property " + key + " to value " + textValue + " for selection: " + angular.toJson(value));
              if (textValue) {
                value = textValue;
              }
            }
            answer[key] = value;
          });
          return answer;
        }

        function onSchemaLoad() {
          // lets update the value if its blank with the default values from the properties
          var schema = $scope.schema;
          $scope.fetched = schema;
          var entity = $scope.entity;
          if (schema) {
            angular.forEach(schema.properties, (property, key) => {
              if (!property.label) {
                property.label = property.title;
              }
              var value = property.value;
              if (value && !entity[key]) {
                entity[key] = value;
              }
            });
          }
        }
      }]);
}
