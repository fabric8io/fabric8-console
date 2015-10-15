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

var Forge;
(function (Forge) {
    Forge.context = '/workspaces/:namespace/forge';
    Forge.hash = '#' + Forge.context;
    Forge.pluginName = 'Forge';
    Forge.pluginPath = 'plugins/forge/';
    Forge.templatePath = Forge.pluginPath + 'html/';
    Forge.log = Logger.get(Forge.pluginName);
    Forge.defaultIconUrl = Core.url("/img/forge.svg");
    Forge.gogsServiceName = "gogs";
    Forge.orionServiceName = "orion";
    Forge.loggedInToGogs = false;
    function isForge(workspace) {
        return true;
    }
    Forge.isForge = isForge;
    function initScope($scope, $location, $routeParams) {
        $scope.projectId = $routeParams["project"];
        $scope.$workspaceLink = Developer.workspaceLink();
        $scope.$projectLink = Developer.projectLink($scope.projectId);
        $scope.breadcrumbConfig = Developer.createProjectBreadcrumbs($scope.projectId);
        $scope.subTabConfig = Developer.createProjectSubNavBars($scope.projectId);
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
    function reposApiUrl(ForgeApiURL) {
        return UrlHelpers.join(ForgeApiURL, "/repos");
    }
    Forge.reposApiUrl = reposApiUrl;
    function repoApiUrl(ForgeApiURL, path) {
        return UrlHelpers.join(ForgeApiURL, "/repos/user", path);
    }
    Forge.repoApiUrl = repoApiUrl;
    function commandApiUrl(ForgeApiURL, commandId, resourcePath) {
        if (resourcePath === void 0) { resourcePath = null; }
        return UrlHelpers.join(ForgeApiURL, "command", commandId, resourcePath);
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
    function commandInputApiUrl(ForgeApiURL, commandId, resourcePath) {
        return UrlHelpers.join(ForgeApiURL, "commandInput", commandId, resourcePath);
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
        var authHeader = localStorage["gogsAuthorization"];
        var email = localStorage["gogsEmail"];
        var config = {};
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
    function createHttpUrl(url, authHeader, email) {
        if (authHeader === void 0) { authHeader = null; }
        if (email === void 0) { email = null; }
        authHeader = authHeader || localStorage["gogsAuthorization"];
        email = email || localStorage["gogsEmail"];
        url = addQueryArgument(url, "_gogsAuth", authHeader);
        url = addQueryArgument(url, "_gogsEmail", email);
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
    function isLoggedIntoGogs() {
        var authHeader = localStorage["gogsAuthorization"];
        return authHeader ? Forge.loggedInToGogs : false;
    }
    Forge.isLoggedIntoGogs = isLoggedIntoGogs;
    function redirectToGogsLoginIfRequired($scope, $location) {
        if (!isLoggedIntoGogs()) {
            var devLink = Developer.projectLink($scope.projectId);
            var loginPage = UrlHelpers.join(devLink, "forge/repos");
            Forge.log.info("Not logged in so redirecting to " + loginPage);
            $location.path(loginPage);
        }
    }
    Forge.redirectToGogsLoginIfRequired = redirectToGogsLoginIfRequired;
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
            angular.forEach([Forge.context, '/workspaces/:namespace/projects/:project/forge'], function (path) {
                $routeProvider
                    .when(UrlHelpers.join(path, '/commands'), Forge.route('commands.html', false))
                    .when(UrlHelpers.join(path, '/commands/:path*'), Forge.route('commands.html', false))
                    .when(UrlHelpers.join(path, '/command/:id'), Forge.route('command.html', false))
                    .when(UrlHelpers.join(path, '/command/:id/:path*'), Forge.route('command.html', false));
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
            Forge.redirectToGogsLoginIfRequired($scope, $location);
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
            $scope.execute = function () {
                $scope.response = null;
                $scope.executing = true;
                $scope.invalid = false;
                $scope.validationError = null;
                var commandId = $scope.id;
                var resourcePath = $scope.resourcePath;
                var url = Forge.executeCommandApiUrl(ForgeApiURL, commandId);
                var request = {
                    resource: resourcePath,
                    inputList: $scope.inputList
                };
                url = Forge.createHttpUrl(url);
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
                                    updateSchema(schema);
                                    $scope.inputList.push($scope.entity);
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
                        var status = ((data || {}).status || "").toString().toLowerCase();
                        $scope.responseClass = toBackgroundStyle(status);
                        var fullName = ((data || {}).outputProperties || {}).fullName;
                        if ($scope.response && fullName && $scope.id === 'project-new') {
                            $scope.response = null;
                            var projectId = fullName.replace('/', "-");
                            var editPath = UrlHelpers.join(Developer.projectLink(projectId), "/forge/command/devops-edit/user", fullName);
                            Forge.log.info("Moving to the devops edit path: " + editPath);
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
                        if ($scope.id === "project-new") {
                            var entity = $scope.entity;
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
                    resource: resourcePath,
                    inputList: $scope.inputList
                };
                url = Forge.createHttpUrl(url);
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
                    var url = Forge.commandInputApiUrl(ForgeApiURL, commandId, resourcePath);
                    url = Forge.createHttpUrl(url);
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
            Forge.redirectToGogsLoginIfRequired($scope, $location);
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
                    $scope.commandSelector.expandedFolders = {};
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
            var url = UrlHelpers.join(ForgeApiURL, "commands", $scope.resourcePath);
            url = Forge.createHttpUrl(url);
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
                    angular.forEach(folders, function (folder) {
                        folder.commands = _.sortBy(folder.commands, "$shortName");
                    });
                    $scope.commandSelector.folders = folders;
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
    Forge.RepoController = Forge.controller("RepoController", ["$scope", "$templateCache", "$location", "$routeParams", "$http", "$timeout", "ForgeApiURL",
        function ($scope, $templateCache, $location, $routeParams, $http, $timeout, ForgeApiURL) {
            $scope.name = $routeParams["path"];
            Forge.initScope($scope, $location, $routeParams);
            Forge.redirectToGogsLoginIfRequired($scope, $location);
            $scope.$on('$routeUpdate', function ($event) {
                updateData();
            });
            updateData();
            function updateData() {
                if ($scope.name) {
                    var url = Forge.repoApiUrl(ForgeApiURL, $scope.name);
                    url = Forge.createHttpUrl(url);
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
    Forge.ReposController = Forge.controller("ReposController", ["$scope", "$dialog", "$window", "$templateCache", "$routeParams", "$location", "localStorage", "$http", "$timeout", "ForgeApiURL", "ServiceRegistry",
        function ($scope, $dialog, $window, $templateCache, $routeParams, $location, localStorage, $http, $timeout, ForgeApiURL, ServiceRegistry) {
            Forge.log.info("repos controller start!");
            $scope.resourcePath = $routeParams["path"];
            $scope.commandsLink = function (path) { return Forge.commandsLink(path, $scope.projectId); };
            var gogsUrl = ServiceRegistry.serviceLink(Forge.gogsServiceName);
            if (gogsUrl) {
                $scope.signUpUrl = UrlHelpers.join(gogsUrl, "user/sign_up");
                $scope.forgotPasswordUrl = UrlHelpers.join(gogsUrl, "user/forget_password");
            }
            Forge.initScope($scope, $location, $routeParams);
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
            function updateData() {
                var authHeader = $scope.login.authHeader;
                var email = $scope.login.email || "";
                if (authHeader) {
                    var url = Forge.reposApiUrl(ForgeApiURL);
                    url = Forge.createHttpUrl(url, authHeader, email);
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
    Main._module.run(["$rootScope", "HawtioNav", "KubernetesModel", "ServiceRegistry", function ($rootScope, nav, KubernetesModel, ServiceRegistry) {
            nav.on(HawtioMainNav.Actions.CHANGED, Main.pluginName, function (items) {
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
            nav.add({
                id: 'library',
                title: function () { return 'Library'; },
                tooltip: function () { return 'View the library of applications'; },
                isValid: function () { return ServiceRegistry.hasService(Main.appLibraryServiceName) && ServiceRegistry.hasService("app-library-jolokia"); },
                href: function () { return "/wiki/view"; },
                isActive: function () { return false; }
            });
            var kibanaServiceName = Kubernetes.kibanaServiceName;
            nav.add({
                id: 'kibana',
                title: function () { return 'Logs'; },
                tooltip: function () { return 'View and search all logs across all containers using Kibana and ElasticSearch'; },
                isValid: function () { return ServiceRegistry.hasService(kibanaServiceName); },
                href: function () { return Kubernetes.kibanaLogsLink(ServiceRegistry); },
                isActive: function () { return false; }
            });
            nav.add({
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
            nav.add({
                id: 'grafana',
                title: function () { return 'Metrics'; },
                tooltip: function () { return 'Views metrics across all containers using Grafana and InfluxDB'; },
                isValid: function () { return ServiceRegistry.hasService(Main.grafanaServiceName); },
                href: function () { return ServiceRegistry.serviceLink(Main.grafanaServiceName); },
                isActive: function () { return false; }
            });
            nav.add({
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
            Main.log.info("started, version: ", Main.version.version);
            Main.log.info("commit ID: ", Main.version.commitId);
        }]);
    hawtioPluginLoader.registerPreBootstrapTask(function (next) {
        $.ajax({
            url: 'version.json',
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImluY2x1ZGVzLnRzIiwiZm9yZ2UvdHMvZm9yZ2VIZWxwZXJzLnRzIiwiZm9yZ2UvdHMvZm9yZ2VQbHVnaW4udHMiLCJmb3JnZS90cy9jb21tYW5kLnRzIiwiZm9yZ2UvdHMvY29tbWFuZHMudHMiLCJmb3JnZS90cy9yZXBvLnRzIiwiZm9yZ2UvdHMvcmVwb3MudHMiLCJtYWluL3RzL21haW5HbG9iYWxzLnRzIiwibWFpbi90cy9tYWluUGx1Z2luLnRzIl0sIm5hbWVzIjpbIkZvcmdlIiwiRm9yZ2UuaXNGb3JnZSIsIkZvcmdlLmluaXRTY29wZSIsIkZvcmdlLmNvbW1hbmRMaW5rIiwiRm9yZ2UuY29tbWFuZHNMaW5rIiwiRm9yZ2UucmVwb3NBcGlVcmwiLCJGb3JnZS5yZXBvQXBpVXJsIiwiRm9yZ2UuY29tbWFuZEFwaVVybCIsIkZvcmdlLmV4ZWN1dGVDb21tYW5kQXBpVXJsIiwiRm9yZ2UudmFsaWRhdGVDb21tYW5kQXBpVXJsIiwiRm9yZ2UuY29tbWFuZElucHV0QXBpVXJsIiwiRm9yZ2UubW9kZWxQcm9qZWN0IiwiRm9yZ2Uuc2V0TW9kZWxDb21tYW5kcyIsIkZvcmdlLmdldE1vZGVsQ29tbWFuZHMiLCJGb3JnZS5tb2RlbENvbW1hbmRJbnB1dE1hcCIsIkZvcmdlLmdldE1vZGVsQ29tbWFuZElucHV0cyIsIkZvcmdlLnNldE1vZGVsQ29tbWFuZElucHV0cyIsIkZvcmdlLmVucmljaFJlcG8iLCJGb3JnZS5jcmVhdGVIdHRwQ29uZmlnIiwiRm9yZ2UuYWRkUXVlcnlBcmd1bWVudCIsIkZvcmdlLmNyZWF0ZUh0dHBVcmwiLCJGb3JnZS5jb21tYW5kTWF0Y2hlc1RleHQiLCJGb3JnZS5pc0xvZ2dlZEludG9Hb2dzIiwiRm9yZ2UucmVkaXJlY3RUb0dvZ3NMb2dpbklmUmVxdWlyZWQiLCJGb3JnZS5vblJvdXRlQ2hhbmdlZCIsIkZvcmdlLnVwZGF0ZVNjaGVtYSIsIkZvcmdlLnZhbGlkYXRlIiwiRm9yZ2UudG9CYWNrZ3JvdW5kU3R5bGUiLCJGb3JnZS51cGRhdGVEYXRhIiwiRm9yZ2Uub25TY2hlbWFMb2FkIiwiRm9yZ2UuY29tbWFuZE1hdGNoZXMiLCJGb3JnZS5kb0RlbGV0ZSIsIk1haW4iXSwibWFwcGluZ3MiOiJBQUFBLDJEQUEyRDtBQUMzRCw0REFBNEQ7QUFDNUQsR0FBRztBQUNILG1FQUFtRTtBQUNuRSxvRUFBb0U7QUFDcEUsMkNBQTJDO0FBQzNDLEdBQUc7QUFDSCxnREFBZ0Q7QUFDaEQsR0FBRztBQUNILHVFQUF1RTtBQUN2RSxxRUFBcUU7QUFDckUsNEVBQTRFO0FBQzVFLHVFQUF1RTtBQUN2RSxrQ0FBa0M7QUFFbEMsMERBQTBEO0FBQzFELHNEQUFzRDtBQUN0RCwyREFBMkQ7O0FDaEIzRCxJQUFPLEtBQUssQ0F1Tlg7QUF2TkQsV0FBTyxLQUFLLEVBQUMsQ0FBQztJQUVEQSxhQUFPQSxHQUFHQSw4QkFBOEJBLENBQUNBO0lBRXpDQSxVQUFJQSxHQUFHQSxHQUFHQSxHQUFHQSxhQUFPQSxDQUFDQTtJQUNyQkEsZ0JBQVVBLEdBQUdBLE9BQU9BLENBQUNBO0lBQ3JCQSxnQkFBVUEsR0FBR0EsZ0JBQWdCQSxDQUFDQTtJQUM5QkEsa0JBQVlBLEdBQUdBLGdCQUFVQSxHQUFHQSxPQUFPQSxDQUFDQTtJQUNwQ0EsU0FBR0EsR0FBa0JBLE1BQU1BLENBQUNBLEdBQUdBLENBQUNBLGdCQUFVQSxDQUFDQSxDQUFDQTtJQUU1Q0Esb0JBQWNBLEdBQUdBLElBQUlBLENBQUNBLEdBQUdBLENBQUNBLGdCQUFnQkEsQ0FBQ0EsQ0FBQ0E7SUFFNUNBLHFCQUFlQSxHQUFHQSxNQUFNQSxDQUFDQTtJQUN6QkEsc0JBQWdCQSxHQUFHQSxPQUFPQSxDQUFDQTtJQUUzQkEsb0JBQWNBLEdBQUdBLEtBQUtBLENBQUNBO0lBRWxDQSxpQkFBd0JBLFNBQVNBO1FBQy9CQyxNQUFNQSxDQUFDQSxJQUFJQSxDQUFDQTtJQUNkQSxDQUFDQTtJQUZlRCxhQUFPQSxVQUV0QkEsQ0FBQUE7SUFFREEsbUJBQTBCQSxNQUFNQSxFQUFFQSxTQUFTQSxFQUFFQSxZQUFZQTtRQUN2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VUEsQ0FBQ0EsQ0FBQ0E7WUFDdkNBLE1BQU1BLENBQUNBLFFBQVFBLEdBQUdBLEVBQUVBLENBQUNBO1lBQ3JCQSxJQUFJQSxTQUFTQSxHQUFHQSxNQUFNQSxDQUFDQSxZQUFZQSxDQUFDQSxLQUFLQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQTtZQUMvQ0EsRUFBRUEsQ0FBQ0EsQ0FBQ0EsU0FBU0EsSUFBSUEsU0FBU0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0JBQ2xDQSxNQUFNQSxDQUFDQSxRQUFRQSxHQUFHQSxTQUFTQSxDQUFDQSxTQUFTQSxDQUFDQSxNQUFNQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUNwREEsQ0FBQ0E7WUFHREEsZUFBU0EsQ0FBQ0EsTUFBTUEsRUFBRUEsU0FBU0EsRUFBRUEsWUFBWUEsQ0FBQ0EsQ0FBQ0E7WUFDM0NBLG1DQUE2QkEsQ0FBQ0EsTUFBTUEsRUFBRUEsU0FBU0EsQ0FBQ0EsQ0FBQ0E7WUFFakRBLE1BQU1BLENBQUNBLGFBQWFBLEdBQUdBLE1BQU1BLENBQUNBLFlBQVlBLENBQUNBO1lBQzNDQSxFQUFFQSxDQUFDQSxDQUFDQSxNQUFNQSxDQUFDQSxTQUFTQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUV2QkEsQ0FBQ0E7WUFDREEsTUFBTUEsQ0FBQ0EsWUFBWUEsR0FBR0Esa0JBQVlBLENBQUNBLE1BQU1BLENBQUNBLFlBQVlBLEVBQUVBLE1BQU1BLENBQUNBLFNBQVNBLENBQUNBLENBQUNBO1lBQzFFQSxNQUFNQSxDQUFDQSxhQUFhQSxHQUFHQSxNQUFNQSxDQUFDQSxTQUFTQSxHQUFHQSxVQUFVQSxDQUFDQSxJQUFJQSxDQUFDQSxNQUFNQSxDQUFDQSxZQUFZQSxFQUFFQSxjQUFjQSxDQUFDQSxHQUFHQSxNQUFNQSxDQUFDQSxZQUFZQSxDQUFDQTtZQUVySEEsTUFBTUEsQ0FBQ0EsTUFBTUEsR0FBR0EsRUFDZkEsQ0FBQ0E7WUFDRkEsTUFBTUEsQ0FBQ0EsU0FBU0EsR0FBR0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0E7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LENBQUNBO1lBQ3REQSxJQUFJQSxTQUFTQSxHQUFHQSxNQUFNQSxDQUFDQSxrQkFBa0JBLENBQUNBLEtBQUtBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBO1lBQ3JEQSxFQUFFQSxDQUFDQSxDQUFDQSxTQUFTQSxJQUFJQSxTQUFTQSxDQUFDQSxNQUFNQSxDQUFDQSxDQUFDQSxDQUFDQTtnQkFDbENBLE1BQU1BLENBQUNBLFFBQVFBLEdBQUdBLFNBQVNBLENBQUNBLFNBQVNBLENBQUNBLE1BQU1BLEdBQUdBLENBQUNBLENBQUNBLENBQUNBO1lBQ3BEQSxDQUFDQTtZQUNEQSxFQUFFQSxDQUFDQSxDQUFDQSxDQUFDQSxNQUFNQSxDQUFDQSxrQkFBa0JBLENBQUNBLFVBQVVBLENBQUNBLEdBQUdBLENBQUNBLElBQUlBLE1BQU1BLENBQUNBLGtCQUFrQkEsQ0FBQ0EsTUFBTUEsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0JBQ3ZGQSxNQUFNQSxDQUFDQSxrQkFBa0JBLEdBQUdBLEdBQUdBLEdBQUdBLE1BQU1BLENBQUNBLGtCQUFrQkEsQ0FBQ0E7WUFDOURBLENBQUNBO1lBRURBLE1BQU1BLENBQUNBLFVBQVVBLEdBQUdBLFlBQVlBLENBQUNBLGVBQWVBLENBQUNBLENBQUNBO1lBQ2xEQSxNQUFNQSxDQUFDQSxJQUFJQSxHQUFHQSxZQUFZQSxDQUFDQSxVQUFVQSxDQUFDQSxDQUFDQTtZQUV2Q0EsTUFBTUEsQ0FBQ0EsUUFBUUEsR0FBR0Esc0JBQWdCQSxDQUFDQSxVQUFVQSxFQUFFQSxNQUFNQSxDQUFDQSxZQUFZQSxDQUFDQSxDQUFDQTtZQUNwRUEsTUFBTUEsQ0FBQ0EsT0FBT0EsR0FBR0EsTUFBTUEsQ0FBQ0EsUUFBUUEsQ0FBQ0EsTUFBTUEsS0FBS0EsQ0FBQ0EsQ0FBQ0E7WUFFOUNBLGVBQVNBLENBQUNBLE1BQU1BLEVBQUVBLFNBQVNBLEVBQUVBLFlBQVlBLENBQUNBLENBQUNBO1lBQzNDQSxtQ0FBNkJBLENBQUNBLE1BQU1BLEVBQUVBLFNBQVNBLENBQUNBLENBQUNBO1lBR2pEQSxN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cGlsZWQuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvLy8gQ29weXJpZ2h0IDIwMTQtMjAxNSBSZWQgSGF0LCBJbmMuIGFuZC9vciBpdHMgYWZmaWxpYXRlc1xuLy8vIGFuZCBvdGhlciBjb250cmlidXRvcnMgYXMgaW5kaWNhdGVkIGJ5IHRoZSBAYXV0aG9yIHRhZ3MuXG4vLy9cbi8vLyBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuLy8vIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbi8vLyBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbi8vL1xuLy8vICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4vLy9cbi8vLyBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4vLy8gZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuLy8vIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuLy8vIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbi8vLyBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cblxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uL2xpYnMvaGF3dGlvLXV0aWxpdGllcy9kZWZzLmQudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vbGlicy9oYXd0aW8tb2F1dGgvZGVmcy5kLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uL2xpYnMvaGF3dGlvLWt1YmVybmV0ZXMvZGVmcy5kLnRzXCIvPlxuIiwiLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vaW5jbHVkZXMudHNcIi8+XG5tb2R1bGUgRm9yZ2Uge1xuXG4gIGV4cG9ydCB2YXIgY29udGV4dCA9ICcvd29ya3NwYWNlcy86bmFtZXNwYWNlL2ZvcmdlJztcblxuICBleHBvcnQgdmFyIGhhc2ggPSAnIycgKyBjb250ZXh0O1xuICBleHBvcnQgdmFyIHBsdWdpbk5hbWUgPSAnRm9yZ2UnO1xuICBleHBvcnQgdmFyIHBsdWdpblBhdGggPSAncGx1Z2lucy9mb3JnZS8nO1xuICBleHBvcnQgdmFyIHRlbXBsYXRlUGF0aCA9IHBsdWdpblBhdGggKyAnaHRtbC8nO1xuICBleHBvcnQgdmFyIGxvZzpMb2dnaW5nLkxvZ2dlciA9IExvZ2dlci5nZXQocGx1Z2luTmFtZSk7XG5cbiAgZXhwb3J0IHZhciBkZWZhdWx0SWNvblVybCA9IENvcmUudXJsKFwiL2ltZy9mb3JnZS5zdmdcIik7XG5cbiAgZXhwb3J0IHZhciBnb2dzU2VydmljZU5hbWUgPSBcImdvZ3NcIjtcbiAgZXhwb3J0IHZhciBvcmlvblNlcnZpY2VOYW1lID0gXCJvcmlvblwiO1xuXG4gIGV4cG9ydCB2YXIgbG9nZ2VkSW5Ub0dvZ3MgPSBmYWxzZTtcblxuICBleHBvcnQgZnVuY3Rpb24gaXNGb3JnZSh3b3Jrc3BhY2UpIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiBpbml0U2NvcGUoJHNjb3BlLCAkbG9jYXRpb24sICRyb3V0ZVBhcmFtcykge1xuICAgICRzY29wZS5wcm9qZWN0SWQgPSAkcm91dGVQYXJhbXNbXCJwcm9qZWN0XCJdO1xuICAgICRzY29wZS4kd29ya3NwYWNlTGluayA9IERldmVsb3Blci53b3Jrc3BhY2VMaW5rKCk7XG4gICAgJHNjb3BlLiRwcm9qZWN0TGluayA9IERldmVsb3Blci5wcm9qZWN0TGluaygkc2NvcGUucHJvamVjdElkKTtcbiAgICAkc2NvcGUuYnJlYWRjcnVtYkNvbmZpZyA9IERldmVsb3Blci5jcmVhdGVQcm9qZWN0QnJlYWRjcnVtYnMoJHNjb3BlLnByb2plY3RJZCk7XG4gICAgJHNjb3BlLnN1YlRhYkNvbmZpZyA9IERldmVsb3Blci5jcmVhdGVQcm9qZWN0U3ViTmF2QmFycygkc2NvcGUucHJvamVjdElkKTtcbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiBjb21tYW5kTGluayhwcm9qZWN0SWQsIG5hbWUsIHJlc291cmNlUGF0aCkge1xuICAgIHZhciBsaW5rID0gRGV2ZWxvcGVyLnByb2plY3RMaW5rKHByb2plY3RJZCk7XG4gICAgaWYgKG5hbWUpIHtcbiAgICAgIGlmIChyZXNvdXJjZVBhdGgpIHtcbiAgICAgICAgcmV0dXJuIFVybEhlbHBlcnMuam9pbihsaW5rLCBcIi9mb3JnZS9jb21tYW5kXCIsIG5hbWUsIHJlc291cmNlUGF0aCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gVXJsSGVscGVycy5qb2luKGxpbmssIFwiL2ZvcmdlL2NvbW1hbmQvXCIsIG5hbWUpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiBjb21tYW5kc0xpbmsocmVzb3VyY2VQYXRoLCBwcm9qZWN0SWQpIHtcbiAgICB2YXIgbGluayA9IERldmVsb3Blci5wcm9qZWN0TGluayhwcm9qZWN0SWQpO1xuICAgIGlmIChyZXNvdXJjZVBhdGgpIHtcbiAgICAgIHJldHVybiBVcmxIZWxwZXJzLmpvaW4obGluaywgXCIvZm9yZ2UvY29tbWFuZHMvdXNlclwiLCByZXNvdXJjZVBhdGgpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gVXJsSGVscGVycy5qb2luKGxpbmssIFwiL2ZvcmdlL2NvbW1hbmRzXCIpO1xuICAgIH1cbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiByZXBvc0FwaVVybChGb3JnZUFwaVVSTCkge1xuICAgIHJldHVybiBVcmxIZWxwZXJzLmpvaW4oRm9yZ2VBcGlVUkwsIFwiL3JlcG9zXCIpO1xuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIHJlcG9BcGlVcmwoRm9yZ2VBcGlVUkwsIHBhdGgpIHtcbiAgICByZXR1cm4gVXJsSGVscGVycy5qb2luKEZvcmdlQXBpVVJMLCBcIi9yZXBvcy91c2VyXCIsIHBhdGgpO1xuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIGNvbW1hbmRBcGlVcmwoRm9yZ2VBcGlVUkwsIGNvbW1hbmRJZCwgcmVzb3VyY2VQYXRoID0gbnVsbCkge1xuICAgIHJldHVybiBVcmxIZWxwZXJzLmpvaW4oRm9yZ2VBcGlVUkwsIFwiY29tbWFuZFwiLCBjb21tYW5kSWQsIHJlc291cmNlUGF0aCk7XG4gIH1cblxuICBleHBvcnQgZnVuY3Rpb24gZXhlY3V0ZUNvbW1hbmRBcGlVcmwoRm9yZ2VBcGlVUkwsIGNvbW1hbmRJZCkge1xuICAgIHJldHVybiBVcmxIZWxwZXJzLmpvaW4oRm9yZ2VBcGlVUkwsIFwiY29tbWFuZFwiLCBcImV4ZWN1dGVcIiwgY29tbWFuZElkKTtcbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiB2YWxpZGF0ZUNvbW1hbmRBcGlVcmwoRm9yZ2VBcGlVUkwsIGNvbW1hbmRJZCkge1xuICAgIHJldHVybiBVcmxIZWxwZXJzLmpvaW4oRm9yZ2VBcGlVUkwsIFwiY29tbWFuZFwiLCBcInZhbGlkYXRlXCIsIGNvbW1hbmRJZCk7XG4gIH1cblxuICBleHBvcnQgZnVuY3Rpb24gY29tbWFuZElucHV0QXBpVXJsKEZvcmdlQXBpVVJMLCBjb21tYW5kSWQsIHJlc291cmNlUGF0aCkge1xuICAgIHJldHVybiBVcmxIZWxwZXJzLmpvaW4oRm9yZ2VBcGlVUkwsIFwiY29tbWFuZElucHV0XCIsIGNvbW1hbmRJZCwgcmVzb3VyY2VQYXRoKTtcbiAgfVxuXG5cblxuICAvKipcbiAgICogUmV0dXJucyB0aGUgcHJvamVjdCBmb3IgdGhlIGdpdmVuIHJlc291cmNlIHBhdGhcbiAgICovXG4gIGZ1bmN0aW9uIG1vZGVsUHJvamVjdChGb3JnZU1vZGVsLCByZXNvdXJjZVBhdGgpIHtcbiAgICBpZiAocmVzb3VyY2VQYXRoKSB7XG4gICAgICB2YXIgcHJvamVjdCA9IEZvcmdlTW9kZWwucHJvamVjdHNbcmVzb3VyY2VQYXRoXTtcbiAgICAgIGlmICghcHJvamVjdCkge1xuICAgICAgICBwcm9qZWN0ID0ge307XG4gICAgICAgIEZvcmdlTW9kZWwucHJvamVjdHNbcmVzb3VyY2VQYXRoXSA9IHByb2plY3Q7XG4gICAgICB9XG4gICAgICByZXR1cm4gcHJvamVjdDtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIEZvcmdlTW9kZWwucm9vdFByb2plY3Q7XG4gICAgfVxuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIHNldE1vZGVsQ29tbWFuZHMoRm9yZ2VNb2RlbCwgcmVzb3VyY2VQYXRoLCBjb21tYW5kcykge1xuICAgIHZhciBwcm9qZWN0ID0gbW9kZWxQcm9qZWN0KEZvcmdlTW9kZWwsIHJlc291cmNlUGF0aCk7XG4gICAgcHJvamVjdC4kY29tbWFuZHMgPSBjb21tYW5kcztcbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiBnZXRNb2RlbENvbW1hbmRzKEZvcmdlTW9kZWwsIHJlc291cmNlUGF0aCkge1xuICAgIHZhciBwcm9qZWN0ID0gbW9kZWxQcm9qZWN0KEZvcmdlTW9kZWwsIHJlc291cmNlUGF0aCk7XG4gICAgcmV0dXJuIHByb2plY3QuJGNvbW1hbmRzIHx8IFtdO1xuICB9XG5cbiAgZnVuY3Rpb24gbW9kZWxDb21tYW5kSW5wdXRNYXAoRm9yZ2VNb2RlbCwgcmVzb3VyY2VQYXRoKSB7XG4gICAgdmFyIHByb2plY3QgPSBtb2RlbFByb2plY3QoRm9yZ2VNb2RlbCwgcmVzb3VyY2VQYXRoKTtcbiAgICB2YXIgY29tbWFuZElucHV0cyA9IHByb2plY3QuJGNvbW1hbmRJbnB1dHM7XG4gICAgaWYgKCFjb21tYW5kSW5wdXRzKSB7XG4gICAgICBjb21tYW5kSW5wdXRzID0ge307XG4gICAgICBwcm9qZWN0LiRjb21tYW5kSW5wdXRzID0gY29tbWFuZElucHV0cztcbiAgICB9XG4gICAgcmV0dXJuIGNvbW1hbmRJbnB1dHM7XG4gIH1cblxuICBleHBvcnQgZnVuY3Rpb24gZ2V0TW9kZWxDb21tYW5kSW5wdXRzKEZvcmdlTW9kZWwsIHJlc291cmNlUGF0aCwgaWQpIHtcbiAgICB2YXIgY29tbWFuZElucHV0cyA9IG1vZGVsQ29tbWFuZElucHV0TWFwKEZvcmdlTW9kZWwsIHJlc291cmNlUGF0aCk7XG4gICAgcmV0dXJuIGNvbW1hbmRJbnB1dHNbaWRdO1xuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIHNldE1vZGVsQ29tbWFuZElucHV0cyhGb3JnZU1vZGVsLCByZXNvdXJjZVBhdGgsIGlkLCBpdGVtKSB7XG4gICAgdmFyIGNvbW1hbmRJbnB1dHMgPSBtb2RlbENvbW1hbmRJbnB1dE1hcChGb3JnZU1vZGVsLCByZXNvdXJjZVBhdGgpO1xuICAgIHJldHVybiBjb21tYW5kSW5wdXRzW2lkXSA9IGl0ZW07XG4gIH1cblxuICBleHBvcnQgZnVuY3Rpb24gZW5yaWNoUmVwbyhyZXBvKSB7XG4gICAgdmFyIG93bmVyID0gcmVwby5vd25lciB8fCB7fTtcbiAgICB2YXIgdXNlciA9IG93bmVyLnVzZXJuYW1lIHx8IHJlcG8udXNlcjtcbiAgICB2YXIgbmFtZSA9IHJlcG8ubmFtZTtcbiAgICB2YXIgcHJvamVjdElkID0gbmFtZTtcbiAgICB2YXIgYXZhdGFyX3VybCA9IG93bmVyLmF2YXRhcl91cmw7XG4gICAgaWYgKGF2YXRhcl91cmwgJiYgYXZhdGFyX3VybC5zdGFydHNXaXRoKFwiaHR0cC8vXCIpKSB7XG4gICAgICBhdmF0YXJfdXJsID0gXCJodHRwOi8vXCIgKyBhdmF0YXJfdXJsLnN1YnN0cmluZyg2KTtcbiAgICAgIG93bmVyLmF2YXRhcl91cmwgPSBhdmF0YXJfdXJsO1xuICAgIH1cbiAgICBpZiAodXNlciAmJiBuYW1lKSB7XG4gICAgICB2YXIgcmVzb3VyY2VQYXRoID0gdXNlciArIFwiL1wiICsgbmFtZTtcbiAgICAgIHJlcG8uJGNvbW1hbmRzTGluayA9IGNvbW1hbmRzTGluayhyZXNvdXJjZVBhdGgsIHByb2plY3RJZCk7XG4gICAgICByZXBvLiRidWlsZHNMaW5rID0gXCIva3ViZXJuZXRlcy9idWlsZHM/cT0vXCIgKyByZXNvdXJjZVBhdGggKyBcIi5naXRcIjtcbiAgICAgIHZhciBpbmplY3RvciA9IEhhd3Rpb0NvcmUuaW5qZWN0b3I7XG4gICAgICBpZiAoaW5qZWN0b3IpIHtcbiAgICAgICAgdmFyIFNlcnZpY2VSZWdpc3RyeSA9IGluamVjdG9yLmdldChcIlNlcnZpY2VSZWdpc3RyeVwiKTtcbiAgICAgICAgaWYgKFNlcnZpY2VSZWdpc3RyeSkge1xuICAgICAgICAgIHZhciBvcmlvbkxpbmsgPSBTZXJ2aWNlUmVnaXN0cnkuc2VydmljZUxpbmsob3Jpb25TZXJ2aWNlTmFtZSk7XG4gICAgICAgICAgdmFyIGdvZ3NTZXJ2aWNlID0gU2VydmljZVJlZ2lzdHJ5LmZpbmRTZXJ2aWNlKGdvZ3NTZXJ2aWNlTmFtZSk7XG4gICAgICAgICAgaWYgKG9yaW9uTGluayAmJiBnb2dzU2VydmljZSkge1xuICAgICAgICAgICAgdmFyIHBvcnRhbElwID0gZ29nc1NlcnZpY2UucG9ydGFsSVA7XG4gICAgICAgICAgICBpZiAocG9ydGFsSXApIHtcbiAgICAgICAgICAgICAgdmFyIHBvcnQgPSBnb2dzU2VydmljZS5wb3J0O1xuICAgICAgICAgICAgICB2YXIgcG9ydFRleHQgPSAocG9ydCAmJiBwb3J0ICE9PSA4MCAmJiBwb3J0ICE9PSA0NDMpID8gXCI6XCIgKyBwb3J0IDogXCJcIjtcbiAgICAgICAgICAgICAgdmFyIHByb3RvY29sID0gKHBvcnQgJiYgcG9ydCA9PT0gNDQzKSA/IFwiaHR0cHM6Ly9cIiA6IFwiaHR0cDovL1wiO1xuICAgICAgICAgICAgICB2YXIgZ2l0Q2xvbmVVcmwgPSBVcmxIZWxwZXJzLmpvaW4ocHJvdG9jb2wgKyBwb3J0YWxJcCArIHBvcnRUZXh0ICsgXCIvXCIsIHJlc291cmNlUGF0aCArIFwiLmdpdFwiKTtcblxuICAgICAgICAgICAgICByZXBvLiRvcGVuUHJvamVjdExpbmsgPSBVcmxIZWxwZXJzLmpvaW4ob3Jpb25MaW5rLFxuICAgICAgICAgICAgICAgIFwiL2dpdC9naXQtcmVwb3NpdG9yeS5odG1sIyxjcmVhdGVQcm9qZWN0Lm5hbWU9XCIgKyBuYW1lICsgXCIsY2xvbmVHaXQ9XCIgKyBnaXRDbG9uZVVybCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZUh0dHBDb25maWcoKSB7XG4gICAgdmFyIGF1dGhIZWFkZXIgPSBsb2NhbFN0b3JhZ2VbXCJnb2dzQXV0aG9yaXphdGlvblwiXTtcbiAgICB2YXIgZW1haWwgPSBsb2NhbFN0b3JhZ2VbXCJnb2dzRW1haWxcIl07XG4gICAgdmFyIGNvbmZpZyA9IHtcbi8qXG4gICAgICBoZWFkZXJzOiB7XG4gICAgICAgIEF1dGhvcml6YXRpb246IGF1dGhIZWFkZXIsXG4gICAgICAgIEVtYWlsOiBlbWFpbFxuICAgICAgfVxuKi9cbiAgICB9O1xuICAgIHJldHVybiBjb25maWc7XG4gIH1cblxuICBmdW5jdGlvbiBhZGRRdWVyeUFyZ3VtZW50KHVybCwgbmFtZSwgdmFsdWUpIHtcbiAgICBpZiAodXJsICYmIG5hbWUgJiYgdmFsdWUpIHtcbiAgICAgIHZhciBzZXAgPSAgKHVybC5pbmRleE9mKFwiP1wiKSA+PSAwKSA/IFwiJlwiIDogXCI/XCI7XG4gICAgICByZXR1cm4gdXJsICsgc2VwICsgIG5hbWUgKyBcIj1cIiArIGVuY29kZVVSSUNvbXBvbmVudCh2YWx1ZSk7XG4gICAgfVxuICAgIHJldHVybiB1cmw7XG4gIH1cblxuICBleHBvcnQgZnVuY3Rpb24gY3JlYXRlSHR0cFVybCh1cmwsIGF1dGhIZWFkZXIgPSBudWxsLCBlbWFpbCA9IG51bGwpIHtcbiAgICBhdXRoSGVhZGVyID0gYXV0aEhlYWRlciB8fCBsb2NhbFN0b3JhZ2VbXCJnb2dzQXV0aG9yaXphdGlvblwiXTtcbiAgICBlbWFpbCA9IGVtYWlsIHx8IGxvY2FsU3RvcmFnZVtcImdvZ3NFbWFpbFwiXTtcblxuICAgIHVybCA9IGFkZFF1ZXJ5QXJndW1lbnQodXJsLCBcIl9nb2dzQXV0aFwiLCBhdXRoSGVhZGVyKTtcbiAgICB1cmwgPSBhZGRRdWVyeUFyZ3VtZW50KHVybCwgXCJfZ29nc0VtYWlsXCIsIGVtYWlsKTtcbiAgICByZXR1cm4gdXJsO1xuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIGNvbW1hbmRNYXRjaGVzVGV4dChjb21tYW5kLCBmaWx0ZXJUZXh0KSB7XG4gICAgaWYgKGZpbHRlclRleHQpIHtcbiAgICAgIHJldHVybiBDb3JlLm1hdGNoRmlsdGVySWdub3JlQ2FzZShhbmd1bGFyLnRvSnNvbihjb21tYW5kKSwgZmlsdGVyVGV4dCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiBpc0xvZ2dlZEludG9Hb2dzKCkge1xuICAgIHZhciBhdXRoSGVhZGVyID0gbG9jYWxTdG9yYWdlW1wiZ29nc0F1dGhvcml6YXRpb25cIl07XG4gICAgcmV0dXJuIGF1dGhIZWFkZXIgPyBsb2dnZWRJblRvR29ncyA6IGZhbHNlO1xuLypcbiAgICB2YXIgY29uZmlnID0gY3JlYXRlSHR0cENvbmZpZygpO1xuICAgIHJldHVybiBjb25maWcuaGVhZGVycy5BdXRob3JpemF0aW9uID8gdHJ1ZSA6IGZhbHNlO1xuKi9cbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiByZWRpcmVjdFRvR29nc0xvZ2luSWZSZXF1aXJlZCgkc2NvcGUsICRsb2NhdGlvbikge1xuICAgIGlmICghaXNMb2dnZWRJbnRvR29ncygpKSB7XG4gICAgICB2YXIgZGV2TGluayA9IERldmVsb3Blci5wcm9qZWN0TGluaygkc2NvcGUucHJvamVjdElkKTtcbiAgICAgIHZhciBsb2dpblBhZ2UgPSBVcmxIZWxwZXJzLmpvaW4oZGV2TGluaywgXCJmb3JnZS9yZXBvc1wiKTtcbiAgICAgIGxvZy5pbmZvKFwiTm90IGxvZ2dlZCBpbiBzbyByZWRpcmVjdGluZyB0byBcIiArIGxvZ2luUGFnZSk7XG4gICAgICAkbG9jYXRpb24ucGF0aChsb2dpblBhZ2UpXG4gICAgfVxuICB9XG59XG4iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vaW5jbHVkZXMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiZm9yZ2VIZWxwZXJzLnRzXCIvPlxuXG5tb2R1bGUgRm9yZ2Uge1xuXG4gIGV4cG9ydCB2YXIgX21vZHVsZSA9IGFuZ3VsYXIubW9kdWxlKHBsdWdpbk5hbWUsIFsnaGF3dGlvLWNvcmUnLCAnaGF3dGlvLXVpJ10pO1xuICBleHBvcnQgdmFyIGNvbnRyb2xsZXIgPSBQbHVnaW5IZWxwZXJzLmNyZWF0ZUNvbnRyb2xsZXJGdW5jdGlvbihfbW9kdWxlLCBwbHVnaW5OYW1lKTtcbiAgZXhwb3J0IHZhciByb3V0ZSA9IFBsdWdpbkhlbHBlcnMuY3JlYXRlUm91dGluZ0Z1bmN0aW9uKHRlbXBsYXRlUGF0aCk7XG5cbiAgX21vZHVsZS5jb25maWcoWyckcm91dGVQcm92aWRlcicsICgkcm91dGVQcm92aWRlcjpuZy5yb3V0ZS5JUm91dGVQcm92aWRlcikgPT4ge1xuXG4gICAgY29uc29sZS5sb2coXCJMaXN0ZW5pbmcgb246IFwiICsgVXJsSGVscGVycy5qb2luKGNvbnRleHQsICcvY3JlYXRlUHJvamVjdCcpKTtcblxuICAgICRyb3V0ZVByb3ZpZGVyLndoZW4oVXJsSGVscGVycy5qb2luKGNvbnRleHQsICcvY3JlYXRlUHJvamVjdCcpLCByb3V0ZSgnY3JlYXRlUHJvamVjdC5odG1sJywgZmFsc2UpKVxuICAgICAgLndoZW4oVXJsSGVscGVycy5qb2luKGNvbnRleHQsICcvcmVwb3MvOnBhdGgqJyksIHJvdXRlKCdyZXBvLmh0bWwnLCBmYWxzZSkpXG4gICAgICAud2hlbihVcmxIZWxwZXJzLmpvaW4oY29udGV4dCwgJy9yZXBvcycpLCByb3V0ZSgncmVwb3MuaHRtbCcsIGZhbHNlKSk7XG5cbiAgICBhbmd1bGFyLmZvckVhY2goW2NvbnRleHQsICcvd29ya3NwYWNlcy86bmFtZXNwYWNlL3Byb2plY3RzLzpwcm9qZWN0L2ZvcmdlJ10sIChwYXRoKSA9PiB7XG4gICAgICAkcm91dGVQcm92aWRlclxuICAgICAgICAud2hlbihVcmxIZWxwZXJzLmpvaW4ocGF0aCwgJy9jb21tYW5kcycpLCByb3V0ZSgnY29tbWFuZHMuaHRtbCcsIGZhbHNlKSlcbiAgICAgICAgLndoZW4oVXJsSGVscGVycy5qb2luKHBhdGgsICcvY29tbWFuZHMvOnBhdGgqJyksIHJvdXRlKCdjb21tYW5kcy5odG1sJywgZmFsc2UpKVxuICAgICAgICAud2hlbihVcmxIZWxwZXJzLmpvaW4ocGF0aCwgJy9jb21tYW5kLzppZCcpLCByb3V0ZSgnY29tbWFuZC5odG1sJywgZmFsc2UpKVxuICAgICAgICAud2hlbihVcmxIZWxwZXJzLmpvaW4ocGF0aCwgJy9jb21tYW5kLzppZC86cGF0aConKSwgcm91dGUoJ2NvbW1hbmQuaHRtbCcsIGZhbHNlKSk7XG4gICAgfSk7XG5cbiAgfV0pO1xuXG4gIF9tb2R1bGUuZmFjdG9yeSgnRm9yZ2VBcGlVUkwnLCBbJyRxJywgJyRyb290U2NvcGUnLCAoJHE6bmcuSVFTZXJ2aWNlLCAkcm9vdFNjb3BlOm5nLklSb290U2NvcGVTZXJ2aWNlKSA9PiB7XG4gICAgcmV0dXJuIEt1YmVybmV0ZXMua3ViZXJuZXRlc0FwaVVybCgpICsgXCIvcHJveHlcIiArIEt1YmVybmV0ZXMua3ViZXJuZXRlc05hbWVzcGFjZVBhdGgoKSArIFwiL3NlcnZpY2VzL2ZhYnJpYzgtZm9yZ2UvYXBpL2ZvcmdlXCI7XG4gIH1dKTtcblxuXG4gIF9tb2R1bGUuZmFjdG9yeSgnRm9yZ2VNb2RlbCcsIFsnJHEnLCAnJHJvb3RTY29wZScsICgkcTpuZy5JUVNlcnZpY2UsICRyb290U2NvcGU6bmcuSVJvb3RTY29wZVNlcnZpY2UpID0+IHtcbiAgICByZXR1cm4ge1xuICAgICAgcm9vdFByb2plY3Q6IHt9LFxuICAgICAgcHJvamVjdHM6IFtdXG4gICAgfVxuICB9XSk7XG5cbiAgX21vZHVsZS5ydW4oWyd2aWV3UmVnaXN0cnknLCAnSGF3dGlvTmF2JywgKHZpZXdSZWdpc3RyeSwgSGF3dGlvTmF2KSA9PiB7XG4gICAgdmlld1JlZ2lzdHJ5Wydmb3JnZSddID0gdGVtcGxhdGVQYXRoICsgJ2xheW91dEZvcmdlLmh0bWwnO1xuICB9XSk7XG5cbiAgaGF3dGlvUGx1Z2luTG9hZGVyLmFkZE1vZHVsZShwbHVnaW5OYW1lKTtcbn1cbiIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9pbmNsdWRlcy50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJmb3JnZUhlbHBlcnMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiZm9yZ2VQbHVnaW4udHNcIi8+XG5cbm1vZHVsZSBGb3JnZSB7XG5cbiAgZXhwb3J0IHZhciBDb21tYW5kQ29udHJvbGxlciA9IGNvbnRyb2xsZXIoXCJDb21tYW5kQ29udHJvbGxlclwiLFxuICAgIFtcIiRzY29wZVwiLCBcIiR0ZW1wbGF0ZUNhY2hlXCIsIFwiJGxvY2F0aW9uXCIsIFwiJHJvdXRlUGFyYW1zXCIsIFwiJGh0dHBcIiwgXCIkdGltZW91dFwiLCBcIkZvcmdlQXBpVVJMXCIsIFwiRm9yZ2VNb2RlbFwiLFxuICAgICAgKCRzY29wZSwgJHRlbXBsYXRlQ2FjaGU6bmcuSVRlbXBsYXRlQ2FjaGVTZXJ2aWNlLCAkbG9jYXRpb246bmcuSUxvY2F0aW9uU2VydmljZSwgJHJvdXRlUGFyYW1zLCAkaHR0cCwgJHRpbWVvdXQsIEZvcmdlQXBpVVJMLCBGb3JnZU1vZGVsKSA9PiB7XG5cbiAgICAgICAgJHNjb3BlLm1vZGVsID0gRm9yZ2VNb2RlbDtcblxuICAgICAgICAkc2NvcGUucmVzb3VyY2VQYXRoID0gJHJvdXRlUGFyYW1zW1wicGF0aFwiXSB8fCAkbG9jYXRpb24uc2VhcmNoKClbXCJwYXRoXCJdIHx8IFwiXCI7XG4gICAgICAgICRzY29wZS5pZCA9ICRyb3V0ZVBhcmFtc1tcImlkXCJdO1xuICAgICAgICAkc2NvcGUucGF0aCA9ICRyb3V0ZVBhcmFtc1tcInBhdGhcIl07XG5cbiAgICAgICAgJHNjb3BlLmF2YXRhcl91cmwgPSBsb2NhbFN0b3JhZ2VbXCJnb2dzQXZhdGFyVXJsXCJdO1xuICAgICAgICAkc2NvcGUudXNlciA9IGxvY2FsU3RvcmFnZVtcImdvZ3NVc2VyXCJdO1xuICAgICAgICAkc2NvcGUucmVwb05hbWUgPSBcIlwiO1xuICAgICAgICB2YXIgcGF0aFN0ZXBzID0gJHNjb3BlLnJlc291cmNlUGF0aC5zcGxpdChcIi9cIik7XG4gICAgICAgIGlmIChwYXRoU3RlcHMgJiYgcGF0aFN0ZXBzLmxlbmd0aCkge1xuICAgICAgICAgICRzY29wZS5yZXBvTmFtZSA9IHBhdGhTdGVwc1twYXRoU3RlcHMubGVuZ3RoIC0gMV07XG4gICAgICAgIH1cblxuXG4gICAgICAgIGluaXRTY29wZSgkc2NvcGUsICRsb2NhdGlvbiwgJHJvdXRlUGFyYW1zKTtcbiAgICAgICAgcmVkaXJlY3RUb0dvZ3NMb2dpbklmUmVxdWlyZWQoJHNjb3BlLCAkbG9jYXRpb24pO1xuXG4gICAgICAgICRzY29wZS4kY29tcGxldGVMaW5rID0gJHNjb3BlLiRwcm9qZWN0TGluaztcbiAgICAgICAgaWYgKCRzY29wZS5wcm9qZWN0SWQpIHtcblxuICAgICAgICB9XG4gICAgICAgICRzY29wZS5jb21tYW5kc0xpbmsgPSBjb21tYW5kc0xpbmsoJHNjb3BlLnJlc291cmNlUGF0aCwgJHNjb3BlLnByb2plY3RJZCk7XG4gICAgICAgICRzY29wZS5jb21wbGV0ZWRMaW5rID0gJHNjb3BlLnByb2plY3RJZCA/IFVybEhlbHBlcnMuam9pbigkc2NvcGUuJHByb2plY3RMaW5rLCBcImVudmlyb25tZW50c1wiKSA6ICRzY29wZS4kcHJvamVjdExpbms7XG5cbiAgICAgICAgJHNjb3BlLmVudGl0eSA9IHtcbiAgICAgICAgfTtcbiAgICAgICAgJHNjb3BlLmlucHV0TGlzdCA9IFskc2NvcGUuZW50aXR5XTtcblxuICAgICAgICAkc2NvcGUuc2NoZW1hID0gZ2V0TW9kZWxDb21tYW5kSW5wdXRzKEZvcmdlTW9kZWwsICRzY29wZS5yZXNvdXJjZVBhdGgsICRzY29wZS5pZCk7XG4gICAgICAgIG9uU2NoZW1hTG9hZCgpO1xuXG4gICAgICAgIGZ1bmN0aW9uIG9uUm91dGVDaGFuZ2VkKCkge1xuICAgICAgICAgIGNvbnNvbGUubG9nKFwicm91dGUgdXBkYXRlZDsgbGV0cyBjbGVhciB0aGUgZW50aXR5XCIpO1xuICAgICAgICAgICRzY29wZS5lbnRpdHkgPSB7XG4gICAgICAgICAgfTtcbiAgICAgICAgICAkc2NvcGUuaW5wdXRMaXN0ID0gWyRzY29wZS5lbnRpdHldO1xuICAgICAgICAgICRzY29wZS5wcmV2aW91c1NjaGVtYUpzb24gPSBcIlwiO1xuICAgICAgICAgICRzY29wZS5zY2hlbWEgPSBudWxsO1xuICAgICAgICAgIENvcmUuJGFwcGx5KCRzY29wZSk7XG4gICAgICAgICAgdXBkYXRlRGF0YSgpO1xuICAgICAgICB9XG5cbiAgICAgICAgJHNjb3BlLiRvbignJHJvdXRlQ2hhbmdlU3VjY2VzcycsIG9uUm91dGVDaGFuZ2VkKTtcblxuICAgICAgICAkc2NvcGUuZXhlY3V0ZSA9ICgpID0+IHtcbiAgICAgICAgICAvLyBUT0RPIGNoZWNrIGlmIHZhbGlkLi4uXG4gICAgICAgICAgJHNjb3BlLnJlc3BvbnNlID0gbnVsbDtcbiAgICAgICAgICAkc2NvcGUuZXhlY3V0aW5nID0gdHJ1ZTtcbiAgICAgICAgICAkc2NvcGUuaW52YWxpZCA9IGZhbHNlO1xuICAgICAgICAgICRzY29wZS52YWxpZGF0aW9uRXJyb3IgPSBudWxsO1xuICAgICAgICAgIHZhciBjb21tYW5kSWQgPSAkc2NvcGUuaWQ7XG4gICAgICAgICAgdmFyIHJlc291cmNlUGF0aCA9ICRzY29wZS5yZXNvdXJjZVBhdGg7XG4gICAgICAgICAgdmFyIHVybCA9IGV4ZWN1dGVDb21tYW5kQXBpVXJsKEZvcmdlQXBpVVJMLCBjb21tYW5kSWQpO1xuICAgICAgICAgIHZhciByZXF1ZXN0ID0ge1xuICAgICAgICAgICAgcmVzb3VyY2U6IHJlc291cmNlUGF0aCxcbiAgICAgICAgICAgIGlucHV0TGlzdDogJHNjb3BlLmlucHV0TGlzdFxuICAgICAgICAgIH07XG4gICAgICAgICAgdXJsID0gY3JlYXRlSHR0cFVybCh1cmwpO1xuICAgICAgICAgIGxvZy5pbmZvKFwiQWJvdXQgdG8gcG9zdCB0byBcIiArIHVybCArIFwiIHBheWxvYWQ6IFwiICsgYW5ndWxhci50b0pzb24ocmVxdWVzdCkpO1xuICAgICAgICAgICRodHRwLnBvc3QodXJsLCByZXF1ZXN0LCBjcmVhdGVIdHRwQ29uZmlnKCkpLlxuICAgICAgICAgICAgc3VjY2VzcyhmdW5jdGlvbiAoZGF0YSwgc3RhdHVzLCBoZWFkZXJzLCBjb25maWcpIHtcbiAgICAgICAgICAgICAgJHNjb3BlLmV4ZWN1dGluZyA9IGZhbHNlO1xuICAgICAgICAgICAgICAkc2NvcGUuaW52YWxpZCA9IGZhbHNlO1xuICAgICAgICAgICAgICAkc2NvcGUudmFsaWRhdGlvbkVycm9yID0gbnVsbDtcbiAgICAgICAgICAgICAgaWYgKGRhdGEpIHtcbiAgICAgICAgICAgICAgICBkYXRhLm1lc3NhZ2UgPSBkYXRhLm1lc3NhZ2UgfHwgZGF0YS5vdXRwdXQ7XG4gICAgICAgICAgICAgICAgdmFyIHdpemFyZFJlc3VsdHMgPSBkYXRhLndpemFyZFJlc3VsdHM7XG4gICAgICAgICAgICAgICAgaWYgKHdpemFyZFJlc3VsdHMpIHtcbiAgICAgICAgICAgICAgICAgIGFuZ3VsYXIuZm9yRWFjaCh3aXphcmRSZXN1bHRzLnN0ZXBWYWxpZGF0aW9ucywgKHZhbGlkYXRpb24pID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCEkc2NvcGUuaW52YWxpZCAmJiAhdmFsaWRhdGlvbi52YWxpZCkge1xuICAgICAgICAgICAgICAgICAgICAgIHZhciBtZXNzYWdlcyA9IHZhbGlkYXRpb24ubWVzc2FnZXMgfHwgW107XG4gICAgICAgICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2VzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIG1lc3NhZ2UgPSBtZXNzYWdlc1swXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5pbnZhbGlkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLnZhbGlkYXRpb25FcnJvciA9IG1lc3NhZ2UuZGVzY3JpcHRpb247XG4gICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS52YWxpZGF0aW9uSW5wdXQgPSBtZXNzYWdlLmlucHV0TmFtZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgdmFyIHN0ZXBJbnB1dHMgPSB3aXphcmRSZXN1bHRzLnN0ZXBJbnB1dHM7XG4gICAgICAgICAgICAgICAgICBpZiAoc3RlcElucHV0cykge1xuICAgICAgICAgICAgICAgICAgICB2YXIgc2NoZW1hID0gXy5sYXN0KHN0ZXBJbnB1dHMpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoc2NoZW1hKSB7XG4gICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmVudGl0eSA9IHt9O1xuICAgICAgICAgICAgICAgICAgICAgIHVwZGF0ZVNjaGVtYShzY2hlbWEpO1xuICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5pbnB1dExpc3QucHVzaCgkc2NvcGUuZW50aXR5KTtcblxuICAgICAgICAgICAgICAgICAgICAgIGlmIChkYXRhLmNhbk1vdmVUb05leHRTdGVwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBsZXRzIGNsZWFyIHRoZSByZXNwb25zZSB3ZSd2ZSBhbm90aGVyIHdpemFyZCBwYWdlIHRvIGRvXG4gICAgICAgICAgICAgICAgICAgICAgICBkYXRhID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gb3RoZXJ3aXNlIGluZGljYXRlIHRoYXQgdGhlIHdpemFyZCBqdXN0IGNvbXBsZXRlZCBhbmQgbGV0cyBoaWRlIHRoZSBpbnB1dCBmb3JtXG4gICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUud2l6YXJkQ29tcGxldGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgaWYgKCEkc2NvcGUuaW52YWxpZCkge1xuICAgICAgICAgICAgICAgICRzY29wZS5yZXNwb25zZSA9IGRhdGE7XG4gICAgICAgICAgICAgICAgdmFyIHN0YXR1cyA9ICgoZGF0YSB8fCB7fSkuc3RhdHVzIHx8IFwiXCIpLnRvU3RyaW5nKCkudG9Mb3dlckNhc2UoKTtcbiAgICAgICAgICAgICAgICAkc2NvcGUucmVzcG9uc2VDbGFzcyA9IHRvQmFja2dyb3VuZFN0eWxlKHN0YXR1cyk7XG5cbiAgICAgICAgICAgICAgICB2YXIgZnVsbE5hbWUgPSAoKGRhdGEgfHwge30pLm91dHB1dFByb3BlcnRpZXMgfHwge30pLmZ1bGxOYW1lO1xuICAgICAgICAgICAgICAgIGlmICgkc2NvcGUucmVzcG9uc2UgJiYgZnVsbE5hbWUgJiYgJHNjb3BlLmlkID09PSAncHJvamVjdC1uZXcnKSB7XG4gICAgICAgICAgICAgICAgICAkc2NvcGUucmVzcG9uc2UgPSBudWxsO1xuICAgICAgICAgICAgICAgICAgLy8gbGV0cyBmb3J3YXJkIHRvIHRoZSBkZXZvcHMgZWRpdCBwYWdlXG4gICAgICAgICAgICAgICAgICB2YXIgcHJvamVjdElkID0gZnVsbE5hbWUucmVwbGFjZSgnLycsIFwiLVwiKTtcbiAgICAgICAgICAgICAgICAgIHZhciBlZGl0UGF0aCA9IFVybEhlbHBlcnMuam9pbihEZXZlbG9wZXIucHJvamVjdExpbmsocHJvamVjdElkKSwgXCIvZm9yZ2UvY29tbWFuZC9kZXZvcHMtZWRpdC91c2VyXCIsIGZ1bGxOYW1lKTtcbiAgICAgICAgICAgICAgICAgIGxvZy5pbmZvKFwiTW92aW5nIHRvIHRoZSBkZXZvcHMgZWRpdCBwYXRoOiBcIiArIGVkaXRQYXRoKTtcbiAgICAgICAgICAgICAgICAgICRsb2NhdGlvbi5wYXRoKGVkaXRQYXRoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICAgICAgICAgIH0pLlxuICAgICAgICAgICAgZXJyb3IoZnVuY3Rpb24gKGRhdGEsIHN0YXR1cywgaGVhZGVycywgY29uZmlnKSB7XG4gICAgICAgICAgICAgICRzY29wZS5leGVjdXRpbmcgPSBmYWxzZTtcbiAgICAgICAgICAgICAgbG9nLndhcm4oXCJGYWlsZWQgdG8gbG9hZCBcIiArIHVybCArIFwiIFwiICsgZGF0YSArIFwiIFwiICsgc3RhdHVzKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgICAgICRzY29wZS4kd2F0Y2hDb2xsZWN0aW9uKFwiZW50aXR5XCIsICgpID0+IHtcbiAgICAgICAgICB2YWxpZGF0ZSgpO1xuICAgICAgICB9KTtcblxuICAgICAgICBmdW5jdGlvbiB1cGRhdGVTY2hlbWEoc2NoZW1hKSB7XG4gICAgICAgICAgaWYgKHNjaGVtYSkge1xuICAgICAgICAgICAgLy8gbGV0cyByZW1vdmUgdGhlIHZhbHVlcyBzbyB0aGF0IHdlIGNhbiBwcm9wZXJseSBjaGVjayB3aGVuIHRoZSBzY2hlbWEgcmVhbGx5IGRvZXMgY2hhbmdlXG4gICAgICAgICAgICAvLyBvdGhlcndpc2UgdGhlIHNjaGVtYSB3aWxsIGNoYW5nZSBldmVyeSB0aW1lIHdlIHR5cGUgYSBjaGFyYWN0ZXIgOylcbiAgICAgICAgICAgIHZhciBzY2hlbWFXaXRob3V0VmFsdWVzID0gYW5ndWxhci5jb3B5KHNjaGVtYSk7XG4gICAgICAgICAgICBhbmd1bGFyLmZvckVhY2goc2NoZW1hV2l0aG91dFZhbHVlcy5wcm9wZXJ0aWVzLCAocHJvcGVydHkpID0+IHtcbiAgICAgICAgICAgICAgZGVsZXRlIHByb3BlcnR5W1widmFsdWVcIl07XG4gICAgICAgICAgICAgIGRlbGV0ZSBwcm9wZXJ0eVtcImVuYWJsZWRcIl07XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHZhciBqc29uID0gYW5ndWxhci50b0pzb24oc2NoZW1hV2l0aG91dFZhbHVlcyk7XG4gICAgICAgICAgICBpZiAoanNvbiAhPT0gJHNjb3BlLnByZXZpb3VzU2NoZW1hSnNvbikge1xuICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcInVwZGF0ZWQgc2NoZW1hOiBcIiArIGpzb24pO1xuICAgICAgICAgICAgICAkc2NvcGUucHJldmlvdXNTY2hlbWFKc29uID0ganNvbjtcbiAgICAgICAgICAgICAgJHNjb3BlLnNjaGVtYSA9IHNjaGVtYTtcblxuICAgICAgICAgICAgICBpZiAoJHNjb3BlLmlkID09PSBcInByb2plY3QtbmV3XCIpIHtcbiAgICAgICAgICAgICAgICB2YXIgZW50aXR5ID0gJHNjb3BlLmVudGl0eTtcbiAgICAgICAgICAgICAgICAvLyBsZXRzIGhpZGUgdGhlIHRhcmdldCBsb2NhdGlvbiFcbiAgICAgICAgICAgICAgICB2YXIgcHJvcGVydGllcyA9IHNjaGVtYS5wcm9wZXJ0aWVzIHx8IHt9O1xuICAgICAgICAgICAgICAgIHZhciBvdmVyd3JpdGUgPSBwcm9wZXJ0aWVzLm92ZXJ3cml0ZTtcbiAgICAgICAgICAgICAgICB2YXIgY2F0YWxvZyA9IHByb3BlcnRpZXMuY2F0YWxvZztcbiAgICAgICAgICAgICAgICB2YXIgdGFyZ2V0TG9jYXRpb24gPSBwcm9wZXJ0aWVzLnRhcmdldExvY2F0aW9uO1xuICAgICAgICAgICAgICAgIGlmICh0YXJnZXRMb2NhdGlvbikge1xuICAgICAgICAgICAgICAgICAgdGFyZ2V0TG9jYXRpb24uaGlkZGVuID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgIGlmIChvdmVyd3JpdGUpIHtcbiAgICAgICAgICAgICAgICAgICAgb3ZlcndyaXRlLmhpZGRlbiA9IHRydWU7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcImhpZGluZyB0YXJnZXRMb2NhdGlvbiFcIik7XG5cbiAgICAgICAgICAgICAgICAgIC8vIGxldHMgZGVmYXVsdCB0aGUgdHlwZVxuICAgICAgICAgICAgICAgICAgaWYgKCFlbnRpdHkudHlwZSkge1xuICAgICAgICAgICAgICAgICAgICBlbnRpdHkudHlwZSA9IFwiRnJvbSBBcmNoZXR5cGUgQ2F0YWxvZ1wiO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoY2F0YWxvZykge1xuICAgICAgICAgICAgICAgICAgaWYgKCFlbnRpdHkuY2F0YWxvZykge1xuICAgICAgICAgICAgICAgICAgICBlbnRpdHkuY2F0YWxvZyA9IFwiZmFicmljOFwiO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIHZhbGlkYXRlKCkge1xuICAgICAgICAgIGlmICgkc2NvcGUuZXhlY3V0aW5nIHx8ICRzY29wZS52YWxpZGF0aW5nKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICAgIHZhciBuZXdKc29uID0gYW5ndWxhci50b0pzb24oJHNjb3BlLmVudGl0eSk7XG4gICAgICAgICAgaWYgKG5ld0pzb24gPT09ICRzY29wZS52YWxpZGF0ZWRFbnRpdHlKc29uKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICRzY29wZS52YWxpZGF0ZWRFbnRpdHlKc29uID0gbmV3SnNvbjtcbiAgICAgICAgICB9XG4gICAgICAgICAgdmFyIGNvbW1hbmRJZCA9ICRzY29wZS5pZDtcbiAgICAgICAgICB2YXIgcmVzb3VyY2VQYXRoID0gJHNjb3BlLnJlc291cmNlUGF0aDtcbiAgICAgICAgICB2YXIgdXJsID0gdmFsaWRhdGVDb21tYW5kQXBpVXJsKEZvcmdlQXBpVVJMLCBjb21tYW5kSWQpO1xuICAgICAgICAgIC8vIGxldHMgcHV0IHRoZSBlbnRpdHkgaW4gdGhlIGxhc3QgaXRlbSBpbiB0aGUgbGlzdFxuICAgICAgICAgIHZhciBpbnB1dExpc3QgPSBbXS5jb25jYXQoJHNjb3BlLmlucHV0TGlzdCk7XG4gICAgICAgICAgaW5wdXRMaXN0W2lucHV0TGlzdC5sZW5ndGggLSAxXSA9ICRzY29wZS5lbnRpdHk7XG4gICAgICAgICAgdmFyIHJlcXVlc3QgPSB7XG4gICAgICAgICAgICByZXNvdXJjZTogcmVzb3VyY2VQYXRoLFxuICAgICAgICAgICAgaW5wdXRMaXN0OiAkc2NvcGUuaW5wdXRMaXN0XG4gICAgICAgICAgfTtcbiAgICAgICAgICB1cmwgPSBjcmVhdGVIdHRwVXJsKHVybCk7XG4gICAgICAgICAgLy9sb2cuaW5mbyhcIkFib3V0IHRvIHBvc3QgdG8gXCIgKyB1cmwgKyBcIiBwYXlsb2FkOiBcIiArIGFuZ3VsYXIudG9Kc29uKHJlcXVlc3QpKTtcbiAgICAgICAgICAkc2NvcGUudmFsaWRhdGluZyA9IHRydWU7XG4gICAgICAgICAgJGh0dHAucG9zdCh1cmwsIHJlcXVlc3QsIGNyZWF0ZUh0dHBDb25maWcoKSkuXG4gICAgICAgICAgICBzdWNjZXNzKGZ1bmN0aW9uIChkYXRhLCBzdGF0dXMsIGhlYWRlcnMsIGNvbmZpZykge1xuICAgICAgICAgICAgICB0aGlzLnZhbGlkYXRpb24gPSBkYXRhO1xuICAgICAgICAgICAgICAvL2NvbnNvbGUubG9nKFwiZ290IHZhbGlkYXRpb24gXCIgKyBhbmd1bGFyLnRvSnNvbihkYXRhLCB0cnVlKSk7XG4gICAgICAgICAgICAgIHZhciB3aXphcmRSZXN1bHRzID0gZGF0YS53aXphcmRSZXN1bHRzO1xuICAgICAgICAgICAgICBpZiAod2l6YXJkUmVzdWx0cykge1xuICAgICAgICAgICAgICAgIHZhciBzdGVwSW5wdXRzID0gd2l6YXJkUmVzdWx0cy5zdGVwSW5wdXRzO1xuICAgICAgICAgICAgICAgIGlmIChzdGVwSW5wdXRzKSB7XG4gICAgICAgICAgICAgICAgICB2YXIgc2NoZW1hID0gXy5sYXN0KHN0ZXBJbnB1dHMpO1xuICAgICAgICAgICAgICAgICAgdXBkYXRlU2NoZW1hKHNjaGVtYSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIENvcmUuJGFwcGx5KCRzY29wZSk7XG5cbiAgICAgICAgICAgICAgLypcbiAgICAgICAgICAgICAgICogTGV0cyB0aHJvdHRsZSB0aGUgdmFsaWRhdGlvbnMgc28gdGhhdCB3ZSBvbmx5IGZpcmUgYW5vdGhlciB2YWxpZGF0aW9uIGEgbGl0dGxlXG4gICAgICAgICAgICAgICAqIGFmdGVyIHdlJ3ZlIGdvdCBhIHJlcGx5IGFuZCBvbmx5IGlmIHRoZSBtb2RlbCBoYXMgY2hhbmdlZCBzaW5jZSB0aGVuXG4gICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAkdGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgJHNjb3BlLnZhbGlkYXRpbmcgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB2YWxpZGF0ZSgpO1xuICAgICAgICAgICAgICB9LCAyMDApO1xuICAgICAgICAgICAgfSkuXG4gICAgICAgICAgICBlcnJvcihmdW5jdGlvbiAoZGF0YSwgc3RhdHVzLCBoZWFkZXJzLCBjb25maWcpIHtcbiAgICAgICAgICAgICAgJHNjb3BlLmV4ZWN1dGluZyA9IGZhbHNlO1xuICAgICAgICAgICAgICBsb2cud2FybihcIkZhaWxlZCB0byBsb2FkIFwiICsgdXJsICsgXCIgXCIgKyBkYXRhICsgXCIgXCIgKyBzdGF0dXMpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICB1cGRhdGVEYXRhKCk7XG5cbiAgICAgICAgZnVuY3Rpb24gdG9CYWNrZ3JvdW5kU3R5bGUoc3RhdHVzKSB7XG4gICAgICAgICAgaWYgKCFzdGF0dXMpIHtcbiAgICAgICAgICAgIHN0YXR1cyA9IFwiXCI7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChzdGF0dXMuc3RhcnRzV2l0aChcInN1Y1wiKSkge1xuICAgICAgICAgICAgcmV0dXJuIFwiYmctc3VjY2Vzc1wiO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gXCJiZy13YXJuaW5nXCJcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIHVwZGF0ZURhdGEoKSB7XG4gICAgICAgICAgJHNjb3BlLml0ZW0gPSBudWxsO1xuICAgICAgICAgIHZhciBjb21tYW5kSWQgPSAkc2NvcGUuaWQ7XG4gICAgICAgICAgaWYgKGNvbW1hbmRJZCkge1xuICAgICAgICAgICAgdmFyIHJlc291cmNlUGF0aCA9ICRzY29wZS5yZXNvdXJjZVBhdGg7XG4gICAgICAgICAgICB2YXIgdXJsID0gY29tbWFuZElucHV0QXBpVXJsKEZvcmdlQXBpVVJMLCBjb21tYW5kSWQsIHJlc291cmNlUGF0aCk7XG4gICAgICAgICAgICB1cmwgPSBjcmVhdGVIdHRwVXJsKHVybCk7XG4gICAgICAgICAgICAkaHR0cC5nZXQodXJsLCBjcmVhdGVIdHRwQ29uZmlnKCkpLlxuICAgICAgICAgICAgICBzdWNjZXNzKGZ1bmN0aW9uIChkYXRhLCBzdGF0dXMsIGhlYWRlcnMsIGNvbmZpZykge1xuICAgICAgICAgICAgICAgIGlmIChkYXRhKSB7XG4gICAgICAgICAgICAgICAgICAkc2NvcGUuZmV0Y2hlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcInVwZGF0ZURhdGEgbG9hZGVkIHNjaGVtYVwiKTtcbiAgICAgICAgICAgICAgICAgIHVwZGF0ZVNjaGVtYShkYXRhKTtcbiAgICAgICAgICAgICAgICAgIHNldE1vZGVsQ29tbWFuZElucHV0cyhGb3JnZU1vZGVsLCAkc2NvcGUucmVzb3VyY2VQYXRoLCAkc2NvcGUuaWQsICRzY29wZS5zY2hlbWEpO1xuICAgICAgICAgICAgICAgICAgb25TY2hlbWFMb2FkKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIENvcmUuJGFwcGx5KCRzY29wZSk7XG4gICAgICAgICAgICAgIH0pLlxuICAgICAgICAgICAgICBlcnJvcihmdW5jdGlvbiAoZGF0YSwgc3RhdHVzLCBoZWFkZXJzLCBjb25maWcpIHtcbiAgICAgICAgICAgICAgICBsb2cud2FybihcIkZhaWxlZCB0byBsb2FkIFwiICsgdXJsICsgXCIgXCIgKyBkYXRhICsgXCIgXCIgKyBzdGF0dXMpO1xuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBvblNjaGVtYUxvYWQoKSB7XG4gICAgICAgICAgLy8gbGV0cyB1cGRhdGUgdGhlIHZhbHVlIGlmIGl0cyBibGFuayB3aXRoIHRoZSBkZWZhdWx0IHZhbHVlcyBmcm9tIHRoZSBwcm9wZXJ0aWVzXG4gICAgICAgICAgdmFyIHNjaGVtYSA9ICRzY29wZS5zY2hlbWE7XG4gICAgICAgICAgJHNjb3BlLmZldGNoZWQgPSBzY2hlbWE7XG4gICAgICAgICAgdmFyIGVudGl0eSA9ICRzY29wZS5lbnRpdHk7XG4gICAgICAgICAgaWYgKHNjaGVtYSkge1xuICAgICAgICAgICAgYW5ndWxhci5mb3JFYWNoKHNjaGVtYS5wcm9wZXJ0aWVzLCAocHJvcGVydHksIGtleSkgPT4ge1xuICAgICAgICAgICAgICB2YXIgdmFsdWUgPSBwcm9wZXJ0eS52YWx1ZTtcbiAgICAgICAgICAgICAgaWYgKHZhbHVlICYmICFlbnRpdHlba2V5XSkge1xuICAgICAgICAgICAgICAgIGVudGl0eVtrZXldID0gdmFsdWU7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfV0pO1xufVxuIiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL2luY2x1ZGVzLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cImZvcmdlUGx1Z2luLnRzXCIvPlxuXG5tb2R1bGUgRm9yZ2Uge1xuXG4gIGV4cG9ydCB2YXIgQ29tbWFuZHNDb250cm9sbGVyID0gY29udHJvbGxlcihcIkNvbW1hbmRzQ29udHJvbGxlclwiLCBbXCIkc2NvcGVcIiwgXCIkZGlhbG9nXCIsIFwiJHdpbmRvd1wiLCBcIiR0ZW1wbGF0ZUNhY2hlXCIsIFwiJHJvdXRlUGFyYW1zXCIsIFwiJGxvY2F0aW9uXCIsIFwibG9jYWxTdG9yYWdlXCIsIFwiJGh0dHBcIiwgXCIkdGltZW91dFwiLCBcIkZvcmdlQXBpVVJMXCIsIFwiRm9yZ2VNb2RlbFwiLFxuICAgICgkc2NvcGUsICRkaWFsb2csICR3aW5kb3csICR0ZW1wbGF0ZUNhY2hlLCAkcm91dGVQYXJhbXMsICRsb2NhdGlvbjpuZy5JTG9jYXRpb25TZXJ2aWNlLCBsb2NhbFN0b3JhZ2UsICRodHRwLCAkdGltZW91dCwgRm9yZ2VBcGlVUkwsIEZvcmdlTW9kZWwpID0+IHtcblxuICAgICAgJHNjb3BlLm1vZGVsID0gRm9yZ2VNb2RlbDtcbiAgICAgICRzY29wZS5yZXNvdXJjZVBhdGggPSAkcm91dGVQYXJhbXNbXCJwYXRoXCJdIHx8ICRsb2NhdGlvbi5zZWFyY2goKVtcInBhdGhcIl0gfHwgXCJcIjtcbiAgICAgICRzY29wZS5yZXBvTmFtZSA9IFwiXCI7XG4gICAgICAkc2NvcGUucHJvamVjdERlc2NyaXB0aW9uID0gJHNjb3BlLnJlc291cmNlUGF0aCB8fCBcIlwiO1xuICAgICAgdmFyIHBhdGhTdGVwcyA9ICRzY29wZS5wcm9qZWN0RGVzY3JpcHRpb24uc3BsaXQoXCIvXCIpO1xuICAgICAgaWYgKHBhdGhTdGVwcyAmJiBwYXRoU3RlcHMubGVuZ3RoKSB7XG4gICAgICAgICRzY29wZS5yZXBvTmFtZSA9IHBhdGhTdGVwc1twYXRoU3RlcHMubGVuZ3RoIC0gMV07XG4gICAgICB9XG4gICAgICBpZiAoISRzY29wZS5wcm9qZWN0RGVzY3JpcHRpb24uc3RhcnRzV2l0aChcIi9cIikgJiYgJHNjb3BlLnByb2plY3REZXNjcmlwdGlvbi5sZW5ndGggPiAwKSB7XG4gICAgICAgICRzY29wZS5wcm9qZWN0RGVzY3JpcHRpb24gPSBcIi9cIiArICRzY29wZS5wcm9qZWN0RGVzY3JpcHRpb247XG4gICAgICB9XG5cbiAgICAgICRzY29wZS5hdmF0YXJfdXJsID0gbG9jYWxTdG9yYWdlW1wiZ29nc0F2YXRhclVybFwiXTtcbiAgICAgICRzY29wZS51c2VyID0gbG9jYWxTdG9yYWdlW1wiZ29nc1VzZXJcIl07XG5cbiAgICAgICRzY29wZS5jb21tYW5kcyA9IGdldE1vZGVsQ29tbWFuZHMoRm9yZ2VNb2RlbCwgJHNjb3BlLnJlc291cmNlUGF0aCk7XG4gICAgICAkc2NvcGUuZmV0Y2hlZCA9ICRzY29wZS5jb21tYW5kcy5sZW5ndGggIT09IDA7XG5cbiAgICAgIGluaXRTY29wZSgkc2NvcGUsICRsb2NhdGlvbiwgJHJvdXRlUGFyYW1zKTtcbiAgICAgIHJlZGlyZWN0VG9Hb2dzTG9naW5JZlJlcXVpcmVkKCRzY29wZSwgJGxvY2F0aW9uKTtcblxuXG4gICAgICAkc2NvcGUudGFibGVDb25maWcgPSB7XG4gICAgICAgIGRhdGE6ICdjb21tYW5kcycsXG4gICAgICAgIHNob3dTZWxlY3Rpb25DaGVja2JveDogdHJ1ZSxcbiAgICAgICAgZW5hYmxlUm93Q2xpY2tTZWxlY3Rpb246IGZhbHNlLFxuICAgICAgICBtdWx0aVNlbGVjdDogdHJ1ZSxcbiAgICAgICAgc2VsZWN0ZWRJdGVtczogW10sXG4gICAgICAgIGZpbHRlck9wdGlvbnM6IHtcbiAgICAgICAgICBmaWx0ZXJUZXh0OiAkbG9jYXRpb24uc2VhcmNoKClbXCJxXCJdIHx8ICcnXG4gICAgICAgIH0sXG4gICAgICAgIGNvbHVtbkRlZnM6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICBmaWVsZDogJ25hbWUnLFxuICAgICAgICAgICAgZGlzcGxheU5hbWU6ICdOYW1lJyxcbiAgICAgICAgICAgIGNlbGxUZW1wbGF0ZTogJHRlbXBsYXRlQ2FjaGUuZ2V0KFwiaWRUZW1wbGF0ZS5odG1sXCIpXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICBmaWVsZDogJ2Rlc2NyaXB0aW9uJyxcbiAgICAgICAgICAgIGRpc3BsYXlOYW1lOiAnRGVzY3JpcHRpb24nXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICBmaWVsZDogJ2NhdGVnb3J5JyxcbiAgICAgICAgICAgIGRpc3BsYXlOYW1lOiAnQ2F0ZWdvcnknXG4gICAgICAgICAgfVxuICAgICAgICBdXG4gICAgICB9O1xuXG4gICAgICBmdW5jdGlvbiBjb21tYW5kTWF0Y2hlcyhjb21tYW5kKSB7XG4gICAgICAgIHZhciBmaWx0ZXJUZXh0ID0gJHNjb3BlLnRhYmxlQ29uZmlnLmZpbHRlck9wdGlvbnMuZmlsdGVyVGV4dDtcbiAgICAgICAgcmV0dXJuIGNvbW1hbmRNYXRjaGVzVGV4dChjb21tYW5kLCBmaWx0ZXJUZXh0KTtcbiAgICAgIH1cblxuICAgICAgJHNjb3BlLmNvbW1hbmRTZWxlY3RvciA9IHtcbiAgICAgICAgZmlsdGVyVGV4dDogXCJcIixcbiAgICAgICAgZm9sZGVyczogW10sXG4gICAgICAgIHNlbGVjdGVkQ29tbWFuZHM6IFtdLFxuICAgICAgICBleHBhbmRlZEZvbGRlcnM6IHt9LFxuXG4gICAgICAgIGlzT3BlbjogKGZvbGRlcikgPT4ge1xuICAgICAgICAgIHZhciBmaWx0ZXJUZXh0ID0gJHNjb3BlLnRhYmxlQ29uZmlnLmZpbHRlck9wdGlvbnMuZmlsdGVyVGV4dDtcbiAgICAgICAgICBpZiAoZmlsdGVyVGV4dCAhPT0gJycgfHwgJHNjb3BlLmNvbW1hbmRTZWxlY3Rvci5leHBhbmRlZEZvbGRlcnNbZm9sZGVyLmlkXSkge1xuICAgICAgICAgICAgcmV0dXJuIFwib3BlbmVkXCI7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiBcImNsb3NlZFwiO1xuICAgICAgICB9LFxuXG4gICAgICAgIGNsZWFyU2VsZWN0ZWQ6ICgpID0+IHtcbiAgICAgICAgICAkc2NvcGUuY29tbWFuZFNlbGVjdG9yLmV4cGFuZGVkRm9sZGVycyA9IHt9O1xuICAgICAgICAgIENvcmUuJGFwcGx5KCRzY29wZSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgdXBkYXRlU2VsZWN0ZWQ6ICgpID0+IHtcbiAgICAgICAgICAvLyBsZXRzIHVwZGF0ZSB0aGUgc2VsZWN0ZWQgYXBwc1xuICAgICAgICAgIHZhciBzZWxlY3RlZENvbW1hbmRzID0gW107XG4gICAgICAgICAgYW5ndWxhci5mb3JFYWNoKCRzY29wZS5tb2RlbC5hcHBGb2xkZXJzLCAoZm9sZGVyKSA9PiB7XG4gICAgICAgICAgICB2YXIgYXBwcyA9IGZvbGRlci5hcHBzLmZpbHRlcigoYXBwKSA9PiBhcHAuc2VsZWN0ZWQpO1xuICAgICAgICAgICAgaWYgKGFwcHMpIHtcbiAgICAgICAgICAgICAgc2VsZWN0ZWRDb21tYW5kcyA9IHNlbGVjdGVkQ29tbWFuZHMuY29uY2F0KGFwcHMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICAgICRzY29wZS5jb21tYW5kU2VsZWN0b3Iuc2VsZWN0ZWRDb21tYW5kcyA9IHNlbGVjdGVkQ29tbWFuZHMuc29ydEJ5KFwibmFtZVwiKTtcbiAgICAgICAgfSxcblxuICAgICAgICBzZWxlY3Q6IChjb21tYW5kLCBmbGFnKSA9PiB7XG4gICAgICAgICAgdmFyIGlkID0gY29tbWFuZC5uYW1lO1xuLypcbiAgICAgICAgICBhcHAuc2VsZWN0ZWQgPSBmbGFnO1xuKi9cbiAgICAgICAgICAkc2NvcGUuY29tbWFuZFNlbGVjdG9yLnVwZGF0ZVNlbGVjdGVkKCk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgZ2V0U2VsZWN0ZWRDbGFzczogKGFwcCkgPT4ge1xuICAgICAgICAgIGlmIChhcHAuYWJzdHJhY3QpIHtcbiAgICAgICAgICAgIHJldHVybiBcImFic3RyYWN0XCI7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChhcHAuc2VsZWN0ZWQpIHtcbiAgICAgICAgICAgIHJldHVybiBcInNlbGVjdGVkXCI7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiBcIlwiO1xuICAgICAgICB9LFxuXG4gICAgICAgIHNob3dDb21tYW5kOiAoY29tbWFuZCkgPT4ge1xuICAgICAgICAgIHJldHVybiBjb21tYW5kTWF0Y2hlcyhjb21tYW5kKTtcbiAgICAgICAgfSxcblxuICAgICAgICBzaG93Rm9sZGVyOiAoZm9sZGVyKSA9PiB7XG4gICAgICAgICAgdmFyIGZpbHRlclRleHQgPSAkc2NvcGUudGFibGVDb25maWcuZmlsdGVyT3B0aW9ucy5maWx0ZXJUZXh0O1xuICAgICAgICAgIHJldHVybiAhZmlsdGVyVGV4dCB8fCBmb2xkZXIuY29tbWFuZHMuc29tZSgoYXBwKSA9PiBjb21tYW5kTWF0Y2hlcyhhcHApKTtcbiAgICAgICAgfVxuICAgICAgfTtcblxuXG4gICAgICB2YXIgdXJsID0gVXJsSGVscGVycy5qb2luKEZvcmdlQXBpVVJMLCBcImNvbW1hbmRzXCIsICRzY29wZS5yZXNvdXJjZVBhdGgpO1xuICAgICAgdXJsID0gY3JlYXRlSHR0cFVybCh1cmwpO1xuICAgICAgbG9nLmluZm8oXCJGZXRjaGluZyBjb21tYW5kcyBmcm9tOiBcIiArIHVybCk7XG4gICAgICAkaHR0cC5nZXQodXJsLCBjcmVhdGVIdHRwQ29uZmlnKCkpLlxuICAgICAgICBzdWNjZXNzKGZ1bmN0aW9uIChkYXRhLCBzdGF0dXMsIGhlYWRlcnMsIGNvbmZpZykge1xuICAgICAgICAgIGlmIChhbmd1bGFyLmlzQXJyYXkoZGF0YSkgJiYgc3RhdHVzID09PSAyMDApIHtcbiAgICAgICAgICAgIHZhciByZXNvdXJjZVBhdGggPSAkc2NvcGUucmVzb3VyY2VQYXRoO1xuICAgICAgICAgICAgdmFyIGZvbGRlck1hcCA9IHt9O1xuICAgICAgICAgICAgdmFyIGZvbGRlcnMgPSBbXTtcbiAgICAgICAgICAgICRzY29wZS5jb21tYW5kcyA9IF8uc29ydEJ5KGRhdGEsIFwibmFtZVwiKTtcbiAgICAgICAgICAgIGFuZ3VsYXIuZm9yRWFjaCgkc2NvcGUuY29tbWFuZHMsIChjb21tYW5kKSA9PiB7XG4gICAgICAgICAgICAgIHZhciBpZCA9IGNvbW1hbmQuaWQgfHwgY29tbWFuZC5uYW1lO1xuICAgICAgICAgICAgICBjb21tYW5kLiRsaW5rID0gY29tbWFuZExpbmsoJHNjb3BlLnByb2plY3RJZCwgaWQsIHJlc291cmNlUGF0aCk7XG5cbiAgICAgICAgICAgICAgdmFyIG5hbWUgPSBjb21tYW5kLm5hbWUgfHwgY29tbWFuZC5pZDtcbiAgICAgICAgICAgICAgdmFyIGZvbGRlck5hbWUgPSBjb21tYW5kLmNhdGVnb3J5O1xuICAgICAgICAgICAgICB2YXIgc2hvcnROYW1lID0gbmFtZTtcbiAgICAgICAgICAgICAgdmFyIG5hbWVzID0gbmFtZS5zcGxpdChcIjpcIiwgMik7XG4gICAgICAgICAgICAgIGlmIChuYW1lcyAhPSBudWxsICYmIG5hbWVzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICAgICAgICBmb2xkZXJOYW1lID0gbmFtZXNbMF07XG4gICAgICAgICAgICAgICAgc2hvcnROYW1lID0gbmFtZXNbMV0udHJpbSgpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGlmIChmb2xkZXJOYW1lID09PSBcIlByb2plY3QvQnVpbGRcIikge1xuICAgICAgICAgICAgICAgIGZvbGRlck5hbWUgPSBcIlByb2plY3RcIjtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBjb21tYW5kLiRzaG9ydE5hbWUgPSBzaG9ydE5hbWU7XG4gICAgICAgICAgICAgIGNvbW1hbmQuJGZvbGRlck5hbWUgPSBmb2xkZXJOYW1lO1xuICAgICAgICAgICAgICB2YXIgZm9sZGVyID0gZm9sZGVyTWFwW2ZvbGRlck5hbWVdO1xuICAgICAgICAgICAgICBpZiAoIWZvbGRlcikge1xuICAgICAgICAgICAgICAgIGZvbGRlciA9IHtcbiAgICAgICAgICAgICAgICAgIG5hbWU6IGZvbGRlck5hbWUsXG4gICAgICAgICAgICAgICAgICBjb21tYW5kczogW11cbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIGZvbGRlck1hcFtmb2xkZXJOYW1lXSA9IGZvbGRlcjtcbiAgICAgICAgICAgICAgICBmb2xkZXJzLnB1c2goZm9sZGVyKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBmb2xkZXIuY29tbWFuZHMucHVzaChjb21tYW5kKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgZm9sZGVycyA9IF8uc29ydEJ5KGZvbGRlcnMsIFwibmFtZVwiKTtcbiAgICAgICAgICAgIGFuZ3VsYXIuZm9yRWFjaChmb2xkZXJzLCAoZm9sZGVyKSA9PiB7XG4gICAgICAgICAgICAgIGZvbGRlci5jb21tYW5kcyA9IF8uc29ydEJ5KGZvbGRlci5jb21tYW5kcywgXCIkc2hvcnROYW1lXCIpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAkc2NvcGUuY29tbWFuZFNlbGVjdG9yLmZvbGRlcnMgPSBmb2xkZXJzO1xuXG4gICAgICAgICAgICBzZXRNb2RlbENvbW1hbmRzKCRzY29wZS5tb2RlbCwgJHNjb3BlLnJlc291cmNlUGF0aCwgJHNjb3BlLmNvbW1hbmRzKTtcbiAgICAgICAgICAgICRzY29wZS5mZXRjaGVkID0gdHJ1ZTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pLlxuICAgICAgICBlcnJvcihmdW5jdGlvbiAoZGF0YSwgc3RhdHVzLCBoZWFkZXJzLCBjb25maWcpIHtcbiAgICAgICAgICBsb2cud2FybihcImZhaWxlZCB0byBsb2FkIFwiICsgdXJsICsgXCIuIHN0YXR1czogXCIgKyBzdGF0dXMgKyBcIiBkYXRhOiBcIiArIGRhdGEpO1xuICAgICAgICB9KTtcblxuICAgIH1dKTtcbn1cbiIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9pbmNsdWRlcy50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJmb3JnZUhlbHBlcnMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiZm9yZ2VQbHVnaW4udHNcIi8+XG5cbm1vZHVsZSBGb3JnZSB7XG5cbiAgZXhwb3J0IHZhciBSZXBvQ29udHJvbGxlciA9IGNvbnRyb2xsZXIoXCJSZXBvQ29udHJvbGxlclwiLFxuICAgIFtcIiRzY29wZVwiLCBcIiR0ZW1wbGF0ZUNhY2hlXCIsIFwiJGxvY2F0aW9uXCIsIFwiJHJvdXRlUGFyYW1zXCIsIFwiJGh0dHBcIiwgXCIkdGltZW91dFwiLCBcIkZvcmdlQXBpVVJMXCIsXG4gICAgICAoJHNjb3BlLCAkdGVtcGxhdGVDYWNoZTpuZy5JVGVtcGxhdGVDYWNoZVNlcnZpY2UsICRsb2NhdGlvbjpuZy5JTG9jYXRpb25TZXJ2aWNlLCAkcm91dGVQYXJhbXMsICRodHRwLCAkdGltZW91dCwgRm9yZ2VBcGlVUkwpID0+IHtcblxuICAgICAgICAkc2NvcGUubmFtZSA9ICRyb3V0ZVBhcmFtc1tcInBhdGhcIl07XG5cbiAgICAgICAgaW5pdFNjb3BlKCRzY29wZSwgJGxvY2F0aW9uLCAkcm91dGVQYXJhbXMpO1xuICAgICAgICByZWRpcmVjdFRvR29nc0xvZ2luSWZSZXF1aXJlZCgkc2NvcGUsICRsb2NhdGlvbik7XG5cbiAgICAgICAgJHNjb3BlLiRvbignJHJvdXRlVXBkYXRlJywgKCRldmVudCkgPT4ge1xuICAgICAgICAgIHVwZGF0ZURhdGEoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdXBkYXRlRGF0YSgpO1xuXG4gICAgICAgIGZ1bmN0aW9uIHVwZGF0ZURhdGEoKSB7XG4gICAgICAgICAgaWYgKCRzY29wZS5uYW1lKSB7XG4gICAgICAgICAgICB2YXIgdXJsID0gcmVwb0FwaVVybChGb3JnZUFwaVVSTCwgJHNjb3BlLm5hbWUpO1xuICAgICAgICAgICAgdXJsID0gY3JlYXRlSHR0cFVybCh1cmwpO1xuICAgICAgICAgICAgdmFyIGNvbmZpZyA9IGNyZWF0ZUh0dHBDb25maWcoKTtcbiAgICAgICAgICAgICRodHRwLmdldCh1cmwsIGNvbmZpZykuXG4gICAgICAgICAgICAgIHN1Y2Nlc3MoZnVuY3Rpb24gKGRhdGEsIHN0YXR1cywgaGVhZGVycywgY29uZmlnKSB7XG4gICAgICAgICAgICAgICAgaWYgKGRhdGEpIHtcbiAgICAgICAgICAgICAgICAgIGVucmljaFJlcG8oZGF0YSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICRzY29wZS5lbnRpdHkgPSBkYXRhO1xuICAgICAgICAgICAgICAgICRzY29wZS5mZXRjaGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgfSkuXG4gICAgICAgICAgICAgIGVycm9yKGZ1bmN0aW9uIChkYXRhLCBzdGF0dXMsIGhlYWRlcnMsIGNvbmZpZykge1xuICAgICAgICAgICAgICAgIGxvZy53YXJuKFwiZmFpbGVkIHRvIGxvYWQgXCIgKyB1cmwgKyBcIi4gc3RhdHVzOiBcIiArIHN0YXR1cyArIFwiIGRhdGE6IFwiICsgZGF0YSk7XG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAkc2NvcGUuZmV0Y2hlZCA9IHRydWU7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XSk7XG59XG4iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vaW5jbHVkZXMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiZm9yZ2VIZWxwZXJzLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cImZvcmdlUGx1Z2luLnRzXCIvPlxuXG5tb2R1bGUgRm9yZ2Uge1xuXG4gIGV4cG9ydCB2YXIgUmVwb3NDb250cm9sbGVyID0gY29udHJvbGxlcihcIlJlcG9zQ29udHJvbGxlclwiLCBbXCIkc2NvcGVcIiwgXCIkZGlhbG9nXCIsIFwiJHdpbmRvd1wiLCBcIiR0ZW1wbGF0ZUNhY2hlXCIsIFwiJHJvdXRlUGFyYW1zXCIsIFwiJGxvY2F0aW9uXCIsIFwibG9jYWxTdG9yYWdlXCIsIFwiJGh0dHBcIiwgXCIkdGltZW91dFwiLCBcIkZvcmdlQXBpVVJMXCIsIFwiU2VydmljZVJlZ2lzdHJ5XCIsXG4gICAgKCRzY29wZSwgJGRpYWxvZywgJHdpbmRvdywgJHRlbXBsYXRlQ2FjaGUsICRyb3V0ZVBhcmFtcywgJGxvY2F0aW9uOm5nLklMb2NhdGlvblNlcnZpY2UsIGxvY2FsU3RvcmFnZSwgJGh0dHAsICR0aW1lb3V0LCBGb3JnZUFwaVVSTCwgU2VydmljZVJlZ2lzdHJ5KSA9PiB7XG5cbiAgICAgIGxvZy5pbmZvKFwicmVwb3MgY29udHJvbGxlciBzdGFydCFcIik7XG4gICAgICAkc2NvcGUucmVzb3VyY2VQYXRoID0gJHJvdXRlUGFyYW1zW1wicGF0aFwiXTtcbiAgICAgICRzY29wZS5jb21tYW5kc0xpbmsgPSAocGF0aCkgPT4gY29tbWFuZHNMaW5rKHBhdGgsICRzY29wZS5wcm9qZWN0SWQpO1xuXG4gICAgICB2YXIgZ29nc1VybCA9IFNlcnZpY2VSZWdpc3RyeS5zZXJ2aWNlTGluayhnb2dzU2VydmljZU5hbWUpO1xuICAgICAgaWYgKGdvZ3NVcmwpIHtcbiAgICAgICAgJHNjb3BlLnNpZ25VcFVybCA9IFVybEhlbHBlcnMuam9pbihnb2dzVXJsLCBcInVzZXIvc2lnbl91cFwiKTtcbiAgICAgICAgJHNjb3BlLmZvcmdvdFBhc3N3b3JkVXJsID0gVXJsSGVscGVycy5qb2luKGdvZ3NVcmwsIFwidXNlci9mb3JnZXRfcGFzc3dvcmRcIik7XG4gICAgICB9XG4gICAgICBpbml0U2NvcGUoJHNjb3BlLCAkbG9jYXRpb24sICRyb3V0ZVBhcmFtcyk7XG5cbiAgICAgICRzY29wZS50YWJsZUNvbmZpZyA9IHtcbiAgICAgICAgZGF0YTogJ3Byb2plY3RzJyxcbiAgICAgICAgc2hvd1NlbGVjdGlvbkNoZWNrYm94OiB0cnVlLFxuICAgICAgICBlbmFibGVSb3dDbGlja1NlbGVjdGlvbjogZmFsc2UsXG4gICAgICAgIG11bHRpU2VsZWN0OiB0cnVlLFxuICAgICAgICBzZWxlY3RlZEl0ZW1zOiBbXSxcbiAgICAgICAgZmlsdGVyT3B0aW9uczoge1xuICAgICAgICAgIGZpbHRlclRleHQ6ICRsb2NhdGlvbi5zZWFyY2goKVtcInFcIl0gfHwgJydcbiAgICAgICAgfSxcbiAgICAgICAgY29sdW1uRGVmczogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIGZpZWxkOiAnbmFtZScsXG4gICAgICAgICAgICBkaXNwbGF5TmFtZTogJ1JlcG9zaXRvcnkgTmFtZScsXG4gICAgICAgICAgICBjZWxsVGVtcGxhdGU6ICR0ZW1wbGF0ZUNhY2hlLmdldChcInJlcG9UZW1wbGF0ZS5odG1sXCIpXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICBmaWVsZDogJ2FjdGlvbnMnLFxuICAgICAgICAgICAgZGlzcGxheU5hbWU6ICdBY3Rpb25zJyxcbiAgICAgICAgICAgIGNlbGxUZW1wbGF0ZTogJHRlbXBsYXRlQ2FjaGUuZ2V0KFwicmVwb0FjdGlvbnNUZW1wbGF0ZS5odG1sXCIpXG4gICAgICAgICAgfVxuICAgICAgICBdXG4gICAgICB9O1xuXG4gICAgICAkc2NvcGUubG9naW4gPSB7XG4gICAgICAgIGF1dGhIZWFkZXI6IGxvY2FsU3RvcmFnZVtcImdvZ3NBdXRob3JpemF0aW9uXCJdIHx8IFwiXCIsXG4gICAgICAgIHJlbG9naW46IGZhbHNlLFxuICAgICAgICBhdmF0YXJfdXJsOiBsb2NhbFN0b3JhZ2VbXCJnb2dzQXZhdGFyVXJsXCJdIHx8IFwiXCIsXG4gICAgICAgIHVzZXI6IGxvY2FsU3RvcmFnZVtcImdvZ3NVc2VyXCJdIHx8IFwiXCIsXG4gICAgICAgIHBhc3N3b3JkOiBcIlwiLFxuICAgICAgICBlbWFpbDogbG9jYWxTdG9yYWdlW1wiZ29nc0VtYWlsXCJdIHx8IFwiXCJcbiAgICAgIH07XG5cbiAgICAgICRzY29wZS5kb0xvZ2luID0gKCkgPT4ge1xuICAgICAgICB2YXIgbG9naW4gPSAkc2NvcGUubG9naW47XG4gICAgICAgIHZhciB1c2VyID0gbG9naW4udXNlcjtcbiAgICAgICAgdmFyIHBhc3N3b3JkID0gbG9naW4ucGFzc3dvcmQ7XG4gICAgICAgIGlmICh1c2VyICYmIHBhc3N3b3JkKSB7XG4gICAgICAgICAgdmFyIHVzZXJQd2QgPSB1c2VyICsgJzonICsgcGFzc3dvcmQ7XG4gICAgICAgICAgbG9naW4uYXV0aEhlYWRlciA9ICdCYXNpYyAnICsgKHVzZXJQd2QuZW5jb2RlQmFzZTY0KCkpO1xuICAgICAgICAgIHVwZGF0ZURhdGEoKTtcbiAgICAgICAgfVxuICAgICAgfTtcblxuICAgICAgJHNjb3BlLmxvZ291dCA9ICgpID0+IHtcbiAgICAgICAgZGVsZXRlIGxvY2FsU3RvcmFnZVtcImdvZ3NBdXRob3JpemF0aW9uXCJdO1xuICAgICAgICAkc2NvcGUubG9naW4uYXV0aEhlYWRlciA9IG51bGw7XG4gICAgICAgICRzY29wZS5sb2dpbi5sb2dnZWRJbiA9IGZhbHNlO1xuICAgICAgICAkc2NvcGUubG9naW4uZmFpbGVkID0gZmFsc2U7XG4gICAgICAgIGxvZ2dlZEluVG9Hb2dzID0gZmFsc2U7XG4gICAgICB9O1xuXG5cbiAgICAgICRzY29wZS5vcGVuQ29tbWFuZHMgPSAoKSA9PiB7XG4gICAgICAgIHZhciByZXNvdXJjZVBhdGggPSBudWxsO1xuICAgICAgICB2YXIgc2VsZWN0ZWQgPSAkc2NvcGUudGFibGVDb25maWcuc2VsZWN0ZWRJdGVtcztcbiAgICAgICAgaWYgKF8uaXNBcnJheShzZWxlY3RlZCkgJiYgc2VsZWN0ZWQubGVuZ3RoKSB7XG4gICAgICAgICAgcmVzb3VyY2VQYXRoID0gc2VsZWN0ZWRbMF0ucGF0aDtcbiAgICAgICAgfVxuICAgICAgICB2YXIgbGluayA9IGNvbW1hbmRzTGluayhyZXNvdXJjZVBhdGgsICRzY29wZS5wcm9qZWN0SWQpO1xuICAgICAgICBsb2cuaW5mbyhcIm1vdmluZyB0byBjb21tYW5kcyBsaW5rOiBcIiArIGxpbmspO1xuICAgICAgICAkbG9jYXRpb24ucGF0aChsaW5rKTtcbiAgICAgIH07XG5cbiAgICAgICRzY29wZS5kZWxldGUgPSAocHJvamVjdHMpID0+IHtcbiAgICAgICAgVUkubXVsdGlJdGVtQ29uZmlybUFjdGlvbkRpYWxvZyg8VUkuTXVsdGlJdGVtQ29uZmlybUFjdGlvbk9wdGlvbnM+e1xuICAgICAgICAgIGNvbGxlY3Rpb246IHByb2plY3RzLFxuICAgICAgICAgIGluZGV4OiAncGF0aCcsXG4gICAgICAgICAgb25DbG9zZTogKHJlc3VsdDpib29sZWFuKSA9PiB7XG4gICAgICAgICAgICBpZiAocmVzdWx0KSB7XG4gICAgICAgICAgICAgIGRvRGVsZXRlKHByb2plY3RzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9LFxuICAgICAgICAgIHRpdGxlOiAnRGVsZXRlIHByb2plY3RzPycsXG4gICAgICAgICAgYWN0aW9uOiAnVGhlIGZvbGxvd2luZyBwcm9qZWN0cyB3aWxsIGJlIHJlbW92ZWQgKHRob3VnaCB0aGUgZmlsZXMgd2lsbCByZW1haW4gb24geW91ciBmaWxlIHN5c3RlbSk6JyxcbiAgICAgICAgICBva1RleHQ6ICdEZWxldGUnLFxuICAgICAgICAgIG9rQ2xhc3M6ICdidG4tZGFuZ2VyJyxcbiAgICAgICAgICBjdXN0b206IFwiVGhpcyBvcGVyYXRpb24gaXMgcGVybWFuZW50IG9uY2UgY29tcGxldGVkIVwiLFxuICAgICAgICAgIGN1c3RvbUNsYXNzOiBcImFsZXJ0IGFsZXJ0LXdhcm5pbmdcIlxuICAgICAgICB9KS5vcGVuKCk7XG4gICAgICB9O1xuXG4gICAgICBmdW5jdGlvbiBkb0RlbGV0ZShwcm9qZWN0cykge1xuICAgICAgICBhbmd1bGFyLmZvckVhY2gocHJvamVjdHMsIChwcm9qZWN0KSA9PiB7XG4gICAgICAgICAgbG9nLmluZm8oXCJEZWxldGluZyBcIiArIGFuZ3VsYXIudG9Kc29uKCRzY29wZS5wcm9qZWN0cykpO1xuICAgICAgICAgIHZhciBwYXRoID0gcHJvamVjdC5wYXRoO1xuICAgICAgICAgIGlmIChwYXRoKSB7XG4gICAgICAgICAgICB2YXIgdXJsID0gcmVwb0FwaVVybChGb3JnZUFwaVVSTCwgcGF0aCk7XG4gICAgICAgICAgICAkaHR0cC5kZWxldGUodXJsKS5cbiAgICAgICAgICAgICAgc3VjY2VzcyhmdW5jdGlvbiAoZGF0YSwgc3RhdHVzLCBoZWFkZXJzLCBjb25maWcpIHtcbiAgICAgICAgICAgICAgICB1cGRhdGVEYXRhKCk7XG4gICAgICAgICAgICAgIH0pLlxuICAgICAgICAgICAgICBlcnJvcihmdW5jdGlvbiAoZGF0YSwgc3RhdHVzLCBoZWFkZXJzLCBjb25maWcpIHtcbiAgICAgICAgICAgICAgICBsb2cud2FybihcImZhaWxlZCB0byBsb2FkIFwiICsgdXJsICsgXCIuIHN0YXR1czogXCIgKyBzdGF0dXMgKyBcIiBkYXRhOiBcIiArIGRhdGEpO1xuICAgICAgICAgICAgICAgIHZhciBtZXNzYWdlID0gXCJGYWlsZWQgdG8gUE9TVCB0byBcIiArIHVybCArIFwiIGdvdCBzdGF0dXM6IFwiICsgc3RhdHVzO1xuICAgICAgICAgICAgICAgIENvcmUubm90aWZpY2F0aW9uKCdlcnJvcicsIG1lc3NhZ2UpO1xuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICBmdW5jdGlvbiB1cGRhdGVEYXRhKCkge1xuICAgICAgICB2YXIgYXV0aEhlYWRlciA9ICRzY29wZS5sb2dpbi5hdXRoSGVhZGVyO1xuICAgICAgICB2YXIgZW1haWwgPSAkc2NvcGUubG9naW4uZW1haWwgfHwgXCJcIjtcbiAgICAgICAgaWYgKGF1dGhIZWFkZXIpIHtcbiAgICAgICAgICB2YXIgdXJsID0gcmVwb3NBcGlVcmwoRm9yZ2VBcGlVUkwpO1xuICAgICAgICAgIHVybCA9IGNyZWF0ZUh0dHBVcmwodXJsLCBhdXRoSGVhZGVyLCBlbWFpbCk7XG4gICAgICAgICAgdmFyIGNvbmZpZyA9IHtcbi8qXG4gICAgICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgICAgIEdvZ3NBdXRob3JpemF0aW9uOiBhdXRoSGVhZGVyLFxuICAgICAgICAgICAgICBHb2dzRW1haWw6IGVtYWlsXG4gICAgICAgICAgICB9XG4qL1xuICAgICAgICAgIH07XG4gICAgICAgICAgJGh0dHAuZ2V0KHVybCwgY29uZmlnKS5cbiAgICAgICAgICAgIHN1Y2Nlc3MoZnVuY3Rpb24gKGRhdGEsIHN0YXR1cywgaGVhZGVycywgY29uZmlnKSB7XG4gICAgICAgICAgICAgICRzY29wZS5sb2dpbi5mYWlsZWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgJHNjb3BlLmxvZ2luLmxvZ2dlZEluID0gdHJ1ZTtcbiAgICAgICAgICAgICAgbG9nZ2VkSW5Ub0dvZ3MgPSB0cnVlO1xuICAgICAgICAgICAgICB2YXIgYXZhdGFyX3VybCA9IG51bGw7XG4gICAgICAgICAgICAgIGlmIChzdGF0dXMgPT09IDIwMCkge1xuICAgICAgICAgICAgICAgIGlmICghZGF0YSB8fCAhYW5ndWxhci5pc0FycmF5KGRhdGEpKSB7XG4gICAgICAgICAgICAgICAgICBkYXRhID0gW107XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIGxldHMgc3RvcmUgYSBzdWNjZXNzZnVsIGxvZ2luIHNvIHRoYXQgd2UgaGlkZSB0aGUgbG9naW4gcGFnZVxuICAgICAgICAgICAgICAgIGxvY2FsU3RvcmFnZVtcImdvZ3NBdXRob3JpemF0aW9uXCJdID0gYXV0aEhlYWRlcjtcbiAgICAgICAgICAgICAgICBsb2NhbFN0b3JhZ2VbXCJnb2dzRW1haWxcIl0gPSBlbWFpbDtcbiAgICAgICAgICAgICAgICBsb2NhbFN0b3JhZ2VbXCJnb2dzVXNlclwiXSA9ICRzY29wZS5sb2dpbi51c2VyIHx8IFwiXCI7XG5cbiAgICAgICAgICAgICAgICAkc2NvcGUucHJvamVjdHMgPSBfLnNvcnRCeShkYXRhLCBcIm5hbWVcIik7XG4gICAgICAgICAgICAgICAgYW5ndWxhci5mb3JFYWNoKCRzY29wZS5wcm9qZWN0cywgKHJlcG8pID0+IHtcbiAgICAgICAgICAgICAgICAgIGVucmljaFJlcG8ocmVwbyk7XG4gICAgICAgICAgICAgICAgICBpZiAoIWF2YXRhcl91cmwpIHtcbiAgICAgICAgICAgICAgICAgICAgYXZhdGFyX3VybCA9IENvcmUucGF0aEdldChyZXBvLCBbXCJvd25lclwiLCBcImF2YXRhcl91cmxcIl0pO1xuICAgICAgICAgICAgICAgICAgICBpZiAoYXZhdGFyX3VybCkge1xuICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5sb2dpbi5hdmF0YXJfdXJsID0gYXZhdGFyX3VybDtcbiAgICAgICAgICAgICAgICAgICAgICBsb2NhbFN0b3JhZ2VbXCJnb2dzQXZhdGFyVXJsXCJdID0gYXZhdGFyX3VybDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICRzY29wZS5mZXRjaGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSkuXG4gICAgICAgICAgICBlcnJvcihmdW5jdGlvbiAoZGF0YSwgc3RhdHVzLCBoZWFkZXJzLCBjb25maWcpIHtcbiAgICAgICAgICAgICAgJHNjb3BlLmxvZ291dCgpO1xuICAgICAgICAgICAgICAkc2NvcGUubG9naW4uZmFpbGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgaWYgKHN0YXR1cyAhPT0gNDAzKSB7XG4gICAgICAgICAgICAgICAgbG9nLndhcm4oXCJmYWlsZWQgdG8gbG9hZCBcIiArIHVybCArIFwiLiBzdGF0dXM6IFwiICsgc3RhdHVzICsgXCIgZGF0YTogXCIgKyBkYXRhKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgdXBkYXRlRGF0YSgpO1xuXG4gICAgfV0pO1xufVxuIiwiLy8vIENvcHlyaWdodCAyMDE0LTIwMTUgUmVkIEhhdCwgSW5jLiBhbmQvb3IgaXRzIGFmZmlsaWF0ZXNcbi8vLyBhbmQgb3RoZXIgY29udHJpYnV0b3JzIGFzIGluZGljYXRlZCBieSB0aGUgQGF1dGhvciB0YWdzLlxuLy8vXG4vLy8gTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbi8vLyB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4vLy8gWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4vLy9cbi8vLyAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuLy8vXG4vLy8gVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuLy8vIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbi8vLyBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbi8vLyBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4vLy8gbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9pbmNsdWRlcy50c1wiLz5cbm1vZHVsZSBNYWluIHtcblxuICBleHBvcnQgdmFyIHBsdWdpbk5hbWUgPSBcImZhYnJpYzgtY29uc29sZVwiO1xuXG4gIGV4cG9ydCB2YXIgbG9nOiBMb2dnaW5nLkxvZ2dlciA9IExvZ2dlci5nZXQocGx1Z2luTmFtZSk7XG5cbiAgZXhwb3J0IHZhciB0ZW1wbGF0ZVBhdGggPSBcInBsdWdpbnMvbWFpbi9odG1sXCI7XG5cbiAgLy8ga3ViZXJuZXRlcyBzZXJ2aWNlIG5hbWVzXG4gIGV4cG9ydCB2YXIgY2hhdFNlcnZpY2VOYW1lID0gXCJsZXRzY2hhdFwiO1xuICBleHBvcnQgdmFyIGdyYWZhbmFTZXJ2aWNlTmFtZSA9IFwiZ3JhZmFuYVwiO1xuICBleHBvcnQgdmFyIGFwcExpYnJhcnlTZXJ2aWNlTmFtZSA9IFwiYXBwLWxpYnJhcnlcIjtcblxuICBleHBvcnQgdmFyIHZlcnNpb246YW55ID0ge307XG5cbn1cbiIsIi8vLyBDb3B5cmlnaHQgMjAxNC0yMDE1IFJlZCBIYXQsIEluYy4gYW5kL29yIGl0cyBhZmZpbGlhdGVzXG4vLy8gYW5kIG90aGVyIGNvbnRyaWJ1dG9ycyBhcyBpbmRpY2F0ZWQgYnkgdGhlIEBhdXRob3IgdGFncy5cbi8vL1xuLy8vIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4vLy8geW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuLy8vIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuLy8vXG4vLy8gICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbi8vL1xuLy8vIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbi8vLyBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4vLy8gV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4vLy8gU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuLy8vIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuXG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vaW5jbHVkZXMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vZm9yZ2UvdHMvZm9yZ2VIZWxwZXJzLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIm1haW5HbG9iYWxzLnRzXCIvPlxuXG5tb2R1bGUgTWFpbiB7XG5cbiAgZXhwb3J0IHZhciBfbW9kdWxlID0gYW5ndWxhci5tb2R1bGUocGx1Z2luTmFtZSwgW0ZvcmdlLnBsdWdpbk5hbWVdKTtcblxuICB2YXIgdGFiID0gdW5kZWZpbmVkO1xuXG4gIF9tb2R1bGUucnVuKFtcIiRyb290U2NvcGVcIiwgXCJIYXd0aW9OYXZcIiwgXCJLdWJlcm5ldGVzTW9kZWxcIiwgXCJTZXJ2aWNlUmVnaXN0cnlcIiwgKCRyb290U2NvcGUsIG5hdjogSGF3dGlvTWFpbk5hdi5SZWdpc3RyeSwgS3ViZXJuZXRlc01vZGVsLCBTZXJ2aWNlUmVnaXN0cnkpID0+IHtcblxuICAgIG5hdi5vbihIYXd0aW9NYWluTmF2LkFjdGlvbnMuQ0hBTkdFRCwgcGx1Z2luTmFtZSwgKGl0ZW1zKSA9PiB7XG4gICAgICBpdGVtcy5mb3JFYWNoKChpdGVtKSA9PiB7XG4gICAgICAgIHN3aXRjaChpdGVtLmlkKSB7XG4gICAgICAgICAgY2FzZSAnZm9yZ2UnOlxuICAgICAgICAgIGNhc2UgJ2p2bSc6XG4gICAgICAgICAgY2FzZSAnd2lraSc6XG4gICAgICAgICAgY2FzZSAnZG9ja2VyLXJlZ2lzdHJ5JzpcbiAgICAgICAgICAgIGl0ZW0uaXNWYWxpZCA9ICgpID0+IGZhbHNlO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9KTtcbiAgICBuYXYuYWRkKHtcbiAgICAgIGlkOiAnbGlicmFyeScsXG4gICAgICB0aXRsZTogKCkgPT4gJ0xpYnJhcnknLFxuICAgICAgdG9vbHRpcDogKCkgPT4gJ1ZpZXcgdGhlIGxpYnJhcnkgb2YgYXBwbGljYXRpb25zJyxcbiAgICAgIGlzVmFsaWQ6ICgpID0+IFNlcnZpY2VSZWdpc3RyeS5oYXNTZXJ2aWNlKGFwcExpYnJhcnlTZXJ2aWNlTmFtZSkgJiYgU2VydmljZVJlZ2lzdHJ5Lmhhc1NlcnZpY2UoXCJhcHAtbGlicmFyeS1qb2xva2lhXCIpLFxuICAgICAgaHJlZjogKCkgPT4gXCIvd2lraS92aWV3XCIsXG4gICAgICBpc0FjdGl2ZTogKCkgPT4gZmFsc2VcbiAgICB9KTtcblxuICAgIHZhciBraWJhbmFTZXJ2aWNlTmFtZSA9IEt1YmVybmV0ZXMua2liYW5hU2VydmljZU5hbWU7XG5cbiAgICBuYXYuYWRkKHtcbiAgICAgIGlkOiAna2liYW5hJyxcbiAgICAgIHRpdGxlOiAoKSA9PiAgJ0xvZ3MnLFxuICAgICAgdG9vbHRpcDogKCkgPT4gJ1ZpZXcgYW5kIHNlYXJjaCBhbGwgbG9ncyBhY3Jvc3MgYWxsIGNvbnRhaW5lcnMgdXNpbmcgS2liYW5hIGFuZCBFbGFzdGljU2VhcmNoJyxcbiAgICAgIGlzVmFsaWQ6ICgpID0+IFNlcnZpY2VSZWdpc3RyeS5oYXNTZXJ2aWNlKGtpYmFuYVNlcnZpY2VOYW1lKSxcbiAgICAgIGhyZWY6ICgpID0+IEt1YmVybmV0ZXMua2liYW5hTG9nc0xpbmsoU2VydmljZVJlZ2lzdHJ5KSxcbiAgICAgIGlzQWN0aXZlOiAoKSA9PiBmYWxzZVxuICAgIH0pO1xuXG4gICAgbmF2LmFkZCh7XG4gICAgICBpZDogJ2FwaW1hbicsXG4gICAgICB0aXRsZTogKCkgPT4gJ0FQSSBNYW5hZ2VtZW50JyxcbiAgICAgIHRvb2x0aXA6ICgpID0+ICdBZGQgUG9saWNpZXMgYW5kIFBsYW5zIHRvIHlvdXIgQVBJcyB3aXRoIEFwaW1hbicsXG4gICAgICBpc1ZhbGlkOiAoKSA9PiBTZXJ2aWNlUmVnaXN0cnkuaGFzU2VydmljZSgnYXBpbWFuJyksXG4gICAgICBvbGRIcmVmOiAoKSA9PiB7IC8qIG5vdGhpbmcgdG8gZG8gKi8gfSxcbiAgICAgIGhyZWY6ICgpID0+IHtcbiAgICAgICAgdmFyIGhhc2ggPSB7XG4gICAgICAgICAgYmFja1RvOiBuZXcgVVJJKCkudG9TdHJpbmcoKSxcbiAgICAgICAgICB0b2tlbjogSGF3dGlvT0F1dGguZ2V0T0F1dGhUb2tlbigpXG4gICAgICAgIH07XG4gICAgICAgIHZhciB1cmkgPSBuZXcgVVJJKFNlcnZpY2VSZWdpc3RyeS5zZXJ2aWNlTGluaygnYXBpbWFuJykpO1xuICAgICAgICAvLyBUT0RPIGhhdmUgdG8gb3ZlcndyaXRlIHRoZSBwb3J0IGhlcmUgZm9yIHNvbWUgcmVhc29uXG4gICAgICAgICg8YW55PnVyaS5wb3J0KCc4MCcpLnF1ZXJ5KHt9KS5wYXRoKCdhcGltYW51aS9pbmRleC5odG1sJykpLmhhc2goVVJJLmVuY29kZShhbmd1bGFyLnRvSnNvbihoYXNoKSkpO1xuICAgICAgICByZXR1cm4gdXJpLnRvU3RyaW5nKCk7XG4gICAgICB9ICAgIFxuICAgIH0pO1xuXG4gICAgbmF2LmFkZCh7XG4gICAgICBpZDogJ2dyYWZhbmEnLFxuICAgICAgdGl0bGU6ICgpID0+ICAnTWV0cmljcycsXG4gICAgICB0b29sdGlwOiAoKSA9PiAnVmlld3MgbWV0cmljcyBhY3Jvc3MgYWxsIGNvbnRhaW5lcnMgdXNpbmcgR3JhZmFuYSBhbmQgSW5mbHV4REInLFxuICAgICAgaXNWYWxpZDogKCkgPT4gU2VydmljZVJlZ2lzdHJ5Lmhhc1NlcnZpY2UoZ3JhZmFuYVNlcnZpY2VOYW1lKSxcbiAgICAgIGhyZWY6ICgpID0+IFNlcnZpY2VSZWdpc3RyeS5zZXJ2aWNlTGluayhncmFmYW5hU2VydmljZU5hbWUpLFxuICAgICAgaXNBY3RpdmU6ICgpID0+IGZhbHNlXG4gICAgfSk7XG5cbiAgICBuYXYuYWRkKHtcbiAgICAgIGlkOiBcImNoYXRcIixcbiAgICAgIHRpdGxlOiAoKSA9PiAgJ0NoYXQnLFxuICAgICAgdG9vbHRpcDogKCkgPT4gJ0NoYXQgcm9vbSBmb3IgZGlzY3Vzc2luZyB0aGlzIG5hbWVzcGFjZScsXG4gICAgICBpc1ZhbGlkOiAoKSA9PiBTZXJ2aWNlUmVnaXN0cnkuaGFzU2VydmljZShjaGF0U2VydmljZU5hbWUpLFxuICAgICAgaHJlZjogKCkgPT4ge1xuICAgICAgICB2YXIgYW5zd2VyID0gU2VydmljZVJlZ2lzdHJ5LnNlcnZpY2VMaW5rKGNoYXRTZXJ2aWNlTmFtZSk7XG4gICAgICAgIGlmIChhbnN3ZXIpIHtcbi8qXG4gICAgICAgICAgVE9ETyBhZGQgYSBjdXN0b20gbGluayB0byB0aGUgY29ycmVjdCByb29tIGZvciB0aGUgY3VycmVudCBuYW1lc3BhY2U/XG5cbiAgICAgICAgICB2YXIgaXJjSG9zdCA9IFwiXCI7XG4gICAgICAgICAgdmFyIGlyY1NlcnZpY2UgPSBTZXJ2aWNlUmVnaXN0cnkuZmluZFNlcnZpY2UoXCJodWJvdFwiKTtcbiAgICAgICAgICBpZiAoaXJjU2VydmljZSkge1xuICAgICAgICAgICAgaXJjSG9zdCA9IGlyY1NlcnZpY2UucG9ydGFsSVA7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChpcmNIb3N0KSB7XG4gICAgICAgICAgICB2YXIgbmljayA9IGxvY2FsU3RvcmFnZVtcImdvZ3NVc2VyXCJdIHx8IGxvY2FsU3RvcmFnZVtcImlyY05pY2tcIl0gfHwgXCJteW5hbWVcIjtcbiAgICAgICAgICAgIHZhciByb29tID0gXCIjZmFicmljOC1cIiArICBjdXJyZW50S3ViZXJuZXRlc05hbWVzcGFjZSgpO1xuICAgICAgICAgICAgYW5zd2VyID0gVXJsSGVscGVycy5qb2luKGFuc3dlciwgXCIva2l3aVwiLCBpcmNIb3N0LCBcIj8mbmljaz1cIiArIG5pY2sgKyByb29tKTtcbiAgICAgICAgICB9XG4qL1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBhbnN3ZXI7XG4gICAgICB9LFxuICAgICAgaXNBY3RpdmU6ICgpID0+IGZhbHNlXG4gICAgfSk7XG5cbiAgICAvLyBUT0RPIHdlIHNob3VsZCBtb3ZlIHRoaXMgdG8gYSBuaWNlciBsaW5rIGluc2lkZSB0aGUgTGlicmFyeSBzb29uIC0gYWxzbyBsZXRzIGhpZGUgdW50aWwgaXQgd29ya3MuLi5cbi8qXG4gICAgd29ya3NwYWNlLnRvcExldmVsVGFicy5wdXNoKHtcbiAgICAgIGlkOiAnY3JlYXRlUHJvamVjdCcsXG4gICAgICB0aXRsZTogKCkgPT4gICdDcmVhdGUnLFxuICAgICAgdG9vbHRpcDogKCkgPT4gJ0NyZWF0ZXMgYSBuZXcgcHJvamVjdCcsXG4gICAgICBpc1ZhbGlkOiAoKSA9PiBTZXJ2aWNlUmVnaXN0cnkuaGFzU2VydmljZShcImFwcC1saWJyYXJ5XCIpICYmIGZhbHNlLFxuICAgICAgaHJlZjogKCkgPT4gXCIvcHJvamVjdC9jcmVhdGVcIlxuICAgIH0pO1xuKi9cblxuICAgIGxvZy5pbmZvKFwic3RhcnRlZCwgdmVyc2lvbjogXCIsIHZlcnNpb24udmVyc2lvbik7XG4gICAgbG9nLmluZm8oXCJjb21taXQgSUQ6IFwiLCB2ZXJzaW9uLmNvbW1pdElkKTtcbiAgfV0pO1xuXG4gIGhhd3Rpb1BsdWdpbkxvYWRlci5yZWdpc3RlclByZUJvb3RzdHJhcFRhc2soKG5leHQpID0+IHtcbiAgICAkLmFqYXgoe1xuICAgICAgdXJsOiAndmVyc2lvbi5qc29uJywgXG4gICAgICBzdWNjZXNzOiAoZGF0YSkgPT4ge1xuICAgICAgICB0cnkge1xuICAgICAgICAgIHZlcnNpb24gPSBhbmd1bGFyLmZyb21Kc29uKGRhdGEpO1xuICAgICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgICB2ZXJzaW9uID0ge1xuICAgICAgICAgICAgbmFtZTogJ2ZhYnJpYzgtY29uc29sZScsXG4gICAgICAgICAgICB2ZXJzaW9uOiAnJ1xuICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgbmV4dCgpO1xuICAgICAgfSxcbiAgICAgIGVycm9yOiAoanFYSFIsIHRleHQsIHN0YXR1cykgPT4ge1xuICAgICAgICBsb2cuZGVidWcoXCJGYWlsZWQgdG8gZmV0Y2ggdmVyc2lvbjoganFYSFI6IFwiLCBqcVhIUiwgXCIgdGV4dDogXCIsIHRleHQsIFwiIHN0YXR1czogXCIsIHN0YXR1cyk7XG4gICAgICAgIG5leHQoKTtcbiAgICAgIH0sXG4gICAgICBkYXRhVHlwZTogXCJodG1sXCJcbiAgICB9KTtcbiAgfSk7XG5cbiAgaGF3dGlvUGx1Z2luTG9hZGVyLmFkZE1vZHVsZShwbHVnaW5OYW1lKTtcbn1cbiJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==

angular.module("fabric8-console-templates", []).run(["$templateCache", function($templateCache) {$templateCache.put("plugins/forge/html/command.html","<div ng-controller=\"Forge.CommandController\">\n  <div class=\"row\">\n    <div hawtio-breadcrumbs></div>\n  </div>\n\n  <div class=\"row\">\n    <div hawtio-tabs></div>\n  </div>\n\n<!--\n  <div class=\"row\">\n    <div class=\"col-md-12\">\n      <span class=\"pull-right\">&nbsp;</span>\n\n      <div class=\"user-icon-name pull-right\" ng-show=\"user\">\n        <a href=\"/forge/repos\" title=\"Browse the repositories for {{user}}\">\n          <img src=\"{{avatar_url}}\" class=\"avatar-small-img\" ng-show=\"avatar_url\">\n        </a>\n        &nbsp;\n        <a href=\"/forge/repos\" title=\"Browse the repositories for {{user}}\">\n          {{user}}\n        </a>\n        <span ng-show=\"repoName\">/\n          <a href=\"/forge/repos/{{repoName}}\" title=\"Browse the {{repoName}}repository\">\n            {{repoName}}\n          </a>\n        </span>\n      </div>\n    </div>\n  </div>\n-->\n  <div class=\"row\">\n    <div class=\"col-md-12\">\n      <h3>{{schema.info.description}}</h3>\n    </div>\n  </div>\n  <div class=\"row\" ng-show=\"executing\">\n    <div class=\"col-md-12\">\n      <p class=\"bg-info\">executing...\n        <i class=\"fa fa-spinner fa-spin\"></i>\n      </p>\n    </div>\n  </div>\n  <div class=\"row\" ng-show=\"response\">\n    <div class=\"col-md-12\">\n      <p ng-show=\"response.message\" ng-class=\"responseClass\"><span class=\"response-message\">{{response.message}}</span></p>\n      <p ng-show=\"response.output\" ng-class=\"responseClass\"><span class=\"response-output\">{{response.output}}</span></p>\n      <p ng-show=\"response.err\" ng-class=\"bg-warning\"><span class=\"response-err\">{{response.err}}</span></p>\n    </div>\n  </div>\n  <div class=\"row\" ng-show=\"response && !invalid\">\n    <div class=\"col-md-12\">\n      <a class=\"btn btn-primary\" href=\"{{completedLink}}\">Done</a>\n      <a class=\"btn btn-default\" ng-click=\"response = null\" ng-hide=\"wizardCompleted\">Hide</a>\n    </div>\n  </div>\n  <div class=\"row\" ng-show=\"validationError\">\n    <div class=\"col-md-12\">\n      <p class=\"bg-danger\">{{validationError}}</p>\n    </div>\n  </div>\n  <div class=\"row\">\n    <div class=\"col-md-12\">\n      <div ng-hide=\"fetched\">\n        <div class=\"align-center\">\n          <i class=\"fa fa-spinner fa-spin\"></i>\n        </div>\n      </div>\n      <div ng-show=\"fetched && !wizardCompleted\">\n        <div hawtio-form-2=\"schema\" entity=\'entity\'></div>\n      </div>\n    </div>\n  </div>\n  <div class=\"row\" ng-hide=\"wizardCompleted\">\n    <div class=\"col-md-2\">\n    </div>\n    <div class=\"col-md-2\">\n      <button class=\"btn btn-primary\"\n              title=\"Perform this command\"\n              ng-show=\"fetched\"\n              ng-disabled=\"executing\"\n              ng-click=\"execute()\">\n        Execute\n      </button>\n    </div>\n  </div>\n</div>\n");
$templateCache.put("plugins/forge/html/commands.html","<div class=\"row\" ng-controller=\"Forge.CommandsController\">\n  <div class=\"row\">\n    <div hawtio-breadcrumbs></div>\n  </div>\n\n  <div class=\"row\">\n    <div hawtio-tabs></div>\n  </div>\n\n  <div class=\"row\">\n    <div class=\"col-md-12\" ng-show=\"commands.length\">\n      <span ng-show=\"!id\">\n        Command: <hawtio-filter ng-model=\"tableConfig.filterOptions.filterText\"\n                                css-class=\"input-xxlarge\"\n                                placeholder=\"Filter commands...\"\n                                save-as=\"fabric8-forge-command-filter\"></hawtio-filter>\n      </span>\n      <span class=\"pull-right\">&nbsp;</span>\n\n      <div class=\"user-icon-name pull-right\" ng-show=\"user\">\n        <a href=\"/forge/repos\" title=\"Browse the repositories for {{user}}\">\n          <img src=\"{{avatar_url}}\" class=\"avatar-small-img\" ng-show=\"avatar_url\">\n        </a>\n        &nbsp;\n        <a href=\"/forge/repos\" title=\"Browse the repositories for {{user}}\">\n          {{user}}\n        </a>\n        <span ng-show=\"repoName\">/\n          <a href=\"/forge/repos/{{repoName}}\" title=\"Browse the {{repoName}}repository\">\n            {{repoName}}\n          </a>\n        </span>\n      </div>\n    </div>\n  </div>\n  <div class=\"row\">\n    <div class=\"col-md-12\">\n      <div ng-hide=\"fetched\">\n        <div class=\"align-center\">\n          <i class=\"fa fa-spinner fa-spin\"></i>\n        </div>\n      </div>\n      <div ng-show=\"fetched\">\n        <div ng-hide=\"commands.length\" class=\"align-center\">\n          <p class=\"alert alert-info\">There are no commands available!</p>\n        </div>\n        <div ng-show=\"commands.length\">\n        </div>\n        <div ng-show=\"mode == \'table\'\">\n          <table class=\"table table-condensed table-striped\" hawtio-simple-table=\"tableConfig\"></table>\n        </div>\n      </div>\n    </div>\n  </div>\n\n  <div ng-show=\"fetched && commands.length && mode != \'table\'\">\n    <div class=\"row\">\n      <ul>\n        <li class=\"no-list command-selector-folder\" ng-repeat=\"folder in commandSelector.folders\"\n            ng-show=\"commandSelector.showFolder(folder)\">\n          <div class=\"expandable\" ng-class=\"commandSelector.isOpen(folder)\">\n            <div title=\"{{folder.name}}\" class=\"title\">\n              <i class=\"expandable-indicator folder\"></i> <span class=\"folder-title\"\n                                                                ng-show=\"folder.name\">{{folder.name}}</span><span\n                    class=\"folder-title\" ng-hide=\"folder.name\">Uncategorized</span>\n            </div>\n            <div class=\"expandable-body\">\n              <ul>\n                <li class=\"no-list command\" ng-repeat=\"command in folder.commands\"\n                    ng-show=\"commandSelector.showCommand(command)\">\n                  <div class=\"inline-block command-selector-name\"\n                       ng-class=\"commandSelector.getSelectedClass(command)\">\n                    <span class=\"contained c-max\">\n                      <a href=\"{{command.$link}}\"\n                         title=\"{{command.description}}\">\n                        <span class=\"command-name\">{{command.$shortName}}</span>\n                      </a>\n                    </span>\n                  </div>\n                </li>\n              </ul>\n            </div>\n          </div>\n        </li>\n      </ul>\n    </div>\n  </div>\n</div>\n");
$templateCache.put("plugins/forge/html/createProject.html","<div class=\"row\" ng-controller=\"Forge.ReposController\">\n  <style>\n    .createProjectPage {\n      padding-top: 40px;\n    }\n  </style>\n\n  <div class=\"row\">\n    <div hawtio-breadcrumbs></div>\n  </div>\n\n  <div class=\"row\">\n    <div hawtio-tabs></div>\n  </div>\n\n  <div class=\"row\">\n    <div class=\"col-md-12\">\n      <span class=\"pull-right\">&nbsp;</span>\n      <a class=\"btn btn-default pull-right\" ng-click=\"logout()\" ng-show=\"login.loggedIn\"\n         title=\"Log out from the git repository\">\n        <i class=\"fa fa-sign-out\"></i> Log out</a>\n      </a>\n<!--\n      <span class=\"pull-right\" ng-show=\"login.loggedIn\">&nbsp;</span>\n\n      <div class=\"user-icon-name pull-right\" ng-show=\"login.loggedIn\">\n        <img src=\"{{login.avatar_url}}\" class=\"avatar-small-img\" ng-show=\"login.avatar_url\">&nbsp;\n        {{login.user}}\n      </div>\n-->\n    </div>\n  </div>\n\n\n  <div ng-show=\"!login.authHeader || login.relogin\">\n    <div ng-show=\"login.failed\">\n      <div class=\"bg-danger\">\n        <div class=\"invalid-login align-center\">\n          <h3>Invalid login/password. Please try again!</h3>\n        </div>\n      </div>\n    </div>\n    <h2 ng-hide=\"login.failed\">Please login to the git repository so that you can create a project</h2>\n\n    <form>\n      <div class=\"form-group\">\n        <label for=\"gitUsername\">User name</label>\n        <input type=\"text\" class=\"form-control\" id=\"gitUsername\" placeholder=\"Enter user name\" required=\"true\"\n               ng-model=\"login.user\">\n      </div>\n      <div class=\"form-group\">\n        <label for=\"gitPassword\">Password</label>\n        <input type=\"password\" class=\"form-control\" id=\"gitPassword\" placeholder=\"Password\" required=\"true\"\n               ng-model=\"login.password\">\n      </div>\n      <div class=\"form-group\">\n        <label for=\"gitEmail\">Email address</label>\n        <input type=\"email\" class=\"form-control\" id=\"gitEmail\" placeholder=\"Enter email\" required=\"true\"\n               ng-model=\"login.email\">\n      </div>\n      <div class=\"form-group\">\n        <button type=\"submit\" class=\"btn btn-primary\" ng-click=\"doLogin()\"\n                ng-disabled=\"!login.user || !login.password || !login.email\">\n          <i class=\"fa fa-sign-in\"></i> Sign In\n        </button>\n      </div>\n\n      <div class=\"form-group\" ng-show=\"forgotPasswordUrl\">\n        <a href=\"{{forgotPasswordUrl}}\">Forgot password?</a>\n      </div>\n\n      <div class=\"form-group\" ng-show=\"signUpUrl\">\n        <a href=\"{{signUpUrl}}\">Need an account? Sign up now.</a>\n      </div>\n    </form>\n  </div>\n\n  <div ng-hide=\"fetched || !login.authHeader || login.relogin\">\n    <div class=\"row\">\n      <div class=\"col-md-12\">\n        <div class=\"align-center\">\n          <i class=\"fa fa-spinner fa-spin\"></i>\n        </div>\n      </div>\n    </div>\n  </div>\n\n  <div ng-show=\"fetched && login.authHeader\">\n    <div class=\"createProjectPage\">\n      <div class=\"jumbotron\">\n        <p class=\"align-center\">\n          <a class=\"btn btn-primary btn-lg\" href=\"{{$workspaceLink}}/forge/command/project-new\"\n             ng-show=\"login.loggedIn\"\n             title=\"Create a new project in this workspace using a wizard\">\n            <i class=\"fa fa-plus\"></i> Create Project using Wizard</a>\n          </a>\n        </p>\n\n        <p class=\"lead align-center\">\n          This wizard guides you though creating a new project, the git repository and the related builds and Continuous\n          Delivery Pipelines.\n        </p>\n      </div>\n    </div>\n  </div>\n</div>\n");
$templateCache.put("plugins/forge/html/layoutForge.html","<script type=\"text/ng-template\" id=\"idTemplate.html\">\n  <div class=\"ngCellText\">\n    <a href=\"\"\n       title=\"Execute command {{row.entity.name}}\"\n       ng-href=\"{{row.entity.$link}}\">\n      {{row.entity.name}}</a>\n  </div>\n</script>\n<script type=\"text/ng-template\" id=\"repoTemplate.html\">\n  <div class=\"ngCellText\">\n    <a title=\"View repository {{row.entity.name}}\"\n       ng-href=\"/forge/repos/{{row.entity.name}}\">\n      {{row.entity.name}}\n    </a>\n  </div>\n</script>\n<script type=\"text/ng-template\" id=\"repoActionsTemplate.html\">\n  <div class=\"ngCellText\">\n    <a ng-show=\"row.entity.$openProjectLink\"\n       class=\"btn btn-primary\" target=\"editor\"\n       title=\"Open project {{row.entity.name}} in an editor\"\n       ng-href=\"{{row.entity.$openProjectLink}}\">\n      <i class=\"fa fa-pencil-square\"></i>\n      Open\n    </a>\n    <a ng-show=\"row.entity.html_url\"\n       class=\"btn btn-default\" target=\"browse\"\n       title=\"Browse project {{row.entity.name}}\"\n       ng-href=\"{{row.entity.html_url}}\">\n      <i class=\"fa fa-external-link\"></i>\n      Repository\n    </a>\n    <a ng-show=\"row.entity.$buildsLink\"\n       class=\"btn btn-default\" target=\"builds\"\n       title=\"View builds for this repository {{row.entity.owner.username}}/{{row.entity.name}}\"\n       ng-href=\"{{row.entity.$buildsLink}}\">\n      <i class=\"fa fa-cog\"></i>\n      Builds\n    </a>\n    <a ng-show=\"row.entity.$commandsLink\"\n       class=\"btn btn-default\"\n       title=\"Commands for project {{row.entity.name}}\"\n       ng-href=\"{{row.entity.$commandsLink}}\">\n      <i class=\"fa fa-play-circle\"></i>\n      Run...\n    </a>\n  </div>\n</script>\n<script type=\"text/ng-template\" id=\"categoryTemplate.html\">\n  <div class=\"ngCellText\">\n    <span class=\"pod-label badge\"\n          class=\"background-light-grey mouse-pointer\">{{row.entity.category}}</span>\n  </div>\n</script>\n\n<div class=\"row\">\n  <div class=\"wiki-icon-view\">\n    <div class=\"row forge-view\" ng-view></div>\n  </div>\n</div>\n");
$templateCache.put("plugins/forge/html/repo.html","<div class=\"row\" ng-controller=\"Forge.RepoController\">\n  <div class=\"row\">\n    <div hawtio-breadcrumbs></div>\n  </div>\n\n  <div class=\"row\">\n    <div hawtio-tabs></div>\n  </div>\n\n  <div class=\"row\">\n    <div class=\"col-md-12\">\n      <span class=\"pull-right\">&nbsp;</span>\n      <a class=\"btn btn-default pull-right\"\n              href=\"/forge/repos\"><i class=\"fa fa-list\"></i></a>\n      <span class=\"pull-right\">&nbsp;</span>\n      <a ng-show=\"entity.$commandsLink\"\n         class=\"btn btn-default pull-right\"\n         title=\"Commands for project {{entity.name}}\"\n         ng-href=\"{{entity.$commandsLink}}\">\n        <i class=\"fa fa-play-circle\"></i>\n        Run...\n      </a>\n      <span class=\"pull-right\" ng-show=\"entity.$buildsLink\">&nbsp;</span>\n      <a ng-show=\"entity.$buildsLink\"\n         class=\"btn btn-primary pull-right\" target=\"builds\"\n         title=\"View builds for this repository {{entity.owner.username}}/{{entity.name}}\"\n         ng-href=\"{{entity.$buildsLink}}\">\n        <i class=\"fa fa-cog\"></i>\n        Builds\n      </a>\n      <span class=\"pull-right\">&nbsp;</span>\n      <a ng-show=\"entity.html_url\"\n         class=\"btn btn-default pull-right\" target=\"browse\"\n         title=\"Browse project {{entity.name}}\"\n         ng-href=\"{{entity.html_url}}\">\n        <i class=\"fa fa-external-link\"></i>\n        Browse\n      </a>\n    </div>\n  </div>\n\n  <div ng-hide=\"fetched\">\n    <div class=\"row\">\n      <div class=\"col-md-12\">\n        <div class=\"align-center\">\n          <i class=\"fa fa-spinner fa-spin\"></i>\n        </div>\n      </div>\n    </div>\n  </div>\n  <div ng-show=\"fetched\">\n    <div class=\"row\">\n      <div class=\"col-md-12\">\n        <h3 title=\"repository for {{entity.owner.username}}\">\n          <span ng-show=\"entity.owner.username\">\n            <a href=\"/forge/repos\" title=\"Browse the repositories for {{entity.owner.username}}\">\n              <img src=\"{{entity.owner.avatar_url}}\" class=\"avatar-small-img\" ng-show=\"entity.owner.avatar_url\">\n            </a>\n            &nbsp;\n            <a href=\"/forge/repos\" title=\"Browse the repositories for {{entity.owner.username}}\">\n              {{entity.owner.username}}\n            </a>\n             &nbsp;/&nbsp;\n          </span>\n          {{entity.name}}\n        </h3>\n      </div>\n    </div>\n\n    <div class=\"git-clone-tabs\">\n      <div class=\"row\">\n        <div class=\"col-md-12\">\n          <div class=\"tabbable\">\n            <div value=\"ssh\" class=\"tab-pane\" title=\"SSH\" ng-show=\"entity.ssh_url\">\n              <div class=\"git-clone-panel\">\n                <p>to clone this git repository via <b>ssh</b> from the command line:</p>\n              </div>\n\n              <div class=\"highlight\">\n                <pre>\n                  <code>git clone {{entity.ssh_url}}</code>\n                </pre>\n              </div>\n            </div>\n\n            <div value=\"http\" class=\"tab-pane\" title=\"HTTP\" ng-show=\"entity.clone_url\">\n              <div class=\"git-clone-panel\">\n                <p>to clone this git repository via <b>http</b> from the command line:</p>\n              </div>\n\n              <div class=\"highlight\">\n                <pre>\n                  <code>git clone {{entity.clone_url}}</code>\n                </pre>\n              </div>\n            </div>\n          </div>\n        </div>\n      </div>\n    </div>\n  </div>\n</div>\n");
$templateCache.put("plugins/forge/html/repos.html","<div class=\"row\" ng-controller=\"Forge.ReposController\">\n  <div class=\"row\">\n    <div hawtio-breadcrumbs></div>\n  </div>\n\n  <div class=\"row\">\n    <div hawtio-tabs></div>\n  </div>\n\n  <div class=\"row\">\n    <div class=\"col-md-12\">\n      <hawtio-filter ng-model=\"tableConfig.filterOptions.filterText\"\n                     ng-show=\"projects.length\"\n                     css-class=\"input-xxlarge\"\n                     placeholder=\"Filter repositories...\"></hawtio-filter>\n      <!--\n            <span class=\"pull-right\">&nbsp;</span>\n            <button ng-show=\"fetched\"\n                    class=\"btn btn-danger pull-right\"\n                    ng-disabled=\"tableConfig.selectedItems.length == 0\"\n                    ng-click=\"delete(tableConfig.selectedItems)\">\n              <i class=\"fa fa-remove\"></i> Delete\n            </button>\n      -->\n      <span class=\"pull-right\">&nbsp;</span>\n      <a class=\"btn btn-primary pull-right\" href=\"{{$workspaceLink}}/forge/command/project-new\"\n         ng-show=\"login.loggedIn\"\n         title=\"Create a new project and repository\">\n        <i class=\"fa fa-plus\"></i> Create Project</a>\n      </a>\n      <span class=\"pull-right\">&nbsp;</span>\n      <a class=\"btn btn-default pull-right\" ng-click=\"logout()\" ng-show=\"login.loggedIn\"\n         title=\"Log out from the git repository\">\n        <i class=\"fa fa-sign-out\"></i> Log out</a>\n      </a>\n      <span class=\"pull-right\" ng-show=\"login.loggedIn\">&nbsp;</span>\n      <div class=\"user-icon-name pull-right\" ng-show=\"login.loggedIn\">\n        <img src=\"{{login.avatar_url}}\" class=\"avatar-small-img\" ng-show=\"login.avatar_url\">&nbsp;\n        {{login.user}}\n      </div>\n    </div>\n  </div>\n\n\n  <div ng-show=\"!login.authHeader || login.relogin\">\n    <div ng-show=\"login.failed\">\n      <div class=\"bg-danger\">\n        <div class=\"invalid-login align-center\">\n          <h3>Invalid login/password. Please try again!</h3>\n        </div>\n      </div>\n    </div>\n    <h2 ng-hide=\"login.failed\">Please login to the git repository</h2>\n\n    <form>\n      <div class=\"form-group\">\n        <label for=\"gitUsername\">User name</label>\n        <input type=\"text\" class=\"form-control\" id=\"gitUsername\" placeholder=\"Enter user name\" required=\"true\"\n               ng-model=\"login.user\">\n      </div>\n      <div class=\"form-group\">\n        <label for=\"gitPassword\">Password</label>\n        <input type=\"password\" class=\"form-control\" id=\"gitPassword\" placeholder=\"Password\" required=\"true\"\n               ng-model=\"login.password\">\n      </div>\n      <div class=\"form-group\">\n        <label for=\"gitEmail\">Email address</label>\n        <input type=\"email\" class=\"form-control\" id=\"gitEmail\" placeholder=\"Enter email\" required=\"true\"\n               ng-model=\"login.email\">\n      </div>\n      <div class=\"form-group\">\n        <button type=\"submit\" class=\"btn btn-primary\" ng-click=\"doLogin()\"\n                ng-disabled=\"!login.user || !login.password || !login.email\">\n          <i class=\"fa fa-sign-in\"></i> Sign In\n        </button>\n      </div>\n\n      <div class=\"form-group\" ng-show=\"forgotPasswordUrl\">\n          <a href=\"{{forgotPasswordUrl}}\">Forgot password?</a>\n      </div>\n\n      <div class=\"form-group\" ng-show=\"signUpUrl\">\n        <a href=\"{{signUpUrl}}\">Need an account? Sign up now.</a>\n      </div>\n    </form>\n  </div>\n\n  <div ng-hide=\"fetched || !login.authHeader || login.relogin\">\n    <div class=\"row\">\n      <div class=\"col-md-12\">\n        <div class=\"align-center\">\n          <i class=\"fa fa-spinner fa-spin\"></i>\n        </div>\n      </div>\n    </div>\n  </div>\n\n  <div ng-show=\"fetched && login.authHeader\">\n    <div ng-hide=\"projects.length\" class=\"align-center\">\n      <div class=\"padded-div\">\n        <div class=\"row\">\n          <div class=\"col-md-12\">\n            <p class=\"alert alert-info\">There are no git repositories yet. Please create one!</p>\n          </div>\n        </div>\n      </div>\n    </div>\n    <div ng-show=\"projects.length\">\n      <div class=\"row\">\n        <div class=\"col-md-12\">\n          <table class=\"table table-condensed table-striped\" hawtio-simple-table=\"tableConfig\"></table>\n        </div>\n      </div>\n    </div>\n  </div>\n</div>\n");}]); hawtioPluginLoader.addModule("fabric8-console-templates");