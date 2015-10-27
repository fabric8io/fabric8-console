

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
        var localStorage = Kubernetes.inject("localStorage") || {};
        var authHeader = localStorage["gogsAuthorization"];
        return authHeader ? true : false;
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

var Forge;
(function (Forge) {
    Forge._module = angular.module(Forge.pluginName, ['hawtio-core', 'hawtio-ui']);
    Forge.controller = PluginHelpers.createControllerFunction(Forge._module, Forge.pluginName);
    Forge.route = PluginHelpers.createRoutingFunction(Forge.templatePath);
    Forge._module.config(['$routeProvider', function ($routeProvider) {
        console.log("Listening on: " + UrlHelpers.join(Forge.context, '/createProject'));
        $routeProvider.when(UrlHelpers.join(Forge.context, '/createProject'), Forge.route('createProject.html', false)).when(UrlHelpers.join(Forge.context, '/repos/:path*'), Forge.route('repo.html', false)).when(UrlHelpers.join(Forge.context, '/repos'), Forge.route('repos.html', false));
        angular.forEach([Forge.context, '/workspaces/:namespace/projects/:project/forge'], function (path) {
            $routeProvider.when(UrlHelpers.join(path, '/commands'), Forge.route('commands.html', false)).when(UrlHelpers.join(path, '/commands/:path*'), Forge.route('commands.html', false)).when(UrlHelpers.join(path, '/command/:id'), Forge.route('command.html', false)).when(UrlHelpers.join(path, '/command/:id/:path*'), Forge.route('command.html', false));
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

var Forge;
(function (Forge) {
    Forge.CommandController = Forge.controller("CommandController", ["$scope", "$templateCache", "$location", "$routeParams", "$http", "$timeout", "ForgeApiURL", "ForgeModel", function ($scope, $templateCache, $location, $routeParams, $http, $timeout, ForgeApiURL, ForgeModel) {
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
            $http.post(url, request, Forge.createHttpConfig()).success(function (data, status, headers, config) {
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
                                angular.forEach(schema["properties"], function (property, name) {
                                    var value = property.value;
                                    if (value) {
                                        Forge.log.info("Adding entity." + name + " = " + value);
                                        $scope.entity[name] = value;
                                    }
                                });
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
            }).error(function (data, status, headers, config) {
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
            $http.post(url, request, Forge.createHttpConfig()).success(function (data, status, headers, config) {
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
            }).error(function (data, status, headers, config) {
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
                $http.get(url, Forge.createHttpConfig()).success(function (data, status, headers, config) {
                    if (data) {
                        $scope.fetched = true;
                        console.log("updateData loaded schema");
                        updateSchema(data);
                        Forge.setModelCommandInputs(ForgeModel, $scope.resourcePath, $scope.id, $scope.schema);
                        onSchemaLoad();
                    }
                    Core.$apply($scope);
                }).error(function (data, status, headers, config) {
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

var Forge;
(function (Forge) {
    Forge.CommandsController = Forge.controller("CommandsController", ["$scope", "$dialog", "$window", "$templateCache", "$routeParams", "$location", "localStorage", "$http", "$timeout", "ForgeApiURL", "ForgeModel", function ($scope, $dialog, $window, $templateCache, $routeParams, $location, localStorage, $http, $timeout, ForgeApiURL, ForgeModel) {
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
        $http.get(url, Forge.createHttpConfig()).success(function (data, status, headers, config) {
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
        }).error(function (data, status, headers, config) {
            Forge.log.warn("failed to load " + url + ". status: " + status + " data: " + data);
        });
    }]);
})(Forge || (Forge = {}));

var Forge;
(function (Forge) {
    Forge.RepoController = Forge.controller("RepoController", ["$scope", "$templateCache", "$location", "$routeParams", "$http", "$timeout", "ForgeApiURL", function ($scope, $templateCache, $location, $routeParams, $http, $timeout, ForgeApiURL) {
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
                $http.get(url, config).success(function (data, status, headers, config) {
                    if (data) {
                        Forge.enrichRepo(data);
                    }
                    $scope.entity = data;
                    $scope.fetched = true;
                }).error(function (data, status, headers, config) {
                    Forge.log.warn("failed to load " + url + ". status: " + status + " data: " + data);
                });
            }
            else {
                $scope.fetched = true;
            }
        }
    }]);
})(Forge || (Forge = {}));

var Forge;
(function (Forge) {
    Forge.ReposController = Forge.controller("ReposController", ["$scope", "$dialog", "$window", "$templateCache", "$routeParams", "$location", "localStorage", "$http", "$timeout", "ForgeApiURL", "KubernetesModel", "ServiceRegistry", function ($scope, $dialog, $window, $templateCache, $routeParams, $location, localStorage, $http, $timeout, ForgeApiURL, KubernetesModel, ServiceRegistry) {
        $scope.model = KubernetesModel;
        $scope.resourcePath = $routeParams["path"];
        $scope.commandsLink = function (path) { return Forge.commandsLink(path, $scope.projectId); };
        Forge.initScope($scope, $location, $routeParams);
        $scope.$on('kubernetesModelUpdated', function () {
            updateLinks();
            Core.$apply($scope);
        });
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
        function doDelete(projects) {
            angular.forEach(projects, function (project) {
                Forge.log.info("Deleting " + angular.toJson($scope.projects));
                var path = project.path;
                if (path) {
                    var url = Forge.repoApiUrl(ForgeApiURL, path);
                    $http.delete(url).success(function (data, status, headers, config) {
                        updateData();
                    }).error(function (data, status, headers, config) {
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
                url = Forge.createHttpUrl(url, authHeader, email);
                var config = {};
                $http.get(url, config).success(function (data, status, headers, config) {
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
                }).error(function (data, status, headers, config) {
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
                node.isFolder = function () {
                    return true;
                };
            }
            parent.children.push(node);
            var children = template.children;
            if (children) {
                addCreateWizardFolders(workspace, $scope, node, children);
            }
        });
    }
    Wiki.addCreateWizardFolders = addCreateWizardFolders;
    function startLink($scope) {
        var projectId = $scope.projectId;
        var owner = $scope.owner;
        var repoId = $scope.repoId || projectId;
        var start = UrlHelpers.join(Developer.projectLink(projectId), "/wiki", owner, repoId);
        var branch = $scope.branch;
        if (branch) {
            start = UrlHelpers.join(start, 'branch', branch);
        }
        return start;
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
        $scope.owner = $routeParams["owner"];
        $scope.repoId = $routeParams["repoId"];
        $scope.projectId = $routeParams["projectId"];
        $scope.namespace = $routeParams["namespace"];
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
            var startContext = '/workspaces/:namespace/projects/:projectId/wiki/:owner/:repoId';
            $routeProvider.when(UrlHelpers.join(startContext, path, 'view'), Wiki.route('viewPage.html', false)).when(UrlHelpers.join(startContext, path, 'create/:page*'), Wiki.route('create.html', false)).when(startContext + path + '/view/:page*', { templateUrl: 'plugins/wiki/html/viewPage.html', reloadOnSearch: false }).when(startContext + path + '/book/:page*', { templateUrl: 'plugins/wiki/html/viewBook.html', reloadOnSearch: false }).when(startContext + path + '/edit/:page*', { templateUrl: 'plugins/wiki/html/editPage.html' }).when(startContext + path + '/version/:page*\/:objectId', { templateUrl: 'plugins/wiki/html/viewPage.html' }).when(startContext + path + '/history/:page*', { templateUrl: 'plugins/wiki/html/history.html' }).when(startContext + path + '/commit/:page*\/:objectId', { templateUrl: 'plugins/wiki/html/commit.html' }).when(startContext + path + '/diff/:page*\/:diffObjectId1/:diffObjectId2', { templateUrl: 'plugins/wiki/html/viewPage.html', reloadOnSearch: false }).when(startContext + path + '/formTable/:page*', { templateUrl: 'plugins/wiki/html/formTable.html' }).when(startContext + path + '/dozer/mappings/:page*', { templateUrl: 'plugins/wiki/html/dozerMappings.html' }).when(startContext + path + '/configurations/:page*', { templateUrl: 'plugins/wiki/html/configurations.html' }).when(startContext + path + '/configuration/:pid/:page*', { templateUrl: 'plugins/wiki/html/configuration.html' }).when(startContext + path + '/newConfiguration/:factoryPid/:page*', { templateUrl: 'plugins/wiki/html/configuration.html' }).when(startContext + path + '/camel/diagram/:page*', { templateUrl: 'plugins/wiki/html/camelDiagram.html' }).when(startContext + path + '/camel/canvas/:page*', { templateUrl: 'plugins/wiki/html/camelCanvas.html' }).when(startContext + path + '/camel/properties/:page*', { templateUrl: 'plugins/wiki/html/camelProperties.html' });
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
    Wiki._module.run(["$location", "viewRegistry", "localStorage", "layoutFull", "helpRegistry", "preferencesRegistry", "wikiRepository", "$rootScope", function ($location, viewRegistry, localStorage, layoutFull, helpRegistry, preferencesRegistry, wikiRepository, $rootScope) {
        viewRegistry['wiki'] = Wiki.templatePath + 'layoutWiki.html';
        Wiki.documentTemplates.forEach(function (template) {
            if (!template['regex']) {
                template.regex = /(?:)/;
            }
        });
    }]);
    hawtioPluginLoader.addModule(Wiki.pluginName);
})(Wiki || (Wiki = {}));

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
                content: '<i class=" icon-sitemap"></i> Tree',
                title: "View the routes as a tree",
                isValid: function (workspace) { return true; },
                href: function () { return Wiki.startLink($scope.branch) + "/camel/properties/" + $scope.pageId; }
            },
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
            console.log("Selected " + $scope.selectedPaletteNode + " : " + $scope.selectedComponentNode);
        };
        $scope.onComponentSelect = function (node) {
            $scope.selectedComponentNode = (node && node["nodeModel"]) ? node : null;
            if ($scope.selectedComponentNode) {
                $scope.selectedPaletteNode = null;
                var nodeName = node.key;
                console.log("loading endpoint schema for node " + nodeName);
                $scope.loadEndpointSchema(nodeName);
                $scope.selectedComponentName = nodeName;
            }
            console.log("Selected " + $scope.selectedPaletteNode + " : " + $scope.selectedComponentNode);
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
                console.log("WARNING: no nodeModel!");
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
            console.log("cancelling...");
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
                console.log("nodeDrop nodeId: " + nodeId + " sourceId: " + sourceId + " hitMode: " + hitMode);
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
                console.log("WARNING: no id for model " + JSON.stringify(nodeModel));
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
                            console.log("Could not add a new route to the empty tree!");
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
                console.log("No XML found for page " + $scope.pageId);
            }
            Core.$applyLater($scope);
        }
        function updateView() {
            $scope.loadEndpointNames();
            $scope.pageId = Wiki.pageId($routeParams, $location);
            console.log("Has page id: " + $scope.pageId + " with $routeParams " + JSON.stringify($routeParams));
            wikiRepository.getPage($scope.branch, $scope.pageId, $scope.objectId, onResults);
        }
        function goToView() {
        }
        $scope.doSwitchToCanvasView = function () {
            $location.url(Core.trimLeading((Wiki.startLink($scope.branch) + "/camel/canvas/" + $scope.pageId), '#'));
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
            console.log("scheme " + endpointScheme + " path " + endpointPath + " parameters " + endpointParameters);
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
            console.log("cancelling...");
        };
        $scope.$watch("selectedRouteId", onRouteSelectionChanged);
        function goToView() {
        }
        function addNewNode(nodeModel) {
            var doc = $scope.doc || document;
            var parentFolder = $scope.selectedFolder || $scope.rootFolder;
            var key = nodeModel["_id"];
            if (!key) {
                console.log("WARNING: no id for model " + JSON.stringify(nodeModel));
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
                            console.log("Could not add a new route to the empty tree!");
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
                    console.log("Cant find node at " + idx);
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
                dagre.layout().nodeSep(100).edgeSep(edgeSep).rankSep(75).nodes(states).edges(transitions).debugLevel(1).run();
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
                            console.log("endpoint " + endpointScheme + " path " + endpointPath + " and parameters " + JSON.stringify(endpointParameters));
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

var Wiki;
(function (Wiki) {
    Wiki._module.controller("Wiki.CommitController", ["$scope", "$location", "$routeParams", "$templateCache", "marked", "fileExtensionTypeRegistry", function ($scope, $location, $routeParams, $templateCache, marked, fileExtensionTypeRegistry) {
        var isFmc = false;
        var jolokia = null;
        Wiki.initScope($scope, $routeParams, $location);
        var wikiRepository = $scope.wikiRepository;
        $scope.commitId = $scope.objectId;
        $scope.selectedItems = [];
        $scope.dateFormat = 'EEE, MMM d, y : hh:mm:ss a';
        $scope.gridOptions = {
            data: 'commits',
            showFilter: false,
            multiSelect: false,
            selectWithCheckboxOnly: true,
            showSelectionCheckbox: true,
            displaySelectionCheckbox: true,
            selectedItems: $scope.selectedItems,
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
            return $scope.selectedItems.length === 1;
        };
        $scope.revert = function () {
            if ($scope.selectedItems.length > 0) {
                var path = commitPath($scope.selectedItems[0]);
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
            if ($scope.selectedItems.length > 0) {
                var commit = $scope.selectedItems[0];
                var link = Wiki.startLink($scope) + "/diff/" + commitPath(commit) + "/" + $scope.commitId + "/";
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
                    $http.get(exemplarUri).success(function (data, status, headers, config) {
                        putPage(path, name, folder, data, commitMessage);
                    }).error(function (data, status, headers, config) {
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
            console.log("creating new file at " + path);
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
                    cellTemplate: '<div class="ngCellText" title="{{row.entity.$date | date:\'EEE, MMM d, yyyy : HH:mm:ss Z\'}}">{{row.entity.$date.relative()}}</div>',
                    width: "**"
                },
                {
                    field: 'sha',
                    displayName: 'Change',
                    cellTemplate: $templateCache.get('changeCellTemplate.html'),
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
                    cellTemplate: '<div class="ngCellText" title="{{row.entity.short_message}}">{{row.entity.short_message  | limitTo:100}}</div>',
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
            var link = Wiki.startLink($scope) + "/diff/" + $scope.pageId + "/" + objectId + "/" + baseObjectId;
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
                    log.commitLink = Wiki.startLink($scope) + "/commit/" + $scope.pageId + "/" + commitId;
                });
                $scope.logs = logArray;
                Core.$apply($scope);
            });
            Wiki.loadBranches(jolokia, wikiRepository, $scope, isFmc);
        }
    }]);
})(Wiki || (Wiki = {}));

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
                    action: function () {
                    }
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
            return (!answer && $location.search()["form"]) ? Core.createHref($location, "#" + path, ["form"]) : answer;
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
            initialValue: 0 /* List */,
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
                case 0 /* List */:
                    Wiki.log.debug("List view mode");
                    break;
                case 1 /* Icon */:
                    Wiki.log.debug("Icon view mode");
                    break;
                default:
                    $scope.mode = 0 /* List */;
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
            var answer = "#/dashboard/add?tab=dashboard" + "&href=" + encodeURIComponent(href) + "&size=" + encodeURIComponent(size) + "&routeParams=" + encodeURIComponent(angular.toJson($routeParams));
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
                if ($scope.gridOptions.selectedItems.find(function (file) {
                    return file.name.endsWith(".profile");
                })) {
                    $scope.deleteWarning = "You are about to delete document(s) which represent Fabric8 profile(s). This really can't be undone! Wiki operations are low level and may lead to non-functional state of Fabric.";
                }
                else {
                    $scope.deleteWarning = null;
                }
                $scope.deleteDialog = Wiki.getDeleteDialog($dialog, {
                    callbacks: function () {
                        return $scope.deleteAndCloseDialog;
                    },
                    selectedFileHtml: function () {
                        return $scope.selectedFileHtml;
                    },
                    warning: function () {
                        return $scope.deleteWarning;
                    }
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
                    rename: function () {
                        return $scope.rename;
                    },
                    fileExists: function () {
                        return $scope.fileExists;
                    },
                    fileName: function () {
                        return $scope.fileName;
                    },
                    callbacks: function () {
                        return $scope.renameAndCloseDialog;
                    }
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
                    move: function () {
                        return $scope.move;
                    },
                    folderNames: function () {
                        return $scope.folderNames;
                    },
                    callbacks: function () {
                        return $scope.moveAndCloseDialog;
                    }
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
                }).sortBy(function (file) {
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

var Wiki;
(function (Wiki) {
    Developer.customProjectSubTabFactories.push(function (context) {
        var projectLink = context.projectLink;
        var projectName = context.projectName;
        var owner = "";
        var repoName = "";
        if (projectName) {
            var idx = projectName.indexOf('-');
            if (idx > 0) {
                owner = projectName.substring(0, idx);
                repoName = projectName.substring(idx + 1);
            }
        }
        return {
            isValid: function () { return projectLink && owner && repoName && Developer.forgeReadyLink(); },
            href: UrlHelpers.join(projectLink, "wiki", owner, repoName, "view"),
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
            this.baseUrl = UrlHelpers.join(ForgeApiURL, "repos/user", owner, repoName);
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
            var url = Forge.createHttpUrl(UrlHelpers.join(this.baseUrl, path));
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
            this.$http.get(url, config).success(successFn).error(errorFn);
        };
        GitWikiRepository.prototype.doPost = function (path, query, body, successFn, errorFn) {
            if (errorFn === void 0) { errorFn = null; }
            var url = Forge.createHttpUrl(UrlHelpers.join(this.baseUrl, path));
            if (query) {
                url += "&" + query;
            }
            if (!errorFn) {
                errorFn = function (data, status, headers, config) {
                    Wiki.log.warn("failed to load! " + url + ". status: " + status + " data: " + data);
                };
            }
            this.$http.post(url, body, this.config).success(successFn).error(errorFn);
        };
        GitWikiRepository.prototype.doPostForm = function (path, query, body, successFn, errorFn) {
            if (errorFn === void 0) { errorFn = null; }
            var url = Forge.createHttpUrl(UrlHelpers.join(this.baseUrl, path));
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
            this.$http.post(url, body, config).success(successFn).error(errorFn);
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

var Wiki;
(function (Wiki) {
    Wiki.TopLevelController = Wiki._module.controller("Wiki.TopLevelController", ['$scope', '$route', '$routeParams', function ($scope, $route, $routeParams) {
    }]);
})(Wiki || (Wiki = {}));

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
            oldHref: function () {
            },
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

var Main;
(function (Main) {
    Main._module.controller('Main.About', ["$scope", function ($scope) {
        $scope.info = Main.version;
    }]);
})(Main || (Main = {}));

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImluY2x1ZGVzLmpzIiwiZm9yZ2UvdHMvZm9yZ2VIZWxwZXJzLnRzIiwiZm9yZ2UvdHMvZm9yZ2VQbHVnaW4udHMiLCJmb3JnZS90cy9jb21tYW5kLnRzIiwiZm9yZ2UvdHMvY29tbWFuZHMudHMiLCJmb3JnZS90cy9yZXBvLnRzIiwiZm9yZ2UvdHMvcmVwb3MudHMiLCJ3aWtpL3RzL3dpa2lIZWxwZXJzLnRzIiwid2lraS90cy93aWtpUGx1Z2luLnRzIiwid2lraS90cy9jYW1lbC50cyIsIndpa2kvdHMvY2FtZWxDYW52YXMudHMiLCJ3aWtpL3RzL2NvbW1pdC50cyIsIndpa2kvdHMvY3JlYXRlLnRzIiwid2lraS90cy9lZGl0LnRzIiwid2lraS90cy9maWxlRHJvcC50cyIsIndpa2kvdHMvZm9ybVRhYmxlLnRzIiwid2lraS90cy9naXRQcmVmZXJlbmNlcy50cyIsIndpa2kvdHMvaGlzdG9yeS50cyIsIndpa2kvdHMvbmF2YmFyLnRzIiwid2lraS90cy92aWV3LnRzIiwid2lraS90cy93aWtpRGlhbG9ncy50cyIsIndpa2kvdHMvd2lraURpcmVjdGl2ZXMudHMiLCJ3aWtpL3RzL3dpa2lOYXZpZ2F0aW9uLnRzIiwid2lraS90cy93aWtpUmVwb3NpdG9yeS50cyIsIndpa2kvdHMvd2lraVRvcExldmVsLnRzIiwibWFpbi90cy9tYWluR2xvYmFscy50cyIsIm1haW4vdHMvbWFpblBsdWdpbi50cyIsIm1haW4vdHMvYWJvdXQudHMiXSwibmFtZXMiOlsiRm9yZ2UiLCJGb3JnZS5pc0ZvcmdlIiwiRm9yZ2UuaW5pdFNjb3BlIiwiRm9yZ2UuY29tbWFuZExpbmsiLCJGb3JnZS5jb21tYW5kc0xpbmsiLCJGb3JnZS5yZXBvc0FwaVVybCIsIkZvcmdlLnJlcG9BcGlVcmwiLCJGb3JnZS5jb21tYW5kQXBpVXJsIiwiRm9yZ2UuZXhlY3V0ZUNvbW1hbmRBcGlVcmwiLCJGb3JnZS52YWxpZGF0ZUNvbW1hbmRBcGlVcmwiLCJGb3JnZS5jb21tYW5kSW5wdXRBcGlVcmwiLCJGb3JnZS5tb2RlbFByb2plY3QiLCJGb3JnZS5zZXRNb2RlbENvbW1hbmRzIiwiRm9yZ2UuZ2V0TW9kZWxDb21tYW5kcyIsIkZvcmdlLm1vZGVsQ29tbWFuZElucHV0TWFwIiwiRm9yZ2UuZ2V0TW9kZWxDb21tYW5kSW5wdXRzIiwiRm9yZ2Uuc2V0TW9kZWxDb21tYW5kSW5wdXRzIiwiRm9yZ2UuZW5yaWNoUmVwbyIsIkZvcmdlLmNyZWF0ZUh0dHBDb25maWciLCJGb3JnZS5hZGRRdWVyeUFyZ3VtZW50IiwiRm9yZ2UuY3JlYXRlSHR0cFVybCIsIkZvcmdlLmNvbW1hbmRNYXRjaGVzVGV4dCIsIkZvcmdlLmlzTG9nZ2VkSW50b0dvZ3MiLCJGb3JnZS5yZWRpcmVjdFRvR29nc0xvZ2luSWZSZXF1aXJlZCIsIkZvcmdlLm9uUm91dGVDaGFuZ2VkIiwiRm9yZ2UudXBkYXRlU2NoZW1hIiwiRm9yZ2UudmFsaWRhdGUiLCJGb3JnZS50b0JhY2tncm91bmRTdHlsZSIsIkZvcmdlLnVwZGF0ZURhdGEiLCJGb3JnZS5vblNjaGVtYUxvYWQiLCJGb3JnZS5jb21tYW5kTWF0Y2hlcyIsIkZvcmdlLmRvRGVsZXRlIiwiRm9yZ2UudXBkYXRlTGlua3MiLCJXaWtpIiwiV2lraS5WaWV3TW9kZSIsIldpa2kuaXNGTUNDb250YWluZXIiLCJXaWtpLmlzV2lraUVuYWJsZWQiLCJXaWtpLmdvVG9MaW5rIiwiV2lraS5jdXN0b21WaWV3TGlua3MiLCJXaWtpLmNyZWF0ZVdpemFyZFRyZWUiLCJXaWtpLmNyZWF0ZUZvbGRlciIsIldpa2kuYWRkQ3JlYXRlV2l6YXJkRm9sZGVycyIsIldpa2kuc3RhcnRMaW5rIiwiV2lraS5pc0luZGV4UGFnZSIsIldpa2kudmlld0xpbmsiLCJXaWtpLmJyYW5jaExpbmsiLCJXaWtpLmVkaXRMaW5rIiwiV2lraS5jcmVhdGVMaW5rIiwiV2lraS5lbmNvZGVQYXRoIiwiV2lraS5kZWNvZGVQYXRoIiwiV2lraS5maWxlRm9ybWF0IiwiV2lraS5maWxlTmFtZSIsIldpa2kuZmlsZVBhcmVudCIsIldpa2kuaGlkZUZpbGVOYW1lRXh0ZW5zaW9ucyIsIldpa2kuZ2l0UmVzdFVSTCIsIldpa2kuZ2l0VXJsUHJlZml4IiwiV2lraS5naXRSZWxhdGl2ZVVSTCIsIldpa2kuZmlsZUljb25IdG1sIiwiV2lraS5pY29uQ2xhc3MiLCJXaWtpLmluaXRTY29wZSIsIldpa2kubG9hZEJyYW5jaGVzIiwiV2lraS5wYWdlSWQiLCJXaWtpLnBhZ2VJZEZyb21VUkkiLCJXaWtpLmZpbGVFeHRlbnNpb24iLCJXaWtpLm9uQ29tcGxldGUiLCJXaWtpLnBhcnNlSnNvbiIsIldpa2kuYWRqdXN0SHJlZiIsIldpa2kuZ2V0Rm9sZGVyWG1sTm9kZSIsIldpa2kuYWRkTmV3Tm9kZSIsIldpa2kub25Nb2RlbENoYW5nZUV2ZW50IiwiV2lraS5vbk5vZGVEYXRhQ2hhbmdlZCIsIldpa2kub25SZXN1bHRzIiwiV2lraS51cGRhdGVWaWV3IiwiV2lraS5nb1RvVmlldyIsIldpa2kuaXNSb3V0ZU9yTm9kZSIsIldpa2kuY3JlYXRlRW5kcG9pbnRVUkkiLCJXaWtpLnRyZWVNb2RpZmllZCIsIldpa2kucmVsb2FkUm91dGVJZHMiLCJXaWtpLm9uUm91dGVTZWxlY3Rpb25DaGFuZ2VkIiwiV2lraS5zaG93R3JhcGgiLCJXaWtpLmdldE5vZGVJZCIsIldpa2kuZ2V0U2VsZWN0ZWRPclJvdXRlRm9sZGVyIiwiV2lraS5nZXRDb250YWluZXJFbGVtZW50IiwiV2lraS5sYXlvdXRHcmFwaCIsIldpa2kuZ2V0TGluayIsIldpa2kuZ2V0Tm9kZUJ5Q0lEIiwiV2lraS51cGRhdGVTZWxlY3Rpb24iLCJXaWtpLmdldFdpZHRoIiwiV2lraS5nZXRGb2xkZXJJZEF0dHJpYnV0ZSIsIldpa2kuZ2V0Um91dGVGb2xkZXIiLCJXaWtpLmNvbW1pdFBhdGgiLCJXaWtpLnJldHVyblRvRGlyZWN0b3J5IiwiV2lraS5kb0NyZWF0ZSIsIldpa2kuZG9DcmVhdGUudG9QYXRoIiwiV2lraS5kb0NyZWF0ZS50b1Byb2ZpbGVOYW1lIiwiV2lraS5wdXRQYWdlIiwiV2lraS5nZXROZXdEb2N1bWVudFBhdGgiLCJXaWtpLmlzQ3JlYXRlIiwiV2lraS5vbkZpbGVDb250ZW50cyIsIldpa2kudXBkYXRlU291cmNlVmlldyIsIldpa2kub25Gb3JtU2NoZW1hIiwiV2lraS5zYXZlVG8iLCJXaWtpLmNoaWxkTGluayIsIldpa2kub25Gb3JtRGF0YSIsIldpa2kuc3dpdGNoRnJvbVZpZXdUb0N1c3RvbUxpbmsiLCJXaWtpLmxvYWRCcmVhZGNydW1icyIsIldpa2kuaXNEaWZmVmlldyIsIldpa2kudmlld0NvbnRlbnRzIiwiV2lraS5vbkZpbGVEZXRhaWxzIiwiV2lraS5jaGVja0ZpbGVFeGlzdHMiLCJXaWtpLmdldFJlbmFtZUZpbGVQYXRoIiwiV2lraS5nZXRSZW5hbWVEaWFsb2ciLCJXaWtpLmdldE1vdmVEaWFsb2ciLCJXaWtpLmdldERlbGV0ZURpYWxvZyIsIldpa2kub2Zmc2V0VG9wIiwiV2lraS5zY3JvbGxUb0hhc2giLCJXaWtpLnNjcm9sbFRvSWQiLCJXaWtpLmFkZExpbmtzIiwiV2lraS5vbkV2ZW50SW5zZXJ0ZWQiLCJXaWtpLmNyZWF0ZVNvdXJjZUJyZWFkY3J1bWJzIiwiV2lraS5jcmVhdGVFZGl0aW5nQnJlYWRjcnVtYiIsIldpa2kuR2l0V2lraVJlcG9zaXRvcnkiLCJXaWtpLkdpdFdpa2lSZXBvc2l0b3J5LmNvbnN0cnVjdG9yIiwiV2lraS5HaXRXaWtpUmVwb3NpdG9yeS5nZXRQYWdlIiwiV2lraS5HaXRXaWtpUmVwb3NpdG9yeS5wdXRQYWdlIiwiV2lraS5HaXRXaWtpUmVwb3NpdG9yeS5oaXN0b3J5IiwiV2lraS5HaXRXaWtpUmVwb3NpdG9yeS5jb21taXRJbmZvIiwiV2lraS5HaXRXaWtpUmVwb3NpdG9yeS5jb21taXRUcmVlIiwiV2lraS5HaXRXaWtpUmVwb3NpdG9yeS5kaWZmIiwiV2lraS5HaXRXaWtpUmVwb3NpdG9yeS5icmFuY2hlcyIsIldpa2kuR2l0V2lraVJlcG9zaXRvcnkuZXhpc3RzIiwiV2lraS5HaXRXaWtpUmVwb3NpdG9yeS5yZXZlcnRUbyIsIldpa2kuR2l0V2lraVJlcG9zaXRvcnkucmVuYW1lIiwiV2lraS5HaXRXaWtpUmVwb3NpdG9yeS5yZW1vdmVQYWdlIiwiV2lraS5HaXRXaWtpUmVwb3NpdG9yeS5yZW1vdmVQYWdlcyIsIldpa2kuR2l0V2lraVJlcG9zaXRvcnkuZG9HZXQiLCJXaWtpLkdpdFdpa2lSZXBvc2l0b3J5LmRvUG9zdCIsIldpa2kuR2l0V2lraVJlcG9zaXRvcnkuZG9Qb3N0Rm9ybSIsIldpa2kuR2l0V2lraVJlcG9zaXRvcnkuY29tcGxldGVQYXRoIiwiV2lraS5HaXRXaWtpUmVwb3NpdG9yeS5nZXRQYXRoIiwiV2lraS5HaXRXaWtpUmVwb3NpdG9yeS5nZXRMb2dQYXRoIiwiV2lraS5HaXRXaWtpUmVwb3NpdG9yeS5nZXRDb250ZW50IiwiV2lraS5HaXRXaWtpUmVwb3NpdG9yeS5qc29uQ2hpbGRDb250ZW50cyIsIldpa2kuR2l0V2lraVJlcG9zaXRvcnkuZ2l0IiwiTWFpbiJdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQ0FBLElBQU8sS0FBSyxDQTJOWDtBQTNORCxXQUFPLEtBQUssRUFBQyxDQUFDO0lBRURBLGFBQU9BLEdBQUdBLDhCQUE4QkEsQ0FBQ0E7SUFFekNBLFVBQUlBLEdBQUdBLEdBQUdBLEdBQUdBLGFBQU9BLENBQUNBO0lBQ3JCQSxnQkFBVUEsR0FBR0EsT0FBT0EsQ0FBQ0E7SUFDckJBLGdCQUFVQSxHQUFHQSxnQkFBZ0JBLENBQUNBO0lBQzlCQSxrQkFBWUEsR0FBR0EsZ0JBQVVBLEdBQUdBLE9BQU9BLENBQUNBO0lBQ3BDQSxTQUFHQSxHQUFrQkEsTUFBTUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsZ0JBQVVBLENBQUNBLENBQUNBO0lBRTVDQSxvQkFBY0EsR0FBR0EsSUFBSUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsZ0JBQWdCQSxDQUFDQSxDQUFDQTtJQUU1Q0EscUJBQWVBLEdBQUdBLFVBQVVBLENBQUNBLGVBQWVBLENBQUNBO0lBQzdDQSxzQkFBZ0JBLEdBQUdBLE9BQU9BLENBQUNBO0lBRTNCQSxv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QSxnQkFBZ0JBLEVBQUVBLFdBQVdBLEVBQUVBLGNBQWNBLEVBQUVBLE9BQU9BLEVBQUVBLFVBQVVBLEVBQUVBLGFBQWFBLEVBQUVBLFlBQVlBLEVBQ3hHQSxVQUFDQSxNQUFNQSxFQUFFQSxjQUF1Q0EsRUFBRUEsU0FBNkJBLEVBQUVBLFlBQVlBLEVBQUVBLEtBQUtBLEVBQUVBLFFBQVFBLEVBQUVBLFdBQVdBLEVBQUVBLFVBQVVBO1FBRXJJQSxNQUFNQSxDQUFDQSxLQUFLQSxHQUFHQSxVQUFVQSxDQUFDQTtRQUUxQkEsTUFBTUEsQ0FBQ0EsWUFBWUEsR0FBR0EsWUFBWUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsSUFBSUEsU0FBU0EsQ0FBQ0EsTUFBTUEsRUFBRUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsSUFBSUEsRUFBRUEsQ0FBQ0E7UUFDL0VBLE1BQU1BLENBQUNBLEVBQUVBLEdBQUdBLFlBQVlBLENBQUNBLElBQUlBLENBQUNBLENBQUNBO1FBQy9CQSxNQUFNQSxDQUFDQSxJQUFJQSxHQUFHQSxZQUFZQSxDQUFDQSxNQUFNQSxDQUFDQSxDQUFDQTtRQUVuQ0EsTUFBTUEsQ0FBQ0EsVUFBVUEsR0FBR0EsWUFBWUEsQ0FBQ0EsZUFBZUEsQ0FBQ0EsQ0FBQ0E7UUFDbERBLE1BQU1BLENBQUNBLElBQUlBLEdBQUdBLFlBQVlBLENBQUNBLFVBQVVBLENBQUNBLENBQUNBO1FBQ3ZDQSxNQUFNQSxDQUFDQSxRQUFRQSxHQUFHQSxFQUFFQSxDQUFDQTtRQUNyQkEsSUFBSUEsU0FBU0EsR0FBR0EsTUFBTUEsQ0FBQ0EsWUFBWUEsQ0FBQ0EsS0FBS0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0E7UUFDL0NBLEVBQUVBLENBQUNBLENBQUNBLFNBQVNBLElBQUlBLFNBQVNBLENBQUNBLE1BQU1BLENBQUNBLENBQUNBLENBQUNBO1lBQ2xDQSxNQUFNQSxDQUFDQSxRQUFRQSxHQUFHQSxTQUFTQSxDQUFDQSxTQUFTQSxDQUFDQSxNQUFNQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFDQTtRQUNwREEsQ0FBQ0E7UUFHREEsZUFBU0EsQ0FBQ0EsTUFBTUEsRUFBRUEsU0FBU0EsRUFBRUEsWUFBWUEsQ0FBQ0EsQ0FBQ0E7UUFDM0NBLG1DQUE2QkEsQ0FBQ0EsTUFBTUEsRUFBRUEsU0FBU0EsQ0FBQ0EsQ0FBQ0E7UUFFakRBLE1BQU1BLENBQUNBLGFBQWFBLEdBQUdBLE1BQU1BLENBQUNBLFlBQVlBLENBQUNBO1FBQzNDQSxFQUFFQSxDQUFDQSxDQUFDQSxNQUFNQSxDQUFDQSxTQUFTQSxDQUFDQSxDQUFDQSxDQUFDQTtRQUV2QkEsQ0FBQ0E7UUFDREEsTUFBTUEsQ0FBQ0EsWUFBWUEsR0FBR0Esa0JBQVlBLENBQUNBLE1BQU1BLENBQUNBLFlBQVlBLEVBQUVBLE1BQU1BLENBQUNBLFNBQVNBLENBQUNBLENBQUNBO1FBQzFFQSxNQUFNQSxDQUFDQSxhQUFhQSxHQUFHQSxNQUFNQSxDQUFDQSxTQUFTQSxHQUFHQSxVQUFVQSxDQUFDQSxJQUFJQSxDQUFDQSxNQUFNQSxDQUFDQSxZQUFZQSxFQUFFQSxjQUFjQSxDQUFDQSxHQUFHQSxNQUFNQSxDQUFDQSxZQUFZQSxDQUFDQTtRQUVySEEsTUFBTUEsQ0FBQ0EsTUFBTUEsR0FBR0EsRUFDZkEsQ0FBQ0E7UUFDRkEsTUFBTUEsQ0FBQ0EsU0FBU0EsR0FBR0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0E7UUFFbkNBLE1BQU1BLENBQUNBLE1BQU1BLEdBQUdBLDJCQUFxQkEsQ0FBQ0EsVUFBVUEsRUFBRUEsTUFBTUEsQ0FBQ0EsWUFBWUEsRUFBRUEsTUFBTUEsQ0FBQ0EsRUFBRUEsQ0FBQ0EsQ0FBQ0E7UUFDbEZBLFlBQVlBLEVBQUVBLENBQUNBO1FBRWZBLFNBQVNBLGNBQWNBO1lBQ3JCd0IsT0FBT0EsQ0FBQ0EsR0FBR0EsQ0FBQ0Esc0NBQXNDQSxDQUFDQSxDQUFDQTtZQUNwREEsTUFBTUEsQ0FBQ0EsTUFBTUEsR0FBR0EsRUFDZkEsQ0FBQ0E7WUFDRkEsTUFBTUEsQ0FBQ0EsU0FBU0EsR0FBR0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0E7WUFDbkNBLE1BQU1BLENBQUNBLGtCQUFrQkEsR0FBR0EsRUFBRUEsQ0FBQ0E7WUFDL0JBLE1BQU1BLENBQUNBLE1BQU1BLEdBQUdBLElBQUlBLENBQUNBO1lBQ3JCQSxJQUFJQSxDQUFDQSxNQUFNQSxDQUFDQSxNQUFNQSxDQUFDQSxDQUFDQTtZQUNwQkEsVUFBVUEsRUFBRUEsQ0FBQ0E7UUFDZkEsQ0FBQ0E7UUFFRHhCLE1BQU1BLENBQUNBLEdBQUdBLENBQUNBLHFCQUFxQkEsRUFBRUEsY0FBY0EsQ0FBQ0EsQ0FBQ0E7UUFFbERBLE1BQU1BLENBQUNBLE9BQU9BLEdBQUdBO1lBRWZBLE1BQU1BLENBQUNBLFFBQVFBLEdBQUdBLElBQUlBLENBQUNBO1lBQ3ZCQSxNQUFNQSxDQUFDQSxTQUFTQSxHQUFHQSxJQUFJQSxDQUFDQTtZQUN4QkEsTUFBTUEsQ0FBQ0EsT0FBT0EsR0FBR0EsS0FBS0EsQ0FBQ0E7WUFDdkJBLE1BQU1BLENBQUNBLGVBQWVBLEdBQUdBLElBQUlBLENBQUNBO1lBQzlCQSxJQUFJQSxTQUFTQSxHQUFHQSxNQUFNQSxDQUFDQSxFQUFFQSxDQUFDQTtZQUMxQkEsSUFBSUEsWUFBWUEsR0FBR0EsTUFBTUEsQ0FBQ0EsWUFBWUEsQ0FBQ0E7WUFDdkNBLElBQUlBLEdBQUdBLEdBQUdBLDBCQUFvQkEsQ0FBQ0EsV0FBV0EsRUFBRUEsU0FBU0EsQ0FBQ0EsQ0FBQ0E7WUFDdkRBLElBQUlBLE9BQU9BLEdBQUdBO2dCQUNaQSxRQUFRQSxFQUFFQSxZQUFZQTtnQkFDdEJBLFNBQVNBLEVBQUVBLE1BQU1BLENBQUNBLFNBQVNBO2FBQzVCQSxDQUFDQTtZQUNGQSxHQUFHQSxHQUFHQSxtQkFBYUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0E7WUFDekJBLFNBQUdBLENBQUNBLElBQUlBLENBQUNBLG1CQUFtQkEsR0FBR0EsR0FBR0EsR0FBR0EsWUFBWUEsR0FBR0EsT0FBT0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsT0FBT0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7WUFDN0VBLEtBQUtBLENBQUNBLElBQUlBLENBQUNBLEdBQUdBLEVBQUVBLE9BQU9BLEVBQUVBLHNCQUFnQkEsRUFBRUEsQ0FBQ0EsQ0FDMUNBLE9BQU9BLENBQUNBLFVBQVVBLElBQUlBLEVBQUVBLE1BQU1BLEVBQUVBLE9BQU9BLEVBQUVBLE1BQU1BO2dCQUM3QyxNQUFNLENBQUMsU0FBUyxHQUFHLEtBQUssQ0FBQztnQkFDekIsTUFBTSxDQUFDLE9BQU8sR0FBRyxLQUFLLENBQUM7Z0JBQ3ZCLE1BQU0sQ0FBQyxlQUFlLEdBQUcsSUFBSSxDQUFDO2dCQUM5QixFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO29CQUNULElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLE9BQU8sSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDO29CQUMzQyxJQUFJLGFBQWEsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDO29CQUN2QyxFQUFFLENBQUMsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDO3dCQUNsQixPQUFPLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxlQUFlLEVBQUUsVUFBQyxVQUFVOzRCQUN4RCxFQUFFLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxPQUFPLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztnQ0FDekMsSUFBSSxRQUFRLEdBQUcsVUFBVSxDQUFDLFFBQVEsSUFBSSxFQUFFLENBQUM7Z0NBQ3pDLEVBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO29DQUNwQixJQUFJLE9BQU8sR0FBRyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUM7b0NBQzFCLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7d0NBQ1osTUFBTSxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUM7d0NBQ3RCLE1BQU0sQ0FBQyxlQUFlLEdBQUcsT0FBTyxDQUFDLFdBQVcsQ0FBQzt3Q0FDN0MsTUFBTSxDQUFDLGVBQWUsR0FBRyxPQUFPLENBQUMsU0FBUyxDQUFDO29DQUM3QyxDQUFDO2dDQUNILENBQUM7NEJBQ0gsQ0FBQzt3QkFDSCxDQUFDLENBQUMsQ0FBQzt3QkFDSCxJQUFJLFVBQVUsR0FBRyxhQUFhLENBQUMsVUFBVSxDQUFDO3dCQUMxQyxFQUFFLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDOzRCQUNmLElBQUksTUFBTSxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7NEJBQ2hDLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7Z0NBQ1gsTUFBTSxDQUFDLE1BQU0sR0FBRyxFQUFFLENBQUM7Z0NBQ25CLFlBQVksQ0FBQyxNQUFNLENBQUMsQ0FBQztnQ0FFckIsT0FBTyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFDLEVBQUUsVUFBQyxRQUFRLEVBQUUsSUFBSTtvQ0FDbkQsSUFBSSxLQUFLLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQztvQ0FDM0IsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQzt3Q0FDVixTQUFHLENBQUMsSUFBSSxDQUFDLGdCQUFnQixHQUFHLElBQUksR0FBRyxLQUFLLEdBQUcsS0FBSyxDQUFDLENBQUM7d0NBQ2xELE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsS0FBSyxDQUFDO29DQUM5QixDQUFDO2dDQUNILENBQUMsQ0FBQyxDQUFDO2dDQUNILE1BQU0sQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQztnQ0FFckMsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQztvQ0FFM0IsSUFBSSxHQUFHLElBQUksQ0FBQztnQ0FDZCxDQUFDO2dDQUFDLElBQUksQ0FBQyxDQUFDO29DQUVOLE1BQU0sQ0FBQyxlQUFlLEdBQUcsSUFBSSxDQUFDO2dDQUNoQyxDQUFDOzRCQUNILENBQUM7d0JBQ0gsQ0FBQztvQkFDSCxDQUFDO2dCQUNILENBQUM7Z0JBQ0QsRUFBRSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztvQkFDcEIsTUFBTSxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUM7b0JBQ3ZCLElBQUksTUFBTSxHQUFHLENBQUMsQ0FBQyxJQUFJLElBQUksRUFBRSxDQUFDLENBQUMsTUFBTSxJQUFJLEVBQUUsQ0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFDLFdBQVcsRUFBRSxDQUFDO29CQUNsRSxNQUFNLENBQUMsYUFBYSxHQUFHLGlCQUFpQixDQUFDLE1BQU0sQ0FBQyxDQUFDO29CQUVqRCxJQUFJLFFBQVEsR0FBRyxDQUFDLENBQUMsSUFBSSxJQUFJLEVBQUUsQ0FBQyxDQUFDLGdCQUFnQixJQUFJLEVBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBQztvQkFDOUQsRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLFFBQVEsSUFBSSxRQUFRLElBQUksTUFBTSxDQUFDLEVBQUUsS0FBSyxhQUFhLENBQUMsQ0FBQyxDQUFDO3dCQUMvRCxNQUFNLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQzt3QkFFdkIsSUFBSSxTQUFTLEdBQUcsUUFBUSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUM7d0JBQzNDLElBQUksUUFBUSxHQUFHLFVBQVUsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsRUFBRSxpQ0FBaUMsRUFBRSxRQUFRLENBQUMsQ0FBQzt3QkFDOUcsU0FBRyxDQUFDLElBQUksQ0FBQyxrQ0FBa0MsR0FBRyxRQUFRLENBQUMsQ0FBQzt3QkFDeEQsU0FBUyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztvQkFDM0IsQ0FBQztnQkFDSCxDQUFDO2dCQUNELElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDdEIsQ0FBQyxDQUFDQSxDQUNGQSxLQUFLQSxDQUFDQSxVQUFVQSxJQUFJQSxFQUFFQSxNQUFNQSxFQUFFQSxPQUFPQSxFQUFFQSxNQUFNQTtnQkFDM0MsTUFBTSxDQUFDLFNBQVMsR0FBRyxLQUFLLENBQUM7Z0JBQ3pCLFNBQUcsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxJQUFJLEdBQUcsR0FBRyxHQUFHLE1BQU0sQ0FBQyxDQUFDO1lBQ2hFLENBQUMsQ0FBQ0EsQ0FBQ0E7UUFDUEEsQ0FBQ0EsQ0FBQ0E7UUFFRkEsTUFBTUEsQ0FBQ0EsZ0JBQWdCQSxDQUFDQSxRQUFRQSxFQUFFQTtZQUNoQ0EsUUFBUUEsRUFBRUEsQ0FBQ0E7UUFDYkEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7UUFFSEEsU0FBU0EsWUFBWUEsQ0FBQ0EsTUFBTUE7WUFDMUJ5QixFQUFFQSxDQUFDQSxDQUFDQSxNQUFNQSxDQUFDQSxDQUFDQSxDQUFDQTtnQkFHWEEsSUFBSUEsbUJBQW1CQSxHQUFHQSxPQUFPQSxDQUFDQSxJQUFJQSxDQUFDQSxNQUFNQSxDQUFDQSxDQUFDQTtnQkFDL0NBLE9BQU9BLENBQUNBLE9BQU9BLENBQUNBLG1CQUFtQkEsQ0FBQ0EsVUFBVUEsRUFBRUEsVUFBQ0EsUUFBUUE7b0JBQ3ZEQSxPQUFPQSxRQUFRQSxDQUFDQSxPQUFPQSxDQUFDQSxDQUFDQTtvQkFDekJBLE9BQU9BLFFBQVFBLENBQUNBLFNBQVNBLENBQUNBLENBQUNBO2dCQUM3QkEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0JBQ0hBLElBQUlBLElBQUlBLEdBQUdBLE9BQU9BLENBQUNBLE1BQU1BLENBQUNBLG1CQUFtQkEsQ0FBQ0EsQ0FBQ0E7Z0JBQy9DQSxFQUFFQSxDQUFDQSxDQUFDQSxJQUFJQSxLQUFLQSxNQUFNQSxDQUFDQSxrQkFBa0JBLENBQUNBLENBQUNBLENBQUNBO29CQUN2Q0EsT0FBT0EsQ0FBQ0EsR0FBR0EsQ0FBQ0Esa0JBQWtCQSxHQUFHQSxJQUFJQSxDQUFDQSxDQUFDQTtvQkFDdkNBLE1BQU1BLENBQUNBLGtCQUFrQkEsR0FBR0EsSUFBSUEsQ0FBQ0E7b0JBQ2pDQSxNQUFNQSxDQUFDQSxNQUFNQSxHQUFHQSxNQUFNQSxDQUFDQTtvQkFFdkJBLEVBQUVBLENBQUNBLENBQUNBLE1BQU1BLENBQUNBLEVBQUVBLEtBQUtBLGFBQWFBLENBQUNBLENBQUNBLENBQUNBO3dCQUNoQ0EsSUFBSUEsTUFBTUEsR0FBR0EsTUFBTUEsQ0FBQ0EsTUFBTUEsQ0FBQ0E7d0JBRTNCQSxJQUFJQSxVQUFVQSxHQUFHQSxNQUFNQSxDQUFDQSxVQUFVQSxJQUFJQSxFQUFFQSxDQUFDQTt3QkFDekNBLElBQUlBLFNBQVNBLEdBQUdBLFVBQVVBLENBQUNBLFNBQVNBLENBQUNBO3dCQUNyQ0EsSUFBSUEsT0FBT0EsR0FBR0EsVUFBVUEsQ0FBQ0EsT0FBT0EsQ0FBQ0E7d0JBQ2pDQSxJQUFJQSxjQUFjQSxHQUFHQSxVQUFVQSxDQUFDQSxjQUFjQSxDQUFDQTt3QkFDL0NBLEVBQUVBLENBQUNBLENBQUNBLGNBQWNBLENBQUNBLENBQUNBLENBQUNBOzRCQUNuQkEsY0FBY0EsQ0FBQ0EsTUFBTUEsR0FBR0EsSUFBSUEsQ0FBQ0E7NEJBQzdCQSxFQUFFQSxDQUFDQSxDQUFDQSxTQUFTQSxDQUFDQSxDQUFDQSxDQUFDQTtnQ0FDZEEsU0FBU0EsQ0FBQ0EsTUFBTUEsR0FBR0EsSUFBSUEsQ0FBQ0E7NEJBQzFCQSxDQUFDQTs0QkFDREEsT0FBT0EsQ0FBQ0EsR0FBR0EsQ0FBQ0Esd0JBQXdCQSxDQUFDQSxDQUFDQTs0QkFHdENBLEVBQUVBLENBQUNBLENBQUNBLENBQUNBLE1BQU1BLENBQUNBLElBQUlBLENBQUNBLENBQUNBLENBQUNBO2dDQUNqQkEsTUFBTUEsQ0FBQ0EsSUFBSUEsR0FBR0Esd0JBQXdCQSxDQUFDQTs0QkFDekNBLENBQUNBO3dCQUNIQSxDQUFDQTt3QkFDREEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsT0FBT0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7NEJBQ1pBLEVBQUVBLENBQUNBLENBQUNBLENBQUNBLE1BQU1BLENBQUNBLE9BQU9BLENBQUNBLENBQUNBLENBQUNBO2dDQUNwQkEsTUFBTUEsQ0FBQ0EsT0FBT0EsR0FBR0EsU0FBU0EsQ0FBQ0E7NEJBQzdCQSxDQUFDQTt3QkFDSEEsQ0FBQ0E7b0JBQ0hBLENBQUNBO2dCQUNIQSxDQUFDQTtZQUNIQSxDQUFDQTtRQUNIQSxDQUFDQTtRQUVEekIsU0FBU0EsUUFBUUE7WUFDZjBCLEVBQUVBLENBQUNBLENBQUNBLE1BQU1BLENBQUNBLFNBQVNBLElBQUlBLE1BQU1BLENBQUNBLFVBQVVBLENBQUNBLENBQUNBLENBQUNBO2dCQUMxQ0EsTUFBTUEsQ0FBQ0E7WUFDVEEsQ0FBQ0E7WUFDREEsSUFBSUEsT0FBT0EsR0FBR0EsT0FBT0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0E7WUFDNUNBLEVBQUVBLENBQUNBLENBQUNBLE9BQU9BLEtBQUtBLE1BQU1BLENBQUNBLG1CQUFtQkEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0JBQzNDQSxNQUFNQSxDQUFDQTtZQUNUQSxDQUFDQTtZQUFDQSxJQUFJQSxDQUFDQSxDQUFDQTtnQkFDTkEsTUFBTUEsQ0FBQ0EsbUJBQW1CQSxHQUFHQSxPQUFPQSxDQUFDQTtZQUN2Q0EsQ0FBQ0E7WUFDREEsSUFBSUEsU0FBU0EsR0FBR0EsTUFBTUEsQ0FBQ0EsRUFBRUEsQ0FBQ0E7WUFDMUJBLElBQUlBLFlBQVlBLEdBQUdBLE1BQU1BLENBQUNBLFlBQVlBLENBQUNBO1lBQ3ZDQSxJQUFJQSxHQUFHQSxHQUFHQSwyQkFBcUJBLENBQUNBLFdBQVdBLEVBQUVBLFNBQVNBLENBQUNBLENBQUNBO1lBRXhEQSxJQUFJQSxTQUFTQSxHQUFHQSxFQUFFQSxDQUFDQSxNQUFNQSxDQUFDQSxNQUFNQSxDQUFDQSxTQUFTQSxDQUFDQSxDQUFDQTtZQUM1Q0EsU0FBU0EsQ0FBQ0EsU0FBU0EsQ0FBQ0EsTUFBTUEsR0FBR0EsQ0FBQ0EsQ0FBQ0EsR0FBR0EsTUFBTUEsQ0FBQ0EsTUFBTUEsQ0FBQ0E7WUFDaERBLElBQUlBLE9BQU9BLEdBQUdBO2dCQUNaQSxRQUFRQSxFQUFFQSxZQUFZQTtnQkFDdEJBLFNBQVNBLEVBQUVBLE1BQU1BLENBQUNBLFNBQVNBO2FBQzVCQSxDQUFDQTtZQUNGQSxHQUFHQSxHQUFHQSxtQkFBYUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0E7WUFFekJBLE1BQU1BLENBQUNBLFVBQVVBLEdBQUdBLElBQUlBLENBQUNBO1lBQ3pCQSxLQUFLQSxDQUFDQSxJQUFJQSxDQUFDQSxHQUFHQSxFQUFFQSxPQUFPQSxFQUFFQSxzQkFBZ0JBLEVBQUVBLENBQUNBLENBQzFDQSxPQUFPQSxDQUFDQSxVQUFVQSxJQUFJQSxFQUFFQSxNQUFNQSxFQUFFQSxPQUFPQSxFQUFFQSxNQUFNQTtnQkFDN0MsSUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUM7Z0JBRXZCLElBQUksYUFBYSxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUM7Z0JBQ3ZDLEVBQUUsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUM7b0JBQ2xCLElBQUksVUFBVSxHQUFHLGFBQWEsQ0FBQyxVQUFVLENBQUM7b0JBQzFDLEVBQUUsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7d0JBQ2YsSUFBSSxNQUFNLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQzt3QkFDaEMsWUFBWSxDQUFDLE1BQU0sQ0FBQyxDQUFDO29CQUN2QixDQUFDO2dCQUNILENBQUM7Z0JBQ0QsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQztnQkFNcEIsUUFBUSxDQUFDO29CQUNQLE1BQU0sQ0FBQyxVQUFVLEdBQUcsS0FBSyxDQUFDO29CQUMxQixRQUFRLEVBQUUsQ0FBQztnQkFDYixDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUM7WUFDVixDQUFDLENBQUNBLENBQ0ZBLEtBQUtBLENBQUNBLFVBQVVBLElBQUlBLEVBQUVBLE1BQU1BLEVBQUVBLE9BQU9BLEVBQUVBLE1BQU1BO2dCQUMzQyxNQUFNLENBQUMsU0FBUyxHQUFHLEtBQUssQ0FBQztnQkFDekIsU0FBRyxDQUFDLElBQUksQ0FBQyxpQkFBaUIsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLElBQUksR0FBRyxHQUFHLEdBQUcsTUFBTSxDQUFDLENBQUM7WUFDaEUsQ0FBQyxDQUFDQSxDQUFDQTtRQUNQQSxDQUFDQTtRQUVEMUIsVUFBVUEsRUFBRUEsQ0FBQ0E7UUFFYkEsU0FBU0EsaUJBQWlCQSxDQUFDQSxNQUFNQTtZQUMvQjJCLEVBQUVBLENBQUNBLENBQUNBLENBQUNBLE1BQU1BLENBQUNBLENBQUNBLENBQUNBO2dCQUNaQSxNQUFNQSxHQUFHQSxFQUFFQSxDQUFDQTtZQUNkQSxDQUFDQTtZQUNEQSxFQUFFQSxDQUFDQSxDQUFDQSxNQUFNQSxDQUFDQSxVQUFVQSxDQUFDQSxLQUFLQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtnQkFDN0JBLE1BQU1BLENBQUNBLFlBQVlBLENBQUNBO1lBQ3RCQSxDQUFDQTtZQUNEQSxNQUFNQSxDQUFDQSxZQUFZQSxDQUFBQTtRQUNyQkEsQ0FBQ0E7UUFFRDNCLFNBQVNBLFVBQVVBO1lBQ2pCNEIsTUFBTUEsQ0FBQ0EsSUFBSUEsR0FBR0EsSUFBSUEsQ0FBQ0E7WUFDbkJBLElBQUlBLFNBQVNBLEdBQUdBLE1BQU1BLENBQUNBLEVBQUVBLENBQUNBO1lBQzFCQSxFQUFFQSxDQUFDQSxDQUFDQSxTQUFTQSxDQUFDQSxDQUFDQSxDQUFDQTtnQkFDZEEsSUFBSUEsWUFBWUEsR0FBR0EsTUFBTUEsQ0FBQ0EsWUFBWUEsQ0FBQ0E7Z0JBQ3ZDQSxJQUFJQSxHQUFHQSxHQUFHQSx3QkFBa0JBLENBQUNBLFdBQVdBLEVBQUVBLFNBQVNBLEVBQUVBLFlBQVlBLENBQUNBLENBQUNBO2dCQUNuRUEsR0FBR0EsR0FBR0EsbUJBQWFBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBO2dCQUN6QkEsS0FBS0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsR0FBR0EsRUFBRUEsc0JBQWdCQSxFQUFFQSxDQUFDQSxDQUNoQ0EsT0FBT0EsQ0FBQ0EsVUFBVUEsSUFBSUEsRUFBRUEsTUFBTUEsRUFBRUEsT0FBT0EsRUFBRUEsTUFBTUE7b0JBQzdDLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7d0JBQ1QsTUFBTSxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUM7d0JBQ3RCLE9BQU8sQ0FBQyxHQUFHLENBQUMsMEJBQTBCLENBQUMsQ0FBQzt3QkFDeEMsWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFDO3dCQUNuQiwyQkFBcUIsQ0FBQyxVQUFVLEVBQUUsTUFBTSxDQUFDLFlBQVksRUFBRSxNQUFNLENBQUMsRUFBRSxFQUFFLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQzt3QkFDakYsWUFBWSxFQUFFLENBQUM7b0JBQ2pCLENBQUM7b0JBQ0QsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQztnQkFDdEIsQ0FBQyxDQUFDQSxDQUNGQSxLQUFLQSxDQUFDQSxVQUFVQSxJQUFJQSxFQUFFQSxNQUFNQSxFQUFFQSxPQUFPQSxFQUFFQSxNQUFNQTtvQkFDM0MsU0FBRyxDQUFDLElBQUksQ0FBQyxpQkFBaUIsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLElBQUksR0FBRyxHQUFHLEdBQUcsTUFBTSxDQUFDLENBQUM7Z0JBQ2hFLENBQUMsQ0FBQ0EsQ0FBQ0E7WUFDUEEsQ0FBQ0E7WUFBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0E7Z0JBQ05BLElBQUlBLENBQUNBLE1BQU1BLENBQUNBLE1BQU1BLENBQUNBLENBQUNBO1lBQ3RCQSxDQUFDQTtRQUNIQSxDQUFDQTtRQUVENUIsU0FBU0EsWUFBWUE7WUFFbkI2QixJQUFJQSxNQUFNQSxHQUFHQSxNQUFNQSxDQUFDQSxNQUFNQSxDQUFDQTtZQUMzQkEsTUFBTUEsQ0FBQ0EsT0FBT0EsR0FBR0EsTUFBTUEsQ0FBQ0E7WUFDeEJBLElBQUlBLE1BQU1BLEdBQUdBLE1BQU1BLENBQUNBLE1BQU1BLENBQUNBO1lBQzNCQSxFQUFFQSxDQUFDQSxDQUFDQSxNQUFNQSxDQUFDQSxDQUFDQSxDQUFDQTtnQkFDWEEsT0FBT0EsQ0FBQ0EsT0FBT0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsVUFBVUEsRUFBRUEsVUFBQ0EsUUFBUUEsRUFBRUEsR0FBR0E7b0JBQy9DQSxJQUFJQSxLQUFLQSxHQUFHQSxRQUFRQSxDQUFDQSxLQUFLQSxDQUFDQTtvQkFDM0JBLEVBQUVBLENBQUNBLENBQUNBLEtBQUtBLElBQUlBLENBQUNBLE1BQU1BLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO3dCQUMxQkEsTUFBTUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsR0FBR0EsS0FBS0EsQ0FBQ0E7b0JBQ3RCQSxDQUFDQTtnQkFDSEEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7WUFDTEEsQ0FBQ0E7UUFDSEEsQ0FBQ0E7SUFDSDdCLENBQUNBLENBQUNBLENBQUNBLENBQUNBO0FBQ1ZBLENBQUNBLEVBblNNLEtBQUssS0FBTCxLQUFLLFFBbVNYOztBQ3BTRCxJQUFPLEtBQUssQ0EyS1g7QUEzS0QsV0FBTyxLQUFLLEVBQUMsQ0FBQztJQUVEQSx3QkFBa0JBLEdBQUdBLGdCQUFVQSxDQUFDQSxvQkFBb0JBLEVBQUVBLENBQUNBLFFBQVFBLEVBQUVBLFNBQVNBLEVBQUVBLFNBQVNBLEVBQUVBLGdCQUFnQkEsRUFBRUEsY0FBY0EsRUFBRUEsV0FBV0EsRUFBRUEsY0FBY0EsRUFBRUEsT0FBT0EsRUFBRUEsVUFBVUEsRUFBRUEsYUFBYUEsRUFBRUEsWUFBWUEsRUFDL01BLFVBQUNBLE1BQU1BLEVBQUVBLE9BQU9BLEVBQUVBLE9BQU9BLEVBQUVBLGNBQWNBLEVBQUVBLFlBQVlBLEVBQUVBLFNBQTZCQSxFQUFFQSxZQUFZQSxFQUFFQSxLQUFLQSxFQUFFQSxRQUFRQSxFQUFFQSxXQUFXQSxFQUFFQSxVQUFVQTtRQUU1SUEsTUFBTUEsQ0FBQ0EsS0FBS0EsR0FBR0EsVUFBVUEsQ0FBQ0E7UUFDMUJBLE1BQU1BLENBQUNBLFlBQVlBLEdBQUdBLFlBQVlBLENBQUNBLE1BQU1BLENBQUNBLElBQUlBLFNBQVNBLENBQUNBLE1BQU1BLEVBQUVBLENBQUNBLE1BQU1BLENBQUNBLElBQUlBLEVBQUVBLENBQUNBO1FBQy9FQSxNQUFNQSxDQUFDQSxRQUFRQSxHQUFHQSxFQUFFQSxDQUFDQTtRQUNyQkEsTUFBTUEsQ0FBQ0Esa0JBQWtCQSxHQUFHQSxNQUFNQSxDQUFDQSxZQUFZQSxJQUFJQSxFQUFFQSxDQUFDQTtRQUN0REEsSUFBSUEsU0FBU0EsR0FBR0EsTUFBTUEsQ0FBQ0Esa0JBQWtCQSxDQUFDQSxLQUFLQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQTtRQUNyREEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsU0FBU0EsSUFBSUEsU0FBU0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7WUFDbENBLE1BQU1BLENBQUNBLFFBQVFBLEdBQUdBLFNBQVNBLENBQUNBLFNBQVNBLENBQUNBLE1BQU1BLEdBQUdBLENBQUNBLENBQUNBLENBQUNBO1FBQ3BEQSxDQUFDQTtRQUNEQSxFQUFFQSxDQUFDQSxDQUFDQSxDQUFDQSxNQUFNQSxDQUFDQSxrQkFBa0JBLENBQUNBLFVBQVVBLENBQUNBLEdBQUdBLENBQUNBLElBQUlBLE1BQU1BLENBQUNBLGtCQUFrQkEsQ0FBQ0EsTUFBTUEsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7WUFDdkZBLE1BQU1BLENBQUNBLGtCQUFrQkEsR0FBR0EsR0FBR0EsR0FBR0EsTUFBTUEsQ0FBQ0Esa0JBQWtCQSxDQUFDQTtRQUM5REEsQ0FBQ0E7UUFFREEsTUFBTUEsQ0FBQ0EsVUFBVUEsR0FBR0EsWUFBWUEsQ0FBQ0EsZUFBZUEsQ0FBQ0EsQ0FBQ0E7UUFDbERBLE1BQU1BLENBQUNBLElBQUlBLEdBQUdBLFlBQVlBLENBQUNBLFVBQVVBLENBQUNBLENBQUNBO1FBRXZDQSxNQUFNQSxDQUFDQSxRQUFRQSxHQUFHQSxzQkFBZ0JBLENBQUNBLFVBQVVBLEVBQUVBLE1BQU1BLENBQUNBLFlBQVlBLENBQUNBLENBQUNBO1FBQ3BFQSxNQUFNQSxDQUFDQSxPQUFPQSxHQUFHQSxNQUFNQSxDQUFDQSxRQUFRQSxDQUFDQSxNQUFNQSxLQUFLQSxDQUFDQSxDQUFDQTtRQUU5Q0EsZUFBU0EsQ0FBQ0EsTUFBTUEsRUFBRUEsU0FBU0EsRUFBRUEsWUFBWUEsQ0FBQ0EsQ0FBQ0E7UUFDM0NBLG1DQUE2QkEsQ0FBQ0EsTUFBTUEsRUFBRUEsU0FBU0EsQ0FBQ0EsQ0FBQ0E7UUFHakRBLE1BQU1BLENBQUNBLFdBQVdBLEdBQUdBO1lBQ25C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RUEsSUFBSUEsSUFBSUEsR0FBVUEsSUFBSUEsQ0FBQ0E7UUFDdkJBLElBQUlBLEtBQUtBLEdBQUdBLFNBQVNBLENBQUNBLE1BQU1BLENBQUNBLENBQUNBO1FBQzlCQSxFQUFFQSxDQUFDQSxDQUFDQSxNQUFNQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUVYQSxJQUFJQSxJQUFJQSxHQUFHQSxXQUFXQSxDQUFDQSxNQUFNQSxDQUFDQSxHQUFHQSxRQUFRQSxHQUFHQSxRQUFRQSxDQUFDQTtZQUNyREEsSUFBSUEsR0FBR0EsS0FBS0EsR0FBR0EsSUFBSUEsR0FBR0EsVUFBVUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsV0FBV0EsQ0FBQ0EsTUFBTUEsRUFBRUEsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7UUFDbEVBLENBQUNBO1FBQUNBLElBQUlBLENBQUNBLENBQUNBO1lBRU5BLElBQUlBLElBQUlBLEdBQVVBLFNBQVNBLENBQUNBLElBQUlBLEVBQUVBLENBQUNBO1lBQ25DQSxJQUFJQSxHQUFHQSxHQUFHQSxHQUFHQSxJQUFJQSxDQUFDQSxPQUFPQSxDQUFDQSxlQUFlQSxFQUFFQSxNQUFNQSxDQUFDQSxDQUFDQTtRQUNyREEsQ0FBQ0E7UUFDREEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsUUFBUUEsSUFBSUEsTUFBTUEsSUFBSUEsTUFBTUEsQ0FBQ0EsUUFBUUEsQ0FBQ0EsUUFBUUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7WUFDcERBLE1BQU1BLENBQUNBLElBQUlBLENBQUNBO1FBQ2RBLENBQUNBO1FBQ0RBLEVBQUVBLENBQUNBLENBQUNBLFFBQVFBLENBQUNBLENBQUNBLENBQUNBO1lBQ2JBLEVBQUVBLENBQUNBLENBQUNBLENBQUNBLElBQUlBLENBQUNBLFFBQVFBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO2dCQUN4QkEsSUFBSUEsSUFBSUEsR0FBR0EsQ0FBQ0E7WUFDZEEsQ0FBQ0E7WUFDREEsSUFBSUEsSUFBSUEsUUFBUUEsQ0FBQ0E7UUFDbkJBLENBQUNBO1FBQ0RBLE1BQU1BLENBQUNB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QUFhQSxDQUFDQTtRQUM1REEsSUFBSUEsT0FBT0EsR0FBR0EsR0FBR0EsQ0FBQ0EsT0FBT0EsQ0FBQ0E7UUFDMUJBLElBQUlBLE1BQU1BLEdBQUdBLEdBQUdBLENBQUNBLE1BQU1BLENBQUNBO1FBQ3hCQSxFQUFFQSxDQUFDQSxDQUFDQSxNQUFNQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUNYQSxJQUFJQSxHQUFHQSxJQUFJQSxJQUFJQSxNQUFNQSxDQUFDQSxJQUFJQSxDQUFDQTtZQUMzQkEsSUFBSUEsR0FBR0EsSUFBSUEsSUFBSUEsTUFBTUEsQ0FBQ0EsSUFBSUEsQ0FBQ0E7WUFDM0JBLE1BQU1BLEdBQUdBLE1BQU1BLElBQUlBLE1BQU1BLENBQUNBLE1BQU1BLENBQUNBO1lBQ2pDQSxTQUFTQSxHQUFHQSxTQUFTQSxJQUFJQSxNQUFNQSxDQUFDQSxTQUFTQSxDQUFDQTtZQUMxQ0EsYUFBYUEsR0FBR0EsYUFBYUEsSUFBSUEsTUFBTUEsQ0FBQ0EsY0FBY0EsSUFBSUEsTUFBTUEsQ0FBQ0EsYUFBYUEsQ0FBQ0E7WUFDL0VBLE9BQU9BLEdBQUdBLE9BQU9BLElBQUlBLE1BQU1BLENBQUNBLE9BQU9BLENBQUNBO1FBQ3RDQSxDQUFDQTtRQUNEQSxNQUFNQSxHQUFHQSxNQUFNQSxJQUFJQSxRQUFRQSxDQUFDQTtRQUM1QkEsSUFBSUEsR0FBR0EsR0FBR0EsSUFBSUEsQ0FBQ0E7UUFDZkEsSUFBSUEsSUFBSUEsR0FBVUEsSUFBSUEsQ0FBQ0E7UUFDdkJBLElBQUlBLFNBQVNBLEdBQUdBLGFBQWFBLENBQUNBLElBQUlBLENBQUNBLENBQUNBO1FBRXBDQSxFQUFFQSxDQUFDQSxDQUFDQSxhQUFhQSxJQUFJQSxhQUFhQSxDQUFDQSxNQUFNQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUMxQ0EsRUFBRUEsQ0FBQ0EsQ0FBQ0EsYUFBYUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsVUFBQ0EsRUFBRUEsSUFBS0EsT0FBQUEsSUFBSUEsQ0FBQ0EsZUFBZUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsRUFBRUEsQ0FBQ0EsRUFBNUJBLENBQTRC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R0EsQ0FBQ0EsQ0FBQ0E7WUFDNUJBLElBQUlBLFNBQVNBLEdBQUdBLFVBQVVBLENBQUNBLEtBQUtBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBO1lBQ3RDQSxJQUFJQSxPQUFPQSxHQUFHQSxLQUFLQSxDQUFDQSxNQUFNQSxDQUFDQSxVQUFDQSxJQUFJQTtnQkFDOUJBLE1BQU1BLENBQUNBLElBQUlBLEtBQUtBLElBQUlBLENBQUNBO1lBQ3ZCQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUNIQSxLQUFLQSxHQUFHQSxLQUFLQSxDQUFDQSxJQUFJQSxDQUFDQSxLQUFLQSxDQUFDQSxNQUFNQSxHQUFHQSxPQUFPQSxDQUFDQSxNQUFNQSxDQUFDQSxDQUFDQTtZQUNsREEsU0FBU0EsR0FBR0EsU0FBU0EsQ0FBQ0EsS0FBS0EsQ0FBQ0EsU0FBU0EsQ0FBQ0EsTUFBTUEsR0FBR0EsT0FBT0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0E7WUFFL0RBLE1BQU1BLENBQUNBLEdBQUdBLEdBQUdBLFNBQVNBLENBQUNBLElBQUlBLENBQUNBLEdBQUdBLENBQUNBLEdBQUdBLEdBQUdBLEdBQUdBLEtBQUtBLENBQUNBLElBQUlBLENBQUNBLEdBQUdBLENBQUNBLEdBQUdBLFNBQVNBLEdBQUdBLFNBQVNBLENBQUNBLElBQUlBLEVBQUVBLENBQUNBO1FBQzFGQSxDQUFDQTtRQUdEQSxFQUFFQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSxVQUFVQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUN6QkEsTUFBTUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsVUFBVUEsQ0FBQ0EsTUFBTUEsRUFBRUEsSUFBSUEsR0FBR0EsU0FBU0EsRUFBRUEsU0FBU0EsQ0FBQ0EsR0FBR0EsU0FBU0EsQ0FBQ0E7UUFDMUVBLENBQUNBO1FBRURBLEVBQUVBLENBQUNBLENBQUNBLENBQUNBLElBQUlBLENBQUNBLHlCQUF5QkEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsVUFBQ0EsT0FBT0E7WUFDOUNBLE1BQU1BLENBQUNBLElBQUlBLENBQUNBLFVB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QSxDQUFDQSxpQkFBaUJBLENBQUNBLFlBQVlBLEVBQUVBLFFBQVFBLENBQUNBLENBQUNBO29CQUM1REEsSUFBSUEsR0FBR0EsR0FBR0EsWUFBWUEsQ0FBQ0E7b0JBQ3ZCQSxJQUFJQSxLQUFLQSxHQUFHQSxLQUFLQSxDQUFDQSxPQUFPQSxDQUFDQSxJQUFJQSxZQUFZQSxDQUFDQTtvQkFDM0NBLElBQUlBLElBQUlBLEdBQUdBLElBQUlBLE1BQU1BLENBQUNBLEtBQUtBLENBQUNBLENBQUNBO29CQUM3QkEsSUFBSUEsQ0FBQ0EsR0FBR0EsR0FBR0EsUUFBUUEsR0FBR0EsR0FBR0EsR0FBR0EsR0FBR0EsQ0FBQ0E7b0JBQ2hDQSxJQUFJQSxDQUFDQSxHQUFHQSxHQUFHQSxHQUFHQSxDQUFDQTtvQkFDZkEsSUFBSUEsQ0FBQ0EsV0FBV0EsQ0FBQ0EsR0FBR0EsS0FBS0EsQ0FBQ0E7b0JBQzFCQSxJQUFJQSxPQUFPQSxHQUFHQSxLQUFLQSxDQUFDQSxTQUFTQSxDQUFDQSxJQUFJQSxLQUFLQSxDQUFDQSxhQUFhQSxDQUFDQSxJQUFJQSxLQUFLQSxDQUFDQTtvQkFDaEVBLElBQUlBLFFBQVFBLEdBQUdBLElBQUlBLENBQUNBLEdBQUdBLENBQUNBLEtBQUtBLENBQUNBLE1BQU1BLENBQUNBLElBQUlBLEtBQUtBLENBQUNBLFlBQVlBLENBQUNBLENBQUNBO29CQUM3REEsSUFBSUEsQ0FBQ0EsSUFBSUEsR0FBR0EsUUFBUUEsQ0FBQ0E7b0JBQ3JCQSxJQUFJQSxDQUFDQSxPQUFPQSxHQUFHQSxPQUFPQSxDQUFDQTtvQkFFdkJBLEtBQUtBLENBQUNBLFFBQVFBLENBQUNBLElBQUlBLENBQUNBLElBQUlBLENBQUNBLENBQUNBO2dCQUM1QkEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7WUFDTEEsQ0FBQ0E7UUFDSEEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7UUFDSEEsTUFBTUEsQ0FBQ0Esb0JBQW9CQSxHQUFHQSxDQUFDQSxNQUFNQSxDQUFDQSxDQUFDQTtRQUV2Q0EsTUFBTUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsZ0JBQWdCQSxFQUFF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LENBQUNBLFNBQVNBLENBQUNBLEtBQUtBLEVBQUVBLENBQUNBO1FBQzNCQSxDQUFDQSxDQUFDQTtRQUVGQSxNQUFNQSxDQUFDQSxVQUFVQSxHQUFHQTtZQUNsQkEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsY0FBY0EsSUFBSUEsTUFBTUEsQ0FBQ0EsUUFBUUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0JBQzdDQSxNQUFNQSxDQUFDQSxjQUFjQSxDQUFDQSxNQUFNQSxFQUFFQSxDQUFDQTtnQkFDL0JBLE1BQU1BLENBQUNBLFFBQVFBLENBQUNBLE1BQU1BLEVBQUVBLENBQUNBO2dCQUN6QkEsTUFBTUEsQ0FBQ0EsY0FBY0EsR0FBR0EsSUFBSUEsQ0FBQ0E7Z0JBQzdCQSxNQUFNQSxDQUFDQSxRQUFRQSxHQUFHQSxJQUFJQSxDQUFDQTtZQUN6QkEsQ0FBQ0E7UUFDSEEsQ0FBQ0EsQ0FBQ0E7UUFFRkEsTUFBTUEsQ0FBQ0EsU0FBU0EsR0FBR0E7WUFDakJBLE1BQU1BLENBQUNBLE1BQU1BLENBQUNBLGNBQWNBLEdBQUdBLElBQUlBLEdBQUdBLEtBQUtBLENBQUNBO1FBQzlDQSxDQUFDQSxDQUFDQTtRQUVGQSxNQUFNQSxDQUFDQSxRQUFRQSxHQUFHQSxVQUFDQSxHQUFHQTtZQUNwQkEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsT0FBT0EsQ0FBQ0EsUUFBUUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0E7Z0JBQ3hCQSxNQUFNQSxDQUFDQSxTQUFTQSxDQUFDQSxZQUFZQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQTtZQUNyQ0EsSUFBSUEsRUFBRUEsR0FBR0EsR0FBR0EsQ0FBQ0EsUUFBUUEsQ0FBQ0E7WUFDdEJBLEVBQUVBLENBQUNBLENBQUNBLEVBQUVBLENBQUNBLENBQUNBLENBQUNBO2dCQUNQQSxNQUFNQSxDQUFDQSxFQUFFQSxDQUFDQSxTQUFTQSxDQUFDQSxDQUFDQTtZQUN2QkEsQ0FBQ0E7WUFDREEsTUFBTUEsQ0FBQ0EsU0FBU0EsQ0FBQ0EsWUFBWUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsSUFBSUEsRUFB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QkFBdUJBO1lBQzlCNkMsRUFBRUEsQ0FBQ0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0JBQ2ZBLEVBQUVBLENBQUNBLENBQUNBLENBQUNBLE1BQU1BLENBQUNBLGVBQWVBLElBQUlBLE1BQU1BLENBQUNBLFFBQVFBLElBQUlBLE1BQU1BLENBQUNBLFFBQVFBLENBQUNBLE1BQU1BLENBQUNBLENBQUNBLENBQUNBO29CQUN6RUEsTUFBTUEsQ0FBQ0EsZUFBZUEsR0FBR0EsTUFBTUEsQ0FBQ0EsUUFBUUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0JBQzlDQSxDQUFDQTtnQkFDREEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsZUFBZUEsSUFBSUEsTUFBTUEsQ0FBQ0EsZUFBZUEsS0FBS0EsTUFBTUEsQ0FBQ0EsWUFBWUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7b0JBQzdFQSxJQUFJQSxLQUFLQSxHQUFHQSxFQUFFQSxDQUFDQTtvQkFDZkEsSUFBSUEsS0FBS0EsR0FBR0EsRUFBRUEsQ0FBQ0E7b0JBQ2ZBLEtBQUtBLENBQUNBLGlCQUFpQkEsQ0FBQ0EsTUFBTUEsRUFBRUEsTUFBTUEsQ0FBQ0EsR0FBR0EsRUFBRUEsTUFBTUEsQ0FBQ0EsZUFBZUEsRUFBRUEsS0FBS0EsRUFBRUEsS0FBS0EsRUFBRUEsUUFBUUEsRUFBRUEsQ0FBQ0EsQ0FBQ0E7b0JBQzlGQSxlQUFlQSxDQUFDQSxNQUFNQSxDQUFDQSxlQUFlQSxDQUFDQSxDQUFDQTtvQkFFeENBLE1BQU1BLENBQUNBLE9BQU9BLEdBQUdBLEtBQUtBLENBQUNBLGlCQUFpQkEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsVUFBVUEsQ0FBQ0EsQ0FBQ0E7b0JBQzVEQSxTQUFTQSxDQUFDQSxLQUFLQSxFQUFFQSxLQUFLQSxDQUFDQSxDQUFDQTtvQkFDeEJBLE1BQU1BLENBQUNBLFlBQVlBLEdBQUdBLE1BQU1BLENBQUNBLGVBQWVBLENBQUNBO2dCQUMvQ0EsQ0FBQ0E7Z0JBQ0RBLE1BQU1BLENBQUNBLHFCQUFxQkEsQ0FBQ0Es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QUFDQTtZQUMxQkEsT0FBT0EsQ0FBQ0EsT0FBT0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsZUFBZUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsRUFBRUEsVUFBQ0EsSUFBSUE7Z0JBQ2pEQSxFQUFFQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSxVQUFVQSxDQUFDQSxJQUFJQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtvQkFDMUJBLE1BQU1BLEdBQVdBLElBQUlBLENBQUNBLFVBQVVBLENBQUNBLFNBQVNBLEVBQUVBLElBQUlBLENBQUNBLFNBQVNBLENBQUNBLE1BQU1BLENBQUNBLEdBQUdBLE9BQU9BLEdBQUdBLElBQUlBLENBQUNBLFNBQVNBLENBQUNBLElBQUlBLENBQUNBLE1BQU1BLENBQUNBLENBQUNBLENBQUFBO2dCQUM3R0EsQ0FBQ0E7WUFDSEEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7WUFFSEEsTUFBTUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsTUFBTUEsSUFBSUEsU0FBU0EsQ0FBQ0EsTUFBTUEsRUFBRUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0EsR0FDcENBLElBQUlBLENBQUNBLFVBQVVBLENBQUNBLFNBQVNBLEVBQUVBLEdBQUdBLEdBQUdBLElBQUlBLEVBQUVBLENBQUNBLE1BQU1BLENBQUNBLENBQUNBLEdBQ2hEQSxNQUFNQSxDQUFDQTtRQUNuQkEsQ0FBQ0EsQ0FBQ0E7UUFFRkEsTUFBTUEsQ0FBQ0EsUUFBUUEsR0FBR0EsVUFBQ0EsSUFBSUE7WUFDckJBLEVBQUVBLENBQUNBLENBQUNBLENBQUNBLElBQUlBLENBQUNBLENBQUNBLENBQUNBO2dCQUNWQSxNQUFNQSxDQUFDQSxLQUFLQSxDQUFDQTtZQUNmQSxDQUFDQTtZQUNEQSxNQUFNQSxDQUFDQSxJQUFJQSxDQUFDQSxRQUFRQSxDQUFDQSxZQUFZQSxDQUFDQSxNQUFNQSxDQUFDQSxDQUFDQSxDQUFDQTtRQUM3Q0EsQ0FBQ0EsQ0FBQ0E7UUFFRkEsTUFBTUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EscUJBQXFCQSxFQUFFQSxVQUFVQSxLQUFLQSxFQUFFQSxPQUFPQSxFQUFFQSxRQUFRQTtZQUVsRSxVQUFVLENBQUMsZUFBZSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ2xDLENBQUMsQ0FBQ0EsQ0FBQ0E7UUFFSEEsZUFBZUEsRUFBRUEsQ0FBQ0E7UUFFbEJBLFNBQVNBLDBCQUEwQkEsQ0FBQ0EsVUFBVUEsRUFBRUEsSUFBSUE7WUFDbER1RSxJQUFJQSxJQUFJQSxHQUFHQSxVQUFVQSxDQUFDQSxJQUFJQSxDQUFDQTtZQUMzQkEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0JBQ1RBLFVBQVVBLENBQUNBLElBQUlBLEdBQUdBLElBQUlBLENBQUNBLE9BQU9BLENBQUNBLFdBQVdBLEVBQUVBLElBQUlBLENBQUNBLENBQUNBO1lBQ3BEQSxDQUFDQTtRQUNIQSxDQUFDQTtRQUVEdkUsU0FBU0EsZUFBZUE7WUFDdEJ3RSxJQUFJQSxLQUFLQSxHQUFHQSxJQUFJQSxDQUFDQSxTQUFTQSxDQUFDQSxNQUFNQSxDQUFDQSxDQUFDQTtZQUNuQ0EsSUFBSUEsSUFBSUEsR0FBR0EsS0FBS0EsR0FBR0EsT0FBT0EsQ0FBQ0E7WUFDM0JBLE1BQU1BLENBQUNBLFdBQVdBLEdBQUdBO2dCQUNuQkEsRUFBQ0EsSUFBSUEsRUFBRUEsSUFBSUEsRUFBRUEsSUFBSUEsRUFBRUEsTUFBTUEsRUFBQ0E7YUFDM0JBLENBQUNBO1lBQ0ZBLElBQUlBLElBQUlBLEdBQUdBLElBQUlBLENBQUNBLE1BQU1BLENBQUNBLFlBQVlBLEVBQUVBLFNBQVNBLENBQUNBLENBQUNBO1lBQ2hEQSxJQUFJQSxLQUFLQSxHQUFHQSxJQUFJQSxHQUFHQSxJQUFJQSxDQUFDQSxLQUFLQSxDQUFDQSxHQUFHQSxDQUFDQSxHQUFHQSxFQUFFQSxDQUFDQTtZQUN4Q0EsT0FBT0EsQ0FBQ0EsT0FBT0EsQ0FBQ0EsS0FBS0EsRUFBRUEsVUFBQ0EsSUFBSUE7Z0JBQzFCQSxFQUFFQSxDQUFDQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSxVQUFVQSxDQUFDQSxHQUFHQSxDQUFDQSxJQUFJQSxDQUFDQSxJQUFJQSxDQUFDQSxRQUFRQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtvQkFDakRBLElBQUlBLElBQUlBLEdBQUdBLENBQUNBO2dCQUNkQSxDQUFDQTtnQkFDREEsSUFBSUEsSUFBSUEsSUFBSUEsQ0FBQ0EsVUFBVUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0E7Z0JBQzlCQSxFQUFFQSxDQUFDQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSxPQUFPQSxFQUFFQSxDQUFDQSxDQUFDQSxDQUFDQTtvQkFDcEJBLE1BQU1BLENBQUNBLFdBQVdBLENBQUNBLElBQUlBLENBQUNBLEVBQUNBLElBQUlBLEVBQUVBLElBQUlBLEVBQUVBLElBQUlBLEVBQUVBLElBQUlBLEVBQUNBLENBQUNBLENBQUNBO2dCQUNwREEsQ0FBQ0E7WUFDSEEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7WUFFSEEsSUFBSUEsR0FBR0EsR0FBR0EsU0FBU0EsQ0FBQ0EsSUFBSUEsRUFBRUEsQ0FBQ0E7WUFDM0JBLEVBQUVBLENBQUNBLENBQUNBLE1BQU1BLENBQUNBLFdBQVdBLENBQUNBLE1BQU1BLENBQUNBLENBQUNBLENBQUNBO2dCQUM5QkEsSUFBSUEsSUFBSUEsR0FBR0EsTUFBTUEsQ0FBQ0EsV0FBV0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsV0FBV0EsQ0FBQ0EsTUFBTUEsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0JBRTdEQSxJQUFJQSxDQUFDQSxJQUFJQSxHQUFHQSxJQUFJQSxDQUFDQSxzQkFBc0JBLENBQUNBLElBQUlBLENBQUNBLElBQUlBLENBQUNBLENBQUNBO2dCQUVuREEsSUFBSUEsUUFBUUEsR0FBR0EsS0FBS0EsQ0FBQ0E7Z0JBQ3JCQSxPQUFPQSxDQUFDQSxPQUFPQSxDQUFDQSxJQUFJQSxDQUFDQSxlQUFlQSxDQUFDQSxNQUFNQSxDQUFDQSxFQUFFQSxVQUFDQSxJQUFJQTtvQkFDakRBLEVBQUVBLENBQUNBLENBQUNBLENBQUNBLFFBQVFBLElBQUlBLEdBQUdBLENBQUNBLFVBQVVBLENBQUNBLElBQUlB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LENBQUNBLEdBQUdBLENBQUNBLENBQUNBLElBQUlBLEVBQUVBLENBQUNBO2dCQUNyQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0JBRUxBLE1BQU1BLENBQUNBLFFBQVFBLEdBQVNBLEtBQU1BLENBQUNBLE1BQU1BLENBQUNBLFdBQVdBLEVBQUVBLFFBQVFBLEVBQUVBLEtBQUtBLENBQUNBLENBQUNBLEdBQUdBLENBQUNBLFVBQUNBLElBQUlBO29CQUMzRUEsSUFBSUEsQ0FBQ0EsTUFBTUEsR0FBR0EsTUFBTUEsQ0FBQ0EsTUFBTUEsQ0FBQ0E7b0JBQzVCQSxJQUFJQSxDQUFDQSxRQUFRQSxHQUFHQSxJQUFJQSxDQUFDQSxJQUFJQSxDQUFDQTtvQkFDMUJBLEVBQUVBLENBQUNBLENBQUNBLElBQUlBLENBQUNBLFNBQVNBLENBQUNBLENBQUNBLENBQUNBO3dCQUNuQkEsSUFBSUEsQ0FBQ0EsUUFBUUEsSUFBSUEsTUFBTUEsQ0FBQ0E7b0JBQzFCQSxDQUFDQTtvQkFDREEsSUFBSUEsQ0FBQ0EsV0FBV0EsR0FBR0EsSUFBSUEsQ0FBQ0EsVUFBVUEsQ0FBQ0EsTUFBTUEsRUFBRUEsSUFBSUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0E7b0JBQ3REQSxNQUFNQSxDQUFDQSxJQUFJQSxDQUFDQTtnQkFDZEEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7WUFDTEEsQ0FBQ0E7WUFHREEsTUFBTUEsQ0FBQ0EsSUFBSUEsR0FBR0EsSUFBSUEsQ0FBQ0E7WUFDbkJBLE1BQU1BLENBQUNBLE1BQU1BLEdBQUdBLElBQUlBLENBQUNBO1lBQ3JCQSxNQUFNQSxDQUFDQSxVQUFVQSxHQUFHQSxJQUFJQSxDQUFDQTtZQUV6QkEsTUFBTUEsQ0FBQ0EsTUFBTUEsR0FBR0EsS0FBS0EsQ0FBQ0E7WUFDdEJBLEVBQUVBLENBQUNBLENBQUNBLE1BQU1BLENBQUNBLFFBQVFBLENBQUNBLENBQUNBLENBQUNBO2dCQUNwQkEsTUFBTUEsQ0FBQ0EsVUFBVUEsQ0FBQ0EsV0FBV0EsQ0FBQ0EsQ0FBQ0E7Z0JBRS9CQSxJQUFJQSxJQUFJQSxHQUFHQSxNQUFN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QSxDQUFDQSxVQUFVQSxDQUFDQSxJQUFJQSxHQUFHQSxNQUFNQSxHQUFHQSxNQUFNQSxDQUFDQSxJQUFJQSxHQUFHQSxJQUFJQSxDQUFDQTt3QkFDckRBLElBQUlBLENBQUNBLE1BQU1BLENBQUNBLE1BQU1BLENBQUNBLENBQUNBO29CQUN0QkEsQ0FBQ0E7b0JBQUNBLElBQUlBLENBQUNBLENBQUNBO29CQUVSQSxDQUFDQTtnQkFDSEEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7WUFDTEEsQ0FBQ0E7UUFDSEEsQ0FBQ0E7UUFHRDVFLE1BQU1BLENBQUNBLFdBQVdBLEdBQUdBLFVBQUNBLFFBQVFBLEVBQUVBLEVBQUVBO1lBQ2hDQSxJQUFJQSxNQUFNQSxHQUFHQSxRQUFRQSxDQUFDQTtZQUN0QkEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsU0FBU0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0JBQ3JCQSxNQUFNQSxHQUFHQSxNQUFNQSxDQUFDQSxNQUFNQSxHQUFHQSxHQUFHQSxHQUFHQSxRQUFRQSxDQUFDQTtZQUMxQ0EsQ0FBQ0E7WUFBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0E7Z0JBQ05BLElBQUlBLFNBQVNBLEdBQUdBLE1BQU1BLENBQUNBLE1BQU1BLENBQUNBLEtBQUtBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBO2dCQUN6Q0EsU0FBU0EsR0FBR0EsU0FBU0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsU0FBU0EsQ0FBQ0EsSUFBSUEsRUFBRUEsQ0FBQ0EsQ0FBQ0E7Z0JBQy9DQSxTQUFTQSxDQUFDQSxJQUFJQSxDQUFDQSxRQUFRQSxDQUFDQSxDQUFDQTtnQkFDekJBLE1BQU1BLEdBQUdBLFNBQVNBLENBQUNBLElBQUlBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBO1lBQy9CQSxDQUFDQTtZQUNEQSxRQUFHQSxDQUFDQSxLQUFLQSxDQUFDQSxVQUFVQSxFQUFFQSxNQUFNQSxDQUFDQSxNQUFNQSxDQUFDQSxDQUFDQTtZQUNyQ0EsUUFBR0EsQ0FBQ0EsS0FBS0EsQ0FBQ0EsVUFBVUEsRUFBRUEsTUFBTUEsQ0FBQ0Es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QUFJQSxLQUFLQSxHQUFHQSxNQUFNQSxDQUFDQSxLQUFLQSxDQUFDQTtZQUN6QkEsSUFBSUEsUUFBUUEsR0FBR0EsTUFBTUEsQ0FBQ0EsTUFBTUEsQ0FBQ0E7WUFDN0JBLElBQUlBLENBQUNBLE9BQU9BLEdBQUdBLFVBQVVBLENBQUNBLElBQUlBLENBQUNBLFdBQVdBLEVBQUVBLFlBQVlBLEVBQUVBLEtBQUtBLEVBQUVBLFFBQVFBLENBQUNBLENBQUNBO1FBQzdFQSxDQUFDQTtRQUVNRCxtQ0FBT0EsR0FBZEEsVUFBZUEsTUFBYUEsRUFBRUEsSUFBV0EsRUFBRUEsUUFBZUEsRUFBRUEsRUFBRUE7WUFFNURFLElBQUlBLEtBQUtBLEdBQUdBLElBQUlBLENBQUNBO1lBQ2pCQSxFQUFFQSxDQUFDQSxDQUFDQSxNQUFNQSxDQUFDQSxDQUFDQSxDQUFDQTtnQkFDWEEsS0FBS0EsR0FBR0EsTUFBTUEsR0FBR0EsTUFBTUEsQ0FBQ0E7WUFDMUJBLENBQUNBO1lBQ0RBLElBQUlBLENBQUNBLEtBQUtBLENBQUNBLFVBQVVBLENBQUNBLElBQUlBLENBQUNBLFNBQVNBLEVBQUVBLElBQUlBLElBQUlBLEdBQUdBLENBQUNBLEVBQUVBLEtBQUtBLEVBQ3ZEQSxVQUFDQSxJQUFJQSxFQUFFQSxNQUFNQSxFQUFFQSxPQUFPQSxFQUFFQSxNQUFNQTtnQkFDNUJBLEVBQUVBLENBQUNBLENBQUNBLElBQUlBLENBQUNBLENBQUNBLENBQUNBO29CQUNUQSxJQUFJQSxPQUFPQSxHQUFRQSxJQUFJQSxDQUFDQTtvQkFDeEJBLEVBQUVBLENBQUNBLENBQUNBLE9BQU9BLENBQUNBLE9BQU9BLENBQUNBLElBQUlBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO3dCQUMxQkEsT0FBT0EsQ0FBQ0EsT0FBT0EsQ0FBQ0EsSUFBSUEsRUFBRUEsVUFBQ0EsSUFBSUE7NEJBQ3pCQSxFQUFFQSxDQUFDQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSxTQUFTQSxJQUFJQSxJQUFJQSxDQUFDQSxJQUFJQSxLQUFLQSxLQUFLQSxDQUFDQSxDQUFDQSxDQUFDQTtnQ0FDM0NBLElBQUlBLENBQUNBLFNBQVNBLEdBQUdBLElBQUlBLENBQUNBOzRCQUN4QkEsQ0FBQ0E7d0JBQ0hBLENBQUNBLENBQUNBLENBQUNBO3dCQUNIQSxPQUFPQSxHQUFHQTs0QkFDUkEsU0FBU0EsRUFBRUEsSUFBSUE7NEJBQ2ZBLFFBQVFBLEVBQUVBLElBQUlBO3lCQUNmQSxDQUFBQTtvQkFDSEEsQ0FBQ0E7b0JBQUNBLElBQUlBLENBQUNBLENBQUNBO3dCQUNOQSxPQUFPQSxHQUFHQSxJQUFJQSxDQUFDQTt3QkFDZkEsSUFBSUEsT0FBT0EsR0FBR0EsSUFBSUEsQ0FBQ0EsT0FBT0EsQ0FBQ0E7d0JBQzNCQSxFQUFFQSxDQUFDQSxDQUFDQSxPQUFPQSxDQUFDQSxDQUFDQSxDQUFDQTs0QkFDWkEsT0FBT0EsQ0FBQ0EsSUFBSUEsR0FBR0EsT0FBT0EsQ0FBQ0EsWUFBWUEsRUFBRUEsQ0FBQ0E7d0JBQ3hDQSxDQUFDQTtvQkFDSEEsQ0FBQ0E7b0JBQ0RBLEVBQUVBLENBQUNBLE9BQU9BLENBQUNBLENBQUNBO2dCQUNkQSxDQUFDQTtZQUNIQSxDQUFDQSxDQUFDQSxDQUFDQTtRQUNQQSxDQUFDQTtRQUVNRixtQ0FBT0EsR0FBZEEsVUFBZUEsTUFBYUEsRUFBRUEsSUFBV0EsRUFBRUEsUUFBZUEsRUFBRUEsYUFBb0JBLEVBQUVBLEVBQUVBO1lBQ2xGRyxJQUFJQSxLQUFLQSxHQUFHQSxJQUFJQSxDQUFDQTtZQUNqQkEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0JBQ1hBLEtBQUtBLEdBQUdBLE1BQU1BLEdBQUdBLE1BQU1BLENBQUNBO1lBQzFCQSxDQUFDQTtZQUNEQSxFQUFFQSxDQUFDQSxDQUFDQSxhQUFhQSxDQUFDQSxDQUFDQSxDQUFDQTtnQkFDbEJBLEtBQUtBLEdBQUdBLENBQUNBLEtBQUtBLEdBQUdBLEtBQUtBLEdBQUdBLEdBQUdBLEdBQUdBLEVBQUVBLENBQUNBLEdBQUdBLFVBQVVBLEdBQUdBLGtCQUFrQkEsQ0FBQ0EsYUFBYUEsQ0FBQ0EsQ0FBQ0E7WUFDdEZBLENBQUNBO1lBQ0RBLElBQUlBLElBQUlBLEdBQUdBLFFBQVFBLENBQUNBO1lBQ3BCQSxJQUFJQSxDQUFDQSxNQUFNQSxDQUFDQSxVQUFVQSxDQUFDQSxJQUFJQSxDQUFDQSxTQUFTQSxFQUFFQSxJQUFJQSxJQUFJQSxHQUFHQSxDQUFDQSxFQUFFQSxLQUFLQSxFQUFFQSxJQUFJQSxFQUM5REEsVUFBQ0EsSUFBSUEsRUFBRUEsTUFBTUEsRUFBRUEsT0FBT0EsRUFBRUEsTUFBTUE7Z0JBQzVCQSxFQUFFQSxDQUFDQSxJQUFJQSxDQUFDQSxDQUFDQTtZQUNYQSxDQUFDQSxDQUFDQSxDQUFDQTtRQUNQQSxDQUFDQTtRQWFNSCxtQ0FBT0EsR0FBZEEsVUFBZUEsTUFBYUEsRUFBRUEsUUFBZUEsRUFBRUEsSUFBV0EsRUFBRUEsS0FBWUEsRUFBRUEsRUFBRUE7WUFDMUVJLElBQUlBLEtBQUtBLEdBQUdBLElBQUlBLENBQUNBO1lBQ2pCQSxFQUFFQSxDQUFDQSxDQUFDQSxNQUFNQSxDQUFDQSxDQUFDQSxDQUFDQTtnQkFDWEEsS0FBS0EsR0FBR0EsTUFBTUEsR0FBR0EsTUFBTUEsQ0FBQ0E7WUFDMUJBLENBQUNBO1lBQ0RBLEVBQUVBLENBQUNBLENBQUNBLEtBQUtBLENBQUNBLENBQUNBLENBQUNBO2dCQUNWQSxLQUFLQSxHQUFHQSxDQUFDQSxLQUFLQSxHQUFHQSxLQUFLQSxHQUFHQSxHQUFHQSxHQUFHQSxFQUFFQSxDQUFDQSxHQUFHQSxRQUFRQSxHQUFHQSxLQUFLQSxDQUFDQTtZQUN4REEsQ0FBQ0E7WUFDREEsSUFBSUEsUUFBUUEsR0FBR0EsUUFBUUEsSUFBSUEsTUFBTUEsQ0FBQ0E7WUFDbENBLElBQUlBLENBQUNBLEtBQUtBLENBQUNBLFVBQVVBLENBQUNBLElBQUlBLENBQUNBLFNBQVNBLEVBQUVBLFFBQVFBLEVBQUVBLElBQUlBLENBQUNBLEVBQUVBLEtBQUtBLEVBQzFEQSxVQUFDQSxJQUFJQSxFQUFFQSxNQUFNQSxFQUFFQSxPQUFPQSxFQUFFQSxNQUFNQTtnQkFDNUJBLEVB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UUFBUUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0E7Z0JBQ25DQSxDQUFFQTtnQkFBQUEsS0FBS0EsQ0FBQ0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7b0JBQ2JBLFlBQU9BLEdBQUdBO3dCQUNSQSxJQUFJQSxFQUFFQSxpQkFBaUJBO3dCQUN2QkEsT0FBT0EsRUFBRUEsRUFBRUE7cUJBQ1pBLENBQUNBO2dCQUNKQSxDQUFDQTtnQkFDREEsSUFBSUEsRUFBRUEsQ0FBQ0E7WUFDVEEsQ0FBQ0E7WUFDREEsS0FBS0EsRUFBRUEsVUFBQ0EsS0FBS0EsRUFBRUEsSUFBSUEsRUFBRUEsTUFBTUE7Z0JBQ3pCQSxRQUFHQSxDQUFDQSxLQUFLQSxDQUFDQSxrQ0FBa0NBLEVBQUVBLEtBQUtBLEVBQUVBLFNBQVNBLEVBQUVBLElBQUlBLEVBQUVBLFdBQVdBLEVBQUVBLE1BQU1BLENBQUNBLENBQUNBO2dCQUMzRkEsSUFBSUEsRUFBRUEsQ0FBQ0E7WUFDVEEsQ0FBQ0E7WUFDREEsUUFBUUEsRUFBRUEsTUFBTUE7U0FDakJBLENBQUNBLENBQUNBO0lBQ0xBLENBQUNBLENBQUNBLENBQUNBO0lBRUhBLGtCQUFrQkEsQ0FBQ0EsU0FBU0EsQ0FBQ0EsZUFBVUEsQ0FBQ0EsQ0FBQ0E7QUFDM0NBLENBQUNBLEVBdElNLElBQUksS0FBSixJQUFJLFFBc0lWOztBQ3RKRCxJQUFPLElBQUksQ0FJVjtBQUpELFdBQU8sSUFBSSxFQUFDLENBQUM7SUFDWEEsWUFBT0EsQ0FBQ0EsVUFBVUEsQ0FBQ0EsWUFBWUEsRUFBRUEsVUFBQ0EsTUFBTUE7UUFDdENBLE1BQU1BLENBQUNBLElBQUlBLEdBQUdBLFlBQU9BLENBQUNBO0lBQ3hCQSxDQUFDQSxDQUFDQSxDQUFDQTtBQUNMQSxDQUFDQSxFQUpNLElBQUksS0FBSixJQUFJLFFBSVYiLCJmaWxlIjoiY29tcGlsZWQuanMiLCJzb3VyY2VzQ29udGVudCI6W251bGwsIi8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL2luY2x1ZGVzLnRzXCIvPlxubW9kdWxlIEZvcmdlIHtcblxuICBleHBvcnQgdmFyIGNvbnRleHQgPSAnL3dvcmtzcGFjZXMvOm5hbWVzcGFjZS9mb3JnZSc7XG5cbiAgZXhwb3J0IHZhciBoYXNoID0gJyMnICsgY29udGV4dDtcbiAgZXhwb3J0IHZhciBwbHVnaW5OYW1lID0gJ0ZvcmdlJztcbiAgZXhwb3J0IHZhciBwbHVnaW5QYXRoID0gJ3BsdWdpbnMvZm9yZ2UvJztcbiAgZXhwb3J0IHZhciB0ZW1wbGF0ZVBhdGggPSBwbHVnaW5QYXRoICsgJ2h0bWwvJztcbiAgZXhwb3J0IHZhciBsb2c6TG9nZ2luZy5Mb2dnZXIgPSBMb2dnZXIuZ2V0KHBsdWdpbk5hbWUpO1xuXG4gIGV4cG9ydCB2YXIgZGVmYXVsdEljb25VcmwgPSBDb3JlLnVybChcIi9pbWcvZm9yZ2Uuc3ZnXCIpO1xuXG4gIGV4cG9ydCB2YXIgZ29nc1NlcnZpY2VOYW1lID0gS3ViZXJuZXRlcy5nb2dzU2VydmljZU5hbWU7XG4gIGV4cG9ydCB2YXIgb3Jpb25TZXJ2aWNlTmFtZSA9IFwib3Jpb25cIjtcblxuICBleHBvcnQgdmFyIGxvZ2dlZEluVG9Hb2dzID0gZmFsc2U7XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIGlzRm9yZ2Uod29ya3NwYWNlKSB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICBleHBvcnQgZnVuY3Rpb24gaW5pdFNjb3BlKCRzY29wZSwgJGxvY2F0aW9uLCAkcm91dGVQYXJhbXMpIHtcbiAgICAkc2NvcGUucHJvamVjdElkID0gJHJvdXRlUGFyYW1zW1wicHJvamVjdFwiXTtcbiAgICAkc2NvcGUuJHdvcmtzcGFjZUxpbmsgPSBEZXZlbG9wZXIud29ya3NwYWNlTGluaygpO1xuICAgICRzY29wZS4kcHJvamVjdExpbmsgPSBEZXZlbG9wZXIucHJvamVjdExpbmsoJHNjb3BlLnByb2plY3RJZCk7XG4gICAgJHNjb3BlLmJyZWFkY3J1bWJDb25maWcgPSBEZXZlbG9wZXIuY3JlYXRlUHJvamVjdEJyZWFkY3J1bWJzKCRzY29wZS5wcm9qZWN0SWQpO1xuICAgICRzY29wZS5zdWJUYWJDb25maWcgPSBEZXZlbG9wZXIuY3JlYXRlUHJvamVjdFN1Yk5hdkJhcnMoJHNjb3BlLnByb2plY3RJZCk7XG4gIH1cblxuICBleHBvcnQgZnVuY3Rpb24gY29tbWFuZExpbmsocHJvamVjdElkLCBuYW1lLCByZXNvdXJjZVBhdGgpIHtcbiAgICB2YXIgbGluayA9IERldmVsb3Blci5wcm9qZWN0TGluayhwcm9qZWN0SWQpO1xuICAgIGlmIChuYW1lKSB7XG4gICAgICBpZiAocmVzb3VyY2VQYXRoKSB7XG4gICAgICAgIHJldHVybiBVcmxIZWxwZXJzLmpvaW4obGluaywgXCIvZm9yZ2UvY29tbWFuZFwiLCBuYW1lLCByZXNvdXJjZVBhdGgpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIFVybEhlbHBlcnMuam9pbihsaW5rLCBcIi9mb3JnZS9jb21tYW5kL1wiLCBuYW1lKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICBleHBvcnQgZnVuY3Rpb24gY29tbWFuZHNMaW5rKHJlc291cmNlUGF0aCwgcHJvamVjdElkKSB7XG4gICAgdmFyIGxpbmsgPSBEZXZlbG9wZXIucHJvamVjdExpbmsocHJvamVjdElkKTtcbiAgICBpZiAocmVzb3VyY2VQYXRoKSB7XG4gICAgICByZXR1cm4gVXJsSGVscGVycy5qb2luKGxpbmssIFwiL2ZvcmdlL2NvbW1hbmRzL3VzZXJcIiwgcmVzb3VyY2VQYXRoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIFVybEhlbHBlcnMuam9pbihsaW5rLCBcIi9mb3JnZS9jb21tYW5kc1wiKTtcbiAgICB9XG4gIH1cblxuICBleHBvcnQgZnVuY3Rpb24gcmVwb3NBcGlVcmwoRm9yZ2VBcGlVUkwpIHtcbiAgICByZXR1cm4gVXJsSGVscGVycy5qb2luKEZvcmdlQXBpVVJMLCBcIi9yZXBvc1wiKTtcbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiByZXBvQXBpVXJsKEZvcmdlQXBpVVJMLCBwYXRoKSB7XG4gICAgcmV0dXJuIFVybEhlbHBlcnMuam9pbihGb3JnZUFwaVVSTCwgXCIvcmVwb3MvdXNlclwiLCBwYXRoKTtcbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiBjb21tYW5kQXBpVXJsKEZvcmdlQXBpVVJMLCBjb21tYW5kSWQsIHJlc291cmNlUGF0aCA9IG51bGwpIHtcbiAgICByZXR1cm4gVXJsSGVscGVycy5qb2luKEZvcmdlQXBpVVJMLCBcImNvbW1hbmRcIiwgY29tbWFuZElkLCByZXNvdXJjZVBhdGgpO1xuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIGV4ZWN1dGVDb21tYW5kQXBpVXJsKEZvcmdlQXBpVVJMLCBjb21tYW5kSWQpIHtcbiAgICByZXR1cm4gVXJsSGVscGVycy5qb2luKEZvcmdlQXBpVVJMLCBcImNvbW1hbmRcIiwgXCJleGVjdXRlXCIsIGNvbW1hbmRJZCk7XG4gIH1cblxuICBleHBvcnQgZnVuY3Rpb24gdmFsaWRhdGVDb21tYW5kQXBpVXJsKEZvcmdlQXBpVVJMLCBjb21tYW5kSWQpIHtcbiAgICByZXR1cm4gVXJsSGVscGVycy5qb2luKEZvcmdlQXBpVVJMLCBcImNvbW1hbmRcIiwgXCJ2YWxpZGF0ZVwiLCBjb21tYW5kSWQpO1xuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIGNvbW1hbmRJbnB1dEFwaVVybChGb3JnZUFwaVVSTCwgY29tbWFuZElkLCByZXNvdXJjZVBhdGgpIHtcbiAgICByZXR1cm4gVXJsSGVscGVycy5qb2luKEZvcmdlQXBpVVJMLCBcImNvbW1hbmRJbnB1dFwiLCBjb21tYW5kSWQsIHJlc291cmNlUGF0aCk7XG4gIH1cblxuXG5cbiAgLyoqXG4gICAqIFJldHVybnMgdGhlIHByb2plY3QgZm9yIHRoZSBnaXZlbiByZXNvdXJjZSBwYXRoXG4gICAqL1xuICBmdW5jdGlvbiBtb2RlbFByb2plY3QoRm9yZ2VNb2RlbCwgcmVzb3VyY2VQYXRoKSB7XG4gICAgaWYgKHJlc291cmNlUGF0aCkge1xuICAgICAgdmFyIHByb2plY3QgPSBGb3JnZU1vZGVsLnByb2plY3RzW3Jlc291cmNlUGF0aF07XG4gICAgICBpZiAoIXByb2plY3QpIHtcbiAgICAgICAgcHJvamVjdCA9IHt9O1xuICAgICAgICBGb3JnZU1vZGVsLnByb2plY3RzW3Jlc291cmNlUGF0aF0gPSBwcm9qZWN0O1xuICAgICAgfVxuICAgICAgcmV0dXJuIHByb2plY3Q7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBGb3JnZU1vZGVsLnJvb3RQcm9qZWN0O1xuICAgIH1cbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiBzZXRNb2RlbENvbW1hbmRzKEZvcmdlTW9kZWwsIHJlc291cmNlUGF0aCwgY29tbWFuZHMpIHtcbiAgICB2YXIgcHJvamVjdCA9IG1vZGVsUHJvamVjdChGb3JnZU1vZGVsLCByZXNvdXJjZVBhdGgpO1xuICAgIHByb2plY3QuJGNvbW1hbmRzID0gY29tbWFuZHM7XG4gIH1cblxuICBleHBvcnQgZnVuY3Rpb24gZ2V0TW9kZWxDb21tYW5kcyhGb3JnZU1vZGVsLCByZXNvdXJjZVBhdGgpIHtcbiAgICB2YXIgcHJvamVjdCA9IG1vZGVsUHJvamVjdChGb3JnZU1vZGVsLCByZXNvdXJjZVBhdGgpO1xuICAgIHJldHVybiBwcm9qZWN0LiRjb21tYW5kcyB8fCBbXTtcbiAgfVxuXG4gIGZ1bmN0aW9uIG1vZGVsQ29tbWFuZElucHV0TWFwKEZvcmdlTW9kZWwsIHJlc291cmNlUGF0aCkge1xuICAgIHZhciBwcm9qZWN0ID0gbW9kZWxQcm9qZWN0KEZvcmdlTW9kZWwsIHJlc291cmNlUGF0aCk7XG4gICAgdmFyIGNvbW1hbmRJbnB1dHMgPSBwcm9qZWN0LiRjb21tYW5kSW5wdXRzO1xuICAgIGlmICghY29tbWFuZElucHV0cykge1xuICAgICAgY29tbWFuZElucHV0cyA9IHt9O1xuICAgICAgcHJvamVjdC4kY29tbWFuZElucHV0cyA9IGNvbW1hbmRJbnB1dHM7XG4gICAgfVxuICAgIHJldHVybiBjb21tYW5kSW5wdXRzO1xuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIGdldE1vZGVsQ29tbWFuZElucHV0cyhGb3JnZU1vZGVsLCByZXNvdXJjZVBhdGgsIGlkKSB7XG4gICAgdmFyIGNvbW1hbmRJbnB1dHMgPSBtb2RlbENvbW1hbmRJbnB1dE1hcChGb3JnZU1vZGVsLCByZXNvdXJjZVBhdGgpO1xuICAgIHJldHVybiBjb21tYW5kSW5wdXRzW2lkXTtcbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiBzZXRNb2RlbENvbW1hbmRJbnB1dHMoRm9yZ2VNb2RlbCwgcmVzb3VyY2VQYXRoLCBpZCwgaXRlbSkge1xuICAgIHZhciBjb21tYW5kSW5wdXRzID0gbW9kZWxDb21tYW5kSW5wdXRNYXAoRm9yZ2VNb2RlbCwgcmVzb3VyY2VQYXRoKTtcbiAgICByZXR1cm4gY29tbWFuZElucHV0c1tpZF0gPSBpdGVtO1xuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIGVucmljaFJlcG8ocmVwbykge1xuICAgIHZhciBvd25lciA9IHJlcG8ub3duZXIgfHwge307XG4gICAgdmFyIHVzZXIgPSBvd25lci51c2VybmFtZSB8fCByZXBvLnVzZXI7XG4gICAgdmFyIG5hbWUgPSByZXBvLm5hbWU7XG4gICAgdmFyIHByb2plY3RJZCA9IG5hbWU7XG4gICAgdmFyIGF2YXRhcl91cmwgPSBvd25lci5hdmF0YXJfdXJsO1xuICAgIGlmIChhdmF0YXJfdXJsICYmIGF2YXRhcl91cmwuc3RhcnRzV2l0aChcImh0dHAvL1wiKSkge1xuICAgICAgYXZhdGFyX3VybCA9IFwiaHR0cDovL1wiICsgYXZhdGFyX3VybC5zdWJzdHJpbmcoNik7XG4gICAgICBvd25lci5hdmF0YXJfdXJsID0gYXZhdGFyX3VybDtcbiAgICB9XG4gICAgaWYgKHVzZXIgJiYgbmFtZSkge1xuICAgICAgdmFyIHJlc291cmNlUGF0aCA9IHVzZXIgKyBcIi9cIiArIG5hbWU7XG4gICAgICByZXBvLiRjb21tYW5kc0xpbmsgPSBjb21tYW5kc0xpbmsocmVzb3VyY2VQYXRoLCBwcm9qZWN0SWQpO1xuICAgICAgcmVwby4kYnVpbGRzTGluayA9IFwiL2t1YmVybmV0ZXMvYnVpbGRzP3E9L1wiICsgcmVzb3VyY2VQYXRoICsgXCIuZ2l0XCI7XG4gICAgICB2YXIgaW5qZWN0b3IgPSBIYXd0aW9Db3JlLmluamVjdG9yO1xuICAgICAgaWYgKGluamVjdG9yKSB7XG4gICAgICAgIHZhciBTZXJ2aWNlUmVnaXN0cnkgPSBpbmplY3Rvci5nZXQoXCJTZXJ2aWNlUmVnaXN0cnlcIik7XG4gICAgICAgIGlmIChTZXJ2aWNlUmVnaXN0cnkpIHtcbiAgICAgICAgICB2YXIgb3Jpb25MaW5rID0gU2VydmljZVJlZ2lzdHJ5LnNlcnZpY2VMaW5rKG9yaW9uU2VydmljZU5hbWUpO1xuICAgICAgICAgIHZhciBnb2dzU2VydmljZSA9IFNlcnZpY2VSZWdpc3RyeS5maW5kU2VydmljZShnb2dzU2VydmljZU5hbWUpO1xuICAgICAgICAgIGlmIChvcmlvbkxpbmsgJiYgZ29nc1NlcnZpY2UpIHtcbiAgICAgICAgICAgIHZhciBwb3J0YWxJcCA9IGdvZ3NTZXJ2aWNlLnBvcnRhbElQO1xuICAgICAgICAgICAgaWYgKHBvcnRhbElwKSB7XG4gICAgICAgICAgICAgIHZhciBwb3J0ID0gZ29nc1NlcnZpY2UucG9ydDtcbiAgICAgICAgICAgICAgdmFyIHBvcnRUZXh0ID0gKHBvcnQgJiYgcG9ydCAhPT0gODAgJiYgcG9ydCAhPT0gNDQzKSA/IFwiOlwiICsgcG9ydCA6IFwiXCI7XG4gICAgICAgICAgICAgIHZhciBwcm90b2NvbCA9IChwb3J0ICYmIHBvcnQgPT09IDQ0MykgPyBcImh0dHBzOi8vXCIgOiBcImh0dHA6Ly9cIjtcbiAgICAgICAgICAgICAgdmFyIGdpdENsb25lVXJsID0gVXJsSGVscGVycy5qb2luKHByb3RvY29sICsgcG9ydGFsSXAgKyBwb3J0VGV4dCArIFwiL1wiLCByZXNvdXJjZVBhdGggKyBcIi5naXRcIik7XG5cbiAgICAgICAgICAgICAgcmVwby4kb3BlblByb2plY3RMaW5rID0gVXJsSGVscGVycy5qb2luKG9yaW9uTGluayxcbiAgICAgICAgICAgICAgICBcIi9naXQvZ2l0LXJlcG9zaXRvcnkuaHRtbCMsY3JlYXRlUHJvamVjdC5uYW1lPVwiICsgbmFtZSArIFwiLGNsb25lR2l0PVwiICsgZ2l0Q2xvbmVVcmwpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiBjcmVhdGVIdHRwQ29uZmlnKCkge1xuICAgIHZhciBhdXRoSGVhZGVyID0gbG9jYWxTdG9yYWdlW1wiZ29nc0F1dGhvcml6YXRpb25cIl07XG4gICAgdmFyIGVtYWlsID0gbG9jYWxTdG9yYWdlW1wiZ29nc0VtYWlsXCJdO1xuICAgIHZhciBjb25maWcgPSB7XG4gICAgICBoZWFkZXJzOiB7XG4gICAgICB9XG4vKlxuICAgICAgaGVhZGVyczoge1xuICAgICAgICBBdXRob3JpemF0aW9uOiBhdXRoSGVhZGVyLFxuICAgICAgICBFbWFpbDogZW1haWxcbiAgICAgIH1cbiovXG4gICAgfTtcbiAgICByZXR1cm4gY29uZmlnO1xuICB9XG5cbiAgZnVuY3Rpb24gYWRkUXVlcnlBcmd1bWVudCh1cmwsIG5hbWUsIHZhbHVlKSB7XG4gICAgaWYgKHVybCAmJiBuYW1lICYmIHZhbHVlKSB7XG4gICAgICB2YXIgc2VwID0gICh1cmwuaW5kZXhPZihcIj9cIikgPj0gMCkgPyBcIiZcIiA6IFwiP1wiO1xuICAgICAgcmV0dXJuIHVybCArIHNlcCArICBuYW1lICsgXCI9XCIgKyBlbmNvZGVVUklDb21wb25lbnQodmFsdWUpO1xuICAgIH1cbiAgICByZXR1cm4gdXJsO1xuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZUh0dHBVcmwodXJsLCBhdXRoSGVhZGVyID0gbnVsbCwgZW1haWwgPSBudWxsKSB7XG4gICAgYXV0aEhlYWRlciA9IGF1dGhIZWFkZXIgfHwgbG9jYWxTdG9yYWdlW1wiZ29nc0F1dGhvcml6YXRpb25cIl07XG4gICAgZW1haWwgPSBlbWFpbCB8fCBsb2NhbFN0b3JhZ2VbXCJnb2dzRW1haWxcIl07XG5cbiAgICB1cmwgPSBhZGRRdWVyeUFyZ3VtZW50KHVybCwgXCJfZ29nc0F1dGhcIiwgYXV0aEhlYWRlcik7XG4gICAgdXJsID0gYWRkUXVlcnlBcmd1bWVudCh1cmwsIFwiX2dvZ3NFbWFpbFwiLCBlbWFpbCk7XG4gICAgcmV0dXJuIHVybDtcbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiBjb21tYW5kTWF0Y2hlc1RleHQoY29tbWFuZCwgZmlsdGVyVGV4dCkge1xuICAgIGlmIChmaWx0ZXJUZXh0KSB7XG4gICAgICByZXR1cm4gQ29yZS5tYXRjaEZpbHRlcklnbm9yZUNhc2UoYW5ndWxhci50b0pzb24oY29tbWFuZCksIGZpbHRlclRleHQpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gIH1cblxuICBleHBvcnQgZnVuY3Rpb24gaXNMb2dnZWRJbnRvR29ncygpIHtcbiAgICB2YXIgbG9jYWxTdG9yYWdlID0gS3ViZXJuZXRlcy5pbmplY3QoXCJsb2NhbFN0b3JhZ2VcIikgfHwge307XG4gICAgdmFyIGF1dGhIZWFkZXIgPSBsb2NhbFN0b3JhZ2VbXCJnb2dzQXV0aG9yaXphdGlvblwiXTtcbiAgICAvL3JldHVybiBhdXRoSGVhZGVyID8gbG9nZ2VkSW5Ub0dvZ3MgOiBmYWxzZTtcbiAgICByZXR1cm4gYXV0aEhlYWRlciA/IHRydWUgOiBmYWxzZTtcbi8qXG4gICAgdmFyIGNvbmZpZyA9IGNyZWF0ZUh0dHBDb25maWcoKTtcbiAgICByZXR1cm4gY29uZmlnLmhlYWRlcnMuQXV0aG9yaXphdGlvbiA/IHRydWUgOiBmYWxzZTtcbiovXG4gIH1cblxuICBleHBvcnQgZnVuY3Rpb24gcmVkaXJlY3RUb0dvZ3NMb2dpbklmUmVxdWlyZWQoJHNjb3BlLCAkbG9jYXRpb24pIHtcbiAgICBpZiAoIWlzTG9nZ2VkSW50b0dvZ3MoKSkge1xuICAgICAgdmFyIGRldkxpbmsgPSBEZXZlbG9wZXIucHJvamVjdExpbmsoJHNjb3BlLnByb2plY3RJZCk7XG4gICAgICB2YXIgbG9naW5QYWdlID0gVXJsSGVscGVycy5qb2luKGRldkxpbmssIFwiZm9yZ2UvcmVwb3NcIik7XG4gICAgICBsb2cuaW5mbyhcIk5vdCBsb2dnZWQgaW4gc28gcmVkaXJlY3RpbmcgdG8gXCIgKyBsb2dpblBhZ2UpO1xuICAgICAgJGxvY2F0aW9uLnBhdGgobG9naW5QYWdlKVxuICAgIH1cbiAgfVxufVxuIiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL2luY2x1ZGVzLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cImZvcmdlSGVscGVycy50c1wiLz5cblxubW9kdWxlIEZvcmdlIHtcblxuICBleHBvcnQgdmFyIF9tb2R1bGUgPSBhbmd1bGFyLm1vZHVsZShwbHVnaW5OYW1lLCBbJ2hhd3Rpby1jb3JlJywgJ2hhd3Rpby11aSddKTtcbiAgZXhwb3J0IHZhciBjb250cm9sbGVyID0gUGx1Z2luSGVscGVycy5jcmVhdGVDb250cm9sbGVyRnVuY3Rpb24oX21vZHVsZSwgcGx1Z2luTmFtZSk7XG4gIGV4cG9ydCB2YXIgcm91dGUgPSBQbHVnaW5IZWxwZXJzLmNyZWF0ZVJvdXRpbmdGdW5jdGlvbih0ZW1wbGF0ZVBhdGgpO1xuXG4gIF9tb2R1bGUuY29uZmlnKFsnJHJvdXRlUHJvdmlkZXInLCAoJHJvdXRlUHJvdmlkZXI6bmcucm91dGUuSVJvdXRlUHJvdmlkZXIpID0+IHtcblxuICAgIGNvbnNvbGUubG9nKFwiTGlzdGVuaW5nIG9uOiBcIiArIFVybEhlbHBlcnMuam9pbihjb250ZXh0LCAnL2NyZWF0ZVByb2plY3QnKSk7XG5cbiAgICAkcm91dGVQcm92aWRlci53aGVuKFVybEhlbHBlcnMuam9pbihjb250ZXh0LCAnL2NyZWF0ZVByb2plY3QnKSwgcm91dGUoJ2NyZWF0ZVByb2plY3QuaHRtbCcsIGZhbHNlKSlcbiAgICAgIC53aGVuKFVybEhlbHBlcnMuam9pbihjb250ZXh0LCAnL3JlcG9zLzpwYXRoKicpLCByb3V0ZSgncmVwby5odG1sJywgZmFsc2UpKVxuICAgICAgLndoZW4oVXJsSGVscGVycy5qb2luKGNvbnRleHQsICcvcmVwb3MnKSwgcm91dGUoJ3JlcG9zLmh0bWwnLCBmYWxzZSkpO1xuXG4gICAgYW5ndWxhci5mb3JFYWNoKFtjb250ZXh0LCAnL3dvcmtzcGFjZXMvOm5hbWVzcGFjZS9wcm9qZWN0cy86cHJvamVjdC9mb3JnZSddLCAocGF0aCkgPT4ge1xuICAgICAgJHJvdXRlUHJvdmlkZXJcbiAgICAgICAgLndoZW4oVXJsSGVscGVycy5qb2luKHBhdGgsICcvY29tbWFuZHMnKSwgcm91dGUoJ2NvbW1hbmRzLmh0bWwnLCBmYWxzZSkpXG4gICAgICAgIC53aGVuKFVybEhlbHBlcnMuam9pbihwYXRoLCAnL2NvbW1hbmRzLzpwYXRoKicpLCByb3V0ZSgnY29tbWFuZHMuaHRtbCcsIGZhbHNlKSlcbiAgICAgICAgLndoZW4oVXJsSGVscGVycy5qb2luKHBhdGgsICcvY29tbWFuZC86aWQnKSwgcm91dGUoJ2NvbW1hbmQuaHRtbCcsIGZhbHNlKSlcbiAgICAgICAgLndoZW4oVXJsSGVscGVycy5qb2luKHBhdGgsICcvY29tbWFuZC86aWQvOnBhdGgqJyksIHJvdXRlKCdjb21tYW5kLmh0bWwnLCBmYWxzZSkpO1xuICAgIH0pO1xuXG4gIH1dKTtcblxuICBfbW9kdWxlLmZhY3RvcnkoJ0ZvcmdlQXBpVVJMJywgWyckcScsICckcm9vdFNjb3BlJywgKCRxOm5nLklRU2VydmljZSwgJHJvb3RTY29wZTpuZy5JUm9vdFNjb3BlU2VydmljZSkgPT4ge1xuICAgIHJldHVybiBLdWJlcm5ldGVzLmt1YmVybmV0ZXNBcGlVcmwoKSArIFwiL3Byb3h5XCIgKyBLdWJlcm5ldGVzLmt1YmVybmV0ZXNOYW1lc3BhY2VQYXRoKCkgKyBcIi9zZXJ2aWNlcy9mYWJyaWM4LWZvcmdlL2FwaS9mb3JnZVwiO1xuICB9XSk7XG5cblxuICBfbW9kdWxlLmZhY3RvcnkoJ0ZvcmdlTW9kZWwnLCBbJyRxJywgJyRyb290U2NvcGUnLCAoJHE6bmcuSVFTZXJ2aWNlLCAkcm9vdFNjb3BlOm5nLklSb290U2NvcGVTZXJ2aWNlKSA9PiB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHJvb3RQcm9qZWN0OiB7fSxcbiAgICAgIHByb2plY3RzOiBbXVxuICAgIH1cbiAgfV0pO1xuXG4gIF9tb2R1bGUucnVuKFsndmlld1JlZ2lzdHJ5JywgJ0hhd3Rpb05hdicsICh2aWV3UmVnaXN0cnksIEhhd3Rpb05hdikgPT4ge1xuICAgIHZpZXdSZWdpc3RyeVsnZm9yZ2UnXSA9IHRlbXBsYXRlUGF0aCArICdsYXlvdXRGb3JnZS5odG1sJztcbiAgfV0pO1xuXG4gIGhhd3Rpb1BsdWdpbkxvYWRlci5hZGRNb2R1bGUocGx1Z2luTmFtZSk7XG59XG4iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vaW5jbHVkZXMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiZm9yZ2VIZWxwZXJzLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cImZvcmdlUGx1Z2luLnRzXCIvPlxuXG5tb2R1bGUgRm9yZ2Uge1xuXG4gIGV4cG9ydCB2YXIgQ29tbWFuZENvbnRyb2xsZXIgPSBjb250cm9sbGVyKFwiQ29tbWFuZENvbnRyb2xsZXJcIixcbiAgICBbXCIkc2NvcGVcIiwgXCIkdGVtcGxhdGVDYWNoZVwiLCBcIiRsb2NhdGlvblwiLCBcIiRyb3V0ZVBhcmFtc1wiLCBcIiRodHRwXCIsIFwiJHRpbWVvdXRcIiwgXCJGb3JnZUFwaVVSTFwiLCBcIkZvcmdlTW9kZWxcIixcbiAgICAgICgkc2NvcGUsICR0ZW1wbGF0ZUNhY2hlOm5nLklUZW1wbGF0ZUNhY2hlU2VydmljZSwgJGxvY2F0aW9uOm5nLklMb2NhdGlvblNlcnZpY2UsICRyb3V0ZVBhcmFtcywgJGh0dHAsICR0aW1lb3V0LCBGb3JnZUFwaVVSTCwgRm9yZ2VNb2RlbCkgPT4ge1xuXG4gICAgICAgICRzY29wZS5tb2RlbCA9IEZvcmdlTW9kZWw7XG5cbiAgICAgICAgJHNjb3BlLnJlc291cmNlUGF0aCA9ICRyb3V0ZVBhcmFtc1tcInBhdGhcIl0gfHwgJGxvY2F0aW9uLnNlYXJjaCgpW1wicGF0aFwiXSB8fCBcIlwiO1xuICAgICAgICAkc2NvcGUuaWQgPSAkcm91dGVQYXJhbXNbXCJpZFwiXTtcbiAgICAgICAgJHNjb3BlLnBhdGggPSAkcm91dGVQYXJhbXNbXCJwYXRoXCJdO1xuXG4gICAgICAgICRzY29wZS5hdmF0YXJfdXJsID0gbG9jYWxTdG9yYWdlW1wiZ29nc0F2YXRhclVybFwiXTtcbiAgICAgICAgJHNjb3BlLnVzZXIgPSBsb2NhbFN0b3JhZ2VbXCJnb2dzVXNlclwiXTtcbiAgICAgICAgJHNjb3BlLnJlcG9OYW1lID0gXCJcIjtcbiAgICAgICAgdmFyIHBhdGhTdGVwcyA9ICRzY29wZS5yZXNvdXJjZVBhdGguc3BsaXQoXCIvXCIpO1xuICAgICAgICBpZiAocGF0aFN0ZXBzICYmIHBhdGhTdGVwcy5sZW5ndGgpIHtcbiAgICAgICAgICAkc2NvcGUucmVwb05hbWUgPSBwYXRoU3RlcHNbcGF0aFN0ZXBzLmxlbmd0aCAtIDFdO1xuICAgICAgICB9XG5cblxuICAgICAgICBpbml0U2NvcGUoJHNjb3BlLCAkbG9jYXRpb24sICRyb3V0ZVBhcmFtcyk7XG4gICAgICAgIHJlZGlyZWN0VG9Hb2dzTG9naW5JZlJlcXVpcmVkKCRzY29wZSwgJGxvY2F0aW9uKTtcblxuICAgICAgICAkc2NvcGUuJGNvbXBsZXRlTGluayA9ICRzY29wZS4kcHJvamVjdExpbms7XG4gICAgICAgIGlmICgkc2NvcGUucHJvamVjdElkKSB7XG5cbiAgICAgICAgfVxuICAgICAgICAkc2NvcGUuY29tbWFuZHNMaW5rID0gY29tbWFuZHNMaW5rKCRzY29wZS5yZXNvdXJjZVBhdGgsICRzY29wZS5wcm9qZWN0SWQpO1xuICAgICAgICAkc2NvcGUuY29tcGxldGVkTGluayA9ICRzY29wZS5wcm9qZWN0SWQgPyBVcmxIZWxwZXJzLmpvaW4oJHNjb3BlLiRwcm9qZWN0TGluaywgXCJlbnZpcm9ubWVudHNcIikgOiAkc2NvcGUuJHByb2plY3RMaW5rO1xuXG4gICAgICAgICRzY29wZS5lbnRpdHkgPSB7XG4gICAgICAgIH07XG4gICAgICAgICRzY29wZS5pbnB1dExpc3QgPSBbJHNjb3BlLmVudGl0eV07XG5cbiAgICAgICAgJHNjb3BlLnNjaGVtYSA9IGdldE1vZGVsQ29tbWFuZElucHV0cyhGb3JnZU1vZGVsLCAkc2NvcGUucmVzb3VyY2VQYXRoLCAkc2NvcGUuaWQpO1xuICAgICAgICBvblNjaGVtYUxvYWQoKTtcblxuICAgICAgICBmdW5jdGlvbiBvblJvdXRlQ2hhbmdlZCgpIHtcbiAgICAgICAgICBjb25zb2xlLmxvZyhcInJvdXRlIHVwZGF0ZWQ7IGxldHMgY2xlYXIgdGhlIGVudGl0eVwiKTtcbiAgICAgICAgICAkc2NvcGUuZW50aXR5ID0ge1xuICAgICAgICAgIH07XG4gICAgICAgICAgJHNjb3BlLmlucHV0TGlzdCA9IFskc2NvcGUuZW50aXR5XTtcbiAgICAgICAgICAkc2NvcGUucHJldmlvdXNTY2hlbWFKc29uID0gXCJcIjtcbiAgICAgICAgICAkc2NvcGUuc2NoZW1hID0gbnVsbDtcbiAgICAgICAgICBDb3JlLiRhcHBseSgkc2NvcGUpO1xuICAgICAgICAgIHVwZGF0ZURhdGEoKTtcbiAgICAgICAgfVxuXG4gICAgICAgICRzY29wZS4kb24oJyRyb3V0ZUNoYW5nZVN1Y2Nlc3MnLCBvblJvdXRlQ2hhbmdlZCk7XG5cbiAgICAgICAgJHNjb3BlLmV4ZWN1dGUgPSAoKSA9PiB7XG4gICAgICAgICAgLy8gVE9ETyBjaGVjayBpZiB2YWxpZC4uLlxuICAgICAgICAgICRzY29wZS5yZXNwb25zZSA9IG51bGw7XG4gICAgICAgICAgJHNjb3BlLmV4ZWN1dGluZyA9IHRydWU7XG4gICAgICAgICAgJHNjb3BlLmludmFsaWQgPSBmYWxzZTtcbiAgICAgICAgICAkc2NvcGUudmFsaWRhdGlvbkVycm9yID0gbnVsbDtcbiAgICAgICAgICB2YXIgY29tbWFuZElkID0gJHNjb3BlLmlkO1xuICAgICAgICAgIHZhciByZXNvdXJjZVBhdGggPSAkc2NvcGUucmVzb3VyY2VQYXRoO1xuICAgICAgICAgIHZhciB1cmwgPSBleGVjdXRlQ29tbWFuZEFwaVVybChGb3JnZUFwaVVSTCwgY29tbWFuZElkKTtcbiAgICAgICAgICB2YXIgcmVxdWVzdCA9IHtcbiAgICAgICAgICAgIHJlc291cmNlOiByZXNvdXJjZVBhdGgsXG4gICAgICAgICAgICBpbnB1dExpc3Q6ICRzY29wZS5pbnB1dExpc3RcbiAgICAgICAgICB9O1xuICAgICAgICAgIHVybCA9IGNyZWF0ZUh0dHBVcmwodXJsKTtcbiAgICAgICAgICBsb2cuaW5mbyhcIkFib3V0IHRvIHBvc3QgdG8gXCIgKyB1cmwgKyBcIiBwYXlsb2FkOiBcIiArIGFuZ3VsYXIudG9Kc29uKHJlcXVlc3QpKTtcbiAgICAgICAgICAkaHR0cC5wb3N0KHVybCwgcmVxdWVzdCwgY3JlYXRlSHR0cENvbmZpZygpKS5cbiAgICAgICAgICAgIHN1Y2Nlc3MoZnVuY3Rpb24gKGRhdGEsIHN0YXR1cywgaGVhZGVycywgY29uZmlnKSB7XG4gICAgICAgICAgICAgICRzY29wZS5leGVjdXRpbmcgPSBmYWxzZTtcbiAgICAgICAgICAgICAgJHNjb3BlLmludmFsaWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgJHNjb3BlLnZhbGlkYXRpb25FcnJvciA9IG51bGw7XG4gICAgICAgICAgICAgIGlmIChkYXRhKSB7XG4gICAgICAgICAgICAgICAgZGF0YS5tZXNzYWdlID0gZGF0YS5tZXNzYWdlIHx8IGRhdGEub3V0cHV0O1xuICAgICAgICAgICAgICAgIHZhciB3aXphcmRSZXN1bHRzID0gZGF0YS53aXphcmRSZXN1bHRzO1xuICAgICAgICAgICAgICAgIGlmICh3aXphcmRSZXN1bHRzKSB7XG4gICAgICAgICAgICAgICAgICBhbmd1bGFyLmZvckVhY2god2l6YXJkUmVzdWx0cy5zdGVwVmFsaWRhdGlvbnMsICh2YWxpZGF0aW9uKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghJHNjb3BlLmludmFsaWQgJiYgIXZhbGlkYXRpb24udmFsaWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICB2YXIgbWVzc2FnZXMgPSB2YWxpZGF0aW9uLm1lc3NhZ2VzIHx8IFtdO1xuICAgICAgICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlcy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBtZXNzYWdlID0gbWVzc2FnZXNbMF07XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobWVzc2FnZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuaW52YWxpZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS52YWxpZGF0aW9uRXJyb3IgPSBtZXNzYWdlLmRlc2NyaXB0aW9uO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUudmFsaWRhdGlvbklucHV0ID0gbWVzc2FnZS5pbnB1dE5hbWU7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgIHZhciBzdGVwSW5wdXRzID0gd2l6YXJkUmVzdWx0cy5zdGVwSW5wdXRzO1xuICAgICAgICAgICAgICAgICAgaWYgKHN0ZXBJbnB1dHMpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHNjaGVtYSA9IF8ubGFzdChzdGVwSW5wdXRzKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHNjaGVtYSkge1xuICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5lbnRpdHkgPSB7fTtcbiAgICAgICAgICAgICAgICAgICAgICB1cGRhdGVTY2hlbWEoc2NoZW1hKTtcbiAgICAgICAgICAgICAgICAgICAgICAvLyBsZXRzIGNvcHkgYWNyb3NzIGFueSBkZWZhdWx0IHZhbHVlcyBmcm9tIHRoZSBzY2hlbWFcbiAgICAgICAgICAgICAgICAgICAgICBhbmd1bGFyLmZvckVhY2goc2NoZW1hW1wicHJvcGVydGllc1wiXSwgKHByb3BlcnR5LCBuYW1lKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgdmFsdWUgPSBwcm9wZXJ0eS52YWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh2YWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICBsb2cuaW5mbyhcIkFkZGluZyBlbnRpdHkuXCIgKyBuYW1lICsgXCIgPSBcIiArIHZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmVudGl0eVtuYW1lXSA9IHZhbHVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5pbnB1dExpc3QucHVzaCgkc2NvcGUuZW50aXR5KTtcblxuICAgICAgICAgICAgICAgICAgICAgIGlmIChkYXRhLmNhbk1vdmVUb05leHRTdGVwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBsZXRzIGNsZWFyIHRoZSByZXNwb25zZSB3ZSd2ZSBhbm90aGVyIHdpemFyZCBwYWdlIHRvIGRvXG4gICAgICAgICAgICAgICAgICAgICAgICBkYXRhID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gb3RoZXJ3aXNlIGluZGljYXRlIHRoYXQgdGhlIHdpemFyZCBqdXN0IGNvbXBsZXRlZCBhbmQgbGV0cyBoaWRlIHRoZSBpbnB1dCBmb3JtXG4gICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUud2l6YXJkQ29tcGxldGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgaWYgKCEkc2NvcGUuaW52YWxpZCkge1xuICAgICAgICAgICAgICAgICRzY29wZS5yZXNwb25zZSA9IGRhdGE7XG4gICAgICAgICAgICAgICAgdmFyIHN0YXR1cyA9ICgoZGF0YSB8fCB7fSkuc3RhdHVzIHx8IFwiXCIpLnRvU3RyaW5nKCkudG9Mb3dlckNhc2UoKTtcbiAgICAgICAgICAgICAgICAkc2NvcGUucmVzcG9uc2VDbGFzcyA9IHRvQmFja2dyb3VuZFN0eWxlKHN0YXR1cyk7XG5cbiAgICAgICAgICAgICAgICB2YXIgZnVsbE5hbWUgPSAoKGRhdGEgfHwge30pLm91dHB1dFByb3BlcnRpZXMgfHwge30pLmZ1bGxOYW1lO1xuICAgICAgICAgICAgICAgIGlmICgkc2NvcGUucmVzcG9uc2UgJiYgZnVsbE5hbWUgJiYgJHNjb3BlLmlkID09PSAncHJvamVjdC1uZXcnKSB7XG4gICAgICAgICAgICAgICAgICAkc2NvcGUucmVzcG9uc2UgPSBudWxsO1xuICAgICAgICAgICAgICAgICAgLy8gbGV0cyBmb3J3YXJkIHRvIHRoZSBkZXZvcHMgZWRpdCBwYWdlXG4gICAgICAgICAgICAgICAgICB2YXIgcHJvamVjdElkID0gZnVsbE5hbWUucmVwbGFjZSgnLycsIFwiLVwiKTtcbiAgICAgICAgICAgICAgICAgIHZhciBlZGl0UGF0aCA9IFVybEhlbHBlcnMuam9pbihEZXZlbG9wZXIucHJvamVjdExpbmsocHJvamVjdElkKSwgXCIvZm9yZ2UvY29tbWFuZC9kZXZvcHMtZWRpdC91c2VyXCIsIGZ1bGxOYW1lKTtcbiAgICAgICAgICAgICAgICAgIGxvZy5pbmZvKFwiTW92aW5nIHRvIHRoZSBkZXZvcHMgZWRpdCBwYXRoOiBcIiArIGVkaXRQYXRoKTtcbiAgICAgICAgICAgICAgICAgICRsb2NhdGlvbi5wYXRoKGVkaXRQYXRoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICAgICAgICAgIH0pLlxuICAgICAgICAgICAgZXJyb3IoZnVuY3Rpb24gKGRhdGEsIHN0YXR1cywgaGVhZGVycywgY29uZmlnKSB7XG4gICAgICAgICAgICAgICRzY29wZS5leGVjdXRpbmcgPSBmYWxzZTtcbiAgICAgICAgICAgICAgbG9nLndhcm4oXCJGYWlsZWQgdG8gbG9hZCBcIiArIHVybCArIFwiIFwiICsgZGF0YSArIFwiIFwiICsgc3RhdHVzKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgICAgICRzY29wZS4kd2F0Y2hDb2xsZWN0aW9uKFwiZW50aXR5XCIsICgpID0+IHtcbiAgICAgICAgICB2YWxpZGF0ZSgpO1xuICAgICAgICB9KTtcblxuICAgICAgICBmdW5jdGlvbiB1cGRhdGVTY2hlbWEoc2NoZW1hKSB7XG4gICAgICAgICAgaWYgKHNjaGVtYSkge1xuICAgICAgICAgICAgLy8gbGV0cyByZW1vdmUgdGhlIHZhbHVlcyBzbyB0aGF0IHdlIGNhbiBwcm9wZXJseSBjaGVjayB3aGVuIHRoZSBzY2hlbWEgcmVhbGx5IGRvZXMgY2hhbmdlXG4gICAgICAgICAgICAvLyBvdGhlcndpc2UgdGhlIHNjaGVtYSB3aWxsIGNoYW5nZSBldmVyeSB0aW1lIHdlIHR5cGUgYSBjaGFyYWN0ZXIgOylcbiAgICAgICAgICAgIHZhciBzY2hlbWFXaXRob3V0VmFsdWVzID0gYW5ndWxhci5jb3B5KHNjaGVtYSk7XG4gICAgICAgICAgICBhbmd1bGFyLmZvckVhY2goc2NoZW1hV2l0aG91dFZhbHVlcy5wcm9wZXJ0aWVzLCAocHJvcGVydHkpID0+IHtcbiAgICAgICAgICAgICAgZGVsZXRlIHByb3BlcnR5W1widmFsdWVcIl07XG4gICAgICAgICAgICAgIGRlbGV0ZSBwcm9wZXJ0eVtcImVuYWJsZWRcIl07XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHZhciBqc29uID0gYW5ndWxhci50b0pzb24oc2NoZW1hV2l0aG91dFZhbHVlcyk7XG4gICAgICAgICAgICBpZiAoanNvbiAhPT0gJHNjb3BlLnByZXZpb3VzU2NoZW1hSnNvbikge1xuICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcInVwZGF0ZWQgc2NoZW1hOiBcIiArIGpzb24pO1xuICAgICAgICAgICAgICAkc2NvcGUucHJldmlvdXNTY2hlbWFKc29uID0ganNvbjtcbiAgICAgICAgICAgICAgJHNjb3BlLnNjaGVtYSA9IHNjaGVtYTtcblxuICAgICAgICAgICAgICBpZiAoJHNjb3BlLmlkID09PSBcInByb2plY3QtbmV3XCIpIHtcbiAgICAgICAgICAgICAgICB2YXIgZW50aXR5ID0gJHNjb3BlLmVudGl0eTtcbiAgICAgICAgICAgICAgICAvLyBsZXRzIGhpZGUgdGhlIHRhcmdldCBsb2NhdGlvbiFcbiAgICAgICAgICAgICAgICB2YXIgcHJvcGVydGllcyA9IHNjaGVtYS5wcm9wZXJ0aWVzIHx8IHt9O1xuICAgICAgICAgICAgICAgIHZhciBvdmVyd3JpdGUgPSBwcm9wZXJ0aWVzLm92ZXJ3cml0ZTtcbiAgICAgICAgICAgICAgICB2YXIgY2F0YWxvZyA9IHByb3BlcnRpZXMuY2F0YWxvZztcbiAgICAgICAgICAgICAgICB2YXIgdGFyZ2V0TG9jYXRpb24gPSBwcm9wZXJ0aWVzLnRhcmdldExvY2F0aW9uO1xuICAgICAgICAgICAgICAgIGlmICh0YXJnZXRMb2NhdGlvbikge1xuICAgICAgICAgICAgICAgICAgdGFyZ2V0TG9jYXRpb24uaGlkZGVuID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgIGlmIChvdmVyd3JpdGUpIHtcbiAgICAgICAgICAgICAgICAgICAgb3ZlcndyaXRlLmhpZGRlbiA9IHRydWU7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcImhpZGluZyB0YXJnZXRMb2NhdGlvbiFcIik7XG5cbiAgICAgICAgICAgICAgICAgIC8vIGxldHMgZGVmYXVsdCB0aGUgdHlwZVxuICAgICAgICAgICAgICAgICAgaWYgKCFlbnRpdHkudHlwZSkge1xuICAgICAgICAgICAgICAgICAgICBlbnRpdHkudHlwZSA9IFwiRnJvbSBBcmNoZXR5cGUgQ2F0YWxvZ1wiO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoY2F0YWxvZykge1xuICAgICAgICAgICAgICAgICAgaWYgKCFlbnRpdHkuY2F0YWxvZykge1xuICAgICAgICAgICAgICAgICAgICBlbnRpdHkuY2F0YWxvZyA9IFwiZmFicmljOFwiO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIHZhbGlkYXRlKCkge1xuICAgICAgICAgIGlmICgkc2NvcGUuZXhlY3V0aW5nIHx8ICRzY29wZS52YWxpZGF0aW5nKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICAgIHZhciBuZXdKc29uID0gYW5ndWxhci50b0pzb24oJHNjb3BlLmVudGl0eSk7XG4gICAgICAgICAgaWYgKG5ld0pzb24gPT09ICRzY29wZS52YWxpZGF0ZWRFbnRpdHlKc29uKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICRzY29wZS52YWxpZGF0ZWRFbnRpdHlKc29uID0gbmV3SnNvbjtcbiAgICAgICAgICB9XG4gICAgICAgICAgdmFyIGNvbW1hbmRJZCA9ICRzY29wZS5pZDtcbiAgICAgICAgICB2YXIgcmVzb3VyY2VQYXRoID0gJHNjb3BlLnJlc291cmNlUGF0aDtcbiAgICAgICAgICB2YXIgdXJsID0gdmFsaWRhdGVDb21tYW5kQXBpVXJsKEZvcmdlQXBpVVJMLCBjb21tYW5kSWQpO1xuICAgICAgICAgIC8vIGxldHMgcHV0IHRoZSBlbnRpdHkgaW4gdGhlIGxhc3QgaXRlbSBpbiB0aGUgbGlzdFxuICAgICAgICAgIHZhciBpbnB1dExpc3QgPSBbXS5jb25jYXQoJHNjb3BlLmlucHV0TGlzdCk7XG4gICAgICAgICAgaW5wdXRMaXN0W2lucHV0TGlzdC5sZW5ndGggLSAxXSA9ICRzY29wZS5lbnRpdHk7XG4gICAgICAgICAgdmFyIHJlcXVlc3QgPSB7XG4gICAgICAgICAgICByZXNvdXJjZTogcmVzb3VyY2VQYXRoLFxuICAgICAgICAgICAgaW5wdXRMaXN0OiAkc2NvcGUuaW5wdXRMaXN0XG4gICAgICAgICAgfTtcbiAgICAgICAgICB1cmwgPSBjcmVhdGVIdHRwVXJsKHVybCk7XG4gICAgICAgICAgLy9sb2cuaW5mbyhcIkFib3V0IHRvIHBvc3QgdG8gXCIgKyB1cmwgKyBcIiBwYXlsb2FkOiBcIiArIGFuZ3VsYXIudG9Kc29uKHJlcXVlc3QpKTtcbiAgICAgICAgICAkc2NvcGUudmFsaWRhdGluZyA9IHRydWU7XG4gICAgICAgICAgJGh0dHAucG9zdCh1cmwsIHJlcXVlc3QsIGNyZWF0ZUh0dHBDb25maWcoKSkuXG4gICAgICAgICAgICBzdWNjZXNzKGZ1bmN0aW9uIChkYXRhLCBzdGF0dXMsIGhlYWRlcnMsIGNvbmZpZykge1xuICAgICAgICAgICAgICB0aGlzLnZhbGlkYXRpb24gPSBkYXRhO1xuICAgICAgICAgICAgICAvL2NvbnNvbGUubG9nKFwiZ290IHZhbGlkYXRpb24gXCIgKyBhbmd1bGFyLnRvSnNvbihkYXRhLCB0cnVlKSk7XG4gICAgICAgICAgICAgIHZhciB3aXphcmRSZXN1bHRzID0gZGF0YS53aXphcmRSZXN1bHRzO1xuICAgICAgICAgICAgICBpZiAod2l6YXJkUmVzdWx0cykge1xuICAgICAgICAgICAgICAgIHZhciBzdGVwSW5wdXRzID0gd2l6YXJkUmVzdWx0cy5zdGVwSW5wdXRzO1xuICAgICAgICAgICAgICAgIGlmIChzdGVwSW5wdXRzKSB7XG4gICAgICAgICAgICAgICAgICB2YXIgc2NoZW1hID0gXy5sYXN0KHN0ZXBJbnB1dHMpO1xuICAgICAgICAgICAgICAgICAgdXBkYXRlU2NoZW1hKHNjaGVtYSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIENvcmUuJGFwcGx5KCRzY29wZSk7XG5cbiAgICAgICAgICAgICAgLypcbiAgICAgICAgICAgICAgICogTGV0cyB0aHJvdHRsZSB0aGUgdmFsaWRhdGlvbnMgc28gdGhhdCB3ZSBvbmx5IGZpcmUgYW5vdGhlciB2YWxpZGF0aW9uIGEgbGl0dGxlXG4gICAgICAgICAgICAgICAqIGFmdGVyIHdlJ3ZlIGdvdCBhIHJlcGx5IGFuZCBvbmx5IGlmIHRoZSBtb2RlbCBoYXMgY2hhbmdlZCBzaW5jZSB0aGVuXG4gICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAkdGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgJHNjb3BlLnZhbGlkYXRpbmcgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB2YWxpZGF0ZSgpO1xuICAgICAgICAgICAgICB9LCAyMDApO1xuICAgICAgICAgICAgfSkuXG4gICAgICAgICAgICBlcnJvcihmdW5jdGlvbiAoZGF0YSwgc3RhdHVzLCBoZWFkZXJzLCBjb25maWcpIHtcbiAgICAgICAgICAgICAgJHNjb3BlLmV4ZWN1dGluZyA9IGZhbHNlO1xuICAgICAgICAgICAgICBsb2cud2FybihcIkZhaWxlZCB0byBsb2FkIFwiICsgdXJsICsgXCIgXCIgKyBkYXRhICsgXCIgXCIgKyBzdGF0dXMpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICB1cGRhdGVEYXRhKCk7XG5cbiAgICAgICAgZnVuY3Rpb24gdG9CYWNrZ3JvdW5kU3R5bGUoc3RhdHVzKSB7XG4gICAgICAgICAgaWYgKCFzdGF0dXMpIHtcbiAgICAgICAgICAgIHN0YXR1cyA9IFwiXCI7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChzdGF0dXMuc3RhcnRzV2l0aChcInN1Y1wiKSkge1xuICAgICAgICAgICAgcmV0dXJuIFwiYmctc3VjY2Vzc1wiO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gXCJiZy13YXJuaW5nXCJcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIHVwZGF0ZURhdGEoKSB7XG4gICAgICAgICAgJHNjb3BlLml0ZW0gPSBudWxsO1xuICAgICAgICAgIHZhciBjb21tYW5kSWQgPSAkc2NvcGUuaWQ7XG4gICAgICAgICAgaWYgKGNvbW1hbmRJZCkge1xuICAgICAgICAgICAgdmFyIHJlc291cmNlUGF0aCA9ICRzY29wZS5yZXNvdXJjZVBhdGg7XG4gICAgICAgICAgICB2YXIgdXJsID0gY29tbWFuZElucHV0QXBpVXJsKEZvcmdlQXBpVVJMLCBjb21tYW5kSWQsIHJlc291cmNlUGF0aCk7XG4gICAgICAgICAgICB1cmwgPSBjcmVhdGVIdHRwVXJsKHVybCk7XG4gICAgICAgICAgICAkaHR0cC5nZXQodXJsLCBjcmVhdGVIdHRwQ29uZmlnKCkpLlxuICAgICAgICAgICAgICBzdWNjZXNzKGZ1bmN0aW9uIChkYXRhLCBzdGF0dXMsIGhlYWRlcnMsIGNvbmZpZykge1xuICAgICAgICAgICAgICAgIGlmIChkYXRhKSB7XG4gICAgICAgICAgICAgICAgICAkc2NvcGUuZmV0Y2hlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcInVwZGF0ZURhdGEgbG9hZGVkIHNjaGVtYVwiKTtcbiAgICAgICAgICAgICAgICAgIHVwZGF0ZVNjaGVtYShkYXRhKTtcbiAgICAgICAgICAgICAgICAgIHNldE1vZGVsQ29tbWFuZElucHV0cyhGb3JnZU1vZGVsLCAkc2NvcGUucmVzb3VyY2VQYXRoLCAkc2NvcGUuaWQsICRzY29wZS5zY2hlbWEpO1xuICAgICAgICAgICAgICAgICAgb25TY2hlbWFMb2FkKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIENvcmUuJGFwcGx5KCRzY29wZSk7XG4gICAgICAgICAgICAgIH0pLlxuICAgICAgICAgICAgICBlcnJvcihmdW5jdGlvbiAoZGF0YSwgc3RhdHVzLCBoZWFkZXJzLCBjb25maWcpIHtcbiAgICAgICAgICAgICAgICBsb2cud2FybihcIkZhaWxlZCB0byBsb2FkIFwiICsgdXJsICsgXCIgXCIgKyBkYXRhICsgXCIgXCIgKyBzdGF0dXMpO1xuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBvblNjaGVtYUxvYWQoKSB7XG4gICAgICAgICAgLy8gbGV0cyB1cGRhdGUgdGhlIHZhbHVlIGlmIGl0cyBibGFuayB3aXRoIHRoZSBkZWZhdWx0IHZhbHVlcyBmcm9tIHRoZSBwcm9wZXJ0aWVzXG4gICAgICAgICAgdmFyIHNjaGVtYSA9ICRzY29wZS5zY2hlbWE7XG4gICAgICAgICAgJHNjb3BlLmZldGNoZWQgPSBzY2hlbWE7XG4gICAgICAgICAgdmFyIGVudGl0eSA9ICRzY29wZS5lbnRpdHk7XG4gICAgICAgICAgaWYgKHNjaGVtYSkge1xuICAgICAgICAgICAgYW5ndWxhci5mb3JFYWNoKHNjaGVtYS5wcm9wZXJ0aWVzLCAocHJvcGVydHksIGtleSkgPT4ge1xuICAgICAgICAgICAgICB2YXIgdmFsdWUgPSBwcm9wZXJ0eS52YWx1ZTtcbiAgICAgICAgICAgICAgaWYgKHZhbHVlICYmICFlbnRpdHlba2V5XSkge1xuICAgICAgICAgICAgICAgIGVudGl0eVtrZXldID0gdmFsdWU7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfV0pO1xufVxuIiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL2luY2x1ZGVzLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cImZvcmdlUGx1Z2luLnRzXCIvPlxuXG5tb2R1bGUgRm9yZ2Uge1xuXG4gIGV4cG9ydCB2YXIgQ29tbWFuZHNDb250cm9sbGVyID0gY29udHJvbGxlcihcIkNvbW1hbmRzQ29udHJvbGxlclwiLCBbXCIkc2NvcGVcIiwgXCIkZGlhbG9nXCIsIFwiJHdpbmRvd1wiLCBcIiR0ZW1wbGF0ZUNhY2hlXCIsIFwiJHJvdXRlUGFyYW1zXCIsIFwiJGxvY2F0aW9uXCIsIFwibG9jYWxTdG9yYWdlXCIsIFwiJGh0dHBcIiwgXCIkdGltZW91dFwiLCBcIkZvcmdlQXBpVVJMXCIsIFwiRm9yZ2VNb2RlbFwiLFxuICAgICgkc2NvcGUsICRkaWFsb2csICR3aW5kb3csICR0ZW1wbGF0ZUNhY2hlLCAkcm91dGVQYXJhbXMsICRsb2NhdGlvbjpuZy5JTG9jYXRpb25TZXJ2aWNlLCBsb2NhbFN0b3JhZ2UsICRodHRwLCAkdGltZW91dCwgRm9yZ2VBcGlVUkwsIEZvcmdlTW9kZWwpID0+IHtcblxuICAgICAgJHNjb3BlLm1vZGVsID0gRm9yZ2VNb2RlbDtcbiAgICAgICRzY29wZS5yZXNvdXJjZVBhdGggPSAkcm91dGVQYXJhbXNbXCJwYXRoXCJdIHx8ICRsb2NhdGlvbi5zZWFyY2goKVtcInBhdGhcIl0gfHwgXCJcIjtcbiAgICAgICRzY29wZS5yZXBvTmFtZSA9IFwiXCI7XG4gICAgICAkc2NvcGUucHJvamVjdERlc2NyaXB0aW9uID0gJHNjb3BlLnJlc291cmNlUGF0aCB8fCBcIlwiO1xuICAgICAgdmFyIHBhdGhTdGVwcyA9ICRzY29wZS5wcm9qZWN0RGVzY3JpcHRpb24uc3BsaXQoXCIvXCIpO1xuICAgICAgaWYgKHBhdGhTdGVwcyAmJiBwYXRoU3RlcHMubGVuZ3RoKSB7XG4gICAgICAgICRzY29wZS5yZXBvTmFtZSA9IHBhdGhTdGVwc1twYXRoU3RlcHMubGVuZ3RoIC0gMV07XG4gICAgICB9XG4gICAgICBpZiAoISRzY29wZS5wcm9qZWN0RGVzY3JpcHRpb24uc3RhcnRzV2l0aChcIi9cIikgJiYgJHNjb3BlLnByb2plY3REZXNjcmlwdGlvbi5sZW5ndGggPiAwKSB7XG4gICAgICAgICRzY29wZS5wcm9qZWN0RGVzY3JpcHRpb24gPSBcIi9cIiArICRzY29wZS5wcm9qZWN0RGVzY3JpcHRpb247XG4gICAgICB9XG5cbiAgICAgICRzY29wZS5hdmF0YXJfdXJsID0gbG9jYWxTdG9yYWdlW1wiZ29nc0F2YXRhclVybFwiXTtcbiAgICAgICRzY29wZS51c2VyID0gbG9jYWxTdG9yYWdlW1wiZ29nc1VzZXJcIl07XG5cbiAgICAgICRzY29wZS5jb21tYW5kcyA9IGdldE1vZGVsQ29tbWFuZHMoRm9yZ2VNb2RlbCwgJHNjb3BlLnJlc291cmNlUGF0aCk7XG4gICAgICAkc2NvcGUuZmV0Y2hlZCA9ICRzY29wZS5jb21tYW5kcy5sZW5ndGggIT09IDA7XG5cbiAgICAgIGluaXRTY29wZSgkc2NvcGUsICRsb2NhdGlvbiwgJHJvdXRlUGFyYW1zKTtcbiAgICAgIHJlZGlyZWN0VG9Hb2dzTG9naW5JZlJlcXVpcmVkKCRzY29wZSwgJGxvY2F0aW9uKTtcblxuXG4gICAgICAkc2NvcGUudGFibGVDb25maWcgPSB7XG4gICAgICAgIGRhdGE6ICdjb21tYW5kcycsXG4gICAgICAgIHNob3dTZWxlY3Rpb25DaGVja2JveDogdHJ1ZSxcbiAgICAgICAgZW5hYmxlUm93Q2xpY2tTZWxlY3Rpb246IGZhbHNlLFxuICAgICAgICBtdWx0aVNlbGVjdDogdHJ1ZSxcbiAgICAgICAgc2VsZWN0ZWRJdGVtczogW10sXG4gICAgICAgIGZpbHRlck9wdGlvbnM6IHtcbiAgICAgICAgICBmaWx0ZXJUZXh0OiAkbG9jYXRpb24uc2VhcmNoKClbXCJxXCJdIHx8ICcnXG4gICAgICAgIH0sXG4gICAgICAgIGNvbHVtbkRlZnM6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICBmaWVsZDogJ25hbWUnLFxuICAgICAgICAgICAgZGlzcGxheU5hbWU6ICdOYW1lJyxcbiAgICAgICAgICAgIGNlbGxUZW1wbGF0ZTogJHRlbXBsYXRlQ2FjaGUuZ2V0KFwiaWRUZW1wbGF0ZS5odG1sXCIpXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICBmaWVsZDogJ2Rlc2NyaXB0aW9uJyxcbiAgICAgICAgICAgIGRpc3BsYXlOYW1lOiAnRGVzY3JpcHRpb24nXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICBmaWVsZDogJ2NhdGVnb3J5JyxcbiAgICAgICAgICAgIGRpc3BsYXlOYW1lOiAnQ2F0ZWdvcnknXG4gICAgICAgICAgfVxuICAgICAgICBdXG4gICAgICB9O1xuXG4gICAgICBmdW5jdGlvbiBjb21tYW5kTWF0Y2hlcyhjb21tYW5kKSB7XG4gICAgICAgIHZhciBmaWx0ZXJUZXh0ID0gJHNjb3BlLnRhYmxlQ29uZmlnLmZpbHRlck9wdGlvbnMuZmlsdGVyVGV4dDtcbiAgICAgICAgcmV0dXJuIGNvbW1hbmRNYXRjaGVzVGV4dChjb21tYW5kLCBmaWx0ZXJUZXh0KTtcbiAgICAgIH1cblxuICAgICAgJHNjb3BlLmNvbW1hbmRTZWxlY3RvciA9IHtcbiAgICAgICAgZmlsdGVyVGV4dDogXCJcIixcbiAgICAgICAgZm9sZGVyczogW10sXG4gICAgICAgIHNlbGVjdGVkQ29tbWFuZHM6IFtdLFxuICAgICAgICBleHBhbmRlZEZvbGRlcnM6IHt9LFxuXG4gICAgICAgIGlzT3BlbjogKGZvbGRlcikgPT4ge1xuICAgICAgICAgIHZhciBmaWx0ZXJUZXh0ID0gJHNjb3BlLnRhYmxlQ29uZmlnLmZpbHRlck9wdGlvbnMuZmlsdGVyVGV4dDtcbiAgICAgICAgICBpZiAoZmlsdGVyVGV4dCAhPT0gJycgfHwgJHNjb3BlLmNvbW1hbmRTZWxlY3Rvci5leHBhbmRlZEZvbGRlcnNbZm9sZGVyLmlkXSkge1xuICAgICAgICAgICAgcmV0dXJuIFwib3BlbmVkXCI7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiBcImNsb3NlZFwiO1xuICAgICAgICB9LFxuXG4gICAgICAgIGNsZWFyU2VsZWN0ZWQ6ICgpID0+IHtcbiAgICAgICAgICAkc2NvcGUuY29tbWFuZFNlbGVjdG9yLmV4cGFuZGVkRm9sZGVycyA9IHt9O1xuICAgICAgICAgIENvcmUuJGFwcGx5KCRzY29wZSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgdXBkYXRlU2VsZWN0ZWQ6ICgpID0+IHtcbiAgICAgICAgICAvLyBsZXRzIHVwZGF0ZSB0aGUgc2VsZWN0ZWQgYXBwc1xuICAgICAgICAgIHZhciBzZWxlY3RlZENvbW1hbmRzID0gW107XG4gICAgICAgICAgYW5ndWxhci5mb3JFYWNoKCRzY29wZS5tb2RlbC5hcHBGb2xkZXJzLCAoZm9sZGVyKSA9PiB7XG4gICAgICAgICAgICB2YXIgYXBwcyA9IGZvbGRlci5hcHBzLmZpbHRlcigoYXBwKSA9PiBhcHAuc2VsZWN0ZWQpO1xuICAgICAgICAgICAgaWYgKGFwcHMpIHtcbiAgICAgICAgICAgICAgc2VsZWN0ZWRDb21tYW5kcyA9IHNlbGVjdGVkQ29tbWFuZHMuY29uY2F0KGFwcHMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICAgICRzY29wZS5jb21tYW5kU2VsZWN0b3Iuc2VsZWN0ZWRDb21tYW5kcyA9IHNlbGVjdGVkQ29tbWFuZHMuc29ydEJ5KFwibmFtZVwiKTtcbiAgICAgICAgfSxcblxuICAgICAgICBzZWxlY3Q6IChjb21tYW5kLCBmbGFnKSA9PiB7XG4gICAgICAgICAgdmFyIGlkID0gY29tbWFuZC5uYW1lO1xuLypcbiAgICAgICAgICBhcHAuc2VsZWN0ZWQgPSBmbGFnO1xuKi9cbiAgICAgICAgICAkc2NvcGUuY29tbWFuZFNlbGVjdG9yLnVwZGF0ZVNlbGVjdGVkKCk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgZ2V0U2VsZWN0ZWRDbGFzczogKGFwcCkgPT4ge1xuICAgICAgICAgIGlmIChhcHAuYWJzdHJhY3QpIHtcbiAgICAgICAgICAgIHJldHVybiBcImFic3RyYWN0XCI7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChhcHAuc2VsZWN0ZWQpIHtcbiAgICAgICAgICAgIHJldHVybiBcInNlbGVjdGVkXCI7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiBcIlwiO1xuICAgICAgICB9LFxuXG4gICAgICAgIHNob3dDb21tYW5kOiAoY29tbWFuZCkgPT4ge1xuICAgICAgICAgIHJldHVybiBjb21tYW5kTWF0Y2hlcyhjb21tYW5kKTtcbiAgICAgICAgfSxcblxuICAgICAgICBzaG93Rm9sZGVyOiAoZm9sZGVyKSA9PiB7XG4gICAgICAgICAgdmFyIGZpbHRlclRleHQgPSAkc2NvcGUudGFibGVDb25maWcuZmlsdGVyT3B0aW9ucy5maWx0ZXJUZXh0O1xuICAgICAgICAgIHJldHVybiAhZmlsdGVyVGV4dCB8fCBmb2xkZXIuY29tbWFuZHMuc29tZSgoYXBwKSA9PiBjb21tYW5kTWF0Y2hlcyhhcHApKTtcbiAgICAgICAgfVxuICAgICAgfTtcblxuXG4gICAgICB2YXIgdXJsID0gVXJsSGVscGVycy5qb2luKEZvcmdlQXBpVVJMLCBcImNvbW1hbmRzXCIsICRzY29wZS5yZXNvdXJjZVBhdGgpO1xuICAgICAgdXJsID0gY3JlYXRlSHR0cFVybCh1cmwpO1xuICAgICAgbG9nLmluZm8oXCJGZXRjaGluZyBjb21tYW5kcyBmcm9tOiBcIiArIHVybCk7XG4gICAgICAkaHR0cC5nZXQodXJsLCBjcmVhdGVIdHRwQ29uZmlnKCkpLlxuICAgICAgICBzdWNjZXNzKGZ1bmN0aW9uIChkYXRhLCBzdGF0dXMsIGhlYWRlcnMsIGNvbmZpZykge1xuICAgICAgICAgIGlmIChhbmd1bGFyLmlzQXJyYXkoZGF0YSkgJiYgc3RhdHVzID09PSAyMDApIHtcbiAgICAgICAgICAgIHZhciByZXNvdXJjZVBhdGggPSAkc2NvcGUucmVzb3VyY2VQYXRoO1xuICAgICAgICAgICAgdmFyIGZvbGRlck1hcCA9IHt9O1xuICAgICAgICAgICAgdmFyIGZvbGRlcnMgPSBbXTtcbiAgICAgICAgICAgICRzY29wZS5jb21tYW5kcyA9IF8uc29ydEJ5KGRhdGEsIFwibmFtZVwiKTtcbiAgICAgICAgICAgIGFuZ3VsYXIuZm9yRWFjaCgkc2NvcGUuY29tbWFuZHMsIChjb21tYW5kKSA9PiB7XG4gICAgICAgICAgICAgIHZhciBpZCA9IGNvbW1hbmQuaWQgfHwgY29tbWFuZC5uYW1lO1xuICAgICAgICAgICAgICBjb21tYW5kLiRsaW5rID0gY29tbWFuZExpbmsoJHNjb3BlLnByb2plY3RJZCwgaWQsIHJlc291cmNlUGF0aCk7XG5cbiAgICAgICAgICAgICAgdmFyIG5hbWUgPSBjb21tYW5kLm5hbWUgfHwgY29tbWFuZC5pZDtcbiAgICAgICAgICAgICAgdmFyIGZvbGRlck5hbWUgPSBjb21tYW5kLmNhdGVnb3J5O1xuICAgICAgICAgICAgICB2YXIgc2hvcnROYW1lID0gbmFtZTtcbiAgICAgICAgICAgICAgdmFyIG5hbWVzID0gbmFtZS5zcGxpdChcIjpcIiwgMik7XG4gICAgICAgICAgICAgIGlmIChuYW1lcyAhPSBudWxsICYmIG5hbWVzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICAgICAgICBmb2xkZXJOYW1lID0gbmFtZXNbMF07XG4gICAgICAgICAgICAgICAgc2hvcnROYW1lID0gbmFtZXNbMV0udHJpbSgpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGlmIChmb2xkZXJOYW1lID09PSBcIlByb2plY3QvQnVpbGRcIikge1xuICAgICAgICAgICAgICAgIGZvbGRlck5hbWUgPSBcIlByb2plY3RcIjtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBjb21tYW5kLiRzaG9ydE5hbWUgPSBzaG9ydE5hbWU7XG4gICAgICAgICAgICAgIGNvbW1hbmQuJGZvbGRlck5hbWUgPSBmb2xkZXJOYW1lO1xuICAgICAgICAgICAgICB2YXIgZm9sZGVyID0gZm9sZGVyTWFwW2ZvbGRlck5hbWVdO1xuICAgICAgICAgICAgICBpZiAoIWZvbGRlcikge1xuICAgICAgICAgICAgICAgIGZvbGRlciA9IHtcbiAgICAgICAgICAgICAgICAgIG5hbWU6IGZvbGRlck5hbWUsXG4gICAgICAgICAgICAgICAgICBjb21tYW5kczogW11cbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIGZvbGRlck1hcFtmb2xkZXJOYW1lXSA9IGZvbGRlcjtcbiAgICAgICAgICAgICAgICBmb2xkZXJzLnB1c2goZm9sZGVyKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBmb2xkZXIuY29tbWFuZHMucHVzaChjb21tYW5kKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgZm9sZGVycyA9IF8uc29ydEJ5KGZvbGRlcnMsIFwibmFtZVwiKTtcbiAgICAgICAgICAgIGFuZ3VsYXIuZm9yRWFjaChmb2xkZXJzLCAoZm9sZGVyKSA9PiB7XG4gICAgICAgICAgICAgIGZvbGRlci5jb21tYW5kcyA9IF8uc29ydEJ5KGZvbGRlci5jb21tYW5kcywgXCIkc2hvcnROYW1lXCIpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAkc2NvcGUuY29tbWFuZFNlbGVjdG9yLmZvbGRlcnMgPSBmb2xkZXJzO1xuXG4gICAgICAgICAgICBzZXRNb2RlbENvbW1hbmRzKCRzY29wZS5tb2RlbCwgJHNjb3BlLnJlc291cmNlUGF0aCwgJHNjb3BlLmNvbW1hbmRzKTtcbiAgICAgICAgICAgICRzY29wZS5mZXRjaGVkID0gdHJ1ZTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pLlxuICAgICAgICBlcnJvcihmdW5jdGlvbiAoZGF0YSwgc3RhdHVzLCBoZWFkZXJzLCBjb25maWcpIHtcbiAgICAgICAgICBsb2cud2FybihcImZhaWxlZCB0byBsb2FkIFwiICsgdXJsICsgXCIuIHN0YXR1czogXCIgKyBzdGF0dXMgKyBcIiBkYXRhOiBcIiArIGRhdGEpO1xuICAgICAgICB9KTtcblxuICAgIH1dKTtcbn1cbiIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9pbmNsdWRlcy50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJmb3JnZUhlbHBlcnMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiZm9yZ2VQbHVnaW4udHNcIi8+XG5cbm1vZHVsZSBGb3JnZSB7XG5cbiAgZXhwb3J0IHZhciBSZXBvQ29udHJvbGxlciA9IGNvbnRyb2xsZXIoXCJSZXBvQ29udHJvbGxlclwiLFxuICAgIFtcIiRzY29wZVwiLCBcIiR0ZW1wbGF0ZUNhY2hlXCIsIFwiJGxvY2F0aW9uXCIsIFwiJHJvdXRlUGFyYW1zXCIsIFwiJGh0dHBcIiwgXCIkdGltZW91dFwiLCBcIkZvcmdlQXBpVVJMXCIsXG4gICAgICAoJHNjb3BlLCAkdGVtcGxhdGVDYWNoZTpuZy5JVGVtcGxhdGVDYWNoZVNlcnZpY2UsICRsb2NhdGlvbjpuZy5JTG9jYXRpb25TZXJ2aWNlLCAkcm91dGVQYXJhbXMsICRodHRwLCAkdGltZW91dCwgRm9yZ2VBcGlVUkwpID0+IHtcblxuICAgICAgICAkc2NvcGUubmFtZSA9ICRyb3V0ZVBhcmFtc1tcInBhdGhcIl07XG5cbiAgICAgICAgaW5pdFNjb3BlKCRzY29wZSwgJGxvY2F0aW9uLCAkcm91dGVQYXJhbXMpO1xuICAgICAgICByZWRpcmVjdFRvR29nc0xvZ2luSWZSZXF1aXJlZCgkc2NvcGUsICRsb2NhdGlvbik7XG5cbiAgICAgICAgJHNjb3BlLiRvbignJHJvdXRlVXBkYXRlJywgKCRldmVudCkgPT4ge1xuICAgICAgICAgIHVwZGF0ZURhdGEoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdXBkYXRlRGF0YSgpO1xuXG4gICAgICAgIGZ1bmN0aW9uIHVwZGF0ZURhdGEoKSB7XG4gICAgICAgICAgaWYgKCRzY29wZS5uYW1lKSB7XG4gICAgICAgICAgICB2YXIgdXJsID0gcmVwb0FwaVVybChGb3JnZUFwaVVSTCwgJHNjb3BlLm5hbWUpO1xuICAgICAgICAgICAgdXJsID0gY3JlYXRlSHR0cFVybCh1cmwpO1xuICAgICAgICAgICAgdmFyIGNvbmZpZyA9IGNyZWF0ZUh0dHBDb25maWcoKTtcbiAgICAgICAgICAgICRodHRwLmdldCh1cmwsIGNvbmZpZykuXG4gICAgICAgICAgICAgIHN1Y2Nlc3MoZnVuY3Rpb24gKGRhdGEsIHN0YXR1cywgaGVhZGVycywgY29uZmlnKSB7XG4gICAgICAgICAgICAgICAgaWYgKGRhdGEpIHtcbiAgICAgICAgICAgICAgICAgIGVucmljaFJlcG8oZGF0YSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICRzY29wZS5lbnRpdHkgPSBkYXRhO1xuICAgICAgICAgICAgICAgICRzY29wZS5mZXRjaGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgfSkuXG4gICAgICAgICAgICAgIGVycm9yKGZ1bmN0aW9uIChkYXRhLCBzdGF0dXMsIGhlYWRlcnMsIGNvbmZpZykge1xuICAgICAgICAgICAgICAgIGxvZy53YXJuKFwiZmFpbGVkIHRvIGxvYWQgXCIgKyB1cmwgKyBcIi4gc3RhdHVzOiBcIiArIHN0YXR1cyArIFwiIGRhdGE6IFwiICsgZGF0YSk7XG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAkc2NvcGUuZmV0Y2hlZCA9IHRydWU7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XSk7XG59XG4iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vaW5jbHVkZXMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiZm9yZ2VIZWxwZXJzLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cImZvcmdlUGx1Z2luLnRzXCIvPlxuXG5tb2R1bGUgRm9yZ2Uge1xuXG4gIGV4cG9ydCB2YXIgUmVwb3NDb250cm9sbGVyID0gY29udHJvbGxlcihcIlJlcG9zQ29udHJvbGxlclwiLCBbXCIkc2NvcGVcIiwgXCIkZGlhbG9nXCIsIFwiJHdpbmRvd1wiLCBcIiR0ZW1wbGF0ZUNhY2hlXCIsIFwiJHJvdXRlUGFyYW1zXCIsIFwiJGxvY2F0aW9uXCIsIFwibG9jYWxTdG9yYWdlXCIsIFwiJGh0dHBcIiwgXCIkdGltZW91dFwiLCBcIkZvcmdlQXBpVVJMXCIsIFwiS3ViZXJuZXRlc01vZGVsXCIsIFwiU2VydmljZVJlZ2lzdHJ5XCIsXG4gICAgKCRzY29wZSwgJGRpYWxvZywgJHdpbmRvdywgJHRlbXBsYXRlQ2FjaGUsICRyb3V0ZVBhcmFtcywgJGxvY2F0aW9uOm5nLklMb2NhdGlvblNlcnZpY2UsIGxvY2FsU3RvcmFnZSwgJGh0dHAsICR0aW1lb3V0LCBGb3JnZUFwaVVSTCwgS3ViZXJuZXRlc01vZGVsOiBLdWJlcm5ldGVzLkt1YmVybmV0ZXNNb2RlbFNlcnZpY2UsIFNlcnZpY2VSZWdpc3RyeSkgPT4ge1xuXG4gICAgICAkc2NvcGUubW9kZWwgPSBLdWJlcm5ldGVzTW9kZWw7XG4gICAgICAkc2NvcGUucmVzb3VyY2VQYXRoID0gJHJvdXRlUGFyYW1zW1wicGF0aFwiXTtcbiAgICAgICRzY29wZS5jb21tYW5kc0xpbmsgPSAocGF0aCkgPT4gY29tbWFuZHNMaW5rKHBhdGgsICRzY29wZS5wcm9qZWN0SWQpO1xuXG4gICAgICBpbml0U2NvcGUoJHNjb3BlLCAkbG9jYXRpb24sICRyb3V0ZVBhcmFtcyk7XG5cbiAgICAgICRzY29wZS4kb24oJ2t1YmVybmV0ZXNNb2RlbFVwZGF0ZWQnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHVwZGF0ZUxpbmtzKCk7XG4gICAgICAgIENvcmUuJGFwcGx5KCRzY29wZSk7XG4gICAgICB9KTtcblxuICAgICAgJHNjb3BlLnRhYmxlQ29uZmlnID0ge1xuICAgICAgICBkYXRhOiAncHJvamVjdHMnLFxuICAgICAgICBzaG93U2VsZWN0aW9uQ2hlY2tib3g6IHRydWUsXG4gICAgICAgIGVuYWJsZVJvd0NsaWNrU2VsZWN0aW9uOiBmYWxzZSxcbiAgICAgICAgbXVsdGlTZWxlY3Q6IHRydWUsXG4gICAgICAgIHNlbGVjdGVkSXRlbXM6IFtdLFxuICAgICAgICBmaWx0ZXJPcHRpb25zOiB7XG4gICAgICAgICAgZmlsdGVyVGV4dDogJGxvY2F0aW9uLnNlYXJjaCgpW1wicVwiXSB8fCAnJ1xuICAgICAgICB9LFxuICAgICAgICBjb2x1bW5EZWZzOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgZmllbGQ6ICduYW1lJyxcbiAgICAgICAgICAgIGRpc3BsYXlOYW1lOiAnUmVwb3NpdG9yeSBOYW1lJyxcbiAgICAgICAgICAgIGNlbGxUZW1wbGF0ZTogJHRlbXBsYXRlQ2FjaGUuZ2V0KFwicmVwb1RlbXBsYXRlLmh0bWxcIilcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIGZpZWxkOiAnYWN0aW9ucycsXG4gICAgICAgICAgICBkaXNwbGF5TmFtZTogJ0FjdGlvbnMnLFxuICAgICAgICAgICAgY2VsbFRlbXBsYXRlOiAkdGVtcGxhdGVDYWNoZS5nZXQoXCJyZXBvQWN0aW9uc1RlbXBsYXRlLmh0bWxcIilcbiAgICAgICAgICB9XG4gICAgICAgIF1cbiAgICAgIH07XG5cbiAgICAgICRzY29wZS5sb2dpbiA9IHtcbiAgICAgICAgYXV0aEhlYWRlcjogbG9jYWxTdG9yYWdlW1wiZ29nc0F1dGhvcml6YXRpb25cIl0gfHwgXCJcIixcbiAgICAgICAgcmVsb2dpbjogZmFsc2UsXG4gICAgICAgIGF2YXRhcl91cmw6IGxvY2FsU3RvcmFnZVtcImdvZ3NBdmF0YXJVcmxcIl0gfHwgXCJcIixcbiAgICAgICAgdXNlcjogbG9jYWxTdG9yYWdlW1wiZ29nc1VzZXJcIl0gfHwgXCJcIixcbiAgICAgICAgcGFzc3dvcmQ6IFwiXCIsXG4gICAgICAgIGVtYWlsOiBsb2NhbFN0b3JhZ2VbXCJnb2dzRW1haWxcIl0gfHwgXCJcIlxuICAgICAgfTtcblxuICAgICAgJHNjb3BlLmRvTG9naW4gPSAoKSA9PiB7XG4gICAgICAgIHZhciBsb2dpbiA9ICRzY29wZS5sb2dpbjtcbiAgICAgICAgdmFyIHVzZXIgPSBsb2dpbi51c2VyO1xuICAgICAgICB2YXIgcGFzc3dvcmQgPSBsb2dpbi5wYXNzd29yZDtcbiAgICAgICAgaWYgKHVzZXIgJiYgcGFzc3dvcmQpIHtcbiAgICAgICAgICB2YXIgdXNlclB3ZCA9IHVzZXIgKyAnOicgKyBwYXNzd29yZDtcbiAgICAgICAgICBsb2dpbi5hdXRoSGVhZGVyID0gJ0Jhc2ljICcgKyAodXNlclB3ZC5lbmNvZGVCYXNlNjQoKSk7XG4gICAgICAgICAgdXBkYXRlRGF0YSgpO1xuICAgICAgICB9XG4gICAgICB9O1xuXG4gICAgICAkc2NvcGUubG9nb3V0ID0gKCkgPT4ge1xuICAgICAgICBkZWxldGUgbG9jYWxTdG9yYWdlW1wiZ29nc0F1dGhvcml6YXRpb25cIl07XG4gICAgICAgICRzY29wZS5sb2dpbi5hdXRoSGVhZGVyID0gbnVsbDtcbiAgICAgICAgJHNjb3BlLmxvZ2luLmxvZ2dlZEluID0gZmFsc2U7XG4gICAgICAgICRzY29wZS5sb2dpbi5mYWlsZWQgPSBmYWxzZTtcbiAgICAgICAgbG9nZ2VkSW5Ub0dvZ3MgPSBmYWxzZTtcbiAgICAgIH07XG5cblxuICAgICAgJHNjb3BlLm9wZW5Db21tYW5kcyA9ICgpID0+IHtcbiAgICAgICAgdmFyIHJlc291cmNlUGF0aCA9IG51bGw7XG4gICAgICAgIHZhciBzZWxlY3RlZCA9ICRzY29wZS50YWJsZUNvbmZpZy5zZWxlY3RlZEl0ZW1zO1xuICAgICAgICBpZiAoXy5pc0FycmF5KHNlbGVjdGVkKSAmJiBzZWxlY3RlZC5sZW5ndGgpIHtcbiAgICAgICAgICByZXNvdXJjZVBhdGggPSBzZWxlY3RlZFswXS5wYXRoO1xuICAgICAgICB9XG4gICAgICAgIHZhciBsaW5rID0gY29tbWFuZHNMaW5rKHJlc291cmNlUGF0aCwgJHNjb3BlLnByb2plY3RJZCk7XG4gICAgICAgIGxvZy5pbmZvKFwibW92aW5nIHRvIGNvbW1hbmRzIGxpbms6IFwiICsgbGluayk7XG4gICAgICAgICRsb2NhdGlvbi5wYXRoKGxpbmspO1xuICAgICAgfTtcblxuICAgICAgJHNjb3BlLmRlbGV0ZSA9IChwcm9qZWN0cykgPT4ge1xuICAgICAgICBVSS5tdWx0aUl0ZW1Db25maXJtQWN0aW9uRGlhbG9nKDxVSS5NdWx0aUl0ZW1Db25maXJtQWN0aW9uT3B0aW9ucz57XG4gICAgICAgICAgY29sbGVjdGlvbjogcHJvamVjdHMsXG4gICAgICAgICAgaW5kZXg6ICdwYXRoJyxcbiAgICAgICAgICBvbkNsb3NlOiAocmVzdWx0OmJvb2xlYW4pID0+IHtcbiAgICAgICAgICAgIGlmIChyZXN1bHQpIHtcbiAgICAgICAgICAgICAgZG9EZWxldGUocHJvamVjdHMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0sXG4gICAgICAgICAgdGl0bGU6ICdEZWxldGUgcHJvamVjdHM/JyxcbiAgICAgICAgICBhY3Rpb246ICdUaGUgZm9sbG93aW5nIHByb2plY3RzIHdpbGwgYmUgcmVtb3ZlZCAodGhvdWdoIHRoZSBmaWxlcyB3aWxsIHJlbWFpbiBvbiB5b3VyIGZpbGUgc3lzdGVtKTonLFxuICAgICAgICAgIG9rVGV4dDogJ0RlbGV0ZScsXG4gICAgICAgICAgb2tDbGFzczogJ2J0bi1kYW5nZXInLFxuICAgICAgICAgIGN1c3RvbTogXCJUaGlzIG9wZXJhdGlvbiBpcyBwZXJtYW5lbnQgb25jZSBjb21wbGV0ZWQhXCIsXG4gICAgICAgICAgY3VzdG9tQ2xhc3M6IFwiYWxlcnQgYWxlcnQtd2FybmluZ1wiXG4gICAgICAgIH0pLm9wZW4oKTtcbiAgICAgIH07XG5cbiAgICAgIHVwZGF0ZUxpbmtzKCk7XG5cbiAgICAgIGZ1bmN0aW9uIGRvRGVsZXRlKHByb2plY3RzKSB7XG4gICAgICAgIGFuZ3VsYXIuZm9yRWFjaChwcm9qZWN0cywgKHByb2plY3QpID0+IHtcbiAgICAgICAgICBsb2cuaW5mbyhcIkRlbGV0aW5nIFwiICsgYW5ndWxhci50b0pzb24oJHNjb3BlLnByb2plY3RzKSk7XG4gICAgICAgICAgdmFyIHBhdGggPSBwcm9qZWN0LnBhdGg7XG4gICAgICAgICAgaWYgKHBhdGgpIHtcbiAgICAgICAgICAgIHZhciB1cmwgPSByZXBvQXBpVXJsKEZvcmdlQXBpVVJMLCBwYXRoKTtcbiAgICAgICAgICAgICRodHRwLmRlbGV0ZSh1cmwpLlxuICAgICAgICAgICAgICBzdWNjZXNzKGZ1bmN0aW9uIChkYXRhLCBzdGF0dXMsIGhlYWRlcnMsIGNvbmZpZykge1xuICAgICAgICAgICAgICAgIHVwZGF0ZURhdGEoKTtcbiAgICAgICAgICAgICAgfSkuXG4gICAgICAgICAgICAgIGVycm9yKGZ1bmN0aW9uIChkYXRhLCBzdGF0dXMsIGhlYWRlcnMsIGNvbmZpZykge1xuICAgICAgICAgICAgICAgIGxvZy53YXJuKFwiZmFpbGVkIHRvIGxvYWQgXCIgKyB1cmwgKyBcIi4gc3RhdHVzOiBcIiArIHN0YXR1cyArIFwiIGRhdGE6IFwiICsgZGF0YSk7XG4gICAgICAgICAgICAgICAgdmFyIG1lc3NhZ2UgPSBcIkZhaWxlZCB0byBQT1NUIHRvIFwiICsgdXJsICsgXCIgZ290IHN0YXR1czogXCIgKyBzdGF0dXM7XG4gICAgICAgICAgICAgICAgQ29yZS5ub3RpZmljYXRpb24oJ2Vycm9yJywgbWVzc2FnZSk7XG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIGZ1bmN0aW9uIHVwZGF0ZUxpbmtzKCkge1xuICAgICAgICB2YXIgJGdvZ3NMaW5rID0gU2VydmljZVJlZ2lzdHJ5LnNlcnZpY2VSZWFkeUxpbmsoZ29nc1NlcnZpY2VOYW1lKTtcbiAgICAgICAgaWYgKCRnb2dzTGluaykge1xuICAgICAgICAgICRzY29wZS5zaWduVXBVcmwgPSBVcmxIZWxwZXJzLmpvaW4oJGdvZ3NMaW5rLCBcInVzZXIvc2lnbl91cFwiKTtcbiAgICAgICAgICAkc2NvcGUuZm9yZ290UGFzc3dvcmRVcmwgPSBVcmxIZWxwZXJzLmpvaW4oJGdvZ3NMaW5rLCBcInVzZXIvZm9yZ2V0X3Bhc3N3b3JkXCIpO1xuICAgICAgICB9XG4gICAgICAgICRzY29wZS4kZ29nc0xpbmsgPSAkZ29nc0xpbms7XG4gICAgICAgICRzY29wZS4kZm9yZ2VMaW5rID0gU2VydmljZVJlZ2lzdHJ5LnNlcnZpY2VSZWFkeUxpbmsoS3ViZXJuZXRlcy5mYWJyaWM4Rm9yZ2VTZXJ2aWNlTmFtZSk7XG5cbiAgICAgICAgJHNjb3BlLiRoYXNDRFBpcGVsaW5lVGVtcGxhdGUgPSBfLmFueSgkc2NvcGUubW9kZWwudGVtcGxhdGVzLCAodCkgPT4gXCJjZC1waXBlbGluZVwiID09PSBLdWJlcm5ldGVzLmdldE5hbWUodCkpO1xuXG4gICAgICAgIHZhciBleHBlY3RlZFJDUyA9IFtLdWJlcm5ldGVzLmdvZ3NTZXJ2aWNlTmFtZSwgS3ViZXJuZXRlcy5mYWJyaWM4Rm9yZ2VTZXJ2aWNlTmFtZSwgS3ViZXJuZXRlcy5qZW5raW5zU2VydmljZU5hbWVdO1xuICAgICAgICB2YXIgcmVxdWlyZWRSQ3MgPSB7fTtcbiAgICAgICAgdmFyIG5zID0gS3ViZXJuZXRlcy5jdXJyZW50S3ViZXJuZXRlc05hbWVzcGFjZSgpO1xuICAgICAgICB2YXIgcnVubmluZ0NEUGlwZWxpbmUgPSB0cnVlO1xuICAgICAgICBhbmd1bGFyLmZvckVhY2goZXhwZWN0ZWRSQ1MsIChyY05hbWUpID0+IHtcbiAgICAgICAgICB2YXIgcmMgPSAkc2NvcGUubW9kZWwuZ2V0UmVwbGljYXRpb25Db250cm9sbGVyKG5zLCByY05hbWUpO1xuICAgICAgICAgIGlmIChyYykge1xuICAgICAgICAgICAgcmVxdWlyZWRSQ3NbcmNOYW1lXSA9IHJjO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBydW5uaW5nQ0RQaXBlbGluZSA9IGZhbHNlO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgICRzY29wZS4kcmVxdWlyZWRSQ3MgPSByZXF1aXJlZFJDcztcbiAgICAgICAgJHNjb3BlLiRydW5uaW5nQ0RQaXBlbGluZSA9IHJ1bm5pbmdDRFBpcGVsaW5lO1xuICAgICAgICB2YXIgdXJsID0gXCJcIjtcbiAgICAgICAgJGxvY2F0aW9uID0gS3ViZXJuZXRlcy5pbmplY3QoXCIkbG9jYXRpb25cIik7XG4gICAgICAgIGlmICgkbG9jYXRpb24pIHtcbiAgICAgICAgICB1cmwgPSAkbG9jYXRpb24udXJsKCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCF1cmwpIHtcbiAgICAgICAgICB1cmwgPSB3aW5kb3cubG9jYXRpb24udG9TdHJpbmcoKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBUT0RPIHNob3VsZCB3ZSBzdXBwb3J0IGFueSBvdGhlciB0ZW1wbGF0ZSBuYW1lc3BhY2VzP1xuICAgICAgICB2YXIgdGVtcGxhdGVOYW1lc3BhY2UgPSBcImRlZmF1bHRcIjtcbiAgICAgICAgJHNjb3BlLiRydW5DRFBpcGVsaW5lTGluayA9IFwiL2t1YmVybmV0ZXMvbmFtZXNwYWNlL1wiICsgdGVtcGxhdGVOYW1lc3BhY2UgKyBcIi90ZW1wbGF0ZXMvXCIgKyBucyArIFwiP3E9Y2QtcGlwZWxpbmUmcmV0dXJuVG89XCIgKyBlbmNvZGVVUklDb21wb25lbnQodXJsKTtcbiAgICAgIH1cblxuICAgICAgZnVuY3Rpb24gdXBkYXRlRGF0YSgpIHtcbiAgICAgICAgdmFyIGF1dGhIZWFkZXIgPSAkc2NvcGUubG9naW4uYXV0aEhlYWRlcjtcbiAgICAgICAgdmFyIGVtYWlsID0gJHNjb3BlLmxvZ2luLmVtYWlsIHx8IFwiXCI7XG4gICAgICAgIGlmIChhdXRoSGVhZGVyKSB7XG4gICAgICAgICAgdmFyIHVybCA9IHJlcG9zQXBpVXJsKEZvcmdlQXBpVVJMKTtcbiAgICAgICAgICB1cmwgPSBjcmVhdGVIdHRwVXJsKHVybCwgYXV0aEhlYWRlciwgZW1haWwpO1xuICAgICAgICAgIHZhciBjb25maWcgPSB7XG4vKlxuICAgICAgICAgICAgaGVhZGVyczoge1xuICAgICAgICAgICAgICBHb2dzQXV0aG9yaXphdGlvbjogYXV0aEhlYWRlcixcbiAgICAgICAgICAgICAgR29nc0VtYWlsOiBlbWFpbFxuICAgICAgICAgICAgfVxuKi9cbiAgICAgICAgICB9O1xuICAgICAgICAgICRodHRwLmdldCh1cmwsIGNvbmZpZykuXG4gICAgICAgICAgICBzdWNjZXNzKGZ1bmN0aW9uIChkYXRhLCBzdGF0dXMsIGhlYWRlcnMsIGNvbmZpZykge1xuICAgICAgICAgICAgICAkc2NvcGUubG9naW4uZmFpbGVkID0gZmFsc2U7XG4gICAgICAgICAgICAgICRzY29wZS5sb2dpbi5sb2dnZWRJbiA9IHRydWU7XG4gICAgICAgICAgICAgIGxvZ2dlZEluVG9Hb2dzID0gdHJ1ZTtcbiAgICAgICAgICAgICAgdmFyIGF2YXRhcl91cmwgPSBudWxsO1xuICAgICAgICAgICAgICBpZiAoc3RhdHVzID09PSAyMDApIHtcbiAgICAgICAgICAgICAgICBpZiAoIWRhdGEgfHwgIWFuZ3VsYXIuaXNBcnJheShkYXRhKSkge1xuICAgICAgICAgICAgICAgICAgZGF0YSA9IFtdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyBsZXRzIHN0b3JlIGEgc3VjY2Vzc2Z1bCBsb2dpbiBzbyB0aGF0IHdlIGhpZGUgdGhlIGxvZ2luIHBhZ2VcbiAgICAgICAgICAgICAgICBsb2NhbFN0b3JhZ2VbXCJnb2dzQXV0aG9yaXphdGlvblwiXSA9IGF1dGhIZWFkZXI7XG4gICAgICAgICAgICAgICAgbG9jYWxTdG9yYWdlW1wiZ29nc0VtYWlsXCJdID0gZW1haWw7XG4gICAgICAgICAgICAgICAgbG9jYWxTdG9yYWdlW1wiZ29nc1VzZXJcIl0gPSAkc2NvcGUubG9naW4udXNlciB8fCBcIlwiO1xuXG4gICAgICAgICAgICAgICAgJHNjb3BlLnByb2plY3RzID0gXy5zb3J0QnkoZGF0YSwgXCJuYW1lXCIpO1xuICAgICAgICAgICAgICAgIGFuZ3VsYXIuZm9yRWFjaCgkc2NvcGUucHJvamVjdHMsIChyZXBvKSA9PiB7XG4gICAgICAgICAgICAgICAgICBlbnJpY2hSZXBvKHJlcG8pO1xuICAgICAgICAgICAgICAgICAgaWYgKCFhdmF0YXJfdXJsKSB7XG4gICAgICAgICAgICAgICAgICAgIGF2YXRhcl91cmwgPSBDb3JlLnBhdGhHZXQocmVwbywgW1wib3duZXJcIiwgXCJhdmF0YXJfdXJsXCJdKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGF2YXRhcl91cmwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUubG9naW4uYXZhdGFyX3VybCA9IGF2YXRhcl91cmw7XG4gICAgICAgICAgICAgICAgICAgICAgbG9jYWxTdG9yYWdlW1wiZ29nc0F2YXRhclVybFwiXSA9IGF2YXRhcl91cmw7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAkc2NvcGUuZmV0Y2hlZCA9IHRydWU7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pLlxuICAgICAgICAgICAgZXJyb3IoZnVuY3Rpb24gKGRhdGEsIHN0YXR1cywgaGVhZGVycywgY29uZmlnKSB7XG4gICAgICAgICAgICAgICRzY29wZS5sb2dvdXQoKTtcbiAgICAgICAgICAgICAgJHNjb3BlLmxvZ2luLmZhaWxlZCA9IHRydWU7XG4gICAgICAgICAgICAgIGlmIChzdGF0dXMgIT09IDQwMykge1xuICAgICAgICAgICAgICAgIGxvZy53YXJuKFwiZmFpbGVkIHRvIGxvYWQgXCIgKyB1cmwgKyBcIi4gc3RhdHVzOiBcIiArIHN0YXR1cyArIFwiIGRhdGE6IFwiICsgZGF0YSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHVwZGF0ZURhdGEoKTtcblxuICAgIH1dKTtcbn1cbiIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9pbmNsdWRlcy50c1wiLz5cblxuXG4vKipcbiAqIEBtb2R1bGUgV2lraVxuICovXG5tb2R1bGUgV2lraSB7XG5cbiAgZXhwb3J0IHZhciBsb2c6TG9nZ2luZy5Mb2dnZXIgPSBMb2dnZXIuZ2V0KFwiV2lraVwiKTtcblxuICBleHBvcnQgdmFyIGNhbWVsTmFtZXNwYWNlcyA9IFtcImh0dHA6Ly9jYW1lbC5hcGFjaGUub3JnL3NjaGVtYS9zcHJpbmdcIiwgXCJodHRwOi8vY2FtZWwuYXBhY2hlLm9yZy9zY2hlbWEvYmx1ZXByaW50XCJdO1xuICBleHBvcnQgdmFyIHNwcmluZ05hbWVzcGFjZXMgPSBbXCJodHRwOi8vd3d3LnNwcmluZ2ZyYW1ld29yay5vcmcvc2NoZW1hL2JlYW5zXCJdO1xuICBleHBvcnQgdmFyIGRyb29sc05hbWVzcGFjZXMgPSBbXCJodHRwOi8vZHJvb2xzLm9yZy9zY2hlbWEvZHJvb2xzLXNwcmluZ1wiXTtcbiAgZXhwb3J0IHZhciBkb3plck5hbWVzcGFjZXMgPSBbXCJodHRwOi8vZG96ZXIuc291cmNlZm9yZ2UubmV0XCJdO1xuICBleHBvcnQgdmFyIGFjdGl2ZW1xTmFtZXNwYWNlcyA9IFtcImh0dHA6Ly9hY3RpdmVtcS5hcGFjaGUub3JnL3NjaGVtYS9jb3JlXCJdO1xuXG4gIGV4cG9ydCB2YXIgdXNlQ2FtZWxDYW52YXNCeURlZmF1bHQgPSBmYWxzZTtcblxuICBleHBvcnQgdmFyIGV4Y2x1ZGVBZGp1c3RtZW50UHJlZml4ZXMgPSBbXCJodHRwOi8vXCIsIFwiaHR0cHM6Ly9cIiwgXCIjXCJdO1xuXG4gIGV4cG9ydCBlbnVtIFZpZXdNb2RlIHsgTGlzdCwgSWNvbiB9O1xuXG4gIC8qKlxuICAgKiBUaGUgY3VzdG9tIHZpZXdzIHdpdGhpbiB0aGUgd2lraSBuYW1lc3BhY2U7IGVpdGhlciBcIi93aWtpLyRmb29cIiBvciBcIi93aWtpL2JyYW5jaC8kYnJhbmNoLyRmb29cIlxuICAgKi9cbiAgZXhwb3J0IHZhciBjdXN0b21XaWtpVmlld1BhZ2VzID0gW1wiL2Zvcm1UYWJsZVwiLCBcIi9jYW1lbC9kaWFncmFtXCIsIFwiL2NhbWVsL2NhbnZhc1wiLCBcIi9jYW1lbC9wcm9wZXJ0aWVzXCIsIFwiL2RvemVyL21hcHBpbmdzXCJdO1xuXG4gIC8qKlxuICAgKiBXaGljaCBleHRlbnNpb25zIGRvIHdlIHdpc2ggdG8gaGlkZSBpbiB0aGUgd2lraSBmaWxlIGxpc3RpbmdcbiAgICogQHByb3BlcnR5IGhpZGVFeHRlbnNpb25zXG4gICAqIEBmb3IgV2lraVxuICAgKiBAdHlwZSBBcnJheVxuICAgKi9cbiAgZXhwb3J0IHZhciBoaWRlRXh0ZW5zaW9ucyA9IFtcIi5wcm9maWxlXCJdO1xuXG4gIHZhciBkZWZhdWx0RmlsZU5hbWVQYXR0ZXJuID0gL15bYS16QS1aMC05Ll8tXSokLztcbiAgdmFyIGRlZmF1bHRGaWxlTmFtZVBhdHRlcm5JbnZhbGlkID0gXCJOYW1lIG11c3QgYmU6IGxldHRlcnMsIG51bWJlcnMsIGFuZCAuIF8gb3IgLSBjaGFyYWN0ZXJzXCI7XG5cbiAgdmFyIGRlZmF1bHRGaWxlTmFtZUV4dGVuc2lvblBhdHRlcm4gPSBcIlwiO1xuXG4gIHZhciBkZWZhdWx0TG93ZXJDYXNlRmlsZU5hbWVQYXR0ZXJuID0gL15bYS16MC05Ll8tXSokLztcbiAgdmFyIGRlZmF1bHRMb3dlckNhc2VGaWxlTmFtZVBhdHRlcm5JbnZhbGlkID0gXCJOYW1lIG11c3QgYmU6IGxvd2VyLWNhc2UgbGV0dGVycywgbnVtYmVycywgYW5kIC4gXyBvciAtIGNoYXJhY3RlcnNcIjtcblxuICBleHBvcnQgaW50ZXJmYWNlIEdlbmVyYXRlT3B0aW9ucyB7XG4gICAgd29ya3NwYWNlOiBhbnk7XG4gICAgZm9ybTogYW55O1xuICAgIG5hbWU6IHN0cmluZztcbiAgICBicmFuY2g6IHN0cmluZztcbiAgICBwYXJlbnRJZDogc3RyaW5nO1xuICAgIHN1Y2Nlc3M6IChmaWxlQ29udGVudHM/OnN0cmluZykgPT4gdm9pZDtcbiAgICBlcnJvcjogKGVycm9yOmFueSkgPT4gdm9pZDtcbiAgfVxuXG4gIC8qKlxuICAgKiBUaGUgd2l6YXJkIHRyZWUgZm9yIGNyZWF0aW5nIG5ldyBjb250ZW50IGluIHRoZSB3aWtpXG4gICAqIEBwcm9wZXJ0eSBkb2N1bWVudFRlbXBsYXRlc1xuICAgKiBAZm9yIFdpa2lcbiAgICogQHR5cGUgQXJyYXlcbiAgICovXG4gIGV4cG9ydCB2YXIgZG9jdW1lbnRUZW1wbGF0ZXMgPSBbXG4gICAge1xuICAgICAgbGFiZWw6IFwiRm9sZGVyXCIsXG4gICAgICB0b29sdGlwOiBcIkNyZWF0ZSBhIG5ldyBmb2xkZXIgdG8gY29udGFpbiBkb2N1bWVudHNcIixcbiAgICAgIGZvbGRlcjogdHJ1ZSxcbiAgICAgIGljb246IFwiL2ltZy9pY29ucy93aWtpL2ZvbGRlci5naWZcIixcbiAgICAgIGV4ZW1wbGFyOiBcIm15Zm9sZGVyXCIsXG4gICAgICByZWdleDogZGVmYXVsdExvd2VyQ2FzZUZpbGVOYW1lUGF0dGVybixcbiAgICAgIGludmFsaWQ6IGRlZmF1bHRMb3dlckNhc2VGaWxlTmFtZVBhdHRlcm5JbnZhbGlkXG4gICAgfSxcbiAgICAvKlxuICAgIHtcbiAgICAgIGxhYmVsOiBcIkFwcFwiLFxuICAgICAgdG9vbHRpcDogXCJDcmVhdGVzIGEgbmV3IEFwcCBmb2xkZXIgdXNlZCB0byBjb25maWd1cmUgYW5kIHJ1biBjb250YWluZXJzXCIsXG4gICAgICBhZGRDbGFzczogXCJmYSBmYS1jb2cgZ3JlZW5cIixcbiAgICAgIGV4ZW1wbGFyOiAnbXlhcHAnLFxuICAgICAgcmVnZXg6IGRlZmF1bHRGaWxlTmFtZVBhdHRlcm4sXG4gICAgICBpbnZhbGlkOiBkZWZhdWx0RmlsZU5hbWVQYXR0ZXJuSW52YWxpZCxcbiAgICAgIGV4dGVuc2lvbjogJycsXG4gICAgICBnZW5lcmF0ZWQ6IHtcbiAgICAgICAgbWJlYW46IFsnaW8uZmFicmljOCcsIHsgdHlwZTogJ0t1YmVybmV0ZXNUZW1wbGF0ZU1hbmFnZXInIH1dLFxuICAgICAgICBpbml0OiAod29ya3NwYWNlLCAkc2NvcGUpID0+IHtcblxuICAgICAgICB9LFxuICAgICAgICBnZW5lcmF0ZTogKG9wdGlvbnM6R2VuZXJhdGVPcHRpb25zKSA9PiB7XG4gICAgICAgICAgbG9nLmRlYnVnKFwiR290IG9wdGlvbnM6IFwiLCBvcHRpb25zKTtcbiAgICAgICAgICBvcHRpb25zLmZvcm0ubmFtZSA9IG9wdGlvbnMubmFtZTtcbiAgICAgICAgICBvcHRpb25zLmZvcm0ucGF0aCA9IG9wdGlvbnMucGFyZW50SWQ7XG4gICAgICAgICAgb3B0aW9ucy5mb3JtLmJyYW5jaCA9IG9wdGlvbnMuYnJhbmNoO1xuICAgICAgICAgIHZhciBqc29uID0gYW5ndWxhci50b0pzb24ob3B0aW9ucy5mb3JtKTtcbiAgICAgICAgICB2YXIgam9sb2tpYSA9IDxKb2xva2lhLklKb2xva2lhPiBIYXd0aW9Db3JlLmluamVjdG9yLmdldChcImpvbG9raWFcIik7XG4gICAgICAgICAgam9sb2tpYS5yZXF1ZXN0KHtcbiAgICAgICAgICAgIHR5cGU6ICdleGVjJyxcbiAgICAgICAgICAgIG1iZWFuOiAnaW8uZmFicmljODp0eXBlPUt1YmVybmV0ZXNUZW1wbGF0ZU1hbmFnZXInLFxuICAgICAgICAgICAgb3BlcmF0aW9uOiAnY3JlYXRlQXBwQnlKc29uJyxcbiAgICAgICAgICAgIGFyZ3VtZW50czogW2pzb25dXG4gICAgICAgICAgfSwgQ29yZS5vblN1Y2Nlc3MoKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICBsb2cuZGVidWcoXCJHZW5lcmF0ZWQgYXBwLCByZXNwb25zZTogXCIsIHJlc3BvbnNlKTtcbiAgICAgICAgICAgIG9wdGlvbnMuc3VjY2Vzcyh1bmRlZmluZWQpOyBcbiAgICAgICAgICB9LCB7XG4gICAgICAgICAgICBlcnJvcjogKHJlc3BvbnNlKSA9PiB7IG9wdGlvbnMuZXJyb3IocmVzcG9uc2UuZXJyb3IpOyB9XG4gICAgICAgICAgfSkpO1xuICAgICAgICB9LFxuICAgICAgICBmb3JtOiAod29ya3NwYWNlLCAkc2NvcGUpID0+IHtcbiAgICAgICAgICAvLyBUT0RPIGRvY2tlciByZWdpc3RyeSBjb21wbGV0aW9uXG4gICAgICAgICAgaWYgKCEkc2NvcGUuZG9Eb2NrZXJSZWdpc3RyeUNvbXBsZXRpb24pIHtcbiAgICAgICAgICAgICRzY29wZS5mZXRjaERvY2tlclJlcG9zaXRvcmllcyA9ICgpID0+IHtcbiAgICAgICAgICAgICAgcmV0dXJuIERvY2tlclJlZ2lzdHJ5LmNvbXBsZXRlRG9ja2VyUmVnaXN0cnkoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHN1bW1hcnlNYXJrZG93bjogJ0FkZCBhcHAgc3VtbWFyeSBoZXJlJyxcbiAgICAgICAgICAgIHJlcGxpY2FDb3VudDogMVxuICAgICAgICAgIH07XG4gICAgICAgIH0sXG4gICAgICAgIHNjaGVtYToge1xuICAgICAgICAgIGRlc2NyaXB0aW9uOiAnQXBwIHNldHRpbmdzJyxcbiAgICAgICAgICB0eXBlOiAnamF2YS5sYW5nLlN0cmluZycsXG4gICAgICAgICAgcHJvcGVydGllczoge1xuICAgICAgICAgICAgJ2RvY2tlckltYWdlJzoge1xuICAgICAgICAgICAgICAnZGVzY3JpcHRpb24nOiAnRG9ja2VyIEltYWdlJyxcbiAgICAgICAgICAgICAgJ3R5cGUnOiAnamF2YS5sYW5nLlN0cmluZycsXG4gICAgICAgICAgICAgICdpbnB1dC1hdHRyaWJ1dGVzJzogeyBcbiAgICAgICAgICAgICAgICAncmVxdWlyZWQnOiAnJywgXG4gICAgICAgICAgICAgICAgJ2NsYXNzJzogJ2lucHV0LXhsYXJnZScsXG4gICAgICAgICAgICAgICAgJ3R5cGVhaGVhZCc6ICdyZXBvIGZvciByZXBvIGluIGZldGNoRG9ja2VyUmVwb3NpdG9yaWVzKCkgfCBmaWx0ZXI6JHZpZXdWYWx1ZScsXG4gICAgICAgICAgICAgICAgJ3R5cGVhaGVhZC13YWl0LW1zJzogJzIwMCdcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICdzdW1tYXJ5TWFya2Rvd24nOiB7XG4gICAgICAgICAgICAgICdkZXNjcmlwdGlvbic6ICdTaG9ydCBEZXNjcmlwdGlvbicsXG4gICAgICAgICAgICAgICd0eXBlJzogJ2phdmEubGFuZy5TdHJpbmcnLFxuICAgICAgICAgICAgICAnaW5wdXQtYXR0cmlidXRlcyc6IHsgJ2NsYXNzJzogJ2lucHV0LXhsYXJnZScgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICdyZXBsaWNhQ291bnQnOiB7XG4gICAgICAgICAgICAgICdkZXNjcmlwdGlvbic6ICdSZXBsaWNhIENvdW50JyxcbiAgICAgICAgICAgICAgJ3R5cGUnOiAnamF2YS5sYW5nLkludGVnZXInLFxuICAgICAgICAgICAgICAnaW5wdXQtYXR0cmlidXRlcyc6IHtcbiAgICAgICAgICAgICAgICBtaW46ICcwJ1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgJ2xhYmVscyc6IHtcbiAgICAgICAgICAgICAgJ2Rlc2NyaXB0aW9uJzogJ0xhYmVscycsXG4gICAgICAgICAgICAgICd0eXBlJzogJ21hcCcsXG4gICAgICAgICAgICAgICdpdGVtcyc6IHtcbiAgICAgICAgICAgICAgICAndHlwZSc6ICdzdHJpbmcnXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LFxuICAgIHtcbiAgICAgIGxhYmVsOiBcIkZhYnJpYzggUHJvZmlsZVwiLFxuICAgICAgdG9vbHRpcDogXCJDcmVhdGUgYSBuZXcgZW1wdHkgZmFicmljIHByb2ZpbGUuIFVzaW5nIGEgaHlwaGVuICgnLScpIHdpbGwgY3JlYXRlIGEgZm9sZGVyIGhlaXJhcmNoeSwgZm9yIGV4YW1wbGUgJ215LWF3ZXNvbWUtcHJvZmlsZScgd2lsbCBiZSBhdmFpbGFibGUgdmlhIHRoZSBwYXRoICdteS9hd2Vzb21lL3Byb2ZpbGUnLlwiLFxuICAgICAgcHJvZmlsZTogdHJ1ZSxcbiAgICAgIGFkZENsYXNzOiBcImZhIGZhLWJvb2sgZ3JlZW5cIixcbiAgICAgIGV4ZW1wbGFyOiBcInVzZXItcHJvZmlsZVwiLFxuICAgICAgcmVnZXg6IGRlZmF1bHRMb3dlckNhc2VGaWxlTmFtZVBhdHRlcm4sXG4gICAgICBpbnZhbGlkOiBkZWZhdWx0TG93ZXJDYXNlRmlsZU5hbWVQYXR0ZXJuSW52YWxpZCxcbiAgICAgIGZhYnJpY09ubHk6IHRydWVcbiAgICB9LFxuICAgICovXG4gICAge1xuICAgICAgbGFiZWw6IFwiUHJvcGVydGllcyBGaWxlXCIsXG4gICAgICB0b29sdGlwOiBcIkEgcHJvcGVydGllcyBmaWxlIHR5cGljYWxseSB1c2VkIHRvIGNvbmZpZ3VyZSBKYXZhIGNsYXNzZXNcIixcbiAgICAgIGV4ZW1wbGFyOiBcInByb3BlcnRpZXMtZmlsZS5wcm9wZXJ0aWVzXCIsXG4gICAgICByZWdleDogZGVmYXVsdEZpbGVOYW1lUGF0dGVybixcbiAgICAgIGludmFsaWQ6IGRlZmF1bHRGaWxlTmFtZVBhdHRlcm5JbnZhbGlkLFxuICAgICAgZXh0ZW5zaW9uOiBcIi5wcm9wZXJ0aWVzXCJcbiAgICB9LFxuICAgIHtcbiAgICAgIGxhYmVsOiBcIkpTT04gRmlsZVwiLFxuICAgICAgdG9vbHRpcDogXCJBIGZpbGUgY29udGFpbmluZyBKU09OIGRhdGFcIixcbiAgICAgIGV4ZW1wbGFyOiBcImRvY3VtZW50Lmpzb25cIixcbiAgICAgIHJlZ2V4OiBkZWZhdWx0RmlsZU5hbWVQYXR0ZXJuLFxuICAgICAgaW52YWxpZDogZGVmYXVsdEZpbGVOYW1lUGF0dGVybkludmFsaWQsXG4gICAgICBleHRlbnNpb246IFwiLmpzb25cIlxuICAgIH0sXG4gICAgLypcbiAgICB7XG4gICAgICBsYWJlbDogXCJLZXkgU3RvcmUgRmlsZVwiLFxuICAgICAgdG9vbHRpcDogXCJDcmVhdGVzIGEga2V5c3RvcmUgKGRhdGFiYXNlKSBvZiBjcnlwdG9ncmFwaGljIGtleXMsIFguNTA5IGNlcnRpZmljYXRlIGNoYWlucywgYW5kIHRydXN0ZWQgY2VydGlmaWNhdGVzLlwiLFxuICAgICAgZXhlbXBsYXI6ICdrZXlzdG9yZS5qa3MnLFxuICAgICAgcmVnZXg6IGRlZmF1bHRGaWxlTmFtZVBhdHRlcm4sXG4gICAgICBpbnZhbGlkOiBkZWZhdWx0RmlsZU5hbWVQYXR0ZXJuSW52YWxpZCxcbiAgICAgIGV4dGVuc2lvbjogXCIuamtzXCIsXG4gICAgICBnZW5lcmF0ZWQ6IHtcbiAgICAgICAgbWJlYW46IFsnaGF3dGlvJywgeyB0eXBlOiAnS2V5c3RvcmVTZXJ2aWNlJyB9XSxcbiAgICAgICAgaW5pdDogZnVuY3Rpb24od29ya3NwYWNlLCAkc2NvcGUpIHtcbiAgICAgICAgICB2YXIgbWJlYW4gPSAnaGF3dGlvOnR5cGU9S2V5c3RvcmVTZXJ2aWNlJztcbiAgICAgICAgICB2YXIgcmVzcG9uc2UgPSB3b3Jrc3BhY2Uuam9sb2tpYS5yZXF1ZXN0KCB7dHlwZTogXCJyZWFkXCIsIG1iZWFuOiBtYmVhbiwgYXR0cmlidXRlOiBcIlNlY3VyaXR5UHJvdmlkZXJJbmZvXCIgfSwge1xuICAgICAgICAgICAgc3VjY2VzczogKHJlc3BvbnNlKT0+e1xuICAgICAgICAgICAgICAkc2NvcGUuc2VjdXJpdHlQcm92aWRlckluZm8gPSByZXNwb25zZS52YWx1ZTtcbiAgICAgICAgICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBlcnJvcjogKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdDb3VsZCBub3QgZmluZCB0aGUgc3VwcG9ydGVkIHNlY3VyaXR5IGFsZ29yaXRobXM6ICcsIHJlc3BvbnNlLmVycm9yKTtcbiAgICAgICAgICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcbiAgICAgICAgfSxcbiAgICAgICAgZ2VuZXJhdGU6IGZ1bmN0aW9uKG9wdGlvbnM6R2VuZXJhdGVPcHRpb25zKSB7XG4gICAgICAgICAgdmFyIGVuY29kZWRGb3JtID0gSlNPTi5zdHJpbmdpZnkob3B0aW9ucy5mb3JtKVxuICAgICAgICAgIHZhciBtYmVhbiA9ICdoYXd0aW86dHlwZT1LZXlzdG9yZVNlcnZpY2UnO1xuICAgICAgICAgIHZhciByZXNwb25zZSA9IG9wdGlvbnMud29ya3NwYWNlLmpvbG9raWEucmVxdWVzdCgge1xuICAgICAgICAgICAgICB0eXBlOiAnZXhlYycsIFxuICAgICAgICAgICAgICBtYmVhbjogbWJlYW4sXG4gICAgICAgICAgICAgIG9wZXJhdGlvbjogJ2NyZWF0ZUtleVN0b3JlVmlhSlNPTihqYXZhLmxhbmcuU3RyaW5nKScsXG4gICAgICAgICAgICAgIGFyZ3VtZW50czogW2VuY29kZWRGb3JtXVxuICAgICAgICAgICAgfSwge1xuICAgICAgICAgICAgICBtZXRob2Q6J1BPU1QnLFxuICAgICAgICAgICAgICBzdWNjZXNzOmZ1bmN0aW9uKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgb3B0aW9ucy5zdWNjZXNzKHJlc3BvbnNlLnZhbHVlKVxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBlcnJvcjpmdW5jdGlvbihyZXNwb25zZSl7XG4gICAgICAgICAgICAgICAgb3B0aW9ucy5lcnJvcihyZXNwb25zZS5lcnJvcilcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sXG4gICAgICAgIGZvcm06IGZ1bmN0aW9uKHdvcmtzcGFjZSwgJHNjb3BlKXsgXG4gICAgICAgICAgcmV0dXJuIHsgXG4gICAgICAgICAgICBzdG9yZVR5cGU6ICRzY29wZS5zZWN1cml0eVByb3ZpZGVySW5mby5zdXBwb3J0ZWRLZXlTdG9yZVR5cGVzWzBdLFxuICAgICAgICAgICAgY3JlYXRlUHJpdmF0ZUtleTogZmFsc2UsXG4gICAgICAgICAgICBrZXlMZW5ndGg6IDQwOTYsXG4gICAgICAgICAgICBrZXlBbGdvcml0aG06ICRzY29wZS5zZWN1cml0eVByb3ZpZGVySW5mby5zdXBwb3J0ZWRLZXlBbGdvcml0aG1zWzBdLFxuICAgICAgICAgICAga2V5VmFsaWRpdHk6IDM2NVxuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgc2NoZW1hOiB7XG4gICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJLZXlzdG9yZSBTZXR0aW5nc1wiLFxuICAgICAgICAgICBcInR5cGVcIjogXCJqYXZhLmxhbmcuU3RyaW5nXCIsXG4gICAgICAgICAgIFwicHJvcGVydGllc1wiOiB7IFxuICAgICAgICAgICAgIFwic3RvcmVQYXNzd29yZFwiOiB7XG4gICAgICAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiS2V5c3RvcmUgcGFzc3dvcmQuXCIsXG4gICAgICAgICAgICAgICBcInR5cGVcIjogXCJwYXNzd29yZFwiLFxuICAgICAgICAgICAgICAgJ2lucHV0LWF0dHJpYnV0ZXMnOiB7IFwicmVxdWlyZWRcIjogIFwiXCIsICBcIm5nLW1pbmxlbmd0aFwiOjYgfVxuICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgXCJzdG9yZVR5cGVcIjoge1xuICAgICAgICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSB0eXBlIG9mIHN0b3JlIHRvIGNyZWF0ZVwiLFxuICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwiamF2YS5sYW5nLlN0cmluZ1wiLFxuICAgICAgICAgICAgICAgJ2lucHV0LWVsZW1lbnQnOiBcInNlbGVjdFwiLFxuICAgICAgICAgICAgICAgJ2lucHV0LWF0dHJpYnV0ZXMnOiB7IFwibmctb3B0aW9uc1wiOiAgXCJ2IGZvciB2IGluIHNlY3VyaXR5UHJvdmlkZXJJbmZvLnN1cHBvcnRlZEtleVN0b3JlVHlwZXNcIiB9XG4gICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICBcImNyZWF0ZVByaXZhdGVLZXlcIjoge1xuICAgICAgICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlNob3VsZCB3ZSBnZW5lcmF0ZSBhIHNlbGYtc2lnbmVkIHByaXZhdGUga2V5P1wiLFxuICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwiYm9vbGVhblwiXG4gICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICBcImtleUNvbW1vbk5hbWVcIjoge1xuICAgICAgICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBjb21tb24gbmFtZSBvZiB0aGUga2V5LCB0eXBpY2FsbHkgc2V0IHRvIHRoZSBob3N0bmFtZSBvZiB0aGUgc2VydmVyXCIsXG4gICAgICAgICAgICAgICBcInR5cGVcIjogXCJqYXZhLmxhbmcuU3RyaW5nXCIsXG4gICAgICAgICAgICAgICAnY29udHJvbC1ncm91cC1hdHRyaWJ1dGVzJzogeyAnbmctc2hvdyc6IFwiZm9ybURhdGEuY3JlYXRlUHJpdmF0ZUtleVwiIH1cbiAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgIFwia2V5TGVuZ3RoXCI6IHtcbiAgICAgICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgbGVuZ3RoIG9mIHRoZSBjcnlwdG9ncmFwaGljIGtleVwiLFxuICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwiTG9uZ1wiLFxuICAgICAgICAgICAgICAgJ2NvbnRyb2wtZ3JvdXAtYXR0cmlidXRlcyc6IHsgJ25nLXNob3cnOiBcImZvcm1EYXRhLmNyZWF0ZVByaXZhdGVLZXlcIiB9XG4gICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICBcImtleUFsZ29yaXRobVwiOiB7XG4gICAgICAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIGtleSBhbGdvcml0aG1cIixcbiAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImphdmEubGFuZy5TdHJpbmdcIixcbiAgICAgICAgICAgICAgICdpbnB1dC1lbGVtZW50JzogXCJzZWxlY3RcIixcbiAgICAgICAgICAgICAgICdpbnB1dC1hdHRyaWJ1dGVzJzogeyBcIm5nLW9wdGlvbnNcIjogIFwidiBmb3IgdiBpbiBzZWN1cml0eVByb3ZpZGVySW5mby5zdXBwb3J0ZWRLZXlBbGdvcml0aG1zXCIgfSxcbiAgICAgICAgICAgICAgICdjb250cm9sLWdyb3VwLWF0dHJpYnV0ZXMnOiB7ICduZy1zaG93JzogXCJmb3JtRGF0YS5jcmVhdGVQcml2YXRlS2V5XCIgfVxuICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgXCJrZXlWYWxpZGl0eVwiOiB7XG4gICAgICAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIG51bWJlciBvZiBkYXlzIHRoZSBrZXkgd2lsbCBiZSB2YWxpZCBmb3JcIixcbiAgICAgICAgICAgICAgIFwidHlwZVwiOiBcIkxvbmdcIixcbiAgICAgICAgICAgICAgICdjb250cm9sLWdyb3VwLWF0dHJpYnV0ZXMnOiB7ICduZy1zaG93JzogXCJmb3JtRGF0YS5jcmVhdGVQcml2YXRlS2V5XCIgfVxuICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgXCJrZXlQYXNzd29yZFwiOiB7XG4gICAgICAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiUGFzc3dvcmQgdG8gdGhlIHByaXZhdGUga2V5XCIsXG4gICAgICAgICAgICAgICBcInR5cGVcIjogXCJwYXNzd29yZFwiLFxuICAgICAgICAgICAgICAgJ2NvbnRyb2wtZ3JvdXAtYXR0cmlidXRlcyc6IHsgJ25nLXNob3cnOiBcImZvcm1EYXRhLmNyZWF0ZVByaXZhdGVLZXlcIiB9XG4gICAgICAgICAgICAgfVxuICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LFxuICAgICovXG4gICAge1xuICAgICAgbGFiZWw6IFwiTWFya2Rvd24gRG9jdW1lbnRcIixcbiAgICAgIHRvb2x0aXA6IFwiQSBiYXNpYyBtYXJrdXAgZG9jdW1lbnQgdXNpbmcgdGhlIE1hcmtkb3duIHdpa2kgbWFya3VwLCBwYXJ0aWN1bGFybHkgdXNlZnVsIGZvciBSZWFkTWUgZmlsZXMgaW4gZGlyZWN0b3JpZXNcIixcbiAgICAgIGV4ZW1wbGFyOiBcIlJlYWRNZS5tZFwiLFxuICAgICAgcmVnZXg6IGRlZmF1bHRGaWxlTmFtZVBhdHRlcm4sXG4gICAgICBpbnZhbGlkOiBkZWZhdWx0RmlsZU5hbWVQYXR0ZXJuSW52YWxpZCxcbiAgICAgIGV4dGVuc2lvbjogXCIubWRcIlxuICAgIH0sXG4gICAge1xuICAgICAgbGFiZWw6IFwiVGV4dCBEb2N1bWVudFwiLFxuICAgICAgdG9vbHRpcDogXCJBIHBsYWluIHRleHQgZmlsZVwiLFxuICAgICAgZXhlbXBsYXI6IFwiZG9jdW1lbnQudGV4dFwiLFxuICAgICAgcmVnZXg6IGRlZmF1bHRGaWxlTmFtZVBhdHRlcm4sXG4gICAgICBpbnZhbGlkOiBkZWZhdWx0RmlsZU5hbWVQYXR0ZXJuSW52YWxpZCxcbiAgICAgIGV4dGVuc2lvbjogXCIudHh0XCJcbiAgICB9LFxuICAgIHtcbiAgICAgIGxhYmVsOiBcIkhUTUwgRG9jdW1lbnRcIixcbiAgICAgIHRvb2x0aXA6IFwiQSBIVE1MIGRvY3VtZW50IHlvdSBjYW4gZWRpdCBkaXJlY3RseSB1c2luZyB0aGUgSFRNTCBtYXJrdXBcIixcbiAgICAgIGV4ZW1wbGFyOiBcImRvY3VtZW50Lmh0bWxcIixcbiAgICAgIHJlZ2V4OiBkZWZhdWx0RmlsZU5hbWVQYXR0ZXJuLFxuICAgICAgaW52YWxpZDogZGVmYXVsdEZpbGVOYW1lUGF0dGVybkludmFsaWQsXG4gICAgICBleHRlbnNpb246IFwiLmh0bWxcIlxuICAgIH0sXG4gICAge1xuICAgICAgbGFiZWw6IFwiWE1MIERvY3VtZW50XCIsXG4gICAgICB0b29sdGlwOiBcIkFuIGVtcHR5IFhNTCBkb2N1bWVudFwiLFxuICAgICAgZXhlbXBsYXI6IFwiZG9jdW1lbnQueG1sXCIsXG4gICAgICByZWdleDogZGVmYXVsdEZpbGVOYW1lUGF0dGVybixcbiAgICAgIGludmFsaWQ6IGRlZmF1bHRGaWxlTmFtZVBhdHRlcm5JbnZhbGlkLFxuICAgICAgZXh0ZW5zaW9uOiBcIi54bWxcIlxuICAgIH0sXG4gICAge1xuICAgICAgbGFiZWw6IFwiSW50ZWdyYXRpb24gRmxvd3NcIixcbiAgICAgIHRvb2x0aXA6IFwiQ2FtZWwgcm91dGVzIGZvciBkZWZpbmluZyB5b3VyIGludGVncmF0aW9uIGZsb3dzXCIsXG4gICAgICBjaGlsZHJlbjogW1xuICAgICAgICB7XG4gICAgICAgICAgbGFiZWw6IFwiQ2FtZWwgWE1MIGRvY3VtZW50XCIsXG4gICAgICAgICAgdG9vbHRpcDogXCJBIHZhbmlsbGEgQ2FtZWwgWE1MIGRvY3VtZW50IGZvciBpbnRlZ3JhdGlvbiBmbG93c1wiLFxuICAgICAgICAgIGljb246IFwiL2ltZy9pY29ucy9jYW1lbC5zdmdcIixcbiAgICAgICAgICBleGVtcGxhcjogXCJjYW1lbC54bWxcIixcbiAgICAgICAgICByZWdleDogZGVmYXVsdEZpbGVOYW1lUGF0dGVybixcbiAgICAgICAgICBpbnZhbGlkOiBkZWZhdWx0RmlsZU5hbWVQYXR0ZXJuSW52YWxpZCxcbiAgICAgICAgICBleHRlbnNpb246IFwiLnhtbFwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICBsYWJlbDogXCJDYW1lbCBPU0dpIEJsdWVwcmludCBYTUwgZG9jdW1lbnRcIixcbiAgICAgICAgICB0b29sdGlwOiBcIkEgdmFuaWxsYSBDYW1lbCBYTUwgZG9jdW1lbnQgZm9yIGludGVncmF0aW9uIGZsb3dzIHdoZW4gdXNpbmcgT1NHaSBCbHVlcHJpbnRcIixcbiAgICAgICAgICBpY29uOiBcIi9pbWcvaWNvbnMvY2FtZWwuc3ZnXCIsXG4gICAgICAgICAgZXhlbXBsYXI6IFwiY2FtZWwtYmx1ZXByaW50LnhtbFwiLFxuICAgICAgICAgIHJlZ2V4OiBkZWZhdWx0RmlsZU5hbWVQYXR0ZXJuLFxuICAgICAgICAgIGludmFsaWQ6IGRlZmF1bHRGaWxlTmFtZVBhdHRlcm5JbnZhbGlkLFxuICAgICAgICAgIGV4dGVuc2lvbjogXCIueG1sXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIGxhYmVsOiBcIkNhbWVsIFNwcmluZyBYTUwgZG9jdW1lbnRcIixcbiAgICAgICAgICB0b29sdGlwOiBcIkEgdmFuaWxsYSBDYW1lbCBYTUwgZG9jdW1lbnQgZm9yIGludGVncmF0aW9uIGZsb3dzIHdoZW4gdXNpbmcgdGhlIFNwcmluZyBmcmFtZXdvcmtcIixcbiAgICAgICAgICBpY29uOiBcIi9pbWcvaWNvbnMvY2FtZWwuc3ZnXCIsXG4gICAgICAgICAgZXhlbXBsYXI6IFwiY2FtZWwtc3ByaW5nLnhtbFwiLFxuICAgICAgICAgIHJlZ2V4OiBkZWZhdWx0RmlsZU5hbWVQYXR0ZXJuLFxuICAgICAgICAgIGludmFsaWQ6IGRlZmF1bHRGaWxlTmFtZVBhdHRlcm5JbnZhbGlkLFxuICAgICAgICAgIGV4dGVuc2lvbjogXCIueG1sXCJcbiAgICAgICAgfVxuICAgICAgXVxuICAgIH0sXG4gICAge1xuICAgICAgbGFiZWw6IFwiRGF0YSBNYXBwaW5nIERvY3VtZW50XCIsXG4gICAgICB0b29sdGlwOiBcIkRvemVyIGJhc2VkIGNvbmZpZ3VyYXRpb24gb2YgbWFwcGluZyBkb2N1bWVudHNcIixcbiAgICAgIGljb246IFwiL2ltZy9pY29ucy9kb3plci9kb3plci5naWZcIixcbiAgICAgIGV4ZW1wbGFyOiBcImRvemVyLW1hcHBpbmcueG1sXCIsXG4gICAgICByZWdleDogZGVmYXVsdEZpbGVOYW1lUGF0dGVybixcbiAgICAgIGludmFsaWQ6IGRlZmF1bHRGaWxlTmFtZVBhdHRlcm5JbnZhbGlkLFxuICAgICAgZXh0ZW5zaW9uOiBcIi54bWxcIlxuICAgIH1cbiAgXTtcblxuICAvLyBUT0RPIFJFTU9WRVxuICBleHBvcnQgZnVuY3Rpb24gaXNGTUNDb250YWluZXIod29ya3NwYWNlKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgLy8gVE9ETyBSRU1PVkVcbiAgZXhwb3J0IGZ1bmN0aW9uIGlzV2lraUVuYWJsZWQod29ya3NwYWNlLCBqb2xva2lhLCBsb2NhbFN0b3JhZ2UpIHtcbiAgICByZXR1cm4gdHJ1ZTtcbi8qXG4gICAgcmV0dXJuIEdpdC5jcmVhdGVHaXRSZXBvc2l0b3J5KHdvcmtzcGFjZSwgam9sb2tpYSwgbG9jYWxTdG9yYWdlKSAhPT0gbnVsbDtcbiovXG4gIH1cblxuICBleHBvcnQgZnVuY3Rpb24gZ29Ub0xpbmsobGluaywgJHRpbWVvdXQsICRsb2NhdGlvbikge1xuICAgIHZhciBocmVmID0gQ29yZS50cmltTGVhZGluZyhsaW5rLCBcIiNcIik7XG4gICAgJHRpbWVvdXQoKCkgPT4ge1xuICAgICAgbG9nLmRlYnVnKFwiQWJvdXQgdG8gbmF2aWdhdGUgdG86IFwiICsgaHJlZik7XG4gICAgICAkbG9jYXRpb24udXJsKGhyZWYpO1xuICAgIH0sIDEwMCk7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyBhbGwgdGhlIGxpbmtzIGZvciB0aGUgZ2l2ZW4gYnJhbmNoIGZvciB0aGUgY3VzdG9tIHZpZXdzLCBzdGFydGluZyB3aXRoIFwiL1wiXG4gICAqIEBwYXJhbSAkc2NvcGVcbiAgICogQHJldHVybnMge3N0cmluZ1tdfVxuICAgKi9cbiAgZXhwb3J0IGZ1bmN0aW9uIGN1c3RvbVZpZXdMaW5rcygkc2NvcGUpIHtcbiAgICB2YXIgcHJlZml4ID0gQ29yZS50cmltTGVhZGluZyhXaWtpLnN0YXJ0TGluaygkc2NvcGUpLCBcIiNcIik7XG4gICAgcmV0dXJuIGN1c3RvbVdpa2lWaWV3UGFnZXMubWFwKHBhdGggPT4gcHJlZml4ICsgcGF0aCk7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyBhIG5ldyBjcmVhdGUgZG9jdW1lbnQgd2l6YXJkIHRyZWVcbiAgICogQG1ldGhvZCBjcmVhdGVXaXphcmRUcmVlXG4gICAqIEBmb3IgV2lraVxuICAgKiBAc3RhdGljXG4gICAqL1xuICBleHBvcnQgZnVuY3Rpb24gY3JlYXRlV2l6YXJkVHJlZSh3b3Jrc3BhY2UsICRzY29wZSkge1xuICAgIHZhciByb290ID0gY3JlYXRlRm9sZGVyKFwiTmV3IERvY3VtZW50c1wiKTtcbiAgICBhZGRDcmVhdGVXaXphcmRGb2xkZXJzKHdvcmtzcGFjZSwgJHNjb3BlLCByb290LCBkb2N1bWVudFRlbXBsYXRlcyk7XG4gICAgcmV0dXJuIHJvb3Q7XG4gIH1cblxuICBmdW5jdGlvbiBjcmVhdGVGb2xkZXIobmFtZSk6IGFueSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIG5hbWU6IG5hbWUsXG4gICAgICBjaGlsZHJlbjogW11cbiAgICB9O1xuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIGFkZENyZWF0ZVdpemFyZEZvbGRlcnMod29ya3NwYWNlLCAkc2NvcGUsIHBhcmVudCwgdGVtcGxhdGVzOiBhbnlbXSkge1xuICAgIGFuZ3VsYXIuZm9yRWFjaCh0ZW1wbGF0ZXMsICh0ZW1wbGF0ZSkgPT4ge1xuXG4gICAgICBpZiAoIHRlbXBsYXRlLmdlbmVyYXRlZCApIHtcbiAgICAgICAgaWYgKCB0ZW1wbGF0ZS5nZW5lcmF0ZWQuaW5pdCApIHtcbiAgICAgICAgICB0ZW1wbGF0ZS5nZW5lcmF0ZWQuaW5pdCh3b3Jrc3BhY2UsICRzY29wZSk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgdmFyIHRpdGxlID0gdGVtcGxhdGUubGFiZWwgfHwga2V5O1xuICAgICAgdmFyIG5vZGUgPSBjcmVhdGVGb2xkZXIodGl0bGUpO1xuICAgICAgbm9kZS5wYXJlbnQgPSBwYXJlbnQ7XG4gICAgICBub2RlLmVudGl0eSA9IHRlbXBsYXRlO1xuXG4gICAgICB2YXIgYWRkQ2xhc3MgPSB0ZW1wbGF0ZS5hZGRDbGFzcztcbiAgICAgIGlmIChhZGRDbGFzcykge1xuICAgICAgICBub2RlLmFkZENsYXNzID0gYWRkQ2xhc3M7XG4gICAgICB9XG5cbiAgICAgIHZhciBrZXkgPSB0ZW1wbGF0ZS5leGVtcGxhcjtcbiAgICAgIHZhciBwYXJlbnRLZXkgPSBwYXJlbnQua2V5IHx8IFwiXCI7XG4gICAgICBub2RlLmtleSA9IHBhcmVudEtleSA/IHBhcmVudEtleSArIFwiX1wiICsga2V5IDoga2V5O1xuICAgICAgdmFyIGljb24gPSB0ZW1wbGF0ZS5pY29uO1xuICAgICAgaWYgKGljb24pIHtcbiAgICAgICAgbm9kZS5pY29uID0gQ29yZS51cmwoaWNvbik7XG4gICAgICB9XG4gICAgICAvLyBjb21waWxlciB3YXMgY29tcGxhaW5pbmcgYWJvdXQgJ2xhYmVsJyBoYWQgbm8gaWRlYSB3aGVyZSBpdCdzIGNvbWluZyBmcm9tXG4gICAgICAvLyB2YXIgdG9vbHRpcCA9IHZhbHVlW1widG9vbHRpcFwiXSB8fCB2YWx1ZVtcImRlc2NyaXB0aW9uXCJdIHx8IGxhYmVsO1xuICAgICAgdmFyIHRvb2x0aXAgPSB0ZW1wbGF0ZVtcInRvb2x0aXBcIl0gfHwgdGVtcGxhdGVbXCJkZXNjcmlwdGlvblwiXSB8fCAnJztcbiAgICAgIG5vZGUudG9vbHRpcCA9IHRvb2x0aXA7XG4gICAgICBpZiAodGVtcGxhdGVbXCJmb2xkZXJcIl0pIHtcbiAgICAgICAgbm9kZS5pc0ZvbGRlciA9ICgpID0+IHsgcmV0dXJuIHRydWU7IH07XG4gICAgICB9XG4gICAgICBwYXJlbnQuY2hpbGRyZW4ucHVzaChub2RlKTtcblxuICAgICAgdmFyIGNoaWxkcmVuID0gdGVtcGxhdGUuY2hpbGRyZW47XG4gICAgICBpZiAoY2hpbGRyZW4pIHtcbiAgICAgICAgYWRkQ3JlYXRlV2l6YXJkRm9sZGVycyh3b3Jrc3BhY2UsICRzY29wZSwgbm9kZSwgY2hpbGRyZW4pO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIHN0YXJ0TGluaygkc2NvcGUpIHtcbiAgICB2YXIgcHJvamVjdElkID0gJHNjb3BlLnByb2plY3RJZDtcbiAgICB2YXIgb3duZXIgPSAkc2NvcGUub3duZXI7XG4gICAgdmFyIHJlcG9JZCA9ICRzY29wZS5yZXBvSWQgfHwgcHJvamVjdElkO1xuICAgIHZhciBzdGFydCA9IFVybEhlbHBlcnMuam9pbihEZXZlbG9wZXIucHJvamVjdExpbmsocHJvamVjdElkKSwgXCIvd2lraVwiLCBvd25lciwgcmVwb0lkKTtcbiAgICB2YXIgYnJhbmNoID0gJHNjb3BlLmJyYW5jaDtcbiAgICBpZiAoYnJhbmNoKSB7XG4gICAgICBzdGFydCA9IFVybEhlbHBlcnMuam9pbihzdGFydCwgJ2JyYW5jaCcsIGJyYW5jaCk7XG4gICAgfVxuICAgIHJldHVybiBzdGFydDtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIHRydWUgaWYgdGhlIGdpdmVuIGZpbGVuYW1lL3BhdGggaXMgYW4gaW5kZXggcGFnZSAobmFtZWQgaW5kZXguKiBhbmQgaXMgYSBtYXJrZG93bi9odG1sIHBhZ2UpLlxuICAgKlxuICAgKiBAcGFyYW0gcGF0aFxuICAgKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAgICovXG4gIGV4cG9ydCBmdW5jdGlvbiBpc0luZGV4UGFnZShwYXRoOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gcGF0aCAmJiAocGF0aC5lbmRzV2l0aChcImluZGV4Lm1kXCIpIHx8IHBhdGguZW5kc1dpdGgoXCJpbmRleC5odG1sXCIpIHx8IHBhdGguZW5kc1dpdGgoXCJpbmRleFwiKSkgPyB0cnVlIDogZmFsc2U7XG4gIH1cblxuICBleHBvcnQgZnVuY3Rpb24gdmlld0xpbmsoJHNjb3BlLCBwYWdlSWQ6c3RyaW5nLCAkbG9jYXRpb24sIGZpbGVOYW1lOnN0cmluZyA9IG51bGwpIHtcbiAgICB2YXIgbGluazpzdHJpbmcgPSBudWxsO1xuICAgIHZhciBzdGFydCA9IHN0YXJ0TGluaygkc2NvcGUpO1xuICAgIGlmIChwYWdlSWQpIHtcbiAgICAgIC8vIGZpZ3VyZSBvdXQgd2hpY2ggdmlldyB0byB1c2UgZm9yIHRoaXMgcGFnZVxuICAgICAgdmFyIHZpZXcgPSBpc0luZGV4UGFnZShwYWdlSWQpID8gXCIvYm9vay9cIiA6IFwiL3ZpZXcvXCI7XG4gICAgICBsaW5rID0gc3RhcnQgKyB2aWV3ICsgZW5jb2RlUGF0aChDb3JlLnRyaW1MZWFkaW5nKHBhZ2VJZCwgXCIvXCIpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gbGV0cyB1c2UgdGhlIGN1cnJlbnQgcGF0aFxuICAgICAgdmFyIHBhdGg6c3RyaW5nID0gJGxvY2F0aW9uLnBhdGgoKTtcbiAgICAgIGxpbmsgPSBcIiNcIiArIHBhdGgucmVwbGFjZSgvKGVkaXR8Y3JlYXRlKS8sIFwidmlld1wiKTtcbiAgICB9XG4gICAgaWYgKGZpbGVOYW1lICYmIHBhZ2VJZCAmJiBwYWdlSWQuZW5kc1dpdGgoZmlsZU5hbWUpKSB7XG4gICAgICByZXR1cm4gbGluaztcbiAgICB9XG4gICAgaWYgKGZpbGVOYW1lKSB7XG4gICAgICBpZiAoIWxpbmsuZW5kc1dpdGgoXCIvXCIpKSB7XG4gICAgICAgIGxpbmsgKz0gXCIvXCI7XG4gICAgICB9XG4gICAgICBsaW5rICs9IGZpbGVOYW1lO1xuICAgIH1cbiAgICByZXR1cm4gbGluaztcbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiBicmFuY2hMaW5rKCRzY29wZSwgcGFnZUlkOiBzdHJpbmcsICRsb2NhdGlvbiwgZmlsZU5hbWU6c3RyaW5nID0gbnVsbCkge1xuICAgIHJldHVybiB2aWV3TGluaygkc2NvcGUsIHBhZ2VJZCwgJGxvY2F0aW9uLCBmaWxlTmFtZSk7XG4gIH1cblxuICBleHBvcnQgZnVuY3Rpb24gZWRpdExpbmsoJHNjb3BlLCBwYWdlSWQ6c3RyaW5nLCAkbG9jYXRpb24pIHtcbiAgICB2YXIgbGluazpzdHJpbmcgPSBudWxsO1xuICAgIHZhciBmb3JtYXQgPSBXaWtpLmZpbGVGb3JtYXQocGFnZUlkKTtcbiAgICBzd2l0Y2ggKGZvcm1hdCkge1xuICAgICAgY2FzZSBcImltYWdlXCI6XG4gICAgICAgIGJyZWFrO1xuICAgICAgZGVmYXVsdDpcbiAgICAgIHZhciBzdGFydCA9IHN0YXJ0TGluaygkc2NvcGUpO1xuICAgICAgaWYgKHBhZ2VJZCkge1xuICAgICAgICBsaW5rID0gc3RhcnQgKyBcIi9lZGl0L1wiICsgZW5jb2RlUGF0aChwYWdlSWQpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gbGV0cyB1c2UgdGhlIGN1cnJlbnQgcGF0aFxuICAgICAgICB2YXIgcGF0aCA9ICRsb2NhdGlvbi5wYXRoKCk7XG4gICAgICAgIGxpbmsgPSBcIiNcIiArIHBhdGgucmVwbGFjZSgvKHZpZXd8Y3JlYXRlKS8sIFwiZWRpdFwiKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGxpbms7XG4gIH1cblxuICBleHBvcnQgZnVuY3Rpb24gY3JlYXRlTGluaygkc2NvcGUsIHBhZ2VJZDpzdHJpbmcsICRsb2NhdGlvbikge1xuICAgIHZhciBwYXRoID0gJGxvY2F0aW9uLnBhdGgoKTtcbiAgICB2YXIgc3RhcnQgPSBzdGFydExpbmsoJHNjb3BlKTtcbiAgICB2YXIgbGluayA9ICcnO1xuICAgIGlmIChwYWdlSWQpIHtcbiAgICAgIGxpbmsgPSBzdGFydCArIFwiL2NyZWF0ZS9cIiArIGVuY29kZVBhdGgocGFnZUlkKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gbGV0cyB1c2UgdGhlIGN1cnJlbnQgcGF0aFxuICAgICAgbGluayA9IFwiI1wiICsgcGF0aC5yZXBsYWNlKC8odmlld3xlZGl0fGZvcm1UYWJsZSkvLCBcImNyZWF0ZVwiKTtcbiAgICB9XG4gICAgLy8gd2UgaGF2ZSB0aGUgbGluayBzbyBsZXRzIG5vdyByZW1vdmUgdGhlIGxhc3QgcGF0aFxuICAgIC8vIG9yIGlmIHRoZXJlIGlzIG5vIC8gaW4gdGhlIHBhdGggdGhlbiByZW1vdmUgdGhlIGxhc3Qgc2VjdGlvblxuICAgIHZhciBpZHggPSBsaW5rLmxhc3RJbmRleE9mKFwiL1wiKTtcbiAgICBpZiAoaWR4ID4gMCAmJiAhJHNjb3BlLmNoaWxkcmVuICYmICFwYXRoLnN0YXJ0c1dpdGgoXCIvd2lraS9mb3JtVGFibGVcIikpIHtcbiAgICAgIGxpbmsgPSBsaW5rLnN1YnN0cmluZygwLCBpZHggKyAxKTtcbiAgICB9XG4gICAgcmV0dXJuIGxpbms7XG4gIH1cblxuICBleHBvcnQgZnVuY3Rpb24gZW5jb2RlUGF0aChwYWdlSWQ6c3RyaW5nKSB7XG4gICAgcmV0dXJuIHBhZ2VJZC5zcGxpdChcIi9cIikubWFwKGVuY29kZVVSSUNvbXBvbmVudCkuam9pbihcIi9cIik7XG4gIH1cblxuICBleHBvcnQgZnVuY3Rpb24gZGVjb2RlUGF0aChwYWdlSWQ6c3RyaW5nKSB7XG4gICAgcmV0dXJuIHBhZ2VJZC5zcGxpdChcIi9cIikubWFwKGRlY29kZVVSSUNvbXBvbmVudCkuam9pbihcIi9cIik7XG4gIH1cblxuICBleHBvcnQgZnVuY3Rpb24gZmlsZUZvcm1hdChuYW1lOnN0cmluZywgZmlsZUV4dGVuc2lvblR5cGVSZWdpc3RyeT8pIHtcbiAgICB2YXIgZXh0ZW5zaW9uID0gZmlsZUV4dGVuc2lvbihuYW1lKTtcbiAgICBpZiAobmFtZSkge1xuICAgICAgaWYgKG5hbWUgPT09IFwiSmVua2luc2ZpbGVcIikge1xuICAgICAgICBleHRlbnNpb24gPSBcImdyb292eVwiO1xuICAgICAgfVxuICAgIH1cbiAgICB2YXIgYW5zd2VyID0gbnVsbDtcbiAgICBpZiAoIWZpbGVFeHRlbnNpb25UeXBlUmVnaXN0cnkpIHtcbiAgICAgIGZpbGVFeHRlbnNpb25UeXBlUmVnaXN0cnkgPSBIYXd0aW9Db3JlLmluamVjdG9yLmdldChcImZpbGVFeHRlbnNpb25UeXBlUmVnaXN0cnlcIik7XG4gICAgfVxuICAgIGFuZ3VsYXIuZm9yRWFjaChmaWxlRXh0ZW5zaW9uVHlwZVJlZ2lzdHJ5LCAoYXJyYXksIGtleSkgPT4ge1xuICAgICAgaWYgKGFycmF5LmluZGV4T2YoZXh0ZW5zaW9uKSA+PSAwKSB7XG4gICAgICAgIGFuc3dlciA9IGtleTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gYW5zd2VyO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgdGhlIGZpbGUgbmFtZSBvZiB0aGUgZ2l2ZW4gcGF0aDsgc3RyaXBwaW5nIG9mZiBhbnkgZGlyZWN0b3JpZXNcbiAgICogQG1ldGhvZCBmaWxlTmFtZVxuICAgKiBAZm9yIFdpa2lcbiAgICogQHN0YXRpY1xuICAgKiBAcGFyYW0ge1N0cmluZ30gcGF0aFxuICAgKiBAcmV0dXJuIHtTdHJpbmd9XG4gICAqL1xuICBleHBvcnQgZnVuY3Rpb24gZmlsZU5hbWUocGF0aDogc3RyaW5nKSB7XG4gICAgaWYgKHBhdGgpIHtcbiAgICAgICB2YXIgaWR4ID0gcGF0aC5sYXN0SW5kZXhPZihcIi9cIik7XG4gICAgICBpZiAoaWR4ID4gMCkge1xuICAgICAgICByZXR1cm4gcGF0aC5zdWJzdHJpbmcoaWR4ICsgMSk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBwYXRoO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgdGhlIGZvbGRlciBvZiB0aGUgZ2l2ZW4gcGF0aCAoZXZlcnl0aGluZyBidXQgdGhlIGxhc3QgcGF0aCBuYW1lKVxuICAgKiBAbWV0aG9kIGZpbGVQYXJlbnRcbiAgICogQGZvciBXaWtpXG4gICAqIEBzdGF0aWNcbiAgICogQHBhcmFtIHtTdHJpbmd9IHBhdGhcbiAgICogQHJldHVybiB7U3RyaW5nfVxuICAgKi9cbiAgZXhwb3J0IGZ1bmN0aW9uIGZpbGVQYXJlbnQocGF0aDogc3RyaW5nKSB7XG4gICAgaWYgKHBhdGgpIHtcbiAgICAgICB2YXIgaWR4ID0gcGF0aC5sYXN0SW5kZXhPZihcIi9cIik7XG4gICAgICBpZiAoaWR4ID4gMCkge1xuICAgICAgICByZXR1cm4gcGF0aC5zdWJzdHJpbmcoMCwgaWR4KTtcbiAgICAgIH1cbiAgICB9XG4gICAgLy8gbGV0cyByZXR1cm4gdGhlIHJvb3QgZGlyZWN0b3J5XG4gICAgcmV0dXJuIFwiXCI7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyB0aGUgZmlsZSBuYW1lIGZvciB0aGUgZ2l2ZW4gbmFtZTsgd2UgaGlkZSBzb21lIGV4dGVuc2lvbnNcbiAgICogQG1ldGhvZCBoaWRlRmluZU5hbWVFeHRlbnNpb25zXG4gICAqIEBmb3IgV2lraVxuICAgKiBAc3RhdGljXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBuYW1lXG4gICAqIEByZXR1cm4ge1N0cmluZ31cbiAgICovXG4gIGV4cG9ydCBmdW5jdGlvbiBoaWRlRmlsZU5hbWVFeHRlbnNpb25zKG5hbWUpIHtcbiAgICBpZiAobmFtZSkge1xuICAgICAgYW5ndWxhci5mb3JFYWNoKFdpa2kuaGlkZUV4dGVuc2lvbnMsIChleHRlbnNpb24pID0+IHtcbiAgICAgICAgaWYgKG5hbWUuZW5kc1dpdGgoZXh0ZW5zaW9uKSkge1xuICAgICAgICAgIG5hbWUgPSBuYW1lLnN1YnN0cmluZygwLCBuYW1lLmxlbmd0aCAtIGV4dGVuc2lvbi5sZW5ndGgpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG4gICAgcmV0dXJuIG5hbWU7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyB0aGUgVVJMIHRvIHBlcmZvcm0gYSBHRVQgb3IgUE9TVCBmb3IgdGhlIGdpdmVuIGJyYW5jaCBuYW1lIGFuZCBwYXRoXG4gICAqL1xuICBleHBvcnQgZnVuY3Rpb24gZ2l0UmVzdFVSTCgkc2NvcGUsIHBhdGg6IHN0cmluZykge1xuICAgIHZhciB1cmwgPSBnaXRSZWxhdGl2ZVVSTCgkc2NvcGUsIHBhdGgpO1xuICAgIHVybCA9IENvcmUudXJsKCcvJyArIHVybCk7XG5cbi8qXG4gICAgdmFyIGNvbm5lY3Rpb25OYW1lID0gQ29yZS5nZXRDb25uZWN0aW9uTmFtZVBhcmFtZXRlcigpO1xuICAgIGlmIChjb25uZWN0aW9uTmFtZSkge1xuICAgICAgdmFyIGNvbm5lY3Rpb25PcHRpb25zID0gQ29yZS5nZXRDb25uZWN0T3B0aW9ucyhjb25uZWN0aW9uTmFtZSk7XG4gICAgICBpZiAoY29ubmVjdGlvbk9wdGlvbnMpIHtcbiAgICAgICAgY29ubmVjdGlvbk9wdGlvbnMucGF0aCA9IHVybDtcbiAgICAgICAgdXJsID0gPHN0cmluZz5Db3JlLmNyZWF0ZVNlcnZlckNvbm5lY3Rpb25VcmwoY29ubmVjdGlvbk9wdGlvbnMpO1xuICAgICAgfVxuICAgIH1cblxuKi9cbiAgICByZXR1cm4gdXJsO1xuICB9XG5cbiAgICBmdW5jdGlvbiBnaXRVcmxQcmVmaXgoKSB7XG4gICAgICAgIHZhciBwcmVmaXggPSBcIlwiO1xuICAgICAgICB2YXIgaW5qZWN0b3IgPSBIYXd0aW9Db3JlLmluamVjdG9yO1xuICAgICAgICBpZiAoaW5qZWN0b3IpIHtcbiAgICAgICAgICAgIHByZWZpeCA9IGluamVjdG9yLmdldChcIldpa2lHaXRVcmxQcmVmaXhcIikgfHwgXCJcIjtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcHJlZml4O1xuICAgIH1cblxuICAgIC8qKlxuICAgKiBSZXR1cm5zIGEgcmVsYXRpdmUgVVJMIHRvIHBlcmZvcm0gYSBHRVQgb3IgUE9TVCBmb3IgdGhlIGdpdmVuIGJyYW5jaC9wYXRoXG4gICAqL1xuICBleHBvcnQgZnVuY3Rpb24gZ2l0UmVsYXRpdmVVUkwoJHNjb3BlLCBwYXRoOiBzdHJpbmcpIHtcbiAgICAgIHZhciBicmFuY2ggPSAkc2NvcGUuYnJhbmNoO1xuICAgIHZhciBwcmVmaXggPSBnaXRVcmxQcmVmaXgoKTtcbiAgICBicmFuY2ggPSBicmFuY2ggfHwgXCJtYXN0ZXJcIjtcbiAgICBwYXRoID0gcGF0aCB8fCBcIi9cIjtcbiAgICByZXR1cm4gVXJsSGVscGVycy5qb2luKHByZWZpeCwgXCJnaXQvXCIgKyBicmFuY2gsIHBhdGgpO1xuICB9XG5cblxuICAvKipcbiAgICogVGFrZXMgYSByb3cgY29udGFpbmluZyB0aGUgZW50aXR5IG9iamVjdDsgb3IgY2FuIHRha2UgdGhlIGVudGl0eSBkaXJlY3RseS5cbiAgICpcbiAgICogSXQgdGhlbiB1c2VzIHRoZSBuYW1lLCBkaXJlY3RvcnkgYW5kIHhtbE5hbWVzcGFjZXMgcHJvcGVydGllc1xuICAgKlxuICAgKiBAbWV0aG9kIGZpbGVJY29uSHRtbFxuICAgKiBAZm9yIFdpa2lcbiAgICogQHN0YXRpY1xuICAgKiBAcGFyYW0ge2FueX0gcm93XG4gICAqIEByZXR1cm4ge1N0cmluZ31cbiAgICpcbiAgICovXG4gIGV4cG9ydCBmdW5jdGlvbiBmaWxlSWNvbkh0bWwocm93KSB7XG4gICAgdmFyIG5hbWUgPSByb3cubmFtZTtcbiAgICB2YXIgcGF0aCA9IHJvdy5wYXRoO1xuICAgIHZhciBicmFuY2ggPSByb3cuYnJhbmNoIDtcbiAgICB2YXIgZGlyZWN0b3J5ID0gcm93LmRpcmVjdG9yeTtcbiAgICB2YXIgeG1sTmFtZXNwYWNlcyA9IHJvdy54bWxfbmFtZXNwYWNlcyB8fCByb3cueG1sTmFtZXNwYWNlcztcbiAgICB2YXIgaWNvblVybCA9IHJvdy5pY29uVXJsO1xuICAgIHZhciBlbnRpdHkgPSByb3cuZW50aXR5O1xuICAgIGlmIChlbnRpdHkpIHtcbiAgICAgIG5hbWUgPSBuYW1lIHx8IGVudGl0eS5uYW1lO1xuICAgICAgcGF0aCA9IHBhdGggfHwgZW50aXR5LnBhdGg7XG4gICAgICBicmFuY2ggPSBicmFuY2ggfHwgZW50aXR5LmJyYW5jaDtcbiAgICAgIGRpcmVjdG9yeSA9IGRpcmVjdG9yeSB8fCBlbnRpdHkuZGlyZWN0b3J5O1xuICAgICAgeG1sTmFtZXNwYWNlcyA9IHhtbE5hbWVzcGFjZXMgfHwgZW50aXR5LnhtbF9uYW1lc3BhY2VzIHx8IGVudGl0eS54bWxOYW1lc3BhY2VzO1xuICAgICAgaWNvblVybCA9IGljb25VcmwgfHwgZW50aXR5Lmljb25Vcmw7XG4gICAgfVxuICAgIGJyYW5jaCA9IGJyYW5jaCB8fCBcIm1hc3RlclwiO1xuICAgIHZhciBjc3MgPSBudWxsO1xuICAgIHZhciBpY29uOnN0cmluZyA9IG51bGw7XG4gICAgdmFyIGV4dGVuc2lvbiA9IGZpbGVFeHRlbnNpb24obmFtZSk7XG4gICAgLy8gVE9ETyBjb3VsZCB3ZSB1c2UgZGlmZmVyZW50IGljb25zIGZvciBtYXJrZG93biB2IHhtbCB2IGh0bWxcbiAgICBpZiAoeG1sTmFtZXNwYWNlcyAmJiB4bWxOYW1lc3BhY2VzLmxlbmd0aCkge1xuICAgICAgaWYgKHhtbE5hbWVzcGFjZXMuYW55KChucykgPT4gV2lraS5jYW1lbE5hbWVzcGFjZXMuYW55KG5zKSkpIHtcbiAgICAgICAgaWNvbiA9IFwiaW1nL2ljb25zL2NhbWVsLnN2Z1wiO1xuICAgICAgfSBlbHNlIGlmICh4bWxOYW1lc3BhY2VzLmFueSgobnMpID0+IFdpa2kuZG96ZXJOYW1lc3BhY2VzLmFueShucykpKSB7XG4gICAgICAgIGljb24gPSBcImltZy9pY29ucy9kb3plci9kb3plci5naWZcIjtcbiAgICAgIH0gZWxzZSBpZiAoeG1sTmFtZXNwYWNlcy5hbnkoKG5zKSA9PiBXaWtpLmFjdGl2ZW1xTmFtZXNwYWNlcy5hbnkobnMpKSkge1xuICAgICAgICBpY29uID0gXCJpbWcvaWNvbnMvbWVzc2FnZWJyb2tlci5zdmdcIjtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGxvZy5kZWJ1ZyhcImZpbGUgXCIgKyBuYW1lICsgXCIgaGFzIG5hbWVzcGFjZXMgXCIgKyB4bWxOYW1lc3BhY2VzKTtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKCFpY29uVXJsICYmIG5hbWUpIHtcbiAgICAgIHZhciBsb3dlck5hbWUgPSBuYW1lLnRvTG93ZXJDYXNlKCk7XG4gICAgICBpZiAobG93ZXJOYW1lID09IFwicG9tLnhtbFwiKSB7XG4gICAgICAgIGljb25VcmwgPSBcImltZy9tYXZlbi1pY29uLnBuZ1wiO1xuICAgICAgfSBlbHNlIGlmIChsb3dlck5hbWUgPT0gXCJqZW5raW5zZmlsZVwiKSB7XG4gICAgICAgIGljb25VcmwgPSBcImltZy9qZW5raW5zLWljb24uc3ZnXCI7XG4gICAgICB9IGVsc2UgaWYgKGxvd2VyTmFtZSA9PSBcImZhYnJpYzgueW1sXCIpIHtcbiAgICAgICAgaWNvblVybCA9IFwiaW1nL2ZhYnJpYzhfaWNvbi5zdmdcIjtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoaWNvblVybCkge1xuICAgICAgY3NzID0gbnVsbDtcbiAgICAgIGljb24gPSBpY29uVXJsO1xuLypcbiAgICAgIHZhciBwcmVmaXggPSBnaXRVcmxQcmVmaXgoKTtcbiAgICAgIGljb24gPSBVcmxIZWxwZXJzLmpvaW4ocHJlZml4LCBcImdpdFwiLCBpY29uVXJsKTtcbiovXG4vKlxuICAgICAgdmFyIGNvbm5lY3Rpb25OYW1lID0gQ29yZS5nZXRDb25uZWN0aW9uTmFtZVBhcmFtZXRlcigpO1xuICAgICAgaWYgKGNvbm5lY3Rpb25OYW1lKSB7XG4gICAgICAgIHZhciBjb25uZWN0aW9uT3B0aW9ucyA9IENvcmUuZ2V0Q29ubmVjdE9wdGlvbnMoY29ubmVjdGlvbk5hbWUpO1xuICAgICAgICBpZiAoY29ubmVjdGlvbk9wdGlvbnMpIHtcbiAgICAgICAgICBjb25uZWN0aW9uT3B0aW9ucy5wYXRoID0gQ29yZS51cmwoJy8nICsgaWNvbik7XG4gICAgICAgICAgaWNvbiA9IDxzdHJpbmc+Q29yZS5jcmVhdGVTZXJ2ZXJDb25uZWN0aW9uVXJsKGNvbm5lY3Rpb25PcHRpb25zKTtcbiAgICAgICAgfVxuICAgICAgfVxuKi9cbiAgICB9XG4gICAgaWYgKCFpY29uKSB7XG4gICAgICBpZiAoZGlyZWN0b3J5KSB7XG4gICAgICAgIHN3aXRjaCAoZXh0ZW5zaW9uKSB7XG4gICAgICAgICAgY2FzZSAncHJvZmlsZSc6XG4gICAgICAgICAgICBjc3MgPSBcImZhIGZhLWJvb2tcIjtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAvLyBsb2cuZGVidWcoXCJObyBtYXRjaCBmb3IgZXh0ZW5zaW9uOiBcIiwgZXh0ZW5zaW9uLCBcIiB1c2luZyBhIGdlbmVyaWMgZm9sZGVyIGljb25cIik7XG4gICAgICAgICAgICBjc3MgPSBcImZhIGZhLWZvbGRlciBmb2xkZXItaWNvblwiO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzd2l0Y2ggKGV4dGVuc2lvbikge1xuICAgICAgICAgIGNhc2UgJ2phdmEnOlxuICAgICAgICAgICAgaWNvbiA9IFwiaW1nL2phdmEuc3ZnXCI7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICBjYXNlICdwbmcnOlxuICAgICAgICAgIGNhc2UgJ3N2Zyc6XG4gICAgICAgICAgY2FzZSAnanBnJzpcbiAgICAgICAgICBjYXNlICdnaWYnOlxuICAgICAgICAgICAgY3NzID0gbnVsbDtcbiAgICAgICAgICAgIGljb24gPSBXaWtpLmdpdFJlbGF0aXZlVVJMKGJyYW5jaCwgcGF0aCk7XG4vKlxuICAgICAgICAgICAgdmFyIGNvbm5lY3Rpb25OYW1lID0gQ29yZS5nZXRDb25uZWN0aW9uTmFtZVBhcmFtZXRlcigpO1xuICAgICAgICAgICAgaWYgKGNvbm5lY3Rpb25OYW1lKSB7XG4gICAgICAgICAgICAgIHZhciBjb25uZWN0aW9uT3B0aW9ucyA9IENvcmUuZ2V0Q29ubmVjdE9wdGlvbnMoY29ubmVjdGlvbk5hbWUpO1xuICAgICAgICAgICAgICBpZiAoY29ubmVjdGlvbk9wdGlvbnMpIHtcbiAgICAgICAgICAgICAgICBjb25uZWN0aW9uT3B0aW9ucy5wYXRoID0gQ29yZS51cmwoJy8nICsgaWNvbik7XG4gICAgICAgICAgICAgICAgaWNvbiA9IDxzdHJpbmc+Q29yZS5jcmVhdGVTZXJ2ZXJDb25uZWN0aW9uVXJsKGNvbm5lY3Rpb25PcHRpb25zKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuKi9cbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIGNhc2UgJ2pzb24nOlxuICAgICAgICAgIGNhc2UgJ3htbCc6XG4gICAgICAgICAgICBjc3MgPSBcImZhIGZhLWZpbGUtdGV4dFwiO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgY2FzZSAnbWQnOlxuICAgICAgICAgICAgY3NzID0gXCJmYSBmYS1maWxlLXRleHQtb1wiO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIC8vIGxvZy5kZWJ1ZyhcIk5vIG1hdGNoIGZvciBleHRlbnNpb246IFwiLCBleHRlbnNpb24sIFwiIHVzaW5nIGEgZ2VuZXJpYyBmaWxlIGljb25cIik7XG4gICAgICAgICAgICBjc3MgPSBcImZhIGZhLWZpbGUtb1wiO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIGlmIChpY29uKSB7XG4gICAgICByZXR1cm4gXCI8aW1nIHNyYz0nXCIgKyBDb3JlLnVybChpY29uKSArIFwiJz5cIjtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIFwiPGkgY2xhc3M9J1wiICsgY3NzICsgXCInPjwvaT5cIjtcbiAgICB9XG4gIH1cblxuICBleHBvcnQgZnVuY3Rpb24gaWNvbkNsYXNzKHJvdykge1xuICAgIHZhciBuYW1lID0gcm93LmdldFByb3BlcnR5KFwibmFtZVwiKTtcbiAgICB2YXIgZXh0ZW5zaW9uID0gZmlsZUV4dGVuc2lvbihuYW1lKTtcbiAgICB2YXIgZGlyZWN0b3J5ID0gcm93LmdldFByb3BlcnR5KFwiZGlyZWN0b3J5XCIpO1xuICAgIGlmIChkaXJlY3RvcnkpIHtcbiAgICAgIHJldHVybiBcImZhIGZhLWZvbGRlclwiO1xuICAgIH1cbiAgICBpZiAoXCJ4bWxcIiA9PT0gZXh0ZW5zaW9uKSB7XG4gICAgICAgIHJldHVybiBcImZhIGZhLWNvZ1wiO1xuICAgIH0gZWxzZSBpZiAoXCJtZFwiID09PSBleHRlbnNpb24pIHtcbiAgICAgICAgcmV0dXJuIFwiZmEgZmEtZmlsZS10ZXh0LW9cIjtcbiAgICB9XG4gICAgLy8gVE9ETyBjb3VsZCB3ZSB1c2UgZGlmZmVyZW50IGljb25zIGZvciBtYXJrZG93biB2IHhtbCB2IGh0bWxcbiAgICByZXR1cm4gXCJmYSBmYS1maWxlLW9cIjtcbiAgfVxuXG5cbiAgLyoqXG4gICAqIEV4dHJhY3RzIHRoZSBwYWdlSWQsIGJyYW5jaCwgb2JqZWN0SWQgZnJvbSB0aGUgcm91dGUgcGFyYW1ldGVyc1xuICAgKiBAbWV0aG9kIGluaXRTY29wZVxuICAgKiBAZm9yIFdpa2lcbiAgICogQHN0YXRpY1xuICAgKiBAcGFyYW0geyp9ICRzY29wZVxuICAgKiBAcGFyYW0ge2FueX0gJHJvdXRlUGFyYW1zXG4gICAqIEBwYXJhbSB7bmcuSUxvY2F0aW9uU2VydmljZX0gJGxvY2F0aW9uXG4gICAqL1xuICBleHBvcnQgZnVuY3Rpb24gaW5pdFNjb3BlKCRzY29wZSwgJHJvdXRlUGFyYW1zLCAkbG9jYXRpb24pIHtcbiAgICAkc2NvcGUucGFnZUlkID0gV2lraS5wYWdlSWQoJHJvdXRlUGFyYW1zLCAkbG9jYXRpb24pO1xuICAgICRzY29wZS5vd25lciA9ICRyb3V0ZVBhcmFtc1tcIm93bmVyXCJdO1xuICAgICRzY29wZS5yZXBvSWQgPSAkcm91dGVQYXJhbXNbXCJyZXBvSWRcIl07XG4gICAgJHNjb3BlLnByb2plY3RJZCA9ICRyb3V0ZVBhcmFtc1tcInByb2plY3RJZFwiXTtcbiAgICAkc2NvcGUubmFtZXNwYWNlID0gJHJvdXRlUGFyYW1zW1wibmFtZXNwYWNlXCJdO1xuICAgICRzY29wZS5icmFuY2ggPSAkcm91dGVQYXJhbXNbXCJicmFuY2hcIl0gfHwgJGxvY2F0aW9uLnNlYXJjaCgpW1wiYnJhbmNoXCJdO1xuICAgICRzY29wZS5vYmplY3RJZCA9ICRyb3V0ZVBhcmFtc1tcIm9iamVjdElkXCJdIHx8ICRyb3V0ZVBhcmFtc1tcImRpZmZPYmplY3RJZDFcIl07XG4gICAgJHNjb3BlLnN0YXJ0TGluayA9IHN0YXJ0TGluaygkc2NvcGUpO1xuICAgICRzY29wZS4kdmlld0xpbmsgPSB2aWV3TGluaygkc2NvcGUsICRzY29wZS5wYWdlSWQsICRsb2NhdGlvbik7XG4gICAgJHNjb3BlLmhpc3RvcnlMaW5rID0gc3RhcnRMaW5rKCRzY29wZSkgKyBcIi9oaXN0b3J5L1wiICsgKCRzY29wZS5wYWdlSWQgfHwgXCJcIik7XG4gICAgJHNjb3BlLndpa2lSZXBvc2l0b3J5ID0gbmV3IEdpdFdpa2lSZXBvc2l0b3J5KCRzY29wZSk7XG5cbiAgICAkc2NvcGUuJHdvcmtzcGFjZUxpbmsgPSBEZXZlbG9wZXIud29ya3NwYWNlTGluaygpO1xuICAgICRzY29wZS4kcHJvamVjdExpbmsgPSBEZXZlbG9wZXIucHJvamVjdExpbmsoJHNjb3BlLnByb2plY3RJZCk7XG4gICAgJHNjb3BlLmJyZWFkY3J1bWJDb25maWcgPSBEZXZlbG9wZXIuY3JlYXRlUHJvamVjdEJyZWFkY3J1bWJzKCRzY29wZS5wcm9qZWN0SWQsIGNyZWF0ZVNvdXJjZUJyZWFkY3J1bWJzKCRzY29wZSkpO1xuICAgICRzY29wZS5zdWJUYWJDb25maWcgPSBEZXZlbG9wZXIuY3JlYXRlUHJvamVjdFN1Yk5hdkJhcnMoJHNjb3BlLnByb2plY3RJZCk7XG4gIH1cblxuICAvKipcbiAgICogTG9hZHMgdGhlIGJyYW5jaGVzIGZvciB0aGlzIHdpa2kgcmVwb3NpdG9yeSBhbmQgc3RvcmVzIHRoZW0gaW4gdGhlIGJyYW5jaGVzIHByb3BlcnR5IGluXG4gICAqIHRoZSAkc2NvcGUgYW5kIGVuc3VyZXMgJHNjb3BlLmJyYW5jaCBpcyBzZXQgdG8gYSB2YWxpZCB2YWx1ZVxuICAgKlxuICAgKiBAcGFyYW0gd2lraVJlcG9zaXRvcnlcbiAgICogQHBhcmFtICRzY29wZVxuICAgKiBAcGFyYW0gaXNGbWMgd2hldGhlciB3ZSBydW4gYXMgZmFicmljOCBvciBhcyBoYXd0aW9cbiAgICovXG4gIGV4cG9ydCBmdW5jdGlvbiBsb2FkQnJhbmNoZXMoam9sb2tpYSwgd2lraVJlcG9zaXRvcnksICRzY29wZSwgaXNGbWMgPSBmYWxzZSkge1xuICAgIHdpa2lSZXBvc2l0b3J5LmJyYW5jaGVzKChyZXNwb25zZSkgPT4ge1xuICAgICAgLy8gbGV0cyBzb3J0IGJ5IHZlcnNpb24gbnVtYmVyXG4gICAgICAkc2NvcGUuYnJhbmNoZXMgPSByZXNwb25zZS5zb3J0QnkoKHYpID0+IENvcmUudmVyc2lvblRvU29ydGFibGVTdHJpbmcodiksIHRydWUpO1xuXG4gICAgICAvLyBkZWZhdWx0IHRoZSBicmFuY2ggbmFtZSBpZiB3ZSBoYXZlICdtYXN0ZXInXG4gICAgICBpZiAoISRzY29wZS5icmFuY2ggJiYgJHNjb3BlLmJyYW5jaGVzLmZpbmQoKGJyYW5jaCkgPT4ge1xuICAgICAgICByZXR1cm4gYnJhbmNoID09PSBcIm1hc3RlclwiO1xuICAgICAgfSkpIHtcbiAgICAgICAgJHNjb3BlLmJyYW5jaCA9IFwibWFzdGVyXCI7XG4gICAgICB9XG4gICAgICBDb3JlLiRhcHBseSgkc2NvcGUpO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIEV4dHJhY3RzIHRoZSBwYWdlSWQgZnJvbSB0aGUgcm91dGUgcGFyYW1ldGVyc1xuICAgKiBAbWV0aG9kIHBhZ2VJZFxuICAgKiBAZm9yIFdpa2lcbiAgICogQHN0YXRpY1xuICAgKiBAcGFyYW0ge2FueX0gJHJvdXRlUGFyYW1zXG4gICAqIEBwYXJhbSBAbmcuSUxvY2F0aW9uU2VydmljZSBAbG9jYXRpb25cbiAgICogQHJldHVybiB7U3RyaW5nfVxuICAgKi9cbiAgZXhwb3J0IGZ1bmN0aW9uIHBhZ2VJZCgkcm91dGVQYXJhbXMsICRsb2NhdGlvbikge1xuICAgIHZhciBwYWdlSWQgPSAkcm91dGVQYXJhbXNbJ3BhZ2UnXTtcbiAgICBpZiAoIXBhZ2VJZCkge1xuICAgICAgLy8gTGV0cyBkZWFsIHdpdGggdGhlIGhhY2sgb2YgQW5ndWxhckpTIG5vdCBzdXBwb3J0aW5nIC8gaW4gYSBwYXRoIHZhcmlhYmxlXG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IDEwMDsgaSsrKSB7XG4gICAgICAgIHZhciB2YWx1ZSA9ICRyb3V0ZVBhcmFtc1sncGF0aCcgKyBpXTtcbiAgICAgICAgaWYgKGFuZ3VsYXIuaXNEZWZpbmVkKHZhbHVlKSkge1xuICAgICAgICAgIGlmICghcGFnZUlkKSB7XG4gICAgICAgICAgICBwYWdlSWQgPSB2YWx1ZTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcGFnZUlkICs9IFwiL1wiICsgdmFsdWU7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgYnJlYWs7XG4gICAgICB9XG4gICAgICByZXR1cm4gcGFnZUlkIHx8IFwiL1wiO1xuICAgIH1cblxuICAgIC8vIGlmIG5vICRyb3V0ZVBhcmFtcyB2YXJpYWJsZXMgbGV0cyBmaWd1cmUgaXQgb3V0IGZyb20gdGhlICRsb2NhdGlvblxuICAgIGlmICghcGFnZUlkKSB7XG4gICAgICBwYWdlSWQgPSBwYWdlSWRGcm9tVVJJKCRsb2NhdGlvbi5wYXRoKCkpO1xuICAgIH1cbiAgICByZXR1cm4gcGFnZUlkO1xuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIHBhZ2VJZEZyb21VUkkodXJsOnN0cmluZykge1xuICAgIHZhciB3aWtpUHJlZml4ID0gXCIvd2lraS9cIjtcbiAgICBpZiAodXJsICYmIHVybC5zdGFydHNXaXRoKHdpa2lQcmVmaXgpKSB7XG4gICAgICB2YXIgaWR4ID0gdXJsLmluZGV4T2YoXCIvXCIsIHdpa2lQcmVmaXgubGVuZ3RoICsgMSk7XG4gICAgICBpZiAoaWR4ID4gMCkge1xuICAgICAgICByZXR1cm4gdXJsLnN1YnN0cmluZyhpZHggKyAxLCB1cmwubGVuZ3RoKVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbnVsbFxuXG4gIH1cblxuICBleHBvcnQgZnVuY3Rpb24gZmlsZUV4dGVuc2lvbihuYW1lKSB7XG4gICAgaWYgKG5hbWUuaW5kZXhPZignIycpID4gMClcbiAgICAgIG5hbWUgPSBuYW1lLnN1YnN0cmluZygwLCBuYW1lLmluZGV4T2YoJyMnKSk7XG4gICAgcmV0dXJuIENvcmUuZmlsZUV4dGVuc2lvbihuYW1lLCBcIm1hcmtkb3duXCIpO1xuICB9XG5cblxuICBleHBvcnQgZnVuY3Rpb24gb25Db21wbGV0ZShzdGF0dXMpIHtcbiAgICBjb25zb2xlLmxvZyhcIkNvbXBsZXRlZCBvcGVyYXRpb24gd2l0aCBzdGF0dXM6IFwiICsgSlNPTi5zdHJpbmdpZnkoc3RhdHVzKSk7XG4gIH1cblxuICAvKipcbiAgICogUGFyc2VzIHRoZSBnaXZlbiBKU09OIHRleHQgcmVwb3J0aW5nIHRvIHRoZSB1c2VyIGlmIHRoZXJlIGlzIGEgcGFyc2UgZXJyb3JcbiAgICogQG1ldGhvZCBwYXJzZUpzb25cbiAgICogQGZvciBXaWtpXG4gICAqIEBzdGF0aWNcbiAgICogQHBhcmFtIHtTdHJpbmd9IHRleHRcbiAgICogQHJldHVybiB7YW55fVxuICAgKi9cbiAgZXhwb3J0IGZ1bmN0aW9uIHBhcnNlSnNvbih0ZXh0OnN0cmluZykge1xuICAgIGlmICh0ZXh0KSB7XG4gICAgICB0cnkge1xuICAgICAgICByZXR1cm4gSlNPTi5wYXJzZSh0ZXh0KTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgQ29yZS5ub3RpZmljYXRpb24oXCJlcnJvclwiLCBcIkZhaWxlZCB0byBwYXJzZSBKU09OOiBcIiArIGUpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIC8qKlxuICAgKiBBZGp1c3RzIGEgcmVsYXRpdmUgb3IgYWJzb2x1dGUgbGluayBmcm9tIGEgd2lraSBvciBmaWxlIHN5c3RlbSB0byBvbmUgdXNpbmcgdGhlIGhhc2ggYmFuZyBzeW50YXhcbiAgICogQG1ldGhvZCBhZGp1c3RIcmVmXG4gICAqIEBmb3IgV2lraVxuICAgKiBAc3RhdGljXG4gICAqIEBwYXJhbSB7Kn0gJHNjb3BlXG4gICAqIEBwYXJhbSB7bmcuSUxvY2F0aW9uU2VydmljZX0gJGxvY2F0aW9uXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBocmVmXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBmaWxlRXh0ZW5zaW9uXG4gICAqIEByZXR1cm4ge3N0cmluZ31cbiAgICovXG4gIGV4cG9ydCBmdW5jdGlvbiBhZGp1c3RIcmVmKCRzY29wZSwgJGxvY2F0aW9uLCBocmVmLCBmaWxlRXh0ZW5zaW9uKSB7XG4gICAgdmFyIGV4dGVuc2lvbiA9IGZpbGVFeHRlbnNpb24gPyBcIi5cIiArIGZpbGVFeHRlbnNpb24gOiBcIlwiO1xuXG4gICAgLy8gaWYgdGhlIGxhc3QgcGFydCBvZiB0aGUgcGF0aCBoYXMgYSBkb3QgaW4gaXQgbGV0c1xuICAgIC8vIGV4Y2x1ZGUgaXQgYXMgd2UgYXJlIHJlbGF0aXZlIHRvIGEgbWFya2Rvd24gb3IgaHRtbCBmaWxlIGluIGEgZm9sZGVyXG4gICAgLy8gc3VjaCBhcyB3aGVuIHZpZXdpbmcgcmVhZG1lLm1kIG9yIGluZGV4Lm1kXG4gICAgdmFyIHBhdGggPSAkbG9jYXRpb24ucGF0aCgpO1xuICAgIHZhciBmb2xkZXJQYXRoID0gcGF0aDtcbiAgICB2YXIgaWR4ID0gcGF0aC5sYXN0SW5kZXhPZihcIi9cIik7XG4gICAgaWYgKGlkeCA+IDApIHtcbiAgICAgIHZhciBsYXN0TmFtZSA9IHBhdGguc3Vic3RyaW5nKGlkeCArIDEpO1xuICAgICAgaWYgKGxhc3ROYW1lLmluZGV4T2YoXCIuXCIpID49IDApIHtcbiAgICAgICAgZm9sZGVyUGF0aCA9IHBhdGguc3Vic3RyaW5nKDAsIGlkeCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gRGVhbCB3aXRoIHJlbGF0aXZlIFVSTHMgZmlyc3QuLi5cbiAgICBpZiAoaHJlZi5zdGFydHNXaXRoKCcuLi8nKSkge1xuICAgICAgdmFyIHBhcnRzID0gaHJlZi5zcGxpdCgnLycpO1xuICAgICAgdmFyIHBhdGhQYXJ0cyA9IGZvbGRlclBhdGguc3BsaXQoJy8nKTtcbiAgICAgIHZhciBwYXJlbnRzID0gcGFydHMuZmlsdGVyKChwYXJ0KSA9PiB7XG4gICAgICAgIHJldHVybiBwYXJ0ID09PSBcIi4uXCI7XG4gICAgICB9KTtcbiAgICAgIHBhcnRzID0gcGFydHMubGFzdChwYXJ0cy5sZW5ndGggLSBwYXJlbnRzLmxlbmd0aCk7XG4gICAgICBwYXRoUGFydHMgPSBwYXRoUGFydHMuZmlyc3QocGF0aFBhcnRzLmxlbmd0aCAtIHBhcmVudHMubGVuZ3RoKTtcblxuICAgICAgcmV0dXJuICcjJyArIHBhdGhQYXJ0cy5qb2luKCcvJykgKyAnLycgKyBwYXJ0cy5qb2luKCcvJykgKyBleHRlbnNpb24gKyAkbG9jYXRpb24uaGFzaCgpO1xuICAgIH1cblxuICAgIC8vIFR1cm4gYW4gYWJzb2x1dGUgbGluayBpbnRvIGEgd2lraSBsaW5rLi4uXG4gICAgaWYgKGhyZWYuc3RhcnRzV2l0aCgnLycpKSB7XG4gICAgICByZXR1cm4gV2lraS5icmFuY2hMaW5rKCRzY29wZSwgaHJlZiArIGV4dGVuc2lvbiwgJGxvY2F0aW9uKSArIGV4dGVuc2lvbjtcbiAgICB9XG5cbiAgICBpZiAoIVdpa2kuZXhjbHVkZUFkanVzdG1lbnRQcmVmaXhlcy5hbnkoKGV4Y2x1ZGUpID0+IHtcbiAgICAgIHJldHVybiBocmVmLnN0YXJ0c1dpdGgoZXhjbHVkZSk7XG4gICAgfSkpIHtcbiAgICAgIHJldHVybiAnIycgKyBmb2xkZXJQYXRoICsgXCIvXCIgKyBocmVmICsgZXh0ZW5zaW9uICsgJGxvY2F0aW9uLmhhc2goKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICB9XG59XG4iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vaW5jbHVkZXMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwid2lraUhlbHBlcnMudHNcIi8+XG5cbi8qKlxuICogQG1vZHVsZSBXaWtpXG4gKiBAbWFpbiBXaWtpXG4gKi9cbm1vZHVsZSBXaWtpIHtcblxuICBleHBvcnQgdmFyIHBsdWdpbk5hbWUgPSAnd2lraSc7XG4gIGV4cG9ydCB2YXIgdGVtcGxhdGVQYXRoID0gJ3BsdWdpbnMvd2lraS9odG1sLyc7XG4gIGV4cG9ydCB2YXIgdGFiOmFueSA9IG51bGw7XG5cbiAgZXhwb3J0IHZhciBfbW9kdWxlID0gYW5ndWxhci5tb2R1bGUocGx1Z2luTmFtZSwgWydoYXd0aW8tY29yZScsICdoYXd0aW8tdWknLCAndHJlZUNvbnRyb2wnLCAndWkuY29kZW1pcnJvciddKTtcbiAgZXhwb3J0IHZhciBjb250cm9sbGVyID0gUGx1Z2luSGVscGVycy5jcmVhdGVDb250cm9sbGVyRnVuY3Rpb24oX21vZHVsZSwgJ1dpa2knKTtcbiAgZXhwb3J0IHZhciByb3V0ZSA9IFBsdWdpbkhlbHBlcnMuY3JlYXRlUm91dGluZ0Z1bmN0aW9uKHRlbXBsYXRlUGF0aCk7XG5cbiAgX21vZHVsZS5jb25maWcoW1wiJHJvdXRlUHJvdmlkZXJcIiwgKCRyb3V0ZVByb3ZpZGVyKSA9PiB7XG5cbiAgICAvLyBhbGxvdyBvcHRpb25hbCBicmFuY2ggcGF0aHMuLi5cbiAgICBhbmd1bGFyLmZvckVhY2goW1wiXCIsIFwiL2JyYW5jaC86YnJhbmNoXCJdLCAocGF0aCkgPT4ge1xuICAgICAgLy92YXIgc3RhcnRDb250ZXh0ID0gJy93aWtpJztcbiAgICAgIHZhciBzdGFydENvbnRleHQgPSAnL3dvcmtzcGFjZXMvOm5hbWVzcGFjZS9wcm9qZWN0cy86cHJvamVjdElkL3dpa2kvOm93bmVyLzpyZXBvSWQnO1xuICAgICAgJHJvdXRlUHJvdmlkZXIuXG4gICAgICAgICAgICAgIHdoZW4oVXJsSGVscGVycy5qb2luKHN0YXJ0Q29udGV4dCwgcGF0aCwgJ3ZpZXcnKSwgcm91dGUoJ3ZpZXdQYWdlLmh0bWwnLCBmYWxzZSkpLlxuICAgICAgICAgICAgICB3aGVuKFVybEhlbHBlcnMuam9pbihzdGFydENvbnRleHQsIHBhdGgsICdjcmVhdGUvOnBhZ2UqJyksIHJvdXRlKCdjcmVhdGUuaHRtbCcsIGZhbHNlKSkuXG4gICAgICAgICAgICAgIHdoZW4oc3RhcnRDb250ZXh0ICsgcGF0aCArICcvdmlldy86cGFnZSonLCB7dGVtcGxhdGVVcmw6ICdwbHVnaW5zL3dpa2kvaHRtbC92aWV3UGFnZS5odG1sJywgcmVsb2FkT25TZWFyY2g6IGZhbHNlfSkuXG4gICAgICAgICAgICAgIHdoZW4oc3RhcnRDb250ZXh0ICsgcGF0aCArICcvYm9vay86cGFnZSonLCB7dGVtcGxhdGVVcmw6ICdwbHVnaW5zL3dpa2kvaHRtbC92aWV3Qm9vay5odG1sJywgcmVsb2FkT25TZWFyY2g6IGZhbHNlfSkuXG4gICAgICAgICAgICAgIHdoZW4oc3RhcnRDb250ZXh0ICsgcGF0aCArICcvZWRpdC86cGFnZSonLCB7dGVtcGxhdGVVcmw6ICdwbHVnaW5zL3dpa2kvaHRtbC9lZGl0UGFnZS5odG1sJ30pLlxuICAgICAgICAgICAgICB3aGVuKHN0YXJ0Q29udGV4dCArIHBhdGggKyAnL3ZlcnNpb24vOnBhZ2UqXFwvOm9iamVjdElkJywge3RlbXBsYXRlVXJsOiAncGx1Z2lucy93aWtpL2h0bWwvdmlld1BhZ2UuaHRtbCd9KS5cbiAgICAgICAgICAgICAgd2hlbihzdGFydENvbnRleHQgKyBwYXRoICsgJy9oaXN0b3J5LzpwYWdlKicsIHt0ZW1wbGF0ZVVybDogJ3BsdWdpbnMvd2lraS9odG1sL2hpc3RvcnkuaHRtbCd9KS5cbiAgICAgICAgICAgICAgd2hlbihzdGFydENvbnRleHQgKyBwYXRoICsgJy9jb21taXQvOnBhZ2UqXFwvOm9iamVjdElkJywge3RlbXBsYXRlVXJsOiAncGx1Z2lucy93aWtpL2h0bWwvY29tbWl0Lmh0bWwnfSkuXG4gICAgICAgICAgICAgIHdoZW4oc3RhcnRDb250ZXh0ICsgcGF0aCArICcvZGlmZi86cGFnZSpcXC86ZGlmZk9iamVjdElkMS86ZGlmZk9iamVjdElkMicsIHt0ZW1wbGF0ZVVybDogJ3BsdWdpbnMvd2lraS9odG1sL3ZpZXdQYWdlLmh0bWwnLCByZWxvYWRPblNlYXJjaDogZmFsc2V9KS5cbiAgICAgICAgICAgICAgd2hlbihzdGFydENvbnRleHQgKyBwYXRoICsgJy9mb3JtVGFibGUvOnBhZ2UqJywge3RlbXBsYXRlVXJsOiAncGx1Z2lucy93aWtpL2h0bWwvZm9ybVRhYmxlLmh0bWwnfSkuXG4gICAgICAgICAgICAgIHdoZW4oc3RhcnRDb250ZXh0ICsgcGF0aCArICcvZG96ZXIvbWFwcGluZ3MvOnBhZ2UqJywge3RlbXBsYXRlVXJsOiAncGx1Z2lucy93aWtpL2h0bWwvZG96ZXJNYXBwaW5ncy5odG1sJ30pLlxuICAgICAgICAgICAgICB3aGVuKHN0YXJ0Q29udGV4dCArIHBhdGggKyAnL2NvbmZpZ3VyYXRpb25zLzpwYWdlKicsIHsgdGVtcGxhdGVVcmw6ICdwbHVnaW5zL3dpa2kvaHRtbC9jb25maWd1cmF0aW9ucy5odG1sJyB9KS5cbiAgICAgICAgICAgICAgd2hlbihzdGFydENvbnRleHQgKyBwYXRoICsgJy9jb25maWd1cmF0aW9uLzpwaWQvOnBhZ2UqJywgeyB0ZW1wbGF0ZVVybDogJ3BsdWdpbnMvd2lraS9odG1sL2NvbmZpZ3VyYXRpb24uaHRtbCcgfSkuXG4gICAgICAgICAgICAgIHdoZW4oc3RhcnRDb250ZXh0ICsgcGF0aCArICcvbmV3Q29uZmlndXJhdGlvbi86ZmFjdG9yeVBpZC86cGFnZSonLCB7IHRlbXBsYXRlVXJsOiAncGx1Z2lucy93aWtpL2h0bWwvY29uZmlndXJhdGlvbi5odG1sJyB9KS5cbiAgICAgICAgICAgICAgd2hlbihzdGFydENvbnRleHQgKyBwYXRoICsgJy9jYW1lbC9kaWFncmFtLzpwYWdlKicsIHt0ZW1wbGF0ZVVybDogJ3BsdWdpbnMvd2lraS9odG1sL2NhbWVsRGlhZ3JhbS5odG1sJ30pLlxuICAgICAgICAgICAgICB3aGVuKHN0YXJ0Q29udGV4dCArIHBhdGggKyAnL2NhbWVsL2NhbnZhcy86cGFnZSonLCB7dGVtcGxhdGVVcmw6ICdwbHVnaW5zL3dpa2kvaHRtbC9jYW1lbENhbnZhcy5odG1sJ30pLlxuICAgICAgICAgICAgICB3aGVuKHN0YXJ0Q29udGV4dCArIHBhdGggKyAnL2NhbWVsL3Byb3BlcnRpZXMvOnBhZ2UqJywge3RlbXBsYXRlVXJsOiAncGx1Z2lucy93aWtpL2h0bWwvY2FtZWxQcm9wZXJ0aWVzLmh0bWwnfSk7XG4gICAgfSk7XG59XSk7XG5cbiAgLyoqXG4gICAqIEJyYW5jaCBNZW51IHNlcnZpY2VcbiAgICovXG4gIGV4cG9ydCBpbnRlcmZhY2UgQnJhbmNoTWVudSB7XG4gICAgYWRkRXh0ZW5zaW9uOiAoaXRlbTpVSS5NZW51SXRlbSkgPT4gdm9pZDtcbiAgICBhcHBseU1lbnVFeHRlbnNpb25zOiAobWVudTpVSS5NZW51SXRlbVtdKSA9PiB2b2lkO1xuICB9XG5cbiAgX21vZHVsZS5mYWN0b3J5KCd3aWtpQnJhbmNoTWVudScsICgpID0+IHtcbiAgICB2YXIgc2VsZiA9IHtcbiAgICAgIGl0ZW1zOiBbXSxcbiAgICAgIGFkZEV4dGVuc2lvbjogKGl0ZW06VUkuTWVudUl0ZW0pID0+IHtcbiAgICAgICAgc2VsZi5pdGVtcy5wdXNoKGl0ZW0pO1xuICAgICAgfSxcbiAgICAgIGFwcGx5TWVudUV4dGVuc2lvbnM6IChtZW51OlVJLk1lbnVJdGVtW10pID0+IHtcbiAgICAgICAgaWYgKHNlbGYuaXRlbXMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHZhciBleHRlbmRlZE1lbnU6VUkuTWVudUl0ZW1bXSA9IFt7XG4gICAgICAgICAgaGVhZGluZzogXCJBY3Rpb25zXCJcbiAgICAgICAgfV07XG4gICAgICAgIHNlbGYuaXRlbXMuZm9yRWFjaCgoaXRlbTpVSS5NZW51SXRlbSkgPT4ge1xuICAgICAgICAgIGlmIChpdGVtLnZhbGlkKCkpIHtcbiAgICAgICAgICAgIGV4dGVuZGVkTWVudS5wdXNoKGl0ZW0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIGlmIChleHRlbmRlZE1lbnUubGVuZ3RoID4gMSkge1xuICAgICAgICAgIG1lbnUuYWRkKGV4dGVuZGVkTWVudSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9O1xuICAgIHJldHVybiBzZWxmO1xuICB9KTtcblxuICBfbW9kdWxlLmZhY3RvcnkoJ1dpa2lHaXRVcmxQcmVmaXgnLCAoKSA9PiB7XG4gICAgICByZXR1cm4gXCJcIjtcbiAgfSk7XG5cbiAgX21vZHVsZS5mYWN0b3J5KCdmaWxlRXh0ZW5zaW9uVHlwZVJlZ2lzdHJ5JywgKCkgPT4ge1xuICAgIHJldHVybiB7XG4gICAgICBcImltYWdlXCI6IFtcInN2Z1wiLCBcInBuZ1wiLCBcImljb1wiLCBcImJtcFwiLCBcImpwZ1wiLCBcImdpZlwiXSxcbiAgICAgIFwibWFya2Rvd25cIjogW1wibWRcIiwgXCJtYXJrZG93blwiLCBcIm1kb3duXCIsIFwibWtkblwiLCBcIm1rZFwiXSxcbiAgICAgIFwiaHRtbG1peGVkXCI6IFtcImh0bWxcIiwgXCJ4aHRtbFwiLCBcImh0bVwiXSxcbiAgICAgIFwidGV4dC94LWphdmFcIjogW1wiamF2YVwiXSxcbiAgICAgIFwidGV4dC94LWdyb292eVwiOiBbXCJncm9vdnlcIl0sXG4gICAgICBcInRleHQveC1zY2FsYVwiOiBbXCJzY2FsYVwiXSxcbiAgICAgIFwiamF2YXNjcmlwdFwiOiBbXCJqc1wiLCBcImpzb25cIiwgXCJqYXZhc2NyaXB0XCIsIFwianNjcmlwdFwiLCBcImVjbWFzY3JpcHRcIiwgXCJmb3JtXCJdLFxuICAgICAgXCJ4bWxcIjogW1wieG1sXCIsIFwieHNkXCIsIFwid3NkbFwiLCBcImF0b21cIl0sXG4gICAgICBcInRleHQveC15YW1sXCI6IFtcInlhbWxcIiwgXCJ5bWxcIl0sXG4gICAgICBcInByb3BlcnRpZXNcIjogW1wicHJvcGVydGllc1wiXVxuICAgIH07XG4gIH0pO1xuXG4gIF9tb2R1bGUuZmlsdGVyKCdmaWxlSWNvbkNsYXNzJywgKCkgPT4gaWNvbkNsYXNzKTtcblxuICBfbW9kdWxlLnJ1bihbXCIkbG9jYXRpb25cIixcInZpZXdSZWdpc3RyeVwiLCAgXCJsb2NhbFN0b3JhZ2VcIiwgXCJsYXlvdXRGdWxsXCIsIFwiaGVscFJlZ2lzdHJ5XCIsIFwicHJlZmVyZW5jZXNSZWdpc3RyeVwiLCBcIndpa2lSZXBvc2l0b3J5XCIsXG4gICAgXCIkcm9vdFNjb3BlXCIsICgkbG9jYXRpb246bmcuSUxvY2F0aW9uU2VydmljZSxcbiAgICAgICAgdmlld1JlZ2lzdHJ5LFxuICAgICAgICBsb2NhbFN0b3JhZ2UsXG4gICAgICAgIGxheW91dEZ1bGwsXG4gICAgICAgIGhlbHBSZWdpc3RyeSxcbiAgICAgICAgcHJlZmVyZW5jZXNSZWdpc3RyeSxcbiAgICAgICAgd2lraVJlcG9zaXRvcnksXG4gICAgICAgICRyb290U2NvcGUpID0+IHtcblxuICAgIHZpZXdSZWdpc3RyeVsnd2lraSddID0gdGVtcGxhdGVQYXRoICsgJ2xheW91dFdpa2kuaHRtbCc7XG4vKlxuICAgIGhlbHBSZWdpc3RyeS5hZGRVc2VyRG9jKCd3aWtpJywgJ3BsdWdpbnMvd2lraS9kb2MvaGVscC5tZCcsICgpID0+IHtcbiAgICAgIHJldHVybiBXaWtpLmlzV2lraUVuYWJsZWQod29ya3NwYWNlLCBqb2xva2lhLCBsb2NhbFN0b3JhZ2UpO1xuICAgIH0pO1xuKi9cblxuLypcbiAgICBwcmVmZXJlbmNlc1JlZ2lzdHJ5LmFkZFRhYihcIkdpdFwiLCAncGx1Z2lucy93aWtpL2h0bWwvZ2l0UHJlZmVyZW5jZXMuaHRtbCcpO1xuKi9cblxuLypcbiAgICB0YWIgPSB7XG4gICAgICBpZDogXCJ3aWtpXCIsXG4gICAgICBjb250ZW50OiBcIldpa2lcIixcbiAgICAgIHRpdGxlOiBcIlZpZXcgYW5kIGVkaXQgd2lraSBwYWdlc1wiLFxuICAgICAgaXNWYWxpZDogKHdvcmtzcGFjZTpXb3Jrc3BhY2UpID0+IFdpa2kuaXNXaWtpRW5hYmxlZCh3b3Jrc3BhY2UsIGpvbG9raWEsIGxvY2FsU3RvcmFnZSksXG4gICAgICBocmVmOiAoKSA9PiBcIiMvd2lraS92aWV3XCIsXG4gICAgICBpc0FjdGl2ZTogKHdvcmtzcGFjZTpXb3Jrc3BhY2UpID0+IHdvcmtzcGFjZS5pc0xpbmtBY3RpdmUoXCIvd2lraVwiKSAmJiAhd29ya3NwYWNlLmxpbmtDb250YWlucyhcImZhYnJpY1wiLCBcInByb2ZpbGVzXCIpICYmICF3b3Jrc3BhY2UubGlua0NvbnRhaW5zKFwiZWRpdEZlYXR1cmVzXCIpXG4gICAgfTtcbiAgICB3b3Jrc3BhY2UudG9wTGV2ZWxUYWJzLnB1c2godGFiKTtcbiovXG5cbiAgICAvLyBhZGQgZW1wdHkgcmVnZXhzIHRvIHRlbXBsYXRlcyB0aGF0IGRvbid0IGRlZmluZVxuICAgIC8vIHRoZW0gc28gbmctcGF0dGVybiBkb2Vzbid0IGJhcmZcbiAgICBXaWtpLmRvY3VtZW50VGVtcGxhdGVzLmZvckVhY2goKHRlbXBsYXRlOiBhbnkpID0+IHtcbiAgICAgIGlmICghdGVtcGxhdGVbJ3JlZ2V4J10pIHtcbiAgICAgICAgdGVtcGxhdGUucmVnZXggPSAvKD86KS87XG4gICAgICB9XG4gICAgfSk7XG5cbiAgfV0pO1xuXG4gIGhhd3Rpb1BsdWdpbkxvYWRlci5hZGRNb2R1bGUocGx1Z2luTmFtZSk7XG59XG4iLCIvKipcbiAqIEBtb2R1bGUgV2lraVxuICovXG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi93aWtpUGx1Z2luLnRzXCIvPlxubW9kdWxlIFdpa2kge1xuXG4gIGV4cG9ydCB2YXIgQ2FtZWxDb250cm9sbGVyID0gX21vZHVsZS5jb250cm9sbGVyKFwiV2lraS5DYW1lbENvbnRyb2xsZXJcIiwgW1wiJHNjb3BlXCIsIFwiJHJvb3RTY29wZVwiLCBcIiRsb2NhdGlvblwiLCBcIiRyb3V0ZVBhcmFtc1wiLCBcIiRjb21waWxlXCIsIFwiJHRlbXBsYXRlQ2FjaGVcIiwgXCJsb2NhbFN0b3JhZ2VcIiwgKCRzY29wZSwgJHJvb3RTY29wZSwgJGxvY2F0aW9uLCAkcm91dGVQYXJhbXMsICRjb21waWxlLCAkdGVtcGxhdGVDYWNoZSwgbG9jYWxTdG9yYWdlOldpbmRvd0xvY2FsU3RvcmFnZSkgPT4ge1xuXG4gICAgLy8gVE9ETyBSRU1PVkVcbiAgICB2YXIgam9sb2tpYSA9IG51bGw7XG4gICAgdmFyIGpvbG9raWFTdGF0dXMgPSBudWxsO1xuICAgIHZhciBqbXhUcmVlTGF6eUxvYWRSZWdpc3RyeSA9IG51bGw7XG4gICAgdmFyIHVzZXJEZXRhaWxzID0gbnVsbDtcbiAgICB2YXIgSGF3dGlvTmF2ID0gbnVsbDtcbiAgICB2YXIgd29ya3NwYWNlID0gbmV3IFdvcmtzcGFjZShqb2xva2lhLCBqb2xva2lhU3RhdHVzLCBqbXhUcmVlTGF6eUxvYWRSZWdpc3RyeSwgJGxvY2F0aW9uLCAkY29tcGlsZSwgJHRlbXBsYXRlQ2FjaGUsIGxvY2FsU3RvcmFnZSwgJHJvb3RTY29wZSwgdXNlckRldGFpbHMsIEhhd3Rpb05hdik7XG5cbiAgICBXaWtpLmluaXRTY29wZSgkc2NvcGUsICRyb3V0ZVBhcmFtcywgJGxvY2F0aW9uKTtcbiAgICBDYW1lbC5pbml0RW5kcG9pbnRDaG9vc2VyU2NvcGUoJHNjb3BlLCAkbG9jYXRpb24sIGxvY2FsU3RvcmFnZSwgd29ya3NwYWNlLCBqb2xva2lhKTtcbiAgICB2YXIgd2lraVJlcG9zaXRvcnkgPSAkc2NvcGUud2lraVJlcG9zaXRvcnk7XG5cbiAgICAkc2NvcGUuc2NoZW1hID0gQ2FtZWwuZ2V0Q29uZmlndXJlZENhbWVsTW9kZWwoKTtcbiAgICAkc2NvcGUubW9kaWZpZWQgPSBmYWxzZTtcblxuICAgICRzY29wZS5zd2l0Y2hUb0NhbnZhc1ZpZXcgPSBuZXcgVUkuRGlhbG9nKCk7XG5cbiAgICAkc2NvcGUuZmluZFByb2ZpbGVDYW1lbENvbnRleHQgPSB0cnVlO1xuICAgICRzY29wZS5jYW1lbFNlbGVjdGlvbkRldGFpbHMgPSB7XG4gICAgICBzZWxlY3RlZENhbWVsQ29udGV4dElkOiBudWxsLFxuICAgICAgc2VsZWN0ZWRSb3V0ZUlkOiBudWxsXG4gICAgfTtcblxuICAgICRzY29wZS5pc1ZhbGlkID0gKG5hdikgPT4ge1xuICAgICAgcmV0dXJuIG5hdiAmJiBuYXYuaXNWYWxpZCh3b3Jrc3BhY2UpO1xuICAgIH07XG5cbiAgICAkc2NvcGUuY2FtZWxTdWJMZXZlbFRhYnMgPSBbXG4gICAgICAvKntcbiAgICAgICAgY29udGVudDogJzxpIGNsYXNzPVwiaWNvbi1waWN0dXJlXCI+PC9pPiBDYW52YXMnLFxuICAgICAgICB0aXRsZTogXCJFZGl0IHRoZSBkaWFncmFtIGluIGEgZHJhZ2d5IGRyb3BweSB3YXlcIixcbiAgICAgICAgaXNWYWxpZDogKHdvcmtzcGFjZTpXb3Jrc3BhY2UpID0+IHRydWUsXG4gICAgICAgIGhyZWY6ICgpID0+IFdpa2kuc3RhcnRMaW5rKCRzY29wZS5icmFuY2gpICsgXCIvY2FtZWwvY2FudmFzL1wiICsgJHNjb3BlLnBhZ2VJZFxuICAgICAgfSxcbiAgICAgICove1xuICAgICAgICBjb250ZW50OiAnPGkgY2xhc3M9XCIgaWNvbi1zaXRlbWFwXCI+PC9pPiBUcmVlJyxcbiAgICAgICAgdGl0bGU6IFwiVmlldyB0aGUgcm91dGVzIGFzIGEgdHJlZVwiLFxuICAgICAgICBpc1ZhbGlkOiAod29ya3NwYWNlOldvcmtzcGFjZSkgPT4gdHJ1ZSxcbiAgICAgICAgaHJlZjogKCkgPT4gV2lraS5zdGFydExpbmsoJHNjb3BlLmJyYW5jaCkgKyBcIi9jYW1lbC9wcm9wZXJ0aWVzL1wiICsgJHNjb3BlLnBhZ2VJZFxuICAgICAgfSxcbiAgICAgIC8qXG4gICAgICAge1xuICAgICAgIGNvbnRlbnQ6ICc8aSBjbGFzcz1cImljb24tc2l0ZW1hcFwiPjwvaT4gRGlhZ3JhbScsXG4gICAgICAgdGl0bGU6IFwiVmlldyBhIGRpYWdyYW0gb2YgdGhlIHJvdXRlXCIsXG4gICAgICAgaXNWYWxpZDogKHdvcmtzcGFjZTpXb3Jrc3BhY2UpID0+IHRydWUsXG4gICAgICAgaHJlZjogKCkgPT4gV2lraS5zdGFydExpbmsoJHNjb3BlLmJyYW5jaCkgKyBcIi9jYW1lbC9kaWFncmFtL1wiICsgJHNjb3BlLnBhZ2VJZFxuICAgICAgIH0sXG4gICAgICAgKi9cbiAgICBdO1xuXG4gICAgdmFyIHJvdXRlTW9kZWwgPSBfYXBhY2hlQ2FtZWxNb2RlbC5kZWZpbml0aW9ucy5yb3V0ZTtcbiAgICByb3V0ZU1vZGVsW1wiX2lkXCJdID0gXCJyb3V0ZVwiO1xuXG4gICAgJHNjb3BlLmFkZERpYWxvZyA9IG5ldyBVSS5EaWFsb2coKTtcblxuICAgIC8vIFRPRE8gZG9lc24ndCBzZWVtIHRoYXQgYW5ndWxhci11aSB1c2VzIHRoZXNlP1xuICAgICRzY29wZS5hZGREaWFsb2cub3B0aW9uc1tcImRpYWxvZ0NsYXNzXCJdID0gXCJtb2RhbC1sYXJnZVwiO1xuICAgICRzY29wZS5hZGREaWFsb2cub3B0aW9uc1tcImNzc0NsYXNzXCJdID0gXCJtb2RhbC1sYXJnZVwiO1xuXG4gICAgJHNjb3BlLnBhbGV0dGVJdGVtU2VhcmNoID0gXCJcIjtcbiAgICAkc2NvcGUucGFsZXR0ZVRyZWUgPSBuZXcgRm9sZGVyKFwiUGFsZXR0ZVwiKTtcbiAgICAkc2NvcGUucGFsZXR0ZUFjdGl2YXRpb25zID0gW1wiUm91dGluZ19hZ2dyZWdhdGVcIl07XG5cbiAgICAvLyBsb2FkICRzY29wZS5wYWxldHRlVHJlZVxuICAgIGFuZ3VsYXIuZm9yRWFjaChfYXBhY2hlQ2FtZWxNb2RlbC5kZWZpbml0aW9ucywgKHZhbHVlLCBrZXkpID0+IHtcbiAgICAgIGlmICh2YWx1ZS5ncm91cCkge1xuICAgICAgICB2YXIgZ3JvdXAgPSAoa2V5ID09PSBcInJvdXRlXCIpID8gJHNjb3BlLnBhbGV0dGVUcmVlIDogJHNjb3BlLnBhbGV0dGVUcmVlLmdldE9yRWxzZSh2YWx1ZS5ncm91cCk7XG4gICAgICAgIGlmICghZ3JvdXAua2V5KSB7XG4gICAgICAgICAgZ3JvdXAua2V5ID0gdmFsdWUuZ3JvdXA7XG4gICAgICAgIH1cbiAgICAgICAgdmFsdWVbXCJfaWRcIl0gPSBrZXk7XG4gICAgICAgIHZhciB0aXRsZSA9IHZhbHVlW1widGl0bGVcIl0gfHwga2V5O1xuICAgICAgICB2YXIgbm9kZSA9IG5ldyBGb2xkZXIodGl0bGUpO1xuICAgICAgICBub2RlLmtleSA9IGdyb3VwLmtleSArIFwiX1wiICsga2V5O1xuICAgICAgICBub2RlW1wibm9kZU1vZGVsXCJdID0gdmFsdWU7XG4gICAgICAgIHZhciBpbWFnZVVybCA9IENhbWVsLmdldFJvdXRlTm9kZUljb24odmFsdWUpO1xuICAgICAgICBub2RlLmljb24gPSBpbWFnZVVybDtcbiAgICAgICAgLy8gY29tcGlsZXIgd2FzIGNvbXBsYWluaW5nIGFib3V0ICdsYWJlbCcgaGFkIG5vIGlkZWEgd2hlcmUgaXQncyBjb21pbmcgZnJvbVxuICAgICAgICAvLyB2YXIgdG9vbHRpcCA9IHZhbHVlW1widG9vbHRpcFwiXSB8fCB2YWx1ZVtcImRlc2NyaXB0aW9uXCJdIHx8IGxhYmVsO1xuICAgICAgICB2YXIgdG9vbHRpcCA9IHZhbHVlW1widG9vbHRpcFwiXSB8fCB2YWx1ZVtcImRlc2NyaXB0aW9uXCJdIHx8ICcnO1xuICAgICAgICBub2RlLnRvb2x0aXAgPSB0b29sdGlwO1xuXG4gICAgICAgIGdyb3VwLmNoaWxkcmVuLnB1c2gobm9kZSk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICAvLyBsb2FkICRzY29wZS5jb21wb25lbnRUcmVlXG4gICAgJHNjb3BlLmNvbXBvbmVudFRyZWUgPSBuZXcgRm9sZGVyKFwiRW5kcG9pbnRzXCIpO1xuXG4gICAgJHNjb3BlLiR3YXRjaChcImNvbXBvbmVudE5hbWVzXCIsICgpID0+IHtcbiAgICAgIHZhciBjb21wb25lbnROYW1lcyA9ICRzY29wZS5jb21wb25lbnROYW1lcztcbiAgICAgIGlmIChjb21wb25lbnROYW1lcyAmJiBjb21wb25lbnROYW1lcy5sZW5ndGgpIHtcbiAgICAgICAgJHNjb3BlLmNvbXBvbmVudFRyZWUgPSBuZXcgRm9sZGVyKFwiRW5kcG9pbnRzXCIpO1xuICAgICAgICBhbmd1bGFyLmZvckVhY2goJHNjb3BlLmNvbXBvbmVudE5hbWVzLCAoZW5kcG9pbnROYW1lKSA9PiB7XG4gICAgICAgICAgdmFyIGNhdGVnb3J5ID0gQ2FtZWwuZ2V0RW5kcG9pbnRDYXRlZ29yeShlbmRwb2ludE5hbWUpO1xuICAgICAgICAgIHZhciBncm91cE5hbWUgPSBjYXRlZ29yeS5sYWJlbCB8fCBcIkNvcmVcIjtcbiAgICAgICAgICB2YXIgZ3JvdXBLZXkgPSBjYXRlZ29yeS5pZCB8fCBncm91cE5hbWU7XG4gICAgICAgICAgdmFyIGdyb3VwID0gJHNjb3BlLmNvbXBvbmVudFRyZWUuZ2V0T3JFbHNlKGdyb3VwTmFtZSk7XG5cbiAgICAgICAgICB2YXIgdmFsdWUgPSBDYW1lbC5nZXRFbmRwb2ludENvbmZpZyhlbmRwb2ludE5hbWUsIGNhdGVnb3J5KTtcbiAgICAgICAgICB2YXIga2V5ID0gZW5kcG9pbnROYW1lO1xuICAgICAgICAgIHZhciBsYWJlbCA9IHZhbHVlW1wibGFiZWxcIl0gfHwgZW5kcG9pbnROYW1lO1xuICAgICAgICAgIHZhciBub2RlID0gbmV3IEZvbGRlcihsYWJlbCk7XG4gICAgICAgICAgbm9kZS5rZXkgPSBncm91cEtleSArIFwiX1wiICsga2V5O1xuICAgICAgICAgIG5vZGUua2V5ID0ga2V5O1xuICAgICAgICAgIG5vZGVbXCJub2RlTW9kZWxcIl0gPSB2YWx1ZTtcbiAgICAgICAgICB2YXIgdG9vbHRpcCA9IHZhbHVlW1widG9vbHRpcFwiXSB8fCB2YWx1ZVtcImRlc2NyaXB0aW9uXCJdIHx8IGxhYmVsO1xuICAgICAgICAgIHZhciBpbWFnZVVybCA9IENvcmUudXJsKHZhbHVlW1wiaWNvblwiXSB8fCBDYW1lbC5lbmRwb2ludEljb24pO1xuICAgICAgICAgIG5vZGUuaWNvbiA9IGltYWdlVXJsO1xuICAgICAgICAgIG5vZGUudG9vbHRpcCA9IHRvb2x0aXA7XG5cbiAgICAgICAgICBncm91cC5jaGlsZHJlbi5wdXNoKG5vZGUpO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICAkc2NvcGUuY29tcG9uZW50QWN0aXZhdGlvbnMgPSBbXCJiZWFuXCJdO1xuXG4gICAgJHNjb3BlLiR3YXRjaCgnYWRkRGlhbG9nLnNob3cnLCBmdW5jdGlvbiAoKSB7XG4gICAgICBpZiAoJHNjb3BlLmFkZERpYWxvZy5zaG93KSB7XG4gICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICQoJyNzdWJtaXQnKS5mb2N1cygpO1xuICAgICAgICB9LCA1MCk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICAkc2NvcGUuJG9uKFwiaGF3dGlvLmZvcm0ubW9kZWxDaGFuZ2VcIiwgb25Nb2RlbENoYW5nZUV2ZW50KTtcblxuICAgICRzY29wZS5vblJvb3RUcmVlTm9kZSA9IChyb290VHJlZU5vZGUpID0+IHtcbiAgICAgICRzY29wZS5yb290VHJlZU5vZGUgPSByb290VHJlZU5vZGU7XG4gICAgICAvLyByZXN0b3JlIHRoZSByZWFsIGRhdGEgYXQgdGhlIHJvb3QgZm9yIHNhdmluZyB0aGUgZG9jIGV0Y1xuICAgICAgcm9vdFRyZWVOb2RlLmRhdGEgPSAkc2NvcGUuY2FtZWxDb250ZXh0VHJlZTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLmFkZE5vZGUgPSAoKSA9PiB7XG4gICAgICBpZiAoJHNjb3BlLm5vZGVYbWxOb2RlKSB7XG4gICAgICAgICRzY29wZS5hZGREaWFsb2cub3BlbigpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgYWRkTmV3Tm9kZShyb3V0ZU1vZGVsKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgJHNjb3BlLm9uUGFsZXR0ZVNlbGVjdCA9IChub2RlKSA9PiB7XG4gICAgICAkc2NvcGUuc2VsZWN0ZWRQYWxldHRlTm9kZSA9IChub2RlICYmIG5vZGVbXCJub2RlTW9kZWxcIl0pID8gbm9kZSA6IG51bGw7XG4gICAgICBpZiAoJHNjb3BlLnNlbGVjdGVkUGFsZXR0ZU5vZGUpIHtcbiAgICAgICAgJHNjb3BlLnNlbGVjdGVkQ29tcG9uZW50Tm9kZSA9IG51bGw7XG4gICAgICB9XG4gICAgICBjb25zb2xlLmxvZyhcIlNlbGVjdGVkIFwiICsgJHNjb3BlLnNlbGVjdGVkUGFsZXR0ZU5vZGUgKyBcIiA6IFwiICsgJHNjb3BlLnNlbGVjdGVkQ29tcG9uZW50Tm9kZSk7XG4gICAgfTtcblxuICAgICRzY29wZS5vbkNvbXBvbmVudFNlbGVjdCA9IChub2RlKSA9PiB7XG4gICAgICAkc2NvcGUuc2VsZWN0ZWRDb21wb25lbnROb2RlID0gKG5vZGUgJiYgbm9kZVtcIm5vZGVNb2RlbFwiXSkgPyBub2RlIDogbnVsbDtcbiAgICAgIGlmICgkc2NvcGUuc2VsZWN0ZWRDb21wb25lbnROb2RlKSB7XG4gICAgICAgICRzY29wZS5zZWxlY3RlZFBhbGV0dGVOb2RlID0gbnVsbDtcbiAgICAgICAgdmFyIG5vZGVOYW1lID0gbm9kZS5rZXk7XG4gICAgICAgIGNvbnNvbGUubG9nKFwibG9hZGluZyBlbmRwb2ludCBzY2hlbWEgZm9yIG5vZGUgXCIgKyBub2RlTmFtZSk7XG4gICAgICAgICRzY29wZS5sb2FkRW5kcG9pbnRTY2hlbWEobm9kZU5hbWUpO1xuICAgICAgICAkc2NvcGUuc2VsZWN0ZWRDb21wb25lbnROYW1lID0gbm9kZU5hbWU7XG4gICAgICB9XG4gICAgICBjb25zb2xlLmxvZyhcIlNlbGVjdGVkIFwiICsgJHNjb3BlLnNlbGVjdGVkUGFsZXR0ZU5vZGUgKyBcIiA6IFwiICsgJHNjb3BlLnNlbGVjdGVkQ29tcG9uZW50Tm9kZSk7XG4gICAgfTtcblxuICAgICRzY29wZS5zZWxlY3RlZE5vZGVNb2RlbCA9ICgpID0+IHtcbiAgICAgIHZhciBub2RlTW9kZWwgPSBudWxsO1xuICAgICAgaWYgKCRzY29wZS5zZWxlY3RlZFBhbGV0dGVOb2RlKSB7XG4gICAgICAgIG5vZGVNb2RlbCA9ICRzY29wZS5zZWxlY3RlZFBhbGV0dGVOb2RlW1wibm9kZU1vZGVsXCJdO1xuICAgICAgICAkc2NvcGUuZW5kcG9pbnRDb25maWcgPSBudWxsO1xuICAgICAgfSBlbHNlIGlmICgkc2NvcGUuc2VsZWN0ZWRDb21wb25lbnROb2RlKSB7XG4gICAgICAgIC8vIFRPRE8gbGVzdCBjcmVhdGUgYW4gZW5kcG9pbnQgbm9kZU1vZGVsIGFuZCBhc3NvY2lhdGVcbiAgICAgICAgLy8gdGhlIGR1bW15IFVSTCBhbmQgcHJvcGVydGllcyBldGMuLi5cbiAgICAgICAgdmFyIGVuZHBvaW50Q29uZmlnID0gJHNjb3BlLnNlbGVjdGVkQ29tcG9uZW50Tm9kZVtcIm5vZGVNb2RlbFwiXTtcbiAgICAgICAgdmFyIGVuZHBvaW50U2NoZW1hID0gJHNjb3BlLmVuZHBvaW50U2NoZW1hO1xuICAgICAgICBub2RlTW9kZWwgPSAkc2NvcGUuc2NoZW1hLmRlZmluaXRpb25zLmVuZHBvaW50O1xuICAgICAgICAkc2NvcGUuZW5kcG9pbnRDb25maWcgPSB7XG4gICAgICAgICAga2V5OiAkc2NvcGUuc2VsZWN0ZWRDb21wb25lbnROb2RlLmtleSxcbiAgICAgICAgICBzY2hlbWE6IGVuZHBvaW50U2NoZW1hLFxuICAgICAgICAgIGRldGFpbHM6IGVuZHBvaW50Q29uZmlnXG4gICAgICAgIH07XG4gICAgICB9XG4gICAgICByZXR1cm4gbm9kZU1vZGVsO1xuICAgIH07XG5cbiAgICAkc2NvcGUuYWRkQW5kQ2xvc2VEaWFsb2cgPSAoKSA9PiB7XG4gICAgICB2YXIgbm9kZU1vZGVsID0gJHNjb3BlLnNlbGVjdGVkTm9kZU1vZGVsKCk7XG4gICAgICBpZiAobm9kZU1vZGVsKSB7XG4gICAgICAgIGFkZE5ld05vZGUobm9kZU1vZGVsKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiV0FSTklORzogbm8gbm9kZU1vZGVsIVwiKTtcbiAgICAgIH1cbiAgICAgICRzY29wZS5hZGREaWFsb2cuY2xvc2UoKTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLnJlbW92ZU5vZGUgPSAoKSA9PiB7XG4gICAgICBpZiAoJHNjb3BlLnNlbGVjdGVkRm9sZGVyICYmICRzY29wZS50cmVlTm9kZSkge1xuICAgICAgICAkc2NvcGUuc2VsZWN0ZWRGb2xkZXIuZGV0YWNoKCk7XG4gICAgICAgICRzY29wZS50cmVlTm9kZS5yZW1vdmUoKTtcbiAgICAgICAgJHNjb3BlLnNlbGVjdGVkRm9sZGVyID0gbnVsbDtcbiAgICAgICAgJHNjb3BlLnRyZWVOb2RlID0gbnVsbDtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgJHNjb3BlLmNhbkRlbGV0ZSA9ICgpID0+IHtcbiAgICAgIHJldHVybiAkc2NvcGUuc2VsZWN0ZWRGb2xkZXIgPyB0cnVlIDogZmFsc2U7XG4gICAgfTtcblxuICAgICRzY29wZS5pc0FjdGl2ZSA9IChuYXYpID0+IHtcbiAgICAgIGlmIChhbmd1bGFyLmlzU3RyaW5nKG5hdikpXG4gICAgICAgIHJldHVybiB3b3Jrc3BhY2UuaXNMaW5rQWN0aXZlKG5hdik7XG4gICAgICB2YXIgZm4gPSBuYXYuaXNBY3RpdmU7XG4gICAgICBpZiAoZm4pIHtcbiAgICAgICAgcmV0dXJuIGZuKHdvcmtzcGFjZSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gd29ya3NwYWNlLmlzTGlua0FjdGl2ZShuYXYuaHJlZigpKTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLnNhdmUgPSAoKSA9PiB7XG4gICAgICAvLyBnZW5lcmF0ZSB0aGUgbmV3IFhNTFxuICAgICAgaWYgKCRzY29wZS5tb2RpZmllZCAmJiAkc2NvcGUucm9vdFRyZWVOb2RlKSB7XG4gICAgICAgIHZhciB4bWxOb2RlID0gQ2FtZWwuZ2VuZXJhdGVYbWxGcm9tRm9sZGVyKCRzY29wZS5yb290VHJlZU5vZGUpO1xuICAgICAgICBpZiAoeG1sTm9kZSkge1xuICAgICAgICAgIHZhciB0ZXh0ID0gQ29yZS54bWxOb2RlVG9TdHJpbmcoeG1sTm9kZSk7XG4gICAgICAgICAgaWYgKHRleHQpIHtcbiAgICAgICAgICAgIC8vIGxldHMgc2F2ZSB0aGUgZmlsZS4uLlxuICAgICAgICAgICAgdmFyIGNvbW1pdE1lc3NhZ2UgPSAkc2NvcGUuY29tbWl0TWVzc2FnZSB8fCBcIlVwZGF0ZWQgcGFnZSBcIiArICRzY29wZS5wYWdlSWQ7XG4gICAgICAgICAgICB3aWtpUmVwb3NpdG9yeS5wdXRQYWdlKCRzY29wZS5icmFuY2gsICRzY29wZS5wYWdlSWQsIHRleHQsIGNvbW1pdE1lc3NhZ2UsIChzdGF0dXMpID0+IHtcbiAgICAgICAgICAgICAgV2lraS5vbkNvbXBsZXRlKHN0YXR1cyk7XG4gICAgICAgICAgICAgIENvcmUubm90aWZpY2F0aW9uKFwic3VjY2Vzc1wiLCBcIlNhdmVkIFwiICsgJHNjb3BlLnBhZ2VJZCk7XG4gICAgICAgICAgICAgICRzY29wZS5tb2RpZmllZCA9IGZhbHNlO1xuICAgICAgICAgICAgICBnb1RvVmlldygpO1xuICAgICAgICAgICAgICBDb3JlLiRhcHBseSgkc2NvcGUpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfTtcblxuICAgICRzY29wZS5jYW5jZWwgPSAoKSA9PiB7XG4gICAgICBjb25zb2xlLmxvZyhcImNhbmNlbGxpbmcuLi5cIik7XG4gICAgICAvLyBUT0RPIHNob3cgZGlhbG9nIGlmIGZvbGtzIGFyZSBhYm91dCB0byBsb3NlIGNoYW5nZXMuLi5cbiAgICB9O1xuXG4gICAgJHNjb3BlLiR3YXRjaCgnd29ya3NwYWNlLnRyZWUnLCBmdW5jdGlvbiAoKSB7XG4gICAgICBpZiAoISRzY29wZS5naXQpIHtcbiAgICAgICAgLy8gbGV0cyBkbyB0aGlzIGFzeW5jaHJvbm91c2x5IHRvIGF2b2lkIEVycm9yOiAkZGlnZXN0IGFscmVhZHkgaW4gcHJvZ3Jlc3NcbiAgICAgICAgLy9jb25zb2xlLmxvZyhcIlJlbG9hZGluZyB0aGUgdmlldyBhcyB3ZSBub3cgc2VlbSB0byBoYXZlIGEgZ2l0IG1iZWFuIVwiKTtcbiAgICAgICAgc2V0VGltZW91dCh1cGRhdGVWaWV3LCA1MCk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICAkc2NvcGUuJG9uKFwiJHJvdXRlQ2hhbmdlU3VjY2Vzc1wiLCBmdW5jdGlvbiAoZXZlbnQsIGN1cnJlbnQsIHByZXZpb3VzKSB7XG4gICAgICAvLyBsZXRzIGRvIHRoaXMgYXN5bmNocm9ub3VzbHkgdG8gYXZvaWQgRXJyb3I6ICRkaWdlc3QgYWxyZWFkeSBpbiBwcm9ncmVzc1xuICAgICAgc2V0VGltZW91dCh1cGRhdGVWaWV3LCA1MCk7XG4gICAgfSk7XG5cbiAgICBmdW5jdGlvbiBnZXRGb2xkZXJYbWxOb2RlKHRyZWVOb2RlKSB7XG4gICAgICB2YXIgcm91dGVYbWxOb2RlID0gQ2FtZWwuY3JlYXRlRm9sZGVyWG1sVHJlZSh0cmVlTm9kZSwgbnVsbCk7XG4gICAgICBpZiAocm91dGVYbWxOb2RlKSB7XG4gICAgICAgICRzY29wZS5ub2RlWG1sTm9kZSA9IHJvdXRlWG1sTm9kZTtcbiAgICAgIH1cbiAgICAgIHJldHVybiByb3V0ZVhtbE5vZGU7XG4gICAgfVxuXG4gICAgJHNjb3BlLm9uTm9kZVNlbGVjdCA9IChmb2xkZXIsIHRyZWVOb2RlKSA9PiB7XG4gICAgICAkc2NvcGUuc2VsZWN0ZWRGb2xkZXIgPSBmb2xkZXI7XG4gICAgICAkc2NvcGUudHJlZU5vZGUgPSB0cmVlTm9kZTtcbiAgICAgICRzY29wZS5wcm9wZXJ0aWVzVGVtcGxhdGUgPSBudWxsO1xuICAgICAgJHNjb3BlLmRpYWdyYW1UZW1wbGF0ZSA9IG51bGw7XG4gICAgICAkc2NvcGUubm9kZVhtbE5vZGUgPSBudWxsO1xuICAgICAgaWYgKGZvbGRlcikge1xuICAgICAgICAkc2NvcGUubm9kZURhdGEgPSBDYW1lbC5nZXRSb3V0ZUZvbGRlckpTT04oZm9sZGVyKTtcbiAgICAgICAgJHNjb3BlLm5vZGVEYXRhQ2hhbmdlZEZpZWxkcyA9IHt9O1xuICAgICAgfVxuICAgICAgdmFyIG5vZGVOYW1lID0gQ2FtZWwuZ2V0Rm9sZGVyQ2FtZWxOb2RlSWQoZm9sZGVyKTtcbiAgICAgIC8vIGxldHMgbGF6aWx5IGNyZWF0ZSB0aGUgWE1MIHRyZWUgc28gaXQgY2FuIGJlIHVzZWQgYnkgdGhlIGRpYWdyYW1cbiAgICAgIHZhciByb3V0ZVhtbE5vZGUgPSBnZXRGb2xkZXJYbWxOb2RlKHRyZWVOb2RlKTtcbiAgICAgIGlmIChub2RlTmFtZSkge1xuICAgICAgICAvL3ZhciBub2RlTmFtZSA9IHJvdXRlWG1sTm9kZS5sb2NhbE5hbWU7XG4gICAgICAgICRzY29wZS5ub2RlTW9kZWwgPSBDYW1lbC5nZXRDYW1lbFNjaGVtYShub2RlTmFtZSk7XG4gICAgICAgIGlmICgkc2NvcGUubm9kZU1vZGVsKSB7XG4gICAgICAgICAgJHNjb3BlLnByb3BlcnRpZXNUZW1wbGF0ZSA9IFwicGx1Z2lucy93aWtpL2h0bWwvY2FtZWxQcm9wZXJ0aWVzRWRpdC5odG1sXCI7XG4gICAgICAgIH1cbiAgICAgICAgJHNjb3BlLmRpYWdyYW1UZW1wbGF0ZSA9IFwiYXBwL2NhbWVsL2h0bWwvcm91dGVzLmh0bWxcIjtcbiAgICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgJHNjb3BlLm9uTm9kZURyYWdFbnRlciA9IChub2RlLCBzb3VyY2VOb2RlKSA9PiB7XG4gICAgICB2YXIgbm9kZUZvbGRlciA9IG5vZGUuZGF0YTtcbiAgICAgIHZhciBzb3VyY2VGb2xkZXIgPSBzb3VyY2VOb2RlLmRhdGE7XG4gICAgICBpZiAobm9kZUZvbGRlciAmJiBzb3VyY2VGb2xkZXIpIHtcbiAgICAgICAgdmFyIG5vZGVJZCA9IENhbWVsLmdldEZvbGRlckNhbWVsTm9kZUlkKG5vZGVGb2xkZXIpO1xuICAgICAgICB2YXIgc291cmNlSWQgPSBDYW1lbC5nZXRGb2xkZXJDYW1lbE5vZGVJZChzb3VyY2VGb2xkZXIpO1xuICAgICAgICBpZiAobm9kZUlkICYmIHNvdXJjZUlkKSB7XG4gICAgICAgICAgLy8gd2UgY2FuIG9ubHkgZHJhZyByb3V0ZXMgb250byBvdGhlciByb3V0ZXMgKGJlZm9yZSAvIGFmdGVyIC8gb3ZlcilcbiAgICAgICAgICBpZiAoc291cmNlSWQgPT09IFwicm91dGVcIikge1xuICAgICAgICAgICAgcmV0dXJuIG5vZGVJZCA9PT0gXCJyb3V0ZVwiO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH07XG5cbiAgICAkc2NvcGUub25Ob2RlRHJvcCA9IChub2RlLCBzb3VyY2VOb2RlLCBoaXRNb2RlLCB1aSwgZHJhZ2dhYmxlKSA9PiB7XG4gICAgICB2YXIgbm9kZUZvbGRlciA9IG5vZGUuZGF0YTtcbiAgICAgIHZhciBzb3VyY2VGb2xkZXIgPSBzb3VyY2VOb2RlLmRhdGE7XG4gICAgICBpZiAobm9kZUZvbGRlciAmJiBzb3VyY2VGb2xkZXIpIHtcbiAgICAgICAgLy8gd2UgY2Fubm90IGRyb3AgYSByb3V0ZSBpbnRvIGEgcm91dGUgb3IgYSBub24tcm91dGUgdG8gYSB0b3AgbGV2ZWwhXG4gICAgICAgIHZhciBub2RlSWQgPSBDYW1lbC5nZXRGb2xkZXJDYW1lbE5vZGVJZChub2RlRm9sZGVyKTtcbiAgICAgICAgdmFyIHNvdXJjZUlkID0gQ2FtZWwuZ2V0Rm9sZGVyQ2FtZWxOb2RlSWQoc291cmNlRm9sZGVyKTtcblxuICAgICAgICBpZiAobm9kZUlkID09PSBcInJvdXRlXCIpIHtcbiAgICAgICAgICAvLyBoaXRNb2RlIG11c3QgYmUgXCJvdmVyXCIgaWYgd2UgYXJlIG5vdCBhbm90aGVyIHJvdXRlXG4gICAgICAgICAgaWYgKHNvdXJjZUlkID09PSBcInJvdXRlXCIpIHtcbiAgICAgICAgICAgIGlmIChoaXRNb2RlID09PSBcIm92ZXJcIikge1xuICAgICAgICAgICAgICBoaXRNb2RlID0gXCJhZnRlclwiO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBkaXNhYmxlIGJlZm9yZSAvIGFmdGVyXG4gICAgICAgICAgICBoaXRNb2RlID0gXCJvdmVyXCI7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgIGlmIChDYW1lbC5hY2NlcHRPdXRwdXQobm9kZUlkKSkge1xuICAgICAgICAgICAgaGl0TW9kZSA9IFwib3ZlclwiO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZiAoaGl0TW9kZSAhPT0gXCJiZWZvcmVcIikge1xuICAgICAgICAgICAgICBoaXRNb2RlID0gXCJhZnRlclwiO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBjb25zb2xlLmxvZyhcIm5vZGVEcm9wIG5vZGVJZDogXCIgKyBub2RlSWQgKyBcIiBzb3VyY2VJZDogXCIgKyBzb3VyY2VJZCArIFwiIGhpdE1vZGU6IFwiICsgaGl0TW9kZSk7XG5cbiAgICAgICAgc291cmNlTm9kZS5tb3ZlKG5vZGUsIGhpdE1vZGUpO1xuICAgICAgfVxuICAgIH07XG5cblxuICAgIHVwZGF0ZVZpZXcoKTtcblxuICAgIGZ1bmN0aW9uIGFkZE5ld05vZGUobm9kZU1vZGVsKSB7XG4gICAgICB2YXIgZG9jID0gJHNjb3BlLmRvYyB8fCBkb2N1bWVudDtcbiAgICAgIHZhciBwYXJlbnRGb2xkZXIgPSAkc2NvcGUuc2VsZWN0ZWRGb2xkZXIgfHwgJHNjb3BlLmNhbWVsQ29udGV4dFRyZWU7XG4gICAgICB2YXIga2V5ID0gbm9kZU1vZGVsW1wiX2lkXCJdO1xuICAgICAgdmFyIGJlZm9yZU5vZGUgPSBudWxsO1xuICAgICAgaWYgKCFrZXkpIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJXQVJOSU5HOiBubyBpZCBmb3IgbW9kZWwgXCIgKyBKU09OLnN0cmluZ2lmeShub2RlTW9kZWwpKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciB0cmVlTm9kZSA9ICRzY29wZS50cmVlTm9kZTtcbiAgICAgICAgaWYgKGtleSA9PT0gXCJyb3V0ZVwiKSB7XG4gICAgICAgICAgLy8gbGV0cyBhZGQgdG8gdGhlIHJvb3Qgb2YgdGhlIHRyZWVcbiAgICAgICAgICB0cmVlTm9kZSA9ICRzY29wZS5yb290VHJlZU5vZGU7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgaWYgKCF0cmVlTm9kZSkge1xuICAgICAgICAgICAgLy8gbGV0cyBzZWxlY3QgdGhlIGxhc3Qgcm91dGUgLSBhbmQgY3JlYXRlIGEgbmV3IHJvdXRlIGlmIG5lZWQgYmVcbiAgICAgICAgICAgIHZhciByb290ID0gJHNjb3BlLnJvb3RUcmVlTm9kZTtcbiAgICAgICAgICAgIHZhciBjaGlsZHJlbiA9IHJvb3QuZ2V0Q2hpbGRyZW4oKTtcbiAgICAgICAgICAgIGlmICghY2hpbGRyZW4gfHwgIWNoaWxkcmVuLmxlbmd0aCkge1xuICAgICAgICAgICAgICBhZGROZXdOb2RlKENhbWVsLmdldENhbWVsU2NoZW1hKFwicm91dGVcIikpO1xuICAgICAgICAgICAgICBjaGlsZHJlbiA9IHJvb3QuZ2V0Q2hpbGRyZW4oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChjaGlsZHJlbiAmJiBjaGlsZHJlbi5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgdHJlZU5vZGUgPSBjaGlsZHJlbltjaGlsZHJlbi5sZW5ndGggLSAxXTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiQ291bGQgbm90IGFkZCBhIG5ldyByb3V0ZSB0byB0aGUgZW1wdHkgdHJlZSFcIik7XG4gICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG5cblxuICAgICAgICAgIC8vIGlmIHRoZSBwYXJlbnQgZm9sZGVyIGxpa2VzIHRvIGFjdCBhcyBhIHBpcGVsaW5lLCB0aGVuIGFkZFxuICAgICAgICAgIC8vIGFmdGVyIHRoZSBwYXJlbnQsIHJhdGhlciB0aGFuIGFzIGEgY2hpbGRcbiAgICAgICAgICB2YXIgcGFyZW50SWQgPSBDYW1lbC5nZXRGb2xkZXJDYW1lbE5vZGVJZCh0cmVlTm9kZS5kYXRhKTtcbiAgICAgICAgICBpZiAoIUNhbWVsLmFjY2VwdE91dHB1dChwYXJlbnRJZCkpIHtcbiAgICAgICAgICAgIC8vIGxldHMgYWRkIHRoZSBuZXcgbm9kZSB0byB0aGUgZW5kIG9mIHRoZSBwYXJlbnRcbiAgICAgICAgICAgIGJlZm9yZU5vZGUgPSB0cmVlTm9kZS5nZXROZXh0U2libGluZygpO1xuICAgICAgICAgICAgdHJlZU5vZGUgPSB0cmVlTm9kZS5nZXRQYXJlbnQoKSB8fCB0cmVlTm9kZTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRyZWVOb2RlKSB7XG4gICAgICAgICAgdmFyIG5vZGUgPSBkb2MuY3JlYXRlRWxlbWVudChrZXkpO1xuICAgICAgICAgIHBhcmVudEZvbGRlciA9IHRyZWVOb2RlLmRhdGE7XG4gICAgICAgICAgdmFyIGFkZGVkTm9kZSA9IENhbWVsLmFkZFJvdXRlQ2hpbGQocGFyZW50Rm9sZGVyLCBub2RlKTtcbiAgICAgICAgICBpZiAoYWRkZWROb2RlKSB7XG4gICAgICAgICAgICB2YXIgYWRkZWQgPSB0cmVlTm9kZS5hZGRDaGlsZChhZGRlZE5vZGUsIGJlZm9yZU5vZGUpO1xuICAgICAgICAgICAgaWYgKGFkZGVkKSB7XG4gICAgICAgICAgICAgIGdldEZvbGRlclhtbE5vZGUoYWRkZWQpO1xuICAgICAgICAgICAgICBhZGRlZC5leHBhbmQodHJ1ZSk7XG4gICAgICAgICAgICAgIGFkZGVkLnNlbGVjdCh0cnVlKTtcbiAgICAgICAgICAgICAgYWRkZWQuYWN0aXZhdGUodHJ1ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gb25Nb2RlbENoYW5nZUV2ZW50KGV2ZW50LCBuYW1lKSB7XG4gICAgICAvLyBsZXRzIGZpbHRlciBvdXQgZXZlbnRzIGR1ZSB0byB0aGUgbm9kZSBjaGFuZ2luZyBjYXVzaW5nIHRoZVxuICAgICAgLy8gZm9ybXMgdG8gYmUgcmVjcmVhdGVkXG4gICAgICBpZiAoJHNjb3BlLm5vZGVEYXRhKSB7XG4gICAgICAgIHZhciBmaWVsZE1hcCA9ICRzY29wZS5ub2RlRGF0YUNoYW5nZWRGaWVsZHM7XG4gICAgICAgIGlmIChmaWVsZE1hcCkge1xuICAgICAgICAgIGlmIChmaWVsZE1hcFtuYW1lXSkge1xuICAgICAgICAgICAgb25Ob2RlRGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gdGhlIHNlbGVjdGlvbiBoYXMganVzdCBjaGFuZ2VkIHNvIHdlIGdldCB0aGUgaW5pdGlhbCBldmVudFxuICAgICAgICAgICAgLy8gd2UgY2FuIGlnbm9yZSB0aGlzIDopXG4gICAgICAgICAgICBmaWVsZE1hcFtuYW1lXSA9IHRydWU7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gb25Ob2RlRGF0YUNoYW5nZWQoKSB7XG4gICAgICAkc2NvcGUubW9kaWZpZWQgPSB0cnVlO1xuICAgICAgdmFyIHNlbGVjdGVkRm9sZGVyID0gJHNjb3BlLnNlbGVjdGVkRm9sZGVyO1xuICAgICAgaWYgKCRzY29wZS50cmVlTm9kZSAmJiBzZWxlY3RlZEZvbGRlcikge1xuICAgICAgICB2YXIgcm91dGVYbWxOb2RlID0gZ2V0Rm9sZGVyWG1sTm9kZSgkc2NvcGUudHJlZU5vZGUpO1xuICAgICAgICBpZiAocm91dGVYbWxOb2RlKSB7XG4gICAgICAgICAgdmFyIG5vZGVOYW1lID0gcm91dGVYbWxOb2RlLmxvY2FsTmFtZTtcbiAgICAgICAgICB2YXIgbm9kZVNldHRpbmdzID0gQ2FtZWwuZ2V0Q2FtZWxTY2hlbWEobm9kZU5hbWUpO1xuICAgICAgICAgIGlmIChub2RlU2V0dGluZ3MpIHtcbiAgICAgICAgICAgIC8vIHVwZGF0ZSB0aGUgdGl0bGUgYW5kIHRvb2x0aXAgZXRjXG4gICAgICAgICAgICBDYW1lbC51cGRhdGVSb3V0ZU5vZGVMYWJlbEFuZFRvb2x0aXAoc2VsZWN0ZWRGb2xkZXIsIHJvdXRlWG1sTm9kZSwgbm9kZVNldHRpbmdzKTtcbiAgICAgICAgICAgICRzY29wZS50cmVlTm9kZS5yZW5kZXIoZmFsc2UsIGZhbHNlKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgLy8gVE9ETyBub3Qgc3VyZSB3ZSBuZWVkIHRoaXMgdG8gYmUgaG9uZXN0XG4gICAgICAgIHNlbGVjdGVkRm9sZGVyW1wiY2FtZWxOb2RlRGF0YVwiXSA9ICRzY29wZS5ub2RlRGF0YTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBvblJlc3VsdHMocmVzcG9uc2UpIHtcbiAgICAgIHZhciB0ZXh0ID0gcmVzcG9uc2UudGV4dDtcbiAgICAgIGlmICh0ZXh0KSB7XG4gICAgICAgIC8vIGxldHMgcmVtb3ZlIGFueSBkb2RneSBjaGFyYWN0ZXJzIHNvIHdlIGNhbiB1c2UgaXQgYXMgYSBET00gaWRcbiAgICAgICAgdmFyIHRyZWUgPSBDYW1lbC5sb2FkQ2FtZWxUcmVlKHRleHQsICRzY29wZS5wYWdlSWQpO1xuICAgICAgICBpZiAodHJlZSkge1xuICAgICAgICAgICRzY29wZS5jYW1lbENvbnRleHRUcmVlID0gdHJlZTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJObyBYTUwgZm91bmQgZm9yIHBhZ2UgXCIgKyAkc2NvcGUucGFnZUlkKTtcbiAgICAgIH1cbiAgICAgIENvcmUuJGFwcGx5TGF0ZXIoJHNjb3BlKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiB1cGRhdGVWaWV3KCkge1xuICAgICAgJHNjb3BlLmxvYWRFbmRwb2ludE5hbWVzKCk7XG4gICAgICAkc2NvcGUucGFnZUlkID0gV2lraS5wYWdlSWQoJHJvdXRlUGFyYW1zLCAkbG9jYXRpb24pO1xuICAgICAgY29uc29sZS5sb2coXCJIYXMgcGFnZSBpZDogXCIgKyAkc2NvcGUucGFnZUlkICsgXCIgd2l0aCAkcm91dGVQYXJhbXMgXCIgKyBKU09OLnN0cmluZ2lmeSgkcm91dGVQYXJhbXMpKTtcblxuICAgICAgd2lraVJlcG9zaXRvcnkuZ2V0UGFnZSgkc2NvcGUuYnJhbmNoLCAkc2NvcGUucGFnZUlkLCAkc2NvcGUub2JqZWN0SWQsIG9uUmVzdWx0cyk7XG4gICAgfVxuXG5cbiAgICBmdW5jdGlvbiBnb1RvVmlldygpIHtcbiAgICAgIC8vIFRPRE8gbGV0cyBuYXZpZ2F0ZSB0byB0aGUgdmlldyBpZiB3ZSBoYXZlIGEgc2VwYXJhdGUgdmlldyBvbmUgZGF5IDopXG4gICAgICAvKlxuICAgICAgIGlmICgkc2NvcGUuYnJlYWRjcnVtYnMgJiYgJHNjb3BlLmJyZWFkY3J1bWJzLmxlbmd0aCA+IDEpIHtcbiAgICAgICB2YXIgdmlld0xpbmsgPSAkc2NvcGUuYnJlYWRjcnVtYnNbJHNjb3BlLmJyZWFkY3J1bWJzLmxlbmd0aCAtIDJdO1xuICAgICAgIGNvbnNvbGUubG9nKFwiZ29Ub1ZpZXcgaGFzIGZvdW5kIHZpZXcgXCIgKyB2aWV3TGluayk7XG4gICAgICAgdmFyIHBhdGggPSBDb3JlLnRyaW1MZWFkaW5nKHZpZXdMaW5rLCBcIiNcIik7XG4gICAgICAgJGxvY2F0aW9uLnBhdGgocGF0aCk7XG4gICAgICAgfSBlbHNlIHtcbiAgICAgICBjb25zb2xlLmxvZyhcImdvVG9WaWV3IGhhcyBubyBicmVhZGNydW1icyFcIik7XG4gICAgICAgfVxuICAgICAgICovXG4gICAgfVxuXG4gICAgJHNjb3BlLmRvU3dpdGNoVG9DYW52YXNWaWV3ID0gKCkgPT4ge1xuICAgICAgJGxvY2F0aW9uLnVybChDb3JlLnRyaW1MZWFkaW5nKChXaWtpLnN0YXJ0TGluaygkc2NvcGUuYnJhbmNoKSArIFwiL2NhbWVsL2NhbnZhcy9cIiArICRzY29wZS5wYWdlSWQpLCAnIycpKTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLmNvbmZpcm1Td2l0Y2hUb0NhbnZhc1ZpZXcgPSAoKSA9PiB7XG4gICAgICBpZiAoJHNjb3BlLm1vZGlmaWVkKSB7XG4gICAgICAgICRzY29wZS5zd2l0Y2hUb0NhbnZhc1ZpZXcub3BlbigpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgJHNjb3BlLmRvU3dpdGNoVG9DYW52YXNWaWV3KCk7XG4gICAgICB9XG4gICAgfTtcblxuICB9XSk7XG59XG4iLCIvKipcbiAqIEBtb2R1bGUgV2lraVxuICovXG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi93aWtpUGx1Z2luLnRzXCIvPlxubW9kdWxlIFdpa2kge1xuICBleHBvcnQgdmFyIENhbWVsQ2FudmFzQ29udHJvbGxlciA9IF9tb2R1bGUuY29udHJvbGxlcihcIldpa2kuQ2FtZWxDYW52YXNDb250cm9sbGVyXCIsIFtcIiRzY29wZVwiLCBcIiRlbGVtZW50XCIsIFwiJHJvdXRlUGFyYW1zXCIsIFwiJHRlbXBsYXRlQ2FjaGVcIiwgXCIkaW50ZXJwb2xhdGVcIiwgXCIkbG9jYXRpb25cIiwgKCRzY29wZSwgJGVsZW1lbnQsICRyb3V0ZVBhcmFtcywgJHRlbXBsYXRlQ2FjaGUsICRpbnRlcnBvbGF0ZSwgJGxvY2F0aW9uKSA9PiB7XG4gICAgdmFyIGpzUGx1bWJJbnN0YW5jZSA9IGpzUGx1bWIuZ2V0SW5zdGFuY2UoKTtcblxuICAgIFdpa2kuaW5pdFNjb3BlKCRzY29wZSwgJHJvdXRlUGFyYW1zLCAkbG9jYXRpb24pO1xuICAgIHZhciB3aWtpUmVwb3NpdG9yeSA9ICRzY29wZS53aWtpUmVwb3NpdG9yeTtcblxuICAgICRzY29wZS5hZGREaWFsb2cgPSBuZXcgVUkuRGlhbG9nKCk7XG4gICAgJHNjb3BlLnByb3BlcnRpZXNEaWFsb2cgPSBuZXcgVUkuRGlhbG9nKCk7XG4gICAgJHNjb3BlLnN3aXRjaFRvVHJlZVZpZXcgPSBuZXcgVUkuRGlhbG9nKCk7XG4gICAgJHNjb3BlLm1vZGlmaWVkID0gZmFsc2U7XG4gICAgJHNjb3BlLmNhbWVsSWdub3JlSWRGb3JMYWJlbCA9IENhbWVsLmlnbm9yZUlkRm9yTGFiZWwobG9jYWxTdG9yYWdlKTtcbiAgICAkc2NvcGUuY2FtZWxNYXhpbXVtTGFiZWxXaWR0aCA9IENhbWVsLm1heGltdW1MYWJlbFdpZHRoKGxvY2FsU3RvcmFnZSk7XG4gICAgJHNjb3BlLmNhbWVsTWF4aW11bVRyYWNlT3JEZWJ1Z0JvZHlMZW5ndGggPSBDYW1lbC5tYXhpbXVtVHJhY2VPckRlYnVnQm9keUxlbmd0aChsb2NhbFN0b3JhZ2UpO1xuXG4gICAgJHNjb3BlLmZvcm1zID0ge307XG5cbiAgICAkc2NvcGUubm9kZVRlbXBsYXRlID0gJGludGVycG9sYXRlKCR0ZW1wbGF0ZUNhY2hlLmdldChcIm5vZGVUZW1wbGF0ZVwiKSk7XG5cbiAgICAkc2NvcGUuJHdhdGNoKFwiY2FtZWxDb250ZXh0VHJlZVwiLCAoKSA9PiB7XG4gICAgICB2YXIgdHJlZSA9ICRzY29wZS5jYW1lbENvbnRleHRUcmVlO1xuICAgICAgJHNjb3BlLnJvb3RGb2xkZXIgPSB0cmVlO1xuICAgICAgLy8gbm93IHdlJ3ZlIGdvdCBjaWQgdmFsdWVzIGluIHRoZSB0cmVlIGFuZCBET00sIGxldHMgY3JlYXRlIGFuIGluZGV4IHNvIHdlIGNhbiBiaW5kIHRoZSBET00gdG8gdGhlIHRyZWUgbW9kZWxcbiAgICAgICRzY29wZS5mb2xkZXJzID0gQ2FtZWwuYWRkRm9sZGVyc1RvSW5kZXgoJHNjb3BlLnJvb3RGb2xkZXIpO1xuXG4gICAgICB2YXIgZG9jID0gQ29yZS5wYXRoR2V0KHRyZWUsIFtcInhtbERvY3VtZW50XCJdKTtcbiAgICAgIGlmIChkb2MpIHtcbiAgICAgICAgJHNjb3BlLmRvYyA9IGRvYztcbiAgICAgICAgcmVsb2FkUm91dGVJZHMoKTtcbiAgICAgICAgb25Sb3V0ZVNlbGVjdGlvbkNoYW5nZWQoKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgICRzY29wZS5hZGRBbmRDbG9zZURpYWxvZyA9ICgpID0+IHtcbiAgICAgIHZhciBub2RlTW9kZWwgPSAkc2NvcGUuc2VsZWN0ZWROb2RlTW9kZWwoKTtcbiAgICAgIGlmIChub2RlTW9kZWwpIHtcbiAgICAgICAgYWRkTmV3Tm9kZShub2RlTW9kZWwpO1xuICAgICAgfVxuICAgICAgJHNjb3BlLmFkZERpYWxvZy5jbG9zZSgpO1xuICAgIH07XG5cbiAgICAkc2NvcGUucmVtb3ZlTm9kZSA9ICgpID0+IHtcbiAgICAgIHZhciBmb2xkZXIgPSBnZXRTZWxlY3RlZE9yUm91dGVGb2xkZXIoKTtcbiAgICAgIGlmIChmb2xkZXIpIHtcbiAgICAgICAgdmFyIG5vZGVOYW1lID0gQ2FtZWwuZ2V0Rm9sZGVyQ2FtZWxOb2RlSWQoZm9sZGVyKTtcbiAgICAgICAgZm9sZGVyLmRldGFjaCgpO1xuICAgICAgICBpZiAoXCJyb3V0ZVwiID09PSBub2RlTmFtZSkge1xuICAgICAgICAgIC8vIGxldHMgYWxzbyBjbGVhciB0aGUgc2VsZWN0ZWQgcm91dGUgbm9kZVxuICAgICAgICAgICRzY29wZS5zZWxlY3RlZFJvdXRlSWQgPSBudWxsO1xuICAgICAgICB9XG4gICAgICAgIHVwZGF0ZVNlbGVjdGlvbihudWxsKTtcbiAgICAgICAgdHJlZU1vZGlmaWVkKCk7XG4gICAgICB9XG4gICAgfTtcblxuICAgICRzY29wZS5kb0xheW91dCA9ICgpID0+IHtcbiAgICAgICRzY29wZS5kcmF3blJvdXRlSWQgPSBudWxsO1xuICAgICAgb25Sb3V0ZVNlbGVjdGlvbkNoYW5nZWQoKTtcbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gaXNSb3V0ZU9yTm9kZSgpIHtcbiAgICAgIHJldHVybiAhJHNjb3BlLnNlbGVjdGVkRm9sZGVyXG4gICAgfVxuXG4gICAgJHNjb3BlLmdldERlbGV0ZVRpdGxlID0gKCkgPT4ge1xuICAgICAgaWYgKGlzUm91dGVPck5vZGUoKSkge1xuICAgICAgICByZXR1cm4gXCJEZWxldGUgdGhpcyByb3V0ZVwiO1xuICAgICAgfVxuICAgICAgcmV0dXJuIFwiRGVsZXRlIHRoaXMgbm9kZVwiO1xuICAgIH1cblxuICAgICRzY29wZS5nZXREZWxldGVUYXJnZXQgPSAoKSA9PiB7XG4gICAgICBpZiAoaXNSb3V0ZU9yTm9kZSgpKSB7XG4gICAgICAgIHJldHVybiBcIlJvdXRlXCI7XG4gICAgICB9XG4gICAgICByZXR1cm4gXCJOb2RlXCI7XG4gICAgfVxuXG4gICAgJHNjb3BlLmlzRm9ybURpcnR5ID0gKCkgPT4ge1xuICAgICAgbG9nLmRlYnVnKFwiZW5kcG9pbnRGb3JtOiBcIiwgJHNjb3BlLmVuZHBvaW50Rm9ybSk7XG4gICAgICBpZiAoJHNjb3BlLmVuZHBvaW50Rm9ybS4kZGlydHkpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgICBpZiAoISRzY29wZS5mb3Jtc1snZm9ybUVkaXRvciddKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiAkc2NvcGUuZm9ybXNbJ2Zvcm1FZGl0b3InXVsnJGRpcnR5J107XG4gICAgICB9XG4gICAgfTtcblxuICAgIC8qIFRPRE9cbiAgICAgJHNjb3BlLnJlc2V0Rm9ybXMgPSAoKSA9PiB7XG5cbiAgICAgfVxuICAgICAqL1xuXG4gICAgLypcbiAgICAgKiBDb252ZXJ0cyBhIHBhdGggYW5kIGEgc2V0IG9mIGVuZHBvaW50IHBhcmFtZXRlcnMgaW50byBhIFVSSSB3ZSBjYW4gdGhlbiB1c2UgdG8gc3RvcmUgaW4gdGhlIFhNTFxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGNyZWF0ZUVuZHBvaW50VVJJKGVuZHBvaW50U2NoZW1lOnN0cmluZywgc2xhc2hlc1RleHQ6c3RyaW5nLCBlbmRwb2ludFBhdGg6c3RyaW5nLCBlbmRwb2ludFBhcmFtZXRlcnM6YW55KSB7XG4gICAgICBjb25zb2xlLmxvZyhcInNjaGVtZSBcIiArIGVuZHBvaW50U2NoZW1lICsgXCIgcGF0aCBcIiArIGVuZHBvaW50UGF0aCArIFwiIHBhcmFtZXRlcnMgXCIgKyBlbmRwb2ludFBhcmFtZXRlcnMpO1xuICAgICAgLy8gbm93IGxldHMgY3JlYXRlIHRoZSBuZXcgVVJJIGZyb20gdGhlIHBhdGggYW5kIHBhcmFtZXRlcnNcbiAgICAgIC8vIFRPRE8gc2hvdWxkIHdlIHVzZSBKTVggZm9yIHRoaXM/XG4gICAgICB2YXIgdXJpID0gKChlbmRwb2ludFNjaGVtZSkgPyBlbmRwb2ludFNjaGVtZSArIFwiOlwiICsgc2xhc2hlc1RleHQgOiBcIlwiKSArIChlbmRwb2ludFBhdGggPyBlbmRwb2ludFBhdGggOiBcIlwiKTtcbiAgICAgIHZhciBwYXJhbVRleHQgPSBDb3JlLmhhc2hUb1N0cmluZyhlbmRwb2ludFBhcmFtZXRlcnMpO1xuICAgICAgaWYgKHBhcmFtVGV4dCkge1xuICAgICAgICB1cmkgKz0gXCI/XCIgKyBwYXJhbVRleHQ7XG4gICAgICB9XG4gICAgICByZXR1cm4gdXJpO1xuICAgIH1cblxuICAgICRzY29wZS51cGRhdGVQcm9wZXJ0aWVzID0gKCkgPT4ge1xuICAgICAgbG9nLmluZm8oXCJvbGQgVVJJIGlzIFwiICsgJHNjb3BlLm5vZGVEYXRhLnVyaSk7XG4gICAgICB2YXIgdXJpID0gY3JlYXRlRW5kcG9pbnRVUkkoJHNjb3BlLmVuZHBvaW50U2NoZW1lLCAoJHNjb3BlLmVuZHBvaW50UGF0aEhhc1NsYXNoZXMgPyBcIi8vXCIgOiBcIlwiKSwgJHNjb3BlLmVuZHBvaW50UGF0aCwgJHNjb3BlLmVuZHBvaW50UGFyYW1ldGVycyk7XG4gICAgICBsb2cuaW5mbyhcIm5ldyBVUkkgaXMgXCIgKyB1cmkpO1xuICAgICAgaWYgKHVyaSkge1xuICAgICAgICAkc2NvcGUubm9kZURhdGEudXJpID0gdXJpO1xuICAgICAgfVxuXG4gICAgICB2YXIga2V5ID0gbnVsbDtcbiAgICAgIHZhciBzZWxlY3RlZEZvbGRlciA9ICRzY29wZS5zZWxlY3RlZEZvbGRlcjtcbiAgICAgIGlmIChzZWxlY3RlZEZvbGRlcikge1xuICAgICAgICBrZXkgPSBzZWxlY3RlZEZvbGRlci5rZXk7XG5cbiAgICAgICAgLy8gbGV0cyBkZWxldGUgdGhlIGN1cnJlbnQgc2VsZWN0ZWQgbm9kZSdzIGRpdiBzbyBpdHMgdXBkYXRlZCB3aXRoIHRoZSBuZXcgdGVtcGxhdGUgdmFsdWVzXG4gICAgICAgIHZhciBlbGVtZW50cyA9ICRlbGVtZW50LmZpbmQoXCIuY2FudmFzXCIpLmZpbmQoXCJbaWQ9J1wiICsga2V5ICsgXCInXVwiKS5maXJzdCgpLnJlbW92ZSgpO1xuICAgICAgfVxuXG4gICAgICB0cmVlTW9kaWZpZWQoKTtcblxuICAgICAgaWYgKGtleSkge1xuICAgICAgICB1cGRhdGVTZWxlY3Rpb24oa2V5KVxuICAgICAgfVxuXG4gICAgICBpZiAoJHNjb3BlLmlzRm9ybURpcnR5KCkpIHtcbiAgICAgICAgJHNjb3BlLmVuZHBvaW50Rm9ybS4kc2V0UHJpc3RpbmUoKTtcbiAgICAgICAgaWYgKCRzY29wZS5mb3Jtc1snZm9ybUVkaXRvciddKSB7XG4gICAgICAgICAgJHNjb3BlLmZvcm1zWydmb3JtRWRpdG9yJ10uJHNldFByaXN0aW5lKCk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLnNhdmUgPSAoKSA9PiB7XG4gICAgICAvLyBnZW5lcmF0ZSB0aGUgbmV3IFhNTFxuICAgICAgaWYgKCRzY29wZS5tb2RpZmllZCAmJiAkc2NvcGUucm9vdEZvbGRlcikge1xuICAgICAgICB2YXIgeG1sTm9kZSA9IENhbWVsLmdlbmVyYXRlWG1sRnJvbUZvbGRlcigkc2NvcGUucm9vdEZvbGRlcik7XG4gICAgICAgIGlmICh4bWxOb2RlKSB7XG4gICAgICAgICAgdmFyIHRleHQgPSBDb3JlLnhtbE5vZGVUb1N0cmluZyh4bWxOb2RlKTtcbiAgICAgICAgICBpZiAodGV4dCkge1xuICAgICAgICAgICAgdmFyIGRlY29kZWQgPSBkZWNvZGVVUklDb21wb25lbnQodGV4dCk7XG4gICAgICAgICAgICBsb2cuZGVidWcoXCJTYXZpbmcgeG1sIGRlY29kZWQ6IFwiICsgZGVjb2RlZCk7XG5cbiAgICAgICAgICAgIC8vIGxldHMgc2F2ZSB0aGUgZmlsZS4uLlxuICAgICAgICAgICAgdmFyIGNvbW1pdE1lc3NhZ2UgPSAkc2NvcGUuY29tbWl0TWVzc2FnZSB8fCBcIlVwZGF0ZWQgcGFnZSBcIiArICRzY29wZS5wYWdlSWQ7XG4gICAgICAgICAgICB3aWtpUmVwb3NpdG9yeS5wdXRQYWdlKCRzY29wZS5icmFuY2gsICRzY29wZS5wYWdlSWQsIGRlY29kZWQsIGNvbW1pdE1lc3NhZ2UsIChzdGF0dXMpID0+IHtcbiAgICAgICAgICAgICAgV2lraS5vbkNvbXBsZXRlKHN0YXR1cyk7XG4gICAgICAgICAgICAgIENvcmUubm90aWZpY2F0aW9uKFwic3VjY2Vzc1wiLCBcIlNhdmVkIFwiICsgJHNjb3BlLnBhZ2VJZCk7XG4gICAgICAgICAgICAgICRzY29wZS5tb2RpZmllZCA9IGZhbHNlO1xuICAgICAgICAgICAgICBnb1RvVmlldygpO1xuICAgICAgICAgICAgICBDb3JlLiRhcHBseSgkc2NvcGUpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfTtcblxuICAgICRzY29wZS5jYW5jZWwgPSAoKSA9PiB7XG4gICAgICBjb25zb2xlLmxvZyhcImNhbmNlbGxpbmcuLi5cIik7XG4gICAgICAvLyBUT0RPIHNob3cgZGlhbG9nIGlmIGZvbGtzIGFyZSBhYm91dCB0byBsb3NlIGNoYW5nZXMuLi5cbiAgICB9O1xuXG4gICAgJHNjb3BlLiR3YXRjaChcInNlbGVjdGVkUm91dGVJZFwiLCBvblJvdXRlU2VsZWN0aW9uQ2hhbmdlZCk7XG5cbiAgICBmdW5jdGlvbiBnb1RvVmlldygpIHtcbiAgICAgIC8vIFRPRE8gbGV0cyBuYXZpZ2F0ZSB0byB0aGUgdmlldyBpZiB3ZSBoYXZlIGEgc2VwYXJhdGUgdmlldyBvbmUgZGF5IDopXG4gICAgICAvKlxuICAgICAgIGlmICgkc2NvcGUuYnJlYWRjcnVtYnMgJiYgJHNjb3BlLmJyZWFkY3J1bWJzLmxlbmd0aCA+IDEpIHtcbiAgICAgICB2YXIgdmlld0xpbmsgPSAkc2NvcGUuYnJlYWRjcnVtYnNbJHNjb3BlLmJyZWFkY3J1bWJzLmxlbmd0aCAtIDJdO1xuICAgICAgIGNvbnNvbGUubG9nKFwiZ29Ub1ZpZXcgaGFzIGZvdW5kIHZpZXcgXCIgKyB2aWV3TGluayk7XG4gICAgICAgdmFyIHBhdGggPSBDb3JlLnRyaW1MZWFkaW5nKHZpZXdMaW5rLCBcIiNcIik7XG4gICAgICAgJGxvY2F0aW9uLnBhdGgocGF0aCk7XG4gICAgICAgfSBlbHNlIHtcbiAgICAgICBjb25zb2xlLmxvZyhcImdvVG9WaWV3IGhhcyBubyBicmVhZGNydW1icyFcIik7XG4gICAgICAgfVxuICAgICAgICovXG4gICAgfVxuXG4gICAgZnVuY3Rpb24gYWRkTmV3Tm9kZShub2RlTW9kZWwpIHtcbiAgICAgIHZhciBkb2MgPSAkc2NvcGUuZG9jIHx8IGRvY3VtZW50O1xuICAgICAgdmFyIHBhcmVudEZvbGRlciA9ICRzY29wZS5zZWxlY3RlZEZvbGRlciB8fCAkc2NvcGUucm9vdEZvbGRlcjtcbiAgICAgIHZhciBrZXkgPSBub2RlTW9kZWxbXCJfaWRcIl07XG4gICAgICBpZiAoIWtleSkge1xuICAgICAgICBjb25zb2xlLmxvZyhcIldBUk5JTkc6IG5vIGlkIGZvciBtb2RlbCBcIiArIEpTT04uc3RyaW5naWZ5KG5vZGVNb2RlbCkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIHRyZWVOb2RlID0gJHNjb3BlLnNlbGVjdGVkRm9sZGVyO1xuICAgICAgICBpZiAoa2V5ID09PSBcInJvdXRlXCIpIHtcbiAgICAgICAgICAvLyBsZXRzIGFkZCB0byB0aGUgcm9vdCBvZiB0aGUgdHJlZVxuICAgICAgICAgIHRyZWVOb2RlID0gJHNjb3BlLnJvb3RGb2xkZXI7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgaWYgKCF0cmVlTm9kZSkge1xuICAgICAgICAgICAgLy8gbGV0cyBzZWxlY3QgdGhlIGxhc3Qgcm91dGUgLSBhbmQgY3JlYXRlIGEgbmV3IHJvdXRlIGlmIG5lZWQgYmVcbiAgICAgICAgICAgIHZhciByb290ID0gJHNjb3BlLnJvb3RGb2xkZXI7XG4gICAgICAgICAgICB2YXIgY2hpbGRyZW4gPSByb290LmNoaWxkcmVuO1xuICAgICAgICAgICAgaWYgKCFjaGlsZHJlbiB8fCAhY2hpbGRyZW4ubGVuZ3RoKSB7XG4gICAgICAgICAgICAgIGFkZE5ld05vZGUoQ2FtZWwuZ2V0Q2FtZWxTY2hlbWEoXCJyb3V0ZVwiKSk7XG4gICAgICAgICAgICAgIGNoaWxkcmVuID0gcm9vdC5jaGlsZHJlbjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChjaGlsZHJlbiAmJiBjaGlsZHJlbi5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgdHJlZU5vZGUgPSBnZXRSb3V0ZUZvbGRlcigkc2NvcGUucm9vdEZvbGRlciwgJHNjb3BlLnNlbGVjdGVkUm91dGVJZCkgfHwgY2hpbGRyZW5bY2hpbGRyZW4ubGVuZ3RoIC0gMV07XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIkNvdWxkIG5vdCBhZGQgYSBuZXcgcm91dGUgdG8gdGhlIGVtcHR5IHRyZWUhXCIpO1xuICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gaWYgdGhlIHBhcmVudCBmb2xkZXIgbGlrZXMgdG8gYWN0IGFzIGEgcGlwZWxpbmUsIHRoZW4gYWRkXG4gICAgICAgICAgLy8gYWZ0ZXIgdGhlIHBhcmVudCwgcmF0aGVyIHRoYW4gYXMgYSBjaGlsZFxuICAgICAgICAgIHZhciBwYXJlbnRUeXBlTmFtZSA9IENhbWVsLmdldEZvbGRlckNhbWVsTm9kZUlkKHRyZWVOb2RlKTtcbiAgICAgICAgICBpZiAoIUNhbWVsLmFjY2VwdE91dHB1dChwYXJlbnRUeXBlTmFtZSkpIHtcbiAgICAgICAgICAgIHRyZWVOb2RlID0gdHJlZU5vZGUucGFyZW50IHx8IHRyZWVOb2RlO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAodHJlZU5vZGUpIHtcbiAgICAgICAgICB2YXIgbm9kZSA9IGRvYy5jcmVhdGVFbGVtZW50KGtleSk7XG4gICAgICAgICAgcGFyZW50Rm9sZGVyID0gdHJlZU5vZGU7XG4gICAgICAgICAgdmFyIGFkZGVkTm9kZSA9IENhbWVsLmFkZFJvdXRlQ2hpbGQocGFyZW50Rm9sZGVyLCBub2RlKTtcbiAgICAgICAgICAvLyBUT0RPIGFkZCB0aGUgc2NoZW1hIGhlcmUgZm9yIGFuIGVsZW1lbnQ/P1xuICAgICAgICAgIC8vIG9yIGRlZmF1bHQgdGhlIGRhdGEgb3Igc29tZXRoaW5nXG5cbiAgICAgICAgICB2YXIgbm9kZURhdGEgPSB7XG4gICAgICAgICAgfTtcbiAgICAgICAgICBpZiAoa2V5ID09PSBcImVuZHBvaW50XCIgJiYgJHNjb3BlLmVuZHBvaW50Q29uZmlnKSB7XG4gICAgICAgICAgICB2YXIga2V5ID0gJHNjb3BlLmVuZHBvaW50Q29uZmlnLmtleTtcbiAgICAgICAgICAgIGlmIChrZXkpIHtcbiAgICAgICAgICAgICAgbm9kZURhdGFbXCJ1cmlcIl0gPSBrZXkgKyBcIjpcIjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgYWRkZWROb2RlW1wiY2FtZWxOb2RlRGF0YVwiXSA9IG5vZGVEYXRhO1xuICAgICAgICAgIGFkZGVkTm9kZVtcImVuZHBvaW50Q29uZmlnXCJdID0gJHNjb3BlLmVuZHBvaW50Q29uZmlnO1xuXG4gICAgICAgICAgaWYgKGtleSA9PT0gXCJyb3V0ZVwiKSB7XG4gICAgICAgICAgICAvLyBsZXRzIGdlbmVyYXRlIGEgbmV3IHJvdXRlSWQgYW5kIHN3aXRjaCB0byBpdFxuICAgICAgICAgICAgdmFyIGNvdW50ID0gJHNjb3BlLnJvdXRlSWRzLmxlbmd0aDtcbiAgICAgICAgICAgIHZhciBub2RlSWQgPSBudWxsO1xuICAgICAgICAgICAgd2hpbGUgKHRydWUpIHtcbiAgICAgICAgICAgICAgbm9kZUlkID0gXCJyb3V0ZVwiICsgKCsrY291bnQpO1xuICAgICAgICAgICAgICBpZiAoISRzY29wZS5yb3V0ZUlkcy5maW5kKG5vZGVJZCkpIHtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYWRkZWROb2RlW1wicm91dGVYbWxOb2RlXCJdLnNldEF0dHJpYnV0ZShcImlkXCIsIG5vZGVJZCk7XG4gICAgICAgICAgICAkc2NvcGUuc2VsZWN0ZWRSb3V0ZUlkID0gbm9kZUlkO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgdHJlZU1vZGlmaWVkKCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gdHJlZU1vZGlmaWVkKHJlcG9zaXRpb24gPSB0cnVlKSB7XG4gICAgICAvLyBsZXRzIHJlY3JlYXRlIHRoZSBYTUwgbW9kZWwgZnJvbSB0aGUgdXBkYXRlIEZvbGRlciB0cmVlXG4gICAgICB2YXIgbmV3RG9jID0gQ2FtZWwuZ2VuZXJhdGVYbWxGcm9tRm9sZGVyKCRzY29wZS5yb290Rm9sZGVyKTtcbiAgICAgIHZhciB0cmVlID0gQ2FtZWwubG9hZENhbWVsVHJlZShuZXdEb2MsICRzY29wZS5wYWdlSWQpO1xuICAgICAgaWYgKHRyZWUpIHtcbiAgICAgICAgJHNjb3BlLnJvb3RGb2xkZXIgPSB0cmVlO1xuICAgICAgICAkc2NvcGUuZG9jID0gQ29yZS5wYXRoR2V0KHRyZWUsIFtcInhtbERvY3VtZW50XCJdKTtcbiAgICAgIH1cbiAgICAgICRzY29wZS5tb2RpZmllZCA9IHRydWU7XG4gICAgICByZWxvYWRSb3V0ZUlkcygpO1xuICAgICAgJHNjb3BlLmRvTGF5b3V0KCk7XG4gICAgICBDb3JlLiRhcHBseSgkc2NvcGUpO1xuICAgIH1cblxuXG4gICAgZnVuY3Rpb24gcmVsb2FkUm91dGVJZHMoKSB7XG4gICAgICAkc2NvcGUucm91dGVJZHMgPSBbXTtcbiAgICAgIHZhciBkb2MgPSAkKCRzY29wZS5kb2MpO1xuICAgICAgJHNjb3BlLmNhbWVsU2VsZWN0aW9uRGV0YWlscy5zZWxlY3RlZENhbWVsQ29udGV4dElkID0gZG9jLmZpbmQoXCJjYW1lbENvbnRleHRcIikuYXR0cihcImlkXCIpO1xuICAgICAgZG9jLmZpbmQoXCJyb3V0ZVwiKS5lYWNoKChpZHgsIHJvdXRlKSA9PiB7XG4gICAgICAgIHZhciBpZCA9IHJvdXRlLmdldEF0dHJpYnV0ZShcImlkXCIpO1xuICAgICAgICBpZiAoaWQpIHtcbiAgICAgICAgICAkc2NvcGUucm91dGVJZHMucHVzaChpZCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIG9uUm91dGVTZWxlY3Rpb25DaGFuZ2VkKCkge1xuICAgICAgaWYgKCRzY29wZS5kb2MpIHtcbiAgICAgICAgaWYgKCEkc2NvcGUuc2VsZWN0ZWRSb3V0ZUlkICYmICRzY29wZS5yb3V0ZUlkcyAmJiAkc2NvcGUucm91dGVJZHMubGVuZ3RoKSB7XG4gICAgICAgICAgJHNjb3BlLnNlbGVjdGVkUm91dGVJZCA9ICRzY29wZS5yb3V0ZUlkc1swXTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoJHNjb3BlLnNlbGVjdGVkUm91dGVJZCAmJiAkc2NvcGUuc2VsZWN0ZWRSb3V0ZUlkICE9PSAkc2NvcGUuZHJhd25Sb3V0ZUlkKSB7XG4gICAgICAgICAgdmFyIG5vZGVzID0gW107XG4gICAgICAgICAgdmFyIGxpbmtzID0gW107XG4gICAgICAgICAgQ2FtZWwubG9hZFJvdXRlWG1sTm9kZXMoJHNjb3BlLCAkc2NvcGUuZG9jLCAkc2NvcGUuc2VsZWN0ZWRSb3V0ZUlkLCBub2RlcywgbGlua3MsIGdldFdpZHRoKCkpO1xuICAgICAgICAgIHVwZGF0ZVNlbGVjdGlvbigkc2NvcGUuc2VsZWN0ZWRSb3V0ZUlkKTtcbiAgICAgICAgICAvLyBub3cgd2UndmUgZ290IGNpZCB2YWx1ZXMgaW4gdGhlIHRyZWUgYW5kIERPTSwgbGV0cyBjcmVhdGUgYW4gaW5kZXggc28gd2UgY2FuIGJpbmQgdGhlIERPTSB0byB0aGUgdHJlZSBtb2RlbFxuICAgICAgICAgICRzY29wZS5mb2xkZXJzID0gQ2FtZWwuYWRkRm9sZGVyc1RvSW5kZXgoJHNjb3BlLnJvb3RGb2xkZXIpO1xuICAgICAgICAgIHNob3dHcmFwaChub2RlcywgbGlua3MpO1xuICAgICAgICAgICRzY29wZS5kcmF3blJvdXRlSWQgPSAkc2NvcGUuc2VsZWN0ZWRSb3V0ZUlkO1xuICAgICAgICB9XG4gICAgICAgICRzY29wZS5jYW1lbFNlbGVjdGlvbkRldGFpbHMuc2VsZWN0ZWRSb3V0ZUlkID0gJHNjb3BlLnNlbGVjdGVkUm91dGVJZDtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzaG93R3JhcGgobm9kZXMsIGxpbmtzKSB7XG4gICAgICBsYXlvdXRHcmFwaChub2RlcywgbGlua3MpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldE5vZGVJZChub2RlKSB7XG4gICAgICBpZiAoYW5ndWxhci5pc051bWJlcihub2RlKSkge1xuICAgICAgICB2YXIgaWR4ID0gbm9kZTtcbiAgICAgICAgbm9kZSA9ICRzY29wZS5ub2RlU3RhdGVzW2lkeF07XG4gICAgICAgIGlmICghbm9kZSkge1xuICAgICAgICAgIGNvbnNvbGUubG9nKFwiQ2FudCBmaW5kIG5vZGUgYXQgXCIgKyBpZHgpO1xuICAgICAgICAgIHJldHVybiBcIm5vZGUtXCIgKyBpZHg7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiBub2RlLmNpZCB8fCBcIm5vZGUtXCIgKyBub2RlLmlkO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldFNlbGVjdGVkT3JSb3V0ZUZvbGRlcigpIHtcbiAgICAgIHJldHVybiAkc2NvcGUuc2VsZWN0ZWRGb2xkZXIgfHwgZ2V0Um91dGVGb2xkZXIoJHNjb3BlLnJvb3RGb2xkZXIsICRzY29wZS5zZWxlY3RlZFJvdXRlSWQpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldENvbnRhaW5lckVsZW1lbnQoKSB7XG4gICAgICB2YXIgcm9vdEVsZW1lbnQgPSAkZWxlbWVudDtcbiAgICAgIHZhciBjb250YWluZXJFbGVtZW50ID0gcm9vdEVsZW1lbnQuZmluZChcIi5jYW52YXNcIik7XG4gICAgICBpZiAoIWNvbnRhaW5lckVsZW1lbnQgfHwgIWNvbnRhaW5lckVsZW1lbnQubGVuZ3RoKSBjb250YWluZXJFbGVtZW50ID0gcm9vdEVsZW1lbnQ7XG4gICAgICByZXR1cm4gY29udGFpbmVyRWxlbWVudDtcbiAgICB9XG5cbiAgICAvLyBjb25maWd1cmUgY2FudmFzIGxheW91dCBhbmQgc3R5bGVzXG4gICAgdmFyIGVuZHBvaW50U3R5bGU6YW55W10gPSBbXCJEb3RcIiwgeyByYWRpdXM6IDQsIGNzc0NsYXNzOiAnY2FtZWwtY2FudmFzLWVuZHBvaW50JyB9XTtcbiAgICB2YXIgaG92ZXJQYWludFN0eWxlID0geyBzdHJva2VTdHlsZTogXCJyZWRcIiwgbGluZVdpZHRoOiAzIH07XG4gICAgLy92YXIgbGFiZWxTdHlsZXM6IGFueVtdID0gWyBcIkxhYmVsXCIsIHsgbGFiZWw6XCJGT09cIiwgaWQ6XCJsYWJlbFwiIH1dO1xuICAgIHZhciBsYWJlbFN0eWxlczphbnlbXSA9IFsgXCJMYWJlbFwiIF07XG4gICAgdmFyIGFycm93U3R5bGVzOmFueVtdID0gWyBcIkFycm93XCIsIHtcbiAgICAgIGxvY2F0aW9uOiAxLFxuICAgICAgaWQ6IFwiYXJyb3dcIixcbiAgICAgIGxlbmd0aDogOCxcbiAgICAgIHdpZHRoOiA4LFxuICAgICAgZm9sZGJhY2s6IDAuOFxuICAgIH0gXTtcbiAgICB2YXIgY29ubmVjdG9yU3R5bGU6YW55W10gPSBbIFwiU3RhdGVNYWNoaW5lXCIsIHsgY3VydmluZXNzOiAxMCwgcHJveGltaXR5TGltaXQ6IDUwIH0gXTtcblxuICAgIGpzUGx1bWJJbnN0YW5jZS5pbXBvcnREZWZhdWx0cyh7XG4gICAgICBFbmRwb2ludDogZW5kcG9pbnRTdHlsZSxcbiAgICAgIEhvdmVyUGFpbnRTdHlsZTogaG92ZXJQYWludFN0eWxlLFxuICAgICAgQ29ubmVjdGlvbk92ZXJsYXlzOiBbXG4gICAgICAgIGFycm93U3R5bGVzLFxuICAgICAgICBsYWJlbFN0eWxlc1xuICAgICAgXVxuICAgIH0pO1xuXG4gICAgJHNjb3BlLiRvbignJGRlc3Ryb3knLCAoKSA9PiB7XG4gICAgICBqc1BsdW1iSW5zdGFuY2UucmVzZXQoKTtcbiAgICAgIGRlbGV0ZSBqc1BsdW1iSW5zdGFuY2U7XG4gICAgfSk7XG5cbiAgICAvLyBkb3VibGUgY2xpY2sgb24gYW55IGNvbm5lY3Rpb25cbiAgICBqc1BsdW1iSW5zdGFuY2UuYmluZChcImRibGNsaWNrXCIsIGZ1bmN0aW9uIChjb25uZWN0aW9uLCBvcmlnaW5hbEV2ZW50KSB7XG4gICAgICBpZiAoanNQbHVtYkluc3RhbmNlLmlzU3VzcGVuZERyYXdpbmcoKSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBhbGVydChcImRvdWJsZSBjbGljayBvbiBjb25uZWN0aW9uIGZyb20gXCIgKyBjb25uZWN0aW9uLnNvdXJjZUlkICsgXCIgdG8gXCIgKyBjb25uZWN0aW9uLnRhcmdldElkKTtcbiAgICB9KTtcblxuICAgIGpzUGx1bWJJbnN0YW5jZS5iaW5kKCdjb25uZWN0aW9uJywgZnVuY3Rpb24gKGluZm8sIGV2dCkge1xuICAgICAgLy9sb2cuZGVidWcoXCJDb25uZWN0aW9uIGV2ZW50OiBcIiwgaW5mbyk7XG4gICAgICBsb2cuZGVidWcoXCJDcmVhdGluZyBjb25uZWN0aW9uIGZyb20gXCIsIGluZm8uc291cmNlSWQsIFwiIHRvIFwiLCBpbmZvLnRhcmdldElkKTtcbiAgICAgIHZhciBsaW5rID0gZ2V0TGluayhpbmZvKTtcbiAgICAgIHZhciBzb3VyY2UgPSAkc2NvcGUubm9kZXNbbGluay5zb3VyY2VdO1xuICAgICAgdmFyIHNvdXJjZUZvbGRlciA9ICRzY29wZS5mb2xkZXJzW2xpbmsuc291cmNlXTtcbiAgICAgIHZhciB0YXJnZXRGb2xkZXIgPSAkc2NvcGUuZm9sZGVyc1tsaW5rLnRhcmdldF07XG4gICAgICBpZiAoQ2FtZWwuaXNOZXh0U2libGluZ0FkZGVkQXNDaGlsZChzb3VyY2UudHlwZSkpIHtcbiAgICAgICAgc291cmNlRm9sZGVyLm1vdmVDaGlsZCh0YXJnZXRGb2xkZXIpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc291cmNlRm9sZGVyLnBhcmVudC5pbnNlcnRBZnRlcih0YXJnZXRGb2xkZXIsIHNvdXJjZUZvbGRlcik7XG4gICAgICB9XG4gICAgICB0cmVlTW9kaWZpZWQoKTtcbiAgICB9KTtcblxuICAgIC8vIGxldHMgZGVsZXRlIGNvbm5lY3Rpb25zIG9uIGNsaWNrXG4gICAganNQbHVtYkluc3RhbmNlLmJpbmQoXCJjbGlja1wiLCBmdW5jdGlvbiAoYykge1xuICAgICAgaWYgKGpzUGx1bWJJbnN0YW5jZS5pc1N1c3BlbmREcmF3aW5nKCkpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAganNQbHVtYkluc3RhbmNlLmRldGFjaChjKTtcbiAgICB9KTtcblxuICAgIGZ1bmN0aW9uIGxheW91dEdyYXBoKG5vZGVzLCBsaW5rcykge1xuICAgICAgdmFyIHRyYW5zaXRpb25zID0gW107XG4gICAgICB2YXIgc3RhdGVzID0gQ29yZS5jcmVhdGVHcmFwaFN0YXRlcyhub2RlcywgbGlua3MsIHRyYW5zaXRpb25zKTtcblxuICAgICAgbG9nLmRlYnVnKFwibGlua3M6IFwiLCBsaW5rcyk7XG4gICAgICBsb2cuZGVidWcoXCJ0cmFuc2l0aW9uczogXCIsIHRyYW5zaXRpb25zKTtcblxuICAgICAgJHNjb3BlLm5vZGVTdGF0ZXMgPSBzdGF0ZXM7XG4gICAgICB2YXIgY29udGFpbmVyRWxlbWVudCA9IGdldENvbnRhaW5lckVsZW1lbnQoKTtcblxuICAgICAganNQbHVtYkluc3RhbmNlLmRvV2hpbGVTdXNwZW5kZWQoKCkgPT4ge1xuXG4gICAgICAgIC8vc2V0IG91ciBjb250YWluZXIgdG8gc29tZSBhcmJpdHJhcnkgaW5pdGlhbCBzaXplXG4gICAgICAgIGNvbnRhaW5lckVsZW1lbnQuY3NzKHtcbiAgICAgICAgICAnd2lkdGgnOiAnODAwcHgnLFxuICAgICAgICAgICdoZWlnaHQnOiAnODAwcHgnLFxuICAgICAgICAgICdtaW4taGVpZ2h0JzogJzgwMHB4JyxcbiAgICAgICAgICAnbWluLXdpZHRoJzogJzgwMHB4J1xuICAgICAgICB9KTtcbiAgICAgICAgdmFyIGNvbnRhaW5lckhlaWdodCA9IDA7XG4gICAgICAgIHZhciBjb250YWluZXJXaWR0aCA9IDA7XG5cbiAgICAgICAgY29udGFpbmVyRWxlbWVudC5maW5kKCdkaXYuY29tcG9uZW50JykuZWFjaCgoaSwgZWwpID0+IHtcbiAgICAgICAgICBsb2cuZGVidWcoXCJDaGVja2luZzogXCIsIGVsLCBcIiBcIiwgaSk7XG4gICAgICAgICAgaWYgKCFzdGF0ZXMuYW55KChub2RlKSA9PiB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGVsLmlkID09PSBnZXROb2RlSWQobm9kZSk7XG4gICAgICAgICAgICAgIH0pKSB7XG4gICAgICAgICAgICBsb2cuZGVidWcoXCJSZW1vdmluZyBlbGVtZW50OiBcIiwgZWwuaWQpO1xuICAgICAgICAgICAganNQbHVtYkluc3RhbmNlLnJlbW92ZShlbCk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICBhbmd1bGFyLmZvckVhY2goc3RhdGVzLCAobm9kZSkgPT4ge1xuICAgICAgICAgIGxvZy5kZWJ1ZyhcIm5vZGU6IFwiLCBub2RlKTtcbiAgICAgICAgICB2YXIgaWQgPSBnZXROb2RlSWQobm9kZSk7XG4gICAgICAgICAgdmFyIGRpdiA9IGNvbnRhaW5lckVsZW1lbnQuZmluZCgnIycgKyBpZCk7XG5cbiAgICAgICAgICBpZiAoIWRpdlswXSkge1xuICAgICAgICAgICAgZGl2ID0gJCgkc2NvcGUubm9kZVRlbXBsYXRlKHtcbiAgICAgICAgICAgICAgaWQ6IGlkLFxuICAgICAgICAgICAgICBub2RlOiBub2RlXG4gICAgICAgICAgICB9KSk7XG4gICAgICAgICAgICBkaXYuYXBwZW5kVG8oY29udGFpbmVyRWxlbWVudCk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gTWFrZSB0aGUgbm9kZSBhIGpzcGx1bWIgc291cmNlXG4gICAgICAgICAganNQbHVtYkluc3RhbmNlLm1ha2VTb3VyY2UoZGl2LCB7XG4gICAgICAgICAgICBmaWx0ZXI6IFwiaW1nLm5vZGVJY29uXCIsXG4gICAgICAgICAgICBhbmNob3I6IFwiQ29udGludW91c1wiLFxuICAgICAgICAgICAgY29ubmVjdG9yOiBjb25uZWN0b3JTdHlsZSxcbiAgICAgICAgICAgIGNvbm5lY3RvclN0eWxlOiB7IHN0cm9rZVN0eWxlOiBcIiM2NjZcIiwgbGluZVdpZHRoOiAzIH0sXG4gICAgICAgICAgICBtYXhDb25uZWN0aW9uczogLTFcbiAgICAgICAgICB9KTtcblxuICAgICAgICAgIC8vIGFuZCBhbHNvIGEganNwbHVtYiB0YXJnZXRcbiAgICAgICAgICBqc1BsdW1iSW5zdGFuY2UubWFrZVRhcmdldChkaXYsIHtcbiAgICAgICAgICAgIGRyb3BPcHRpb25zOiB7IGhvdmVyQ2xhc3M6IFwiZHJhZ0hvdmVyXCIgfSxcbiAgICAgICAgICAgIGFuY2hvcjogXCJDb250aW51b3VzXCJcbiAgICAgICAgICB9KTtcblxuICAgICAgICAgIGpzUGx1bWJJbnN0YW5jZS5kcmFnZ2FibGUoZGl2LCB7XG4gICAgICAgICAgICBjb250YWlubWVudDogJy5jYW1lbC1jYW52YXMnXG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgICAvLyBhZGQgZXZlbnQgaGFuZGxlcnMgdG8gdGhpcyBub2RlXG4gICAgICAgICAgZGl2LmNsaWNrKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBuZXdGbGFnID0gIWRpdi5oYXNDbGFzcyhcInNlbGVjdGVkXCIpO1xuICAgICAgICAgICAgY29udGFpbmVyRWxlbWVudC5maW5kKCdkaXYuY29tcG9uZW50JykudG9nZ2xlQ2xhc3MoXCJzZWxlY3RlZFwiLCBmYWxzZSk7XG4gICAgICAgICAgICBkaXYudG9nZ2xlQ2xhc3MoXCJzZWxlY3RlZFwiLCBuZXdGbGFnKTtcbiAgICAgICAgICAgIHZhciBpZCA9IGRpdi5hdHRyKFwiaWRcIik7XG4gICAgICAgICAgICB1cGRhdGVTZWxlY3Rpb24obmV3RmxhZyA/IGlkIDogbnVsbCk7XG4gICAgICAgICAgICBDb3JlLiRhcHBseSgkc2NvcGUpO1xuICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgZGl2LmRibGNsaWNrKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBpZCA9IGRpdi5hdHRyKFwiaWRcIik7XG4gICAgICAgICAgICB1cGRhdGVTZWxlY3Rpb24oaWQpO1xuICAgICAgICAgICAgLy8kc2NvcGUucHJvcGVydGllc0RpYWxvZy5vcGVuKCk7XG4gICAgICAgICAgICBDb3JlLiRhcHBseSgkc2NvcGUpO1xuICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgdmFyIGhlaWdodCA9IGRpdi5oZWlnaHQoKTtcbiAgICAgICAgICB2YXIgd2lkdGggPSBkaXYud2lkdGgoKTtcbiAgICAgICAgICBpZiAoaGVpZ2h0IHx8IHdpZHRoKSB7XG4gICAgICAgICAgICBub2RlLndpZHRoID0gd2lkdGg7XG4gICAgICAgICAgICBub2RlLmhlaWdodCA9IGhlaWdodDtcbiAgICAgICAgICAgIGRpdi5jc3Moe1xuICAgICAgICAgICAgICAnbWluLXdpZHRoJzogd2lkdGgsXG4gICAgICAgICAgICAgICdtaW4taGVpZ2h0JzogaGVpZ2h0XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHZhciBlZGdlU2VwID0gMTA7XG5cbiAgICAgICAgLy8gQ3JlYXRlIHRoZSBsYXlvdXQgYW5kIGdldCB0aGUgYnVpbGRHcmFwaFxuICAgICAgICBkYWdyZS5sYXlvdXQoKVxuICAgICAgICAgICAgLm5vZGVTZXAoMTAwKVxuICAgICAgICAgICAgLmVkZ2VTZXAoZWRnZVNlcClcbiAgICAgICAgICAgIC5yYW5rU2VwKDc1KVxuICAgICAgICAgICAgLm5vZGVzKHN0YXRlcylcbiAgICAgICAgICAgIC5lZGdlcyh0cmFuc2l0aW9ucylcbiAgICAgICAgICAgIC5kZWJ1Z0xldmVsKDEpXG4gICAgICAgICAgICAucnVuKCk7XG5cbiAgICAgICAgYW5ndWxhci5mb3JFYWNoKHN0YXRlcywgKG5vZGUpID0+IHtcblxuICAgICAgICAgIC8vIHBvc2l0aW9uIHRoZSBub2RlIGluIHRoZSBncmFwaFxuICAgICAgICAgIHZhciBpZCA9IGdldE5vZGVJZChub2RlKTtcbiAgICAgICAgICB2YXIgZGl2ID0gJChcIiNcIiArIGlkKTtcbiAgICAgICAgICB2YXIgZGl2SGVpZ2h0ID0gZGl2LmhlaWdodCgpO1xuICAgICAgICAgIHZhciBkaXZXaWR0aCA9IGRpdi53aWR0aCgpO1xuICAgICAgICAgIHZhciBsZWZ0T2Zmc2V0ID0gbm9kZS5kYWdyZS54ICsgZGl2V2lkdGg7XG4gICAgICAgICAgdmFyIGJvdHRvbU9mZnNldCA9IG5vZGUuZGFncmUueSArIGRpdkhlaWdodDtcbiAgICAgICAgICBpZiAoY29udGFpbmVySGVpZ2h0IDwgYm90dG9tT2Zmc2V0KSB7XG4gICAgICAgICAgICBjb250YWluZXJIZWlnaHQgPSBib3R0b21PZmZzZXQgKyBlZGdlU2VwICogMjtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKGNvbnRhaW5lcldpZHRoIDwgbGVmdE9mZnNldCkge1xuICAgICAgICAgICAgY29udGFpbmVyV2lkdGggPSBsZWZ0T2Zmc2V0ICsgZWRnZVNlcCAqIDI7XG4gICAgICAgICAgfVxuICAgICAgICAgIGRpdi5jc3Moe3RvcDogbm9kZS5kYWdyZS55LCBsZWZ0OiBub2RlLmRhZ3JlLnh9KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gc2l6ZSB0aGUgY29udGFpbmVyIHRvIGZpdCB0aGUgZ3JhcGhcbiAgICAgICAgY29udGFpbmVyRWxlbWVudC5jc3Moe1xuICAgICAgICAgICd3aWR0aCc6IGNvbnRhaW5lcldpZHRoLFxuICAgICAgICAgICdoZWlnaHQnOiBjb250YWluZXJIZWlnaHQsXG4gICAgICAgICAgJ21pbi1oZWlnaHQnOiBjb250YWluZXJIZWlnaHQsXG4gICAgICAgICAgJ21pbi13aWR0aCc6IGNvbnRhaW5lcldpZHRoXG4gICAgICAgIH0pO1xuXG5cbiAgICAgICAgY29udGFpbmVyRWxlbWVudC5kYmxjbGljayhmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgJHNjb3BlLnByb3BlcnRpZXNEaWFsb2cub3BlbigpO1xuICAgICAgICB9KTtcblxuICAgICAgICBqc1BsdW1iSW5zdGFuY2Uuc2V0U3VzcGVuZEV2ZW50cyh0cnVlKTtcbiAgICAgICAgLy8gRGV0YWNoIGFsbCB0aGUgY3VycmVudCBjb25uZWN0aW9ucyBhbmQgcmVjb25uZWN0IGV2ZXJ5dGhpbmcgYmFzZWQgb24gdGhlIHVwZGF0ZWQgZ3JhcGhcbiAgICAgICAganNQbHVtYkluc3RhbmNlLmRldGFjaEV2ZXJ5Q29ubmVjdGlvbih7ZmlyZUV2ZW50OiBmYWxzZX0pO1xuXG4gICAgICAgIGFuZ3VsYXIuZm9yRWFjaChsaW5rcywgKGxpbmspID0+IHtcbiAgICAgICAgICBqc1BsdW1iSW5zdGFuY2UuY29ubmVjdCh7XG4gICAgICAgICAgICBzb3VyY2U6IGdldE5vZGVJZChsaW5rLnNvdXJjZSksXG4gICAgICAgICAgICB0YXJnZXQ6IGdldE5vZGVJZChsaW5rLnRhcmdldClcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgICAgIGpzUGx1bWJJbnN0YW5jZS5zZXRTdXNwZW5kRXZlbnRzKGZhbHNlKTtcblxuICAgICAgfSk7XG5cblxuICAgICAgcmV0dXJuIHN0YXRlcztcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXRMaW5rKGluZm8pIHtcbiAgICAgIHZhciBzb3VyY2VJZCA9IGluZm8uc291cmNlSWQ7XG4gICAgICB2YXIgdGFyZ2V0SWQgPSBpbmZvLnRhcmdldElkO1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgc291cmNlOiBzb3VyY2VJZCxcbiAgICAgICAgdGFyZ2V0OiB0YXJnZXRJZFxuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldE5vZGVCeUNJRChub2RlcywgY2lkKSB7XG4gICAgICByZXR1cm4gbm9kZXMuZmluZCgobm9kZSkgPT4ge1xuICAgICAgICByZXR1cm4gbm9kZS5jaWQgPT09IGNpZDtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qXG4gICAgICogVXBkYXRlcyB0aGUgc2VsZWN0aW9uIHdpdGggdGhlIGdpdmVuIGZvbGRlciBvciBJRFxuICAgICAqL1xuICAgIGZ1bmN0aW9uIHVwZGF0ZVNlbGVjdGlvbihmb2xkZXJPcklkKSB7XG4gICAgICB2YXIgZm9sZGVyID0gbnVsbDtcbiAgICAgIGlmIChhbmd1bGFyLmlzU3RyaW5nKGZvbGRlck9ySWQpKSB7XG4gICAgICAgIHZhciBpZCA9IGZvbGRlck9ySWQ7XG4gICAgICAgIGZvbGRlciA9IChpZCAmJiAkc2NvcGUuZm9sZGVycykgPyAkc2NvcGUuZm9sZGVyc1tpZF0gOiBudWxsO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZm9sZGVyID0gZm9sZGVyT3JJZDtcbiAgICAgIH1cbiAgICAgICRzY29wZS5zZWxlY3RlZEZvbGRlciA9IGZvbGRlcjtcbiAgICAgIGZvbGRlciA9IGdldFNlbGVjdGVkT3JSb3V0ZUZvbGRlcigpO1xuICAgICAgJHNjb3BlLm5vZGVYbWxOb2RlID0gbnVsbDtcbiAgICAgICRzY29wZS5wcm9wZXJ0aWVzVGVtcGxhdGUgPSBudWxsO1xuICAgICAgaWYgKGZvbGRlcikge1xuICAgICAgICB2YXIgbm9kZU5hbWUgPSBDYW1lbC5nZXRGb2xkZXJDYW1lbE5vZGVJZChmb2xkZXIpO1xuICAgICAgICAkc2NvcGUubm9kZURhdGEgPSBDYW1lbC5nZXRSb3V0ZUZvbGRlckpTT04oZm9sZGVyKTtcbiAgICAgICAgJHNjb3BlLm5vZGVEYXRhQ2hhbmdlZEZpZWxkcyA9IHt9O1xuICAgICAgICAkc2NvcGUubm9kZU1vZGVsID0gQ2FtZWwuZ2V0Q2FtZWxTY2hlbWEobm9kZU5hbWUpO1xuICAgICAgICBpZiAoJHNjb3BlLm5vZGVNb2RlbCkge1xuICAgICAgICAgICRzY29wZS5wcm9wZXJ0aWVzVGVtcGxhdGUgPSBcInBsdWdpbnMvd2lraS9odG1sL2NhbWVsUHJvcGVydGllc0VkaXQuaHRtbFwiO1xuICAgICAgICB9XG4gICAgICAgICRzY29wZS5zZWxlY3RlZEVuZHBvaW50ID0gbnVsbDtcbiAgICAgICAgaWYgKFwiZW5kcG9pbnRcIiA9PT0gbm9kZU5hbWUpIHtcbiAgICAgICAgICB2YXIgdXJpID0gJHNjb3BlLm5vZGVEYXRhW1widXJpXCJdO1xuICAgICAgICAgIGlmICh1cmkpIHtcbiAgICAgICAgICAgIC8vIGxldHMgZGVjb21wb3NlIHRoZSBVUkkgaW50byBzY2hlbWUsIHBhdGggYW5kIHBhcmFtZXRlcnNcbiAgICAgICAgICAgIHZhciBpZHggPSB1cmkuaW5kZXhPZihcIjpcIik7XG4gICAgICAgICAgICBpZiAoaWR4ID4gMCkge1xuICAgICAgICAgICAgICB2YXIgZW5kcG9pbnRTY2hlbWUgPSB1cmkuc3Vic3RyaW5nKDAsIGlkeCk7XG4gICAgICAgICAgICAgIHZhciBlbmRwb2ludFBhdGggPSB1cmkuc3Vic3RyaW5nKGlkeCArIDEpO1xuICAgICAgICAgICAgICAvLyBmb3IgZW1wdHkgcGF0aHMgbGV0cyBhc3N1bWUgd2UgbmVlZCAvLyBvbiBhIFVSSVxuICAgICAgICAgICAgICAkc2NvcGUuZW5kcG9pbnRQYXRoSGFzU2xhc2hlcyA9IGVuZHBvaW50UGF0aCA/IGZhbHNlIDogdHJ1ZTtcbiAgICAgICAgICAgICAgaWYgKGVuZHBvaW50UGF0aC5zdGFydHNXaXRoKFwiLy9cIikpIHtcbiAgICAgICAgICAgICAgICBlbmRwb2ludFBhdGggPSBlbmRwb2ludFBhdGguc3Vic3RyaW5nKDIpO1xuICAgICAgICAgICAgICAgICRzY29wZS5lbmRwb2ludFBhdGhIYXNTbGFzaGVzID0gdHJ1ZTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBpZHggPSBlbmRwb2ludFBhdGguaW5kZXhPZihcIj9cIik7XG4gICAgICAgICAgICAgIHZhciBlbmRwb2ludFBhcmFtZXRlcnMgPSB7fTtcbiAgICAgICAgICAgICAgaWYgKGlkeCA+IDApIHtcbiAgICAgICAgICAgICAgICB2YXIgcGFyYW1ldGVycyA9IGVuZHBvaW50UGF0aC5zdWJzdHJpbmcoaWR4ICsgMSk7XG4gICAgICAgICAgICAgICAgZW5kcG9pbnRQYXRoID0gZW5kcG9pbnRQYXRoLnN1YnN0cmluZygwLCBpZHgpO1xuICAgICAgICAgICAgICAgIGVuZHBvaW50UGFyYW1ldGVycyA9IENvcmUuc3RyaW5nVG9IYXNoKHBhcmFtZXRlcnMpO1xuICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgJHNjb3BlLmVuZHBvaW50U2NoZW1lID0gZW5kcG9pbnRTY2hlbWU7XG4gICAgICAgICAgICAgICRzY29wZS5lbmRwb2ludFBhdGggPSBlbmRwb2ludFBhdGg7XG4gICAgICAgICAgICAgICRzY29wZS5lbmRwb2ludFBhcmFtZXRlcnMgPSBlbmRwb2ludFBhcmFtZXRlcnM7XG5cbiAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJlbmRwb2ludCBcIiArIGVuZHBvaW50U2NoZW1lICsgXCIgcGF0aCBcIiArIGVuZHBvaW50UGF0aCArIFwiIGFuZCBwYXJhbWV0ZXJzIFwiICsgSlNPTi5zdHJpbmdpZnkoZW5kcG9pbnRQYXJhbWV0ZXJzKSk7XG4gICAgICAgICAgICAgICRzY29wZS5sb2FkRW5kcG9pbnRTY2hlbWEoZW5kcG9pbnRTY2hlbWUpO1xuICAgICAgICAgICAgICAkc2NvcGUuc2VsZWN0ZWRFbmRwb2ludCA9IHtcbiAgICAgICAgICAgICAgICBlbmRwb2ludFNjaGVtZTogZW5kcG9pbnRTY2hlbWUsXG4gICAgICAgICAgICAgICAgZW5kcG9pbnRQYXRoOiBlbmRwb2ludFBhdGgsXG4gICAgICAgICAgICAgICAgcGFyYW1ldGVyczogZW5kcG9pbnRQYXJhbWV0ZXJzXG4gICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0V2lkdGgoKSB7XG4gICAgICB2YXIgY2FudmFzRGl2ID0gJCgkZWxlbWVudCk7XG4gICAgICByZXR1cm4gY2FudmFzRGl2LndpZHRoKCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0Rm9sZGVySWRBdHRyaWJ1dGUocm91dGUpIHtcbiAgICAgIHZhciBpZCA9IG51bGw7XG4gICAgICBpZiAocm91dGUpIHtcbiAgICAgICAgdmFyIHhtbE5vZGUgPSByb3V0ZVtcInJvdXRlWG1sTm9kZVwiXTtcbiAgICAgICAgaWYgKHhtbE5vZGUpIHtcbiAgICAgICAgICBpZCA9IHhtbE5vZGUuZ2V0QXR0cmlidXRlKFwiaWRcIik7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiBpZDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXRSb3V0ZUZvbGRlcih0cmVlLCByb3V0ZUlkKSB7XG4gICAgICB2YXIgYW5zd2VyID0gbnVsbDtcbiAgICAgIGlmICh0cmVlKSB7XG4gICAgICAgIGFuZ3VsYXIuZm9yRWFjaCh0cmVlLmNoaWxkcmVuLCAocm91dGUpID0+IHtcbiAgICAgICAgICBpZiAoIWFuc3dlcikge1xuICAgICAgICAgICAgdmFyIGlkID0gZ2V0Rm9sZGVySWRBdHRyaWJ1dGUocm91dGUpO1xuICAgICAgICAgICAgaWYgKHJvdXRlSWQgPT09IGlkKSB7XG4gICAgICAgICAgICAgIGFuc3dlciA9IHJvdXRlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gYW5zd2VyO1xuICAgIH1cblxuICAgICRzY29wZS5kb1N3aXRjaFRvVHJlZVZpZXcgPSAoKSA9PiB7XG4gICAgICAkbG9jYXRpb24udXJsKENvcmUudHJpbUxlYWRpbmcoKCRzY29wZS5zdGFydExpbmsgKyBcIi9jYW1lbC9wcm9wZXJ0aWVzL1wiICsgJHNjb3BlLnBhZ2VJZCksICcjJykpO1xuICAgIH07XG5cbiAgICAkc2NvcGUuY29uZmlybVN3aXRjaFRvVHJlZVZpZXcgPSAoKSA9PiB7XG4gICAgICBpZiAoJHNjb3BlLm1vZGlmaWVkKSB7XG4gICAgICAgICRzY29wZS5zd2l0Y2hUb1RyZWVWaWV3Lm9wZW4oKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgICRzY29wZS5kb1N3aXRjaFRvVHJlZVZpZXcoKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gIH1dKTtcbn1cbiIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9pbmNsdWRlcy50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJ3aWtpSGVscGVycy50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJ3aWtpUGx1Z2luLnRzXCIvPlxuXG4vKipcbiAqIEBtb2R1bGUgV2lraVxuICovXG5tb2R1bGUgV2lraSB7XG5cbiAgX21vZHVsZS5jb250cm9sbGVyKFwiV2lraS5Db21taXRDb250cm9sbGVyXCIsIFtcIiRzY29wZVwiLCBcIiRsb2NhdGlvblwiLCBcIiRyb3V0ZVBhcmFtc1wiLCBcIiR0ZW1wbGF0ZUNhY2hlXCIsIFwibWFya2VkXCIsIFwiZmlsZUV4dGVuc2lvblR5cGVSZWdpc3RyeVwiLCAoJHNjb3BlLCAkbG9jYXRpb24sICRyb3V0ZVBhcmFtcywgJHRlbXBsYXRlQ2FjaGUsIG1hcmtlZCwgZmlsZUV4dGVuc2lvblR5cGVSZWdpc3RyeSkgPT4ge1xuXG4gICAgLy8gVE9ETyByZW1vdmUhXG4gICAgdmFyIGlzRm1jID0gZmFsc2U7XG4gICAgdmFyIGpvbG9raWEgPSBudWxsO1xuXG4gICAgV2lraS5pbml0U2NvcGUoJHNjb3BlLCAkcm91dGVQYXJhbXMsICRsb2NhdGlvbik7XG4gICAgdmFyIHdpa2lSZXBvc2l0b3J5ID0gJHNjb3BlLndpa2lSZXBvc2l0b3J5O1xuXG4gICAgJHNjb3BlLmNvbW1pdElkID0gJHNjb3BlLm9iamVjdElkO1xuICAgICRzY29wZS5zZWxlY3RlZEl0ZW1zID0gW107XG5cbiAgICAvLyBUT0RPIHdlIGNvdWxkIGNvbmZpZ3VyZSB0aGlzP1xuICAgICRzY29wZS5kYXRlRm9ybWF0ID0gJ0VFRSwgTU1NIGQsIHkgOiBoaDptbTpzcyBhJztcblxuICAgICRzY29wZS5ncmlkT3B0aW9ucyA9IHtcbiAgICAgIGRhdGE6ICdjb21taXRzJyxcbiAgICAgIHNob3dGaWx0ZXI6IGZhbHNlLFxuICAgICAgbXVsdGlTZWxlY3Q6IGZhbHNlLFxuICAgICAgc2VsZWN0V2l0aENoZWNrYm94T25seTogdHJ1ZSxcbiAgICAgIHNob3dTZWxlY3Rpb25DaGVja2JveDogdHJ1ZSxcbiAgICAgIGRpc3BsYXlTZWxlY3Rpb25DaGVja2JveCA6IHRydWUsIC8vIG9sZCBwcmUgMi4wIGNvbmZpZyFcbiAgICAgIHNlbGVjdGVkSXRlbXM6ICRzY29wZS5zZWxlY3RlZEl0ZW1zLFxuICAgICAgZmlsdGVyT3B0aW9uczoge1xuICAgICAgICBmaWx0ZXJUZXh0OiAnJ1xuICAgICAgfSxcbiAgICAgIGNvbHVtbkRlZnM6IFtcbiAgICAgICAge1xuICAgICAgICAgIGZpZWxkOiAncGF0aCcsXG4gICAgICAgICAgZGlzcGxheU5hbWU6ICdGaWxlIE5hbWUnLFxuICAgICAgICAgIGNlbGxUZW1wbGF0ZTogJHRlbXBsYXRlQ2FjaGUuZ2V0KCdmaWxlQ2VsbFRlbXBsYXRlLmh0bWwnKSxcbiAgICAgICAgICB3aWR0aDogXCIqKipcIixcbiAgICAgICAgICBjZWxsRmlsdGVyOiBcIlwiXG4gICAgICAgIH0sXG4gICAgICBdXG4gICAgfTtcblxuICAgICRzY29wZS4kb24oXCIkcm91dGVDaGFuZ2VTdWNjZXNzXCIsIGZ1bmN0aW9uIChldmVudCwgY3VycmVudCwgcHJldmlvdXMpIHtcbiAgICAgIC8vIGxldHMgZG8gdGhpcyBhc3luY2hyb25vdXNseSB0byBhdm9pZCBFcnJvcjogJGRpZ2VzdCBhbHJlYWR5IGluIHByb2dyZXNzXG4gICAgICBzZXRUaW1lb3V0KHVwZGF0ZVZpZXcsIDUwKTtcbiAgICB9KTtcblxuICAgICRzY29wZS4kd2F0Y2goJ3dvcmtzcGFjZS50cmVlJywgZnVuY3Rpb24gKCkge1xuICAgICAgaWYgKCEkc2NvcGUuZ2l0KSB7XG4gICAgICAgIC8vIGxldHMgZG8gdGhpcyBhc3luY2hyb25vdXNseSB0byBhdm9pZCBFcnJvcjogJGRpZ2VzdCBhbHJlYWR5IGluIHByb2dyZXNzXG4gICAgICAgIC8vY29uc29sZS5sb2coXCJSZWxvYWRpbmcgdGhlIHZpZXcgYXMgd2Ugbm93IHNlZW0gdG8gaGF2ZSBhIGdpdCBtYmVhbiFcIik7XG4gICAgICAgIHNldFRpbWVvdXQodXBkYXRlVmlldywgNTApO1xuICAgICAgfVxuICAgIH0pO1xuXG5cbiAgICAkc2NvcGUuY2FuUmV2ZXJ0ID0gKCkgPT4ge1xuICAgICAgcmV0dXJuICRzY29wZS5zZWxlY3RlZEl0ZW1zLmxlbmd0aCA9PT0gMTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLnJldmVydCA9ICgpID0+IHtcbiAgICAgIGlmICgkc2NvcGUuc2VsZWN0ZWRJdGVtcy5sZW5ndGggPiAwKSB7XG4gICAgICAgIHZhciBwYXRoID0gY29tbWl0UGF0aCgkc2NvcGUuc2VsZWN0ZWRJdGVtc1swXSk7XG4gICAgICAgIHZhciBvYmplY3RJZCA9ICRzY29wZS5jb21taXRJZDtcbiAgICAgICAgaWYgKHBhdGggJiYgb2JqZWN0SWQpIHtcbiAgICAgICAgICB2YXIgY29tbWl0TWVzc2FnZSA9IFwiUmV2ZXJ0aW5nIGZpbGUgXCIgKyAkc2NvcGUucGFnZUlkICsgXCIgdG8gcHJldmlvdXMgdmVyc2lvbiBcIiArIG9iamVjdElkO1xuICAgICAgICAgIHdpa2lSZXBvc2l0b3J5LnJldmVydFRvKCRzY29wZS5icmFuY2gsIG9iamVjdElkLCAkc2NvcGUucGFnZUlkLCBjb21taXRNZXNzYWdlLCAocmVzdWx0KSA9PiB7XG4gICAgICAgICAgICBXaWtpLm9uQ29tcGxldGUocmVzdWx0KTtcbiAgICAgICAgICAgIC8vIG5vdyBsZXRzIHVwZGF0ZSB0aGUgdmlld1xuICAgICAgICAgICAgdXBkYXRlVmlldygpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIGNvbW1pdFBhdGgoY29tbWl0KSB7XG4gICAgICByZXR1cm4gY29tbWl0LnBhdGggfHwgY29tbWl0Lm5hbWU7XG4gICAgfVxuXG4gICAgJHNjb3BlLmRpZmYgPSAoKSA9PiB7XG4gICAgICBpZiAoJHNjb3BlLnNlbGVjdGVkSXRlbXMubGVuZ3RoID4gMCkge1xuICAgICAgICB2YXIgY29tbWl0ID0gJHNjb3BlLnNlbGVjdGVkSXRlbXNbMF07XG4gICAgICAgIC8qXG4gICAgICAgICB2YXIgY29tbWl0ID0gcm93O1xuICAgICAgICAgdmFyIGVudGl0eSA9IHJvdy5lbnRpdHk7XG4gICAgICAgICBpZiAoZW50aXR5KSB7XG4gICAgICAgICBjb21taXQgPSBlbnRpdHk7XG4gICAgICAgICB9XG4gICAgICAgICAqL1xuICAgICAgICB2YXIgbGluayA9IHN0YXJ0TGluaygkc2NvcGUpICsgXCIvZGlmZi9cIiArIGNvbW1pdFBhdGgoY29tbWl0KSArIFwiL1wiICsgJHNjb3BlLmNvbW1pdElkICsgXCIvXCI7XG4gICAgICAgIHZhciBwYXRoID0gQ29yZS50cmltTGVhZGluZyhsaW5rLCBcIiNcIik7XG4gICAgICAgICRsb2NhdGlvbi5wYXRoKHBhdGgpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICB1cGRhdGVWaWV3KCk7XG5cbiAgICBmdW5jdGlvbiB1cGRhdGVWaWV3KCkge1xuICAgICAgdmFyIGNvbW1pdElkID0gJHNjb3BlLmNvbW1pdElkO1xuXG4gICAgICBXaWtpLmxvYWRCcmFuY2hlcyhqb2xva2lhLCB3aWtpUmVwb3NpdG9yeSwgJHNjb3BlLCBpc0ZtYyk7XG5cbiAgICAgIHdpa2lSZXBvc2l0b3J5LmNvbW1pdEluZm8oY29tbWl0SWQsIChjb21taXRJbmZvKSA9PiB7XG4gICAgICAgICRzY29wZS5jb21taXRJbmZvID0gY29tbWl0SW5mbztcbiAgICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICAgIH0pO1xuXG4gICAgICB3aWtpUmVwb3NpdG9yeS5jb21taXRUcmVlKGNvbW1pdElkLCAoY29tbWl0cykgPT4ge1xuICAgICAgICAkc2NvcGUuY29tbWl0cyA9IGNvbW1pdHM7XG4gICAgICAgIGFuZ3VsYXIuZm9yRWFjaChjb21taXRzLCAoY29tbWl0KSA9PiB7XG4gICAgICAgICAgY29tbWl0LmZpbGVJY29uSHRtbCA9IFdpa2kuZmlsZUljb25IdG1sKGNvbW1pdCk7XG4gICAgICAgICAgY29tbWl0LmZpbGVDbGFzcyA9IGNvbW1pdC5uYW1lLmVuZHNXaXRoKFwiLnByb2ZpbGVcIikgPyBcImdyZWVuXCIgOiBcIlwiO1xuICAgICAgICAgIHZhciBjaGFuZ2VUeXBlID0gY29tbWl0LmNoYW5nZVR5cGU7XG4gICAgICAgICAgdmFyIHBhdGggPSBjb21taXRQYXRoKGNvbW1pdCk7XG4gICAgICAgICAgaWYgKHBhdGgpIHtcbiAgICAgICAgICAgIGNvbW1pdC5maWxlTGluayA9IHN0YXJ0TGluaygkc2NvcGUpICsgJy92ZXJzaW9uLycgKyBwYXRoICsgJy8nICsgY29tbWl0SWQ7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChjaGFuZ2VUeXBlKSB7XG4gICAgICAgICAgICBjaGFuZ2VUeXBlID0gY2hhbmdlVHlwZS50b0xvd2VyQ2FzZSgpO1xuICAgICAgICAgICAgaWYgKGNoYW5nZVR5cGUuc3RhcnRzV2l0aChcImFcIikpIHtcbiAgICAgICAgICAgICAgY29tbWl0LmNoYW5nZUNsYXNzID0gXCJjaGFuZ2UtYWRkXCI7XG4gICAgICAgICAgICAgIGNvbW1pdC5jaGFuZ2UgPSBcImFkZFwiO1xuICAgICAgICAgICAgICBjb21taXQudGl0bGUgPSBcImFkZGVkXCI7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGNoYW5nZVR5cGUuc3RhcnRzV2l0aChcImRcIikpIHtcbiAgICAgICAgICAgICAgY29tbWl0LmNoYW5nZUNsYXNzID0gXCJjaGFuZ2UtZGVsZXRlXCI7XG4gICAgICAgICAgICAgIGNvbW1pdC5jaGFuZ2UgPSBcImRlbGV0ZVwiO1xuICAgICAgICAgICAgICBjb21taXQudGl0bGUgPSBcImRlbGV0ZWRcIjtcbiAgICAgICAgICAgICAgY29tbWl0LmZpbGVMaW5rID0gbnVsbDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGNvbW1pdC5jaGFuZ2VDbGFzcyA9IFwiY2hhbmdlLW1vZGlmeVwiO1xuICAgICAgICAgICAgICBjb21taXQuY2hhbmdlID0gXCJtb2RpZnlcIjtcbiAgICAgICAgICAgICAgY29tbWl0LnRpdGxlID0gXCJtb2RpZmllZFwiO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29tbWl0LmNoYW5nZVR5cGVIdG1sID0gJzxzcGFuIGNsYXNzPVwiJyArIGNvbW1pdC5jaGFuZ2VDbGFzcyArICdcIj4nICsgY29tbWl0LnRpdGxlICsgJzwvc3Bhbj4nO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIENvcmUuJGFwcGx5KCRzY29wZSk7XG4gICAgICB9KTtcbiAgICB9XG4gIH1dKTtcbn1cbiIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9pbmNsdWRlcy50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJ3aWtpSGVscGVycy50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJ3aWtpUGx1Z2luLnRzXCIvPlxuXG5tb2R1bGUgV2lraSB7XG5cbiAgdmFyIENyZWF0ZUNvbnRyb2xsZXIgPSBjb250cm9sbGVyKFwiQ3JlYXRlQ29udHJvbGxlclwiLCBbXCIkc2NvcGVcIiwgXCIkbG9jYXRpb25cIiwgXCIkcm91dGVQYXJhbXNcIiwgXCIkcm91dGVcIiwgXCIkaHR0cFwiLCBcIiR0aW1lb3V0XCIsICgkc2NvcGUsICRsb2NhdGlvbjpuZy5JTG9jYXRpb25TZXJ2aWNlLCAkcm91dGVQYXJhbXM6bmcucm91dGUuSVJvdXRlUGFyYW1zU2VydmljZSwgJHJvdXRlOm5nLnJvdXRlLklSb3V0ZVNlcnZpY2UsICRodHRwOm5nLklIdHRwU2VydmljZSwgJHRpbWVvdXQ6bmcuSVRpbWVvdXRTZXJ2aWNlKSA9PiB7XG5cbiAgICBXaWtpLmluaXRTY29wZSgkc2NvcGUsICRyb3V0ZVBhcmFtcywgJGxvY2F0aW9uKTtcbiAgICB2YXIgd2lraVJlcG9zaXRvcnkgPSAkc2NvcGUud2lraVJlcG9zaXRvcnk7XG5cblxuICAgIC8vIFRPRE8gcmVtb3ZlXG4gICAgdmFyIHdvcmtzcGFjZSA9IG51bGw7XG5cbiAgICAkc2NvcGUuY3JlYXRlRG9jdW1lbnRUcmVlID0gV2lraS5jcmVhdGVXaXphcmRUcmVlKHdvcmtzcGFjZSwgJHNjb3BlKTtcbiAgICAkc2NvcGUuY3JlYXRlRG9jdW1lbnRUcmVlQ2hpbGRyZW4gPSAkc2NvcGUuY3JlYXRlRG9jdW1lbnRUcmVlLmNoaWxkcmVuO1xuICAgICRzY29wZS5jcmVhdGVEb2N1bWVudFRyZWVBY3RpdmF0aW9ucyA9IFtcImNhbWVsLXNwcmluZy54bWxcIiwgXCJSZWFkTWUubWRcIl07XG5cbiAgICAkc2NvcGUudHJlZU9wdGlvbnMgPSB7XG4gICAgICAgIG5vZGVDaGlsZHJlbjogXCJjaGlsZHJlblwiLFxuICAgICAgICBkaXJTZWxlY3RhYmxlOiB0cnVlLFxuICAgICAgICBpbmplY3RDbGFzc2VzOiB7XG4gICAgICAgICAgICB1bDogXCJhMVwiLFxuICAgICAgICAgICAgbGk6IFwiYTJcIixcbiAgICAgICAgICAgIGxpU2VsZWN0ZWQ6IFwiYTdcIixcbiAgICAgICAgICAgIGlFeHBhbmRlZDogXCJhM1wiLFxuICAgICAgICAgICAgaUNvbGxhcHNlZDogXCJhNFwiLFxuICAgICAgICAgICAgaUxlYWY6IFwiYTVcIixcbiAgICAgICAgICAgIGxhYmVsOiBcImE2XCIsXG4gICAgICAgICAgICBsYWJlbFNlbGVjdGVkOiBcImE4XCJcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICAkc2NvcGUuZmlsZUV4aXN0cyA9IHtcbiAgICAgIGV4aXN0czogZmFsc2UsXG4gICAgICBuYW1lOiBcIlwiXG4gICAgfTtcbiAgICAkc2NvcGUubmV3RG9jdW1lbnROYW1lID0gXCJcIjtcbiAgICAkc2NvcGUuc2VsZWN0ZWRDcmVhdGVEb2N1bWVudEV4dGVuc2lvbiA9IG51bGw7XG4gICAgJHNjb3BlLmZpbGVFeGlzdHMuZXhpc3RzID0gZmFsc2U7XG4gICAgJHNjb3BlLmZpbGVFeGlzdHMubmFtZSA9IFwiXCI7XG4gICAgJHNjb3BlLm5ld0RvY3VtZW50TmFtZSA9IFwiXCI7XG5cbiAgICBmdW5jdGlvbiByZXR1cm5Ub0RpcmVjdG9yeSgpIHtcbiAgICAgIHZhciBsaW5rID0gV2lraS52aWV3TGluaygkc2NvcGUsICRzY29wZS5wYWdlSWQsICRsb2NhdGlvbilcbiAgICAgIGxvZy5kZWJ1ZyhcIkNhbmNlbGxpbmcsIGdvaW5nIHRvIGxpbms6IFwiLCBsaW5rKTtcbiAgICAgIFdpa2kuZ29Ub0xpbmsobGluaywgJHRpbWVvdXQsICRsb2NhdGlvbik7XG4gICAgfVxuXG4gICAgJHNjb3BlLmNhbmNlbCA9ICgpID0+IHtcbiAgICAgIHJldHVyblRvRGlyZWN0b3J5KCk7XG4gICAgfTtcblxuICAgICRzY29wZS5vbkNyZWF0ZURvY3VtZW50U2VsZWN0ID0gKG5vZGUpID0+IHtcbiAgICAgIC8vIHJlc2V0IGFzIHdlIHN3aXRjaCBiZXR3ZWVuIGRvY3VtZW50IHR5cGVzXG4gICAgICAkc2NvcGUuZmlsZUV4aXN0cy5leGlzdHMgPSBmYWxzZTtcbiAgICAgICRzY29wZS5maWxlRXhpc3RzLm5hbWUgPSBcIlwiO1xuICAgICAgdmFyIGVudGl0eSA9IG5vZGUgPyBub2RlLmVudGl0eSA6IG51bGw7XG4gICAgICAkc2NvcGUuc2VsZWN0ZWRDcmVhdGVEb2N1bWVudFRlbXBsYXRlID0gZW50aXR5O1xuICAgICAgJHNjb3BlLnNlbGVjdGVkQ3JlYXRlRG9jdW1lbnRUZW1wbGF0ZVJlZ2V4ID0gJHNjb3BlLnNlbGVjdGVkQ3JlYXRlRG9jdW1lbnRUZW1wbGF0ZS5yZWdleCB8fCAvLiovO1xuICAgICAgJHNjb3BlLnNlbGVjdGVkQ3JlYXRlRG9jdW1lbnRUZW1wbGF0ZUludmFsaWQgPSAkc2NvcGUuc2VsZWN0ZWRDcmVhdGVEb2N1bWVudFRlbXBsYXRlLmludmFsaWQgfHwgXCJpbnZhbGlkIG5hbWVcIjtcbiAgICAgICRzY29wZS5zZWxlY3RlZENyZWF0ZURvY3VtZW50VGVtcGxhdGVFeHRlbnNpb24gPSAkc2NvcGUuc2VsZWN0ZWRDcmVhdGVEb2N1bWVudFRlbXBsYXRlLmV4dGVuc2lvbiB8fCBudWxsO1xuICAgICAgbG9nLmRlYnVnKFwiRW50aXR5OiBcIiwgZW50aXR5KTtcbiAgICAgIGlmIChlbnRpdHkpIHtcbiAgICAgICAgaWYgKGVudGl0eS5nZW5lcmF0ZWQpIHtcbiAgICAgICAgICAkc2NvcGUuZm9ybVNjaGVtYSA9IGVudGl0eS5nZW5lcmF0ZWQuc2NoZW1hO1xuICAgICAgICAgICRzY29wZS5mb3JtRGF0YSA9IGVudGl0eS5nZW5lcmF0ZWQuZm9ybSh3b3Jrc3BhY2UsICRzY29wZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgJHNjb3BlLmZvcm1TY2hlbWEgPSB7fTtcbiAgICAgICAgICAkc2NvcGUuZm9ybURhdGEgPSB7fTtcbiAgICAgICAgfVxuICAgICAgICBDb3JlLiRhcHBseSgkc2NvcGUpO1xuICAgICAgfVxuXG4gICAgfTtcblxuICAgICRzY29wZS5hZGRBbmRDbG9zZURpYWxvZyA9IChmaWxlTmFtZTpzdHJpbmcpID0+IHtcbiAgICAgICRzY29wZS5uZXdEb2N1bWVudE5hbWUgPSBmaWxlTmFtZTtcbiAgICAgIHZhciB0ZW1wbGF0ZSA9ICRzY29wZS5zZWxlY3RlZENyZWF0ZURvY3VtZW50VGVtcGxhdGU7XG4gICAgICB2YXIgcGF0aCA9IGdldE5ld0RvY3VtZW50UGF0aCgpO1xuXG4gICAgICAvLyBjbGVhciAkc2NvcGUubmV3RG9jdW1lbnROYW1lIHNvIHdlIGRvbnQgcmVtZW1iZXIgaXQgd2hlbiB3ZSBvcGVuIGl0IG5leHQgdGltZVxuICAgICAgJHNjb3BlLm5ld0RvY3VtZW50TmFtZSA9IG51bGw7XG5cbiAgICAgIC8vIHJlc2V0IGJlZm9yZSB3ZSBjaGVjayBqdXN0IGluIGEgYml0XG4gICAgICAkc2NvcGUuZmlsZUV4aXN0cy5leGlzdHMgPSBmYWxzZTtcbiAgICAgICRzY29wZS5maWxlRXhpc3RzLm5hbWUgPSBcIlwiO1xuICAgICAgJHNjb3BlLmZpbGVFeHRlbnNpb25JbnZhbGlkID0gbnVsbDtcblxuICAgICAgaWYgKCF0ZW1wbGF0ZSB8fCAhcGF0aCkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIC8vIHZhbGlkYXRlIGlmIHRoZSBuYW1lIG1hdGNoIHRoZSBleHRlbnNpb25cbiAgICAgIGlmICgkc2NvcGUuc2VsZWN0ZWRDcmVhdGVEb2N1bWVudFRlbXBsYXRlRXh0ZW5zaW9uKSB7XG4gICAgICAgIHZhciBpZHggPSBwYXRoLmxhc3RJbmRleE9mKCcuJyk7XG4gICAgICAgIGlmIChpZHggPiAwKSB7XG4gICAgICAgICAgdmFyIGV4dCA9IHBhdGguc3Vic3RyaW5nKGlkeCk7XG4gICAgICAgICAgaWYgKCRzY29wZS5zZWxlY3RlZENyZWF0ZURvY3VtZW50VGVtcGxhdGVFeHRlbnNpb24gIT09IGV4dCkge1xuICAgICAgICAgICAgJHNjb3BlLmZpbGVFeHRlbnNpb25JbnZhbGlkID0gXCJGaWxlIGV4dGVuc2lvbiBtdXN0IGJlOiBcIiArICRzY29wZS5zZWxlY3RlZENyZWF0ZURvY3VtZW50VGVtcGxhdGVFeHRlbnNpb247XG4gICAgICAgICAgICBDb3JlLiRhcHBseSgkc2NvcGUpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyB2YWxpZGF0ZSBpZiB0aGUgZmlsZSBleGlzdHMsIGFuZCB1c2UgdGhlIHN5bmNocm9ub3VzIGNhbGxcbiAgICAgIHdpa2lSZXBvc2l0b3J5LmV4aXN0cygkc2NvcGUuYnJhbmNoLCBwYXRoLCAoZXhpc3RzKSA9PiB7XG4gICAgICAgICRzY29wZS5maWxlRXhpc3RzLmV4aXN0cyA9IGV4aXN0cztcbiAgICAgICAgJHNjb3BlLmZpbGVFeGlzdHMubmFtZSA9IGV4aXN0cyA/IHBhdGggOiBmYWxzZTtcbiAgICAgICAgaWYgKCFleGlzdHMpIHtcbiAgICAgICAgICBkb0NyZWF0ZSgpO1xuICAgICAgICB9XG4gICAgICAgIENvcmUuJGFwcGx5KCRzY29wZSk7XG4gICAgICB9KTtcblxuICAgICAgZnVuY3Rpb24gZG9DcmVhdGUoKSB7XG4gICAgICAgIHZhciBuYW1lID0gV2lraS5maWxlTmFtZShwYXRoKTtcbiAgICAgICAgdmFyIGZvbGRlciA9IFdpa2kuZmlsZVBhcmVudChwYXRoKTtcbiAgICAgICAgdmFyIGV4ZW1wbGFyID0gdGVtcGxhdGUuZXhlbXBsYXI7XG5cbiAgICAgICAgdmFyIGNvbW1pdE1lc3NhZ2UgPSBcIkNyZWF0ZWQgXCIgKyB0ZW1wbGF0ZS5sYWJlbDtcbiAgICAgICAgdmFyIGV4ZW1wbGFyVXJpID0gQ29yZS51cmwoXCIvcGx1Z2lucy93aWtpL2V4ZW1wbGFyL1wiICsgZXhlbXBsYXIpO1xuXG4gICAgICAgIGlmICh0ZW1wbGF0ZS5mb2xkZXIpIHtcbiAgICAgICAgICBDb3JlLm5vdGlmaWNhdGlvbihcInN1Y2Nlc3NcIiwgXCJDcmVhdGluZyBuZXcgZm9sZGVyIFwiICsgbmFtZSk7XG5cbiAgICAgICAgICB3aWtpUmVwb3NpdG9yeS5jcmVhdGVEaXJlY3RvcnkoJHNjb3BlLmJyYW5jaCwgcGF0aCwgY29tbWl0TWVzc2FnZSwgKHN0YXR1cykgPT4ge1xuICAgICAgICAgICAgdmFyIGxpbmsgPSBXaWtpLnZpZXdMaW5rKCRzY29wZSwgcGF0aCwgJGxvY2F0aW9uKTtcbiAgICAgICAgICAgIGdvVG9MaW5rKGxpbmssICR0aW1lb3V0LCAkbG9jYXRpb24pO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2UgaWYgKHRlbXBsYXRlLnByb2ZpbGUpIHtcblxuICAgICAgICAgIGZ1bmN0aW9uIHRvUGF0aChwcm9maWxlTmFtZTpzdHJpbmcpIHtcbiAgICAgICAgICAgIHZhciBhbnN3ZXIgPSBcImZhYnJpYy9wcm9maWxlcy9cIiArIHByb2ZpbGVOYW1lO1xuICAgICAgICAgICAgYW5zd2VyID0gYW5zd2VyLnJlcGxhY2UoLy0vZywgXCIvXCIpO1xuICAgICAgICAgICAgYW5zd2VyID0gYW5zd2VyICsgXCIucHJvZmlsZVwiO1xuICAgICAgICAgICAgcmV0dXJuIGFuc3dlcjtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBmdW5jdGlvbiB0b1Byb2ZpbGVOYW1lKHBhdGg6c3RyaW5nKSB7XG4gICAgICAgICAgICB2YXIgYW5zd2VyID0gcGF0aC5yZXBsYWNlKC9eZmFicmljXFwvcHJvZmlsZXNcXC8vLCBcIlwiKTtcbiAgICAgICAgICAgIGFuc3dlciA9IGFuc3dlci5yZXBsYWNlKC9cXC8vZywgXCItXCIpO1xuICAgICAgICAgICAgYW5zd2VyID0gYW5zd2VyLnJlcGxhY2UoL1xcLnByb2ZpbGUkLywgXCJcIik7XG4gICAgICAgICAgICByZXR1cm4gYW5zd2VyO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vIHN0cmlwIG9mZiBhbnkgcHJvZmlsZSBuYW1lIGluIGNhc2UgdGhlIHVzZXIgY3JlYXRlcyBhIHByb2ZpbGUgd2hpbGUgbG9va2luZyBhdFxuICAgICAgICAgIC8vIGFub3RoZXIgcHJvZmlsZVxuICAgICAgICAgIGZvbGRlciA9IGZvbGRlci5yZXBsYWNlKC9cXC89PyhcXHcqKVxcLnByb2ZpbGUkLywgXCJcIik7XG5cbiAgICAgICAgICB2YXIgY29uY2F0ZW5hdGVkID0gZm9sZGVyICsgXCIvXCIgKyBuYW1lO1xuXG4gICAgICAgICAgdmFyIHByb2ZpbGVOYW1lID0gdG9Qcm9maWxlTmFtZShjb25jYXRlbmF0ZWQpO1xuICAgICAgICAgIHZhciB0YXJnZXRQYXRoID0gdG9QYXRoKHByb2ZpbGVOYW1lKTtcblxuICAgICAgICB9IGVsc2UgaWYgKHRlbXBsYXRlLmdlbmVyYXRlZCkge1xuICAgICAgICAgIHZhciBvcHRpb25zOldpa2kuR2VuZXJhdGVPcHRpb25zID0ge1xuICAgICAgICAgICAgd29ya3NwYWNlOiB3b3Jrc3BhY2UsXG4gICAgICAgICAgICBmb3JtOiAkc2NvcGUuZm9ybURhdGEsXG4gICAgICAgICAgICBuYW1lOiBmaWxlTmFtZSxcbiAgICAgICAgICAgIHBhcmVudElkOiBmb2xkZXIsXG4gICAgICAgICAgICBicmFuY2g6ICRzY29wZS5icmFuY2gsXG4gICAgICAgICAgICBzdWNjZXNzOiAoY29udGVudHMpPT4ge1xuICAgICAgICAgICAgICBpZiAoY29udGVudHMpIHtcbiAgICAgICAgICAgICAgICB3aWtpUmVwb3NpdG9yeS5wdXRQYWdlKCRzY29wZS5icmFuY2gsIHBhdGgsIGNvbnRlbnRzLCBjb21taXRNZXNzYWdlLCAoc3RhdHVzKSA9PiB7XG4gICAgICAgICAgICAgICAgICBsb2cuZGVidWcoXCJDcmVhdGVkIGZpbGUgXCIgKyBuYW1lKTtcbiAgICAgICAgICAgICAgICAgIFdpa2kub25Db21wbGV0ZShzdGF0dXMpO1xuICAgICAgICAgICAgICAgICAgcmV0dXJuVG9EaXJlY3RvcnkoKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm5Ub0RpcmVjdG9yeSgpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZXJyb3I6IChlcnJvcik9PiB7XG4gICAgICAgICAgICAgIENvcmUubm90aWZpY2F0aW9uKCdlcnJvcicsIGVycm9yKTtcbiAgICAgICAgICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9O1xuICAgICAgICAgIHRlbXBsYXRlLmdlbmVyYXRlZC5nZW5lcmF0ZShvcHRpb25zKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBsb2FkIHRoZSBleGFtcGxlIGRhdGEgKGlmIGFueSkgYW5kIHRoZW4gYWRkIHRoZSBkb2N1bWVudCB0byBnaXQgYW5kIGNoYW5nZSB0aGUgbGluayB0byB0aGUgbmV3IGRvY3VtZW50XG4gICAgICAgICAgJGh0dHAuZ2V0KGV4ZW1wbGFyVXJpKVxuICAgICAgICAgICAgLnN1Y2Nlc3MoZnVuY3Rpb24gKGRhdGEsIHN0YXR1cywgaGVhZGVycywgY29uZmlnKSB7XG4gICAgICAgICAgICAgIHB1dFBhZ2UocGF0aCwgbmFtZSwgZm9sZGVyLCBkYXRhLCBjb21taXRNZXNzYWdlKTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAuZXJyb3IoZnVuY3Rpb24gKGRhdGEsIHN0YXR1cywgaGVhZGVycywgY29uZmlnKSB7XG4gICAgICAgICAgICAgIC8vIGNyZWF0ZSBhbiBlbXB0eSBmaWxlXG4gICAgICAgICAgICAgIHB1dFBhZ2UocGF0aCwgbmFtZSwgZm9sZGVyLCBcIlwiLCBjb21taXRNZXNzYWdlKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIHB1dFBhZ2UocGF0aCwgbmFtZSwgZm9sZGVyLCBjb250ZW50cywgY29tbWl0TWVzc2FnZSkge1xuICAgICAgLy8gVE9ETyBsZXRzIGNoZWNrIHRoaXMgcGFnZSBkb2VzIG5vdCBleGlzdCAtIGlmIGl0IGRvZXMgbGV0cyBrZWVwIGFkZGluZyBhIG5ldyBwb3N0IGZpeC4uLlxuICAgICAgd2lraVJlcG9zaXRvcnkucHV0UGFnZSgkc2NvcGUuYnJhbmNoLCBwYXRoLCBjb250ZW50cywgY29tbWl0TWVzc2FnZSwgKHN0YXR1cykgPT4ge1xuICAgICAgICBsb2cuZGVidWcoXCJDcmVhdGVkIGZpbGUgXCIgKyBuYW1lKTtcbiAgICAgICAgV2lraS5vbkNvbXBsZXRlKHN0YXR1cyk7XG5cbiAgICAgICAgLy8gbGV0cyBuYXZpZ2F0ZSB0byB0aGUgZWRpdCBsaW5rXG4gICAgICAgIC8vIGxvYWQgdGhlIGRpcmVjdG9yeSBhbmQgZmluZCB0aGUgY2hpbGQgaXRlbVxuICAgICAgICAkc2NvcGUuZ2l0ID0gd2lraVJlcG9zaXRvcnkuZ2V0UGFnZSgkc2NvcGUuYnJhbmNoLCBmb2xkZXIsICRzY29wZS5vYmplY3RJZCwgKGRldGFpbHMpID0+IHtcbiAgICAgICAgICAvLyBsZXRzIGZpbmQgdGhlIGNoaWxkIGVudHJ5IHNvIHdlIGNhbiBjYWxjdWxhdGUgaXRzIGNvcnJlY3QgZWRpdCBsaW5rXG4gICAgICAgICAgdmFyIGxpbms6c3RyaW5nID0gbnVsbDtcbiAgICAgICAgICBpZiAoZGV0YWlscyAmJiBkZXRhaWxzLmNoaWxkcmVuKSB7XG4gICAgICAgICAgICBsb2cuZGVidWcoXCJzY2FubmVkIHRoZSBkaXJlY3RvcnkgXCIgKyBkZXRhaWxzLmNoaWxkcmVuLmxlbmd0aCArIFwiIGNoaWxkcmVuXCIpO1xuICAgICAgICAgICAgdmFyIGNoaWxkID0gZGV0YWlscy5jaGlsZHJlbi5maW5kKGMgPT4gYy5uYW1lID09PSBmaWxlTmFtZSk7XG4gICAgICAgICAgICBpZiAoY2hpbGQpIHtcbiAgICAgICAgICAgICAgbGluayA9ICRzY29wZS5jaGlsZExpbmsoY2hpbGQpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgbG9nLmRlYnVnKFwiQ291bGQgbm90IGZpbmQgbmFtZSAnXCIgKyBmaWxlTmFtZSArIFwiJyBpbiB0aGUgbGlzdCBvZiBmaWxlIG5hbWVzIFwiICsgSlNPTi5zdHJpbmdpZnkoZGV0YWlscy5jaGlsZHJlbi5tYXAoYyA9PiBjLm5hbWUpKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICghbGluaykge1xuICAgICAgICAgICAgbG9nLmRlYnVnKFwiV0FSTklORzogY291bGQgbm90IGZpbmQgdGhlIGNoaWxkTGluayBzbyByZXZlcnRpbmcgdG8gdGhlIHdpa2kgZWRpdCBwYWdlIVwiKTtcbiAgICAgICAgICAgIGxpbmsgPSBXaWtpLmVkaXRMaW5rKCRzY29wZSwgcGF0aCwgJGxvY2F0aW9uKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgLy9Db3JlLiRhcHBseSgkc2NvcGUpO1xuICAgICAgICAgIGdvVG9MaW5rKGxpbmssICR0aW1lb3V0LCAkbG9jYXRpb24pO1xuICAgICAgICB9KTtcbiAgICAgIH0pXG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0TmV3RG9jdW1lbnRQYXRoKCkge1xuICAgICAgdmFyIHRlbXBsYXRlID0gJHNjb3BlLnNlbGVjdGVkQ3JlYXRlRG9jdW1lbnRUZW1wbGF0ZTtcbiAgICAgIGlmICghdGVtcGxhdGUpIHtcbiAgICAgICAgbG9nLmRlYnVnKFwiTm8gdGVtcGxhdGUgc2VsZWN0ZWQuXCIpO1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH1cbiAgICAgIHZhciBleGVtcGxhciA9IHRlbXBsYXRlLmV4ZW1wbGFyIHx8IFwiXCI7XG4gICAgICB2YXIgbmFtZTpzdHJpbmcgPSAkc2NvcGUubmV3RG9jdW1lbnROYW1lIHx8IGV4ZW1wbGFyO1xuXG4gICAgICBpZiAobmFtZS5pbmRleE9mKCcuJykgPCAwKSB7XG4gICAgICAgIC8vIGxldHMgYWRkIHRoZSBmaWxlIGV4dGVuc2lvbiBmcm9tIHRoZSBleGVtcGxhclxuICAgICAgICB2YXIgaWR4ID0gZXhlbXBsYXIubGFzdEluZGV4T2YoXCIuXCIpO1xuICAgICAgICBpZiAoaWR4ID4gMCkge1xuICAgICAgICAgIG5hbWUgKz0gZXhlbXBsYXIuc3Vic3RyaW5nKGlkeCk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8gbGV0cyBkZWFsIHdpdGggZGlyZWN0b3JpZXMgaW4gdGhlIG5hbWVcbiAgICAgIHZhciBmb2xkZXI6c3RyaW5nID0gJHNjb3BlLnBhZ2VJZDtcbiAgICAgIGlmICgkc2NvcGUuaXNGaWxlKSB7XG4gICAgICAgIC8vIGlmIHdlIGFyZSBhIGZpbGUgbGV0cyBkaXNjYXJkIHRoZSBsYXN0IHBhcnQgb2YgdGhlIHBhdGhcbiAgICAgICAgdmFyIGlkeDphbnkgPSBmb2xkZXIubGFzdEluZGV4T2YoXCIvXCIpO1xuICAgICAgICBpZiAoaWR4IDw9IDApIHtcbiAgICAgICAgICBmb2xkZXIgPSBcIlwiO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGZvbGRlciA9IGZvbGRlci5zdWJzdHJpbmcoMCwgaWR4KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgdmFyIGlkeDphbnkgPSBuYW1lLmxhc3RJbmRleE9mKFwiL1wiKTtcbiAgICAgIGlmIChpZHggPiAwKSB7XG4gICAgICAgIGZvbGRlciArPSBcIi9cIiArIG5hbWUuc3Vic3RyaW5nKDAsIGlkeCk7XG4gICAgICAgIG5hbWUgPSBuYW1lLnN1YnN0cmluZyhpZHggKyAxKTtcbiAgICAgIH1cbiAgICAgIGZvbGRlciA9IENvcmUudHJpbUxlYWRpbmcoZm9sZGVyLCBcIi9cIik7XG4gICAgICByZXR1cm4gZm9sZGVyICsgKGZvbGRlciA/IFwiL1wiIDogXCJcIikgKyBuYW1lO1xuICAgIH1cblxuICB9XSk7XG5cbn1cbiIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9pbmNsdWRlcy50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJ3aWtpSGVscGVycy50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJ3aWtpUGx1Z2luLnRzXCIvPlxuXG4vKipcbiAqIEBtb2R1bGUgV2lraVxuICovXG5tb2R1bGUgV2lraSB7XG4gIF9tb2R1bGUuY29udHJvbGxlcihcIldpa2kuRWRpdENvbnRyb2xsZXJcIiwgW1wiJHNjb3BlXCIsIFwiJGxvY2F0aW9uXCIsIFwiJHJvdXRlUGFyYW1zXCIsIFwiZmlsZUV4dGVuc2lvblR5cGVSZWdpc3RyeVwiLCAoJHNjb3BlLCAkbG9jYXRpb24sICRyb3V0ZVBhcmFtcywgZmlsZUV4dGVuc2lvblR5cGVSZWdpc3RyeSkgPT4ge1xuXG4gICAgV2lraS5pbml0U2NvcGUoJHNjb3BlLCAkcm91dGVQYXJhbXMsICRsb2NhdGlvbik7XG4gICAgJHNjb3BlLmJyZWFkY3J1bWJDb25maWcucHVzaChjcmVhdGVFZGl0aW5nQnJlYWRjcnVtYigkc2NvcGUpKTtcblxuICAgIHZhciB3aWtpUmVwb3NpdG9yeSA9ICRzY29wZS53aWtpUmVwb3NpdG9yeTtcblxuICAgICRzY29wZS5lbnRpdHkgPSB7XG4gICAgICBzb3VyY2U6IG51bGxcbiAgICB9O1xuXG4gICAgdmFyIGZvcm1hdCA9IFdpa2kuZmlsZUZvcm1hdCgkc2NvcGUucGFnZUlkLCBmaWxlRXh0ZW5zaW9uVHlwZVJlZ2lzdHJ5KTtcbiAgICB2YXIgZm9ybSA9IG51bGw7XG4gICAgaWYgKChmb3JtYXQgJiYgZm9ybWF0ID09PSBcImphdmFzY3JpcHRcIikgfHwgaXNDcmVhdGUoKSkge1xuICAgICAgZm9ybSA9ICRsb2NhdGlvbi5zZWFyY2goKVtcImZvcm1cIl07XG4gICAgfVxuXG4gICAgdmFyIG9wdGlvbnMgPSB7XG4gICAgICBtb2RlOiB7XG4gICAgICAgIG5hbWU6IGZvcm1hdFxuICAgICAgfVxuICAgIH07XG4gICAgJHNjb3BlLmNvZGVNaXJyb3JPcHRpb25zID0gQ29kZUVkaXRvci5jcmVhdGVFZGl0b3JTZXR0aW5ncyhvcHRpb25zKTtcbiAgICAkc2NvcGUubW9kaWZpZWQgPSBmYWxzZTtcblxuXG4gICAgJHNjb3BlLmlzVmFsaWQgPSAoKSA9PiAkc2NvcGUuZmlsZU5hbWU7XG5cbiAgICAkc2NvcGUuY2FuU2F2ZSA9ICgpID0+ICEkc2NvcGUubW9kaWZpZWQ7XG5cbiAgICAkc2NvcGUuJHdhdGNoKCdlbnRpdHkuc291cmNlJywgKG5ld1ZhbHVlLCBvbGRWYWx1ZSkgPT4ge1xuICAgICAgJHNjb3BlLm1vZGlmaWVkID0gbmV3VmFsdWUgJiYgb2xkVmFsdWUgJiYgbmV3VmFsdWUgIT09IG9sZFZhbHVlO1xuICAgIH0sIHRydWUpO1xuXG4gICAgbG9nLmRlYnVnKFwicGF0aDogXCIsICRzY29wZS5wYXRoKTtcblxuICAgICRzY29wZS4kd2F0Y2goJ21vZGlmaWVkJywgKG5ld1ZhbHVlLCBvbGRWYWx1ZSkgPT4ge1xuICAgICAgbG9nLmRlYnVnKFwibW9kaWZpZWQ6IFwiLCBuZXdWYWx1ZSk7XG4gICAgfSk7XG5cbiAgICAkc2NvcGUudmlld0xpbmsgPSAoKSA9PiBXaWtpLnZpZXdMaW5rKCRzY29wZSwgJHNjb3BlLnBhZ2VJZCwgJGxvY2F0aW9uLCAkc2NvcGUuZmlsZU5hbWUpO1xuXG4gICAgJHNjb3BlLmNhbmNlbCA9ICgpID0+IHtcbiAgICAgIGdvVG9WaWV3KCk7XG4gICAgfTtcblxuICAgICRzY29wZS5zYXZlID0gKCkgPT4ge1xuICAgICAgaWYgKCRzY29wZS5tb2RpZmllZCAmJiAkc2NvcGUuZmlsZU5hbWUpIHtcbiAgICAgICAgc2F2ZVRvKCRzY29wZVtcInBhZ2VJZFwiXSk7XG4gICAgICB9XG4gICAgfTtcblxuICAgICRzY29wZS5jcmVhdGUgPSAoKSA9PiB7XG4gICAgICAvLyBsZXRzIGNvbWJpbmUgdGhlIGZpbGUgbmFtZSB3aXRoIHRoZSBjdXJyZW50IHBhZ2VJZCAod2hpY2ggaXMgdGhlIGRpcmVjdG9yeSlcbiAgICAgIHZhciBwYXRoID0gJHNjb3BlLnBhZ2VJZCArIFwiL1wiICsgJHNjb3BlLmZpbGVOYW1lO1xuICAgICAgY29uc29sZS5sb2coXCJjcmVhdGluZyBuZXcgZmlsZSBhdCBcIiArIHBhdGgpO1xuICAgICAgc2F2ZVRvKHBhdGgpO1xuICAgIH07XG5cbiAgICAkc2NvcGUub25TdWJtaXQgPSAoanNvbiwgZm9ybSkgPT4ge1xuICAgICAgaWYgKGlzQ3JlYXRlKCkpIHtcbiAgICAgICAgJHNjb3BlLmNyZWF0ZSgpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgJHNjb3BlLnNhdmUoKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgJHNjb3BlLm9uQ2FuY2VsID0gKGZvcm0pID0+IHtcbiAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICBnb1RvVmlldygpO1xuICAgICAgICBDb3JlLiRhcHBseSgkc2NvcGUpXG4gICAgICB9LCA1MCk7XG4gICAgfTtcblxuXG4gICAgdXBkYXRlVmlldygpO1xuXG4gICAgZnVuY3Rpb24gaXNDcmVhdGUoKSB7XG4gICAgICByZXR1cm4gJGxvY2F0aW9uLnBhdGgoKS5zdGFydHNXaXRoKFwiL3dpa2kvY3JlYXRlXCIpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHVwZGF0ZVZpZXcoKSB7XG4gICAgICAvLyBvbmx5IGxvYWQgdGhlIHNvdXJjZSBpZiBub3QgaW4gY3JlYXRlIG1vZGVcbiAgICAgIGlmIChpc0NyZWF0ZSgpKSB7XG4gICAgICAgIHVwZGF0ZVNvdXJjZVZpZXcoKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGxvZy5kZWJ1ZyhcIkdldHRpbmcgcGFnZSwgYnJhbmNoOiBcIiwgJHNjb3BlLmJyYW5jaCwgXCIgcGFnZUlkOiBcIiwgJHNjb3BlLnBhZ2VJZCwgXCIgb2JqZWN0SWQ6IFwiLCAkc2NvcGUub2JqZWN0SWQpO1xuICAgICAgICB3aWtpUmVwb3NpdG9yeS5nZXRQYWdlKCRzY29wZS5icmFuY2gsICRzY29wZS5wYWdlSWQsICRzY29wZS5vYmplY3RJZCwgb25GaWxlQ29udGVudHMpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIG9uRmlsZUNvbnRlbnRzKGRldGFpbHMpIHtcbiAgICAgIHZhciBjb250ZW50cyA9IGRldGFpbHMudGV4dDtcbiAgICAgICRzY29wZS5lbnRpdHkuc291cmNlID0gY29udGVudHM7XG4gICAgICAkc2NvcGUuZmlsZU5hbWUgPSAkc2NvcGUucGFnZUlkLnNwbGl0KCcvJykubGFzdCgpO1xuICAgICAgbG9nLmRlYnVnKFwiZmlsZSBuYW1lOiBcIiwgJHNjb3BlLmZpbGVOYW1lKTtcbiAgICAgIGxvZy5kZWJ1ZyhcImZpbGUgZGV0YWlsczogXCIsIGRldGFpbHMpO1xuICAgICAgdXBkYXRlU291cmNlVmlldygpO1xuICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiB1cGRhdGVTb3VyY2VWaWV3KCkge1xuICAgICAgaWYgKGZvcm0pIHtcbiAgICAgICAgaWYgKGlzQ3JlYXRlKCkpIHtcbiAgICAgICAgICAvLyBsZXRzIGRlZmF1bHQgYSBmaWxlIG5hbWVcbiAgICAgICAgICBpZiAoISRzY29wZS5maWxlTmFtZSkge1xuICAgICAgICAgICAgJHNjb3BlLmZpbGVOYW1lID0gXCJcIiArIENvcmUuZ2V0VVVJRCgpICsgXCIuanNvblwiO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICAvLyBub3cgbGV0cyB0cnkgbG9hZCB0aGUgZm9ybSBkZWZpbnRpb24gSlNPTiBzbyB3ZSBjYW4gdGhlbiByZW5kZXIgdGhlIGZvcm1cbiAgICAgICAgJHNjb3BlLnNvdXJjZVZpZXcgPSBudWxsO1xuICAgICAgICAkc2NvcGUuZ2l0ID0gd2lraVJlcG9zaXRvcnkuZ2V0UGFnZSgkc2NvcGUuYnJhbmNoLCBmb3JtLCAkc2NvcGUub2JqZWN0SWQsIChkZXRhaWxzKSA9PiB7XG4gICAgICAgICAgb25Gb3JtU2NoZW1hKFdpa2kucGFyc2VKc29uKGRldGFpbHMudGV4dCkpO1xuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgICRzY29wZS5zb3VyY2VWaWV3ID0gXCJwbHVnaW5zL3dpa2kvaHRtbC9zb3VyY2VFZGl0Lmh0bWxcIjtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBvbkZvcm1TY2hlbWEoanNvbikge1xuICAgICAgJHNjb3BlLmZvcm1EZWZpbml0aW9uID0ganNvbjtcbiAgICAgIGlmICgkc2NvcGUuZW50aXR5LnNvdXJjZSkge1xuICAgICAgICAkc2NvcGUuZm9ybUVudGl0eSA9IFdpa2kucGFyc2VKc29uKCRzY29wZS5lbnRpdHkuc291cmNlKTtcbiAgICAgIH1cbiAgICAgICRzY29wZS5zb3VyY2VWaWV3ID0gXCJwbHVnaW5zL3dpa2kvaHRtbC9mb3JtRWRpdC5odG1sXCI7XG4gICAgICBDb3JlLiRhcHBseSgkc2NvcGUpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdvVG9WaWV3KCkge1xuICAgICAgdmFyIHBhdGggPSBDb3JlLnRyaW1MZWFkaW5nKCRzY29wZS52aWV3TGluaygpLCBcIiNcIik7XG4gICAgICBsb2cuZGVidWcoXCJnb2luZyB0byB2aWV3IFwiICsgcGF0aCk7XG4gICAgICAkbG9jYXRpb24ucGF0aChXaWtpLmRlY29kZVBhdGgocGF0aCkpO1xuICAgICAgbG9nLmRlYnVnKFwibG9jYXRpb24gaXMgbm93IFwiICsgJGxvY2F0aW9uLnBhdGgoKSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc2F2ZVRvKHBhdGg6c3RyaW5nKSB7XG4gICAgICB2YXIgY29tbWl0TWVzc2FnZSA9ICRzY29wZS5jb21taXRNZXNzYWdlIHx8IFwiVXBkYXRlZCBwYWdlIFwiICsgJHNjb3BlLnBhZ2VJZDtcbiAgICAgIHZhciBjb250ZW50cyA9ICRzY29wZS5lbnRpdHkuc291cmNlO1xuICAgICAgaWYgKCRzY29wZS5mb3JtRW50aXR5KSB7XG4gICAgICAgIGNvbnRlbnRzID0gSlNPTi5zdHJpbmdpZnkoJHNjb3BlLmZvcm1FbnRpdHksIG51bGwsIFwiICBcIik7XG4gICAgICB9XG4gICAgICBsb2cuZGVidWcoXCJTYXZpbmcgZmlsZSwgYnJhbmNoOiBcIiwgJHNjb3BlLmJyYW5jaCwgXCIgcGF0aDogXCIsICRzY29wZS5wYXRoKTtcbiAgICAgIC8vY29uc29sZS5sb2coXCJBYm91dCB0byB3cml0ZSBjb250ZW50cyAnXCIgKyBjb250ZW50cyArIFwiJ1wiKTtcbiAgICAgIHdpa2lSZXBvc2l0b3J5LnB1dFBhZ2UoJHNjb3BlLmJyYW5jaCwgcGF0aCwgY29udGVudHMsIGNvbW1pdE1lc3NhZ2UsIChzdGF0dXMpID0+IHtcbiAgICAgICAgV2lraS5vbkNvbXBsZXRlKHN0YXR1cyk7XG4gICAgICAgICRzY29wZS5tb2RpZmllZCA9IGZhbHNlO1xuICAgICAgICBDb3JlLm5vdGlmaWNhdGlvbihcInN1Y2Nlc3NcIiwgXCJTYXZlZCBcIiArIHBhdGgpO1xuICAgICAgICBnb1RvVmlldygpO1xuICAgICAgICBDb3JlLiRhcHBseSgkc2NvcGUpO1xuICAgICAgfSk7XG4gICAgfVxuICB9XSk7XG59XG4iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vaW5jbHVkZXMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwid2lraUhlbHBlcnMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwid2lraVBsdWdpbi50c1wiLz5cblxuLyoqXG4gKiBAbW9kdWxlIFdpa2lcbiAqL1xubW9kdWxlIFdpa2kge1xuXG4gIC8vIGNvbnRyb2xsZXIgZm9yIGhhbmRsaW5nIGZpbGUgZHJvcHNcbiAgZXhwb3J0IHZhciBGaWxlRHJvcENvbnRyb2xsZXIgPSBfbW9kdWxlLmNvbnRyb2xsZXIoXCJXaWtpLkZpbGVEcm9wQ29udHJvbGxlclwiLCBbXCIkc2NvcGVcIiwgXCJGaWxlVXBsb2FkZXJcIiwgXCIkcm91dGVcIiwgXCIkdGltZW91dFwiLCBcInVzZXJEZXRhaWxzXCIsICgkc2NvcGUsIEZpbGVVcGxvYWRlciwgJHJvdXRlOm5nLnJvdXRlLklSb3V0ZVNlcnZpY2UsICR0aW1lb3V0Om5nLklUaW1lb3V0U2VydmljZSwgdXNlckRldGFpbHM6Q29yZS5Vc2VyRGV0YWlscykgPT4ge1xuXG5cbiAgICB2YXIgdXBsb2FkVVJJID0gV2lraS5naXRSZXN0VVJMKCRzY29wZSwgJHNjb3BlLnBhZ2VJZCkgKyAnLyc7XG4gICAgdmFyIHVwbG9hZGVyID0gJHNjb3BlLnVwbG9hZGVyID0gbmV3IEZpbGVVcGxvYWRlcih7XG4gICAgICBoZWFkZXJzOiB7XG4gICAgICAgICdBdXRob3JpemF0aW9uJzogQ29yZS5hdXRoSGVhZGVyVmFsdWUodXNlckRldGFpbHMpXG4gICAgICB9LFxuICAgICAgYXV0b1VwbG9hZDogdHJ1ZSxcbiAgICAgIHdpdGhDcmVkZW50aWFsczogdHJ1ZSxcbiAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgdXJsOiB1cGxvYWRVUklcbiAgICB9KTtcbiAgICAkc2NvcGUuZG9VcGxvYWQgPSAoKSA9PiB7XG4gICAgICB1cGxvYWRlci51cGxvYWRBbGwoKTtcbiAgICB9O1xuICAgIHVwbG9hZGVyLm9uV2hlbkFkZGluZ0ZpbGVGYWlsZWQgPSBmdW5jdGlvbiAoaXRlbSAvKntGaWxlfEZpbGVMaWtlT2JqZWN0fSovLCBmaWx0ZXIsIG9wdGlvbnMpIHtcbiAgICAgIGxvZy5kZWJ1Zygnb25XaGVuQWRkaW5nRmlsZUZhaWxlZCcsIGl0ZW0sIGZpbHRlciwgb3B0aW9ucyk7XG4gICAgfTtcbiAgICB1cGxvYWRlci5vbkFmdGVyQWRkaW5nRmlsZSA9IGZ1bmN0aW9uIChmaWxlSXRlbSkge1xuICAgICAgbG9nLmRlYnVnKCdvbkFmdGVyQWRkaW5nRmlsZScsIGZpbGVJdGVtKTtcbiAgICB9O1xuICAgIHVwbG9hZGVyLm9uQWZ0ZXJBZGRpbmdBbGwgPSBmdW5jdGlvbiAoYWRkZWRGaWxlSXRlbXMpIHtcbiAgICAgIGxvZy5kZWJ1Zygnb25BZnRlckFkZGluZ0FsbCcsIGFkZGVkRmlsZUl0ZW1zKTtcbiAgICB9O1xuICAgIHVwbG9hZGVyLm9uQmVmb3JlVXBsb2FkSXRlbSA9IGZ1bmN0aW9uIChpdGVtKSB7XG4gICAgICBpZiAoJ2ZpbGUnIGluIGl0ZW0pIHtcbiAgICAgICAgaXRlbS5maWxlU2l6ZU1CID0gKGl0ZW0uZmlsZS5zaXplIC8gMTAyNCAvIDEwMjQpLnRvRml4ZWQoMik7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpdGVtLmZpbGVTaXplTUIgPSAwO1xuICAgICAgfVxuICAgICAgLy9pdGVtLnVybCA9IFVybEhlbHBlcnMuam9pbih1cGxvYWRVUkksIGl0ZW0uZmlsZS5uYW1lKTtcbiAgICAgIGl0ZW0udXJsID0gdXBsb2FkVVJJO1xuICAgICAgbG9nLmluZm8oXCJMb2FkaW5nIGZpbGVzIHRvIFwiICsgdXBsb2FkVVJJKTtcbiAgICAgIGxvZy5kZWJ1Zygnb25CZWZvcmVVcGxvYWRJdGVtJywgaXRlbSk7XG4gICAgfTtcbiAgICB1cGxvYWRlci5vblByb2dyZXNzSXRlbSA9IGZ1bmN0aW9uIChmaWxlSXRlbSwgcHJvZ3Jlc3MpIHtcbiAgICAgIGxvZy5kZWJ1Zygnb25Qcm9ncmVzc0l0ZW0nLCBmaWxlSXRlbSwgcHJvZ3Jlc3MpO1xuICAgIH07XG4gICAgdXBsb2FkZXIub25Qcm9ncmVzc0FsbCA9IGZ1bmN0aW9uIChwcm9ncmVzcykge1xuICAgICAgbG9nLmRlYnVnKCdvblByb2dyZXNzQWxsJywgcHJvZ3Jlc3MpO1xuICAgIH07XG4gICAgdXBsb2FkZXIub25TdWNjZXNzSXRlbSA9IGZ1bmN0aW9uIChmaWxlSXRlbSwgcmVzcG9uc2UsIHN0YXR1cywgaGVhZGVycykge1xuICAgICAgbG9nLmRlYnVnKCdvblN1Y2Nlc3NJdGVtJywgZmlsZUl0ZW0sIHJlc3BvbnNlLCBzdGF0dXMsIGhlYWRlcnMpO1xuICAgIH07XG4gICAgdXBsb2FkZXIub25FcnJvckl0ZW0gPSBmdW5jdGlvbiAoZmlsZUl0ZW0sIHJlc3BvbnNlLCBzdGF0dXMsIGhlYWRlcnMpIHtcbiAgICAgIGxvZy5kZWJ1Zygnb25FcnJvckl0ZW0nLCBmaWxlSXRlbSwgcmVzcG9uc2UsIHN0YXR1cywgaGVhZGVycyk7XG4gICAgfTtcbiAgICB1cGxvYWRlci5vbkNhbmNlbEl0ZW0gPSBmdW5jdGlvbiAoZmlsZUl0ZW0sIHJlc3BvbnNlLCBzdGF0dXMsIGhlYWRlcnMpIHtcbiAgICAgIGxvZy5kZWJ1Zygnb25DYW5jZWxJdGVtJywgZmlsZUl0ZW0sIHJlc3BvbnNlLCBzdGF0dXMsIGhlYWRlcnMpO1xuICAgIH07XG4gICAgdXBsb2FkZXIub25Db21wbGV0ZUl0ZW0gPSBmdW5jdGlvbiAoZmlsZUl0ZW0sIHJlc3BvbnNlLCBzdGF0dXMsIGhlYWRlcnMpIHtcbiAgICAgIGxvZy5kZWJ1Zygnb25Db21wbGV0ZUl0ZW0nLCBmaWxlSXRlbSwgcmVzcG9uc2UsIHN0YXR1cywgaGVhZGVycyk7XG4gICAgfTtcbiAgICB1cGxvYWRlci5vbkNvbXBsZXRlQWxsID0gZnVuY3Rpb24gKCkge1xuICAgICAgbG9nLmRlYnVnKCdvbkNvbXBsZXRlQWxsJyk7XG4gICAgICB1cGxvYWRlci5jbGVhclF1ZXVlKCk7XG4gICAgICAkdGltZW91dCgoKSA9PiB7XG4gICAgICAgIGxvZy5pbmZvKFwiQ29tcGxldGVkIGFsbCB1cGxvYWRzLiBMZXRzIGZvcmNlIGEgcmVsb2FkXCIpO1xuICAgICAgICAkcm91dGUucmVsb2FkKCk7XG4gICAgICAgIENvcmUuJGFwcGx5KCRzY29wZSk7XG4gICAgICB9LCAyMDApO1xuICAgIH07XG4gIH1dKTtcblxufVxuIiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL2luY2x1ZGVzLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIndpa2lIZWxwZXJzLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIndpa2lQbHVnaW4udHNcIi8+XG5cbi8qKlxuICogQG1vZHVsZSBXaWtpXG4gKi9cbm1vZHVsZSBXaWtpIHtcblxuICBfbW9kdWxlLmNvbnRyb2xsZXIoXCJXaWtpLkZvcm1UYWJsZUNvbnRyb2xsZXJcIiwgW1wiJHNjb3BlXCIsIFwiJGxvY2F0aW9uXCIsIFwiJHJvdXRlUGFyYW1zXCIsICgkc2NvcGUsICRsb2NhdGlvbiwgJHJvdXRlUGFyYW1zKSA9PiB7XG4gICAgV2lraS5pbml0U2NvcGUoJHNjb3BlLCAkcm91dGVQYXJhbXMsICRsb2NhdGlvbik7XG4gICAgdmFyIHdpa2lSZXBvc2l0b3J5ID0gJHNjb3BlLndpa2lSZXBvc2l0b3J5O1xuXG4gICAgJHNjb3BlLmNvbHVtbkRlZnMgPSBbXTtcblxuICAgICRzY29wZS5ncmlkT3B0aW9ucyA9IHtcbiAgICAgICBkYXRhOiAnbGlzdCcsXG4gICAgICAgZGlzcGxheUZvb3RlcjogZmFsc2UsXG4gICAgICAgc2hvd0ZpbHRlcjogZmFsc2UsXG4gICAgICAgZmlsdGVyT3B0aW9uczoge1xuICAgICAgICAgZmlsdGVyVGV4dDogJydcbiAgICAgICB9LFxuICAgICAgIGNvbHVtbkRlZnM6ICRzY29wZS5jb2x1bW5EZWZzXG4gICAgIH07XG5cblxuICAgICRzY29wZS52aWV3TGluayA9IChyb3cpID0+IHtcbiAgICAgIHJldHVybiBjaGlsZExpbmsocm93LCBcIi92aWV3XCIpO1xuICAgIH07XG4gICAgJHNjb3BlLmVkaXRMaW5rID0gKHJvdykgPT4ge1xuICAgICAgcmV0dXJuIGNoaWxkTGluayhyb3csIFwiL2VkaXRcIik7XG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIGNoaWxkTGluayhjaGlsZCwgcHJlZml4KSB7XG4gICAgICB2YXIgc3RhcnQgPSBXaWtpLnN0YXJ0TGluaygkc2NvcGUpO1xuICAgICAgdmFyIGNoaWxkSWQgPSAoY2hpbGQpID8gY2hpbGRbXCJfaWRcIl0gfHwgXCJcIiA6IFwiXCI7XG4gICAgICByZXR1cm4gQ29yZS5jcmVhdGVIcmVmKCRsb2NhdGlvbiwgc3RhcnQgKyBwcmVmaXggKyBcIi9cIiArICRzY29wZS5wYWdlSWQgKyBcIi9cIiArIGNoaWxkSWQpO1xuICAgIH1cblxuICAgIHZhciBsaW5rc0NvbHVtbiA9IHtcbiAgICAgIGZpZWxkOiAnX2lkJyxcbiAgICAgIGRpc3BsYXlOYW1lOiAnQWN0aW9ucycsXG4gICAgICBjZWxsVGVtcGxhdGU6ICc8ZGl2IGNsYXNzPVwibmdDZWxsVGV4dFwiXCI+PGEgbmctaHJlZj1cInt7dmlld0xpbmsocm93LmVudGl0eSl9fVwiIGNsYXNzPVwiYnRuXCI+VmlldzwvYT4gPGEgbmctaHJlZj1cInt7ZWRpdExpbmsocm93LmVudGl0eSl9fVwiIGNsYXNzPVwiYnRuXCI+RWRpdDwvYT48L2Rpdj4nXG4gICAgfTtcblxuICAgICRzY29wZS4kb24oXCIkcm91dGVDaGFuZ2VTdWNjZXNzXCIsIGZ1bmN0aW9uIChldmVudCwgY3VycmVudCwgcHJldmlvdXMpIHtcbiAgICAgIC8vIGxldHMgZG8gdGhpcyBhc3luY2hyb25vdXNseSB0byBhdm9pZCBFcnJvcjogJGRpZ2VzdCBhbHJlYWR5IGluIHByb2dyZXNzXG4gICAgICBzZXRUaW1lb3V0KHVwZGF0ZVZpZXcsIDUwKTtcbiAgICB9KTtcblxuICAgIHZhciBmb3JtID0gJGxvY2F0aW9uLnNlYXJjaCgpW1wiZm9ybVwiXTtcbiAgICBpZiAoZm9ybSkge1xuICAgICAgd2lraVJlcG9zaXRvcnkuZ2V0UGFnZSgkc2NvcGUuYnJhbmNoLCBmb3JtLCAkc2NvcGUub2JqZWN0SWQsIG9uRm9ybURhdGEpO1xuICAgIH1cblxuICAgIHVwZGF0ZVZpZXcoKTtcblxuICAgIGZ1bmN0aW9uIG9uUmVzdWx0cyhyZXNwb25zZSkge1xuICAgICAgdmFyIGxpc3QgPSBbXTtcbiAgICAgIHZhciBtYXAgPSBXaWtpLnBhcnNlSnNvbihyZXNwb25zZSk7XG4gICAgICBhbmd1bGFyLmZvckVhY2gobWFwLCAodmFsdWUsIGtleSkgPT4ge1xuICAgICAgICB2YWx1ZVtcIl9pZFwiXSA9IGtleTtcbiAgICAgICAgbGlzdC5wdXNoKHZhbHVlKTtcbiAgICAgIH0pO1xuICAgICAgJHNjb3BlLmxpc3QgPSBsaXN0O1xuICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiB1cGRhdGVWaWV3KCkge1xuICAgICAgdmFyIGZpbHRlciA9IENvcmUucGF0aEdldCgkc2NvcGUsIFtcImdyaWRPcHRpb25zXCIsIFwiZmlsdGVyT3B0aW9uc1wiLCBcImZpbHRlclRleHRcIl0pIHx8IFwiXCI7XG4gICAgICAkc2NvcGUuZ2l0ID0gd2lraVJlcG9zaXRvcnkuanNvbkNoaWxkQ29udGVudHMoJHNjb3BlLnBhZ2VJZCwgXCIqLmpzb25cIiwgZmlsdGVyLCBvblJlc3VsdHMpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIG9uRm9ybURhdGEoZGV0YWlscykge1xuICAgICAgdmFyIHRleHQgPSBkZXRhaWxzLnRleHQ7XG4gICAgICBpZiAodGV4dCkge1xuICAgICAgICAkc2NvcGUuZm9ybURlZmluaXRpb24gPSBXaWtpLnBhcnNlSnNvbih0ZXh0KTtcblxuICAgICAgICB2YXIgY29sdW1uRGVmcyA9IFtdO1xuICAgICAgICB2YXIgc2NoZW1hID0gJHNjb3BlLmZvcm1EZWZpbml0aW9uO1xuICAgICAgICBhbmd1bGFyLmZvckVhY2goc2NoZW1hLnByb3BlcnRpZXMsIChwcm9wZXJ0eSwgbmFtZSkgPT4ge1xuICAgICAgICAgIGlmIChuYW1lKSB7XG4gICAgICAgICAgICBpZiAoIUZvcm1zLmlzQXJyYXlPck5lc3RlZE9iamVjdChwcm9wZXJ0eSwgc2NoZW1hKSkge1xuICAgICAgICAgICAgICB2YXIgY29sRGVmID0ge1xuICAgICAgICAgICAgICAgIGZpZWxkOiBuYW1lLFxuICAgICAgICAgICAgICAgIGRpc3BsYXlOYW1lOiBwcm9wZXJ0eS5kZXNjcmlwdGlvbiB8fCBuYW1lLFxuICAgICAgICAgICAgICAgIHZpc2libGU6IHRydWVcbiAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgY29sdW1uRGVmcy5wdXNoKGNvbERlZik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgY29sdW1uRGVmcy5wdXNoKGxpbmtzQ29sdW1uKTtcblxuICAgICAgICAkc2NvcGUuY29sdW1uRGVmcyA9IGNvbHVtbkRlZnM7XG4gICAgICAgICRzY29wZS5ncmlkT3B0aW9ucy5jb2x1bW5EZWZzID0gY29sdW1uRGVmcztcblxuICAgICAgICAvLyBub3cgd2UgaGF2ZSB0aGUgZ3JpZCBjb2x1bW4gc3R1ZmYgbG9hZGVkLCBsZXRzIGxvYWQgdGhlIGRhdGF0YWJsZVxuICAgICAgICAkc2NvcGUudGFibGVWaWV3ID0gXCJwbHVnaW5zL3dpa2kvaHRtbC9mb3JtVGFibGVEYXRhdGFibGUuaHRtbFwiO1xuICAgICAgfVxuICAgIH1cbiAgICBDb3JlLiRhcHBseSgkc2NvcGUpO1xuICB9XSk7XG59XG4iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vaW5jbHVkZXMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwid2lraUhlbHBlcnMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwid2lraVBsdWdpbi50c1wiLz5cblxuLyoqXG4gKiBAbW9kdWxlIFdpa2lcbiAqL1xuIG1vZHVsZSBXaWtpIHtcbiAgX21vZHVsZS5jb250cm9sbGVyKFwiV2lraS5HaXRQcmVmZXJlbmNlc1wiLCBbXCIkc2NvcGVcIiwgXCJsb2NhbFN0b3JhZ2VcIiwgXCJ1c2VyRGV0YWlsc1wiLCAoJHNjb3BlLCBsb2NhbFN0b3JhZ2UsIHVzZXJEZXRhaWxzKSA9PiB7XG5cbiAgICB2YXIgY29uZmlnID0ge1xuICAgICAgcHJvcGVydGllczoge1xuICAgICAgICBnaXRVc2VyTmFtZToge1xuICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgIGxhYmVsOiAnVXNlcm5hbWUnLFxuICAgICAgICAgIGRlc2NyaXB0aW9uOiAnVGhlIHVzZXIgbmFtZSB0byBiZSB1c2VkIHdoZW4gbWFraW5nIGNoYW5nZXMgdG8gZmlsZXMgd2l0aCB0aGUgc291cmNlIGNvbnRyb2wgc3lzdGVtJ1xuICAgICAgICB9LFxuICAgICAgICBnaXRVc2VyRW1haWw6IHtcbiAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICBsYWJlbDogJ0VtYWlsJyxcbiAgICAgICAgICBkZXNjcmlwdGlvbjogJ1RoZSBlbWFpbCBhZGRyZXNzIHRvIHVzZSB3aGVuIG1ha2luZyBjaGFuZ2VzIHRvIGZpbGVzIHdpdGggdGhlIHNvdXJjZSBjb250cm9sIHN5c3RlbSdcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH07XG5cbiAgICAkc2NvcGUuZW50aXR5ID0gJHNjb3BlO1xuICAgICRzY29wZS5jb25maWcgPSBjb25maWc7XG5cbiAgICBDb3JlLmluaXRQcmVmZXJlbmNlU2NvcGUoJHNjb3BlLCBsb2NhbFN0b3JhZ2UsIHtcbiAgICAgICdnaXRVc2VyTmFtZSc6IHtcbiAgICAgICAgJ3ZhbHVlJzogdXNlckRldGFpbHMudXNlcm5hbWUgfHwgXCJcIlxuICAgICAgfSxcbiAgICAgICdnaXRVc2VyRW1haWwnOiB7XG4gICAgICAgICd2YWx1ZSc6ICcnXG4gICAgICB9ICBcbiAgICB9KTtcbiAgfV0pO1xuIH1cbiIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9pbmNsdWRlcy50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJ3aWtpSGVscGVycy50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJ3aWtpUGx1Z2luLnRzXCIvPlxuXG4vKipcbiAqIEBtb2R1bGUgV2lraVxuICovXG5tb2R1bGUgV2lraSB7XG5cbiAgX21vZHVsZS5jb250cm9sbGVyKFwiV2lraS5IaXN0b3J5Q29udHJvbGxlclwiLCBbXCIkc2NvcGVcIiwgXCIkbG9jYXRpb25cIiwgXCIkcm91dGVQYXJhbXNcIiwgXCIkdGVtcGxhdGVDYWNoZVwiLCBcIm1hcmtlZFwiLCBcImZpbGVFeHRlbnNpb25UeXBlUmVnaXN0cnlcIiwgICgkc2NvcGUsICRsb2NhdGlvbiwgJHJvdXRlUGFyYW1zLCAkdGVtcGxhdGVDYWNoZSwgbWFya2VkLCBmaWxlRXh0ZW5zaW9uVHlwZVJlZ2lzdHJ5KSA9PiB7XG5cbiAgICAvLyBUT0RPIHJlbW92ZSFcbiAgICB2YXIgaXNGbWMgPSBmYWxzZTtcbiAgICB2YXIgam9sb2tpYSA9IG51bGw7XG5cbiAgICBXaWtpLmluaXRTY29wZSgkc2NvcGUsICRyb3V0ZVBhcmFtcywgJGxvY2F0aW9uKTtcbiAgICB2YXIgd2lraVJlcG9zaXRvcnkgPSAkc2NvcGUud2lraVJlcG9zaXRvcnk7XG5cbiAgICAvLyBUT0RPIHdlIGNvdWxkIGNvbmZpZ3VyZSB0aGlzP1xuICAgICRzY29wZS5kYXRlRm9ybWF0ID0gJ0VFRSwgTU1NIGQsIHkgYXQgSEg6bW06c3MgWic7XG4gICAgLy8neXl5eS1NTS1kZCBISDptbTpzcyBaJ1xuXG4gICAgJHNjb3BlLmdyaWRPcHRpb25zID0ge1xuICAgICAgZGF0YTogJ2xvZ3MnLFxuICAgICAgc2hvd0ZpbHRlcjogZmFsc2UsXG4gICAgICBlbmFibGVSb3dDbGlja1NlbGVjdGlvbjogZmFsc2UsXG4gICAgICBtdWx0aVNlbGVjdDogdHJ1ZSxcbiAgICAgIHNlbGVjdGVkSXRlbXM6IFtdLFxuICAgICAgc2hvd1NlbGVjdGlvbkNoZWNrYm94OiB0cnVlLFxuICAgICAgZGlzcGxheVNlbGVjdGlvbkNoZWNrYm94IDogdHJ1ZSwgLy8gb2xkIHByZSAyLjAgY29uZmlnIVxuICAgICAgZmlsdGVyT3B0aW9uczoge1xuICAgICAgICBmaWx0ZXJUZXh0OiAnJ1xuICAgICAgfSxcbiAgICAgIGNvbHVtbkRlZnM6IFtcbiAgICAgICAge1xuICAgICAgICAgIGZpZWxkOiAnJGRhdGUnLFxuICAgICAgICAgIGRpc3BsYXlOYW1lOiAnTW9kaWZpZWQnLFxuICAgICAgICAgIGNlbGxUZW1wbGF0ZTogJzxkaXYgY2xhc3M9XCJuZ0NlbGxUZXh0XCIgdGl0bGU9XCJ7e3Jvdy5lbnRpdHkuJGRhdGUgfCBkYXRlOlxcJ0VFRSwgTU1NIGQsIHl5eXkgOiBISDptbTpzcyBaXFwnfX1cIj57e3Jvdy5lbnRpdHkuJGRhdGUucmVsYXRpdmUoKX19PC9kaXY+JyxcbiAgICAgICAgICB3aWR0aDogXCIqKlwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICBmaWVsZDogJ3NoYScsXG4gICAgICAgICAgZGlzcGxheU5hbWU6ICdDaGFuZ2UnLFxuICAgICAgICAgIGNlbGxUZW1wbGF0ZTogJHRlbXBsYXRlQ2FjaGUuZ2V0KCdjaGFuZ2VDZWxsVGVtcGxhdGUuaHRtbCcpLFxuICAgICAgICAgIGNlbGxGaWx0ZXI6IFwiXCIsXG4gICAgICAgICAgd2lkdGg6IFwiKlwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICBmaWVsZDogJ2F1dGhvcicsXG4gICAgICAgICAgZGlzcGxheU5hbWU6ICdBdXRob3InLFxuICAgICAgICAgIGNlbGxGaWx0ZXI6IFwiXCIsXG4gICAgICAgICAgd2lkdGg6IFwiKipcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgZmllbGQ6ICdzaG9ydF9tZXNzYWdlJyxcbiAgICAgICAgICBkaXNwbGF5TmFtZTogJ01lc3NhZ2UnLFxuICAgICAgICAgIGNlbGxUZW1wbGF0ZTogJzxkaXYgY2xhc3M9XCJuZ0NlbGxUZXh0XCIgdGl0bGU9XCJ7e3Jvdy5lbnRpdHkuc2hvcnRfbWVzc2FnZX19XCI+e3tyb3cuZW50aXR5LnNob3J0X21lc3NhZ2UgIHwgbGltaXRUbzoxMDB9fTwvZGl2PicsXG4gICAgICAgICAgd2lkdGg6IFwiKioqKlwiXG4gICAgICAgIH1cbiAgICAgIF1cbiAgICB9O1xuXG4gICAgJHNjb3BlLiRvbihcIiRyb3V0ZUNoYW5nZVN1Y2Nlc3NcIiwgZnVuY3Rpb24gKGV2ZW50LCBjdXJyZW50LCBwcmV2aW91cykge1xuICAgICAgLy8gbGV0cyBkbyB0aGlzIGFzeW5jaHJvbm91c2x5IHRvIGF2b2lkIEVycm9yOiAkZGlnZXN0IGFscmVhZHkgaW4gcHJvZ3Jlc3NcbiAgICAgIHNldFRpbWVvdXQodXBkYXRlVmlldywgNTApO1xuICAgIH0pO1xuXG4gICAgJHNjb3BlLmNhblJldmVydCA9ICgpID0+IHtcbiAgICAgIHZhciBzZWxlY3RlZEl0ZW1zID0gJHNjb3BlLmdyaWRPcHRpb25zLnNlbGVjdGVkSXRlbXM7XG4gICAgICByZXR1cm4gc2VsZWN0ZWRJdGVtcy5sZW5ndGggPT09IDEgJiYgc2VsZWN0ZWRJdGVtc1swXSAhPT0gJHNjb3BlLmxvZ3NbMF07XG4gICAgfTtcblxuICAgICRzY29wZS5yZXZlcnQgPSAoKSA9PiB7XG4gICAgICB2YXIgc2VsZWN0ZWRJdGVtcyA9ICRzY29wZS5ncmlkT3B0aW9ucy5zZWxlY3RlZEl0ZW1zO1xuICAgICAgaWYgKHNlbGVjdGVkSXRlbXMubGVuZ3RoID4gMCkge1xuICAgICAgICB2YXIgb2JqZWN0SWQgPSBzZWxlY3RlZEl0ZW1zWzBdLnNoYTtcbiAgICAgICAgaWYgKG9iamVjdElkKSB7XG4gICAgICAgICAgdmFyIGNvbW1pdE1lc3NhZ2UgPSBcIlJldmVydGluZyBmaWxlIFwiICsgJHNjb3BlLnBhZ2VJZCArIFwiIHRvIHByZXZpb3VzIHZlcnNpb24gXCIgKyBvYmplY3RJZDtcbiAgICAgICAgICB3aWtpUmVwb3NpdG9yeS5yZXZlcnRUbygkc2NvcGUuYnJhbmNoLCBvYmplY3RJZCwgJHNjb3BlLnBhZ2VJZCwgY29tbWl0TWVzc2FnZSwgKHJlc3VsdCkgPT4ge1xuICAgICAgICAgICAgV2lraS5vbkNvbXBsZXRlKHJlc3VsdCk7XG4gICAgICAgICAgICAvLyBub3cgbGV0cyB1cGRhdGUgdGhlIHZpZXdcbiAgICAgICAgICAgIENvcmUubm90aWZpY2F0aW9uKCdzdWNjZXNzJywgXCJTdWNjZXNzZnVsbHkgcmV2ZXJ0ZWQgXCIgKyAkc2NvcGUucGFnZUlkKTtcbiAgICAgICAgICAgIHVwZGF0ZVZpZXcoKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBzZWxlY3RlZEl0ZW1zLnNwbGljZSgwLCBzZWxlY3RlZEl0ZW1zLmxlbmd0aCk7XG4gICAgICB9XG4gICAgfTtcblxuICAgICRzY29wZS5kaWZmID0gKCkgPT4ge1xuICAgICAgdmFyIGRlZmF1bHRWYWx1ZSA9IFwiIFwiO1xuICAgICAgdmFyIG9iamVjdElkID0gZGVmYXVsdFZhbHVlO1xuICAgICAgdmFyIHNlbGVjdGVkSXRlbXMgPSAkc2NvcGUuZ3JpZE9wdGlvbnMuc2VsZWN0ZWRJdGVtcztcbiAgICAgIGlmIChzZWxlY3RlZEl0ZW1zLmxlbmd0aCA+IDApIHtcbiAgICAgICAgb2JqZWN0SWQgPSBzZWxlY3RlZEl0ZW1zWzBdLnNoYSB8fCBkZWZhdWx0VmFsdWU7XG4gICAgICB9XG4gICAgICB2YXIgYmFzZU9iamVjdElkID0gZGVmYXVsdFZhbHVlO1xuICAgICAgaWYgKHNlbGVjdGVkSXRlbXMubGVuZ3RoID4gMSkge1xuICAgICAgICBiYXNlT2JqZWN0SWQgPSBzZWxlY3RlZEl0ZW1zWzFdLnNoYSB8fGRlZmF1bHRWYWx1ZTtcbiAgICAgICAgLy8gbWFrZSB0aGUgb2JqZWN0SWQgKHRoZSBvbmUgdGhhdCB3aWxsIHN0YXJ0IHdpdGggYi8gcGF0aCkgYWx3YXlzIG5ld2VyIHRoYW4gYmFzZU9iamVjdElkXG4gICAgICAgIGlmIChzZWxlY3RlZEl0ZW1zWzBdLmRhdGUgPCBzZWxlY3RlZEl0ZW1zWzFdLmRhdGUpIHtcbiAgICAgICAgICB2YXIgXyA9IGJhc2VPYmplY3RJZDtcbiAgICAgICAgICBiYXNlT2JqZWN0SWQgPSBvYmplY3RJZDtcbiAgICAgICAgICBvYmplY3RJZCA9IF87XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHZhciBsaW5rID0gc3RhcnRMaW5rKCRzY29wZSkgKyBcIi9kaWZmL1wiICsgJHNjb3BlLnBhZ2VJZCArIFwiL1wiICsgb2JqZWN0SWQgKyBcIi9cIiArIGJhc2VPYmplY3RJZDtcbiAgICAgIHZhciBwYXRoID0gQ29yZS50cmltTGVhZGluZyhsaW5rLCBcIiNcIik7XG4gICAgICAkbG9jYXRpb24ucGF0aChwYXRoKTtcbiAgICB9O1xuXG4gICAgdXBkYXRlVmlldygpO1xuXG4gICAgZnVuY3Rpb24gdXBkYXRlVmlldygpIHtcbiAgICAgIHZhciBvYmplY3RJZCA9IFwiXCI7XG4gICAgICB2YXIgbGltaXQgPSAwO1xuXG4gICAgICAkc2NvcGUuZ2l0ID0gd2lraVJlcG9zaXRvcnkuaGlzdG9yeSgkc2NvcGUuYnJhbmNoLCBvYmplY3RJZCwgJHNjb3BlLnBhZ2VJZCwgbGltaXQsIChsb2dBcnJheSkgPT4ge1xuICAgICAgICBhbmd1bGFyLmZvckVhY2gobG9nQXJyYXksIChsb2cpID0+IHtcbiAgICAgICAgICAvLyBsZXRzIHVzZSB0aGUgc2hvcnRlciBoYXNoIGZvciBsaW5rcyBieSBkZWZhdWx0XG4gICAgICAgICAgdmFyIGNvbW1pdElkID0gbG9nLnNoYTtcbiAgICAgICAgICBsb2cuJGRhdGUgPSBEZXZlbG9wZXIuYXNEYXRlKGxvZy5kYXRlKTtcbiAgICAgICAgICBsb2cuY29tbWl0TGluayA9IHN0YXJ0TGluaygkc2NvcGUpICsgXCIvY29tbWl0L1wiICsgJHNjb3BlLnBhZ2VJZCArIFwiL1wiICsgY29tbWl0SWQ7XG4gICAgICAgIH0pO1xuICAgICAgICAkc2NvcGUubG9ncyA9IGxvZ0FycmF5O1xuICAgICAgICBDb3JlLiRhcHBseSgkc2NvcGUpO1xuICAgICAgfSk7XG4gICAgICBXaWtpLmxvYWRCcmFuY2hlcyhqb2xva2lhLCB3aWtpUmVwb3NpdG9yeSwgJHNjb3BlLCBpc0ZtYyk7XG4gICAgfVxuICB9XSk7XG59XG4iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vaW5jbHVkZXMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwid2lraUhlbHBlcnMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwid2lraVBsdWdpbi50c1wiLz5cblxuLyoqXG4gKiBAbW9kdWxlIFdpa2lcbiAqL1xubW9kdWxlIFdpa2kge1xuICBfbW9kdWxlLmNvbnRyb2xsZXIoXCJXaWtpLk5hdkJhckNvbnRyb2xsZXJcIiwgW1wiJHNjb3BlXCIsIFwiJGxvY2F0aW9uXCIsIFwiJHJvdXRlUGFyYW1zXCIsIFwid2lraUJyYW5jaE1lbnVcIiwgKCRzY29wZSwgJGxvY2F0aW9uLCAkcm91dGVQYXJhbXMsIHdpa2lCcmFuY2hNZW51OkJyYW5jaE1lbnUpID0+IHtcblxuICAgIC8vIFRPRE8gcmVtb3ZlIVxuICAgIHZhciBpc0ZtYyA9IGZhbHNlO1xuXG4gICAgV2lraS5pbml0U2NvcGUoJHNjb3BlLCAkcm91dGVQYXJhbXMsICRsb2NhdGlvbik7XG4gICAgdmFyIHdpa2lSZXBvc2l0b3J5ID0gJHNjb3BlLndpa2lSZXBvc2l0b3J5O1xuXG4gICAgJHNjb3BlLmJyYW5jaE1lbnVDb25maWcgPSA8VUkuTWVudUl0ZW0+e1xuICAgICAgdGl0bGU6ICRzY29wZS5icmFuY2gsXG4gICAgICBpdGVtczogW11cbiAgICB9O1xuXG4gICAgJHNjb3BlLlZpZXdNb2RlID0gV2lraS5WaWV3TW9kZTtcbiAgICAkc2NvcGUuc2V0Vmlld01vZGUgPSAobW9kZTpXaWtpLlZpZXdNb2RlKSA9PiB7XG4gICAgICAkc2NvcGUuJGVtaXQoJ1dpa2kuU2V0Vmlld01vZGUnLCBtb2RlKTtcbiAgICB9O1xuXG4gICAgd2lraUJyYW5jaE1lbnUuYXBwbHlNZW51RXh0ZW5zaW9ucygkc2NvcGUuYnJhbmNoTWVudUNvbmZpZy5pdGVtcyk7XG5cbiAgICAkc2NvcGUuJHdhdGNoKCdicmFuY2hlcycsIChuZXdWYWx1ZSwgb2xkVmFsdWUpID0+IHtcbiAgICAgIGlmIChuZXdWYWx1ZSA9PT0gb2xkVmFsdWUgfHwgIW5ld1ZhbHVlKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgICRzY29wZS5icmFuY2hNZW51Q29uZmlnLml0ZW1zID0gW107XG4gICAgICBpZiAobmV3VmFsdWUubGVuZ3RoID4gMCkge1xuICAgICAgICAkc2NvcGUuYnJhbmNoTWVudUNvbmZpZy5pdGVtcy5wdXNoKHtcbiAgICAgICAgICBoZWFkaW5nOiBpc0ZtYyA/IFwiVmVyc2lvbnNcIiA6IFwiQnJhbmNoZXNcIlxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICAgIG5ld1ZhbHVlLnNvcnQoKS5mb3JFYWNoKChpdGVtKSA9PiB7XG4gICAgICAgIHZhciBtZW51SXRlbSA9IHtcbiAgICAgICAgICB0aXRsZTogaXRlbSxcbiAgICAgICAgICBpY29uOiAnJyxcbiAgICAgICAgICBhY3Rpb246ICgpID0+IHt9XG4gICAgICAgIH07XG4gICAgICAgIGlmIChpdGVtID09PSAkc2NvcGUuYnJhbmNoKSB7XG4gICAgICAgICAgbWVudUl0ZW0uaWNvbiA9IFwiZmEgZmEtb2tcIjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBtZW51SXRlbS5hY3Rpb24gPSAoKSA9PiB7XG4gICAgICAgICAgICB2YXIgdGFyZ2V0VXJsID0gYnJhbmNoTGluayhpdGVtLCA8c3RyaW5nPiRzY29wZS5wYWdlSWQsICRsb2NhdGlvbik7XG4gICAgICAgICAgICAkbG9jYXRpb24ucGF0aChDb3JlLnRvUGF0aCh0YXJnZXRVcmwpKTtcbiAgICAgICAgICAgIENvcmUuJGFwcGx5KCRzY29wZSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgICRzY29wZS5icmFuY2hNZW51Q29uZmlnLml0ZW1zLnB1c2gobWVudUl0ZW0pO1xuICAgICAgfSk7XG4gICAgICB3aWtpQnJhbmNoTWVudS5hcHBseU1lbnVFeHRlbnNpb25zKCRzY29wZS5icmFuY2hNZW51Q29uZmlnLml0ZW1zKTtcbiAgICB9LCB0cnVlKTtcblxuICAgICRzY29wZS5jcmVhdGVMaW5rID0gKCkgPT4ge1xuICAgICAgdmFyIHBhZ2VJZCA9IFdpa2kucGFnZUlkKCRyb3V0ZVBhcmFtcywgJGxvY2F0aW9uKTtcbiAgICAgIHJldHVybiBXaWtpLmNyZWF0ZUxpbmsoJHNjb3BlLCBwYWdlSWQsICRsb2NhdGlvbik7XG4gICAgfTtcblxuICAgICRzY29wZS5zdGFydExpbmsgPSBzdGFydExpbmsoJHNjb3BlKTtcblxuICAgICRzY29wZS5zb3VyY2VMaW5rID0gKCkgPT4ge1xuICAgICAgdmFyIHBhdGggPSAkbG9jYXRpb24ucGF0aCgpO1xuICAgICAgdmFyIGFuc3dlciA9IDxzdHJpbmc+bnVsbDtcbiAgICAgIGFuZ3VsYXIuZm9yRWFjaChXaWtpLmN1c3RvbVZpZXdMaW5rcygkc2NvcGUpLCAobGluaykgPT4ge1xuICAgICAgICBpZiAocGF0aC5zdGFydHNXaXRoKGxpbmspKSB7XG4gICAgICAgICAgYW5zd2VyID0gPHN0cmluZz5Db3JlLmNyZWF0ZUhyZWYoJGxvY2F0aW9uLCBXaWtpLnN0YXJ0TGluaygkc2NvcGUpICsgXCIvdmlld1wiICsgcGF0aC5zdWJzdHJpbmcobGluay5sZW5ndGgpKVxuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIC8vIHJlbW92ZSB0aGUgZm9ybSBwYXJhbWV0ZXIgb24gdmlldy9lZGl0IGxpbmtzXG4gICAgICByZXR1cm4gKCFhbnN3ZXIgJiYgJGxvY2F0aW9uLnNlYXJjaCgpW1wiZm9ybVwiXSlcbiAgICAgICAgICAgICAgPyBDb3JlLmNyZWF0ZUhyZWYoJGxvY2F0aW9uLCBcIiNcIiArIHBhdGgsIFtcImZvcm1cIl0pXG4gICAgICAgICAgICAgIDogYW5zd2VyO1xuICAgIH07XG5cbiAgICAkc2NvcGUuaXNBY3RpdmUgPSAoaHJlZikgPT4ge1xuICAgICAgaWYgKCFocmVmKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBocmVmLmVuZHNXaXRoKCRyb3V0ZVBhcmFtc1sncGFnZSddKTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLiRvbihcIiRyb3V0ZUNoYW5nZVN1Y2Nlc3NcIiwgZnVuY3Rpb24gKGV2ZW50LCBjdXJyZW50LCBwcmV2aW91cykge1xuICAgICAgLy8gbGV0cyBkbyB0aGlzIGFzeW5jaHJvbm91c2x5IHRvIGF2b2lkIEVycm9yOiAkZGlnZXN0IGFscmVhZHkgaW4gcHJvZ3Jlc3NcbiAgICAgIHNldFRpbWVvdXQobG9hZEJyZWFkY3J1bWJzLCA1MCk7XG4gICAgfSk7XG5cbiAgICBsb2FkQnJlYWRjcnVtYnMoKTtcblxuICAgIGZ1bmN0aW9uIHN3aXRjaEZyb21WaWV3VG9DdXN0b21MaW5rKGJyZWFkY3J1bWIsIGxpbmspIHtcbiAgICAgIHZhciBocmVmID0gYnJlYWRjcnVtYi5ocmVmO1xuICAgICAgaWYgKGhyZWYpIHtcbiAgICAgICAgYnJlYWRjcnVtYi5ocmVmID0gaHJlZi5yZXBsYWNlKFwid2lraS92aWV3XCIsIGxpbmspO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGxvYWRCcmVhZGNydW1icygpIHtcbiAgICAgIHZhciBzdGFydCA9IFdpa2kuc3RhcnRMaW5rKCRzY29wZSk7XG4gICAgICB2YXIgaHJlZiA9IHN0YXJ0ICsgXCIvdmlld1wiO1xuICAgICAgJHNjb3BlLmJyZWFkY3J1bWJzID0gW1xuICAgICAgICB7aHJlZjogaHJlZiwgbmFtZTogXCJyb290XCJ9XG4gICAgICBdO1xuICAgICAgdmFyIHBhdGggPSBXaWtpLnBhZ2VJZCgkcm91dGVQYXJhbXMsICRsb2NhdGlvbik7XG4gICAgICB2YXIgYXJyYXkgPSBwYXRoID8gcGF0aC5zcGxpdChcIi9cIikgOiBbXTtcbiAgICAgIGFuZ3VsYXIuZm9yRWFjaChhcnJheSwgKG5hbWUpID0+IHtcbiAgICAgICAgaWYgKCFuYW1lLnN0YXJ0c1dpdGgoXCIvXCIpICYmICFocmVmLmVuZHNXaXRoKFwiL1wiKSkge1xuICAgICAgICAgIGhyZWYgKz0gXCIvXCI7XG4gICAgICAgIH1cbiAgICAgICAgaHJlZiArPSBXaWtpLmVuY29kZVBhdGgobmFtZSk7XG4gICAgICAgIGlmICghbmFtZS5pc0JsYW5rKCkpIHtcbiAgICAgICAgICAkc2NvcGUuYnJlYWRjcnVtYnMucHVzaCh7aHJlZjogaHJlZiwgbmFtZTogbmFtZX0pO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIC8vIGxldHMgc3dpenpsZSB0aGUgbGFzdCBvbmUgb3IgdHdvIHRvIGJlIGZvcm1UYWJsZSB2aWV3cyBpZiB0aGUgbGFzdCBvciAybmQgdG8gbGFzdFxuICAgICAgdmFyIGxvYyA9ICRsb2NhdGlvbi5wYXRoKCk7XG4gICAgICBpZiAoJHNjb3BlLmJyZWFkY3J1bWJzLmxlbmd0aCkge1xuICAgICAgICB2YXIgbGFzdCA9ICRzY29wZS5icmVhZGNydW1ic1skc2NvcGUuYnJlYWRjcnVtYnMubGVuZ3RoIC0gMV07XG4gICAgICAgIC8vIHBvc3NpYmx5IHRyaW0gYW55IHJlcXVpcmVkIGZpbGUgZXh0ZW5zaW9uc1xuICAgICAgICBsYXN0Lm5hbWUgPSBXaWtpLmhpZGVGaWxlTmFtZUV4dGVuc2lvbnMobGFzdC5uYW1lKTtcblxuICAgICAgICB2YXIgc3dpenpsZWQgPSBmYWxzZTtcbiAgICAgICAgYW5ndWxhci5mb3JFYWNoKFdpa2kuY3VzdG9tVmlld0xpbmtzKCRzY29wZSksIChsaW5rKSA9PiB7XG4gICAgICAgICAgaWYgKCFzd2l6emxlZCAmJiBsb2Muc3RhcnRzV2l0aChsaW5rKSkge1xuICAgICAgICAgICAgLy8gbGV0cyBzd2l6emxlIHRoZSB2aWV3IHRvIHRoZSBjdXJyZW50IGxpbmtcbiAgICAgICAgICAgIHN3aXRjaEZyb21WaWV3VG9DdXN0b21MaW5rKCRzY29wZS5icmVhZGNydW1icy5sYXN0KCksIENvcmUudHJpbUxlYWRpbmcobGluaywgXCIvXCIpKTtcbiAgICAgICAgICAgIHN3aXp6bGVkID0gdHJ1ZTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBpZiAoIXN3aXp6bGVkICYmICRsb2NhdGlvbi5zZWFyY2goKVtcImZvcm1cIl0pIHtcbiAgICAgICAgICB2YXIgbGFzdE5hbWUgPSAkc2NvcGUuYnJlYWRjcnVtYnMubGFzdCgpLm5hbWU7XG4gICAgICAgICAgaWYgKGxhc3ROYW1lICYmIGxhc3ROYW1lLmVuZHNXaXRoKFwiLmpzb25cIikpIHtcbiAgICAgICAgICAgIC8vIHByZXZpb3VzIGJyZWFkY3J1bWIgc2hvdWxkIGJlIGEgZm9ybVRhYmxlXG4gICAgICAgICAgICBzd2l0Y2hGcm9tVmlld1RvQ3VzdG9tTGluaygkc2NvcGUuYnJlYWRjcnVtYnNbJHNjb3BlLmJyZWFkY3J1bWJzLmxlbmd0aCAtIDJdLCBcIndpa2kvZm9ybVRhYmxlXCIpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgLypcbiAgICAgIGlmIChsb2Muc3RhcnRzV2l0aChcIi93aWtpL2hpc3RvcnlcIikgfHwgbG9jLnN0YXJ0c1dpdGgoXCIvd2lraS92ZXJzaW9uXCIpXG4gICAgICAgIHx8IGxvYy5zdGFydHNXaXRoKFwiL3dpa2kvZGlmZlwiKSB8fCBsb2Muc3RhcnRzV2l0aChcIi93aWtpL2NvbW1pdFwiKSkge1xuICAgICAgICAvLyBsZXRzIGFkZCBhIGhpc3RvcnkgdGFiXG4gICAgICAgICRzY29wZS5icmVhZGNydW1icy5wdXNoKHtocmVmOiBcIiMvd2lraS9oaXN0b3J5L1wiICsgcGF0aCwgbmFtZTogXCJIaXN0b3J5XCJ9KTtcbiAgICAgIH0gZWxzZSBpZiAoJHNjb3BlLmJyYW5jaCkge1xuICAgICAgICB2YXIgcHJlZml4ID1cIi93aWtpL2JyYW5jaC9cIiArICRzY29wZS5icmFuY2g7XG4gICAgICAgIGlmIChsb2Muc3RhcnRzV2l0aChwcmVmaXggKyBcIi9oaXN0b3J5XCIpIHx8IGxvYy5zdGFydHNXaXRoKHByZWZpeCArIFwiL3ZlcnNpb25cIilcbiAgICAgICAgICB8fCBsb2Muc3RhcnRzV2l0aChwcmVmaXggKyBcIi9kaWZmXCIpIHx8IGxvYy5zdGFydHNXaXRoKHByZWZpeCArIFwiL2NvbW1pdFwiKSkge1xuICAgICAgICAgIC8vIGxldHMgYWRkIGEgaGlzdG9yeSB0YWJcbiAgICAgICAgICAkc2NvcGUuYnJlYWRjcnVtYnMucHVzaCh7aHJlZjogXCIjL3dpa2kvYnJhbmNoL1wiICsgJHNjb3BlLmJyYW5jaCArIFwiL2hpc3RvcnkvXCIgKyBwYXRoLCBuYW1lOiBcIkhpc3RvcnlcIn0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICAqL1xuICAgICAgdmFyIG5hbWU6c3RyaW5nID0gbnVsbDtcbiAgICAgIGlmIChsb2Muc3RhcnRzV2l0aChcIi93aWtpL3ZlcnNpb25cIikpIHtcbiAgICAgICAgLy8gbGV0cyBhZGQgYSB2ZXJzaW9uIHRhYlxuICAgICAgICBuYW1lID0gKCRyb3V0ZVBhcmFtc1tcIm9iamVjdElkXCJdIHx8IFwiXCIpLnN1YnN0cmluZygwLCA2KSB8fCBcIlZlcnNpb25cIjtcbiAgICAgICAgJHNjb3BlLmJyZWFkY3J1bWJzLnB1c2goe2hyZWY6IFwiI1wiICsgbG9jLCBuYW1lOiBuYW1lfSk7XG4gICAgICB9XG4gICAgICBpZiAobG9jLnN0YXJ0c1dpdGgoXCIvd2lraS9kaWZmXCIpKSB7XG4gICAgICAgIC8vIGxldHMgYWRkIGEgdmVyc2lvbiB0YWJcbiAgICAgICAgdmFyIHYxID0gKCRyb3V0ZVBhcmFtc1tcIm9iamVjdElkXCJdIHx8IFwiXCIpLnN1YnN0cmluZygwLCA2KTtcbiAgICAgICAgdmFyIHYyID0gKCRyb3V0ZVBhcmFtc1tcImJhc2VPYmplY3RJZFwiXSB8fCBcIlwiKS5zdWJzdHJpbmcoMCwgNik7XG4gICAgICAgIG5hbWUgPSBcIkRpZmZcIjtcbiAgICAgICAgaWYgKHYxKSB7XG4gICAgICAgICAgaWYgKHYyKSB7XG4gICAgICAgICAgICBuYW1lICs9IFwiIFwiICsgdjEgKyBcIiBcIiArIHYyO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBuYW1lICs9IFwiIFwiICsgdjE7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgICRzY29wZS5icmVhZGNydW1icy5wdXNoKHtocmVmOiBcIiNcIiArIGxvYywgbmFtZTogbmFtZX0pO1xuICAgICAgfVxuICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICB9XG4gIH1dKTtcbn1cbiIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9pbmNsdWRlcy50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJ3aWtpSGVscGVycy50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJ3aWtpUGx1Z2luLnRzXCIvPlxuXG4vKipcbiAqIEBtb2R1bGUgV2lraVxuICovXG5tb2R1bGUgV2lraSB7XG5cbiAgLy8gbWFpbiBwYWdlIGNvbnRyb2xsZXJcbiAgZXhwb3J0IHZhciBWaWV3Q29udHJvbGxlciA9IF9tb2R1bGUuY29udHJvbGxlcihcIldpa2kuVmlld0NvbnRyb2xsZXJcIiwgW1wiJHNjb3BlXCIsIFwiJGxvY2F0aW9uXCIsIFwiJHJvdXRlUGFyYW1zXCIsIFwiJHJvdXRlXCIsIFwiJGh0dHBcIiwgXCIkdGltZW91dFwiLCBcIm1hcmtlZFwiLCBcImZpbGVFeHRlbnNpb25UeXBlUmVnaXN0cnlcIiwgIFwiJGNvbXBpbGVcIiwgXCIkdGVtcGxhdGVDYWNoZVwiLCBcImxvY2FsU3RvcmFnZVwiLCBcIiRpbnRlcnBvbGF0ZVwiLCBcIiRkaWFsb2dcIiwgKCRzY29wZSwgJGxvY2F0aW9uOm5nLklMb2NhdGlvblNlcnZpY2UsICRyb3V0ZVBhcmFtczpuZy5yb3V0ZS5JUm91dGVQYXJhbXNTZXJ2aWNlLCAkcm91dGU6bmcucm91dGUuSVJvdXRlU2VydmljZSwgJGh0dHA6bmcuSUh0dHBTZXJ2aWNlLCAkdGltZW91dDpuZy5JVGltZW91dFNlcnZpY2UsIG1hcmtlZCwgZmlsZUV4dGVuc2lvblR5cGVSZWdpc3RyeSwgICRjb21waWxlOm5nLklDb21waWxlU2VydmljZSwgJHRlbXBsYXRlQ2FjaGU6bmcuSVRlbXBsYXRlQ2FjaGVTZXJ2aWNlLCBsb2NhbFN0b3JhZ2UsICRpbnRlcnBvbGF0ZTpuZy5JSW50ZXJwb2xhdGVTZXJ2aWNlLCAkZGlhbG9nKSA9PiB7XG5cbiAgICAkc2NvcGUubmFtZSA9IFwiV2lraVZpZXdDb250cm9sbGVyXCI7XG5cbiAgICAvLyBUT0RPIHJlbW92ZSFcbiAgICB2YXIgaXNGbWMgPSBmYWxzZTtcblxuICAgIFdpa2kuaW5pdFNjb3BlKCRzY29wZSwgJHJvdXRlUGFyYW1zLCAkbG9jYXRpb24pO1xuICAgIHZhciB3aWtpUmVwb3NpdG9yeSA9ICRzY29wZS53aWtpUmVwb3NpdG9yeTtcblxuICAgIFNlbGVjdGlvbkhlbHBlcnMuZGVjb3JhdGUoJHNjb3BlKTtcblxuICAgICRzY29wZS5mYWJyaWNUb3BMZXZlbCA9IFwiZmFicmljL3Byb2ZpbGVzL1wiO1xuXG4gICAgJHNjb3BlLnZlcnNpb25JZCA9ICRzY29wZS5icmFuY2g7XG5cbiAgICAkc2NvcGUucGFuZVRlbXBsYXRlID0gJyc7XG5cbiAgICAkc2NvcGUucHJvZmlsZUlkID0gXCJcIjtcbiAgICAkc2NvcGUuc2hvd1Byb2ZpbGVIZWFkZXIgPSBmYWxzZTtcbiAgICAkc2NvcGUuc2hvd0FwcEhlYWRlciA9IGZhbHNlO1xuXG4gICAgJHNjb3BlLm9wZXJhdGlvbkNvdW50ZXIgPSAxO1xuICAgICRzY29wZS5yZW5hbWVEaWFsb2cgPSA8V2lraURpYWxvZz4gbnVsbDtcbiAgICAkc2NvcGUubW92ZURpYWxvZyA9IDxXaWtpRGlhbG9nPiBudWxsO1xuICAgICRzY29wZS5kZWxldGVEaWFsb2cgPSA8V2lraURpYWxvZz4gbnVsbDtcbiAgICAkc2NvcGUuaXNGaWxlID0gZmFsc2U7XG5cbiAgICAkc2NvcGUucmVuYW1lID0ge1xuICAgICAgbmV3RmlsZU5hbWU6IFwiXCJcbiAgICB9O1xuICAgICRzY29wZS5tb3ZlID0ge1xuICAgICAgbW92ZUZvbGRlcjogXCJcIlxuICAgIH07XG4gICAgJHNjb3BlLlZpZXdNb2RlID0gV2lraS5WaWV3TW9kZTtcblxuICAgIC8vIGJpbmQgZmlsdGVyIG1vZGVsIHZhbHVlcyB0byBzZWFyY2ggcGFyYW1zLi4uXG4gICAgQ29yZS5iaW5kTW9kZWxUb1NlYXJjaFBhcmFtKCRzY29wZSwgJGxvY2F0aW9uLCBcInNlYXJjaFRleHRcIiwgXCJxXCIsIFwiXCIpO1xuXG4gICAgU3RvcmFnZUhlbHBlcnMuYmluZE1vZGVsVG9Mb2NhbFN0b3JhZ2Uoe1xuICAgICAgJHNjb3BlOiAkc2NvcGUsXG4gICAgICAkbG9jYXRpb246ICRsb2NhdGlvbixcbiAgICAgIGxvY2FsU3RvcmFnZTogbG9jYWxTdG9yYWdlLFxuICAgICAgbW9kZWxOYW1lOiAnbW9kZScsXG4gICAgICBwYXJhbU5hbWU6ICd3aWtpVmlld01vZGUnLFxuICAgICAgaW5pdGlhbFZhbHVlOiBXaWtpLlZpZXdNb2RlLkxpc3QsXG4gICAgICB0bzogQ29yZS5udW1iZXJUb1N0cmluZyxcbiAgICAgIGZyb206IENvcmUucGFyc2VJbnRWYWx1ZVxuICAgIH0pO1xuXG4gICAgLy8gb25seSByZWxvYWQgdGhlIHBhZ2UgaWYgY2VydGFpbiBzZWFyY2ggcGFyYW1ldGVycyBjaGFuZ2VcbiAgICBDb3JlLnJlbG9hZFdoZW5QYXJhbWV0ZXJzQ2hhbmdlKCRyb3V0ZSwgJHNjb3BlLCAkbG9jYXRpb24sIFsnd2lraVZpZXdNb2RlJ10pO1xuXG4gICAgJHNjb3BlLmdyaWRPcHRpb25zID0ge1xuICAgICAgZGF0YTogJ2NoaWxkcmVuJyxcbiAgICAgIGRpc3BsYXlGb290ZXI6IGZhbHNlLFxuICAgICAgc2VsZWN0ZWRJdGVtczogW10sXG4gICAgICBzaG93U2VsZWN0aW9uQ2hlY2tib3g6IHRydWUsXG4gICAgICBlbmFibGVTb3J0aW5nOiBmYWxzZSxcbiAgICAgIHVzZUV4dGVybmFsU29ydGluZzogdHJ1ZSxcbiAgICAgIGNvbHVtbkRlZnM6IFtcbiAgICAgICAge1xuICAgICAgICAgIGZpZWxkOiAnbmFtZScsXG4gICAgICAgICAgZGlzcGxheU5hbWU6ICdOYW1lJyxcbiAgICAgICAgICBjZWxsVGVtcGxhdGU6ICR0ZW1wbGF0ZUNhY2hlLmdldCgnZmlsZUNlbGxUZW1wbGF0ZS5odG1sJyksXG4gICAgICAgICAgaGVhZGVyQ2VsbFRlbXBsYXRlOiAkdGVtcGxhdGVDYWNoZS5nZXQoJ2ZpbGVDb2x1bW5UZW1wbGF0ZS5odG1sJylcbiAgICAgICAgfVxuICAgICAgXVxuICAgIH07XG5cbiAgICAkc2NvcGUuJG9uKCdXaWtpLlNldFZpZXdNb2RlJywgKCRldmVudCwgbW9kZTpXaWtpLlZpZXdNb2RlKSA9PiB7XG4gICAgICAkc2NvcGUubW9kZSA9IG1vZGU7XG4gICAgICBzd2l0Y2gobW9kZSkge1xuICAgICAgICBjYXNlIFZpZXdNb2RlLkxpc3Q6XG4gICAgICAgICAgbG9nLmRlYnVnKFwiTGlzdCB2aWV3IG1vZGVcIik7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgVmlld01vZGUuSWNvbjpcbiAgICAgICAgICBsb2cuZGVidWcoXCJJY29uIHZpZXcgbW9kZVwiKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAkc2NvcGUubW9kZSA9IFZpZXdNb2RlLkxpc3Q7XG4gICAgICAgICAgbG9nLmRlYnVnKFwiRGVmYXVsdGluZyB0byBsaXN0IHZpZXcgbW9kZVwiKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9KTtcblxuXG4gICAgJHNjb3BlLmNoaWxkQWN0aW9ucyA9IFtdO1xuXG4gICAgdmFyIG1heWJlVXBkYXRlVmlldyA9IENvcmUudGhyb3R0bGVkKHVwZGF0ZVZpZXcsIDEwMDApO1xuXG4gICAgJHNjb3BlLm1hcmtlZCA9ICh0ZXh0KSA9PiB7XG4gICAgICBpZiAodGV4dCkge1xuICAgICAgICByZXR1cm4gbWFya2VkKHRleHQpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuICcnO1xuICAgICAgfVxuICAgIH07XG5cblxuICAgICRzY29wZS4kb24oJ3dpa2lCcmFuY2hlc1VwZGF0ZWQnLCBmdW5jdGlvbiAoKSB7XG4gICAgICB1cGRhdGVWaWV3KCk7XG4gICAgfSk7XG5cbiAgICAkc2NvcGUuY3JlYXRlRGFzaGJvYXJkTGluayA9ICgpID0+IHtcbiAgICAgIHZhciBocmVmID0gJy93aWtpL2JyYW5jaC86YnJhbmNoL3ZpZXcvKnBhZ2UnO1xuICAgICAgdmFyIHBhZ2UgPSAkcm91dGVQYXJhbXNbJ3BhZ2UnXTtcbiAgICAgIHZhciB0aXRsZSA9IHBhZ2UgPyBwYWdlLnNwbGl0KFwiL1wiKS5sYXN0KCkgOiBudWxsO1xuICAgICAgdmFyIHNpemUgPSBhbmd1bGFyLnRvSnNvbih7XG4gICAgICAgIHNpemVfeDogMixcbiAgICAgICAgc2l6ZV95OiAyXG4gICAgICB9KTtcbiAgICAgIHZhciBhbnN3ZXIgPSBcIiMvZGFzaGJvYXJkL2FkZD90YWI9ZGFzaGJvYXJkXCIgK1xuICAgICAgICBcIiZocmVmPVwiICsgZW5jb2RlVVJJQ29tcG9uZW50KGhyZWYpICtcbiAgICAgICAgXCImc2l6ZT1cIiArIGVuY29kZVVSSUNvbXBvbmVudChzaXplKSArXG4gICAgICAgIFwiJnJvdXRlUGFyYW1zPVwiICsgZW5jb2RlVVJJQ29tcG9uZW50KGFuZ3VsYXIudG9Kc29uKCRyb3V0ZVBhcmFtcykpO1xuICAgICAgaWYgKHRpdGxlKSB7XG4gICAgICAgIGFuc3dlciArPSBcIiZ0aXRsZT1cIiArIGVuY29kZVVSSUNvbXBvbmVudCh0aXRsZSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gYW5zd2VyO1xuICAgIH07XG5cbiAgICAkc2NvcGUuZGlzcGxheUNsYXNzID0gKCkgPT4ge1xuICAgICAgaWYgKCEkc2NvcGUuY2hpbGRyZW4gfHwgJHNjb3BlLmNoaWxkcmVuLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICByZXR1cm4gXCJcIjtcbiAgICAgIH1cbiAgICAgIHJldHVybiBcInNwYW45XCI7XG4gICAgfTtcblxuICAgICRzY29wZS5wYXJlbnRMaW5rID0gKCkgPT4ge1xuICAgICAgdmFyIHN0YXJ0ID0gc3RhcnRMaW5rKCRzY29wZSk7XG4gICAgICB2YXIgcHJlZml4ID0gc3RhcnQgKyBcIi92aWV3XCI7XG4gICAgICAvL2xvZy5kZWJ1ZyhcInBhZ2VJZDogXCIsICRzY29wZS5wYWdlSWQpXG4gICAgICB2YXIgcGFydHMgPSAkc2NvcGUucGFnZUlkLnNwbGl0KFwiL1wiKTtcbiAgICAgIC8vbG9nLmRlYnVnKFwicGFydHM6IFwiLCBwYXJ0cyk7XG4gICAgICB2YXIgcGF0aCA9IFwiL1wiICsgcGFydHMuZmlyc3QocGFydHMubGVuZ3RoIC0gMSkuam9pbihcIi9cIik7XG4gICAgICAvL2xvZy5kZWJ1ZyhcInBhdGg6IFwiLCBwYXRoKTtcbiAgICAgIHJldHVybiBDb3JlLmNyZWF0ZUhyZWYoJGxvY2F0aW9uLCBwcmVmaXggKyBwYXRoLCBbXSk7XG4gICAgfTtcblxuXG4gICAgJHNjb3BlLmNoaWxkTGluayA9IChjaGlsZCkgPT4ge1xuICAgICAgdmFyIHN0YXJ0ID0gc3RhcnRMaW5rKCRzY29wZSk7XG4gICAgICB2YXIgcHJlZml4ID0gc3RhcnQgKyBcIi92aWV3XCI7XG4gICAgICB2YXIgcG9zdEZpeCA9IFwiXCI7XG4gICAgICB2YXIgcGF0aCA9IFdpa2kuZW5jb2RlUGF0aChjaGlsZC5wYXRoKTtcbiAgICAgIGlmIChjaGlsZC5kaXJlY3RvcnkpIHtcbiAgICAgICAgLy8gaWYgd2UgYXJlIGEgZm9sZGVyIHdpdGggdGhlIHNhbWUgbmFtZSBhcyBhIGZvcm0gZmlsZSwgbGV0cyBhZGQgYSBmb3JtIHBhcmFtLi4uXG4gICAgICAgIHZhciBmb3JtUGF0aCA9IHBhdGggKyBcIi5mb3JtXCI7XG4gICAgICAgIHZhciBjaGlsZHJlbiA9ICRzY29wZS5jaGlsZHJlbjtcbiAgICAgICAgaWYgKGNoaWxkcmVuKSB7XG4gICAgICAgICAgdmFyIGZvcm1GaWxlID0gY2hpbGRyZW4uZmluZCgoY2hpbGQpID0+IHtcbiAgICAgICAgICAgIHJldHVybiBjaGlsZFsncGF0aCddID09PSBmb3JtUGF0aDtcbiAgICAgICAgICB9KTtcbiAgICAgICAgICBpZiAoZm9ybUZpbGUpIHtcbiAgICAgICAgICAgIHByZWZpeCA9IHN0YXJ0ICsgXCIvZm9ybVRhYmxlXCI7XG4gICAgICAgICAgICBwb3N0Rml4ID0gXCI/Zm9ybT1cIiArIGZvcm1QYXRoO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIHhtbE5hbWVzcGFjZXMgPSBjaGlsZC54bWxfbmFtZXNwYWNlcyB8fCBjaGlsZC54bWxOYW1lc3BhY2VzO1xuICAgICAgICBpZiAoeG1sTmFtZXNwYWNlcyAmJiB4bWxOYW1lc3BhY2VzLmxlbmd0aCkge1xuICAgICAgICAgIGlmICh4bWxOYW1lc3BhY2VzLmFueSgobnMpID0+IFdpa2kuY2FtZWxOYW1lc3BhY2VzLmFueShucykpKSB7XG4gICAgICAgICAgICBpZiAodXNlQ2FtZWxDYW52YXNCeURlZmF1bHQpIHtcbiAgICAgICAgICAgICAgcHJlZml4ID0gc3RhcnQgKyBcIi9jYW1lbC9jYW52YXNcIjtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHByZWZpeCA9IHN0YXJ0ICsgXCIvY2FtZWwvcHJvcGVydGllc1wiO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSBpZiAoeG1sTmFtZXNwYWNlcy5hbnkoKG5zKSA9PiBXaWtpLmRvemVyTmFtZXNwYWNlcy5hbnkobnMpKSkge1xuICAgICAgICAgICAgcHJlZml4ID0gc3RhcnQgKyBcIi9kb3plci9tYXBwaW5nc1wiO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBsb2cuZGVidWcoXCJjaGlsZCBcIiArIHBhdGggKyBcIiBoYXMgbmFtZXNwYWNlcyBcIiArIHhtbE5hbWVzcGFjZXMpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoY2hpbGQucGF0aC5lbmRzV2l0aChcIi5mb3JtXCIpKSB7XG4gICAgICAgICAgcG9zdEZpeCA9IFwiP2Zvcm09L1wiO1xuICAgICAgICB9IGVsc2UgaWYgKFdpa2kuaXNJbmRleFBhZ2UoY2hpbGQucGF0aCkpIHtcbiAgICAgICAgICAvLyBsZXRzIGRlZmF1bHQgdG8gYm9vayB2aWV3IG9uIGluZGV4IHBhZ2VzXG4gICAgICAgICAgcHJlZml4ID0gc3RhcnQgKyBcIi9ib29rXCI7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiBDb3JlLmNyZWF0ZUhyZWYoJGxvY2F0aW9uLCBVcmxIZWxwZXJzLmpvaW4ocHJlZml4LCBwYXRoKSArIHBvc3RGaXgsIFtcImZvcm1cIl0pO1xuICAgIH07XG5cbiAgICAkc2NvcGUuZmlsZU5hbWUgPSAoZW50aXR5KSA9PiB7XG4gICAgICByZXR1cm4gV2lraS5oaWRlRmlsZU5hbWVFeHRlbnNpb25zKGVudGl0eS5kaXNwbGF5TmFtZSB8fCBlbnRpdHkubmFtZSk7XG4gICAgfTtcblxuICAgICRzY29wZS5maWxlQ2xhc3MgPSAoZW50aXR5KSA9PiB7XG4gICAgICBpZiAoZW50aXR5Lm5hbWUuaGFzKFwiLnByb2ZpbGVcIikpIHtcbiAgICAgICAgcmV0dXJuIFwiZ3JlZW5cIjtcbiAgICAgIH1cbiAgICAgIHJldHVybiBcIlwiO1xuICAgIH07XG5cbiAgICAkc2NvcGUuZmlsZUljb25IdG1sID0gKGVudGl0eSkgPT4ge1xuICAgICAgcmV0dXJuIFdpa2kuZmlsZUljb25IdG1sKGVudGl0eSk7XG4gICAgfTtcblxuXG4gICAgJHNjb3BlLmZvcm1hdCA9IFdpa2kuZmlsZUZvcm1hdCgkc2NvcGUucGFnZUlkLCBmaWxlRXh0ZW5zaW9uVHlwZVJlZ2lzdHJ5KTtcbiAgICB2YXIgb3B0aW9ucyA9IHtcbiAgICAgIHJlYWRPbmx5OiB0cnVlLFxuICAgICAgbW9kZToge1xuICAgICAgICBuYW1lOiAkc2NvcGUuZm9ybWF0XG4gICAgICB9XG4gICAgfTtcbiAgICAkc2NvcGUuY29kZU1pcnJvck9wdGlvbnMgPSBDb2RlRWRpdG9yLmNyZWF0ZUVkaXRvclNldHRpbmdzKG9wdGlvbnMpO1xuXG4gICAgJHNjb3BlLmVkaXRMaW5rID0gKCkgPT4ge1xuICAgICAgdmFyIHBhZ2VOYW1lID0gKCRzY29wZS5kaXJlY3RvcnkpID8gJHNjb3BlLnJlYWRNZVBhdGggOiAkc2NvcGUucGFnZUlkO1xuICAgICAgcmV0dXJuIChwYWdlTmFtZSkgPyBXaWtpLmVkaXRMaW5rKCRzY29wZSwgcGFnZU5hbWUsICRsb2NhdGlvbikgOiBudWxsO1xuICAgIH07XG5cbiAgICAkc2NvcGUuYnJhbmNoTGluayA9IChicmFuY2gpID0+IHtcbiAgICAgIGlmIChicmFuY2gpIHtcbiAgICAgICAgcmV0dXJuIFdpa2kuYnJhbmNoTGluayhicmFuY2gsICRzY29wZS5wYWdlSWQsICRsb2NhdGlvbik7XG4gICAgICB9XG4gICAgICByZXR1cm4gbnVsbFxuICAgIH07XG5cbiAgICAkc2NvcGUuaGlzdG9yeUxpbmsgPSBcIiMvd2lraVwiICsgKCRzY29wZS5icmFuY2ggPyBcIi9icmFuY2gvXCIgKyAkc2NvcGUuYnJhbmNoIDogXCJcIikgKyBcIi9oaXN0b3J5L1wiICsgJHNjb3BlLnBhZ2VJZDtcblxuICAgICRzY29wZS4kd2F0Y2goJ3dvcmtzcGFjZS50cmVlJywgZnVuY3Rpb24gKCkge1xuICAgICAgaWYgKCEkc2NvcGUuZ2l0KSB7XG4gICAgICAgIC8vIGxldHMgZG8gdGhpcyBhc3luY2hyb25vdXNseSB0byBhdm9pZCBFcnJvcjogJGRpZ2VzdCBhbHJlYWR5IGluIHByb2dyZXNzXG4gICAgICAgIC8vbG9nLmluZm8oXCJSZWxvYWRpbmcgdmlldyBhcyB0aGUgdHJlZSBjaGFuZ2VkIGFuZCB3ZSBoYXZlIGEgZ2l0IG1iZWFuIG5vd1wiKTtcbiAgICAgICAgc2V0VGltZW91dChtYXliZVVwZGF0ZVZpZXcsIDUwKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgICRzY29wZS4kb24oXCIkcm91dGVDaGFuZ2VTdWNjZXNzXCIsIGZ1bmN0aW9uIChldmVudCwgY3VycmVudCwgcHJldmlvdXMpIHtcbiAgICAgIC8vIGxldHMgZG8gdGhpcyBhc3luY2hyb25vdXNseSB0byBhdm9pZCBFcnJvcjogJGRpZ2VzdCBhbHJlYWR5IGluIHByb2dyZXNzXG4gICAgICAvL2xvZy5pbmZvKFwiUmVsb2FkaW5nIHZpZXcgZHVlIHRvICRyb3V0ZUNoYW5nZVN1Y2Nlc3NcIik7XG4gICAgICBzZXRUaW1lb3V0KG1heWJlVXBkYXRlVmlldywgNTApO1xuICAgIH0pO1xuXG5cbiAgICAkc2NvcGUub3BlbkRlbGV0ZURpYWxvZyA9ICgpID0+IHtcbiAgICAgIGlmICgkc2NvcGUuZ3JpZE9wdGlvbnMuc2VsZWN0ZWRJdGVtcy5sZW5ndGgpIHtcbiAgICAgICAgJHNjb3BlLnNlbGVjdGVkRmlsZUh0bWwgPSBcIjx1bD5cIiArICRzY29wZS5ncmlkT3B0aW9ucy5zZWxlY3RlZEl0ZW1zLm1hcChmaWxlID0+IFwiPGxpPlwiICsgZmlsZS5uYW1lICsgXCI8L2xpPlwiKS5zb3J0KCkuam9pbihcIlwiKSArIFwiPC91bD5cIjtcblxuICAgICAgICBpZiAoJHNjb3BlLmdyaWRPcHRpb25zLnNlbGVjdGVkSXRlbXMuZmluZCgoZmlsZSkgPT4geyByZXR1cm4gZmlsZS5uYW1lLmVuZHNXaXRoKFwiLnByb2ZpbGVcIil9KSkge1xuICAgICAgICAgICRzY29wZS5kZWxldGVXYXJuaW5nID0gXCJZb3UgYXJlIGFib3V0IHRvIGRlbGV0ZSBkb2N1bWVudChzKSB3aGljaCByZXByZXNlbnQgRmFicmljOCBwcm9maWxlKHMpLiBUaGlzIHJlYWxseSBjYW4ndCBiZSB1bmRvbmUhIFdpa2kgb3BlcmF0aW9ucyBhcmUgbG93IGxldmVsIGFuZCBtYXkgbGVhZCB0byBub24tZnVuY3Rpb25hbCBzdGF0ZSBvZiBGYWJyaWMuXCI7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgJHNjb3BlLmRlbGV0ZVdhcm5pbmcgPSBudWxsO1xuICAgICAgICB9XG5cbiAgICAgICAgJHNjb3BlLmRlbGV0ZURpYWxvZyA9IFdpa2kuZ2V0RGVsZXRlRGlhbG9nKCRkaWFsb2csIDxXaWtpLkRlbGV0ZURpYWxvZ09wdGlvbnM+e1xuICAgICAgICAgIGNhbGxiYWNrczogKCkgPT4geyByZXR1cm4gJHNjb3BlLmRlbGV0ZUFuZENsb3NlRGlhbG9nOyB9LFxuICAgICAgICAgIHNlbGVjdGVkRmlsZUh0bWw6ICgpID0+ICB7IHJldHVybiAkc2NvcGUuc2VsZWN0ZWRGaWxlSHRtbDsgfSxcbiAgICAgICAgICB3YXJuaW5nOiAoKSA9PiB7IHJldHVybiAkc2NvcGUuZGVsZXRlV2FybmluZzsgfVxuICAgICAgICB9KTtcblxuICAgICAgICAkc2NvcGUuZGVsZXRlRGlhbG9nLm9wZW4oKTtcblxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbG9nLmRlYnVnKFwiTm8gaXRlbXMgc2VsZWN0ZWQgcmlnaHQgbm93ISBcIiArICRzY29wZS5ncmlkT3B0aW9ucy5zZWxlY3RlZEl0ZW1zKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgJHNjb3BlLmRlbGV0ZUFuZENsb3NlRGlhbG9nID0gKCkgPT4ge1xuICAgICAgdmFyIGZpbGVzID0gJHNjb3BlLmdyaWRPcHRpb25zLnNlbGVjdGVkSXRlbXM7XG4gICAgICB2YXIgZmlsZUNvdW50ID0gZmlsZXMubGVuZ3RoO1xuICAgICAgbG9nLmRlYnVnKFwiRGVsZXRpbmcgc2VsZWN0aW9uOiBcIiArIGZpbGVzKTtcblxuICAgICAgdmFyIHBhdGhzVG9EZWxldGUgPSBbXTtcbiAgICAgIGFuZ3VsYXIuZm9yRWFjaChmaWxlcywgKGZpbGUsIGlkeCkgPT4ge1xuICAgICAgICB2YXIgcGF0aCA9IFVybEhlbHBlcnMuam9pbigkc2NvcGUucGFnZUlkLCBmaWxlLm5hbWUpO1xuICAgICAgICBwYXRoc1RvRGVsZXRlLnB1c2gocGF0aCk7XG4gICAgICB9KTtcblxuICAgICAgbG9nLmRlYnVnKFwiQWJvdXQgdG8gZGVsZXRlIFwiICsgcGF0aHNUb0RlbGV0ZSk7XG4gICAgICAkc2NvcGUuZ2l0ID0gd2lraVJlcG9zaXRvcnkucmVtb3ZlUGFnZXMoJHNjb3BlLmJyYW5jaCwgcGF0aHNUb0RlbGV0ZSwgbnVsbCwgKHJlc3VsdCkgPT4ge1xuICAgICAgICAkc2NvcGUuZ3JpZE9wdGlvbnMuc2VsZWN0ZWRJdGVtcyA9IFtdO1xuICAgICAgICB2YXIgbWVzc2FnZSA9IENvcmUubWF5YmVQbHVyYWwoZmlsZUNvdW50LCBcImRvY3VtZW50XCIpO1xuICAgICAgICBDb3JlLm5vdGlmaWNhdGlvbihcInN1Y2Nlc3NcIiwgXCJEZWxldGVkIFwiICsgbWVzc2FnZSk7XG4gICAgICAgIENvcmUuJGFwcGx5KCRzY29wZSk7XG4gICAgICAgIHVwZGF0ZVZpZXcoKTtcbiAgICAgIH0pO1xuICAgICAgJHNjb3BlLmRlbGV0ZURpYWxvZy5jbG9zZSgpO1xuICAgIH07XG5cbiAgICAkc2NvcGUuJHdhdGNoKFwicmVuYW1lLm5ld0ZpbGVOYW1lXCIsICgpID0+IHtcbiAgICAgIC8vIGlnbm9yZSBlcnJvcnMgaWYgdGhlIGZpbGUgaXMgdGhlIHNhbWUgYXMgdGhlIHJlbmFtZSBmaWxlIVxuICAgICAgdmFyIHBhdGggPSBnZXRSZW5hbWVGaWxlUGF0aCgpO1xuICAgICAgaWYgKCRzY29wZS5vcmlnaW5hbFJlbmFtZUZpbGVQYXRoID09PSBwYXRoKSB7XG4gICAgICAgICRzY29wZS5maWxlRXhpc3RzID0geyBleGlzdHM6IGZhbHNlLCBuYW1lOiBudWxsIH07XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjaGVja0ZpbGVFeGlzdHMocGF0aCk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICAkc2NvcGUucmVuYW1lQW5kQ2xvc2VEaWFsb2cgPSAoKSA9PiB7XG4gICAgICBpZiAoJHNjb3BlLmdyaWRPcHRpb25zLnNlbGVjdGVkSXRlbXMubGVuZ3RoKSB7XG4gICAgICAgIHZhciBzZWxlY3RlZCA9ICRzY29wZS5ncmlkT3B0aW9ucy5zZWxlY3RlZEl0ZW1zWzBdO1xuICAgICAgICB2YXIgbmV3UGF0aCA9IGdldFJlbmFtZUZpbGVQYXRoKCk7XG4gICAgICAgIGlmIChzZWxlY3RlZCAmJiBuZXdQYXRoKSB7XG4gICAgICAgICAgdmFyIG9sZE5hbWUgPSBzZWxlY3RlZC5uYW1lO1xuICAgICAgICAgIHZhciBuZXdOYW1lID0gV2lraS5maWxlTmFtZShuZXdQYXRoKTtcbiAgICAgICAgICB2YXIgb2xkUGF0aCA9IFVybEhlbHBlcnMuam9pbigkc2NvcGUucGFnZUlkLCBvbGROYW1lKTtcbiAgICAgICAgICBsb2cuZGVidWcoXCJBYm91dCB0byByZW5hbWUgZmlsZSBcIiArIG9sZFBhdGggKyBcIiB0byBcIiArIG5ld1BhdGgpO1xuICAgICAgICAgICRzY29wZS5naXQgPSB3aWtpUmVwb3NpdG9yeS5yZW5hbWUoJHNjb3BlLmJyYW5jaCwgb2xkUGF0aCwgbmV3UGF0aCwgbnVsbCwgKHJlc3VsdCkgPT4ge1xuICAgICAgICAgICAgQ29yZS5ub3RpZmljYXRpb24oXCJzdWNjZXNzXCIsIFwiUmVuYW1lZCBmaWxlIHRvICBcIiArIG5ld05hbWUpO1xuICAgICAgICAgICAgJHNjb3BlLmdyaWRPcHRpb25zLnNlbGVjdGVkSXRlbXMuc3BsaWNlKDAsIDEpO1xuICAgICAgICAgICAgJHNjb3BlLnJlbmFtZURpYWxvZy5jbG9zZSgpO1xuICAgICAgICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICAgICAgICAgIHVwZGF0ZVZpZXcoKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgJHNjb3BlLnJlbmFtZURpYWxvZy5jbG9zZSgpO1xuICAgIH07XG5cbiAgICAkc2NvcGUub3BlblJlbmFtZURpYWxvZyA9ICgpID0+IHtcbiAgICAgIHZhciBuYW1lID0gbnVsbDtcbiAgICAgIGlmICgkc2NvcGUuZ3JpZE9wdGlvbnMuc2VsZWN0ZWRJdGVtcy5sZW5ndGgpIHtcbiAgICAgICAgdmFyIHNlbGVjdGVkID0gJHNjb3BlLmdyaWRPcHRpb25zLnNlbGVjdGVkSXRlbXNbMF07XG4gICAgICAgIG5hbWUgPSBzZWxlY3RlZC5uYW1lO1xuICAgICAgfVxuICAgICAgaWYgKG5hbWUpIHtcbiAgICAgICAgJHNjb3BlLnJlbmFtZS5uZXdGaWxlTmFtZSA9IG5hbWU7XG4gICAgICAgICRzY29wZS5vcmlnaW5hbFJlbmFtZUZpbGVQYXRoID0gZ2V0UmVuYW1lRmlsZVBhdGgoKTtcblxuICAgICAgICAkc2NvcGUucmVuYW1lRGlhbG9nID0gV2lraS5nZXRSZW5hbWVEaWFsb2coJGRpYWxvZywgPFdpa2kuUmVuYW1lRGlhbG9nT3B0aW9ucz57XG4gICAgICAgICAgcmVuYW1lOiAoKSA9PiB7ICByZXR1cm4gJHNjb3BlLnJlbmFtZTsgfSxcbiAgICAgICAgICBmaWxlRXhpc3RzOiAoKSA9PiB7IHJldHVybiAkc2NvcGUuZmlsZUV4aXN0czsgfSxcbiAgICAgICAgICBmaWxlTmFtZTogKCkgPT4geyByZXR1cm4gJHNjb3BlLmZpbGVOYW1lOyB9LFxuICAgICAgICAgIGNhbGxiYWNrczogKCkgPT4geyByZXR1cm4gJHNjb3BlLnJlbmFtZUFuZENsb3NlRGlhbG9nOyB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgICRzY29wZS5yZW5hbWVEaWFsb2cub3BlbigpO1xuXG4gICAgICAgICR0aW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAkKCcjcmVuYW1lRmlsZU5hbWUnKS5mb2N1cygpO1xuICAgICAgICB9LCA1MCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBsb2cuZGVidWcoXCJObyBpdGVtcyBzZWxlY3RlZCByaWdodCBub3chIFwiICsgJHNjb3BlLmdyaWRPcHRpb25zLnNlbGVjdGVkSXRlbXMpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICAkc2NvcGUubW92ZUFuZENsb3NlRGlhbG9nID0gKCkgPT4ge1xuICAgICAgdmFyIGZpbGVzID0gJHNjb3BlLmdyaWRPcHRpb25zLnNlbGVjdGVkSXRlbXM7XG4gICAgICB2YXIgZmlsZUNvdW50ID0gZmlsZXMubGVuZ3RoO1xuICAgICAgdmFyIG1vdmVGb2xkZXIgPSAkc2NvcGUubW92ZS5tb3ZlRm9sZGVyO1xuICAgICAgdmFyIG9sZEZvbGRlcjpzdHJpbmcgPSAkc2NvcGUucGFnZUlkO1xuICAgICAgaWYgKG1vdmVGb2xkZXIgJiYgZmlsZUNvdW50ICYmIG1vdmVGb2xkZXIgIT09IG9sZEZvbGRlcikge1xuICAgICAgICBsb2cuZGVidWcoXCJNb3ZpbmcgXCIgKyBmaWxlQ291bnQgKyBcIiBmaWxlKHMpIHRvIFwiICsgbW92ZUZvbGRlcik7XG4gICAgICAgIGFuZ3VsYXIuZm9yRWFjaChmaWxlcywgKGZpbGUsIGlkeCkgPT4ge1xuICAgICAgICAgIHZhciBvbGRQYXRoID0gb2xkRm9sZGVyICsgXCIvXCIgKyBmaWxlLm5hbWU7XG4gICAgICAgICAgdmFyIG5ld1BhdGggPSBtb3ZlRm9sZGVyICsgXCIvXCIgKyBmaWxlLm5hbWU7XG4gICAgICAgICAgbG9nLmRlYnVnKFwiQWJvdXQgdG8gbW92ZSBcIiArIG9sZFBhdGggKyBcIiB0byBcIiArIG5ld1BhdGgpO1xuICAgICAgICAgICRzY29wZS5naXQgPSB3aWtpUmVwb3NpdG9yeS5yZW5hbWUoJHNjb3BlLmJyYW5jaCwgb2xkUGF0aCwgbmV3UGF0aCwgbnVsbCwgKHJlc3VsdCkgPT4ge1xuICAgICAgICAgICAgaWYgKGlkeCArIDEgPT09IGZpbGVDb3VudCkge1xuICAgICAgICAgICAgICAkc2NvcGUuZ3JpZE9wdGlvbnMuc2VsZWN0ZWRJdGVtcy5zcGxpY2UoMCwgZmlsZUNvdW50KTtcbiAgICAgICAgICAgICAgdmFyIG1lc3NhZ2UgPSBDb3JlLm1heWJlUGx1cmFsKGZpbGVDb3VudCwgXCJkb2N1bWVudFwiKTtcbiAgICAgICAgICAgICAgQ29yZS5ub3RpZmljYXRpb24oXCJzdWNjZXNzXCIsIFwiTW92ZWQgXCIgKyBtZXNzYWdlICsgXCIgdG8gXCIgKyBuZXdQYXRoKTtcbiAgICAgICAgICAgICAgJHNjb3BlLm1vdmVEaWFsb2cuY2xvc2UoKTtcbiAgICAgICAgICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICAgICAgICAgICAgdXBkYXRlVmlldygpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICAgICRzY29wZS5tb3ZlRGlhbG9nLmNsb3NlKCk7XG4gICAgfTtcblxuICAgICRzY29wZS5mb2xkZXJOYW1lcyA9ICh0ZXh0KSA9PiB7XG4gICAgICByZXR1cm4gd2lraVJlcG9zaXRvcnkuY29tcGxldGVQYXRoKCRzY29wZS5icmFuY2gsIHRleHQsIHRydWUsIG51bGwpO1xuICAgIH07XG5cbiAgICAkc2NvcGUub3Blbk1vdmVEaWFsb2cgPSAoKSA9PiB7XG4gICAgICBpZiAoJHNjb3BlLmdyaWRPcHRpb25zLnNlbGVjdGVkSXRlbXMubGVuZ3RoKSB7XG4gICAgICAgICRzY29wZS5tb3ZlLm1vdmVGb2xkZXIgPSAkc2NvcGUucGFnZUlkO1xuXG4gICAgICAgICRzY29wZS5tb3ZlRGlhbG9nID0gV2lraS5nZXRNb3ZlRGlhbG9nKCRkaWFsb2csIDxXaWtpLk1vdmVEaWFsb2dPcHRpb25zPntcbiAgICAgICAgICBtb3ZlOiAoKSA9PiB7ICByZXR1cm4gJHNjb3BlLm1vdmU7IH0sXG4gICAgICAgICAgZm9sZGVyTmFtZXM6ICgpID0+IHsgcmV0dXJuICRzY29wZS5mb2xkZXJOYW1lczsgfSxcbiAgICAgICAgICBjYWxsYmFja3M6ICgpID0+IHsgcmV0dXJuICRzY29wZS5tb3ZlQW5kQ2xvc2VEaWFsb2c7IH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgJHNjb3BlLm1vdmVEaWFsb2cub3BlbigpO1xuXG4gICAgICAgICR0aW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAkKCcjbW92ZUZvbGRlcicpLmZvY3VzKCk7XG4gICAgICAgIH0sIDUwKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGxvZy5kZWJ1ZyhcIk5vIGl0ZW1zIHNlbGVjdGVkIHJpZ2h0IG5vdyEgXCIgKyAkc2NvcGUuZ3JpZE9wdGlvbnMuc2VsZWN0ZWRJdGVtcyk7XG4gICAgICB9XG4gICAgfTtcblxuXG4gICAgc2V0VGltZW91dChtYXliZVVwZGF0ZVZpZXcsIDUwKTtcblxuICAgIGZ1bmN0aW9uIGlzRGlmZlZpZXcoKSB7XG4gICAgICByZXR1cm4gJHJvdXRlUGFyYW1zW1wiZGlmZk9iamVjdElkMVwiXSB8fCAkcm91dGVQYXJhbXNbXCJkaWZmT2JqZWN0SWQyXCJdID8gdHJ1ZSA6IGZhbHNlXG4gICAgfVxuXG4gICAgZnVuY3Rpb24gdXBkYXRlVmlldygpIHtcbiAgICAgICAgLy8gVE9ETyByZW1vdmUhXG4gICAgICAgIHZhciBqb2xva2lhID0gbnVsbDtcblxuXG4gICAgICBpZiAoaXNEaWZmVmlldygpKSB7XG4gICAgICAgIHZhciBiYXNlT2JqZWN0SWQgPSAkcm91dGVQYXJhbXNbXCJkaWZmT2JqZWN0SWQyXCJdO1xuICAgICAgICAkc2NvcGUuZ2l0ID0gd2lraVJlcG9zaXRvcnkuZGlmZigkc2NvcGUub2JqZWN0SWQsIGJhc2VPYmplY3RJZCwgJHNjb3BlLnBhZ2VJZCwgb25GaWxlRGV0YWlscyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAkc2NvcGUuZ2l0ID0gd2lraVJlcG9zaXRvcnkuZ2V0UGFnZSgkc2NvcGUuYnJhbmNoLCAkc2NvcGUucGFnZUlkLCAkc2NvcGUub2JqZWN0SWQsIG9uRmlsZURldGFpbHMpO1xuICAgICAgfVxuICAgICAgV2lraS5sb2FkQnJhbmNoZXMoam9sb2tpYSwgd2lraVJlcG9zaXRvcnksICRzY29wZSwgaXNGbWMpO1xuICAgIH1cblxuICAgICRzY29wZS51cGRhdGVWaWV3ID0gdXBkYXRlVmlldztcblxuICAgIGZ1bmN0aW9uIHZpZXdDb250ZW50cyhwYWdlTmFtZSwgY29udGVudHMpIHtcbiAgICAgICRzY29wZS5zb3VyY2VWaWV3ID0gbnVsbDtcblxuICAgICAgdmFyIGZvcm1hdDpzdHJpbmcgPSBudWxsO1xuICAgICAgaWYgKGlzRGlmZlZpZXcoKSkge1xuICAgICAgICBmb3JtYXQgPSBcImRpZmZcIjtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGZvcm1hdCA9IFdpa2kuZmlsZUZvcm1hdChwYWdlTmFtZSwgZmlsZUV4dGVuc2lvblR5cGVSZWdpc3RyeSkgfHwgJHNjb3BlLmZvcm1hdDtcbiAgICAgIH1cbiAgICAgIGxvZy5kZWJ1ZyhcIkZpbGUgZm9ybWF0OiBcIiwgZm9ybWF0KTtcbiAgICAgIHN3aXRjaCAoZm9ybWF0KSB7XG4gICAgICAgIGNhc2UgXCJpbWFnZVwiOlxuICAgICAgICAgIHZhciBpbWFnZVVSTCA9ICdnaXQvJyArICRzY29wZS5icmFuY2g7XG4gICAgICAgICAgbG9nLmRlYnVnKFwiJHNjb3BlOiBcIiwgJHNjb3BlKTtcbiAgICAgICAgICBpbWFnZVVSTCA9IFVybEhlbHBlcnMuam9pbihpbWFnZVVSTCwgJHNjb3BlLnBhZ2VJZCk7XG4gICAgICAgICAgdmFyIGludGVycG9sYXRlRnVuYyA9ICRpbnRlcnBvbGF0ZSgkdGVtcGxhdGVDYWNoZS5nZXQoXCJpbWFnZVRlbXBsYXRlLmh0bWxcIikpO1xuICAgICAgICAgICRzY29wZS5odG1sID0gaW50ZXJwb2xhdGVGdW5jKHtcbiAgICAgICAgICAgIGltYWdlVVJMOiBpbWFnZVVSTFxuICAgICAgICAgIH0pO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIFwibWFya2Rvd25cIjpcbiAgICAgICAgICAkc2NvcGUuaHRtbCA9IGNvbnRlbnRzID8gbWFya2VkKGNvbnRlbnRzKSA6IFwiXCI7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgXCJqYXZhc2NyaXB0XCI6XG4gICAgICAgICAgdmFyIGZvcm0gPSBudWxsO1xuICAgICAgICAgIGZvcm0gPSAkbG9jYXRpb24uc2VhcmNoKClbXCJmb3JtXCJdO1xuICAgICAgICAgICRzY29wZS5zb3VyY2UgPSBjb250ZW50cztcbiAgICAgICAgICAkc2NvcGUuZm9ybSA9IGZvcm07XG4gICAgICAgICAgaWYgKGZvcm0pIHtcbiAgICAgICAgICAgIC8vIG5vdyBsZXRzIHRyeSBsb2FkIHRoZSBmb3JtIEpTT04gc28gd2UgY2FuIHRoZW4gcmVuZGVyIHRoZSBmb3JtXG4gICAgICAgICAgICAkc2NvcGUuc291cmNlVmlldyA9IG51bGw7XG4gICAgICAgICAgICAkc2NvcGUuZ2l0ID0gd2lraVJlcG9zaXRvcnkuZ2V0UGFnZSgkc2NvcGUuYnJhbmNoLCBmb3JtLCAkc2NvcGUub2JqZWN0SWQsIChkZXRhaWxzKSA9PiB7XG4gICAgICAgICAgICAgIG9uRm9ybVNjaGVtYShXaWtpLnBhcnNlSnNvbihkZXRhaWxzLnRleHQpKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAkc2NvcGUuc291cmNlVmlldyA9IFwicGx1Z2lucy93aWtpL2h0bWwvc291cmNlVmlldy5odG1sXCI7XG4gICAgICAgICAgfVxuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICRzY29wZS5odG1sID0gbnVsbDtcbiAgICAgICAgICAkc2NvcGUuc291cmNlID0gY29udGVudHM7XG4gICAgICAgICAgJHNjb3BlLnNvdXJjZVZpZXcgPSBcInBsdWdpbnMvd2lraS9odG1sL3NvdXJjZVZpZXcuaHRtbFwiO1xuICAgICAgfVxuICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBvbkZvcm1TY2hlbWEoanNvbikge1xuICAgICAgJHNjb3BlLmZvcm1EZWZpbml0aW9uID0ganNvbjtcbiAgICAgIGlmICgkc2NvcGUuc291cmNlKSB7XG4gICAgICAgICRzY29wZS5mb3JtRW50aXR5ID0gV2lraS5wYXJzZUpzb24oJHNjb3BlLnNvdXJjZSk7XG4gICAgICB9XG4gICAgICAkc2NvcGUuc291cmNlVmlldyA9IFwicGx1Z2lucy93aWtpL2h0bWwvZm9ybVZpZXcuaHRtbFwiO1xuICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBvbkZpbGVEZXRhaWxzKGRldGFpbHMpIHtcbiAgICAgIHZhciBjb250ZW50cyA9IGRldGFpbHMudGV4dDtcbiAgICAgICRzY29wZS5kaXJlY3RvcnkgPSBkZXRhaWxzLmRpcmVjdG9yeTtcbiAgICAgICRzY29wZS5maWxlRGV0YWlscyA9IGRldGFpbHM7XG5cbiAgICAgIGlmIChkZXRhaWxzICYmIGRldGFpbHMuZm9ybWF0KSB7XG4gICAgICAgICRzY29wZS5mb3JtYXQgPSBkZXRhaWxzLmZvcm1hdDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgICRzY29wZS5mb3JtYXQgPSBXaWtpLmZpbGVGb3JtYXQoJHNjb3BlLnBhZ2VJZCwgZmlsZUV4dGVuc2lvblR5cGVSZWdpc3RyeSk7XG4gICAgICB9XG4gICAgICAkc2NvcGUuY29kZU1pcnJvck9wdGlvbnMubW9kZS5uYW1lID0gJHNjb3BlLmZvcm1hdDtcbiAgICAgICRzY29wZS5jaGlsZHJlbiA9IG51bGw7XG5cbiAgICAgIGlmIChkZXRhaWxzLmRpcmVjdG9yeSkge1xuICAgICAgICB2YXIgZGlyZWN0b3JpZXMgPSBkZXRhaWxzLmNoaWxkcmVuLmZpbHRlcigoZGlyKSA9PiB7XG4gICAgICAgICAgcmV0dXJuIGRpci5kaXJlY3Rvcnk7XG4gICAgICAgIH0pO1xuICAgICAgICB2YXIgcHJvZmlsZXMgPSBkZXRhaWxzLmNoaWxkcmVuLmZpbHRlcigoZGlyKSA9PiB7XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9KTtcbiAgICAgICAgdmFyIGZpbGVzID0gZGV0YWlscy5jaGlsZHJlbi5maWx0ZXIoKGZpbGUpID0+IHtcbiAgICAgICAgICByZXR1cm4gIWZpbGUuZGlyZWN0b3J5O1xuICAgICAgICB9KTtcbiAgICAgICAgZGlyZWN0b3JpZXMgPSBkaXJlY3Rvcmllcy5zb3J0QnkoKGRpcikgPT4ge1xuICAgICAgICAgIHJldHVybiBkaXIubmFtZTtcbiAgICAgICAgfSk7XG4gICAgICAgIHByb2ZpbGVzID0gcHJvZmlsZXMuc29ydEJ5KChkaXIpID0+IHtcbiAgICAgICAgICByZXR1cm4gZGlyLm5hbWU7XG4gICAgICAgIH0pO1xuICAgICAgICBmaWxlcyA9IGZpbGVzLnNvcnRCeSgoZmlsZSkgPT4ge1xuICAgICAgICAgIHJldHVybiBmaWxlLm5hbWU7XG4gICAgICAgIH0pXG4gICAgICAgICAgLnNvcnRCeSgoZmlsZSkgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIGZpbGUubmFtZS5zcGxpdCgnLicpLmxhc3QoKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgLy8gQWxzbyBlbnJpY2ggdGhlIHJlc3BvbnNlIHdpdGggdGhlIGN1cnJlbnQgYnJhbmNoLCBhcyB0aGF0J3MgcGFydCBvZiB0aGUgY29vcmRpbmF0ZSBmb3IgbG9jYXRpbmcgdGhlIGFjdHVhbCBmaWxlIGluIGdpdFxuICAgICAgICAkc2NvcGUuY2hpbGRyZW4gPSAoPGFueT5BcnJheSkuY3JlYXRlKGRpcmVjdG9yaWVzLCBwcm9maWxlcywgZmlsZXMpLm1hcCgoZmlsZSkgPT4ge1xuICAgICAgICAgIGZpbGUuYnJhbmNoID0gJHNjb3BlLmJyYW5jaDtcbiAgICAgICAgICBmaWxlLmZpbGVOYW1lID0gZmlsZS5uYW1lO1xuICAgICAgICAgIGlmIChmaWxlLmRpcmVjdG9yeSkge1xuICAgICAgICAgICAgZmlsZS5maWxlTmFtZSArPSBcIi56aXBcIjtcbiAgICAgICAgICB9XG4gICAgICAgICAgZmlsZS5kb3dubG9hZFVSTCA9IFdpa2kuZ2l0UmVzdFVSTCgkc2NvcGUsIGZpbGUucGF0aCk7XG4gICAgICAgICAgcmV0dXJuIGZpbGU7XG4gICAgICAgIH0pO1xuICAgICAgfVxuXG5cbiAgICAgICRzY29wZS5odG1sID0gbnVsbDtcbiAgICAgICRzY29wZS5zb3VyY2UgPSBudWxsO1xuICAgICAgJHNjb3BlLnJlYWRNZVBhdGggPSBudWxsO1xuXG4gICAgICAkc2NvcGUuaXNGaWxlID0gZmFsc2U7XG4gICAgICBpZiAoJHNjb3BlLmNoaWxkcmVuKSB7XG4gICAgICAgICRzY29wZS4kYnJvYWRjYXN0KCdwYW5lLm9wZW4nKTtcbiAgICAgICAgLy8gaWYgd2UgaGF2ZSBhIHJlYWRtZSB0aGVuIGxldHMgcmVuZGVyIGl0Li4uXG4gICAgICAgIHZhciBpdGVtID0gJHNjb3BlLmNoaWxkcmVuLmZpbmQoKGluZm8pID0+IHtcbiAgICAgICAgICB2YXIgbmFtZSA9IChpbmZvLm5hbWUgfHwgXCJcIikudG9Mb3dlckNhc2UoKTtcbiAgICAgICAgICB2YXIgZXh0ID0gZmlsZUV4dGVuc2lvbihuYW1lKTtcbiAgICAgICAgICByZXR1cm4gbmFtZSAmJiBleHQgJiYgKChuYW1lLnN0YXJ0c1dpdGgoXCJyZWFkbWUuXCIpIHx8IG5hbWUgPT09IFwicmVhZG1lXCIpIHx8IChuYW1lLnN0YXJ0c1dpdGgoXCJpbmRleC5cIikgfHwgbmFtZSA9PT0gXCJpbmRleFwiKSk7XG4gICAgICAgIH0pO1xuICAgICAgICBpZiAoaXRlbSkge1xuICAgICAgICAgIHZhciBwYWdlTmFtZSA9IGl0ZW0ucGF0aDtcbiAgICAgICAgICAkc2NvcGUucmVhZE1lUGF0aCA9IHBhZ2VOYW1lO1xuICAgICAgICAgIHdpa2lSZXBvc2l0b3J5LmdldFBhZ2UoJHNjb3BlLmJyYW5jaCwgcGFnZU5hbWUsICRzY29wZS5vYmplY3RJZCwgKHJlYWRtZURldGFpbHMpID0+IHtcbiAgICAgICAgICAgIHZpZXdDb250ZW50cyhwYWdlTmFtZSwgcmVhZG1lRGV0YWlscy50ZXh0KTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICB2YXIga3ViZXJuZXRlc0pzb24gPSAkc2NvcGUuY2hpbGRyZW4uZmluZCgoY2hpbGQpID0+IHtcbiAgICAgICAgICB2YXIgbmFtZSA9IChjaGlsZC5uYW1lIHx8IFwiXCIpLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgICAgdmFyIGV4dCA9IGZpbGVFeHRlbnNpb24obmFtZSk7XG4gICAgICAgICAgcmV0dXJuIG5hbWUgJiYgZXh0ICYmIG5hbWUuc3RhcnRzV2l0aChcImt1YmVybmV0ZXNcIikgJiYgZXh0ID09PSBcImpzb25cIjtcbiAgICAgICAgfSk7XG4gICAgICAgIGlmIChrdWJlcm5ldGVzSnNvbikge1xuICAgICAgICAgIHdpa2lSZXBvc2l0b3J5LmdldFBhZ2UoJHNjb3BlLmJyYW5jaCwga3ViZXJuZXRlc0pzb24ucGF0aCwgdW5kZWZpbmVkLCAoanNvbikgPT4ge1xuICAgICAgICAgICAgaWYgKGpzb24gJiYganNvbi50ZXh0KSB7XG4gICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgJHNjb3BlLmt1YmVybmV0ZXNKc29uID0gYW5ndWxhci5mcm9tSnNvbihqc29uLnRleHQpO1xuICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgJHNjb3BlLmt1YmVybmV0ZXNKc29uID0ge1xuICAgICAgICAgICAgICAgICAgZXJyb3JQYXJzaW5nOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgZXJyb3I6IGVcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICRzY29wZS5zaG93QXBwSGVhZGVyID0gdHJ1ZTtcbiAgICAgICAgICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICAkc2NvcGUuJGJyb2FkY2FzdCgnV2lraS5WaWV3UGFnZS5DaGlsZHJlbicsICRzY29wZS5wYWdlSWQsICRzY29wZS5jaGlsZHJlbik7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAkc2NvcGUuJGJyb2FkY2FzdCgncGFuZS5jbG9zZScpO1xuICAgICAgICB2YXIgcGFnZU5hbWUgPSAkc2NvcGUucGFnZUlkO1xuICAgICAgICB2aWV3Q29udGVudHMocGFnZU5hbWUsIGNvbnRlbnRzKTtcbiAgICAgICAgJHNjb3BlLmlzRmlsZSA9IHRydWU7XG4gICAgICB9XG4gICAgICBDb3JlLiRhcHBseSgkc2NvcGUpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGNoZWNrRmlsZUV4aXN0cyhwYXRoKSB7XG4gICAgICAkc2NvcGUub3BlcmF0aW9uQ291bnRlciArPSAxO1xuICAgICAgdmFyIGNvdW50ZXIgPSAkc2NvcGUub3BlcmF0aW9uQ291bnRlcjtcbiAgICAgIGlmIChwYXRoKSB7XG4gICAgICAgIHdpa2lSZXBvc2l0b3J5LmV4aXN0cygkc2NvcGUuYnJhbmNoLCBwYXRoLCAocmVzdWx0KSA9PiB7XG4gICAgICAgICAgLy8gZmlsdGVyIG9sZCByZXN1bHRzXG4gICAgICAgICAgaWYgKCRzY29wZS5vcGVyYXRpb25Db3VudGVyID09PSBjb3VudGVyKSB7XG4gICAgICAgICAgICBsb2cuZGVidWcoXCJjaGVja0ZpbGVFeGlzdHMgZm9yIHBhdGggXCIgKyBwYXRoICsgXCIgZ290IHJlc3VsdCBcIiArIHJlc3VsdCk7XG4gICAgICAgICAgICAkc2NvcGUuZmlsZUV4aXN0cy5leGlzdHMgPSByZXN1bHQgPyB0cnVlIDogZmFsc2U7XG4gICAgICAgICAgICAkc2NvcGUuZmlsZUV4aXN0cy5uYW1lID0gcmVzdWx0ID8gcmVzdWx0Lm5hbWUgOiBudWxsO1xuICAgICAgICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gbG9nLmRlYnVnKFwiSWdub3Jpbmcgb2xkIHJlc3VsdHMgZm9yIFwiICsgcGF0aCk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBDYWxsZWQgYnkgaGF3dGlvIFRPQyBkaXJlY3RpdmUuLi5cbiAgICAkc2NvcGUuZ2V0Q29udGVudHMgPSAoZmlsZW5hbWUsIGNiKSA9PiB7XG4gICAgICB2YXIgcGFnZUlkID0gZmlsZW5hbWU7XG4gICAgICBpZiAoJHNjb3BlLmRpcmVjdG9yeSkge1xuICAgICAgICBwYWdlSWQgPSAkc2NvcGUucGFnZUlkICsgJy8nICsgZmlsZW5hbWU7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgcGF0aFBhcnRzID0gJHNjb3BlLnBhZ2VJZC5zcGxpdCgnLycpO1xuICAgICAgICBwYXRoUGFydHMgPSBwYXRoUGFydHMucmVtb3ZlKHBhdGhQYXJ0cy5sYXN0KCkpO1xuICAgICAgICBwYXRoUGFydHMucHVzaChmaWxlbmFtZSk7XG4gICAgICAgIHBhZ2VJZCA9IHBhdGhQYXJ0cy5qb2luKCcvJyk7XG4gICAgICB9XG4gICAgICBsb2cuZGVidWcoXCJwYWdlSWQ6IFwiLCAkc2NvcGUucGFnZUlkKTtcbiAgICAgIGxvZy5kZWJ1ZyhcImJyYW5jaDogXCIsICRzY29wZS5icmFuY2gpO1xuICAgICAgbG9nLmRlYnVnKFwiZmlsZW5hbWU6IFwiLCBmaWxlbmFtZSk7XG4gICAgICBsb2cuZGVidWcoXCJ1c2luZyBwYWdlSWQ6IFwiLCBwYWdlSWQpO1xuICAgICAgd2lraVJlcG9zaXRvcnkuZ2V0UGFnZSgkc2NvcGUuYnJhbmNoLCBwYWdlSWQsIHVuZGVmaW5lZCwgKGRhdGEpID0+IHtcbiAgICAgICAgY2IoZGF0YS50ZXh0KTtcbiAgICAgIH0pO1xuICAgIH07XG5cblxuICAgIGZ1bmN0aW9uIGdldFJlbmFtZUZpbGVQYXRoKCkge1xuICAgICAgdmFyIG5ld0ZpbGVOYW1lID0gJHNjb3BlLnJlbmFtZS5uZXdGaWxlTmFtZTtcbiAgICAgIHJldHVybiAoJHNjb3BlLnBhZ2VJZCAmJiBuZXdGaWxlTmFtZSkgPyBVcmxIZWxwZXJzLmpvaW4oJHNjb3BlLnBhZ2VJZCwgbmV3RmlsZU5hbWUpIDogbnVsbDtcbiAgICB9XG4gIH1dKTtcbn1cbiIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9pbmNsdWRlcy50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJ3aWtpSGVscGVycy50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJ3aWtpUGx1Z2luLnRzXCIvPlxuXG5tb2R1bGUgV2lraSB7XG5cbiAgZXhwb3J0IGludGVyZmFjZSBXaWtpRGlhbG9nIHtcbiAgICBvcGVuOiAoKSA9PiB7fTtcbiAgICBjbG9zZTogKCkgPT4ge307XG4gIH1cblxuICBleHBvcnQgaW50ZXJmYWNlIFJlbmFtZURpYWxvZ09wdGlvbnMge1xuICAgIHJlbmFtZTogKCkgPT4ge307XG4gICAgZmlsZUV4aXN0czogKCkgPT4ge307XG4gICAgZmlsZU5hbWU6ICgpID0+IFN0cmluZztcbiAgICBjYWxsYmFja3M6ICgpID0+IFN0cmluZztcbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiBnZXRSZW5hbWVEaWFsb2coJGRpYWxvZywgJHNjb3BlOlJlbmFtZURpYWxvZ09wdGlvbnMpOldpa2kuV2lraURpYWxvZyB7XG4gICAgcmV0dXJuICRkaWFsb2cuZGlhbG9nKHtcbiAgICAgIHJlc29sdmU6ICRzY29wZSxcbiAgICAgIHRlbXBsYXRlVXJsOiAncGx1Z2lucy93aWtpL2h0bWwvbW9kYWwvcmVuYW1lRGlhbG9nLmh0bWwnLFxuICAgICAgY29udHJvbGxlcjogW1wiJHNjb3BlXCIsIFwiZGlhbG9nXCIsICBcImNhbGxiYWNrc1wiLCBcInJlbmFtZVwiLCBcImZpbGVFeGlzdHNcIiwgXCJmaWxlTmFtZVwiLCAoJHNjb3BlLCBkaWFsb2csIGNhbGxiYWNrcywgcmVuYW1lLCBmaWxlRXhpc3RzLCBmaWxlTmFtZSkgPT4ge1xuICAgICAgICAkc2NvcGUucmVuYW1lICA9IHJlbmFtZTtcbiAgICAgICAgJHNjb3BlLmZpbGVFeGlzdHMgID0gZmlsZUV4aXN0cztcbiAgICAgICAgJHNjb3BlLmZpbGVOYW1lICA9IGZpbGVOYW1lO1xuXG4gICAgICAgICRzY29wZS5jbG9zZSA9IChyZXN1bHQpID0+IHtcbiAgICAgICAgICBkaWFsb2cuY2xvc2UoKTtcbiAgICAgICAgfTtcblxuICAgICAgICAkc2NvcGUucmVuYW1lQW5kQ2xvc2VEaWFsb2cgPSBjYWxsYmFja3M7XG5cbiAgICAgIH1dXG4gICAgfSk7XG4gIH1cblxuICBleHBvcnQgaW50ZXJmYWNlIE1vdmVEaWFsb2dPcHRpb25zIHtcbiAgICBtb3ZlOiAoKSA9PiB7fTtcbiAgICBmb2xkZXJOYW1lczogKCkgPT4ge307XG4gICAgY2FsbGJhY2tzOiAoKSA9PiBTdHJpbmc7XG4gIH1cblxuXG4gIGV4cG9ydCBmdW5jdGlvbiBnZXRNb3ZlRGlhbG9nKCRkaWFsb2csICRzY29wZTpNb3ZlRGlhbG9nT3B0aW9ucyk6V2lraS5XaWtpRGlhbG9nIHtcbiAgICByZXR1cm4gJGRpYWxvZy5kaWFsb2coe1xuICAgICAgcmVzb2x2ZTogJHNjb3BlLFxuICAgICAgdGVtcGxhdGVVcmw6ICdwbHVnaW5zL3dpa2kvaHRtbC9tb2RhbC9tb3ZlRGlhbG9nLmh0bWwnLFxuICAgICAgY29udHJvbGxlcjogW1wiJHNjb3BlXCIsIFwiZGlhbG9nXCIsICBcImNhbGxiYWNrc1wiLCBcIm1vdmVcIiwgXCJmb2xkZXJOYW1lc1wiLCAoJHNjb3BlLCBkaWFsb2csIGNhbGxiYWNrcywgbW92ZSwgZm9sZGVyTmFtZXMpID0+IHtcbiAgICAgICAgJHNjb3BlLm1vdmUgID0gbW92ZTtcbiAgICAgICAgJHNjb3BlLmZvbGRlck5hbWVzICA9IGZvbGRlck5hbWVzO1xuXG4gICAgICAgICRzY29wZS5jbG9zZSA9IChyZXN1bHQpID0+IHtcbiAgICAgICAgICBkaWFsb2cuY2xvc2UoKTtcbiAgICAgICAgfTtcblxuICAgICAgICAkc2NvcGUubW92ZUFuZENsb3NlRGlhbG9nID0gY2FsbGJhY2tzO1xuXG4gICAgICB9XVxuICAgIH0pO1xuICB9XG5cblxuICBleHBvcnQgaW50ZXJmYWNlIERlbGV0ZURpYWxvZ09wdGlvbnMge1xuICAgIGNhbGxiYWNrczogKCkgPT4gU3RyaW5nO1xuICAgIHNlbGVjdGVkRmlsZUh0bWw6ICgpID0+IFN0cmluZztcbiAgICB3YXJuaW5nOiAoKSA9PiBzdHJpbmc7XG4gIH1cblxuXG4gIGV4cG9ydCBmdW5jdGlvbiBnZXREZWxldGVEaWFsb2coJGRpYWxvZywgJHNjb3BlOkRlbGV0ZURpYWxvZ09wdGlvbnMpOldpa2kuV2lraURpYWxvZyB7XG4gICAgcmV0dXJuICRkaWFsb2cuZGlhbG9nKHtcbiAgICAgIHJlc29sdmU6ICRzY29wZSxcbiAgICAgIHRlbXBsYXRlVXJsOiAncGx1Z2lucy93aWtpL2h0bWwvbW9kYWwvZGVsZXRlRGlhbG9nLmh0bWwnLFxuICAgICAgY29udHJvbGxlcjogW1wiJHNjb3BlXCIsIFwiZGlhbG9nXCIsICBcImNhbGxiYWNrc1wiLCBcInNlbGVjdGVkRmlsZUh0bWxcIiwgXCJ3YXJuaW5nXCIsICgkc2NvcGUsIGRpYWxvZywgY2FsbGJhY2tzLCBzZWxlY3RlZEZpbGVIdG1sLCB3YXJuaW5nKSA9PiB7XG5cbiAgICAgICAgJHNjb3BlLnNlbGVjdGVkRmlsZUh0bWwgPSBzZWxlY3RlZEZpbGVIdG1sO1xuXG4gICAgICAgICRzY29wZS5jbG9zZSA9IChyZXN1bHQpID0+IHtcbiAgICAgICAgICBkaWFsb2cuY2xvc2UoKTtcbiAgICAgICAgfTtcblxuICAgICAgICAkc2NvcGUuZGVsZXRlQW5kQ2xvc2VEaWFsb2cgPSBjYWxsYmFja3M7XG5cbiAgICAgICAgJHNjb3BlLndhcm5pbmcgPSB3YXJuaW5nO1xuICAgICAgfV1cbiAgICB9KTtcbiAgfVxuXG5cblxuXG5cbn0iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vaW5jbHVkZXMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwid2lraUhlbHBlcnMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwid2lraVBsdWdpbi50c1wiLz5cblxubW9kdWxlIFdpa2kge1xuXG4gIF9tb2R1bGUuZGlyZWN0aXZlKCd3aWtpSHJlZkFkanVzdGVyJywgW1wiJGxvY2F0aW9uXCIsICgkbG9jYXRpb24pID0+IHtcbiAgICByZXR1cm4ge1xuICAgICAgcmVzdHJpY3Q6ICdBJyxcbiAgICAgIGxpbms6ICgkc2NvcGUsICRlbGVtZW50LCAkYXR0cikgPT4ge1xuXG4gICAgICAgICRlbGVtZW50LmJpbmQoJ0RPTU5vZGVJbnNlcnRlZCcsIChldmVudCkgPT4ge1xuICAgICAgICAgIHZhciBheXMgPSAkZWxlbWVudC5maW5kKCdhJyk7XG4gICAgICAgICAgYW5ndWxhci5mb3JFYWNoKGF5cywgKGEpID0+IHtcbiAgICAgICAgICAgIGlmIChhLmhhc0F0dHJpYnV0ZSgnbm8tYWRqdXN0JykpIHtcbiAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYSA9ICQoYSk7XG4gICAgICAgICAgICB2YXIgaHJlZiA9IChhLmF0dHIoJ2hyZWYnKSB8fCBcIlwiKS50cmltKCk7XG4gICAgICAgICAgICBpZiAoaHJlZikge1xuICAgICAgICAgICAgICB2YXIgZmlsZUV4dGVuc2lvbiA9IGEuYXR0cignZmlsZS1leHRlbnNpb24nKTtcbiAgICAgICAgICAgICAgdmFyIG5ld1ZhbHVlID0gV2lraS5hZGp1c3RIcmVmKCRzY29wZSwgJGxvY2F0aW9uLCBocmVmLCBmaWxlRXh0ZW5zaW9uKTtcbiAgICAgICAgICAgICAgaWYgKG5ld1ZhbHVlKSB7XG4gICAgICAgICAgICAgICAgYS5hdHRyKCdocmVmJywgbmV3VmFsdWUpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgdmFyIGltZ3MgPSAkZWxlbWVudC5maW5kKCdpbWcnKTtcbiAgICAgICAgICBhbmd1bGFyLmZvckVhY2goaW1ncywgKGEpID0+IHtcbiAgICAgICAgICAgIGlmIChhLmhhc0F0dHJpYnV0ZSgnbm8tYWRqdXN0JykpIHtcbiAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYSA9ICQoYSk7XG4gICAgICAgICAgICB2YXIgaHJlZiA9IChhLmF0dHIoJ3NyYycpIHx8IFwiXCIpLnRyaW0oKTtcbiAgICAgICAgICAgIGlmIChocmVmKSB7XG4gICAgICAgICAgICAgIGlmIChocmVmLnN0YXJ0c1dpdGgoXCIvXCIpKSB7XG4gICAgICAgICAgICAgICAgaHJlZiA9IENvcmUudXJsKGhyZWYpO1xuICAgICAgICAgICAgICAgIGEuYXR0cignc3JjJywgaHJlZik7XG5cbiAgICAgICAgICAgICAgICAvLyBsZXRzIGF2b2lkIHRoaXMgZWxlbWVudCBiZWluZyByZXByb2Nlc3NlZFxuICAgICAgICAgICAgICAgIGEuYXR0cignbm8tYWRqdXN0JywgJ3RydWUnKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICB9KVxuICAgICAgfVxuICAgIH1cbiAgfV0pO1xuXG4gIF9tb2R1bGUuZGlyZWN0aXZlKCd3aWtpVGl0bGVMaW5rZXInLCBbXCIkbG9jYXRpb25cIiwgKCRsb2NhdGlvbikgPT4ge1xuICAgIHJldHVybiB7XG4gICAgICByZXN0cmljdDogJ0EnLFxuICAgICAgbGluazogKCRzY29wZSwgJGVsZW1lbnQsICRhdHRyKSA9PiB7XG4gICAgICAgIHZhciBsb2FkZWQgPSBmYWxzZTtcblxuICAgICAgICBmdW5jdGlvbiBvZmZzZXRUb3AoZWxlbWVudHMpIHtcbiAgICAgICAgICBpZiAoZWxlbWVudHMpIHtcbiAgICAgICAgICAgIHZhciBvZmZzZXQgPSBlbGVtZW50cy5vZmZzZXQoKTtcbiAgICAgICAgICAgIGlmIChvZmZzZXQpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIG9mZnNldC50b3A7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiAwO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gc2Nyb2xsVG9IYXNoKCkge1xuICAgICAgICAgIHZhciBhbnN3ZXIgPSBmYWxzZTtcbiAgICAgICAgICB2YXIgaWQgPSAkbG9jYXRpb24uc2VhcmNoKClbXCJoYXNoXCJdO1xuICAgICAgICAgIHJldHVybiBzY3JvbGxUb0lkKGlkKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIHNjcm9sbFRvSWQoaWQpIHtcbiAgICAgICAgICB2YXIgYW5zd2VyID0gZmFsc2U7XG4gICAgICAgICAgdmFyIGlkID0gJGxvY2F0aW9uLnNlYXJjaCgpW1wiaGFzaFwiXTtcbiAgICAgICAgICBpZiAoaWQpIHtcbiAgICAgICAgICAgIHZhciBzZWxlY3RvciA9ICdhW25hbWU9XCInICsgaWQgKyAnXCJdJztcbiAgICAgICAgICAgIHZhciB0YXJnZXRFbGVtZW50cyA9ICRlbGVtZW50LmZpbmQoc2VsZWN0b3IpO1xuICAgICAgICAgICAgaWYgKHRhcmdldEVsZW1lbnRzICYmIHRhcmdldEVsZW1lbnRzLmxlbmd0aCkge1xuICAgICAgICAgICAgICB2YXIgc2Nyb2xsRHVyYXRpb24gPSAxO1xuICAgICAgICAgICAgICB2YXIgZGVsdGEgPSBvZmZzZXRUb3AoJCgkZWxlbWVudCkpO1xuICAgICAgICAgICAgICB2YXIgdG9wID0gb2Zmc2V0VG9wKHRhcmdldEVsZW1lbnRzKSAtIGRlbHRhO1xuICAgICAgICAgICAgICBpZiAodG9wIDwgMCkge1xuICAgICAgICAgICAgICAgIHRvcCA9IDA7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgLy9sb2cuaW5mbyhcInNjcm9sbGluZyB0byBoYXNoOiBcIiArIGlkICsgXCIgdG9wOiBcIiArIHRvcCArIFwiIGRlbHRhOlwiICsgZGVsdGEpO1xuICAgICAgICAgICAgICAkKCdib2R5LGh0bWwnKS5hbmltYXRlKHtcbiAgICAgICAgICAgICAgICBzY3JvbGxUb3A6IHRvcFxuICAgICAgICAgICAgICB9LCBzY3JvbGxEdXJhdGlvbik7XG4gICAgICAgICAgICAgIGFuc3dlciA9IHRydWU7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAvL2xvZy5pbmZvKFwiY291bGQgZmluZCBlbGVtZW50IGZvcjogXCIgKyBzZWxlY3Rvcik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiBhbnN3ZXI7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBhZGRMaW5rcyhldmVudCkge1xuICAgICAgICAgIHZhciBoZWFkaW5ncyA9ICRlbGVtZW50LmZpbmQoJ2gxLGgyLGgzLGg0LGg1LGg2LGg3Jyk7XG4gICAgICAgICAgdmFyIHVwZGF0ZWQgPSBmYWxzZTtcbiAgICAgICAgICBhbmd1bGFyLmZvckVhY2goaGVhZGluZ3MsIChoZSkgPT4ge1xuICAgICAgICAgICAgdmFyIGgxID0gJChoZSk7XG4gICAgICAgICAgICAvLyBub3cgbGV0cyB0cnkgZmluZCBhIGNoaWxkIGhlYWRlclxuICAgICAgICAgICAgdmFyIGEgPSBoMS5wYXJlbnQoXCJhXCIpO1xuICAgICAgICAgICAgaWYgKCFhIHx8ICFhLmxlbmd0aCkge1xuICAgICAgICAgICAgICB2YXIgdGV4dCA9IGgxLnRleHQoKTtcbiAgICAgICAgICAgICAgaWYgKHRleHQpIHtcbiAgICAgICAgICAgICAgICB2YXIgdGFyZ2V0ID0gdGV4dC5yZXBsYWNlKC8gL2csIFwiLVwiKTtcbiAgICAgICAgICAgICAgICB2YXIgcGF0aFdpdGhIYXNoID0gXCIjXCIgKyAkbG9jYXRpb24ucGF0aCgpICsgXCI/aGFzaD1cIiArIHRhcmdldDtcbiAgICAgICAgICAgICAgICB2YXIgbGluayA9IENvcmUuY3JlYXRlSHJlZigkbG9jYXRpb24sIHBhdGhXaXRoSGFzaCwgWydoYXNoJ10pO1xuXG4gICAgICAgICAgICAgICAgLy8gbGV0cyB3cmFwIHRoZSBoZWFkaW5nIGluIGEgbGlua1xuICAgICAgICAgICAgICAgIHZhciBuZXdBID0gJCgnPGEgbmFtZT1cIicgKyB0YXJnZXQgKyAnXCIgaHJlZj1cIicgKyBsaW5rICsgJ1wiIG5nLWNsaWNrPVwib25MaW5rQ2xpY2soKVwiPjwvYT4nKTtcbiAgICAgICAgICAgICAgICBuZXdBLm9uKFwiY2xpY2tcIiwgKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChzY3JvbGxUb0lkKHRhcmdldCkpIHtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgfSwgNTApO1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgbmV3QS5pbnNlcnRCZWZvcmUoaDEpO1xuICAgICAgICAgICAgICAgIGgxLmRldGFjaCgpO1xuICAgICAgICAgICAgICAgIG5ld0EuYXBwZW5kKGgxKTtcbiAgICAgICAgICAgICAgICB1cGRhdGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICAgIGlmICh1cGRhdGVkICYmICFsb2FkZWQpIHtcbiAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICBpZiAoc2Nyb2xsVG9IYXNoKCkpIHtcbiAgICAgICAgICAgICAgICBsb2FkZWQgPSB0cnVlO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LCA1MCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gb25FdmVudEluc2VydGVkKGV2ZW50KSB7XG4gICAgICAgICAgLy8gYXZvaWQgYW55IG1vcmUgZXZlbnRzIHdoaWxlIHdlIGRvIG91ciB0aGluZ1xuICAgICAgICAgICRlbGVtZW50LnVuYmluZCgnRE9NTm9kZUluc2VydGVkJywgb25FdmVudEluc2VydGVkKTtcbiAgICAgICAgICBhZGRMaW5rcyhldmVudCk7XG4gICAgICAgICAgJGVsZW1lbnQuYmluZCgnRE9NTm9kZUluc2VydGVkJywgb25FdmVudEluc2VydGVkKTtcbiAgICAgICAgfVxuXG4gICAgICAgICRlbGVtZW50LmJpbmQoJ0RPTU5vZGVJbnNlcnRlZCcsIG9uRXZlbnRJbnNlcnRlZCk7XG4gICAgICB9XG4gICAgfTtcbiAgfV0pO1xuXG59XG4iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vaW5jbHVkZXMudHNcIi8+XG5cblxuLyoqXG4gKiBAbW9kdWxlIFdpa2lcbiAqL1xubW9kdWxlIFdpa2kge1xuXG4gIERldmVsb3Blci5jdXN0b21Qcm9qZWN0U3ViVGFiRmFjdG9yaWVzLnB1c2goXG4gICAgKGNvbnRleHQpID0+IHtcbiAgICAgIHZhciBwcm9qZWN0TGluayA9IGNvbnRleHQucHJvamVjdExpbms7XG4gICAgICB2YXIgcHJvamVjdE5hbWUgPSBjb250ZXh0LnByb2plY3ROYW1lO1xuICAgICAgdmFyIG93bmVyID0gXCJcIjtcbiAgICAgIHZhciByZXBvTmFtZSA9IFwiXCI7XG4gICAgICBpZiAocHJvamVjdE5hbWUpIHtcbiAgICAgICAgLy8gVE9ETyB0aGlzIGlzIGEgYml0IG9mIGEgaGFjayAtIHdlIHNob3VsZCBleHBvc2UgdGhpcyBhIGJpdCBiZXR0ZXIgc29tZXdoZXJlP1xuICAgICAgICB2YXIgaWR4ID0gcHJvamVjdE5hbWUuaW5kZXhPZignLScpO1xuICAgICAgICBpZiAoaWR4ID4gMCkge1xuICAgICAgICAgIG93bmVyID0gcHJvamVjdE5hbWUuc3Vic3RyaW5nKDAsIGlkeCk7XG4gICAgICAgICAgcmVwb05hbWUgPSBwcm9qZWN0TmFtZS5zdWJzdHJpbmcoaWR4ICsgMSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiB7XG4gICAgICAgIGlzVmFsaWQ6ICgpID0+IHByb2plY3RMaW5rICYmIG93bmVyICYmIHJlcG9OYW1lICYmIERldmVsb3Blci5mb3JnZVJlYWR5TGluaygpLFxuICAgICAgICBocmVmOiBVcmxIZWxwZXJzLmpvaW4ocHJvamVjdExpbmssIFwid2lraVwiLCBvd25lciwgcmVwb05hbWUsIFwidmlld1wiKSxcbiAgICAgICAgbGFiZWw6IFwiU291cmNlXCIsXG4gICAgICAgIHRpdGxlOiBcIkJyb3dzZSB0aGUgc291cmNlIGNvZGUgb2YgdGhpcyBwcm9qZWN0XCJcbiAgICAgIH07XG4gICAgfSk7XG5cblxuICBleHBvcnQgZnVuY3Rpb24gY3JlYXRlU291cmNlQnJlYWRjcnVtYnMoJHNjb3BlKSB7XG4gICAgdmFyIHNvdXJjZUxpbmsgPSAkc2NvcGUuJHZpZXdMaW5rIHx8IFVybEhlbHBlcnMuam9pbihzdGFydExpbmsoJHNjb3BlKSwgXCJ2aWV3XCIpO1xuICAgIHJldHVybiBbXG4gICAgICB7XG4gICAgICAgIGxhYmVsOiBcIlNvdXJjZVwiLFxuICAgICAgICBocmVmOiBzb3VyY2VMaW5rLFxuICAgICAgICB0aXRsZTogXCJCcm93c2UgdGhlIHNvdXJjZSBjb2RlIG9mIHRoaXMgcHJvamVjdFwiXG4gICAgICB9XG4gICAgXVxuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZUVkaXRpbmdCcmVhZGNydW1iKCRzY29wZSkge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgbGFiZWw6IFwiRWRpdGluZ1wiLFxuICAgICAgICB0aXRsZTogXCJFZGl0aW5nIHRoaXMgZmlsZVwiXG4gICAgICB9O1xuICB9XG59XG4iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vaW5jbHVkZXMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwid2lraUhlbHBlcnMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwid2lraVBsdWdpbi50c1wiLz5cblxuLyoqXG4gKiBAbW9kdWxlIFdpa2lcbiAqL1xubW9kdWxlIFdpa2kge1xuXG4gIC8qKlxuICAgKiBAY2xhc3MgR2l0V2lraVJlcG9zaXRvcnlcbiAgICovXG4gIGV4cG9ydCBjbGFzcyBHaXRXaWtpUmVwb3NpdG9yeSB7XG4gICAgcHVibGljIGRpcmVjdG9yeVByZWZpeCA9IFwiXCI7XG4gICAgcHJpdmF0ZSAkaHR0cDtcbiAgICBwcml2YXRlIGNvbmZpZztcbiAgICBwcml2YXRlIGJhc2VVcmw7XG5cblxuICAgIGNvbnN0cnVjdG9yKCRzY29wZSkge1xuICAgICAgdmFyIEZvcmdlQXBpVVJMID0gS3ViZXJuZXRlcy5pbmplY3QoXCJGb3JnZUFwaVVSTFwiKTtcbiAgICAgIHRoaXMuJGh0dHAgPSBLdWJlcm5ldGVzLmluamVjdChcIiRodHRwXCIpO1xuICAgICAgdGhpcy5jb25maWcgPSBGb3JnZS5jcmVhdGVIdHRwQ29uZmlnKCk7XG4gICAgICB2YXIgb3duZXIgPSAkc2NvcGUub3duZXI7XG4gICAgICB2YXIgcmVwb05hbWUgPSAkc2NvcGUucmVwb0lkO1xuICAgICAgdGhpcy5iYXNlVXJsID0gVXJsSGVscGVycy5qb2luKEZvcmdlQXBpVVJMLCBcInJlcG9zL3VzZXJcIiwgb3duZXIsIHJlcG9OYW1lKTtcbiAgICB9XG5cbiAgICBwdWJsaWMgZ2V0UGFnZShicmFuY2g6c3RyaW5nLCBwYXRoOnN0cmluZywgb2JqZWN0SWQ6c3RyaW5nLCBmbikge1xuICAgICAgLy8gVE9ETyBpZ25vcmluZyBvYmplY3RJZFxuICAgICAgdmFyIHF1ZXJ5ID0gbnVsbDtcbiAgICAgIGlmIChicmFuY2gpIHtcbiAgICAgICAgcXVlcnkgPSBcInJlZj1cIiArIGJyYW5jaDtcbiAgICAgIH1cbiAgICAgIHRoaXMuZG9HZXQoVXJsSGVscGVycy5qb2luKFwiY29udGVudFwiLCBwYXRoIHx8IFwiL1wiKSwgcXVlcnksXG4gICAgICAgIChkYXRhLCBzdGF0dXMsIGhlYWRlcnMsIGNvbmZpZykgPT4ge1xuICAgICAgICAgIGlmIChkYXRhKSB7XG4gICAgICAgICAgICB2YXIgZGV0YWlsczogYW55ID0gbnVsbDtcbiAgICAgICAgICAgIGlmIChhbmd1bGFyLmlzQXJyYXkoZGF0YSkpIHtcbiAgICAgICAgICAgICAgYW5ndWxhci5mb3JFYWNoKGRhdGEsIChmaWxlKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKCFmaWxlLmRpcmVjdG9yeSAmJiBmaWxlLnR5cGUgPT09IFwiZGlyXCIpIHtcbiAgICAgICAgICAgICAgICAgIGZpbGUuZGlyZWN0b3J5ID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICBkZXRhaWxzID0ge1xuICAgICAgICAgICAgICAgIGRpcmVjdG9yeTogdHJ1ZSxcbiAgICAgICAgICAgICAgICBjaGlsZHJlbjogZGF0YVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBkZXRhaWxzID0gZGF0YTtcbiAgICAgICAgICAgICAgdmFyIGNvbnRlbnQgPSBkYXRhLmNvbnRlbnQ7XG4gICAgICAgICAgICAgIGlmIChjb250ZW50KSB7XG4gICAgICAgICAgICAgICAgZGV0YWlscy50ZXh0ID0gY29udGVudC5kZWNvZGVCYXNlNjQoKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZm4oZGV0YWlscyk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwdWJsaWMgcHV0UGFnZShicmFuY2g6c3RyaW5nLCBwYXRoOnN0cmluZywgY29udGVudHM6c3RyaW5nLCBjb21taXRNZXNzYWdlOnN0cmluZywgZm4pIHtcbiAgICAgIHZhciBxdWVyeSA9IG51bGw7XG4gICAgICBpZiAoYnJhbmNoKSB7XG4gICAgICAgIHF1ZXJ5ID0gXCJyZWY9XCIgKyBicmFuY2g7XG4gICAgICB9XG4gICAgICBpZiAoY29tbWl0TWVzc2FnZSkge1xuICAgICAgICBxdWVyeSA9IChxdWVyeSA/IHF1ZXJ5ICsgXCImXCIgOiBcIlwiKSArIFwibWVzc2FnZT1cIiArIGVuY29kZVVSSUNvbXBvbmVudChjb21taXRNZXNzYWdlKTtcbiAgICAgIH1cbiAgICAgIHZhciBib2R5ID0gY29udGVudHM7XG4gICAgICB0aGlzLmRvUG9zdChVcmxIZWxwZXJzLmpvaW4oXCJjb250ZW50XCIsIHBhdGggfHwgXCIvXCIpLCBxdWVyeSwgYm9keSxcbiAgICAgICAgKGRhdGEsIHN0YXR1cywgaGVhZGVycywgY29uZmlnKSA9PiB7XG4gICAgICAgICAgZm4oZGF0YSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFJldHVybiB0aGUgaGlzdG9yeSBvZiB0aGUgcmVwb3NpdG9yeSBvciBhIHNwZWNpZmljIGRpcmVjdG9yeSBvciBmaWxlIHBhdGhcbiAgICAgKiBAbWV0aG9kIGhpc3RvcnlcbiAgICAgKiBAZm9yIEdpdFdpa2lSZXBvc2l0b3J5XG4gICAgICogQHBhcmFtIHtTdHJpbmd9IGJyYW5jaFxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBvYmplY3RJZFxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoXG4gICAgICogQHBhcmFtIHtOdW1iZXJ9IGxpbWl0XG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gZm5cbiAgICAgKiBAcmV0dXJuIHthbnl9XG4gICAgICovXG4gICAgcHVibGljIGhpc3RvcnkoYnJhbmNoOnN0cmluZywgb2JqZWN0SWQ6c3RyaW5nLCBwYXRoOnN0cmluZywgbGltaXQ6bnVtYmVyLCBmbikge1xuICAgICAgdmFyIHF1ZXJ5ID0gbnVsbDtcbiAgICAgIGlmIChicmFuY2gpIHtcbiAgICAgICAgcXVlcnkgPSBcInJlZj1cIiArIGJyYW5jaDtcbiAgICAgIH1cbiAgICAgIGlmIChsaW1pdCkge1xuICAgICAgICBxdWVyeSA9IChxdWVyeSA/IHF1ZXJ5ICsgXCImXCIgOiBcIlwiKSArIFwibGltaXQ9XCIgKyBsaW1pdDtcbiAgICAgIH1cbiAgICAgIHZhciBjb21taXRJZCA9IG9iamVjdElkIHx8IGJyYW5jaDtcbiAgICAgIHRoaXMuZG9HZXQoVXJsSGVscGVycy5qb2luKFwiaGlzdG9yeVwiLCBjb21taXRJZCwgcGF0aCksIHF1ZXJ5LFxuICAgICAgICAoZGF0YSwgc3RhdHVzLCBoZWFkZXJzLCBjb25maWcpID0+IHtcbiAgICAgICAgICBmbihkYXRhKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcHVibGljIGNvbW1pdEluZm8oY29tbWl0SWQ6c3RyaW5nLCBmbikge1xuICAgICAgdmFyIHF1ZXJ5ID0gbnVsbDtcbiAgICAgIHRoaXMuZG9HZXQoVXJsSGVscGVycy5qb2luKFwiY29tbWl0SW5mb1wiLCBjb21taXRJZCksIHF1ZXJ5LFxuICAgICAgICAoZGF0YSwgc3RhdHVzLCBoZWFkZXJzLCBjb25maWcpID0+IHtcbiAgICAgICAgICBmbihkYXRhKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcHVibGljIGNvbW1pdFRyZWUoY29tbWl0SWQ6c3RyaW5nLCBmbikge1xuICAgICAgdmFyIHF1ZXJ5ID0gbnVsbDtcbiAgICAgIHRoaXMuZG9HZXQoVXJsSGVscGVycy5qb2luKFwiY29tbWl0VHJlZVwiLCBjb21taXRJZCksIHF1ZXJ5LFxuICAgICAgICAoZGF0YSwgc3RhdHVzLCBoZWFkZXJzLCBjb25maWcpID0+IHtcbiAgICAgICAgICBmbihkYXRhKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG5cbiAgICAvKipcbiAgICAgKiBQZXJmb3JtcyBhIGRpZmYgb24gdGhlIHZlcnNpb25zXG4gICAgICogQG1ldGhvZCBkaWZmXG4gICAgICogQGZvciBHaXRXaWtpUmVwb3NpdG9yeVxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBvYmplY3RJZFxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBiYXNlT2JqZWN0SWRcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gcGF0aFxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGZuXG4gICAgICogQHJldHVybiB7YW55fVxuICAgICAqL1xuICAgIHB1YmxpYyBkaWZmKG9iamVjdElkOnN0cmluZywgYmFzZU9iamVjdElkOnN0cmluZywgcGF0aDpzdHJpbmcsIGZuKSB7XG4gICAgICB2YXIgcXVlcnkgPSBudWxsO1xuICAgICAgdmFyIGNvbmZpZzogYW55ID0gRm9yZ2UuY3JlYXRlSHR0cENvbmZpZygpO1xuICAgICAgY29uZmlnLnRyYW5zZm9ybVJlc3BvbnNlID0gKGRhdGEsIGhlYWRlcnNHZXR0ZXIsIHN0YXR1cykgPT4ge1xuICAgICAgICBsb2cuaW5mbyhcImdvdCBkaWZmIGRhdGE6IFwiICsgZGF0YSk7XG4gICAgICAgIHJldHVybiBkYXRhO1xuICAgICAgfTtcbiAgICAgIHRoaXMuZG9HZXQoVXJsSGVscGVycy5qb2luKFwiZGlmZlwiLCBvYmplY3RJZCwgYmFzZU9iamVjdElkLCBwYXRoKSwgcXVlcnksXG4gICAgICAgIChkYXRhLCBzdGF0dXMsIGhlYWRlcnMsIGNvbmZpZykgPT4ge1xuICAgICAgICAgIHZhciBkZXRhaWxzID0ge1xuICAgICAgICAgICAgdGV4dDogZGF0YSxcbiAgICAgICAgICAgIGZvcm1hdDogXCJkaWZmXCIsXG4gICAgICAgICAgICBkaXJlY3Rvcnk6IGZhbHNlXG4gICAgICAgICAgfTtcbiAgICAgICAgICBmbihkZXRhaWxzKTtcbiAgICAgICAgfSxcbiAgICAgICAgbnVsbCwgY29uZmlnKTtcbiAgICB9XG5cblxuICAgIC8qKlxuICAgICAqIEdldCB0aGUgbGlzdCBvZiBicmFuY2hlc1xuICAgICAqIEBtZXRob2QgYnJhbmNoZXNcbiAgICAgKiBAZm9yIEdpdFdpa2lSZXBvc2l0b3J5XG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gZm5cbiAgICAgKiBAcmV0dXJuIHthbnl9XG4gICAgICovXG4gICAgcHVibGljIGJyYW5jaGVzKGZuKSB7XG4gICAgICB2YXIgcXVlcnkgPSBudWxsO1xuICAgICAgdGhpcy5kb0dldChcImxpc3RCcmFuY2hlc1wiLCBxdWVyeSxcbiAgICAgICAgKGRhdGEsIHN0YXR1cywgaGVhZGVycywgY29uZmlnKSA9PiB7XG4gICAgICAgICAgZm4oZGF0YSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHB1YmxpYyBleGlzdHMoYnJhbmNoOnN0cmluZywgcGF0aDpzdHJpbmcsIGZuKTogQm9vbGVhbiB7XG4gICAgICB2YXIgYW5zd2VyID0gZmFsc2U7XG4gICAgICB0aGlzLmdldFBhZ2UoYnJhbmNoLCBwYXRoLCBudWxsLCAoZGF0YSkgPT4ge1xuICAgICAgICBpZiAoZGF0YS5kaXJlY3RvcnkpIHtcbiAgICAgICAgICBpZiAoZGF0YS5jaGlsZHJlbi5sZW5ndGgpIHtcbiAgICAgICAgICAgIGFuc3dlciA9IHRydWU7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGFuc3dlciA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgbG9nLmluZm8oXCJleGlzdHMgXCIgKyBwYXRoICsgXCIgYW5zd2VyID0gXCIgKyBhbnN3ZXIpO1xuICAgICAgICBpZiAoYW5ndWxhci5pc0Z1bmN0aW9uKGZuKSkge1xuICAgICAgICAgIGZuKGFuc3dlcik7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIGFuc3dlcjtcbiAgICB9XG5cbiAgICBwdWJsaWMgcmV2ZXJ0VG8oYnJhbmNoOnN0cmluZywgb2JqZWN0SWQ6c3RyaW5nLCBibG9iUGF0aDpzdHJpbmcsIGNvbW1pdE1lc3NhZ2U6c3RyaW5nLCBmbikge1xuICAgICAgaWYgKCFjb21taXRNZXNzYWdlKSB7XG4gICAgICAgIGNvbW1pdE1lc3NhZ2UgPSBcIlJldmVydGluZyBcIiArIGJsb2JQYXRoICsgXCIgY29tbWl0IFwiICsgKG9iamVjdElkIHx8IGJyYW5jaCk7XG4gICAgICB9XG4gICAgICB2YXIgcXVlcnkgPSBudWxsO1xuICAgICAgaWYgKGJyYW5jaCkge1xuICAgICAgICBxdWVyeSA9IFwicmVmPVwiICsgYnJhbmNoO1xuICAgICAgfVxuICAgICAgaWYgKGNvbW1pdE1lc3NhZ2UpIHtcbiAgICAgICAgcXVlcnkgPSAocXVlcnkgPyBxdWVyeSArIFwiJlwiIDogXCJcIikgKyBcIm1lc3NhZ2U9XCIgKyBlbmNvZGVVUklDb21wb25lbnQoY29tbWl0TWVzc2FnZSk7XG4gICAgICB9XG4gICAgICB2YXIgYm9keSA9IFwiXCI7XG4gICAgICB0aGlzLmRvUG9zdChVcmxIZWxwZXJzLmpvaW4oXCJyZXZlcnRcIiwgb2JqZWN0SWQsIGJsb2JQYXRoIHx8IFwiL1wiKSwgcXVlcnksIGJvZHksXG4gICAgICAgIChkYXRhLCBzdGF0dXMsIGhlYWRlcnMsIGNvbmZpZykgPT4ge1xuICAgICAgICAgIGZuKGRhdGEpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwdWJsaWMgcmVuYW1lKGJyYW5jaDpzdHJpbmcsIG9sZFBhdGg6c3RyaW5nLCAgbmV3UGF0aDpzdHJpbmcsIGNvbW1pdE1lc3NhZ2U6c3RyaW5nLCBmbikge1xuICAgICAgaWYgKCFjb21taXRNZXNzYWdlKSB7XG4gICAgICAgIGNvbW1pdE1lc3NhZ2UgPSBcIlJlbmFtaW5nIHBhZ2UgXCIgKyBvbGRQYXRoICsgXCIgdG8gXCIgKyBuZXdQYXRoO1xuICAgICAgfVxuICAgICAgdmFyIHF1ZXJ5ID0gbnVsbDtcbiAgICAgIGlmIChicmFuY2gpIHtcbiAgICAgICAgcXVlcnkgPSBcInJlZj1cIiArIGJyYW5jaDtcbiAgICAgIH1cbiAgICAgIGlmIChjb21taXRNZXNzYWdlKSB7XG4gICAgICAgIHF1ZXJ5ID0gKHF1ZXJ5ID8gcXVlcnkgKyBcIiZcIiA6IFwiXCIpICsgXCJtZXNzYWdlPVwiICsgZW5jb2RlVVJJQ29tcG9uZW50KGNvbW1pdE1lc3NhZ2UpO1xuICAgICAgfVxuICAgICAgaWYgKG9sZFBhdGgpIHtcbiAgICAgICAgcXVlcnkgPSAocXVlcnkgPyBxdWVyeSArIFwiJlwiIDogXCJcIikgKyBcIm9sZD1cIiArIGVuY29kZVVSSUNvbXBvbmVudChvbGRQYXRoKTtcbiAgICAgIH1cbiAgICAgIHZhciBib2R5ID0gXCJcIjtcbiAgICAgIHRoaXMuZG9Qb3N0KFVybEhlbHBlcnMuam9pbihcIm12XCIsIG5ld1BhdGggfHwgXCIvXCIpLCBxdWVyeSwgYm9keSxcbiAgICAgICAgKGRhdGEsIHN0YXR1cywgaGVhZGVycywgY29uZmlnKSA9PiB7XG4gICAgICAgICAgZm4oZGF0YSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHB1YmxpYyByZW1vdmVQYWdlKGJyYW5jaDpzdHJpbmcsIHBhdGg6c3RyaW5nLCBjb21taXRNZXNzYWdlOnN0cmluZywgZm4pIHtcbiAgICAgIGlmICghY29tbWl0TWVzc2FnZSkge1xuICAgICAgICBjb21taXRNZXNzYWdlID0gXCJSZW1vdmluZyBwYWdlIFwiICsgcGF0aDtcbiAgICAgIH1cbiAgICAgIHZhciBxdWVyeSA9IG51bGw7XG4gICAgICBpZiAoYnJhbmNoKSB7XG4gICAgICAgIHF1ZXJ5ID0gXCJyZWY9XCIgKyBicmFuY2g7XG4gICAgICB9XG4gICAgICBpZiAoY29tbWl0TWVzc2FnZSkge1xuICAgICAgICBxdWVyeSA9IChxdWVyeSA/IHF1ZXJ5ICsgXCImXCIgOiBcIlwiKSArIFwibWVzc2FnZT1cIiArIGVuY29kZVVSSUNvbXBvbmVudChjb21taXRNZXNzYWdlKTtcbiAgICAgIH1cbiAgICAgIHZhciBib2R5ID0gXCJcIjtcbiAgICAgIHRoaXMuZG9Qb3N0KFVybEhlbHBlcnMuam9pbihcInJtXCIsIHBhdGggfHwgXCIvXCIpLCBxdWVyeSwgYm9keSxcbiAgICAgICAgKGRhdGEsIHN0YXR1cywgaGVhZGVycywgY29uZmlnKSA9PiB7XG4gICAgICAgICAgZm4oZGF0YSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHB1YmxpYyByZW1vdmVQYWdlcyhicmFuY2g6c3RyaW5nLCBwYXRoczpBcnJheTxzdHJpbmc+LCBjb21taXRNZXNzYWdlOnN0cmluZywgZm4pIHtcbiAgICAgIGlmICghY29tbWl0TWVzc2FnZSkge1xuICAgICAgICBjb21taXRNZXNzYWdlID0gXCJSZW1vdmluZyBwYWdlXCIgKyAocGF0aHMubGVuZ3RoID4gMSA/IFwic1wiIDogXCJcIikgKyBcIiBcIiArIHBhdGhzLmpvaW4oXCIsIFwiKTtcbiAgICAgIH1cbiAgICAgIHZhciBxdWVyeSA9IG51bGw7XG4gICAgICBpZiAoYnJhbmNoKSB7XG4gICAgICAgIHF1ZXJ5ID0gXCJyZWY9XCIgKyBicmFuY2g7XG4gICAgICB9XG4gICAgICBpZiAoY29tbWl0TWVzc2FnZSkge1xuICAgICAgICBxdWVyeSA9IChxdWVyeSA/IHF1ZXJ5ICsgXCImXCIgOiBcIlwiKSArIFwibWVzc2FnZT1cIiArIGVuY29kZVVSSUNvbXBvbmVudChjb21taXRNZXNzYWdlKTtcbiAgICAgIH1cbiAgICAgIHZhciBib2R5ID0gcGF0aHM7XG4gICAgICB0aGlzLmRvUG9zdChVcmxIZWxwZXJzLmpvaW4oXCJybVwiKSwgcXVlcnksIGJvZHksXG4gICAgICAgIChkYXRhLCBzdGF0dXMsIGhlYWRlcnMsIGNvbmZpZykgPT4ge1xuICAgICAgICAgIGZuKGRhdGEpO1xuICAgICAgICB9KTtcbiAgICB9XG5cblxuXG4gICAgcHJpdmF0ZSBkb0dldChwYXRoLCBxdWVyeSwgc3VjY2Vzc0ZuLCBlcnJvckZuID0gbnVsbCwgY29uZmlnID0gbnVsbCkge1xuICAgICAgdmFyIHVybCA9IEZvcmdlLmNyZWF0ZUh0dHBVcmwoVXJsSGVscGVycy5qb2luKHRoaXMuYmFzZVVybCwgcGF0aCkpO1xuICAgICAgaWYgKHF1ZXJ5KSB7XG4gICAgICAgIHVybCArPSBcIiZcIiArIHF1ZXJ5O1xuICAgICAgfVxuICAgICAgaWYgKCFlcnJvckZuKSB7XG4gICAgICAgIGVycm9yRm4gPSAoZGF0YSwgc3RhdHVzLCBoZWFkZXJzLCBjb25maWcpID0+IHtcbiAgICAgICAgICBsb2cud2FybihcImZhaWxlZCB0byBsb2FkISBcIiArIHVybCArIFwiLiBzdGF0dXM6IFwiICsgc3RhdHVzICsgXCIgZGF0YTogXCIgKyBkYXRhKTtcbiAgICAgICAgfTtcblxuICAgICAgfVxuICAgICAgaWYgKCFjb25maWcpIHtcbiAgICAgICAgY29uZmlnID0gdGhpcy5jb25maWc7XG4gICAgICB9XG4gICAgICB0aGlzLiRodHRwLmdldCh1cmwsIGNvbmZpZykuXG4gICAgICAgIHN1Y2Nlc3Moc3VjY2Vzc0ZuKS5cbiAgICAgICAgZXJyb3IoZXJyb3JGbik7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBkb1Bvc3QocGF0aCwgcXVlcnksIGJvZHksIHN1Y2Nlc3NGbiwgZXJyb3JGbiA9IG51bGwpIHtcbiAgICAgIHZhciB1cmwgPSBGb3JnZS5jcmVhdGVIdHRwVXJsKFVybEhlbHBlcnMuam9pbih0aGlzLmJhc2VVcmwsIHBhdGgpKTtcbiAgICAgIGlmIChxdWVyeSkge1xuICAgICAgICB1cmwgKz0gXCImXCIgKyBxdWVyeTtcbiAgICAgIH1cbiAgICAgIGlmICghZXJyb3JGbikge1xuICAgICAgICBlcnJvckZuID0gKGRhdGEsIHN0YXR1cywgaGVhZGVycywgY29uZmlnKSA9PiB7XG4gICAgICAgICAgbG9nLndhcm4oXCJmYWlsZWQgdG8gbG9hZCEgXCIgKyB1cmwgKyBcIi4gc3RhdHVzOiBcIiArIHN0YXR1cyArIFwiIGRhdGE6IFwiICsgZGF0YSk7XG4gICAgICAgIH07XG5cbiAgICAgIH1cbiAgICAgIHRoaXMuJGh0dHAucG9zdCh1cmwsIGJvZHksIHRoaXMuY29uZmlnKS5cbiAgICAgICAgc3VjY2VzcyhzdWNjZXNzRm4pLlxuICAgICAgICBlcnJvcihlcnJvckZuKTtcbiAgICB9XG5cblxuICAgIHByaXZhdGUgZG9Qb3N0Rm9ybShwYXRoLCBxdWVyeSwgYm9keSwgc3VjY2Vzc0ZuLCBlcnJvckZuID0gbnVsbCkge1xuICAgICAgdmFyIHVybCA9IEZvcmdlLmNyZWF0ZUh0dHBVcmwoVXJsSGVscGVycy5qb2luKHRoaXMuYmFzZVVybCwgcGF0aCkpO1xuICAgICAgaWYgKHF1ZXJ5KSB7XG4gICAgICAgIHVybCArPSBcIiZcIiArIHF1ZXJ5O1xuICAgICAgfVxuICAgICAgaWYgKCFlcnJvckZuKSB7XG4gICAgICAgIGVycm9yRm4gPSAoZGF0YSwgc3RhdHVzLCBoZWFkZXJzLCBjb25maWcpID0+IHtcbiAgICAgICAgICBsb2cud2FybihcImZhaWxlZCB0byBsb2FkISBcIiArIHVybCArIFwiLiBzdGF0dXM6IFwiICsgc3RhdHVzICsgXCIgZGF0YTogXCIgKyBkYXRhKTtcbiAgICAgICAgfTtcblxuICAgICAgfVxuICAgICAgdmFyIGNvbmZpZyA9IEZvcmdlLmNyZWF0ZUh0dHBDb25maWcoKTtcbiAgICAgIGlmICghY29uZmlnLmhlYWRlcnMpIHtcbiAgICAgICAgY29uZmlnLmhlYWRlcnMgPSB7fTtcbiAgICAgIH1cbiAgICAgIGNvbmZpZy5oZWFkZXJzW1wiQ29udGVudC1UeXBlXCJdID0gXCJhcHBsaWNhdGlvbi94LXd3dy1mb3JtLXVybGVuY29kZWQ7IGNoYXJzZXQ9dXRmLThcIjtcblxuICAgICAgdGhpcy4kaHR0cC5wb3N0KHVybCwgYm9keSwgY29uZmlnKS5cbiAgICAgICAgc3VjY2VzcyhzdWNjZXNzRm4pLlxuICAgICAgICBlcnJvcihlcnJvckZuKTtcbiAgICB9XG5cblxuXG4gICAgcHVibGljIGNvbXBsZXRlUGF0aChicmFuY2g6c3RyaW5nLCBjb21wbGV0aW9uVGV4dDpzdHJpbmcsIGRpcmVjdG9yaWVzT25seTpib29sZWFuLCBmbikge1xuLypcbiAgICAgIHJldHVybiB0aGlzLmdpdCgpLmNvbXBsZXRlUGF0aChicmFuY2gsIGNvbXBsZXRpb25UZXh0LCBkaXJlY3Rvcmllc09ubHksIGZuKTtcbiovXG4gICAgfVxuXG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIHRoZSBmdWxsIHBhdGggdG8gdXNlIGluIHRoZSBnaXQgcmVwb1xuICAgICAqIEBtZXRob2QgZ2V0UGF0aFxuICAgICAqIEBmb3IgR2l0V2lraVJlcG9zaXRvcnlcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gcGF0aFxuICAgICAqIEByZXR1cm4ge1N0cmluZ3tcbiAgICAgKi9cbiAgICBwdWJsaWMgZ2V0UGF0aChwYXRoOnN0cmluZykge1xuICAgICAgdmFyIGRpcmVjdG9yeVByZWZpeCA9IHRoaXMuZGlyZWN0b3J5UHJlZml4O1xuICAgICAgcmV0dXJuIChkaXJlY3RvcnlQcmVmaXgpID8gZGlyZWN0b3J5UHJlZml4ICsgcGF0aCA6IHBhdGg7XG4gICAgfVxuXG4gICAgcHVibGljIGdldExvZ1BhdGgocGF0aDpzdHJpbmcpIHtcbiAgICAgIHJldHVybiBDb3JlLnRyaW1MZWFkaW5nKHRoaXMuZ2V0UGF0aChwYXRoKSwgXCIvXCIpO1xuICAgIH1cblxuXG4gICAgLyoqXG4gICAgICogR2V0IHRoZSBjb250ZW50cyBvZiBhIGJsb2JQYXRoIGZvciBhIGdpdmVuIGNvbW1pdCBvYmplY3RJZFxuICAgICAqIEBtZXRob2QgZ2V0Q29udGVudFxuICAgICAqIEBmb3IgR2l0V2lraVJlcG9zaXRvcnlcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gb2JqZWN0SWRcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gYmxvYlBhdGhcbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBmblxuICAgICAqIEByZXR1cm4ge2FueX1cbiAgICAgKi9cbiAgICBwdWJsaWMgZ2V0Q29udGVudChvYmplY3RJZDpzdHJpbmcsIGJsb2JQYXRoOnN0cmluZywgZm4pIHtcbi8qXG4gICAgICB2YXIgZnVsbFBhdGggPSB0aGlzLmdldExvZ1BhdGgoYmxvYlBhdGgpO1xuICAgICAgdmFyIGdpdCA9IHRoaXMuZ2l0KCk7XG4gICAgICBpZiAoZ2l0KSB7XG4gICAgICAgIGdpdC5nZXRDb250ZW50KG9iamVjdElkLCBmdWxsUGF0aCwgZm4pO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGdpdDtcbiovXG4gICAgfVxuXG5cblxuICAgIC8qKlxuICAgICAqIEdldCB0aGUgSlNPTiBjb250ZW50cyBvZiB0aGUgcGF0aCB3aXRoIG9wdGlvbmFsIG5hbWUgd2lsZGNhcmQgYW5kIHNlYXJjaFxuICAgICAqIEBtZXRob2QganNvbkNoaWxkQ29udGVudHNcbiAgICAgKiBAZm9yIEdpdFdpa2lSZXBvc2l0b3J5XG4gICAgICogQHBhcmFtIHtTdHJpbmd9IHBhdGhcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gbmFtZVdpbGRjYXJkXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IHNlYXJjaFxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGZuXG4gICAgICogQHJldHVybiB7YW55fVxuICAgICAqL1xuICAgIHB1YmxpYyBqc29uQ2hpbGRDb250ZW50cyhwYXRoOnN0cmluZywgbmFtZVdpbGRjYXJkOnN0cmluZywgc2VhcmNoOnN0cmluZywgZm4pIHtcbi8qXG4gICAgICB2YXIgZnVsbFBhdGggPSB0aGlzLmdldExvZ1BhdGgocGF0aCk7XG4gICAgICB2YXIgZ2l0ID0gdGhpcy5naXQoKTtcbiAgICAgIGlmIChnaXQpIHtcbiAgICAgICAgZ2l0LnJlYWRKc29uQ2hpbGRDb250ZW50KGZ1bGxQYXRoLCBuYW1lV2lsZGNhcmQsIHNlYXJjaCwgZm4pO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGdpdDtcbiovXG4gICAgfVxuXG5cbiAgICBwdWJsaWMgZ2l0KCkge1xuLypcbiAgICAgIHZhciByZXBvc2l0b3J5ID0gdGhpcy5mYWN0b3J5TWV0aG9kKCk7XG4gICAgICBpZiAoIXJlcG9zaXRvcnkpIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJObyByZXBvc2l0b3J5IHlldCEgVE9ETyB3ZSBzaG91bGQgdXNlIGEgbG9jYWwgaW1wbCFcIik7XG4gICAgICB9XG4gICAgICByZXR1cm4gcmVwb3NpdG9yeTtcbiovXG4gICAgfVxuICB9XG59XG4iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vaW5jbHVkZXMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwid2lraUhlbHBlcnMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwid2lraVBsdWdpbi50c1wiLz5cblxubW9kdWxlIFdpa2kge1xuXG4gIGV4cG9ydCB2YXIgVG9wTGV2ZWxDb250cm9sbGVyID0gX21vZHVsZS5jb250cm9sbGVyKFwiV2lraS5Ub3BMZXZlbENvbnRyb2xsZXJcIiwgWyckc2NvcGUnLCAnJHJvdXRlJywgJyRyb3V0ZVBhcmFtcycsICgkc2NvcGUsICRyb3V0ZSwgJHJvdXRlUGFyYW1zKSA9PiB7XG5cbiAgfV0pO1xuXG59XG4iLCIvLy8gQ29weXJpZ2h0IDIwMTQtMjAxNSBSZWQgSGF0LCBJbmMuIGFuZC9vciBpdHMgYWZmaWxpYXRlc1xuLy8vIGFuZCBvdGhlciBjb250cmlidXRvcnMgYXMgaW5kaWNhdGVkIGJ5IHRoZSBAYXV0aG9yIHRhZ3MuXG4vLy9cbi8vLyBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuLy8vIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbi8vLyBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbi8vL1xuLy8vICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4vLy9cbi8vLyBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4vLy8gZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuLy8vIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuLy8vIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbi8vLyBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cblxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL2luY2x1ZGVzLnRzXCIvPlxubW9kdWxlIE1haW4ge1xuXG4gIGV4cG9ydCB2YXIgcGx1Z2luTmFtZSA9IFwiZmFicmljOC1jb25zb2xlXCI7XG5cbiAgZXhwb3J0IHZhciBsb2c6IExvZ2dpbmcuTG9nZ2VyID0gTG9nZ2VyLmdldChwbHVnaW5OYW1lKTtcblxuICBleHBvcnQgdmFyIHRlbXBsYXRlUGF0aCA9IFwicGx1Z2lucy9tYWluL2h0bWxcIjtcblxuICAvLyBrdWJlcm5ldGVzIHNlcnZpY2UgbmFtZXNcbiAgZXhwb3J0IHZhciBjaGF0U2VydmljZU5hbWUgPSBcImxldHNjaGF0XCI7XG4gIGV4cG9ydCB2YXIgZ3JhZmFuYVNlcnZpY2VOYW1lID0gXCJncmFmYW5hXCI7XG4gIGV4cG9ydCB2YXIgYXBwTGlicmFyeVNlcnZpY2VOYW1lID0gXCJhcHAtbGlicmFyeVwiO1xuXG4gIGV4cG9ydCB2YXIgdmVyc2lvbjphbnkgPSB7fTtcblxufVxuIiwiLy8vIENvcHlyaWdodCAyMDE0LTIwMTUgUmVkIEhhdCwgSW5jLiBhbmQvb3IgaXRzIGFmZmlsaWF0ZXNcbi8vLyBhbmQgb3RoZXIgY29udHJpYnV0b3JzIGFzIGluZGljYXRlZCBieSB0aGUgQGF1dGhvciB0YWdzLlxuLy8vXG4vLy8gTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbi8vLyB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4vLy8gWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4vLy9cbi8vLyAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuLy8vXG4vLy8gVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuLy8vIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbi8vLyBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbi8vLyBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4vLy8gbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9pbmNsdWRlcy50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9mb3JnZS90cy9mb3JnZUhlbHBlcnMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwibWFpbkdsb2JhbHMudHNcIi8+XG5cbm1vZHVsZSBNYWluIHtcblxuICBleHBvcnQgdmFyIF9tb2R1bGUgPSBhbmd1bGFyLm1vZHVsZShwbHVnaW5OYW1lLCBbRm9yZ2UucGx1Z2luTmFtZV0pO1xuXG4gIHZhciB0YWIgPSB1bmRlZmluZWQ7XG5cbiAgX21vZHVsZS5ydW4oKCRyb290U2NvcGUsIEhhd3Rpb05hdjogSGF3dGlvTWFpbk5hdi5SZWdpc3RyeSwgS3ViZXJuZXRlc01vZGVsLCBTZXJ2aWNlUmVnaXN0cnksIHByZWZlcmVuY2VzUmVnaXN0cnkpID0+IHtcblxuICAgIEhhd3Rpb05hdi5vbihIYXd0aW9NYWluTmF2LkFjdGlvbnMuQ0hBTkdFRCwgcGx1Z2luTmFtZSwgKGl0ZW1zKSA9PiB7XG4gICAgICBpdGVtcy5mb3JFYWNoKChpdGVtKSA9PiB7XG4gICAgICAgIHN3aXRjaChpdGVtLmlkKSB7XG4gICAgICAgICAgY2FzZSAnZm9yZ2UnOlxuICAgICAgICAgIGNhc2UgJ2p2bSc6XG4gICAgICAgICAgY2FzZSAnd2lraSc6XG4gICAgICAgICAgY2FzZSAnZG9ja2VyLXJlZ2lzdHJ5JzpcbiAgICAgICAgICAgIGl0ZW0uaXNWYWxpZCA9ICgpID0+IGZhbHNlO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9KTtcbiAgICBIYXd0aW9OYXYuYWRkKHtcbiAgICAgIGlkOiAnbGlicmFyeScsXG4gICAgICB0aXRsZTogKCkgPT4gJ0xpYnJhcnknLFxuICAgICAgdG9vbHRpcDogKCkgPT4gJ1ZpZXcgdGhlIGxpYnJhcnkgb2YgYXBwbGljYXRpb25zJyxcbiAgICAgIGlzVmFsaWQ6ICgpID0+IFNlcnZpY2VSZWdpc3RyeS5oYXNTZXJ2aWNlKGFwcExpYnJhcnlTZXJ2aWNlTmFtZSkgJiYgU2VydmljZVJlZ2lzdHJ5Lmhhc1NlcnZpY2UoXCJhcHAtbGlicmFyeS1qb2xva2lhXCIpLFxuICAgICAgaHJlZjogKCkgPT4gXCIvd2lraS92aWV3XCIsXG4gICAgICBpc0FjdGl2ZTogKCkgPT4gZmFsc2VcbiAgICB9KTtcblxuICAgIHZhciBraWJhbmFTZXJ2aWNlTmFtZSA9IEt1YmVybmV0ZXMua2liYW5hU2VydmljZU5hbWU7XG5cbiAgICBIYXd0aW9OYXYuYWRkKHtcbiAgICAgIGlkOiAna2liYW5hJyxcbiAgICAgIHRpdGxlOiAoKSA9PiAgJ0xvZ3MnLFxuICAgICAgdG9vbHRpcDogKCkgPT4gJ1ZpZXcgYW5kIHNlYXJjaCBhbGwgbG9ncyBhY3Jvc3MgYWxsIGNvbnRhaW5lcnMgdXNpbmcgS2liYW5hIGFuZCBFbGFzdGljU2VhcmNoJyxcbiAgICAgIGlzVmFsaWQ6ICgpID0+IFNlcnZpY2VSZWdpc3RyeS5oYXNTZXJ2aWNlKGtpYmFuYVNlcnZpY2VOYW1lKSxcbiAgICAgIGhyZWY6ICgpID0+IEt1YmVybmV0ZXMua2liYW5hTG9nc0xpbmsoU2VydmljZVJlZ2lzdHJ5KSxcbiAgICAgIGlzQWN0aXZlOiAoKSA9PiBmYWxzZVxuICAgIH0pO1xuXG4gICAgSGF3dGlvTmF2LmFkZCh7XG4gICAgICBpZDogJ2FwaW1hbicsXG4gICAgICB0aXRsZTogKCkgPT4gJ0FQSSBNYW5hZ2VtZW50JyxcbiAgICAgIHRvb2x0aXA6ICgpID0+ICdBZGQgUG9saWNpZXMgYW5kIFBsYW5zIHRvIHlvdXIgQVBJcyB3aXRoIEFwaW1hbicsXG4gICAgICBpc1ZhbGlkOiAoKSA9PiBTZXJ2aWNlUmVnaXN0cnkuaGFzU2VydmljZSgnYXBpbWFuJyksXG4gICAgICBvbGRIcmVmOiAoKSA9PiB7IC8qIG5vdGhpbmcgdG8gZG8gKi8gfSxcbiAgICAgIGhyZWY6ICgpID0+IHtcbiAgICAgICAgdmFyIGhhc2ggPSB7XG4gICAgICAgICAgYmFja1RvOiBuZXcgVVJJKCkudG9TdHJpbmcoKSxcbiAgICAgICAgICB0b2tlbjogSGF3dGlvT0F1dGguZ2V0T0F1dGhUb2tlbigpXG4gICAgICAgIH07XG4gICAgICAgIHZhciB1cmkgPSBuZXcgVVJJKFNlcnZpY2VSZWdpc3RyeS5zZXJ2aWNlTGluaygnYXBpbWFuJykpO1xuICAgICAgICAvLyBUT0RPIGhhdmUgdG8gb3ZlcndyaXRlIHRoZSBwb3J0IGhlcmUgZm9yIHNvbWUgcmVhc29uXG4gICAgICAgICg8YW55PnVyaS5wb3J0KCc4MCcpLnF1ZXJ5KHt9KS5wYXRoKCdhcGltYW51aS9pbmRleC5odG1sJykpLmhhc2goVVJJLmVuY29kZShhbmd1bGFyLnRvSnNvbihoYXNoKSkpO1xuICAgICAgICByZXR1cm4gdXJpLnRvU3RyaW5nKCk7XG4gICAgICB9ICAgIFxuICAgIH0pO1xuXG4gICAgSGF3dGlvTmF2LmFkZCh7XG4gICAgICBpZDogJ2dyYWZhbmEnLFxuICAgICAgdGl0bGU6ICgpID0+ICAnTWV0cmljcycsXG4gICAgICB0b29sdGlwOiAoKSA9PiAnVmlld3MgbWV0cmljcyBhY3Jvc3MgYWxsIGNvbnRhaW5lcnMgdXNpbmcgR3JhZmFuYSBhbmQgSW5mbHV4REInLFxuICAgICAgaXNWYWxpZDogKCkgPT4gU2VydmljZVJlZ2lzdHJ5Lmhhc1NlcnZpY2UoZ3JhZmFuYVNlcnZpY2VOYW1lKSxcbiAgICAgIGhyZWY6ICgpID0+IFNlcnZpY2VSZWdpc3RyeS5zZXJ2aWNlTGluayhncmFmYW5hU2VydmljZU5hbWUpLFxuICAgICAgaXNBY3RpdmU6ICgpID0+IGZhbHNlXG4gICAgfSk7XG5cbiAgICBIYXd0aW9OYXYuYWRkKHtcbiAgICAgIGlkOiBcImNoYXRcIixcbiAgICAgIHRpdGxlOiAoKSA9PiAgJ0NoYXQnLFxuICAgICAgdG9vbHRpcDogKCkgPT4gJ0NoYXQgcm9vbSBmb3IgZGlzY3Vzc2luZyB0aGlzIG5hbWVzcGFjZScsXG4gICAgICBpc1ZhbGlkOiAoKSA9PiBTZXJ2aWNlUmVnaXN0cnkuaGFzU2VydmljZShjaGF0U2VydmljZU5hbWUpLFxuICAgICAgaHJlZjogKCkgPT4ge1xuICAgICAgICB2YXIgYW5zd2VyID0gU2VydmljZVJlZ2lzdHJ5LnNlcnZpY2VMaW5rKGNoYXRTZXJ2aWNlTmFtZSk7XG4gICAgICAgIGlmIChhbnN3ZXIpIHtcbi8qXG4gICAgICAgICAgVE9ETyBhZGQgYSBjdXN0b20gbGluayB0byB0aGUgY29ycmVjdCByb29tIGZvciB0aGUgY3VycmVudCBuYW1lc3BhY2U/XG5cbiAgICAgICAgICB2YXIgaXJjSG9zdCA9IFwiXCI7XG4gICAgICAgICAgdmFyIGlyY1NlcnZpY2UgPSBTZXJ2aWNlUmVnaXN0cnkuZmluZFNlcnZpY2UoXCJodWJvdFwiKTtcbiAgICAgICAgICBpZiAoaXJjU2VydmljZSkge1xuICAgICAgICAgICAgaXJjSG9zdCA9IGlyY1NlcnZpY2UucG9ydGFsSVA7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChpcmNIb3N0KSB7XG4gICAgICAgICAgICB2YXIgbmljayA9IGxvY2FsU3RvcmFnZVtcImdvZ3NVc2VyXCJdIHx8IGxvY2FsU3RvcmFnZVtcImlyY05pY2tcIl0gfHwgXCJteW5hbWVcIjtcbiAgICAgICAgICAgIHZhciByb29tID0gXCIjZmFicmljOC1cIiArICBjdXJyZW50S3ViZXJuZXRlc05hbWVzcGFjZSgpO1xuICAgICAgICAgICAgYW5zd2VyID0gVXJsSGVscGVycy5qb2luKGFuc3dlciwgXCIva2l3aVwiLCBpcmNIb3N0LCBcIj8mbmljaz1cIiArIG5pY2sgKyByb29tKTtcbiAgICAgICAgICB9XG4qL1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBhbnN3ZXI7XG4gICAgICB9LFxuICAgICAgaXNBY3RpdmU6ICgpID0+IGZhbHNlXG4gICAgfSk7XG5cbiAgICAvLyBUT0RPIHdlIHNob3VsZCBtb3ZlIHRoaXMgdG8gYSBuaWNlciBsaW5rIGluc2lkZSB0aGUgTGlicmFyeSBzb29uIC0gYWxzbyBsZXRzIGhpZGUgdW50aWwgaXQgd29ya3MuLi5cbi8qXG4gICAgd29ya3NwYWNlLnRvcExldmVsVGFicy5wdXNoKHtcbiAgICAgIGlkOiAnY3JlYXRlUHJvamVjdCcsXG4gICAgICB0aXRsZTogKCkgPT4gICdDcmVhdGUnLFxuICAgICAgdG9vbHRpcDogKCkgPT4gJ0NyZWF0ZXMgYSBuZXcgcHJvamVjdCcsXG4gICAgICBpc1ZhbGlkOiAoKSA9PiBTZXJ2aWNlUmVnaXN0cnkuaGFzU2VydmljZShcImFwcC1saWJyYXJ5XCIpICYmIGZhbHNlLFxuICAgICAgaHJlZjogKCkgPT4gXCIvcHJvamVjdC9jcmVhdGVcIlxuICAgIH0pO1xuKi9cblxuICAgIHByZWZlcmVuY2VzUmVnaXN0cnkuYWRkVGFiKCdBYm91dCAnICsgdmVyc2lvbi5uYW1lLCBVcmxIZWxwZXJzLmpvaW4odGVtcGxhdGVQYXRoLCAnYWJvdXQuaHRtbCcpKTtcblxuICAgIGxvZy5pbmZvKFwic3RhcnRlZCwgdmVyc2lvbjogXCIsIHZlcnNpb24udmVyc2lvbik7XG4gICAgbG9nLmluZm8oXCJjb21taXQgSUQ6IFwiLCB2ZXJzaW9uLmNvbW1pdElkKTtcbiAgfSk7XG5cbiAgaGF3dGlvUGx1Z2luTG9hZGVyLnJlZ2lzdGVyUHJlQm9vdHN0cmFwVGFzaygobmV4dCkgPT4ge1xuICAgICQuYWpheCh7XG4gICAgICB1cmw6ICd2ZXJzaW9uLmpzb24/cmV2PScgKyBEYXRlLm5vdygpLCBcbiAgICAgIHN1Y2Nlc3M6IChkYXRhKSA9PiB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgdmVyc2lvbiA9IGFuZ3VsYXIuZnJvbUpzb24oZGF0YSk7XG4gICAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICAgIHZlcnNpb24gPSB7XG4gICAgICAgICAgICBuYW1lOiAnZmFicmljOC1jb25zb2xlJyxcbiAgICAgICAgICAgIHZlcnNpb246ICcnXG4gICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICBuZXh0KCk7XG4gICAgICB9LFxuICAgICAgZXJyb3I6IChqcVhIUiwgdGV4dCwgc3RhdHVzKSA9PiB7XG4gICAgICAgIGxvZy5kZWJ1ZyhcIkZhaWxlZCB0byBmZXRjaCB2ZXJzaW9uOiBqcVhIUjogXCIsIGpxWEhSLCBcIiB0ZXh0OiBcIiwgdGV4dCwgXCIgc3RhdHVzOiBcIiwgc3RhdHVzKTtcbiAgICAgICAgbmV4dCgpO1xuICAgICAgfSxcbiAgICAgIGRhdGFUeXBlOiBcImh0bWxcIlxuICAgIH0pO1xuICB9KTtcblxuICBoYXd0aW9QbHVnaW5Mb2FkZXIuYWRkTW9kdWxlKHBsdWdpbk5hbWUpO1xufVxuIiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIm1haW5HbG9iYWxzLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIm1haW5QbHVnaW4udHNcIi8+XG5cbm1vZHVsZSBNYWluIHtcbiAgX21vZHVsZS5jb250cm9sbGVyKCdNYWluLkFib3V0JywgKCRzY29wZSkgPT4ge1xuICAgICRzY29wZS5pbmZvID0gdmVyc2lvbjtcbiAgfSk7XG59XG5cbiJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==
angular.module("fabric8-console-templates", []).run(["$templateCache", function($templateCache) {$templateCache.put("plugins/forge/html/command.html","<div ng-controller=\"Forge.CommandController\">\n  <div class=\"row\">\n    <div hawtio-breadcrumbs></div>\n  </div>\n\n  <div class=\"row\">\n    <div hawtio-tabs></div>\n  </div>\n\n<!--\n  <div class=\"row\">\n    <div class=\"col-md-12\">\n      <span class=\"pull-right\">&nbsp;</span>\n\n      <div class=\"user-icon-name pull-right\" ng-show=\"user\">\n        <a href=\"/forge/repos\" title=\"Browse the repositories for {{user}}\">\n          <img src=\"{{avatar_url}}\" class=\"avatar-small-img\" ng-show=\"avatar_url\">\n        </a>\n        &nbsp;\n        <a href=\"/forge/repos\" title=\"Browse the repositories for {{user}}\">\n          {{user}}\n        </a>\n        <span ng-show=\"repoName\">/\n          <a href=\"/forge/repos/{{repoName}}\" title=\"Browse the {{repoName}}repository\">\n            {{repoName}}\n          </a>\n        </span>\n      </div>\n    </div>\n  </div>\n-->\n  <div class=\"row\">\n    <div class=\"col-md-12\">\n      <h3>{{schema.info.description}}</h3>\n    </div>\n  </div>\n  <div class=\"row\" ng-show=\"executing\">\n    <div class=\"col-md-12\">\n      <p class=\"bg-info\">executing...\n        <i class=\"fa fa-spinner fa-spin\"></i>\n      </p>\n    </div>\n  </div>\n  <div class=\"row\" ng-show=\"response\">\n    <div class=\"col-md-12\">\n      <p ng-show=\"response.message\" ng-class=\"responseClass\"><span class=\"response-message\">{{response.message}}</span></p>\n      <p ng-show=\"response.output\" ng-class=\"responseClass\"><span class=\"response-output\">{{response.output}}</span></p>\n      <p ng-show=\"response.err\" ng-class=\"bg-warning\"><span class=\"response-err\">{{response.err}}</span></p>\n    </div>\n  </div>\n  <div class=\"row\" ng-show=\"response && !invalid\">\n    <div class=\"col-md-12\">\n      <a class=\"btn btn-primary\" href=\"{{completedLink}}\">Done</a>\n      <a class=\"btn btn-default\" ng-click=\"response = null\" ng-hide=\"wizardCompleted\">Hide</a>\n    </div>\n  </div>\n  <div class=\"row\" ng-show=\"validationError\">\n    <div class=\"col-md-12\">\n      <p class=\"bg-danger\">{{validationError}}</p>\n    </div>\n  </div>\n  <div class=\"row\">\n    <div class=\"col-md-12\">\n      <div ng-hide=\"fetched\">\n        <div class=\"align-center\">\n          <i class=\"fa fa-spinner fa-spin\"></i>\n        </div>\n      </div>\n      <div ng-show=\"fetched && !wizardCompleted\">\n        <div hawtio-form-2=\"schema\" entity=\'entity\'></div>\n      </div>\n    </div>\n  </div>\n  <div class=\"row\" ng-hide=\"wizardCompleted\">\n    <div class=\"col-md-2\">\n    </div>\n    <div class=\"col-md-2\">\n      <button class=\"btn btn-primary\"\n              title=\"Perform this command\"\n              ng-show=\"fetched\"\n              ng-disabled=\"executing\"\n              ng-click=\"execute()\">\n        Execute\n      </button>\n    </div>\n  </div>\n</div>\n");
$templateCache.put("plugins/forge/html/commands.html","<div class=\"row\" ng-controller=\"Forge.CommandsController\">\n  <div class=\"row\">\n    <div hawtio-breadcrumbs></div>\n  </div>\n\n  <div class=\"row\">\n    <div hawtio-tabs></div>\n  </div>\n\n  <div class=\"row\">\n    <div class=\"col-md-12\" ng-show=\"commands.length\">\n      <span ng-show=\"!id\">\n        Command: <hawtio-filter ng-model=\"tableConfig.filterOptions.filterText\"\n                                css-class=\"input-xxlarge\"\n                                placeholder=\"Filter commands...\"\n                                save-as=\"fabric8-forge-command-filter\"></hawtio-filter>\n      </span>\n      <span class=\"pull-right\">&nbsp;</span>\n\n      <div class=\"user-icon-name pull-right\" ng-show=\"user\">\n        <a href=\"/forge/repos\" title=\"Browse the repositories for {{user}}\">\n          <img src=\"{{avatar_url}}\" class=\"avatar-small-img\" ng-show=\"avatar_url\">\n        </a>\n        &nbsp;\n        <a href=\"/forge/repos\" title=\"Browse the repositories for {{user}}\">\n          {{user}}\n        </a>\n        <span ng-show=\"repoName\">/\n          <a href=\"/forge/repos/{{repoName}}\" title=\"Browse the {{repoName}}repository\">\n            {{repoName}}\n          </a>\n        </span>\n      </div>\n    </div>\n  </div>\n  <div class=\"row\">\n    <div class=\"col-md-12\">\n      <div ng-hide=\"fetched\">\n        <div class=\"align-center\">\n          <i class=\"fa fa-spinner fa-spin\"></i>\n        </div>\n      </div>\n      <div ng-show=\"fetched\">\n        <div ng-hide=\"commands.length\" class=\"align-center\">\n          <p class=\"alert alert-info\">There are no commands available!</p>\n        </div>\n        <div ng-show=\"commands.length\">\n        </div>\n        <div ng-show=\"mode == \'table\'\">\n          <table class=\"table table-condensed table-striped\" hawtio-simple-table=\"tableConfig\"></table>\n        </div>\n      </div>\n    </div>\n  </div>\n\n  <div ng-show=\"fetched && commands.length && mode != \'table\'\">\n    <div class=\"row\">\n      <ul>\n        <li class=\"no-list command-selector-folder\" ng-repeat=\"folder in commandSelector.folders\"\n            ng-show=\"commandSelector.showFolder(folder)\">\n          <div class=\"expandable\" ng-class=\"commandSelector.isOpen(folder)\">\n            <div title=\"{{folder.name}}\" class=\"title\">\n              <i class=\"expandable-indicator folder\"></i> <span class=\"folder-title\"\n                                                                ng-show=\"folder.name\">{{folder.name}}</span><span\n                    class=\"folder-title\" ng-hide=\"folder.name\">Uncategorized</span>\n            </div>\n            <div class=\"expandable-body\">\n              <ul>\n                <li class=\"no-list command\" ng-repeat=\"command in folder.commands\"\n                    ng-show=\"commandSelector.showCommand(command)\">\n                  <div class=\"inline-block command-selector-name\"\n                       ng-class=\"commandSelector.getSelectedClass(command)\">\n                    <span class=\"contained c-max\">\n                      <a href=\"{{command.$link}}\"\n                         title=\"{{command.description}}\">\n                        <span class=\"command-name\">{{command.$shortName}}</span>\n                      </a>\n                    </span>\n                  </div>\n                </li>\n              </ul>\n            </div>\n          </div>\n        </li>\n      </ul>\n    </div>\n  </div>\n</div>\n");
$templateCache.put("plugins/forge/html/createProject.html","<div class=\"row\" ng-controller=\"Forge.ReposController\">\n  <style>\n    .createProjectPage {\n      padding-top: 40px;\n    }\n  </style>\n\n  <div class=\"row\">\n    <div hawtio-breadcrumbs></div>\n  </div>\n\n  <div class=\"row\">\n    <div hawtio-tabs></div>\n  </div>\n\n  <div class=\"row\">\n    <div class=\"col-md-12\">\n      <span class=\"pull-right\">&nbsp;</span>\n      <a class=\"btn btn-default pull-right\" ng-click=\"logout()\" ng-show=\"login.loggedIn && $runningCDPipeline && $gogsLink && $forgeLink\"\n         title=\"Log out from the git repository\">\n        <i class=\"fa fa-sign-out\"></i> Log out</a>\n      </a>\n      <!--\n            <span class=\"pull-right\" ng-show=\"login.loggedIn\">&nbsp;</span>\n\n            <div class=\"user-icon-name pull-right\" ng-show=\"login.loggedIn\">\n              <img src=\"{{login.avatar_url}}\" class=\"avatar-small-img\" ng-show=\"login.avatar_url\">&nbsp;\n              {{login.user}}\n            </div>\n      -->\n    </div>\n  </div>\n\n\n  <div ng-show=\"model.fetched && $runningCDPipeline && (!$gogsLink || !$forgeLink)\">\n    <div class=\"createProjectPage\">\n      <div class=\"jumbotron\">\n        <p>Waiting for the <b>CD Pipeline</b> application to startup: &nbsp;&nbsp;<i class=\"fa fa-spinner fa-spin\"></i></p>\n\n        <ul class=\"pending-pods\">\n          <li class=\"ngCellText\" ng-repeat=\"item in $requiredRCs\">\n            <a ng-href=\"{{item | kubernetesPageLink}}\">\n              <img class=\"app-icon-small\" ng-src=\"{{item.$iconUrl}}\" ng-show=\"item.$iconUrl\">\n              <b>{{item.metadata.name}}</b>\n            </a>\n            <a ng-show=\"item.$podCounters.podsLink\" href=\"{{item.$podCounters.podsLink}}\" title=\"View pods\">\n              <span ng-show=\"item.$podCounters.ready\" class=\"badge badge-success\">{{item.$podCounters.ready}}</span>\n              <span ng-show=\"item.$podCounters.valid\" class=\"badge badge-info\">{{item.$podCounters.valid}}</span>\n              <span ng-show=\"item.$podCounters.waiting\" class=\"badge\">{{item.$podCounters.waiting}}</span>\n              <span ng-show=\"item.$podCounters.error\" class=\"badge badge-warning\">{{item.$podCounters.error}}</span>\n            </a>\n          </li>\n        </ul>\n        <p>Please be patient while the above pods are ready!</p>\n      </div>\n    </div>\n  </div>\n\n  <div ng-show=\"model.fetched && !$runningCDPipeline\">\n    <div class=\"createProjectPage\">\n      <div class=\"jumbotron\">\n        <p class=\"text-warning\">You are not running the <b>CD Pipeline</b> application in this workspace.</p>\n\n        <p>To be able to create new projects please run it!</p>\n\n        <p><a href=\"{{$runCDPipelineLink}}\" class=\"btn btn-lg btn-default\">Run the <b>CD Pipeline</b></a></p>\n      </div>\n    </div>\n  </div>\n\n  <div ng-show=\"$runningCDPipeline && $gogsLink && $forgeLink && (!login.authHeader || login.relogin)\">\n    <div ng-show=\"login.failed\">\n      <div class=\"bg-danger\">\n        <div class=\"invalid-login align-center\">\n          <h3>Invalid login/password. Please try again!</h3>\n        </div>\n      </div>\n    </div>\n    <h2 ng-hide=\"login.failed\">Please login to the git repository so that you can create a project</h2>\n\n    <form>\n      <div class=\"form-group\">\n        <label for=\"gitUsername\">User name</label>\n        <input type=\"text\" class=\"form-control\" id=\"gitUsername\" placeholder=\"Enter user name\" required=\"true\"\n               ng-model=\"login.user\">\n      </div>\n      <div class=\"form-group\">\n        <label for=\"gitPassword\">Password</label>\n        <input type=\"password\" class=\"form-control\" id=\"gitPassword\" placeholder=\"Password\" required=\"true\"\n               ng-model=\"login.password\">\n      </div>\n      <div class=\"form-group\">\n        <label for=\"gitEmail\">Email address</label>\n        <input type=\"email\" class=\"form-control\" id=\"gitEmail\" placeholder=\"Enter email\" required=\"true\"\n               ng-model=\"login.email\">\n      </div>\n      <div class=\"form-group\">\n        <button type=\"submit\" class=\"btn btn-primary\" ng-click=\"doLogin()\"\n                ng-disabled=\"!login.user || !login.password || !login.email\">\n          <i class=\"fa fa-sign-in\"></i> Sign In\n        </button>\n      </div>\n\n      <div class=\"form-group\" ng-show=\"forgotPasswordUrl\">\n        <a href=\"{{forgotPasswordUrl}}\">Forgot password?</a>\n      </div>\n\n      <div class=\"form-group\" ng-show=\"signUpUrl\">\n        <a href=\"{{signUpUrl}}\">Need an account? Sign up now.</a>\n      </div>\n    </form>\n  </div>\n\n  <div ng-hide=\"model.fetched || !login.authHeader || login.relogin || !$gogsLink ||!$forgeLink\">\n    <div class=\"row\">\n      <div class=\"col-md-12\">\n        <div class=\"align-center\">\n          <i class=\"fa fa-spinner fa-spin\"></i>\n        </div>\n      </div>\n    </div>\n  </div>\n\n  <div ng-show=\"model.fetched && login.authHeader && $gogsLink && $forgeLink\">\n    <div class=\"createProjectPage\">\n      <div class=\"jumbotron\">\n        <p class=\"align-center\">\n          <a class=\"btn btn-primary btn-lg\" href=\"{{$workspaceLink}}/forge/command/project-new\"\n             ng-show=\"login.loggedIn\"\n             title=\"Create a new project in this workspace using a wizard\">\n            <i class=\"fa fa-plus\"></i> Create Project using Wizard</a>\n          </a>\n        </p>\n\n        <p class=\"lead align-center\">\n          This wizard guides you though creating a new project, the git repository and the related builds and Continuous\n          Delivery Pipelines.\n        </p>\n      </div>\n    </div>\n  </div>\n</div>\n");
$templateCache.put("plugins/forge/html/layoutForge.html","<script type=\"text/ng-template\" id=\"idTemplate.html\">\n  <div class=\"ngCellText\">\n    <a href=\"\"\n       title=\"Execute command {{row.entity.name}}\"\n       ng-href=\"{{row.entity.$link}}\">\n      {{row.entity.name}}</a>\n  </div>\n</script>\n<script type=\"text/ng-template\" id=\"repoTemplate.html\">\n  <div class=\"ngCellText\">\n    <a title=\"View repository {{row.entity.name}}\"\n       ng-href=\"/forge/repos/{{row.entity.name}}\">\n      {{row.entity.name}}\n    </a>\n  </div>\n</script>\n<script type=\"text/ng-template\" id=\"repoActionsTemplate.html\">\n  <div class=\"ngCellText\">\n    <a ng-show=\"row.entity.$openProjectLink\"\n       class=\"btn btn-primary\" target=\"editor\"\n       title=\"Open project {{row.entity.name}} in an editor\"\n       ng-href=\"{{row.entity.$openProjectLink}}\">\n      <i class=\"fa fa-pencil-square\"></i>\n      Open\n    </a>\n    <a ng-show=\"row.entity.html_url\"\n       class=\"btn btn-default\" target=\"browse\"\n       title=\"Browse project {{row.entity.name}}\"\n       ng-href=\"{{row.entity.html_url}}\">\n      <i class=\"fa fa-external-link\"></i>\n      Repository\n    </a>\n    <a ng-show=\"row.entity.$buildsLink\"\n       class=\"btn btn-default\" target=\"builds\"\n       title=\"View builds for this repository {{row.entity.owner.username}}/{{row.entity.name}}\"\n       ng-href=\"{{row.entity.$buildsLink}}\">\n      <i class=\"fa fa-cog\"></i>\n      Builds\n    </a>\n    <a ng-show=\"row.entity.$commandsLink\"\n       class=\"btn btn-default\"\n       title=\"Commands for project {{row.entity.name}}\"\n       ng-href=\"{{row.entity.$commandsLink}}\">\n      <i class=\"fa fa-play-circle\"></i>\n      Run...\n    </a>\n  </div>\n</script>\n<script type=\"text/ng-template\" id=\"categoryTemplate.html\">\n  <div class=\"ngCellText\">\n    <span class=\"pod-label badge\"\n          class=\"background-light-grey mouse-pointer\">{{row.entity.category}}</span>\n  </div>\n</script>\n\n<div class=\"row\">\n  <div class=\"wiki-icon-view\">\n    <div class=\"row forge-view\" ng-view></div>\n  </div>\n</div>\n");
$templateCache.put("plugins/forge/html/repo.html","<div class=\"row\" ng-controller=\"Forge.RepoController\">\n  <div class=\"row\">\n    <div hawtio-breadcrumbs></div>\n  </div>\n\n  <div class=\"row\">\n    <div hawtio-tabs></div>\n  </div>\n\n  <div class=\"row\">\n    <div class=\"col-md-12\">\n      <span class=\"pull-right\">&nbsp;</span>\n      <a class=\"btn btn-default pull-right\"\n              href=\"/forge/repos\"><i class=\"fa fa-list\"></i></a>\n      <span class=\"pull-right\">&nbsp;</span>\n      <a ng-show=\"entity.$commandsLink\"\n         class=\"btn btn-default pull-right\"\n         title=\"Commands for project {{entity.name}}\"\n         ng-href=\"{{entity.$commandsLink}}\">\n        <i class=\"fa fa-play-circle\"></i>\n        Run...\n      </a>\n      <span class=\"pull-right\" ng-show=\"entity.$buildsLink\">&nbsp;</span>\n      <a ng-show=\"entity.$buildsLink\"\n         class=\"btn btn-primary pull-right\" target=\"builds\"\n         title=\"View builds for this repository {{entity.owner.username}}/{{entity.name}}\"\n         ng-href=\"{{entity.$buildsLink}}\">\n        <i class=\"fa fa-cog\"></i>\n        Builds\n      </a>\n      <span class=\"pull-right\">&nbsp;</span>\n      <a ng-show=\"entity.html_url\"\n         class=\"btn btn-default pull-right\" target=\"browse\"\n         title=\"Browse project {{entity.name}}\"\n         ng-href=\"{{entity.html_url}}\">\n        <i class=\"fa fa-external-link\"></i>\n        Browse\n      </a>\n    </div>\n  </div>\n\n  <div ng-hide=\"fetched\">\n    <div class=\"row\">\n      <div class=\"col-md-12\">\n        <div class=\"align-center\">\n          <i class=\"fa fa-spinner fa-spin\"></i>\n        </div>\n      </div>\n    </div>\n  </div>\n  <div ng-show=\"fetched\">\n    <div class=\"row\">\n      <div class=\"col-md-12\">\n        <h3 title=\"repository for {{entity.owner.username}}\">\n          <span ng-show=\"entity.owner.username\">\n            <a href=\"/forge/repos\" title=\"Browse the repositories for {{entity.owner.username}}\">\n              <img src=\"{{entity.owner.avatar_url}}\" class=\"avatar-small-img\" ng-show=\"entity.owner.avatar_url\">\n            </a>\n            &nbsp;\n            <a href=\"/forge/repos\" title=\"Browse the repositories for {{entity.owner.username}}\">\n              {{entity.owner.username}}\n            </a>\n             &nbsp;/&nbsp;\n          </span>\n          {{entity.name}}\n        </h3>\n      </div>\n    </div>\n\n    <div class=\"git-clone-tabs\">\n      <div class=\"row\">\n        <div class=\"col-md-12\">\n          <div class=\"tabbable\">\n            <div value=\"ssh\" class=\"tab-pane\" title=\"SSH\" ng-show=\"entity.ssh_url\">\n              <div class=\"git-clone-panel\">\n                <p>to clone this git repository via <b>ssh</b> from the command line:</p>\n              </div>\n\n              <div class=\"highlight\">\n                <pre>\n                  <code>git clone {{entity.ssh_url}}</code>\n                </pre>\n              </div>\n            </div>\n\n            <div value=\"http\" class=\"tab-pane\" title=\"HTTP\" ng-show=\"entity.clone_url\">\n              <div class=\"git-clone-panel\">\n                <p>to clone this git repository via <b>http</b> from the command line:</p>\n              </div>\n\n              <div class=\"highlight\">\n                <pre>\n                  <code>git clone {{entity.clone_url}}</code>\n                </pre>\n              </div>\n            </div>\n          </div>\n        </div>\n      </div>\n    </div>\n  </div>\n</div>\n");
$templateCache.put("plugins/forge/html/repos.html","<div class=\"row\" ng-controller=\"Forge.ReposController\">\n  <div class=\"row\">\n    <div hawtio-breadcrumbs></div>\n  </div>\n\n  <div class=\"row\">\n    <div hawtio-tabs></div>\n  </div>\n\n  <div class=\"row\">\n    <div class=\"col-md-12\">\n      <hawtio-filter ng-model=\"tableConfig.filterOptions.filterText\"\n                     ng-show=\"projects.length\"\n                     css-class=\"input-xxlarge\"\n                     placeholder=\"Filter repositories...\"></hawtio-filter>\n      <!--\n            <span class=\"pull-right\">&nbsp;</span>\n            <button ng-show=\"fetched\"\n                    class=\"btn btn-danger pull-right\"\n                    ng-disabled=\"tableConfig.selectedItems.length == 0\"\n                    ng-click=\"delete(tableConfig.selectedItems)\">\n              <i class=\"fa fa-remove\"></i> Delete\n            </button>\n      -->\n      <span class=\"pull-right\">&nbsp;</span>\n      <a class=\"btn btn-primary pull-right\" href=\"{{$workspaceLink}}/forge/command/project-new\"\n         ng-show=\"login.loggedIn\"\n         title=\"Create a new project and repository\">\n        <i class=\"fa fa-plus\"></i> Create Project</a>\n      </a>\n      <span class=\"pull-right\">&nbsp;</span>\n      <a class=\"btn btn-default pull-right\" ng-click=\"logout()\" ng-show=\"login.loggedIn\"\n         title=\"Log out from the git repository\">\n        <i class=\"fa fa-sign-out\"></i> Log out</a>\n      </a>\n      <span class=\"pull-right\" ng-show=\"login.loggedIn\">&nbsp;</span>\n      <div class=\"user-icon-name pull-right\" ng-show=\"login.loggedIn\">\n        <img src=\"{{login.avatar_url}}\" class=\"avatar-small-img\" ng-show=\"login.avatar_url\">&nbsp;\n        {{login.user}}\n      </div>\n    </div>\n  </div>\n\n\n  <div ng-show=\"!login.authHeader || login.relogin\">\n    <div ng-show=\"login.failed\">\n      <div class=\"bg-danger\">\n        <div class=\"invalid-login align-center\">\n          <h3>Invalid login/password. Please try again!</h3>\n        </div>\n      </div>\n    </div>\n    <h2 ng-hide=\"login.failed\">Please login to the git repository</h2>\n\n    <form>\n      <div class=\"form-group\">\n        <label for=\"gitUsername\">User name</label>\n        <input type=\"text\" class=\"form-control\" id=\"gitUsername\" placeholder=\"Enter user name\" required=\"true\"\n               ng-model=\"login.user\">\n      </div>\n      <div class=\"form-group\">\n        <label for=\"gitPassword\">Password</label>\n        <input type=\"password\" class=\"form-control\" id=\"gitPassword\" placeholder=\"Password\" required=\"true\"\n               ng-model=\"login.password\">\n      </div>\n      <div class=\"form-group\">\n        <label for=\"gitEmail\">Email address</label>\n        <input type=\"email\" class=\"form-control\" id=\"gitEmail\" placeholder=\"Enter email\" required=\"true\"\n               ng-model=\"login.email\">\n      </div>\n      <div class=\"form-group\">\n        <button type=\"submit\" class=\"btn btn-primary\" ng-click=\"doLogin()\"\n                ng-disabled=\"!login.user || !login.password || !login.email\">\n          <i class=\"fa fa-sign-in\"></i> Sign In\n        </button>\n      </div>\n\n      <div class=\"form-group\" ng-show=\"forgotPasswordUrl\">\n          <a href=\"{{forgotPasswordUrl}}\">Forgot password?</a>\n      </div>\n\n      <div class=\"form-group\" ng-show=\"signUpUrl\">\n        <a href=\"{{signUpUrl}}\">Need an account? Sign up now.</a>\n      </div>\n    </form>\n  </div>\n\n  <div ng-hide=\"fetched || !login.authHeader || login.relogin\">\n    <div class=\"row\">\n      <div class=\"col-md-12\">\n        <div class=\"align-center\">\n          <i class=\"fa fa-spinner fa-spin\"></i>\n        </div>\n      </div>\n    </div>\n  </div>\n\n  <div ng-show=\"fetched && login.authHeader\">\n    <div ng-hide=\"projects.length\" class=\"align-center\">\n      <div class=\"padded-div\">\n        <div class=\"row\">\n          <div class=\"col-md-12\">\n            <p class=\"alert alert-info\">There are no git repositories yet. Please create one!</p>\n          </div>\n        </div>\n      </div>\n    </div>\n    <div ng-show=\"projects.length\">\n      <div class=\"row\">\n        <div class=\"col-md-12\">\n          <table class=\"table table-condensed table-striped\" hawtio-simple-table=\"tableConfig\"></table>\n        </div>\n      </div>\n    </div>\n  </div>\n</div>\n");
$templateCache.put("plugins/main/html/about.html","<div ng-controller=\"Main.About\">\n  <p>Version: {{info.version}}</p>\n  <p>Commit ID: {{info.commitId}}</p>\n  <table class=\"table table-striped\">\n    <thead>\n      <tr>\n        <th>\n          Name\n        </th>\n        <th>\n          Version\n        </th>\n      </tr>\n    </thead>\n    <tbody>\n      <tr ng-repeat=\"(key, info) in info.packages\">\n        <td>{{key}}</td>\n        <td>{{info.version || \'--\'}}</td>\n      </tr>\n    </tbody>\n  </table>\n</div>\n");
$templateCache.put("plugins/wiki/exemplar/document.html","<h2>This is a title</h2>\n\n<p>Here are some notes</p>");
$templateCache.put("plugins/wiki/html/camelCanvas.html","<div ng-controller=\"Wiki.CamelController\">\n  <div ng-controller=\"Wiki.CamelCanvasController\">\n    <div class=\"row\">\n      <div hawtio-breadcrumbs></div>\n    </div>\n\n    <div class=\"wiki-fixed\">\n\n      <ng-include src=\"\'plugins/wiki/html/camelNavBar.html\'\"></ng-include>\n\n      <script type=\"text/ng-template\"\n              id=\"nodeTemplate\">\n        <div class=\"component window\"\n             id=\"{{id}}\"\n             title=\"{{node.tooltip}}\">\n          <div class=\"window-inner {{node.type}}\">\n            <img class=\"nodeIcon\"\n                 title=\"Click and drag to create a connection\"\n                 src=\"{{node.imageUrl}}\">\n          <span class=\"nodeText\"\n                title=\"{{node.label}}\">{{node.label}}</span>\n          </div>\n        </div>\n      </script>\n\n\n      <div class=\"row\">\n        <div class=\"col-md-12\">\n          <ul class=\"nav nav-tabs\">\n            <li ng-class=\"{active : true}\">\n              <a ng-href=\'{{startLink}}/camel/canvas/{{pageId}}\' title=\"Edit the diagram in a draggy droppy way\"\n                 data-placement=\"bottom\">\n                <i class=\"icon-picture\"></i> Canvas</a></li>\n            <li ng-class=\"{active : false}\">\n              <a href=\'\' ng-click=\'confirmSwitchToTreeView()\' title=\"Switch to the tree based view\"\n                 data-placement=\"bottom\">\n                <i class=\"icon-sitemap\"></i> Tree</a></li>\n\n            <li class=\"pull-right\">\n              <a href=\'\' title=\"Add new pattern node connecting to this pattern\" ng-click=\"addDialog.open()\"\n                 data-placement=\"bottom\">\n                <i class=\"icon-plus\"></i> Add</a></li>\n\n            <li class=\"pull-right\">\n              <a href=\'\' title=\"Automatically layout the diagram \" ng-click=\"doLayout()\"\n                 data-placement=\"bottom\">\n                <i class=\"icon-magic\"></i> Layout</a></li>\n\n            <li class=\"pull-right\" style=\"margin-top: 0; margin-bottom: 0;\">\n            </li>\n\n            <!--\n            <li class=\"pull-right\">\n              <a href=\'\' title=\"Edit the properties for the selected node\" ng-disabled=\"!selectedFolder\"\n                 ng-click=\"propertiesDialog.open()\"\n                 data-placement=\"bottom\">\n                <i class=\"icon-edit\"></i> Properties</a></li>\n                -->\n          </ul>\n\n          <div class=\"modal-large\">\n            <div modal=\"addDialog.show\" close=\"addDialog.close()\" ng-options=\"addDialog.options\">\n              <form class=\"form-horizontal no-bottom-margin\" ng-submit=\"addAndCloseDialog()\">\n                <div class=\"modal-header\"><h4>Add Node</h4></div>\n                <div class=\"modal-body\">\n                  <tabset>\n                    <tab heading=\"Patterns\">\n                      <div hawtio-tree=\"paletteTree\" hideRoot=\"true\" onSelect=\"onPaletteSelect\"\n                           activateNodes=\"paletteActivations\"></div>\n                    </tab>\n                    <tab heading=\"Endpoints\">\n                      <div hawtio-tree=\"componentTree\" hideRoot=\"true\" onSelect=\"onComponentSelect\"\n                           activateNodes=\"componentActivations\"></div>\n                    </tab>\n                  </tabset>\n                </div>\n                <div class=\"modal-footer\">\n                  <input id=\"submit\" class=\"btn btn-primary add\" type=\"submit\"\n                         ng-disabled=\"!selectedPaletteNode && !selectedComponentNode\"\n                         value=\"Add\">\n                  <button class=\"btn btn-warning cancel\" type=\"button\" ng-click=\"addDialog.close()\">Cancel</button>\n                </div>\n              </form>\n            </div>\n          </div>\n\n\n          <!--\n          <div modal=\"propertiesDialog.show\" close=\"propertiesDialog.close()\" ng-options=\"propertiesDialog.options\">\n            <form class=\"form-horizontal no-bottom-margin\" ng-submit=\"updatePropertiesAndCloseDialog()\">\n              <div class=\"modal-header\"><h4>Properties</h4></div>\n              <div class=\"modal-body\">\n\n                <div ng-show=\"!selectedEndpoint\"> -->\n          <!-- pattern form --> <!--\n                <div simple-form name=\"formEditor\" entity=\'nodeData\' data=\'nodeModel\' schema=\"schema\"\n                     onsubmit=\"updatePropertiesAndCloseDialog\"></div>\n              </div>\n              <div ng-show=\"selectedEndpoint\"> -->\n          <!-- endpoint form -->\n          <!--\n          <div class=\"control-group\">\n            <label class=\"control-label\" for=\"endpointPath\">Endpoint</label>\n\n            <div class=\"controls\">\n              <input id=\"endpointPath\" class=\"col-md-10\" type=\"text\" ng-model=\"endpointPath\" placeholder=\"name\"\n                     typeahead=\"title for title in endpointCompletions($viewValue) | filter:$viewValue\"\n                     typeahead-editable=\'true\'\n                     min-length=\"1\">\n            </div>\n          </div>\n          <div simple-form name=\"formEditor\" entity=\'endpointParameters\' data=\'endpointSchema\'\n               schema=\"schema\"></div>\n        </div>\n\n\n      </div>\n      <div class=\"modal-footer\">\n        <input class=\"btn btn-primary add\" type=\"submit\" ng-click=\"updatePropertiesAndCloseDialog()\" value=\"OK\">\n        <button class=\"btn btn-warning cancel\" type=\"button\" ng-click=\"propertiesDialog.close()\">Cancel</button>\n      </div>\n    </form>\n  </div>\n  -->\n\n        </div>\n      </div>\n\n      <div class=\"row\">\n      </div>\n\n      <div class=\"panes gridStyle\">\n        <div class=\"left-pane\">\n          <div class=\"camel-viewport camel-canvas\">\n            <div style=\"position: relative;\" class=\"canvas\"></div>\n          </div>\n        </div>\n        <div class=\"right-pane\">\n          <div class=\"camel-props\">\n            <div class=\"button-bar\">\n              <div class=\"centered\">\n                <form class=\"form-inline\">\n                  <label>Route: </label>\n                  <select ng-model=\"selectedRouteId\" ng-options=\"routeId for routeId in routeIds\"></select>\n                </form>\n                <div class=\"btn-group\">\n                  <button class=\"btn\"\n                          title=\"{{getDeleteTitle()}}\"\n                          ng-click=\"removeNode()\"\n                          data-placement=\"bottom\">\n                    <i class=\"icon-remove\"></i> Delete {{getDeleteTarget()}}\n                  </button>\n                  <button class=\"btn\"\n                          title=\"Apply any changes to the endpoint properties\"\n                          ng-disabled=\"!isFormDirty()\"\n                          ng-click=\"updateProperties()\">\n                    <i class=\"icon-ok\"></i> Apply\n                  </button>\n                  <!-- TODO Would be good to have this too\n                  <button class=\"btn\"\n                          title=\"Clear any changes to the endpoint properties\"\n                          ng-disabled=\"!isFormDirty()\"\n                          ng-click=\"resetForms()\">\n                    <i class=\"icon-remove\"></i> Cancel</button> -->\n                </div>\n              </div>\n            </div>\n            <div class=\"prop-viewport\">\n\n              <div>\n                <!-- pattern form -->\n                <div ng-show=\"!selectedEndpoint\">\n                  <div simple-form\n                       name=\"formEditor\"\n                       entity=\'nodeData\'\n                       data=\'nodeModel\'\n                       schema=\"schema\"\n                       onsubmit=\"updateProperties\"></div>\n                </div>\n\n                <!-- endpoint form -->\n                <div class=\"endpoint-props\" ng-show=\"selectedEndpoint\">\n                  <p>Endpoint</p>\n\n                  <form name=\"endpointForm\">\n                    <div class=\"control-group\">\n                      <label class=\"control-label\" for=\"endpointPath\">URI:</label>\n\n                      <div class=\"controls\">\n                        <input id=\"endpointPath\" class=\"col-md-10\" type=\"text\" ng-model=\"endpointPath\"\n                               placeholder=\"name\"\n                               typeahead=\"title for title in endpointCompletions($viewValue) | filter:$viewValue\"\n                               typeahead-editable=\'true\'\n                               min-length=\"1\">\n                      </div>\n                    </div>\n                  </form>\n\n                  <div simple-form\n                       name=\"formEditor\"\n                       entity=\'endpointParameters\'\n                       data=\'endpointSchema\'\n                       schema=\"schema\"\n                       onsubmit=\"updateProperties\"></div>\n                </div>\n\n              </div>\n            </div>\n          </div>\n        </div>\n      </div>\n\n      <div hawtio-confirm-dialog=\"switchToTreeView.show\" ok-button-text=\"Yes\" cancel-button-text=\"No\"\n           on-ok=\"doSwitchToTreeView()\" title=\"You have unsaved changes\">\n        <div class=\"dialog-body\">\n          <p>Unsaved changes will be discarded. Do you really want to switch views?</p>\n        </div>\n      </div>\n\n    </div>\n  </div>\n</div>\n");
$templateCache.put("plugins/wiki/html/camelDiagram.html","<div ng-include=\"diagramTemplate\"></div>\n");
$templateCache.put("plugins/wiki/html/camelNavBar.html","<div class=\"wiki logbar\" ng-controller=\"Wiki.NavBarController\">\n  <div class=\"wiki logbar-container\">\n    <ul class=\"nav nav-tabs connected\">\n      <li ng-repeat=\"link in breadcrumbs\" ng-class=\'{active : isActive(link.href)}\'>\n        <a ng-href=\"{{link.href}}{{hash}}\">{{link.name}}</a>\n      </li>\n\n      <!--\n              <li class=\"pull-right\">\n                <a ng-href=\"{{editLink()}}{{hash}}\" ng-hide=\"!editLink()\" title=\"Edit this camel configuration\"\n                   data-placement=\"bottom\">\n                  <i class=\"icon-edit\"></i> Edit</a></li>\n              <li class=\"pull-right\" ng-show=\"sourceLink()\">\n      -->\n      <li class=\"pull-right\">\n        <a ng-href=\"\" id=\"saveButton\" ng-disabled=\"!modified\" ng-click=\"save(); $event.stopPropagation();\"\n           ng-class=\"{\'nav-primary\' : modified, \'nav-primary-disabled\' : !modified}\"\n           title=\"Saves the Camel document\">\n          <i class=\"icon-save\"></i> Save</a>\n      </li>\n      <!--<li class=\"pull-right\">-->\n        <!--<a href=\"\" id=\"cancelButton\" ng-click=\"cancel()\"-->\n           <!--title=\"Discards any updates\">-->\n          <!--<i class=\"icon-remove\"></i> Cancel</a>-->\n      <!--</li>-->\n\n      <li class=\"pull-right\">\n        <a ng-href=\"{{sourceLink()}}\" title=\"View source code\"\n           data-placement=\"bottom\">\n          <i class=\"icon-file-alt\"></i> Source</a>\n      </li>\n    </ul>\n  </div>\n</div>\n");
$templateCache.put("plugins/wiki/html/camelProperties.html","<div ng-controller=\"Wiki.CamelController\">\n  <div class=\"row\">\n    <div hawtio-breadcrumbs></div>\n  </div>\n\n  <div class=\"row\">\n    <div class=\"wiki-fixed\">\n\n      <ng-include src=\"\'plugins/wiki/html/camelNavBar.html\'\"></ng-include>\n\n      <div class=\"row\">\n        <div class=\"col-md-12\" ng-include=\"\'plugins/wiki/html/camelSubLevelTabs.html\'\"></div>\n      </div>\n\n      <div class=\"row\">\n        <div id=\"tree-container\" class=\"col-md-3\" ng-controller=\"Camel.TreeController\">\n          <div hawtio-tree=\"camelContextTree\" onselect=\"onNodeSelect\" onDragEnter=\"onNodeDragEnter\" onDrop=\"onNodeDrop\"\n               onRoot=\"onRootTreeNode\"\n               hideRoot=\"true\"></div>\n        </div>\n\n        <div class=\"col-md-9\">\n          <div ng-include=\"propertiesTemplate\"></div>\n        </div>\n      </div>\n\n      <div hawtio-confirm-dialog=\"switchToCanvasView.show\" ok-button-text=\"Yes\" cancel-button-text=\"No\"\n           on-ok=\"doSwitchToCanvasView()\" title=\"You have unsaved changes\">\n        <div class=\"dialog-body\">\n          <p>Unsaved changes will be discarded. Do you really want to switch views?</p>\n        </div>\n      </div>\n\n    </div>\n  </div>\n</div>");
$templateCache.put("plugins/wiki/html/camelPropertiesEdit.html","<div simple-form name=\"formEditor\" entity=\'nodeData\' data=\'nodeModel\' schema=\"schema\"></div>\n");
$templateCache.put("plugins/wiki/html/camelSubLevelTabs.html","<ul class=\"nav nav-tabs\">\n  <li ng-class=\"{active : false}\">\n    <a href=\'\' ng-click=\'confirmSwitchToCanvasView()\' title=\"Edit the diagram in a draggy droppy way\"\n        data-placement=\"bottom\">\n      <i class=\"icon-picture\"></i> Canvas</a></li>\n  <li ng-repeat=\"nav in camelSubLevelTabs\" ng-show=\"isValid(nav)\" ng-class=\"{active : isActive(nav)}\">\n    <a ng-href=\"{{nav.href()}}{{hash}}\" title=\"{{nav.title}}\"\n       data-placement=\"bottom\" ng-bind-html-unsafe=\"nav.content\"></a></li>\n\n  <li class=\"pull-right\">\n    <a href=\'\' title=\"Add new pattern node connecting to this pattern\" ng-click=\"addNode()\" data-placement=\"bottom\">\n      <i class=\"icon-plus\"></i> Add</a></li>\n  <li class=\"pull-right\">\n    <a href=\'\' title=\"Deletes the selected pattern\" ng-disabled=\"!canDelete()\" ng-click=\"removeNode()\" data-placement=\"bottom\">\n      <i class=\"icon-remove\"></i> Delete</a></li>\n</ul>\n\n<div modal=\"addDialog.show\" close=\"addDialog.close()\" ng-options=\"addDialog.options\">\n  <form class=\"form-horizontal no-bottom-margin\" ng-submit=\"addAndCloseDialog()\">\n    <div class=\"modal-header\"><h4>Add Node</h4></div>\n    <div class=\"modal-body\">\n      <div hawtio-tree=\"paletteTree\" hideRoot=\"true\" onSelect=\"onPaletteSelect\" activateNodes=\"paletteActivations\"></div>\n    </div>\n    <div class=\"modal-footer\">\n      <input id=\"submit\" class=\"btn btn-primary add\" type=\"submit\" ng-disabled=\"!selectedPaletteNode\" value=\"Add\">\n      <button class=\"btn btn-warning cancel\" type=\"button\" ng-click=\"addDialog.close()\">Cancel</button>\n      </div>\n    </form>\n  </div>\n</div>\n");
$templateCache.put("plugins/wiki/html/commit.html","<link rel=\"stylesheet\" href=\"plugins/wiki/css/wiki.css\" type=\"text/css\"/>\n\n<div ng-controller=\"Wiki.CommitController\">\n  <script type=\"text/ng-template\" id=\"fileCellTemplate.html\">\n    <div class=\"ngCellText\">\n      <a ng-href=\"{{row.entity.fileLink}}\" class=\"file-name\"\n         title=\"{{row.entity.title}}\">\n        <span class=\"file-icon\" ng-class=\"row.entity.fileClass\" ng-bind-html-unsafe=\"row.entity.fileIconHtml\"></span>\n        <span ng-class=\"row.entity.changeClass\">{{row.entity.path}}</span>\n      </a>\n    </div>\n  </script>\n\n  <div ng-hide=\"inDashboard\" class=\"row\">\n    <div hawtio-breadcrumbs></div>\n  </div>\n\n  <div ng-hide=\"inDashboard\" class=\"wiki logbar\" ng-controller=\"Wiki.NavBarController\">\n    <div class=\"wiki logbar-container\">\n      <ul class=\"nav nav-tabs\">\n        <li ng-show=\"branches.length || branch\" class=\"dropdown\">\n          <a href=\"#\" class=\"dropdown-toggle\" data-toggle=\"dropdown\"\n             title=\"The branch to view\">\n            {{branch || \'branch\'}}\n            <span class=\"caret\"></span>\n          </a>\n          <ul class=\"dropdown-menu\">\n            <li ng-repeat=\"otherBranch in branches\">\n              <a ng-href=\"{{branchLink(otherBranch)}}{{hash}}\"\n                 ng-hide=\"otherBranch === branch\"\n                 title=\"Switch to the {{otherBranch}} branch\"\n                 data-placement=\"bottom\">\n                {{otherBranch}}</a>\n            </li>\n          </ul>\n        </li>\n        <li ng-repeat=\"link in breadcrumbs\">\n          <a ng-href=\"{{link.href}}{{hash}}\">{{link.name}}</a>\n        </li>\n        <li>\n          <a ng-href=\"{{historyLink}}{{hash}}\">History</a>\n        </li>\n        <li title=\"{{commitInfo.shortMessage}}\" class=\"active\">\n          <a class=\"commit-id\">{{commitInfo.commitHashText}}</a>\n        </li>\n        <li class=\"pull-right\">\n        <span class=\"commit-author\">\n          <i class=\"fa fa-user\"></i> {{commitInfo.author}}\n        </span>\n        </li>\n        <li class=\"pull-right\">\n          <span class=\"commit-date\">{{commitInfo.date | date: dateFormat}}</span>\n        </li>\n      </ul>\n    </div>\n  </div>\n\n  <div class=\"wiki-fixed row\">\n    <div class=\"commit-message\" title=\"{{commitInfo.shortMessage}}\">\n      {{commitInfo.trimmedMessage}}\n    </div>\n  </div>\n\n  <div class=\"row\">\n    <div class=\"col-md-4\">\n      <div class=\"control-group\">\n        <button class=\"btn\" ng-disabled=\"!selectedItems.length\" ng-click=\"diff()\"\n                title=\"Compare the selected versions of the files to see how they differ\"><i class=\"fa fa-exchange\"></i>\n          Compare\n        </button>\n\n        <!--\n                <button class=\"btn\" ng-disabled=\"!canRevert()\" ng-click=\"revert()\"\n                        title=\"Revert to this version of the file\"><i class=\"fa fa-exchange\"></i> Revert\n                </button>\n        -->\n      </div>\n    </div>\n    <div class=\"col-md-8\">\n      <div class=\"control-group\">\n        <input class=\"col-md-12 search-query\" type=\"text\" ng-model=\"gridOptions.filterOptions.filterText\"\n               placeholder=\"search\">\n      </div>\n    </div>\n  </div>\n\n  <div class=\"form-horizontal\">\n    <div class=\"row\">\n      <table class=\"table-condensed table-striped\" hawtio-simple-table=\"gridOptions\"></table>\n    </div>\n  </div>\n\n</div>\n");
$templateCache.put("plugins/wiki/html/configuration.html","<div ng-hide=\"inDashboard\" class=\"logbar\" ng-controller=\"Wiki.NavBarController\">\n  <div class=\"wiki logbar-container\">\n    <ul class=\"nav nav-tabs\">\n      <li ng-show=\"branches.length || branch\" class=\"dropdown\">\n        <a href=\"#\" class=\"dropdown-toggle\" data-toggle=\"dropdown\"\n           title=\"The branch to view\">\n          {{branch || \'branch\'}}\n          <span class=\"caret\"></span>\n        </a>\n        <ul class=\"dropdown-menu\">\n          <li ng-repeat=\"otherBranch in branches\">\n            <a ng-href=\"{{branchLink(otherBranch)}}{{hash}}\"\n               ng-hide=\"otherBranch === branch\"\n               title=\"Switch to the {{otherBranch}} branch\"\n               data-placement=\"bottom\">\n              {{otherBranch}}</a>\n          </li>\n        </ul>\n      </li>\n      <li ng-repeat=\"link in breadcrumbs\">\n        <a ng-href=\"{{link.href}}{{hash}}\">{{link.name}}</a>\n      </li>\n      <li class=\"ng-scope\">\n        <a ng-href=\"{{startLink}}/configurations/{{pageId}}\">configuration</a>\n      </li>\n      <li class=\"ng-scope active\">\n        <a>pid</a>\n      </li>\n    </ul>\n  </div>\n</div>\n<div class=\"wiki-fixed\">\n  <div class=\"controller-section\" ng-controller=\"Osgi.PidController\">\n    <div ng-include src=\"\'plugins/osgi/html/pid-details.html\'\"></div>\n  </div>\n</div>\n");
$templateCache.put("plugins/wiki/html/configurations.html","<div ng-hide=\"inDashboard\" class=\"logbar\" ng-controller=\"Wiki.NavBarController\">\n  <div class=\"wiki logbar-container\">\n    <ul class=\"nav nav-tabs\">\n      <li ng-show=\"branches.length || branch\" class=\"dropdown\">\n        <a href=\"#\" class=\"dropdown-toggle\" data-toggle=\"dropdown\"\n           title=\"The branch to view\">\n          {{branch || \'branch\'}}\n          <span class=\"caret\"></span>\n        </a>\n        <ul class=\"dropdown-menu\">\n          <li ng-repeat=\"otherBranch in branches\">\n            <a ng-href=\"{{branchLink(otherBranch)}}{{hash}}\"\n               ng-hide=\"otherBranch === branch\"\n               title=\"Switch to the {{otherBranch}} branch\"\n               data-placement=\"bottom\">\n              {{otherBranch}}</a>\n          </li>\n        </ul>\n      </li>\n      <li ng-repeat=\"link in breadcrumbs\">\n        <a ng-href=\"{{link.href}}{{hash}}\">{{link.name}}</a>\n      </li>\n      <li class=\"ng-scope active\">\n        <a>configuration</a>\n      </li>\n    </ul>\n  </div>\n</div>\n\n<div class=\"wiki-fixed\">\n  <div ng-include src=\"\'plugins/osgi/html/configurations.html\'\"></div>\n</div>\n");
$templateCache.put("plugins/wiki/html/create.html","<div class=\"row\" ng-controller=\"Wiki.CreateController\">\n  <div class=\"row\">\n    <div hawtio-breadcrumbs></div>\n  </div>\n\n  <div class=\"row\">\n    <div class=\"col-md-12\">\n      <form name=\"createForm\"\n            novalidate\n            class=\"form-horizontal no-bottom-margin\"\n            ng-submit=\"addAndCloseDialog(newDocumentName)\">\n        <fieldset>\n\n          <div class=\"row\">\n            <div class=\"col-md-12\">\n              <h4>Create Document</h4>\n            </div>\n          </div>\n\n          <div class=\"row\">\n            <div class=\"col-md-6\">\n              <treecontrol class=\"tree-classic\"\n                 tree-model=\"createDocumentTree\"\n                 options=\"treeOptions\"\n                 on-selection=\"onCreateDocumentSelect(node)\">\n                 {{node.name}}\n              </treecontrol>\n              <!--\n              <div hawtio-tree=\"createDocumentTree\"\n                     hideRoot=\"true\"\n                     onSelect=\"onCreateDocumentSelect\"\n                     activateNodes=\"createDocumentTreeActivations\"></div>\n-->\n            </div>\n            <div class=\"col-md-6\">\n              <div class=\"row\">\n                <div class=\"well\">\n                  {{selectedCreateDocumentTemplate.tooltip}}\n                </div>\n              </div>\n              <div class=\"row\">\n                <div ng-show=\"fileExists.exists\" class=\"alert\">\n                  Please choose a different name as <b>{{fileExists.name}}</b> already exists\n                </div>\n                <div ng-show=\"fileExtensionInvalid\" class=\"alert\">\n                  {{fileExtensionInvalid}}\n                </div>\n                <div ng-show=\"!createForm.$valid\" class=\"alert\">\n                  {{selectedCreateDocumentTemplateInvalid}}\n                </div>\n\n                <div class=\"form-group\">\n                  <label class=\"col-sm-2 control-label\" for=\"fileName\">Name: </label>\n                  <div class=\"col-sm-10\">\n                    <input name=\"fileName\" id=\"fileName\"\n                           class=\"form-control\"\n                           type=\"text\"\n                           ng-pattern=\"selectedCreateDocumentTemplateRegex\"\n                           ng-model=\"newDocumentName\"\n                           placeholder=\"{{selectedCreateDocumentTemplate.exemplar}}\">\n                  </div>\n                </div>\n              </div>\n              <div class=\"row\">\n                <div simple-form data=\"formSchema\" entity=\"formData\" onSubmit=\"generate()\"></div>\n              </div>\n              <div class=\"row\">\n                <input class=\"btn btn-primary add pull-right\"\n                       type=\"submit\"\n                       ng-disabled=\"!selectedCreateDocumentTemplate.exemplar || !createForm.$valid\"\n                       value=\"Create\">\n                <span class=\"pull-right\">&nbsp;</span>\n                <button class=\"btn btn-warning cancel pull-right\" type=\"button\" ng-click=\"cancel()\">Cancel</button>\n              </div>\n            </div>\n            <div class=\"col-md-2\">\n            </div>\n          </div>\n        </fieldset>\n      </form>\n    </div>\n  </div>\n\n</div>\n");
$templateCache.put("plugins/wiki/html/createPage.html","<div ng-controller=\"Wiki.EditController\">\n  <div class=\"logbar\" ng-controller=\"Wiki.NavBarController\">\n\n    <div class=\"wiki logbar-container\">\n\n      <ul class=\"connected nav nav-tabs\">\n        <li ng-repeat=\"link in breadcrumbs\" ng-class=\'{active : isActive(link.href)}\'>\n          <a ng-href=\"{{link.href}}{{hash}}\">\n            {{link.name}}\n          </a>\n        </li>\n\n        <li class=\"pull-right\">\n\n          <a href=\"\" id=\"cancelButton\" ng-click=\"cancel()\"\n                  class=\"pull-right\"\n                  title=\"Discards any updates\">\n            <i class=\"fa fa-remove\"></i> Cancel\n          </a>\n        </li>\n\n        <li class=\"pull-right\">\n          <a href=\"\" id=\"saveButton\" ng-show=\"isValid()\" ng-click=\"create()\"\n                  class=\"pull-right\"\n                  title=\"Creates this page and saves it in the wiki\">\n            <i class=\"fa fa-file-o\"></i> Create\n          </a>\n        </li>\n\n      </ul>\n    </div>\n  </div>\n\n  <div class=\"wiki-fixed form-horizontal\">\n    <div class=\"control-group\">\n      <input type=\"text\" ng-model=\"fileName\" placeholder=\"File name\" class=\"col-md-12\"/>\n    </div>\n    <div class=\"control-group\">\n      <div ng-include=\"sourceView\" class=\"editor-autoresize\"></div>\n    </div>\n  </div>\n</div>\n");
$templateCache.put("plugins/wiki/html/dozerMappings.html","<div class=\"wiki-fixed\" ng-controller=\"Wiki.DozerMappingsController\">\n  <div class=\"logbar\" ng-controller=\"Wiki.NavBarController\">\n    <div class=\"wiki logbar-container\">\n      <ul class=\"nav nav-tabs connected\">\n        <li ng-repeat=\"link in breadcrumbs\" ng-class=\'{active : isActive(link.href)}\'>\n          <a ng-href=\"{{link.href}}{{hash}}\">{{link.name}}</a>\n        </li>\n\n        <!--\n                <li class=\"pull-right\">\n                  <a ng-href=\"{{editLink()}}{{hash}}\" ng-hide=\"!editLink()\" title=\"Edit this camel configuration\"\n                     data-placement=\"bottom\">\n                    <i class=\"fa fa-edit\"></i> Edit</a></li>\n                <li class=\"pull-right\" ng-show=\"sourceLink()\">\n        -->\n        <li class=\"pull-right\">\n          <a href=\"\" id=\"saveButton\" ng-disabled=\"!isValid()\" ng-click=\"save()\"\n             ng-class=\"{\'nav-primary\' : modified}\"\n             title=\"Saves the Mappings document\">\n            <i class=\"fa fa-save\"></i> Save</a>\n        </li>\n        <li class=\"pull-right\">\n          <a href=\"\" id=\"cancelButton\" ng-click=\"cancel()\"\n             title=\"Discards any updates\">\n            <i class=\"fa fa-remove\"></i> Cancel</a>\n        </li>\n\n        <li class=\"pull-right\">\n          <a ng-href=\"{{sourceLink()}}\" title=\"View source code\"\n             data-placement=\"bottom\">\n            <i class=\"fa fa-file-o\"></i> Source</a>\n        </li>\n      </ul>\n    </div>\n  </div>\n\n  <div class=\"tabbable hawtio-form-tabs\" ng-model=\"tab\" ng-hide=\"missingContainer\">\n\n    <div class=\"tab-pane\" title=\"Mappings\">\n\n      <div class=\"row\">\n        <div class=\"col-md-12 centered spacer\">\n          <select class=\"no-bottom-margin\" ng-model=\"selectedMapping\" ng-options=\"m.map_id for m in mappings\"></select>\n          <button class=\"btn\"\n                  ng-click=\"addMapping()\"\n                  title=\"Add mapping\">\n            <i class=\"fa fa-plus\"></i>\n          </button>\n          <button class=\"btn\"\n                  ng-click=\"deleteDialog = true\"\n                  title=\"Delete mapping\">\n            <i class=\"fa fa-minus\"></i>\n          </button>\n          &nbsp;\n          &nbsp;\n          <label class=\"inline-block\" for=\"map_id\">Map ID: </label>\n          <input id=\"map_id\" type=\"text\" class=\"input-xxlarge no-bottom-margin\" ng-model=\"selectedMapping.map_id\">\n        </div>\n      </div>\n\n      <div class=\"row\">\n        <!-- \"From\" class header -->\n        <div class=\"col-md-5\">\n          <div class=\"row\">\n            <input type=\"text\" class=\"col-md-12\"\n                   ng-model=\"aName\"\n                   typeahead=\"title for title in classNames($viewValue) | filter:$viewValue\"\n                   typeahead-editable=\"true\" title=\"Java classname for class \'A\'\"\n                   placeholder=\"Java classname for class \'A\'\">\n          </div>\n          <div class=\"row\" ng-show=\"selectedMapping.class_a.error\">\n            <div class=\"alert alert-error\">\n              <div class=\"expandable closed\">\n                <div class=\"title\">\n                  <i class=\"expandable-indicator\"></i> Failed to load properties for {{selectedMapping.class_a.value}} due to {{selectedMapping.class_a.error.type}}\n                </div>\n                <div class=\"expandable-body well\">\n                  <div ng-bind-html-unsafe=\"formatStackTrace(selectedMapping.class_a.error.stackTrace)\"></div>\n                </div>\n              </div>\n            </div>\n          </div>\n        </div>\n\n        <div class=\"col-md-2 centered\">\n          <button class=\"btn\" ng-click=\"doReload()\" ng-disabled=\"disableReload()\"><i class=\"fa fa-refresh\"></i> Reload</button>\n        </div>\n\n        <!-- \"To\" class header -->\n        <div class=\"col-md-5\">\n          <div class=\"row\">\n            <input type=\"text\" class=\"col-md-12\"\n                   ng-model=\"bName\"\n                   typeahead=\"title for title in classNames($viewValue) | filter:$viewValue\"\n                   typeahead-editable=\"true\" title=\"Java classname for class \'B\'\"\n                   placeholder=\"Java classname for class \'B\'\">\n          </div>\n          <div class=\"row\" ng-show=\"selectedMapping.class_b.error\">\n            <div class=\"alert alert-error\">\n              <div class=\"expandable closed\">\n                <div class=\"title\">\n                  <i class=\"expandable-indicator\"></i> Failed to load properties for {{selectedMapping.class_b.value}} due to {{selectedMapping.class_b.error.type}}\n                </div>\n                <div class=\"expandable-body well\">\n                  <div ng-bind-html-unsafe=\"formatStackTrace(selectedMapping.class_b.error.stackTrace)\"></div>\n                </div>\n              </div>\n            </div>\n          </div>\n        </div>\n\n      </div>\n\n      <script type=\"text/ng-template\" id=\"property.html\">\n        <span class=\"jsplumb-node dozer-mapping-node\"\n              id=\"{{field.id}}\"\n              anchors=\"{{field.anchor}}\"\n              field-path=\"{{field.path}}\">\n          <strong>{{field.displayName}}</strong> : <span class=\"typeName\">{{field.typeName}}</span>\n        </span>\n        <ul>\n          <li ng-repeat=\"field in field.properties\"\n              ng-include=\"\'property.html\'\"></li>\n        </ul>\n      </script>\n\n\n      <script type=\"text/ng-template\" id=\"pageTemplate.html\">\n        <div hawtio-jsplumb draggable=\"false\" layout=\"false\" timeout=\"500\">\n\n          <!-- \"from\" class -->\n          <div class=\"col-md-6\">\n            <div class=\"row\" ng-hide=\"selectedMapping.class_a.error\">\n              <ul class=\"dozer-mappings from\">\n                <li ng-repeat=\"field in selectedMapping.class_a.properties\"\n                    ng-include=\"\'property.html\'\"></li>\n              </ul>\n            </div>\n          </div>\n\n\n          <!-- \"to\" class -->\n          <div class=\"col-md-6\">\n            <div class=\"row\" ng-hide=\"selectedMapping.class_b.error\">\n              <ul class=\"dozer-mappings to\">\n                <li ng-repeat=\"field in selectedMapping.class_b.properties\"\n                    ng-include=\"\'property.html\'\"></li>\n              </ul>\n            </div>\n          </div>\n        </div>\n      </script>\n      <div class=\"row\" compile=\"main\"></div>\n\n    </div>\n\n    <div class=\"tab-pane\" title=\"Tree\">\n\n      <div class=\"row\">\n        <div class=\"col-md-12\">\n          <ul class=\"nav nav-pills\">\n            <li>\n              <a href=\'\' title=\"Add a new mapping between two classes\" ng-click=\"addMapping()\" data-placement=\"bottom\">\n                <i class=\"fa fa-plus\"></i> Class</a></li>\n            <li>\n              <a href=\'\' title=\"Add new mappings between fields in these classes\" ng-disable=\"!selectedMapping\" ng-click=\"addField()\" data-placement=\"bottom\">\n                <i class=\"fa fa-plus\"></i> Field</a></li>\n            <li>\n              <a href=\'\' title=\"Deletes the selected item\" ng-disabled=\"!canDelete()\" ng-click=\"deleteDialog = true\" data-placement=\"bottom\">\n                <i class=\"fa fa-remove\"></i> Delete</a></li>\n          </ul>\n        </div>\n      </div>\n\n      <div class=\"row\">\n        <div id=\"tree-container\" class=\"col-md-4\">\n          <div hawtio-tree=\"mappingTree\" onselect=\"onNodeSelect\" onDragEnter=\"onNodeDragEnter\" onDrop=\"onNodeDrop\"\n               onRoot=\"onRootTreeNode\"\n               hideRoot=\"true\"></div>\n        </div>\n\n        <div class=\"col-md-8\">\n          <div ng-include=\"propertiesTemplate\"></div>\n        </div>\n      </div>\n\n      <div hawtio-confirm-dialog=\"deleteDialog\"\n           ok-button-text=\"Delete\"\n           on-ok=\"removeNode()\">\n        <div class=\"dialog-body\">\n          <p>You are about to delete the selected {{selectedDescription}}\n          </p>\n          <p>This operation cannot be undone so please be careful.</p>\n        </div>\n      </div>\n\n      <div class=\"modal-large\">\n        <div modal=\"addDialog.show\" close=\"addDialog.close()\" ng-options=\"addDialog.options\">\n          <form class=\"form-horizontal no-bottom-margin\" ng-submit=\"addAndCloseDialog()\">\n            <div class=\"modal-header\"><h4>Add Fields</h4></div>\n            <div class=\"modal-body\">\n              <table class=\"\">\n                <tr>\n                  <th>From</th>\n                  <th></th>\n                  <th>To</th>\n                  <th>Exclude</th>\n                </tr>\n                <tr ng-repeat=\"unmapped in unmappedFields\">\n                  <td>\n                    {{unmapped.fromField}}\n                  </td>\n                  <td>-></td>\n                  <td>\n                    <input type=\"text\" ng-model=\"unmapped.toField\" ng-change=\"onUnmappedFieldChange(unmapped)\"\n                           typeahead=\"title for title in toFieldNames($viewValue) | filter:$viewValue\" typeahead-editable=\'true\'\n                           title=\"The field to map to\"/>\n                  </td>\n                  <td>\n                    <input type=\"checkbox\" ng-model=\"unmapped.exclude\" ng-click=\"onUnmappedFieldChange(unmapped)\"\n                           title=\"Whether or not the field should be excluded\"/>\n                  </td>\n                </tr>\n              </table>\n            </div>\n            <div class=\"modal-footer\">\n              <input id=\"submit\" class=\"btn btn-primary add\" type=\"submit\" ng-disabled=\"!unmappedFieldsHasValid\"\n                     value=\"Add\">\n              <button class=\"btn btn-warning cancel\" type=\"button\" ng-click=\"addDialog.close()\">Cancel</button>\n            </div>\n          </form>\n        </div>\n      </div>\n    </div>\n\n  </div>\n\n  <div class=\"jumbotron\" ng-show=\"missingContainer\">\n    <p>You cannot edit the dozer mapping file as there is no container running for the profile <b>{{profileId}}</b>.</p>\n\n    <p>\n      <a class=\"btn btn-primary btn-lg\"\n         href=\"#/fabric/containers/createContainer?profileIds={{profileId}}&versionId={{versionId}}\">\n        Create a container for: <strong>{{profileId}}</strong>\n      </a>\n    </p>\n  </div>\n</div>\n");
$templateCache.put("plugins/wiki/html/dozerPropertiesEdit.html","<div simple-form name=\"formEditor\" entity=\'dozerEntity\' data=\'nodeModel\' schema=\"schema\"></div>\n");
$templateCache.put("plugins/wiki/html/editPage.html","<div ng-controller=\"Wiki.EditController\">\n  <div class=\"row\">\n    <div hawtio-breadcrumbs></div>\n  </div>\n\n  <div class=\"wiki logbar\" ng-controller=\"Wiki.NavBarController\">\n    <div class=\"wiki logbar-container\">\n      <ul class=\"nav nav-tabs\">\n        <li ng-repeat=\"link in breadcrumbs\" ng-class=\'{active : isActive(link.href)}\'>\n          <a ng-href=\"{{link.href}}{{hash}}\">{{link.name}}</a>\n        </li>\n\n        <li class=\"pull-right\">\n          <a id=\"saveButton\"\n             href=\"\"\n             ng-disabled=\"canSave()\"\n             ng-click=\"save()\"\n             title=\"Saves the updated wiki page\">\n            <i class=\"fa fa-save\"></i> Save</a>\n        </li>\n        <li class=\"pull-right\">\n          <a id=\"cancelButton\"\n             href=\"\"\n             ng-click=\"cancel()\"\n             title=\"Discards any updates\">\n            <i class=\"fa fa-remove\"></i> Cancel</a>\n        </li>\n      </ul>\n    </div>\n  </div>\n\n  <div class=\"wiki-fixed form-horizontal\">\n    <div class=\"control-group editor-autoresize\">\n      <div ng-include=\"sourceView\" class=\"editor-autoresize\"></div>\n    </div>\n  </div>\n</div>\n");
$templateCache.put("plugins/wiki/html/formEdit.html","<div simple-form name=\"formEditor\" entity=\'formEntity\' data=\'formDefinition\'></div>\n");
$templateCache.put("plugins/wiki/html/formTable.html","<div ng-controller=\"Wiki.FormTableController\">\n  <div class=\"logbar\" ng-controller=\"Wiki.NavBarController\">\n    <div class=\"wiki logbar-container\">\n      <ul class=\"nav nav-tabs\">\n        <li ng-repeat=\"link in breadcrumbs\" ng-class=\'{active : isActive(link.href)}\'>\n          <a ng-href=\"{{link.href}}{{hash}}\">{{link.name}}</a>\n        </li>\n\n        <li class=\"pull-right\">\n          <a ng-href=\"{{editLink()}}{{hash}}\" ng-hide=\"!editLink()\" title=\"Edit this page\"\n             data-placement=\"bottom\">\n            <i class=\"fa fa-edit\"></i> Edit</a></li>\n        <li class=\"pull-right\">\n          <a ng-href=\"{{historyLink}}{{hash}}\" ng-hide=\"!historyLink\" title=\"View the history of this file\"\n             data-placement=\"bottom\">\n            <i class=\"fa fa-comments-alt\"></i> History</a></li>\n        <li class=\"pull-right\">\n          <a ng-href=\"{{createLink()}}{{hash}}\" title=\"Create new page\"\n             data-placement=\"bottom\">\n            <i class=\"fa fa-plus\"></i> Create</a></li>\n        <li class=\"pull-right\" ng-show=\"sourceLink()\">\n          <a ng-href=\"{{sourceLink()}}\" title=\"View source code\"\n             data-placement=\"bottom\">\n            <i class=\"fa fa-file-o\"></i> Source</a></li>\n      </ul>\n    </div>\n  </div>\n\n  <div class=\"wiki-fixed row\">\n    <input class=\"search-query col-md-12\" type=\"text\" ng-model=\"gridOptions.filterOptions.filterText\"\n           placeholder=\"Filter...\">\n  </div>\n\n  <div class=\"form-horizontal\">\n    <div class=\"row\">\n      <div ng-include=\"tableView\"></div>\n    </div>\n  </div>\n</div>\n");
$templateCache.put("plugins/wiki/html/formTableDatatable.html","<div class=\"gridStyle\" hawtio-datatable=\"gridOptions\"></div>\n");
$templateCache.put("plugins/wiki/html/formView.html","<div simple-form name=\"formViewer\" mode=\'view\' entity=\'formEntity\' data=\'formDefinition\'></div>\n");
$templateCache.put("plugins/wiki/html/gitPreferences.html","<div title=\"Git\" ng-controller=\"Wiki.GitPreferences\">\n  <div hawtio-form-2=\"config\" entity=\"entity\"></div>\n</div>\n");
$templateCache.put("plugins/wiki/html/history.html","<link rel=\"stylesheet\" href=\"plugins/wiki/css/wiki.css\" type=\"text/css\"/>\n\n<div ng-controller=\"Wiki.HistoryController\">\n  <script type=\"text/ng-template\" id=\"changeCellTemplate.html\">\n    <div class=\"ngCellText\">\n      <a class=\"commit-link\" ng-href=\"{{row.entity.commitLink}}{{hash}}\" title=\"{{row.entity.sha}}\">{{row.entity.sha | limitTo:7}}\n        <i class=\"fa fa-circle-arrow-right\"></i></a>\n    </div>\n  </script>\n\n  <div class=\"row\">\n    <div hawtio-breadcrumbs></div>\n  </div>\n\n  <div ng-hide=\"inDashboard\" class=\"wiki logbar\" ng-controller=\"Wiki.NavBarController\">\n    <div class=\"wiki logbar-container\">\n      <ul class=\"nav nav-tabs\">\n        <li ng-show=\"branches.length || branch\" class=\"dropdown\">\n          <a href=\"#\" class=\"dropdown-toggle\" data-toggle=\"dropdown\"\n             title=\"The branch to view\">\n            {{branch || \'branch\'}}\n            <span class=\"caret\"></span>\n          </a>\n          <ul class=\"dropdown-menu\">\n            <li ng-repeat=\"otherBranch in branches\">\n              <a ng-href=\"{{branchLink(otherBranch)}}{{hash}}\"\n                 ng-hide=\"otherBranch === branch\"\n                 title=\"Switch to the {{otherBranch}} branch\"\n                 data-placement=\"bottom\">\n                {{otherBranch}}</a>\n            </li>\n          </ul>\n        </li>\n        <li ng-repeat=\"link in breadcrumbs\">\n          <a ng-href=\"{{link.href}}{{hash}}\">{{link.name}}</a>\n        </li>\n        <li class=\"ng-scope active\">\n          <a>History</a>\n        </li>\n\n        <li class=\"pull-right\" hawtio-show object-name=\"{{gitMBean}}\" method-name=\"write\">\n          <a ng-href=\"{{editLink()}}{{hash}}\" ng-hide=\"!editLink()\" title=\"Edit this page\"\n             data-placement=\"bottom\">\n            <i class=\"fa fa-edit\"></i> Edit</a></li>\n        <li class=\"pull-right\">\n          <a ng-href=\"{{historyLink}}{{hash}}\" ng-hide=\"!historyLink\" title=\"View the history of this file\"\n             data-placement=\"bottom\">\n            <i class=\"fa fa-comments-alt\"></i> History</a></li>\n        <li class=\"pull-right\" hawtio-show object-name=\"{{gitMBean}}\" method-name=\"write\">\n          <a ng-href=\"{{createLink()}}{{hash}}\" title=\"Create new page\"\n             data-placement=\"bottom\">\n            <i class=\"fa fa-plus\"></i> Create</a></li>\n      </ul>\n    </div>\n  </div>\n\n  <div class=\"wiki-fixed row\">\n    <div class=\"col-md-4\">\n      <div class=\"control-group\">\n        <button class=\"btn\" ng-disabled=\"!gridOptions.selectedItems.length\" ng-click=\"diff()\"\n                title=\"Compare the selected versions of the files to see how they differ\"><i\n                class=\"fa fa-exchange\"></i>\n          Compare\n        </button>\n\n        <button class=\"btn\" ng-disabled=\"!canRevert()\" ng-click=\"revert()\"\n                title=\"Revert to this version of the file\" hawtio-show object-name=\"{{gitMBean}}\" method-name=\"revertTo\"><i class=\"fa fa-exchange\"></i> Revert\n        </button>\n      </div>\n    </div>\n    <div class=\"col-md-8\">\n      <div class=\"control-group\">\n        <input class=\"col-md-12 search-query\" type=\"text\" ng-model=\"gridOptions.filterOptions.filterText\"\n               placeholder=\"search\">\n      </div>\n    </div>\n  </div>\n\n  <div class=\"form-horizontal\">\n    <div class=\"row\">\n      <div class=\"col-md-12\">\n        <table class=\"table-condensed table-striped\" hawtio-simple-table=\"gridOptions\"></table>\n      </div>\n    </div>\n\n  </div>\n</div>\n");
$templateCache.put("plugins/wiki/html/layoutWiki.html","<div class=\"row\" ng-controller=\"Wiki.TopLevelController\">\n  <div ng-view></div>\n</div>\n\n");
$templateCache.put("plugins/wiki/html/sourceEdit.html","<textarea id=\"source\" ui-codemirror=\"codeMirrorOptions\" ng-model=\"entity.source\"></textarea>\n");
$templateCache.put("plugins/wiki/html/sourceView.html","<textarea id=\"source\" ui-codemirror=\"codeMirrorOptions\" ng-model=\"source\"></textarea>\n");
$templateCache.put("plugins/wiki/html/viewBook.html","<div ng-controller=\"Wiki.ViewController\">\n\n  <script type=\"text/ng-template\" id=\"fileCellTemplate.html\">\n    <div class=\"ngCellText\"\n         title=\"{{fileName(row.entity)}} - Last Modified: {{row.entity.lastModified | date:\'medium\'}}, Size: {{row.entity.length}}\">\n      <a href=\"{{childLink(row.entity)}}\" class=\"file-name\">\n        <span class=\"file-icon\"\n              ng-class=\"fileClass(row.entity)\"\n              ng-bind-html-unsafe=\"fileIconHtml(row)\">\n\n              </span>{{fileName(row.entity)}}\n      </a>\n    </div>\n  </script>\n\n  <script type=\"text/ng-template\" id=\"fileColumnTemplate.html\">\n\n    <div class=\"ngHeaderSortColumn {{col.headerClass}}\"\n         ng-style=\"{\'cursor\': col.cursor}\"\n         ng-class=\"{ \'ngSorted\': !noSortVisible }\">\n\n      <div class=\"ngHeaderText\" ng-hide=\"pageId === \'/\'\">\n        <a ng-href=\"{{parentLink()}}\"\n           class=\"wiki-file-list-up\"\n           title=\"Open the parent folder\">\n          <i class=\"fa fa-level-up\"></i> Up a directory\n        </a>\n      </div>\n    </div>\n\n  </script>\n\n  <ng-include src=\"\'plugins/wiki/html/viewNavBar.html\'\"></ng-include>\n\n  <div class=\"wiki-fixed form-horizontal\">\n    <div class=\"row\">\n      <div class=\"tocify\" wiki-href-adjuster>\n        <!-- TODO we maybe want a more flexible way to find the links to include than the current link-filter -->\n        <div hawtio-toc-display get-contents=\"getContents(filename, cb)\"\n             html=\"html\" link-filter=\"[file-extension]\">\n        </div>\n      </div>\n      <div class=\"toc-content\" id=\"toc-content\"></div>\n    </div>\n  </div>\n</div>\n");
$templateCache.put("plugins/wiki/html/viewNavBar.html","<div class=\"row\">\n  <div hawtio-breadcrumbs></div>\n</div>\n\n<!--\n<div class=\"row\">\n  <div hawtio-tabs></div>\n</div>\n-->\n<div ng-hide=\"inDashboard\" class=\"wiki logbar\" ng-controller=\"Wiki.NavBarController\">\n  <div class=\"wiki logbar-container\">\n    <ul class=\"nav nav-tabs\">\n      <li ng-show=\"branches.length || branch\">\n        <div hawtio-drop-down=\"branchMenuConfig\"></div>\n      </li>\n      <li ng-repeat=\"link in breadcrumbs\" ng-class=\'{active : isActive(link.href) && !objectId}\'>\n        <a class=\"breadcrumb-link\" ng-href=\"{{link.href}}\">\n          <span class=\"contained c-medium\">{{link.name}}</span>\n        </a>\n      </li>\n      <li ng-show=\"objectId\">\n        <a ng-href=\"{{historyLink}}{{hash}}\">History</a>\n      </li>\n      <li ng-show=\"objectId\" class=\"active\">\n        <a>{{objectId}}</a>\n      </li>\n\n      <li class=\"pull-right dropdown\">\n        <a href=\"\" class=\"dropdown-toggle\" data-toggle=\"dropdown\">\n          <i class=\"fa fa-ellipsis-v\"></i>\n        </a>\n        <ul class=\"dropdown-menu\">\n          <li ng-show=\"sourceLink()\">\n            <a ng-href=\"{{sourceLink()}}\" title=\"View source code\"\n               data-placement=\"bottom\">\n              <i class=\"fa fa-file-o\"></i> Source</a>\n          </li>\n          <li>\n            <a ng-href=\"{{historyLink}}{{hash}}\" ng-hide=\"!historyLink\" title=\"View the history of this file\"\n               data-placement=\"bottom\">\n              <i class=\"fa fa-comments-alt\"></i> History</a>\n          </li>\n          <!--\n          <li class=\"divider\">\n          </li>\n          -->\n          <li ng-hide=\"gridOptions.selectedItems.length !== 1\" hawtio-show object-name=\"{{gitMBean}}\" method-name=\"rename\">\n            <a ng-click=\"openRenameDialog()\"\n               title=\"Rename the selected document\"\n               data-placement=\"bottom\">\n              <i class=\"fa fa-adjust\"></i> Rename</a>\n          </li>\n          <li ng-hide=\"!gridOptions.selectedItems.length\" hawtio-show object-name=\"{{gitMBean}}\" method-name=\"rename\">\n            <a ng-click=\"openMoveDialog()\"\n               title=\"move the selected documents to a new folder\"\n               data-placement=\"bottom\">\n              <i class=\"fa fa-move\"></i> Move</a>\n          </li>\n          <!--\n          <li class=\"divider\">\n          </li>\n          -->\n          <li ng-hide=\"!gridOptions.selectedItems.length\" hawtio-show object-name=\"{{gitMBean}}\" method-name=\"remove\">\n            <a ng-click=\"openDeleteDialog()\"\n               title=\"Delete the selected document(s)\"\n               data-placement=\"bottom\">\n              <i class=\"fa fa-remove\"></i> Delete</a>\n          </li>\n          <li class=\"divider\" ng-show=\"childActions.length\">\n          </li>\n          <li ng-repeat=\"childAction in childActions\">\n            <a ng-click=\"childAction.doAction()\"\n               title=\"{{childAction.title}}\"\n               data-placement=\"bottom\">\n              <i class=\"{{childAction.icon}}\"></i> {{childAction.name}}</a>\n          </li>\n        </ul>\n      </li>\n      <li class=\"pull-right\" hawtio-show object-name=\"{{gitMBean}}\" method-name=\"write\">\n        <a ng-href=\"{{editLink()}}{{hash}}\" ng-hide=\"!editLink()\" title=\"Edit this page\"\n           data-placement=\"bottom\">\n          <i class=\"fa fa-edit\"></i> Edit</a>\n      </li>\n      <li class=\"pull-right\" hawtio-show object-name=\"{{gitMBean}}\" method-name=\"write\">\n        <a ng-href=\"{{createLink()}}{{hash}}\"\n           title=\"Create new page\"\n           data-placement=\"bottom\">\n          <i class=\"fa fa-plus\"></i> Create</a>\n      </li>\n      <li class=\"pull-right\">\n        <div class=\"btn-group\" \n             ng-hide=\"!children || profile\">\n          <a class=\"btn btn-sm\"\n             ng-disabled=\"mode == ViewMode.List\"\n             href=\"\" \n             ng-click=\"setViewMode(ViewMode.List)\">\n            <i class=\"fa fa-list\"></i></a>\n          <a class=\"btn btn-sm\" \n             ng-disabled=\"mode == ViewMode.Icon\"\n             href=\"\" \n             ng-click=\"setViewMode(ViewMode.Icon)\">\n            <i class=\"fa fa-th-large\"></i></a>\n        </div>\n      </li>\n<!--\n      <li class=\"pull-right\">\n        <a href=\"\" ng-hide=\"children || profile\" title=\"Add to dashboard\" ng-href=\"{{createDashboardLink()}}\"\n           data-placement=\"bottom\">\n          <i class=\"fa fa-share\"></i>\n        </a>\n      </li>\n-->\n    </ul>\n  </div>\n</div>\n\n\n");
$templateCache.put("plugins/wiki/html/viewPage.html","<div ng-controller=\"Wiki.ViewController\">\n  <script type=\"text/ng-template\" id=\"fileCellTemplate.html\">\n    <div class=\"ngCellText\"\n         title=\"{{fileName(row.entity)}} - Last Modified: {{row.entity.lastModified | date:\'medium\'}}, Size: {{row.entity.size}}\">\n      <a href=\"{{childLink(row.entity)}}\" class=\"file-name\" hawtio-file-drop=\"{{row.entity.fileName}}\" download-url=\"{{row.entity.downloadURL}}\">\n        <span class=\"file-icon\"\n              ng-class=\"fileClass(row.entity)\"\n              compile=\"fileIconHtml(row)\">\n        </span>{{fileName(row.entity)}}\n      </a>\n    </div>\n  </script>\n\n  <script type=\"text/ng-template\" id=\"fileColumnTemplate.html\">\n    <div class=\"ngHeaderSortColumn {{col.headerClass}}\"\n         ng-style=\"{\'cursor\': col.cursor}\"\n         ng-class=\"{ \'ngSorted\': !noSortVisible }\">\n      <div class=\"ngHeaderText\" ng-hide=\"pageId === \'/\'\">\n        <a ng-href=\"{{parentLink()}}\"\n           class=\"wiki-file-list-up\"\n           title=\"Open the parent folder\">\n          <i class=\"fa fa-level-up\"></i> Up a directory\n        </a>\n      </div>\n    </div>\n  </script>\n\n  <script type=\"text/ng-template\" id=\"imageTemplate.html\">\n    <img src=\"{{imageURL}}\">\n  </script>\n\n  <ng-include src=\"\'plugins/wiki/html/viewNavBar.html\'\"></ng-include>\n\n  <!-- Icon View -->\n  <div ng-show=\"mode == ViewMode.Icon\" class=\"wiki-fixed\">\n    <div ng-hide=\"!showAppHeader\">\n      <div class=\"row\">\n        <div class=\"col-md-12\">\n          <div kubernetes-json=\"kubernetesJson\"></div>\n        </div>\n      </div>\n    </div>\n    <div class=\"row\" ng-show=\"html && children\">\n      <div class=\"col-md-12 wiki-icon-view-header\">\n        <h5>Directories and Files</h5>\n      </div>\n    </div>\n    <div class=\"row\" ng-hide=\"!directory\">\n      <div class=\"col-md-12\" ng-controller=\"Wiki.FileDropController\">\n        <div class=\"wiki-icon-view\" nv-file-drop nv-file-over uploader=\"uploader\" over-class=\"ready-drop\">\n          <div class=\"column-box mouse-pointer well\"\n               ng-repeat=\"child in children track by $index\"\n               ng-class=\"isInGroup(gridOptions.selectedItems, child, \'selected\', \'\')\"\n               ng-click=\"toggleSelectionFromGroup(gridOptions.selectedItems, child)\">\n            <div class=\"row\">\n              <div class=\"col-md-2\" hawtio-file-drop=\"{{child.fileName}}\" download-url=\"{{child.downloadURL}}\">\n                  <span class=\"app-logo\" ng-class=\"fileClass(child)\" compile=\"fileIconHtml(child)\"></span>\n              </div>\n              <div class=\"col-md-10\">\n                <h3>\n                  <a href=\"{{childLink(child)}}\">{{child.displayName || child.name}}</a>\n                </h3>\n              </div>\n            </div>\n            <div class=\"row\" ng-show=\"child.summary\">\n              <div class=\"col-md-12\">\n                <p compile=\"marked(child.summary)\"></p>\n              </div>\n            </div>\n          </div>\n        </div>\n      </div>\n    </div>\n    <div ng-hide=\"!html\" wiki-href-adjuster wiki-title-linker>\n      <div class=\"row\" style=\"margin-left: 10px\">\n        <div class=\"col-md-12\">\n          <div compile=\"html\"></div>\n        </div>\n      </div>\n    </div>\n  </div>\n  <!-- end Icon view -->\n\n  <!-- start List view -->\n  <div ng-show=\"mode == ViewMode.List\" class=\"wiki-fixed\">\n    <hawtio-pane position=\"left\" width=\"300\">\n      <div ng-controller=\"Wiki.FileDropController\">\n        <div class=\"wiki-list-view\" nv-file-drop nv-file-over uploader=\"uploader\" over-class=\"ready-drop\">\n          <div class=\"wiki-grid\" hawtio-list=\"gridOptions\"></div>\n        </div>\n      </div>\n    </hawtio-pane>\n    <div class=\"row\">\n      <div ng-class=\"col-md-12\">\n        <div ng-hide=\"!showProfileHeader\">\n          <div class=\"row\">\n            <div class=\"col-md-12\">\n              <div fabric-profile-details version-id=\"versionId\" profile-id=\"profileId\"></div>\n              <p></p>\n            </div>\n          </div>\n        </div>\n        <div ng-hide=\"!showAppHeader\">\n          <div class=\"row\">\n            <div class=\"col-md-12\">\n              <div kubernetes-json=\"kubernetesJson\" children=\"children\"></div>\n            </div>\n          </div>\n        </div>\n        <div ng-hide=\"!html\" wiki-href-adjuster wiki-title-linker>\n          <div class=\"row\" style=\"margin-left: 10px\">\n            <div class=\"col-md-12\">\n              <div compile=\"html\"></div>\n            </div>\n          </div>\n        </div>\n      </div>\n    </div>\n  </div>\n  <!-- end List view -->\n  <div ng-include=\"sourceView\" class=\"editor-autoresize\"></div>\n</div>\n");
$templateCache.put("plugins/wiki/html/modal/deleteDialog.html","<div>\n  <form class=\"form-horizontal\" ng-submit=\"deleteAndCloseDialog()\">\n    <div class=\"modal-header\"><h4>Delete Document</h4></div>\n    <div class=\"modal-body\">\n      <div class=\"control-group\">\n        <p>You are about to delete\n          <ng-pluralize count=\"gridOptions.selectedItems.length\"\n                        when=\"{\'1\': \'this document!\', \'other\': \'these {} documents!\'}\">\n          </ng-pluralize>\n        </p>\n\n        <div ng-bind-html-unsafe=\"selectedFileHtml\"></div>\n        <p class=\"alert alert-danger\" ng-show=\"warning\" ng-bind-html-unsafe=\"warning\">\n        </p>\n      </div>\n    </div>\n    <div class=\"modal-footer\">\n      <input class=\"btn btn-primary\" type=\"submit\"\n             value=\"Delete\">\n      <button class=\"btn btn-warning cancel\" type=\"button\" ng-click=\"close()\">Cancel</button>\n    </div>\n  </form>\n</div>\n");
$templateCache.put("plugins/wiki/html/modal/moveDialog.html","<div>\n    <form class=\"form-horizontal\" ng-submit=\"moveAndCloseDialog()\">\n    <div class=\"modal-header\"><h4>Move Document</h4></div>\n    <div class=\"modal-body\">\n      <div class=\"control-group\">\n        <label class=\"control-label\" for=\"moveFolder\">Folder</label>\n\n        <div class=\"controls\">\n          <input type=\"text\" id=\"moveFolder\" ng-model=\"move.moveFolder\"\n                 typeahead=\"title for title in folderNames($viewValue) | filter:$viewValue\" typeahead-editable=\'true\'>\n        </div>\n      </div>\n    </div>\n    <div class=\"modal-footer\">\n      <input class=\"btn btn-primary\" type=\"submit\"\n             ng-disabled=\"!move.moveFolder\"\n             value=\"Move\">\n      <button class=\"btn btn-warning cancel\" type=\"button\" ng-click=\"close()\">Cancel</button>\n    </div>\n  </form>\n</div>");
$templateCache.put("plugins/wiki/html/modal/renameDialog.html","<div>\n  <form class=\"form-horizontal\" ng-submit=\"renameAndCloseDialog()\">\n    <div class=\"modal-header\"><h4>Rename Document</h4></div>\n    <div class=\"modal-body\">\n      <div class=\"row\">\n        <div class=\"form-group\">\n          <label class=\"col-sm-2 control-label\" for=\"renameFileName\">Name</label>\n\n          <div class=\"col-sm-10\">\n            <input type=\"text\" id=\"renameFileName\" ng-model=\"rename.newFileName\">\n          </div>\n        </div>\n\n        <div class=\"form-group\">\n          <div ng-show=\"fileExists.exists\" class=\"alert\">\n            Please choose a different name as <b>{{fileExists.name}}</b> already exists\n          </div>\n        </div>\n      </div>\n    </div>\n    <div class=\"modal-footer\">\n      <input class=\"btn btn-primary\" type=\"submit\"\n             ng-disabled=\"!fileName || fileExists.exists\"\n             value=\"Rename\">\n      <button class=\"btn btn-warning cancel\" type=\"button\" ng-click=\"close()\">Cancel</button>\n    </div>\n  </form>\n</div>\n");}]); hawtioPluginLoader.addModule("fabric8-console-templates");