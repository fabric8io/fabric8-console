/// Copyright 2014-2015 Red Hat, Inc. and/or its affiliates
/// and other contributors as indicated by the @author tags.
///
/// Licensed under the Apache License, Version 2.0 (the "License");
/// you may not use this file except in compliance with the License.
/// You may obtain a copy of the License at
///
///   http://www.apache.org/licenses/LICENSE-2.0
///
/// Unless required by applicable law or agreed to in writing, software
/// distributed under the License is distributed on an "AS IS" BASIS,
/// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
/// See the License for the specific language governing permissions and
/// limitations under the License.
/// <reference path="../libs/hawtio-utilities/defs.d.ts"/>
/// <reference path="../libs/hawtio-oauth/defs.d.ts"/>
/// <reference path="../libs/hawtio-kubernetes/defs.d.ts"/>
/// <reference path="../libs/hawtio-integration/defs.d.ts"/>
/// <reference path="../libs/hawtio-dashboard/defs.d.ts"/>

var Forge;
(function (Forge) {
    Forge.context = '/workspaces/:namespace/forge';
    Forge.hash = '#' + Forge.context;
    Forge.pluginName = 'Forge';
    Forge.pluginPath = 'plugins/forge/';
    Forge.templatePath = Forge.pluginPath + 'html/';
    Forge.log = Logger.get(Forge.pluginName);
    Forge.defaultIconUrl = Core.url("/img/forge.svg");
    Forge.gogsServiceName = Kubernetes.gogsServiceName;
    Forge.orionServiceName = "orion";
    Forge.loggedInToGogs = false;
    function isForge(workspace) {
        return true;
    }
    Forge.isForge = isForge;
    function initScope($scope, $location, $routeParams) {
        $scope.namespace = $routeParams["namespace"] || $scope.namespace || Kubernetes.currentKubernetesNamespace();
        Kubernetes.setCurrentKubernetesNamespace($scope.namespace);
        $scope.projectId = $routeParams["project"];
        $scope.$workspaceLink = Developer.workspaceLink();
        $scope.$projectLink = Developer.projectLink($scope.projectId);
        $scope.breadcrumbConfig = Developer.createProjectBreadcrumbs($scope.projectId);
        $scope.subTabConfig = Developer.createProjectSubNavBars($scope.projectId);
        if ("project-new" === $scope.id) {
            $scope.breadcrumbConfig.push({
                label: "Create Project"
            });
        }
        else {
            $scope.breadcrumbConfig.push(_.last($scope.subTabConfig));
            $scope.breadcrumbConfig.push({
                label: "Forge",
                href: Forge.projectCommandsLink($scope.namespace, $scope.projectId)
            });
        }
        $scope.subTabConfig = [];
    }
    Forge.initScope = initScope;
    function commandLink(projectId, name, resourcePath) {
        var link = Developer.projectLink(projectId);
        if (name) {
            if (resourcePath) {
                return UrlHelpers.join(link, "/forge/command", name, resourcePath);
            }
            else {
                return UrlHelpers.join(link, "/forge/command/", name);
            }
        }
        return null;
    }
    Forge.commandLink = commandLink;
    function commandsLink(resourcePath, projectId) {
        var link = Developer.projectLink(projectId);
        if (resourcePath) {
            return UrlHelpers.join(link, "/forge/commands/user", resourcePath);
        }
        else {
            return UrlHelpers.join(link, "/forge/commands");
        }
    }
    Forge.commandsLink = commandsLink;
    function projectCommandsLink(ns, projectId) {
        return Developer.projectWorkspaceLink(ns, projectId, "forge/commands", false);
    }
    Forge.projectCommandsLink = projectCommandsLink;
    function reposApiUrl(ForgeApiURL) {
        return UrlHelpers.join(ForgeApiURL, "/repos");
    }
    Forge.reposApiUrl = reposApiUrl;
    function repoApiUrl(ForgeApiURL, path) {
        return UrlHelpers.join(ForgeApiURL, "/repos/user", path);
    }
    Forge.repoApiUrl = repoApiUrl;
    function commandApiUrl(ForgeApiURL, commandId, ns, projectId, resourcePath) {
        if (resourcePath === void 0) { resourcePath = null; }
        return UrlHelpers.join(ForgeApiURL, "command", commandId, ns, projectId, resourcePath);
    }
    Forge.commandApiUrl = commandApiUrl;
    function executeCommandApiUrl(ForgeApiURL, commandId) {
        return UrlHelpers.join(ForgeApiURL, "command", "execute", commandId);
    }
    Forge.executeCommandApiUrl = executeCommandApiUrl;
    function validateCommandApiUrl(ForgeApiURL, commandId) {
        return UrlHelpers.join(ForgeApiURL, "command", "validate", commandId);
    }
    Forge.validateCommandApiUrl = validateCommandApiUrl;
    function commandInputApiUrl(ForgeApiURL, commandId, ns, projectId, resourcePath) {
        if (ns && projectId) {
            return UrlHelpers.join(ForgeApiURL, "commandInput", commandId, ns, projectId, resourcePath);
        }
        else {
            return UrlHelpers.join(ForgeApiURL, "commandInput", commandId);
        }
    }
    Forge.commandInputApiUrl = commandInputApiUrl;
    function modelProject(ForgeModel, resourcePath) {
        if (resourcePath) {
            var project = ForgeModel.projects[resourcePath];
            if (!project) {
                project = {};
                ForgeModel.projects[resourcePath] = project;
            }
            return project;
        }
        else {
            return ForgeModel.rootProject;
        }
    }
    function setModelCommands(ForgeModel, resourcePath, commands) {
        var project = modelProject(ForgeModel, resourcePath);
        project.$commands = commands;
    }
    Forge.setModelCommands = setModelCommands;
    function getModelCommands(ForgeModel, resourcePath) {
        var project = modelProject(ForgeModel, resourcePath);
        return project.$commands || [];
    }
    Forge.getModelCommands = getModelCommands;
    function modelCommandInputMap(ForgeModel, resourcePath) {
        var project = modelProject(ForgeModel, resourcePath);
        var commandInputs = project.$commandInputs;
        if (!commandInputs) {
            commandInputs = {};
            project.$commandInputs = commandInputs;
        }
        return commandInputs;
    }
    function getModelCommandInputs(ForgeModel, resourcePath, id) {
        var commandInputs = modelCommandInputMap(ForgeModel, resourcePath);
        return commandInputs[id];
    }
    Forge.getModelCommandInputs = getModelCommandInputs;
    function setModelCommandInputs(ForgeModel, resourcePath, id, item) {
        var commandInputs = modelCommandInputMap(ForgeModel, resourcePath);
        return commandInputs[id] = item;
    }
    Forge.setModelCommandInputs = setModelCommandInputs;
    function enrichRepo(repo) {
        var owner = repo.owner || {};
        var user = owner.username || repo.user;
        var name = repo.name;
        var projectId = name;
        var avatar_url = owner.avatar_url;
        if (avatar_url && avatar_url.startsWith("http//")) {
            avatar_url = "http://" + avatar_url.substring(6);
            owner.avatar_url = avatar_url;
        }
        if (user && name) {
            var resourcePath = user + "/" + name;
            repo.$commandsLink = commandsLink(resourcePath, projectId);
            repo.$buildsLink = "/kubernetes/builds?q=/" + resourcePath + ".git";
            var injector = HawtioCore.injector;
            if (injector) {
                var ServiceRegistry = injector.get("ServiceRegistry");
                if (ServiceRegistry) {
                    var orionLink = ServiceRegistry.serviceLink(Forge.orionServiceName);
                    var gogsService = ServiceRegistry.findService(Forge.gogsServiceName);
                    if (orionLink && gogsService) {
                        var portalIp = gogsService.portalIP;
                        if (portalIp) {
                            var port = gogsService.port;
                            var portText = (port && port !== 80 && port !== 443) ? ":" + port : "";
                            var protocol = (port && port === 443) ? "https://" : "http://";
                            var gitCloneUrl = UrlHelpers.join(protocol + portalIp + portText + "/", resourcePath + ".git");
                            repo.$openProjectLink = UrlHelpers.join(orionLink, "/git/git-repository.html#,createProject.name=" + name + ",cloneGit=" + gitCloneUrl);
                        }
                    }
                }
            }
        }
    }
    Forge.enrichRepo = enrichRepo;
    function createHttpConfig() {
        var config = {
            headers: {}
        };
        return config;
    }
    Forge.createHttpConfig = createHttpConfig;
    function addQueryArgument(url, name, value) {
        if (url && name && value) {
            var sep = (url.indexOf("?") >= 0) ? "&" : "?";
            return url + sep + name + "=" + encodeURIComponent(value);
        }
        return url;
    }
    function createHttpUrl(projectId, url, authHeader, email) {
        if (authHeader === void 0) { authHeader = null; }
        if (email === void 0) { email = null; }
        var localStorage = Kubernetes.inject("localStorage") || {};
        var ns = Kubernetes.currentKubernetesNamespace();
        var secret = Forge.getProjectSourceSecret(localStorage, ns, projectId);
        var secretNS = Forge.getSourceSecretNamespace(localStorage);
        authHeader = authHeader || localStorage["gogsAuthorization"];
        email = email || localStorage["gogsEmail"];
        url = addQueryArgument(url, "_gogsAuth", authHeader);
        url = addQueryArgument(url, "_gogsEmail", email);
        url = addQueryArgument(url, "secret", secret);
        url = addQueryArgument(url, "secretNamespace", secretNS);
        return url;
    }
    Forge.createHttpUrl = createHttpUrl;
    function commandMatchesText(command, filterText) {
        if (filterText) {
            return Core.matchFilterIgnoreCase(angular.toJson(command), filterText);
        }
        else {
            return true;
        }
    }
    Forge.commandMatchesText = commandMatchesText;
    function isSourceSecretDefinedForProject(ns, projectId) {
        var localStorage = Kubernetes.inject("localStorage") || {};
        return Forge.getProjectSourceSecret(localStorage, ns, projectId);
    }
    Forge.isSourceSecretDefinedForProject = isSourceSecretDefinedForProject;
    function redirectToSetupSecretsIfNotDefined($scope, $location) {
        var ns = $scope.namespace || Kubernetes.currentKubernetesNamespace();
        var projectId = $scope.projectId;
        if (!isSourceSecretDefinedForProject(ns, projectId)) {
            var loginPage = Developer.projectSecretsLink(ns, projectId) + "Required";
            Forge.log.info("No secret setup so redirecting to " + loginPage);
            $location.path(loginPage);
        }
    }
    Forge.redirectToSetupSecretsIfNotDefined = redirectToSetupSecretsIfNotDefined;
})(Forge || (Forge = {}));

/// <reference path="../../includes.ts"/>
/// <reference path="forgeHelpers.ts"/>
var Forge;
(function (Forge) {
    Forge._module = angular.module(Forge.pluginName, ['hawtio-core', 'hawtio-ui']);
    Forge.controller = PluginHelpers.createControllerFunction(Forge._module, Forge.pluginName);
    Forge.route = PluginHelpers.createRoutingFunction(Forge.templatePath);
    Forge._module.config(['$routeProvider', function ($routeProvider) {
            console.log("Listening on: " + UrlHelpers.join(Forge.context, '/createProject'));
            $routeProvider.when(UrlHelpers.join(Forge.context, '/createProject'), Forge.route('createProject.html', false))
                .when(UrlHelpers.join(Forge.context, '/repos/:path*'), Forge.route('repo.html', false))
                .when(UrlHelpers.join(Forge.context, '/repos'), Forge.route('repos.html', false));
            angular.forEach([Forge.context, '/workspaces/:namespace/projects/:project/forge', '/workspaces/:namespace/forge'], function (path) {
                $routeProvider
                    .when(UrlHelpers.join(path, '/commands'), Forge.route('commands.html', false))
                    .when(UrlHelpers.join(path, '/commands/:path*'), Forge.route('commands.html', false))
                    .when(UrlHelpers.join(path, '/command/:id'), Forge.route('command.html', false))
                    .when(UrlHelpers.join(path, '/command/:id/:path*'), Forge.route('command.html', false));
            });
            angular.forEach([Forge.context, '/workspaces/:namespace/projects/:project/forge', '/workspaces/:namespace/projects/forge'], function (path) {
                $routeProvider
                    .when(UrlHelpers.join(path, '/secrets'), Forge.route('secrets.html', false))
                    .when(UrlHelpers.join(path, '/secretsRequired'), Forge.route('secretsRequired.html', false));
            });
        }]);
    Forge._module.factory('ForgeApiURL', ['$q', '$rootScope', function ($q, $rootScope) {
            return Kubernetes.kubernetesApiUrl() + "/proxy" + Kubernetes.kubernetesNamespacePath() + "/services/fabric8-forge/api/forge";
        }]);
    Forge._module.factory('ForgeModel', ['$q', '$rootScope', function ($q, $rootScope) {
            return {
                rootProject: {},
                projects: []
            };
        }]);
    Forge._module.run(['viewRegistry', 'HawtioNav', function (viewRegistry, HawtioNav) {
            viewRegistry['forge'] = Forge.templatePath + 'layoutForge.html';
        }]);
    hawtioPluginLoader.addModule(Forge.pluginName);
})(Forge || (Forge = {}));

/// <reference path="../../includes.ts"/>
/// <reference path="forgeHelpers.ts"/>
/// <reference path="forgePlugin.ts"/>
var Forge;
(function (Forge) {
    Forge.ArchetypePicker = Forge.controller("ArchetypePicker", ["$scope", "$templateCache", "$location", "$routeParams", "$http", "$timeout", "ForgeApiURL", "ForgeModel",
        function ($scope, $templateCache, $location, $routeParams, $http, $timeout, ForgeApiURL, ForgeModel) {
            var config = $scope.config || {};
            var properties = config.properties || {};
            var archetype = properties.archetype || {};
            $scope.archetypes = archetype.enum;
            angular.forEach($scope.archetypes, function (archetype) {
                var artifactId = archetype.artifactId;
                if (artifactId) {
                    var artifactLabel = Core.trimTrailing(artifactId, "-archetype");
                    archetype.$artifactLabel = artifactLabel;
                    archetype.$value = archetype.groupId + ":" + artifactId + ":" + archetype.version;
                }
            });
            $scope.tableConfig = {
                data: 'archetypes',
                primaryKeyFn: function (item) { return item.$value; },
                showSelectionCheckbox: false,
                enableRowClickSelection: true,
                multiSelect: false,
                selectedItems: [],
                filterOptions: {
                    filterText: ''
                },
                columnDefs: [
                    {
                        field: '$artifactLabel',
                        displayName: 'Archetype',
                    },
                    {
                        field: 'description',
                        displayName: 'Description',
                    },
                    {
                        field: 'groupId',
                        displayName: 'Group Id',
                    },
                    {
                        field: 'version',
                        displayName: 'Version',
                    }
                ]
            };
            entityChanged();
            $scope.$watch("entity.archetype", entityChanged);
            $scope.$watchCollection("tableConfig.selectedItems", userSelectionChanged);
            function getSelection(value) {
                var answer = null;
                if (value) {
                    angular.forEach($scope.archetypes, function (pipeline) {
                        if (!answer && value === pipeline.$value) {
                            answer = pipeline;
                        }
                    });
                }
                return answer;
            }
            function entityChanged() {
                var archetype = $scope.entity.archetype || {};
                var pipelineValue = angular.isString(archetype) ? archetype : archetype.value;
                var initialSelection = getSelection(pipelineValue);
                if (initialSelection) {
                    $scope.tableConfig.selectedItems = [initialSelection];
                    userSelectionChanged();
                }
            }
            var first = true;
            function userSelectionChanged() {
                var selection = $scope.tableConfig.selectedItems;
                var selectedValue = "";
                var selected = null;
                if (selection && selection.length) {
                    selected = selection[0];
                    selectedValue = selected.$value;
                }
                if (selectedValue || !first) {
                    $scope.entity.archetype = selectedValue;
                    first = false;
                }
                $scope.selected = selected;
                Core.$apply($scope);
            }
        }]);
})(Forge || (Forge = {}));

/// <reference path="../../includes.ts"/>
/// <reference path="forgeHelpers.ts"/>
/// <reference path="forgePlugin.ts"/>
var Forge;
(function (Forge) {
    Forge.CommandController = Forge.controller("CommandController", ["$scope", "$templateCache", "$location", "$routeParams", "$http", "$timeout", "ForgeApiURL", "ForgeModel",
        function ($scope, $templateCache, $location, $routeParams, $http, $timeout, ForgeApiURL, ForgeModel) {
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
            Forge.initScope($scope, $location, $routeParams);
            if ($scope.id === "devops-edit") {
                $scope.breadcrumbConfig = Developer.createProjectSettingsBreadcrumbs($scope.projectId);
                $scope.subTabConfig = Developer.createProjectSettingsSubNavBars($scope.projectId);
            }
            Forge.redirectToSetupSecretsIfNotDefined($scope, $location);
            $scope.$completeLink = $scope.$projectLink;
            if ($scope.projectId) {
            }
            $scope.commandsLink = Forge.commandsLink($scope.resourcePath, $scope.projectId);
            $scope.completedLink = $scope.projectId ? UrlHelpers.join($scope.$projectLink, "environments") : $scope.$projectLink;
            $scope.entity = {};
            $scope.inputList = [$scope.entity];
            $scope.schema = Forge.getModelCommandInputs(ForgeModel, $scope.resourcePath, $scope.id);
            onSchemaLoad();
            function onRouteChanged() {
                console.log("route updated; lets clear the entity");
                $scope.entity = {};
                $scope.inputList = [$scope.entity];
                $scope.previousSchemaJson = "";
                $scope.schema = null;
                Core.$apply($scope);
                updateData();
            }
            $scope.$on('$routeChangeSuccess', onRouteChanged);
            $scope.isFormValid = function () {
                var schema = $scope.schema || {};
                var properties = schema.properties || {};
                var entity = $scope.entity || {};
                var valid = true;
                var missingFields = [];
                angular.forEach(schema.required, function (propertyName) {
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
                    }
                    else {
                        validationMessage = "required fields: " + missingFields.join(", ");
                    }
                }
                $scope.validationMessage = validationMessage;
                return valid;
            };
            $scope.execute = function () {
                $scope.response = null;
                $scope.executing = true;
                $scope.invalid = false;
                $scope.validationError = null;
                var commandId = $scope.id;
                var resourcePath = $scope.resourcePath;
                var url = Forge.executeCommandApiUrl(ForgeApiURL, commandId);
                var request = {
                    namespace: $scope.namespace,
                    projectName: $scope.projectId,
                    resource: resourcePath,
                    inputList: $scope.inputList
                };
                url = Forge.createHttpUrl($scope.projectId, url);
                Forge.log.info("About to post to " + url + " payload: " + angular.toJson(request));
                $http.post(url, request, Forge.createHttpConfig()).
                    success(function (data, status, headers, config) {
                    $scope.executing = false;
                    $scope.invalid = false;
                    $scope.validationError = null;
                    if (data) {
                        data.message = data.message || data.output;
                        var wizardResults = data.wizardResults;
                        if (wizardResults) {
                            angular.forEach(wizardResults.stepValidations, function (validation) {
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
                                    function copyValuesFromSchema() {
                                        angular.forEach(schema["properties"], function (property, name) {
                                            var value = property.value;
                                            if (value) {
                                                Forge.log.info("Adding entity." + name + " = " + value);
                                                $scope.entity[name] = value;
                                            }
                                        });
                                    }
                                    copyValuesFromSchema();
                                    $scope.inputList.push($scope.entity);
                                    $timeout(function () {
                                        copyValuesFromSchema();
                                    }, 200);
                                    updateSchema(schema);
                                    if (data.canMoveToNextStep) {
                                        data = null;
                                    }
                                    else {
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
                            if (!Forge.getProjectSourceSecret(localStorage, $scope.namespace, projectId)) {
                                var defaultSecretName = Forge.getProjectSourceSecret(localStorage, $scope.namespace, null);
                                Forge.setProjectSourceSecret(localStorage, $scope.namespace, projectId, defaultSecretName);
                            }
                            var editPath = UrlHelpers.join(Developer.projectLink(projectId), "/forge/command/devops-edit");
                            Forge.log.info("Moving to the secrets edit path: " + editPath);
                            $location.path(editPath);
                        }
                    }
                    Core.$apply($scope);
                }).
                    error(function (data, status, headers, config) {
                    $scope.executing = false;
                    Forge.log.warn("Failed to load " + url + " " + data + " " + status);
                });
            };
            $scope.$watchCollection("entity", function () {
                validate();
            });
            function updateSchema(schema) {
                if (schema) {
                    var schemaWithoutValues = angular.copy(schema);
                    angular.forEach(schemaWithoutValues.properties, function (property) {
                        delete property["value"];
                        delete property["enabled"];
                    });
                    var json = angular.toJson(schemaWithoutValues);
                    if (json !== $scope.previousSchemaJson) {
                        console.log("updated schema: " + json);
                        $scope.previousSchemaJson = json;
                        $scope.schema = schema;
                        var entity = $scope.entity;
                        var properties = schema.properties || {};
                        if ($scope.id === "project-new") {
                            var overwrite = properties.overwrite;
                            var catalog = properties.catalog;
                            var targetLocation = properties.targetLocation;
                            var archetype = properties.archetype;
                            if (targetLocation) {
                                targetLocation.hidden = true;
                                if (overwrite) {
                                    overwrite.hidden = true;
                                }
                                console.log("hiding targetLocation!");
                                if (!entity.type) {
                                    entity.type = "From Archetype Catalog";
                                }
                            }
                            if (catalog) {
                                if (!entity.catalog) {
                                    entity.catalog = "fabric8";
                                }
                            }
                            if (archetype) {
                                archetype.formTemplate = $templateCache.get("devOpsArchetypeChooser.html");
                            }
                        }
                        else if ($scope.id === "devops-edit") {
                            var pipeline = properties.pipeline;
                            if (pipeline) {
                                pipeline.formTemplate = $templateCache.get("devOpsPipelineChooser.html");
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
                }
                else {
                    $scope.validatedEntityJson = newJson;
                }
                var commandId = $scope.id;
                var resourcePath = $scope.resourcePath;
                var url = Forge.validateCommandApiUrl(ForgeApiURL, commandId);
                var inputList = [].concat($scope.inputList);
                inputList[inputList.length - 1] = $scope.entity;
                var request = {
                    namespace: $scope.namespace,
                    projectName: $scope.projectId,
                    resource: resourcePath,
                    inputList: $scope.inputList
                };
                url = Forge.createHttpUrl($scope.projectId, url);
                $scope.validating = true;
                $http.post(url, request, Forge.createHttpConfig()).
                    success(function (data, status, headers, config) {
                    this.validation = data;
                    var wizardResults = data.wizardResults;
                    if (wizardResults) {
                        var stepInputs = wizardResults.stepInputs;
                        if (stepInputs) {
                            var schema = _.last(stepInputs);
                            updateSchema(schema);
                        }
                    }
                    Core.$apply($scope);
                    $timeout(function () {
                        $scope.validating = false;
                        validate();
                    }, 200);
                }).
                    error(function (data, status, headers, config) {
                    $scope.executing = false;
                    Forge.log.warn("Failed to load " + url + " " + data + " " + status);
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
                return "bg-warning";
            }
            function updateData() {
                $scope.item = null;
                var commandId = $scope.id;
                if (commandId) {
                    var resourcePath = $scope.resourcePath;
                    var url = Forge.commandInputApiUrl(ForgeApiURL, commandId, $scope.namespace, $scope.projectId, resourcePath);
                    url = Forge.createHttpUrl($scope.projectId, url);
                    $http.get(url, Forge.createHttpConfig()).
                        success(function (data, status, headers, config) {
                        if (data) {
                            $scope.fetched = true;
                            console.log("updateData loaded schema");
                            updateSchema(data);
                            Forge.setModelCommandInputs(ForgeModel, $scope.resourcePath, $scope.id, $scope.schema);
                            onSchemaLoad();
                        }
                        Core.$apply($scope);
                    }).
                        error(function (data, status, headers, config) {
                        Forge.log.warn("Failed to load " + url + " " + data + " " + status);
                    });
                }
                else {
                    Core.$apply($scope);
                }
            }
            function onSchemaLoad() {
                var schema = $scope.schema;
                $scope.fetched = schema;
                var entity = $scope.entity;
                if (schema) {
                    angular.forEach(schema.properties, function (property, key) {
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
})(Forge || (Forge = {}));

/// <reference path="../../includes.ts"/>
/// <reference path="forgePlugin.ts"/>
var Forge;
(function (Forge) {
    Forge.CommandsController = Forge.controller("CommandsController", ["$scope", "$dialog", "$window", "$templateCache", "$routeParams", "$location", "localStorage", "$http", "$timeout", "ForgeApiURL", "ForgeModel",
        function ($scope, $dialog, $window, $templateCache, $routeParams, $location, localStorage, $http, $timeout, ForgeApiURL, ForgeModel) {
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
            $scope.commands = Forge.getModelCommands(ForgeModel, $scope.resourcePath);
            $scope.fetched = $scope.commands.length !== 0;
            Forge.initScope($scope, $location, $routeParams);
            Forge.redirectToSetupSecretsIfNotDefined($scope, $location);
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
                return Forge.commandMatchesText(command, filterText);
            }
            $scope.commandSelector = {
                filterText: "",
                folders: [],
                selectedCommands: [],
                expandedFolders: {},
                isOpen: function (folder) {
                    var filterText = $scope.tableConfig.filterOptions.filterText;
                    if (filterText !== '' || $scope.commandSelector.expandedFolders[folder.id]) {
                        return "opened";
                    }
                    return "closed";
                },
                clearSelected: function () {
                    openAllCommands();
                    Core.$apply($scope);
                },
                updateSelected: function () {
                    var selectedCommands = [];
                    angular.forEach($scope.model.appFolders, function (folder) {
                        var apps = folder.apps.filter(function (app) { return app.selected; });
                        if (apps) {
                            selectedCommands = selectedCommands.concat(apps);
                        }
                    });
                    $scope.commandSelector.selectedCommands = selectedCommands.sortBy("name");
                },
                select: function (command, flag) {
                    var id = command.name;
                    $scope.commandSelector.updateSelected();
                },
                getSelectedClass: function (app) {
                    if (app.abstract) {
                        return "abstract";
                    }
                    if (app.selected) {
                        return "selected";
                    }
                    return "";
                },
                showCommand: function (command) {
                    return commandMatches(command);
                },
                showFolder: function (folder) {
                    var filterText = $scope.tableConfig.filterOptions.filterText;
                    return !filterText || folder.commands.some(function (app) { return commandMatches(app); });
                }
            };
            function openAllCommands() {
                $scope.commandSelector.expandedFolders = {};
                angular.forEach($scope.commands, function (command) {
                    var id = command.id || command.name;
                    if (id) {
                        $scope.commandSelector.expandedFolders[id] = true;
                    }
                });
            }
            function toElementId(name) {
                return name.replace("/", "_");
            }
            var ignorePrefixes = ["addon-", "archetype-", "fabric8-", "git-"];
            var ignoreCommands = {
                "devops-edit": true,
                "devops-new-build": true,
                "build-and-install-an-addon": true,
                "install-an-addon": true,
                "install-an-addon-from-git": true,
                "remove-an-addon": true,
                "update-an-addon": true,
                "build": true,
                "project-new": true,
                "": true,
                "": true,
                "": true,
                "": true,
            };
            function isValidCommand(id) {
                if (!id)
                    return false;
                var answer = true;
                angular.forEach(ignorePrefixes, function (prefix) {
                    if (answer && id.startsWith(prefix)) {
                        answer = false;
                    }
                });
                if (answer && ignoreCommands[id]) {
                    return false;
                }
                return answer;
            }
            var url = UrlHelpers.join(ForgeApiURL, "commands", $scope.namespace, $scope.projectId, $scope.resourcePath);
            url = Forge.createHttpUrl($scope.projectId, url);
            Forge.log.info("Fetching commands from: " + url);
            $http.get(url, Forge.createHttpConfig()).
                success(function (data, status, headers, config) {
                if (angular.isArray(data) && status === 200) {
                    var resourcePath = $scope.resourcePath;
                    var folderMap = {};
                    var folders = [];
                    $scope.commands = _.sortBy(data, "name");
                    angular.forEach($scope.commands, function (command) {
                        var id = command.id || command.name;
                        if (isValidCommand(id)) {
                            command.$link = Forge.commandLink($scope.projectId, id, resourcePath);
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
                                var lowerName = folderName.toLowerCase();
                                folder = {
                                    name: folderName,
                                    lowerName: lowerName,
                                    id: "folder_" + toElementId(lowerName),
                                    commands: []
                                };
                                folderMap[folderName] = folder;
                                folders.push(folder);
                            }
                            folder.commands.push(command);
                        }
                    });
                    folders = _.sortBy(folders, "lowerName");
                    angular.forEach(folders, function (folder) {
                        folder.commands = _.sortBy(folder.commands, "$shortName");
                    });
                    $scope.commandSelector.folders = folders;
                    openAllCommands();
                    Forge.setModelCommands($scope.model, $scope.resourcePath, $scope.commands);
                    $scope.fetched = true;
                }
            }).
                error(function (data, status, headers, config) {
                Forge.log.warn("failed to load " + url + ". status: " + status + " data: " + data);
            });
        }]);
})(Forge || (Forge = {}));

/// <reference path="../../includes.ts"/>
/// <reference path="forgeHelpers.ts"/>
/// <reference path="forgePlugin.ts"/>
var Forge;
(function (Forge) {
    Forge.PipelinePicker = Forge.controller("PipelinePicker", ["$scope", "$templateCache", "$location", "$routeParams", "$http", "$timeout", "ForgeApiURL", "ForgeModel",
        function ($scope, $templateCache, $location, $routeParams, $http, $timeout, ForgeApiURL, ForgeModel) {
            var config = $scope.config || {};
            var properties = config.properties || {};
            var pipeline = properties.pipeline || {};
            $scope.pipelines = pipeline.typeaheadData;
            $scope.tableConfig = {
                data: 'pipelines',
                primaryKeyFn: function (item) { return item.value; },
                showSelectionCheckbox: false,
                enableRowClickSelection: true,
                multiSelect: false,
                selectedItems: [],
                filterOptions: {
                    filterText: ''
                },
                columnDefs: [
                    {
                        field: 'label',
                        displayName: 'Pipeline',
                        defaultSort: true
                    },
                    {
                        field: 'environments',
                        displayName: 'Environments',
                        cellTemplate: $templateCache.get("devOpsPipelineChooserEnvironments.html")
                    },
                    {
                        field: 'stages',
                        displayName: 'Stages',
                        cellTemplate: $templateCache.get("devOpsPipelineChooserStages.html")
                    }
                ]
            };
            entityChanged();
            $scope.$watch("entity.pipeline", entityChanged);
            $scope.$watchCollection("tableConfig.selectedItems", updateSelection);
            function entityChanged() {
                var pipeline = $scope.entity.pipeline || {};
                var pipelineValue = angular.isString(pipeline) ? pipeline : pipeline.value;
                var initialSelection = getSelection(pipelineValue);
                if (initialSelection) {
                    $scope.tableConfig.selectedItems = [initialSelection];
                    updateSelection();
                    Core.$apply($scope);
                }
            }
            function getSelection(value) {
                var answer = null;
                if (value) {
                    angular.forEach($scope.pipelines, function (pipeline) {
                        if (!answer && (value === pipeline.value || value === pipeline.label)) {
                            answer = pipeline;
                        }
                    });
                }
                return answer;
            }
            function updateSelection() {
                var selection = $scope.tableConfig.selectedItems;
                var selectedValue = "";
                var description = "";
                var selected = null;
                if (selection && selection.length) {
                    selected = selection[0];
                    selectedValue = selected.value;
                    description = selected.descriptionMarkdown;
                }
                $scope.selected = selected;
                $scope.html = description ? marked(description) : "";
                $scope.entity.pipeline = selectedValue;
                Forge.log.info("entity pipeline is now: " + $scope.entity.pipeline);
                Core.$apply($scope);
            }
        }]);
})(Forge || (Forge = {}));

/// <reference path="../../includes.ts"/>
/// <reference path="forgeHelpers.ts"/>
/// <reference path="forgePlugin.ts"/>
var Forge;
(function (Forge) {
    Forge.RepoController = Forge.controller("RepoController", ["$scope", "$templateCache", "$location", "$routeParams", "$http", "$timeout", "ForgeApiURL",
        function ($scope, $templateCache, $location, $routeParams, $http, $timeout, ForgeApiURL) {
            $scope.name = $routeParams["path"];
            Forge.initScope($scope, $location, $routeParams);
            Forge.redirectToSetupSecretsIfNotDefined($scope, $location);
            $scope.$on('$routeUpdate', function ($event) {
                updateData();
            });
            updateData();
            function updateData() {
                if ($scope.name) {
                    var url = Forge.repoApiUrl(ForgeApiURL, $scope.name);
                    url = Forge.createHttpUrl($scope.projectId, url);
                    var config = Forge.createHttpConfig();
                    $http.get(url, config).
                        success(function (data, status, headers, config) {
                        if (data) {
                            Forge.enrichRepo(data);
                        }
                        $scope.entity = data;
                        $scope.fetched = true;
                    }).
                        error(function (data, status, headers, config) {
                        Forge.log.warn("failed to load " + url + ". status: " + status + " data: " + data);
                    });
                }
                else {
                    $scope.fetched = true;
                }
            }
        }]);
})(Forge || (Forge = {}));

/// <reference path="../../includes.ts"/>
/// <reference path="forgeHelpers.ts"/>
/// <reference path="forgePlugin.ts"/>
var Forge;
(function (Forge) {
    Forge.ReposController = Forge.controller("ReposController", ["$scope", "$dialog", "$window", "$element", "$templateCache", "$routeParams", "$location", "localStorage", "$http", "$timeout", "ForgeApiURL", "KubernetesModel", "ServiceRegistry",
        function ($scope, $dialog, $window, $element, $templateCache, $routeParams, $location, localStorage, $http, $timeout, ForgeApiURL, KubernetesModel, ServiceRegistry) {
            $scope.model = KubernetesModel;
            $scope.resourcePath = $routeParams["path"];
            $scope.commandsLink = function (path) { return Forge.commandsLink(path, $scope.projectId); };
            Forge.initScope($scope, $location, $routeParams);
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
            $scope.sourceSecret = Forge.getProjectSourceSecret(localStorage, ns, projectId);
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
            $scope.doLogin = function () {
                var login = $scope.login;
                var user = login.user;
                var password = login.password;
                if (user && password) {
                    var userPwd = user + ':' + password;
                    login.authHeader = 'Basic ' + (userPwd.encodeBase64());
                    updateData();
                }
            };
            $scope.logout = function () {
                delete localStorage["gogsAuthorization"];
                $scope.login.authHeader = null;
                $scope.login.loggedIn = false;
                $scope.login.failed = false;
                Forge.loggedInToGogs = false;
            };
            $scope.openCommands = function () {
                var resourcePath = null;
                var selected = $scope.tableConfig.selectedItems;
                if (_.isArray(selected) && selected.length) {
                    resourcePath = selected[0].path;
                }
                var link = Forge.commandsLink(resourcePath, $scope.projectId);
                Forge.log.info("moving to commands link: " + link);
                $location.path(link);
            };
            $scope.delete = function (projects) {
                UI.multiItemConfirmActionDialog({
                    collection: projects,
                    index: 'path',
                    onClose: function (result) {
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
                    angular.forEach(secrets, function (secret) {
                        var name = Kubernetes.getName(secret);
                        if (name === $scope.sourceSecret) {
                            var requiredDataKeys = Kubernetes.httpsSecretDataKeys;
                            var valid = Forge.secretValid(secret, requiredDataKeys);
                            if (valid) {
                                found = true;
                            }
                            else {
                                Forge.log.warn("secret " + name + " is not valid, it does not contain keys: " + requiredDataKeys + " so clearing!");
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
                var namespaceName = Forge.getSourceSecretNamespace(localStorage);
                Kubernetes.watch($scope, $element, "secrets", namespaceName, onPersonalSecrets);
            }
            function doDelete(projects) {
                angular.forEach(projects, function (project) {
                    Forge.log.info("Deleting " + angular.toJson($scope.projects));
                    var path = project.path;
                    if (path) {
                        var url = Forge.repoApiUrl(ForgeApiURL, path);
                        $http.delete(url).
                            success(function (data, status, headers, config) {
                            updateData();
                        }).
                            error(function (data, status, headers, config) {
                            Forge.log.warn("failed to load " + url + ". status: " + status + " data: " + data);
                            var message = "Failed to POST to " + url + " got status: " + status;
                            Core.notification('error', message);
                        });
                    }
                });
            }
            function updateLinks() {
                var $gogsLink = ServiceRegistry.serviceReadyLink(Forge.gogsServiceName);
                if ($gogsLink) {
                    $scope.signUpUrl = UrlHelpers.join($gogsLink, "user/sign_up");
                    $scope.forgotPasswordUrl = UrlHelpers.join($gogsLink, "user/forget_password");
                }
                $scope.$gogsLink = $gogsLink;
                $scope.$forgeLink = ServiceRegistry.serviceReadyLink(Kubernetes.fabric8ForgeServiceName);
                $scope.$hasCDPipelineTemplate = _.any($scope.model.templates, function (t) { return "cd-pipeline" === Kubernetes.getName(t); });
                var expectedRCS = [Kubernetes.gogsServiceName, Kubernetes.fabric8ForgeServiceName, Kubernetes.jenkinsServiceName];
                var requiredRCs = {};
                var ns = Kubernetes.currentKubernetesNamespace();
                var runningCDPipeline = true;
                angular.forEach(expectedRCS, function (rcName) {
                    var rc = $scope.model.getReplicationController(ns, rcName);
                    if (rc) {
                        requiredRCs[rcName] = rc;
                    }
                    else {
                        runningCDPipeline = false;
                    }
                });
                $scope.$requiredRCs = requiredRCs;
                $scope.$runningCDPipeline = runningCDPipeline;
                var url = "";
                $location = Kubernetes.inject("$location");
                if ($location) {
                    url = $location.url();
                }
                if (!url) {
                    url = window.location.toString();
                }
                var templateNamespace = "default";
                $scope.$runCDPipelineLink = "/kubernetes/namespace/" + templateNamespace + "/templates/" + ns + "?q=cd-pipeline&returnTo=" + encodeURIComponent(url);
            }
            function updateData() {
                var authHeader = $scope.login.authHeader;
                var email = $scope.login.email || "";
                if (authHeader) {
                    var url = Forge.reposApiUrl(ForgeApiURL);
                    url = Forge.createHttpUrl($scope.projectId, url, authHeader, email);
                    var config = {};
                    $http.get(url, config).
                        success(function (data, status, headers, config) {
                        $scope.login.failed = false;
                        $scope.login.loggedIn = true;
                        Forge.loggedInToGogs = true;
                        var avatar_url = null;
                        if (status === 200) {
                            if (!data || !angular.isArray(data)) {
                                data = [];
                            }
                            localStorage["gogsAuthorization"] = authHeader;
                            localStorage["gogsEmail"] = email;
                            localStorage["gogsUser"] = $scope.login.user || "";
                            $scope.projects = _.sortBy(data, "name");
                            angular.forEach($scope.projects, function (repo) {
                                Forge.enrichRepo(repo);
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
                            Forge.log.warn("failed to load " + url + ". status: " + status + " data: " + data);
                        }
                    });
                }
            }
            updateData();
        }]);
})(Forge || (Forge = {}));

// <reference path="../../includes.ts"/>
/// <reference path="forgeHelpers.ts"/>
var Forge;
(function (Forge) {
    var secretNamespaceKey = "fabric8SourceSecretNamespace";
    var secretNameKey = "fabric8SourceSecret";
    function getSourceSecretNamespace(localStorage) {
        var secretNamespace = localStorage[secretNamespaceKey];
        var userName = Kubernetes.currentUserName();
        if (!secretNamespace) {
            secretNamespace = "user-secrets-source-" + userName;
        }
        return secretNamespace;
    }
    Forge.getSourceSecretNamespace = getSourceSecretNamespace;
    function getProjectSourceSecret(localStorage, ns, projectId) {
        if (!ns) {
            ns = Kubernetes.currentKubernetesNamespace();
        }
        var secretKey = createLocalStorageKey(secretNameKey, ns, projectId);
        var sourceSecret = localStorage[secretKey];
        return sourceSecret;
    }
    Forge.getProjectSourceSecret = getProjectSourceSecret;
    function setProjectSourceSecret(localStorage, ns, projectId, secretName) {
        var secretKey = createLocalStorageKey(secretNameKey, ns, projectId);
        localStorage[secretKey] = secretName;
    }
    Forge.setProjectSourceSecret = setProjectSourceSecret;
    function secretValid(secret, requiredDataKeys) {
        var data = secret.data;
        var valid = true;
        if (data) {
            angular.forEach(requiredDataKeys, function (key) {
                if (!data[key]) {
                    valid = false;
                }
            });
        }
        else {
            valid = false;
        }
        return valid;
    }
    Forge.secretValid = secretValid;
    function parseUrl(url) {
        if (url) {
            var parser = document.createElement('a');
            parser.href = url;
            return parser;
        }
        return {
            protocol: "",
            host: ""
        };
    }
    Forge.parseUrl = parseUrl;
    function createLocalStorageKey(prefix, ns, name) {
        return prefix + "/" + ns + "/" + (name || "");
    }
})(Forge || (Forge = {}));

/// <reference path="../../includes.ts"/>
/// <reference path="forgeHelpers.ts"/>
/// <reference path="secretHelpers.ts"/>
var Forge;
(function (Forge) {
    Forge.SecretsController = Forge.controller("SecretsController", ["$scope", "$dialog", "$window", "$element", "$templateCache", "$routeParams", "$location", "localStorage", "$http", "$timeout", "ForgeApiURL", "ForgeModel", "KubernetesModel",
        function ($scope, $dialog, $window, $element, $templateCache, $routeParams, $location, localStorage, $http, $timeout, ForgeApiURL, ForgeModel, KubernetesModel) {
            $scope.model = KubernetesModel;
            Forge.initScope($scope, $location, $routeParams);
            $scope.breadcrumbConfig = Developer.createProjectSettingsBreadcrumbs($scope.projectId);
            $scope.subTabConfig = Developer.createProjectSettingsSubNavBars($scope.projectId);
            var projectId = $scope.projectId;
            var ns = $scope.namespace;
            var userName = Kubernetes.currentUserName();
            var createdSecret = $location.search()["secret"];
            var projectClient = Kubernetes.createKubernetesClient("projects");
            $scope.requiredDataKeys = Kubernetes.httpsSecretDataKeys;
            $scope.sourceSecretNamespace = Forge.getSourceSecretNamespace(localStorage);
            $scope.setupSecretsLink = Developer.projectSecretsLink(ns, projectId);
            $scope.secretNamespaceLink = Developer.secretsNamespaceLink(ns, projectId, $scope.sourceSecretNamespace);
            getCurrentSecretName();
            Forge.log.debug("Found source secret namespace " + $scope.sourceSecretNamespace);
            Forge.log.debug("Found source secret for " + ns + "/" + projectId + " = " + $scope.sourceSecret);
            $scope.$on('$routeUpdate', function ($event) {
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
            }
            else {
                selectedSecretName();
            }
            $scope.$watchCollection("tableConfig.selectedItems", function () {
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
                }
                else {
                    var localStoredSecretName = Forge.getProjectSourceSecret(localStorage, ns, projectId);
                    if (localStoredSecretName) {
                        if ($scope.personalSecrets && $scope.personalSecrets.length) {
                            var valid = false;
                            angular.forEach($scope.personalSecrets, function (secret) {
                                if (localStoredSecretName === Kubernetes.getName(secret)) {
                                    if (Forge.secretValid(secret, $scope.requiredDataKeys)) {
                                        valid = true;
                                    }
                                }
                            });
                            if (!valid) {
                                Forge.log.info("Clearing secret name configuration: " + localStoredSecretName + " as the secret no longer exists!");
                                localStoredSecretName = "";
                                Forge.setProjectSourceSecret(localStorage, ns, projectId, localStoredSecretName);
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
                            createdSecret = null;
                        }
                    }
                }
                return $scope.selectedSecretName;
            }
            $scope.cancel = function () {
                var selectedItems = $scope.tableConfig.selectedItems;
                selectedItems.splice(0, selectedItems.length);
                var current = getCurrentSecretName();
                if (current) {
                    angular.forEach($scope.personalSecrets, function (secret) {
                        if (!selectedItems.length && current === Kubernetes.getName(secret)) {
                            selectedItems.push(secret);
                        }
                    });
                }
                $scope.tableConfig.selectedItems = selectedItems;
                selectedSecretName();
            };
            $scope.canSave = function () {
                var selected = selectedSecretName();
                var current = getCurrentSecretName();
                return selected && (selected !== current || selected == createdSecret);
            };
            $scope.save = function () {
                var selected = selectedSecretName();
                if (selected) {
                    Forge.setProjectSourceSecret(localStorage, ns, projectId, selected);
                    if (!projectId) {
                        $location.path(Developer.createProjectLink(ns));
                    }
                }
            };
            checkNamespaceCreated();
            function updateProject() {
                angular.forEach($scope.model.buildconfigs, function (project) {
                    if (projectId === Kubernetes.getName(project)) {
                        $scope.project = project;
                    }
                });
                $scope.gitUrl = Core.pathGet($scope.project, ['spec', 'source', 'git', 'uri']);
                var parser = Forge.parseUrl($scope.gitUrl);
                var kind = parser.protocol;
                if (!$scope.gitUrl) {
                    kind = "https";
                }
                else if ($scope.gitUrl && $scope.gitUrl.startsWith("git@")) {
                    kind = "ssh";
                }
                var host = parser.host;
                var requiredDataKeys = Kubernetes.sshSecretDataKeys;
                if (kind && kind.startsWith('http')) {
                    kind = 'https';
                    requiredDataKeys = Kubernetes.httpsSecretDataKeys;
                }
                else {
                    kind = 'ssh';
                }
                $scope.kind = kind;
                $scope.requiredDataKeys = requiredDataKeys;
                var savedUrl = $location.path();
                var newSecretPath = UrlHelpers.join("namespace", $scope.sourceSecretNamespace, "secretCreate?kind=" + kind + "&savedUrl=" + savedUrl);
                $scope.addNewSecretLink = (projectId) ?
                    Developer.projectWorkspaceLink(ns, projectId, newSecretPath) :
                    UrlHelpers.join(HawtioCore.documentBase(), Kubernetes.context, newSecretPath);
                var filteredSecrets = [];
                var selection = [];
                var currentSecretName = getCurrentSecretName();
                angular.forEach($scope.personalSecrets, function (secret) {
                    var valid = Forge.secretValid(secret, requiredDataKeys);
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
                var namespaceName = Forge.getSourceSecretNamespace(localStorage);
                function watchSecrets() {
                    Forge.log.info("watching secrets on namespace: " + namespaceName);
                    Kubernetes.watch($scope, $element, "secrets", namespaceName, onPersonalSecrets);
                    Kubernetes.watch($scope, $element, "buildconfigs", ns, onBuildConfigs);
                    Core.$apply($scope);
                }
                if (!$scope.secretNamespace) {
                    angular.forEach($scope.model.projects, function (project) {
                        var name = Kubernetes.getName(project);
                        if (name === namespaceName) {
                            $scope.secretNamespace = project;
                            watchSecrets();
                        }
                    });
                }
                if (!$scope.secretNamespace && $scope.model.projects && $scope.model.projects.length) {
                    Forge.log.info("Creating a new namespace for the user secrets.... " + namespaceName);
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
                    projectClient.put(project, function (data) {
                        $scope.secretNamespace = project;
                        watchSecrets();
                    }, function (err) {
                        Forge.log.warn("Failed to create secret namespace: " + namespaceName + ": " + angular.toJson(err));
                    });
                }
            }
        }]);
})(Forge || (Forge = {}));

/// Copyright 2014-2015 Red Hat, Inc. and/or its affiliates
/// and other contributors as indicated by the @author tags.
///
/// Licensed under the Apache License, Version 2.0 (the "License");
/// you may not use this file except in compliance with the License.
/// You may obtain a copy of the License at
///
///   http://www.apache.org/licenses/LICENSE-2.0
///
/// Unless required by applicable law or agreed to in writing, software
/// distributed under the License is distributed on an "AS IS" BASIS,
/// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
/// See the License for the specific language governing permissions and
/// limitations under the License.
/// <reference path="../../includes.ts"/>
var Main;
(function (Main) {
    Main.pluginName = "fabric8-console";
    Main.log = Logger.get(Main.pluginName);
    Main.templatePath = "plugins/main/html";
    Main.chatServiceName = "letschat";
    Main.grafanaServiceName = "grafana";
    Main.appLibraryServiceName = "app-library";
    Main.version = {};
})(Main || (Main = {}));

/// Copyright 2014-2015 Red Hat, Inc. and/or its affiliates
/// and other contributors as indicated by the @author tags.
///
/// Licensed under the Apache License, Version 2.0 (the "License");
/// you may not use this file except in compliance with the License.
/// You may obtain a copy of the License at
///
///   http://www.apache.org/licenses/LICENSE-2.0
///
/// Unless required by applicable law or agreed to in writing, software
/// distributed under the License is distributed on an "AS IS" BASIS,
/// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
/// See the License for the specific language governing permissions and
/// limitations under the License.
/// <reference path="../../includes.ts"/>
/// <reference path="../../forge/ts/forgeHelpers.ts"/>
/// <reference path="mainGlobals.ts"/>
var Main;
(function (Main) {
    Main._module = angular.module(Main.pluginName, [Forge.pluginName]);
    var tab = undefined;
    Main._module.run(["$rootScope", "HawtioNav", "KubernetesModel", "ServiceRegistry", "preferencesRegistry", function ($rootScope, HawtioNav, KubernetesModel, ServiceRegistry, preferencesRegistry) {
        HawtioNav.on(HawtioMainNav.Actions.CHANGED, Main.pluginName, function (items) {
            items.forEach(function (item) {
                switch (item.id) {
                    case 'forge':
                    case 'jvm':
                    case 'wiki':
                    case 'docker-registry':
                        item.isValid = function () { return false; };
                }
            });
        });
        HawtioNav.add({
            id: 'library',
            title: function () { return 'Library'; },
            tooltip: function () { return 'View the library of applications'; },
            isValid: function () { return ServiceRegistry.hasService(Main.appLibraryServiceName) && ServiceRegistry.hasService("app-library-jolokia"); },
            href: function () { return "/wiki/view"; },
            isActive: function () { return false; }
        });
        var kibanaServiceName = Kubernetes.kibanaServiceName;
        HawtioNav.add({
            id: 'kibana',
            title: function () { return 'Logs'; },
            tooltip: function () { return 'View and search all logs across all containers using Kibana and ElasticSearch'; },
            isValid: function () { return ServiceRegistry.hasService(kibanaServiceName); },
            href: function () { return Kubernetes.kibanaLogsLink(ServiceRegistry); },
            isActive: function () { return false; }
        });
        HawtioNav.add({
            id: 'apiman',
            title: function () { return 'API Management'; },
            tooltip: function () { return 'Add Policies and Plans to your APIs with Apiman'; },
            isValid: function () { return ServiceRegistry.hasService('apiman'); },
            oldHref: function () { },
            href: function () {
                var hash = {
                    backTo: new URI().toString(),
                    token: HawtioOAuth.getOAuthToken()
                };
                var uri = new URI(ServiceRegistry.serviceLink('apiman'));
                uri.port('80').query({}).path('apimanui/index.html').hash(URI.encode(angular.toJson(hash)));
                return uri.toString();
            }
        });
        HawtioNav.add({
            id: 'grafana',
            title: function () { return 'Metrics'; },
            tooltip: function () { return 'Views metrics across all containers using Grafana and InfluxDB'; },
            isValid: function () { return ServiceRegistry.hasService(Main.grafanaServiceName); },
            href: function () { return ServiceRegistry.serviceLink(Main.grafanaServiceName); },
            isActive: function () { return false; }
        });
        HawtioNav.add({
            id: "chat",
            title: function () { return 'Chat'; },
            tooltip: function () { return 'Chat room for discussing this namespace'; },
            isValid: function () { return ServiceRegistry.hasService(Main.chatServiceName); },
            href: function () {
                var answer = ServiceRegistry.serviceLink(Main.chatServiceName);
                if (answer) {
                }
                return answer;
            },
            isActive: function () { return false; }
        });
        preferencesRegistry.addTab('About ' + Main.version.name, UrlHelpers.join(Main.templatePath, 'about.html'));
        Main.log.info("started, version: ", Main.version.version);
        Main.log.info("commit ID: ", Main.version.commitId);
    }]);
    hawtioPluginLoader.registerPreBootstrapTask(function (next) {
        $.ajax({
            url: 'version.json?rev=' + Date.now(),
            success: function (data) {
                try {
                    Main.version = angular.fromJson(data);
                }
                catch (err) {
                    Main.version = {
                        name: 'fabric8-console',
                        version: ''
                    };
                }
                next();
            },
            error: function (jqXHR, text, status) {
                Main.log.debug("Failed to fetch version: jqXHR: ", jqXHR, " text: ", text, " status: ", status);
                next();
            },
            dataType: "html"
        });
    });
    hawtioPluginLoader.addModule(Main.pluginName);
})(Main || (Main = {}));

/// <reference path="mainGlobals.ts"/>
/// <reference path="mainPlugin.ts"/>
var Main;
(function (Main) {
    Main._module.controller('Main.About', ["$scope", function ($scope) {
        $scope.info = Main.version;
    }]);
})(Main || (Main = {}));

/// <reference path="../../includes.ts"/>
var Wiki;
(function (Wiki) {
    Wiki.log = Logger.get("Wiki");
    Wiki.camelNamespaces = ["http://camel.apache.org/schema/spring", "http://camel.apache.org/schema/blueprint"];
    Wiki.springNamespaces = ["http://www.springframework.org/schema/beans"];
    Wiki.droolsNamespaces = ["http://drools.org/schema/drools-spring"];
    Wiki.dozerNamespaces = ["http://dozer.sourceforge.net"];
    Wiki.activemqNamespaces = ["http://activemq.apache.org/schema/core"];
    Wiki.useCamelCanvasByDefault = false;
    Wiki.excludeAdjustmentPrefixes = ["http://", "https://", "#"];
    (function (ViewMode) {
        ViewMode[ViewMode["List"] = 0] = "List";
        ViewMode[ViewMode["Icon"] = 1] = "Icon";
    })(Wiki.ViewMode || (Wiki.ViewMode = {}));
    var ViewMode = Wiki.ViewMode;
    ;
    Wiki.customWikiViewPages = ["/formTable", "/camel/diagram", "/camel/canvas", "/camel/properties", "/dozer/mappings"];
    Wiki.hideExtensions = [".profile"];
    var defaultFileNamePattern = /^[a-zA-Z0-9._-]*$/;
    var defaultFileNamePatternInvalid = "Name must be: letters, numbers, and . _ or - characters";
    var defaultFileNameExtensionPattern = "";
    var defaultLowerCaseFileNamePattern = /^[a-z0-9._-]*$/;
    var defaultLowerCaseFileNamePatternInvalid = "Name must be: lower-case letters, numbers, and . _ or - characters";
    Wiki.documentTemplates = [
        {
            label: "Folder",
            tooltip: "Create a new folder to contain documents",
            folder: true,
            icon: "/img/icons/wiki/folder.gif",
            exemplar: "myfolder",
            regex: defaultLowerCaseFileNamePattern,
            invalid: defaultLowerCaseFileNamePatternInvalid
        },
        {
            label: "Properties File",
            tooltip: "A properties file typically used to configure Java classes",
            exemplar: "properties-file.properties",
            regex: defaultFileNamePattern,
            invalid: defaultFileNamePatternInvalid,
            extension: ".properties"
        },
        {
            label: "JSON File",
            tooltip: "A file containing JSON data",
            exemplar: "document.json",
            regex: defaultFileNamePattern,
            invalid: defaultFileNamePatternInvalid,
            extension: ".json"
        },
        {
            label: "Markdown Document",
            tooltip: "A basic markup document using the Markdown wiki markup, particularly useful for ReadMe files in directories",
            exemplar: "ReadMe.md",
            regex: defaultFileNamePattern,
            invalid: defaultFileNamePatternInvalid,
            extension: ".md"
        },
        {
            label: "Text Document",
            tooltip: "A plain text file",
            exemplar: "document.text",
            regex: defaultFileNamePattern,
            invalid: defaultFileNamePatternInvalid,
            extension: ".txt"
        },
        {
            label: "HTML Document",
            tooltip: "A HTML document you can edit directly using the HTML markup",
            exemplar: "document.html",
            regex: defaultFileNamePattern,
            invalid: defaultFileNamePatternInvalid,
            extension: ".html"
        },
        {
            label: "XML Document",
            tooltip: "An empty XML document",
            exemplar: "document.xml",
            regex: defaultFileNamePattern,
            invalid: defaultFileNamePatternInvalid,
            extension: ".xml"
        },
        {
            label: "Integration Flows",
            tooltip: "Camel routes for defining your integration flows",
            children: [
                {
                    label: "Camel XML document",
                    tooltip: "A vanilla Camel XML document for integration flows",
                    icon: "/img/icons/camel.svg",
                    exemplar: "camel.xml",
                    regex: defaultFileNamePattern,
                    invalid: defaultFileNamePatternInvalid,
                    extension: ".xml"
                },
                {
                    label: "Camel OSGi Blueprint XML document",
                    tooltip: "A vanilla Camel XML document for integration flows when using OSGi Blueprint",
                    icon: "/img/icons/camel.svg",
                    exemplar: "camel-blueprint.xml",
                    regex: defaultFileNamePattern,
                    invalid: defaultFileNamePatternInvalid,
                    extension: ".xml"
                },
                {
                    label: "Camel Spring XML document",
                    tooltip: "A vanilla Camel XML document for integration flows when using the Spring framework",
                    icon: "/img/icons/camel.svg",
                    exemplar: "camel-spring.xml",
                    regex: defaultFileNamePattern,
                    invalid: defaultFileNamePatternInvalid,
                    extension: ".xml"
                }
            ]
        },
        {
            label: "Data Mapping Document",
            tooltip: "Dozer based configuration of mapping documents",
            icon: "/img/icons/dozer/dozer.gif",
            exemplar: "dozer-mapping.xml",
            regex: defaultFileNamePattern,
            invalid: defaultFileNamePatternInvalid,
            extension: ".xml"
        }
    ];
    function isFMCContainer(workspace) {
        return false;
    }
    Wiki.isFMCContainer = isFMCContainer;
    function isWikiEnabled(workspace, jolokia, localStorage) {
        return true;
    }
    Wiki.isWikiEnabled = isWikiEnabled;
    function goToLink(link, $timeout, $location) {
        var href = Core.trimLeading(link, "#");
        $timeout(function () {
            Wiki.log.debug("About to navigate to: " + href);
            $location.url(href);
        }, 100);
    }
    Wiki.goToLink = goToLink;
    function customViewLinks($scope) {
        var prefix = Core.trimLeading(Wiki.startLink($scope), "#");
        return Wiki.customWikiViewPages.map(function (path) { return prefix + path; });
    }
    Wiki.customViewLinks = customViewLinks;
    function createWizardTree(workspace, $scope) {
        var root = createFolder("New Documents");
        addCreateWizardFolders(workspace, $scope, root, Wiki.documentTemplates);
        return root;
    }
    Wiki.createWizardTree = createWizardTree;
    function createFolder(name) {
        return {
            name: name,
            children: []
        };
    }
    function addCreateWizardFolders(workspace, $scope, parent, templates) {
        angular.forEach(templates, function (template) {
            if (template.generated) {
                if (template.generated.init) {
                    template.generated.init(workspace, $scope);
                }
            }
            var title = template.label || key;
            var node = createFolder(title);
            node.parent = parent;
            node.entity = template;
            var addClass = template.addClass;
            if (addClass) {
                node.addClass = addClass;
            }
            var key = template.exemplar;
            var parentKey = parent.key || "";
            node.key = parentKey ? parentKey + "_" + key : key;
            var icon = template.icon;
            if (icon) {
                node.icon = Core.url(icon);
            }
            var tooltip = template["tooltip"] || template["description"] || '';
            node.tooltip = tooltip;
            if (template["folder"]) {
                node.isFolder = function () { return true; };
            }
            parent.children.push(node);
            var children = template.children;
            if (children) {
                addCreateWizardFolders(workspace, $scope, node, children);
            }
        });
    }
    Wiki.addCreateWizardFolders = addCreateWizardFolders;
    function startWikiLink(projectId, branch) {
        var start = UrlHelpers.join(Developer.projectLink(projectId), "/wiki");
        if (branch) {
            start = UrlHelpers.join(start, 'branch', branch);
        }
        return start;
    }
    Wiki.startWikiLink = startWikiLink;
    function startLink($scope) {
        var projectId = $scope.projectId;
        var branch = $scope.branch;
        return startWikiLink(projectId, branch);
    }
    Wiki.startLink = startLink;
    function isIndexPage(path) {
        return path && (path.endsWith("index.md") || path.endsWith("index.html") || path.endsWith("index")) ? true : false;
    }
    Wiki.isIndexPage = isIndexPage;
    function viewLink($scope, pageId, $location, fileName) {
        if (fileName === void 0) { fileName = null; }
        var link = null;
        var start = startLink($scope);
        if (pageId) {
            var view = isIndexPage(pageId) ? "/book/" : "/view/";
            link = start + view + encodePath(Core.trimLeading(pageId, "/"));
        }
        else {
            var path = $location.path();
            link = "#" + path.replace(/(edit|create)/, "view");
        }
        if (fileName && pageId && pageId.endsWith(fileName)) {
            return link;
        }
        if (fileName) {
            if (!link.endsWith("/")) {
                link += "/";
            }
            link += fileName;
        }
        return link;
    }
    Wiki.viewLink = viewLink;
    function branchLink($scope, pageId, $location, fileName) {
        if (fileName === void 0) { fileName = null; }
        return viewLink($scope, pageId, $location, fileName);
    }
    Wiki.branchLink = branchLink;
    function editLink($scope, pageId, $location) {
        var link = null;
        var format = Wiki.fileFormat(pageId);
        switch (format) {
            case "image":
                break;
            default:
                var start = startLink($scope);
                if (pageId) {
                    link = start + "/edit/" + encodePath(pageId);
                }
                else {
                    var path = $location.path();
                    link = "#" + path.replace(/(view|create)/, "edit");
                }
        }
        return link;
    }
    Wiki.editLink = editLink;
    function createLink($scope, pageId, $location) {
        var path = $location.path();
        var start = startLink($scope);
        var link = '';
        if (pageId) {
            link = start + "/create/" + encodePath(pageId);
        }
        else {
            link = "#" + path.replace(/(view|edit|formTable)/, "create");
        }
        var idx = link.lastIndexOf("/");
        if (idx > 0 && !$scope.children && !path.startsWith("/wiki/formTable")) {
            link = link.substring(0, idx + 1);
        }
        return link;
    }
    Wiki.createLink = createLink;
    function encodePath(pageId) {
        return pageId.split("/").map(encodeURIComponent).join("/");
    }
    Wiki.encodePath = encodePath;
    function decodePath(pageId) {
        return pageId.split("/").map(decodeURIComponent).join("/");
    }
    Wiki.decodePath = decodePath;
    function fileFormat(name, fileExtensionTypeRegistry) {
        var extension = fileExtension(name);
        if (name) {
            if (name === "Jenkinsfile") {
                extension = "groovy";
            }
        }
        var answer = null;
        if (!fileExtensionTypeRegistry) {
            fileExtensionTypeRegistry = HawtioCore.injector.get("fileExtensionTypeRegistry");
        }
        angular.forEach(fileExtensionTypeRegistry, function (array, key) {
            if (array.indexOf(extension) >= 0) {
                answer = key;
            }
        });
        return answer;
    }
    Wiki.fileFormat = fileFormat;
    function fileName(path) {
        if (path) {
            var idx = path.lastIndexOf("/");
            if (idx > 0) {
                return path.substring(idx + 1);
            }
        }
        return path;
    }
    Wiki.fileName = fileName;
    function fileParent(path) {
        if (path) {
            var idx = path.lastIndexOf("/");
            if (idx > 0) {
                return path.substring(0, idx);
            }
        }
        return "";
    }
    Wiki.fileParent = fileParent;
    function hideFileNameExtensions(name) {
        if (name) {
            angular.forEach(Wiki.hideExtensions, function (extension) {
                if (name.endsWith(extension)) {
                    name = name.substring(0, name.length - extension.length);
                }
            });
        }
        return name;
    }
    Wiki.hideFileNameExtensions = hideFileNameExtensions;
    function gitRestURL($scope, path) {
        var url = gitRelativeURL($scope, path);
        url = Core.url('/' + url);
        return url;
    }
    Wiki.gitRestURL = gitRestURL;
    function gitUrlPrefix() {
        var prefix = "";
        var injector = HawtioCore.injector;
        if (injector) {
            prefix = injector.get("WikiGitUrlPrefix") || "";
        }
        return prefix;
    }
    function gitRelativeURL($scope, path) {
        var branch = $scope.branch;
        var prefix = gitUrlPrefix();
        branch = branch || "master";
        path = path || "/";
        return UrlHelpers.join(prefix, "git/" + branch, path);
    }
    Wiki.gitRelativeURL = gitRelativeURL;
    function fileIconHtml(row) {
        var name = row.name;
        var path = row.path;
        var branch = row.branch;
        var directory = row.directory;
        var xmlNamespaces = row.xml_namespaces || row.xmlNamespaces;
        var iconUrl = row.iconUrl;
        var entity = row.entity;
        if (entity) {
            name = name || entity.name;
            path = path || entity.path;
            branch = branch || entity.branch;
            directory = directory || entity.directory;
            xmlNamespaces = xmlNamespaces || entity.xml_namespaces || entity.xmlNamespaces;
            iconUrl = iconUrl || entity.iconUrl;
        }
        branch = branch || "master";
        var css = null;
        var icon = null;
        var extension = fileExtension(name);
        if (xmlNamespaces && xmlNamespaces.length) {
            if (xmlNamespaces.any(function (ns) { return Wiki.camelNamespaces.any(ns); })) {
                icon = "img/icons/camel.svg";
            }
            else if (xmlNamespaces.any(function (ns) { return Wiki.dozerNamespaces.any(ns); })) {
                icon = "img/icons/dozer/dozer.gif";
            }
            else if (xmlNamespaces.any(function (ns) { return Wiki.activemqNamespaces.any(ns); })) {
                icon = "img/icons/messagebroker.svg";
            }
            else {
                Wiki.log.debug("file " + name + " has namespaces " + xmlNamespaces);
            }
        }
        if (!iconUrl && name) {
            var lowerName = name.toLowerCase();
            if (lowerName == "pom.xml") {
                iconUrl = "img/maven-icon.png";
            }
            else if (lowerName == "jenkinsfile") {
                iconUrl = "img/jenkins-icon.svg";
            }
            else if (lowerName == "fabric8.yml") {
                iconUrl = "img/fabric8_icon.svg";
            }
        }
        if (iconUrl) {
            css = null;
            icon = iconUrl;
        }
        if (!icon) {
            if (directory) {
                switch (extension) {
                    case 'profile':
                        css = "fa fa-book";
                        break;
                    default:
                        css = "fa fa-folder folder-icon";
                }
            }
            else {
                switch (extension) {
                    case 'java':
                        icon = "img/java.svg";
                        break;
                    case 'png':
                    case 'svg':
                    case 'jpg':
                    case 'gif':
                        css = null;
                        icon = Wiki.gitRelativeURL(branch, path);
                        break;
                    case 'json':
                    case 'xml':
                        css = "fa fa-file-text";
                        break;
                    case 'md':
                        css = "fa fa-file-text-o";
                        break;
                    default:
                        css = "fa fa-file-o";
                }
            }
        }
        if (icon) {
            return "<img src='" + Core.url(icon) + "'>";
        }
        else {
            return "<i class='" + css + "'></i>";
        }
    }
    Wiki.fileIconHtml = fileIconHtml;
    function iconClass(row) {
        var name = row.getProperty("name");
        var extension = fileExtension(name);
        var directory = row.getProperty("directory");
        if (directory) {
            return "fa fa-folder";
        }
        if ("xml" === extension) {
            return "fa fa-cog";
        }
        else if ("md" === extension) {
            return "fa fa-file-text-o";
        }
        return "fa fa-file-o";
    }
    Wiki.iconClass = iconClass;
    function initScope($scope, $routeParams, $location) {
        $scope.pageId = Wiki.pageId($routeParams, $location);
        $scope.projectId = $routeParams["projectId"] || $scope.id;
        $scope.namespace = $routeParams["namespace"] || $scope.namespace;
        Kubernetes.setCurrentKubernetesNamespace($scope.namespace);
        $scope.owner = $routeParams["owner"];
        $scope.repoId = $routeParams["repoId"];
        $scope.branch = $routeParams["branch"] || $location.search()["branch"];
        $scope.objectId = $routeParams["objectId"] || $routeParams["diffObjectId1"];
        $scope.startLink = startLink($scope);
        $scope.$viewLink = viewLink($scope, $scope.pageId, $location);
        $scope.historyLink = startLink($scope) + "/history/" + ($scope.pageId || "");
        $scope.wikiRepository = new Wiki.GitWikiRepository($scope);
        $scope.$workspaceLink = Developer.workspaceLink();
        $scope.$projectLink = Developer.projectLink($scope.projectId);
        $scope.breadcrumbConfig = Developer.createProjectBreadcrumbs($scope.projectId, Wiki.createSourceBreadcrumbs($scope));
        $scope.subTabConfig = Developer.createProjectSubNavBars($scope.projectId);
        Forge.redirectToSetupSecretsIfNotDefined($scope, $location);
    }
    Wiki.initScope = initScope;
    function loadBranches(jolokia, wikiRepository, $scope, isFmc) {
        if (isFmc === void 0) { isFmc = false; }
        wikiRepository.branches(function (response) {
            $scope.branches = response.sortBy(function (v) { return Core.versionToSortableString(v); }, true);
            if (!$scope.branch && $scope.branches.find(function (branch) {
                return branch === "master";
            })) {
                $scope.branch = "master";
            }
            Core.$apply($scope);
        });
    }
    Wiki.loadBranches = loadBranches;
    function pageId($routeParams, $location) {
        var pageId = $routeParams['page'];
        if (!pageId) {
            for (var i = 0; i < 100; i++) {
                var value = $routeParams['path' + i];
                if (angular.isDefined(value)) {
                    if (!pageId) {
                        pageId = value;
                    }
                    else {
                        pageId += "/" + value;
                    }
                }
                else
                    break;
            }
            return pageId || "/";
        }
        if (!pageId) {
            pageId = pageIdFromURI($location.path());
        }
        return pageId;
    }
    Wiki.pageId = pageId;
    function pageIdFromURI(url) {
        var wikiPrefix = "/wiki/";
        if (url && url.startsWith(wikiPrefix)) {
            var idx = url.indexOf("/", wikiPrefix.length + 1);
            if (idx > 0) {
                return url.substring(idx + 1, url.length);
            }
        }
        return null;
    }
    Wiki.pageIdFromURI = pageIdFromURI;
    function fileExtension(name) {
        if (name.indexOf('#') > 0)
            name = name.substring(0, name.indexOf('#'));
        return Core.fileExtension(name, "markdown");
    }
    Wiki.fileExtension = fileExtension;
    function onComplete(status) {
        console.log("Completed operation with status: " + JSON.stringify(status));
    }
    Wiki.onComplete = onComplete;
    function parseJson(text) {
        if (text) {
            try {
                return JSON.parse(text);
            }
            catch (e) {
                Core.notification("error", "Failed to parse JSON: " + e);
            }
        }
        return null;
    }
    Wiki.parseJson = parseJson;
    function adjustHref($scope, $location, href, fileExtension) {
        var extension = fileExtension ? "." + fileExtension : "";
        var path = $location.path();
        var folderPath = path;
        var idx = path.lastIndexOf("/");
        if (idx > 0) {
            var lastName = path.substring(idx + 1);
            if (lastName.indexOf(".") >= 0) {
                folderPath = path.substring(0, idx);
            }
        }
        if (href.startsWith('../')) {
            var parts = href.split('/');
            var pathParts = folderPath.split('/');
            var parents = parts.filter(function (part) {
                return part === "..";
            });
            parts = parts.last(parts.length - parents.length);
            pathParts = pathParts.first(pathParts.length - parents.length);
            return '#' + pathParts.join('/') + '/' + parts.join('/') + extension + $location.hash();
        }
        if (href.startsWith('/')) {
            return Wiki.branchLink($scope, href + extension, $location) + extension;
        }
        if (!Wiki.excludeAdjustmentPrefixes.any(function (exclude) {
            return href.startsWith(exclude);
        })) {
            return '#' + folderPath + "/" + href + extension + $location.hash();
        }
        else {
            return null;
        }
    }
    Wiki.adjustHref = adjustHref;
})(Wiki || (Wiki = {}));

/// <reference path="../../includes.ts"/>
/// <reference path="wikiHelpers.ts"/>
var Wiki;
(function (Wiki) {
    Wiki.pluginName = 'wiki';
    Wiki.templatePath = 'plugins/wiki/html/';
    Wiki.tab = null;
    Wiki._module = angular.module(Wiki.pluginName, ['hawtio-core', 'hawtio-ui', 'treeControl', 'ui.codemirror']);
    Wiki.controller = PluginHelpers.createControllerFunction(Wiki._module, 'Wiki');
    Wiki.route = PluginHelpers.createRoutingFunction(Wiki.templatePath);
    Wiki._module.config(["$routeProvider", function ($routeProvider) {
            angular.forEach(["", "/branch/:branch"], function (path) {
                var startContext = '/workspaces/:namespace/projects/:projectId/wiki';
                $routeProvider.
                    when(UrlHelpers.join(startContext, path, 'view'), Wiki.route('viewPage.html', false)).
                    when(UrlHelpers.join(startContext, path, 'create/:page*'), Wiki.route('create.html', false)).
                    when(startContext + path + '/view/:page*', { templateUrl: 'plugins/wiki/html/viewPage.html', reloadOnSearch: false }).
                    when(startContext + path + '/book/:page*', { templateUrl: 'plugins/wiki/html/viewBook.html', reloadOnSearch: false }).
                    when(startContext + path + '/edit/:page*', { templateUrl: 'plugins/wiki/html/editPage.html' }).
                    when(startContext + path + '/version/:page*\/:objectId', { templateUrl: 'plugins/wiki/html/viewPage.html' }).
                    when(startContext + path + '/history/:page*', { templateUrl: 'plugins/wiki/html/history.html' }).
                    when(startContext + path + '/commit/:page*\/:objectId', { templateUrl: 'plugins/wiki/html/commit.html' }).
                    when(startContext + path + '/commitDetail/:page*\/:objectId', { templateUrl: 'plugins/wiki/html/commitDetail.html' }).
                    when(startContext + path + '/diff/:diffObjectId1/:diffObjectId2/:page*', { templateUrl: 'plugins/wiki/html/viewPage.html', reloadOnSearch: false }).
                    when(startContext + path + '/formTable/:page*', { templateUrl: 'plugins/wiki/html/formTable.html' }).
                    when(startContext + path + '/dozer/mappings/:page*', { templateUrl: 'plugins/wiki/html/dozerMappings.html' }).
                    when(startContext + path + '/configurations/:page*', { templateUrl: 'plugins/wiki/html/configurations.html' }).
                    when(startContext + path + '/configuration/:pid/:page*', { templateUrl: 'plugins/wiki/html/configuration.html' }).
                    when(startContext + path + '/newConfiguration/:factoryPid/:page*', { templateUrl: 'plugins/wiki/html/configuration.html' }).
                    when(startContext + path + '/camel/diagram/:page*', { templateUrl: 'plugins/wiki/html/camelDiagram.html' }).
                    when(startContext + path + '/camel/canvas/:page*', { templateUrl: 'plugins/wiki/html/camelCanvas.html' }).
                    when(startContext + path + '/camel/properties/:page*', { templateUrl: 'plugins/wiki/html/camelProperties.html' });
            });
        }]);
    Wiki._module.factory('wikiBranchMenu', function () {
        var self = {
            items: [],
            addExtension: function (item) {
                self.items.push(item);
            },
            applyMenuExtensions: function (menu) {
                if (self.items.length === 0) {
                    return;
                }
                var extendedMenu = [{
                        heading: "Actions"
                    }];
                self.items.forEach(function (item) {
                    if (item.valid()) {
                        extendedMenu.push(item);
                    }
                });
                if (extendedMenu.length > 1) {
                    menu.add(extendedMenu);
                }
            }
        };
        return self;
    });
    Wiki._module.factory('WikiGitUrlPrefix', function () {
        return "";
    });
    Wiki._module.factory('fileExtensionTypeRegistry', function () {
        return {
            "image": ["svg", "png", "ico", "bmp", "jpg", "gif"],
            "markdown": ["md", "markdown", "mdown", "mkdn", "mkd"],
            "htmlmixed": ["html", "xhtml", "htm"],
            "text/x-java": ["java"],
            "text/x-groovy": ["groovy"],
            "text/x-scala": ["scala"],
            "javascript": ["js", "json", "javascript", "jscript", "ecmascript", "form"],
            "xml": ["xml", "xsd", "wsdl", "atom"],
            "text/x-yaml": ["yaml", "yml"],
            "properties": ["properties"]
        };
    });
    Wiki._module.filter('fileIconClass', function () { return Wiki.iconClass; });
    Wiki._module.run(["$location", "viewRegistry", "localStorage", "layoutFull", "helpRegistry", "preferencesRegistry", "wikiRepository",
        "$rootScope", function ($location, viewRegistry, localStorage, layoutFull, helpRegistry, preferencesRegistry, wikiRepository, $rootScope) {
            viewRegistry['wiki'] = Wiki.templatePath + 'layoutWiki.html';
            Wiki.documentTemplates.forEach(function (template) {
                if (!template['regex']) {
                    template.regex = /(?:)/;
                }
            });
        }]);
    hawtioPluginLoader.addModule(Wiki.pluginName);
})(Wiki || (Wiki = {}));

/// <reference path="./wikiPlugin.ts"/>
var Wiki;
(function (Wiki) {
    Wiki.CamelController = Wiki._module.controller("Wiki.CamelController", ["$scope", "$rootScope", "$location", "$routeParams", "$compile", "$templateCache", "localStorage", function ($scope, $rootScope, $location, $routeParams, $compile, $templateCache, localStorage) {
            var jolokia = null;
            var jolokiaStatus = null;
            var jmxTreeLazyLoadRegistry = null;
            var userDetails = null;
            var HawtioNav = null;
            var workspace = new Workspace(jolokia, jolokiaStatus, jmxTreeLazyLoadRegistry, $location, $compile, $templateCache, localStorage, $rootScope, userDetails, HawtioNav);
            Wiki.initScope($scope, $routeParams, $location);
            Camel.initEndpointChooserScope($scope, $location, localStorage, workspace, jolokia);
            var wikiRepository = $scope.wikiRepository;
            $scope.schema = Camel.getConfiguredCamelModel();
            $scope.modified = false;
            $scope.switchToCanvasView = new UI.Dialog();
            $scope.findProfileCamelContext = true;
            $scope.camelSelectionDetails = {
                selectedCamelContextId: null,
                selectedRouteId: null
            };
            $scope.isValid = function (nav) {
                return nav && nav.isValid(workspace);
            };
            $scope.camelSubLevelTabs = [
                {
                    content: '<i class="fa fa-picture-o"></i> Canvas',
                    title: "Edit the diagram in a draggy droppy way",
                    isValid: function (workspace) { return true; },
                    href: function () { return Wiki.startLink($scope) + "/camel/canvas/" + $scope.pageId; }
                },
                {
                    content: '<i class="fa fa-tree"></i> Tree',
                    title: "View the routes as a tree",
                    isValid: function (workspace) { return true; },
                    href: function () { return Wiki.startLink($scope) + "/camel/properties/" + $scope.pageId; }
                }
            ];
            var routeModel = _apacheCamelModel.definitions.route;
            routeModel["_id"] = "route";
            $scope.addDialog = new UI.Dialog();
            $scope.addDialog.options["dialogClass"] = "modal-large";
            $scope.addDialog.options["cssClass"] = "modal-large";
            $scope.paletteItemSearch = "";
            $scope.paletteTree = new Folder("Palette");
            $scope.paletteActivations = ["Routing_aggregate"];
            angular.forEach(_apacheCamelModel.definitions, function (value, key) {
                if (value.group) {
                    var group = (key === "route") ? $scope.paletteTree : $scope.paletteTree.getOrElse(value.group);
                    if (!group.key) {
                        group.key = value.group;
                    }
                    value["_id"] = key;
                    var title = value["title"] || key;
                    var node = new Folder(title);
                    node.key = group.key + "_" + key;
                    node["nodeModel"] = value;
                    var imageUrl = Camel.getRouteNodeIcon(value);
                    node.icon = imageUrl;
                    var tooltip = value["tooltip"] || value["description"] || '';
                    node.tooltip = tooltip;
                    group.children.push(node);
                }
            });
            $scope.componentTree = new Folder("Endpoints");
            $scope.$watch("componentNames", function () {
                var componentNames = $scope.componentNames;
                if (componentNames && componentNames.length) {
                    $scope.componentTree = new Folder("Endpoints");
                    angular.forEach($scope.componentNames, function (endpointName) {
                        var category = Camel.getEndpointCategory(endpointName);
                        var groupName = category.label || "Core";
                        var groupKey = category.id || groupName;
                        var group = $scope.componentTree.getOrElse(groupName);
                        var value = Camel.getEndpointConfig(endpointName, category);
                        var key = endpointName;
                        var label = value["label"] || endpointName;
                        var node = new Folder(label);
                        node.key = groupKey + "_" + key;
                        node.key = key;
                        node["nodeModel"] = value;
                        var tooltip = value["tooltip"] || value["description"] || label;
                        var imageUrl = Core.url(value["icon"] || Camel.endpointIcon);
                        node.icon = imageUrl;
                        node.tooltip = tooltip;
                        group.children.push(node);
                    });
                }
            });
            $scope.componentActivations = ["bean"];
            $scope.$watch('addDialog.show', function () {
                if ($scope.addDialog.show) {
                    setTimeout(function () {
                        $('#submit').focus();
                    }, 50);
                }
            });
            $scope.$on("hawtio.form.modelChange", onModelChangeEvent);
            $scope.onRootTreeNode = function (rootTreeNode) {
                $scope.rootTreeNode = rootTreeNode;
                rootTreeNode.data = $scope.camelContextTree;
            };
            $scope.addNode = function () {
                if ($scope.nodeXmlNode) {
                    $scope.addDialog.open();
                }
                else {
                    addNewNode(routeModel);
                }
            };
            $scope.onPaletteSelect = function (node) {
                $scope.selectedPaletteNode = (node && node["nodeModel"]) ? node : null;
                if ($scope.selectedPaletteNode) {
                    $scope.selectedComponentNode = null;
                }
                Wiki.log.debug("Selected " + $scope.selectedPaletteNode + " : " + $scope.selectedComponentNode);
            };
            $scope.onComponentSelect = function (node) {
                $scope.selectedComponentNode = (node && node["nodeModel"]) ? node : null;
                if ($scope.selectedComponentNode) {
                    $scope.selectedPaletteNode = null;
                    var nodeName = node.key;
                    Wiki.log.debug("loading endpoint schema for node " + nodeName);
                    $scope.loadEndpointSchema(nodeName);
                    $scope.selectedComponentName = nodeName;
                }
                Wiki.log.debug("Selected " + $scope.selectedPaletteNode + " : " + $scope.selectedComponentNode);
            };
            $scope.selectedNodeModel = function () {
                var nodeModel = null;
                if ($scope.selectedPaletteNode) {
                    nodeModel = $scope.selectedPaletteNode["nodeModel"];
                    $scope.endpointConfig = null;
                }
                else if ($scope.selectedComponentNode) {
                    var endpointConfig = $scope.selectedComponentNode["nodeModel"];
                    var endpointSchema = $scope.endpointSchema;
                    nodeModel = $scope.schema.definitions.endpoint;
                    $scope.endpointConfig = {
                        key: $scope.selectedComponentNode.key,
                        schema: endpointSchema,
                        details: endpointConfig
                    };
                }
                return nodeModel;
            };
            $scope.addAndCloseDialog = function () {
                var nodeModel = $scope.selectedNodeModel();
                if (nodeModel) {
                    addNewNode(nodeModel);
                }
                else {
                    Wiki.log.debug("WARNING: no nodeModel!");
                }
                $scope.addDialog.close();
            };
            $scope.removeNode = function () {
                if ($scope.selectedFolder && $scope.treeNode) {
                    $scope.selectedFolder.detach();
                    $scope.treeNode.remove();
                    $scope.selectedFolder = null;
                    $scope.treeNode = null;
                }
            };
            $scope.canDelete = function () {
                return $scope.selectedFolder ? true : false;
            };
            $scope.isActive = function (nav) {
                if (angular.isString(nav))
                    return workspace.isLinkActive(nav);
                var fn = nav.isActive;
                if (fn) {
                    return fn(workspace);
                }
                return workspace.isLinkActive(nav.href());
            };
            $scope.save = function () {
                if ($scope.modified && $scope.rootTreeNode) {
                    var xmlNode = Camel.generateXmlFromFolder($scope.rootTreeNode);
                    if (xmlNode) {
                        var text = Core.xmlNodeToString(xmlNode);
                        if (text) {
                            var commitMessage = $scope.commitMessage || "Updated page " + $scope.pageId;
                            wikiRepository.putPage($scope.branch, $scope.pageId, text, commitMessage, function (status) {
                                Wiki.onComplete(status);
                                Core.notification("success", "Saved " + $scope.pageId);
                                $scope.modified = false;
                                goToView();
                                Core.$apply($scope);
                            });
                        }
                    }
                }
            };
            $scope.cancel = function () {
                Wiki.log.debug("cancelling...");
            };
            $scope.$watch('workspace.tree', function () {
                if (!$scope.git) {
                    setTimeout(updateView, 50);
                }
            });
            $scope.$on("$routeChangeSuccess", function (event, current, previous) {
                setTimeout(updateView, 50);
            });
            function getFolderXmlNode(treeNode) {
                var routeXmlNode = Camel.createFolderXmlTree(treeNode, null);
                if (routeXmlNode) {
                    $scope.nodeXmlNode = routeXmlNode;
                }
                return routeXmlNode;
            }
            $scope.onNodeSelect = function (folder, treeNode) {
                $scope.selectedFolder = folder;
                $scope.treeNode = treeNode;
                $scope.propertiesTemplate = null;
                $scope.diagramTemplate = null;
                $scope.nodeXmlNode = null;
                if (folder) {
                    $scope.nodeData = Camel.getRouteFolderJSON(folder);
                    $scope.nodeDataChangedFields = {};
                }
                var nodeName = Camel.getFolderCamelNodeId(folder);
                var routeXmlNode = getFolderXmlNode(treeNode);
                if (nodeName) {
                    $scope.nodeModel = Camel.getCamelSchema(nodeName);
                    if ($scope.nodeModel) {
                        $scope.propertiesTemplate = "plugins/wiki/html/camelPropertiesEdit.html";
                    }
                    $scope.diagramTemplate = "app/camel/html/routes.html";
                    Core.$apply($scope);
                }
            };
            $scope.onNodeDragEnter = function (node, sourceNode) {
                var nodeFolder = node.data;
                var sourceFolder = sourceNode.data;
                if (nodeFolder && sourceFolder) {
                    var nodeId = Camel.getFolderCamelNodeId(nodeFolder);
                    var sourceId = Camel.getFolderCamelNodeId(sourceFolder);
                    if (nodeId && sourceId) {
                        if (sourceId === "route") {
                            return nodeId === "route";
                        }
                        return true;
                    }
                }
                return false;
            };
            $scope.onNodeDrop = function (node, sourceNode, hitMode, ui, draggable) {
                var nodeFolder = node.data;
                var sourceFolder = sourceNode.data;
                if (nodeFolder && sourceFolder) {
                    var nodeId = Camel.getFolderCamelNodeId(nodeFolder);
                    var sourceId = Camel.getFolderCamelNodeId(sourceFolder);
                    if (nodeId === "route") {
                        if (sourceId === "route") {
                            if (hitMode === "over") {
                                hitMode = "after";
                            }
                        }
                        else {
                            hitMode = "over";
                        }
                    }
                    else {
                        if (Camel.acceptOutput(nodeId)) {
                            hitMode = "over";
                        }
                        else {
                            if (hitMode !== "before") {
                                hitMode = "after";
                            }
                        }
                    }
                    Wiki.log.debug("nodeDrop nodeId: " + nodeId + " sourceId: " + sourceId + " hitMode: " + hitMode);
                    sourceNode.move(node, hitMode);
                }
            };
            updateView();
            function addNewNode(nodeModel) {
                var doc = $scope.doc || document;
                var parentFolder = $scope.selectedFolder || $scope.camelContextTree;
                var key = nodeModel["_id"];
                var beforeNode = null;
                if (!key) {
                    Wiki.log.debug("WARNING: no id for model " + JSON.stringify(nodeModel));
                }
                else {
                    var treeNode = $scope.treeNode;
                    if (key === "route") {
                        treeNode = $scope.rootTreeNode;
                    }
                    else {
                        if (!treeNode) {
                            var root = $scope.rootTreeNode;
                            var children = root.getChildren();
                            if (!children || !children.length) {
                                addNewNode(Camel.getCamelSchema("route"));
                                children = root.getChildren();
                            }
                            if (children && children.length) {
                                treeNode = children[children.length - 1];
                            }
                            else {
                                Wiki.log.debug("Could not add a new route to the empty tree!");
                                return;
                            }
                        }
                        var parentId = Camel.getFolderCamelNodeId(treeNode.data);
                        if (!Camel.acceptOutput(parentId)) {
                            beforeNode = treeNode.getNextSibling();
                            treeNode = treeNode.getParent() || treeNode;
                        }
                    }
                    if (treeNode) {
                        var node = doc.createElement(key);
                        parentFolder = treeNode.data;
                        var addedNode = Camel.addRouteChild(parentFolder, node);
                        if (addedNode) {
                            var added = treeNode.addChild(addedNode, beforeNode);
                            if (added) {
                                getFolderXmlNode(added);
                                added.expand(true);
                                added.select(true);
                                added.activate(true);
                            }
                        }
                    }
                }
            }
            function onModelChangeEvent(event, name) {
                if ($scope.nodeData) {
                    var fieldMap = $scope.nodeDataChangedFields;
                    if (fieldMap) {
                        if (fieldMap[name]) {
                            onNodeDataChanged();
                        }
                        else {
                            fieldMap[name] = true;
                        }
                    }
                }
            }
            function onNodeDataChanged() {
                $scope.modified = true;
                var selectedFolder = $scope.selectedFolder;
                if ($scope.treeNode && selectedFolder) {
                    var routeXmlNode = getFolderXmlNode($scope.treeNode);
                    if (routeXmlNode) {
                        var nodeName = routeXmlNode.localName;
                        var nodeSettings = Camel.getCamelSchema(nodeName);
                        if (nodeSettings) {
                            Camel.updateRouteNodeLabelAndTooltip(selectedFolder, routeXmlNode, nodeSettings);
                            $scope.treeNode.render(false, false);
                        }
                    }
                    selectedFolder["camelNodeData"] = $scope.nodeData;
                }
            }
            function onResults(response) {
                var text = response.text;
                if (text) {
                    var tree = Camel.loadCamelTree(text, $scope.pageId);
                    if (tree) {
                        $scope.camelContextTree = tree;
                    }
                }
                else {
                    Wiki.log.debug("No XML found for page " + $scope.pageId);
                }
                Core.$applyLater($scope);
            }
            function updateView() {
                $scope.loadEndpointNames();
                $scope.pageId = Wiki.pageId($routeParams, $location);
                Wiki.log.debug("Has page id: " + $scope.pageId + " with $routeParams " + JSON.stringify($routeParams));
                wikiRepository.getPage($scope.branch, $scope.pageId, $scope.objectId, onResults);
            }
            function goToView() {
            }
            $scope.doSwitchToCanvasView = function () {
                var link = $location.url().replace(/\/properties\//, '/canvas/');
                Wiki.log.debug("Link: ", link);
                $location.url(link);
            };
            $scope.confirmSwitchToCanvasView = function () {
                if ($scope.modified) {
                    $scope.switchToCanvasView.open();
                }
                else {
                    $scope.doSwitchToCanvasView();
                }
            };
        }]);
})(Wiki || (Wiki = {}));

/// <reference path="./wikiPlugin.ts"/>
var Wiki;
(function (Wiki) {
    Wiki.CamelCanvasController = Wiki._module.controller("Wiki.CamelCanvasController", ["$scope", "$element", "$routeParams", "$templateCache", "$interpolate", "$location", function ($scope, $element, $routeParams, $templateCache, $interpolate, $location) {
            var jsPlumbInstance = jsPlumb.getInstance();
            Wiki.initScope($scope, $routeParams, $location);
            var wikiRepository = $scope.wikiRepository;
            $scope.addDialog = new UI.Dialog();
            $scope.propertiesDialog = new UI.Dialog();
            $scope.switchToTreeView = new UI.Dialog();
            $scope.modified = false;
            $scope.camelIgnoreIdForLabel = Camel.ignoreIdForLabel(localStorage);
            $scope.camelMaximumLabelWidth = Camel.maximumLabelWidth(localStorage);
            $scope.camelMaximumTraceOrDebugBodyLength = Camel.maximumTraceOrDebugBodyLength(localStorage);
            $scope.forms = {};
            $scope.nodeTemplate = $interpolate($templateCache.get("nodeTemplate"));
            $scope.$watch("camelContextTree", function () {
                var tree = $scope.camelContextTree;
                $scope.rootFolder = tree;
                $scope.folders = Camel.addFoldersToIndex($scope.rootFolder);
                var doc = Core.pathGet(tree, ["xmlDocument"]);
                if (doc) {
                    $scope.doc = doc;
                    reloadRouteIds();
                    onRouteSelectionChanged();
                }
            });
            $scope.addAndCloseDialog = function () {
                var nodeModel = $scope.selectedNodeModel();
                if (nodeModel) {
                    addNewNode(nodeModel);
                }
                $scope.addDialog.close();
            };
            $scope.removeNode = function () {
                var folder = getSelectedOrRouteFolder();
                if (folder) {
                    var nodeName = Camel.getFolderCamelNodeId(folder);
                    folder.detach();
                    if ("route" === nodeName) {
                        $scope.selectedRouteId = null;
                    }
                    updateSelection(null);
                    treeModified();
                }
            };
            $scope.doLayout = function () {
                $scope.drawnRouteId = null;
                onRouteSelectionChanged();
            };
            function isRouteOrNode() {
                return !$scope.selectedFolder;
            }
            $scope.getDeleteTitle = function () {
                if (isRouteOrNode()) {
                    return "Delete this route";
                }
                return "Delete this node";
            };
            $scope.getDeleteTarget = function () {
                if (isRouteOrNode()) {
                    return "Route";
                }
                return "Node";
            };
            $scope.isFormDirty = function () {
                Wiki.log.debug("endpointForm: ", $scope.endpointForm);
                if ($scope.endpointForm.$dirty) {
                    return true;
                }
                if (!$scope.forms['formEditor']) {
                    return false;
                }
                else {
                    return $scope.forms['formEditor']['$dirty'];
                }
            };
            function createEndpointURI(endpointScheme, slashesText, endpointPath, endpointParameters) {
                Wiki.log.debug("scheme " + endpointScheme + " path " + endpointPath + " parameters " + endpointParameters);
                var uri = ((endpointScheme) ? endpointScheme + ":" + slashesText : "") + (endpointPath ? endpointPath : "");
                var paramText = Core.hashToString(endpointParameters);
                if (paramText) {
                    uri += "?" + paramText;
                }
                return uri;
            }
            $scope.updateProperties = function () {
                Wiki.log.info("old URI is " + $scope.nodeData.uri);
                var uri = createEndpointURI($scope.endpointScheme, ($scope.endpointPathHasSlashes ? "//" : ""), $scope.endpointPath, $scope.endpointParameters);
                Wiki.log.info("new URI is " + uri);
                if (uri) {
                    $scope.nodeData.uri = uri;
                }
                var key = null;
                var selectedFolder = $scope.selectedFolder;
                if (selectedFolder) {
                    key = selectedFolder.key;
                    var elements = $element.find(".canvas").find("[id='" + key + "']").first().remove();
                }
                treeModified();
                if (key) {
                    updateSelection(key);
                }
                if ($scope.isFormDirty()) {
                    $scope.endpointForm.$setPristine();
                    if ($scope.forms['formEditor']) {
                        $scope.forms['formEditor'].$setPristine();
                    }
                }
                Core.$apply($scope);
            };
            $scope.save = function () {
                if ($scope.modified && $scope.rootFolder) {
                    var xmlNode = Camel.generateXmlFromFolder($scope.rootFolder);
                    if (xmlNode) {
                        var text = Core.xmlNodeToString(xmlNode);
                        if (text) {
                            var decoded = decodeURIComponent(text);
                            Wiki.log.debug("Saving xml decoded: " + decoded);
                            var commitMessage = $scope.commitMessage || "Updated page " + $scope.pageId;
                            wikiRepository.putPage($scope.branch, $scope.pageId, decoded, commitMessage, function (status) {
                                Wiki.onComplete(status);
                                Core.notification("success", "Saved " + $scope.pageId);
                                $scope.modified = false;
                                goToView();
                                Core.$apply($scope);
                            });
                        }
                    }
                }
            };
            $scope.cancel = function () {
                Wiki.log.debug("cancelling...");
            };
            $scope.$watch("selectedRouteId", onRouteSelectionChanged);
            function goToView() {
            }
            function addNewNode(nodeModel) {
                var doc = $scope.doc || document;
                var parentFolder = $scope.selectedFolder || $scope.rootFolder;
                var key = nodeModel["_id"];
                if (!key) {
                    Wiki.log.debug("WARNING: no id for model " + JSON.stringify(nodeModel));
                }
                else {
                    var treeNode = $scope.selectedFolder;
                    if (key === "route") {
                        treeNode = $scope.rootFolder;
                    }
                    else {
                        if (!treeNode) {
                            var root = $scope.rootFolder;
                            var children = root.children;
                            if (!children || !children.length) {
                                addNewNode(Camel.getCamelSchema("route"));
                                children = root.children;
                            }
                            if (children && children.length) {
                                treeNode = getRouteFolder($scope.rootFolder, $scope.selectedRouteId) || children[children.length - 1];
                            }
                            else {
                                Wiki.log.debug("Could not add a new route to the empty tree!");
                                return;
                            }
                        }
                        var parentTypeName = Camel.getFolderCamelNodeId(treeNode);
                        if (!Camel.acceptOutput(parentTypeName)) {
                            treeNode = treeNode.parent || treeNode;
                        }
                    }
                    if (treeNode) {
                        var node = doc.createElement(key);
                        parentFolder = treeNode;
                        var addedNode = Camel.addRouteChild(parentFolder, node);
                        var nodeData = {};
                        if (key === "endpoint" && $scope.endpointConfig) {
                            var key = $scope.endpointConfig.key;
                            if (key) {
                                nodeData["uri"] = key + ":";
                            }
                        }
                        addedNode["camelNodeData"] = nodeData;
                        addedNode["endpointConfig"] = $scope.endpointConfig;
                        if (key === "route") {
                            var count = $scope.routeIds.length;
                            var nodeId = null;
                            while (true) {
                                nodeId = "route" + (++count);
                                if (!$scope.routeIds.find(nodeId)) {
                                    break;
                                }
                            }
                            addedNode["routeXmlNode"].setAttribute("id", nodeId);
                            $scope.selectedRouteId = nodeId;
                        }
                    }
                }
                treeModified();
            }
            function treeModified(reposition) {
                if (reposition === void 0) { reposition = true; }
                var newDoc = Camel.generateXmlFromFolder($scope.rootFolder);
                var tree = Camel.loadCamelTree(newDoc, $scope.pageId);
                if (tree) {
                    $scope.rootFolder = tree;
                    $scope.doc = Core.pathGet(tree, ["xmlDocument"]);
                }
                $scope.modified = true;
                reloadRouteIds();
                $scope.doLayout();
                Core.$apply($scope);
            }
            function reloadRouteIds() {
                $scope.routeIds = [];
                var doc = $($scope.doc);
                $scope.camelSelectionDetails.selectedCamelContextId = doc.find("camelContext").attr("id");
                doc.find("route").each(function (idx, route) {
                    var id = route.getAttribute("id");
                    if (id) {
                        $scope.routeIds.push(id);
                    }
                });
            }
            function onRouteSelectionChanged() {
                if ($scope.doc) {
                    if (!$scope.selectedRouteId && $scope.routeIds && $scope.routeIds.length) {
                        $scope.selectedRouteId = $scope.routeIds[0];
                    }
                    if ($scope.selectedRouteId && $scope.selectedRouteId !== $scope.drawnRouteId) {
                        var nodes = [];
                        var links = [];
                        Camel.loadRouteXmlNodes($scope, $scope.doc, $scope.selectedRouteId, nodes, links, getWidth());
                        updateSelection($scope.selectedRouteId);
                        $scope.folders = Camel.addFoldersToIndex($scope.rootFolder);
                        showGraph(nodes, links);
                        $scope.drawnRouteId = $scope.selectedRouteId;
                    }
                    $scope.camelSelectionDetails.selectedRouteId = $scope.selectedRouteId;
                }
            }
            function showGraph(nodes, links) {
                layoutGraph(nodes, links);
            }
            function getNodeId(node) {
                if (angular.isNumber(node)) {
                    var idx = node;
                    node = $scope.nodeStates[idx];
                    if (!node) {
                        Wiki.log.debug("Cant find node at " + idx);
                        return "node-" + idx;
                    }
                }
                return node.cid || "node-" + node.id;
            }
            function getSelectedOrRouteFolder() {
                return $scope.selectedFolder || getRouteFolder($scope.rootFolder, $scope.selectedRouteId);
            }
            function getContainerElement() {
                var rootElement = $element;
                var containerElement = rootElement.find(".canvas");
                if (!containerElement || !containerElement.length)
                    containerElement = rootElement;
                return containerElement;
            }
            var endpointStyle = ["Dot", { radius: 4, cssClass: 'camel-canvas-endpoint' }];
            var hoverPaintStyle = { strokeStyle: "red", lineWidth: 3 };
            var labelStyles = ["Label"];
            var arrowStyles = ["Arrow", {
                    location: 1,
                    id: "arrow",
                    length: 8,
                    width: 8,
                    foldback: 0.8
                }];
            var connectorStyle = ["StateMachine", { curviness: 10, proximityLimit: 50 }];
            jsPlumbInstance.importDefaults({
                Endpoint: endpointStyle,
                HoverPaintStyle: hoverPaintStyle,
                ConnectionOverlays: [
                    arrowStyles,
                    labelStyles
                ]
            });
            $scope.$on('$destroy', function () {
                jsPlumbInstance.reset();
                delete jsPlumbInstance;
            });
            jsPlumbInstance.bind("dblclick", function (connection, originalEvent) {
                if (jsPlumbInstance.isSuspendDrawing()) {
                    return;
                }
                alert("double click on connection from " + connection.sourceId + " to " + connection.targetId);
            });
            jsPlumbInstance.bind('connection', function (info, evt) {
                Wiki.log.debug("Creating connection from ", info.sourceId, " to ", info.targetId);
                var link = getLink(info);
                var source = $scope.nodes[link.source];
                var sourceFolder = $scope.folders[link.source];
                var targetFolder = $scope.folders[link.target];
                if (Camel.isNextSiblingAddedAsChild(source.type)) {
                    sourceFolder.moveChild(targetFolder);
                }
                else {
                    sourceFolder.parent.insertAfter(targetFolder, sourceFolder);
                }
                treeModified();
            });
            jsPlumbInstance.bind("click", function (c) {
                if (jsPlumbInstance.isSuspendDrawing()) {
                    return;
                }
                jsPlumbInstance.detach(c);
            });
            function layoutGraph(nodes, links) {
                var transitions = [];
                var states = Core.createGraphStates(nodes, links, transitions);
                Wiki.log.debug("links: ", links);
                Wiki.log.debug("transitions: ", transitions);
                $scope.nodeStates = states;
                var containerElement = getContainerElement();
                jsPlumbInstance.doWhileSuspended(function () {
                    containerElement.css({
                        'width': '800px',
                        'height': '800px',
                        'min-height': '800px',
                        'min-width': '800px'
                    });
                    var containerHeight = 0;
                    var containerWidth = 0;
                    containerElement.find('div.component').each(function (i, el) {
                        Wiki.log.debug("Checking: ", el, " ", i);
                        if (!states.any(function (node) {
                            return el.id === getNodeId(node);
                        })) {
                            Wiki.log.debug("Removing element: ", el.id);
                            jsPlumbInstance.remove(el);
                        }
                    });
                    angular.forEach(states, function (node) {
                        Wiki.log.debug("node: ", node);
                        var id = getNodeId(node);
                        var div = containerElement.find('#' + id);
                        if (!div[0]) {
                            div = $($scope.nodeTemplate({
                                id: id,
                                node: node
                            }));
                            div.appendTo(containerElement);
                        }
                        jsPlumbInstance.makeSource(div, {
                            filter: "img.nodeIcon",
                            anchor: "Continuous",
                            connector: connectorStyle,
                            connectorStyle: { strokeStyle: "#666", lineWidth: 3 },
                            maxConnections: -1
                        });
                        jsPlumbInstance.makeTarget(div, {
                            dropOptions: { hoverClass: "dragHover" },
                            anchor: "Continuous"
                        });
                        jsPlumbInstance.draggable(div, {
                            containment: '.camel-canvas'
                        });
                        div.click(function () {
                            var newFlag = !div.hasClass("selected");
                            containerElement.find('div.component').toggleClass("selected", false);
                            div.toggleClass("selected", newFlag);
                            var id = div.attr("id");
                            updateSelection(newFlag ? id : null);
                            Core.$apply($scope);
                        });
                        div.dblclick(function () {
                            var id = div.attr("id");
                            updateSelection(id);
                            Core.$apply($scope);
                        });
                        var height = div.height();
                        var width = div.width();
                        if (height || width) {
                            node.width = width;
                            node.height = height;
                            div.css({
                                'min-width': width,
                                'min-height': height
                            });
                        }
                    });
                    var edgeSep = 10;
                    dagre.layout()
                        .nodeSep(100)
                        .edgeSep(edgeSep)
                        .rankSep(75)
                        .nodes(states)
                        .edges(transitions)
                        .debugLevel(1)
                        .run();
                    angular.forEach(states, function (node) {
                        var id = getNodeId(node);
                        var div = $("#" + id);
                        var divHeight = div.height();
                        var divWidth = div.width();
                        var leftOffset = node.dagre.x + divWidth;
                        var bottomOffset = node.dagre.y + divHeight;
                        if (containerHeight < bottomOffset) {
                            containerHeight = bottomOffset + edgeSep * 2;
                        }
                        if (containerWidth < leftOffset) {
                            containerWidth = leftOffset + edgeSep * 2;
                        }
                        div.css({ top: node.dagre.y, left: node.dagre.x });
                    });
                    containerElement.css({
                        'width': containerWidth,
                        'height': containerHeight,
                        'min-height': containerHeight,
                        'min-width': containerWidth
                    });
                    containerElement.dblclick(function () {
                        $scope.propertiesDialog.open();
                    });
                    jsPlumbInstance.setSuspendEvents(true);
                    jsPlumbInstance.detachEveryConnection({ fireEvent: false });
                    angular.forEach(links, function (link) {
                        jsPlumbInstance.connect({
                            source: getNodeId(link.source),
                            target: getNodeId(link.target)
                        });
                    });
                    jsPlumbInstance.setSuspendEvents(false);
                });
                return states;
            }
            function getLink(info) {
                var sourceId = info.sourceId;
                var targetId = info.targetId;
                return {
                    source: sourceId,
                    target: targetId
                };
            }
            function getNodeByCID(nodes, cid) {
                return nodes.find(function (node) {
                    return node.cid === cid;
                });
            }
            function updateSelection(folderOrId) {
                var folder = null;
                if (angular.isString(folderOrId)) {
                    var id = folderOrId;
                    folder = (id && $scope.folders) ? $scope.folders[id] : null;
                }
                else {
                    folder = folderOrId;
                }
                $scope.selectedFolder = folder;
                folder = getSelectedOrRouteFolder();
                $scope.nodeXmlNode = null;
                $scope.propertiesTemplate = null;
                if (folder) {
                    var nodeName = Camel.getFolderCamelNodeId(folder);
                    $scope.nodeData = Camel.getRouteFolderJSON(folder);
                    $scope.nodeDataChangedFields = {};
                    $scope.nodeModel = Camel.getCamelSchema(nodeName);
                    if ($scope.nodeModel) {
                        $scope.propertiesTemplate = "plugins/wiki/html/camelPropertiesEdit.html";
                    }
                    $scope.selectedEndpoint = null;
                    if ("endpoint" === nodeName) {
                        var uri = $scope.nodeData["uri"];
                        if (uri) {
                            var idx = uri.indexOf(":");
                            if (idx > 0) {
                                var endpointScheme = uri.substring(0, idx);
                                var endpointPath = uri.substring(idx + 1);
                                $scope.endpointPathHasSlashes = endpointPath ? false : true;
                                if (endpointPath.startsWith("//")) {
                                    endpointPath = endpointPath.substring(2);
                                    $scope.endpointPathHasSlashes = true;
                                }
                                idx = endpointPath.indexOf("?");
                                var endpointParameters = {};
                                if (idx > 0) {
                                    var parameters = endpointPath.substring(idx + 1);
                                    endpointPath = endpointPath.substring(0, idx);
                                    endpointParameters = Core.stringToHash(parameters);
                                }
                                $scope.endpointScheme = endpointScheme;
                                $scope.endpointPath = endpointPath;
                                $scope.endpointParameters = endpointParameters;
                                Wiki.log.debug("endpoint " + endpointScheme + " path " + endpointPath + " and parameters " + JSON.stringify(endpointParameters));
                                $scope.loadEndpointSchema(endpointScheme);
                                $scope.selectedEndpoint = {
                                    endpointScheme: endpointScheme,
                                    endpointPath: endpointPath,
                                    parameters: endpointParameters
                                };
                            }
                        }
                    }
                }
            }
            function getWidth() {
                var canvasDiv = $($element);
                return canvasDiv.width();
            }
            function getFolderIdAttribute(route) {
                var id = null;
                if (route) {
                    var xmlNode = route["routeXmlNode"];
                    if (xmlNode) {
                        id = xmlNode.getAttribute("id");
                    }
                }
                return id;
            }
            function getRouteFolder(tree, routeId) {
                var answer = null;
                if (tree) {
                    angular.forEach(tree.children, function (route) {
                        if (!answer) {
                            var id = getFolderIdAttribute(route);
                            if (routeId === id) {
                                answer = route;
                            }
                        }
                    });
                }
                return answer;
            }
            $scope.doSwitchToTreeView = function () {
                $location.url(Core.trimLeading(($scope.startLink + "/camel/properties/" + $scope.pageId), '#'));
            };
            $scope.confirmSwitchToTreeView = function () {
                if ($scope.modified) {
                    $scope.switchToTreeView.open();
                }
                else {
                    $scope.doSwitchToTreeView();
                }
            };
        }]);
})(Wiki || (Wiki = {}));

/// <reference path="../../includes.ts"/>
/// <reference path="wikiHelpers.ts"/>
/// <reference path="wikiPlugin.ts"/>
var Wiki;
(function (Wiki) {
    Wiki._module.controller("Wiki.CommitController", ["$scope", "$location", "$routeParams", "$templateCache", "marked", "fileExtensionTypeRegistry", function ($scope, $location, $routeParams, $templateCache, marked, fileExtensionTypeRegistry) {
            var isFmc = false;
            var jolokia = null;
            Wiki.initScope($scope, $routeParams, $location);
            var wikiRepository = $scope.wikiRepository;
            $scope.commitId = $scope.objectId;
            $scope.dateFormat = 'EEE, MMM d, y : hh:mm:ss a';
            $scope.gridOptions = {
                data: 'commits',
                showFilter: false,
                multiSelect: false,
                selectWithCheckboxOnly: true,
                showSelectionCheckbox: true,
                displaySelectionCheckbox: true,
                selectedItems: [],
                filterOptions: {
                    filterText: ''
                },
                columnDefs: [
                    {
                        field: 'path',
                        displayName: 'File Name',
                        cellTemplate: $templateCache.get('fileCellTemplate.html'),
                        width: "***",
                        cellFilter: ""
                    },
                    {
                        field: '$diffLink',
                        displayName: 'Options',
                        cellTemplate: $templateCache.get('viewDiffTemplate.html')
                    }
                ]
            };
            $scope.$on("$routeChangeSuccess", function (event, current, previous) {
                setTimeout(updateView, 50);
            });
            $scope.$watch('workspace.tree', function () {
                if (!$scope.git) {
                    setTimeout(updateView, 50);
                }
            });
            $scope.canRevert = function () {
                return $scope.gridOptions.selectedItems.length === 1;
            };
            $scope.revert = function () {
                var selectedItems = $scope.gridOptions.selectedItems;
                if (selectedItems.length > 0) {
                    var path = commitPath(selectedItems[0]);
                    var objectId = $scope.commitId;
                    if (path && objectId) {
                        var commitMessage = "Reverting file " + $scope.pageId + " to previous version " + objectId;
                        wikiRepository.revertTo($scope.branch, objectId, $scope.pageId, commitMessage, function (result) {
                            Wiki.onComplete(result);
                            updateView();
                        });
                    }
                }
            };
            function commitPath(commit) {
                return commit.path || commit.name;
            }
            $scope.diff = function () {
                var selectedItems = $scope.gridOptions.selectedItems;
                if (selectedItems.length > 0) {
                    var commit = selectedItems[0];
                    var otherCommitId = $scope.commitId;
                    var link = UrlHelpers.join(Wiki.startLink($scope), "/diff/" + $scope.commitId + "/" + otherCommitId + "/" + commitPath(commit));
                    var path = Core.trimLeading(link, "#");
                    $location.path(path);
                }
            };
            updateView();
            function updateView() {
                var commitId = $scope.commitId;
                Wiki.loadBranches(jolokia, wikiRepository, $scope, isFmc);
                wikiRepository.commitInfo(commitId, function (commitInfo) {
                    $scope.commitInfo = commitInfo;
                    Core.$apply($scope);
                });
                wikiRepository.commitTree(commitId, function (commits) {
                    $scope.commits = commits;
                    angular.forEach(commits, function (commit) {
                        commit.fileIconHtml = Wiki.fileIconHtml(commit);
                        commit.fileClass = commit.name.endsWith(".profile") ? "green" : "";
                        var changeType = commit.changeType;
                        var path = commitPath(commit);
                        if (path) {
                            commit.fileLink = Wiki.startLink($scope) + '/version/' + path + '/' + commitId;
                        }
                        commit.$diffLink = Wiki.startLink($scope) + "/diff/" + commitId + "/" + commitId + "/" + (path || "");
                        if (changeType) {
                            changeType = changeType.toLowerCase();
                            if (changeType.startsWith("a")) {
                                commit.changeClass = "change-add";
                                commit.change = "add";
                                commit.title = "added";
                            }
                            else if (changeType.startsWith("d")) {
                                commit.changeClass = "change-delete";
                                commit.change = "delete";
                                commit.title = "deleted";
                                commit.fileLink = null;
                            }
                            else {
                                commit.changeClass = "change-modify";
                                commit.change = "modify";
                                commit.title = "modified";
                            }
                            commit.changeTypeHtml = '<span class="' + commit.changeClass + '">' + commit.title + '</span>';
                        }
                    });
                    Core.$apply($scope);
                });
            }
        }]);
})(Wiki || (Wiki = {}));

/// <reference path="../../includes.ts"/>
/// <reference path="wikiHelpers.ts"/>
/// <reference path="wikiPlugin.ts"/>
var Wiki;
(function (Wiki) {
    Wiki._module.controller("Wiki.CommitDetailController", ["$scope", "$location", "$routeParams", "$templateCache", "marked", "fileExtensionTypeRegistry", function ($scope, $location, $routeParams, $templateCache, marked, fileExtensionTypeRegistry) {
            var isFmc = false;
            var jolokia = null;
            Wiki.initScope($scope, $routeParams, $location);
            var wikiRepository = $scope.wikiRepository;
            $scope.commitId = $scope.objectId;
            var options = {
                readOnly: true,
                mode: {
                    name: 'diff'
                }
            };
            $scope.codeMirrorOptions = CodeEditor.createEditorSettings(options);
            $scope.$on("$routeChangeSuccess", function (event, current, previous) {
                setTimeout(updateView, 50);
            });
            $scope.$watch('workspace.tree', function () {
                if (!$scope.git) {
                    setTimeout(updateView, 50);
                }
            });
            $scope.canRevert = function () {
                return $scope.gridOptions.selectedItems.length === 1;
            };
            $scope.revert = function () {
                var selectedItems = $scope.gridOptions.selectedItems;
                if (selectedItems.length > 0) {
                    var path = commitPath(selectedItems[0]);
                    var objectId = $scope.commitId;
                    if (path && objectId) {
                        var commitMessage = "Reverting file " + $scope.pageId + " to previous version " + objectId;
                        wikiRepository.revertTo($scope.branch, objectId, $scope.pageId, commitMessage, function (result) {
                            Wiki.onComplete(result);
                            updateView();
                        });
                    }
                }
            };
            function commitPath(commit) {
                return commit.path || commit.name;
            }
            $scope.diff = function () {
                var selectedItems = $scope.gridOptions.selectedItems;
                if (selectedItems.length > 0) {
                    var commit = selectedItems[0];
                    var otherCommitId = $scope.commitId;
                    var link = UrlHelpers.join(Wiki.startLink($scope), "/diff/" + $scope.commitId + "/" + otherCommitId + "/" + commitPath(commit));
                    var path = Core.trimLeading(link, "#");
                    $location.path(path);
                }
            };
            updateView();
            function updateView() {
                var commitId = $scope.commitId;
                Wiki.loadBranches(jolokia, wikiRepository, $scope, isFmc);
                wikiRepository.commitDetail(commitId, function (commitDetail) {
                    if (commitDetail) {
                        $scope.commitDetail = commitDetail;
                        var commit = commitDetail.commit_info;
                        $scope.commit = commit;
                        if (commit) {
                            commit.$date = Developer.asDate(commit.date);
                        }
                        angular.forEach(commitDetail.diffs, function (diff) {
                            var path = diff.new_path;
                            if (path) {
                                diff.$viewLink = UrlHelpers.join(Wiki.startWikiLink($scope.projectId, commitId), "view", path);
                            }
                        });
                    }
                    Core.$apply($scope);
                });
            }
        }]);
})(Wiki || (Wiki = {}));

/// <reference path="../../includes.ts"/>
/// <reference path="wikiHelpers.ts"/>
/// <reference path="wikiPlugin.ts"/>
var Wiki;
(function (Wiki) {
    var CreateController = Wiki.controller("CreateController", ["$scope", "$location", "$routeParams", "$route", "$http", "$timeout", function ($scope, $location, $routeParams, $route, $http, $timeout) {
            Wiki.initScope($scope, $routeParams, $location);
            var wikiRepository = $scope.wikiRepository;
            var workspace = null;
            $scope.createDocumentTree = Wiki.createWizardTree(workspace, $scope);
            $scope.createDocumentTreeChildren = $scope.createDocumentTree.children;
            $scope.createDocumentTreeActivations = ["camel-spring.xml", "ReadMe.md"];
            $scope.treeOptions = {
                nodeChildren: "children",
                dirSelectable: true,
                injectClasses: {
                    ul: "a1",
                    li: "a2",
                    liSelected: "a7",
                    iExpanded: "a3",
                    iCollapsed: "a4",
                    iLeaf: "a5",
                    label: "a6",
                    labelSelected: "a8"
                }
            };
            $scope.fileExists = {
                exists: false,
                name: ""
            };
            $scope.newDocumentName = "";
            $scope.selectedCreateDocumentExtension = null;
            $scope.fileExists.exists = false;
            $scope.fileExists.name = "";
            $scope.newDocumentName = "";
            function returnToDirectory() {
                var link = Wiki.viewLink($scope, $scope.pageId, $location);
                Wiki.log.debug("Cancelling, going to link: ", link);
                Wiki.goToLink(link, $timeout, $location);
            }
            $scope.cancel = function () {
                returnToDirectory();
            };
            $scope.onCreateDocumentSelect = function (node) {
                $scope.fileExists.exists = false;
                $scope.fileExists.name = "";
                var entity = node ? node.entity : null;
                $scope.selectedCreateDocumentTemplate = entity;
                $scope.selectedCreateDocumentTemplateRegex = $scope.selectedCreateDocumentTemplate.regex || /.*/;
                $scope.selectedCreateDocumentTemplateInvalid = $scope.selectedCreateDocumentTemplate.invalid || "invalid name";
                $scope.selectedCreateDocumentTemplateExtension = $scope.selectedCreateDocumentTemplate.extension || null;
                Wiki.log.debug("Entity: ", entity);
                if (entity) {
                    if (entity.generated) {
                        $scope.formSchema = entity.generated.schema;
                        $scope.formData = entity.generated.form(workspace, $scope);
                    }
                    else {
                        $scope.formSchema = {};
                        $scope.formData = {};
                    }
                    Core.$apply($scope);
                }
            };
            $scope.addAndCloseDialog = function (fileName) {
                $scope.newDocumentName = fileName;
                var template = $scope.selectedCreateDocumentTemplate;
                var path = getNewDocumentPath();
                $scope.newDocumentName = null;
                $scope.fileExists.exists = false;
                $scope.fileExists.name = "";
                $scope.fileExtensionInvalid = null;
                if (!template || !path) {
                    return;
                }
                if ($scope.selectedCreateDocumentTemplateExtension) {
                    var idx = path.lastIndexOf('.');
                    if (idx > 0) {
                        var ext = path.substring(idx);
                        if ($scope.selectedCreateDocumentTemplateExtension !== ext) {
                            $scope.fileExtensionInvalid = "File extension must be: " + $scope.selectedCreateDocumentTemplateExtension;
                            Core.$apply($scope);
                            return;
                        }
                    }
                }
                wikiRepository.exists($scope.branch, path, function (exists) {
                    $scope.fileExists.exists = exists;
                    $scope.fileExists.name = exists ? path : false;
                    if (!exists) {
                        doCreate();
                    }
                    Core.$apply($scope);
                });
                function doCreate() {
                    var name = Wiki.fileName(path);
                    var folder = Wiki.fileParent(path);
                    var exemplar = template.exemplar;
                    var commitMessage = "Created " + template.label;
                    var exemplarUri = Core.url("/plugins/wiki/exemplar/" + exemplar);
                    if (template.folder) {
                        Core.notification("success", "Creating new folder " + name);
                        wikiRepository.createDirectory($scope.branch, path, commitMessage, function (status) {
                            var link = Wiki.viewLink($scope, path, $location);
                            Wiki.goToLink(link, $timeout, $location);
                        });
                    }
                    else if (template.profile) {
                        function toPath(profileName) {
                            var answer = "fabric/profiles/" + profileName;
                            answer = answer.replace(/-/g, "/");
                            answer = answer + ".profile";
                            return answer;
                        }
                        function toProfileName(path) {
                            var answer = path.replace(/^fabric\/profiles\//, "");
                            answer = answer.replace(/\//g, "-");
                            answer = answer.replace(/\.profile$/, "");
                            return answer;
                        }
                        folder = folder.replace(/\/=?(\w*)\.profile$/, "");
                        var concatenated = folder + "/" + name;
                        var profileName = toProfileName(concatenated);
                        var targetPath = toPath(profileName);
                    }
                    else if (template.generated) {
                        var options = {
                            workspace: workspace,
                            form: $scope.formData,
                            name: fileName,
                            parentId: folder,
                            branch: $scope.branch,
                            success: function (contents) {
                                if (contents) {
                                    wikiRepository.putPage($scope.branch, path, contents, commitMessage, function (status) {
                                        Wiki.log.debug("Created file " + name);
                                        Wiki.onComplete(status);
                                        returnToDirectory();
                                    });
                                }
                                else {
                                    returnToDirectory();
                                }
                            },
                            error: function (error) {
                                Core.notification('error', error);
                                Core.$apply($scope);
                            }
                        };
                        template.generated.generate(options);
                    }
                    else {
                        $http.get(exemplarUri)
                            .success(function (data, status, headers, config) {
                            putPage(path, name, folder, data, commitMessage);
                        })
                            .error(function (data, status, headers, config) {
                            putPage(path, name, folder, "", commitMessage);
                        });
                    }
                }
            };
            function putPage(path, name, folder, contents, commitMessage) {
                wikiRepository.putPage($scope.branch, path, contents, commitMessage, function (status) {
                    Wiki.log.debug("Created file " + name);
                    Wiki.onComplete(status);
                    $scope.git = wikiRepository.getPage($scope.branch, folder, $scope.objectId, function (details) {
                        var link = null;
                        if (details && details.children) {
                            Wiki.log.debug("scanned the directory " + details.children.length + " children");
                            var child = details.children.find(function (c) { return c.name === Wiki.fileName; });
                            if (child) {
                                link = $scope.childLink(child);
                            }
                            else {
                                Wiki.log.debug("Could not find name '" + Wiki.fileName + "' in the list of file names " + JSON.stringify(details.children.map(function (c) { return c.name; })));
                            }
                        }
                        if (!link) {
                            Wiki.log.debug("WARNING: could not find the childLink so reverting to the wiki edit page!");
                            link = Wiki.editLink($scope, path, $location);
                        }
                        Wiki.goToLink(link, $timeout, $location);
                    });
                });
            }
            function getNewDocumentPath() {
                var template = $scope.selectedCreateDocumentTemplate;
                if (!template) {
                    Wiki.log.debug("No template selected.");
                    return null;
                }
                var exemplar = template.exemplar || "";
                var name = $scope.newDocumentName || exemplar;
                if (name.indexOf('.') < 0) {
                    var idx = exemplar.lastIndexOf(".");
                    if (idx > 0) {
                        name += exemplar.substring(idx);
                    }
                }
                var folder = $scope.pageId;
                if ($scope.isFile) {
                    var idx = folder.lastIndexOf("/");
                    if (idx <= 0) {
                        folder = "";
                    }
                    else {
                        folder = folder.substring(0, idx);
                    }
                }
                var idx = name.lastIndexOf("/");
                if (idx > 0) {
                    folder += "/" + name.substring(0, idx);
                    name = name.substring(idx + 1);
                }
                folder = Core.trimLeading(folder, "/");
                return folder + (folder ? "/" : "") + name;
            }
        }]);
})(Wiki || (Wiki = {}));

/// <reference path="../../includes.ts"/>
/// <reference path="wikiHelpers.ts"/>
/// <reference path="wikiPlugin.ts"/>
var Wiki;
(function (Wiki) {
    Wiki._module.controller("Wiki.EditController", ["$scope", "$location", "$routeParams", "fileExtensionTypeRegistry", function ($scope, $location, $routeParams, fileExtensionTypeRegistry) {
            Wiki.initScope($scope, $routeParams, $location);
            $scope.breadcrumbConfig.push(Wiki.createEditingBreadcrumb($scope));
            var wikiRepository = $scope.wikiRepository;
            $scope.entity = {
                source: null
            };
            var format = Wiki.fileFormat($scope.pageId, fileExtensionTypeRegistry);
            var form = null;
            if ((format && format === "javascript") || isCreate()) {
                form = $location.search()["form"];
            }
            var options = {
                mode: {
                    name: format
                }
            };
            $scope.codeMirrorOptions = CodeEditor.createEditorSettings(options);
            $scope.modified = false;
            $scope.isValid = function () { return $scope.fileName; };
            $scope.canSave = function () { return !$scope.modified; };
            $scope.$watch('entity.source', function (newValue, oldValue) {
                $scope.modified = newValue && oldValue && newValue !== oldValue;
            }, true);
            Wiki.log.debug("path: ", $scope.path);
            $scope.$watch('modified', function (newValue, oldValue) {
                Wiki.log.debug("modified: ", newValue);
            });
            $scope.viewLink = function () { return Wiki.viewLink($scope, $scope.pageId, $location, $scope.fileName); };
            $scope.cancel = function () {
                goToView();
            };
            $scope.save = function () {
                if ($scope.modified && $scope.fileName) {
                    saveTo($scope["pageId"]);
                }
            };
            $scope.create = function () {
                var path = $scope.pageId + "/" + $scope.fileName;
                Wiki.log.debug("creating new file at " + path);
                saveTo(path);
            };
            $scope.onSubmit = function (json, form) {
                if (isCreate()) {
                    $scope.create();
                }
                else {
                    $scope.save();
                }
            };
            $scope.onCancel = function (form) {
                setTimeout(function () {
                    goToView();
                    Core.$apply($scope);
                }, 50);
            };
            updateView();
            function isCreate() {
                return $location.path().startsWith("/wiki/create");
            }
            function updateView() {
                if (isCreate()) {
                    updateSourceView();
                }
                else {
                    Wiki.log.debug("Getting page, branch: ", $scope.branch, " pageId: ", $scope.pageId, " objectId: ", $scope.objectId);
                    wikiRepository.getPage($scope.branch, $scope.pageId, $scope.objectId, onFileContents);
                }
            }
            function onFileContents(details) {
                var contents = details.text;
                $scope.entity.source = contents;
                $scope.fileName = $scope.pageId.split('/').last();
                Wiki.log.debug("file name: ", $scope.fileName);
                Wiki.log.debug("file details: ", details);
                updateSourceView();
                Core.$apply($scope);
            }
            function updateSourceView() {
                if (form) {
                    if (isCreate()) {
                        if (!$scope.fileName) {
                            $scope.fileName = "" + Core.getUUID() + ".json";
                        }
                    }
                    $scope.sourceView = null;
                    $scope.git = wikiRepository.getPage($scope.branch, form, $scope.objectId, function (details) {
                        onFormSchema(Wiki.parseJson(details.text));
                    });
                }
                else {
                    $scope.sourceView = "plugins/wiki/html/sourceEdit.html";
                }
            }
            function onFormSchema(json) {
                $scope.formDefinition = json;
                if ($scope.entity.source) {
                    $scope.formEntity = Wiki.parseJson($scope.entity.source);
                }
                $scope.sourceView = "plugins/wiki/html/formEdit.html";
                Core.$apply($scope);
            }
            function goToView() {
                var path = Core.trimLeading($scope.viewLink(), "#");
                Wiki.log.debug("going to view " + path);
                $location.path(Wiki.decodePath(path));
                Wiki.log.debug("location is now " + $location.path());
            }
            function saveTo(path) {
                var commitMessage = $scope.commitMessage || "Updated page " + $scope.pageId;
                var contents = $scope.entity.source;
                if ($scope.formEntity) {
                    contents = JSON.stringify($scope.formEntity, null, "  ");
                }
                Wiki.log.debug("Saving file, branch: ", $scope.branch, " path: ", $scope.path);
                wikiRepository.putPage($scope.branch, path, contents, commitMessage, function (status) {
                    Wiki.onComplete(status);
                    $scope.modified = false;
                    Core.notification("success", "Saved " + path);
                    goToView();
                    Core.$apply($scope);
                });
            }
        }]);
})(Wiki || (Wiki = {}));

/// <reference path="../../includes.ts"/>
/// <reference path="wikiHelpers.ts"/>
/// <reference path="wikiPlugin.ts"/>
var Wiki;
(function (Wiki) {
    Wiki.FileDropController = Wiki._module.controller("Wiki.FileDropController", ["$scope", "FileUploader", "$route", "$timeout", "userDetails", function ($scope, FileUploader, $route, $timeout, userDetails) {
            var uploadURI = Wiki.gitRestURL($scope, $scope.pageId) + '/';
            var uploader = $scope.uploader = new FileUploader({
                headers: {
                    'Authorization': Core.authHeaderValue(userDetails)
                },
                autoUpload: true,
                withCredentials: true,
                method: 'POST',
                url: uploadURI
            });
            $scope.doUpload = function () {
                uploader.uploadAll();
            };
            uploader.onWhenAddingFileFailed = function (item, filter, options) {
                Wiki.log.debug('onWhenAddingFileFailed', item, filter, options);
            };
            uploader.onAfterAddingFile = function (fileItem) {
                Wiki.log.debug('onAfterAddingFile', fileItem);
            };
            uploader.onAfterAddingAll = function (addedFileItems) {
                Wiki.log.debug('onAfterAddingAll', addedFileItems);
            };
            uploader.onBeforeUploadItem = function (item) {
                if ('file' in item) {
                    item.fileSizeMB = (item.file.size / 1024 / 1024).toFixed(2);
                }
                else {
                    item.fileSizeMB = 0;
                }
                item.url = uploadURI;
                Wiki.log.info("Loading files to " + uploadURI);
                Wiki.log.debug('onBeforeUploadItem', item);
            };
            uploader.onProgressItem = function (fileItem, progress) {
                Wiki.log.debug('onProgressItem', fileItem, progress);
            };
            uploader.onProgressAll = function (progress) {
                Wiki.log.debug('onProgressAll', progress);
            };
            uploader.onSuccessItem = function (fileItem, response, status, headers) {
                Wiki.log.debug('onSuccessItem', fileItem, response, status, headers);
            };
            uploader.onErrorItem = function (fileItem, response, status, headers) {
                Wiki.log.debug('onErrorItem', fileItem, response, status, headers);
            };
            uploader.onCancelItem = function (fileItem, response, status, headers) {
                Wiki.log.debug('onCancelItem', fileItem, response, status, headers);
            };
            uploader.onCompleteItem = function (fileItem, response, status, headers) {
                Wiki.log.debug('onCompleteItem', fileItem, response, status, headers);
            };
            uploader.onCompleteAll = function () {
                Wiki.log.debug('onCompleteAll');
                uploader.clearQueue();
                $timeout(function () {
                    Wiki.log.info("Completed all uploads. Lets force a reload");
                    $route.reload();
                    Core.$apply($scope);
                }, 200);
            };
        }]);
})(Wiki || (Wiki = {}));

/// <reference path="../../includes.ts"/>
/// <reference path="wikiHelpers.ts"/>
/// <reference path="wikiPlugin.ts"/>
var Wiki;
(function (Wiki) {
    Wiki._module.controller("Wiki.FormTableController", ["$scope", "$location", "$routeParams", function ($scope, $location, $routeParams) {
            Wiki.initScope($scope, $routeParams, $location);
            var wikiRepository = $scope.wikiRepository;
            $scope.columnDefs = [];
            $scope.gridOptions = {
                data: 'list',
                displayFooter: false,
                showFilter: false,
                filterOptions: {
                    filterText: ''
                },
                columnDefs: $scope.columnDefs
            };
            $scope.viewLink = function (row) {
                return childLink(row, "/view");
            };
            $scope.editLink = function (row) {
                return childLink(row, "/edit");
            };
            function childLink(child, prefix) {
                var start = Wiki.startLink($scope);
                var childId = (child) ? child["_id"] || "" : "";
                return Core.createHref($location, start + prefix + "/" + $scope.pageId + "/" + childId);
            }
            var linksColumn = {
                field: '_id',
                displayName: 'Actions',
                cellTemplate: '<div class="ngCellText""><a ng-href="{{viewLink(row.entity)}}" class="btn">View</a> <a ng-href="{{editLink(row.entity)}}" class="btn">Edit</a></div>'
            };
            $scope.$on("$routeChangeSuccess", function (event, current, previous) {
                setTimeout(updateView, 50);
            });
            var form = $location.search()["form"];
            if (form) {
                wikiRepository.getPage($scope.branch, form, $scope.objectId, onFormData);
            }
            updateView();
            function onResults(response) {
                var list = [];
                var map = Wiki.parseJson(response);
                angular.forEach(map, function (value, key) {
                    value["_id"] = key;
                    list.push(value);
                });
                $scope.list = list;
                Core.$apply($scope);
            }
            function updateView() {
                var filter = Core.pathGet($scope, ["gridOptions", "filterOptions", "filterText"]) || "";
                $scope.git = wikiRepository.jsonChildContents($scope.pageId, "*.json", filter, onResults);
            }
            function onFormData(details) {
                var text = details.text;
                if (text) {
                    $scope.formDefinition = Wiki.parseJson(text);
                    var columnDefs = [];
                    var schema = $scope.formDefinition;
                    angular.forEach(schema.properties, function (property, name) {
                        if (name) {
                            if (!Forms.isArrayOrNestedObject(property, schema)) {
                                var colDef = {
                                    field: name,
                                    displayName: property.description || name,
                                    visible: true
                                };
                                columnDefs.push(colDef);
                            }
                        }
                    });
                    columnDefs.push(linksColumn);
                    $scope.columnDefs = columnDefs;
                    $scope.gridOptions.columnDefs = columnDefs;
                    $scope.tableView = "plugins/wiki/html/formTableDatatable.html";
                }
            }
            Core.$apply($scope);
        }]);
})(Wiki || (Wiki = {}));

/// <reference path="../../includes.ts"/>
/// <reference path="wikiHelpers.ts"/>
/// <reference path="wikiPlugin.ts"/>
var Wiki;
(function (Wiki) {
    Wiki._module.controller("Wiki.GitPreferences", ["$scope", "localStorage", "userDetails", function ($scope, localStorage, userDetails) {
            var config = {
                properties: {
                    gitUserName: {
                        type: 'string',
                        label: 'Username',
                        description: 'The user name to be used when making changes to files with the source control system'
                    },
                    gitUserEmail: {
                        type: 'string',
                        label: 'Email',
                        description: 'The email address to use when making changes to files with the source control system'
                    }
                }
            };
            $scope.entity = $scope;
            $scope.config = config;
            Core.initPreferenceScope($scope, localStorage, {
                'gitUserName': {
                    'value': userDetails.username || ""
                },
                'gitUserEmail': {
                    'value': ''
                }
            });
        }]);
})(Wiki || (Wiki = {}));

/// <reference path="../../includes.ts"/>
/// <reference path="wikiHelpers.ts"/>
/// <reference path="wikiPlugin.ts"/>
var Wiki;
(function (Wiki) {
    Wiki._module.controller("Wiki.HistoryController", ["$scope", "$location", "$routeParams", "$templateCache", "marked", "fileExtensionTypeRegistry", function ($scope, $location, $routeParams, $templateCache, marked, fileExtensionTypeRegistry) {
            var isFmc = false;
            var jolokia = null;
            Wiki.initScope($scope, $routeParams, $location);
            var wikiRepository = $scope.wikiRepository;
            $scope.dateFormat = 'EEE, MMM d, y at HH:mm:ss Z';
            $scope.gridOptions = {
                data: 'logs',
                showFilter: false,
                enableRowClickSelection: false,
                multiSelect: true,
                selectedItems: [],
                showSelectionCheckbox: true,
                displaySelectionCheckbox: true,
                filterOptions: {
                    filterText: ''
                },
                columnDefs: [
                    {
                        field: '$date',
                        displayName: 'Modified',
                        defaultSort: true,
                        ascending: false,
                        cellTemplate: '<div class="ngCellText text-nowrap" title="{{row.entity.$date | date:\'EEE, MMM d, yyyy : HH:mm:ss Z\'}}">{{row.entity.$date.relative()}}</div>',
                        width: "**"
                    },
                    {
                        field: 'sha',
                        displayName: 'Change',
                        cellTemplate: '<div class="ngCellText text-nowrap"><a class="commit-link" ng-href="{{row.entity.commitLink}}{{hash}}" title="{{row.entity.sha}}">{{row.entity.sha | limitTo:7}} <i class="fa fa-arrow-circle-right"></i></a></div>',
                        cellFilter: "",
                        width: "*"
                    },
                    {
                        field: 'author',
                        displayName: 'Author',
                        cellFilter: "",
                        width: "**"
                    },
                    {
                        field: 'short_message',
                        displayName: 'Message',
                        cellTemplate: '<div class="ngCellText text-nowrap" title="{{row.entity.short_message}}">{{row.entity.short_message}}</div>',
                        width: "****"
                    }
                ]
            };
            $scope.$on("$routeChangeSuccess", function (event, current, previous) {
                setTimeout(updateView, 50);
            });
            $scope.canRevert = function () {
                var selectedItems = $scope.gridOptions.selectedItems;
                return selectedItems.length === 1 && selectedItems[0] !== $scope.logs[0];
            };
            $scope.revert = function () {
                var selectedItems = $scope.gridOptions.selectedItems;
                if (selectedItems.length > 0) {
                    var objectId = selectedItems[0].sha;
                    if (objectId) {
                        var commitMessage = "Reverting file " + $scope.pageId + " to previous version " + objectId;
                        wikiRepository.revertTo($scope.branch, objectId, $scope.pageId, commitMessage, function (result) {
                            Wiki.onComplete(result);
                            Core.notification('success', "Successfully reverted " + $scope.pageId);
                            updateView();
                        });
                    }
                    selectedItems.splice(0, selectedItems.length);
                }
            };
            $scope.diff = function () {
                var defaultValue = " ";
                var objectId = defaultValue;
                var selectedItems = $scope.gridOptions.selectedItems;
                if (selectedItems.length > 0) {
                    objectId = selectedItems[0].sha || defaultValue;
                }
                var baseObjectId = defaultValue;
                if (selectedItems.length > 1) {
                    baseObjectId = selectedItems[1].sha || defaultValue;
                    if (selectedItems[0].date < selectedItems[1].date) {
                        var _ = baseObjectId;
                        baseObjectId = objectId;
                        objectId = _;
                    }
                }
                var link = Wiki.startLink($scope) + "/diff/" + objectId + "/" + baseObjectId + "/" + $scope.pageId;
                var path = Core.trimLeading(link, "#");
                $location.path(path);
            };
            updateView();
            function updateView() {
                var objectId = "";
                var limit = 0;
                $scope.git = wikiRepository.history($scope.branch, objectId, $scope.pageId, limit, function (logArray) {
                    angular.forEach(logArray, function (log) {
                        var commitId = log.sha;
                        log.$date = Developer.asDate(log.date);
                        log.commitLink = Wiki.startLink($scope) + "/commitDetail/" + $scope.pageId + "/" + commitId;
                    });
                    $scope.logs = _.sortBy(logArray, "$date").reverse();
                    Core.$apply($scope);
                });
                Wiki.loadBranches(jolokia, wikiRepository, $scope, isFmc);
            }
        }]);
})(Wiki || (Wiki = {}));

/// <reference path="../../includes.ts"/>
/// <reference path="wikiHelpers.ts"/>
/// <reference path="wikiPlugin.ts"/>
var Wiki;
(function (Wiki) {
    Wiki._module.directive("commitHistoryPanel", function () {
        return {
            templateUrl: Wiki.templatePath + 'historyPanel.html'
        };
    });
})(Wiki || (Wiki = {}));

/// <reference path="../../includes.ts"/>
/// <reference path="wikiHelpers.ts"/>
/// <reference path="wikiPlugin.ts"/>
var Wiki;
(function (Wiki) {
    Wiki._module.controller("Wiki.NavBarController", ["$scope", "$location", "$routeParams", "wikiBranchMenu", function ($scope, $location, $routeParams, wikiBranchMenu) {
            var isFmc = false;
            Wiki.initScope($scope, $routeParams, $location);
            var wikiRepository = $scope.wikiRepository;
            $scope.branchMenuConfig = {
                title: $scope.branch,
                items: []
            };
            $scope.ViewMode = Wiki.ViewMode;
            $scope.setViewMode = function (mode) {
                $scope.$emit('Wiki.SetViewMode', mode);
            };
            wikiBranchMenu.applyMenuExtensions($scope.branchMenuConfig.items);
            $scope.$watch('branches', function (newValue, oldValue) {
                if (newValue === oldValue || !newValue) {
                    return;
                }
                $scope.branchMenuConfig.items = [];
                if (newValue.length > 0) {
                    $scope.branchMenuConfig.items.push({
                        heading: isFmc ? "Versions" : "Branches"
                    });
                }
                newValue.sort().forEach(function (item) {
                    var menuItem = {
                        title: item,
                        icon: '',
                        action: function () { }
                    };
                    if (item === $scope.branch) {
                        menuItem.icon = "fa fa-ok";
                    }
                    else {
                        menuItem.action = function () {
                            var targetUrl = Wiki.branchLink(item, $scope.pageId, $location);
                            $location.path(Core.toPath(targetUrl));
                            Core.$apply($scope);
                        };
                    }
                    $scope.branchMenuConfig.items.push(menuItem);
                });
                wikiBranchMenu.applyMenuExtensions($scope.branchMenuConfig.items);
            }, true);
            $scope.createLink = function () {
                var pageId = Wiki.pageId($routeParams, $location);
                return Wiki.createLink($scope, pageId, $location);
            };
            $scope.startLink = Wiki.startLink($scope);
            $scope.sourceLink = function () {
                var path = $location.path();
                var answer = null;
                angular.forEach(Wiki.customViewLinks($scope), function (link) {
                    if (path.startsWith(link)) {
                        answer = Core.createHref($location, Wiki.startLink($scope) + "/view" + path.substring(link.length));
                    }
                });
                return (!answer && $location.search()["form"])
                    ? Core.createHref($location, "#" + path, ["form"])
                    : answer;
            };
            $scope.isActive = function (href) {
                if (!href) {
                    return false;
                }
                return href.endsWith($routeParams['page']);
            };
            $scope.$on("$routeChangeSuccess", function (event, current, previous) {
                setTimeout(loadBreadcrumbs, 50);
            });
            loadBreadcrumbs();
            function switchFromViewToCustomLink(breadcrumb, link) {
                var href = breadcrumb.href;
                if (href) {
                    breadcrumb.href = href.replace("wiki/view", link);
                }
            }
            function loadBreadcrumbs() {
                var start = Wiki.startLink($scope);
                var href = start + "/view";
                $scope.breadcrumbs = [
                    { href: href, name: "root" }
                ];
                var path = Wiki.pageId($routeParams, $location);
                var array = path ? path.split("/") : [];
                angular.forEach(array, function (name) {
                    if (!name.startsWith("/") && !href.endsWith("/")) {
                        href += "/";
                    }
                    href += Wiki.encodePath(name);
                    if (!name.isBlank()) {
                        $scope.breadcrumbs.push({ href: href, name: name });
                    }
                });
                var loc = $location.path();
                if ($scope.breadcrumbs.length) {
                    var last = $scope.breadcrumbs[$scope.breadcrumbs.length - 1];
                    last.name = Wiki.hideFileNameExtensions(last.name);
                    var swizzled = false;
                    angular.forEach(Wiki.customViewLinks($scope), function (link) {
                        if (!swizzled && loc.startsWith(link)) {
                            switchFromViewToCustomLink($scope.breadcrumbs.last(), Core.trimLeading(link, "/"));
                            swizzled = true;
                        }
                    });
                    if (!swizzled && $location.search()["form"]) {
                        var lastName = $scope.breadcrumbs.last().name;
                        if (lastName && lastName.endsWith(".json")) {
                            switchFromViewToCustomLink($scope.breadcrumbs[$scope.breadcrumbs.length - 2], "wiki/formTable");
                        }
                    }
                }
                var name = null;
                if (loc.startsWith("/wiki/version")) {
                    name = ($routeParams["objectId"] || "").substring(0, 6) || "Version";
                    $scope.breadcrumbs.push({ href: "#" + loc, name: name });
                }
                if (loc.startsWith("/wiki/diff")) {
                    var v1 = ($routeParams["objectId"] || "").substring(0, 6);
                    var v2 = ($routeParams["baseObjectId"] || "").substring(0, 6);
                    name = "Diff";
                    if (v1) {
                        if (v2) {
                            name += " " + v1 + " " + v2;
                        }
                        else {
                            name += " " + v1;
                        }
                    }
                    $scope.breadcrumbs.push({ href: "#" + loc, name: name });
                }
                Core.$apply($scope);
            }
        }]);
})(Wiki || (Wiki = {}));

/// <reference path="wikiPlugin.ts"/>
var Wiki;
(function (Wiki) {
    Wiki._module.controller('Wiki.OverviewDashboard', ["$scope", "$location", "$routeParams", function ($scope, $location, $routeParams) {
        Wiki.initScope($scope, $routeParams, $location);
        $scope.dashboardEmbedded = true;
        $scope.dashboardId = '0';
        $scope.dashboardIndex = '0';
        $scope.dashboardRepository = {
            getType: function () { return 'GitWikiRepository'; },
            putDashboards: function (array, commitMessage, cb) {
                return null;
            },
            deleteDashboards: function (array, fn) {
                return null;
            },
            getDashboards: function (fn) {
                Wiki.log.debug("getDashboards called");
                setTimeout(function () {
                    fn([{
                            group: 'Test',
                            id: '0',
                            title: 'Test',
                            widgets: [{
                                    col: 1,
                                    id: 'w1',
                                    include: 'plugins/wiki/html/projectsCommitPanel.html',
                                    path: $location.path(),
                                    row: 1,
                                    search: $location.search(),
                                    size_x: 3,
                                    size_y: 2,
                                    title: 'Commits'
                                }]
                        }]);
                }, 1000);
            },
            getDashboard: function (id, fn) {
                $scope.$watch('model.fetched', function (fetched) {
                    if (!fetched) {
                        return;
                    }
                    $scope.$watch('selectedBuild', function (build) {
                        if (!build) {
                            return;
                        }
                        $scope.$watch('entity', function (entity) {
                            if (!entity) {
                                return;
                            }
                            var model = $scope.$eval('model');
                            console.log("Build: ", build);
                            console.log("Model: ", model);
                            console.log("Entity: ", entity);
                            setTimeout(function () {
                                var search = {
                                    projectId: $scope.projectId,
                                    namespace: $scope.namespace,
                                    owner: $scope.owner,
                                    branch: $scope.branch,
                                    job: build.$jobId,
                                    id: $scope.projectId,
                                    build: build.id
                                };
                                var dashboard = {
                                    group: 'Test',
                                    id: '0',
                                    title: 'Test',
                                    widgets: [
                                        {
                                            col: 1,
                                            row: 3,
                                            id: 'w3',
                                            include: 'plugins/kubernetes/html/pendingPipelines.html',
                                            path: $location.path(),
                                            search: search,
                                            size_x: 9,
                                            size_y: 1,
                                            title: 'Pipelines'
                                        },
                                        {
                                            col: 1,
                                            row: 4,
                                            id: 'w2',
                                            include: 'plugins/developer/html/logPanel.html',
                                            path: $location.path(),
                                            search: search,
                                            size_x: 4,
                                            size_y: 2,
                                            title: 'Logs for job: ' + build.$jobId + ' build: ' + build.id
                                        },
                                        {
                                            col: 5,
                                            id: 'w4',
                                            include: 'plugins/wiki/html/projectCommitsPanel.html',
                                            path: $location.path(),
                                            row: 4,
                                            search: search,
                                            size_x: 5,
                                            size_y: 2,
                                            title: 'Commits'
                                        }
                                    ]
                                };
                                if (entity.environments.length) {
                                    var colPosition = 1;
                                    _.forEach(entity.environments, function (env, index) {
                                        var s = _.extend({
                                            label: env.label
                                        }, search);
                                        dashboard.widgets.push({
                                            id: env.url,
                                            title: 'Environment: ' + env.label,
                                            size_x: 3,
                                            size_y: 2,
                                            col: colPosition,
                                            row: 1,
                                            include: 'plugins/developer/html/environmentPanel.html',
                                            path: $location.path(),
                                            search: s
                                        });
                                        colPosition = colPosition + 3;
                                    });
                                }
                                fn(dashboard);
                            }, 1);
                        });
                    });
                });
            },
            createDashboard: function (options) {
            }
        };
    }]);
})(Wiki || (Wiki = {}));

/// <reference path="../../includes.ts"/>
/// <reference path="wikiHelpers.ts"/>
/// <reference path="wikiPlugin.ts"/>
var Wiki;
(function (Wiki) {
    Wiki.ViewController = Wiki._module.controller("Wiki.ViewController", ["$scope", "$location", "$routeParams", "$route", "$http", "$timeout", "marked", "fileExtensionTypeRegistry", "$compile", "$templateCache", "localStorage", "$interpolate", "$dialog", function ($scope, $location, $routeParams, $route, $http, $timeout, marked, fileExtensionTypeRegistry, $compile, $templateCache, localStorage, $interpolate, $dialog) {
            $scope.name = "WikiViewController";
            var isFmc = false;
            Wiki.initScope($scope, $routeParams, $location);
            var wikiRepository = $scope.wikiRepository;
            SelectionHelpers.decorate($scope);
            $scope.fabricTopLevel = "fabric/profiles/";
            $scope.versionId = $scope.branch;
            $scope.paneTemplate = '';
            $scope.profileId = "";
            $scope.showProfileHeader = false;
            $scope.showAppHeader = false;
            $scope.operationCounter = 1;
            $scope.renameDialog = null;
            $scope.moveDialog = null;
            $scope.deleteDialog = null;
            $scope.isFile = false;
            $scope.rename = {
                newFileName: ""
            };
            $scope.move = {
                moveFolder: ""
            };
            $scope.ViewMode = Wiki.ViewMode;
            Core.bindModelToSearchParam($scope, $location, "searchText", "q", "");
            StorageHelpers.bindModelToLocalStorage({
                $scope: $scope,
                $location: $location,
                localStorage: localStorage,
                modelName: 'mode',
                paramName: 'wikiViewMode',
                initialValue: Wiki.ViewMode.Icon,
                to: Core.numberToString,
                from: Core.parseIntValue
            });
            Core.reloadWhenParametersChange($route, $scope, $location, ['wikiViewMode']);
            $scope.gridOptions = {
                data: 'children',
                displayFooter: false,
                selectedItems: [],
                showSelectionCheckbox: true,
                enableSorting: false,
                useExternalSorting: true,
                columnDefs: [
                    {
                        field: 'name',
                        displayName: 'Name',
                        cellTemplate: $templateCache.get('fileCellTemplate.html'),
                        headerCellTemplate: $templateCache.get('fileColumnTemplate.html')
                    }
                ]
            };
            $scope.$on('Wiki.SetViewMode', function ($event, mode) {
                $scope.mode = mode;
                switch (mode) {
                    case Wiki.ViewMode.List:
                        Wiki.log.debug("List view mode");
                        break;
                    case Wiki.ViewMode.Icon:
                        Wiki.log.debug("Icon view mode");
                        break;
                    default:
                        $scope.mode = Wiki.ViewMode.List;
                        Wiki.log.debug("Defaulting to list view mode");
                        break;
                }
            });
            $scope.childActions = [];
            var maybeUpdateView = Core.throttled(updateView, 1000);
            $scope.marked = function (text) {
                if (text) {
                    return marked(text);
                }
                else {
                    return '';
                }
            };
            $scope.$on('wikiBranchesUpdated', function () {
                updateView();
            });
            $scope.createDashboardLink = function () {
                var href = '/wiki/branch/:branch/view/*page';
                var page = $routeParams['page'];
                var title = page ? page.split("/").last() : null;
                var size = angular.toJson({
                    size_x: 2,
                    size_y: 2
                });
                var answer = "#/dashboard/add?tab=dashboard" +
                    "&href=" + encodeURIComponent(href) +
                    "&size=" + encodeURIComponent(size) +
                    "&routeParams=" + encodeURIComponent(angular.toJson($routeParams));
                if (title) {
                    answer += "&title=" + encodeURIComponent(title);
                }
                return answer;
            };
            $scope.displayClass = function () {
                if (!$scope.children || $scope.children.length === 0) {
                    return "";
                }
                return "span9";
            };
            $scope.parentLink = function () {
                var start = Wiki.startLink($scope);
                var prefix = start + "/view";
                var parts = $scope.pageId.split("/");
                var path = "/" + parts.first(parts.length - 1).join("/");
                return Core.createHref($location, prefix + path, []);
            };
            $scope.childLink = function (child) {
                var start = Wiki.startLink($scope);
                var prefix = start + "/view";
                var postFix = "";
                var path = Wiki.encodePath(child.path);
                if (child.directory) {
                    var formPath = path + ".form";
                    var children = $scope.children;
                    if (children) {
                        var formFile = children.find(function (child) {
                            return child['path'] === formPath;
                        });
                        if (formFile) {
                            prefix = start + "/formTable";
                            postFix = "?form=" + formPath;
                        }
                    }
                }
                else {
                    var xmlNamespaces = child.xml_namespaces || child.xmlNamespaces;
                    if (xmlNamespaces && xmlNamespaces.length) {
                        if (xmlNamespaces.any(function (ns) { return Wiki.camelNamespaces.any(ns); })) {
                            if (Wiki.useCamelCanvasByDefault) {
                                prefix = start + "/camel/canvas";
                            }
                            else {
                                prefix = start + "/camel/properties";
                            }
                        }
                        else if (xmlNamespaces.any(function (ns) { return Wiki.dozerNamespaces.any(ns); })) {
                            prefix = start + "/dozer/mappings";
                        }
                        else {
                            Wiki.log.debug("child " + path + " has namespaces " + xmlNamespaces);
                        }
                    }
                    if (child.path.endsWith(".form")) {
                        postFix = "?form=/";
                    }
                    else if (Wiki.isIndexPage(child.path)) {
                        prefix = start + "/book";
                    }
                }
                return Core.createHref($location, UrlHelpers.join(prefix, path) + postFix, ["form"]);
            };
            $scope.fileName = function (entity) {
                return Wiki.hideFileNameExtensions(entity.displayName || entity.name);
            };
            $scope.fileClass = function (entity) {
                if (entity.name.has(".profile")) {
                    return "green";
                }
                return "";
            };
            $scope.fileIconHtml = function (entity) {
                return Wiki.fileIconHtml(entity);
            };
            $scope.format = Wiki.fileFormat($scope.pageId, fileExtensionTypeRegistry);
            var options = {
                readOnly: true,
                mode: {
                    name: $scope.format
                }
            };
            $scope.codeMirrorOptions = CodeEditor.createEditorSettings(options);
            $scope.editLink = function () {
                var pageName = ($scope.directory) ? $scope.readMePath : $scope.pageId;
                return (pageName) ? Wiki.editLink($scope, pageName, $location) : null;
            };
            $scope.forgeLink = function () {
                return Forge.projectCommandsLink($scope.namespace, $scope.projectId);
            };
            $scope.branchLink = function (branch) {
                if (branch) {
                    return Wiki.branchLink(branch, $scope.pageId, $location);
                }
                return null;
            };
            $scope.historyLink = "#/wiki" + ($scope.branch ? "/branch/" + $scope.branch : "") + "/history/" + $scope.pageId;
            $scope.$watch('workspace.tree', function () {
                if (!$scope.git) {
                    setTimeout(maybeUpdateView, 50);
                }
            });
            $scope.$on("$routeChangeSuccess", function (event, current, previous) {
                setTimeout(maybeUpdateView, 50);
            });
            $scope.openDeleteDialog = function () {
                if ($scope.gridOptions.selectedItems.length) {
                    $scope.selectedFileHtml = "<ul>" + $scope.gridOptions.selectedItems.map(function (file) { return "<li>" + file.name + "</li>"; }).sort().join("") + "</ul>";
                    if ($scope.gridOptions.selectedItems.find(function (file) { return file.name.endsWith(".profile"); })) {
                        $scope.deleteWarning = "You are about to delete document(s) which represent Fabric8 profile(s). This really can't be undone! Wiki operations are low level and may lead to non-functional state of Fabric.";
                    }
                    else {
                        $scope.deleteWarning = null;
                    }
                    $scope.deleteDialog = Wiki.getDeleteDialog($dialog, {
                        callbacks: function () { return $scope.deleteAndCloseDialog; },
                        selectedFileHtml: function () { return $scope.selectedFileHtml; },
                        warning: function () { return $scope.deleteWarning; }
                    });
                    $scope.deleteDialog.open();
                }
                else {
                    Wiki.log.debug("No items selected right now! " + $scope.gridOptions.selectedItems);
                }
            };
            $scope.deleteAndCloseDialog = function () {
                var files = $scope.gridOptions.selectedItems;
                var fileCount = files.length;
                Wiki.log.debug("Deleting selection: " + files);
                var pathsToDelete = [];
                angular.forEach(files, function (file, idx) {
                    var path = UrlHelpers.join($scope.pageId, file.name);
                    pathsToDelete.push(path);
                });
                Wiki.log.debug("About to delete " + pathsToDelete);
                $scope.git = wikiRepository.removePages($scope.branch, pathsToDelete, null, function (result) {
                    $scope.gridOptions.selectedItems = [];
                    var message = Core.maybePlural(fileCount, "document");
                    Core.notification("success", "Deleted " + message);
                    Core.$apply($scope);
                    updateView();
                });
                $scope.deleteDialog.close();
            };
            $scope.$watch("rename.newFileName", function () {
                var path = getRenameFilePath();
                if ($scope.originalRenameFilePath === path) {
                    $scope.fileExists = { exists: false, name: null };
                }
                else {
                    checkFileExists(path);
                }
            });
            $scope.renameAndCloseDialog = function () {
                if ($scope.gridOptions.selectedItems.length) {
                    var selected = $scope.gridOptions.selectedItems[0];
                    var newPath = getRenameFilePath();
                    if (selected && newPath) {
                        var oldName = selected.name;
                        var newName = Wiki.fileName(newPath);
                        var oldPath = UrlHelpers.join($scope.pageId, oldName);
                        Wiki.log.debug("About to rename file " + oldPath + " to " + newPath);
                        $scope.git = wikiRepository.rename($scope.branch, oldPath, newPath, null, function (result) {
                            Core.notification("success", "Renamed file to  " + newName);
                            $scope.gridOptions.selectedItems.splice(0, 1);
                            $scope.renameDialog.close();
                            Core.$apply($scope);
                            updateView();
                        });
                    }
                }
                $scope.renameDialog.close();
            };
            $scope.openRenameDialog = function () {
                var name = null;
                if ($scope.gridOptions.selectedItems.length) {
                    var selected = $scope.gridOptions.selectedItems[0];
                    name = selected.name;
                }
                if (name) {
                    $scope.rename.newFileName = name;
                    $scope.originalRenameFilePath = getRenameFilePath();
                    $scope.renameDialog = Wiki.getRenameDialog($dialog, {
                        rename: function () { return $scope.rename; },
                        fileExists: function () { return $scope.fileExists; },
                        fileName: function () { return $scope.fileName; },
                        callbacks: function () { return $scope.renameAndCloseDialog; }
                    });
                    $scope.renameDialog.open();
                    $timeout(function () {
                        $('#renameFileName').focus();
                    }, 50);
                }
                else {
                    Wiki.log.debug("No items selected right now! " + $scope.gridOptions.selectedItems);
                }
            };
            $scope.moveAndCloseDialog = function () {
                var files = $scope.gridOptions.selectedItems;
                var fileCount = files.length;
                var moveFolder = $scope.move.moveFolder;
                var oldFolder = $scope.pageId;
                if (moveFolder && fileCount && moveFolder !== oldFolder) {
                    Wiki.log.debug("Moving " + fileCount + " file(s) to " + moveFolder);
                    angular.forEach(files, function (file, idx) {
                        var oldPath = oldFolder + "/" + file.name;
                        var newPath = moveFolder + "/" + file.name;
                        Wiki.log.debug("About to move " + oldPath + " to " + newPath);
                        $scope.git = wikiRepository.rename($scope.branch, oldPath, newPath, null, function (result) {
                            if (idx + 1 === fileCount) {
                                $scope.gridOptions.selectedItems.splice(0, fileCount);
                                var message = Core.maybePlural(fileCount, "document");
                                Core.notification("success", "Moved " + message + " to " + newPath);
                                $scope.moveDialog.close();
                                Core.$apply($scope);
                                updateView();
                            }
                        });
                    });
                }
                $scope.moveDialog.close();
            };
            $scope.folderNames = function (text) {
                return wikiRepository.completePath($scope.branch, text, true, null);
            };
            $scope.openMoveDialog = function () {
                if ($scope.gridOptions.selectedItems.length) {
                    $scope.move.moveFolder = $scope.pageId;
                    $scope.moveDialog = Wiki.getMoveDialog($dialog, {
                        move: function () { return $scope.move; },
                        folderNames: function () { return $scope.folderNames; },
                        callbacks: function () { return $scope.moveAndCloseDialog; }
                    });
                    $scope.moveDialog.open();
                    $timeout(function () {
                        $('#moveFolder').focus();
                    }, 50);
                }
                else {
                    Wiki.log.debug("No items selected right now! " + $scope.gridOptions.selectedItems);
                }
            };
            setTimeout(maybeUpdateView, 50);
            function isDiffView() {
                return $routeParams["diffObjectId1"] || $routeParams["diffObjectId2"] ? true : false;
            }
            function updateView() {
                var jolokia = null;
                if (isDiffView()) {
                    var baseObjectId = $routeParams["diffObjectId2"];
                    $scope.git = wikiRepository.diff($scope.objectId, baseObjectId, $scope.pageId, onFileDetails);
                }
                else {
                    $scope.git = wikiRepository.getPage($scope.branch, $scope.pageId, $scope.objectId, onFileDetails);
                }
                Wiki.loadBranches(jolokia, wikiRepository, $scope, isFmc);
            }
            $scope.updateView = updateView;
            function viewContents(pageName, contents) {
                $scope.sourceView = null;
                var format = null;
                if (isDiffView()) {
                    format = "diff";
                }
                else {
                    format = Wiki.fileFormat(pageName, fileExtensionTypeRegistry) || $scope.format;
                }
                Wiki.log.debug("File format: ", format);
                switch (format) {
                    case "image":
                        var imageURL = 'git/' + $scope.branch;
                        Wiki.log.debug("$scope: ", $scope);
                        imageURL = UrlHelpers.join(imageURL, $scope.pageId);
                        var interpolateFunc = $interpolate($templateCache.get("imageTemplate.html"));
                        $scope.html = interpolateFunc({
                            imageURL: imageURL
                        });
                        break;
                    case "markdown":
                        $scope.html = contents ? marked(contents) : "";
                        break;
                    case "javascript":
                        var form = null;
                        form = $location.search()["form"];
                        $scope.source = contents;
                        $scope.form = form;
                        if (form) {
                            $scope.sourceView = null;
                            $scope.git = wikiRepository.getPage($scope.branch, form, $scope.objectId, function (details) {
                                onFormSchema(Wiki.parseJson(details.text));
                            });
                        }
                        else {
                            $scope.sourceView = "plugins/wiki/html/sourceView.html";
                        }
                        break;
                    default:
                        $scope.html = null;
                        $scope.source = contents;
                        $scope.sourceView = "plugins/wiki/html/sourceView.html";
                }
                Core.$apply($scope);
            }
            function onFormSchema(json) {
                $scope.formDefinition = json;
                if ($scope.source) {
                    $scope.formEntity = Wiki.parseJson($scope.source);
                }
                $scope.sourceView = "plugins/wiki/html/formView.html";
                Core.$apply($scope);
            }
            function onFileDetails(details) {
                var contents = details.text;
                $scope.directory = details.directory;
                $scope.fileDetails = details;
                if (details && details.format) {
                    $scope.format = details.format;
                }
                else {
                    $scope.format = Wiki.fileFormat($scope.pageId, fileExtensionTypeRegistry);
                }
                $scope.codeMirrorOptions.mode.name = $scope.format;
                $scope.children = null;
                if (details.directory) {
                    var directories = details.children.filter(function (dir) {
                        return dir.directory;
                    });
                    var profiles = details.children.filter(function (dir) {
                        return false;
                    });
                    var files = details.children.filter(function (file) {
                        return !file.directory;
                    });
                    directories = directories.sortBy(function (dir) {
                        return dir.name;
                    });
                    profiles = profiles.sortBy(function (dir) {
                        return dir.name;
                    });
                    files = files.sortBy(function (file) {
                        return file.name;
                    })
                        .sortBy(function (file) {
                        return file.name.split('.').last();
                    });
                    $scope.children = Array.create(directories, profiles, files).map(function (file) {
                        file.branch = $scope.branch;
                        file.fileName = file.name;
                        if (file.directory) {
                            file.fileName += ".zip";
                        }
                        file.downloadURL = Wiki.gitRestURL($scope, file.path);
                        return file;
                    });
                }
                $scope.html = null;
                $scope.source = null;
                $scope.readMePath = null;
                $scope.isFile = false;
                if ($scope.children) {
                    $scope.$broadcast('pane.open');
                    var item = $scope.children.find(function (info) {
                        var name = (info.name || "").toLowerCase();
                        var ext = Wiki.fileExtension(name);
                        return name && ext && ((name.startsWith("readme.") || name === "readme") || (name.startsWith("index.") || name === "index"));
                    });
                    if (item) {
                        var pageName = item.path;
                        $scope.readMePath = pageName;
                        wikiRepository.getPage($scope.branch, pageName, $scope.objectId, function (readmeDetails) {
                            viewContents(pageName, readmeDetails.text);
                        });
                    }
                    var kubernetesJson = $scope.children.find(function (child) {
                        var name = (child.name || "").toLowerCase();
                        var ext = Wiki.fileExtension(name);
                        return name && ext && name.startsWith("kubernetes") && ext === "json";
                    });
                    if (kubernetesJson) {
                        wikiRepository.getPage($scope.branch, kubernetesJson.path, undefined, function (json) {
                            if (json && json.text) {
                                try {
                                    $scope.kubernetesJson = angular.fromJson(json.text);
                                }
                                catch (e) {
                                    $scope.kubernetesJson = {
                                        errorParsing: true,
                                        error: e
                                    };
                                }
                                $scope.showAppHeader = true;
                                Core.$apply($scope);
                            }
                        });
                    }
                    $scope.$broadcast('Wiki.ViewPage.Children', $scope.pageId, $scope.children);
                }
                else {
                    $scope.$broadcast('pane.close');
                    var pageName = $scope.pageId;
                    viewContents(pageName, contents);
                    $scope.isFile = true;
                }
                Core.$apply($scope);
            }
            function checkFileExists(path) {
                $scope.operationCounter += 1;
                var counter = $scope.operationCounter;
                if (path) {
                    wikiRepository.exists($scope.branch, path, function (result) {
                        if ($scope.operationCounter === counter) {
                            Wiki.log.debug("checkFileExists for path " + path + " got result " + result);
                            $scope.fileExists.exists = result ? true : false;
                            $scope.fileExists.name = result ? result.name : null;
                            Core.$apply($scope);
                        }
                        else {
                        }
                    });
                }
            }
            $scope.getContents = function (filename, cb) {
                var pageId = filename;
                if ($scope.directory) {
                    pageId = $scope.pageId + '/' + filename;
                }
                else {
                    var pathParts = $scope.pageId.split('/');
                    pathParts = pathParts.remove(pathParts.last());
                    pathParts.push(filename);
                    pageId = pathParts.join('/');
                }
                Wiki.log.debug("pageId: ", $scope.pageId);
                Wiki.log.debug("branch: ", $scope.branch);
                Wiki.log.debug("filename: ", filename);
                Wiki.log.debug("using pageId: ", pageId);
                wikiRepository.getPage($scope.branch, pageId, undefined, function (data) {
                    cb(data.text);
                });
            };
            function getRenameFilePath() {
                var newFileName = $scope.rename.newFileName;
                return ($scope.pageId && newFileName) ? UrlHelpers.join($scope.pageId, newFileName) : null;
            }
        }]);
})(Wiki || (Wiki = {}));

/// <reference path="../../includes.ts"/>
/// <reference path="wikiHelpers.ts"/>
/// <reference path="wikiPlugin.ts"/>
var Wiki;
(function (Wiki) {
    function getRenameDialog($dialog, $scope) {
        return $dialog.dialog({
            resolve: $scope,
            templateUrl: 'plugins/wiki/html/modal/renameDialog.html',
            controller: ["$scope", "dialog", "callbacks", "rename", "fileExists", "fileName", function ($scope, dialog, callbacks, rename, fileExists, fileName) {
                    $scope.rename = rename;
                    $scope.fileExists = fileExists;
                    $scope.fileName = fileName;
                    $scope.close = function (result) {
                        dialog.close();
                    };
                    $scope.renameAndCloseDialog = callbacks;
                }]
        });
    }
    Wiki.getRenameDialog = getRenameDialog;
    function getMoveDialog($dialog, $scope) {
        return $dialog.dialog({
            resolve: $scope,
            templateUrl: 'plugins/wiki/html/modal/moveDialog.html',
            controller: ["$scope", "dialog", "callbacks", "move", "folderNames", function ($scope, dialog, callbacks, move, folderNames) {
                    $scope.move = move;
                    $scope.folderNames = folderNames;
                    $scope.close = function (result) {
                        dialog.close();
                    };
                    $scope.moveAndCloseDialog = callbacks;
                }]
        });
    }
    Wiki.getMoveDialog = getMoveDialog;
    function getDeleteDialog($dialog, $scope) {
        return $dialog.dialog({
            resolve: $scope,
            templateUrl: 'plugins/wiki/html/modal/deleteDialog.html',
            controller: ["$scope", "dialog", "callbacks", "selectedFileHtml", "warning", function ($scope, dialog, callbacks, selectedFileHtml, warning) {
                    $scope.selectedFileHtml = selectedFileHtml;
                    $scope.close = function (result) {
                        dialog.close();
                    };
                    $scope.deleteAndCloseDialog = callbacks;
                    $scope.warning = warning;
                }]
        });
    }
    Wiki.getDeleteDialog = getDeleteDialog;
})(Wiki || (Wiki = {}));

/// <reference path="../../includes.ts"/>
/// <reference path="wikiHelpers.ts"/>
/// <reference path="wikiPlugin.ts"/>
var Wiki;
(function (Wiki) {
    Wiki._module.directive('wikiHrefAdjuster', ["$location", function ($location) {
            return {
                restrict: 'A',
                link: function ($scope, $element, $attr) {
                    $element.bind('DOMNodeInserted', function (event) {
                        var ays = $element.find('a');
                        angular.forEach(ays, function (a) {
                            if (a.hasAttribute('no-adjust')) {
                                return;
                            }
                            a = $(a);
                            var href = (a.attr('href') || "").trim();
                            if (href) {
                                var fileExtension = a.attr('file-extension');
                                var newValue = Wiki.adjustHref($scope, $location, href, fileExtension);
                                if (newValue) {
                                    a.attr('href', newValue);
                                }
                            }
                        });
                        var imgs = $element.find('img');
                        angular.forEach(imgs, function (a) {
                            if (a.hasAttribute('no-adjust')) {
                                return;
                            }
                            a = $(a);
                            var href = (a.attr('src') || "").trim();
                            if (href) {
                                if (href.startsWith("/")) {
                                    href = Core.url(href);
                                    a.attr('src', href);
                                    a.attr('no-adjust', 'true');
                                }
                            }
                        });
                    });
                }
            };
        }]);
    Wiki._module.directive('wikiTitleLinker', ["$location", function ($location) {
            return {
                restrict: 'A',
                link: function ($scope, $element, $attr) {
                    var loaded = false;
                    function offsetTop(elements) {
                        if (elements) {
                            var offset = elements.offset();
                            if (offset) {
                                return offset.top;
                            }
                        }
                        return 0;
                    }
                    function scrollToHash() {
                        var answer = false;
                        var id = $location.search()["hash"];
                        return scrollToId(id);
                    }
                    function scrollToId(id) {
                        var answer = false;
                        var id = $location.search()["hash"];
                        if (id) {
                            var selector = 'a[name="' + id + '"]';
                            var targetElements = $element.find(selector);
                            if (targetElements && targetElements.length) {
                                var scrollDuration = 1;
                                var delta = offsetTop($($element));
                                var top = offsetTop(targetElements) - delta;
                                if (top < 0) {
                                    top = 0;
                                }
                                $('body,html').animate({
                                    scrollTop: top
                                }, scrollDuration);
                                answer = true;
                            }
                            else {
                            }
                        }
                        return answer;
                    }
                    function addLinks(event) {
                        var headings = $element.find('h1,h2,h3,h4,h5,h6,h7');
                        var updated = false;
                        angular.forEach(headings, function (he) {
                            var h1 = $(he);
                            var a = h1.parent("a");
                            if (!a || !a.length) {
                                var text = h1.text();
                                if (text) {
                                    var target = text.replace(/ /g, "-");
                                    var pathWithHash = "#" + $location.path() + "?hash=" + target;
                                    var link = Core.createHref($location, pathWithHash, ['hash']);
                                    var newA = $('<a name="' + target + '" href="' + link + '" ng-click="onLinkClick()"></a>');
                                    newA.on("click", function () {
                                        setTimeout(function () {
                                            if (scrollToId(target)) {
                                            }
                                        }, 50);
                                    });
                                    newA.insertBefore(h1);
                                    h1.detach();
                                    newA.append(h1);
                                    updated = true;
                                }
                            }
                        });
                        if (updated && !loaded) {
                            setTimeout(function () {
                                if (scrollToHash()) {
                                    loaded = true;
                                }
                            }, 50);
                        }
                    }
                    function onEventInserted(event) {
                        $element.unbind('DOMNodeInserted', onEventInserted);
                        addLinks(event);
                        $element.bind('DOMNodeInserted', onEventInserted);
                    }
                    $element.bind('DOMNodeInserted', onEventInserted);
                }
            };
        }]);
})(Wiki || (Wiki = {}));

/// <reference path="../../includes.ts"/>
var Wiki;
(function (Wiki) {
    Developer.customProjectSubTabFactories.push(function (context) {
        var projectLink = context.projectLink;
        var wikiLink = null;
        if (projectLink) {
            wikiLink = UrlHelpers.join(projectLink, "wiki", "view");
        }
        return {
            isValid: function () { return wikiLink && Developer.forgeReadyLink(); },
            href: wikiLink,
            label: "Source",
            title: "Browse the source code of this project"
        };
    });
    function createSourceBreadcrumbs($scope) {
        var sourceLink = $scope.$viewLink || UrlHelpers.join(Wiki.startLink($scope), "view");
        return [
            {
                label: "Source",
                href: sourceLink,
                title: "Browse the source code of this project"
            }
        ];
    }
    Wiki.createSourceBreadcrumbs = createSourceBreadcrumbs;
    function createEditingBreadcrumb($scope) {
        return {
            label: "Editing",
            title: "Editing this file"
        };
    }
    Wiki.createEditingBreadcrumb = createEditingBreadcrumb;
})(Wiki || (Wiki = {}));

/// <reference path="../../includes.ts"/>
/// <reference path="wikiHelpers.ts"/>
/// <reference path="wikiPlugin.ts"/>
var Wiki;
(function (Wiki) {
    var GitWikiRepository = (function () {
        function GitWikiRepository($scope) {
            this.directoryPrefix = "";
            var ForgeApiURL = Kubernetes.inject("ForgeApiURL");
            this.$http = Kubernetes.inject("$http");
            this.config = Forge.createHttpConfig();
            var owner = $scope.owner;
            var repoName = $scope.repoId;
            var projectId = $scope.projectId;
            this.projectId = projectId;
            var ns = $scope.namespace || Kubernetes.currentKubernetesNamespace();
            this.baseUrl = UrlHelpers.join(ForgeApiURL, "repos/project", ns, projectId);
        }
        GitWikiRepository.prototype.getPage = function (branch, path, objectId, fn) {
            var query = null;
            if (branch) {
                query = "ref=" + branch;
            }
            this.doGet(UrlHelpers.join("content", path || "/"), query, function (data, status, headers, config) {
                if (data) {
                    var details = null;
                    if (angular.isArray(data)) {
                        angular.forEach(data, function (file) {
                            if (!file.directory && file.type === "dir") {
                                file.directory = true;
                            }
                        });
                        details = {
                            directory: true,
                            children: data
                        };
                    }
                    else {
                        details = data;
                        var content = data.content;
                        if (content) {
                            details.text = content.decodeBase64();
                        }
                    }
                    fn(details);
                }
            });
        };
        GitWikiRepository.prototype.putPage = function (branch, path, contents, commitMessage, fn) {
            var query = null;
            if (branch) {
                query = "ref=" + branch;
            }
            if (commitMessage) {
                query = (query ? query + "&" : "") + "message=" + encodeURIComponent(commitMessage);
            }
            var body = contents;
            this.doPost(UrlHelpers.join("content", path || "/"), query, body, function (data, status, headers, config) {
                fn(data);
            });
        };
        GitWikiRepository.prototype.history = function (branch, objectId, path, limit, fn) {
            var query = null;
            if (branch) {
                query = "ref=" + branch;
            }
            if (limit) {
                query = (query ? query + "&" : "") + "limit=" + limit;
            }
            var commitId = objectId || branch;
            this.doGet(UrlHelpers.join("history", commitId, path), query, function (data, status, headers, config) {
                fn(data);
            });
        };
        GitWikiRepository.prototype.commitInfo = function (commitId, fn) {
            var query = null;
            this.doGet(UrlHelpers.join("commitInfo", commitId), query, function (data, status, headers, config) {
                fn(data);
            });
        };
        GitWikiRepository.prototype.commitDetail = function (commitId, fn) {
            var query = null;
            this.doGet(UrlHelpers.join("commitDetail", commitId), query, function (data, status, headers, config) {
                fn(data);
            });
        };
        GitWikiRepository.prototype.commitTree = function (commitId, fn) {
            var query = null;
            this.doGet(UrlHelpers.join("commitTree", commitId), query, function (data, status, headers, config) {
                fn(data);
            });
        };
        GitWikiRepository.prototype.diff = function (objectId, baseObjectId, path, fn) {
            var query = null;
            var config = Forge.createHttpConfig();
            config.transformResponse = function (data, headersGetter, status) {
                Wiki.log.info("got diff data: " + data);
                return data;
            };
            this.doGet(UrlHelpers.join("diff", objectId, baseObjectId, path), query, function (data, status, headers, config) {
                var details = {
                    text: data,
                    format: "diff",
                    directory: false
                };
                fn(details);
            }, null, config);
        };
        GitWikiRepository.prototype.branches = function (fn) {
            var query = null;
            this.doGet("listBranches", query, function (data, status, headers, config) {
                fn(data);
            });
        };
        GitWikiRepository.prototype.exists = function (branch, path, fn) {
            var answer = false;
            this.getPage(branch, path, null, function (data) {
                if (data.directory) {
                    if (data.children.length) {
                        answer = true;
                    }
                }
                else {
                    answer = true;
                }
                Wiki.log.info("exists " + path + " answer = " + answer);
                if (angular.isFunction(fn)) {
                    fn(answer);
                }
            });
            return answer;
        };
        GitWikiRepository.prototype.revertTo = function (branch, objectId, blobPath, commitMessage, fn) {
            if (!commitMessage) {
                commitMessage = "Reverting " + blobPath + " commit " + (objectId || branch);
            }
            var query = null;
            if (branch) {
                query = "ref=" + branch;
            }
            if (commitMessage) {
                query = (query ? query + "&" : "") + "message=" + encodeURIComponent(commitMessage);
            }
            var body = "";
            this.doPost(UrlHelpers.join("revert", objectId, blobPath || "/"), query, body, function (data, status, headers, config) {
                fn(data);
            });
        };
        GitWikiRepository.prototype.rename = function (branch, oldPath, newPath, commitMessage, fn) {
            if (!commitMessage) {
                commitMessage = "Renaming page " + oldPath + " to " + newPath;
            }
            var query = null;
            if (branch) {
                query = "ref=" + branch;
            }
            if (commitMessage) {
                query = (query ? query + "&" : "") + "message=" + encodeURIComponent(commitMessage);
            }
            if (oldPath) {
                query = (query ? query + "&" : "") + "old=" + encodeURIComponent(oldPath);
            }
            var body = "";
            this.doPost(UrlHelpers.join("mv", newPath || "/"), query, body, function (data, status, headers, config) {
                fn(data);
            });
        };
        GitWikiRepository.prototype.removePage = function (branch, path, commitMessage, fn) {
            if (!commitMessage) {
                commitMessage = "Removing page " + path;
            }
            var query = null;
            if (branch) {
                query = "ref=" + branch;
            }
            if (commitMessage) {
                query = (query ? query + "&" : "") + "message=" + encodeURIComponent(commitMessage);
            }
            var body = "";
            this.doPost(UrlHelpers.join("rm", path || "/"), query, body, function (data, status, headers, config) {
                fn(data);
            });
        };
        GitWikiRepository.prototype.removePages = function (branch, paths, commitMessage, fn) {
            if (!commitMessage) {
                commitMessage = "Removing page" + (paths.length > 1 ? "s" : "") + " " + paths.join(", ");
            }
            var query = null;
            if (branch) {
                query = "ref=" + branch;
            }
            if (commitMessage) {
                query = (query ? query + "&" : "") + "message=" + encodeURIComponent(commitMessage);
            }
            var body = paths;
            this.doPost(UrlHelpers.join("rm"), query, body, function (data, status, headers, config) {
                fn(data);
            });
        };
        GitWikiRepository.prototype.doGet = function (path, query, successFn, errorFn, config) {
            if (errorFn === void 0) { errorFn = null; }
            if (config === void 0) { config = null; }
            var url = Forge.createHttpUrl(this.projectId, UrlHelpers.join(this.baseUrl, path));
            if (query) {
                url += "&" + query;
            }
            if (!errorFn) {
                errorFn = function (data, status, headers, config) {
                    Wiki.log.warn("failed to load! " + url + ". status: " + status + " data: " + data);
                };
            }
            if (!config) {
                config = this.config;
            }
            this.$http.get(url, config).
                success(successFn).
                error(errorFn);
        };
        GitWikiRepository.prototype.doPost = function (path, query, body, successFn, errorFn) {
            if (errorFn === void 0) { errorFn = null; }
            var url = Forge.createHttpUrl(this.projectId, UrlHelpers.join(this.baseUrl, path));
            if (query) {
                url += "&" + query;
            }
            if (!errorFn) {
                errorFn = function (data, status, headers, config) {
                    Wiki.log.warn("failed to load! " + url + ". status: " + status + " data: " + data);
                };
            }
            this.$http.post(url, body, this.config).
                success(successFn).
                error(errorFn);
        };
        GitWikiRepository.prototype.doPostForm = function (path, query, body, successFn, errorFn) {
            if (errorFn === void 0) { errorFn = null; }
            var url = Forge.createHttpUrl(this.projectId, UrlHelpers.join(this.baseUrl, path));
            if (query) {
                url += "&" + query;
            }
            if (!errorFn) {
                errorFn = function (data, status, headers, config) {
                    Wiki.log.warn("failed to load! " + url + ". status: " + status + " data: " + data);
                };
            }
            var config = Forge.createHttpConfig();
            if (!config.headers) {
                config.headers = {};
            }
            config.headers["Content-Type"] = "application/x-www-form-urlencoded; charset=utf-8";
            this.$http.post(url, body, config).
                success(successFn).
                error(errorFn);
        };
        GitWikiRepository.prototype.completePath = function (branch, completionText, directoriesOnly, fn) {
        };
        GitWikiRepository.prototype.getPath = function (path) {
            var directoryPrefix = this.directoryPrefix;
            return (directoryPrefix) ? directoryPrefix + path : path;
        };
        GitWikiRepository.prototype.getLogPath = function (path) {
            return Core.trimLeading(this.getPath(path), "/");
        };
        GitWikiRepository.prototype.getContent = function (objectId, blobPath, fn) {
        };
        GitWikiRepository.prototype.jsonChildContents = function (path, nameWildcard, search, fn) {
        };
        GitWikiRepository.prototype.git = function () {
        };
        return GitWikiRepository;
    })();
    Wiki.GitWikiRepository = GitWikiRepository;
})(Wiki || (Wiki = {}));

/// <reference path="../../includes.ts"/>
/// <reference path="wikiHelpers.ts"/>
/// <reference path="wikiPlugin.ts"/>
var Wiki;
(function (Wiki) {
    Wiki.TopLevelController = Wiki._module.controller("Wiki.TopLevelController", ['$scope', '$route', '$routeParams', function ($scope, $route, $routeParams) {
        }]);
})(Wiki || (Wiki = {}));

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImluY2x1ZGVzLnRzIiwiZm9yZ2UvdHMvZm9yZ2VIZWxwZXJzLnRzIiwiZm9yZ2UvdHMvZm9yZ2VQbHVnaW4udHMiLCJmb3JnZS90cy9hcmNoZXR5cGVQaWNrZXIudHMiLCJmb3JnZS90cy9jb21tYW5kLnRzIiwiZm9yZ2UvdHMvY29tbWFuZHMudHMiLCJmb3JnZS90cy9waXBlbGluZVBpY2tlci50cyIsImZvcmdlL3RzL3JlcG8udHMiLCJmb3JnZS90cy9yZXBvcy50cyIsImZvcmdlL3RzL3NlY3JldEhlbHBlcnMudHMiLCJmb3JnZS90cy9zZWNyZXRzLnRzIiwibWFpbi90cy9tYWluR2xvYmFscy50cyIsIm1haW4vdHMvbWFpblBsdWdpbi50cyIsIm1haW4vdHMvYWJvdXQudHMiLCJ3aWtpL3RzL3dpa2lIZWxwZXJzLnRzIiwid2lraS90cy93aWtpUGx1Z2luLnRzIiwid2lraS90cy9jYW1lbC50cyIsIndpa2kvdHMvY2FtZWxDYW52YXMudHMiLCJ3aWtpL3RzL2NvbW1pdC50cyIsIndpa2kvdHMvY29tbWl0RGV0YWlsLnRzIiwid2lraS90cy9jcmVhdGUudHMiLCJ3aWtpL3RzL2VkaXQudHMiLCJ3aWtpL3RzL2ZpbGVEcm9wLnRzIiwid2lraS90cy9mb3JtVGFibGUudHMiLCJ3aWtpL3RzL2dpdFByZWZlcmVuY2VzLnRzIiwid2lraS90cy9oaXN0b3J5LnRzIiwid2lraS90cy9oaXN0b3J5RGlyZWN0aXZlLnRzIiwid2lraS90cy9uYXZiYXIudHMiLCJ3aWtpL3RzL292ZXJ2aWV3RGFzaGJvYXJkLnRzIiwid2lraS90cy92aWV3LnRzIiwid2lraS90cy93aWtpRGlhbG9ncy50cyIsIndpa2kvdHMvd2lraURpcmVjdGl2ZXMudHMiLCJ3aWtpL3RzL3dpa2lOYXZpZ2F0aW9uLnRzIiwid2lraS90cy93aWtpUmVwb3NpdG9yeS50cyIsIndpa2kvdHMvd2lraVRvcExldmVsLnRzIl0sIm5hbWVzIjpbIkZvcmdlIiwiRm9yZ2UuaXNGb3JnZSIsIkZvcmdlLmluaXRTY29wZSIsIkZvcmdlLmNvbW1hbmRMaW5rIiwiRm9yZ2UuY29tbWFuZHNMaW5rIiwiRm9yZ2UucHJvamVjdENvbW1hbmRzTGluayIsIkZvcmdlLnJlcG9zQXBpVXJsIiwiRm9yZ2UucmVwb0FwaVVybCIsIkZvcmdlLmNvbW1hbmRBcGlVcmwiLCJGb3JnZS5leGVjdXRlQ29tbWFuZEFwaVVybCIsIkZvcmdlLnZhbGlkYXRlQ29tbWFuZEFwaVVybCIsIkZvcmdlLmNvbW1hbmRJbnB1dEFwaVVybCIsIkZvcmdlLm1vZGVsUHJvamVjdCIsIkZvcmdlLnNldE1vZGVsQ29tbWFuZHMiLCJGb3JnZS5nZXRNb2RlbENvbW1hbmRzIiwiRm9yZ2UubW9kZWxDb21tYW5kSW5wdXRNYXAiLCJGb3JnZS5nZXRNb2RlbENvbW1hbmRJbnB1dHMiLCJGb3JnZS5zZXRNb2RlbENvbW1hbmRJbnB1dHMiLCJGb3JnZS5lbnJpY2hSZXBvIiwiRm9yZ2UuY3JlYXRlSHR0cENvbmZpZyIsIkZvcmdlLmFkZFF1ZXJ5QXJndW1lbnQiLCJGb3JnZS5jcmVhdGVIdHRwVXJsIiwiRm9yZ2UuY29tbWFuZE1hdGNoZXNUZXh0IiwiRm9yZ2UuaXNTb3VyY2VTZWNyZXREZWZpbmVkRm9yUHJvamVjdCIsIkZvcmdlLnJlZGlyZWN0VG9TZXR1cFNlY3JldHNJZk5vdERlZmluZWQiLCJGb3JnZS5nZXRTZWxlY3Rpb24iLCJGb3JnZS5lbnRpdHlDaGFuZ2VkIiwiRm9yZ2UudXNlclNlbGVjdGlvbkNoYW5nZWQiLCJGb3JnZS5vblJvdXRlQ2hhbmdlZCIsImNvcHlWYWx1ZXNGcm9tU2NoZW1hIiwiRm9yZ2UudXBkYXRlU2NoZW1hIiwiRm9yZ2UudmFsaWRhdGUiLCJGb3JnZS50b0JhY2tncm91bmRTdHlsZSIsIkZvcmdlLnVwZGF0ZURhdGEiLCJGb3JnZS5vblNjaGVtYUxvYWQiLCJGb3JnZS5jb21tYW5kTWF0Y2hlcyIsIkZvcmdlLm9wZW5BbGxDb21tYW5kcyIsIkZvcmdlLnRvRWxlbWVudElkIiwiRm9yZ2UuaXNWYWxpZENvbW1hbmQiLCJGb3JnZS51cGRhdGVTZWxlY3Rpb24iLCJGb3JnZS5vblBlcnNvbmFsU2VjcmV0cyIsIkZvcmdlLndhdGNoU2VjcmV0cyIsIkZvcmdlLmRvRGVsZXRlIiwiRm9yZ2UudXBkYXRlTGlua3MiLCJGb3JnZS5nZXRTb3VyY2VTZWNyZXROYW1lc3BhY2UiLCJGb3JnZS5nZXRQcm9qZWN0U291cmNlU2VjcmV0IiwiRm9yZ2Uuc2V0UHJvamVjdFNvdXJjZVNlY3JldCIsIkZvcmdlLnNlY3JldFZhbGlkIiwiRm9yZ2UucGFyc2VVcmwiLCJGb3JnZS5jcmVhdGVMb2NhbFN0b3JhZ2VLZXkiLCJGb3JnZS5nZXRDdXJyZW50U2VjcmV0TmFtZSIsIkZvcmdlLnNlbGVjdGVkU2VjcmV0TmFtZSIsIkZvcmdlLnVwZGF0ZVByb2plY3QiLCJGb3JnZS5vbkJ1aWxkQ29uZmlncyIsIkZvcmdlLmNoZWNrTmFtZXNwYWNlQ3JlYXRlZCIsIkZvcmdlLmNoZWNrTmFtZXNwYWNlQ3JlYXRlZC53YXRjaFNlY3JldHMiLCJNYWluIiwiV2lraSIsIldpa2kuVmlld01vZGUiLCJXaWtpLmlzRk1DQ29udGFpbmVyIiwiV2lraS5pc1dpa2lFbmFibGVkIiwiV2lraS5nb1RvTGluayIsIldpa2kuY3VzdG9tVmlld0xpbmtzIiwiV2lraS5jcmVhdGVXaXphcmRUcmVlIiwiV2lraS5jcmVhdGVGb2xkZXIiLCJXaWtpLmFkZENyZWF0ZVdpemFyZEZvbGRlcnMiLCJXaWtpLnN0YXJ0V2lraUxpbmsiLCJXaWtpLnN0YXJ0TGluayIsIldpa2kuaXNJbmRleFBhZ2UiLCJXaWtpLnZpZXdMaW5rIiwiV2lraS5icmFuY2hMaW5rIiwiV2lraS5lZGl0TGluayIsIldpa2kuY3JlYXRlTGluayIsIldpa2kuZW5jb2RlUGF0aCIsIldpa2kuZGVjb2RlUGF0aCIsIldpa2kuZmlsZUZvcm1hdCIsIldpa2kuZmlsZU5hbWUiLCJXaWtpLmZpbGVQYXJlbnQiLCJXaWtpLmhpZGVGaWxlTmFtZUV4dGVuc2lvbnMiLCJXaWtpLmdpdFJlc3RVUkwiLCJXaWtpLmdpdFVybFByZWZpeCIsIldpa2kuZ2l0UmVsYXRpdmVVUkwiLCJXaWtpLmZpbGVJY29uSHRtbCIsIldpa2kuaWNvbkNsYXNzIiwiV2lraS5pbml0U2NvcGUiLCJXaWtpLmxvYWRCcmFuY2hlcyIsIldpa2kucGFnZUlkIiwiV2lraS5wYWdlSWRGcm9tVVJJIiwiV2lraS5maWxlRXh0ZW5zaW9uIiwiV2lraS5vbkNvbXBsZXRlIiwiV2lraS5wYXJzZUpzb24iLCJXaWtpLmFkanVzdEhyZWYiLCJXaWtpLmdldEZvbGRlclhtbE5vZGUiLCJXaWtpLmFkZE5ld05vZGUiLCJXaWtpLm9uTW9kZWxDaGFuZ2VFdmVudCIsIldpa2kub25Ob2RlRGF0YUNoYW5nZWQiLCJXaWtpLm9uUmVzdWx0cyIsIldpa2kudXBkYXRlVmlldyIsIldpa2kuZ29Ub1ZpZXciLCJXaWtpLmlzUm91dGVPck5vZGUiLCJXaWtpLmNyZWF0ZUVuZHBvaW50VVJJIiwiV2lraS50cmVlTW9kaWZpZWQiLCJXaWtpLnJlbG9hZFJvdXRlSWRzIiwiV2lraS5vblJvdXRlU2VsZWN0aW9uQ2hhbmdlZCIsIldpa2kuc2hvd0dyYXBoIiwiV2lraS5nZXROb2RlSWQiLCJXaWtpLmdldFNlbGVjdGVkT3JSb3V0ZUZvbGRlciIsIldpa2kuZ2V0Q29udGFpbmVyRWxlbWVudCIsIldpa2kubGF5b3V0R3JhcGgiLCJXaWtpLmdldExpbmsiLCJXaWtpLmdldE5vZGVCeUNJRCIsIldpa2kudXBkYXRlU2VsZWN0aW9uIiwiV2lraS5nZXRXaWR0aCIsIldpa2kuZ2V0Rm9sZGVySWRBdHRyaWJ1dGUiLCJXaWtpLmdldFJvdXRlRm9sZGVyIiwiV2lraS5jb21taXRQYXRoIiwiV2lraS5yZXR1cm5Ub0RpcmVjdG9yeSIsIldpa2kuZG9DcmVhdGUiLCJXaWtpLmRvQ3JlYXRlLnRvUGF0aCIsIldpa2kuZG9DcmVhdGUudG9Qcm9maWxlTmFtZSIsIldpa2kucHV0UGFnZSIsIldpa2kuZ2V0TmV3RG9jdW1lbnRQYXRoIiwiV2lraS5pc0NyZWF0ZSIsIldpa2kub25GaWxlQ29udGVudHMiLCJXaWtpLnVwZGF0ZVNvdXJjZVZpZXciLCJXaWtpLm9uRm9ybVNjaGVtYSIsIldpa2kuc2F2ZVRvIiwiV2lraS5jaGlsZExpbmsiLCJXaWtpLm9uRm9ybURhdGEiLCJXaWtpLnN3aXRjaEZyb21WaWV3VG9DdXN0b21MaW5rIiwiV2lraS5sb2FkQnJlYWRjcnVtYnMiLCJXaWtpLmlzRGlmZlZpZXciLCJXaWtpLnZpZXdDb250ZW50cyIsIldpa2kub25GaWxlRGV0YWlscyIsIldpa2kuY2hlY2tGaWxlRXhpc3RzIiwiV2lraS5nZXRSZW5hbWVGaWxlUGF0aCIsIldpa2kuZ2V0UmVuYW1lRGlhbG9nIiwiV2lraS5nZXRNb3ZlRGlhbG9nIiwiV2lraS5nZXREZWxldGVEaWFsb2ciLCJXaWtpLm9mZnNldFRvcCIsIldpa2kuc2Nyb2xsVG9IYXNoIiwiV2lraS5zY3JvbGxUb0lkIiwiV2lraS5hZGRMaW5rcyIsIldpa2kub25FdmVudEluc2VydGVkIiwiV2lraS5jcmVhdGVTb3VyY2VCcmVhZGNydW1icyIsIldpa2kuY3JlYXRlRWRpdGluZ0JyZWFkY3J1bWIiLCJXaWtpLkdpdFdpa2lSZXBvc2l0b3J5IiwiV2lraS5HaXRXaWtpUmVwb3NpdG9yeS5jb25zdHJ1Y3RvciIsIldpa2kuR2l0V2lraVJlcG9zaXRvcnkuZ2V0UGFnZSIsIldpa2kuR2l0V2lraVJlcG9zaXRvcnkucHV0UGFnZSIsIldpa2kuR2l0V2lraVJlcG9zaXRvcnkuaGlzdG9yeSIsIldpa2kuR2l0V2lraVJlcG9zaXRvcnkuY29tbWl0SW5mbyIsIldpa2kuR2l0V2lraVJlcG9zaXRvcnkuY29tbWl0RGV0YWlsIiwiV2lraS5HaXRXaWtpUmVwb3NpdG9yeS5jb21taXRUcmVlIiwiV2lraS5HaXRXaWtpUmVwb3NpdG9yeS5kaWZmIiwiV2lraS5HaXRXaWtpUmVwb3NpdG9yeS5icmFuY2hlcyIsIldpa2kuR2l0V2lraVJlcG9zaXRvcnkuZXhpc3RzIiwiV2lraS5HaXRXaWtpUmVwb3NpdG9yeS5yZXZlcnRUbyIsIldpa2kuR2l0V2lraVJlcG9zaXRvcnkucmVuYW1lIiwiV2lraS5HaXRXaWtpUmVwb3NpdG9yeS5yZW1vdmVQYWdlIiwiV2lraS5HaXRXaWtpUmVwb3NpdG9yeS5yZW1vdmVQYWdlcyIsIldpa2kuR2l0V2lraVJlcG9zaXRvcnkuZG9HZXQiLCJXaWtpLkdpdFdpa2lSZXBvc2l0b3J5LmRvUG9zdCIsIldpa2kuR2l0V2lraVJlcG9zaXRvcnkuZG9Qb3N0Rm9ybSIsIldpa2kuR2l0V2lraVJlcG9zaXRvcnkuY29tcGxldGVQYXRoIiwiV2lraS5HaXRXaWtpUmVwb3NpdG9yeS5nZXRQYXRoIiwiV2lraS5HaXRXaWtpUmVwb3NpdG9yeS5nZXRMb2dQYXRoIiwiV2lraS5HaXRXaWtpUmVwb3NpdG9yeS5nZXRDb250ZW50IiwiV2lraS5HaXRXaWtpUmVwb3NpdG9yeS5qc29uQ2hpbGRDb250ZW50cyIsIldpa2kuR2l0V2lraVJlcG9zaXRvcnkuZ2l0Il0sIm1hcHBpbmdzIjoiQUFBQSwyREFBMkQ7QUFDM0QsNERBQTREO0FBQzVELEdBQUc7QUFDSCxtRUFBbUU7QUFDbkUsb0VBQW9FO0FBQ3BFLDJDQUEyQztBQUMzQyxHQUFHO0FBQ0gsZ0RBQWdEO0FBQ2hELEdBQUc7QUFDSCx1RUFBdUU7QUFDdkUscUVBQXFFO0FBQ3JFLDRFQUE0RTtBQUM1RSx1RUFBdUU7QUFDdkUsa0NBQWtDO0FBRWxDLDBEQUEwRDtBQUMxRCxzREFBc0Q7QUFDdEQsMkRBQTJEO0FBQzNELDREQUE0RDtBQUM1RCwwREFBMEQ7O0FDbEIxRCxJQUFPLEtBQUssQ0FrUFg7QUFsUEQsV0FBTyxLQUFLLEVBQUMsQ0FBQztJQUVEQSxhQUFPQSxHQUFHQSw4QkFBOEJBLENBQUNBO0lBRXpDQSxVQUFJQSxHQUFHQSxHQUFHQSxHQUFHQSxhQUFPQSxDQUFDQTtJQUNyQkEsZ0JBQVVBLEdBQUdBLE9BQU9BLENBQUNBO0lBQ3JCQSxnQkFBVUEsR0FBR0EsZ0JBQWdCQSxDQUFDQTtJQUM5QkEsa0JBQVlBLEdBQUdBLGdCQUFVQSxHQUFHQSxPQUFPQSxDQUFDQTtJQUNwQ0EsU0FB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QU1BLENBQUNBLFlBQVlBLEdBQUdBLFlBQVlBLENBQUNBLE1BQU1BLENBQUNBLElBQUlBLFNBQVNBLENBQUNBLE1BQU1BLEVBQUVBLENBQUNBLE1BQU1BLENBQUNBLElBQUlBLEVBQUVBLENBQUNBO1lBQy9FQSxNQUFNQSxDQUFDQSxFQUFFQSxHQUFHQSxZQUFZQSxDQUFDQSxJQUFJQSxDQUFDQSxDQUFDQTtZQUMvQkEsTUFBTUEsQ0FBQ0EsSUFBSUEsR0FBR0EsWUFBWUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0E7WUFFbkNBLE1BQU1BLENBQUNBLFVBQVVBLEdBQUdBLFlBQVlBLENBQUNBLGVBQWVBLENBQUNBLENBQUNBO1lBQ2xEQSxNQUFNQSxDQUFDQSxJQUFJQSxHQUFHQSxZQUFZQSxDQUFDQSxVQUFVQSxDQUFDQSxDQUFDQTtZQUN2Q0EsTUFBTUEsQ0FBQ0EsUUFBUUEsR0FBR0EsRUFBRUEsQ0FBQ0E7WUFDckJBLElBQUlBLFNBQVNBLEdBQUdBLE1BQU1BLENBQUNBLFlBQVlBLENBQUNBLEtBQUtBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBO1lBQy9DQSxFQUFFQSxDQUFDQSxDQUFDQSxTQUFTQSxJQUFJQSxTQUFTQSxDQUFDQSxNQUFNQSxDQUFDQSxDQUFDQSxDQUFDQTtnQkFDbENBLE1BQU1BLENBQUNBLFFBQVFBLEdBQUdBLFNBQVNBLENBQUNBLFNBQVNBLENBQUNBLE1BQU1BLEdBQUdBLENBQUNBLENBQUNBLENBQUNBO1lBQ3BEQSxDQUFDQTtZQUdEQSxlQUFTQSxDQUFDQSxNQUFNQSxFQUFFQSxTQUFTQSxFQUFFQSxZQUFZQSxDQUFDQSxDQUFDQTtZQUMzQ0EsRUFBRUEsQ0FBQ0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsRUFBRUEsS0FBS0EsYUFBYUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0JBQ2hDQSxNQUFNQSxDQUFDQSxnQkFBZ0JBLEdBQUdBLFNBQVNBLENBQUNBLGdDQUFnQ0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsU0FBU0EsQ0FBQ0EsQ0FBQ0E7Z0JBQ3ZGQSxNQUFNQSxDQUFDQSxZQUFZQSxH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O0lBWURBLG1CQUEwQkEsTUFBTUEsRUFBRUEsWUFBWUEsRUFBRUEsU0FBU0E7UUFDdkQyQixNQUFNQSxDQUFDQSxNQUFNQSxHQUFHQSxJQUFJQSxDQUFDQSxNQUFNQSxDQUFDQSxZQUFZQSxFQUFFQSxTQUFTQSxDQUFDQSxDQUFDQTtRQUdyREEsTUFBTUEsQ0FBQ0EsU0FBU0EsR0FBR0EsWUFBWUEsQ0FBQ0EsV0FBV0EsQ0FBQ0EsSUFBSUEsTUFBTUEsQ0FBQ0EsRUFBRUEsQ0FBQ0E7UUFDMURBLE1BQU1BLENBQUNBLFNBQVNBLEdBQUdBLFlBQVlBLENBQUNBLFdBQVdBLENBQUNBLElBQUlBLE1BQU1BLENBQUNBLFNBQVNBLENBQUNBO1FBQ2pFQSxVQUFVQSxDQUFDQSw2QkFBNkJBLENBQUNBLE1BQU1BLENBQUNBLFNBQVNBLENBQUNBLENBQUNBO1FBRTNEQSxNQUFNQSxDQUFDQSxLQUFLQSxHQUFHQSxZQUFZQSxDQUFDQSxPQUFPQSxDQUFDQSxDQUFDQTtRQUNyQ0EsTUFBTUEsQ0FBQ0EsTUFBTUEsR0FBR0EsWUFBWUEsQ0FBQ0EsUUFBUUEsQ0FBQ0EsQ0FBQ0E7UUFDdkNBLE1BQU1BLENBQUNBLE1BQU1BLEdBQUdBLFlBQVlBLENBQUNBLFFBQVFBLENBQUNBLElBQUlBLFNBQVNBLENBQUNBLE1BQU1BLEVBQUVBLENBQUNBLFFBQVFBLENBQUNBLENBQUNBO1FBQ3ZFQSxNQUFNQSxDQUFDQSxRQUFRQSxHQUFHQSxZQUFZQSxDQUFDQSxVQUFVQSxDQUFDQSxJQUFJQSxZQUFZQSxDQUFDQSxlQUFlQSxDQUFDQSxDQUFDQTtRQUM1RUEsTUFBTUEsQ0FBQ0EsU0FBU0EsR0FBR0EsU0FBU0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0E7UUFDckNBLE1BQU1BLENBQUNBLFNBQVNBLEdBQUdBLFFBQVFBLENBQUNBLE1BQU1BLEVBQUVBLE1BQU1BLENBQUNBLE1BQU1BLEVBQUVBLFNBQVNBLENBQUNBLENBQUNBO1FBQzlEQSxNQUFNQSxDQUFDQSxXQUFXQSxHQUFHQSxTQUFTQSxDQUFDQSxNQUFNQSxDQUFDQSxH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QUFDQTtRQUt6REEsSUFBSUEsSUFBSUEsR0FBR0EsU0FBU0EsQ0FBQ0EsSUFBSUEsRUFBRUEsQ0FBQ0E7UUFDNUJBLElBQUlBLFVBQVVBLEdBQUdBLElBQUlBLENBQUNBO1FBQ3RCQSxJQUFJQSxHQUFHQSxHQUFHQSxJQUFJQSxDQUFDQSxXQUFXQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQTtRQUNoQ0EsRUFBRUEsQ0FBQ0EsQ0FBQ0EsR0FBR0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7WUFDWkEsSUFBSUEsUUFBUUEsR0FBR0EsSUFBSUEsQ0FBQ0EsU0FBU0EsQ0FBQ0EsR0FBR0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7WUFDdkNBLEVBQUVBLENBQUNBLENBQUNBLFFBQVFBLENBQUNBLE9BQU9BLENBQUNBLEdBQUdBLENBQUNBLElBQUlBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO2dCQUMvQkEsVUFBVUEsR0FBR0EsSUFBSUEsQ0FBQ0EsU0FBU0EsQ0FBQ0EsQ0FBQ0EsRUFBRUEsR0FBR0EsQ0FBQ0EsQ0FBQ0E7WUFDdENBLENBQUNBO1FBQ0hBLENBQUNBO1FBR0RBLEVBQUVBLENBQUNBLENBQUNBLElBQUlBLENBQUNBLFVBQVVBLENBQUNBLEtBQUtBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO1lBQzNCQSxJQUFJQSxLQUFLQSxHQUFHQSxJQUFJQSxDQUFDQSxLQUFLQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQTtZQUM1QkEsSUFBSUEsU0FBU0EsR0FBR0EsVUFBVUEsQ0FBQ0EsS0FBS0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0E7WUFDdENBLElBQUlBLE9BQU9BLEdBQUdBLEtBQUtBLENBQUNBLE1BQU1BLENBQUNBLFVBQUNBLElBQUlBO2dCQUM5QkEsTUFBTUEsQ0FBQ0EsSUFBSUEsS0FBS0EsSUFBSUEsQ0FBQ0E7WUFDdkJBLENBQUNBLENBQUNBLENBQUNBO1lBQ0hBLEtBQUtBLEdBQUdBLEtBQUtBLENBQUNBLElBQUlBLENBQUNBLEtBQUtBLENBQUNBLE1BQU1BLEdBQUdB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LEVBQUVBLElBQUlBLFNBQVNBLENBQUNBO3dCQUN4Q0EsSUFBSUEsS0FBS0EsR0FBR0EsTUFBTUEsQ0FBQ0EsYUFBYUEsQ0FBQ0EsU0FBU0EsQ0FBQ0EsU0FBU0EsQ0FBQ0EsQ0FBQ0E7d0JBRXREQSxJQUFJQSxLQUFLQSxHQUFHQSxLQUFLQSxDQUFDQSxpQkFBaUJBLENBQUNBLFlBQVlBLEVBQUVBLFFBQVFBLENBQUNBLENBQUNBO3dCQUM1REEsSUFBSUEsR0FBR0EsR0FBR0EsWUFBWUEsQ0FBQ0E7d0JBQ3ZCQSxJQUFJQSxLQUFLQSxHQUFHQSxLQUFLQSxDQUFDQSxPQUFPQSxDQUFDQSxJQUFJQSxZQUFZQSxDQUFDQTt3QkFDM0NBLElBQUlBLElBQUlBLEdBQUdBLElBQUlBLE1BQU1BLENBQUNBLEtBQUtBLENBQUNBLENBQUNBO3dCQUM3QkEsSUFBSUEsQ0FBQ0EsR0FBR0EsR0FBR0EsUUFBUUEsR0FBR0EsR0FBR0EsR0FBR0EsR0FBR0EsQ0FBQ0E7d0JBQ2hDQSxJQUFJQSxDQUFDQSxHQUFHQSxHQUFHQSxHQUFHQSxDQUFDQTt3QkFDZkEsSUFBSUEsQ0FBQ0EsV0FBV0EsQ0FBQ0EsR0FBR0EsS0FBS0EsQ0FBQ0E7d0JBQzFCQSxJQUFJQSxPQUFPQSxHQUFHQSxLQUFLQSxDQUFDQSxTQUFTQSxDQUFDQSxJQUFJQSxLQUFLQSxDQUFDQSxhQUFhQSxDQUFDQSxJQUFJQSxLQUFLQSxDQUFDQTt3QkFDaEVBLElBQUlBLFFBQVFBLEdBQUdBLElBQUlBLENBQUNBLEdBQUdBLENBQUNBLEtBQUtBLENBQUNBLE1BQU1BLENBQUNBLElBQUlBLEtBQUtBLENBQUNBLFlBQVlBLENBQUNBLENBQUNBO3dCQUM3REEsSUFBSUEsQ0FBQ0EsSUFBSUEsR0FBR0EsUUFBUUEsQ0FBQ0E7d0JBQ3JCQSxJQUFJQSxDQUFDQSxPQUFPQSxHQUFHQSxPQUFPQSxDQUFDQTt3QkFFdkJBLEtBQUtBLENBQUNBLFFBQVFBLENBQUNBLElBQUlBLENBQUNBLElBQUlBLENBQUNBLENBQUNBO29CQUM1QkEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0JBQ0xBLENBQUNBO1lBQ0hBLENBQUNBLENBQUNBLENBQUNBO1lBQ0hBLE1BQU1BLENBQUNBLG9CQUFvQkEsR0FBR0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0E7WUFFdkNBLE1BQU1BLENBQUNBLE1BQU1BLENBQUNBLGdCQUFnQkEsRUFBRUE7Z0JBQzlCLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztvQkFDMUIsVUFBVSxDQUFDO3dCQUNULENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQztvQkFDdkIsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO2dCQUNULENBQUM7WUFDSCxDQUFDLENBQUNBLENBQUNBO1lBRUhBLE1BQU1BLENBQUNBLEdBQUdBLENBQUNBLHlCQUF5QkEsRUFBRUEsa0JBQWtCQSxDQUFDQSxDQUFDQTtZQUUxREEsTUFBTUEsQ0FBQ0EsY0FBY0EsR0FBR0EsVUFBQ0EsWUFBWUE7Z0JBQ25DQSxNQUFNQSxDQUFDQSxZQUFZQSxHQUFHQSxZQUFZQSxDQUFDQTtnQkFFbkNBLFlBQVlBLENBQUNBLElBQUlBLEdBQUdBLE1BQU1BLENBQUNBLGdCQUFnQkEsQ0FBQ0E7WUFDOUNBLENBQUNBLENBQUNBO1lBRUZBLE1BQU1BLENBQUNBLE9BQU9BLEdBQUdBO2dCQUNmQSxFQUFFQSxDQUFDQSxDQUFDQSxNQUFNQSxDQUFDQSxXQUFXQSxDQUFDQSxDQUFDQSxDQUFDQTtvQkFDdkJBLE1BQU1BLENBQUNBLFNBQVNBLENBQUNBLElBQUlBLEVBQUVBLENBQUNBO2dCQUMxQkEsQ0FBQ0E7Z0JBQUNBLElBQUlBLENBQUNBLENBQUNBO29CQUNOQSxVQUFVQSxDQUFDQSxVQUFVQSxDQUFDQSxDQUFDQTtnQkFDekJBLENBQUNBO1lBQ0hBLENBQUNBLENBQUNBO1lBRUZBLE1BQU1BLENBQUNBLGVBQWVBLEdBQUdBLFVBQUNBLElBQUlBO2dCQUM1QkEsTUFBTUEsQ0FBQ0EsbUJBQW1CQSxHQUFHQSxDQUFDQSxJQUFJQSxJQUFJQSxJQUFJQSxDQUFDQSxXQUFXQSxDQUFDQSxDQUFDQSxHQUFHQSxJQUFJQSxHQUFHQSxJQUFJQSxDQUFDQTtnQkFDdkVBLEVBQUVBLENBQUNBLENBQUNBLE1BQU1BLENBQUNBLG1CQUFtQkEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7b0JBQy9CQSxNQUFNQSxDQUFDQSxxQkFBcUJBLEdBQUdBLElBQUlBLENBQUNBO2dCQUN0Q0EsQ0FBQ0E7Z0JBQ0RBLFFBQUdBLENBQUNBLEtBQUtBLENBQUNBLFdBQVdBLEdBQUdBLE1BQU1BLENBQUNBLG1CQUFtQkEsR0FBR0EsS0FBS0EsR0FBR0EsTUFBTUEsQ0FBQ0EscUJBQXFCQSxDQUFDQSxDQUFDQTtZQUM3RkEsQ0FBQ0EsQ0FBQ0E7WUFFRkEsTUFBTUEsQ0FBQ0EsaUJBQWlCQSxHQUFHQSxVQUFDQSxJQUFJQTtnQkFDOUJBLE1BQU1BLENBQUNBLHFCQUFxQkEsR0FBR0EsQ0FBQ0EsSUFBSUEsSUFBSUEsSUFBSUEsQ0FBQ0EsV0FBV0EsQ0FBQ0EsQ0FBQ0EsR0FBR0EsSUFBSUEsR0FBR0EsSUFBSUEsQ0FBQ0E7Z0JBQ3pFQSxFQUFFQSxDQUFDQSxDQUFDQSxNQUFNQSxDQUFDQSxxQkFBcUJBLENBQUNBLENBQUNBLENBQUNBO29CQUNqQ0EsTUFBTUEsQ0FBQ0EsbUJBQW1CQSxHQUFHQSxJQUFJQSxDQUFDQTtvQkFDbENBLElBQUlBLFFBQVFBLEdBQUdBLElBQUlBLENBQUNBLEdBQUdBLENBQUNBO29CQUN4QkEsUUFBR0EsQ0FBQ0EsS0FBS0EsQ0FBQ0EsbUNBQW1DQSxHQUFHQSxRQUFRQSxDQUFDQSxDQUFDQTtvQkFDMURBLE1BQU1BLENBQUNBLGtCQUFrQkEsQ0FBQ0EsUUFBUUEsQ0FBQ0EsQ0FBQ0E7b0JBQ3BDQSxNQUFNQSxDQUFDQSxxQkFBcUJBLEdBQUdBLFFBQVFBLENBQUNBO2dCQUMxQ0EsQ0FBQ0E7Z0JBQ0RBLFFBQUdBLENBQUNBLEtBQUtBLENBQUNBLFdBQVdBLEdBQUdBLE1BQU1BLENBQUNBLG1CQUFtQkEsR0FBR0EsS0FBS0EsR0FBR0EsTUFBTUEsQ0FBQ0EscUJBQXFCQSxDQUFDQSxDQUFDQTtZQUM3RkEsQ0FBQ0EsQ0FBQ0E7WUFFRkEsTUFBTUEsQ0FBQ0EsaUJBQWlCQSxHQUFHQTtnQkFDekJBLElBQUlBLFNBQVNBLEdBQUdBLElBQUlBLENBQUNBO2dCQUNyQkEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsbUJBQW1CQSxDQUFDQSxDQUFDQSxDQUFDQTtvQkFDL0JBLFNBQVNBLEdBQUdBLE1BQU1BLENBQUNBLG1CQUFtQkEsQ0FBQ0EsV0FBV0EsQ0FBQ0EsQ0FBQ0E7b0JBQ3BEQSxNQUFNQSxDQUFDQSxjQUFjQSxHQUFHQSxJQUFJQSxDQUFDQTtnQkFDL0JBLENBQUNBO2dCQUFDQSxJQUFJQSxDQUFDQSxFQUFFQSxDQUFDQSxDQUFDQSxNQUFNQSxDQUFDQSxxQkFBcUJBLENBQUNBLENBQUNBLENBQUNBO29CQUd4Q0EsSUFBSUEsY0FBY0EsR0FBR0EsTUFBTUEsQ0FBQ0EscUJBQXFCQSxDQUFDQSxXQUFXQSxDQUFDQSxDQUFDQTtvQkFDL0RBLElBQUlBLGNBQWNBLEdBQUdBLE1BQU1BLENBQUNBLGNBQWNBLENBQUNBO29CQUMzQ0EsU0FBU0EsR0FBR0EsTUFBTUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsV0FBV0EsQ0FBQ0EsUUFBUUEsQ0FBQ0E7b0JBQy9DQSxNQUFNQSxDQUFDQSxjQUFjQSxHQUFHQTt3QkFDdEJBLEdBQUdBLEVBQUVBLE1BQU1BLENBQUNBLHFCQUFxQkEsQ0FBQ0EsR0FBR0E7d0JBQ3JDQSxNQUFNQSxFQUFFQSxjQUFjQTt3QkFDdEJBLE9BQU9BLEVBQUVBLGNBQWNBO3FCQUN4QkEsQ0FBQ0E7Z0JBQ0pBLENBQUNBO2dCQUNEQSxNQUFNQSxDQUFDQSxTQUFTQSxDQUFDQTtZQUNuQkEsQ0FBQ0EsQ0FBQ0E7WUFFRkEsTUFBTUEsQ0FBQ0EsaUJBQWlCQSxHQUFHQTtnQkFDekJBLElBQUlBLFNBQVNBLEdBQUdBLE1BQU1BLENBQUNBLGlCQUFpQkEsRUFBRUEsQ0FBQ0E7Z0JBQzNDQSxFQUFFQSxDQUFDQSxDQUFDQSxTQUFTQSxDQUFDQSxDQUFDQSxDQUFDQTtvQkFDZEEsVUFBVUEsQ0FBQ0EsU0FBU0EsQ0FBQ0EsQ0FBQ0E7Z0JBQ3hCQSxDQUFDQTtnQkFBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0E7b0JBQ05BLFFBQUdBLENBQUNBLEtBQUtBLENBQUNBLHdCQUF3QkEsQ0FBQ0EsQ0FBQ0E7Z0JBQ3RDQSxDQUFDQTtnQkFDREEsTUFBTUEsQ0FBQ0EsU0FBU0EsQ0FBQ0EsS0FBS0EsRUFBRUEsQ0FBQ0E7WUFDM0JBLENBQUNBLENBQUNBO1lBRUZBLE1BQU1BLENBQUNBLFVBQVVBLEdBQUdBO2dCQUNsQkEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsY0FBY0EsSUFBSUEsTUFBTUEsQ0FBQ0EsUUFBUUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7b0JBQzdDQSxNQUFNQSxDQUFDQSxjQUFjQSxDQUFDQSxNQUFNQSxFQUFFQSxDQUFDQTtvQkFDL0JBLE1BQU1BLENBQUNBLFFBQVFBLENBQUNBLE1BQU1BLEVBQUVBLENBQUNBO29CQUN6QkEsTUFBTUEsQ0FBQ0EsY0FBY0EsR0FBR0EsSUFBSUEsQ0FBQ0E7b0JBQzdCQSxNQUFNQSxDQUFDQSxRQUFRQSxHQUFHQSxJQUFJQSxDQUFDQTtnQkFDekJBLENBQUNBO1lBQ0hBLENBQUNBLENBQUNBO1lBRUZBLE1BQU1BLENBQUNBLFNBQVNBLEdBQUdBO2dCQUNqQkEsTUFBTUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsY0FBY0EsR0FBR0EsSUFBSUEsR0FBR0EsS0FBS0EsQ0FBQ0E7WUFDOUNBLENBQUNBLENBQUNBO1lBRUZBLE1BQU1BLENBQUNBLFFBQVFBLEdBQUdBLFVBQUNBLEdBQUdBO2dCQUNwQkEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsT0FBT0EsQ0FBQ0EsUUFBUUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0E7b0JBQ3hCQSxNQUFNQSxDQUFDQSxTQUFTQSxDQUFDQSxZQUFZQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQTtnQkFDckNBLElBQUlBLEVBQUVBLEdBQUdBLEdBQUdBLENBQUNBLFFBQVFBLENBQUNBO2dCQUN0QkEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsRUFBRUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7b0JBQ1BBLE1BQU1BLENBQUNBLEVBQUVBLENBQUNBLFNBQVNBLENBQUNBLENBQUNBO2dCQUN2QkEsQ0FBQ0E7Z0JBQ0RBLE1BQU1BLENBQUNBLFNBQVNBLENBQUNBLFlBQVlBLENBQUNBLEdBQUdBLENBQUNBLElBQUlBLEVBQUVBLENBQUNBLENBQUNBO1lBQzVDQSxDQUFDQSxDQUFDQTtZQUVGQSxNQUFNQSxDQUFDQSxJQUFJQSxHQUFHQTtnQkFFWkEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsUUFBUUEsSUFBSUEsTUFBTUEsQ0FBQ0EsWUFBWUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7b0JBQzNDQSxJQUFJQSxPQUFPQSxHQUFHQSxLQUFLQSxDQUFDQSxxQkFBcUJBLENBQUNBLE1BQU1BLENBQUNBLFlBQVlBLENBQUNBLENBQUNBO29CQUMvREEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsT0FBT0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7d0JBQ1pBLElBQUlBLElBQUlBLEdBQUdBLElBQUlBLENBQUNBLGVBQWVBLENBQUNBLE9BQU9BLENBQUNBLENBQUNBO3dCQUN6Q0EsRUFBRUEsQ0FBQ0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7NEJBRVRBLElBQUlBLGFBQWFBLEdBQUdBLE1BQU1BLENBQUNBLGFBQWFBLElBQUlBLGVBQWVBLEdBQUdBLE1BQU1BLENBQUNBLE1BQU1BLENBQUNBOzRCQUM1RUEsY0FBY0EsQ0FBQ0EsT0FBT0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsTUFBTUEsRUFBRUEsTUFBTUEsQ0FBQ0EsTUFBTUEsRUFBRUEsSUFBSUEsRUFBRUEsYUFBYUEsRUFBRUEsVUFBQ0EsTUFBTUE7Z0NBQy9FQSxJQUFJQSxDQUFDQSxVQUFVQSxDQUFDQSxNQUFNQSxDQUFDQSxDQUFDQTtnQ0FDeEJBLElBQUlBLENBQUNBLFlBQVlBLENBQUNBLFNBQVNBLEVBQUVBLFFBQVFBLEdBQUdBLE1BQU1BLENBQUNBLE1BQU1BLENBQUNBLENBQUNBO2dDQUN2REEsTUFBTUEsQ0FBQ0EsUUFBUUEsR0FBR0EsS0FBS0EsQ0FBQ0E7Z0NBQ3hCQSxRQUFRQSxFQUFFQSxDQUFDQTtnQ0FDWEEsSUFBSUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0E7NEJBQ3RCQSxDQUFDQSxDQUFDQSxDQUFDQTt3QkFDTEEsQ0FBQ0E7b0JBQ0hBLENBQUNBO2dCQUNIQSxDQUFDQTtZQUNIQSxDQUFDQSxDQUFDQTtZQUVGQSxNQUFNQSxDQUFDQSxNQUFNQSxHQUFHQTtnQkFDZEEsUUFBR0EsQ0FBQ0EsS0FBS0EsQ0FBQ0EsZUFBZUEsQ0FBQ0EsQ0FBQ0E7WUFFN0JBLENBQUNBLENBQUNBO1lBRUZBLE1BQU1BLENBQUNBLE1BQU1BLENBQUNBLGdCQUFnQkEsRUFBRUE7Z0JBQzlCLEVBQUUsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7b0JBR2hCLFVBQVUsQ0FBQyxVQUFVLEVBQUUsRUFBRSxDQUFDLENBQUM7Z0JBQzdCLENBQUM7WUFDSCxDQUFDLENBQUNBLENBQUNBO1lBRUhBLE1BQU1BLENBQUNBLEdBQUdBLENBQUNBLHFCQUFxQkEsRUFBRUEsVUFBVUEsS0FBS0EsRUFBRUEsT0FBT0EsRUFBRUEsUUFBUUE7Z0JBRWxFLFVBQVUsQ0FBQyxVQUFVLEVBQUUsRUFBRSxDQUFDLENBQUM7WUFDN0IsQ0FBQyxDQUFDQSxDQUFDQTtZQUVIQSwwQkFBMEJBLFFBQVFBO2dCQUNoQ21DLElBQUlBLFlBQVlBLEdBQUdBLEtBQUtBLENBQUNBLG1CQUFtQkEsQ0FBQ0EsUUFBUUEsRUFBRUEsSUFBSUEsQ0FBQ0EsQ0FBQ0E7Z0JBQzdEQSxFQUFFQSxDQUFDQSxDQUFDQSxZQUFZQSxDQUFDQSxDQUFDQSxDQUFDQTtvQkFDakJBLE1BQU1BLENBQUNBLFdBQVdBLEdBQUdBLFlBQVlBLENBQUNBO2dCQUNwQ0EsQ0FBQ0E7Z0JBQ0RBLE1BQU1BLENBQUNBLFlBQVlBLENBQUNBO1lBQ3RCQSxDQUFDQTtZQUVEbkMsTUFBTUEsQ0FBQ0EsWUFBWUEsR0FBR0EsVUFBQ0EsTUFBTUEsRUFBRUEsUUFBUUE7Z0JBQ3JDQSxNQUFNQSxDQUFDQSxjQUFjQSxHQUFHQSxNQUFNQSxDQUFDQTtnQkFDL0JBLE1BQU1BLENBQUNBLFFBQVFBLEdBQUdBLFFBQVFBLENBQUNBO2dCQUMzQkEsTUFBTUEsQ0FBQ0Esa0JBQWtCQSxHQUFHQSxJQUFJQSxDQUFDQTtnQkFDakNBLE1BQU1BLENBQUNBLGVBQWVBLEdBQUdBLElBQUlBLENBQUNBO2dCQUM5QkEsTUFBTUEsQ0FBQ0EsV0FBV0EsR0FBR0EsSUFBSUEsQ0FBQ0E7Z0JBQzFCQSxFQUFFQSxDQUFDQSxDQUFDQSxNQUFNQSxDQUFDQSxDQUFDQSxDQUFDQTtvQkFDWEEsTUFBTUEsQ0FBQ0EsUUFBUUEsR0FBR0EsS0FBS0EsQ0FBQ0Esa0JBQWtCQSxDQUFDQSxNQUFNQSxDQUFDQSxDQUFDQTtvQkFDbkRBLE1BQU1BLENBQUNBLHFCQUFxQkEsR0FBR0EsRUFBRUEsQ0FBQ0E7Z0JBQ3BDQSxDQUFDQTtnQkFDREEsSUFBSUEsUUFBUUEsR0FBR0EsS0FBS0EsQ0FBQ0Esb0JBQW9CQSxDQUFDQSxNQUFNQSxDQUFDQSxDQUFDQTtnQkFFbERBLElBQUlBLFlBQVlBLEdBQUdBLGdCQUFnQkEsQ0FBQ0EsUUFBUUEsQ0FBQ0EsQ0FBQ0E7Z0JBQzlDQSxFQUFFQSxDQUFDQSxDQUFDQSxRQUFRQSxDQUFDQSxDQUFDQSxDQUFDQTtvQkFFYkEsTUFBTUEsQ0FBQ0EsU0FBU0EsR0FBR0EsS0FBS0EsQ0FBQ0EsY0FBY0EsQ0FBQ0EsUUFBUUEsQ0FBQ0EsQ0FBQ0E7b0JBQ2xEQSxFQUFFQSxDQUFDQSxDQUFDQSxNQUFNQSxDQUFDQSxTQUFTQSxDQUFDQSxDQUFDQSxDQUFDQTt3QkFDckJBLE1BQU1BLENBQUNBLGtCQUFrQkEsR0FBR0EsNENBQTRDQSxDQUFDQTtvQkFDM0VBLENBQUNBO29CQUNEQSxNQUFNQSxDQUFDQSxlQUFlQSxHQUFHQSw0QkFBNEJBLENBQUNBO29CQUN0REEsSUFBSUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0E7Z0JBQ3RCQSxDQUFDQTtZQUNIQSxDQUFDQSxDQUFDQTtZQUVGQSxNQUFNQSxDQUFDQSxlQUFlQSxHQUFHQSxVQUFDQSxJQUFJQSxFQUFFQSxVQUFVQTtnQkFDeENBLElBQUlBLFVBQVVBLEdBQUdBLElBQUlBLENBQUNBLElBQUlBLENBQUNBO2dCQUMzQkEsSUFBSUEsWUFBWUEsR0FBR0EsVUFBVUEsQ0FBQ0EsSUFBSUEsQ0FBQ0E7Z0JBQ25DQSxFQUFFQSxDQUFDQSxDQUFDQSxVQUFVQSxJQUFJQSxZQUFZQSxDQUFDQSxDQUFDQSxDQUFDQTtvQkFDL0JBLElBQUlBLE1BQU1BLEdBQUdBLEtBQUtBLENBQUNBLG9CQUFvQkEsQ0FBQ0EsVUFBVUEsQ0FBQ0EsQ0FBQ0E7b0JBQ3BEQSxJQUFJQSxRQUFRQSxHQUFHQSxLQUFLQSxDQUFDQSxvQkFBb0JBLENBQUNBLFlBQVlBLENBQUNBLENBQUNBO29CQUN4REEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsTUFBTUEsSUFBSUEsUUFBUUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7d0JBRXZCQSxFQUFFQSxDQUFDQSxDQUFDQSxRQUFRQSxLQUFLQSxPQUFPQSxDQUFDQSxDQUFDQSxDQUFDQTs0QkFDekJBLE1BQU1BLENBQUNBLE1BQU1BLEtBQUtBLE9BQU9BLENBQUNBO3dCQUM1QkEsQ0FBQ0E7d0JBQ0RBLE1BQU1BLENBQUNBLElBQUlBLENBQUNBO29CQUNkQSxDQUFDQTtnQkFDSEEsQ0FBQ0E7Z0JBQ0RBLE1BQU1BLENBQUNBLEtBQUtBLENBQUNBO1lBQ2ZBLENBQUNBLENBQUNBO1lBRUZBLE1BQU1BLENBQUNBLFVBQVVBLEdBQUdBLFVBQUNBLElBQUlBLEVBQUVBLFVBQVVBLEVBQUVBLE9BQU9BLEVBQUVBLEVBQUVBLEVBQUVBLFNBQVNBO2dCQUMzREEsSUFBSUEsVUFBVUEsR0FBR0EsSUFBSUEsQ0FBQ0EsSUFBSUEsQ0FBQ0E7Z0JBQzNCQSxJQUFJQSxZQUFZQSxHQUFHQSxVQUFVQSxDQUFDQSxJQUFJQSxDQUFDQTtnQkFDbkNBLEVBQUVBLENBQUNBLENBQUNBLFVBQVVBLElBQUlBLFlBQVlBLENBQUNBLENBQUNBLENBQUNBO29CQUUvQkEsSUFBSUEsTUFBTUEsR0FBR0EsS0FBS0EsQ0FBQ0Esb0JBQW9CQSxDQUFDQSxVQUFVQSxDQUFDQSxDQUFDQTtvQkFDcERBLElBQUlBLFFBQVFBLEdBQUdBLEtBQUtBLENBQUNBLG9CQUFvQkEsQ0FBQ0EsWUFBWUEsQ0FBQ0EsQ0FBQ0E7b0JBRXhEQSxFQUFFQSxDQUFDQSxDQUFDQSxNQUFNQSxLQUFLQSxPQUFPQSxDQUFDQSxDQUFDQSxDQUFDQTt3QkFFdkJBLEVBQUVBLENBQUNBLENBQUNBLFFBQVFBLEtBQUtBLE9BQU9BLENBQUNBLENBQUNBLENBQUNBOzRCQUN6QkEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsT0FBT0EsS0FBS0EsTUFBTUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0NBQ3ZCQSxPQUFPQSxHQUFHQSxPQUFPQSxDQUFDQTs0QkFDcEJBLENBQUNBO3dCQUNIQSxDQUFDQTt3QkFBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0E7NEJBRU5BLE9BQU9BLEdBQUdBLE1BQU1BLENBQUNBO3dCQUNuQkEsQ0FBQ0E7b0JBQ0hBLENBQUNBO29CQUNEQSxJQUFJQSxDQUFDQSxDQUFDQTt3QkFDSkEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsS0FBS0EsQ0FBQ0EsWUFBWUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7NEJBQy9CQSxPQUFPQSxHQUFHQSxNQUFNQSxDQUFDQTt3QkFDbkJBLENBQUNBO3dCQUFDQSxJQUFJQSxDQUFDQSxDQUFDQTs0QkFDTkEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsT0FBT0EsS0FBS0EsUUFBUUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0NBQ3pCQSxPQUFPQSxHQUFHQSxPQUFPQSxDQUFDQTs0QkFDcEJBLENBQUNBO3dCQUNIQSxDQUFDQTtvQkFDSEEsQ0FBQ0E7b0JBQ0RBLFFBQUdBLENBQUNBLEtBQUtBLENBQUNBLG1CQUFtQkEsR0FBR0EsTUFBTUEsR0FBR0EsYUFBYUEsR0FBR0EsUUFBUUEsR0FBR0EsWUFBWUEsR0FBR0EsT0FBT0EsQ0FBQ0EsQ0FBQ0E7b0JBRTVGQSxVQUFVQSxDQUFDQSxJQUFJQSxDQUFDQSxJQUFJQSxFQUFFQSxPQUFPQSxDQUFDQSxDQUFDQTtnQkFDakNBLENBQUNBO1lBQ0hBLENBQUNBLENBQUNBO1lBR0ZBLFVBQVVBLEVBQUVBLENBQUNBO1lBRWJBLG9CQUFvQkEsU0FBU0E7Z0JBQzNCb0MsSUFBSUEsR0FBR0EsR0FBR0EsTUFBTUEsQ0FBQ0EsR0FBR0EsSUFBSUEsUUFBUUEsQ0FBQ0E7Z0JBQ2pDQSxJQUFJQSxZQUFZQSxHQUFHQSxNQUFNQSxDQUFDQSxjQUFjQSxJQUFJQSxNQUFNQSxDQUFDQSxnQkFBZ0JBLENBQUNBO2dCQUNwRUEsSUFBSUEsR0FBR0EsR0FBR0EsU0FBU0EsQ0FBQ0EsS0FBS0EsQ0FBQ0EsQ0FBQ0E7Z0JBQzNCQSxJQUFJQSxVQUFVQSxHQUFHQSxJQUFJQSxDQUFDQTtnQkFDdEJBLEVBQUVBLENBQUNBLENBQUNBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLENBQUNBO29CQUNUQSxRQUFHQSxDQUFDQSxLQUFLQSxDQUFDQSwyQkFBMkJBLEdBQUdBLElBQUlBLENBQUNBLFNBQVNBLENBQUNBLFNBQVNBLENBQUNBLENBQUNBLENBQUNBO2dCQUNyRUEsQ0FBQ0E7Z0JBQUNBLElBQUlBLENBQUNBLENBQUNBO29CQUNOQSxJQUFJQSxRQUFRQSxHQUFHQSxNQUFNQSxDQUFDQSxRQUFRQSxDQUFDQTtvQkFDL0JBLEVBQUVBLENBQUNBLENBQUNBLEdBQUdBLEtBQUtBLE9BQU9BLENBQUNBLENBQUNBLENBQUNBO3dCQUVwQkEsUUFBUUEsR0FBR0EsTUFBTUEsQ0FBQ0EsWUFBWUEsQ0FBQ0E7b0JBQ2pDQSxDQUFDQTtvQkFBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0E7d0JBQ05BLEVBQUVBLENBQUNBLENBQUNBLENBQUNBLFFBQVFBLENBQUNBLENBQUNBLENBQUNBOzRCQUVkQSxJQUFJQSxJQUFJQSxHQUFHQSxNQUFNQSxDQUFDQSxZQUFZQSxDQUFDQTs0QkFDL0JBLElBQUlBLFFBQVFBLEdBQUdBLElBQUlBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBOzRCQUNsQ0EsRUFBRUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsUUFBUUEsSUFBSUEsQ0FBQ0EsUUFBUUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0NBQ2xDQSxVQUFVQSxDQUFDQSxLQUFLQSxDQUFDQSxjQUFjQSxDQUFDQSxPQUFPQSxDQUFDQSxDQUFDQSxDQUFDQTtnQ0FDMUNBLFFBQVFBLEdBQUdBLElBQUlBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBOzRCQUNoQ0EsQ0FBQ0E7NEJBQ0RBLEVBQUVBLENBQUNBLENBQUNBLFFBQVFBLElBQUlBLFFBQVFBLENBQUNBLE1BQU1BLENBQUNBLENBQUNBLENBQUNBO2dDQUNoQ0EsUUFBUUEsR0FBR0EsUUFBUUEsQ0FBQ0EsUUFBUUEsQ0FBQ0EsTUFBTUEsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7NEJBQzNDQSxDQUFDQTs0QkFBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0E7Z0NBQ05BLFFBQUdBLENBQUNBLEtBQUtBLENBQUNBLDhDQUE4Q0EsQ0FBQ0EsQ0FBQ0E7Z0NBQzFEQSxNQUFNQSxDQUFDQTs0QkFDVEEsQ0FBQ0E7d0JBQ0hBLENBQUNBO3dCQUtEQSxJQUFJQSxRQUFRQSxHQUFHQSxLQUFLQSxDQUFDQSxvQkFBb0JBLENBQUNBLFFBQVFBLENBQUNBLElBQUlBLENBQUNBLENBQUNBO3dCQUN6REEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsS0FBS0EsQ0FBQ0EsWUFBWUEsQ0FBQ0EsUUFBUUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7NEJBRWxDQSxVQUFVQSxHQUFHQSxRQUFRQSxDQUFDQSxjQUFjQSxFQUFFQSxDQUFDQTs0QkFDdkNBLFFBQVFBLEdBQUdBLFFBQVFBLENBQUNBLFNBQVNBLEVBQUVBLElBQUlBLFFBQVFBLENBQUNBO3dCQUM5Q0EsQ0FBQ0E7b0JBQ0hBLENBQUNBO29CQUNEQSxFQUFFQSxDQUFDQSxDQUFDQSxRQUFRQSxDQUFDQSxDQUFDQSxDQUFDQTt3QkFDYkEsSUFBSUEsSUFBSUEsR0FBR0EsR0FBR0EsQ0FBQ0EsYUFBYUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0E7d0JBQ2xDQSxZQUFZQSxHQUFHQSxRQUFRQSxDQUFDQSxJQUFJQSxDQUFDQTt3QkFDN0JBLElBQUlBLFNBQVNBLEdBQUdBLEtBQUtBLENBQUNBLGFBQWFBLENBQUNBLFlBQVlBLEVBQUVBLElBQUlBLENBQUNBLENBQUNBO3dCQUN4REEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsU0FBU0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7NEJBQ2RBLElBQUlBLEtBQUtBLEdBQUdBLFFBQVFBLENBQUNBLFFBQVFBLENBQUNBLFNBQVNBLEVBQUVBLFVBQVVBLENBQUNBLENBQUNBOzRCQUNyREEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsS0FBS0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0NBQ1ZBLGdCQUFnQkEsQ0FBQ0EsS0FBS0EsQ0FBQ0EsQ0FBQ0E7Z0NBQ3hCQSxLQUFLQSxDQUFDQSxNQUFNQSxDQUFDQSxJQUFJQSxDQUFDQSxDQUFDQTtnQ0FDbkJBLEtBQUtBLENBQUNBLE1BQU1BLENBQUNBLElBQUlBLENBQUNBLENBQUNBO2dDQUNuQkEsS0FBS0EsQ0FBQ0EsUUFBUUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0E7NEJBQ3ZCQSxDQUFDQTt3QkFDSEEsQ0FBQ0E7b0JBQ0hBLENBQUNBO2dCQUNIQSxDQUFDQTtZQUNIQSxDQUFDQTtZQUVEcEMsNEJBQTRCQSxLQUFLQSxFQUFFQSxJQUFJQTtnQkFHckNxQyxFQUFFQSxDQUFDQSxDQUFDQSxNQUFNQSxDQUFDQSxRQUFRQSxDQUFDQSxDQUFDQSxDQUFDQTtvQkFDcEJBLElBQUlBLFFBQVFBLEdBQUdBLE1BQU1BLENBQUNBLHFCQUFxQkEsQ0FBQ0E7b0JBQzVDQSxFQUFFQSxDQUFDQSxDQUFDQSxRQUFRQSxDQUFDQSxDQUFDQSxDQUFDQTt3QkFDYkEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsUUFBUUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7NEJBQ25CQSxpQkFBaUJBLEVBQUVBLENBQUNBO3dCQUN0QkEsQ0FBQ0E7d0JBQUNBLElBQUlBLENBQUNBLENBQUNBOzRCQUdOQSxRQUFRQSxDQUFDQSxJQUFJQSxDQUFDQSxHQUFHQSxJQUFJQSxDQUFDQTt3QkFDeEJBLENBQUNBO29CQUNIQSxDQUFDQTtnQkFDSEEsQ0FBQ0E7WUFDSEEsQ0FBQ0E7WUFFRHJDO2dCQUNFc0MsTUFBTUEsQ0FBQ0EsUUFBUUEsR0FBR0EsSUFBSUEsQ0FBQ0E7Z0JBQ3ZCQSxJQUFJQSxjQUFjQSxHQUFHQSxNQUFNQSxDQUFDQSxjQUFjQSxDQUFDQTtnQkFDM0NBLEVBQUVBLENBQUNBLENBQUNBLE1BQU1BLENBQUNBLFFBQVFBLElBQUlBLGNBQWNBLENBQUNBLENBQUNBLENBQUNBO29CQUN0Q0EsSUFBSUEsWUFBWUEsR0FBR0EsZ0JBQWdCQSxDQUFDQSxNQUFNQSxDQUFDQSxRQUFRQSxDQUFDQSxDQUFDQTtvQkFDckRBLEVBQUVBLENBQUNBLENBQUNBLFlBQVlBLENBQUNBLENBQUNBLENBQUNBO3dCQUNqQkEsSUFBSUEsUUFBUUEsR0FBR0EsWUFBWUEsQ0FBQ0EsU0FBU0EsQ0FBQ0E7d0JBQ3RDQSxJQUFJQSxZQUFZQSxHQUFHQSxLQUFLQSxDQUFDQSxjQUFjQSxDQUFDQSxRQUFRQSxDQUFDQSxDQUFDQTt3QkFDbERBLEVBQUVBLENBQUNBLENBQUNBLFlBQVlBLENBQUNBLENBQUNBLENBQUNBOzRCQUVqQkEsS0FBS0EsQ0FBQ0EsOEJBQThCQSxDQUFDQSxjQUFjQSxFQUFFQSxZQUFZQSxFQUFFQSxZQUFZQSxDQUFDQSxDQUFDQTs0QkFDakZBLE1BQU1BLENBQUNBLFFBQVFBLENBQUNBLE1BQU1BLENBQUNBLEtBQUtBLEVBQUVBLEtBQUtBLENBQUNBLENBQUNBO3dCQUN2Q0EsQ0FBQ0E7b0JBQ0hBLENBQUNBO29CQUVEQSxjQUFjQSxDQUFDQSxlQUFlQSxDQUFDQSxHQUFHQSxNQUFNQSxDQUFDQSxRQUFRQSxDQUFDQTtnQkFDcERBLENBQUNBO1lBQ0hBLENBQUNBO1lBRUR0QyxtQkFBbUJBLFFBQVFBO2dCQUN6QnVDLElBQUlBLElBQUlBLEdBQUdBLFFBQVFBLENBQUNBLElBQUlBLENBQUNBO2dCQUN6QkEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7b0JBRVRBLElBQUlBLElBQUlBLEdBQUdBLEtBQUtBLENBQUNBLGFBQWFBLENBQUNBLElBQUlBLEVBQUVBLE1BQU1BLENBQUNBLE1BQU1BLENBQUNBLENBQUNBO29CQUNwREEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7d0JBQ1RBLE1BQU1BLENBQUNBLGdCQUFnQkEsR0FBR0EsSUFBSUEsQ0FBQ0E7b0JBQ2pDQSxDQUFDQTtnQkFDSEEsQ0FBQ0E7Z0JBQUNBLElBQUlBLENBQUNBLENBQUNBO29CQUNOQSxRQUFHQSxDQUFDQSxLQUFLQSxDQUFDQSx3QkFBd0JBLEdBQUdBLE1BQU1BLENBQUNBLE1BQU1BLENBQUNBLENBQUNBO2dCQUN0REEsQ0FBQ0E7Z0JBQ0RBLElBQUlBLENBQUNBLFdBQVdBLENBQUNBLE1BQU1BLENBQUNBLENBQUNBO1lBQzNCQSxDQUFDQTtZQUVEdkM7Z0JBQ0V3QyxNQUFNQSxDQUFDQSxpQkFBaUJBLEVBQUVBLENBQUNBO2dCQUMzQkEsTUFBTUEsQ0FBQ0EsTUFBTUEsR0FBR0EsSUFBSUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsWUFBWUEsRUFBRUEsU0FBU0EsQ0FBQ0EsQ0FBQ0E7Z0JBQ3JEQSxRQUFHQSxDQUFDQSxLQUFLQSxDQUFDQSxlQUFlQSxHQUFHQSxNQUFNQSxDQUFDQSxNQUFNQSxHQUFHQSxxQkFBcUJBLEdBQUdBLElBQUlBLENBQUNBLFNBQVNBLENBQUNBLFlBQVlBLENBQUNBLENBQUNBLENBQUNBO2dCQUVsR0EsY0FBY0EsQ0FBQ0EsT0FBT0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsTUFBTUEsRUFBRUEsTUFBTUEsQ0FBQ0EsTUFBTUEsRUFBRUEsTUFBTUEsQ0FBQ0EsUUFBUUEsRUFBRUEsU0FBU0EsQ0FBQ0EsQ0FBQ0E7WUFDbkZBLENBQUNBO1lBR0R4QztZQVlBeUMsQ0FBQ0E7WUFFRHpDLE1BQU1BLENBQUNBLG9CQUFvQkEsR0FBR0E7Z0JBQzVCQSxJQUFJQSxJQUFJQSxHQUFHQSxTQUFTQSxDQUFDQSxHQUFHQSxFQUFFQSxDQUFDQSxPQUFPQSxDQUFDQSxnQkFBZ0JBLEVBQUVBLFVBQVVBLENBQUNBLENBQUNBO2dCQUNqRUEsUUFBR0EsQ0FBQ0EsS0FBS0EsQ0FBQ0EsUUFBUUEsRUFBRUEsSUFBSUEsQ0FBQ0EsQ0FBQ0E7Z0JBQzFCQSxTQUFTQSxDQUFDQSxHQUFHQSxDQUFDQSxJQUFJQSxDQUFDQSxDQUFDQTtZQUN0QkEsQ0FBQ0EsQ0FBQ0E7WUFFRkEsTUFBTUEsQ0FBQ0EseUJBQXlCQSxHQUFHQTtnQkFDakNBLEVBQUVBLENBQUNBLENBQUNBLE1BQU1BLENBQUNBLFFBQVFBLENBQUNBLENBQUNBLENBQUNBO29CQUNwQkEsTUFBTUEsQ0FBQ0Esa0JBQWtCQSxDQUFDQSxJQUFJQSxFQUFFQSxDQUFDQTtnQkFDbkNBLENBQUNBO2dCQUFDQSxJQUFJQSxDQUFDQSxDQUFDQTtvQkFDTkEsTUFBTUEsQ0FBQ0Esb0JBQW9CQSxFQUFFQSxDQUFDQTtnQkFDaENBLENBQUNBO1lBQ0hBLENBQUNBLENBQUNBO1FBRUpBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO0FBQ05BLENBQUNBLEVBcmVNLElBQUksS0FBSixJQUFJLFFBcWVWOztBQ3RlRCx1Q0FBdUM7QUFDdkMsSUFBTyxJQUFJLENBNHBCVjtBQTVwQkQsV0FBTyxJQUFJLEVBQUMsQ0FBQztJQUNBQSwwQkFBcUJBLEdBQUdBLFlBQU9BLENBQUNBLFVBQVVBLENBQUNBLDRCQUE0QkEsRUFBRUEsQ0FBQ0EsUUFBUUEsRUFBRUEsVUFBVUEsRUFBRUEsY0FBY0EsRUFBRUEsZ0JBQWdCQSxFQUFFQSxjQUFjQSxFQUFFQSxXQUFXQSxFQUFFQSxVQUFDQSxNQUFNQSxFQUFFQSxRQUFRQSxFQUFFQSxZQUFZQSxFQUFFQSxjQUFjQSxFQUFFQSxZQUFZQSxFQUFFQSxTQUFTQTtZQUNoUEEsSUFBSUEsZUFBZUEsR0FBR0EsT0FBT0EsQ0FBQ0EsV0FBV0EsRUFBRUEsQ0FBQ0E7WUFFNUNBLElBQUlBLENBQUNBLFNBQVNBLENBQUNBLE1BQU1BLEVBQUVBLFlBQVlBLEVBQUVBLFNBQVNBLENBQUNBLENBQUNBO1lBQ2hEQSxJQUFJQSxjQUFjQSxHQUFHQSxNQUFNQSxDQUFDQSxjQUFjQSxDQUFDQTtZQUUzQ0EsTUFBTUEsQ0FBQ0EsU0FBU0EsR0FBR0EsSUFBSUEsRUFBRUEsQ0FBQ0EsTUFBTUEsRUFBRUEsQ0FBQ0E7WUFDbkNBLE1BQU1BLENBQUNBLGdCQUFnQkEsR0FBR0EsSUFBSUEsRUFBRUEsQ0FBQ0EsTUFBTUEsRUFBRUEsQ0FBQ0E7WUFDMUNBLE1BQU1BLENBQUNBLGdCQUFnQkEsR0FBR0EsSUFBSUEsRUFBRUEsQ0FBQ0EsTUFBTUEsRUFBRUEsQ0FBQ0E7WUFDMUNBLE1BQU1BLENBQUNBLFFBQVFBLEdBQUdBLEtBQUtBLENBQUNBO1lBQ3hCQSxNQUFNQSxDQUFDQSxxQkFBcUJBLEdBQUdBLEtBQUtBLENBQUNBLGdCQUFnQkEsQ0FBQ0EsWUFBWUEsQ0FBQ0EsQ0FBQ0E7WUFDcEVBLE1BQU1BLENBQUNBLHNCQUFzQkEsR0FBR0EsS0FBS0EsQ0FBQ0EsaUJBQWlCQSxDQUFDQSxZQUFZQSxDQUFDQSxDQUFDQTtZQUN0RUEsTUFBTUEsQ0FBQ0Esa0NBQWtDQSxHQUFHQSxLQUFLQSxDQUFDQSw2QkFBNkJBLENBQUNBLFlBQVlBLENBQUNBLENBQUNBO1lBRTlGQSxNQUFNQSxDQUFDQSxLQUFLQSxHQUFHQSxFQUFFQSxDQUFDQTtZQUVsQkEsTUFBTUEsQ0FBQ0EsWUFBWUEsR0FBR0EsWUFBWUEsQ0FBQ0EsY0FBY0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsY0FBY0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7WUFFdkVBLE1BQU1BLENBQUNBLE1BQU1BLENBQUNBLGtCQUFrQkEsRUFBRUE7Z0JBQ2hDQSxJQUFJQSxJQUFJQSxHQUFHQSxNQUFNQSxDQUFDQSxnQkFBZ0JBLENBQUNBO2dCQUNuQ0EsTUFBTUEsQ0FBQ0EsVUFBVUEsR0FBR0EsSUFBSUEsQ0FBQ0E7Z0JBRXpCQSxNQUFNQSxDQUFDQSxPQUFPQSxHQUFHQSxLQUFLQSxDQUFDQSxpQkFBaUJBLENBQUNBLE1BQU1BLENBQUNBLFVBQVVBLENBQUNBLENBQUNBO2dCQUU1REEsSUFBSUEsR0FBR0EsR0FBR0EsSUFBSUEsQ0FBQ0EsT0FBT0EsQ0FBQ0EsSUFBSUEsRUFBRUEsQ0FBQ0EsYUFBYUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0JBQzlDQSxFQUFFQSxDQUFDQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFDQTtvQkFDUkEsTUFBTUEsQ0FBQ0EsR0FBR0EsR0FBR0EsR0FBR0EsQ0FBQ0E7b0JBQ2pCQSxjQUFjQSxFQUFFQSxDQUFDQTtvQkFDakJBLHVCQUF1QkEsRUFBRUEsQ0FBQ0E7Z0JBQzVCQSxDQUFDQTtZQUNIQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUVIQSxNQUFNQSxDQUFDQSxpQkFBaUJBLEdBQUdBO2dCQUN6QkEsSUFBSUEsU0FBU0EsR0FBR0EsTUFBTUEsQ0FBQ0EsaUJBQWlCQSxFQUFFQSxDQUFDQTtnQkFDM0NBLEVBQUVBLENBQUNBLENBQUNBLFNBQVNBLENBQUNBLENBQUNBLENBQUNBO29CQUNkQSxVQUFVQSxDQUFDQSxTQUFTQSxDQUFDQSxDQUFDQTtnQkFDeEJBLENBQUNBO2dCQUNEQSxNQUFNQSxDQUFDQSxTQUFTQSxDQUFDQSxLQUFLQSxFQUFFQSxDQUFDQTtZQUMzQkEsQ0FBQ0EsQ0FBQ0E7WUFFRkEsTUFBTUEsQ0FBQ0EsVUFBVUEsR0FBR0E7Z0JBQ2xCQSxJQUFJQSxNQUFNQSxHQUFHQSx3QkFBd0JBLEVBQUVBLENBQUNBO2dCQUN4Q0EsRUFBRUEsQ0FBQ0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7b0JBQ1hBLElBQUlBLFFBQVFBLEdBQUdBLEtBQUtBLENBQUNBLG9CQUFvQkEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0E7b0JBQ2xEQSxNQUFNQSxDQUFDQSxNQUFNQSxFQUFFQSxDQUFDQTtvQkFDaEJBLEVBQUVBLENBQUNBLENBQUNBLE9BQU9BLEtBQUtBLFFBQVFBLENBQUNBLENBQUNBLENBQUNBO3dCQUV6QkEsTUFBTUEsQ0FBQ0EsZUFBZUEsR0FBR0EsSUFBSUEsQ0FBQ0E7b0JBQ2hDQSxDQUFDQTtvQkFDREEsZUFBZUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0E7b0JBQ3RCQSxZQUFZQSxFQUFFQSxDQUFDQTtnQkFDakJBLENBQUNBO1lBQ0hBLENBQUNBLENBQUNBO1lBRUZBLE1BQU1BLENBQUNBLFFBQVFBLEdBQUdBO2dCQUNoQkEsTUFBTUEsQ0FBQ0EsWUFBWUEsR0FBR0EsSUFBSUEsQ0FBQ0E7Z0JBQzNCQSx1QkFBdUJBLEVBQUVBLENBQUNBO1lBQzVCQSxDQUFDQSxDQUFDQTtZQUVGQTtnQkFDRTBDLE1BQU1BLENBQUNBLENBQUNBLE1BQU1BLENBQUNBLGNBQWNBLENBQUFBO1lBQy9CQSxDQUFDQTtZQUVEMUMsTUFBTUEsQ0FBQ0EsY0FBY0EsR0FBR0E7Z0JBQ3RCQSxFQUFFQSxDQUFDQSxDQUFDQSxhQUFhQSxFQUFFQSxDQUFDQSxDQUFDQSxDQUFDQTtvQkFDcEJBLE1BQU1BLENBQUNBLG1CQUFtQkEsQ0FBQ0E7Z0JBQzdCQSxDQUFDQTtnQkFDREEsTUFBTUEsQ0FBQ0Esa0JBQWtCQSxDQUFDQTtZQUM1QkEsQ0FBQ0EsQ0FBQUE7WUFFREEsTUFBTUEsQ0FBQ0EsZUFBZUEsR0FBR0E7Z0JBQ3ZCQSxFQUFFQSxDQUFDQSxDQUFDQSxhQUFhQSxFQUFFQSxDQUFDQSxDQUFDQSxDQUFDQTtvQkFDcEJBLE1BQU1BLENBQUNBLE9BQU9BLENBQUNBO2dCQUNqQkEsQ0FBQ0E7Z0JBQ0RBLE1BQU1BLENBQUNBLE1BQU1BLENBQUNBO1lBQ2hCQSxDQUFDQSxDQUFBQTtZQUVEQSxNQUFNQSxDQUFDQSxXQUFXQSxHQUFHQTtnQkFDbkJBLFFBQUdBLENBQUNBLEtBQUtBLENBQUNBLGdCQUFnQkEsRUFBRUEsTUFBTUEsQ0FBQ0EsWUFBWUEsQ0FBQ0EsQ0FBQ0E7Z0JBQ2pEQSxFQUFFQSxDQUFDQSxDQUFDQSxNQUFNQSxDQUFDQSxZQUFZQSxDQUFDQSxNQUFNQSxDQUFDQSxDQUFDQSxDQUFDQTtvQkFDL0JBLE1BQU1BLENBQUNBLElBQUlBLENBQUNBO2dCQUNkQSxDQUFDQTtnQkFDREEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsS0FBS0EsQ0FBQ0EsWUFBWUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7b0JBQ2hDQSxNQUFNQSxDQUFDQSxLQUFLQSxDQUFDQTtnQkFDZkEsQ0FBQ0E7Z0JBQUNBLElBQUlBLENBQUNBLENBQUNBO29CQUNOQSxNQUFNQSxDQUFDQSxNQUFNQSxDQUFDQSxLQUFLQSxDQUFDQSxZQUFZQSxDQUFDQSxDQUFDQSxRQUFRQSxDQUFDQSxDQUFDQTtnQkFDOUNBLENBQUNBO1lBQ0hBLENBQUNBLENBQUNBO1lBV0ZBLDJCQUEyQkEsY0FBcUJBLEVBQUVBLFdBQWtCQSxFQUFFQSxZQUFtQkEsRUFBRUEsa0JBQXNCQTtnQkFDL0cyQyxRQUFHQSxDQUFDQSxLQUFLQSxDQUFDQSxTQUFTQSxHQUFHQSxjQUFjQSxHQUFHQSxRQUFRQSxHQUFHQSxZQUFZQSxHQUFHQSxjQUFjQSxHQUFHQSxrQkFBa0JBLENBQUNBLENBQUNBO2dCQUd0R0EsSUFBSUEsR0FBR0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsY0FBY0EsQ0FBQ0EsR0FBR0EsY0FBY0EsR0FBR0EsR0FBR0EsR0FBR0EsV0FBV0EsR0FBR0EsRUFBRUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsWUFBWUEsR0FBR0EsWUFBWUEsR0FBR0EsRUFBRUEsQ0FBQ0EsQ0FBQ0E7Z0JBQzVHQSxJQUFJQSxTQUFTQSxHQUFHQSxJQUFJQSxDQUFDQSxZQUFZQSxDQUFDQSxrQkFBa0JBLENBQUNBLENBQUNBO2dCQUN0REEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsU0FBU0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7b0JBQ2RBLEdBQUdBLElBQUlBLEdBQUdBLEdBQUdBLFNBQVNBLENBQUNBO2dCQUN6QkEsQ0FBQ0E7Z0JBQ0RBLE1BQU1BLENBQUNBLEdBQUdBLENBQUNBO1lBQ2JBLENBQUNBO1lBRUQzQyxNQUFNQSxDQUFDQSxnQkFBZ0JBLEdBQUdBO2dCQUN4QkEsUUFBR0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsYUFBYUEsR0FBR0EsTUFBTUEsQ0FBQ0EsUUFBUUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0E7Z0JBQzlDQSxJQUFJQSxHQUFHQSxHQUFHQSxpQkFBaUJBLENBQUNBLE1BQU1BLENBQUNBLGNBQWNBLEVBQUVBLENBQUNBLE1BQU1BLENBQUNBLHNCQUFzQkEsR0FBR0EsSUFBSUEsR0FBR0EsRUFBRUEsQ0FBQ0EsRUFBRUEsTUFBTUEsQ0FBQ0EsWUFBWUEsRUFBRUEsTUFBTUEsQ0FBQ0Esa0JBQWtCQSxDQUFDQSxDQUFDQTtnQkFDaEpBLFFBQUdBLENBQUNBLElBQUlBLENBQUNBLGFBQWFBLEdBQUdBLEdBQUdBLENBQUNBLENBQUNBO2dCQUM5QkEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7b0JBQ1JBLE1BQU1BLENBQUNBLFFBQVFBLENBQUNBLEdBQUdBLEdBQUdBLEdBQUdBLENBQUNBO2dCQUM1QkEsQ0FBQ0E7Z0JBRURBLElBQUlBLEdBQUdBLEdBQUdBLElBQUlBLENBQUNBO2dCQUNmQSxJQUFJQSxjQUFjQSxHQUFHQSxNQUFNQSxDQUFDQSxjQUFjQSxDQUFDQTtnQkFDM0NBLEVBQUVBLENBQUNBLENBQUNBLGNBQWNBLENBQUNBLENBQUNBLENBQUNBO29CQUNuQkEsR0FBR0EsR0FBR0EsY0FBY0EsQ0FBQ0EsR0FBR0EsQ0FBQ0E7b0JBR3pCQSxJQUFJQSxRQUFRQSxHQUFHQSxRQUFRQSxDQUFDQSxJQUFJQSxDQUFDQSxTQUFTQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSxPQUFPQSxHQUFHQSxHQUFHQSxHQUFHQSxJQUFJQSxDQUFDQSxDQUFDQSxLQUFLQSxFQUFFQSxDQUFDQSxNQUFNQSxFQUFFQSxDQUFDQTtnQkFDdEZBLENBQUNBO2dCQUVEQSxZQUFZQSxFQUFFQSxDQUFDQTtnQkFFZkEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7b0JBQ1JBLGVBQWVBLENBQUNBLEdBQUdBLENBQUNBLENBQUFBO2dCQUN0QkEsQ0FBQ0E7Z0JBRURBLEVBQUVBLENBQUNBLENBQUNBLE1BQU1BLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBLENBQUNBLENBQUNBO29CQUN6QkEsTUFBTUEsQ0FBQ0EsWUFBWUEsQ0FBQ0EsWUFBWUEsRUFBRUEsQ0FBQ0E7b0JBQ25DQSxFQUFFQSxDQUFDQSxDQUFDQSxNQUFNQSxDQUFDQSxLQUFLQSxDQUFDQSxZQUFZQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTt3QkFDL0JBLE1BQU1BLENBQUNBLEtBQUtBLENBQUNBLFlBQVlBLENBQUNBLENBQUNBLFlBQVlBLEVBQUVBLENBQUNBO29CQUM1Q0EsQ0FBQ0E7Z0JBQ0hBLENBQUNBO2dCQUVEQSxJQUFJQSxDQUFDQSxNQUFNQSxDQUFDQSxNQUFNQSxDQUFDQSxDQUFDQTtZQUN0QkEsQ0FBQ0EsQ0FBQ0E7WUFFRkEsTUFBTUEsQ0FBQ0EsSUFBSUEsR0FBR0E7Z0JBRVpBLEVBQUVBLENBQUNBLENBQUNBLE1BQU1BLENBQUNBLFFBQVFBLElBQUlBLE1BQU1BLENBQUNBLFVBQVVBLENBQUNBLENBQUNBLENBQUNBO29CQUN6Q0EsSUFBSUEsT0FBT0EsR0FBR0EsS0FBS0EsQ0FBQ0EscUJBQXFCQSxDQUFDQSxNQUFNQSxDQUFDQSxVQUFVQSxDQUFDQSxDQUFDQTtvQkFDN0RBLEVBQUVBLENBQUNBLENBQUNBLE9BQU9BLENBQUNBLENBQUNBLENBQUNBO3dCQUNaQSxJQUFJQSxJQUFJQSxHQUFHQSxJQUFJQSxDQUFDQSxlQUFlQSxDQUFDQSxPQUFPQSxDQUFDQSxDQUFDQTt3QkFDekNBLEVBQUVBLENBQUNBLENBQUNBLElBQUlBLENBQUNBLENBQUNBLENBQUNBOzRCQUNUQSxJQUFJQSxPQUFPQSxHQUFHQSxrQkFBa0JBLENBQUNBLElBQUlBLENBQUNBLENBQUNBOzRCQUN2Q0EsUUFBR0EsQ0FBQ0EsS0FBS0EsQ0FBQ0Esc0JBQXNCQSxHQUFHQSxPQUFPQSxDQUFDQSxDQUFDQTs0QkFHNUNBLElBQUlBLGFBQWFBLEdBQUdBLE1BQU1BLENBQUNBLGFBQWFBLElBQUlBLGVBQWVBLEdBQUdBLE1BQU1BLENBQUNBLE1BQU1BLENBQUNBOzRCQUM1RUEsY0FBY0EsQ0FBQ0EsT0FBT0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsTUFBTUEsRUFBRUEsTUFBTUEsQ0FBQ0EsTUFBTUEsRUFBRUEsT0FBT0EsRUFBRUEsYUFBYUEsRUFBRUEsVUFBQ0EsTUFBTUE7Z0NBQ2xGQSxJQUFJQSxDQUFDQSxVQUFVQSxDQUFDQSxNQUFNQSxDQUFDQSxDQUFDQTtnQ0FDeEJBLElBQUlBLENBQUNBLFlBQVlBLENBQUNBLFNBQVNBLEVBQUVBLFFBQVFBLEdBQUdBLE1BQU1BLENBQUNBLE1BQU1BLENBQUNBLENBQUNBO2dDQUN2REEsTUFBTUEsQ0FBQ0EsUUFBUUEsR0FBR0EsS0FBS0EsQ0FBQ0E7Z0NBQ3hCQSxRQUFRQSxFQUFFQSxDQUFDQTtnQ0FDWEEsSUFBSUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0E7NEJBQ3RCQSxDQUFDQSxDQUFDQSxDQUFDQTt3QkFDTEEsQ0FBQ0E7b0JBQ0hBLENBQUNBO2dCQUNIQSxDQUFDQTtZQUNIQSxDQUFDQSxDQUFDQTtZQUVGQSxNQUFNQSxDQUFDQSxNQUFNQSxHQUFHQTtnQkFDZEEsUUFBR0EsQ0FBQ0EsS0FBS0EsQ0FBQ0EsZUFBZUEsQ0FBQ0EsQ0FBQ0E7WUFFN0JBLENBQUNBLENBQUNBO1lBRUZBLE1BQU1BLENBQUNBLE1BQU1BLENBQUNBLGlCQUFpQkEsRUFBRUEsdUJBQXVCQSxDQUFDQSxDQUFDQTtZQUUxREE7WUFZQXlDLENBQUNBO1lBRUR6QyxvQkFBb0JBLFNBQVNBO2dCQUMzQm9DLElBQUlBLEdBQUdBLEdBQUdBLE1BQU1BLENBQUNBLEdBQUdBLElBQUlBLFFBQVFBLENBQUNBO2dCQUNqQ0EsSUFBSUEsWUFBWUEsR0FBR0EsTUFBTUEsQ0FBQ0EsY0FBY0EsSUFBSUEsTUFBTUEsQ0FBQ0EsVUFBVUEsQ0FBQ0E7Z0JBQzlEQSxJQUFJQSxHQUFHQSxHQUFHQSxTQUFTQSxDQUFDQSxLQUFLQSxDQUFDQSxDQUFDQTtnQkFDM0JBLEVBQUVBLENBQUNBLENBQUNBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLENBQUNBO29CQUNUQSxRQUFHQSxDQUFDQSxLQUFLQSxDQUFDQSwyQkFBMkJBLEdBQUdBLElBQUlBLENBQUNBLFNBQVNBLENBQUNBLFNBQVNBLENBQUNBLENBQUNBLENBQUNBO2dCQUNyRUEsQ0FBQ0E7Z0JBQUNBLElBQUlBLENBQUNBLENBQUNBO29CQUNOQSxJQUFJQSxRQUFRQSxHQUFHQSxNQUFNQSxDQUFDQSxjQUFjQSxDQUFDQTtvQkFDckNBLEVBQUVBLENBQUNBLENBQUNBLEdBQUdBLEtBQUtBLE9BQU9BLENBQUNBLENBQUNBLENBQUNBO3dCQUVwQkEsUUFBUUEsR0FBR0EsTUFBTUEsQ0FBQ0EsVUFBVUEsQ0FBQ0E7b0JBQy9CQSxDQUFDQTtvQkFBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0E7d0JBQ05BLEVBQUVBLENBQUNBLENBQUNBLENBQUNBLFFBQVFBLENBQUNBLENBQUNBLENBQUNBOzRCQUVkQSxJQUFJQSxJQUFJQSxHQUFHQSxNQUFNQSxDQUFDQSxVQUFVQSxDQUFDQTs0QkFDN0JBLElBQUlBLFFBQVFBLEdBQUdBLElBQUlBLENBQUNBLFFBQVFBLENBQUNBOzRCQUM3QkEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsUUFBUUEsSUFBSUEsQ0FBQ0EsUUFBUUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0NBQ2xDQSxVQUFVQSxDQUFDQSxLQUFLQSxDQUFDQSxjQUFjQSxDQUFDQSxPQUFPQSxDQUFDQSxDQUFDQSxDQUFDQTtnQ0FDMUNBLFFBQVFBLEdBQUdBLElBQUlBLENBQUNBLFFBQVFBLENBQUNBOzRCQUMzQkEsQ0FBQ0E7NEJBQ0RBLEVBQUVBLENBQUNBLENBQUNBLFFBQVFBLElBQUlBLFFBQVFBLENBQUNBLE1BQU1BLENBQUNBLENBQUNBLENBQUNBO2dDQUNoQ0EsUUFBUUEsR0FBR0EsY0FBY0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsVUFBVUEsRUFBRUEsTUFBTUEsQ0FBQ0EsZUFBZUEsQ0FBQ0EsSUFBSUEsUUFBUUEsQ0FBQ0EsUUFBUUEsQ0FBQ0EsTUFBTUEsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7NEJBQ3hHQSxDQUFDQTs0QkFBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0E7Z0NBQ05BLFFBQUdBLENBQUNBLEtBQUtBLENBQUNBLDhDQUE4Q0EsQ0FBQ0EsQ0FBQ0E7Z0NBQzFEQSxNQUFNQSxDQUFDQTs0QkFDVEEsQ0FBQ0E7d0JBQ0hBLENBQUNBO3dCQUlEQSxJQUFJQSxjQUFjQSxHQUFHQSxLQUFLQSxDQUFDQSxvQkFBb0JBLENBQUNBLFFBQVFBLENBQUNBLENBQUNBO3dCQUMxREEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsS0FBS0EsQ0FBQ0EsWUFBWUEsQ0FBQ0EsY0FBY0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7NEJBQ3hDQSxRQUFRQSxHQUFHQSxRQUFRQSxDQUFDQSxNQUFNQSxJQUFJQSxRQUFRQSxDQUFDQTt3QkFDekNBLENBQUNBO29CQUNIQSxDQUFDQTtvQkFDREEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsUUFBUUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7d0JBQ2JBLElBQUlBLElBQUlBLEdBQUdBLEdBQUdBLENBQUNBLGFBQWFBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBO3dCQUNsQ0EsWUFBWUEsR0FBR0EsUUFBUUEsQ0FBQ0E7d0JBQ3hCQSxJQUFJQSxTQUFTQSxHQUFHQSxLQUFLQSxDQUFDQSxhQUFhQSxDQUFDQSxZQUFZQSxFQUFFQSxJQUFJQSxDQUFDQSxDQUFDQTt3QkFJeERBLElBQUlBLFFBQVFBLEdBQUdBLEVBQ2RBLENBQUNBO3dCQUNGQSxFQUFFQSxDQUFDQSxDQUFDQSxHQUFHQSxLQUFLQSxVQUFVQSxJQUFJQSxNQUFNQSxDQUFDQSxjQUFjQSxDQUFDQSxDQUFDQSxDQUFDQTs0QkFDaERBLElBQUlBLEdBQUdBLEdBQUdBLE1BQU1BLENBQUNBLGNBQWNBLENBQUNBLEdBQUdBLENBQUNBOzRCQUNwQ0EsRUFBRUEsQ0FBQ0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0NBQ1JBLFFBQVFBLENBQUNBLEtBQUtBLENBQUNBLEdBQUdBLEdBQUdBLEdBQUdBLEdBQUdBLENBQUNBOzRCQUM5QkEsQ0FBQ0E7d0JBQ0hBLENBQUNBO3dCQUNEQSxTQUFTQSxDQUFDQSxlQUFlQSxDQUFDQSxHQUFHQSxRQUFRQSxDQUFDQTt3QkFDdENBLFNBQVNBLENBQUNBLGdCQUFnQkEsQ0FBQ0EsR0FBR0EsTUFBTUEsQ0FBQ0EsY0FBY0EsQ0FBQ0E7d0JBRXBEQSxFQUFFQSxDQUFDQSxDQUFDQSxHQUFHQSxLQUFLQSxPQUFPQSxDQUFDQSxDQUFDQSxDQUFDQTs0QkFFcEJBLElBQUlBLEtBQUtBLEdBQUdBLE1BQU1BLENBQUNBLFFBQVFBLENBQUNBLE1BQU1BLENBQUNBOzRCQUNuQ0EsSUFBSUEsTUFBTUEsR0FBR0EsSUFBSUEsQ0FBQ0E7NEJBQ2xCQSxPQUFPQSxJQUFJQSxFQUFFQSxDQUFDQTtnQ0FDWkEsTUFBTUEsR0FBR0EsT0FBT0EsR0FBR0EsQ0FBQ0EsRUFBRUEsS0FBS0EsQ0FBQ0EsQ0FBQ0E7Z0NBQzdCQSxFQUFFQSxDQUFDQSxDQUFDQSxDQUFDQSxNQUFNQSxDQUFDQSxRQUFRQSxDQUFDQSxJQUFJQSxDQUFDQSxNQUFNQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtvQ0FDbENBLEtBQUtBLENBQUNBO2dDQUNSQSxDQUFDQTs0QkFDSEEsQ0FBQ0E7NEJBQ0RBLFNBQVNBLENBQUNBLGNBQWNBLENBQUNBLENBQUNBLFlBQVlBLENBQUNBLElBQUlBLEVBQUVBLE1BQU1BLENBQUNBLENBQUNBOzRCQUNyREEsTUFBTUEsQ0FBQ0EsZUFBZUEsR0FBR0EsTUFBTUEsQ0FBQ0E7d0JBQ2xDQSxDQUFDQTtvQkFDSEEsQ0FBQ0E7Z0JBQ0hBLENBQUNBO2dCQUNEQSxZQUFZQSxFQUFFQSxDQUFDQTtZQUNqQkEsQ0FBQ0E7WUFFRHBDLHNCQUFzQkEsVUFBaUJBO2dCQUFqQjRDLDBCQUFpQkEsR0FBakJBLGlCQUFpQkE7Z0JBRXJDQSxJQUFJQSxNQUFNQSxHQUFHQSxLQUFLQSxDQUFDQSxxQkFBcUJBLENBQUNBLE1BQU1BLENBQUNBLFVBQVVBLENBQUNBLENBQUNBO2dCQUM1REEsSUFBSUEsSUFBSUEsR0FBR0EsS0FBS0EsQ0FBQ0EsYUFBYUEsQ0FBQ0EsTUFBTUEsRUFBRUEsTUFBTUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0E7Z0JBQ3REQSxFQUFFQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSxDQUFDQSxDQUFDQTtvQkFDVEEsTUFBTUEsQ0FBQ0EsVUFBVUEsR0FBR0EsSUFBSUEsQ0FBQ0E7b0JBQ3pCQSxNQUFNQSxDQUFDQSxHQUFHQSxHQUFHQSxJQUFJQSxDQUFDQSxPQUFPQSxDQUFDQSxJQUFJQSxFQUFFQSxDQUFDQSxhQUFhQSxDQUFDQSxDQUFDQSxDQUFDQTtnQkFDbkRBLENBQUNBO2dCQUNEQSxNQUFNQSxDQUFDQSxRQUFRQSxHQUFHQSxJQUFJQSxDQUFDQTtnQkFDdkJBLGNBQWNBLEVBQUVBLENBQUNBO2dCQUNqQkEsTUFBTUEsQ0FBQ0EsUUFBUUEsRUFBRUEsQ0FBQ0E7Z0JBQ2xCQSxJQUFJQSxDQUFDQSxNQUFNQSxDQUFDQSxNQUFNQSxDQUFDQSxDQUFDQTtZQUN0QkEsQ0FBQ0E7WUFHRDVDO2dCQUNFNkMsTUFBTUEsQ0FBQ0EsUUFBUUEsR0FBR0EsRUFBRUEsQ0FBQ0E7Z0JBQ3JCQSxJQUFJQSxHQUFHQSxHQUFHQSxDQUFDQSxDQUFDQSxNQUFNQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQTtnQkFDeEJBLE1BQU1BLENBQUNBLHFCQUFxQkEsQ0FBQ0Esc0JBQXNCQSxHQUFHQSxHQUFHQSxDQUFDQSxJQUFJQSxDQUFDQSxjQUFjQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSxJQUFJQSxDQUFDQSxDQUFDQTtnQkFDMUZBLEdBQUdBLENBQUNBLElBQUlBLENBQUNBLE9BQU9BLENBQUNBLENBQUNBLElBQUlBLENBQUNBLFVBQUNBLEdBQUdBLEVBQUVBLEtBQUtBO29CQUNoQ0EsSUFBSUEsRUFBRUEsR0FBR0EsS0FBS0EsQ0FBQ0EsWUFBWUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0E7b0JBQ2xDQSxFQUFFQSxDQUFDQSxDQUFDQSxFQUFFQSxDQUFDQSxDQUFDQSxDQUFDQTt3QkFDUEEsTUFBTUEsQ0FBQ0EsUUFBUUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsRUFBRUEsQ0FBQ0EsQ0FBQ0E7b0JBQzNCQSxDQUFDQTtnQkFDSEEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7WUFDTEEsQ0FBQ0E7WUFFRDdDO2dCQUNFOEMsRUFBRUEsQ0FBQ0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7b0JBQ2ZBLEVBQUVBLENBQUNBLENBQUNBLENBQUNBLE1BQU1BLENBQUNBLGVBQWVBLElBQUlBLE1BQU1BLENBQUNBLFFBQVFBLElBQUlBLE1BQU1BLENBQUNBLFFBQVFBLENBQUNBLE1BQU1BLENBQUNBLENBQUNBLENBQUNBO3dCQUN6RUEsTUFBTUEsQ0FBQ0EsZUFBZUEsR0FBR0EsTUFBTUEsQ0FBQ0EsUUFBUUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7b0JBQzlDQSxDQUFDQTtvQkFDREEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsZUFBZUEsSUFBSUEsTUFBTUEsQ0FBQ0EsZUFBZUEsS0FBS0EsTUFBTUEsQ0FBQ0EsWUFBWUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7d0JBQzdFQSxJQUFJQSxLQUFLQSxHQUFHQSxFQUFFQSxDQUFDQTt3QkFDZkEsSUFBSUEsS0FBS0EsR0FBR0EsRUFBRUEsQ0FBQ0E7d0JBQ2ZBLEtBQUtBLENBQUNBLGlCQUFpQkEsQ0FBQ0EsTUFBTUEsRUFBRUEsTUFBTUEsQ0FBQ0EsR0FBR0EsRUFBRUEsTUFBTUEsQ0FBQ0EsZUFBZUEsRUFBRUEsS0FBS0EsRUFBRUEsS0FBS0EsRUFBRUEsUUFBUUEsRUFBRUEsQ0FBQ0EsQ0FBQ0E7d0JBQzlGQSxlQUFlQSxDQUFDQSxNQUFNQSxDQUFDQSxlQUFlQSxDQUFDQSxDQUFDQTt3QkFFeENBLE1BQU1BLENBQUNBLE9BQU9BLEdBQUdBLEtBQUtBLENBQUNBLGlCQUFpQkEsQ0FBQ0EsTUFBTUEs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LElBQUlBLENBQUNBLE1BQU1BLENBQUNBLE1BQU1BLENBQUNBLENBQUNBO2dCQUN0QkEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0JBRUhBLGNBQWNBLENBQUNBLFVBQVVBLENBQUNBLFFBQVFBLEVBQUVBLFVBQUNBLE9BQU9BO29CQUMxQ0EsTUFBTUEsQ0FBQ0EsT0FBT0EsR0FBR0EsT0FBT0EsQ0FBQ0E7b0JBQ3pCQSxPQUFPQSxDQUFDQSxPQUFPQSxDQUFDQSxPQUFPQSxFQUFFQSxVQUFDQSxNQUFNQTt3QkFDOUJBLE1BQU1BLENBQUNBLFlBQVlBLEdBQUdBLElBQUlBLENBQUNBLFlBQVlBLENBQUNBLE1BQU1BLENBQUNBLENBQUNBO3dCQUNoREEsTUFBTUEsQ0FBQ0EsU0FBU0EsR0FBR0EsTUFBTUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsUUFBUUEsQ0FBQ0EsVUFBVUEsQ0FBQ0EsR0FBR0EsT0FBT0EsR0FBR0EsRUFBRUEsQ0FBQ0E7d0JBQ25FQSxJQUFJQSxVQUFVQSxHQUFHQSxNQUFNQSxDQUFDQSxVQUFVQSxDQUFDQTt3QkFDbkNBLElBQUlBLElBQUlBLEdBQUdBLFVBQVVBLENBQUNBLE1BQU1BLENBQUNBLENBQUNBO3dCQUM5QkEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7NEJBQ1RBLE1BQU1BLENBQUNBLFFBQVFBLEdBQUdBLGNBQVNBLENBQUNBLE1BQU1BLENBQUNBLEdBQUdBLFdBQVdBLEdBQUdBLElBQUlBLEdBQUdBLEdBQUdBLEdBQUdBLFFBQVFBLENBQUNBO3dCQUM1RUEsQ0FBQ0E7d0JBQ0RBLE1BQU1BLENBQUNBLFNBQVNBLEdBQUdBLGNBQVNBLENBQUNBLE1BQU1BLENBQUNBLEdBQUdBLFFBQVFBLEdBQUdBLFFBQVFBLEdBQUdBLEdBQUdBLEdBQUdBLFFBQVFBLEdBQUdBLEdBQUdBLEdBQUdBLENBQUNBLElBQUlBLElBQUlBLEVBQUVBLENBQUNBLENBQUNBO3dCQUNqR0EsRUFBRUEsQ0FBQ0EsQ0FBQ0EsVUFBVUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7NEJBQ2ZB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ZEEsUUFBR0EsQ0FBQ0EsS0FBS0EsQ0FBQ0EsdUJBQXVCQSxDQUFDQSxDQUFDQTtvQkFDbkNBLE1BQU1BLENBQUNBLElBQUlBLENBQUNBO2dCQUNkQSxDQUFDQTtnQkFDREEsSUFBSUEsUUFBUUEsR0FBR0EsUUFBUUEsQ0FBQ0EsUUFBUUEsSUFBSUEsRUFBRUEsQ0FBQ0E7Z0JBQ3ZDQSxJQUFJQSxJQUFJQSxHQUFVQSxNQUFNQSxDQUFDQSxlQUFlQSxJQUFJQSxRQUFRQSxDQUFDQTtnQkFFckRBLEVBQUVBLENBQUNBLENBQUNBLElBQUlBLENBQUNBLE9BQU9BLENBQUNBLEdBQUdBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO29CQUUxQkEsSUFBSUEsR0FBR0EsR0FBR0EsUUFBUUEsQ0FBQ0EsV0FBV0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0E7b0JBQ3BDQSxFQUFFQSxDQUFDQSxDQUFDQSxHQUFHQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTt3QkFDWkEsSUFBSUEsSUFBSUEsUUFBUUEsQ0FBQ0EsU0FBU0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0E7b0JBQ2xDQSxDQUFDQTtnQkFDSEEsQ0FBQ0E7Z0JBR0RBLElBQUlBLE1BQU1BLEdBQVVBLE1BQU1BLENBQUNBLE1BQU1BLENBQUNBO2dCQUNsQ0EsRUFBRUEsQ0FBQ0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7b0JBRWxCQSxJQUFJQSxHQUFHQSxHQUFPQSxNQUFNQSxDQUFDQSxXQUFXQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQTtvQkFDdENBLEVBQUVBLENBQUNBLENBQUNBLEdBQUdBLElBQUlBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO3dCQUNiQSxNQUFNQSxHQUFHQSxFQUFFQSxDQUFDQTtvQkFDZEEsQ0FBQ0E7b0JBQUNBLElBQUlBLENBQUNBLENBQUNBO3dCQUNOQSxNQUFNQSxHQUFHQSxNQUFNQSxDQUFDQSxTQUFTQSxDQUFDQSxDQUFDQSxFQUFFQSxHQUFHQSxDQUFDQSxDQUFDQTtvQkFDcENBLENBQUNBO2dCQUNIQSxDQUFDQTtnQkFDREEsSUFBSUEsR0FBR0EsR0FBT0EsSUFBSUEsQ0FBQ0EsV0FBV0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0E7Z0JBQ3BDQSxFQUFFQSxDQUFDQSxDQUFDQSxHQUFHQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtvQkFDWkEsTUFBTUEsSUFBSUEsR0FBR0EsR0FBR0EsSUFBSUEsQ0FBQ0EsU0FBU0EsQ0FBQ0EsQ0FBQ0EsRUFBRUEsR0FBR0EsQ0FBQ0EsQ0FBQ0E7b0JBQ3ZDQSxJQUFJQSxHQUFHQSxJQUFJQSxDQUFDQSxTQUFTQSxDQUFDQSxHQUFHQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFDQTtnQkFDakNBLENBQUNBO2dCQUNEQSxNQUFNQSxHQUFHQSxJQUFJQSxDQUFDQSxXQUFXQSxDQUFDQSxNQUFNQSxFQUFFQSxHQUFHQSxDQUFDQSxDQUFDQTtnQkFDdkNBLE1BQU1BLENBQUNBLE1BQU1BLEdBQUdBLENBQUNBLE1BQU1BLEdBQUdBLEdBQUdBLEdBQUdBLEVBQUVBLENBQUNBLEdBQUdBLElBQUlBLENBQUNBO1lBQzdDQSxDQUFDQTtRQUVIaEUsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7QUFFTkEsQ0FBQ0EsRUFwUU0sSUFBSSxLQUFKLElBQUksUUFvUVY7O0FDeFFELHlDQUF5QztBQUN6QyxzQ0FBc0M7QUFDdEMscUNBQXFDO0FBS3JDLElBQU8sSUFBSSxDQXlKVjtBQXpKRCxXQUFPLElBQUksRUFBQyxDQUFDO0lBQ1hBLFlBQU9BLENBQUNBLFVBQVVBLENBQUNBLHFCQUFxQkEsRUFBRUEsQ0FBQ0EsUUFBUUEsRUFBRUEsV0FBV0EsRUFBRUEsY0FBY0EsRUFBRUEsMkJBQTJCQSxFQUFFQSxVQUFDQSxNQUFNQSxFQUFFQSxTQUFTQSxFQUFFQSxZQUFZQSxFQUFFQSx5QkFBeUJBO1lBRXhLQSxJQUFJQSxDQUFDQSxTQUFTQSxDQUFDQSxNQUFNQSxFQUFFQSxZQUFZQSxFQUFFQSxTQUFTQSxDQUFDQSxDQUFDQTtZQUNoREEsTUFBTUEsQ0FBQ0EsZ0JBQWdCQSxDQUFDQSxJQUFJQSxDQUFDQSw0QkFBdUJBLENBQUNBLE1BQU1BLENBQUNBLENBQUNBLENBQUNBO1lBRTlEQSxJQUFJQSxjQUFjQSxHQUFHQSxNQUFNQSxDQUFDQSxjQUFjQSxDQUFDQTtZQUUzQ0EsTUFBTUEsQ0FBQ0EsTUFBTUEsR0FBR0E7Z0JBQ2RBLE1BQU1BLEVBQUVBLElBQUlBO2FBQ2JBLENBQUNBO1lBRUZBLElBQUlBLE1BQU1BLEdBQUdBLElBQUlBLENBQUNBLFVBQVVBLENBQUNBLE1BQU1BLENBQUNBLE1BQU1BLEVBQUVBLHlCQUF5QkEsQ0FBQ0EsQ0FBQ0E7WUFDdkVBLElBQUlBLElBQUlBLEdBQUdBLElBQUlBLENBQUNBO1lBQ2hCQSxFQUFFQSxDQUFDQSxDQUFDQSxDQUFDQSxNQUFNQSxJQUFJQSxNQUFNQSxLQUFLQSxZQUFZQSxDQUFDQSxJQUFJQSxRQUFRQSxFQUFFQSxDQUFDQSxDQUFDQSxDQUFDQTtnQkFDdERBLElBQUlBLEdBQUdBLFNBQVNBLENBQUNBLE1BQU1BLEVBQUVBLENBQUNBLE1BQU1BLENBQUNBLENBQUNBO1lBQ3BDQSxDQUFDQTtZQUVEQSxJQUFJQSxPQUFPQSxHQUFHQTtnQkFDWkEsSUFBSUEsRUFBRUE7b0JBQ0pBLElBQUlBLEVBQUVBLE1BQU1BO2lCQUNiQTthQUNGQSxDQUFDQTtZQUNGQSxNQUFNQSxDQUFDQSxpQkFBaUJBLEdBQUdBLFVBQVVBLENBQUNBLG9CQUFvQkEsQ0FBQ0EsT0FBT0EsQ0FBQ0EsQ0FBQ0E7WUFDcEVBLE1BQU1BLENBQUNBLFFBQVFBLEdBQUdBLEtBQUtBLENBQUNBO1lBR3hCQSxNQUFNQSxDQUFDQSxPQUFPQSxHQUFHQSxjQUFNQSxPQUFBQSxNQUFNQSxDQUFDQSxRQUFRQSxFQUFmQSxDQUFlQSxDQUFDQTtZQUV2Q0EsTUFBTUEsQ0FBQ0EsT0FBT0EsR0FBR0EsY0FBTUEsT0FBQUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsUUFBUUEsRUFBaEJBLENBQWdCQSxDQUFDQTtZQUV4Q0EsTUFBTUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsZUFBZUEsRUFBRUEsVUFBQ0EsUUFBUUEsRUFBRUEsUUFBUUE7Z0JBQ2hEQSxNQUFNQSxDQUFDQSxRQUFRQSxHQUFHQSxRQUFRQSxJQUFJQSxRQUFRQSxJQUFJQSxRQUFRQSxLQUFLQSxRQUFRQSxDQUFDQTtZQUNsRUEsQ0FBQ0EsRUFBRUEsSUFBSUEsQ0FBQ0EsQ0FBQ0E7WUFFVEEsUUFBR0EsQ0FBQ0EsS0FBS0EsQ0FBQ0EsUUFBUUEsRUFBRUEsTUFBTUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0E7WUFFakNBLE1BQU1BLENBQUNBLE1BQU1BLENBQUNBLFVBQVVBLEVBQUVBLFVBQUNBLFFBQVFBLEVBQUVBLFFBQVFBO2dCQUMzQ0EsUUFBR0EsQ0FBQ0EsS0FBS0EsQ0FBQ0EsWUFBWUEsRUFBRUEsUUFBUUEsQ0FBQ0EsQ0FBQ0E7WUFDcENBLENBQUNBLENBQUNBLENBQUNBO1lBRUhBLE1BQU1BLENBQUNBLFFBQVFBLEdBQUdBLGNBQU1BLE9BQUFBLElBQUlBLENBQUNBLFFBQVFBLENBQUNBLE1BQU1BLEVBQUVBLE1BQU1BLENBQUNBLE1BQU1BLEVBQUVBLFNBQVNBLEVBQUVBLE1BQU1BLENBQUNBLFFBQVFBLENBQUNBLEVBQWhFQSxDQUFnRUEsQ0FBQ0E7WUFFekZBLE1BQU1BLENBQUNBLE1BQU1BLEdBQUdBO2dCQUNkQSxRQUFRQSxFQUFFQSxDQUFDQTtZQUNiQSxDQUFDQSxDQUFDQTtZQUVGQSxNQUFNQSxDQUFDQSxJQUFJQSxHQUFHQTtnQkFDWkEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsUUFBUUEsSUFBSUEsTUFBTUEsQ0FBQ0EsUUFBUUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7b0JBQ3ZDQSxNQUFNQSxDQUFDQSxNQUFNQSxDQUFDQSxRQUFRQSxDQUFDQSxDQUFDQSxDQUFDQTtnQkFDM0JBLENBQUNBO1lBQ0hBLENBQUNBLENBQUNBO1lBRUZBLE1BQU1BLENBQUNBLE1BQU1BLEdBQUdBO2dCQUVkQSxJQUFJQSxJQUFJQSxHQUFHQSxNQUFNQSxDQUFDQSxNQUFNQSxHQUFHQSxHQUFHQSxHQUFHQSxNQUFNQSxDQUFDQSxRQUFRQSxDQUFDQTtnQkFDakRBLFFBQUdBLENBQUNBLEtBQUtBLENBQUNBLHVCQUF1QkEsR0FBR0EsSUFBSUEsQ0FBQ0EsQ0FBQ0E7Z0JBQzFDQSxNQUFNQSxDQUFDQSxJQUFJQSxDQUFDQSxDQUFDQTtZQUNmQSxDQUFDQSxDQUFDQTtZQUVGQSxNQUFNQSxDQUFDQSxRQUFRQSxHQUFHQSxVQUFDQSxJQUFJQSxFQUFFQSxJQUFJQTtnQkFDM0JBLEVBQUVBLENBQUNBLENBQUNBLFFBQVFBLEVBQUVBLENBQUNBLENBQUNBLENBQUNBO29CQUNmQSxNQUFNQSxDQUFDQSxNQUFNQSxFQUFFQSxDQUFDQTtnQkFDbEJBLENBQUNBO2dCQUFDQSxJQUFJQSxDQUFDQSxDQUFDQTtvQkFDTkEsTUFBTUEsQ0FBQ0EsSUFBSUEsRUFBRUEsQ0FBQ0E7Z0JBQ2hCQSxDQUFDQTtZQUNIQSxDQUFDQSxDQUFDQTtZQUVGQSxNQUFNQSxDQUFDQSxRQUFRQSxHQUFHQSxVQUFDQSxJQUFJQTtnQkFDckJBLFVBQVVBLENBQUNBO29CQUNUQSxRQUFRQSxFQUFFQSxDQUFDQTtvQkFDWEEsSUFBSUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQUE7Z0JBQ3JCQSxDQUFDQSxFQUFFQSxFQUFFQSxDQUFDQSxDQUFDQTtZQUNUQSxDQUFDQSxDQUFDQTtZQUdGQSxVQUFVQSxFQUFFQSxDQUFDQTtZQUViQTtnQkFDRWlFLE1BQU1BLENBQUNBLFNBQVNBLENBQUNBLElBQUlBLEVBQUVBLENBQUNBLFVBQVVBLENBQUNBLGNBQWNBLENBQUNBLENBQUNBO1lBQ3JEQSxDQUFDQTtZQUVEakU7Z0JBRUV3QyxFQUFFQSxDQUFDQSxDQUFDQSxRQUFRQSxFQUFFQSxDQUFDQSxDQUFDQSxDQUFDQTtvQkFDZkEsZ0JBQWdCQSxFQUFFQSxDQUFDQTtnQkFDckJBLENBQUNBO2dCQUFDQSxJQUFJQSxDQUFDQSxDQUFDQTtvQkFDTkEsUUFBR0EsQ0FBQ0EsS0FBS0EsQ0FBQ0Esd0JBQXdCQSxFQUFFQSxNQUFNQSxDQUFDQSxNQUFNQSxFQUFFQSxXQUFXQSxFQUFFQSxNQUFNQSxDQUFDQSxNQUFNQSxFQUFFQSxhQUFhQSxFQUFFQSxNQUFNQSxDQUFDQSxRQUFRQSxDQUFDQSxDQUFDQTtvQkFDL0dBLGNBQWNBLENBQUNBLE9BQU9BLENBQUNBLE1BQU1BLENBQUNBLE1BQU1BLEVBQUVBLE1BQU1BLENBQUNBLE1BQU1BLEVBQUVBLE1BQU1BLENBQUNBLFFBQVFBLEVBQUVBLGNBQWNBLENBQUNBLENBQUNBO2dCQUN4RkEsQ0FBQ0E7WUFDSEEsQ0FBQ0E7WUFFRHhDLHdCQUF3QkEsT0FBT0E7Z0JBQzdCa0UsSUFBSUEsUUFBUUEsR0FBR0EsT0FBT0EsQ0FBQ0EsSUFBSUEsQ0FBQ0E7Z0JBQzVCQSxNQUFNQSxDQUFDQSxNQUFNQSxDQUFDQSxNQUFNQSxHQUFHQSxRQUFRQSxDQUFDQTtnQkFDaENBLE1BQU1BLENBQUNBLFFBQVFBLEdBQUdBLE1BQU1BLENBQUNBLE1BQU1BLENBQUNBLEtBQUtBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLElBQUlBLEVBQUVBLENBQUNBO2dCQUNsREEsUUFBR0EsQ0FBQ0EsS0FBS0EsQ0FBQ0EsYUFBYUEsRUFBRUEsTUFBTUEsQ0FBQ0EsUUFBUUEsQ0FBQ0EsQ0FBQ0E7Z0JBQzFDQSxRQUFHQSxDQUFDQSxLQUFLQSxDQUFDQSxnQkFBZ0JBLEVBQUVBLE9BQU9BLENBQUNBLENBQUNBO2dCQUNyQ0EsZ0JBQWdCQSxFQUFFQSxDQUFDQTtnQkFDbkJBLElBQUlBLENBQUNBLE1BQU1BLENBQUNBLE1BQU1BLENBQUNBLENBQUNBO1lBQ3RCQSxDQUFDQTtZQUVEbEU7Z0JBQ0VtRSxFQUFFQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSxDQUFDQSxDQUFDQTtvQkFDVEEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsUUFBUUEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7d0JBRWZBLEVBQUVBLENBQUNBLENBQUNBLENBQUNBLE1BQU1BLENBQUNBLFFBQVFBLENBQUNBLENBQUNBLENBQUNBOzRCQUNyQkEsTUFBTUEsQ0FBQ0EsUUFBUUEsR0FBR0EsRUFBRUEsR0FBR0EsSUFBSUEsQ0FBQ0EsT0FBT0EsRUFBRUEsR0FBR0EsT0FBT0EsQ0FBQ0E7d0JBQ2xEQSxDQUFDQTtvQkFDSEEsQ0FBQ0E7b0JBRURBLE1BQU1BLENBQUNBLFVBQVVBLEdBQUdBLElBQUlBLENBQUNBO29CQUN6QkEsTUFBTUEsQ0FBQ0EsR0FBR0EsR0FBR0EsY0FBY0EsQ0FBQ0EsT0FBT0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsTUFBTUEsRUFBRUEsSUFBSUEsRUFBRUEsTUFBTUEsQ0FBQ0EsUUFBUUEsRUFBRUEsVUFBQ0EsT0FBT0E7d0JBQ2hGQSxZQUFZQSxDQUFDQSxJQUFJQSxDQUFDQSxTQUFTQSxDQUFDQSxPQUFPQSxDQUFDQSxJQUFJQSxDQUFDQSxDQUFDQSxDQUFDQTtvQkFDN0NBLENBQUNBLENBQUNBLENBQUNBO2dCQUNMQSxDQUFDQTtnQkFBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0E7b0JBQ05BLE1BQU1BLENBQUNBLFVBQVVBLEdBQUdBLG1DQUFtQ0EsQ0FBQ0E7Z0JBQzFEQSxDQUFDQTtZQUNIQSxDQUFDQTtZQUVEbkUsc0JBQXNCQSxJQUFJQTtnQkFDeEJvRSxNQUFNQSxDQUFDQSxjQUFjQSxHQUFHQSxJQUFJQSxDQUFDQTtnQkFDN0JBLEVBQUVBLENBQUNBLENBQUNBLE1BQU1BLENBQUNBLE1BQU1BLENBQUNBLE1BQU1BLENBQUNBLENBQUNBLENBQUNBO29CQUN6QkEsTUFBTUEsQ0FBQ0EsVUFBVUEsR0FBR0EsSUFBSUEsQ0FBQ0EsU0FBU0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0E7Z0JBQzNEQSxDQUFDQTtnQkFDREEsTUFBTUEsQ0FBQ0EsVUFBVUEsR0FBR0EsaUNBQWlDQSxDQUFDQTtnQkFDdERBLElBQUlBLENBQUNBLE1BQU1BLENBQUNBLE1BQU1BLENBQUNBLENBQUNBO1lBQ3RCQSxDQUFDQTtZQUVEcEU7Z0JBQ0V5QyxJQUFJQSxJQUFJQSxHQUFHQSxJQUFJQSxDQUFDQSxXQUFXQSxDQUFDQSxNQUFNQSxDQUFDQSxRQUFRQSxFQUFFQSxFQUFFQSxHQUFHQSxDQUFDQSxDQUFDQTtnQkFDcERBLFFBQUdBLENBQUNBLEtBQUtBLENBQUNBLGdCQUFnQkEsR0FBR0EsSUFBSUEsQ0FBQ0EsQ0FBQ0E7Z0JBQ25DQSxTQUFTQSxDQUFDQSxJQUFJQSxDQUFDQSxJQUFJQSxDQUFDQSxVQUFVQSxDQUFDQSxJQUFJQSxDQUFDQSxDQUFDQSxDQUFDQTtnQkFDdENBLFFBQUdBLENBQUNBLEtBQUtBLENBQUNBLGtCQUFrQkEsR0FBR0EsU0FBU0EsQ0FBQ0EsSUFBSUEsRUFBRUEsQ0FBQ0EsQ0FBQ0E7WUFDbkRBLENBQUNBO1lBRUR6QyxnQkFBZ0JBLElBQVdBO2dCQUN6QnFFLElBQUlBLGFBQWFBLEdBQUdBLE1BQU1BLENBQUNBLGFBQWFBLElBQUlBLGVBQWVBLEdBQUdBLE1BQU1BLENBQUNBLE1BQU1BLENBQUNBO2dCQUM1RUEsSUFBSUEsUUFBUUEsR0FBR0EsTUFBTUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsTUFBTUEsQ0FBQ0E7Z0JBQ3BDQSxFQUFFQSxDQUFDQSxDQUFDQSxNQUFNQSxDQUFDQSxVQUFVQSxDQUFDQSxDQUFDQSxDQUFDQTtvQkFDdEJBLFFBQVFBLEdBQUdBLElBQUlBLENBQUNBLFNBQVNBLENBQUNBLE1BQU1BLENBQUNBLFVBQVVBLEVBQUVBLElBQUlBLEVBQUVBLElBQUlBLENBQUNBLENBQUNBO2dCQUMzREEsQ0FBQ0E7Z0JBQ0RBLFFBQUdBLENBQUNBLEtBQUtBLENBQUNBLHVCQUF1QkEsRUFBRUEsTUFBTUEsQ0FBQ0EsTUFBTUEsRUFBRUEsU0FBU0EsRUFBRUEsTUFBTUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0E7Z0JBRTFFQSxjQUFjQSxDQUFDQSxPQUFPQSxDQUFDQSxNQUFNQSxDQUFDQSxNQUFNQSxFQUFFQSxJQUFJQSxFQUFFQSxRQUFRQSxFQUFFQSxhQUFhQSxFQUFFQSxVQUFDQSxNQUFNQTtvQkFDMUVBLElBQUlBLENBQUNBLFVBQVVBLENBQUNBLE1BQU1BLENBQUNBLENBQUNBO29CQUN4QkEsTUFBTUEsQ0FBQ0EsUUFBUUEsR0FBR0EsS0FBS0EsQ0FBQ0E7b0JBQ3hCQSxJQUFJQSxDQUFDQSxZQUFZQSxDQUFDQSxTQUFTQSxFQUFFQSxRQUFRQSxHQUFHQSxJQUFJQSxDQUFDQSxDQUFDQTtvQkFDOUNBLFFBQVFBLEVBQUVBLENBQUNBO29CQUNYQSxJQUFJQSxDQUFDQSxNQUFNQSxDQUFDQSxNQUFNQSxDQUFDQSxDQUFDQTtnQkFDdEJBLENBQUNBLENBQUNBLENBQUNBO1lBQ0xBLENBQUNBO1FBQ0hyRSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtBQUNOQSxDQUFDQSxFQXpKTSxJQUFJLEtBQUosSUFBSSxRQXlKVjs7QUNoS0QseUNBQXlDO0FBQ3pDLHNDQUFzQztBQUN0QyxxQ0FBcUM7QUFLckMsSUFBTyxJQUFJLENBb0VWO0FBcEVELFdBQU8sSUFBSSxFQUFDLENBQUM7SUFHQUEsdUJBQWtCQSxHQUFHQSxZQUFPQSxDQUFDQSxVQUFVQSxDQUFDQSx5QkFBeUJBLEVBQUVBLENBQUNBLFFBQVFBLEVBQUVBLGNBQWNBLEVBQUVBLFFBQVFBLEVBQUVBLFVBQVVBLEVBQUVBLGFBQWFBLEVBQUVBLFVBQUNBLE1BQU1BLEVBQUVBLFlBQVlBLEVBQUVBLE1BQTZCQSxFQUFFQSxRQUEyQkEsRUFBRUEsV0FBNEJBO1lBRzNQQSxJQUFJQSxTQUFTQSxHQUFHQSxJQUFJQSxDQUFDQSxVQUFVQSxDQUFDQSxNQUFNQSxFQUFFQSxNQUFNQSxDQUFDQSxNQUFNQSxDQUFDQSxHQUFHQSxHQUFHQSxDQUFDQTtZQUM3REEsSUFBSUEsUUFBUUEsR0FBR0EsTUFBTUEsQ0FBQ0EsUUFBUUEsR0FBR0EsSUFBSUEsWUFBWUEsQ0FBQ0E7Z0JBQ2hEQSxPQUFPQSxFQUFFQTtvQkFDUEEsZUFBZUEsRUFBRUEsSUFBSUEsQ0FBQ0EsZUFBZUEsQ0FBQ0EsV0FBV0EsQ0FBQ0E7aUJBQ25EQTtnQkFDREEsVUFBVUEsRUFBRUEsSUFBSUE7Z0JBQ2hCQSxlQUFlQSxFQUFFQSxJQUFJQTtnQkFDckJBLE1BQU1BLEVBQUVBLE1BQU1BO2dCQUNkQSxHQUFHQSxFQUFFQSxTQUFTQTthQUNmQSxDQUFDQSxDQUFDQTtZQUNIQSxNQUFNQSxDQUFDQSxRQUFRQSxHQUFHQTtnQkFDaEJBLFFBQVFBLENBQUNBLFNBQVNBLEVBQUVBLENBQUNBO1lBQ3ZCQSxDQUFDQSxDQUFDQTtZQUNGQSxRQUFRQSxDQUFDQSxzQkFBc0JBLEdBQUdBLFVBQVVBLElBQUlBLEVBQTRCQSxNQUFNQSxFQUFFQSxPQUFPQTtnQkFDekYsUUFBRyxDQUFDLEtBQUssQ0FBQyx3QkFBd0IsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1lBQzdELENBQUMsQ0FBQ0E7WUFDRkEsUUFBUUEsQ0FBQ0EsaUJBQWlCQSxHQUFHQSxVQUFVQSxRQUFRQTtnQkFDN0MsUUFBRyxDQUFDLEtBQUssQ0FBQyxtQkFBbUIsRUFBRSxRQUFRLENBQUMsQ0FBQztZQUMzQyxDQUFDLENBQUNBO1lBQ0ZBLFFBQVFBLENBQUNBLGdCQUFnQkEsR0FBR0EsVUFBVUEsY0FBY0E7Z0JBQ2xELFFBQUcsQ0FBQyxLQUFLLENBQUMsa0JBQWtCLEVBQUUsY0FBYyxDQUFDLENBQUM7WUFDaEQsQ0FBQyxDQUFDQTtZQUNGQSxRQUFRQSxDQUFDQSxrQkFBa0JBLEdBQUdBLFVBQVVBLElBQUlBO2dCQUMxQyxFQUFFLENBQUMsQ0FBQyxNQUFNLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQztvQkFDbkIsSUFBSSxDQUFDLFVBQVUsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksR0FBRyxJQUFJLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQzlELENBQUM7Z0JBQUMsSUFBSSxDQUFDLENBQUM7b0JBQ04sSUFBSSxDQUFDLFVBQVUsR0FBRyxDQUFDLENBQUM7Z0JBQ3RCLENBQUM7Z0JBRUQsSUFBSSxDQUFDLEdBQUcsR0FBRyxTQUFTLENBQUM7Z0JBQ3JCLFFBQUcsQ0FBQyxJQUFJLENBQUMsbUJBQW1CLEdBQUcsU0FBUyxDQUFDLENBQUM7Z0JBQzFDLFFBQUcsQ0FBQyxLQUFLLENBQUMsb0JBQW9CLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDeEMsQ0FBQyxDQUFDQTtZQUNGQSxRQUFRQSxDQUFDQSxjQUFjQSxHQUFHQSxVQUFVQSxRQUFRQSxFQUFFQSxRQUFRQTtnQkFDcEQsUUFBRyxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsRUFBRSxRQUFRLEVBQUUsUUFBUSxDQUFDLENBQUM7WUFDbEQsQ0FBQyxDQUFDQTtZQUNGQSxRQUFRQSxDQUFDQSxhQUFhQSxHQUFHQSxVQUFVQSxRQUFRQTtnQkFDekMsUUFBRyxDQUFDLEtBQUssQ0FBQyxlQUFlLEVBQUUsUUFBUSxDQUFDLENBQUM7WUFDdkMsQ0FBQyxDQUFDQTtZQUNGQSxRQUFRQSxDQUFDQSxhQUFhQSxHQUFHQSxVQUFVQSxRQUFRQSxFQUFFQSxRQUFRQSxFQUFFQSxNQUFNQSxFQUFFQSxPQUFPQTtnQkFDcEUsUUFBRyxDQUFDLEtBQUssQ0FBQyxlQUFlLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxNQUFNLEVBQUUsT0FBTyxDQUFDLENBQUM7WUFDbEUsQ0FBQyxDQUFDQTtZQUNGQSxRQUFRQSxDQUFDQSxXQUFXQSxHQUFHQSxVQUFVQSxRQUFRQSxFQUFFQSxRQUFRQSxFQUFFQSxNQUFNQSxFQUFFQSxPQUFPQTtnQkFDbEUsUUFBRyxDQUFDLEtBQUssQ0FBQyxhQUFhLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxNQUFNLEVBQUUsT0FBTyxDQUFDLENBQUM7WUFDaEUsQ0FBQyxDQUFDQTtZQUNGQSxRQUFRQSxDQUFDQSxZQUFZQSxHQUFHQSxVQUFVQSxRQUFRQSxFQUFFQSxRQUFRQSxFQUFFQSxNQUFNQSxFQUFFQSxPQUFPQTtnQkFDbkUsUUFBRyxDQUFDLEtBQUssQ0FBQyxjQUFjLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxNQUFNLEVBQUUsT0FBTyxDQUFDLENBQUM7WUFDakUsQ0FBQyxDQUFDQTtZQUNGQSxRQUFRQSxDQUFDQSxjQUFjQSxHQUFHQSxVQUFVQSxRQUFRQSxFQUFFQSxRQUFRQSxFQUFFQSxNQUFNQSxFQUFFQSxPQUFPQTtnQkFDckUsUUFBRyxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLE1BQU0sRUFBRSxPQUFPLENBQUMsQ0FBQztZQUNuRSxDQUFDLENBQUNBO1lBQ0ZBLFFBQVFBLENBQUNBLGFBQWFBLEdBQUdBO2dCQUN2QixRQUFHLENBQUMsS0FBSyxDQUFDLGVBQWUsQ0FBQyxDQUFDO2dCQUMzQixRQUFRLENBQUMsVUFBVSxFQUFFLENBQUM7Z0JBQ3RCLFFBQVEsQ0FBQztvQkFDUCxRQUFHLENBQUMsSUFBSSxDQUFDLDRDQUE0QyxDQUFDLENBQUM7b0JBQ3ZELE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQztvQkFDaEIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQztnQkFDdEIsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1lBQ1YsQ0FBQyxDQUFDQTtRQUNKQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtBQUVOQSxDQUFDQSxFQXBFTSxJQUFJLEtBQUosSUFBSSxRQW9FVjs7QUMzRUQseUNBQXlDO0FBQ3pDLHNDQUFzQztBQUN0QyxxQ0FBcUM7QUFLckMsSUFBTyxJQUFJLENBZ0dWO0FBaEdELFdBQU8sSUFBSSxFQUFDLENBQUM7SUFFWEEsWUFBT0EsQ0FBQ0EsVUFBVUEsQ0FBQ0EsMEJBQTBCQSxFQUFFQSxDQUFDQSxRQUFRQSxFQUFFQSxXQUFXQSxFQUFFQSxjQUFjQSxFQUFFQSxVQUFDQSxNQUFNQSxFQUFFQSxTQUFTQSxFQUFFQSxZQUFZQTtZQUNySEEsSUFBSUEsQ0FBQ0EsU0FBU0EsQ0FBQ0EsTUFBTUEsRUFBRUEsWUFBWUEsRUFBRUEsU0FBU0EsQ0FBQ0EsQ0FBQ0E7WUFDaERBLElBQUlBLGNBQWNBLEdBQUdBLE1BQU1BLENBQUNBLGNBQWNBLENBQUNBO1lBRTNDQSxNQUFNQSxDQUFDQSxVQUFVQSxHQUFHQSxFQUFFQSxDQUFDQTtZQUV2QkEsTUFBTUEsQ0FBQ0EsV0FBV0EsR0FBR0E7Z0JBQ2xCQSxJQUFJQSxFQUFFQSxNQUFNQTtnQkFDWkEsYUFBYUEsRUFBRUEsS0FBS0E7Z0JBQ3BCQSxVQUFVQSxFQUFFQSxLQUFLQTtnQkFDakJBLGFBQWFBLEVBQUVBO29CQUNiQSxVQUFVQSxFQUFFQSxFQUFFQTtpQkFDZkE7Z0JBQ0RBLFVBQVVBLEVBQUVBLE1BQU1BLENBQUNBLFVBQVVBO2FBQzlCQSxDQUFDQTtZQUdIQSxNQUFNQSxDQUFDQSxRQUFRQSxHQUFHQSxVQUFDQSxHQUFHQTtnQkFDcEJBLE1BQU1BLENBQUNBLFNBQVNBLENBQUNBLEdBQUdBLEVBQUVBLE9BQU9BLENBQUNBLENBQUNBO1lBQ2pDQSxDQUFDQSxDQUFDQTtZQUNGQSxNQUFNQSxDQUFDQSxRQUFRQSxHQUFHQSxVQUFDQSxHQUFHQTtnQkFDcEJBLE1BQU1BLENBQUNBLFNBQVNBLENBQUNBLEdBQUdBLEVBQUVBLE9BQU9BLENBQUNBLENBQUNBO1lBQ2pDQSxDQUFDQSxDQUFDQTtZQUVGQSxtQkFBbUJBLEtBQUtBLEVBQUVBLE1BQU1BO2dCQUM5QnNFLElBQUlBLEtBQUtBLEdBQUdBLElBQUlBLENBQUNBLFNBQVNBLENBQUNBLE1BQU1BLENBQUNBLENBQUNBO2dCQUNuQ0EsSUFBSUEsT0FBT0EsR0FBR0EsQ0FBQ0EsS0FBS0EsQ0FBQ0EsR0FBR0EsS0FBS0EsQ0FBQ0EsS0FBS0EsQ0FBQ0EsSUFBSUEsRUFBRUEsR0FBR0EsRUFBRUEsQ0FBQ0E7Z0JBQ2hEQSxNQUFNQSxDQUFDQSxJQUFJQSxDQUFDQSxVQUFVQSxDQUFDQSxTQUFTQSxFQUFFQSxLQUFLQSxHQUFHQSxNQUFNQSxHQUFHQSxHQUFHQSxHQUFHQSxNQUFNQSxDQUFDQSxNQUFNQSxHQUFHQSxHQUFHQSxHQUFHQSxPQUFPQSxDQUFDQSxDQUFDQTtZQUMxRkEsQ0FBQ0E7WUFFRHRFLElBQUlBLFdBQVdBLEdBQUdBO2dCQUNoQkEsS0FBS0EsRUFBRUEsS0FBS0E7Z0JBQ1pBLFdBQVdBLEVBQUVBLFNBQVNBO2dCQUN0QkEsWUFBWUEsRUFBRUEsc0pBQXNKQTthQUNyS0EsQ0FBQ0E7WUFFRkEsTUFBTUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EscUJBQXFCQSxFQUFFQSxVQUFVQSxLQUFLQSxFQUFFQSxPQUFPQSxFQUFFQSxRQUFRQTtnQkFFbEUsVUFBVSxDQUFDLFVBQVUsRUFBRSxFQUFFLENBQUMsQ0FBQztZQUM3QixDQUFDLENBQUNBLENBQUNBO1lBRUhBLElBQUlBLElBQUlBLEdBQUdBLFNBQVNBLENBQUNBLE1BQU1BLEVBQUVBLENBQUNBLE1BQU1BLENBQUNBLENBQUNBO1lBQ3RDQSxFQUFFQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSxDQUFDQSxDQUFDQTtnQkFDVEEsY0FBY0EsQ0FBQ0EsT0FBT0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsTUFBTUEsRUFBRUEsSUFBSUEsRUFBRUEsTUFBTUEsQ0FBQ0EsUUFBUUEsRUFBRUEsVUFBVUEsQ0FBQ0EsQ0FBQ0E7WUFDM0VBLENBQUNBO1lBRURBLFVBQVVBLEVBQUVBLENBQUNBO1lBRWJBLG1CQUFtQkEsUUFBUUE7Z0JBQ3pCdUMsSUFBSUEsSUFBSUEsR0FBR0EsRUFBRUEsQ0FBQ0E7Z0JBQ2RBLElBQUlBLEdBQUdBLEdBQUdBLElBQUlBLENBQUNBLFNBQVNBLENBQUNBLFFBQVFBLENBQUNBLENBQUNBO2dCQUNuQ0EsT0FBT0EsQ0FBQ0EsT0FBT0EsQ0FBQ0EsR0FBR0EsRUFBRUEsVUFBQ0EsS0FBS0EsRUFBRUEsR0FBR0E7b0JBQzlCQSxLQUFLQSxDQUFDQSxLQUFLQSxDQUFDQSxHQUFHQSxHQUFHQSxDQUFDQTtvQkFDbkJBLElBQUlBLENBQUNBLElBQUlBLENBQUNBLEtBQUtBLENBQUNBLENBQUNBO2dCQUNuQkEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0JBQ0hBLE1BQU1BLENBQUNBLElBQUlBLEdBQUdBLElBQUlBLENBQUNBO2dCQUNuQkEsSUFBSUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0E7WUFDdEJBLENBQUNBO1lBRUR2QztnQkFDRXdDLElBQUlBLE1BQU1BLEdBQUdBLElBQUlBLENBQUNBLE9BQU9BLENBQUNBLE1BQU1BLEVBQUVBLENBQUNBLGFBQWFBLEVBQUVBLGVBQWVBLEVBQUVBLFlBQVlBLENBQUNBLENBQUNBLElBQUlBLEVBQUVBLENBQUNBO2dCQUN4RkEsTUFBTUEsQ0FBQ0EsR0FBR0EsR0FBR0EsY0FBY0EsQ0FBQ0EsaUJBQWlCQSxDQUFDQSxNQUFNQSxDQUFDQSxNQUFNQSxFQUFFQSxRQUFRQSxFQUFFQSxNQUFNQSxFQUFFQSxTQUFTQSxDQUFDQSxDQUFDQTtZQUM1RkEsQ0FBQ0E7WUFFRHhDLG9CQUFvQkEsT0FBT0E7Z0JBQ3pCdUUsSUFBSUEsSUFBSUEsR0FBR0EsT0FBT0EsQ0FBQ0EsSUFBSUEsQ0FBQ0E7Z0JBQ3hCQSxFQUFFQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSxDQUFDQSxDQUFDQTtvQkFDVEEsTUFBTUEsQ0FBQ0EsY0FBY0EsR0FBR0EsSUFBSUEsQ0FBQ0EsU0FBU0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0E7b0JBRTdDQSxJQUFJQSxVQUFVQSxHQUFHQSxFQUFFQSxDQUFDQTtvQkFDcEJBLElBQUlBLE1BQU1BLEdBQUdBLE1BQU1BLENBQUNBLGNBQWNBLENBQUNBO29CQUNuQ0EsT0FBT0EsQ0FBQ0EsT0FBT0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsVUFBVUEsRUFBRUEsVUFBQ0EsUUFBUUEsRUFBRUEsSUFBSUE7d0JBQ2hEQSxFQUFFQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSxDQUFDQSxDQUFDQTs0QkFDVEEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsS0FBS0EsQ0FBQ0EscUJBQXFCQSxDQUFDQSxRQUFRQSxFQUFFQSxNQUFNQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtnQ0FDbkRBLElBQUlBLE1BQU1BLEdBQUdBO29DQUNYQSxLQUFLQSxFQUFFQSxJQUFJQTtvQ0FDWEEsV0FBV0EsRUFBRUEsUUFBUUEsQ0FBQ0EsV0FBV0EsSUFBSUEsSUFBSUE7b0NBQ3pDQSxPQUFPQSxFQUFFQSxJQUFJQTtpQ0FDZEEsQ0FBQ0E7Z0NBQ0ZBLFVBQVVBLENBQUNBLElBQUlBLENBQUNBLE1BQU1BLENBQUNBLENBQUNBOzRCQUMxQkEsQ0FBQ0E7d0JBQ0hBLENBQUNBO29CQUNIQSxDQUFDQSxDQUFDQSxDQUFDQTtvQkFDSEEsVUFBVUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsV0FBV0EsQ0FBQ0EsQ0FBQ0E7b0JBRTdCQSxNQUFNQSxDQUFDQSxVQUFVQSxHQUFHQSxVQUFVQSxDQUFDQTtvQkFDL0JBLE1BQU1BLENBQUNBLFdBQVdBLENBQUNBLFVBQVVBLEdBQUdBLFVBQVVBLENBQUNBO29CQUczQ0EsTUFBTUEsQ0FBQ0EsU0FBU0EsR0FBR0EsMkNBQTJDQSxDQUFDQTtnQkFDakVBLENBQUNBO1lBQ0hBLENBQUNBO1lBQ0R2RSxJQUFJQSxDQUFDQSxNQUFNQSxDQUFDQSxNQUFNQSxDQUFDQSxDQUFDQTtRQUN0QkEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7QUFDTkEsQ0FBQ0EsRUFoR00sSUFBSSxLQUFKLElBQUksUUFnR1Y7O0FDdkdELHlDQUF5QztBQUN6QyxzQ0FBc0M7QUFDdEMscUNBQXFDO0FBS3BDLElBQU8sSUFBSSxDQThCVjtBQTlCRCxXQUFPLElBQUksRUFBQyxDQUFDO0lBQ1pBLFlBQU9BLENBQUNBLFVBQVVBLENBQUNBLHFCQUFxQkEsRUFBRUEsQ0FBQ0EsUUFBUUEsRUFBRUEsY0FBY0EsRUFBRUEsYUFBYUEsRUFBRUEsVUFBQ0EsTUFBTUEsRUFBRUEsWUFBWUEsRUFBRUEsV0FBV0E7WUFFcEhBLElBQUlBLE1BQU1BLEdBQUdBO2dCQUNYQSxVQUFVQSxFQUFFQTtvQkFDVkEsV0FBV0EsRUFBRUE7d0JBQ1hBLElBQUlBLEVBQUVBLFFBQVFBO3dCQUNkQSxLQUFLQSxFQUFFQSxVQUFVQTt3QkFDakJBLFdBQVdBLEVBQUVBLHNGQUFzRkE7cUJBQ3BHQTtvQkFDREEsWUFBWUEsRUFBRUE7d0JBQ1pBLElBQUlBLEVBQUVBLFFBQVFBO3dCQUNkQSxLQUFLQSxFQUFFQSxPQUFPQTt3QkFDZEEsV0FBV0EsRUFBRUEsc0ZBQXNGQTtxQkFDcEdBO2lCQUNGQTthQUNGQSxDQUFDQTtZQUVGQSxNQUFNQSxDQUFDQSxNQUFNQSxHQUFHQSxNQUFNQSxDQUFDQTtZQUN2QkEsTUFBTUEsQ0FBQ0EsTUFBTUEsR0FBR0EsTUFBTUEsQ0FBQ0E7WUFFdkJBLElBQUlBLENBQUNBLG1CQUFtQkEsQ0FBQ0EsTUFBTUEsRUFBRUEsWUFBWUEsRUFBRUE7Z0JBQzdDQSxhQUFhQSxFQUFFQTtvQkFDYkEsT0FBT0EsRUFBRUEsV0FBV0EsQ0FBQ0EsUUFBUUEsSUFBSUEsRUFBRUE7aUJBQ3BDQTtnQkFDREEsY0FBY0EsRUFBRUE7b0JBQ2RBLE9BQU9BLEVBQUVBLEVBQUVBO2lCQUNaQTthQUNGQSxDQUFDQSxDQUFDQTtRQUNMQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtBQUNMQSxDQUFDQSxFQTlCTSxJQUFJLEtBQUosSUFBSSxRQThCVjs7QUNyQ0YseUNBQXlDO0FBQ3pDLHNDQUFzQztBQUN0QyxxQ0FBcUM7QUFLckMsSUFBTyxJQUFJLENBNkhWO0FBN0hELFdBQU8sSUFBSSxFQUFDLENBQUM7SUFFWEEsWUFBT0EsQ0FBQ0EsVUFBVUEsQ0FBQ0Esd0JBQXdCQSxFQUFFQSxDQUFDQSxRQUFRQSxFQUFFQSxXQUFXQSxFQUFFQSxjQUFjQSxFQUFFQSxnQkFBZ0JBLEVBQUVBLFFBQVFBLEVBQUVBLDJCQUEyQkEsRUFBR0EsVUFBQ0EsTUFBTUEsRUFBRUEsU0FBU0EsRUFBRUEsWUFBWUEsRUFBRUEsY0FBY0EsRUFBRUEsTUFBTUEsRUFBRUEseUJBQXlCQTtZQUdoT0EsSUFBSUEsS0FBS0EsR0FBR0EsS0FBS0EsQ0FBQ0E7WUFDbEJBLElBQUlBLE9BQU9BLEdBQUdBLElBQUlBLENBQUNBO1lBRW5CQSxJQUFJQSxDQUFDQSxTQUFTQSxDQUFDQSxNQUFNQSxFQUFFQSxZQUFZQSxFQUFFQSxTQUFTQSxDQUFDQSxDQUFDQTtZQUNoREEsSUFBSUEsY0FBY0EsR0FBR0EsTUFBTUEsQ0FBQ0EsY0FBY0EsQ0FBQ0E7WUFHM0NBLE1BQU1BLENBQUNBLFVBQVVBLEdBQUdBLDZCQUE2QkEsQ0FBQ0E7WUFHbERBLE1BQU1BLENBQUNBLFdBQVdBLEdBQUdBO2dCQUNuQkEsSUFBSUEsRUFBRUEsTUFBTUE7Z0JBQ1pBLFVBQVVBLEVBQUVBLEtBQUtBO2dCQUNqQkEsdUJBQXVCQSxFQUFFQSxLQUFLQTtnQkFDOUJBLFdBQVdBLEVBQUVBLElBQUlBO2dCQUNqQkEsYUFBYUEsRUFBRUEsRUFBRUE7Z0JBQ2pCQSxxQkFBcUJBLEVBQUVBLElBQUlBO2dCQUMzQkEsd0JBQXdCQSxFQUFHQSxJQUFJQTtnQkFDL0JBLGFBQWFBLEVBQUVBO29CQUNiQSxVQUFVQSxFQUFFQSxFQUFFQTtpQkFDZkE7Z0JBQ0RBLFVBQVVBLEVBQUVBO29CQUNWQTt3QkFDRUEsS0FBS0EsRUFBRUEsT0FBT0E7d0JBQ2RBLFdBQVdBLEVBQUVBLFVBQVVBO3dCQUN2QkEsV0FBV0EsRUFBRUEsSUFBSUE7d0JBQ2pCQSxTQUFTQSxFQUFFQSxLQUFLQTt3QkFDaEJBLFlBQVlBLEVBQUVBLGlKQUFpSkE7d0JBQy9KQSxLQUFLQSxFQUFFQSxJQUFJQTtxQkFDWkE7b0JBQ0RBO3dCQUNFQSxLQUFLQSxFQUFFQSxLQUFLQTt3QkFDWkEsV0FBV0EsRUFBRUEsUUFBUUE7d0JBQ3JCQSxZQUFZQSxFQUFFQSxxTkFBcU5BO3dCQUNuT0EsVUFBVUEsRUFBRUEsRUFBRUE7d0JBQ2RBLEtBQUtBLEVBQUVBLEdBQUdBO3FCQUNYQTtvQkFDREE7d0JBQ0VBLEtBQUtBLEVBQUVBLFFBQVFBO3dCQUNmQSxXQUFXQSxFQUFFQSxRQUFRQTt3QkFDckJBLFVBQVVBLEVBQUVBLEVBQUVBO3dCQUNkQSxLQUFLQSxFQUFFQSxJQUFJQTtxQkFDWkE7b0JBQ0RBO3dCQUNFQSxLQUFLQSxFQUFFQSxlQUFlQTt3QkFDdEJBLFdBQVdBLEVBQUVBLFNBQVNBO3dCQUN0QkEsWUFBWUEsRUFBRUEsNkdBQTZHQTt3QkFDM0hBLEtBQUtBLEVBQUVBLE1BQU1BO3FCQUNkQTtpQkFDRkE7YUFDRkEsQ0FBQ0E7WUFFRkEsTUFBTUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EscUJBQXFCQSxFQUFFQSxVQUFVQSxLQUFLQSxFQUFFQSxPQUFPQSxFQUFFQSxRQUFRQTtnQkFFbEUsVUFBVSxDQUFDLFVBQVUsRUFBRSxFQUFFLENBQUMsQ0FBQztZQUM3QixDQUFDLENBQUNBLENBQUNBO1lBRUhBLE1BQU1BLENBQUNBLFNBQVNBLEdBQUdBO2dCQUNqQkEsSUFBSUEsYUFBYUEsR0FBR0EsTUFBTUEsQ0FBQ0EsV0FBV0EsQ0FBQ0EsYUFBYUEsQ0FBQ0E7Z0JBQ3JEQSxNQUFNQSxDQUFDQSxhQUFhQSxDQUFDQSxNQUFNQSxLQUFLQSxDQUFDQSxJQUFJQSxhQUFhQSxDQUFDQSxDQUFDQSxDQUFDQSxLQUFLQSxNQUFNQSxDQUFDQSxJQUFJQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUMzRUEsQ0FBQ0EsQ0FBQ0E7WUFFRkEsTUFBTUEsQ0FBQ0EsTUFBTUEsR0FBR0E7Z0JBQ2RBLElBQUlBLGFBQWFBLEdBQUdBLE1BQU1BLENBQUNBLFdBQVdBLENBQUNBLGFBQWFBLENBQUNBO2dCQUNyREEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsYUFBYUEsQ0FBQ0EsTUFBTUEsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7b0JBQzdCQSxJQUFJQSxRQUFRQSxHQUFHQSxhQUFhQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQSxHQUFHQSxDQUFDQTtvQkFDcENBLEVBQUVBLENBQUNBLENBQUNBLFFBQVFBLENBQUNBLENBQUNBLENBQUNBO3dCQUNiQSxJQUFJQSxhQUFhQSxHQUFHQSxpQkFBaUJBLEdBQUdBLE1BQU1BLENBQUNBLE1BQU1BLEdBQUdBLHVCQUF1QkEsR0FBR0EsUUFBUUEsQ0FBQ0E7d0JBQzNGQSxjQUFjQSxDQUFDQSxRQUFRQSxDQUFDQSxNQUFNQSxDQUFDQSxNQUFNQSxFQUFFQSxRQUFRQSxFQUFFQSxNQUFNQSxDQUFDQSxNQUFNQSxFQUFFQSxhQUFhQSxFQUFFQSxVQUFDQSxNQUFNQTs0QkFDcEZBLElBQUlBLENBQUNBLFVBQVVBLENBQUNBLE1BQU1BLENBQUNBLENBQUNBOzRCQUV4QkEsSUFBSUEsQ0FBQ0EsWUFBWUEsQ0FBQ0EsU0FBU0EsRUFBRUEsd0JBQXdCQSxHQUFHQSxNQUFNQSxDQUFDQSxNQUFNQSxDQUFDQSxDQUFDQTs0QkFDdkVBLFVBQVVBLEVBQUVBLENBQUNBO3dCQUNmQSxDQUFDQSxDQUFDQSxDQUFDQTtvQkFDTEEsQ0FBQ0E7b0JBQ0RBLGFBQWFBLENBQUNBLE1BQU1BLENBQUNBLENBQUNBLEVBQUVBLGFBQWFBLENBQUNBLE1BQU1BLENBQUNBLENBQUNBO2dCQUNoREEsQ0FBQ0E7WUFDSEEsQ0FBQ0EsQ0FBQ0E7WUFFRkEsTUFBTUEsQ0FBQ0EsSUFBSUEsR0FBR0E7Z0JBQ1pBLElBQUlBLFlBQVlBLEdBQUdBLEdBQUdBLENBQUNBO2dCQUN2QkEsSUFBSUEsUUFBUUEsR0FBR0EsWUFBWUEsQ0FBQ0E7Z0JBQzVCQSxJQUFJQSxhQUFhQSxHQUFHQSxNQUFNQSxDQUFDQSxXQUFXQSxDQUFDQSxhQUFhQSxDQUFDQTtnQkFDckRBLEVBQUVBLENBQUNBLENBQUNBLGFBQWFBLENBQUNBLE1BQU1BLEdBQUdBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO29CQUM3QkEsUUFBUUEsR0FBR0EsYUFBYUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsR0FBR0EsSUFBSUEsWUFBWUEsQ0FBQ0E7Z0JBQ2xEQSxDQUFDQTtnQkFDREEsSUFBSUEsWUFBWUEsR0FBR0EsWUFBWUEsQ0FBQ0E7Z0JBQ2hDQSxFQUFFQSxDQUFDQSxDQUFDQSxhQUFhQSxDQUFDQSxNQUFNQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtvQkFDN0JBLFlBQVlBLEdBQUdBLGFBQWFBLENBQUNBLENBQUNBLENBQUNBLENBQUNBLEdBQUdBLElBQUdBLFlBQVlBLENBQUNBO29CQUVuREEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsYUFBYUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsSUFBSUEsR0FBR0EsYUFBYUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7d0JBQ2xEQSxJQUFJQSxDQUFDQSxHQUFHQSxZQUFZQSxDQUFDQTt3QkFDckJBLFlBQVlBLEdBQUdBLFFBQVFBLENBQUNBO3dCQUN4QkEsUUFBUUEsR0FBR0EsQ0FBQ0EsQ0FBQ0E7b0JBQ2ZBLENBQUNBO2dCQUNIQSxDQUFDQTtnQkFDREEsSUFBSUEsSUFBSUEsR0FBR0EsY0FBU0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsR0FBR0EsUUFBUUEsR0FBR0EsUUFBUUEsR0FBR0EsR0FBR0EsR0FBR0EsWUFBWUEsR0FBR0EsR0FBR0EsR0FBR0EsTUFBTUEsQ0FBQ0EsTUFBTUEsQ0FBQ0E7Z0JBQzlGQSxJQUFJQSxJQUFJQSxHQUFHQSxJQUFJQSxDQUFDQSxXQUFXQSxDQUFDQSxJQUFJQSxFQUFFQSxHQUFHQSxDQUFDQSxDQUFDQTtnQkFDdkNBLFNBQVNBLENBQUNBLElBQUlBLENBQUNBLElBQUlBLENBQUNBLENBQUNBO1lBQ3ZCQSxDQUFDQSxDQUFDQTtZQUVGQSxVQUFVQSxFQUFFQSxDQUFDQTtZQUViQTtnQkFDRXdDLElBQUlBLFFBQVFBLEdBQUdBLEVBQUVBLENBQUNBO2dCQUNsQkEsSUFBSUEsS0FBS0EsR0FBR0EsQ0FBQ0EsQ0FBQ0E7Z0JBRWRBLE1BQU1BLENBQUNBLEdBQUdBLEdBQUdBLGNBQWNBLENBQUNBLE9BQU9BLENBQUNBLE1BQU1BLENBQUNBLE1BQU1BLEVBQUVBLFFBQVFBLEVBQUVBLE1BQU1BLENBQUNBLE1BQU1BLEVBQUVBLEtBQUtBLEVBQUVBLFVBQUNBLFFBQVFBO29CQUMxRkEsT0FBT0EsQ0FBQ0EsT0FBT0EsQ0FBQ0EsUUFBUUEsRUFBRUEsVUFBQ0EsR0FBR0E7d0JBRTVCQSxJQUFJQSxRQUFRQSxHQUFHQSxHQUFHQSxDQUFDQSxHQUFHQSxDQUFDQTt3QkFDdkJBLEdBQUdBLENBQUNBLEtBQUtBLEdBQUdBLFNBQVNBLENBQUNBLE1BQU1BLENBQUNBLEdBQUdBLENBQUNBLElBQUlBLENBQUNBLENBQUNBO3dCQUN2Q0EsR0FBR0EsQ0FBQ0EsVUFBVUEsR0FBR0EsY0FBU0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsR0FBR0EsZ0JBQWdCQSxHQUFHQSxNQUFNQSxDQUFDQSxNQUFNQSxHQUFHQSxHQUFHQSxHQUFHQSxRQUFRQSxDQUFDQTtvQkFDekZBLENBQUNBLENBQUNBLENBQUNBO29CQUNIQSxNQUFNQSxDQUFDQSxJQUFJQSxHQUFHQSxDQUFDQSxDQUFDQSxNQUFNQSxDQUFDQSxRQUFRQSxFQUFFQSxPQUFPQSxDQUFDQSxDQUFDQSxPQUFPQSxFQUFFQSxDQUFDQTtvQkFDcERBLElBQUlBLENBQUNBLE1BQU1BLENBQUNBLE1BQU1BLENBQUNBLENBQUNBO2dCQUN0QkEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0JBQ0hBLElBQUlBLENBQUNBLFlBQVlBLENBQUNBLE9BQU9BLEVBQUVBLGNBQWNBLEVBQUVBLE1BQU1BLEVBQUVBLEtBQUtBLENBQUNBLENBQUNBO1lBQzVEQSxDQUFDQTtRQUNIeEMsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7QUFDTkEsQ0FBQ0EsRUE3SE0sSUFBSSxLQUFKLElBQUksUUE2SFY7O0FDcElELHlDQUF5QztBQUN6QyxzQ0FBc0M7QUFDdEMscUNBQXFDO0FBS3JDLElBQU8sSUFBSSxDQU1WO0FBTkQsV0FBTyxJQUFJLEVBQUMsQ0FBQztJQUNYQSxZQUFPQSxDQUFDQSxTQUFTQSxDQUFDQSxvQkFBb0JBLEVBQUVBO1FBQ3RDQSxNQUFNQSxDQUFDQTtZQUNMQSxXQUFXQSxFQUFFQSxpQkFBWUEsR0FBR0EsbUJBQW1CQTtTQUNoREEsQ0FBQ0E7SUFDSkEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7QUFDTEEsQ0FBQ0EsRUFOTSxJQUFJLEtBQUosSUFBSSxRQU1WOztBQ2JELHlDQUF5QztBQUN6QyxzQ0FBc0M7QUFDdEMscUNBQXFDO0FBS3JDLElBQU8sSUFBSSxDQTBLVjtBQTFLRCxXQUFPLElBQUksRUFBQyxDQUFDO0lBQ1hBLFlBQU9BLENBQUNBLFVBQVVBLENBQUNBLHVCQUF1QkEsRUFBRUEsQ0FBQ0EsUUFBUUEsRUFBRUEsV0FBV0EsRUFBRUEsY0FBY0EsRUFBRUEsZ0JBQWdCQSxFQUFFQSxVQUFDQSxNQUFNQSxFQUFFQSxTQUFTQSxFQUFFQSxZQUFZQSxFQUFFQSxjQUF5QkE7WUFHL0pBLElBQUlBLEtBQUtBLEdBQUdBLEtBQUtBLENBQUNBO1lBRWxCQSxJQUFJQSxDQUFDQSxTQUFTQSxDQUFDQSxNQUFNQSxFQUFFQSxZQUFZQSxFQUFFQSxTQUFTQSxDQUFDQSxDQUFDQTtZQUNoREEsSUFBSUEsY0FBY0EsR0FBR0EsTUFBTUEsQ0FBQ0EsY0FBY0EsQ0FBQ0E7WUFFM0NBLE1BQU1BLENBQUNBLGdCQUFnQkEsR0FBZ0JBO2dCQUNyQ0EsS0FBS0EsRUFBRUEsTUFBTUEsQ0FBQ0EsTUFBTUE7Z0JBQ3BCQSxLQUFLQSxFQUFFQSxFQUFFQTthQUNWQSxDQUFDQTtZQUVGQSxNQUFNQSxDQUFDQSxRQUFRQSxHQUFHQSxJQUFJQSxDQUFDQSxRQUFRQSxDQUFDQTtZQUNoQ0EsTUFBTUEsQ0FBQ0EsV0FBV0EsR0FBR0EsVUFBQ0EsSUFBa0JBO2dCQUN0Q0EsTUFBTUEsQ0FBQ0EsS0FBS0EsQ0FBQ0Esa0JBQWtCQSxFQUFFQSxJQUFJQSxDQUFDQSxDQUFDQTtZQUN6Q0EsQ0FBQ0EsQ0FBQ0E7WUFFRkEsY0FBY0EsQ0FBQ0EsbUJBQW1CQSxDQUFDQSxNQUFNQSxDQUFDQSxnQkFBZ0JBLENBQUNBLEtBQUtBLENBQUNBLENBQUNBO1lBRWxFQSxNQUFNQSxDQUFDQSxNQUFNQSxDQUFDQSxVQUFVQSxFQUFFQSxVQUFDQSxRQUFRQSxFQUFFQSxRQUFRQTtnQkFDM0NBLEVBQUVBLENBQUNBLENBQUNBLFFBQVFBLEtBQUtBLFFBQVFBLElBQUlBLENBQUNBLFFBQVFBLENBQUNBLENBQUNBLENBQUNBO29CQUN2Q0EsTUFBTUEsQ0FBQ0E7Z0JBQ1RBLENBQUNBO2dCQUNEQSxNQUFNQSxDQUFDQSxnQkFBZ0JBLENBQUNBLEtBQUtBLEdBQUdBLEVBQUVBLENBQUNBO2dCQUNuQ0EsRUFBRUEsQ0FBQ0EsQ0FBQ0EsUUFBUUEsQ0FBQ0EsTUFBTUEsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7b0JBQ3hCQSxNQUFNQSxDQUFDQSxnQkFBZ0JBLENBQUNBLEtBQUtBLENBQUNBLElBQUlBLENBQUNBO3dCQUNqQ0EsT0FBT0EsRUFBRUEsS0FBS0EsR0FBR0EsVUFBVUEsR0FBR0EsVUFBVUE7cUJBQ3pDQSxDQUFDQSxDQUFDQTtnQkFDTEEsQ0FBQ0E7Z0JBQ0RBLFFBQVFBLENBQUNBLElBQUlBLEVBQUVBLENBQUNBLE9BQU9BLENBQUNBLFVBQUNBLElBQUlBO29CQUMzQkEsSUFBSUEsUUFBUUEsR0FBR0E7d0JBQ2JBLEtBQUtBLEVBQUVBLElBQUlBO3dCQUNYQSxJQUFJQSxFQUFFQSxFQUFFQTt3QkFDUkEsTUFBTUEsRUFBRUEsY0FBT0EsQ0FBQ0E7cUJBQ2pCQSxDQUFDQTtvQkFDRkEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsSUFBSUEsS0FBS0EsTUFBTUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7d0JBQzNCQSxRQUFRQSxDQUFDQSxJQUFJQSxHQUFHQSxVQUFVQSxDQUFDQTtvQkFDN0JBLENBQUNBO29CQUFDQSxJQUFJQSxDQUFDQSxDQUFDQTt3QkFDTkEsUUFBUUEsQ0FBQ0EsTUFBTUEsR0FBR0E7NEJBQ2hCQSxJQUFJQSxTQUFTQSxHQUFHQSxlQUFVQSxDQUFDQSxJQUFJQSxFQUFVQSxNQUFNQSxDQUFDQSxNQUFNQSxFQUFFQSxTQUFTQSxDQUFDQSxDQUFDQTs0QkFDbkVBLFNBQVNBLENBQUNBLElBQUlBLENBQUNBLElBQUlBLENBQUNBLE1BQU1BLENBQUNBLFNBQVNBLENBQUNBLENBQUNBLENBQUNBOzRCQUN2Q0EsSUFBSUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0E7d0JBQ3RCQSxDQUFDQSxDQUFBQTtvQkFDSEEsQ0FBQ0E7b0JBQ0RBLE1BQU1BLENBQUNBLGdCQUFnQkEsQ0FBQ0EsS0FBS0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsUUFBUUEsQ0FBQ0EsQ0FBQ0E7Z0JBQy9DQSxDQUFDQSxDQUFDQSxDQUFDQTtnQkFDSEEsY0FBY0EsQ0FBQ0EsbUJBQW1CQSxDQUFDQSxNQUFNQSxDQUFDQSxnQkFBZ0JBLENBQUNBLEtBQUtBLENBQUNBLENBQUNBO1lBQ3BFQSxDQUFDQSxFQUFFQSxJQUFJQSxDQUFDQSxDQUFDQTtZQUVUQSxNQUFNQSxDQUFDQSxVQUFVQSxHQUFHQTtnQkFDbEJBLElBQUlBLE1BQU1BLEdBQUdBLElBQUlBLENBQUNBLE1BQU1BLENBQUNBLFlBQVlBLEVBQUVBLFNBQVNBLENBQUNBLENBQUNBO2dCQUNsREEsTUFBTUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsVUFBVUEsQ0FBQ0EsTUFBTUEsRUFBRUEsTUFBTUEsRUFBRUEsU0FBU0EsQ0FBQ0EsQ0FBQ0E7WUFDcERBLENBQUNBLENBQUNBO1lBRUZBLE1BQU1BLENBQUNBLFNBQVNBLEdBQUdBLGNBQVNBLENBQUNBLE1BQU1BLENBQUNBLENBQUNBO1lBRXJDQSxNQUFNQSxDQUFDQSxVQUFVQSxHQUFHQTtnQkFDbEJBLElBQUlBLElBQUlBLEdBQUdBLFNBQVNBLENBQUNBLElBQUlBLEVBQUVBLENBQUNBO2dCQUM1QkEsSUFBSUEsTUFBTUEsR0FBV0EsSUFBSUEsQ0FBQ0E7Z0JBQzFCQSxPQUFPQSxDQUFDQSxPQUFPQSxDQUFDQSxJQUFJQSxDQUFDQSxlQUFlQSxDQUFDQSxNQUFNQSxDQUFDQSxFQUFFQSxVQUFDQSxJQUFJQTtvQkFDakRBLEVBQUVBLENBQUNBLENBQUNBLElBQUlBLENBQUNBLFVBQVVBLENBQUNBLElBQUlBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO3dCQUMxQkEsTUFBTUEsR0FBV0EsSUFBSUEsQ0FBQ0EsVUFBVUEsQ0FBQ0EsU0FBU0EsRUFBRUEsSUFBSUEsQ0FBQ0EsU0FBU0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsR0FBR0EsT0FBT0EsR0FBR0EsSUFBSUEsQ0FBQ0EsU0FBU0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0EsQ0FBQUE7b0JBQzdHQSxDQUFDQTtnQkFDSEEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0JBRUhBLE1BQU1BLENBQUNBLENBQUNBLENBQUNBLE1BQU1BLElBQUlBLFNBQVNBLENBQUNBLE1BQU1BLEVBQUVBLENBQUNBLE1BQU1BLENBQUNBLENBQUNBO3NCQUNwQ0EsSUFBSUEsQ0FBQ0EsVUFBVUEsQ0FBQ0EsU0FBU0EsRUFBRUEsR0FBR0EsR0FBR0EsSUFBSUEsRUFBRUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0E7c0JBQ2hEQSxNQUFNQSxDQUFDQTtZQUNuQkEsQ0FBQ0EsQ0FBQ0E7WUFFRkEsTUFBTUEsQ0FBQ0EsUUFBUUEsR0FBR0EsVUFBQ0EsSUFBSUE7Z0JBQ3JCQSxFQUFFQSxDQUFDQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSxDQUFDQSxDQUFDQTtvQkFDVkEsTUFBTUEsQ0FBQ0EsS0FBS0EsQ0FBQ0E7Z0JBQ2ZBLENBQUNBO2dCQUNEQSxNQUFNQSxDQUFDQSxJQUFJQSxDQUFDQSxRQUFRQSxDQUFDQSxZQUFZQSxDQUFDQSxNQUFNQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUM3Q0EsQ0FBQ0EsQ0FBQ0E7WUFFRkEsTUFBTUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EscUJBQXFCQSxFQUFFQSxVQUFVQSxLQUFLQSxFQUFFQSxPQUFPQSxFQUFFQSxRQUFRQTtnQkFFbEUsVUFBVSxDQUFDLGVBQWUsRUFBRSxFQUFFLENBQUMsQ0FBQztZQUNsQyxDQUFDLENBQUNBLENBQUNBO1lBRUhBLGVBQWVBLEVBQUVBLENBQUNBO1lBRWxCQSxvQ0FBb0NBLFVBQVVBLEVBQUVBLElBQUlBO2dCQUNsRHdFLElBQUlBLElBQUlBLEdBQUdBLFVBQVVBLENBQUNBLElBQUlBLENBQUNBO2dCQUMzQkEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7b0JBQ1RBLFVBQVVBLENBQUNBLElBQUlBLEdBQUdBLElBQUlBLENBQUNBLE9BQU9BLENBQUNBLFdBQVdBLEVBQUVBLElBQUlBLENBQUNBLENBQUNBO2dCQUNwREEsQ0FBQ0E7WUFDSEEsQ0FBQ0E7WUFFRHhFO2dCQUNFeUUsSUFBSUEsS0FBS0EsR0FBR0EsSUFBSUEsQ0FBQ0EsU0FBU0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0E7Z0JBQ25DQSxJQUFJQSxJQUFJQSxHQUFHQSxLQUFLQSxHQUFHQSxPQUFPQSxDQUFDQTtnQkFDM0JBLE1BQU1BLENBQUNBLFdBQVdBLEdBQUdBO29CQUNuQkEsRUFBQ0EsSUFBSUEsRUFBRUEsSUFBSUEsRUFBRUEsSUFBSUEsRUFBRUEsTUFBTUEsRUFBQ0E7aUJBQzNCQSxDQUFDQTtnQkFDRkEsSUFBSUEsSUFBSUEsR0FBR0EsSUFBSUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsWUFBWUEsRUFBRUEsU0FBU0EsQ0FBQ0EsQ0FBQ0E7Z0JBQ2hEQSxJQUFJQSxLQUFLQSxHQUFHQSxJQUFJQSxHQUFHQSxJQUFJQSxDQUFDQSxLQUFLQSxDQUFDQSxHQUFHQSxDQUFDQSxHQUFHQSxFQUFFQSxDQUFDQTtnQkFDeENBLE9BQU9BLENBQUNBLE9BQU9BLENBQUNBLEtBQUtBLEVBQUVBLFVBQUNBLElBQUlBO29CQUMxQkEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsVUFBVUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsUUFBUUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7d0JBQ2pEQSxJQUFJQSxJQUFJQSxHQUFHQSxDQUFDQTtvQkFDZEEsQ0FBQ0E7b0JBQ0RBLElBQUlBLElBQUlBLElBQUlBLENBQUNBLFVBQVVBLENBQUNBLElBQUlBLENBQUNBLENBQUNBO29CQUM5QkEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsT0FBT0EsRUFBRUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7d0JBQ3BCQSxNQUFNQSxDQUFDQSxXQUFXQSxDQUFDQSxJQUFJQSxDQUFDQSxFQUFDQSxJQUFJQSxFQUFFQSxJQUFJQSxFQUFFQSxJQUFJQSxFQUFFQSxJQUFJQSxFQUFDQSxDQUFDQSxDQUFDQTtvQkFDcERBLENBQUNBO2dCQUNIQSxDQUFDQSxDQUFDQSxDQUFDQTtnQkFFSEEsSUFBSUEsR0FBR0EsR0FBR0EsU0FBU0EsQ0FBQ0EsSUFBSUEsRUFBRUEsQ0FBQ0E7Z0JBQzNCQSxFQUFFQSxDQUFDQSxDQUFDQSxNQUFNQSxDQUFDQSxXQUFXQSxDQUFDQSxNQUFNQSxDQUFDQSxDQUFDQSxDQUFDQTtvQkFDOUJBLElBQUlBLElBQUlBLEdBQUdBLE1BQU1BLENBQUNBLFdBQVdBLENBQUNBLE1BQU1BLENBQUNBLFdBQVdBLENBQUNBLE1BQU1BLEdBQUdBLENBQUNBLENBQUNBLENBQUNBO29CQUU3REEsSUFBSUEsQ0FBQ0EsSUFBSUEsR0FBR0EsSUFBSUEsQ0FBQ0Esc0JBQXNCQSxDQUFDQSxJQUFJQSxDQUFDQSxJQUFJQSxDQUFDQSxDQUFDQTtvQkFFbkRBLElBQUlBLFFBQVFBLEdBQUdBLEtBQUtBLENBQUNBO29CQUNyQkEsT0FBT0EsQ0FBQ0EsT0FBT0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsZUFBZUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsRUFBRUEsVUFBQ0EsSUFBSUE7d0JBQ2pEQSxFQUFFQSxDQUFDQSxDQUFDQSxDQUFDQSxRQUFRQSxJQUFJQSxHQUFHQSxDQUFDQSxVQUFVQSxDQUFDQSxJQUFJQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTs0QkFFdENBLDBCQUEwQkEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsV0FBV0EsQ0FBQ0EsSUFBSUEsRUFBRUEsRUFBRUEsSUFBSUEsQ0FBQ0EsV0FBV0EsQ0FBQ0EsSUFBSUEsRUFBRUEsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7NEJBQ25GQSxRQUFRQSxHQUFHQSxJQUFJQSxDQUFDQTt3QkFDbEJBLENBQUNBO29CQUNIQSxDQUFDQSxDQUFDQSxDQUFDQTtvQkFDSEEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsUUFBUUEsSUFBSUEsU0FBU0EsQ0FBQ0EsTUFBTUEsRUFBRUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7d0JBQzVDQSxJQUFJQSxRQUFRQSxHQUFHQSxNQUFNQSxDQUFDQSxXQUFXQSxDQUFDQSxJQUFJQSxFQUFFQSxDQUFDQSxJQUFJQSxDQUFDQTt3QkFDOUNBLEVBQUVBLENBQUNBLENBQUNBLFFBQVFBLElBQUlBLFFBQVFBLENBQUNBLFFBQVFBLENBQUNBLE9BQU9BLENBQUNBLENBQUNBLENBQUNBLENBQUNBOzRCQUUzQ0EsMEJBQTBCQSxDQUFDQSxNQUFNQSxDQUFDQSxXQUFXQSxDQUFDQSxNQUFNQSxDQUFDQSxXQUFXQSxDQUFDQSxNQUFNQSxHQUFHQSxDQUFDQSxDQUFDQSxFQUFFQSxnQkFBZ0JBLENBQUNBLENBQUNBO3dCQUNsR0EsQ0FBQ0E7b0JBQ0hBLENBQUNBO2dCQUNIQSxDQUFDQTtnQkFlREEsSUFBSUEsSUFBSUEsR0FBVUEsSUFBSUEsQ0FBQ0E7Z0JBQ3ZCQSxFQUFFQSxDQUFDQSxDQUFDQSxHQUFHQSxDQUFDQSxVQUFVQSxDQUFDQSxlQUFlQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtvQkFFcENBLElBQUlBLEdBQUdBLENBQUNBLFlBQVlBLENBQUNBLFVBQVVBLENBQUNBLElBQUlBLEVBQUVBLENBQUNBLENBQUNBLFNBQVNBLENBQUNBLENBQUNBLEVBQUVBLENBQUNBLENBQUNBLElBQUlBLFNBQVNBLENBQUNBO29CQUNyRUEsTUFBTUEsQ0FBQ0EsV0FBV0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsRUFBQ0EsSUFBSUEsRUFBRUEsR0FBR0EsR0FBR0EsR0FBR0EsRUFBRUEsSUFBSUEsRUFBRUEsSUFBSUEsRUFBQ0EsQ0FBQ0EsQ0FBQ0E7Z0JBQ3pEQSxDQUFDQTtnQkFDREEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsVUFBVUEsQ0FBQ0EsWUFBWUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7b0JBRWpDQSxJQUFJQSxFQUFFQSxHQUFHQSxDQUFDQSxZQUFZQSxDQUFDQSxVQUFVQSxDQUFDQSxJQUFJQSxFQUFFQSxDQUFDQSxDQUFDQSxTQUFTQSxDQUFDQSxDQUFDQSxFQUFFQSxDQUFDQSxDQUFDQSxDQUFDQTtvQkFDMURBLElBQUlBLEVBQUVBLEdBQUdBLENBQUNBLFlBQVlBLENBQUNBLGNBQWNBLENBQUNBLElBQUlBLEVBQUVBLENBQUNBLENBQUNBLFNBQVNBLENBQUNBLENBQUNBLEVBQUVBLENBQUNBLENBQUNBLENBQUNBO29CQUM5REEsSUFBSUEsR0FBR0EsTUFBTUEsQ0FBQ0E7b0JBQ2RBLEVBQUVBLENBQUNBLENBQUNBLEVBQUVBLENBQUNBLENBQUNBLENBQUNBO3dCQUNQQSxFQUFFQSxDQUFDQSxDQUFDQSxFQUFFQSxDQUFDQSxDQUFDQSxDQUFDQTs0QkFDUEEsSUFBSUEsSUFBSUEsR0FBR0EsR0FBR0EsRUFBRUEsR0FBR0EsR0FBR0EsR0FBR0EsRUFBRUEsQ0FBQ0E7d0JBQzlCQSxDQUFDQTt3QkFBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0E7NEJBQ05BLElBQUlBLElBQUlBLEdBQUdBLEdBQUdBLEVBQUVBLENBQUNBO3dCQUNuQkEsQ0FBQ0E7b0JBQ0hBLENBQUNBO29CQUNEQSxNQUFNQSxDQUFDQSxXQUFXQSxDQUFDQSxJQUFJQSxDQUFDQSxFQUFDQSxJQUFJQSxFQUFFQSxHQUFHQSxHQUFHQSxHQUFHQSxFQUFFQSxJQUFJQSxFQUFFQSxJQUFJQSxFQUFDQSxDQUFDQSxDQUFDQTtnQkFDekRBLENBQUNBO2dCQUNEQSxJQUFJQSxDQUFDQSxNQUFNQSxDQUFDQSxNQUFNQSxDQUFDQSxDQUFDQTtZQUN0QkEsQ0FBQ0E7UUFDSHpFLENBQUNBLENBQUNBLENBQUNBLENBQUNBO0FBQ05BLENBQUNBLEVBMUtNLElBQUksS0FBSixJQUFJLFFBMEtWOztBQ2pMRCxxQ0FBcUM7QUFDckMsSUFBTyxJQUFJLENBMElWO0FBMUlELFdBQU8sSUFBSSxFQUFDLENBQUM7SUFDWEEsWUFBT0EsQ0FBQ0EsVUFBVUEsQ0FBQ0Esd0JBQXdCQSxFQUFFQSxVQUFDQSxNQUFNQSxFQUFFQSxTQUFTQSxFQUFFQSxZQUFZQTtRQUMzRUEsSUFBSUEsQ0FBQ0EsU0FBU0EsQ0FBQ0EsTUFBTUEsRUFBRUEsWUFBWUEsRUFBRUEsU0FBU0EsQ0FBQ0EsQ0FBQ0E7UUFDaERBLE1BQU1BLENBQUNBLGlCQUFpQkEsR0FBR0EsSUFBSUEsQ0FBQ0E7UUFDaENBLE1BQU1BLENBQUNBLFdBQVdBLEdBQUdBLEdBQUdBLENBQUNBO1FBQ3pCQSxNQUFNQSxDQUFDQSxjQUFjQSxHQUFHQSxHQUFHQSxDQUFDQTtRQUM1QkEsTUFBTUEsQ0FBQ0EsbUJBQW1CQSxHQUFHQTtZQUMzQkEsT0FBT0EsRUFBRUEsY0FBTUEsT0FBQUEsbUJBQW1CQSxFQUFuQkEsQ0FBbUJBO1lBQ2xDQSxhQUFhQSxFQUFFQSxVQUFDQSxLQUFXQSxFQUFFQSxhQUFvQkEsRUFBRUEsRUFBRUE7Z0JBQ25EQSxNQUFNQSxDQUFDQSxJQUFJQSxDQUFDQTtZQUNkQSxDQUFDQTtZQUNEQSxnQkFBZ0JBLEVBQUVBLFVBQUNBLEtBQWdDQSxFQUFFQSxFQUFFQTtnQkFDckRBLE1BQU1BLENBQUNBLElBQUlBLENBQUNBO1lBQ2RBLENBQUNBO1lBQ0RBLGFBQWFBLEVBQUVBLFVBQUNBLEVBQW1EQTtnQkFDakVBLFFBQUdBLENBQUNBLEtBQUtBLENBQUNBLHNCQUFzQkEsQ0FBQ0EsQ0FBQ0E7Z0JBQ2xDQSxVQUFVQSxDQUFDQTtvQkFDVEEsRUFBRUEsQ0FBQ0EsQ0FBQ0E7NEJBQ0ZBLEtBQUtBLEVBQUVBLE1BQU1BOzRCQUNiQSxFQUFFQSxFQUFFQSxHQUFHQTs0QkFDUEEsS0FBS0EsRUFBRUEsTUFBTUE7NEJBQ2JBLE9BQU9BLEVBQUVBLENBQUNBO29DQUNSQSxHQUFHQSxFQUFFQSxDQUFDQTtvQ0FDTkEsRUFBRUEsRUFBRUEsSUFBSUE7b0NBQ1JBLE9BQU9BLEVBQUVBLDRDQUE0Q0E7b0NBQ3JEQSxJQUFJQSxFQUFFQSxTQUFTQSxDQUFDQSxJQUFJQSxFQUFFQTtvQ0FDdEJBLEdBQUdBLEVBQUVBLENBQUNBO29DQUNOQSxNQUFNQSxFQUFFQSxTQUFTQSxDQUFDQSxNQUFNQSxFQUFFQTtvQ0FDMUJBLE1BQU1BLEVBQUVBLENBQUNBO29DQUNUQSxNQUFNQSxFQUFFQSxDQUFDQTtvQ0FDVEEsS0FBS0EsRUFBRUEsU0FBU0E7aUNBQ2pCQSxDQUFDQTt5QkFDSEEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0JBQ05BLENBQUNBLEVBQUVBLElBQUlBLENBQUNBLENBQUNBO1lBRVhBLENBQUNBO1lBQ0RBLFlBQVlBLEVBQUVBLFVBQUNBLEVBQVNBLEVBQUVBLEVBQTRDQTtnQkFDcEVBLE1BQU1BLENBQUNBLE1BQU1BLENBQUNBLGVBQWVBLEVBQUVBLFVBQUNBLE9BQU9BO29CQUNyQ0EsRUFBRUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsT0FBT0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7d0JBQ2JBLE1BQU1BLENBQUNBO29CQUNUQSxDQUFDQTtvQkFDREEsTUFBTUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsZUFBZUEsRUFBRUEsVUFBQ0EsS0FBS0E7d0JBQ25DQSxFQUFFQSxDQUFDQSxDQUFDQSxDQUFDQSxLQUFLQSxDQUFDQSxDQUFDQSxDQUFDQTs0QkFDWEEsTUFBTUEsQ0FBQ0E7d0JBQ1RBLENBQUNBO3dCQUNEQSxNQUFNQSxDQUFDQSxNQUFNQSxDQUFDQSxRQUFRQSxFQUFFQSxVQUFDQSxNQUFNQTs0QkFDN0JBLEVBQUVBLENBQUNBLENBQUNBLENBQUNBLE1BQU1BLENBQUNBLENBQUNBLENBQUNBO2dDQUNaQSxNQUFNQSxDQUFDQTs0QkFDVEEsQ0FBQ0E7NEJBQ0RBLElBQUlBLEtBQUtBLEdBQUdBLE1BQU1BLENBQUNBLEtBQUtBLENBQUNBLE9BQU9BLENBQUNBLENBQUNBOzRCQUNsQ0EsT0FBT0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsU0FBU0EsRUFBRUEsS0FBS0EsQ0FBQ0EsQ0FBQ0E7NEJBQzlCQSxPQUFPQSxDQUFDQSxHQUFHQSxDQUFDQSxTQUFTQSxFQUFFQSxLQUFLQSxDQUFDQSxDQUFDQTs0QkFDOUJBLE9BQU9BLENBQUNBLEdBQUdBLENBQUNBLFVBQVVBLEVBQUVBLE1BQU1BLENBQUNBLENBQUNBOzRCQUNoQ0EsVUFBVUEsQ0FBQ0E7Z0NBQ1RBLElBQUlBLE1BQU1BLEdBQXlCQTtvQ0FDbkNBLFNBQVNBLEVBQUVBLE1BQU1BLENBQUNBLFNBQVNBO29DQUMzQkEsU0FBU0EsRUFBRUEsTUFBTUEsQ0FBQ0EsU0FBU0E7b0NBQzNCQSxLQUFLQSxFQUFFQSxNQUFNQSxDQUFDQSxLQUFLQTtvQ0FDbkJBLE1BQU1BLEVBQUVBLE1BQU1BLENBQUNBLE1BQU1BO29DQUNyQkEsR0FBR0EsRUFBRUEsS0FBS0EsQ0FBQ0EsTUFBTUE7b0NBQ2pCQSxFQUFFQSxFQUFFQSxNQUFNQSxDQUFDQSxTQUFTQTtvQ0FDcEJBLEtBQUtBLEVBQUVBLEtBQUtBLENBQUNBLEVBQUVBO2lDQUVkQSxDQUFDQTtnQ0FDRkEsSUFBSUEsU0FBU0EsR0FBR0E7b0NBQ2RBLEtBQUtBLEVBQUVBLE1BQU1BO29DQUNiQSxFQUFFQSxFQUFFQSxHQUFHQTtvQ0FDUEEsS0FBS0EsRUFBRUEsTUFBTUE7b0NBQ2JBLE9BQU9BLEVBQUVBO3dDQUNUQTs0Q0FDRUEsR0FBR0EsRUFBRUEsQ0FBQ0E7NENBQ05BLEdBQUdBLEVBQUVBLENBQUNBOzRDQUNOQSxFQUFFQSxFQUFFQSxJQUFJQTs0Q0FDUkEsT0FBT0EsRUFBRUEsK0NBQStDQTs0Q0FDeERBLElBQUlBLEVBQUVBLFNBQVNBLENBQUNBLElBQUlBLEVBQUVBOzRDQUN0QkEsTUFBTUEsRUFBRUEsTUFBTUE7NENBQ2RBLE1BQU1BLEVBQUVBLENBQUNBOzRDQUNUQSxNQUFNQSxFQUFFQSxDQUFDQTs0Q0FDVEEsS0FBS0EsRUFBRUEsV0FBV0E7eUNBQ25CQTt3Q0FDREE7NENBQ0VBLEdBQUdBLEVBQUVBLENBQUNBOzRDQUNOQSxHQUFHQSxFQUFFQSxDQUFDQTs0Q0FDTkEsRUFBRUEsRUFBRUEsSUFBSUE7NENBQ1JBLE9BQU9BLEVBQUVBLHNDQUFzQ0E7NENBQy9DQSxJQUFJQSxFQUFFQSxTQUFTQSxDQUFDQSxJQUFJQSxFQUFFQTs0Q0FDdEJBLE1BQU1BLEVBQUVBLE1BQU1BOzRDQUNkQSxNQUFNQSxFQUFFQSxDQUFDQTs0Q0FDVEEsTUFBTUEsRUFBRUEsQ0FBQ0E7NENBQ1RBLEtBQUtBLEVBQUVBLGdCQUFnQkEsR0FBR0EsS0FBS0EsQ0FBQ0EsTUFBTUEsR0FBR0EsVUFBVUEsR0FBR0EsS0FBS0EsQ0FBQ0EsRUFBRUE7eUNBQy9EQTt3Q0FDREE7NENBQ0VBLEdBQUdBLEVBQUVBLENBQUNBOzRDQUNOQSxFQUFFQSxFQUFFQSxJQUFJQTs0Q0FDUkEsT0FBT0EsRUFBRUEsNENBQTRDQTs0Q0FDckRBLElBQUlBLEVBQUVBLFNBQVNBLENBQUNBLElBQUlBLEVBQUVBOzRDQUN0QkEsR0FBR0EsRUFBRUEsQ0FBQ0E7NENBQ05BLE1BQU1BLEVBQUVBLE1BQU1BOzRDQUNkQSxNQUFNQSxFQUFFQSxDQUFDQTs0Q0FDVEEsTUFBTUEsRUFBRUEsQ0FBQ0E7NENBQ1RBLEtBQUtBLEVBQUVBLFNBQVNBO3lDQUNqQkE7cUNBQ0FBO2lDQUNGQSxDQUFDQTtnQ0FDRkEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsWUFBWUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7b0NBQy9CQSxJQUFJQSxXQUFXQSxHQUFHQSxDQUFDQSxDQUFDQTtvQ0FDcEJBLENBQUNBLENBQUNBLE9BQU9BLENBQUNBLE1BQU1BLENBQUNBLFlBQVlBLEVBQUVBLFVBQUNBLEdBQU9BLEVBQUVBLEtBQUtBO3dDQUM1Q0EsSUFBSUEsQ0FBQ0EsR0FBeUJBLENBQUNBLENBQUNBLE1BQU1BLENBQUNBOzRDQUNyQ0EsS0FBS0EsRUFBRUEsR0FBR0EsQ0FBQ0EsS0FBS0E7eUNBQ2pCQSxFQUFFQSxNQUFNQSxDQUFDQSxDQUFDQTt3Q0FDWEEsU0FBU0EsQ0FBQ0EsT0FBT0EsQ0FBQ0EsSUFBSUEsQ0FBQ0E7NENBQ3JCQSxFQUFFQSxFQUFFQSxHQUFHQSxDQUFDQSxHQUFHQTs0Q0FDWEEsS0FBS0EsRUFBRUEsZUFBZUEsR0FBR0EsR0FBR0EsQ0FBQ0EsS0FBS0E7NENBQ2xDQSxNQUFNQSxFQUFFQSxDQUFDQTs0Q0FDVEEsTUFBTUEsRUFBRUEsQ0FBQ0E7NENBQ1RBLEdBQUdBLEVBQUVBLFdBQVdBOzRDQUNoQkEsR0FBR0EsRUFBRUEsQ0FBQ0E7NENBQ05BLE9BQU9BLEVBQUVBLDhDQUE4Q0E7NENBQ3ZEQSxJQUFJQSxFQUFFQSxTQUFTQSxDQUFDQSxJQUFJQSxFQUFFQTs0Q0FDdEJBLE1BQU1BLEVBQUVBLENBQUNBO3lDQUNWQSxDQUFDQSxDQUFDQTt3Q0FDSEEsV0FBV0EsR0FBR0EsV0FBV0EsR0FBR0EsQ0FBQ0EsQ0FBQ0E7b0NBQ2hDQSxDQUFDQSxDQUFDQSxDQUFDQTtnQ0FDTEEsQ0FBQ0E7Z0NBRURBLEVBQUVBLENBQUNBLFNBQVNBLENBQUNBLENBQUNBOzRCQUNoQkEsQ0FBQ0EsRUFBRUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7d0JBQ1JBLENBQUNBLENBQUNBLENBQUNBO29CQUNMQSxDQUFDQSxDQUFDQSxDQUFDQTtnQkFDTEEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7WUFDTEEsQ0FBQ0E7WUFDREEsZUFBZUEsRUFBRUEsVUFBQ0EsT0FBV0E7WUFFN0JBLENBQUNBO1NBQ0ZBLENBQUNBO0lBR0pBLENBQUNBLENBQUNBLENBQUNBO0FBQ0xBLENBQUNBLEVBMUlNLElBQUksS0FBSixJQUFJLFFBMElWOztBQzNJRCx5Q0FBeUM7QUFDekMsc0NBQXNDO0FBQ3RDLHFDQUFxQztBQUtyQyxJQUFPLElBQUksQ0EybUJWO0FBM21CRCxXQUFPLElBQUksRUFBQyxDQUFDO0lBR0FBLG1CQUFjQSxHQUFHQSxZQUFPQSxDQUFDQSxVQUFVQSxDQUFDQSxxQkFBcUJBLEVBQUVBLENBQUNBLFFBQVFBLEVBQUVBLFdBQVdBLEVBQUVBLGNBQWNBLEVBQUVBLFFBQVFBLEVBQUVBLE9BQU9BLEVBQUVBLFVBQVVBLEVBQUVBLFFBQVFBLEVBQUVBLDJCQUEyQkEsRUFBR0EsVUFBVUEsRUFBRUEsZ0JBQWdCQSxFQUFFQSxjQUFjQSxFQUFFQSxjQUFjQSxFQUFFQSxTQUFTQSxFQUFFQSxVQUFDQSxNQUFNQSxFQUFFQSxTQUE2QkEsRUFBRUEsWUFBeUNBLEVBQUVBLE1BQTZCQSxFQUFFQSxLQUFxQkEsRUFBRUEsUUFBMkJBLEVBQUVBLE1BQU1BLEVBQUVBLHlCQUF5QkEsRUFBR0EsUUFBMkJBLEVBQUVBLGNBQXVDQSxFQUFFQSxZQUFZQSxFQUFFQSxZQUFtQ0EsRUFBRUEsT0FBT0E7WUFFdGtCQSxNQUFNQSxDQUFDQSxJQUFJQSxHQUFHQSxvQkFBb0JBLENBQUNBO1lBR25DQSxJQUFJQSxLQUFLQSxHQUFHQSxLQUFLQSxDQUFDQTtZQUVsQkEsSUFBSUEsQ0FBQ0EsU0FBU0EsQ0FBQ0EsTUFBTUEsRUFBRUEsWUFBWUEsRUFBRUEsU0FBU0EsQ0FBQ0EsQ0FBQ0E7WUFDaERBLElBQUlBLGNBQWNBLEdBQUdBLE1BQU1BLENBQUNBLGNBQWNBLENBQUNBO1lBRTNDQSxnQkFBZ0JBLENBQUNBLFFBQVFBLENBQUNBLE1BQU1BLENBQUNBLENBQUNBO1lBRWxDQSxNQUFNQSxDQUFDQSxjQUFjQSxHQUFHQSxrQkFBa0JBLENBQUNBO1lBRTNDQSxNQUFNQSxDQUFDQSxTQUFTQSxHQUFHQSxNQUFNQSxDQUFDQSxNQUFNQSxDQUFDQTtZQUVqQ0EsTUFBTUEsQ0FBQ0EsWUFBWUEsR0FBR0EsRUFBRUEsQ0FBQ0E7WUFFekJBLE1BQU1BLENBQUNBLFNBQVNBLEdBQUdBLEVBQUVBLENBQUNBO1lBQ3RCQSxNQUFNQSxDQUFDQSxpQkFBaUJBLEdBQUdBLEtBQUtBLENBQUNBO1lBQ2pDQSxNQUFNQSxDQUFDQSxhQUFhQSxHQUFHQSxLQUFLQSxDQUFDQTtZQUU3QkEsTUFBTUEsQ0FBQ0EsZ0JBQWdCQSxHQUFHQSxDQUFDQSxDQUFDQTtZQUM1QkEsTUFBTUEsQ0FBQ0EsWUFBWUEsR0FBZ0JBLElBQUlBLENBQUNBO1lBQ3hDQSxNQUFNQSxDQUFDQSxVQUFVQSxHQUFnQkEsSUFBSUEsQ0FBQ0E7WUFDdENBLE1BQU1BLENBQUNBLFlBQVlBLEdBQWdCQSxJQUFJQSxDQUFDQTtZQUN4Q0EsTUFBTUEsQ0FBQ0EsTUFBTUEsR0FBR0EsS0FBS0EsQ0FBQ0E7WUFFdEJBLE1BQU1BLENBQUNBLE1BQU1BLEdBQUdBO2dCQUNkQSxXQUFXQSxFQUFFQSxFQUFFQTthQUNoQkEsQ0FBQ0E7WUFDRkEsTUFBTUEsQ0FBQ0EsSUFBSUEsR0FBR0E7Z0JBQ1pBLFVBQVVBLEVBQUVBLEVBQUVBO2FBQ2ZBLENBQUNBO1lBQ0ZBLE1BQU1BLENBQUNBLFFBQVFBLEdBQUdBLElBQUlBLENBQUNBLFFBQVFBLENBQUNBO1lBR2hDQSxJQUFJQSxDQUFDQSxzQkFBc0JBLENBQUNBLE1BQU1BLEVBQUVBLFNBQVNBLEVBQUVBLFlBQVlBLEVBQUVBLEdBQUdBLEVBQUVBLEVBQUVBLENBQUNBLENBQUNBO1lBRXRFQSxjQUFjQSxDQUFDQSx1QkFBdUJBLENBQUNBO2dCQUNyQ0EsTUFBTUEsRUFBRUEsTUFBTUE7Z0JBQ2RBLFNBQVNBLEVBQUVBLFNBQVNBO2dCQUNwQkEsWUFBWUEsRUFBRUEsWUFBWUE7Z0JBQzFCQSxTQUFTQSxFQUFFQSxNQUFNQTtnQkFDakJBLFNBQVNBLEVBQUVBLGNBQWNBO2dCQUN6QkEsWUFBWUEsRUFBRUEsSUFBSUEsQ0FBQ0EsUUFBUUEsQ0FBQ0EsSUFBSUE7Z0JBQ2hDQSxFQUFFQSxFQUFFQSxJQUFJQSxDQUFDQSxjQUFjQTtnQkFDdkJBLElBQUlBLEVBQUVBLElBQUlBLENBQUNBLGFBQWFBO2FBQ3pCQSxDQUFDQSxDQUFDQTtZQUdIQSxJQUFJQSxDQUFDQSwwQkFBMEJBLENBQUNBLE1BQU1BLEVBQUVBLE1BQU1BLEVBQUVBLFNBQVNBLEVBQUVBLENBQUNBLGNBQWNBLENBQUNBLENBQUNBLENBQUNBO1lBRTdFQSxNQUFNQSxDQUFDQSxXQUFXQSxHQUFHQTtnQkFDbkJBLElBQUlBLEVBQUVBLFVBQVVBO2dCQUNoQkEsYUFBYUEsRUFBRUEsS0FBS0E7Z0JBQ3BCQSxhQUFhQSxFQUFFQSxFQUFFQTtnQkFDakJBLHFCQUFxQkEsRUFBRUEsSUFBSUE7Z0JBQzNCQSxhQUFhQSxFQUFFQSxLQUFLQTtnQkFDcEJBLGtCQUFrQkEsRUFBRUEsSUFBSUE7Z0JBQ3hCQSxVQUFVQSxFQUFFQTtvQkFDVkE7d0JBQ0VBLEtBQUtBLEVBQUVBLE1BQU1BO3dCQUNiQSxXQUFXQSxFQUFFQSxNQUFNQTt3QkFDbkJBLFlBQVlBLEVBQUVBLGNBQWNBLENBQUNBLEdBQUdBLENBQUNBLHVCQUF1QkEsQ0FBQ0E7d0JBQ3pEQSxrQkFBa0JBLEVBQUVBLGNBQWNBLENBQUNBLEdBQUdBLENBQUNBLHlCQUF5QkEsQ0FBQ0E7cUJBQ2xFQTtpQkFDRkE7YUFDRkEsQ0FBQ0E7WUFFRkEsTUFBTUEsQ0FBQ0EsR0FBR0EsQ0FBQ0Esa0JBQWtCQSxFQUFFQSxVQUFDQSxNQUFNQSxFQUFFQSxJQUFrQkE7Z0JBQ3hEQSxNQUFNQSxDQUFDQSxJQUFJQSxHQUFHQSxJQUFJQSxDQUFDQTtnQkFDbkJBLE1BQU1BLENBQUFBLENBQUNBLElBQUlBLENBQUNBLENBQUNBLENBQUNBO29CQUNaQSxLQUFLQSxhQUFRQSxDQUFDQSxJQUFJQTt3QkFDaEJBLFFBQUdBLENBQUNBLEtBQUtBLENBQUNBLGdCQUFnQkEsQ0FBQ0EsQ0FBQ0E7d0JBQzVCQSxLQUFLQSxDQUFDQTtvQkFDUkEsS0FBS0EsYUFBUUEsQ0FBQ0EsSUFBSUE7d0JBQ2hCQSxRQUFHQSxDQUFDQSxLQUFLQSxDQUFDQSxnQkFBZ0JBLENBQUNBLENBQUNBO3dCQUM1QkEsS0FBS0EsQ0FBQ0E7b0JBQ1JBO3dCQUNFQSxNQUFNQSxDQUFDQSxJQUFJQSxHQUFHQSxhQUFRQSxDQUFDQSxJQUFJQSxDQUFDQTt3QkFDNUJBLFFBQUdBLENBQUNBLEtBQUtBLENBQUNBLDhCQUE4QkEsQ0FBQ0EsQ0FBQ0E7d0JBQzFDQSxLQUFLQSxDQUFDQTtnQkFDVkEsQ0FBQ0E7WUFDSEEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7WUFHSEEsTUFBTUEsQ0FBQ0EsWUFBWUEsR0FBR0EsRUFBRUEsQ0FBQ0E7WUFFekJBLElBQUlBLGVBQWVBLEdBQUdBLElBQUlBLENBQUNBLFNBQVNBLENBQUNBLFVBQVVBLEVBQUVBLElBQUlBLENBQUNBLENBQUNBO1lBRXZEQSxNQUFNQSxDQUFDQSxNQUFNQSxHQUFHQSxVQUFDQSxJQUFJQTtnQkFDbkJBLEVBQUVBLENBQUNBLENBQUNBLElBQUlBLENBQUNBLENBQUNBLENBQUNBO29CQUNUQSxNQUFNQSxDQUFDQSxNQUFNQSxDQUFDQSxJQUFJQSxDQUFDQSxDQUFDQTtnQkFDdEJBLENBQUNBO2dCQUFDQSxJQUFJQSxDQUFDQSxDQUFDQTtvQkFDTkEsTUFBTUEsQ0FBQ0EsRUFBRUEsQ0FBQ0E7Z0JBQ1pBLENBQUNBO1lBQ0hBLENBQUNBLENBQUNBO1lBR0ZBLE1BQU1BLENBQUNBLEdBQUdBLENBQUNBLHFCQUFxQkEsRUFBRUE7Z0JBQ2hDLFVBQVUsRUFBRSxDQUFDO1lBQ2YsQ0FBQyxDQUFDQSxDQUFDQTtZQUVIQSxNQUFNQSxDQUFDQSxtQkFBbUJBLEdBQUdBO2dCQUMzQkEsSUFBSUEsSUFBSUEsR0FBR0EsaUNBQWlDQSxDQUFDQTtnQkFDN0NBLElBQUlBLElBQUlBLEdBQUdBLFlBQVlBLENBQUNBLE1BQU1BLENBQUNBLENBQUNBO2dCQUNoQ0EsSUFBSUEsS0FBS0EsR0FBR0EsSUFBSUEsR0FBR0EsSUFBSUEsQ0FBQ0EsS0FBS0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsSUFBSUEsRUFBRUEsR0FBR0EsSUFBSUEsQ0FBQ0E7Z0JBQ2pEQSxJQUFJQSxJQUFJQSxHQUFHQSxPQUFPQSxDQUFDQSxNQUFNQSxDQUFDQTtvQkFDeEJBLE1BQU1BLEVBQUVBLENBQUNBO29CQUNUQSxNQUFNQSxFQUFFQSxDQUFDQTtpQkFDVkEsQ0FBQ0EsQ0FBQ0E7Z0JBQ0hBLElBQUlBLE1BQU1BLEdBQUdBLCtCQUErQkE7b0JBQzFDQSxRQUFRQSxHQUFHQSxrQkFBa0JBLENBQUNBLElBQUlBLENBQUNBO29CQUNuQ0EsUUFBUUEsR0FBR0Esa0JBQWtCQSxDQUFDQSxJQUFJQSxDQUFDQTtvQkFDbkNBLGVBQWVBLEdBQUdBLGtCQUFrQkEsQ0FBQ0EsT0FBT0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsWUFBWUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0JBQ3JFQSxFQUFFQSxDQUFDQSxDQUFDQSxLQUFLQSxDQUFDQSxDQUFDQSxDQUFDQTtvQkFDVkEsTUFBTUEsSUFBSUEsU0FBU0EsR0FBR0Esa0JBQWtCQSxDQUFDQSxLQUFLQSxDQUFDQSxDQUFDQTtnQkFDbERBLENBQUNBO2dCQUNEQSxNQUFNQSxDQUFDQSxNQUFNQSxDQUFDQTtZQUNoQkEsQ0FBQ0EsQ0FBQ0E7WUFFRkEsTUFBTUEsQ0FBQ0EsWUFBWUEsR0FBR0E7Z0JBQ3BCQSxFQUFFQSxDQUFDQSxDQUFDQSxDQUFDQSxNQUFNQSxDQUFDQSxRQUFRQSxJQUFJQSxNQUFNQSxDQUFDQSxRQUFRQSxDQUFDQSxNQUFNQSxLQUFLQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtvQkFDckRBLE1BQU1BLENBQUNBLEVBQUVBLENBQUNBO2dCQUNaQSxDQUFDQTtnQkFDREEsTUFBTUEsQ0FBQ0EsT0FBT0EsQ0FBQ0E7WUFDakJBLENBQUNBLENBQUNBO1lBRUZBLE1BQU1BLENBQUNBLFVBQVVBLEdBQUdBO2dCQUNsQkEsSUFBSUEsS0FBS0EsR0FBR0EsY0FBU0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0E7Z0JBQzlCQSxJQUFJQSxNQUFNQSxHQUFHQSxLQUFLQSxHQUFHQSxPQUFPQSxDQUFDQTtnQkFFN0JBLElBQUlBLEtBQUtBLEdBQUdBLE1BQU1BLENBQUNBLE1BQU1BLENBQUNBLEtBQUtBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBO2dCQUVyQ0EsSUFBSUEsSUFBSUEsR0FBR0EsR0FBR0EsR0FBR0EsS0FBS0EsQ0FBQ0EsS0FBS0EsQ0FBQ0EsS0FBS0EsQ0FBQ0EsTUFBTUEsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0E7Z0JBRXpEQSxNQUFNQSxDQUFDQSxJQUFJQSxDQUFDQSxVQUFVQSxDQUFDQSxTQUFTQSxFQUFFQSxNQUFNQSxHQUFHQSxJQUFJQSxFQUFFQSxFQUFFQSxDQUFDQSxDQUFDQTtZQUN2REEsQ0FBQ0EsQ0FBQ0E7WUFHRkEsTUFBTUEsQ0FBQ0EsU0FBU0EsR0FBR0EsVUFBQ0EsS0FBS0E7Z0JBQ3ZCQSxJQUFJQSxLQUFLQSxHQUFHQSxjQUFTQSxDQUFDQSxNQUFNQSxDQUFDQSxDQUFDQTtnQkFDOUJBLElBQUlBLE1BQU1BLEdBQUdBLEtBQUtBLEdBQUdBLE9BQU9BLENBQUNBO2dCQUM3QkEsSUFBSUEsT0FBT0EsR0FBR0EsRUFBRUEsQ0FBQ0E7Z0JBQ2pCQSxJQUFJQSxJQUFJQSxHQUFHQSxJQUFJQSxDQUFDQSxVQUFVQSxDQUFDQSxLQUFLQSxDQUFDQSxJQUFJQSxDQUFDQSxDQUFDQTtnQkFDdkNBLEVBQUVBLENBQUNBLENBQUNBLEtBQUtBLENBQUNBLFNBQVNBLENBQUNBLENBQUNBLENBQUNBO29CQUVwQkEsSUFBSUEsUUFBUUEsR0FBR0EsSUFBSUEsR0FBR0EsT0FBT0EsQ0FBQ0E7b0JBQzlCQSxJQUFJQSxRQUFRQSxHQUFHQSxNQUFNQSxDQUFDQSxRQUFRQSxDQUFDQTtvQkFDL0JBLEVBQUVBLENBQUNBLENBQUNBLFFBQVFBLENBQUNBLENBQUNBLENBQUNBO3dCQUNiQSxJQUFJQSxRQUFRQSxHQUFHQSxRQUFRQSxDQUFDQSxJQUFJQSxDQUFDQSxVQUFDQSxLQUFLQTs0QkFDakNBLE1BQU1BLENBQUNBLEtBQUtBLENBQUNBLE1BQU1BLENBQUNBLEtBQUtBLFFBQVFBLENBQUNBO3dCQUNwQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7d0JBQ0hBLEVBQUVBLENBQUNBLENBQUNBLFFBQVFBLENBQUNBLENBQUNBLENBQUNBOzRCQUNiQSxNQUFNQSxHQUFHQSxLQUFLQSxHQUFHQSxZQUFZQSxDQUFDQTs0QkFDOUJBLE9BQU9BLEdBQUdBLFFBQVFBLEdBQUdBLFFBQVFBLENBQUNBO3dCQUNoQ0EsQ0FBQ0E7b0JBQ0hBLENBQUNBO2dCQUNIQSxDQUFDQTtnQkFBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0E7b0JBQ05BLElBQUlBLGFBQWFBLEdBQUdBLEtBQUtBLENBQUNBLGNBQWNBLElBQUlBLEtBQUtBLENBQUNBLGFBQWFBLENBQUNBO29CQUNoRUEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsYUFBYUEsSUFBSUEsYUFBYUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7d0JBQzFDQSxFQUFFQSxDQUFDQSxDQUFDQSxhQUFhQSxDQUFDQSxHQUFHQSxDQUFDQSxVQUFDQSxFQUFFQSxJQUFLQSxPQUFBQSxJQUFJQSxDQUFDQSxlQUFlQSxDQUFDQSxHQUFHQSxDQUFDQSxFQUFFQSxDQUFDQSxFQUE1QkEsQ0FBNEJBLENBQUNBLENBQUNBLENBQUNBLENBQUNBOzRCQUM1REEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsNEJBQXVCQSxDQUFDQSxDQUFDQSxDQUFDQTtnQ0FDNUJBLE1BQU1BLEdBQUdBLEtBQUtBLEdBQUdBLGVBQWVBLENBQUNBOzRCQUNuQ0EsQ0FBQ0E7NEJBQUNBLElBQUlBLENBQUNBLENBQUNBO2dDQUNOQSxNQUFNQSxHQUFHQSxLQUFLQSxHQUFHQSxtQkFBbUJBLENBQUNBOzRCQUN2Q0EsQ0FBQ0E7d0JBQ0hBLENBQUNBO3dCQUFDQSxJQUFJQSxDQUFDQSxFQUFFQSxDQUFDQSxDQUFDQSxhQUFhQSxDQUFDQSxHQUFHQSxDQUFDQSxVQUFDQSxFQUFFQSxJQUFLQSxPQUFBQSxJQUFJQSxDQUFDQSxlQUFlQSxDQUFDQSxHQUFHQSxDQUFDQSxFQUFFQSxDQUFDQSxFQUE1QkEsQ0FBNEJBLENBQUNBLENBQUNBLENBQUNBLENBQUNBOzRCQUNuRUEsTUFBTUEsR0FBR0EsS0FBS0EsR0FBR0EsaUJBQWlCQSxDQUFDQTt3QkFDckNBLENBQUNBO3dCQUFDQSxJQUFJQSxDQUFDQSxDQUFDQTs0QkFDTkEsUUFBR0EsQ0FBQ0EsS0FBS0EsQ0FBQ0EsUUFBUUEsR0FBR0EsSUFBSUEsR0FBR0Esa0JBQWtCQSxHQUFHQSxhQUFhQSxDQUFDQSxDQUFDQTt3QkFDbEVBLENBQUNBO29CQUNIQSxDQUFDQTtvQkFDREEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsS0FBS0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsUUFBUUEsQ0FBQ0EsT0FBT0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7d0JBQ2pDQSxPQUFPQSxHQUFHQSxTQUFTQSxDQUFDQTtvQkFDdEJBLENBQUNBO29CQUFDQSxJQUFJQSxDQUFDQSxFQUFFQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSxXQUFXQSxDQUFDQSxLQUFLQSxDQUFDQSxJQUFJQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTt3QkFFeENBLE1BQU1BLEdBQUdBLEtBQUtBLEdBQUdBLE9BQU9BLENBQUNBO29CQUMzQkEsQ0FBQ0E7Z0JBQ0hBLENBQUNBO2dCQUNEQSxNQUFNQSxDQUFDQSxJQUFJQSxDQUFDQSxVQUFVQSxDQUFDQSxTQUFTQSxFQUFFQSxVQUFVQSxDQUFDQSxJQUFJQSxDQUFDQSxNQUFNQSxFQUFFQSxJQUFJQSxDQUFDQSxHQUFHQSxPQUFPQSxFQUFFQSxDQUFDQSxNQUFNQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUN2RkEsQ0FBQ0EsQ0FBQ0E7WUFFRkEsTUFBTUEsQ0FBQ0EsUUFBUUEsR0FBR0EsVUFBQ0EsTUFBTUE7Z0JBQ3ZCQSxNQUFNQSxDQUFDQSxJQUFJQSxDQUFDQSxzQkFBc0JBLENBQUNBLE1BQU1BLENBQUNBLFdBQVdBLElBQUlBLE1BQU1BLENBQUNBLElBQUlBLENBQUNBLENBQUNBO1lBQ3hFQSxDQUFDQSxDQUFDQTtZQUVGQSxNQUFNQSxDQUFDQSxTQUFTQSxHQUFHQSxVQUFDQSxNQUFNQTtnQkFDeEJBLEVBQUVBLENBQUNBLENBQUNBLE1BQU1BLENBQUNBLElBQUlBLENBQUNBLEdBQUdBLENBQUNBLFVBQVVBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO29CQUNoQ0EsTUFBTUEsQ0FBQ0EsT0FBT0EsQ0FBQ0E7Z0JBQ2pCQSxDQUFDQTtnQkFDREEsTUFBTUEsQ0FBQ0EsRUFBRUEsQ0FBQ0E7WUFDWkEsQ0FBQ0EsQ0FBQ0E7WUFFRkEsTUFBTUEsQ0FBQ0EsWUFBWUEsR0FBR0EsVUFBQ0EsTUFBTUE7Z0JBQzNCQSxNQUFNQSxDQUFDQSxJQUFJQSxDQUFDQSxZQUFZQSxDQUFDQSxNQUFNQSxDQUFDQSxDQUFDQTtZQUNuQ0EsQ0FBQ0EsQ0FBQ0E7WUFHRkEsTUFBTUEsQ0FBQ0EsTUFBTUEsR0FBR0EsSUFBSUEsQ0FBQ0EsVUFBVUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsTUFBTUEsRUFBRUEseUJBQXlCQSxDQUFDQSxDQUFDQTtZQUMxRUEsSUFBSUEsT0FBT0EsR0FBR0E7Z0JBQ1pBLFFBQVFBLEVBQUVBLElBQUlBO2dCQUNkQSxJQUFJQSxFQUFFQTtvQkFDSkEsSUFBSUEsRUFBRUEsTUFBTUEsQ0FBQ0EsTUFBTUE7aUJBQ3BCQTthQUNGQSxDQUFDQTtZQUNGQSxNQUFNQSxDQUFDQSxpQkFBaUJBLEdBQUdBLFVBQVVBLENBQUNBLG9CQUFvQkEsQ0FBQ0EsT0FBT0EsQ0FBQ0EsQ0FBQ0E7WUFFcEVBLE1BQU1BLENBQUNBLFFBQVFBLEdBQUdBO2dCQUNoQkEsSUFBSUEsUUFBUUEsR0FBR0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsU0FBU0EsQ0FBQ0EsR0FBR0EsTUFBTUEsQ0FBQ0EsVUFBVUEsR0FBR0EsTUFBTUEsQ0FBQ0EsTUFBTUEsQ0FBQ0E7Z0JBQ3RFQSxNQUFNQSxDQUFDQSxDQUFDQSxRQUFRQSxDQUFDQSxHQUFHQSxJQUFJQSxDQUFDQSxRQUFRQSxDQUFDQSxNQUFNQSxFQUFFQSxRQUFRQSxFQUFFQSxTQUFTQSxDQUFDQSxHQUFHQSxJQUFJQSxDQUFDQTtZQUN4RUEsQ0FBQ0EsQ0FBQ0E7WUFFRkEsTUFBTUEsQ0FBQ0EsU0FBU0EsR0FBR0E7Z0JBQ2pCQSxNQUFNQSxDQUFDQSxLQUFLQSxDQUFDQSxtQkFBbUJBLENBQUNBLE1BQU1BLENBQUNBLFNBQVNBLEVBQUVBLE1BQU1BLENBQUNBLFNBQVNBLENBQUNBLENBQUNBO1lBQ3ZFQSxDQUFDQSxDQUFDQTtZQUVGQSxNQUFNQSxDQUFDQSxVQUFVQSxHQUFHQSxVQUFDQSxNQUFNQTtnQkFDekJBLEVBQUVBLENBQUNBLENBQUNBLE1BQU1BLENBQUNBLENBQUNBLENBQUNBO29CQUNYQSxNQUFNQSxDQUFDQSxJQUFJQSxDQUFDQSxVQUFVQSxDQUFDQSxNQUFNQSxFQUFFQSxNQUFNQSxDQUFDQSxNQUFNQSxFQUFFQSxTQUFTQSxDQUFDQSxDQUFDQTtnQkFDM0RBLENBQUNBO2dCQUNEQSxNQUFNQSxDQUFDQSxJQUFJQSxDQUFBQTtZQUNiQSxDQUFDQSxDQUFDQTtZQUVGQSxNQUFNQSxDQUFDQSxXQUFXQSxHQUFHQSxRQUFRQSxHQUFHQSxDQUFDQSxNQUFNQSxDQUFDQSxNQUFNQSxHQUFHQSxVQUFVQSxHQUFHQSxNQUFNQSxDQUFDQSxNQUFNQSxHQUFHQSxFQUFFQSxDQUFDQSxHQUFHQSxXQUFXQSxHQUFHQSxNQUFNQSxDQUFDQSxNQUFNQSxDQUFDQTtZQUVoSEEsTUFBTUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsZ0JBQWdCQSxFQUFFQTtnQkFDOUIsRUFBRSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztvQkFHaEIsVUFBVSxDQUFDLGVBQWUsRUFBRSxFQUFFLENBQUMsQ0FBQztnQkFDbEMsQ0FBQztZQUNILENBQUMsQ0FBQ0EsQ0FBQ0E7WUFFSEEsTUFBTUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EscUJBQXFCQSxFQUFFQSxVQUFVQSxLQUFLQSxFQUFFQSxPQUFPQSxFQUFFQSxRQUFRQTtnQkFHbEUsVUFBVSxDQUFDLGVBQWUsRUFBRSxFQUFFLENBQUMsQ0FBQztZQUNsQyxDQUFDLENBQUNBLENBQUNBO1lBR0hBLE1BQU1BLENBQUNBLGdCQUFnQkEsR0FBR0E7Z0JBQ3hCQSxFQUFFQSxDQUFDQSxDQUFDQSxNQUFNQSxDQUFDQSxXQUFXQSxDQUFDQSxhQUFhQSxDQUFDQSxNQUFNQSxDQUFDQSxDQUFDQSxDQUFDQTtvQkFDNUNBLE1BQU1BLENBQUNBLGdCQUFnQkEsR0FBR0EsTUFBTUEsR0FBR0EsTUFBTUEsQ0FBQ0EsV0FBV0EsQ0FBQ0EsYUFBYUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsVUFBQUEsSUFBSUEsSUFBSUEsT0FBQUEsTUFBTUEsR0FBR0EsSUFBSUEsQ0FBQ0EsSUFBSUEsR0FBR0EsT0FBT0EsRUFBNUJBLENBQTRCQSxDQUFDQSxDQUFDQSxJQUFJQSxFQUFFQSxDQUFDQSxJQUFJQSxDQUFDQSxFQUFFQSxDQUFDQSxHQUFHQSxPQUFPQSxDQUFDQTtvQkFFeElBLEVBQUVBLENBQUNBLENBQUNBLE1BQU1BLENBQUNBLFdBQVdBLENBQUNBLGFBQWFBLENBQUNBLElBQUlBLENBQUNBLFVBQUNBLElBQUlBLElBQU9BLE1BQU1BLENBQUNBLElBQUlBLENBQUNBLElBQUlBLENBQUNBLFFBQVFBLENBQUNBLFVBQVVBLENBQUNBLENBQUFBLENBQUFBLENBQUNBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO3dCQUM5RkEsTUFBTUEsQ0FBQ0EsYUFBYUEsR0FBR0Esb0xBQW9MQSxDQUFDQTtvQkFDOU1BLENBQUNBO29CQUFDQSxJQUFJQSxDQUFDQSxDQUFDQTt3QkFDTkEsTUFBTUEsQ0FBQ0EsYUFBYUEsR0FBR0EsSUFBSUEsQ0FBQ0E7b0JBQzlCQSxDQUFDQTtvQkFFREEsTUFBTUEsQ0FBQ0EsWUFBWUEsR0FBR0EsSUFBSUEsQ0FBQ0EsZUFBZUEsQ0FBQ0EsT0FBT0EsRUFBNEJBO3dCQUM1RUEsU0FBU0EsRUFBRUEsY0FBUUEsTUFBTUEsQ0FBQ0EsTUFBTUEsQ0FBQ0Esb0JBQW9CQSxDQUFDQSxDQUFDQSxDQUFDQTt3QkFDeERBLGdCQUFnQkEsRUFBRUEsY0FBU0EsTUFBTUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsZ0JBQWdCQSxDQUFDQSxDQUFDQSxDQUFDQTt3QkFDNURBLE9BQU9BLEVBQUVBLGNBQVFBLE1BQU1BLENBQUNBLE1BQU1BLENBQUNBLGFBQWFBLENBQUNBLENBQUNBLENBQUNBO3FCQUNoREEsQ0FBQ0EsQ0FBQ0E7b0JBRUhBLE1BQU1BLENBQUNBLFlBQVlBLENBQUNBLElBQUlBLEVBQUVBLENBQUNBO2dCQUU3QkEsQ0FBQ0E7Z0JBQUNBLElBQUlBLENBQUNBLENBQUNBO29CQUNOQSxRQUFHQSxDQUFDQSxLQUFLQSxDQUFDQSwrQkFBK0JBLEdBQUdBLE1BQU1BLENBQUNBLFdBQVdBLENBQUNBLGFBQWFBLENBQUNBLENBQUNBO2dCQUNoRkEsQ0FBQ0E7WUFDSEEsQ0FBQ0EsQ0FBQ0E7WUFFRkEsTUFBTUEsQ0FBQ0Esb0JBQW9CQSxHQUFHQTtnQkFDNUJBLElBQUlBLEtBQUtBLEdBQUdBLE1BQU1BLENBQUNBLFdBQVdBLENBQUNBLGFBQWFBLENBQUNBO2dCQUM3Q0EsSUFBSUEsU0FBU0EsR0FBR0EsS0FBS0EsQ0FBQ0EsTUFBTUEsQ0FBQ0E7Z0JBQzdCQSxRQUFHQSxDQUFDQSxLQUFLQSxDQUFDQSxzQkFBc0JBLEdBQUdBLEtBQUtBLENBQUNBLENBQUNBO2dCQUUxQ0EsSUFBSUEsYUFBYUEsR0FBR0EsRUFBRUEsQ0FBQ0E7Z0JBQ3ZCQSxPQUFPQSxDQUFDQSxPQUFPQSxDQUFDQSxLQUFLQSxFQUFFQSxVQUFDQSxJQUFJQSxFQUFFQSxHQUFHQTtvQkFDL0JBLElBQUlBLElBQUlBLEdBQUdBLFVBQVVBLENBQUNBLElBQUlBLENBQUNBLE1BQU1BLENBQUNBLE1BQU1BLEVBQUVBLElBQUlBLENBQUNBLElBQUlBLENBQUNBLENBQUNBO29CQUNyREEsYUFBYUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0E7Z0JBQzNCQSxDQUFDQSxDQUFDQSxDQUFDQTtnQkFFSEEsUUFBR0EsQ0FBQ0EsS0FBS0EsQ0FBQ0Esa0JBQWtCQSxHQUFHQSxhQUFhQSxDQUFDQSxDQUFDQTtnQkFDOUNBLE1BQU1BLENBQUNBLEdBQUdBLEdBQUdBLGNBQWNBLENBQUNBLFdBQVdBLENBQUNBLE1BQU1BLENBQUNBLE1BQU1BLEVBQUVBLGFBQWFBLEVBQUVBLElBQUlBLEVBQUVBLFVBQUNBLE1BQU1BO29CQUNqRkEsTUFBTUEsQ0FBQ0EsV0FBV0EsQ0FBQ0EsYUFBYUEsR0FBR0EsRUFBRUEsQ0FBQ0E7b0JBQ3RDQSxJQUFJQSxPQUFPQSxHQUFHQSxJQUFJQSxDQUFDQSxXQUFXQSxDQUFDQSxTQUFTQSxFQUFFQSxVQUFVQSxDQUFDQSxDQUFDQTtvQkFDdERBLElBQUlBLENBQUNBLFlBQVlBLENBQUNBLFNBQVNBLEVBQUVBLFVBQVVBLEdBQUdBLE9BQU9BLENBQUNBLENBQUNBO29CQUNuREEsSUFBSUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0E7b0JBQ3BCQSxVQUFVQSxFQUFFQSxDQUFDQTtnQkFDZkEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0JBQ0hBLE1BQU1BLENBQUNBLFlBQVlBLENBQUNBLEtBQUtBLEVBQUVBLENBQUNBO1lBQzlCQSxDQUFDQSxDQUFDQTtZQUVGQSxNQUFNQSxDQUFDQSxNQUFNQSxDQUFDQSxvQkFBb0JBLEVBQUVBO2dCQUVsQ0EsSUFBSUEsSUFBSUEsR0FBR0EsaUJBQWlCQSxFQUFFQSxDQUFDQTtnQkFDL0JBLEVBQUVBLENBQUNBLENBQUNBLE1BQU1BLENBQUNBLHNCQUFzQkEsS0FBS0EsSUFBSUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7b0JBQzNDQSxNQUFNQSxDQUFDQSxVQUFVQSxHQUFHQSxFQUFFQSxNQUFNQSxFQUFFQSxLQUFLQSxFQUFFQSxJQUFJQSxFQUFFQSxJQUFJQSxFQUFFQSxDQUFDQTtnQkFDcERBLENBQUNBO2dCQUFDQSxJQUFJQSxDQUFDQSxDQUFDQTtvQkFDTkEsZUFBZUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0E7Z0JBQ3hCQSxDQUFDQTtZQUNIQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUVIQSxNQUFNQSxDQUFDQSxvQkFBb0JBLEdBQUdBO2dCQUM1QkEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsV0FBV0EsQ0FBQ0EsYUFBYUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7b0JBQzVDQSxJQUFJQSxRQUFRQSxHQUFHQSxNQUFNQSxDQUFDQSxXQUFXQSxDQUFDQSxhQUFhQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtvQkFDbkRBLElBQUlBLE9BQU9BLEdBQUdBLGlCQUFpQkEsRUFBRUEsQ0FBQ0E7b0JBQ2xDQSxFQUFFQSxDQUFDQSxDQUFDQSxRQUFRQSxJQUFJQSxPQUFPQSxDQUFDQSxDQUFDQSxDQUFDQTt3QkFDeEJBLElBQUlBLE9BQU9BLEdBQUdBLFFBQVFBLENBQUNBLElBQUlBLENBQUNBO3dCQUM1QkEsSUFBSUEsT0FBT0EsR0FBR0EsSUFBSUEsQ0FBQ0EsUUFBUUEsQ0FBQ0EsT0FBT0EsQ0FBQ0EsQ0FBQ0E7d0JBQ3JDQSxJQUFJQSxPQUFPQSxHQUFHQSxVQUFVQSxDQUFDQSxJQUFJQSxDQUFDQSxNQUFNQSxDQUFDQSxNQUFNQSxFQUFFQSxPQUFPQSxDQUFDQSxDQUFDQTt3QkFDdERBLFFBQUdBLENBQUNBLEtBQUtBLENBQUNBLHVCQUF1QkEsR0FBR0EsT0FBT0EsR0FBR0EsTUFBTUEsR0FBR0EsT0FBT0EsQ0FBQ0EsQ0FBQ0E7d0JBQ2hFQSxNQUFNQSxDQUFDQSxHQUFHQSxHQUFHQSxjQUFjQSxDQUFDQSxNQUFNQSxDQUFDQSxNQUFNQSxDQUFDQSxNQUFNQSxFQUFFQSxPQUFPQSxFQUFFQSxPQUFPQSxFQUFFQSxJQUFJQSxFQUFFQSxVQUFDQSxNQUFNQTs0QkFDL0VBLElBQUlBLENBQUNBLFlBQVlBLENBQUNBLFNBQVNBLEVBQUVBLG1CQUFtQkEsR0FBR0EsT0FBT0EsQ0FBQ0EsQ0FBQ0E7NEJBQzVEQSxNQUFNQSxDQUFDQSxXQUFXQSxDQUFDQSxhQUFhQSxDQUFDQSxNQUFNQSxDQUFDQSxDQUFDQSxFQUFFQSxDQUFDQSxDQUFDQSxDQUFDQTs0QkFDOUNBLE1BQU1BLENBQUNBLFlBQVlBLENBQUNBLEtBQUtBLEVBQUVBLENBQUNBOzRCQUM1QkEsSUFBSUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0E7NEJBQ3BCQSxVQUFVQSxFQUFFQSxDQUFDQTt3QkFDZkEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7b0JBQ0xBLENBQUNBO2dCQUNIQSxDQUFDQTtnQkFDREEsTUFBTUEsQ0FBQ0EsWUFBWUEsQ0FBQ0EsS0FBS0EsRUFBRUEsQ0FBQ0E7WUFDOUJBLENBQUNBLENBQUNBO1lBRUZBLE1BQU1BLENBQUNBLGdCQUFnQkEsR0FBR0E7Z0JBQ3hCQSxJQUFJQSxJQUFJQSxHQUFHQSxJQUFJQSxDQUFDQTtnQkFDaEJBLEVBQUVBLENBQUNBLENBQUNBLE1BQU1BLENBQUNBLFdBQVdBLENBQUNBLGFBQWFBLENBQUNBLE1BQU1BLENBQUNBLENBQUNBLENBQUNBO29CQUM1Q0EsSUFBSUEsUUFBUUEsR0FBR0EsTUFBTUEsQ0FBQ0EsV0FBV0EsQ0FBQ0EsYUFBYUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7b0JBQ25EQSxJQUFJQSxHQUFHQSxRQUFRQSxDQUFDQSxJQUFJQSxDQUFDQTtnQkFDdkJBLENBQUNBO2dCQUNEQSxFQUFFQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSxDQUFDQSxDQUFDQTtvQkFDVEEsTUFBTUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsV0FBV0EsR0FBR0EsSUFBSUEsQ0FBQ0E7b0JBQ2pDQSxNQUFNQSxDQUFDQSxzQkFBc0JBLEdBQUdBLGlCQUFpQkEsRUFBRUEsQ0FBQ0E7b0JBRXBEQSxNQUFNQSxDQUFDQSxZQUFZQSxHQUFHQSxJQUFJQSxDQUFDQSxlQUFlQSxDQUFDQSxPQUFPQSxFQUE0QkE7d0JBQzVFQSxNQUFNQSxFQUFFQSxjQUFTQSxNQUFNQSxDQUFDQSxNQUFNQSxDQUFDQSxNQUFNQSxDQUFDQSxDQUFDQSxDQUFDQTt3QkFDeENBLFVBQVVBLEVBQUVBLGNBQVFBLE1BQU1BLENBQUNBLE1BQU1BLENBQUNBLFVBQVVBLENBQUNBLENBQUNBLENBQUNBO3dCQUMvQ0EsUUFBUUEsRUFBRUEsY0FBUUEsTUFBTUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsUUFBUUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7d0JBQzNDQSxTQUFTQSxFQUFFQSxjQUFRQSxNQUFNQSxDQUFDQSxNQUFNQSxDQUFDQSxvQkFBb0JBLENBQUNBLENBQUNBLENBQUNBO3FCQUN6REEsQ0FBQ0EsQ0FBQ0E7b0JBRUhBLE1BQU1BLENBQUNBLFlBQVlBLENBQUNBLElBQUlBLEVBQUVBLENBQUNBO29CQUUzQkEsUUFBUUEsQ0FBQ0E7d0JBQ1BBLENBQUNBLENBQUNBLGlCQUFpQkEsQ0FBQ0EsQ0FBQ0EsS0FBS0EsRUFBRUEsQ0FBQ0E7b0JBQy9CQSxDQUFDQSxFQUFFQSxFQUFFQSxDQUFDQSxDQUFDQTtnQkFDVEEsQ0FBQ0E7Z0JBQUNBLElBQUlBLENBQUNBLENBQUNBO29CQUNOQSxRQUFHQSxDQUFDQSxLQUFLQSxDQUFDQSwrQkFBK0JBLEdBQUdBLE1BQU1BLENBQUNBLFdBQVdBLENBQUNBLGFBQWFBLENBQUNBLENBQUNBO2dCQUNoRkEsQ0FBQ0E7WUFDSEEsQ0FBQ0EsQ0FBQ0E7WUFFRkEsTUFBTUEsQ0FBQ0Esa0JBQWtCQSxHQUFHQTtnQkFDMUJBLElBQUlBLEtBQUtBLEdBQUdBLE1BQU1BLENBQUNBLFdBQVdBLENBQUNBLGFBQWFBLENBQUNBO2dCQUM3Q0EsSUFBSUEsU0FBU0EsR0FBR0EsS0FBS0EsQ0FBQ0EsTUFBTUEsQ0FBQ0E7Z0JBQzdCQSxJQUFJQSxVQUFVQSxHQUFHQSxNQUFNQSxDQUFDQSxJQUFJQSxDQUFDQSxVQUFVQSxDQUFDQTtnQkFDeENBLElBQUlBLFNBQVNBLEdBQVVBLE1BQU1BLENBQUNBLE1BQU1BLENBQUNBO2dCQUNyQ0EsRUFBRUEsQ0FBQ0EsQ0FBQ0EsVUFBVUEsSUFBSUEsU0FBU0EsSUFBSUEsVUFBVUEsS0FBS0EsU0FBU0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7b0JBQ3hEQSxRQUFHQSxDQUFDQSxLQUFLQSxDQUFDQSxTQUFTQSxHQUFHQSxTQUFTQSxHQUFHQSxjQUFjQSxHQUFHQSxVQUFVQSxDQUFDQSxDQUFDQTtvQkFDL0RBLE9BQU9BLENBQUNBLE9BQU9BLENBQUNBLEtBQUtBLEVBQUVBLFVBQUNBLElBQUlBLEVBQUVBLEdBQUdBO3dCQUMvQkEsSUFBSUEsT0FBT0EsR0FBR0EsU0FBU0EsR0FBR0EsR0FBR0EsR0FBR0EsSUFBSUEsQ0FBQ0EsSUFBSUEsQ0FBQ0E7d0JBQzFDQSxJQUFJQSxPQUFPQSxHQUFHQSxVQUFVQSxHQUFHQSxHQUFHQSxHQUFHQSxJQUFJQSxDQUFDQSxJQUFJQSxDQUFDQTt3QkFDM0NBLFFBQUdBLENBQUNBLEtBQUtBLENBQUNBLGdCQUFnQkEsR0FBR0EsT0FBT0EsR0FBR0EsTUFBTUEsR0FBR0EsT0FBT0EsQ0FBQ0EsQ0FBQ0E7d0JBQ3pEQSxNQUFNQSxDQUFDQSxHQUFHQSxHQUFHQSxjQUFjQSxDQUFDQSxNQUFNQSxDQUFDQSxNQUFNQSxDQUFDQSxNQUFNQSxFQUFFQSxPQUFPQSxFQUFFQSxPQUFPQSxFQUFFQSxJQUFJQSxFQUFFQSxVQUFDQSxNQUFNQTs0QkFDL0VBLEVBQUVBLENBQUNBLENBQUNBLEdBQUdBLEdBQUdBLENBQUNBLEtBQUtBLFNBQVNBLENBQUNBLENBQUNBLENBQUNBO2dDQUMxQkEsTUFBTUEsQ0FBQ0EsV0FBV0EsQ0FBQ0EsYUFBYUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0EsRUFBRUEsU0FBU0EsQ0FBQ0EsQ0FBQ0E7Z0NBQ3REQSxJQUFJQSxPQUFPQSxHQUFHQSxJQUFJQSxDQUFDQSxXQUFXQSxDQUFDQSxTQUFTQSxFQUFFQSxVQUFVQSxDQUFDQSxDQUFDQTtnQ0FDdERBLElBQUlBLENBQUNBLFlBQVlBLENBQUNBLFNBQVNBLEVBQUVBLFFBQVFBLEdBQUdBLE9BQU9BLEdBQUdBLE1BQU1BLEdBQUdBLE9BQU9BLENBQUNBLENBQUNBO2dDQUNwRUEsTUFBTUEsQ0FBQ0EsVUFBVUEsQ0FBQ0EsS0FBS0EsRUFBRUEsQ0FBQ0E7Z0NBQzFCQSxJQUFJQSxDQUFDQSxNQUFNQSxDQUFDQSxNQUFNQSxDQUFDQSxDQUFDQTtnQ0FDcEJBLFVBQVVBLEVBQUVBLENBQUNBOzRCQUNmQSxDQUFDQTt3QkFDSEEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7b0JBQ0xBLENBQUNBLENBQUNBLENBQUNBO2dCQUNMQSxDQUFDQTtnQkFDREEsTUFBTUEsQ0FBQ0EsVUFBVUEsQ0FBQ0EsS0FBS0EsRUFBRUEsQ0FBQ0E7WUFDNUJBLENBQUNBLENBQUNBO1lBRUZBLE1BQU1BLENBQUNBLFdBQVdBLEdBQUdBLFVBQUNBLElBQUlBO2dCQUN4QkEsTUFBTUEsQ0FBQ0EsY0FBY0EsQ0FBQ0EsWUFBWUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsTUFBTUEsRUFBRUEsSUFBSUEsRUFBRUEsSUFBSUEsRUFBRUEsSUFBSUEsQ0FBQ0EsQ0FBQ0E7WUFDdEVBLENBQUNBLENBQUNBO1lBRUZBLE1BQU1BLENBQUNBLGNBQWNBLEdBQUdBO2dCQUN0QkEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsV0FBV0EsQ0FBQ0EsYUFBYUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7b0JBQzVDQSxNQUFNQSxDQUFDQSxJQUFJQSxDQUFDQSxVQUFVQSxHQUFHQSxNQUFNQSxDQUFDQSxNQUFNQSxDQUFDQTtvQkFFdkNBLE1BQU1BLENBQUNBLFVBQVVBLEdBQUdBLElBQUlBLENBQUNBLGFBQWFBLENBQUNBLE9BQU9BLEVBQTBCQTt3QkFDdEVBLElBQUlBLEVBQUVBLGNBQVNBLE1BQU1BLENBQUNBLE1BQU1BLENBQUNBLElBQUlBLENBQUNBLENBQUNBLENBQUNBO3dCQUNwQ0EsV0FBV0EsRUFBRUEsY0FBUUEsTUFBTUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsV0FBV0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7d0JBQ2pEQSxTQUFTQSxFQUFFQSxjQUFRQSxNQUFNQSxDQUFDQSxNQUFNQSxDQUFDQSxrQkFBa0JBLENBQUNBLENBQUNBLENBQUNBO3FCQUN2REEsQ0FBQ0EsQ0FBQ0E7b0JBRUhBLE1BQU1BLENBQUNBLFVBQVVBLENBQUNBLElBQUlBLEVBQUVBLENBQUNBO29CQUV6QkEsUUFBUUEsQ0FBQ0E7d0JBQ1BBLENBQUNBLENBQUNBLGFBQWFBLENBQUNBLENBQUNBLEtBQUtBLEVBQUVBLENBQUNBO29CQUMzQkEsQ0FBQ0EsRUFBRUEsRUFBRUEsQ0FBQ0EsQ0FBQ0E7Z0JBQ1RBLENBQUNBO2dCQUFDQSxJQUFJQSxDQUFDQSxDQUFDQTtvQkFDTkEsUUFBR0EsQ0FBQ0EsS0FBS0EsQ0FBQ0EsK0JBQStCQSxHQUFHQSxNQUFNQSxDQUFDQSxXQUFXQSxDQUFDQSxhQUFhQSxDQUFDQSxDQUFDQTtnQkFDaEZBLENBQUNBO1lBQ0hBLENBQUNBLENBQUNBO1lBR0ZBLFVBQVVBLENBQUNBLGVBQWVBLEVBQUVBLEVBQUVBLENBQUNBLENBQUNBO1lBRWhDQTtnQkFDRTBFLE1BQU1BLENBQUNBLFlBQVlBLENBQUNBLGVBQWVBLENBQUNBLElBQUlBLFlBQVlBLENBQUNBLGVBQWVBLENBQUNBLEdBQUdBLElBQUlBLEdBQUdBLEtBQUtBLENBQUFBO1lBQ3RGQSxDQUFDQTtZQUVEMUU7Z0JBRUl3QyxJQUFJQSxPQUFPQSxHQUFHQSxJQUFJQSxDQUFDQTtnQkFHckJBLEVBQUVBLENBQUNBLENBQUNBLFVBQVVBLEVBQUVBLENBQUNBLENBQUNBLENBQUNBO29CQUNqQkEsSUFBSUEsWUFBWUEsR0FBR0EsWUFBWUEsQ0FBQ0EsZUFBZUEsQ0FBQ0EsQ0FBQ0E7b0JBQ2pEQSxNQUFNQSxDQUFDQSxHQUFHQSxHQUFHQSxjQUFjQSxDQUFDQSxJQUFJQSxDQUFDQSxNQUFNQSxDQUFDQSxRQUFRQSxFQUFFQSxZQUFZQSxFQUFFQSxNQUFNQSxDQUFDQSxNQUFNQSxFQUFFQSxhQUFhQSxDQUFDQSxDQUFDQTtnQkFDaEdBLENBQUNBO2dCQUFDQSxJQUFJQSxDQUFDQSxDQUFDQTtvQkFDTkEsTUFBTUEsQ0FBQ0EsR0FBR0EsR0FBR0EsY0FBY0EsQ0FBQ0EsT0FBT0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsTUFBTUEsRUFBRUEsTUFBTUEsQ0FBQ0EsTUFBTUEsRUFBRUEsTUFBTUEsQ0FBQ0EsUUFBUUEsRUFBRUEsYUFBYUEsQ0FBQ0EsQ0FBQ0E7Z0JBQ3BHQSxDQUFDQTtnQkFDREEsSUFBSUEsQ0FBQ0EsWUFBWUEsQ0FBQ0EsT0FBT0EsRUFBRUEsY0FBY0EsRUFBRUEsTUFBTUEsRUFBRUEsS0FBS0EsQ0FBQ0EsQ0FBQ0E7WUFDNURBLENBQUNBO1lBRUR4QyxNQUFNQSxDQUFDQSxVQUFVQSxHQUFHQSxVQUFVQSxDQUFDQTtZQUUvQkEsc0JBQXNCQSxRQUFRQSxFQUFFQSxRQUFRQTtnQkFDdEMyRSxNQUFNQSxDQUFDQSxVQUFVQSxHQUFHQSxJQUFJQSxDQUFDQTtnQkFFekJBLElBQUlBLE1BQU1BLEdBQVVBLElBQUlBLENBQUNBO2dCQUN6QkEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsVUFBVUEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7b0JBQ2pCQSxNQUFNQSxHQUFHQSxNQUFNQSxDQUFDQTtnQkFDbEJBLENBQUNBO2dCQUFDQSxJQUFJQSxDQUFDQSxDQUFDQTtvQkFDTkEsTUFBTUEsR0FBR0EsSUFBSUEsQ0FBQ0EsVUFBVUEsQ0FBQ0EsUUFBUUEsRUFBRUEseUJBQXlCQSxDQUFDQSxJQUFJQSxNQUFNQSxDQUFDQSxNQUFNQSxDQUFDQTtnQkFDakZBLENBQUNBO2dCQUNEQSxRQUFHQSxDQUFDQSxLQUFLQSxDQUFDQSxlQUFlQSxFQUFFQSxNQUFNQSxDQUFDQSxDQUFDQTtnQkFDbkNBLE1BQU1BLENBQUNBLENBQUNBLE1BQU1BLENBQUNBLENBQUNBLENBQUNBO29CQUNmQSxLQUFLQSxPQUFPQTt3QkFDVkEsSUFBSUEsUUFBUUEsR0FBR0EsTUFBTUEsR0FBR0EsTUFBTUEsQ0FBQ0EsTUFBTUEsQ0FBQ0E7d0JBQ3RDQSxRQUFHQSxDQUFDQSxLQUFLQSxDQUFDQSxVQUFVQSxFQUFFQSxNQUFNQSxDQUFDQSxDQUFDQTt3QkFDOUJBLFFBQVFBLEdBQUdBLFVBQVVBLENBQUNBLElBQUlBLENBQUNBLFFBQVFBLEVBQUVBLE1BQU1BLENBQUNBLE1BQU1BLENBQUNBLENBQUNBO3dCQUNwREEsSUFBSUEsZUFBZUEsR0FBR0EsWUFBWUEsQ0FBQ0EsY0FBY0EsQ0FBQ0EsR0FBR0EsQ0FBQ0Esb0JBQW9CQSxDQUFDQSxDQUFDQSxDQUFDQTt3QkFDN0VBLE1BQU1BLENBQUNBLElBQUlBLEdBQUdBLGVBQWVBLENBQUNBOzRCQUM1QkEsUUFBUUEsRUFBRUEsUUFBUUE7eUJBQ25CQSxDQUFDQSxDQUFDQTt3QkFDSEEsS0FBS0EsQ0FBQ0E7b0JBQ1JBLEtBQUtBLFVBQVVBO3dCQUNiQSxNQUFNQSxDQUFDQSxJQUFJQSxHQUFHQSxRQUFRQSxHQUFHQSxNQUFNQSxDQUFDQSxRQUFRQSxDQUFDQSxHQUFHQSxFQUFFQSxDQUFDQTt3QkFDL0NBLEtBQUtBLENBQUNBO29CQUNSQSxLQUFLQSxZQUFZQTt3QkFDZkEsSUFBSUEsSUFBSUEsR0FBR0EsSUFBSUEsQ0FBQ0E7d0JBQ2hCQSxJQUFJQSxHQUFHQSxTQUFTQSxDQUFDQSxNQUFNQSxFQUFFQSxDQUFDQSxNQUFNQSxDQUFDQSxDQUFDQTt3QkFDbENBLE1BQU1BLENBQUNBLE1BQU1BLEdBQUdBLFFBQVFBLENBQUNBO3dCQUN6QkEsTUFBTUEsQ0FBQ0EsSUFBSUEsR0FBR0EsSUFBSUEsQ0FBQ0E7d0JBQ25CQSxFQUFFQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSxDQUFDQSxDQUFDQTs0QkFFVEEsTUFBTUEsQ0FBQ0EsVUFBVUEsR0FBR0EsSUFBSUEsQ0FBQ0E7NEJBQ3pCQSxNQUFNQSxDQUFDQSxHQUFHQSxHQUFHQSxjQUFjQSxDQUFDQSxPQUFPQSxDQUFDQSxNQUFNQSxDQUFDQSxNQUFNQSxFQUFFQSxJQUFJQSxFQUFFQSxNQUFNQSxDQUFDQSxRQUFRQSxFQUFFQSxVQUFDQSxPQUFPQTtnQ0FDaEZBLFlBQVlBLENBQUNBLElBQUlBLENBQUNBLFNBQVNBLENBQUNBLE9BQU9BLENBQUNBLElBQUlBLENBQUNBLENBQUNBLENBQUNBOzRCQUM3Q0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7d0JBQ0xBLENBQUNBO3dCQUFDQSxJQUFJQSxDQUFDQSxDQUFDQTs0QkFDTkEsTUFBTUEsQ0FBQ0EsVUFBVUEsR0FBR0EsbUNBQW1DQSxDQUFDQTt3QkFDMURBLENBQUNBO3dCQUNEQSxLQUFLQSxDQUFDQTtvQkFDUkE7d0JBQ0VBLE1BQU1BLENBQUNBLElBQUlBLEdBQUdBLElBQUlBLENBQUNBO3dCQUNuQkEsTUFBTUEsQ0FBQ0EsTUFBTUEsR0FBR0EsUUFBUUEsQ0FBQ0E7d0JBQ3pCQSxNQUFNQSxDQUFDQSxVQUFVQSxHQUFHQSxtQ0FBbUNBLENBQUNBO2dCQUM1REEsQ0FBQ0E7Z0JBQ0RBLElBQUlBLENBQUNBLE1BQU1BLENBQUNBLE1BQU1BLENBQUNBLENBQUNBO1lBQ3RCQSxDQUFDQTtZQUVEM0Usc0JBQXNCQSxJQUFJQTtnQkFDeEJvRSxNQUFNQSxDQUFDQSxjQUFjQSxHQUFHQSxJQUFJQSxDQUFDQTtnQkFDN0JBLEVBQUVBLENBQUNBLENBQUNBLE1BQU1BLENBQUNBLE1BQU1BLENBQUNBLENBQUNBLENBQUNBO29CQUNsQkEsTUFBTUEsQ0FBQ0EsVUFBVUEsR0FBR0EsSUFBSUEsQ0FBQ0EsU0FBU0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0E7Z0JBQ3BEQSxDQUFDQTtnQkFDREEsTUFBTUEsQ0FBQ0EsVUFBVUEsR0FBR0EsaUNBQWlDQSxDQUFDQTtnQkFDdERBLElBQUlBLENBQUNBLE1BQU1BLENBQUNBLE1BQU1BLENBQUNBLENBQUNBO1lBQ3RCQSxDQUFDQTtZQUVEcEUsdUJBQXVCQSxPQUFPQTtnQkFDNUI0RSxJQUFJQSxRQUFRQSxHQUFHQSxPQUFPQSxDQUFDQSxJQUFJQSxDQUFDQTtnQkFDNUJBLE1BQU1BLENBQUNBLFNBQVNBLEdBQUdBLE9BQU9BLENBQUNBLFNBQVNBLENBQUNBO2dCQUNyQ0EsTUFBTUEsQ0FBQ0EsV0FBV0EsR0FBR0EsT0FBT0EsQ0FBQ0E7Z0JBRTdCQSxFQUFFQSxDQUFDQSxDQUFDQSxPQUFPQSxJQUFJQSxPQUFPQSxDQUFDQSxNQUFNQSxDQUFDQSxDQUFDQSxDQUFDQTtvQkFDOUJBLE1BQU1BLENBQUNBLE1BQU1BLEdBQUdBLE9BQU9BLENBQUNBLE1BQU1BLENBQUNBO2dCQUNqQ0EsQ0FBQ0E7Z0JBQUNBLElBQUlBLENBQUNBLENBQUNBO29CQUNOQSxNQUFNQSxDQUFDQSxNQUFNQSxHQUFHQSxJQUFJQSxDQUFDQSxVQUFVQSxDQUFDQSxNQUFNQSxDQUFDQSxNQUFNQSxFQUFFQSx5QkFBeUJBLENBQUNBLENBQUNBO2dCQUM1RUEsQ0FBQ0E7Z0JBQ0RBLE1BQU1BLENBQUNBLGlCQUFpQkEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsSUFBSUEsR0FBR0EsTUFBTUEsQ0FBQ0EsTUFBTUEsQ0FBQ0E7Z0JBQ25EQSxNQUFNQSxDQUFDQSxRQUFRQSxHQUFHQSxJQUFJQSxDQUFDQTtnQkFFdkJBLEVBQUVBLENBQUNBLENBQUNBLE9BQU9BLENBQUNBLFNBQVNBLENBQUNBLENBQUNBLENBQUNBO29CQUN0QkEsSUFBSUEsV0FBV0EsR0FBR0EsT0FBT0EsQ0FBQ0EsUUFBUUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsVUFBQ0EsR0FBR0E7d0JBQzVDQSxNQUFNQSxDQUFDQSxHQUFHQSxDQUFDQSxTQUFTQSxDQUFDQTtvQkFDdkJBLENBQUNBLENBQUNBLENBQUNBO29CQUNIQSxJQUFJQSxRQUFRQSxHQUFHQSxPQUFPQSxDQUFDQSxRQUFRQSxDQUFDQSxNQUFNQSxDQUFDQSxVQUFDQSxHQUFHQTt3QkFDekNBLE1BQU1BLENBQUNBLEtBQUtBLENBQUNBO29CQUNmQSxDQUFDQSxDQUFDQSxDQUFDQTtvQkFDSEEsSUFBSUEsS0FBS0EsR0FBR0EsT0FBT0EsQ0FBQ0EsUUFBUUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsVUFBQ0EsSUFBSUE7d0JBQ3ZDQSxNQUFNQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSxTQUFTQSxDQUFDQTtvQkFDekJBLENBQUNBLENBQUNBLENBQUNBO29CQUNIQSxXQUFXQSxHQUFHQSxXQUFXQSxDQUFDQSxNQUFNQSxDQUFDQSxVQUFDQSxHQUFHQTt3QkFDbkNBLE1BQU1BLENBQUNBLEdBQUdBLENBQUNBLElBQUlBLENBQUNBO29CQUNsQkEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7b0JBQ0hBLFFBQVFBLEdBQUdBLFFBQVFBLENBQUNBLE1BQU1BLENBQUNBLFVBQUNBLEdBQUdBO3dCQUM3QkEsTUFBTUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsSUFBSUEsQ0FBQ0E7b0JBQ2xCQSxDQUFDQSxDQUFDQSxDQUFDQTtvQkFDSEEsS0FBS0EsR0FBR0EsS0FBS0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsVUFBQ0EsSUFBSUE7d0JBQ3hCQSxNQUFNQSxDQUFDQSxJQUFJQSxDQUFDQSxJQUFJQSxDQUFDQTtvQkFDbkJBLENBQUNBLENBQUNBO3lCQUNDQSxNQUFNQSxDQUFDQSxVQUFDQSxJQUFJQTt3QkFDWEEsTUFBTUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsS0FBS0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsSUFBSUEsRUFBRUEsQ0FBQ0E7b0JBQ3JDQSxDQUFDQSxDQUFDQSxDQUFDQTtvQkFFTEEsTUFBTUEsQ0FBQ0EsUUFBUUEsR0FBU0EsS0FBTUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsV0FBV0EsRUFBRUEsUUFBUUEsRUFBRUEsS0FBS0EsQ0FBQ0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsVUFBQ0EsSUFBSUE7d0JBQzNFQSxJQUFJQSxDQUFDQSxNQUFNQSxHQUFHQSxNQUFNQSxDQUFDQSxNQUFNQSxDQUFDQTt3QkFDNUJBLElBQUlBLENBQUNBLFFBQVFBLEdBQUdBLElBQUlBLENBQUNBLElBQUlBLENBQUNBO3dCQUMxQkEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsU0FBU0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7NEJBQ25CQSxJQUFJQSxDQUFDQSxRQUFRQSxJQUFJQSxNQUFNQSxDQUFDQTt3QkFD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LHNDQUFzQztBQUN0QyxxQ0FBcUM7QUFFckMsSUFBTyxJQUFJLENBTVY7QUFORCxXQUFPLElBQUksRUFBQyxDQUFDO0lBRUFBLHVCQUFrQkEsR0FBR0EsWUFBT0EsQ0FBQ0EsVUFBVUEsQ0FBQ0EseUJBQXlCQSxFQUFFQSxDQUFDQSxRQUFRQSxFQUFFQSxRQUFRQSxFQUFFQSxjQUFjQSxFQUFFQSxVQUFDQSxNQUFNQSxFQUFFQSxNQUFNQSxFQUFFQSxZQUFZQTtRQUVoSkEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7QUFFTkEsQ0FBQ0EsRUFOTSxJQUFJLEtBQUosSUFBSSxRQU1WIiwiZmlsZSI6ImNvbXBpbGVkLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8vIENvcHlyaWdodCAyMDE0LTIwMTUgUmVkIEhhdCwgSW5jLiBhbmQvb3IgaXRzIGFmZmlsaWF0ZXNcbi8vLyBhbmQgb3RoZXIgY29udHJpYnV0b3JzIGFzIGluZGljYXRlZCBieSB0aGUgQGF1dGhvciB0YWdzLlxuLy8vXG4vLy8gTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbi8vLyB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4vLy8gWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4vLy9cbi8vLyAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuLy8vXG4vLy8gVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuLy8vIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbi8vLyBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbi8vLyBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4vLy8gbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi9saWJzL2hhd3Rpby11dGlsaXRpZXMvZGVmcy5kLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uL2xpYnMvaGF3dGlvLW9hdXRoL2RlZnMuZC50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi9saWJzL2hhd3Rpby1rdWJlcm5ldGVzL2RlZnMuZC50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi9saWJzL2hhd3Rpby1pbnRlZ3JhdGlvbi9kZWZzLmQudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vbGlicy9oYXd0aW8tZGFzaGJvYXJkL2RlZnMuZC50c1wiLz5cbiIsIi8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL2luY2x1ZGVzLnRzXCIvPlxubW9kdWxlIEZvcmdlIHtcblxuICBleHBvcnQgdmFyIGNvbnRleHQgPSAnL3dvcmtzcGFjZXMvOm5hbWVzcGFjZS9mb3JnZSc7XG5cbiAgZXhwb3J0IHZhciBoYXNoID0gJyMnICsgY29udGV4dDtcbiAgZXhwb3J0IHZhciBwbHVnaW5OYW1lID0gJ0ZvcmdlJztcbiAgZXhwb3J0IHZhciBwbHVnaW5QYXRoID0gJ3BsdWdpbnMvZm9yZ2UvJztcbiAgZXhwb3J0IHZhciB0ZW1wbGF0ZVBhdGggPSBwbHVnaW5QYXRoICsgJ2h0bWwvJztcbiAgZXhwb3J0IHZhciBsb2c6TG9nZ2luZy5Mb2dnZXIgPSBMb2dnZXIuZ2V0KHBsdWdpbk5hbWUpO1xuXG4gIGV4cG9ydCB2YXIgZGVmYXVsdEljb25VcmwgPSBDb3JlLnVybChcIi9pbWcvZm9yZ2Uuc3ZnXCIpO1xuXG4gIGV4cG9ydCB2YXIgZ29nc1NlcnZpY2VOYW1lID0gS3ViZXJuZXRlcy5nb2dzU2VydmljZU5hbWU7XG4gIGV4cG9ydCB2YXIgb3Jpb25TZXJ2aWNlTmFtZSA9IFwib3Jpb25cIjtcblxuICBleHBvcnQgdmFyIGxvZ2dlZEluVG9Hb2dzID0gZmFsc2U7XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIGlzRm9yZ2Uod29ya3NwYWNlKSB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICBleHBvcnQgZnVuY3Rpb24gaW5pdFNjb3BlKCRzY29wZSwgJGxvY2F0aW9uLCAkcm91dGVQYXJhbXMpIHtcbiAgICAkc2NvcGUubmFtZXNwYWNlID0gJHJvdXRlUGFyYW1zW1wibmFtZXNwYWNlXCJdIHx8ICRzY29wZS5uYW1lc3BhY2UgfHwgS3ViZXJuZXRlcy5jdXJyZW50S3ViZXJuZXRlc05hbWVzcGFjZSgpO1xuICAgIEt1YmVybmV0ZXMuc2V0Q3VycmVudEt1YmVybmV0ZXNOYW1lc3BhY2UoJHNjb3BlLm5hbWVzcGFjZSk7XG4gICAgJHNjb3BlLnByb2plY3RJZCA9ICRyb3V0ZVBhcmFtc1tcInByb2plY3RcIl07XG4gICAgJHNjb3BlLiR3b3Jrc3BhY2VMaW5rID0gRGV2ZWxvcGVyLndvcmtzcGFjZUxpbmsoKTtcbiAgICAkc2NvcGUuJHByb2plY3RMaW5rID0gRGV2ZWxvcGVyLnByb2plY3RMaW5rKCRzY29wZS5wcm9qZWN0SWQpO1xuICAgICRzY29wZS5icmVhZGNydW1iQ29uZmlnID0gRGV2ZWxvcGVyLmNyZWF0ZVByb2plY3RCcmVhZGNydW1icygkc2NvcGUucHJvamVjdElkKTtcbiAgICAkc2NvcGUuc3ViVGFiQ29uZmlnID0gRGV2ZWxvcGVyLmNyZWF0ZVByb2plY3RTdWJOYXZCYXJzKCRzY29wZS5wcm9qZWN0SWQpO1xuXG4gICAgaWYgKFwicHJvamVjdC1uZXdcIiA9PT0gJHNjb3BlLmlkKSB7XG4gICAgICAkc2NvcGUuYnJlYWRjcnVtYkNvbmZpZy5wdXNoKHtcbiAgICAgICAgbGFiZWw6IFwiQ3JlYXRlIFByb2plY3RcIlxuICAgICAgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICRzY29wZS5icmVhZGNydW1iQ29uZmlnLnB1c2goXy5sYXN0KCRzY29wZS5zdWJUYWJDb25maWcpKTtcbiAgICAgICRzY29wZS5icmVhZGNydW1iQ29uZmlnLnB1c2goe1xuICAgICAgICBsYWJlbDogXCJGb3JnZVwiLFxuICAgICAgICBocmVmOiBGb3JnZS5wcm9qZWN0Q29tbWFuZHNMaW5rKCRzY29wZS5uYW1lc3BhY2UsICRzY29wZS5wcm9qZWN0SWQpXG4gICAgICB9KTtcbiAgICB9XG4gICAgJHNjb3BlLnN1YlRhYkNvbmZpZyA9IFtdO1xuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIGNvbW1hbmRMaW5rKHByb2plY3RJZCwgbmFtZSwgcmVzb3VyY2VQYXRoKSB7XG4gICAgdmFyIGxpbmsgPSBEZXZlbG9wZXIucHJvamVjdExpbmsocHJvamVjdElkKTtcbiAgICBpZiAobmFtZSkge1xuICAgICAgaWYgKHJlc291cmNlUGF0aCkge1xuICAgICAgICByZXR1cm4gVXJsSGVscGVycy5qb2luKGxpbmssIFwiL2ZvcmdlL2NvbW1hbmRcIiwgbmFtZSwgcmVzb3VyY2VQYXRoKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBVcmxIZWxwZXJzLmpvaW4obGluaywgXCIvZm9yZ2UvY29tbWFuZC9cIiwgbmFtZSk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIGNvbW1hbmRzTGluayhyZXNvdXJjZVBhdGgsIHByb2plY3RJZCkge1xuICAgIHZhciBsaW5rID0gRGV2ZWxvcGVyLnByb2plY3RMaW5rKHByb2plY3RJZCk7XG4gICAgaWYgKHJlc291cmNlUGF0aCkge1xuICAgICAgcmV0dXJuIFVybEhlbHBlcnMuam9pbihsaW5rLCBcIi9mb3JnZS9jb21tYW5kcy91c2VyXCIsIHJlc291cmNlUGF0aCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBVcmxIZWxwZXJzLmpvaW4obGluaywgXCIvZm9yZ2UvY29tbWFuZHNcIik7XG4gICAgfVxuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIHByb2plY3RDb21tYW5kc0xpbmsobnMsIHByb2plY3RJZCkge1xuICAgIHJldHVybiBEZXZlbG9wZXIucHJvamVjdFdvcmtzcGFjZUxpbmsobnMsIHByb2plY3RJZCwgXCJmb3JnZS9jb21tYW5kc1wiLCBmYWxzZSk7XG4gIH1cblxuICBleHBvcnQgZnVuY3Rpb24gcmVwb3NBcGlVcmwoRm9yZ2VBcGlVUkwpIHtcbiAgICByZXR1cm4gVXJsSGVscGVycy5qb2luKEZvcmdlQXBpVVJMLCBcIi9yZXBvc1wiKTtcbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiByZXBvQXBpVXJsKEZvcmdlQXBpVVJMLCBwYXRoKSB7XG4gICAgcmV0dXJuIFVybEhlbHBlcnMuam9pbihGb3JnZUFwaVVSTCwgXCIvcmVwb3MvdXNlclwiLCBwYXRoKTtcbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiBjb21tYW5kQXBpVXJsKEZvcmdlQXBpVVJMLCBjb21tYW5kSWQsIG5zLCBwcm9qZWN0SWQsIHJlc291cmNlUGF0aCA9IG51bGwpIHtcbiAgICByZXR1cm4gVXJsSGVscGVycy5qb2luKEZvcmdlQXBpVVJMLCBcImNvbW1hbmRcIiwgY29tbWFuZElkLCBucywgcHJvamVjdElkLCByZXNvdXJjZVBhdGgpO1xuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIGV4ZWN1dGVDb21tYW5kQXBpVXJsKEZvcmdlQXBpVVJMLCBjb21tYW5kSWQpIHtcbiAgICByZXR1cm4gVXJsSGVscGVycy5qb2luKEZvcmdlQXBpVVJMLCBcImNvbW1hbmRcIiwgXCJleGVjdXRlXCIsIGNvbW1hbmRJZCk7XG4gIH1cblxuICBleHBvcnQgZnVuY3Rpb24gdmFsaWRhdGVDb21tYW5kQXBpVXJsKEZvcmdlQXBpVVJMLCBjb21tYW5kSWQpIHtcbiAgICByZXR1cm4gVXJsSGVscGVycy5qb2luKEZvcmdlQXBpVVJMLCBcImNvbW1hbmRcIiwgXCJ2YWxpZGF0ZVwiLCBjb21tYW5kSWQpO1xuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIGNvbW1hbmRJbnB1dEFwaVVybChGb3JnZUFwaVVSTCwgY29tbWFuZElkLCBucywgcHJvamVjdElkLCByZXNvdXJjZVBhdGgpIHtcbiAgICBpZiAobnMgJiYgcHJvamVjdElkKSB7XG4gICAgICByZXR1cm4gVXJsSGVscGVycy5qb2luKEZvcmdlQXBpVVJMLCBcImNvbW1hbmRJbnB1dFwiLCBjb21tYW5kSWQsIG5zLCBwcm9qZWN0SWQsIHJlc291cmNlUGF0aCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBVcmxIZWxwZXJzLmpvaW4oRm9yZ2VBcGlVUkwsIFwiY29tbWFuZElucHV0XCIsIGNvbW1hbmRJZCk7XG4gICAgfVxuICB9XG5cblxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIHRoZSBwcm9qZWN0IGZvciB0aGUgZ2l2ZW4gcmVzb3VyY2UgcGF0aFxuICAgKi9cbiAgZnVuY3Rpb24gbW9kZWxQcm9qZWN0KEZvcmdlTW9kZWwsIHJlc291cmNlUGF0aCkge1xuICAgIGlmIChyZXNvdXJjZVBhdGgpIHtcbiAgICAgIHZhciBwcm9qZWN0ID0gRm9yZ2VNb2RlbC5wcm9qZWN0c1tyZXNvdXJjZVBhdGhdO1xuICAgICAgaWYgKCFwcm9qZWN0KSB7XG4gICAgICAgIHByb2plY3QgPSB7fTtcbiAgICAgICAgRm9yZ2VNb2RlbC5wcm9qZWN0c1tyZXNvdXJjZVBhdGhdID0gcHJvamVjdDtcbiAgICAgIH1cbiAgICAgIHJldHVybiBwcm9qZWN0O1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gRm9yZ2VNb2RlbC5yb290UHJvamVjdDtcbiAgICB9XG4gIH1cblxuICBleHBvcnQgZnVuY3Rpb24gc2V0TW9kZWxDb21tYW5kcyhGb3JnZU1vZGVsLCByZXNvdXJjZVBhdGgsIGNvbW1hbmRzKSB7XG4gICAgdmFyIHByb2plY3QgPSBtb2RlbFByb2plY3QoRm9yZ2VNb2RlbCwgcmVzb3VyY2VQYXRoKTtcbiAgICBwcm9qZWN0LiRjb21tYW5kcyA9IGNvbW1hbmRzO1xuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIGdldE1vZGVsQ29tbWFuZHMoRm9yZ2VNb2RlbCwgcmVzb3VyY2VQYXRoKSB7XG4gICAgdmFyIHByb2plY3QgPSBtb2RlbFByb2plY3QoRm9yZ2VNb2RlbCwgcmVzb3VyY2VQYXRoKTtcbiAgICByZXR1cm4gcHJvamVjdC4kY29tbWFuZHMgfHwgW107XG4gIH1cblxuICBmdW5jdGlvbiBtb2RlbENvbW1hbmRJbnB1dE1hcChGb3JnZU1vZGVsLCByZXNvdXJjZVBhdGgpIHtcbiAgICB2YXIgcHJvamVjdCA9IG1vZGVsUHJvamVjdChGb3JnZU1vZGVsLCByZXNvdXJjZVBhdGgpO1xuICAgIHZhciBjb21tYW5kSW5wdXRzID0gcHJvamVjdC4kY29tbWFuZElucHV0cztcbiAgICBpZiAoIWNvbW1hbmRJbnB1dHMpIHtcbiAgICAgIGNvbW1hbmRJbnB1dHMgPSB7fTtcbiAgICAgIHByb2plY3QuJGNvbW1hbmRJbnB1dHMgPSBjb21tYW5kSW5wdXRzO1xuICAgIH1cbiAgICByZXR1cm4gY29tbWFuZElucHV0cztcbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiBnZXRNb2RlbENvbW1hbmRJbnB1dHMoRm9yZ2VNb2RlbCwgcmVzb3VyY2VQYXRoLCBpZCkge1xuICAgIHZhciBjb21tYW5kSW5wdXRzID0gbW9kZWxDb21tYW5kSW5wdXRNYXAoRm9yZ2VNb2RlbCwgcmVzb3VyY2VQYXRoKTtcbiAgICByZXR1cm4gY29tbWFuZElucHV0c1tpZF07XG4gIH1cblxuICBleHBvcnQgZnVuY3Rpb24gc2V0TW9kZWxDb21tYW5kSW5wdXRzKEZvcmdlTW9kZWwsIHJlc291cmNlUGF0aCwgaWQsIGl0ZW0pIHtcbiAgICB2YXIgY29tbWFuZElucHV0cyA9IG1vZGVsQ29tbWFuZElucHV0TWFwKEZvcmdlTW9kZWwsIHJlc291cmNlUGF0aCk7XG4gICAgcmV0dXJuIGNvbW1hbmRJbnB1dHNbaWRdID0gaXRlbTtcbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiBlbnJpY2hSZXBvKHJlcG8pIHtcbiAgICB2YXIgb3duZXIgPSByZXBvLm93bmVyIHx8IHt9O1xuICAgIHZhciB1c2VyID0gb3duZXIudXNlcm5hbWUgfHwgcmVwby51c2VyO1xuICAgIHZhciBuYW1lID0gcmVwby5uYW1lO1xuICAgIHZhciBwcm9qZWN0SWQgPSBuYW1lO1xuICAgIHZhciBhdmF0YXJfdXJsID0gb3duZXIuYXZhdGFyX3VybDtcbiAgICBpZiAoYXZhdGFyX3VybCAmJiBhdmF0YXJfdXJsLnN0YXJ0c1dpdGgoXCJodHRwLy9cIikpIHtcbiAgICAgIGF2YXRhcl91cmwgPSBcImh0dHA6Ly9cIiArIGF2YXRhcl91cmwuc3Vic3RyaW5nKDYpO1xuICAgICAgb3duZXIuYXZhdGFyX3VybCA9IGF2YXRhcl91cmw7XG4gICAgfVxuICAgIGlmICh1c2VyICYmIG5hbWUpIHtcbiAgICAgIHZhciByZXNvdXJjZVBhdGggPSB1c2VyICsgXCIvXCIgKyBuYW1lO1xuICAgICAgcmVwby4kY29tbWFuZHNMaW5rID0gY29tbWFuZHNMaW5rKHJlc291cmNlUGF0aCwgcHJvamVjdElkKTtcbiAgICAgIHJlcG8uJGJ1aWxkc0xpbmsgPSBcIi9rdWJlcm5ldGVzL2J1aWxkcz9xPS9cIiArIHJlc291cmNlUGF0aCArIFwiLmdpdFwiO1xuICAgICAgdmFyIGluamVjdG9yID0gSGF3dGlvQ29yZS5pbmplY3RvcjtcbiAgICAgIGlmIChpbmplY3Rvcikge1xuICAgICAgICB2YXIgU2VydmljZVJlZ2lzdHJ5ID0gaW5qZWN0b3IuZ2V0KFwiU2VydmljZVJlZ2lzdHJ5XCIpO1xuICAgICAgICBpZiAoU2VydmljZVJlZ2lzdHJ5KSB7XG4gICAgICAgICAgdmFyIG9yaW9uTGluayA9IFNlcnZpY2VSZWdpc3RyeS5zZXJ2aWNlTGluayhvcmlvblNlcnZpY2VOYW1lKTtcbiAgICAgICAgICB2YXIgZ29nc1NlcnZpY2UgPSBTZXJ2aWNlUmVnaXN0cnkuZmluZFNlcnZpY2UoZ29nc1NlcnZpY2VOYW1lKTtcbiAgICAgICAgICBpZiAob3Jpb25MaW5rICYmIGdvZ3NTZXJ2aWNlKSB7XG4gICAgICAgICAgICB2YXIgcG9ydGFsSXAgPSBnb2dzU2VydmljZS5wb3J0YWxJUDtcbiAgICAgICAgICAgIGlmIChwb3J0YWxJcCkge1xuICAgICAgICAgICAgICB2YXIgcG9ydCA9IGdvZ3NTZXJ2aWNlLnBvcnQ7XG4gICAgICAgICAgICAgIHZhciBwb3J0VGV4dCA9IChwb3J0ICYmIHBvcnQgIT09IDgwICYmIHBvcnQgIT09IDQ0MykgPyBcIjpcIiArIHBvcnQgOiBcIlwiO1xuICAgICAgICAgICAgICB2YXIgcHJvdG9jb2wgPSAocG9ydCAmJiBwb3J0ID09PSA0NDMpID8gXCJodHRwczovL1wiIDogXCJodHRwOi8vXCI7XG4gICAgICAgICAgICAgIHZhciBnaXRDbG9uZVVybCA9IFVybEhlbHBlcnMuam9pbihwcm90b2NvbCArIHBvcnRhbElwICsgcG9ydFRleHQgKyBcIi9cIiwgcmVzb3VyY2VQYXRoICsgXCIuZ2l0XCIpO1xuXG4gICAgICAgICAgICAgIHJlcG8uJG9wZW5Qcm9qZWN0TGluayA9IFVybEhlbHBlcnMuam9pbihvcmlvbkxpbmssXG4gICAgICAgICAgICAgICAgXCIvZ2l0L2dpdC1yZXBvc2l0b3J5Lmh0bWwjLGNyZWF0ZVByb2plY3QubmFtZT1cIiArIG5hbWUgKyBcIixjbG9uZUdpdD1cIiArIGdpdENsb25lVXJsKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBleHBvcnQgZnVuY3Rpb24gY3JlYXRlSHR0cENvbmZpZygpIHtcbiAgICB2YXIgY29uZmlnID0ge1xuICAgICAgaGVhZGVyczoge1xuICAgICAgfVxuICAgIH07XG4gICAgcmV0dXJuIGNvbmZpZztcbiAgfVxuXG4gIGZ1bmN0aW9uIGFkZFF1ZXJ5QXJndW1lbnQodXJsLCBuYW1lLCB2YWx1ZSkge1xuICAgIGlmICh1cmwgJiYgbmFtZSAmJiB2YWx1ZSkge1xuICAgICAgdmFyIHNlcCA9ICAodXJsLmluZGV4T2YoXCI/XCIpID49IDApID8gXCImXCIgOiBcIj9cIjtcbiAgICAgIHJldHVybiB1cmwgKyBzZXAgKyAgbmFtZSArIFwiPVwiICsgZW5jb2RlVVJJQ29tcG9uZW50KHZhbHVlKTtcbiAgICB9XG4gICAgcmV0dXJuIHVybDtcbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiBjcmVhdGVIdHRwVXJsKHByb2plY3RJZCwgdXJsLCBhdXRoSGVhZGVyID0gbnVsbCwgZW1haWwgPSBudWxsKSB7XG4gICAgdmFyIGxvY2FsU3RvcmFnZSA9IEt1YmVybmV0ZXMuaW5qZWN0KFwibG9jYWxTdG9yYWdlXCIpIHx8IHt9O1xuICAgIHZhciBucyA9IEt1YmVybmV0ZXMuY3VycmVudEt1YmVybmV0ZXNOYW1lc3BhY2UoKTtcbiAgICB2YXIgc2VjcmV0ID0gZ2V0UHJvamVjdFNvdXJjZVNlY3JldChsb2NhbFN0b3JhZ2UsIG5zLCBwcm9qZWN0SWQpO1xuICAgIHZhciBzZWNyZXROUyA9IGdldFNvdXJjZVNlY3JldE5hbWVzcGFjZShsb2NhbFN0b3JhZ2UpO1xuXG4gICAgYXV0aEhlYWRlciA9IGF1dGhIZWFkZXIgfHwgbG9jYWxTdG9yYWdlW1wiZ29nc0F1dGhvcml6YXRpb25cIl07XG4gICAgZW1haWwgPSBlbWFpbCB8fCBsb2NhbFN0b3JhZ2VbXCJnb2dzRW1haWxcIl07XG5cbiAgICB1cmwgPSBhZGRRdWVyeUFyZ3VtZW50KHVybCwgXCJfZ29nc0F1dGhcIiwgYXV0aEhlYWRlcik7XG4gICAgdXJsID0gYWRkUXVlcnlBcmd1bWVudCh1cmwsIFwiX2dvZ3NFbWFpbFwiLCBlbWFpbCk7XG4gICAgdXJsID0gYWRkUXVlcnlBcmd1bWVudCh1cmwsIFwic2VjcmV0XCIsIHNlY3JldCk7XG4gICAgdXJsID0gYWRkUXVlcnlBcmd1bWVudCh1cmwsIFwic2VjcmV0TmFtZXNwYWNlXCIsIHNlY3JldE5TKTtcbiAgICByZXR1cm4gdXJsO1xuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIGNvbW1hbmRNYXRjaGVzVGV4dChjb21tYW5kLCBmaWx0ZXJUZXh0KSB7XG4gICAgaWYgKGZpbHRlclRleHQpIHtcbiAgICAgIHJldHVybiBDb3JlLm1hdGNoRmlsdGVySWdub3JlQ2FzZShhbmd1bGFyLnRvSnNvbihjb21tYW5kKSwgZmlsdGVyVGV4dCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiBpc1NvdXJjZVNlY3JldERlZmluZWRGb3JQcm9qZWN0KG5zLCBwcm9qZWN0SWQpIHtcbiAgICB2YXIgbG9jYWxTdG9yYWdlID0gS3ViZXJuZXRlcy5pbmplY3QoXCJsb2NhbFN0b3JhZ2VcIikgfHwge307XG5cbiAgICByZXR1cm4gZ2V0UHJvamVjdFNvdXJjZVNlY3JldChsb2NhbFN0b3JhZ2UsIG5zLCBwcm9qZWN0SWQpO1xuLypcbiAgICB2YXIgYXV0aEhlYWRlciA9IGxvY2FsU3RvcmFnZVtcImdvZ3NBdXRob3JpemF0aW9uXCJdO1xuICAgIHJldHVybiBhdXRoSGVhZGVyID8gdHJ1ZSA6IGZhbHNlO1xuKi9cbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiByZWRpcmVjdFRvU2V0dXBTZWNyZXRzSWZOb3REZWZpbmVkKCRzY29wZSwgJGxvY2F0aW9uKSB7XG4gICAgdmFyIG5zID0gJHNjb3BlLm5hbWVzcGFjZSB8fCBLdWJlcm5ldGVzLmN1cnJlbnRLdWJlcm5ldGVzTmFtZXNwYWNlKCk7XG4gICAgdmFyIHByb2plY3RJZCA9ICRzY29wZS5wcm9qZWN0SWQ7XG5cbiAgICBpZiAoIWlzU291cmNlU2VjcmV0RGVmaW5lZEZvclByb2plY3QobnMsIHByb2plY3RJZCkpIHtcbiAgICAgIHZhciBsb2dpblBhZ2UgPSBEZXZlbG9wZXIucHJvamVjdFNlY3JldHNMaW5rKG5zLCBwcm9qZWN0SWQpICsgXCJSZXF1aXJlZFwiO1xuICAgICAgbG9nLmluZm8oXCJObyBzZWNyZXQgc2V0dXAgc28gcmVkaXJlY3RpbmcgdG8gXCIgKyBsb2dpblBhZ2UpO1xuICAgICAgJGxvY2F0aW9uLnBhdGgobG9naW5QYWdlKVxuICAgIH1cbiAgfVxufVxuIiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL2luY2x1ZGVzLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cImZvcmdlSGVscGVycy50c1wiLz5cblxubW9kdWxlIEZvcmdlIHtcblxuICBleHBvcnQgdmFyIF9tb2R1bGUgPSBhbmd1bGFyLm1vZHVsZShwbHVnaW5OYW1lLCBbJ2hhd3Rpby1jb3JlJywgJ2hhd3Rpby11aSddKTtcbiAgZXhwb3J0IHZhciBjb250cm9sbGVyID0gUGx1Z2luSGVscGVycy5jcmVhdGVDb250cm9sbGVyRnVuY3Rpb24oX21vZHVsZSwgcGx1Z2luTmFtZSk7XG4gIGV4cG9ydCB2YXIgcm91dGUgPSBQbHVnaW5IZWxwZXJzLmNyZWF0ZVJvdXRpbmdGdW5jdGlvbih0ZW1wbGF0ZVBhdGgpO1xuXG4gIF9tb2R1bGUuY29uZmlnKFsnJHJvdXRlUHJvdmlkZXInLCAoJHJvdXRlUHJvdmlkZXI6bmcucm91dGUuSVJvdXRlUHJvdmlkZXIpID0+IHtcblxuICAgIGNvbnNvbGUubG9nKFwiTGlzdGVuaW5nIG9uOiBcIiArIFVybEhlbHBlcnMuam9pbihjb250ZXh0LCAnL2NyZWF0ZVByb2plY3QnKSk7XG5cbiAgICAkcm91dGVQcm92aWRlci53aGVuKFVybEhlbHBlcnMuam9pbihjb250ZXh0LCAnL2NyZWF0ZVByb2plY3QnKSwgcm91dGUoJ2NyZWF0ZVByb2plY3QuaHRtbCcsIGZhbHNlKSlcbiAgICAgIC53aGVuKFVybEhlbHBlcnMuam9pbihjb250ZXh0LCAnL3JlcG9zLzpwYXRoKicpLCByb3V0ZSgncmVwby5odG1sJywgZmFsc2UpKVxuICAgICAgLndoZW4oVXJsSGVscGVycy5qb2luKGNvbnRleHQsICcvcmVwb3MnKSwgcm91dGUoJ3JlcG9zLmh0bWwnLCBmYWxzZSkpO1xuXG4gICAgYW5ndWxhci5mb3JFYWNoKFtjb250ZXh0LCAnL3dvcmtzcGFjZXMvOm5hbWVzcGFjZS9wcm9qZWN0cy86cHJvamVjdC9mb3JnZScsICcvd29ya3NwYWNlcy86bmFtZXNwYWNlL2ZvcmdlJ10sIChwYXRoKSA9PiB7XG4gICAgICAkcm91dGVQcm92aWRlclxuICAgICAgICAud2hlbihVcmxIZWxwZXJzLmpvaW4ocGF0aCwgJy9jb21tYW5kcycpLCByb3V0ZSgnY29tbWFuZHMuaHRtbCcsIGZhbHNlKSlcbiAgICAgICAgLndoZW4oVXJsSGVscGVycy5qb2luKHBhdGgsICcvY29tbWFuZHMvOnBhdGgqJyksIHJvdXRlKCdjb21tYW5kcy5odG1sJywgZmFsc2UpKVxuICAgICAgICAud2hlbihVcmxIZWxwZXJzLmpvaW4ocGF0aCwgJy9jb21tYW5kLzppZCcpLCByb3V0ZSgnY29tbWFuZC5odG1sJywgZmFsc2UpKVxuICAgICAgICAud2hlbihVcmxIZWxwZXJzLmpvaW4ocGF0aCwgJy9jb21tYW5kLzppZC86cGF0aConKSwgcm91dGUoJ2NvbW1hbmQuaHRtbCcsIGZhbHNlKSk7XG4gICAgfSk7XG5cbiAgICBhbmd1bGFyLmZvckVhY2goW2NvbnRleHQsICcvd29ya3NwYWNlcy86bmFtZXNwYWNlL3Byb2plY3RzLzpwcm9qZWN0L2ZvcmdlJywgJy93b3Jrc3BhY2VzLzpuYW1lc3BhY2UvcHJvamVjdHMvZm9yZ2UnXSwgKHBhdGgpID0+IHtcbiAgICAgICRyb3V0ZVByb3ZpZGVyXG4gICAgICAgIC53aGVuKFVybEhlbHBlcnMuam9pbihwYXRoLCAnL3NlY3JldHMnKSwgcm91dGUoJ3NlY3JldHMuaHRtbCcsIGZhbHNlKSlcbiAgICAgICAgLndoZW4oVXJsSGVscGVycy5qb2luKHBhdGgsICcvc2VjcmV0c1JlcXVpcmVkJyksIHJvdXRlKCdzZWNyZXRzUmVxdWlyZWQuaHRtbCcsIGZhbHNlKSk7XG4gICAgfSk7XG5cbiAgfV0pO1xuXG4gIF9tb2R1bGUuZmFjdG9yeSgnRm9yZ2VBcGlVUkwnLCBbJyRxJywgJyRyb290U2NvcGUnLCAoJHE6bmcuSVFTZXJ2aWNlLCAkcm9vdFNjb3BlOm5nLklSb290U2NvcGVTZXJ2aWNlKSA9PiB7XG4gICAgcmV0dXJuIEt1YmVybmV0ZXMua3ViZXJuZXRlc0FwaVVybCgpICsgXCIvcHJveHlcIiArIEt1YmVybmV0ZXMua3ViZXJuZXRlc05hbWVzcGFjZVBhdGgoKSArIFwiL3NlcnZpY2VzL2ZhYnJpYzgtZm9yZ2UvYXBpL2ZvcmdlXCI7XG4gIH1dKTtcblxuXG4gIF9tb2R1bGUuZmFjdG9yeSgnRm9yZ2VNb2RlbCcsIFsnJHEnLCAnJHJvb3RTY29wZScsICgkcTpuZy5JUVNlcnZpY2UsICRyb290U2NvcGU6bmcuSVJvb3RTY29wZVNlcnZpY2UpID0+IHtcbiAgICByZXR1cm4ge1xuICAgICAgcm9vdFByb2plY3Q6IHt9LFxuICAgICAgcHJvamVjdHM6IFtdXG4gICAgfVxuICB9XSk7XG5cbiAgX21vZHVsZS5ydW4oWyd2aWV3UmVnaXN0cnknLCAnSGF3dGlvTmF2JywgKHZpZXdSZWdpc3RyeSwgSGF3dGlvTmF2KSA9PiB7XG4gICAgdmlld1JlZ2lzdHJ5Wydmb3JnZSddID0gdGVtcGxhdGVQYXRoICsgJ2xheW91dEZvcmdlLmh0bWwnO1xuICB9XSk7XG5cbiAgaGF3dGlvUGx1Z2luTG9hZGVyLmFkZE1vZHVsZShwbHVnaW5OYW1lKTtcbn1cbiIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9pbmNsdWRlcy50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJmb3JnZUhlbHBlcnMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiZm9yZ2VQbHVnaW4udHNcIi8+XG5cbm1vZHVsZSBGb3JnZSB7XG5cbiAgZXhwb3J0IHZhciBBcmNoZXR5cGVQaWNrZXIgPSBjb250cm9sbGVyKFwiQXJjaGV0eXBlUGlja2VyXCIsXG4gICAgW1wiJHNjb3BlXCIsIFwiJHRlbXBsYXRlQ2FjaGVcIiwgXCIkbG9jYXRpb25cIiwgXCIkcm91dGVQYXJhbXNcIiwgXCIkaHR0cFwiLCBcIiR0aW1lb3V0XCIsIFwiRm9yZ2VBcGlVUkxcIiwgXCJGb3JnZU1vZGVsXCIsXG4gICAgICAoJHNjb3BlLCAkdGVtcGxhdGVDYWNoZTpuZy5JVGVtcGxhdGVDYWNoZVNlcnZpY2UsICRsb2NhdGlvbjpuZy5JTG9jYXRpb25TZXJ2aWNlLCAkcm91dGVQYXJhbXMsICRodHRwLCAkdGltZW91dCwgRm9yZ2VBcGlVUkwsIEZvcmdlTW9kZWwpID0+IHtcblxuICAgICAgICB2YXIgY29uZmlnID0gJHNjb3BlLmNvbmZpZyB8fCB7fTtcbiAgICAgICAgdmFyIHByb3BlcnRpZXMgPSBjb25maWcucHJvcGVydGllcyB8fCB7fTtcbiAgICAgICAgdmFyIGFyY2hldHlwZSA9IHByb3BlcnRpZXMuYXJjaGV0eXBlIHx8IHt9O1xuICAgICAgICAkc2NvcGUuYXJjaGV0eXBlcyA9IGFyY2hldHlwZS5lbnVtO1xuICAgICAgICBhbmd1bGFyLmZvckVhY2goJHNjb3BlLmFyY2hldHlwZXMsIChhcmNoZXR5cGUpID0+IHtcbiAgICAgICAgICB2YXIgYXJ0aWZhY3RJZCA9IGFyY2hldHlwZS5hcnRpZmFjdElkO1xuICAgICAgICAgIGlmIChhcnRpZmFjdElkKSB7XG4gICAgICAgICAgICB2YXIgYXJ0aWZhY3RMYWJlbCA9IENvcmUudHJpbVRyYWlsaW5nKGFydGlmYWN0SWQsIFwiLWFyY2hldHlwZVwiKTtcbiAgICAgICAgICAgIGFyY2hldHlwZS4kYXJ0aWZhY3RMYWJlbCA9IGFydGlmYWN0TGFiZWw7XG4gICAgICAgICAgICBhcmNoZXR5cGUuJHZhbHVlID0gYXJjaGV0eXBlLmdyb3VwSWQgKyBcIjpcIiArIGFydGlmYWN0SWQgKyBcIjpcIiArIGFyY2hldHlwZS52ZXJzaW9uO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgJHNjb3BlLnRhYmxlQ29uZmlnID0ge1xuICAgICAgICAgIGRhdGE6ICdhcmNoZXR5cGVzJyxcbiAgICAgICAgICBwcmltYXJ5S2V5Rm46IChpdGVtKSA9PiBpdGVtLiR2YWx1ZSxcbiAgICAgICAgICBzaG93U2VsZWN0aW9uQ2hlY2tib3g6IGZhbHNlLFxuICAgICAgICAgIGVuYWJsZVJvd0NsaWNrU2VsZWN0aW9uOiB0cnVlLFxuICAgICAgICAgIG11bHRpU2VsZWN0OiBmYWxzZSxcbiAgICAgICAgICBzZWxlY3RlZEl0ZW1zOiBbXSxcbiAgICAgICAgICBmaWx0ZXJPcHRpb25zOiB7XG4gICAgICAgICAgICBmaWx0ZXJUZXh0OiAnJ1xuICAgICAgICAgIH0sXG4gICAgICAgICAgY29sdW1uRGVmczogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBmaWVsZDogJyRhcnRpZmFjdExhYmVsJyxcbiAgICAgICAgICAgICAgZGlzcGxheU5hbWU6ICdBcmNoZXR5cGUnLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgZmllbGQ6ICdkZXNjcmlwdGlvbicsXG4gICAgICAgICAgICAgIGRpc3BsYXlOYW1lOiAnRGVzY3JpcHRpb24nLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgZmllbGQ6ICdncm91cElkJyxcbiAgICAgICAgICAgICAgZGlzcGxheU5hbWU6ICdHcm91cCBJZCcsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBmaWVsZDogJ3ZlcnNpb24nLFxuICAgICAgICAgICAgICBkaXNwbGF5TmFtZTogJ1ZlcnNpb24nLFxuICAgICAgICAgICAgfVxuICAgICAgICAgIF1cbiAgICAgICAgfTtcbiAgICAgICAgZW50aXR5Q2hhbmdlZCgpO1xuXG4gICAgICAgICRzY29wZS4kd2F0Y2goXCJlbnRpdHkuYXJjaGV0eXBlXCIsIGVudGl0eUNoYW5nZWQpO1xuICAgICAgICAkc2NvcGUuJHdhdGNoQ29sbGVjdGlvbihcInRhYmxlQ29uZmlnLnNlbGVjdGVkSXRlbXNcIiwgdXNlclNlbGVjdGlvbkNoYW5nZWQpO1xuXG4gICAgICAgIGZ1bmN0aW9uIGdldFNlbGVjdGlvbih2YWx1ZSkge1xuICAgICAgICAgIHZhciBhbnN3ZXIgPSBudWxsO1xuICAgICAgICAgIGlmICh2YWx1ZSkge1xuICAgICAgICAgICAgYW5ndWxhci5mb3JFYWNoKCRzY29wZS5hcmNoZXR5cGVzLCAocGlwZWxpbmUpID0+IHtcbiAgICAgICAgICAgICAgaWYgKCFhbnN3ZXIgJiYgdmFsdWUgPT09IHBpcGVsaW5lLiR2YWx1ZSkge1xuICAgICAgICAgICAgICAgIGFuc3dlciA9IHBpcGVsaW5lO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIGFuc3dlcjtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGVudGl0eUNoYW5nZWQoKSB7XG4gICAgICAgICAgdmFyIGFyY2hldHlwZSA9ICRzY29wZS5lbnRpdHkuYXJjaGV0eXBlIHx8IHt9O1xuICAgICAgICAgIHZhciBwaXBlbGluZVZhbHVlID0gYW5ndWxhci5pc1N0cmluZyhhcmNoZXR5cGUpID8gYXJjaGV0eXBlIDogYXJjaGV0eXBlLnZhbHVlO1xuICAgICAgICAgIHZhciBpbml0aWFsU2VsZWN0aW9uID0gZ2V0U2VsZWN0aW9uKHBpcGVsaW5lVmFsdWUpO1xuICAgICAgICAgIGlmIChpbml0aWFsU2VsZWN0aW9uKSB7XG4gICAgICAgICAgICAkc2NvcGUudGFibGVDb25maWcuc2VsZWN0ZWRJdGVtcyA9IFtpbml0aWFsU2VsZWN0aW9uXTtcbiAgICAgICAgICAgIHVzZXJTZWxlY3Rpb25DaGFuZ2VkKCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgdmFyIGZpcnN0ID0gdHJ1ZTtcblxuICAgICAgICBmdW5jdGlvbiB1c2VyU2VsZWN0aW9uQ2hhbmdlZCgpIHtcbiAgICAgICAgICB2YXIgc2VsZWN0aW9uID0gJHNjb3BlLnRhYmxlQ29uZmlnLnNlbGVjdGVkSXRlbXM7XG4gICAgICAgICAgdmFyIHNlbGVjdGVkVmFsdWUgPSBcIlwiO1xuICAgICAgICAgIHZhciBzZWxlY3RlZCA9IG51bGw7XG4gICAgICAgICAgaWYgKHNlbGVjdGlvbiAmJiBzZWxlY3Rpb24ubGVuZ3RoKSB7XG4gICAgICAgICAgICBzZWxlY3RlZCA9IHNlbGVjdGlvblswXTtcbiAgICAgICAgICAgIHNlbGVjdGVkVmFsdWUgPSBzZWxlY3RlZC4kdmFsdWU7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gbGV0cyBub3QgY2xlYXIgdGhlIHNlbGVjdGlvbiBvbiBzdGFydHVwIHdoZW4gd2UgaGF2ZSBhbiBlbXB0eSBzZWxlY3Rpb25cbiAgICAgICAgICBpZiAoc2VsZWN0ZWRWYWx1ZSB8fCAhZmlyc3QpIHtcbiAgICAgICAgICAgICRzY29wZS5lbnRpdHkuYXJjaGV0eXBlID0gc2VsZWN0ZWRWYWx1ZTtcbiAgICAgICAgICAgIGZpcnN0ID0gZmFsc2U7XG4gICAgICAgICAgfVxuICAgICAgICAgICRzY29wZS5zZWxlY3RlZCA9IHNlbGVjdGVkO1xuICAgICAgICAgIENvcmUuJGFwcGx5KCRzY29wZSk7XG4gICAgICAgIH1cbiAgICAgIH1dKTtcbn1cbiIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9pbmNsdWRlcy50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJmb3JnZUhlbHBlcnMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiZm9yZ2VQbHVnaW4udHNcIi8+XG5cbm1vZHVsZSBGb3JnZSB7XG5cbiAgZXhwb3J0IHZhciBDb21tYW5kQ29udHJvbGxlciA9IGNvbnRyb2xsZXIoXCJDb21tYW5kQ29udHJvbGxlclwiLFxuICAgIFtcIiRzY29wZVwiLCBcIiR0ZW1wbGF0ZUNhY2hlXCIsIFwiJGxvY2F0aW9uXCIsIFwiJHJvdXRlUGFyYW1zXCIsIFwiJGh0dHBcIiwgXCIkdGltZW91dFwiLCBcIkZvcmdlQXBpVVJMXCIsIFwiRm9yZ2VNb2RlbFwiLFxuICAgICAgKCRzY29wZSwgJHRlbXBsYXRlQ2FjaGU6bmcuSVRlbXBsYXRlQ2FjaGVTZXJ2aWNlLCAkbG9jYXRpb246bmcuSUxvY2F0aW9uU2VydmljZSwgJHJvdXRlUGFyYW1zLCAkaHR0cCwgJHRpbWVvdXQsIEZvcmdlQXBpVVJMLCBGb3JnZU1vZGVsKSA9PiB7XG5cbiAgICAgICAgJHNjb3BlLm1vZGVsID0gRm9yZ2VNb2RlbDtcblxuICAgICAgICAkc2NvcGUucmVzb3VyY2VQYXRoID0gJHJvdXRlUGFyYW1zW1wicGF0aFwiXSB8fCAkbG9jYXRpb24uc2VhcmNoKClbXCJwYXRoXCJdIHx8IFwiXCI7XG4gICAgICAgICRzY29wZS5pZCA9ICRyb3V0ZVBhcmFtc1tcImlkXCJdO1xuICAgICAgICAkc2NvcGUucGF0aCA9ICRyb3V0ZVBhcmFtc1tcInBhdGhcIl07XG5cbiAgICAgICAgJHNjb3BlLmF2YXRhcl91cmwgPSBsb2NhbFN0b3JhZ2VbXCJnb2dzQXZhdGFyVXJsXCJdO1xuICAgICAgICAkc2NvcGUudXNlciA9IGxvY2FsU3RvcmFnZVtcImdvZ3NVc2VyXCJdO1xuICAgICAgICAkc2NvcGUucmVwb05hbWUgPSBcIlwiO1xuICAgICAgICB2YXIgcGF0aFN0ZXBzID0gJHNjb3BlLnJlc291cmNlUGF0aC5zcGxpdChcIi9cIik7XG4gICAgICAgIGlmIChwYXRoU3RlcHMgJiYgcGF0aFN0ZXBzLmxlbmd0aCkge1xuICAgICAgICAgICRzY29wZS5yZXBvTmFtZSA9IHBhdGhTdGVwc1twYXRoU3RlcHMubGVuZ3RoIC0gMV07XG4gICAgICAgIH1cblxuXG4gICAgICAgIGluaXRTY29wZSgkc2NvcGUsICRsb2NhdGlvbiwgJHJvdXRlUGFyYW1zKTtcbiAgICAgICAgaWYgKCRzY29wZS5pZCA9PT0gXCJkZXZvcHMtZWRpdFwiKSB7XG4gICAgICAgICAgJHNjb3BlLmJyZWFkY3J1bWJDb25maWcgPSBEZXZlbG9wZXIuY3JlYXRlUHJvamVjdFNldHRpbmdzQnJlYWRjcnVtYnMoJHNjb3BlLnByb2plY3RJZCk7XG4gICAgICAgICAgJHNjb3BlLnN1YlRhYkNvbmZpZyA9IERldmVsb3Blci5jcmVhdGVQcm9qZWN0U2V0dGluZ3NTdWJOYXZCYXJzKCRzY29wZS5wcm9qZWN0SWQpO1xuICAgICAgICB9XG4gICAgICAgIHJlZGlyZWN0VG9TZXR1cFNlY3JldHNJZk5vdERlZmluZWQoJHNjb3BlLCAkbG9jYXRpb24pO1xuXG4gICAgICAgICRzY29wZS4kY29tcGxldGVMaW5rID0gJHNjb3BlLiRwcm9qZWN0TGluaztcbiAgICAgICAgaWYgKCRzY29wZS5wcm9qZWN0SWQpIHtcblxuICAgICAgICB9XG4gICAgICAgICRzY29wZS5jb21tYW5kc0xpbmsgPSBjb21tYW5kc0xpbmsoJHNjb3BlLnJlc291cmNlUGF0aCwgJHNjb3BlLnByb2plY3RJZCk7XG4gICAgICAgICRzY29wZS5jb21wbGV0ZWRMaW5rID0gJHNjb3BlLnByb2plY3RJZCA/IFVybEhlbHBlcnMuam9pbigkc2NvcGUuJHByb2plY3RMaW5rLCBcImVudmlyb25tZW50c1wiKSA6ICRzY29wZS4kcHJvamVjdExpbms7XG5cbiAgICAgICAgJHNjb3BlLmVudGl0eSA9IHtcbiAgICAgICAgfTtcbiAgICAgICAgJHNjb3BlLmlucHV0TGlzdCA9IFskc2NvcGUuZW50aXR5XTtcblxuICAgICAgICAkc2NvcGUuc2NoZW1hID0gZ2V0TW9kZWxDb21tYW5kSW5wdXRzKEZvcmdlTW9kZWwsICRzY29wZS5yZXNvdXJjZVBhdGgsICRzY29wZS5pZCk7XG4gICAgICAgIG9uU2NoZW1hTG9hZCgpO1xuXG4gICAgICAgIGZ1bmN0aW9uIG9uUm91dGVDaGFuZ2VkKCkge1xuICAgICAgICAgIGNvbnNvbGUubG9nKFwicm91dGUgdXBkYXRlZDsgbGV0cyBjbGVhciB0aGUgZW50aXR5XCIpO1xuICAgICAgICAgICRzY29wZS5lbnRpdHkgPSB7XG4gICAgICAgICAgfTtcbiAgICAgICAgICAkc2NvcGUuaW5wdXRMaXN0ID0gWyRzY29wZS5lbnRpdHldO1xuICAgICAgICAgICRzY29wZS5wcmV2aW91c1NjaGVtYUpzb24gPSBcIlwiO1xuICAgICAgICAgICRzY29wZS5zY2hlbWEgPSBudWxsO1xuICAgICAgICAgIENvcmUuJGFwcGx5KCRzY29wZSk7XG4gICAgICAgICAgdXBkYXRlRGF0YSgpO1xuICAgICAgICB9XG5cbiAgICAgICAgJHNjb3BlLiRvbignJHJvdXRlQ2hhbmdlU3VjY2VzcycsIG9uUm91dGVDaGFuZ2VkKTtcblxuICAgICAgICAkc2NvcGUuaXNGb3JtVmFsaWQgPSAoKSA9PiB7XG4gICAgICAgICAgdmFyIHNjaGVtYSA9ICRzY29wZS5zY2hlbWEgfHwge307XG4gICAgICAgICAgdmFyIHByb3BlcnRpZXMgPSBzY2hlbWEucHJvcGVydGllcyB8fCB7fTtcbiAgICAgICAgICB2YXIgZW50aXR5ID0gJHNjb3BlLmVudGl0eSB8fCB7fTtcbiAgICAgICAgICB2YXIgdmFsaWQgPSB0cnVlO1xuICAgICAgICAgIHZhciBtaXNzaW5nRmllbGRzID0gW107XG4gICAgICAgICAgYW5ndWxhci5mb3JFYWNoKHNjaGVtYS5yZXF1aXJlZCwgKHByb3BlcnR5TmFtZSkgPT4ge1xuICAgICAgICAgICAgdmFyIHZhbHVlID0gZW50aXR5W3Byb3BlcnR5TmFtZV07XG4gICAgICAgICAgICBpZiAoIXZhbHVlKSB7XG4gICAgICAgICAgICAgIHZhbGlkID0gZmFsc2U7XG4gICAgICAgICAgICAgIHZhciBwcm9wZXJ0eSA9IHByb3BlcnRpZXNbcHJvcGVydHlOYW1lXSB8fCB7fTtcbiAgICAgICAgICAgICAgdmFyIHRpdGxlID0gcHJvcGVydHkudGl0bGUgfHwgcHJvcGVydHlOYW1lO1xuICAgICAgICAgICAgICBtaXNzaW5nRmllbGRzLnB1c2godGl0bGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICAgIHZhciB2YWxpZGF0aW9uTWVzc2FnZSA9IFwiXCI7XG4gICAgICAgICAgaWYgKG1pc3NpbmdGaWVsZHMubGVuZ3RoKSB7XG4gICAgICAgICAgICBpZiAobWlzc2luZ0ZpZWxkcy5sZW5ndGggPT0gMSkge1xuICAgICAgICAgICAgICB2YWxpZGF0aW9uTWVzc2FnZSA9IFwicmVxdWlyZWQgZmllbGQ6IFwiICsgbWlzc2luZ0ZpZWxkc1swXTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHZhbGlkYXRpb25NZXNzYWdlID0gXCJyZXF1aXJlZCBmaWVsZHM6IFwiICsgbWlzc2luZ0ZpZWxkcy5qb2luKFwiLCBcIik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgICRzY29wZS52YWxpZGF0aW9uTWVzc2FnZSA9IHZhbGlkYXRpb25NZXNzYWdlO1xuICAgICAgICAgIHJldHVybiB2YWxpZDtcbiAgICAgICAgfTtcblxuICAgICAgICAkc2NvcGUuZXhlY3V0ZSA9ICgpID0+IHtcbiAgICAgICAgICAvLyBUT0RPIGNoZWNrIGlmIHZhbGlkLi4uXG4gICAgICAgICAgJHNjb3BlLnJlc3BvbnNlID0gbnVsbDtcbiAgICAgICAgICAkc2NvcGUuZXhlY3V0aW5nID0gdHJ1ZTtcbiAgICAgICAgICAkc2NvcGUuaW52YWxpZCA9IGZhbHNlO1xuICAgICAgICAgICRzY29wZS52YWxpZGF0aW9uRXJyb3IgPSBudWxsO1xuICAgICAgICAgIHZhciBjb21tYW5kSWQgPSAkc2NvcGUuaWQ7XG4gICAgICAgICAgdmFyIHJlc291cmNlUGF0aCA9ICRzY29wZS5yZXNvdXJjZVBhdGg7XG4gICAgICAgICAgdmFyIHVybCA9IGV4ZWN1dGVDb21tYW5kQXBpVXJsKEZvcmdlQXBpVVJMLCBjb21tYW5kSWQpO1xuICAgICAgICAgIHZhciByZXF1ZXN0ID0ge1xuICAgICAgICAgICAgbmFtZXNwYWNlOiAkc2NvcGUubmFtZXNwYWNlLFxuICAgICAgICAgICAgcHJvamVjdE5hbWU6ICRzY29wZS5wcm9qZWN0SWQsXG4gICAgICAgICAgICByZXNvdXJjZTogcmVzb3VyY2VQYXRoLFxuICAgICAgICAgICAgaW5wdXRMaXN0OiAkc2NvcGUuaW5wdXRMaXN0XG4gICAgICAgICAgfTtcbiAgICAgICAgICB1cmwgPSBjcmVhdGVIdHRwVXJsKCRzY29wZS5wcm9qZWN0SWQsIHVybCk7XG4gICAgICAgICAgbG9nLmluZm8oXCJBYm91dCB0byBwb3N0IHRvIFwiICsgdXJsICsgXCIgcGF5bG9hZDogXCIgKyBhbmd1bGFyLnRvSnNvbihyZXF1ZXN0KSk7XG4gICAgICAgICAgJGh0dHAucG9zdCh1cmwsIHJlcXVlc3QsIGNyZWF0ZUh0dHBDb25maWcoKSkuXG4gICAgICAgICAgICBzdWNjZXNzKGZ1bmN0aW9uIChkYXRhLCBzdGF0dXMsIGhlYWRlcnMsIGNvbmZpZykge1xuICAgICAgICAgICAgICAkc2NvcGUuZXhlY3V0aW5nID0gZmFsc2U7XG4gICAgICAgICAgICAgICRzY29wZS5pbnZhbGlkID0gZmFsc2U7XG4gICAgICAgICAgICAgICRzY29wZS52YWxpZGF0aW9uRXJyb3IgPSBudWxsO1xuXG4gICAgICAgICAgICBpZiAoZGF0YSkge1xuICAgICAgICAgICAgICAgIGRhdGEubWVzc2FnZSA9IGRhdGEubWVzc2FnZSB8fCBkYXRhLm91dHB1dDtcbiAgICAgICAgICAgICAgICB2YXIgd2l6YXJkUmVzdWx0cyA9IGRhdGEud2l6YXJkUmVzdWx0cztcbiAgICAgICAgICAgICAgICBpZiAod2l6YXJkUmVzdWx0cykge1xuICAgICAgICAgICAgICAgICAgYW5ndWxhci5mb3JFYWNoKHdpemFyZFJlc3VsdHMuc3RlcFZhbGlkYXRpb25zLCAodmFsaWRhdGlvbikgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAoISRzY29wZS5pbnZhbGlkICYmICF2YWxpZGF0aW9uLnZhbGlkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgdmFyIG1lc3NhZ2VzID0gdmFsaWRhdGlvbi5tZXNzYWdlcyB8fCBbXTtcbiAgICAgICAgICAgICAgICAgICAgICBpZiAobWVzc2FnZXMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgbWVzc2FnZSA9IG1lc3NhZ2VzWzBdO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmludmFsaWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUudmFsaWRhdGlvbkVycm9yID0gbWVzc2FnZS5kZXNjcmlwdGlvbjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLnZhbGlkYXRpb25JbnB1dCA9IG1lc3NhZ2UuaW5wdXROYW1lO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICB2YXIgc3RlcElucHV0cyA9IHdpemFyZFJlc3VsdHMuc3RlcElucHV0cztcbiAgICAgICAgICAgICAgICAgIGlmIChzdGVwSW5wdXRzKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBzY2hlbWEgPSBfLmxhc3Qoc3RlcElucHV0cyk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChzY2hlbWEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuZW50aXR5ID0ge307XG4gICAgICAgICAgICAgICAgICAgICAgLy8gbGV0cyBjb3B5IGFjcm9zcyBhbnkgZGVmYXVsdCB2YWx1ZXMgZnJvbSB0aGUgc2NoZW1hXG5cbiAgICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbiBjb3B5VmFsdWVzRnJvbVNjaGVtYSgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFuZ3VsYXIuZm9yRWFjaChzY2hlbWFbXCJwcm9wZXJ0aWVzXCJdLCAocHJvcGVydHksIG5hbWUpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHZhbHVlID0gcHJvcGVydHkudmFsdWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh2YWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxvZy5pbmZvKFwiQWRkaW5nIGVudGl0eS5cIiArIG5hbWUgKyBcIiA9IFwiICsgdmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5lbnRpdHlbbmFtZV0gPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgY29weVZhbHVlc0Zyb21TY2hlbWEoKTtcbiAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuaW5wdXRMaXN0LnB1c2goJHNjb3BlLmVudGl0eSk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAkdGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBsZXRzIGRvIHRoaXMgYXN5bmMgdG8gYmUgc3VyZSB0aGV5IGRvbid0IGdldCBvdmVyd3JpdHRlbiBieSB0aGUgZm9ybSB3aWRnZXRcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvcHlWYWx1ZXNGcm9tU2NoZW1hKCk7XG4gICAgICAgICAgICAgICAgICAgICAgfSwgMjAwKTtcblxuICAgICAgICAgICAgICAgICAgICAgIHVwZGF0ZVNjaGVtYShzY2hlbWEpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgaWYgKGRhdGEuY2FuTW92ZVRvTmV4dFN0ZXApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGxldHMgY2xlYXIgdGhlIHJlc3BvbnNlIHdlJ3ZlIGFub3RoZXIgd2l6YXJkIHBhZ2UgdG8gZG9cbiAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEgPSBudWxsO1xuICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBvdGhlcndpc2UgaW5kaWNhdGUgdGhhdCB0aGUgd2l6YXJkIGp1c3QgY29tcGxldGVkIGFuZCBsZXRzIGhpZGUgdGhlIGlucHV0IGZvcm1cbiAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS53aXphcmRDb21wbGV0ZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBpZiAoISRzY29wZS5pbnZhbGlkKSB7XG4gICAgICAgICAgICAgICAgJHNjb3BlLnJlc3BvbnNlID0gZGF0YTtcbiAgICAgICAgICAgICAgICB2YXIgZGF0YU9yRW1wdHkgPSAoZGF0YSB8fCB7fSk7XG4gICAgICAgICAgICAgICAgdmFyIHN0YXR1cyA9IChkYXRhT3JFbXB0eS5zdGF0dXMgfHwgXCJcIikudG9TdHJpbmcoKS50b0xvd2VyQ2FzZSgpO1xuICAgICAgICAgICAgICAgICRzY29wZS5yZXNwb25zZUNsYXNzID0gdG9CYWNrZ3JvdW5kU3R5bGUoc3RhdHVzKTtcblxuICAgICAgICAgICAgICAgIHZhciBvdXRwdXRQcm9wZXJ0aWVzID0gKGRhdGFPckVtcHR5Lm91dHB1dFByb3BlcnRpZXMgfHwge30pO1xuICAgICAgICAgICAgICAgIHZhciBwcm9qZWN0SWQgPSBkYXRhT3JFbXB0eS5wcm9qZWN0TmFtZSB8fCBvdXRwdXRQcm9wZXJ0aWVzLmZ1bGxOYW1lO1xuICAgICAgICAgICAgICAgIGlmICgkc2NvcGUucmVzcG9uc2UgJiYgcHJvamVjdElkICYmICRzY29wZS5pZCA9PT0gJ3Byb2plY3QtbmV3Jykge1xuICAgICAgICAgICAgICAgICAgJHNjb3BlLnJlc3BvbnNlID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgIC8vIGxldHMgZm9yd2FyZCB0byB0aGUgZGV2b3BzIGVkaXQgcGFnZVxuICAgICAgICAgICAgICAgICAgLy8gbGV0cyBzZXQgdGhlIHNlY3JldCBuYW1lIGlmIGl0cyBudWxsXG4gICAgICAgICAgICAgICAgICBpZiAoIWdldFByb2plY3RTb3VyY2VTZWNyZXQobG9jYWxTdG9yYWdlLCAkc2NvcGUubmFtZXNwYWNlLCBwcm9qZWN0SWQpKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBkZWZhdWx0U2VjcmV0TmFtZSA9IGdldFByb2plY3RTb3VyY2VTZWNyZXQobG9jYWxTdG9yYWdlLCAkc2NvcGUubmFtZXNwYWNlLCAgbnVsbCk7XG4gICAgICAgICAgICAgICAgICAgIHNldFByb2plY3RTb3VyY2VTZWNyZXQobG9jYWxTdG9yYWdlLCAkc2NvcGUubmFtZXNwYWNlLCBwcm9qZWN0SWQsIGRlZmF1bHRTZWNyZXROYW1lKTtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIHZhciBlZGl0UGF0aCA9IFVybEhlbHBlcnMuam9pbihEZXZlbG9wZXIucHJvamVjdExpbmsocHJvamVjdElkKSwgXCIvZm9yZ2UvY29tbWFuZC9kZXZvcHMtZWRpdFwiKTtcbiAgICAgICAgICAgICAgICAgIC8vdmFyIGVkaXRQYXRoID0gRGV2ZWxvcGVyLnByb2plY3RTZWNyZXRzTGluaygkc2NvcGUubmFtZXNwYWNlLCBwcm9qZWN0SWQpO1xuICAgICAgICAgICAgICAgICAgbG9nLmluZm8oXCJNb3ZpbmcgdG8gdGhlIHNlY3JldHMgZWRpdCBwYXRoOiBcIiArIGVkaXRQYXRoKTtcbiAgICAgICAgICAgICAgICAgICRsb2NhdGlvbi5wYXRoKGVkaXRQYXRoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICAgICAgICAgIH0pLlxuICAgICAgICAgICAgZXJyb3IoZnVuY3Rpb24gKGRhdGEsIHN0YXR1cywgaGVhZGVycywgY29uZmlnKSB7XG4gICAgICAgICAgICAgICRzY29wZS5leGVjdXRpbmcgPSBmYWxzZTtcbiAgICAgICAgICAgICAgbG9nLndhcm4oXCJGYWlsZWQgdG8gbG9hZCBcIiArIHVybCArIFwiIFwiICsgZGF0YSArIFwiIFwiICsgc3RhdHVzKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgICAgICRzY29wZS4kd2F0Y2hDb2xsZWN0aW9uKFwiZW50aXR5XCIsICgpID0+IHtcbiAgICAgICAgICB2YWxpZGF0ZSgpO1xuICAgICAgICB9KTtcblxuICAgICAgICBmdW5jdGlvbiB1cGRhdGVTY2hlbWEoc2NoZW1hKSB7XG4gICAgICAgICAgaWYgKHNjaGVtYSkge1xuICAgICAgICAgICAgLy8gbGV0cyByZW1vdmUgdGhlIHZhbHVlcyBzbyB0aGF0IHdlIGNhbiBwcm9wZXJseSBjaGVjayB3aGVuIHRoZSBzY2hlbWEgcmVhbGx5IGRvZXMgY2hhbmdlXG4gICAgICAgICAgICAvLyBvdGhlcndpc2UgdGhlIHNjaGVtYSB3aWxsIGNoYW5nZSBldmVyeSB0aW1lIHdlIHR5cGUgYSBjaGFyYWN0ZXIgOylcbiAgICAgICAgICAgIHZhciBzY2hlbWFXaXRob3V0VmFsdWVzID0gYW5ndWxhci5jb3B5KHNjaGVtYSk7XG4gICAgICAgICAgICBhbmd1bGFyLmZvckVhY2goc2NoZW1hV2l0aG91dFZhbHVlcy5wcm9wZXJ0aWVzLCAocHJvcGVydHkpID0+IHtcbiAgICAgICAgICAgICAgZGVsZXRlIHByb3BlcnR5W1widmFsdWVcIl07XG4gICAgICAgICAgICAgIGRlbGV0ZSBwcm9wZXJ0eVtcImVuYWJsZWRcIl07XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHZhciBqc29uID0gYW5ndWxhci50b0pzb24oc2NoZW1hV2l0aG91dFZhbHVlcyk7XG4gICAgICAgICAgICBpZiAoanNvbiAhPT0gJHNjb3BlLnByZXZpb3VzU2NoZW1hSnNvbikge1xuICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcInVwZGF0ZWQgc2NoZW1hOiBcIiArIGpzb24pO1xuICAgICAgICAgICAgICAkc2NvcGUucHJldmlvdXNTY2hlbWFKc29uID0ganNvbjtcbiAgICAgICAgICAgICAgJHNjb3BlLnNjaGVtYSA9IHNjaGVtYTtcblxuICAgICAgICAgICAgICB2YXIgZW50aXR5ID0gJHNjb3BlLmVudGl0eTtcbiAgICAgICAgICAgICAgdmFyIHByb3BlcnRpZXMgPSBzY2hlbWEucHJvcGVydGllcyB8fCB7fTtcblxuICAgICAgICAgICAgICBpZiAoJHNjb3BlLmlkID09PSBcInByb2plY3QtbmV3XCIpIHtcbiAgICAgICAgICAgICAgICAvLyBsZXRzIGhpZGUgdGhlIHRhcmdldCBsb2NhdGlvbiFcbiAgICAgICAgICAgICAgICB2YXIgb3ZlcndyaXRlID0gcHJvcGVydGllcy5vdmVyd3JpdGU7XG4gICAgICAgICAgICAgICAgdmFyIGNhdGFsb2cgPSBwcm9wZXJ0aWVzLmNhdGFsb2c7XG4gICAgICAgICAgICAgICAgdmFyIHRhcmdldExvY2F0aW9uID0gcHJvcGVydGllcy50YXJnZXRMb2NhdGlvbjtcbiAgICAgICAgICAgICAgICB2YXIgYXJjaGV0eXBlID0gcHJvcGVydGllcy5hcmNoZXR5cGU7XG4gICAgICAgICAgICAgICAgaWYgKHRhcmdldExvY2F0aW9uKSB7XG4gICAgICAgICAgICAgICAgICB0YXJnZXRMb2NhdGlvbi5oaWRkZW4gPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgaWYgKG92ZXJ3cml0ZSkge1xuICAgICAgICAgICAgICAgICAgICBvdmVyd3JpdGUuaGlkZGVuID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiaGlkaW5nIHRhcmdldExvY2F0aW9uIVwiKTtcblxuICAgICAgICAgICAgICAgICAgLy8gbGV0cyBkZWZhdWx0IHRoZSB0eXBlXG4gICAgICAgICAgICAgICAgICBpZiAoIWVudGl0eS50eXBlKSB7XG4gICAgICAgICAgICAgICAgICAgIGVudGl0eS50eXBlID0gXCJGcm9tIEFyY2hldHlwZSBDYXRhbG9nXCI7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChjYXRhbG9nKSB7XG4gICAgICAgICAgICAgICAgICBpZiAoIWVudGl0eS5jYXRhbG9nKSB7XG4gICAgICAgICAgICAgICAgICAgIGVudGl0eS5jYXRhbG9nID0gXCJmYWJyaWM4XCI7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChhcmNoZXR5cGUpIHtcbiAgICAgICAgICAgICAgICAgIGFyY2hldHlwZS5mb3JtVGVtcGxhdGUgPSAkdGVtcGxhdGVDYWNoZS5nZXQoXCJkZXZPcHNBcmNoZXR5cGVDaG9vc2VyLmh0bWxcIik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9IGVsc2UgaWYgKCRzY29wZS5pZCA9PT0gXCJkZXZvcHMtZWRpdFwiKSB7XG4gICAgICAgICAgICAgICAgdmFyIHBpcGVsaW5lID0gcHJvcGVydGllcy5waXBlbGluZTtcbiAgICAgICAgICAgICAgICBpZiAocGlwZWxpbmUpIHtcbiAgICAgICAgICAgICAgICAgIHBpcGVsaW5lLmZvcm1UZW1wbGF0ZSA9ICR0ZW1wbGF0ZUNhY2hlLmdldChcImRldk9wc1BpcGVsaW5lQ2hvb3Nlci5odG1sXCIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIHZhbGlkYXRlKCkge1xuICAgICAgICAgIGlmICgkc2NvcGUuZXhlY3V0aW5nIHx8ICRzY29wZS52YWxpZGF0aW5nKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICAgIHZhciBuZXdKc29uID0gYW5ndWxhci50b0pzb24oJHNjb3BlLmVudGl0eSk7XG4gICAgICAgICAgaWYgKG5ld0pzb24gPT09ICRzY29wZS52YWxpZGF0ZWRFbnRpdHlKc29uKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICRzY29wZS52YWxpZGF0ZWRFbnRpdHlKc29uID0gbmV3SnNvbjtcbiAgICAgICAgICB9XG4gICAgICAgICAgdmFyIGNvbW1hbmRJZCA9ICRzY29wZS5pZDtcbiAgICAgICAgICB2YXIgcmVzb3VyY2VQYXRoID0gJHNjb3BlLnJlc291cmNlUGF0aDtcbiAgICAgICAgICB2YXIgdXJsID0gdmFsaWRhdGVDb21tYW5kQXBpVXJsKEZvcmdlQXBpVVJMLCBjb21tYW5kSWQpO1xuICAgICAgICAgIC8vIGxldHMgcHV0IHRoZSBlbnRpdHkgaW4gdGhlIGxhc3QgaXRlbSBpbiB0aGUgbGlzdFxuICAgICAgICAgIHZhciBpbnB1dExpc3QgPSBbXS5jb25jYXQoJHNjb3BlLmlucHV0TGlzdCk7XG4gICAgICAgICAgaW5wdXRMaXN0W2lucHV0TGlzdC5sZW5ndGggLSAxXSA9ICRzY29wZS5lbnRpdHk7XG4gICAgICAgICAgdmFyIHJlcXVlc3QgPSB7XG4gICAgICAgICAgICBuYW1lc3BhY2U6ICRzY29wZS5uYW1lc3BhY2UsXG4gICAgICAgICAgICBwcm9qZWN0TmFtZTogJHNjb3BlLnByb2plY3RJZCxcbiAgICAgICAgICAgIHJlc291cmNlOiByZXNvdXJjZVBhdGgsXG4gICAgICAgICAgICBpbnB1dExpc3Q6ICRzY29wZS5pbnB1dExpc3RcbiAgICAgICAgICB9O1xuICAgICAgICAgIHVybCA9IGNyZWF0ZUh0dHBVcmwoJHNjb3BlLnByb2plY3RJZCwgdXJsKTtcbiAgICAgICAgICAkc2NvcGUudmFsaWRhdGluZyA9IHRydWU7XG4gICAgICAgICAgJGh0dHAucG9zdCh1cmwsIHJlcXVlc3QsIGNyZWF0ZUh0dHBDb25maWcoKSkuXG4gICAgICAgICAgICBzdWNjZXNzKGZ1bmN0aW9uIChkYXRhLCBzdGF0dXMsIGhlYWRlcnMsIGNvbmZpZykge1xuICAgICAgICAgICAgICB0aGlzLnZhbGlkYXRpb24gPSBkYXRhO1xuICAgICAgICAgICAgICAvL2NvbnNvbGUubG9nKFwiZ290IHZhbGlkYXRpb24gXCIgKyBhbmd1bGFyLnRvSnNvbihkYXRhLCB0cnVlKSk7XG4gICAgICAgICAgICAgIHZhciB3aXphcmRSZXN1bHRzID0gZGF0YS53aXphcmRSZXN1bHRzO1xuICAgICAgICAgICAgICBpZiAod2l6YXJkUmVzdWx0cykge1xuICAgICAgICAgICAgICAgIHZhciBzdGVwSW5wdXRzID0gd2l6YXJkUmVzdWx0cy5zdGVwSW5wdXRzO1xuICAgICAgICAgICAgICAgIGlmIChzdGVwSW5wdXRzKSB7XG4gICAgICAgICAgICAgICAgICB2YXIgc2NoZW1hID0gXy5sYXN0KHN0ZXBJbnB1dHMpO1xuICAgICAgICAgICAgICAgICAgdXBkYXRlU2NoZW1hKHNjaGVtYSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIENvcmUuJGFwcGx5KCRzY29wZSk7XG5cbiAgICAgICAgICAgICAgLypcbiAgICAgICAgICAgICAgICogTGV0cyB0aHJvdHRsZSB0aGUgdmFsaWRhdGlvbnMgc28gdGhhdCB3ZSBvbmx5IGZpcmUgYW5vdGhlciB2YWxpZGF0aW9uIGEgbGl0dGxlXG4gICAgICAgICAgICAgICAqIGFmdGVyIHdlJ3ZlIGdvdCBhIHJlcGx5IGFuZCBvbmx5IGlmIHRoZSBtb2RlbCBoYXMgY2hhbmdlZCBzaW5jZSB0aGVuXG4gICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAkdGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgJHNjb3BlLnZhbGlkYXRpbmcgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB2YWxpZGF0ZSgpO1xuICAgICAgICAgICAgICB9LCAyMDApO1xuICAgICAgICAgICAgfSkuXG4gICAgICAgICAgICBlcnJvcihmdW5jdGlvbiAoZGF0YSwgc3RhdHVzLCBoZWFkZXJzLCBjb25maWcpIHtcbiAgICAgICAgICAgICAgJHNjb3BlLmV4ZWN1dGluZyA9IGZhbHNlO1xuICAgICAgICAgICAgICBsb2cud2FybihcIkZhaWxlZCB0byBsb2FkIFwiICsgdXJsICsgXCIgXCIgKyBkYXRhICsgXCIgXCIgKyBzdGF0dXMpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICB1cGRhdGVEYXRhKCk7XG5cbiAgICAgICAgZnVuY3Rpb24gdG9CYWNrZ3JvdW5kU3R5bGUoc3RhdHVzKSB7XG4gICAgICAgICAgaWYgKCFzdGF0dXMpIHtcbiAgICAgICAgICAgIHN0YXR1cyA9IFwiXCI7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChzdGF0dXMuc3RhcnRzV2l0aChcInN1Y1wiKSkge1xuICAgICAgICAgICAgcmV0dXJuIFwiYmctc3VjY2Vzc1wiO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gXCJiZy13YXJuaW5nXCJcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIHVwZGF0ZURhdGEoKSB7XG4gICAgICAgICAgJHNjb3BlLml0ZW0gPSBudWxsO1xuICAgICAgICAgIHZhciBjb21tYW5kSWQgPSAkc2NvcGUuaWQ7XG4gICAgICAgICAgaWYgKGNvbW1hbmRJZCkge1xuICAgICAgICAgICAgdmFyIHJlc291cmNlUGF0aCA9ICRzY29wZS5yZXNvdXJjZVBhdGg7XG4gICAgICAgICAgICB2YXIgdXJsID0gY29tbWFuZElucHV0QXBpVXJsKEZvcmdlQXBpVVJMLCBjb21tYW5kSWQsICRzY29wZS5uYW1lc3BhY2UsICRzY29wZS5wcm9qZWN0SWQsIHJlc291cmNlUGF0aCk7XG4gICAgICAgICAgICB1cmwgPSBjcmVhdGVIdHRwVXJsKCRzY29wZS5wcm9qZWN0SWQsIHVybCk7XG4gICAgICAgICAgICAkaHR0cC5nZXQodXJsLCBjcmVhdGVIdHRwQ29uZmlnKCkpLlxuICAgICAgICAgICAgICBzdWNjZXNzKGZ1bmN0aW9uIChkYXRhLCBzdGF0dXMsIGhlYWRlcnMsIGNvbmZpZykge1xuICAgICAgICAgICAgICAgIGlmIChkYXRhKSB7XG4gICAgICAgICAgICAgICAgICAkc2NvcGUuZmV0Y2hlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcInVwZGF0ZURhdGEgbG9hZGVkIHNjaGVtYVwiKTtcbiAgICAgICAgICAgICAgICAgIHVwZGF0ZVNjaGVtYShkYXRhKTtcbiAgICAgICAgICAgICAgICAgIHNldE1vZGVsQ29tbWFuZElucHV0cyhGb3JnZU1vZGVsLCAkc2NvcGUucmVzb3VyY2VQYXRoLCAkc2NvcGUuaWQsICRzY29wZS5zY2hlbWEpO1xuICAgICAgICAgICAgICAgICAgb25TY2hlbWFMb2FkKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIENvcmUuJGFwcGx5KCRzY29wZSk7XG4gICAgICAgICAgICAgIH0pLlxuICAgICAgICAgICAgICBlcnJvcihmdW5jdGlvbiAoZGF0YSwgc3RhdHVzLCBoZWFkZXJzLCBjb25maWcpIHtcbiAgICAgICAgICAgICAgICBsb2cud2FybihcIkZhaWxlZCB0byBsb2FkIFwiICsgdXJsICsgXCIgXCIgKyBkYXRhICsgXCIgXCIgKyBzdGF0dXMpO1xuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBvblNjaGVtYUxvYWQoKSB7XG4gICAgICAgICAgLy8gbGV0cyB1cGRhdGUgdGhlIHZhbHVlIGlmIGl0cyBibGFuayB3aXRoIHRoZSBkZWZhdWx0IHZhbHVlcyBmcm9tIHRoZSBwcm9wZXJ0aWVzXG4gICAgICAgICAgdmFyIHNjaGVtYSA9ICRzY29wZS5zY2hlbWE7XG4gICAgICAgICAgJHNjb3BlLmZldGNoZWQgPSBzY2hlbWE7XG4gICAgICAgICAgdmFyIGVudGl0eSA9ICRzY29wZS5lbnRpdHk7XG4gICAgICAgICAgaWYgKHNjaGVtYSkge1xuICAgICAgICAgICAgYW5ndWxhci5mb3JFYWNoKHNjaGVtYS5wcm9wZXJ0aWVzLCAocHJvcGVydHksIGtleSkgPT4ge1xuICAgICAgICAgICAgICBpZiAoIXByb3BlcnR5LmxhYmVsKSB7XG4gICAgICAgICAgICAgICAgcHJvcGVydHkubGFiZWwgPSBwcm9wZXJ0eS50aXRsZTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB2YXIgdmFsdWUgPSBwcm9wZXJ0eS52YWx1ZTtcbiAgICAgICAgICAgICAgaWYgKHZhbHVlICYmICFlbnRpdHlba2V5XSkge1xuICAgICAgICAgICAgICAgIGVudGl0eVtrZXldID0gdmFsdWU7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfV0pO1xufVxuIiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL2luY2x1ZGVzLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cImZvcmdlUGx1Z2luLnRzXCIvPlxuXG5tb2R1bGUgRm9yZ2Uge1xuXG4gIGV4cG9ydCB2YXIgQ29tbWFuZHNDb250cm9sbGVyID0gY29udHJvbGxlcihcIkNvbW1hbmRzQ29udHJvbGxlclwiLCBbXCIkc2NvcGVcIiwgXCIkZGlhbG9nXCIsIFwiJHdpbmRvd1wiLCBcIiR0ZW1wbGF0ZUNhY2hlXCIsIFwiJHJvdXRlUGFyYW1zXCIsIFwiJGxvY2F0aW9uXCIsIFwibG9jYWxTdG9yYWdlXCIsIFwiJGh0dHBcIiwgXCIkdGltZW91dFwiLCBcIkZvcmdlQXBpVVJMXCIsIFwiRm9yZ2VNb2RlbFwiLFxuICAgICgkc2NvcGUsICRkaWFsb2csICR3aW5kb3csICR0ZW1wbGF0ZUNhY2hlLCAkcm91dGVQYXJhbXMsICRsb2NhdGlvbjpuZy5JTG9jYXRpb25TZXJ2aWNlLCBsb2NhbFN0b3JhZ2UsICRodHRwLCAkdGltZW91dCwgRm9yZ2VBcGlVUkwsIEZvcmdlTW9kZWwpID0+IHtcblxuICAgICAgJHNjb3BlLm1vZGVsID0gRm9yZ2VNb2RlbDtcbiAgICAgICRzY29wZS5yZXNvdXJjZVBhdGggPSAkcm91dGVQYXJhbXNbXCJwYXRoXCJdIHx8ICRsb2NhdGlvbi5zZWFyY2goKVtcInBhdGhcIl0gfHwgXCJcIjtcbiAgICAgICRzY29wZS5yZXBvTmFtZSA9IFwiXCI7XG4gICAgICAkc2NvcGUucHJvamVjdERlc2NyaXB0aW9uID0gJHNjb3BlLnJlc291cmNlUGF0aCB8fCBcIlwiO1xuICAgICAgdmFyIHBhdGhTdGVwcyA9ICRzY29wZS5wcm9qZWN0RGVzY3JpcHRpb24uc3BsaXQoXCIvXCIpO1xuICAgICAgaWYgKHBhdGhTdGVwcyAmJiBwYXRoU3RlcHMubGVuZ3RoKSB7XG4gICAgICAgICRzY29wZS5yZXBvTmFtZSA9IHBhdGhTdGVwc1twYXRoU3RlcHMubGVuZ3RoIC0gMV07XG4gICAgICB9XG4gICAgICBpZiAoISRzY29wZS5wcm9qZWN0RGVzY3JpcHRpb24uc3RhcnRzV2l0aChcIi9cIikgJiYgJHNjb3BlLnByb2plY3REZXNjcmlwdGlvbi5sZW5ndGggPiAwKSB7XG4gICAgICAgICRzY29wZS5wcm9qZWN0RGVzY3JpcHRpb24gPSBcIi9cIiArICRzY29wZS5wcm9qZWN0RGVzY3JpcHRpb247XG4gICAgICB9XG5cbiAgICAgICRzY29wZS5hdmF0YXJfdXJsID0gbG9jYWxTdG9yYWdlW1wiZ29nc0F2YXRhclVybFwiXTtcbiAgICAgICRzY29wZS51c2VyID0gbG9jYWxTdG9yYWdlW1wiZ29nc1VzZXJcIl07XG5cbiAgICAgICRzY29wZS5jb21tYW5kcyA9IGdldE1vZGVsQ29tbWFuZHMoRm9yZ2VNb2RlbCwgJHNjb3BlLnJlc291cmNlUGF0aCk7XG4gICAgICAkc2NvcGUuZmV0Y2hlZCA9ICRzY29wZS5jb21tYW5kcy5sZW5ndGggIT09IDA7XG5cbiAgICAgIGluaXRTY29wZSgkc2NvcGUsICRsb2NhdGlvbiwgJHJvdXRlUGFyYW1zKTtcbiAgICAgIHJlZGlyZWN0VG9TZXR1cFNlY3JldHNJZk5vdERlZmluZWQoJHNjb3BlLCAkbG9jYXRpb24pO1xuXG5cbiAgICAgICRzY29wZS50YWJsZUNvbmZpZyA9IHtcbiAgICAgICAgZGF0YTogJ2NvbW1hbmRzJyxcbiAgICAgICAgc2hvd1NlbGVjdGlvbkNoZWNrYm94OiB0cnVlLFxuICAgICAgICBlbmFibGVSb3dDbGlja1NlbGVjdGlvbjogZmFsc2UsXG4gICAgICAgIG11bHRpU2VsZWN0OiB0cnVlLFxuICAgICAgICBzZWxlY3RlZEl0ZW1zOiBbXSxcbiAgICAgICAgZmlsdGVyT3B0aW9uczoge1xuICAgICAgICAgIGZpbHRlclRleHQ6ICRsb2NhdGlvbi5zZWFyY2goKVtcInFcIl0gfHwgJydcbiAgICAgICAgfSxcbiAgICAgICAgY29sdW1uRGVmczogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIGZpZWxkOiAnbmFtZScsXG4gICAgICAgICAgICBkaXNwbGF5TmFtZTogJ05hbWUnLFxuICAgICAgICAgICAgY2VsbFRlbXBsYXRlOiAkdGVtcGxhdGVDYWNoZS5nZXQoXCJpZFRlbXBsYXRlLmh0bWxcIilcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIGZpZWxkOiAnZGVzY3JpcHRpb24nLFxuICAgICAgICAgICAgZGlzcGxheU5hbWU6ICdEZXNjcmlwdGlvbidcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIGZpZWxkOiAnY2F0ZWdvcnknLFxuICAgICAgICAgICAgZGlzcGxheU5hbWU6ICdDYXRlZ29yeSdcbiAgICAgICAgICB9XG4gICAgICAgIF1cbiAgICAgIH07XG5cbiAgICAgIGZ1bmN0aW9uIGNvbW1hbmRNYXRjaGVzKGNvbW1hbmQpIHtcbiAgICAgICAgdmFyIGZpbHRlclRleHQgPSAkc2NvcGUudGFibGVDb25maWcuZmlsdGVyT3B0aW9ucy5maWx0ZXJUZXh0O1xuICAgICAgICByZXR1cm4gY29tbWFuZE1hdGNoZXNUZXh0KGNvbW1hbmQsIGZpbHRlclRleHQpO1xuICAgICAgfVxuXG4gICAgICAkc2NvcGUuY29tbWFuZFNlbGVjdG9yID0ge1xuICAgICAgICBmaWx0ZXJUZXh0OiBcIlwiLFxuICAgICAgICBmb2xkZXJzOiBbXSxcbiAgICAgICAgc2VsZWN0ZWRDb21tYW5kczogW10sXG4gICAgICAgIGV4cGFuZGVkRm9sZGVyczoge30sXG5cbiAgICAgICAgaXNPcGVuOiAoZm9sZGVyKSA9PiB7XG4gICAgICAgICAgdmFyIGZpbHRlclRleHQgPSAkc2NvcGUudGFibGVDb25maWcuZmlsdGVyT3B0aW9ucy5maWx0ZXJUZXh0O1xuICAgICAgICAgIGlmIChmaWx0ZXJUZXh0ICE9PSAnJyB8fCAkc2NvcGUuY29tbWFuZFNlbGVjdG9yLmV4cGFuZGVkRm9sZGVyc1tmb2xkZXIuaWRdKSB7XG4gICAgICAgICAgICByZXR1cm4gXCJvcGVuZWRcIjtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIFwiY2xvc2VkXCI7XG4gICAgICAgIH0sXG5cbiAgICAgICAgY2xlYXJTZWxlY3RlZDogKCkgPT4ge1xuICAgICAgICAgIC8vJHNjb3BlLmNvbW1hbmRTZWxlY3Rvci5leHBhbmRlZEZvbGRlcnMgPSB7fTtcbiAgICAgICAgICBvcGVuQWxsQ29tbWFuZHMoKTtcbiAgICAgICAgICBDb3JlLiRhcHBseSgkc2NvcGUpO1xuICAgICAgICB9LFxuXG4gICAgICAgIHVwZGF0ZVNlbGVjdGVkOiAoKSA9PiB7XG4gICAgICAgICAgLy8gbGV0cyB1cGRhdGUgdGhlIHNlbGVjdGVkIGFwcHNcbiAgICAgICAgICB2YXIgc2VsZWN0ZWRDb21tYW5kcyA9IFtdO1xuICAgICAgICAgIGFuZ3VsYXIuZm9yRWFjaCgkc2NvcGUubW9kZWwuYXBwRm9sZGVycywgKGZvbGRlcikgPT4ge1xuICAgICAgICAgICAgdmFyIGFwcHMgPSBmb2xkZXIuYXBwcy5maWx0ZXIoKGFwcCkgPT4gYXBwLnNlbGVjdGVkKTtcbiAgICAgICAgICAgIGlmIChhcHBzKSB7XG4gICAgICAgICAgICAgIHNlbGVjdGVkQ29tbWFuZHMgPSBzZWxlY3RlZENvbW1hbmRzLmNvbmNhdChhcHBzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcbiAgICAgICAgICAkc2NvcGUuY29tbWFuZFNlbGVjdG9yLnNlbGVjdGVkQ29tbWFuZHMgPSBzZWxlY3RlZENvbW1hbmRzLnNvcnRCeShcIm5hbWVcIik7XG4gICAgICAgIH0sXG5cbiAgICAgICAgc2VsZWN0OiAoY29tbWFuZCwgZmxhZykgPT4ge1xuICAgICAgICAgIHZhciBpZCA9IGNvbW1hbmQubmFtZTtcbi8qXG4gICAgICAgICAgYXBwLnNlbGVjdGVkID0gZmxhZztcbiovXG4gICAgICAgICAgJHNjb3BlLmNvbW1hbmRTZWxlY3Rvci51cGRhdGVTZWxlY3RlZCgpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGdldFNlbGVjdGVkQ2xhc3M6IChhcHApID0+IHtcbiAgICAgICAgICBpZiAoYXBwLmFic3RyYWN0KSB7XG4gICAgICAgICAgICByZXR1cm4gXCJhYnN0cmFjdFwiO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoYXBwLnNlbGVjdGVkKSB7XG4gICAgICAgICAgICByZXR1cm4gXCJzZWxlY3RlZFwiO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gXCJcIjtcbiAgICAgICAgfSxcblxuICAgICAgICBzaG93Q29tbWFuZDogKGNvbW1hbmQpID0+IHtcbiAgICAgICAgICByZXR1cm4gY29tbWFuZE1hdGNoZXMoY29tbWFuZCk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgc2hvd0ZvbGRlcjogKGZvbGRlcikgPT4ge1xuICAgICAgICAgIHZhciBmaWx0ZXJUZXh0ID0gJHNjb3BlLnRhYmxlQ29uZmlnLmZpbHRlck9wdGlvbnMuZmlsdGVyVGV4dDtcbiAgICAgICAgICByZXR1cm4gIWZpbHRlclRleHQgfHwgZm9sZGVyLmNvbW1hbmRzLnNvbWUoKGFwcCkgPT4gY29tbWFuZE1hdGNoZXMoYXBwKSk7XG4gICAgICAgIH1cbiAgICAgIH07XG5cblxuICAgICAgZnVuY3Rpb24gb3BlbkFsbENvbW1hbmRzKCkge1xuICAgICAgICAkc2NvcGUuY29tbWFuZFNlbGVjdG9yLmV4cGFuZGVkRm9sZGVycyA9IHt9O1xuICAgICAgICBhbmd1bGFyLmZvckVhY2goJHNjb3BlLmNvbW1hbmRzLCAoY29tbWFuZCkgPT4ge1xuICAgICAgICAgIHZhciBpZCA9IGNvbW1hbmQuaWQgfHwgY29tbWFuZC5uYW1lO1xuICAgICAgICAgIGlmIChpZCkge1xuICAgICAgICAgICAgJHNjb3BlLmNvbW1hbmRTZWxlY3Rvci5leHBhbmRlZEZvbGRlcnNbaWRdID0gdHJ1ZTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICAvKipcbiAgICAgICAqIExldHMgcmVtb3ZlIGFueSBkb2RneSBjaGFyYWN0ZXJzXG4gICAgICAgKi9cbiAgICAgIGZ1bmN0aW9uIHRvRWxlbWVudElkKG5hbWUpIHtcbiAgICAgICAgcmV0dXJuIG5hbWUucmVwbGFjZShcIi9cIiwgXCJfXCIpO1xuICAgICAgfVxuXG4gICAgICB2YXIgaWdub3JlUHJlZml4ZXMgPSBbXCJhZGRvbi1cIiwgXCJhcmNoZXR5cGUtXCIsIFwiZmFicmljOC1cIiwgXCJnaXQtXCJdO1xuICAgICAgdmFyIGlnbm9yZUNvbW1hbmRzID0ge1xuICAgICAgICBcImRldm9wcy1lZGl0XCI6IHRydWUsXG4gICAgICAgIFwiZGV2b3BzLW5ldy1idWlsZFwiOiB0cnVlLFxuXG4gICAgICAgIC8vIGZvcmdlIGNvbW1hbmRzXG4gICAgICAgIFwiYnVpbGQtYW5kLWluc3RhbGwtYW4tYWRkb25cIjogdHJ1ZSxcbiAgICAgICAgXCJpbnN0YWxsLWFuLWFkZG9uXCI6IHRydWUsXG4gICAgICAgIFwiaW5zdGFsbC1hbi1hZGRvbi1mcm9tLWdpdFwiOiB0cnVlLFxuICAgICAgICBcInJlbW92ZS1hbi1hZGRvblwiOiB0cnVlLFxuICAgICAgICBcInVwZGF0ZS1hbi1hZGRvblwiOiB0cnVlLFxuXG4gICAgICAgIC8vIHByb2plY3QgY29tbWFuZHNcbiAgICAgICAgXCJidWlsZFwiOiB0cnVlLFxuICAgICAgICBcInByb2plY3QtbmV3XCI6IHRydWUsXG4gICAgICAgIFwiXCI6IHRydWUsXG4gICAgICAgIFwiXCI6IHRydWUsXG4gICAgICAgIFwiXCI6IHRydWUsXG4gICAgICAgIFwiXCI6IHRydWUsXG4gICAgICB9O1xuXG4gICAgICAvKipcbiAgICAgICAqIExldHMgZmlsdGVyIG91dCBzb21lIHVudXNhYmxlXG4gICAgICAgKiBAcGFyYW0gaWRcbiAgICAgICAqL1xuICAgICAgZnVuY3Rpb24gaXNWYWxpZENvbW1hbmQoaWQpIHtcbiAgICAgICAgaWYgKCFpZCkgcmV0dXJuIGZhbHNlO1xuICAgICAgICB2YXIgYW5zd2VyID0gdHJ1ZTtcbiAgICAgICAgYW5ndWxhci5mb3JFYWNoKGlnbm9yZVByZWZpeGVzLCAocHJlZml4KSA9PiB7XG4gICAgICAgICAgaWYgKGFuc3dlciAmJiBpZC5zdGFydHNXaXRoKHByZWZpeCkpIHtcbiAgICAgICAgICAgIGFuc3dlciA9IGZhbHNlO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIGlmIChhbnN3ZXIgJiYgaWdub3JlQ29tbWFuZHNbaWRdKSB7XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBhbnN3ZXI7XG4gICAgICB9XG5cbiAgICAgIHZhciB1cmwgPSBVcmxIZWxwZXJzLmpvaW4oRm9yZ2VBcGlVUkwsIFwiY29tbWFuZHNcIiwgJHNjb3BlLm5hbWVzcGFjZSwgJHNjb3BlLnByb2plY3RJZCwgJHNjb3BlLnJlc291cmNlUGF0aCk7XG4gICAgICB1cmwgPSBjcmVhdGVIdHRwVXJsKCRzY29wZS5wcm9qZWN0SWQsIHVybCk7XG4gICAgICBsb2cuaW5mbyhcIkZldGNoaW5nIGNvbW1hbmRzIGZyb206IFwiICsgdXJsKTtcbiAgICAgICRodHRwLmdldCh1cmwsIGNyZWF0ZUh0dHBDb25maWcoKSkuXG4gICAgICAgIHN1Y2Nlc3MoZnVuY3Rpb24gKGRhdGEsIHN0YXR1cywgaGVhZGVycywgY29uZmlnKSB7XG4gICAgICAgICAgaWYgKGFuZ3VsYXIuaXNBcnJheShkYXRhKSAmJiBzdGF0dXMgPT09IDIwMCkge1xuICAgICAgICAgICAgdmFyIHJlc291cmNlUGF0aCA9ICRzY29wZS5yZXNvdXJjZVBhdGg7XG4gICAgICAgICAgICB2YXIgZm9sZGVyTWFwID0ge307XG4gICAgICAgICAgICB2YXIgZm9sZGVycyA9IFtdO1xuICAgICAgICAgICAgJHNjb3BlLmNvbW1hbmRzID0gXy5zb3J0QnkoZGF0YSwgXCJuYW1lXCIpO1xuICAgICAgICAgICAgYW5ndWxhci5mb3JFYWNoKCRzY29wZS5jb21tYW5kcywgKGNvbW1hbmQpID0+IHtcbiAgICAgICAgICAgICAgdmFyIGlkID0gY29tbWFuZC5pZCB8fCBjb21tYW5kLm5hbWU7XG4gICAgICAgICAgICAgIGlmIChpc1ZhbGlkQ29tbWFuZChpZCkpIHtcbiAgICAgICAgICAgICAgICBjb21tYW5kLiRsaW5rID0gY29tbWFuZExpbmsoJHNjb3BlLnByb2plY3RJZCwgaWQsIHJlc291cmNlUGF0aCk7XG5cbiAgICAgICAgICAgICAgICB2YXIgbmFtZSA9IGNvbW1hbmQubmFtZSB8fCBjb21tYW5kLmlkO1xuICAgICAgICAgICAgICAgIHZhciBmb2xkZXJOYW1lID0gY29tbWFuZC5jYXRlZ29yeTtcbiAgICAgICAgICAgICAgICB2YXIgc2hvcnROYW1lID0gbmFtZTtcbiAgICAgICAgICAgICAgICB2YXIgbmFtZXMgPSBuYW1lLnNwbGl0KFwiOlwiLCAyKTtcbiAgICAgICAgICAgICAgICBpZiAobmFtZXMgIT0gbnVsbCAmJiBuYW1lcy5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICAgICAgICBmb2xkZXJOYW1lID0gbmFtZXNbMF07XG4gICAgICAgICAgICAgICAgICBzaG9ydE5hbWUgPSBuYW1lc1sxXS50cmltKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChmb2xkZXJOYW1lID09PSBcIlByb2plY3QvQnVpbGRcIikge1xuICAgICAgICAgICAgICAgICAgZm9sZGVyTmFtZSA9IFwiUHJvamVjdFwiO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjb21tYW5kLiRzaG9ydE5hbWUgPSBzaG9ydE5hbWU7XG4gICAgICAgICAgICAgICAgY29tbWFuZC4kZm9sZGVyTmFtZSA9IGZvbGRlck5hbWU7XG4gICAgICAgICAgICAgICAgdmFyIGZvbGRlciA9IGZvbGRlck1hcFtmb2xkZXJOYW1lXTtcbiAgICAgICAgICAgICAgICBpZiAoIWZvbGRlcikge1xuICAgICAgICAgICAgICAgICAgY29uc3QgbG93ZXJOYW1lID0gZm9sZGVyTmFtZS50b0xvd2VyQ2FzZSgpO1xuICAgICAgICAgICAgICAgICAgZm9sZGVyID0ge1xuICAgICAgICAgICAgICAgICAgICBuYW1lOiBmb2xkZXJOYW1lLFxuICAgICAgICAgICAgICAgICAgICBsb3dlck5hbWU6IGxvd2VyTmFtZSxcbiAgICAgICAgICAgICAgICAgICAgaWQ6IFwiZm9sZGVyX1wiICsgdG9FbGVtZW50SWQobG93ZXJOYW1lKSxcbiAgICAgICAgICAgICAgICAgICAgY29tbWFuZHM6IFtdXG4gICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgZm9sZGVyTWFwW2ZvbGRlck5hbWVdID0gZm9sZGVyO1xuICAgICAgICAgICAgICAgICAgZm9sZGVycy5wdXNoKGZvbGRlcik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGZvbGRlci5jb21tYW5kcy5wdXNoKGNvbW1hbmQpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGZvbGRlcnMgPSBfLnNvcnRCeShmb2xkZXJzLCBcImxvd2VyTmFtZVwiKTtcbiAgICAgICAgICAgIGFuZ3VsYXIuZm9yRWFjaChmb2xkZXJzLCAoZm9sZGVyKSA9PiB7XG4gICAgICAgICAgICAgIGZvbGRlci5jb21tYW5kcyA9IF8uc29ydEJ5KGZvbGRlci5jb21tYW5kcywgXCIkc2hvcnROYW1lXCIpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAkc2NvcGUuY29tbWFuZFNlbGVjdG9yLmZvbGRlcnMgPSBmb2xkZXJzO1xuXG4gICAgICAgICAgICBvcGVuQWxsQ29tbWFuZHMoKTtcbiAgICAgICAgICAgIHNldE1vZGVsQ29tbWFuZHMoJHNjb3BlLm1vZGVsLCAkc2NvcGUucmVzb3VyY2VQYXRoLCAkc2NvcGUuY29tbWFuZHMpO1xuICAgICAgICAgICAgJHNjb3BlLmZldGNoZWQgPSB0cnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgfSkuXG4gICAgICAgIGVycm9yKGZ1bmN0aW9uIChkYXRhLCBzdGF0dXMsIGhlYWRlcnMsIGNvbmZpZykge1xuICAgICAgICAgIGxvZy53YXJuKFwiZmFpbGVkIHRvIGxvYWQgXCIgKyB1cmwgKyBcIi4gc3RhdHVzOiBcIiArIHN0YXR1cyArIFwiIGRhdGE6IFwiICsgZGF0YSk7XG4gICAgICAgIH0pO1xuXG4gICAgfV0pO1xufVxuIiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL2luY2x1ZGVzLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cImZvcmdlSGVscGVycy50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJmb3JnZVBsdWdpbi50c1wiLz5cblxubW9kdWxlIEZvcmdlIHtcblxuICBleHBvcnQgdmFyIFBpcGVsaW5lUGlja2VyID0gY29udHJvbGxlcihcIlBpcGVsaW5lUGlja2VyXCIsXG4gICAgW1wiJHNjb3BlXCIsIFwiJHRlbXBsYXRlQ2FjaGVcIiwgXCIkbG9jYXRpb25cIiwgXCIkcm91dGVQYXJhbXNcIiwgXCIkaHR0cFwiLCBcIiR0aW1lb3V0XCIsIFwiRm9yZ2VBcGlVUkxcIiwgXCJGb3JnZU1vZGVsXCIsXG4gICAgICAoJHNjb3BlLCAkdGVtcGxhdGVDYWNoZTpuZy5JVGVtcGxhdGVDYWNoZVNlcnZpY2UsICRsb2NhdGlvbjpuZy5JTG9jYXRpb25TZXJ2aWNlLCAkcm91dGVQYXJhbXMsICRodHRwLCAkdGltZW91dCwgRm9yZ2VBcGlVUkwsIEZvcmdlTW9kZWwpID0+IHtcblxuICAgICAgICB2YXIgY29uZmlnID0gJHNjb3BlLmNvbmZpZyB8fCB7fTtcbiAgICAgICAgdmFyIHByb3BlcnRpZXMgPSBjb25maWcucHJvcGVydGllcyB8fCB7fTtcbiAgICAgICAgdmFyIHBpcGVsaW5lID0gcHJvcGVydGllcy5waXBlbGluZSB8fCB7fTtcbiAgICAgICAgJHNjb3BlLnBpcGVsaW5lcyA9IHBpcGVsaW5lLnR5cGVhaGVhZERhdGE7XG5cbiAgICAgICAgJHNjb3BlLnRhYmxlQ29uZmlnID0ge1xuICAgICAgICAgIGRhdGE6ICdwaXBlbGluZXMnLFxuICAgICAgICAgIHByaW1hcnlLZXlGbjogKGl0ZW0pID0+IGl0ZW0udmFsdWUsXG4gICAgICAgICAgc2hvd1NlbGVjdGlvbkNoZWNrYm94OiBmYWxzZSxcbiAgICAgICAgICBlbmFibGVSb3dDbGlja1NlbGVjdGlvbjogdHJ1ZSxcbiAgICAgICAgICBtdWx0aVNlbGVjdDogZmFsc2UsXG4gICAgICAgICAgc2VsZWN0ZWRJdGVtczogW10sXG4gICAgICAgICAgZmlsdGVyT3B0aW9uczoge1xuICAgICAgICAgICAgZmlsdGVyVGV4dDogJydcbiAgICAgICAgICB9LFxuICAgICAgICAgIGNvbHVtbkRlZnM6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgZmllbGQ6ICdsYWJlbCcsXG4gICAgICAgICAgICAgIGRpc3BsYXlOYW1lOiAnUGlwZWxpbmUnLFxuICAgICAgICAgICAgICBkZWZhdWx0U29ydDogdHJ1ZVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgZmllbGQ6ICdlbnZpcm9ubWVudHMnLFxuICAgICAgICAgICAgICBkaXNwbGF5TmFtZTogJ0Vudmlyb25tZW50cycsXG4gICAgICAgICAgICAgIGNlbGxUZW1wbGF0ZTogJHRlbXBsYXRlQ2FjaGUuZ2V0KFwiZGV2T3BzUGlwZWxpbmVDaG9vc2VyRW52aXJvbm1lbnRzLmh0bWxcIilcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIGZpZWxkOiAnc3RhZ2VzJyxcbiAgICAgICAgICAgICAgZGlzcGxheU5hbWU6ICdTdGFnZXMnLFxuICAgICAgICAgICAgICBjZWxsVGVtcGxhdGU6ICR0ZW1wbGF0ZUNhY2hlLmdldChcImRldk9wc1BpcGVsaW5lQ2hvb3NlclN0YWdlcy5odG1sXCIpXG4gICAgICAgICAgICB9XG4gICAgICAgICAgXVxuICAgICAgICB9O1xuICAgICAgICBlbnRpdHlDaGFuZ2VkKCk7XG5cbiAgICAgICAgJHNjb3BlLiR3YXRjaChcImVudGl0eS5waXBlbGluZVwiLCBlbnRpdHlDaGFuZ2VkKTtcbiAgICAgICAgJHNjb3BlLiR3YXRjaENvbGxlY3Rpb24oXCJ0YWJsZUNvbmZpZy5zZWxlY3RlZEl0ZW1zXCIsIHVwZGF0ZVNlbGVjdGlvbik7XG5cbiAgICAgICAgZnVuY3Rpb24gZW50aXR5Q2hhbmdlZCgpIHtcbiAgICAgICAgICB2YXIgcGlwZWxpbmUgPSAkc2NvcGUuZW50aXR5LnBpcGVsaW5lIHx8IHt9O1xuICAgICAgICAgIHZhciBwaXBlbGluZVZhbHVlID0gYW5ndWxhci5pc1N0cmluZyhwaXBlbGluZSkgPyBwaXBlbGluZSA6IHBpcGVsaW5lLnZhbHVlO1xuICAgICAgICAgIHZhciBpbml0aWFsU2VsZWN0aW9uID0gZ2V0U2VsZWN0aW9uKHBpcGVsaW5lVmFsdWUpO1xuICAgICAgICAgIGlmIChpbml0aWFsU2VsZWN0aW9uKSB7XG4gICAgICAgICAgICAkc2NvcGUudGFibGVDb25maWcuc2VsZWN0ZWRJdGVtcyA9IFtpbml0aWFsU2VsZWN0aW9uXTtcbiAgICAgICAgICAgIHVwZGF0ZVNlbGVjdGlvbigpO1xuICAgICAgICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBnZXRTZWxlY3Rpb24odmFsdWUpIHtcbiAgICAgICAgICB2YXIgYW5zd2VyID0gbnVsbDtcbiAgICAgICAgICBpZiAodmFsdWUpIHtcbiAgICAgICAgICAgIGFuZ3VsYXIuZm9yRWFjaCgkc2NvcGUucGlwZWxpbmVzLCAocGlwZWxpbmUpID0+IHtcbiAgICAgICAgICAgICAgaWYgKCFhbnN3ZXIgJiYgKHZhbHVlID09PSBwaXBlbGluZS52YWx1ZSB8fCB2YWx1ZSA9PT0gcGlwZWxpbmUubGFiZWwpKSB7XG4gICAgICAgICAgICAgICAgYW5zd2VyID0gcGlwZWxpbmU7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gYW5zd2VyO1xuICAgICAgICB9XG5cblxuICAgICAgICBmdW5jdGlvbiB1cGRhdGVTZWxlY3Rpb24oKSB7XG4gICAgICAgICAgdmFyIHNlbGVjdGlvbiA9ICRzY29wZS50YWJsZUNvbmZpZy5zZWxlY3RlZEl0ZW1zO1xuICAgICAgICAgIHZhciBzZWxlY3RlZFZhbHVlID0gXCJcIjtcbiAgICAgICAgICB2YXIgZGVzY3JpcHRpb24gPSBcIlwiO1xuICAgICAgICAgIHZhciBzZWxlY3RlZCA9IG51bGw7XG4gICAgICAgICAgaWYgKHNlbGVjdGlvbiAmJiBzZWxlY3Rpb24ubGVuZ3RoKSB7XG4gICAgICAgICAgICBzZWxlY3RlZCA9IHNlbGVjdGlvblswXTtcbiAgICAgICAgICAgIHNlbGVjdGVkVmFsdWUgPSBzZWxlY3RlZC52YWx1ZTtcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uID0gc2VsZWN0ZWQuZGVzY3JpcHRpb25NYXJrZG93bjtcbiAgICAgICAgICB9XG4gICAgICAgICAgJHNjb3BlLnNlbGVjdGVkID0gc2VsZWN0ZWQ7XG4gICAgICAgICAgLy9sb2cuaW5mbyhcIj09PT0gU2VsZWN0ZWQgcGlwZWxpbmUgaXM6IFwiICsgYW5ndWxhci50b0pzb24oJHNjb3BlLnNlbGVjdGVkKSk7XG4gICAgICAgICAgJHNjb3BlLmh0bWwgPSBkZXNjcmlwdGlvbiA/IG1hcmtlZChkZXNjcmlwdGlvbikgOiBcIlwiO1xuICAgICAgICAgICRzY29wZS5lbnRpdHkucGlwZWxpbmUgPSBzZWxlY3RlZFZhbHVlO1xuICAgICAgICAgIGxvZy5pbmZvKFwiZW50aXR5IHBpcGVsaW5lIGlzIG5vdzogXCIgKyAkc2NvcGUuZW50aXR5LnBpcGVsaW5lKTtcbiAgICAgICAgICBDb3JlLiRhcHBseSgkc2NvcGUpO1xuICAgICAgICB9XG4gICAgICB9XSk7XG59XG4iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vaW5jbHVkZXMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiZm9yZ2VIZWxwZXJzLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cImZvcmdlUGx1Z2luLnRzXCIvPlxuXG5tb2R1bGUgRm9yZ2Uge1xuXG4gIGV4cG9ydCB2YXIgUmVwb0NvbnRyb2xsZXIgPSBjb250cm9sbGVyKFwiUmVwb0NvbnRyb2xsZXJcIixcbiAgICBbXCIkc2NvcGVcIiwgXCIkdGVtcGxhdGVDYWNoZVwiLCBcIiRsb2NhdGlvblwiLCBcIiRyb3V0ZVBhcmFtc1wiLCBcIiRodHRwXCIsIFwiJHRpbWVvdXRcIiwgXCJGb3JnZUFwaVVSTFwiLFxuICAgICAgKCRzY29wZSwgJHRlbXBsYXRlQ2FjaGU6bmcuSVRlbXBsYXRlQ2FjaGVTZXJ2aWNlLCAkbG9jYXRpb246bmcuSUxvY2F0aW9uU2VydmljZSwgJHJvdXRlUGFyYW1zLCAkaHR0cCwgJHRpbWVvdXQsIEZvcmdlQXBpVVJMKSA9PiB7XG5cbiAgICAgICAgJHNjb3BlLm5hbWUgPSAkcm91dGVQYXJhbXNbXCJwYXRoXCJdO1xuXG4gICAgICAgIGluaXRTY29wZSgkc2NvcGUsICRsb2NhdGlvbiwgJHJvdXRlUGFyYW1zKTtcbiAgICAgICAgcmVkaXJlY3RUb1NldHVwU2VjcmV0c0lmTm90RGVmaW5lZCgkc2NvcGUsICRsb2NhdGlvbik7XG5cbiAgICAgICAgJHNjb3BlLiRvbignJHJvdXRlVXBkYXRlJywgKCRldmVudCkgPT4ge1xuICAgICAgICAgIHVwZGF0ZURhdGEoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdXBkYXRlRGF0YSgpO1xuXG4gICAgICAgIGZ1bmN0aW9uIHVwZGF0ZURhdGEoKSB7XG4gICAgICAgICAgaWYgKCRzY29wZS5uYW1lKSB7XG4gICAgICAgICAgICB2YXIgdXJsID0gcmVwb0FwaVVybChGb3JnZUFwaVVSTCwgJHNjb3BlLm5hbWUpO1xuICAgICAgICAgICAgdXJsID0gY3JlYXRlSHR0cFVybCgkc2NvcGUucHJvamVjdElkLCB1cmwpO1xuICAgICAgICAgICAgdmFyIGNvbmZpZyA9IGNyZWF0ZUh0dHBDb25maWcoKTtcbiAgICAgICAgICAgICRodHRwLmdldCh1cmwsIGNvbmZpZykuXG4gICAgICAgICAgICAgIHN1Y2Nlc3MoZnVuY3Rpb24gKGRhdGEsIHN0YXR1cywgaGVhZGVycywgY29uZmlnKSB7XG4gICAgICAgICAgICAgICAgaWYgKGRhdGEpIHtcbiAgICAgICAgICAgICAgICAgIGVucmljaFJlcG8oZGF0YSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICRzY29wZS5lbnRpdHkgPSBkYXRhO1xuICAgICAgICAgICAgICAgICRzY29wZS5mZXRjaGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgfSkuXG4gICAgICAgICAgICAgIGVycm9yKGZ1bmN0aW9uIChkYXRhLCBzdGF0dXMsIGhlYWRlcnMsIGNvbmZpZykge1xuICAgICAgICAgICAgICAgIGxvZy53YXJuKFwiZmFpbGVkIHRvIGxvYWQgXCIgKyB1cmwgKyBcIi4gc3RhdHVzOiBcIiArIHN0YXR1cyArIFwiIGRhdGE6IFwiICsgZGF0YSk7XG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAkc2NvcGUuZmV0Y2hlZCA9IHRydWU7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XSk7XG59XG4iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vaW5jbHVkZXMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiZm9yZ2VIZWxwZXJzLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cImZvcmdlUGx1Z2luLnRzXCIvPlxuXG5tb2R1bGUgRm9yZ2Uge1xuXG4gIGV4cG9ydCB2YXIgUmVwb3NDb250cm9sbGVyID0gY29udHJvbGxlcihcIlJlcG9zQ29udHJvbGxlclwiLCBbXCIkc2NvcGVcIiwgXCIkZGlhbG9nXCIsIFwiJHdpbmRvd1wiLCBcIiRlbGVtZW50XCIsIFwiJHRlbXBsYXRlQ2FjaGVcIiwgXCIkcm91dGVQYXJhbXNcIiwgXCIkbG9jYXRpb25cIiwgXCJsb2NhbFN0b3JhZ2VcIiwgXCIkaHR0cFwiLCBcIiR0aW1lb3V0XCIsIFwiRm9yZ2VBcGlVUkxcIiwgXCJLdWJlcm5ldGVzTW9kZWxcIiwgXCJTZXJ2aWNlUmVnaXN0cnlcIixcbiAgICAoJHNjb3BlLCAkZGlhbG9nLCAkd2luZG93LCAkZWxlbWVudCwgJHRlbXBsYXRlQ2FjaGUsICRyb3V0ZVBhcmFtcywgJGxvY2F0aW9uOm5nLklMb2NhdGlvblNlcnZpY2UsIGxvY2FsU3RvcmFnZSwgJGh0dHAsICR0aW1lb3V0LCBGb3JnZUFwaVVSTCwgS3ViZXJuZXRlc01vZGVsOiBLdWJlcm5ldGVzLkt1YmVybmV0ZXNNb2RlbFNlcnZpY2UsIFNlcnZpY2VSZWdpc3RyeSkgPT4ge1xuXG4gICAgICAkc2NvcGUubW9kZWwgPSBLdWJlcm5ldGVzTW9kZWw7XG4gICAgICAkc2NvcGUucmVzb3VyY2VQYXRoID0gJHJvdXRlUGFyYW1zW1wicGF0aFwiXTtcbiAgICAgICRzY29wZS5jb21tYW5kc0xpbmsgPSAocGF0aCkgPT4gY29tbWFuZHNMaW5rKHBhdGgsICRzY29wZS5wcm9qZWN0SWQpO1xuXG4gICAgICBpbml0U2NvcGUoJHNjb3BlLCAkbG9jYXRpb24sICRyb3V0ZVBhcmFtcyk7XG4gICAgICAkc2NvcGUuYnJlYWRjcnVtYkNvbmZpZy5wdXNoKHtcbiAgICAgICAgbGFiZWw6IFwiQ3JlYXRlIFByb2plY3RcIlxuICAgICAgfSk7XG4gICAgICAkc2NvcGUuc3ViVGFiQ29uZmlnID0gW107XG5cblxuICAgICAgJHNjb3BlLiRvbigna3ViZXJuZXRlc01vZGVsVXBkYXRlZCcsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdXBkYXRlTGlua3MoKTtcbiAgICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICAgIH0pO1xuXG4gICAgICB2YXIgcHJvamVjdElkID0gbnVsbDtcbiAgICAgIHZhciBucyA9ICRzY29wZS5uYW1lc3BhY2U7XG4gICAgICAkc2NvcGUuc291cmNlU2VjcmV0ID0gZ2V0UHJvamVjdFNvdXJjZVNlY3JldChsb2NhbFN0b3JhZ2UsIG5zLCBwcm9qZWN0SWQpO1xuXG4gICAgICAkc2NvcGUudGFibGVDb25maWcgPSB7XG4gICAgICAgIGRhdGE6ICdwcm9qZWN0cycsXG4gICAgICAgIHNob3dTZWxlY3Rpb25DaGVja2JveDogdHJ1ZSxcbiAgICAgICAgZW5hYmxlUm93Q2xpY2tTZWxlY3Rpb246IGZhbHNlLFxuICAgICAgICBtdWx0aVNlbGVjdDogdHJ1ZSxcbiAgICAgICAgc2VsZWN0ZWRJdGVtczogW10sXG4gICAgICAgIGZpbHRlck9wdGlvbnM6IHtcbiAgICAgICAgICBmaWx0ZXJUZXh0OiAkbG9jYXRpb24uc2VhcmNoKClbXCJxXCJdIHx8ICcnXG4gICAgICAgIH0sXG4gICAgICAgIGNvbHVtbkRlZnM6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICBmaWVsZDogJ25hbWUnLFxuICAgICAgICAgICAgZGlzcGxheU5hbWU6ICdSZXBvc2l0b3J5IE5hbWUnLFxuICAgICAgICAgICAgY2VsbFRlbXBsYXRlOiAkdGVtcGxhdGVDYWNoZS5nZXQoXCJyZXBvVGVtcGxhdGUuaHRtbFwiKVxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgZmllbGQ6ICdhY3Rpb25zJyxcbiAgICAgICAgICAgIGRpc3BsYXlOYW1lOiAnQWN0aW9ucycsXG4gICAgICAgICAgICBjZWxsVGVtcGxhdGU6ICR0ZW1wbGF0ZUNhY2hlLmdldChcInJlcG9BY3Rpb25zVGVtcGxhdGUuaHRtbFwiKVxuICAgICAgICAgIH1cbiAgICAgICAgXVxuICAgICAgfTtcblxuICAgICAgJHNjb3BlLmxvZ2luID0ge1xuICAgICAgICBhdXRoSGVhZGVyOiBsb2NhbFN0b3JhZ2VbXCJnb2dzQXV0aG9yaXphdGlvblwiXSB8fCBcIlwiLFxuICAgICAgICByZWxvZ2luOiBmYWxzZSxcbiAgICAgICAgYXZhdGFyX3VybDogbG9jYWxTdG9yYWdlW1wiZ29nc0F2YXRhclVybFwiXSB8fCBcIlwiLFxuICAgICAgICB1c2VyOiBsb2NhbFN0b3JhZ2VbXCJnb2dzVXNlclwiXSB8fCBcIlwiLFxuICAgICAgICBwYXNzd29yZDogXCJcIixcbiAgICAgICAgZW1haWw6IGxvY2FsU3RvcmFnZVtcImdvZ3NFbWFpbFwiXSB8fCBcIlwiXG4gICAgICB9O1xuXG4gICAgICAkc2NvcGUuZG9Mb2dpbiA9ICgpID0+IHtcbiAgICAgICAgdmFyIGxvZ2luID0gJHNjb3BlLmxvZ2luO1xuICAgICAgICB2YXIgdXNlciA9IGxvZ2luLnVzZXI7XG4gICAgICAgIHZhciBwYXNzd29yZCA9IGxvZ2luLnBhc3N3b3JkO1xuICAgICAgICBpZiAodXNlciAmJiBwYXNzd29yZCkge1xuICAgICAgICAgIHZhciB1c2VyUHdkID0gdXNlciArICc6JyArIHBhc3N3b3JkO1xuICAgICAgICAgIGxvZ2luLmF1dGhIZWFkZXIgPSAnQmFzaWMgJyArICh1c2VyUHdkLmVuY29kZUJhc2U2NCgpKTtcbiAgICAgICAgICB1cGRhdGVEYXRhKCk7XG4gICAgICAgIH1cbiAgICAgIH07XG5cbiAgICAgICRzY29wZS5sb2dvdXQgPSAoKSA9PiB7XG4gICAgICAgIGRlbGV0ZSBsb2NhbFN0b3JhZ2VbXCJnb2dzQXV0aG9yaXphdGlvblwiXTtcbiAgICAgICAgJHNjb3BlLmxvZ2luLmF1dGhIZWFkZXIgPSBudWxsO1xuICAgICAgICAkc2NvcGUubG9naW4ubG9nZ2VkSW4gPSBmYWxzZTtcbiAgICAgICAgJHNjb3BlLmxvZ2luLmZhaWxlZCA9IGZhbHNlO1xuICAgICAgICBsb2dnZWRJblRvR29ncyA9IGZhbHNlO1xuICAgICAgfTtcblxuXG4gICAgICAkc2NvcGUub3BlbkNvbW1hbmRzID0gKCkgPT4ge1xuICAgICAgICB2YXIgcmVzb3VyY2VQYXRoID0gbnVsbDtcbiAgICAgICAgdmFyIHNlbGVjdGVkID0gJHNjb3BlLnRhYmxlQ29uZmlnLnNlbGVjdGVkSXRlbXM7XG4gICAgICAgIGlmIChfLmlzQXJyYXkoc2VsZWN0ZWQpICYmIHNlbGVjdGVkLmxlbmd0aCkge1xuICAgICAgICAgIHJlc291cmNlUGF0aCA9IHNlbGVjdGVkWzBdLnBhdGg7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGxpbmsgPSBjb21tYW5kc0xpbmsocmVzb3VyY2VQYXRoLCAkc2NvcGUucHJvamVjdElkKTtcbiAgICAgICAgbG9nLmluZm8oXCJtb3ZpbmcgdG8gY29tbWFuZHMgbGluazogXCIgKyBsaW5rKTtcbiAgICAgICAgJGxvY2F0aW9uLnBhdGgobGluayk7XG4gICAgICB9O1xuXG4gICAgICAkc2NvcGUuZGVsZXRlID0gKHByb2plY3RzKSA9PiB7XG4gICAgICAgIFVJLm11bHRpSXRlbUNvbmZpcm1BY3Rpb25EaWFsb2coPFVJLk11bHRpSXRlbUNvbmZpcm1BY3Rpb25PcHRpb25zPntcbiAgICAgICAgICBjb2xsZWN0aW9uOiBwcm9qZWN0cyxcbiAgICAgICAgICBpbmRleDogJ3BhdGgnLFxuICAgICAgICAgIG9uQ2xvc2U6IChyZXN1bHQ6Ym9vbGVhbikgPT4ge1xuICAgICAgICAgICAgaWYgKHJlc3VsdCkge1xuICAgICAgICAgICAgICBkb0RlbGV0ZShwcm9qZWN0cyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSxcbiAgICAgICAgICB0aXRsZTogJ0RlbGV0ZSBwcm9qZWN0cz8nLFxuICAgICAgICAgIGFjdGlvbjogJ1RoZSBmb2xsb3dpbmcgcHJvamVjdHMgd2lsbCBiZSByZW1vdmVkICh0aG91Z2ggdGhlIGZpbGVzIHdpbGwgcmVtYWluIG9uIHlvdXIgZmlsZSBzeXN0ZW0pOicsXG4gICAgICAgICAgb2tUZXh0OiAnRGVsZXRlJyxcbiAgICAgICAgICBva0NsYXNzOiAnYnRuLWRhbmdlcicsXG4gICAgICAgICAgY3VzdG9tOiBcIlRoaXMgb3BlcmF0aW9uIGlzIHBlcm1hbmVudCBvbmNlIGNvbXBsZXRlZCFcIixcbiAgICAgICAgICBjdXN0b21DbGFzczogXCJhbGVydCBhbGVydC13YXJuaW5nXCJcbiAgICAgICAgfSkub3BlbigpO1xuICAgICAgfTtcblxuXG4gICAgICB1cGRhdGVMaW5rcygpO1xuICAgICAgd2F0Y2hTZWNyZXRzKCk7XG5cbiAgICAgIGZ1bmN0aW9uIG9uUGVyc29uYWxTZWNyZXRzKHNlY3JldHMpIHtcbiAgICAgICAgaWYgKCRzY29wZS5zb3VyY2VTZWNyZXQpIHtcbiAgICAgICAgICB2YXIgZm91bmQgPSBmYWxzZTtcbiAgICAgICAgICBhbmd1bGFyLmZvckVhY2goc2VjcmV0cywgKHNlY3JldCkgPT4ge1xuICAgICAgICAgICAgdmFyIG5hbWUgPSBLdWJlcm5ldGVzLmdldE5hbWUoc2VjcmV0KTtcbiAgICAgICAgICAgIGlmIChuYW1lID09PSAkc2NvcGUuc291cmNlU2VjcmV0KSB7XG4gICAgICAgICAgICAgIC8vIGxldHMgdmVyaWZ5IHRoYXQgaXQgaGFzIHRoZSB2YWxpZCBmaWVsZHNcbiAgICAgICAgICAgICAgdmFyIHJlcXVpcmVkRGF0YUtleXMgPSBLdWJlcm5ldGVzLmh0dHBzU2VjcmV0RGF0YUtleXM7XG4gICAgICAgICAgICAgIHZhciB2YWxpZCA9IHNlY3JldFZhbGlkKHNlY3JldCwgcmVxdWlyZWREYXRhS2V5cyk7XG4gICAgICAgICAgICAgIGlmICh2YWxpZCkge1xuICAgICAgICAgICAgICAgIGZvdW5kID0gdHJ1ZTtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBsb2cud2FybihcInNlY3JldCBcIiArIG5hbWUgKyBcIiBpcyBub3QgdmFsaWQsIGl0IGRvZXMgbm90IGNvbnRhaW4ga2V5czogXCIgKyByZXF1aXJlZERhdGFLZXlzICsgXCIgc28gY2xlYXJpbmchXCIpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgaWYgKCFmb3VuZCkge1xuICAgICAgICAgICAgJHNjb3BlLnNvdXJjZVNlY3JldCA9IFwiXCI7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIENvcmUuJGFwcGx5KCRzY29wZSk7XG4gICAgICB9XG5cbiAgICAgIGZ1bmN0aW9uIHdhdGNoU2VjcmV0cygpIHtcbiAgICAgICAgdmFyIG5hbWVzcGFjZU5hbWUgPSBnZXRTb3VyY2VTZWNyZXROYW1lc3BhY2UobG9jYWxTdG9yYWdlKTtcbiAgICAgICAgS3ViZXJuZXRlcy53YXRjaCgkc2NvcGUsICRlbGVtZW50LCBcInNlY3JldHNcIiwgbmFtZXNwYWNlTmFtZSwgb25QZXJzb25hbFNlY3JldHMpO1xuICAgICAgfVxuXG4gICAgICBmdW5jdGlvbiBkb0RlbGV0ZShwcm9qZWN0cykge1xuICAgICAgICBhbmd1bGFyLmZvckVhY2gocHJvamVjdHMsIChwcm9qZWN0KSA9PiB7XG4gICAgICAgICAgbG9nLmluZm8oXCJEZWxldGluZyBcIiArIGFuZ3VsYXIudG9Kc29uKCRzY29wZS5wcm9qZWN0cykpO1xuICAgICAgICAgIHZhciBwYXRoID0gcHJvamVjdC5wYXRoO1xuICAgICAgICAgIGlmIChwYXRoKSB7XG4gICAgICAgICAgICB2YXIgdXJsID0gcmVwb0FwaVVybChGb3JnZUFwaVVSTCwgcGF0aCk7XG4gICAgICAgICAgICAkaHR0cC5kZWxldGUodXJsKS5cbiAgICAgICAgICAgICAgc3VjY2VzcyhmdW5jdGlvbiAoZGF0YSwgc3RhdHVzLCBoZWFkZXJzLCBjb25maWcpIHtcbiAgICAgICAgICAgICAgICB1cGRhdGVEYXRhKCk7XG4gICAgICAgICAgICAgIH0pLlxuICAgICAgICAgICAgICBlcnJvcihmdW5jdGlvbiAoZGF0YSwgc3RhdHVzLCBoZWFkZXJzLCBjb25maWcpIHtcbiAgICAgICAgICAgICAgICBsb2cud2FybihcImZhaWxlZCB0byBsb2FkIFwiICsgdXJsICsgXCIuIHN0YXR1czogXCIgKyBzdGF0dXMgKyBcIiBkYXRhOiBcIiArIGRhdGEpO1xuICAgICAgICAgICAgICAgIHZhciBtZXNzYWdlID0gXCJGYWlsZWQgdG8gUE9TVCB0byBcIiArIHVybCArIFwiIGdvdCBzdGF0dXM6IFwiICsgc3RhdHVzO1xuICAgICAgICAgICAgICAgIENvcmUubm90aWZpY2F0aW9uKCdlcnJvcicsIG1lc3NhZ2UpO1xuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICBmdW5jdGlvbiB1cGRhdGVMaW5rcygpIHtcbiAgICAgICAgdmFyICRnb2dzTGluayA9IFNlcnZpY2VSZWdpc3RyeS5zZXJ2aWNlUmVhZHlMaW5rKGdvZ3NTZXJ2aWNlTmFtZSk7XG4gICAgICAgIGlmICgkZ29nc0xpbmspIHtcbiAgICAgICAgICAkc2NvcGUuc2lnblVwVXJsID0gVXJsSGVscGVycy5qb2luKCRnb2dzTGluaywgXCJ1c2VyL3NpZ25fdXBcIik7XG4gICAgICAgICAgJHNjb3BlLmZvcmdvdFBhc3N3b3JkVXJsID0gVXJsSGVscGVycy5qb2luKCRnb2dzTGluaywgXCJ1c2VyL2ZvcmdldF9wYXNzd29yZFwiKTtcbiAgICAgICAgfVxuICAgICAgICAkc2NvcGUuJGdvZ3NMaW5rID0gJGdvZ3NMaW5rO1xuICAgICAgICAkc2NvcGUuJGZvcmdlTGluayA9IFNlcnZpY2VSZWdpc3RyeS5zZXJ2aWNlUmVhZHlMaW5rKEt1YmVybmV0ZXMuZmFicmljOEZvcmdlU2VydmljZU5hbWUpO1xuXG4gICAgICAgICRzY29wZS4kaGFzQ0RQaXBlbGluZVRlbXBsYXRlID0gXy5hbnkoJHNjb3BlLm1vZGVsLnRlbXBsYXRlcywgKHQpID0+IFwiY2QtcGlwZWxpbmVcIiA9PT0gS3ViZXJuZXRlcy5nZXROYW1lKHQpKTtcblxuICAgICAgICB2YXIgZXhwZWN0ZWRSQ1MgPSBbS3ViZXJuZXRlcy5nb2dzU2VydmljZU5hbWUsIEt1YmVybmV0ZXMuZmFicmljOEZvcmdlU2VydmljZU5hbWUsIEt1YmVybmV0ZXMuamVua2luc1NlcnZpY2VOYW1lXTtcbiAgICAgICAgdmFyIHJlcXVpcmVkUkNzID0ge307XG4gICAgICAgIHZhciBucyA9IEt1YmVybmV0ZXMuY3VycmVudEt1YmVybmV0ZXNOYW1lc3BhY2UoKTtcbiAgICAgICAgdmFyIHJ1bm5pbmdDRFBpcGVsaW5lID0gdHJ1ZTtcbiAgICAgICAgYW5ndWxhci5mb3JFYWNoKGV4cGVjdGVkUkNTLCAocmNOYW1lKSA9PiB7XG4gICAgICAgICAgdmFyIHJjID0gJHNjb3BlLm1vZGVsLmdldFJlcGxpY2F0aW9uQ29udHJvbGxlcihucywgcmNOYW1lKTtcbiAgICAgICAgICBpZiAocmMpIHtcbiAgICAgICAgICAgIHJlcXVpcmVkUkNzW3JjTmFtZV0gPSByYztcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcnVubmluZ0NEUGlwZWxpbmUgPSBmYWxzZTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICAkc2NvcGUuJHJlcXVpcmVkUkNzID0gcmVxdWlyZWRSQ3M7XG4gICAgICAgICRzY29wZS4kcnVubmluZ0NEUGlwZWxpbmUgPSBydW5uaW5nQ0RQaXBlbGluZTtcbiAgICAgICAgdmFyIHVybCA9IFwiXCI7XG4gICAgICAgICRsb2NhdGlvbiA9IEt1YmVybmV0ZXMuaW5qZWN0KFwiJGxvY2F0aW9uXCIpO1xuICAgICAgICBpZiAoJGxvY2F0aW9uKSB7XG4gICAgICAgICAgdXJsID0gJGxvY2F0aW9uLnVybCgpO1xuICAgICAgICB9XG4gICAgICAgIGlmICghdXJsKSB7XG4gICAgICAgICAgdXJsID0gd2luZG93LmxvY2F0aW9uLnRvU3RyaW5nKCk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gVE9ETyBzaG91bGQgd2Ugc3VwcG9ydCBhbnkgb3RoZXIgdGVtcGxhdGUgbmFtZXNwYWNlcz9cbiAgICAgICAgdmFyIHRlbXBsYXRlTmFtZXNwYWNlID0gXCJkZWZhdWx0XCI7XG4gICAgICAgICRzY29wZS4kcnVuQ0RQaXBlbGluZUxpbmsgPSBcIi9rdWJlcm5ldGVzL25hbWVzcGFjZS9cIiArIHRlbXBsYXRlTmFtZXNwYWNlICsgXCIvdGVtcGxhdGVzL1wiICsgbnMgKyBcIj9xPWNkLXBpcGVsaW5lJnJldHVyblRvPVwiICsgZW5jb2RlVVJJQ29tcG9uZW50KHVybCk7XG4gICAgICB9XG5cbiAgICAgIGZ1bmN0aW9uIHVwZGF0ZURhdGEoKSB7XG4gICAgICAgIHZhciBhdXRoSGVhZGVyID0gJHNjb3BlLmxvZ2luLmF1dGhIZWFkZXI7XG4gICAgICAgIHZhciBlbWFpbCA9ICRzY29wZS5sb2dpbi5lbWFpbCB8fCBcIlwiO1xuICAgICAgICBpZiAoYXV0aEhlYWRlcikge1xuICAgICAgICAgIHZhciB1cmwgPSByZXBvc0FwaVVybChGb3JnZUFwaVVSTCk7XG4gICAgICAgICAgdXJsID0gY3JlYXRlSHR0cFVybCgkc2NvcGUucHJvamVjdElkLCB1cmwsIGF1dGhIZWFkZXIsIGVtYWlsKTtcbiAgICAgICAgICB2YXIgY29uZmlnID0ge1xuLypcbiAgICAgICAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgICAgICAgR29nc0F1dGhvcml6YXRpb246IGF1dGhIZWFkZXIsXG4gICAgICAgICAgICAgIEdvZ3NFbWFpbDogZW1haWxcbiAgICAgICAgICAgIH1cbiovXG4gICAgICAgICAgfTtcbiAgICAgICAgICAkaHR0cC5nZXQodXJsLCBjb25maWcpLlxuICAgICAgICAgICAgc3VjY2VzcyhmdW5jdGlvbiAoZGF0YSwgc3RhdHVzLCBoZWFkZXJzLCBjb25maWcpIHtcbiAgICAgICAgICAgICAgJHNjb3BlLmxvZ2luLmZhaWxlZCA9IGZhbHNlO1xuICAgICAgICAgICAgICAkc2NvcGUubG9naW4ubG9nZ2VkSW4gPSB0cnVlO1xuICAgICAgICAgICAgICBsb2dnZWRJblRvR29ncyA9IHRydWU7XG4gICAgICAgICAgICAgIHZhciBhdmF0YXJfdXJsID0gbnVsbDtcbiAgICAgICAgICAgICAgaWYgKHN0YXR1cyA9PT0gMjAwKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFkYXRhIHx8ICFhbmd1bGFyLmlzQXJyYXkoZGF0YSkpIHtcbiAgICAgICAgICAgICAgICAgIGRhdGEgPSBbXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8gbGV0cyBzdG9yZSBhIHN1Y2Nlc3NmdWwgbG9naW4gc28gdGhhdCB3ZSBoaWRlIHRoZSBsb2dpbiBwYWdlXG4gICAgICAgICAgICAgICAgbG9jYWxTdG9yYWdlW1wiZ29nc0F1dGhvcml6YXRpb25cIl0gPSBhdXRoSGVhZGVyO1xuICAgICAgICAgICAgICAgIGxvY2FsU3RvcmFnZVtcImdvZ3NFbWFpbFwiXSA9IGVtYWlsO1xuICAgICAgICAgICAgICAgIGxvY2FsU3RvcmFnZVtcImdvZ3NVc2VyXCJdID0gJHNjb3BlLmxvZ2luLnVzZXIgfHwgXCJcIjtcblxuICAgICAgICAgICAgICAgICRzY29wZS5wcm9qZWN0cyA9IF8uc29ydEJ5KGRhdGEsIFwibmFtZVwiKTtcbiAgICAgICAgICAgICAgICBhbmd1bGFyLmZvckVhY2goJHNjb3BlLnByb2plY3RzLCAocmVwbykgPT4ge1xuICAgICAgICAgICAgICAgICAgZW5yaWNoUmVwbyhyZXBvKTtcbiAgICAgICAgICAgICAgICAgIGlmICghYXZhdGFyX3VybCkge1xuICAgICAgICAgICAgICAgICAgICBhdmF0YXJfdXJsID0gQ29yZS5wYXRoR2V0KHJlcG8sIFtcIm93bmVyXCIsIFwiYXZhdGFyX3VybFwiXSk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChhdmF0YXJfdXJsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmxvZ2luLmF2YXRhcl91cmwgPSBhdmF0YXJfdXJsO1xuICAgICAgICAgICAgICAgICAgICAgIGxvY2FsU3RvcmFnZVtcImdvZ3NBdmF0YXJVcmxcIl0gPSBhdmF0YXJfdXJsO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgJHNjb3BlLmZldGNoZWQgPSB0cnVlO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KS5cbiAgICAgICAgICAgIGVycm9yKGZ1bmN0aW9uIChkYXRhLCBzdGF0dXMsIGhlYWRlcnMsIGNvbmZpZykge1xuICAgICAgICAgICAgICAkc2NvcGUubG9nb3V0KCk7XG4gICAgICAgICAgICAgICRzY29wZS5sb2dpbi5mYWlsZWQgPSB0cnVlO1xuICAgICAgICAgICAgICBpZiAoc3RhdHVzICE9PSA0MDMpIHtcbiAgICAgICAgICAgICAgICBsb2cud2FybihcImZhaWxlZCB0byBsb2FkIFwiICsgdXJsICsgXCIuIHN0YXR1czogXCIgKyBzdGF0dXMgKyBcIiBkYXRhOiBcIiArIGRhdGEpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICB1cGRhdGVEYXRhKCk7XG5cbiAgICB9XSk7XG59XG4iLCIvLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9pbmNsdWRlcy50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJmb3JnZUhlbHBlcnMudHNcIi8+XG5cbm1vZHVsZSBGb3JnZSB7XG5cbiAgY29uc3Qgc2VjcmV0TmFtZXNwYWNlS2V5ID0gXCJmYWJyaWM4U291cmNlU2VjcmV0TmFtZXNwYWNlXCI7XG4gIGNvbnN0IHNlY3JldE5hbWVLZXkgPSBcImZhYnJpYzhTb3VyY2VTZWNyZXRcIjtcblxuICBleHBvcnQgZnVuY3Rpb24gZ2V0U291cmNlU2VjcmV0TmFtZXNwYWNlKGxvY2FsU3RvcmFnZSkge1xuICAgIHZhciBzZWNyZXROYW1lc3BhY2UgPSBsb2NhbFN0b3JhZ2Vbc2VjcmV0TmFtZXNwYWNlS2V5XTtcbiAgICB2YXIgdXNlck5hbWUgPSBLdWJlcm5ldGVzLmN1cnJlbnRVc2VyTmFtZSgpO1xuICAgIGlmICghc2VjcmV0TmFtZXNwYWNlKSB7XG4gICAgICBzZWNyZXROYW1lc3BhY2UgPSBcInVzZXItc2VjcmV0cy1zb3VyY2UtXCIgKyB1c2VyTmFtZTtcbiAgICB9XG4gICAgcmV0dXJuIHNlY3JldE5hbWVzcGFjZTtcbiAgfVxuXG5cbiAgZXhwb3J0IGZ1bmN0aW9uIGdldFByb2plY3RTb3VyY2VTZWNyZXQobG9jYWxTdG9yYWdlLCBucywgcHJvamVjdElkKSB7XG4gICAgaWYgKCFucykge1xuICAgICAgbnMgPSBLdWJlcm5ldGVzLmN1cnJlbnRLdWJlcm5ldGVzTmFtZXNwYWNlKCk7XG4gICAgfVxuICAgIHZhciBzZWNyZXRLZXkgPSBjcmVhdGVMb2NhbFN0b3JhZ2VLZXkoc2VjcmV0TmFtZUtleSwgbnMsIHByb2plY3RJZCk7XG4gICAgdmFyIHNvdXJjZVNlY3JldCA9IGxvY2FsU3RvcmFnZVtzZWNyZXRLZXldO1xuICAgIHJldHVybiBzb3VyY2VTZWNyZXQ7XG4gIH1cblxuICBleHBvcnQgZnVuY3Rpb24gc2V0UHJvamVjdFNvdXJjZVNlY3JldChsb2NhbFN0b3JhZ2UsIG5zLCBwcm9qZWN0SWQsIHNlY3JldE5hbWUpIHtcbiAgICB2YXIgc2VjcmV0S2V5ID0gY3JlYXRlTG9jYWxTdG9yYWdlS2V5KHNlY3JldE5hbWVLZXksIG5zLCBwcm9qZWN0SWQpO1xuICAgIGxvY2FsU3RvcmFnZVtzZWNyZXRLZXldID0gc2VjcmV0TmFtZTtcbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiBzZWNyZXRWYWxpZChzZWNyZXQsIHJlcXVpcmVkRGF0YUtleXMpIHtcbiAgICB2YXIgZGF0YSA9IHNlY3JldC5kYXRhO1xuICAgIHZhciB2YWxpZCA9IHRydWU7XG4gICAgaWYgKGRhdGEpIHtcbiAgICAgIGFuZ3VsYXIuZm9yRWFjaChyZXF1aXJlZERhdGFLZXlzLCAoa2V5KSA9PiB7XG4gICAgICAgIGlmICghZGF0YVtrZXldKSB7XG4gICAgICAgICAgdmFsaWQgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHZhbGlkID0gZmFsc2U7XG4gICAgfVxuICAgIHJldHVybiB2YWxpZDtcbiAgfVxuXG5cbiAgZXhwb3J0IGZ1bmN0aW9uIHBhcnNlVXJsKHVybCkge1xuICAgIGlmICh1cmwpIHtcbiAgICAgIHZhciBwYXJzZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdhJyk7XG4gICAgICBwYXJzZXIuaHJlZiA9IHVybDtcbiAgICAgIHJldHVybiBwYXJzZXI7XG4gICAgfVxuICAgIHJldHVybiB7XG4gICAgICBwcm90b2NvbDogXCJcIixcbiAgICAgIGhvc3Q6IFwiXCJcbiAgICB9O1xuICB9XG5cbiAgZnVuY3Rpb24gY3JlYXRlTG9jYWxTdG9yYWdlS2V5KHByZWZpeCwgbnMsIG5hbWUpIHtcbiAgICByZXR1cm4gcHJlZml4ICsgXCIvXCIgKyBucyArIFwiL1wiICsgKG5hbWUgfHwgXCJcIik7XG4gIH1cbn1cbiIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9pbmNsdWRlcy50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJmb3JnZUhlbHBlcnMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwic2VjcmV0SGVscGVycy50c1wiLz5cblxubW9kdWxlIEZvcmdlIHtcblxuXG4gIGV4cG9ydCB2YXIgU2VjcmV0c0NvbnRyb2xsZXIgPSBjb250cm9sbGVyKFwiU2VjcmV0c0NvbnRyb2xsZXJcIiwgW1wiJHNjb3BlXCIsIFwiJGRpYWxvZ1wiLCBcIiR3aW5kb3dcIiwgXCIkZWxlbWVudFwiLCBcIiR0ZW1wbGF0ZUNhY2hlXCIsIFwiJHJvdXRlUGFyYW1zXCIsIFwiJGxvY2F0aW9uXCIsIFwibG9jYWxTdG9yYWdlXCIsIFwiJGh0dHBcIiwgXCIkdGltZW91dFwiLCBcIkZvcmdlQXBpVVJMXCIsIFwiRm9yZ2VNb2RlbFwiLCBcIkt1YmVybmV0ZXNNb2RlbFwiLFxuICAgICgkc2NvcGUsICRkaWFsb2csICR3aW5kb3csICRlbGVtZW50LCAkdGVtcGxhdGVDYWNoZSwgJHJvdXRlUGFyYW1zLCAkbG9jYXRpb246bmcuSUxvY2F0aW9uU2VydmljZSwgbG9jYWxTdG9yYWdlLCAkaHR0cCwgJHRpbWVvdXQsIEZvcmdlQXBpVVJMLCBGb3JnZU1vZGVsLCBLdWJlcm5ldGVzTW9kZWwpID0+IHtcblxuICAgICAgJHNjb3BlLm1vZGVsID0gS3ViZXJuZXRlc01vZGVsO1xuXG4gICAgICBpbml0U2NvcGUoJHNjb3BlLCAkbG9jYXRpb24sICRyb3V0ZVBhcmFtcyk7XG4gICAgICAkc2NvcGUuYnJlYWRjcnVtYkNvbmZpZyA9IERldmVsb3Blci5jcmVhdGVQcm9qZWN0U2V0dGluZ3NCcmVhZGNydW1icygkc2NvcGUucHJvamVjdElkKTtcbiAgICAgICRzY29wZS5zdWJUYWJDb25maWcgPSBEZXZlbG9wZXIuY3JlYXRlUHJvamVjdFNldHRpbmdzU3ViTmF2QmFycygkc2NvcGUucHJvamVjdElkKTtcblxuXG4gICAgICB2YXIgcHJvamVjdElkID0gJHNjb3BlLnByb2plY3RJZDtcbiAgICAgIHZhciBucyA9ICRzY29wZS5uYW1lc3BhY2U7XG4gICAgICB2YXIgdXNlck5hbWUgPSBLdWJlcm5ldGVzLmN1cnJlbnRVc2VyTmFtZSgpO1xuXG4gICAgICB2YXIgY3JlYXRlZFNlY3JldCA9ICRsb2NhdGlvbi5zZWFyY2goKVtcInNlY3JldFwiXTtcbiAgICAgIHZhciBwcm9qZWN0Q2xpZW50ID0gS3ViZXJuZXRlcy5jcmVhdGVLdWJlcm5ldGVzQ2xpZW50KFwicHJvamVjdHNcIik7XG5cbiAgICAgICRzY29wZS5yZXF1aXJlZERhdGFLZXlzID0gS3ViZXJuZXRlcy5odHRwc1NlY3JldERhdGFLZXlzO1xuICAgICAgJHNjb3BlLnNvdXJjZVNlY3JldE5hbWVzcGFjZSA9IGdldFNvdXJjZVNlY3JldE5hbWVzcGFjZShsb2NhbFN0b3JhZ2UpO1xuICAgICAgJHNjb3BlLnNldHVwU2VjcmV0c0xpbmsgPSBEZXZlbG9wZXIucHJvamVjdFNlY3JldHNMaW5rKG5zLCBwcm9qZWN0SWQpO1xuICAgICAgJHNjb3BlLnNlY3JldE5hbWVzcGFjZUxpbmsgPSBEZXZlbG9wZXIuc2VjcmV0c05hbWVzcGFjZUxpbmsobnMsIHByb2plY3RJZCwgJHNjb3BlLnNvdXJjZVNlY3JldE5hbWVzcGFjZSk7XG5cbiAgICAgIGdldEN1cnJlbnRTZWNyZXROYW1lKCk7XG5cbiAgICAgIGxvZy5kZWJ1ZyhcIkZvdW5kIHNvdXJjZSBzZWNyZXQgbmFtZXNwYWNlIFwiICsgJHNjb3BlLnNvdXJjZVNlY3JldE5hbWVzcGFjZSk7XG4gICAgICBsb2cuZGVidWcoXCJGb3VuZCBzb3VyY2Ugc2VjcmV0IGZvciBcIiArIG5zICsgXCIvXCIgKyBwcm9qZWN0SWQgKyBcIiA9IFwiICsgJHNjb3BlLnNvdXJjZVNlY3JldCk7XG5cbiAgICAgICRzY29wZS4kb24oJyRyb3V0ZVVwZGF0ZScsICgkZXZlbnQpID0+IHtcbiAgICAgICAgdXBkYXRlRGF0YSgpO1xuICAgICAgfSk7XG5cbiAgICAgICRzY29wZS4kb24oJ2t1YmVybmV0ZXNNb2RlbFVwZGF0ZWQnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHVwZGF0ZURhdGEoKTtcbiAgICAgIH0pO1xuXG4gICAgICAkc2NvcGUudGFibGVDb25maWcgPSB7XG4gICAgICAgIGRhdGE6ICdmaWx0ZXJlZFNlY3JldHMnLFxuICAgICAgICBzaG93U2VsZWN0aW9uQ2hlY2tib3g6IHRydWUsXG4gICAgICAgIGVuYWJsZVJvd0NsaWNrU2VsZWN0aW9uOiB0cnVlLFxuICAgICAgICBtdWx0aVNlbGVjdDogZmFsc2UsXG4gICAgICAgIHNlbGVjdGVkSXRlbXM6IFtdLFxuICAgICAgICBmaWx0ZXJPcHRpb25zOiB7XG4gICAgICAgICAgZmlsdGVyVGV4dDogJGxvY2F0aW9uLnNlYXJjaCgpW1wicVwiXSB8fCAnJ1xuICAgICAgICB9LFxuICAgICAgICBjb2x1bW5EZWZzOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgZmllbGQ6ICdfa2V5JyxcbiAgICAgICAgICAgIGRpc3BsYXlOYW1lOiAnU2VjcmV0IE5hbWUnLFxuICAgICAgICAgICAgZGVmYXVsdFNvcnQ6IHRydWUsXG4gICAgICAgICAgICBjZWxsVGVtcGxhdGU6ICc8ZGl2IGNsYXNzPVwibmdDZWxsVGV4dCBub3dyYXBcIj57e3Jvdy5lbnRpdHkubWV0YWRhdGEubmFtZX19PC9kaXY+J1xuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgZmllbGQ6ICckbGFiZWxzVGV4dCcsXG4gICAgICAgICAgICBkaXNwbGF5TmFtZTogJ0xhYmVscycsXG4gICAgICAgICAgICBjZWxsVGVtcGxhdGU6ICR0ZW1wbGF0ZUNhY2hlLmdldChcImxhYmVsVGVtcGxhdGUuaHRtbFwiKVxuICAgICAgICAgIH0sXG4gICAgICAgIF1cbiAgICAgIH07XG5cbiAgICAgIGlmIChjcmVhdGVkU2VjcmV0KSB7XG4gICAgICAgICRsb2NhdGlvbi5zZWFyY2goXCJzZWNyZXRcIiwgbnVsbCk7XG4gICAgICAgICRzY29wZS5zZWxlY3RlZFNlY3JldE5hbWUgPSBjcmVhdGVkU2VjcmV0O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc2VsZWN0ZWRTZWNyZXROYW1lKCk7XG4gICAgICB9XG5cbiAgICAgICRzY29wZS4kd2F0Y2hDb2xsZWN0aW9uKFwidGFibGVDb25maWcuc2VsZWN0ZWRJdGVtc1wiLCAoKSA9PiB7XG4gICAgICAgIHNlbGVjdGVkU2VjcmV0TmFtZSgpO1xuICAgICAgfSk7XG5cbiAgICAgIGZ1bmN0aW9uIHVwZGF0ZURhdGEoKSB7XG4gICAgICAgIGNoZWNrTmFtZXNwYWNlQ3JlYXRlZCgpO1xuICAgICAgICB1cGRhdGVQcm9qZWN0KCk7XG4gICAgICAgIENvcmUuJGFwcGx5KCRzY29wZSk7XG4gICAgICB9XG5cbiAgICAgIGNoZWNrTmFtZXNwYWNlQ3JlYXRlZCgpO1xuXG4gICAgICBmdW5jdGlvbiBnZXRDdXJyZW50U2VjcmV0TmFtZSgpIHtcbiAgICAgICAgdmFyIGFuc3dlciA9IG51bGw7XG4gICAgICAgIGlmIChjcmVhdGVkU2VjcmV0KSB7XG4gICAgICAgICAgYW5zd2VyID0gY3JlYXRlZFNlY3JldDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB2YXIgbG9jYWxTdG9yZWRTZWNyZXROYW1lID0gZ2V0UHJvamVjdFNvdXJjZVNlY3JldChsb2NhbFN0b3JhZ2UsIG5zLCBwcm9qZWN0SWQpO1xuICAgICAgICAgIGlmIChsb2NhbFN0b3JlZFNlY3JldE5hbWUpIHtcbiAgICAgICAgICAgIC8vIGxldHMgY2hlY2sgdGhhdCBpdHMgdmFsaWQgYW5kIGlmIG5vdCBsZXRzIGNsZWFyIGl0XG4gICAgICAgICAgICBpZiAoJHNjb3BlLnBlcnNvbmFsU2VjcmV0cyAmJiAkc2NvcGUucGVyc29uYWxTZWNyZXRzLmxlbmd0aCkge1xuICAgICAgICAgICAgICB2YXIgdmFsaWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgYW5ndWxhci5mb3JFYWNoKCRzY29wZS5wZXJzb25hbFNlY3JldHMsIChzZWNyZXQpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAobG9jYWxTdG9yZWRTZWNyZXROYW1lID09PSBLdWJlcm5ldGVzLmdldE5hbWUoc2VjcmV0KSkge1xuICAgICAgICAgICAgICAgICAgaWYgKHNlY3JldFZhbGlkKHNlY3JldCwgJHNjb3BlLnJlcXVpcmVkRGF0YUtleXMpKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhbGlkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICBpZiAoIXZhbGlkKSB7XG4gICAgICAgICAgICAgICAgbG9nLmluZm8oXCJDbGVhcmluZyBzZWNyZXQgbmFtZSBjb25maWd1cmF0aW9uOiBcIiArIGxvY2FsU3RvcmVkU2VjcmV0TmFtZSArIFwiIGFzIHRoZSBzZWNyZXQgbm8gbG9uZ2VyIGV4aXN0cyFcIik7XG4gICAgICAgICAgICAgICAgbG9jYWxTdG9yZWRTZWNyZXROYW1lID0gXCJcIjtcbiAgICAgICAgICAgICAgICBzZXRQcm9qZWN0U291cmNlU2VjcmV0KGxvY2FsU3RvcmFnZSwgbnMsIHByb2plY3RJZCwgbG9jYWxTdG9yZWRTZWNyZXROYW1lKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBhbnN3ZXIgPSBsb2NhbFN0b3JlZFNlY3JldE5hbWU7XG4gICAgICAgIH1cbiAgICAgICAgJHNjb3BlLnNvdXJjZVNlY3JldCA9IGFuc3dlcjtcbiAgICAgICAgcmV0dXJuIGFuc3dlcjtcbiAgICAgIH1cblxuICAgICAgZnVuY3Rpb24gc2VsZWN0ZWRTZWNyZXROYW1lKCkge1xuICAgICAgICAkc2NvcGUuc2VsZWN0ZWRTZWNyZXROYW1lID0gZ2V0Q3VycmVudFNlY3JldE5hbWUoKTtcbiAgICAgICAgdmFyIHNlbGVjdGVkSXRlbXMgPSAkc2NvcGUudGFibGVDb25maWcuc2VsZWN0ZWRJdGVtcztcbiAgICAgICAgaWYgKHNlbGVjdGVkSXRlbXMgJiYgc2VsZWN0ZWRJdGVtcy5sZW5ndGgpIHtcbiAgICAgICAgICB2YXIgc2VjcmV0ID0gc2VsZWN0ZWRJdGVtc1swXTtcbiAgICAgICAgICB2YXIgbmFtZSA9IEt1YmVybmV0ZXMuZ2V0TmFtZShzZWNyZXQpO1xuICAgICAgICAgIGlmIChuYW1lKSB7XG4gICAgICAgICAgICAkc2NvcGUuc2VsZWN0ZWRTZWNyZXROYW1lID0gbmFtZTtcbiAgICAgICAgICAgIGlmIChjcmVhdGVkU2VjcmV0ICYmIG5hbWUgIT09IGNyZWF0ZWRTZWNyZXQpIHtcbiAgICAgICAgICAgICAgLy8gbGV0cyBjbGVhciB0aGUgcHJldmlvdXNseSBjcmVhdGVkIHNlY3JldFxuICAgICAgICAgICAgICBjcmVhdGVkU2VjcmV0ID0gbnVsbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuICRzY29wZS5zZWxlY3RlZFNlY3JldE5hbWU7XG4gICAgICB9XG5cbiAgICAgICRzY29wZS5jYW5jZWwgPSAoKSA9PiB7XG4gICAgICAgIHZhciBzZWxlY3RlZEl0ZW1zID0gJHNjb3BlLnRhYmxlQ29uZmlnLnNlbGVjdGVkSXRlbXM7XG4gICAgICAgIHNlbGVjdGVkSXRlbXMuc3BsaWNlKDAsIHNlbGVjdGVkSXRlbXMubGVuZ3RoKTtcbiAgICAgICAgdmFyIGN1cnJlbnQgPSBnZXRDdXJyZW50U2VjcmV0TmFtZSgpO1xuICAgICAgICBpZiAoY3VycmVudCkge1xuICAgICAgICAgIGFuZ3VsYXIuZm9yRWFjaCgkc2NvcGUucGVyc29uYWxTZWNyZXRzLCAoc2VjcmV0KSA9PiB7XG4gICAgICAgICAgICBpZiAoIXNlbGVjdGVkSXRlbXMubGVuZ3RoICYmIGN1cnJlbnQgPT09IEt1YmVybmV0ZXMuZ2V0TmFtZShzZWNyZXQpKSB7XG4gICAgICAgICAgICAgIHNlbGVjdGVkSXRlbXMucHVzaChzZWNyZXQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgICRzY29wZS50YWJsZUNvbmZpZy5zZWxlY3RlZEl0ZW1zID0gc2VsZWN0ZWRJdGVtcztcbiAgICAgICAgc2VsZWN0ZWRTZWNyZXROYW1lKCk7XG4gICAgICB9O1xuXG4gICAgICAkc2NvcGUuY2FuU2F2ZSA9ICgpID0+IHtcbiAgICAgICAgdmFyIHNlbGVjdGVkID0gc2VsZWN0ZWRTZWNyZXROYW1lKCk7XG4gICAgICAgIHZhciBjdXJyZW50ID0gZ2V0Q3VycmVudFNlY3JldE5hbWUoKTtcbiAgICAgICAgcmV0dXJuIHNlbGVjdGVkICYmIChzZWxlY3RlZCAhPT0gY3VycmVudCB8fCBzZWxlY3RlZCA9PSBjcmVhdGVkU2VjcmV0KTtcbiAgICAgIH07XG5cbiAgICAgICRzY29wZS5zYXZlID0gKCkgPT4ge1xuICAgICAgICB2YXIgc2VsZWN0ZWQgPSBzZWxlY3RlZFNlY3JldE5hbWUoKTtcbiAgICAgICAgaWYgKHNlbGVjdGVkKSB7XG4gICAgICAgICAgc2V0UHJvamVjdFNvdXJjZVNlY3JldChsb2NhbFN0b3JhZ2UsIG5zLCBwcm9qZWN0SWQsIHNlbGVjdGVkKTtcblxuICAgICAgICAgIGlmICghcHJvamVjdElkKSB7XG4gICAgICAgICAgICAvLyBsZXRzIHJlZGlyZWN0IGJhY2sgdG8gdGhlIGNyZWF0ZSBwcm9qZWN0IHBhZ2VcbiAgICAgICAgICAgICRsb2NhdGlvbi5wYXRoKERldmVsb3Blci5jcmVhdGVQcm9qZWN0TGluayhucykpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfTtcblxuICAgICAgY2hlY2tOYW1lc3BhY2VDcmVhdGVkKCk7XG5cblxuICAgICAgZnVuY3Rpb24gdXBkYXRlUHJvamVjdCgpIHtcbiAgICAgICAgYW5ndWxhci5mb3JFYWNoKCRzY29wZS5tb2RlbC5idWlsZGNvbmZpZ3MsIChwcm9qZWN0KSA9PiB7XG4gICAgICAgICAgaWYgKHByb2plY3RJZCA9PT0gS3ViZXJuZXRlcy5nZXROYW1lKHByb2plY3QpKSB7XG4gICAgICAgICAgICAkc2NvcGUucHJvamVjdCA9IHByb2plY3Q7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgJHNjb3BlLmdpdFVybCA9IENvcmUucGF0aEdldCgkc2NvcGUucHJvamVjdCwgWydzcGVjJywgJ3NvdXJjZScsICdnaXQnLCAndXJpJ10pO1xuICAgICAgICB2YXIgcGFyc2VyID0gcGFyc2VVcmwoJHNjb3BlLmdpdFVybCk7XG4gICAgICAgIHZhciBraW5kID0gcGFyc2VyLnByb3RvY29sO1xuICAgICAgICAvLyB0aGVzZSBraW5kcyBvZiBVUkxzIHNob3cgdXAgYXMgaHR0cFxuICAgICAgICBpZiAoISRzY29wZS5naXRVcmwpIHtcbiAgICAgICAgICBraW5kID0gXCJodHRwc1wiO1xuICAgICAgICB9IGVsc2UgaWYgKCRzY29wZS5naXRVcmwgJiYgJHNjb3BlLmdpdFVybC5zdGFydHNXaXRoKFwiZ2l0QFwiKSkge1xuICAgICAgICAgIGtpbmQgPSBcInNzaFwiO1xuICAgICAgICB9XG4gICAgICAgIHZhciBob3N0ID0gcGFyc2VyLmhvc3Q7XG4gICAgICAgIHZhciByZXF1aXJlZERhdGFLZXlzID0gS3ViZXJuZXRlcy5zc2hTZWNyZXREYXRhS2V5cztcbiAgICAgICAgaWYgKGtpbmQgJiYga2luZC5zdGFydHNXaXRoKCdodHRwJykpIHtcbiAgICAgICAgICBraW5kID0gJ2h0dHBzJztcbiAgICAgICAgICByZXF1aXJlZERhdGFLZXlzID0gS3ViZXJuZXRlcy5odHRwc1NlY3JldERhdGFLZXlzO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGtpbmQgPSAnc3NoJztcbiAgICAgICAgfVxuICAgICAgICAkc2NvcGUua2luZCA9IGtpbmQ7XG4gICAgICAgICRzY29wZS5yZXF1aXJlZERhdGFLZXlzID0gcmVxdWlyZWREYXRhS2V5cztcbiAgICAgICAgdmFyIHNhdmVkVXJsID0gJGxvY2F0aW9uLnBhdGgoKTtcbiAgICAgICAgY29uc3QgbmV3U2VjcmV0UGF0aCA9IFVybEhlbHBlcnMuam9pbihcIm5hbWVzcGFjZVwiLCAkc2NvcGUuc291cmNlU2VjcmV0TmFtZXNwYWNlLCBcInNlY3JldENyZWF0ZT9raW5kPVwiICsga2luZCArIFwiJnNhdmVkVXJsPVwiICsgc2F2ZWRVcmwpO1xuICAgICAgICAkc2NvcGUuYWRkTmV3U2VjcmV0TGluayA9IChwcm9qZWN0SWQpID9cbiAgICAgICAgICBEZXZlbG9wZXIucHJvamVjdFdvcmtzcGFjZUxpbmsobnMsIHByb2plY3RJZCwgbmV3U2VjcmV0UGF0aCkgOlxuICAgICAgICAgIFVybEhlbHBlcnMuam9pbihIYXd0aW9Db3JlLmRvY3VtZW50QmFzZSgpLCBLdWJlcm5ldGVzLmNvbnRleHQsIG5ld1NlY3JldFBhdGgpO1xuXG4gICAgICAgIHZhciBmaWx0ZXJlZFNlY3JldHMgPSBbXTtcbiAgICAgICAgdmFyIHNlbGVjdGlvbiA9IFtdO1xuICAgICAgICB2YXIgY3VycmVudFNlY3JldE5hbWUgPSBnZXRDdXJyZW50U2VjcmV0TmFtZSgpO1xuICAgICAgICBhbmd1bGFyLmZvckVhY2goJHNjb3BlLnBlcnNvbmFsU2VjcmV0cywgKHNlY3JldCkgPT4ge1xuICAgICAgICAgIHZhciB2YWxpZCA9IHNlY3JldFZhbGlkKHNlY3JldCwgcmVxdWlyZWREYXRhS2V5cyk7XG4gICAgICAgICAgaWYgKHZhbGlkKSB7XG4gICAgICAgICAgICB2YXIgc2VjcmV0TmFtZSA9IEt1YmVybmV0ZXMuZ2V0TmFtZShzZWNyZXQpO1xuICAgICAgICAgICAgc2VjcmV0W1wiX2tleVwiXSA9IHNlY3JldE5hbWU7XG4gICAgICAgICAgICBmaWx0ZXJlZFNlY3JldHMucHVzaChzZWNyZXQpO1xuICAgICAgICAgICAgaWYgKHNlY3JldE5hbWUgPT09IGN1cnJlbnRTZWNyZXROYW1lKSB7XG4gICAgICAgICAgICAgIHNlbGVjdGlvbi5wdXNoKHNlY3JldCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgJHNjb3BlLmZpbHRlcmVkU2VjcmV0cyA9IF8uc29ydEJ5KGZpbHRlcmVkU2VjcmV0cywgXCJfa2V5XCIpO1xuICAgICAgICAkc2NvcGUudGFibGVDb25maWcuc2VsZWN0ZWRJdGVtcyA9IHNlbGVjdGlvbjtcbiAgICAgIH1cblxuICAgICAgZnVuY3Rpb24gb25QZXJzb25hbFNlY3JldHMoc2VjcmV0cykge1xuICAgICAgICAkc2NvcGUucGVyc29uYWxTZWNyZXRzID0gc2VjcmV0cztcbiAgICAgICAgJHNjb3BlLmZldGNoZWQgPSB0cnVlO1xuICAgICAgICAkc2NvcGUuY2FuY2VsKCk7XG4gICAgICAgIHVwZGF0ZVByb2plY3QoKTtcbiAgICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICAgIH1cblxuICAgICAgZnVuY3Rpb24gb25CdWlsZENvbmZpZ3MoYnVpbGRjb25maWdzKSB7XG4gICAgICAgIGlmIChvbkJ1aWxkQ29uZmlncyAmJiAhKCRzY29wZS5tb2RlbC5idWlsZGNvbmZpZ3MgfHwgW10pLmxlbmd0aCkge1xuICAgICAgICAgICRzY29wZS5tb2RlbC5idWlsZGNvbmZpZ3MgPSBidWlsZGNvbmZpZ3M7XG4gICAgICAgIH1cbiAgICAgICAgdXBkYXRlUHJvamVjdCgpO1xuICAgICAgfVxuXG4gICAgICBmdW5jdGlvbiBjaGVja05hbWVzcGFjZUNyZWF0ZWQoKSB7XG4gICAgICAgIHZhciBuYW1lc3BhY2VOYW1lID0gZ2V0U291cmNlU2VjcmV0TmFtZXNwYWNlKGxvY2FsU3RvcmFnZSk7XG5cbiAgICAgICAgZnVuY3Rpb24gd2F0Y2hTZWNyZXRzKCkge1xuICAgICAgICAgIGxvZy5pbmZvKFwid2F0Y2hpbmcgc2VjcmV0cyBvbiBuYW1lc3BhY2U6IFwiICsgbmFtZXNwYWNlTmFtZSk7XG4gICAgICAgICAgS3ViZXJuZXRlcy53YXRjaCgkc2NvcGUsICRlbGVtZW50LCBcInNlY3JldHNcIiwgbmFtZXNwYWNlTmFtZSwgb25QZXJzb25hbFNlY3JldHMpO1xuICAgICAgICAgIEt1YmVybmV0ZXMud2F0Y2goJHNjb3BlLCAkZWxlbWVudCwgXCJidWlsZGNvbmZpZ3NcIiwgbnMsIG9uQnVpbGRDb25maWdzKTtcbiAgICAgICAgICBDb3JlLiRhcHBseSgkc2NvcGUpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCEkc2NvcGUuc2VjcmV0TmFtZXNwYWNlKSB7XG4gICAgICAgICAgYW5ndWxhci5mb3JFYWNoKCRzY29wZS5tb2RlbC5wcm9qZWN0cywgKHByb2plY3QpID0+IHtcbiAgICAgICAgICAgIHZhciBuYW1lID0gS3ViZXJuZXRlcy5nZXROYW1lKHByb2plY3QpO1xuICAgICAgICAgICAgaWYgKG5hbWUgPT09IG5hbWVzcGFjZU5hbWUpIHtcbiAgICAgICAgICAgICAgJHNjb3BlLnNlY3JldE5hbWVzcGFjZSA9IHByb2plY3Q7XG4gICAgICAgICAgICAgIHdhdGNoU2VjcmV0cygpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCEkc2NvcGUuc2VjcmV0TmFtZXNwYWNlICYmICRzY29wZS5tb2RlbC5wcm9qZWN0cyAmJiAkc2NvcGUubW9kZWwucHJvamVjdHMubGVuZ3RoKSB7XG4gICAgICAgICAgbG9nLmluZm8oXCJDcmVhdGluZyBhIG5ldyBuYW1lc3BhY2UgZm9yIHRoZSB1c2VyIHNlY3JldHMuLi4uIFwiICsgbmFtZXNwYWNlTmFtZSk7XG4gICAgICAgICAgdmFyIHByb2plY3QgPSB7XG4gICAgICAgICAgICBhcGlWZXJzaW9uOiBLdWJlcm5ldGVzLmRlZmF1bHRBcGlWZXJzaW9uLFxuICAgICAgICAgICAga2luZDogXCJQcm9qZWN0XCIsXG4gICAgICAgICAgICBtZXRhZGF0YToge1xuICAgICAgICAgICAgICBuYW1lOiBuYW1lc3BhY2VOYW1lLFxuICAgICAgICAgICAgICBsYWJlbHM6IHtcbiAgICAgICAgICAgICAgICB1c2VyOiB1c2VyTmFtZSxcbiAgICAgICAgICAgICAgICBncm91cDogJ3NlY3JldHMnLFxuICAgICAgICAgICAgICAgIHByb2plY3Q6ICdzb3VyY2UnXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9O1xuXG4gICAgICAgICAgcHJvamVjdENsaWVudC5wdXQocHJvamVjdCxcbiAgICAgICAgICAgIChkYXRhKSA9PiB7XG4gICAgICAgICAgICAgICRzY29wZS5zZWNyZXROYW1lc3BhY2UgPSBwcm9qZWN0O1xuICAgICAgICAgICAgICB3YXRjaFNlY3JldHMoKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAoZXJyKSA9PiB7XG4gICAgICAgICAgICAgIGxvZy53YXJuKFwiRmFpbGVkIHRvIGNyZWF0ZSBzZWNyZXQgbmFtZXNwYWNlOiBcIiArIG5hbWVzcGFjZU5hbWUgKyBcIjogXCIgKyBhbmd1bGFyLnRvSnNvbihlcnIpKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfV0pO1xufVxuIiwiLy8vIENvcHlyaWdodCAyMDE0LTIwMTUgUmVkIEhhdCwgSW5jLiBhbmQvb3IgaXRzIGFmZmlsaWF0ZXNcbi8vLyBhbmQgb3RoZXIgY29udHJpYnV0b3JzIGFzIGluZGljYXRlZCBieSB0aGUgQGF1dGhvciB0YWdzLlxuLy8vXG4vLy8gTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbi8vLyB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4vLy8gWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4vLy9cbi8vLyAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuLy8vXG4vLy8gVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuLy8vIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbi8vLyBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbi8vLyBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4vLy8gbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9pbmNsdWRlcy50c1wiLz5cbm1vZHVsZSBNYWluIHtcblxuICBleHBvcnQgdmFyIHBsdWdpbk5hbWUgPSBcImZhYnJpYzgtY29uc29sZVwiO1xuXG4gIGV4cG9ydCB2YXIgbG9nOiBMb2dnaW5nLkxvZ2dlciA9IExvZ2dlci5nZXQocGx1Z2luTmFtZSk7XG5cbiAgZXhwb3J0IHZhciB0ZW1wbGF0ZVBhdGggPSBcInBsdWdpbnMvbWFpbi9odG1sXCI7XG5cbiAgLy8ga3ViZXJuZXRlcyBzZXJ2aWNlIG5hbWVzXG4gIGV4cG9ydCB2YXIgY2hhdFNlcnZpY2VOYW1lID0gXCJsZXRzY2hhdFwiO1xuICBleHBvcnQgdmFyIGdyYWZhbmFTZXJ2aWNlTmFtZSA9IFwiZ3JhZmFuYVwiO1xuICBleHBvcnQgdmFyIGFwcExpYnJhcnlTZXJ2aWNlTmFtZSA9IFwiYXBwLWxpYnJhcnlcIjtcblxuICBleHBvcnQgdmFyIHZlcnNpb246YW55ID0ge307XG5cbn1cbiIsIi8vLyBDb3B5cmlnaHQgMjAxNC0yMDE1IFJlZCBIYXQsIEluYy4gYW5kL29yIGl0cyBhZmZpbGlhdGVzXG4vLy8gYW5kIG90aGVyIGNvbnRyaWJ1dG9ycyBhcyBpbmRpY2F0ZWQgYnkgdGhlIEBhdXRob3IgdGFncy5cbi8vL1xuLy8vIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4vLy8geW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuLy8vIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuLy8vXG4vLy8gICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbi8vL1xuLy8vIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbi8vLyBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4vLy8gV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4vLy8gU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuLy8vIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuXG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vaW5jbHVkZXMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vZm9yZ2UvdHMvZm9yZ2VIZWxwZXJzLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIm1haW5HbG9iYWxzLnRzXCIvPlxuXG5tb2R1bGUgTWFpbiB7XG5cbiAgZXhwb3J0IHZhciBfbW9kdWxlID0gYW5ndWxhci5tb2R1bGUocGx1Z2luTmFtZSwgW0ZvcmdlLnBsdWdpbk5hbWVdKTtcblxuICB2YXIgdGFiID0gdW5kZWZpbmVkO1xuXG4gIF9tb2R1bGUucnVuKCgkcm9vdFNjb3BlLCBIYXd0aW9OYXY6IEhhd3Rpb01haW5OYXYuUmVnaXN0cnksIEt1YmVybmV0ZXNNb2RlbCwgU2VydmljZVJlZ2lzdHJ5LCBwcmVmZXJlbmNlc1JlZ2lzdHJ5KSA9PiB7XG5cbiAgICBIYXd0aW9OYXYub24oSGF3dGlvTWFpbk5hdi5BY3Rpb25zLkNIQU5HRUQsIHBsdWdpbk5hbWUsIChpdGVtcykgPT4ge1xuICAgICAgaXRlbXMuZm9yRWFjaCgoaXRlbSkgPT4ge1xuICAgICAgICBzd2l0Y2goaXRlbS5pZCkge1xuICAgICAgICAgIGNhc2UgJ2ZvcmdlJzpcbiAgICAgICAgICBjYXNlICdqdm0nOlxuICAgICAgICAgIGNhc2UgJ3dpa2knOlxuICAgICAgICAgIGNhc2UgJ2RvY2tlci1yZWdpc3RyeSc6XG4gICAgICAgICAgICBpdGVtLmlzVmFsaWQgPSAoKSA9PiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfSk7XG4gICAgSGF3dGlvTmF2LmFkZCh7XG4gICAgICBpZDogJ2xpYnJhcnknLFxuICAgICAgdGl0bGU6ICgpID0+ICdMaWJyYXJ5JyxcbiAgICAgIHRvb2x0aXA6ICgpID0+ICdWaWV3IHRoZSBsaWJyYXJ5IG9mIGFwcGxpY2F0aW9ucycsXG4gICAgICBpc1ZhbGlkOiAoKSA9PiBTZXJ2aWNlUmVnaXN0cnkuaGFzU2VydmljZShhcHBMaWJyYXJ5U2VydmljZU5hbWUpICYmIFNlcnZpY2VSZWdpc3RyeS5oYXNTZXJ2aWNlKFwiYXBwLWxpYnJhcnktam9sb2tpYVwiKSxcbiAgICAgIGhyZWY6ICgpID0+IFwiL3dpa2kvdmlld1wiLFxuICAgICAgaXNBY3RpdmU6ICgpID0+IGZhbHNlXG4gICAgfSk7XG5cbiAgICB2YXIga2liYW5hU2VydmljZU5hbWUgPSBLdWJlcm5ldGVzLmtpYmFuYVNlcnZpY2VOYW1lO1xuXG4gICAgSGF3dGlvTmF2LmFkZCh7XG4gICAgICBpZDogJ2tpYmFuYScsXG4gICAgICB0aXRsZTogKCkgPT4gICdMb2dzJyxcbiAgICAgIHRvb2x0aXA6ICgpID0+ICdWaWV3IGFuZCBzZWFyY2ggYWxsIGxvZ3MgYWNyb3NzIGFsbCBjb250YWluZXJzIHVzaW5nIEtpYmFuYSBhbmQgRWxhc3RpY1NlYXJjaCcsXG4gICAgICBpc1ZhbGlkOiAoKSA9PiBTZXJ2aWNlUmVnaXN0cnkuaGFzU2VydmljZShraWJhbmFTZXJ2aWNlTmFtZSksXG4gICAgICBocmVmOiAoKSA9PiBLdWJlcm5ldGVzLmtpYmFuYUxvZ3NMaW5rKFNlcnZpY2VSZWdpc3RyeSksXG4gICAgICBpc0FjdGl2ZTogKCkgPT4gZmFsc2VcbiAgICB9KTtcblxuICAgIEhhd3Rpb05hdi5hZGQoe1xuICAgICAgaWQ6ICdhcGltYW4nLFxuICAgICAgdGl0bGU6ICgpID0+ICdBUEkgTWFuYWdlbWVudCcsXG4gICAgICB0b29sdGlwOiAoKSA9PiAnQWRkIFBvbGljaWVzIGFuZCBQbGFucyB0byB5b3VyIEFQSXMgd2l0aCBBcGltYW4nLFxuICAgICAgaXNWYWxpZDogKCkgPT4gU2VydmljZVJlZ2lzdHJ5Lmhhc1NlcnZpY2UoJ2FwaW1hbicpLFxuICAgICAgb2xkSHJlZjogKCkgPT4geyAvKiBub3RoaW5nIHRvIGRvICovIH0sXG4gICAgICBocmVmOiAoKSA9PiB7XG4gICAgICAgIHZhciBoYXNoID0ge1xuICAgICAgICAgIGJhY2tUbzogbmV3IFVSSSgpLnRvU3RyaW5nKCksXG4gICAgICAgICAgdG9rZW46IEhhd3Rpb09BdXRoLmdldE9BdXRoVG9rZW4oKVxuICAgICAgICB9O1xuICAgICAgICB2YXIgdXJpID0gbmV3IFVSSShTZXJ2aWNlUmVnaXN0cnkuc2VydmljZUxpbmsoJ2FwaW1hbicpKTtcbiAgICAgICAgLy8gVE9ETyBoYXZlIHRvIG92ZXJ3cml0ZSB0aGUgcG9ydCBoZXJlIGZvciBzb21lIHJlYXNvblxuICAgICAgICAoPGFueT51cmkucG9ydCgnODAnKS5xdWVyeSh7fSkucGF0aCgnYXBpbWFudWkvaW5kZXguaHRtbCcpKS5oYXNoKFVSSS5lbmNvZGUoYW5ndWxhci50b0pzb24oaGFzaCkpKTtcbiAgICAgICAgcmV0dXJuIHVyaS50b1N0cmluZygpO1xuICAgICAgfSAgICBcbiAgICB9KTtcblxuICAgIEhhd3Rpb05hdi5hZGQoe1xuICAgICAgaWQ6ICdncmFmYW5hJyxcbiAgICAgIHRpdGxlOiAoKSA9PiAgJ01ldHJpY3MnLFxuICAgICAgdG9vbHRpcDogKCkgPT4gJ1ZpZXdzIG1ldHJpY3MgYWNyb3NzIGFsbCBjb250YWluZXJzIHVzaW5nIEdyYWZhbmEgYW5kIEluZmx1eERCJyxcbiAgICAgIGlzVmFsaWQ6ICgpID0+IFNlcnZpY2VSZWdpc3RyeS5oYXNTZXJ2aWNlKGdyYWZhbmFTZXJ2aWNlTmFtZSksXG4gICAgICBocmVmOiAoKSA9PiBTZXJ2aWNlUmVnaXN0cnkuc2VydmljZUxpbmsoZ3JhZmFuYVNlcnZpY2VOYW1lKSxcbiAgICAgIGlzQWN0aXZlOiAoKSA9PiBmYWxzZVxuICAgIH0pO1xuXG4gICAgSGF3dGlvTmF2LmFkZCh7XG4gICAgICBpZDogXCJjaGF0XCIsXG4gICAgICB0aXRsZTogKCkgPT4gICdDaGF0JyxcbiAgICAgIHRvb2x0aXA6ICgpID0+ICdDaGF0IHJvb20gZm9yIGRpc2N1c3NpbmcgdGhpcyBuYW1lc3BhY2UnLFxuICAgICAgaXNWYWxpZDogKCkgPT4gU2VydmljZVJlZ2lzdHJ5Lmhhc1NlcnZpY2UoY2hhdFNlcnZpY2VOYW1lKSxcbiAgICAgIGhyZWY6ICgpID0+IHtcbiAgICAgICAgdmFyIGFuc3dlciA9IFNlcnZpY2VSZWdpc3RyeS5zZXJ2aWNlTGluayhjaGF0U2VydmljZU5hbWUpO1xuICAgICAgICBpZiAoYW5zd2VyKSB7XG4vKlxuICAgICAgICAgIFRPRE8gYWRkIGEgY3VzdG9tIGxpbmsgdG8gdGhlIGNvcnJlY3Qgcm9vbSBmb3IgdGhlIGN1cnJlbnQgbmFtZXNwYWNlP1xuXG4gICAgICAgICAgdmFyIGlyY0hvc3QgPSBcIlwiO1xuICAgICAgICAgIHZhciBpcmNTZXJ2aWNlID0gU2VydmljZVJlZ2lzdHJ5LmZpbmRTZXJ2aWNlKFwiaHVib3RcIik7XG4gICAgICAgICAgaWYgKGlyY1NlcnZpY2UpIHtcbiAgICAgICAgICAgIGlyY0hvc3QgPSBpcmNTZXJ2aWNlLnBvcnRhbElQO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoaXJjSG9zdCkge1xuICAgICAgICAgICAgdmFyIG5pY2sgPSBsb2NhbFN0b3JhZ2VbXCJnb2dzVXNlclwiXSB8fCBsb2NhbFN0b3JhZ2VbXCJpcmNOaWNrXCJdIHx8IFwibXluYW1lXCI7XG4gICAgICAgICAgICB2YXIgcm9vbSA9IFwiI2ZhYnJpYzgtXCIgKyAgY3VycmVudEt1YmVybmV0ZXNOYW1lc3BhY2UoKTtcbiAgICAgICAgICAgIGFuc3dlciA9IFVybEhlbHBlcnMuam9pbihhbnN3ZXIsIFwiL2tpd2lcIiwgaXJjSG9zdCwgXCI/Jm5pY2s9XCIgKyBuaWNrICsgcm9vbSk7XG4gICAgICAgICAgfVxuKi9cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gYW5zd2VyO1xuICAgICAgfSxcbiAgICAgIGlzQWN0aXZlOiAoKSA9PiBmYWxzZVxuICAgIH0pO1xuXG4gICAgLy8gVE9ETyB3ZSBzaG91bGQgbW92ZSB0aGlzIHRvIGEgbmljZXIgbGluayBpbnNpZGUgdGhlIExpYnJhcnkgc29vbiAtIGFsc28gbGV0cyBoaWRlIHVudGlsIGl0IHdvcmtzLi4uXG4vKlxuICAgIHdvcmtzcGFjZS50b3BMZXZlbFRhYnMucHVzaCh7XG4gICAgICBpZDogJ2NyZWF0ZVByb2plY3QnLFxuICAgICAgdGl0bGU6ICgpID0+ICAnQ3JlYXRlJyxcbiAgICAgIHRvb2x0aXA6ICgpID0+ICdDcmVhdGVzIGEgbmV3IHByb2plY3QnLFxuICAgICAgaXNWYWxpZDogKCkgPT4gU2VydmljZVJlZ2lzdHJ5Lmhhc1NlcnZpY2UoXCJhcHAtbGlicmFyeVwiKSAmJiBmYWxzZSxcbiAgICAgIGhyZWY6ICgpID0+IFwiL3Byb2plY3QvY3JlYXRlXCJcbiAgICB9KTtcbiovXG5cbiAgICBwcmVmZXJlbmNlc1JlZ2lzdHJ5LmFkZFRhYignQWJvdXQgJyArIHZlcnNpb24ubmFtZSwgVXJsSGVscGVycy5qb2luKHRlbXBsYXRlUGF0aCwgJ2Fib3V0Lmh0bWwnKSk7XG5cbiAgICBsb2cuaW5mbyhcInN0YXJ0ZWQsIHZlcnNpb246IFwiLCB2ZXJzaW9uLnZlcnNpb24pO1xuICAgIGxvZy5pbmZvKFwiY29tbWl0IElEOiBcIiwgdmVyc2lvbi5jb21taXRJZCk7XG4gIH0pO1xuXG4gIGhhd3Rpb1BsdWdpbkxvYWRlci5yZWdpc3RlclByZUJvb3RzdHJhcFRhc2soKG5leHQpID0+IHtcbiAgICAkLmFqYXgoe1xuICAgICAgdXJsOiAndmVyc2lvbi5qc29uP3Jldj0nICsgRGF0ZS5ub3coKSwgXG4gICAgICBzdWNjZXNzOiAoZGF0YSkgPT4ge1xuICAgICAgICB0cnkge1xuICAgICAgICAgIHZlcnNpb24gPSBhbmd1bGFyLmZyb21Kc29uKGRhdGEpO1xuICAgICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgICB2ZXJzaW9uID0ge1xuICAgICAgICAgICAgbmFtZTogJ2ZhYnJpYzgtY29uc29sZScsXG4gICAgICAgICAgICB2ZXJzaW9uOiAnJ1xuICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgbmV4dCgpO1xuICAgICAgfSxcbiAgICAgIGVycm9yOiAoanFYSFIsIHRleHQsIHN0YXR1cykgPT4ge1xuICAgICAgICBsb2cuZGVidWcoXCJGYWlsZWQgdG8gZmV0Y2ggdmVyc2lvbjoganFYSFI6IFwiLCBqcVhIUiwgXCIgdGV4dDogXCIsIHRleHQsIFwiIHN0YXR1czogXCIsIHN0YXR1cyk7XG4gICAgICAgIG5leHQoKTtcbiAgICAgIH0sXG4gICAgICBkYXRhVHlwZTogXCJodG1sXCJcbiAgICB9KTtcbiAgfSk7XG5cbiAgaGF3dGlvUGx1Z2luTG9hZGVyLmFkZE1vZHVsZShwbHVnaW5OYW1lKTtcbn1cbiIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJtYWluR2xvYmFscy50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJtYWluUGx1Z2luLnRzXCIvPlxuXG5tb2R1bGUgTWFpbiB7XG4gIF9tb2R1bGUuY29udHJvbGxlcignTWFpbi5BYm91dCcsICgkc2NvcGUpID0+IHtcbiAgICAkc2NvcGUuaW5mbyA9IHZlcnNpb247XG4gIH0pO1xufVxuXG4iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vaW5jbHVkZXMudHNcIi8+XG5cblxuLyoqXG4gKiBAbW9kdWxlIFdpa2lcbiAqL1xubW9kdWxlIFdpa2kge1xuXG4gIGV4cG9ydCB2YXIgbG9nOkxvZ2dpbmcuTG9nZ2VyID0gTG9nZ2VyLmdldChcIldpa2lcIik7XG5cbiAgZXhwb3J0IHZhciBjYW1lbE5hbWVzcGFjZXMgPSBbXCJodHRwOi8vY2FtZWwuYXBhY2hlLm9yZy9zY2hlbWEvc3ByaW5nXCIsIFwiaHR0cDovL2NhbWVsLmFwYWNoZS5vcmcvc2NoZW1hL2JsdWVwcmludFwiXTtcbiAgZXhwb3J0IHZhciBzcHJpbmdOYW1lc3BhY2VzID0gW1wiaHR0cDovL3d3dy5zcHJpbmdmcmFtZXdvcmsub3JnL3NjaGVtYS9iZWFuc1wiXTtcbiAgZXhwb3J0IHZhciBkcm9vbHNOYW1lc3BhY2VzID0gW1wiaHR0cDovL2Ryb29scy5vcmcvc2NoZW1hL2Ryb29scy1zcHJpbmdcIl07XG4gIGV4cG9ydCB2YXIgZG96ZXJOYW1lc3BhY2VzID0gW1wiaHR0cDovL2RvemVyLnNvdXJjZWZvcmdlLm5ldFwiXTtcbiAgZXhwb3J0IHZhciBhY3RpdmVtcU5hbWVzcGFjZXMgPSBbXCJodHRwOi8vYWN0aXZlbXEuYXBhY2hlLm9yZy9zY2hlbWEvY29yZVwiXTtcblxuICBleHBvcnQgdmFyIHVzZUNhbWVsQ2FudmFzQnlEZWZhdWx0ID0gZmFsc2U7XG5cbiAgZXhwb3J0IHZhciBleGNsdWRlQWRqdXN0bWVudFByZWZpeGVzID0gW1wiaHR0cDovL1wiLCBcImh0dHBzOi8vXCIsIFwiI1wiXTtcblxuICBleHBvcnQgZW51bSBWaWV3TW9kZSB7IExpc3QsIEljb24gfTtcblxuICAvKipcbiAgICogVGhlIGN1c3RvbSB2aWV3cyB3aXRoaW4gdGhlIHdpa2kgbmFtZXNwYWNlOyBlaXRoZXIgXCIvd2lraS8kZm9vXCIgb3IgXCIvd2lraS9icmFuY2gvJGJyYW5jaC8kZm9vXCJcbiAgICovXG4gIGV4cG9ydCB2YXIgY3VzdG9tV2lraVZpZXdQYWdlcyA9IFtcIi9mb3JtVGFibGVcIiwgXCIvY2FtZWwvZGlhZ3JhbVwiLCBcIi9jYW1lbC9jYW52YXNcIiwgXCIvY2FtZWwvcHJvcGVydGllc1wiLCBcIi9kb3plci9tYXBwaW5nc1wiXTtcblxuICAvKipcbiAgICogV2hpY2ggZXh0ZW5zaW9ucyBkbyB3ZSB3aXNoIHRvIGhpZGUgaW4gdGhlIHdpa2kgZmlsZSBsaXN0aW5nXG4gICAqIEBwcm9wZXJ0eSBoaWRlRXh0ZW5zaW9uc1xuICAgKiBAZm9yIFdpa2lcbiAgICogQHR5cGUgQXJyYXlcbiAgICovXG4gIGV4cG9ydCB2YXIgaGlkZUV4dGVuc2lvbnMgPSBbXCIucHJvZmlsZVwiXTtcblxuICB2YXIgZGVmYXVsdEZpbGVOYW1lUGF0dGVybiA9IC9eW2EtekEtWjAtOS5fLV0qJC87XG4gIHZhciBkZWZhdWx0RmlsZU5hbWVQYXR0ZXJuSW52YWxpZCA9IFwiTmFtZSBtdXN0IGJlOiBsZXR0ZXJzLCBudW1iZXJzLCBhbmQgLiBfIG9yIC0gY2hhcmFjdGVyc1wiO1xuXG4gIHZhciBkZWZhdWx0RmlsZU5hbWVFeHRlbnNpb25QYXR0ZXJuID0gXCJcIjtcblxuICB2YXIgZGVmYXVsdExvd2VyQ2FzZUZpbGVOYW1lUGF0dGVybiA9IC9eW2EtejAtOS5fLV0qJC87XG4gIHZhciBkZWZhdWx0TG93ZXJDYXNlRmlsZU5hbWVQYXR0ZXJuSW52YWxpZCA9IFwiTmFtZSBtdXN0IGJlOiBsb3dlci1jYXNlIGxldHRlcnMsIG51bWJlcnMsIGFuZCAuIF8gb3IgLSBjaGFyYWN0ZXJzXCI7XG5cbiAgZXhwb3J0IGludGVyZmFjZSBHZW5lcmF0ZU9wdGlvbnMge1xuICAgIHdvcmtzcGFjZTogYW55O1xuICAgIGZvcm06IGFueTtcbiAgICBuYW1lOiBzdHJpbmc7XG4gICAgYnJhbmNoOiBzdHJpbmc7XG4gICAgcGFyZW50SWQ6IHN0cmluZztcbiAgICBzdWNjZXNzOiAoZmlsZUNvbnRlbnRzPzpzdHJpbmcpID0+IHZvaWQ7XG4gICAgZXJyb3I6IChlcnJvcjphbnkpID0+IHZvaWQ7XG4gIH1cblxuICAvKipcbiAgICogVGhlIHdpemFyZCB0cmVlIGZvciBjcmVhdGluZyBuZXcgY29udGVudCBpbiB0aGUgd2lraVxuICAgKiBAcHJvcGVydHkgZG9jdW1lbnRUZW1wbGF0ZXNcbiAgICogQGZvciBXaWtpXG4gICAqIEB0eXBlIEFycmF5XG4gICAqL1xuICBleHBvcnQgdmFyIGRvY3VtZW50VGVtcGxhdGVzID0gW1xuICAgIHtcbiAgICAgIGxhYmVsOiBcIkZvbGRlclwiLFxuICAgICAgdG9vbHRpcDogXCJDcmVhdGUgYSBuZXcgZm9sZGVyIHRvIGNvbnRhaW4gZG9jdW1lbnRzXCIsXG4gICAgICBmb2xkZXI6IHRydWUsXG4gICAgICBpY29uOiBcIi9pbWcvaWNvbnMvd2lraS9mb2xkZXIuZ2lmXCIsXG4gICAgICBleGVtcGxhcjogXCJteWZvbGRlclwiLFxuICAgICAgcmVnZXg6IGRlZmF1bHRMb3dlckNhc2VGaWxlTmFtZVBhdHRlcm4sXG4gICAgICBpbnZhbGlkOiBkZWZhdWx0TG93ZXJDYXNlRmlsZU5hbWVQYXR0ZXJuSW52YWxpZFxuICAgIH0sXG4gICAgLypcbiAgICB7XG4gICAgICBsYWJlbDogXCJBcHBcIixcbiAgICAgIHRvb2x0aXA6IFwiQ3JlYXRlcyBhIG5ldyBBcHAgZm9sZGVyIHVzZWQgdG8gY29uZmlndXJlIGFuZCBydW4gY29udGFpbmVyc1wiLFxuICAgICAgYWRkQ2xhc3M6IFwiZmEgZmEtY29nIGdyZWVuXCIsXG4gICAgICBleGVtcGxhcjogJ215YXBwJyxcbiAgICAgIHJlZ2V4OiBkZWZhdWx0RmlsZU5hbWVQYXR0ZXJuLFxuICAgICAgaW52YWxpZDogZGVmYXVsdEZpbGVOYW1lUGF0dGVybkludmFsaWQsXG4gICAgICBleHRlbnNpb246ICcnLFxuICAgICAgZ2VuZXJhdGVkOiB7XG4gICAgICAgIG1iZWFuOiBbJ2lvLmZhYnJpYzgnLCB7IHR5cGU6ICdLdWJlcm5ldGVzVGVtcGxhdGVNYW5hZ2VyJyB9XSxcbiAgICAgICAgaW5pdDogKHdvcmtzcGFjZSwgJHNjb3BlKSA9PiB7XG5cbiAgICAgICAgfSxcbiAgICAgICAgZ2VuZXJhdGU6IChvcHRpb25zOkdlbmVyYXRlT3B0aW9ucykgPT4ge1xuICAgICAgICAgIGxvZy5kZWJ1ZyhcIkdvdCBvcHRpb25zOiBcIiwgb3B0aW9ucyk7XG4gICAgICAgICAgb3B0aW9ucy5mb3JtLm5hbWUgPSBvcHRpb25zLm5hbWU7XG4gICAgICAgICAgb3B0aW9ucy5mb3JtLnBhdGggPSBvcHRpb25zLnBhcmVudElkO1xuICAgICAgICAgIG9wdGlvbnMuZm9ybS5icmFuY2ggPSBvcHRpb25zLmJyYW5jaDtcbiAgICAgICAgICB2YXIganNvbiA9IGFuZ3VsYXIudG9Kc29uKG9wdGlvbnMuZm9ybSk7XG4gICAgICAgICAgdmFyIGpvbG9raWEgPSA8Sm9sb2tpYS5JSm9sb2tpYT4gSGF3dGlvQ29yZS5pbmplY3Rvci5nZXQoXCJqb2xva2lhXCIpO1xuICAgICAgICAgIGpvbG9raWEucmVxdWVzdCh7XG4gICAgICAgICAgICB0eXBlOiAnZXhlYycsXG4gICAgICAgICAgICBtYmVhbjogJ2lvLmZhYnJpYzg6dHlwZT1LdWJlcm5ldGVzVGVtcGxhdGVNYW5hZ2VyJyxcbiAgICAgICAgICAgIG9wZXJhdGlvbjogJ2NyZWF0ZUFwcEJ5SnNvbicsXG4gICAgICAgICAgICBhcmd1bWVudHM6IFtqc29uXVxuICAgICAgICAgIH0sIENvcmUub25TdWNjZXNzKChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgbG9nLmRlYnVnKFwiR2VuZXJhdGVkIGFwcCwgcmVzcG9uc2U6IFwiLCByZXNwb25zZSk7XG4gICAgICAgICAgICBvcHRpb25zLnN1Y2Nlc3ModW5kZWZpbmVkKTsgXG4gICAgICAgICAgfSwge1xuICAgICAgICAgICAgZXJyb3I6IChyZXNwb25zZSkgPT4geyBvcHRpb25zLmVycm9yKHJlc3BvbnNlLmVycm9yKTsgfVxuICAgICAgICAgIH0pKTtcbiAgICAgICAgfSxcbiAgICAgICAgZm9ybTogKHdvcmtzcGFjZSwgJHNjb3BlKSA9PiB7XG4gICAgICAgICAgLy8gVE9ETyBkb2NrZXIgcmVnaXN0cnkgY29tcGxldGlvblxuICAgICAgICAgIGlmICghJHNjb3BlLmRvRG9ja2VyUmVnaXN0cnlDb21wbGV0aW9uKSB7XG4gICAgICAgICAgICAkc2NvcGUuZmV0Y2hEb2NrZXJSZXBvc2l0b3JpZXMgPSAoKSA9PiB7XG4gICAgICAgICAgICAgIHJldHVybiBEb2NrZXJSZWdpc3RyeS5jb21wbGV0ZURvY2tlclJlZ2lzdHJ5KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBzdW1tYXJ5TWFya2Rvd246ICdBZGQgYXBwIHN1bW1hcnkgaGVyZScsXG4gICAgICAgICAgICByZXBsaWNhQ291bnQ6IDFcbiAgICAgICAgICB9O1xuICAgICAgICB9LFxuICAgICAgICBzY2hlbWE6IHtcbiAgICAgICAgICBkZXNjcmlwdGlvbjogJ0FwcCBzZXR0aW5ncycsXG4gICAgICAgICAgdHlwZTogJ2phdmEubGFuZy5TdHJpbmcnLFxuICAgICAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgICAgICdkb2NrZXJJbWFnZSc6IHtcbiAgICAgICAgICAgICAgJ2Rlc2NyaXB0aW9uJzogJ0RvY2tlciBJbWFnZScsXG4gICAgICAgICAgICAgICd0eXBlJzogJ2phdmEubGFuZy5TdHJpbmcnLFxuICAgICAgICAgICAgICAnaW5wdXQtYXR0cmlidXRlcyc6IHsgXG4gICAgICAgICAgICAgICAgJ3JlcXVpcmVkJzogJycsIFxuICAgICAgICAgICAgICAgICdjbGFzcyc6ICdpbnB1dC14bGFyZ2UnLFxuICAgICAgICAgICAgICAgICd0eXBlYWhlYWQnOiAncmVwbyBmb3IgcmVwbyBpbiBmZXRjaERvY2tlclJlcG9zaXRvcmllcygpIHwgZmlsdGVyOiR2aWV3VmFsdWUnLFxuICAgICAgICAgICAgICAgICd0eXBlYWhlYWQtd2FpdC1tcyc6ICcyMDAnXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAnc3VtbWFyeU1hcmtkb3duJzoge1xuICAgICAgICAgICAgICAnZGVzY3JpcHRpb24nOiAnU2hvcnQgRGVzY3JpcHRpb24nLFxuICAgICAgICAgICAgICAndHlwZSc6ICdqYXZhLmxhbmcuU3RyaW5nJyxcbiAgICAgICAgICAgICAgJ2lucHV0LWF0dHJpYnV0ZXMnOiB7ICdjbGFzcyc6ICdpbnB1dC14bGFyZ2UnIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAncmVwbGljYUNvdW50Jzoge1xuICAgICAgICAgICAgICAnZGVzY3JpcHRpb24nOiAnUmVwbGljYSBDb3VudCcsXG4gICAgICAgICAgICAgICd0eXBlJzogJ2phdmEubGFuZy5JbnRlZ2VyJyxcbiAgICAgICAgICAgICAgJ2lucHV0LWF0dHJpYnV0ZXMnOiB7XG4gICAgICAgICAgICAgICAgbWluOiAnMCdcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICdsYWJlbHMnOiB7XG4gICAgICAgICAgICAgICdkZXNjcmlwdGlvbic6ICdMYWJlbHMnLFxuICAgICAgICAgICAgICAndHlwZSc6ICdtYXAnLFxuICAgICAgICAgICAgICAnaXRlbXMnOiB7XG4gICAgICAgICAgICAgICAgJ3R5cGUnOiAnc3RyaW5nJ1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSxcbiAgICB7XG4gICAgICBsYWJlbDogXCJGYWJyaWM4IFByb2ZpbGVcIixcbiAgICAgIHRvb2x0aXA6IFwiQ3JlYXRlIGEgbmV3IGVtcHR5IGZhYnJpYyBwcm9maWxlLiBVc2luZyBhIGh5cGhlbiAoJy0nKSB3aWxsIGNyZWF0ZSBhIGZvbGRlciBoZWlyYXJjaHksIGZvciBleGFtcGxlICdteS1hd2Vzb21lLXByb2ZpbGUnIHdpbGwgYmUgYXZhaWxhYmxlIHZpYSB0aGUgcGF0aCAnbXkvYXdlc29tZS9wcm9maWxlJy5cIixcbiAgICAgIHByb2ZpbGU6IHRydWUsXG4gICAgICBhZGRDbGFzczogXCJmYSBmYS1ib29rIGdyZWVuXCIsXG4gICAgICBleGVtcGxhcjogXCJ1c2VyLXByb2ZpbGVcIixcbiAgICAgIHJlZ2V4OiBkZWZhdWx0TG93ZXJDYXNlRmlsZU5hbWVQYXR0ZXJuLFxuICAgICAgaW52YWxpZDogZGVmYXVsdExvd2VyQ2FzZUZpbGVOYW1lUGF0dGVybkludmFsaWQsXG4gICAgICBmYWJyaWNPbmx5OiB0cnVlXG4gICAgfSxcbiAgICAqL1xuICAgIHtcbiAgICAgIGxhYmVsOiBcIlByb3BlcnRpZXMgRmlsZVwiLFxuICAgICAgdG9vbHRpcDogXCJBIHByb3BlcnRpZXMgZmlsZSB0eXBpY2FsbHkgdXNlZCB0byBjb25maWd1cmUgSmF2YSBjbGFzc2VzXCIsXG4gICAgICBleGVtcGxhcjogXCJwcm9wZXJ0aWVzLWZpbGUucHJvcGVydGllc1wiLFxuICAgICAgcmVnZXg6IGRlZmF1bHRGaWxlTmFtZVBhdHRlcm4sXG4gICAgICBpbnZhbGlkOiBkZWZhdWx0RmlsZU5hbWVQYXR0ZXJuSW52YWxpZCxcbiAgICAgIGV4dGVuc2lvbjogXCIucHJvcGVydGllc1wiXG4gICAgfSxcbiAgICB7XG4gICAgICBsYWJlbDogXCJKU09OIEZpbGVcIixcbiAgICAgIHRvb2x0aXA6IFwiQSBmaWxlIGNvbnRhaW5pbmcgSlNPTiBkYXRhXCIsXG4gICAgICBleGVtcGxhcjogXCJkb2N1bWVudC5qc29uXCIsXG4gICAgICByZWdleDogZGVmYXVsdEZpbGVOYW1lUGF0dGVybixcbiAgICAgIGludmFsaWQ6IGRlZmF1bHRGaWxlTmFtZVBhdHRlcm5JbnZhbGlkLFxuICAgICAgZXh0ZW5zaW9uOiBcIi5qc29uXCJcbiAgICB9LFxuICAgIC8qXG4gICAge1xuICAgICAgbGFiZWw6IFwiS2V5IFN0b3JlIEZpbGVcIixcbiAgICAgIHRvb2x0aXA6IFwiQ3JlYXRlcyBhIGtleXN0b3JlIChkYXRhYmFzZSkgb2YgY3J5cHRvZ3JhcGhpYyBrZXlzLCBYLjUwOSBjZXJ0aWZpY2F0ZSBjaGFpbnMsIGFuZCB0cnVzdGVkIGNlcnRpZmljYXRlcy5cIixcbiAgICAgIGV4ZW1wbGFyOiAna2V5c3RvcmUuamtzJyxcbiAgICAgIHJlZ2V4OiBkZWZhdWx0RmlsZU5hbWVQYXR0ZXJuLFxuICAgICAgaW52YWxpZDogZGVmYXVsdEZpbGVOYW1lUGF0dGVybkludmFsaWQsXG4gICAgICBleHRlbnNpb246IFwiLmprc1wiLFxuICAgICAgZ2VuZXJhdGVkOiB7XG4gICAgICAgIG1iZWFuOiBbJ2hhd3RpbycsIHsgdHlwZTogJ0tleXN0b3JlU2VydmljZScgfV0sXG4gICAgICAgIGluaXQ6IGZ1bmN0aW9uKHdvcmtzcGFjZSwgJHNjb3BlKSB7XG4gICAgICAgICAgdmFyIG1iZWFuID0gJ2hhd3Rpbzp0eXBlPUtleXN0b3JlU2VydmljZSc7XG4gICAgICAgICAgdmFyIHJlc3BvbnNlID0gd29ya3NwYWNlLmpvbG9raWEucmVxdWVzdCgge3R5cGU6IFwicmVhZFwiLCBtYmVhbjogbWJlYW4sIGF0dHJpYnV0ZTogXCJTZWN1cml0eVByb3ZpZGVySW5mb1wiIH0sIHtcbiAgICAgICAgICAgIHN1Y2Nlc3M6IChyZXNwb25zZSk9PntcbiAgICAgICAgICAgICAgJHNjb3BlLnNlY3VyaXR5UHJvdmlkZXJJbmZvID0gcmVzcG9uc2UudmFsdWU7XG4gICAgICAgICAgICAgIENvcmUuJGFwcGx5KCRzY29wZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZXJyb3I6IChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICBjb25zb2xlLmxvZygnQ291bGQgbm90IGZpbmQgdGhlIHN1cHBvcnRlZCBzZWN1cml0eSBhbGdvcml0aG1zOiAnLCByZXNwb25zZS5lcnJvcik7XG4gICAgICAgICAgICAgIENvcmUuJGFwcGx5KCRzY29wZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0sXG4gICAgICAgIGdlbmVyYXRlOiBmdW5jdGlvbihvcHRpb25zOkdlbmVyYXRlT3B0aW9ucykge1xuICAgICAgICAgIHZhciBlbmNvZGVkRm9ybSA9IEpTT04uc3RyaW5naWZ5KG9wdGlvbnMuZm9ybSlcbiAgICAgICAgICB2YXIgbWJlYW4gPSAnaGF3dGlvOnR5cGU9S2V5c3RvcmVTZXJ2aWNlJztcbiAgICAgICAgICB2YXIgcmVzcG9uc2UgPSBvcHRpb25zLndvcmtzcGFjZS5qb2xva2lhLnJlcXVlc3QoIHtcbiAgICAgICAgICAgICAgdHlwZTogJ2V4ZWMnLCBcbiAgICAgICAgICAgICAgbWJlYW46IG1iZWFuLFxuICAgICAgICAgICAgICBvcGVyYXRpb246ICdjcmVhdGVLZXlTdG9yZVZpYUpTT04oamF2YS5sYW5nLlN0cmluZyknLFxuICAgICAgICAgICAgICBhcmd1bWVudHM6IFtlbmNvZGVkRm9ybV1cbiAgICAgICAgICAgIH0sIHtcbiAgICAgICAgICAgICAgbWV0aG9kOidQT1NUJyxcbiAgICAgICAgICAgICAgc3VjY2VzczpmdW5jdGlvbihyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIG9wdGlvbnMuc3VjY2VzcyhyZXNwb25zZS52YWx1ZSlcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgZXJyb3I6ZnVuY3Rpb24ocmVzcG9uc2Upe1xuICAgICAgICAgICAgICAgIG9wdGlvbnMuZXJyb3IocmVzcG9uc2UuZXJyb3IpXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LFxuICAgICAgICBmb3JtOiBmdW5jdGlvbih3b3Jrc3BhY2UsICRzY29wZSl7IFxuICAgICAgICAgIHJldHVybiB7IFxuICAgICAgICAgICAgc3RvcmVUeXBlOiAkc2NvcGUuc2VjdXJpdHlQcm92aWRlckluZm8uc3VwcG9ydGVkS2V5U3RvcmVUeXBlc1swXSxcbiAgICAgICAgICAgIGNyZWF0ZVByaXZhdGVLZXk6IGZhbHNlLFxuICAgICAgICAgICAga2V5TGVuZ3RoOiA0MDk2LFxuICAgICAgICAgICAga2V5QWxnb3JpdGhtOiAkc2NvcGUuc2VjdXJpdHlQcm92aWRlckluZm8uc3VwcG9ydGVkS2V5QWxnb3JpdGhtc1swXSxcbiAgICAgICAgICAgIGtleVZhbGlkaXR5OiAzNjVcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIHNjaGVtYToge1xuICAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiS2V5c3RvcmUgU2V0dGluZ3NcIixcbiAgICAgICAgICAgXCJ0eXBlXCI6IFwiamF2YS5sYW5nLlN0cmluZ1wiLFxuICAgICAgICAgICBcInByb3BlcnRpZXNcIjogeyBcbiAgICAgICAgICAgICBcInN0b3JlUGFzc3dvcmRcIjoge1xuICAgICAgICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIktleXN0b3JlIHBhc3N3b3JkLlwiLFxuICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwicGFzc3dvcmRcIixcbiAgICAgICAgICAgICAgICdpbnB1dC1hdHRyaWJ1dGVzJzogeyBcInJlcXVpcmVkXCI6ICBcIlwiLCAgXCJuZy1taW5sZW5ndGhcIjo2IH1cbiAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgIFwic3RvcmVUeXBlXCI6IHtcbiAgICAgICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgdHlwZSBvZiBzdG9yZSB0byBjcmVhdGVcIixcbiAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImphdmEubGFuZy5TdHJpbmdcIixcbiAgICAgICAgICAgICAgICdpbnB1dC1lbGVtZW50JzogXCJzZWxlY3RcIixcbiAgICAgICAgICAgICAgICdpbnB1dC1hdHRyaWJ1dGVzJzogeyBcIm5nLW9wdGlvbnNcIjogIFwidiBmb3IgdiBpbiBzZWN1cml0eVByb3ZpZGVySW5mby5zdXBwb3J0ZWRLZXlTdG9yZVR5cGVzXCIgfVxuICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgXCJjcmVhdGVQcml2YXRlS2V5XCI6IHtcbiAgICAgICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJTaG91bGQgd2UgZ2VuZXJhdGUgYSBzZWxmLXNpZ25lZCBwcml2YXRlIGtleT9cIixcbiAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImJvb2xlYW5cIlxuICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgXCJrZXlDb21tb25OYW1lXCI6IHtcbiAgICAgICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgY29tbW9uIG5hbWUgb2YgdGhlIGtleSwgdHlwaWNhbGx5IHNldCB0byB0aGUgaG9zdG5hbWUgb2YgdGhlIHNlcnZlclwiLFxuICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwiamF2YS5sYW5nLlN0cmluZ1wiLFxuICAgICAgICAgICAgICAgJ2NvbnRyb2wtZ3JvdXAtYXR0cmlidXRlcyc6IHsgJ25nLXNob3cnOiBcImZvcm1EYXRhLmNyZWF0ZVByaXZhdGVLZXlcIiB9XG4gICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICBcImtleUxlbmd0aFwiOiB7XG4gICAgICAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIGxlbmd0aCBvZiB0aGUgY3J5cHRvZ3JhcGhpYyBrZXlcIixcbiAgICAgICAgICAgICAgIFwidHlwZVwiOiBcIkxvbmdcIixcbiAgICAgICAgICAgICAgICdjb250cm9sLWdyb3VwLWF0dHJpYnV0ZXMnOiB7ICduZy1zaG93JzogXCJmb3JtRGF0YS5jcmVhdGVQcml2YXRlS2V5XCIgfVxuICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgXCJrZXlBbGdvcml0aG1cIjoge1xuICAgICAgICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBrZXkgYWxnb3JpdGhtXCIsXG4gICAgICAgICAgICAgICBcInR5cGVcIjogXCJqYXZhLmxhbmcuU3RyaW5nXCIsXG4gICAgICAgICAgICAgICAnaW5wdXQtZWxlbWVudCc6IFwic2VsZWN0XCIsXG4gICAgICAgICAgICAgICAnaW5wdXQtYXR0cmlidXRlcyc6IHsgXCJuZy1vcHRpb25zXCI6ICBcInYgZm9yIHYgaW4gc2VjdXJpdHlQcm92aWRlckluZm8uc3VwcG9ydGVkS2V5QWxnb3JpdGhtc1wiIH0sXG4gICAgICAgICAgICAgICAnY29udHJvbC1ncm91cC1hdHRyaWJ1dGVzJzogeyAnbmctc2hvdyc6IFwiZm9ybURhdGEuY3JlYXRlUHJpdmF0ZUtleVwiIH1cbiAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgIFwia2V5VmFsaWRpdHlcIjoge1xuICAgICAgICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBudW1iZXIgb2YgZGF5cyB0aGUga2V5IHdpbGwgYmUgdmFsaWQgZm9yXCIsXG4gICAgICAgICAgICAgICBcInR5cGVcIjogXCJMb25nXCIsXG4gICAgICAgICAgICAgICAnY29udHJvbC1ncm91cC1hdHRyaWJ1dGVzJzogeyAnbmctc2hvdyc6IFwiZm9ybURhdGEuY3JlYXRlUHJpdmF0ZUtleVwiIH1cbiAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgIFwia2V5UGFzc3dvcmRcIjoge1xuICAgICAgICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlBhc3N3b3JkIHRvIHRoZSBwcml2YXRlIGtleVwiLFxuICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwicGFzc3dvcmRcIixcbiAgICAgICAgICAgICAgICdjb250cm9sLWdyb3VwLWF0dHJpYnV0ZXMnOiB7ICduZy1zaG93JzogXCJmb3JtRGF0YS5jcmVhdGVQcml2YXRlS2V5XCIgfVxuICAgICAgICAgICAgIH1cbiAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSxcbiAgICAqL1xuICAgIHtcbiAgICAgIGxhYmVsOiBcIk1hcmtkb3duIERvY3VtZW50XCIsXG4gICAgICB0b29sdGlwOiBcIkEgYmFzaWMgbWFya3VwIGRvY3VtZW50IHVzaW5nIHRoZSBNYXJrZG93biB3aWtpIG1hcmt1cCwgcGFydGljdWxhcmx5IHVzZWZ1bCBmb3IgUmVhZE1lIGZpbGVzIGluIGRpcmVjdG9yaWVzXCIsXG4gICAgICBleGVtcGxhcjogXCJSZWFkTWUubWRcIixcbiAgICAgIHJlZ2V4OiBkZWZhdWx0RmlsZU5hbWVQYXR0ZXJuLFxuICAgICAgaW52YWxpZDogZGVmYXVsdEZpbGVOYW1lUGF0dGVybkludmFsaWQsXG4gICAgICBleHRlbnNpb246IFwiLm1kXCJcbiAgICB9LFxuICAgIHtcbiAgICAgIGxhYmVsOiBcIlRleHQgRG9jdW1lbnRcIixcbiAgICAgIHRvb2x0aXA6IFwiQSBwbGFpbiB0ZXh0IGZpbGVcIixcbiAgICAgIGV4ZW1wbGFyOiBcImRvY3VtZW50LnRleHRcIixcbiAgICAgIHJlZ2V4OiBkZWZhdWx0RmlsZU5hbWVQYXR0ZXJuLFxuICAgICAgaW52YWxpZDogZGVmYXVsdEZpbGVOYW1lUGF0dGVybkludmFsaWQsXG4gICAgICBleHRlbnNpb246IFwiLnR4dFwiXG4gICAgfSxcbiAgICB7XG4gICAgICBsYWJlbDogXCJIVE1MIERvY3VtZW50XCIsXG4gICAgICB0b29sdGlwOiBcIkEgSFRNTCBkb2N1bWVudCB5b3UgY2FuIGVkaXQgZGlyZWN0bHkgdXNpbmcgdGhlIEhUTUwgbWFya3VwXCIsXG4gICAgICBleGVtcGxhcjogXCJkb2N1bWVudC5odG1sXCIsXG4gICAgICByZWdleDogZGVmYXVsdEZpbGVOYW1lUGF0dGVybixcbiAgICAgIGludmFsaWQ6IGRlZmF1bHRGaWxlTmFtZVBhdHRlcm5JbnZhbGlkLFxuICAgICAgZXh0ZW5zaW9uOiBcIi5odG1sXCJcbiAgICB9LFxuICAgIHtcbiAgICAgIGxhYmVsOiBcIlhNTCBEb2N1bWVudFwiLFxuICAgICAgdG9vbHRpcDogXCJBbiBlbXB0eSBYTUwgZG9jdW1lbnRcIixcbiAgICAgIGV4ZW1wbGFyOiBcImRvY3VtZW50LnhtbFwiLFxuICAgICAgcmVnZXg6IGRlZmF1bHRGaWxlTmFtZVBhdHRlcm4sXG4gICAgICBpbnZhbGlkOiBkZWZhdWx0RmlsZU5hbWVQYXR0ZXJuSW52YWxpZCxcbiAgICAgIGV4dGVuc2lvbjogXCIueG1sXCJcbiAgICB9LFxuICAgIHtcbiAgICAgIGxhYmVsOiBcIkludGVncmF0aW9uIEZsb3dzXCIsXG4gICAgICB0b29sdGlwOiBcIkNhbWVsIHJvdXRlcyBmb3IgZGVmaW5pbmcgeW91ciBpbnRlZ3JhdGlvbiBmbG93c1wiLFxuICAgICAgY2hpbGRyZW46IFtcbiAgICAgICAge1xuICAgICAgICAgIGxhYmVsOiBcIkNhbWVsIFhNTCBkb2N1bWVudFwiLFxuICAgICAgICAgIHRvb2x0aXA6IFwiQSB2YW5pbGxhIENhbWVsIFhNTCBkb2N1bWVudCBmb3IgaW50ZWdyYXRpb24gZmxvd3NcIixcbiAgICAgICAgICBpY29uOiBcIi9pbWcvaWNvbnMvY2FtZWwuc3ZnXCIsXG4gICAgICAgICAgZXhlbXBsYXI6IFwiY2FtZWwueG1sXCIsXG4gICAgICAgICAgcmVnZXg6IGRlZmF1bHRGaWxlTmFtZVBhdHRlcm4sXG4gICAgICAgICAgaW52YWxpZDogZGVmYXVsdEZpbGVOYW1lUGF0dGVybkludmFsaWQsXG4gICAgICAgICAgZXh0ZW5zaW9uOiBcIi54bWxcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgbGFiZWw6IFwiQ2FtZWwgT1NHaSBCbHVlcHJpbnQgWE1MIGRvY3VtZW50XCIsXG4gICAgICAgICAgdG9vbHRpcDogXCJBIHZhbmlsbGEgQ2FtZWwgWE1MIGRvY3VtZW50IGZvciBpbnRlZ3JhdGlvbiBmbG93cyB3aGVuIHVzaW5nIE9TR2kgQmx1ZXByaW50XCIsXG4gICAgICAgICAgaWNvbjogXCIvaW1nL2ljb25zL2NhbWVsLnN2Z1wiLFxuICAgICAgICAgIGV4ZW1wbGFyOiBcImNhbWVsLWJsdWVwcmludC54bWxcIixcbiAgICAgICAgICByZWdleDogZGVmYXVsdEZpbGVOYW1lUGF0dGVybixcbiAgICAgICAgICBpbnZhbGlkOiBkZWZhdWx0RmlsZU5hbWVQYXR0ZXJuSW52YWxpZCxcbiAgICAgICAgICBleHRlbnNpb246IFwiLnhtbFwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICBsYWJlbDogXCJDYW1lbCBTcHJpbmcgWE1MIGRvY3VtZW50XCIsXG4gICAgICAgICAgdG9vbHRpcDogXCJBIHZhbmlsbGEgQ2FtZWwgWE1MIGRvY3VtZW50IGZvciBpbnRlZ3JhdGlvbiBmbG93cyB3aGVuIHVzaW5nIHRoZSBTcHJpbmcgZnJhbWV3b3JrXCIsXG4gICAgICAgICAgaWNvbjogXCIvaW1nL2ljb25zL2NhbWVsLnN2Z1wiLFxuICAgICAgICAgIGV4ZW1wbGFyOiBcImNhbWVsLXNwcmluZy54bWxcIixcbiAgICAgICAgICByZWdleDogZGVmYXVsdEZpbGVOYW1lUGF0dGVybixcbiAgICAgICAgICBpbnZhbGlkOiBkZWZhdWx0RmlsZU5hbWVQYXR0ZXJuSW52YWxpZCxcbiAgICAgICAgICBleHRlbnNpb246IFwiLnhtbFwiXG4gICAgICAgIH1cbiAgICAgIF1cbiAgICB9LFxuICAgIHtcbiAgICAgIGxhYmVsOiBcIkRhdGEgTWFwcGluZyBEb2N1bWVudFwiLFxuICAgICAgdG9vbHRpcDogXCJEb3plciBiYXNlZCBjb25maWd1cmF0aW9uIG9mIG1hcHBpbmcgZG9jdW1lbnRzXCIsXG4gICAgICBpY29uOiBcIi9pbWcvaWNvbnMvZG96ZXIvZG96ZXIuZ2lmXCIsXG4gICAgICBleGVtcGxhcjogXCJkb3plci1tYXBwaW5nLnhtbFwiLFxuICAgICAgcmVnZXg6IGRlZmF1bHRGaWxlTmFtZVBhdHRlcm4sXG4gICAgICBpbnZhbGlkOiBkZWZhdWx0RmlsZU5hbWVQYXR0ZXJuSW52YWxpZCxcbiAgICAgIGV4dGVuc2lvbjogXCIueG1sXCJcbiAgICB9XG4gIF07XG5cbiAgLy8gVE9ETyBSRU1PVkVcbiAgZXhwb3J0IGZ1bmN0aW9uIGlzRk1DQ29udGFpbmVyKHdvcmtzcGFjZSkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIC8vIFRPRE8gUkVNT1ZFXG4gIGV4cG9ydCBmdW5jdGlvbiBpc1dpa2lFbmFibGVkKHdvcmtzcGFjZSwgam9sb2tpYSwgbG9jYWxTdG9yYWdlKSB7XG4gICAgcmV0dXJuIHRydWU7XG4vKlxuICAgIHJldHVybiBHaXQuY3JlYXRlR2l0UmVwb3NpdG9yeSh3b3Jrc3BhY2UsIGpvbG9raWEsIGxvY2FsU3RvcmFnZSkgIT09IG51bGw7XG4qL1xuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIGdvVG9MaW5rKGxpbmssICR0aW1lb3V0LCAkbG9jYXRpb24pIHtcbiAgICB2YXIgaHJlZiA9IENvcmUudHJpbUxlYWRpbmcobGluaywgXCIjXCIpO1xuICAgICR0aW1lb3V0KCgpID0+IHtcbiAgICAgIGxvZy5kZWJ1ZyhcIkFib3V0IHRvIG5hdmlnYXRlIHRvOiBcIiArIGhyZWYpO1xuICAgICAgJGxvY2F0aW9uLnVybChocmVmKTtcbiAgICB9LCAxMDApO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgYWxsIHRoZSBsaW5rcyBmb3IgdGhlIGdpdmVuIGJyYW5jaCBmb3IgdGhlIGN1c3RvbSB2aWV3cywgc3RhcnRpbmcgd2l0aCBcIi9cIlxuICAgKiBAcGFyYW0gJHNjb3BlXG4gICAqIEByZXR1cm5zIHtzdHJpbmdbXX1cbiAgICovXG4gIGV4cG9ydCBmdW5jdGlvbiBjdXN0b21WaWV3TGlua3MoJHNjb3BlKSB7XG4gICAgdmFyIHByZWZpeCA9IENvcmUudHJpbUxlYWRpbmcoV2lraS5zdGFydExpbmsoJHNjb3BlKSwgXCIjXCIpO1xuICAgIHJldHVybiBjdXN0b21XaWtpVmlld1BhZ2VzLm1hcChwYXRoID0+IHByZWZpeCArIHBhdGgpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgYSBuZXcgY3JlYXRlIGRvY3VtZW50IHdpemFyZCB0cmVlXG4gICAqIEBtZXRob2QgY3JlYXRlV2l6YXJkVHJlZVxuICAgKiBAZm9yIFdpa2lcbiAgICogQHN0YXRpY1xuICAgKi9cbiAgZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVdpemFyZFRyZWUod29ya3NwYWNlLCAkc2NvcGUpIHtcbiAgICB2YXIgcm9vdCA9IGNyZWF0ZUZvbGRlcihcIk5ldyBEb2N1bWVudHNcIik7XG4gICAgYWRkQ3JlYXRlV2l6YXJkRm9sZGVycyh3b3Jrc3BhY2UsICRzY29wZSwgcm9vdCwgZG9jdW1lbnRUZW1wbGF0ZXMpO1xuICAgIHJldHVybiByb290O1xuICB9XG5cbiAgZnVuY3Rpb24gY3JlYXRlRm9sZGVyKG5hbWUpOiBhbnkge1xuICAgIHJldHVybiB7XG4gICAgICBuYW1lOiBuYW1lLFxuICAgICAgY2hpbGRyZW46IFtdXG4gICAgfTtcbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiBhZGRDcmVhdGVXaXphcmRGb2xkZXJzKHdvcmtzcGFjZSwgJHNjb3BlLCBwYXJlbnQsIHRlbXBsYXRlczogYW55W10pIHtcbiAgICBhbmd1bGFyLmZvckVhY2godGVtcGxhdGVzLCAodGVtcGxhdGUpID0+IHtcblxuICAgICAgaWYgKCB0ZW1wbGF0ZS5nZW5lcmF0ZWQgKSB7XG4gICAgICAgIGlmICggdGVtcGxhdGUuZ2VuZXJhdGVkLmluaXQgKSB7XG4gICAgICAgICAgdGVtcGxhdGUuZ2VuZXJhdGVkLmluaXQod29ya3NwYWNlLCAkc2NvcGUpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHZhciB0aXRsZSA9IHRlbXBsYXRlLmxhYmVsIHx8IGtleTtcbiAgICAgIHZhciBub2RlID0gY3JlYXRlRm9sZGVyKHRpdGxlKTtcbiAgICAgIG5vZGUucGFyZW50ID0gcGFyZW50O1xuICAgICAgbm9kZS5lbnRpdHkgPSB0ZW1wbGF0ZTtcblxuICAgICAgdmFyIGFkZENsYXNzID0gdGVtcGxhdGUuYWRkQ2xhc3M7XG4gICAgICBpZiAoYWRkQ2xhc3MpIHtcbiAgICAgICAgbm9kZS5hZGRDbGFzcyA9IGFkZENsYXNzO1xuICAgICAgfVxuXG4gICAgICB2YXIga2V5ID0gdGVtcGxhdGUuZXhlbXBsYXI7XG4gICAgICB2YXIgcGFyZW50S2V5ID0gcGFyZW50LmtleSB8fCBcIlwiO1xuICAgICAgbm9kZS5rZXkgPSBwYXJlbnRLZXkgPyBwYXJlbnRLZXkgKyBcIl9cIiArIGtleSA6IGtleTtcbiAgICAgIHZhciBpY29uID0gdGVtcGxhdGUuaWNvbjtcbiAgICAgIGlmIChpY29uKSB7XG4gICAgICAgIG5vZGUuaWNvbiA9IENvcmUudXJsKGljb24pO1xuICAgICAgfVxuICAgICAgLy8gY29tcGlsZXIgd2FzIGNvbXBsYWluaW5nIGFib3V0ICdsYWJlbCcgaGFkIG5vIGlkZWEgd2hlcmUgaXQncyBjb21pbmcgZnJvbVxuICAgICAgLy8gdmFyIHRvb2x0aXAgPSB2YWx1ZVtcInRvb2x0aXBcIl0gfHwgdmFsdWVbXCJkZXNjcmlwdGlvblwiXSB8fCBsYWJlbDtcbiAgICAgIHZhciB0b29sdGlwID0gdGVtcGxhdGVbXCJ0b29sdGlwXCJdIHx8IHRlbXBsYXRlW1wiZGVzY3JpcHRpb25cIl0gfHwgJyc7XG4gICAgICBub2RlLnRvb2x0aXAgPSB0b29sdGlwO1xuICAgICAgaWYgKHRlbXBsYXRlW1wiZm9sZGVyXCJdKSB7XG4gICAgICAgIG5vZGUuaXNGb2xkZXIgPSAoKSA9PiB7IHJldHVybiB0cnVlOyB9O1xuICAgICAgfVxuICAgICAgcGFyZW50LmNoaWxkcmVuLnB1c2gobm9kZSk7XG5cbiAgICAgIHZhciBjaGlsZHJlbiA9IHRlbXBsYXRlLmNoaWxkcmVuO1xuICAgICAgaWYgKGNoaWxkcmVuKSB7XG4gICAgICAgIGFkZENyZWF0ZVdpemFyZEZvbGRlcnMod29ya3NwYWNlLCAkc2NvcGUsIG5vZGUsIGNoaWxkcmVuKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiBzdGFydFdpa2lMaW5rKHByb2plY3RJZCwgYnJhbmNoKSB7XG4gICAgdmFyIHN0YXJ0ID0gVXJsSGVscGVycy5qb2luKERldmVsb3Blci5wcm9qZWN0TGluayhwcm9qZWN0SWQpLCBcIi93aWtpXCIpO1xuICAgIGlmIChicmFuY2gpIHtcbiAgICAgIHN0YXJ0ID0gVXJsSGVscGVycy5qb2luKHN0YXJ0LCAnYnJhbmNoJywgYnJhbmNoKTtcbiAgICB9XG4gICAgcmV0dXJuIHN0YXJ0O1xuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIHN0YXJ0TGluaygkc2NvcGUpIHtcbiAgICB2YXIgcHJvamVjdElkID0gJHNjb3BlLnByb2plY3RJZDtcbiAgICB2YXIgYnJhbmNoID0gJHNjb3BlLmJyYW5jaDtcbiAgICByZXR1cm4gc3RhcnRXaWtpTGluayhwcm9qZWN0SWQsIGJyYW5jaCk7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyB0cnVlIGlmIHRoZSBnaXZlbiBmaWxlbmFtZS9wYXRoIGlzIGFuIGluZGV4IHBhZ2UgKG5hbWVkIGluZGV4LiogYW5kIGlzIGEgbWFya2Rvd24vaHRtbCBwYWdlKS5cbiAgICpcbiAgICogQHBhcmFtIHBhdGhcbiAgICogQHJldHVybnMge2Jvb2xlYW59XG4gICAqL1xuICBleHBvcnQgZnVuY3Rpb24gaXNJbmRleFBhZ2UocGF0aDogc3RyaW5nKSB7XG4gICAgcmV0dXJuIHBhdGggJiYgKHBhdGguZW5kc1dpdGgoXCJpbmRleC5tZFwiKSB8fCBwYXRoLmVuZHNXaXRoKFwiaW5kZXguaHRtbFwiKSB8fCBwYXRoLmVuZHNXaXRoKFwiaW5kZXhcIikpID8gdHJ1ZSA6IGZhbHNlO1xuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIHZpZXdMaW5rKCRzY29wZSwgcGFnZUlkOnN0cmluZywgJGxvY2F0aW9uLCBmaWxlTmFtZTpzdHJpbmcgPSBudWxsKSB7XG4gICAgdmFyIGxpbms6c3RyaW5nID0gbnVsbDtcbiAgICB2YXIgc3RhcnQgPSBzdGFydExpbmsoJHNjb3BlKTtcbiAgICBpZiAocGFnZUlkKSB7XG4gICAgICAvLyBmaWd1cmUgb3V0IHdoaWNoIHZpZXcgdG8gdXNlIGZvciB0aGlzIHBhZ2VcbiAgICAgIHZhciB2aWV3ID0gaXNJbmRleFBhZ2UocGFnZUlkKSA/IFwiL2Jvb2svXCIgOiBcIi92aWV3L1wiO1xuICAgICAgbGluayA9IHN0YXJ0ICsgdmlldyArIGVuY29kZVBhdGgoQ29yZS50cmltTGVhZGluZyhwYWdlSWQsIFwiL1wiKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIGxldHMgdXNlIHRoZSBjdXJyZW50IHBhdGhcbiAgICAgIHZhciBwYXRoOnN0cmluZyA9ICRsb2NhdGlvbi5wYXRoKCk7XG4gICAgICBsaW5rID0gXCIjXCIgKyBwYXRoLnJlcGxhY2UoLyhlZGl0fGNyZWF0ZSkvLCBcInZpZXdcIik7XG4gICAgfVxuICAgIGlmIChmaWxlTmFtZSAmJiBwYWdlSWQgJiYgcGFnZUlkLmVuZHNXaXRoKGZpbGVOYW1lKSkge1xuICAgICAgcmV0dXJuIGxpbms7XG4gICAgfVxuICAgIGlmIChmaWxlTmFtZSkge1xuICAgICAgaWYgKCFsaW5rLmVuZHNXaXRoKFwiL1wiKSkge1xuICAgICAgICBsaW5rICs9IFwiL1wiO1xuICAgICAgfVxuICAgICAgbGluayArPSBmaWxlTmFtZTtcbiAgICB9XG4gICAgcmV0dXJuIGxpbms7XG4gIH1cblxuICBleHBvcnQgZnVuY3Rpb24gYnJhbmNoTGluaygkc2NvcGUsIHBhZ2VJZDogc3RyaW5nLCAkbG9jYXRpb24sIGZpbGVOYW1lOnN0cmluZyA9IG51bGwpIHtcbiAgICByZXR1cm4gdmlld0xpbmsoJHNjb3BlLCBwYWdlSWQsICRsb2NhdGlvbiwgZmlsZU5hbWUpO1xuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIGVkaXRMaW5rKCRzY29wZSwgcGFnZUlkOnN0cmluZywgJGxvY2F0aW9uKSB7XG4gICAgdmFyIGxpbms6c3RyaW5nID0gbnVsbDtcbiAgICB2YXIgZm9ybWF0ID0gV2lraS5maWxlRm9ybWF0KHBhZ2VJZCk7XG4gICAgc3dpdGNoIChmb3JtYXQpIHtcbiAgICAgIGNhc2UgXCJpbWFnZVwiOlxuICAgICAgICBicmVhaztcbiAgICAgIGRlZmF1bHQ6XG4gICAgICB2YXIgc3RhcnQgPSBzdGFydExpbmsoJHNjb3BlKTtcbiAgICAgIGlmIChwYWdlSWQpIHtcbiAgICAgICAgbGluayA9IHN0YXJ0ICsgXCIvZWRpdC9cIiArIGVuY29kZVBhdGgocGFnZUlkKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIGxldHMgdXNlIHRoZSBjdXJyZW50IHBhdGhcbiAgICAgICAgdmFyIHBhdGggPSAkbG9jYXRpb24ucGF0aCgpO1xuICAgICAgICBsaW5rID0gXCIjXCIgKyBwYXRoLnJlcGxhY2UoLyh2aWV3fGNyZWF0ZSkvLCBcImVkaXRcIik7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBsaW5rO1xuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZUxpbmsoJHNjb3BlLCBwYWdlSWQ6c3RyaW5nLCAkbG9jYXRpb24pIHtcbiAgICB2YXIgcGF0aCA9ICRsb2NhdGlvbi5wYXRoKCk7XG4gICAgdmFyIHN0YXJ0ID0gc3RhcnRMaW5rKCRzY29wZSk7XG4gICAgdmFyIGxpbmsgPSAnJztcbiAgICBpZiAocGFnZUlkKSB7XG4gICAgICBsaW5rID0gc3RhcnQgKyBcIi9jcmVhdGUvXCIgKyBlbmNvZGVQYXRoKHBhZ2VJZCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIGxldHMgdXNlIHRoZSBjdXJyZW50IHBhdGhcbiAgICAgIGxpbmsgPSBcIiNcIiArIHBhdGgucmVwbGFjZSgvKHZpZXd8ZWRpdHxmb3JtVGFibGUpLywgXCJjcmVhdGVcIik7XG4gICAgfVxuICAgIC8vIHdlIGhhdmUgdGhlIGxpbmsgc28gbGV0cyBub3cgcmVtb3ZlIHRoZSBsYXN0IHBhdGhcbiAgICAvLyBvciBpZiB0aGVyZSBpcyBubyAvIGluIHRoZSBwYXRoIHRoZW4gcmVtb3ZlIHRoZSBsYXN0IHNlY3Rpb25cbiAgICB2YXIgaWR4ID0gbGluay5sYXN0SW5kZXhPZihcIi9cIik7XG4gICAgaWYgKGlkeCA+IDAgJiYgISRzY29wZS5jaGlsZHJlbiAmJiAhcGF0aC5zdGFydHNXaXRoKFwiL3dpa2kvZm9ybVRhYmxlXCIpKSB7XG4gICAgICBsaW5rID0gbGluay5zdWJzdHJpbmcoMCwgaWR4ICsgMSk7XG4gICAgfVxuICAgIHJldHVybiBsaW5rO1xuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIGVuY29kZVBhdGgocGFnZUlkOnN0cmluZykge1xuICAgIHJldHVybiBwYWdlSWQuc3BsaXQoXCIvXCIpLm1hcChlbmNvZGVVUklDb21wb25lbnQpLmpvaW4oXCIvXCIpO1xuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIGRlY29kZVBhdGgocGFnZUlkOnN0cmluZykge1xuICAgIHJldHVybiBwYWdlSWQuc3BsaXQoXCIvXCIpLm1hcChkZWNvZGVVUklDb21wb25lbnQpLmpvaW4oXCIvXCIpO1xuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIGZpbGVGb3JtYXQobmFtZTpzdHJpbmcsIGZpbGVFeHRlbnNpb25UeXBlUmVnaXN0cnk/KSB7XG4gICAgdmFyIGV4dGVuc2lvbiA9IGZpbGVFeHRlbnNpb24obmFtZSk7XG4gICAgaWYgKG5hbWUpIHtcbiAgICAgIGlmIChuYW1lID09PSBcIkplbmtpbnNmaWxlXCIpIHtcbiAgICAgICAgZXh0ZW5zaW9uID0gXCJncm9vdnlcIjtcbiAgICAgIH1cbiAgICB9XG4gICAgdmFyIGFuc3dlciA9IG51bGw7XG4gICAgaWYgKCFmaWxlRXh0ZW5zaW9uVHlwZVJlZ2lzdHJ5KSB7XG4gICAgICBmaWxlRXh0ZW5zaW9uVHlwZVJlZ2lzdHJ5ID0gSGF3dGlvQ29yZS5pbmplY3Rvci5nZXQoXCJmaWxlRXh0ZW5zaW9uVHlwZVJlZ2lzdHJ5XCIpO1xuICAgIH1cbiAgICBhbmd1bGFyLmZvckVhY2goZmlsZUV4dGVuc2lvblR5cGVSZWdpc3RyeSwgKGFycmF5LCBrZXkpID0+IHtcbiAgICAgIGlmIChhcnJheS5pbmRleE9mKGV4dGVuc2lvbikgPj0gMCkge1xuICAgICAgICBhbnN3ZXIgPSBrZXk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIGFuc3dlcjtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIHRoZSBmaWxlIG5hbWUgb2YgdGhlIGdpdmVuIHBhdGg7IHN0cmlwcGluZyBvZmYgYW55IGRpcmVjdG9yaWVzXG4gICAqIEBtZXRob2QgZmlsZU5hbWVcbiAgICogQGZvciBXaWtpXG4gICAqIEBzdGF0aWNcbiAgICogQHBhcmFtIHtTdHJpbmd9IHBhdGhcbiAgICogQHJldHVybiB7U3RyaW5nfVxuICAgKi9cbiAgZXhwb3J0IGZ1bmN0aW9uIGZpbGVOYW1lKHBhdGg6IHN0cmluZykge1xuICAgIGlmIChwYXRoKSB7XG4gICAgICAgdmFyIGlkeCA9IHBhdGgubGFzdEluZGV4T2YoXCIvXCIpO1xuICAgICAgaWYgKGlkeCA+IDApIHtcbiAgICAgICAgcmV0dXJuIHBhdGguc3Vic3RyaW5nKGlkeCArIDEpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcGF0aDtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIHRoZSBmb2xkZXIgb2YgdGhlIGdpdmVuIHBhdGggKGV2ZXJ5dGhpbmcgYnV0IHRoZSBsYXN0IHBhdGggbmFtZSlcbiAgICogQG1ldGhvZCBmaWxlUGFyZW50XG4gICAqIEBmb3IgV2lraVxuICAgKiBAc3RhdGljXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoXG4gICAqIEByZXR1cm4ge1N0cmluZ31cbiAgICovXG4gIGV4cG9ydCBmdW5jdGlvbiBmaWxlUGFyZW50KHBhdGg6IHN0cmluZykge1xuICAgIGlmIChwYXRoKSB7XG4gICAgICAgdmFyIGlkeCA9IHBhdGgubGFzdEluZGV4T2YoXCIvXCIpO1xuICAgICAgaWYgKGlkeCA+IDApIHtcbiAgICAgICAgcmV0dXJuIHBhdGguc3Vic3RyaW5nKDAsIGlkeCk7XG4gICAgICB9XG4gICAgfVxuICAgIC8vIGxldHMgcmV0dXJuIHRoZSByb290IGRpcmVjdG9yeVxuICAgIHJldHVybiBcIlwiO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgdGhlIGZpbGUgbmFtZSBmb3IgdGhlIGdpdmVuIG5hbWU7IHdlIGhpZGUgc29tZSBleHRlbnNpb25zXG4gICAqIEBtZXRob2QgaGlkZUZpbmVOYW1lRXh0ZW5zaW9uc1xuICAgKiBAZm9yIFdpa2lcbiAgICogQHN0YXRpY1xuICAgKiBAcGFyYW0ge1N0cmluZ30gbmFtZVxuICAgKiBAcmV0dXJuIHtTdHJpbmd9XG4gICAqL1xuICBleHBvcnQgZnVuY3Rpb24gaGlkZUZpbGVOYW1lRXh0ZW5zaW9ucyhuYW1lKSB7XG4gICAgaWYgKG5hbWUpIHtcbiAgICAgIGFuZ3VsYXIuZm9yRWFjaChXaWtpLmhpZGVFeHRlbnNpb25zLCAoZXh0ZW5zaW9uKSA9PiB7XG4gICAgICAgIGlmIChuYW1lLmVuZHNXaXRoKGV4dGVuc2lvbikpIHtcbiAgICAgICAgICBuYW1lID0gbmFtZS5zdWJzdHJpbmcoMCwgbmFtZS5sZW5ndGggLSBleHRlbnNpb24ubGVuZ3RoKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICAgIHJldHVybiBuYW1lO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgdGhlIFVSTCB0byBwZXJmb3JtIGEgR0VUIG9yIFBPU1QgZm9yIHRoZSBnaXZlbiBicmFuY2ggbmFtZSBhbmQgcGF0aFxuICAgKi9cbiAgZXhwb3J0IGZ1bmN0aW9uIGdpdFJlc3RVUkwoJHNjb3BlLCBwYXRoOiBzdHJpbmcpIHtcbiAgICB2YXIgdXJsID0gZ2l0UmVsYXRpdmVVUkwoJHNjb3BlLCBwYXRoKTtcbiAgICB1cmwgPSBDb3JlLnVybCgnLycgKyB1cmwpO1xuXG4vKlxuICAgIHZhciBjb25uZWN0aW9uTmFtZSA9IENvcmUuZ2V0Q29ubmVjdGlvbk5hbWVQYXJhbWV0ZXIoKTtcbiAgICBpZiAoY29ubmVjdGlvbk5hbWUpIHtcbiAgICAgIHZhciBjb25uZWN0aW9uT3B0aW9ucyA9IENvcmUuZ2V0Q29ubmVjdE9wdGlvbnMoY29ubmVjdGlvbk5hbWUpO1xuICAgICAgaWYgKGNvbm5lY3Rpb25PcHRpb25zKSB7XG4gICAgICAgIGNvbm5lY3Rpb25PcHRpb25zLnBhdGggPSB1cmw7XG4gICAgICAgIHVybCA9IDxzdHJpbmc+Q29yZS5jcmVhdGVTZXJ2ZXJDb25uZWN0aW9uVXJsKGNvbm5lY3Rpb25PcHRpb25zKTtcbiAgICAgIH1cbiAgICB9XG5cbiovXG4gICAgcmV0dXJuIHVybDtcbiAgfVxuXG4gICAgZnVuY3Rpb24gZ2l0VXJsUHJlZml4KCkge1xuICAgICAgICB2YXIgcHJlZml4ID0gXCJcIjtcbiAgICAgICAgdmFyIGluamVjdG9yID0gSGF3dGlvQ29yZS5pbmplY3RvcjtcbiAgICAgICAgaWYgKGluamVjdG9yKSB7XG4gICAgICAgICAgICBwcmVmaXggPSBpbmplY3Rvci5nZXQoXCJXaWtpR2l0VXJsUHJlZml4XCIpIHx8IFwiXCI7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHByZWZpeDtcbiAgICB9XG5cbiAgICAvKipcbiAgICogUmV0dXJucyBhIHJlbGF0aXZlIFVSTCB0byBwZXJmb3JtIGEgR0VUIG9yIFBPU1QgZm9yIHRoZSBnaXZlbiBicmFuY2gvcGF0aFxuICAgKi9cbiAgZXhwb3J0IGZ1bmN0aW9uIGdpdFJlbGF0aXZlVVJMKCRzY29wZSwgcGF0aDogc3RyaW5nKSB7XG4gICAgICB2YXIgYnJhbmNoID0gJHNjb3BlLmJyYW5jaDtcbiAgICB2YXIgcHJlZml4ID0gZ2l0VXJsUHJlZml4KCk7XG4gICAgYnJhbmNoID0gYnJhbmNoIHx8IFwibWFzdGVyXCI7XG4gICAgcGF0aCA9IHBhdGggfHwgXCIvXCI7XG4gICAgcmV0dXJuIFVybEhlbHBlcnMuam9pbihwcmVmaXgsIFwiZ2l0L1wiICsgYnJhbmNoLCBwYXRoKTtcbiAgfVxuXG5cbiAgLyoqXG4gICAqIFRha2VzIGEgcm93IGNvbnRhaW5pbmcgdGhlIGVudGl0eSBvYmplY3Q7IG9yIGNhbiB0YWtlIHRoZSBlbnRpdHkgZGlyZWN0bHkuXG4gICAqXG4gICAqIEl0IHRoZW4gdXNlcyB0aGUgbmFtZSwgZGlyZWN0b3J5IGFuZCB4bWxOYW1lc3BhY2VzIHByb3BlcnRpZXNcbiAgICpcbiAgICogQG1ldGhvZCBmaWxlSWNvbkh0bWxcbiAgICogQGZvciBXaWtpXG4gICAqIEBzdGF0aWNcbiAgICogQHBhcmFtIHthbnl9IHJvd1xuICAgKiBAcmV0dXJuIHtTdHJpbmd9XG4gICAqXG4gICAqL1xuICBleHBvcnQgZnVuY3Rpb24gZmlsZUljb25IdG1sKHJvdykge1xuICAgIHZhciBuYW1lID0gcm93Lm5hbWU7XG4gICAgdmFyIHBhdGggPSByb3cucGF0aDtcbiAgICB2YXIgYnJhbmNoID0gcm93LmJyYW5jaCA7XG4gICAgdmFyIGRpcmVjdG9yeSA9IHJvdy5kaXJlY3Rvcnk7XG4gICAgdmFyIHhtbE5hbWVzcGFjZXMgPSByb3cueG1sX25hbWVzcGFjZXMgfHwgcm93LnhtbE5hbWVzcGFjZXM7XG4gICAgdmFyIGljb25VcmwgPSByb3cuaWNvblVybDtcbiAgICB2YXIgZW50aXR5ID0gcm93LmVudGl0eTtcbiAgICBpZiAoZW50aXR5KSB7XG4gICAgICBuYW1lID0gbmFtZSB8fCBlbnRpdHkubmFtZTtcbiAgICAgIHBhdGggPSBwYXRoIHx8IGVudGl0eS5wYXRoO1xuICAgICAgYnJhbmNoID0gYnJhbmNoIHx8IGVudGl0eS5icmFuY2g7XG4gICAgICBkaXJlY3RvcnkgPSBkaXJlY3RvcnkgfHwgZW50aXR5LmRpcmVjdG9yeTtcbiAgICAgIHhtbE5hbWVzcGFjZXMgPSB4bWxOYW1lc3BhY2VzIHx8IGVudGl0eS54bWxfbmFtZXNwYWNlcyB8fCBlbnRpdHkueG1sTmFtZXNwYWNlcztcbiAgICAgIGljb25VcmwgPSBpY29uVXJsIHx8IGVudGl0eS5pY29uVXJsO1xuICAgIH1cbiAgICBicmFuY2ggPSBicmFuY2ggfHwgXCJtYXN0ZXJcIjtcbiAgICB2YXIgY3NzID0gbnVsbDtcbiAgICB2YXIgaWNvbjpzdHJpbmcgPSBudWxsO1xuICAgIHZhciBleHRlbnNpb24gPSBmaWxlRXh0ZW5zaW9uKG5hbWUpO1xuICAgIC8vIFRPRE8gY291bGQgd2UgdXNlIGRpZmZlcmVudCBpY29ucyBmb3IgbWFya2Rvd24gdiB4bWwgdiBodG1sXG4gICAgaWYgKHhtbE5hbWVzcGFjZXMgJiYgeG1sTmFtZXNwYWNlcy5sZW5ndGgpIHtcbiAgICAgIGlmICh4bWxOYW1lc3BhY2VzLmFueSgobnMpID0+IFdpa2kuY2FtZWxOYW1lc3BhY2VzLmFueShucykpKSB7XG4gICAgICAgIGljb24gPSBcImltZy9pY29ucy9jYW1lbC5zdmdcIjtcbiAgICAgIH0gZWxzZSBpZiAoeG1sTmFtZXNwYWNlcy5hbnkoKG5zKSA9PiBXaWtpLmRvemVyTmFtZXNwYWNlcy5hbnkobnMpKSkge1xuICAgICAgICBpY29uID0gXCJpbWcvaWNvbnMvZG96ZXIvZG96ZXIuZ2lmXCI7XG4gICAgICB9IGVsc2UgaWYgKHhtbE5hbWVzcGFjZXMuYW55KChucykgPT4gV2lraS5hY3RpdmVtcU5hbWVzcGFjZXMuYW55KG5zKSkpIHtcbiAgICAgICAgaWNvbiA9IFwiaW1nL2ljb25zL21lc3NhZ2Vicm9rZXIuc3ZnXCI7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBsb2cuZGVidWcoXCJmaWxlIFwiICsgbmFtZSArIFwiIGhhcyBuYW1lc3BhY2VzIFwiICsgeG1sTmFtZXNwYWNlcyk7XG4gICAgICB9XG4gICAgfVxuICAgIGlmICghaWNvblVybCAmJiBuYW1lKSB7XG4gICAgICB2YXIgbG93ZXJOYW1lID0gbmFtZS50b0xvd2VyQ2FzZSgpO1xuICAgICAgaWYgKGxvd2VyTmFtZSA9PSBcInBvbS54bWxcIikge1xuICAgICAgICBpY29uVXJsID0gXCJpbWcvbWF2ZW4taWNvbi5wbmdcIjtcbiAgICAgIH0gZWxzZSBpZiAobG93ZXJOYW1lID09IFwiamVua2luc2ZpbGVcIikge1xuICAgICAgICBpY29uVXJsID0gXCJpbWcvamVua2lucy1pY29uLnN2Z1wiO1xuICAgICAgfSBlbHNlIGlmIChsb3dlck5hbWUgPT0gXCJmYWJyaWM4LnltbFwiKSB7XG4gICAgICAgIGljb25VcmwgPSBcImltZy9mYWJyaWM4X2ljb24uc3ZnXCI7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKGljb25VcmwpIHtcbiAgICAgIGNzcyA9IG51bGw7XG4gICAgICBpY29uID0gaWNvblVybDtcbi8qXG4gICAgICB2YXIgcHJlZml4ID0gZ2l0VXJsUHJlZml4KCk7XG4gICAgICBpY29uID0gVXJsSGVscGVycy5qb2luKHByZWZpeCwgXCJnaXRcIiwgaWNvblVybCk7XG4qL1xuLypcbiAgICAgIHZhciBjb25uZWN0aW9uTmFtZSA9IENvcmUuZ2V0Q29ubmVjdGlvbk5hbWVQYXJhbWV0ZXIoKTtcbiAgICAgIGlmIChjb25uZWN0aW9uTmFtZSkge1xuICAgICAgICB2YXIgY29ubmVjdGlvbk9wdGlvbnMgPSBDb3JlLmdldENvbm5lY3RPcHRpb25zKGNvbm5lY3Rpb25OYW1lKTtcbiAgICAgICAgaWYgKGNvbm5lY3Rpb25PcHRpb25zKSB7XG4gICAgICAgICAgY29ubmVjdGlvbk9wdGlvbnMucGF0aCA9IENvcmUudXJsKCcvJyArIGljb24pO1xuICAgICAgICAgIGljb24gPSA8c3RyaW5nPkNvcmUuY3JlYXRlU2VydmVyQ29ubmVjdGlvblVybChjb25uZWN0aW9uT3B0aW9ucyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiovXG4gICAgfVxuICAgIGlmICghaWNvbikge1xuICAgICAgaWYgKGRpcmVjdG9yeSkge1xuICAgICAgICBzd2l0Y2ggKGV4dGVuc2lvbikge1xuICAgICAgICAgIGNhc2UgJ3Byb2ZpbGUnOlxuICAgICAgICAgICAgY3NzID0gXCJmYSBmYS1ib29rXCI7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgLy8gbG9nLmRlYnVnKFwiTm8gbWF0Y2ggZm9yIGV4dGVuc2lvbjogXCIsIGV4dGVuc2lvbiwgXCIgdXNpbmcgYSBnZW5lcmljIGZvbGRlciBpY29uXCIpO1xuICAgICAgICAgICAgY3NzID0gXCJmYSBmYS1mb2xkZXIgZm9sZGVyLWljb25cIjtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc3dpdGNoIChleHRlbnNpb24pIHtcbiAgICAgICAgICBjYXNlICdqYXZhJzpcbiAgICAgICAgICAgIGljb24gPSBcImltZy9qYXZhLnN2Z1wiO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgY2FzZSAncG5nJzpcbiAgICAgICAgICBjYXNlICdzdmcnOlxuICAgICAgICAgIGNhc2UgJ2pwZyc6XG4gICAgICAgICAgY2FzZSAnZ2lmJzpcbiAgICAgICAgICAgIGNzcyA9IG51bGw7XG4gICAgICAgICAgICBpY29uID0gV2lraS5naXRSZWxhdGl2ZVVSTChicmFuY2gsIHBhdGgpO1xuLypcbiAgICAgICAgICAgIHZhciBjb25uZWN0aW9uTmFtZSA9IENvcmUuZ2V0Q29ubmVjdGlvbk5hbWVQYXJhbWV0ZXIoKTtcbiAgICAgICAgICAgIGlmIChjb25uZWN0aW9uTmFtZSkge1xuICAgICAgICAgICAgICB2YXIgY29ubmVjdGlvbk9wdGlvbnMgPSBDb3JlLmdldENvbm5lY3RPcHRpb25zKGNvbm5lY3Rpb25OYW1lKTtcbiAgICAgICAgICAgICAgaWYgKGNvbm5lY3Rpb25PcHRpb25zKSB7XG4gICAgICAgICAgICAgICAgY29ubmVjdGlvbk9wdGlvbnMucGF0aCA9IENvcmUudXJsKCcvJyArIGljb24pO1xuICAgICAgICAgICAgICAgIGljb24gPSA8c3RyaW5nPkNvcmUuY3JlYXRlU2VydmVyQ29ubmVjdGlvblVybChjb25uZWN0aW9uT3B0aW9ucyk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiovXG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICBjYXNlICdqc29uJzpcbiAgICAgICAgICBjYXNlICd4bWwnOlxuICAgICAgICAgICAgY3NzID0gXCJmYSBmYS1maWxlLXRleHRcIjtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIGNhc2UgJ21kJzpcbiAgICAgICAgICAgIGNzcyA9IFwiZmEgZmEtZmlsZS10ZXh0LW9cIjtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAvLyBsb2cuZGVidWcoXCJObyBtYXRjaCBmb3IgZXh0ZW5zaW9uOiBcIiwgZXh0ZW5zaW9uLCBcIiB1c2luZyBhIGdlbmVyaWMgZmlsZSBpY29uXCIpO1xuICAgICAgICAgICAgY3NzID0gXCJmYSBmYS1maWxlLW9cIjtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICBpZiAoaWNvbikge1xuICAgICAgcmV0dXJuIFwiPGltZyBzcmM9J1wiICsgQ29yZS51cmwoaWNvbikgKyBcIic+XCI7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBcIjxpIGNsYXNzPSdcIiArIGNzcyArIFwiJz48L2k+XCI7XG4gICAgfVxuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIGljb25DbGFzcyhyb3cpIHtcbiAgICB2YXIgbmFtZSA9IHJvdy5nZXRQcm9wZXJ0eShcIm5hbWVcIik7XG4gICAgdmFyIGV4dGVuc2lvbiA9IGZpbGVFeHRlbnNpb24obmFtZSk7XG4gICAgdmFyIGRpcmVjdG9yeSA9IHJvdy5nZXRQcm9wZXJ0eShcImRpcmVjdG9yeVwiKTtcbiAgICBpZiAoZGlyZWN0b3J5KSB7XG4gICAgICByZXR1cm4gXCJmYSBmYS1mb2xkZXJcIjtcbiAgICB9XG4gICAgaWYgKFwieG1sXCIgPT09IGV4dGVuc2lvbikge1xuICAgICAgICByZXR1cm4gXCJmYSBmYS1jb2dcIjtcbiAgICB9IGVsc2UgaWYgKFwibWRcIiA9PT0gZXh0ZW5zaW9uKSB7XG4gICAgICAgIHJldHVybiBcImZhIGZhLWZpbGUtdGV4dC1vXCI7XG4gICAgfVxuICAgIC8vIFRPRE8gY291bGQgd2UgdXNlIGRpZmZlcmVudCBpY29ucyBmb3IgbWFya2Rvd24gdiB4bWwgdiBodG1sXG4gICAgcmV0dXJuIFwiZmEgZmEtZmlsZS1vXCI7XG4gIH1cblxuXG4gIC8qKlxuICAgKiBFeHRyYWN0cyB0aGUgcGFnZUlkLCBicmFuY2gsIG9iamVjdElkIGZyb20gdGhlIHJvdXRlIHBhcmFtZXRlcnNcbiAgICogQG1ldGhvZCBpbml0U2NvcGVcbiAgICogQGZvciBXaWtpXG4gICAqIEBzdGF0aWNcbiAgICogQHBhcmFtIHsqfSAkc2NvcGVcbiAgICogQHBhcmFtIHthbnl9ICRyb3V0ZVBhcmFtc1xuICAgKiBAcGFyYW0ge25nLklMb2NhdGlvblNlcnZpY2V9ICRsb2NhdGlvblxuICAgKi9cbiAgZXhwb3J0IGZ1bmN0aW9uIGluaXRTY29wZSgkc2NvcGUsICRyb3V0ZVBhcmFtcywgJGxvY2F0aW9uKSB7XG4gICAgJHNjb3BlLnBhZ2VJZCA9IFdpa2kucGFnZUlkKCRyb3V0ZVBhcmFtcywgJGxvY2F0aW9uKTtcblxuICAgIC8vIGxldHMgbGV0IHRoZXNlIHRvIGJlIGluaGVyaXRlZCBpZiB3ZSBpbmNsdWRlIGEgdGVtcGxhdGUgb24gYW5vdGhlciBwYWdlXG4gICAgJHNjb3BlLnByb2plY3RJZCA9ICRyb3V0ZVBhcmFtc1tcInByb2plY3RJZFwiXSB8fCAkc2NvcGUuaWQ7XG4gICAgJHNjb3BlLm5hbWVzcGFjZSA9ICRyb3V0ZVBhcmFtc1tcIm5hbWVzcGFjZVwiXSB8fCAkc2NvcGUubmFtZXNwYWNlO1xuICAgIEt1YmVybmV0ZXMuc2V0Q3VycmVudEt1YmVybmV0ZXNOYW1lc3BhY2UoJHNjb3BlLm5hbWVzcGFjZSk7XG5cbiAgICAkc2NvcGUub3duZXIgPSAkcm91dGVQYXJhbXNbXCJvd25lclwiXTtcbiAgICAkc2NvcGUucmVwb0lkID0gJHJvdXRlUGFyYW1zW1wicmVwb0lkXCJdO1xuICAgICRzY29wZS5icmFuY2ggPSAkcm91dGVQYXJhbXNbXCJicmFuY2hcIl0gfHwgJGxvY2F0aW9uLnNlYXJjaCgpW1wiYnJhbmNoXCJdO1xuICAgICRzY29wZS5vYmplY3RJZCA9ICRyb3V0ZVBhcmFtc1tcIm9iamVjdElkXCJdIHx8ICRyb3V0ZVBhcmFtc1tcImRpZmZPYmplY3RJZDFcIl07XG4gICAgJHNjb3BlLnN0YXJ0TGluayA9IHN0YXJ0TGluaygkc2NvcGUpO1xuICAgICRzY29wZS4kdmlld0xpbmsgPSB2aWV3TGluaygkc2NvcGUsICRzY29wZS5wYWdlSWQsICRsb2NhdGlvbik7XG4gICAgJHNjb3BlLmhpc3RvcnlMaW5rID0gc3RhcnRMaW5rKCRzY29wZSkgKyBcIi9oaXN0b3J5L1wiICsgKCRzY29wZS5wYWdlSWQgfHwgXCJcIik7XG4gICAgJHNjb3BlLndpa2lSZXBvc2l0b3J5ID0gbmV3IEdpdFdpa2lSZXBvc2l0b3J5KCRzY29wZSk7XG4gICAgJHNjb3BlLiR3b3Jrc3BhY2VMaW5rID0gRGV2ZWxvcGVyLndvcmtzcGFjZUxpbmsoKTtcbiAgICAkc2NvcGUuJHByb2plY3RMaW5rID0gRGV2ZWxvcGVyLnByb2plY3RMaW5rKCRzY29wZS5wcm9qZWN0SWQpO1xuICAgICRzY29wZS5icmVhZGNydW1iQ29uZmlnID0gRGV2ZWxvcGVyLmNyZWF0ZVByb2plY3RCcmVhZGNydW1icygkc2NvcGUucHJvamVjdElkLCBjcmVhdGVTb3VyY2VCcmVhZGNydW1icygkc2NvcGUpKTtcbiAgICAkc2NvcGUuc3ViVGFiQ29uZmlnID0gRGV2ZWxvcGVyLmNyZWF0ZVByb2plY3RTdWJOYXZCYXJzKCRzY29wZS5wcm9qZWN0SWQpO1xuXG4gICAgRm9yZ2UucmVkaXJlY3RUb1NldHVwU2VjcmV0c0lmTm90RGVmaW5lZCgkc2NvcGUsICRsb2NhdGlvbik7XG4gIH1cblxuICAvKipcbiAgICogTG9hZHMgdGhlIGJyYW5jaGVzIGZvciB0aGlzIHdpa2kgcmVwb3NpdG9yeSBhbmQgc3RvcmVzIHRoZW0gaW4gdGhlIGJyYW5jaGVzIHByb3BlcnR5IGluXG4gICAqIHRoZSAkc2NvcGUgYW5kIGVuc3VyZXMgJHNjb3BlLmJyYW5jaCBpcyBzZXQgdG8gYSB2YWxpZCB2YWx1ZVxuICAgKlxuICAgKiBAcGFyYW0gd2lraVJlcG9zaXRvcnlcbiAgICogQHBhcmFtICRzY29wZVxuICAgKiBAcGFyYW0gaXNGbWMgd2hldGhlciB3ZSBydW4gYXMgZmFicmljOCBvciBhcyBoYXd0aW9cbiAgICovXG4gIGV4cG9ydCBmdW5jdGlvbiBsb2FkQnJhbmNoZXMoam9sb2tpYSwgd2lraVJlcG9zaXRvcnksICRzY29wZSwgaXNGbWMgPSBmYWxzZSkge1xuICAgIHdpa2lSZXBvc2l0b3J5LmJyYW5jaGVzKChyZXNwb25zZSkgPT4ge1xuICAgICAgLy8gbGV0cyBzb3J0IGJ5IHZlcnNpb24gbnVtYmVyXG4gICAgICAkc2NvcGUuYnJhbmNoZXMgPSByZXNwb25zZS5zb3J0QnkoKHYpID0+IENvcmUudmVyc2lvblRvU29ydGFibGVTdHJpbmcodiksIHRydWUpO1xuXG4gICAgICAvLyBkZWZhdWx0IHRoZSBicmFuY2ggbmFtZSBpZiB3ZSBoYXZlICdtYXN0ZXInXG4gICAgICBpZiAoISRzY29wZS5icmFuY2ggJiYgJHNjb3BlLmJyYW5jaGVzLmZpbmQoKGJyYW5jaCkgPT4ge1xuICAgICAgICByZXR1cm4gYnJhbmNoID09PSBcIm1hc3RlclwiO1xuICAgICAgfSkpIHtcbiAgICAgICAgJHNjb3BlLmJyYW5jaCA9IFwibWFzdGVyXCI7XG4gICAgICB9XG4gICAgICBDb3JlLiRhcHBseSgkc2NvcGUpO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIEV4dHJhY3RzIHRoZSBwYWdlSWQgZnJvbSB0aGUgcm91dGUgcGFyYW1ldGVyc1xuICAgKiBAbWV0aG9kIHBhZ2VJZFxuICAgKiBAZm9yIFdpa2lcbiAgICogQHN0YXRpY1xuICAgKiBAcGFyYW0ge2FueX0gJHJvdXRlUGFyYW1zXG4gICAqIEBwYXJhbSBAbmcuSUxvY2F0aW9uU2VydmljZSBAbG9jYXRpb25cbiAgICogQHJldHVybiB7U3RyaW5nfVxuICAgKi9cbiAgZXhwb3J0IGZ1bmN0aW9uIHBhZ2VJZCgkcm91dGVQYXJhbXMsICRsb2NhdGlvbikge1xuICAgIHZhciBwYWdlSWQgPSAkcm91dGVQYXJhbXNbJ3BhZ2UnXTtcbiAgICBpZiAoIXBhZ2VJZCkge1xuICAgICAgLy8gTGV0cyBkZWFsIHdpdGggdGhlIGhhY2sgb2YgQW5ndWxhckpTIG5vdCBzdXBwb3J0aW5nIC8gaW4gYSBwYXRoIHZhcmlhYmxlXG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IDEwMDsgaSsrKSB7XG4gICAgICAgIHZhciB2YWx1ZSA9ICRyb3V0ZVBhcmFtc1sncGF0aCcgKyBpXTtcbiAgICAgICAgaWYgKGFuZ3VsYXIuaXNEZWZpbmVkKHZhbHVlKSkge1xuICAgICAgICAgIGlmICghcGFnZUlkKSB7XG4gICAgICAgICAgICBwYWdlSWQgPSB2YWx1ZTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcGFnZUlkICs9IFwiL1wiICsgdmFsdWU7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgYnJlYWs7XG4gICAgICB9XG4gICAgICByZXR1cm4gcGFnZUlkIHx8IFwiL1wiO1xuICAgIH1cblxuICAgIC8vIGlmIG5vICRyb3V0ZVBhcmFtcyB2YXJpYWJsZXMgbGV0cyBmaWd1cmUgaXQgb3V0IGZyb20gdGhlICRsb2NhdGlvblxuICAgIGlmICghcGFnZUlkKSB7XG4gICAgICBwYWdlSWQgPSBwYWdlSWRGcm9tVVJJKCRsb2NhdGlvbi5wYXRoKCkpO1xuICAgIH1cbiAgICByZXR1cm4gcGFnZUlkO1xuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIHBhZ2VJZEZyb21VUkkodXJsOnN0cmluZykge1xuICAgIHZhciB3aWtpUHJlZml4ID0gXCIvd2lraS9cIjtcbiAgICBpZiAodXJsICYmIHVybC5zdGFydHNXaXRoKHdpa2lQcmVmaXgpKSB7XG4gICAgICB2YXIgaWR4ID0gdXJsLmluZGV4T2YoXCIvXCIsIHdpa2lQcmVmaXgubGVuZ3RoICsgMSk7XG4gICAgICBpZiAoaWR4ID4gMCkge1xuICAgICAgICByZXR1cm4gdXJsLnN1YnN0cmluZyhpZHggKyAxLCB1cmwubGVuZ3RoKVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbnVsbFxuXG4gIH1cblxuICBleHBvcnQgZnVuY3Rpb24gZmlsZUV4dGVuc2lvbihuYW1lKSB7XG4gICAgaWYgKG5hbWUuaW5kZXhPZignIycpID4gMClcbiAgICAgIG5hbWUgPSBuYW1lLnN1YnN0cmluZygwLCBuYW1lLmluZGV4T2YoJyMnKSk7XG4gICAgcmV0dXJuIENvcmUuZmlsZUV4dGVuc2lvbihuYW1lLCBcIm1hcmtkb3duXCIpO1xuICB9XG5cblxuICBleHBvcnQgZnVuY3Rpb24gb25Db21wbGV0ZShzdGF0dXMpIHtcbiAgICBjb25zb2xlLmxvZyhcIkNvbXBsZXRlZCBvcGVyYXRpb24gd2l0aCBzdGF0dXM6IFwiICsgSlNPTi5zdHJpbmdpZnkoc3RhdHVzKSk7XG4gIH1cblxuICAvKipcbiAgICogUGFyc2VzIHRoZSBnaXZlbiBKU09OIHRleHQgcmVwb3J0aW5nIHRvIHRoZSB1c2VyIGlmIHRoZXJlIGlzIGEgcGFyc2UgZXJyb3JcbiAgICogQG1ldGhvZCBwYXJzZUpzb25cbiAgICogQGZvciBXaWtpXG4gICAqIEBzdGF0aWNcbiAgICogQHBhcmFtIHtTdHJpbmd9IHRleHRcbiAgICogQHJldHVybiB7YW55fVxuICAgKi9cbiAgZXhwb3J0IGZ1bmN0aW9uIHBhcnNlSnNvbih0ZXh0OnN0cmluZykge1xuICAgIGlmICh0ZXh0KSB7XG4gICAgICB0cnkge1xuICAgICAgICByZXR1cm4gSlNPTi5wYXJzZSh0ZXh0KTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgQ29yZS5ub3RpZmljYXRpb24oXCJlcnJvclwiLCBcIkZhaWxlZCB0byBwYXJzZSBKU09OOiBcIiArIGUpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIC8qKlxuICAgKiBBZGp1c3RzIGEgcmVsYXRpdmUgb3IgYWJzb2x1dGUgbGluayBmcm9tIGEgd2lraSBvciBmaWxlIHN5c3RlbSB0byBvbmUgdXNpbmcgdGhlIGhhc2ggYmFuZyBzeW50YXhcbiAgICogQG1ldGhvZCBhZGp1c3RIcmVmXG4gICAqIEBmb3IgV2lraVxuICAgKiBAc3RhdGljXG4gICAqIEBwYXJhbSB7Kn0gJHNjb3BlXG4gICAqIEBwYXJhbSB7bmcuSUxvY2F0aW9uU2VydmljZX0gJGxvY2F0aW9uXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBocmVmXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBmaWxlRXh0ZW5zaW9uXG4gICAqIEByZXR1cm4ge3N0cmluZ31cbiAgICovXG4gIGV4cG9ydCBmdW5jdGlvbiBhZGp1c3RIcmVmKCRzY29wZSwgJGxvY2F0aW9uLCBocmVmLCBmaWxlRXh0ZW5zaW9uKSB7XG4gICAgdmFyIGV4dGVuc2lvbiA9IGZpbGVFeHRlbnNpb24gPyBcIi5cIiArIGZpbGVFeHRlbnNpb24gOiBcIlwiO1xuXG4gICAgLy8gaWYgdGhlIGxhc3QgcGFydCBvZiB0aGUgcGF0aCBoYXMgYSBkb3QgaW4gaXQgbGV0c1xuICAgIC8vIGV4Y2x1ZGUgaXQgYXMgd2UgYXJlIHJlbGF0aXZlIHRvIGEgbWFya2Rvd24gb3IgaHRtbCBmaWxlIGluIGEgZm9sZGVyXG4gICAgLy8gc3VjaCBhcyB3aGVuIHZpZXdpbmcgcmVhZG1lLm1kIG9yIGluZGV4Lm1kXG4gICAgdmFyIHBhdGggPSAkbG9jYXRpb24ucGF0aCgpO1xuICAgIHZhciBmb2xkZXJQYXRoID0gcGF0aDtcbiAgICB2YXIgaWR4ID0gcGF0aC5sYXN0SW5kZXhPZihcIi9cIik7XG4gICAgaWYgKGlkeCA+IDApIHtcbiAgICAgIHZhciBsYXN0TmFtZSA9IHBhdGguc3Vic3RyaW5nKGlkeCArIDEpO1xuICAgICAgaWYgKGxhc3ROYW1lLmluZGV4T2YoXCIuXCIpID49IDApIHtcbiAgICAgICAgZm9sZGVyUGF0aCA9IHBhdGguc3Vic3RyaW5nKDAsIGlkeCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gRGVhbCB3aXRoIHJlbGF0aXZlIFVSTHMgZmlyc3QuLi5cbiAgICBpZiAoaHJlZi5zdGFydHNXaXRoKCcuLi8nKSkge1xuICAgICAgdmFyIHBhcnRzID0gaHJlZi5zcGxpdCgnLycpO1xuICAgICAgdmFyIHBhdGhQYXJ0cyA9IGZvbGRlclBhdGguc3BsaXQoJy8nKTtcbiAgICAgIHZhciBwYXJlbnRzID0gcGFydHMuZmlsdGVyKChwYXJ0KSA9PiB7XG4gICAgICAgIHJldHVybiBwYXJ0ID09PSBcIi4uXCI7XG4gICAgICB9KTtcbiAgICAgIHBhcnRzID0gcGFydHMubGFzdChwYXJ0cy5sZW5ndGggLSBwYXJlbnRzLmxlbmd0aCk7XG4gICAgICBwYXRoUGFydHMgPSBwYXRoUGFydHMuZmlyc3QocGF0aFBhcnRzLmxlbmd0aCAtIHBhcmVudHMubGVuZ3RoKTtcblxuICAgICAgcmV0dXJuICcjJyArIHBhdGhQYXJ0cy5qb2luKCcvJykgKyAnLycgKyBwYXJ0cy5qb2luKCcvJykgKyBleHRlbnNpb24gKyAkbG9jYXRpb24uaGFzaCgpO1xuICAgIH1cblxuICAgIC8vIFR1cm4gYW4gYWJzb2x1dGUgbGluayBpbnRvIGEgd2lraSBsaW5rLi4uXG4gICAgaWYgKGhyZWYuc3RhcnRzV2l0aCgnLycpKSB7XG4gICAgICByZXR1cm4gV2lraS5icmFuY2hMaW5rKCRzY29wZSwgaHJlZiArIGV4dGVuc2lvbiwgJGxvY2F0aW9uKSArIGV4dGVuc2lvbjtcbiAgICB9XG5cbiAgICBpZiAoIVdpa2kuZXhjbHVkZUFkanVzdG1lbnRQcmVmaXhlcy5hbnkoKGV4Y2x1ZGUpID0+IHtcbiAgICAgIHJldHVybiBocmVmLnN0YXJ0c1dpdGgoZXhjbHVkZSk7XG4gICAgfSkpIHtcbiAgICAgIHJldHVybiAnIycgKyBmb2xkZXJQYXRoICsgXCIvXCIgKyBocmVmICsgZXh0ZW5zaW9uICsgJGxvY2F0aW9uLmhhc2goKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICB9XG59XG4iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vaW5jbHVkZXMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwid2lraUhlbHBlcnMudHNcIi8+XG5cbi8qKlxuICogQG1vZHVsZSBXaWtpXG4gKiBAbWFpbiBXaWtpXG4gKi9cbm1vZHVsZSBXaWtpIHtcblxuICBleHBvcnQgdmFyIHBsdWdpbk5hbWUgPSAnd2lraSc7XG4gIGV4cG9ydCB2YXIgdGVtcGxhdGVQYXRoID0gJ3BsdWdpbnMvd2lraS9odG1sLyc7XG4gIGV4cG9ydCB2YXIgdGFiOmFueSA9IG51bGw7XG5cbiAgZXhwb3J0IHZhciBfbW9kdWxlID0gYW5ndWxhci5tb2R1bGUocGx1Z2luTmFtZSwgWydoYXd0aW8tY29yZScsICdoYXd0aW8tdWknLCAndHJlZUNvbnRyb2wnLCAndWkuY29kZW1pcnJvciddKTtcbiAgZXhwb3J0IHZhciBjb250cm9sbGVyID0gUGx1Z2luSGVscGVycy5jcmVhdGVDb250cm9sbGVyRnVuY3Rpb24oX21vZHVsZSwgJ1dpa2knKTtcbiAgZXhwb3J0IHZhciByb3V0ZSA9IFBsdWdpbkhlbHBlcnMuY3JlYXRlUm91dGluZ0Z1bmN0aW9uKHRlbXBsYXRlUGF0aCk7XG5cbiAgX21vZHVsZS5jb25maWcoW1wiJHJvdXRlUHJvdmlkZXJcIiwgKCRyb3V0ZVByb3ZpZGVyKSA9PiB7XG5cbiAgICAvLyBhbGxvdyBvcHRpb25hbCBicmFuY2ggcGF0aHMuLi5cbiAgICBhbmd1bGFyLmZvckVhY2goW1wiXCIsIFwiL2JyYW5jaC86YnJhbmNoXCJdLCAocGF0aCkgPT4ge1xuICAgICAgLy92YXIgc3RhcnRDb250ZXh0ID0gJy93aWtpJztcbiAgICAgIHZhciBzdGFydENvbnRleHQgPSAnL3dvcmtzcGFjZXMvOm5hbWVzcGFjZS9wcm9qZWN0cy86cHJvamVjdElkL3dpa2knO1xuICAgICAgJHJvdXRlUHJvdmlkZXIuXG4gICAgICAgICAgICAgIHdoZW4oVXJsSGVscGVycy5qb2luKHN0YXJ0Q29udGV4dCwgcGF0aCwgJ3ZpZXcnKSwgcm91dGUoJ3ZpZXdQYWdlLmh0bWwnLCBmYWxzZSkpLlxuICAgICAgICAgICAgICB3aGVuKFVybEhlbHBlcnMuam9pbihzdGFydENvbnRleHQsIHBhdGgsICdjcmVhdGUvOnBhZ2UqJyksIHJvdXRlKCdjcmVhdGUuaHRtbCcsIGZhbHNlKSkuXG4gICAgICAgICAgICAgIHdoZW4oc3RhcnRDb250ZXh0ICsgcGF0aCArICcvdmlldy86cGFnZSonLCB7dGVtcGxhdGVVcmw6ICdwbHVnaW5zL3dpa2kvaHRtbC92aWV3UGFnZS5odG1sJywgcmVsb2FkT25TZWFyY2g6IGZhbHNlfSkuXG4gICAgICAgICAgICAgIHdoZW4oc3RhcnRDb250ZXh0ICsgcGF0aCArICcvYm9vay86cGFnZSonLCB7dGVtcGxhdGVVcmw6ICdwbHVnaW5zL3dpa2kvaHRtbC92aWV3Qm9vay5odG1sJywgcmVsb2FkT25TZWFyY2g6IGZhbHNlfSkuXG4gICAgICAgICAgICAgIHdoZW4oc3RhcnRDb250ZXh0ICsgcGF0aCArICcvZWRpdC86cGFnZSonLCB7dGVtcGxhdGVVcmw6ICdwbHVnaW5zL3dpa2kvaHRtbC9lZGl0UGFnZS5odG1sJ30pLlxuICAgICAgICAgICAgICB3aGVuKHN0YXJ0Q29udGV4dCArIHBhdGggKyAnL3ZlcnNpb24vOnBhZ2UqXFwvOm9iamVjdElkJywge3RlbXBsYXRlVXJsOiAncGx1Z2lucy93aWtpL2h0bWwvdmlld1BhZ2UuaHRtbCd9KS5cbiAgICAgICAgICAgICAgd2hlbihzdGFydENvbnRleHQgKyBwYXRoICsgJy9oaXN0b3J5LzpwYWdlKicsIHt0ZW1wbGF0ZVVybDogJ3BsdWdpbnMvd2lraS9odG1sL2hpc3RvcnkuaHRtbCd9KS5cbiAgICAgICAgICAgICAgd2hlbihzdGFydENvbnRleHQgKyBwYXRoICsgJy9jb21taXQvOnBhZ2UqXFwvOm9iamVjdElkJywge3RlbXBsYXRlVXJsOiAncGx1Z2lucy93aWtpL2h0bWwvY29tbWl0Lmh0bWwnfSkuXG4gICAgICAgICAgICAgIHdoZW4oc3RhcnRDb250ZXh0ICsgcGF0aCArICcvY29tbWl0RGV0YWlsLzpwYWdlKlxcLzpvYmplY3RJZCcsIHt0ZW1wbGF0ZVVybDogJ3BsdWdpbnMvd2lraS9odG1sL2NvbW1pdERldGFpbC5odG1sJ30pLlxuICAgICAgICAgICAgICB3aGVuKHN0YXJ0Q29udGV4dCArIHBhdGggKyAnL2RpZmYvOmRpZmZPYmplY3RJZDEvOmRpZmZPYmplY3RJZDIvOnBhZ2UqJywge3RlbXBsYXRlVXJsOiAncGx1Z2lucy93aWtpL2h0bWwvdmlld1BhZ2UuaHRtbCcsIHJlbG9hZE9uU2VhcmNoOiBmYWxzZX0pLlxuICAgICAgICAgICAgICB3aGVuKHN0YXJ0Q29udGV4dCArIHBhdGggKyAnL2Zvcm1UYWJsZS86cGFnZSonLCB7dGVtcGxhdGVVcmw6ICdwbHVnaW5zL3dpa2kvaHRtbC9mb3JtVGFibGUuaHRtbCd9KS5cbiAgICAgICAgICAgICAgd2hlbihzdGFydENvbnRleHQgKyBwYXRoICsgJy9kb3plci9tYXBwaW5ncy86cGFnZSonLCB7dGVtcGxhdGVVcmw6ICdwbHVnaW5zL3dpa2kvaHRtbC9kb3plck1hcHBpbmdzLmh0bWwnfSkuXG4gICAgICAgICAgICAgIHdoZW4oc3RhcnRDb250ZXh0ICsgcGF0aCArICcvY29uZmlndXJhdGlvbnMvOnBhZ2UqJywgeyB0ZW1wbGF0ZVVybDogJ3BsdWdpbnMvd2lraS9odG1sL2NvbmZpZ3VyYXRpb25zLmh0bWwnIH0pLlxuICAgICAgICAgICAgICB3aGVuKHN0YXJ0Q29udGV4dCArIHBhdGggKyAnL2NvbmZpZ3VyYXRpb24vOnBpZC86cGFnZSonLCB7IHRlbXBsYXRlVXJsOiAncGx1Z2lucy93aWtpL2h0bWwvY29uZmlndXJhdGlvbi5odG1sJyB9KS5cbiAgICAgICAgICAgICAgd2hlbihzdGFydENvbnRleHQgKyBwYXRoICsgJy9uZXdDb25maWd1cmF0aW9uLzpmYWN0b3J5UGlkLzpwYWdlKicsIHsgdGVtcGxhdGVVcmw6ICdwbHVnaW5zL3dpa2kvaHRtbC9jb25maWd1cmF0aW9uLmh0bWwnIH0pLlxuICAgICAgICAgICAgICB3aGVuKHN0YXJ0Q29udGV4dCArIHBhdGggKyAnL2NhbWVsL2RpYWdyYW0vOnBhZ2UqJywge3RlbXBsYXRlVXJsOiAncGx1Z2lucy93aWtpL2h0bWwvY2FtZWxEaWFncmFtLmh0bWwnfSkuXG4gICAgICAgICAgICAgIHdoZW4oc3RhcnRDb250ZXh0ICsgcGF0aCArICcvY2FtZWwvY2FudmFzLzpwYWdlKicsIHt0ZW1wbGF0ZVVybDogJ3BsdWdpbnMvd2lraS9odG1sL2NhbWVsQ2FudmFzLmh0bWwnfSkuXG4gICAgICAgICAgICAgIHdoZW4oc3RhcnRDb250ZXh0ICsgcGF0aCArICcvY2FtZWwvcHJvcGVydGllcy86cGFnZSonLCB7dGVtcGxhdGVVcmw6ICdwbHVnaW5zL3dpa2kvaHRtbC9jYW1lbFByb3BlcnRpZXMuaHRtbCd9KTtcbiAgICB9KTtcbn1dKTtcblxuICAvKipcbiAgICogQnJhbmNoIE1lbnUgc2VydmljZVxuICAgKi9cbiAgZXhwb3J0IGludGVyZmFjZSBCcmFuY2hNZW51IHtcbiAgICBhZGRFeHRlbnNpb246IChpdGVtOlVJLk1lbnVJdGVtKSA9PiB2b2lkO1xuICAgIGFwcGx5TWVudUV4dGVuc2lvbnM6IChtZW51OlVJLk1lbnVJdGVtW10pID0+IHZvaWQ7XG4gIH1cblxuICBfbW9kdWxlLmZhY3RvcnkoJ3dpa2lCcmFuY2hNZW51JywgKCkgPT4ge1xuICAgIHZhciBzZWxmID0ge1xuICAgICAgaXRlbXM6IFtdLFxuICAgICAgYWRkRXh0ZW5zaW9uOiAoaXRlbTpVSS5NZW51SXRlbSkgPT4ge1xuICAgICAgICBzZWxmLml0ZW1zLnB1c2goaXRlbSk7XG4gICAgICB9LFxuICAgICAgYXBwbHlNZW51RXh0ZW5zaW9uczogKG1lbnU6VUkuTWVudUl0ZW1bXSkgPT4ge1xuICAgICAgICBpZiAoc2VsZi5pdGVtcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGV4dGVuZGVkTWVudTpVSS5NZW51SXRlbVtdID0gW3tcbiAgICAgICAgICBoZWFkaW5nOiBcIkFjdGlvbnNcIlxuICAgICAgICB9XTtcbiAgICAgICAgc2VsZi5pdGVtcy5mb3JFYWNoKChpdGVtOlVJLk1lbnVJdGVtKSA9PiB7XG4gICAgICAgICAgaWYgKGl0ZW0udmFsaWQoKSkge1xuICAgICAgICAgICAgZXh0ZW5kZWRNZW51LnB1c2goaXRlbSk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgaWYgKGV4dGVuZGVkTWVudS5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgbWVudS5hZGQoZXh0ZW5kZWRNZW51KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH07XG4gICAgcmV0dXJuIHNlbGY7XG4gIH0pO1xuXG4gIF9tb2R1bGUuZmFjdG9yeSgnV2lraUdpdFVybFByZWZpeCcsICgpID0+IHtcbiAgICAgIHJldHVybiBcIlwiO1xuICB9KTtcblxuICBfbW9kdWxlLmZhY3RvcnkoJ2ZpbGVFeHRlbnNpb25UeXBlUmVnaXN0cnknLCAoKSA9PiB7XG4gICAgcmV0dXJuIHtcbiAgICAgIFwiaW1hZ2VcIjogW1wic3ZnXCIsIFwicG5nXCIsIFwiaWNvXCIsIFwiYm1wXCIsIFwianBnXCIsIFwiZ2lmXCJdLFxuICAgICAgXCJtYXJrZG93blwiOiBbXCJtZFwiLCBcIm1hcmtkb3duXCIsIFwibWRvd25cIiwgXCJta2RuXCIsIFwibWtkXCJdLFxuICAgICAgXCJodG1sbWl4ZWRcIjogW1wiaHRtbFwiLCBcInhodG1sXCIsIFwiaHRtXCJdLFxuICAgICAgXCJ0ZXh0L3gtamF2YVwiOiBbXCJqYXZhXCJdLFxuICAgICAgXCJ0ZXh0L3gtZ3Jvb3Z5XCI6IFtcImdyb292eVwiXSxcbiAgICAgIFwidGV4dC94LXNjYWxhXCI6IFtcInNjYWxhXCJdLFxuICAgICAgXCJqYXZhc2NyaXB0XCI6IFtcImpzXCIsIFwianNvblwiLCBcImphdmFzY3JpcHRcIiwgXCJqc2NyaXB0XCIsIFwiZWNtYXNjcmlwdFwiLCBcImZvcm1cIl0sXG4gICAgICBcInhtbFwiOiBbXCJ4bWxcIiwgXCJ4c2RcIiwgXCJ3c2RsXCIsIFwiYXRvbVwiXSxcbiAgICAgIFwidGV4dC94LXlhbWxcIjogW1wieWFtbFwiLCBcInltbFwiXSxcbiAgICAgIFwicHJvcGVydGllc1wiOiBbXCJwcm9wZXJ0aWVzXCJdXG4gICAgfTtcbiAgfSk7XG5cbiAgX21vZHVsZS5maWx0ZXIoJ2ZpbGVJY29uQ2xhc3MnLCAoKSA9PiBpY29uQ2xhc3MpO1xuXG4gIF9tb2R1bGUucnVuKFtcIiRsb2NhdGlvblwiLFwidmlld1JlZ2lzdHJ5XCIsICBcImxvY2FsU3RvcmFnZVwiLCBcImxheW91dEZ1bGxcIiwgXCJoZWxwUmVnaXN0cnlcIiwgXCJwcmVmZXJlbmNlc1JlZ2lzdHJ5XCIsIFwid2lraVJlcG9zaXRvcnlcIixcbiAgICBcIiRyb290U2NvcGVcIiwgKCRsb2NhdGlvbjpuZy5JTG9jYXRpb25TZXJ2aWNlLFxuICAgICAgICB2aWV3UmVnaXN0cnksXG4gICAgICAgIGxvY2FsU3RvcmFnZSxcbiAgICAgICAgbGF5b3V0RnVsbCxcbiAgICAgICAgaGVscFJlZ2lzdHJ5LFxuICAgICAgICBwcmVmZXJlbmNlc1JlZ2lzdHJ5LFxuICAgICAgICB3aWtpUmVwb3NpdG9yeSxcbiAgICAgICAgJHJvb3RTY29wZSkgPT4ge1xuXG4gICAgdmlld1JlZ2lzdHJ5Wyd3aWtpJ10gPSB0ZW1wbGF0ZVBhdGggKyAnbGF5b3V0V2lraS5odG1sJztcbi8qXG4gICAgaGVscFJlZ2lzdHJ5LmFkZFVzZXJEb2MoJ3dpa2knLCAncGx1Z2lucy93aWtpL2RvYy9oZWxwLm1kJywgKCkgPT4ge1xuICAgICAgcmV0dXJuIFdpa2kuaXNXaWtpRW5hYmxlZCh3b3Jrc3BhY2UsIGpvbG9raWEsIGxvY2FsU3RvcmFnZSk7XG4gICAgfSk7XG4qL1xuXG4vKlxuICAgIHByZWZlcmVuY2VzUmVnaXN0cnkuYWRkVGFiKFwiR2l0XCIsICdwbHVnaW5zL3dpa2kvaHRtbC9naXRQcmVmZXJlbmNlcy5odG1sJyk7XG4qL1xuXG4vKlxuICAgIHRhYiA9IHtcbiAgICAgIGlkOiBcIndpa2lcIixcbiAgICAgIGNvbnRlbnQ6IFwiV2lraVwiLFxuICAgICAgdGl0bGU6IFwiVmlldyBhbmQgZWRpdCB3aWtpIHBhZ2VzXCIsXG4gICAgICBpc1ZhbGlkOiAod29ya3NwYWNlOldvcmtzcGFjZSkgPT4gV2lraS5pc1dpa2lFbmFibGVkKHdvcmtzcGFjZSwgam9sb2tpYSwgbG9jYWxTdG9yYWdlKSxcbiAgICAgIGhyZWY6ICgpID0+IFwiIy93aWtpL3ZpZXdcIixcbiAgICAgIGlzQWN0aXZlOiAod29ya3NwYWNlOldvcmtzcGFjZSkgPT4gd29ya3NwYWNlLmlzTGlua0FjdGl2ZShcIi93aWtpXCIpICYmICF3b3Jrc3BhY2UubGlua0NvbnRhaW5zKFwiZmFicmljXCIsIFwicHJvZmlsZXNcIikgJiYgIXdvcmtzcGFjZS5saW5rQ29udGFpbnMoXCJlZGl0RmVhdHVyZXNcIilcbiAgICB9O1xuICAgIHdvcmtzcGFjZS50b3BMZXZlbFRhYnMucHVzaCh0YWIpO1xuKi9cblxuICAgIC8vIGFkZCBlbXB0eSByZWdleHMgdG8gdGVtcGxhdGVzIHRoYXQgZG9uJ3QgZGVmaW5lXG4gICAgLy8gdGhlbSBzbyBuZy1wYXR0ZXJuIGRvZXNuJ3QgYmFyZlxuICAgIFdpa2kuZG9jdW1lbnRUZW1wbGF0ZXMuZm9yRWFjaCgodGVtcGxhdGU6IGFueSkgPT4ge1xuICAgICAgaWYgKCF0ZW1wbGF0ZVsncmVnZXgnXSkge1xuICAgICAgICB0ZW1wbGF0ZS5yZWdleCA9IC8oPzopLztcbiAgICAgIH1cbiAgICB9KTtcblxuICB9XSk7XG5cbiAgaGF3dGlvUGx1Z2luTG9hZGVyLmFkZE1vZHVsZShwbHVnaW5OYW1lKTtcbn1cbiIsIi8qKlxuICogQG1vZHVsZSBXaWtpXG4gKi9cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuL3dpa2lQbHVnaW4udHNcIi8+XG5tb2R1bGUgV2lraSB7XG5cbiAgZXhwb3J0IHZhciBDYW1lbENvbnRyb2xsZXIgPSBfbW9kdWxlLmNvbnRyb2xsZXIoXCJXaWtpLkNhbWVsQ29udHJvbGxlclwiLCBbXCIkc2NvcGVcIiwgXCIkcm9vdFNjb3BlXCIsIFwiJGxvY2F0aW9uXCIsIFwiJHJvdXRlUGFyYW1zXCIsIFwiJGNvbXBpbGVcIiwgXCIkdGVtcGxhdGVDYWNoZVwiLCBcImxvY2FsU3RvcmFnZVwiLCAoJHNjb3BlLCAkcm9vdFNjb3BlLCAkbG9jYXRpb24sICRyb3V0ZVBhcmFtcywgJGNvbXBpbGUsICR0ZW1wbGF0ZUNhY2hlLCBsb2NhbFN0b3JhZ2U6V2luZG93TG9jYWxTdG9yYWdlKSA9PiB7XG5cbiAgICAvLyBUT0RPIFJFTU9WRVxuICAgIHZhciBqb2xva2lhID0gbnVsbDtcbiAgICB2YXIgam9sb2tpYVN0YXR1cyA9IG51bGw7XG4gICAgdmFyIGpteFRyZWVMYXp5TG9hZFJlZ2lzdHJ5ID0gbnVsbDtcbiAgICB2YXIgdXNlckRldGFpbHMgPSBudWxsO1xuICAgIHZhciBIYXd0aW9OYXYgPSBudWxsO1xuICAgIHZhciB3b3Jrc3BhY2UgPSBuZXcgV29ya3NwYWNlKGpvbG9raWEsIGpvbG9raWFTdGF0dXMsIGpteFRyZWVMYXp5TG9hZFJlZ2lzdHJ5LCAkbG9jYXRpb24sICRjb21waWxlLCAkdGVtcGxhdGVDYWNoZSwgbG9jYWxTdG9yYWdlLCAkcm9vdFNjb3BlLCB1c2VyRGV0YWlscywgSGF3dGlvTmF2KTtcblxuICAgIFdpa2kuaW5pdFNjb3BlKCRzY29wZSwgJHJvdXRlUGFyYW1zLCAkbG9jYXRpb24pO1xuICAgIENhbWVsLmluaXRFbmRwb2ludENob29zZXJTY29wZSgkc2NvcGUsICRsb2NhdGlvbiwgbG9jYWxTdG9yYWdlLCB3b3Jrc3BhY2UsIGpvbG9raWEpO1xuICAgIHZhciB3aWtpUmVwb3NpdG9yeSA9ICRzY29wZS53aWtpUmVwb3NpdG9yeTtcblxuICAgICRzY29wZS5zY2hlbWEgPSBDYW1lbC5nZXRDb25maWd1cmVkQ2FtZWxNb2RlbCgpO1xuICAgICRzY29wZS5tb2RpZmllZCA9IGZhbHNlO1xuXG4gICAgJHNjb3BlLnN3aXRjaFRvQ2FudmFzVmlldyA9IG5ldyBVSS5EaWFsb2coKTtcblxuICAgICRzY29wZS5maW5kUHJvZmlsZUNhbWVsQ29udGV4dCA9IHRydWU7XG4gICAgJHNjb3BlLmNhbWVsU2VsZWN0aW9uRGV0YWlscyA9IHtcbiAgICAgIHNlbGVjdGVkQ2FtZWxDb250ZXh0SWQ6IG51bGwsXG4gICAgICBzZWxlY3RlZFJvdXRlSWQ6IG51bGxcbiAgICB9O1xuXG4gICAgJHNjb3BlLmlzVmFsaWQgPSAobmF2KSA9PiB7XG4gICAgICByZXR1cm4gbmF2ICYmIG5hdi5pc1ZhbGlkKHdvcmtzcGFjZSk7XG4gICAgfTtcblxuICAgICRzY29wZS5jYW1lbFN1YkxldmVsVGFicyA9IFtcbiAgICAgIHtcbiAgICAgICAgY29udGVudDogJzxpIGNsYXNzPVwiZmEgZmEtcGljdHVyZS1vXCI+PC9pPiBDYW52YXMnLFxuICAgICAgICB0aXRsZTogXCJFZGl0IHRoZSBkaWFncmFtIGluIGEgZHJhZ2d5IGRyb3BweSB3YXlcIixcbiAgICAgICAgaXNWYWxpZDogKHdvcmtzcGFjZTpXb3Jrc3BhY2UpID0+IHRydWUsXG4gICAgICAgIGhyZWY6ICgpID0+IFdpa2kuc3RhcnRMaW5rKCRzY29wZSkgKyBcIi9jYW1lbC9jYW52YXMvXCIgKyAkc2NvcGUucGFnZUlkXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBjb250ZW50OiAnPGkgY2xhc3M9XCJmYSBmYS10cmVlXCI+PC9pPiBUcmVlJyxcbiAgICAgICAgdGl0bGU6IFwiVmlldyB0aGUgcm91dGVzIGFzIGEgdHJlZVwiLFxuICAgICAgICBpc1ZhbGlkOiAod29ya3NwYWNlOldvcmtzcGFjZSkgPT4gdHJ1ZSxcbiAgICAgICAgaHJlZjogKCkgPT4gV2lraS5zdGFydExpbmsoJHNjb3BlKSArIFwiL2NhbWVsL3Byb3BlcnRpZXMvXCIgKyAkc2NvcGUucGFnZUlkXG4gICAgICB9LyosXG4gICAgICAge1xuICAgICAgIGNvbnRlbnQ6ICc8aSBjbGFzcz1cImZhIGZhLXNpdGVtYXBcIj48L2k+IERpYWdyYW0nLFxuICAgICAgIHRpdGxlOiBcIlZpZXcgYSBkaWFncmFtIG9mIHRoZSByb3V0ZVwiLFxuICAgICAgIGlzVmFsaWQ6ICh3b3Jrc3BhY2U6V29ya3NwYWNlKSA9PiB0cnVlLFxuICAgICAgIGhyZWY6ICgpID0+IFdpa2kuc3RhcnRMaW5rKCRzY29wZSkgKyBcIi9jYW1lbC9kaWFncmFtL1wiICsgJHNjb3BlLnBhZ2VJZFxuICAgICAgIH0sKi9cbiAgICBdO1xuXG4gICAgdmFyIHJvdXRlTW9kZWwgPSBfYXBhY2hlQ2FtZWxNb2RlbC5kZWZpbml0aW9ucy5yb3V0ZTtcbiAgICByb3V0ZU1vZGVsW1wiX2lkXCJdID0gXCJyb3V0ZVwiO1xuXG4gICAgJHNjb3BlLmFkZERpYWxvZyA9IG5ldyBVSS5EaWFsb2coKTtcblxuICAgIC8vIFRPRE8gZG9lc24ndCBzZWVtIHRoYXQgYW5ndWxhci11aSB1c2VzIHRoZXNlP1xuICAgICRzY29wZS5hZGREaWFsb2cub3B0aW9uc1tcImRpYWxvZ0NsYXNzXCJdID0gXCJtb2RhbC1sYXJnZVwiO1xuICAgICRzY29wZS5hZGREaWFsb2cub3B0aW9uc1tcImNzc0NsYXNzXCJdID0gXCJtb2RhbC1sYXJnZVwiO1xuXG4gICAgJHNjb3BlLnBhbGV0dGVJdGVtU2VhcmNoID0gXCJcIjtcbiAgICAkc2NvcGUucGFsZXR0ZVRyZWUgPSBuZXcgRm9sZGVyKFwiUGFsZXR0ZVwiKTtcbiAgICAkc2NvcGUucGFsZXR0ZUFjdGl2YXRpb25zID0gW1wiUm91dGluZ19hZ2dyZWdhdGVcIl07XG5cbiAgICAvLyBsb2FkICRzY29wZS5wYWxldHRlVHJlZVxuICAgIGFuZ3VsYXIuZm9yRWFjaChfYXBhY2hlQ2FtZWxNb2RlbC5kZWZpbml0aW9ucywgKHZhbHVlLCBrZXkpID0+IHtcbiAgICAgIGlmICh2YWx1ZS5ncm91cCkge1xuICAgICAgICB2YXIgZ3JvdXAgPSAoa2V5ID09PSBcInJvdXRlXCIpID8gJHNjb3BlLnBhbGV0dGVUcmVlIDogJHNjb3BlLnBhbGV0dGVUcmVlLmdldE9yRWxzZSh2YWx1ZS5ncm91cCk7XG4gICAgICAgIGlmICghZ3JvdXAua2V5KSB7XG4gICAgICAgICAgZ3JvdXAua2V5ID0gdmFsdWUuZ3JvdXA7XG4gICAgICAgIH1cbiAgICAgICAgdmFsdWVbXCJfaWRcIl0gPSBrZXk7XG4gICAgICAgIHZhciB0aXRsZSA9IHZhbHVlW1widGl0bGVcIl0gfHwga2V5O1xuICAgICAgICB2YXIgbm9kZSA9IG5ldyBGb2xkZXIodGl0bGUpO1xuICAgICAgICBub2RlLmtleSA9IGdyb3VwLmtleSArIFwiX1wiICsga2V5O1xuICAgICAgICBub2RlW1wibm9kZU1vZGVsXCJdID0gdmFsdWU7XG4gICAgICAgIHZhciBpbWFnZVVybCA9IENhbWVsLmdldFJvdXRlTm9kZUljb24odmFsdWUpO1xuICAgICAgICBub2RlLmljb24gPSBpbWFnZVVybDtcbiAgICAgICAgLy8gY29tcGlsZXIgd2FzIGNvbXBsYWluaW5nIGFib3V0ICdsYWJlbCcgaGFkIG5vIGlkZWEgd2hlcmUgaXQncyBjb21pbmcgZnJvbVxuICAgICAgICAvLyB2YXIgdG9vbHRpcCA9IHZhbHVlW1widG9vbHRpcFwiXSB8fCB2YWx1ZVtcImRlc2NyaXB0aW9uXCJdIHx8IGxhYmVsO1xuICAgICAgICB2YXIgdG9vbHRpcCA9IHZhbHVlW1widG9vbHRpcFwiXSB8fCB2YWx1ZVtcImRlc2NyaXB0aW9uXCJdIHx8ICcnO1xuICAgICAgICBub2RlLnRvb2x0aXAgPSB0b29sdGlwO1xuXG4gICAgICAgIGdyb3VwLmNoaWxkcmVuLnB1c2gobm9kZSk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICAvLyBsb2FkICRzY29wZS5jb21wb25lbnRUcmVlXG4gICAgJHNjb3BlLmNvbXBvbmVudFRyZWUgPSBuZXcgRm9sZGVyKFwiRW5kcG9pbnRzXCIpO1xuXG4gICAgJHNjb3BlLiR3YXRjaChcImNvbXBvbmVudE5hbWVzXCIsICgpID0+IHtcbiAgICAgIHZhciBjb21wb25lbnROYW1lcyA9ICRzY29wZS5jb21wb25lbnROYW1lcztcbiAgICAgIGlmIChjb21wb25lbnROYW1lcyAmJiBjb21wb25lbnROYW1lcy5sZW5ndGgpIHtcbiAgICAgICAgJHNjb3BlLmNvbXBvbmVudFRyZWUgPSBuZXcgRm9sZGVyKFwiRW5kcG9pbnRzXCIpO1xuICAgICAgICBhbmd1bGFyLmZvckVhY2goJHNjb3BlLmNvbXBvbmVudE5hbWVzLCAoZW5kcG9pbnROYW1lKSA9PiB7XG4gICAgICAgICAgdmFyIGNhdGVnb3J5ID0gQ2FtZWwuZ2V0RW5kcG9pbnRDYXRlZ29yeShlbmRwb2ludE5hbWUpO1xuICAgICAgICAgIHZhciBncm91cE5hbWUgPSBjYXRlZ29yeS5sYWJlbCB8fCBcIkNvcmVcIjtcbiAgICAgICAgICB2YXIgZ3JvdXBLZXkgPSBjYXRlZ29yeS5pZCB8fCBncm91cE5hbWU7XG4gICAgICAgICAgdmFyIGdyb3VwID0gJHNjb3BlLmNvbXBvbmVudFRyZWUuZ2V0T3JFbHNlKGdyb3VwTmFtZSk7XG5cbiAgICAgICAgICB2YXIgdmFsdWUgPSBDYW1lbC5nZXRFbmRwb2ludENvbmZpZyhlbmRwb2ludE5hbWUsIGNhdGVnb3J5KTtcbiAgICAgICAgICB2YXIga2V5ID0gZW5kcG9pbnROYW1lO1xuICAgICAgICAgIHZhciBsYWJlbCA9IHZhbHVlW1wibGFiZWxcIl0gfHwgZW5kcG9pbnROYW1lO1xuICAgICAgICAgIHZhciBub2RlID0gbmV3IEZvbGRlcihsYWJlbCk7XG4gICAgICAgICAgbm9kZS5rZXkgPSBncm91cEtleSArIFwiX1wiICsga2V5O1xuICAgICAgICAgIG5vZGUua2V5ID0ga2V5O1xuICAgICAgICAgIG5vZGVbXCJub2RlTW9kZWxcIl0gPSB2YWx1ZTtcbiAgICAgICAgICB2YXIgdG9vbHRpcCA9IHZhbHVlW1widG9vbHRpcFwiXSB8fCB2YWx1ZVtcImRlc2NyaXB0aW9uXCJdIHx8IGxhYmVsO1xuICAgICAgICAgIHZhciBpbWFnZVVybCA9IENvcmUudXJsKHZhbHVlW1wiaWNvblwiXSB8fCBDYW1lbC5lbmRwb2ludEljb24pO1xuICAgICAgICAgIG5vZGUuaWNvbiA9IGltYWdlVXJsO1xuICAgICAgICAgIG5vZGUudG9vbHRpcCA9IHRvb2x0aXA7XG5cbiAgICAgICAgICBncm91cC5jaGlsZHJlbi5wdXNoKG5vZGUpO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICAkc2NvcGUuY29tcG9uZW50QWN0aXZhdGlvbnMgPSBbXCJiZWFuXCJdO1xuXG4gICAgJHNjb3BlLiR3YXRjaCgnYWRkRGlhbG9nLnNob3cnLCBmdW5jdGlvbiAoKSB7XG4gICAgICBpZiAoJHNjb3BlLmFkZERpYWxvZy5zaG93KSB7XG4gICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICQoJyNzdWJtaXQnKS5mb2N1cygpO1xuICAgICAgICB9LCA1MCk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICAkc2NvcGUuJG9uKFwiaGF3dGlvLmZvcm0ubW9kZWxDaGFuZ2VcIiwgb25Nb2RlbENoYW5nZUV2ZW50KTtcblxuICAgICRzY29wZS5vblJvb3RUcmVlTm9kZSA9IChyb290VHJlZU5vZGUpID0+IHtcbiAgICAgICRzY29wZS5yb290VHJlZU5vZGUgPSByb290VHJlZU5vZGU7XG4gICAgICAvLyByZXN0b3JlIHRoZSByZWFsIGRhdGEgYXQgdGhlIHJvb3QgZm9yIHNhdmluZyB0aGUgZG9jIGV0Y1xuICAgICAgcm9vdFRyZWVOb2RlLmRhdGEgPSAkc2NvcGUuY2FtZWxDb250ZXh0VHJlZTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLmFkZE5vZGUgPSAoKSA9PiB7XG4gICAgICBpZiAoJHNjb3BlLm5vZGVYbWxOb2RlKSB7XG4gICAgICAgICRzY29wZS5hZGREaWFsb2cub3BlbigpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgYWRkTmV3Tm9kZShyb3V0ZU1vZGVsKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgJHNjb3BlLm9uUGFsZXR0ZVNlbGVjdCA9IChub2RlKSA9PiB7XG4gICAgICAkc2NvcGUuc2VsZWN0ZWRQYWxldHRlTm9kZSA9IChub2RlICYmIG5vZGVbXCJub2RlTW9kZWxcIl0pID8gbm9kZSA6IG51bGw7XG4gICAgICBpZiAoJHNjb3BlLnNlbGVjdGVkUGFsZXR0ZU5vZGUpIHtcbiAgICAgICAgJHNjb3BlLnNlbGVjdGVkQ29tcG9uZW50Tm9kZSA9IG51bGw7XG4gICAgICB9XG4gICAgICBsb2cuZGVidWcoXCJTZWxlY3RlZCBcIiArICRzY29wZS5zZWxlY3RlZFBhbGV0dGVOb2RlICsgXCIgOiBcIiArICRzY29wZS5zZWxlY3RlZENvbXBvbmVudE5vZGUpO1xuICAgIH07XG5cbiAgICAkc2NvcGUub25Db21wb25lbnRTZWxlY3QgPSAobm9kZSkgPT4ge1xuICAgICAgJHNjb3BlLnNlbGVjdGVkQ29tcG9uZW50Tm9kZSA9IChub2RlICYmIG5vZGVbXCJub2RlTW9kZWxcIl0pID8gbm9kZSA6IG51bGw7XG4gICAgICBpZiAoJHNjb3BlLnNlbGVjdGVkQ29tcG9uZW50Tm9kZSkge1xuICAgICAgICAkc2NvcGUuc2VsZWN0ZWRQYWxldHRlTm9kZSA9IG51bGw7XG4gICAgICAgIHZhciBub2RlTmFtZSA9IG5vZGUua2V5O1xuICAgICAgICBsb2cuZGVidWcoXCJsb2FkaW5nIGVuZHBvaW50IHNjaGVtYSBmb3Igbm9kZSBcIiArIG5vZGVOYW1lKTtcbiAgICAgICAgJHNjb3BlLmxvYWRFbmRwb2ludFNjaGVtYShub2RlTmFtZSk7XG4gICAgICAgICRzY29wZS5zZWxlY3RlZENvbXBvbmVudE5hbWUgPSBub2RlTmFtZTtcbiAgICAgIH1cbiAgICAgIGxvZy5kZWJ1ZyhcIlNlbGVjdGVkIFwiICsgJHNjb3BlLnNlbGVjdGVkUGFsZXR0ZU5vZGUgKyBcIiA6IFwiICsgJHNjb3BlLnNlbGVjdGVkQ29tcG9uZW50Tm9kZSk7XG4gICAgfTtcblxuICAgICRzY29wZS5zZWxlY3RlZE5vZGVNb2RlbCA9ICgpID0+IHtcbiAgICAgIHZhciBub2RlTW9kZWwgPSBudWxsO1xuICAgICAgaWYgKCRzY29wZS5zZWxlY3RlZFBhbGV0dGVOb2RlKSB7XG4gICAgICAgIG5vZGVNb2RlbCA9ICRzY29wZS5zZWxlY3RlZFBhbGV0dGVOb2RlW1wibm9kZU1vZGVsXCJdO1xuICAgICAgICAkc2NvcGUuZW5kcG9pbnRDb25maWcgPSBudWxsO1xuICAgICAgfSBlbHNlIGlmICgkc2NvcGUuc2VsZWN0ZWRDb21wb25lbnROb2RlKSB7XG4gICAgICAgIC8vIFRPRE8gbGVzdCBjcmVhdGUgYW4gZW5kcG9pbnQgbm9kZU1vZGVsIGFuZCBhc3NvY2lhdGVcbiAgICAgICAgLy8gdGhlIGR1bW15IFVSTCBhbmQgcHJvcGVydGllcyBldGMuLi5cbiAgICAgICAgdmFyIGVuZHBvaW50Q29uZmlnID0gJHNjb3BlLnNlbGVjdGVkQ29tcG9uZW50Tm9kZVtcIm5vZGVNb2RlbFwiXTtcbiAgICAgICAgdmFyIGVuZHBvaW50U2NoZW1hID0gJHNjb3BlLmVuZHBvaW50U2NoZW1hO1xuICAgICAgICBub2RlTW9kZWwgPSAkc2NvcGUuc2NoZW1hLmRlZmluaXRpb25zLmVuZHBvaW50O1xuICAgICAgICAkc2NvcGUuZW5kcG9pbnRDb25maWcgPSB7XG4gICAgICAgICAga2V5OiAkc2NvcGUuc2VsZWN0ZWRDb21wb25lbnROb2RlLmtleSxcbiAgICAgICAgICBzY2hlbWE6IGVuZHBvaW50U2NoZW1hLFxuICAgICAgICAgIGRldGFpbHM6IGVuZHBvaW50Q29uZmlnXG4gICAgICAgIH07XG4gICAgICB9XG4gICAgICByZXR1cm4gbm9kZU1vZGVsO1xuICAgIH07XG5cbiAgICAkc2NvcGUuYWRkQW5kQ2xvc2VEaWFsb2cgPSAoKSA9PiB7XG4gICAgICB2YXIgbm9kZU1vZGVsID0gJHNjb3BlLnNlbGVjdGVkTm9kZU1vZGVsKCk7XG4gICAgICBpZiAobm9kZU1vZGVsKSB7XG4gICAgICAgIGFkZE5ld05vZGUobm9kZU1vZGVsKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGxvZy5kZWJ1ZyhcIldBUk5JTkc6IG5vIG5vZGVNb2RlbCFcIik7XG4gICAgICB9XG4gICAgICAkc2NvcGUuYWRkRGlhbG9nLmNsb3NlKCk7XG4gICAgfTtcblxuICAgICRzY29wZS5yZW1vdmVOb2RlID0gKCkgPT4ge1xuICAgICAgaWYgKCRzY29wZS5zZWxlY3RlZEZvbGRlciAmJiAkc2NvcGUudHJlZU5vZGUpIHtcbiAgICAgICAgJHNjb3BlLnNlbGVjdGVkRm9sZGVyLmRldGFjaCgpO1xuICAgICAgICAkc2NvcGUudHJlZU5vZGUucmVtb3ZlKCk7XG4gICAgICAgICRzY29wZS5zZWxlY3RlZEZvbGRlciA9IG51bGw7XG4gICAgICAgICRzY29wZS50cmVlTm9kZSA9IG51bGw7XG4gICAgICB9XG4gICAgfTtcblxuICAgICRzY29wZS5jYW5EZWxldGUgPSAoKSA9PiB7XG4gICAgICByZXR1cm4gJHNjb3BlLnNlbGVjdGVkRm9sZGVyID8gdHJ1ZSA6IGZhbHNlO1xuICAgIH07XG5cbiAgICAkc2NvcGUuaXNBY3RpdmUgPSAobmF2KSA9PiB7XG4gICAgICBpZiAoYW5ndWxhci5pc1N0cmluZyhuYXYpKVxuICAgICAgICByZXR1cm4gd29ya3NwYWNlLmlzTGlua0FjdGl2ZShuYXYpO1xuICAgICAgdmFyIGZuID0gbmF2LmlzQWN0aXZlO1xuICAgICAgaWYgKGZuKSB7XG4gICAgICAgIHJldHVybiBmbih3b3Jrc3BhY2UpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHdvcmtzcGFjZS5pc0xpbmtBY3RpdmUobmF2LmhyZWYoKSk7XG4gICAgfTtcblxuICAgICRzY29wZS5zYXZlID0gKCkgPT4ge1xuICAgICAgLy8gZ2VuZXJhdGUgdGhlIG5ldyBYTUxcbiAgICAgIGlmICgkc2NvcGUubW9kaWZpZWQgJiYgJHNjb3BlLnJvb3RUcmVlTm9kZSkge1xuICAgICAgICB2YXIgeG1sTm9kZSA9IENhbWVsLmdlbmVyYXRlWG1sRnJvbUZvbGRlcigkc2NvcGUucm9vdFRyZWVOb2RlKTtcbiAgICAgICAgaWYgKHhtbE5vZGUpIHtcbiAgICAgICAgICB2YXIgdGV4dCA9IENvcmUueG1sTm9kZVRvU3RyaW5nKHhtbE5vZGUpO1xuICAgICAgICAgIGlmICh0ZXh0KSB7XG4gICAgICAgICAgICAvLyBsZXRzIHNhdmUgdGhlIGZpbGUuLi5cbiAgICAgICAgICAgIHZhciBjb21taXRNZXNzYWdlID0gJHNjb3BlLmNvbW1pdE1lc3NhZ2UgfHwgXCJVcGRhdGVkIHBhZ2UgXCIgKyAkc2NvcGUucGFnZUlkO1xuICAgICAgICAgICAgd2lraVJlcG9zaXRvcnkucHV0UGFnZSgkc2NvcGUuYnJhbmNoLCAkc2NvcGUucGFnZUlkLCB0ZXh0LCBjb21taXRNZXNzYWdlLCAoc3RhdHVzKSA9PiB7XG4gICAgICAgICAgICAgIFdpa2kub25Db21wbGV0ZShzdGF0dXMpO1xuICAgICAgICAgICAgICBDb3JlLm5vdGlmaWNhdGlvbihcInN1Y2Nlc3NcIiwgXCJTYXZlZCBcIiArICRzY29wZS5wYWdlSWQpO1xuICAgICAgICAgICAgICAkc2NvcGUubW9kaWZpZWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgZ29Ub1ZpZXcoKTtcbiAgICAgICAgICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH07XG5cbiAgICAkc2NvcGUuY2FuY2VsID0gKCkgPT4ge1xuICAgICAgbG9nLmRlYnVnKFwiY2FuY2VsbGluZy4uLlwiKTtcbiAgICAgIC8vIFRPRE8gc2hvdyBkaWFsb2cgaWYgZm9sa3MgYXJlIGFib3V0IHRvIGxvc2UgY2hhbmdlcy4uLlxuICAgIH07XG5cbiAgICAkc2NvcGUuJHdhdGNoKCd3b3Jrc3BhY2UudHJlZScsIGZ1bmN0aW9uICgpIHtcbiAgICAgIGlmICghJHNjb3BlLmdpdCkge1xuICAgICAgICAvLyBsZXRzIGRvIHRoaXMgYXN5bmNocm9ub3VzbHkgdG8gYXZvaWQgRXJyb3I6ICRkaWdlc3QgYWxyZWFkeSBpbiBwcm9ncmVzc1xuICAgICAgICAvL2xvZy5kZWJ1ZyhcIlJlbG9hZGluZyB0aGUgdmlldyBhcyB3ZSBub3cgc2VlbSB0byBoYXZlIGEgZ2l0IG1iZWFuIVwiKTtcbiAgICAgICAgc2V0VGltZW91dCh1cGRhdGVWaWV3LCA1MCk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICAkc2NvcGUuJG9uKFwiJHJvdXRlQ2hhbmdlU3VjY2Vzc1wiLCBmdW5jdGlvbiAoZXZlbnQsIGN1cnJlbnQsIHByZXZpb3VzKSB7XG4gICAgICAvLyBsZXRzIGRvIHRoaXMgYXN5bmNocm9ub3VzbHkgdG8gYXZvaWQgRXJyb3I6ICRkaWdlc3QgYWxyZWFkeSBpbiBwcm9ncmVzc1xuICAgICAgc2V0VGltZW91dCh1cGRhdGVWaWV3LCA1MCk7XG4gICAgfSk7XG5cbiAgICBmdW5jdGlvbiBnZXRGb2xkZXJYbWxOb2RlKHRyZWVOb2RlKSB7XG4gICAgICB2YXIgcm91dGVYbWxOb2RlID0gQ2FtZWwuY3JlYXRlRm9sZGVyWG1sVHJlZSh0cmVlTm9kZSwgbnVsbCk7XG4gICAgICBpZiAocm91dGVYbWxOb2RlKSB7XG4gICAgICAgICRzY29wZS5ub2RlWG1sTm9kZSA9IHJvdXRlWG1sTm9kZTtcbiAgICAgIH1cbiAgICAgIHJldHVybiByb3V0ZVhtbE5vZGU7XG4gICAgfVxuXG4gICAgJHNjb3BlLm9uTm9kZVNlbGVjdCA9IChmb2xkZXIsIHRyZWVOb2RlKSA9PiB7XG4gICAgICAkc2NvcGUuc2VsZWN0ZWRGb2xkZXIgPSBmb2xkZXI7XG4gICAgICAkc2NvcGUudHJlZU5vZGUgPSB0cmVlTm9kZTtcbiAgICAgICRzY29wZS5wcm9wZXJ0aWVzVGVtcGxhdGUgPSBudWxsO1xuICAgICAgJHNjb3BlLmRpYWdyYW1UZW1wbGF0ZSA9IG51bGw7XG4gICAgICAkc2NvcGUubm9kZVhtbE5vZGUgPSBudWxsO1xuICAgICAgaWYgKGZvbGRlcikge1xuICAgICAgICAkc2NvcGUubm9kZURhdGEgPSBDYW1lbC5nZXRSb3V0ZUZvbGRlckpTT04oZm9sZGVyKTtcbiAgICAgICAgJHNjb3BlLm5vZGVEYXRhQ2hhbmdlZEZpZWxkcyA9IHt9O1xuICAgICAgfVxuICAgICAgdmFyIG5vZGVOYW1lID0gQ2FtZWwuZ2V0Rm9sZGVyQ2FtZWxOb2RlSWQoZm9sZGVyKTtcbiAgICAgIC8vIGxldHMgbGF6aWx5IGNyZWF0ZSB0aGUgWE1MIHRyZWUgc28gaXQgY2FuIGJlIHVzZWQgYnkgdGhlIGRpYWdyYW1cbiAgICAgIHZhciByb3V0ZVhtbE5vZGUgPSBnZXRGb2xkZXJYbWxOb2RlKHRyZWVOb2RlKTtcbiAgICAgIGlmIChub2RlTmFtZSkge1xuICAgICAgICAvL3ZhciBub2RlTmFtZSA9IHJvdXRlWG1sTm9kZS5sb2NhbE5hbWU7XG4gICAgICAgICRzY29wZS5ub2RlTW9kZWwgPSBDYW1lbC5nZXRDYW1lbFNjaGVtYShub2RlTmFtZSk7XG4gICAgICAgIGlmICgkc2NvcGUubm9kZU1vZGVsKSB7XG4gICAgICAgICAgJHNjb3BlLnByb3BlcnRpZXNUZW1wbGF0ZSA9IFwicGx1Z2lucy93aWtpL2h0bWwvY2FtZWxQcm9wZXJ0aWVzRWRpdC5odG1sXCI7XG4gICAgICAgIH1cbiAgICAgICAgJHNjb3BlLmRpYWdyYW1UZW1wbGF0ZSA9IFwiYXBwL2NhbWVsL2h0bWwvcm91dGVzLmh0bWxcIjtcbiAgICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgJHNjb3BlLm9uTm9kZURyYWdFbnRlciA9IChub2RlLCBzb3VyY2VOb2RlKSA9PiB7XG4gICAgICB2YXIgbm9kZUZvbGRlciA9IG5vZGUuZGF0YTtcbiAgICAgIHZhciBzb3VyY2VGb2xkZXIgPSBzb3VyY2VOb2RlLmRhdGE7XG4gICAgICBpZiAobm9kZUZvbGRlciAmJiBzb3VyY2VGb2xkZXIpIHtcbiAgICAgICAgdmFyIG5vZGVJZCA9IENhbWVsLmdldEZvbGRlckNhbWVsTm9kZUlkKG5vZGVGb2xkZXIpO1xuICAgICAgICB2YXIgc291cmNlSWQgPSBDYW1lbC5nZXRGb2xkZXJDYW1lbE5vZGVJZChzb3VyY2VGb2xkZXIpO1xuICAgICAgICBpZiAobm9kZUlkICYmIHNvdXJjZUlkKSB7XG4gICAgICAgICAgLy8gd2UgY2FuIG9ubHkgZHJhZyByb3V0ZXMgb250byBvdGhlciByb3V0ZXMgKGJlZm9yZSAvIGFmdGVyIC8gb3ZlcilcbiAgICAgICAgICBpZiAoc291cmNlSWQgPT09IFwicm91dGVcIikge1xuICAgICAgICAgICAgcmV0dXJuIG5vZGVJZCA9PT0gXCJyb3V0ZVwiO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH07XG5cbiAgICAkc2NvcGUub25Ob2RlRHJvcCA9IChub2RlLCBzb3VyY2VOb2RlLCBoaXRNb2RlLCB1aSwgZHJhZ2dhYmxlKSA9PiB7XG4gICAgICB2YXIgbm9kZUZvbGRlciA9IG5vZGUuZGF0YTtcbiAgICAgIHZhciBzb3VyY2VGb2xkZXIgPSBzb3VyY2VOb2RlLmRhdGE7XG4gICAgICBpZiAobm9kZUZvbGRlciAmJiBzb3VyY2VGb2xkZXIpIHtcbiAgICAgICAgLy8gd2UgY2Fubm90IGRyb3AgYSByb3V0ZSBpbnRvIGEgcm91dGUgb3IgYSBub24tcm91dGUgdG8gYSB0b3AgbGV2ZWwhXG4gICAgICAgIHZhciBub2RlSWQgPSBDYW1lbC5nZXRGb2xkZXJDYW1lbE5vZGVJZChub2RlRm9sZGVyKTtcbiAgICAgICAgdmFyIHNvdXJjZUlkID0gQ2FtZWwuZ2V0Rm9sZGVyQ2FtZWxOb2RlSWQoc291cmNlRm9sZGVyKTtcblxuICAgICAgICBpZiAobm9kZUlkID09PSBcInJvdXRlXCIpIHtcbiAgICAgICAgICAvLyBoaXRNb2RlIG11c3QgYmUgXCJvdmVyXCIgaWYgd2UgYXJlIG5vdCBhbm90aGVyIHJvdXRlXG4gICAgICAgICAgaWYgKHNvdXJjZUlkID09PSBcInJvdXRlXCIpIHtcbiAgICAgICAgICAgIGlmIChoaXRNb2RlID09PSBcIm92ZXJcIikge1xuICAgICAgICAgICAgICBoaXRNb2RlID0gXCJhZnRlclwiO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBkaXNhYmxlIGJlZm9yZSAvIGFmdGVyXG4gICAgICAgICAgICBoaXRNb2RlID0gXCJvdmVyXCI7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgIGlmIChDYW1lbC5hY2NlcHRPdXRwdXQobm9kZUlkKSkge1xuICAgICAgICAgICAgaGl0TW9kZSA9IFwib3ZlclwiO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZiAoaGl0TW9kZSAhPT0gXCJiZWZvcmVcIikge1xuICAgICAgICAgICAgICBoaXRNb2RlID0gXCJhZnRlclwiO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBsb2cuZGVidWcoXCJub2RlRHJvcCBub2RlSWQ6IFwiICsgbm9kZUlkICsgXCIgc291cmNlSWQ6IFwiICsgc291cmNlSWQgKyBcIiBoaXRNb2RlOiBcIiArIGhpdE1vZGUpO1xuXG4gICAgICAgIHNvdXJjZU5vZGUubW92ZShub2RlLCBoaXRNb2RlKTtcbiAgICAgIH1cbiAgICB9O1xuXG5cbiAgICB1cGRhdGVWaWV3KCk7XG5cbiAgICBmdW5jdGlvbiBhZGROZXdOb2RlKG5vZGVNb2RlbCkge1xuICAgICAgdmFyIGRvYyA9ICRzY29wZS5kb2MgfHwgZG9jdW1lbnQ7XG4gICAgICB2YXIgcGFyZW50Rm9sZGVyID0gJHNjb3BlLnNlbGVjdGVkRm9sZGVyIHx8ICRzY29wZS5jYW1lbENvbnRleHRUcmVlO1xuICAgICAgdmFyIGtleSA9IG5vZGVNb2RlbFtcIl9pZFwiXTtcbiAgICAgIHZhciBiZWZvcmVOb2RlID0gbnVsbDtcbiAgICAgIGlmICgha2V5KSB7XG4gICAgICAgIGxvZy5kZWJ1ZyhcIldBUk5JTkc6IG5vIGlkIGZvciBtb2RlbCBcIiArIEpTT04uc3RyaW5naWZ5KG5vZGVNb2RlbCkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIHRyZWVOb2RlID0gJHNjb3BlLnRyZWVOb2RlO1xuICAgICAgICBpZiAoa2V5ID09PSBcInJvdXRlXCIpIHtcbiAgICAgICAgICAvLyBsZXRzIGFkZCB0byB0aGUgcm9vdCBvZiB0aGUgdHJlZVxuICAgICAgICAgIHRyZWVOb2RlID0gJHNjb3BlLnJvb3RUcmVlTm9kZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBpZiAoIXRyZWVOb2RlKSB7XG4gICAgICAgICAgICAvLyBsZXRzIHNlbGVjdCB0aGUgbGFzdCByb3V0ZSAtIGFuZCBjcmVhdGUgYSBuZXcgcm91dGUgaWYgbmVlZCBiZVxuICAgICAgICAgICAgdmFyIHJvb3QgPSAkc2NvcGUucm9vdFRyZWVOb2RlO1xuICAgICAgICAgICAgdmFyIGNoaWxkcmVuID0gcm9vdC5nZXRDaGlsZHJlbigpO1xuICAgICAgICAgICAgaWYgKCFjaGlsZHJlbiB8fCAhY2hpbGRyZW4ubGVuZ3RoKSB7XG4gICAgICAgICAgICAgIGFkZE5ld05vZGUoQ2FtZWwuZ2V0Q2FtZWxTY2hlbWEoXCJyb3V0ZVwiKSk7XG4gICAgICAgICAgICAgIGNoaWxkcmVuID0gcm9vdC5nZXRDaGlsZHJlbigpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGNoaWxkcmVuICYmIGNoaWxkcmVuLmxlbmd0aCkge1xuICAgICAgICAgICAgICB0cmVlTm9kZSA9IGNoaWxkcmVuW2NoaWxkcmVuLmxlbmd0aCAtIDFdO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgbG9nLmRlYnVnKFwiQ291bGQgbm90IGFkZCBhIG5ldyByb3V0ZSB0byB0aGUgZW1wdHkgdHJlZSFcIik7XG4gICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG5cblxuICAgICAgICAgIC8vIGlmIHRoZSBwYXJlbnQgZm9sZGVyIGxpa2VzIHRvIGFjdCBhcyBhIHBpcGVsaW5lLCB0aGVuIGFkZFxuICAgICAgICAgIC8vIGFmdGVyIHRoZSBwYXJlbnQsIHJhdGhlciB0aGFuIGFzIGEgY2hpbGRcbiAgICAgICAgICB2YXIgcGFyZW50SWQgPSBDYW1lbC5nZXRGb2xkZXJDYW1lbE5vZGVJZCh0cmVlTm9kZS5kYXRhKTtcbiAgICAgICAgICBpZiAoIUNhbWVsLmFjY2VwdE91dHB1dChwYXJlbnRJZCkpIHtcbiAgICAgICAgICAgIC8vIGxldHMgYWRkIHRoZSBuZXcgbm9kZSB0byB0aGUgZW5kIG9mIHRoZSBwYXJlbnRcbiAgICAgICAgICAgIGJlZm9yZU5vZGUgPSB0cmVlTm9kZS5nZXROZXh0U2libGluZygpO1xuICAgICAgICAgICAgdHJlZU5vZGUgPSB0cmVlTm9kZS5nZXRQYXJlbnQoKSB8fCB0cmVlTm9kZTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRyZWVOb2RlKSB7XG4gICAgICAgICAgdmFyIG5vZGUgPSBkb2MuY3JlYXRlRWxlbWVudChrZXkpO1xuICAgICAgICAgIHBhcmVudEZvbGRlciA9IHRyZWVOb2RlLmRhdGE7XG4gICAgICAgICAgdmFyIGFkZGVkTm9kZSA9IENhbWVsLmFkZFJvdXRlQ2hpbGQocGFyZW50Rm9sZGVyLCBub2RlKTtcbiAgICAgICAgICBpZiAoYWRkZWROb2RlKSB7XG4gICAgICAgICAgICB2YXIgYWRkZWQgPSB0cmVlTm9kZS5hZGRDaGlsZChhZGRlZE5vZGUsIGJlZm9yZU5vZGUpO1xuICAgICAgICAgICAgaWYgKGFkZGVkKSB7XG4gICAgICAgICAgICAgIGdldEZvbGRlclhtbE5vZGUoYWRkZWQpO1xuICAgICAgICAgICAgICBhZGRlZC5leHBhbmQodHJ1ZSk7XG4gICAgICAgICAgICAgIGFkZGVkLnNlbGVjdCh0cnVlKTtcbiAgICAgICAgICAgICAgYWRkZWQuYWN0aXZhdGUodHJ1ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gb25Nb2RlbENoYW5nZUV2ZW50KGV2ZW50LCBuYW1lKSB7XG4gICAgICAvLyBsZXRzIGZpbHRlciBvdXQgZXZlbnRzIGR1ZSB0byB0aGUgbm9kZSBjaGFuZ2luZyBjYXVzaW5nIHRoZVxuICAgICAgLy8gZm9ybXMgdG8gYmUgcmVjcmVhdGVkXG4gICAgICBpZiAoJHNjb3BlLm5vZGVEYXRhKSB7XG4gICAgICAgIHZhciBmaWVsZE1hcCA9ICRzY29wZS5ub2RlRGF0YUNoYW5nZWRGaWVsZHM7XG4gICAgICAgIGlmIChmaWVsZE1hcCkge1xuICAgICAgICAgIGlmIChmaWVsZE1hcFtuYW1lXSkge1xuICAgICAgICAgICAgb25Ob2RlRGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gdGhlIHNlbGVjdGlvbiBoYXMganVzdCBjaGFuZ2VkIHNvIHdlIGdldCB0aGUgaW5pdGlhbCBldmVudFxuICAgICAgICAgICAgLy8gd2UgY2FuIGlnbm9yZSB0aGlzIDopXG4gICAgICAgICAgICBmaWVsZE1hcFtuYW1lXSA9IHRydWU7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gb25Ob2RlRGF0YUNoYW5nZWQoKSB7XG4gICAgICAkc2NvcGUubW9kaWZpZWQgPSB0cnVlO1xuICAgICAgdmFyIHNlbGVjdGVkRm9sZGVyID0gJHNjb3BlLnNlbGVjdGVkRm9sZGVyO1xuICAgICAgaWYgKCRzY29wZS50cmVlTm9kZSAmJiBzZWxlY3RlZEZvbGRlcikge1xuICAgICAgICB2YXIgcm91dGVYbWxOb2RlID0gZ2V0Rm9sZGVyWG1sTm9kZSgkc2NvcGUudHJlZU5vZGUpO1xuICAgICAgICBpZiAocm91dGVYbWxOb2RlKSB7XG4gICAgICAgICAgdmFyIG5vZGVOYW1lID0gcm91dGVYbWxOb2RlLmxvY2FsTmFtZTtcbiAgICAgICAgICB2YXIgbm9kZVNldHRpbmdzID0gQ2FtZWwuZ2V0Q2FtZWxTY2hlbWEobm9kZU5hbWUpO1xuICAgICAgICAgIGlmIChub2RlU2V0dGluZ3MpIHtcbiAgICAgICAgICAgIC8vIHVwZGF0ZSB0aGUgdGl0bGUgYW5kIHRvb2x0aXAgZXRjXG4gICAgICAgICAgICBDYW1lbC51cGRhdGVSb3V0ZU5vZGVMYWJlbEFuZFRvb2x0aXAoc2VsZWN0ZWRGb2xkZXIsIHJvdXRlWG1sTm9kZSwgbm9kZVNldHRpbmdzKTtcbiAgICAgICAgICAgICRzY29wZS50cmVlTm9kZS5yZW5kZXIoZmFsc2UsIGZhbHNlKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgLy8gVE9ETyBub3Qgc3VyZSB3ZSBuZWVkIHRoaXMgdG8gYmUgaG9uZXN0XG4gICAgICAgIHNlbGVjdGVkRm9sZGVyW1wiY2FtZWxOb2RlRGF0YVwiXSA9ICRzY29wZS5ub2RlRGF0YTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBvblJlc3VsdHMocmVzcG9uc2UpIHtcbiAgICAgIHZhciB0ZXh0ID0gcmVzcG9uc2UudGV4dDtcbiAgICAgIGlmICh0ZXh0KSB7XG4gICAgICAgIC8vIGxldHMgcmVtb3ZlIGFueSBkb2RneSBjaGFyYWN0ZXJzIHNvIHdlIGNhbiB1c2UgaXQgYXMgYSBET00gaWRcbiAgICAgICAgdmFyIHRyZWUgPSBDYW1lbC5sb2FkQ2FtZWxUcmVlKHRleHQsICRzY29wZS5wYWdlSWQpO1xuICAgICAgICBpZiAodHJlZSkge1xuICAgICAgICAgICRzY29wZS5jYW1lbENvbnRleHRUcmVlID0gdHJlZTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbG9nLmRlYnVnKFwiTm8gWE1MIGZvdW5kIGZvciBwYWdlIFwiICsgJHNjb3BlLnBhZ2VJZCk7XG4gICAgICB9XG4gICAgICBDb3JlLiRhcHBseUxhdGVyKCRzY29wZSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gdXBkYXRlVmlldygpIHtcbiAgICAgICRzY29wZS5sb2FkRW5kcG9pbnROYW1lcygpO1xuICAgICAgJHNjb3BlLnBhZ2VJZCA9IFdpa2kucGFnZUlkKCRyb3V0ZVBhcmFtcywgJGxvY2F0aW9uKTtcbiAgICAgIGxvZy5kZWJ1ZyhcIkhhcyBwYWdlIGlkOiBcIiArICRzY29wZS5wYWdlSWQgKyBcIiB3aXRoICRyb3V0ZVBhcmFtcyBcIiArIEpTT04uc3RyaW5naWZ5KCRyb3V0ZVBhcmFtcykpO1xuXG4gICAgICB3aWtpUmVwb3NpdG9yeS5nZXRQYWdlKCRzY29wZS5icmFuY2gsICRzY29wZS5wYWdlSWQsICRzY29wZS5vYmplY3RJZCwgb25SZXN1bHRzKTtcbiAgICB9XG5cblxuICAgIGZ1bmN0aW9uIGdvVG9WaWV3KCkge1xuICAgICAgLy8gVE9ETyBsZXRzIG5hdmlnYXRlIHRvIHRoZSB2aWV3IGlmIHdlIGhhdmUgYSBzZXBhcmF0ZSB2aWV3IG9uZSBkYXkgOilcbiAgICAgIC8qXG4gICAgICAgaWYgKCRzY29wZS5icmVhZGNydW1icyAmJiAkc2NvcGUuYnJlYWRjcnVtYnMubGVuZ3RoID4gMSkge1xuICAgICAgIHZhciB2aWV3TGluayA9ICRzY29wZS5icmVhZGNydW1ic1skc2NvcGUuYnJlYWRjcnVtYnMubGVuZ3RoIC0gMl07XG4gICAgICAgbG9nLmRlYnVnKFwiZ29Ub1ZpZXcgaGFzIGZvdW5kIHZpZXcgXCIgKyB2aWV3TGluayk7XG4gICAgICAgdmFyIHBhdGggPSBDb3JlLnRyaW1MZWFkaW5nKHZpZXdMaW5rLCBcIiNcIik7XG4gICAgICAgJGxvY2F0aW9uLnBhdGgocGF0aCk7XG4gICAgICAgfSBlbHNlIHtcbiAgICAgICBsb2cuZGVidWcoXCJnb1RvVmlldyBoYXMgbm8gYnJlYWRjcnVtYnMhXCIpO1xuICAgICAgIH1cbiAgICAgICAqL1xuICAgIH1cblxuICAgICRzY29wZS5kb1N3aXRjaFRvQ2FudmFzVmlldyA9ICgpID0+IHtcbiAgICAgIHZhciBsaW5rID0gJGxvY2F0aW9uLnVybCgpLnJlcGxhY2UoL1xcL3Byb3BlcnRpZXNcXC8vLCAnL2NhbnZhcy8nKTtcbiAgICAgIGxvZy5kZWJ1ZyhcIkxpbms6IFwiLCBsaW5rKTtcbiAgICAgICRsb2NhdGlvbi51cmwobGluayk7XG4gICAgfTtcblxuICAgICRzY29wZS5jb25maXJtU3dpdGNoVG9DYW52YXNWaWV3ID0gKCkgPT4ge1xuICAgICAgaWYgKCRzY29wZS5tb2RpZmllZCkge1xuICAgICAgICAkc2NvcGUuc3dpdGNoVG9DYW52YXNWaWV3Lm9wZW4oKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgICRzY29wZS5kb1N3aXRjaFRvQ2FudmFzVmlldygpO1xuICAgICAgfVxuICAgIH07XG5cbiAgfV0pO1xufVxuIiwiLyoqXG4gKiBAbW9kdWxlIFdpa2lcbiAqL1xuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4vd2lraVBsdWdpbi50c1wiLz5cbm1vZHVsZSBXaWtpIHtcbiAgZXhwb3J0IHZhciBDYW1lbENhbnZhc0NvbnRyb2xsZXIgPSBfbW9kdWxlLmNvbnRyb2xsZXIoXCJXaWtpLkNhbWVsQ2FudmFzQ29udHJvbGxlclwiLCBbXCIkc2NvcGVcIiwgXCIkZWxlbWVudFwiLCBcIiRyb3V0ZVBhcmFtc1wiLCBcIiR0ZW1wbGF0ZUNhY2hlXCIsIFwiJGludGVycG9sYXRlXCIsIFwiJGxvY2F0aW9uXCIsICgkc2NvcGUsICRlbGVtZW50LCAkcm91dGVQYXJhbXMsICR0ZW1wbGF0ZUNhY2hlLCAkaW50ZXJwb2xhdGUsICRsb2NhdGlvbikgPT4ge1xuICAgIHZhciBqc1BsdW1iSW5zdGFuY2UgPSBqc1BsdW1iLmdldEluc3RhbmNlKCk7XG5cbiAgICBXaWtpLmluaXRTY29wZSgkc2NvcGUsICRyb3V0ZVBhcmFtcywgJGxvY2F0aW9uKTtcbiAgICB2YXIgd2lraVJlcG9zaXRvcnkgPSAkc2NvcGUud2lraVJlcG9zaXRvcnk7XG5cbiAgICAkc2NvcGUuYWRkRGlhbG9nID0gbmV3IFVJLkRpYWxvZygpO1xuICAgICRzY29wZS5wcm9wZXJ0aWVzRGlhbG9nID0gbmV3IFVJLkRpYWxvZygpO1xuICAgICRzY29wZS5zd2l0Y2hUb1RyZWVWaWV3ID0gbmV3IFVJLkRpYWxvZygpO1xuICAgICRzY29wZS5tb2RpZmllZCA9IGZhbHNlO1xuICAgICRzY29wZS5jYW1lbElnbm9yZUlkRm9yTGFiZWwgPSBDYW1lbC5pZ25vcmVJZEZvckxhYmVsKGxvY2FsU3RvcmFnZSk7XG4gICAgJHNjb3BlLmNhbWVsTWF4aW11bUxhYmVsV2lkdGggPSBDYW1lbC5tYXhpbXVtTGFiZWxXaWR0aChsb2NhbFN0b3JhZ2UpO1xuICAgICRzY29wZS5jYW1lbE1heGltdW1UcmFjZU9yRGVidWdCb2R5TGVuZ3RoID0gQ2FtZWwubWF4aW11bVRyYWNlT3JEZWJ1Z0JvZHlMZW5ndGgobG9jYWxTdG9yYWdlKTtcblxuICAgICRzY29wZS5mb3JtcyA9IHt9O1xuXG4gICAgJHNjb3BlLm5vZGVUZW1wbGF0ZSA9ICRpbnRlcnBvbGF0ZSgkdGVtcGxhdGVDYWNoZS5nZXQoXCJub2RlVGVtcGxhdGVcIikpO1xuXG4gICAgJHNjb3BlLiR3YXRjaChcImNhbWVsQ29udGV4dFRyZWVcIiwgKCkgPT4ge1xuICAgICAgdmFyIHRyZWUgPSAkc2NvcGUuY2FtZWxDb250ZXh0VHJlZTtcbiAgICAgICRzY29wZS5yb290Rm9sZGVyID0gdHJlZTtcbiAgICAgIC8vIG5vdyB3ZSd2ZSBnb3QgY2lkIHZhbHVlcyBpbiB0aGUgdHJlZSBhbmQgRE9NLCBsZXRzIGNyZWF0ZSBhbiBpbmRleCBzbyB3ZSBjYW4gYmluZCB0aGUgRE9NIHRvIHRoZSB0cmVlIG1vZGVsXG4gICAgICAkc2NvcGUuZm9sZGVycyA9IENhbWVsLmFkZEZvbGRlcnNUb0luZGV4KCRzY29wZS5yb290Rm9sZGVyKTtcblxuICAgICAgdmFyIGRvYyA9IENvcmUucGF0aEdldCh0cmVlLCBbXCJ4bWxEb2N1bWVudFwiXSk7XG4gICAgICBpZiAoZG9jKSB7XG4gICAgICAgICRzY29wZS5kb2MgPSBkb2M7XG4gICAgICAgIHJlbG9hZFJvdXRlSWRzKCk7XG4gICAgICAgIG9uUm91dGVTZWxlY3Rpb25DaGFuZ2VkKCk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICAkc2NvcGUuYWRkQW5kQ2xvc2VEaWFsb2cgPSAoKSA9PiB7XG4gICAgICB2YXIgbm9kZU1vZGVsID0gJHNjb3BlLnNlbGVjdGVkTm9kZU1vZGVsKCk7XG4gICAgICBpZiAobm9kZU1vZGVsKSB7XG4gICAgICAgIGFkZE5ld05vZGUobm9kZU1vZGVsKTtcbiAgICAgIH1cbiAgICAgICRzY29wZS5hZGREaWFsb2cuY2xvc2UoKTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLnJlbW92ZU5vZGUgPSAoKSA9PiB7XG4gICAgICB2YXIgZm9sZGVyID0gZ2V0U2VsZWN0ZWRPclJvdXRlRm9sZGVyKCk7XG4gICAgICBpZiAoZm9sZGVyKSB7XG4gICAgICAgIHZhciBub2RlTmFtZSA9IENhbWVsLmdldEZvbGRlckNhbWVsTm9kZUlkKGZvbGRlcik7XG4gICAgICAgIGZvbGRlci5kZXRhY2goKTtcbiAgICAgICAgaWYgKFwicm91dGVcIiA9PT0gbm9kZU5hbWUpIHtcbiAgICAgICAgICAvLyBsZXRzIGFsc28gY2xlYXIgdGhlIHNlbGVjdGVkIHJvdXRlIG5vZGVcbiAgICAgICAgICAkc2NvcGUuc2VsZWN0ZWRSb3V0ZUlkID0gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICB1cGRhdGVTZWxlY3Rpb24obnVsbCk7XG4gICAgICAgIHRyZWVNb2RpZmllZCgpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICAkc2NvcGUuZG9MYXlvdXQgPSAoKSA9PiB7XG4gICAgICAkc2NvcGUuZHJhd25Sb3V0ZUlkID0gbnVsbDtcbiAgICAgIG9uUm91dGVTZWxlY3Rpb25DaGFuZ2VkKCk7XG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIGlzUm91dGVPck5vZGUoKSB7XG4gICAgICByZXR1cm4gISRzY29wZS5zZWxlY3RlZEZvbGRlclxuICAgIH1cblxuICAgICRzY29wZS5nZXREZWxldGVUaXRsZSA9ICgpID0+IHtcbiAgICAgIGlmIChpc1JvdXRlT3JOb2RlKCkpIHtcbiAgICAgICAgcmV0dXJuIFwiRGVsZXRlIHRoaXMgcm91dGVcIjtcbiAgICAgIH1cbiAgICAgIHJldHVybiBcIkRlbGV0ZSB0aGlzIG5vZGVcIjtcbiAgICB9XG5cbiAgICAkc2NvcGUuZ2V0RGVsZXRlVGFyZ2V0ID0gKCkgPT4ge1xuICAgICAgaWYgKGlzUm91dGVPck5vZGUoKSkge1xuICAgICAgICByZXR1cm4gXCJSb3V0ZVwiO1xuICAgICAgfVxuICAgICAgcmV0dXJuIFwiTm9kZVwiO1xuICAgIH1cblxuICAgICRzY29wZS5pc0Zvcm1EaXJ0eSA9ICgpID0+IHtcbiAgICAgIGxvZy5kZWJ1ZyhcImVuZHBvaW50Rm9ybTogXCIsICRzY29wZS5lbmRwb2ludEZvcm0pO1xuICAgICAgaWYgKCRzY29wZS5lbmRwb2ludEZvcm0uJGRpcnR5KSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgICAgaWYgKCEkc2NvcGUuZm9ybXNbJ2Zvcm1FZGl0b3InXSkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gJHNjb3BlLmZvcm1zWydmb3JtRWRpdG9yJ11bJyRkaXJ0eSddO1xuICAgICAgfVxuICAgIH07XG5cbiAgICAvKiBUT0RPXG4gICAgICRzY29wZS5yZXNldEZvcm1zID0gKCkgPT4ge1xuXG4gICAgIH1cbiAgICAgKi9cblxuICAgIC8qXG4gICAgICogQ29udmVydHMgYSBwYXRoIGFuZCBhIHNldCBvZiBlbmRwb2ludCBwYXJhbWV0ZXJzIGludG8gYSBVUkkgd2UgY2FuIHRoZW4gdXNlIHRvIHN0b3JlIGluIHRoZSBYTUxcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBjcmVhdGVFbmRwb2ludFVSSShlbmRwb2ludFNjaGVtZTpzdHJpbmcsIHNsYXNoZXNUZXh0OnN0cmluZywgZW5kcG9pbnRQYXRoOnN0cmluZywgZW5kcG9pbnRQYXJhbWV0ZXJzOmFueSkge1xuICAgICAgbG9nLmRlYnVnKFwic2NoZW1lIFwiICsgZW5kcG9pbnRTY2hlbWUgKyBcIiBwYXRoIFwiICsgZW5kcG9pbnRQYXRoICsgXCIgcGFyYW1ldGVycyBcIiArIGVuZHBvaW50UGFyYW1ldGVycyk7XG4gICAgICAvLyBub3cgbGV0cyBjcmVhdGUgdGhlIG5ldyBVUkkgZnJvbSB0aGUgcGF0aCBhbmQgcGFyYW1ldGVyc1xuICAgICAgLy8gVE9ETyBzaG91bGQgd2UgdXNlIEpNWCBmb3IgdGhpcz9cbiAgICAgIHZhciB1cmkgPSAoKGVuZHBvaW50U2NoZW1lKSA/IGVuZHBvaW50U2NoZW1lICsgXCI6XCIgKyBzbGFzaGVzVGV4dCA6IFwiXCIpICsgKGVuZHBvaW50UGF0aCA/IGVuZHBvaW50UGF0aCA6IFwiXCIpO1xuICAgICAgdmFyIHBhcmFtVGV4dCA9IENvcmUuaGFzaFRvU3RyaW5nKGVuZHBvaW50UGFyYW1ldGVycyk7XG4gICAgICBpZiAocGFyYW1UZXh0KSB7XG4gICAgICAgIHVyaSArPSBcIj9cIiArIHBhcmFtVGV4dDtcbiAgICAgIH1cbiAgICAgIHJldHVybiB1cmk7XG4gICAgfVxuXG4gICAgJHNjb3BlLnVwZGF0ZVByb3BlcnRpZXMgPSAoKSA9PiB7XG4gICAgICBsb2cuaW5mbyhcIm9sZCBVUkkgaXMgXCIgKyAkc2NvcGUubm9kZURhdGEudXJpKTtcbiAgICAgIHZhciB1cmkgPSBjcmVhdGVFbmRwb2ludFVSSSgkc2NvcGUuZW5kcG9pbnRTY2hlbWUsICgkc2NvcGUuZW5kcG9pbnRQYXRoSGFzU2xhc2hlcyA/IFwiLy9cIiA6IFwiXCIpLCAkc2NvcGUuZW5kcG9pbnRQYXRoLCAkc2NvcGUuZW5kcG9pbnRQYXJhbWV0ZXJzKTtcbiAgICAgIGxvZy5pbmZvKFwibmV3IFVSSSBpcyBcIiArIHVyaSk7XG4gICAgICBpZiAodXJpKSB7XG4gICAgICAgICRzY29wZS5ub2RlRGF0YS51cmkgPSB1cmk7XG4gICAgICB9XG5cbiAgICAgIHZhciBrZXkgPSBudWxsO1xuICAgICAgdmFyIHNlbGVjdGVkRm9sZGVyID0gJHNjb3BlLnNlbGVjdGVkRm9sZGVyO1xuICAgICAgaWYgKHNlbGVjdGVkRm9sZGVyKSB7XG4gICAgICAgIGtleSA9IHNlbGVjdGVkRm9sZGVyLmtleTtcblxuICAgICAgICAvLyBsZXRzIGRlbGV0ZSB0aGUgY3VycmVudCBzZWxlY3RlZCBub2RlJ3MgZGl2IHNvIGl0cyB1cGRhdGVkIHdpdGggdGhlIG5ldyB0ZW1wbGF0ZSB2YWx1ZXNcbiAgICAgICAgdmFyIGVsZW1lbnRzID0gJGVsZW1lbnQuZmluZChcIi5jYW52YXNcIikuZmluZChcIltpZD0nXCIgKyBrZXkgKyBcIiddXCIpLmZpcnN0KCkucmVtb3ZlKCk7XG4gICAgICB9XG5cbiAgICAgIHRyZWVNb2RpZmllZCgpO1xuXG4gICAgICBpZiAoa2V5KSB7XG4gICAgICAgIHVwZGF0ZVNlbGVjdGlvbihrZXkpXG4gICAgICB9XG5cbiAgICAgIGlmICgkc2NvcGUuaXNGb3JtRGlydHkoKSkge1xuICAgICAgICAkc2NvcGUuZW5kcG9pbnRGb3JtLiRzZXRQcmlzdGluZSgpO1xuICAgICAgICBpZiAoJHNjb3BlLmZvcm1zWydmb3JtRWRpdG9yJ10pIHtcbiAgICAgICAgICAkc2NvcGUuZm9ybXNbJ2Zvcm1FZGl0b3InXS4kc2V0UHJpc3RpbmUoKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBDb3JlLiRhcHBseSgkc2NvcGUpO1xuICAgIH07XG5cbiAgICAkc2NvcGUuc2F2ZSA9ICgpID0+IHtcbiAgICAgIC8vIGdlbmVyYXRlIHRoZSBuZXcgWE1MXG4gICAgICBpZiAoJHNjb3BlLm1vZGlmaWVkICYmICRzY29wZS5yb290Rm9sZGVyKSB7XG4gICAgICAgIHZhciB4bWxOb2RlID0gQ2FtZWwuZ2VuZXJhdGVYbWxGcm9tRm9sZGVyKCRzY29wZS5yb290Rm9sZGVyKTtcbiAgICAgICAgaWYgKHhtbE5vZGUpIHtcbiAgICAgICAgICB2YXIgdGV4dCA9IENvcmUueG1sTm9kZVRvU3RyaW5nKHhtbE5vZGUpO1xuICAgICAgICAgIGlmICh0ZXh0KSB7XG4gICAgICAgICAgICB2YXIgZGVjb2RlZCA9IGRlY29kZVVSSUNvbXBvbmVudCh0ZXh0KTtcbiAgICAgICAgICAgIGxvZy5kZWJ1ZyhcIlNhdmluZyB4bWwgZGVjb2RlZDogXCIgKyBkZWNvZGVkKTtcblxuICAgICAgICAgICAgLy8gbGV0cyBzYXZlIHRoZSBmaWxlLi4uXG4gICAgICAgICAgICB2YXIgY29tbWl0TWVzc2FnZSA9ICRzY29wZS5jb21taXRNZXNzYWdlIHx8IFwiVXBkYXRlZCBwYWdlIFwiICsgJHNjb3BlLnBhZ2VJZDtcbiAgICAgICAgICAgIHdpa2lSZXBvc2l0b3J5LnB1dFBhZ2UoJHNjb3BlLmJyYW5jaCwgJHNjb3BlLnBhZ2VJZCwgZGVjb2RlZCwgY29tbWl0TWVzc2FnZSwgKHN0YXR1cykgPT4ge1xuICAgICAgICAgICAgICBXaWtpLm9uQ29tcGxldGUoc3RhdHVzKTtcbiAgICAgICAgICAgICAgQ29yZS5ub3RpZmljYXRpb24oXCJzdWNjZXNzXCIsIFwiU2F2ZWQgXCIgKyAkc2NvcGUucGFnZUlkKTtcbiAgICAgICAgICAgICAgJHNjb3BlLm1vZGlmaWVkID0gZmFsc2U7XG4gICAgICAgICAgICAgIGdvVG9WaWV3KCk7XG4gICAgICAgICAgICAgIENvcmUuJGFwcGx5KCRzY29wZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9O1xuXG4gICAgJHNjb3BlLmNhbmNlbCA9ICgpID0+IHtcbiAgICAgIGxvZy5kZWJ1ZyhcImNhbmNlbGxpbmcuLi5cIik7XG4gICAgICAvLyBUT0RPIHNob3cgZGlhbG9nIGlmIGZvbGtzIGFyZSBhYm91dCB0byBsb3NlIGNoYW5nZXMuLi5cbiAgICB9O1xuXG4gICAgJHNjb3BlLiR3YXRjaChcInNlbGVjdGVkUm91dGVJZFwiLCBvblJvdXRlU2VsZWN0aW9uQ2hhbmdlZCk7XG5cbiAgICBmdW5jdGlvbiBnb1RvVmlldygpIHtcbiAgICAgIC8vIFRPRE8gbGV0cyBuYXZpZ2F0ZSB0byB0aGUgdmlldyBpZiB3ZSBoYXZlIGEgc2VwYXJhdGUgdmlldyBvbmUgZGF5IDopXG4gICAgICAvKlxuICAgICAgIGlmICgkc2NvcGUuYnJlYWRjcnVtYnMgJiYgJHNjb3BlLmJyZWFkY3J1bWJzLmxlbmd0aCA+IDEpIHtcbiAgICAgICB2YXIgdmlld0xpbmsgPSAkc2NvcGUuYnJlYWRjcnVtYnNbJHNjb3BlLmJyZWFkY3J1bWJzLmxlbmd0aCAtIDJdO1xuICAgICAgIGxvZy5kZWJ1ZyhcImdvVG9WaWV3IGhhcyBmb3VuZCB2aWV3IFwiICsgdmlld0xpbmspO1xuICAgICAgIHZhciBwYXRoID0gQ29yZS50cmltTGVhZGluZyh2aWV3TGluaywgXCIjXCIpO1xuICAgICAgICRsb2NhdGlvbi5wYXRoKHBhdGgpO1xuICAgICAgIH0gZWxzZSB7XG4gICAgICAgbG9nLmRlYnVnKFwiZ29Ub1ZpZXcgaGFzIG5vIGJyZWFkY3J1bWJzIVwiKTtcbiAgICAgICB9XG4gICAgICAgKi9cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBhZGROZXdOb2RlKG5vZGVNb2RlbCkge1xuICAgICAgdmFyIGRvYyA9ICRzY29wZS5kb2MgfHwgZG9jdW1lbnQ7XG4gICAgICB2YXIgcGFyZW50Rm9sZGVyID0gJHNjb3BlLnNlbGVjdGVkRm9sZGVyIHx8ICRzY29wZS5yb290Rm9sZGVyO1xuICAgICAgdmFyIGtleSA9IG5vZGVNb2RlbFtcIl9pZFwiXTtcbiAgICAgIGlmICgha2V5KSB7XG4gICAgICAgIGxvZy5kZWJ1ZyhcIldBUk5JTkc6IG5vIGlkIGZvciBtb2RlbCBcIiArIEpTT04uc3RyaW5naWZ5KG5vZGVNb2RlbCkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIHRyZWVOb2RlID0gJHNjb3BlLnNlbGVjdGVkRm9sZGVyO1xuICAgICAgICBpZiAoa2V5ID09PSBcInJvdXRlXCIpIHtcbiAgICAgICAgICAvLyBsZXRzIGFkZCB0byB0aGUgcm9vdCBvZiB0aGUgdHJlZVxuICAgICAgICAgIHRyZWVOb2RlID0gJHNjb3BlLnJvb3RGb2xkZXI7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgaWYgKCF0cmVlTm9kZSkge1xuICAgICAgICAgICAgLy8gbGV0cyBzZWxlY3QgdGhlIGxhc3Qgcm91dGUgLSBhbmQgY3JlYXRlIGEgbmV3IHJvdXRlIGlmIG5lZWQgYmVcbiAgICAgICAgICAgIHZhciByb290ID0gJHNjb3BlLnJvb3RGb2xkZXI7XG4gICAgICAgICAgICB2YXIgY2hpbGRyZW4gPSByb290LmNoaWxkcmVuO1xuICAgICAgICAgICAgaWYgKCFjaGlsZHJlbiB8fCAhY2hpbGRyZW4ubGVuZ3RoKSB7XG4gICAgICAgICAgICAgIGFkZE5ld05vZGUoQ2FtZWwuZ2V0Q2FtZWxTY2hlbWEoXCJyb3V0ZVwiKSk7XG4gICAgICAgICAgICAgIGNoaWxkcmVuID0gcm9vdC5jaGlsZHJlbjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChjaGlsZHJlbiAmJiBjaGlsZHJlbi5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgdHJlZU5vZGUgPSBnZXRSb3V0ZUZvbGRlcigkc2NvcGUucm9vdEZvbGRlciwgJHNjb3BlLnNlbGVjdGVkUm91dGVJZCkgfHwgY2hpbGRyZW5bY2hpbGRyZW4ubGVuZ3RoIC0gMV07XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBsb2cuZGVidWcoXCJDb3VsZCBub3QgYWRkIGEgbmV3IHJvdXRlIHRvIHRoZSBlbXB0eSB0cmVlIVwiKTtcbiAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vIGlmIHRoZSBwYXJlbnQgZm9sZGVyIGxpa2VzIHRvIGFjdCBhcyBhIHBpcGVsaW5lLCB0aGVuIGFkZFxuICAgICAgICAgIC8vIGFmdGVyIHRoZSBwYXJlbnQsIHJhdGhlciB0aGFuIGFzIGEgY2hpbGRcbiAgICAgICAgICB2YXIgcGFyZW50VHlwZU5hbWUgPSBDYW1lbC5nZXRGb2xkZXJDYW1lbE5vZGVJZCh0cmVlTm9kZSk7XG4gICAgICAgICAgaWYgKCFDYW1lbC5hY2NlcHRPdXRwdXQocGFyZW50VHlwZU5hbWUpKSB7XG4gICAgICAgICAgICB0cmVlTm9kZSA9IHRyZWVOb2RlLnBhcmVudCB8fCB0cmVlTm9kZTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRyZWVOb2RlKSB7XG4gICAgICAgICAgdmFyIG5vZGUgPSBkb2MuY3JlYXRlRWxlbWVudChrZXkpO1xuICAgICAgICAgIHBhcmVudEZvbGRlciA9IHRyZWVOb2RlO1xuICAgICAgICAgIHZhciBhZGRlZE5vZGUgPSBDYW1lbC5hZGRSb3V0ZUNoaWxkKHBhcmVudEZvbGRlciwgbm9kZSk7XG4gICAgICAgICAgLy8gVE9ETyBhZGQgdGhlIHNjaGVtYSBoZXJlIGZvciBhbiBlbGVtZW50Pz9cbiAgICAgICAgICAvLyBvciBkZWZhdWx0IHRoZSBkYXRhIG9yIHNvbWV0aGluZ1xuXG4gICAgICAgICAgdmFyIG5vZGVEYXRhID0ge1xuICAgICAgICAgIH07XG4gICAgICAgICAgaWYgKGtleSA9PT0gXCJlbmRwb2ludFwiICYmICRzY29wZS5lbmRwb2ludENvbmZpZykge1xuICAgICAgICAgICAgdmFyIGtleSA9ICRzY29wZS5lbmRwb2ludENvbmZpZy5rZXk7XG4gICAgICAgICAgICBpZiAoa2V5KSB7XG4gICAgICAgICAgICAgIG5vZGVEYXRhW1widXJpXCJdID0ga2V5ICsgXCI6XCI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGFkZGVkTm9kZVtcImNhbWVsTm9kZURhdGFcIl0gPSBub2RlRGF0YTtcbiAgICAgICAgICBhZGRlZE5vZGVbXCJlbmRwb2ludENvbmZpZ1wiXSA9ICRzY29wZS5lbmRwb2ludENvbmZpZztcblxuICAgICAgICAgIGlmIChrZXkgPT09IFwicm91dGVcIikge1xuICAgICAgICAgICAgLy8gbGV0cyBnZW5lcmF0ZSBhIG5ldyByb3V0ZUlkIGFuZCBzd2l0Y2ggdG8gaXRcbiAgICAgICAgICAgIHZhciBjb3VudCA9ICRzY29wZS5yb3V0ZUlkcy5sZW5ndGg7XG4gICAgICAgICAgICB2YXIgbm9kZUlkID0gbnVsbDtcbiAgICAgICAgICAgIHdoaWxlICh0cnVlKSB7XG4gICAgICAgICAgICAgIG5vZGVJZCA9IFwicm91dGVcIiArICgrK2NvdW50KTtcbiAgICAgICAgICAgICAgaWYgKCEkc2NvcGUucm91dGVJZHMuZmluZChub2RlSWQpKSB7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGFkZGVkTm9kZVtcInJvdXRlWG1sTm9kZVwiXS5zZXRBdHRyaWJ1dGUoXCJpZFwiLCBub2RlSWQpO1xuICAgICAgICAgICAgJHNjb3BlLnNlbGVjdGVkUm91dGVJZCA9IG5vZGVJZDtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHRyZWVNb2RpZmllZCgpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHRyZWVNb2RpZmllZChyZXBvc2l0aW9uID0gdHJ1ZSkge1xuICAgICAgLy8gbGV0cyByZWNyZWF0ZSB0aGUgWE1MIG1vZGVsIGZyb20gdGhlIHVwZGF0ZSBGb2xkZXIgdHJlZVxuICAgICAgdmFyIG5ld0RvYyA9IENhbWVsLmdlbmVyYXRlWG1sRnJvbUZvbGRlcigkc2NvcGUucm9vdEZvbGRlcik7XG4gICAgICB2YXIgdHJlZSA9IENhbWVsLmxvYWRDYW1lbFRyZWUobmV3RG9jLCAkc2NvcGUucGFnZUlkKTtcbiAgICAgIGlmICh0cmVlKSB7XG4gICAgICAgICRzY29wZS5yb290Rm9sZGVyID0gdHJlZTtcbiAgICAgICAgJHNjb3BlLmRvYyA9IENvcmUucGF0aEdldCh0cmVlLCBbXCJ4bWxEb2N1bWVudFwiXSk7XG4gICAgICB9XG4gICAgICAkc2NvcGUubW9kaWZpZWQgPSB0cnVlO1xuICAgICAgcmVsb2FkUm91dGVJZHMoKTtcbiAgICAgICRzY29wZS5kb0xheW91dCgpO1xuICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICB9XG5cblxuICAgIGZ1bmN0aW9uIHJlbG9hZFJvdXRlSWRzKCkge1xuICAgICAgJHNjb3BlLnJvdXRlSWRzID0gW107XG4gICAgICB2YXIgZG9jID0gJCgkc2NvcGUuZG9jKTtcbiAgICAgICRzY29wZS5jYW1lbFNlbGVjdGlvbkRldGFpbHMuc2VsZWN0ZWRDYW1lbENvbnRleHRJZCA9IGRvYy5maW5kKFwiY2FtZWxDb250ZXh0XCIpLmF0dHIoXCJpZFwiKTtcbiAgICAgIGRvYy5maW5kKFwicm91dGVcIikuZWFjaCgoaWR4LCByb3V0ZSkgPT4ge1xuICAgICAgICB2YXIgaWQgPSByb3V0ZS5nZXRBdHRyaWJ1dGUoXCJpZFwiKTtcbiAgICAgICAgaWYgKGlkKSB7XG4gICAgICAgICAgJHNjb3BlLnJvdXRlSWRzLnB1c2goaWQpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBvblJvdXRlU2VsZWN0aW9uQ2hhbmdlZCgpIHtcbiAgICAgIGlmICgkc2NvcGUuZG9jKSB7XG4gICAgICAgIGlmICghJHNjb3BlLnNlbGVjdGVkUm91dGVJZCAmJiAkc2NvcGUucm91dGVJZHMgJiYgJHNjb3BlLnJvdXRlSWRzLmxlbmd0aCkge1xuICAgICAgICAgICRzY29wZS5zZWxlY3RlZFJvdXRlSWQgPSAkc2NvcGUucm91dGVJZHNbMF07XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCRzY29wZS5zZWxlY3RlZFJvdXRlSWQgJiYgJHNjb3BlLnNlbGVjdGVkUm91dGVJZCAhPT0gJHNjb3BlLmRyYXduUm91dGVJZCkge1xuICAgICAgICAgIHZhciBub2RlcyA9IFtdO1xuICAgICAgICAgIHZhciBsaW5rcyA9IFtdO1xuICAgICAgICAgIENhbWVsLmxvYWRSb3V0ZVhtbE5vZGVzKCRzY29wZSwgJHNjb3BlLmRvYywgJHNjb3BlLnNlbGVjdGVkUm91dGVJZCwgbm9kZXMsIGxpbmtzLCBnZXRXaWR0aCgpKTtcbiAgICAgICAgICB1cGRhdGVTZWxlY3Rpb24oJHNjb3BlLnNlbGVjdGVkUm91dGVJZCk7XG4gICAgICAgICAgLy8gbm93IHdlJ3ZlIGdvdCBjaWQgdmFsdWVzIGluIHRoZSB0cmVlIGFuZCBET00sIGxldHMgY3JlYXRlIGFuIGluZGV4IHNvIHdlIGNhbiBiaW5kIHRoZSBET00gdG8gdGhlIHRyZWUgbW9kZWxcbiAgICAgICAgICAkc2NvcGUuZm9sZGVycyA9IENhbWVsLmFkZEZvbGRlcnNUb0luZGV4KCRzY29wZS5yb290Rm9sZGVyKTtcbiAgICAgICAgICBzaG93R3JhcGgobm9kZXMsIGxpbmtzKTtcbiAgICAgICAgICAkc2NvcGUuZHJhd25Sb3V0ZUlkID0gJHNjb3BlLnNlbGVjdGVkUm91dGVJZDtcbiAgICAgICAgfVxuICAgICAgICAkc2NvcGUuY2FtZWxTZWxlY3Rpb25EZXRhaWxzLnNlbGVjdGVkUm91dGVJZCA9ICRzY29wZS5zZWxlY3RlZFJvdXRlSWQ7XG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc2hvd0dyYXBoKG5vZGVzLCBsaW5rcykge1xuICAgICAgbGF5b3V0R3JhcGgobm9kZXMsIGxpbmtzKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXROb2RlSWQobm9kZSkge1xuICAgICAgaWYgKGFuZ3VsYXIuaXNOdW1iZXIobm9kZSkpIHtcbiAgICAgICAgdmFyIGlkeCA9IG5vZGU7XG4gICAgICAgIG5vZGUgPSAkc2NvcGUubm9kZVN0YXRlc1tpZHhdO1xuICAgICAgICBpZiAoIW5vZGUpIHtcbiAgICAgICAgICBsb2cuZGVidWcoXCJDYW50IGZpbmQgbm9kZSBhdCBcIiArIGlkeCk7XG4gICAgICAgICAgcmV0dXJuIFwibm9kZS1cIiArIGlkeDtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIG5vZGUuY2lkIHx8IFwibm9kZS1cIiArIG5vZGUuaWQ7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0U2VsZWN0ZWRPclJvdXRlRm9sZGVyKCkge1xuICAgICAgcmV0dXJuICRzY29wZS5zZWxlY3RlZEZvbGRlciB8fCBnZXRSb3V0ZUZvbGRlcigkc2NvcGUucm9vdEZvbGRlciwgJHNjb3BlLnNlbGVjdGVkUm91dGVJZCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0Q29udGFpbmVyRWxlbWVudCgpIHtcbiAgICAgIHZhciByb290RWxlbWVudCA9ICRlbGVtZW50O1xuICAgICAgdmFyIGNvbnRhaW5lckVsZW1lbnQgPSByb290RWxlbWVudC5maW5kKFwiLmNhbnZhc1wiKTtcbiAgICAgIGlmICghY29udGFpbmVyRWxlbWVudCB8fCAhY29udGFpbmVyRWxlbWVudC5sZW5ndGgpIGNvbnRhaW5lckVsZW1lbnQgPSByb290RWxlbWVudDtcbiAgICAgIHJldHVybiBjb250YWluZXJFbGVtZW50O1xuICAgIH1cblxuICAgIC8vIGNvbmZpZ3VyZSBjYW52YXMgbGF5b3V0IGFuZCBzdHlsZXNcbiAgICB2YXIgZW5kcG9pbnRTdHlsZTphbnlbXSA9IFtcIkRvdFwiLCB7IHJhZGl1czogNCwgY3NzQ2xhc3M6ICdjYW1lbC1jYW52YXMtZW5kcG9pbnQnIH1dO1xuICAgIHZhciBob3ZlclBhaW50U3R5bGUgPSB7IHN0cm9rZVN0eWxlOiBcInJlZFwiLCBsaW5lV2lkdGg6IDMgfTtcbiAgICAvL3ZhciBsYWJlbFN0eWxlczogYW55W10gPSBbIFwiTGFiZWxcIiwgeyBsYWJlbDpcIkZPT1wiLCBpZDpcImxhYmVsXCIgfV07XG4gICAgdmFyIGxhYmVsU3R5bGVzOmFueVtdID0gWyBcIkxhYmVsXCIgXTtcbiAgICB2YXIgYXJyb3dTdHlsZXM6YW55W10gPSBbIFwiQXJyb3dcIiwge1xuICAgICAgbG9jYXRpb246IDEsXG4gICAgICBpZDogXCJhcnJvd1wiLFxuICAgICAgbGVuZ3RoOiA4LFxuICAgICAgd2lkdGg6IDgsXG4gICAgICBmb2xkYmFjazogMC44XG4gICAgfSBdO1xuICAgIHZhciBjb25uZWN0b3JTdHlsZTphbnlbXSA9IFsgXCJTdGF0ZU1hY2hpbmVcIiwgeyBjdXJ2aW5lc3M6IDEwLCBwcm94aW1pdHlMaW1pdDogNTAgfSBdO1xuXG4gICAganNQbHVtYkluc3RhbmNlLmltcG9ydERlZmF1bHRzKHtcbiAgICAgIEVuZHBvaW50OiBlbmRwb2ludFN0eWxlLFxuICAgICAgSG92ZXJQYWludFN0eWxlOiBob3ZlclBhaW50U3R5bGUsXG4gICAgICBDb25uZWN0aW9uT3ZlcmxheXM6IFtcbiAgICAgICAgYXJyb3dTdHlsZXMsXG4gICAgICAgIGxhYmVsU3R5bGVzXG4gICAgICBdXG4gICAgfSk7XG5cbiAgICAkc2NvcGUuJG9uKCckZGVzdHJveScsICgpID0+IHtcbiAgICAgIGpzUGx1bWJJbnN0YW5jZS5yZXNldCgpO1xuICAgICAgZGVsZXRlIGpzUGx1bWJJbnN0YW5jZTtcbiAgICB9KTtcblxuICAgIC8vIGRvdWJsZSBjbGljayBvbiBhbnkgY29ubmVjdGlvblxuICAgIGpzUGx1bWJJbnN0YW5jZS5iaW5kKFwiZGJsY2xpY2tcIiwgZnVuY3Rpb24gKGNvbm5lY3Rpb24sIG9yaWdpbmFsRXZlbnQpIHtcbiAgICAgIGlmIChqc1BsdW1iSW5zdGFuY2UuaXNTdXNwZW5kRHJhd2luZygpKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGFsZXJ0KFwiZG91YmxlIGNsaWNrIG9uIGNvbm5lY3Rpb24gZnJvbSBcIiArIGNvbm5lY3Rpb24uc291cmNlSWQgKyBcIiB0byBcIiArIGNvbm5lY3Rpb24udGFyZ2V0SWQpO1xuICAgIH0pO1xuXG4gICAganNQbHVtYkluc3RhbmNlLmJpbmQoJ2Nvbm5lY3Rpb24nLCBmdW5jdGlvbiAoaW5mbywgZXZ0KSB7XG4gICAgICAvL2xvZy5kZWJ1ZyhcIkNvbm5lY3Rpb24gZXZlbnQ6IFwiLCBpbmZvKTtcbiAgICAgIGxvZy5kZWJ1ZyhcIkNyZWF0aW5nIGNvbm5lY3Rpb24gZnJvbSBcIiwgaW5mby5zb3VyY2VJZCwgXCIgdG8gXCIsIGluZm8udGFyZ2V0SWQpO1xuICAgICAgdmFyIGxpbmsgPSBnZXRMaW5rKGluZm8pO1xuICAgICAgdmFyIHNvdXJjZSA9ICRzY29wZS5ub2Rlc1tsaW5rLnNvdXJjZV07XG4gICAgICB2YXIgc291cmNlRm9sZGVyID0gJHNjb3BlLmZvbGRlcnNbbGluay5zb3VyY2VdO1xuICAgICAgdmFyIHRhcmdldEZvbGRlciA9ICRzY29wZS5mb2xkZXJzW2xpbmsudGFyZ2V0XTtcbiAgICAgIGlmIChDYW1lbC5pc05leHRTaWJsaW5nQWRkZWRBc0NoaWxkKHNvdXJjZS50eXBlKSkge1xuICAgICAgICBzb3VyY2VGb2xkZXIubW92ZUNoaWxkKHRhcmdldEZvbGRlcik7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzb3VyY2VGb2xkZXIucGFyZW50Lmluc2VydEFmdGVyKHRhcmdldEZvbGRlciwgc291cmNlRm9sZGVyKTtcbiAgICAgIH1cbiAgICAgIHRyZWVNb2RpZmllZCgpO1xuICAgIH0pO1xuXG4gICAgLy8gbGV0cyBkZWxldGUgY29ubmVjdGlvbnMgb24gY2xpY2tcbiAgICBqc1BsdW1iSW5zdGFuY2UuYmluZChcImNsaWNrXCIsIGZ1bmN0aW9uIChjKSB7XG4gICAgICBpZiAoanNQbHVtYkluc3RhbmNlLmlzU3VzcGVuZERyYXdpbmcoKSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBqc1BsdW1iSW5zdGFuY2UuZGV0YWNoKGMpO1xuICAgIH0pO1xuXG4gICAgZnVuY3Rpb24gbGF5b3V0R3JhcGgobm9kZXMsIGxpbmtzKSB7XG4gICAgICB2YXIgdHJhbnNpdGlvbnMgPSBbXTtcbiAgICAgIHZhciBzdGF0ZXMgPSBDb3JlLmNyZWF0ZUdyYXBoU3RhdGVzKG5vZGVzLCBsaW5rcywgdHJhbnNpdGlvbnMpO1xuXG4gICAgICBsb2cuZGVidWcoXCJsaW5rczogXCIsIGxpbmtzKTtcbiAgICAgIGxvZy5kZWJ1ZyhcInRyYW5zaXRpb25zOiBcIiwgdHJhbnNpdGlvbnMpO1xuXG4gICAgICAkc2NvcGUubm9kZVN0YXRlcyA9IHN0YXRlcztcbiAgICAgIHZhciBjb250YWluZXJFbGVtZW50ID0gZ2V0Q29udGFpbmVyRWxlbWVudCgpO1xuXG4gICAgICBqc1BsdW1iSW5zdGFuY2UuZG9XaGlsZVN1c3BlbmRlZCgoKSA9PiB7XG5cbiAgICAgICAgLy9zZXQgb3VyIGNvbnRhaW5lciB0byBzb21lIGFyYml0cmFyeSBpbml0aWFsIHNpemVcbiAgICAgICAgY29udGFpbmVyRWxlbWVudC5jc3Moe1xuICAgICAgICAgICd3aWR0aCc6ICc4MDBweCcsXG4gICAgICAgICAgJ2hlaWdodCc6ICc4MDBweCcsXG4gICAgICAgICAgJ21pbi1oZWlnaHQnOiAnODAwcHgnLFxuICAgICAgICAgICdtaW4td2lkdGgnOiAnODAwcHgnXG4gICAgICAgIH0pO1xuICAgICAgICB2YXIgY29udGFpbmVySGVpZ2h0ID0gMDtcbiAgICAgICAgdmFyIGNvbnRhaW5lcldpZHRoID0gMDtcblxuICAgICAgICBjb250YWluZXJFbGVtZW50LmZpbmQoJ2Rpdi5jb21wb25lbnQnKS5lYWNoKChpLCBlbCkgPT4ge1xuICAgICAgICAgIGxvZy5kZWJ1ZyhcIkNoZWNraW5nOiBcIiwgZWwsIFwiIFwiLCBpKTtcbiAgICAgICAgICBpZiAoIXN0YXRlcy5hbnkoKG5vZGUpID0+IHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZWwuaWQgPT09IGdldE5vZGVJZChub2RlKTtcbiAgICAgICAgICAgICAgfSkpIHtcbiAgICAgICAgICAgIGxvZy5kZWJ1ZyhcIlJlbW92aW5nIGVsZW1lbnQ6IFwiLCBlbC5pZCk7XG4gICAgICAgICAgICBqc1BsdW1iSW5zdGFuY2UucmVtb3ZlKGVsKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGFuZ3VsYXIuZm9yRWFjaChzdGF0ZXMsIChub2RlKSA9PiB7XG4gICAgICAgICAgbG9nLmRlYnVnKFwibm9kZTogXCIsIG5vZGUpO1xuICAgICAgICAgIHZhciBpZCA9IGdldE5vZGVJZChub2RlKTtcbiAgICAgICAgICB2YXIgZGl2ID0gY29udGFpbmVyRWxlbWVudC5maW5kKCcjJyArIGlkKTtcblxuICAgICAgICAgIGlmICghZGl2WzBdKSB7XG4gICAgICAgICAgICBkaXYgPSAkKCRzY29wZS5ub2RlVGVtcGxhdGUoe1xuICAgICAgICAgICAgICBpZDogaWQsXG4gICAgICAgICAgICAgIG5vZGU6IG5vZGVcbiAgICAgICAgICAgIH0pKTtcbiAgICAgICAgICAgIGRpdi5hcHBlbmRUbyhjb250YWluZXJFbGVtZW50KTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyBNYWtlIHRoZSBub2RlIGEganNwbHVtYiBzb3VyY2VcbiAgICAgICAgICBqc1BsdW1iSW5zdGFuY2UubWFrZVNvdXJjZShkaXYsIHtcbiAgICAgICAgICAgIGZpbHRlcjogXCJpbWcubm9kZUljb25cIixcbiAgICAgICAgICAgIGFuY2hvcjogXCJDb250aW51b3VzXCIsXG4gICAgICAgICAgICBjb25uZWN0b3I6IGNvbm5lY3RvclN0eWxlLFxuICAgICAgICAgICAgY29ubmVjdG9yU3R5bGU6IHsgc3Ryb2tlU3R5bGU6IFwiIzY2NlwiLCBsaW5lV2lkdGg6IDMgfSxcbiAgICAgICAgICAgIG1heENvbm5lY3Rpb25zOiAtMVxuICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgLy8gYW5kIGFsc28gYSBqc3BsdW1iIHRhcmdldFxuICAgICAgICAgIGpzUGx1bWJJbnN0YW5jZS5tYWtlVGFyZ2V0KGRpdiwge1xuICAgICAgICAgICAgZHJvcE9wdGlvbnM6IHsgaG92ZXJDbGFzczogXCJkcmFnSG92ZXJcIiB9LFxuICAgICAgICAgICAgYW5jaG9yOiBcIkNvbnRpbnVvdXNcIlxuICAgICAgICAgIH0pO1xuXG4gICAgICAgICAganNQbHVtYkluc3RhbmNlLmRyYWdnYWJsZShkaXYsIHtcbiAgICAgICAgICAgIGNvbnRhaW5tZW50OiAnLmNhbWVsLWNhbnZhcydcbiAgICAgICAgICB9KTtcblxuICAgICAgICAgIC8vIGFkZCBldmVudCBoYW5kbGVycyB0byB0aGlzIG5vZGVcbiAgICAgICAgICBkaXYuY2xpY2soZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIG5ld0ZsYWcgPSAhZGl2Lmhhc0NsYXNzKFwic2VsZWN0ZWRcIik7XG4gICAgICAgICAgICBjb250YWluZXJFbGVtZW50LmZpbmQoJ2Rpdi5jb21wb25lbnQnKS50b2dnbGVDbGFzcyhcInNlbGVjdGVkXCIsIGZhbHNlKTtcbiAgICAgICAgICAgIGRpdi50b2dnbGVDbGFzcyhcInNlbGVjdGVkXCIsIG5ld0ZsYWcpO1xuICAgICAgICAgICAgdmFyIGlkID0gZGl2LmF0dHIoXCJpZFwiKTtcbiAgICAgICAgICAgIHVwZGF0ZVNlbGVjdGlvbihuZXdGbGFnID8gaWQgOiBudWxsKTtcbiAgICAgICAgICAgIENvcmUuJGFwcGx5KCRzY29wZSk7XG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgICBkaXYuZGJsY2xpY2soZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIGlkID0gZGl2LmF0dHIoXCJpZFwiKTtcbiAgICAgICAgICAgIHVwZGF0ZVNlbGVjdGlvbihpZCk7XG4gICAgICAgICAgICAvLyRzY29wZS5wcm9wZXJ0aWVzRGlhbG9nLm9wZW4oKTtcbiAgICAgICAgICAgIENvcmUuJGFwcGx5KCRzY29wZSk7XG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgICB2YXIgaGVpZ2h0ID0gZGl2LmhlaWdodCgpO1xuICAgICAgICAgIHZhciB3aWR0aCA9IGRpdi53aWR0aCgpO1xuICAgICAgICAgIGlmIChoZWlnaHQgfHwgd2lkdGgpIHtcbiAgICAgICAgICAgIG5vZGUud2lkdGggPSB3aWR0aDtcbiAgICAgICAgICAgIG5vZGUuaGVpZ2h0ID0gaGVpZ2h0O1xuICAgICAgICAgICAgZGl2LmNzcyh7XG4gICAgICAgICAgICAgICdtaW4td2lkdGgnOiB3aWR0aCxcbiAgICAgICAgICAgICAgJ21pbi1oZWlnaHQnOiBoZWlnaHRcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgdmFyIGVkZ2VTZXAgPSAxMDtcblxuICAgICAgICAvLyBDcmVhdGUgdGhlIGxheW91dCBhbmQgZ2V0IHRoZSBidWlsZEdyYXBoXG4gICAgICAgIGRhZ3JlLmxheW91dCgpXG4gICAgICAgICAgICAubm9kZVNlcCgxMDApXG4gICAgICAgICAgICAuZWRnZVNlcChlZGdlU2VwKVxuICAgICAgICAgICAgLnJhbmtTZXAoNzUpXG4gICAgICAgICAgICAubm9kZXMoc3RhdGVzKVxuICAgICAgICAgICAgLmVkZ2VzKHRyYW5zaXRpb25zKVxuICAgICAgICAgICAgLmRlYnVnTGV2ZWwoMSlcbiAgICAgICAgICAgIC5ydW4oKTtcblxuICAgICAgICBhbmd1bGFyLmZvckVhY2goc3RhdGVzLCAobm9kZSkgPT4ge1xuXG4gICAgICAgICAgLy8gcG9zaXRpb24gdGhlIG5vZGUgaW4gdGhlIGdyYXBoXG4gICAgICAgICAgdmFyIGlkID0gZ2V0Tm9kZUlkKG5vZGUpO1xuICAgICAgICAgIHZhciBkaXYgPSAkKFwiI1wiICsgaWQpO1xuICAgICAgICAgIHZhciBkaXZIZWlnaHQgPSBkaXYuaGVpZ2h0KCk7XG4gICAgICAgICAgdmFyIGRpdldpZHRoID0gZGl2LndpZHRoKCk7XG4gICAgICAgICAgdmFyIGxlZnRPZmZzZXQgPSBub2RlLmRhZ3JlLnggKyBkaXZXaWR0aDtcbiAgICAgICAgICB2YXIgYm90dG9tT2Zmc2V0ID0gbm9kZS5kYWdyZS55ICsgZGl2SGVpZ2h0O1xuICAgICAgICAgIGlmIChjb250YWluZXJIZWlnaHQgPCBib3R0b21PZmZzZXQpIHtcbiAgICAgICAgICAgIGNvbnRhaW5lckhlaWdodCA9IGJvdHRvbU9mZnNldCArIGVkZ2VTZXAgKiAyO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoY29udGFpbmVyV2lkdGggPCBsZWZ0T2Zmc2V0KSB7XG4gICAgICAgICAgICBjb250YWluZXJXaWR0aCA9IGxlZnRPZmZzZXQgKyBlZGdlU2VwICogMjtcbiAgICAgICAgICB9XG4gICAgICAgICAgZGl2LmNzcyh7dG9wOiBub2RlLmRhZ3JlLnksIGxlZnQ6IG5vZGUuZGFncmUueH0pO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBzaXplIHRoZSBjb250YWluZXIgdG8gZml0IHRoZSBncmFwaFxuICAgICAgICBjb250YWluZXJFbGVtZW50LmNzcyh7XG4gICAgICAgICAgJ3dpZHRoJzogY29udGFpbmVyV2lkdGgsXG4gICAgICAgICAgJ2hlaWdodCc6IGNvbnRhaW5lckhlaWdodCxcbiAgICAgICAgICAnbWluLWhlaWdodCc6IGNvbnRhaW5lckhlaWdodCxcbiAgICAgICAgICAnbWluLXdpZHRoJzogY29udGFpbmVyV2lkdGhcbiAgICAgICAgfSk7XG5cblxuICAgICAgICBjb250YWluZXJFbGVtZW50LmRibGNsaWNrKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAkc2NvcGUucHJvcGVydGllc0RpYWxvZy5vcGVuKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGpzUGx1bWJJbnN0YW5jZS5zZXRTdXNwZW5kRXZlbnRzKHRydWUpO1xuICAgICAgICAvLyBEZXRhY2ggYWxsIHRoZSBjdXJyZW50IGNvbm5lY3Rpb25zIGFuZCByZWNvbm5lY3QgZXZlcnl0aGluZyBiYXNlZCBvbiB0aGUgdXBkYXRlZCBncmFwaFxuICAgICAgICBqc1BsdW1iSW5zdGFuY2UuZGV0YWNoRXZlcnlDb25uZWN0aW9uKHtmaXJlRXZlbnQ6IGZhbHNlfSk7XG5cbiAgICAgICAgYW5ndWxhci5mb3JFYWNoKGxpbmtzLCAobGluaykgPT4ge1xuICAgICAgICAgIGpzUGx1bWJJbnN0YW5jZS5jb25uZWN0KHtcbiAgICAgICAgICAgIHNvdXJjZTogZ2V0Tm9kZUlkKGxpbmsuc291cmNlKSxcbiAgICAgICAgICAgIHRhcmdldDogZ2V0Tm9kZUlkKGxpbmsudGFyZ2V0KVxuICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgICAganNQbHVtYkluc3RhbmNlLnNldFN1c3BlbmRFdmVudHMoZmFsc2UpO1xuXG4gICAgICB9KTtcblxuXG4gICAgICByZXR1cm4gc3RhdGVzO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldExpbmsoaW5mbykge1xuICAgICAgdmFyIHNvdXJjZUlkID0gaW5mby5zb3VyY2VJZDtcbiAgICAgIHZhciB0YXJnZXRJZCA9IGluZm8udGFyZ2V0SWQ7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBzb3VyY2U6IHNvdXJjZUlkLFxuICAgICAgICB0YXJnZXQ6IHRhcmdldElkXG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0Tm9kZUJ5Q0lEKG5vZGVzLCBjaWQpIHtcbiAgICAgIHJldHVybiBub2Rlcy5maW5kKChub2RlKSA9PiB7XG4gICAgICAgIHJldHVybiBub2RlLmNpZCA9PT0gY2lkO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgLypcbiAgICAgKiBVcGRhdGVzIHRoZSBzZWxlY3Rpb24gd2l0aCB0aGUgZ2l2ZW4gZm9sZGVyIG9yIElEXG4gICAgICovXG4gICAgZnVuY3Rpb24gdXBkYXRlU2VsZWN0aW9uKGZvbGRlck9ySWQpIHtcbiAgICAgIHZhciBmb2xkZXIgPSBudWxsO1xuICAgICAgaWYgKGFuZ3VsYXIuaXNTdHJpbmcoZm9sZGVyT3JJZCkpIHtcbiAgICAgICAgdmFyIGlkID0gZm9sZGVyT3JJZDtcbiAgICAgICAgZm9sZGVyID0gKGlkICYmICRzY29wZS5mb2xkZXJzKSA/ICRzY29wZS5mb2xkZXJzW2lkXSA6IG51bGw7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBmb2xkZXIgPSBmb2xkZXJPcklkO1xuICAgICAgfVxuICAgICAgJHNjb3BlLnNlbGVjdGVkRm9sZGVyID0gZm9sZGVyO1xuICAgICAgZm9sZGVyID0gZ2V0U2VsZWN0ZWRPclJvdXRlRm9sZGVyKCk7XG4gICAgICAkc2NvcGUubm9kZVhtbE5vZGUgPSBudWxsO1xuICAgICAgJHNjb3BlLnByb3BlcnRpZXNUZW1wbGF0ZSA9IG51bGw7XG4gICAgICBpZiAoZm9sZGVyKSB7XG4gICAgICAgIHZhciBub2RlTmFtZSA9IENhbWVsLmdldEZvbGRlckNhbWVsTm9kZUlkKGZvbGRlcik7XG4gICAgICAgICRzY29wZS5ub2RlRGF0YSA9IENhbWVsLmdldFJvdXRlRm9sZGVySlNPTihmb2xkZXIpO1xuICAgICAgICAkc2NvcGUubm9kZURhdGFDaGFuZ2VkRmllbGRzID0ge307XG4gICAgICAgICRzY29wZS5ub2RlTW9kZWwgPSBDYW1lbC5nZXRDYW1lbFNjaGVtYShub2RlTmFtZSk7XG4gICAgICAgIGlmICgkc2NvcGUubm9kZU1vZGVsKSB7XG4gICAgICAgICAgJHNjb3BlLnByb3BlcnRpZXNUZW1wbGF0ZSA9IFwicGx1Z2lucy93aWtpL2h0bWwvY2FtZWxQcm9wZXJ0aWVzRWRpdC5odG1sXCI7XG4gICAgICAgIH1cbiAgICAgICAgJHNjb3BlLnNlbGVjdGVkRW5kcG9pbnQgPSBudWxsO1xuICAgICAgICBpZiAoXCJlbmRwb2ludFwiID09PSBub2RlTmFtZSkge1xuICAgICAgICAgIHZhciB1cmkgPSAkc2NvcGUubm9kZURhdGFbXCJ1cmlcIl07XG4gICAgICAgICAgaWYgKHVyaSkge1xuICAgICAgICAgICAgLy8gbGV0cyBkZWNvbXBvc2UgdGhlIFVSSSBpbnRvIHNjaGVtZSwgcGF0aCBhbmQgcGFyYW1ldGVyc1xuICAgICAgICAgICAgdmFyIGlkeCA9IHVyaS5pbmRleE9mKFwiOlwiKTtcbiAgICAgICAgICAgIGlmIChpZHggPiAwKSB7XG4gICAgICAgICAgICAgIHZhciBlbmRwb2ludFNjaGVtZSA9IHVyaS5zdWJzdHJpbmcoMCwgaWR4KTtcbiAgICAgICAgICAgICAgdmFyIGVuZHBvaW50UGF0aCA9IHVyaS5zdWJzdHJpbmcoaWR4ICsgMSk7XG4gICAgICAgICAgICAgIC8vIGZvciBlbXB0eSBwYXRocyBsZXRzIGFzc3VtZSB3ZSBuZWVkIC8vIG9uIGEgVVJJXG4gICAgICAgICAgICAgICRzY29wZS5lbmRwb2ludFBhdGhIYXNTbGFzaGVzID0gZW5kcG9pbnRQYXRoID8gZmFsc2UgOiB0cnVlO1xuICAgICAgICAgICAgICBpZiAoZW5kcG9pbnRQYXRoLnN0YXJ0c1dpdGgoXCIvL1wiKSkge1xuICAgICAgICAgICAgICAgIGVuZHBvaW50UGF0aCA9IGVuZHBvaW50UGF0aC5zdWJzdHJpbmcoMik7XG4gICAgICAgICAgICAgICAgJHNjb3BlLmVuZHBvaW50UGF0aEhhc1NsYXNoZXMgPSB0cnVlO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGlkeCA9IGVuZHBvaW50UGF0aC5pbmRleE9mKFwiP1wiKTtcbiAgICAgICAgICAgICAgdmFyIGVuZHBvaW50UGFyYW1ldGVycyA9IHt9O1xuICAgICAgICAgICAgICBpZiAoaWR4ID4gMCkge1xuICAgICAgICAgICAgICAgIHZhciBwYXJhbWV0ZXJzID0gZW5kcG9pbnRQYXRoLnN1YnN0cmluZyhpZHggKyAxKTtcbiAgICAgICAgICAgICAgICBlbmRwb2ludFBhdGggPSBlbmRwb2ludFBhdGguc3Vic3RyaW5nKDAsIGlkeCk7XG4gICAgICAgICAgICAgICAgZW5kcG9pbnRQYXJhbWV0ZXJzID0gQ29yZS5zdHJpbmdUb0hhc2gocGFyYW1ldGVycyk7XG4gICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAkc2NvcGUuZW5kcG9pbnRTY2hlbWUgPSBlbmRwb2ludFNjaGVtZTtcbiAgICAgICAgICAgICAgJHNjb3BlLmVuZHBvaW50UGF0aCA9IGVuZHBvaW50UGF0aDtcbiAgICAgICAgICAgICAgJHNjb3BlLmVuZHBvaW50UGFyYW1ldGVycyA9IGVuZHBvaW50UGFyYW1ldGVycztcblxuICAgICAgICAgICAgICBsb2cuZGVidWcoXCJlbmRwb2ludCBcIiArIGVuZHBvaW50U2NoZW1lICsgXCIgcGF0aCBcIiArIGVuZHBvaW50UGF0aCArIFwiIGFuZCBwYXJhbWV0ZXJzIFwiICsgSlNPTi5zdHJpbmdpZnkoZW5kcG9pbnRQYXJhbWV0ZXJzKSk7XG4gICAgICAgICAgICAgICRzY29wZS5sb2FkRW5kcG9pbnRTY2hlbWEoZW5kcG9pbnRTY2hlbWUpO1xuICAgICAgICAgICAgICAkc2NvcGUuc2VsZWN0ZWRFbmRwb2ludCA9IHtcbiAgICAgICAgICAgICAgICBlbmRwb2ludFNjaGVtZTogZW5kcG9pbnRTY2hlbWUsXG4gICAgICAgICAgICAgICAgZW5kcG9pbnRQYXRoOiBlbmRwb2ludFBhdGgsXG4gICAgICAgICAgICAgICAgcGFyYW1ldGVyczogZW5kcG9pbnRQYXJhbWV0ZXJzXG4gICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0V2lkdGgoKSB7XG4gICAgICB2YXIgY2FudmFzRGl2ID0gJCgkZWxlbWVudCk7XG4gICAgICByZXR1cm4gY2FudmFzRGl2LndpZHRoKCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0Rm9sZGVySWRBdHRyaWJ1dGUocm91dGUpIHtcbiAgICAgIHZhciBpZCA9IG51bGw7XG4gICAgICBpZiAocm91dGUpIHtcbiAgICAgICAgdmFyIHhtbE5vZGUgPSByb3V0ZVtcInJvdXRlWG1sTm9kZVwiXTtcbiAgICAgICAgaWYgKHhtbE5vZGUpIHtcbiAgICAgICAgICBpZCA9IHhtbE5vZGUuZ2V0QXR0cmlidXRlKFwiaWRcIik7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiBpZDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXRSb3V0ZUZvbGRlcih0cmVlLCByb3V0ZUlkKSB7XG4gICAgICB2YXIgYW5zd2VyID0gbnVsbDtcbiAgICAgIGlmICh0cmVlKSB7XG4gICAgICAgIGFuZ3VsYXIuZm9yRWFjaCh0cmVlLmNoaWxkcmVuLCAocm91dGUpID0+IHtcbiAgICAgICAgICBpZiAoIWFuc3dlcikge1xuICAgICAgICAgICAgdmFyIGlkID0gZ2V0Rm9sZGVySWRBdHRyaWJ1dGUocm91dGUpO1xuICAgICAgICAgICAgaWYgKHJvdXRlSWQgPT09IGlkKSB7XG4gICAgICAgICAgICAgIGFuc3dlciA9IHJvdXRlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gYW5zd2VyO1xuICAgIH1cblxuICAgICRzY29wZS5kb1N3aXRjaFRvVHJlZVZpZXcgPSAoKSA9PiB7XG4gICAgICAkbG9jYXRpb24udXJsKENvcmUudHJpbUxlYWRpbmcoKCRzY29wZS5zdGFydExpbmsgKyBcIi9jYW1lbC9wcm9wZXJ0aWVzL1wiICsgJHNjb3BlLnBhZ2VJZCksICcjJykpO1xuICAgIH07XG5cbiAgICAkc2NvcGUuY29uZmlybVN3aXRjaFRvVHJlZVZpZXcgPSAoKSA9PiB7XG4gICAgICBpZiAoJHNjb3BlLm1vZGlmaWVkKSB7XG4gICAgICAgICRzY29wZS5zd2l0Y2hUb1RyZWVWaWV3Lm9wZW4oKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgICRzY29wZS5kb1N3aXRjaFRvVHJlZVZpZXcoKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gIH1dKTtcbn1cbiIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9pbmNsdWRlcy50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJ3aWtpSGVscGVycy50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJ3aWtpUGx1Z2luLnRzXCIvPlxuXG4vKipcbiAqIEBtb2R1bGUgV2lraVxuICovXG5tb2R1bGUgV2lraSB7XG5cbiAgX21vZHVsZS5jb250cm9sbGVyKFwiV2lraS5Db21taXRDb250cm9sbGVyXCIsIFtcIiRzY29wZVwiLCBcIiRsb2NhdGlvblwiLCBcIiRyb3V0ZVBhcmFtc1wiLCBcIiR0ZW1wbGF0ZUNhY2hlXCIsIFwibWFya2VkXCIsIFwiZmlsZUV4dGVuc2lvblR5cGVSZWdpc3RyeVwiLCAoJHNjb3BlLCAkbG9jYXRpb24sICRyb3V0ZVBhcmFtcywgJHRlbXBsYXRlQ2FjaGUsIG1hcmtlZCwgZmlsZUV4dGVuc2lvblR5cGVSZWdpc3RyeSkgPT4ge1xuXG4gICAgLy8gVE9ETyByZW1vdmUhXG4gICAgdmFyIGlzRm1jID0gZmFsc2U7XG4gICAgdmFyIGpvbG9raWEgPSBudWxsO1xuXG4gICAgV2lraS5pbml0U2NvcGUoJHNjb3BlLCAkcm91dGVQYXJhbXMsICRsb2NhdGlvbik7XG4gICAgdmFyIHdpa2lSZXBvc2l0b3J5ID0gJHNjb3BlLndpa2lSZXBvc2l0b3J5O1xuXG4gICAgJHNjb3BlLmNvbW1pdElkID0gJHNjb3BlLm9iamVjdElkO1xuXG4gICAgLy8gVE9ETyB3ZSBjb3VsZCBjb25maWd1cmUgdGhpcz9cbiAgICAkc2NvcGUuZGF0ZUZvcm1hdCA9ICdFRUUsIE1NTSBkLCB5IDogaGg6bW06c3MgYSc7XG5cbiAgICAkc2NvcGUuZ3JpZE9wdGlvbnMgPSB7XG4gICAgICBkYXRhOiAnY29tbWl0cycsXG4gICAgICBzaG93RmlsdGVyOiBmYWxzZSxcbiAgICAgIG11bHRpU2VsZWN0OiBmYWxzZSxcbiAgICAgIHNlbGVjdFdpdGhDaGVja2JveE9ubHk6IHRydWUsXG4gICAgICBzaG93U2VsZWN0aW9uQ2hlY2tib3g6IHRydWUsXG4gICAgICBkaXNwbGF5U2VsZWN0aW9uQ2hlY2tib3ggOiB0cnVlLCAvLyBvbGQgcHJlIDIuMCBjb25maWchXG4gICAgICBzZWxlY3RlZEl0ZW1zOiBbXSxcbiAgICAgIGZpbHRlck9wdGlvbnM6IHtcbiAgICAgICAgZmlsdGVyVGV4dDogJydcbiAgICAgIH0sXG4gICAgICBjb2x1bW5EZWZzOiBbXG4gICAgICAgIHtcbiAgICAgICAgICBmaWVsZDogJ3BhdGgnLFxuICAgICAgICAgIGRpc3BsYXlOYW1lOiAnRmlsZSBOYW1lJyxcbiAgICAgICAgICBjZWxsVGVtcGxhdGU6ICR0ZW1wbGF0ZUNhY2hlLmdldCgnZmlsZUNlbGxUZW1wbGF0ZS5odG1sJyksXG4gICAgICAgICAgd2lkdGg6IFwiKioqXCIsXG4gICAgICAgICAgY2VsbEZpbHRlcjogXCJcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgZmllbGQ6ICckZGlmZkxpbmsnLFxuICAgICAgICAgIGRpc3BsYXlOYW1lOiAnT3B0aW9ucycsXG4gICAgICAgICAgY2VsbFRlbXBsYXRlOiAkdGVtcGxhdGVDYWNoZS5nZXQoJ3ZpZXdEaWZmVGVtcGxhdGUuaHRtbCcpXG4gICAgICAgIH1cbiAgICAgIF1cbiAgICB9O1xuXG4gICAgJHNjb3BlLiRvbihcIiRyb3V0ZUNoYW5nZVN1Y2Nlc3NcIiwgZnVuY3Rpb24gKGV2ZW50LCBjdXJyZW50LCBwcmV2aW91cykge1xuICAgICAgLy8gbGV0cyBkbyB0aGlzIGFzeW5jaHJvbm91c2x5IHRvIGF2b2lkIEVycm9yOiAkZGlnZXN0IGFscmVhZHkgaW4gcHJvZ3Jlc3NcbiAgICAgIHNldFRpbWVvdXQodXBkYXRlVmlldywgNTApO1xuICAgIH0pO1xuXG4gICAgJHNjb3BlLiR3YXRjaCgnd29ya3NwYWNlLnRyZWUnLCBmdW5jdGlvbiAoKSB7XG4gICAgICBpZiAoISRzY29wZS5naXQpIHtcbiAgICAgICAgLy8gbGV0cyBkbyB0aGlzIGFzeW5jaHJvbm91c2x5IHRvIGF2b2lkIEVycm9yOiAkZGlnZXN0IGFscmVhZHkgaW4gcHJvZ3Jlc3NcbiAgICAgICAgLy9jb25zb2xlLmxvZyhcIlJlbG9hZGluZyB0aGUgdmlldyBhcyB3ZSBub3cgc2VlbSB0byBoYXZlIGEgZ2l0IG1iZWFuIVwiKTtcbiAgICAgICAgc2V0VGltZW91dCh1cGRhdGVWaWV3LCA1MCk7XG4gICAgICB9XG4gICAgfSk7XG5cblxuICAgICRzY29wZS5jYW5SZXZlcnQgPSAoKSA9PiB7XG4gICAgICByZXR1cm4gJHNjb3BlLmdyaWRPcHRpb25zLnNlbGVjdGVkSXRlbXMubGVuZ3RoID09PSAxO1xuICAgIH07XG5cbiAgICAkc2NvcGUucmV2ZXJ0ID0gKCkgPT4ge1xuICAgICAgdmFyIHNlbGVjdGVkSXRlbXMgPSAkc2NvcGUuZ3JpZE9wdGlvbnMuc2VsZWN0ZWRJdGVtcztcbiAgICAgIGlmIChzZWxlY3RlZEl0ZW1zLmxlbmd0aCA+IDApIHtcbiAgICAgICAgdmFyIHBhdGggPSBjb21taXRQYXRoKHNlbGVjdGVkSXRlbXNbMF0pO1xuICAgICAgICB2YXIgb2JqZWN0SWQgPSAkc2NvcGUuY29tbWl0SWQ7XG4gICAgICAgIGlmIChwYXRoICYmIG9iamVjdElkKSB7XG4gICAgICAgICAgdmFyIGNvbW1pdE1lc3NhZ2UgPSBcIlJldmVydGluZyBmaWxlIFwiICsgJHNjb3BlLnBhZ2VJZCArIFwiIHRvIHByZXZpb3VzIHZlcnNpb24gXCIgKyBvYmplY3RJZDtcbiAgICAgICAgICB3aWtpUmVwb3NpdG9yeS5yZXZlcnRUbygkc2NvcGUuYnJhbmNoLCBvYmplY3RJZCwgJHNjb3BlLnBhZ2VJZCwgY29tbWl0TWVzc2FnZSwgKHJlc3VsdCkgPT4ge1xuICAgICAgICAgICAgV2lraS5vbkNvbXBsZXRlKHJlc3VsdCk7XG4gICAgICAgICAgICAvLyBub3cgbGV0cyB1cGRhdGUgdGhlIHZpZXdcbiAgICAgICAgICAgIHVwZGF0ZVZpZXcoKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH07XG5cbiAgICBmdW5jdGlvbiBjb21taXRQYXRoKGNvbW1pdCkge1xuICAgICAgcmV0dXJuIGNvbW1pdC5wYXRoIHx8IGNvbW1pdC5uYW1lO1xuICAgIH1cblxuICAgICRzY29wZS5kaWZmID0gKCkgPT4ge1xuICAgICAgdmFyIHNlbGVjdGVkSXRlbXMgPSAkc2NvcGUuZ3JpZE9wdGlvbnMuc2VsZWN0ZWRJdGVtcztcbiAgICAgIGlmIChzZWxlY3RlZEl0ZW1zLmxlbmd0aCA+IDApIHtcbiAgICAgICAgdmFyIGNvbW1pdCA9IHNlbGVjdGVkSXRlbXNbMF07XG4gICAgICAgIC8qXG4gICAgICAgICB2YXIgY29tbWl0ID0gcm93O1xuICAgICAgICAgdmFyIGVudGl0eSA9IHJvdy5lbnRpdHk7XG4gICAgICAgICBpZiAoZW50aXR5KSB7XG4gICAgICAgICBjb21taXQgPSBlbnRpdHk7XG4gICAgICAgICB9XG4gICAgICAgICAqL1xuICAgICAgICB2YXIgb3RoZXJDb21taXRJZCA9ICRzY29wZS5jb21taXRJZDtcbiAgICAgICAgdmFyIGxpbmsgPSBVcmxIZWxwZXJzLmpvaW4oc3RhcnRMaW5rKCRzY29wZSksICBcIi9kaWZmL1wiICsgJHNjb3BlLmNvbW1pdElkICsgXCIvXCIgKyBvdGhlckNvbW1pdElkICsgXCIvXCIgKyBjb21taXRQYXRoKGNvbW1pdCkpO1xuICAgICAgICB2YXIgcGF0aCA9IENvcmUudHJpbUxlYWRpbmcobGluaywgXCIjXCIpO1xuICAgICAgICAkbG9jYXRpb24ucGF0aChwYXRoKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgdXBkYXRlVmlldygpO1xuXG4gICAgZnVuY3Rpb24gdXBkYXRlVmlldygpIHtcbiAgICAgIHZhciBjb21taXRJZCA9ICRzY29wZS5jb21taXRJZDtcblxuICAgICAgV2lraS5sb2FkQnJhbmNoZXMoam9sb2tpYSwgd2lraVJlcG9zaXRvcnksICRzY29wZSwgaXNGbWMpO1xuXG4gICAgICB3aWtpUmVwb3NpdG9yeS5jb21taXRJbmZvKGNvbW1pdElkLCAoY29tbWl0SW5mbykgPT4ge1xuICAgICAgICAkc2NvcGUuY29tbWl0SW5mbyA9IGNvbW1pdEluZm87XG4gICAgICAgIENvcmUuJGFwcGx5KCRzY29wZSk7XG4gICAgICB9KTtcblxuICAgICAgd2lraVJlcG9zaXRvcnkuY29tbWl0VHJlZShjb21taXRJZCwgKGNvbW1pdHMpID0+IHtcbiAgICAgICAgJHNjb3BlLmNvbW1pdHMgPSBjb21taXRzO1xuICAgICAgICBhbmd1bGFyLmZvckVhY2goY29tbWl0cywgKGNvbW1pdCkgPT4ge1xuICAgICAgICAgIGNvbW1pdC5maWxlSWNvbkh0bWwgPSBXaWtpLmZpbGVJY29uSHRtbChjb21taXQpO1xuICAgICAgICAgIGNvbW1pdC5maWxlQ2xhc3MgPSBjb21taXQubmFtZS5lbmRzV2l0aChcIi5wcm9maWxlXCIpID8gXCJncmVlblwiIDogXCJcIjtcbiAgICAgICAgICB2YXIgY2hhbmdlVHlwZSA9IGNvbW1pdC5jaGFuZ2VUeXBlO1xuICAgICAgICAgIHZhciBwYXRoID0gY29tbWl0UGF0aChjb21taXQpO1xuICAgICAgICAgIGlmIChwYXRoKSB7XG4gICAgICAgICAgICBjb21taXQuZmlsZUxpbmsgPSBzdGFydExpbmsoJHNjb3BlKSArICcvdmVyc2lvbi8nICsgcGF0aCArICcvJyArIGNvbW1pdElkO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjb21taXQuJGRpZmZMaW5rID0gc3RhcnRMaW5rKCRzY29wZSkgKyBcIi9kaWZmL1wiICsgY29tbWl0SWQgKyBcIi9cIiArIGNvbW1pdElkICsgXCIvXCIgKyAocGF0aCB8fCBcIlwiKTtcbiAgICAgICAgICBpZiAoY2hhbmdlVHlwZSkge1xuICAgICAgICAgICAgY2hhbmdlVHlwZSA9IGNoYW5nZVR5cGUudG9Mb3dlckNhc2UoKTtcbiAgICAgICAgICAgIGlmIChjaGFuZ2VUeXBlLnN0YXJ0c1dpdGgoXCJhXCIpKSB7XG4gICAgICAgICAgICAgIGNvbW1pdC5jaGFuZ2VDbGFzcyA9IFwiY2hhbmdlLWFkZFwiO1xuICAgICAgICAgICAgICBjb21taXQuY2hhbmdlID0gXCJhZGRcIjtcbiAgICAgICAgICAgICAgY29tbWl0LnRpdGxlID0gXCJhZGRlZFwiO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChjaGFuZ2VUeXBlLnN0YXJ0c1dpdGgoXCJkXCIpKSB7XG4gICAgICAgICAgICAgIGNvbW1pdC5jaGFuZ2VDbGFzcyA9IFwiY2hhbmdlLWRlbGV0ZVwiO1xuICAgICAgICAgICAgICBjb21taXQuY2hhbmdlID0gXCJkZWxldGVcIjtcbiAgICAgICAgICAgICAgY29tbWl0LnRpdGxlID0gXCJkZWxldGVkXCI7XG4gICAgICAgICAgICAgIGNvbW1pdC5maWxlTGluayA9IG51bGw7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBjb21taXQuY2hhbmdlQ2xhc3MgPSBcImNoYW5nZS1tb2RpZnlcIjtcbiAgICAgICAgICAgICAgY29tbWl0LmNoYW5nZSA9IFwibW9kaWZ5XCI7XG4gICAgICAgICAgICAgIGNvbW1pdC50aXRsZSA9IFwibW9kaWZpZWRcIjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbW1pdC5jaGFuZ2VUeXBlSHRtbCA9ICc8c3BhbiBjbGFzcz1cIicgKyBjb21taXQuY2hhbmdlQ2xhc3MgKyAnXCI+JyArIGNvbW1pdC50aXRsZSArICc8L3NwYW4+JztcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBDb3JlLiRhcHBseSgkc2NvcGUpO1xuICAgICAgfSk7XG4gICAgfVxuICB9XSk7XG59XG4iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vaW5jbHVkZXMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwid2lraUhlbHBlcnMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwid2lraVBsdWdpbi50c1wiLz5cblxuLyoqXG4gKiBAbW9kdWxlIFdpa2lcbiAqL1xubW9kdWxlIFdpa2kge1xuXG4gIF9tb2R1bGUuY29udHJvbGxlcihcIldpa2kuQ29tbWl0RGV0YWlsQ29udHJvbGxlclwiLCBbXCIkc2NvcGVcIiwgXCIkbG9jYXRpb25cIiwgXCIkcm91dGVQYXJhbXNcIiwgXCIkdGVtcGxhdGVDYWNoZVwiLCBcIm1hcmtlZFwiLCBcImZpbGVFeHRlbnNpb25UeXBlUmVnaXN0cnlcIiwgKCRzY29wZSwgJGxvY2F0aW9uLCAkcm91dGVQYXJhbXMsICR0ZW1wbGF0ZUNhY2hlLCBtYXJrZWQsIGZpbGVFeHRlbnNpb25UeXBlUmVnaXN0cnkpID0+IHtcblxuICAgIC8vIFRPRE8gcmVtb3ZlIVxuICAgIHZhciBpc0ZtYyA9IGZhbHNlO1xuICAgIHZhciBqb2xva2lhID0gbnVsbDtcblxuICAgIFdpa2kuaW5pdFNjb3BlKCRzY29wZSwgJHJvdXRlUGFyYW1zLCAkbG9jYXRpb24pO1xuICAgIHZhciB3aWtpUmVwb3NpdG9yeSA9ICRzY29wZS53aWtpUmVwb3NpdG9yeTtcblxuICAgICRzY29wZS5jb21taXRJZCA9ICRzY29wZS5vYmplY3RJZDtcblxuICAgIHZhciBvcHRpb25zID0ge1xuICAgICAgcmVhZE9ubHk6IHRydWUsXG4gICAgICBtb2RlOiB7XG4gICAgICAgIG5hbWU6ICdkaWZmJ1xuICAgICAgfVxuICAgIH07XG4gICAgJHNjb3BlLmNvZGVNaXJyb3JPcHRpb25zID0gQ29kZUVkaXRvci5jcmVhdGVFZGl0b3JTZXR0aW5ncyhvcHRpb25zKTtcblxuICAgICRzY29wZS4kb24oXCIkcm91dGVDaGFuZ2VTdWNjZXNzXCIsIGZ1bmN0aW9uIChldmVudCwgY3VycmVudCwgcHJldmlvdXMpIHtcbiAgICAgIC8vIGxldHMgZG8gdGhpcyBhc3luY2hyb25vdXNseSB0byBhdm9pZCBFcnJvcjogJGRpZ2VzdCBhbHJlYWR5IGluIHByb2dyZXNzXG4gICAgICBzZXRUaW1lb3V0KHVwZGF0ZVZpZXcsIDUwKTtcbiAgICB9KTtcblxuICAgICRzY29wZS4kd2F0Y2goJ3dvcmtzcGFjZS50cmVlJywgZnVuY3Rpb24gKCkge1xuICAgICAgaWYgKCEkc2NvcGUuZ2l0KSB7XG4gICAgICAgIC8vIGxldHMgZG8gdGhpcyBhc3luY2hyb25vdXNseSB0byBhdm9pZCBFcnJvcjogJGRpZ2VzdCBhbHJlYWR5IGluIHByb2dyZXNzXG4gICAgICAgIC8vY29uc29sZS5sb2coXCJSZWxvYWRpbmcgdGhlIHZpZXcgYXMgd2Ugbm93IHNlZW0gdG8gaGF2ZSBhIGdpdCBtYmVhbiFcIik7XG4gICAgICAgIHNldFRpbWVvdXQodXBkYXRlVmlldywgNTApO1xuICAgICAgfVxuICAgIH0pO1xuXG5cbiAgICAkc2NvcGUuY2FuUmV2ZXJ0ID0gKCkgPT4ge1xuICAgICAgcmV0dXJuICRzY29wZS5ncmlkT3B0aW9ucy5zZWxlY3RlZEl0ZW1zLmxlbmd0aCA9PT0gMTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLnJldmVydCA9ICgpID0+IHtcbiAgICAgIHZhciBzZWxlY3RlZEl0ZW1zID0gJHNjb3BlLmdyaWRPcHRpb25zLnNlbGVjdGVkSXRlbXM7XG4gICAgICBpZiAoc2VsZWN0ZWRJdGVtcy5sZW5ndGggPiAwKSB7XG4gICAgICAgIHZhciBwYXRoID0gY29tbWl0UGF0aChzZWxlY3RlZEl0ZW1zWzBdKTtcbiAgICAgICAgdmFyIG9iamVjdElkID0gJHNjb3BlLmNvbW1pdElkO1xuICAgICAgICBpZiAocGF0aCAmJiBvYmplY3RJZCkge1xuICAgICAgICAgIHZhciBjb21taXRNZXNzYWdlID0gXCJSZXZlcnRpbmcgZmlsZSBcIiArICRzY29wZS5wYWdlSWQgKyBcIiB0byBwcmV2aW91cyB2ZXJzaW9uIFwiICsgb2JqZWN0SWQ7XG4gICAgICAgICAgd2lraVJlcG9zaXRvcnkucmV2ZXJ0VG8oJHNjb3BlLmJyYW5jaCwgb2JqZWN0SWQsICRzY29wZS5wYWdlSWQsIGNvbW1pdE1lc3NhZ2UsIChyZXN1bHQpID0+IHtcbiAgICAgICAgICAgIFdpa2kub25Db21wbGV0ZShyZXN1bHQpO1xuICAgICAgICAgICAgLy8gbm93IGxldHMgdXBkYXRlIHRoZSB2aWV3XG4gICAgICAgICAgICB1cGRhdGVWaWV3KCk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gY29tbWl0UGF0aChjb21taXQpIHtcbiAgICAgIHJldHVybiBjb21taXQucGF0aCB8fCBjb21taXQubmFtZTtcbiAgICB9XG5cbiAgICAkc2NvcGUuZGlmZiA9ICgpID0+IHtcbiAgICAgIHZhciBzZWxlY3RlZEl0ZW1zID0gJHNjb3BlLmdyaWRPcHRpb25zLnNlbGVjdGVkSXRlbXM7XG4gICAgICBpZiAoc2VsZWN0ZWRJdGVtcy5sZW5ndGggPiAwKSB7XG4gICAgICAgIHZhciBjb21taXQgPSBzZWxlY3RlZEl0ZW1zWzBdO1xuICAgICAgICAvKlxuICAgICAgICAgdmFyIGNvbW1pdCA9IHJvdztcbiAgICAgICAgIHZhciBlbnRpdHkgPSByb3cuZW50aXR5O1xuICAgICAgICAgaWYgKGVudGl0eSkge1xuICAgICAgICAgY29tbWl0ID0gZW50aXR5O1xuICAgICAgICAgfVxuICAgICAgICAgKi9cbiAgICAgICAgdmFyIG90aGVyQ29tbWl0SWQgPSAkc2NvcGUuY29tbWl0SWQ7XG4gICAgICAgIHZhciBsaW5rID0gVXJsSGVscGVycy5qb2luKHN0YXJ0TGluaygkc2NvcGUpLCAgXCIvZGlmZi9cIiArICRzY29wZS5jb21taXRJZCArIFwiL1wiICsgb3RoZXJDb21taXRJZCArIFwiL1wiICsgY29tbWl0UGF0aChjb21taXQpKTtcbiAgICAgICAgdmFyIHBhdGggPSBDb3JlLnRyaW1MZWFkaW5nKGxpbmssIFwiI1wiKTtcbiAgICAgICAgJGxvY2F0aW9uLnBhdGgocGF0aCk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIHVwZGF0ZVZpZXcoKTtcblxuICAgIGZ1bmN0aW9uIHVwZGF0ZVZpZXcoKSB7XG4gICAgICB2YXIgY29tbWl0SWQgPSAkc2NvcGUuY29tbWl0SWQ7XG5cbiAgICAgIFdpa2kubG9hZEJyYW5jaGVzKGpvbG9raWEsIHdpa2lSZXBvc2l0b3J5LCAkc2NvcGUsIGlzRm1jKTtcblxuICAgICAgd2lraVJlcG9zaXRvcnkuY29tbWl0RGV0YWlsKGNvbW1pdElkLCAoY29tbWl0RGV0YWlsKSA9PiB7XG4gICAgICAgIGlmIChjb21taXREZXRhaWwpIHtcbiAgICAgICAgICAkc2NvcGUuY29tbWl0RGV0YWlsID0gY29tbWl0RGV0YWlsO1xuICAgICAgICAgIHZhciBjb21taXQgPSBjb21taXREZXRhaWwuY29tbWl0X2luZm87XG4gICAgICAgICAgJHNjb3BlLmNvbW1pdCA9IGNvbW1pdDtcbiAgICAgICAgICBpZiAoY29tbWl0KSB7XG4gICAgICAgICAgICBjb21taXQuJGRhdGUgPSBEZXZlbG9wZXIuYXNEYXRlKGNvbW1pdC5kYXRlKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgYW5ndWxhci5mb3JFYWNoKGNvbW1pdERldGFpbC5kaWZmcywgKGRpZmYpID0+IHtcbiAgICAgICAgICAgIC8vIGFkZCBsaW5rIHRvIHZpZXcgZmlsZSBsaW5rXG4gICAgICAgICAgICB2YXIgcGF0aCA9IGRpZmYubmV3X3BhdGg7XG4gICAgICAgICAgICBpZiAocGF0aCkge1xuICAgICAgICAgICAgICBkaWZmLiR2aWV3TGluayA9IFVybEhlbHBlcnMuam9pbihXaWtpLnN0YXJ0V2lraUxpbmsoJHNjb3BlLnByb2plY3RJZCwgY29tbWl0SWQpLCBcInZpZXdcIiwgcGF0aCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICAgIH0pO1xuICAgIH1cblxuLypcbiAgICAgIHdpa2lSZXBvc2l0b3J5LmNvbW1pdFRyZWUoY29tbWl0SWQsIChjb21taXRzKSA9PiB7XG4gICAgICAgICRzY29wZS5jb21taXRzID0gY29tbWl0cztcbiAgICAgICAgYW5ndWxhci5mb3JFYWNoKGNvbW1pdHMsIChjb21taXQpID0+IHtcbiAgICAgICAgICBjb21taXQuZmlsZUljb25IdG1sID0gV2lraS5maWxlSWNvbkh0bWwoY29tbWl0KTtcbiAgICAgICAgICBjb21taXQuZmlsZUNsYXNzID0gY29tbWl0Lm5hbWUuZW5kc1dpdGgoXCIucHJvZmlsZVwiKSA/IFwiZ3JlZW5cIiA6IFwiXCI7XG4gICAgICAgICAgdmFyIGNoYW5nZVR5cGUgPSBjb21taXQuY2hhbmdlVHlwZTtcbiAgICAgICAgICB2YXIgcGF0aCA9IGNvbW1pdFBhdGgoY29tbWl0KTtcbiAgICAgICAgICBpZiAocGF0aCkge1xuICAgICAgICAgICAgY29tbWl0LmZpbGVMaW5rID0gc3RhcnRMaW5rKCRzY29wZSkgKyAnL3ZlcnNpb24vJyArIHBhdGggKyAnLycgKyBjb21taXRJZDtcbiAgICAgICAgICB9XG4gICAgICAgICAgY29tbWl0LiRkaWZmTGluayA9IHN0YXJ0TGluaygkc2NvcGUpICsgXCIvZGlmZi9cIiArIGNvbW1pdElkICsgXCIvXCIgKyBjb21taXRJZCArIFwiL1wiICsgKHBhdGggfHwgXCJcIik7XG4gICAgICAgICAgaWYgKGNoYW5nZVR5cGUpIHtcbiAgICAgICAgICAgIGNoYW5nZVR5cGUgPSBjaGFuZ2VUeXBlLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgICAgICBpZiAoY2hhbmdlVHlwZS5zdGFydHNXaXRoKFwiYVwiKSkge1xuICAgICAgICAgICAgICBjb21taXQuY2hhbmdlQ2xhc3MgPSBcImNoYW5nZS1hZGRcIjtcbiAgICAgICAgICAgICAgY29tbWl0LmNoYW5nZSA9IFwiYWRkXCI7XG4gICAgICAgICAgICAgIGNvbW1pdC50aXRsZSA9IFwiYWRkZWRcIjtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoY2hhbmdlVHlwZS5zdGFydHNXaXRoKFwiZFwiKSkge1xuICAgICAgICAgICAgICBjb21taXQuY2hhbmdlQ2xhc3MgPSBcImNoYW5nZS1kZWxldGVcIjtcbiAgICAgICAgICAgICAgY29tbWl0LmNoYW5nZSA9IFwiZGVsZXRlXCI7XG4gICAgICAgICAgICAgIGNvbW1pdC50aXRsZSA9IFwiZGVsZXRlZFwiO1xuICAgICAgICAgICAgICBjb21taXQuZmlsZUxpbmsgPSBudWxsO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgY29tbWl0LmNoYW5nZUNsYXNzID0gXCJjaGFuZ2UtbW9kaWZ5XCI7XG4gICAgICAgICAgICAgIGNvbW1pdC5jaGFuZ2UgPSBcIm1vZGlmeVwiO1xuICAgICAgICAgICAgICBjb21taXQudGl0bGUgPSBcIm1vZGlmaWVkXCI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb21taXQuY2hhbmdlVHlwZUh0bWwgPSAnPHNwYW4gY2xhc3M9XCInICsgY29tbWl0LmNoYW5nZUNsYXNzICsgJ1wiPicgKyBjb21taXQudGl0bGUgKyAnPC9zcGFuPic7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICB9XG4gICAgfSk7XG4qL1xuICB9XSk7XG59XG4iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vaW5jbHVkZXMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwid2lraUhlbHBlcnMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwid2lraVBsdWdpbi50c1wiLz5cblxubW9kdWxlIFdpa2kge1xuXG4gIHZhciBDcmVhdGVDb250cm9sbGVyID0gY29udHJvbGxlcihcIkNyZWF0ZUNvbnRyb2xsZXJcIiwgW1wiJHNjb3BlXCIsIFwiJGxvY2F0aW9uXCIsIFwiJHJvdXRlUGFyYW1zXCIsIFwiJHJvdXRlXCIsIFwiJGh0dHBcIiwgXCIkdGltZW91dFwiLCAoJHNjb3BlLCAkbG9jYXRpb246bmcuSUxvY2F0aW9uU2VydmljZSwgJHJvdXRlUGFyYW1zOm5nLnJvdXRlLklSb3V0ZVBhcmFtc1NlcnZpY2UsICRyb3V0ZTpuZy5yb3V0ZS5JUm91dGVTZXJ2aWNlLCAkaHR0cDpuZy5JSHR0cFNlcnZpY2UsICR0aW1lb3V0Om5nLklUaW1lb3V0U2VydmljZSkgPT4ge1xuXG4gICAgV2lraS5pbml0U2NvcGUoJHNjb3BlLCAkcm91dGVQYXJhbXMsICRsb2NhdGlvbik7XG4gICAgdmFyIHdpa2lSZXBvc2l0b3J5ID0gJHNjb3BlLndpa2lSZXBvc2l0b3J5O1xuXG5cbiAgICAvLyBUT0RPIHJlbW92ZVxuICAgIHZhciB3b3Jrc3BhY2UgPSBudWxsO1xuXG4gICAgJHNjb3BlLmNyZWF0ZURvY3VtZW50VHJlZSA9IFdpa2kuY3JlYXRlV2l6YXJkVHJlZSh3b3Jrc3BhY2UsICRzY29wZSk7XG4gICAgJHNjb3BlLmNyZWF0ZURvY3VtZW50VHJlZUNoaWxkcmVuID0gJHNjb3BlLmNyZWF0ZURvY3VtZW50VHJlZS5jaGlsZHJlbjtcbiAgICAkc2NvcGUuY3JlYXRlRG9jdW1lbnRUcmVlQWN0aXZhdGlvbnMgPSBbXCJjYW1lbC1zcHJpbmcueG1sXCIsIFwiUmVhZE1lLm1kXCJdO1xuXG4gICAgJHNjb3BlLnRyZWVPcHRpb25zID0ge1xuICAgICAgICBub2RlQ2hpbGRyZW46IFwiY2hpbGRyZW5cIixcbiAgICAgICAgZGlyU2VsZWN0YWJsZTogdHJ1ZSxcbiAgICAgICAgaW5qZWN0Q2xhc3Nlczoge1xuICAgICAgICAgICAgdWw6IFwiYTFcIixcbiAgICAgICAgICAgIGxpOiBcImEyXCIsXG4gICAgICAgICAgICBsaVNlbGVjdGVkOiBcImE3XCIsXG4gICAgICAgICAgICBpRXhwYW5kZWQ6IFwiYTNcIixcbiAgICAgICAgICAgIGlDb2xsYXBzZWQ6IFwiYTRcIixcbiAgICAgICAgICAgIGlMZWFmOiBcImE1XCIsXG4gICAgICAgICAgICBsYWJlbDogXCJhNlwiLFxuICAgICAgICAgICAgbGFiZWxTZWxlY3RlZDogXCJhOFwiXG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgJHNjb3BlLmZpbGVFeGlzdHMgPSB7XG4gICAgICBleGlzdHM6IGZhbHNlLFxuICAgICAgbmFtZTogXCJcIlxuICAgIH07XG4gICAgJHNjb3BlLm5ld0RvY3VtZW50TmFtZSA9IFwiXCI7XG4gICAgJHNjb3BlLnNlbGVjdGVkQ3JlYXRlRG9jdW1lbnRFeHRlbnNpb24gPSBudWxsO1xuICAgICRzY29wZS5maWxlRXhpc3RzLmV4aXN0cyA9IGZhbHNlO1xuICAgICRzY29wZS5maWxlRXhpc3RzLm5hbWUgPSBcIlwiO1xuICAgICRzY29wZS5uZXdEb2N1bWVudE5hbWUgPSBcIlwiO1xuXG4gICAgZnVuY3Rpb24gcmV0dXJuVG9EaXJlY3RvcnkoKSB7XG4gICAgICB2YXIgbGluayA9IFdpa2kudmlld0xpbmsoJHNjb3BlLCAkc2NvcGUucGFnZUlkLCAkbG9jYXRpb24pXG4gICAgICBsb2cuZGVidWcoXCJDYW5jZWxsaW5nLCBnb2luZyB0byBsaW5rOiBcIiwgbGluayk7XG4gICAgICBXaWtpLmdvVG9MaW5rKGxpbmssICR0aW1lb3V0LCAkbG9jYXRpb24pO1xuICAgIH1cblxuICAgICRzY29wZS5jYW5jZWwgPSAoKSA9PiB7XG4gICAgICByZXR1cm5Ub0RpcmVjdG9yeSgpO1xuICAgIH07XG5cbiAgICAkc2NvcGUub25DcmVhdGVEb2N1bWVudFNlbGVjdCA9IChub2RlKSA9PiB7XG4gICAgICAvLyByZXNldCBhcyB3ZSBzd2l0Y2ggYmV0d2VlbiBkb2N1bWVudCB0eXBlc1xuICAgICAgJHNjb3BlLmZpbGVFeGlzdHMuZXhpc3RzID0gZmFsc2U7XG4gICAgICAkc2NvcGUuZmlsZUV4aXN0cy5uYW1lID0gXCJcIjtcbiAgICAgIHZhciBlbnRpdHkgPSBub2RlID8gbm9kZS5lbnRpdHkgOiBudWxsO1xuICAgICAgJHNjb3BlLnNlbGVjdGVkQ3JlYXRlRG9jdW1lbnRUZW1wbGF0ZSA9IGVudGl0eTtcbiAgICAgICRzY29wZS5zZWxlY3RlZENyZWF0ZURvY3VtZW50VGVtcGxhdGVSZWdleCA9ICRzY29wZS5zZWxlY3RlZENyZWF0ZURvY3VtZW50VGVtcGxhdGUucmVnZXggfHwgLy4qLztcbiAgICAgICRzY29wZS5zZWxlY3RlZENyZWF0ZURvY3VtZW50VGVtcGxhdGVJbnZhbGlkID0gJHNjb3BlLnNlbGVjdGVkQ3JlYXRlRG9jdW1lbnRUZW1wbGF0ZS5pbnZhbGlkIHx8IFwiaW52YWxpZCBuYW1lXCI7XG4gICAgICAkc2NvcGUuc2VsZWN0ZWRDcmVhdGVEb2N1bWVudFRlbXBsYXRlRXh0ZW5zaW9uID0gJHNjb3BlLnNlbGVjdGVkQ3JlYXRlRG9jdW1lbnRUZW1wbGF0ZS5leHRlbnNpb24gfHwgbnVsbDtcbiAgICAgIGxvZy5kZWJ1ZyhcIkVudGl0eTogXCIsIGVudGl0eSk7XG4gICAgICBpZiAoZW50aXR5KSB7XG4gICAgICAgIGlmIChlbnRpdHkuZ2VuZXJhdGVkKSB7XG4gICAgICAgICAgJHNjb3BlLmZvcm1TY2hlbWEgPSBlbnRpdHkuZ2VuZXJhdGVkLnNjaGVtYTtcbiAgICAgICAgICAkc2NvcGUuZm9ybURhdGEgPSBlbnRpdHkuZ2VuZXJhdGVkLmZvcm0od29ya3NwYWNlLCAkc2NvcGUpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICRzY29wZS5mb3JtU2NoZW1hID0ge307XG4gICAgICAgICAgJHNjb3BlLmZvcm1EYXRhID0ge307XG4gICAgICAgIH1cbiAgICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICAgIH1cblxuICAgIH07XG5cbiAgICAkc2NvcGUuYWRkQW5kQ2xvc2VEaWFsb2cgPSAoZmlsZU5hbWU6c3RyaW5nKSA9PiB7XG4gICAgICAkc2NvcGUubmV3RG9jdW1lbnROYW1lID0gZmlsZU5hbWU7XG4gICAgICB2YXIgdGVtcGxhdGUgPSAkc2NvcGUuc2VsZWN0ZWRDcmVhdGVEb2N1bWVudFRlbXBsYXRlO1xuICAgICAgdmFyIHBhdGggPSBnZXROZXdEb2N1bWVudFBhdGgoKTtcblxuICAgICAgLy8gY2xlYXIgJHNjb3BlLm5ld0RvY3VtZW50TmFtZSBzbyB3ZSBkb250IHJlbWVtYmVyIGl0IHdoZW4gd2Ugb3BlbiBpdCBuZXh0IHRpbWVcbiAgICAgICRzY29wZS5uZXdEb2N1bWVudE5hbWUgPSBudWxsO1xuXG4gICAgICAvLyByZXNldCBiZWZvcmUgd2UgY2hlY2sganVzdCBpbiBhIGJpdFxuICAgICAgJHNjb3BlLmZpbGVFeGlzdHMuZXhpc3RzID0gZmFsc2U7XG4gICAgICAkc2NvcGUuZmlsZUV4aXN0cy5uYW1lID0gXCJcIjtcbiAgICAgICRzY29wZS5maWxlRXh0ZW5zaW9uSW52YWxpZCA9IG51bGw7XG5cbiAgICAgIGlmICghdGVtcGxhdGUgfHwgIXBhdGgpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICAvLyB2YWxpZGF0ZSBpZiB0aGUgbmFtZSBtYXRjaCB0aGUgZXh0ZW5zaW9uXG4gICAgICBpZiAoJHNjb3BlLnNlbGVjdGVkQ3JlYXRlRG9jdW1lbnRUZW1wbGF0ZUV4dGVuc2lvbikge1xuICAgICAgICB2YXIgaWR4ID0gcGF0aC5sYXN0SW5kZXhPZignLicpO1xuICAgICAgICBpZiAoaWR4ID4gMCkge1xuICAgICAgICAgIHZhciBleHQgPSBwYXRoLnN1YnN0cmluZyhpZHgpO1xuICAgICAgICAgIGlmICgkc2NvcGUuc2VsZWN0ZWRDcmVhdGVEb2N1bWVudFRlbXBsYXRlRXh0ZW5zaW9uICE9PSBleHQpIHtcbiAgICAgICAgICAgICRzY29wZS5maWxlRXh0ZW5zaW9uSW52YWxpZCA9IFwiRmlsZSBleHRlbnNpb24gbXVzdCBiZTogXCIgKyAkc2NvcGUuc2VsZWN0ZWRDcmVhdGVEb2N1bWVudFRlbXBsYXRlRXh0ZW5zaW9uO1xuICAgICAgICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8gdmFsaWRhdGUgaWYgdGhlIGZpbGUgZXhpc3RzLCBhbmQgdXNlIHRoZSBzeW5jaHJvbm91cyBjYWxsXG4gICAgICB3aWtpUmVwb3NpdG9yeS5leGlzdHMoJHNjb3BlLmJyYW5jaCwgcGF0aCwgKGV4aXN0cykgPT4ge1xuICAgICAgICAkc2NvcGUuZmlsZUV4aXN0cy5leGlzdHMgPSBleGlzdHM7XG4gICAgICAgICRzY29wZS5maWxlRXhpc3RzLm5hbWUgPSBleGlzdHMgPyBwYXRoIDogZmFsc2U7XG4gICAgICAgIGlmICghZXhpc3RzKSB7XG4gICAgICAgICAgZG9DcmVhdGUoKTtcbiAgICAgICAgfVxuICAgICAgICBDb3JlLiRhcHBseSgkc2NvcGUpO1xuICAgICAgfSk7XG5cbiAgICAgIGZ1bmN0aW9uIGRvQ3JlYXRlKCkge1xuICAgICAgICB2YXIgbmFtZSA9IFdpa2kuZmlsZU5hbWUocGF0aCk7XG4gICAgICAgIHZhciBmb2xkZXIgPSBXaWtpLmZpbGVQYXJlbnQocGF0aCk7XG4gICAgICAgIHZhciBleGVtcGxhciA9IHRlbXBsYXRlLmV4ZW1wbGFyO1xuXG4gICAgICAgIHZhciBjb21taXRNZXNzYWdlID0gXCJDcmVhdGVkIFwiICsgdGVtcGxhdGUubGFiZWw7XG4gICAgICAgIHZhciBleGVtcGxhclVyaSA9IENvcmUudXJsKFwiL3BsdWdpbnMvd2lraS9leGVtcGxhci9cIiArIGV4ZW1wbGFyKTtcblxuICAgICAgICBpZiAodGVtcGxhdGUuZm9sZGVyKSB7XG4gICAgICAgICAgQ29yZS5ub3RpZmljYXRpb24oXCJzdWNjZXNzXCIsIFwiQ3JlYXRpbmcgbmV3IGZvbGRlciBcIiArIG5hbWUpO1xuXG4gICAgICAgICAgd2lraVJlcG9zaXRvcnkuY3JlYXRlRGlyZWN0b3J5KCRzY29wZS5icmFuY2gsIHBhdGgsIGNvbW1pdE1lc3NhZ2UsIChzdGF0dXMpID0+IHtcbiAgICAgICAgICAgIHZhciBsaW5rID0gV2lraS52aWV3TGluaygkc2NvcGUsIHBhdGgsICRsb2NhdGlvbik7XG4gICAgICAgICAgICBnb1RvTGluayhsaW5rLCAkdGltZW91dCwgJGxvY2F0aW9uKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIGlmICh0ZW1wbGF0ZS5wcm9maWxlKSB7XG5cbiAgICAgICAgICBmdW5jdGlvbiB0b1BhdGgocHJvZmlsZU5hbWU6c3RyaW5nKSB7XG4gICAgICAgICAgICB2YXIgYW5zd2VyID0gXCJmYWJyaWMvcHJvZmlsZXMvXCIgKyBwcm9maWxlTmFtZTtcbiAgICAgICAgICAgIGFuc3dlciA9IGFuc3dlci5yZXBsYWNlKC8tL2csIFwiL1wiKTtcbiAgICAgICAgICAgIGFuc3dlciA9IGFuc3dlciArIFwiLnByb2ZpbGVcIjtcbiAgICAgICAgICAgIHJldHVybiBhbnN3ZXI7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgZnVuY3Rpb24gdG9Qcm9maWxlTmFtZShwYXRoOnN0cmluZykge1xuICAgICAgICAgICAgdmFyIGFuc3dlciA9IHBhdGgucmVwbGFjZSgvXmZhYnJpY1xcL3Byb2ZpbGVzXFwvLywgXCJcIik7XG4gICAgICAgICAgICBhbnN3ZXIgPSBhbnN3ZXIucmVwbGFjZSgvXFwvL2csIFwiLVwiKTtcbiAgICAgICAgICAgIGFuc3dlciA9IGFuc3dlci5yZXBsYWNlKC9cXC5wcm9maWxlJC8sIFwiXCIpO1xuICAgICAgICAgICAgcmV0dXJuIGFuc3dlcjtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyBzdHJpcCBvZmYgYW55IHByb2ZpbGUgbmFtZSBpbiBjYXNlIHRoZSB1c2VyIGNyZWF0ZXMgYSBwcm9maWxlIHdoaWxlIGxvb2tpbmcgYXRcbiAgICAgICAgICAvLyBhbm90aGVyIHByb2ZpbGVcbiAgICAgICAgICBmb2xkZXIgPSBmb2xkZXIucmVwbGFjZSgvXFwvPT8oXFx3KilcXC5wcm9maWxlJC8sIFwiXCIpO1xuXG4gICAgICAgICAgdmFyIGNvbmNhdGVuYXRlZCA9IGZvbGRlciArIFwiL1wiICsgbmFtZTtcblxuICAgICAgICAgIHZhciBwcm9maWxlTmFtZSA9IHRvUHJvZmlsZU5hbWUoY29uY2F0ZW5hdGVkKTtcbiAgICAgICAgICB2YXIgdGFyZ2V0UGF0aCA9IHRvUGF0aChwcm9maWxlTmFtZSk7XG5cbiAgICAgICAgfSBlbHNlIGlmICh0ZW1wbGF0ZS5nZW5lcmF0ZWQpIHtcbiAgICAgICAgICB2YXIgb3B0aW9uczpXaWtpLkdlbmVyYXRlT3B0aW9ucyA9IHtcbiAgICAgICAgICAgIHdvcmtzcGFjZTogd29ya3NwYWNlLFxuICAgICAgICAgICAgZm9ybTogJHNjb3BlLmZvcm1EYXRhLFxuICAgICAgICAgICAgbmFtZTogZmlsZU5hbWUsXG4gICAgICAgICAgICBwYXJlbnRJZDogZm9sZGVyLFxuICAgICAgICAgICAgYnJhbmNoOiAkc2NvcGUuYnJhbmNoLFxuICAgICAgICAgICAgc3VjY2VzczogKGNvbnRlbnRzKT0+IHtcbiAgICAgICAgICAgICAgaWYgKGNvbnRlbnRzKSB7XG4gICAgICAgICAgICAgICAgd2lraVJlcG9zaXRvcnkucHV0UGFnZSgkc2NvcGUuYnJhbmNoLCBwYXRoLCBjb250ZW50cywgY29tbWl0TWVzc2FnZSwgKHN0YXR1cykgPT4ge1xuICAgICAgICAgICAgICAgICAgbG9nLmRlYnVnKFwiQ3JlYXRlZCBmaWxlIFwiICsgbmFtZSk7XG4gICAgICAgICAgICAgICAgICBXaWtpLm9uQ29tcGxldGUoc3RhdHVzKTtcbiAgICAgICAgICAgICAgICAgIHJldHVyblRvRGlyZWN0b3J5KCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuVG9EaXJlY3RvcnkoKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGVycm9yOiAoZXJyb3IpPT4ge1xuICAgICAgICAgICAgICBDb3JlLm5vdGlmaWNhdGlvbignZXJyb3InLCBlcnJvcik7XG4gICAgICAgICAgICAgIENvcmUuJGFwcGx5KCRzY29wZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfTtcbiAgICAgICAgICB0ZW1wbGF0ZS5nZW5lcmF0ZWQuZ2VuZXJhdGUob3B0aW9ucyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gbG9hZCB0aGUgZXhhbXBsZSBkYXRhIChpZiBhbnkpIGFuZCB0aGVuIGFkZCB0aGUgZG9jdW1lbnQgdG8gZ2l0IGFuZCBjaGFuZ2UgdGhlIGxpbmsgdG8gdGhlIG5ldyBkb2N1bWVudFxuICAgICAgICAgICRodHRwLmdldChleGVtcGxhclVyaSlcbiAgICAgICAgICAgIC5zdWNjZXNzKGZ1bmN0aW9uIChkYXRhLCBzdGF0dXMsIGhlYWRlcnMsIGNvbmZpZykge1xuICAgICAgICAgICAgICBwdXRQYWdlKHBhdGgsIG5hbWUsIGZvbGRlciwgZGF0YSwgY29tbWl0TWVzc2FnZSk7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLmVycm9yKGZ1bmN0aW9uIChkYXRhLCBzdGF0dXMsIGhlYWRlcnMsIGNvbmZpZykge1xuICAgICAgICAgICAgICAvLyBjcmVhdGUgYW4gZW1wdHkgZmlsZVxuICAgICAgICAgICAgICBwdXRQYWdlKHBhdGgsIG5hbWUsIGZvbGRlciwgXCJcIiwgY29tbWl0TWVzc2FnZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH07XG5cbiAgICBmdW5jdGlvbiBwdXRQYWdlKHBhdGgsIG5hbWUsIGZvbGRlciwgY29udGVudHMsIGNvbW1pdE1lc3NhZ2UpIHtcbiAgICAgIC8vIFRPRE8gbGV0cyBjaGVjayB0aGlzIHBhZ2UgZG9lcyBub3QgZXhpc3QgLSBpZiBpdCBkb2VzIGxldHMga2VlcCBhZGRpbmcgYSBuZXcgcG9zdCBmaXguLi5cbiAgICAgIHdpa2lSZXBvc2l0b3J5LnB1dFBhZ2UoJHNjb3BlLmJyYW5jaCwgcGF0aCwgY29udGVudHMsIGNvbW1pdE1lc3NhZ2UsIChzdGF0dXMpID0+IHtcbiAgICAgICAgbG9nLmRlYnVnKFwiQ3JlYXRlZCBmaWxlIFwiICsgbmFtZSk7XG4gICAgICAgIFdpa2kub25Db21wbGV0ZShzdGF0dXMpO1xuXG4gICAgICAgIC8vIGxldHMgbmF2aWdhdGUgdG8gdGhlIGVkaXQgbGlua1xuICAgICAgICAvLyBsb2FkIHRoZSBkaXJlY3RvcnkgYW5kIGZpbmQgdGhlIGNoaWxkIGl0ZW1cbiAgICAgICAgJHNjb3BlLmdpdCA9IHdpa2lSZXBvc2l0b3J5LmdldFBhZ2UoJHNjb3BlLmJyYW5jaCwgZm9sZGVyLCAkc2NvcGUub2JqZWN0SWQsIChkZXRhaWxzKSA9PiB7XG4gICAgICAgICAgLy8gbGV0cyBmaW5kIHRoZSBjaGlsZCBlbnRyeSBzbyB3ZSBjYW4gY2FsY3VsYXRlIGl0cyBjb3JyZWN0IGVkaXQgbGlua1xuICAgICAgICAgIHZhciBsaW5rOnN0cmluZyA9IG51bGw7XG4gICAgICAgICAgaWYgKGRldGFpbHMgJiYgZGV0YWlscy5jaGlsZHJlbikge1xuICAgICAgICAgICAgbG9nLmRlYnVnKFwic2Nhbm5lZCB0aGUgZGlyZWN0b3J5IFwiICsgZGV0YWlscy5jaGlsZHJlbi5sZW5ndGggKyBcIiBjaGlsZHJlblwiKTtcbiAgICAgICAgICAgIHZhciBjaGlsZCA9IGRldGFpbHMuY2hpbGRyZW4uZmluZChjID0+IGMubmFtZSA9PT0gZmlsZU5hbWUpO1xuICAgICAgICAgICAgaWYgKGNoaWxkKSB7XG4gICAgICAgICAgICAgIGxpbmsgPSAkc2NvcGUuY2hpbGRMaW5rKGNoaWxkKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGxvZy5kZWJ1ZyhcIkNvdWxkIG5vdCBmaW5kIG5hbWUgJ1wiICsgZmlsZU5hbWUgKyBcIicgaW4gdGhlIGxpc3Qgb2YgZmlsZSBuYW1lcyBcIiArIEpTT04uc3RyaW5naWZ5KGRldGFpbHMuY2hpbGRyZW4ubWFwKGMgPT4gYy5uYW1lKSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoIWxpbmspIHtcbiAgICAgICAgICAgIGxvZy5kZWJ1ZyhcIldBUk5JTkc6IGNvdWxkIG5vdCBmaW5kIHRoZSBjaGlsZExpbmsgc28gcmV2ZXJ0aW5nIHRvIHRoZSB3aWtpIGVkaXQgcGFnZSFcIik7XG4gICAgICAgICAgICBsaW5rID0gV2lraS5lZGl0TGluaygkc2NvcGUsIHBhdGgsICRsb2NhdGlvbik7XG4gICAgICAgICAgfVxuICAgICAgICAgIC8vQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICAgICAgICBnb1RvTGluayhsaW5rLCAkdGltZW91dCwgJGxvY2F0aW9uKTtcbiAgICAgICAgfSk7XG4gICAgICB9KVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldE5ld0RvY3VtZW50UGF0aCgpIHtcbiAgICAgIHZhciB0ZW1wbGF0ZSA9ICRzY29wZS5zZWxlY3RlZENyZWF0ZURvY3VtZW50VGVtcGxhdGU7XG4gICAgICBpZiAoIXRlbXBsYXRlKSB7XG4gICAgICAgIGxvZy5kZWJ1ZyhcIk5vIHRlbXBsYXRlIHNlbGVjdGVkLlwiKTtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG4gICAgICB2YXIgZXhlbXBsYXIgPSB0ZW1wbGF0ZS5leGVtcGxhciB8fCBcIlwiO1xuICAgICAgdmFyIG5hbWU6c3RyaW5nID0gJHNjb3BlLm5ld0RvY3VtZW50TmFtZSB8fCBleGVtcGxhcjtcblxuICAgICAgaWYgKG5hbWUuaW5kZXhPZignLicpIDwgMCkge1xuICAgICAgICAvLyBsZXRzIGFkZCB0aGUgZmlsZSBleHRlbnNpb24gZnJvbSB0aGUgZXhlbXBsYXJcbiAgICAgICAgdmFyIGlkeCA9IGV4ZW1wbGFyLmxhc3RJbmRleE9mKFwiLlwiKTtcbiAgICAgICAgaWYgKGlkeCA+IDApIHtcbiAgICAgICAgICBuYW1lICs9IGV4ZW1wbGFyLnN1YnN0cmluZyhpZHgpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vIGxldHMgZGVhbCB3aXRoIGRpcmVjdG9yaWVzIGluIHRoZSBuYW1lXG4gICAgICB2YXIgZm9sZGVyOnN0cmluZyA9ICRzY29wZS5wYWdlSWQ7XG4gICAgICBpZiAoJHNjb3BlLmlzRmlsZSkge1xuICAgICAgICAvLyBpZiB3ZSBhcmUgYSBmaWxlIGxldHMgZGlzY2FyZCB0aGUgbGFzdCBwYXJ0IG9mIHRoZSBwYXRoXG4gICAgICAgIHZhciBpZHg6YW55ID0gZm9sZGVyLmxhc3RJbmRleE9mKFwiL1wiKTtcbiAgICAgICAgaWYgKGlkeCA8PSAwKSB7XG4gICAgICAgICAgZm9sZGVyID0gXCJcIjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBmb2xkZXIgPSBmb2xkZXIuc3Vic3RyaW5nKDAsIGlkeCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHZhciBpZHg6YW55ID0gbmFtZS5sYXN0SW5kZXhPZihcIi9cIik7XG4gICAgICBpZiAoaWR4ID4gMCkge1xuICAgICAgICBmb2xkZXIgKz0gXCIvXCIgKyBuYW1lLnN1YnN0cmluZygwLCBpZHgpO1xuICAgICAgICBuYW1lID0gbmFtZS5zdWJzdHJpbmcoaWR4ICsgMSk7XG4gICAgICB9XG4gICAgICBmb2xkZXIgPSBDb3JlLnRyaW1MZWFkaW5nKGZvbGRlciwgXCIvXCIpO1xuICAgICAgcmV0dXJuIGZvbGRlciArIChmb2xkZXIgPyBcIi9cIiA6IFwiXCIpICsgbmFtZTtcbiAgICB9XG5cbiAgfV0pO1xuXG59XG4iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vaW5jbHVkZXMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwid2lraUhlbHBlcnMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwid2lraVBsdWdpbi50c1wiLz5cblxuLyoqXG4gKiBAbW9kdWxlIFdpa2lcbiAqL1xubW9kdWxlIFdpa2kge1xuICBfbW9kdWxlLmNvbnRyb2xsZXIoXCJXaWtpLkVkaXRDb250cm9sbGVyXCIsIFtcIiRzY29wZVwiLCBcIiRsb2NhdGlvblwiLCBcIiRyb3V0ZVBhcmFtc1wiLCBcImZpbGVFeHRlbnNpb25UeXBlUmVnaXN0cnlcIiwgKCRzY29wZSwgJGxvY2F0aW9uLCAkcm91dGVQYXJhbXMsIGZpbGVFeHRlbnNpb25UeXBlUmVnaXN0cnkpID0+IHtcblxuICAgIFdpa2kuaW5pdFNjb3BlKCRzY29wZSwgJHJvdXRlUGFyYW1zLCAkbG9jYXRpb24pO1xuICAgICRzY29wZS5icmVhZGNydW1iQ29uZmlnLnB1c2goY3JlYXRlRWRpdGluZ0JyZWFkY3J1bWIoJHNjb3BlKSk7XG5cbiAgICB2YXIgd2lraVJlcG9zaXRvcnkgPSAkc2NvcGUud2lraVJlcG9zaXRvcnk7XG5cbiAgICAkc2NvcGUuZW50aXR5ID0ge1xuICAgICAgc291cmNlOiBudWxsXG4gICAgfTtcblxuICAgIHZhciBmb3JtYXQgPSBXaWtpLmZpbGVGb3JtYXQoJHNjb3BlLnBhZ2VJZCwgZmlsZUV4dGVuc2lvblR5cGVSZWdpc3RyeSk7XG4gICAgdmFyIGZvcm0gPSBudWxsO1xuICAgIGlmICgoZm9ybWF0ICYmIGZvcm1hdCA9PT0gXCJqYXZhc2NyaXB0XCIpIHx8IGlzQ3JlYXRlKCkpIHtcbiAgICAgIGZvcm0gPSAkbG9jYXRpb24uc2VhcmNoKClbXCJmb3JtXCJdO1xuICAgIH1cblxuICAgIHZhciBvcHRpb25zID0ge1xuICAgICAgbW9kZToge1xuICAgICAgICBuYW1lOiBmb3JtYXRcbiAgICAgIH1cbiAgICB9O1xuICAgICRzY29wZS5jb2RlTWlycm9yT3B0aW9ucyA9IENvZGVFZGl0b3IuY3JlYXRlRWRpdG9yU2V0dGluZ3Mob3B0aW9ucyk7XG4gICAgJHNjb3BlLm1vZGlmaWVkID0gZmFsc2U7XG5cblxuICAgICRzY29wZS5pc1ZhbGlkID0gKCkgPT4gJHNjb3BlLmZpbGVOYW1lO1xuXG4gICAgJHNjb3BlLmNhblNhdmUgPSAoKSA9PiAhJHNjb3BlLm1vZGlmaWVkO1xuXG4gICAgJHNjb3BlLiR3YXRjaCgnZW50aXR5LnNvdXJjZScsIChuZXdWYWx1ZSwgb2xkVmFsdWUpID0+IHtcbiAgICAgICRzY29wZS5tb2RpZmllZCA9IG5ld1ZhbHVlICYmIG9sZFZhbHVlICYmIG5ld1ZhbHVlICE9PSBvbGRWYWx1ZTtcbiAgICB9LCB0cnVlKTtcblxuICAgIGxvZy5kZWJ1ZyhcInBhdGg6IFwiLCAkc2NvcGUucGF0aCk7XG5cbiAgICAkc2NvcGUuJHdhdGNoKCdtb2RpZmllZCcsIChuZXdWYWx1ZSwgb2xkVmFsdWUpID0+IHtcbiAgICAgIGxvZy5kZWJ1ZyhcIm1vZGlmaWVkOiBcIiwgbmV3VmFsdWUpO1xuICAgIH0pO1xuXG4gICAgJHNjb3BlLnZpZXdMaW5rID0gKCkgPT4gV2lraS52aWV3TGluaygkc2NvcGUsICRzY29wZS5wYWdlSWQsICRsb2NhdGlvbiwgJHNjb3BlLmZpbGVOYW1lKTtcblxuICAgICRzY29wZS5jYW5jZWwgPSAoKSA9PiB7XG4gICAgICBnb1RvVmlldygpO1xuICAgIH07XG5cbiAgICAkc2NvcGUuc2F2ZSA9ICgpID0+IHtcbiAgICAgIGlmICgkc2NvcGUubW9kaWZpZWQgJiYgJHNjb3BlLmZpbGVOYW1lKSB7XG4gICAgICAgIHNhdmVUbygkc2NvcGVbXCJwYWdlSWRcIl0pO1xuICAgICAgfVxuICAgIH07XG5cbiAgICAkc2NvcGUuY3JlYXRlID0gKCkgPT4ge1xuICAgICAgLy8gbGV0cyBjb21iaW5lIHRoZSBmaWxlIG5hbWUgd2l0aCB0aGUgY3VycmVudCBwYWdlSWQgKHdoaWNoIGlzIHRoZSBkaXJlY3RvcnkpXG4gICAgICB2YXIgcGF0aCA9ICRzY29wZS5wYWdlSWQgKyBcIi9cIiArICRzY29wZS5maWxlTmFtZTtcbiAgICAgIGxvZy5kZWJ1ZyhcImNyZWF0aW5nIG5ldyBmaWxlIGF0IFwiICsgcGF0aCk7XG4gICAgICBzYXZlVG8ocGF0aCk7XG4gICAgfTtcblxuICAgICRzY29wZS5vblN1Ym1pdCA9IChqc29uLCBmb3JtKSA9PiB7XG4gICAgICBpZiAoaXNDcmVhdGUoKSkge1xuICAgICAgICAkc2NvcGUuY3JlYXRlKCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAkc2NvcGUuc2F2ZSgpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICAkc2NvcGUub25DYW5jZWwgPSAoZm9ybSkgPT4ge1xuICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgIGdvVG9WaWV3KCk7XG4gICAgICAgIENvcmUuJGFwcGx5KCRzY29wZSlcbiAgICAgIH0sIDUwKTtcbiAgICB9O1xuXG5cbiAgICB1cGRhdGVWaWV3KCk7XG5cbiAgICBmdW5jdGlvbiBpc0NyZWF0ZSgpIHtcbiAgICAgIHJldHVybiAkbG9jYXRpb24ucGF0aCgpLnN0YXJ0c1dpdGgoXCIvd2lraS9jcmVhdGVcIik7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gdXBkYXRlVmlldygpIHtcbiAgICAgIC8vIG9ubHkgbG9hZCB0aGUgc291cmNlIGlmIG5vdCBpbiBjcmVhdGUgbW9kZVxuICAgICAgaWYgKGlzQ3JlYXRlKCkpIHtcbiAgICAgICAgdXBkYXRlU291cmNlVmlldygpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbG9nLmRlYnVnKFwiR2V0dGluZyBwYWdlLCBicmFuY2g6IFwiLCAkc2NvcGUuYnJhbmNoLCBcIiBwYWdlSWQ6IFwiLCAkc2NvcGUucGFnZUlkLCBcIiBvYmplY3RJZDogXCIsICRzY29wZS5vYmplY3RJZCk7XG4gICAgICAgIHdpa2lSZXBvc2l0b3J5LmdldFBhZ2UoJHNjb3BlLmJyYW5jaCwgJHNjb3BlLnBhZ2VJZCwgJHNjb3BlLm9iamVjdElkLCBvbkZpbGVDb250ZW50cyk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gb25GaWxlQ29udGVudHMoZGV0YWlscykge1xuICAgICAgdmFyIGNvbnRlbnRzID0gZGV0YWlscy50ZXh0O1xuICAgICAgJHNjb3BlLmVudGl0eS5zb3VyY2UgPSBjb250ZW50cztcbiAgICAgICRzY29wZS5maWxlTmFtZSA9ICRzY29wZS5wYWdlSWQuc3BsaXQoJy8nKS5sYXN0KCk7XG4gICAgICBsb2cuZGVidWcoXCJmaWxlIG5hbWU6IFwiLCAkc2NvcGUuZmlsZU5hbWUpO1xuICAgICAgbG9nLmRlYnVnKFwiZmlsZSBkZXRhaWxzOiBcIiwgZGV0YWlscyk7XG4gICAgICB1cGRhdGVTb3VyY2VWaWV3KCk7XG4gICAgICBDb3JlLiRhcHBseSgkc2NvcGUpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHVwZGF0ZVNvdXJjZVZpZXcoKSB7XG4gICAgICBpZiAoZm9ybSkge1xuICAgICAgICBpZiAoaXNDcmVhdGUoKSkge1xuICAgICAgICAgIC8vIGxldHMgZGVmYXVsdCBhIGZpbGUgbmFtZVxuICAgICAgICAgIGlmICghJHNjb3BlLmZpbGVOYW1lKSB7XG4gICAgICAgICAgICAkc2NvcGUuZmlsZU5hbWUgPSBcIlwiICsgQ29yZS5nZXRVVUlEKCkgKyBcIi5qc29uXCI7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIC8vIG5vdyBsZXRzIHRyeSBsb2FkIHRoZSBmb3JtIGRlZmludGlvbiBKU09OIHNvIHdlIGNhbiB0aGVuIHJlbmRlciB0aGUgZm9ybVxuICAgICAgICAkc2NvcGUuc291cmNlVmlldyA9IG51bGw7XG4gICAgICAgICRzY29wZS5naXQgPSB3aWtpUmVwb3NpdG9yeS5nZXRQYWdlKCRzY29wZS5icmFuY2gsIGZvcm0sICRzY29wZS5vYmplY3RJZCwgKGRldGFpbHMpID0+IHtcbiAgICAgICAgICBvbkZvcm1TY2hlbWEoV2lraS5wYXJzZUpzb24oZGV0YWlscy50ZXh0KSk7XG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgJHNjb3BlLnNvdXJjZVZpZXcgPSBcInBsdWdpbnMvd2lraS9odG1sL3NvdXJjZUVkaXQuaHRtbFwiO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIG9uRm9ybVNjaGVtYShqc29uKSB7XG4gICAgICAkc2NvcGUuZm9ybURlZmluaXRpb24gPSBqc29uO1xuICAgICAgaWYgKCRzY29wZS5lbnRpdHkuc291cmNlKSB7XG4gICAgICAgICRzY29wZS5mb3JtRW50aXR5ID0gV2lraS5wYXJzZUpzb24oJHNjb3BlLmVudGl0eS5zb3VyY2UpO1xuICAgICAgfVxuICAgICAgJHNjb3BlLnNvdXJjZVZpZXcgPSBcInBsdWdpbnMvd2lraS9odG1sL2Zvcm1FZGl0Lmh0bWxcIjtcbiAgICAgIENvcmUuJGFwcGx5KCRzY29wZSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ29Ub1ZpZXcoKSB7XG4gICAgICB2YXIgcGF0aCA9IENvcmUudHJpbUxlYWRpbmcoJHNjb3BlLnZpZXdMaW5rKCksIFwiI1wiKTtcbiAgICAgIGxvZy5kZWJ1ZyhcImdvaW5nIHRvIHZpZXcgXCIgKyBwYXRoKTtcbiAgICAgICRsb2NhdGlvbi5wYXRoKFdpa2kuZGVjb2RlUGF0aChwYXRoKSk7XG4gICAgICBsb2cuZGVidWcoXCJsb2NhdGlvbiBpcyBub3cgXCIgKyAkbG9jYXRpb24ucGF0aCgpKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzYXZlVG8ocGF0aDpzdHJpbmcpIHtcbiAgICAgIHZhciBjb21taXRNZXNzYWdlID0gJHNjb3BlLmNvbW1pdE1lc3NhZ2UgfHwgXCJVcGRhdGVkIHBhZ2UgXCIgKyAkc2NvcGUucGFnZUlkO1xuICAgICAgdmFyIGNvbnRlbnRzID0gJHNjb3BlLmVudGl0eS5zb3VyY2U7XG4gICAgICBpZiAoJHNjb3BlLmZvcm1FbnRpdHkpIHtcbiAgICAgICAgY29udGVudHMgPSBKU09OLnN0cmluZ2lmeSgkc2NvcGUuZm9ybUVudGl0eSwgbnVsbCwgXCIgIFwiKTtcbiAgICAgIH1cbiAgICAgIGxvZy5kZWJ1ZyhcIlNhdmluZyBmaWxlLCBicmFuY2g6IFwiLCAkc2NvcGUuYnJhbmNoLCBcIiBwYXRoOiBcIiwgJHNjb3BlLnBhdGgpO1xuICAgICAgLy9sb2cuZGVidWcoXCJBYm91dCB0byB3cml0ZSBjb250ZW50cyAnXCIgKyBjb250ZW50cyArIFwiJ1wiKTtcbiAgICAgIHdpa2lSZXBvc2l0b3J5LnB1dFBhZ2UoJHNjb3BlLmJyYW5jaCwgcGF0aCwgY29udGVudHMsIGNvbW1pdE1lc3NhZ2UsIChzdGF0dXMpID0+IHtcbiAgICAgICAgV2lraS5vbkNvbXBsZXRlKHN0YXR1cyk7XG4gICAgICAgICRzY29wZS5tb2RpZmllZCA9IGZhbHNlO1xuICAgICAgICBDb3JlLm5vdGlmaWNhdGlvbihcInN1Y2Nlc3NcIiwgXCJTYXZlZCBcIiArIHBhdGgpO1xuICAgICAgICBnb1RvVmlldygpO1xuICAgICAgICBDb3JlLiRhcHBseSgkc2NvcGUpO1xuICAgICAgfSk7XG4gICAgfVxuICB9XSk7XG59XG4iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vaW5jbHVkZXMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwid2lraUhlbHBlcnMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwid2lraVBsdWdpbi50c1wiLz5cblxuLyoqXG4gKiBAbW9kdWxlIFdpa2lcbiAqL1xubW9kdWxlIFdpa2kge1xuXG4gIC8vIGNvbnRyb2xsZXIgZm9yIGhhbmRsaW5nIGZpbGUgZHJvcHNcbiAgZXhwb3J0IHZhciBGaWxlRHJvcENvbnRyb2xsZXIgPSBfbW9kdWxlLmNvbnRyb2xsZXIoXCJXaWtpLkZpbGVEcm9wQ29udHJvbGxlclwiLCBbXCIkc2NvcGVcIiwgXCJGaWxlVXBsb2FkZXJcIiwgXCIkcm91dGVcIiwgXCIkdGltZW91dFwiLCBcInVzZXJEZXRhaWxzXCIsICgkc2NvcGUsIEZpbGVVcGxvYWRlciwgJHJvdXRlOm5nLnJvdXRlLklSb3V0ZVNlcnZpY2UsICR0aW1lb3V0Om5nLklUaW1lb3V0U2VydmljZSwgdXNlckRldGFpbHM6Q29yZS5Vc2VyRGV0YWlscykgPT4ge1xuXG5cbiAgICB2YXIgdXBsb2FkVVJJID0gV2lraS5naXRSZXN0VVJMKCRzY29wZSwgJHNjb3BlLnBhZ2VJZCkgKyAnLyc7XG4gICAgdmFyIHVwbG9hZGVyID0gJHNjb3BlLnVwbG9hZGVyID0gbmV3IEZpbGVVcGxvYWRlcih7XG4gICAgICBoZWFkZXJzOiB7XG4gICAgICAgICdBdXRob3JpemF0aW9uJzogQ29yZS5hdXRoSGVhZGVyVmFsdWUodXNlckRldGFpbHMpXG4gICAgICB9LFxuICAgICAgYXV0b1VwbG9hZDogdHJ1ZSxcbiAgICAgIHdpdGhDcmVkZW50aWFsczogdHJ1ZSxcbiAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgdXJsOiB1cGxvYWRVUklcbiAgICB9KTtcbiAgICAkc2NvcGUuZG9VcGxvYWQgPSAoKSA9PiB7XG4gICAgICB1cGxvYWRlci51cGxvYWRBbGwoKTtcbiAgICB9O1xuICAgIHVwbG9hZGVyLm9uV2hlbkFkZGluZ0ZpbGVGYWlsZWQgPSBmdW5jdGlvbiAoaXRlbSAvKntGaWxlfEZpbGVMaWtlT2JqZWN0fSovLCBmaWx0ZXIsIG9wdGlvbnMpIHtcbiAgICAgIGxvZy5kZWJ1Zygnb25XaGVuQWRkaW5nRmlsZUZhaWxlZCcsIGl0ZW0sIGZpbHRlciwgb3B0aW9ucyk7XG4gICAgfTtcbiAgICB1cGxvYWRlci5vbkFmdGVyQWRkaW5nRmlsZSA9IGZ1bmN0aW9uIChmaWxlSXRlbSkge1xuICAgICAgbG9nLmRlYnVnKCdvbkFmdGVyQWRkaW5nRmlsZScsIGZpbGVJdGVtKTtcbiAgICB9O1xuICAgIHVwbG9hZGVyLm9uQWZ0ZXJBZGRpbmdBbGwgPSBmdW5jdGlvbiAoYWRkZWRGaWxlSXRlbXMpIHtcbiAgICAgIGxvZy5kZWJ1Zygnb25BZnRlckFkZGluZ0FsbCcsIGFkZGVkRmlsZUl0ZW1zKTtcbiAgICB9O1xuICAgIHVwbG9hZGVyLm9uQmVmb3JlVXBsb2FkSXRlbSA9IGZ1bmN0aW9uIChpdGVtKSB7XG4gICAgICBpZiAoJ2ZpbGUnIGluIGl0ZW0pIHtcbiAgICAgICAgaXRlbS5maWxlU2l6ZU1CID0gKGl0ZW0uZmlsZS5zaXplIC8gMTAyNCAvIDEwMjQpLnRvRml4ZWQoMik7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpdGVtLmZpbGVTaXplTUIgPSAwO1xuICAgICAgfVxuICAgICAgLy9pdGVtLnVybCA9IFVybEhlbHBlcnMuam9pbih1cGxvYWRVUkksIGl0ZW0uZmlsZS5uYW1lKTtcbiAgICAgIGl0ZW0udXJsID0gdXBsb2FkVVJJO1xuICAgICAgbG9nLmluZm8oXCJMb2FkaW5nIGZpbGVzIHRvIFwiICsgdXBsb2FkVVJJKTtcbiAgICAgIGxvZy5kZWJ1Zygnb25CZWZvcmVVcGxvYWRJdGVtJywgaXRlbSk7XG4gICAgfTtcbiAgICB1cGxvYWRlci5vblByb2dyZXNzSXRlbSA9IGZ1bmN0aW9uIChmaWxlSXRlbSwgcHJvZ3Jlc3MpIHtcbiAgICAgIGxvZy5kZWJ1Zygnb25Qcm9ncmVzc0l0ZW0nLCBmaWxlSXRlbSwgcHJvZ3Jlc3MpO1xuICAgIH07XG4gICAgdXBsb2FkZXIub25Qcm9ncmVzc0FsbCA9IGZ1bmN0aW9uIChwcm9ncmVzcykge1xuICAgICAgbG9nLmRlYnVnKCdvblByb2dyZXNzQWxsJywgcHJvZ3Jlc3MpO1xuICAgIH07XG4gICAgdXBsb2FkZXIub25TdWNjZXNzSXRlbSA9IGZ1bmN0aW9uIChmaWxlSXRlbSwgcmVzcG9uc2UsIHN0YXR1cywgaGVhZGVycykge1xuICAgICAgbG9nLmRlYnVnKCdvblN1Y2Nlc3NJdGVtJywgZmlsZUl0ZW0sIHJlc3BvbnNlLCBzdGF0dXMsIGhlYWRlcnMpO1xuICAgIH07XG4gICAgdXBsb2FkZXIub25FcnJvckl0ZW0gPSBmdW5jdGlvbiAoZmlsZUl0ZW0sIHJlc3BvbnNlLCBzdGF0dXMsIGhlYWRlcnMpIHtcbiAgICAgIGxvZy5kZWJ1Zygnb25FcnJvckl0ZW0nLCBmaWxlSXRlbSwgcmVzcG9uc2UsIHN0YXR1cywgaGVhZGVycyk7XG4gICAgfTtcbiAgICB1cGxvYWRlci5vbkNhbmNlbEl0ZW0gPSBmdW5jdGlvbiAoZmlsZUl0ZW0sIHJlc3BvbnNlLCBzdGF0dXMsIGhlYWRlcnMpIHtcbiAgICAgIGxvZy5kZWJ1Zygnb25DYW5jZWxJdGVtJywgZmlsZUl0ZW0sIHJlc3BvbnNlLCBzdGF0dXMsIGhlYWRlcnMpO1xuICAgIH07XG4gICAgdXBsb2FkZXIub25Db21wbGV0ZUl0ZW0gPSBmdW5jdGlvbiAoZmlsZUl0ZW0sIHJlc3BvbnNlLCBzdGF0dXMsIGhlYWRlcnMpIHtcbiAgICAgIGxvZy5kZWJ1Zygnb25Db21wbGV0ZUl0ZW0nLCBmaWxlSXRlbSwgcmVzcG9uc2UsIHN0YXR1cywgaGVhZGVycyk7XG4gICAgfTtcbiAgICB1cGxvYWRlci5vbkNvbXBsZXRlQWxsID0gZnVuY3Rpb24gKCkge1xuICAgICAgbG9nLmRlYnVnKCdvbkNvbXBsZXRlQWxsJyk7XG4gICAgICB1cGxvYWRlci5jbGVhclF1ZXVlKCk7XG4gICAgICAkdGltZW91dCgoKSA9PiB7XG4gICAgICAgIGxvZy5pbmZvKFwiQ29tcGxldGVkIGFsbCB1cGxvYWRzLiBMZXRzIGZvcmNlIGEgcmVsb2FkXCIpO1xuICAgICAgICAkcm91dGUucmVsb2FkKCk7XG4gICAgICAgIENvcmUuJGFwcGx5KCRzY29wZSk7XG4gICAgICB9LCAyMDApO1xuICAgIH07XG4gIH1dKTtcblxufVxuIiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL2luY2x1ZGVzLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIndpa2lIZWxwZXJzLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIndpa2lQbHVnaW4udHNcIi8+XG5cbi8qKlxuICogQG1vZHVsZSBXaWtpXG4gKi9cbm1vZHVsZSBXaWtpIHtcblxuICBfbW9kdWxlLmNvbnRyb2xsZXIoXCJXaWtpLkZvcm1UYWJsZUNvbnRyb2xsZXJcIiwgW1wiJHNjb3BlXCIsIFwiJGxvY2F0aW9uXCIsIFwiJHJvdXRlUGFyYW1zXCIsICgkc2NvcGUsICRsb2NhdGlvbiwgJHJvdXRlUGFyYW1zKSA9PiB7XG4gICAgV2lraS5pbml0U2NvcGUoJHNjb3BlLCAkcm91dGVQYXJhbXMsICRsb2NhdGlvbik7XG4gICAgdmFyIHdpa2lSZXBvc2l0b3J5ID0gJHNjb3BlLndpa2lSZXBvc2l0b3J5O1xuXG4gICAgJHNjb3BlLmNvbHVtbkRlZnMgPSBbXTtcblxuICAgICRzY29wZS5ncmlkT3B0aW9ucyA9IHtcbiAgICAgICBkYXRhOiAnbGlzdCcsXG4gICAgICAgZGlzcGxheUZvb3RlcjogZmFsc2UsXG4gICAgICAgc2hvd0ZpbHRlcjogZmFsc2UsXG4gICAgICAgZmlsdGVyT3B0aW9uczoge1xuICAgICAgICAgZmlsdGVyVGV4dDogJydcbiAgICAgICB9LFxuICAgICAgIGNvbHVtbkRlZnM6ICRzY29wZS5jb2x1bW5EZWZzXG4gICAgIH07XG5cblxuICAgICRzY29wZS52aWV3TGluayA9IChyb3cpID0+IHtcbiAgICAgIHJldHVybiBjaGlsZExpbmsocm93LCBcIi92aWV3XCIpO1xuICAgIH07XG4gICAgJHNjb3BlLmVkaXRMaW5rID0gKHJvdykgPT4ge1xuICAgICAgcmV0dXJuIGNoaWxkTGluayhyb3csIFwiL2VkaXRcIik7XG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIGNoaWxkTGluayhjaGlsZCwgcHJlZml4KSB7XG4gICAgICB2YXIgc3RhcnQgPSBXaWtpLnN0YXJ0TGluaygkc2NvcGUpO1xuICAgICAgdmFyIGNoaWxkSWQgPSAoY2hpbGQpID8gY2hpbGRbXCJfaWRcIl0gfHwgXCJcIiA6IFwiXCI7XG4gICAgICByZXR1cm4gQ29yZS5jcmVhdGVIcmVmKCRsb2NhdGlvbiwgc3RhcnQgKyBwcmVmaXggKyBcIi9cIiArICRzY29wZS5wYWdlSWQgKyBcIi9cIiArIGNoaWxkSWQpO1xuICAgIH1cblxuICAgIHZhciBsaW5rc0NvbHVtbiA9IHtcbiAgICAgIGZpZWxkOiAnX2lkJyxcbiAgICAgIGRpc3BsYXlOYW1lOiAnQWN0aW9ucycsXG4gICAgICBjZWxsVGVtcGxhdGU6ICc8ZGl2IGNsYXNzPVwibmdDZWxsVGV4dFwiXCI+PGEgbmctaHJlZj1cInt7dmlld0xpbmsocm93LmVudGl0eSl9fVwiIGNsYXNzPVwiYnRuXCI+VmlldzwvYT4gPGEgbmctaHJlZj1cInt7ZWRpdExpbmsocm93LmVudGl0eSl9fVwiIGNsYXNzPVwiYnRuXCI+RWRpdDwvYT48L2Rpdj4nXG4gICAgfTtcblxuICAgICRzY29wZS4kb24oXCIkcm91dGVDaGFuZ2VTdWNjZXNzXCIsIGZ1bmN0aW9uIChldmVudCwgY3VycmVudCwgcHJldmlvdXMpIHtcbiAgICAgIC8vIGxldHMgZG8gdGhpcyBhc3luY2hyb25vdXNseSB0byBhdm9pZCBFcnJvcjogJGRpZ2VzdCBhbHJlYWR5IGluIHByb2dyZXNzXG4gICAgICBzZXRUaW1lb3V0KHVwZGF0ZVZpZXcsIDUwKTtcbiAgICB9KTtcblxuICAgIHZhciBmb3JtID0gJGxvY2F0aW9uLnNlYXJjaCgpW1wiZm9ybVwiXTtcbiAgICBpZiAoZm9ybSkge1xuICAgICAgd2lraVJlcG9zaXRvcnkuZ2V0UGFnZSgkc2NvcGUuYnJhbmNoLCBmb3JtLCAkc2NvcGUub2JqZWN0SWQsIG9uRm9ybURhdGEpO1xuICAgIH1cblxuICAgIHVwZGF0ZVZpZXcoKTtcblxuICAgIGZ1bmN0aW9uIG9uUmVzdWx0cyhyZXNwb25zZSkge1xuICAgICAgdmFyIGxpc3QgPSBbXTtcbiAgICAgIHZhciBtYXAgPSBXaWtpLnBhcnNlSnNvbihyZXNwb25zZSk7XG4gICAgICBhbmd1bGFyLmZvckVhY2gobWFwLCAodmFsdWUsIGtleSkgPT4ge1xuICAgICAgICB2YWx1ZVtcIl9pZFwiXSA9IGtleTtcbiAgICAgICAgbGlzdC5wdXNoKHZhbHVlKTtcbiAgICAgIH0pO1xuICAgICAgJHNjb3BlLmxpc3QgPSBsaXN0O1xuICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiB1cGRhdGVWaWV3KCkge1xuICAgICAgdmFyIGZpbHRlciA9IENvcmUucGF0aEdldCgkc2NvcGUsIFtcImdyaWRPcHRpb25zXCIsIFwiZmlsdGVyT3B0aW9uc1wiLCBcImZpbHRlclRleHRcIl0pIHx8IFwiXCI7XG4gICAgICAkc2NvcGUuZ2l0ID0gd2lraVJlcG9zaXRvcnkuanNvbkNoaWxkQ29udGVudHMoJHNjb3BlLnBhZ2VJZCwgXCIqLmpzb25cIiwgZmlsdGVyLCBvblJlc3VsdHMpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIG9uRm9ybURhdGEoZGV0YWlscykge1xuICAgICAgdmFyIHRleHQgPSBkZXRhaWxzLnRleHQ7XG4gICAgICBpZiAodGV4dCkge1xuICAgICAgICAkc2NvcGUuZm9ybURlZmluaXRpb24gPSBXaWtpLnBhcnNlSnNvbih0ZXh0KTtcblxuICAgICAgICB2YXIgY29sdW1uRGVmcyA9IFtdO1xuICAgICAgICB2YXIgc2NoZW1hID0gJHNjb3BlLmZvcm1EZWZpbml0aW9uO1xuICAgICAgICBhbmd1bGFyLmZvckVhY2goc2NoZW1hLnByb3BlcnRpZXMsIChwcm9wZXJ0eSwgbmFtZSkgPT4ge1xuICAgICAgICAgIGlmIChuYW1lKSB7XG4gICAgICAgICAgICBpZiAoIUZvcm1zLmlzQXJyYXlPck5lc3RlZE9iamVjdChwcm9wZXJ0eSwgc2NoZW1hKSkge1xuICAgICAgICAgICAgICB2YXIgY29sRGVmID0ge1xuICAgICAgICAgICAgICAgIGZpZWxkOiBuYW1lLFxuICAgICAgICAgICAgICAgIGRpc3BsYXlOYW1lOiBwcm9wZXJ0eS5kZXNjcmlwdGlvbiB8fCBuYW1lLFxuICAgICAgICAgICAgICAgIHZpc2libGU6IHRydWVcbiAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgY29sdW1uRGVmcy5wdXNoKGNvbERlZik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgY29sdW1uRGVmcy5wdXNoKGxpbmtzQ29sdW1uKTtcblxuICAgICAgICAkc2NvcGUuY29sdW1uRGVmcyA9IGNvbHVtbkRlZnM7XG4gICAgICAgICRzY29wZS5ncmlkT3B0aW9ucy5jb2x1bW5EZWZzID0gY29sdW1uRGVmcztcblxuICAgICAgICAvLyBub3cgd2UgaGF2ZSB0aGUgZ3JpZCBjb2x1bW4gc3R1ZmYgbG9hZGVkLCBsZXRzIGxvYWQgdGhlIGRhdGF0YWJsZVxuICAgICAgICAkc2NvcGUudGFibGVWaWV3ID0gXCJwbHVnaW5zL3dpa2kvaHRtbC9mb3JtVGFibGVEYXRhdGFibGUuaHRtbFwiO1xuICAgICAgfVxuICAgIH1cbiAgICBDb3JlLiRhcHBseSgkc2NvcGUpO1xuICB9XSk7XG59XG4iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vaW5jbHVkZXMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwid2lraUhlbHBlcnMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwid2lraVBsdWdpbi50c1wiLz5cblxuLyoqXG4gKiBAbW9kdWxlIFdpa2lcbiAqL1xuIG1vZHVsZSBXaWtpIHtcbiAgX21vZHVsZS5jb250cm9sbGVyKFwiV2lraS5HaXRQcmVmZXJlbmNlc1wiLCBbXCIkc2NvcGVcIiwgXCJsb2NhbFN0b3JhZ2VcIiwgXCJ1c2VyRGV0YWlsc1wiLCAoJHNjb3BlLCBsb2NhbFN0b3JhZ2UsIHVzZXJEZXRhaWxzKSA9PiB7XG5cbiAgICB2YXIgY29uZmlnID0ge1xuICAgICAgcHJvcGVydGllczoge1xuICAgICAgICBnaXRVc2VyTmFtZToge1xuICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgIGxhYmVsOiAnVXNlcm5hbWUnLFxuICAgICAgICAgIGRlc2NyaXB0aW9uOiAnVGhlIHVzZXIgbmFtZSB0byBiZSB1c2VkIHdoZW4gbWFraW5nIGNoYW5nZXMgdG8gZmlsZXMgd2l0aCB0aGUgc291cmNlIGNvbnRyb2wgc3lzdGVtJ1xuICAgICAgICB9LFxuICAgICAgICBnaXRVc2VyRW1haWw6IHtcbiAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICBsYWJlbDogJ0VtYWlsJyxcbiAgICAgICAgICBkZXNjcmlwdGlvbjogJ1RoZSBlbWFpbCBhZGRyZXNzIHRvIHVzZSB3aGVuIG1ha2luZyBjaGFuZ2VzIHRvIGZpbGVzIHdpdGggdGhlIHNvdXJjZSBjb250cm9sIHN5c3RlbSdcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH07XG5cbiAgICAkc2NvcGUuZW50aXR5ID0gJHNjb3BlO1xuICAgICRzY29wZS5jb25maWcgPSBjb25maWc7XG5cbiAgICBDb3JlLmluaXRQcmVmZXJlbmNlU2NvcGUoJHNjb3BlLCBsb2NhbFN0b3JhZ2UsIHtcbiAgICAgICdnaXRVc2VyTmFtZSc6IHtcbiAgICAgICAgJ3ZhbHVlJzogdXNlckRldGFpbHMudXNlcm5hbWUgfHwgXCJcIlxuICAgICAgfSxcbiAgICAgICdnaXRVc2VyRW1haWwnOiB7XG4gICAgICAgICd2YWx1ZSc6ICcnXG4gICAgICB9ICBcbiAgICB9KTtcbiAgfV0pO1xuIH1cbiIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9pbmNsdWRlcy50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJ3aWtpSGVscGVycy50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJ3aWtpUGx1Z2luLnRzXCIvPlxuXG4vKipcbiAqIEBtb2R1bGUgV2lraVxuICovXG5tb2R1bGUgV2lraSB7XG5cbiAgX21vZHVsZS5jb250cm9sbGVyKFwiV2lraS5IaXN0b3J5Q29udHJvbGxlclwiLCBbXCIkc2NvcGVcIiwgXCIkbG9jYXRpb25cIiwgXCIkcm91dGVQYXJhbXNcIiwgXCIkdGVtcGxhdGVDYWNoZVwiLCBcIm1hcmtlZFwiLCBcImZpbGVFeHRlbnNpb25UeXBlUmVnaXN0cnlcIiwgICgkc2NvcGUsICRsb2NhdGlvbiwgJHJvdXRlUGFyYW1zLCAkdGVtcGxhdGVDYWNoZSwgbWFya2VkLCBmaWxlRXh0ZW5zaW9uVHlwZVJlZ2lzdHJ5KSA9PiB7XG5cbiAgICAvLyBUT0RPIHJlbW92ZSFcbiAgICB2YXIgaXNGbWMgPSBmYWxzZTtcbiAgICB2YXIgam9sb2tpYSA9IG51bGw7XG5cbiAgICBXaWtpLmluaXRTY29wZSgkc2NvcGUsICRyb3V0ZVBhcmFtcywgJGxvY2F0aW9uKTtcbiAgICB2YXIgd2lraVJlcG9zaXRvcnkgPSAkc2NvcGUud2lraVJlcG9zaXRvcnk7XG5cbiAgICAvLyBUT0RPIHdlIGNvdWxkIGNvbmZpZ3VyZSB0aGlzP1xuICAgICRzY29wZS5kYXRlRm9ybWF0ID0gJ0VFRSwgTU1NIGQsIHkgYXQgSEg6bW06c3MgWic7XG4gICAgLy8neXl5eS1NTS1kZCBISDptbTpzcyBaJ1xuXG4gICAgJHNjb3BlLmdyaWRPcHRpb25zID0ge1xuICAgICAgZGF0YTogJ2xvZ3MnLFxuICAgICAgc2hvd0ZpbHRlcjogZmFsc2UsXG4gICAgICBlbmFibGVSb3dDbGlja1NlbGVjdGlvbjogZmFsc2UsXG4gICAgICBtdWx0aVNlbGVjdDogdHJ1ZSxcbiAgICAgIHNlbGVjdGVkSXRlbXM6IFtdLFxuICAgICAgc2hvd1NlbGVjdGlvbkNoZWNrYm94OiB0cnVlLFxuICAgICAgZGlzcGxheVNlbGVjdGlvbkNoZWNrYm94IDogdHJ1ZSwgLy8gb2xkIHByZSAyLjAgY29uZmlnIVxuICAgICAgZmlsdGVyT3B0aW9uczoge1xuICAgICAgICBmaWx0ZXJUZXh0OiAnJ1xuICAgICAgfSxcbiAgICAgIGNvbHVtbkRlZnM6IFtcbiAgICAgICAge1xuICAgICAgICAgIGZpZWxkOiAnJGRhdGUnLFxuICAgICAgICAgIGRpc3BsYXlOYW1lOiAnTW9kaWZpZWQnLFxuICAgICAgICAgIGRlZmF1bHRTb3J0OiB0cnVlLFxuICAgICAgICAgIGFzY2VuZGluZzogZmFsc2UsXG4gICAgICAgICAgY2VsbFRlbXBsYXRlOiAnPGRpdiBjbGFzcz1cIm5nQ2VsbFRleHQgdGV4dC1ub3dyYXBcIiB0aXRsZT1cInt7cm93LmVudGl0eS4kZGF0ZSB8IGRhdGU6XFwnRUVFLCBNTU0gZCwgeXl5eSA6IEhIOm1tOnNzIFpcXCd9fVwiPnt7cm93LmVudGl0eS4kZGF0ZS5yZWxhdGl2ZSgpfX08L2Rpdj4nLFxuICAgICAgICAgIHdpZHRoOiBcIioqXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIGZpZWxkOiAnc2hhJyxcbiAgICAgICAgICBkaXNwbGF5TmFtZTogJ0NoYW5nZScsXG4gICAgICAgICAgY2VsbFRlbXBsYXRlOiAnPGRpdiBjbGFzcz1cIm5nQ2VsbFRleHQgdGV4dC1ub3dyYXBcIj48YSBjbGFzcz1cImNvbW1pdC1saW5rXCIgbmctaHJlZj1cInt7cm93LmVudGl0eS5jb21taXRMaW5rfX17e2hhc2h9fVwiIHRpdGxlPVwie3tyb3cuZW50aXR5LnNoYX19XCI+e3tyb3cuZW50aXR5LnNoYSB8IGxpbWl0VG86N319IDxpIGNsYXNzPVwiZmEgZmEtYXJyb3ctY2lyY2xlLXJpZ2h0XCI+PC9pPjwvYT48L2Rpdj4nLFxuICAgICAgICAgIGNlbGxGaWx0ZXI6IFwiXCIsXG4gICAgICAgICAgd2lkdGg6IFwiKlwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICBmaWVsZDogJ2F1dGhvcicsXG4gICAgICAgICAgZGlzcGxheU5hbWU6ICdBdXRob3InLFxuICAgICAgICAgIGNlbGxGaWx0ZXI6IFwiXCIsXG4gICAgICAgICAgd2lkdGg6IFwiKipcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgZmllbGQ6ICdzaG9ydF9tZXNzYWdlJyxcbiAgICAgICAgICBkaXNwbGF5TmFtZTogJ01lc3NhZ2UnLFxuICAgICAgICAgIGNlbGxUZW1wbGF0ZTogJzxkaXYgY2xhc3M9XCJuZ0NlbGxUZXh0IHRleHQtbm93cmFwXCIgdGl0bGU9XCJ7e3Jvdy5lbnRpdHkuc2hvcnRfbWVzc2FnZX19XCI+e3tyb3cuZW50aXR5LnNob3J0X21lc3NhZ2V9fTwvZGl2PicsXG4gICAgICAgICAgd2lkdGg6IFwiKioqKlwiXG4gICAgICAgIH1cbiAgICAgIF1cbiAgICB9O1xuXG4gICAgJHNjb3BlLiRvbihcIiRyb3V0ZUNoYW5nZVN1Y2Nlc3NcIiwgZnVuY3Rpb24gKGV2ZW50LCBjdXJyZW50LCBwcmV2aW91cykge1xuICAgICAgLy8gbGV0cyBkbyB0aGlzIGFzeW5jaHJvbm91c2x5IHRvIGF2b2lkIEVycm9yOiAkZGlnZXN0IGFscmVhZHkgaW4gcHJvZ3Jlc3NcbiAgICAgIHNldFRpbWVvdXQodXBkYXRlVmlldywgNTApO1xuICAgIH0pO1xuXG4gICAgJHNjb3BlLmNhblJldmVydCA9ICgpID0+IHtcbiAgICAgIHZhciBzZWxlY3RlZEl0ZW1zID0gJHNjb3BlLmdyaWRPcHRpb25zLnNlbGVjdGVkSXRlbXM7XG4gICAgICByZXR1cm4gc2VsZWN0ZWRJdGVtcy5sZW5ndGggPT09IDEgJiYgc2VsZWN0ZWRJdGVtc1swXSAhPT0gJHNjb3BlLmxvZ3NbMF07XG4gICAgfTtcblxuICAgICRzY29wZS5yZXZlcnQgPSAoKSA9PiB7XG4gICAgICB2YXIgc2VsZWN0ZWRJdGVtcyA9ICRzY29wZS5ncmlkT3B0aW9ucy5zZWxlY3RlZEl0ZW1zO1xuICAgICAgaWYgKHNlbGVjdGVkSXRlbXMubGVuZ3RoID4gMCkge1xuICAgICAgICB2YXIgb2JqZWN0SWQgPSBzZWxlY3RlZEl0ZW1zWzBdLnNoYTtcbiAgICAgICAgaWYgKG9iamVjdElkKSB7XG4gICAgICAgICAgdmFyIGNvbW1pdE1lc3NhZ2UgPSBcIlJldmVydGluZyBmaWxlIFwiICsgJHNjb3BlLnBhZ2VJZCArIFwiIHRvIHByZXZpb3VzIHZlcnNpb24gXCIgKyBvYmplY3RJZDtcbiAgICAgICAgICB3aWtpUmVwb3NpdG9yeS5yZXZlcnRUbygkc2NvcGUuYnJhbmNoLCBvYmplY3RJZCwgJHNjb3BlLnBhZ2VJZCwgY29tbWl0TWVzc2FnZSwgKHJlc3VsdCkgPT4ge1xuICAgICAgICAgICAgV2lraS5vbkNvbXBsZXRlKHJlc3VsdCk7XG4gICAgICAgICAgICAvLyBub3cgbGV0cyB1cGRhdGUgdGhlIHZpZXdcbiAgICAgICAgICAgIENvcmUubm90aWZpY2F0aW9uKCdzdWNjZXNzJywgXCJTdWNjZXNzZnVsbHkgcmV2ZXJ0ZWQgXCIgKyAkc2NvcGUucGFnZUlkKTtcbiAgICAgICAgICAgIHVwZGF0ZVZpZXcoKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBzZWxlY3RlZEl0ZW1zLnNwbGljZSgwLCBzZWxlY3RlZEl0ZW1zLmxlbmd0aCk7XG4gICAgICB9XG4gICAgfTtcblxuICAgICRzY29wZS5kaWZmID0gKCkgPT4ge1xuICAgICAgdmFyIGRlZmF1bHRWYWx1ZSA9IFwiIFwiO1xuICAgICAgdmFyIG9iamVjdElkID0gZGVmYXVsdFZhbHVlO1xuICAgICAgdmFyIHNlbGVjdGVkSXRlbXMgPSAkc2NvcGUuZ3JpZE9wdGlvbnMuc2VsZWN0ZWRJdGVtcztcbiAgICAgIGlmIChzZWxlY3RlZEl0ZW1zLmxlbmd0aCA+IDApIHtcbiAgICAgICAgb2JqZWN0SWQgPSBzZWxlY3RlZEl0ZW1zWzBdLnNoYSB8fCBkZWZhdWx0VmFsdWU7XG4gICAgICB9XG4gICAgICB2YXIgYmFzZU9iamVjdElkID0gZGVmYXVsdFZhbHVlO1xuICAgICAgaWYgKHNlbGVjdGVkSXRlbXMubGVuZ3RoID4gMSkge1xuICAgICAgICBiYXNlT2JqZWN0SWQgPSBzZWxlY3RlZEl0ZW1zWzFdLnNoYSB8fGRlZmF1bHRWYWx1ZTtcbiAgICAgICAgLy8gbWFrZSB0aGUgb2JqZWN0SWQgKHRoZSBvbmUgdGhhdCB3aWxsIHN0YXJ0IHdpdGggYi8gcGF0aCkgYWx3YXlzIG5ld2VyIHRoYW4gYmFzZU9iamVjdElkXG4gICAgICAgIGlmIChzZWxlY3RlZEl0ZW1zWzBdLmRhdGUgPCBzZWxlY3RlZEl0ZW1zWzFdLmRhdGUpIHtcbiAgICAgICAgICB2YXIgXyA9IGJhc2VPYmplY3RJZDtcbiAgICAgICAgICBiYXNlT2JqZWN0SWQgPSBvYmplY3RJZDtcbiAgICAgICAgICBvYmplY3RJZCA9IF87XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHZhciBsaW5rID0gc3RhcnRMaW5rKCRzY29wZSkgKyBcIi9kaWZmL1wiICsgb2JqZWN0SWQgKyBcIi9cIiArIGJhc2VPYmplY3RJZCArIFwiL1wiICsgJHNjb3BlLnBhZ2VJZDtcbiAgICAgIHZhciBwYXRoID0gQ29yZS50cmltTGVhZGluZyhsaW5rLCBcIiNcIik7XG4gICAgICAkbG9jYXRpb24ucGF0aChwYXRoKTtcbiAgICB9O1xuXG4gICAgdXBkYXRlVmlldygpO1xuXG4gICAgZnVuY3Rpb24gdXBkYXRlVmlldygpIHtcbiAgICAgIHZhciBvYmplY3RJZCA9IFwiXCI7XG4gICAgICB2YXIgbGltaXQgPSAwO1xuXG4gICAgICAkc2NvcGUuZ2l0ID0gd2lraVJlcG9zaXRvcnkuaGlzdG9yeSgkc2NvcGUuYnJhbmNoLCBvYmplY3RJZCwgJHNjb3BlLnBhZ2VJZCwgbGltaXQsIChsb2dBcnJheSkgPT4ge1xuICAgICAgICBhbmd1bGFyLmZvckVhY2gobG9nQXJyYXksIChsb2cpID0+IHtcbiAgICAgICAgICAvLyBsZXRzIHVzZSB0aGUgc2hvcnRlciBoYXNoIGZvciBsaW5rcyBieSBkZWZhdWx0XG4gICAgICAgICAgdmFyIGNvbW1pdElkID0gbG9nLnNoYTtcbiAgICAgICAgICBsb2cuJGRhdGUgPSBEZXZlbG9wZXIuYXNEYXRlKGxvZy5kYXRlKTtcbiAgICAgICAgICBsb2cuY29tbWl0TGluayA9IHN0YXJ0TGluaygkc2NvcGUpICsgXCIvY29tbWl0RGV0YWlsL1wiICsgJHNjb3BlLnBhZ2VJZCArIFwiL1wiICsgY29tbWl0SWQ7XG4gICAgICAgIH0pO1xuICAgICAgICAkc2NvcGUubG9ncyA9IF8uc29ydEJ5KGxvZ0FycmF5LCBcIiRkYXRlXCIpLnJldmVyc2UoKTtcbiAgICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICAgIH0pO1xuICAgICAgV2lraS5sb2FkQnJhbmNoZXMoam9sb2tpYSwgd2lraVJlcG9zaXRvcnksICRzY29wZSwgaXNGbWMpO1xuICAgIH1cbiAgfV0pO1xufVxuIiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL2luY2x1ZGVzLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIndpa2lIZWxwZXJzLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIndpa2lQbHVnaW4udHNcIi8+XG5cbi8qKlxuICogQG1vZHVsZSBXaWtpXG4gKi9cbm1vZHVsZSBXaWtpIHtcbiAgX21vZHVsZS5kaXJlY3RpdmUoXCJjb21taXRIaXN0b3J5UGFuZWxcIiwgKCkgPT4ge1xuICAgIHJldHVybiB7XG4gICAgICB0ZW1wbGF0ZVVybDogdGVtcGxhdGVQYXRoICsgJ2hpc3RvcnlQYW5lbC5odG1sJ1xuICAgIH07XG4gIH0pO1xufVxuIiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL2luY2x1ZGVzLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIndpa2lIZWxwZXJzLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIndpa2lQbHVnaW4udHNcIi8+XG5cbi8qKlxuICogQG1vZHVsZSBXaWtpXG4gKi9cbm1vZHVsZSBXaWtpIHtcbiAgX21vZHVsZS5jb250cm9sbGVyKFwiV2lraS5OYXZCYXJDb250cm9sbGVyXCIsIFtcIiRzY29wZVwiLCBcIiRsb2NhdGlvblwiLCBcIiRyb3V0ZVBhcmFtc1wiLCBcIndpa2lCcmFuY2hNZW51XCIsICgkc2NvcGUsICRsb2NhdGlvbiwgJHJvdXRlUGFyYW1zLCB3aWtpQnJhbmNoTWVudTpCcmFuY2hNZW51KSA9PiB7XG5cbiAgICAvLyBUT0RPIHJlbW92ZSFcbiAgICB2YXIgaXNGbWMgPSBmYWxzZTtcblxuICAgIFdpa2kuaW5pdFNjb3BlKCRzY29wZSwgJHJvdXRlUGFyYW1zLCAkbG9jYXRpb24pO1xuICAgIHZhciB3aWtpUmVwb3NpdG9yeSA9ICRzY29wZS53aWtpUmVwb3NpdG9yeTtcblxuICAgICRzY29wZS5icmFuY2hNZW51Q29uZmlnID0gPFVJLk1lbnVJdGVtPntcbiAgICAgIHRpdGxlOiAkc2NvcGUuYnJhbmNoLFxuICAgICAgaXRlbXM6IFtdXG4gICAgfTtcblxuICAgICRzY29wZS5WaWV3TW9kZSA9IFdpa2kuVmlld01vZGU7XG4gICAgJHNjb3BlLnNldFZpZXdNb2RlID0gKG1vZGU6V2lraS5WaWV3TW9kZSkgPT4ge1xuICAgICAgJHNjb3BlLiRlbWl0KCdXaWtpLlNldFZpZXdNb2RlJywgbW9kZSk7XG4gICAgfTtcblxuICAgIHdpa2lCcmFuY2hNZW51LmFwcGx5TWVudUV4dGVuc2lvbnMoJHNjb3BlLmJyYW5jaE1lbnVDb25maWcuaXRlbXMpO1xuXG4gICAgJHNjb3BlLiR3YXRjaCgnYnJhbmNoZXMnLCAobmV3VmFsdWUsIG9sZFZhbHVlKSA9PiB7XG4gICAgICBpZiAobmV3VmFsdWUgPT09IG9sZFZhbHVlIHx8ICFuZXdWYWx1ZSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICAkc2NvcGUuYnJhbmNoTWVudUNvbmZpZy5pdGVtcyA9IFtdO1xuICAgICAgaWYgKG5ld1ZhbHVlLmxlbmd0aCA+IDApIHtcbiAgICAgICAgJHNjb3BlLmJyYW5jaE1lbnVDb25maWcuaXRlbXMucHVzaCh7XG4gICAgICAgICAgaGVhZGluZzogaXNGbWMgPyBcIlZlcnNpb25zXCIgOiBcIkJyYW5jaGVzXCJcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgICBuZXdWYWx1ZS5zb3J0KCkuZm9yRWFjaCgoaXRlbSkgPT4ge1xuICAgICAgICB2YXIgbWVudUl0ZW0gPSB7XG4gICAgICAgICAgdGl0bGU6IGl0ZW0sXG4gICAgICAgICAgaWNvbjogJycsXG4gICAgICAgICAgYWN0aW9uOiAoKSA9PiB7fVxuICAgICAgICB9O1xuICAgICAgICBpZiAoaXRlbSA9PT0gJHNjb3BlLmJyYW5jaCkge1xuICAgICAgICAgIG1lbnVJdGVtLmljb24gPSBcImZhIGZhLW9rXCI7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgbWVudUl0ZW0uYWN0aW9uID0gKCkgPT4ge1xuICAgICAgICAgICAgdmFyIHRhcmdldFVybCA9IGJyYW5jaExpbmsoaXRlbSwgPHN0cmluZz4kc2NvcGUucGFnZUlkLCAkbG9jYXRpb24pO1xuICAgICAgICAgICAgJGxvY2F0aW9uLnBhdGgoQ29yZS50b1BhdGgodGFyZ2V0VXJsKSk7XG4gICAgICAgICAgICBDb3JlLiRhcHBseSgkc2NvcGUpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICAkc2NvcGUuYnJhbmNoTWVudUNvbmZpZy5pdGVtcy5wdXNoKG1lbnVJdGVtKTtcbiAgICAgIH0pO1xuICAgICAgd2lraUJyYW5jaE1lbnUuYXBwbHlNZW51RXh0ZW5zaW9ucygkc2NvcGUuYnJhbmNoTWVudUNvbmZpZy5pdGVtcyk7XG4gICAgfSwgdHJ1ZSk7XG5cbiAgICAkc2NvcGUuY3JlYXRlTGluayA9ICgpID0+IHtcbiAgICAgIHZhciBwYWdlSWQgPSBXaWtpLnBhZ2VJZCgkcm91dGVQYXJhbXMsICRsb2NhdGlvbik7XG4gICAgICByZXR1cm4gV2lraS5jcmVhdGVMaW5rKCRzY29wZSwgcGFnZUlkLCAkbG9jYXRpb24pO1xuICAgIH07XG5cbiAgICAkc2NvcGUuc3RhcnRMaW5rID0gc3RhcnRMaW5rKCRzY29wZSk7XG5cbiAgICAkc2NvcGUuc291cmNlTGluayA9ICgpID0+IHtcbiAgICAgIHZhciBwYXRoID0gJGxvY2F0aW9uLnBhdGgoKTtcbiAgICAgIHZhciBhbnN3ZXIgPSA8c3RyaW5nPm51bGw7XG4gICAgICBhbmd1bGFyLmZvckVhY2goV2lraS5jdXN0b21WaWV3TGlua3MoJHNjb3BlKSwgKGxpbmspID0+IHtcbiAgICAgICAgaWYgKHBhdGguc3RhcnRzV2l0aChsaW5rKSkge1xuICAgICAgICAgIGFuc3dlciA9IDxzdHJpbmc+Q29yZS5jcmVhdGVIcmVmKCRsb2NhdGlvbiwgV2lraS5zdGFydExpbmsoJHNjb3BlKSArIFwiL3ZpZXdcIiArIHBhdGguc3Vic3RyaW5nKGxpbmsubGVuZ3RoKSlcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICAvLyByZW1vdmUgdGhlIGZvcm0gcGFyYW1ldGVyIG9uIHZpZXcvZWRpdCBsaW5rc1xuICAgICAgcmV0dXJuICghYW5zd2VyICYmICRsb2NhdGlvbi5zZWFyY2goKVtcImZvcm1cIl0pXG4gICAgICAgICAgICAgID8gQ29yZS5jcmVhdGVIcmVmKCRsb2NhdGlvbiwgXCIjXCIgKyBwYXRoLCBbXCJmb3JtXCJdKVxuICAgICAgICAgICAgICA6IGFuc3dlcjtcbiAgICB9O1xuXG4gICAgJHNjb3BlLmlzQWN0aXZlID0gKGhyZWYpID0+IHtcbiAgICAgIGlmICghaHJlZikge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICByZXR1cm4gaHJlZi5lbmRzV2l0aCgkcm91dGVQYXJhbXNbJ3BhZ2UnXSk7XG4gICAgfTtcblxuICAgICRzY29wZS4kb24oXCIkcm91dGVDaGFuZ2VTdWNjZXNzXCIsIGZ1bmN0aW9uIChldmVudCwgY3VycmVudCwgcHJldmlvdXMpIHtcbiAgICAgIC8vIGxldHMgZG8gdGhpcyBhc3luY2hyb25vdXNseSB0byBhdm9pZCBFcnJvcjogJGRpZ2VzdCBhbHJlYWR5IGluIHByb2dyZXNzXG4gICAgICBzZXRUaW1lb3V0KGxvYWRCcmVhZGNydW1icywgNTApO1xuICAgIH0pO1xuXG4gICAgbG9hZEJyZWFkY3J1bWJzKCk7XG5cbiAgICBmdW5jdGlvbiBzd2l0Y2hGcm9tVmlld1RvQ3VzdG9tTGluayhicmVhZGNydW1iLCBsaW5rKSB7XG4gICAgICB2YXIgaHJlZiA9IGJyZWFkY3J1bWIuaHJlZjtcbiAgICAgIGlmIChocmVmKSB7XG4gICAgICAgIGJyZWFkY3J1bWIuaHJlZiA9IGhyZWYucmVwbGFjZShcIndpa2kvdmlld1wiLCBsaW5rKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBsb2FkQnJlYWRjcnVtYnMoKSB7XG4gICAgICB2YXIgc3RhcnQgPSBXaWtpLnN0YXJ0TGluaygkc2NvcGUpO1xuICAgICAgdmFyIGhyZWYgPSBzdGFydCArIFwiL3ZpZXdcIjtcbiAgICAgICRzY29wZS5icmVhZGNydW1icyA9IFtcbiAgICAgICAge2hyZWY6IGhyZWYsIG5hbWU6IFwicm9vdFwifVxuICAgICAgXTtcbiAgICAgIHZhciBwYXRoID0gV2lraS5wYWdlSWQoJHJvdXRlUGFyYW1zLCAkbG9jYXRpb24pO1xuICAgICAgdmFyIGFycmF5ID0gcGF0aCA/IHBhdGguc3BsaXQoXCIvXCIpIDogW107XG4gICAgICBhbmd1bGFyLmZvckVhY2goYXJyYXksIChuYW1lKSA9PiB7XG4gICAgICAgIGlmICghbmFtZS5zdGFydHNXaXRoKFwiL1wiKSAmJiAhaHJlZi5lbmRzV2l0aChcIi9cIikpIHtcbiAgICAgICAgICBocmVmICs9IFwiL1wiO1xuICAgICAgICB9XG4gICAgICAgIGhyZWYgKz0gV2lraS5lbmNvZGVQYXRoKG5hbWUpO1xuICAgICAgICBpZiAoIW5hbWUuaXNCbGFuaygpKSB7XG4gICAgICAgICAgJHNjb3BlLmJyZWFkY3J1bWJzLnB1c2goe2hyZWY6IGhyZWYsIG5hbWU6IG5hbWV9KTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICAvLyBsZXRzIHN3aXp6bGUgdGhlIGxhc3Qgb25lIG9yIHR3byB0byBiZSBmb3JtVGFibGUgdmlld3MgaWYgdGhlIGxhc3Qgb3IgMm5kIHRvIGxhc3RcbiAgICAgIHZhciBsb2MgPSAkbG9jYXRpb24ucGF0aCgpO1xuICAgICAgaWYgKCRzY29wZS5icmVhZGNydW1icy5sZW5ndGgpIHtcbiAgICAgICAgdmFyIGxhc3QgPSAkc2NvcGUuYnJlYWRjcnVtYnNbJHNjb3BlLmJyZWFkY3J1bWJzLmxlbmd0aCAtIDFdO1xuICAgICAgICAvLyBwb3NzaWJseSB0cmltIGFueSByZXF1aXJlZCBmaWxlIGV4dGVuc2lvbnNcbiAgICAgICAgbGFzdC5uYW1lID0gV2lraS5oaWRlRmlsZU5hbWVFeHRlbnNpb25zKGxhc3QubmFtZSk7XG5cbiAgICAgICAgdmFyIHN3aXp6bGVkID0gZmFsc2U7XG4gICAgICAgIGFuZ3VsYXIuZm9yRWFjaChXaWtpLmN1c3RvbVZpZXdMaW5rcygkc2NvcGUpLCAobGluaykgPT4ge1xuICAgICAgICAgIGlmICghc3dpenpsZWQgJiYgbG9jLnN0YXJ0c1dpdGgobGluaykpIHtcbiAgICAgICAgICAgIC8vIGxldHMgc3dpenpsZSB0aGUgdmlldyB0byB0aGUgY3VycmVudCBsaW5rXG4gICAgICAgICAgICBzd2l0Y2hGcm9tVmlld1RvQ3VzdG9tTGluaygkc2NvcGUuYnJlYWRjcnVtYnMubGFzdCgpLCBDb3JlLnRyaW1MZWFkaW5nKGxpbmssIFwiL1wiKSk7XG4gICAgICAgICAgICBzd2l6emxlZCA9IHRydWU7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgaWYgKCFzd2l6emxlZCAmJiAkbG9jYXRpb24uc2VhcmNoKClbXCJmb3JtXCJdKSB7XG4gICAgICAgICAgdmFyIGxhc3ROYW1lID0gJHNjb3BlLmJyZWFkY3J1bWJzLmxhc3QoKS5uYW1lO1xuICAgICAgICAgIGlmIChsYXN0TmFtZSAmJiBsYXN0TmFtZS5lbmRzV2l0aChcIi5qc29uXCIpKSB7XG4gICAgICAgICAgICAvLyBwcmV2aW91cyBicmVhZGNydW1iIHNob3VsZCBiZSBhIGZvcm1UYWJsZVxuICAgICAgICAgICAgc3dpdGNoRnJvbVZpZXdUb0N1c3RvbUxpbmsoJHNjb3BlLmJyZWFkY3J1bWJzWyRzY29wZS5icmVhZGNydW1icy5sZW5ndGggLSAyXSwgXCJ3aWtpL2Zvcm1UYWJsZVwiKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIC8qXG4gICAgICBpZiAobG9jLnN0YXJ0c1dpdGgoXCIvd2lraS9oaXN0b3J5XCIpIHx8IGxvYy5zdGFydHNXaXRoKFwiL3dpa2kvdmVyc2lvblwiKVxuICAgICAgICB8fCBsb2Muc3RhcnRzV2l0aChcIi93aWtpL2RpZmZcIikgfHwgbG9jLnN0YXJ0c1dpdGgoXCIvd2lraS9jb21taXRcIikpIHtcbiAgICAgICAgLy8gbGV0cyBhZGQgYSBoaXN0b3J5IHRhYlxuICAgICAgICAkc2NvcGUuYnJlYWRjcnVtYnMucHVzaCh7aHJlZjogXCIjL3dpa2kvaGlzdG9yeS9cIiArIHBhdGgsIG5hbWU6IFwiSGlzdG9yeVwifSk7XG4gICAgICB9IGVsc2UgaWYgKCRzY29wZS5icmFuY2gpIHtcbiAgICAgICAgdmFyIHByZWZpeCA9XCIvd2lraS9icmFuY2gvXCIgKyAkc2NvcGUuYnJhbmNoO1xuICAgICAgICBpZiAobG9jLnN0YXJ0c1dpdGgocHJlZml4ICsgXCIvaGlzdG9yeVwiKSB8fCBsb2Muc3RhcnRzV2l0aChwcmVmaXggKyBcIi92ZXJzaW9uXCIpXG4gICAgICAgICAgfHwgbG9jLnN0YXJ0c1dpdGgocHJlZml4ICsgXCIvZGlmZlwiKSB8fCBsb2Muc3RhcnRzV2l0aChwcmVmaXggKyBcIi9jb21taXRcIikpIHtcbiAgICAgICAgICAvLyBsZXRzIGFkZCBhIGhpc3RvcnkgdGFiXG4gICAgICAgICAgJHNjb3BlLmJyZWFkY3J1bWJzLnB1c2goe2hyZWY6IFwiIy93aWtpL2JyYW5jaC9cIiArICRzY29wZS5icmFuY2ggKyBcIi9oaXN0b3J5L1wiICsgcGF0aCwgbmFtZTogXCJIaXN0b3J5XCJ9KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgKi9cbiAgICAgIHZhciBuYW1lOnN0cmluZyA9IG51bGw7XG4gICAgICBpZiAobG9jLnN0YXJ0c1dpdGgoXCIvd2lraS92ZXJzaW9uXCIpKSB7XG4gICAgICAgIC8vIGxldHMgYWRkIGEgdmVyc2lvbiB0YWJcbiAgICAgICAgbmFtZSA9ICgkcm91dGVQYXJhbXNbXCJvYmplY3RJZFwiXSB8fCBcIlwiKS5zdWJzdHJpbmcoMCwgNikgfHwgXCJWZXJzaW9uXCI7XG4gICAgICAgICRzY29wZS5icmVhZGNydW1icy5wdXNoKHtocmVmOiBcIiNcIiArIGxvYywgbmFtZTogbmFtZX0pO1xuICAgICAgfVxuICAgICAgaWYgKGxvYy5zdGFydHNXaXRoKFwiL3dpa2kvZGlmZlwiKSkge1xuICAgICAgICAvLyBsZXRzIGFkZCBhIHZlcnNpb24gdGFiXG4gICAgICAgIHZhciB2MSA9ICgkcm91dGVQYXJhbXNbXCJvYmplY3RJZFwiXSB8fCBcIlwiKS5zdWJzdHJpbmcoMCwgNik7XG4gICAgICAgIHZhciB2MiA9ICgkcm91dGVQYXJhbXNbXCJiYXNlT2JqZWN0SWRcIl0gfHwgXCJcIikuc3Vic3RyaW5nKDAsIDYpO1xuICAgICAgICBuYW1lID0gXCJEaWZmXCI7XG4gICAgICAgIGlmICh2MSkge1xuICAgICAgICAgIGlmICh2Mikge1xuICAgICAgICAgICAgbmFtZSArPSBcIiBcIiArIHYxICsgXCIgXCIgKyB2MjtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbmFtZSArPSBcIiBcIiArIHYxO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICAkc2NvcGUuYnJlYWRjcnVtYnMucHVzaCh7aHJlZjogXCIjXCIgKyBsb2MsIG5hbWU6IG5hbWV9KTtcbiAgICAgIH1cbiAgICAgIENvcmUuJGFwcGx5KCRzY29wZSk7XG4gICAgfVxuICB9XSk7XG59XG4iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwid2lraVBsdWdpbi50c1wiLz5cbm1vZHVsZSBXaWtpIHtcbiAgX21vZHVsZS5jb250cm9sbGVyKCdXaWtpLk92ZXJ2aWV3RGFzaGJvYXJkJywgKCRzY29wZSwgJGxvY2F0aW9uLCAkcm91dGVQYXJhbXMpID0+IHtcbiAgICBXaWtpLmluaXRTY29wZSgkc2NvcGUsICRyb3V0ZVBhcmFtcywgJGxvY2F0aW9uKTtcbiAgICAkc2NvcGUuZGFzaGJvYXJkRW1iZWRkZWQgPSB0cnVlO1xuICAgICRzY29wZS5kYXNoYm9hcmRJZCA9ICcwJztcbiAgICAkc2NvcGUuZGFzaGJvYXJkSW5kZXggPSAnMCc7XG4gICAgJHNjb3BlLmRhc2hib2FyZFJlcG9zaXRvcnkgPSB7XG4gICAgICBnZXRUeXBlOiAoKSA9PiAnR2l0V2lraVJlcG9zaXRvcnknLFxuICAgICAgcHV0RGFzaGJvYXJkczogKGFycmF5OmFueVtdLCBjb21taXRNZXNzYWdlOnN0cmluZywgY2IpID0+IHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9LFxuICAgICAgZGVsZXRlRGFzaGJvYXJkczogKGFycmF5OkFycmF5PERhc2hib2FyZC5EYXNoYm9hcmQ+LCBmbikgPT4ge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH0sXG4gICAgICBnZXREYXNoYm9hcmRzOiAoZm46KGRhc2hib2FyZHM6IEFycmF5PERhc2hib2FyZC5EYXNoYm9hcmQ+KSA9PiB2b2lkKSA9PiB7XG4gICAgICAgIGxvZy5kZWJ1ZyhcImdldERhc2hib2FyZHMgY2FsbGVkXCIpO1xuICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICBmbihbe1xuICAgICAgICAgICAgZ3JvdXA6ICdUZXN0JyxcbiAgICAgICAgICAgIGlkOiAnMCcsXG4gICAgICAgICAgICB0aXRsZTogJ1Rlc3QnLFxuICAgICAgICAgICAgd2lkZ2V0czogW3tcbiAgICAgICAgICAgICAgY29sOiAxLFxuICAgICAgICAgICAgICBpZDogJ3cxJyxcbiAgICAgICAgICAgICAgaW5jbHVkZTogJ3BsdWdpbnMvd2lraS9odG1sL3Byb2plY3RzQ29tbWl0UGFuZWwuaHRtbCcsXG4gICAgICAgICAgICAgIHBhdGg6ICRsb2NhdGlvbi5wYXRoKCksXG4gICAgICAgICAgICAgIHJvdzogMSxcbiAgICAgICAgICAgICAgc2VhcmNoOiAkbG9jYXRpb24uc2VhcmNoKCksXG4gICAgICAgICAgICAgIHNpemVfeDogMyxcbiAgICAgICAgICAgICAgc2l6ZV95OiAyLFxuICAgICAgICAgICAgICB0aXRsZTogJ0NvbW1pdHMnXG4gICAgICAgICAgICB9XVxuICAgICAgICAgIH1dKTtcbiAgICAgICAgfSwgMTAwMCk7XG5cbiAgICAgIH0sXG4gICAgICBnZXREYXNoYm9hcmQ6IChpZDpzdHJpbmcsIGZuOiAoZGFzaGJvYXJkOiBEYXNoYm9hcmQuRGFzaGJvYXJkKSA9PiB2b2lkKSA9PiB7XG4gICAgICAgICRzY29wZS4kd2F0Y2goJ21vZGVsLmZldGNoZWQnLCAoZmV0Y2hlZCkgPT4ge1xuICAgICAgICAgIGlmICghZmV0Y2hlZCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgICAkc2NvcGUuJHdhdGNoKCdzZWxlY3RlZEJ1aWxkJywgKGJ1aWxkKSA9PiB7XG4gICAgICAgICAgICBpZiAoIWJ1aWxkKSB7XG4gICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgICRzY29wZS4kd2F0Y2goJ2VudGl0eScsIChlbnRpdHkpID0+IHtcbiAgICAgICAgICAgICAgaWYgKCFlbnRpdHkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgdmFyIG1vZGVsID0gJHNjb3BlLiRldmFsKCdtb2RlbCcpO1xuICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIkJ1aWxkOiBcIiwgYnVpbGQpO1xuICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIk1vZGVsOiBcIiwgbW9kZWwpO1xuICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIkVudGl0eTogXCIsIGVudGl0eSk7XG4gICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgIHZhciBzZWFyY2ggPSA8RGFzaGJvYXJkLlNlYXJjaE1hcD4ge1xuICAgICAgICAgICAgICAgIHByb2plY3RJZDogJHNjb3BlLnByb2plY3RJZCxcbiAgICAgICAgICAgICAgICBuYW1lc3BhY2U6ICRzY29wZS5uYW1lc3BhY2UsXG4gICAgICAgICAgICAgICAgb3duZXI6ICRzY29wZS5vd25lcixcbiAgICAgICAgICAgICAgICBicmFuY2g6ICRzY29wZS5icmFuY2gsXG4gICAgICAgICAgICAgICAgam9iOiBidWlsZC4kam9iSWQsXG4gICAgICAgICAgICAgICAgaWQ6ICRzY29wZS5wcm9qZWN0SWQsXG4gICAgICAgICAgICAgICAgYnVpbGQ6IGJ1aWxkLmlkXG5cbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIHZhciBkYXNoYm9hcmQgPSB7XG4gICAgICAgICAgICAgICAgICBncm91cDogJ1Rlc3QnLFxuICAgICAgICAgICAgICAgICAgaWQ6ICcwJyxcbiAgICAgICAgICAgICAgICAgIHRpdGxlOiAnVGVzdCcsXG4gICAgICAgICAgICAgICAgICB3aWRnZXRzOiBbXG4gICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIGNvbDogMSxcbiAgICAgICAgICAgICAgICAgICAgcm93OiAzLFxuICAgICAgICAgICAgICAgICAgICBpZDogJ3czJyxcbiAgICAgICAgICAgICAgICAgICAgaW5jbHVkZTogJ3BsdWdpbnMva3ViZXJuZXRlcy9odG1sL3BlbmRpbmdQaXBlbGluZXMuaHRtbCcsXG4gICAgICAgICAgICAgICAgICAgIHBhdGg6ICRsb2NhdGlvbi5wYXRoKCksXG4gICAgICAgICAgICAgICAgICAgIHNlYXJjaDogc2VhcmNoLFxuICAgICAgICAgICAgICAgICAgICBzaXplX3g6IDksXG4gICAgICAgICAgICAgICAgICAgIHNpemVfeTogMSxcbiAgICAgICAgICAgICAgICAgICAgdGl0bGU6ICdQaXBlbGluZXMnXG4gICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBjb2w6IDEsXG4gICAgICAgICAgICAgICAgICAgIHJvdzogNCxcbiAgICAgICAgICAgICAgICAgICAgaWQ6ICd3MicsXG4gICAgICAgICAgICAgICAgICAgIGluY2x1ZGU6ICdwbHVnaW5zL2RldmVsb3Blci9odG1sL2xvZ1BhbmVsLmh0bWwnLFxuICAgICAgICAgICAgICAgICAgICBwYXRoOiAkbG9jYXRpb24ucGF0aCgpLFxuICAgICAgICAgICAgICAgICAgICBzZWFyY2g6IHNlYXJjaCxcbiAgICAgICAgICAgICAgICAgICAgc2l6ZV94OiA0LFxuICAgICAgICAgICAgICAgICAgICBzaXplX3k6IDIsXG4gICAgICAgICAgICAgICAgICAgIHRpdGxlOiAnTG9ncyBmb3Igam9iOiAnICsgYnVpbGQuJGpvYklkICsgJyBidWlsZDogJyArIGJ1aWxkLmlkXG4gICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBjb2w6IDUsXG4gICAgICAgICAgICAgICAgICAgIGlkOiAndzQnLFxuICAgICAgICAgICAgICAgICAgICBpbmNsdWRlOiAncGx1Z2lucy93aWtpL2h0bWwvcHJvamVjdENvbW1pdHNQYW5lbC5odG1sJyxcbiAgICAgICAgICAgICAgICAgICAgcGF0aDogJGxvY2F0aW9uLnBhdGgoKSxcbiAgICAgICAgICAgICAgICAgICAgcm93OiA0LFxuICAgICAgICAgICAgICAgICAgICBzZWFyY2g6IHNlYXJjaCxcbiAgICAgICAgICAgICAgICAgICAgc2l6ZV94OiA1LFxuICAgICAgICAgICAgICAgICAgICBzaXplX3k6IDIsXG4gICAgICAgICAgICAgICAgICAgIHRpdGxlOiAnQ29tbWl0cydcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIF1cbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIGlmIChlbnRpdHkuZW52aXJvbm1lbnRzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgdmFyIGNvbFBvc2l0aW9uID0gMTtcbiAgICAgICAgICAgICAgICAgIF8uZm9yRWFjaChlbnRpdHkuZW52aXJvbm1lbnRzLCAoZW52OmFueSwgaW5kZXgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHMgPSA8RGFzaGJvYXJkLlNlYXJjaE1hcD4gXy5leHRlbmQoe1xuICAgICAgICAgICAgICAgICAgICAgIGxhYmVsOiBlbnYubGFiZWxcbiAgICAgICAgICAgICAgICAgICAgfSwgc2VhcmNoKTtcbiAgICAgICAgICAgICAgICAgICAgZGFzaGJvYXJkLndpZGdldHMucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgICAgaWQ6IGVudi51cmwsXG4gICAgICAgICAgICAgICAgICAgICAgdGl0bGU6ICdFbnZpcm9ubWVudDogJyArIGVudi5sYWJlbCxcbiAgICAgICAgICAgICAgICAgICAgICBzaXplX3g6IDMsXG4gICAgICAgICAgICAgICAgICAgICAgc2l6ZV95OiAyLFxuICAgICAgICAgICAgICAgICAgICAgIGNvbDogY29sUG9zaXRpb24sXG4gICAgICAgICAgICAgICAgICAgICAgcm93OiAxLFxuICAgICAgICAgICAgICAgICAgICAgIGluY2x1ZGU6ICdwbHVnaW5zL2RldmVsb3Blci9odG1sL2Vudmlyb25tZW50UGFuZWwuaHRtbCcsXG4gICAgICAgICAgICAgICAgICAgICAgcGF0aDogJGxvY2F0aW9uLnBhdGgoKSxcbiAgICAgICAgICAgICAgICAgICAgICBzZWFyY2g6IHNcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIGNvbFBvc2l0aW9uID0gY29sUG9zaXRpb24gKyAzO1xuICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgZm4oZGFzaGJvYXJkKTtcbiAgICAgICAgICAgICAgfSwgMSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgICB9LFxuICAgICAgY3JlYXRlRGFzaGJvYXJkOiAob3B0aW9uczphbnkpID0+IHtcblxuICAgICAgfVxuICAgIH07XG5cblxuICB9KTtcbn1cbiIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9pbmNsdWRlcy50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJ3aWtpSGVscGVycy50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJ3aWtpUGx1Z2luLnRzXCIvPlxuXG4vKipcbiAqIEBtb2R1bGUgV2lraVxuICovXG5tb2R1bGUgV2lraSB7XG5cbiAgLy8gbWFpbiBwYWdlIGNvbnRyb2xsZXJcbiAgZXhwb3J0IHZhciBWaWV3Q29udHJvbGxlciA9IF9tb2R1bGUuY29udHJvbGxlcihcIldpa2kuVmlld0NvbnRyb2xsZXJcIiwgW1wiJHNjb3BlXCIsIFwiJGxvY2F0aW9uXCIsIFwiJHJvdXRlUGFyYW1zXCIsIFwiJHJvdXRlXCIsIFwiJGh0dHBcIiwgXCIkdGltZW91dFwiLCBcIm1hcmtlZFwiLCBcImZpbGVFeHRlbnNpb25UeXBlUmVnaXN0cnlcIiwgIFwiJGNvbXBpbGVcIiwgXCIkdGVtcGxhdGVDYWNoZVwiLCBcImxvY2FsU3RvcmFnZVwiLCBcIiRpbnRlcnBvbGF0ZVwiLCBcIiRkaWFsb2dcIiwgKCRzY29wZSwgJGxvY2F0aW9uOm5nLklMb2NhdGlvblNlcnZpY2UsICRyb3V0ZVBhcmFtczpuZy5yb3V0ZS5JUm91dGVQYXJhbXNTZXJ2aWNlLCAkcm91dGU6bmcucm91dGUuSVJvdXRlU2VydmljZSwgJGh0dHA6bmcuSUh0dHBTZXJ2aWNlLCAkdGltZW91dDpuZy5JVGltZW91dFNlcnZpY2UsIG1hcmtlZCwgZmlsZUV4dGVuc2lvblR5cGVSZWdpc3RyeSwgICRjb21waWxlOm5nLklDb21waWxlU2VydmljZSwgJHRlbXBsYXRlQ2FjaGU6bmcuSVRlbXBsYXRlQ2FjaGVTZXJ2aWNlLCBsb2NhbFN0b3JhZ2UsICRpbnRlcnBvbGF0ZTpuZy5JSW50ZXJwb2xhdGVTZXJ2aWNlLCAkZGlhbG9nKSA9PiB7XG5cbiAgICAkc2NvcGUubmFtZSA9IFwiV2lraVZpZXdDb250cm9sbGVyXCI7XG5cbiAgICAvLyBUT0RPIHJlbW92ZSFcbiAgICB2YXIgaXNGbWMgPSBmYWxzZTtcblxuICAgIFdpa2kuaW5pdFNjb3BlKCRzY29wZSwgJHJvdXRlUGFyYW1zLCAkbG9jYXRpb24pO1xuICAgIHZhciB3aWtpUmVwb3NpdG9yeSA9ICRzY29wZS53aWtpUmVwb3NpdG9yeTtcblxuICAgIFNlbGVjdGlvbkhlbHBlcnMuZGVjb3JhdGUoJHNjb3BlKTtcblxuICAgICRzY29wZS5mYWJyaWNUb3BMZXZlbCA9IFwiZmFicmljL3Byb2ZpbGVzL1wiO1xuXG4gICAgJHNjb3BlLnZlcnNpb25JZCA9ICRzY29wZS5icmFuY2g7XG5cbiAgICAkc2NvcGUucGFuZVRlbXBsYXRlID0gJyc7XG5cbiAgICAkc2NvcGUucHJvZmlsZUlkID0gXCJcIjtcbiAgICAkc2NvcGUuc2hvd1Byb2ZpbGVIZWFkZXIgPSBmYWxzZTtcbiAgICAkc2NvcGUuc2hvd0FwcEhlYWRlciA9IGZhbHNlO1xuXG4gICAgJHNjb3BlLm9wZXJhdGlvbkNvdW50ZXIgPSAxO1xuICAgICRzY29wZS5yZW5hbWVEaWFsb2cgPSA8V2lraURpYWxvZz4gbnVsbDtcbiAgICAkc2NvcGUubW92ZURpYWxvZyA9IDxXaWtpRGlhbG9nPiBudWxsO1xuICAgICRzY29wZS5kZWxldGVEaWFsb2cgPSA8V2lraURpYWxvZz4gbnVsbDtcbiAgICAkc2NvcGUuaXNGaWxlID0gZmFsc2U7XG5cbiAgICAkc2NvcGUucmVuYW1lID0ge1xuICAgICAgbmV3RmlsZU5hbWU6IFwiXCJcbiAgICB9O1xuICAgICRzY29wZS5tb3ZlID0ge1xuICAgICAgbW92ZUZvbGRlcjogXCJcIlxuICAgIH07XG4gICAgJHNjb3BlLlZpZXdNb2RlID0gV2lraS5WaWV3TW9kZTtcblxuICAgIC8vIGJpbmQgZmlsdGVyIG1vZGVsIHZhbHVlcyB0byBzZWFyY2ggcGFyYW1zLi4uXG4gICAgQ29yZS5iaW5kTW9kZWxUb1NlYXJjaFBhcmFtKCRzY29wZSwgJGxvY2F0aW9uLCBcInNlYXJjaFRleHRcIiwgXCJxXCIsIFwiXCIpO1xuXG4gICAgU3RvcmFnZUhlbHBlcnMuYmluZE1vZGVsVG9Mb2NhbFN0b3JhZ2Uoe1xuICAgICAgJHNjb3BlOiAkc2NvcGUsXG4gICAgICAkbG9jYXRpb246ICRsb2NhdGlvbixcbiAgICAgIGxvY2FsU3RvcmFnZTogbG9jYWxTdG9yYWdlLFxuICAgICAgbW9kZWxOYW1lOiAnbW9kZScsXG4gICAgICBwYXJhbU5hbWU6ICd3aWtpVmlld01vZGUnLFxuICAgICAgaW5pdGlhbFZhbHVlOiBXaWtpLlZpZXdNb2RlLkljb24sXG4gICAgICB0bzogQ29yZS5udW1iZXJUb1N0cmluZyxcbiAgICAgIGZyb206IENvcmUucGFyc2VJbnRWYWx1ZVxuICAgIH0pO1xuXG4gICAgLy8gb25seSByZWxvYWQgdGhlIHBhZ2UgaWYgY2VydGFpbiBzZWFyY2ggcGFyYW1ldGVycyBjaGFuZ2VcbiAgICBDb3JlLnJlbG9hZFdoZW5QYXJhbWV0ZXJzQ2hhbmdlKCRyb3V0ZSwgJHNjb3BlLCAkbG9jYXRpb24sIFsnd2lraVZpZXdNb2RlJ10pO1xuXG4gICAgJHNjb3BlLmdyaWRPcHRpb25zID0ge1xuICAgICAgZGF0YTogJ2NoaWxkcmVuJyxcbiAgICAgIGRpc3BsYXlGb290ZXI6IGZhbHNlLFxuICAgICAgc2VsZWN0ZWRJdGVtczogW10sXG4gICAgICBzaG93U2VsZWN0aW9uQ2hlY2tib3g6IHRydWUsXG4gICAgICBlbmFibGVTb3J0aW5nOiBmYWxzZSxcbiAgICAgIHVzZUV4dGVybmFsU29ydGluZzogdHJ1ZSxcbiAgICAgIGNvbHVtbkRlZnM6IFtcbiAgICAgICAge1xuICAgICAgICAgIGZpZWxkOiAnbmFtZScsXG4gICAgICAgICAgZGlzcGxheU5hbWU6ICdOYW1lJyxcbiAgICAgICAgICBjZWxsVGVtcGxhdGU6ICR0ZW1wbGF0ZUNhY2hlLmdldCgnZmlsZUNlbGxUZW1wbGF0ZS5odG1sJyksXG4gICAgICAgICAgaGVhZGVyQ2VsbFRlbXBsYXRlOiAkdGVtcGxhdGVDYWNoZS5nZXQoJ2ZpbGVDb2x1bW5UZW1wbGF0ZS5odG1sJylcbiAgICAgICAgfVxuICAgICAgXVxuICAgIH07XG5cbiAgICAkc2NvcGUuJG9uKCdXaWtpLlNldFZpZXdNb2RlJywgKCRldmVudCwgbW9kZTpXaWtpLlZpZXdNb2RlKSA9PiB7XG4gICAgICAkc2NvcGUubW9kZSA9IG1vZGU7XG4gICAgICBzd2l0Y2gobW9kZSkge1xuICAgICAgICBjYXNlIFZpZXdNb2RlLkxpc3Q6XG4gICAgICAgICAgbG9nLmRlYnVnKFwiTGlzdCB2aWV3IG1vZGVcIik7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgVmlld01vZGUuSWNvbjpcbiAgICAgICAgICBsb2cuZGVidWcoXCJJY29uIHZpZXcgbW9kZVwiKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAkc2NvcGUubW9kZSA9IFZpZXdNb2RlLkxpc3Q7XG4gICAgICAgICAgbG9nLmRlYnVnKFwiRGVmYXVsdGluZyB0byBsaXN0IHZpZXcgbW9kZVwiKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9KTtcblxuXG4gICAgJHNjb3BlLmNoaWxkQWN0aW9ucyA9IFtdO1xuXG4gICAgdmFyIG1heWJlVXBkYXRlVmlldyA9IENvcmUudGhyb3R0bGVkKHVwZGF0ZVZpZXcsIDEwMDApO1xuXG4gICAgJHNjb3BlLm1hcmtlZCA9ICh0ZXh0KSA9PiB7XG4gICAgICBpZiAodGV4dCkge1xuICAgICAgICByZXR1cm4gbWFya2VkKHRleHQpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuICcnO1xuICAgICAgfVxuICAgIH07XG5cblxuICAgICRzY29wZS4kb24oJ3dpa2lCcmFuY2hlc1VwZGF0ZWQnLCBmdW5jdGlvbiAoKSB7XG4gICAgICB1cGRhdGVWaWV3KCk7XG4gICAgfSk7XG5cbiAgICAkc2NvcGUuY3JlYXRlRGFzaGJvYXJkTGluayA9ICgpID0+IHtcbiAgICAgIHZhciBocmVmID0gJy93aWtpL2JyYW5jaC86YnJhbmNoL3ZpZXcvKnBhZ2UnO1xuICAgICAgdmFyIHBhZ2UgPSAkcm91dGVQYXJhbXNbJ3BhZ2UnXTtcbiAgICAgIHZhciB0aXRsZSA9IHBhZ2UgPyBwYWdlLnNwbGl0KFwiL1wiKS5sYXN0KCkgOiBudWxsO1xuICAgICAgdmFyIHNpemUgPSBhbmd1bGFyLnRvSnNvbih7XG4gICAgICAgIHNpemVfeDogMixcbiAgICAgICAgc2l6ZV95OiAyXG4gICAgICB9KTtcbiAgICAgIHZhciBhbnN3ZXIgPSBcIiMvZGFzaGJvYXJkL2FkZD90YWI9ZGFzaGJvYXJkXCIgK1xuICAgICAgICBcIiZocmVmPVwiICsgZW5jb2RlVVJJQ29tcG9uZW50KGhyZWYpICtcbiAgICAgICAgXCImc2l6ZT1cIiArIGVuY29kZVVSSUNvbXBvbmVudChzaXplKSArXG4gICAgICAgIFwiJnJvdXRlUGFyYW1zPVwiICsgZW5jb2RlVVJJQ29tcG9uZW50KGFuZ3VsYXIudG9Kc29uKCRyb3V0ZVBhcmFtcykpO1xuICAgICAgaWYgKHRpdGxlKSB7XG4gICAgICAgIGFuc3dlciArPSBcIiZ0aXRsZT1cIiArIGVuY29kZVVSSUNvbXBvbmVudCh0aXRsZSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gYW5zd2VyO1xuICAgIH07XG5cbiAgICAkc2NvcGUuZGlzcGxheUNsYXNzID0gKCkgPT4ge1xuICAgICAgaWYgKCEkc2NvcGUuY2hpbGRyZW4gfHwgJHNjb3BlLmNoaWxkcmVuLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICByZXR1cm4gXCJcIjtcbiAgICAgIH1cbiAgICAgIHJldHVybiBcInNwYW45XCI7XG4gICAgfTtcblxuICAgICRzY29wZS5wYXJlbnRMaW5rID0gKCkgPT4ge1xuICAgICAgdmFyIHN0YXJ0ID0gc3RhcnRMaW5rKCRzY29wZSk7XG4gICAgICB2YXIgcHJlZml4ID0gc3RhcnQgKyBcIi92aWV3XCI7XG4gICAgICAvL2xvZy5kZWJ1ZyhcInBhZ2VJZDogXCIsICRzY29wZS5wYWdlSWQpXG4gICAgICB2YXIgcGFydHMgPSAkc2NvcGUucGFnZUlkLnNwbGl0KFwiL1wiKTtcbiAgICAgIC8vbG9nLmRlYnVnKFwicGFydHM6IFwiLCBwYXJ0cyk7XG4gICAgICB2YXIgcGF0aCA9IFwiL1wiICsgcGFydHMuZmlyc3QocGFydHMubGVuZ3RoIC0gMSkuam9pbihcIi9cIik7XG4gICAgICAvL2xvZy5kZWJ1ZyhcInBhdGg6IFwiLCBwYXRoKTtcbiAgICAgIHJldHVybiBDb3JlLmNyZWF0ZUhyZWYoJGxvY2F0aW9uLCBwcmVmaXggKyBwYXRoLCBbXSk7XG4gICAgfTtcblxuXG4gICAgJHNjb3BlLmNoaWxkTGluayA9IChjaGlsZCkgPT4ge1xuICAgICAgdmFyIHN0YXJ0ID0gc3RhcnRMaW5rKCRzY29wZSk7XG4gICAgICB2YXIgcHJlZml4ID0gc3RhcnQgKyBcIi92aWV3XCI7XG4gICAgICB2YXIgcG9zdEZpeCA9IFwiXCI7XG4gICAgICB2YXIgcGF0aCA9IFdpa2kuZW5jb2RlUGF0aChjaGlsZC5wYXRoKTtcbiAgICAgIGlmIChjaGlsZC5kaXJlY3RvcnkpIHtcbiAgICAgICAgLy8gaWYgd2UgYXJlIGEgZm9sZGVyIHdpdGggdGhlIHNhbWUgbmFtZSBhcyBhIGZvcm0gZmlsZSwgbGV0cyBhZGQgYSBmb3JtIHBhcmFtLi4uXG4gICAgICAgIHZhciBmb3JtUGF0aCA9IHBhdGggKyBcIi5mb3JtXCI7XG4gICAgICAgIHZhciBjaGlsZHJlbiA9ICRzY29wZS5jaGlsZHJlbjtcbiAgICAgICAgaWYgKGNoaWxkcmVuKSB7XG4gICAgICAgICAgdmFyIGZvcm1GaWxlID0gY2hpbGRyZW4uZmluZCgoY2hpbGQpID0+IHtcbiAgICAgICAgICAgIHJldHVybiBjaGlsZFsncGF0aCddID09PSBmb3JtUGF0aDtcbiAgICAgICAgICB9KTtcbiAgICAgICAgICBpZiAoZm9ybUZpbGUpIHtcbiAgICAgICAgICAgIHByZWZpeCA9IHN0YXJ0ICsgXCIvZm9ybVRhYmxlXCI7XG4gICAgICAgICAgICBwb3N0Rml4ID0gXCI/Zm9ybT1cIiArIGZvcm1QYXRoO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIHhtbE5hbWVzcGFjZXMgPSBjaGlsZC54bWxfbmFtZXNwYWNlcyB8fCBjaGlsZC54bWxOYW1lc3BhY2VzO1xuICAgICAgICBpZiAoeG1sTmFtZXNwYWNlcyAmJiB4bWxOYW1lc3BhY2VzLmxlbmd0aCkge1xuICAgICAgICAgIGlmICh4bWxOYW1lc3BhY2VzLmFueSgobnMpID0+IFdpa2kuY2FtZWxOYW1lc3BhY2VzLmFueShucykpKSB7XG4gICAgICAgICAgICBpZiAodXNlQ2FtZWxDYW52YXNCeURlZmF1bHQpIHtcbiAgICAgICAgICAgICAgcHJlZml4ID0gc3RhcnQgKyBcIi9jYW1lbC9jYW52YXNcIjtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHByZWZpeCA9IHN0YXJ0ICsgXCIvY2FtZWwvcHJvcGVydGllc1wiO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSBpZiAoeG1sTmFtZXNwYWNlcy5hbnkoKG5zKSA9PiBXaWtpLmRvemVyTmFtZXNwYWNlcy5hbnkobnMpKSkge1xuICAgICAgICAgICAgcHJlZml4ID0gc3RhcnQgKyBcIi9kb3plci9tYXBwaW5nc1wiO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBsb2cuZGVidWcoXCJjaGlsZCBcIiArIHBhdGggKyBcIiBoYXMgbmFtZXNwYWNlcyBcIiArIHhtbE5hbWVzcGFjZXMpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoY2hpbGQucGF0aC5lbmRzV2l0aChcIi5mb3JtXCIpKSB7XG4gICAgICAgICAgcG9zdEZpeCA9IFwiP2Zvcm09L1wiO1xuICAgICAgICB9IGVsc2UgaWYgKFdpa2kuaXNJbmRleFBhZ2UoY2hpbGQucGF0aCkpIHtcbiAgICAgICAgICAvLyBsZXRzIGRlZmF1bHQgdG8gYm9vayB2aWV3IG9uIGluZGV4IHBhZ2VzXG4gICAgICAgICAgcHJlZml4ID0gc3RhcnQgKyBcIi9ib29rXCI7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiBDb3JlLmNyZWF0ZUhyZWYoJGxvY2F0aW9uLCBVcmxIZWxwZXJzLmpvaW4ocHJlZml4LCBwYXRoKSArIHBvc3RGaXgsIFtcImZvcm1cIl0pO1xuICAgIH07XG5cbiAgICAkc2NvcGUuZmlsZU5hbWUgPSAoZW50aXR5KSA9PiB7XG4gICAgICByZXR1cm4gV2lraS5oaWRlRmlsZU5hbWVFeHRlbnNpb25zKGVudGl0eS5kaXNwbGF5TmFtZSB8fCBlbnRpdHkubmFtZSk7XG4gICAgfTtcblxuICAgICRzY29wZS5maWxlQ2xhc3MgPSAoZW50aXR5KSA9PiB7XG4gICAgICBpZiAoZW50aXR5Lm5hbWUuaGFzKFwiLnByb2ZpbGVcIikpIHtcbiAgICAgICAgcmV0dXJuIFwiZ3JlZW5cIjtcbiAgICAgIH1cbiAgICAgIHJldHVybiBcIlwiO1xuICAgIH07XG5cbiAgICAkc2NvcGUuZmlsZUljb25IdG1sID0gKGVudGl0eSkgPT4ge1xuICAgICAgcmV0dXJuIFdpa2kuZmlsZUljb25IdG1sKGVudGl0eSk7XG4gICAgfTtcblxuXG4gICAgJHNjb3BlLmZvcm1hdCA9IFdpa2kuZmlsZUZvcm1hdCgkc2NvcGUucGFnZUlkLCBmaWxlRXh0ZW5zaW9uVHlwZVJlZ2lzdHJ5KTtcbiAgICB2YXIgb3B0aW9ucyA9IHtcbiAgICAgIHJlYWRPbmx5OiB0cnVlLFxuICAgICAgbW9kZToge1xuICAgICAgICBuYW1lOiAkc2NvcGUuZm9ybWF0XG4gICAgICB9XG4gICAgfTtcbiAgICAkc2NvcGUuY29kZU1pcnJvck9wdGlvbnMgPSBDb2RlRWRpdG9yLmNyZWF0ZUVkaXRvclNldHRpbmdzKG9wdGlvbnMpO1xuXG4gICAgJHNjb3BlLmVkaXRMaW5rID0gKCkgPT4ge1xuICAgICAgdmFyIHBhZ2VOYW1lID0gKCRzY29wZS5kaXJlY3RvcnkpID8gJHNjb3BlLnJlYWRNZVBhdGggOiAkc2NvcGUucGFnZUlkO1xuICAgICAgcmV0dXJuIChwYWdlTmFtZSkgPyBXaWtpLmVkaXRMaW5rKCRzY29wZSwgcGFnZU5hbWUsICRsb2NhdGlvbikgOiBudWxsO1xuICAgIH07XG5cbiAgICAkc2NvcGUuZm9yZ2VMaW5rID0gKCkgPT4ge1xuICAgICAgcmV0dXJuIEZvcmdlLnByb2plY3RDb21tYW5kc0xpbmsoJHNjb3BlLm5hbWVzcGFjZSwgJHNjb3BlLnByb2plY3RJZCk7XG4gICAgfTtcblxuICAgICRzY29wZS5icmFuY2hMaW5rID0gKGJyYW5jaCkgPT4ge1xuICAgICAgaWYgKGJyYW5jaCkge1xuICAgICAgICByZXR1cm4gV2lraS5icmFuY2hMaW5rKGJyYW5jaCwgJHNjb3BlLnBhZ2VJZCwgJGxvY2F0aW9uKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBudWxsXG4gICAgfTtcblxuICAgICRzY29wZS5oaXN0b3J5TGluayA9IFwiIy93aWtpXCIgKyAoJHNjb3BlLmJyYW5jaCA/IFwiL2JyYW5jaC9cIiArICRzY29wZS5icmFuY2ggOiBcIlwiKSArIFwiL2hpc3RvcnkvXCIgKyAkc2NvcGUucGFnZUlkO1xuXG4gICAgJHNjb3BlLiR3YXRjaCgnd29ya3NwYWNlLnRyZWUnLCBmdW5jdGlvbiAoKSB7XG4gICAgICBpZiAoISRzY29wZS5naXQpIHtcbiAgICAgICAgLy8gbGV0cyBkbyB0aGlzIGFzeW5jaHJvbm91c2x5IHRvIGF2b2lkIEVycm9yOiAkZGlnZXN0IGFscmVhZHkgaW4gcHJvZ3Jlc3NcbiAgICAgICAgLy9sb2cuaW5mbyhcIlJlbG9hZGluZyB2aWV3IGFzIHRoZSB0cmVlIGNoYW5nZWQgYW5kIHdlIGhhdmUgYSBnaXQgbWJlYW4gbm93XCIpO1xuICAgICAgICBzZXRUaW1lb3V0KG1heWJlVXBkYXRlVmlldywgNTApO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgJHNjb3BlLiRvbihcIiRyb3V0ZUNoYW5nZVN1Y2Nlc3NcIiwgZnVuY3Rpb24gKGV2ZW50LCBjdXJyZW50LCBwcmV2aW91cykge1xuICAgICAgLy8gbGV0cyBkbyB0aGlzIGFzeW5jaHJvbm91c2x5IHRvIGF2b2lkIEVycm9yOiAkZGlnZXN0IGFscmVhZHkgaW4gcHJvZ3Jlc3NcbiAgICAgIC8vbG9nLmluZm8oXCJSZWxvYWRpbmcgdmlldyBkdWUgdG8gJHJvdXRlQ2hhbmdlU3VjY2Vzc1wiKTtcbiAgICAgIHNldFRpbWVvdXQobWF5YmVVcGRhdGVWaWV3LCA1MCk7XG4gICAgfSk7XG5cblxuICAgICRzY29wZS5vcGVuRGVsZXRlRGlhbG9nID0gKCkgPT4ge1xuICAgICAgaWYgKCRzY29wZS5ncmlkT3B0aW9ucy5zZWxlY3RlZEl0ZW1zLmxlbmd0aCkge1xuICAgICAgICAkc2NvcGUuc2VsZWN0ZWRGaWxlSHRtbCA9IFwiPHVsPlwiICsgJHNjb3BlLmdyaWRPcHRpb25zLnNlbGVjdGVkSXRlbXMubWFwKGZpbGUgPT4gXCI8bGk+XCIgKyBmaWxlLm5hbWUgKyBcIjwvbGk+XCIpLnNvcnQoKS5qb2luKFwiXCIpICsgXCI8L3VsPlwiO1xuXG4gICAgICAgIGlmICgkc2NvcGUuZ3JpZE9wdGlvbnMuc2VsZWN0ZWRJdGVtcy5maW5kKChmaWxlKSA9PiB7IHJldHVybiBmaWxlLm5hbWUuZW5kc1dpdGgoXCIucHJvZmlsZVwiKX0pKSB7XG4gICAgICAgICAgJHNjb3BlLmRlbGV0ZVdhcm5pbmcgPSBcIllvdSBhcmUgYWJvdXQgdG8gZGVsZXRlIGRvY3VtZW50KHMpIHdoaWNoIHJlcHJlc2VudCBGYWJyaWM4IHByb2ZpbGUocykuIFRoaXMgcmVhbGx5IGNhbid0IGJlIHVuZG9uZSEgV2lraSBvcGVyYXRpb25zIGFyZSBsb3cgbGV2ZWwgYW5kIG1heSBsZWFkIHRvIG5vbi1mdW5jdGlvbmFsIHN0YXRlIG9mIEZhYnJpYy5cIjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAkc2NvcGUuZGVsZXRlV2FybmluZyA9IG51bGw7XG4gICAgICAgIH1cblxuICAgICAgICAkc2NvcGUuZGVsZXRlRGlhbG9nID0gV2lraS5nZXREZWxldGVEaWFsb2coJGRpYWxvZywgPFdpa2kuRGVsZXRlRGlhbG9nT3B0aW9ucz57XG4gICAgICAgICAgY2FsbGJhY2tzOiAoKSA9PiB7IHJldHVybiAkc2NvcGUuZGVsZXRlQW5kQ2xvc2VEaWFsb2c7IH0sXG4gICAgICAgICAgc2VsZWN0ZWRGaWxlSHRtbDogKCkgPT4gIHsgcmV0dXJuICRzY29wZS5zZWxlY3RlZEZpbGVIdG1sOyB9LFxuICAgICAgICAgIHdhcm5pbmc6ICgpID0+IHsgcmV0dXJuICRzY29wZS5kZWxldGVXYXJuaW5nOyB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgICRzY29wZS5kZWxldGVEaWFsb2cub3BlbigpO1xuXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBsb2cuZGVidWcoXCJObyBpdGVtcyBzZWxlY3RlZCByaWdodCBub3chIFwiICsgJHNjb3BlLmdyaWRPcHRpb25zLnNlbGVjdGVkSXRlbXMpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICAkc2NvcGUuZGVsZXRlQW5kQ2xvc2VEaWFsb2cgPSAoKSA9PiB7XG4gICAgICB2YXIgZmlsZXMgPSAkc2NvcGUuZ3JpZE9wdGlvbnMuc2VsZWN0ZWRJdGVtcztcbiAgICAgIHZhciBmaWxlQ291bnQgPSBmaWxlcy5sZW5ndGg7XG4gICAgICBsb2cuZGVidWcoXCJEZWxldGluZyBzZWxlY3Rpb246IFwiICsgZmlsZXMpO1xuXG4gICAgICB2YXIgcGF0aHNUb0RlbGV0ZSA9IFtdO1xuICAgICAgYW5ndWxhci5mb3JFYWNoKGZpbGVzLCAoZmlsZSwgaWR4KSA9PiB7XG4gICAgICAgIHZhciBwYXRoID0gVXJsSGVscGVycy5qb2luKCRzY29wZS5wYWdlSWQsIGZpbGUubmFtZSk7XG4gICAgICAgIHBhdGhzVG9EZWxldGUucHVzaChwYXRoKTtcbiAgICAgIH0pO1xuXG4gICAgICBsb2cuZGVidWcoXCJBYm91dCB0byBkZWxldGUgXCIgKyBwYXRoc1RvRGVsZXRlKTtcbiAgICAgICRzY29wZS5naXQgPSB3aWtpUmVwb3NpdG9yeS5yZW1vdmVQYWdlcygkc2NvcGUuYnJhbmNoLCBwYXRoc1RvRGVsZXRlLCBudWxsLCAocmVzdWx0KSA9PiB7XG4gICAgICAgICRzY29wZS5ncmlkT3B0aW9ucy5zZWxlY3RlZEl0ZW1zID0gW107XG4gICAgICAgIHZhciBtZXNzYWdlID0gQ29yZS5tYXliZVBsdXJhbChmaWxlQ291bnQsIFwiZG9jdW1lbnRcIik7XG4gICAgICAgIENvcmUubm90aWZpY2F0aW9uKFwic3VjY2Vzc1wiLCBcIkRlbGV0ZWQgXCIgKyBtZXNzYWdlKTtcbiAgICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICAgICAgdXBkYXRlVmlldygpO1xuICAgICAgfSk7XG4gICAgICAkc2NvcGUuZGVsZXRlRGlhbG9nLmNsb3NlKCk7XG4gICAgfTtcblxuICAgICRzY29wZS4kd2F0Y2goXCJyZW5hbWUubmV3RmlsZU5hbWVcIiwgKCkgPT4ge1xuICAgICAgLy8gaWdub3JlIGVycm9ycyBpZiB0aGUgZmlsZSBpcyB0aGUgc2FtZSBhcyB0aGUgcmVuYW1lIGZpbGUhXG4gICAgICB2YXIgcGF0aCA9IGdldFJlbmFtZUZpbGVQYXRoKCk7XG4gICAgICBpZiAoJHNjb3BlLm9yaWdpbmFsUmVuYW1lRmlsZVBhdGggPT09IHBhdGgpIHtcbiAgICAgICAgJHNjb3BlLmZpbGVFeGlzdHMgPSB7IGV4aXN0czogZmFsc2UsIG5hbWU6IG51bGwgfTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNoZWNrRmlsZUV4aXN0cyhwYXRoKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgICRzY29wZS5yZW5hbWVBbmRDbG9zZURpYWxvZyA9ICgpID0+IHtcbiAgICAgIGlmICgkc2NvcGUuZ3JpZE9wdGlvbnMuc2VsZWN0ZWRJdGVtcy5sZW5ndGgpIHtcbiAgICAgICAgdmFyIHNlbGVjdGVkID0gJHNjb3BlLmdyaWRPcHRpb25zLnNlbGVjdGVkSXRlbXNbMF07XG4gICAgICAgIHZhciBuZXdQYXRoID0gZ2V0UmVuYW1lRmlsZVBhdGgoKTtcbiAgICAgICAgaWYgKHNlbGVjdGVkICYmIG5ld1BhdGgpIHtcbiAgICAgICAgICB2YXIgb2xkTmFtZSA9IHNlbGVjdGVkLm5hbWU7XG4gICAgICAgICAgdmFyIG5ld05hbWUgPSBXaWtpLmZpbGVOYW1lKG5ld1BhdGgpO1xuICAgICAgICAgIHZhciBvbGRQYXRoID0gVXJsSGVscGVycy5qb2luKCRzY29wZS5wYWdlSWQsIG9sZE5hbWUpO1xuICAgICAgICAgIGxvZy5kZWJ1ZyhcIkFib3V0IHRvIHJlbmFtZSBmaWxlIFwiICsgb2xkUGF0aCArIFwiIHRvIFwiICsgbmV3UGF0aCk7XG4gICAgICAgICAgJHNjb3BlLmdpdCA9IHdpa2lSZXBvc2l0b3J5LnJlbmFtZSgkc2NvcGUuYnJhbmNoLCBvbGRQYXRoLCBuZXdQYXRoLCBudWxsLCAocmVzdWx0KSA9PiB7XG4gICAgICAgICAgICBDb3JlLm5vdGlmaWNhdGlvbihcInN1Y2Nlc3NcIiwgXCJSZW5hbWVkIGZpbGUgdG8gIFwiICsgbmV3TmFtZSk7XG4gICAgICAgICAgICAkc2NvcGUuZ3JpZE9wdGlvbnMuc2VsZWN0ZWRJdGVtcy5zcGxpY2UoMCwgMSk7XG4gICAgICAgICAgICAkc2NvcGUucmVuYW1lRGlhbG9nLmNsb3NlKCk7XG4gICAgICAgICAgICBDb3JlLiRhcHBseSgkc2NvcGUpO1xuICAgICAgICAgICAgdXBkYXRlVmlldygpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICAkc2NvcGUucmVuYW1lRGlhbG9nLmNsb3NlKCk7XG4gICAgfTtcblxuICAgICRzY29wZS5vcGVuUmVuYW1lRGlhbG9nID0gKCkgPT4ge1xuICAgICAgdmFyIG5hbWUgPSBudWxsO1xuICAgICAgaWYgKCRzY29wZS5ncmlkT3B0aW9ucy5zZWxlY3RlZEl0ZW1zLmxlbmd0aCkge1xuICAgICAgICB2YXIgc2VsZWN0ZWQgPSAkc2NvcGUuZ3JpZE9wdGlvbnMuc2VsZWN0ZWRJdGVtc1swXTtcbiAgICAgICAgbmFtZSA9IHNlbGVjdGVkLm5hbWU7XG4gICAgICB9XG4gICAgICBpZiAobmFtZSkge1xuICAgICAgICAkc2NvcGUucmVuYW1lLm5ld0ZpbGVOYW1lID0gbmFtZTtcbiAgICAgICAgJHNjb3BlLm9yaWdpbmFsUmVuYW1lRmlsZVBhdGggPSBnZXRSZW5hbWVGaWxlUGF0aCgpO1xuXG4gICAgICAgICRzY29wZS5yZW5hbWVEaWFsb2cgPSBXaWtpLmdldFJlbmFtZURpYWxvZygkZGlhbG9nLCA8V2lraS5SZW5hbWVEaWFsb2dPcHRpb25zPntcbiAgICAgICAgICByZW5hbWU6ICgpID0+IHsgIHJldHVybiAkc2NvcGUucmVuYW1lOyB9LFxuICAgICAgICAgIGZpbGVFeGlzdHM6ICgpID0+IHsgcmV0dXJuICRzY29wZS5maWxlRXhpc3RzOyB9LFxuICAgICAgICAgIGZpbGVOYW1lOiAoKSA9PiB7IHJldHVybiAkc2NvcGUuZmlsZU5hbWU7IH0sXG4gICAgICAgICAgY2FsbGJhY2tzOiAoKSA9PiB7IHJldHVybiAkc2NvcGUucmVuYW1lQW5kQ2xvc2VEaWFsb2c7IH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgJHNjb3BlLnJlbmFtZURpYWxvZy5vcGVuKCk7XG5cbiAgICAgICAgJHRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICQoJyNyZW5hbWVGaWxlTmFtZScpLmZvY3VzKCk7XG4gICAgICAgIH0sIDUwKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGxvZy5kZWJ1ZyhcIk5vIGl0ZW1zIHNlbGVjdGVkIHJpZ2h0IG5vdyEgXCIgKyAkc2NvcGUuZ3JpZE9wdGlvbnMuc2VsZWN0ZWRJdGVtcyk7XG4gICAgICB9XG4gICAgfTtcblxuICAgICRzY29wZS5tb3ZlQW5kQ2xvc2VEaWFsb2cgPSAoKSA9PiB7XG4gICAgICB2YXIgZmlsZXMgPSAkc2NvcGUuZ3JpZE9wdGlvbnMuc2VsZWN0ZWRJdGVtcztcbiAgICAgIHZhciBmaWxlQ291bnQgPSBmaWxlcy5sZW5ndGg7XG4gICAgICB2YXIgbW92ZUZvbGRlciA9ICRzY29wZS5tb3ZlLm1vdmVGb2xkZXI7XG4gICAgICB2YXIgb2xkRm9sZGVyOnN0cmluZyA9ICRzY29wZS5wYWdlSWQ7XG4gICAgICBpZiAobW92ZUZvbGRlciAmJiBmaWxlQ291bnQgJiYgbW92ZUZvbGRlciAhPT0gb2xkRm9sZGVyKSB7XG4gICAgICAgIGxvZy5kZWJ1ZyhcIk1vdmluZyBcIiArIGZpbGVDb3VudCArIFwiIGZpbGUocykgdG8gXCIgKyBtb3ZlRm9sZGVyKTtcbiAgICAgICAgYW5ndWxhci5mb3JFYWNoKGZpbGVzLCAoZmlsZSwgaWR4KSA9PiB7XG4gICAgICAgICAgdmFyIG9sZFBhdGggPSBvbGRGb2xkZXIgKyBcIi9cIiArIGZpbGUubmFtZTtcbiAgICAgICAgICB2YXIgbmV3UGF0aCA9IG1vdmVGb2xkZXIgKyBcIi9cIiArIGZpbGUubmFtZTtcbiAgICAgICAgICBsb2cuZGVidWcoXCJBYm91dCB0byBtb3ZlIFwiICsgb2xkUGF0aCArIFwiIHRvIFwiICsgbmV3UGF0aCk7XG4gICAgICAgICAgJHNjb3BlLmdpdCA9IHdpa2lSZXBvc2l0b3J5LnJlbmFtZSgkc2NvcGUuYnJhbmNoLCBvbGRQYXRoLCBuZXdQYXRoLCBudWxsLCAocmVzdWx0KSA9PiB7XG4gICAgICAgICAgICBpZiAoaWR4ICsgMSA9PT0gZmlsZUNvdW50KSB7XG4gICAgICAgICAgICAgICRzY29wZS5ncmlkT3B0aW9ucy5zZWxlY3RlZEl0ZW1zLnNwbGljZSgwLCBmaWxlQ291bnQpO1xuICAgICAgICAgICAgICB2YXIgbWVzc2FnZSA9IENvcmUubWF5YmVQbHVyYWwoZmlsZUNvdW50LCBcImRvY3VtZW50XCIpO1xuICAgICAgICAgICAgICBDb3JlLm5vdGlmaWNhdGlvbihcInN1Y2Nlc3NcIiwgXCJNb3ZlZCBcIiArIG1lc3NhZ2UgKyBcIiB0byBcIiArIG5ld1BhdGgpO1xuICAgICAgICAgICAgICAkc2NvcGUubW92ZURpYWxvZy5jbG9zZSgpO1xuICAgICAgICAgICAgICBDb3JlLiRhcHBseSgkc2NvcGUpO1xuICAgICAgICAgICAgICB1cGRhdGVWaWV3KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgICAgJHNjb3BlLm1vdmVEaWFsb2cuY2xvc2UoKTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLmZvbGRlck5hbWVzID0gKHRleHQpID0+IHtcbiAgICAgIHJldHVybiB3aWtpUmVwb3NpdG9yeS5jb21wbGV0ZVBhdGgoJHNjb3BlLmJyYW5jaCwgdGV4dCwgdHJ1ZSwgbnVsbCk7XG4gICAgfTtcblxuICAgICRzY29wZS5vcGVuTW92ZURpYWxvZyA9ICgpID0+IHtcbiAgICAgIGlmICgkc2NvcGUuZ3JpZE9wdGlvbnMuc2VsZWN0ZWRJdGVtcy5sZW5ndGgpIHtcbiAgICAgICAgJHNjb3BlLm1vdmUubW92ZUZvbGRlciA9ICRzY29wZS5wYWdlSWQ7XG5cbiAgICAgICAgJHNjb3BlLm1vdmVEaWFsb2cgPSBXaWtpLmdldE1vdmVEaWFsb2coJGRpYWxvZywgPFdpa2kuTW92ZURpYWxvZ09wdGlvbnM+e1xuICAgICAgICAgIG1vdmU6ICgpID0+IHsgIHJldHVybiAkc2NvcGUubW92ZTsgfSxcbiAgICAgICAgICBmb2xkZXJOYW1lczogKCkgPT4geyByZXR1cm4gJHNjb3BlLmZvbGRlck5hbWVzOyB9LFxuICAgICAgICAgIGNhbGxiYWNrczogKCkgPT4geyByZXR1cm4gJHNjb3BlLm1vdmVBbmRDbG9zZURpYWxvZzsgfVxuICAgICAgICB9KTtcblxuICAgICAgICAkc2NvcGUubW92ZURpYWxvZy5vcGVuKCk7XG5cbiAgICAgICAgJHRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICQoJyNtb3ZlRm9sZGVyJykuZm9jdXMoKTtcbiAgICAgICAgfSwgNTApO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbG9nLmRlYnVnKFwiTm8gaXRlbXMgc2VsZWN0ZWQgcmlnaHQgbm93ISBcIiArICRzY29wZS5ncmlkT3B0aW9ucy5zZWxlY3RlZEl0ZW1zKTtcbiAgICAgIH1cbiAgICB9O1xuXG5cbiAgICBzZXRUaW1lb3V0KG1heWJlVXBkYXRlVmlldywgNTApO1xuXG4gICAgZnVuY3Rpb24gaXNEaWZmVmlldygpIHtcbiAgICAgIHJldHVybiAkcm91dGVQYXJhbXNbXCJkaWZmT2JqZWN0SWQxXCJdIHx8ICRyb3V0ZVBhcmFtc1tcImRpZmZPYmplY3RJZDJcIl0gPyB0cnVlIDogZmFsc2VcbiAgICB9XG5cbiAgICBmdW5jdGlvbiB1cGRhdGVWaWV3KCkge1xuICAgICAgICAvLyBUT0RPIHJlbW92ZSFcbiAgICAgICAgdmFyIGpvbG9raWEgPSBudWxsO1xuXG5cbiAgICAgIGlmIChpc0RpZmZWaWV3KCkpIHtcbiAgICAgICAgdmFyIGJhc2VPYmplY3RJZCA9ICRyb3V0ZVBhcmFtc1tcImRpZmZPYmplY3RJZDJcIl07XG4gICAgICAgICRzY29wZS5naXQgPSB3aWtpUmVwb3NpdG9yeS5kaWZmKCRzY29wZS5vYmplY3RJZCwgYmFzZU9iamVjdElkLCAkc2NvcGUucGFnZUlkLCBvbkZpbGVEZXRhaWxzKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgICRzY29wZS5naXQgPSB3aWtpUmVwb3NpdG9yeS5nZXRQYWdlKCRzY29wZS5icmFuY2gsICRzY29wZS5wYWdlSWQsICRzY29wZS5vYmplY3RJZCwgb25GaWxlRGV0YWlscyk7XG4gICAgICB9XG4gICAgICBXaWtpLmxvYWRCcmFuY2hlcyhqb2xva2lhLCB3aWtpUmVwb3NpdG9yeSwgJHNjb3BlLCBpc0ZtYyk7XG4gICAgfVxuXG4gICAgJHNjb3BlLnVwZGF0ZVZpZXcgPSB1cGRhdGVWaWV3O1xuXG4gICAgZnVuY3Rpb24gdmlld0NvbnRlbnRzKHBhZ2VOYW1lLCBjb250ZW50cykge1xuICAgICAgJHNjb3BlLnNvdXJjZVZpZXcgPSBudWxsO1xuXG4gICAgICB2YXIgZm9ybWF0OnN0cmluZyA9IG51bGw7XG4gICAgICBpZiAoaXNEaWZmVmlldygpKSB7XG4gICAgICAgIGZvcm1hdCA9IFwiZGlmZlwiO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZm9ybWF0ID0gV2lraS5maWxlRm9ybWF0KHBhZ2VOYW1lLCBmaWxlRXh0ZW5zaW9uVHlwZVJlZ2lzdHJ5KSB8fCAkc2NvcGUuZm9ybWF0O1xuICAgICAgfVxuICAgICAgbG9nLmRlYnVnKFwiRmlsZSBmb3JtYXQ6IFwiLCBmb3JtYXQpO1xuICAgICAgc3dpdGNoIChmb3JtYXQpIHtcbiAgICAgICAgY2FzZSBcImltYWdlXCI6XG4gICAgICAgICAgdmFyIGltYWdlVVJMID0gJ2dpdC8nICsgJHNjb3BlLmJyYW5jaDtcbiAgICAgICAgICBsb2cuZGVidWcoXCIkc2NvcGU6IFwiLCAkc2NvcGUpO1xuICAgICAgICAgIGltYWdlVVJMID0gVXJsSGVscGVycy5qb2luKGltYWdlVVJMLCAkc2NvcGUucGFnZUlkKTtcbiAgICAgICAgICB2YXIgaW50ZXJwb2xhdGVGdW5jID0gJGludGVycG9sYXRlKCR0ZW1wbGF0ZUNhY2hlLmdldChcImltYWdlVGVtcGxhdGUuaHRtbFwiKSk7XG4gICAgICAgICAgJHNjb3BlLmh0bWwgPSBpbnRlcnBvbGF0ZUZ1bmMoe1xuICAgICAgICAgICAgaW1hZ2VVUkw6IGltYWdlVVJMXG4gICAgICAgICAgfSk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgXCJtYXJrZG93blwiOlxuICAgICAgICAgICRzY29wZS5odG1sID0gY29udGVudHMgPyBtYXJrZWQoY29udGVudHMpIDogXCJcIjtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSBcImphdmFzY3JpcHRcIjpcbiAgICAgICAgICB2YXIgZm9ybSA9IG51bGw7XG4gICAgICAgICAgZm9ybSA9ICRsb2NhdGlvbi5zZWFyY2goKVtcImZvcm1cIl07XG4gICAgICAgICAgJHNjb3BlLnNvdXJjZSA9IGNvbnRlbnRzO1xuICAgICAgICAgICRzY29wZS5mb3JtID0gZm9ybTtcbiAgICAgICAgICBpZiAoZm9ybSkge1xuICAgICAgICAgICAgLy8gbm93IGxldHMgdHJ5IGxvYWQgdGhlIGZvcm0gSlNPTiBzbyB3ZSBjYW4gdGhlbiByZW5kZXIgdGhlIGZvcm1cbiAgICAgICAgICAgICRzY29wZS5zb3VyY2VWaWV3ID0gbnVsbDtcbiAgICAgICAgICAgICRzY29wZS5naXQgPSB3aWtpUmVwb3NpdG9yeS5nZXRQYWdlKCRzY29wZS5icmFuY2gsIGZvcm0sICRzY29wZS5vYmplY3RJZCwgKGRldGFpbHMpID0+IHtcbiAgICAgICAgICAgICAgb25Gb3JtU2NoZW1hKFdpa2kucGFyc2VKc29uKGRldGFpbHMudGV4dCkpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICRzY29wZS5zb3VyY2VWaWV3ID0gXCJwbHVnaW5zL3dpa2kvaHRtbC9zb3VyY2VWaWV3Lmh0bWxcIjtcbiAgICAgICAgICB9XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgJHNjb3BlLmh0bWwgPSBudWxsO1xuICAgICAgICAgICRzY29wZS5zb3VyY2UgPSBjb250ZW50cztcbiAgICAgICAgICAkc2NvcGUuc291cmNlVmlldyA9IFwicGx1Z2lucy93aWtpL2h0bWwvc291cmNlVmlldy5odG1sXCI7XG4gICAgICB9XG4gICAgICBDb3JlLiRhcHBseSgkc2NvcGUpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIG9uRm9ybVNjaGVtYShqc29uKSB7XG4gICAgICAkc2NvcGUuZm9ybURlZmluaXRpb24gPSBqc29uO1xuICAgICAgaWYgKCRzY29wZS5zb3VyY2UpIHtcbiAgICAgICAgJHNjb3BlLmZvcm1FbnRpdHkgPSBXaWtpLnBhcnNlSnNvbigkc2NvcGUuc291cmNlKTtcbiAgICAgIH1cbiAgICAgICRzY29wZS5zb3VyY2VWaWV3ID0gXCJwbHVnaW5zL3dpa2kvaHRtbC9mb3JtVmlldy5odG1sXCI7XG4gICAgICBDb3JlLiRhcHBseSgkc2NvcGUpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIG9uRmlsZURldGFpbHMoZGV0YWlscykge1xuICAgICAgdmFyIGNvbnRlbnRzID0gZGV0YWlscy50ZXh0O1xuICAgICAgJHNjb3BlLmRpcmVjdG9yeSA9IGRldGFpbHMuZGlyZWN0b3J5O1xuICAgICAgJHNjb3BlLmZpbGVEZXRhaWxzID0gZGV0YWlscztcblxuICAgICAgaWYgKGRldGFpbHMgJiYgZGV0YWlscy5mb3JtYXQpIHtcbiAgICAgICAgJHNjb3BlLmZvcm1hdCA9IGRldGFpbHMuZm9ybWF0O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgJHNjb3BlLmZvcm1hdCA9IFdpa2kuZmlsZUZvcm1hdCgkc2NvcGUucGFnZUlkLCBmaWxlRXh0ZW5zaW9uVHlwZVJlZ2lzdHJ5KTtcbiAgICAgIH1cbiAgICAgICRzY29wZS5jb2RlTWlycm9yT3B0aW9ucy5tb2RlLm5hbWUgPSAkc2NvcGUuZm9ybWF0O1xuICAgICAgJHNjb3BlLmNoaWxkcmVuID0gbnVsbDtcblxuICAgICAgaWYgKGRldGFpbHMuZGlyZWN0b3J5KSB7XG4gICAgICAgIHZhciBkaXJlY3RvcmllcyA9IGRldGFpbHMuY2hpbGRyZW4uZmlsdGVyKChkaXIpID0+IHtcbiAgICAgICAgICByZXR1cm4gZGlyLmRpcmVjdG9yeTtcbiAgICAgICAgfSk7XG4gICAgICAgIHZhciBwcm9maWxlcyA9IGRldGFpbHMuY2hpbGRyZW4uZmlsdGVyKChkaXIpID0+IHtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH0pO1xuICAgICAgICB2YXIgZmlsZXMgPSBkZXRhaWxzLmNoaWxkcmVuLmZpbHRlcigoZmlsZSkgPT4ge1xuICAgICAgICAgIHJldHVybiAhZmlsZS5kaXJlY3Rvcnk7XG4gICAgICAgIH0pO1xuICAgICAgICBkaXJlY3RvcmllcyA9IGRpcmVjdG9yaWVzLnNvcnRCeSgoZGlyKSA9PiB7XG4gICAgICAgICAgcmV0dXJuIGRpci5uYW1lO1xuICAgICAgICB9KTtcbiAgICAgICAgcHJvZmlsZXMgPSBwcm9maWxlcy5zb3J0QnkoKGRpcikgPT4ge1xuICAgICAgICAgIHJldHVybiBkaXIubmFtZTtcbiAgICAgICAgfSk7XG4gICAgICAgIGZpbGVzID0gZmlsZXMuc29ydEJ5KChmaWxlKSA9PiB7XG4gICAgICAgICAgcmV0dXJuIGZpbGUubmFtZTtcbiAgICAgICAgfSlcbiAgICAgICAgICAuc29ydEJ5KChmaWxlKSA9PiB7XG4gICAgICAgICAgICByZXR1cm4gZmlsZS5uYW1lLnNwbGl0KCcuJykubGFzdCgpO1xuICAgICAgICAgIH0pO1xuICAgICAgICAvLyBBbHNvIGVucmljaCB0aGUgcmVzcG9uc2Ugd2l0aCB0aGUgY3VycmVudCBicmFuY2gsIGFzIHRoYXQncyBwYXJ0IG9mIHRoZSBjb29yZGluYXRlIGZvciBsb2NhdGluZyB0aGUgYWN0dWFsIGZpbGUgaW4gZ2l0XG4gICAgICAgICRzY29wZS5jaGlsZHJlbiA9ICg8YW55PkFycmF5KS5jcmVhdGUoZGlyZWN0b3JpZXMsIHByb2ZpbGVzLCBmaWxlcykubWFwKChmaWxlKSA9PiB7XG4gICAgICAgICAgZmlsZS5icmFuY2ggPSAkc2NvcGUuYnJhbmNoO1xuICAgICAgICAgIGZpbGUuZmlsZU5hbWUgPSBmaWxlLm5hbWU7XG4gICAgICAgICAgaWYgKGZpbGUuZGlyZWN0b3J5KSB7XG4gICAgICAgICAgICBmaWxlLmZpbGVOYW1lICs9IFwiLnppcFwiO1xuICAgICAgICAgIH1cbiAgICAgICAgICBmaWxlLmRvd25sb2FkVVJMID0gV2lraS5naXRSZXN0VVJMKCRzY29wZSwgZmlsZS5wYXRoKTtcbiAgICAgICAgICByZXR1cm4gZmlsZTtcbiAgICAgICAgfSk7XG4gICAgICB9XG5cblxuICAgICAgJHNjb3BlLmh0bWwgPSBudWxsO1xuICAgICAgJHNjb3BlLnNvdXJjZSA9IG51bGw7XG4gICAgICAkc2NvcGUucmVhZE1lUGF0aCA9IG51bGw7XG5cbiAgICAgICRzY29wZS5pc0ZpbGUgPSBmYWxzZTtcbiAgICAgIGlmICgkc2NvcGUuY2hpbGRyZW4pIHtcbiAgICAgICAgJHNjb3BlLiRicm9hZGNhc3QoJ3BhbmUub3BlbicpO1xuICAgICAgICAvLyBpZiB3ZSBoYXZlIGEgcmVhZG1lIHRoZW4gbGV0cyByZW5kZXIgaXQuLi5cbiAgICAgICAgdmFyIGl0ZW0gPSAkc2NvcGUuY2hpbGRyZW4uZmluZCgoaW5mbykgPT4ge1xuICAgICAgICAgIHZhciBuYW1lID0gKGluZm8ubmFtZSB8fCBcIlwiKS50b0xvd2VyQ2FzZSgpO1xuICAgICAgICAgIHZhciBleHQgPSBmaWxlRXh0ZW5zaW9uKG5hbWUpO1xuICAgICAgICAgIHJldHVybiBuYW1lICYmIGV4dCAmJiAoKG5hbWUuc3RhcnRzV2l0aChcInJlYWRtZS5cIikgfHwgbmFtZSA9PT0gXCJyZWFkbWVcIikgfHwgKG5hbWUuc3RhcnRzV2l0aChcImluZGV4LlwiKSB8fCBuYW1lID09PSBcImluZGV4XCIpKTtcbiAgICAgICAgfSk7XG4gICAgICAgIGlmIChpdGVtKSB7XG4gICAgICAgICAgdmFyIHBhZ2VOYW1lID0gaXRlbS5wYXRoO1xuICAgICAgICAgICRzY29wZS5yZWFkTWVQYXRoID0gcGFnZU5hbWU7XG4gICAgICAgICAgd2lraVJlcG9zaXRvcnkuZ2V0UGFnZSgkc2NvcGUuYnJhbmNoLCBwYWdlTmFtZSwgJHNjb3BlLm9iamVjdElkLCAocmVhZG1lRGV0YWlscykgPT4ge1xuICAgICAgICAgICAgdmlld0NvbnRlbnRzKHBhZ2VOYW1lLCByZWFkbWVEZXRhaWxzLnRleHQpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIHZhciBrdWJlcm5ldGVzSnNvbiA9ICRzY29wZS5jaGlsZHJlbi5maW5kKChjaGlsZCkgPT4ge1xuICAgICAgICAgIHZhciBuYW1lID0gKGNoaWxkLm5hbWUgfHwgXCJcIikudG9Mb3dlckNhc2UoKTtcbiAgICAgICAgICB2YXIgZXh0ID0gZmlsZUV4dGVuc2lvbihuYW1lKTtcbiAgICAgICAgICByZXR1cm4gbmFtZSAmJiBleHQgJiYgbmFtZS5zdGFydHNXaXRoKFwia3ViZXJuZXRlc1wiKSAmJiBleHQgPT09IFwianNvblwiO1xuICAgICAgICB9KTtcbiAgICAgICAgaWYgKGt1YmVybmV0ZXNKc29uKSB7XG4gICAgICAgICAgd2lraVJlcG9zaXRvcnkuZ2V0UGFnZSgkc2NvcGUuYnJhbmNoLCBrdWJlcm5ldGVzSnNvbi5wYXRoLCB1bmRlZmluZWQsIChqc29uKSA9PiB7XG4gICAgICAgICAgICBpZiAoanNvbiAmJiBqc29uLnRleHQpIHtcbiAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAkc2NvcGUua3ViZXJuZXRlc0pzb24gPSBhbmd1bGFyLmZyb21Kc29uKGpzb24udGV4dCk7XG4gICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICAkc2NvcGUua3ViZXJuZXRlc0pzb24gPSB7XG4gICAgICAgICAgICAgICAgICBlcnJvclBhcnNpbmc6IHRydWUsXG4gICAgICAgICAgICAgICAgICBlcnJvcjogZVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgJHNjb3BlLnNob3dBcHBIZWFkZXIgPSB0cnVlO1xuICAgICAgICAgICAgICBDb3JlLiRhcHBseSgkc2NvcGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgICRzY29wZS4kYnJvYWRjYXN0KCdXaWtpLlZpZXdQYWdlLkNoaWxkcmVuJywgJHNjb3BlLnBhZ2VJZCwgJHNjb3BlLmNoaWxkcmVuKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgICRzY29wZS4kYnJvYWRjYXN0KCdwYW5lLmNsb3NlJyk7XG4gICAgICAgIHZhciBwYWdlTmFtZSA9ICRzY29wZS5wYWdlSWQ7XG4gICAgICAgIHZpZXdDb250ZW50cyhwYWdlTmFtZSwgY29udGVudHMpO1xuICAgICAgICAkc2NvcGUuaXNGaWxlID0gdHJ1ZTtcbiAgICAgIH1cbiAgICAgIENvcmUuJGFwcGx5KCRzY29wZSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY2hlY2tGaWxlRXhpc3RzKHBhdGgpIHtcbiAgICAgICRzY29wZS5vcGVyYXRpb25Db3VudGVyICs9IDE7XG4gICAgICB2YXIgY291bnRlciA9ICRzY29wZS5vcGVyYXRpb25Db3VudGVyO1xuICAgICAgaWYgKHBhdGgpIHtcbiAgICAgICAgd2lraVJlcG9zaXRvcnkuZXhpc3RzKCRzY29wZS5icmFuY2gsIHBhdGgsIChyZXN1bHQpID0+IHtcbiAgICAgICAgICAvLyBmaWx0ZXIgb2xkIHJlc3VsdHNcbiAgICAgICAgICBpZiAoJHNjb3BlLm9wZXJhdGlvbkNvdW50ZXIgPT09IGNvdW50ZXIpIHtcbiAgICAgICAgICAgIGxvZy5kZWJ1ZyhcImNoZWNrRmlsZUV4aXN0cyBmb3IgcGF0aCBcIiArIHBhdGggKyBcIiBnb3QgcmVzdWx0IFwiICsgcmVzdWx0KTtcbiAgICAgICAgICAgICRzY29wZS5maWxlRXhpc3RzLmV4aXN0cyA9IHJlc3VsdCA/IHRydWUgOiBmYWxzZTtcbiAgICAgICAgICAgICRzY29wZS5maWxlRXhpc3RzLm5hbWUgPSByZXN1bHQgPyByZXN1bHQubmFtZSA6IG51bGw7XG4gICAgICAgICAgICBDb3JlLiRhcHBseSgkc2NvcGUpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBsb2cuZGVidWcoXCJJZ25vcmluZyBvbGQgcmVzdWx0cyBmb3IgXCIgKyBwYXRoKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIENhbGxlZCBieSBoYXd0aW8gVE9DIGRpcmVjdGl2ZS4uLlxuICAgICRzY29wZS5nZXRDb250ZW50cyA9IChmaWxlbmFtZSwgY2IpID0+IHtcbiAgICAgIHZhciBwYWdlSWQgPSBmaWxlbmFtZTtcbiAgICAgIGlmICgkc2NvcGUuZGlyZWN0b3J5KSB7XG4gICAgICAgIHBhZ2VJZCA9ICRzY29wZS5wYWdlSWQgKyAnLycgKyBmaWxlbmFtZTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciBwYXRoUGFydHMgPSAkc2NvcGUucGFnZUlkLnNwbGl0KCcvJyk7XG4gICAgICAgIHBhdGhQYXJ0cyA9IHBhdGhQYXJ0cy5yZW1vdmUocGF0aFBhcnRzLmxhc3QoKSk7XG4gICAgICAgIHBhdGhQYXJ0cy5wdXNoKGZpbGVuYW1lKTtcbiAgICAgICAgcGFnZUlkID0gcGF0aFBhcnRzLmpvaW4oJy8nKTtcbiAgICAgIH1cbiAgICAgIGxvZy5kZWJ1ZyhcInBhZ2VJZDogXCIsICRzY29wZS5wYWdlSWQpO1xuICAgICAgbG9nLmRlYnVnKFwiYnJhbmNoOiBcIiwgJHNjb3BlLmJyYW5jaCk7XG4gICAgICBsb2cuZGVidWcoXCJmaWxlbmFtZTogXCIsIGZpbGVuYW1lKTtcbiAgICAgIGxvZy5kZWJ1ZyhcInVzaW5nIHBhZ2VJZDogXCIsIHBhZ2VJZCk7XG4gICAgICB3aWtpUmVwb3NpdG9yeS5nZXRQYWdlKCRzY29wZS5icmFuY2gsIHBhZ2VJZCwgdW5kZWZpbmVkLCAoZGF0YSkgPT4ge1xuICAgICAgICBjYihkYXRhLnRleHQpO1xuICAgICAgfSk7XG4gICAgfTtcblxuXG4gICAgZnVuY3Rpb24gZ2V0UmVuYW1lRmlsZVBhdGgoKSB7XG4gICAgICB2YXIgbmV3RmlsZU5hbWUgPSAkc2NvcGUucmVuYW1lLm5ld0ZpbGVOYW1lO1xuICAgICAgcmV0dXJuICgkc2NvcGUucGFnZUlkICYmIG5ld0ZpbGVOYW1lKSA/IFVybEhlbHBlcnMuam9pbigkc2NvcGUucGFnZUlkLCBuZXdGaWxlTmFtZSkgOiBudWxsO1xuICAgIH1cbiAgfV0pO1xufVxuIiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL2luY2x1ZGVzLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIndpa2lIZWxwZXJzLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIndpa2lQbHVnaW4udHNcIi8+XG5cbm1vZHVsZSBXaWtpIHtcblxuICBleHBvcnQgaW50ZXJmYWNlIFdpa2lEaWFsb2cge1xuICAgIG9wZW46ICgpID0+IHt9O1xuICAgIGNsb3NlOiAoKSA9PiB7fTtcbiAgfVxuXG4gIGV4cG9ydCBpbnRlcmZhY2UgUmVuYW1lRGlhbG9nT3B0aW9ucyB7XG4gICAgcmVuYW1lOiAoKSA9PiB7fTtcbiAgICBmaWxlRXhpc3RzOiAoKSA9PiB7fTtcbiAgICBmaWxlTmFtZTogKCkgPT4gU3RyaW5nO1xuICAgIGNhbGxiYWNrczogKCkgPT4gU3RyaW5nO1xuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIGdldFJlbmFtZURpYWxvZygkZGlhbG9nLCAkc2NvcGU6UmVuYW1lRGlhbG9nT3B0aW9ucyk6V2lraS5XaWtpRGlhbG9nIHtcbiAgICByZXR1cm4gJGRpYWxvZy5kaWFsb2coe1xuICAgICAgcmVzb2x2ZTogJHNjb3BlLFxuICAgICAgdGVtcGxhdGVVcmw6ICdwbHVnaW5zL3dpa2kvaHRtbC9tb2RhbC9yZW5hbWVEaWFsb2cuaHRtbCcsXG4gICAgICBjb250cm9sbGVyOiBbXCIkc2NvcGVcIiwgXCJkaWFsb2dcIiwgIFwiY2FsbGJhY2tzXCIsIFwicmVuYW1lXCIsIFwiZmlsZUV4aXN0c1wiLCBcImZpbGVOYW1lXCIsICgkc2NvcGUsIGRpYWxvZywgY2FsbGJhY2tzLCByZW5hbWUsIGZpbGVFeGlzdHMsIGZpbGVOYW1lKSA9PiB7XG4gICAgICAgICRzY29wZS5yZW5hbWUgID0gcmVuYW1lO1xuICAgICAgICAkc2NvcGUuZmlsZUV4aXN0cyAgPSBmaWxlRXhpc3RzO1xuICAgICAgICAkc2NvcGUuZmlsZU5hbWUgID0gZmlsZU5hbWU7XG5cbiAgICAgICAgJHNjb3BlLmNsb3NlID0gKHJlc3VsdCkgPT4ge1xuICAgICAgICAgIGRpYWxvZy5jbG9zZSgpO1xuICAgICAgICB9O1xuXG4gICAgICAgICRzY29wZS5yZW5hbWVBbmRDbG9zZURpYWxvZyA9IGNhbGxiYWNrcztcblxuICAgICAgfV1cbiAgICB9KTtcbiAgfVxuXG4gIGV4cG9ydCBpbnRlcmZhY2UgTW92ZURpYWxvZ09wdGlvbnMge1xuICAgIG1vdmU6ICgpID0+IHt9O1xuICAgIGZvbGRlck5hbWVzOiAoKSA9PiB7fTtcbiAgICBjYWxsYmFja3M6ICgpID0+IFN0cmluZztcbiAgfVxuXG5cbiAgZXhwb3J0IGZ1bmN0aW9uIGdldE1vdmVEaWFsb2coJGRpYWxvZywgJHNjb3BlOk1vdmVEaWFsb2dPcHRpb25zKTpXaWtpLldpa2lEaWFsb2cge1xuICAgIHJldHVybiAkZGlhbG9nLmRpYWxvZyh7XG4gICAgICByZXNvbHZlOiAkc2NvcGUsXG4gICAgICB0ZW1wbGF0ZVVybDogJ3BsdWdpbnMvd2lraS9odG1sL21vZGFsL21vdmVEaWFsb2cuaHRtbCcsXG4gICAgICBjb250cm9sbGVyOiBbXCIkc2NvcGVcIiwgXCJkaWFsb2dcIiwgIFwiY2FsbGJhY2tzXCIsIFwibW92ZVwiLCBcImZvbGRlck5hbWVzXCIsICgkc2NvcGUsIGRpYWxvZywgY2FsbGJhY2tzLCBtb3ZlLCBmb2xkZXJOYW1lcykgPT4ge1xuICAgICAgICAkc2NvcGUubW92ZSAgPSBtb3ZlO1xuICAgICAgICAkc2NvcGUuZm9sZGVyTmFtZXMgID0gZm9sZGVyTmFtZXM7XG5cbiAgICAgICAgJHNjb3BlLmNsb3NlID0gKHJlc3VsdCkgPT4ge1xuICAgICAgICAgIGRpYWxvZy5jbG9zZSgpO1xuICAgICAgICB9O1xuXG4gICAgICAgICRzY29wZS5tb3ZlQW5kQ2xvc2VEaWFsb2cgPSBjYWxsYmFja3M7XG5cbiAgICAgIH1dXG4gICAgfSk7XG4gIH1cblxuXG4gIGV4cG9ydCBpbnRlcmZhY2UgRGVsZXRlRGlhbG9nT3B0aW9ucyB7XG4gICAgY2FsbGJhY2tzOiAoKSA9PiBTdHJpbmc7XG4gICAgc2VsZWN0ZWRGaWxlSHRtbDogKCkgPT4gU3RyaW5nO1xuICAgIHdhcm5pbmc6ICgpID0+IHN0cmluZztcbiAgfVxuXG5cbiAgZXhwb3J0IGZ1bmN0aW9uIGdldERlbGV0ZURpYWxvZygkZGlhbG9nLCAkc2NvcGU6RGVsZXRlRGlhbG9nT3B0aW9ucyk6V2lraS5XaWtpRGlhbG9nIHtcbiAgICByZXR1cm4gJGRpYWxvZy5kaWFsb2coe1xuICAgICAgcmVzb2x2ZTogJHNjb3BlLFxuICAgICAgdGVtcGxhdGVVcmw6ICdwbHVnaW5zL3dpa2kvaHRtbC9tb2RhbC9kZWxldGVEaWFsb2cuaHRtbCcsXG4gICAgICBjb250cm9sbGVyOiBbXCIkc2NvcGVcIiwgXCJkaWFsb2dcIiwgIFwiY2FsbGJhY2tzXCIsIFwic2VsZWN0ZWRGaWxlSHRtbFwiLCBcIndhcm5pbmdcIiwgKCRzY29wZSwgZGlhbG9nLCBjYWxsYmFja3MsIHNlbGVjdGVkRmlsZUh0bWwsIHdhcm5pbmcpID0+IHtcblxuICAgICAgICAkc2NvcGUuc2VsZWN0ZWRGaWxlSHRtbCA9IHNlbGVjdGVkRmlsZUh0bWw7XG5cbiAgICAgICAgJHNjb3BlLmNsb3NlID0gKHJlc3VsdCkgPT4ge1xuICAgICAgICAgIGRpYWxvZy5jbG9zZSgpO1xuICAgICAgICB9O1xuXG4gICAgICAgICRzY29wZS5kZWxldGVBbmRDbG9zZURpYWxvZyA9IGNhbGxiYWNrcztcblxuICAgICAgICAkc2NvcGUud2FybmluZyA9IHdhcm5pbmc7XG4gICAgICB9XVxuICAgIH0pO1xuICB9XG5cblxuXG5cblxufSIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9pbmNsdWRlcy50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJ3aWtpSGVscGVycy50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJ3aWtpUGx1Z2luLnRzXCIvPlxuXG5tb2R1bGUgV2lraSB7XG5cbiAgX21vZHVsZS5kaXJlY3RpdmUoJ3dpa2lIcmVmQWRqdXN0ZXInLCBbXCIkbG9jYXRpb25cIiwgKCRsb2NhdGlvbikgPT4ge1xuICAgIHJldHVybiB7XG4gICAgICByZXN0cmljdDogJ0EnLFxuICAgICAgbGluazogKCRzY29wZSwgJGVsZW1lbnQsICRhdHRyKSA9PiB7XG5cbiAgICAgICAgJGVsZW1lbnQuYmluZCgnRE9NTm9kZUluc2VydGVkJywgKGV2ZW50KSA9PiB7XG4gICAgICAgICAgdmFyIGF5cyA9ICRlbGVtZW50LmZpbmQoJ2EnKTtcbiAgICAgICAgICBhbmd1bGFyLmZvckVhY2goYXlzLCAoYSkgPT4ge1xuICAgICAgICAgICAgaWYgKGEuaGFzQXR0cmlidXRlKCduby1hZGp1c3QnKSkge1xuICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBhID0gJChhKTtcbiAgICAgICAgICAgIHZhciBocmVmID0gKGEuYXR0cignaHJlZicpIHx8IFwiXCIpLnRyaW0oKTtcbiAgICAgICAgICAgIGlmIChocmVmKSB7XG4gICAgICAgICAgICAgIHZhciBmaWxlRXh0ZW5zaW9uID0gYS5hdHRyKCdmaWxlLWV4dGVuc2lvbicpO1xuICAgICAgICAgICAgICB2YXIgbmV3VmFsdWUgPSBXaWtpLmFkanVzdEhyZWYoJHNjb3BlLCAkbG9jYXRpb24sIGhyZWYsIGZpbGVFeHRlbnNpb24pO1xuICAgICAgICAgICAgICBpZiAobmV3VmFsdWUpIHtcbiAgICAgICAgICAgICAgICBhLmF0dHIoJ2hyZWYnLCBuZXdWYWx1ZSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcbiAgICAgICAgICB2YXIgaW1ncyA9ICRlbGVtZW50LmZpbmQoJ2ltZycpO1xuICAgICAgICAgIGFuZ3VsYXIuZm9yRWFjaChpbWdzLCAoYSkgPT4ge1xuICAgICAgICAgICAgaWYgKGEuaGFzQXR0cmlidXRlKCduby1hZGp1c3QnKSkge1xuICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBhID0gJChhKTtcbiAgICAgICAgICAgIHZhciBocmVmID0gKGEuYXR0cignc3JjJykgfHwgXCJcIikudHJpbSgpO1xuICAgICAgICAgICAgaWYgKGhyZWYpIHtcbiAgICAgICAgICAgICAgaWYgKGhyZWYuc3RhcnRzV2l0aChcIi9cIikpIHtcbiAgICAgICAgICAgICAgICBocmVmID0gQ29yZS51cmwoaHJlZik7XG4gICAgICAgICAgICAgICAgYS5hdHRyKCdzcmMnLCBocmVmKTtcblxuICAgICAgICAgICAgICAgIC8vIGxldHMgYXZvaWQgdGhpcyBlbGVtZW50IGJlaW5nIHJlcHJvY2Vzc2VkXG4gICAgICAgICAgICAgICAgYS5hdHRyKCduby1hZGp1c3QnLCAndHJ1ZScpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pXG4gICAgICB9XG4gICAgfVxuICB9XSk7XG5cbiAgX21vZHVsZS5kaXJlY3RpdmUoJ3dpa2lUaXRsZUxpbmtlcicsIFtcIiRsb2NhdGlvblwiLCAoJGxvY2F0aW9uKSA9PiB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHJlc3RyaWN0OiAnQScsXG4gICAgICBsaW5rOiAoJHNjb3BlLCAkZWxlbWVudCwgJGF0dHIpID0+IHtcbiAgICAgICAgdmFyIGxvYWRlZCA9IGZhbHNlO1xuXG4gICAgICAgIGZ1bmN0aW9uIG9mZnNldFRvcChlbGVtZW50cykge1xuICAgICAgICAgIGlmIChlbGVtZW50cykge1xuICAgICAgICAgICAgdmFyIG9mZnNldCA9IGVsZW1lbnRzLm9mZnNldCgpO1xuICAgICAgICAgICAgaWYgKG9mZnNldCkge1xuICAgICAgICAgICAgICByZXR1cm4gb2Zmc2V0LnRvcDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIDA7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBzY3JvbGxUb0hhc2goKSB7XG4gICAgICAgICAgdmFyIGFuc3dlciA9IGZhbHNlO1xuICAgICAgICAgIHZhciBpZCA9ICRsb2NhdGlvbi5zZWFyY2goKVtcImhhc2hcIl07XG4gICAgICAgICAgcmV0dXJuIHNjcm9sbFRvSWQoaWQpO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gc2Nyb2xsVG9JZChpZCkge1xuICAgICAgICAgIHZhciBhbnN3ZXIgPSBmYWxzZTtcbiAgICAgICAgICB2YXIgaWQgPSAkbG9jYXRpb24uc2VhcmNoKClbXCJoYXNoXCJdO1xuICAgICAgICAgIGlmIChpZCkge1xuICAgICAgICAgICAgdmFyIHNlbGVjdG9yID0gJ2FbbmFtZT1cIicgKyBpZCArICdcIl0nO1xuICAgICAgICAgICAgdmFyIHRhcmdldEVsZW1lbnRzID0gJGVsZW1lbnQuZmluZChzZWxlY3Rvcik7XG4gICAgICAgICAgICBpZiAodGFyZ2V0RWxlbWVudHMgJiYgdGFyZ2V0RWxlbWVudHMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgIHZhciBzY3JvbGxEdXJhdGlvbiA9IDE7XG4gICAgICAgICAgICAgIHZhciBkZWx0YSA9IG9mZnNldFRvcCgkKCRlbGVtZW50KSk7XG4gICAgICAgICAgICAgIHZhciB0b3AgPSBvZmZzZXRUb3AodGFyZ2V0RWxlbWVudHMpIC0gZGVsdGE7XG4gICAgICAgICAgICAgIGlmICh0b3AgPCAwKSB7XG4gICAgICAgICAgICAgICAgdG9wID0gMDtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAvL2xvZy5pbmZvKFwic2Nyb2xsaW5nIHRvIGhhc2g6IFwiICsgaWQgKyBcIiB0b3A6IFwiICsgdG9wICsgXCIgZGVsdGE6XCIgKyBkZWx0YSk7XG4gICAgICAgICAgICAgICQoJ2JvZHksaHRtbCcpLmFuaW1hdGUoe1xuICAgICAgICAgICAgICAgIHNjcm9sbFRvcDogdG9wXG4gICAgICAgICAgICAgIH0sIHNjcm9sbER1cmF0aW9uKTtcbiAgICAgICAgICAgICAgYW5zd2VyID0gdHJ1ZTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIC8vbG9nLmluZm8oXCJjb3VsZCBmaW5kIGVsZW1lbnQgZm9yOiBcIiArIHNlbGVjdG9yKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIGFuc3dlcjtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGFkZExpbmtzKGV2ZW50KSB7XG4gICAgICAgICAgdmFyIGhlYWRpbmdzID0gJGVsZW1lbnQuZmluZCgnaDEsaDIsaDMsaDQsaDUsaDYsaDcnKTtcbiAgICAgICAgICB2YXIgdXBkYXRlZCA9IGZhbHNlO1xuICAgICAgICAgIGFuZ3VsYXIuZm9yRWFjaChoZWFkaW5ncywgKGhlKSA9PiB7XG4gICAgICAgICAgICB2YXIgaDEgPSAkKGhlKTtcbiAgICAgICAgICAgIC8vIG5vdyBsZXRzIHRyeSBmaW5kIGEgY2hpbGQgaGVhZGVyXG4gICAgICAgICAgICB2YXIgYSA9IGgxLnBhcmVudChcImFcIik7XG4gICAgICAgICAgICBpZiAoIWEgfHwgIWEubGVuZ3RoKSB7XG4gICAgICAgICAgICAgIHZhciB0ZXh0ID0gaDEudGV4dCgpO1xuICAgICAgICAgICAgICBpZiAodGV4dCkge1xuICAgICAgICAgICAgICAgIHZhciB0YXJnZXQgPSB0ZXh0LnJlcGxhY2UoLyAvZywgXCItXCIpO1xuICAgICAgICAgICAgICAgIHZhciBwYXRoV2l0aEhhc2ggPSBcIiNcIiArICRsb2NhdGlvbi5wYXRoKCkgKyBcIj9oYXNoPVwiICsgdGFyZ2V0O1xuICAgICAgICAgICAgICAgIHZhciBsaW5rID0gQ29yZS5jcmVhdGVIcmVmKCRsb2NhdGlvbiwgcGF0aFdpdGhIYXNoLCBbJ2hhc2gnXSk7XG5cbiAgICAgICAgICAgICAgICAvLyBsZXRzIHdyYXAgdGhlIGhlYWRpbmcgaW4gYSBsaW5rXG4gICAgICAgICAgICAgICAgdmFyIG5ld0EgPSAkKCc8YSBuYW1lPVwiJyArIHRhcmdldCArICdcIiBocmVmPVwiJyArIGxpbmsgKyAnXCIgbmctY2xpY2s9XCJvbkxpbmtDbGljaygpXCI+PC9hPicpO1xuICAgICAgICAgICAgICAgIG5ld0Eub24oXCJjbGlja1wiLCAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHNjcm9sbFRvSWQodGFyZ2V0KSkge1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICB9LCA1MCk7XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICBuZXdBLmluc2VydEJlZm9yZShoMSk7XG4gICAgICAgICAgICAgICAgaDEuZGV0YWNoKCk7XG4gICAgICAgICAgICAgICAgbmV3QS5hcHBlbmQoaDEpO1xuICAgICAgICAgICAgICAgIHVwZGF0ZWQgPSB0cnVlO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgaWYgKHVwZGF0ZWQgJiYgIWxvYWRlZCkge1xuICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgIGlmIChzY3JvbGxUb0hhc2goKSkge1xuICAgICAgICAgICAgICAgIGxvYWRlZCA9IHRydWU7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sIDUwKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBvbkV2ZW50SW5zZXJ0ZWQoZXZlbnQpIHtcbiAgICAgICAgICAvLyBhdm9pZCBhbnkgbW9yZSBldmVudHMgd2hpbGUgd2UgZG8gb3VyIHRoaW5nXG4gICAgICAgICAgJGVsZW1lbnQudW5iaW5kKCdET01Ob2RlSW5zZXJ0ZWQnLCBvbkV2ZW50SW5zZXJ0ZWQpO1xuICAgICAgICAgIGFkZExpbmtzKGV2ZW50KTtcbiAgICAgICAgICAkZWxlbWVudC5iaW5kKCdET01Ob2RlSW5zZXJ0ZWQnLCBvbkV2ZW50SW5zZXJ0ZWQpO1xuICAgICAgICB9XG5cbiAgICAgICAgJGVsZW1lbnQuYmluZCgnRE9NTm9kZUluc2VydGVkJywgb25FdmVudEluc2VydGVkKTtcbiAgICAgIH1cbiAgICB9O1xuICB9XSk7XG5cbn1cbiIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9pbmNsdWRlcy50c1wiLz5cblxuXG4vKipcbiAqIEBtb2R1bGUgV2lraVxuICovXG5tb2R1bGUgV2lraSB7XG5cbiAgRGV2ZWxvcGVyLmN1c3RvbVByb2plY3RTdWJUYWJGYWN0b3JpZXMucHVzaChcbiAgICAoY29udGV4dCkgPT4ge1xuICAgICAgdmFyIHByb2plY3RMaW5rID0gY29udGV4dC5wcm9qZWN0TGluaztcbiAgICAgIHZhciB3aWtpTGluayA9IG51bGw7XG4gICAgICBpZiAocHJvamVjdExpbmspIHtcbiAgICAgICAgd2lraUxpbmsgPSBVcmxIZWxwZXJzLmpvaW4ocHJvamVjdExpbmssIFwid2lraVwiLCBcInZpZXdcIik7XG4gICAgICB9XG4gICAgICByZXR1cm4ge1xuICAgICAgICBpc1ZhbGlkOiAoKSA9PiB3aWtpTGluayAmJiBEZXZlbG9wZXIuZm9yZ2VSZWFkeUxpbmsoKSxcbiAgICAgICAgaHJlZjogd2lraUxpbmssXG4gICAgICAgIGxhYmVsOiBcIlNvdXJjZVwiLFxuICAgICAgICB0aXRsZTogXCJCcm93c2UgdGhlIHNvdXJjZSBjb2RlIG9mIHRoaXMgcHJvamVjdFwiXG4gICAgICB9O1xuICAgIH0pO1xuXG5cbiAgZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVNvdXJjZUJyZWFkY3J1bWJzKCRzY29wZSkge1xuICAgIHZhciBzb3VyY2VMaW5rID0gJHNjb3BlLiR2aWV3TGluayB8fCBVcmxIZWxwZXJzLmpvaW4oc3RhcnRMaW5rKCRzY29wZSksIFwidmlld1wiKTtcbiAgICByZXR1cm4gW1xuICAgICAge1xuICAgICAgICBsYWJlbDogXCJTb3VyY2VcIixcbiAgICAgICAgaHJlZjogc291cmNlTGluayxcbiAgICAgICAgdGl0bGU6IFwiQnJvd3NlIHRoZSBzb3VyY2UgY29kZSBvZiB0aGlzIHByb2plY3RcIlxuICAgICAgfVxuICAgIF1cbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiBjcmVhdGVFZGl0aW5nQnJlYWRjcnVtYigkc2NvcGUpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGxhYmVsOiBcIkVkaXRpbmdcIixcbiAgICAgICAgdGl0bGU6IFwiRWRpdGluZyB0aGlzIGZpbGVcIlxuICAgICAgfTtcbiAgfVxufVxuIiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL2luY2x1ZGVzLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIndpa2lIZWxwZXJzLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIndpa2lQbHVnaW4udHNcIi8+XG5cbi8qKlxuICogQG1vZHVsZSBXaWtpXG4gKi9cbm1vZHVsZSBXaWtpIHtcblxuICAvKipcbiAgICogQGNsYXNzIEdpdFdpa2lSZXBvc2l0b3J5XG4gICAqL1xuICBleHBvcnQgY2xhc3MgR2l0V2lraVJlcG9zaXRvcnkge1xuICAgIHB1YmxpYyBkaXJlY3RvcnlQcmVmaXggPSBcIlwiO1xuICAgIHByaXZhdGUgJGh0dHA7XG4gICAgcHJpdmF0ZSBjb25maWc7XG4gICAgcHJpdmF0ZSBiYXNlVXJsO1xuICAgIHByaXZhdGUgcHJvamVjdElkO1xuXG5cbiAgICBjb25zdHJ1Y3Rvcigkc2NvcGUpIHtcbiAgICAgIHZhciBGb3JnZUFwaVVSTCA9IEt1YmVybmV0ZXMuaW5qZWN0KFwiRm9yZ2VBcGlVUkxcIik7XG4gICAgICB0aGlzLiRodHRwID0gS3ViZXJuZXRlcy5pbmplY3QoXCIkaHR0cFwiKTtcbiAgICAgIHRoaXMuY29uZmlnID0gRm9yZ2UuY3JlYXRlSHR0cENvbmZpZygpO1xuICAgICAgdmFyIG93bmVyID0gJHNjb3BlLm93bmVyO1xuICAgICAgdmFyIHJlcG9OYW1lID0gJHNjb3BlLnJlcG9JZDtcbiAgICAgIHZhciBwcm9qZWN0SWQgPSAkc2NvcGUucHJvamVjdElkO1xuICAgICAgdGhpcy5wcm9qZWN0SWQgPSBwcm9qZWN0SWQ7XG4gICAgICB2YXIgbnMgPSAkc2NvcGUubmFtZXNwYWNlIHx8IEt1YmVybmV0ZXMuY3VycmVudEt1YmVybmV0ZXNOYW1lc3BhY2UoKTtcbiAgICAgIHRoaXMuYmFzZVVybCA9IFVybEhlbHBlcnMuam9pbihGb3JnZUFwaVVSTCwgXCJyZXBvcy9wcm9qZWN0XCIsIG5zLCBwcm9qZWN0SWQpO1xuICAgIH1cblxuICAgIHB1YmxpYyBnZXRQYWdlKGJyYW5jaDpzdHJpbmcsIHBhdGg6c3RyaW5nLCBvYmplY3RJZDpzdHJpbmcsIGZuKSB7XG4gICAgICAvLyBUT0RPIGlnbm9yaW5nIG9iamVjdElkXG4gICAgICB2YXIgcXVlcnkgPSBudWxsO1xuICAgICAgaWYgKGJyYW5jaCkge1xuICAgICAgICBxdWVyeSA9IFwicmVmPVwiICsgYnJhbmNoO1xuICAgICAgfVxuICAgICAgdGhpcy5kb0dldChVcmxIZWxwZXJzLmpvaW4oXCJjb250ZW50XCIsIHBhdGggfHwgXCIvXCIpLCBxdWVyeSxcbiAgICAgICAgKGRhdGEsIHN0YXR1cywgaGVhZGVycywgY29uZmlnKSA9PiB7XG4gICAgICAgICAgaWYgKGRhdGEpIHtcbiAgICAgICAgICAgIHZhciBkZXRhaWxzOiBhbnkgPSBudWxsO1xuICAgICAgICAgICAgaWYgKGFuZ3VsYXIuaXNBcnJheShkYXRhKSkge1xuICAgICAgICAgICAgICBhbmd1bGFyLmZvckVhY2goZGF0YSwgKGZpbGUpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoIWZpbGUuZGlyZWN0b3J5ICYmIGZpbGUudHlwZSA9PT0gXCJkaXJcIikge1xuICAgICAgICAgICAgICAgICAgZmlsZS5kaXJlY3RvcnkgPSB0cnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgIGRldGFpbHMgPSB7XG4gICAgICAgICAgICAgICAgZGlyZWN0b3J5OiB0cnVlLFxuICAgICAgICAgICAgICAgIGNoaWxkcmVuOiBkYXRhXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGRldGFpbHMgPSBkYXRhO1xuICAgICAgICAgICAgICB2YXIgY29udGVudCA9IGRhdGEuY29udGVudDtcbiAgICAgICAgICAgICAgaWYgKGNvbnRlbnQpIHtcbiAgICAgICAgICAgICAgICBkZXRhaWxzLnRleHQgPSBjb250ZW50LmRlY29kZUJhc2U2NCgpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBmbihkZXRhaWxzKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHB1YmxpYyBwdXRQYWdlKGJyYW5jaDpzdHJpbmcsIHBhdGg6c3RyaW5nLCBjb250ZW50czpzdHJpbmcsIGNvbW1pdE1lc3NhZ2U6c3RyaW5nLCBmbikge1xuICAgICAgdmFyIHF1ZXJ5ID0gbnVsbDtcbiAgICAgIGlmIChicmFuY2gpIHtcbiAgICAgICAgcXVlcnkgPSBcInJlZj1cIiArIGJyYW5jaDtcbiAgICAgIH1cbiAgICAgIGlmIChjb21taXRNZXNzYWdlKSB7XG4gICAgICAgIHF1ZXJ5ID0gKHF1ZXJ5ID8gcXVlcnkgKyBcIiZcIiA6IFwiXCIpICsgXCJtZXNzYWdlPVwiICsgZW5jb2RlVVJJQ29tcG9uZW50KGNvbW1pdE1lc3NhZ2UpO1xuICAgICAgfVxuICAgICAgdmFyIGJvZHkgPSBjb250ZW50cztcbiAgICAgIHRoaXMuZG9Qb3N0KFVybEhlbHBlcnMuam9pbihcImNvbnRlbnRcIiwgcGF0aCB8fCBcIi9cIiksIHF1ZXJ5LCBib2R5LFxuICAgICAgICAoZGF0YSwgc3RhdHVzLCBoZWFkZXJzLCBjb25maWcpID0+IHtcbiAgICAgICAgICBmbihkYXRhKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUmV0dXJuIHRoZSBoaXN0b3J5IG9mIHRoZSByZXBvc2l0b3J5IG9yIGEgc3BlY2lmaWMgZGlyZWN0b3J5IG9yIGZpbGUgcGF0aFxuICAgICAqIEBtZXRob2QgaGlzdG9yeVxuICAgICAqIEBmb3IgR2l0V2lraVJlcG9zaXRvcnlcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gYnJhbmNoXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IG9iamVjdElkXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IHBhdGhcbiAgICAgKiBAcGFyYW0ge051bWJlcn0gbGltaXRcbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBmblxuICAgICAqIEByZXR1cm4ge2FueX1cbiAgICAgKi9cbiAgICBwdWJsaWMgaGlzdG9yeShicmFuY2g6c3RyaW5nLCBvYmplY3RJZDpzdHJpbmcsIHBhdGg6c3RyaW5nLCBsaW1pdDpudW1iZXIsIGZuKSB7XG4gICAgICB2YXIgcXVlcnkgPSBudWxsO1xuICAgICAgaWYgKGJyYW5jaCkge1xuICAgICAgICBxdWVyeSA9IFwicmVmPVwiICsgYnJhbmNoO1xuICAgICAgfVxuICAgICAgaWYgKGxpbWl0KSB7XG4gICAgICAgIHF1ZXJ5ID0gKHF1ZXJ5ID8gcXVlcnkgKyBcIiZcIiA6IFwiXCIpICsgXCJsaW1pdD1cIiArIGxpbWl0O1xuICAgICAgfVxuICAgICAgdmFyIGNvbW1pdElkID0gb2JqZWN0SWQgfHwgYnJhbmNoO1xuICAgICAgdGhpcy5kb0dldChVcmxIZWxwZXJzLmpvaW4oXCJoaXN0b3J5XCIsIGNvbW1pdElkLCBwYXRoKSwgcXVlcnksXG4gICAgICAgIChkYXRhLCBzdGF0dXMsIGhlYWRlcnMsIGNvbmZpZykgPT4ge1xuICAgICAgICAgIGZuKGRhdGEpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwdWJsaWMgY29tbWl0SW5mbyhjb21taXRJZDpzdHJpbmcsIGZuKSB7XG4gICAgICB2YXIgcXVlcnkgPSBudWxsO1xuICAgICAgdGhpcy5kb0dldChVcmxIZWxwZXJzLmpvaW4oXCJjb21taXRJbmZvXCIsIGNvbW1pdElkKSwgcXVlcnksXG4gICAgICAgIChkYXRhLCBzdGF0dXMsIGhlYWRlcnMsIGNvbmZpZykgPT4ge1xuICAgICAgICAgIGZuKGRhdGEpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwdWJsaWMgY29tbWl0RGV0YWlsKGNvbW1pdElkOnN0cmluZywgZm4pIHtcbiAgICAgIHZhciBxdWVyeSA9IG51bGw7XG4gICAgICB0aGlzLmRvR2V0KFVybEhlbHBlcnMuam9pbihcImNvbW1pdERldGFpbFwiLCBjb21taXRJZCksIHF1ZXJ5LFxuICAgICAgICAoZGF0YSwgc3RhdHVzLCBoZWFkZXJzLCBjb25maWcpID0+IHtcbiAgICAgICAgICBmbihkYXRhKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcHVibGljIGNvbW1pdFRyZWUoY29tbWl0SWQ6c3RyaW5nLCBmbikge1xuICAgICAgdmFyIHF1ZXJ5ID0gbnVsbDtcbiAgICAgIHRoaXMuZG9HZXQoVXJsSGVscGVycy5qb2luKFwiY29tbWl0VHJlZVwiLCBjb21taXRJZCksIHF1ZXJ5LFxuICAgICAgICAoZGF0YSwgc3RhdHVzLCBoZWFkZXJzLCBjb25maWcpID0+IHtcbiAgICAgICAgICBmbihkYXRhKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG5cbiAgICAvKipcbiAgICAgKiBQZXJmb3JtcyBhIGRpZmYgb24gdGhlIHZlcnNpb25zXG4gICAgICogQG1ldGhvZCBkaWZmXG4gICAgICogQGZvciBHaXRXaWtpUmVwb3NpdG9yeVxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBvYmplY3RJZFxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBiYXNlT2JqZWN0SWRcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gcGF0aFxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGZuXG4gICAgICogQHJldHVybiB7YW55fVxuICAgICAqL1xuICAgIHB1YmxpYyBkaWZmKG9iamVjdElkOnN0cmluZywgYmFzZU9iamVjdElkOnN0cmluZywgcGF0aDpzdHJpbmcsIGZuKSB7XG4gICAgICB2YXIgcXVlcnkgPSBudWxsO1xuICAgICAgdmFyIGNvbmZpZzogYW55ID0gRm9yZ2UuY3JlYXRlSHR0cENvbmZpZygpO1xuICAgICAgY29uZmlnLnRyYW5zZm9ybVJlc3BvbnNlID0gKGRhdGEsIGhlYWRlcnNHZXR0ZXIsIHN0YXR1cykgPT4ge1xuICAgICAgICBsb2cuaW5mbyhcImdvdCBkaWZmIGRhdGE6IFwiICsgZGF0YSk7XG4gICAgICAgIHJldHVybiBkYXRhO1xuICAgICAgfTtcbiAgICAgIHRoaXMuZG9HZXQoVXJsSGVscGVycy5qb2luKFwiZGlmZlwiLCBvYmplY3RJZCwgYmFzZU9iamVjdElkLCBwYXRoKSwgcXVlcnksXG4gICAgICAgIChkYXRhLCBzdGF0dXMsIGhlYWRlcnMsIGNvbmZpZykgPT4ge1xuICAgICAgICAgIHZhciBkZXRhaWxzID0ge1xuICAgICAgICAgICAgdGV4dDogZGF0YSxcbiAgICAgICAgICAgIGZvcm1hdDogXCJkaWZmXCIsXG4gICAgICAgICAgICBkaXJlY3Rvcnk6IGZhbHNlXG4gICAgICAgICAgfTtcbiAgICAgICAgICBmbihkZXRhaWxzKTtcbiAgICAgICAgfSxcbiAgICAgICAgbnVsbCwgY29uZmlnKTtcbiAgICB9XG5cblxuICAgIC8qKlxuICAgICAqIEdldCB0aGUgbGlzdCBvZiBicmFuY2hlc1xuICAgICAqIEBtZXRob2QgYnJhbmNoZXNcbiAgICAgKiBAZm9yIEdpdFdpa2lSZXBvc2l0b3J5XG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gZm5cbiAgICAgKiBAcmV0dXJuIHthbnl9XG4gICAgICovXG4gICAgcHVibGljIGJyYW5jaGVzKGZuKSB7XG4gICAgICB2YXIgcXVlcnkgPSBudWxsO1xuICAgICAgdGhpcy5kb0dldChcImxpc3RCcmFuY2hlc1wiLCBxdWVyeSxcbiAgICAgICAgKGRhdGEsIHN0YXR1cywgaGVhZGVycywgY29uZmlnKSA9PiB7XG4gICAgICAgICAgZm4oZGF0YSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHB1YmxpYyBleGlzdHMoYnJhbmNoOnN0cmluZywgcGF0aDpzdHJpbmcsIGZuKTogQm9vbGVhbiB7XG4gICAgICB2YXIgYW5zd2VyID0gZmFsc2U7XG4gICAgICB0aGlzLmdldFBhZ2UoYnJhbmNoLCBwYXRoLCBudWxsLCAoZGF0YSkgPT4ge1xuICAgICAgICBpZiAoZGF0YS5kaXJlY3RvcnkpIHtcbiAgICAgICAgICBpZiAoZGF0YS5jaGlsZHJlbi5sZW5ndGgpIHtcbiAgICAgICAgICAgIGFuc3dlciA9IHRydWU7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGFuc3dlciA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgbG9nLmluZm8oXCJleGlzdHMgXCIgKyBwYXRoICsgXCIgYW5zd2VyID0gXCIgKyBhbnN3ZXIpO1xuICAgICAgICBpZiAoYW5ndWxhci5pc0Z1bmN0aW9uKGZuKSkge1xuICAgICAgICAgIGZuKGFuc3dlcik7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIGFuc3dlcjtcbiAgICB9XG5cbiAgICBwdWJsaWMgcmV2ZXJ0VG8oYnJhbmNoOnN0cmluZywgb2JqZWN0SWQ6c3RyaW5nLCBibG9iUGF0aDpzdHJpbmcsIGNvbW1pdE1lc3NhZ2U6c3RyaW5nLCBmbikge1xuICAgICAgaWYgKCFjb21taXRNZXNzYWdlKSB7XG4gICAgICAgIGNvbW1pdE1lc3NhZ2UgPSBcIlJldmVydGluZyBcIiArIGJsb2JQYXRoICsgXCIgY29tbWl0IFwiICsgKG9iamVjdElkIHx8IGJyYW5jaCk7XG4gICAgICB9XG4gICAgICB2YXIgcXVlcnkgPSBudWxsO1xuICAgICAgaWYgKGJyYW5jaCkge1xuICAgICAgICBxdWVyeSA9IFwicmVmPVwiICsgYnJhbmNoO1xuICAgICAgfVxuICAgICAgaWYgKGNvbW1pdE1lc3NhZ2UpIHtcbiAgICAgICAgcXVlcnkgPSAocXVlcnkgPyBxdWVyeSArIFwiJlwiIDogXCJcIikgKyBcIm1lc3NhZ2U9XCIgKyBlbmNvZGVVUklDb21wb25lbnQoY29tbWl0TWVzc2FnZSk7XG4gICAgICB9XG4gICAgICB2YXIgYm9keSA9IFwiXCI7XG4gICAgICB0aGlzLmRvUG9zdChVcmxIZWxwZXJzLmpvaW4oXCJyZXZlcnRcIiwgb2JqZWN0SWQsIGJsb2JQYXRoIHx8IFwiL1wiKSwgcXVlcnksIGJvZHksXG4gICAgICAgIChkYXRhLCBzdGF0dXMsIGhlYWRlcnMsIGNvbmZpZykgPT4ge1xuICAgICAgICAgIGZuKGRhdGEpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwdWJsaWMgcmVuYW1lKGJyYW5jaDpzdHJpbmcsIG9sZFBhdGg6c3RyaW5nLCAgbmV3UGF0aDpzdHJpbmcsIGNvbW1pdE1lc3NhZ2U6c3RyaW5nLCBmbikge1xuICAgICAgaWYgKCFjb21taXRNZXNzYWdlKSB7XG4gICAgICAgIGNvbW1pdE1lc3NhZ2UgPSBcIlJlbmFtaW5nIHBhZ2UgXCIgKyBvbGRQYXRoICsgXCIgdG8gXCIgKyBuZXdQYXRoO1xuICAgICAgfVxuICAgICAgdmFyIHF1ZXJ5ID0gbnVsbDtcbiAgICAgIGlmIChicmFuY2gpIHtcbiAgICAgICAgcXVlcnkgPSBcInJlZj1cIiArIGJyYW5jaDtcbiAgICAgIH1cbiAgICAgIGlmIChjb21taXRNZXNzYWdlKSB7XG4gICAgICAgIHF1ZXJ5ID0gKHF1ZXJ5ID8gcXVlcnkgKyBcIiZcIiA6IFwiXCIpICsgXCJtZXNzYWdlPVwiICsgZW5jb2RlVVJJQ29tcG9uZW50KGNvbW1pdE1lc3NhZ2UpO1xuICAgICAgfVxuICAgICAgaWYgKG9sZFBhdGgpIHtcbiAgICAgICAgcXVlcnkgPSAocXVlcnkgPyBxdWVyeSArIFwiJlwiIDogXCJcIikgKyBcIm9sZD1cIiArIGVuY29kZVVSSUNvbXBvbmVudChvbGRQYXRoKTtcbiAgICAgIH1cbiAgICAgIHZhciBib2R5ID0gXCJcIjtcbiAgICAgIHRoaXMuZG9Qb3N0KFVybEhlbHBlcnMuam9pbihcIm12XCIsIG5ld1BhdGggfHwgXCIvXCIpLCBxdWVyeSwgYm9keSxcbiAgICAgICAgKGRhdGEsIHN0YXR1cywgaGVhZGVycywgY29uZmlnKSA9PiB7XG4gICAgICAgICAgZm4oZGF0YSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHB1YmxpYyByZW1vdmVQYWdlKGJyYW5jaDpzdHJpbmcsIHBhdGg6c3RyaW5nLCBjb21taXRNZXNzYWdlOnN0cmluZywgZm4pIHtcbiAgICAgIGlmICghY29tbWl0TWVzc2FnZSkge1xuICAgICAgICBjb21taXRNZXNzYWdlID0gXCJSZW1vdmluZyBwYWdlIFwiICsgcGF0aDtcbiAgICAgIH1cbiAgICAgIHZhciBxdWVyeSA9IG51bGw7XG4gICAgICBpZiAoYnJhbmNoKSB7XG4gICAgICAgIHF1ZXJ5ID0gXCJyZWY9XCIgKyBicmFuY2g7XG4gICAgICB9XG4gICAgICBpZiAoY29tbWl0TWVzc2FnZSkge1xuICAgICAgICBxdWVyeSA9IChxdWVyeSA/IHF1ZXJ5ICsgXCImXCIgOiBcIlwiKSArIFwibWVzc2FnZT1cIiArIGVuY29kZVVSSUNvbXBvbmVudChjb21taXRNZXNzYWdlKTtcbiAgICAgIH1cbiAgICAgIHZhciBib2R5ID0gXCJcIjtcbiAgICAgIHRoaXMuZG9Qb3N0KFVybEhlbHBlcnMuam9pbihcInJtXCIsIHBhdGggfHwgXCIvXCIpLCBxdWVyeSwgYm9keSxcbiAgICAgICAgKGRhdGEsIHN0YXR1cywgaGVhZGVycywgY29uZmlnKSA9PiB7XG4gICAgICAgICAgZm4oZGF0YSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHB1YmxpYyByZW1vdmVQYWdlcyhicmFuY2g6c3RyaW5nLCBwYXRoczpBcnJheTxzdHJpbmc+LCBjb21taXRNZXNzYWdlOnN0cmluZywgZm4pIHtcbiAgICAgIGlmICghY29tbWl0TWVzc2FnZSkge1xuICAgICAgICBjb21taXRNZXNzYWdlID0gXCJSZW1vdmluZyBwYWdlXCIgKyAocGF0aHMubGVuZ3RoID4gMSA/IFwic1wiIDogXCJcIikgKyBcIiBcIiArIHBhdGhzLmpvaW4oXCIsIFwiKTtcbiAgICAgIH1cbiAgICAgIHZhciBxdWVyeSA9IG51bGw7XG4gICAgICBpZiAoYnJhbmNoKSB7XG4gICAgICAgIHF1ZXJ5ID0gXCJyZWY9XCIgKyBicmFuY2g7XG4gICAgICB9XG4gICAgICBpZiAoY29tbWl0TWVzc2FnZSkge1xuICAgICAgICBxdWVyeSA9IChxdWVyeSA/IHF1ZXJ5ICsgXCImXCIgOiBcIlwiKSArIFwibWVzc2FnZT1cIiArIGVuY29kZVVSSUNvbXBvbmVudChjb21taXRNZXNzYWdlKTtcbiAgICAgIH1cbiAgICAgIHZhciBib2R5ID0gcGF0aHM7XG4gICAgICB0aGlzLmRvUG9zdChVcmxIZWxwZXJzLmpvaW4oXCJybVwiKSwgcXVlcnksIGJvZHksXG4gICAgICAgIChkYXRhLCBzdGF0dXMsIGhlYWRlcnMsIGNvbmZpZykgPT4ge1xuICAgICAgICAgIGZuKGRhdGEpO1xuICAgICAgICB9KTtcbiAgICB9XG5cblxuXG4gICAgcHJpdmF0ZSBkb0dldChwYXRoLCBxdWVyeSwgc3VjY2Vzc0ZuLCBlcnJvckZuID0gbnVsbCwgY29uZmlnID0gbnVsbCkge1xuICAgICAgdmFyIHVybCA9IEZvcmdlLmNyZWF0ZUh0dHBVcmwodGhpcy5wcm9qZWN0SWQsIFVybEhlbHBlcnMuam9pbih0aGlzLmJhc2VVcmwsIHBhdGgpKTtcbiAgICAgIGlmIChxdWVyeSkge1xuICAgICAgICB1cmwgKz0gXCImXCIgKyBxdWVyeTtcbiAgICAgIH1cbiAgICAgIGlmICghZXJyb3JGbikge1xuICAgICAgICBlcnJvckZuID0gKGRhdGEsIHN0YXR1cywgaGVhZGVycywgY29uZmlnKSA9PiB7XG4gICAgICAgICAgbG9nLndhcm4oXCJmYWlsZWQgdG8gbG9hZCEgXCIgKyB1cmwgKyBcIi4gc3RhdHVzOiBcIiArIHN0YXR1cyArIFwiIGRhdGE6IFwiICsgZGF0YSk7XG4gICAgICAgIH07XG5cbiAgICAgIH1cbiAgICAgIGlmICghY29uZmlnKSB7XG4gICAgICAgIGNvbmZpZyA9IHRoaXMuY29uZmlnO1xuICAgICAgfVxuICAgICAgdGhpcy4kaHR0cC5nZXQodXJsLCBjb25maWcpLlxuICAgICAgICBzdWNjZXNzKHN1Y2Nlc3NGbikuXG4gICAgICAgIGVycm9yKGVycm9yRm4pO1xuICAgIH1cblxuICAgIHByaXZhdGUgZG9Qb3N0KHBhdGgsIHF1ZXJ5LCBib2R5LCBzdWNjZXNzRm4sIGVycm9yRm4gPSBudWxsKSB7XG4gICAgICB2YXIgdXJsID0gRm9yZ2UuY3JlYXRlSHR0cFVybCh0aGlzLnByb2plY3RJZCwgVXJsSGVscGVycy5qb2luKHRoaXMuYmFzZVVybCwgcGF0aCkpO1xuICAgICAgaWYgKHF1ZXJ5KSB7XG4gICAgICAgIHVybCArPSBcIiZcIiArIHF1ZXJ5O1xuICAgICAgfVxuICAgICAgaWYgKCFlcnJvckZuKSB7XG4gICAgICAgIGVycm9yRm4gPSAoZGF0YSwgc3RhdHVzLCBoZWFkZXJzLCBjb25maWcpID0+IHtcbiAgICAgICAgICBsb2cud2FybihcImZhaWxlZCB0byBsb2FkISBcIiArIHVybCArIFwiLiBzdGF0dXM6IFwiICsgc3RhdHVzICsgXCIgZGF0YTogXCIgKyBkYXRhKTtcbiAgICAgICAgfTtcblxuICAgICAgfVxuICAgICAgdGhpcy4kaHR0cC5wb3N0KHVybCwgYm9keSwgdGhpcy5jb25maWcpLlxuICAgICAgICBzdWNjZXNzKHN1Y2Nlc3NGbikuXG4gICAgICAgIGVycm9yKGVycm9yRm4pO1xuICAgIH1cblxuXG4gICAgcHJpdmF0ZSBkb1Bvc3RGb3JtKHBhdGgsIHF1ZXJ5LCBib2R5LCBzdWNjZXNzRm4sIGVycm9yRm4gPSBudWxsKSB7XG4gICAgICB2YXIgdXJsID0gRm9yZ2UuY3JlYXRlSHR0cFVybCh0aGlzLnByb2plY3RJZCwgVXJsSGVscGVycy5qb2luKHRoaXMuYmFzZVVybCwgcGF0aCkpO1xuICAgICAgaWYgKHF1ZXJ5KSB7XG4gICAgICAgIHVybCArPSBcIiZcIiArIHF1ZXJ5O1xuICAgICAgfVxuICAgICAgaWYgKCFlcnJvckZuKSB7XG4gICAgICAgIGVycm9yRm4gPSAoZGF0YSwgc3RhdHVzLCBoZWFkZXJzLCBjb25maWcpID0+IHtcbiAgICAgICAgICBsb2cud2FybihcImZhaWxlZCB0byBsb2FkISBcIiArIHVybCArIFwiLiBzdGF0dXM6IFwiICsgc3RhdHVzICsgXCIgZGF0YTogXCIgKyBkYXRhKTtcbiAgICAgICAgfTtcblxuICAgICAgfVxuICAgICAgdmFyIGNvbmZpZyA9IEZvcmdlLmNyZWF0ZUh0dHBDb25maWcoKTtcbiAgICAgIGlmICghY29uZmlnLmhlYWRlcnMpIHtcbiAgICAgICAgY29uZmlnLmhlYWRlcnMgPSB7fTtcbiAgICAgIH1cbiAgICAgIGNvbmZpZy5oZWFkZXJzW1wiQ29udGVudC1UeXBlXCJdID0gXCJhcHBsaWNhdGlvbi94LXd3dy1mb3JtLXVybGVuY29kZWQ7IGNoYXJzZXQ9dXRmLThcIjtcblxuICAgICAgdGhpcy4kaHR0cC5wb3N0KHVybCwgYm9keSwgY29uZmlnKS5cbiAgICAgICAgc3VjY2VzcyhzdWNjZXNzRm4pLlxuICAgICAgICBlcnJvcihlcnJvckZuKTtcbiAgICB9XG5cblxuXG4gICAgcHVibGljIGNvbXBsZXRlUGF0aChicmFuY2g6c3RyaW5nLCBjb21wbGV0aW9uVGV4dDpzdHJpbmcsIGRpcmVjdG9yaWVzT25seTpib29sZWFuLCBmbikge1xuLypcbiAgICAgIHJldHVybiB0aGlzLmdpdCgpLmNvbXBsZXRlUGF0aChicmFuY2gsIGNvbXBsZXRpb25UZXh0LCBkaXJlY3Rvcmllc09ubHksIGZuKTtcbiovXG4gICAgfVxuXG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIHRoZSBmdWxsIHBhdGggdG8gdXNlIGluIHRoZSBnaXQgcmVwb1xuICAgICAqIEBtZXRob2QgZ2V0UGF0aFxuICAgICAqIEBmb3IgR2l0V2lraVJlcG9zaXRvcnlcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gcGF0aFxuICAgICAqIEByZXR1cm4ge1N0cmluZ3tcbiAgICAgKi9cbiAgICBwdWJsaWMgZ2V0UGF0aChwYXRoOnN0cmluZykge1xuICAgICAgdmFyIGRpcmVjdG9yeVByZWZpeCA9IHRoaXMuZGlyZWN0b3J5UHJlZml4O1xuICAgICAgcmV0dXJuIChkaXJlY3RvcnlQcmVmaXgpID8gZGlyZWN0b3J5UHJlZml4ICsgcGF0aCA6IHBhdGg7XG4gICAgfVxuXG4gICAgcHVibGljIGdldExvZ1BhdGgocGF0aDpzdHJpbmcpIHtcbiAgICAgIHJldHVybiBDb3JlLnRyaW1MZWFkaW5nKHRoaXMuZ2V0UGF0aChwYXRoKSwgXCIvXCIpO1xuICAgIH1cblxuXG4gICAgLyoqXG4gICAgICogR2V0IHRoZSBjb250ZW50cyBvZiBhIGJsb2JQYXRoIGZvciBhIGdpdmVuIGNvbW1pdCBvYmplY3RJZFxuICAgICAqIEBtZXRob2QgZ2V0Q29udGVudFxuICAgICAqIEBmb3IgR2l0V2lraVJlcG9zaXRvcnlcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gb2JqZWN0SWRcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gYmxvYlBhdGhcbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBmblxuICAgICAqIEByZXR1cm4ge2FueX1cbiAgICAgKi9cbiAgICBwdWJsaWMgZ2V0Q29udGVudChvYmplY3RJZDpzdHJpbmcsIGJsb2JQYXRoOnN0cmluZywgZm4pIHtcbi8qXG4gICAgICB2YXIgZnVsbFBhdGggPSB0aGlzLmdldExvZ1BhdGgoYmxvYlBhdGgpO1xuICAgICAgdmFyIGdpdCA9IHRoaXMuZ2l0KCk7XG4gICAgICBpZiAoZ2l0KSB7XG4gICAgICAgIGdpdC5nZXRDb250ZW50KG9iamVjdElkLCBmdWxsUGF0aCwgZm4pO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGdpdDtcbiovXG4gICAgfVxuXG5cblxuICAgIC8qKlxuICAgICAqIEdldCB0aGUgSlNPTiBjb250ZW50cyBvZiB0aGUgcGF0aCB3aXRoIG9wdGlvbmFsIG5hbWUgd2lsZGNhcmQgYW5kIHNlYXJjaFxuICAgICAqIEBtZXRob2QganNvbkNoaWxkQ29udGVudHNcbiAgICAgKiBAZm9yIEdpdFdpa2lSZXBvc2l0b3J5XG4gICAgICogQHBhcmFtIHtTdHJpbmd9IHBhdGhcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gbmFtZVdpbGRjYXJkXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IHNlYXJjaFxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGZuXG4gICAgICogQHJldHVybiB7YW55fVxuICAgICAqL1xuICAgIHB1YmxpYyBqc29uQ2hpbGRDb250ZW50cyhwYXRoOnN0cmluZywgbmFtZVdpbGRjYXJkOnN0cmluZywgc2VhcmNoOnN0cmluZywgZm4pIHtcbi8qXG4gICAgICB2YXIgZnVsbFBhdGggPSB0aGlzLmdldExvZ1BhdGgocGF0aCk7XG4gICAgICB2YXIgZ2l0ID0gdGhpcy5naXQoKTtcbiAgICAgIGlmIChnaXQpIHtcbiAgICAgICAgZ2l0LnJlYWRKc29uQ2hpbGRDb250ZW50KGZ1bGxQYXRoLCBuYW1lV2lsZGNhcmQsIHNlYXJjaCwgZm4pO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGdpdDtcbiovXG4gICAgfVxuXG5cbiAgICBwdWJsaWMgZ2l0KCkge1xuLypcbiAgICAgIHZhciByZXBvc2l0b3J5ID0gdGhpcy5mYWN0b3J5TWV0aG9kKCk7XG4gICAgICBpZiAoIXJlcG9zaXRvcnkpIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJObyByZXBvc2l0b3J5IHlldCEgVE9ETyB3ZSBzaG91bGQgdXNlIGEgbG9jYWwgaW1wbCFcIik7XG4gICAgICB9XG4gICAgICByZXR1cm4gcmVwb3NpdG9yeTtcbiovXG4gICAgfVxuICB9XG59XG4iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vaW5jbHVkZXMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwid2lraUhlbHBlcnMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwid2lraVBsdWdpbi50c1wiLz5cblxubW9kdWxlIFdpa2kge1xuXG4gIGV4cG9ydCB2YXIgVG9wTGV2ZWxDb250cm9sbGVyID0gX21vZHVsZS5jb250cm9sbGVyKFwiV2lraS5Ub3BMZXZlbENvbnRyb2xsZXJcIiwgWyckc2NvcGUnLCAnJHJvdXRlJywgJyRyb3V0ZVBhcmFtcycsICgkc2NvcGUsICRyb3V0ZSwgJHJvdXRlUGFyYW1zKSA9PiB7XG5cbiAgfV0pO1xuXG59XG4iXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=

angular.module("fabric8-console-templates", []).run(["$templateCache", function($templateCache) {$templateCache.put("plugins/forge/html/command.html","<div ng-controller=\"Forge.CommandController\">\n  <script type=\"text/ng-template\" id=\"devOpsPipelineChooser.html\">\n    <div ng-controller=\"Forge.PipelinePicker\">\n      <div class=\"col-sm-12\">\n        <div class=\"\">\n          <hawtio-filter ng-model=\"tableConfig.filterOptions.filterText\"\n                         save-as=\"forge-pipeline-selector\"\n                         css-class=\"input-xxlarge\"\n                         placeholder=\"Filter pipelines...\"></hawtio-filter>\n        </div>\n      </div>\n      <div class=\"col-sm-12 pipeline-chooser-panel-border\">\n        <div class=\"pipeline-chooser-panel\">\n          <table class=\"table table-bordered table-striped\" hawtio-simple-table=\"tableConfig\"></table>\n        </div>\n      </div>\n\n      <div class=\"form-group\">\n        <label class=\"col-sm-2 control-label\">Pipeline</label>\n\n        <div class=\"col-sm-10\">\n          <!--\n                    <select ng-options=\"item as item.label for item in pipelines track by item.label\"\n                            ng-model=\"pipelineModel.current\"></select>\n                    <input type=\"text\" class=\"form-control\" ng-model=\"pipelineModel.value\" typeahead=\"item.label for item in pipelines\">\n          -->\n          <input type=\"text\" ng-disabled=\"true\" class=\"form-control\" ng-model=\"selected.label\">\n        </div>\n      </div>\n\n      <div class=\"form-group\">\n        <label class=\"col-sm-2 control-label\">Description</label>\n\n        <div class=\"col-sm-10\">\n          <div class=\"panel panel-default\">\n            <div class=\"panel-body\">\n              <div ng-bind-html=\"html\"></div>\n<!--\n              <div compile=\"html\"></div>\n-->\n            </div>\n          </div>\n        </div>\n      </div>\n    </div>\n  </script>\n  <script type=\"text/ng-template\" id=\"devOpsPipelineChooserStages.html\">\n    <div class=\"ngCellText\">\n      <span ng-repeat=\"value in row.entity.stages track by $index\">\n        <span class=\"badge\">{{value}}</span>\n      </span>\n    </div>\n  </script>\n  <script type=\"text/ng-template\" id=\"devOpsPipelineChooserEnvironments.html\">\n    <div class=\"ngCellText\">\n      <span ng-repeat=\"value in row.entity.environments track by $index\">\n        <span class=\"badge\">{{value}}</span>\n      </span>\n    </div>\n  </script>\n\n  <script type=\"text/ng-template\" id=\"devOpsArchetypeChooser.html\">\n    <div ng-controller=\"Forge.ArchetypePicker\">\n      <p>{{selected.description}}</p>\n\n      <div class=\"col-sm-12\">\n        <div class=\"\">\n          <hawtio-filter ng-model=\"tableConfig.filterOptions.filterText\"\n                         save-as=\"forge-artifact-selector\"\n                         css-class=\"input-xxlarge\"\n                         placeholder=\"Filter archetypes...\"></hawtio-filter>\n        </div>\n      </div>\n      <div class=\"col-sm-12 archetype-chooser-border\">\n        <div class=\"archetype-chooser-panel\">\n          <table class=\"table table-bordered table-striped archetype-chooser\" hawtio-simple-table=\"tableConfig\"></table>\n        </div>\n      </div>\n      <!--<div class=\"form-group\">\n        <label class=\"col-sm-2 control-label\">Description</label>\n\n        <div class=\"col-sm-10\">\n          <div class=\"panel panel-default\">\n            <div class=\"panel-body\">{{selected.description}}</div>\n          </div>\n        </div>\n      </div>-->\n    </div>\n  </script>\n\n  <div class=\"row\">\n    <div hawtio-breadcrumbs></div>\n  </div>\n\n  <div class=\"row\">\n    <div hawtio-tabs></div>\n  </div>\n\n  <div class=\"row\">\n    <div class=\"col-md-12\">\n      <h3>{{schema.info.description}}</h3>\n    </div>\n  </div>\n  <div class=\"row\" ng-show=\"executing\">\n    <div class=\"col-md-12\">\n      <p class=\"bg-info\">executing...\n        <i class=\"fa fa-spinner fa-spin\"></i>\n      </p>\n    </div>\n  </div>\n  <div class=\"row\" ng-show=\"response\">\n    <div class=\"col-md-12\">\n      <p ng-show=\"response.message\" ng-class=\"responseClass\"><span class=\"response-message\">{{response.message}}</span>\n      </p>\n\n      <p ng-show=\"response.output\" ng-class=\"responseClass\"><span class=\"response-output\">{{response.output}}</span></p>\n\n      <p ng-show=\"response.err\" ng-class=\"bg-warning\"><span class=\"response-err\">{{response.err}}</span></p>\n    </div>\n  </div>\n  <div class=\"row\" ng-show=\"response && !invalid\">\n    <div class=\"col-md-12\">\n      <a class=\"btn btn-primary\" href=\"{{completedLink}}\">Done</a>\n      <a class=\"btn btn-default\" ng-click=\"response = null\" ng-hide=\"wizardCompleted\">Hide</a>\n    </div>\n  </div>\n  <div class=\"row\" ng-show=\"validationError\">\n    <div class=\"col-md-12\">\n      <p class=\"bg-danger\">{{validationError}}</p>\n    </div>\n  </div>\n  <div class=\"row\">\n    <div class=\"col-md-12\">\n      <div ng-hide=\"fetched\">\n        <div class=\"align-center\">\n          <i class=\"fa fa-spinner fa-spin\"></i>\n        </div>\n      </div>\n      <div ng-show=\"fetched && !wizardCompleted\">\n        <div hawtio-form-2=\"schema\" entity=\'entity\' name=\"forge\"></div>\n      </div>\n    </div>\n  </div>\n  <div class=\"row\" ng-hide=\"wizardCompleted\">\n    <form>\n      <div class=\"form-group\">\n        <div class=\"col-sm-2\">\n          <p class=\"text-warning pull-right\" ng-show=\"validationMessage\">{{validationMessage}}</p>\n        </div>\n        <div class=\"col-sm-10\">\n          <div class=\"pull-right\">\n            <a class=\"btn btn-default\"\n               title=\"Cancel this command\"\n               ng-show=\"$projectLink\"\n               href=\"{{$projectLink}}\">\n              Cancel\n            </a>\n            &nbsp;&nbsp;\n            <button class=\"btn btn-primary\"\n                    title=\"Perform this command\"\n                    ng-show=\"fetched\"\n                    ng-disabled=\"executing || !isFormValid()\"\n                    ng-click=\"execute()\">\n              Next&nbsp;&nbsp;&gt;\n            </button>\n          </div>\n        </div>\n      </div>\n    </form>\n  </div>\n</div>\n");
$templateCache.put("plugins/forge/html/commands.html","<div class=\"row\" ng-controller=\"Forge.CommandsController\">\n  <div class=\"row\">\n    <div hawtio-breadcrumbs></div>\n  </div>\n\n  <div class=\"row\">\n    <div hawtio-tabs></div>\n  </div>\n\n<!--\n  <div class=\"row\">\n    <div class=\"col-md-12\" ng-show=\"commands.length\">\n      <span ng-show=\"!id\">\n        Command: <hawtio-filter ng-model=\"tableConfig.filterOptions.filterText\"\n                                css-class=\"input-xxlarge\"\n                                placeholder=\"Filter commands...\"\n                                save-as=\"fabric8-forge-command-filter\"></hawtio-filter>\n      </span>\n      <span class=\"pull-right\">&nbsp;</span>\n\n      <div class=\"user-icon-name pull-right\" ng-show=\"user\">\n        <a href=\"/forge/repos\" title=\"Browse the repositories for {{user}}\">\n          <img src=\"{{avatar_url}}\" class=\"avatar-small-img\" ng-show=\"avatar_url\">\n        </a>\n        &nbsp;\n        <a href=\"/forge/repos\" title=\"Browse the repositories for {{user}}\">\n          {{user}}\n        </a>\n        <span ng-show=\"repoName\">/\n          <a href=\"/forge/repos/{{repoName}}\" title=\"Browse the {{repoName}}repository\">\n            {{repoName}}\n          </a>\n        </span>\n      </div>\n    </div>\n  </div>\n-->\n  <div class=\"row\">\n    <div class=\"col-md-12\">\n      <div ng-hide=\"fetched\">\n        <div class=\"align-center\">\n          <i class=\"fa fa-spinner fa-spin\"></i>\n        </div>\n      </div>\n      <div ng-show=\"fetched\">\n        <div ng-hide=\"commands.length\" class=\"align-center\">\n          <p class=\"alert alert-info\">There are no commands available!</p>\n        </div>\n        <div ng-show=\"commands.length\">\n        </div>\n\n        <div ng-hide=\"mode == \'table\'\">\n          <div class=\"panel-group\" id=\"accordion-markup\">\n            <div class=\"panel panel-default\" ng-repeat=\"folder in commandSelector.folders\">\n              <div class=\"panel-heading\">\n                <h4 class=\"panel-title\">\n                  <a data-toggle=\"collapse\" data-parent=\"#accordion-markup\" href=\"#{{folder.id}}\">\n                    {{folder.name}}\n                  </a>\n                </h4>\n              </div>\n              <div id=\"{{folder.id}}\" class=\"panel-collapse collapse in\">\n                <div class=\"panel-body\">\n                  <ul>\n                    <li ng-repeat=\"command in folder.commands\">\n                      <a href=\"{{command.$link}}\"\n                         title=\"{{command.description}}\">\n                        <span class=\"command-name\">{{command.$shortName}}</span>\n                      </a>\n                    </li>\n                  </ul>\n                </div>\n              </div>\n            </div>\n          </div>\n        </div>\n\n        <div ng-show=\"mode == \'table\'\">\n          <table class=\"table table-condensed table-striped\" hawtio-simple-table=\"tableConfig\"></table>\n        </div>\n      </div>\n    </div>\n  </div>\n\n  <!--\n  <div ng-show=\"fetched && commands.length && mode != \'table\'\">\n    <div class=\"row\">\n      <ul>\n        <li class=\"no-list command-selector-folder\" ng-repeat=\"folder in commandSelector.folders\"\n            ng-show=\"commandSelector.showFolder(folder)\">\n          <div class=\"expandable\" ng-class=\"commandSelector.isOpen(folder)\">\n            <div title=\"{{folder.name}}\" class=\"title\">\n              <i class=\"expandable-indicator folder\"></i> <span class=\"folder-title\"\n                                                                ng-show=\"folder.name\">{{folder.name}}</span><span\n                    class=\"folder-title\" ng-hide=\"folder.name\">Uncategorized</span>\n            </div>\n            <div class=\"expandable-body\">\n              <ul>\n                <li class=\"no-list command\" ng-repeat=\"command in folder.commands\"\n                    ng-show=\"commandSelector.showCommand(command)\">\n                  <div class=\"inline-block command-selector-name\"\n                       ng-class=\"commandSelector.getSelectedClass(command)\">\n                    <span class=\"contained c-max\">\n                      <a href=\"{{command.$link}}\"\n                         title=\"{{command.description}}\">\n                        <span class=\"command-name\">{{command.$shortName}}</span>\n                      </a>\n                    </span>\n                  </div>\n                </li>\n              </ul>\n            </div>\n          </div>\n        </li>\n      </ul>\n    </div>\n  </div>-->\n</div>\n");
$templateCache.put("plugins/forge/html/createProject.html","<div class=\"row\" ng-controller=\"Forge.ReposController\">\n\n  <div class=\"row\">\n    <div hawtio-breadcrumbs></div>\n  </div>\n\n  <div class=\"row\">\n    <div hawtio-tabs></div>\n  </div>\n\n\n  <div ng-show=\"model.fetched && $runningCDPipeline && (!$gogsLink || !$forgeLink)\">\n    <div class=\"createProjectPage\">\n      <div class=\"jumbotron\">\n        <div class=\"row\">\n          <div class=\"col-md-12\">\n            <p>Waiting for the <b>CD Pipeline</b> application to startup: &nbsp;&nbsp;<i class=\"fa fa-spinner fa-spin\"></i>\n            </p>\n\n            <ul class=\"pending-pods\">\n              <li class=\"ngCellText\" ng-repeat=\"item in $requiredRCs\">\n                <a ng-href=\"{{item | kubernetesPageLink}}\">\n                  <img class=\"app-icon-small\" ng-src=\"{{item.$iconUrl}}\" ng-show=\"item.$iconUrl\">\n                  <b>{{item.metadata.name}}</b>\n                </a>\n                <a ng-show=\"item.$podCounters.podsLink\" href=\"{{item.$podCounters.podsLink}}\" title=\"View pods\">\n                  <span ng-show=\"item.$podCounters.ready\" class=\"badge badge-success\">{{item.$podCounters.ready}}</span>\n                  <span ng-show=\"item.$podCounters.valid\" class=\"badge badge-info\">{{item.$podCounters.valid}}</span>\n                  <span ng-show=\"item.$podCounters.waiting\" class=\"badge\">{{item.$podCounters.waiting}}</span>\n                  <span ng-show=\"item.$podCounters.error\" class=\"badge badge-warning\">{{item.$podCounters.error}}</span>\n                </a>\n              </li>\n            </ul>\n            <p>Please be patient while the above pods are ready!</p>\n          </div>\n        </div>\n      </div>\n    </div>\n  </div>\n\n  <div ng-show=\"model.fetched && !$runningCDPipeline\">\n    <div class=\"createProjectPage\">\n      <div class=\"jumbotron\">\n        <div class=\"row\">\n          <div class=\"col-md-12\">\n            <p class=\"text-warning\">You are not running the <b>CD Pipeline</b> application in this workspace.</p>\n\n            <p>To be able to create new projects please run it!</p>\n\n            <p><a href=\"{{$runCDPipelineLink}}\" class=\"btn btn-lg btn-default\">Run the <b>CD Pipeline</b></a></p>\n          </div>\n        </div>\n      </div>\n    </div>\n  </div>\n\n  <div ng-hide=\"model.fetched || !$gogsLink ||!$forgeLink\">\n    <div class=\"row\">\n      <div class=\"col-md-12\">\n        <div class=\"align-center\">\n          <i class=\"fa fa-spinner fa-spin\"></i>\n        </div>\n      </div>\n    </div>\n  </div>\n\n  <div ng-show=\"model.fetched && $gogsLink && $forgeLink\">\n    <div class=\"createProjectPage\">\n      <div class=\"jumbotron\">\n        <div class=\"row\">\n          <div class=\"col-md-6\">\n            <p class=\"align-center\">\n              <a class=\"btn btn-primary btn-lg\" href=\"{{$workspaceLink}}/importProject\"\n                 title=\"Import an existing project from a git source control repository\">\n                <i class=\"fa fa-plus\"></i> Import Project from Git\n              </a>\n            </p>\n\n            <p class=\"align-center\">\n              Import a project which already exists in a git repository\n            </p>\n          </div>\n\n          <div class=\"col-md-6\">\n            <div ng-show=\"sourceSecret\">\n              <p class=\"align-center\">\n                <a class=\"btn btn-primary btn-lg\" href=\"{{$workspaceLink}}/forge/command/project-new\"\n                   title=\"Create a new project in this workspace using a wizard\">\n                  <i class=\"fa fa-plus\"></i> Create Java Project using Wizard\n                </a>\n              </p>\n\n              <p class=\"align-center\">\n                This wizard guides you though creating a new Java project from our library of sample projects with the configured\n                <a href=\"{{$workspaceLink}}/forge/secrets\"\n                   title=\"View or change the secret used to create new projects\">\n                  source secret\n                </a>\n              </p>\n            </div>\n            <div ng-hide=\"sourceSecret\">\n              <p class=\"align-center\">\n                <a class=\"btn btn-default btn-lg\" href=\"{{$workspaceLink}}/forge/secrets\"\n                   title=\"Setup the secrets so that you can create new projects and git repositories in the Gogs service\">\n                  <i class=\"fa fa-pencil-square-o\"></i> Setup Gogs Secret\n                </a>\n              </p>\n\n              <p class=\"align-center\">\n                Setup a secret so that you can create new projects and git repositories in the gogs service.\n              </p>\n            </div>\n          </div>\n        </div>\n      </div>\n    </div>\n  </div>\n</div>\n");
$templateCache.put("plugins/forge/html/layoutForge.html","<script type=\"text/ng-template\" id=\"idTemplate.html\">\n  <div class=\"ngCellText\">\n    <a href=\"\"\n       title=\"Execute command {{row.entity.name}}\"\n       ng-href=\"{{row.entity.$link}}\">\n      {{row.entity.name}}</a>\n  </div>\n</script>\n<script type=\"text/ng-template\" id=\"repoTemplate.html\">\n  <div class=\"ngCellText\">\n    <a title=\"View repository {{row.entity.name}}\"\n       ng-href=\"/forge/repos/{{row.entity.name}}\">\n      {{row.entity.name}}\n    </a>\n  </div>\n</script>\n<script type=\"text/ng-template\" id=\"repoActionsTemplate.html\">\n  <div class=\"ngCellText\">\n    <a ng-show=\"row.entity.$openProjectLink\"\n       class=\"btn btn-primary\" target=\"editor\"\n       title=\"Open project {{row.entity.name}} in an editor\"\n       ng-href=\"{{row.entity.$openProjectLink}}\">\n      <i class=\"fa fa-pencil-square\"></i>\n      Open\n    </a>\n    <a ng-show=\"row.entity.html_url\"\n       class=\"btn btn-default\" target=\"browse\"\n       title=\"Browse project {{row.entity.name}}\"\n       ng-href=\"{{row.entity.html_url}}\">\n      <i class=\"fa fa-external-link\"></i>\n      Repository\n    </a>\n    <a ng-show=\"row.entity.$buildsLink\"\n       class=\"btn btn-default\" target=\"builds\"\n       title=\"View builds for this repository {{row.entity.owner.username}}/{{row.entity.name}}\"\n       ng-href=\"{{row.entity.$buildsLink}}\">\n      <i class=\"fa fa-cog\"></i>\n      Builds\n    </a>\n    <a ng-show=\"row.entity.$commandsLink\"\n       class=\"btn btn-default\"\n       title=\"Commands for project {{row.entity.name}}\"\n       ng-href=\"{{row.entity.$commandsLink}}\">\n      <i class=\"fa fa-play-circle\"></i>\n      Run...\n    </a>\n  </div>\n</script>\n<script type=\"text/ng-template\" id=\"categoryTemplate.html\">\n  <div class=\"ngCellText\">\n    <span class=\"pod-label badge\"\n          class=\"background-light-grey mouse-pointer\">{{row.entity.category}}</span>\n  </div>\n</script>\n\n<div class=\"row\">\n  <div class=\"wiki-icon-view\">\n    <div class=\"row forge-view\" ng-view></div>\n  </div>\n</div>\n");
$templateCache.put("plugins/forge/html/repo.html","<div class=\"row\" ng-controller=\"Forge.RepoController\">\n  <div class=\"row\">\n    <div hawtio-breadcrumbs></div>\n  </div>\n\n  <div class=\"row\">\n    <div hawtio-tabs></div>\n  </div>\n\n  <div class=\"row\">\n    <div class=\"col-md-12\">\n      <span class=\"pull-right\">&nbsp;</span>\n      <a class=\"btn btn-default pull-right\"\n              href=\"/forge/repos\"><i class=\"fa fa-list\"></i></a>\n      <span class=\"pull-right\">&nbsp;</span>\n      <a ng-show=\"entity.$commandsLink\"\n         class=\"btn btn-default pull-right\"\n         title=\"Commands for project {{entity.name}}\"\n         ng-href=\"{{entity.$commandsLink}}\">\n        <i class=\"fa fa-play-circle\"></i>\n        Run...\n      </a>\n      <span class=\"pull-right\" ng-show=\"entity.$buildsLink\">&nbsp;</span>\n      <a ng-show=\"entity.$buildsLink\"\n         class=\"btn btn-primary pull-right\" target=\"builds\"\n         title=\"View builds for this repository {{entity.owner.username}}/{{entity.name}}\"\n         ng-href=\"{{entity.$buildsLink}}\">\n        <i class=\"fa fa-cog\"></i>\n        Builds\n      </a>\n      <span class=\"pull-right\">&nbsp;</span>\n      <a ng-show=\"entity.html_url\"\n         class=\"btn btn-default pull-right\" target=\"browse\"\n         title=\"Browse project {{entity.name}}\"\n         ng-href=\"{{entity.html_url}}\">\n        <i class=\"fa fa-external-link\"></i>\n        Browse\n      </a>\n    </div>\n  </div>\n\n  <div ng-hide=\"fetched\">\n    <div class=\"row\">\n      <div class=\"col-md-12\">\n        <div class=\"align-center\">\n          <i class=\"fa fa-spinner fa-spin\"></i>\n        </div>\n      </div>\n    </div>\n  </div>\n  <div ng-show=\"fetched\">\n    <div class=\"row\">\n      <div class=\"col-md-12\">\n        <h3 title=\"repository for {{entity.owner.username}}\">\n          <span ng-show=\"entity.owner.username\">\n            <a href=\"/forge/repos\" title=\"Browse the repositories for {{entity.owner.username}}\">\n              <img src=\"{{entity.owner.avatar_url}}\" class=\"avatar-small-img\" ng-show=\"entity.owner.avatar_url\">\n            </a>\n            &nbsp;\n            <a href=\"/forge/repos\" title=\"Browse the repositories for {{entity.owner.username}}\">\n              {{entity.owner.username}}\n            </a>\n             &nbsp;/&nbsp;\n          </span>\n          {{entity.name}}\n        </h3>\n      </div>\n    </div>\n\n    <div class=\"git-clone-tabs\">\n      <div class=\"row\">\n        <div class=\"col-md-12\">\n          <div class=\"tabbable\">\n            <div value=\"ssh\" class=\"tab-pane\" title=\"SSH\" ng-show=\"entity.ssh_url\">\n              <div class=\"git-clone-panel\">\n                <p>to clone this git repository via <b>ssh</b> from the command line:</p>\n              </div>\n\n              <div class=\"highlight\">\n                <pre>\n                  <code>git clone {{entity.ssh_url}}</code>\n                </pre>\n              </div>\n            </div>\n\n            <div value=\"http\" class=\"tab-pane\" title=\"HTTP\" ng-show=\"entity.clone_url\">\n              <div class=\"git-clone-panel\">\n                <p>to clone this git repository via <b>http</b> from the command line:</p>\n              </div>\n\n              <div class=\"highlight\">\n                <pre>\n                  <code>git clone {{entity.clone_url}}</code>\n                </pre>\n              </div>\n            </div>\n          </div>\n        </div>\n      </div>\n    </div>\n  </div>\n</div>\n");
$templateCache.put("plugins/forge/html/repos.html","<div class=\"row\" ng-controller=\"Forge.ReposController\">\n  <div class=\"row\">\n    <div hawtio-breadcrumbs></div>\n  </div>\n\n  <div class=\"row\">\n    <div hawtio-tabs></div>\n  </div>\n\n  <div class=\"row\">\n    <div class=\"col-md-12\">\n      <hawtio-filter ng-model=\"tableConfig.filterOptions.filterText\"\n                     ng-show=\"projects.length\"\n                     css-class=\"input-xxlarge\"\n                     placeholder=\"Filter repositories...\"></hawtio-filter>\n      <!--\n            <span class=\"pull-right\">&nbsp;</span>\n            <button ng-show=\"fetched\"\n                    class=\"btn btn-danger pull-right\"\n                    ng-disabled=\"tableConfig.selectedItems.length == 0\"\n                    ng-click=\"delete(tableConfig.selectedItems)\">\n              <i class=\"fa fa-remove\"></i> Delete\n            </button>\n      -->\n      <span class=\"pull-right\">&nbsp;</span>\n      <a class=\"btn btn-primary pull-right\" href=\"{{$workspaceLink}}/forge/command/project-new\"\n         ng-show=\"login.loggedIn\"\n         title=\"Create a new project and repository\">\n        <i class=\"fa fa-plus\"></i> Create Project</a>\n      </a>\n      <span class=\"pull-right\">&nbsp;</span>\n      <a class=\"btn btn-default pull-right\" ng-click=\"logout()\" ng-show=\"login.loggedIn\"\n         title=\"Log out from the git repository\">\n        <i class=\"fa fa-sign-out\"></i> Log out</a>\n      </a>\n      <span class=\"pull-right\" ng-show=\"login.loggedIn\">&nbsp;</span>\n      <div class=\"user-icon-name pull-right\" ng-show=\"login.loggedIn\">\n        <img src=\"{{login.avatar_url}}\" class=\"avatar-small-img\" ng-show=\"login.avatar_url\">&nbsp;\n        {{login.user}}\n      </div>\n    </div>\n  </div>\n\n\n  <div ng-show=\"!login.authHeader || login.relogin\">\n    <div ng-show=\"login.failed\">\n      <div class=\"bg-danger\">\n        <div class=\"invalid-login align-center\">\n          <h3>Invalid login/password. Please try again!</h3>\n        </div>\n      </div>\n    </div>\n    <h2 ng-hide=\"login.failed\">Please login to the git repository</h2>\n\n    <form>\n      <div class=\"form-group\">\n        <label for=\"gitUsername\">User name</label>\n        <input type=\"text\" class=\"form-control\" id=\"gitUsername\" placeholder=\"Enter user name\" required=\"true\"\n               ng-model=\"login.user\">\n      </div>\n      <div class=\"form-group\">\n        <label for=\"gitPassword\">Password</label>\n        <input type=\"password\" class=\"form-control\" id=\"gitPassword\" placeholder=\"Password\" required=\"true\"\n               ng-model=\"login.password\">\n      </div>\n      <div class=\"form-group\">\n        <label for=\"gitEmail\">Email address</label>\n        <input type=\"email\" class=\"form-control\" id=\"gitEmail\" placeholder=\"Enter email\" required=\"true\"\n               ng-model=\"login.email\">\n      </div>\n      <div class=\"form-group\">\n        <button type=\"submit\" class=\"btn btn-primary\" ng-click=\"doLogin()\"\n                ng-disabled=\"!login.user || !login.password || !login.email\">\n          <i class=\"fa fa-sign-in\"></i> Sign In\n        </button>\n      </div>\n\n      <div class=\"form-group\" ng-show=\"forgotPasswordUrl\">\n          <a href=\"{{forgotPasswordUrl}}\">Forgot password?</a>\n      </div>\n\n      <div class=\"form-group\" ng-show=\"signUpUrl\">\n        <a href=\"{{signUpUrl}}\">Need an account? Sign up now.</a>\n      </div>\n    </form>\n  </div>\n\n  <div ng-hide=\"fetched || !login.authHeader || login.relogin\">\n    <div class=\"row\">\n      <div class=\"col-md-12\">\n        <div class=\"align-center\">\n          <i class=\"fa fa-spinner fa-spin\"></i>\n        </div>\n      </div>\n    </div>\n  </div>\n\n  <div ng-show=\"fetched && login.authHeader\">\n    <div ng-hide=\"projects.length\" class=\"align-center\">\n      <div class=\"padded-div\">\n        <div class=\"row\">\n          <div class=\"col-md-12\">\n            <p class=\"alert alert-info\">There are no git repositories yet. Please create one!</p>\n          </div>\n        </div>\n      </div>\n    </div>\n    <div ng-show=\"projects.length\">\n      <div class=\"row\">\n        <div class=\"col-md-12\">\n          <table class=\"table table-condensed table-striped\" hawtio-simple-table=\"tableConfig\"></table>\n        </div>\n      </div>\n    </div>\n  </div>\n</div>\n");
$templateCache.put("plugins/forge/html/secrets.html","<div ng-controller=\"Forge.SecretsController\">\n  <div class=\"row\">\n    <div hawtio-breadcrumbs></div>\n  </div>\n\n  <div class=\"row\">\n    <div hawtio-tabs></div>\n  </div>\n\n  <div class=\"row filter-header\" ng-show=\"filteredSecrets.length\">\n    <div class=\"col-md-12\">\n      <button class=\"btn btn-default pull-right\"\n              title=\"Cancel changes to this secret\"\n              ng-click=\"cancel()\">\n        Cancel\n      </button>\n      <span class=\"pull-right\">&nbsp;</span>\n      <button class=\"btn btn-primary pull-right\"\n              title=\"Saves changes to this secret\"\n              ng-disabled=\"!canSave()\"\n              ng-click=\"save()\">\n        Save Changes\n      </button>\n    </div>\n  </div>\n\n\n  <div ng-hide=\"fetched\">\n    <div class=\"row select-table-filter\">\n      <div class=\"col-md-12\">\n        <div class=\"align-center\">\n          <i class=\"fa fa-spinner fa-spin\"></i>\n        </div>\n      </div>\n    </div>\n  </div>\n\n\n  <div ng-show=\"fetched\">\n    <div class=\"row filter-header\">\n      <div class=\"col-md-12\">\n        <p>To be able to edit source code in a repository we need your secret (SSH keys or username &amp; password). The secrets are stored securely in your own\n          <a href=\"{{secretNamespaceLink}}\" title=\"View the namespace for your personal secrets\">personal namespace</a>.</p>\n      </div>\n    </div>\n\n    <div class=\"row\">\n      <div class=\"col-md-12\">\n        <form name=\"secretForm\" class=\"form-horizontal\">\n          <div class=\"form-group\" ng-hide=\"id\" ng-class=\"{\'has-error\': secretForm.$error.validator || !selectedSecretName}\">\n            <label class=\"col-sm-2 control-label\" for=\"secretName\">\n              Source Editing Secret\n              <a tabindex=\"0\" role=\"button\" data-toggle=\"popover\" data-trigger=\"focus\" data-html=\"true\" title=\"\"\n                 data-content=\"Select the secret used to clone and edit the git repository\" data-placement=\"top\"\n                 data-original-title=\"\">\n                <span class=\"fa fa-info-circle\"></span>\n              </a>\n            </label>\n\n            <div class=\"col-sm-4\">\n              <input type=\"text\" id=\"secretName\" name=\"secretName\" class=\"form-control\" ng-model=\"selectedSecretName\"\n                     required readonly>\n            </div>\n\n            <div ng-show=\"gitUrl\">\n              <label class=\"col-sm-2 control-label\" for=\"gitRepo\">\n                Repository\n                <a tabindex=\"0\" role=\"button\" data-toggle=\"popover\" data-trigger=\"focus\" data-html=\"true\" title=\"\"\n                   data-content=\"The git repository to edit the source code\" data-placement=\"top\"\n                   data-original-title=\"\">\n                  <span class=\"fa fa-info-circle\"></span>\n                </a>\n              </label>\n\n              <div class=\"col-sm-4\">\n                <input type=\"text\" id=\"gitRepo\" name=\"gitRepo\" class=\"form-control\" ng-model=\"gitUrl\" required readonly>\n              </div>\n            </div>\n          </div>\n        </form>\n      </div>\n    </div>\n\n    <div ng-hide=\"filteredSecrets.length\" class=\"align-center\">\n      <div class=\"row select-table-filter\">\n        <div class=\"col-md-12\">\n          <p class=\"alert alert-info\">There are currently no suitable secrets to choose from. Please create one.</p>\n        </div>\n      </div>\n      <div class=\"row\">\n        <div class=\"col-md-12 text-center\">\n          <a class=\"btn btn-primary\" href=\"{{addNewSecretLink}}\"\n             title=\"Create a new secret for editing the git repository for this project\">\n            <i class=\"fa fa-plus\"></i> Create Secret\n          </a>\n        </div>\n      </div>\n    </div>\n    <div ng-show=\"filteredSecrets.length\">\n      <div class=\"row select-table-filter\">\n        <div class=\"col-md-12\">\n          <div class=\" pull-right\">\n            <hawtio-filter ng-show=\"filteredSecrets.length > 1\"\n                           ng-model=\"tableConfig.filterOptions.filterText\"\n                           css-class=\"input-xxlarge\"\n                           placeholder=\"Filter secrets...\"></hawtio-filter>\n\n          </div>\n        </div>\n      </div>\n      <div class=\"row\">\n        <div class=\"col-md-12\">\n          <table class=\"table table-condensed table-striped\" hawtio-simple-table=\"tableConfig\"></table>\n        </div>\n      </div>\n      <div class=\"row\">\n        <div class=\"col-md-12 text-center\">\n          <a class=\"btn btn-default\" href=\"{{addNewSecretLink}}\"\n             title=\"Create a new secret for editing the git repository for this project\">\n            <i class=\"fa fa-plus\"></i> Create Secret\n          </a>\n        </div>\n      </div>\n    </div>\n\n  </div>\n</div>\n");
$templateCache.put("plugins/forge/html/secretsRequired.html","<div ng-controller=\"Forge.SecretsController\">\n  <div class=\"row\">\n    <div hawtio-breadcrumbs></div>\n  </div>\n\n  <div class=\"row\">\n    <div hawtio-tabs></div>\n  </div>\n\n  <div>\n    <div class=\"row filter-header\">\n      <div class=\"col-md-2\">\n      </div>\n      <div class=\"col-md-8 text-center\">\n        <div class=\"alert alert-info\">\n          <span class=\"pficon pficon-info\"></span>\n          <strong>To be able to create or edit a project you need to choose or setup a secret to work with the repository for the SSH keys or username &amp; password.</strong>\n        </div>\n      </div>\n    </div>\n\n    <div class=\"row\">\n      <div class=\"col-md-12 text-center\">\n        <a class=\"btn btn-primary btn-lg\" href=\"{{setupSecretsLink}}\"\n           title=\"Setup the secrets so that you can edit this project\">\n          Setup Source Secret\n        </a>\n      </div>\n    </div>\n\n  </div>\n</div>\n");
$templateCache.put("plugins/main/html/about.html","<div ng-controller=\"Main.About\">\n  <p>Version: {{info.version}}</p>\n  <p>Commit ID: {{info.commitId}}</p>\n  <table class=\"table table-striped\">\n    <thead>\n      <tr>\n        <th>\n          Name\n        </th>\n        <th>\n          Version\n        </th>\n      </tr>\n    </thead>\n    <tbody>\n      <tr ng-repeat=\"(key, info) in info.packages\">\n        <td>{{key}}</td>\n        <td>{{info.version || \'--\'}}</td>\n      </tr>\n    </tbody>\n  </table>\n</div>\n");
$templateCache.put("plugins/wiki/exemplar/document.html","<h2>This is a title</h2>\n\n<p>Here are some notes</p>");
$templateCache.put("plugins/wiki/html/camelCanvas.html","<div ng-controller=\"Wiki.CamelController\">\n  <div class=\"camel-canvas-page\" ng-controller=\"Wiki.CamelCanvasController\">\n\n      <ng-include src=\"\'plugins/wiki/html/camelNavBar.html\'\"></ng-include>\n\n      <script type=\"text/ng-template\"\n              id=\"nodeTemplate\">\n        <div class=\"component window\"\n             id=\"{{id}}\"\n             title=\"{{node.tooltip}}\">\n          <div class=\"window-inner {{node.type}}\">\n            <img class=\"nodeIcon\"\n                 title=\"Click and drag to create a connection\"\n                 src=\"{{node.imageUrl}}\">\n          <span class=\"nodeText\"\n                title=\"{{node.label}}\">{{node.label}}</span>\n          </div>\n        </div>\n      </script>\n\n\n      <div class=\"row\">\n          <ul class=\"nav nav-tabs\">\n            <!-- navigation tabs -->\n            <li ng-repeat=\"nav in camelSubLevelTabs\" ng-show=\"isValid(nav)\" ng-class=\"{active : isActive(nav)}\">\n              <a ng-href=\"{{nav.href()}}{{hash}}\" title=\"{{nav.title}}\"\n                data-placement=\"bottom\" ng-bind-html=\"nav.content\"></a></li>\n\n            <!-- controls -->\n            <li class=\"pull-right\">\n              <a href=\'\' title=\"Add new pattern node connecting to this pattern\" ng-click=\"addDialog.open()\"\n                 data-placement=\"bottom\">\n                 <i class=\"icon-plus\"></i> Add</a></li>\n\n            <li class=\"pull-right\">\n              <a href=\'\' title=\"Automatically layout the diagram \" ng-click=\"doLayout()\"\n                 data-placement=\"bottom\">\n                <i class=\"icon-magic\"></i> Layout</a></li>\n\n            <li class=\"pull-right\" style=\"margin-top: 0; margin-bottom: 0;\">\n            </li>\n\n            <!--\n            <li class=\"pull-right\">\n              <a href=\'\' title=\"Edit the properties for the selected node\" ng-disabled=\"!selectedFolder\"\n                 ng-click=\"propertiesDialog.open()\"\n                 data-placement=\"bottom\">\n                <i class=\"icon-edit\"></i> Properties</a></li>\n                -->\n          </ul>\n\n          <div class=\"modal-large\">\n            <div modal=\"addDialog.show\" close=\"addDialog.close()\" ng-options=\"addDialog.options\">\n              <form class=\"form-horizontal no-bottom-margin\" ng-submit=\"addAndCloseDialog()\">\n                <div class=\"modal-header\"><h4>Add Node</h4></div>\n                <div class=\"modal-body\">\n                  <tabset>\n                    <tab heading=\"Patterns\">\n                      <div hawtio-tree=\"paletteTree\" hideRoot=\"true\" onSelect=\"onPaletteSelect\"\n                           activateNodes=\"paletteActivations\"></div>\n                    </tab>\n                    <tab heading=\"Endpoints\">\n                      <div hawtio-tree=\"componentTree\" hideRoot=\"true\" onSelect=\"onComponentSelect\"\n                           activateNodes=\"componentActivations\"></div>\n                    </tab>\n                  </tabset>\n                </div>\n                <div class=\"modal-footer\">\n                  <input id=\"submit\" class=\"btn btn-primary add\" type=\"submit\"\n                         ng-disabled=\"!selectedPaletteNode && !selectedComponentNode\"\n                         value=\"Add\">\n                  <button class=\"btn btn-warning cancel\" type=\"button\" ng-click=\"addDialog.close()\">Cancel</button>\n                </div>\n              </form>\n            </div>\n          </div>\n\n\n          <!--\n          <div modal=\"propertiesDialog.show\" close=\"propertiesDialog.close()\" ng-options=\"propertiesDialog.options\">\n            <form class=\"form-horizontal no-bottom-margin\" ng-submit=\"updatePropertiesAndCloseDialog()\">\n              <div class=\"modal-header\"><h4>Properties</h4></div>\n              <div class=\"modal-body\">\n\n                <div ng-show=\"!selectedEndpoint\"> -->\n          <!-- pattern form --> <!--\n                <div simple-form name=\"formEditor\" entity=\'nodeData\' data=\'nodeModel\' schema=\"schema\"\n                     onsubmit=\"updatePropertiesAndCloseDialog\"></div>\n              </div>\n              <div ng-show=\"selectedEndpoint\"> -->\n          <!-- endpoint form -->\n          <!--\n          <div class=\"control-group\">\n            <label class=\"control-label\" for=\"endpointPath\">Endpoint</label>\n\n            <div class=\"controls\">\n              <input id=\"endpointPath\" class=\"col-md-10\" type=\"text\" ng-model=\"endpointPath\" placeholder=\"name\"\n                     typeahead=\"title for title in endpointCompletions($viewValue) | filter:$viewValue\"\n                     typeahead-editable=\'true\'\n                     min-length=\"1\">\n            </div>\n          </div>\n          <div simple-form name=\"formEditor\" entity=\'endpointParameters\' data=\'endpointSchema\'\n               schema=\"schema\"></div>\n        </div>\n\n\n      </div>\n      <div class=\"modal-footer\">\n        <input class=\"btn btn-primary add\" type=\"submit\" ng-click=\"updatePropertiesAndCloseDialog()\" value=\"OK\">\n        <button class=\"btn btn-warning cancel\" type=\"button\" ng-click=\"propertiesDialog.close()\">Cancel</button>\n      </div>\n    </form>\n  </div>\n  -->\n\n      </div>\n\n      <div class=\"panes\" hawtio-window-height>\n        <div class=\"left-pane\">\n          <div class=\"camel-viewport camel-canvas\">\n            <div style=\"position: relative;\" class=\"canvas\"></div>\n          </div>\n        </div>\n        <div class=\"right-pane\">\n          <div class=\"camel-props\">\n            <div class=\"button-bar\">\n              <div class=\"centered\">\n                <form class=\"form-inline\">\n                  <label>Route: </label>\n                  <select ng-model=\"selectedRouteId\" ng-options=\"routeId for routeId in routeIds\"></select>\n                </form>\n                <div class=\"btn-group\">\n                  <button class=\"btn\"\n                          title=\"{{getDeleteTitle()}}\"\n                          ng-click=\"removeNode()\"\n                          data-placement=\"bottom\">\n                    <i class=\"icon-remove\"></i> Delete {{getDeleteTarget()}}\n                  </button>\n                  <button class=\"btn\"\n                          title=\"Apply any changes to the endpoint properties\"\n                          ng-disabled=\"!isFormDirty()\"\n                          ng-click=\"updateProperties()\">\n                    <i class=\"icon-ok\"></i> Apply\n                  </button>\n                  <!-- TODO Would be good to have this too\n                  <button class=\"btn\"\n                          title=\"Clear any changes to the endpoint properties\"\n                          ng-disabled=\"!isFormDirty()\"\n                          ng-click=\"resetForms()\">\n                    <i class=\"icon-remove\"></i> Cancel</button> -->\n                </div>\n              </div>\n            </div>\n            <div class=\"prop-viewport\">\n\n              <div>\n                <!-- pattern form -->\n                <div ng-show=\"!selectedEndpoint\">\n                  <div hawtio-form-2=\"nodeModel\"\n                       name=\"formEditor\"\n                       entity=\"nodeData\"\n                       data=\"nodeModel\"\n                       schema=\"schema\"\n                       onsubmit=\"updateProperties\"></div>\n                </div>\n\n                <!-- endpoint form -->\n                <div class=\"endpoint-props\" ng-show=\"selectedEndpoint\">\n                  <p>Endpoint</p>\n\n                  <form name=\"endpointForm\">\n                    <div class=\"control-group\">\n                      <label class=\"control-label\" for=\"endpointPath\">URI:</label>\n\n                      <div class=\"controls\">\n                        <input id=\"endpointPath\" class=\"col-md-10\" type=\"text\" ng-model=\"endpointPath\"\n                               placeholder=\"name\"\n                               typeahead=\"title for title in endpointCompletions($viewValue) | filter:$viewValue\"\n                               typeahead-editable=\'true\'\n                               min-length=\"1\">\n                      </div>\n                    </div>\n                  </form>\n\n                  <div simple-form\n                       name=\"formEditor\"\n                       entity=\'endpointParameters\'\n                       data=\'endpointSchema\'\n                       schema=\"schema\"\n                       onsubmit=\"updateProperties\"></div>\n                </div>\n\n              </div>\n            </div>\n          </div>\n        </div>\n      </div>\n\n      <div hawtio-confirm-dialog=\"switchToTreeView.show\" ok-button-text=\"Yes\" cancel-button-text=\"No\"\n           on-ok=\"doSwitchToTreeView()\" title=\"You have unsaved changes\">\n        <div class=\"dialog-body\">\n          <p>Unsaved changes will be discarded. Do you really want to switch views?</p>\n        </div>\n      </div>\n\n  </div>\n</div>\n");
$templateCache.put("plugins/wiki/html/camelDiagram.html","<div ng-include=\"diagramTemplate\"></div>\n");
$templateCache.put("plugins/wiki/html/camelNavBar.html","<div class=\"wiki source-nav-widget\" ng-controller=\"Wiki.NavBarController\">\n  <div class=\"inline-block app-path\" hawtio-breadcrumbs></div>\n  <div class=\"inline-block source-path\">\n    <ol class=\"breadcrumb\">\n      <li ng-repeat=\"link in breadcrumbs\" ng-class=\'{active : isActive(link.href) && !objectId}\'>\n        <a class=\"breadcrumb-link\" ng-href=\"{{link.href}}\">\n          <span class=\"contained c-medium\">{{link.name}}</span>\n        </a>\n      </li>\n      <li ng-show=\"objectId\">\n        <a ng-href=\"{{historyLink}}{{hash}}\">History</a>\n      </li>\n      <li ng-show=\"objectId\" class=\"active\">\n        <a>{{objectId}}</a>\n      </li>\n    </ol>\n  </div>\n  <ul class=\"pull-right nav nav-tabs\">\n    <!--\n    <li ng-repeat=\"link in breadcrumbs\" ng-class=\'{active : isActive(link.href)}\'>\n      <a ng-href=\"{{link.href}}{{hash}}\">{{link.name}}</a>\n    </li>\n    -->\n\n    <!--\n    <li class=\"pull-right\">\n      <a ng-href=\"{{editLink()}}{{hash}}\" ng-hide=\"!editLink()\" title=\"Edit this camel configuration\"\n        data-placement=\"bottom\">\n        <i class=\"icon-edit\"></i> Edit</a></li>\n    <li class=\"pull-right\" ng-show=\"sourceLink()\">\n      -->\n      <li class=\"pull-right\">\n        <a ng-href=\"\" id=\"saveButton\" ng-disabled=\"!modified\" ng-click=\"save(); $event.stopPropagation();\"\n          ng-class=\"{\'nav-primary\' : modified, \'nav-primary-disabled\' : !modified}\"\n          title=\"Saves the Camel document\">\n          <i class=\"icon-save\"></i> Save</a>\n      </li>\n      <!--<li class=\"pull-right\">-->\n        <!--<a href=\"\" id=\"cancelButton\" ng-click=\"cancel()\"-->\n          <!--title=\"Discards any updates\">-->\n          <!--<i class=\"icon-remove\"></i> Cancel</a>-->\n        <!--</li>-->\n\n      <li class=\"pull-right\">\n        <a ng-href=\"{{sourceLink()}}\" title=\"View source code\"\n          data-placement=\"bottom\">\n          <i class=\"icon-file-alt\"></i> Source</a>\n      </li>\n    </ul>\n</div>\n");
$templateCache.put("plugins/wiki/html/camelProperties.html","<div ng-controller=\"Wiki.CamelController\" class=\"camel-properties-page\">\n\n  <ng-include src=\"\'plugins/wiki/html/camelNavBar.html\'\"></ng-include>\n\n  <div class=\"row\">\n    <div class=\"col-md-12\" ng-include=\"\'plugins/wiki/html/camelSubLevelTabs.html\'\"></div>\n  </div>\n\n  <div class=\"row\">\n    <div id=\"tree-container\" class=\"col-md-3\" ng-controller=\"Camel.TreeController\">\n      <div hawtio-tree=\"camelContextTree\" onselect=\"onNodeSelect\" onDragEnter=\"onNodeDragEnter\" onDrop=\"onNodeDrop\"\n        onRoot=\"onRootTreeNode\"\n        hideRoot=\"true\"></div>\n    </div>\n\n    <div class=\"col-md-9\">\n      <div ng-include=\"propertiesTemplate\"></div>\n    </div>\n  </div>\n\n  <div hawtio-confirm-dialog=\"switchToCanvasView.show\" ok-button-text=\"Yes\" cancel-button-text=\"No\"\n    on-ok=\"doSwitchToCanvasView()\" title=\"You have unsaved changes\">\n    <div class=\"dialog-body\">\n      <p>Unsaved changes will be discarded. Do you really want to switch views?</p>\n    </div>\n  </div>\n\n</div>\n");
$templateCache.put("plugins/wiki/html/camelPropertiesEdit.html","<div simple-form name=\"formEditor\" entity=\'nodeData\' data=\'nodeModel\' schema=\"schema\"></div>\n");
$templateCache.put("plugins/wiki/html/camelSubLevelTabs.html","<ul class=\"nav nav-tabs\">\n\n  <!--\n  <li ng-class=\"{ active : isActive({ id: \'canvas\' }) }\">\n    <a href=\'\' ng-click=\'confirmSwitchToCanvasView()\' title=\"Edit the diagram in a draggy droppy way\"\n        data-placement=\"bottom\">\n        <i class=\"fa fa-icon-picture\"></i> Canvas</a>\n    </li>\n    -->\n\n  <li ng-repeat=\"nav in camelSubLevelTabs\" ng-show=\"isValid(nav)\" ng-class=\"{active : isActive(nav)}\">\n    <a ng-href=\"{{nav.href()}}{{hash}}\" title=\"{{nav.title}}\"\n       data-placement=\"bottom\" ng-bind-html=\"nav.content\"></a></li>\n\n  <li class=\"pull-right\">\n    <a href=\'\' title=\"Add new pattern node connecting to this pattern\" ng-click=\"addNode()\" data-placement=\"bottom\">\n      <i class=\"icon-plus\"></i> Add</a></li>\n\n  <li class=\"pull-right\">\n    <a href=\'\' title=\"Deletes the selected pattern\" ng-disabled=\"!canDelete()\" ng-click=\"removeNode()\" data-placement=\"bottom\">\n      <i class=\"icon-remove\"></i> Delete</a></li>\n\n</ul>\n\n<div modal=\"addDialog.show\" close=\"addDialog.close()\" ng-options=\"addDialog.options\">\n  <form class=\"form-horizontal no-bottom-margin\" ng-submit=\"addAndCloseDialog()\">\n    <div class=\"modal-header\"><h4>Add Node</h4></div>\n    <div class=\"modal-body\">\n      <div hawtio-tree=\"paletteTree\" hideRoot=\"true\" onSelect=\"onPaletteSelect\" activateNodes=\"paletteActivations\"></div>\n    </div>\n    <div class=\"modal-footer\">\n      <input id=\"submit\" class=\"btn btn-primary add\" type=\"submit\" ng-disabled=\"!selectedPaletteNode\" value=\"Add\">\n      <button class=\"btn btn-warning cancel\" type=\"button\" ng-click=\"addDialog.close()\">Cancel</button>\n      </div>\n    </form>\n  </div>\n</div>\n");
$templateCache.put("plugins/wiki/html/commit.html","<div ng-controller=\"Wiki.CommitController\">\n  <script type=\"text/ng-template\" id=\"fileCellTemplate.html\">\n    <div class=\"ngCellText\">\n      <a ng-href=\"{{row.entity.fileLink}}\" class=\"file-name text-nowrap\" title=\"{{row.entity.title}}\">\n        <span ng-class=\"row.entity.changeClass\"></span>\n        <span class=\"file-icon\" ng-class=\"row.entity.fileClass\" ng-bind-html=\"row.entity.fileIconHtml\"></span>\n        {{row.entity.path}}\n      </a>\n    </div>\n  </script>\n  <script type=\"text/ng-template\" id=\"viewDiffTemplate.html\">\n    <div class=\"ngCellText\">\n      <a ng-href=\"{{row.entity.$diffLink}}\" ng-show=\"row.entity.$diffLink\" title=\"View the actual changes to this change\">\n        View Diff\n      </a>\n    </div>\n  </script>\n\n  <div ng-hide=\"inDashboard\" class=\"row\">\n    <div hawtio-breadcrumbs></div>\n  </div>\n\n  <div ng-hide=\"inDashboard\" class=\"wiki logbar\" ng-controller=\"Wiki.NavBarController\">\n    <div class=\"wiki logbar-container\">\n      <ul class=\"nav nav-tabs\">\n        <li ng-show=\"branches.length || branch\" class=\"dropdown\">\n          <a href=\"#\" class=\"dropdown-toggle\" data-toggle=\"dropdown\"\n             title=\"The branch to view\">\n            {{branch || \'branch\'}}\n            <span class=\"caret\"></span>\n          </a>\n          <ul class=\"dropdown-menu\">\n            <li ng-repeat=\"otherBranch in branches\">\n              <a ng-href=\"{{branchLink(otherBranch)}}{{hash}}\"\n                 ng-hide=\"otherBranch === branch\"\n                 title=\"Switch to the {{otherBranch}} branch\"\n                 data-placement=\"bottom\">\n                {{otherBranch}}</a>\n            </li>\n          </ul>\n        </li>\n        <li ng-repeat=\"link in breadcrumbs\">\n          <a ng-href=\"{{link.href}}{{hash}}\">{{link.name}}</a>\n        </li>\n        <li>\n          <a ng-href=\"{{historyLink}}{{hash}}\">History</a>\n        </li>\n        <li title=\"{{commitInfo.shortMessage}}\" class=\"active\">\n          <a class=\"commit-id\">{{commitInfo.commitHashText}}</a>\n        </li>\n        <li class=\"pull-right\">\n        <span class=\"commit-author\">\n          <i class=\"fa fa-user\"></i> {{commitInfo.author}}\n        </span>\n        </li>\n        <li class=\"pull-right\">\n          <span class=\"commit-date\">{{commitInfo.date | date: dateFormat}}</span>\n        </li>\n      </ul>\n    </div>\n  </div>\n\n  <div class=\"wiki-fixed row\">\n    <div class=\"commit-message\" title=\"{{commitInfo.shortMessage}}\">\n      {{commitInfo.trimmedMessage}}\n    </div>\n  </div>\n\n  <div class=\"row filter-header\">\n    <div class=\"col-md-12\">\n      <hawtio-filter ng-model=\"gridOptions.filterOptions.filterText\"\n                     css-class=\"input-xxlarge\"\n                     placeholder=\"Filter...\"></hawtio-filter>\n\n      <span class=\"pull-right\">&nbsp;</span>\n      <a class=\"btn btn-default pull-right\" ng-disabled=\"!gridOptions.selectedItems.length\" ng-click=\"diff()\"\n         title=\"Compare the selected versions of the files to see how they differ\">\n        <i class=\"fa fa-exchange\"></i>\n        Compare\n      </a>\n    </div>\n  </div>\n\n  <div class=\"form-horizontal\">\n    <div class=\"row\">\n      <table class=\"table-condensed table-striped\" hawtio-simple-table=\"gridOptions\"></table>\n    </div>\n  </div>\n\n</div>\n");
$templateCache.put("plugins/wiki/html/commitDetail.html","<div ng-controller=\"Wiki.CommitDetailController\">\n  <div class=\"row\">\n    <div class=\"wiki source-nav-widget\">\n      <div class=\"inline-block app-path\" hawtio-breadcrumbs></div>\n      <div class=\"inline-block source-path\">\n        <ol class=\"breadcrumb\">\n          <li ng-repeat=\"link in breadcrumbs\" ng-class=\'{active : isActive(link.href) && !objectId}\'>\n            <a class=\"breadcrumb-link\" ng-href=\"{{link.href}}\">\n              <span class=\"contained c-medium\">{{link.name}}</span>\n            </a>\n          </li>\n          <li class=\"\">\n            <a ng-href=\"{{historyLink}}{{hash}}\">History</a>\n          </li>\n          <li class=\"active\">\n            <a title=\"{{commitDetail.commit_info.sha}}\">{{commitDetail.commit_info.sha | limitTo:7}}</a>\n          </li>\n        </ol>\n      </div>\n\n\n      <!--\n              <li class=\"pull-right\" hawtio-show object-name=\"{{gitMBean}}\" method-name=\"write\">\n                <a class=\"btn\" href=\"\" ng-disabled=\"!gridOptions.selectedItems.length\" ng-click=\"diff()\"\n                  title=\"Compare the selected versions of the files to see how they differ\">\n                  <i class=\"fa fa-exchange\"></i> Compare\n                </a>\n              </li>\n              <li class=\"pull-right\">\n                <a class=\"btn\" href=\"\" ng-disabled=\"!canRevert()\" ng-click=\"revert()\"\n                  title=\"Revert to this version of the file\" hawtio-show object-name=\"{{gitMBean}}\"\n                  method-name=\"revertTo\">\n                  <i class=\"fa fa-exchange\"></i> Revert\n                </a>\n              </li>\n      -->\n    </div>\n  </div>\n\n  <!--\n    <div class=\"row\">\n      <div class=\"col-md-12\">\n        <div class=\"control-group\">\n          <input class=\"col-md-12 search-query\" type=\"text\" ng-model=\"filterText\"\n                 placeholder=\"search\">\n        </div>\n      </div>\n    </div>\n  -->\n\n  <div class=\"row\"  ng-show=\"commit\">\n    <div class=\"col-md-12\">\n      <div class=\"commit-summary-panel\">\n        <p class=\"commit-history-message bg-info\">{{commit.short_message}}</p>\n      </div>\n    </div>\n  </div>\n\n  <div class=\"row\"  ng-show=\"commit\">\n    <div class=\"col-md-12\">\n      <table class=\"commit-table\">\n        <tr class=\"commit-row\">\n          <td class=\"commit-avatar\" title=\"{{commit.name}}\">\n            <img ng-show=\"commit.avatar_url\" src=\"{{commit.avatar_url}}\"/>\n          </td>\n          <td>\n            <p class=\"commit-details text-nowrap\">\n              <span class=\"commit-history-author\">{{commit.author}}</span>\n              <span class=\"\"> committed </span>\n              <span class=\"commit-date\" title=\"{{commit.$date | date:\'EEE, MMM d, yyyy : HH:mm:ss Z\'}}\">{{commit.$date.relative()}}</span>\n            </p>\n          </td>\n          <td>\n            commit\n            <span class=\"commit-sha\">{{commit.sha}}</span>\n        </tr>\n      </table>\n    </div>\n  </div>\n\n\n  <div ng-repeat=\"diff in commitDetail.diffs | filter:filterText track by $index\">\n    <div class=\"row\">\n      <div class=\"col-md-12\">\n        <div class=\"diff-panel\">\n          <div class=\"diff-filename\">\n            <a href=\"{{diff.$viewLink}}\">{{diff.new_path}}</a>\n          </div>\n          <div class=\"diff-delta\">\n            <textarea id=\"source\" ui-codemirror=\"codeMirrorOptions\" ng-model=\"diff.diff\"></textarea>\n          </div>\n        </div>\n      </div>\n    </div>\n  </div>\n\n</div>\n");
$templateCache.put("plugins/wiki/html/configuration.html","<div ng-hide=\"inDashboard\" class=\"logbar\" ng-controller=\"Wiki.NavBarController\">\n  <div class=\"wiki logbar-container\">\n    <ul class=\"nav nav-tabs\">\n      <li ng-show=\"branches.length || branch\" class=\"dropdown\">\n        <a href=\"#\" class=\"dropdown-toggle\" data-toggle=\"dropdown\"\n           title=\"The branch to view\">\n          {{branch || \'branch\'}}\n          <span class=\"caret\"></span>\n        </a>\n        <ul class=\"dropdown-menu\">\n          <li ng-repeat=\"otherBranch in branches\">\n            <a ng-href=\"{{branchLink(otherBranch)}}{{hash}}\"\n               ng-hide=\"otherBranch === branch\"\n               title=\"Switch to the {{otherBranch}} branch\"\n               data-placement=\"bottom\">\n              {{otherBranch}}</a>\n          </li>\n        </ul>\n      </li>\n      <li ng-repeat=\"link in breadcrumbs\">\n        <a ng-href=\"{{link.href}}{{hash}}\">{{link.name}}</a>\n      </li>\n      <li class=\"ng-scope\">\n        <a ng-href=\"{{startLink}}/configurations/{{pageId}}\">configuration</a>\n      </li>\n      <li class=\"ng-scope active\">\n        <a>pid</a>\n      </li>\n    </ul>\n  </div>\n</div>\n<div class=\"wiki-fixed\">\n  <div class=\"controller-section\" ng-controller=\"Osgi.PidController\">\n    <div ng-include src=\"\'plugins/osgi/html/pid-details.html\'\"></div>\n  </div>\n</div>\n");
$templateCache.put("plugins/wiki/html/configurations.html","<div ng-hide=\"inDashboard\" class=\"logbar\" ng-controller=\"Wiki.NavBarController\">\n  <div class=\"wiki logbar-container\">\n    <ul class=\"nav nav-tabs\">\n      <li ng-show=\"branches.length || branch\" class=\"dropdown\">\n        <a href=\"#\" class=\"dropdown-toggle\" data-toggle=\"dropdown\"\n           title=\"The branch to view\">\n          {{branch || \'branch\'}}\n          <span class=\"caret\"></span>\n        </a>\n        <ul class=\"dropdown-menu\">\n          <li ng-repeat=\"otherBranch in branches\">\n            <a ng-href=\"{{branchLink(otherBranch)}}{{hash}}\"\n               ng-hide=\"otherBranch === branch\"\n               title=\"Switch to the {{otherBranch}} branch\"\n               data-placement=\"bottom\">\n              {{otherBranch}}</a>\n          </li>\n        </ul>\n      </li>\n      <li ng-repeat=\"link in breadcrumbs\">\n        <a ng-href=\"{{link.href}}{{hash}}\">{{link.name}}</a>\n      </li>\n      <li class=\"ng-scope active\">\n        <a>configuration</a>\n      </li>\n    </ul>\n  </div>\n</div>\n\n<div class=\"wiki-fixed\">\n  <div ng-include src=\"\'plugins/osgi/html/configurations.html\'\"></div>\n</div>\n");
$templateCache.put("plugins/wiki/html/create.html","<div class=\"row\" ng-controller=\"Wiki.CreateController\">\n  <div class=\"row\">\n    <div hawtio-breadcrumbs></div>\n  </div>\n\n  <div class=\"row\">\n    <div class=\"col-md-12\">\n      <form name=\"createForm\"\n            novalidate\n            class=\"form-horizontal no-bottom-margin\"\n            ng-submit=\"addAndCloseDialog(newDocumentName)\">\n        <fieldset>\n\n          <div class=\"row\">\n            <div class=\"col-md-12\">\n              <h4>Create Document</h4>\n            </div>\n          </div>\n\n          <div class=\"row\">\n            <div class=\"col-md-6\">\n              <treecontrol class=\"tree-classic\"\n                 tree-model=\"createDocumentTree\"\n                 options=\"treeOptions\"\n                 on-selection=\"onCreateDocumentSelect(node)\">\n                 {{node.name}}\n              </treecontrol>\n              <!--\n              <div hawtio-tree=\"createDocumentTree\"\n                     hideRoot=\"true\"\n                     onSelect=\"onCreateDocumentSelect\"\n                     activateNodes=\"createDocumentTreeActivations\"></div>\n-->\n            </div>\n            <div class=\"col-md-6\">\n              <div class=\"row\">\n                <div class=\"well\">\n                  {{selectedCreateDocumentTemplate.tooltip}}\n                </div>\n              </div>\n              <div class=\"row\">\n                <div ng-show=\"fileExists.exists\" class=\"alert\">\n                  Please choose a different name as <b>{{fileExists.name}}</b> already exists\n                </div>\n                <div ng-show=\"fileExtensionInvalid\" class=\"alert\">\n                  {{fileExtensionInvalid}}\n                </div>\n                <div ng-show=\"!createForm.$valid\" class=\"alert\">\n                  {{selectedCreateDocumentTemplateInvalid}}\n                </div>\n\n                <div class=\"form-group\">\n                  <label class=\"col-sm-2 control-label\" for=\"fileName\">Name: </label>\n                  <div class=\"col-sm-10\">\n                    <input name=\"fileName\" id=\"fileName\"\n                           class=\"form-control\"\n                           type=\"text\"\n                           ng-pattern=\"selectedCreateDocumentTemplateRegex\"\n                           ng-model=\"newDocumentName\"\n                           placeholder=\"{{selectedCreateDocumentTemplate.exemplar}}\">\n                  </div>\n                </div>\n              </div>\n              <div class=\"row\">\n                <div simple-form data=\"formSchema\" entity=\"formData\" onSubmit=\"generate()\"></div>\n              </div>\n              <div class=\"row\">\n                <input class=\"btn btn-primary add pull-right\"\n                       type=\"submit\"\n                       ng-disabled=\"!selectedCreateDocumentTemplate.exemplar || !createForm.$valid\"\n                       value=\"Create\">\n                <span class=\"pull-right\">&nbsp;</span>\n                <button class=\"btn btn-warning cancel pull-right\" type=\"button\" ng-click=\"cancel()\">Cancel</button>\n              </div>\n            </div>\n            <div class=\"col-md-2\">\n            </div>\n          </div>\n        </fieldset>\n      </form>\n    </div>\n  </div>\n\n</div>\n");
$templateCache.put("plugins/wiki/html/createPage.html","<div ng-controller=\"Wiki.EditController\">\n  <div class=\"logbar\" ng-controller=\"Wiki.NavBarController\">\n\n    <div class=\"wiki logbar-container\">\n\n      <ul class=\"connected nav nav-tabs\">\n        <li ng-repeat=\"link in breadcrumbs\" ng-class=\'{active : isActive(link.href)}\'>\n          <a ng-href=\"{{link.href}}{{hash}}\">\n            {{link.name}}\n          </a>\n        </li>\n\n        <li class=\"pull-right\">\n\n          <a href=\"\" id=\"cancelButton\" ng-click=\"cancel()\"\n                  class=\"pull-right\"\n                  title=\"Discards any updates\">\n            <i class=\"fa fa-remove\"></i> Cancel\n          </a>\n        </li>\n\n        <li class=\"pull-right\">\n          <a href=\"\" id=\"saveButton\" ng-show=\"isValid()\" ng-click=\"create()\"\n                  class=\"pull-right\"\n                  title=\"Creates this page and saves it in the wiki\">\n            <i class=\"fa fa-file-o\"></i> Create\n          </a>\n        </li>\n\n      </ul>\n    </div>\n  </div>\n\n  <div class=\"wiki-fixed form-horizontal\">\n    <div class=\"control-group\">\n      <input type=\"text\" ng-model=\"fileName\" placeholder=\"File name\" class=\"col-md-12\"/>\n    </div>\n    <div class=\"control-group\">\n      <div ng-include=\"sourceView\" class=\"editor-autoresize\"></div>\n    </div>\n  </div>\n</div>\n");
$templateCache.put("plugins/wiki/html/dozerMappings.html","<div class=\"wiki-fixed\" ng-controller=\"Wiki.DozerMappingsController\">\n  <div class=\"logbar\" ng-controller=\"Wiki.NavBarController\">\n    <div class=\"wiki logbar-container\">\n      <ul class=\"nav nav-tabs connected\">\n        <li ng-repeat=\"link in breadcrumbs\" ng-class=\'{active : isActive(link.href)}\'>\n          <a ng-href=\"{{link.href}}{{hash}}\">{{link.name}}</a>\n        </li>\n\n        <!--\n                <li class=\"pull-right\">\n                  <a ng-href=\"{{editLink()}}{{hash}}\" ng-hide=\"!editLink()\" title=\"Edit this camel configuration\"\n                     data-placement=\"bottom\">\n                    <i class=\"fa fa-edit\"></i> Edit</a></li>\n                <li class=\"pull-right\" ng-show=\"sourceLink()\">\n        -->\n        <li class=\"pull-right\">\n          <a href=\"\" id=\"saveButton\" ng-disabled=\"!isValid()\" ng-click=\"save()\"\n             ng-class=\"{\'nav-primary\' : modified}\"\n             title=\"Saves the Mappings document\">\n            <i class=\"fa fa-save\"></i> Save</a>\n        </li>\n        <li class=\"pull-right\">\n          <a href=\"\" id=\"cancelButton\" ng-click=\"cancel()\"\n             title=\"Discards any updates\">\n            <i class=\"fa fa-remove\"></i> Cancel</a>\n        </li>\n\n        <li class=\"pull-right\">\n          <a ng-href=\"{{sourceLink()}}\" title=\"View source code\"\n             data-placement=\"bottom\">\n            <i class=\"fa fa-file-o\"></i> Source</a>\n        </li>\n      </ul>\n    </div>\n  </div>\n\n  <div class=\"tabbable hawtio-form-tabs\" ng-model=\"tab\" ng-hide=\"missingContainer\">\n\n    <div class=\"tab-pane\" title=\"Mappings\">\n\n      <div class=\"row\">\n        <div class=\"col-md-12 centered spacer\">\n          <select class=\"no-bottom-margin\" ng-model=\"selectedMapping\" ng-options=\"m.map_id for m in mappings\"></select>\n          <button class=\"btn\"\n                  ng-click=\"addMapping()\"\n                  title=\"Add mapping\">\n            <i class=\"fa fa-plus\"></i>\n          </button>\n          <button class=\"btn\"\n                  ng-click=\"deleteDialog = true\"\n                  title=\"Delete mapping\">\n            <i class=\"fa fa-minus\"></i>\n          </button>\n          &nbsp;\n          &nbsp;\n          <label class=\"inline-block\" for=\"map_id\">Map ID: </label>\n          <input id=\"map_id\" type=\"text\" class=\"input-xxlarge no-bottom-margin\" ng-model=\"selectedMapping.map_id\">\n        </div>\n      </div>\n\n      <div class=\"row\">\n        <!-- \"From\" class header -->\n        <div class=\"col-md-5\">\n          <div class=\"row\">\n            <input type=\"text\" class=\"col-md-12\"\n                   ng-model=\"aName\"\n                   typeahead=\"title for title in classNames($viewValue) | filter:$viewValue\"\n                   typeahead-editable=\"true\" title=\"Java classname for class \'A\'\"\n                   placeholder=\"Java classname for class \'A\'\">\n          </div>\n          <div class=\"row\" ng-show=\"selectedMapping.class_a.error\">\n            <div class=\"alert alert-error\">\n              <div class=\"expandable closed\">\n                <div class=\"title\">\n                  <i class=\"expandable-indicator\"></i> Failed to load properties for {{selectedMapping.class_a.value}} due to {{selectedMapping.class_a.error.type}}\n                </div>\n                <div class=\"expandable-body well\">\n                  <div ng-bind-html-unsafe=\"formatStackTrace(selectedMapping.class_a.error.stackTrace)\"></div>\n                </div>\n              </div>\n            </div>\n          </div>\n        </div>\n\n        <div class=\"col-md-2 centered\">\n          <button class=\"btn\" ng-click=\"doReload()\" ng-disabled=\"disableReload()\"><i class=\"fa fa-refresh\"></i> Reload</button>\n        </div>\n\n        <!-- \"To\" class header -->\n        <div class=\"col-md-5\">\n          <div class=\"row\">\n            <input type=\"text\" class=\"col-md-12\"\n                   ng-model=\"bName\"\n                   typeahead=\"title for title in classNames($viewValue) | filter:$viewValue\"\n                   typeahead-editable=\"true\" title=\"Java classname for class \'B\'\"\n                   placeholder=\"Java classname for class \'B\'\">\n          </div>\n          <div class=\"row\" ng-show=\"selectedMapping.class_b.error\">\n            <div class=\"alert alert-error\">\n              <div class=\"expandable closed\">\n                <div class=\"title\">\n                  <i class=\"expandable-indicator\"></i> Failed to load properties for {{selectedMapping.class_b.value}} due to {{selectedMapping.class_b.error.type}}\n                </div>\n                <div class=\"expandable-body well\">\n                  <div ng-bind-html-unsafe=\"formatStackTrace(selectedMapping.class_b.error.stackTrace)\"></div>\n                </div>\n              </div>\n            </div>\n          </div>\n        </div>\n\n      </div>\n\n      <script type=\"text/ng-template\" id=\"property.html\">\n        <span class=\"jsplumb-node dozer-mapping-node\"\n              id=\"{{field.id}}\"\n              anchors=\"{{field.anchor}}\"\n              field-path=\"{{field.path}}\">\n          <strong>{{field.displayName}}</strong> : <span class=\"typeName\">{{field.typeName}}</span>\n        </span>\n        <ul>\n          <li ng-repeat=\"field in field.properties\"\n              ng-include=\"\'property.html\'\"></li>\n        </ul>\n      </script>\n\n\n      <script type=\"text/ng-template\" id=\"pageTemplate.html\">\n        <div hawtio-jsplumb draggable=\"false\" layout=\"false\" timeout=\"500\">\n\n          <!-- \"from\" class -->\n          <div class=\"col-md-6\">\n            <div class=\"row\" ng-hide=\"selectedMapping.class_a.error\">\n              <ul class=\"dozer-mappings from\">\n                <li ng-repeat=\"field in selectedMapping.class_a.properties\"\n                    ng-include=\"\'property.html\'\"></li>\n              </ul>\n            </div>\n          </div>\n\n\n          <!-- \"to\" class -->\n          <div class=\"col-md-6\">\n            <div class=\"row\" ng-hide=\"selectedMapping.class_b.error\">\n              <ul class=\"dozer-mappings to\">\n                <li ng-repeat=\"field in selectedMapping.class_b.properties\"\n                    ng-include=\"\'property.html\'\"></li>\n              </ul>\n            </div>\n          </div>\n        </div>\n      </script>\n      <div class=\"row\" compile=\"main\"></div>\n\n    </div>\n\n    <div class=\"tab-pane\" title=\"Tree\">\n\n      <div class=\"row\">\n        <div class=\"col-md-12\">\n          <ul class=\"nav nav-pills\">\n            <li>\n              <a href=\'\' title=\"Add a new mapping between two classes\" ng-click=\"addMapping()\" data-placement=\"bottom\">\n                <i class=\"fa fa-plus\"></i> Class</a></li>\n            <li>\n              <a href=\'\' title=\"Add new mappings between fields in these classes\" ng-disable=\"!selectedMapping\" ng-click=\"addField()\" data-placement=\"bottom\">\n                <i class=\"fa fa-plus\"></i> Field</a></li>\n            <li>\n              <a href=\'\' title=\"Deletes the selected item\" ng-disabled=\"!canDelete()\" ng-click=\"deleteDialog = true\" data-placement=\"bottom\">\n                <i class=\"fa fa-remove\"></i> Delete</a></li>\n          </ul>\n        </div>\n      </div>\n\n      <div class=\"row\">\n        <div id=\"tree-container\" class=\"col-md-4\">\n          <div hawtio-tree=\"mappingTree\" onselect=\"onNodeSelect\" onDragEnter=\"onNodeDragEnter\" onDrop=\"onNodeDrop\"\n               onRoot=\"onRootTreeNode\"\n               hideRoot=\"true\"></div>\n        </div>\n\n        <div class=\"col-md-8\">\n          <div ng-include=\"propertiesTemplate\"></div>\n        </div>\n      </div>\n\n      <div hawtio-confirm-dialog=\"deleteDialog\"\n           ok-button-text=\"Delete\"\n           on-ok=\"removeNode()\">\n        <div class=\"dialog-body\">\n          <p>You are about to delete the selected {{selectedDescription}}\n          </p>\n          <p>This operation cannot be undone so please be careful.</p>\n        </div>\n      </div>\n\n      <div class=\"modal-large\">\n        <div modal=\"addDialog.show\" close=\"addDialog.close()\" ng-options=\"addDialog.options\">\n          <form class=\"form-horizontal no-bottom-margin\" ng-submit=\"addAndCloseDialog()\">\n            <div class=\"modal-header\"><h4>Add Fields</h4></div>\n            <div class=\"modal-body\">\n              <table class=\"\">\n                <tr>\n                  <th>From</th>\n                  <th></th>\n                  <th>To</th>\n                  <th>Exclude</th>\n                </tr>\n                <tr ng-repeat=\"unmapped in unmappedFields\">\n                  <td>\n                    {{unmapped.fromField}}\n                  </td>\n                  <td>-></td>\n                  <td>\n                    <input type=\"text\" ng-model=\"unmapped.toField\" ng-change=\"onUnmappedFieldChange(unmapped)\"\n                           typeahead=\"title for title in toFieldNames($viewValue) | filter:$viewValue\" typeahead-editable=\'true\'\n                           title=\"The field to map to\"/>\n                  </td>\n                  <td>\n                    <input type=\"checkbox\" ng-model=\"unmapped.exclude\" ng-click=\"onUnmappedFieldChange(unmapped)\"\n                           title=\"Whether or not the field should be excluded\"/>\n                  </td>\n                </tr>\n              </table>\n            </div>\n            <div class=\"modal-footer\">\n              <input id=\"submit\" class=\"btn btn-primary add\" type=\"submit\" ng-disabled=\"!unmappedFieldsHasValid\"\n                     value=\"Add\">\n              <button class=\"btn btn-warning cancel\" type=\"button\" ng-click=\"addDialog.close()\">Cancel</button>\n            </div>\n          </form>\n        </div>\n      </div>\n    </div>\n\n  </div>\n\n  <div class=\"jumbotron\" ng-show=\"missingContainer\">\n    <p>You cannot edit the dozer mapping file as there is no container running for the profile <b>{{profileId}}</b>.</p>\n\n    <p>\n      <a class=\"btn btn-primary btn-lg\"\n         href=\"#/fabric/containers/createContainer?profileIds={{profileId}}&versionId={{versionId}}\">\n        Create a container for: <strong>{{profileId}}</strong>\n      </a>\n    </p>\n  </div>\n</div>\n");
$templateCache.put("plugins/wiki/html/dozerPropertiesEdit.html","<div simple-form name=\"formEditor\" entity=\'dozerEntity\' data=\'nodeModel\' schema=\"schema\"></div>\n");
$templateCache.put("plugins/wiki/html/editPage.html","<div ng-controller=\"Wiki.EditController\">\n\n  <div class=\"inline-block app-path\" hawtio-breadcrumbs></div>\n  <div class=\"inline-block source-path\" ng-controller=\"Wiki.NavBarController\">\n    <ol class=\"breadcrumb\">\n      <li ng-repeat=\"link in breadcrumbs\" ng-class=\'{active : isActive(link.href)}\'>\n        <a ng-href=\"{{link.href}}{{hash}}\">{{link.name}}</a>\n      </li>\n\n    </ol>\n  </div>\n\n  <ul class=\"pull-right nav nav-tabs\">\n    <li class=\"pull-right\">\n      <a id=\"saveButton\"\n         ng-disabled=\"canSave()\"\n         ng-click=\"save()\"\n         title=\"Saves the updated wiki page\">\n        <i class=\"fa fa-save\"></i> Save</a>\n    </li>\n    <li class=\"pull-right\">\n      <a id=\"cancelButton\"\n         ng-click=\"cancel()\"\n         title=\"Discards any updates\">\n        <i class=\"fa fa-remove\"></i> Cancel</a>\n    </li>\n  </ul>\n\n\n  <div class=\"wiki-fixed form-horizontal\">\n    <div class=\"control-group editor-autoresize\">\n      <div ng-include=\"sourceView\" class=\"editor-autoresize\"></div>\n    </div>\n  </div>\n</div>\n");
$templateCache.put("plugins/wiki/html/formEdit.html","<div simple-form name=\"formEditor\" entity=\'formEntity\' data=\'formDefinition\'></div>\n");
$templateCache.put("plugins/wiki/html/formTable.html","<div ng-controller=\"Wiki.FormTableController\">\n  <div class=\"logbar\" ng-controller=\"Wiki.NavBarController\">\n    <div class=\"wiki logbar-container\">\n      <ul class=\"nav nav-tabs\">\n        <li ng-repeat=\"link in breadcrumbs\" ng-class=\'{active : isActive(link.href)}\'>\n          <a ng-href=\"{{link.href}}{{hash}}\">{{link.name}}</a>\n        </li>\n\n        <li class=\"pull-right\">\n          <a ng-href=\"{{editLink()}}{{hash}}\" ng-hide=\"!editLink()\" title=\"Edit this page\"\n             data-placement=\"bottom\">\n            <i class=\"fa fa-edit\"></i> Edit</a></li>\n        <li class=\"pull-right\">\n          <a ng-href=\"{{historyLink}}{{hash}}\" ng-hide=\"!historyLink\" title=\"View the history of this file\"\n             data-placement=\"bottom\">\n            <i class=\"fa fa-comments-alt\"></i> History</a></li>\n        <li class=\"pull-right\">\n          <a ng-href=\"{{createLink()}}{{hash}}\" title=\"Create new page\"\n             data-placement=\"bottom\">\n            <i class=\"fa fa-plus\"></i> Create</a></li>\n        <li class=\"pull-right\" ng-show=\"sourceLink()\">\n          <a ng-href=\"{{sourceLink()}}\" title=\"View source code\"\n             data-placement=\"bottom\">\n            <i class=\"fa fa-file-o\"></i> Source</a></li>\n      </ul>\n    </div>\n  </div>\n\n  <div class=\"wiki-fixed row\">\n    <input class=\"search-query col-md-12\" type=\"text\" ng-model=\"gridOptions.filterOptions.filterText\"\n           placeholder=\"Filter...\">\n  </div>\n\n  <div class=\"form-horizontal\">\n    <div class=\"row\">\n      <div ng-include=\"tableView\"></div>\n    </div>\n  </div>\n</div>\n");
$templateCache.put("plugins/wiki/html/formTableDatatable.html","<div class=\"gridStyle\" hawtio-datatable=\"gridOptions\"></div>\n");
$templateCache.put("plugins/wiki/html/formView.html","<div simple-form name=\"formViewer\" mode=\'view\' entity=\'formEntity\' data=\'formDefinition\'></div>\n");
$templateCache.put("plugins/wiki/html/gitPreferences.html","<div title=\"Git\" ng-controller=\"Wiki.GitPreferences\">\n  <div hawtio-form-2=\"config\" entity=\"entity\"></div>\n</div>\n");
$templateCache.put("plugins/wiki/html/history.html","<div ng-controller=\"Wiki.HistoryController\">\n  <div class=\"row\">\n    <div class=\"wiki source-nav-widget\">\n      <div class=\"inline-block app-path\" hawtio-breadcrumbs></div>\n      <div class=\"inline-block source-path\">\n        <ol class=\"breadcrumb\">\n          <li ng-repeat=\"link in breadcrumbs\" ng-class=\'{active : isActive(link.href) && !objectId}\'>\n            <a class=\"breadcrumb-link\" ng-href=\"{{link.href}}\">\n              <span class=\"contained c-medium\">{{link.name}}</span>\n            </a>\n          </li>\n          <li class=\"active\">\n            <a href=\"\">History</a>\n          </li>\n        </ol>\n      </div>\n      <ul class=\"pull-right nav nav-tabs\">\n        <li class=\"pull-right\" hawtio-show object-name=\"{{gitMBean}}\" method-name=\"write\">\n          <a class=\"btn\" href=\"\" ng-disabled=\"!gridOptions.selectedItems.length\" ng-click=\"diff()\"\n            title=\"Compare the selected versions of the files to see how they differ\">\n            <i class=\"fa fa-exchange\"></i> Compare\n          </a>\n        </li>\n        <li class=\"pull-right\">\n          <a class=\"btn\" href=\"\" ng-disabled=\"!canRevert()\" ng-click=\"revert()\"\n            title=\"Revert to this version of the file\" hawtio-show object-name=\"{{gitMBean}}\"\n            method-name=\"revertTo\">\n            <i class=\"fa fa-exchange\"></i> Revert\n          </a>\n        </li>\n      </ul>\n    </div>\n  </div>\n\n  <div class=\"row\">\n    <div class=\"col-md-12\">\n      <div class=\"control-group\">\n        <input class=\"col-md-12 search-query\" type=\"text\" ng-model=\"gridOptions.filterOptions.filterText\"\n               placeholder=\"search\">\n      </div>\n    </div>\n  </div>\n\n  <div commit-history-panel></div>\n\n</div>\n");
$templateCache.put("plugins/wiki/html/historyPanel.html","<div ng-controller=\"Wiki.HistoryController\">\n  <div class=\"row\">\n    <div class=\"col-md-12\">\n      <table class=\"commit-table\">\n        <tr class=\"commit-row\" ng-repeat=\"commit in logs | filter:filterTemplates track by $index\">\n          <td class=\"commit-avatar\" title=\"{{commit.name}}\">\n              <img ng-show=\"commit.avatar_url\" src=\"{{commit.avatar_url}}\"/>\n            </div>\n          </td>\n          <td>\n            <p class=\"commit-history-message\">{{commit.short_message}}</p>\n\n            <p class=\"commit-details text-nowrap\">\n              <span class=\"commit-history-author\">{{commit.author}}</span>\n              <span class=\"\"> committed </span>\n              <span class=\"commit-date\" title=\"{{commit.$date | date:\'EEE, MMM d, yyyy : HH:mm:ss Z\'}}\">{{commit.$date.relative()}}</span>\n            </p>\n          </td>\n          <td class=\"commit-links\">\n            <a class=\"text-nowrap btn\" ng-href=\"{{commit.commitLink}}{{hash}}\" title=\"{{commit.sha}}\">\n              {{commit.sha | limitTo:7}}\n              <i class=\"fa fa-arrow-circle-right\"></i></a>\n          </td>\n        </tr>\n      </table>\n    </div>\n  </div>\n</div>\n");
$templateCache.put("plugins/wiki/html/layoutWiki.html","<div class=\"row\" ng-controller=\"Wiki.TopLevelController\">\n  <div ng-view></div>\n</div>\n\n");
$templateCache.put("plugins/wiki/html/overviewDashboard.html","<div ng-controller=\"Wiki.OverviewDashboard\">\n  <div class=\"gridster\">\n    <ul id=\"widgets\" hawtio-dashboard></ul>\n  </div>\n</div>\n\n");
$templateCache.put("plugins/wiki/html/projectCommitsPanel.html","<div ng-controller=\"Wiki.HistoryController\">\n  <div ng-show=\"logs.length\">\n    <!--\n    <div class=\"row\">\n      <h4 class=\"project-overview-title\"><a ng-href=\"{{$projectLink}}/wiki/history//\">Commits</a></h4>\n    </div>\n    -->\n    <div commit-history-panel></div>\n  </div>\n</div>\n");
$templateCache.put("plugins/wiki/html/sourceEdit.html","<textarea id=\"source\" ui-codemirror=\"codeMirrorOptions\" ng-model=\"entity.source\"></textarea>\n");
$templateCache.put("plugins/wiki/html/sourceView.html","<textarea id=\"source\" ui-codemirror=\"codeMirrorOptions\" ng-model=\"source\"></textarea>\n");
$templateCache.put("plugins/wiki/html/viewBook.html","<div ng-controller=\"Wiki.ViewController\">\n\n  <script type=\"text/ng-template\" id=\"fileCellTemplate.html\">\n    <div class=\"ngCellText\"\n         title=\"{{fileName(row.entity)}} - Last Modified: {{row.entity.lastModified | date:\'medium\'}}, Size: {{row.entity.length}}\">\n      <a href=\"{{childLink(row.entity)}}\" class=\"file-name\">\n        <span class=\"file-icon\"\n              ng-class=\"fileClass(row.entity)\"\n              ng-bind-html-unsafe=\"fileIconHtml(row)\">\n\n              </span>{{fileName(row.entity)}}\n      </a>\n    </div>\n  </script>\n\n  <script type=\"text/ng-template\" id=\"fileColumnTemplate.html\">\n\n    <div class=\"ngHeaderSortColumn {{col.headerClass}}\"\n         ng-style=\"{\'cursor\': col.cursor}\"\n         ng-class=\"{ \'ngSorted\': !noSortVisible }\">\n\n      <div class=\"ngHeaderText\" ng-hide=\"pageId === \'/\'\">\n        <a ng-href=\"{{parentLink()}}\"\n           class=\"wiki-file-list-up\"\n           title=\"Open the parent folder\">\n          <i class=\"fa fa-level-up\"></i> Up a directory\n        </a>\n      </div>\n    </div>\n\n  </script>\n\n  <ng-include src=\"\'plugins/wiki/html/viewNavBar.html\'\"></ng-include>\n\n  <div class=\"wiki-fixed form-horizontal\">\n    <div class=\"row\">\n      <div class=\"tocify\" wiki-href-adjuster>\n        <!-- TODO we maybe want a more flexible way to find the links to include than the current link-filter -->\n        <div hawtio-toc-display get-contents=\"getContents(filename, cb)\"\n             html=\"html\" link-filter=\"[file-extension]\">\n        </div>\n      </div>\n      <div class=\"toc-content\" id=\"toc-content\"></div>\n    </div>\n  </div>\n</div>\n");
$templateCache.put("plugins/wiki/html/viewNavBar.html","<div ng-hide=\"inDashboard\" class=\"wiki source-nav-widget\" ng-controller=\"Wiki.NavBarController\">\n  <div class=\"inline-block app-path\" hawtio-breadcrumbs></div>\n  <div class=\"inline-block source-path\">\n    <ol class=\"breadcrumb\">\n      <li ng-repeat=\"link in breadcrumbs\" ng-class=\'{active : isActive(link.href) && !objectId}\'>\n        <a class=\"breadcrumb-link\" ng-href=\"{{link.href}}\">\n          <span class=\"contained c-medium\">{{link.name}}</span>\n        </a>\n      </li>\n      <li ng-show=\"objectId\">\n        <a ng-href=\"{{historyLink}}{{hash}}\">History</a>\n      </li>\n      <li ng-show=\"objectId\" class=\"active\">\n        <a>{{objectId}}</a>\n      </li>\n    </ol>\n  </div>\n  <ul class=\"pull-right nav nav-tabs\">\n\n    <li class=\"pull-right dropdown\">\n      <a href=\"\" class=\"dropdown-toggle\" data-toggle=\"dropdown\">\n        <i class=\"fa fa-ellipsis-v\"></i>\n      </a>\n      <ul class=\"dropdown-menu\">\n        <li ng-show=\"sourceLink()\">\n          <a ng-href=\"{{sourceLink()}}\" title=\"View source code\"\n            data-placement=\"bottom\">\n            <i class=\"fa fa-file-o\"></i> Source</a>\n        </li>\n        <li>\n          <a ng-href=\"{{historyLink}}{{hash}}\" ng-hide=\"!historyLink\" title=\"View the history of this file\"\n            data-placement=\"bottom\">\n            <i class=\"fa fa-comments-alt\"></i> History</a>\n        </li>\n        <!--\n        <li class=\"divider\">\n        </li>\n        -->\n        <li ng-hide=\"gridOptions.selectedItems.length !== 1\" hawtio-show object-name=\"{{gitMBean}}\" method-name=\"rename\">\n          <a ng-click=\"openRenameDialog()\"\n            title=\"Rename the selected document\"\n            data-placement=\"bottom\">\n            <i class=\"fa fa-adjust\"></i> Rename</a>\n        </li>\n        <li ng-hide=\"!gridOptions.selectedItems.length\" hawtio-show object-name=\"{{gitMBean}}\" method-name=\"rename\">\n          <a ng-click=\"openMoveDialog()\"\n            title=\"move the selected documents to a new folder\"\n            data-placement=\"bottom\">\n            <i class=\"fa fa-move\"></i> Move</a>\n        </li>\n        <!--\n        <li class=\"divider\">\n        </li>\n        -->\n        <li ng-hide=\"!gridOptions.selectedItems.length\" hawtio-show object-name=\"{{gitMBean}}\" method-name=\"remove\">\n          <a ng-click=\"openDeleteDialog()\"\n            title=\"Delete the selected document(s)\"\n            data-placement=\"bottom\">\n            <i class=\"fa fa-remove\"></i> Delete</a>\n        </li>\n        <li class=\"divider\" ng-show=\"childActions.length\">\n        </li>\n        <li ng-repeat=\"childAction in childActions\">\n          <a ng-click=\"childAction.doAction()\"\n            title=\"{{childAction.title}}\"\n            data-placement=\"bottom\">\n            <i class=\"{{childAction.icon}}\"></i> {{childAction.name}}</a>\n        </li>\n      </ul>\n    </li>\n    <li class=\"pull-right\" ng-show=\"forgeLink()\">\n      <a ng-href=\"{{forgeLink()}}{{hash}}\" title=\"Run a JBoss Forge command on this project\" data-placement=\"bottom\">\n        <i class=\"fa fa-wrench\"></i> Forge</a>\n    </li>\n    <li class=\"pull-right\" hawtio-show object-name=\"{{gitMBean}}\" method-name=\"write\">\n      <a ng-href=\"{{editLink()}}{{hash}}\" ng-hide=\"!editLink()\" title=\"Edit this page\"\n        data-placement=\"bottom\">\n        <i class=\"fa fa-edit\"></i> Edit</a>\n    </li>\n    <li class=\"pull-right\" hawtio-show object-name=\"{{gitMBean}}\" method-name=\"write\">\n      <a ng-href=\"{{createLink()}}{{hash}}\"\n        title=\"Create new page\"\n        data-placement=\"bottom\">\n        <i class=\"fa fa-plus\"></i> Create</a>\n    </li>\n\n    <li class=\"pull-right branch-menu\" ng-show=\"branches.length || branch\">\n      <div hawtio-drop-down=\"branchMenuConfig\"></div>\n    </li>\n\n    <li class=\"pull-right view-style\">\n      <div class=\"btn-group\" \n        ng-hide=\"!children || profile\">\n        <a class=\"btn btn-sm\"\n          ng-disabled=\"mode == ViewMode.List\"\n          href=\"\" \n          ng-click=\"setViewMode(ViewMode.List)\">\n          <i class=\"fa fa-list\"></i></a>\n        <a class=\"btn btn-sm\" \n          ng-disabled=\"mode == ViewMode.Icon\"\n          href=\"\" \n          ng-click=\"setViewMode(ViewMode.Icon)\">\n          <i class=\"fa fa-th-large\"></i></a>\n      </div>\n    </li>\n<!--\n      <li class=\"pull-right\">\n        <a href=\"\" ng-hide=\"children || profile\" title=\"Add to dashboard\" ng-href=\"{{createDashboardLink()}}\"\n           data-placement=\"bottom\">\n          <i class=\"fa fa-share\"></i>\n        </a>\n      </li>\n-->\n    </ul>\n</div>\n\n\n");
$templateCache.put("plugins/wiki/html/viewPage.html","<div ng-controller=\"Wiki.ViewController\">\n  <script type=\"text/ng-template\" id=\"fileCellTemplate.html\">\n    <div class=\"ngCellText\"\n         title=\"{{fileName(row.entity)}} - Last Modified: {{row.entity.lastModified | date:\'medium\'}}, Size: {{row.entity.size}}\">\n      <a href=\"{{childLink(row.entity)}}\" class=\"file-name\" hawtio-file-drop=\"{{row.entity.fileName}}\" download-url=\"{{row.entity.downloadURL}}\">\n        <span class=\"file-icon\"\n              ng-class=\"fileClass(row.entity)\"\n              compile=\"fileIconHtml(row)\">\n        </span>{{fileName(row.entity)}}\n      </a>\n    </div>\n  </script>\n\n  <script type=\"text/ng-template\" id=\"fileColumnTemplate.html\">\n    <div class=\"ngHeaderSortColumn {{col.headerClass}}\"\n         ng-style=\"{\'cursor\': col.cursor}\"\n         ng-class=\"{ \'ngSorted\': !noSortVisible }\">\n      <div class=\"ngHeaderText\" ng-hide=\"pageId === \'/\'\">\n        <a ng-href=\"{{parentLink()}}\"\n           class=\"wiki-file-list-up\"\n           title=\"Open the parent folder\">\n          <i class=\"fa fa-level-up\"></i> Up a directory\n        </a>\n      </div>\n    </div>\n  </script>\n\n  <script type=\"text/ng-template\" id=\"imageTemplate.html\">\n    <img src=\"{{imageURL}}\">\n  </script>\n\n  <ng-include src=\"\'plugins/wiki/html/viewNavBar.html\'\"></ng-include>\n\n  <!-- Icon View -->\n  <div ng-show=\"mode == ViewMode.Icon\" class=\"wiki-fixed\">\n    <div ng-hide=\"!showAppHeader\">\n      <div class=\"row\">\n        <div class=\"col-md-12\">\n          <div kubernetes-json=\"kubernetesJson\"></div>\n        </div>\n      </div>\n    </div>\n    <div class=\"row\" ng-show=\"html && children\">\n      <div class=\"col-md-12 wiki-icon-view-header\">\n        <h5>Directories and Files</h5>\n      </div>\n    </div>\n    <div class=\"row\" ng-hide=\"!directory\">\n      <div class=\"col-md-12\" ng-controller=\"Wiki.FileDropController\">\n        <div class=\"wiki-icon-view\" nv-file-drop nv-file-over uploader=\"uploader\" over-class=\"ready-drop\">\n          <div class=\"column-box mouse-pointer well\"\n               ng-repeat=\"child in children track by $index\"\n               ng-class=\"isInGroup(gridOptions.selectedItems, child, \'selected\', \'\')\"\n               ng-click=\"toggleSelectionFromGroup(gridOptions.selectedItems, child)\">\n            <div class=\"row\">\n              <div class=\"col-md-2\" hawtio-file-drop=\"{{child.fileName}}\" download-url=\"{{child.downloadURL}}\">\n                  <span class=\"app-logo\" ng-class=\"fileClass(child)\" compile=\"fileIconHtml(child)\"></span>\n              </div>\n              <div class=\"col-md-10\">\n                <h3>\n                  <a href=\"{{childLink(child)}}\">{{child.displayName || child.name}}</a>\n                </h3>\n              </div>\n            </div>\n            <div class=\"row\" ng-show=\"child.summary\">\n              <div class=\"col-md-12\">\n                <p compile=\"marked(child.summary)\"></p>\n              </div>\n            </div>\n          </div>\n        </div>\n      </div>\n    </div>\n    <div ng-hide=\"!html\" wiki-href-adjuster wiki-title-linker>\n      <div class=\"row\" style=\"margin-left: 10px\">\n        <div class=\"col-md-12\">\n          <div compile=\"html\"></div>\n        </div>\n      </div>\n    </div>\n  </div>\n  <!-- end Icon view -->\n\n  <!-- start List view -->\n  <div ng-show=\"mode == ViewMode.List\" class=\"wiki-fixed\">\n    <hawtio-pane position=\"left\" width=\"300\">\n      <div ng-controller=\"Wiki.FileDropController\">\n        <div class=\"wiki-list-view\" nv-file-drop nv-file-over uploader=\"uploader\" over-class=\"ready-drop\">\n          <div class=\"wiki-grid\" hawtio-list=\"gridOptions\"></div>\n        </div>\n      </div>\n    </hawtio-pane>\n    <div class=\"row\">\n      <div ng-class=\"col-md-12\">\n        <div ng-hide=\"!showProfileHeader\">\n          <div class=\"row\">\n            <div class=\"col-md-12\">\n              <div fabric-profile-details version-id=\"versionId\" profile-id=\"profileId\"></div>\n              <p></p>\n            </div>\n          </div>\n        </div>\n        <div ng-hide=\"!showAppHeader\">\n          <div class=\"row\">\n            <div class=\"col-md-12\">\n              <div kubernetes-json=\"kubernetesJson\" children=\"children\"></div>\n            </div>\n          </div>\n        </div>\n        <div ng-hide=\"!html\" wiki-href-adjuster wiki-title-linker>\n          <div class=\"row\" style=\"margin-left: 10px\">\n            <div class=\"col-md-12\">\n              <div compile=\"html\"></div>\n            </div>\n          </div>\n        </div>\n      </div>\n    </div>\n  </div>\n  <!-- end List view -->\n  <div ng-include=\"sourceView\" class=\"editor-autoresize\"></div>\n</div>\n");
$templateCache.put("plugins/wiki/html/modal/deleteDialog.html","<div>\n  <form class=\"form-horizontal\" ng-submit=\"deleteAndCloseDialog()\">\n    <div class=\"modal-header\"><h4>Delete Document</h4></div>\n    <div class=\"modal-body\">\n      <div class=\"control-group\">\n        <p>You are about to delete\n          <ng-pluralize count=\"gridOptions.selectedItems.length\"\n                        when=\"{\'1\': \'this document!\', \'other\': \'these {} documents!\'}\">\n          </ng-pluralize>\n        </p>\n\n        <div ng-bind-html-unsafe=\"selectedFileHtml\"></div>\n        <p class=\"alert alert-danger\" ng-show=\"warning\" ng-bind-html-unsafe=\"warning\">\n        </p>\n      </div>\n    </div>\n    <div class=\"modal-footer\">\n      <input class=\"btn btn-primary\" type=\"submit\"\n             value=\"Delete\">\n      <button class=\"btn btn-warning cancel\" type=\"button\" ng-click=\"close()\">Cancel</button>\n    </div>\n  </form>\n</div>\n");
$templateCache.put("plugins/wiki/html/modal/moveDialog.html","<div>\n    <form class=\"form-horizontal\" ng-submit=\"moveAndCloseDialog()\">\n    <div class=\"modal-header\"><h4>Move Document</h4></div>\n    <div class=\"modal-body\">\n      <div class=\"control-group\">\n        <label class=\"control-label\" for=\"moveFolder\">Folder</label>\n\n        <div class=\"controls\">\n          <input type=\"text\" id=\"moveFolder\" ng-model=\"move.moveFolder\"\n                 typeahead=\"title for title in folderNames($viewValue) | filter:$viewValue\" typeahead-editable=\'true\'>\n        </div>\n      </div>\n    </div>\n    <div class=\"modal-footer\">\n      <input class=\"btn btn-primary\" type=\"submit\"\n             ng-disabled=\"!move.moveFolder\"\n             value=\"Move\">\n      <button class=\"btn btn-warning cancel\" type=\"button\" ng-click=\"close()\">Cancel</button>\n    </div>\n  </form>\n</div>");
$templateCache.put("plugins/wiki/html/modal/renameDialog.html","<div>\n  <form class=\"form-horizontal\" ng-submit=\"renameAndCloseDialog()\">\n    <div class=\"modal-header\"><h4>Rename Document</h4></div>\n    <div class=\"modal-body\">\n      <div class=\"row\">\n        <div class=\"form-group\">\n          <label class=\"col-sm-2 control-label\" for=\"renameFileName\">Name</label>\n\n          <div class=\"col-sm-10\">\n            <input type=\"text\" id=\"renameFileName\" ng-model=\"rename.newFileName\">\n          </div>\n        </div>\n\n        <div class=\"form-group\">\n          <div ng-show=\"fileExists.exists\" class=\"alert\">\n            Please choose a different name as <b>{{fileExists.name}}</b> already exists\n          </div>\n        </div>\n      </div>\n    </div>\n    <div class=\"modal-footer\">\n      <input class=\"btn btn-primary\" type=\"submit\"\n             ng-disabled=\"!fileName || fileExists.exists\"\n             value=\"Rename\">\n      <button class=\"btn btn-warning cancel\" type=\"button\" ng-click=\"close()\">Cancel</button>\n    </div>\n  </form>\n</div>\n");}]); hawtioPluginLoader.addModule("fabric8-console-templates");