

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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImluY2x1ZGVzLmpzIiwiZm9yZ2UvdHMvZm9yZ2VIZWxwZXJzLnRzIiwiZm9yZ2UvdHMvZm9yZ2VQbHVnaW4udHMiLCJmb3JnZS90cy9jb21tYW5kLnRzIiwiZm9yZ2UvdHMvY29tbWFuZHMudHMiLCJmb3JnZS90cy9yZXBvLnRzIiwiZm9yZ2UvdHMvcmVwb3MudHMiLCJtYWluL3RzL21haW5HbG9iYWxzLnRzIiwibWFpbi90cy9tYWluUGx1Z2luLnRzIiwibWFpbi90cy9hYm91dC50cyIsIndpa2kvdHMvd2lraUhlbHBlcnMudHMiLCJ3aWtpL3RzL3dpa2lQbHVnaW4udHMiLCJ3aWtpL3RzL2NhbWVsLnRzIiwid2lraS90cy9jYW1lbENhbnZhcy50cyIsIndpa2kvdHMvY29tbWl0LnRzIiwid2lraS90cy9jcmVhdGUudHMiLCJ3aWtpL3RzL2VkaXQudHMiLCJ3aWtpL3RzL2ZpbGVEcm9wLnRzIiwid2lraS90cy9mb3JtVGFibGUudHMiLCJ3aWtpL3RzL2dpdFByZWZlcmVuY2VzLnRzIiwid2lraS90cy9oaXN0b3J5LnRzIiwid2lraS90cy9uYXZiYXIudHMiLCJ3aWtpL3RzL3ZpZXcudHMiLCJ3aWtpL3RzL3dpa2lEaWFsb2dzLnRzIiwid2lraS90cy93aWtpRGlyZWN0aXZlcy50cyIsIndpa2kvdHMvd2lraU5hdmlnYXRpb24udHMiLCJ3aWtpL3RzL3dpa2lSZXBvc2l0b3J5LnRzIiwid2lraS90cy93aWtpVG9wTGV2ZWwudHMiXSwibmFtZXMiOlsiRm9yZ2UiLCJGb3JnZS5pc0ZvcmdlIiwiRm9yZ2UuaW5pdFNjb3BlIiwiRm9yZ2UuY29tbWFuZExpbmsiLCJGb3JnZS5jb21tYW5kc0xpbmsiLCJGb3JnZS5yZXBvc0FwaVVybCIsIkZvcmdlLnJlcG9BcGlVcmwiLCJGb3JnZS5jb21tYW5kQXBpVXJsIiwiRm9yZ2UuZXhlY3V0ZUNvbW1hbmRBcGlVcmwiLCJGb3JnZS52YWxpZGF0ZUNvbW1hbmRBcGlVcmwiLCJGb3JnZS5jb21tYW5kSW5wdXRBcGlVcmwiLCJGb3JnZS5tb2RlbFByb2plY3QiLCJGb3JnZS5zZXRNb2RlbENvbW1hbmRzIiwiRm9yZ2UuZ2V0TW9kZWxDb21tYW5kcyIsIkZvcmdlLm1vZGVsQ29tbWFuZElucHV0TWFwIiwiRm9yZ2UuZ2V0TW9kZWxDb21tYW5kSW5wdXRzIiwiRm9yZ2Uuc2V0TW9kZWxDb21tYW5kSW5wdXRzIiwiRm9yZ2UuZW5yaWNoUmVwbyIsIkZvcmdlLmNyZWF0ZUh0dHBDb25maWciLCJGb3JnZS5hZGRRdWVyeUFyZ3VtZW50IiwiRm9yZ2UuY3JlYXRlSHR0cFVybCIsIkZvcmdlLmNvbW1hbmRNYXRjaGVzVGV4dCIsIkZvcmdlLmlzTG9nZ2VkSW50b0dvZ3MiLCJGb3JnZS5yZWRpcmVjdFRvR29nc0xvZ2luSWZSZXF1aXJlZCIsIkZvcmdlLm9uUm91dGVDaGFuZ2VkIiwiRm9yZ2UudXBkYXRlU2NoZW1hIiwiRm9yZ2UudmFsaWRhdGUiLCJGb3JnZS50b0JhY2tncm91bmRTdHlsZSIsIkZvcmdlLnVwZGF0ZURhdGEiLCJGb3JnZS5vblNjaGVtYUxvYWQiLCJGb3JnZS5jb21tYW5kTWF0Y2hlcyIsIkZvcmdlLmRvRGVsZXRlIiwiRm9yZ2UudXBkYXRlTGlua3MiLCJNYWluIiwiV2lraSIsIldpa2kuVmlld01vZGUiLCJXaWtpLmlzRk1DQ29udGFpbmVyIiwiV2lraS5pc1dpa2lFbmFibGVkIiwiV2lraS5nb1RvTGluayIsIldpa2kuY3VzdG9tVmlld0xpbmtzIiwiV2lraS5jcmVhdGVXaXphcmRUcmVlIiwiV2lraS5jcmVhdGVGb2xkZXIiLCJXaWtpLmFkZENyZWF0ZVdpemFyZEZvbGRlcnMiLCJXaWtpLnN0YXJ0TGluayIsIldpa2kuaXNJbmRleFBhZ2UiLCJXaWtpLnZpZXdMaW5rIiwiV2lraS5icmFuY2hMaW5rIiwiV2lraS5lZGl0TGluayIsIldpa2kuY3JlYXRlTGluayIsIldpa2kuZW5jb2RlUGF0aCIsIldpa2kuZGVjb2RlUGF0aCIsIldpa2kuZmlsZUZvcm1hdCIsIldpa2kuZmlsZU5hbWUiLCJXaWtpLmZpbGVQYXJlbnQiLCJXaWtpLmhpZGVGaWxlTmFtZUV4dGVuc2lvbnMiLCJXaWtpLmdpdFJlc3RVUkwiLCJXaWtpLmdpdFVybFByZWZpeCIsIldpa2kuZ2l0UmVsYXRpdmVVUkwiLCJXaWtpLmZpbGVJY29uSHRtbCIsIldpa2kuaWNvbkNsYXNzIiwiV2lraS5pbml0U2NvcGUiLCJXaWtpLmxvYWRCcmFuY2hlcyIsIldpa2kucGFnZUlkIiwiV2lraS5wYWdlSWRGcm9tVVJJIiwiV2lraS5maWxlRXh0ZW5zaW9uIiwiV2lraS5vbkNvbXBsZXRlIiwiV2lraS5wYXJzZUpzb24iLCJXaWtpLmFkanVzdEhyZWYiLCJXaWtpLmdldEZvbGRlclhtbE5vZGUiLCJXaWtpLmFkZE5ld05vZGUiLCJXaWtpLm9uTW9kZWxDaGFuZ2VFdmVudCIsIldpa2kub25Ob2RlRGF0YUNoYW5nZWQiLCJXaWtpLm9uUmVzdWx0cyIsIldpa2kudXBkYXRlVmlldyIsIldpa2kuZ29Ub1ZpZXciLCJXaWtpLmlzUm91dGVPck5vZGUiLCJXaWtpLmNyZWF0ZUVuZHBvaW50VVJJIiwiV2lraS50cmVlTW9kaWZpZWQiLCJXaWtpLnJlbG9hZFJvdXRlSWRzIiwiV2lraS5vblJvdXRlU2VsZWN0aW9uQ2hhbmdlZCIsIldpa2kuc2hvd0dyYXBoIiwiV2lraS5nZXROb2RlSWQiLCJXaWtpLmdldFNlbGVjdGVkT3JSb3V0ZUZvbGRlciIsIldpa2kuZ2V0Q29udGFpbmVyRWxlbWVudCIsIldpa2kubGF5b3V0R3JhcGgiLCJXaWtpLmdldExpbmsiLCJXaWtpLmdldE5vZGVCeUNJRCIsIldpa2kudXBkYXRlU2VsZWN0aW9uIiwiV2lraS5nZXRXaWR0aCIsIldpa2kuZ2V0Rm9sZGVySWRBdHRyaWJ1dGUiLCJXaWtpLmdldFJvdXRlRm9sZGVyIiwiV2lraS5jb21taXRQYXRoIiwiV2lraS5yZXR1cm5Ub0RpcmVjdG9yeSIsIldpa2kuZG9DcmVhdGUiLCJXaWtpLmRvQ3JlYXRlLnRvUGF0aCIsIldpa2kuZG9DcmVhdGUudG9Qcm9maWxlTmFtZSIsIldpa2kucHV0UGFnZSIsIldpa2kuZ2V0TmV3RG9jdW1lbnRQYXRoIiwiV2lraS5pc0NyZWF0ZSIsIldpa2kub25GaWxlQ29udGVudHMiLCJXaWtpLnVwZGF0ZVNvdXJjZVZpZXciLCJXaWtpLm9uRm9ybVNjaGVtYSIsIldpa2kuc2F2ZVRvIiwiV2lraS5jaGlsZExpbmsiLCJXaWtpLm9uRm9ybURhdGEiLCJXaWtpLnN3aXRjaEZyb21WaWV3VG9DdXN0b21MaW5rIiwiV2lraS5sb2FkQnJlYWRjcnVtYnMiLCJXaWtpLmlzRGlmZlZpZXciLCJXaWtpLnZpZXdDb250ZW50cyIsIldpa2kub25GaWxlRGV0YWlscyIsIldpa2kuY2hlY2tGaWxlRXhpc3RzIiwiV2lraS5nZXRSZW5hbWVGaWxlUGF0aCIsIldpa2kuZ2V0UmVuYW1lRGlhbG9nIiwiV2lraS5nZXRNb3ZlRGlhbG9nIiwiV2lraS5nZXREZWxldGVEaWFsb2ciLCJXaWtpLm9mZnNldFRvcCIsIldpa2kuc2Nyb2xsVG9IYXNoIiwiV2lraS5zY3JvbGxUb0lkIiwiV2lraS5hZGRMaW5rcyIsIldpa2kub25FdmVudEluc2VydGVkIiwiV2lraS5jcmVhdGVTb3VyY2VCcmVhZGNydW1icyIsIldpa2kuY3JlYXRlRWRpdGluZ0JyZWFkY3J1bWIiLCJXaWtpLkdpdFdpa2lSZXBvc2l0b3J5IiwiV2lraS5HaXRXaWtpUmVwb3NpdG9yeS5jb25zdHJ1Y3RvciIsIldpa2kuR2l0V2lraVJlcG9zaXRvcnkuZ2V0UGFnZSIsIldpa2kuR2l0V2lraVJlcG9zaXRvcnkucHV0UGFnZSIsIldpa2kuR2l0V2lraVJlcG9zaXRvcnkuaGlzdG9yeSIsIldpa2kuR2l0V2lraVJlcG9zaXRvcnkuY29tbWl0SW5mbyIsIldpa2kuR2l0V2lraVJlcG9zaXRvcnkuY29tbWl0VHJlZSIsIldpa2kuR2l0V2lraVJlcG9zaXRvcnkuZGlmZiIsIldpa2kuR2l0V2lraVJlcG9zaXRvcnkuYnJhbmNoZXMiLCJXaWtpLkdpdFdpa2lSZXBvc2l0b3J5LmV4aXN0cyIsIldpa2kuR2l0V2lraVJlcG9zaXRvcnkucmV2ZXJ0VG8iLCJXaWtpLkdpdFdpa2lSZXBvc2l0b3J5LnJlbmFtZSIsIldpa2kuR2l0V2lraVJlcG9zaXRvcnkucmVtb3ZlUGFnZSIsIldpa2kuR2l0V2lraVJlcG9zaXRvcnkucmVtb3ZlUGFnZXMiLCJXaWtpLkdpdFdpa2lSZXBvc2l0b3J5LmRvR2V0IiwiV2lraS5HaXRXaWtpUmVwb3NpdG9yeS5kb1Bvc3QiLCJXaWtpLkdpdFdpa2lSZXBvc2l0b3J5LmRvUG9zdEZvcm0iLCJXaWtpLkdpdFdpa2lSZXBvc2l0b3J5LmNvbXBsZXRlUGF0aCIsIldpa2kuR2l0V2lraVJlcG9zaXRvcnkuZ2V0UGF0aCIsIldpa2kuR2l0V2lraVJlcG9zaXRvcnkuZ2V0TG9nUGF0aCIsIldpa2kuR2l0V2lraVJlcG9zaXRvcnkuZ2V0Q29udGVudCIsIldpa2kuR2l0V2lraVJlcG9zaXRvcnkuanNvbkNoaWxkQ29udGVudHMiLCJXaWtpLkdpdFdpa2lSZXBvc2l0b3J5LmdpdCJdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQ0FBLElBQU8sS0FBSyxDQTJOWDtBQTNORCxXQUFPLEtBQUssRUFBQyxDQUFDO0lBRURBLGFBQU9BLEdBQUdBLDhCQUE4QkEsQ0FBQ0E7SUFFekNBLFVBQUlBLEdBQUdBLEdBQUdBLEdBQUdBLGFBQU9BLENBQUNBO0lBQ3JCQSxnQkFBVUEsR0FBR0EsT0FBT0EsQ0FBQ0E7SUFDckJBLGdCQUFVQSxHQUFHQSxnQkFBZ0JBLENBQUNBO0lBQzlCQSxrQkFBWUEsR0FBR0EsZ0JBQVVBLEdBQUdBLE9BQU9BLENBQUNBO0lBQ3BDQSxTQUFHQSxHQUFrQkEsTUFBTUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsZ0JBQVVBLENBQUNBLENBQUNBO0lBRTVDQSxvQkFBY0EsR0FBR0EsSUFBSUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsZ0JBQWdCQSxDQUFDQSxDQUFDQTtJQUU1Q0EscUJBQWVBLEdBQUdBLFVBQVVBLENBQUNBLGVBQWVBLENBQUNBO0lBQzdDQSxzQkFBZ0JBLEdBQUdBLE9BQU9BLENBQUNBO0lBRTNCQSxv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QSxnQkFBZ0JBLEVBQUVBLFdBQVdBLEVBQUVBLGNBQWNBLEVBQUVBLE9BQU9BLEVBQUVBLFVBQVVBLEVBQUVBLGFBQWFBLEVBQUVBLFlBQVlBLEVBQ3hHQSxVQUFDQSxNQUFNQSxFQUFFQSxjQUF1Q0EsRUFBRUEsU0FBNkJBLEVBQUVBLFlBQVlBLEVBQUVBLEtBQUtBLEVBQUVBLFFBQVFBLEVBQUVBLFdBQVdBLEVBQUVBLFVBQVVBO1FBRXJJQSxNQUFNQSxDQUFDQSxLQUFLQSxHQUFHQSxVQUFVQSxDQUFDQTtRQUUxQkEsTUFBTUEsQ0FBQ0EsWUFBWUEsR0FBR0EsWUFBWUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsSUFBSUEsU0FBU0EsQ0FBQ0EsTUFBTUEsRUFBRUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsSUFBSUEsRUFBRUEsQ0FBQ0E7UUFDL0VBLE1BQU1BLENBQUNBLEVBQUVBLEdBQUdBLFlBQVlBLENBQUNBLElBQUlBLENBQUNBLENBQUNBO1FBQy9CQSxNQUFNQSxDQUFDQSxJQUFJQSxHQUFHQSxZQUFZQSxDQUFDQSxNQUFNQSxDQUFDQSxDQUFDQTtRQUVuQ0EsTUFBTUEsQ0FBQ0EsVUFBVUEsR0FBR0EsWUFBWUEsQ0FBQ0EsZUFBZUEsQ0FBQ0EsQ0FBQ0E7UUFDbERBLE1BQU1BLENBQUNBLElBQUlBLEdBQUdBLFlBQVlBLENBQUNBLFVBQVVBLENBQUNBLENBQUNBO1FBQ3ZDQSxNQUFNQSxDQUFDQSxRQUFRQSxHQUFHQSxFQUFFQSxDQUFDQTtRQUNyQkEsSUFBSUEsU0FBU0EsR0FBR0EsTUFBTUEsQ0FBQ0EsWUFBWUEsQ0FBQ0EsS0FBS0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0E7UUFDL0NBLEVBQUVBLENBQUNBLENBQUNBLFNBQVNBLElBQUlBLFNBQVNBLENBQUNBLE1BQU1BLENBQUNBLENBQUNBLENBQUNBO1lBQ2xDQSxNQUFNQSxDQUFDQSxRQUFRQSxHQUFHQSxTQUFTQSxDQUFDQSxTQUFTQSxDQUFDQSxNQUFNQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFDQTtRQUNwREEsQ0FBQ0E7UUFHREEsZUFBU0Es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R0FBR0EsTUFBTUEsQ0FBQ0Esa0JBQWtCQSxDQUFDQSxLQUFLQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQTtRQUNyREEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsU0FBU0EsSUFBSUEsU0FBU0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7WUFDbENBLE1BQU1BLENBQUNBLFFBQVFBLEdBQUdBLFNBQVNBLENBQUNBLFNBQVNBLENBQUNBLE1BQU1BLEdBQUdBLENBQUNBLENBQUNBLENBQUNBO1FBQ3BEQSxDQUFDQTtRQUNEQSxFQUFFQSxDQUFDQSxDQUFDQSxDQUFDQSxNQUFNQSxDQUFDQSxrQkFBa0JBLENBQUNBLFVBQVVBLENBQUNBLEdBQUdBLENBQUNBLElBQUlBLE1BQU1BLENBQUNBLGtCQUFrQkEsQ0FBQ0EsTUFBTUEsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7WUFDdkZBLE1BQU1BLENBQUNBLGtCQUFrQkEsR0FBR0EsR0FBR0EsR0FBR0EsTUFBTUEsQ0FBQ0Esa0JBQWtCQSxDQUFDQTtRQUM5REEsQ0FBQ0E7UUFFREEsTUFBTUEsQ0FBQ0EsVUFBVUEsR0FBR0EsWUFBWUEsQ0FBQ0EsZUFBZUEsQ0FBQ0EsQ0FBQ0E7UUFDbERBLE1BQU1BLENBQUNBLElBQUlBLEdBQUdBLFlBQVlBLENBQUNBLFVBQVVBLENBQUNBLENBQUNBO1FBRXZDQSxNQUFNQSxDQUFDQSxRQUFRQSxHQUFHQSxzQkFBZ0JBLENBQUNBLFVBQVVBLEVBQUVBLE1BQU1BLENBQUNBLFlBQVlBLENBQUNBLENBQUNBO1FBQ3BFQSxNQUFNQSxDQUFDQSxPQUFPQSxHQUFHQSxNQUFNQSxDQUFDQSxRQUFRQSxDQUFDQSxNQUFNQSxLQUFLQSxDQUFDQSxDQUFDQTtRQUU5Q0EsZUFBU0EsQ0FBQ0EsTUFBTUEsRUFBRUEsU0FBU0EsRUFBRUEsWUFBWUEsQ0FBQ0EsQ0FBQ0E7UUFDM0NBLG1DQUE2QkEsQ0FBQ0EsTUFBTUEsRUFBRUEsU0FBU0EsQ0FBQ0EsQ0FBQ0E7UUFHakRBLE1BQU1BLENBQUNBLFdBQVdBLEdBQUdBO1lBQ25C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QSxDQUFDQSxVQUFVQSxDQUFDQSxJQUFJQSxJQUFJQSxDQUFDQSxRQUFRQSxDQUFDQSxZQUFZQSxDQUFDQSxJQUFJQSxJQUFJQSxDQUFDQSxRQUFRQSxDQUFDQSxPQUFPQSxDQUFDQSxDQUFDQSxHQUFHQSxJQUFJQSxHQUFHQSxLQUFLQSxDQUFDQTtJQUNySEEsQ0FBQ0E7SUFGZVYsZ0JBQVdBLEdBQVhBLFdBRWZBLENBQUFBO0lBRURBLFNBQWdCQSxRQUFRQSxDQUFDQSxNQUFNQSxFQUFFQSxNQUFhQSxFQUFFQSxTQUFTQSxFQUFFQSxRQUFzQkE7UUFBdEJXLHdCQUFzQkEsR0FBdEJBLGVBQXNCQTtRQUMvRUEsSUFBSUEsSUFBSUEsR0FBVUEsSUFBSUEsQ0FBQ0E7UUFDdkJBLElBQUlBLEtBQUtBLEdBQUdBLFNBQVNBLENBQUNBLE1BQU1BLENBQUNBLENBQUNBO1FBQzlCQSxFQUFFQSxDQUFDQSxDQUFDQSxNQUFNQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUVYQSxJQUFJQSxJQUFJQSxHQUFHQSxXQUFXQSxDQUFDQSxNQUFNQSxDQUFDQSxHQUFHQSxRQUFRQSxHQUFHQSxRQUFRQSxDQUFDQTtZQUNyREEsSUFBSUEsR0FBR0EsS0FBS0EsR0FBR0EsSUFBSUEsR0FBR0EsVUFBVUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsV0FBV0EsQ0FBQ0EsTUFBTUEsRUFBRUEsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7UUFDbEVBLENBQUNBO1FBQUNBLElBQUlBLENBQUNBLENBQUNBO1lBRU5BLElBQUlBLElBQUlBLEdBQVVBLFNBQVNBLENBQUNBLElBQUlBLEVBQUVBLENBQUNBO1lBQ25DQSxJQUFJQSxHQUFHQSxHQUFHQSxHQUFHQSxJQUFJQSxDQUFDQSxPQUFPQSxDQUFDQSxlQUFlQSxFQUFFQSxNQUFNQSxDQUFDQSxDQUFDQTtRQUNyREEsQ0FBQ0E7UUFDREEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsUUFBUUEsSUFBSUEsTUFBTUEsSUFBSUEsTUFBTUEsQ0FBQ0EsUUFBUUEsQ0FBQ0EsUUFBUUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0Es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QVNBLEdBQUdBLFlBQVlBLENBQUNBLFdBQVdBLENBQUNBLENBQUNBO1FBQzdDQSxNQUFNQSxDQUFDQSxTQUFTQSxHQUFHQSxZQUFZQSxDQUFDQSxXQUFXQSxDQUFDQSxDQUFDQTtRQUM3Q0EsTUFBTUEsQ0FBQ0EsTUFBTUEsR0FBR0EsWUFBWUEsQ0FBQ0EsUUFBUUEsQ0FBQ0EsSUFBSUEsU0FBU0EsQ0FBQ0EsTUFBTUEsRUFBRUEsQ0FBQ0EsUUFBUUEsQ0FBQ0EsQ0FBQ0E7UUFDdkVBLE1BQU1BLENBQUNBLFFBQVFBLEdBQUdBLFlBQVlBLENBQUNBLFVBQVVBLENBQUNBLElBQUlBLFlBQVlBLENBQUNBLGVBQWVBLENBQUNBLENBQUNBO1FBQzVFQSxNQUFNQSxDQUFDQSxTQUFTQSxHQUFHQSxTQUFTQSxDQUFDQSxNQUFNQSxDQUFDQSxDQUFDQTtRQUNyQ0EsTUFBTUEsQ0FBQ0EsU0FBU0EsR0FBR0EsUUFBUUEsQ0FBQ0EsTUFBTUEsRUFBRUEsTUFBTUEsQ0FBQ0EsTUFBTUEsRUFBRUEsU0FBU0EsQ0FBQ0EsQ0FBQ0E7UUFDOURBLE1BQU1BLENBQUNBLFdBQVdBLEdBQUdBLFNBQVNBLENBQUNBLE1BQU1BLENBQUNBLEdBQUdBLFdBQVdBLEdBQUdBLENBQUNBLE1BQU1BLENBQUNBLE1BQU1BLElBQUlBLEVBQUVBLENBQUNBLENBQUNBO1FBQzdFQSxNQUFNQSxDQUFDQSxjQUFjQSxHQUFHQSxJQUFJQSxzQkFBaUJBLENBQUNBLE1BQU1BLENBQUNBLENBQUNBO1FBRXREQSxNQUFNQSxDQUFDQSxjQUFjQSxHQUFHQSxTQUFTQSxDQUFDQSxhQUFhQSxFQUFFQSxDQUFDQTtRQUNsREEsTUFBTUEsQ0FBQ0EsWUFBWUEsR0FBR0EsU0FBU0EsQ0FBQ0EsV0FBV0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsU0FBU0EsQ0FBQ0EsQ0FBQ0E7UUFDOURBLE1BQU1BLENBQUNBLGdCQUFnQkEsR0FBR0EsU0FBU0EsQ0FBQ0Esd0JBQXdCQSxDQUFDQSxNQUFNQSxDQUFDQSxTQUFTQSxFQUFFQSw0QkFBdUJBLENBQUNBLE1BQU1BLENB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QSxPQUFPQSxDQUFDQSxHQUFHQSxDQUFDQSxJQUFJQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtnQkFDL0JBLFVBQVVBLEdBQUdBLElBQUlBLENBQUNBLFNBQVNBLENBQUNBLENBQUNBLEVBQUVBLEdBQUdBLENBQUNBLENBQUNBO1lBQ3RDQSxDQUFDQTtRQUNIQSxDQUFDQTtRQUdEQSxFQUFFQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSxVQUFVQSxDQUFDQSxLQUFLQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUMzQkEsSUFBSUEsS0FBS0EsR0FBR0EsSUFBSUEsQ0FBQ0EsS0FBS0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0E7WUFDNUJBLElBQUlBLFNBQVNBLEdBQUdBLFVBQVVBLENBQUNBLEtBQUtBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBO1lBQ3RDQSxJQUFJQSxPQUFPQSxHQUFHQSxLQUFLQSxDQUFDQSxNQUFNQSxDQUFDQSxVQUFDQSxJQUFJQTtnQkFDOUJBLE1BQU1BLENBQUNBLElBQUlBLEtBQUtBLElBQUlBLENBQUNBO1lBQ3ZCQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUNIQSxLQUFLQSxHQUFHQSxLQUFLQSxDQUFDQSxJQUFJQSxDQUFDQSxLQUFLQSxDQUFDQSxNQUFNQSxHQUFHQSxPQUFPQSxDQUFDQSxNQUFNQSxDQUFDQSxDQUFDQTtZQUNsREEsU0FBU0EsR0FBR0EsU0FBU0EsQ0FBQ0EsS0FBS0EsQ0FBQ0EsU0FBU0EsQ0FBQ0EsTUFBTUEsR0FBR0EsT0FBT0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0E7WUFFL0RBLE1BQU1BLENBQUNBLEdBQUdBLEdBQUdBLFNBQVNBLENBQUNBLElBQUlBLENBQUNBLEdBQUdBLENBQUNBLEdBQUdBLEdBQUdBLEdBQUdBLEtBQUtBLENBQUNBLElBQUlBLENBQUNBLEdBQUdBLENBQUNBLEdBQUdBLFNBQVNBLEdBQUdBLFNBQVNBLENBQUNBLElBQUlBLEVBQUVBLENBQUNBO1FBQzFGQSxDQUFDQTtRQUdEQSxFQUFFQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSxVQUFVQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUN6QkEsTUFBTUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsVUFBVUEsQ0FBQ0EsTUFBTUEsRUFBRUEsSUFBSUEsR0FBR0EsU0FBU0EsRUFBRUEsU0FBU0EsQ0FBQ0EsR0FBR0EsU0FBU0EsQ0FBQ0E7UUFDMUVBLENBQUNBO1FBRURBLEVBQUVBLENBQUNBLENBQUNBLENBQUNBLElBQUlBLENBQUNBLHlCQUF5QkEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsVUFBQ0EsT0FBT0E7WUFDOUNBLE1BQU1BLENBQUNBLElBQUlBLENBQUNBLFVBQVVBLENBQUNBLE9BQU9BLENBQUNBLENBQUNBO1FBQ2xDQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUNIQSxNQUFNQSxDQUFDQSxHQUFHQSxHQUFHQSxVQUFVQSxHQUFHQSxHQUFHQSxHQUFHQSxJQUFJQSxHQUFHQSxTQUFTQSxHQUFHQSxTQUFTQSxDQUFDQSxJQUFJQSxFQUFFQSxDQUFDQTtRQUN0RUEsQ0FBQ0E7UUFBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0E7WUFDTkEsTUFBTUEsQ0FBQ0EsSUFBSUEsQ0FBQ0E7UUFDZEEsQ0FBQ0E7SUFDSEEsQ0FBQ0E7SUF6Q2VqQyxlQUFVQSxHQUFWQSxVQXlDZkEsQ0FBQUE7QUFDSEEsQ0FBQ0EsRUEvOEJNLElBQUksS0FBSixJQUFJLFFBKzhCVjs7QUM5OEJELElBQU8sSUFBSSxDQXdJVjtBQXhJRCxXQUFPLElBQUksRUFBQyxDQUFDO0lBRUFBLGVBQVVBLEdBQUdBLE1BQU1BLENBQUNBO0lBQ3BCQSxpQkFBWUEsR0FBR0Esb0JBQW9CQSxDQUFDQTtJQUNwQ0EsUUFBR0EsR0FBT0EsSUFBSUEsQ0FBQ0E7SUFFZkEsWUFBT0EsR0FBR0EsT0FBT0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsZUFBVUEsRUFBRUEsQ0FBQ0EsYUFBYUEsRUFBRUEsV0FBV0EsRUFBRUEsYUFBYUEsRUFBRUEsZUFBZUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7SUFDbkdBLGVBQVVBLEdBQUdBLGFBQWFBLENBQUNBLHdCQUF3QkEsQ0FBQ0EsWUFBT0EsRUFBRUEsTUFBTUEsQ0FBQ0EsQ0FBQ0E7SUFDckVBLFVBQUtBLEdBQUdBLGFBQWFBLENBQUNBLHFCQUFxQkEsQ0FBQ0EsaUJBQVlBLENBQUNBLENBQUNBO0lBRXJFQSxZQUFPQSxDQUFDQSxNQUFNQSxDQUFDQSxDQUFDQSxnQkFBZ0JBLEVBQUVBLFVBQUNBLGNBQWNBO1FBRy9DQSxPQUFPQSxDQUFDQSxPQUFPQSxDQUFDQSxDQUFDQSxFQUFFQSxFQUFFQSxpQkFBaUJBLENBQUNBLEVBQUVBLFVBQUNBLElBQUlBO1lBRTVDQSxJQUFJQSxZQUFZQSxHQUFHQSxnRUFBZ0VBLENBQUNBO1lBQ3BGQSxjQUFjQSxDQUNOQSxJQUFJQSxDQUFDQSxVQUFVQSxDQUFDQSxJQUFJQSxDQUFDQSxZQUFZQSxFQUFFQSxJQUFJQSxFQUFFQSxNQUFNQSxDQUFDQSxFQUFFQSxVQUFLQSxDQUFDQSxlQUFlQSxFQUFFQSxLQUFLQSxDQUFDQSxDQUFDQSxDQUNoRkEsSUFBSUEsQ0FBQ0EsVUFBVUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsWUFBWUEsRUFBRUEsSUFBSUEsRUFBRUEsZUFBZUEsQ0FBQ0EsRUFBRUEsVUFBS0EsQ0FBQ0EsYUFBYUEsRUFBRUEsS0FBS0EsQ0FBQ0EsQ0FBQ0EsQ0FDdkZBLElBQUlBLENBQUNBLFlBQVlBLEdBQUdBLElBQUlBLEdBQUdBLGNBQWNBLEVBQUVBLEVBQUNBLFdBQVdBLEVBQUVBLGlDQUFpQ0EsRUFBRUEsY0FBY0EsRUFBRUEsS0FBS0EsRUFBQ0EsQ0FBQ0EsQ0FDbkhBLElBQUlBLENBQUNBLFlBQVlBLEdBQUdBLElBQUlBLEdBQUdBLGNBQWNBLEVBQUVBLEVBQUNBLFdBQVdBLEVBQUVBLGlDQUFpQ0EsRUFBRUEsY0FBY0EsRUFBRUEsS0FBS0EsRUFBQ0EsQ0FBQ0EsQ0FDbkhBLElBQUlBLENBQUNBLFlBQVlBLEdBQUdBLElBQUlBLEdBQUdBLGNBQWNBLEVBQUVBLEVBQUNBLFdBQVdBLEVBQUVBLGlDQUFpQ0EsRUFBQ0EsQ0FBQ0EsQ0FDNUZBLElBQUlBLENBQUNBLFlBQVlBLEdBQUdBLElBQUlBLEdBQUdBLDRCQUE0QkEsRUFBRUEsRUFBQ0EsV0FBV0EsRUFBRUEsaUNBQWlDQSxFQUFDQSxDQUFDQSxDQUMxR0EsSUFBSUEsQ0FBQ0EsWUFBWUEsR0FBR0EsSUFBSUEsR0FBR0EsaUJBQWlCQSxFQUFFQSxFQUFDQSxXQUFXQSxFQUFFQSxnQ0FBZ0NBLEVBQUNBLENBQUNBLENBQzlGQSxJQUFJQSxDQUFDQSxZQUFZQSxHQUFHQSxJQUFJQSxHQUFHQSwyQkFBMkJBLEVBQUVBLEVBQUNBLFdBQVdBLEVBQUVBLCtCQUErQkEsRUFBQ0EsQ0FBQ0EsQ0FDdkdBLElBQUlBLENBQUNBLFlBQVlBLEdBQUdBLElBQUlBLEdBQUdBLDZDQUE2Q0EsRUFBRUEsRUFBQ0EsV0FBV0EsRUFBRUEsaUNBQWlDQSxFQUFFQSxjQUFjQSxFQUFFQSxLQUFLQSxFQUFDQSxDQUFDQSxDQUNsSkEsSUFBSUEsQ0FBQ0EsWUFBWUEsR0FBR0EsSUFBSUEsR0FBR0EsbUJBQW1CQSxFQUFFQSxFQUFDQSxXQUFXQSxFQUFFQSxrQ0FBa0NBLEVBQUNBLENBQUNBLENBQ2xHQSxJQUFJQSxDQUFDQSxZQUFZQSxHQUFHQSxJQUFJQSxHQUFHQSx3QkFBd0JBLEVBQUVBLEVBQUNBLFdBQVdBLEVBQUVBLHNDQUFzQ0EsRUFBQ0EsQ0FBQ0EsQ0FDM0dBLElBQUlBLENBQUNBLFlBQVlBLEdBQUdBLElBQUlBLEdBQUdBLHdCQUF3QkEsRUFBRUEsRUFBRUEsV0FBV0EsRUFBRUEsdUNBQXVDQSxFQUFFQSxDQUFDQSxDQUM5R0EsSUFBSUEsQ0FBQ0EsWUFBWUEsR0FBR0EsSUFBSUEsR0FBR0EsNEJBQTRCQSxFQUFFQSxFQUFFQSxXQUFXQSxFQUFFQSxzQ0FBc0NBLEVBQUVBLENBQUNBLENBQ2pIQSxJQUFJQSxDQUFDQSxZQUFZQSxHQUFHQSxJQUFJQSxHQUFHQSxzQ0FBc0NBLEVBQUVBLEVBQUVBLFdBQVdBLEVBQUVBLHNDQUFzQ0EsRUFBRUEsQ0FBQ0EsQ0FDM0hBLElBQUlBLENBQUNBLFlBQVlBLEdBQUdBLElBQUlBLEdBQUdBLHVCQUF1QkEsRUFBRUEsRUFBQ0EsV0FBV0EsRUFBRUEscUNBQXFDQSxFQUFDQSxDQUFDQSxDQUN6R0EsSUFBSUEsQ0FBQ0EsWUFBWUEsR0FBR0EsSUFBSUEsR0FBR0Esc0JBQXNCQSxFQUFFQSxFQUFDQSxXQUFXQSxFQUFFQSxvQ0FBb0NBLEVBQUNBLENBQUNBLENBQ3ZHQSxJQUFJQSxDQUFDQSxZQUFZQSxHQUFHQSxJQUFJQSxHQUFHQSwwQkFBMEJBLEVBQUVBLEVBQUNBLFdBQVdBLEVBQUVBLHdDQUF3Q0EsRUFBQ0EsQ0FBQ0EsQ0FBQ0E7UUFDMUhBLENBQUNBLENBQUNBLENBQUNBO0lBQ1BBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO0lBVUZBLFlBQU9BLENBQUNBLE9BQU9BLENBQUNBLGdCQUFnQkEsRUFBRUE7UUFDaENBLElBQUlBLElBQUlBLEdBQUdBO1lBQ1RBLEtBQUtBLEVBQUVBLEVBQUVBO1lBQ1RBLFlBQVlBLEVBQUVBLFVBQUNBLElBQWdCQTtnQkFDN0JBLElBQUlBLENBQUNBLEtBQUtBLENBQUNBLElBQUlBLENBQUNBLElBQUlBLENBQUNBLENBQUNBO1lBQ3hCQSxDQUFDQTtZQUNEQSxtQkFBbUJBLEVBQUVBLFVBQUNBLElBQWtCQTtnQkFDdENBLEVBQUVBLENBQUNBLENBQUNBLElBQUlBLENBQUNBLEtBQUtBLENBQUNBLE1BQU1BLEtBQUtBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO29CQUM1QkEsTUFBTUEsQ0FBQ0E7Z0JBQ1RBLENBQUNBO2dCQUNEQSxJQUFJQSxZQUFZQSxHQUFpQkEsQ0FBQ0E7b0JBQ2hDQSxPQUFPQSxFQUFFQSxTQUFTQTtpQkFDbkJBLENBQUNBLENBQUNBO2dCQUNIQSxJQUFJQSxDQUFDQSxLQUFLQSxDQUFDQSxPQUFPQSxDQUFDQSxVQUFDQSxJQUFnQkE7b0JBQ2xDQSxFQUFFQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSxLQUFLQSxFQUFFQSxDQUFDQSxDQUFDQSxDQUFDQTt3QkFDakJBLFlBQVlBLENBQUNBLElBQUlBLENBQUNBLElBQUlBLENBQUNBLENBQUNBO29CQUMxQkEsQ0FBQ0E7Z0JBQ0hBLENBQUNBLENBQUNBLENBQUNBO2dCQUNIQSxFQUFFQSxDQUFDQSxDQUFDQSxZQUFZQSxDQUFDQSxNQUFNQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtvQkFDNUJBLElBQUlBLENBQUNBLEdBQUdBLENBQUNBLFlBQVlBLENBQUNBLENBQUNBO2dCQUN6QkEsQ0FBQ0E7WUFDSEEsQ0FBQ0E7U0FDRkEsQ0FBQ0E7UUFDRkEsTUFBTUEsQ0FBQ0EsSUFBSUEsQ0FBQ0E7SUFDZEEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7SUFFSEEsWUFBT0EsQ0FBQ0EsT0FBT0EsQ0FBQ0Esa0JBQWtCQSxFQUFFQTtRQUNoQ0EsTUFBTUEsQ0FBQ0EsRUFBRUEsQ0FBQ0E7SUFDZEEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7SUFFSEEsWUFBT0EsQ0FBQ0EsT0FBT0EsQ0FBQ0EsMkJBQTJCQSxFQUFFQTtRQUMzQ0EsTUFBTUEsQ0FBQ0E7WUFDTEEsT0FBT0EsRUFBRUEsQ0FBQ0EsS0FBS0EsRUFBRUEsS0FBS0EsRUFBRUEsS0FBS0EsRUFBRUEsS0FBS0EsRUFBRUEsS0FBS0EsRUFBRUEsS0FBS0EsQ0FBQ0E7WUFDbkRBLFVBQVVBLEVBQUVBLENBQUNBLElBQUlBLEVBQUVBLFVBQVVBLEVBQUVBLE9BQU9BLEVBQUVBLE1BQU1BLEVBQUVBLEtBQUtBLENBQUNBO1lBQ3REQSxXQUFXQSxFQUFFQSxDQUFDQSxNQUFNQSxFQUFFQSxPQUFPQSxFQUFFQSxLQUFLQSxDQUFDQTtZQUNyQ0EsYUFBYUEsRUFBRUEsQ0FBQ0EsTUFBTUEsQ0FBQ0E7WUFDdkJBLGVBQWVBLEVBQUVBLENBQUNBLFFBQVFBLENBQUNBO1lBQzNCQSxjQUFjQSxFQUFFQSxDQUFDQSxPQUFPQSxDQUFDQTtZQUN6QkEsWUFBWUEsRUFBRUEsQ0FBQ0EsSUFBSUEsRUFBRUEsTUFBTUEsRUFBRUEsWUFBWUEsRUFBRUEsU0FBU0EsRUFBRUEsWUFBWUEsRUFBRUEsTUFBTUEsQ0FBQ0E7WUFDM0VBLEtBQUtBLEVBQUVBLENBQUNBLEtBQUtBLEVBQUVBLEtBQUtBLEVBQUVBLE1BQU1BLEVBQUVBLE1BQU1BLENBQUNBO1lBQ3JDQSxhQUFhQSxFQUFFQSxDQUFDQSxNQUFNQSxFQUFFQSxLQUFLQSxDQUFDQTtZQUM5QkEsWUFBWUEsRUFBRUEsQ0FBQ0EsWUFBWUEsQ0FBQ0E7U0FDN0JBLENBQUNBO0lBQ0pBLENBQUNBLENBQUNBLENBQUNBO0lBRUhBLFlBQU9BLENBQUNBLE1BQU1BLENBQUNBLGVBQWVBLEVBQUVBLGNBQU1BLHFCQUFTQSxFQUFUQSxDQUFTQSxDQUFDQSxDQUFDQTtJQUVqREEsWUFBT0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsV0FBV0EsRUFBQ0EsY0FBY0EsRUFBR0EsY0FBY0EsRUFBRUEsWUFBWUEsRUFBRUEsY0FBY0EsRUFBRUEscUJBQXFCQSxFQUFFQSxnQkFBZ0JBLEVBQzdIQSxZQUFZQSxFQUFFQSxVQUFDQSxTQUE2QkEsRUFDeENBLFlBQVlBLEVBQ1pBLFlBQVlBLEVBQ1pBLFVBQVVBLEVBQ1ZBLFlBQVlBLEVBQ1pBLG1CQUFtQkEsRUFDbkJBLGNBQWNBLEVBQ2RBLFVBQVVBO1FBRWRBLFlBQVlBLENBQUNBLE1BQU1BLENBQUNBLEdBQUdBLGlCQUFZQSxHQUFHQSxpQkFBaUJBLENBQUNBO1FBeUJ4REEsSUFBSUEsQ0FBQ0EsaUJBQWlCQSxDQUFDQSxPQUFPQSxDQUFDQSxVQUFDQSxRQUFhQTtZQUMzQ0EsRUFBRUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsUUFBUUEsQ0FBQ0EsT0FBT0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0JBQ3ZCQSxRQUFRQSxDQUFDQSxLQUFLQSxHQUFHQSxNQUFNQSxDQUFDQTtZQUMxQkEsQ0FBQ0E7UUFDSEEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7SUFFTEEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7SUFFSkEsa0JBQWtCQSxDQUFDQSxTQUFTQSxDQUFDQSxlQUFVQSxDQUFDQSxDQUFDQTtBQUMzQ0EsQ0FBQ0EsRUF4SU0sSUFBSSxLQUFKLElBQUksUUF3SVY7O0FDM0lELElBQU8sSUFBSSxDQXFlVjtBQXJlRCxXQUFPLElBQUksRUFBQyxDQUFDO0lBRUFBLG9CQUFlQSxHQUFHQSxZQUFPQSxDQUFDQSxVQUFVQSxDQUFDQSxzQkFBc0JBLEVBQUVBLENBQUNBLFFBQVFBLEVBQUVBLFlBQVlBLEVBQUVBLFdBQVdBLEVBQUVBLGNBQWNBLEVBQUVBLFVBQVVBLEVBQUVBLGdCQUFnQkEsRUFBRUEsY0FBY0EsRUFBRUEsVUFBQ0EsTUFBTUEsRUFBRUEsVUFBVUEsRUFBRUEsU0FBU0EsRUFBRUEsWUFBWUEsRUFBRUEsUUFBUUEsRUFBRUEsY0FBY0EsRUFBRUEsWUFBK0JBO1FBR2pSQSxJQUFJQSxPQUFPQSxHQUFHQSxJQUFJQSxDQUFDQTtRQUNuQkEsSUFBSUEsYUFBYUEsR0FBR0EsSUFBSUEsQ0FBQ0E7UUFDekJBLElBQUlBLHVCQUF1QkEsR0FBR0EsSUFBSUEsQ0FBQ0E7UUFDbkNBLElBQUlBLFdBQVdBLEdBQUdBLElBQUlBLENBQUNBO1FBQ3ZCQSxJQUFJQSxTQUFTQSxHQUFHQSxJQUFJQSxDQUFDQTtRQUNyQkEsSUFBSUEsU0FBU0EsR0FBR0EsSUFBSUEsU0FBU0EsQ0FBQ0EsT0FBT0EsRUFBRUEsYUFBYUEsRUFBRUEsdUJBQXVCQSxFQUFFQSxTQUFTQSxFQUFFQSxRQUFRQSxFQUFFQSxjQUFjQSxFQUFFQSxZQUFZQSxFQUFFQSxVQUFVQSxFQUFFQSxXQUFXQSxFQUFFQSxTQUFTQSxDQUFDQSxDQUFDQTtRQUV0S0EsSUFBSUEsQ0FBQ0EsU0FBU0EsQ0FBQ0EsTUFBTUEsRUFBRUEsWUFBWUEsRUFBRUEsU0FBU0EsQ0FBQ0EsQ0FBQ0E7UUFDaERBLEtBQUtBLENBQUNBLHdCQUF3QkEsQ0FBQ0EsTUFBTUEsRUFBRUEsU0FBU0EsRUFBRUEsWUFBWUEsRUFBRUEsU0FBU0EsRUFBRUEsT0FBT0EsQ0FBQ0EsQ0FBQ0E7UUFDcEZBLElBQUlBLGNBQWNBLEdBQUdBLE1BQU1BLENBQUNBLGNBQWNBLENBQUNBO1FBRTNDQSxNQUFNQSxDQUFDQSxNQUFNQSxHQUFHQSxLQUFLQSxDQUFDQSx1QkFBdUJBLEVBQUVBLENBQUNBO1FBQ2hEQSxNQUFNQSxDQUFDQSxRQUFRQSxHQUFHQSxLQUFLQSxDQUFDQTtRQUV4QkEsTUFBTUEsQ0FBQ0Esa0JBQWtCQSxHQUFHQSxJQUFJQSxFQUFFQSxDQUFDQSxNQUFNQSxFQUFFQSxDQUFDQTtRQUU1Q0EsTUFBTUEsQ0FBQ0EsdUJBQXVCQSxHQUFHQSxJQUFJQSxDQUFDQTtRQUN0Q0EsTUFBTUEsQ0FBQ0EscUJBQXFCQSxHQUFHQTtZQUM3QkEsc0JBQXNCQSxFQUFFQSxJQUFJQTtZQUM1QkEsZUFBZUEsRUFBRUEsSUFBSUE7U0FDdEJBLENBQUNBO1FBRUZBLE1BQU1BLENBQUNBLE9BQU9BLEdBQUdBLFVBQUNBLEdBQUdBO1lBQ25CQSxNQUFNQSxDQUFDQSxHQUFHQSxJQUFJQSxHQUFHQSxDQUFDQSxPQUFPQSxDQUFDQSxTQUFTQSxDQUFDQSxDQUFDQTtRQUN2Q0EsQ0FBQ0EsQ0FBQ0E7UUFFRkEsTUFBTUEsQ0FBQ0EsaUJBQWlCQSxHQUFHQTtZQU92QkE7Z0JBQ0FBLE9BQU9BLEVBQUVBLG9DQUFvQ0E7Z0JBQzdDQSxLQUFLQSxFQUFFQSwyQkFBMkJBO2dCQUNsQ0EsT0FBT0EsRUFBRUEsVUFBQ0EsU0FBbUJBLElBQUtBLFdBQUlBLEVBQUpBLENBQUlBO2dCQUN0Q0EsSUFBSUEsRUFBRUEsY0FBTUEsT0FBQUEsSUFBSUEsQ0FBQ0EsU0FBU0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsR0FBR0Esb0JBQW9CQSxHQUFHQSxNQUFNQSxDQUFDQSxNQUFNQSxFQUFwRUEsQ0FBb0VBO2FBQ2pGQTtTQVNGQSxDQUFDQTtRQUVGQSxJQUFJQSxVQUFVQSxHQUFHQSxpQkFBaUJBLENBQUNBLFdBQVdBLENBQUNBLEtBQUtBLENBQUNBO1FBQ3JEQSxVQUFVQSxDQUFDQSxLQUFLQSxDQUFDQSxHQUFHQSxPQUFPQSxDQUFDQTtRQUU1QkEsTUFBTUEsQ0FBQ0EsU0FBU0EsR0FBR0EsSUFBSUEsRUFBRUEsQ0FBQ0EsTUFBTUEsRUFBRUEsQ0FBQ0E7UUFHbkNBLE1BQU1BLENBQUNBLFNBQVNBLENBQUNBLE9BQU9BLENBQUNBLGFBQWFBLENBQUNBLEdBQUdBLGFBQWFBLENBQUNBO1FBQ3hEQSxNQUFNQSxDQUFDQSxTQUFTQSxDQUFDQSxPQUFPQSxDQUFDQSxVQUFVQSxDQUFDQSxHQUFHQSxhQUFhQSxDQUFDQTtRQUVyREEsTUFBTUEsQ0FBQ0EsaUJBQWlCQSxHQUFHQSxFQUFFQSxDQUFDQTtRQUM5QkEsTUFBTUEsQ0FBQ0EsV0FBV0EsR0FBR0EsSUFBSUEsTUFBTUEsQ0FBQ0EsU0FBU0EsQ0FBQ0EsQ0FBQ0E7UUFDM0NBLE1BQU1BLENBQUNBLGtCQUFrQkEsR0FBR0EsQ0FBQ0EsbUJBQW1CQSxDQUFDQSxDQUFDQTtRQUdsREEsT0FBT0EsQ0FBQ0EsT0FBT0EsQ0FBQ0EsaUJBQWlCQSxDQUFDQSxXQUFXQSxFQUFFQSxVQUFDQSxLQUFLQSxFQUFFQSxHQUFHQTtZQUN4REEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsS0FBS0EsQ0FBQ0EsS0FBS0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0JBQ2hCQSxJQUFJQSxLQUFLQSxHQUFHQSxDQUFDQSxHQUFHQSxLQUFLQSxPQUFPQSxDQUFDQSxHQUFHQSxNQUFNQSxDQUFDQSxXQUFXQSxHQUFHQSxNQUFNQSxDQUFDQSxXQUFXQSxDQUFDQSxTQUFTQSxDQUFDQSxLQUFLQSxDQUFDQSxLQUFLQSxDQUFDQSxDQUFDQTtnQkFDL0ZBLEVBQUVBLENBQUNBLENBQUNBLENBQUNBLEtBQUtBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLENBQUNBO29CQUNmQSxLQUFLQSxDQUFDQSxHQUFHQSxHQUFHQSxLQUFLQSxDQUFDQSxLQUFLQSxDQUFDQTtnQkFDMUJBLENBQUNBO2dCQUNEQSxLQUFLQSxDQUFDQSxLQUFLQSxDQUFDQSxHQUFHQSxHQUFHQSxDQUFDQTtnQkFDbkJBLElBQUlBLEtBQUtBLEdBQUdBLEtBQUtBLENBQUNBLE9BQU9BLENBQUNBLElBQUlBLEdBQUdBLENBQUNBO2dCQUNsQ0EsSUFBSUEsSUFBSUEsR0FBR0EsSUFBSUEsTUFBTUEsQ0FBQ0EsS0FBS0EsQ0FBQ0EsQ0FBQ0E7Z0JBQzdCQSxJQUFJQSxDQUFDQSxHQUFHQSxHQUFHQSxLQUFLQSxDQUFDQSxHQUFHQSxHQUFHQSxHQUFHQSxHQUFHQSxHQUFHQSxDQUFDQTtnQkFDakNBLElBQUlBLENBQUNBLFdBQVdBLENBQUNBLEdBQUdBLEtBQUtBLENBQUNBO2dCQUMxQkEsSUFBSUEsUUFBUUEsR0FBR0EsS0FBS0EsQ0FBQ0EsZ0JBQWdCQSxDQUFDQSxLQUFLQSxDQUFDQSxDQUFDQTtnQkFDN0NBLElBQUlBLENBQUNBLElBQUlBLEdBQUdBLFFBQVFBLENBQUNBO2dCQUdyQkEsSUFBSUEsT0FBT0EsR0FBR0EsS0FBS0EsQ0FBQ0EsU0FBU0EsQ0FBQ0EsSUFBSUEsS0FBS0EsQ0FBQ0EsYUFBYUEsQ0FBQ0EsSUFBSUEsRUFBRUEsQ0FBQ0E7Z0JBQzdEQSxJQUFJQSxDQUFDQSxPQUFPQSxHQUFHQSxPQUFPQSxDQUFDQTtnQkFFdkJBLEtBQUtBLENBQUNBLFFBQVFBLENBQUNBLElBQUlBLENBQUNBLElBQUlBLENBQUNBLENBQUNBO1lBQzVCQSxDQUFDQTtRQUNIQSxDQUFDQSxDQUFDQSxDQUFDQTtRQUdIQSxNQUFNQSxDQUFDQSxhQUFhQSxHQUFHQSxJQUFJQSxNQUFNQSxDQUFDQSxXQUFXQSxDQUFDQSxDQUFDQTtRQUUvQ0EsTUFBTUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsZ0JBQWdCQSxFQUFFQTtZQUM5QkEsSUFBSUEsY0FBY0EsR0FBR0EsTUFBTUEsQ0FBQ0EsY0FBY0EsQ0FBQ0E7WUFDM0NBLEVBQUVBLENBQUNBLENBQUNBLGNBQWNBLElBQUlBLGNBQWNBLENBQUNBLE1BQU1BLENBQUNBLENBQUNBLENBQUNBO2dCQUM1Q0EsTUFBTUEsQ0FBQ0EsYUFBYUEsR0FBR0EsSUFBSUEsTUFBTUEsQ0FBQ0EsV0FBV0EsQ0FBQ0EsQ0FBQ0E7Z0JBQy9DQSxPQUFPQSxDQUFDQSxPQUFPQSxDQUFDQSxNQUFNQSxDQUFDQSxjQUFjQSxFQUFFQSxVQUFDQSxZQUFZQTtvQkFDbERBLElBQUlBLFFBQVFBLEdBQUdBLEtBQUtBLENBQUNBLG1CQUFtQkEsQ0FBQ0EsWUFBWUEsQ0FBQ0EsQ0FBQ0E7b0JBQ3ZEQSxJQUFJQSxTQUFTQSxHQUFHQSxRQUFRQSxDQUFDQSxLQUFLQSxJQUFJQSxNQUFNQSxDQUFDQTtvQkFDekNBLElBQUlBLFFBQVFBLEdBQUdBLFFBQVFBLENBQUNBLEVBQUVBLElBQUlBLFNBQVNBLENBQUNBO29CQUN4Q0EsSUFBSUEsS0FBS0EsR0FBR0EsTUFBTUEsQ0FBQ0EsYUFBYUEsQ0FBQ0EsU0FBU0EsQ0FBQ0EsU0FBU0EsQ0FBQ0EsQ0FBQ0E7b0JBRXREQSxJQUFJQSxLQUFLQSxHQUFHQSxLQUFLQSxDQUFDQSxpQkFBaUJBLENBQUNBLFlBQVlBLEVBQUVBLFFBQVFBLENBQUNBLENBQUNBO29CQUM1REEsSUFBSUEsR0FBR0EsR0FBR0EsWUFBWUEsQ0FBQ0E7b0JBQ3ZCQSxJQUFJQSxLQUFLQSxHQUFHQSxLQUFLQSxDQUFDQSxPQUFPQSxDQUFDQSxJQUFJQSxZQUFZQSxDQUFDQTtvQkFDM0NBLElBQUlBLElBQUlBLEdBQUdBLElBQUlBLE1BQU1BLENBQUNBLEtBQUtBLENBQUNBLENBQUNBO29CQUM3QkEsSUFBSUEsQ0FBQ0EsR0FBR0EsR0FBR0EsUUFBUUEsR0FBR0EsR0FBR0EsR0FBR0EsR0FBR0EsQ0FBQ0E7b0JBQ2hDQSxJQUFJQSxDQUFDQSxHQUFHQSxHQUFHQSxHQUFHQSxDQUFDQTtvQkFDZkEsSUFBSUEsQ0FBQ0EsV0FBV0EsQ0FBQ0EsR0FBR0EsS0FBS0EsQ0FBQ0E7b0JBQzFCQSxJQUFJQSxPQUFPQSxHQUFHQSxLQUFLQSxDQUFDQSxTQUFTQSxDQUFDQSxJQUFJQSxLQUFLQSxDQUFDQSxhQUFhQSxDQUFDQSxJQUFJQSxLQUFLQSxDQUFDQTtvQkFDaEVBLElBQUlBLFFBQVFBLEdBQUdBLElBQUlBLENBQUNBLEdBQUdBLENBQUNBLEtBQUtBLENBQUNBLE1BQU1BLENBQUNBLElBQUlBLEtBQUtBLENBQUNBLFlBQVlBLENBQUNBLENBQUNBO29CQUM3REEsSUFBSUEsQ0FBQ0EsSUFBSUEsR0FBR0EsUUFBUUEsQ0FBQ0E7b0JBQ3JCQSxJQUFJQSxDQUFDQSxPQUFPQSxHQUFHQSxPQUFPQSxDQUFDQTtvQkFFdkJBLEtBQUtBLENBQUNBLFFBQVFBLENBQUNBLElBQUlBLENBQUNBLElBQUlBLENBQUNBLENBQUNBO2dCQUM1QkEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7WUFDTEEsQ0FBQ0E7UUFDSEEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7UUFDSEEsTUFBTUEsQ0FBQ0Esb0JBQW9CQSxHQUFHQSxDQUFDQSxNQUFNQSxDQUFDQSxDQUFDQTtRQUV2Q0EsTUFBTUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsZ0JBQWdCQSxFQUFFQTtZQUM5QixFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7Z0JBQzFCLFVBQVUsQ0FBQztvQkFDVCxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUM7Z0JBQ3ZCLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztZQUNULENBQUM7UUFDSCxDQUFDLENBQUNBLENBQUNBO1FBRUhBLE1BQU1BLENBQUNBLEdBQUdBLENBQUNBLHlCQUF5QkEsRUFBRUEsa0JBQWtCQSxDQUFDQSxDQUFDQTtRQUUxREEsTUFBTUEsQ0FBQ0EsY0FBY0EsR0FBR0EsVUFBQ0EsWUFBWUE7WUFDbkNBLE1BQU1BLENBQUNBLFlBQVlBLEdBQUdBLFlBQVlBLENBQUNBO1lBRW5DQSxZQUFZQSxDQUFDQSxJQUFJQSxHQUFHQSxNQUFNQSxDQUFDQSxnQkFBZ0JBLENBQUNBO1FBQzlDQSxDQUFDQSxDQUFDQTtRQUVGQSxNQUFNQSxDQUFDQSxPQUFPQSxHQUFHQTtZQUNmQSxFQUFFQSxDQUFDQSxDQUFDQSxNQUFNQSxDQUFDQSxXQUFXQSxDQUFDQSxDQUFDQSxDQUFDQTtnQkFDdkJBLE1BQU1BLENBQUNBLFNBQVNBLENBQUNBLElBQUlBLEVBQUVBLENBQUNBO1lBQzFCQSxDQUFDQTtZQUFDQSxJQUFJQSxDQUFDQSxDQUFDQTtnQkFDTkEsVUFBVUEsQ0FBQ0EsVUFBVUEsQ0FBQ0EsQ0FBQ0E7WUFDekJBLENBQUNBO1FBQ0hBLENBQUNBLENBQUNBO1FBRUZBLE1BQU1BLENBQUNBLGVBQWVBLEdBQUdBLFVBQUNBLElBQUlBO1lBQzVCQSxNQUFNQSxDQUFDQSxtQkFBbUJBLEdBQUdBLENBQUNBLElBQUlBLElBQUlBLElBQUlBLENBQUNBLFdBQVdBLENBQUNBLENBQUNBLEdBQUdBLElBQUlBLEdBQUdBLElBQUlBLENBQUNBO1lBQ3ZFQSxFQUFFQSxDQUFDQSxDQUFDQSxNQUFNQSxDQUFDQSxtQkFBbUJBLENBQUNBLENBQUNBLENBQUNBO2dCQUMvQkEsTUFBTUEsQ0FBQ0EscUJBQXFCQSxHQUFHQSxJQUFJQSxDQUFDQTtZQUN0Q0EsQ0FBQ0E7WUFDREEsT0FBT0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsV0FBV0EsR0FBR0EsTUFBTUEsQ0FBQ0EsbUJBQW1CQSxHQUFHQSxLQUFLQSxHQUFHQSxNQUFNQSxDQUFDQSxxQkFBcUJBLENBQUNBLENBQUNBO1FBQy9GQSxDQUFDQSxDQUFDQTtRQUVGQSxNQUFNQSxDQUFDQSxpQkFBaUJBLEdBQUdBLFVBQUNBLElBQUlBO1lBQzlCQSxNQUFNQSxDQUFDQSxxQkFBcUJBLEdBQUdBLENBQUNBLElBQUlBLElBQUlBLElBQUlBLENBQUNBLFdBQVdBLENBQUNBLENBQUNBLEdBQUdBLElBQUlBLEdBQUdBLElBQUlBLENBQUNBO1lBQ3pFQSxFQUFFQSxDQUFDQSxDQUFDQSxNQUFNQSxDQUFDQSxxQkFBcUJBLENBQUNBLENBQUNBLENBQUNBO2dCQUNqQ0EsTUFBTUEsQ0FBQ0EsbUJBQW1CQSxHQUFHQSxJQUFJQSxDQUFDQTtnQkFDbENBLElBQUlBLFFBQVFBLEdBQUdBLElBQUlBLENBQUNBLEdBQUdBLENBQUNBO2dCQUN4QkEsT0FBT0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsbUNBQW1DQSxHQUFHQSxRQUFRQSxDQUFDQSxDQUFDQTtnQkFDNURBLE1BQU1BLENBQUNBLGtCQUFrQkEsQ0FBQ0EsUUFBUUEsQ0FBQ0EsQ0FBQ0E7Z0JBQ3BDQSxNQUFNQSxDQUFDQSxxQkFBcUJBLEdBQUdBLFFBQVFBLENBQUNBO1lBQzFDQSxDQUFDQTtZQUNEQSxPQUFPQSxDQUFDQSxHQUFHQSxDQUFDQSxXQUFXQSxHQUFHQSxNQUFNQSxDQUFDQSxtQkFBbUJBLEdBQUdBLEtBQUtBLEdBQUdBLE1BQU1BLENBQUNBLHFCQUFxQkEsQ0FBQ0EsQ0FBQ0E7UUFDL0ZBLENBQUNBLENBQUNBO1FBRUZBLE1BQU1BLENBQUNBLGlCQUFpQkEsR0FBR0E7WUFDekJBLElBQUlBLFNBQVNBLEdBQUdBLElBQUlBLENBQUNBO1lBQ3JCQSxFQUFFQSxDQUFDQSxDQUFDQSxNQUFNQSxDQUFDQSxtQkFBbUJBLENBQUNBLENBQUNBLENBQUNBO2dCQUMvQkEsU0FBU0EsR0FBR0EsTUFBTUEsQ0FBQ0EsbUJBQW1CQSxDQUFDQSxXQUFXQSxDQUFDQSxDQUFDQTtnQkFDcERBLE1BQU1BLENBQUNBLGNBQWNBLEdBQUdBLElBQUlBLENBQUNBO1lBQy9CQSxDQUFDQTtZQUFDQSxJQUFJQSxDQUFDQSxFQUFFQSxDQUFDQSxDQUFDQSxNQUFNQSxDQUFDQSxxQkFBcUJBLENBQUNBLENBQUNBLENBQUNBO2dCQUd4Q0EsSUFBSUEsY0FBY0EsR0FBR0EsTUFBTUEsQ0FBQ0EscUJBQXFCQSxDQUFDQSxXQUFXQSxDQUFDQSxDQUFDQTtnQkFDL0RBLElBQUlBLGNBQWNBLEdBQUdBLE1BQU1BLENBQUNBLGNBQWNBLENBQUNBO2dCQUMzQ0EsU0FBU0EsR0FBR0EsTUFBTUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsV0FBV0EsQ0FBQ0EsUUFBUUEsQ0FBQ0E7Z0JBQy9DQSxNQUFNQSxDQUFDQSxjQUFjQSxHQUFHQTtvQkFDdEJBLEdBQUdBLEVBQUVBLE1BQU1BLENBQUNBLHFCQUFxQkEsQ0FBQ0EsR0FBR0E7b0JBQ3JDQSxNQUFNQSxFQUFFQSxjQUFjQTtvQkFDdEJBLE9BQU9BLEVBQUVBLGNBQWNBO2lCQUN4QkEsQ0FBQ0E7WUFDSkEsQ0FBQ0E7WUFDREEsTUFBTUEsQ0FBQ0EsU0FBU0EsQ0FBQ0E7UUFDbkJBLENBQUNBLENBQUNBO1FBRUZBLE1BQU1BLENBQUNBLGlCQUFpQkEsR0FBR0E7WUFDekJBLElBQUlBLFNBQVNBLEdBQUdBLE1BQU1BLENBQUNBLGlCQUFpQkEsRUFBRUEsQ0FBQ0E7WUFDM0NBLEVBQUVBLENBQUNBLENBQUNBLFNBQVNBLENBQUNBLENBQUNBLENBQUNBO2dCQUNkQSxVQUFVQSxDQUFDQSxTQUFTQSxDQUFDQSxDQUFDQTtZQUN4QkEsQ0FBQ0E7WUFBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0E7Z0JBQ05BLE9BQU9BLENBQUNBLEdBQUdBLENBQUNBLHdCQUF3QkEsQ0FBQ0EsQ0FBQ0E7WUFDeENBLENBQUNBO1lBQ0RBLE1BQU1BLENBQUNBLFNBQVNBLENBQUNBLEtBQUtBLEVBQUVBLENBQUNBO1FBQzNCQSxDQUFDQSxDQUFDQTtRQUVGQSxNQUFNQSxDQUFDQSxVQUFVQSxHQUFHQTtZQUNsQkEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsY0FBY0EsSUFBSUEsTUFBTUEsQ0FBQ0EsUUFBUUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0JBQzdDQSxNQUFNQSxDQUFDQSxjQUFjQSxDQUFDQSxNQUFNQSxFQUFFQSxDQUFDQTtnQkFDL0JBLE1BQU1BLENBQUNBLFFBQVFBLENBQUNBLE1BQU1BLEVBQUVBLENBQUNBO2dCQUN6QkEsTUFBTUEsQ0FBQ0EsY0FBY0EsR0FBR0EsSUFBSUEsQ0FBQ0E7Z0JBQzdCQSxNQUFNQSxDQUFDQSxRQUFRQSxHQUFHQSxJQUFJQSxDQUFDQTtZQUN6QkEsQ0FBQ0E7UUFDSEEsQ0FBQ0EsQ0FBQ0E7UUFFRkEsTUFBTUEsQ0FBQ0EsU0FBU0EsR0FBR0E7WUFDakJBLE1BQU1BLENBQUNBLE1BQU1BLENBQUNBLGNBQWNBLEdBQUdBLElBQUlBLEdBQUdBLEtBQUtBLENBQUNBO1FBQzlDQSxDQUFDQSxDQUFDQTtRQUVGQSxNQUFNQSxDQUFDQSxRQUFRQSxHQUFHQSxVQUFDQSxHQUFHQTtZQUNwQkEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsT0FBT0EsQ0FBQ0EsUUFBUUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0E7Z0JBQ3hCQSxNQUFNQSxDQUFDQSxTQUFTQSxDQUFDQSxZQUFZQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQTtZQUNyQ0EsSUFBSUEsRUFBRUEsR0FBR0EsR0FBR0EsQ0FBQ0EsUUFBUUEsQ0FBQ0E7WUFDdEJBLEVBQUVBLENBQUNBLENBQUNBLEVBQUVBLENBQUNBLENBQUNBLENBQUNBO2dCQUNQQSxNQUFNQSxDQUFDQSxFQUFFQSxDQUFDQSxTQUFTQSxDQUFDQSxDQUFDQTtZQUN2QkEsQ0FBQ0E7WUFDREEsTUFBTUEsQ0FBQ0EsU0FBU0EsQ0FBQ0EsWUFBWUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsSUFBSUEsRUFBRUEsQ0FBQ0EsQ0FBQ0E7UUFDNUNBLENBQUNBLENBQUNBO1FBRUZBLE1BQU1BLENBQUNBLElBQUlBLEdBQUdBO1lBRVpBLEVBQUVBLENBQUNBLENBQUNBLE1BQU1BLENBQUNBLFFBQVFBLElBQUlBLE1BQU1BLENBQUNBLFlBQVlBLENBQUNBLENBQUNBLENBQUNBO2dCQUMzQ0EsSUFBSUEsT0FBT0EsR0FBR0EsS0FBS0EsQ0FBQ0EscUJBQXFCQSxDQUFDQSxNQUFNQSxDQUFDQSxZQUFZQSxDQUFDQSxDQUFDQTtnQkFDL0RBLEVBQUVBLENBQUNBLENBQUNBLE9BQU9BLENBQUNBLENBQUNBLENBQUNBO29CQUNaQSxJQUFJQSxJQUFJQSxHQUFHQSxJQUFJQSxDQUFDQSxlQUFlQSxDQUFDQSxPQUFPQSxDQUFDQSxDQUFDQTtvQkFDekNBLEVBQUVBLENBQUNBLENBQUNBLElBQUlBLENBQUNBLENBQUNBLENBQUNBO3dCQUVUQSxJQUFJQSxhQUFhQSxHQUFHQSxNQUFNQSxDQUFDQSxhQUFhQSxJQUFJQSxlQUFlQSxHQUFHQSxNQUFNQSxDQUFDQSxNQUFNQSxDQUFDQTt3QkFDNUVBLGNBQWNBLENBQUNBLE9BQU9BLENBQUNBLE1BQU1BLENBQUNBLE1BQU1BLEVBQUVBLE1BQU1BLENBQUNBLE1BQU1BLEVBQUVBLElBQUlBLEVBQUVBLGFBQWFBLEVBQUVBLFVBQUNBLE1BQU1BOzRCQUMvRUEsSUFBSUEsQ0FBQ0EsVUFBVUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0E7NEJBQ3hCQSxJQUFJQSxDQUFDQSxZQUFZQSxDQUFDQSxTQUFTQSxFQUFFQSxRQUFRQSxHQUFHQSxNQUFNQSxDQUFDQSxNQUFNQSxDQUFDQSxDQUFDQTs0QkFDdkRBLE1BQU1BLENBQUNBLFFBQVFBLEdBQUdBLEtBQUtBLENBQUNBOzRCQUN4QkEsUUFBUUEsRUFBRUEsQ0FBQ0E7NEJBQ1hBLElBQUlBLENBQUNBLE1BQU1BLENBQUNBLE1BQU1BLENBQUNBLENBQUNBO3dCQUN0QkEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7b0JBQ0xBLENBQUNBO2dCQUNIQSxDQUFDQTtZQUNIQSxDQUFDQTtRQUNIQSxDQUFDQSxDQUFDQTtRQUVGQSxNQUFNQSxDQUFDQSxNQUFNQSxHQUFHQTtZQUNkQSxPQUFPQSxDQUFDQSxHQUFHQSxDQUFDQSxlQUFlQSxDQUFDQSxDQUFDQTtRQUUvQkEsQ0FBQ0EsQ0FBQ0E7UUFFRkEsTUFBTUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsZ0JBQWdCQSxFQUFFQTtZQUM5QixFQUFFLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO2dCQUdoQixVQUFVLENBQUMsVUFBVSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1lBQzdCLENBQUM7UUFDSCxDQUFDLENBQUNBLENBQUNBO1FBRUhBLE1BQU1BLENBQUNBLEdBQUdBLENBQUNBLHFCQUFxQkEsRUFBRUEsVUFBVUEsS0FBS0EsRUFBRUEsT0FBT0EsRUFBRUEsUUFBUUE7WUFFbEUsVUFBVSxDQUFDLFVBQVUsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUM3QixDQUFDLENBQUNBLENBQUNBO1FBRUhBLFNBQVNBLGdCQUFnQkEsQ0FBQ0EsUUFBUUE7WUFDaENrQyxJQUFJQSxZQUFZQSxHQUFHQSxLQUFLQSxDQUFDQSxtQkFBbUJBLENBQUNBLFFBQVFBLEVBQUVBLElBQUlBLENBQUNBLENBQUNBO1lBQzdEQSxFQUFFQSxDQUFDQSxDQUFDQSxZQUFZQSxDQUFDQSxDQUFDQSxDQUFDQTtnQkFDakJBLE1BQU1BLENBQUNBLFdBQVdBLEdBQUdBLFlBQVlBLENBQUNBO1lBQ3BDQSxDQUFDQTtZQUNEQSxNQUFNQSxDQUFDQSxZQUFZQSxDQUFDQTtRQUN0QkEsQ0FBQ0E7UUFFRGxDLE1BQU1BLENBQUNBLFlBQVlBLEdBQUdBLFVBQUNBLE1BQU1BLEVBQUVBLFFBQVFBO1lBQ3JDQSxNQUFNQSxDQUFDQSxjQUFjQSxHQUFHQSxNQUFNQSxDQUFDQTtZQUMvQkEsTUFBTUEsQ0FBQ0EsUUFBUUEsR0FBR0EsUUFBUUEsQ0FBQ0E7WUFDM0JBLE1BQU1BLENBQUNBLGtCQUFrQkEsR0FBR0EsSUFBSUEsQ0FBQ0E7WUFDakNBLE1BQU1BLENBQUNBLGVBQWVBLEdBQUdBLElBQUlBLENBQUNBO1lBQzlCQSxNQUFNQSxDQUFDQSxXQUFXQSxHQUFHQSxJQUFJQSxDQUFDQTtZQUMxQkEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0JBQ1hBLE1BQU1BLENBQUNBLFFBQVFBLEdBQUdBLEtBQUtBLENBQUNBLGtCQUFrQkEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0E7Z0JBQ25EQSxNQUFNQSxDQUFDQSxxQkFBcUJBLEdBQUdBLEVBQUVBLENBQUNBO1lBQ3BDQSxDQUFDQTtZQUNEQSxJQUFJQSxRQUFRQSxHQUFHQSxLQUFLQSxDQUFDQSxvQkFBb0JBLENBQUNBLE1BQU1BLENBQUNBLENBQUNBO1lBRWxEQSxJQUFJQSxZQUFZQSxHQUFHQSxnQkFBZ0JBLENBQUNBLFFBQVFBLENBQUNBLENBQUNBO1lBQzlDQSxFQUFFQSxDQUFDQSxDQUFDQSxRQUFRQSxDQUFDQSxDQUFDQSxDQUFDQTtnQkFFYkEsTUFBTUEsQ0FBQ0EsU0FBU0EsR0FBR0EsS0FBS0EsQ0FBQ0EsY0FBY0EsQ0FBQ0EsUUFBUUEsQ0FBQ0EsQ0FBQ0E7Z0JBQ2xEQSxFQUFFQSxDQUFDQSxDQUFDQSxNQUFNQSxDQUFDQSxTQUFTQSxDQUFDQSxDQUFDQSxDQUFDQTtvQkFDckJBLE1BQU1BLENBQUNBLGtCQUFrQkEsR0FBR0EsNENBQTRDQSxDQUFDQTtnQkFDM0VBLENBQUNBO2dCQUNEQSxNQUFNQSxDQUFDQSxlQUFlQSxHQUFHQSw0QkFBNEJBLENBQUNBO2dCQUN0REEsSUFBSUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0E7WUFDdEJBLENBQUNBO1FBQ0hBLENBQUNBLENBQUNBO1FBRUZBLE1BQU1BLENBQUNBLGVBQWVBLEdBQUdBLFVBQUNBLElBQUlBLEVBQUVBLFVBQVVBO1lBQ3hDQSxJQUFJQSxVQUFVQSxHQUFHQSxJQUFJQSxDQUFDQSxJQUFJQSxDQUFDQTtZQUMzQkEsSUFBSUEsWUFBWUEsR0FBR0EsVUFBVUEsQ0FBQ0EsSUFBSUEsQ0FBQ0E7WUFDbkNBLEVBQUVBLENBQUNBLENBQUNBLFVBQVVBLElBQUlBLFlBQVlBLENBQUNBLENBQUNBLENBQUNBO2dCQUMvQkEsSUFBSUEsTUFBTUEsR0FBR0EsS0FBS0EsQ0FBQ0Esb0JBQW9CQSxDQUFDQSxVQUFVQSxDQUFDQSxDQUFDQTtnQkFDcERBLElBQUlBLFFBQVFBLEdBQUdBLEtBQUtBLENBQUNBLG9CQUFvQkEsQ0FBQ0EsWUFBWUEsQ0FBQ0EsQ0FBQ0E7Z0JBQ3hEQSxFQUFFQSxDQUFDQSxDQUFDQSxNQUFNQSxJQUFJQSxRQUFRQSxDQUFDQSxDQUFDQSxDQUFDQTtvQkFFdkJBLEVBQUVBLENBQUNBLENBQUNBLFFBQVFBLEtBQUtBLE9BQU9BLENBQUNBLENBQUNBLENBQUNBO3dCQUN6QkEsTUFBTUEsQ0FBQ0EsTUFBTUEsS0FBS0EsT0FBT0EsQ0FBQ0E7b0JBQzVCQSxDQUFDQTtvQkFDREEsTUFBTUEsQ0FBQ0EsSUFBSUEsQ0FBQ0E7Z0JBQ2RBLENBQUNBO1lBQ0hBLENBQUNBO1lBQ0RBLE1BQU1BLENBQUNBLEtBQUtBLENBQUNBO1FBQ2ZBLENBQUNBLENBQUNBO1FBRUZBLE1BQU1BLENBQUNBLFVBQVVBLEdBQUdBLFVBQUNBLElBQUlBLEVBQUVBLFVBQVVBLEVBQUVBLE9BQU9BLEVBQUVBLEVBQUVBLEVBQUVBLFNBQVNBO1lBQzNEQSxJQUFJQSxVQUFVQSxHQUFHQSxJQUFJQSxDQUFDQSxJQUFJQSxDQUFDQTtZQUMzQkEsSUFBSUEsWUFBWUEsR0FBR0EsVUFBVUEsQ0FBQ0EsSUFBSUEsQ0FBQ0E7WUFDbkNBLEVBQUVBLENBQUNBLENBQUNBLFVBQVVBLElBQUlBLFlBQVlBLENBQUNBLENBQUNBLENBQUNBO2dCQUUvQkEsSUFBSUEsTUFBTUEsR0FBR0EsS0FBS0EsQ0FBQ0Esb0JBQW9CQSxDQUFDQSxVQUFVQSxDQUFDQSxDQUFDQTtnQkFDcERBLElBQUlBLFFBQVFBLEdBQUdBLEtBQUtBLENBQUNBLG9CQUFvQkEsQ0FBQ0EsWUFBWUEsQ0FBQ0EsQ0FBQ0E7Z0JBRXhEQSxFQUFFQSxDQUFDQSxDQUFDQSxNQUFNQSxLQUFLQSxPQUFPQSxDQUFDQSxDQUFDQSxDQUFDQTtvQkFFdkJBLEVBQUVBLENBQUNBLENBQUNBLFFBQVFBLEtBQUtBLE9BQU9BLENBQUNBLENBQUNBLENBQUNBO3dCQUN6QkEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsT0FBT0EsS0FBS0EsTUFBTUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7NEJBQ3ZCQSxPQUFPQSxHQUFHQSxPQUFPQSxDQUFDQTt3QkFDcEJBLENBQUNBO29CQUNIQSxDQUFDQTtvQkFBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0E7d0JBRU5BLE9BQU9BLEdBQUdBLE1BQU1BLENBQUNBO29CQUNuQkEsQ0FBQ0E7Z0JBQ0hBLENBQUNBO2dCQUNEQSxJQUFJQSxDQUFDQSxDQUFDQTtvQkFDSkEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsS0FBS0EsQ0FBQ0EsWUFBWUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7d0JBQy9CQSxPQUFPQSxHQUFHQSxNQUFNQSxDQUFDQTtvQkFDbkJBLENBQUNBO29CQUFDQSxJQUFJQSxDQUFDQSxDQUFDQTt3QkFDTkEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsT0FBT0EsS0FBS0EsUUFBUUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7NEJBQ3pCQSxPQUFPQSxHQUFHQSxPQUFPQSxDQUFDQTt3QkFDcEJBLENBQUNBO29CQUNIQSxDQUFDQTtnQkFDSEEsQ0FBQ0E7Z0JBQ0RBLE9BQU9BLENBQUNBLEdBQUdBLENBQUNBLG1CQUFtQkEsR0FBR0EsTUFBTUEsR0FBR0EsYUFBYUEsR0FBR0EsUUFBUUEsR0FBR0EsWUFBWUEsR0FBR0EsT0FBT0EsQ0FBQ0EsQ0FBQ0E7Z0JBRTlGQSxVQUFVQSxDQUFDQSxJQUFJQSxDQUFDQSxJQUFJQSxFQUFFQSxPQUFPQSxDQUFDQSxDQUFDQTtZQUNqQ0EsQ0FBQ0E7UUFDSEEsQ0FBQ0EsQ0FBQ0E7UUFHRkEsVUFBVUEsRUFBRUEsQ0FBQ0E7UUFFYkEsU0FBU0EsVUFBVUEsQ0FBQ0EsU0FBU0E7WUFDM0JtQyxJQUFJQSxHQUFHQSxHQUFHQSxNQUFNQSxDQUFDQSxHQUFHQSxJQUFJQSxRQUFRQSxDQUFDQTtZQUNqQ0EsSUFBSUEsWUFBWUEsR0FBR0EsTUFBTUEsQ0FBQ0EsY0FBY0EsSUFBSUEsTUFBTUEsQ0FBQ0EsZ0JBQWdCQSxDQUFDQTtZQUNwRUEsSUFBSUEsR0FBR0EsR0FBR0EsU0FBU0EsQ0FBQ0EsS0FBS0EsQ0FBQ0EsQ0FBQ0E7WUFDM0JBLElBQUlBLFVBQVVBLEdBQUdBLElBQUlBLENBQUNBO1lBQ3RCQSxFQUFFQSxDQUFDQSxDQUFDQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFDQTtnQkFDVEEsT0FBT0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsMkJBQTJCQSxHQUFHQSxJQUFJQSxDQUFDQSxTQUFTQSxDQUFDQSxTQUFTQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUN2RUEsQ0FBQ0E7WUFBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0E7Z0JBQ05BLElBQUlBLFFBQVFBLEdBQUdBLE1BQU1BLENBQUNBLFFBQVFBLENBQUNBO2dCQUMvQkEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsR0FBR0EsS0FBS0EsT0FBT0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7b0JBRXBCQSxRQUFRQSxHQUFHQSxNQUFNQSxDQUFDQSxZQUFZQSxDQUFDQTtnQkFDakNBLENBQUNBO2dCQUFDQSxJQUFJQSxDQUFDQSxDQUFDQTtvQkFDTkEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsUUFBUUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7d0JBRWRBLElBQUlBLElBQUlBLEdBQUdBLE1BQU1BLENBQUNBLFlBQVlBLENBQUNBO3dCQUMvQkEsSUFBSUEsUUFBUUEsR0FBR0EsSUFBSUEsQ0FBQ0EsV0FBV0EsRUFBRUEsQ0FBQ0E7d0JBQ2xDQSxFQUFFQSxDQUFDQSxDQUFDQSxDQUFDQSxRQUFRQSxJQUFJQSxDQUFDQSxRQUFRQSxDQUFDQSxNQUFNQSxDQUFDQSxDQUFDQSxDQUFDQTs0QkFDbENBLFVBQVVBLENBQUNBLEtBQUtBLENBQUNBLGNBQWNBLENBQUNBLE9BQU9BLENBQUNBLENBQUNBLENBQUNBOzRCQUMxQ0EsUUFBUUEsR0FBR0EsSUFBSUEsQ0FBQ0EsV0FBV0EsRUFBRUEsQ0FBQ0E7d0JBQ2hDQSxDQUFDQTt3QkFDREEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsUUFBUUEsSUFBSUEsUUFBUUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7NEJBQ2hDQSxRQUFRQSxHQUFHQSxRQUFRQSxDQUFDQSxRQUFRQSxDQUFDQSxNQUFNQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFDQTt3QkFDM0NBLENBQUNBO3dCQUFDQSxJQUFJQSxDQUFDQSxDQUFDQTs0QkFDTkEsT0FBT0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsOENBQThDQSxDQUFDQSxDQUFDQTs0QkFDNURBLE1BQU1BLENBQUNBO3dCQUNUQSxDQUFDQTtvQkFDSEEsQ0FBQ0E7b0JBS0RBLElBQUlBLFFBQVFBLEdBQUdBLEtBQUtBLENBQUNBLG9CQUFvQkEsQ0FBQ0EsUUFBUUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0E7b0JBQ3pEQSxFQUFFQSxDQUFDQSxDQUFDQSxDQUFDQSxLQUFLQSxDQUFDQSxZQUFZQSxDQUFDQSxRQUFRQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTt3QkFFbENBLFVBQVVBLEdBQUdBLFFBQVFBLENBQUNBLGNBQWNBLEVBQUVBLENBQUNBO3dCQUN2Q0EsUUFBUUEsR0FBR0EsUUFBUUEsQ0FBQ0EsU0FBU0EsRUFB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Q0FBQ0EsSUFBSUEsQ0FBQ0EsVUFBQ0EsR0FBR0EsRUFBRUEsS0FBS0E7Z0JBQ2hDQSxJQUFJQSxFQUFFQSxHQUFHQSxLQUFLQSxDQUFDQSxZQUFZQSxDQUFDQSxJQUFJQSxDQUFDQSxDQUFDQTtnQkFDbENBLEVBQUVBLENBQUNBLENBQUNBLEVBQUVBLENBQUNBLENBQUNBLENBQUNBO29CQUNQQSxNQUFNQSxDQUFDQSxRQUFRQSxDQUFDQSxJQUFJQSxDQUFDQSxFQUFFQSxDQUFDQSxDQUFDQTtnQkFDM0JBLENBQUNBO1lBQ0hBLENBQUNBLENBQUNBLENBQUNBO1FBQ0xBLENBQUNBO1FBRUQ1QyxTQUFTQSx1QkFBdUJBO1lBQzlCNkMsRUFBRUEsQ0FBQ0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0JBQ2ZBLEVBQUVBLENBQUNBLENBQUNBLENBQUNBLE1BQU1BLENBQUNBLGVBQWVBLElBQUlBLE1BQU1BLENBQUNBLFFBQVFBLElBQUlBLE1BQU1BLENBQUNBLFFBQVFBLENBQUNBLE1BQU1BLENBQUNBLENBQUNBLENBQUNBO29CQUN6RUEsTUFBTUEsQ0FBQ0EsZUFBZUEsR0FBR0EsTUFBTUEsQ0FBQ0EsUUFBUUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0JBQzlDQSxDQUFDQTtnQkFDREEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsZUFBZUEsSUFBSUEsTUFBTUEsQ0FBQ0EsZUFBZUEsS0FBS0EsTUFBTUEsQ0FBQ0EsWUFBWUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7b0JBQzdFQSxJQUFJQSxLQUFLQSxHQUFHQSxFQUFFQSxDQUFDQTtvQkFDZkEsSUFBSUEsS0FBS0EsR0FBR0EsRUFBRUEsQ0FBQ0E7b0JBQ2ZBLEtBQUtBLENBQUNBLGlCQUFpQkEsQ0FBQ0EsTUFBTUEsRUFBRUEsTUFBTUEsQ0FBQ0EsR0FBR0EsRUFBRUEsTUFBTUEsQ0FBQ0EsZUFBZUEsRUFBRUEsS0FBS0EsRUFBRUEsS0FBS0EsRUFBRUEsUUFBUUEsRUFBRUEsQ0FBQ0EsQ0FBQ0E7b0JBQzlG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QUNBLElBQUlBLEdBQUdBO1lBQ1pBLEVBQUVBLENBQUNBLENBQUNBLE1BQU1BLENBQUNBLGFBQWFBLENBQUNBLE1BQU1BLEdBQUdBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO2dCQUNwQ0EsSUFBSUEsTUFBTUEsR0FBR0EsTUFBTUEsQ0FBQ0EsYUFBYUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0JBUXJDQSxJQUFJQSxJQUFJQSxHQUFHQSxjQUFTQSxDQUFDQSxNQUFNQSxDQUFDQSxHQUFHQSxRQUFRQSxHQUFHQSxVQUFVQSxDQUFDQSxNQUFNQSxDQUFDQSxHQUFHQSxHQUFHQSxHQUFHQSxNQUFNQSxDQUFDQSxRQUFRQSxHQUFHQSxHQUFHQSxDQUFDQTtnQkFDM0ZBLElBQUlBLElBQUlBLEdBQUdBLElBQUlBLENBQUNBLFdBQVdBLENBQUNBLElBQUlBLEVBQUVBLEdBQUdBLENBQUNBLENBQUNBO2dCQUN2Q0EsU0FBU0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0E7WUFDdkJBLENBQUNBO1FBQ0hBLENBQUNBLENBQUNBO1FBRUZBLFVBQVVBLEVBQUVBLENBQUNBO1FBRWJBLFNBQVNBLFVBQVVBO1lBQ2pCdUMsSUFBSUEsUUFBUUEsR0FBR0EsTUFBTUEsQ0FBQ0EsUUFBUUEsQ0FBQ0E7WUFFL0JBLElBQUlBLENBQUNBLFlBQVlBLENBQUNBLE9BQU9BLEVBQUVBLGNBQWNBLEVBQUVBLE1BQU1BLEVBQUVBLEtBQUtBLENBQUNBLENBQUNBO1lBRTFEQSxjQUFjQSxDQUFDQSxVQUFVQSxDQUFDQSxRQUFRQSxFQUFFQSxVQUFDQSxVQUFVQTtnQkFDN0NBLE1BQU1BLENBQUNBLFVBQVVBLEdBQUdBLFVBQVVBLENBQUNBO2dCQUMvQkEsSUFBSUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0E7WUFDdEJBLENBQUNBLENBQUNBLENBQUNBO1lBRUhBLGNBQWNBLENBQUNBLFVBQVVBLENBQUNBLFFBQVFBLEVBQUVBLFVBQUNBLE9BQU9BO2dCQUMxQ0EsTUFBTUEsQ0FBQ0Es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QUFHQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtvQkFDWkEsSUFBSUEsSUFBSUEsUUFBUUEsQ0FBQ0EsU0FBU0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0E7Z0JBQ2xDQSxDQUFDQTtZQUNIQSxDQUFDQTtZQUdEQSxJQUFJQSxNQUFNQSxHQUFVQSxNQUFNQSxDQUFDQSxNQUFNQSxDQUFDQTtZQUNsQ0EsRUFBRUEsQ0FBQ0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0JBRWxCQSxJQUFJQSxHQUFHQSxHQUFPQSxNQUFNQSxDQUFDQSxXQUFXQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQTtnQkFDdENBLEVBQUVBLENBQUNBLENBQUNBLEdBQUdBLElBQUlBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO29CQUNiQSxNQUFNQSxHQUFHQSxFQUFFQSxDQUFDQTtnQkFDZEEsQ0FBQ0E7Z0JBQUNBLElBQUlBLENBQUNBLENBQUNBO29CQUNOQSxNQUFNQSxHQUFHQSxNQUFNQSxDQUFDQSxTQUFTQSxDQUFDQSxDQUFDQSxFQUFFQSxHQUFHQSxDQUFDQSxDQUFDQTtnQkFDcENBLENBQUNBO1lBQ0hBLENBQUNBO1lBQ0RBLElBQUlBLEdBQUdBLEdBQU9BLElBQUlBLENBQUNBLFdBQVdBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBO1lBQ3BDQSxFQUFFQSxDQUFDQSxDQUFDQSxHQUFHQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtnQkFDWkEsTUFBTUEsSUFBSUEsR0FBR0EsR0FBR0EsSUFBSUEsQ0FBQ0EsU0FBU0EsQ0FBQ0EsQ0FBQ0EsRUFBRUEsR0FBR0EsQ0FBQ0EsQ0FBQ0E7Z0JBQ3ZDQSxJQUFJQSxHQUFHQSxJQUFJQSxDQUFDQSxTQUFTQSxDQUFDQSxHQUFHQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUNqQ0EsQ0FBQ0E7WUFDREEsTUFBTUEsR0FBR0EsSUFBSUEsQ0FBQ0EsV0FBV0EsQ0FBQ0EsTUFBTUEsRUFBRUEsR0FBR0EsQ0FBQ0EsQ0FBQ0E7WUFDdkNB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LE1BQU1BLENBQUNBLE1BQU1BLEVBQUVBLFNBQVNBLEVBQUVBLE1BQU1BLENBQUNBLFFBQVFBLENBQUNBLEVBQWhFQSxDQUFnRUEsQ0FBQ0E7UUFFekZBLE1BQU1BLENBQUNBLE1BQU1BLEdBQUdBO1lBQ2RBLFFBQVFBLEVBQUVBLENBQUNBO1FBQ2JBLENBQUNBLENBQUNBO1FBRUZBLE1BQU1BLENBQUNBLElBQUlBLEdBQUdBO1lBQ1pBLEVBQUVBLENBQUNBLENBQUNBLE1BQU1BLENBQUNBLFFBQVFBLElBQUlBLE1BQU1BLENBQUNBLFFBQVFBLENBQUNBLENBQUNBLENBQUNBO2dCQUN2Q0EsTUFBTUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsUUFBUUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7WUFDM0JBLENBQUNBO1FBQ0hBLENBQUNBLENBQUNBO1FBRUZBLE1BQU1BLENBQUNBLE1BQU1BLEdBQUdBO1lBRWRBLElBQUlBLElBQUlBLEdBQUdBLE1BQU1BLENBQUNBLE1BQU1BLEdBQUdBLEdBQUdBLEdBQUdBLE1BQU1BLENBQUNBLFFBQVFBLENBQUNBO1lBQ2pEQSxPQUFPQSxDQUFDQSxHQUFHQSxDQUFDQSx1QkFBdUJBLEdBQUdBLElBQUlBLENBQUNBLENBQUNBO1lBQzVDQSxNQUFNQSxDQUFDQSxJQUFJQSxDQUFDQSxDQUFDQTtRQUNmQSxDQUFDQSxDQUFDQTtRQUVGQSxNQUFNQSxDQUFDQSxRQUFRQSxHQUFHQSxVQUFDQSxJQUFJQSxFQUFFQSxJQUFJQTtZQUMzQkEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsUUFBUUEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0JBQ2ZBLE1BQU1BLENBQUNBLE1BQU1BLEVBQUVBLENBQUNBO1lBQ2xCQSxDQUFDQTtZQUFDQSxJQUFJQSxDQUFDQSxDQUFDQTtnQkFDTkEsTUFBTUEsQ0FBQ0EsSUFBSUEsRUFBRUEsQ0FBQ0E7WUFDaEJBLENBQUNBO1FBQ0hBLENBQUNBLENBQUNBO1FBRUZBLE1BQU1BLENBQUNBLFFBQVFBLEdBQUdBLFVBQUNBLElBQUlBO1lBQ3JCQSxVQUFVQSxDQUFDQTtn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LEdBQUdBLElBQUlBLENBQUNBLE1BQU1BLENBQUNBLFlBQVlBLEVBQUVBLFNBQVNBLENBQUNBLENBQUNBO1lBQ2hEQSxJQUFJQSxLQUFLQSxHQUFHQSxJQUFJQSxHQUFHQSxJQUFJQSxDQUFDQSxLQUFLQSxDQUFDQSxHQUFHQSxDQUFDQSxHQUFHQSxFQUFFQSxDQUFDQTtZQUN4Q0EsT0FBT0EsQ0FBQ0EsT0FBT0EsQ0FBQ0EsS0FBS0EsRUFBRUEsVUFBQ0EsSUFBSUE7Z0JBQzFCQSxFQUFFQSxDQUFDQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSxVQUFVQSxDQUFDQSxHQUFHQSxDQUFDQSxJQUFJQSxDQUFDQSxJQUFJQSxDQUFDQSxRQUFRQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtvQkFDakRBLElBQUlBLElBQUlBLEdBQUdBLENBQUNBO2dCQUNkQSxDQUFDQTtnQkFDREEsSUFBSUEsSUFBSUEsSUFBSUEsQ0FBQ0EsVUFBVUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0E7Z0JBQzlCQSxFQUFFQSxDQUFDQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSxPQUFPQSxFQUFFQSxDQUFDQSxDQUFDQSxDQUFDQTtvQkFDcEJBLE1BQU1BLENBQUNBLFdBQVdBLENBQUNBLElBQUlBLENBQUNBLEVBQUNBLElBQUlBLEVBQUVBLElBQUlBLEVBQUVBLElBQUlBLEVBQUVBLElBQUlBLEVBQUNBLENBQUNBLENBQUNBO2dCQUNwREEsQ0FBQ0E7WUFDSEEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7WUFFSEEsSUFBSUEsR0FBR0EsR0FBR0EsU0FBU0EsQ0FBQ0EsSUFBSUEsRUFBRUEsQ0FBQ0E7WUFDM0JBLEVBQUVBLENBQUNBLENBQUNBLE1BQU1BLENBQUNBLFdBQVdBLENBQUNBLE1BQU1BLENBQUNBLENBQUNBLENBQUNBO2dCQUM5QkEsSUFBSUEsSUFBSUEsR0FBR0EsTUFBTUEsQ0FBQ0EsV0FBV0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsV0FBV0EsQ0FBQ0EsTUFBTUEsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0JBRTdEQSxJQUFJQSxDQUFDQSxJQUFJQSxHQUFHQSxJQUFJQSxDQUFDQSxzQkFBc0JBLENBQUNBLElBQUlBLENBQUNBLElBQUlBLENBQUNBLENBQUNBO2dCQUVuREEsSUFBSUEsUUFBUUEsR0FBR0EsS0FBS0EsQ0FBQ0E7Z0JBQ3JCQSxPQUFPQSxDQUFDQSxPQUFPQSxDQUFDQSxJQUFJQSxDQUFDQSxlQUFlQSxDQUFDQSxNQUFNQSxDQUFDQSxFQUFFQSxVQUFDQSxJQUFJQTtvQkFDakRBLEVBQUVBLENBQUNBLENBQUNBLENBQUNBLFFBQVFBLElBQUlBLEdBQUdBLENBQUNBLFVBQVVBLENBQUNBLElBQUlBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO3dCQUV0Q0EsMEJBQTBCQSxDQUFDQSxNQUFNQSxDQUFDQSxXQUFXQSxDQUFDQSxJQUFJQSxFQUFFQSxFQUFFQSxJQUFJQSxDQUFDQSxXQUFXQSxDQUFDQSxJQUFJQSxFQUFFQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFDQTt3QkFDbkZBLFFBQVFBLEdBQUdBLElBQUlBLENBQUNBO29CQUNsQkEsQ0FBQ0E7Z0JBQ0hBLENBQUNBLENBQUNBLENBQUNBO2dCQUNIQSxFQUFFQSxDQUFDQSxDQUFDQSxDQUFDQSxRQUFRQSxJQUFJQSxTQUFTQSxDQUFDQSxNQUFNQSxFQUFFQSxDQUFDQSxNQUFNQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtvQkFDNUNBLElBQUlBLFFBQVFBLEdBQUdBLE1BQU1BLENBQUNBLFdBQVdBLENBQUNBLElBQUlBLEVBQUVBLENBQUNBLElBQUlBLENBQUNBO29CQUM5Q0EsRUFBRUEsQ0FBQ0EsQ0FBQ0EsUUFBUUEsSUFBSUEsUUFBUUEsQ0FBQ0EsUUFBUUEsQ0FBQ0EsT0FBT0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7d0JBRTNDQSwwQkFBMEJBLENBQUNBLE1BQU1BLENBQUNBLFdBQVdBLENBQUNBLE1BQU1BLENBQUNBLFdBQVdBLENBQUNBLE1BQU1BLEdBQUdBLENBQUNBLENBQUNBLEVBQUVBLGdCQUFnQkEsQ0FBQ0EsQ0FBQ0E7b0JBQ2xHQSxDQUFDQTtnQkFDSEEsQ0FBQ0E7WUFDSEEsQ0FBQ0E7WUFlREEsSUFBSUEsSUFBSUEsR0FBVUEsSUFBSUEsQ0FBQ0E7WUFDdkJBLEVBQUVBLENBQUNBLENBQUNBLEdBQUdBLENBQUNBLFVBQVVBLENBQUNBLGVBQWVBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO2dCQUVwQ0EsSUFBSUEsR0FBR0EsQ0FBQ0EsWUFBWUEsQ0FBQ0EsVUFBVUEsQ0FBQ0EsSUFBSUEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsU0FBU0EsQ0FBQ0EsQ0FBQ0EsRUFBRUEsQ0FBQ0EsQ0FBQ0EsSUFBSUEsU0FBU0EsQ0FBQ0E7Z0JBQ3JFQSxNQUFNQSxDQUFDQSxXQUFXQSxDQUFDQSxJQUFJQSxDQUFDQSxFQUFDQSxJQUFJQSxFQUFFQSxHQUFHQSxHQUFHQSxHQUFHQSxFQUFFQSxJQUFJQSxFQUFFQSxJQUFJQSxFQUFDQSxDQUFDQSxDQUFDQTtZQUN6REEsQ0FBQ0E7WUFDREEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsVUFBVUEsQ0FBQ0EsWUFBWUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0JBRWpDQSxJQUFJQSxFQUFFQSxHQUFHQSxDQUFDQSxZQUFZQSxDQUFDQSxVQUFVQSxDQUFDQSxJQUFJQSxFQUFFQSxDQUFDQSxDQUFDQSxTQUFTQSxDQUFDQSxDQUFDQSxFQUFFQSxDQUFDQSxDQUFDQSxDQUFDQTtnQkFDMURBLElBQUlBLEVBQUVBLEdBQUdBLENBQUNBLFlBQVlBLENBQUNBLGNBQWNBLENBQUNBLElBQUlBLEVBQUVBLENBQUNBLENBQUNBLFNBQVNBLENBQUNBLENBQUNBLEVBQUVBLENBQUNBLENBQUNBLENBQUNBO2dCQUM5REEsSUFBSUEsR0FBR0EsTUFBTUEsQ0FBQ0E7Z0JBQ2RBLEVBQUVBLENBQUNBLENBQUNBLEVBQUVBLENBQUNBLENBQUNBLENBQUNBO29CQUNQQSxFQUFFQSxDQUFDQSxDQUFDQSxFQUFFQSxDQUFDQSxDQUFDQSxDQUFDQTt3QkFDUEEsSUFBSUEsSUFBSUEsR0FBR0EsR0FBR0Es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TUEsQ0FBQ0EsRUFBRUEsQ0FBQ0E7WUFDWkEsQ0FBQ0E7WUFDREEsTUFBTUEsQ0FBQ0EsT0FBT0EsQ0FBQ0E7UUFDakJBLENBQUNBLENBQUNBO1FBRUZBLE1BQU1BLENBQUNBLFVBQVVBLEdBQUdBO1lBQ2xCQSxJQUFJQSxLQUFLQSxHQUFHQSxjQUFTQSxDQUFDQSxNQUFNQSxDQUFDQSxDQUFDQTtZQUM5QkEsSUFBSUEsTUFBTUEsR0FBR0EsS0FBS0EsR0FBR0EsT0FBT0EsQ0FBQ0E7WUFFN0JBLElBQUlBLEtBQUtBLEdBQUdBLE1BQU1BLENBQUNBLE1BQU1BLENBQUNBLEtBQUtBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBO1lBRXJDQSxJQUFJQSxJQUFJQSxHQUFHQSxHQUFHQSxHQUFHQSxLQUFLQSxDQUFDQSxLQUFLQSxDQUFDQSxLQUFLQSxDQUFDQSxNQUFNQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQTtZQUV6REEsTUFBTUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsVUFBVUEsQ0FBQ0EsU0FBU0EsRUFBRUEsTUFBTUEsR0FBR0EsSUFBSUEsRUFBRUEsRUFBRUEsQ0FBQ0EsQ0FBQ0E7UUFDdkRBLENBQUNBLENBQUNBO1FBR0ZBLE1BQU1BLENBQUNBLFNBQVNBLEdBQUdBLFVBQUNBLEtBQUtBO1lBQ3ZCQSxJQUFJQSxLQUFLQSxHQUFHQSxjQUFTQSxDQUFDQSxNQUFNQSxDQUFDQSxDQUFDQTtZQUM5QkEsSUFBSUEsTUFBTUEsR0FBR0EsS0FBS0EsR0FBR0EsT0FBT0EsQ0FBQ0E7WUFDN0JBLElBQUlBLE9BQU9BLEdBQUdBLEVBQUVBLENBQUNBO1lBQ2pCQSxJQUFJQSxJQUFJQSxHQUFHQSxJQUFJQSxDQUFDQSxVQUFVQSxDQUFDQSxLQUFLQSxDQUFDQSxJQUFJQSxDQUFDQSxDQUFDQTtZQUN2Q0EsRUFBRUEsQ0FBQ0EsQ0FBQ0EsS0FBS0EsQ0FBQ0EsU0FBU0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0JBRXBCQSxJQUFJQSxRQUFRQSxHQUFHQSxJQUFJQSxHQUFHQSxPQUFPQSxDQUFDQTtnQkFDOUJBLElBQUlBLFFBQVFBLEdBQUdBLE1BQU1BLENBQUNBLFFBQVFBLENBQUNBO2dCQUMvQkEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsUUFBUUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7b0JBQ2JBLElBQUlBLFFBQVFBLEdBQUdBLFFBQVFBLENBQUNBLElBQUlBLENBQUNBLFVBQUNBLEtBQUtBO3dCQUNqQ0EsTUFBTUEsQ0FBQ0EsS0FBS0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsS0FBS0EsUUFBUUEsQ0FBQ0E7b0JBQ3BDQSxDQUFDQSxDQUFDQSxDQUFDQTtvQkFDSEEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsUUFBUUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7d0JBQ2JBLE1BQU1BLEdBQUdBLEtBQUtBLEdBQUdBLFlBQVlBLENBQUNBO3dCQUM5QkEsT0FBT0EsR0FBR0EsUUFBUUEsR0FBR0EsUUFBUUEsQ0FBQ0E7b0JBQ2hDQSxDQUFDQTtnQkFDSEEsQ0FBQ0E7WUFDSEEsQ0FBQ0E7WUFBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0E7Z0JBQ05BLElBQUlBLGFBQWFBLEdBQUdBLEtBQUtBLENBQUNBLGNBQWNBLElBQUlBLEtBQUtBLENBQUNBLGFBQWFBLENBQUNBO2dCQUNoRUEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsYUFBYUEsSUFBSUEsYUFBYUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7b0JBQzFDQSxFQUFFQSxDQUFDQSxDQUFDQSxhQUFhQSxDQUFDQSxHQUFHQSxDQUFDQSxVQUFDQSxFQUFFQSxJQUFLQSxPQUFBQSxJQUFJQSxDQUFDQSxlQUFlQSxDQUFDQSxHQUFHQSxDQUFDQSxFQUFFQSxDQUFDQSxFQUE1QkEsQ0FBNEJBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO3dCQUM1REEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsNEJBQXVCQSxDQUFDQSxDQUFDQSxDQUFDQTs0QkFDNUJBLE1BQU1BLEdBQUdBLEtBQUtBLEdBQUdBLGVBQWVBLENBQUNBO3dCQUNuQ0EsQ0FBQ0E7d0JBQUNBLElBQUlBLENBQUNBLENBQUNBOzRCQUNOQSxNQUFNQSxHQUFHQSxLQUFLQSxHQUFHQSxtQkFBbUJBLENBQUNBO3dCQUN2Q0EsQ0FBQ0E7b0JBQ0hBLENBQUNBO29CQUFDQSxJQUFJQSxDQUFDQSxFQUFFQSxDQUFDQSxDQUFDQSxhQUFhQSxDQUFDQSxHQUFHQSxDQUFDQSxVQUFDQSxFQUFFQSxJQUFLQSxPQUFBQSxJQUFJQSxDQUFDQSxlQUFlQSxDQUFDQSxHQUFHQSxDQUFDQSxFQUFFQSxDQUFDQSxFQUE1QkEsQ0FBNEJBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO3dCQUNuRUEsTUFBTUEsR0FBR0EsS0FBS0EsR0FBR0EsaUJBQWlCQSxDQUFDQTtvQkFDckNBLENBQUNBO29CQUFDQSxJQUFJQSxDQUFDQSxDQUFDQTt3QkFDTkEsUUFBR0EsQ0FBQ0EsS0FBS0EsQ0FBQ0EsUUFBUUEsR0FBR0EsSUFBSUEsR0FBR0Esa0JBQWtCQSxHQUFHQSxhQUFhQSxDQUFDQSxDQUFDQTtvQkFDbEVBLENBQUNBO2dCQUNIQSxDQUFDQTtnQkFDREEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsS0FBS0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsUUFBUUEsQ0FBQ0EsT0FBT0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7b0JBQ2pDQSxPQUFPQSxHQUFHQSxTQUFTQSxDQUFDQTtnQkFDdEJBLENBQUNBO2dCQUFDQSxJQUFJQSxDQUFDQSxFQUFFQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSxXQUFXQSxDQUFDQSxLQUFLQSxDQUFDQSxJQUFJQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtvQkFFeENBLE1BQU1BLEdBQUdBLEtBQUtBLEdBQUdBLE9BQU9BLENBQUNBO2dCQUMzQkEsQ0FBQ0E7WUFDSEEsQ0FBQ0E7WUFDREEsTUFBTUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsVUFBVUEsQ0FBQ0EsU0FBU0EsRUFBRUEsVUFBVUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsTUFBTUEsRUFBRUEsSUFBSUEsQ0FBQ0EsR0FBR0EsT0FBT0EsRUFBRUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7UUFDdkZBLENBQUNBLENBQUNBO1FBRUZBLE1BQU1BLENBQUNBLFFBQVFBLEdBQUdBLFVBQUNBLE1BQU1BO1lBQ3ZCQSxNQUFNQSxDQUFDQSxJQUFJQSxDQUFDQSxzQkFBc0JBLENBQUNBLE1BQU1BLENBQUNBLFdBQVdBLElBQUlBLE1BQU1BLENBQUNBLElBQUlBLENBQUNBLENBQUNBO1FBQ3hFQSxDQUFDQSxDQUFDQTtRQUVGQSxNQUFNQSxDQUFDQSxTQUFTQSxHQUFHQSxVQUFDQSxNQUFNQTtZQUN4QkEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsVUFBVUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0JBQ2hDQSxNQUFNQSxDQUFDQSxPQUFPQSxDQUFDQTtZQUNqQkEsQ0FBQ0E7WUFDREEsTUFBTUEsQ0FBQ0EsRUFBRUEsQ0FBQ0E7UUFDWkEsQ0FBQ0EsQ0FBQ0E7UUFFRkEsTUFBTUEsQ0FBQ0EsWUFBWUEsR0FBR0EsVUFBQ0EsTUFBTUE7WUFDM0JBLE1BQU1BLENBQUNBLElBQUlBLENBQUNBLFlBQVlBLENBQUNBLE1BQU1BLENBQUNBLENBQUNBO1FBQ25DQSxDQUFDQSxDQUFDQTtRQUdGQSxNQUFNQSxDQUFDQSxNQUFNQSxHQUFHQSxJQUFJQSxDQUFDQSxVQUFVQSxDQUFDQSxNQUFNQSxDQUFDQSxNQUFNQSxFQUFFQSx5QkFBeUJBLENBQUNBLENBQUNBO1FBQzFFQSxJQUFJQSxPQUFPQSxHQUFHQTtZQUNaQSxRQUFRQSxFQUFFQSxJQUFJQTtZQUNkQSxJQUFJQSxFQUFFQTtnQkFDSkEsSUFBSUEsRUFBRUEsTUFBTUEsQ0FBQ0EsTUFBTUE7YUFDcEJBO1NBQ0ZBLENBQUNBO1FBQ0ZBLE1BQU1BLENBQUNBLGlCQUFpQkEsR0FBR0EsVUFBVUEsQ0FBQ0Esb0JBQW9CQSxDQUFDQSxPQUFPQSxDQUFDQSxDQUFDQTtRQUVwRUEsTUFBTUEsQ0FBQ0EsUUFBUUEsR0FBR0E7WUFDaEJBLElBQUlBLFFBQVFBLEdBQUdBLENBQUNBLE1BQU1BLENBQUNBLFNBQVNBLENBQUNBLEdBQUdBLE1BQU1BLENBQUNBLFVBQVVBLEdBQUdBLE1BQU1BLENBQUNBLE1BQU1BLENBQUNBO1lBQ3RFQSxNQUFNQSxDQUFDQSxDQUFDQSxRQUFRQSxDQUFDQSxHQUFHQSxJQUFJQSxDQUFDQSxRQUFRQSxDQUFDQSxNQUFNQSxFQUFFQSxRQUFRQSxFQUFFQSxTQUFTQSxDQUFDQSxHQUFHQSxJQUFJQSxDQUFDQTtRQUN4RUEsQ0FBQ0EsQ0FBQ0E7UUFFRkEsTUFBTUEsQ0FBQ0EsVUFBVUEsR0FBR0EsVUFBQ0EsTUFBTUE7WUFDekJBLEVBQUVBLENBQUNBLENBQUNBLE1BQU1BLENBQUNBLENBQUNBLENBQUNBO2dCQUNYQSxNQUFNQSxDQUFDQSxJQUFJQSxDQUFDQSxVQUFVQSxDQUFDQSxNQUFNQSxFQUFFQSxNQUFNQSxDQUFDQSxNQUFNQSxFQUFFQSxTQUFTQSxDQUFDQSxDQUFDQTtZQUMzREEsQ0FBQ0E7WUFDREEsTUFBTUEsQ0FBQ0EsSUFBSUEsQ0FBQUE7UUFDYkEsQ0FBQ0EsQ0FBQ0E7UUFFRkEsTUFBTUEsQ0FBQ0EsV0FBV0EsR0FBR0EsUUFBUUEsR0FBR0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsTUFBTUEsR0FBR0EsVUFBVUEsR0FBR0EsTUFBTUEsQ0FBQ0EsTUFBTUEsR0FBR0EsRUFBRUEsQ0FBQ0EsR0FBR0EsV0FBV0EsR0FBR0EsTUFBTUEsQ0FBQ0EsTUFBTUEsQ0FBQ0E7UUFFaEhBLE1BQU1BLENBQUNBLE1BQU1BLENBQUNBLGdCQUFnQkEsRUFBRUE7WUFDOUIsRUFBRSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztnQkFHaEIsVUFBVSxDQUFDLGVBQWUsRUFBRSxFQUFFLENBQUMsQ0FBQztZQUNsQyxDQUFDO1FBQ0gsQ0FBQyxDQUFDQSxDQUFDQTtRQUVIQSxNQUFNQSxDQUFDQSxHQUFHQSxDQUFDQSxxQkFBcUJBLEVBQUVBLFVBQVVBLEtBQUtBLEVBQUVBLE9BQU9BLEVBQUVBLFFBQVFBO1lBR2xFLFVBQVUsQ0FBQyxlQUFlLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDbEMsQ0FBQyxDQUFDQSxDQUFDQTtRQUdIQSxNQUFNQSxDQUFDQSxnQkFBZ0JBLEdBQUdBO1lBQ3hCQSxFQUFFQSxDQUFDQSxDQUFDQSxNQUFNQSxDQUFDQSxXQUFXQSxDQUFDQSxhQUFhQSxDQUFDQSxNQUFNQSxDQUFDQSxDQUFDQSxDQUFDQTtnQkFDNUNBLE1BQU1BLENBQUNBLGdCQUFnQkEsR0FBR0EsTUFBTUEsR0FBR0EsTUFBTUEsQ0FBQ0EsV0FBV0EsQ0FBQ0EsYUFBYUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsVUFBQUEsSUFBSUEsSUFBSUEsT0FBQUEsTUFBTUEsR0FBR0EsSUFBSUEsQ0FBQ0EsSUFBSUEsR0FBR0EsT0FBT0EsRUFBNUJBLENBQTRCQSxDQUFDQSxDQUFDQSxJQUFJQSxFQUFFQSxDQUFDQSxJQUFJQSxDQUFDQSxFQUFFQSxDQUFDQSxHQUFHQSxPQUFPQSxDQUFDQTtnQkFFeElBLEVBQUVBLENBQUNBLENBQUNBLE1BQU1BLENBQUNBLFdBQVdBLENBQUNBLGFBQWFBLENBQUNBLElBQUlBLENBQUNBLFVBQUNBLElBQUlBO29CQUFPQSxNQUFNQSxDQUFDQSxJQUFJQSxDQUFDQSxJQUFJQSxDQUFDQSxRQUFRQSxDQUFDQSxVQUFVQSxDQUFDQSxDQUFBQTtnQkFBQUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7b0JBQzlGQSxNQUFNQSxDQUFDQSxhQUFhQSxHQUFHQSxvTEFBb0xBLENBQUNBO2dCQUM5TUEsQ0FBQ0E7Z0JBQUNBLElBQUlBLENBQUNBLENBQUNBO29CQUNOQSxNQUFNQSxDQUFDQSxhQUFhQSxHQUFHQSxJQUFJQSxDQUFDQTtnQkFDOUJBLENBQUNBO2dCQUVEQSxNQUFNQSxDQUFDQSxZQUFZQSxHQUFHQSxJQUFJQSxDQUFDQSxlQUFlQSxDQUFDQSxPQUFPQSxFQUE0QkE7b0JBQzVFQSxTQUFTQSxFQUFFQTt3QkFBUUEsTUFBTUEsQ0FBQ0EsTUFBTUEsQ0FBQ0Esb0JBQW9CQSxDQUFDQTtvQkFBQ0EsQ0FBQ0E7b0JBQ3hEQSxnQkFBZ0JBLEVBQUVBO3dCQUFTQSxNQUFNQSxDQUFDQSxNQUFNQSxDQUFDQSxnQkFBZ0JBLENBQUNBO29CQUFDQSxDQUFDQTtvQkFDNURBLE9BQU9BLEVBQUVBO3dCQUFRQSxNQUFNQSxDQUFDQSxNQUFNQSxDQUFDQSxhQUFhQSxDQUFDQTtvQkFBQ0EsQ0FBQ0E7aUJBQ2hEQSxDQUFDQSxDQUFDQTtnQkFFSEEsTUFBTUEsQ0FBQ0EsWUFBWUEsQ0FBQ0EsSUFBSUEsRUFBRUEsQ0FBQ0E7WUFFN0JBLENBQUNBO1lBQUNBLElBQUlBLENBQUNBLENBQUNBO2dCQUNOQSxRQUFHQSxDQUFDQSxLQUFLQSxDQUFDQSwrQkFBK0JBLEdBQUdBLE1BQU1BLENBQUNBLFdBQVdBLENBQUNBLGFBQWFBLENBQUNBLENBQUNBO1lBQ2hGQSxDQUFDQTtRQUNIQSxDQUFDQSxDQUFDQTtRQUVGQSxNQUFNQSxDQUFDQSxvQkFBb0JBLEdBQUdBO1lBQzVCQSxJQUFJQSxLQUFLQSxHQUFHQSxNQUFNQSxDQUFDQSxXQUFXQSxDQUFDQSxhQUFhQSxDQUFDQTtZQUM3Q0EsSUFBSUEsU0FBU0EsR0FBR0EsS0FBS0EsQ0FBQ0EsTUFBTUEsQ0FBQ0E7WUFDN0JBLFFBQUdBLENBQUNBLEtBQUtBLENBQUNBLHNCQUFzQkEsR0FBR0EsS0FBS0EsQ0FBQ0EsQ0FBQ0E7WUFFMUNBLElBQUlBLGFBQWFBLEdBQUdBLEVBQUVBLENBQUNBO1lBQ3ZCQSxPQUFPQSxDQUFDQSxPQUFPQSxDQUFDQSxLQUFLQSxFQUFFQSxVQUFDQSxJQUFJQSxFQUFFQSxHQUFHQTtnQkFDL0JBLElBQUlBLElBQUlBLEdBQUdBLFVBQVVBLENBQUNBLElBQUlBLENBQUNBLE1BQU1BLENBQUNBLE1BQU1BLEVBQUVBLElBQUlBLENBQUNBLElBQUlBLENBQUNBLENBQUNBO2dCQUNyREEsYUFBYUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0E7WUFDM0JBLENBQUNBLENBQUNBLENBQUNBO1lBRUhBLFFBQUdBLENBQUNBLEtBQUtBLENBQUNBLGtCQUFrQkEsR0FBR0EsYUFBYUEsQ0FBQ0EsQ0FBQ0E7WUFDOUNBLE1BQU1BLENBQUNBLEdBQUdBLEdBQUdBLGNBQWNBLENBQUNBLFdBQVdBLENBQUNBLE1BQU1BLENBQUNBLE1BQU1BLEVBQUVBLGFBQWFBLEVBQUVBLElBQUlBLEVBQUVBLFVBQUNBLE1BQU1BO2dCQUNqRkEsTUFBTUEsQ0FBQ0EsV0FBV0EsQ0FBQ0EsYUFBYUEsR0FBR0EsRUFBRUEsQ0FBQ0E7Z0JBQ3RDQSxJQUFJQSxPQUFPQSxHQUFHQSxJQUFJQSxDQUFDQSxXQUFXQSxDQUFDQSxTQUFTQSxFQUFFQSxVQUFVQSxDQUFDQSxDQUFDQTtnQkFDdERBLElBQUlBLENBQUNBLFlBQVlBLENBQUNBLFNBQVNBLEVBQUVBLFVBQVVBLEdBQUdBLE9BQU9BLENBQUNBLENBQUNBO2dCQUNuREEsSUFBSUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0E7Z0JBQ3BCQSxVQUFVQSxFQUFFQSxDQUFDQTtZQUNmQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUNIQSxNQUFNQSxDQUFDQSxZQUFZQSxDQUFDQSxLQUFLQSxFQUFFQSxDQUFDQTtRQUM5QkEsQ0FBQ0EsQ0FBQ0E7UUFFRkEsTUFBTUEsQ0FBQ0EsTUFBTUEsQ0FBQ0Esb0JBQW9CQSxFQUFFQTtZQUVsQ0EsSUFBSUEsSUFBSUEsR0FBR0EsaUJBQWlCQSxFQUFFQSxDQUFDQTtZQUMvQkEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsTUFBTUEsQ0FBQ0Esc0JBQXNCQSxLQUFLQSxJQUFJQSxDQUFDQSxDQUFDQSxDQUFDQTtnQkFDM0NBLE1BQU1BLENBQUNBLFVBQVVBLEdBQUdBLEVBQUVBLE1BQU1BLEVBQUVBLEtBQUtBLEVBQUVBLElBQUlBLEVBQUVBLElBQUlBLEVBQUVBLENBQUNBO1lBQ3BEQSxDQUFDQTtZQUFDQSxJQUFJQSxDQUFDQSxDQUFDQTtnQkFDTkEsZUFBZUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0E7WUFDeEJBLENBQUNBO1FBQ0hBLENBQUNBLENBQUNBLENBQUNBO1FBRUhBLE1BQU1BLENBQUNBLG9CQUFvQkEsR0FBR0E7WUFDNUJBLEVBQUVBLENBQUNBLENBQUNBLE1BQU1BLENBQUNBLFdBQVdBLENBQUNBLGFBQWFBLENBQUNBLE1BQU1BLENBQUNBLENBQUNBLENBQUNBO2dCQUM1Q0EsSUFBSUEsUUFBUUEsR0FBR0EsTUFBTUEsQ0FBQ0EsV0FBV0EsQ0FBQ0EsYUFBYUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0JBQ25EQSxJQUFJQSxPQUFPQSxHQUFHQSxpQkFBaUJBLEVBQUVBLENBQUNBO2dCQUNsQ0EsRUFBRUEsQ0FBQ0EsQ0FBQ0EsUUFBUUEsSUFBSUEsT0FBT0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7b0JBQ3hCQSxJQUFJQSxPQUFPQSxHQUFHQSxRQUFRQSxDQUFDQSxJQUFJQSxDQUFDQTtvQkFDNUJBLElBQUlBLE9BQU9BLEdBQUdBLElBQUlBLENBQUNBLFFBQVFBLENBQUNBLE9BQU9BLENBQUNBLENBQUNBO29CQUNyQ0EsSUFBSUEsT0FBT0EsR0FBR0EsVUFBVUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsTUFBTUEsRUFBRUEsT0FBT0EsQ0FBQ0EsQ0FBQ0E7b0JBQ3REQSxRQUFHQSxDQUFDQSxLQUFLQSxDQUFDQSx1QkFBdUJBLEdBQUdBLE9BQU9BLEdBQUdBLE1BQU1BLEdBQUdBLE9BQU9BLENBQUNBLENBQUNBO29CQUNoRUEsTUFBTUEsQ0FBQ0EsR0FBR0EsR0FBR0EsY0FBY0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsTUFBTUEsRUFBRUEsT0FBT0EsRUFBRUEsT0FBT0EsRUFBRUEsSUFBSUEsRUFBRUEsVUFBQ0EsTUFBTUE7d0JBQy9FQSxJQUFJQSxDQUFDQSxZQUFZQSxDQUFDQSxTQUFTQSxFQUFFQSxtQkFBbUJBLEdBQUdBLE9BQU9BLENBQUNBLENBQUNBO3dCQUM1REEsTUFBTUEsQ0FBQ0EsV0FBV0EsQ0FBQ0EsYUFBYUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0EsRUFBRUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7d0JBQzlDQSxNQUFNQSxDQUFDQSxZQUFZQSxDQUFDQSxLQUFLQSxFQUFFQSxDQUFDQTt3QkFDNUJBLElBQUlBLENBQUNBLE1BQU1BLENBQUNBLE1BQU1BLENBQUNBLENBQUNBO3dCQUNwQkEsVUFBVUEsRUFBRUEsQ0FBQ0E7b0JBQ2ZBLENBQUNBLENBQUNBLENBQUNBO2dCQUNMQSxDQUFDQTtZQUNIQSxDQUFDQTtZQUNEQSxNQUFNQSxDQUFDQSxZQUFZQSxDQUFDQSxLQUFLQSxFQUFFQSxDQUFDQTtRQUM5QkEsQ0FBQ0EsQ0FBQ0E7UUFFRkEsTUFBTUEsQ0FBQ0EsZ0JBQWdCQSxHQUFHQTtZQUN4QkEsSUFBSUEsSUFBSUEsR0FBR0EsSUFBSUEsQ0FBQ0E7WUFDaEJBLEVBQUVBLENBQUNBLENBQUNBLE1BQU1BLENBQUNBLFdBQVdBLENBQUNBLGFBQWFBLENBQUNBLE1BQU1BLENBQUNBLENBQUNBLENBQUNBO2dCQUM1Q0EsSUFBSUEsUUFBUUEsR0FBR0EsTUFBTUEsQ0FBQ0EsV0FBV0EsQ0FBQ0EsYUFBYUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0JBQ25EQSxJQUFJQSxHQUFHQSxRQUFRQSxDQUFDQSxJQUFJQSxDQUFDQTtZQUN2QkEsQ0FBQ0E7WUFDREEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0JBQ1RBLE1BQU1BLENBQUNBLE1BQU1BLENBQUNBLFdBQVdBLEdBQUdBLElBQUlBLENBQUNBO2dCQUNqQ0EsTUFBTUEsQ0FBQ0Esc0JBQXNCQSxHQUFHQSxpQkFBaUJBLEVBQUVBLENBQUNBO2dCQUVwREEsTUFBTUEsQ0FBQ0EsWUFBWUEsR0FBR0EsSUFBSUEsQ0FBQ0EsZUFBZUEsQ0FBQ0EsT0FBT0EsRUFBNEJBO29CQUM1RUEsTUFBTUEsRUFBRUE7d0JBQVNBLE1BQU1BLENBQUNBLE1BQU1BLENBQUNBLE1BQU1BLENBQUNBO29CQUFDQSxDQUFDQTtvQkFDeENBLFVBQVVBLEVBQUVBO3dCQUFRQSxNQUFNQSxDQUFDQSxNQUFNQSxDQUFDQSxVQUFVQSxDQUFDQTtvQkFBQ0EsQ0FBQ0E7b0JBQy9DQSxRQUFRQSxFQUFFQTt3QkFBUUEsTUFBTUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsUUFBUUEsQ0FBQ0E7b0JBQUNBLENBQUNBO29CQUMzQ0EsU0FBU0EsRUFBRUE7d0JBQVFBLE1BQU1BLENBQUNBLE1BQU1BLENBQUNBLG9CQUFvQkEsQ0FBQ0E7b0JBQUNBLENBQUNBO2lCQUN6REEsQ0FBQ0EsQ0FBQ0E7Z0JBRUhBLE1BQU1BLENBQUNBLFlBQVlBLENBQUNBLElBQUlBLEVBQUVBLENBQUNBO2dCQUUzQkEsUUFBUUEsQ0FBQ0E7b0JBQ1BBLENBQUNBLENBQUNBLGlCQUFpQkEsQ0FBQ0EsQ0FBQ0EsS0FBS0EsRUFBRUEsQ0FBQ0E7Z0JBQy9CQSxDQUFDQSxFQUFFQSxFQUFFQSxDQUFDQSxDQUFDQTtZQUNUQSxDQUFDQTtZQUFDQSxJQUFJQSxDQUFDQSxDQUFDQTtnQkFDTkEsUUFBR0EsQ0FBQ0EsS0FBS0EsQ0FBQ0EsK0JBQStCQSxHQUFHQSxNQUFNQSxDQUFDQSxXQUFXQSxDQUFDQSxhQUFhQSxDQUFDQSxDQUFDQTtZQUNoRkEsQ0FBQ0E7UUFDSEEsQ0FBQ0EsQ0FBQ0E7UUFFRkEsTUFBTUEsQ0FBQ0Esa0JBQWtCQSxHQUFHQTtZQUMxQkEsSUFBSUEsS0FBS0EsR0FBR0EsTUFBTUEsQ0FBQ0EsV0FBV0EsQ0FBQ0EsYUFBYUEsQ0FBQ0E7WUFDN0NBLElBQUlBLFNBQVNBLEdBQUdBLEtBQUtBLENBQUNBLE1BQU1BLENBQUNBO1lBQzdCQSxJQUFJQSxVQUFVQSxHQUFHQSxNQUFNQSxDQUFDQSxJQUFJQSxDQUFDQSxVQUFVQSxDQUFDQTtZQUN4Q0EsSUFBSUEsU0FBU0EsR0FBVUEsTUFBTUEsQ0FBQ0EsTUFBTUEsQ0FBQ0E7WUFDckNBLEVBQUVBLENBQUNBLENBQUNBLFVBQVVBLElBQUlBLFNBQVNBLElBQUlBLFVBQVVBLEtBQUtBLFNBQVNBLENBQUNBLENBQUNBLENBQUNBO2dCQUN4REEsUUFBR0EsQ0FBQ0EsS0FBS0EsQ0FBQ0EsU0FBU0EsR0FBR0EsU0FBU0EsR0FBR0EsY0FBY0EsR0FBR0EsVUFBVUEsQ0FBQ0EsQ0FBQ0E7Z0JBQy9EQSxPQUFPQSxDQUFDQSxPQUFPQSxDQUFDQSxLQUFLQSxFQUFFQSxVQUFDQSxJQUFJQSxFQUFFQSxHQUFHQTtvQkFDL0JBLElBQUlBLE9BQU9BLEdBQUdBLFNBQVNBLEdBQUdBLEdBQUdBLEdBQUdBLElBQUlBLENBQUNBLElBQUlBLENBQUNBO29CQUMxQ0EsSUFBSUEsT0FBT0EsR0FBR0EsVUFBVUEsR0FBR0EsR0FBR0EsR0FBR0EsSUFBSUEsQ0FBQ0EsSUFBSUEsQ0FBQ0E7b0JBQzNDQSxRQUFHQSxDQUFDQSxLQUFLQSxDQUFDQSxnQkFBZ0JBLEdBQUdBLE9BQU9BLEdBQUdBLE1BQU1BLEdBQUdBLE9BQU9BLENBQUNBLENBQUNBO29CQUN6REEsTUFBTUEsQ0FBQ0EsR0FBR0EsR0FBR0EsY0FBY0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsTUFBTUEsRUFBRUEsT0FBT0EsRUFBRUEsT0FBT0EsRUFBRUEsSUFBSUEsRUFBRUEsVUFBQ0EsTUFBTUE7d0JBQy9FQSxFQUFFQSxDQUFDQSxDQUFDQSxHQUFHQSxHQUFHQSxDQUFDQSxLQUFLQSxTQUFTQSxDQUFDQSxDQUFDQSxDQUFDQTs0QkFDMUJBLE1BQU1BLENBQUNBLFdBQVdBLENBQUNBLGFBQWFBLENBQUNBLE1BQU1BLENBQUNBLENBQUNBLEVBQUVBLFNBQVNBLENBQUNBLENBQUNBOzRCQUN0REEsSUFBSUEsT0FBT0EsR0FBR0EsSUFBSUEsQ0FBQ0EsV0FBV0EsQ0FBQ0EsU0FBU0EsRUFBRUEsVUFBVUEsQ0FBQ0EsQ0FBQ0E7NEJBQ3REQSxJQUFJQSxDQUFDQSxZQUFZQSxDQUFDQSxTQUFTQSxFQUFFQSxRQUFRQSxHQUFHQSxPQUFPQSxHQUFHQSxNQUFNQSxHQUFHQSxPQUFPQSxDQUFDQSxDQUFDQTs0QkFDcEVBLE1BQU1BLENBQUNBLFVBQVVBLENBQUNBLEtBQUtBLEVBQUVBLENBQUNBOzRCQUMxQkEsSUFBSUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0E7NEJBQ3BCQSxVQUFVQSxFQUFFQSxDQUFDQTt3QkFDZkEsQ0FBQ0E7b0JBQ0hBLENBQUNBLENBQUNBLENBQUNBO2dCQUNMQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUNMQSxDQUFDQTtZQUNEQSxNQUFNQSxDQUFDQSxVQUFVQSxDQUFDQSxLQUFLQSxFQUFFQSxDQUFDQTtRQUM1QkEsQ0FBQ0EsQ0FBQ0E7UUFFRkEsTUFBTUEsQ0FBQ0EsV0FBV0EsR0FBR0EsVUFBQ0EsSUFBSUE7WUFDeEJBLE1BQU1BLENBQUNBLGNBQWNBLENBQUNBLFlBQVlBLENBQUNBLE1BQU1BLENBQUNBLE1BQU1BLEVBQUVBLElBQUlBLEVBQUVBLElBQUlBLEVBQUVBLElBQUlBLENBQUNBLENBQUNBO1FBQ3RFQSxDQUFDQSxDQUFDQTtRQUVGQSxNQUFNQSxDQUFDQSxjQUFjQSxHQUFHQTtZQUN0QkEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsV0FBV0EsQ0FBQ0EsYUFBYUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0JBQzVDQSxNQUFNQSxDQUFDQSxJQUFJQSxDQUFDQSxVQUFVQSxHQUFHQSxNQUFNQSxDQUFDQSxNQUFNQSxDQUFDQTtnQkFFdkNBLE1BQU1BLENBQUNBLFVBQVVBLEdBQUdBLElBQUlBLENBQUNBLGFBQWFBLENBQUNBLE9BQU9BLEVBQTBCQTtvQkFDdEVBLElBQUlBLEVBQUVBO3dCQUFTQSxNQUFNQSxDQUFDQSxNQUFNQSxDQUFDQSxJQUFJQSxDQUFDQTtvQkFBQ0EsQ0FBQ0E7b0JBQ3BDQSxXQUFXQSxFQUFFQTt3QkFBUUEsTUFBTUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsV0FBV0EsQ0FBQ0E7b0JBQUNBLENBQUNBO29CQUNqREEsU0FBU0EsRUFBRUE7d0JBQVFBLE1BQU1BLENBQUNBLE1BQU1BLENBQUNBLGtCQUFrQkEsQ0FBQ0E7b0JBQUNBLENBQUNBO2lCQUN2REEsQ0FBQ0EsQ0FBQ0E7Z0JBRUhBLE1BQU1BLENBQUNBLFVBQVVBLENBQUNBLElBQUlBLEVBQUVBLENBQUNBO2dCQUV6QkEsUUFBUUEsQ0FBQ0E7b0JBQ1BBLENBQUNBLENBQUNBLGFBQWFBLENBQUNBLENBQUNBLEtBQUtBLEVBQUVBLENBQUNBO2dCQUMzQkEsQ0FBQ0EsRUFBRUEsRUFBRUEsQ0FBQ0EsQ0FBQ0E7WUFDVEEsQ0FBQ0E7WUFBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0E7Z0JBQ05BLFFBQUdBLENBQUNBLEtBQUtBLENBQUNBLCtCQUErQkEsR0FBR0EsTUFBTUEsQ0FBQ0EsV0FBV0EsQ0FBQ0EsYUFBYUEsQ0FBQ0EsQ0FBQ0E7WUFDaEZBLENBQUNBO1FBQ0hBLENBQUNBLENBQUNBO1FBR0ZBLFVBQVVBLENBQUNBLGVBQWVBLEVBQUVBLEVBQUVBLENBQUNBLENBQUNBO1FBRWhDQSxTQUFTQSxVQUFVQTtZQUNqQnlFLE1BQU1BLENBQUNBLFlBQVlBLENBQUNBLGVBQWVBLENBQUNBLElBQUlBLFlBQVlBLENBQUNBLGVBQWVBLENBQUNBLEdBQUdBLElBQUlBLEdBQUdBLEtBQUtBLENBQUFBO1FBQ3RGQSxDQUFDQTtRQUVEekUsU0FBU0EsVUFBVUE7WUFFZnVDLElBQUlBLE9BQU9BLEdBQUdBLElBQUlBLENBQUNBO1lBR3JCQSxFQUFFQSxDQUFDQSxDQUFDQSxVQUFVQSxFQUFFQSxDQUFDQSxDQUFDQSxDQUFDQTtnQkFDakJBLElBQUlBLFlBQVlBLEdBQUdBLFlBQVlBLENBQUNBLGVBQWVBLENBQUNBLENBQUNBO2dCQUNqREEsTUFBTUEsQ0FBQ0EsR0FBR0EsR0FBR0EsY0FBY0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsUUFBUUEsRUFBRUEsWUFBWUEsRUFBRUEsTUFBTUEsQ0FBQ0EsTUFBTUEsRUFBRUEsYUFBYUEsQ0FBQ0EsQ0FBQ0E7WUFDaEdBLENBQUNBO1lBQUNBLElBQUlBLENBQUNBLENBQUNBO2dCQUNOQSxNQUFNQSxDQUFDQSxHQUFHQSxHQUFHQSxjQUFjQSxDQUFDQSxPQUFPQSxDQUFDQSxNQUFNQSxDQUFDQSxNQUFNQSxFQUFFQSxNQUFNQSxDQUFDQSxNQUFNQSxFQUFFQSxNQUFNQSxDQUFDQSxRQUFRQSxFQUFFQSxhQUFhQSxDQUFDQSxDQUFDQTtZQUNwR0EsQ0FBQ0E7WUFDREEsSUFBSUEsQ0FBQ0EsWUFBWUEsQ0FBQ0EsT0FBT0EsRUFBRUEsY0FBY0EsRUFBRUEsTUFBTUEsRUFBRUEsS0FBS0EsQ0FBQ0EsQ0FBQ0E7UUFDNURBLENBQUNBO1FBRUR2QyxNQUFNQSxDQUFDQSxVQUFVQSxHQUFHQSxVQUFVQSxDQUFDQTtRQUUvQkEsU0FBU0EsWUFBWUEsQ0FBQ0EsUUFBUUEsRUFBRUEsUUFBUUE7WUFDdEMwRSxNQUFNQSxDQUFDQSxVQUFVQSxHQUFHQSxJQUFJQSxDQUFDQTtZQUV6QkEsSUFBSUEsTUFBTUEsR0FBVUEsSUFBSUEsQ0FBQ0E7WUFDekJBLEVBQUVBLENBQUNBLENBQUNBLFVBQVVBLEVBQUVBLENBQUNBLENBQUNBLENBQUNBO2dCQUNqQkEsTUFBTUEsR0FBR0EsTUFBTUEsQ0FBQ0E7WUFDbEJBLENBQUNBO1lBQUNBLElBQUlBLENBQUNBLENBQUNBO2dCQUNOQSxNQUFNQSxHQUFHQSxJQUFJQSxDQUFDQSxVQUFVQSxDQUFDQSxRQUFRQSxFQUFFQSx5QkFBeUJBLENBQUNBLElBQUlBLE1BQU1BLENBQUNBLE1BQU1BLENBQUNBO1lBQ2pGQSxDQUFDQTtZQUNEQSxRQUFHQSxDQUFDQSxLQUFLQSxDQUFDQSxlQUFlQSxFQUFFQSxNQUFNQSxDQUFDQSxDQUFDQTtZQUNuQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0JBQ2ZBLEtBQUtBLE9BQU9BO29CQUNWQSxJQUFJQSxRQUFRQSxHQUFHQSxNQUFNQSxHQUFHQSxNQUFNQSxDQUFDQSxNQUFNQSxDQUFDQTtvQkFDdENBLFFBQUdBLENBQUNBLEtBQUtBLENBQUNBLFVBQVVBLEVBQUVBLE1BQU1BLENBQUNBLENBQUNBO29CQUM5QkEsUUFBUUEsR0FBR0EsVUFBVUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsUUFBUUEsRUFBRUEsTUFBTUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0E7b0JBQ3BEQSxJQUFJQSxlQUFlQSxHQUFHQSxZQUFZQSxDQUFDQSxjQUFjQSxDQUFDQSxHQUFHQSxDQUFDQSxvQkFBb0JBLENBQUNBLENBQUNBLENBQUNBO29CQUM3RUEsTUFBTUEsQ0FBQ0EsSUFBSUEsR0FBR0EsZUFBZUEsQ0FBQ0E7d0JBQzVCQSxRQUFRQSxFQUFFQSxRQUFRQTtxQkFDbkJBLENBQUNBLENBQUNBO29CQUNIQSxLQUFLQSxDQUFDQTtnQkFDUkEsS0FBS0EsVUFBVUE7b0JBQ2JBLE1BQU1BLENBQUNBLElBQUlBLEdBQUdBLFFBQVFBLEdBQUdBLE1BQU1BLENBQUNBLFFBQVFBLENBQUNBLEdBQUdBLEVBQUVBLENBQUNBO29CQUMvQ0EsS0FBS0EsQ0FBQ0E7Z0JBQ1JBLEtBQUtBLFlBQVlBO29CQUNmQSxJQUFJQSxJQUFJQSxHQUFHQSxJQUFJQSxDQUFDQTtvQkFDaEJBLElBQUlBLEdBQUdBLFNBQVNBLENBQUNBLE1BQU1BLEVBQUVBLENBQUNBLE1BQU1BLENBQUNBLENBQUNBO29CQUNsQ0EsTUFBTUEsQ0FBQ0EsTUFBTUEsR0FBR0EsUUFBUUEsQ0FBQ0E7b0JBQ3pCQSxNQUFNQSxDQUFDQSxJQUFJQSxHQUFHQSxJQUFJQSxDQUFDQTtvQkFDbkJBLEVBQUVBLENBQUNBLENBQUNBLElBQUlBLENBQUNBLENBQUNBLENBQUNBO3dCQUVUQSxNQUFNQSxDQUFDQSxVQUFVQSxHQUFHQSxJQUFJQSxDQUFDQTt3QkFDekJBLE1BQU1BLENBQUNBLEdBQUdBLEdBQUdBLGNBQWNBLENBQUNBLE9BQU9BLENBQUNBLE1BQU1BLENBQUNBLE1BQU1BLEVBQUVBLElBQUlBLEVBQUVBLE1BQU1BLENBQUNBLFFBQVFBLEVBQUVBLFVBQUNBLE9BQU9BOzRCQUNoRkEsWUFBWUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsU0FBU0EsQ0FBQ0EsT0FBT0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7d0JBQzdDQSxDQUFDQSxDQUFDQSxDQUFDQTtvQkFDTEEsQ0FBQ0E7b0JBQUNBLElBQUlBLENBQUNBLENBQUNBO3dCQUNOQSxNQUFNQSxDQUFDQSxVQUFVQSxHQUFHQSxtQ0FBbUNBLENBQUNBO29CQUMxREEsQ0FBQ0E7b0JBQ0RBLEtBQUtBLENBQUNBO2dCQUNSQTtvQkFDRUEsTUFBTUEsQ0FBQ0EsSUFBSUEsR0FBR0EsSUFBSUEsQ0FBQ0E7b0JBQ25CQSxNQUFNQSxDQUFDQSxNQUFNQSxHQUFHQSxRQUFRQSxDQUFDQTtvQkFDekJBLE1BQU1BLENBQUNBLFVBQVVBLEdBQUdBLG1DQUFtQ0EsQ0FBQ0E7WUFDNURBLENBQUNBO1lBQ0RBLElBQUlBLENBQUNBLE1BQU1BLENBQUNBLE1BQU1BLENBQUNBLENBQUNBO1FBQ3RCQSxDQUFDQTtRQUVEMUUsU0FBU0EsWUFBWUEsQ0FBQ0EsSUFBSUE7WUFDeEJtRSxNQUFNQSxDQUFDQSxjQUFjQSxHQUFHQSxJQUFJQSxDQUFDQTtZQUM3QkEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0JBQ2xCQSxNQUFNQSxDQUFDQSxVQUFVQSxHQUFHQSxJQUFJQSxDQUFDQSxTQUFTQSxDQUFDQSxNQUFNQSxDQUFDQSxNQUFNQSxDQUFDQSxDQUFDQTtZQUNwREEsQ0FBQ0E7WUFDREEsTUFBTUEsQ0FBQ0EsVUFBVUEsR0FBR0EsaUNBQWlDQSxDQUFDQTtZQUN0REEsSUFBSUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0E7UUFDdEJBLENBQUNBO1FBRURuRSxTQUFTQSxhQUFhQSxDQUFDQSxPQUFPQTtZQUM1QjJFLElBQUlBLFFBQVFBLEdBQUdBLE9BQU9BLENBQUNBLElBQUlBLENBQUNBO1lBQzVCQSxNQUFNQSxDQUFDQSxTQUFTQSxHQUFHQSxPQUFPQSxDQUFDQSxTQUFTQSxDQUFDQTtZQUNyQ0EsTUFBTUEsQ0FBQ0EsV0FBV0EsR0FBR0EsT0FBT0EsQ0FBQ0E7WUFFN0JBLEVBQUVBLENBQUNBLENBQUNBLE9BQU9BLElBQUlBLE9BQU9BLENBQUNBLE1BQU1BLENBQUNBLENBQUNBLENBQUNBO2dCQUM5QkEsTUFBTUEsQ0FBQ0EsTUFBTUEsR0FBR0EsT0FBT0EsQ0FBQ0EsTUFBTUEsQ0FBQ0E7WUFDakNBLENBQUNBO1lBQUNBLElBQUlBLENBQUNBLENBQUNBO2dCQUNOQSxNQUFNQSxDQUFDQSxNQUFNQSxHQUFHQSxJQUFJQSxDQUFDQSxVQUFVQSxDQUFDQSxNQUFNQSxDQUFDQSxNQUFNQSxFQUFFQSx5QkFBeUJBLENBQUNBLENBQUNBO1lBQzVFQSxDQUFDQTtZQUNEQSxNQUFNQSxDQUFDQSxpQkFBaUJBLENBQUNBLElBQUlBLENBQUNBLElBQUlBLEdBQUdBLE1BQU1BLENBQUNBLE1BQU1BLENBQUNBO1lBQ25EQSxNQUFNQSxDQUFDQSxRQUFRQSxHQUFHQSxJQUFJQSxDQUFDQTtZQUV2QkEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsT0FBT0EsQ0FBQ0EsU0FBU0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0JBQ3RCQSxJQUFJQSxXQUFXQSxHQUFHQSxPQUFPQSxDQUFDQSxRQUFRQSxDQUFDQSxNQUFNQSxDQUFDQSxVQUFDQSxHQUFHQTtvQkFDNUNBLE1BQU1BLENBQUNBLEdBQUdBLENBQUNBLFNBQVNBLENBQUNBO2dCQUN2QkEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0JBQ0hBLElBQUlBLFFBQVFBLEdBQUdBLE9BQU9BLENBQUNBLFFBQVFBLENBQUNBLE1BQU1BLENBQUNBLFVBQUNBLEdBQUdBO29CQUN6Q0EsTUFBTUEsQ0FBQ0EsS0FBS0EsQ0FBQ0E7Z0JBQ2ZBLENBQUNBLENBQUNBLENBQUNBO2dCQUNIQSxJQUFJQSxLQUFLQSxHQUFHQSxPQUFPQSxDQUFDQSxRQUFRQSxDQUFDQSxNQUFNQSxDQUFDQSxVQUFDQSxJQUFJQTtvQkFDdkNBLE1BQU1BLENBQUNBLENBQUNBLElBQUlBLENBQUNBLFNBQVNBLENBQUNBO2dCQUN6QkEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0JBQ0hBLFdBQVdBLEdBQUdBLFdBQVdBLENBQUNBLE1BQU1BLENBQUNBLFVBQUNBLEdBQUdBO29CQUNuQ0EsTUFBTUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsSUFBSUEsQ0FBQ0E7Z0JBQ2xCQSxDQUFDQSxDQUFDQSxDQUFDQTtnQkFDSEEsUUFBUUEsR0FBR0EsUUFBUUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsVUFBQ0EsR0FBR0E7b0JBQzdCQSxNQUFNQSxDQUFDQSxHQUFHQSxDQUFDQSxJQUFJQSxDQUFDQTtnQkFDbEJBLENBQUNBLENBQUNBLENBQUNBO2dCQUNIQSxLQUFLQSxHQUFHQSxLQUFLQSxDQUFDQSxNQUFNQSxDQUFDQSxVQUFDQSxJQUFJQTtvQkFDeEJBLE1BQU1BLENBQUNBLElBQUlBLENBQUNBLElBQUlBLENBQUNBO2dCQUNuQkEsQ0FBQ0EsQ0FBQ0EsQ0FDQ0EsTUFBTUEsQ0FBQ0EsVUFBQ0EsSUFBSUE7b0JBQ1hBLE1BQU1BLENBQUNBLElBQUlBLENBQUNBLElBQUlBLENBQUNBLEtBQUtBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLElBQUlBLEVBQUVBLENBQUNBO2dCQUNyQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0JBRUxBLE1BQU1BLENBQUNBLFFBQVFBLEdBQVNBLEtBQU1BLENBQUNBLE1BQU1BLENBQUNBLFdBQVdBLEVBQUVBLFFBQVFBLEVBQUVBLEtBQUtBLENBQUNBLENBQUNBLEdBQUdBLENBQUNBLFVBQUNBLElBQUlBO29CQUMzRUEsSUFBSUEsQ0FBQ0EsTUFBTUEsR0FBR0EsTUFBTUEsQ0FBQ0EsTUFBTUEsQ0FBQ0E7b0JBQzVCQSxJQUFJQSxDQUFDQSxRQUFRQSxHQUFHQSxJQUFJQSxDQUFDQSxJQUFJQSxDQUFDQTtvQkFDMUJBLEVBQUVBLENBQUNBLENBQUNBLElBQUlBLENBQUNBLFNBQVNBLENBQUNBLENBQUNBLENBQUNBO3dCQUNuQkEsSUFBSUEsQ0FBQ0EsUUFBUUEsSUFBSUEsTUFBTUEsQ0FBQ0E7b0JBQzFCQSxDQUFDQTtvQkFDREEsSUFBSUEsQ0FBQ0EsV0FBV0EsR0FBR0EsSUFBSUEsQ0FBQ0EsVUFBVUEsQ0FBQ0EsTUFBTUEsRUFBRUEsSUFBSUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0E7b0JBQ3REQSxNQUFNQSxDQUFDQSxJQUFJQSxDQUFDQTtnQkFDZEEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7WUFDTEEsQ0FBQ0E7WUFHREEsTUFBTUEsQ0FBQ0EsSUFBSUEsR0FBR0EsSUFBSUEsQ0FBQ0E7WUFDbkJBLE1BQU1BLENBQUNBLE1BQU1BLEdBQUdBLElBQUlBLENBQUNBO1lBQ3JCQSxNQUFNQSxDQUFDQSxVQUFVQSxHQUFHQSxJQUFJQSxDQUFDQTtZQUV6QkEsTUFBTUEsQ0FBQ0EsTUFBTUEsR0FBR0EsS0FBS0EsQ0FBQ0E7WUFDdEJBLEVBQUVBLENBQUNBLENBQUNBLE1BQU1BLENBQUNBLFFBQVFBLENBQUNBLENBQUNBLENBQUNBO2dCQUNwQkEsTUFBTUEsQ0FBQ0EsVUFBVUEsQ0FBQ0EsV0FBV0EsQ0FBQ0EsQ0FBQ0E7Z0JBRS9CQSxJQUFJQSxJQUFJQSxHQUFHQSxNQUFNQSxDQUFDQSxRQUFRQSxDQUFDQSxJQUFJQSxDQUFDQSxVQUFDQSxJQUFJQTtvQkFDbkNBLElBQUlBLElBQUlBLEdBQUdBLENBQUNBLElBQUlBLENBQUNBLElBQUlBLElBQUlBLEVBQUVBLENBQUNBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBO29CQUMzQ0EsSUFBSUEsR0FBR0EsR0FBR0Esa0JBQWFBLENBQUNBLElBQUlBLENBQUNBLENBQUNBO29CQUM5QkEsTUFBTUEsQ0FBQ0EsSUFBSUEsSUFBSUEsR0FBR0EsSUFBSUEsQ0FBQ0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsVUFBVUEsQ0FBQ0EsU0FBU0EsQ0FBQ0EsSUFBSUEsSUFBSUEsS0FBS0EsUUFBUUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsVUFBVUEsQ0FBQ0EsUUFBUUEsQ0FBQ0EsSUFBSUEsSUFBSUEsS0FBS0EsT0FBT0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0JBQy9IQSxDQUFDQSxDQUFDQSxDQUFDQTtnQkFDSEEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7b0JBQ1RBLElBQUlBLFFBQVFBLEdBQUdBLElBQUlBLENBQUNBLElBQUlBLENBQUNBO29CQUN6QkEsTUFBTUEsQ0FBQ0EsVUFBVUEsR0FBR0EsUUFBUUEsQ0FBQ0E7b0JBQzdCQSxjQUFjQSxDQUFDQSxPQUFPQSxDQUFDQSxNQUFNQSxDQUFDQSxNQUFNQSxFQUFFQSxRQUFRQSxFQUFFQSxNQUFNQSxDQUFDQSxRQUFRQSxFQUFFQSxVQUFDQSxhQUFhQTt3QkFDN0VBLFlBQVlBLENBQUNBLFFBQVFBLEVBQUVBLGFBQWFBLENBQUNBLElBQUlBLENBQUNBLENBQUNBO29CQUM3Q0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0JBQ0xBLENBQUNBO2dCQUNEQSxJQUFJQSxjQUFjQSxHQUFHQSxNQUFNQSxDQUFDQSxRQUFRQSxDQUFDQSxJQUFJQSxDQUFDQSxVQUFDQSxLQUFLQTtvQkFDOUNBLElBQUlBLElBQUlBLEdBQUdBLENBQUNBLEtBQUtBLENBQUNBLElBQUlBLElBQUlBLEVBQUVBLENBQUNBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBO29CQUM1Q0EsSUFBSUEsR0FBR0EsR0FBR0Esa0JBQWFBLENBQUNBLElBQUlBLENBQUNBLENBQUNBO29CQUM5QkEsTUFBTUEsQ0FBQ0EsSUFBSUEsSUFBSUEsR0FBR0EsSUFBSUEsSUFBSUEsQ0FBQ0EsVUFBVUEsQ0FBQ0EsWUFBWUEsQ0FBQ0EsSUFBSUEsR0FBR0EsS0FBS0EsTUFBTUEsQ0FBQ0E7Z0JBQ3hFQSxDQUFDQSxDQUFDQSxDQUFDQTtnQkFDSEEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsY0FBY0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7b0JBQ25CQSxjQUFjQSxDQUFDQSxPQUFPQSxDQUFDQSxNQUFNQSxDQUFDQSxNQUFNQSxFQUFFQSxjQUFjQSxDQUFDQSxJQUFJQSxFQUFFQSxTQUFTQSxFQUFFQSxVQUFDQSxJQUFJQTt3QkFDekVBLEVBQUVBLENBQUNBLENBQUNBLElBQUlBLElBQUlBLElBQUlBLENBQUNBLElBQUlBLENBQUNBLENBQUNBLENBQUNBOzRCQUN0QkEsSUFBQUEsQ0FBQ0E7Z0NBQ0NBLE1BQU1BLENBQUNBLGNBQWNBLEdBQUdBLE9BQU9BLENBQUNBLFFBQVFBLENBQUNBLElBQUlBLENBQUNBLElBQUlBLENBQUNBLENBQUNBOzRCQUN0REEsQ0FBRUE7NEJBQUFBLEtBQUtBLENBQUNBLENBQUNBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO2dDQUNYQSxNQUFNQSxDQUFDQSxjQUFjQSxHQUFHQTtvQ0FDdEJBLFlBQVlBLEVBQUVBLElBQUlBO29DQUNsQkEsS0FBS0EsRUFBRUEsQ0FBQ0E7aUNBQ1RBLENBQUNBOzRCQUNKQSxDQUFDQTs0QkFDREEsTUFBTUEsQ0FBQ0EsYUFBYUEsR0FBR0EsSUFBSUEsQ0FBQ0E7NEJBQzVCQSxJQUFJQSxDQUFDQSxNQUFNQSxDQUFDQSxNQUFNQSxDQUFDQSxDQUFDQTt3QkFDdEJBLENBQUNBO29CQUNIQSxDQUFDQSxDQUFDQSxDQUFDQTtnQkFDTEEsQ0FBQ0E7Z0JBQ0RBLE1BQU1BLENBQUNBLFVBQVVBLENBQUNBLHdCQUF3QkEsRUFBRUEsTUFBTUEsQ0FBQ0EsTUFBTUEsRUFBRUEsTUFBTUEsQ0FBQ0EsUUFBUUEsQ0FBQ0EsQ0FBQ0E7WUFDOUVBLENBQUNBO1lBQUNBLElBQUlBLENBQUNBLENBQUNBO2dCQUNOQSxNQUFNQSxDQUFDQSxVQUFVQSxDQUFDQSxZQUFZQSxDQUFDQSxDQUFDQTtnQkFDaENBLElBQUlBLFFBQVFBLEdBQUdBLE1BQU1BLENBQUNBLE1BQU1BLENBQUNBO2dCQUM3QkEsWUFBWUEsQ0FBQ0EsUUFBUUEsRUFBRUEsUUFBUUEsQ0FBQ0EsQ0FBQ0E7Z0JBQ2pDQSxNQUFNQSxDQUFDQSxNQUFNQSxHQUFHQSxJQUFJQSxDQUFDQTtZQUN2QkEsQ0FBQ0E7WUFDREEsSUFBSUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0E7UUFDdEJBLENBQUNBO1FBRUQzRSxTQUFTQSxlQUFlQSxDQUFDQSxJQUFJQTtZQUMzQjRFLE1BQU1BLENBQUNBLGdCQUFnQkEsSUFBSUEsQ0FBQ0EsQ0FBQ0E7WUFDN0JBLElBQUlBLE9BQU9BLEdBQUdBLE1BQU1BLENBQUNBLGdCQUFnQkEsQ0FBQ0E7WUFDdENBLEVBQUVBLENBQUNBLENBQUNBLElBQUlBLENBQUNBLENBQUNBLENBQUNBO2dCQUNUQSxjQUFjQSxDQUFDQSxNQUFNQSxDQUFDQSxNQUFNQSxDQUFDQSxNQUFNQSxFQUFFQSxJQUFJQSxFQUFFQSxVQUFDQSxNQUFNQTtvQkFFaERBLEVBQUVBLENBQUNBLENBQUNBLE1BQU1BLENBQUNBLGdCQUFnQkEsS0FBS0EsT0FBT0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7d0JBQ3hDQSxRQUFHQSxDQUFDQSxLQUFLQSxDQUFDQSwyQkFBMkJBLEdBQUdBLElBQUlBLEdBQUdBLGNBQWNBLEdBQUdBLE1BQU1BLENBQUNBLENBQUNBO3dCQUN4RUEsTUFBTUEsQ0FBQ0EsVUFBVUEsQ0FBQ0EsTUFBTUEsR0FBR0EsTUFBTUEsR0FBR0EsSUFBSUEsR0FBR0EsS0FBS0EsQ0FBQ0E7d0JBQ2pEQSxNQUFNQSxDQUFDQSxVQUFVQSxDQUFDQSxJQUFJQSxHQUFHQSxNQUFNQSxHQUFHQSxNQUFNQSxDQUFDQSxJQUFJQSxHQUFHQSxJQUFJQSxDQUFDQTt3QkFDckRBLElBQUlBLENBQUNBLE1BQU1BLENBQUNBLE1BQU1BLENBQUNBLENBQUNBO29CQUN0QkEsQ0FBQ0E7b0JBQUNBLElBQUlBLENBQUNBLENBQUNBO29CQUVSQSxDQUFDQTtnQkFDSEEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7WUFDTEEsQ0FBQ0E7UUFDSEEsQ0FBQ0E7UUFHRDVFLE1BQU1BLENBQUNBLFdBQVdBLEdBQUdBLFVBQUNBLFFBQVFBLEVBQUVBLEVBQUVBO1lBQ2hDQSxJQUFJQSxNQUFNQSxHQUFHQSxRQUFRQSxDQUFDQTtZQUN0QkEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsU0FBU0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0JBQ3JCQSxNQUFNQSxHQUFHQSxNQUFNQSxDQUFDQSxNQUFNQSxHQUFHQSxHQUFHQSxHQUFHQSxRQUFRQSxDQUFDQTtZQUMxQ0EsQ0FBQ0E7WUFBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0E7Z0JBQ05BLElBQUlBLFNBQVNBLEdBQUdBLE1BQU1BLENBQUNBLE1BQU1BLENBQUNBLEtBQUtBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBO2dCQUN6Q0EsU0FBU0EsR0FBR0EsU0FBU0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsU0FBU0EsQ0FBQ0EsSUFBSUEsRUFBRUEsQ0FBQ0EsQ0FBQ0E7Z0JBQy9DQSxTQUFTQSxDQUFDQSxJQUFJQSxDQUFDQSxRQUFRQSxDQUFDQSxDQUFDQTtnQkFDekJBLE1BQU1BLEdBQUdBLFNBQVNBLENBQUNBLElBQUlBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBO1lBQy9CQSxDQUFDQTtZQUNEQSxRQUFHQSxDQUFDQSxLQUFLQSxDQUFDQSxVQUFVQSxFQUFFQSxNQUFNQSxDQUFDQSxNQUFNQSxDQUFDQSxDQUFDQTtZQUNyQ0EsUUFBR0EsQ0FBQ0EsS0FBS0EsQ0FBQ0EsVUFBVUEsRUFBRUEsTUFBTUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0E7WUFDckNBLFFBQUdBLENBQUNBLEtBQUtBLENBQUNBLFlBQVlBLEVBQUVBLFFBQVFBLENBQUNBLENBQUNBO1lBQ2xDQSxRQUFHQSxDQUFDQSxLQUFLQSxDQUFDQSxnQkFBZ0JBLEVBQUVBLE1BQU1BLENBQUNBLENBQUNBO1lBQ3BDQSxjQUFjQSxDQUFDQSxPQUFPQSxDQUFDQSxNQUFNQSxDQUFDQSxNQUFNQSxFQUFFQSxNQUFNQSxFQUFFQSxTQUFTQSxFQUFFQSxVQUFDQSxJQUFJQTtnQkFDNURBLEVBQUVBLENBQUNBLElBQUlBLENBQUNBLElBQUlBLENBQUNBLENBQUNBO1lBQ2hCQSxDQUFDQSxDQUFDQSxDQUFDQTtRQUNMQSxDQUFDQSxDQUFDQTtRQUdGQSxTQUFTQSxpQkFBaUJBO1lBQ3hCNkUsSUFBSUEsV0FBV0EsR0FBR0EsTUFBTUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsV0FBV0EsQ0FBQ0E7WUFDNUNBLE1BQU1BLENBQUNBLENBQUNBLE1BQU1BLENBQUNBLE1BQU1BLElBQUlBLFdBQVdBLENBQUNBLEdBQUdBLFVBQVVBLENBQUNBLElBQUlBLENBQUNBLE1BQU1BLENBQUNBLE1BQU1BLEVBQUVBLFdBQVdBLENBQUNBLEdBQUdBLElBQUlBLENBQUNBO1FBQzdGQSxDQUFDQTtJQUNIN0UsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7QUFDTkEsQ0FBQ0EsRUF2bUJNLElBQUksS0FBSixJQUFJLFFBdW1CVjs7QUMxbUJELElBQU8sSUFBSSxDQXlGVjtBQXpGRCxXQUFPLElBQUksRUFBQyxDQUFDO0lBY1hBLFNBQWdCQSxlQUFlQSxDQUFDQSxPQUFPQSxFQUFFQSxNQUEwQkE7UUFDakU4RSxNQUFNQSxDQUFDQSxPQUFPQSxDQUFDQSxNQUFNQSxDQUFDQTtZQUNwQkEsT0FBT0EsRUFBRUEsTUFBTUE7WUFDZkEsV0FBV0EsRUFBRUEsMkNBQTJDQTtZQUN4REEsVUFBVUEsRUFBRUEsQ0FBQ0EsUUFBUUEsRUFBRUEsUUFBUUEsRUFBR0EsV0FBV0EsRUFBRUEsUUFBUUEsRUFBRUEsWUFBWUEsRUFBRUEsVUFBVUEsRUFBRUEsVUFBQ0EsTUFBTUEsRUFBRUEsTUFBTUEsRUFBRUEsU0FBU0EsRUFBRUEsTUFBTUEsRUFBRUEsVUFBVUEsRUFBRUEsUUFBUUE7Z0JBQ3pJQSxNQUFNQSxDQUFDQSxNQUFNQSxHQUFJQSxNQUFNQSxDQUFDQTtnQkFDeEJBLE1BQU1BLENBQUNBLFVBQVVBLEdBQUlBLFVBQVVBLENBQUNBO2dCQUNoQ0EsTUFBTUEsQ0FBQ0EsUUFBUUEsR0FBSUEsUUFBUUEsQ0FBQ0E7Z0JBRTVCQSxNQUFNQSxDQUFDQSxLQUFLQSxHQUFHQSxVQUFDQSxNQUFNQTtvQkFDcEJBLE1BQU1BLENBQUNBLEtBQUtBLEVBQUVBLENBQUNBO2dCQUNqQkEsQ0FBQ0EsQ0FBQ0E7Z0JBRUZBLE1BQU1BLENBQUNBLG9CQUFvQkEsR0FBR0EsU0FBU0EsQ0FBQ0E7WUFFMUNBLENBQUNBLENBQUNBO1NBQ0hBLENBQUNBLENBQUNBO0lBQ0xBLENBQUNBO0lBakJlOUUsb0JBQWVBLEdBQWZBLGVBaUJmQSxDQUFBQTtJQVNEQSxTQUFnQkEsYUFBYUEsQ0FBQ0EsT0FBT0EsRUFBRUEsTUFBd0JBO1FBQzdEK0UsTUFBTUEsQ0FBQ0EsT0FBT0EsQ0FBQ0EsTUFBTUEsQ0FBQ0E7WUFDcEJBLE9BQU9BLEVBQUVBLE1BQU1BO1lBQ2ZBLFdBQVdBLEVBQUVBLHlDQUF5Q0E7WUFDdERBLFVBQVVBLEVBQUVBLENBQUNBLFFBQVFBLEVBQUVBLFFBQVFBLEVBQUdBLFdBQVdBLEVBQUVBLE1BQU1BLEVBQUVBLGFBQWFBLEVBQUVBLFVBQUNBLE1BQU1BLEVBQUVBLE1BQU1BLEVBQUVBLFNBQVNBLEVBQUVBLElBQUlBLEVBQUVBLFdBQVdBO2dCQUNqSEEsTUFBTUEsQ0FBQ0EsSUFBSUEsR0FBSUEsSUFBSUEsQ0FBQ0E7Z0JBQ3BCQSxNQUFNQSxDQUFDQSxXQUFXQSxHQUFJQSxXQUFXQSxDQUFDQTtnQkFFbENBLE1BQU1BLENBQUNBLEtBQUtBLEdBQUdBLFVBQUNBLE1BQU1BO29CQUNwQkEsTUFBTUEsQ0FBQ0EsS0FBS0EsRUFBRUEsQ0FBQ0E7Z0JBQ2pCQSxDQUFDQSxDQUFDQTtnQkFFRkEsTUFBTUEsQ0FBQ0Esa0JBQWtCQSxHQUFHQSxTQUFTQSxDQUFDQTtZQUV4Q0EsQ0FBQ0EsQ0FBQ0E7U0FDSEEsQ0FBQ0EsQ0FBQ0E7SUFDTEEsQ0FBQ0E7SUFoQmUvRSxrQkFBYUEsR0FBYkEsYUFnQmZBLENBQUFBO0lBVURBLFNBQWdCQSxlQUFlQSxDQUFDQSxPQUFPQSxFQUFFQSxNQUEwQkE7UUFDakVnRixNQUFNQSxDQUFDQSxPQUFPQSxDQUFDQSxNQUFNQSxDQUFDQTtZQUNwQkEsT0FBT0EsRUFBRUEsTUFBTUE7WUFDZkEsV0FBV0EsRUFBRUEsMkNBQTJDQTtZQUN4REEsVUFBVUEsRUFBRUEsQ0FBQ0EsUUFBUUEsRUFBRUEsUUFBUUEsRUFBR0EsV0FBV0EsRUFBRUEsa0JBQWtCQSxFQUFFQSxTQUFTQSxFQUFFQSxVQUFDQSxNQUFNQSxFQUFFQSxNQUFNQSxFQUFFQSxTQUFTQSxFQUFFQSxnQkFBZ0JBLEVBQUVBLE9BQU9BO2dCQUVqSUEsTUFBTUEsQ0FBQ0EsZ0JBQWdCQSxHQUFHQSxnQkFBZ0JBLENBQUNBO2dCQUUzQ0EsTUFBTUEsQ0FBQ0EsS0FBS0EsR0FBR0EsVUFBQ0EsTUFBTUE7b0JBQ3BCQSxNQUFNQSxDQUFDQSxLQUFLQSxFQUFFQSxDQUFDQTtnQkFDakJBLENBQUNBLENBQUNBO2dCQUVGQSxNQUFNQSxDQUFDQSxvQkFBb0JBLEdBQUdBLFNBQVNBLENBQUNBO2dCQUV4Q0EsTUFBTUEsQ0FBQ0EsT0FBT0EsR0FBR0EsT0FBT0EsQ0FBQ0E7WUFDM0JBLENBQUNBLENBQUNBO1NBQ0hBLENBQUNBLENBQUNBO0lBQ0xBLENBQUNBO0lBakJlaEYsb0JBQWVBLEdBQWZBLGVBaUJmQSxDQUFBQTtBQU1IQSxDQUFDQSxFQXpGTSxJQUFJLEtBQUosSUFBSSxRQXlGVjs7QUN6RkQsSUFBTyxJQUFJLENBK0lWO0FBL0lELFdBQU8sSUFBSSxFQUFDLENBQUM7SUFFWEEsWUFBT0EsQ0FBQ0EsU0FBU0EsQ0FBQ0Esa0JBQWtCQSxFQUFFQSxDQUFDQSxXQUFXQSxFQUFFQSxVQUFDQSxTQUFTQTtRQUM1REEsTUFBTUEsQ0FBQ0E7WUFDTEEsUUFBUUEsRUFBRUEsR0FBR0E7WUFDYkEsSUFBSUEsRUFBRUEsVUFBQ0EsTUFBTUEsRUFBRUEsUUFBUUEsRUFBRUEsS0FBS0E7Z0JBRTVCQSxRQUFRQSxDQUFDQSxJQUFJQSxDQUFDQSxpQkFBaUJBLEVBQUVBLFVBQUNBLEtBQUtBO29CQUNyQ0EsSUFBSUEsR0FBR0EsR0FBR0EsUUFBUUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0E7b0JBQzdCQSxPQUFPQSxDQUFDQSxPQUFPQSxDQUFDQSxHQUFHQSxFQUFFQSxVQUFDQSxDQUFDQTt3QkFDckJBLEVBQUVBLENBQUNBLENBQUNBLENBQUNBLENBQUNBLFlBQVlBLENBQUNBLFdBQVdBLENBQUNBLENBQUNBLENBQUNBLENBQUNBOzRCQUNoQ0EsTUFBTUEsQ0FBQ0E7d0JBQ1RBLENBQUNBO3dCQUNEQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTt3QkFDVEEsSUFBSUEsSUFBSUEsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsSUFBSUEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsSUFBSUEsRUFBRUEsQ0FBQ0E7d0JBQ3pDQSxFQUFFQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSxDQUFDQSxDQUFDQTs0QkFDVEEsSUFBSUEsYUFBYUEsR0FBR0EsQ0FBQ0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsZ0JBQWdCQSxDQUFDQSxDQUFDQTs0QkFDN0NBLElBQUlBLFFBQVFBLEdBQUdBLElBQUlBLENBQUNBLFVBQVVBLENBQUNBLE1BQU1BLEVBQUVBLFNBQVNBLEVBQUVBLElBQUlBLEVBQUVBLGFBQWFBLENBQUNBLENBQUNBOzRCQUN2RUEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsUUFBUUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0NBQ2JBLENBQUNBLENBQUNBLElBQUlBLENBQUNBLE1BQU1BLEVBQUVBLFFBQVFBLENBQUNBLENBQUNBOzRCQUMzQkEsQ0FBQ0E7d0JBQ0hBLENBQUNBO29CQUNIQSxDQUFDQSxDQUFDQSxDQUFDQTtvQkFDSEEsSUFBSUEsSUFBSUEsR0FBR0EsUUFBUUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsS0FBS0EsQ0FBQ0EsQ0FBQ0E7b0JBQ2hDQSxPQUFPQSxDQUFDQSxPQUFPQSxDQUFDQSxJQUFJQSxFQUFFQSxVQUFDQSxDQUFDQTt3QkFDdEJBLEVBQUVBLENBQUNBLENBQUNBLENBQUNBLENBQUNBLFlBQVlBLENBQUNBLFdBQVdBLENBQUNBLENBQUNBLENBQUNBLENBQUNBOzRCQUNoQ0EsTUFBTUEsQ0FBQ0E7d0JBQ1RBLENBQUNBO3dCQUNEQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTt3QkFDVEEsSUFBSUEsSUFBSUEsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsS0FBS0EsQ0FBQ0EsSUFBSUEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsSUFBSUEsRUFBRUEsQ0FBQ0E7d0JBQ3hDQSxFQUFFQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSxDQUFDQSxDQUFDQTs0QkFDVEEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsVUFBVUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0NBQ3pCQSxJQUFJQSxHQUFHQSxJQUFJQSxDQUFDQSxHQUFHQSxDQUFDQSxJQUFJQSxDQUFDQSxDQUFDQTtnQ0FDdEJBLENBQUNBLENBQUNBLElBQUlBLENBQUNBLEtBQUtBLEVBQUVBLElBQUlBLENBQUNBLENBQUNBO2dDQUdwQkEsQ0FBQ0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsV0FBV0EsRUFBRUEsTUFBTUEsQ0FBQ0EsQ0FBQ0E7NEJBQzlCQSxDQUFDQTt3QkFDSEEsQ0FBQ0E7b0JBQ0hBLENBQUNBLENBQUNBLENBQUNBO2dCQUNMQSxDQUFDQSxDQUFDQSxDQUFBQTtZQUNKQSxDQUFDQTtTQUNGQSxDQUFBQTtJQUNIQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtJQUVKQSxZQUFPQSxDQUFDQSxTQUFTQSxDQUFDQSxpQkFBaUJBLEVBQUVBLENBQUNBLFdBQVdBLEVBQUVBLFVBQUNBLFNBQVNBO1FBQzNEQSxNQUFNQSxDQUFDQTtZQUNMQSxRQUFRQSxFQUFFQSxHQUFHQTtZQUNiQSxJQUFJQSxFQUFFQSxVQUFDQSxNQUFNQSxFQUFFQSxRQUFRQSxFQUFFQSxLQUFLQTtnQkFDNUJBLElBQUlBLE1BQU1BLEdBQUdBLEtBQUtBLENBQUNBO2dCQUVuQkEsU0FBU0EsU0FBU0EsQ0FBQ0EsUUFBUUE7b0JBQ3pCaUYsRUFBRUEsQ0FBQ0EsQ0FBQ0EsUUFBUUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7d0JBQ2JBLElBQUlBLE1BQU1BLEdBQUdBLFFBQVFBLENBQUNBLE1BQU1BLEVBQUVBLENBQUNBO3dCQUMvQkEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7NEJBQ1hBLE1BQU1BLENBQUNBLE1BQU1BLENBQUNBLEdBQUdBLENBQUNBO3dCQUNwQkEsQ0FBQ0E7b0JBQ0hBLENBQUNBO29CQUNEQSxNQUFNQSxDQUFDQSxDQUFDQSxDQUFDQTtnQkFDWEEsQ0FBQ0E7Z0JBRURqRixTQUFTQSxZQUFZQTtvQkFDbkJrRixJQUFJQSxNQUFNQSxHQUFHQSxLQUFLQSxDQUFDQTtvQkFDbkJBLElBQUlBLEVBQUVBLEdBQUdBLFNBQVNBLENBQUNBLE1BQU1BLEVBQUVBLENBQUNBLE1BQU1BLENBQUNBLENBQUNBO29CQUNwQ0EsTUFBTUEsQ0FBQ0EsVUFBVUEsQ0FBQ0EsRUFBRUEsQ0FBQ0EsQ0FBQ0E7Z0JBQ3hCQSxDQUFDQTtnQkFFRGxGLFNBQVNBLFVBQVVBLENBQUNBLEVBQUVBO29CQUNwQm1GLElBQUlBLE1BQU1BLEdBQUdBLEtBQUtBLENBQUNBO29CQUNuQkEsSUFBSUEsRUFBRUEsR0FBR0EsU0FBU0EsQ0FBQ0EsTUFBTUEsRUFBRUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0E7b0JBQ3BDQSxFQUFFQSxDQUFDQSxDQUFDQSxFQUFFQSxDQUFDQSxDQUFDQSxDQUFDQTt3QkFDUEEsSUFBSUEsUUFBUUEsR0FBR0EsVUFBVUEsR0FBR0EsRUFBRUEsR0FBR0EsSUFBSUEsQ0FBQ0E7d0JBQ3RDQSxJQUFJQSxjQUFjQSxHQUFHQSxRQUFRQSxDQUFDQSxJQUFJQSxDQUFDQSxRQUFRQSxDQUFDQSxDQUFDQTt3QkFDN0NBLEVBQUVBLENBQUNBLENBQUNBLGNBQWNBLElBQUlBLGNBQWNBLENBQUNBLE1BQU1BLENBQUNBLENBQUNBLENBQUNBOzRCQUM1Q0EsSUFBSUEsY0FBY0EsR0FBR0EsQ0FBQ0EsQ0FBQ0E7NEJBQ3ZCQSxJQUFJQSxLQUFLQSxHQUFHQSxTQUFTQSxDQUFDQSxDQUFDQSxDQUFDQSxRQUFRQSxDQUFDQSxDQUFDQSxDQUFDQTs0QkFDbkNBLElBQUlBLEdBQUdBLEdBQUdBLFNBQVNBLENBQUNBLGNBQWNBLENBQUNBLEdBQUdBLEtBQUtBLENBQUNBOzRCQUM1Q0EsRUFBRUEsQ0FBQ0EsQ0FBQ0EsR0FBR0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0NBQ1pBLEdBQUdBLEdBQUdBLENBQUNBLENBQUNBOzRCQUNWQSxDQUFDQTs0QkFFREEsQ0FBQ0EsQ0FBQ0EsV0FBV0EsQ0FBQ0EsQ0FBQ0EsT0FBT0EsQ0FBQ0E7Z0NBQ3JCQSxTQUFTQSxFQUFFQSxHQUFHQTs2QkFDZkEsRUFBRUEsY0FBY0EsQ0FBQ0EsQ0FBQ0E7NEJBQ25CQSxNQUFNQSxHQUFHQSxJQUFJQSxDQUFDQTt3QkFDaEJBLENBQUNBO3dCQUFDQSxJQUFJQSxDQUFDQSxDQUFDQTt3QkFFUkEsQ0FBQ0E7b0JBQ0hBLENBQUNBO29CQUNEQSxNQUFNQSxDQUFDQSxNQUFNQSxDQUFDQTtnQkFDaEJBLENBQUNBO2dCQUVEbkYsU0FBU0EsUUFBUUEsQ0FBQ0EsS0FBS0E7b0JBQ3JCb0YsSUFBSUEsUUFBUUEsR0FBR0EsUUFBUUEsQ0FBQ0EsSUFBSUEsQ0FBQ0Esc0JBQXNCQSxDQUFDQSxDQUFDQTtvQkFDckRBLElBQUlBLE9BQU9BLEdBQUdBLEtBQUtBLENBQUNBO29CQUNwQkEsT0FBT0EsQ0FBQ0EsT0FBT0EsQ0FBQ0EsUUFBUUEsRUFBRUEsVUFBQ0EsRUFBRUE7d0JBQzNCQSxJQUFJQSxFQUFFQSxHQUFHQSxDQUFDQSxDQUFDQSxFQUFFQSxDQUFDQSxDQUFDQTt3QkFFZkEsSUFBSUEsQ0FBQ0EsR0FBR0EsRUFBRUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0E7d0JBQ3ZCQSxFQUFFQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSxDQUFDQSxDQUFDQSxNQUFNQSxDQUFDQSxDQUFDQSxDQUFDQTs0QkFDcEJBLElBQUlBLElBQUlBLEdBQUdBLEVBQUVBLENBQUNBLElBQUlBLEVBQUVBLENBQUNBOzRCQUNyQkEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0NBQ1RBLElBQUlBLE1BQU1BLEdBQUdBLElBQUlBLENBQUNBLE9BQU9BLENBQUNBLElBQUlBLEVBQUVBLEdBQUdBLENBQUNBLENBQUNBO2dDQUNyQ0EsSUFBSUEsWUFBWUEsR0FBR0EsR0FBR0EsR0FBR0EsU0FBU0EsQ0FBQ0EsSUFBSUEsRUFBRUEsR0FBR0EsUUFBUUEsR0FBR0EsTUFBTUEsQ0FBQ0E7Z0NBQzlEQSxJQUFJQSxJQUFJQSxHQUFHQSxJQUFJQSxDQUFDQSxVQUFVQSxDQUFDQSxTQUFTQSxFQUFFQSxZQUFZQSxFQUFFQSxDQUFDQSxNQUFNQSxDQUFDQSxDQUFDQSxDQUFDQTtnQ0FHOURBLElBQUlBLElBQUlBLEdBQUdBLENBQUNBLENBQUNBLFdBQVdBLEdBQUdBLE1BQU1BLEdBQUdBLFVBQVVBLEdBQUdBLElBQUlBLEdBQUdBLGlDQUFpQ0EsQ0FBQ0EsQ0FBQ0E7Z0NBQzNGQSxJQUFJQSxDQUFDQSxFQUFFQSxDQUFDQSxPQUFPQSxFQUFFQTtvQ0FDZkEsVUFBVUEsQ0FBQ0E7d0NBQ1RBLEVBQUVBLENBQUNBLENBQUNBLFVBQVVBLENBQUNBLE1BQU1BLENBQUNBLENBQUNBLENBQUNBLENBQUNBO3dDQUN6QkEsQ0FBQ0E7b0NBQ0hBLENBQUNBLEVBQUVBLEVBQUVBLENBQUNBLENBQUNBO2dDQUNUQSxDQUFDQSxDQUFDQSxDQUFDQTtnQ0FFSEEsSUFBSUEsQ0FBQ0EsWUFBWUEsQ0FBQ0EsRUFBRUEsQ0FBQ0EsQ0FBQ0E7Z0NBQ3RCQSxFQUFFQSxDQUFDQSxNQUFNQSxFQUFFQSxDQUFDQTtnQ0FDWkEsSUFBSUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsRUFBRUEsQ0FBQ0EsQ0FBQ0E7Z0NBQ2hCQSxPQUFPQSxHQUFHQSxJQUFJQSxDQUFDQTs0QkFDakJBLENBQUNBO3dCQUNIQSxDQUFDQTtvQkFDSEEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7b0JBQ0hBLEVBQUVBLENBQUNBLENBQUNBLE9BQU9BLElBQUlBLENBQUNBLE1BQU1BLENBQUNBLENBQUNBLENBQUNBO3dCQUN2QkEsVUFBVUEsQ0FBQ0E7NEJBQ1RBLEVBQUVBLENBQUNBLENBQUNBLFlBQVlBLEVBQUVBLENBQUNBLENBQUNBLENBQUNBO2dDQUNuQkEsTUFBTUEsR0FBR0EsSUFBSUEsQ0FBQ0E7NEJBQ2hCQSxDQUFDQTt3QkFDSEEsQ0FBQ0EsRUFBRUEsRUFBRUEsQ0FBQ0EsQ0FBQ0E7b0JBQ1RBLENBQUNBO2dCQUNIQSxDQUFDQTtnQkFFRHBGLFNBQVNBLGVBQWVBLENBQUNBLEtBQUtBO29CQUU1QnFGLFFBQVFBLENBQUNBLE1BQU1BLENBQUNBLGlCQUFpQkEsRUFBRUEsZUFBZUEsQ0FBQ0EsQ0FBQ0E7b0JBQ3BEQSxRQUFRQSxDQUFDQSxLQUFLQSxDQUFDQSxDQUFDQTtvQkFDaEJBLFFBQVFBLENBQUNBLElBQUlBLENBQUNBLGlCQUFpQkEsRUFBRUEsZUFBZUEsQ0FBQ0EsQ0FBQ0E7Z0JBQ3BEQSxDQUFDQTtnQkFFRHJGLFFBQVFBLENBQUNBLElBQUlBLENBQUNBLGlCQUFpQkEsRUFBRUEsZUFBZUEsQ0FBQ0EsQ0FBQ0E7WUFDcERBLENBQUNBO1NBQ0ZBLENBQUNBO0lBQ0pBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO0FBRU5BLENBQUNBLEVBL0lNLElBQUksS0FBSixJQUFJLFFBK0lWOztBQzdJRCxJQUFPLElBQUksQ0EwQ1Y7QUExQ0QsV0FBTyxJQUFJLEVBQUMsQ0FBQztJQUVYQSxTQUFTQSxDQUFDQSw0QkFBNEJBLENBQUNBLElBQUlBLENBQ3pDQSxVQUFDQSxPQUFPQTtRQUNOQSxJQUFJQSxXQUFXQSxHQUFHQSxPQUFPQSxDQUFDQSxXQUFXQSxDQUFDQTtRQUN0Q0EsSUFBSUEsV0FBV0EsR0FBR0EsT0FBT0EsQ0FBQ0EsV0FBV0EsQ0FBQ0E7UUFDdENBLElBQUlBLEtBQUtBLEdBQUdBLEVBQUVBLENBQUNBO1FBQ2ZBLElBQUlBLFFBQVFBLEdBQUdBLEVBQUVBLENBQUNBO1FBQ2xCQSxFQUFFQSxDQUFDQSxDQUFDQSxXQUFXQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUVoQkEsSUFBSUEsR0FBR0EsR0FBR0EsV0FBV0EsQ0FBQ0EsT0FBT0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0E7WUFDbkNBLEVBQUVBLENBQUNBLENBQUNBLEdBQUdBLEdBQUdBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO2dCQUNaQSxLQUFLQSxHQUFHQSxXQUFXQSxDQUFDQSxTQUFTQSxDQUFDQSxDQUFDQSxFQUFFQSxHQUFHQSxDQUFDQSxDQUFDQTtnQkFDdENBLFFBQVFBLEdBQUdBLFdBQVdBLENBQUNBLFNBQVNBLENBQUNBLEdBQUdBLEdBQUdBLENBQUNBLENBQUNBLENBQUNBO1lBQzVDQSxDQUFDQTtRQUNIQSxDQUFDQTtRQUNEQSxNQUFNQSxDQUFDQTtZQUNMQSxPQUFPQSxFQUFFQSxjQUFNQSxPQUFBQSxXQUFXQSxJQUFJQSxLQUFLQSxJQUFJQSxRQUFRQSxJQUFJQSxTQUFTQSxDQUFDQSxjQUFjQSxFQUFFQSxFQUE5REEsQ0FBOERBO1lBQzdFQSxJQUFJQSxFQUFFQSxVQUFVQSxDQUFDQSxJQUFJQSxDQUFDQSxXQUFXQSxFQUFFQSxNQUFNQSxFQUFFQSxLQUFLQSxFQUFFQSxRQUFRQSxFQUFFQSxNQUFNQSxDQUFDQTtZQUNuRUEsS0FBS0EsRUFBRUEsUUFBUUE7WUFDZkEsS0FBS0EsRUFBRUEsd0NBQXdDQTtTQUNoREEsQ0FBQ0E7SUFDSkEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7SUFHTEEsU0FBZ0JBLHVCQUF1QkEsQ0FBQ0EsTUFBTUE7UUFDNUNzRixJQUFJQSxVQUFVQSxHQUFHQSxNQUFNQSxDQUFDQSxTQUFTQSxJQUFJQSxVQUFVQSxDQUFDQSxJQUFJQSxDQUFDQSxjQUFTQSxDQUFDQSxNQUFNQSxDQUFDQSxFQUFFQSxNQUFNQSxDQUFDQSxDQUFDQTtRQUNoRkEsTUFBTUEsQ0FBQ0E7WUFDTEE7Z0JBQ0VBLEtBQUtBLEVBQUVBLFFBQVFBO2dCQUNmQSxJQUFJQSxFQUFFQSxVQUFVQTtnQkFDaEJBLEtBQUtBLEVBQUVBLHdDQUF3Q0E7YUFDaERBO1NBQ0ZBLENBQUFBO0lBQ0hBLENBQUNBO0lBVGV0Riw0QkFBdUJBLEdBQXZCQSx1QkFTZkEsQ0FBQUE7SUFFREEsU0FBZ0JBLHVCQUF1QkEsQ0FBQ0EsTUFBTUE7UUFDMUN1RixNQUFNQSxDQUFDQTtZQUNMQSxLQUFLQSxFQUFFQSxTQUFTQTtZQUNoQkEsS0FBS0EsRUFBRUEsbUJBQW1CQTtTQUMzQkEsQ0FBQ0E7SUFDTkEsQ0FBQ0E7SUFMZXZGLDRCQUF1QkEsR0FBdkJBLHVCQUtmQSxDQUFBQTtBQUNIQSxDQUFDQSxFQTFDTSxJQUFJLEtBQUosSUFBSSxRQTBDVjs7QUN6Q0QsSUFBTyxJQUFJLENBcVlWO0FBcllELFdBQU8sSUFBSSxFQUFDLENBQUM7SUFLWEEsSUFBYUEsaUJBQWlCQTtRQU81QndGLFNBUFdBLGlCQUFpQkEsQ0FPaEJBLE1BQU1BO1lBTlhDLG9CQUFlQSxHQUFHQSxFQUFFQSxDQUFDQTtZQU8xQkEsSUFBSUEsV0FBV0EsR0FBR0EsVUFBVUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsYUFBYUEsQ0FBQ0EsQ0FBQ0E7WUFDbkRBLElBQUlBLENBQUNBLEtBQUtBLEdBQUdBLFVBQVVBLENBQUNBLE1BQU1BLENBQUNBLE9BQU9BLENBQUNBLENBQUNBO1lBQ3hDQSxJQUFJQSxDQUFDQSxNQUFNQSxHQUFHQSxLQUFLQSxDQUFDQSxnQkFBZ0JBLEVBQUVBLENBQUNBO1lBQ3ZDQSxJQUFJQSxLQUFLQSxHQUFHQSxNQUFNQSxDQUFDQSxLQUFLQSxDQUFDQTtZQUN6QkEsSUFBSUEsUUFBUUEsR0FBR0EsTUFBTUEsQ0FBQ0EsTUFBTUEsQ0FBQ0E7WUFDN0JBLElBQUlBLENBQUNBLE9BQU9BLEdBQUdBLFVBQVVBLENBQUNBLElBQUlBLENBQUNBLFdBQVdBLEVBQUVBLFlBQVlBLEVBQUVBLEtBQUtBLEVBQUVBLFFBQVFBLENBQUNBLENBQUNBO1FBQzdFQSxDQUFDQTtRQUVNRCxtQ0FBT0EsR0FBZEEsVUFBZUEsTUFBYUEsRUFBRUEsSUFBV0EsRUFBRUEsUUFBZUEsRUFBRUEsRUFBRUE7WUFFNURFLElBQUlBLEtBQUtBLEdBQUdBLElBQUlBLENBQUNBO1lBQ2pCQSxFQUFFQSxDQUFDQSxDQUFDQSxNQUFNQSxDQUFDQSxDQUFDQSxDQUFDQTtnQkFDWEEsS0FBS0EsR0FBR0EsTUFBTUEsR0FBR0EsTUFBTUEsQ0FBQ0E7WUFDMUJBLENBQUNBO1lBQ0RBLElBQUlBLENBQUNBLEtBQUtBLENBQUNBLFVBQVVBLENBQUNBLElBQUlBLENBQUNBLFNBQVNBLEVBQUVBLElBQUlBLElBQUlBLEdBQUdBLENBQUNBLEVBQUVBLEtBQUtBLEVBQ3ZEQSxVQUFDQSxJQUFJQSxFQUFFQSxNQUFNQSxFQUFFQSxPQUFPQSxFQUFFQSxNQUFNQTtnQkFDNUJBLEVBQUVBLENBQUNBLENBQUNBLElBQUlBLENBQUNBLENBQUNBLENBQUNBO29CQUNUQSxJQUFJQSxPQUFPQSxHQUFRQSxJQUFJQSxDQUFDQTtvQkFDeEJBLEVBQUVBLENBQUNBLENBQUNBLE9BQU9BLENBQUNBLE9BQU9BLENBQUNBLElBQUlBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO3dCQUMxQkEsT0FBT0EsQ0FBQ0EsT0FBT0EsQ0FBQ0EsSUFBSUEsRUFBRUEsVUFBQ0EsSUFBSUE7NEJBQ3pCQSxFQUFFQSxDQUFDQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSxTQUFTQSxJQUFJQSxJQUFJQSxDQUFDQSxJQUFJQSxLQUFLQSxLQUFLQSxDQUFDQSxDQUFDQSxDQUFDQTtnQ0FDM0NBLElBQUlBLENBQUNBLFNBQVNBLEdBQUdBLElBQUlBLENBQUNBOzRCQUN4QkEsQ0FBQ0E7d0JBQ0hBLENBQUNBLENBQUNBLENBQUNBO3dCQUNIQSxPQUFPQSxHQUFHQTs0QkFDUkEsU0FBU0EsRUFBRUEsSUFBSUE7NEJBQ2ZBLFFBQVFBLEVBQUVBLElBQUlBO3lCQUNmQSxDQUFBQTtvQkFDSEEsQ0FBQ0E7b0JBQUNBLElBQUlBLENBQUNBLENBQUNBO3dCQUNOQSxPQUFPQSxHQUFHQSxJQUFJQSxDQUFDQTt3QkFDZkEsSUFBSUEsT0FBT0EsR0FBR0EsSUFBSUEsQ0FBQ0EsT0FBT0EsQ0FBQ0E7d0JBQzNCQSxFQUFFQSxDQUFDQSxDQUFDQSxPQUFPQSxDQUFDQSxDQUFDQSxDQUFDQTs0QkFDWkEsT0FBT0EsQ0FBQ0EsSUFBSUEsR0FBR0EsT0FBT0EsQ0FBQ0EsWUFBWUEsRUFBRUEsQ0FBQ0E7d0JBQ3hDQSxDQUFDQTtvQkFDSEEsQ0FBQ0E7b0JBQ0RBLEVBQUVBLENBQUNBLE9BQU9BLENBQUNBLENBQUNBO2dCQUNkQSxDQUFDQTtZQUNIQSxDQUFDQSxDQUFDQSxDQUFDQTtRQUNQQSxDQUFDQTtRQUVNRixtQ0FBT0EsR0FBZEEsVUFBZUEsTUFBYUEsRUFBRUEsSUFBV0EsRUFBRUEsUUFBZUEsRUFBRUEsYUFBb0JBLEVBQUVBLEVBQUVBO1lBQ2xGRyxJQUFJQSxLQUFLQSxHQUFHQSxJQUFJQSxDQUFDQTtZQUNqQkEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0JBQ1hBLEtBQUtBLEdBQUdBLE1BQU1BLEdBQUdBLE1BQU1BLENBQUNBO1lBQzFCQSxDQUFDQTtZQUNEQSxFQUFFQSxDQUFDQSxDQUFDQSxhQUFhQSxDQUFDQSxDQUFDQSxDQUFDQTtnQkFDbEJBLEtBQUtBLEdBQUdBLENBQUNBLEtBQUtBLEdBQUdBLEtBQUtBLEdBQUdBLEdBQUdBLEdBQUdBLEVBQUVBLENBQUNBLEdBQUdBLFVBQVVBLEdBQUdBLGtCQUFrQkEsQ0FBQ0EsYUFBYUEsQ0FBQ0EsQ0FBQ0E7WUFDdEZBLENBQUNBO1lBQ0RBLElBQUlBLElBQUlBLEdBQUdBLFFBQVFBLENBQUNBO1lBQ3BCQSxJQUFJQSxDQUFDQSxNQUFNQSxDQUFDQSxVQUFVQSxDQUFDQSxJQUFJQSxDQUFDQSxTQUFTQSxFQUFFQSxJQUFJQSxJQUFJQSxHQUFHQSxDQUFDQSxFQUFFQSxLQUFLQSxFQUFFQSxJQUFJQSxFQUM5REEsVUFBQ0EsSUFBSUEsRUFBRUEsTUFBTUEsRUFBRUEsT0FBT0EsRUFBRUEsTUFBTUE7Z0JBQzVCQSxFQUFFQSxDQUFDQSxJQUFJQSxDQUFDQSxDQUFDQTtZQUNYQSxDQUFDQSxDQUFDQSxDQUFDQTtRQUNQQSxDQUFDQTtRQWFNSCxtQ0FBT0EsR0FBZEEsVUFBZUEsTUFBYUEsRUFBRUEsUUFBZUEsRUFBRUEsSUFBV0EsRUFBRUEsS0FBWUEsRUFBRUEsRUFBRUE7WUFDMUVJLElBQUlBLEtBQUtBLEdBQUdBLElBQUlBLENBQUNBO1lBQ2pCQSxFQUFFQSxDQUFDQSxDQUFDQSxNQUFNQSxDQUFDQSxDQUFDQSxDQUFDQTtnQkFDWEEsS0FBS0EsR0FBR0EsTUFBTUEsR0FBR0EsTUFBTUEsQ0FBQ0E7WUFDMUJBLENBQUNBO1lBQ0RBLEVBQUVBLENBQUNBLENBQUNBLEtBQUtBLENBQUNBLENBQUNBLENBQUNBO2dCQUNWQSxLQUFLQSxHQUFHQSxDQUFDQSxLQUFLQSxHQUFHQSxLQUFLQSxHQUFHQSxHQUFHQSxHQUFHQSxFQUFFQSxDQUFDQSxHQUFHQSxRQUFRQSxHQUFHQSxLQUFLQSxDQUFDQTtZQUN4REEsQ0FBQ0E7WUFDREEsSUFBSUEsUUFBUUEsR0FBR0EsUUFBUUEsSUFBSUEsTUFBTUEsQ0FBQ0E7WUFDbENBLElBQUlBLENBQUNBLEtBQUtBLENBQUNBLFVBQVVBLENBQUNBLElBQUlBLENBQUNBLFNBQVNBLEVBQUVBLFFBQVFBLEVBQUVBLElBQUlBLENBQUNBLEVBQUVBLEtBQUtBLEVBQzFEQSxVQUFDQSxJQUFJQSxFQUFFQSxNQUFNQSxFQUFFQSxPQUFPQSxFQUFFQSxNQUFNQTtnQkFDNUJBLEVBQUVBLENBQUNBLElBQUlBLENBQUNBLENBQUNBO1lBQ1hBLENBQUNBLENBQUNBLENBQUNBO1FBQ1BBLENBQUNBO1FBRU1KLHNDQUFVQSxHQUFqQkEsVUFBa0JBLFFBQWVBLEVBQUVBLEVBQUVBO1lBQ25DSyxJQUFJQSxLQUFLQSxHQUFHQSxJQUFJQSxDQUFDQTtZQUNqQkEsSUFBSUEsQ0FBQ0EsS0FBS0EsQ0FBQ0EsVUFBVUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsWUFBWUEsRUFBRUEsUUFBUUEsQ0FBQ0EsRUFBRUEsS0FBS0EsRUFDdkRBLFVBQUNBLElBQUlBLEVBQUVBLE1BQU1BLEVBQUVBLE9BQU9BLEVBQUVBLE1BQU1BO2dCQUM1QkEsRUFBRUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0E7WUFDWEEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7UUFDUEEsQ0FBQ0E7UUFFTUwsc0NBQVVBLEdBQWpCQSxVQUFrQkEsUUFBZUEsRUFBRUEsRUFBRUE7WUFDbkNNLElBQUlBLEtBQUtBLEdBQUdBLElBQUlBLENBQUNBO1lBQ2pCQSxJQUFJQSxDQUFDQSxLQUFLQSxDQUFDQSxVQUFVQSxDQUFDQSxJQUFJQSxDQUFDQSxZQUFZQSxFQUFFQSxRQUFRQSxDQUFDQSxFQUFFQSxLQUFLQSxFQUN2REEsVUFBQ0EsSUFBSUEsRUFBRUEsTUFBTUEsRUFBRUEsT0FBT0EsRUFBRUEsTUFBTUE7Z0JBQzVCQSxFQUFFQSxDQUFDQSxJQUFJQSxDQUFDQSxDQUFDQTtZQUNYQSxDQUFDQSxDQUFDQSxDQUFDQTtRQUNQQSxDQUFDQTtRQWFNTixnQ0FBSUEsR0FBWEEsVUFBWUEsUUFBZUEsRUFBRUEsWUFBbUJBLEVBQUVBLElBQVdBLEVBQUVBLEVBQUVBO1lBQy9ETyxJQUFJQSxLQUFLQSxHQUFHQSxJQUFJQSxDQUFDQTtZQUNqQkEsSUFBSUEsTUFBTUEsR0FBUUEsS0FBS0EsQ0FBQ0EsZ0JBQWdCQSxFQUFFQSxDQUFDQTtZQUMzQ0EsTUFBTUEsQ0FBQ0EsaUJBQWlCQSxHQUFHQSxVQUFDQSxJQUFJQSxFQUFFQSxhQUFhQSxFQUFFQSxNQUFNQTtnQkFDckRBLFFBQUdBLENBQUNBLElBQUlBLENBQUNBLGlCQUFpQkEsR0FBR0EsSUFBSUEsQ0FBQ0EsQ0FBQ0E7Z0JBQ25DQSxNQUFNQSxDQUFDQSxJQUFJQSxDQUFDQTtZQUNkQSxDQUFDQSxDQUFDQTtZQUNGQSxJQUFJQSxDQUFDQSxLQUFLQSxDQUFDQSxVQUFVQSxDQUFDQSxJQUFJQSxDQUFDQSxNQUFNQSxFQUFFQSxRQUFRQSxFQUFFQSxZQUFZQSxFQUFFQSxJQUFJQSxDQUFDQSxFQUFFQSxLQUFLQSxFQUNyRUEsVUFBQ0EsSUFBSUEsRUFBRUEsTUFBTUEsRUFBRUEsT0FBT0EsRUFBRUEsTUFBTUE7Z0JBQzVCQSxJQUFJQSxPQUFPQSxHQUFHQTtvQkFDWkEsSUFBSUEsRUFBRUEsSUFBSUE7b0JBQ1ZBLE1BQU1BLEVBQUVBLE1BQU1BO29CQUNkQSxTQUFTQSxFQUFFQSxLQUFLQTtpQkFDakJBLENBQUNBO2dCQUNGQSxFQUFFQSxDQUFDQSxPQUFPQSxDQUFDQSxDQUFDQTtZQUNkQSxDQUFDQSxFQUNEQSxJQUFJQSxFQUFFQSxNQUFNQSxDQUFDQSxDQUFDQTtRQUNsQkEsQ0FBQ0E7UUFVTVAsb0NBQVFBLEdBQWZBLFVBQWdCQSxFQUFFQTtZQUNoQlEsSUFBSUEsS0FBS0EsR0FBR0EsSUFBSUEsQ0FBQ0E7WUFDakJBLElBQUlBLENBQUNBLEtBQUtBLENBQUNBLGNBQWNBLEVBQUVBLEtBQUtBLEVBQzlCQSxVQUFDQSxJQUFJQSxFQUFFQSxNQUFNQSxFQUFFQSxPQUFPQSxFQUFFQSxNQUFNQTtnQkFDNUJBLEVBQUVBLENBQUNBLElBQUlBLENBQUNBLENBQUNBO1lBQ1hBLENBQUNBLENBQUNBLENBQUNBO1FBQ1BBLENBQUNBO1FBRU1SLGtDQUFNQSxHQUFiQSxVQUFjQSxNQUFhQSxFQUFFQSxJQUFXQSxFQUFFQSxFQUFFQTtZQUMxQ1MsSUFBSUEsTUFBTUEsR0FBR0EsS0FBS0EsQ0FBQ0E7WUFDbkJBLElBQUlBLENBQUNBLE9BQU9BLENBQUNBLE1BQU1BLEVBQUVBLElBQUlBLEVBQUVBLElBQUlBLEVBQUVBLFVBQUNBLElBQUlBO2dCQUNwQ0EsRUFBRUEsQ0FBQ0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsU0FBU0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7b0JBQ25CQSxFQUFFQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSxRQUFRQSxDQUFDQSxNQUFNQSxDQUFDQSxDQUFDQSxDQUFDQTt3QkFDekJBLE1BQU1BLEdBQUdBLElBQUlBLENBQUNBO29CQUNoQkEsQ0FBQ0E7Z0JBQ0hBLENBQUNBO2dCQUFDQSxJQUFJQSxDQUFDQSxDQUFDQTtvQkFDTkEsTUFBTUEsR0FBR0EsSUFBSUEsQ0FBQ0E7Z0JBQ2hCQSxDQUFDQTtnQkFDREEsUUFBR0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsU0FBU0EsR0FBR0EsSUFBSUEsR0FBR0EsWUFBWUEsR0FBR0EsTUFBTUEsQ0FBQ0EsQ0FBQ0E7Z0JBQ25EQSxFQUFFQSxDQUFDQSxDQUFDQSxPQUFPQSxDQUFDQSxVQUFVQSxDQUFDQSxFQUFFQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtvQkFDM0JBLEVBQUVBLENBQUNBLE1BQU1BLENBQUNBLENBQUNBO2dCQUNiQSxDQUFDQTtZQUNIQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUNIQSxNQUFNQSxDQUFDQSxNQUFNQSxDQUFDQTtRQUNoQkEsQ0FBQ0E7UUFFTVQsb0NBQVFBLEdBQWZBLFVBQWdCQSxNQUFhQSxFQUFFQSxRQUFlQSxFQUFFQSxRQUFlQSxFQUFFQSxhQUFvQkEsRUFBRUEsRUFBRUE7WUFDdkZVLEVBQUVBLENBQUNBLENBQUNBLENBQUNBLGFBQWFBLENBQUNBLENBQUNBLENBQUNBO2dCQUNuQkEsYUFBYUEsR0FBR0EsWUFBWUEsR0FBR0EsUUFBUUEsR0FBR0EsVUFBVUEsR0FBR0EsQ0FBQ0EsUUFBUUEsSUFBSUEsTUFBTUEsQ0FBQ0EsQ0FBQ0E7WUFDOUVBLENBQUNBO1lBQ0RBLElBQUlBLEtBQUtBLEdBQUdBLElBQUlBLENBQUNBO1lBQ2pCQSxFQUFFQSxDQUFDQSxDQUFDQSxNQUFNQSxDQUFDQSxDQUFDQSxDQUFDQTtnQkFDWEEsS0FBS0EsR0FBR0EsTUFBTUEsR0FBR0EsTUFBTUEsQ0FBQ0E7WUFDMUJBLENBQUNBO1lBQ0RBLEVBQUVBLENBQUNBLENBQUNBLGFBQWFBLENBQUNBLENBQUNBLENBQUNBO2dCQUNsQkEsS0FBS0EsR0FBR0EsQ0FBQ0EsS0FBS0EsR0FBR0EsS0FBS0EsR0FBR0EsR0FBR0EsR0FBR0EsRUFBRUEsQ0FBQ0EsR0FBR0EsVUFBVUEsR0FBR0Esa0JBQWtCQSxDQUFDQSxhQUFhQSxDQUFDQSxDQUFDQTtZQUN0RkEsQ0FBQ0E7WUFDREEsSUFBSUEsSUFBSUEsR0FBR0EsRUFBRUEsQ0FBQ0E7WUFDZEEsSUFBSUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsVUFBVUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsUUFBUUEsRUFBRUEsUUFBUUEsRUFBRUEsUUFBUUEsSUFBSUEsR0FBR0EsQ0FBQ0EsRUFBRUEsS0FBS0EsRUFBRUEsSUFBSUEsRUFDM0VBLFVBQUNBLElBQUlBLEVBQUVBLE1BQU1BLEVBQUVBLE9BQU9BLEVBQUVBLE1BQU1BO2dCQUM1QkEsRUFBRUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0E7WUFDWEEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7UUFDUEEsQ0FBQ0E7UUFFTVYsa0NBQU1BLEdBQWJBLFVBQWNBLE1BQWFBLEVBQUVBLE9BQWNBLEVBQUdBLE9BQWNBLEVBQUVBLGFBQW9CQSxFQUFFQSxFQUFFQTtZQUNwRlcsRUFBRUEsQ0FB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QU1BLENBQUNBLENBQUNBLGVBQWVBLENBQUNBLEdBQUdBLGVBQWVBLEdBQUdBLElBQUlBLEdBQUdBLElBQUlBLENBQUNBO1FBQzNEQSxDQUFDQTtRQUVNbEIsc0NBQVVBLEdBQWpCQSxVQUFrQkEsSUFBV0E7WUFDM0JtQixNQUFNQSxDQUFDQSxJQUFJQSxDQUFDQSxXQUFXQSxDQUFDQSxJQUFJQSxDQUFDQSxPQUFPQSxDQUFDQSxJQUFJQSxDQUFDQSxFQUFFQSxHQUFHQSxDQUFDQSxDQUFDQTtRQUNuREEsQ0FBQ0E7UUFZTW5CLHNDQUFVQSxHQUFqQkEsVUFBa0JBLFFBQWVBLEVBQUVBLFFBQWVBLEVBQUVBLEVBQUVBO1FBU3REb0IsQ0FBQ0E7UUFjTXBCLDZDQUFpQkEsR0FBeEJBLFVBQXlCQSxJQUFXQSxFQUFFQSxZQUFtQkEsRUFBRUEsTUFBYUEsRUFBRUEsRUFBRUE7UUFTNUVxQixDQUFDQTtRQUdNckIsK0JBQUdBLEdBQVZBO1FBUUFzQixDQUFDQTtRQUNIdEIsd0JBQUNBO0lBQURBLENBL1hBeEYsQUErWEN3RixJQUFBeEY7SUEvWFlBLHNCQUFpQkEsR0FBakJBLGlCQStYWkEsQ0FBQUE7QUFDSEEsQ0FBQ0EsRUFyWU0sSUFBSSxLQUFKLElBQUksUUFxWVY7O0FDeFlELElBQU8sSUFBSSxDQU1WO0FBTkQsV0FBTyxJQUFJLEVBQUMsQ0FBQztJQUVBQSx1QkFBa0JBLEdBQUdBLFlBQU9BLENBQUNBLFVBQVVBLENBQUNBLHlCQUF5QkEsRUFBRUEsQ0FBQ0EsUUFBUUEsRUFBRUEsUUFBUUEsRUFBRUEsY0FBY0EsRUFBRUEsVUFBQ0EsTUFBTUEsRUFBRUEsTUFBTUEsRUFBRUEsWUFBWUE7SUFFaEpBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO0FBRU5BLENBQUNBLEVBTk0sSUFBSSxLQUFKLElBQUksUUFNViIsImZpbGUiOiJjb21waWxlZC5qcyIsInNvdXJjZXNDb250ZW50IjpbbnVsbCwiLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vaW5jbHVkZXMudHNcIi8+XG5tb2R1bGUgRm9yZ2Uge1xuXG4gIGV4cG9ydCB2YXIgY29udGV4dCA9ICcvd29ya3NwYWNlcy86bmFtZXNwYWNlL2ZvcmdlJztcblxuICBleHBvcnQgdmFyIGhhc2ggPSAnIycgKyBjb250ZXh0O1xuICBleHBvcnQgdmFyIHBsdWdpbk5hbWUgPSAnRm9yZ2UnO1xuICBleHBvcnQgdmFyIHBsdWdpblBhdGggPSAncGx1Z2lucy9mb3JnZS8nO1xuICBleHBvcnQgdmFyIHRlbXBsYXRlUGF0aCA9IHBsdWdpblBhdGggKyAnaHRtbC8nO1xuICBleHBvcnQgdmFyIGxvZzpMb2dnaW5nLkxvZ2dlciA9IExvZ2dlci5nZXQocGx1Z2luTmFtZSk7XG5cbiAgZXhwb3J0IHZhciBkZWZhdWx0SWNvblVybCA9IENvcmUudXJsKFwiL2ltZy9mb3JnZS5zdmdcIik7XG5cbiAgZXhwb3J0IHZhciBnb2dzU2VydmljZU5hbWUgPSBLdWJlcm5ldGVzLmdvZ3NTZXJ2aWNlTmFtZTtcbiAgZXhwb3J0IHZhciBvcmlvblNlcnZpY2VOYW1lID0gXCJvcmlvblwiO1xuXG4gIGV4cG9ydCB2YXIgbG9nZ2VkSW5Ub0dvZ3MgPSBmYWxzZTtcblxuICBleHBvcnQgZnVuY3Rpb24gaXNGb3JnZSh3b3Jrc3BhY2UpIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiBpbml0U2NvcGUoJHNjb3BlLCAkbG9jYXRpb24sICRyb3V0ZVBhcmFtcykge1xuICAgICRzY29wZS5wcm9qZWN0SWQgPSAkcm91dGVQYXJhbXNbXCJwcm9qZWN0XCJdO1xuICAgICRzY29wZS4kd29ya3NwYWNlTGluayA9IERldmVsb3Blci53b3Jrc3BhY2VMaW5rKCk7XG4gICAgJHNjb3BlLiRwcm9qZWN0TGluayA9IERldmVsb3Blci5wcm9qZWN0TGluaygkc2NvcGUucHJvamVjdElkKTtcbiAgICAkc2NvcGUuYnJlYWRjcnVtYkNvbmZpZyA9IERldmVsb3Blci5jcmVhdGVQcm9qZWN0QnJlYWRjcnVtYnMoJHNjb3BlLnByb2plY3RJZCk7XG4gICAgJHNjb3BlLnN1YlRhYkNvbmZpZyA9IERldmVsb3Blci5jcmVhdGVQcm9qZWN0U3ViTmF2QmFycygkc2NvcGUucHJvamVjdElkKTtcbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiBjb21tYW5kTGluayhwcm9qZWN0SWQsIG5hbWUsIHJlc291cmNlUGF0aCkge1xuICAgIHZhciBsaW5rID0gRGV2ZWxvcGVyLnByb2plY3RMaW5rKHByb2plY3RJZCk7XG4gICAgaWYgKG5hbWUpIHtcbiAgICAgIGlmIChyZXNvdXJjZVBhdGgpIHtcbiAgICAgICAgcmV0dXJuIFVybEhlbHBlcnMuam9pbihsaW5rLCBcIi9mb3JnZS9jb21tYW5kXCIsIG5hbWUsIHJlc291cmNlUGF0aCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gVXJsSGVscGVycy5qb2luKGxpbmssIFwiL2ZvcmdlL2NvbW1hbmQvXCIsIG5hbWUpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiBjb21tYW5kc0xpbmsocmVzb3VyY2VQYXRoLCBwcm9qZWN0SWQpIHtcbiAgICB2YXIgbGluayA9IERldmVsb3Blci5wcm9qZWN0TGluayhwcm9qZWN0SWQpO1xuICAgIGlmIChyZXNvdXJjZVBhdGgpIHtcbiAgICAgIHJldHVybiBVcmxIZWxwZXJzLmpvaW4obGluaywgXCIvZm9yZ2UvY29tbWFuZHMvdXNlclwiLCByZXNvdXJjZVBhdGgpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gVXJsSGVscGVycy5qb2luKGxpbmssIFwiL2ZvcmdlL2NvbW1hbmRzXCIpO1xuICAgIH1cbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiByZXBvc0FwaVVybChGb3JnZUFwaVVSTCkge1xuICAgIHJldHVybiBVcmxIZWxwZXJzLmpvaW4oRm9yZ2VBcGlVUkwsIFwiL3JlcG9zXCIpO1xuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIHJlcG9BcGlVcmwoRm9yZ2VBcGlVUkwsIHBhdGgpIHtcbiAgICByZXR1cm4gVXJsSGVscGVycy5qb2luKEZvcmdlQXBpVVJMLCBcIi9yZXBvcy91c2VyXCIsIHBhdGgpO1xuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIGNvbW1hbmRBcGlVcmwoRm9yZ2VBcGlVUkwsIGNvbW1hbmRJZCwgcmVzb3VyY2VQYXRoID0gbnVsbCkge1xuICAgIHJldHVybiBVcmxIZWxwZXJzLmpvaW4oRm9yZ2VBcGlVUkwsIFwiY29tbWFuZFwiLCBjb21tYW5kSWQsIHJlc291cmNlUGF0aCk7XG4gIH1cblxuICBleHBvcnQgZnVuY3Rpb24gZXhlY3V0ZUNvbW1hbmRBcGlVcmwoRm9yZ2VBcGlVUkwsIGNvbW1hbmRJZCkge1xuICAgIHJldHVybiBVcmxIZWxwZXJzLmpvaW4oRm9yZ2VBcGlVUkwsIFwiY29tbWFuZFwiLCBcImV4ZWN1dGVcIiwgY29tbWFuZElkKTtcbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiB2YWxpZGF0ZUNvbW1hbmRBcGlVcmwoRm9yZ2VBcGlVUkwsIGNvbW1hbmRJZCkge1xuICAgIHJldHVybiBVcmxIZWxwZXJzLmpvaW4oRm9yZ2VBcGlVUkwsIFwiY29tbWFuZFwiLCBcInZhbGlkYXRlXCIsIGNvbW1hbmRJZCk7XG4gIH1cblxuICBleHBvcnQgZnVuY3Rpb24gY29tbWFuZElucHV0QXBpVXJsKEZvcmdlQXBpVVJMLCBjb21tYW5kSWQsIHJlc291cmNlUGF0aCkge1xuICAgIHJldHVybiBVcmxIZWxwZXJzLmpvaW4oRm9yZ2VBcGlVUkwsIFwiY29tbWFuZElucHV0XCIsIGNvbW1hbmRJZCwgcmVzb3VyY2VQYXRoKTtcbiAgfVxuXG5cblxuICAvKipcbiAgICogUmV0dXJucyB0aGUgcHJvamVjdCBmb3IgdGhlIGdpdmVuIHJlc291cmNlIHBhdGhcbiAgICovXG4gIGZ1bmN0aW9uIG1vZGVsUHJvamVjdChGb3JnZU1vZGVsLCByZXNvdXJjZVBhdGgpIHtcbiAgICBpZiAocmVzb3VyY2VQYXRoKSB7XG4gICAgICB2YXIgcHJvamVjdCA9IEZvcmdlTW9kZWwucHJvamVjdHNbcmVzb3VyY2VQYXRoXTtcbiAgICAgIGlmICghcHJvamVjdCkge1xuICAgICAgICBwcm9qZWN0ID0ge307XG4gICAgICAgIEZvcmdlTW9kZWwucHJvamVjdHNbcmVzb3VyY2VQYXRoXSA9IHByb2plY3Q7XG4gICAgICB9XG4gICAgICByZXR1cm4gcHJvamVjdDtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIEZvcmdlTW9kZWwucm9vdFByb2plY3Q7XG4gICAgfVxuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIHNldE1vZGVsQ29tbWFuZHMoRm9yZ2VNb2RlbCwgcmVzb3VyY2VQYXRoLCBjb21tYW5kcykge1xuICAgIHZhciBwcm9qZWN0ID0gbW9kZWxQcm9qZWN0KEZvcmdlTW9kZWwsIHJlc291cmNlUGF0aCk7XG4gICAgcHJvamVjdC4kY29tbWFuZHMgPSBjb21tYW5kcztcbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiBnZXRNb2RlbENvbW1hbmRzKEZvcmdlTW9kZWwsIHJlc291cmNlUGF0aCkge1xuICAgIHZhciBwcm9qZWN0ID0gbW9kZWxQcm9qZWN0KEZvcmdlTW9kZWwsIHJlc291cmNlUGF0aCk7XG4gICAgcmV0dXJuIHByb2plY3QuJGNvbW1hbmRzIHx8IFtdO1xuICB9XG5cbiAgZnVuY3Rpb24gbW9kZWxDb21tYW5kSW5wdXRNYXAoRm9yZ2VNb2RlbCwgcmVzb3VyY2VQYXRoKSB7XG4gICAgdmFyIHByb2plY3QgPSBtb2RlbFByb2plY3QoRm9yZ2VNb2RlbCwgcmVzb3VyY2VQYXRoKTtcbiAgICB2YXIgY29tbWFuZElucHV0cyA9IHByb2plY3QuJGNvbW1hbmRJbnB1dHM7XG4gICAgaWYgKCFjb21tYW5kSW5wdXRzKSB7XG4gICAgICBjb21tYW5kSW5wdXRzID0ge307XG4gICAgICBwcm9qZWN0LiRjb21tYW5kSW5wdXRzID0gY29tbWFuZElucHV0cztcbiAgICB9XG4gICAgcmV0dXJuIGNvbW1hbmRJbnB1dHM7XG4gIH1cblxuICBleHBvcnQgZnVuY3Rpb24gZ2V0TW9kZWxDb21tYW5kSW5wdXRzKEZvcmdlTW9kZWwsIHJlc291cmNlUGF0aCwgaWQpIHtcbiAgICB2YXIgY29tbWFuZElucHV0cyA9IG1vZGVsQ29tbWFuZElucHV0TWFwKEZvcmdlTW9kZWwsIHJlc291cmNlUGF0aCk7XG4gICAgcmV0dXJuIGNvbW1hbmRJbnB1dHNbaWRdO1xuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIHNldE1vZGVsQ29tbWFuZElucHV0cyhGb3JnZU1vZGVsLCByZXNvdXJjZVBhdGgsIGlkLCBpdGVtKSB7XG4gICAgdmFyIGNvbW1hbmRJbnB1dHMgPSBtb2RlbENvbW1hbmRJbnB1dE1hcChGb3JnZU1vZGVsLCByZXNvdXJjZVBhdGgpO1xuICAgIHJldHVybiBjb21tYW5kSW5wdXRzW2lkXSA9IGl0ZW07XG4gIH1cblxuICBleHBvcnQgZnVuY3Rpb24gZW5yaWNoUmVwbyhyZXBvKSB7XG4gICAgdmFyIG93bmVyID0gcmVwby5vd25lciB8fCB7fTtcbiAgICB2YXIgdXNlciA9IG93bmVyLnVzZXJuYW1lIHx8IHJlcG8udXNlcjtcbiAgICB2YXIgbmFtZSA9IHJlcG8ubmFtZTtcbiAgICB2YXIgcHJvamVjdElkID0gbmFtZTtcbiAgICB2YXIgYXZhdGFyX3VybCA9IG93bmVyLmF2YXRhcl91cmw7XG4gICAgaWYgKGF2YXRhcl91cmwgJiYgYXZhdGFyX3VybC5zdGFydHNXaXRoKFwiaHR0cC8vXCIpKSB7XG4gICAgICBhdmF0YXJfdXJsID0gXCJodHRwOi8vXCIgKyBhdmF0YXJfdXJsLnN1YnN0cmluZyg2KTtcbiAgICAgIG93bmVyLmF2YXRhcl91cmwgPSBhdmF0YXJfdXJsO1xuICAgIH1cbiAgICBpZiAodXNlciAmJiBuYW1lKSB7XG4gICAgICB2YXIgcmVzb3VyY2VQYXRoID0gdXNlciArIFwiL1wiICsgbmFtZTtcbiAgICAgIHJlcG8uJGNvbW1hbmRzTGluayA9IGNvbW1hbmRzTGluayhyZXNvdXJjZVBhdGgsIHByb2plY3RJZCk7XG4gICAgICByZXBvLiRidWlsZHNMaW5rID0gXCIva3ViZXJuZXRlcy9idWlsZHM/cT0vXCIgKyByZXNvdXJjZVBhdGggKyBcIi5naXRcIjtcbiAgICAgIHZhciBpbmplY3RvciA9IEhhd3Rpb0NvcmUuaW5qZWN0b3I7XG4gICAgICBpZiAoaW5qZWN0b3IpIHtcbiAgICAgICAgdmFyIFNlcnZpY2VSZWdpc3RyeSA9IGluamVjdG9yLmdldChcIlNlcnZpY2VSZWdpc3RyeVwiKTtcbiAgICAgICAgaWYgKFNlcnZpY2VSZWdpc3RyeSkge1xuICAgICAgICAgIHZhciBvcmlvbkxpbmsgPSBTZXJ2aWNlUmVnaXN0cnkuc2VydmljZUxpbmsob3Jpb25TZXJ2aWNlTmFtZSk7XG4gICAgICAgICAgdmFyIGdvZ3NTZXJ2aWNlID0gU2VydmljZVJlZ2lzdHJ5LmZpbmRTZXJ2aWNlKGdvZ3NTZXJ2aWNlTmFtZSk7XG4gICAgICAgICAgaWYgKG9yaW9uTGluayAmJiBnb2dzU2VydmljZSkge1xuICAgICAgICAgICAgdmFyIHBvcnRhbElwID0gZ29nc1NlcnZpY2UucG9ydGFsSVA7XG4gICAgICAgICAgICBpZiAocG9ydGFsSXApIHtcbiAgICAgICAgICAgICAgdmFyIHBvcnQgPSBnb2dzU2VydmljZS5wb3J0O1xuICAgICAgICAgICAgICB2YXIgcG9ydFRleHQgPSAocG9ydCAmJiBwb3J0ICE9PSA4MCAmJiBwb3J0ICE9PSA0NDMpID8gXCI6XCIgKyBwb3J0IDogXCJcIjtcbiAgICAgICAgICAgICAgdmFyIHByb3RvY29sID0gKHBvcnQgJiYgcG9ydCA9PT0gNDQzKSA/IFwiaHR0cHM6Ly9cIiA6IFwiaHR0cDovL1wiO1xuICAgICAgICAgICAgICB2YXIgZ2l0Q2xvbmVVcmwgPSBVcmxIZWxwZXJzLmpvaW4ocHJvdG9jb2wgKyBwb3J0YWxJcCArIHBvcnRUZXh0ICsgXCIvXCIsIHJlc291cmNlUGF0aCArIFwiLmdpdFwiKTtcblxuICAgICAgICAgICAgICByZXBvLiRvcGVuUHJvamVjdExpbmsgPSBVcmxIZWxwZXJzLmpvaW4ob3Jpb25MaW5rLFxuICAgICAgICAgICAgICAgIFwiL2dpdC9naXQtcmVwb3NpdG9yeS5odG1sIyxjcmVhdGVQcm9qZWN0Lm5hbWU9XCIgKyBuYW1lICsgXCIsY2xvbmVHaXQ9XCIgKyBnaXRDbG9uZVVybCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZUh0dHBDb25maWcoKSB7XG4gICAgdmFyIGF1dGhIZWFkZXIgPSBsb2NhbFN0b3JhZ2VbXCJnb2dzQXV0aG9yaXphdGlvblwiXTtcbiAgICB2YXIgZW1haWwgPSBsb2NhbFN0b3JhZ2VbXCJnb2dzRW1haWxcIl07XG4gICAgdmFyIGNvbmZpZyA9IHtcbiAgICAgIGhlYWRlcnM6IHtcbiAgICAgIH1cbi8qXG4gICAgICBoZWFkZXJzOiB7XG4gICAgICAgIEF1dGhvcml6YXRpb246IGF1dGhIZWFkZXIsXG4gICAgICAgIEVtYWlsOiBlbWFpbFxuICAgICAgfVxuKi9cbiAgICB9O1xuICAgIHJldHVybiBjb25maWc7XG4gIH1cblxuICBmdW5jdGlvbiBhZGRRdWVyeUFyZ3VtZW50KHVybCwgbmFtZSwgdmFsdWUpIHtcbiAgICBpZiAodXJsICYmIG5hbWUgJiYgdmFsdWUpIHtcbiAgICAgIHZhciBzZXAgPSAgKHVybC5pbmRleE9mKFwiP1wiKSA+PSAwKSA/IFwiJlwiIDogXCI/XCI7XG4gICAgICByZXR1cm4gdXJsICsgc2VwICsgIG5hbWUgKyBcIj1cIiArIGVuY29kZVVSSUNvbXBvbmVudCh2YWx1ZSk7XG4gICAgfVxuICAgIHJldHVybiB1cmw7XG4gIH1cblxuICBleHBvcnQgZnVuY3Rpb24gY3JlYXRlSHR0cFVybCh1cmwsIGF1dGhIZWFkZXIgPSBudWxsLCBlbWFpbCA9IG51bGwpIHtcbiAgICBhdXRoSGVhZGVyID0gYXV0aEhlYWRlciB8fCBsb2NhbFN0b3JhZ2VbXCJnb2dzQXV0aG9yaXphdGlvblwiXTtcbiAgICBlbWFpbCA9IGVtYWlsIHx8IGxvY2FsU3RvcmFnZVtcImdvZ3NFbWFpbFwiXTtcblxuICAgIHVybCA9IGFkZFF1ZXJ5QXJndW1lbnQodXJsLCBcIl9nb2dzQXV0aFwiLCBhdXRoSGVhZGVyKTtcbiAgICB1cmwgPSBhZGRRdWVyeUFyZ3VtZW50KHVybCwgXCJfZ29nc0VtYWlsXCIsIGVtYWlsKTtcbiAgICByZXR1cm4gdXJsO1xuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIGNvbW1hbmRNYXRjaGVzVGV4dChjb21tYW5kLCBmaWx0ZXJUZXh0KSB7XG4gICAgaWYgKGZpbHRlclRleHQpIHtcbiAgICAgIHJldHVybiBDb3JlLm1hdGNoRmlsdGVySWdub3JlQ2FzZShhbmd1bGFyLnRvSnNvbihjb21tYW5kKSwgZmlsdGVyVGV4dCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiBpc0xvZ2dlZEludG9Hb2dzKCkge1xuICAgIHZhciBsb2NhbFN0b3JhZ2UgPSBLdWJlcm5ldGVzLmluamVjdChcImxvY2FsU3RvcmFnZVwiKSB8fCB7fTtcbiAgICB2YXIgYXV0aEhlYWRlciA9IGxvY2FsU3RvcmFnZVtcImdvZ3NBdXRob3JpemF0aW9uXCJdO1xuICAgIC8vcmV0dXJuIGF1dGhIZWFkZXIgPyBsb2dnZWRJblRvR29ncyA6IGZhbHNlO1xuICAgIHJldHVybiBhdXRoSGVhZGVyID8gdHJ1ZSA6IGZhbHNlO1xuLypcbiAgICB2YXIgY29uZmlnID0gY3JlYXRlSHR0cENvbmZpZygpO1xuICAgIHJldHVybiBjb25maWcuaGVhZGVycy5BdXRob3JpemF0aW9uID8gdHJ1ZSA6IGZhbHNlO1xuKi9cbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiByZWRpcmVjdFRvR29nc0xvZ2luSWZSZXF1aXJlZCgkc2NvcGUsICRsb2NhdGlvbikge1xuICAgIGlmICghaXNMb2dnZWRJbnRvR29ncygpKSB7XG4gICAgICB2YXIgZGV2TGluayA9IERldmVsb3Blci5wcm9qZWN0TGluaygkc2NvcGUucHJvamVjdElkKTtcbiAgICAgIHZhciBsb2dpblBhZ2UgPSBVcmxIZWxwZXJzLmpvaW4oZGV2TGluaywgXCJmb3JnZS9yZXBvc1wiKTtcbiAgICAgIGxvZy5pbmZvKFwiTm90IGxvZ2dlZCBpbiBzbyByZWRpcmVjdGluZyB0byBcIiArIGxvZ2luUGFnZSk7XG4gICAgICAkbG9jYXRpb24ucGF0aChsb2dpblBhZ2UpXG4gICAgfVxuICB9XG59XG4iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vaW5jbHVkZXMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiZm9yZ2VIZWxwZXJzLnRzXCIvPlxuXG5tb2R1bGUgRm9yZ2Uge1xuXG4gIGV4cG9ydCB2YXIgX21vZHVsZSA9IGFuZ3VsYXIubW9kdWxlKHBsdWdpbk5hbWUsIFsnaGF3dGlvLWNvcmUnLCAnaGF3dGlvLXVpJ10pO1xuICBleHBvcnQgdmFyIGNvbnRyb2xsZXIgPSBQbHVnaW5IZWxwZXJzLmNyZWF0ZUNvbnRyb2xsZXJGdW5jdGlvbihfbW9kdWxlLCBwbHVnaW5OYW1lKTtcbiAgZXhwb3J0IHZhciByb3V0ZSA9IFBsdWdpbkhlbHBlcnMuY3JlYXRlUm91dGluZ0Z1bmN0aW9uKHRlbXBsYXRlUGF0aCk7XG5cbiAgX21vZHVsZS5jb25maWcoWyckcm91dGVQcm92aWRlcicsICgkcm91dGVQcm92aWRlcjpuZy5yb3V0ZS5JUm91dGVQcm92aWRlcikgPT4ge1xuXG4gICAgY29uc29sZS5sb2coXCJMaXN0ZW5pbmcgb246IFwiICsgVXJsSGVscGVycy5qb2luKGNvbnRleHQsICcvY3JlYXRlUHJvamVjdCcpKTtcblxuICAgICRyb3V0ZVByb3ZpZGVyLndoZW4oVXJsSGVscGVycy5qb2luKGNvbnRleHQsICcvY3JlYXRlUHJvamVjdCcpLCByb3V0ZSgnY3JlYXRlUHJvamVjdC5odG1sJywgZmFsc2UpKVxuICAgICAgLndoZW4oVXJsSGVscGVycy5qb2luKGNvbnRleHQsICcvcmVwb3MvOnBhdGgqJyksIHJvdXRlKCdyZXBvLmh0bWwnLCBmYWxzZSkpXG4gICAgICAud2hlbihVcmxIZWxwZXJzLmpvaW4oY29udGV4dCwgJy9yZXBvcycpLCByb3V0ZSgncmVwb3MuaHRtbCcsIGZhbHNlKSk7XG5cbiAgICBhbmd1bGFyLmZvckVhY2goW2NvbnRleHQsICcvd29ya3NwYWNlcy86bmFtZXNwYWNlL3Byb2plY3RzLzpwcm9qZWN0L2ZvcmdlJ10sIChwYXRoKSA9PiB7XG4gICAgICAkcm91dGVQcm92aWRlclxuICAgICAgICAud2hlbihVcmxIZWxwZXJzLmpvaW4ocGF0aCwgJy9jb21tYW5kcycpLCByb3V0ZSgnY29tbWFuZHMuaHRtbCcsIGZhbHNlKSlcbiAgICAgICAgLndoZW4oVXJsSGVscGVycy5qb2luKHBhdGgsICcvY29tbWFuZHMvOnBhdGgqJyksIHJvdXRlKCdjb21tYW5kcy5odG1sJywgZmFsc2UpKVxuICAgICAgICAud2hlbihVcmxIZWxwZXJzLmpvaW4ocGF0aCwgJy9jb21tYW5kLzppZCcpLCByb3V0ZSgnY29tbWFuZC5odG1sJywgZmFsc2UpKVxuICAgICAgICAud2hlbihVcmxIZWxwZXJzLmpvaW4ocGF0aCwgJy9jb21tYW5kLzppZC86cGF0aConKSwgcm91dGUoJ2NvbW1hbmQuaHRtbCcsIGZhbHNlKSk7XG4gICAgfSk7XG5cbiAgfV0pO1xuXG4gIF9tb2R1bGUuZmFjdG9yeSgnRm9yZ2VBcGlVUkwnLCBbJyRxJywgJyRyb290U2NvcGUnLCAoJHE6bmcuSVFTZXJ2aWNlLCAkcm9vdFNjb3BlOm5nLklSb290U2NvcGVTZXJ2aWNlKSA9PiB7XG4gICAgcmV0dXJuIEt1YmVybmV0ZXMua3ViZXJuZXRlc0FwaVVybCgpICsgXCIvcHJveHlcIiArIEt1YmVybmV0ZXMua3ViZXJuZXRlc05hbWVzcGFjZVBhdGgoKSArIFwiL3NlcnZpY2VzL2ZhYnJpYzgtZm9yZ2UvYXBpL2ZvcmdlXCI7XG4gIH1dKTtcblxuXG4gIF9tb2R1bGUuZmFjdG9yeSgnRm9yZ2VNb2RlbCcsIFsnJHEnLCAnJHJvb3RTY29wZScsICgkcTpuZy5JUVNlcnZpY2UsICRyb290U2NvcGU6bmcuSVJvb3RTY29wZVNlcnZpY2UpID0+IHtcbiAgICByZXR1cm4ge1xuICAgICAgcm9vdFByb2plY3Q6IHt9LFxuICAgICAgcHJvamVjdHM6IFtdXG4gICAgfVxuICB9XSk7XG5cbiAgX21vZHVsZS5ydW4oWyd2aWV3UmVnaXN0cnknLCAnSGF3dGlvTmF2JywgKHZpZXdSZWdpc3RyeSwgSGF3dGlvTmF2KSA9PiB7XG4gICAgdmlld1JlZ2lzdHJ5Wydmb3JnZSddID0gdGVtcGxhdGVQYXRoICsgJ2xheW91dEZvcmdlLmh0bWwnO1xuICB9XSk7XG5cbiAgaGF3dGlvUGx1Z2luTG9hZGVyLmFkZE1vZHVsZShwbHVnaW5OYW1lKTtcbn1cbiIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9pbmNsdWRlcy50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJmb3JnZUhlbHBlcnMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiZm9yZ2VQbHVnaW4udHNcIi8+XG5cbm1vZHVsZSBGb3JnZSB7XG5cbiAgZXhwb3J0IHZhciBDb21tYW5kQ29udHJvbGxlciA9IGNvbnRyb2xsZXIoXCJDb21tYW5kQ29udHJvbGxlclwiLFxuICAgIFtcIiRzY29wZVwiLCBcIiR0ZW1wbGF0ZUNhY2hlXCIsIFwiJGxvY2F0aW9uXCIsIFwiJHJvdXRlUGFyYW1zXCIsIFwiJGh0dHBcIiwgXCIkdGltZW91dFwiLCBcIkZvcmdlQXBpVVJMXCIsIFwiRm9yZ2VNb2RlbFwiLFxuICAgICAgKCRzY29wZSwgJHRlbXBsYXRlQ2FjaGU6bmcuSVRlbXBsYXRlQ2FjaGVTZXJ2aWNlLCAkbG9jYXRpb246bmcuSUxvY2F0aW9uU2VydmljZSwgJHJvdXRlUGFyYW1zLCAkaHR0cCwgJHRpbWVvdXQsIEZvcmdlQXBpVVJMLCBGb3JnZU1vZGVsKSA9PiB7XG5cbiAgICAgICAgJHNjb3BlLm1vZGVsID0gRm9yZ2VNb2RlbDtcblxuICAgICAgICAkc2NvcGUucmVzb3VyY2VQYXRoID0gJHJvdXRlUGFyYW1zW1wicGF0aFwiXSB8fCAkbG9jYXRpb24uc2VhcmNoKClbXCJwYXRoXCJdIHx8IFwiXCI7XG4gICAgICAgICRzY29wZS5pZCA9ICRyb3V0ZVBhcmFtc1tcImlkXCJdO1xuICAgICAgICAkc2NvcGUucGF0aCA9ICRyb3V0ZVBhcmFtc1tcInBhdGhcIl07XG5cbiAgICAgICAgJHNjb3BlLmF2YXRhcl91cmwgPSBsb2NhbFN0b3JhZ2VbXCJnb2dzQXZhdGFyVXJsXCJdO1xuICAgICAgICAkc2NvcGUudXNlciA9IGxvY2FsU3RvcmFnZVtcImdvZ3NVc2VyXCJdO1xuICAgICAgICAkc2NvcGUucmVwb05hbWUgPSBcIlwiO1xuICAgICAgICB2YXIgcGF0aFN0ZXBzID0gJHNjb3BlLnJlc291cmNlUGF0aC5zcGxpdChcIi9cIik7XG4gICAgICAgIGlmIChwYXRoU3RlcHMgJiYgcGF0aFN0ZXBzLmxlbmd0aCkge1xuICAgICAgICAgICRzY29wZS5yZXBvTmFtZSA9IHBhdGhTdGVwc1twYXRoU3RlcHMubGVuZ3RoIC0gMV07XG4gICAgICAgIH1cblxuXG4gICAgICAgIGluaXRTY29wZSgkc2NvcGUsICRsb2NhdGlvbiwgJHJvdXRlUGFyYW1zKTtcbiAgICAgICAgcmVkaXJlY3RUb0dvZ3NMb2dpbklmUmVxdWlyZWQoJHNjb3BlLCAkbG9jYXRpb24pO1xuXG4gICAgICAgICRzY29wZS4kY29tcGxldGVMaW5rID0gJHNjb3BlLiRwcm9qZWN0TGluaztcbiAgICAgICAgaWYgKCRzY29wZS5wcm9qZWN0SWQpIHtcblxuICAgICAgICB9XG4gICAgICAgICRzY29wZS5jb21tYW5kc0xpbmsgPSBjb21tYW5kc0xpbmsoJHNjb3BlLnJlc291cmNlUGF0aCwgJHNjb3BlLnByb2plY3RJZCk7XG4gICAgICAgICRzY29wZS5jb21wbGV0ZWRMaW5rID0gJHNjb3BlLnByb2plY3RJZCA/IFVybEhlbHBlcnMuam9pbigkc2NvcGUuJHByb2plY3RMaW5rLCBcImVudmlyb25tZW50c1wiKSA6ICRzY29wZS4kcHJvamVjdExpbms7XG5cbiAgICAgICAgJHNjb3BlLmVudGl0eSA9IHtcbiAgICAgICAgfTtcbiAgICAgICAgJHNjb3BlLmlucHV0TGlzdCA9IFskc2NvcGUuZW50aXR5XTtcblxuICAgICAgICAkc2NvcGUuc2NoZW1hID0gZ2V0TW9kZWxDb21tYW5kSW5wdXRzKEZvcmdlTW9kZWwsICRzY29wZS5yZXNvdXJjZVBhdGgsICRzY29wZS5pZCk7XG4gICAgICAgIG9uU2NoZW1hTG9hZCgpO1xuXG4gICAgICAgIGZ1bmN0aW9uIG9uUm91dGVDaGFuZ2VkKCkge1xuICAgICAgICAgIGNvbnNvbGUubG9nKFwicm91dGUgdXBkYXRlZDsgbGV0cyBjbGVhciB0aGUgZW50aXR5XCIpO1xuICAgICAgICAgICRzY29wZS5lbnRpdHkgPSB7XG4gICAgICAgICAgfTtcbiAgICAgICAgICAkc2NvcGUuaW5wdXRMaXN0ID0gWyRzY29wZS5lbnRpdHldO1xuICAgICAgICAgICRzY29wZS5wcmV2aW91c1NjaGVtYUpzb24gPSBcIlwiO1xuICAgICAgICAgICRzY29wZS5zY2hlbWEgPSBudWxsO1xuICAgICAgICAgIENvcmUuJGFwcGx5KCRzY29wZSk7XG4gICAgICAgICAgdXBkYXRlRGF0YSgpO1xuICAgICAgICB9XG5cbiAgICAgICAgJHNjb3BlLiRvbignJHJvdXRlQ2hhbmdlU3VjY2VzcycsIG9uUm91dGVDaGFuZ2VkKTtcblxuICAgICAgICAkc2NvcGUuZXhlY3V0ZSA9ICgpID0+IHtcbiAgICAgICAgICAvLyBUT0RPIGNoZWNrIGlmIHZhbGlkLi4uXG4gICAgICAgICAgJHNjb3BlLnJlc3BvbnNlID0gbnVsbDtcbiAgICAgICAgICAkc2NvcGUuZXhlY3V0aW5nID0gdHJ1ZTtcbiAgICAgICAgICAkc2NvcGUuaW52YWxpZCA9IGZhbHNlO1xuICAgICAgICAgICRzY29wZS52YWxpZGF0aW9uRXJyb3IgPSBudWxsO1xuICAgICAgICAgIHZhciBjb21tYW5kSWQgPSAkc2NvcGUuaWQ7XG4gICAgICAgICAgdmFyIHJlc291cmNlUGF0aCA9ICRzY29wZS5yZXNvdXJjZVBhdGg7XG4gICAgICAgICAgdmFyIHVybCA9IGV4ZWN1dGVDb21tYW5kQXBpVXJsKEZvcmdlQXBpVVJMLCBjb21tYW5kSWQpO1xuICAgICAgICAgIHZhciByZXF1ZXN0ID0ge1xuICAgICAgICAgICAgcmVzb3VyY2U6IHJlc291cmNlUGF0aCxcbiAgICAgICAgICAgIGlucHV0TGlzdDogJHNjb3BlLmlucHV0TGlzdFxuICAgICAgICAgIH07XG4gICAgICAgICAgdXJsID0gY3JlYXRlSHR0cFVybCh1cmwpO1xuICAgICAgICAgIGxvZy5pbmZvKFwiQWJvdXQgdG8gcG9zdCB0byBcIiArIHVybCArIFwiIHBheWxvYWQ6IFwiICsgYW5ndWxhci50b0pzb24ocmVxdWVzdCkpO1xuICAgICAgICAgICRodHRwLnBvc3QodXJsLCByZXF1ZXN0LCBjcmVhdGVIdHRwQ29uZmlnKCkpLlxuICAgICAgICAgICAgc3VjY2VzcyhmdW5jdGlvbiAoZGF0YSwgc3RhdHVzLCBoZWFkZXJzLCBjb25maWcpIHtcbiAgICAgICAgICAgICAgJHNjb3BlLmV4ZWN1dGluZyA9IGZhbHNlO1xuICAgICAgICAgICAgICAkc2NvcGUuaW52YWxpZCA9IGZhbHNlO1xuICAgICAgICAgICAgICAkc2NvcGUudmFsaWRhdGlvbkVycm9yID0gbnVsbDtcbiAgICAgICAgICAgICAgaWYgKGRhdGEpIHtcbiAgICAgICAgICAgICAgICBkYXRhLm1lc3NhZ2UgPSBkYXRhLm1lc3NhZ2UgfHwgZGF0YS5vdXRwdXQ7XG4gICAgICAgICAgICAgICAgdmFyIHdpemFyZFJlc3VsdHMgPSBkYXRhLndpemFyZFJlc3VsdHM7XG4gICAgICAgICAgICAgICAgaWYgKHdpemFyZFJlc3VsdHMpIHtcbiAgICAgICAgICAgICAgICAgIGFuZ3VsYXIuZm9yRWFjaCh3aXphcmRSZXN1bHRzLnN0ZXBWYWxpZGF0aW9ucywgKHZhbGlkYXRpb24pID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCEkc2NvcGUuaW52YWxpZCAmJiAhdmFsaWRhdGlvbi52YWxpZCkge1xuICAgICAgICAgICAgICAgICAgICAgIHZhciBtZXNzYWdlcyA9IHZhbGlkYXRpb24ubWVzc2FnZXMgfHwgW107XG4gICAgICAgICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2VzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIG1lc3NhZ2UgPSBtZXNzYWdlc1swXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5pbnZhbGlkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLnZhbGlkYXRpb25FcnJvciA9IG1lc3NhZ2UuZGVzY3JpcHRpb247XG4gICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS52YWxpZGF0aW9uSW5wdXQgPSBtZXNzYWdlLmlucHV0TmFtZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgdmFyIHN0ZXBJbnB1dHMgPSB3aXphcmRSZXN1bHRzLnN0ZXBJbnB1dHM7XG4gICAgICAgICAgICAgICAgICBpZiAoc3RlcElucHV0cykge1xuICAgICAgICAgICAgICAgICAgICB2YXIgc2NoZW1hID0gXy5sYXN0KHN0ZXBJbnB1dHMpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoc2NoZW1hKSB7XG4gICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmVudGl0eSA9IHt9O1xuICAgICAgICAgICAgICAgICAgICAgIHVwZGF0ZVNjaGVtYShzY2hlbWEpO1xuICAgICAgICAgICAgICAgICAgICAgIC8vIGxldHMgY29weSBhY3Jvc3MgYW55IGRlZmF1bHQgdmFsdWVzIGZyb20gdGhlIHNjaGVtYVxuICAgICAgICAgICAgICAgICAgICAgIGFuZ3VsYXIuZm9yRWFjaChzY2hlbWFbXCJwcm9wZXJ0aWVzXCJdLCAocHJvcGVydHksIG5hbWUpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciB2YWx1ZSA9IHByb3BlcnR5LnZhbHVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIGxvZy5pbmZvKFwiQWRkaW5nIGVudGl0eS5cIiArIG5hbWUgKyBcIiA9IFwiICsgdmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuZW50aXR5W25hbWVdID0gdmFsdWU7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmlucHV0TGlzdC5wdXNoKCRzY29wZS5lbnRpdHkpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgaWYgKGRhdGEuY2FuTW92ZVRvTmV4dFN0ZXApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGxldHMgY2xlYXIgdGhlIHJlc3BvbnNlIHdlJ3ZlIGFub3RoZXIgd2l6YXJkIHBhZ2UgdG8gZG9cbiAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEgPSBudWxsO1xuICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBvdGhlcndpc2UgaW5kaWNhdGUgdGhhdCB0aGUgd2l6YXJkIGp1c3QgY29tcGxldGVkIGFuZCBsZXRzIGhpZGUgdGhlIGlucHV0IGZvcm1cbiAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS53aXphcmRDb21wbGV0ZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBpZiAoISRzY29wZS5pbnZhbGlkKSB7XG4gICAgICAgICAgICAgICAgJHNjb3BlLnJlc3BvbnNlID0gZGF0YTtcbiAgICAgICAgICAgICAgICB2YXIgc3RhdHVzID0gKChkYXRhIHx8IHt9KS5zdGF0dXMgfHwgXCJcIikudG9TdHJpbmcoKS50b0xvd2VyQ2FzZSgpO1xuICAgICAgICAgICAgICAgICRzY29wZS5yZXNwb25zZUNsYXNzID0gdG9CYWNrZ3JvdW5kU3R5bGUoc3RhdHVzKTtcblxuICAgICAgICAgICAgICAgIHZhciBmdWxsTmFtZSA9ICgoZGF0YSB8fCB7fSkub3V0cHV0UHJvcGVydGllcyB8fCB7fSkuZnVsbE5hbWU7XG4gICAgICAgICAgICAgICAgaWYgKCRzY29wZS5yZXNwb25zZSAmJiBmdWxsTmFtZSAmJiAkc2NvcGUuaWQgPT09ICdwcm9qZWN0LW5ldycpIHtcbiAgICAgICAgICAgICAgICAgICRzY29wZS5yZXNwb25zZSA9IG51bGw7XG4gICAgICAgICAgICAgICAgICAvLyBsZXRzIGZvcndhcmQgdG8gdGhlIGRldm9wcyBlZGl0IHBhZ2VcbiAgICAgICAgICAgICAgICAgIHZhciBwcm9qZWN0SWQgPSBmdWxsTmFtZS5yZXBsYWNlKCcvJywgXCItXCIpO1xuICAgICAgICAgICAgICAgICAgdmFyIGVkaXRQYXRoID0gVXJsSGVscGVycy5qb2luKERldmVsb3Blci5wcm9qZWN0TGluayhwcm9qZWN0SWQpLCBcIi9mb3JnZS9jb21tYW5kL2Rldm9wcy1lZGl0L3VzZXJcIiwgZnVsbE5hbWUpO1xuICAgICAgICAgICAgICAgICAgbG9nLmluZm8oXCJNb3ZpbmcgdG8gdGhlIGRldm9wcyBlZGl0IHBhdGg6IFwiICsgZWRpdFBhdGgpO1xuICAgICAgICAgICAgICAgICAgJGxvY2F0aW9uLnBhdGgoZWRpdFBhdGgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBDb3JlLiRhcHBseSgkc2NvcGUpO1xuICAgICAgICAgICAgfSkuXG4gICAgICAgICAgICBlcnJvcihmdW5jdGlvbiAoZGF0YSwgc3RhdHVzLCBoZWFkZXJzLCBjb25maWcpIHtcbiAgICAgICAgICAgICAgJHNjb3BlLmV4ZWN1dGluZyA9IGZhbHNlO1xuICAgICAgICAgICAgICBsb2cud2FybihcIkZhaWxlZCB0byBsb2FkIFwiICsgdXJsICsgXCIgXCIgKyBkYXRhICsgXCIgXCIgKyBzdGF0dXMpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgJHNjb3BlLiR3YXRjaENvbGxlY3Rpb24oXCJlbnRpdHlcIiwgKCkgPT4ge1xuICAgICAgICAgIHZhbGlkYXRlKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGZ1bmN0aW9uIHVwZGF0ZVNjaGVtYShzY2hlbWEpIHtcbiAgICAgICAgICBpZiAoc2NoZW1hKSB7XG4gICAgICAgICAgICAvLyBsZXRzIHJlbW92ZSB0aGUgdmFsdWVzIHNvIHRoYXQgd2UgY2FuIHByb3Blcmx5IGNoZWNrIHdoZW4gdGhlIHNjaGVtYSByZWFsbHkgZG9lcyBjaGFuZ2VcbiAgICAgICAgICAgIC8vIG90aGVyd2lzZSB0aGUgc2NoZW1hIHdpbGwgY2hhbmdlIGV2ZXJ5IHRpbWUgd2UgdHlwZSBhIGNoYXJhY3RlciA7KVxuICAgICAgICAgICAgdmFyIHNjaGVtYVdpdGhvdXRWYWx1ZXMgPSBhbmd1bGFyLmNvcHkoc2NoZW1hKTtcbiAgICAgICAgICAgIGFuZ3VsYXIuZm9yRWFjaChzY2hlbWFXaXRob3V0VmFsdWVzLnByb3BlcnRpZXMsIChwcm9wZXJ0eSkgPT4ge1xuICAgICAgICAgICAgICBkZWxldGUgcHJvcGVydHlbXCJ2YWx1ZVwiXTtcbiAgICAgICAgICAgICAgZGVsZXRlIHByb3BlcnR5W1wiZW5hYmxlZFwiXTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgdmFyIGpzb24gPSBhbmd1bGFyLnRvSnNvbihzY2hlbWFXaXRob3V0VmFsdWVzKTtcbiAgICAgICAgICAgIGlmIChqc29uICE9PSAkc2NvcGUucHJldmlvdXNTY2hlbWFKc29uKSB7XG4gICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwidXBkYXRlZCBzY2hlbWE6IFwiICsganNvbik7XG4gICAgICAgICAgICAgICRzY29wZS5wcmV2aW91c1NjaGVtYUpzb24gPSBqc29uO1xuICAgICAgICAgICAgICAkc2NvcGUuc2NoZW1hID0gc2NoZW1hO1xuXG4gICAgICAgICAgICAgIGlmICgkc2NvcGUuaWQgPT09IFwicHJvamVjdC1uZXdcIikge1xuICAgICAgICAgICAgICAgIHZhciBlbnRpdHkgPSAkc2NvcGUuZW50aXR5O1xuICAgICAgICAgICAgICAgIC8vIGxldHMgaGlkZSB0aGUgdGFyZ2V0IGxvY2F0aW9uIVxuICAgICAgICAgICAgICAgIHZhciBwcm9wZXJ0aWVzID0gc2NoZW1hLnByb3BlcnRpZXMgfHwge307XG4gICAgICAgICAgICAgICAgdmFyIG92ZXJ3cml0ZSA9IHByb3BlcnRpZXMub3ZlcndyaXRlO1xuICAgICAgICAgICAgICAgIHZhciBjYXRhbG9nID0gcHJvcGVydGllcy5jYXRhbG9nO1xuICAgICAgICAgICAgICAgIHZhciB0YXJnZXRMb2NhdGlvbiA9IHByb3BlcnRpZXMudGFyZ2V0TG9jYXRpb247XG4gICAgICAgICAgICAgICAgaWYgKHRhcmdldExvY2F0aW9uKSB7XG4gICAgICAgICAgICAgICAgICB0YXJnZXRMb2NhdGlvbi5oaWRkZW4gPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgaWYgKG92ZXJ3cml0ZSkge1xuICAgICAgICAgICAgICAgICAgICBvdmVyd3JpdGUuaGlkZGVuID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiaGlkaW5nIHRhcmdldExvY2F0aW9uIVwiKTtcblxuICAgICAgICAgICAgICAgICAgLy8gbGV0cyBkZWZhdWx0IHRoZSB0eXBlXG4gICAgICAgICAgICAgICAgICBpZiAoIWVudGl0eS50eXBlKSB7XG4gICAgICAgICAgICAgICAgICAgIGVudGl0eS50eXBlID0gXCJGcm9tIEFyY2hldHlwZSBDYXRhbG9nXCI7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChjYXRhbG9nKSB7XG4gICAgICAgICAgICAgICAgICBpZiAoIWVudGl0eS5jYXRhbG9nKSB7XG4gICAgICAgICAgICAgICAgICAgIGVudGl0eS5jYXRhbG9nID0gXCJmYWJyaWM4XCI7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gdmFsaWRhdGUoKSB7XG4gICAgICAgICAgaWYgKCRzY29wZS5leGVjdXRpbmcgfHwgJHNjb3BlLnZhbGlkYXRpbmcpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgICAgdmFyIG5ld0pzb24gPSBhbmd1bGFyLnRvSnNvbigkc2NvcGUuZW50aXR5KTtcbiAgICAgICAgICBpZiAobmV3SnNvbiA9PT0gJHNjb3BlLnZhbGlkYXRlZEVudGl0eUpzb24pIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgJHNjb3BlLnZhbGlkYXRlZEVudGl0eUpzb24gPSBuZXdKc29uO1xuICAgICAgICAgIH1cbiAgICAgICAgICB2YXIgY29tbWFuZElkID0gJHNjb3BlLmlkO1xuICAgICAgICAgIHZhciByZXNvdXJjZVBhdGggPSAkc2NvcGUucmVzb3VyY2VQYXRoO1xuICAgICAgICAgIHZhciB1cmwgPSB2YWxpZGF0ZUNvbW1hbmRBcGlVcmwoRm9yZ2VBcGlVUkwsIGNvbW1hbmRJZCk7XG4gICAgICAgICAgLy8gbGV0cyBwdXQgdGhlIGVudGl0eSBpbiB0aGUgbGFzdCBpdGVtIGluIHRoZSBsaXN0XG4gICAgICAgICAgdmFyIGlucHV0TGlzdCA9IFtdLmNvbmNhdCgkc2NvcGUuaW5wdXRMaXN0KTtcbiAgICAgICAgICBpbnB1dExpc3RbaW5wdXRMaXN0Lmxlbmd0aCAtIDFdID0gJHNjb3BlLmVudGl0eTtcbiAgICAgICAgICB2YXIgcmVxdWVzdCA9IHtcbiAgICAgICAgICAgIHJlc291cmNlOiByZXNvdXJjZVBhdGgsXG4gICAgICAgICAgICBpbnB1dExpc3Q6ICRzY29wZS5pbnB1dExpc3RcbiAgICAgICAgICB9O1xuICAgICAgICAgIHVybCA9IGNyZWF0ZUh0dHBVcmwodXJsKTtcbiAgICAgICAgICAvL2xvZy5pbmZvKFwiQWJvdXQgdG8gcG9zdCB0byBcIiArIHVybCArIFwiIHBheWxvYWQ6IFwiICsgYW5ndWxhci50b0pzb24ocmVxdWVzdCkpO1xuICAgICAgICAgICRzY29wZS52YWxpZGF0aW5nID0gdHJ1ZTtcbiAgICAgICAgICAkaHR0cC5wb3N0KHVybCwgcmVxdWVzdCwgY3JlYXRlSHR0cENvbmZpZygpKS5cbiAgICAgICAgICAgIHN1Y2Nlc3MoZnVuY3Rpb24gKGRhdGEsIHN0YXR1cywgaGVhZGVycywgY29uZmlnKSB7XG4gICAgICAgICAgICAgIHRoaXMudmFsaWRhdGlvbiA9IGRhdGE7XG4gICAgICAgICAgICAgIC8vY29uc29sZS5sb2coXCJnb3QgdmFsaWRhdGlvbiBcIiArIGFuZ3VsYXIudG9Kc29uKGRhdGEsIHRydWUpKTtcbiAgICAgICAgICAgICAgdmFyIHdpemFyZFJlc3VsdHMgPSBkYXRhLndpemFyZFJlc3VsdHM7XG4gICAgICAgICAgICAgIGlmICh3aXphcmRSZXN1bHRzKSB7XG4gICAgICAgICAgICAgICAgdmFyIHN0ZXBJbnB1dHMgPSB3aXphcmRSZXN1bHRzLnN0ZXBJbnB1dHM7XG4gICAgICAgICAgICAgICAgaWYgKHN0ZXBJbnB1dHMpIHtcbiAgICAgICAgICAgICAgICAgIHZhciBzY2hlbWEgPSBfLmxhc3Qoc3RlcElucHV0cyk7XG4gICAgICAgICAgICAgICAgICB1cGRhdGVTY2hlbWEoc2NoZW1hKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcblxuICAgICAgICAgICAgICAvKlxuICAgICAgICAgICAgICAgKiBMZXRzIHRocm90dGxlIHRoZSB2YWxpZGF0aW9ucyBzbyB0aGF0IHdlIG9ubHkgZmlyZSBhbm90aGVyIHZhbGlkYXRpb24gYSBsaXR0bGVcbiAgICAgICAgICAgICAgICogYWZ0ZXIgd2UndmUgZ290IGEgcmVwbHkgYW5kIG9ubHkgaWYgdGhlIG1vZGVsIGhhcyBjaGFuZ2VkIHNpbmNlIHRoZW5cbiAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICR0aW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAkc2NvcGUudmFsaWRhdGluZyA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIHZhbGlkYXRlKCk7XG4gICAgICAgICAgICAgIH0sIDIwMCk7XG4gICAgICAgICAgICB9KS5cbiAgICAgICAgICAgIGVycm9yKGZ1bmN0aW9uIChkYXRhLCBzdGF0dXMsIGhlYWRlcnMsIGNvbmZpZykge1xuICAgICAgICAgICAgICAkc2NvcGUuZXhlY3V0aW5nID0gZmFsc2U7XG4gICAgICAgICAgICAgIGxvZy53YXJuKFwiRmFpbGVkIHRvIGxvYWQgXCIgKyB1cmwgKyBcIiBcIiArIGRhdGEgKyBcIiBcIiArIHN0YXR1cyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIHVwZGF0ZURhdGEoKTtcblxuICAgICAgICBmdW5jdGlvbiB0b0JhY2tncm91bmRTdHlsZShzdGF0dXMpIHtcbiAgICAgICAgICBpZiAoIXN0YXR1cykge1xuICAgICAgICAgICAgc3RhdHVzID0gXCJcIjtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHN0YXR1cy5zdGFydHNXaXRoKFwic3VjXCIpKSB7XG4gICAgICAgICAgICByZXR1cm4gXCJiZy1zdWNjZXNzXCI7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiBcImJnLXdhcm5pbmdcIlxuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gdXBkYXRlRGF0YSgpIHtcbiAgICAgICAgICAkc2NvcGUuaXRlbSA9IG51bGw7XG4gICAgICAgICAgdmFyIGNvbW1hbmRJZCA9ICRzY29wZS5pZDtcbiAgICAgICAgICBpZiAoY29tbWFuZElkKSB7XG4gICAgICAgICAgICB2YXIgcmVzb3VyY2VQYXRoID0gJHNjb3BlLnJlc291cmNlUGF0aDtcbiAgICAgICAgICAgIHZhciB1cmwgPSBjb21tYW5kSW5wdXRBcGlVcmwoRm9yZ2VBcGlVUkwsIGNvbW1hbmRJZCwgcmVzb3VyY2VQYXRoKTtcbiAgICAgICAgICAgIHVybCA9IGNyZWF0ZUh0dHBVcmwodXJsKTtcbiAgICAgICAgICAgICRodHRwLmdldCh1cmwsIGNyZWF0ZUh0dHBDb25maWcoKSkuXG4gICAgICAgICAgICAgIHN1Y2Nlc3MoZnVuY3Rpb24gKGRhdGEsIHN0YXR1cywgaGVhZGVycywgY29uZmlnKSB7XG4gICAgICAgICAgICAgICAgaWYgKGRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICRzY29wZS5mZXRjaGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwidXBkYXRlRGF0YSBsb2FkZWQgc2NoZW1hXCIpO1xuICAgICAgICAgICAgICAgICAgdXBkYXRlU2NoZW1hKGRhdGEpO1xuICAgICAgICAgICAgICAgICAgc2V0TW9kZWxDb21tYW5kSW5wdXRzKEZvcmdlTW9kZWwsICRzY29wZS5yZXNvdXJjZVBhdGgsICRzY29wZS5pZCwgJHNjb3BlLnNjaGVtYSk7XG4gICAgICAgICAgICAgICAgICBvblNjaGVtYUxvYWQoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICAgICAgICAgICAgfSkuXG4gICAgICAgICAgICAgIGVycm9yKGZ1bmN0aW9uIChkYXRhLCBzdGF0dXMsIGhlYWRlcnMsIGNvbmZpZykge1xuICAgICAgICAgICAgICAgIGxvZy53YXJuKFwiRmFpbGVkIHRvIGxvYWQgXCIgKyB1cmwgKyBcIiBcIiArIGRhdGEgKyBcIiBcIiArIHN0YXR1cyk7XG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBDb3JlLiRhcHBseSgkc2NvcGUpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIG9uU2NoZW1hTG9hZCgpIHtcbiAgICAgICAgICAvLyBsZXRzIHVwZGF0ZSB0aGUgdmFsdWUgaWYgaXRzIGJsYW5rIHdpdGggdGhlIGRlZmF1bHQgdmFsdWVzIGZyb20gdGhlIHByb3BlcnRpZXNcbiAgICAgICAgICB2YXIgc2NoZW1hID0gJHNjb3BlLnNjaGVtYTtcbiAgICAgICAgICAkc2NvcGUuZmV0Y2hlZCA9IHNjaGVtYTtcbiAgICAgICAgICB2YXIgZW50aXR5ID0gJHNjb3BlLmVudGl0eTtcbiAgICAgICAgICBpZiAoc2NoZW1hKSB7XG4gICAgICAgICAgICBhbmd1bGFyLmZvckVhY2goc2NoZW1hLnByb3BlcnRpZXMsIChwcm9wZXJ0eSwga2V5KSA9PiB7XG4gICAgICAgICAgICAgIHZhciB2YWx1ZSA9IHByb3BlcnR5LnZhbHVlO1xuICAgICAgICAgICAgICBpZiAodmFsdWUgJiYgIWVudGl0eVtrZXldKSB7XG4gICAgICAgICAgICAgICAgZW50aXR5W2tleV0gPSB2YWx1ZTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XSk7XG59XG4iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vaW5jbHVkZXMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiZm9yZ2VQbHVnaW4udHNcIi8+XG5cbm1vZHVsZSBGb3JnZSB7XG5cbiAgZXhwb3J0IHZhciBDb21tYW5kc0NvbnRyb2xsZXIgPSBjb250cm9sbGVyKFwiQ29tbWFuZHNDb250cm9sbGVyXCIsIFtcIiRzY29wZVwiLCBcIiRkaWFsb2dcIiwgXCIkd2luZG93XCIsIFwiJHRlbXBsYXRlQ2FjaGVcIiwgXCIkcm91dGVQYXJhbXNcIiwgXCIkbG9jYXRpb25cIiwgXCJsb2NhbFN0b3JhZ2VcIiwgXCIkaHR0cFwiLCBcIiR0aW1lb3V0XCIsIFwiRm9yZ2VBcGlVUkxcIiwgXCJGb3JnZU1vZGVsXCIsXG4gICAgKCRzY29wZSwgJGRpYWxvZywgJHdpbmRvdywgJHRlbXBsYXRlQ2FjaGUsICRyb3V0ZVBhcmFtcywgJGxvY2F0aW9uOm5nLklMb2NhdGlvblNlcnZpY2UsIGxvY2FsU3RvcmFnZSwgJGh0dHAsICR0aW1lb3V0LCBGb3JnZUFwaVVSTCwgRm9yZ2VNb2RlbCkgPT4ge1xuXG4gICAgICAkc2NvcGUubW9kZWwgPSBGb3JnZU1vZGVsO1xuICAgICAgJHNjb3BlLnJlc291cmNlUGF0aCA9ICRyb3V0ZVBhcmFtc1tcInBhdGhcIl0gfHwgJGxvY2F0aW9uLnNlYXJjaCgpW1wicGF0aFwiXSB8fCBcIlwiO1xuICAgICAgJHNjb3BlLnJlcG9OYW1lID0gXCJcIjtcbiAgICAgICRzY29wZS5wcm9qZWN0RGVzY3JpcHRpb24gPSAkc2NvcGUucmVzb3VyY2VQYXRoIHx8IFwiXCI7XG4gICAgICB2YXIgcGF0aFN0ZXBzID0gJHNjb3BlLnByb2plY3REZXNjcmlwdGlvbi5zcGxpdChcIi9cIik7XG4gICAgICBpZiAocGF0aFN0ZXBzICYmIHBhdGhTdGVwcy5sZW5ndGgpIHtcbiAgICAgICAgJHNjb3BlLnJlcG9OYW1lID0gcGF0aFN0ZXBzW3BhdGhTdGVwcy5sZW5ndGggLSAxXTtcbiAgICAgIH1cbiAgICAgIGlmICghJHNjb3BlLnByb2plY3REZXNjcmlwdGlvbi5zdGFydHNXaXRoKFwiL1wiKSAmJiAkc2NvcGUucHJvamVjdERlc2NyaXB0aW9uLmxlbmd0aCA+IDApIHtcbiAgICAgICAgJHNjb3BlLnByb2plY3REZXNjcmlwdGlvbiA9IFwiL1wiICsgJHNjb3BlLnByb2plY3REZXNjcmlwdGlvbjtcbiAgICAgIH1cblxuICAgICAgJHNjb3BlLmF2YXRhcl91cmwgPSBsb2NhbFN0b3JhZ2VbXCJnb2dzQXZhdGFyVXJsXCJdO1xuICAgICAgJHNjb3BlLnVzZXIgPSBsb2NhbFN0b3JhZ2VbXCJnb2dzVXNlclwiXTtcblxuICAgICAgJHNjb3BlLmNvbW1hbmRzID0gZ2V0TW9kZWxDb21tYW5kcyhGb3JnZU1vZGVsLCAkc2NvcGUucmVzb3VyY2VQYXRoKTtcbiAgICAgICRzY29wZS5mZXRjaGVkID0gJHNjb3BlLmNvbW1hbmRzLmxlbmd0aCAhPT0gMDtcblxuICAgICAgaW5pdFNjb3BlKCRzY29wZSwgJGxvY2F0aW9uLCAkcm91dGVQYXJhbXMpO1xuICAgICAgcmVkaXJlY3RUb0dvZ3NMb2dpbklmUmVxdWlyZWQoJHNjb3BlLCAkbG9jYXRpb24pO1xuXG5cbiAgICAgICRzY29wZS50YWJsZUNvbmZpZyA9IHtcbiAgICAgICAgZGF0YTogJ2NvbW1hbmRzJyxcbiAgICAgICAgc2hvd1NlbGVjdGlvbkNoZWNrYm94OiB0cnVlLFxuICAgICAgICBlbmFibGVSb3dDbGlja1NlbGVjdGlvbjogZmFsc2UsXG4gICAgICAgIG11bHRpU2VsZWN0OiB0cnVlLFxuICAgICAgICBzZWxlY3RlZEl0ZW1zOiBbXSxcbiAgICAgICAgZmlsdGVyT3B0aW9uczoge1xuICAgICAgICAgIGZpbHRlclRleHQ6ICRsb2NhdGlvbi5zZWFyY2goKVtcInFcIl0gfHwgJydcbiAgICAgICAgfSxcbiAgICAgICAgY29sdW1uRGVmczogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIGZpZWxkOiAnbmFtZScsXG4gICAgICAgICAgICBkaXNwbGF5TmFtZTogJ05hbWUnLFxuICAgICAgICAgICAgY2VsbFRlbXBsYXRlOiAkdGVtcGxhdGVDYWNoZS5nZXQoXCJpZFRlbXBsYXRlLmh0bWxcIilcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIGZpZWxkOiAnZGVzY3JpcHRpb24nLFxuICAgICAgICAgICAgZGlzcGxheU5hbWU6ICdEZXNjcmlwdGlvbidcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIGZpZWxkOiAnY2F0ZWdvcnknLFxuICAgICAgICAgICAgZGlzcGxheU5hbWU6ICdDYXRlZ29yeSdcbiAgICAgICAgICB9XG4gICAgICAgIF1cbiAgICAgIH07XG5cbiAgICAgIGZ1bmN0aW9uIGNvbW1hbmRNYXRjaGVzKGNvbW1hbmQpIHtcbiAgICAgICAgdmFyIGZpbHRlclRleHQgPSAkc2NvcGUudGFibGVDb25maWcuZmlsdGVyT3B0aW9ucy5maWx0ZXJUZXh0O1xuICAgICAgICByZXR1cm4gY29tbWFuZE1hdGNoZXNUZXh0KGNvbW1hbmQsIGZpbHRlclRleHQpO1xuICAgICAgfVxuXG4gICAgICAkc2NvcGUuY29tbWFuZFNlbGVjdG9yID0ge1xuICAgICAgICBmaWx0ZXJUZXh0OiBcIlwiLFxuICAgICAgICBmb2xkZXJzOiBbXSxcbiAgICAgICAgc2VsZWN0ZWRDb21tYW5kczogW10sXG4gICAgICAgIGV4cGFuZGVkRm9sZGVyczoge30sXG5cbiAgICAgICAgaXNPcGVuOiAoZm9sZGVyKSA9PiB7XG4gICAgICAgICAgdmFyIGZpbHRlclRleHQgPSAkc2NvcGUudGFibGVDb25maWcuZmlsdGVyT3B0aW9ucy5maWx0ZXJUZXh0O1xuICAgICAgICAgIGlmIChmaWx0ZXJUZXh0ICE9PSAnJyB8fCAkc2NvcGUuY29tbWFuZFNlbGVjdG9yLmV4cGFuZGVkRm9sZGVyc1tmb2xkZXIuaWRdKSB7XG4gICAgICAgICAgICByZXR1cm4gXCJvcGVuZWRcIjtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIFwiY2xvc2VkXCI7XG4gICAgICAgIH0sXG5cbiAgICAgICAgY2xlYXJTZWxlY3RlZDogKCkgPT4ge1xuICAgICAgICAgICRzY29wZS5jb21tYW5kU2VsZWN0b3IuZXhwYW5kZWRGb2xkZXJzID0ge307XG4gICAgICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICAgICAgfSxcblxuICAgICAgICB1cGRhdGVTZWxlY3RlZDogKCkgPT4ge1xuICAgICAgICAgIC8vIGxldHMgdXBkYXRlIHRoZSBzZWxlY3RlZCBhcHBzXG4gICAgICAgICAgdmFyIHNlbGVjdGVkQ29tbWFuZHMgPSBbXTtcbiAgICAgICAgICBhbmd1bGFyLmZvckVhY2goJHNjb3BlLm1vZGVsLmFwcEZvbGRlcnMsIChmb2xkZXIpID0+IHtcbiAgICAgICAgICAgIHZhciBhcHBzID0gZm9sZGVyLmFwcHMuZmlsdGVyKChhcHApID0+IGFwcC5zZWxlY3RlZCk7XG4gICAgICAgICAgICBpZiAoYXBwcykge1xuICAgICAgICAgICAgICBzZWxlY3RlZENvbW1hbmRzID0gc2VsZWN0ZWRDb21tYW5kcy5jb25jYXQoYXBwcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgJHNjb3BlLmNvbW1hbmRTZWxlY3Rvci5zZWxlY3RlZENvbW1hbmRzID0gc2VsZWN0ZWRDb21tYW5kcy5zb3J0QnkoXCJuYW1lXCIpO1xuICAgICAgICB9LFxuXG4gICAgICAgIHNlbGVjdDogKGNvbW1hbmQsIGZsYWcpID0+IHtcbiAgICAgICAgICB2YXIgaWQgPSBjb21tYW5kLm5hbWU7XG4vKlxuICAgICAgICAgIGFwcC5zZWxlY3RlZCA9IGZsYWc7XG4qL1xuICAgICAgICAgICRzY29wZS5jb21tYW5kU2VsZWN0b3IudXBkYXRlU2VsZWN0ZWQoKTtcbiAgICAgICAgfSxcblxuICAgICAgICBnZXRTZWxlY3RlZENsYXNzOiAoYXBwKSA9PiB7XG4gICAgICAgICAgaWYgKGFwcC5hYnN0cmFjdCkge1xuICAgICAgICAgICAgcmV0dXJuIFwiYWJzdHJhY3RcIjtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKGFwcC5zZWxlY3RlZCkge1xuICAgICAgICAgICAgcmV0dXJuIFwic2VsZWN0ZWRcIjtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIFwiXCI7XG4gICAgICAgIH0sXG5cbiAgICAgICAgc2hvd0NvbW1hbmQ6IChjb21tYW5kKSA9PiB7XG4gICAgICAgICAgcmV0dXJuIGNvbW1hbmRNYXRjaGVzKGNvbW1hbmQpO1xuICAgICAgICB9LFxuXG4gICAgICAgIHNob3dGb2xkZXI6IChmb2xkZXIpID0+IHtcbiAgICAgICAgICB2YXIgZmlsdGVyVGV4dCA9ICRzY29wZS50YWJsZUNvbmZpZy5maWx0ZXJPcHRpb25zLmZpbHRlclRleHQ7XG4gICAgICAgICAgcmV0dXJuICFmaWx0ZXJUZXh0IHx8IGZvbGRlci5jb21tYW5kcy5zb21lKChhcHApID0+IGNvbW1hbmRNYXRjaGVzKGFwcCkpO1xuICAgICAgICB9XG4gICAgICB9O1xuXG5cbiAgICAgIHZhciB1cmwgPSBVcmxIZWxwZXJzLmpvaW4oRm9yZ2VBcGlVUkwsIFwiY29tbWFuZHNcIiwgJHNjb3BlLnJlc291cmNlUGF0aCk7XG4gICAgICB1cmwgPSBjcmVhdGVIdHRwVXJsKHVybCk7XG4gICAgICBsb2cuaW5mbyhcIkZldGNoaW5nIGNvbW1hbmRzIGZyb206IFwiICsgdXJsKTtcbiAgICAgICRodHRwLmdldCh1cmwsIGNyZWF0ZUh0dHBDb25maWcoKSkuXG4gICAgICAgIHN1Y2Nlc3MoZnVuY3Rpb24gKGRhdGEsIHN0YXR1cywgaGVhZGVycywgY29uZmlnKSB7XG4gICAgICAgICAgaWYgKGFuZ3VsYXIuaXNBcnJheShkYXRhKSAmJiBzdGF0dXMgPT09IDIwMCkge1xuICAgICAgICAgICAgdmFyIHJlc291cmNlUGF0aCA9ICRzY29wZS5yZXNvdXJjZVBhdGg7XG4gICAgICAgICAgICB2YXIgZm9sZGVyTWFwID0ge307XG4gICAgICAgICAgICB2YXIgZm9sZGVycyA9IFtdO1xuICAgICAgICAgICAgJHNjb3BlLmNvbW1hbmRzID0gXy5zb3J0QnkoZGF0YSwgXCJuYW1lXCIpO1xuICAgICAgICAgICAgYW5ndWxhci5mb3JFYWNoKCRzY29wZS5jb21tYW5kcywgKGNvbW1hbmQpID0+IHtcbiAgICAgICAgICAgICAgdmFyIGlkID0gY29tbWFuZC5pZCB8fCBjb21tYW5kLm5hbWU7XG4gICAgICAgICAgICAgIGNvbW1hbmQuJGxpbmsgPSBjb21tYW5kTGluaygkc2NvcGUucHJvamVjdElkLCBpZCwgcmVzb3VyY2VQYXRoKTtcblxuICAgICAgICAgICAgICB2YXIgbmFtZSA9IGNvbW1hbmQubmFtZSB8fCBjb21tYW5kLmlkO1xuICAgICAgICAgICAgICB2YXIgZm9sZGVyTmFtZSA9IGNvbW1hbmQuY2F0ZWdvcnk7XG4gICAgICAgICAgICAgIHZhciBzaG9ydE5hbWUgPSBuYW1lO1xuICAgICAgICAgICAgICB2YXIgbmFtZXMgPSBuYW1lLnNwbGl0KFwiOlwiLCAyKTtcbiAgICAgICAgICAgICAgaWYgKG5hbWVzICE9IG51bGwgJiYgbmFtZXMubGVuZ3RoID4gMSkge1xuICAgICAgICAgICAgICAgIGZvbGRlck5hbWUgPSBuYW1lc1swXTtcbiAgICAgICAgICAgICAgICBzaG9ydE5hbWUgPSBuYW1lc1sxXS50cmltKCk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgaWYgKGZvbGRlck5hbWUgPT09IFwiUHJvamVjdC9CdWlsZFwiKSB7XG4gICAgICAgICAgICAgICAgZm9sZGVyTmFtZSA9IFwiUHJvamVjdFwiO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGNvbW1hbmQuJHNob3J0TmFtZSA9IHNob3J0TmFtZTtcbiAgICAgICAgICAgICAgY29tbWFuZC4kZm9sZGVyTmFtZSA9IGZvbGRlck5hbWU7XG4gICAgICAgICAgICAgIHZhciBmb2xkZXIgPSBmb2xkZXJNYXBbZm9sZGVyTmFtZV07XG4gICAgICAgICAgICAgIGlmICghZm9sZGVyKSB7XG4gICAgICAgICAgICAgICAgZm9sZGVyID0ge1xuICAgICAgICAgICAgICAgICAgbmFtZTogZm9sZGVyTmFtZSxcbiAgICAgICAgICAgICAgICAgIGNvbW1hbmRzOiBbXVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgZm9sZGVyTWFwW2ZvbGRlck5hbWVdID0gZm9sZGVyO1xuICAgICAgICAgICAgICAgIGZvbGRlcnMucHVzaChmb2xkZXIpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGZvbGRlci5jb21tYW5kcy5wdXNoKGNvbW1hbmQpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBmb2xkZXJzID0gXy5zb3J0QnkoZm9sZGVycywgXCJuYW1lXCIpO1xuICAgICAgICAgICAgYW5ndWxhci5mb3JFYWNoKGZvbGRlcnMsIChmb2xkZXIpID0+IHtcbiAgICAgICAgICAgICAgZm9sZGVyLmNvbW1hbmRzID0gXy5zb3J0QnkoZm9sZGVyLmNvbW1hbmRzLCBcIiRzaG9ydE5hbWVcIik7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICRzY29wZS5jb21tYW5kU2VsZWN0b3IuZm9sZGVycyA9IGZvbGRlcnM7XG5cbiAgICAgICAgICAgIHNldE1vZGVsQ29tbWFuZHMoJHNjb3BlLm1vZGVsLCAkc2NvcGUucmVzb3VyY2VQYXRoLCAkc2NvcGUuY29tbWFuZHMpO1xuICAgICAgICAgICAgJHNjb3BlLmZldGNoZWQgPSB0cnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgfSkuXG4gICAgICAgIGVycm9yKGZ1bmN0aW9uIChkYXRhLCBzdGF0dXMsIGhlYWRlcnMsIGNvbmZpZykge1xuICAgICAgICAgIGxvZy53YXJuKFwiZmFpbGVkIHRvIGxvYWQgXCIgKyB1cmwgKyBcIi4gc3RhdHVzOiBcIiArIHN0YXR1cyArIFwiIGRhdGE6IFwiICsgZGF0YSk7XG4gICAgICAgIH0pO1xuXG4gICAgfV0pO1xufVxuIiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL2luY2x1ZGVzLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cImZvcmdlSGVscGVycy50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJmb3JnZVBsdWdpbi50c1wiLz5cblxubW9kdWxlIEZvcmdlIHtcblxuICBleHBvcnQgdmFyIFJlcG9Db250cm9sbGVyID0gY29udHJvbGxlcihcIlJlcG9Db250cm9sbGVyXCIsXG4gICAgW1wiJHNjb3BlXCIsIFwiJHRlbXBsYXRlQ2FjaGVcIiwgXCIkbG9jYXRpb25cIiwgXCIkcm91dGVQYXJhbXNcIiwgXCIkaHR0cFwiLCBcIiR0aW1lb3V0XCIsIFwiRm9yZ2VBcGlVUkxcIixcbiAgICAgICgkc2NvcGUsICR0ZW1wbGF0ZUNhY2hlOm5nLklUZW1wbGF0ZUNhY2hlU2VydmljZSwgJGxvY2F0aW9uOm5nLklMb2NhdGlvblNlcnZpY2UsICRyb3V0ZVBhcmFtcywgJGh0dHAsICR0aW1lb3V0LCBGb3JnZUFwaVVSTCkgPT4ge1xuXG4gICAgICAgICRzY29wZS5uYW1lID0gJHJvdXRlUGFyYW1zW1wicGF0aFwiXTtcblxuICAgICAgICBpbml0U2NvcGUoJHNjb3BlLCAkbG9jYXRpb24sICRyb3V0ZVBhcmFtcyk7XG4gICAgICAgIHJlZGlyZWN0VG9Hb2dzTG9naW5JZlJlcXVpcmVkKCRzY29wZSwgJGxvY2F0aW9uKTtcblxuICAgICAgICAkc2NvcGUuJG9uKCckcm91dGVVcGRhdGUnLCAoJGV2ZW50KSA9PiB7XG4gICAgICAgICAgdXBkYXRlRGF0YSgpO1xuICAgICAgICB9KTtcblxuICAgICAgICB1cGRhdGVEYXRhKCk7XG5cbiAgICAgICAgZnVuY3Rpb24gdXBkYXRlRGF0YSgpIHtcbiAgICAgICAgICBpZiAoJHNjb3BlLm5hbWUpIHtcbiAgICAgICAgICAgIHZhciB1cmwgPSByZXBvQXBpVXJsKEZvcmdlQXBpVVJMLCAkc2NvcGUubmFtZSk7XG4gICAgICAgICAgICB1cmwgPSBjcmVhdGVIdHRwVXJsKHVybCk7XG4gICAgICAgICAgICB2YXIgY29uZmlnID0gY3JlYXRlSHR0cENvbmZpZygpO1xuICAgICAgICAgICAgJGh0dHAuZ2V0KHVybCwgY29uZmlnKS5cbiAgICAgICAgICAgICAgc3VjY2VzcyhmdW5jdGlvbiAoZGF0YSwgc3RhdHVzLCBoZWFkZXJzLCBjb25maWcpIHtcbiAgICAgICAgICAgICAgICBpZiAoZGF0YSkge1xuICAgICAgICAgICAgICAgICAgZW5yaWNoUmVwbyhkYXRhKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgJHNjb3BlLmVudGl0eSA9IGRhdGE7XG4gICAgICAgICAgICAgICAgJHNjb3BlLmZldGNoZWQgPSB0cnVlO1xuICAgICAgICAgICAgICB9KS5cbiAgICAgICAgICAgICAgZXJyb3IoZnVuY3Rpb24gKGRhdGEsIHN0YXR1cywgaGVhZGVycywgY29uZmlnKSB7XG4gICAgICAgICAgICAgICAgbG9nLndhcm4oXCJmYWlsZWQgdG8gbG9hZCBcIiArIHVybCArIFwiLiBzdGF0dXM6IFwiICsgc3RhdHVzICsgXCIgZGF0YTogXCIgKyBkYXRhKTtcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICRzY29wZS5mZXRjaGVkID0gdHJ1ZTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1dKTtcbn1cbiIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9pbmNsdWRlcy50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJmb3JnZUhlbHBlcnMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiZm9yZ2VQbHVnaW4udHNcIi8+XG5cbm1vZHVsZSBGb3JnZSB7XG5cbiAgZXhwb3J0IHZhciBSZXBvc0NvbnRyb2xsZXIgPSBjb250cm9sbGVyKFwiUmVwb3NDb250cm9sbGVyXCIsIFtcIiRzY29wZVwiLCBcIiRkaWFsb2dcIiwgXCIkd2luZG93XCIsIFwiJHRlbXBsYXRlQ2FjaGVcIiwgXCIkcm91dGVQYXJhbXNcIiwgXCIkbG9jYXRpb25cIiwgXCJsb2NhbFN0b3JhZ2VcIiwgXCIkaHR0cFwiLCBcIiR0aW1lb3V0XCIsIFwiRm9yZ2VBcGlVUkxcIiwgXCJLdWJlcm5ldGVzTW9kZWxcIiwgXCJTZXJ2aWNlUmVnaXN0cnlcIixcbiAgICAoJHNjb3BlLCAkZGlhbG9nLCAkd2luZG93LCAkdGVtcGxhdGVDYWNoZSwgJHJvdXRlUGFyYW1zLCAkbG9jYXRpb246bmcuSUxvY2F0aW9uU2VydmljZSwgbG9jYWxTdG9yYWdlLCAkaHR0cCwgJHRpbWVvdXQsIEZvcmdlQXBpVVJMLCBLdWJlcm5ldGVzTW9kZWw6IEt1YmVybmV0ZXMuS3ViZXJuZXRlc01vZGVsU2VydmljZSwgU2VydmljZVJlZ2lzdHJ5KSA9PiB7XG5cbiAgICAgICRzY29wZS5tb2RlbCA9IEt1YmVybmV0ZXNNb2RlbDtcbiAgICAgICRzY29wZS5yZXNvdXJjZVBhdGggPSAkcm91dGVQYXJhbXNbXCJwYXRoXCJdO1xuICAgICAgJHNjb3BlLmNvbW1hbmRzTGluayA9IChwYXRoKSA9PiBjb21tYW5kc0xpbmsocGF0aCwgJHNjb3BlLnByb2plY3RJZCk7XG5cbiAgICAgIGluaXRTY29wZSgkc2NvcGUsICRsb2NhdGlvbiwgJHJvdXRlUGFyYW1zKTtcblxuICAgICAgJHNjb3BlLiRvbigna3ViZXJuZXRlc01vZGVsVXBkYXRlZCcsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdXBkYXRlTGlua3MoKTtcbiAgICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICAgIH0pO1xuXG4gICAgICAkc2NvcGUudGFibGVDb25maWcgPSB7XG4gICAgICAgIGRhdGE6ICdwcm9qZWN0cycsXG4gICAgICAgIHNob3dTZWxlY3Rpb25DaGVja2JveDogdHJ1ZSxcbiAgICAgICAgZW5hYmxlUm93Q2xpY2tTZWxlY3Rpb246IGZhbHNlLFxuICAgICAgICBtdWx0aVNlbGVjdDogdHJ1ZSxcbiAgICAgICAgc2VsZWN0ZWRJdGVtczogW10sXG4gICAgICAgIGZpbHRlck9wdGlvbnM6IHtcbiAgICAgICAgICBmaWx0ZXJUZXh0OiAkbG9jYXRpb24uc2VhcmNoKClbXCJxXCJdIHx8ICcnXG4gICAgICAgIH0sXG4gICAgICAgIGNvbHVtbkRlZnM6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICBmaWVsZDogJ25hbWUnLFxuICAgICAgICAgICAgZGlzcGxheU5hbWU6ICdSZXBvc2l0b3J5IE5hbWUnLFxuICAgICAgICAgICAgY2VsbFRlbXBsYXRlOiAkdGVtcGxhdGVDYWNoZS5nZXQoXCJyZXBvVGVtcGxhdGUuaHRtbFwiKVxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgZmllbGQ6ICdhY3Rpb25zJyxcbiAgICAgICAgICAgIGRpc3BsYXlOYW1lOiAnQWN0aW9ucycsXG4gICAgICAgICAgICBjZWxsVGVtcGxhdGU6ICR0ZW1wbGF0ZUNhY2hlLmdldChcInJlcG9BY3Rpb25zVGVtcGxhdGUuaHRtbFwiKVxuICAgICAgICAgIH1cbiAgICAgICAgXVxuICAgICAgfTtcblxuICAgICAgJHNjb3BlLmxvZ2luID0ge1xuICAgICAgICBhdXRoSGVhZGVyOiBsb2NhbFN0b3JhZ2VbXCJnb2dzQXV0aG9yaXphdGlvblwiXSB8fCBcIlwiLFxuICAgICAgICByZWxvZ2luOiBmYWxzZSxcbiAgICAgICAgYXZhdGFyX3VybDogbG9jYWxTdG9yYWdlW1wiZ29nc0F2YXRhclVybFwiXSB8fCBcIlwiLFxuICAgICAgICB1c2VyOiBsb2NhbFN0b3JhZ2VbXCJnb2dzVXNlclwiXSB8fCBcIlwiLFxuICAgICAgICBwYXNzd29yZDogXCJcIixcbiAgICAgICAgZW1haWw6IGxvY2FsU3RvcmFnZVtcImdvZ3NFbWFpbFwiXSB8fCBcIlwiXG4gICAgICB9O1xuXG4gICAgICAkc2NvcGUuZG9Mb2dpbiA9ICgpID0+IHtcbiAgICAgICAgdmFyIGxvZ2luID0gJHNjb3BlLmxvZ2luO1xuICAgICAgICB2YXIgdXNlciA9IGxvZ2luLnVzZXI7XG4gICAgICAgIHZhciBwYXNzd29yZCA9IGxvZ2luLnBhc3N3b3JkO1xuICAgICAgICBpZiAodXNlciAmJiBwYXNzd29yZCkge1xuICAgICAgICAgIHZhciB1c2VyUHdkID0gdXNlciArICc6JyArIHBhc3N3b3JkO1xuICAgICAgICAgIGxvZ2luLmF1dGhIZWFkZXIgPSAnQmFzaWMgJyArICh1c2VyUHdkLmVuY29kZUJhc2U2NCgpKTtcbiAgICAgICAgICB1cGRhdGVEYXRhKCk7XG4gICAgICAgIH1cbiAgICAgIH07XG5cbiAgICAgICRzY29wZS5sb2dvdXQgPSAoKSA9PiB7XG4gICAgICAgIGRlbGV0ZSBsb2NhbFN0b3JhZ2VbXCJnb2dzQXV0aG9yaXphdGlvblwiXTtcbiAgICAgICAgJHNjb3BlLmxvZ2luLmF1dGhIZWFkZXIgPSBudWxsO1xuICAgICAgICAkc2NvcGUubG9naW4ubG9nZ2VkSW4gPSBmYWxzZTtcbiAgICAgICAgJHNjb3BlLmxvZ2luLmZhaWxlZCA9IGZhbHNlO1xuICAgICAgICBsb2dnZWRJblRvR29ncyA9IGZhbHNlO1xuICAgICAgfTtcblxuXG4gICAgICAkc2NvcGUub3BlbkNvbW1hbmRzID0gKCkgPT4ge1xuICAgICAgICB2YXIgcmVzb3VyY2VQYXRoID0gbnVsbDtcbiAgICAgICAgdmFyIHNlbGVjdGVkID0gJHNjb3BlLnRhYmxlQ29uZmlnLnNlbGVjdGVkSXRlbXM7XG4gICAgICAgIGlmIChfLmlzQXJyYXkoc2VsZWN0ZWQpICYmIHNlbGVjdGVkLmxlbmd0aCkge1xuICAgICAgICAgIHJlc291cmNlUGF0aCA9IHNlbGVjdGVkWzBdLnBhdGg7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGxpbmsgPSBjb21tYW5kc0xpbmsocmVzb3VyY2VQYXRoLCAkc2NvcGUucHJvamVjdElkKTtcbiAgICAgICAgbG9nLmluZm8oXCJtb3ZpbmcgdG8gY29tbWFuZHMgbGluazogXCIgKyBsaW5rKTtcbiAgICAgICAgJGxvY2F0aW9uLnBhdGgobGluayk7XG4gICAgICB9O1xuXG4gICAgICAkc2NvcGUuZGVsZXRlID0gKHByb2plY3RzKSA9PiB7XG4gICAgICAgIFVJLm11bHRpSXRlbUNvbmZpcm1BY3Rpb25EaWFsb2coPFVJLk11bHRpSXRlbUNvbmZpcm1BY3Rpb25PcHRpb25zPntcbiAgICAgICAgICBjb2xsZWN0aW9uOiBwcm9qZWN0cyxcbiAgICAgICAgICBpbmRleDogJ3BhdGgnLFxuICAgICAgICAgIG9uQ2xvc2U6IChyZXN1bHQ6Ym9vbGVhbikgPT4ge1xuICAgICAgICAgICAgaWYgKHJlc3VsdCkge1xuICAgICAgICAgICAgICBkb0RlbGV0ZShwcm9qZWN0cyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSxcbiAgICAgICAgICB0aXRsZTogJ0RlbGV0ZSBwcm9qZWN0cz8nLFxuICAgICAgICAgIGFjdGlvbjogJ1RoZSBmb2xsb3dpbmcgcHJvamVjdHMgd2lsbCBiZSByZW1vdmVkICh0aG91Z2ggdGhlIGZpbGVzIHdpbGwgcmVtYWluIG9uIHlvdXIgZmlsZSBzeXN0ZW0pOicsXG4gICAgICAgICAgb2tUZXh0OiAnRGVsZXRlJyxcbiAgICAgICAgICBva0NsYXNzOiAnYnRuLWRhbmdlcicsXG4gICAgICAgICAgY3VzdG9tOiBcIlRoaXMgb3BlcmF0aW9uIGlzIHBlcm1hbmVudCBvbmNlIGNvbXBsZXRlZCFcIixcbiAgICAgICAgICBjdXN0b21DbGFzczogXCJhbGVydCBhbGVydC13YXJuaW5nXCJcbiAgICAgICAgfSkub3BlbigpO1xuICAgICAgfTtcblxuICAgICAgdXBkYXRlTGlua3MoKTtcblxuICAgICAgZnVuY3Rpb24gZG9EZWxldGUocHJvamVjdHMpIHtcbiAgICAgICAgYW5ndWxhci5mb3JFYWNoKHByb2plY3RzLCAocHJvamVjdCkgPT4ge1xuICAgICAgICAgIGxvZy5pbmZvKFwiRGVsZXRpbmcgXCIgKyBhbmd1bGFyLnRvSnNvbigkc2NvcGUucHJvamVjdHMpKTtcbiAgICAgICAgICB2YXIgcGF0aCA9IHByb2plY3QucGF0aDtcbiAgICAgICAgICBpZiAocGF0aCkge1xuICAgICAgICAgICAgdmFyIHVybCA9IHJlcG9BcGlVcmwoRm9yZ2VBcGlVUkwsIHBhdGgpO1xuICAgICAgICAgICAgJGh0dHAuZGVsZXRlKHVybCkuXG4gICAgICAgICAgICAgIHN1Y2Nlc3MoZnVuY3Rpb24gKGRhdGEsIHN0YXR1cywgaGVhZGVycywgY29uZmlnKSB7XG4gICAgICAgICAgICAgICAgdXBkYXRlRGF0YSgpO1xuICAgICAgICAgICAgICB9KS5cbiAgICAgICAgICAgICAgZXJyb3IoZnVuY3Rpb24gKGRhdGEsIHN0YXR1cywgaGVhZGVycywgY29uZmlnKSB7XG4gICAgICAgICAgICAgICAgbG9nLndhcm4oXCJmYWlsZWQgdG8gbG9hZCBcIiArIHVybCArIFwiLiBzdGF0dXM6IFwiICsgc3RhdHVzICsgXCIgZGF0YTogXCIgKyBkYXRhKTtcbiAgICAgICAgICAgICAgICB2YXIgbWVzc2FnZSA9IFwiRmFpbGVkIHRvIFBPU1QgdG8gXCIgKyB1cmwgKyBcIiBnb3Qgc3RhdHVzOiBcIiArIHN0YXR1cztcbiAgICAgICAgICAgICAgICBDb3JlLm5vdGlmaWNhdGlvbignZXJyb3InLCBtZXNzYWdlKTtcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgZnVuY3Rpb24gdXBkYXRlTGlua3MoKSB7XG4gICAgICAgIHZhciAkZ29nc0xpbmsgPSBTZXJ2aWNlUmVnaXN0cnkuc2VydmljZVJlYWR5TGluayhnb2dzU2VydmljZU5hbWUpO1xuICAgICAgICBpZiAoJGdvZ3NMaW5rKSB7XG4gICAgICAgICAgJHNjb3BlLnNpZ25VcFVybCA9IFVybEhlbHBlcnMuam9pbigkZ29nc0xpbmssIFwidXNlci9zaWduX3VwXCIpO1xuICAgICAgICAgICRzY29wZS5mb3Jnb3RQYXNzd29yZFVybCA9IFVybEhlbHBlcnMuam9pbigkZ29nc0xpbmssIFwidXNlci9mb3JnZXRfcGFzc3dvcmRcIik7XG4gICAgICAgIH1cbiAgICAgICAgJHNjb3BlLiRnb2dzTGluayA9ICRnb2dzTGluaztcbiAgICAgICAgJHNjb3BlLiRmb3JnZUxpbmsgPSBTZXJ2aWNlUmVnaXN0cnkuc2VydmljZVJlYWR5TGluayhLdWJlcm5ldGVzLmZhYnJpYzhGb3JnZVNlcnZpY2VOYW1lKTtcblxuICAgICAgICAkc2NvcGUuJGhhc0NEUGlwZWxpbmVUZW1wbGF0ZSA9IF8uYW55KCRzY29wZS5tb2RlbC50ZW1wbGF0ZXMsICh0KSA9PiBcImNkLXBpcGVsaW5lXCIgPT09IEt1YmVybmV0ZXMuZ2V0TmFtZSh0KSk7XG5cbiAgICAgICAgdmFyIGV4cGVjdGVkUkNTID0gW0t1YmVybmV0ZXMuZ29nc1NlcnZpY2VOYW1lLCBLdWJlcm5ldGVzLmZhYnJpYzhGb3JnZVNlcnZpY2VOYW1lLCBLdWJlcm5ldGVzLmplbmtpbnNTZXJ2aWNlTmFtZV07XG4gICAgICAgIHZhciByZXF1aXJlZFJDcyA9IHt9O1xuICAgICAgICB2YXIgbnMgPSBLdWJlcm5ldGVzLmN1cnJlbnRLdWJlcm5ldGVzTmFtZXNwYWNlKCk7XG4gICAgICAgIHZhciBydW5uaW5nQ0RQaXBlbGluZSA9IHRydWU7XG4gICAgICAgIGFuZ3VsYXIuZm9yRWFjaChleHBlY3RlZFJDUywgKHJjTmFtZSkgPT4ge1xuICAgICAgICAgIHZhciByYyA9ICRzY29wZS5tb2RlbC5nZXRSZXBsaWNhdGlvbkNvbnRyb2xsZXIobnMsIHJjTmFtZSk7XG4gICAgICAgICAgaWYgKHJjKSB7XG4gICAgICAgICAgICByZXF1aXJlZFJDc1tyY05hbWVdID0gcmM7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJ1bm5pbmdDRFBpcGVsaW5lID0gZmFsc2U7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgJHNjb3BlLiRyZXF1aXJlZFJDcyA9IHJlcXVpcmVkUkNzO1xuICAgICAgICAkc2NvcGUuJHJ1bm5pbmdDRFBpcGVsaW5lID0gcnVubmluZ0NEUGlwZWxpbmU7XG4gICAgICAgIHZhciB1cmwgPSBcIlwiO1xuICAgICAgICAkbG9jYXRpb24gPSBLdWJlcm5ldGVzLmluamVjdChcIiRsb2NhdGlvblwiKTtcbiAgICAgICAgaWYgKCRsb2NhdGlvbikge1xuICAgICAgICAgIHVybCA9ICRsb2NhdGlvbi51cmwoKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIXVybCkge1xuICAgICAgICAgIHVybCA9IHdpbmRvdy5sb2NhdGlvbi50b1N0cmluZygpO1xuICAgICAgICB9XG4gICAgICAgIC8vIFRPRE8gc2hvdWxkIHdlIHN1cHBvcnQgYW55IG90aGVyIHRlbXBsYXRlIG5hbWVzcGFjZXM/XG4gICAgICAgIHZhciB0ZW1wbGF0ZU5hbWVzcGFjZSA9IFwiZGVmYXVsdFwiO1xuICAgICAgICAkc2NvcGUuJHJ1bkNEUGlwZWxpbmVMaW5rID0gXCIva3ViZXJuZXRlcy9uYW1lc3BhY2UvXCIgKyB0ZW1wbGF0ZU5hbWVzcGFjZSArIFwiL3RlbXBsYXRlcy9cIiArIG5zICsgXCI/cT1jZC1waXBlbGluZSZyZXR1cm5Ubz1cIiArIGVuY29kZVVSSUNvbXBvbmVudCh1cmwpO1xuICAgICAgfVxuXG4gICAgICBmdW5jdGlvbiB1cGRhdGVEYXRhKCkge1xuICAgICAgICB2YXIgYXV0aEhlYWRlciA9ICRzY29wZS5sb2dpbi5hdXRoSGVhZGVyO1xuICAgICAgICB2YXIgZW1haWwgPSAkc2NvcGUubG9naW4uZW1haWwgfHwgXCJcIjtcbiAgICAgICAgaWYgKGF1dGhIZWFkZXIpIHtcbiAgICAgICAgICB2YXIgdXJsID0gcmVwb3NBcGlVcmwoRm9yZ2VBcGlVUkwpO1xuICAgICAgICAgIHVybCA9IGNyZWF0ZUh0dHBVcmwodXJsLCBhdXRoSGVhZGVyLCBlbWFpbCk7XG4gICAgICAgICAgdmFyIGNvbmZpZyA9IHtcbi8qXG4gICAgICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgICAgIEdvZ3NBdXRob3JpemF0aW9uOiBhdXRoSGVhZGVyLFxuICAgICAgICAgICAgICBHb2dzRW1haWw6IGVtYWlsXG4gICAgICAgICAgICB9XG4qL1xuICAgICAgICAgIH07XG4gICAgICAgICAgJGh0dHAuZ2V0KHVybCwgY29uZmlnKS5cbiAgICAgICAgICAgIHN1Y2Nlc3MoZnVuY3Rpb24gKGRhdGEsIHN0YXR1cywgaGVhZGVycywgY29uZmlnKSB7XG4gICAgICAgICAgICAgICRzY29wZS5sb2dpbi5mYWlsZWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgJHNjb3BlLmxvZ2luLmxvZ2dlZEluID0gdHJ1ZTtcbiAgICAgICAgICAgICAgbG9nZ2VkSW5Ub0dvZ3MgPSB0cnVlO1xuICAgICAgICAgICAgICB2YXIgYXZhdGFyX3VybCA9IG51bGw7XG4gICAgICAgICAgICAgIGlmIChzdGF0dXMgPT09IDIwMCkge1xuICAgICAgICAgICAgICAgIGlmICghZGF0YSB8fCAhYW5ndWxhci5pc0FycmF5KGRhdGEpKSB7XG4gICAgICAgICAgICAgICAgICBkYXRhID0gW107XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIGxldHMgc3RvcmUgYSBzdWNjZXNzZnVsIGxvZ2luIHNvIHRoYXQgd2UgaGlkZSB0aGUgbG9naW4gcGFnZVxuICAgICAgICAgICAgICAgIGxvY2FsU3RvcmFnZVtcImdvZ3NBdXRob3JpemF0aW9uXCJdID0gYXV0aEhlYWRlcjtcbiAgICAgICAgICAgICAgICBsb2NhbFN0b3JhZ2VbXCJnb2dzRW1haWxcIl0gPSBlbWFpbDtcbiAgICAgICAgICAgICAgICBsb2NhbFN0b3JhZ2VbXCJnb2dzVXNlclwiXSA9ICRzY29wZS5sb2dpbi51c2VyIHx8IFwiXCI7XG5cbiAgICAgICAgICAgICAgICAkc2NvcGUucHJvamVjdHMgPSBfLnNvcnRCeShkYXRhLCBcIm5hbWVcIik7XG4gICAgICAgICAgICAgICAgYW5ndWxhci5mb3JFYWNoKCRzY29wZS5wcm9qZWN0cywgKHJlcG8pID0+IHtcbiAgICAgICAgICAgICAgICAgIGVucmljaFJlcG8ocmVwbyk7XG4gICAgICAgICAgICAgICAgICBpZiAoIWF2YXRhcl91cmwpIHtcbiAgICAgICAgICAgICAgICAgICAgYXZhdGFyX3VybCA9IENvcmUucGF0aEdldChyZXBvLCBbXCJvd25lclwiLCBcImF2YXRhcl91cmxcIl0pO1xuICAgICAgICAgICAgICAgICAgICBpZiAoYXZhdGFyX3VybCkge1xuICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5sb2dpbi5hdmF0YXJfdXJsID0gYXZhdGFyX3VybDtcbiAgICAgICAgICAgICAgICAgICAgICBsb2NhbFN0b3JhZ2VbXCJnb2dzQXZhdGFyVXJsXCJdID0gYXZhdGFyX3VybDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICRzY29wZS5mZXRjaGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSkuXG4gICAgICAgICAgICBlcnJvcihmdW5jdGlvbiAoZGF0YSwgc3RhdHVzLCBoZWFkZXJzLCBjb25maWcpIHtcbiAgICAgICAgICAgICAgJHNjb3BlLmxvZ291dCgpO1xuICAgICAgICAgICAgICAkc2NvcGUubG9naW4uZmFpbGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgaWYgKHN0YXR1cyAhPT0gNDAzKSB7XG4gICAgICAgICAgICAgICAgbG9nLndhcm4oXCJmYWlsZWQgdG8gbG9hZCBcIiArIHVybCArIFwiLiBzdGF0dXM6IFwiICsgc3RhdHVzICsgXCIgZGF0YTogXCIgKyBkYXRhKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgdXBkYXRlRGF0YSgpO1xuXG4gICAgfV0pO1xufVxuIiwiLy8vIENvcHlyaWdodCAyMDE0LTIwMTUgUmVkIEhhdCwgSW5jLiBhbmQvb3IgaXRzIGFmZmlsaWF0ZXNcbi8vLyBhbmQgb3RoZXIgY29udHJpYnV0b3JzIGFzIGluZGljYXRlZCBieSB0aGUgQGF1dGhvciB0YWdzLlxuLy8vXG4vLy8gTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbi8vLyB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4vLy8gWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4vLy9cbi8vLyAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuLy8vXG4vLy8gVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuLy8vIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbi8vLyBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbi8vLyBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4vLy8gbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9pbmNsdWRlcy50c1wiLz5cbm1vZHVsZSBNYWluIHtcblxuICBleHBvcnQgdmFyIHBsdWdpbk5hbWUgPSBcImZhYnJpYzgtY29uc29sZVwiO1xuXG4gIGV4cG9ydCB2YXIgbG9nOiBMb2dnaW5nLkxvZ2dlciA9IExvZ2dlci5nZXQocGx1Z2luTmFtZSk7XG5cbiAgZXhwb3J0IHZhciB0ZW1wbGF0ZVBhdGggPSBcInBsdWdpbnMvbWFpbi9odG1sXCI7XG5cbiAgLy8ga3ViZXJuZXRlcyBzZXJ2aWNlIG5hbWVzXG4gIGV4cG9ydCB2YXIgY2hhdFNlcnZpY2VOYW1lID0gXCJsZXRzY2hhdFwiO1xuICBleHBvcnQgdmFyIGdyYWZhbmFTZXJ2aWNlTmFtZSA9IFwiZ3JhZmFuYVwiO1xuICBleHBvcnQgdmFyIGFwcExpYnJhcnlTZXJ2aWNlTmFtZSA9IFwiYXBwLWxpYnJhcnlcIjtcblxuICBleHBvcnQgdmFyIHZlcnNpb246YW55ID0ge307XG5cbn1cbiIsIi8vLyBDb3B5cmlnaHQgMjAxNC0yMDE1IFJlZCBIYXQsIEluYy4gYW5kL29yIGl0cyBhZmZpbGlhdGVzXG4vLy8gYW5kIG90aGVyIGNvbnRyaWJ1dG9ycyBhcyBpbmRpY2F0ZWQgYnkgdGhlIEBhdXRob3IgdGFncy5cbi8vL1xuLy8vIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4vLy8geW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuLy8vIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuLy8vXG4vLy8gICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbi8vL1xuLy8vIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbi8vLyBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4vLy8gV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4vLy8gU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuLy8vIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuXG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vaW5jbHVkZXMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vZm9yZ2UvdHMvZm9yZ2VIZWxwZXJzLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIm1haW5HbG9iYWxzLnRzXCIvPlxuXG5tb2R1bGUgTWFpbiB7XG5cbiAgZXhwb3J0IHZhciBfbW9kdWxlID0gYW5ndWxhci5tb2R1bGUocGx1Z2luTmFtZSwgW0ZvcmdlLnBsdWdpbk5hbWVdKTtcblxuICB2YXIgdGFiID0gdW5kZWZpbmVkO1xuXG4gIF9tb2R1bGUucnVuKCgkcm9vdFNjb3BlLCBIYXd0aW9OYXY6IEhhd3Rpb01haW5OYXYuUmVnaXN0cnksIEt1YmVybmV0ZXNNb2RlbCwgU2VydmljZVJlZ2lzdHJ5LCBwcmVmZXJlbmNlc1JlZ2lzdHJ5KSA9PiB7XG5cbiAgICBIYXd0aW9OYXYub24oSGF3dGlvTWFpbk5hdi5BY3Rpb25zLkNIQU5HRUQsIHBsdWdpbk5hbWUsIChpdGVtcykgPT4ge1xuICAgICAgaXRlbXMuZm9yRWFjaCgoaXRlbSkgPT4ge1xuICAgICAgICBzd2l0Y2goaXRlbS5pZCkge1xuICAgICAgICAgIGNhc2UgJ2ZvcmdlJzpcbiAgICAgICAgICBjYXNlICdqdm0nOlxuICAgICAgICAgIGNhc2UgJ3dpa2knOlxuICAgICAgICAgIGNhc2UgJ2RvY2tlci1yZWdpc3RyeSc6XG4gICAgICAgICAgICBpdGVtLmlzVmFsaWQgPSAoKSA9PiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfSk7XG4gICAgSGF3dGlvTmF2LmFkZCh7XG4gICAgICBpZDogJ2xpYnJhcnknLFxuICAgICAgdGl0bGU6ICgpID0+ICdMaWJyYXJ5JyxcbiAgICAgIHRvb2x0aXA6ICgpID0+ICdWaWV3IHRoZSBsaWJyYXJ5IG9mIGFwcGxpY2F0aW9ucycsXG4gICAgICBpc1ZhbGlkOiAoKSA9PiBTZXJ2aWNlUmVnaXN0cnkuaGFzU2VydmljZShhcHBMaWJyYXJ5U2VydmljZU5hbWUpICYmIFNlcnZpY2VSZWdpc3RyeS5oYXNTZXJ2aWNlKFwiYXBwLWxpYnJhcnktam9sb2tpYVwiKSxcbiAgICAgIGhyZWY6ICgpID0+IFwiL3dpa2kvdmlld1wiLFxuICAgICAgaXNBY3RpdmU6ICgpID0+IGZhbHNlXG4gICAgfSk7XG5cbiAgICB2YXIga2liYW5hU2VydmljZU5hbWUgPSBLdWJlcm5ldGVzLmtpYmFuYVNlcnZpY2VOYW1lO1xuXG4gICAgSGF3dGlvTmF2LmFkZCh7XG4gICAgICBpZDogJ2tpYmFuYScsXG4gICAgICB0aXRsZTogKCkgPT4gICdMb2dzJyxcbiAgICAgIHRvb2x0aXA6ICgpID0+ICdWaWV3IGFuZCBzZWFyY2ggYWxsIGxvZ3MgYWNyb3NzIGFsbCBjb250YWluZXJzIHVzaW5nIEtpYmFuYSBhbmQgRWxhc3RpY1NlYXJjaCcsXG4gICAgICBpc1ZhbGlkOiAoKSA9PiBTZXJ2aWNlUmVnaXN0cnkuaGFzU2VydmljZShraWJhbmFTZXJ2aWNlTmFtZSksXG4gICAgICBocmVmOiAoKSA9PiBLdWJlcm5ldGVzLmtpYmFuYUxvZ3NMaW5rKFNlcnZpY2VSZWdpc3RyeSksXG4gICAgICBpc0FjdGl2ZTogKCkgPT4gZmFsc2VcbiAgICB9KTtcblxuICAgIEhhd3Rpb05hdi5hZGQoe1xuICAgICAgaWQ6ICdhcGltYW4nLFxuICAgICAgdGl0bGU6ICgpID0+ICdBUEkgTWFuYWdlbWVudCcsXG4gICAgICB0b29sdGlwOiAoKSA9PiAnQWRkIFBvbGljaWVzIGFuZCBQbGFucyB0byB5b3VyIEFQSXMgd2l0aCBBcGltYW4nLFxuICAgICAgaXNWYWxpZDogKCkgPT4gU2VydmljZVJlZ2lzdHJ5Lmhhc1NlcnZpY2UoJ2FwaW1hbicpLFxuICAgICAgb2xkSHJlZjogKCkgPT4geyAvKiBub3RoaW5nIHRvIGRvICovIH0sXG4gICAgICBocmVmOiAoKSA9PiB7XG4gICAgICAgIHZhciBoYXNoID0ge1xuICAgICAgICAgIGJhY2tUbzogbmV3IFVSSSgpLnRvU3RyaW5nKCksXG4gICAgICAgICAgdG9rZW46IEhhd3Rpb09BdXRoLmdldE9BdXRoVG9rZW4oKVxuICAgICAgICB9O1xuICAgICAgICB2YXIgdXJpID0gbmV3IFVSSShTZXJ2aWNlUmVnaXN0cnkuc2VydmljZUxpbmsoJ2FwaW1hbicpKTtcbiAgICAgICAgLy8gVE9ETyBoYXZlIHRvIG92ZXJ3cml0ZSB0aGUgcG9ydCBoZXJlIGZvciBzb21lIHJlYXNvblxuICAgICAgICAoPGFueT51cmkucG9ydCgnODAnKS5xdWVyeSh7fSkucGF0aCgnYXBpbWFudWkvaW5kZXguaHRtbCcpKS5oYXNoKFVSSS5lbmNvZGUoYW5ndWxhci50b0pzb24oaGFzaCkpKTtcbiAgICAgICAgcmV0dXJuIHVyaS50b1N0cmluZygpO1xuICAgICAgfSAgICBcbiAgICB9KTtcblxuICAgIEhhd3Rpb05hdi5hZGQoe1xuICAgICAgaWQ6ICdncmFmYW5hJyxcbiAgICAgIHRpdGxlOiAoKSA9PiAgJ01ldHJpY3MnLFxuICAgICAgdG9vbHRpcDogKCkgPT4gJ1ZpZXdzIG1ldHJpY3MgYWNyb3NzIGFsbCBjb250YWluZXJzIHVzaW5nIEdyYWZhbmEgYW5kIEluZmx1eERCJyxcbiAgICAgIGlzVmFsaWQ6ICgpID0+IFNlcnZpY2VSZWdpc3RyeS5oYXNTZXJ2aWNlKGdyYWZhbmFTZXJ2aWNlTmFtZSksXG4gICAgICBocmVmOiAoKSA9PiBTZXJ2aWNlUmVnaXN0cnkuc2VydmljZUxpbmsoZ3JhZmFuYVNlcnZpY2VOYW1lKSxcbiAgICAgIGlzQWN0aXZlOiAoKSA9PiBmYWxzZVxuICAgIH0pO1xuXG4gICAgSGF3dGlvTmF2LmFkZCh7XG4gICAgICBpZDogXCJjaGF0XCIsXG4gICAgICB0aXRsZTogKCkgPT4gICdDaGF0JyxcbiAgICAgIHRvb2x0aXA6ICgpID0+ICdDaGF0IHJvb20gZm9yIGRpc2N1c3NpbmcgdGhpcyBuYW1lc3BhY2UnLFxuICAgICAgaXNWYWxpZDogKCkgPT4gU2VydmljZVJlZ2lzdHJ5Lmhhc1NlcnZpY2UoY2hhdFNlcnZpY2VOYW1lKSxcbiAgICAgIGhyZWY6ICgpID0+IHtcbiAgICAgICAgdmFyIGFuc3dlciA9IFNlcnZpY2VSZWdpc3RyeS5zZXJ2aWNlTGluayhjaGF0U2VydmljZU5hbWUpO1xuICAgICAgICBpZiAoYW5zd2VyKSB7XG4vKlxuICAgICAgICAgIFRPRE8gYWRkIGEgY3VzdG9tIGxpbmsgdG8gdGhlIGNvcnJlY3Qgcm9vbSBmb3IgdGhlIGN1cnJlbnQgbmFtZXNwYWNlP1xuXG4gICAgICAgICAgdmFyIGlyY0hvc3QgPSBcIlwiO1xuICAgICAgICAgIHZhciBpcmNTZXJ2aWNlID0gU2VydmljZVJlZ2lzdHJ5LmZpbmRTZXJ2aWNlKFwiaHVib3RcIik7XG4gICAgICAgICAgaWYgKGlyY1NlcnZpY2UpIHtcbiAgICAgICAgICAgIGlyY0hvc3QgPSBpcmNTZXJ2aWNlLnBvcnRhbElQO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoaXJjSG9zdCkge1xuICAgICAgICAgICAgdmFyIG5pY2sgPSBsb2NhbFN0b3JhZ2VbXCJnb2dzVXNlclwiXSB8fCBsb2NhbFN0b3JhZ2VbXCJpcmNOaWNrXCJdIHx8IFwibXluYW1lXCI7XG4gICAgICAgICAgICB2YXIgcm9vbSA9IFwiI2ZhYnJpYzgtXCIgKyAgY3VycmVudEt1YmVybmV0ZXNOYW1lc3BhY2UoKTtcbiAgICAgICAgICAgIGFuc3dlciA9IFVybEhlbHBlcnMuam9pbihhbnN3ZXIsIFwiL2tpd2lcIiwgaXJjSG9zdCwgXCI/Jm5pY2s9XCIgKyBuaWNrICsgcm9vbSk7XG4gICAgICAgICAgfVxuKi9cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gYW5zd2VyO1xuICAgICAgfSxcbiAgICAgIGlzQWN0aXZlOiAoKSA9PiBmYWxzZVxuICAgIH0pO1xuXG4gICAgLy8gVE9ETyB3ZSBzaG91bGQgbW92ZSB0aGlzIHRvIGEgbmljZXIgbGluayBpbnNpZGUgdGhlIExpYnJhcnkgc29vbiAtIGFsc28gbGV0cyBoaWRlIHVudGlsIGl0IHdvcmtzLi4uXG4vKlxuICAgIHdvcmtzcGFjZS50b3BMZXZlbFRhYnMucHVzaCh7XG4gICAgICBpZDogJ2NyZWF0ZVByb2plY3QnLFxuICAgICAgdGl0bGU6ICgpID0+ICAnQ3JlYXRlJyxcbiAgICAgIHRvb2x0aXA6ICgpID0+ICdDcmVhdGVzIGEgbmV3IHByb2plY3QnLFxuICAgICAgaXNWYWxpZDogKCkgPT4gU2VydmljZVJlZ2lzdHJ5Lmhhc1NlcnZpY2UoXCJhcHAtbGlicmFyeVwiKSAmJiBmYWxzZSxcbiAgICAgIGhyZWY6ICgpID0+IFwiL3Byb2plY3QvY3JlYXRlXCJcbiAgICB9KTtcbiovXG5cbiAgICBwcmVmZXJlbmNlc1JlZ2lzdHJ5LmFkZFRhYignQWJvdXQgJyArIHZlcnNpb24ubmFtZSwgVXJsSGVscGVycy5qb2luKHRlbXBsYXRlUGF0aCwgJ2Fib3V0Lmh0bWwnKSk7XG5cbiAgICBsb2cuaW5mbyhcInN0YXJ0ZWQsIHZlcnNpb246IFwiLCB2ZXJzaW9uLnZlcnNpb24pO1xuICAgIGxvZy5pbmZvKFwiY29tbWl0IElEOiBcIiwgdmVyc2lvbi5jb21taXRJZCk7XG4gIH0pO1xuXG4gIGhhd3Rpb1BsdWdpbkxvYWRlci5yZWdpc3RlclByZUJvb3RzdHJhcFRhc2soKG5leHQpID0+IHtcbiAgICAkLmFqYXgoe1xuICAgICAgdXJsOiAndmVyc2lvbi5qc29uP3Jldj0nICsgRGF0ZS5ub3coKSwgXG4gICAgICBzdWNjZXNzOiAoZGF0YSkgPT4ge1xuICAgICAgICB0cnkge1xuICAgICAgICAgIHZlcnNpb24gPSBhbmd1bGFyLmZyb21Kc29uKGRhdGEpO1xuICAgICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgICB2ZXJzaW9uID0ge1xuICAgICAgICAgICAgbmFtZTogJ2ZhYnJpYzgtY29uc29sZScsXG4gICAgICAgICAgICB2ZXJzaW9uOiAnJ1xuICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgbmV4dCgpO1xuICAgICAgfSxcbiAgICAgIGVycm9yOiAoanFYSFIsIHRleHQsIHN0YXR1cykgPT4ge1xuICAgICAgICBsb2cuZGVidWcoXCJGYWlsZWQgdG8gZmV0Y2ggdmVyc2lvbjoganFYSFI6IFwiLCBqcVhIUiwgXCIgdGV4dDogXCIsIHRleHQsIFwiIHN0YXR1czogXCIsIHN0YXR1cyk7XG4gICAgICAgIG5leHQoKTtcbiAgICAgIH0sXG4gICAgICBkYXRhVHlwZTogXCJodG1sXCJcbiAgICB9KTtcbiAgfSk7XG5cbiAgaGF3dGlvUGx1Z2luTG9hZGVyLmFkZE1vZHVsZShwbHVnaW5OYW1lKTtcbn1cbiIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJtYWluR2xvYmFscy50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJtYWluUGx1Z2luLnRzXCIvPlxuXG5tb2R1bGUgTWFpbiB7XG4gIF9tb2R1bGUuY29udHJvbGxlcignTWFpbi5BYm91dCcsICgkc2NvcGUpID0+IHtcbiAgICAkc2NvcGUuaW5mbyA9IHZlcnNpb247XG4gIH0pO1xufVxuXG4iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vaW5jbHVkZXMudHNcIi8+XG5cblxuLyoqXG4gKiBAbW9kdWxlIFdpa2lcbiAqL1xubW9kdWxlIFdpa2kge1xuXG4gIGV4cG9ydCB2YXIgbG9nOkxvZ2dpbmcuTG9nZ2VyID0gTG9nZ2VyLmdldChcIldpa2lcIik7XG5cbiAgZXhwb3J0IHZhciBjYW1lbE5hbWVzcGFjZXMgPSBbXCJodHRwOi8vY2FtZWwuYXBhY2hlLm9yZy9zY2hlbWEvc3ByaW5nXCIsIFwiaHR0cDovL2NhbWVsLmFwYWNoZS5vcmcvc2NoZW1hL2JsdWVwcmludFwiXTtcbiAgZXhwb3J0IHZhciBzcHJpbmdOYW1lc3BhY2VzID0gW1wiaHR0cDovL3d3dy5zcHJpbmdmcmFtZXdvcmsub3JnL3NjaGVtYS9iZWFuc1wiXTtcbiAgZXhwb3J0IHZhciBkcm9vbHNOYW1lc3BhY2VzID0gW1wiaHR0cDovL2Ryb29scy5vcmcvc2NoZW1hL2Ryb29scy1zcHJpbmdcIl07XG4gIGV4cG9ydCB2YXIgZG96ZXJOYW1lc3BhY2VzID0gW1wiaHR0cDovL2RvemVyLnNvdXJjZWZvcmdlLm5ldFwiXTtcbiAgZXhwb3J0IHZhciBhY3RpdmVtcU5hbWVzcGFjZXMgPSBbXCJodHRwOi8vYWN0aXZlbXEuYXBhY2hlLm9yZy9zY2hlbWEvY29yZVwiXTtcblxuICBleHBvcnQgdmFyIHVzZUNhbWVsQ2FudmFzQnlEZWZhdWx0ID0gZmFsc2U7XG5cbiAgZXhwb3J0IHZhciBleGNsdWRlQWRqdXN0bWVudFByZWZpeGVzID0gW1wiaHR0cDovL1wiLCBcImh0dHBzOi8vXCIsIFwiI1wiXTtcblxuICBleHBvcnQgZW51bSBWaWV3TW9kZSB7IExpc3QsIEljb24gfTtcblxuICAvKipcbiAgICogVGhlIGN1c3RvbSB2aWV3cyB3aXRoaW4gdGhlIHdpa2kgbmFtZXNwYWNlOyBlaXRoZXIgXCIvd2lraS8kZm9vXCIgb3IgXCIvd2lraS9icmFuY2gvJGJyYW5jaC8kZm9vXCJcbiAgICovXG4gIGV4cG9ydCB2YXIgY3VzdG9tV2lraVZpZXdQYWdlcyA9IFtcIi9mb3JtVGFibGVcIiwgXCIvY2FtZWwvZGlhZ3JhbVwiLCBcIi9jYW1lbC9jYW52YXNcIiwgXCIvY2FtZWwvcHJvcGVydGllc1wiLCBcIi9kb3plci9tYXBwaW5nc1wiXTtcblxuICAvKipcbiAgICogV2hpY2ggZXh0ZW5zaW9ucyBkbyB3ZSB3aXNoIHRvIGhpZGUgaW4gdGhlIHdpa2kgZmlsZSBsaXN0aW5nXG4gICAqIEBwcm9wZXJ0eSBoaWRlRXh0ZW5zaW9uc1xuICAgKiBAZm9yIFdpa2lcbiAgICogQHR5cGUgQXJyYXlcbiAgICovXG4gIGV4cG9ydCB2YXIgaGlkZUV4dGVuc2lvbnMgPSBbXCIucHJvZmlsZVwiXTtcblxuICB2YXIgZGVmYXVsdEZpbGVOYW1lUGF0dGVybiA9IC9eW2EtekEtWjAtOS5fLV0qJC87XG4gIHZhciBkZWZhdWx0RmlsZU5hbWVQYXR0ZXJuSW52YWxpZCA9IFwiTmFtZSBtdXN0IGJlOiBsZXR0ZXJzLCBudW1iZXJzLCBhbmQgLiBfIG9yIC0gY2hhcmFjdGVyc1wiO1xuXG4gIHZhciBkZWZhdWx0RmlsZU5hbWVFeHRlbnNpb25QYXR0ZXJuID0gXCJcIjtcblxuICB2YXIgZGVmYXVsdExvd2VyQ2FzZUZpbGVOYW1lUGF0dGVybiA9IC9eW2EtejAtOS5fLV0qJC87XG4gIHZhciBkZWZhdWx0TG93ZXJDYXNlRmlsZU5hbWVQYXR0ZXJuSW52YWxpZCA9IFwiTmFtZSBtdXN0IGJlOiBsb3dlci1jYXNlIGxldHRlcnMsIG51bWJlcnMsIGFuZCAuIF8gb3IgLSBjaGFyYWN0ZXJzXCI7XG5cbiAgZXhwb3J0IGludGVyZmFjZSBHZW5lcmF0ZU9wdGlvbnMge1xuICAgIHdvcmtzcGFjZTogYW55O1xuICAgIGZvcm06IGFueTtcbiAgICBuYW1lOiBzdHJpbmc7XG4gICAgYnJhbmNoOiBzdHJpbmc7XG4gICAgcGFyZW50SWQ6IHN0cmluZztcbiAgICBzdWNjZXNzOiAoZmlsZUNvbnRlbnRzPzpzdHJpbmcpID0+IHZvaWQ7XG4gICAgZXJyb3I6IChlcnJvcjphbnkpID0+IHZvaWQ7XG4gIH1cblxuICAvKipcbiAgICogVGhlIHdpemFyZCB0cmVlIGZvciBjcmVhdGluZyBuZXcgY29udGVudCBpbiB0aGUgd2lraVxuICAgKiBAcHJvcGVydHkgZG9jdW1lbnRUZW1wbGF0ZXNcbiAgICogQGZvciBXaWtpXG4gICAqIEB0eXBlIEFycmF5XG4gICAqL1xuICBleHBvcnQgdmFyIGRvY3VtZW50VGVtcGxhdGVzID0gW1xuICAgIHtcbiAgICAgIGxhYmVsOiBcIkZvbGRlclwiLFxuICAgICAgdG9vbHRpcDogXCJDcmVhdGUgYSBuZXcgZm9sZGVyIHRvIGNvbnRhaW4gZG9jdW1lbnRzXCIsXG4gICAgICBmb2xkZXI6IHRydWUsXG4gICAgICBpY29uOiBcIi9pbWcvaWNvbnMvd2lraS9mb2xkZXIuZ2lmXCIsXG4gICAgICBleGVtcGxhcjogXCJteWZvbGRlclwiLFxuICAgICAgcmVnZXg6IGRlZmF1bHRMb3dlckNhc2VGaWxlTmFtZVBhdHRlcm4sXG4gICAgICBpbnZhbGlkOiBkZWZhdWx0TG93ZXJDYXNlRmlsZU5hbWVQYXR0ZXJuSW52YWxpZFxuICAgIH0sXG4gICAgLypcbiAgICB7XG4gICAgICBsYWJlbDogXCJBcHBcIixcbiAgICAgIHRvb2x0aXA6IFwiQ3JlYXRlcyBhIG5ldyBBcHAgZm9sZGVyIHVzZWQgdG8gY29uZmlndXJlIGFuZCBydW4gY29udGFpbmVyc1wiLFxuICAgICAgYWRkQ2xhc3M6IFwiZmEgZmEtY29nIGdyZWVuXCIsXG4gICAgICBleGVtcGxhcjogJ215YXBwJyxcbiAgICAgIHJlZ2V4OiBkZWZhdWx0RmlsZU5hbWVQYXR0ZXJuLFxuICAgICAgaW52YWxpZDogZGVmYXVsdEZpbGVOYW1lUGF0dGVybkludmFsaWQsXG4gICAgICBleHRlbnNpb246ICcnLFxuICAgICAgZ2VuZXJhdGVkOiB7XG4gICAgICAgIG1iZWFuOiBbJ2lvLmZhYnJpYzgnLCB7IHR5cGU6ICdLdWJlcm5ldGVzVGVtcGxhdGVNYW5hZ2VyJyB9XSxcbiAgICAgICAgaW5pdDogKHdvcmtzcGFjZSwgJHNjb3BlKSA9PiB7XG5cbiAgICAgICAgfSxcbiAgICAgICAgZ2VuZXJhdGU6IChvcHRpb25zOkdlbmVyYXRlT3B0aW9ucykgPT4ge1xuICAgICAgICAgIGxvZy5kZWJ1ZyhcIkdvdCBvcHRpb25zOiBcIiwgb3B0aW9ucyk7XG4gICAgICAgICAgb3B0aW9ucy5mb3JtLm5hbWUgPSBvcHRpb25zLm5hbWU7XG4gICAgICAgICAgb3B0aW9ucy5mb3JtLnBhdGggPSBvcHRpb25zLnBhcmVudElkO1xuICAgICAgICAgIG9wdGlvbnMuZm9ybS5icmFuY2ggPSBvcHRpb25zLmJyYW5jaDtcbiAgICAgICAgICB2YXIganNvbiA9IGFuZ3VsYXIudG9Kc29uKG9wdGlvbnMuZm9ybSk7XG4gICAgICAgICAgdmFyIGpvbG9raWEgPSA8Sm9sb2tpYS5JSm9sb2tpYT4gSGF3dGlvQ29yZS5pbmplY3Rvci5nZXQoXCJqb2xva2lhXCIpO1xuICAgICAgICAgIGpvbG9raWEucmVxdWVzdCh7XG4gICAgICAgICAgICB0eXBlOiAnZXhlYycsXG4gICAgICAgICAgICBtYmVhbjogJ2lvLmZhYnJpYzg6dHlwZT1LdWJlcm5ldGVzVGVtcGxhdGVNYW5hZ2VyJyxcbiAgICAgICAgICAgIG9wZXJhdGlvbjogJ2NyZWF0ZUFwcEJ5SnNvbicsXG4gICAgICAgICAgICBhcmd1bWVudHM6IFtqc29uXVxuICAgICAgICAgIH0sIENvcmUub25TdWNjZXNzKChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgbG9nLmRlYnVnKFwiR2VuZXJhdGVkIGFwcCwgcmVzcG9uc2U6IFwiLCByZXNwb25zZSk7XG4gICAgICAgICAgICBvcHRpb25zLnN1Y2Nlc3ModW5kZWZpbmVkKTsgXG4gICAgICAgICAgfSwge1xuICAgICAgICAgICAgZXJyb3I6IChyZXNwb25zZSkgPT4geyBvcHRpb25zLmVycm9yKHJlc3BvbnNlLmVycm9yKTsgfVxuICAgICAgICAgIH0pKTtcbiAgICAgICAgfSxcbiAgICAgICAgZm9ybTogKHdvcmtzcGFjZSwgJHNjb3BlKSA9PiB7XG4gICAgICAgICAgLy8gVE9ETyBkb2NrZXIgcmVnaXN0cnkgY29tcGxldGlvblxuICAgICAgICAgIGlmICghJHNjb3BlLmRvRG9ja2VyUmVnaXN0cnlDb21wbGV0aW9uKSB7XG4gICAgICAgICAgICAkc2NvcGUuZmV0Y2hEb2NrZXJSZXBvc2l0b3JpZXMgPSAoKSA9PiB7XG4gICAgICAgICAgICAgIHJldHVybiBEb2NrZXJSZWdpc3RyeS5jb21wbGV0ZURvY2tlclJlZ2lzdHJ5KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBzdW1tYXJ5TWFya2Rvd246ICdBZGQgYXBwIHN1bW1hcnkgaGVyZScsXG4gICAgICAgICAgICByZXBsaWNhQ291bnQ6IDFcbiAgICAgICAgICB9O1xuICAgICAgICB9LFxuICAgICAgICBzY2hlbWE6IHtcbiAgICAgICAgICBkZXNjcmlwdGlvbjogJ0FwcCBzZXR0aW5ncycsXG4gICAgICAgICAgdHlwZTogJ2phdmEubGFuZy5TdHJpbmcnLFxuICAgICAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgICAgICdkb2NrZXJJbWFnZSc6IHtcbiAgICAgICAgICAgICAgJ2Rlc2NyaXB0aW9uJzogJ0RvY2tlciBJbWFnZScsXG4gICAgICAgICAgICAgICd0eXBlJzogJ2phdmEubGFuZy5TdHJpbmcnLFxuICAgICAgICAgICAgICAnaW5wdXQtYXR0cmlidXRlcyc6IHsgXG4gICAgICAgICAgICAgICAgJ3JlcXVpcmVkJzogJycsIFxuICAgICAgICAgICAgICAgICdjbGFzcyc6ICdpbnB1dC14bGFyZ2UnLFxuICAgICAgICAgICAgICAgICd0eXBlYWhlYWQnOiAncmVwbyBmb3IgcmVwbyBpbiBmZXRjaERvY2tlclJlcG9zaXRvcmllcygpIHwgZmlsdGVyOiR2aWV3VmFsdWUnLFxuICAgICAgICAgICAgICAgICd0eXBlYWhlYWQtd2FpdC1tcyc6ICcyMDAnXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAnc3VtbWFyeU1hcmtkb3duJzoge1xuICAgICAgICAgICAgICAnZGVzY3JpcHRpb24nOiAnU2hvcnQgRGVzY3JpcHRpb24nLFxuICAgICAgICAgICAgICAndHlwZSc6ICdqYXZhLmxhbmcuU3RyaW5nJyxcbiAgICAgICAgICAgICAgJ2lucHV0LWF0dHJpYnV0ZXMnOiB7ICdjbGFzcyc6ICdpbnB1dC14bGFyZ2UnIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAncmVwbGljYUNvdW50Jzoge1xuICAgICAgICAgICAgICAnZGVzY3JpcHRpb24nOiAnUmVwbGljYSBDb3VudCcsXG4gICAgICAgICAgICAgICd0eXBlJzogJ2phdmEubGFuZy5JbnRlZ2VyJyxcbiAgICAgICAgICAgICAgJ2lucHV0LWF0dHJpYnV0ZXMnOiB7XG4gICAgICAgICAgICAgICAgbWluOiAnMCdcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICdsYWJlbHMnOiB7XG4gICAgICAgICAgICAgICdkZXNjcmlwdGlvbic6ICdMYWJlbHMnLFxuICAgICAgICAgICAgICAndHlwZSc6ICdtYXAnLFxuICAgICAgICAgICAgICAnaXRlbXMnOiB7XG4gICAgICAgICAgICAgICAgJ3R5cGUnOiAnc3RyaW5nJ1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSxcbiAgICB7XG4gICAgICBsYWJlbDogXCJGYWJyaWM4IFByb2ZpbGVcIixcbiAgICAgIHRvb2x0aXA6IFwiQ3JlYXRlIGEgbmV3IGVtcHR5IGZhYnJpYyBwcm9maWxlLiBVc2luZyBhIGh5cGhlbiAoJy0nKSB3aWxsIGNyZWF0ZSBhIGZvbGRlciBoZWlyYXJjaHksIGZvciBleGFtcGxlICdteS1hd2Vzb21lLXByb2ZpbGUnIHdpbGwgYmUgYXZhaWxhYmxlIHZpYSB0aGUgcGF0aCAnbXkvYXdlc29tZS9wcm9maWxlJy5cIixcbiAgICAgIHByb2ZpbGU6IHRydWUsXG4gICAgICBhZGRDbGFzczogXCJmYSBmYS1ib29rIGdyZWVuXCIsXG4gICAgICBleGVtcGxhcjogXCJ1c2VyLXByb2ZpbGVcIixcbiAgICAgIHJlZ2V4OiBkZWZhdWx0TG93ZXJDYXNlRmlsZU5hbWVQYXR0ZXJuLFxuICAgICAgaW52YWxpZDogZGVmYXVsdExvd2VyQ2FzZUZpbGVOYW1lUGF0dGVybkludmFsaWQsXG4gICAgICBmYWJyaWNPbmx5OiB0cnVlXG4gICAgfSxcbiAgICAqL1xuICAgIHtcbiAgICAgIGxhYmVsOiBcIlByb3BlcnRpZXMgRmlsZVwiLFxuICAgICAgdG9vbHRpcDogXCJBIHByb3BlcnRpZXMgZmlsZSB0eXBpY2FsbHkgdXNlZCB0byBjb25maWd1cmUgSmF2YSBjbGFzc2VzXCIsXG4gICAgICBleGVtcGxhcjogXCJwcm9wZXJ0aWVzLWZpbGUucHJvcGVydGllc1wiLFxuICAgICAgcmVnZXg6IGRlZmF1bHRGaWxlTmFtZVBhdHRlcm4sXG4gICAgICBpbnZhbGlkOiBkZWZhdWx0RmlsZU5hbWVQYXR0ZXJuSW52YWxpZCxcbiAgICAgIGV4dGVuc2lvbjogXCIucHJvcGVydGllc1wiXG4gICAgfSxcbiAgICB7XG4gICAgICBsYWJlbDogXCJKU09OIEZpbGVcIixcbiAgICAgIHRvb2x0aXA6IFwiQSBmaWxlIGNvbnRhaW5pbmcgSlNPTiBkYXRhXCIsXG4gICAgICBleGVtcGxhcjogXCJkb2N1bWVudC5qc29uXCIsXG4gICAgICByZWdleDogZGVmYXVsdEZpbGVOYW1lUGF0dGVybixcbiAgICAgIGludmFsaWQ6IGRlZmF1bHRGaWxlTmFtZVBhdHRlcm5JbnZhbGlkLFxuICAgICAgZXh0ZW5zaW9uOiBcIi5qc29uXCJcbiAgICB9LFxuICAgIC8qXG4gICAge1xuICAgICAgbGFiZWw6IFwiS2V5IFN0b3JlIEZpbGVcIixcbiAgICAgIHRvb2x0aXA6IFwiQ3JlYXRlcyBhIGtleXN0b3JlIChkYXRhYmFzZSkgb2YgY3J5cHRvZ3JhcGhpYyBrZXlzLCBYLjUwOSBjZXJ0aWZpY2F0ZSBjaGFpbnMsIGFuZCB0cnVzdGVkIGNlcnRpZmljYXRlcy5cIixcbiAgICAgIGV4ZW1wbGFyOiAna2V5c3RvcmUuamtzJyxcbiAgICAgIHJlZ2V4OiBkZWZhdWx0RmlsZU5hbWVQYXR0ZXJuLFxuICAgICAgaW52YWxpZDogZGVmYXVsdEZpbGVOYW1lUGF0dGVybkludmFsaWQsXG4gICAgICBleHRlbnNpb246IFwiLmprc1wiLFxuICAgICAgZ2VuZXJhdGVkOiB7XG4gICAgICAgIG1iZWFuOiBbJ2hhd3RpbycsIHsgdHlwZTogJ0tleXN0b3JlU2VydmljZScgfV0sXG4gICAgICAgIGluaXQ6IGZ1bmN0aW9uKHdvcmtzcGFjZSwgJHNjb3BlKSB7XG4gICAgICAgICAgdmFyIG1iZWFuID0gJ2hhd3Rpbzp0eXBlPUtleXN0b3JlU2VydmljZSc7XG4gICAgICAgICAgdmFyIHJlc3BvbnNlID0gd29ya3NwYWNlLmpvbG9raWEucmVxdWVzdCgge3R5cGU6IFwicmVhZFwiLCBtYmVhbjogbWJlYW4sIGF0dHJpYnV0ZTogXCJTZWN1cml0eVByb3ZpZGVySW5mb1wiIH0sIHtcbiAgICAgICAgICAgIHN1Y2Nlc3M6IChyZXNwb25zZSk9PntcbiAgICAgICAgICAgICAgJHNjb3BlLnNlY3VyaXR5UHJvdmlkZXJJbmZvID0gcmVzcG9uc2UudmFsdWU7XG4gICAgICAgICAgICAgIENvcmUuJGFwcGx5KCRzY29wZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZXJyb3I6IChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICBjb25zb2xlLmxvZygnQ291bGQgbm90IGZpbmQgdGhlIHN1cHBvcnRlZCBzZWN1cml0eSBhbGdvcml0aG1zOiAnLCByZXNwb25zZS5lcnJvcik7XG4gICAgICAgICAgICAgIENvcmUuJGFwcGx5KCRzY29wZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0sXG4gICAgICAgIGdlbmVyYXRlOiBmdW5jdGlvbihvcHRpb25zOkdlbmVyYXRlT3B0aW9ucykge1xuICAgICAgICAgIHZhciBlbmNvZGVkRm9ybSA9IEpTT04uc3RyaW5naWZ5KG9wdGlvbnMuZm9ybSlcbiAgICAgICAgICB2YXIgbWJlYW4gPSAnaGF3dGlvOnR5cGU9S2V5c3RvcmVTZXJ2aWNlJztcbiAgICAgICAgICB2YXIgcmVzcG9uc2UgPSBvcHRpb25zLndvcmtzcGFjZS5qb2xva2lhLnJlcXVlc3QoIHtcbiAgICAgICAgICAgICAgdHlwZTogJ2V4ZWMnLCBcbiAgICAgICAgICAgICAgbWJlYW46IG1iZWFuLFxuICAgICAgICAgICAgICBvcGVyYXRpb246ICdjcmVhdGVLZXlTdG9yZVZpYUpTT04oamF2YS5sYW5nLlN0cmluZyknLFxuICAgICAgICAgICAgICBhcmd1bWVudHM6IFtlbmNvZGVkRm9ybV1cbiAgICAgICAgICAgIH0sIHtcbiAgICAgICAgICAgICAgbWV0aG9kOidQT1NUJyxcbiAgICAgICAgICAgICAgc3VjY2VzczpmdW5jdGlvbihyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIG9wdGlvbnMuc3VjY2VzcyhyZXNwb25zZS52YWx1ZSlcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgZXJyb3I6ZnVuY3Rpb24ocmVzcG9uc2Upe1xuICAgICAgICAgICAgICAgIG9wdGlvbnMuZXJyb3IocmVzcG9uc2UuZXJyb3IpXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LFxuICAgICAgICBmb3JtOiBmdW5jdGlvbih3b3Jrc3BhY2UsICRzY29wZSl7IFxuICAgICAgICAgIHJldHVybiB7IFxuICAgICAgICAgICAgc3RvcmVUeXBlOiAkc2NvcGUuc2VjdXJpdHlQcm92aWRlckluZm8uc3VwcG9ydGVkS2V5U3RvcmVUeXBlc1swXSxcbiAgICAgICAgICAgIGNyZWF0ZVByaXZhdGVLZXk6IGZhbHNlLFxuICAgICAgICAgICAga2V5TGVuZ3RoOiA0MDk2LFxuICAgICAgICAgICAga2V5QWxnb3JpdGhtOiAkc2NvcGUuc2VjdXJpdHlQcm92aWRlckluZm8uc3VwcG9ydGVkS2V5QWxnb3JpdGhtc1swXSxcbiAgICAgICAgICAgIGtleVZhbGlkaXR5OiAzNjVcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIHNjaGVtYToge1xuICAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiS2V5c3RvcmUgU2V0dGluZ3NcIixcbiAgICAgICAgICAgXCJ0eXBlXCI6IFwiamF2YS5sYW5nLlN0cmluZ1wiLFxuICAgICAgICAgICBcInByb3BlcnRpZXNcIjogeyBcbiAgICAgICAgICAgICBcInN0b3JlUGFzc3dvcmRcIjoge1xuICAgICAgICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIktleXN0b3JlIHBhc3N3b3JkLlwiLFxuICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwicGFzc3dvcmRcIixcbiAgICAgICAgICAgICAgICdpbnB1dC1hdHRyaWJ1dGVzJzogeyBcInJlcXVpcmVkXCI6ICBcIlwiLCAgXCJuZy1taW5sZW5ndGhcIjo2IH1cbiAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgIFwic3RvcmVUeXBlXCI6IHtcbiAgICAgICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgdHlwZSBvZiBzdG9yZSB0byBjcmVhdGVcIixcbiAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImphdmEubGFuZy5TdHJpbmdcIixcbiAgICAgICAgICAgICAgICdpbnB1dC1lbGVtZW50JzogXCJzZWxlY3RcIixcbiAgICAgICAgICAgICAgICdpbnB1dC1hdHRyaWJ1dGVzJzogeyBcIm5nLW9wdGlvbnNcIjogIFwidiBmb3IgdiBpbiBzZWN1cml0eVByb3ZpZGVySW5mby5zdXBwb3J0ZWRLZXlTdG9yZVR5cGVzXCIgfVxuICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgXCJjcmVhdGVQcml2YXRlS2V5XCI6IHtcbiAgICAgICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJTaG91bGQgd2UgZ2VuZXJhdGUgYSBzZWxmLXNpZ25lZCBwcml2YXRlIGtleT9cIixcbiAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImJvb2xlYW5cIlxuICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgXCJrZXlDb21tb25OYW1lXCI6IHtcbiAgICAgICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgY29tbW9uIG5hbWUgb2YgdGhlIGtleSwgdHlwaWNhbGx5IHNldCB0byB0aGUgaG9zdG5hbWUgb2YgdGhlIHNlcnZlclwiLFxuICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwiamF2YS5sYW5nLlN0cmluZ1wiLFxuICAgICAgICAgICAgICAgJ2NvbnRyb2wtZ3JvdXAtYXR0cmlidXRlcyc6IHsgJ25nLXNob3cnOiBcImZvcm1EYXRhLmNyZWF0ZVByaXZhdGVLZXlcIiB9XG4gICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICBcImtleUxlbmd0aFwiOiB7XG4gICAgICAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIGxlbmd0aCBvZiB0aGUgY3J5cHRvZ3JhcGhpYyBrZXlcIixcbiAgICAgICAgICAgICAgIFwidHlwZVwiOiBcIkxvbmdcIixcbiAgICAgICAgICAgICAgICdjb250cm9sLWdyb3VwLWF0dHJpYnV0ZXMnOiB7ICduZy1zaG93JzogXCJmb3JtRGF0YS5jcmVhdGVQcml2YXRlS2V5XCIgfVxuICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgXCJrZXlBbGdvcml0aG1cIjoge1xuICAgICAgICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBrZXkgYWxnb3JpdGhtXCIsXG4gICAgICAgICAgICAgICBcInR5cGVcIjogXCJqYXZhLmxhbmcuU3RyaW5nXCIsXG4gICAgICAgICAgICAgICAnaW5wdXQtZWxlbWVudCc6IFwic2VsZWN0XCIsXG4gICAgICAgICAgICAgICAnaW5wdXQtYXR0cmlidXRlcyc6IHsgXCJuZy1vcHRpb25zXCI6ICBcInYgZm9yIHYgaW4gc2VjdXJpdHlQcm92aWRlckluZm8uc3VwcG9ydGVkS2V5QWxnb3JpdGhtc1wiIH0sXG4gICAgICAgICAgICAgICAnY29udHJvbC1ncm91cC1hdHRyaWJ1dGVzJzogeyAnbmctc2hvdyc6IFwiZm9ybURhdGEuY3JlYXRlUHJpdmF0ZUtleVwiIH1cbiAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgIFwia2V5VmFsaWRpdHlcIjoge1xuICAgICAgICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBudW1iZXIgb2YgZGF5cyB0aGUga2V5IHdpbGwgYmUgdmFsaWQgZm9yXCIsXG4gICAgICAgICAgICAgICBcInR5cGVcIjogXCJMb25nXCIsXG4gICAgICAgICAgICAgICAnY29udHJvbC1ncm91cC1hdHRyaWJ1dGVzJzogeyAnbmctc2hvdyc6IFwiZm9ybURhdGEuY3JlYXRlUHJpdmF0ZUtleVwiIH1cbiAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgIFwia2V5UGFzc3dvcmRcIjoge1xuICAgICAgICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlBhc3N3b3JkIHRvIHRoZSBwcml2YXRlIGtleVwiLFxuICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwicGFzc3dvcmRcIixcbiAgICAgICAgICAgICAgICdjb250cm9sLWdyb3VwLWF0dHJpYnV0ZXMnOiB7ICduZy1zaG93JzogXCJmb3JtRGF0YS5jcmVhdGVQcml2YXRlS2V5XCIgfVxuICAgICAgICAgICAgIH1cbiAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSxcbiAgICAqL1xuICAgIHtcbiAgICAgIGxhYmVsOiBcIk1hcmtkb3duIERvY3VtZW50XCIsXG4gICAgICB0b29sdGlwOiBcIkEgYmFzaWMgbWFya3VwIGRvY3VtZW50IHVzaW5nIHRoZSBNYXJrZG93biB3aWtpIG1hcmt1cCwgcGFydGljdWxhcmx5IHVzZWZ1bCBmb3IgUmVhZE1lIGZpbGVzIGluIGRpcmVjdG9yaWVzXCIsXG4gICAgICBleGVtcGxhcjogXCJSZWFkTWUubWRcIixcbiAgICAgIHJlZ2V4OiBkZWZhdWx0RmlsZU5hbWVQYXR0ZXJuLFxuICAgICAgaW52YWxpZDogZGVmYXVsdEZpbGVOYW1lUGF0dGVybkludmFsaWQsXG4gICAgICBleHRlbnNpb246IFwiLm1kXCJcbiAgICB9LFxuICAgIHtcbiAgICAgIGxhYmVsOiBcIlRleHQgRG9jdW1lbnRcIixcbiAgICAgIHRvb2x0aXA6IFwiQSBwbGFpbiB0ZXh0IGZpbGVcIixcbiAgICAgIGV4ZW1wbGFyOiBcImRvY3VtZW50LnRleHRcIixcbiAgICAgIHJlZ2V4OiBkZWZhdWx0RmlsZU5hbWVQYXR0ZXJuLFxuICAgICAgaW52YWxpZDogZGVmYXVsdEZpbGVOYW1lUGF0dGVybkludmFsaWQsXG4gICAgICBleHRlbnNpb246IFwiLnR4dFwiXG4gICAgfSxcbiAgICB7XG4gICAgICBsYWJlbDogXCJIVE1MIERvY3VtZW50XCIsXG4gICAgICB0b29sdGlwOiBcIkEgSFRNTCBkb2N1bWVudCB5b3UgY2FuIGVkaXQgZGlyZWN0bHkgdXNpbmcgdGhlIEhUTUwgbWFya3VwXCIsXG4gICAgICBleGVtcGxhcjogXCJkb2N1bWVudC5odG1sXCIsXG4gICAgICByZWdleDogZGVmYXVsdEZpbGVOYW1lUGF0dGVybixcbiAgICAgIGludmFsaWQ6IGRlZmF1bHRGaWxlTmFtZVBhdHRlcm5JbnZhbGlkLFxuICAgICAgZXh0ZW5zaW9uOiBcIi5odG1sXCJcbiAgICB9LFxuICAgIHtcbiAgICAgIGxhYmVsOiBcIlhNTCBEb2N1bWVudFwiLFxuICAgICAgdG9vbHRpcDogXCJBbiBlbXB0eSBYTUwgZG9jdW1lbnRcIixcbiAgICAgIGV4ZW1wbGFyOiBcImRvY3VtZW50LnhtbFwiLFxuICAgICAgcmVnZXg6IGRlZmF1bHRGaWxlTmFtZVBhdHRlcm4sXG4gICAgICBpbnZhbGlkOiBkZWZhdWx0RmlsZU5hbWVQYXR0ZXJuSW52YWxpZCxcbiAgICAgIGV4dGVuc2lvbjogXCIueG1sXCJcbiAgICB9LFxuICAgIHtcbiAgICAgIGxhYmVsOiBcIkludGVncmF0aW9uIEZsb3dzXCIsXG4gICAgICB0b29sdGlwOiBcIkNhbWVsIHJvdXRlcyBmb3IgZGVmaW5pbmcgeW91ciBpbnRlZ3JhdGlvbiBmbG93c1wiLFxuICAgICAgY2hpbGRyZW46IFtcbiAgICAgICAge1xuICAgICAgICAgIGxhYmVsOiBcIkNhbWVsIFhNTCBkb2N1bWVudFwiLFxuICAgICAgICAgIHRvb2x0aXA6IFwiQSB2YW5pbGxhIENhbWVsIFhNTCBkb2N1bWVudCBmb3IgaW50ZWdyYXRpb24gZmxvd3NcIixcbiAgICAgICAgICBpY29uOiBcIi9pbWcvaWNvbnMvY2FtZWwuc3ZnXCIsXG4gICAgICAgICAgZXhlbXBsYXI6IFwiY2FtZWwueG1sXCIsXG4gICAgICAgICAgcmVnZXg6IGRlZmF1bHRGaWxlTmFtZVBhdHRlcm4sXG4gICAgICAgICAgaW52YWxpZDogZGVmYXVsdEZpbGVOYW1lUGF0dGVybkludmFsaWQsXG4gICAgICAgICAgZXh0ZW5zaW9uOiBcIi54bWxcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgbGFiZWw6IFwiQ2FtZWwgT1NHaSBCbHVlcHJpbnQgWE1MIGRvY3VtZW50XCIsXG4gICAgICAgICAgdG9vbHRpcDogXCJBIHZhbmlsbGEgQ2FtZWwgWE1MIGRvY3VtZW50IGZvciBpbnRlZ3JhdGlvbiBmbG93cyB3aGVuIHVzaW5nIE9TR2kgQmx1ZXByaW50XCIsXG4gICAgICAgICAgaWNvbjogXCIvaW1nL2ljb25zL2NhbWVsLnN2Z1wiLFxuICAgICAgICAgIGV4ZW1wbGFyOiBcImNhbWVsLWJsdWVwcmludC54bWxcIixcbiAgICAgICAgICByZWdleDogZGVmYXVsdEZpbGVOYW1lUGF0dGVybixcbiAgICAgICAgICBpbnZhbGlkOiBkZWZhdWx0RmlsZU5hbWVQYXR0ZXJuSW52YWxpZCxcbiAgICAgICAgICBleHRlbnNpb246IFwiLnhtbFwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICBsYWJlbDogXCJDYW1lbCBTcHJpbmcgWE1MIGRvY3VtZW50XCIsXG4gICAgICAgICAgdG9vbHRpcDogXCJBIHZhbmlsbGEgQ2FtZWwgWE1MIGRvY3VtZW50IGZvciBpbnRlZ3JhdGlvbiBmbG93cyB3aGVuIHVzaW5nIHRoZSBTcHJpbmcgZnJhbWV3b3JrXCIsXG4gICAgICAgICAgaWNvbjogXCIvaW1nL2ljb25zL2NhbWVsLnN2Z1wiLFxuICAgICAgICAgIGV4ZW1wbGFyOiBcImNhbWVsLXNwcmluZy54bWxcIixcbiAgICAgICAgICByZWdleDogZGVmYXVsdEZpbGVOYW1lUGF0dGVybixcbiAgICAgICAgICBpbnZhbGlkOiBkZWZhdWx0RmlsZU5hbWVQYXR0ZXJuSW52YWxpZCxcbiAgICAgICAgICBleHRlbnNpb246IFwiLnhtbFwiXG4gICAgICAgIH1cbiAgICAgIF1cbiAgICB9LFxuICAgIHtcbiAgICAgIGxhYmVsOiBcIkRhdGEgTWFwcGluZyBEb2N1bWVudFwiLFxuICAgICAgdG9vbHRpcDogXCJEb3plciBiYXNlZCBjb25maWd1cmF0aW9uIG9mIG1hcHBpbmcgZG9jdW1lbnRzXCIsXG4gICAgICBpY29uOiBcIi9pbWcvaWNvbnMvZG96ZXIvZG96ZXIuZ2lmXCIsXG4gICAgICBleGVtcGxhcjogXCJkb3plci1tYXBwaW5nLnhtbFwiLFxuICAgICAgcmVnZXg6IGRlZmF1bHRGaWxlTmFtZVBhdHRlcm4sXG4gICAgICBpbnZhbGlkOiBkZWZhdWx0RmlsZU5hbWVQYXR0ZXJuSW52YWxpZCxcbiAgICAgIGV4dGVuc2lvbjogXCIueG1sXCJcbiAgICB9XG4gIF07XG5cbiAgLy8gVE9ETyBSRU1PVkVcbiAgZXhwb3J0IGZ1bmN0aW9uIGlzRk1DQ29udGFpbmVyKHdvcmtzcGFjZSkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIC8vIFRPRE8gUkVNT1ZFXG4gIGV4cG9ydCBmdW5jdGlvbiBpc1dpa2lFbmFibGVkKHdvcmtzcGFjZSwgam9sb2tpYSwgbG9jYWxTdG9yYWdlKSB7XG4gICAgcmV0dXJuIHRydWU7XG4vKlxuICAgIHJldHVybiBHaXQuY3JlYXRlR2l0UmVwb3NpdG9yeSh3b3Jrc3BhY2UsIGpvbG9raWEsIGxvY2FsU3RvcmFnZSkgIT09IG51bGw7XG4qL1xuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIGdvVG9MaW5rKGxpbmssICR0aW1lb3V0LCAkbG9jYXRpb24pIHtcbiAgICB2YXIgaHJlZiA9IENvcmUudHJpbUxlYWRpbmcobGluaywgXCIjXCIpO1xuICAgICR0aW1lb3V0KCgpID0+IHtcbiAgICAgIGxvZy5kZWJ1ZyhcIkFib3V0IHRvIG5hdmlnYXRlIHRvOiBcIiArIGhyZWYpO1xuICAgICAgJGxvY2F0aW9uLnVybChocmVmKTtcbiAgICB9LCAxMDApO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgYWxsIHRoZSBsaW5rcyBmb3IgdGhlIGdpdmVuIGJyYW5jaCBmb3IgdGhlIGN1c3RvbSB2aWV3cywgc3RhcnRpbmcgd2l0aCBcIi9cIlxuICAgKiBAcGFyYW0gJHNjb3BlXG4gICAqIEByZXR1cm5zIHtzdHJpbmdbXX1cbiAgICovXG4gIGV4cG9ydCBmdW5jdGlvbiBjdXN0b21WaWV3TGlua3MoJHNjb3BlKSB7XG4gICAgdmFyIHByZWZpeCA9IENvcmUudHJpbUxlYWRpbmcoV2lraS5zdGFydExpbmsoJHNjb3BlKSwgXCIjXCIpO1xuICAgIHJldHVybiBjdXN0b21XaWtpVmlld1BhZ2VzLm1hcChwYXRoID0+IHByZWZpeCArIHBhdGgpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgYSBuZXcgY3JlYXRlIGRvY3VtZW50IHdpemFyZCB0cmVlXG4gICAqIEBtZXRob2QgY3JlYXRlV2l6YXJkVHJlZVxuICAgKiBAZm9yIFdpa2lcbiAgICogQHN0YXRpY1xuICAgKi9cbiAgZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVdpemFyZFRyZWUod29ya3NwYWNlLCAkc2NvcGUpIHtcbiAgICB2YXIgcm9vdCA9IGNyZWF0ZUZvbGRlcihcIk5ldyBEb2N1bWVudHNcIik7XG4gICAgYWRkQ3JlYXRlV2l6YXJkRm9sZGVycyh3b3Jrc3BhY2UsICRzY29wZSwgcm9vdCwgZG9jdW1lbnRUZW1wbGF0ZXMpO1xuICAgIHJldHVybiByb290O1xuICB9XG5cbiAgZnVuY3Rpb24gY3JlYXRlRm9sZGVyKG5hbWUpOiBhbnkge1xuICAgIHJldHVybiB7XG4gICAgICBuYW1lOiBuYW1lLFxuICAgICAgY2hpbGRyZW46IFtdXG4gICAgfTtcbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiBhZGRDcmVhdGVXaXphcmRGb2xkZXJzKHdvcmtzcGFjZSwgJHNjb3BlLCBwYXJlbnQsIHRlbXBsYXRlczogYW55W10pIHtcbiAgICBhbmd1bGFyLmZvckVhY2godGVtcGxhdGVzLCAodGVtcGxhdGUpID0+IHtcblxuICAgICAgaWYgKCB0ZW1wbGF0ZS5nZW5lcmF0ZWQgKSB7XG4gICAgICAgIGlmICggdGVtcGxhdGUuZ2VuZXJhdGVkLmluaXQgKSB7XG4gICAgICAgICAgdGVtcGxhdGUuZ2VuZXJhdGVkLmluaXQod29ya3NwYWNlLCAkc2NvcGUpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHZhciB0aXRsZSA9IHRlbXBsYXRlLmxhYmVsIHx8IGtleTtcbiAgICAgIHZhciBub2RlID0gY3JlYXRlRm9sZGVyKHRpdGxlKTtcbiAgICAgIG5vZGUucGFyZW50ID0gcGFyZW50O1xuICAgICAgbm9kZS5lbnRpdHkgPSB0ZW1wbGF0ZTtcblxuICAgICAgdmFyIGFkZENsYXNzID0gdGVtcGxhdGUuYWRkQ2xhc3M7XG4gICAgICBpZiAoYWRkQ2xhc3MpIHtcbiAgICAgICAgbm9kZS5hZGRDbGFzcyA9IGFkZENsYXNzO1xuICAgICAgfVxuXG4gICAgICB2YXIga2V5ID0gdGVtcGxhdGUuZXhlbXBsYXI7XG4gICAgICB2YXIgcGFyZW50S2V5ID0gcGFyZW50LmtleSB8fCBcIlwiO1xuICAgICAgbm9kZS5rZXkgPSBwYXJlbnRLZXkgPyBwYXJlbnRLZXkgKyBcIl9cIiArIGtleSA6IGtleTtcbiAgICAgIHZhciBpY29uID0gdGVtcGxhdGUuaWNvbjtcbiAgICAgIGlmIChpY29uKSB7XG4gICAgICAgIG5vZGUuaWNvbiA9IENvcmUudXJsKGljb24pO1xuICAgICAgfVxuICAgICAgLy8gY29tcGlsZXIgd2FzIGNvbXBsYWluaW5nIGFib3V0ICdsYWJlbCcgaGFkIG5vIGlkZWEgd2hlcmUgaXQncyBjb21pbmcgZnJvbVxuICAgICAgLy8gdmFyIHRvb2x0aXAgPSB2YWx1ZVtcInRvb2x0aXBcIl0gfHwgdmFsdWVbXCJkZXNjcmlwdGlvblwiXSB8fCBsYWJlbDtcbiAgICAgIHZhciB0b29sdGlwID0gdGVtcGxhdGVbXCJ0b29sdGlwXCJdIHx8IHRlbXBsYXRlW1wiZGVzY3JpcHRpb25cIl0gfHwgJyc7XG4gICAgICBub2RlLnRvb2x0aXAgPSB0b29sdGlwO1xuICAgICAgaWYgKHRlbXBsYXRlW1wiZm9sZGVyXCJdKSB7XG4gICAgICAgIG5vZGUuaXNGb2xkZXIgPSAoKSA9PiB7IHJldHVybiB0cnVlOyB9O1xuICAgICAgfVxuICAgICAgcGFyZW50LmNoaWxkcmVuLnB1c2gobm9kZSk7XG5cbiAgICAgIHZhciBjaGlsZHJlbiA9IHRlbXBsYXRlLmNoaWxkcmVuO1xuICAgICAgaWYgKGNoaWxkcmVuKSB7XG4gICAgICAgIGFkZENyZWF0ZVdpemFyZEZvbGRlcnMod29ya3NwYWNlLCAkc2NvcGUsIG5vZGUsIGNoaWxkcmVuKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiBzdGFydExpbmsoJHNjb3BlKSB7XG4gICAgdmFyIHByb2plY3RJZCA9ICRzY29wZS5wcm9qZWN0SWQ7XG4gICAgdmFyIG93bmVyID0gJHNjb3BlLm93bmVyO1xuICAgIHZhciByZXBvSWQgPSAkc2NvcGUucmVwb0lkIHx8IHByb2plY3RJZDtcbiAgICB2YXIgc3RhcnQgPSBVcmxIZWxwZXJzLmpvaW4oRGV2ZWxvcGVyLnByb2plY3RMaW5rKHByb2plY3RJZCksIFwiL3dpa2lcIiwgb3duZXIsIHJlcG9JZCk7XG4gICAgdmFyIGJyYW5jaCA9ICRzY29wZS5icmFuY2g7XG4gICAgaWYgKGJyYW5jaCkge1xuICAgICAgc3RhcnQgPSBVcmxIZWxwZXJzLmpvaW4oc3RhcnQsICdicmFuY2gnLCBicmFuY2gpO1xuICAgIH1cbiAgICByZXR1cm4gc3RhcnQ7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyB0cnVlIGlmIHRoZSBnaXZlbiBmaWxlbmFtZS9wYXRoIGlzIGFuIGluZGV4IHBhZ2UgKG5hbWVkIGluZGV4LiogYW5kIGlzIGEgbWFya2Rvd24vaHRtbCBwYWdlKS5cbiAgICpcbiAgICogQHBhcmFtIHBhdGhcbiAgICogQHJldHVybnMge2Jvb2xlYW59XG4gICAqL1xuICBleHBvcnQgZnVuY3Rpb24gaXNJbmRleFBhZ2UocGF0aDogc3RyaW5nKSB7XG4gICAgcmV0dXJuIHBhdGggJiYgKHBhdGguZW5kc1dpdGgoXCJpbmRleC5tZFwiKSB8fCBwYXRoLmVuZHNXaXRoKFwiaW5kZXguaHRtbFwiKSB8fCBwYXRoLmVuZHNXaXRoKFwiaW5kZXhcIikpID8gdHJ1ZSA6IGZhbHNlO1xuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIHZpZXdMaW5rKCRzY29wZSwgcGFnZUlkOnN0cmluZywgJGxvY2F0aW9uLCBmaWxlTmFtZTpzdHJpbmcgPSBudWxsKSB7XG4gICAgdmFyIGxpbms6c3RyaW5nID0gbnVsbDtcbiAgICB2YXIgc3RhcnQgPSBzdGFydExpbmsoJHNjb3BlKTtcbiAgICBpZiAocGFnZUlkKSB7XG4gICAgICAvLyBmaWd1cmUgb3V0IHdoaWNoIHZpZXcgdG8gdXNlIGZvciB0aGlzIHBhZ2VcbiAgICAgIHZhciB2aWV3ID0gaXNJbmRleFBhZ2UocGFnZUlkKSA/IFwiL2Jvb2svXCIgOiBcIi92aWV3L1wiO1xuICAgICAgbGluayA9IHN0YXJ0ICsgdmlldyArIGVuY29kZVBhdGgoQ29yZS50cmltTGVhZGluZyhwYWdlSWQsIFwiL1wiKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIGxldHMgdXNlIHRoZSBjdXJyZW50IHBhdGhcbiAgICAgIHZhciBwYXRoOnN0cmluZyA9ICRsb2NhdGlvbi5wYXRoKCk7XG4gICAgICBsaW5rID0gXCIjXCIgKyBwYXRoLnJlcGxhY2UoLyhlZGl0fGNyZWF0ZSkvLCBcInZpZXdcIik7XG4gICAgfVxuICAgIGlmIChmaWxlTmFtZSAmJiBwYWdlSWQgJiYgcGFnZUlkLmVuZHNXaXRoKGZpbGVOYW1lKSkge1xuICAgICAgcmV0dXJuIGxpbms7XG4gICAgfVxuICAgIGlmIChmaWxlTmFtZSkge1xuICAgICAgaWYgKCFsaW5rLmVuZHNXaXRoKFwiL1wiKSkge1xuICAgICAgICBsaW5rICs9IFwiL1wiO1xuICAgICAgfVxuICAgICAgbGluayArPSBmaWxlTmFtZTtcbiAgICB9XG4gICAgcmV0dXJuIGxpbms7XG4gIH1cblxuICBleHBvcnQgZnVuY3Rpb24gYnJhbmNoTGluaygkc2NvcGUsIHBhZ2VJZDogc3RyaW5nLCAkbG9jYXRpb24sIGZpbGVOYW1lOnN0cmluZyA9IG51bGwpIHtcbiAgICByZXR1cm4gdmlld0xpbmsoJHNjb3BlLCBwYWdlSWQsICRsb2NhdGlvbiwgZmlsZU5hbWUpO1xuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIGVkaXRMaW5rKCRzY29wZSwgcGFnZUlkOnN0cmluZywgJGxvY2F0aW9uKSB7XG4gICAgdmFyIGxpbms6c3RyaW5nID0gbnVsbDtcbiAgICB2YXIgZm9ybWF0ID0gV2lraS5maWxlRm9ybWF0KHBhZ2VJZCk7XG4gICAgc3dpdGNoIChmb3JtYXQpIHtcbiAgICAgIGNhc2UgXCJpbWFnZVwiOlxuICAgICAgICBicmVhaztcbiAgICAgIGRlZmF1bHQ6XG4gICAgICB2YXIgc3RhcnQgPSBzdGFydExpbmsoJHNjb3BlKTtcbiAgICAgIGlmIChwYWdlSWQpIHtcbiAgICAgICAgbGluayA9IHN0YXJ0ICsgXCIvZWRpdC9cIiArIGVuY29kZVBhdGgocGFnZUlkKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIGxldHMgdXNlIHRoZSBjdXJyZW50IHBhdGhcbiAgICAgICAgdmFyIHBhdGggPSAkbG9jYXRpb24ucGF0aCgpO1xuICAgICAgICBsaW5rID0gXCIjXCIgKyBwYXRoLnJlcGxhY2UoLyh2aWV3fGNyZWF0ZSkvLCBcImVkaXRcIik7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBsaW5rO1xuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZUxpbmsoJHNjb3BlLCBwYWdlSWQ6c3RyaW5nLCAkbG9jYXRpb24pIHtcbiAgICB2YXIgcGF0aCA9ICRsb2NhdGlvbi5wYXRoKCk7XG4gICAgdmFyIHN0YXJ0ID0gc3RhcnRMaW5rKCRzY29wZSk7XG4gICAgdmFyIGxpbmsgPSAnJztcbiAgICBpZiAocGFnZUlkKSB7XG4gICAgICBsaW5rID0gc3RhcnQgKyBcIi9jcmVhdGUvXCIgKyBlbmNvZGVQYXRoKHBhZ2VJZCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIGxldHMgdXNlIHRoZSBjdXJyZW50IHBhdGhcbiAgICAgIGxpbmsgPSBcIiNcIiArIHBhdGgucmVwbGFjZSgvKHZpZXd8ZWRpdHxmb3JtVGFibGUpLywgXCJjcmVhdGVcIik7XG4gICAgfVxuICAgIC8vIHdlIGhhdmUgdGhlIGxpbmsgc28gbGV0cyBub3cgcmVtb3ZlIHRoZSBsYXN0IHBhdGhcbiAgICAvLyBvciBpZiB0aGVyZSBpcyBubyAvIGluIHRoZSBwYXRoIHRoZW4gcmVtb3ZlIHRoZSBsYXN0IHNlY3Rpb25cbiAgICB2YXIgaWR4ID0gbGluay5sYXN0SW5kZXhPZihcIi9cIik7XG4gICAgaWYgKGlkeCA+IDAgJiYgISRzY29wZS5jaGlsZHJlbiAmJiAhcGF0aC5zdGFydHNXaXRoKFwiL3dpa2kvZm9ybVRhYmxlXCIpKSB7XG4gICAgICBsaW5rID0gbGluay5zdWJzdHJpbmcoMCwgaWR4ICsgMSk7XG4gICAgfVxuICAgIHJldHVybiBsaW5rO1xuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIGVuY29kZVBhdGgocGFnZUlkOnN0cmluZykge1xuICAgIHJldHVybiBwYWdlSWQuc3BsaXQoXCIvXCIpLm1hcChlbmNvZGVVUklDb21wb25lbnQpLmpvaW4oXCIvXCIpO1xuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIGRlY29kZVBhdGgocGFnZUlkOnN0cmluZykge1xuICAgIHJldHVybiBwYWdlSWQuc3BsaXQoXCIvXCIpLm1hcChkZWNvZGVVUklDb21wb25lbnQpLmpvaW4oXCIvXCIpO1xuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIGZpbGVGb3JtYXQobmFtZTpzdHJpbmcsIGZpbGVFeHRlbnNpb25UeXBlUmVnaXN0cnk/KSB7XG4gICAgdmFyIGV4dGVuc2lvbiA9IGZpbGVFeHRlbnNpb24obmFtZSk7XG4gICAgaWYgKG5hbWUpIHtcbiAgICAgIGlmIChuYW1lID09PSBcIkplbmtpbnNmaWxlXCIpIHtcbiAgICAgICAgZXh0ZW5zaW9uID0gXCJncm9vdnlcIjtcbiAgICAgIH1cbiAgICB9XG4gICAgdmFyIGFuc3dlciA9IG51bGw7XG4gICAgaWYgKCFmaWxlRXh0ZW5zaW9uVHlwZVJlZ2lzdHJ5KSB7XG4gICAgICBmaWxlRXh0ZW5zaW9uVHlwZVJlZ2lzdHJ5ID0gSGF3dGlvQ29yZS5pbmplY3Rvci5nZXQoXCJmaWxlRXh0ZW5zaW9uVHlwZVJlZ2lzdHJ5XCIpO1xuICAgIH1cbiAgICBhbmd1bGFyLmZvckVhY2goZmlsZUV4dGVuc2lvblR5cGVSZWdpc3RyeSwgKGFycmF5LCBrZXkpID0+IHtcbiAgICAgIGlmIChhcnJheS5pbmRleE9mKGV4dGVuc2lvbikgPj0gMCkge1xuICAgICAgICBhbnN3ZXIgPSBrZXk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIGFuc3dlcjtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIHRoZSBmaWxlIG5hbWUgb2YgdGhlIGdpdmVuIHBhdGg7IHN0cmlwcGluZyBvZmYgYW55IGRpcmVjdG9yaWVzXG4gICAqIEBtZXRob2QgZmlsZU5hbWVcbiAgICogQGZvciBXaWtpXG4gICAqIEBzdGF0aWNcbiAgICogQHBhcmFtIHtTdHJpbmd9IHBhdGhcbiAgICogQHJldHVybiB7U3RyaW5nfVxuICAgKi9cbiAgZXhwb3J0IGZ1bmN0aW9uIGZpbGVOYW1lKHBhdGg6IHN0cmluZykge1xuICAgIGlmIChwYXRoKSB7XG4gICAgICAgdmFyIGlkeCA9IHBhdGgubGFzdEluZGV4T2YoXCIvXCIpO1xuICAgICAgaWYgKGlkeCA+IDApIHtcbiAgICAgICAgcmV0dXJuIHBhdGguc3Vic3RyaW5nKGlkeCArIDEpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcGF0aDtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIHRoZSBmb2xkZXIgb2YgdGhlIGdpdmVuIHBhdGggKGV2ZXJ5dGhpbmcgYnV0IHRoZSBsYXN0IHBhdGggbmFtZSlcbiAgICogQG1ldGhvZCBmaWxlUGFyZW50XG4gICAqIEBmb3IgV2lraVxuICAgKiBAc3RhdGljXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoXG4gICAqIEByZXR1cm4ge1N0cmluZ31cbiAgICovXG4gIGV4cG9ydCBmdW5jdGlvbiBmaWxlUGFyZW50KHBhdGg6IHN0cmluZykge1xuICAgIGlmIChwYXRoKSB7XG4gICAgICAgdmFyIGlkeCA9IHBhdGgubGFzdEluZGV4T2YoXCIvXCIpO1xuICAgICAgaWYgKGlkeCA+IDApIHtcbiAgICAgICAgcmV0dXJuIHBhdGguc3Vic3RyaW5nKDAsIGlkeCk7XG4gICAgICB9XG4gICAgfVxuICAgIC8vIGxldHMgcmV0dXJuIHRoZSByb290IGRpcmVjdG9yeVxuICAgIHJldHVybiBcIlwiO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgdGhlIGZpbGUgbmFtZSBmb3IgdGhlIGdpdmVuIG5hbWU7IHdlIGhpZGUgc29tZSBleHRlbnNpb25zXG4gICAqIEBtZXRob2QgaGlkZUZpbmVOYW1lRXh0ZW5zaW9uc1xuICAgKiBAZm9yIFdpa2lcbiAgICogQHN0YXRpY1xuICAgKiBAcGFyYW0ge1N0cmluZ30gbmFtZVxuICAgKiBAcmV0dXJuIHtTdHJpbmd9XG4gICAqL1xuICBleHBvcnQgZnVuY3Rpb24gaGlkZUZpbGVOYW1lRXh0ZW5zaW9ucyhuYW1lKSB7XG4gICAgaWYgKG5hbWUpIHtcbiAgICAgIGFuZ3VsYXIuZm9yRWFjaChXaWtpLmhpZGVFeHRlbnNpb25zLCAoZXh0ZW5zaW9uKSA9PiB7XG4gICAgICAgIGlmIChuYW1lLmVuZHNXaXRoKGV4dGVuc2lvbikpIHtcbiAgICAgICAgICBuYW1lID0gbmFtZS5zdWJzdHJpbmcoMCwgbmFtZS5sZW5ndGggLSBleHRlbnNpb24ubGVuZ3RoKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICAgIHJldHVybiBuYW1lO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgdGhlIFVSTCB0byBwZXJmb3JtIGEgR0VUIG9yIFBPU1QgZm9yIHRoZSBnaXZlbiBicmFuY2ggbmFtZSBhbmQgcGF0aFxuICAgKi9cbiAgZXhwb3J0IGZ1bmN0aW9uIGdpdFJlc3RVUkwoJHNjb3BlLCBwYXRoOiBzdHJpbmcpIHtcbiAgICB2YXIgdXJsID0gZ2l0UmVsYXRpdmVVUkwoJHNjb3BlLCBwYXRoKTtcbiAgICB1cmwgPSBDb3JlLnVybCgnLycgKyB1cmwpO1xuXG4vKlxuICAgIHZhciBjb25uZWN0aW9uTmFtZSA9IENvcmUuZ2V0Q29ubmVjdGlvbk5hbWVQYXJhbWV0ZXIoKTtcbiAgICBpZiAoY29ubmVjdGlvbk5hbWUpIHtcbiAgICAgIHZhciBjb25uZWN0aW9uT3B0aW9ucyA9IENvcmUuZ2V0Q29ubmVjdE9wdGlvbnMoY29ubmVjdGlvbk5hbWUpO1xuICAgICAgaWYgKGNvbm5lY3Rpb25PcHRpb25zKSB7XG4gICAgICAgIGNvbm5lY3Rpb25PcHRpb25zLnBhdGggPSB1cmw7XG4gICAgICAgIHVybCA9IDxzdHJpbmc+Q29yZS5jcmVhdGVTZXJ2ZXJDb25uZWN0aW9uVXJsKGNvbm5lY3Rpb25PcHRpb25zKTtcbiAgICAgIH1cbiAgICB9XG5cbiovXG4gICAgcmV0dXJuIHVybDtcbiAgfVxuXG4gICAgZnVuY3Rpb24gZ2l0VXJsUHJlZml4KCkge1xuICAgICAgICB2YXIgcHJlZml4ID0gXCJcIjtcbiAgICAgICAgdmFyIGluamVjdG9yID0gSGF3dGlvQ29yZS5pbmplY3RvcjtcbiAgICAgICAgaWYgKGluamVjdG9yKSB7XG4gICAgICAgICAgICBwcmVmaXggPSBpbmplY3Rvci5nZXQoXCJXaWtpR2l0VXJsUHJlZml4XCIpIHx8IFwiXCI7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHByZWZpeDtcbiAgICB9XG5cbiAgICAvKipcbiAgICogUmV0dXJucyBhIHJlbGF0aXZlIFVSTCB0byBwZXJmb3JtIGEgR0VUIG9yIFBPU1QgZm9yIHRoZSBnaXZlbiBicmFuY2gvcGF0aFxuICAgKi9cbiAgZXhwb3J0IGZ1bmN0aW9uIGdpdFJlbGF0aXZlVVJMKCRzY29wZSwgcGF0aDogc3RyaW5nKSB7XG4gICAgICB2YXIgYnJhbmNoID0gJHNjb3BlLmJyYW5jaDtcbiAgICB2YXIgcHJlZml4ID0gZ2l0VXJsUHJlZml4KCk7XG4gICAgYnJhbmNoID0gYnJhbmNoIHx8IFwibWFzdGVyXCI7XG4gICAgcGF0aCA9IHBhdGggfHwgXCIvXCI7XG4gICAgcmV0dXJuIFVybEhlbHBlcnMuam9pbihwcmVmaXgsIFwiZ2l0L1wiICsgYnJhbmNoLCBwYXRoKTtcbiAgfVxuXG5cbiAgLyoqXG4gICAqIFRha2VzIGEgcm93IGNvbnRhaW5pbmcgdGhlIGVudGl0eSBvYmplY3Q7IG9yIGNhbiB0YWtlIHRoZSBlbnRpdHkgZGlyZWN0bHkuXG4gICAqXG4gICAqIEl0IHRoZW4gdXNlcyB0aGUgbmFtZSwgZGlyZWN0b3J5IGFuZCB4bWxOYW1lc3BhY2VzIHByb3BlcnRpZXNcbiAgICpcbiAgICogQG1ldGhvZCBmaWxlSWNvbkh0bWxcbiAgICogQGZvciBXaWtpXG4gICAqIEBzdGF0aWNcbiAgICogQHBhcmFtIHthbnl9IHJvd1xuICAgKiBAcmV0dXJuIHtTdHJpbmd9XG4gICAqXG4gICAqL1xuICBleHBvcnQgZnVuY3Rpb24gZmlsZUljb25IdG1sKHJvdykge1xuICAgIHZhciBuYW1lID0gcm93Lm5hbWU7XG4gICAgdmFyIHBhdGggPSByb3cucGF0aDtcbiAgICB2YXIgYnJhbmNoID0gcm93LmJyYW5jaCA7XG4gICAgdmFyIGRpcmVjdG9yeSA9IHJvdy5kaXJlY3Rvcnk7XG4gICAgdmFyIHhtbE5hbWVzcGFjZXMgPSByb3cueG1sX25hbWVzcGFjZXMgfHwgcm93LnhtbE5hbWVzcGFjZXM7XG4gICAgdmFyIGljb25VcmwgPSByb3cuaWNvblVybDtcbiAgICB2YXIgZW50aXR5ID0gcm93LmVudGl0eTtcbiAgICBpZiAoZW50aXR5KSB7XG4gICAgICBuYW1lID0gbmFtZSB8fCBlbnRpdHkubmFtZTtcbiAgICAgIHBhdGggPSBwYXRoIHx8IGVudGl0eS5wYXRoO1xuICAgICAgYnJhbmNoID0gYnJhbmNoIHx8IGVudGl0eS5icmFuY2g7XG4gICAgICBkaXJlY3RvcnkgPSBkaXJlY3RvcnkgfHwgZW50aXR5LmRpcmVjdG9yeTtcbiAgICAgIHhtbE5hbWVzcGFjZXMgPSB4bWxOYW1lc3BhY2VzIHx8IGVudGl0eS54bWxfbmFtZXNwYWNlcyB8fCBlbnRpdHkueG1sTmFtZXNwYWNlcztcbiAgICAgIGljb25VcmwgPSBpY29uVXJsIHx8IGVudGl0eS5pY29uVXJsO1xuICAgIH1cbiAgICBicmFuY2ggPSBicmFuY2ggfHwgXCJtYXN0ZXJcIjtcbiAgICB2YXIgY3NzID0gbnVsbDtcbiAgICB2YXIgaWNvbjpzdHJpbmcgPSBudWxsO1xuICAgIHZhciBleHRlbnNpb24gPSBmaWxlRXh0ZW5zaW9uKG5hbWUpO1xuICAgIC8vIFRPRE8gY291bGQgd2UgdXNlIGRpZmZlcmVudCBpY29ucyBmb3IgbWFya2Rvd24gdiB4bWwgdiBodG1sXG4gICAgaWYgKHhtbE5hbWVzcGFjZXMgJiYgeG1sTmFtZXNwYWNlcy5sZW5ndGgpIHtcbiAgICAgIGlmICh4bWxOYW1lc3BhY2VzLmFueSgobnMpID0+IFdpa2kuY2FtZWxOYW1lc3BhY2VzLmFueShucykpKSB7XG4gICAgICAgIGljb24gPSBcImltZy9pY29ucy9jYW1lbC5zdmdcIjtcbiAgICAgIH0gZWxzZSBpZiAoeG1sTmFtZXNwYWNlcy5hbnkoKG5zKSA9PiBXaWtpLmRvemVyTmFtZXNwYWNlcy5hbnkobnMpKSkge1xuICAgICAgICBpY29uID0gXCJpbWcvaWNvbnMvZG96ZXIvZG96ZXIuZ2lmXCI7XG4gICAgICB9IGVsc2UgaWYgKHhtbE5hbWVzcGFjZXMuYW55KChucykgPT4gV2lraS5hY3RpdmVtcU5hbWVzcGFjZXMuYW55KG5zKSkpIHtcbiAgICAgICAgaWNvbiA9IFwiaW1nL2ljb25zL21lc3NhZ2Vicm9rZXIuc3ZnXCI7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBsb2cuZGVidWcoXCJmaWxlIFwiICsgbmFtZSArIFwiIGhhcyBuYW1lc3BhY2VzIFwiICsgeG1sTmFtZXNwYWNlcyk7XG4gICAgICB9XG4gICAgfVxuICAgIGlmICghaWNvblVybCAmJiBuYW1lKSB7XG4gICAgICB2YXIgbG93ZXJOYW1lID0gbmFtZS50b0xvd2VyQ2FzZSgpO1xuICAgICAgaWYgKGxvd2VyTmFtZSA9PSBcInBvbS54bWxcIikge1xuICAgICAgICBpY29uVXJsID0gXCJpbWcvbWF2ZW4taWNvbi5wbmdcIjtcbiAgICAgIH0gZWxzZSBpZiAobG93ZXJOYW1lID09IFwiamVua2luc2ZpbGVcIikge1xuICAgICAgICBpY29uVXJsID0gXCJpbWcvamVua2lucy1pY29uLnN2Z1wiO1xuICAgICAgfSBlbHNlIGlmIChsb3dlck5hbWUgPT0gXCJmYWJyaWM4LnltbFwiKSB7XG4gICAgICAgIGljb25VcmwgPSBcImltZy9mYWJyaWM4X2ljb24uc3ZnXCI7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKGljb25VcmwpIHtcbiAgICAgIGNzcyA9IG51bGw7XG4gICAgICBpY29uID0gaWNvblVybDtcbi8qXG4gICAgICB2YXIgcHJlZml4ID0gZ2l0VXJsUHJlZml4KCk7XG4gICAgICBpY29uID0gVXJsSGVscGVycy5qb2luKHByZWZpeCwgXCJnaXRcIiwgaWNvblVybCk7XG4qL1xuLypcbiAgICAgIHZhciBjb25uZWN0aW9uTmFtZSA9IENvcmUuZ2V0Q29ubmVjdGlvbk5hbWVQYXJhbWV0ZXIoKTtcbiAgICAgIGlmIChjb25uZWN0aW9uTmFtZSkge1xuICAgICAgICB2YXIgY29ubmVjdGlvbk9wdGlvbnMgPSBDb3JlLmdldENvbm5lY3RPcHRpb25zKGNvbm5lY3Rpb25OYW1lKTtcbiAgICAgICAgaWYgKGNvbm5lY3Rpb25PcHRpb25zKSB7XG4gICAgICAgICAgY29ubmVjdGlvbk9wdGlvbnMucGF0aCA9IENvcmUudXJsKCcvJyArIGljb24pO1xuICAgICAgICAgIGljb24gPSA8c3RyaW5nPkNvcmUuY3JlYXRlU2VydmVyQ29ubmVjdGlvblVybChjb25uZWN0aW9uT3B0aW9ucyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiovXG4gICAgfVxuICAgIGlmICghaWNvbikge1xuICAgICAgaWYgKGRpcmVjdG9yeSkge1xuICAgICAgICBzd2l0Y2ggKGV4dGVuc2lvbikge1xuICAgICAgICAgIGNhc2UgJ3Byb2ZpbGUnOlxuICAgICAgICAgICAgY3NzID0gXCJmYSBmYS1ib29rXCI7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgLy8gbG9nLmRlYnVnKFwiTm8gbWF0Y2ggZm9yIGV4dGVuc2lvbjogXCIsIGV4dGVuc2lvbiwgXCIgdXNpbmcgYSBnZW5lcmljIGZvbGRlciBpY29uXCIpO1xuICAgICAgICAgICAgY3NzID0gXCJmYSBmYS1mb2xkZXIgZm9sZGVyLWljb25cIjtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc3dpdGNoIChleHRlbnNpb24pIHtcbiAgICAgICAgICBjYXNlICdqYXZhJzpcbiAgICAgICAgICAgIGljb24gPSBcImltZy9qYXZhLnN2Z1wiO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgY2FzZSAncG5nJzpcbiAgICAgICAgICBjYXNlICdzdmcnOlxuICAgICAgICAgIGNhc2UgJ2pwZyc6XG4gICAgICAgICAgY2FzZSAnZ2lmJzpcbiAgICAgICAgICAgIGNzcyA9IG51bGw7XG4gICAgICAgICAgICBpY29uID0gV2lraS5naXRSZWxhdGl2ZVVSTChicmFuY2gsIHBhdGgpO1xuLypcbiAgICAgICAgICAgIHZhciBjb25uZWN0aW9uTmFtZSA9IENvcmUuZ2V0Q29ubmVjdGlvbk5hbWVQYXJhbWV0ZXIoKTtcbiAgICAgICAgICAgIGlmIChjb25uZWN0aW9uTmFtZSkge1xuICAgICAgICAgICAgICB2YXIgY29ubmVjdGlvbk9wdGlvbnMgPSBDb3JlLmdldENvbm5lY3RPcHRpb25zKGNvbm5lY3Rpb25OYW1lKTtcbiAgICAgICAgICAgICAgaWYgKGNvbm5lY3Rpb25PcHRpb25zKSB7XG4gICAgICAgICAgICAgICAgY29ubmVjdGlvbk9wdGlvbnMucGF0aCA9IENvcmUudXJsKCcvJyArIGljb24pO1xuICAgICAgICAgICAgICAgIGljb24gPSA8c3RyaW5nPkNvcmUuY3JlYXRlU2VydmVyQ29ubmVjdGlvblVybChjb25uZWN0aW9uT3B0aW9ucyk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiovXG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICBjYXNlICdqc29uJzpcbiAgICAgICAgICBjYXNlICd4bWwnOlxuICAgICAgICAgICAgY3NzID0gXCJmYSBmYS1maWxlLXRleHRcIjtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIGNhc2UgJ21kJzpcbiAgICAgICAgICAgIGNzcyA9IFwiZmEgZmEtZmlsZS10ZXh0LW9cIjtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAvLyBsb2cuZGVidWcoXCJObyBtYXRjaCBmb3IgZXh0ZW5zaW9uOiBcIiwgZXh0ZW5zaW9uLCBcIiB1c2luZyBhIGdlbmVyaWMgZmlsZSBpY29uXCIpO1xuICAgICAgICAgICAgY3NzID0gXCJmYSBmYS1maWxlLW9cIjtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICBpZiAoaWNvbikge1xuICAgICAgcmV0dXJuIFwiPGltZyBzcmM9J1wiICsgQ29yZS51cmwoaWNvbikgKyBcIic+XCI7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBcIjxpIGNsYXNzPSdcIiArIGNzcyArIFwiJz48L2k+XCI7XG4gICAgfVxuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIGljb25DbGFzcyhyb3cpIHtcbiAgICB2YXIgbmFtZSA9IHJvdy5nZXRQcm9wZXJ0eShcIm5hbWVcIik7XG4gICAgdmFyIGV4dGVuc2lvbiA9IGZpbGVFeHRlbnNpb24obmFtZSk7XG4gICAgdmFyIGRpcmVjdG9yeSA9IHJvdy5nZXRQcm9wZXJ0eShcImRpcmVjdG9yeVwiKTtcbiAgICBpZiAoZGlyZWN0b3J5KSB7XG4gICAgICByZXR1cm4gXCJmYSBmYS1mb2xkZXJcIjtcbiAgICB9XG4gICAgaWYgKFwieG1sXCIgPT09IGV4dGVuc2lvbikge1xuICAgICAgICByZXR1cm4gXCJmYSBmYS1jb2dcIjtcbiAgICB9IGVsc2UgaWYgKFwibWRcIiA9PT0gZXh0ZW5zaW9uKSB7XG4gICAgICAgIHJldHVybiBcImZhIGZhLWZpbGUtdGV4dC1vXCI7XG4gICAgfVxuICAgIC8vIFRPRE8gY291bGQgd2UgdXNlIGRpZmZlcmVudCBpY29ucyBmb3IgbWFya2Rvd24gdiB4bWwgdiBodG1sXG4gICAgcmV0dXJuIFwiZmEgZmEtZmlsZS1vXCI7XG4gIH1cblxuXG4gIC8qKlxuICAgKiBFeHRyYWN0cyB0aGUgcGFnZUlkLCBicmFuY2gsIG9iamVjdElkIGZyb20gdGhlIHJvdXRlIHBhcmFtZXRlcnNcbiAgICogQG1ldGhvZCBpbml0U2NvcGVcbiAgICogQGZvciBXaWtpXG4gICAqIEBzdGF0aWNcbiAgICogQHBhcmFtIHsqfSAkc2NvcGVcbiAgICogQHBhcmFtIHthbnl9ICRyb3V0ZVBhcmFtc1xuICAgKiBAcGFyYW0ge25nLklMb2NhdGlvblNlcnZpY2V9ICRsb2NhdGlvblxuICAgKi9cbiAgZXhwb3J0IGZ1bmN0aW9uIGluaXRTY29wZSgkc2NvcGUsICRyb3V0ZVBhcmFtcywgJGxvY2F0aW9uKSB7XG4gICAgJHNjb3BlLnBhZ2VJZCA9IFdpa2kucGFnZUlkKCRyb3V0ZVBhcmFtcywgJGxvY2F0aW9uKTtcbiAgICAkc2NvcGUub3duZXIgPSAkcm91dGVQYXJhbXNbXCJvd25lclwiXTtcbiAgICAkc2NvcGUucmVwb0lkID0gJHJvdXRlUGFyYW1zW1wicmVwb0lkXCJdO1xuICAgICRzY29wZS5wcm9qZWN0SWQgPSAkcm91dGVQYXJhbXNbXCJwcm9qZWN0SWRcIl07XG4gICAgJHNjb3BlLm5hbWVzcGFjZSA9ICRyb3V0ZVBhcmFtc1tcIm5hbWVzcGFjZVwiXTtcbiAgICAkc2NvcGUuYnJhbmNoID0gJHJvdXRlUGFyYW1zW1wiYnJhbmNoXCJdIHx8ICRsb2NhdGlvbi5zZWFyY2goKVtcImJyYW5jaFwiXTtcbiAgICAkc2NvcGUub2JqZWN0SWQgPSAkcm91dGVQYXJhbXNbXCJvYmplY3RJZFwiXSB8fCAkcm91dGVQYXJhbXNbXCJkaWZmT2JqZWN0SWQxXCJdO1xuICAgICRzY29wZS5zdGFydExpbmsgPSBzdGFydExpbmsoJHNjb3BlKTtcbiAgICAkc2NvcGUuJHZpZXdMaW5rID0gdmlld0xpbmsoJHNjb3BlLCAkc2NvcGUucGFnZUlkLCAkbG9jYXRpb24pO1xuICAgICRzY29wZS5oaXN0b3J5TGluayA9IHN0YXJ0TGluaygkc2NvcGUpICsgXCIvaGlzdG9yeS9cIiArICgkc2NvcGUucGFnZUlkIHx8IFwiXCIpO1xuICAgICRzY29wZS53aWtpUmVwb3NpdG9yeSA9IG5ldyBHaXRXaWtpUmVwb3NpdG9yeSgkc2NvcGUpO1xuXG4gICAgJHNjb3BlLiR3b3Jrc3BhY2VMaW5rID0gRGV2ZWxvcGVyLndvcmtzcGFjZUxpbmsoKTtcbiAgICAkc2NvcGUuJHByb2plY3RMaW5rID0gRGV2ZWxvcGVyLnByb2plY3RMaW5rKCRzY29wZS5wcm9qZWN0SWQpO1xuICAgICRzY29wZS5icmVhZGNydW1iQ29uZmlnID0gRGV2ZWxvcGVyLmNyZWF0ZVByb2plY3RCcmVhZGNydW1icygkc2NvcGUucHJvamVjdElkLCBjcmVhdGVTb3VyY2VCcmVhZGNydW1icygkc2NvcGUpKTtcbiAgICAkc2NvcGUuc3ViVGFiQ29uZmlnID0gRGV2ZWxvcGVyLmNyZWF0ZVByb2plY3RTdWJOYXZCYXJzKCRzY29wZS5wcm9qZWN0SWQpO1xuICB9XG5cbiAgLyoqXG4gICAqIExvYWRzIHRoZSBicmFuY2hlcyBmb3IgdGhpcyB3aWtpIHJlcG9zaXRvcnkgYW5kIHN0b3JlcyB0aGVtIGluIHRoZSBicmFuY2hlcyBwcm9wZXJ0eSBpblxuICAgKiB0aGUgJHNjb3BlIGFuZCBlbnN1cmVzICRzY29wZS5icmFuY2ggaXMgc2V0IHRvIGEgdmFsaWQgdmFsdWVcbiAgICpcbiAgICogQHBhcmFtIHdpa2lSZXBvc2l0b3J5XG4gICAqIEBwYXJhbSAkc2NvcGVcbiAgICogQHBhcmFtIGlzRm1jIHdoZXRoZXIgd2UgcnVuIGFzIGZhYnJpYzggb3IgYXMgaGF3dGlvXG4gICAqL1xuICBleHBvcnQgZnVuY3Rpb24gbG9hZEJyYW5jaGVzKGpvbG9raWEsIHdpa2lSZXBvc2l0b3J5LCAkc2NvcGUsIGlzRm1jID0gZmFsc2UpIHtcbiAgICB3aWtpUmVwb3NpdG9yeS5icmFuY2hlcygocmVzcG9uc2UpID0+IHtcbiAgICAgIC8vIGxldHMgc29ydCBieSB2ZXJzaW9uIG51bWJlclxuICAgICAgJHNjb3BlLmJyYW5jaGVzID0gcmVzcG9uc2Uuc29ydEJ5KCh2KSA9PiBDb3JlLnZlcnNpb25Ub1NvcnRhYmxlU3RyaW5nKHYpLCB0cnVlKTtcblxuICAgICAgLy8gZGVmYXVsdCB0aGUgYnJhbmNoIG5hbWUgaWYgd2UgaGF2ZSAnbWFzdGVyJ1xuICAgICAgaWYgKCEkc2NvcGUuYnJhbmNoICYmICRzY29wZS5icmFuY2hlcy5maW5kKChicmFuY2gpID0+IHtcbiAgICAgICAgcmV0dXJuIGJyYW5jaCA9PT0gXCJtYXN0ZXJcIjtcbiAgICAgIH0pKSB7XG4gICAgICAgICRzY29wZS5icmFuY2ggPSBcIm1hc3RlclwiO1xuICAgICAgfVxuICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBFeHRyYWN0cyB0aGUgcGFnZUlkIGZyb20gdGhlIHJvdXRlIHBhcmFtZXRlcnNcbiAgICogQG1ldGhvZCBwYWdlSWRcbiAgICogQGZvciBXaWtpXG4gICAqIEBzdGF0aWNcbiAgICogQHBhcmFtIHthbnl9ICRyb3V0ZVBhcmFtc1xuICAgKiBAcGFyYW0gQG5nLklMb2NhdGlvblNlcnZpY2UgQGxvY2F0aW9uXG4gICAqIEByZXR1cm4ge1N0cmluZ31cbiAgICovXG4gIGV4cG9ydCBmdW5jdGlvbiBwYWdlSWQoJHJvdXRlUGFyYW1zLCAkbG9jYXRpb24pIHtcbiAgICB2YXIgcGFnZUlkID0gJHJvdXRlUGFyYW1zWydwYWdlJ107XG4gICAgaWYgKCFwYWdlSWQpIHtcbiAgICAgIC8vIExldHMgZGVhbCB3aXRoIHRoZSBoYWNrIG9mIEFuZ3VsYXJKUyBub3Qgc3VwcG9ydGluZyAvIGluIGEgcGF0aCB2YXJpYWJsZVxuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCAxMDA7IGkrKykge1xuICAgICAgICB2YXIgdmFsdWUgPSAkcm91dGVQYXJhbXNbJ3BhdGgnICsgaV07XG4gICAgICAgIGlmIChhbmd1bGFyLmlzRGVmaW5lZCh2YWx1ZSkpIHtcbiAgICAgICAgICBpZiAoIXBhZ2VJZCkge1xuICAgICAgICAgICAgcGFnZUlkID0gdmFsdWU7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHBhZ2VJZCArPSBcIi9cIiArIHZhbHVlO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGJyZWFrO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHBhZ2VJZCB8fCBcIi9cIjtcbiAgICB9XG5cbiAgICAvLyBpZiBubyAkcm91dGVQYXJhbXMgdmFyaWFibGVzIGxldHMgZmlndXJlIGl0IG91dCBmcm9tIHRoZSAkbG9jYXRpb25cbiAgICBpZiAoIXBhZ2VJZCkge1xuICAgICAgcGFnZUlkID0gcGFnZUlkRnJvbVVSSSgkbG9jYXRpb24ucGF0aCgpKTtcbiAgICB9XG4gICAgcmV0dXJuIHBhZ2VJZDtcbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiBwYWdlSWRGcm9tVVJJKHVybDpzdHJpbmcpIHtcbiAgICB2YXIgd2lraVByZWZpeCA9IFwiL3dpa2kvXCI7XG4gICAgaWYgKHVybCAmJiB1cmwuc3RhcnRzV2l0aCh3aWtpUHJlZml4KSkge1xuICAgICAgdmFyIGlkeCA9IHVybC5pbmRleE9mKFwiL1wiLCB3aWtpUHJlZml4Lmxlbmd0aCArIDEpO1xuICAgICAgaWYgKGlkeCA+IDApIHtcbiAgICAgICAgcmV0dXJuIHVybC5zdWJzdHJpbmcoaWR4ICsgMSwgdXJsLmxlbmd0aClcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG51bGxcblxuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIGZpbGVFeHRlbnNpb24obmFtZSkge1xuICAgIGlmIChuYW1lLmluZGV4T2YoJyMnKSA+IDApXG4gICAgICBuYW1lID0gbmFtZS5zdWJzdHJpbmcoMCwgbmFtZS5pbmRleE9mKCcjJykpO1xuICAgIHJldHVybiBDb3JlLmZpbGVFeHRlbnNpb24obmFtZSwgXCJtYXJrZG93blwiKTtcbiAgfVxuXG5cbiAgZXhwb3J0IGZ1bmN0aW9uIG9uQ29tcGxldGUoc3RhdHVzKSB7XG4gICAgY29uc29sZS5sb2coXCJDb21wbGV0ZWQgb3BlcmF0aW9uIHdpdGggc3RhdHVzOiBcIiArIEpTT04uc3RyaW5naWZ5KHN0YXR1cykpO1xuICB9XG5cbiAgLyoqXG4gICAqIFBhcnNlcyB0aGUgZ2l2ZW4gSlNPTiB0ZXh0IHJlcG9ydGluZyB0byB0aGUgdXNlciBpZiB0aGVyZSBpcyBhIHBhcnNlIGVycm9yXG4gICAqIEBtZXRob2QgcGFyc2VKc29uXG4gICAqIEBmb3IgV2lraVxuICAgKiBAc3RhdGljXG4gICAqIEBwYXJhbSB7U3RyaW5nfSB0ZXh0XG4gICAqIEByZXR1cm4ge2FueX1cbiAgICovXG4gIGV4cG9ydCBmdW5jdGlvbiBwYXJzZUpzb24odGV4dDpzdHJpbmcpIHtcbiAgICBpZiAodGV4dCkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgcmV0dXJuIEpTT04ucGFyc2UodGV4dCk7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIENvcmUubm90aWZpY2F0aW9uKFwiZXJyb3JcIiwgXCJGYWlsZWQgdG8gcGFyc2UgSlNPTjogXCIgKyBlKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICAvKipcbiAgICogQWRqdXN0cyBhIHJlbGF0aXZlIG9yIGFic29sdXRlIGxpbmsgZnJvbSBhIHdpa2kgb3IgZmlsZSBzeXN0ZW0gdG8gb25lIHVzaW5nIHRoZSBoYXNoIGJhbmcgc3ludGF4XG4gICAqIEBtZXRob2QgYWRqdXN0SHJlZlxuICAgKiBAZm9yIFdpa2lcbiAgICogQHN0YXRpY1xuICAgKiBAcGFyYW0geyp9ICRzY29wZVxuICAgKiBAcGFyYW0ge25nLklMb2NhdGlvblNlcnZpY2V9ICRsb2NhdGlvblxuICAgKiBAcGFyYW0ge1N0cmluZ30gaHJlZlxuICAgKiBAcGFyYW0ge1N0cmluZ30gZmlsZUV4dGVuc2lvblxuICAgKiBAcmV0dXJuIHtzdHJpbmd9XG4gICAqL1xuICBleHBvcnQgZnVuY3Rpb24gYWRqdXN0SHJlZigkc2NvcGUsICRsb2NhdGlvbiwgaHJlZiwgZmlsZUV4dGVuc2lvbikge1xuICAgIHZhciBleHRlbnNpb24gPSBmaWxlRXh0ZW5zaW9uID8gXCIuXCIgKyBmaWxlRXh0ZW5zaW9uIDogXCJcIjtcblxuICAgIC8vIGlmIHRoZSBsYXN0IHBhcnQgb2YgdGhlIHBhdGggaGFzIGEgZG90IGluIGl0IGxldHNcbiAgICAvLyBleGNsdWRlIGl0IGFzIHdlIGFyZSByZWxhdGl2ZSB0byBhIG1hcmtkb3duIG9yIGh0bWwgZmlsZSBpbiBhIGZvbGRlclxuICAgIC8vIHN1Y2ggYXMgd2hlbiB2aWV3aW5nIHJlYWRtZS5tZCBvciBpbmRleC5tZFxuICAgIHZhciBwYXRoID0gJGxvY2F0aW9uLnBhdGgoKTtcbiAgICB2YXIgZm9sZGVyUGF0aCA9IHBhdGg7XG4gICAgdmFyIGlkeCA9IHBhdGgubGFzdEluZGV4T2YoXCIvXCIpO1xuICAgIGlmIChpZHggPiAwKSB7XG4gICAgICB2YXIgbGFzdE5hbWUgPSBwYXRoLnN1YnN0cmluZyhpZHggKyAxKTtcbiAgICAgIGlmIChsYXN0TmFtZS5pbmRleE9mKFwiLlwiKSA+PSAwKSB7XG4gICAgICAgIGZvbGRlclBhdGggPSBwYXRoLnN1YnN0cmluZygwLCBpZHgpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIERlYWwgd2l0aCByZWxhdGl2ZSBVUkxzIGZpcnN0Li4uXG4gICAgaWYgKGhyZWYuc3RhcnRzV2l0aCgnLi4vJykpIHtcbiAgICAgIHZhciBwYXJ0cyA9IGhyZWYuc3BsaXQoJy8nKTtcbiAgICAgIHZhciBwYXRoUGFydHMgPSBmb2xkZXJQYXRoLnNwbGl0KCcvJyk7XG4gICAgICB2YXIgcGFyZW50cyA9IHBhcnRzLmZpbHRlcigocGFydCkgPT4ge1xuICAgICAgICByZXR1cm4gcGFydCA9PT0gXCIuLlwiO1xuICAgICAgfSk7XG4gICAgICBwYXJ0cyA9IHBhcnRzLmxhc3QocGFydHMubGVuZ3RoIC0gcGFyZW50cy5sZW5ndGgpO1xuICAgICAgcGF0aFBhcnRzID0gcGF0aFBhcnRzLmZpcnN0KHBhdGhQYXJ0cy5sZW5ndGggLSBwYXJlbnRzLmxlbmd0aCk7XG5cbiAgICAgIHJldHVybiAnIycgKyBwYXRoUGFydHMuam9pbignLycpICsgJy8nICsgcGFydHMuam9pbignLycpICsgZXh0ZW5zaW9uICsgJGxvY2F0aW9uLmhhc2goKTtcbiAgICB9XG5cbiAgICAvLyBUdXJuIGFuIGFic29sdXRlIGxpbmsgaW50byBhIHdpa2kgbGluay4uLlxuICAgIGlmIChocmVmLnN0YXJ0c1dpdGgoJy8nKSkge1xuICAgICAgcmV0dXJuIFdpa2kuYnJhbmNoTGluaygkc2NvcGUsIGhyZWYgKyBleHRlbnNpb24sICRsb2NhdGlvbikgKyBleHRlbnNpb247XG4gICAgfVxuXG4gICAgaWYgKCFXaWtpLmV4Y2x1ZGVBZGp1c3RtZW50UHJlZml4ZXMuYW55KChleGNsdWRlKSA9PiB7XG4gICAgICByZXR1cm4gaHJlZi5zdGFydHNXaXRoKGV4Y2x1ZGUpO1xuICAgIH0pKSB7XG4gICAgICByZXR1cm4gJyMnICsgZm9sZGVyUGF0aCArIFwiL1wiICsgaHJlZiArIGV4dGVuc2lvbiArICRsb2NhdGlvbi5oYXNoKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgfVxufVxuIiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL2luY2x1ZGVzLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIndpa2lIZWxwZXJzLnRzXCIvPlxuXG4vKipcbiAqIEBtb2R1bGUgV2lraVxuICogQG1haW4gV2lraVxuICovXG5tb2R1bGUgV2lraSB7XG5cbiAgZXhwb3J0IHZhciBwbHVnaW5OYW1lID0gJ3dpa2knO1xuICBleHBvcnQgdmFyIHRlbXBsYXRlUGF0aCA9ICdwbHVnaW5zL3dpa2kvaHRtbC8nO1xuICBleHBvcnQgdmFyIHRhYjphbnkgPSBudWxsO1xuXG4gIGV4cG9ydCB2YXIgX21vZHVsZSA9IGFuZ3VsYXIubW9kdWxlKHBsdWdpbk5hbWUsIFsnaGF3dGlvLWNvcmUnLCAnaGF3dGlvLXVpJywgJ3RyZWVDb250cm9sJywgJ3VpLmNvZGVtaXJyb3InXSk7XG4gIGV4cG9ydCB2YXIgY29udHJvbGxlciA9IFBsdWdpbkhlbHBlcnMuY3JlYXRlQ29udHJvbGxlckZ1bmN0aW9uKF9tb2R1bGUsICdXaWtpJyk7XG4gIGV4cG9ydCB2YXIgcm91dGUgPSBQbHVnaW5IZWxwZXJzLmNyZWF0ZVJvdXRpbmdGdW5jdGlvbih0ZW1wbGF0ZVBhdGgpO1xuXG4gIF9tb2R1bGUuY29uZmlnKFtcIiRyb3V0ZVByb3ZpZGVyXCIsICgkcm91dGVQcm92aWRlcikgPT4ge1xuXG4gICAgLy8gYWxsb3cgb3B0aW9uYWwgYnJhbmNoIHBhdGhzLi4uXG4gICAgYW5ndWxhci5mb3JFYWNoKFtcIlwiLCBcIi9icmFuY2gvOmJyYW5jaFwiXSwgKHBhdGgpID0+IHtcbiAgICAgIC8vdmFyIHN0YXJ0Q29udGV4dCA9ICcvd2lraSc7XG4gICAgICB2YXIgc3RhcnRDb250ZXh0ID0gJy93b3Jrc3BhY2VzLzpuYW1lc3BhY2UvcHJvamVjdHMvOnByb2plY3RJZC93aWtpLzpvd25lci86cmVwb0lkJztcbiAgICAgICRyb3V0ZVByb3ZpZGVyLlxuICAgICAgICAgICAgICB3aGVuKFVybEhlbHBlcnMuam9pbihzdGFydENvbnRleHQsIHBhdGgsICd2aWV3JyksIHJvdXRlKCd2aWV3UGFnZS5odG1sJywgZmFsc2UpKS5cbiAgICAgICAgICAgICAgd2hlbihVcmxIZWxwZXJzLmpvaW4oc3RhcnRDb250ZXh0LCBwYXRoLCAnY3JlYXRlLzpwYWdlKicpLCByb3V0ZSgnY3JlYXRlLmh0bWwnLCBmYWxzZSkpLlxuICAgICAgICAgICAgICB3aGVuKHN0YXJ0Q29udGV4dCArIHBhdGggKyAnL3ZpZXcvOnBhZ2UqJywge3RlbXBsYXRlVXJsOiAncGx1Z2lucy93aWtpL2h0bWwvdmlld1BhZ2UuaHRtbCcsIHJlbG9hZE9uU2VhcmNoOiBmYWxzZX0pLlxuICAgICAgICAgICAgICB3aGVuKHN0YXJ0Q29udGV4dCArIHBhdGggKyAnL2Jvb2svOnBhZ2UqJywge3RlbXBsYXRlVXJsOiAncGx1Z2lucy93aWtpL2h0bWwvdmlld0Jvb2suaHRtbCcsIHJlbG9hZE9uU2VhcmNoOiBmYWxzZX0pLlxuICAgICAgICAgICAgICB3aGVuKHN0YXJ0Q29udGV4dCArIHBhdGggKyAnL2VkaXQvOnBhZ2UqJywge3RlbXBsYXRlVXJsOiAncGx1Z2lucy93aWtpL2h0bWwvZWRpdFBhZ2UuaHRtbCd9KS5cbiAgICAgICAgICAgICAgd2hlbihzdGFydENvbnRleHQgKyBwYXRoICsgJy92ZXJzaW9uLzpwYWdlKlxcLzpvYmplY3RJZCcsIHt0ZW1wbGF0ZVVybDogJ3BsdWdpbnMvd2lraS9odG1sL3ZpZXdQYWdlLmh0bWwnfSkuXG4gICAgICAgICAgICAgIHdoZW4oc3RhcnRDb250ZXh0ICsgcGF0aCArICcvaGlzdG9yeS86cGFnZSonLCB7dGVtcGxhdGVVcmw6ICdwbHVnaW5zL3dpa2kvaHRtbC9oaXN0b3J5Lmh0bWwnfSkuXG4gICAgICAgICAgICAgIHdoZW4oc3RhcnRDb250ZXh0ICsgcGF0aCArICcvY29tbWl0LzpwYWdlKlxcLzpvYmplY3RJZCcsIHt0ZW1wbGF0ZVVybDogJ3BsdWdpbnMvd2lraS9odG1sL2NvbW1pdC5odG1sJ30pLlxuICAgICAgICAgICAgICB3aGVuKHN0YXJ0Q29udGV4dCArIHBhdGggKyAnL2RpZmYvOnBhZ2UqXFwvOmRpZmZPYmplY3RJZDEvOmRpZmZPYmplY3RJZDInLCB7dGVtcGxhdGVVcmw6ICdwbHVnaW5zL3dpa2kvaHRtbC92aWV3UGFnZS5odG1sJywgcmVsb2FkT25TZWFyY2g6IGZhbHNlfSkuXG4gICAgICAgICAgICAgIHdoZW4oc3RhcnRDb250ZXh0ICsgcGF0aCArICcvZm9ybVRhYmxlLzpwYWdlKicsIHt0ZW1wbGF0ZVVybDogJ3BsdWdpbnMvd2lraS9odG1sL2Zvcm1UYWJsZS5odG1sJ30pLlxuICAgICAgICAgICAgICB3aGVuKHN0YXJ0Q29udGV4dCArIHBhdGggKyAnL2RvemVyL21hcHBpbmdzLzpwYWdlKicsIHt0ZW1wbGF0ZVVybDogJ3BsdWdpbnMvd2lraS9odG1sL2RvemVyTWFwcGluZ3MuaHRtbCd9KS5cbiAgICAgICAgICAgICAgd2hlbihzdGFydENvbnRleHQgKyBwYXRoICsgJy9jb25maWd1cmF0aW9ucy86cGFnZSonLCB7IHRlbXBsYXRlVXJsOiAncGx1Z2lucy93aWtpL2h0bWwvY29uZmlndXJhdGlvbnMuaHRtbCcgfSkuXG4gICAgICAgICAgICAgIHdoZW4oc3RhcnRDb250ZXh0ICsgcGF0aCArICcvY29uZmlndXJhdGlvbi86cGlkLzpwYWdlKicsIHsgdGVtcGxhdGVVcmw6ICdwbHVnaW5zL3dpa2kvaHRtbC9jb25maWd1cmF0aW9uLmh0bWwnIH0pLlxuICAgICAgICAgICAgICB3aGVuKHN0YXJ0Q29udGV4dCArIHBhdGggKyAnL25ld0NvbmZpZ3VyYXRpb24vOmZhY3RvcnlQaWQvOnBhZ2UqJywgeyB0ZW1wbGF0ZVVybDogJ3BsdWdpbnMvd2lraS9odG1sL2NvbmZpZ3VyYXRpb24uaHRtbCcgfSkuXG4gICAgICAgICAgICAgIHdoZW4oc3RhcnRDb250ZXh0ICsgcGF0aCArICcvY2FtZWwvZGlhZ3JhbS86cGFnZSonLCB7dGVtcGxhdGVVcmw6ICdwbHVnaW5zL3dpa2kvaHRtbC9jYW1lbERpYWdyYW0uaHRtbCd9KS5cbiAgICAgICAgICAgICAgd2hlbihzdGFydENvbnRleHQgKyBwYXRoICsgJy9jYW1lbC9jYW52YXMvOnBhZ2UqJywge3RlbXBsYXRlVXJsOiAncGx1Z2lucy93aWtpL2h0bWwvY2FtZWxDYW52YXMuaHRtbCd9KS5cbiAgICAgICAgICAgICAgd2hlbihzdGFydENvbnRleHQgKyBwYXRoICsgJy9jYW1lbC9wcm9wZXJ0aWVzLzpwYWdlKicsIHt0ZW1wbGF0ZVVybDogJ3BsdWdpbnMvd2lraS9odG1sL2NhbWVsUHJvcGVydGllcy5odG1sJ30pO1xuICAgIH0pO1xufV0pO1xuXG4gIC8qKlxuICAgKiBCcmFuY2ggTWVudSBzZXJ2aWNlXG4gICAqL1xuICBleHBvcnQgaW50ZXJmYWNlIEJyYW5jaE1lbnUge1xuICAgIGFkZEV4dGVuc2lvbjogKGl0ZW06VUkuTWVudUl0ZW0pID0+IHZvaWQ7XG4gICAgYXBwbHlNZW51RXh0ZW5zaW9uczogKG1lbnU6VUkuTWVudUl0ZW1bXSkgPT4gdm9pZDtcbiAgfVxuXG4gIF9tb2R1bGUuZmFjdG9yeSgnd2lraUJyYW5jaE1lbnUnLCAoKSA9PiB7XG4gICAgdmFyIHNlbGYgPSB7XG4gICAgICBpdGVtczogW10sXG4gICAgICBhZGRFeHRlbnNpb246IChpdGVtOlVJLk1lbnVJdGVtKSA9PiB7XG4gICAgICAgIHNlbGYuaXRlbXMucHVzaChpdGVtKTtcbiAgICAgIH0sXG4gICAgICBhcHBseU1lbnVFeHRlbnNpb25zOiAobWVudTpVSS5NZW51SXRlbVtdKSA9PiB7XG4gICAgICAgIGlmIChzZWxmLml0ZW1zLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICB2YXIgZXh0ZW5kZWRNZW51OlVJLk1lbnVJdGVtW10gPSBbe1xuICAgICAgICAgIGhlYWRpbmc6IFwiQWN0aW9uc1wiXG4gICAgICAgIH1dO1xuICAgICAgICBzZWxmLml0ZW1zLmZvckVhY2goKGl0ZW06VUkuTWVudUl0ZW0pID0+IHtcbiAgICAgICAgICBpZiAoaXRlbS52YWxpZCgpKSB7XG4gICAgICAgICAgICBleHRlbmRlZE1lbnUucHVzaChpdGVtKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBpZiAoZXh0ZW5kZWRNZW51Lmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICBtZW51LmFkZChleHRlbmRlZE1lbnUpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfTtcbiAgICByZXR1cm4gc2VsZjtcbiAgfSk7XG5cbiAgX21vZHVsZS5mYWN0b3J5KCdXaWtpR2l0VXJsUHJlZml4JywgKCkgPT4ge1xuICAgICAgcmV0dXJuIFwiXCI7XG4gIH0pO1xuXG4gIF9tb2R1bGUuZmFjdG9yeSgnZmlsZUV4dGVuc2lvblR5cGVSZWdpc3RyeScsICgpID0+IHtcbiAgICByZXR1cm4ge1xuICAgICAgXCJpbWFnZVwiOiBbXCJzdmdcIiwgXCJwbmdcIiwgXCJpY29cIiwgXCJibXBcIiwgXCJqcGdcIiwgXCJnaWZcIl0sXG4gICAgICBcIm1hcmtkb3duXCI6IFtcIm1kXCIsIFwibWFya2Rvd25cIiwgXCJtZG93blwiLCBcIm1rZG5cIiwgXCJta2RcIl0sXG4gICAgICBcImh0bWxtaXhlZFwiOiBbXCJodG1sXCIsIFwieGh0bWxcIiwgXCJodG1cIl0sXG4gICAgICBcInRleHQveC1qYXZhXCI6IFtcImphdmFcIl0sXG4gICAgICBcInRleHQveC1ncm9vdnlcIjogW1wiZ3Jvb3Z5XCJdLFxuICAgICAgXCJ0ZXh0L3gtc2NhbGFcIjogW1wic2NhbGFcIl0sXG4gICAgICBcImphdmFzY3JpcHRcIjogW1wianNcIiwgXCJqc29uXCIsIFwiamF2YXNjcmlwdFwiLCBcImpzY3JpcHRcIiwgXCJlY21hc2NyaXB0XCIsIFwiZm9ybVwiXSxcbiAgICAgIFwieG1sXCI6IFtcInhtbFwiLCBcInhzZFwiLCBcIndzZGxcIiwgXCJhdG9tXCJdLFxuICAgICAgXCJ0ZXh0L3gteWFtbFwiOiBbXCJ5YW1sXCIsIFwieW1sXCJdLFxuICAgICAgXCJwcm9wZXJ0aWVzXCI6IFtcInByb3BlcnRpZXNcIl1cbiAgICB9O1xuICB9KTtcblxuICBfbW9kdWxlLmZpbHRlcignZmlsZUljb25DbGFzcycsICgpID0+IGljb25DbGFzcyk7XG5cbiAgX21vZHVsZS5ydW4oW1wiJGxvY2F0aW9uXCIsXCJ2aWV3UmVnaXN0cnlcIiwgIFwibG9jYWxTdG9yYWdlXCIsIFwibGF5b3V0RnVsbFwiLCBcImhlbHBSZWdpc3RyeVwiLCBcInByZWZlcmVuY2VzUmVnaXN0cnlcIiwgXCJ3aWtpUmVwb3NpdG9yeVwiLFxuICAgIFwiJHJvb3RTY29wZVwiLCAoJGxvY2F0aW9uOm5nLklMb2NhdGlvblNlcnZpY2UsXG4gICAgICAgIHZpZXdSZWdpc3RyeSxcbiAgICAgICAgbG9jYWxTdG9yYWdlLFxuICAgICAgICBsYXlvdXRGdWxsLFxuICAgICAgICBoZWxwUmVnaXN0cnksXG4gICAgICAgIHByZWZlcmVuY2VzUmVnaXN0cnksXG4gICAgICAgIHdpa2lSZXBvc2l0b3J5LFxuICAgICAgICAkcm9vdFNjb3BlKSA9PiB7XG5cbiAgICB2aWV3UmVnaXN0cnlbJ3dpa2knXSA9IHRlbXBsYXRlUGF0aCArICdsYXlvdXRXaWtpLmh0bWwnO1xuLypcbiAgICBoZWxwUmVnaXN0cnkuYWRkVXNlckRvYygnd2lraScsICdwbHVnaW5zL3dpa2kvZG9jL2hlbHAubWQnLCAoKSA9PiB7XG4gICAgICByZXR1cm4gV2lraS5pc1dpa2lFbmFibGVkKHdvcmtzcGFjZSwgam9sb2tpYSwgbG9jYWxTdG9yYWdlKTtcbiAgICB9KTtcbiovXG5cbi8qXG4gICAgcHJlZmVyZW5jZXNSZWdpc3RyeS5hZGRUYWIoXCJHaXRcIiwgJ3BsdWdpbnMvd2lraS9odG1sL2dpdFByZWZlcmVuY2VzLmh0bWwnKTtcbiovXG5cbi8qXG4gICAgdGFiID0ge1xuICAgICAgaWQ6IFwid2lraVwiLFxuICAgICAgY29udGVudDogXCJXaWtpXCIsXG4gICAgICB0aXRsZTogXCJWaWV3IGFuZCBlZGl0IHdpa2kgcGFnZXNcIixcbiAgICAgIGlzVmFsaWQ6ICh3b3Jrc3BhY2U6V29ya3NwYWNlKSA9PiBXaWtpLmlzV2lraUVuYWJsZWQod29ya3NwYWNlLCBqb2xva2lhLCBsb2NhbFN0b3JhZ2UpLFxuICAgICAgaHJlZjogKCkgPT4gXCIjL3dpa2kvdmlld1wiLFxuICAgICAgaXNBY3RpdmU6ICh3b3Jrc3BhY2U6V29ya3NwYWNlKSA9PiB3b3Jrc3BhY2UuaXNMaW5rQWN0aXZlKFwiL3dpa2lcIikgJiYgIXdvcmtzcGFjZS5saW5rQ29udGFpbnMoXCJmYWJyaWNcIiwgXCJwcm9maWxlc1wiKSAmJiAhd29ya3NwYWNlLmxpbmtDb250YWlucyhcImVkaXRGZWF0dXJlc1wiKVxuICAgIH07XG4gICAgd29ya3NwYWNlLnRvcExldmVsVGFicy5wdXNoKHRhYik7XG4qL1xuXG4gICAgLy8gYWRkIGVtcHR5IHJlZ2V4cyB0byB0ZW1wbGF0ZXMgdGhhdCBkb24ndCBkZWZpbmVcbiAgICAvLyB0aGVtIHNvIG5nLXBhdHRlcm4gZG9lc24ndCBiYXJmXG4gICAgV2lraS5kb2N1bWVudFRlbXBsYXRlcy5mb3JFYWNoKCh0ZW1wbGF0ZTogYW55KSA9PiB7XG4gICAgICBpZiAoIXRlbXBsYXRlWydyZWdleCddKSB7XG4gICAgICAgIHRlbXBsYXRlLnJlZ2V4ID0gLyg/OikvO1xuICAgICAgfVxuICAgIH0pO1xuXG4gIH1dKTtcblxuICBoYXd0aW9QbHVnaW5Mb2FkZXIuYWRkTW9kdWxlKHBsdWdpbk5hbWUpO1xufVxuIiwiLyoqXG4gKiBAbW9kdWxlIFdpa2lcbiAqL1xuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4vd2lraVBsdWdpbi50c1wiLz5cbm1vZHVsZSBXaWtpIHtcblxuICBleHBvcnQgdmFyIENhbWVsQ29udHJvbGxlciA9IF9tb2R1bGUuY29udHJvbGxlcihcIldpa2kuQ2FtZWxDb250cm9sbGVyXCIsIFtcIiRzY29wZVwiLCBcIiRyb290U2NvcGVcIiwgXCIkbG9jYXRpb25cIiwgXCIkcm91dGVQYXJhbXNcIiwgXCIkY29tcGlsZVwiLCBcIiR0ZW1wbGF0ZUNhY2hlXCIsIFwibG9jYWxTdG9yYWdlXCIsICgkc2NvcGUsICRyb290U2NvcGUsICRsb2NhdGlvbiwgJHJvdXRlUGFyYW1zLCAkY29tcGlsZSwgJHRlbXBsYXRlQ2FjaGUsIGxvY2FsU3RvcmFnZTpXaW5kb3dMb2NhbFN0b3JhZ2UpID0+IHtcblxuICAgIC8vIFRPRE8gUkVNT1ZFXG4gICAgdmFyIGpvbG9raWEgPSBudWxsO1xuICAgIHZhciBqb2xva2lhU3RhdHVzID0gbnVsbDtcbiAgICB2YXIgam14VHJlZUxhenlMb2FkUmVnaXN0cnkgPSBudWxsO1xuICAgIHZhciB1c2VyRGV0YWlscyA9IG51bGw7XG4gICAgdmFyIEhhd3Rpb05hdiA9IG51bGw7XG4gICAgdmFyIHdvcmtzcGFjZSA9IG5ldyBXb3Jrc3BhY2Uoam9sb2tpYSwgam9sb2tpYVN0YXR1cywgam14VHJlZUxhenlMb2FkUmVnaXN0cnksICRsb2NhdGlvbiwgJGNvbXBpbGUsICR0ZW1wbGF0ZUNhY2hlLCBsb2NhbFN0b3JhZ2UsICRyb290U2NvcGUsIHVzZXJEZXRhaWxzLCBIYXd0aW9OYXYpO1xuXG4gICAgV2lraS5pbml0U2NvcGUoJHNjb3BlLCAkcm91dGVQYXJhbXMsICRsb2NhdGlvbik7XG4gICAgQ2FtZWwuaW5pdEVuZHBvaW50Q2hvb3NlclNjb3BlKCRzY29wZSwgJGxvY2F0aW9uLCBsb2NhbFN0b3JhZ2UsIHdvcmtzcGFjZSwgam9sb2tpYSk7XG4gICAgdmFyIHdpa2lSZXBvc2l0b3J5ID0gJHNjb3BlLndpa2lSZXBvc2l0b3J5O1xuXG4gICAgJHNjb3BlLnNjaGVtYSA9IENhbWVsLmdldENvbmZpZ3VyZWRDYW1lbE1vZGVsKCk7XG4gICAgJHNjb3BlLm1vZGlmaWVkID0gZmFsc2U7XG5cbiAgICAkc2NvcGUuc3dpdGNoVG9DYW52YXNWaWV3ID0gbmV3IFVJLkRpYWxvZygpO1xuXG4gICAgJHNjb3BlLmZpbmRQcm9maWxlQ2FtZWxDb250ZXh0ID0gdHJ1ZTtcbiAgICAkc2NvcGUuY2FtZWxTZWxlY3Rpb25EZXRhaWxzID0ge1xuICAgICAgc2VsZWN0ZWRDYW1lbENvbnRleHRJZDogbnVsbCxcbiAgICAgIHNlbGVjdGVkUm91dGVJZDogbnVsbFxuICAgIH07XG5cbiAgICAkc2NvcGUuaXNWYWxpZCA9IChuYXYpID0+IHtcbiAgICAgIHJldHVybiBuYXYgJiYgbmF2LmlzVmFsaWQod29ya3NwYWNlKTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLmNhbWVsU3ViTGV2ZWxUYWJzID0gW1xuICAgICAgLyp7XG4gICAgICAgIGNvbnRlbnQ6ICc8aSBjbGFzcz1cImljb24tcGljdHVyZVwiPjwvaT4gQ2FudmFzJyxcbiAgICAgICAgdGl0bGU6IFwiRWRpdCB0aGUgZGlhZ3JhbSBpbiBhIGRyYWdneSBkcm9wcHkgd2F5XCIsXG4gICAgICAgIGlzVmFsaWQ6ICh3b3Jrc3BhY2U6V29ya3NwYWNlKSA9PiB0cnVlLFxuICAgICAgICBocmVmOiAoKSA9PiBXaWtpLnN0YXJ0TGluaygkc2NvcGUuYnJhbmNoKSArIFwiL2NhbWVsL2NhbnZhcy9cIiArICRzY29wZS5wYWdlSWRcbiAgICAgIH0sXG4gICAgICAqL3tcbiAgICAgICAgY29udGVudDogJzxpIGNsYXNzPVwiIGljb24tc2l0ZW1hcFwiPjwvaT4gVHJlZScsXG4gICAgICAgIHRpdGxlOiBcIlZpZXcgdGhlIHJvdXRlcyBhcyBhIHRyZWVcIixcbiAgICAgICAgaXNWYWxpZDogKHdvcmtzcGFjZTpXb3Jrc3BhY2UpID0+IHRydWUsXG4gICAgICAgIGhyZWY6ICgpID0+IFdpa2kuc3RhcnRMaW5rKCRzY29wZS5icmFuY2gpICsgXCIvY2FtZWwvcHJvcGVydGllcy9cIiArICRzY29wZS5wYWdlSWRcbiAgICAgIH0sXG4gICAgICAvKlxuICAgICAgIHtcbiAgICAgICBjb250ZW50OiAnPGkgY2xhc3M9XCJpY29uLXNpdGVtYXBcIj48L2k+IERpYWdyYW0nLFxuICAgICAgIHRpdGxlOiBcIlZpZXcgYSBkaWFncmFtIG9mIHRoZSByb3V0ZVwiLFxuICAgICAgIGlzVmFsaWQ6ICh3b3Jrc3BhY2U6V29ya3NwYWNlKSA9PiB0cnVlLFxuICAgICAgIGhyZWY6ICgpID0+IFdpa2kuc3RhcnRMaW5rKCRzY29wZS5icmFuY2gpICsgXCIvY2FtZWwvZGlhZ3JhbS9cIiArICRzY29wZS5wYWdlSWRcbiAgICAgICB9LFxuICAgICAgICovXG4gICAgXTtcblxuICAgIHZhciByb3V0ZU1vZGVsID0gX2FwYWNoZUNhbWVsTW9kZWwuZGVmaW5pdGlvbnMucm91dGU7XG4gICAgcm91dGVNb2RlbFtcIl9pZFwiXSA9IFwicm91dGVcIjtcblxuICAgICRzY29wZS5hZGREaWFsb2cgPSBuZXcgVUkuRGlhbG9nKCk7XG5cbiAgICAvLyBUT0RPIGRvZXNuJ3Qgc2VlbSB0aGF0IGFuZ3VsYXItdWkgdXNlcyB0aGVzZT9cbiAgICAkc2NvcGUuYWRkRGlhbG9nLm9wdGlvbnNbXCJkaWFsb2dDbGFzc1wiXSA9IFwibW9kYWwtbGFyZ2VcIjtcbiAgICAkc2NvcGUuYWRkRGlhbG9nLm9wdGlvbnNbXCJjc3NDbGFzc1wiXSA9IFwibW9kYWwtbGFyZ2VcIjtcblxuICAgICRzY29wZS5wYWxldHRlSXRlbVNlYXJjaCA9IFwiXCI7XG4gICAgJHNjb3BlLnBhbGV0dGVUcmVlID0gbmV3IEZvbGRlcihcIlBhbGV0dGVcIik7XG4gICAgJHNjb3BlLnBhbGV0dGVBY3RpdmF0aW9ucyA9IFtcIlJvdXRpbmdfYWdncmVnYXRlXCJdO1xuXG4gICAgLy8gbG9hZCAkc2NvcGUucGFsZXR0ZVRyZWVcbiAgICBhbmd1bGFyLmZvckVhY2goX2FwYWNoZUNhbWVsTW9kZWwuZGVmaW5pdGlvbnMsICh2YWx1ZSwga2V5KSA9PiB7XG4gICAgICBpZiAodmFsdWUuZ3JvdXApIHtcbiAgICAgICAgdmFyIGdyb3VwID0gKGtleSA9PT0gXCJyb3V0ZVwiKSA/ICRzY29wZS5wYWxldHRlVHJlZSA6ICRzY29wZS5wYWxldHRlVHJlZS5nZXRPckVsc2UodmFsdWUuZ3JvdXApO1xuICAgICAgICBpZiAoIWdyb3VwLmtleSkge1xuICAgICAgICAgIGdyb3VwLmtleSA9IHZhbHVlLmdyb3VwO1xuICAgICAgICB9XG4gICAgICAgIHZhbHVlW1wiX2lkXCJdID0ga2V5O1xuICAgICAgICB2YXIgdGl0bGUgPSB2YWx1ZVtcInRpdGxlXCJdIHx8IGtleTtcbiAgICAgICAgdmFyIG5vZGUgPSBuZXcgRm9sZGVyKHRpdGxlKTtcbiAgICAgICAgbm9kZS5rZXkgPSBncm91cC5rZXkgKyBcIl9cIiArIGtleTtcbiAgICAgICAgbm9kZVtcIm5vZGVNb2RlbFwiXSA9IHZhbHVlO1xuICAgICAgICB2YXIgaW1hZ2VVcmwgPSBDYW1lbC5nZXRSb3V0ZU5vZGVJY29uKHZhbHVlKTtcbiAgICAgICAgbm9kZS5pY29uID0gaW1hZ2VVcmw7XG4gICAgICAgIC8vIGNvbXBpbGVyIHdhcyBjb21wbGFpbmluZyBhYm91dCAnbGFiZWwnIGhhZCBubyBpZGVhIHdoZXJlIGl0J3MgY29taW5nIGZyb21cbiAgICAgICAgLy8gdmFyIHRvb2x0aXAgPSB2YWx1ZVtcInRvb2x0aXBcIl0gfHwgdmFsdWVbXCJkZXNjcmlwdGlvblwiXSB8fCBsYWJlbDtcbiAgICAgICAgdmFyIHRvb2x0aXAgPSB2YWx1ZVtcInRvb2x0aXBcIl0gfHwgdmFsdWVbXCJkZXNjcmlwdGlvblwiXSB8fCAnJztcbiAgICAgICAgbm9kZS50b29sdGlwID0gdG9vbHRpcDtcblxuICAgICAgICBncm91cC5jaGlsZHJlbi5wdXNoKG5vZGUpO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgLy8gbG9hZCAkc2NvcGUuY29tcG9uZW50VHJlZVxuICAgICRzY29wZS5jb21wb25lbnRUcmVlID0gbmV3IEZvbGRlcihcIkVuZHBvaW50c1wiKTtcblxuICAgICRzY29wZS4kd2F0Y2goXCJjb21wb25lbnROYW1lc1wiLCAoKSA9PiB7XG4gICAgICB2YXIgY29tcG9uZW50TmFtZXMgPSAkc2NvcGUuY29tcG9uZW50TmFtZXM7XG4gICAgICBpZiAoY29tcG9uZW50TmFtZXMgJiYgY29tcG9uZW50TmFtZXMubGVuZ3RoKSB7XG4gICAgICAgICRzY29wZS5jb21wb25lbnRUcmVlID0gbmV3IEZvbGRlcihcIkVuZHBvaW50c1wiKTtcbiAgICAgICAgYW5ndWxhci5mb3JFYWNoKCRzY29wZS5jb21wb25lbnROYW1lcywgKGVuZHBvaW50TmFtZSkgPT4ge1xuICAgICAgICAgIHZhciBjYXRlZ29yeSA9IENhbWVsLmdldEVuZHBvaW50Q2F0ZWdvcnkoZW5kcG9pbnROYW1lKTtcbiAgICAgICAgICB2YXIgZ3JvdXBOYW1lID0gY2F0ZWdvcnkubGFiZWwgfHwgXCJDb3JlXCI7XG4gICAgICAgICAgdmFyIGdyb3VwS2V5ID0gY2F0ZWdvcnkuaWQgfHwgZ3JvdXBOYW1lO1xuICAgICAgICAgIHZhciBncm91cCA9ICRzY29wZS5jb21wb25lbnRUcmVlLmdldE9yRWxzZShncm91cE5hbWUpO1xuXG4gICAgICAgICAgdmFyIHZhbHVlID0gQ2FtZWwuZ2V0RW5kcG9pbnRDb25maWcoZW5kcG9pbnROYW1lLCBjYXRlZ29yeSk7XG4gICAgICAgICAgdmFyIGtleSA9IGVuZHBvaW50TmFtZTtcbiAgICAgICAgICB2YXIgbGFiZWwgPSB2YWx1ZVtcImxhYmVsXCJdIHx8IGVuZHBvaW50TmFtZTtcbiAgICAgICAgICB2YXIgbm9kZSA9IG5ldyBGb2xkZXIobGFiZWwpO1xuICAgICAgICAgIG5vZGUua2V5ID0gZ3JvdXBLZXkgKyBcIl9cIiArIGtleTtcbiAgICAgICAgICBub2RlLmtleSA9IGtleTtcbiAgICAgICAgICBub2RlW1wibm9kZU1vZGVsXCJdID0gdmFsdWU7XG4gICAgICAgICAgdmFyIHRvb2x0aXAgPSB2YWx1ZVtcInRvb2x0aXBcIl0gfHwgdmFsdWVbXCJkZXNjcmlwdGlvblwiXSB8fCBsYWJlbDtcbiAgICAgICAgICB2YXIgaW1hZ2VVcmwgPSBDb3JlLnVybCh2YWx1ZVtcImljb25cIl0gfHwgQ2FtZWwuZW5kcG9pbnRJY29uKTtcbiAgICAgICAgICBub2RlLmljb24gPSBpbWFnZVVybDtcbiAgICAgICAgICBub2RlLnRvb2x0aXAgPSB0b29sdGlwO1xuXG4gICAgICAgICAgZ3JvdXAuY2hpbGRyZW4ucHVzaChub2RlKTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgJHNjb3BlLmNvbXBvbmVudEFjdGl2YXRpb25zID0gW1wiYmVhblwiXTtcblxuICAgICRzY29wZS4kd2F0Y2goJ2FkZERpYWxvZy5zaG93JywgZnVuY3Rpb24gKCkge1xuICAgICAgaWYgKCRzY29wZS5hZGREaWFsb2cuc2hvdykge1xuICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAkKCcjc3VibWl0JykuZm9jdXMoKTtcbiAgICAgICAgfSwgNTApO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgJHNjb3BlLiRvbihcImhhd3Rpby5mb3JtLm1vZGVsQ2hhbmdlXCIsIG9uTW9kZWxDaGFuZ2VFdmVudCk7XG5cbiAgICAkc2NvcGUub25Sb290VHJlZU5vZGUgPSAocm9vdFRyZWVOb2RlKSA9PiB7XG4gICAgICAkc2NvcGUucm9vdFRyZWVOb2RlID0gcm9vdFRyZWVOb2RlO1xuICAgICAgLy8gcmVzdG9yZSB0aGUgcmVhbCBkYXRhIGF0IHRoZSByb290IGZvciBzYXZpbmcgdGhlIGRvYyBldGNcbiAgICAgIHJvb3RUcmVlTm9kZS5kYXRhID0gJHNjb3BlLmNhbWVsQ29udGV4dFRyZWU7XG4gICAgfTtcblxuICAgICRzY29wZS5hZGROb2RlID0gKCkgPT4ge1xuICAgICAgaWYgKCRzY29wZS5ub2RlWG1sTm9kZSkge1xuICAgICAgICAkc2NvcGUuYWRkRGlhbG9nLm9wZW4oKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGFkZE5ld05vZGUocm91dGVNb2RlbCk7XG4gICAgICB9XG4gICAgfTtcblxuICAgICRzY29wZS5vblBhbGV0dGVTZWxlY3QgPSAobm9kZSkgPT4ge1xuICAgICAgJHNjb3BlLnNlbGVjdGVkUGFsZXR0ZU5vZGUgPSAobm9kZSAmJiBub2RlW1wibm9kZU1vZGVsXCJdKSA/IG5vZGUgOiBudWxsO1xuICAgICAgaWYgKCRzY29wZS5zZWxlY3RlZFBhbGV0dGVOb2RlKSB7XG4gICAgICAgICRzY29wZS5zZWxlY3RlZENvbXBvbmVudE5vZGUgPSBudWxsO1xuICAgICAgfVxuICAgICAgY29uc29sZS5sb2coXCJTZWxlY3RlZCBcIiArICRzY29wZS5zZWxlY3RlZFBhbGV0dGVOb2RlICsgXCIgOiBcIiArICRzY29wZS5zZWxlY3RlZENvbXBvbmVudE5vZGUpO1xuICAgIH07XG5cbiAgICAkc2NvcGUub25Db21wb25lbnRTZWxlY3QgPSAobm9kZSkgPT4ge1xuICAgICAgJHNjb3BlLnNlbGVjdGVkQ29tcG9uZW50Tm9kZSA9IChub2RlICYmIG5vZGVbXCJub2RlTW9kZWxcIl0pID8gbm9kZSA6IG51bGw7XG4gICAgICBpZiAoJHNjb3BlLnNlbGVjdGVkQ29tcG9uZW50Tm9kZSkge1xuICAgICAgICAkc2NvcGUuc2VsZWN0ZWRQYWxldHRlTm9kZSA9IG51bGw7XG4gICAgICAgIHZhciBub2RlTmFtZSA9IG5vZGUua2V5O1xuICAgICAgICBjb25zb2xlLmxvZyhcImxvYWRpbmcgZW5kcG9pbnQgc2NoZW1hIGZvciBub2RlIFwiICsgbm9kZU5hbWUpO1xuICAgICAgICAkc2NvcGUubG9hZEVuZHBvaW50U2NoZW1hKG5vZGVOYW1lKTtcbiAgICAgICAgJHNjb3BlLnNlbGVjdGVkQ29tcG9uZW50TmFtZSA9IG5vZGVOYW1lO1xuICAgICAgfVxuICAgICAgY29uc29sZS5sb2coXCJTZWxlY3RlZCBcIiArICRzY29wZS5zZWxlY3RlZFBhbGV0dGVOb2RlICsgXCIgOiBcIiArICRzY29wZS5zZWxlY3RlZENvbXBvbmVudE5vZGUpO1xuICAgIH07XG5cbiAgICAkc2NvcGUuc2VsZWN0ZWROb2RlTW9kZWwgPSAoKSA9PiB7XG4gICAgICB2YXIgbm9kZU1vZGVsID0gbnVsbDtcbiAgICAgIGlmICgkc2NvcGUuc2VsZWN0ZWRQYWxldHRlTm9kZSkge1xuICAgICAgICBub2RlTW9kZWwgPSAkc2NvcGUuc2VsZWN0ZWRQYWxldHRlTm9kZVtcIm5vZGVNb2RlbFwiXTtcbiAgICAgICAgJHNjb3BlLmVuZHBvaW50Q29uZmlnID0gbnVsbDtcbiAgICAgIH0gZWxzZSBpZiAoJHNjb3BlLnNlbGVjdGVkQ29tcG9uZW50Tm9kZSkge1xuICAgICAgICAvLyBUT0RPIGxlc3QgY3JlYXRlIGFuIGVuZHBvaW50IG5vZGVNb2RlbCBhbmQgYXNzb2NpYXRlXG4gICAgICAgIC8vIHRoZSBkdW1teSBVUkwgYW5kIHByb3BlcnRpZXMgZXRjLi4uXG4gICAgICAgIHZhciBlbmRwb2ludENvbmZpZyA9ICRzY29wZS5zZWxlY3RlZENvbXBvbmVudE5vZGVbXCJub2RlTW9kZWxcIl07XG4gICAgICAgIHZhciBlbmRwb2ludFNjaGVtYSA9ICRzY29wZS5lbmRwb2ludFNjaGVtYTtcbiAgICAgICAgbm9kZU1vZGVsID0gJHNjb3BlLnNjaGVtYS5kZWZpbml0aW9ucy5lbmRwb2ludDtcbiAgICAgICAgJHNjb3BlLmVuZHBvaW50Q29uZmlnID0ge1xuICAgICAgICAgIGtleTogJHNjb3BlLnNlbGVjdGVkQ29tcG9uZW50Tm9kZS5rZXksXG4gICAgICAgICAgc2NoZW1hOiBlbmRwb2ludFNjaGVtYSxcbiAgICAgICAgICBkZXRhaWxzOiBlbmRwb2ludENvbmZpZ1xuICAgICAgICB9O1xuICAgICAgfVxuICAgICAgcmV0dXJuIG5vZGVNb2RlbDtcbiAgICB9O1xuXG4gICAgJHNjb3BlLmFkZEFuZENsb3NlRGlhbG9nID0gKCkgPT4ge1xuICAgICAgdmFyIG5vZGVNb2RlbCA9ICRzY29wZS5zZWxlY3RlZE5vZGVNb2RlbCgpO1xuICAgICAgaWYgKG5vZGVNb2RlbCkge1xuICAgICAgICBhZGROZXdOb2RlKG5vZGVNb2RlbCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zb2xlLmxvZyhcIldBUk5JTkc6IG5vIG5vZGVNb2RlbCFcIik7XG4gICAgICB9XG4gICAgICAkc2NvcGUuYWRkRGlhbG9nLmNsb3NlKCk7XG4gICAgfTtcblxuICAgICRzY29wZS5yZW1vdmVOb2RlID0gKCkgPT4ge1xuICAgICAgaWYgKCRzY29wZS5zZWxlY3RlZEZvbGRlciAmJiAkc2NvcGUudHJlZU5vZGUpIHtcbiAgICAgICAgJHNjb3BlLnNlbGVjdGVkRm9sZGVyLmRldGFjaCgpO1xuICAgICAgICAkc2NvcGUudHJlZU5vZGUucmVtb3ZlKCk7XG4gICAgICAgICRzY29wZS5zZWxlY3RlZEZvbGRlciA9IG51bGw7XG4gICAgICAgICRzY29wZS50cmVlTm9kZSA9IG51bGw7XG4gICAgICB9XG4gICAgfTtcblxuICAgICRzY29wZS5jYW5EZWxldGUgPSAoKSA9PiB7XG4gICAgICByZXR1cm4gJHNjb3BlLnNlbGVjdGVkRm9sZGVyID8gdHJ1ZSA6IGZhbHNlO1xuICAgIH07XG5cbiAgICAkc2NvcGUuaXNBY3RpdmUgPSAobmF2KSA9PiB7XG4gICAgICBpZiAoYW5ndWxhci5pc1N0cmluZyhuYXYpKVxuICAgICAgICByZXR1cm4gd29ya3NwYWNlLmlzTGlua0FjdGl2ZShuYXYpO1xuICAgICAgdmFyIGZuID0gbmF2LmlzQWN0aXZlO1xuICAgICAgaWYgKGZuKSB7XG4gICAgICAgIHJldHVybiBmbih3b3Jrc3BhY2UpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHdvcmtzcGFjZS5pc0xpbmtBY3RpdmUobmF2LmhyZWYoKSk7XG4gICAgfTtcblxuICAgICRzY29wZS5zYXZlID0gKCkgPT4ge1xuICAgICAgLy8gZ2VuZXJhdGUgdGhlIG5ldyBYTUxcbiAgICAgIGlmICgkc2NvcGUubW9kaWZpZWQgJiYgJHNjb3BlLnJvb3RUcmVlTm9kZSkge1xuICAgICAgICB2YXIgeG1sTm9kZSA9IENhbWVsLmdlbmVyYXRlWG1sRnJvbUZvbGRlcigkc2NvcGUucm9vdFRyZWVOb2RlKTtcbiAgICAgICAgaWYgKHhtbE5vZGUpIHtcbiAgICAgICAgICB2YXIgdGV4dCA9IENvcmUueG1sTm9kZVRvU3RyaW5nKHhtbE5vZGUpO1xuICAgICAgICAgIGlmICh0ZXh0KSB7XG4gICAgICAgICAgICAvLyBsZXRzIHNhdmUgdGhlIGZpbGUuLi5cbiAgICAgICAgICAgIHZhciBjb21taXRNZXNzYWdlID0gJHNjb3BlLmNvbW1pdE1lc3NhZ2UgfHwgXCJVcGRhdGVkIHBhZ2UgXCIgKyAkc2NvcGUucGFnZUlkO1xuICAgICAgICAgICAgd2lraVJlcG9zaXRvcnkucHV0UGFnZSgkc2NvcGUuYnJhbmNoLCAkc2NvcGUucGFnZUlkLCB0ZXh0LCBjb21taXRNZXNzYWdlLCAoc3RhdHVzKSA9PiB7XG4gICAgICAgICAgICAgIFdpa2kub25Db21wbGV0ZShzdGF0dXMpO1xuICAgICAgICAgICAgICBDb3JlLm5vdGlmaWNhdGlvbihcInN1Y2Nlc3NcIiwgXCJTYXZlZCBcIiArICRzY29wZS5wYWdlSWQpO1xuICAgICAgICAgICAgICAkc2NvcGUubW9kaWZpZWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgZ29Ub1ZpZXcoKTtcbiAgICAgICAgICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH07XG5cbiAgICAkc2NvcGUuY2FuY2VsID0gKCkgPT4ge1xuICAgICAgY29uc29sZS5sb2coXCJjYW5jZWxsaW5nLi4uXCIpO1xuICAgICAgLy8gVE9ETyBzaG93IGRpYWxvZyBpZiBmb2xrcyBhcmUgYWJvdXQgdG8gbG9zZSBjaGFuZ2VzLi4uXG4gICAgfTtcblxuICAgICRzY29wZS4kd2F0Y2goJ3dvcmtzcGFjZS50cmVlJywgZnVuY3Rpb24gKCkge1xuICAgICAgaWYgKCEkc2NvcGUuZ2l0KSB7XG4gICAgICAgIC8vIGxldHMgZG8gdGhpcyBhc3luY2hyb25vdXNseSB0byBhdm9pZCBFcnJvcjogJGRpZ2VzdCBhbHJlYWR5IGluIHByb2dyZXNzXG4gICAgICAgIC8vY29uc29sZS5sb2coXCJSZWxvYWRpbmcgdGhlIHZpZXcgYXMgd2Ugbm93IHNlZW0gdG8gaGF2ZSBhIGdpdCBtYmVhbiFcIik7XG4gICAgICAgIHNldFRpbWVvdXQodXBkYXRlVmlldywgNTApO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgJHNjb3BlLiRvbihcIiRyb3V0ZUNoYW5nZVN1Y2Nlc3NcIiwgZnVuY3Rpb24gKGV2ZW50LCBjdXJyZW50LCBwcmV2aW91cykge1xuICAgICAgLy8gbGV0cyBkbyB0aGlzIGFzeW5jaHJvbm91c2x5IHRvIGF2b2lkIEVycm9yOiAkZGlnZXN0IGFscmVhZHkgaW4gcHJvZ3Jlc3NcbiAgICAgIHNldFRpbWVvdXQodXBkYXRlVmlldywgNTApO1xuICAgIH0pO1xuXG4gICAgZnVuY3Rpb24gZ2V0Rm9sZGVyWG1sTm9kZSh0cmVlTm9kZSkge1xuICAgICAgdmFyIHJvdXRlWG1sTm9kZSA9IENhbWVsLmNyZWF0ZUZvbGRlclhtbFRyZWUodHJlZU5vZGUsIG51bGwpO1xuICAgICAgaWYgKHJvdXRlWG1sTm9kZSkge1xuICAgICAgICAkc2NvcGUubm9kZVhtbE5vZGUgPSByb3V0ZVhtbE5vZGU7XG4gICAgICB9XG4gICAgICByZXR1cm4gcm91dGVYbWxOb2RlO1xuICAgIH1cblxuICAgICRzY29wZS5vbk5vZGVTZWxlY3QgPSAoZm9sZGVyLCB0cmVlTm9kZSkgPT4ge1xuICAgICAgJHNjb3BlLnNlbGVjdGVkRm9sZGVyID0gZm9sZGVyO1xuICAgICAgJHNjb3BlLnRyZWVOb2RlID0gdHJlZU5vZGU7XG4gICAgICAkc2NvcGUucHJvcGVydGllc1RlbXBsYXRlID0gbnVsbDtcbiAgICAgICRzY29wZS5kaWFncmFtVGVtcGxhdGUgPSBudWxsO1xuICAgICAgJHNjb3BlLm5vZGVYbWxOb2RlID0gbnVsbDtcbiAgICAgIGlmIChmb2xkZXIpIHtcbiAgICAgICAgJHNjb3BlLm5vZGVEYXRhID0gQ2FtZWwuZ2V0Um91dGVGb2xkZXJKU09OKGZvbGRlcik7XG4gICAgICAgICRzY29wZS5ub2RlRGF0YUNoYW5nZWRGaWVsZHMgPSB7fTtcbiAgICAgIH1cbiAgICAgIHZhciBub2RlTmFtZSA9IENhbWVsLmdldEZvbGRlckNhbWVsTm9kZUlkKGZvbGRlcik7XG4gICAgICAvLyBsZXRzIGxhemlseSBjcmVhdGUgdGhlIFhNTCB0cmVlIHNvIGl0IGNhbiBiZSB1c2VkIGJ5IHRoZSBkaWFncmFtXG4gICAgICB2YXIgcm91dGVYbWxOb2RlID0gZ2V0Rm9sZGVyWG1sTm9kZSh0cmVlTm9kZSk7XG4gICAgICBpZiAobm9kZU5hbWUpIHtcbiAgICAgICAgLy92YXIgbm9kZU5hbWUgPSByb3V0ZVhtbE5vZGUubG9jYWxOYW1lO1xuICAgICAgICAkc2NvcGUubm9kZU1vZGVsID0gQ2FtZWwuZ2V0Q2FtZWxTY2hlbWEobm9kZU5hbWUpO1xuICAgICAgICBpZiAoJHNjb3BlLm5vZGVNb2RlbCkge1xuICAgICAgICAgICRzY29wZS5wcm9wZXJ0aWVzVGVtcGxhdGUgPSBcInBsdWdpbnMvd2lraS9odG1sL2NhbWVsUHJvcGVydGllc0VkaXQuaHRtbFwiO1xuICAgICAgICB9XG4gICAgICAgICRzY29wZS5kaWFncmFtVGVtcGxhdGUgPSBcImFwcC9jYW1lbC9odG1sL3JvdXRlcy5odG1sXCI7XG4gICAgICAgIENvcmUuJGFwcGx5KCRzY29wZSk7XG4gICAgICB9XG4gICAgfTtcblxuICAgICRzY29wZS5vbk5vZGVEcmFnRW50ZXIgPSAobm9kZSwgc291cmNlTm9kZSkgPT4ge1xuICAgICAgdmFyIG5vZGVGb2xkZXIgPSBub2RlLmRhdGE7XG4gICAgICB2YXIgc291cmNlRm9sZGVyID0gc291cmNlTm9kZS5kYXRhO1xuICAgICAgaWYgKG5vZGVGb2xkZXIgJiYgc291cmNlRm9sZGVyKSB7XG4gICAgICAgIHZhciBub2RlSWQgPSBDYW1lbC5nZXRGb2xkZXJDYW1lbE5vZGVJZChub2RlRm9sZGVyKTtcbiAgICAgICAgdmFyIHNvdXJjZUlkID0gQ2FtZWwuZ2V0Rm9sZGVyQ2FtZWxOb2RlSWQoc291cmNlRm9sZGVyKTtcbiAgICAgICAgaWYgKG5vZGVJZCAmJiBzb3VyY2VJZCkge1xuICAgICAgICAgIC8vIHdlIGNhbiBvbmx5IGRyYWcgcm91dGVzIG9udG8gb3RoZXIgcm91dGVzIChiZWZvcmUgLyBhZnRlciAvIG92ZXIpXG4gICAgICAgICAgaWYgKHNvdXJjZUlkID09PSBcInJvdXRlXCIpIHtcbiAgICAgICAgICAgIHJldHVybiBub2RlSWQgPT09IFwicm91dGVcIjtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLm9uTm9kZURyb3AgPSAobm9kZSwgc291cmNlTm9kZSwgaGl0TW9kZSwgdWksIGRyYWdnYWJsZSkgPT4ge1xuICAgICAgdmFyIG5vZGVGb2xkZXIgPSBub2RlLmRhdGE7XG4gICAgICB2YXIgc291cmNlRm9sZGVyID0gc291cmNlTm9kZS5kYXRhO1xuICAgICAgaWYgKG5vZGVGb2xkZXIgJiYgc291cmNlRm9sZGVyKSB7XG4gICAgICAgIC8vIHdlIGNhbm5vdCBkcm9wIGEgcm91dGUgaW50byBhIHJvdXRlIG9yIGEgbm9uLXJvdXRlIHRvIGEgdG9wIGxldmVsIVxuICAgICAgICB2YXIgbm9kZUlkID0gQ2FtZWwuZ2V0Rm9sZGVyQ2FtZWxOb2RlSWQobm9kZUZvbGRlcik7XG4gICAgICAgIHZhciBzb3VyY2VJZCA9IENhbWVsLmdldEZvbGRlckNhbWVsTm9kZUlkKHNvdXJjZUZvbGRlcik7XG5cbiAgICAgICAgaWYgKG5vZGVJZCA9PT0gXCJyb3V0ZVwiKSB7XG4gICAgICAgICAgLy8gaGl0TW9kZSBtdXN0IGJlIFwib3ZlclwiIGlmIHdlIGFyZSBub3QgYW5vdGhlciByb3V0ZVxuICAgICAgICAgIGlmIChzb3VyY2VJZCA9PT0gXCJyb3V0ZVwiKSB7XG4gICAgICAgICAgICBpZiAoaGl0TW9kZSA9PT0gXCJvdmVyXCIpIHtcbiAgICAgICAgICAgICAgaGl0TW9kZSA9IFwiYWZ0ZXJcIjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gZGlzYWJsZSBiZWZvcmUgLyBhZnRlclxuICAgICAgICAgICAgaGl0TW9kZSA9IFwib3ZlclwiO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICBpZiAoQ2FtZWwuYWNjZXB0T3V0cHV0KG5vZGVJZCkpIHtcbiAgICAgICAgICAgIGhpdE1vZGUgPSBcIm92ZXJcIjtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYgKGhpdE1vZGUgIT09IFwiYmVmb3JlXCIpIHtcbiAgICAgICAgICAgICAgaGl0TW9kZSA9IFwiYWZ0ZXJcIjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgY29uc29sZS5sb2coXCJub2RlRHJvcCBub2RlSWQ6IFwiICsgbm9kZUlkICsgXCIgc291cmNlSWQ6IFwiICsgc291cmNlSWQgKyBcIiBoaXRNb2RlOiBcIiArIGhpdE1vZGUpO1xuXG4gICAgICAgIHNvdXJjZU5vZGUubW92ZShub2RlLCBoaXRNb2RlKTtcbiAgICAgIH1cbiAgICB9O1xuXG5cbiAgICB1cGRhdGVWaWV3KCk7XG5cbiAgICBmdW5jdGlvbiBhZGROZXdOb2RlKG5vZGVNb2RlbCkge1xuICAgICAgdmFyIGRvYyA9ICRzY29wZS5kb2MgfHwgZG9jdW1lbnQ7XG4gICAgICB2YXIgcGFyZW50Rm9sZGVyID0gJHNjb3BlLnNlbGVjdGVkRm9sZGVyIHx8ICRzY29wZS5jYW1lbENvbnRleHRUcmVlO1xuICAgICAgdmFyIGtleSA9IG5vZGVNb2RlbFtcIl9pZFwiXTtcbiAgICAgIHZhciBiZWZvcmVOb2RlID0gbnVsbDtcbiAgICAgIGlmICgha2V5KSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiV0FSTklORzogbm8gaWQgZm9yIG1vZGVsIFwiICsgSlNPTi5zdHJpbmdpZnkobm9kZU1vZGVsKSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgdHJlZU5vZGUgPSAkc2NvcGUudHJlZU5vZGU7XG4gICAgICAgIGlmIChrZXkgPT09IFwicm91dGVcIikge1xuICAgICAgICAgIC8vIGxldHMgYWRkIHRvIHRoZSByb290IG9mIHRoZSB0cmVlXG4gICAgICAgICAgdHJlZU5vZGUgPSAkc2NvcGUucm9vdFRyZWVOb2RlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGlmICghdHJlZU5vZGUpIHtcbiAgICAgICAgICAgIC8vIGxldHMgc2VsZWN0IHRoZSBsYXN0IHJvdXRlIC0gYW5kIGNyZWF0ZSBhIG5ldyByb3V0ZSBpZiBuZWVkIGJlXG4gICAgICAgICAgICB2YXIgcm9vdCA9ICRzY29wZS5yb290VHJlZU5vZGU7XG4gICAgICAgICAgICB2YXIgY2hpbGRyZW4gPSByb290LmdldENoaWxkcmVuKCk7XG4gICAgICAgICAgICBpZiAoIWNoaWxkcmVuIHx8ICFjaGlsZHJlbi5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgYWRkTmV3Tm9kZShDYW1lbC5nZXRDYW1lbFNjaGVtYShcInJvdXRlXCIpKTtcbiAgICAgICAgICAgICAgY2hpbGRyZW4gPSByb290LmdldENoaWxkcmVuKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoY2hpbGRyZW4gJiYgY2hpbGRyZW4ubGVuZ3RoKSB7XG4gICAgICAgICAgICAgIHRyZWVOb2RlID0gY2hpbGRyZW5bY2hpbGRyZW4ubGVuZ3RoIC0gMV07XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIkNvdWxkIG5vdCBhZGQgYSBuZXcgcm91dGUgdG8gdGhlIGVtcHR5IHRyZWUhXCIpO1xuICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuXG5cbiAgICAgICAgICAvLyBpZiB0aGUgcGFyZW50IGZvbGRlciBsaWtlcyB0byBhY3QgYXMgYSBwaXBlbGluZSwgdGhlbiBhZGRcbiAgICAgICAgICAvLyBhZnRlciB0aGUgcGFyZW50LCByYXRoZXIgdGhhbiBhcyBhIGNoaWxkXG4gICAgICAgICAgdmFyIHBhcmVudElkID0gQ2FtZWwuZ2V0Rm9sZGVyQ2FtZWxOb2RlSWQodHJlZU5vZGUuZGF0YSk7XG4gICAgICAgICAgaWYgKCFDYW1lbC5hY2NlcHRPdXRwdXQocGFyZW50SWQpKSB7XG4gICAgICAgICAgICAvLyBsZXRzIGFkZCB0aGUgbmV3IG5vZGUgdG8gdGhlIGVuZCBvZiB0aGUgcGFyZW50XG4gICAgICAgICAgICBiZWZvcmVOb2RlID0gdHJlZU5vZGUuZ2V0TmV4dFNpYmxpbmcoKTtcbiAgICAgICAgICAgIHRyZWVOb2RlID0gdHJlZU5vZGUuZ2V0UGFyZW50KCkgfHwgdHJlZU5vZGU7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmICh0cmVlTm9kZSkge1xuICAgICAgICAgIHZhciBub2RlID0gZG9jLmNyZWF0ZUVsZW1lbnQoa2V5KTtcbiAgICAgICAgICBwYXJlbnRGb2xkZXIgPSB0cmVlTm9kZS5kYXRhO1xuICAgICAgICAgIHZhciBhZGRlZE5vZGUgPSBDYW1lbC5hZGRSb3V0ZUNoaWxkKHBhcmVudEZvbGRlciwgbm9kZSk7XG4gICAgICAgICAgaWYgKGFkZGVkTm9kZSkge1xuICAgICAgICAgICAgdmFyIGFkZGVkID0gdHJlZU5vZGUuYWRkQ2hpbGQoYWRkZWROb2RlLCBiZWZvcmVOb2RlKTtcbiAgICAgICAgICAgIGlmIChhZGRlZCkge1xuICAgICAgICAgICAgICBnZXRGb2xkZXJYbWxOb2RlKGFkZGVkKTtcbiAgICAgICAgICAgICAgYWRkZWQuZXhwYW5kKHRydWUpO1xuICAgICAgICAgICAgICBhZGRlZC5zZWxlY3QodHJ1ZSk7XG4gICAgICAgICAgICAgIGFkZGVkLmFjdGl2YXRlKHRydWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIG9uTW9kZWxDaGFuZ2VFdmVudChldmVudCwgbmFtZSkge1xuICAgICAgLy8gbGV0cyBmaWx0ZXIgb3V0IGV2ZW50cyBkdWUgdG8gdGhlIG5vZGUgY2hhbmdpbmcgY2F1c2luZyB0aGVcbiAgICAgIC8vIGZvcm1zIHRvIGJlIHJlY3JlYXRlZFxuICAgICAgaWYgKCRzY29wZS5ub2RlRGF0YSkge1xuICAgICAgICB2YXIgZmllbGRNYXAgPSAkc2NvcGUubm9kZURhdGFDaGFuZ2VkRmllbGRzO1xuICAgICAgICBpZiAoZmllbGRNYXApIHtcbiAgICAgICAgICBpZiAoZmllbGRNYXBbbmFtZV0pIHtcbiAgICAgICAgICAgIG9uTm9kZURhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIHRoZSBzZWxlY3Rpb24gaGFzIGp1c3QgY2hhbmdlZCBzbyB3ZSBnZXQgdGhlIGluaXRpYWwgZXZlbnRcbiAgICAgICAgICAgIC8vIHdlIGNhbiBpZ25vcmUgdGhpcyA6KVxuICAgICAgICAgICAgZmllbGRNYXBbbmFtZV0gPSB0cnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIG9uTm9kZURhdGFDaGFuZ2VkKCkge1xuICAgICAgJHNjb3BlLm1vZGlmaWVkID0gdHJ1ZTtcbiAgICAgIHZhciBzZWxlY3RlZEZvbGRlciA9ICRzY29wZS5zZWxlY3RlZEZvbGRlcjtcbiAgICAgIGlmICgkc2NvcGUudHJlZU5vZGUgJiYgc2VsZWN0ZWRGb2xkZXIpIHtcbiAgICAgICAgdmFyIHJvdXRlWG1sTm9kZSA9IGdldEZvbGRlclhtbE5vZGUoJHNjb3BlLnRyZWVOb2RlKTtcbiAgICAgICAgaWYgKHJvdXRlWG1sTm9kZSkge1xuICAgICAgICAgIHZhciBub2RlTmFtZSA9IHJvdXRlWG1sTm9kZS5sb2NhbE5hbWU7XG4gICAgICAgICAgdmFyIG5vZGVTZXR0aW5ncyA9IENhbWVsLmdldENhbWVsU2NoZW1hKG5vZGVOYW1lKTtcbiAgICAgICAgICBpZiAobm9kZVNldHRpbmdzKSB7XG4gICAgICAgICAgICAvLyB1cGRhdGUgdGhlIHRpdGxlIGFuZCB0b29sdGlwIGV0Y1xuICAgICAgICAgICAgQ2FtZWwudXBkYXRlUm91dGVOb2RlTGFiZWxBbmRUb29sdGlwKHNlbGVjdGVkRm9sZGVyLCByb3V0ZVhtbE5vZGUsIG5vZGVTZXR0aW5ncyk7XG4gICAgICAgICAgICAkc2NvcGUudHJlZU5vZGUucmVuZGVyKGZhbHNlLCBmYWxzZSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIC8vIFRPRE8gbm90IHN1cmUgd2UgbmVlZCB0aGlzIHRvIGJlIGhvbmVzdFxuICAgICAgICBzZWxlY3RlZEZvbGRlcltcImNhbWVsTm9kZURhdGFcIl0gPSAkc2NvcGUubm9kZURhdGE7XG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gb25SZXN1bHRzKHJlc3BvbnNlKSB7XG4gICAgICB2YXIgdGV4dCA9IHJlc3BvbnNlLnRleHQ7XG4gICAgICBpZiAodGV4dCkge1xuICAgICAgICAvLyBsZXRzIHJlbW92ZSBhbnkgZG9kZ3kgY2hhcmFjdGVycyBzbyB3ZSBjYW4gdXNlIGl0IGFzIGEgRE9NIGlkXG4gICAgICAgIHZhciB0cmVlID0gQ2FtZWwubG9hZENhbWVsVHJlZSh0ZXh0LCAkc2NvcGUucGFnZUlkKTtcbiAgICAgICAgaWYgKHRyZWUpIHtcbiAgICAgICAgICAkc2NvcGUuY2FtZWxDb250ZXh0VHJlZSA9IHRyZWU7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiTm8gWE1MIGZvdW5kIGZvciBwYWdlIFwiICsgJHNjb3BlLnBhZ2VJZCk7XG4gICAgICB9XG4gICAgICBDb3JlLiRhcHBseUxhdGVyKCRzY29wZSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gdXBkYXRlVmlldygpIHtcbiAgICAgICRzY29wZS5sb2FkRW5kcG9pbnROYW1lcygpO1xuICAgICAgJHNjb3BlLnBhZ2VJZCA9IFdpa2kucGFnZUlkKCRyb3V0ZVBhcmFtcywgJGxvY2F0aW9uKTtcbiAgICAgIGNvbnNvbGUubG9nKFwiSGFzIHBhZ2UgaWQ6IFwiICsgJHNjb3BlLnBhZ2VJZCArIFwiIHdpdGggJHJvdXRlUGFyYW1zIFwiICsgSlNPTi5zdHJpbmdpZnkoJHJvdXRlUGFyYW1zKSk7XG5cbiAgICAgIHdpa2lSZXBvc2l0b3J5LmdldFBhZ2UoJHNjb3BlLmJyYW5jaCwgJHNjb3BlLnBhZ2VJZCwgJHNjb3BlLm9iamVjdElkLCBvblJlc3VsdHMpO1xuICAgIH1cblxuXG4gICAgZnVuY3Rpb24gZ29Ub1ZpZXcoKSB7XG4gICAgICAvLyBUT0RPIGxldHMgbmF2aWdhdGUgdG8gdGhlIHZpZXcgaWYgd2UgaGF2ZSBhIHNlcGFyYXRlIHZpZXcgb25lIGRheSA6KVxuICAgICAgLypcbiAgICAgICBpZiAoJHNjb3BlLmJyZWFkY3J1bWJzICYmICRzY29wZS5icmVhZGNydW1icy5sZW5ndGggPiAxKSB7XG4gICAgICAgdmFyIHZpZXdMaW5rID0gJHNjb3BlLmJyZWFkY3J1bWJzWyRzY29wZS5icmVhZGNydW1icy5sZW5ndGggLSAyXTtcbiAgICAgICBjb25zb2xlLmxvZyhcImdvVG9WaWV3IGhhcyBmb3VuZCB2aWV3IFwiICsgdmlld0xpbmspO1xuICAgICAgIHZhciBwYXRoID0gQ29yZS50cmltTGVhZGluZyh2aWV3TGluaywgXCIjXCIpO1xuICAgICAgICRsb2NhdGlvbi5wYXRoKHBhdGgpO1xuICAgICAgIH0gZWxzZSB7XG4gICAgICAgY29uc29sZS5sb2coXCJnb1RvVmlldyBoYXMgbm8gYnJlYWRjcnVtYnMhXCIpO1xuICAgICAgIH1cbiAgICAgICAqL1xuICAgIH1cblxuICAgICRzY29wZS5kb1N3aXRjaFRvQ2FudmFzVmlldyA9ICgpID0+IHtcbiAgICAgICRsb2NhdGlvbi51cmwoQ29yZS50cmltTGVhZGluZygoV2lraS5zdGFydExpbmsoJHNjb3BlLmJyYW5jaCkgKyBcIi9jYW1lbC9jYW52YXMvXCIgKyAkc2NvcGUucGFnZUlkKSwgJyMnKSk7XG4gICAgfTtcblxuICAgICRzY29wZS5jb25maXJtU3dpdGNoVG9DYW52YXNWaWV3ID0gKCkgPT4ge1xuICAgICAgaWYgKCRzY29wZS5tb2RpZmllZCkge1xuICAgICAgICAkc2NvcGUuc3dpdGNoVG9DYW52YXNWaWV3Lm9wZW4oKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgICRzY29wZS5kb1N3aXRjaFRvQ2FudmFzVmlldygpO1xuICAgICAgfVxuICAgIH07XG5cbiAgfV0pO1xufVxuIiwiLyoqXG4gKiBAbW9kdWxlIFdpa2lcbiAqL1xuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4vd2lraVBsdWdpbi50c1wiLz5cbm1vZHVsZSBXaWtpIHtcbiAgZXhwb3J0IHZhciBDYW1lbENhbnZhc0NvbnRyb2xsZXIgPSBfbW9kdWxlLmNvbnRyb2xsZXIoXCJXaWtpLkNhbWVsQ2FudmFzQ29udHJvbGxlclwiLCBbXCIkc2NvcGVcIiwgXCIkZWxlbWVudFwiLCBcIiRyb3V0ZVBhcmFtc1wiLCBcIiR0ZW1wbGF0ZUNhY2hlXCIsIFwiJGludGVycG9sYXRlXCIsIFwiJGxvY2F0aW9uXCIsICgkc2NvcGUsICRlbGVtZW50LCAkcm91dGVQYXJhbXMsICR0ZW1wbGF0ZUNhY2hlLCAkaW50ZXJwb2xhdGUsICRsb2NhdGlvbikgPT4ge1xuICAgIHZhciBqc1BsdW1iSW5zdGFuY2UgPSBqc1BsdW1iLmdldEluc3RhbmNlKCk7XG5cbiAgICBXaWtpLmluaXRTY29wZSgkc2NvcGUsICRyb3V0ZVBhcmFtcywgJGxvY2F0aW9uKTtcbiAgICB2YXIgd2lraVJlcG9zaXRvcnkgPSAkc2NvcGUud2lraVJlcG9zaXRvcnk7XG5cbiAgICAkc2NvcGUuYWRkRGlhbG9nID0gbmV3IFVJLkRpYWxvZygpO1xuICAgICRzY29wZS5wcm9wZXJ0aWVzRGlhbG9nID0gbmV3IFVJLkRpYWxvZygpO1xuICAgICRzY29wZS5zd2l0Y2hUb1RyZWVWaWV3ID0gbmV3IFVJLkRpYWxvZygpO1xuICAgICRzY29wZS5tb2RpZmllZCA9IGZhbHNlO1xuICAgICRzY29wZS5jYW1lbElnbm9yZUlkRm9yTGFiZWwgPSBDYW1lbC5pZ25vcmVJZEZvckxhYmVsKGxvY2FsU3RvcmFnZSk7XG4gICAgJHNjb3BlLmNhbWVsTWF4aW11bUxhYmVsV2lkdGggPSBDYW1lbC5tYXhpbXVtTGFiZWxXaWR0aChsb2NhbFN0b3JhZ2UpO1xuICAgICRzY29wZS5jYW1lbE1heGltdW1UcmFjZU9yRGVidWdCb2R5TGVuZ3RoID0gQ2FtZWwubWF4aW11bVRyYWNlT3JEZWJ1Z0JvZHlMZW5ndGgobG9jYWxTdG9yYWdlKTtcblxuICAgICRzY29wZS5mb3JtcyA9IHt9O1xuXG4gICAgJHNjb3BlLm5vZGVUZW1wbGF0ZSA9ICRpbnRlcnBvbGF0ZSgkdGVtcGxhdGVDYWNoZS5nZXQoXCJub2RlVGVtcGxhdGVcIikpO1xuXG4gICAgJHNjb3BlLiR3YXRjaChcImNhbWVsQ29udGV4dFRyZWVcIiwgKCkgPT4ge1xuICAgICAgdmFyIHRyZWUgPSAkc2NvcGUuY2FtZWxDb250ZXh0VHJlZTtcbiAgICAgICRzY29wZS5yb290Rm9sZGVyID0gdHJlZTtcbiAgICAgIC8vIG5vdyB3ZSd2ZSBnb3QgY2lkIHZhbHVlcyBpbiB0aGUgdHJlZSBhbmQgRE9NLCBsZXRzIGNyZWF0ZSBhbiBpbmRleCBzbyB3ZSBjYW4gYmluZCB0aGUgRE9NIHRvIHRoZSB0cmVlIG1vZGVsXG4gICAgICAkc2NvcGUuZm9sZGVycyA9IENhbWVsLmFkZEZvbGRlcnNUb0luZGV4KCRzY29wZS5yb290Rm9sZGVyKTtcblxuICAgICAgdmFyIGRvYyA9IENvcmUucGF0aEdldCh0cmVlLCBbXCJ4bWxEb2N1bWVudFwiXSk7XG4gICAgICBpZiAoZG9jKSB7XG4gICAgICAgICRzY29wZS5kb2MgPSBkb2M7XG4gICAgICAgIHJlbG9hZFJvdXRlSWRzKCk7XG4gICAgICAgIG9uUm91dGVTZWxlY3Rpb25DaGFuZ2VkKCk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICAkc2NvcGUuYWRkQW5kQ2xvc2VEaWFsb2cgPSAoKSA9PiB7XG4gICAgICB2YXIgbm9kZU1vZGVsID0gJHNjb3BlLnNlbGVjdGVkTm9kZU1vZGVsKCk7XG4gICAgICBpZiAobm9kZU1vZGVsKSB7XG4gICAgICAgIGFkZE5ld05vZGUobm9kZU1vZGVsKTtcbiAgICAgIH1cbiAgICAgICRzY29wZS5hZGREaWFsb2cuY2xvc2UoKTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLnJlbW92ZU5vZGUgPSAoKSA9PiB7XG4gICAgICB2YXIgZm9sZGVyID0gZ2V0U2VsZWN0ZWRPclJvdXRlRm9sZGVyKCk7XG4gICAgICBpZiAoZm9sZGVyKSB7XG4gICAgICAgIHZhciBub2RlTmFtZSA9IENhbWVsLmdldEZvbGRlckNhbWVsTm9kZUlkKGZvbGRlcik7XG4gICAgICAgIGZvbGRlci5kZXRhY2goKTtcbiAgICAgICAgaWYgKFwicm91dGVcIiA9PT0gbm9kZU5hbWUpIHtcbiAgICAgICAgICAvLyBsZXRzIGFsc28gY2xlYXIgdGhlIHNlbGVjdGVkIHJvdXRlIG5vZGVcbiAgICAgICAgICAkc2NvcGUuc2VsZWN0ZWRSb3V0ZUlkID0gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICB1cGRhdGVTZWxlY3Rpb24obnVsbCk7XG4gICAgICAgIHRyZWVNb2RpZmllZCgpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICAkc2NvcGUuZG9MYXlvdXQgPSAoKSA9PiB7XG4gICAgICAkc2NvcGUuZHJhd25Sb3V0ZUlkID0gbnVsbDtcbiAgICAgIG9uUm91dGVTZWxlY3Rpb25DaGFuZ2VkKCk7XG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIGlzUm91dGVPck5vZGUoKSB7XG4gICAgICByZXR1cm4gISRzY29wZS5zZWxlY3RlZEZvbGRlclxuICAgIH1cblxuICAgICRzY29wZS5nZXREZWxldGVUaXRsZSA9ICgpID0+IHtcbiAgICAgIGlmIChpc1JvdXRlT3JOb2RlKCkpIHtcbiAgICAgICAgcmV0dXJuIFwiRGVsZXRlIHRoaXMgcm91dGVcIjtcbiAgICAgIH1cbiAgICAgIHJldHVybiBcIkRlbGV0ZSB0aGlzIG5vZGVcIjtcbiAgICB9XG5cbiAgICAkc2NvcGUuZ2V0RGVsZXRlVGFyZ2V0ID0gKCkgPT4ge1xuICAgICAgaWYgKGlzUm91dGVPck5vZGUoKSkge1xuICAgICAgICByZXR1cm4gXCJSb3V0ZVwiO1xuICAgICAgfVxuICAgICAgcmV0dXJuIFwiTm9kZVwiO1xuICAgIH1cblxuICAgICRzY29wZS5pc0Zvcm1EaXJ0eSA9ICgpID0+IHtcbiAgICAgIGxvZy5kZWJ1ZyhcImVuZHBvaW50Rm9ybTogXCIsICRzY29wZS5lbmRwb2ludEZvcm0pO1xuICAgICAgaWYgKCRzY29wZS5lbmRwb2ludEZvcm0uJGRpcnR5KSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgICAgaWYgKCEkc2NvcGUuZm9ybXNbJ2Zvcm1FZGl0b3InXSkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gJHNjb3BlLmZvcm1zWydmb3JtRWRpdG9yJ11bJyRkaXJ0eSddO1xuICAgICAgfVxuICAgIH07XG5cbiAgICAvKiBUT0RPXG4gICAgICRzY29wZS5yZXNldEZvcm1zID0gKCkgPT4ge1xuXG4gICAgIH1cbiAgICAgKi9cblxuICAgIC8qXG4gICAgICogQ29udmVydHMgYSBwYXRoIGFuZCBhIHNldCBvZiBlbmRwb2ludCBwYXJhbWV0ZXJzIGludG8gYSBVUkkgd2UgY2FuIHRoZW4gdXNlIHRvIHN0b3JlIGluIHRoZSBYTUxcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBjcmVhdGVFbmRwb2ludFVSSShlbmRwb2ludFNjaGVtZTpzdHJpbmcsIHNsYXNoZXNUZXh0OnN0cmluZywgZW5kcG9pbnRQYXRoOnN0cmluZywgZW5kcG9pbnRQYXJhbWV0ZXJzOmFueSkge1xuICAgICAgY29uc29sZS5sb2coXCJzY2hlbWUgXCIgKyBlbmRwb2ludFNjaGVtZSArIFwiIHBhdGggXCIgKyBlbmRwb2ludFBhdGggKyBcIiBwYXJhbWV0ZXJzIFwiICsgZW5kcG9pbnRQYXJhbWV0ZXJzKTtcbiAgICAgIC8vIG5vdyBsZXRzIGNyZWF0ZSB0aGUgbmV3IFVSSSBmcm9tIHRoZSBwYXRoIGFuZCBwYXJhbWV0ZXJzXG4gICAgICAvLyBUT0RPIHNob3VsZCB3ZSB1c2UgSk1YIGZvciB0aGlzP1xuICAgICAgdmFyIHVyaSA9ICgoZW5kcG9pbnRTY2hlbWUpID8gZW5kcG9pbnRTY2hlbWUgKyBcIjpcIiArIHNsYXNoZXNUZXh0IDogXCJcIikgKyAoZW5kcG9pbnRQYXRoID8gZW5kcG9pbnRQYXRoIDogXCJcIik7XG4gICAgICB2YXIgcGFyYW1UZXh0ID0gQ29yZS5oYXNoVG9TdHJpbmcoZW5kcG9pbnRQYXJhbWV0ZXJzKTtcbiAgICAgIGlmIChwYXJhbVRleHQpIHtcbiAgICAgICAgdXJpICs9IFwiP1wiICsgcGFyYW1UZXh0O1xuICAgICAgfVxuICAgICAgcmV0dXJuIHVyaTtcbiAgICB9XG5cbiAgICAkc2NvcGUudXBkYXRlUHJvcGVydGllcyA9ICgpID0+IHtcbiAgICAgIGxvZy5pbmZvKFwib2xkIFVSSSBpcyBcIiArICRzY29wZS5ub2RlRGF0YS51cmkpO1xuICAgICAgdmFyIHVyaSA9IGNyZWF0ZUVuZHBvaW50VVJJKCRzY29wZS5lbmRwb2ludFNjaGVtZSwgKCRzY29wZS5lbmRwb2ludFBhdGhIYXNTbGFzaGVzID8gXCIvL1wiIDogXCJcIiksICRzY29wZS5lbmRwb2ludFBhdGgsICRzY29wZS5lbmRwb2ludFBhcmFtZXRlcnMpO1xuICAgICAgbG9nLmluZm8oXCJuZXcgVVJJIGlzIFwiICsgdXJpKTtcbiAgICAgIGlmICh1cmkpIHtcbiAgICAgICAgJHNjb3BlLm5vZGVEYXRhLnVyaSA9IHVyaTtcbiAgICAgIH1cblxuICAgICAgdmFyIGtleSA9IG51bGw7XG4gICAgICB2YXIgc2VsZWN0ZWRGb2xkZXIgPSAkc2NvcGUuc2VsZWN0ZWRGb2xkZXI7XG4gICAgICBpZiAoc2VsZWN0ZWRGb2xkZXIpIHtcbiAgICAgICAga2V5ID0gc2VsZWN0ZWRGb2xkZXIua2V5O1xuXG4gICAgICAgIC8vIGxldHMgZGVsZXRlIHRoZSBjdXJyZW50IHNlbGVjdGVkIG5vZGUncyBkaXYgc28gaXRzIHVwZGF0ZWQgd2l0aCB0aGUgbmV3IHRlbXBsYXRlIHZhbHVlc1xuICAgICAgICB2YXIgZWxlbWVudHMgPSAkZWxlbWVudC5maW5kKFwiLmNhbnZhc1wiKS5maW5kKFwiW2lkPSdcIiArIGtleSArIFwiJ11cIikuZmlyc3QoKS5yZW1vdmUoKTtcbiAgICAgIH1cblxuICAgICAgdHJlZU1vZGlmaWVkKCk7XG5cbiAgICAgIGlmIChrZXkpIHtcbiAgICAgICAgdXBkYXRlU2VsZWN0aW9uKGtleSlcbiAgICAgIH1cblxuICAgICAgaWYgKCRzY29wZS5pc0Zvcm1EaXJ0eSgpKSB7XG4gICAgICAgICRzY29wZS5lbmRwb2ludEZvcm0uJHNldFByaXN0aW5lKCk7XG4gICAgICAgIGlmICgkc2NvcGUuZm9ybXNbJ2Zvcm1FZGl0b3InXSkge1xuICAgICAgICAgICRzY29wZS5mb3Jtc1snZm9ybUVkaXRvciddLiRzZXRQcmlzdGluZSgpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIENvcmUuJGFwcGx5KCRzY29wZSk7XG4gICAgfTtcblxuICAgICRzY29wZS5zYXZlID0gKCkgPT4ge1xuICAgICAgLy8gZ2VuZXJhdGUgdGhlIG5ldyBYTUxcbiAgICAgIGlmICgkc2NvcGUubW9kaWZpZWQgJiYgJHNjb3BlLnJvb3RGb2xkZXIpIHtcbiAgICAgICAgdmFyIHhtbE5vZGUgPSBDYW1lbC5nZW5lcmF0ZVhtbEZyb21Gb2xkZXIoJHNjb3BlLnJvb3RGb2xkZXIpO1xuICAgICAgICBpZiAoeG1sTm9kZSkge1xuICAgICAgICAgIHZhciB0ZXh0ID0gQ29yZS54bWxOb2RlVG9TdHJpbmcoeG1sTm9kZSk7XG4gICAgICAgICAgaWYgKHRleHQpIHtcbiAgICAgICAgICAgIHZhciBkZWNvZGVkID0gZGVjb2RlVVJJQ29tcG9uZW50KHRleHQpO1xuICAgICAgICAgICAgbG9nLmRlYnVnKFwiU2F2aW5nIHhtbCBkZWNvZGVkOiBcIiArIGRlY29kZWQpO1xuXG4gICAgICAgICAgICAvLyBsZXRzIHNhdmUgdGhlIGZpbGUuLi5cbiAgICAgICAgICAgIHZhciBjb21taXRNZXNzYWdlID0gJHNjb3BlLmNvbW1pdE1lc3NhZ2UgfHwgXCJVcGRhdGVkIHBhZ2UgXCIgKyAkc2NvcGUucGFnZUlkO1xuICAgICAgICAgICAgd2lraVJlcG9zaXRvcnkucHV0UGFnZSgkc2NvcGUuYnJhbmNoLCAkc2NvcGUucGFnZUlkLCBkZWNvZGVkLCBjb21taXRNZXNzYWdlLCAoc3RhdHVzKSA9PiB7XG4gICAgICAgICAgICAgIFdpa2kub25Db21wbGV0ZShzdGF0dXMpO1xuICAgICAgICAgICAgICBDb3JlLm5vdGlmaWNhdGlvbihcInN1Y2Nlc3NcIiwgXCJTYXZlZCBcIiArICRzY29wZS5wYWdlSWQpO1xuICAgICAgICAgICAgICAkc2NvcGUubW9kaWZpZWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgZ29Ub1ZpZXcoKTtcbiAgICAgICAgICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH07XG5cbiAgICAkc2NvcGUuY2FuY2VsID0gKCkgPT4ge1xuICAgICAgY29uc29sZS5sb2coXCJjYW5jZWxsaW5nLi4uXCIpO1xuICAgICAgLy8gVE9ETyBzaG93IGRpYWxvZyBpZiBmb2xrcyBhcmUgYWJvdXQgdG8gbG9zZSBjaGFuZ2VzLi4uXG4gICAgfTtcblxuICAgICRzY29wZS4kd2F0Y2goXCJzZWxlY3RlZFJvdXRlSWRcIiwgb25Sb3V0ZVNlbGVjdGlvbkNoYW5nZWQpO1xuXG4gICAgZnVuY3Rpb24gZ29Ub1ZpZXcoKSB7XG4gICAgICAvLyBUT0RPIGxldHMgbmF2aWdhdGUgdG8gdGhlIHZpZXcgaWYgd2UgaGF2ZSBhIHNlcGFyYXRlIHZpZXcgb25lIGRheSA6KVxuICAgICAgLypcbiAgICAgICBpZiAoJHNjb3BlLmJyZWFkY3J1bWJzICYmICRzY29wZS5icmVhZGNydW1icy5sZW5ndGggPiAxKSB7XG4gICAgICAgdmFyIHZpZXdMaW5rID0gJHNjb3BlLmJyZWFkY3J1bWJzWyRzY29wZS5icmVhZGNydW1icy5sZW5ndGggLSAyXTtcbiAgICAgICBjb25zb2xlLmxvZyhcImdvVG9WaWV3IGhhcyBmb3VuZCB2aWV3IFwiICsgdmlld0xpbmspO1xuICAgICAgIHZhciBwYXRoID0gQ29yZS50cmltTGVhZGluZyh2aWV3TGluaywgXCIjXCIpO1xuICAgICAgICRsb2NhdGlvbi5wYXRoKHBhdGgpO1xuICAgICAgIH0gZWxzZSB7XG4gICAgICAgY29uc29sZS5sb2coXCJnb1RvVmlldyBoYXMgbm8gYnJlYWRjcnVtYnMhXCIpO1xuICAgICAgIH1cbiAgICAgICAqL1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGFkZE5ld05vZGUobm9kZU1vZGVsKSB7XG4gICAgICB2YXIgZG9jID0gJHNjb3BlLmRvYyB8fCBkb2N1bWVudDtcbiAgICAgIHZhciBwYXJlbnRGb2xkZXIgPSAkc2NvcGUuc2VsZWN0ZWRGb2xkZXIgfHwgJHNjb3BlLnJvb3RGb2xkZXI7XG4gICAgICB2YXIga2V5ID0gbm9kZU1vZGVsW1wiX2lkXCJdO1xuICAgICAgaWYgKCFrZXkpIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJXQVJOSU5HOiBubyBpZCBmb3IgbW9kZWwgXCIgKyBKU09OLnN0cmluZ2lmeShub2RlTW9kZWwpKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciB0cmVlTm9kZSA9ICRzY29wZS5zZWxlY3RlZEZvbGRlcjtcbiAgICAgICAgaWYgKGtleSA9PT0gXCJyb3V0ZVwiKSB7XG4gICAgICAgICAgLy8gbGV0cyBhZGQgdG8gdGhlIHJvb3Qgb2YgdGhlIHRyZWVcbiAgICAgICAgICB0cmVlTm9kZSA9ICRzY29wZS5yb290Rm9sZGVyO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGlmICghdHJlZU5vZGUpIHtcbiAgICAgICAgICAgIC8vIGxldHMgc2VsZWN0IHRoZSBsYXN0IHJvdXRlIC0gYW5kIGNyZWF0ZSBhIG5ldyByb3V0ZSBpZiBuZWVkIGJlXG4gICAgICAgICAgICB2YXIgcm9vdCA9ICRzY29wZS5yb290Rm9sZGVyO1xuICAgICAgICAgICAgdmFyIGNoaWxkcmVuID0gcm9vdC5jaGlsZHJlbjtcbiAgICAgICAgICAgIGlmICghY2hpbGRyZW4gfHwgIWNoaWxkcmVuLmxlbmd0aCkge1xuICAgICAgICAgICAgICBhZGROZXdOb2RlKENhbWVsLmdldENhbWVsU2NoZW1hKFwicm91dGVcIikpO1xuICAgICAgICAgICAgICBjaGlsZHJlbiA9IHJvb3QuY2hpbGRyZW47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoY2hpbGRyZW4gJiYgY2hpbGRyZW4ubGVuZ3RoKSB7XG4gICAgICAgICAgICAgIHRyZWVOb2RlID0gZ2V0Um91dGVGb2xkZXIoJHNjb3BlLnJvb3RGb2xkZXIsICRzY29wZS5zZWxlY3RlZFJvdXRlSWQpIHx8IGNoaWxkcmVuW2NoaWxkcmVuLmxlbmd0aCAtIDFdO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJDb3VsZCBub3QgYWRkIGEgbmV3IHJvdXRlIHRvIHRoZSBlbXB0eSB0cmVlIVwiKTtcbiAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vIGlmIHRoZSBwYXJlbnQgZm9sZGVyIGxpa2VzIHRvIGFjdCBhcyBhIHBpcGVsaW5lLCB0aGVuIGFkZFxuICAgICAgICAgIC8vIGFmdGVyIHRoZSBwYXJlbnQsIHJhdGhlciB0aGFuIGFzIGEgY2hpbGRcbiAgICAgICAgICB2YXIgcGFyZW50VHlwZU5hbWUgPSBDYW1lbC5nZXRGb2xkZXJDYW1lbE5vZGVJZCh0cmVlTm9kZSk7XG4gICAgICAgICAgaWYgKCFDYW1lbC5hY2NlcHRPdXRwdXQocGFyZW50VHlwZU5hbWUpKSB7XG4gICAgICAgICAgICB0cmVlTm9kZSA9IHRyZWVOb2RlLnBhcmVudCB8fCB0cmVlTm9kZTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRyZWVOb2RlKSB7XG4gICAgICAgICAgdmFyIG5vZGUgPSBkb2MuY3JlYXRlRWxlbWVudChrZXkpO1xuICAgICAgICAgIHBhcmVudEZvbGRlciA9IHRyZWVOb2RlO1xuICAgICAgICAgIHZhciBhZGRlZE5vZGUgPSBDYW1lbC5hZGRSb3V0ZUNoaWxkKHBhcmVudEZvbGRlciwgbm9kZSk7XG4gICAgICAgICAgLy8gVE9ETyBhZGQgdGhlIHNjaGVtYSBoZXJlIGZvciBhbiBlbGVtZW50Pz9cbiAgICAgICAgICAvLyBvciBkZWZhdWx0IHRoZSBkYXRhIG9yIHNvbWV0aGluZ1xuXG4gICAgICAgICAgdmFyIG5vZGVEYXRhID0ge1xuICAgICAgICAgIH07XG4gICAgICAgICAgaWYgKGtleSA9PT0gXCJlbmRwb2ludFwiICYmICRzY29wZS5lbmRwb2ludENvbmZpZykge1xuICAgICAgICAgICAgdmFyIGtleSA9ICRzY29wZS5lbmRwb2ludENvbmZpZy5rZXk7XG4gICAgICAgICAgICBpZiAoa2V5KSB7XG4gICAgICAgICAgICAgIG5vZGVEYXRhW1widXJpXCJdID0ga2V5ICsgXCI6XCI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGFkZGVkTm9kZVtcImNhbWVsTm9kZURhdGFcIl0gPSBub2RlRGF0YTtcbiAgICAgICAgICBhZGRlZE5vZGVbXCJlbmRwb2ludENvbmZpZ1wiXSA9ICRzY29wZS5lbmRwb2ludENvbmZpZztcblxuICAgICAgICAgIGlmIChrZXkgPT09IFwicm91dGVcIikge1xuICAgICAgICAgICAgLy8gbGV0cyBnZW5lcmF0ZSBhIG5ldyByb3V0ZUlkIGFuZCBzd2l0Y2ggdG8gaXRcbiAgICAgICAgICAgIHZhciBjb3VudCA9ICRzY29wZS5yb3V0ZUlkcy5sZW5ndGg7XG4gICAgICAgICAgICB2YXIgbm9kZUlkID0gbnVsbDtcbiAgICAgICAgICAgIHdoaWxlICh0cnVlKSB7XG4gICAgICAgICAgICAgIG5vZGVJZCA9IFwicm91dGVcIiArICgrK2NvdW50KTtcbiAgICAgICAgICAgICAgaWYgKCEkc2NvcGUucm91dGVJZHMuZmluZChub2RlSWQpKSB7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGFkZGVkTm9kZVtcInJvdXRlWG1sTm9kZVwiXS5zZXRBdHRyaWJ1dGUoXCJpZFwiLCBub2RlSWQpO1xuICAgICAgICAgICAgJHNjb3BlLnNlbGVjdGVkUm91dGVJZCA9IG5vZGVJZDtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHRyZWVNb2RpZmllZCgpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHRyZWVNb2RpZmllZChyZXBvc2l0aW9uID0gdHJ1ZSkge1xuICAgICAgLy8gbGV0cyByZWNyZWF0ZSB0aGUgWE1MIG1vZGVsIGZyb20gdGhlIHVwZGF0ZSBGb2xkZXIgdHJlZVxuICAgICAgdmFyIG5ld0RvYyA9IENhbWVsLmdlbmVyYXRlWG1sRnJvbUZvbGRlcigkc2NvcGUucm9vdEZvbGRlcik7XG4gICAgICB2YXIgdHJlZSA9IENhbWVsLmxvYWRDYW1lbFRyZWUobmV3RG9jLCAkc2NvcGUucGFnZUlkKTtcbiAgICAgIGlmICh0cmVlKSB7XG4gICAgICAgICRzY29wZS5yb290Rm9sZGVyID0gdHJlZTtcbiAgICAgICAgJHNjb3BlLmRvYyA9IENvcmUucGF0aEdldCh0cmVlLCBbXCJ4bWxEb2N1bWVudFwiXSk7XG4gICAgICB9XG4gICAgICAkc2NvcGUubW9kaWZpZWQgPSB0cnVlO1xuICAgICAgcmVsb2FkUm91dGVJZHMoKTtcbiAgICAgICRzY29wZS5kb0xheW91dCgpO1xuICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICB9XG5cblxuICAgIGZ1bmN0aW9uIHJlbG9hZFJvdXRlSWRzKCkge1xuICAgICAgJHNjb3BlLnJvdXRlSWRzID0gW107XG4gICAgICB2YXIgZG9jID0gJCgkc2NvcGUuZG9jKTtcbiAgICAgICRzY29wZS5jYW1lbFNlbGVjdGlvbkRldGFpbHMuc2VsZWN0ZWRDYW1lbENvbnRleHRJZCA9IGRvYy5maW5kKFwiY2FtZWxDb250ZXh0XCIpLmF0dHIoXCJpZFwiKTtcbiAgICAgIGRvYy5maW5kKFwicm91dGVcIikuZWFjaCgoaWR4LCByb3V0ZSkgPT4ge1xuICAgICAgICB2YXIgaWQgPSByb3V0ZS5nZXRBdHRyaWJ1dGUoXCJpZFwiKTtcbiAgICAgICAgaWYgKGlkKSB7XG4gICAgICAgICAgJHNjb3BlLnJvdXRlSWRzLnB1c2goaWQpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBvblJvdXRlU2VsZWN0aW9uQ2hhbmdlZCgpIHtcbiAgICAgIGlmICgkc2NvcGUuZG9jKSB7XG4gICAgICAgIGlmICghJHNjb3BlLnNlbGVjdGVkUm91dGVJZCAmJiAkc2NvcGUucm91dGVJZHMgJiYgJHNjb3BlLnJvdXRlSWRzLmxlbmd0aCkge1xuICAgICAgICAgICRzY29wZS5zZWxlY3RlZFJvdXRlSWQgPSAkc2NvcGUucm91dGVJZHNbMF07XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCRzY29wZS5zZWxlY3RlZFJvdXRlSWQgJiYgJHNjb3BlLnNlbGVjdGVkUm91dGVJZCAhPT0gJHNjb3BlLmRyYXduUm91dGVJZCkge1xuICAgICAgICAgIHZhciBub2RlcyA9IFtdO1xuICAgICAgICAgIHZhciBsaW5rcyA9IFtdO1xuICAgICAgICAgIENhbWVsLmxvYWRSb3V0ZVhtbE5vZGVzKCRzY29wZSwgJHNjb3BlLmRvYywgJHNjb3BlLnNlbGVjdGVkUm91dGVJZCwgbm9kZXMsIGxpbmtzLCBnZXRXaWR0aCgpKTtcbiAgICAgICAgICB1cGRhdGVTZWxlY3Rpb24oJHNjb3BlLnNlbGVjdGVkUm91dGVJZCk7XG4gICAgICAgICAgLy8gbm93IHdlJ3ZlIGdvdCBjaWQgdmFsdWVzIGluIHRoZSB0cmVlIGFuZCBET00sIGxldHMgY3JlYXRlIGFuIGluZGV4IHNvIHdlIGNhbiBiaW5kIHRoZSBET00gdG8gdGhlIHRyZWUgbW9kZWxcbiAgICAgICAgICAkc2NvcGUuZm9sZGVycyA9IENhbWVsLmFkZEZvbGRlcnNUb0luZGV4KCRzY29wZS5yb290Rm9sZGVyKTtcbiAgICAgICAgICBzaG93R3JhcGgobm9kZXMsIGxpbmtzKTtcbiAgICAgICAgICAkc2NvcGUuZHJhd25Sb3V0ZUlkID0gJHNjb3BlLnNlbGVjdGVkUm91dGVJZDtcbiAgICAgICAgfVxuICAgICAgICAkc2NvcGUuY2FtZWxTZWxlY3Rpb25EZXRhaWxzLnNlbGVjdGVkUm91dGVJZCA9ICRzY29wZS5zZWxlY3RlZFJvdXRlSWQ7XG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc2hvd0dyYXBoKG5vZGVzLCBsaW5rcykge1xuICAgICAgbGF5b3V0R3JhcGgobm9kZXMsIGxpbmtzKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXROb2RlSWQobm9kZSkge1xuICAgICAgaWYgKGFuZ3VsYXIuaXNOdW1iZXIobm9kZSkpIHtcbiAgICAgICAgdmFyIGlkeCA9IG5vZGU7XG4gICAgICAgIG5vZGUgPSAkc2NvcGUubm9kZVN0YXRlc1tpZHhdO1xuICAgICAgICBpZiAoIW5vZGUpIHtcbiAgICAgICAgICBjb25zb2xlLmxvZyhcIkNhbnQgZmluZCBub2RlIGF0IFwiICsgaWR4KTtcbiAgICAgICAgICByZXR1cm4gXCJub2RlLVwiICsgaWR4O1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gbm9kZS5jaWQgfHwgXCJub2RlLVwiICsgbm9kZS5pZDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXRTZWxlY3RlZE9yUm91dGVGb2xkZXIoKSB7XG4gICAgICByZXR1cm4gJHNjb3BlLnNlbGVjdGVkRm9sZGVyIHx8IGdldFJvdXRlRm9sZGVyKCRzY29wZS5yb290Rm9sZGVyLCAkc2NvcGUuc2VsZWN0ZWRSb3V0ZUlkKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXRDb250YWluZXJFbGVtZW50KCkge1xuICAgICAgdmFyIHJvb3RFbGVtZW50ID0gJGVsZW1lbnQ7XG4gICAgICB2YXIgY29udGFpbmVyRWxlbWVudCA9IHJvb3RFbGVtZW50LmZpbmQoXCIuY2FudmFzXCIpO1xuICAgICAgaWYgKCFjb250YWluZXJFbGVtZW50IHx8ICFjb250YWluZXJFbGVtZW50Lmxlbmd0aCkgY29udGFpbmVyRWxlbWVudCA9IHJvb3RFbGVtZW50O1xuICAgICAgcmV0dXJuIGNvbnRhaW5lckVsZW1lbnQ7XG4gICAgfVxuXG4gICAgLy8gY29uZmlndXJlIGNhbnZhcyBsYXlvdXQgYW5kIHN0eWxlc1xuICAgIHZhciBlbmRwb2ludFN0eWxlOmFueVtdID0gW1wiRG90XCIsIHsgcmFkaXVzOiA0LCBjc3NDbGFzczogJ2NhbWVsLWNhbnZhcy1lbmRwb2ludCcgfV07XG4gICAgdmFyIGhvdmVyUGFpbnRTdHlsZSA9IHsgc3Ryb2tlU3R5bGU6IFwicmVkXCIsIGxpbmVXaWR0aDogMyB9O1xuICAgIC8vdmFyIGxhYmVsU3R5bGVzOiBhbnlbXSA9IFsgXCJMYWJlbFwiLCB7IGxhYmVsOlwiRk9PXCIsIGlkOlwibGFiZWxcIiB9XTtcbiAgICB2YXIgbGFiZWxTdHlsZXM6YW55W10gPSBbIFwiTGFiZWxcIiBdO1xuICAgIHZhciBhcnJvd1N0eWxlczphbnlbXSA9IFsgXCJBcnJvd1wiLCB7XG4gICAgICBsb2NhdGlvbjogMSxcbiAgICAgIGlkOiBcImFycm93XCIsXG4gICAgICBsZW5ndGg6IDgsXG4gICAgICB3aWR0aDogOCxcbiAgICAgIGZvbGRiYWNrOiAwLjhcbiAgICB9IF07XG4gICAgdmFyIGNvbm5lY3RvclN0eWxlOmFueVtdID0gWyBcIlN0YXRlTWFjaGluZVwiLCB7IGN1cnZpbmVzczogMTAsIHByb3hpbWl0eUxpbWl0OiA1MCB9IF07XG5cbiAgICBqc1BsdW1iSW5zdGFuY2UuaW1wb3J0RGVmYXVsdHMoe1xuICAgICAgRW5kcG9pbnQ6IGVuZHBvaW50U3R5bGUsXG4gICAgICBIb3ZlclBhaW50U3R5bGU6IGhvdmVyUGFpbnRTdHlsZSxcbiAgICAgIENvbm5lY3Rpb25PdmVybGF5czogW1xuICAgICAgICBhcnJvd1N0eWxlcyxcbiAgICAgICAgbGFiZWxTdHlsZXNcbiAgICAgIF1cbiAgICB9KTtcblxuICAgICRzY29wZS4kb24oJyRkZXN0cm95JywgKCkgPT4ge1xuICAgICAganNQbHVtYkluc3RhbmNlLnJlc2V0KCk7XG4gICAgICBkZWxldGUganNQbHVtYkluc3RhbmNlO1xuICAgIH0pO1xuXG4gICAgLy8gZG91YmxlIGNsaWNrIG9uIGFueSBjb25uZWN0aW9uXG4gICAganNQbHVtYkluc3RhbmNlLmJpbmQoXCJkYmxjbGlja1wiLCBmdW5jdGlvbiAoY29ubmVjdGlvbiwgb3JpZ2luYWxFdmVudCkge1xuICAgICAgaWYgKGpzUGx1bWJJbnN0YW5jZS5pc1N1c3BlbmREcmF3aW5nKCkpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgYWxlcnQoXCJkb3VibGUgY2xpY2sgb24gY29ubmVjdGlvbiBmcm9tIFwiICsgY29ubmVjdGlvbi5zb3VyY2VJZCArIFwiIHRvIFwiICsgY29ubmVjdGlvbi50YXJnZXRJZCk7XG4gICAgfSk7XG5cbiAgICBqc1BsdW1iSW5zdGFuY2UuYmluZCgnY29ubmVjdGlvbicsIGZ1bmN0aW9uIChpbmZvLCBldnQpIHtcbiAgICAgIC8vbG9nLmRlYnVnKFwiQ29ubmVjdGlvbiBldmVudDogXCIsIGluZm8pO1xuICAgICAgbG9nLmRlYnVnKFwiQ3JlYXRpbmcgY29ubmVjdGlvbiBmcm9tIFwiLCBpbmZvLnNvdXJjZUlkLCBcIiB0byBcIiwgaW5mby50YXJnZXRJZCk7XG4gICAgICB2YXIgbGluayA9IGdldExpbmsoaW5mbyk7XG4gICAgICB2YXIgc291cmNlID0gJHNjb3BlLm5vZGVzW2xpbmsuc291cmNlXTtcbiAgICAgIHZhciBzb3VyY2VGb2xkZXIgPSAkc2NvcGUuZm9sZGVyc1tsaW5rLnNvdXJjZV07XG4gICAgICB2YXIgdGFyZ2V0Rm9sZGVyID0gJHNjb3BlLmZvbGRlcnNbbGluay50YXJnZXRdO1xuICAgICAgaWYgKENhbWVsLmlzTmV4dFNpYmxpbmdBZGRlZEFzQ2hpbGQoc291cmNlLnR5cGUpKSB7XG4gICAgICAgIHNvdXJjZUZvbGRlci5tb3ZlQ2hpbGQodGFyZ2V0Rm9sZGVyKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHNvdXJjZUZvbGRlci5wYXJlbnQuaW5zZXJ0QWZ0ZXIodGFyZ2V0Rm9sZGVyLCBzb3VyY2VGb2xkZXIpO1xuICAgICAgfVxuICAgICAgdHJlZU1vZGlmaWVkKCk7XG4gICAgfSk7XG5cbiAgICAvLyBsZXRzIGRlbGV0ZSBjb25uZWN0aW9ucyBvbiBjbGlja1xuICAgIGpzUGx1bWJJbnN0YW5jZS5iaW5kKFwiY2xpY2tcIiwgZnVuY3Rpb24gKGMpIHtcbiAgICAgIGlmIChqc1BsdW1iSW5zdGFuY2UuaXNTdXNwZW5kRHJhd2luZygpKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGpzUGx1bWJJbnN0YW5jZS5kZXRhY2goYyk7XG4gICAgfSk7XG5cbiAgICBmdW5jdGlvbiBsYXlvdXRHcmFwaChub2RlcywgbGlua3MpIHtcbiAgICAgIHZhciB0cmFuc2l0aW9ucyA9IFtdO1xuICAgICAgdmFyIHN0YXRlcyA9IENvcmUuY3JlYXRlR3JhcGhTdGF0ZXMobm9kZXMsIGxpbmtzLCB0cmFuc2l0aW9ucyk7XG5cbiAgICAgIGxvZy5kZWJ1ZyhcImxpbmtzOiBcIiwgbGlua3MpO1xuICAgICAgbG9nLmRlYnVnKFwidHJhbnNpdGlvbnM6IFwiLCB0cmFuc2l0aW9ucyk7XG5cbiAgICAgICRzY29wZS5ub2RlU3RhdGVzID0gc3RhdGVzO1xuICAgICAgdmFyIGNvbnRhaW5lckVsZW1lbnQgPSBnZXRDb250YWluZXJFbGVtZW50KCk7XG5cbiAgICAgIGpzUGx1bWJJbnN0YW5jZS5kb1doaWxlU3VzcGVuZGVkKCgpID0+IHtcblxuICAgICAgICAvL3NldCBvdXIgY29udGFpbmVyIHRvIHNvbWUgYXJiaXRyYXJ5IGluaXRpYWwgc2l6ZVxuICAgICAgICBjb250YWluZXJFbGVtZW50LmNzcyh7XG4gICAgICAgICAgJ3dpZHRoJzogJzgwMHB4JyxcbiAgICAgICAgICAnaGVpZ2h0JzogJzgwMHB4JyxcbiAgICAgICAgICAnbWluLWhlaWdodCc6ICc4MDBweCcsXG4gICAgICAgICAgJ21pbi13aWR0aCc6ICc4MDBweCdcbiAgICAgICAgfSk7XG4gICAgICAgIHZhciBjb250YWluZXJIZWlnaHQgPSAwO1xuICAgICAgICB2YXIgY29udGFpbmVyV2lkdGggPSAwO1xuXG4gICAgICAgIGNvbnRhaW5lckVsZW1lbnQuZmluZCgnZGl2LmNvbXBvbmVudCcpLmVhY2goKGksIGVsKSA9PiB7XG4gICAgICAgICAgbG9nLmRlYnVnKFwiQ2hlY2tpbmc6IFwiLCBlbCwgXCIgXCIsIGkpO1xuICAgICAgICAgIGlmICghc3RhdGVzLmFueSgobm9kZSkgPT4ge1xuICAgICAgICAgICAgICAgIHJldHVybiBlbC5pZCA9PT0gZ2V0Tm9kZUlkKG5vZGUpO1xuICAgICAgICAgICAgICB9KSkge1xuICAgICAgICAgICAgbG9nLmRlYnVnKFwiUmVtb3ZpbmcgZWxlbWVudDogXCIsIGVsLmlkKTtcbiAgICAgICAgICAgIGpzUGx1bWJJbnN0YW5jZS5yZW1vdmUoZWwpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgYW5ndWxhci5mb3JFYWNoKHN0YXRlcywgKG5vZGUpID0+IHtcbiAgICAgICAgICBsb2cuZGVidWcoXCJub2RlOiBcIiwgbm9kZSk7XG4gICAgICAgICAgdmFyIGlkID0gZ2V0Tm9kZUlkKG5vZGUpO1xuICAgICAgICAgIHZhciBkaXYgPSBjb250YWluZXJFbGVtZW50LmZpbmQoJyMnICsgaWQpO1xuXG4gICAgICAgICAgaWYgKCFkaXZbMF0pIHtcbiAgICAgICAgICAgIGRpdiA9ICQoJHNjb3BlLm5vZGVUZW1wbGF0ZSh7XG4gICAgICAgICAgICAgIGlkOiBpZCxcbiAgICAgICAgICAgICAgbm9kZTogbm9kZVxuICAgICAgICAgICAgfSkpO1xuICAgICAgICAgICAgZGl2LmFwcGVuZFRvKGNvbnRhaW5lckVsZW1lbnQpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vIE1ha2UgdGhlIG5vZGUgYSBqc3BsdW1iIHNvdXJjZVxuICAgICAgICAgIGpzUGx1bWJJbnN0YW5jZS5tYWtlU291cmNlKGRpdiwge1xuICAgICAgICAgICAgZmlsdGVyOiBcImltZy5ub2RlSWNvblwiLFxuICAgICAgICAgICAgYW5jaG9yOiBcIkNvbnRpbnVvdXNcIixcbiAgICAgICAgICAgIGNvbm5lY3RvcjogY29ubmVjdG9yU3R5bGUsXG4gICAgICAgICAgICBjb25uZWN0b3JTdHlsZTogeyBzdHJva2VTdHlsZTogXCIjNjY2XCIsIGxpbmVXaWR0aDogMyB9LFxuICAgICAgICAgICAgbWF4Q29ubmVjdGlvbnM6IC0xXG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgICAvLyBhbmQgYWxzbyBhIGpzcGx1bWIgdGFyZ2V0XG4gICAgICAgICAganNQbHVtYkluc3RhbmNlLm1ha2VUYXJnZXQoZGl2LCB7XG4gICAgICAgICAgICBkcm9wT3B0aW9uczogeyBob3ZlckNsYXNzOiBcImRyYWdIb3ZlclwiIH0sXG4gICAgICAgICAgICBhbmNob3I6IFwiQ29udGludW91c1wiXG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgICBqc1BsdW1iSW5zdGFuY2UuZHJhZ2dhYmxlKGRpdiwge1xuICAgICAgICAgICAgY29udGFpbm1lbnQ6ICcuY2FtZWwtY2FudmFzJ1xuICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgLy8gYWRkIGV2ZW50IGhhbmRsZXJzIHRvIHRoaXMgbm9kZVxuICAgICAgICAgIGRpdi5jbGljayhmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgbmV3RmxhZyA9ICFkaXYuaGFzQ2xhc3MoXCJzZWxlY3RlZFwiKTtcbiAgICAgICAgICAgIGNvbnRhaW5lckVsZW1lbnQuZmluZCgnZGl2LmNvbXBvbmVudCcpLnRvZ2dsZUNsYXNzKFwic2VsZWN0ZWRcIiwgZmFsc2UpO1xuICAgICAgICAgICAgZGl2LnRvZ2dsZUNsYXNzKFwic2VsZWN0ZWRcIiwgbmV3RmxhZyk7XG4gICAgICAgICAgICB2YXIgaWQgPSBkaXYuYXR0cihcImlkXCIpO1xuICAgICAgICAgICAgdXBkYXRlU2VsZWN0aW9uKG5ld0ZsYWcgPyBpZCA6IG51bGwpO1xuICAgICAgICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICAgICAgICB9KTtcblxuICAgICAgICAgIGRpdi5kYmxjbGljayhmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgaWQgPSBkaXYuYXR0cihcImlkXCIpO1xuICAgICAgICAgICAgdXBkYXRlU2VsZWN0aW9uKGlkKTtcbiAgICAgICAgICAgIC8vJHNjb3BlLnByb3BlcnRpZXNEaWFsb2cub3BlbigpO1xuICAgICAgICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICAgICAgICB9KTtcblxuICAgICAgICAgIHZhciBoZWlnaHQgPSBkaXYuaGVpZ2h0KCk7XG4gICAgICAgICAgdmFyIHdpZHRoID0gZGl2LndpZHRoKCk7XG4gICAgICAgICAgaWYgKGhlaWdodCB8fCB3aWR0aCkge1xuICAgICAgICAgICAgbm9kZS53aWR0aCA9IHdpZHRoO1xuICAgICAgICAgICAgbm9kZS5oZWlnaHQgPSBoZWlnaHQ7XG4gICAgICAgICAgICBkaXYuY3NzKHtcbiAgICAgICAgICAgICAgJ21pbi13aWR0aCc6IHdpZHRoLFxuICAgICAgICAgICAgICAnbWluLWhlaWdodCc6IGhlaWdodFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICB2YXIgZWRnZVNlcCA9IDEwO1xuXG4gICAgICAgIC8vIENyZWF0ZSB0aGUgbGF5b3V0IGFuZCBnZXQgdGhlIGJ1aWxkR3JhcGhcbiAgICAgICAgZGFncmUubGF5b3V0KClcbiAgICAgICAgICAgIC5ub2RlU2VwKDEwMClcbiAgICAgICAgICAgIC5lZGdlU2VwKGVkZ2VTZXApXG4gICAgICAgICAgICAucmFua1NlcCg3NSlcbiAgICAgICAgICAgIC5ub2RlcyhzdGF0ZXMpXG4gICAgICAgICAgICAuZWRnZXModHJhbnNpdGlvbnMpXG4gICAgICAgICAgICAuZGVidWdMZXZlbCgxKVxuICAgICAgICAgICAgLnJ1bigpO1xuXG4gICAgICAgIGFuZ3VsYXIuZm9yRWFjaChzdGF0ZXMsIChub2RlKSA9PiB7XG5cbiAgICAgICAgICAvLyBwb3NpdGlvbiB0aGUgbm9kZSBpbiB0aGUgZ3JhcGhcbiAgICAgICAgICB2YXIgaWQgPSBnZXROb2RlSWQobm9kZSk7XG4gICAgICAgICAgdmFyIGRpdiA9ICQoXCIjXCIgKyBpZCk7XG4gICAgICAgICAgdmFyIGRpdkhlaWdodCA9IGRpdi5oZWlnaHQoKTtcbiAgICAgICAgICB2YXIgZGl2V2lkdGggPSBkaXYud2lkdGgoKTtcbiAgICAgICAgICB2YXIgbGVmdE9mZnNldCA9IG5vZGUuZGFncmUueCArIGRpdldpZHRoO1xuICAgICAgICAgIHZhciBib3R0b21PZmZzZXQgPSBub2RlLmRhZ3JlLnkgKyBkaXZIZWlnaHQ7XG4gICAgICAgICAgaWYgKGNvbnRhaW5lckhlaWdodCA8IGJvdHRvbU9mZnNldCkge1xuICAgICAgICAgICAgY29udGFpbmVySGVpZ2h0ID0gYm90dG9tT2Zmc2V0ICsgZWRnZVNlcCAqIDI7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChjb250YWluZXJXaWR0aCA8IGxlZnRPZmZzZXQpIHtcbiAgICAgICAgICAgIGNvbnRhaW5lcldpZHRoID0gbGVmdE9mZnNldCArIGVkZ2VTZXAgKiAyO1xuICAgICAgICAgIH1cbiAgICAgICAgICBkaXYuY3NzKHt0b3A6IG5vZGUuZGFncmUueSwgbGVmdDogbm9kZS5kYWdyZS54fSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIHNpemUgdGhlIGNvbnRhaW5lciB0byBmaXQgdGhlIGdyYXBoXG4gICAgICAgIGNvbnRhaW5lckVsZW1lbnQuY3NzKHtcbiAgICAgICAgICAnd2lkdGgnOiBjb250YWluZXJXaWR0aCxcbiAgICAgICAgICAnaGVpZ2h0JzogY29udGFpbmVySGVpZ2h0LFxuICAgICAgICAgICdtaW4taGVpZ2h0JzogY29udGFpbmVySGVpZ2h0LFxuICAgICAgICAgICdtaW4td2lkdGgnOiBjb250YWluZXJXaWR0aFxuICAgICAgICB9KTtcblxuXG4gICAgICAgIGNvbnRhaW5lckVsZW1lbnQuZGJsY2xpY2soZnVuY3Rpb24gKCkge1xuICAgICAgICAgICRzY29wZS5wcm9wZXJ0aWVzRGlhbG9nLm9wZW4oKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAganNQbHVtYkluc3RhbmNlLnNldFN1c3BlbmRFdmVudHModHJ1ZSk7XG4gICAgICAgIC8vIERldGFjaCBhbGwgdGhlIGN1cnJlbnQgY29ubmVjdGlvbnMgYW5kIHJlY29ubmVjdCBldmVyeXRoaW5nIGJhc2VkIG9uIHRoZSB1cGRhdGVkIGdyYXBoXG4gICAgICAgIGpzUGx1bWJJbnN0YW5jZS5kZXRhY2hFdmVyeUNvbm5lY3Rpb24oe2ZpcmVFdmVudDogZmFsc2V9KTtcblxuICAgICAgICBhbmd1bGFyLmZvckVhY2gobGlua3MsIChsaW5rKSA9PiB7XG4gICAgICAgICAganNQbHVtYkluc3RhbmNlLmNvbm5lY3Qoe1xuICAgICAgICAgICAgc291cmNlOiBnZXROb2RlSWQobGluay5zb3VyY2UpLFxuICAgICAgICAgICAgdGFyZ2V0OiBnZXROb2RlSWQobGluay50YXJnZXQpXG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgICBqc1BsdW1iSW5zdGFuY2Uuc2V0U3VzcGVuZEV2ZW50cyhmYWxzZSk7XG5cbiAgICAgIH0pO1xuXG5cbiAgICAgIHJldHVybiBzdGF0ZXM7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0TGluayhpbmZvKSB7XG4gICAgICB2YXIgc291cmNlSWQgPSBpbmZvLnNvdXJjZUlkO1xuICAgICAgdmFyIHRhcmdldElkID0gaW5mby50YXJnZXRJZDtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHNvdXJjZTogc291cmNlSWQsXG4gICAgICAgIHRhcmdldDogdGFyZ2V0SWRcbiAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXROb2RlQnlDSUQobm9kZXMsIGNpZCkge1xuICAgICAgcmV0dXJuIG5vZGVzLmZpbmQoKG5vZGUpID0+IHtcbiAgICAgICAgcmV0dXJuIG5vZGUuY2lkID09PSBjaWQ7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICAvKlxuICAgICAqIFVwZGF0ZXMgdGhlIHNlbGVjdGlvbiB3aXRoIHRoZSBnaXZlbiBmb2xkZXIgb3IgSURcbiAgICAgKi9cbiAgICBmdW5jdGlvbiB1cGRhdGVTZWxlY3Rpb24oZm9sZGVyT3JJZCkge1xuICAgICAgdmFyIGZvbGRlciA9IG51bGw7XG4gICAgICBpZiAoYW5ndWxhci5pc1N0cmluZyhmb2xkZXJPcklkKSkge1xuICAgICAgICB2YXIgaWQgPSBmb2xkZXJPcklkO1xuICAgICAgICBmb2xkZXIgPSAoaWQgJiYgJHNjb3BlLmZvbGRlcnMpID8gJHNjb3BlLmZvbGRlcnNbaWRdIDogbnVsbDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGZvbGRlciA9IGZvbGRlck9ySWQ7XG4gICAgICB9XG4gICAgICAkc2NvcGUuc2VsZWN0ZWRGb2xkZXIgPSBmb2xkZXI7XG4gICAgICBmb2xkZXIgPSBnZXRTZWxlY3RlZE9yUm91dGVGb2xkZXIoKTtcbiAgICAgICRzY29wZS5ub2RlWG1sTm9kZSA9IG51bGw7XG4gICAgICAkc2NvcGUucHJvcGVydGllc1RlbXBsYXRlID0gbnVsbDtcbiAgICAgIGlmIChmb2xkZXIpIHtcbiAgICAgICAgdmFyIG5vZGVOYW1lID0gQ2FtZWwuZ2V0Rm9sZGVyQ2FtZWxOb2RlSWQoZm9sZGVyKTtcbiAgICAgICAgJHNjb3BlLm5vZGVEYXRhID0gQ2FtZWwuZ2V0Um91dGVGb2xkZXJKU09OKGZvbGRlcik7XG4gICAgICAgICRzY29wZS5ub2RlRGF0YUNoYW5nZWRGaWVsZHMgPSB7fTtcbiAgICAgICAgJHNjb3BlLm5vZGVNb2RlbCA9IENhbWVsLmdldENhbWVsU2NoZW1hKG5vZGVOYW1lKTtcbiAgICAgICAgaWYgKCRzY29wZS5ub2RlTW9kZWwpIHtcbiAgICAgICAgICAkc2NvcGUucHJvcGVydGllc1RlbXBsYXRlID0gXCJwbHVnaW5zL3dpa2kvaHRtbC9jYW1lbFByb3BlcnRpZXNFZGl0Lmh0bWxcIjtcbiAgICAgICAgfVxuICAgICAgICAkc2NvcGUuc2VsZWN0ZWRFbmRwb2ludCA9IG51bGw7XG4gICAgICAgIGlmIChcImVuZHBvaW50XCIgPT09IG5vZGVOYW1lKSB7XG4gICAgICAgICAgdmFyIHVyaSA9ICRzY29wZS5ub2RlRGF0YVtcInVyaVwiXTtcbiAgICAgICAgICBpZiAodXJpKSB7XG4gICAgICAgICAgICAvLyBsZXRzIGRlY29tcG9zZSB0aGUgVVJJIGludG8gc2NoZW1lLCBwYXRoIGFuZCBwYXJhbWV0ZXJzXG4gICAgICAgICAgICB2YXIgaWR4ID0gdXJpLmluZGV4T2YoXCI6XCIpO1xuICAgICAgICAgICAgaWYgKGlkeCA+IDApIHtcbiAgICAgICAgICAgICAgdmFyIGVuZHBvaW50U2NoZW1lID0gdXJpLnN1YnN0cmluZygwLCBpZHgpO1xuICAgICAgICAgICAgICB2YXIgZW5kcG9pbnRQYXRoID0gdXJpLnN1YnN0cmluZyhpZHggKyAxKTtcbiAgICAgICAgICAgICAgLy8gZm9yIGVtcHR5IHBhdGhzIGxldHMgYXNzdW1lIHdlIG5lZWQgLy8gb24gYSBVUklcbiAgICAgICAgICAgICAgJHNjb3BlLmVuZHBvaW50UGF0aEhhc1NsYXNoZXMgPSBlbmRwb2ludFBhdGggPyBmYWxzZSA6IHRydWU7XG4gICAgICAgICAgICAgIGlmIChlbmRwb2ludFBhdGguc3RhcnRzV2l0aChcIi8vXCIpKSB7XG4gICAgICAgICAgICAgICAgZW5kcG9pbnRQYXRoID0gZW5kcG9pbnRQYXRoLnN1YnN0cmluZygyKTtcbiAgICAgICAgICAgICAgICAkc2NvcGUuZW5kcG9pbnRQYXRoSGFzU2xhc2hlcyA9IHRydWU7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgaWR4ID0gZW5kcG9pbnRQYXRoLmluZGV4T2YoXCI/XCIpO1xuICAgICAgICAgICAgICB2YXIgZW5kcG9pbnRQYXJhbWV0ZXJzID0ge307XG4gICAgICAgICAgICAgIGlmIChpZHggPiAwKSB7XG4gICAgICAgICAgICAgICAgdmFyIHBhcmFtZXRlcnMgPSBlbmRwb2ludFBhdGguc3Vic3RyaW5nKGlkeCArIDEpO1xuICAgICAgICAgICAgICAgIGVuZHBvaW50UGF0aCA9IGVuZHBvaW50UGF0aC5zdWJzdHJpbmcoMCwgaWR4KTtcbiAgICAgICAgICAgICAgICBlbmRwb2ludFBhcmFtZXRlcnMgPSBDb3JlLnN0cmluZ1RvSGFzaChwYXJhbWV0ZXJzKTtcbiAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICRzY29wZS5lbmRwb2ludFNjaGVtZSA9IGVuZHBvaW50U2NoZW1lO1xuICAgICAgICAgICAgICAkc2NvcGUuZW5kcG9pbnRQYXRoID0gZW5kcG9pbnRQYXRoO1xuICAgICAgICAgICAgICAkc2NvcGUuZW5kcG9pbnRQYXJhbWV0ZXJzID0gZW5kcG9pbnRQYXJhbWV0ZXJzO1xuXG4gICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiZW5kcG9pbnQgXCIgKyBlbmRwb2ludFNjaGVtZSArIFwiIHBhdGggXCIgKyBlbmRwb2ludFBhdGggKyBcIiBhbmQgcGFyYW1ldGVycyBcIiArIEpTT04uc3RyaW5naWZ5KGVuZHBvaW50UGFyYW1ldGVycykpO1xuICAgICAgICAgICAgICAkc2NvcGUubG9hZEVuZHBvaW50U2NoZW1hKGVuZHBvaW50U2NoZW1lKTtcbiAgICAgICAgICAgICAgJHNjb3BlLnNlbGVjdGVkRW5kcG9pbnQgPSB7XG4gICAgICAgICAgICAgICAgZW5kcG9pbnRTY2hlbWU6IGVuZHBvaW50U2NoZW1lLFxuICAgICAgICAgICAgICAgIGVuZHBvaW50UGF0aDogZW5kcG9pbnRQYXRoLFxuICAgICAgICAgICAgICAgIHBhcmFtZXRlcnM6IGVuZHBvaW50UGFyYW1ldGVyc1xuICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldFdpZHRoKCkge1xuICAgICAgdmFyIGNhbnZhc0RpdiA9ICQoJGVsZW1lbnQpO1xuICAgICAgcmV0dXJuIGNhbnZhc0Rpdi53aWR0aCgpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldEZvbGRlcklkQXR0cmlidXRlKHJvdXRlKSB7XG4gICAgICB2YXIgaWQgPSBudWxsO1xuICAgICAgaWYgKHJvdXRlKSB7XG4gICAgICAgIHZhciB4bWxOb2RlID0gcm91dGVbXCJyb3V0ZVhtbE5vZGVcIl07XG4gICAgICAgIGlmICh4bWxOb2RlKSB7XG4gICAgICAgICAgaWQgPSB4bWxOb2RlLmdldEF0dHJpYnV0ZShcImlkXCIpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gaWQ7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0Um91dGVGb2xkZXIodHJlZSwgcm91dGVJZCkge1xuICAgICAgdmFyIGFuc3dlciA9IG51bGw7XG4gICAgICBpZiAodHJlZSkge1xuICAgICAgICBhbmd1bGFyLmZvckVhY2godHJlZS5jaGlsZHJlbiwgKHJvdXRlKSA9PiB7XG4gICAgICAgICAgaWYgKCFhbnN3ZXIpIHtcbiAgICAgICAgICAgIHZhciBpZCA9IGdldEZvbGRlcklkQXR0cmlidXRlKHJvdXRlKTtcbiAgICAgICAgICAgIGlmIChyb3V0ZUlkID09PSBpZCkge1xuICAgICAgICAgICAgICBhbnN3ZXIgPSByb3V0ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGFuc3dlcjtcbiAgICB9XG5cbiAgICAkc2NvcGUuZG9Td2l0Y2hUb1RyZWVWaWV3ID0gKCkgPT4ge1xuICAgICAgJGxvY2F0aW9uLnVybChDb3JlLnRyaW1MZWFkaW5nKCgkc2NvcGUuc3RhcnRMaW5rICsgXCIvY2FtZWwvcHJvcGVydGllcy9cIiArICRzY29wZS5wYWdlSWQpLCAnIycpKTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLmNvbmZpcm1Td2l0Y2hUb1RyZWVWaWV3ID0gKCkgPT4ge1xuICAgICAgaWYgKCRzY29wZS5tb2RpZmllZCkge1xuICAgICAgICAkc2NvcGUuc3dpdGNoVG9UcmVlVmlldy5vcGVuKCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAkc2NvcGUuZG9Td2l0Y2hUb1RyZWVWaWV3KCk7XG4gICAgICB9XG4gICAgfTtcblxuICB9XSk7XG59XG4iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vaW5jbHVkZXMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwid2lraUhlbHBlcnMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwid2lraVBsdWdpbi50c1wiLz5cblxuLyoqXG4gKiBAbW9kdWxlIFdpa2lcbiAqL1xubW9kdWxlIFdpa2kge1xuXG4gIF9tb2R1bGUuY29udHJvbGxlcihcIldpa2kuQ29tbWl0Q29udHJvbGxlclwiLCBbXCIkc2NvcGVcIiwgXCIkbG9jYXRpb25cIiwgXCIkcm91dGVQYXJhbXNcIiwgXCIkdGVtcGxhdGVDYWNoZVwiLCBcIm1hcmtlZFwiLCBcImZpbGVFeHRlbnNpb25UeXBlUmVnaXN0cnlcIiwgKCRzY29wZSwgJGxvY2F0aW9uLCAkcm91dGVQYXJhbXMsICR0ZW1wbGF0ZUNhY2hlLCBtYXJrZWQsIGZpbGVFeHRlbnNpb25UeXBlUmVnaXN0cnkpID0+IHtcblxuICAgIC8vIFRPRE8gcmVtb3ZlIVxuICAgIHZhciBpc0ZtYyA9IGZhbHNlO1xuICAgIHZhciBqb2xva2lhID0gbnVsbDtcblxuICAgIFdpa2kuaW5pdFNjb3BlKCRzY29wZSwgJHJvdXRlUGFyYW1zLCAkbG9jYXRpb24pO1xuICAgIHZhciB3aWtpUmVwb3NpdG9yeSA9ICRzY29wZS53aWtpUmVwb3NpdG9yeTtcblxuICAgICRzY29wZS5jb21taXRJZCA9ICRzY29wZS5vYmplY3RJZDtcbiAgICAkc2NvcGUuc2VsZWN0ZWRJdGVtcyA9IFtdO1xuXG4gICAgLy8gVE9ETyB3ZSBjb3VsZCBjb25maWd1cmUgdGhpcz9cbiAgICAkc2NvcGUuZGF0ZUZvcm1hdCA9ICdFRUUsIE1NTSBkLCB5IDogaGg6bW06c3MgYSc7XG5cbiAgICAkc2NvcGUuZ3JpZE9wdGlvbnMgPSB7XG4gICAgICBkYXRhOiAnY29tbWl0cycsXG4gICAgICBzaG93RmlsdGVyOiBmYWxzZSxcbiAgICAgIG11bHRpU2VsZWN0OiBmYWxzZSxcbiAgICAgIHNlbGVjdFdpdGhDaGVja2JveE9ubHk6IHRydWUsXG4gICAgICBzaG93U2VsZWN0aW9uQ2hlY2tib3g6IHRydWUsXG4gICAgICBkaXNwbGF5U2VsZWN0aW9uQ2hlY2tib3ggOiB0cnVlLCAvLyBvbGQgcHJlIDIuMCBjb25maWchXG4gICAgICBzZWxlY3RlZEl0ZW1zOiAkc2NvcGUuc2VsZWN0ZWRJdGVtcyxcbiAgICAgIGZpbHRlck9wdGlvbnM6IHtcbiAgICAgICAgZmlsdGVyVGV4dDogJydcbiAgICAgIH0sXG4gICAgICBjb2x1bW5EZWZzOiBbXG4gICAgICAgIHtcbiAgICAgICAgICBmaWVsZDogJ3BhdGgnLFxuICAgICAgICAgIGRpc3BsYXlOYW1lOiAnRmlsZSBOYW1lJyxcbiAgICAgICAgICBjZWxsVGVtcGxhdGU6ICR0ZW1wbGF0ZUNhY2hlLmdldCgnZmlsZUNlbGxUZW1wbGF0ZS5odG1sJyksXG4gICAgICAgICAgd2lkdGg6IFwiKioqXCIsXG4gICAgICAgICAgY2VsbEZpbHRlcjogXCJcIlxuICAgICAgICB9LFxuICAgICAgXVxuICAgIH07XG5cbiAgICAkc2NvcGUuJG9uKFwiJHJvdXRlQ2hhbmdlU3VjY2Vzc1wiLCBmdW5jdGlvbiAoZXZlbnQsIGN1cnJlbnQsIHByZXZpb3VzKSB7XG4gICAgICAvLyBsZXRzIGRvIHRoaXMgYXN5bmNocm9ub3VzbHkgdG8gYXZvaWQgRXJyb3I6ICRkaWdlc3QgYWxyZWFkeSBpbiBwcm9ncmVzc1xuICAgICAgc2V0VGltZW91dCh1cGRhdGVWaWV3LCA1MCk7XG4gICAgfSk7XG5cbiAgICAkc2NvcGUuJHdhdGNoKCd3b3Jrc3BhY2UudHJlZScsIGZ1bmN0aW9uICgpIHtcbiAgICAgIGlmICghJHNjb3BlLmdpdCkge1xuICAgICAgICAvLyBsZXRzIGRvIHRoaXMgYXN5bmNocm9ub3VzbHkgdG8gYXZvaWQgRXJyb3I6ICRkaWdlc3QgYWxyZWFkeSBpbiBwcm9ncmVzc1xuICAgICAgICAvL2NvbnNvbGUubG9nKFwiUmVsb2FkaW5nIHRoZSB2aWV3IGFzIHdlIG5vdyBzZWVtIHRvIGhhdmUgYSBnaXQgbWJlYW4hXCIpO1xuICAgICAgICBzZXRUaW1lb3V0KHVwZGF0ZVZpZXcsIDUwKTtcbiAgICAgIH1cbiAgICB9KTtcblxuXG4gICAgJHNjb3BlLmNhblJldmVydCA9ICgpID0+IHtcbiAgICAgIHJldHVybiAkc2NvcGUuc2VsZWN0ZWRJdGVtcy5sZW5ndGggPT09IDE7XG4gICAgfTtcblxuICAgICRzY29wZS5yZXZlcnQgPSAoKSA9PiB7XG4gICAgICBpZiAoJHNjb3BlLnNlbGVjdGVkSXRlbXMubGVuZ3RoID4gMCkge1xuICAgICAgICB2YXIgcGF0aCA9IGNvbW1pdFBhdGgoJHNjb3BlLnNlbGVjdGVkSXRlbXNbMF0pO1xuICAgICAgICB2YXIgb2JqZWN0SWQgPSAkc2NvcGUuY29tbWl0SWQ7XG4gICAgICAgIGlmIChwYXRoICYmIG9iamVjdElkKSB7XG4gICAgICAgICAgdmFyIGNvbW1pdE1lc3NhZ2UgPSBcIlJldmVydGluZyBmaWxlIFwiICsgJHNjb3BlLnBhZ2VJZCArIFwiIHRvIHByZXZpb3VzIHZlcnNpb24gXCIgKyBvYmplY3RJZDtcbiAgICAgICAgICB3aWtpUmVwb3NpdG9yeS5yZXZlcnRUbygkc2NvcGUuYnJhbmNoLCBvYmplY3RJZCwgJHNjb3BlLnBhZ2VJZCwgY29tbWl0TWVzc2FnZSwgKHJlc3VsdCkgPT4ge1xuICAgICAgICAgICAgV2lraS5vbkNvbXBsZXRlKHJlc3VsdCk7XG4gICAgICAgICAgICAvLyBub3cgbGV0cyB1cGRhdGUgdGhlIHZpZXdcbiAgICAgICAgICAgIHVwZGF0ZVZpZXcoKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH07XG5cbiAgICBmdW5jdGlvbiBjb21taXRQYXRoKGNvbW1pdCkge1xuICAgICAgcmV0dXJuIGNvbW1pdC5wYXRoIHx8IGNvbW1pdC5uYW1lO1xuICAgIH1cblxuICAgICRzY29wZS5kaWZmID0gKCkgPT4ge1xuICAgICAgaWYgKCRzY29wZS5zZWxlY3RlZEl0ZW1zLmxlbmd0aCA+IDApIHtcbiAgICAgICAgdmFyIGNvbW1pdCA9ICRzY29wZS5zZWxlY3RlZEl0ZW1zWzBdO1xuICAgICAgICAvKlxuICAgICAgICAgdmFyIGNvbW1pdCA9IHJvdztcbiAgICAgICAgIHZhciBlbnRpdHkgPSByb3cuZW50aXR5O1xuICAgICAgICAgaWYgKGVudGl0eSkge1xuICAgICAgICAgY29tbWl0ID0gZW50aXR5O1xuICAgICAgICAgfVxuICAgICAgICAgKi9cbiAgICAgICAgdmFyIGxpbmsgPSBzdGFydExpbmsoJHNjb3BlKSArIFwiL2RpZmYvXCIgKyBjb21taXRQYXRoKGNvbW1pdCkgKyBcIi9cIiArICRzY29wZS5jb21taXRJZCArIFwiL1wiO1xuICAgICAgICB2YXIgcGF0aCA9IENvcmUudHJpbUxlYWRpbmcobGluaywgXCIjXCIpO1xuICAgICAgICAkbG9jYXRpb24ucGF0aChwYXRoKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgdXBkYXRlVmlldygpO1xuXG4gICAgZnVuY3Rpb24gdXBkYXRlVmlldygpIHtcbiAgICAgIHZhciBjb21taXRJZCA9ICRzY29wZS5jb21taXRJZDtcblxuICAgICAgV2lraS5sb2FkQnJhbmNoZXMoam9sb2tpYSwgd2lraVJlcG9zaXRvcnksICRzY29wZSwgaXNGbWMpO1xuXG4gICAgICB3aWtpUmVwb3NpdG9yeS5jb21taXRJbmZvKGNvbW1pdElkLCAoY29tbWl0SW5mbykgPT4ge1xuICAgICAgICAkc2NvcGUuY29tbWl0SW5mbyA9IGNvbW1pdEluZm87XG4gICAgICAgIENvcmUuJGFwcGx5KCRzY29wZSk7XG4gICAgICB9KTtcblxuICAgICAgd2lraVJlcG9zaXRvcnkuY29tbWl0VHJlZShjb21taXRJZCwgKGNvbW1pdHMpID0+IHtcbiAgICAgICAgJHNjb3BlLmNvbW1pdHMgPSBjb21taXRzO1xuICAgICAgICBhbmd1bGFyLmZvckVhY2goY29tbWl0cywgKGNvbW1pdCkgPT4ge1xuICAgICAgICAgIGNvbW1pdC5maWxlSWNvbkh0bWwgPSBXaWtpLmZpbGVJY29uSHRtbChjb21taXQpO1xuICAgICAgICAgIGNvbW1pdC5maWxlQ2xhc3MgPSBjb21taXQubmFtZS5lbmRzV2l0aChcIi5wcm9maWxlXCIpID8gXCJncmVlblwiIDogXCJcIjtcbiAgICAgICAgICB2YXIgY2hhbmdlVHlwZSA9IGNvbW1pdC5jaGFuZ2VUeXBlO1xuICAgICAgICAgIHZhciBwYXRoID0gY29tbWl0UGF0aChjb21taXQpO1xuICAgICAgICAgIGlmIChwYXRoKSB7XG4gICAgICAgICAgICBjb21taXQuZmlsZUxpbmsgPSBzdGFydExpbmsoJHNjb3BlKSArICcvdmVyc2lvbi8nICsgcGF0aCArICcvJyArIGNvbW1pdElkO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoY2hhbmdlVHlwZSkge1xuICAgICAgICAgICAgY2hhbmdlVHlwZSA9IGNoYW5nZVR5cGUudG9Mb3dlckNhc2UoKTtcbiAgICAgICAgICAgIGlmIChjaGFuZ2VUeXBlLnN0YXJ0c1dpdGgoXCJhXCIpKSB7XG4gICAgICAgICAgICAgIGNvbW1pdC5jaGFuZ2VDbGFzcyA9IFwiY2hhbmdlLWFkZFwiO1xuICAgICAgICAgICAgICBjb21taXQuY2hhbmdlID0gXCJhZGRcIjtcbiAgICAgICAgICAgICAgY29tbWl0LnRpdGxlID0gXCJhZGRlZFwiO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChjaGFuZ2VUeXBlLnN0YXJ0c1dpdGgoXCJkXCIpKSB7XG4gICAgICAgICAgICAgIGNvbW1pdC5jaGFuZ2VDbGFzcyA9IFwiY2hhbmdlLWRlbGV0ZVwiO1xuICAgICAgICAgICAgICBjb21taXQuY2hhbmdlID0gXCJkZWxldGVcIjtcbiAgICAgICAgICAgICAgY29tbWl0LnRpdGxlID0gXCJkZWxldGVkXCI7XG4gICAgICAgICAgICAgIGNvbW1pdC5maWxlTGluayA9IG51bGw7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBjb21taXQuY2hhbmdlQ2xhc3MgPSBcImNoYW5nZS1tb2RpZnlcIjtcbiAgICAgICAgICAgICAgY29tbWl0LmNoYW5nZSA9IFwibW9kaWZ5XCI7XG4gICAgICAgICAgICAgIGNvbW1pdC50aXRsZSA9IFwibW9kaWZpZWRcIjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbW1pdC5jaGFuZ2VUeXBlSHRtbCA9ICc8c3BhbiBjbGFzcz1cIicgKyBjb21taXQuY2hhbmdlQ2xhc3MgKyAnXCI+JyArIGNvbW1pdC50aXRsZSArICc8L3NwYW4+JztcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBDb3JlLiRhcHBseSgkc2NvcGUpO1xuICAgICAgfSk7XG4gICAgfVxuICB9XSk7XG59XG4iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vaW5jbHVkZXMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwid2lraUhlbHBlcnMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwid2lraVBsdWdpbi50c1wiLz5cblxubW9kdWxlIFdpa2kge1xuXG4gIHZhciBDcmVhdGVDb250cm9sbGVyID0gY29udHJvbGxlcihcIkNyZWF0ZUNvbnRyb2xsZXJcIiwgW1wiJHNjb3BlXCIsIFwiJGxvY2F0aW9uXCIsIFwiJHJvdXRlUGFyYW1zXCIsIFwiJHJvdXRlXCIsIFwiJGh0dHBcIiwgXCIkdGltZW91dFwiLCAoJHNjb3BlLCAkbG9jYXRpb246bmcuSUxvY2F0aW9uU2VydmljZSwgJHJvdXRlUGFyYW1zOm5nLnJvdXRlLklSb3V0ZVBhcmFtc1NlcnZpY2UsICRyb3V0ZTpuZy5yb3V0ZS5JUm91dGVTZXJ2aWNlLCAkaHR0cDpuZy5JSHR0cFNlcnZpY2UsICR0aW1lb3V0Om5nLklUaW1lb3V0U2VydmljZSkgPT4ge1xuXG4gICAgV2lraS5pbml0U2NvcGUoJHNjb3BlLCAkcm91dGVQYXJhbXMsICRsb2NhdGlvbik7XG4gICAgdmFyIHdpa2lSZXBvc2l0b3J5ID0gJHNjb3BlLndpa2lSZXBvc2l0b3J5O1xuXG5cbiAgICAvLyBUT0RPIHJlbW92ZVxuICAgIHZhciB3b3Jrc3BhY2UgPSBudWxsO1xuXG4gICAgJHNjb3BlLmNyZWF0ZURvY3VtZW50VHJlZSA9IFdpa2kuY3JlYXRlV2l6YXJkVHJlZSh3b3Jrc3BhY2UsICRzY29wZSk7XG4gICAgJHNjb3BlLmNyZWF0ZURvY3VtZW50VHJlZUNoaWxkcmVuID0gJHNjb3BlLmNyZWF0ZURvY3VtZW50VHJlZS5jaGlsZHJlbjtcbiAgICAkc2NvcGUuY3JlYXRlRG9jdW1lbnRUcmVlQWN0aXZhdGlvbnMgPSBbXCJjYW1lbC1zcHJpbmcueG1sXCIsIFwiUmVhZE1lLm1kXCJdO1xuXG4gICAgJHNjb3BlLnRyZWVPcHRpb25zID0ge1xuICAgICAgICBub2RlQ2hpbGRyZW46IFwiY2hpbGRyZW5cIixcbiAgICAgICAgZGlyU2VsZWN0YWJsZTogdHJ1ZSxcbiAgICAgICAgaW5qZWN0Q2xhc3Nlczoge1xuICAgICAgICAgICAgdWw6IFwiYTFcIixcbiAgICAgICAgICAgIGxpOiBcImEyXCIsXG4gICAgICAgICAgICBsaVNlbGVjdGVkOiBcImE3XCIsXG4gICAgICAgICAgICBpRXhwYW5kZWQ6IFwiYTNcIixcbiAgICAgICAgICAgIGlDb2xsYXBzZWQ6IFwiYTRcIixcbiAgICAgICAgICAgIGlMZWFmOiBcImE1XCIsXG4gICAgICAgICAgICBsYWJlbDogXCJhNlwiLFxuICAgICAgICAgICAgbGFiZWxTZWxlY3RlZDogXCJhOFwiXG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgJHNjb3BlLmZpbGVFeGlzdHMgPSB7XG4gICAgICBleGlzdHM6IGZhbHNlLFxuICAgICAgbmFtZTogXCJcIlxuICAgIH07XG4gICAgJHNjb3BlLm5ld0RvY3VtZW50TmFtZSA9IFwiXCI7XG4gICAgJHNjb3BlLnNlbGVjdGVkQ3JlYXRlRG9jdW1lbnRFeHRlbnNpb24gPSBudWxsO1xuICAgICRzY29wZS5maWxlRXhpc3RzLmV4aXN0cyA9IGZhbHNlO1xuICAgICRzY29wZS5maWxlRXhpc3RzLm5hbWUgPSBcIlwiO1xuICAgICRzY29wZS5uZXdEb2N1bWVudE5hbWUgPSBcIlwiO1xuXG4gICAgZnVuY3Rpb24gcmV0dXJuVG9EaXJlY3RvcnkoKSB7XG4gICAgICB2YXIgbGluayA9IFdpa2kudmlld0xpbmsoJHNjb3BlLCAkc2NvcGUucGFnZUlkLCAkbG9jYXRpb24pXG4gICAgICBsb2cuZGVidWcoXCJDYW5jZWxsaW5nLCBnb2luZyB0byBsaW5rOiBcIiwgbGluayk7XG4gICAgICBXaWtpLmdvVG9MaW5rKGxpbmssICR0aW1lb3V0LCAkbG9jYXRpb24pO1xuICAgIH1cblxuICAgICRzY29wZS5jYW5jZWwgPSAoKSA9PiB7XG4gICAgICByZXR1cm5Ub0RpcmVjdG9yeSgpO1xuICAgIH07XG5cbiAgICAkc2NvcGUub25DcmVhdGVEb2N1bWVudFNlbGVjdCA9IChub2RlKSA9PiB7XG4gICAgICAvLyByZXNldCBhcyB3ZSBzd2l0Y2ggYmV0d2VlbiBkb2N1bWVudCB0eXBlc1xuICAgICAgJHNjb3BlLmZpbGVFeGlzdHMuZXhpc3RzID0gZmFsc2U7XG4gICAgICAkc2NvcGUuZmlsZUV4aXN0cy5uYW1lID0gXCJcIjtcbiAgICAgIHZhciBlbnRpdHkgPSBub2RlID8gbm9kZS5lbnRpdHkgOiBudWxsO1xuICAgICAgJHNjb3BlLnNlbGVjdGVkQ3JlYXRlRG9jdW1lbnRUZW1wbGF0ZSA9IGVudGl0eTtcbiAgICAgICRzY29wZS5zZWxlY3RlZENyZWF0ZURvY3VtZW50VGVtcGxhdGVSZWdleCA9ICRzY29wZS5zZWxlY3RlZENyZWF0ZURvY3VtZW50VGVtcGxhdGUucmVnZXggfHwgLy4qLztcbiAgICAgICRzY29wZS5zZWxlY3RlZENyZWF0ZURvY3VtZW50VGVtcGxhdGVJbnZhbGlkID0gJHNjb3BlLnNlbGVjdGVkQ3JlYXRlRG9jdW1lbnRUZW1wbGF0ZS5pbnZhbGlkIHx8IFwiaW52YWxpZCBuYW1lXCI7XG4gICAgICAkc2NvcGUuc2VsZWN0ZWRDcmVhdGVEb2N1bWVudFRlbXBsYXRlRXh0ZW5zaW9uID0gJHNjb3BlLnNlbGVjdGVkQ3JlYXRlRG9jdW1lbnRUZW1wbGF0ZS5leHRlbnNpb24gfHwgbnVsbDtcbiAgICAgIGxvZy5kZWJ1ZyhcIkVudGl0eTogXCIsIGVudGl0eSk7XG4gICAgICBpZiAoZW50aXR5KSB7XG4gICAgICAgIGlmIChlbnRpdHkuZ2VuZXJhdGVkKSB7XG4gICAgICAgICAgJHNjb3BlLmZvcm1TY2hlbWEgPSBlbnRpdHkuZ2VuZXJhdGVkLnNjaGVtYTtcbiAgICAgICAgICAkc2NvcGUuZm9ybURhdGEgPSBlbnRpdHkuZ2VuZXJhdGVkLmZvcm0od29ya3NwYWNlLCAkc2NvcGUpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICRzY29wZS5mb3JtU2NoZW1hID0ge307XG4gICAgICAgICAgJHNjb3BlLmZvcm1EYXRhID0ge307XG4gICAgICAgIH1cbiAgICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICAgIH1cblxuICAgIH07XG5cbiAgICAkc2NvcGUuYWRkQW5kQ2xvc2VEaWFsb2cgPSAoZmlsZU5hbWU6c3RyaW5nKSA9PiB7XG4gICAgICAkc2NvcGUubmV3RG9jdW1lbnROYW1lID0gZmlsZU5hbWU7XG4gICAgICB2YXIgdGVtcGxhdGUgPSAkc2NvcGUuc2VsZWN0ZWRDcmVhdGVEb2N1bWVudFRlbXBsYXRlO1xuICAgICAgdmFyIHBhdGggPSBnZXROZXdEb2N1bWVudFBhdGgoKTtcblxuICAgICAgLy8gY2xlYXIgJHNjb3BlLm5ld0RvY3VtZW50TmFtZSBzbyB3ZSBkb250IHJlbWVtYmVyIGl0IHdoZW4gd2Ugb3BlbiBpdCBuZXh0IHRpbWVcbiAgICAgICRzY29wZS5uZXdEb2N1bWVudE5hbWUgPSBudWxsO1xuXG4gICAgICAvLyByZXNldCBiZWZvcmUgd2UgY2hlY2sganVzdCBpbiBhIGJpdFxuICAgICAgJHNjb3BlLmZpbGVFeGlzdHMuZXhpc3RzID0gZmFsc2U7XG4gICAgICAkc2NvcGUuZmlsZUV4aXN0cy5uYW1lID0gXCJcIjtcbiAgICAgICRzY29wZS5maWxlRXh0ZW5zaW9uSW52YWxpZCA9IG51bGw7XG5cbiAgICAgIGlmICghdGVtcGxhdGUgfHwgIXBhdGgpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICAvLyB2YWxpZGF0ZSBpZiB0aGUgbmFtZSBtYXRjaCB0aGUgZXh0ZW5zaW9uXG4gICAgICBpZiAoJHNjb3BlLnNlbGVjdGVkQ3JlYXRlRG9jdW1lbnRUZW1wbGF0ZUV4dGVuc2lvbikge1xuICAgICAgICB2YXIgaWR4ID0gcGF0aC5sYXN0SW5kZXhPZignLicpO1xuICAgICAgICBpZiAoaWR4ID4gMCkge1xuICAgICAgICAgIHZhciBleHQgPSBwYXRoLnN1YnN0cmluZyhpZHgpO1xuICAgICAgICAgIGlmICgkc2NvcGUuc2VsZWN0ZWRDcmVhdGVEb2N1bWVudFRlbXBsYXRlRXh0ZW5zaW9uICE9PSBleHQpIHtcbiAgICAgICAgICAgICRzY29wZS5maWxlRXh0ZW5zaW9uSW52YWxpZCA9IFwiRmlsZSBleHRlbnNpb24gbXVzdCBiZTogXCIgKyAkc2NvcGUuc2VsZWN0ZWRDcmVhdGVEb2N1bWVudFRlbXBsYXRlRXh0ZW5zaW9uO1xuICAgICAgICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8gdmFsaWRhdGUgaWYgdGhlIGZpbGUgZXhpc3RzLCBhbmQgdXNlIHRoZSBzeW5jaHJvbm91cyBjYWxsXG4gICAgICB3aWtpUmVwb3NpdG9yeS5leGlzdHMoJHNjb3BlLmJyYW5jaCwgcGF0aCwgKGV4aXN0cykgPT4ge1xuICAgICAgICAkc2NvcGUuZmlsZUV4aXN0cy5leGlzdHMgPSBleGlzdHM7XG4gICAgICAgICRzY29wZS5maWxlRXhpc3RzLm5hbWUgPSBleGlzdHMgPyBwYXRoIDogZmFsc2U7XG4gICAgICAgIGlmICghZXhpc3RzKSB7XG4gICAgICAgICAgZG9DcmVhdGUoKTtcbiAgICAgICAgfVxuICAgICAgICBDb3JlLiRhcHBseSgkc2NvcGUpO1xuICAgICAgfSk7XG5cbiAgICAgIGZ1bmN0aW9uIGRvQ3JlYXRlKCkge1xuICAgICAgICB2YXIgbmFtZSA9IFdpa2kuZmlsZU5hbWUocGF0aCk7XG4gICAgICAgIHZhciBmb2xkZXIgPSBXaWtpLmZpbGVQYXJlbnQocGF0aCk7XG4gICAgICAgIHZhciBleGVtcGxhciA9IHRlbXBsYXRlLmV4ZW1wbGFyO1xuXG4gICAgICAgIHZhciBjb21taXRNZXNzYWdlID0gXCJDcmVhdGVkIFwiICsgdGVtcGxhdGUubGFiZWw7XG4gICAgICAgIHZhciBleGVtcGxhclVyaSA9IENvcmUudXJsKFwiL3BsdWdpbnMvd2lraS9leGVtcGxhci9cIiArIGV4ZW1wbGFyKTtcblxuICAgICAgICBpZiAodGVtcGxhdGUuZm9sZGVyKSB7XG4gICAgICAgICAgQ29yZS5ub3RpZmljYXRpb24oXCJzdWNjZXNzXCIsIFwiQ3JlYXRpbmcgbmV3IGZvbGRlciBcIiArIG5hbWUpO1xuXG4gICAgICAgICAgd2lraVJlcG9zaXRvcnkuY3JlYXRlRGlyZWN0b3J5KCRzY29wZS5icmFuY2gsIHBhdGgsIGNvbW1pdE1lc3NhZ2UsIChzdGF0dXMpID0+IHtcbiAgICAgICAgICAgIHZhciBsaW5rID0gV2lraS52aWV3TGluaygkc2NvcGUsIHBhdGgsICRsb2NhdGlvbik7XG4gICAgICAgICAgICBnb1RvTGluayhsaW5rLCAkdGltZW91dCwgJGxvY2F0aW9uKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIGlmICh0ZW1wbGF0ZS5wcm9maWxlKSB7XG5cbiAgICAgICAgICBmdW5jdGlvbiB0b1BhdGgocHJvZmlsZU5hbWU6c3RyaW5nKSB7XG4gICAgICAgICAgICB2YXIgYW5zd2VyID0gXCJmYWJyaWMvcHJvZmlsZXMvXCIgKyBwcm9maWxlTmFtZTtcbiAgICAgICAgICAgIGFuc3dlciA9IGFuc3dlci5yZXBsYWNlKC8tL2csIFwiL1wiKTtcbiAgICAgICAgICAgIGFuc3dlciA9IGFuc3dlciArIFwiLnByb2ZpbGVcIjtcbiAgICAgICAgICAgIHJldHVybiBhbnN3ZXI7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgZnVuY3Rpb24gdG9Qcm9maWxlTmFtZShwYXRoOnN0cmluZykge1xuICAgICAgICAgICAgdmFyIGFuc3dlciA9IHBhdGgucmVwbGFjZSgvXmZhYnJpY1xcL3Byb2ZpbGVzXFwvLywgXCJcIik7XG4gICAgICAgICAgICBhbnN3ZXIgPSBhbnN3ZXIucmVwbGFjZSgvXFwvL2csIFwiLVwiKTtcbiAgICAgICAgICAgIGFuc3dlciA9IGFuc3dlci5yZXBsYWNlKC9cXC5wcm9maWxlJC8sIFwiXCIpO1xuICAgICAgICAgICAgcmV0dXJuIGFuc3dlcjtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyBzdHJpcCBvZmYgYW55IHByb2ZpbGUgbmFtZSBpbiBjYXNlIHRoZSB1c2VyIGNyZWF0ZXMgYSBwcm9maWxlIHdoaWxlIGxvb2tpbmcgYXRcbiAgICAgICAgICAvLyBhbm90aGVyIHByb2ZpbGVcbiAgICAgICAgICBmb2xkZXIgPSBmb2xkZXIucmVwbGFjZSgvXFwvPT8oXFx3KilcXC5wcm9maWxlJC8sIFwiXCIpO1xuXG4gICAgICAgICAgdmFyIGNvbmNhdGVuYXRlZCA9IGZvbGRlciArIFwiL1wiICsgbmFtZTtcblxuICAgICAgICAgIHZhciBwcm9maWxlTmFtZSA9IHRvUHJvZmlsZU5hbWUoY29uY2F0ZW5hdGVkKTtcbiAgICAgICAgICB2YXIgdGFyZ2V0UGF0aCA9IHRvUGF0aChwcm9maWxlTmFtZSk7XG5cbiAgICAgICAgfSBlbHNlIGlmICh0ZW1wbGF0ZS5nZW5lcmF0ZWQpIHtcbiAgICAgICAgICB2YXIgb3B0aW9uczpXaWtpLkdlbmVyYXRlT3B0aW9ucyA9IHtcbiAgICAgICAgICAgIHdvcmtzcGFjZTogd29ya3NwYWNlLFxuICAgICAgICAgICAgZm9ybTogJHNjb3BlLmZvcm1EYXRhLFxuICAgICAgICAgICAgbmFtZTogZmlsZU5hbWUsXG4gICAgICAgICAgICBwYXJlbnRJZDogZm9sZGVyLFxuICAgICAgICAgICAgYnJhbmNoOiAkc2NvcGUuYnJhbmNoLFxuICAgICAgICAgICAgc3VjY2VzczogKGNvbnRlbnRzKT0+IHtcbiAgICAgICAgICAgICAgaWYgKGNvbnRlbnRzKSB7XG4gICAgICAgICAgICAgICAgd2lraVJlcG9zaXRvcnkucHV0UGFnZSgkc2NvcGUuYnJhbmNoLCBwYXRoLCBjb250ZW50cywgY29tbWl0TWVzc2FnZSwgKHN0YXR1cykgPT4ge1xuICAgICAgICAgICAgICAgICAgbG9nLmRlYnVnKFwiQ3JlYXRlZCBmaWxlIFwiICsgbmFtZSk7XG4gICAgICAgICAgICAgICAgICBXaWtpLm9uQ29tcGxldGUoc3RhdHVzKTtcbiAgICAgICAgICAgICAgICAgIHJldHVyblRvRGlyZWN0b3J5KCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuVG9EaXJlY3RvcnkoKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGVycm9yOiAoZXJyb3IpPT4ge1xuICAgICAgICAgICAgICBDb3JlLm5vdGlmaWNhdGlvbignZXJyb3InLCBlcnJvcik7XG4gICAgICAgICAgICAgIENvcmUuJGFwcGx5KCRzY29wZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfTtcbiAgICAgICAgICB0ZW1wbGF0ZS5nZW5lcmF0ZWQuZ2VuZXJhdGUob3B0aW9ucyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gbG9hZCB0aGUgZXhhbXBsZSBkYXRhIChpZiBhbnkpIGFuZCB0aGVuIGFkZCB0aGUgZG9jdW1lbnQgdG8gZ2l0IGFuZCBjaGFuZ2UgdGhlIGxpbmsgdG8gdGhlIG5ldyBkb2N1bWVudFxuICAgICAgICAgICRodHRwLmdldChleGVtcGxhclVyaSlcbiAgICAgICAgICAgIC5zdWNjZXNzKGZ1bmN0aW9uIChkYXRhLCBzdGF0dXMsIGhlYWRlcnMsIGNvbmZpZykge1xuICAgICAgICAgICAgICBwdXRQYWdlKHBhdGgsIG5hbWUsIGZvbGRlciwgZGF0YSwgY29tbWl0TWVzc2FnZSk7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLmVycm9yKGZ1bmN0aW9uIChkYXRhLCBzdGF0dXMsIGhlYWRlcnMsIGNvbmZpZykge1xuICAgICAgICAgICAgICAvLyBjcmVhdGUgYW4gZW1wdHkgZmlsZVxuICAgICAgICAgICAgICBwdXRQYWdlKHBhdGgsIG5hbWUsIGZvbGRlciwgXCJcIiwgY29tbWl0TWVzc2FnZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH07XG5cbiAgICBmdW5jdGlvbiBwdXRQYWdlKHBhdGgsIG5hbWUsIGZvbGRlciwgY29udGVudHMsIGNvbW1pdE1lc3NhZ2UpIHtcbiAgICAgIC8vIFRPRE8gbGV0cyBjaGVjayB0aGlzIHBhZ2UgZG9lcyBub3QgZXhpc3QgLSBpZiBpdCBkb2VzIGxldHMga2VlcCBhZGRpbmcgYSBuZXcgcG9zdCBmaXguLi5cbiAgICAgIHdpa2lSZXBvc2l0b3J5LnB1dFBhZ2UoJHNjb3BlLmJyYW5jaCwgcGF0aCwgY29udGVudHMsIGNvbW1pdE1lc3NhZ2UsIChzdGF0dXMpID0+IHtcbiAgICAgICAgbG9nLmRlYnVnKFwiQ3JlYXRlZCBmaWxlIFwiICsgbmFtZSk7XG4gICAgICAgIFdpa2kub25Db21wbGV0ZShzdGF0dXMpO1xuXG4gICAgICAgIC8vIGxldHMgbmF2aWdhdGUgdG8gdGhlIGVkaXQgbGlua1xuICAgICAgICAvLyBsb2FkIHRoZSBkaXJlY3RvcnkgYW5kIGZpbmQgdGhlIGNoaWxkIGl0ZW1cbiAgICAgICAgJHNjb3BlLmdpdCA9IHdpa2lSZXBvc2l0b3J5LmdldFBhZ2UoJHNjb3BlLmJyYW5jaCwgZm9sZGVyLCAkc2NvcGUub2JqZWN0SWQsIChkZXRhaWxzKSA9PiB7XG4gICAgICAgICAgLy8gbGV0cyBmaW5kIHRoZSBjaGlsZCBlbnRyeSBzbyB3ZSBjYW4gY2FsY3VsYXRlIGl0cyBjb3JyZWN0IGVkaXQgbGlua1xuICAgICAgICAgIHZhciBsaW5rOnN0cmluZyA9IG51bGw7XG4gICAgICAgICAgaWYgKGRldGFpbHMgJiYgZGV0YWlscy5jaGlsZHJlbikge1xuICAgICAgICAgICAgbG9nLmRlYnVnKFwic2Nhbm5lZCB0aGUgZGlyZWN0b3J5IFwiICsgZGV0YWlscy5jaGlsZHJlbi5sZW5ndGggKyBcIiBjaGlsZHJlblwiKTtcbiAgICAgICAgICAgIHZhciBjaGlsZCA9IGRldGFpbHMuY2hpbGRyZW4uZmluZChjID0+IGMubmFtZSA9PT0gZmlsZU5hbWUpO1xuICAgICAgICAgICAgaWYgKGNoaWxkKSB7XG4gICAgICAgICAgICAgIGxpbmsgPSAkc2NvcGUuY2hpbGRMaW5rKGNoaWxkKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGxvZy5kZWJ1ZyhcIkNvdWxkIG5vdCBmaW5kIG5hbWUgJ1wiICsgZmlsZU5hbWUgKyBcIicgaW4gdGhlIGxpc3Qgb2YgZmlsZSBuYW1lcyBcIiArIEpTT04uc3RyaW5naWZ5KGRldGFpbHMuY2hpbGRyZW4ubWFwKGMgPT4gYy5uYW1lKSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoIWxpbmspIHtcbiAgICAgICAgICAgIGxvZy5kZWJ1ZyhcIldBUk5JTkc6IGNvdWxkIG5vdCBmaW5kIHRoZSBjaGlsZExpbmsgc28gcmV2ZXJ0aW5nIHRvIHRoZSB3aWtpIGVkaXQgcGFnZSFcIik7XG4gICAgICAgICAgICBsaW5rID0gV2lraS5lZGl0TGluaygkc2NvcGUsIHBhdGgsICRsb2NhdGlvbik7XG4gICAgICAgICAgfVxuICAgICAgICAgIC8vQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICAgICAgICBnb1RvTGluayhsaW5rLCAkdGltZW91dCwgJGxvY2F0aW9uKTtcbiAgICAgICAgfSk7XG4gICAgICB9KVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldE5ld0RvY3VtZW50UGF0aCgpIHtcbiAgICAgIHZhciB0ZW1wbGF0ZSA9ICRzY29wZS5zZWxlY3RlZENyZWF0ZURvY3VtZW50VGVtcGxhdGU7XG4gICAgICBpZiAoIXRlbXBsYXRlKSB7XG4gICAgICAgIGxvZy5kZWJ1ZyhcIk5vIHRlbXBsYXRlIHNlbGVjdGVkLlwiKTtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG4gICAgICB2YXIgZXhlbXBsYXIgPSB0ZW1wbGF0ZS5leGVtcGxhciB8fCBcIlwiO1xuICAgICAgdmFyIG5hbWU6c3RyaW5nID0gJHNjb3BlLm5ld0RvY3VtZW50TmFtZSB8fCBleGVtcGxhcjtcblxuICAgICAgaWYgKG5hbWUuaW5kZXhPZignLicpIDwgMCkge1xuICAgICAgICAvLyBsZXRzIGFkZCB0aGUgZmlsZSBleHRlbnNpb24gZnJvbSB0aGUgZXhlbXBsYXJcbiAgICAgICAgdmFyIGlkeCA9IGV4ZW1wbGFyLmxhc3RJbmRleE9mKFwiLlwiKTtcbiAgICAgICAgaWYgKGlkeCA+IDApIHtcbiAgICAgICAgICBuYW1lICs9IGV4ZW1wbGFyLnN1YnN0cmluZyhpZHgpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vIGxldHMgZGVhbCB3aXRoIGRpcmVjdG9yaWVzIGluIHRoZSBuYW1lXG4gICAgICB2YXIgZm9sZGVyOnN0cmluZyA9ICRzY29wZS5wYWdlSWQ7XG4gICAgICBpZiAoJHNjb3BlLmlzRmlsZSkge1xuICAgICAgICAvLyBpZiB3ZSBhcmUgYSBmaWxlIGxldHMgZGlzY2FyZCB0aGUgbGFzdCBwYXJ0IG9mIHRoZSBwYXRoXG4gICAgICAgIHZhciBpZHg6YW55ID0gZm9sZGVyLmxhc3RJbmRleE9mKFwiL1wiKTtcbiAgICAgICAgaWYgKGlkeCA8PSAwKSB7XG4gICAgICAgICAgZm9sZGVyID0gXCJcIjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBmb2xkZXIgPSBmb2xkZXIuc3Vic3RyaW5nKDAsIGlkeCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHZhciBpZHg6YW55ID0gbmFtZS5sYXN0SW5kZXhPZihcIi9cIik7XG4gICAgICBpZiAoaWR4ID4gMCkge1xuICAgICAgICBmb2xkZXIgKz0gXCIvXCIgKyBuYW1lLnN1YnN0cmluZygwLCBpZHgpO1xuICAgICAgICBuYW1lID0gbmFtZS5zdWJzdHJpbmcoaWR4ICsgMSk7XG4gICAgICB9XG4gICAgICBmb2xkZXIgPSBDb3JlLnRyaW1MZWFkaW5nKGZvbGRlciwgXCIvXCIpO1xuICAgICAgcmV0dXJuIGZvbGRlciArIChmb2xkZXIgPyBcIi9cIiA6IFwiXCIpICsgbmFtZTtcbiAgICB9XG5cbiAgfV0pO1xuXG59XG4iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vaW5jbHVkZXMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwid2lraUhlbHBlcnMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwid2lraVBsdWdpbi50c1wiLz5cblxuLyoqXG4gKiBAbW9kdWxlIFdpa2lcbiAqL1xubW9kdWxlIFdpa2kge1xuICBfbW9kdWxlLmNvbnRyb2xsZXIoXCJXaWtpLkVkaXRDb250cm9sbGVyXCIsIFtcIiRzY29wZVwiLCBcIiRsb2NhdGlvblwiLCBcIiRyb3V0ZVBhcmFtc1wiLCBcImZpbGVFeHRlbnNpb25UeXBlUmVnaXN0cnlcIiwgKCRzY29wZSwgJGxvY2F0aW9uLCAkcm91dGVQYXJhbXMsIGZpbGVFeHRlbnNpb25UeXBlUmVnaXN0cnkpID0+IHtcblxuICAgIFdpa2kuaW5pdFNjb3BlKCRzY29wZSwgJHJvdXRlUGFyYW1zLCAkbG9jYXRpb24pO1xuICAgICRzY29wZS5icmVhZGNydW1iQ29uZmlnLnB1c2goY3JlYXRlRWRpdGluZ0JyZWFkY3J1bWIoJHNjb3BlKSk7XG5cbiAgICB2YXIgd2lraVJlcG9zaXRvcnkgPSAkc2NvcGUud2lraVJlcG9zaXRvcnk7XG5cbiAgICAkc2NvcGUuZW50aXR5ID0ge1xuICAgICAgc291cmNlOiBudWxsXG4gICAgfTtcblxuICAgIHZhciBmb3JtYXQgPSBXaWtpLmZpbGVGb3JtYXQoJHNjb3BlLnBhZ2VJZCwgZmlsZUV4dGVuc2lvblR5cGVSZWdpc3RyeSk7XG4gICAgdmFyIGZvcm0gPSBudWxsO1xuICAgIGlmICgoZm9ybWF0ICYmIGZvcm1hdCA9PT0gXCJqYXZhc2NyaXB0XCIpIHx8IGlzQ3JlYXRlKCkpIHtcbiAgICAgIGZvcm0gPSAkbG9jYXRpb24uc2VhcmNoKClbXCJmb3JtXCJdO1xuICAgIH1cblxuICAgIHZhciBvcHRpb25zID0ge1xuICAgICAgbW9kZToge1xuICAgICAgICBuYW1lOiBmb3JtYXRcbiAgICAgIH1cbiAgICB9O1xuICAgICRzY29wZS5jb2RlTWlycm9yT3B0aW9ucyA9IENvZGVFZGl0b3IuY3JlYXRlRWRpdG9yU2V0dGluZ3Mob3B0aW9ucyk7XG4gICAgJHNjb3BlLm1vZGlmaWVkID0gZmFsc2U7XG5cblxuICAgICRzY29wZS5pc1ZhbGlkID0gKCkgPT4gJHNjb3BlLmZpbGVOYW1lO1xuXG4gICAgJHNjb3BlLmNhblNhdmUgPSAoKSA9PiAhJHNjb3BlLm1vZGlmaWVkO1xuXG4gICAgJHNjb3BlLiR3YXRjaCgnZW50aXR5LnNvdXJjZScsIChuZXdWYWx1ZSwgb2xkVmFsdWUpID0+IHtcbiAgICAgICRzY29wZS5tb2RpZmllZCA9IG5ld1ZhbHVlICYmIG9sZFZhbHVlICYmIG5ld1ZhbHVlICE9PSBvbGRWYWx1ZTtcbiAgICB9LCB0cnVlKTtcblxuICAgIGxvZy5kZWJ1ZyhcInBhdGg6IFwiLCAkc2NvcGUucGF0aCk7XG5cbiAgICAkc2NvcGUuJHdhdGNoKCdtb2RpZmllZCcsIChuZXdWYWx1ZSwgb2xkVmFsdWUpID0+IHtcbiAgICAgIGxvZy5kZWJ1ZyhcIm1vZGlmaWVkOiBcIiwgbmV3VmFsdWUpO1xuICAgIH0pO1xuXG4gICAgJHNjb3BlLnZpZXdMaW5rID0gKCkgPT4gV2lraS52aWV3TGluaygkc2NvcGUsICRzY29wZS5wYWdlSWQsICRsb2NhdGlvbiwgJHNjb3BlLmZpbGVOYW1lKTtcblxuICAgICRzY29wZS5jYW5jZWwgPSAoKSA9PiB7XG4gICAgICBnb1RvVmlldygpO1xuICAgIH07XG5cbiAgICAkc2NvcGUuc2F2ZSA9ICgpID0+IHtcbiAgICAgIGlmICgkc2NvcGUubW9kaWZpZWQgJiYgJHNjb3BlLmZpbGVOYW1lKSB7XG4gICAgICAgIHNhdmVUbygkc2NvcGVbXCJwYWdlSWRcIl0pO1xuICAgICAgfVxuICAgIH07XG5cbiAgICAkc2NvcGUuY3JlYXRlID0gKCkgPT4ge1xuICAgICAgLy8gbGV0cyBjb21iaW5lIHRoZSBmaWxlIG5hbWUgd2l0aCB0aGUgY3VycmVudCBwYWdlSWQgKHdoaWNoIGlzIHRoZSBkaXJlY3RvcnkpXG4gICAgICB2YXIgcGF0aCA9ICRzY29wZS5wYWdlSWQgKyBcIi9cIiArICRzY29wZS5maWxlTmFtZTtcbiAgICAgIGNvbnNvbGUubG9nKFwiY3JlYXRpbmcgbmV3IGZpbGUgYXQgXCIgKyBwYXRoKTtcbiAgICAgIHNhdmVUbyhwYXRoKTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLm9uU3VibWl0ID0gKGpzb24sIGZvcm0pID0+IHtcbiAgICAgIGlmIChpc0NyZWF0ZSgpKSB7XG4gICAgICAgICRzY29wZS5jcmVhdGUoKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgICRzY29wZS5zYXZlKCk7XG4gICAgICB9XG4gICAgfTtcblxuICAgICRzY29wZS5vbkNhbmNlbCA9IChmb3JtKSA9PiB7XG4gICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgZ29Ub1ZpZXcoKTtcbiAgICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKVxuICAgICAgfSwgNTApO1xuICAgIH07XG5cblxuICAgIHVwZGF0ZVZpZXcoKTtcblxuICAgIGZ1bmN0aW9uIGlzQ3JlYXRlKCkge1xuICAgICAgcmV0dXJuICRsb2NhdGlvbi5wYXRoKCkuc3RhcnRzV2l0aChcIi93aWtpL2NyZWF0ZVwiKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiB1cGRhdGVWaWV3KCkge1xuICAgICAgLy8gb25seSBsb2FkIHRoZSBzb3VyY2UgaWYgbm90IGluIGNyZWF0ZSBtb2RlXG4gICAgICBpZiAoaXNDcmVhdGUoKSkge1xuICAgICAgICB1cGRhdGVTb3VyY2VWaWV3KCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBsb2cuZGVidWcoXCJHZXR0aW5nIHBhZ2UsIGJyYW5jaDogXCIsICRzY29wZS5icmFuY2gsIFwiIHBhZ2VJZDogXCIsICRzY29wZS5wYWdlSWQsIFwiIG9iamVjdElkOiBcIiwgJHNjb3BlLm9iamVjdElkKTtcbiAgICAgICAgd2lraVJlcG9zaXRvcnkuZ2V0UGFnZSgkc2NvcGUuYnJhbmNoLCAkc2NvcGUucGFnZUlkLCAkc2NvcGUub2JqZWN0SWQsIG9uRmlsZUNvbnRlbnRzKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBvbkZpbGVDb250ZW50cyhkZXRhaWxzKSB7XG4gICAgICB2YXIgY29udGVudHMgPSBkZXRhaWxzLnRleHQ7XG4gICAgICAkc2NvcGUuZW50aXR5LnNvdXJjZSA9IGNvbnRlbnRzO1xuICAgICAgJHNjb3BlLmZpbGVOYW1lID0gJHNjb3BlLnBhZ2VJZC5zcGxpdCgnLycpLmxhc3QoKTtcbiAgICAgIGxvZy5kZWJ1ZyhcImZpbGUgbmFtZTogXCIsICRzY29wZS5maWxlTmFtZSk7XG4gICAgICBsb2cuZGVidWcoXCJmaWxlIGRldGFpbHM6IFwiLCBkZXRhaWxzKTtcbiAgICAgIHVwZGF0ZVNvdXJjZVZpZXcoKTtcbiAgICAgIENvcmUuJGFwcGx5KCRzY29wZSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gdXBkYXRlU291cmNlVmlldygpIHtcbiAgICAgIGlmIChmb3JtKSB7XG4gICAgICAgIGlmIChpc0NyZWF0ZSgpKSB7XG4gICAgICAgICAgLy8gbGV0cyBkZWZhdWx0IGEgZmlsZSBuYW1lXG4gICAgICAgICAgaWYgKCEkc2NvcGUuZmlsZU5hbWUpIHtcbiAgICAgICAgICAgICRzY29wZS5maWxlTmFtZSA9IFwiXCIgKyBDb3JlLmdldFVVSUQoKSArIFwiLmpzb25cIjtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgLy8gbm93IGxldHMgdHJ5IGxvYWQgdGhlIGZvcm0gZGVmaW50aW9uIEpTT04gc28gd2UgY2FuIHRoZW4gcmVuZGVyIHRoZSBmb3JtXG4gICAgICAgICRzY29wZS5zb3VyY2VWaWV3ID0gbnVsbDtcbiAgICAgICAgJHNjb3BlLmdpdCA9IHdpa2lSZXBvc2l0b3J5LmdldFBhZ2UoJHNjb3BlLmJyYW5jaCwgZm9ybSwgJHNjb3BlLm9iamVjdElkLCAoZGV0YWlscykgPT4ge1xuICAgICAgICAgIG9uRm9ybVNjaGVtYShXaWtpLnBhcnNlSnNvbihkZXRhaWxzLnRleHQpKTtcbiAgICAgICAgfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAkc2NvcGUuc291cmNlVmlldyA9IFwicGx1Z2lucy93aWtpL2h0bWwvc291cmNlRWRpdC5odG1sXCI7XG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gb25Gb3JtU2NoZW1hKGpzb24pIHtcbiAgICAgICRzY29wZS5mb3JtRGVmaW5pdGlvbiA9IGpzb247XG4gICAgICBpZiAoJHNjb3BlLmVudGl0eS5zb3VyY2UpIHtcbiAgICAgICAgJHNjb3BlLmZvcm1FbnRpdHkgPSBXaWtpLnBhcnNlSnNvbigkc2NvcGUuZW50aXR5LnNvdXJjZSk7XG4gICAgICB9XG4gICAgICAkc2NvcGUuc291cmNlVmlldyA9IFwicGx1Z2lucy93aWtpL2h0bWwvZm9ybUVkaXQuaHRtbFwiO1xuICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnb1RvVmlldygpIHtcbiAgICAgIHZhciBwYXRoID0gQ29yZS50cmltTGVhZGluZygkc2NvcGUudmlld0xpbmsoKSwgXCIjXCIpO1xuICAgICAgbG9nLmRlYnVnKFwiZ29pbmcgdG8gdmlldyBcIiArIHBhdGgpO1xuICAgICAgJGxvY2F0aW9uLnBhdGgoV2lraS5kZWNvZGVQYXRoKHBhdGgpKTtcbiAgICAgIGxvZy5kZWJ1ZyhcImxvY2F0aW9uIGlzIG5vdyBcIiArICRsb2NhdGlvbi5wYXRoKCkpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNhdmVUbyhwYXRoOnN0cmluZykge1xuICAgICAgdmFyIGNvbW1pdE1lc3NhZ2UgPSAkc2NvcGUuY29tbWl0TWVzc2FnZSB8fCBcIlVwZGF0ZWQgcGFnZSBcIiArICRzY29wZS5wYWdlSWQ7XG4gICAgICB2YXIgY29udGVudHMgPSAkc2NvcGUuZW50aXR5LnNvdXJjZTtcbiAgICAgIGlmICgkc2NvcGUuZm9ybUVudGl0eSkge1xuICAgICAgICBjb250ZW50cyA9IEpTT04uc3RyaW5naWZ5KCRzY29wZS5mb3JtRW50aXR5LCBudWxsLCBcIiAgXCIpO1xuICAgICAgfVxuICAgICAgbG9nLmRlYnVnKFwiU2F2aW5nIGZpbGUsIGJyYW5jaDogXCIsICRzY29wZS5icmFuY2gsIFwiIHBhdGg6IFwiLCAkc2NvcGUucGF0aCk7XG4gICAgICAvL2NvbnNvbGUubG9nKFwiQWJvdXQgdG8gd3JpdGUgY29udGVudHMgJ1wiICsgY29udGVudHMgKyBcIidcIik7XG4gICAgICB3aWtpUmVwb3NpdG9yeS5wdXRQYWdlKCRzY29wZS5icmFuY2gsIHBhdGgsIGNvbnRlbnRzLCBjb21taXRNZXNzYWdlLCAoc3RhdHVzKSA9PiB7XG4gICAgICAgIFdpa2kub25Db21wbGV0ZShzdGF0dXMpO1xuICAgICAgICAkc2NvcGUubW9kaWZpZWQgPSBmYWxzZTtcbiAgICAgICAgQ29yZS5ub3RpZmljYXRpb24oXCJzdWNjZXNzXCIsIFwiU2F2ZWQgXCIgKyBwYXRoKTtcbiAgICAgICAgZ29Ub1ZpZXcoKTtcbiAgICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfV0pO1xufVxuIiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL2luY2x1ZGVzLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIndpa2lIZWxwZXJzLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIndpa2lQbHVnaW4udHNcIi8+XG5cbi8qKlxuICogQG1vZHVsZSBXaWtpXG4gKi9cbm1vZHVsZSBXaWtpIHtcblxuICAvLyBjb250cm9sbGVyIGZvciBoYW5kbGluZyBmaWxlIGRyb3BzXG4gIGV4cG9ydCB2YXIgRmlsZURyb3BDb250cm9sbGVyID0gX21vZHVsZS5jb250cm9sbGVyKFwiV2lraS5GaWxlRHJvcENvbnRyb2xsZXJcIiwgW1wiJHNjb3BlXCIsIFwiRmlsZVVwbG9hZGVyXCIsIFwiJHJvdXRlXCIsIFwiJHRpbWVvdXRcIiwgXCJ1c2VyRGV0YWlsc1wiLCAoJHNjb3BlLCBGaWxlVXBsb2FkZXIsICRyb3V0ZTpuZy5yb3V0ZS5JUm91dGVTZXJ2aWNlLCAkdGltZW91dDpuZy5JVGltZW91dFNlcnZpY2UsIHVzZXJEZXRhaWxzOkNvcmUuVXNlckRldGFpbHMpID0+IHtcblxuXG4gICAgdmFyIHVwbG9hZFVSSSA9IFdpa2kuZ2l0UmVzdFVSTCgkc2NvcGUsICRzY29wZS5wYWdlSWQpICsgJy8nO1xuICAgIHZhciB1cGxvYWRlciA9ICRzY29wZS51cGxvYWRlciA9IG5ldyBGaWxlVXBsb2FkZXIoe1xuICAgICAgaGVhZGVyczoge1xuICAgICAgICAnQXV0aG9yaXphdGlvbic6IENvcmUuYXV0aEhlYWRlclZhbHVlKHVzZXJEZXRhaWxzKVxuICAgICAgfSxcbiAgICAgIGF1dG9VcGxvYWQ6IHRydWUsXG4gICAgICB3aXRoQ3JlZGVudGlhbHM6IHRydWUsXG4gICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgIHVybDogdXBsb2FkVVJJXG4gICAgfSk7XG4gICAgJHNjb3BlLmRvVXBsb2FkID0gKCkgPT4ge1xuICAgICAgdXBsb2FkZXIudXBsb2FkQWxsKCk7XG4gICAgfTtcbiAgICB1cGxvYWRlci5vbldoZW5BZGRpbmdGaWxlRmFpbGVkID0gZnVuY3Rpb24gKGl0ZW0gLyp7RmlsZXxGaWxlTGlrZU9iamVjdH0qLywgZmlsdGVyLCBvcHRpb25zKSB7XG4gICAgICBsb2cuZGVidWcoJ29uV2hlbkFkZGluZ0ZpbGVGYWlsZWQnLCBpdGVtLCBmaWx0ZXIsIG9wdGlvbnMpO1xuICAgIH07XG4gICAgdXBsb2FkZXIub25BZnRlckFkZGluZ0ZpbGUgPSBmdW5jdGlvbiAoZmlsZUl0ZW0pIHtcbiAgICAgIGxvZy5kZWJ1Zygnb25BZnRlckFkZGluZ0ZpbGUnLCBmaWxlSXRlbSk7XG4gICAgfTtcbiAgICB1cGxvYWRlci5vbkFmdGVyQWRkaW5nQWxsID0gZnVuY3Rpb24gKGFkZGVkRmlsZUl0ZW1zKSB7XG4gICAgICBsb2cuZGVidWcoJ29uQWZ0ZXJBZGRpbmdBbGwnLCBhZGRlZEZpbGVJdGVtcyk7XG4gICAgfTtcbiAgICB1cGxvYWRlci5vbkJlZm9yZVVwbG9hZEl0ZW0gPSBmdW5jdGlvbiAoaXRlbSkge1xuICAgICAgaWYgKCdmaWxlJyBpbiBpdGVtKSB7XG4gICAgICAgIGl0ZW0uZmlsZVNpemVNQiA9IChpdGVtLmZpbGUuc2l6ZSAvIDEwMjQgLyAxMDI0KS50b0ZpeGVkKDIpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaXRlbS5maWxlU2l6ZU1CID0gMDtcbiAgICAgIH1cbiAgICAgIC8vaXRlbS51cmwgPSBVcmxIZWxwZXJzLmpvaW4odXBsb2FkVVJJLCBpdGVtLmZpbGUubmFtZSk7XG4gICAgICBpdGVtLnVybCA9IHVwbG9hZFVSSTtcbiAgICAgIGxvZy5pbmZvKFwiTG9hZGluZyBmaWxlcyB0byBcIiArIHVwbG9hZFVSSSk7XG4gICAgICBsb2cuZGVidWcoJ29uQmVmb3JlVXBsb2FkSXRlbScsIGl0ZW0pO1xuICAgIH07XG4gICAgdXBsb2FkZXIub25Qcm9ncmVzc0l0ZW0gPSBmdW5jdGlvbiAoZmlsZUl0ZW0sIHByb2dyZXNzKSB7XG4gICAgICBsb2cuZGVidWcoJ29uUHJvZ3Jlc3NJdGVtJywgZmlsZUl0ZW0sIHByb2dyZXNzKTtcbiAgICB9O1xuICAgIHVwbG9hZGVyLm9uUHJvZ3Jlc3NBbGwgPSBmdW5jdGlvbiAocHJvZ3Jlc3MpIHtcbiAgICAgIGxvZy5kZWJ1Zygnb25Qcm9ncmVzc0FsbCcsIHByb2dyZXNzKTtcbiAgICB9O1xuICAgIHVwbG9hZGVyLm9uU3VjY2Vzc0l0ZW0gPSBmdW5jdGlvbiAoZmlsZUl0ZW0sIHJlc3BvbnNlLCBzdGF0dXMsIGhlYWRlcnMpIHtcbiAgICAgIGxvZy5kZWJ1Zygnb25TdWNjZXNzSXRlbScsIGZpbGVJdGVtLCByZXNwb25zZSwgc3RhdHVzLCBoZWFkZXJzKTtcbiAgICB9O1xuICAgIHVwbG9hZGVyLm9uRXJyb3JJdGVtID0gZnVuY3Rpb24gKGZpbGVJdGVtLCByZXNwb25zZSwgc3RhdHVzLCBoZWFkZXJzKSB7XG4gICAgICBsb2cuZGVidWcoJ29uRXJyb3JJdGVtJywgZmlsZUl0ZW0sIHJlc3BvbnNlLCBzdGF0dXMsIGhlYWRlcnMpO1xuICAgIH07XG4gICAgdXBsb2FkZXIub25DYW5jZWxJdGVtID0gZnVuY3Rpb24gKGZpbGVJdGVtLCByZXNwb25zZSwgc3RhdHVzLCBoZWFkZXJzKSB7XG4gICAgICBsb2cuZGVidWcoJ29uQ2FuY2VsSXRlbScsIGZpbGVJdGVtLCByZXNwb25zZSwgc3RhdHVzLCBoZWFkZXJzKTtcbiAgICB9O1xuICAgIHVwbG9hZGVyLm9uQ29tcGxldGVJdGVtID0gZnVuY3Rpb24gKGZpbGVJdGVtLCByZXNwb25zZSwgc3RhdHVzLCBoZWFkZXJzKSB7XG4gICAgICBsb2cuZGVidWcoJ29uQ29tcGxldGVJdGVtJywgZmlsZUl0ZW0sIHJlc3BvbnNlLCBzdGF0dXMsIGhlYWRlcnMpO1xuICAgIH07XG4gICAgdXBsb2FkZXIub25Db21wbGV0ZUFsbCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgIGxvZy5kZWJ1Zygnb25Db21wbGV0ZUFsbCcpO1xuICAgICAgdXBsb2FkZXIuY2xlYXJRdWV1ZSgpO1xuICAgICAgJHRpbWVvdXQoKCkgPT4ge1xuICAgICAgICBsb2cuaW5mbyhcIkNvbXBsZXRlZCBhbGwgdXBsb2Fkcy4gTGV0cyBmb3JjZSBhIHJlbG9hZFwiKTtcbiAgICAgICAgJHJvdXRlLnJlbG9hZCgpO1xuICAgICAgICBDb3JlLiRhcHBseSgkc2NvcGUpO1xuICAgICAgfSwgMjAwKTtcbiAgICB9O1xuICB9XSk7XG5cbn1cbiIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9pbmNsdWRlcy50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJ3aWtpSGVscGVycy50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJ3aWtpUGx1Z2luLnRzXCIvPlxuXG4vKipcbiAqIEBtb2R1bGUgV2lraVxuICovXG5tb2R1bGUgV2lraSB7XG5cbiAgX21vZHVsZS5jb250cm9sbGVyKFwiV2lraS5Gb3JtVGFibGVDb250cm9sbGVyXCIsIFtcIiRzY29wZVwiLCBcIiRsb2NhdGlvblwiLCBcIiRyb3V0ZVBhcmFtc1wiLCAoJHNjb3BlLCAkbG9jYXRpb24sICRyb3V0ZVBhcmFtcykgPT4ge1xuICAgIFdpa2kuaW5pdFNjb3BlKCRzY29wZSwgJHJvdXRlUGFyYW1zLCAkbG9jYXRpb24pO1xuICAgIHZhciB3aWtpUmVwb3NpdG9yeSA9ICRzY29wZS53aWtpUmVwb3NpdG9yeTtcblxuICAgICRzY29wZS5jb2x1bW5EZWZzID0gW107XG5cbiAgICAkc2NvcGUuZ3JpZE9wdGlvbnMgPSB7XG4gICAgICAgZGF0YTogJ2xpc3QnLFxuICAgICAgIGRpc3BsYXlGb290ZXI6IGZhbHNlLFxuICAgICAgIHNob3dGaWx0ZXI6IGZhbHNlLFxuICAgICAgIGZpbHRlck9wdGlvbnM6IHtcbiAgICAgICAgIGZpbHRlclRleHQ6ICcnXG4gICAgICAgfSxcbiAgICAgICBjb2x1bW5EZWZzOiAkc2NvcGUuY29sdW1uRGVmc1xuICAgICB9O1xuXG5cbiAgICAkc2NvcGUudmlld0xpbmsgPSAocm93KSA9PiB7XG4gICAgICByZXR1cm4gY2hpbGRMaW5rKHJvdywgXCIvdmlld1wiKTtcbiAgICB9O1xuICAgICRzY29wZS5lZGl0TGluayA9IChyb3cpID0+IHtcbiAgICAgIHJldHVybiBjaGlsZExpbmsocm93LCBcIi9lZGl0XCIpO1xuICAgIH07XG5cbiAgICBmdW5jdGlvbiBjaGlsZExpbmsoY2hpbGQsIHByZWZpeCkge1xuICAgICAgdmFyIHN0YXJ0ID0gV2lraS5zdGFydExpbmsoJHNjb3BlKTtcbiAgICAgIHZhciBjaGlsZElkID0gKGNoaWxkKSA/IGNoaWxkW1wiX2lkXCJdIHx8IFwiXCIgOiBcIlwiO1xuICAgICAgcmV0dXJuIENvcmUuY3JlYXRlSHJlZigkbG9jYXRpb24sIHN0YXJ0ICsgcHJlZml4ICsgXCIvXCIgKyAkc2NvcGUucGFnZUlkICsgXCIvXCIgKyBjaGlsZElkKTtcbiAgICB9XG5cbiAgICB2YXIgbGlua3NDb2x1bW4gPSB7XG4gICAgICBmaWVsZDogJ19pZCcsXG4gICAgICBkaXNwbGF5TmFtZTogJ0FjdGlvbnMnLFxuICAgICAgY2VsbFRlbXBsYXRlOiAnPGRpdiBjbGFzcz1cIm5nQ2VsbFRleHRcIlwiPjxhIG5nLWhyZWY9XCJ7e3ZpZXdMaW5rKHJvdy5lbnRpdHkpfX1cIiBjbGFzcz1cImJ0blwiPlZpZXc8L2E+IDxhIG5nLWhyZWY9XCJ7e2VkaXRMaW5rKHJvdy5lbnRpdHkpfX1cIiBjbGFzcz1cImJ0blwiPkVkaXQ8L2E+PC9kaXY+J1xuICAgIH07XG5cbiAgICAkc2NvcGUuJG9uKFwiJHJvdXRlQ2hhbmdlU3VjY2Vzc1wiLCBmdW5jdGlvbiAoZXZlbnQsIGN1cnJlbnQsIHByZXZpb3VzKSB7XG4gICAgICAvLyBsZXRzIGRvIHRoaXMgYXN5bmNocm9ub3VzbHkgdG8gYXZvaWQgRXJyb3I6ICRkaWdlc3QgYWxyZWFkeSBpbiBwcm9ncmVzc1xuICAgICAgc2V0VGltZW91dCh1cGRhdGVWaWV3LCA1MCk7XG4gICAgfSk7XG5cbiAgICB2YXIgZm9ybSA9ICRsb2NhdGlvbi5zZWFyY2goKVtcImZvcm1cIl07XG4gICAgaWYgKGZvcm0pIHtcbiAgICAgIHdpa2lSZXBvc2l0b3J5LmdldFBhZ2UoJHNjb3BlLmJyYW5jaCwgZm9ybSwgJHNjb3BlLm9iamVjdElkLCBvbkZvcm1EYXRhKTtcbiAgICB9XG5cbiAgICB1cGRhdGVWaWV3KCk7XG5cbiAgICBmdW5jdGlvbiBvblJlc3VsdHMocmVzcG9uc2UpIHtcbiAgICAgIHZhciBsaXN0ID0gW107XG4gICAgICB2YXIgbWFwID0gV2lraS5wYXJzZUpzb24ocmVzcG9uc2UpO1xuICAgICAgYW5ndWxhci5mb3JFYWNoKG1hcCwgKHZhbHVlLCBrZXkpID0+IHtcbiAgICAgICAgdmFsdWVbXCJfaWRcIl0gPSBrZXk7XG4gICAgICAgIGxpc3QucHVzaCh2YWx1ZSk7XG4gICAgICB9KTtcbiAgICAgICRzY29wZS5saXN0ID0gbGlzdDtcbiAgICAgIENvcmUuJGFwcGx5KCRzY29wZSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gdXBkYXRlVmlldygpIHtcbiAgICAgIHZhciBmaWx0ZXIgPSBDb3JlLnBhdGhHZXQoJHNjb3BlLCBbXCJncmlkT3B0aW9uc1wiLCBcImZpbHRlck9wdGlvbnNcIiwgXCJmaWx0ZXJUZXh0XCJdKSB8fCBcIlwiO1xuICAgICAgJHNjb3BlLmdpdCA9IHdpa2lSZXBvc2l0b3J5Lmpzb25DaGlsZENvbnRlbnRzKCRzY29wZS5wYWdlSWQsIFwiKi5qc29uXCIsIGZpbHRlciwgb25SZXN1bHRzKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBvbkZvcm1EYXRhKGRldGFpbHMpIHtcbiAgICAgIHZhciB0ZXh0ID0gZGV0YWlscy50ZXh0O1xuICAgICAgaWYgKHRleHQpIHtcbiAgICAgICAgJHNjb3BlLmZvcm1EZWZpbml0aW9uID0gV2lraS5wYXJzZUpzb24odGV4dCk7XG5cbiAgICAgICAgdmFyIGNvbHVtbkRlZnMgPSBbXTtcbiAgICAgICAgdmFyIHNjaGVtYSA9ICRzY29wZS5mb3JtRGVmaW5pdGlvbjtcbiAgICAgICAgYW5ndWxhci5mb3JFYWNoKHNjaGVtYS5wcm9wZXJ0aWVzLCAocHJvcGVydHksIG5hbWUpID0+IHtcbiAgICAgICAgICBpZiAobmFtZSkge1xuICAgICAgICAgICAgaWYgKCFGb3Jtcy5pc0FycmF5T3JOZXN0ZWRPYmplY3QocHJvcGVydHksIHNjaGVtYSkpIHtcbiAgICAgICAgICAgICAgdmFyIGNvbERlZiA9IHtcbiAgICAgICAgICAgICAgICBmaWVsZDogbmFtZSxcbiAgICAgICAgICAgICAgICBkaXNwbGF5TmFtZTogcHJvcGVydHkuZGVzY3JpcHRpb24gfHwgbmFtZSxcbiAgICAgICAgICAgICAgICB2aXNpYmxlOiB0cnVlXG4gICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgIGNvbHVtbkRlZnMucHVzaChjb2xEZWYpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIGNvbHVtbkRlZnMucHVzaChsaW5rc0NvbHVtbik7XG5cbiAgICAgICAgJHNjb3BlLmNvbHVtbkRlZnMgPSBjb2x1bW5EZWZzO1xuICAgICAgICAkc2NvcGUuZ3JpZE9wdGlvbnMuY29sdW1uRGVmcyA9IGNvbHVtbkRlZnM7XG5cbiAgICAgICAgLy8gbm93IHdlIGhhdmUgdGhlIGdyaWQgY29sdW1uIHN0dWZmIGxvYWRlZCwgbGV0cyBsb2FkIHRoZSBkYXRhdGFibGVcbiAgICAgICAgJHNjb3BlLnRhYmxlVmlldyA9IFwicGx1Z2lucy93aWtpL2h0bWwvZm9ybVRhYmxlRGF0YXRhYmxlLmh0bWxcIjtcbiAgICAgIH1cbiAgICB9XG4gICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgfV0pO1xufVxuIiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL2luY2x1ZGVzLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIndpa2lIZWxwZXJzLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIndpa2lQbHVnaW4udHNcIi8+XG5cbi8qKlxuICogQG1vZHVsZSBXaWtpXG4gKi9cbiBtb2R1bGUgV2lraSB7XG4gIF9tb2R1bGUuY29udHJvbGxlcihcIldpa2kuR2l0UHJlZmVyZW5jZXNcIiwgW1wiJHNjb3BlXCIsIFwibG9jYWxTdG9yYWdlXCIsIFwidXNlckRldGFpbHNcIiwgKCRzY29wZSwgbG9jYWxTdG9yYWdlLCB1c2VyRGV0YWlscykgPT4ge1xuXG4gICAgdmFyIGNvbmZpZyA9IHtcbiAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgZ2l0VXNlck5hbWU6IHtcbiAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICBsYWJlbDogJ1VzZXJuYW1lJyxcbiAgICAgICAgICBkZXNjcmlwdGlvbjogJ1RoZSB1c2VyIG5hbWUgdG8gYmUgdXNlZCB3aGVuIG1ha2luZyBjaGFuZ2VzIHRvIGZpbGVzIHdpdGggdGhlIHNvdXJjZSBjb250cm9sIHN5c3RlbSdcbiAgICAgICAgfSxcbiAgICAgICAgZ2l0VXNlckVtYWlsOiB7XG4gICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgbGFiZWw6ICdFbWFpbCcsXG4gICAgICAgICAgZGVzY3JpcHRpb246ICdUaGUgZW1haWwgYWRkcmVzcyB0byB1c2Ugd2hlbiBtYWtpbmcgY2hhbmdlcyB0byBmaWxlcyB3aXRoIHRoZSBzb3VyY2UgY29udHJvbCBzeXN0ZW0nXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9O1xuXG4gICAgJHNjb3BlLmVudGl0eSA9ICRzY29wZTtcbiAgICAkc2NvcGUuY29uZmlnID0gY29uZmlnO1xuXG4gICAgQ29yZS5pbml0UHJlZmVyZW5jZVNjb3BlKCRzY29wZSwgbG9jYWxTdG9yYWdlLCB7XG4gICAgICAnZ2l0VXNlck5hbWUnOiB7XG4gICAgICAgICd2YWx1ZSc6IHVzZXJEZXRhaWxzLnVzZXJuYW1lIHx8IFwiXCJcbiAgICAgIH0sXG4gICAgICAnZ2l0VXNlckVtYWlsJzoge1xuICAgICAgICAndmFsdWUnOiAnJ1xuICAgICAgfSAgXG4gICAgfSk7XG4gIH1dKTtcbiB9XG4iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vaW5jbHVkZXMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwid2lraUhlbHBlcnMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwid2lraVBsdWdpbi50c1wiLz5cblxuLyoqXG4gKiBAbW9kdWxlIFdpa2lcbiAqL1xubW9kdWxlIFdpa2kge1xuXG4gIF9tb2R1bGUuY29udHJvbGxlcihcIldpa2kuSGlzdG9yeUNvbnRyb2xsZXJcIiwgW1wiJHNjb3BlXCIsIFwiJGxvY2F0aW9uXCIsIFwiJHJvdXRlUGFyYW1zXCIsIFwiJHRlbXBsYXRlQ2FjaGVcIiwgXCJtYXJrZWRcIiwgXCJmaWxlRXh0ZW5zaW9uVHlwZVJlZ2lzdHJ5XCIsICAoJHNjb3BlLCAkbG9jYXRpb24sICRyb3V0ZVBhcmFtcywgJHRlbXBsYXRlQ2FjaGUsIG1hcmtlZCwgZmlsZUV4dGVuc2lvblR5cGVSZWdpc3RyeSkgPT4ge1xuXG4gICAgLy8gVE9ETyByZW1vdmUhXG4gICAgdmFyIGlzRm1jID0gZmFsc2U7XG4gICAgdmFyIGpvbG9raWEgPSBudWxsO1xuXG4gICAgV2lraS5pbml0U2NvcGUoJHNjb3BlLCAkcm91dGVQYXJhbXMsICRsb2NhdGlvbik7XG4gICAgdmFyIHdpa2lSZXBvc2l0b3J5ID0gJHNjb3BlLndpa2lSZXBvc2l0b3J5O1xuXG4gICAgLy8gVE9ETyB3ZSBjb3VsZCBjb25maWd1cmUgdGhpcz9cbiAgICAkc2NvcGUuZGF0ZUZvcm1hdCA9ICdFRUUsIE1NTSBkLCB5IGF0IEhIOm1tOnNzIFonO1xuICAgIC8vJ3l5eXktTU0tZGQgSEg6bW06c3MgWidcblxuICAgICRzY29wZS5ncmlkT3B0aW9ucyA9IHtcbiAgICAgIGRhdGE6ICdsb2dzJyxcbiAgICAgIHNob3dGaWx0ZXI6IGZhbHNlLFxuICAgICAgZW5hYmxlUm93Q2xpY2tTZWxlY3Rpb246IGZhbHNlLFxuICAgICAgbXVsdGlTZWxlY3Q6IHRydWUsXG4gICAgICBzZWxlY3RlZEl0ZW1zOiBbXSxcbiAgICAgIHNob3dTZWxlY3Rpb25DaGVja2JveDogdHJ1ZSxcbiAgICAgIGRpc3BsYXlTZWxlY3Rpb25DaGVja2JveCA6IHRydWUsIC8vIG9sZCBwcmUgMi4wIGNvbmZpZyFcbiAgICAgIGZpbHRlck9wdGlvbnM6IHtcbiAgICAgICAgZmlsdGVyVGV4dDogJydcbiAgICAgIH0sXG4gICAgICBjb2x1bW5EZWZzOiBbXG4gICAgICAgIHtcbiAgICAgICAgICBmaWVsZDogJyRkYXRlJyxcbiAgICAgICAgICBkaXNwbGF5TmFtZTogJ01vZGlmaWVkJyxcbiAgICAgICAgICBjZWxsVGVtcGxhdGU6ICc8ZGl2IGNsYXNzPVwibmdDZWxsVGV4dFwiIHRpdGxlPVwie3tyb3cuZW50aXR5LiRkYXRlIHwgZGF0ZTpcXCdFRUUsIE1NTSBkLCB5eXl5IDogSEg6bW06c3MgWlxcJ319XCI+e3tyb3cuZW50aXR5LiRkYXRlLnJlbGF0aXZlKCl9fTwvZGl2PicsXG4gICAgICAgICAgd2lkdGg6IFwiKipcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgZmllbGQ6ICdzaGEnLFxuICAgICAgICAgIGRpc3BsYXlOYW1lOiAnQ2hhbmdlJyxcbiAgICAgICAgICBjZWxsVGVtcGxhdGU6ICR0ZW1wbGF0ZUNhY2hlLmdldCgnY2hhbmdlQ2VsbFRlbXBsYXRlLmh0bWwnKSxcbiAgICAgICAgICBjZWxsRmlsdGVyOiBcIlwiLFxuICAgICAgICAgIHdpZHRoOiBcIipcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgZmllbGQ6ICdhdXRob3InLFxuICAgICAgICAgIGRpc3BsYXlOYW1lOiAnQXV0aG9yJyxcbiAgICAgICAgICBjZWxsRmlsdGVyOiBcIlwiLFxuICAgICAgICAgIHdpZHRoOiBcIioqXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIGZpZWxkOiAnc2hvcnRfbWVzc2FnZScsXG4gICAgICAgICAgZGlzcGxheU5hbWU6ICdNZXNzYWdlJyxcbiAgICAgICAgICBjZWxsVGVtcGxhdGU6ICc8ZGl2IGNsYXNzPVwibmdDZWxsVGV4dFwiIHRpdGxlPVwie3tyb3cuZW50aXR5LnNob3J0X21lc3NhZ2V9fVwiPnt7cm93LmVudGl0eS5zaG9ydF9tZXNzYWdlICB8IGxpbWl0VG86MTAwfX08L2Rpdj4nLFxuICAgICAgICAgIHdpZHRoOiBcIioqKipcIlxuICAgICAgICB9XG4gICAgICBdXG4gICAgfTtcblxuICAgICRzY29wZS4kb24oXCIkcm91dGVDaGFuZ2VTdWNjZXNzXCIsIGZ1bmN0aW9uIChldmVudCwgY3VycmVudCwgcHJldmlvdXMpIHtcbiAgICAgIC8vIGxldHMgZG8gdGhpcyBhc3luY2hyb25vdXNseSB0byBhdm9pZCBFcnJvcjogJGRpZ2VzdCBhbHJlYWR5IGluIHByb2dyZXNzXG4gICAgICBzZXRUaW1lb3V0KHVwZGF0ZVZpZXcsIDUwKTtcbiAgICB9KTtcblxuICAgICRzY29wZS5jYW5SZXZlcnQgPSAoKSA9PiB7XG4gICAgICB2YXIgc2VsZWN0ZWRJdGVtcyA9ICRzY29wZS5ncmlkT3B0aW9ucy5zZWxlY3RlZEl0ZW1zO1xuICAgICAgcmV0dXJuIHNlbGVjdGVkSXRlbXMubGVuZ3RoID09PSAxICYmIHNlbGVjdGVkSXRlbXNbMF0gIT09ICRzY29wZS5sb2dzWzBdO1xuICAgIH07XG5cbiAgICAkc2NvcGUucmV2ZXJ0ID0gKCkgPT4ge1xuICAgICAgdmFyIHNlbGVjdGVkSXRlbXMgPSAkc2NvcGUuZ3JpZE9wdGlvbnMuc2VsZWN0ZWRJdGVtcztcbiAgICAgIGlmIChzZWxlY3RlZEl0ZW1zLmxlbmd0aCA+IDApIHtcbiAgICAgICAgdmFyIG9iamVjdElkID0gc2VsZWN0ZWRJdGVtc1swXS5zaGE7XG4gICAgICAgIGlmIChvYmplY3RJZCkge1xuICAgICAgICAgIHZhciBjb21taXRNZXNzYWdlID0gXCJSZXZlcnRpbmcgZmlsZSBcIiArICRzY29wZS5wYWdlSWQgKyBcIiB0byBwcmV2aW91cyB2ZXJzaW9uIFwiICsgb2JqZWN0SWQ7XG4gICAgICAgICAgd2lraVJlcG9zaXRvcnkucmV2ZXJ0VG8oJHNjb3BlLmJyYW5jaCwgb2JqZWN0SWQsICRzY29wZS5wYWdlSWQsIGNvbW1pdE1lc3NhZ2UsIChyZXN1bHQpID0+IHtcbiAgICAgICAgICAgIFdpa2kub25Db21wbGV0ZShyZXN1bHQpO1xuICAgICAgICAgICAgLy8gbm93IGxldHMgdXBkYXRlIHRoZSB2aWV3XG4gICAgICAgICAgICBDb3JlLm5vdGlmaWNhdGlvbignc3VjY2VzcycsIFwiU3VjY2Vzc2Z1bGx5IHJldmVydGVkIFwiICsgJHNjb3BlLnBhZ2VJZCk7XG4gICAgICAgICAgICB1cGRhdGVWaWV3KCk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgc2VsZWN0ZWRJdGVtcy5zcGxpY2UoMCwgc2VsZWN0ZWRJdGVtcy5sZW5ndGgpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICAkc2NvcGUuZGlmZiA9ICgpID0+IHtcbiAgICAgIHZhciBkZWZhdWx0VmFsdWUgPSBcIiBcIjtcbiAgICAgIHZhciBvYmplY3RJZCA9IGRlZmF1bHRWYWx1ZTtcbiAgICAgIHZhciBzZWxlY3RlZEl0ZW1zID0gJHNjb3BlLmdyaWRPcHRpb25zLnNlbGVjdGVkSXRlbXM7XG4gICAgICBpZiAoc2VsZWN0ZWRJdGVtcy5sZW5ndGggPiAwKSB7XG4gICAgICAgIG9iamVjdElkID0gc2VsZWN0ZWRJdGVtc1swXS5zaGEgfHwgZGVmYXVsdFZhbHVlO1xuICAgICAgfVxuICAgICAgdmFyIGJhc2VPYmplY3RJZCA9IGRlZmF1bHRWYWx1ZTtcbiAgICAgIGlmIChzZWxlY3RlZEl0ZW1zLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgYmFzZU9iamVjdElkID0gc2VsZWN0ZWRJdGVtc1sxXS5zaGEgfHxkZWZhdWx0VmFsdWU7XG4gICAgICAgIC8vIG1ha2UgdGhlIG9iamVjdElkICh0aGUgb25lIHRoYXQgd2lsbCBzdGFydCB3aXRoIGIvIHBhdGgpIGFsd2F5cyBuZXdlciB0aGFuIGJhc2VPYmplY3RJZFxuICAgICAgICBpZiAoc2VsZWN0ZWRJdGVtc1swXS5kYXRlIDwgc2VsZWN0ZWRJdGVtc1sxXS5kYXRlKSB7XG4gICAgICAgICAgdmFyIF8gPSBiYXNlT2JqZWN0SWQ7XG4gICAgICAgICAgYmFzZU9iamVjdElkID0gb2JqZWN0SWQ7XG4gICAgICAgICAgb2JqZWN0SWQgPSBfO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICB2YXIgbGluayA9IHN0YXJ0TGluaygkc2NvcGUpICsgXCIvZGlmZi9cIiArICRzY29wZS5wYWdlSWQgKyBcIi9cIiArIG9iamVjdElkICsgXCIvXCIgKyBiYXNlT2JqZWN0SWQ7XG4gICAgICB2YXIgcGF0aCA9IENvcmUudHJpbUxlYWRpbmcobGluaywgXCIjXCIpO1xuICAgICAgJGxvY2F0aW9uLnBhdGgocGF0aCk7XG4gICAgfTtcblxuICAgIHVwZGF0ZVZpZXcoKTtcblxuICAgIGZ1bmN0aW9uIHVwZGF0ZVZpZXcoKSB7XG4gICAgICB2YXIgb2JqZWN0SWQgPSBcIlwiO1xuICAgICAgdmFyIGxpbWl0ID0gMDtcblxuICAgICAgJHNjb3BlLmdpdCA9IHdpa2lSZXBvc2l0b3J5Lmhpc3RvcnkoJHNjb3BlLmJyYW5jaCwgb2JqZWN0SWQsICRzY29wZS5wYWdlSWQsIGxpbWl0LCAobG9nQXJyYXkpID0+IHtcbiAgICAgICAgYW5ndWxhci5mb3JFYWNoKGxvZ0FycmF5LCAobG9nKSA9PiB7XG4gICAgICAgICAgLy8gbGV0cyB1c2UgdGhlIHNob3J0ZXIgaGFzaCBmb3IgbGlua3MgYnkgZGVmYXVsdFxuICAgICAgICAgIHZhciBjb21taXRJZCA9IGxvZy5zaGE7XG4gICAgICAgICAgbG9nLiRkYXRlID0gRGV2ZWxvcGVyLmFzRGF0ZShsb2cuZGF0ZSk7XG4gICAgICAgICAgbG9nLmNvbW1pdExpbmsgPSBzdGFydExpbmsoJHNjb3BlKSArIFwiL2NvbW1pdC9cIiArICRzY29wZS5wYWdlSWQgKyBcIi9cIiArIGNvbW1pdElkO1xuICAgICAgICB9KTtcbiAgICAgICAgJHNjb3BlLmxvZ3MgPSBsb2dBcnJheTtcbiAgICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICAgIH0pO1xuICAgICAgV2lraS5sb2FkQnJhbmNoZXMoam9sb2tpYSwgd2lraVJlcG9zaXRvcnksICRzY29wZSwgaXNGbWMpO1xuICAgIH1cbiAgfV0pO1xufVxuIiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL2luY2x1ZGVzLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIndpa2lIZWxwZXJzLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIndpa2lQbHVnaW4udHNcIi8+XG5cbi8qKlxuICogQG1vZHVsZSBXaWtpXG4gKi9cbm1vZHVsZSBXaWtpIHtcbiAgX21vZHVsZS5jb250cm9sbGVyKFwiV2lraS5OYXZCYXJDb250cm9sbGVyXCIsIFtcIiRzY29wZVwiLCBcIiRsb2NhdGlvblwiLCBcIiRyb3V0ZVBhcmFtc1wiLCBcIndpa2lCcmFuY2hNZW51XCIsICgkc2NvcGUsICRsb2NhdGlvbiwgJHJvdXRlUGFyYW1zLCB3aWtpQnJhbmNoTWVudTpCcmFuY2hNZW51KSA9PiB7XG5cbiAgICAvLyBUT0RPIHJlbW92ZSFcbiAgICB2YXIgaXNGbWMgPSBmYWxzZTtcblxuICAgIFdpa2kuaW5pdFNjb3BlKCRzY29wZSwgJHJvdXRlUGFyYW1zLCAkbG9jYXRpb24pO1xuICAgIHZhciB3aWtpUmVwb3NpdG9yeSA9ICRzY29wZS53aWtpUmVwb3NpdG9yeTtcblxuICAgICRzY29wZS5icmFuY2hNZW51Q29uZmlnID0gPFVJLk1lbnVJdGVtPntcbiAgICAgIHRpdGxlOiAkc2NvcGUuYnJhbmNoLFxuICAgICAgaXRlbXM6IFtdXG4gICAgfTtcblxuICAgICRzY29wZS5WaWV3TW9kZSA9IFdpa2kuVmlld01vZGU7XG4gICAgJHNjb3BlLnNldFZpZXdNb2RlID0gKG1vZGU6V2lraS5WaWV3TW9kZSkgPT4ge1xuICAgICAgJHNjb3BlLiRlbWl0KCdXaWtpLlNldFZpZXdNb2RlJywgbW9kZSk7XG4gICAgfTtcblxuICAgIHdpa2lCcmFuY2hNZW51LmFwcGx5TWVudUV4dGVuc2lvbnMoJHNjb3BlLmJyYW5jaE1lbnVDb25maWcuaXRlbXMpO1xuXG4gICAgJHNjb3BlLiR3YXRjaCgnYnJhbmNoZXMnLCAobmV3VmFsdWUsIG9sZFZhbHVlKSA9PiB7XG4gICAgICBpZiAobmV3VmFsdWUgPT09IG9sZFZhbHVlIHx8ICFuZXdWYWx1ZSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICAkc2NvcGUuYnJhbmNoTWVudUNvbmZpZy5pdGVtcyA9IFtdO1xuICAgICAgaWYgKG5ld1ZhbHVlLmxlbmd0aCA+IDApIHtcbiAgICAgICAgJHNjb3BlLmJyYW5jaE1lbnVDb25maWcuaXRlbXMucHVzaCh7XG4gICAgICAgICAgaGVhZGluZzogaXNGbWMgPyBcIlZlcnNpb25zXCIgOiBcIkJyYW5jaGVzXCJcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgICBuZXdWYWx1ZS5zb3J0KCkuZm9yRWFjaCgoaXRlbSkgPT4ge1xuICAgICAgICB2YXIgbWVudUl0ZW0gPSB7XG4gICAgICAgICAgdGl0bGU6IGl0ZW0sXG4gICAgICAgICAgaWNvbjogJycsXG4gICAgICAgICAgYWN0aW9uOiAoKSA9PiB7fVxuICAgICAgICB9O1xuICAgICAgICBpZiAoaXRlbSA9PT0gJHNjb3BlLmJyYW5jaCkge1xuICAgICAgICAgIG1lbnVJdGVtLmljb24gPSBcImZhIGZhLW9rXCI7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgbWVudUl0ZW0uYWN0aW9uID0gKCkgPT4ge1xuICAgICAgICAgICAgdmFyIHRhcmdldFVybCA9IGJyYW5jaExpbmsoaXRlbSwgPHN0cmluZz4kc2NvcGUucGFnZUlkLCAkbG9jYXRpb24pO1xuICAgICAgICAgICAgJGxvY2F0aW9uLnBhdGgoQ29yZS50b1BhdGgodGFyZ2V0VXJsKSk7XG4gICAgICAgICAgICBDb3JlLiRhcHBseSgkc2NvcGUpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICAkc2NvcGUuYnJhbmNoTWVudUNvbmZpZy5pdGVtcy5wdXNoKG1lbnVJdGVtKTtcbiAgICAgIH0pO1xuICAgICAgd2lraUJyYW5jaE1lbnUuYXBwbHlNZW51RXh0ZW5zaW9ucygkc2NvcGUuYnJhbmNoTWVudUNvbmZpZy5pdGVtcyk7XG4gICAgfSwgdHJ1ZSk7XG5cbiAgICAkc2NvcGUuY3JlYXRlTGluayA9ICgpID0+IHtcbiAgICAgIHZhciBwYWdlSWQgPSBXaWtpLnBhZ2VJZCgkcm91dGVQYXJhbXMsICRsb2NhdGlvbik7XG4gICAgICByZXR1cm4gV2lraS5jcmVhdGVMaW5rKCRzY29wZSwgcGFnZUlkLCAkbG9jYXRpb24pO1xuICAgIH07XG5cbiAgICAkc2NvcGUuc3RhcnRMaW5rID0gc3RhcnRMaW5rKCRzY29wZSk7XG5cbiAgICAkc2NvcGUuc291cmNlTGluayA9ICgpID0+IHtcbiAgICAgIHZhciBwYXRoID0gJGxvY2F0aW9uLnBhdGgoKTtcbiAgICAgIHZhciBhbnN3ZXIgPSA8c3RyaW5nPm51bGw7XG4gICAgICBhbmd1bGFyLmZvckVhY2goV2lraS5jdXN0b21WaWV3TGlua3MoJHNjb3BlKSwgKGxpbmspID0+IHtcbiAgICAgICAgaWYgKHBhdGguc3RhcnRzV2l0aChsaW5rKSkge1xuICAgICAgICAgIGFuc3dlciA9IDxzdHJpbmc+Q29yZS5jcmVhdGVIcmVmKCRsb2NhdGlvbiwgV2lraS5zdGFydExpbmsoJHNjb3BlKSArIFwiL3ZpZXdcIiArIHBhdGguc3Vic3RyaW5nKGxpbmsubGVuZ3RoKSlcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICAvLyByZW1vdmUgdGhlIGZvcm0gcGFyYW1ldGVyIG9uIHZpZXcvZWRpdCBsaW5rc1xuICAgICAgcmV0dXJuICghYW5zd2VyICYmICRsb2NhdGlvbi5zZWFyY2goKVtcImZvcm1cIl0pXG4gICAgICAgICAgICAgID8gQ29yZS5jcmVhdGVIcmVmKCRsb2NhdGlvbiwgXCIjXCIgKyBwYXRoLCBbXCJmb3JtXCJdKVxuICAgICAgICAgICAgICA6IGFuc3dlcjtcbiAgICB9O1xuXG4gICAgJHNjb3BlLmlzQWN0aXZlID0gKGhyZWYpID0+IHtcbiAgICAgIGlmICghaHJlZikge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICByZXR1cm4gaHJlZi5lbmRzV2l0aCgkcm91dGVQYXJhbXNbJ3BhZ2UnXSk7XG4gICAgfTtcblxuICAgICRzY29wZS4kb24oXCIkcm91dGVDaGFuZ2VTdWNjZXNzXCIsIGZ1bmN0aW9uIChldmVudCwgY3VycmVudCwgcHJldmlvdXMpIHtcbiAgICAgIC8vIGxldHMgZG8gdGhpcyBhc3luY2hyb25vdXNseSB0byBhdm9pZCBFcnJvcjogJGRpZ2VzdCBhbHJlYWR5IGluIHByb2dyZXNzXG4gICAgICBzZXRUaW1lb3V0KGxvYWRCcmVhZGNydW1icywgNTApO1xuICAgIH0pO1xuXG4gICAgbG9hZEJyZWFkY3J1bWJzKCk7XG5cbiAgICBmdW5jdGlvbiBzd2l0Y2hGcm9tVmlld1RvQ3VzdG9tTGluayhicmVhZGNydW1iLCBsaW5rKSB7XG4gICAgICB2YXIgaHJlZiA9IGJyZWFkY3J1bWIuaHJlZjtcbiAgICAgIGlmIChocmVmKSB7XG4gICAgICAgIGJyZWFkY3J1bWIuaHJlZiA9IGhyZWYucmVwbGFjZShcIndpa2kvdmlld1wiLCBsaW5rKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBsb2FkQnJlYWRjcnVtYnMoKSB7XG4gICAgICB2YXIgc3RhcnQgPSBXaWtpLnN0YXJ0TGluaygkc2NvcGUpO1xuICAgICAgdmFyIGhyZWYgPSBzdGFydCArIFwiL3ZpZXdcIjtcbiAgICAgICRzY29wZS5icmVhZGNydW1icyA9IFtcbiAgICAgICAge2hyZWY6IGhyZWYsIG5hbWU6IFwicm9vdFwifVxuICAgICAgXTtcbiAgICAgIHZhciBwYXRoID0gV2lraS5wYWdlSWQoJHJvdXRlUGFyYW1zLCAkbG9jYXRpb24pO1xuICAgICAgdmFyIGFycmF5ID0gcGF0aCA/IHBhdGguc3BsaXQoXCIvXCIpIDogW107XG4gICAgICBhbmd1bGFyLmZvckVhY2goYXJyYXksIChuYW1lKSA9PiB7XG4gICAgICAgIGlmICghbmFtZS5zdGFydHNXaXRoKFwiL1wiKSAmJiAhaHJlZi5lbmRzV2l0aChcIi9cIikpIHtcbiAgICAgICAgICBocmVmICs9IFwiL1wiO1xuICAgICAgICB9XG4gICAgICAgIGhyZWYgKz0gV2lraS5lbmNvZGVQYXRoKG5hbWUpO1xuICAgICAgICBpZiAoIW5hbWUuaXNCbGFuaygpKSB7XG4gICAgICAgICAgJHNjb3BlLmJyZWFkY3J1bWJzLnB1c2goe2hyZWY6IGhyZWYsIG5hbWU6IG5hbWV9KTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICAvLyBsZXRzIHN3aXp6bGUgdGhlIGxhc3Qgb25lIG9yIHR3byB0byBiZSBmb3JtVGFibGUgdmlld3MgaWYgdGhlIGxhc3Qgb3IgMm5kIHRvIGxhc3RcbiAgICAgIHZhciBsb2MgPSAkbG9jYXRpb24ucGF0aCgpO1xuICAgICAgaWYgKCRzY29wZS5icmVhZGNydW1icy5sZW5ndGgpIHtcbiAgICAgICAgdmFyIGxhc3QgPSAkc2NvcGUuYnJlYWRjcnVtYnNbJHNjb3BlLmJyZWFkY3J1bWJzLmxlbmd0aCAtIDFdO1xuICAgICAgICAvLyBwb3NzaWJseSB0cmltIGFueSByZXF1aXJlZCBmaWxlIGV4dGVuc2lvbnNcbiAgICAgICAgbGFzdC5uYW1lID0gV2lraS5oaWRlRmlsZU5hbWVFeHRlbnNpb25zKGxhc3QubmFtZSk7XG5cbiAgICAgICAgdmFyIHN3aXp6bGVkID0gZmFsc2U7XG4gICAgICAgIGFuZ3VsYXIuZm9yRWFjaChXaWtpLmN1c3RvbVZpZXdMaW5rcygkc2NvcGUpLCAobGluaykgPT4ge1xuICAgICAgICAgIGlmICghc3dpenpsZWQgJiYgbG9jLnN0YXJ0c1dpdGgobGluaykpIHtcbiAgICAgICAgICAgIC8vIGxldHMgc3dpenpsZSB0aGUgdmlldyB0byB0aGUgY3VycmVudCBsaW5rXG4gICAgICAgICAgICBzd2l0Y2hGcm9tVmlld1RvQ3VzdG9tTGluaygkc2NvcGUuYnJlYWRjcnVtYnMubGFzdCgpLCBDb3JlLnRyaW1MZWFkaW5nKGxpbmssIFwiL1wiKSk7XG4gICAgICAgICAgICBzd2l6emxlZCA9IHRydWU7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgaWYgKCFzd2l6emxlZCAmJiAkbG9jYXRpb24uc2VhcmNoKClbXCJmb3JtXCJdKSB7XG4gICAgICAgICAgdmFyIGxhc3ROYW1lID0gJHNjb3BlLmJyZWFkY3J1bWJzLmxhc3QoKS5uYW1lO1xuICAgICAgICAgIGlmIChsYXN0TmFtZSAmJiBsYXN0TmFtZS5lbmRzV2l0aChcIi5qc29uXCIpKSB7XG4gICAgICAgICAgICAvLyBwcmV2aW91cyBicmVhZGNydW1iIHNob3VsZCBiZSBhIGZvcm1UYWJsZVxuICAgICAgICAgICAgc3dpdGNoRnJvbVZpZXdUb0N1c3RvbUxpbmsoJHNjb3BlLmJyZWFkY3J1bWJzWyRzY29wZS5icmVhZGNydW1icy5sZW5ndGggLSAyXSwgXCJ3aWtpL2Zvcm1UYWJsZVwiKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIC8qXG4gICAgICBpZiAobG9jLnN0YXJ0c1dpdGgoXCIvd2lraS9oaXN0b3J5XCIpIHx8IGxvYy5zdGFydHNXaXRoKFwiL3dpa2kvdmVyc2lvblwiKVxuICAgICAgICB8fCBsb2Muc3RhcnRzV2l0aChcIi93aWtpL2RpZmZcIikgfHwgbG9jLnN0YXJ0c1dpdGgoXCIvd2lraS9jb21taXRcIikpIHtcbiAgICAgICAgLy8gbGV0cyBhZGQgYSBoaXN0b3J5IHRhYlxuICAgICAgICAkc2NvcGUuYnJlYWRjcnVtYnMucHVzaCh7aHJlZjogXCIjL3dpa2kvaGlzdG9yeS9cIiArIHBhdGgsIG5hbWU6IFwiSGlzdG9yeVwifSk7XG4gICAgICB9IGVsc2UgaWYgKCRzY29wZS5icmFuY2gpIHtcbiAgICAgICAgdmFyIHByZWZpeCA9XCIvd2lraS9icmFuY2gvXCIgKyAkc2NvcGUuYnJhbmNoO1xuICAgICAgICBpZiAobG9jLnN0YXJ0c1dpdGgocHJlZml4ICsgXCIvaGlzdG9yeVwiKSB8fCBsb2Muc3RhcnRzV2l0aChwcmVmaXggKyBcIi92ZXJzaW9uXCIpXG4gICAgICAgICAgfHwgbG9jLnN0YXJ0c1dpdGgocHJlZml4ICsgXCIvZGlmZlwiKSB8fCBsb2Muc3RhcnRzV2l0aChwcmVmaXggKyBcIi9jb21taXRcIikpIHtcbiAgICAgICAgICAvLyBsZXRzIGFkZCBhIGhpc3RvcnkgdGFiXG4gICAgICAgICAgJHNjb3BlLmJyZWFkY3J1bWJzLnB1c2goe2hyZWY6IFwiIy93aWtpL2JyYW5jaC9cIiArICRzY29wZS5icmFuY2ggKyBcIi9oaXN0b3J5L1wiICsgcGF0aCwgbmFtZTogXCJIaXN0b3J5XCJ9KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgKi9cbiAgICAgIHZhciBuYW1lOnN0cmluZyA9IG51bGw7XG4gICAgICBpZiAobG9jLnN0YXJ0c1dpdGgoXCIvd2lraS92ZXJzaW9uXCIpKSB7XG4gICAgICAgIC8vIGxldHMgYWRkIGEgdmVyc2lvbiB0YWJcbiAgICAgICAgbmFtZSA9ICgkcm91dGVQYXJhbXNbXCJvYmplY3RJZFwiXSB8fCBcIlwiKS5zdWJzdHJpbmcoMCwgNikgfHwgXCJWZXJzaW9uXCI7XG4gICAgICAgICRzY29wZS5icmVhZGNydW1icy5wdXNoKHtocmVmOiBcIiNcIiArIGxvYywgbmFtZTogbmFtZX0pO1xuICAgICAgfVxuICAgICAgaWYgKGxvYy5zdGFydHNXaXRoKFwiL3dpa2kvZGlmZlwiKSkge1xuICAgICAgICAvLyBsZXRzIGFkZCBhIHZlcnNpb24gdGFiXG4gICAgICAgIHZhciB2MSA9ICgkcm91dGVQYXJhbXNbXCJvYmplY3RJZFwiXSB8fCBcIlwiKS5zdWJzdHJpbmcoMCwgNik7XG4gICAgICAgIHZhciB2MiA9ICgkcm91dGVQYXJhbXNbXCJiYXNlT2JqZWN0SWRcIl0gfHwgXCJcIikuc3Vic3RyaW5nKDAsIDYpO1xuICAgICAgICBuYW1lID0gXCJEaWZmXCI7XG4gICAgICAgIGlmICh2MSkge1xuICAgICAgICAgIGlmICh2Mikge1xuICAgICAgICAgICAgbmFtZSArPSBcIiBcIiArIHYxICsgXCIgXCIgKyB2MjtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbmFtZSArPSBcIiBcIiArIHYxO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICAkc2NvcGUuYnJlYWRjcnVtYnMucHVzaCh7aHJlZjogXCIjXCIgKyBsb2MsIG5hbWU6IG5hbWV9KTtcbiAgICAgIH1cbiAgICAgIENvcmUuJGFwcGx5KCRzY29wZSk7XG4gICAgfVxuICB9XSk7XG59XG4iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vaW5jbHVkZXMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwid2lraUhlbHBlcnMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwid2lraVBsdWdpbi50c1wiLz5cblxuLyoqXG4gKiBAbW9kdWxlIFdpa2lcbiAqL1xubW9kdWxlIFdpa2kge1xuXG4gIC8vIG1haW4gcGFnZSBjb250cm9sbGVyXG4gIGV4cG9ydCB2YXIgVmlld0NvbnRyb2xsZXIgPSBfbW9kdWxlLmNvbnRyb2xsZXIoXCJXaWtpLlZpZXdDb250cm9sbGVyXCIsIFtcIiRzY29wZVwiLCBcIiRsb2NhdGlvblwiLCBcIiRyb3V0ZVBhcmFtc1wiLCBcIiRyb3V0ZVwiLCBcIiRodHRwXCIsIFwiJHRpbWVvdXRcIiwgXCJtYXJrZWRcIiwgXCJmaWxlRXh0ZW5zaW9uVHlwZVJlZ2lzdHJ5XCIsICBcIiRjb21waWxlXCIsIFwiJHRlbXBsYXRlQ2FjaGVcIiwgXCJsb2NhbFN0b3JhZ2VcIiwgXCIkaW50ZXJwb2xhdGVcIiwgXCIkZGlhbG9nXCIsICgkc2NvcGUsICRsb2NhdGlvbjpuZy5JTG9jYXRpb25TZXJ2aWNlLCAkcm91dGVQYXJhbXM6bmcucm91dGUuSVJvdXRlUGFyYW1zU2VydmljZSwgJHJvdXRlOm5nLnJvdXRlLklSb3V0ZVNlcnZpY2UsICRodHRwOm5nLklIdHRwU2VydmljZSwgJHRpbWVvdXQ6bmcuSVRpbWVvdXRTZXJ2aWNlLCBtYXJrZWQsIGZpbGVFeHRlbnNpb25UeXBlUmVnaXN0cnksICAkY29tcGlsZTpuZy5JQ29tcGlsZVNlcnZpY2UsICR0ZW1wbGF0ZUNhY2hlOm5nLklUZW1wbGF0ZUNhY2hlU2VydmljZSwgbG9jYWxTdG9yYWdlLCAkaW50ZXJwb2xhdGU6bmcuSUludGVycG9sYXRlU2VydmljZSwgJGRpYWxvZykgPT4ge1xuXG4gICAgJHNjb3BlLm5hbWUgPSBcIldpa2lWaWV3Q29udHJvbGxlclwiO1xuXG4gICAgLy8gVE9ETyByZW1vdmUhXG4gICAgdmFyIGlzRm1jID0gZmFsc2U7XG5cbiAgICBXaWtpLmluaXRTY29wZSgkc2NvcGUsICRyb3V0ZVBhcmFtcywgJGxvY2F0aW9uKTtcbiAgICB2YXIgd2lraVJlcG9zaXRvcnkgPSAkc2NvcGUud2lraVJlcG9zaXRvcnk7XG5cbiAgICBTZWxlY3Rpb25IZWxwZXJzLmRlY29yYXRlKCRzY29wZSk7XG5cbiAgICAkc2NvcGUuZmFicmljVG9wTGV2ZWwgPSBcImZhYnJpYy9wcm9maWxlcy9cIjtcblxuICAgICRzY29wZS52ZXJzaW9uSWQgPSAkc2NvcGUuYnJhbmNoO1xuXG4gICAgJHNjb3BlLnBhbmVUZW1wbGF0ZSA9ICcnO1xuXG4gICAgJHNjb3BlLnByb2ZpbGVJZCA9IFwiXCI7XG4gICAgJHNjb3BlLnNob3dQcm9maWxlSGVhZGVyID0gZmFsc2U7XG4gICAgJHNjb3BlLnNob3dBcHBIZWFkZXIgPSBmYWxzZTtcblxuICAgICRzY29wZS5vcGVyYXRpb25Db3VudGVyID0gMTtcbiAgICAkc2NvcGUucmVuYW1lRGlhbG9nID0gPFdpa2lEaWFsb2c+IG51bGw7XG4gICAgJHNjb3BlLm1vdmVEaWFsb2cgPSA8V2lraURpYWxvZz4gbnVsbDtcbiAgICAkc2NvcGUuZGVsZXRlRGlhbG9nID0gPFdpa2lEaWFsb2c+IG51bGw7XG4gICAgJHNjb3BlLmlzRmlsZSA9IGZhbHNlO1xuXG4gICAgJHNjb3BlLnJlbmFtZSA9IHtcbiAgICAgIG5ld0ZpbGVOYW1lOiBcIlwiXG4gICAgfTtcbiAgICAkc2NvcGUubW92ZSA9IHtcbiAgICAgIG1vdmVGb2xkZXI6IFwiXCJcbiAgICB9O1xuICAgICRzY29wZS5WaWV3TW9kZSA9IFdpa2kuVmlld01vZGU7XG5cbiAgICAvLyBiaW5kIGZpbHRlciBtb2RlbCB2YWx1ZXMgdG8gc2VhcmNoIHBhcmFtcy4uLlxuICAgIENvcmUuYmluZE1vZGVsVG9TZWFyY2hQYXJhbSgkc2NvcGUsICRsb2NhdGlvbiwgXCJzZWFyY2hUZXh0XCIsIFwicVwiLCBcIlwiKTtcblxuICAgIFN0b3JhZ2VIZWxwZXJzLmJpbmRNb2RlbFRvTG9jYWxTdG9yYWdlKHtcbiAgICAgICRzY29wZTogJHNjb3BlLFxuICAgICAgJGxvY2F0aW9uOiAkbG9jYXRpb24sXG4gICAgICBsb2NhbFN0b3JhZ2U6IGxvY2FsU3RvcmFnZSxcbiAgICAgIG1vZGVsTmFtZTogJ21vZGUnLFxuICAgICAgcGFyYW1OYW1lOiAnd2lraVZpZXdNb2RlJyxcbiAgICAgIGluaXRpYWxWYWx1ZTogV2lraS5WaWV3TW9kZS5MaXN0LFxuICAgICAgdG86IENvcmUubnVtYmVyVG9TdHJpbmcsXG4gICAgICBmcm9tOiBDb3JlLnBhcnNlSW50VmFsdWVcbiAgICB9KTtcblxuICAgIC8vIG9ubHkgcmVsb2FkIHRoZSBwYWdlIGlmIGNlcnRhaW4gc2VhcmNoIHBhcmFtZXRlcnMgY2hhbmdlXG4gICAgQ29yZS5yZWxvYWRXaGVuUGFyYW1ldGVyc0NoYW5nZSgkcm91dGUsICRzY29wZSwgJGxvY2F0aW9uLCBbJ3dpa2lWaWV3TW9kZSddKTtcblxuICAgICRzY29wZS5ncmlkT3B0aW9ucyA9IHtcbiAgICAgIGRhdGE6ICdjaGlsZHJlbicsXG4gICAgICBkaXNwbGF5Rm9vdGVyOiBmYWxzZSxcbiAgICAgIHNlbGVjdGVkSXRlbXM6IFtdLFxuICAgICAgc2hvd1NlbGVjdGlvbkNoZWNrYm94OiB0cnVlLFxuICAgICAgZW5hYmxlU29ydGluZzogZmFsc2UsXG4gICAgICB1c2VFeHRlcm5hbFNvcnRpbmc6IHRydWUsXG4gICAgICBjb2x1bW5EZWZzOiBbXG4gICAgICAgIHtcbiAgICAgICAgICBmaWVsZDogJ25hbWUnLFxuICAgICAgICAgIGRpc3BsYXlOYW1lOiAnTmFtZScsXG4gICAgICAgICAgY2VsbFRlbXBsYXRlOiAkdGVtcGxhdGVDYWNoZS5nZXQoJ2ZpbGVDZWxsVGVtcGxhdGUuaHRtbCcpLFxuICAgICAgICAgIGhlYWRlckNlbGxUZW1wbGF0ZTogJHRlbXBsYXRlQ2FjaGUuZ2V0KCdmaWxlQ29sdW1uVGVtcGxhdGUuaHRtbCcpXG4gICAgICAgIH1cbiAgICAgIF1cbiAgICB9O1xuXG4gICAgJHNjb3BlLiRvbignV2lraS5TZXRWaWV3TW9kZScsICgkZXZlbnQsIG1vZGU6V2lraS5WaWV3TW9kZSkgPT4ge1xuICAgICAgJHNjb3BlLm1vZGUgPSBtb2RlO1xuICAgICAgc3dpdGNoKG1vZGUpIHtcbiAgICAgICAgY2FzZSBWaWV3TW9kZS5MaXN0OlxuICAgICAgICAgIGxvZy5kZWJ1ZyhcIkxpc3QgdmlldyBtb2RlXCIpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIFZpZXdNb2RlLkljb246XG4gICAgICAgICAgbG9nLmRlYnVnKFwiSWNvbiB2aWV3IG1vZGVcIik7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgJHNjb3BlLm1vZGUgPSBWaWV3TW9kZS5MaXN0O1xuICAgICAgICAgIGxvZy5kZWJ1ZyhcIkRlZmF1bHRpbmcgdG8gbGlzdCB2aWV3IG1vZGVcIik7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfSk7XG5cblxuICAgICRzY29wZS5jaGlsZEFjdGlvbnMgPSBbXTtcblxuICAgIHZhciBtYXliZVVwZGF0ZVZpZXcgPSBDb3JlLnRocm90dGxlZCh1cGRhdGVWaWV3LCAxMDAwKTtcblxuICAgICRzY29wZS5tYXJrZWQgPSAodGV4dCkgPT4ge1xuICAgICAgaWYgKHRleHQpIHtcbiAgICAgICAgcmV0dXJuIG1hcmtlZCh0ZXh0KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiAnJztcbiAgICAgIH1cbiAgICB9O1xuXG5cbiAgICAkc2NvcGUuJG9uKCd3aWtpQnJhbmNoZXNVcGRhdGVkJywgZnVuY3Rpb24gKCkge1xuICAgICAgdXBkYXRlVmlldygpO1xuICAgIH0pO1xuXG4gICAgJHNjb3BlLmNyZWF0ZURhc2hib2FyZExpbmsgPSAoKSA9PiB7XG4gICAgICB2YXIgaHJlZiA9ICcvd2lraS9icmFuY2gvOmJyYW5jaC92aWV3LypwYWdlJztcbiAgICAgIHZhciBwYWdlID0gJHJvdXRlUGFyYW1zWydwYWdlJ107XG4gICAgICB2YXIgdGl0bGUgPSBwYWdlID8gcGFnZS5zcGxpdChcIi9cIikubGFzdCgpIDogbnVsbDtcbiAgICAgIHZhciBzaXplID0gYW5ndWxhci50b0pzb24oe1xuICAgICAgICBzaXplX3g6IDIsXG4gICAgICAgIHNpemVfeTogMlxuICAgICAgfSk7XG4gICAgICB2YXIgYW5zd2VyID0gXCIjL2Rhc2hib2FyZC9hZGQ/dGFiPWRhc2hib2FyZFwiICtcbiAgICAgICAgXCImaHJlZj1cIiArIGVuY29kZVVSSUNvbXBvbmVudChocmVmKSArXG4gICAgICAgIFwiJnNpemU9XCIgKyBlbmNvZGVVUklDb21wb25lbnQoc2l6ZSkgK1xuICAgICAgICBcIiZyb3V0ZVBhcmFtcz1cIiArIGVuY29kZVVSSUNvbXBvbmVudChhbmd1bGFyLnRvSnNvbigkcm91dGVQYXJhbXMpKTtcbiAgICAgIGlmICh0aXRsZSkge1xuICAgICAgICBhbnN3ZXIgKz0gXCImdGl0bGU9XCIgKyBlbmNvZGVVUklDb21wb25lbnQodGl0bGUpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGFuc3dlcjtcbiAgICB9O1xuXG4gICAgJHNjb3BlLmRpc3BsYXlDbGFzcyA9ICgpID0+IHtcbiAgICAgIGlmICghJHNjb3BlLmNoaWxkcmVuIHx8ICRzY29wZS5jaGlsZHJlbi5sZW5ndGggPT09IDApIHtcbiAgICAgICAgcmV0dXJuIFwiXCI7XG4gICAgICB9XG4gICAgICByZXR1cm4gXCJzcGFuOVwiO1xuICAgIH07XG5cbiAgICAkc2NvcGUucGFyZW50TGluayA9ICgpID0+IHtcbiAgICAgIHZhciBzdGFydCA9IHN0YXJ0TGluaygkc2NvcGUpO1xuICAgICAgdmFyIHByZWZpeCA9IHN0YXJ0ICsgXCIvdmlld1wiO1xuICAgICAgLy9sb2cuZGVidWcoXCJwYWdlSWQ6IFwiLCAkc2NvcGUucGFnZUlkKVxuICAgICAgdmFyIHBhcnRzID0gJHNjb3BlLnBhZ2VJZC5zcGxpdChcIi9cIik7XG4gICAgICAvL2xvZy5kZWJ1ZyhcInBhcnRzOiBcIiwgcGFydHMpO1xuICAgICAgdmFyIHBhdGggPSBcIi9cIiArIHBhcnRzLmZpcnN0KHBhcnRzLmxlbmd0aCAtIDEpLmpvaW4oXCIvXCIpO1xuICAgICAgLy9sb2cuZGVidWcoXCJwYXRoOiBcIiwgcGF0aCk7XG4gICAgICByZXR1cm4gQ29yZS5jcmVhdGVIcmVmKCRsb2NhdGlvbiwgcHJlZml4ICsgcGF0aCwgW10pO1xuICAgIH07XG5cblxuICAgICRzY29wZS5jaGlsZExpbmsgPSAoY2hpbGQpID0+IHtcbiAgICAgIHZhciBzdGFydCA9IHN0YXJ0TGluaygkc2NvcGUpO1xuICAgICAgdmFyIHByZWZpeCA9IHN0YXJ0ICsgXCIvdmlld1wiO1xuICAgICAgdmFyIHBvc3RGaXggPSBcIlwiO1xuICAgICAgdmFyIHBhdGggPSBXaWtpLmVuY29kZVBhdGgoY2hpbGQucGF0aCk7XG4gICAgICBpZiAoY2hpbGQuZGlyZWN0b3J5KSB7XG4gICAgICAgIC8vIGlmIHdlIGFyZSBhIGZvbGRlciB3aXRoIHRoZSBzYW1lIG5hbWUgYXMgYSBmb3JtIGZpbGUsIGxldHMgYWRkIGEgZm9ybSBwYXJhbS4uLlxuICAgICAgICB2YXIgZm9ybVBhdGggPSBwYXRoICsgXCIuZm9ybVwiO1xuICAgICAgICB2YXIgY2hpbGRyZW4gPSAkc2NvcGUuY2hpbGRyZW47XG4gICAgICAgIGlmIChjaGlsZHJlbikge1xuICAgICAgICAgIHZhciBmb3JtRmlsZSA9IGNoaWxkcmVuLmZpbmQoKGNoaWxkKSA9PiB7XG4gICAgICAgICAgICByZXR1cm4gY2hpbGRbJ3BhdGgnXSA9PT0gZm9ybVBhdGg7XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgaWYgKGZvcm1GaWxlKSB7XG4gICAgICAgICAgICBwcmVmaXggPSBzdGFydCArIFwiL2Zvcm1UYWJsZVwiO1xuICAgICAgICAgICAgcG9zdEZpeCA9IFwiP2Zvcm09XCIgKyBmb3JtUGF0aDtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciB4bWxOYW1lc3BhY2VzID0gY2hpbGQueG1sX25hbWVzcGFjZXMgfHwgY2hpbGQueG1sTmFtZXNwYWNlcztcbiAgICAgICAgaWYgKHhtbE5hbWVzcGFjZXMgJiYgeG1sTmFtZXNwYWNlcy5sZW5ndGgpIHtcbiAgICAgICAgICBpZiAoeG1sTmFtZXNwYWNlcy5hbnkoKG5zKSA9PiBXaWtpLmNhbWVsTmFtZXNwYWNlcy5hbnkobnMpKSkge1xuICAgICAgICAgICAgaWYgKHVzZUNhbWVsQ2FudmFzQnlEZWZhdWx0KSB7XG4gICAgICAgICAgICAgIHByZWZpeCA9IHN0YXJ0ICsgXCIvY2FtZWwvY2FudmFzXCI7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBwcmVmaXggPSBzdGFydCArIFwiL2NhbWVsL3Byb3BlcnRpZXNcIjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGVsc2UgaWYgKHhtbE5hbWVzcGFjZXMuYW55KChucykgPT4gV2lraS5kb3plck5hbWVzcGFjZXMuYW55KG5zKSkpIHtcbiAgICAgICAgICAgIHByZWZpeCA9IHN0YXJ0ICsgXCIvZG96ZXIvbWFwcGluZ3NcIjtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbG9nLmRlYnVnKFwiY2hpbGQgXCIgKyBwYXRoICsgXCIgaGFzIG5hbWVzcGFjZXMgXCIgKyB4bWxOYW1lc3BhY2VzKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGNoaWxkLnBhdGguZW5kc1dpdGgoXCIuZm9ybVwiKSkge1xuICAgICAgICAgIHBvc3RGaXggPSBcIj9mb3JtPS9cIjtcbiAgICAgICAgfSBlbHNlIGlmIChXaWtpLmlzSW5kZXhQYWdlKGNoaWxkLnBhdGgpKSB7XG4gICAgICAgICAgLy8gbGV0cyBkZWZhdWx0IHRvIGJvb2sgdmlldyBvbiBpbmRleCBwYWdlc1xuICAgICAgICAgIHByZWZpeCA9IHN0YXJ0ICsgXCIvYm9va1wiO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gQ29yZS5jcmVhdGVIcmVmKCRsb2NhdGlvbiwgVXJsSGVscGVycy5qb2luKHByZWZpeCwgcGF0aCkgKyBwb3N0Rml4LCBbXCJmb3JtXCJdKTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLmZpbGVOYW1lID0gKGVudGl0eSkgPT4ge1xuICAgICAgcmV0dXJuIFdpa2kuaGlkZUZpbGVOYW1lRXh0ZW5zaW9ucyhlbnRpdHkuZGlzcGxheU5hbWUgfHwgZW50aXR5Lm5hbWUpO1xuICAgIH07XG5cbiAgICAkc2NvcGUuZmlsZUNsYXNzID0gKGVudGl0eSkgPT4ge1xuICAgICAgaWYgKGVudGl0eS5uYW1lLmhhcyhcIi5wcm9maWxlXCIpKSB7XG4gICAgICAgIHJldHVybiBcImdyZWVuXCI7XG4gICAgICB9XG4gICAgICByZXR1cm4gXCJcIjtcbiAgICB9O1xuXG4gICAgJHNjb3BlLmZpbGVJY29uSHRtbCA9IChlbnRpdHkpID0+IHtcbiAgICAgIHJldHVybiBXaWtpLmZpbGVJY29uSHRtbChlbnRpdHkpO1xuICAgIH07XG5cblxuICAgICRzY29wZS5mb3JtYXQgPSBXaWtpLmZpbGVGb3JtYXQoJHNjb3BlLnBhZ2VJZCwgZmlsZUV4dGVuc2lvblR5cGVSZWdpc3RyeSk7XG4gICAgdmFyIG9wdGlvbnMgPSB7XG4gICAgICByZWFkT25seTogdHJ1ZSxcbiAgICAgIG1vZGU6IHtcbiAgICAgICAgbmFtZTogJHNjb3BlLmZvcm1hdFxuICAgICAgfVxuICAgIH07XG4gICAgJHNjb3BlLmNvZGVNaXJyb3JPcHRpb25zID0gQ29kZUVkaXRvci5jcmVhdGVFZGl0b3JTZXR0aW5ncyhvcHRpb25zKTtcblxuICAgICRzY29wZS5lZGl0TGluayA9ICgpID0+IHtcbiAgICAgIHZhciBwYWdlTmFtZSA9ICgkc2NvcGUuZGlyZWN0b3J5KSA/ICRzY29wZS5yZWFkTWVQYXRoIDogJHNjb3BlLnBhZ2VJZDtcbiAgICAgIHJldHVybiAocGFnZU5hbWUpID8gV2lraS5lZGl0TGluaygkc2NvcGUsIHBhZ2VOYW1lLCAkbG9jYXRpb24pIDogbnVsbDtcbiAgICB9O1xuXG4gICAgJHNjb3BlLmJyYW5jaExpbmsgPSAoYnJhbmNoKSA9PiB7XG4gICAgICBpZiAoYnJhbmNoKSB7XG4gICAgICAgIHJldHVybiBXaWtpLmJyYW5jaExpbmsoYnJhbmNoLCAkc2NvcGUucGFnZUlkLCAkbG9jYXRpb24pO1xuICAgICAgfVxuICAgICAgcmV0dXJuIG51bGxcbiAgICB9O1xuXG4gICAgJHNjb3BlLmhpc3RvcnlMaW5rID0gXCIjL3dpa2lcIiArICgkc2NvcGUuYnJhbmNoID8gXCIvYnJhbmNoL1wiICsgJHNjb3BlLmJyYW5jaCA6IFwiXCIpICsgXCIvaGlzdG9yeS9cIiArICRzY29wZS5wYWdlSWQ7XG5cbiAgICAkc2NvcGUuJHdhdGNoKCd3b3Jrc3BhY2UudHJlZScsIGZ1bmN0aW9uICgpIHtcbiAgICAgIGlmICghJHNjb3BlLmdpdCkge1xuICAgICAgICAvLyBsZXRzIGRvIHRoaXMgYXN5bmNocm9ub3VzbHkgdG8gYXZvaWQgRXJyb3I6ICRkaWdlc3QgYWxyZWFkeSBpbiBwcm9ncmVzc1xuICAgICAgICAvL2xvZy5pbmZvKFwiUmVsb2FkaW5nIHZpZXcgYXMgdGhlIHRyZWUgY2hhbmdlZCBhbmQgd2UgaGF2ZSBhIGdpdCBtYmVhbiBub3dcIik7XG4gICAgICAgIHNldFRpbWVvdXQobWF5YmVVcGRhdGVWaWV3LCA1MCk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICAkc2NvcGUuJG9uKFwiJHJvdXRlQ2hhbmdlU3VjY2Vzc1wiLCBmdW5jdGlvbiAoZXZlbnQsIGN1cnJlbnQsIHByZXZpb3VzKSB7XG4gICAgICAvLyBsZXRzIGRvIHRoaXMgYXN5bmNocm9ub3VzbHkgdG8gYXZvaWQgRXJyb3I6ICRkaWdlc3QgYWxyZWFkeSBpbiBwcm9ncmVzc1xuICAgICAgLy9sb2cuaW5mbyhcIlJlbG9hZGluZyB2aWV3IGR1ZSB0byAkcm91dGVDaGFuZ2VTdWNjZXNzXCIpO1xuICAgICAgc2V0VGltZW91dChtYXliZVVwZGF0ZVZpZXcsIDUwKTtcbiAgICB9KTtcblxuXG4gICAgJHNjb3BlLm9wZW5EZWxldGVEaWFsb2cgPSAoKSA9PiB7XG4gICAgICBpZiAoJHNjb3BlLmdyaWRPcHRpb25zLnNlbGVjdGVkSXRlbXMubGVuZ3RoKSB7XG4gICAgICAgICRzY29wZS5zZWxlY3RlZEZpbGVIdG1sID0gXCI8dWw+XCIgKyAkc2NvcGUuZ3JpZE9wdGlvbnMuc2VsZWN0ZWRJdGVtcy5tYXAoZmlsZSA9PiBcIjxsaT5cIiArIGZpbGUubmFtZSArIFwiPC9saT5cIikuc29ydCgpLmpvaW4oXCJcIikgKyBcIjwvdWw+XCI7XG5cbiAgICAgICAgaWYgKCRzY29wZS5ncmlkT3B0aW9ucy5zZWxlY3RlZEl0ZW1zLmZpbmQoKGZpbGUpID0+IHsgcmV0dXJuIGZpbGUubmFtZS5lbmRzV2l0aChcIi5wcm9maWxlXCIpfSkpIHtcbiAgICAgICAgICAkc2NvcGUuZGVsZXRlV2FybmluZyA9IFwiWW91IGFyZSBhYm91dCB0byBkZWxldGUgZG9jdW1lbnQocykgd2hpY2ggcmVwcmVzZW50IEZhYnJpYzggcHJvZmlsZShzKS4gVGhpcyByZWFsbHkgY2FuJ3QgYmUgdW5kb25lISBXaWtpIG9wZXJhdGlvbnMgYXJlIGxvdyBsZXZlbCBhbmQgbWF5IGxlYWQgdG8gbm9uLWZ1bmN0aW9uYWwgc3RhdGUgb2YgRmFicmljLlwiO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICRzY29wZS5kZWxldGVXYXJuaW5nID0gbnVsbDtcbiAgICAgICAgfVxuXG4gICAgICAgICRzY29wZS5kZWxldGVEaWFsb2cgPSBXaWtpLmdldERlbGV0ZURpYWxvZygkZGlhbG9nLCA8V2lraS5EZWxldGVEaWFsb2dPcHRpb25zPntcbiAgICAgICAgICBjYWxsYmFja3M6ICgpID0+IHsgcmV0dXJuICRzY29wZS5kZWxldGVBbmRDbG9zZURpYWxvZzsgfSxcbiAgICAgICAgICBzZWxlY3RlZEZpbGVIdG1sOiAoKSA9PiAgeyByZXR1cm4gJHNjb3BlLnNlbGVjdGVkRmlsZUh0bWw7IH0sXG4gICAgICAgICAgd2FybmluZzogKCkgPT4geyByZXR1cm4gJHNjb3BlLmRlbGV0ZVdhcm5pbmc7IH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgJHNjb3BlLmRlbGV0ZURpYWxvZy5vcGVuKCk7XG5cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGxvZy5kZWJ1ZyhcIk5vIGl0ZW1zIHNlbGVjdGVkIHJpZ2h0IG5vdyEgXCIgKyAkc2NvcGUuZ3JpZE9wdGlvbnMuc2VsZWN0ZWRJdGVtcyk7XG4gICAgICB9XG4gICAgfTtcblxuICAgICRzY29wZS5kZWxldGVBbmRDbG9zZURpYWxvZyA9ICgpID0+IHtcbiAgICAgIHZhciBmaWxlcyA9ICRzY29wZS5ncmlkT3B0aW9ucy5zZWxlY3RlZEl0ZW1zO1xuICAgICAgdmFyIGZpbGVDb3VudCA9IGZpbGVzLmxlbmd0aDtcbiAgICAgIGxvZy5kZWJ1ZyhcIkRlbGV0aW5nIHNlbGVjdGlvbjogXCIgKyBmaWxlcyk7XG5cbiAgICAgIHZhciBwYXRoc1RvRGVsZXRlID0gW107XG4gICAgICBhbmd1bGFyLmZvckVhY2goZmlsZXMsIChmaWxlLCBpZHgpID0+IHtcbiAgICAgICAgdmFyIHBhdGggPSBVcmxIZWxwZXJzLmpvaW4oJHNjb3BlLnBhZ2VJZCwgZmlsZS5uYW1lKTtcbiAgICAgICAgcGF0aHNUb0RlbGV0ZS5wdXNoKHBhdGgpO1xuICAgICAgfSk7XG5cbiAgICAgIGxvZy5kZWJ1ZyhcIkFib3V0IHRvIGRlbGV0ZSBcIiArIHBhdGhzVG9EZWxldGUpO1xuICAgICAgJHNjb3BlLmdpdCA9IHdpa2lSZXBvc2l0b3J5LnJlbW92ZVBhZ2VzKCRzY29wZS5icmFuY2gsIHBhdGhzVG9EZWxldGUsIG51bGwsIChyZXN1bHQpID0+IHtcbiAgICAgICAgJHNjb3BlLmdyaWRPcHRpb25zLnNlbGVjdGVkSXRlbXMgPSBbXTtcbiAgICAgICAgdmFyIG1lc3NhZ2UgPSBDb3JlLm1heWJlUGx1cmFsKGZpbGVDb3VudCwgXCJkb2N1bWVudFwiKTtcbiAgICAgICAgQ29yZS5ub3RpZmljYXRpb24oXCJzdWNjZXNzXCIsIFwiRGVsZXRlZCBcIiArIG1lc3NhZ2UpO1xuICAgICAgICBDb3JlLiRhcHBseSgkc2NvcGUpO1xuICAgICAgICB1cGRhdGVWaWV3KCk7XG4gICAgICB9KTtcbiAgICAgICRzY29wZS5kZWxldGVEaWFsb2cuY2xvc2UoKTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLiR3YXRjaChcInJlbmFtZS5uZXdGaWxlTmFtZVwiLCAoKSA9PiB7XG4gICAgICAvLyBpZ25vcmUgZXJyb3JzIGlmIHRoZSBmaWxlIGlzIHRoZSBzYW1lIGFzIHRoZSByZW5hbWUgZmlsZSFcbiAgICAgIHZhciBwYXRoID0gZ2V0UmVuYW1lRmlsZVBhdGgoKTtcbiAgICAgIGlmICgkc2NvcGUub3JpZ2luYWxSZW5hbWVGaWxlUGF0aCA9PT0gcGF0aCkge1xuICAgICAgICAkc2NvcGUuZmlsZUV4aXN0cyA9IHsgZXhpc3RzOiBmYWxzZSwgbmFtZTogbnVsbCB9O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY2hlY2tGaWxlRXhpc3RzKHBhdGgpO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgJHNjb3BlLnJlbmFtZUFuZENsb3NlRGlhbG9nID0gKCkgPT4ge1xuICAgICAgaWYgKCRzY29wZS5ncmlkT3B0aW9ucy5zZWxlY3RlZEl0ZW1zLmxlbmd0aCkge1xuICAgICAgICB2YXIgc2VsZWN0ZWQgPSAkc2NvcGUuZ3JpZE9wdGlvbnMuc2VsZWN0ZWRJdGVtc1swXTtcbiAgICAgICAgdmFyIG5ld1BhdGggPSBnZXRSZW5hbWVGaWxlUGF0aCgpO1xuICAgICAgICBpZiAoc2VsZWN0ZWQgJiYgbmV3UGF0aCkge1xuICAgICAgICAgIHZhciBvbGROYW1lID0gc2VsZWN0ZWQubmFtZTtcbiAgICAgICAgICB2YXIgbmV3TmFtZSA9IFdpa2kuZmlsZU5hbWUobmV3UGF0aCk7XG4gICAgICAgICAgdmFyIG9sZFBhdGggPSBVcmxIZWxwZXJzLmpvaW4oJHNjb3BlLnBhZ2VJZCwgb2xkTmFtZSk7XG4gICAgICAgICAgbG9nLmRlYnVnKFwiQWJvdXQgdG8gcmVuYW1lIGZpbGUgXCIgKyBvbGRQYXRoICsgXCIgdG8gXCIgKyBuZXdQYXRoKTtcbiAgICAgICAgICAkc2NvcGUuZ2l0ID0gd2lraVJlcG9zaXRvcnkucmVuYW1lKCRzY29wZS5icmFuY2gsIG9sZFBhdGgsIG5ld1BhdGgsIG51bGwsIChyZXN1bHQpID0+IHtcbiAgICAgICAgICAgIENvcmUubm90aWZpY2F0aW9uKFwic3VjY2Vzc1wiLCBcIlJlbmFtZWQgZmlsZSB0byAgXCIgKyBuZXdOYW1lKTtcbiAgICAgICAgICAgICRzY29wZS5ncmlkT3B0aW9ucy5zZWxlY3RlZEl0ZW1zLnNwbGljZSgwLCAxKTtcbiAgICAgICAgICAgICRzY29wZS5yZW5hbWVEaWFsb2cuY2xvc2UoKTtcbiAgICAgICAgICAgIENvcmUuJGFwcGx5KCRzY29wZSk7XG4gICAgICAgICAgICB1cGRhdGVWaWV3KCk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgICRzY29wZS5yZW5hbWVEaWFsb2cuY2xvc2UoKTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLm9wZW5SZW5hbWVEaWFsb2cgPSAoKSA9PiB7XG4gICAgICB2YXIgbmFtZSA9IG51bGw7XG4gICAgICBpZiAoJHNjb3BlLmdyaWRPcHRpb25zLnNlbGVjdGVkSXRlbXMubGVuZ3RoKSB7XG4gICAgICAgIHZhciBzZWxlY3RlZCA9ICRzY29wZS5ncmlkT3B0aW9ucy5zZWxlY3RlZEl0ZW1zWzBdO1xuICAgICAgICBuYW1lID0gc2VsZWN0ZWQubmFtZTtcbiAgICAgIH1cbiAgICAgIGlmIChuYW1lKSB7XG4gICAgICAgICRzY29wZS5yZW5hbWUubmV3RmlsZU5hbWUgPSBuYW1lO1xuICAgICAgICAkc2NvcGUub3JpZ2luYWxSZW5hbWVGaWxlUGF0aCA9IGdldFJlbmFtZUZpbGVQYXRoKCk7XG5cbiAgICAgICAgJHNjb3BlLnJlbmFtZURpYWxvZyA9IFdpa2kuZ2V0UmVuYW1lRGlhbG9nKCRkaWFsb2csIDxXaWtpLlJlbmFtZURpYWxvZ09wdGlvbnM+e1xuICAgICAgICAgIHJlbmFtZTogKCkgPT4geyAgcmV0dXJuICRzY29wZS5yZW5hbWU7IH0sXG4gICAgICAgICAgZmlsZUV4aXN0czogKCkgPT4geyByZXR1cm4gJHNjb3BlLmZpbGVFeGlzdHM7IH0sXG4gICAgICAgICAgZmlsZU5hbWU6ICgpID0+IHsgcmV0dXJuICRzY29wZS5maWxlTmFtZTsgfSxcbiAgICAgICAgICBjYWxsYmFja3M6ICgpID0+IHsgcmV0dXJuICRzY29wZS5yZW5hbWVBbmRDbG9zZURpYWxvZzsgfVxuICAgICAgICB9KTtcblxuICAgICAgICAkc2NvcGUucmVuYW1lRGlhbG9nLm9wZW4oKTtcblxuICAgICAgICAkdGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgJCgnI3JlbmFtZUZpbGVOYW1lJykuZm9jdXMoKTtcbiAgICAgICAgfSwgNTApO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbG9nLmRlYnVnKFwiTm8gaXRlbXMgc2VsZWN0ZWQgcmlnaHQgbm93ISBcIiArICRzY29wZS5ncmlkT3B0aW9ucy5zZWxlY3RlZEl0ZW1zKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgJHNjb3BlLm1vdmVBbmRDbG9zZURpYWxvZyA9ICgpID0+IHtcbiAgICAgIHZhciBmaWxlcyA9ICRzY29wZS5ncmlkT3B0aW9ucy5zZWxlY3RlZEl0ZW1zO1xuICAgICAgdmFyIGZpbGVDb3VudCA9IGZpbGVzLmxlbmd0aDtcbiAgICAgIHZhciBtb3ZlRm9sZGVyID0gJHNjb3BlLm1vdmUubW92ZUZvbGRlcjtcbiAgICAgIHZhciBvbGRGb2xkZXI6c3RyaW5nID0gJHNjb3BlLnBhZ2VJZDtcbiAgICAgIGlmIChtb3ZlRm9sZGVyICYmIGZpbGVDb3VudCAmJiBtb3ZlRm9sZGVyICE9PSBvbGRGb2xkZXIpIHtcbiAgICAgICAgbG9nLmRlYnVnKFwiTW92aW5nIFwiICsgZmlsZUNvdW50ICsgXCIgZmlsZShzKSB0byBcIiArIG1vdmVGb2xkZXIpO1xuICAgICAgICBhbmd1bGFyLmZvckVhY2goZmlsZXMsIChmaWxlLCBpZHgpID0+IHtcbiAgICAgICAgICB2YXIgb2xkUGF0aCA9IG9sZEZvbGRlciArIFwiL1wiICsgZmlsZS5uYW1lO1xuICAgICAgICAgIHZhciBuZXdQYXRoID0gbW92ZUZvbGRlciArIFwiL1wiICsgZmlsZS5uYW1lO1xuICAgICAgICAgIGxvZy5kZWJ1ZyhcIkFib3V0IHRvIG1vdmUgXCIgKyBvbGRQYXRoICsgXCIgdG8gXCIgKyBuZXdQYXRoKTtcbiAgICAgICAgICAkc2NvcGUuZ2l0ID0gd2lraVJlcG9zaXRvcnkucmVuYW1lKCRzY29wZS5icmFuY2gsIG9sZFBhdGgsIG5ld1BhdGgsIG51bGwsIChyZXN1bHQpID0+IHtcbiAgICAgICAgICAgIGlmIChpZHggKyAxID09PSBmaWxlQ291bnQpIHtcbiAgICAgICAgICAgICAgJHNjb3BlLmdyaWRPcHRpb25zLnNlbGVjdGVkSXRlbXMuc3BsaWNlKDAsIGZpbGVDb3VudCk7XG4gICAgICAgICAgICAgIHZhciBtZXNzYWdlID0gQ29yZS5tYXliZVBsdXJhbChmaWxlQ291bnQsIFwiZG9jdW1lbnRcIik7XG4gICAgICAgICAgICAgIENvcmUubm90aWZpY2F0aW9uKFwic3VjY2Vzc1wiLCBcIk1vdmVkIFwiICsgbWVzc2FnZSArIFwiIHRvIFwiICsgbmV3UGF0aCk7XG4gICAgICAgICAgICAgICRzY29wZS5tb3ZlRGlhbG9nLmNsb3NlKCk7XG4gICAgICAgICAgICAgIENvcmUuJGFwcGx5KCRzY29wZSk7XG4gICAgICAgICAgICAgIHVwZGF0ZVZpZXcoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgICAkc2NvcGUubW92ZURpYWxvZy5jbG9zZSgpO1xuICAgIH07XG5cbiAgICAkc2NvcGUuZm9sZGVyTmFtZXMgPSAodGV4dCkgPT4ge1xuICAgICAgcmV0dXJuIHdpa2lSZXBvc2l0b3J5LmNvbXBsZXRlUGF0aCgkc2NvcGUuYnJhbmNoLCB0ZXh0LCB0cnVlLCBudWxsKTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLm9wZW5Nb3ZlRGlhbG9nID0gKCkgPT4ge1xuICAgICAgaWYgKCRzY29wZS5ncmlkT3B0aW9ucy5zZWxlY3RlZEl0ZW1zLmxlbmd0aCkge1xuICAgICAgICAkc2NvcGUubW92ZS5tb3ZlRm9sZGVyID0gJHNjb3BlLnBhZ2VJZDtcblxuICAgICAgICAkc2NvcGUubW92ZURpYWxvZyA9IFdpa2kuZ2V0TW92ZURpYWxvZygkZGlhbG9nLCA8V2lraS5Nb3ZlRGlhbG9nT3B0aW9ucz57XG4gICAgICAgICAgbW92ZTogKCkgPT4geyAgcmV0dXJuICRzY29wZS5tb3ZlOyB9LFxuICAgICAgICAgIGZvbGRlck5hbWVzOiAoKSA9PiB7IHJldHVybiAkc2NvcGUuZm9sZGVyTmFtZXM7IH0sXG4gICAgICAgICAgY2FsbGJhY2tzOiAoKSA9PiB7IHJldHVybiAkc2NvcGUubW92ZUFuZENsb3NlRGlhbG9nOyB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgICRzY29wZS5tb3ZlRGlhbG9nLm9wZW4oKTtcblxuICAgICAgICAkdGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgJCgnI21vdmVGb2xkZXInKS5mb2N1cygpO1xuICAgICAgICB9LCA1MCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBsb2cuZGVidWcoXCJObyBpdGVtcyBzZWxlY3RlZCByaWdodCBub3chIFwiICsgJHNjb3BlLmdyaWRPcHRpb25zLnNlbGVjdGVkSXRlbXMpO1xuICAgICAgfVxuICAgIH07XG5cblxuICAgIHNldFRpbWVvdXQobWF5YmVVcGRhdGVWaWV3LCA1MCk7XG5cbiAgICBmdW5jdGlvbiBpc0RpZmZWaWV3KCkge1xuICAgICAgcmV0dXJuICRyb3V0ZVBhcmFtc1tcImRpZmZPYmplY3RJZDFcIl0gfHwgJHJvdXRlUGFyYW1zW1wiZGlmZk9iamVjdElkMlwiXSA/IHRydWUgOiBmYWxzZVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHVwZGF0ZVZpZXcoKSB7XG4gICAgICAgIC8vIFRPRE8gcmVtb3ZlIVxuICAgICAgICB2YXIgam9sb2tpYSA9IG51bGw7XG5cblxuICAgICAgaWYgKGlzRGlmZlZpZXcoKSkge1xuICAgICAgICB2YXIgYmFzZU9iamVjdElkID0gJHJvdXRlUGFyYW1zW1wiZGlmZk9iamVjdElkMlwiXTtcbiAgICAgICAgJHNjb3BlLmdpdCA9IHdpa2lSZXBvc2l0b3J5LmRpZmYoJHNjb3BlLm9iamVjdElkLCBiYXNlT2JqZWN0SWQsICRzY29wZS5wYWdlSWQsIG9uRmlsZURldGFpbHMpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgJHNjb3BlLmdpdCA9IHdpa2lSZXBvc2l0b3J5LmdldFBhZ2UoJHNjb3BlLmJyYW5jaCwgJHNjb3BlLnBhZ2VJZCwgJHNjb3BlLm9iamVjdElkLCBvbkZpbGVEZXRhaWxzKTtcbiAgICAgIH1cbiAgICAgIFdpa2kubG9hZEJyYW5jaGVzKGpvbG9raWEsIHdpa2lSZXBvc2l0b3J5LCAkc2NvcGUsIGlzRm1jKTtcbiAgICB9XG5cbiAgICAkc2NvcGUudXBkYXRlVmlldyA9IHVwZGF0ZVZpZXc7XG5cbiAgICBmdW5jdGlvbiB2aWV3Q29udGVudHMocGFnZU5hbWUsIGNvbnRlbnRzKSB7XG4gICAgICAkc2NvcGUuc291cmNlVmlldyA9IG51bGw7XG5cbiAgICAgIHZhciBmb3JtYXQ6c3RyaW5nID0gbnVsbDtcbiAgICAgIGlmIChpc0RpZmZWaWV3KCkpIHtcbiAgICAgICAgZm9ybWF0ID0gXCJkaWZmXCI7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBmb3JtYXQgPSBXaWtpLmZpbGVGb3JtYXQocGFnZU5hbWUsIGZpbGVFeHRlbnNpb25UeXBlUmVnaXN0cnkpIHx8ICRzY29wZS5mb3JtYXQ7XG4gICAgICB9XG4gICAgICBsb2cuZGVidWcoXCJGaWxlIGZvcm1hdDogXCIsIGZvcm1hdCk7XG4gICAgICBzd2l0Y2ggKGZvcm1hdCkge1xuICAgICAgICBjYXNlIFwiaW1hZ2VcIjpcbiAgICAgICAgICB2YXIgaW1hZ2VVUkwgPSAnZ2l0LycgKyAkc2NvcGUuYnJhbmNoO1xuICAgICAgICAgIGxvZy5kZWJ1ZyhcIiRzY29wZTogXCIsICRzY29wZSk7XG4gICAgICAgICAgaW1hZ2VVUkwgPSBVcmxIZWxwZXJzLmpvaW4oaW1hZ2VVUkwsICRzY29wZS5wYWdlSWQpO1xuICAgICAgICAgIHZhciBpbnRlcnBvbGF0ZUZ1bmMgPSAkaW50ZXJwb2xhdGUoJHRlbXBsYXRlQ2FjaGUuZ2V0KFwiaW1hZ2VUZW1wbGF0ZS5odG1sXCIpKTtcbiAgICAgICAgICAkc2NvcGUuaHRtbCA9IGludGVycG9sYXRlRnVuYyh7XG4gICAgICAgICAgICBpbWFnZVVSTDogaW1hZ2VVUkxcbiAgICAgICAgICB9KTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSBcIm1hcmtkb3duXCI6XG4gICAgICAgICAgJHNjb3BlLmh0bWwgPSBjb250ZW50cyA/IG1hcmtlZChjb250ZW50cykgOiBcIlwiO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIFwiamF2YXNjcmlwdFwiOlxuICAgICAgICAgIHZhciBmb3JtID0gbnVsbDtcbiAgICAgICAgICBmb3JtID0gJGxvY2F0aW9uLnNlYXJjaCgpW1wiZm9ybVwiXTtcbiAgICAgICAgICAkc2NvcGUuc291cmNlID0gY29udGVudHM7XG4gICAgICAgICAgJHNjb3BlLmZvcm0gPSBmb3JtO1xuICAgICAgICAgIGlmIChmb3JtKSB7XG4gICAgICAgICAgICAvLyBub3cgbGV0cyB0cnkgbG9hZCB0aGUgZm9ybSBKU09OIHNvIHdlIGNhbiB0aGVuIHJlbmRlciB0aGUgZm9ybVxuICAgICAgICAgICAgJHNjb3BlLnNvdXJjZVZpZXcgPSBudWxsO1xuICAgICAgICAgICAgJHNjb3BlLmdpdCA9IHdpa2lSZXBvc2l0b3J5LmdldFBhZ2UoJHNjb3BlLmJyYW5jaCwgZm9ybSwgJHNjb3BlLm9iamVjdElkLCAoZGV0YWlscykgPT4ge1xuICAgICAgICAgICAgICBvbkZvcm1TY2hlbWEoV2lraS5wYXJzZUpzb24oZGV0YWlscy50ZXh0KSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgJHNjb3BlLnNvdXJjZVZpZXcgPSBcInBsdWdpbnMvd2lraS9odG1sL3NvdXJjZVZpZXcuaHRtbFwiO1xuICAgICAgICAgIH1cbiAgICAgICAgICBicmVhaztcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAkc2NvcGUuaHRtbCA9IG51bGw7XG4gICAgICAgICAgJHNjb3BlLnNvdXJjZSA9IGNvbnRlbnRzO1xuICAgICAgICAgICRzY29wZS5zb3VyY2VWaWV3ID0gXCJwbHVnaW5zL3dpa2kvaHRtbC9zb3VyY2VWaWV3Lmh0bWxcIjtcbiAgICAgIH1cbiAgICAgIENvcmUuJGFwcGx5KCRzY29wZSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gb25Gb3JtU2NoZW1hKGpzb24pIHtcbiAgICAgICRzY29wZS5mb3JtRGVmaW5pdGlvbiA9IGpzb247XG4gICAgICBpZiAoJHNjb3BlLnNvdXJjZSkge1xuICAgICAgICAkc2NvcGUuZm9ybUVudGl0eSA9IFdpa2kucGFyc2VKc29uKCRzY29wZS5zb3VyY2UpO1xuICAgICAgfVxuICAgICAgJHNjb3BlLnNvdXJjZVZpZXcgPSBcInBsdWdpbnMvd2lraS9odG1sL2Zvcm1WaWV3Lmh0bWxcIjtcbiAgICAgIENvcmUuJGFwcGx5KCRzY29wZSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gb25GaWxlRGV0YWlscyhkZXRhaWxzKSB7XG4gICAgICB2YXIgY29udGVudHMgPSBkZXRhaWxzLnRleHQ7XG4gICAgICAkc2NvcGUuZGlyZWN0b3J5ID0gZGV0YWlscy5kaXJlY3Rvcnk7XG4gICAgICAkc2NvcGUuZmlsZURldGFpbHMgPSBkZXRhaWxzO1xuXG4gICAgICBpZiAoZGV0YWlscyAmJiBkZXRhaWxzLmZvcm1hdCkge1xuICAgICAgICAkc2NvcGUuZm9ybWF0ID0gZGV0YWlscy5mb3JtYXQ7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAkc2NvcGUuZm9ybWF0ID0gV2lraS5maWxlRm9ybWF0KCRzY29wZS5wYWdlSWQsIGZpbGVFeHRlbnNpb25UeXBlUmVnaXN0cnkpO1xuICAgICAgfVxuICAgICAgJHNjb3BlLmNvZGVNaXJyb3JPcHRpb25zLm1vZGUubmFtZSA9ICRzY29wZS5mb3JtYXQ7XG4gICAgICAkc2NvcGUuY2hpbGRyZW4gPSBudWxsO1xuXG4gICAgICBpZiAoZGV0YWlscy5kaXJlY3RvcnkpIHtcbiAgICAgICAgdmFyIGRpcmVjdG9yaWVzID0gZGV0YWlscy5jaGlsZHJlbi5maWx0ZXIoKGRpcikgPT4ge1xuICAgICAgICAgIHJldHVybiBkaXIuZGlyZWN0b3J5O1xuICAgICAgICB9KTtcbiAgICAgICAgdmFyIHByb2ZpbGVzID0gZGV0YWlscy5jaGlsZHJlbi5maWx0ZXIoKGRpcikgPT4ge1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfSk7XG4gICAgICAgIHZhciBmaWxlcyA9IGRldGFpbHMuY2hpbGRyZW4uZmlsdGVyKChmaWxlKSA9PiB7XG4gICAgICAgICAgcmV0dXJuICFmaWxlLmRpcmVjdG9yeTtcbiAgICAgICAgfSk7XG4gICAgICAgIGRpcmVjdG9yaWVzID0gZGlyZWN0b3JpZXMuc29ydEJ5KChkaXIpID0+IHtcbiAgICAgICAgICByZXR1cm4gZGlyLm5hbWU7XG4gICAgICAgIH0pO1xuICAgICAgICBwcm9maWxlcyA9IHByb2ZpbGVzLnNvcnRCeSgoZGlyKSA9PiB7XG4gICAgICAgICAgcmV0dXJuIGRpci5uYW1lO1xuICAgICAgICB9KTtcbiAgICAgICAgZmlsZXMgPSBmaWxlcy5zb3J0QnkoKGZpbGUpID0+IHtcbiAgICAgICAgICByZXR1cm4gZmlsZS5uYW1lO1xuICAgICAgICB9KVxuICAgICAgICAgIC5zb3J0QnkoKGZpbGUpID0+IHtcbiAgICAgICAgICAgIHJldHVybiBmaWxlLm5hbWUuc3BsaXQoJy4nKS5sYXN0KCk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIC8vIEFsc28gZW5yaWNoIHRoZSByZXNwb25zZSB3aXRoIHRoZSBjdXJyZW50IGJyYW5jaCwgYXMgdGhhdCdzIHBhcnQgb2YgdGhlIGNvb3JkaW5hdGUgZm9yIGxvY2F0aW5nIHRoZSBhY3R1YWwgZmlsZSBpbiBnaXRcbiAgICAgICAgJHNjb3BlLmNoaWxkcmVuID0gKDxhbnk+QXJyYXkpLmNyZWF0ZShkaXJlY3RvcmllcywgcHJvZmlsZXMsIGZpbGVzKS5tYXAoKGZpbGUpID0+IHtcbiAgICAgICAgICBmaWxlLmJyYW5jaCA9ICRzY29wZS5icmFuY2g7XG4gICAgICAgICAgZmlsZS5maWxlTmFtZSA9IGZpbGUubmFtZTtcbiAgICAgICAgICBpZiAoZmlsZS5kaXJlY3RvcnkpIHtcbiAgICAgICAgICAgIGZpbGUuZmlsZU5hbWUgKz0gXCIuemlwXCI7XG4gICAgICAgICAgfVxuICAgICAgICAgIGZpbGUuZG93bmxvYWRVUkwgPSBXaWtpLmdpdFJlc3RVUkwoJHNjb3BlLCBmaWxlLnBhdGgpO1xuICAgICAgICAgIHJldHVybiBmaWxlO1xuICAgICAgICB9KTtcbiAgICAgIH1cblxuXG4gICAgICAkc2NvcGUuaHRtbCA9IG51bGw7XG4gICAgICAkc2NvcGUuc291cmNlID0gbnVsbDtcbiAgICAgICRzY29wZS5yZWFkTWVQYXRoID0gbnVsbDtcblxuICAgICAgJHNjb3BlLmlzRmlsZSA9IGZhbHNlO1xuICAgICAgaWYgKCRzY29wZS5jaGlsZHJlbikge1xuICAgICAgICAkc2NvcGUuJGJyb2FkY2FzdCgncGFuZS5vcGVuJyk7XG4gICAgICAgIC8vIGlmIHdlIGhhdmUgYSByZWFkbWUgdGhlbiBsZXRzIHJlbmRlciBpdC4uLlxuICAgICAgICB2YXIgaXRlbSA9ICRzY29wZS5jaGlsZHJlbi5maW5kKChpbmZvKSA9PiB7XG4gICAgICAgICAgdmFyIG5hbWUgPSAoaW5mby5uYW1lIHx8IFwiXCIpLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgICAgdmFyIGV4dCA9IGZpbGVFeHRlbnNpb24obmFtZSk7XG4gICAgICAgICAgcmV0dXJuIG5hbWUgJiYgZXh0ICYmICgobmFtZS5zdGFydHNXaXRoKFwicmVhZG1lLlwiKSB8fCBuYW1lID09PSBcInJlYWRtZVwiKSB8fCAobmFtZS5zdGFydHNXaXRoKFwiaW5kZXguXCIpIHx8IG5hbWUgPT09IFwiaW5kZXhcIikpO1xuICAgICAgICB9KTtcbiAgICAgICAgaWYgKGl0ZW0pIHtcbiAgICAgICAgICB2YXIgcGFnZU5hbWUgPSBpdGVtLnBhdGg7XG4gICAgICAgICAgJHNjb3BlLnJlYWRNZVBhdGggPSBwYWdlTmFtZTtcbiAgICAgICAgICB3aWtpUmVwb3NpdG9yeS5nZXRQYWdlKCRzY29wZS5icmFuY2gsIHBhZ2VOYW1lLCAkc2NvcGUub2JqZWN0SWQsIChyZWFkbWVEZXRhaWxzKSA9PiB7XG4gICAgICAgICAgICB2aWV3Q29udGVudHMocGFnZU5hbWUsIHJlYWRtZURldGFpbHMudGV4dCk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGt1YmVybmV0ZXNKc29uID0gJHNjb3BlLmNoaWxkcmVuLmZpbmQoKGNoaWxkKSA9PiB7XG4gICAgICAgICAgdmFyIG5hbWUgPSAoY2hpbGQubmFtZSB8fCBcIlwiKS50b0xvd2VyQ2FzZSgpO1xuICAgICAgICAgIHZhciBleHQgPSBmaWxlRXh0ZW5zaW9uKG5hbWUpO1xuICAgICAgICAgIHJldHVybiBuYW1lICYmIGV4dCAmJiBuYW1lLnN0YXJ0c1dpdGgoXCJrdWJlcm5ldGVzXCIpICYmIGV4dCA9PT0gXCJqc29uXCI7XG4gICAgICAgIH0pO1xuICAgICAgICBpZiAoa3ViZXJuZXRlc0pzb24pIHtcbiAgICAgICAgICB3aWtpUmVwb3NpdG9yeS5nZXRQYWdlKCRzY29wZS5icmFuY2gsIGt1YmVybmV0ZXNKc29uLnBhdGgsIHVuZGVmaW5lZCwgKGpzb24pID0+IHtcbiAgICAgICAgICAgIGlmIChqc29uICYmIGpzb24udGV4dCkge1xuICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICRzY29wZS5rdWJlcm5ldGVzSnNvbiA9IGFuZ3VsYXIuZnJvbUpzb24oanNvbi50ZXh0KTtcbiAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgICRzY29wZS5rdWJlcm5ldGVzSnNvbiA9IHtcbiAgICAgICAgICAgICAgICAgIGVycm9yUGFyc2luZzogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgIGVycm9yOiBlXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAkc2NvcGUuc2hvd0FwcEhlYWRlciA9IHRydWU7XG4gICAgICAgICAgICAgIENvcmUuJGFwcGx5KCRzY29wZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgJHNjb3BlLiRicm9hZGNhc3QoJ1dpa2kuVmlld1BhZ2UuQ2hpbGRyZW4nLCAkc2NvcGUucGFnZUlkLCAkc2NvcGUuY2hpbGRyZW4pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgJHNjb3BlLiRicm9hZGNhc3QoJ3BhbmUuY2xvc2UnKTtcbiAgICAgICAgdmFyIHBhZ2VOYW1lID0gJHNjb3BlLnBhZ2VJZDtcbiAgICAgICAgdmlld0NvbnRlbnRzKHBhZ2VOYW1lLCBjb250ZW50cyk7XG4gICAgICAgICRzY29wZS5pc0ZpbGUgPSB0cnVlO1xuICAgICAgfVxuICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjaGVja0ZpbGVFeGlzdHMocGF0aCkge1xuICAgICAgJHNjb3BlLm9wZXJhdGlvbkNvdW50ZXIgKz0gMTtcbiAgICAgIHZhciBjb3VudGVyID0gJHNjb3BlLm9wZXJhdGlvbkNvdW50ZXI7XG4gICAgICBpZiAocGF0aCkge1xuICAgICAgICB3aWtpUmVwb3NpdG9yeS5leGlzdHMoJHNjb3BlLmJyYW5jaCwgcGF0aCwgKHJlc3VsdCkgPT4ge1xuICAgICAgICAgIC8vIGZpbHRlciBvbGQgcmVzdWx0c1xuICAgICAgICAgIGlmICgkc2NvcGUub3BlcmF0aW9uQ291bnRlciA9PT0gY291bnRlcikge1xuICAgICAgICAgICAgbG9nLmRlYnVnKFwiY2hlY2tGaWxlRXhpc3RzIGZvciBwYXRoIFwiICsgcGF0aCArIFwiIGdvdCByZXN1bHQgXCIgKyByZXN1bHQpO1xuICAgICAgICAgICAgJHNjb3BlLmZpbGVFeGlzdHMuZXhpc3RzID0gcmVzdWx0ID8gdHJ1ZSA6IGZhbHNlO1xuICAgICAgICAgICAgJHNjb3BlLmZpbGVFeGlzdHMubmFtZSA9IHJlc3VsdCA/IHJlc3VsdC5uYW1lIDogbnVsbDtcbiAgICAgICAgICAgIENvcmUuJGFwcGx5KCRzY29wZSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIGxvZy5kZWJ1ZyhcIklnbm9yaW5nIG9sZCByZXN1bHRzIGZvciBcIiArIHBhdGgpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gQ2FsbGVkIGJ5IGhhd3RpbyBUT0MgZGlyZWN0aXZlLi4uXG4gICAgJHNjb3BlLmdldENvbnRlbnRzID0gKGZpbGVuYW1lLCBjYikgPT4ge1xuICAgICAgdmFyIHBhZ2VJZCA9IGZpbGVuYW1lO1xuICAgICAgaWYgKCRzY29wZS5kaXJlY3RvcnkpIHtcbiAgICAgICAgcGFnZUlkID0gJHNjb3BlLnBhZ2VJZCArICcvJyArIGZpbGVuYW1lO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIHBhdGhQYXJ0cyA9ICRzY29wZS5wYWdlSWQuc3BsaXQoJy8nKTtcbiAgICAgICAgcGF0aFBhcnRzID0gcGF0aFBhcnRzLnJlbW92ZShwYXRoUGFydHMubGFzdCgpKTtcbiAgICAgICAgcGF0aFBhcnRzLnB1c2goZmlsZW5hbWUpO1xuICAgICAgICBwYWdlSWQgPSBwYXRoUGFydHMuam9pbignLycpO1xuICAgICAgfVxuICAgICAgbG9nLmRlYnVnKFwicGFnZUlkOiBcIiwgJHNjb3BlLnBhZ2VJZCk7XG4gICAgICBsb2cuZGVidWcoXCJicmFuY2g6IFwiLCAkc2NvcGUuYnJhbmNoKTtcbiAgICAgIGxvZy5kZWJ1ZyhcImZpbGVuYW1lOiBcIiwgZmlsZW5hbWUpO1xuICAgICAgbG9nLmRlYnVnKFwidXNpbmcgcGFnZUlkOiBcIiwgcGFnZUlkKTtcbiAgICAgIHdpa2lSZXBvc2l0b3J5LmdldFBhZ2UoJHNjb3BlLmJyYW5jaCwgcGFnZUlkLCB1bmRlZmluZWQsIChkYXRhKSA9PiB7XG4gICAgICAgIGNiKGRhdGEudGV4dCk7XG4gICAgICB9KTtcbiAgICB9O1xuXG5cbiAgICBmdW5jdGlvbiBnZXRSZW5hbWVGaWxlUGF0aCgpIHtcbiAgICAgIHZhciBuZXdGaWxlTmFtZSA9ICRzY29wZS5yZW5hbWUubmV3RmlsZU5hbWU7XG4gICAgICByZXR1cm4gKCRzY29wZS5wYWdlSWQgJiYgbmV3RmlsZU5hbWUpID8gVXJsSGVscGVycy5qb2luKCRzY29wZS5wYWdlSWQsIG5ld0ZpbGVOYW1lKSA6IG51bGw7XG4gICAgfVxuICB9XSk7XG59XG4iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vaW5jbHVkZXMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwid2lraUhlbHBlcnMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwid2lraVBsdWdpbi50c1wiLz5cblxubW9kdWxlIFdpa2kge1xuXG4gIGV4cG9ydCBpbnRlcmZhY2UgV2lraURpYWxvZyB7XG4gICAgb3BlbjogKCkgPT4ge307XG4gICAgY2xvc2U6ICgpID0+IHt9O1xuICB9XG5cbiAgZXhwb3J0IGludGVyZmFjZSBSZW5hbWVEaWFsb2dPcHRpb25zIHtcbiAgICByZW5hbWU6ICgpID0+IHt9O1xuICAgIGZpbGVFeGlzdHM6ICgpID0+IHt9O1xuICAgIGZpbGVOYW1lOiAoKSA9PiBTdHJpbmc7XG4gICAgY2FsbGJhY2tzOiAoKSA9PiBTdHJpbmc7XG4gIH1cblxuICBleHBvcnQgZnVuY3Rpb24gZ2V0UmVuYW1lRGlhbG9nKCRkaWFsb2csICRzY29wZTpSZW5hbWVEaWFsb2dPcHRpb25zKTpXaWtpLldpa2lEaWFsb2cge1xuICAgIHJldHVybiAkZGlhbG9nLmRpYWxvZyh7XG4gICAgICByZXNvbHZlOiAkc2NvcGUsXG4gICAgICB0ZW1wbGF0ZVVybDogJ3BsdWdpbnMvd2lraS9odG1sL21vZGFsL3JlbmFtZURpYWxvZy5odG1sJyxcbiAgICAgIGNvbnRyb2xsZXI6IFtcIiRzY29wZVwiLCBcImRpYWxvZ1wiLCAgXCJjYWxsYmFja3NcIiwgXCJyZW5hbWVcIiwgXCJmaWxlRXhpc3RzXCIsIFwiZmlsZU5hbWVcIiwgKCRzY29wZSwgZGlhbG9nLCBjYWxsYmFja3MsIHJlbmFtZSwgZmlsZUV4aXN0cywgZmlsZU5hbWUpID0+IHtcbiAgICAgICAgJHNjb3BlLnJlbmFtZSAgPSByZW5hbWU7XG4gICAgICAgICRzY29wZS5maWxlRXhpc3RzICA9IGZpbGVFeGlzdHM7XG4gICAgICAgICRzY29wZS5maWxlTmFtZSAgPSBmaWxlTmFtZTtcblxuICAgICAgICAkc2NvcGUuY2xvc2UgPSAocmVzdWx0KSA9PiB7XG4gICAgICAgICAgZGlhbG9nLmNsb3NlKCk7XG4gICAgICAgIH07XG5cbiAgICAgICAgJHNjb3BlLnJlbmFtZUFuZENsb3NlRGlhbG9nID0gY2FsbGJhY2tzO1xuXG4gICAgICB9XVxuICAgIH0pO1xuICB9XG5cbiAgZXhwb3J0IGludGVyZmFjZSBNb3ZlRGlhbG9nT3B0aW9ucyB7XG4gICAgbW92ZTogKCkgPT4ge307XG4gICAgZm9sZGVyTmFtZXM6ICgpID0+IHt9O1xuICAgIGNhbGxiYWNrczogKCkgPT4gU3RyaW5nO1xuICB9XG5cblxuICBleHBvcnQgZnVuY3Rpb24gZ2V0TW92ZURpYWxvZygkZGlhbG9nLCAkc2NvcGU6TW92ZURpYWxvZ09wdGlvbnMpOldpa2kuV2lraURpYWxvZyB7XG4gICAgcmV0dXJuICRkaWFsb2cuZGlhbG9nKHtcbiAgICAgIHJlc29sdmU6ICRzY29wZSxcbiAgICAgIHRlbXBsYXRlVXJsOiAncGx1Z2lucy93aWtpL2h0bWwvbW9kYWwvbW92ZURpYWxvZy5odG1sJyxcbiAgICAgIGNvbnRyb2xsZXI6IFtcIiRzY29wZVwiLCBcImRpYWxvZ1wiLCAgXCJjYWxsYmFja3NcIiwgXCJtb3ZlXCIsIFwiZm9sZGVyTmFtZXNcIiwgKCRzY29wZSwgZGlhbG9nLCBjYWxsYmFja3MsIG1vdmUsIGZvbGRlck5hbWVzKSA9PiB7XG4gICAgICAgICRzY29wZS5tb3ZlICA9IG1vdmU7XG4gICAgICAgICRzY29wZS5mb2xkZXJOYW1lcyAgPSBmb2xkZXJOYW1lcztcblxuICAgICAgICAkc2NvcGUuY2xvc2UgPSAocmVzdWx0KSA9PiB7XG4gICAgICAgICAgZGlhbG9nLmNsb3NlKCk7XG4gICAgICAgIH07XG5cbiAgICAgICAgJHNjb3BlLm1vdmVBbmRDbG9zZURpYWxvZyA9IGNhbGxiYWNrcztcblxuICAgICAgfV1cbiAgICB9KTtcbiAgfVxuXG5cbiAgZXhwb3J0IGludGVyZmFjZSBEZWxldGVEaWFsb2dPcHRpb25zIHtcbiAgICBjYWxsYmFja3M6ICgpID0+IFN0cmluZztcbiAgICBzZWxlY3RlZEZpbGVIdG1sOiAoKSA9PiBTdHJpbmc7XG4gICAgd2FybmluZzogKCkgPT4gc3RyaW5nO1xuICB9XG5cblxuICBleHBvcnQgZnVuY3Rpb24gZ2V0RGVsZXRlRGlhbG9nKCRkaWFsb2csICRzY29wZTpEZWxldGVEaWFsb2dPcHRpb25zKTpXaWtpLldpa2lEaWFsb2cge1xuICAgIHJldHVybiAkZGlhbG9nLmRpYWxvZyh7XG4gICAgICByZXNvbHZlOiAkc2NvcGUsXG4gICAgICB0ZW1wbGF0ZVVybDogJ3BsdWdpbnMvd2lraS9odG1sL21vZGFsL2RlbGV0ZURpYWxvZy5odG1sJyxcbiAgICAgIGNvbnRyb2xsZXI6IFtcIiRzY29wZVwiLCBcImRpYWxvZ1wiLCAgXCJjYWxsYmFja3NcIiwgXCJzZWxlY3RlZEZpbGVIdG1sXCIsIFwid2FybmluZ1wiLCAoJHNjb3BlLCBkaWFsb2csIGNhbGxiYWNrcywgc2VsZWN0ZWRGaWxlSHRtbCwgd2FybmluZykgPT4ge1xuXG4gICAgICAgICRzY29wZS5zZWxlY3RlZEZpbGVIdG1sID0gc2VsZWN0ZWRGaWxlSHRtbDtcblxuICAgICAgICAkc2NvcGUuY2xvc2UgPSAocmVzdWx0KSA9PiB7XG4gICAgICAgICAgZGlhbG9nLmNsb3NlKCk7XG4gICAgICAgIH07XG5cbiAgICAgICAgJHNjb3BlLmRlbGV0ZUFuZENsb3NlRGlhbG9nID0gY2FsbGJhY2tzO1xuXG4gICAgICAgICRzY29wZS53YXJuaW5nID0gd2FybmluZztcbiAgICAgIH1dXG4gICAgfSk7XG4gIH1cblxuXG5cblxuXG59IiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL2luY2x1ZGVzLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIndpa2lIZWxwZXJzLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIndpa2lQbHVnaW4udHNcIi8+XG5cbm1vZHVsZSBXaWtpIHtcblxuICBfbW9kdWxlLmRpcmVjdGl2ZSgnd2lraUhyZWZBZGp1c3RlcicsIFtcIiRsb2NhdGlvblwiLCAoJGxvY2F0aW9uKSA9PiB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHJlc3RyaWN0OiAnQScsXG4gICAgICBsaW5rOiAoJHNjb3BlLCAkZWxlbWVudCwgJGF0dHIpID0+IHtcblxuICAgICAgICAkZWxlbWVudC5iaW5kKCdET01Ob2RlSW5zZXJ0ZWQnLCAoZXZlbnQpID0+IHtcbiAgICAgICAgICB2YXIgYXlzID0gJGVsZW1lbnQuZmluZCgnYScpO1xuICAgICAgICAgIGFuZ3VsYXIuZm9yRWFjaChheXMsIChhKSA9PiB7XG4gICAgICAgICAgICBpZiAoYS5oYXNBdHRyaWJ1dGUoJ25vLWFkanVzdCcpKSB7XG4gICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGEgPSAkKGEpO1xuICAgICAgICAgICAgdmFyIGhyZWYgPSAoYS5hdHRyKCdocmVmJykgfHwgXCJcIikudHJpbSgpO1xuICAgICAgICAgICAgaWYgKGhyZWYpIHtcbiAgICAgICAgICAgICAgdmFyIGZpbGVFeHRlbnNpb24gPSBhLmF0dHIoJ2ZpbGUtZXh0ZW5zaW9uJyk7XG4gICAgICAgICAgICAgIHZhciBuZXdWYWx1ZSA9IFdpa2kuYWRqdXN0SHJlZigkc2NvcGUsICRsb2NhdGlvbiwgaHJlZiwgZmlsZUV4dGVuc2lvbik7XG4gICAgICAgICAgICAgIGlmIChuZXdWYWx1ZSkge1xuICAgICAgICAgICAgICAgIGEuYXR0cignaHJlZicsIG5ld1ZhbHVlKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICAgIHZhciBpbWdzID0gJGVsZW1lbnQuZmluZCgnaW1nJyk7XG4gICAgICAgICAgYW5ndWxhci5mb3JFYWNoKGltZ3MsIChhKSA9PiB7XG4gICAgICAgICAgICBpZiAoYS5oYXNBdHRyaWJ1dGUoJ25vLWFkanVzdCcpKSB7XG4gICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGEgPSAkKGEpO1xuICAgICAgICAgICAgdmFyIGhyZWYgPSAoYS5hdHRyKCdzcmMnKSB8fCBcIlwiKS50cmltKCk7XG4gICAgICAgICAgICBpZiAoaHJlZikge1xuICAgICAgICAgICAgICBpZiAoaHJlZi5zdGFydHNXaXRoKFwiL1wiKSkge1xuICAgICAgICAgICAgICAgIGhyZWYgPSBDb3JlLnVybChocmVmKTtcbiAgICAgICAgICAgICAgICBhLmF0dHIoJ3NyYycsIGhyZWYpO1xuXG4gICAgICAgICAgICAgICAgLy8gbGV0cyBhdm9pZCB0aGlzIGVsZW1lbnQgYmVpbmcgcmVwcm9jZXNzZWRcbiAgICAgICAgICAgICAgICBhLmF0dHIoJ25vLWFkanVzdCcsICd0cnVlJyk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcbiAgICAgICAgfSlcbiAgICAgIH1cbiAgICB9XG4gIH1dKTtcblxuICBfbW9kdWxlLmRpcmVjdGl2ZSgnd2lraVRpdGxlTGlua2VyJywgW1wiJGxvY2F0aW9uXCIsICgkbG9jYXRpb24pID0+IHtcbiAgICByZXR1cm4ge1xuICAgICAgcmVzdHJpY3Q6ICdBJyxcbiAgICAgIGxpbms6ICgkc2NvcGUsICRlbGVtZW50LCAkYXR0cikgPT4ge1xuICAgICAgICB2YXIgbG9hZGVkID0gZmFsc2U7XG5cbiAgICAgICAgZnVuY3Rpb24gb2Zmc2V0VG9wKGVsZW1lbnRzKSB7XG4gICAgICAgICAgaWYgKGVsZW1lbnRzKSB7XG4gICAgICAgICAgICB2YXIgb2Zmc2V0ID0gZWxlbWVudHMub2Zmc2V0KCk7XG4gICAgICAgICAgICBpZiAob2Zmc2V0KSB7XG4gICAgICAgICAgICAgIHJldHVybiBvZmZzZXQudG9wO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gMDtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIHNjcm9sbFRvSGFzaCgpIHtcbiAgICAgICAgICB2YXIgYW5zd2VyID0gZmFsc2U7XG4gICAgICAgICAgdmFyIGlkID0gJGxvY2F0aW9uLnNlYXJjaCgpW1wiaGFzaFwiXTtcbiAgICAgICAgICByZXR1cm4gc2Nyb2xsVG9JZChpZCk7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBzY3JvbGxUb0lkKGlkKSB7XG4gICAgICAgICAgdmFyIGFuc3dlciA9IGZhbHNlO1xuICAgICAgICAgIHZhciBpZCA9ICRsb2NhdGlvbi5zZWFyY2goKVtcImhhc2hcIl07XG4gICAgICAgICAgaWYgKGlkKSB7XG4gICAgICAgICAgICB2YXIgc2VsZWN0b3IgPSAnYVtuYW1lPVwiJyArIGlkICsgJ1wiXSc7XG4gICAgICAgICAgICB2YXIgdGFyZ2V0RWxlbWVudHMgPSAkZWxlbWVudC5maW5kKHNlbGVjdG9yKTtcbiAgICAgICAgICAgIGlmICh0YXJnZXRFbGVtZW50cyAmJiB0YXJnZXRFbGVtZW50cy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgdmFyIHNjcm9sbER1cmF0aW9uID0gMTtcbiAgICAgICAgICAgICAgdmFyIGRlbHRhID0gb2Zmc2V0VG9wKCQoJGVsZW1lbnQpKTtcbiAgICAgICAgICAgICAgdmFyIHRvcCA9IG9mZnNldFRvcCh0YXJnZXRFbGVtZW50cykgLSBkZWx0YTtcbiAgICAgICAgICAgICAgaWYgKHRvcCA8IDApIHtcbiAgICAgICAgICAgICAgICB0b3AgPSAwO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIC8vbG9nLmluZm8oXCJzY3JvbGxpbmcgdG8gaGFzaDogXCIgKyBpZCArIFwiIHRvcDogXCIgKyB0b3AgKyBcIiBkZWx0YTpcIiArIGRlbHRhKTtcbiAgICAgICAgICAgICAgJCgnYm9keSxodG1sJykuYW5pbWF0ZSh7XG4gICAgICAgICAgICAgICAgc2Nyb2xsVG9wOiB0b3BcbiAgICAgICAgICAgICAgfSwgc2Nyb2xsRHVyYXRpb24pO1xuICAgICAgICAgICAgICBhbnN3ZXIgPSB0cnVlO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgLy9sb2cuaW5mbyhcImNvdWxkIGZpbmQgZWxlbWVudCBmb3I6IFwiICsgc2VsZWN0b3IpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gYW5zd2VyO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gYWRkTGlua3MoZXZlbnQpIHtcbiAgICAgICAgICB2YXIgaGVhZGluZ3MgPSAkZWxlbWVudC5maW5kKCdoMSxoMixoMyxoNCxoNSxoNixoNycpO1xuICAgICAgICAgIHZhciB1cGRhdGVkID0gZmFsc2U7XG4gICAgICAgICAgYW5ndWxhci5mb3JFYWNoKGhlYWRpbmdzLCAoaGUpID0+IHtcbiAgICAgICAgICAgIHZhciBoMSA9ICQoaGUpO1xuICAgICAgICAgICAgLy8gbm93IGxldHMgdHJ5IGZpbmQgYSBjaGlsZCBoZWFkZXJcbiAgICAgICAgICAgIHZhciBhID0gaDEucGFyZW50KFwiYVwiKTtcbiAgICAgICAgICAgIGlmICghYSB8fCAhYS5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgdmFyIHRleHQgPSBoMS50ZXh0KCk7XG4gICAgICAgICAgICAgIGlmICh0ZXh0KSB7XG4gICAgICAgICAgICAgICAgdmFyIHRhcmdldCA9IHRleHQucmVwbGFjZSgvIC9nLCBcIi1cIik7XG4gICAgICAgICAgICAgICAgdmFyIHBhdGhXaXRoSGFzaCA9IFwiI1wiICsgJGxvY2F0aW9uLnBhdGgoKSArIFwiP2hhc2g9XCIgKyB0YXJnZXQ7XG4gICAgICAgICAgICAgICAgdmFyIGxpbmsgPSBDb3JlLmNyZWF0ZUhyZWYoJGxvY2F0aW9uLCBwYXRoV2l0aEhhc2gsIFsnaGFzaCddKTtcblxuICAgICAgICAgICAgICAgIC8vIGxldHMgd3JhcCB0aGUgaGVhZGluZyBpbiBhIGxpbmtcbiAgICAgICAgICAgICAgICB2YXIgbmV3QSA9ICQoJzxhIG5hbWU9XCInICsgdGFyZ2V0ICsgJ1wiIGhyZWY9XCInICsgbGluayArICdcIiBuZy1jbGljaz1cIm9uTGlua0NsaWNrKClcIj48L2E+Jyk7XG4gICAgICAgICAgICAgICAgbmV3QS5vbihcImNsaWNrXCIsICgpID0+IHtcbiAgICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAoc2Nyb2xsVG9JZCh0YXJnZXQpKSB7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIH0sIDUwKTtcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIG5ld0EuaW5zZXJ0QmVmb3JlKGgxKTtcbiAgICAgICAgICAgICAgICBoMS5kZXRhY2goKTtcbiAgICAgICAgICAgICAgICBuZXdBLmFwcGVuZChoMSk7XG4gICAgICAgICAgICAgICAgdXBkYXRlZCA9IHRydWU7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcbiAgICAgICAgICBpZiAodXBkYXRlZCAmJiAhbG9hZGVkKSB7XG4gICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgaWYgKHNjcm9sbFRvSGFzaCgpKSB7XG4gICAgICAgICAgICAgICAgbG9hZGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSwgNTApO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIG9uRXZlbnRJbnNlcnRlZChldmVudCkge1xuICAgICAgICAgIC8vIGF2b2lkIGFueSBtb3JlIGV2ZW50cyB3aGlsZSB3ZSBkbyBvdXIgdGhpbmdcbiAgICAgICAgICAkZWxlbWVudC51bmJpbmQoJ0RPTU5vZGVJbnNlcnRlZCcsIG9uRXZlbnRJbnNlcnRlZCk7XG4gICAgICAgICAgYWRkTGlua3MoZXZlbnQpO1xuICAgICAgICAgICRlbGVtZW50LmJpbmQoJ0RPTU5vZGVJbnNlcnRlZCcsIG9uRXZlbnRJbnNlcnRlZCk7XG4gICAgICAgIH1cblxuICAgICAgICAkZWxlbWVudC5iaW5kKCdET01Ob2RlSW5zZXJ0ZWQnLCBvbkV2ZW50SW5zZXJ0ZWQpO1xuICAgICAgfVxuICAgIH07XG4gIH1dKTtcblxufVxuIiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL2luY2x1ZGVzLnRzXCIvPlxuXG5cbi8qKlxuICogQG1vZHVsZSBXaWtpXG4gKi9cbm1vZHVsZSBXaWtpIHtcblxuICBEZXZlbG9wZXIuY3VzdG9tUHJvamVjdFN1YlRhYkZhY3Rvcmllcy5wdXNoKFxuICAgIChjb250ZXh0KSA9PiB7XG4gICAgICB2YXIgcHJvamVjdExpbmsgPSBjb250ZXh0LnByb2plY3RMaW5rO1xuICAgICAgdmFyIHByb2plY3ROYW1lID0gY29udGV4dC5wcm9qZWN0TmFtZTtcbiAgICAgIHZhciBvd25lciA9IFwiXCI7XG4gICAgICB2YXIgcmVwb05hbWUgPSBcIlwiO1xuICAgICAgaWYgKHByb2plY3ROYW1lKSB7XG4gICAgICAgIC8vIFRPRE8gdGhpcyBpcyBhIGJpdCBvZiBhIGhhY2sgLSB3ZSBzaG91bGQgZXhwb3NlIHRoaXMgYSBiaXQgYmV0dGVyIHNvbWV3aGVyZT9cbiAgICAgICAgdmFyIGlkeCA9IHByb2plY3ROYW1lLmluZGV4T2YoJy0nKTtcbiAgICAgICAgaWYgKGlkeCA+IDApIHtcbiAgICAgICAgICBvd25lciA9IHByb2plY3ROYW1lLnN1YnN0cmluZygwLCBpZHgpO1xuICAgICAgICAgIHJlcG9OYW1lID0gcHJvamVjdE5hbWUuc3Vic3RyaW5nKGlkeCArIDEpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4ge1xuICAgICAgICBpc1ZhbGlkOiAoKSA9PiBwcm9qZWN0TGluayAmJiBvd25lciAmJiByZXBvTmFtZSAmJiBEZXZlbG9wZXIuZm9yZ2VSZWFkeUxpbmsoKSxcbiAgICAgICAgaHJlZjogVXJsSGVscGVycy5qb2luKHByb2plY3RMaW5rLCBcIndpa2lcIiwgb3duZXIsIHJlcG9OYW1lLCBcInZpZXdcIiksXG4gICAgICAgIGxhYmVsOiBcIlNvdXJjZVwiLFxuICAgICAgICB0aXRsZTogXCJCcm93c2UgdGhlIHNvdXJjZSBjb2RlIG9mIHRoaXMgcHJvamVjdFwiXG4gICAgICB9O1xuICAgIH0pO1xuXG5cbiAgZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVNvdXJjZUJyZWFkY3J1bWJzKCRzY29wZSkge1xuICAgIHZhciBzb3VyY2VMaW5rID0gJHNjb3BlLiR2aWV3TGluayB8fCBVcmxIZWxwZXJzLmpvaW4oc3RhcnRMaW5rKCRzY29wZSksIFwidmlld1wiKTtcbiAgICByZXR1cm4gW1xuICAgICAge1xuICAgICAgICBsYWJlbDogXCJTb3VyY2VcIixcbiAgICAgICAgaHJlZjogc291cmNlTGluayxcbiAgICAgICAgdGl0bGU6IFwiQnJvd3NlIHRoZSBzb3VyY2UgY29kZSBvZiB0aGlzIHByb2plY3RcIlxuICAgICAgfVxuICAgIF1cbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiBjcmVhdGVFZGl0aW5nQnJlYWRjcnVtYigkc2NvcGUpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGxhYmVsOiBcIkVkaXRpbmdcIixcbiAgICAgICAgdGl0bGU6IFwiRWRpdGluZyB0aGlzIGZpbGVcIlxuICAgICAgfTtcbiAgfVxufVxuIiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL2luY2x1ZGVzLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIndpa2lIZWxwZXJzLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIndpa2lQbHVnaW4udHNcIi8+XG5cbi8qKlxuICogQG1vZHVsZSBXaWtpXG4gKi9cbm1vZHVsZSBXaWtpIHtcblxuICAvKipcbiAgICogQGNsYXNzIEdpdFdpa2lSZXBvc2l0b3J5XG4gICAqL1xuICBleHBvcnQgY2xhc3MgR2l0V2lraVJlcG9zaXRvcnkge1xuICAgIHB1YmxpYyBkaXJlY3RvcnlQcmVmaXggPSBcIlwiO1xuICAgIHByaXZhdGUgJGh0dHA7XG4gICAgcHJpdmF0ZSBjb25maWc7XG4gICAgcHJpdmF0ZSBiYXNlVXJsO1xuXG5cbiAgICBjb25zdHJ1Y3Rvcigkc2NvcGUpIHtcbiAgICAgIHZhciBGb3JnZUFwaVVSTCA9IEt1YmVybmV0ZXMuaW5qZWN0KFwiRm9yZ2VBcGlVUkxcIik7XG4gICAgICB0aGlzLiRodHRwID0gS3ViZXJuZXRlcy5pbmplY3QoXCIkaHR0cFwiKTtcbiAgICAgIHRoaXMuY29uZmlnID0gRm9yZ2UuY3JlYXRlSHR0cENvbmZpZygpO1xuICAgICAgdmFyIG93bmVyID0gJHNjb3BlLm93bmVyO1xuICAgICAgdmFyIHJlcG9OYW1lID0gJHNjb3BlLnJlcG9JZDtcbiAgICAgIHRoaXMuYmFzZVVybCA9IFVybEhlbHBlcnMuam9pbihGb3JnZUFwaVVSTCwgXCJyZXBvcy91c2VyXCIsIG93bmVyLCByZXBvTmFtZSk7XG4gICAgfVxuXG4gICAgcHVibGljIGdldFBhZ2UoYnJhbmNoOnN0cmluZywgcGF0aDpzdHJpbmcsIG9iamVjdElkOnN0cmluZywgZm4pIHtcbiAgICAgIC8vIFRPRE8gaWdub3Jpbmcgb2JqZWN0SWRcbiAgICAgIHZhciBxdWVyeSA9IG51bGw7XG4gICAgICBpZiAoYnJhbmNoKSB7XG4gICAgICAgIHF1ZXJ5ID0gXCJyZWY9XCIgKyBicmFuY2g7XG4gICAgICB9XG4gICAgICB0aGlzLmRvR2V0KFVybEhlbHBlcnMuam9pbihcImNvbnRlbnRcIiwgcGF0aCB8fCBcIi9cIiksIHF1ZXJ5LFxuICAgICAgICAoZGF0YSwgc3RhdHVzLCBoZWFkZXJzLCBjb25maWcpID0+IHtcbiAgICAgICAgICBpZiAoZGF0YSkge1xuICAgICAgICAgICAgdmFyIGRldGFpbHM6IGFueSA9IG51bGw7XG4gICAgICAgICAgICBpZiAoYW5ndWxhci5pc0FycmF5KGRhdGEpKSB7XG4gICAgICAgICAgICAgIGFuZ3VsYXIuZm9yRWFjaChkYXRhLCAoZmlsZSkgPT4ge1xuICAgICAgICAgICAgICAgIGlmICghZmlsZS5kaXJlY3RvcnkgJiYgZmlsZS50eXBlID09PSBcImRpclwiKSB7XG4gICAgICAgICAgICAgICAgICBmaWxlLmRpcmVjdG9yeSA9IHRydWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgZGV0YWlscyA9IHtcbiAgICAgICAgICAgICAgICBkaXJlY3Rvcnk6IHRydWUsXG4gICAgICAgICAgICAgICAgY2hpbGRyZW46IGRhdGFcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgZGV0YWlscyA9IGRhdGE7XG4gICAgICAgICAgICAgIHZhciBjb250ZW50ID0gZGF0YS5jb250ZW50O1xuICAgICAgICAgICAgICBpZiAoY29udGVudCkge1xuICAgICAgICAgICAgICAgIGRldGFpbHMudGV4dCA9IGNvbnRlbnQuZGVjb2RlQmFzZTY0KCk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGZuKGRldGFpbHMpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcHVibGljIHB1dFBhZ2UoYnJhbmNoOnN0cmluZywgcGF0aDpzdHJpbmcsIGNvbnRlbnRzOnN0cmluZywgY29tbWl0TWVzc2FnZTpzdHJpbmcsIGZuKSB7XG4gICAgICB2YXIgcXVlcnkgPSBudWxsO1xuICAgICAgaWYgKGJyYW5jaCkge1xuICAgICAgICBxdWVyeSA9IFwicmVmPVwiICsgYnJhbmNoO1xuICAgICAgfVxuICAgICAgaWYgKGNvbW1pdE1lc3NhZ2UpIHtcbiAgICAgICAgcXVlcnkgPSAocXVlcnkgPyBxdWVyeSArIFwiJlwiIDogXCJcIikgKyBcIm1lc3NhZ2U9XCIgKyBlbmNvZGVVUklDb21wb25lbnQoY29tbWl0TWVzc2FnZSk7XG4gICAgICB9XG4gICAgICB2YXIgYm9keSA9IGNvbnRlbnRzO1xuICAgICAgdGhpcy5kb1Bvc3QoVXJsSGVscGVycy5qb2luKFwiY29udGVudFwiLCBwYXRoIHx8IFwiL1wiKSwgcXVlcnksIGJvZHksXG4gICAgICAgIChkYXRhLCBzdGF0dXMsIGhlYWRlcnMsIGNvbmZpZykgPT4ge1xuICAgICAgICAgIGZuKGRhdGEpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm4gdGhlIGhpc3Rvcnkgb2YgdGhlIHJlcG9zaXRvcnkgb3IgYSBzcGVjaWZpYyBkaXJlY3Rvcnkgb3IgZmlsZSBwYXRoXG4gICAgICogQG1ldGhvZCBoaXN0b3J5XG4gICAgICogQGZvciBHaXRXaWtpUmVwb3NpdG9yeVxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBicmFuY2hcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gb2JqZWN0SWRcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gcGF0aFxuICAgICAqIEBwYXJhbSB7TnVtYmVyfSBsaW1pdFxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGZuXG4gICAgICogQHJldHVybiB7YW55fVxuICAgICAqL1xuICAgIHB1YmxpYyBoaXN0b3J5KGJyYW5jaDpzdHJpbmcsIG9iamVjdElkOnN0cmluZywgcGF0aDpzdHJpbmcsIGxpbWl0Om51bWJlciwgZm4pIHtcbiAgICAgIHZhciBxdWVyeSA9IG51bGw7XG4gICAgICBpZiAoYnJhbmNoKSB7XG4gICAgICAgIHF1ZXJ5ID0gXCJyZWY9XCIgKyBicmFuY2g7XG4gICAgICB9XG4gICAgICBpZiAobGltaXQpIHtcbiAgICAgICAgcXVlcnkgPSAocXVlcnkgPyBxdWVyeSArIFwiJlwiIDogXCJcIikgKyBcImxpbWl0PVwiICsgbGltaXQ7XG4gICAgICB9XG4gICAgICB2YXIgY29tbWl0SWQgPSBvYmplY3RJZCB8fCBicmFuY2g7XG4gICAgICB0aGlzLmRvR2V0KFVybEhlbHBlcnMuam9pbihcImhpc3RvcnlcIiwgY29tbWl0SWQsIHBhdGgpLCBxdWVyeSxcbiAgICAgICAgKGRhdGEsIHN0YXR1cywgaGVhZGVycywgY29uZmlnKSA9PiB7XG4gICAgICAgICAgZm4oZGF0YSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHB1YmxpYyBjb21taXRJbmZvKGNvbW1pdElkOnN0cmluZywgZm4pIHtcbiAgICAgIHZhciBxdWVyeSA9IG51bGw7XG4gICAgICB0aGlzLmRvR2V0KFVybEhlbHBlcnMuam9pbihcImNvbW1pdEluZm9cIiwgY29tbWl0SWQpLCBxdWVyeSxcbiAgICAgICAgKGRhdGEsIHN0YXR1cywgaGVhZGVycywgY29uZmlnKSA9PiB7XG4gICAgICAgICAgZm4oZGF0YSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHB1YmxpYyBjb21taXRUcmVlKGNvbW1pdElkOnN0cmluZywgZm4pIHtcbiAgICAgIHZhciBxdWVyeSA9IG51bGw7XG4gICAgICB0aGlzLmRvR2V0KFVybEhlbHBlcnMuam9pbihcImNvbW1pdFRyZWVcIiwgY29tbWl0SWQpLCBxdWVyeSxcbiAgICAgICAgKGRhdGEsIHN0YXR1cywgaGVhZGVycywgY29uZmlnKSA9PiB7XG4gICAgICAgICAgZm4oZGF0YSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuXG4gICAgLyoqXG4gICAgICogUGVyZm9ybXMgYSBkaWZmIG9uIHRoZSB2ZXJzaW9uc1xuICAgICAqIEBtZXRob2QgZGlmZlxuICAgICAqIEBmb3IgR2l0V2lraVJlcG9zaXRvcnlcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gb2JqZWN0SWRcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gYmFzZU9iamVjdElkXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IHBhdGhcbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBmblxuICAgICAqIEByZXR1cm4ge2FueX1cbiAgICAgKi9cbiAgICBwdWJsaWMgZGlmZihvYmplY3RJZDpzdHJpbmcsIGJhc2VPYmplY3RJZDpzdHJpbmcsIHBhdGg6c3RyaW5nLCBmbikge1xuICAgICAgdmFyIHF1ZXJ5ID0gbnVsbDtcbiAgICAgIHZhciBjb25maWc6IGFueSA9IEZvcmdlLmNyZWF0ZUh0dHBDb25maWcoKTtcbiAgICAgIGNvbmZpZy50cmFuc2Zvcm1SZXNwb25zZSA9IChkYXRhLCBoZWFkZXJzR2V0dGVyLCBzdGF0dXMpID0+IHtcbiAgICAgICAgbG9nLmluZm8oXCJnb3QgZGlmZiBkYXRhOiBcIiArIGRhdGEpO1xuICAgICAgICByZXR1cm4gZGF0YTtcbiAgICAgIH07XG4gICAgICB0aGlzLmRvR2V0KFVybEhlbHBlcnMuam9pbihcImRpZmZcIiwgb2JqZWN0SWQsIGJhc2VPYmplY3RJZCwgcGF0aCksIHF1ZXJ5LFxuICAgICAgICAoZGF0YSwgc3RhdHVzLCBoZWFkZXJzLCBjb25maWcpID0+IHtcbiAgICAgICAgICB2YXIgZGV0YWlscyA9IHtcbiAgICAgICAgICAgIHRleHQ6IGRhdGEsXG4gICAgICAgICAgICBmb3JtYXQ6IFwiZGlmZlwiLFxuICAgICAgICAgICAgZGlyZWN0b3J5OiBmYWxzZVxuICAgICAgICAgIH07XG4gICAgICAgICAgZm4oZGV0YWlscyk7XG4gICAgICAgIH0sXG4gICAgICAgIG51bGwsIGNvbmZpZyk7XG4gICAgfVxuXG5cbiAgICAvKipcbiAgICAgKiBHZXQgdGhlIGxpc3Qgb2YgYnJhbmNoZXNcbiAgICAgKiBAbWV0aG9kIGJyYW5jaGVzXG4gICAgICogQGZvciBHaXRXaWtpUmVwb3NpdG9yeVxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGZuXG4gICAgICogQHJldHVybiB7YW55fVxuICAgICAqL1xuICAgIHB1YmxpYyBicmFuY2hlcyhmbikge1xuICAgICAgdmFyIHF1ZXJ5ID0gbnVsbDtcbiAgICAgIHRoaXMuZG9HZXQoXCJsaXN0QnJhbmNoZXNcIiwgcXVlcnksXG4gICAgICAgIChkYXRhLCBzdGF0dXMsIGhlYWRlcnMsIGNvbmZpZykgPT4ge1xuICAgICAgICAgIGZuKGRhdGEpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwdWJsaWMgZXhpc3RzKGJyYW5jaDpzdHJpbmcsIHBhdGg6c3RyaW5nLCBmbik6IEJvb2xlYW4ge1xuICAgICAgdmFyIGFuc3dlciA9IGZhbHNlO1xuICAgICAgdGhpcy5nZXRQYWdlKGJyYW5jaCwgcGF0aCwgbnVsbCwgKGRhdGEpID0+IHtcbiAgICAgICAgaWYgKGRhdGEuZGlyZWN0b3J5KSB7XG4gICAgICAgICAgaWYgKGRhdGEuY2hpbGRyZW4ubGVuZ3RoKSB7XG4gICAgICAgICAgICBhbnN3ZXIgPSB0cnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBhbnN3ZXIgPSB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIGxvZy5pbmZvKFwiZXhpc3RzIFwiICsgcGF0aCArIFwiIGFuc3dlciA9IFwiICsgYW5zd2VyKTtcbiAgICAgICAgaWYgKGFuZ3VsYXIuaXNGdW5jdGlvbihmbikpIHtcbiAgICAgICAgICBmbihhbnN3ZXIpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIHJldHVybiBhbnN3ZXI7XG4gICAgfVxuXG4gICAgcHVibGljIHJldmVydFRvKGJyYW5jaDpzdHJpbmcsIG9iamVjdElkOnN0cmluZywgYmxvYlBhdGg6c3RyaW5nLCBjb21taXRNZXNzYWdlOnN0cmluZywgZm4pIHtcbiAgICAgIGlmICghY29tbWl0TWVzc2FnZSkge1xuICAgICAgICBjb21taXRNZXNzYWdlID0gXCJSZXZlcnRpbmcgXCIgKyBibG9iUGF0aCArIFwiIGNvbW1pdCBcIiArIChvYmplY3RJZCB8fCBicmFuY2gpO1xuICAgICAgfVxuICAgICAgdmFyIHF1ZXJ5ID0gbnVsbDtcbiAgICAgIGlmIChicmFuY2gpIHtcbiAgICAgICAgcXVlcnkgPSBcInJlZj1cIiArIGJyYW5jaDtcbiAgICAgIH1cbiAgICAgIGlmIChjb21taXRNZXNzYWdlKSB7XG4gICAgICAgIHF1ZXJ5ID0gKHF1ZXJ5ID8gcXVlcnkgKyBcIiZcIiA6IFwiXCIpICsgXCJtZXNzYWdlPVwiICsgZW5jb2RlVVJJQ29tcG9uZW50KGNvbW1pdE1lc3NhZ2UpO1xuICAgICAgfVxuICAgICAgdmFyIGJvZHkgPSBcIlwiO1xuICAgICAgdGhpcy5kb1Bvc3QoVXJsSGVscGVycy5qb2luKFwicmV2ZXJ0XCIsIG9iamVjdElkLCBibG9iUGF0aCB8fCBcIi9cIiksIHF1ZXJ5LCBib2R5LFxuICAgICAgICAoZGF0YSwgc3RhdHVzLCBoZWFkZXJzLCBjb25maWcpID0+IHtcbiAgICAgICAgICBmbihkYXRhKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcHVibGljIHJlbmFtZShicmFuY2g6c3RyaW5nLCBvbGRQYXRoOnN0cmluZywgIG5ld1BhdGg6c3RyaW5nLCBjb21taXRNZXNzYWdlOnN0cmluZywgZm4pIHtcbiAgICAgIGlmICghY29tbWl0TWVzc2FnZSkge1xuICAgICAgICBjb21taXRNZXNzYWdlID0gXCJSZW5hbWluZyBwYWdlIFwiICsgb2xkUGF0aCArIFwiIHRvIFwiICsgbmV3UGF0aDtcbiAgICAgIH1cbiAgICAgIHZhciBxdWVyeSA9IG51bGw7XG4gICAgICBpZiAoYnJhbmNoKSB7XG4gICAgICAgIHF1ZXJ5ID0gXCJyZWY9XCIgKyBicmFuY2g7XG4gICAgICB9XG4gICAgICBpZiAoY29tbWl0TWVzc2FnZSkge1xuICAgICAgICBxdWVyeSA9IChxdWVyeSA/IHF1ZXJ5ICsgXCImXCIgOiBcIlwiKSArIFwibWVzc2FnZT1cIiArIGVuY29kZVVSSUNvbXBvbmVudChjb21taXRNZXNzYWdlKTtcbiAgICAgIH1cbiAgICAgIGlmIChvbGRQYXRoKSB7XG4gICAgICAgIHF1ZXJ5ID0gKHF1ZXJ5ID8gcXVlcnkgKyBcIiZcIiA6IFwiXCIpICsgXCJvbGQ9XCIgKyBlbmNvZGVVUklDb21wb25lbnQob2xkUGF0aCk7XG4gICAgICB9XG4gICAgICB2YXIgYm9keSA9IFwiXCI7XG4gICAgICB0aGlzLmRvUG9zdChVcmxIZWxwZXJzLmpvaW4oXCJtdlwiLCBuZXdQYXRoIHx8IFwiL1wiKSwgcXVlcnksIGJvZHksXG4gICAgICAgIChkYXRhLCBzdGF0dXMsIGhlYWRlcnMsIGNvbmZpZykgPT4ge1xuICAgICAgICAgIGZuKGRhdGEpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwdWJsaWMgcmVtb3ZlUGFnZShicmFuY2g6c3RyaW5nLCBwYXRoOnN0cmluZywgY29tbWl0TWVzc2FnZTpzdHJpbmcsIGZuKSB7XG4gICAgICBpZiAoIWNvbW1pdE1lc3NhZ2UpIHtcbiAgICAgICAgY29tbWl0TWVzc2FnZSA9IFwiUmVtb3ZpbmcgcGFnZSBcIiArIHBhdGg7XG4gICAgICB9XG4gICAgICB2YXIgcXVlcnkgPSBudWxsO1xuICAgICAgaWYgKGJyYW5jaCkge1xuICAgICAgICBxdWVyeSA9IFwicmVmPVwiICsgYnJhbmNoO1xuICAgICAgfVxuICAgICAgaWYgKGNvbW1pdE1lc3NhZ2UpIHtcbiAgICAgICAgcXVlcnkgPSAocXVlcnkgPyBxdWVyeSArIFwiJlwiIDogXCJcIikgKyBcIm1lc3NhZ2U9XCIgKyBlbmNvZGVVUklDb21wb25lbnQoY29tbWl0TWVzc2FnZSk7XG4gICAgICB9XG4gICAgICB2YXIgYm9keSA9IFwiXCI7XG4gICAgICB0aGlzLmRvUG9zdChVcmxIZWxwZXJzLmpvaW4oXCJybVwiLCBwYXRoIHx8IFwiL1wiKSwgcXVlcnksIGJvZHksXG4gICAgICAgIChkYXRhLCBzdGF0dXMsIGhlYWRlcnMsIGNvbmZpZykgPT4ge1xuICAgICAgICAgIGZuKGRhdGEpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwdWJsaWMgcmVtb3ZlUGFnZXMoYnJhbmNoOnN0cmluZywgcGF0aHM6QXJyYXk8c3RyaW5nPiwgY29tbWl0TWVzc2FnZTpzdHJpbmcsIGZuKSB7XG4gICAgICBpZiAoIWNvbW1pdE1lc3NhZ2UpIHtcbiAgICAgICAgY29tbWl0TWVzc2FnZSA9IFwiUmVtb3ZpbmcgcGFnZVwiICsgKHBhdGhzLmxlbmd0aCA+IDEgPyBcInNcIiA6IFwiXCIpICsgXCIgXCIgKyBwYXRocy5qb2luKFwiLCBcIik7XG4gICAgICB9XG4gICAgICB2YXIgcXVlcnkgPSBudWxsO1xuICAgICAgaWYgKGJyYW5jaCkge1xuICAgICAgICBxdWVyeSA9IFwicmVmPVwiICsgYnJhbmNoO1xuICAgICAgfVxuICAgICAgaWYgKGNvbW1pdE1lc3NhZ2UpIHtcbiAgICAgICAgcXVlcnkgPSAocXVlcnkgPyBxdWVyeSArIFwiJlwiIDogXCJcIikgKyBcIm1lc3NhZ2U9XCIgKyBlbmNvZGVVUklDb21wb25lbnQoY29tbWl0TWVzc2FnZSk7XG4gICAgICB9XG4gICAgICB2YXIgYm9keSA9IHBhdGhzO1xuICAgICAgdGhpcy5kb1Bvc3QoVXJsSGVscGVycy5qb2luKFwicm1cIiksIHF1ZXJ5LCBib2R5LFxuICAgICAgICAoZGF0YSwgc3RhdHVzLCBoZWFkZXJzLCBjb25maWcpID0+IHtcbiAgICAgICAgICBmbihkYXRhKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG5cblxuICAgIHByaXZhdGUgZG9HZXQocGF0aCwgcXVlcnksIHN1Y2Nlc3NGbiwgZXJyb3JGbiA9IG51bGwsIGNvbmZpZyA9IG51bGwpIHtcbiAgICAgIHZhciB1cmwgPSBGb3JnZS5jcmVhdGVIdHRwVXJsKFVybEhlbHBlcnMuam9pbih0aGlzLmJhc2VVcmwsIHBhdGgpKTtcbiAgICAgIGlmIChxdWVyeSkge1xuICAgICAgICB1cmwgKz0gXCImXCIgKyBxdWVyeTtcbiAgICAgIH1cbiAgICAgIGlmICghZXJyb3JGbikge1xuICAgICAgICBlcnJvckZuID0gKGRhdGEsIHN0YXR1cywgaGVhZGVycywgY29uZmlnKSA9PiB7XG4gICAgICAgICAgbG9nLndhcm4oXCJmYWlsZWQgdG8gbG9hZCEgXCIgKyB1cmwgKyBcIi4gc3RhdHVzOiBcIiArIHN0YXR1cyArIFwiIGRhdGE6IFwiICsgZGF0YSk7XG4gICAgICAgIH07XG5cbiAgICAgIH1cbiAgICAgIGlmICghY29uZmlnKSB7XG4gICAgICAgIGNvbmZpZyA9IHRoaXMuY29uZmlnO1xuICAgICAgfVxuICAgICAgdGhpcy4kaHR0cC5nZXQodXJsLCBjb25maWcpLlxuICAgICAgICBzdWNjZXNzKHN1Y2Nlc3NGbikuXG4gICAgICAgIGVycm9yKGVycm9yRm4pO1xuICAgIH1cblxuICAgIHByaXZhdGUgZG9Qb3N0KHBhdGgsIHF1ZXJ5LCBib2R5LCBzdWNjZXNzRm4sIGVycm9yRm4gPSBudWxsKSB7XG4gICAgICB2YXIgdXJsID0gRm9yZ2UuY3JlYXRlSHR0cFVybChVcmxIZWxwZXJzLmpvaW4odGhpcy5iYXNlVXJsLCBwYXRoKSk7XG4gICAgICBpZiAocXVlcnkpIHtcbiAgICAgICAgdXJsICs9IFwiJlwiICsgcXVlcnk7XG4gICAgICB9XG4gICAgICBpZiAoIWVycm9yRm4pIHtcbiAgICAgICAgZXJyb3JGbiA9IChkYXRhLCBzdGF0dXMsIGhlYWRlcnMsIGNvbmZpZykgPT4ge1xuICAgICAgICAgIGxvZy53YXJuKFwiZmFpbGVkIHRvIGxvYWQhIFwiICsgdXJsICsgXCIuIHN0YXR1czogXCIgKyBzdGF0dXMgKyBcIiBkYXRhOiBcIiArIGRhdGEpO1xuICAgICAgICB9O1xuXG4gICAgICB9XG4gICAgICB0aGlzLiRodHRwLnBvc3QodXJsLCBib2R5LCB0aGlzLmNvbmZpZykuXG4gICAgICAgIHN1Y2Nlc3Moc3VjY2Vzc0ZuKS5cbiAgICAgICAgZXJyb3IoZXJyb3JGbik7XG4gICAgfVxuXG5cbiAgICBwcml2YXRlIGRvUG9zdEZvcm0ocGF0aCwgcXVlcnksIGJvZHksIHN1Y2Nlc3NGbiwgZXJyb3JGbiA9IG51bGwpIHtcbiAgICAgIHZhciB1cmwgPSBGb3JnZS5jcmVhdGVIdHRwVXJsKFVybEhlbHBlcnMuam9pbih0aGlzLmJhc2VVcmwsIHBhdGgpKTtcbiAgICAgIGlmIChxdWVyeSkge1xuICAgICAgICB1cmwgKz0gXCImXCIgKyBxdWVyeTtcbiAgICAgIH1cbiAgICAgIGlmICghZXJyb3JGbikge1xuICAgICAgICBlcnJvckZuID0gKGRhdGEsIHN0YXR1cywgaGVhZGVycywgY29uZmlnKSA9PiB7XG4gICAgICAgICAgbG9nLndhcm4oXCJmYWlsZWQgdG8gbG9hZCEgXCIgKyB1cmwgKyBcIi4gc3RhdHVzOiBcIiArIHN0YXR1cyArIFwiIGRhdGE6IFwiICsgZGF0YSk7XG4gICAgICAgIH07XG5cbiAgICAgIH1cbiAgICAgIHZhciBjb25maWcgPSBGb3JnZS5jcmVhdGVIdHRwQ29uZmlnKCk7XG4gICAgICBpZiAoIWNvbmZpZy5oZWFkZXJzKSB7XG4gICAgICAgIGNvbmZpZy5oZWFkZXJzID0ge307XG4gICAgICB9XG4gICAgICBjb25maWcuaGVhZGVyc1tcIkNvbnRlbnQtVHlwZVwiXSA9IFwiYXBwbGljYXRpb24veC13d3ctZm9ybS11cmxlbmNvZGVkOyBjaGFyc2V0PXV0Zi04XCI7XG5cbiAgICAgIHRoaXMuJGh0dHAucG9zdCh1cmwsIGJvZHksIGNvbmZpZykuXG4gICAgICAgIHN1Y2Nlc3Moc3VjY2Vzc0ZuKS5cbiAgICAgICAgZXJyb3IoZXJyb3JGbik7XG4gICAgfVxuXG5cblxuICAgIHB1YmxpYyBjb21wbGV0ZVBhdGgoYnJhbmNoOnN0cmluZywgY29tcGxldGlvblRleHQ6c3RyaW5nLCBkaXJlY3Rvcmllc09ubHk6Ym9vbGVhbiwgZm4pIHtcbi8qXG4gICAgICByZXR1cm4gdGhpcy5naXQoKS5jb21wbGV0ZVBhdGgoYnJhbmNoLCBjb21wbGV0aW9uVGV4dCwgZGlyZWN0b3JpZXNPbmx5LCBmbik7XG4qL1xuICAgIH1cblxuXG4gICAgLyoqXG4gICAgICogUmV0dXJucyB0aGUgZnVsbCBwYXRoIHRvIHVzZSBpbiB0aGUgZ2l0IHJlcG9cbiAgICAgKiBAbWV0aG9kIGdldFBhdGhcbiAgICAgKiBAZm9yIEdpdFdpa2lSZXBvc2l0b3J5XG4gICAgICogQHBhcmFtIHtTdHJpbmd9IHBhdGhcbiAgICAgKiBAcmV0dXJuIHtTdHJpbmd7XG4gICAgICovXG4gICAgcHVibGljIGdldFBhdGgocGF0aDpzdHJpbmcpIHtcbiAgICAgIHZhciBkaXJlY3RvcnlQcmVmaXggPSB0aGlzLmRpcmVjdG9yeVByZWZpeDtcbiAgICAgIHJldHVybiAoZGlyZWN0b3J5UHJlZml4KSA/IGRpcmVjdG9yeVByZWZpeCArIHBhdGggOiBwYXRoO1xuICAgIH1cblxuICAgIHB1YmxpYyBnZXRMb2dQYXRoKHBhdGg6c3RyaW5nKSB7XG4gICAgICByZXR1cm4gQ29yZS50cmltTGVhZGluZyh0aGlzLmdldFBhdGgocGF0aCksIFwiL1wiKTtcbiAgICB9XG5cblxuICAgIC8qKlxuICAgICAqIEdldCB0aGUgY29udGVudHMgb2YgYSBibG9iUGF0aCBmb3IgYSBnaXZlbiBjb21taXQgb2JqZWN0SWRcbiAgICAgKiBAbWV0aG9kIGdldENvbnRlbnRcbiAgICAgKiBAZm9yIEdpdFdpa2lSZXBvc2l0b3J5XG4gICAgICogQHBhcmFtIHtTdHJpbmd9IG9iamVjdElkXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IGJsb2JQYXRoXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gZm5cbiAgICAgKiBAcmV0dXJuIHthbnl9XG4gICAgICovXG4gICAgcHVibGljIGdldENvbnRlbnQob2JqZWN0SWQ6c3RyaW5nLCBibG9iUGF0aDpzdHJpbmcsIGZuKSB7XG4vKlxuICAgICAgdmFyIGZ1bGxQYXRoID0gdGhpcy5nZXRMb2dQYXRoKGJsb2JQYXRoKTtcbiAgICAgIHZhciBnaXQgPSB0aGlzLmdpdCgpO1xuICAgICAgaWYgKGdpdCkge1xuICAgICAgICBnaXQuZ2V0Q29udGVudChvYmplY3RJZCwgZnVsbFBhdGgsIGZuKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBnaXQ7XG4qL1xuICAgIH1cblxuXG5cbiAgICAvKipcbiAgICAgKiBHZXQgdGhlIEpTT04gY29udGVudHMgb2YgdGhlIHBhdGggd2l0aCBvcHRpb25hbCBuYW1lIHdpbGRjYXJkIGFuZCBzZWFyY2hcbiAgICAgKiBAbWV0aG9kIGpzb25DaGlsZENvbnRlbnRzXG4gICAgICogQGZvciBHaXRXaWtpUmVwb3NpdG9yeVxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IG5hbWVXaWxkY2FyZFxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBzZWFyY2hcbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBmblxuICAgICAqIEByZXR1cm4ge2FueX1cbiAgICAgKi9cbiAgICBwdWJsaWMganNvbkNoaWxkQ29udGVudHMocGF0aDpzdHJpbmcsIG5hbWVXaWxkY2FyZDpzdHJpbmcsIHNlYXJjaDpzdHJpbmcsIGZuKSB7XG4vKlxuICAgICAgdmFyIGZ1bGxQYXRoID0gdGhpcy5nZXRMb2dQYXRoKHBhdGgpO1xuICAgICAgdmFyIGdpdCA9IHRoaXMuZ2l0KCk7XG4gICAgICBpZiAoZ2l0KSB7XG4gICAgICAgIGdpdC5yZWFkSnNvbkNoaWxkQ29udGVudChmdWxsUGF0aCwgbmFtZVdpbGRjYXJkLCBzZWFyY2gsIGZuKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBnaXQ7XG4qL1xuICAgIH1cblxuXG4gICAgcHVibGljIGdpdCgpIHtcbi8qXG4gICAgICB2YXIgcmVwb3NpdG9yeSA9IHRoaXMuZmFjdG9yeU1ldGhvZCgpO1xuICAgICAgaWYgKCFyZXBvc2l0b3J5KSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiTm8gcmVwb3NpdG9yeSB5ZXQhIFRPRE8gd2Ugc2hvdWxkIHVzZSBhIGxvY2FsIGltcGwhXCIpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHJlcG9zaXRvcnk7XG4qL1xuICAgIH1cbiAgfVxufVxuIiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL2luY2x1ZGVzLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIndpa2lIZWxwZXJzLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIndpa2lQbHVnaW4udHNcIi8+XG5cbm1vZHVsZSBXaWtpIHtcblxuICBleHBvcnQgdmFyIFRvcExldmVsQ29udHJvbGxlciA9IF9tb2R1bGUuY29udHJvbGxlcihcIldpa2kuVG9wTGV2ZWxDb250cm9sbGVyXCIsIFsnJHNjb3BlJywgJyRyb3V0ZScsICckcm91dGVQYXJhbXMnLCAoJHNjb3BlLCAkcm91dGUsICRyb3V0ZVBhcmFtcykgPT4ge1xuXG4gIH1dKTtcblxufVxuIl0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9
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