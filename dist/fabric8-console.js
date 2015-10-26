

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
        var xmlNamespaces = row.xmlNamespaces;
        var iconUrl = row.iconUrl;
        var entity = row.entity;
        if (entity) {
            name = name || entity.name;
            path = path || entity.path;
            branch = branch || entity.branch;
            directory = directory || entity.directory;
            xmlNamespaces = xmlNamespaces || entity.xmlNamespaces;
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
            $routeProvider.when(UrlHelpers.join(startContext, path, 'view'), Wiki.route('viewPage.html', false)).when(UrlHelpers.join(startContext, path, 'create/:page*'), Wiki.route('create.html', false)).when(startContext + path + '/view/:page*', { templateUrl: 'plugins/wiki/html/viewPage.html', reloadOnSearch: false }).when(startContext + path + '/book/:page*', { templateUrl: 'plugins/wiki/html/viewBook.html', reloadOnSearch: false }).when(startContext + path + '/edit/:page*', { templateUrl: 'plugins/wiki/html/editPage.html' }).when(startContext + path + '/version/:page*\/:objectId', { templateUrl: 'plugins/wiki/html/viewPage.html' }).when(startContext + path + '/history/:page*', { templateUrl: 'plugins/wiki/html/history.html' }).when(startContext + path + '/commit/:page*\/:objectId', { templateUrl: 'plugins/wiki/html/commit.html' }).when(startContext + path + '/diff/:page*\/:diffObjectId1/:diffObjectId2', { templateUrl: 'plugins/wiki/html/viewPage.html', reloadOnSearch: false }).when(startContext + path + '/formTable/:page*', { templateUrl: 'plugins/wiki/html/formTable.html' }).when(startContext + path + '/dozer/mappings/:page*', { templateUrl: 'plugins/wiki/html/dozerMappings.html' }).when(startContext + path + '/configurations/:page*', { templateUrl: 'plugins/wiki/html/configurations.html' }).when(startContext + path + '/configuration/:pid/:page*', { templateUrl: 'plugins/wiki/html/configuration.html' }).when(startContext + path + '/newConfiguration/:factoryPid/:page*', { templateUrl: 'plugins/wiki/html/configuration.html' });
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
                var xmlNamespaces = child.xmlNamespaces;
                if (xmlNamespaces && xmlNamespaces.length) {
                    if (xmlNamespaces.any(function (ns) { return Wiki.camelNamespaces.any(ns); })) {
                        prefix = start + "/camel/canvas";
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImluY2x1ZGVzLmpzIiwibWFpbi90cy9tYWluR2xvYmFscy50cyIsImZvcmdlL3RzL2ZvcmdlSGVscGVycy50cyIsIm1haW4vdHMvbWFpblBsdWdpbi50cyIsIm1haW4vdHMvYWJvdXQudHMiLCJ3aWtpL3RzL3dpa2lIZWxwZXJzLnRzIiwid2lraS90cy93aWtpUGx1Z2luLnRzIiwid2lraS90cy9jb21taXQudHMiLCJ3aWtpL3RzL2NyZWF0ZS50cyIsIndpa2kvdHMvZWRpdC50cyIsIndpa2kvdHMvZmlsZURyb3AudHMiLCJ3aWtpL3RzL2Zvcm1UYWJsZS50cyIsIndpa2kvdHMvZ2l0UHJlZmVyZW5jZXMudHMiLCJ3aWtpL3RzL2hpc3RvcnkudHMiLCJ3aWtpL3RzL25hdmJhci50cyIsIndpa2kvdHMvdmlldy50cyIsIndpa2kvdHMvd2lraURpYWxvZ3MudHMiLCJ3aWtpL3RzL3dpa2lEaXJlY3RpdmVzLnRzIiwid2lraS90cy93aWtpTmF2aWdhdGlvbi50cyIsIndpa2kvdHMvd2lraVJlcG9zaXRvcnkudHMiLCJ3aWtpL3RzL3dpa2lUb3BMZXZlbC50cyIsImZvcmdlL3RzL2ZvcmdlUGx1Z2luLnRzIiwiZm9yZ2UvdHMvY29tbWFuZC50cyIsImZvcmdlL3RzL2NvbW1hbmRzLnRzIiwiZm9yZ2UvdHMvcmVwby50cyIsImZvcmdlL3RzL3JlcG9zLnRzIl0sIm5hbWVzIjpbIk1haW4iLCJGb3JnZSIsIkZvcmdlLmlzRm9yZ2UiLCJGb3JnZS5pbml0U2NvcGUiLCJGb3JnZS5jb21tYW5kTGluayIsIkZvcmdlLmNvbW1hbmRzTGluayIsIkZvcmdlLnJlcG9zQXBpVXJsIiwiRm9yZ2UucmVwb0FwaVVybCIsIkZvcmdlLmNvbW1hbmRBcGlVcmwiLCJGb3JnZS5leGVjdXRlQ29tbWFuZEFwaVVybCIsIkZvcmdlLnZhbGlkYXRlQ29tbWFuZEFwaVVybCIsIkZvcmdlLmNvbW1hbmRJbnB1dEFwaVVybCIsIkZvcmdlLm1vZGVsUHJvamVjdCIsIkZvcmdlLnNldE1vZGVsQ29tbWFuZHMiLCJGb3JnZS5nZXRNb2RlbENvbW1hbmRzIiwiRm9yZ2UubW9kZWxDb21tYW5kSW5wdXRNYXAiLCJGb3JnZS5nZXRNb2RlbENvbW1hbmRJbnB1dHMiLCJGb3JnZS5zZXRNb2RlbENvbW1hbmRJbnB1dHMiLCJGb3JnZS5lbnJpY2hSZXBvIiwiRm9yZ2UuY3JlYXRlSHR0cENvbmZpZyIsIkZvcmdlLmFkZFF1ZXJ5QXJndW1lbnQiLCJGb3JnZS5jcmVhdGVIdHRwVXJsIiwiRm9yZ2UuY29tbWFuZE1hdGNoZXNUZXh0IiwiRm9yZ2UuaXNMb2dnZWRJbnRvR29ncyIsIkZvcmdlLnJlZGlyZWN0VG9Hb2dzTG9naW5JZlJlcXVpcmVkIiwiV2lraSIsIldpa2kuVmlld01vZGUiLCJXaWtpLmlzRk1DQ29udGFpbmVyIiwiV2lraS5pc1dpa2lFbmFibGVkIiwiV2lraS5nb1RvTGluayIsIldpa2kuY3VzdG9tVmlld0xpbmtzIiwiV2lraS5jcmVhdGVXaXphcmRUcmVlIiwiV2lraS5jcmVhdGVGb2xkZXIiLCJXaWtpLmFkZENyZWF0ZVdpemFyZEZvbGRlcnMiLCJXaWtpLnN0YXJ0TGluayIsIldpa2kuaXNJbmRleFBhZ2UiLCJXaWtpLnZpZXdMaW5rIiwiV2lraS5icmFuY2hMaW5rIiwiV2lraS5lZGl0TGluayIsIldpa2kuY3JlYXRlTGluayIsIldpa2kuZW5jb2RlUGF0aCIsIldpa2kuZGVjb2RlUGF0aCIsIldpa2kuZmlsZUZvcm1hdCIsIldpa2kuZmlsZU5hbWUiLCJXaWtpLmZpbGVQYXJlbnQiLCJXaWtpLmhpZGVGaWxlTmFtZUV4dGVuc2lvbnMiLCJXaWtpLmdpdFJlc3RVUkwiLCJXaWtpLmdpdFVybFByZWZpeCIsIldpa2kuZ2l0UmVsYXRpdmVVUkwiLCJXaWtpLmZpbGVJY29uSHRtbCIsIldpa2kuaWNvbkNsYXNzIiwiV2lraS5pbml0U2NvcGUiLCJXaWtpLmxvYWRCcmFuY2hlcyIsIldpa2kucGFnZUlkIiwiV2lraS5wYWdlSWRGcm9tVVJJIiwiV2lraS5maWxlRXh0ZW5zaW9uIiwiV2lraS5vbkNvbXBsZXRlIiwiV2lraS5wYXJzZUpzb24iLCJXaWtpLmFkanVzdEhyZWYiLCJXaWtpLmNvbW1pdFBhdGgiLCJXaWtpLnVwZGF0ZVZpZXciLCJXaWtpLnJldHVyblRvRGlyZWN0b3J5IiwiV2lraS5kb0NyZWF0ZSIsIldpa2kuZG9DcmVhdGUudG9QYXRoIiwiV2lraS5kb0NyZWF0ZS50b1Byb2ZpbGVOYW1lIiwiV2lraS5wdXRQYWdlIiwiV2lraS5nZXROZXdEb2N1bWVudFBhdGgiLCJXaWtpLmlzQ3JlYXRlIiwiV2lraS5vbkZpbGVDb250ZW50cyIsIldpa2kudXBkYXRlU291cmNlVmlldyIsIldpa2kub25Gb3JtU2NoZW1hIiwiV2lraS5nb1RvVmlldyIsIldpa2kuc2F2ZVRvIiwiV2lraS5jaGlsZExpbmsiLCJXaWtpLm9uUmVzdWx0cyIsIldpa2kub25Gb3JtRGF0YSIsIldpa2kuc3dpdGNoRnJvbVZpZXdUb0N1c3RvbUxpbmsiLCJXaWtpLmxvYWRCcmVhZGNydW1icyIsIldpa2kuaXNEaWZmVmlldyIsIldpa2kudmlld0NvbnRlbnRzIiwiV2lraS5vbkZpbGVEZXRhaWxzIiwiV2lraS5jaGVja0ZpbGVFeGlzdHMiLCJXaWtpLmdldFJlbmFtZUZpbGVQYXRoIiwiV2lraS5nZXRSZW5hbWVEaWFsb2ciLCJXaWtpLmdldE1vdmVEaWFsb2ciLCJXaWtpLmdldERlbGV0ZURpYWxvZyIsIldpa2kub2Zmc2V0VG9wIiwiV2lraS5zY3JvbGxUb0hhc2giLCJXaWtpLnNjcm9sbFRvSWQiLCJXaWtpLmFkZExpbmtzIiwiV2lraS5vbkV2ZW50SW5zZXJ0ZWQiLCJXaWtpLmNyZWF0ZVNvdXJjZUJyZWFkY3J1bWJzIiwiV2lraS5jcmVhdGVFZGl0aW5nQnJlYWRjcnVtYiIsIldpa2kuR2l0V2lraVJlcG9zaXRvcnkiLCJXaWtpLkdpdFdpa2lSZXBvc2l0b3J5LmNvbnN0cnVjdG9yIiwiV2lraS5HaXRXaWtpUmVwb3NpdG9yeS5nZXRQYWdlIiwiV2lraS5HaXRXaWtpUmVwb3NpdG9yeS5wdXRQYWdlIiwiV2lraS5HaXRXaWtpUmVwb3NpdG9yeS5oaXN0b3J5IiwiV2lraS5HaXRXaWtpUmVwb3NpdG9yeS5jb21taXRJbmZvIiwiV2lraS5HaXRXaWtpUmVwb3NpdG9yeS5jb21taXRUcmVlIiwiV2lraS5HaXRXaWtpUmVwb3NpdG9yeS5kaWZmIiwiV2lraS5HaXRXaWtpUmVwb3NpdG9yeS5icmFuY2hlcyIsIldpa2kuR2l0V2lraVJlcG9zaXRvcnkuZXhpc3RzIiwiV2lraS5HaXRXaWtpUmVwb3NpdG9yeS5yZXZlcnRUbyIsIldpa2kuR2l0V2lraVJlcG9zaXRvcnkucmVuYW1lIiwiV2lraS5HaXRXaWtpUmVwb3NpdG9yeS5yZW1vdmVQYWdlIiwiV2lraS5HaXRXaWtpUmVwb3NpdG9yeS5yZW1vdmVQYWdlcyIsIldpa2kuR2l0V2lraVJlcG9zaXRvcnkuZG9HZXQiLCJXaWtpLkdpdFdpa2lSZXBvc2l0b3J5LmRvUG9zdCIsIldpa2kuR2l0V2lraVJlcG9zaXRvcnkuZG9Qb3N0Rm9ybSIsIldpa2kuR2l0V2lraVJlcG9zaXRvcnkuY29tcGxldGVQYXRoIiwiV2lraS5HaXRXaWtpUmVwb3NpdG9yeS5nZXRQYXRoIiwiV2lraS5HaXRXaWtpUmVwb3NpdG9yeS5nZXRMb2dQYXRoIiwiV2lraS5HaXRXaWtpUmVwb3NpdG9yeS5nZXRDb250ZW50IiwiV2lraS5HaXRXaWtpUmVwb3NpdG9yeS5qc29uQ2hpbGRDb250ZW50cyIsIldpa2kuR2l0V2lraVJlcG9zaXRvcnkuZ2l0IiwiRm9yZ2Uub25Sb3V0ZUNoYW5nZWQiLCJGb3JnZS51cGRhdGVTY2hlbWEiLCJGb3JnZS52YWxpZGF0ZSIsIkZvcmdlLnRvQmFja2dyb3VuZFN0eWxlIiwiRm9yZ2UudXBkYXRlRGF0YSIsIkZvcmdlLm9uU2NoZW1hTG9hZCIsIkZvcmdlLmNvbW1hbmRNYXRjaGVzIiwiRm9yZ2UuZG9EZWxldGUiLCJGb3JnZS51cGRhdGVMaW5rcyJdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQ2VBLElBQU8sSUFBSSxDQWVWO0FBZkQsV0FBTyxJQUFJLEVB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QUF0QkEsZUFBc0JBO1FBQy9FQSxJQUFJQSxJQUFJQSxHQUFVQSxJQUFJQSxDQUFDQTtRQUN2QkEsSUFBSUEsS0FBS0EsR0FBR0EsU0FBU0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0E7UUFDOUJBLEVBQUVBLENBQUNBLENBQUNBLE1BQU1BLENBQUNBLENBQUNBLENBQUNBO1lBRVhBLElBQUlBLElBQUlBLEdBQUdBLFdBQVdBLENBQUNBLE1BQU1BLENBQUNBLEdBQUdBLFFBQVFBLEdBQUdBLFFBQVFBLENBQUNBO1lBQ3JEQSxJQUFJQSxHQUFHQSxLQUFLQSxHQUFHQSxJQUFJQSxHQUFHQSxVQUFVQSxDQUFDQSxJQUFJQSxDQUFDQSxXQUFXQSxDQUFDQSxNQUFNQSxFQUFFQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFDQTtRQUNsRUEsQ0FBQ0E7UUFBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0E7WUFFTkEsSUFBSUEsSUFBSUEsR0FBVUEsU0FBU0EsQ0FBQ0EsSUFBSUEsRUFBRUEsQ0FBQ0E7WUFDbkNBLElBQUlBLEdBQUdBLEdBQUdBLEdBQUdBLElBQUlBLENBQUNBLE9BQU9BLENBQUNBLGVBQWVBLEVBQUVBLE1BQU1BLENBQUNBLENBQUNBO1FBQ3JEQSxDQUFDQTtRQUNEQSxFQUFFQSxDQUFDQSxDQUFDQSxRQUFRQSxJQUFJQSxNQUFNQSxJQUFJQSxNQUFNQSxDQUFDQSxRQUFRQSxDQUFDQSxRQUFRQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUNwREEsTUFBTUEsQ0FBQ0EsSUFBSUEsQ0FBQ0E7UUFDZEEsQ0FBQ0E7UUFDREEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsUUFBUUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7WUFDYkEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsUUFBUUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0JBQ3hCQSxJQUFJQSxJQUFJQSxHQUFHQSxDQUFDQTtZQUNkQSxDQUFDQTtZQUNEQSxJQUFJQSxJQUFJQSxRQUFRQSxDQUFDQTtRQUNuQkEsQ0FBQ0E7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QUNBO1FBQ3RDQSxJQUFJQSxPQUFPQSxHQUFHQSxHQUFHQSxDQUFDQSxPQUFPQSxDQUFDQTtRQUMxQkEsSUFBSUEsTUFBTUEsR0FBR0EsR0FBR0EsQ0FBQ0EsTUFBTUEsQ0FBQ0E7UUFDeEJBLEVBQUVBLENBQUNBLENBQUNBLE1BQU1BLENBQUNBLENBQUNBLENBQUNBO1lBQ1hBLElBQUlBLEdBQUdBLElBQUlBLElBQUlBLE1BQU1BLENBQUNBLElBQUlBLENBQUNBO1lBQzNCQSxJQUFJQSxHQUFHQSxJQUFJQSxJQUFJQSxNQUFNQSxDQUFDQSxJQUFJQSxDQUFDQTtZQUMzQkEsTUFBTUEsR0FBR0EsTUFBTUEsSUFBSUEsTUFBTUEsQ0FBQ0EsTUFBTUEsQ0FBQ0E7WUFDakNBLFNBQVNBLEdBQUdBLFNBQVNBLElBQUlBLE1BQU1BLENBQUNBLFNBQVNBLENBQUNBO1lBQzFDQSxhQUFhQSxHQUFHQSxhQUFhQSxJQUFJQSxNQUFNQSxDQUFDQSxhQUFhQSxDQUFDQTtZQUN0REEsT0FBT0EsR0FBR0EsT0FBT0EsSUFBSUEsTUFBTUEsQ0FBQ0EsT0FBT0EsQ0FBQ0E7UUFDdENBLENBQUNBO1FBQ0RBLE1BQU1BLEdBQUdBLE1BQU1BLElBQUlBLFFBQVFBLENBQUNBO1FBQzVCQSxJQUFJQSxHQUFHQSxHQUFHQSxJQUFJQSxDQUFDQTtRQUNmQSxJQUFJQSxJQUFJQSxHQUFVQSxJQUFJQSxDQUFDQTtRQUN2QkEsSUFBSUEsU0FBU0EsR0FBR0EsYUFBYUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0E7UUFFcENBLEVBQUVBLENBQUNBLENBQUNBLGFBQWFBLElBQUlBLGFBQWFBLENBQUNBLE1BQU1BLENBQUNBLENBQUNBLENBQUNBO1lBQzFDQSxFQUFFQSxDQUFDQSxDQUFDQSxhQUFhQSxDQUFDQSxHQUFHQSxDQUFDQSxVQUFDQSxFQUFFQSxJQUFLQSxPQUFBQSxJQUFJQSxDQUFDQSxlQUFlQSxDQUFDQSxHQUFHQSxDQUFDQSxFQUFFQSxDQUFDQSxFQUE1QkEsQ0FBNEJBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO2dCQUM1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U0EsR0FBR0EsVUFBVUEsQ0FBQ0EsS0FBS0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0E7WUFDdENBLElBQUlBLE9BQU9BLEdBQUdBLEtBQUtBLENBQUNBLE1BQU1BLENBQUNBLFVBQUNBLElBQUlBO2dCQUM5QkEsTUFBTUEsQ0FBQ0EsSUFBSUEsS0FBS0EsSUFBSUEsQ0FBQ0E7WUFDdkJBLENBQUNBLENBQUNBLENBQUNBO1lBQ0hBLEtBQUtBLEdBQUdBLEtBQUtBLENBQUNBLElBQUlBLENBQUNBLEtBQUtBLENBQUNBLE1BQU1BLEdBQUdBLE9BQU9BLENBQUNBLE1BQU1BLENBQUNBLENBQUNBO1lBQ2xEQSxTQUFTQSxHQUFHQSxTQUFTQSxDQUFDQSxLQUFLQSxDQUFDQSxTQUFTQSxDQUFDQSxNQUFNQSxHQUFHQSxPQUFPQSxDQUFDQSxNQUFNQSxDQUFDQSxDQUFDQTtZQUUvREEsTUFBTUEsQ0FBQ0EsR0FBR0EsR0FBR0EsU0FBU0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsR0FBR0EsR0FBR0EsR0FBR0EsS0FBS0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsR0FBR0EsU0FBU0EsR0FBR0EsU0FBU0EsQ0FBQ0EsSUFBSUEsRUFBRUEsQ0FBQ0E7UUFDMUZBLENBQUNBO1FBR0RBLEVBQUVBLENBQUNBLENBQUNBLElBQUlBLENBQUNBLFVBQVVBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO1lBQ3pCQSxNQUFNQSxDQUFDQSxJQUFJQSxDQUFDQSxVQUFVQSxDQUFDQSxNQUFNQSxFQUFFQSxJQUFJQSxHQUFHQSxTQUFTQSxFQUFFQSxTQUFTQSxDQUFDQSxHQUFHQSxTQUFTQSxDQUFDQTtRQUMxRUEsQ0FBQ0E7UUFFREEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EseUJBQXlCQSxDQUFDQSxHQUFHQSxDQUFDQSxVQUFDQSxPQUFPQTtZQUM5Q0EsTUFBTUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsVUFBVUEsQ0FBQ0EsT0FBT0EsQ0FBQ0EsQ0FBQ0E7UUFD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Q0E7UUFFRkEsTUFBTUEsQ0FBQ0EsSUFBSUEsR0FBR0E7WUFDWkEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsUUFBUUEsSUFBSUEsTUFBTUEsQ0FBQ0EsUUFBUUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0JBQ3ZDQSxNQUFNQSxDQUFDQSxNQUFNQSxDQUFDQSxRQUFRQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUMzQkEsQ0FBQ0E7UUFDSEEsQ0FBQ0EsQ0FBQ0E7UUFFRkEsTUFBTUEsQ0FBQ0EsTUFBTUEsR0FBR0E7WUFFZEEsSUFBSUEsSUFBSUEsR0FBR0EsTUFBTUEsQ0FBQ0EsTUFBTUEsR0FBR0EsR0FBR0EsR0FBR0EsTUFBTUEsQ0FBQ0EsUUFBUUEsQ0FBQ0E7WUFDakRBLE9BQU9BLENBQUNBLEdBQUdBLENBQUNBLHVCQUF1QkEsR0FBR0EsSUFBSUEsQ0FBQ0EsQ0FBQ0E7WUFDNUNBLE1BQU1BLENBQUNBLElBQUlBLENBQUNBLENBQUNBO1FBQ2ZBLENBQUNBLENBQUNBO1FBRUZBLE1BQU1BLENBQUNBLFFBQVFBLEdBQUdBLFVBQUNBLElBQUlBLEVBQUVBLElBQUlBO1lBQzNCQSxFQUFFQSxDQUFDQSxDQUFDQSxRQUFRQSxFQUFFQSxDQUFDQSxDQUFDQSxDQUFDQTtnQkFDZkEsTUFBTUEsQ0FBQ0EsTUFBTUEsRUFBRUEsQ0FBQ0E7WUFDbEJBLENBQUNBO1lBQUNBLElBQUlBLENBQUNBLENBQUNBO2dCQUNOQSxNQUFNQSxDQUFDQSxJQUFJQSxFQUFFQSxDQUFDQTtZQUNoQkEsQ0FBQ0E7UUFDSEEsQ0FBQ0EsQ0FBQ0E7UUFFRkEsTUFBTUEsQ0FBQ0EsUUFBUUEsR0FBR0EsVUFBQ0EsSUFBSUE7WUFDckJBLFVBQVVBLENBQUNBO2dCQUNUQSxRQUFRQSxFQUFFQSxDQUFDQTtnQkFDWEEsSUFBSUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQUE7WUFDckJBLENBQUNBLEVBQUVBLEVBQUVBLENBQUNBLENBQUNBO1FBQ1RBLENBQUNBLENBQUNBO1FBR0ZBLFVBQVVBLEVBQUVBLENBQUNB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QUFJQSxXQUFXQSxHQUFHQSxPQUFPQSxDQUFDQSxRQUFRQSxDQUFDQSxNQUFNQSxDQUFDQSxVQUFDQSxHQUFHQTtvQkFDNUNBLE1BQU1BLENBQUNBLEdBQUdBLENBQUNBLFNBQVNBLENBQUNBO2dCQUN2QkEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0JBQ0hBLElBQUlBLFFBQVFBLEdBQUdBLE9BQU9BLENBQUNBLFFBQVFBLENBQUNBLE1BQU1BLENBQUNBLFVBQUNBLEdBQUdBO29CQUN6Q0EsTUFBTUEsQ0FBQ0EsS0FBS0EsQ0FBQ0E7Z0JBQ2ZBLENBQUNBLENBQUNBLENBQUNBO2dCQUNIQSxJQUFJQSxLQUFLQSxHQUFHQSxPQUFPQSxDQUFDQSxRQUFRQSxDQUFDQSxNQUFNQSxDQUFDQSxVQUFDQSxJQUFJQTtvQkFDdkNBLE1BQU1BLENBQUNBLENBQUNBLElBQUlBLENBQUNBLFNBQVNBLENBQUNBO2dCQUN6QkEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0JBQ0hBLFdBQVdBLEdBQUdBLFdBQVdBLENBQUNBLE1BQU1BLENBQUNBLFVBQUNBLEdBQUdBO29CQUNuQ0EsTUFBTUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsSUFBSUEsQ0FBQ0E7Z0JBQ2xCQSxDQUFDQSxDQUFDQSxDQUFDQTtnQkFDSEEsUUFBUUEsR0FBR0EsUUFBUUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsVUFBQ0EsR0FBR0E7b0JBQzdCQSxNQUFNQSxDQUFDQSxHQUFHQSxDQUFDQSxJQUFJQSxDQUFDQTtnQkFDbEJBLENBQUNBLENBQUNBLENBQUNBO2dCQUNIQSxLQUFLQSxHQUFHQSxLQUFLQSxDQUFDQSxNQUFNQSxDQUFDQSxVQUFDQSxJQUFJQTtvQkFDeEJBLE1BQU1BLENBQUNBLElBQUlBLENBQUNBLElBQUlBLENBQUNBO2dCQUNuQkEsQ0FBQ0EsQ0FBQ0EsQ0FDQ0EsTUFBTUEsQ0FBQ0EsVUFBQ0EsSUFBSUE7b0JBQ1hBLE1BQU1BLENBQUNBLElBQUlBLENBQUNBLElBQUlBLENBQUNBLEtBQUtBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLElBQUlBLEVBQUVBLENBQUNBO2dCQUNyQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0JBRUxBLE1BQU1BLENBQUNBLFFBQVFBLEdBQVNBLEtBQU1BLENBQUNBLE1BQU1BLENBQUNBLFdBQVdBLEVBQUVBLFFBQVFBLEVBQUVBLEtBQUtBLENBQUNBLENBQUNBLEdBQUdBLENBQUNBLFVBQUNBLElBQUlBO29CQUMzRUEsSUFBSUEsQ0FBQ0EsTUFBTUEsR0FBR0EsTUFBTUEsQ0FBQ0EsTUFBTUEsQ0FBQ0E7b0JBQzVCQSxJQUFJQSxDQUFDQSxRQUFRQSxHQUFHQSxJQUFJQSxDQUFDQSxJQUFJQSxDQUFDQTtvQkFDMUJBLEVBQUVBLENBQUNBLENBQUNBLElBQUlBLENBQUNBLFNBQVNBLENBQUNBLENBQUNBLENBQUNBO3dCQUNuQkEsSUFBSUEsQ0FBQ0EsUUFBUUEsSUFBSUEsTUFBTUEsQ0FBQ0E7b0JBQzFCQSxDQUFDQTtvQkFDREEsSUFBSUEsQ0FBQ0EsV0FBV0EsR0FBR0EsSUFBSUEsQ0FBQ0EsVUFBVUEsQ0FBQ0EsTUFBTUEsRUFBRUEsSUFBSUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0E7b0JBQ3REQSxNQUFNQSxDQUFDQSxJQUFJQSxDQUFDQTtnQkFDZEEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7WUFDTEEsQ0FBQ0E7WUFHREEsTUFBTUEsQ0FBQ0EsSUFBSUEsR0FBR0EsSUFBSUEsQ0FBQ0E7WUFDbkJBLE1BQU1BLENBQUNBLE1BQU1BLEdBQUdBLElBQUlBLENBQUNBO1lBQ3JCQSxNQUFNQSxDQUFDQSxVQUFVQSxHQUFHQSxJQUFJQSxDQUFDQTtZQUV6QkEsTUFBTUEsQ0FBQ0EsTUFBTUEsR0FBR0EsS0FBS0EsQ0FBQ0E7WUFDdEJBLEVBQUVBLENBQUNBLENBQUNBLE1BQU1BLENBQUNBLFFBQVFBLENBQUNBLENBQUNBLENBQUNBO2dCQUNwQkEsTUFBTUEsQ0FBQ0EsVUFBVUEsQ0FBQ0EsV0FBV0EsQ0FBQ0EsQ0FBQ0E7Z0JBRS9CQSxJQUFJQSxJQUFJQSxHQUFHQSxNQUFNQSxDQUFDQSxRQUFRQSxDQUFDQSxJQUFJQSxDQUFDQSxVQUFDQSxJ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QUFHQSxNQUFNQSxDQUFDQSxJQUFJQSxHQUFHQSxJQUFJQSxDQUFDQTt3QkFDckRBLElBQUlBLENBQUNBLE1BQU1BLENBQUNBLE1BQU1BLENBQUNBLENBQUNBO29CQUN0QkEsQ0FBQ0E7b0JBQUNBLElBQUlBLENBQUNBLENBQUNBO29CQUVSQSxDQUFDQTtnQkFDSEEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7WUFDTEEsQ0FBQ0E7UUFDSEEsQ0FBQ0E7UUFHRHhELE1BQU1BLENBQUNBLFdBQVdBLEdBQUdBLFVBQUNBLFFBQVFBLEVBQUVBLEVBQUVBO1lBQ2hDQSxJQUFJQSxNQUFNQSxHQUFHQSxRQUFRQSxDQUFDQTtZQUN0QkEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsU0FBU0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0JBQ3JCQSxNQUFNQSxHQUFHQSxNQUFNQSxDQUFDQSxNQUFNQSxHQUFHQSxHQUFHQSxHQUFHQSxRQUFRQSxDQUFDQTtZQUMxQ0EsQ0FBQ0E7WUFBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0E7Z0JBQ05BLElBQUlBLFNBQVNBLEdBQUdBLE1BQU1BLENBQUNBLE1BQU1BLENBQUNBLEtBQUtBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBO2dCQUN6Q0EsU0FBU0EsR0FBR0EsU0FBU0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsU0FBU0EsQ0FBQ0EsSUFBSUEsRUFBRUEsQ0FBQ0EsQ0FBQ0E7Z0JBQy9DQSxTQUFTQSxDQUFDQSxJQUFJQSxDQUFDQSxRQUFRQSxDQUFDQSxDQUFDQTtnQkFDekJBLE1BQU1BLEdBQUdBLFNBQVNBLENBQUNBLElBQUlBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBO1lBQy9CQSxDQUFDQTtZQUNEQSxRQUFHQSxDQUFDQSxLQUFLQSxDQUFDQSxVQUFVQSxFQUFFQSxNQUFNQSxDQUFDQSxNQUFNQSxDQUFDQSxDQUFDQTtZQUNyQ0EsUUFBR0EsQ0FBQ0EsS0FBS0EsQ0FBQ0EsVUFBVUEsRUFBRUEsTUFBTUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0E7WUFDckNBLFFBQUdBLENBQUNBLEtB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QTtZQUN6QkEsSUFBSUEsUUFBUUEsR0FBR0EsTUFBTUEsQ0FBQ0EsTUFBTUEsQ0FBQ0E7WUFDN0JBLElBQUlBLENBQUNBLE9BQU9BLEdBQUdBLFVBQVVBLENBQUNBLElBQUlBLENBQUNBLFdBQVdBLEVBQUVBLFlBQVlBLEVBQUVBLEtBQUtBLEVBQUVBLFFBQVFBLENBQUNBLENBQUNBO1FBQzdFQSxDQUFDQTtRQUVNRCxtQ0FBT0EsR0FBZEEsVUFBZUEsTUFBYUEsRUFBRUEsSUFBV0EsRUFBRUEsUUFBZUEsRUFBRUEsRUFBRUE7WUFFNURFLElBQUlBLEtBQUtBLEdBQUdBLElBQUlBLENBQUNBO1lBQ2pCQSxFQUFFQSxDQUFDQSxDQUFDQSxNQUFNQSxDQUFDQSxDQUFDQSxDQUFDQTtnQkFDWEEsS0FBS0EsR0FBR0EsTUFBTUEsR0FBR0EsTUFBTUEsQ0FBQ0E7WUFDMUJBLENBQUNBO1lBQ0RBLElBQUlBLENBQUNBLEtBQUtBLENBQUNBLFVBQVVBLENBQUNBLElBQUlBLENBQUNBLFNBQVNBLEVBQUVBLElBQUlBLElBQUlBLEdBQUdBLENBQUNBLEVBQUVBLEtBQUtBLEVBQ3ZEQSxVQUFDQSxJQUFJQSxFQUFFQSxNQUFNQSxFQUFFQSxPQUFPQSxFQUFFQSxNQUFNQTtnQkFDNUJBLEVBQUVBLENBQUNBLENBQUNBLElBQUlBLENBQUNBLENBQUNBLENBQUNBO29CQUNUQSxJQUFJQSxPQUFPQSxHQUFRQSxJQUFJQSxDQUFDQTtvQkFDeEJBLEVBQUVBLENBQUNBLENBQUNBLE9BQU9BLENBQUNBLE9BQU9BLENBQUNBLElBQUlBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO3dCQUMxQkEsT0FBT0EsQ0FBQ0EsT0FBT0EsQ0FBQ0EsSUFBSUEsRUFBRUEsVUFBQ0EsSUFBSUE7NEJBQ3pCQSxFQUFFQSxDQUFDQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSxTQUFTQSxJQUFJQSxJQUFJQSxDQUFDQSxJQUFJQSxLQUFLQSxLQUFLQSxDQUFDQSxDQUFDQSxDQUFDQTtnQ0FDM0NBLElBQUlBLENBQUNBLFNBQVNBLEdBQUdBLElBQUlBLENBQUNBOzRCQUN4QkEsQ0FBQ0E7d0JBQ0hBLENBQUNBLENBQUNBLENBQUNBO3dCQUNIQSxPQUFPQSxHQUFHQTs0QkFDUkEsU0FBU0EsRUFBRUEsSUFBSUE7NEJBQ2ZBLFFBQVFBLEVBQUVBLElBQUlBO3lCQUNmQSxDQUFBQTtvQkFDSEEsQ0FBQ0E7b0JBQUNBLElBQUlBLENBQUNBLENBQUNBO3dCQUNOQSxPQUFPQSxHQUFHQSxJQUFJQSxDQUFDQTt3QkFDZkEsSUFBSUEsT0FBT0EsR0FBR0EsSUFBSUEsQ0FBQ0EsT0FBT0EsQ0FBQ0E7d0JBQzNCQSxFQUFFQSxDQUFDQSxDQUFDQSxPQUFPQSxDQUFDQSxDQUFDQSxDQUFDQTs0QkFDWkEsT0FBT0EsQ0FBQ0EsSUFBSUEsR0FBR0EsT0FBT0EsQ0FBQ0EsWUFBWUEsRUFBRUEsQ0FBQ0E7d0JBQ3hDQSxDQUFDQTtvQkFDSEEsQ0FBQ0E7b0JBQ0RBLEVBQUVBLENBQUNBLE9BQU9BLENBQUNBLENBQUNBO2dCQUNkQSxDQUFDQTtZQUNIQSxDQUFDQSxDQUFDQSxDQUFDQTtRQUNQQSxDQUFDQTtRQUVNRixtQ0FBT0EsR0FBZEEsVUFBZUEsTUFBYUEsRUFBRUEsSUFBV0EsRUFBRUEsUUFBZUEsRUFBRUEsYUFBb0JBLEVBQUVBLEVBQUVBO1lBQ2xGRyxJQUFJQSxLQUFLQSxHQUFHQSxJQUFJQSxDQUFDQTtZQUNqQkEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0JBQ1hBLEtBQUtBLEdBQUdBLE1BQU1BLEdBQUdBLE1BQU1BLENBQUNBO1lBQzFCQSxDQUFDQTtZQUNEQSxFQUFFQSxDQUFDQSxDQUFDQSxhQUFhQSxDQUFDQSxDQUFDQSxDQUFDQTtnQkFDbEJBLEtBQUtBLEdBQUdBLENBQUNBLEtBQUtBLEdBQUdBLEtBQUtBLEdBQUdBLEdBQUdBLEdBQUdBLEVBQUVBLENBQUNBLEdBQUdBLFVBQVVBLEdBQUdBLGtCQUFrQkEsQ0FBQ0EsYUFBYUEsQ0FBQ0EsQ0FBQ0E7WUFDdEZBLENBQUNBO1lBQ0RBLElBQUlBLElBQUlBLEdBQUdBLFFBQVFBLENBQUNBO1lBQ3BCQSxJQUFJQSxDQUFDQSxNQUFNQSxDQUFDQSxVQUFVQSxDQUFDQSxJQUFJQSxDQUFDQSxTQUFTQSxFQUFFQSxJQUFJQSxJQUFJQSxHQUFHQSxDQUFDQSxFQUFFQSxLQUFLQSxFQUFFQSxJQUFJQSxFQUM5REEsVUFBQ0EsSUFBSUEsRUFBRUEsTUFBTUEsRUFBRUEsT0FBT0EsRUFBRUEsTUFBTUE7Z0JBQzVCQSxFQUFFQSxDQUFDQSxJQUFJQSxDQUFDQSxDQUFDQTtZQUNYQSxDQUFDQSxDQUFDQSxDQUFDQTtRQUNQQSxDQUFDQTtRQWFNSCxtQ0FBT0EsR0FBZEEsVUFBZUEsTUFBYUEsRUFBRUEsUUFBZUEsRUFBRUEsSUFBV0EsRUFBRUEsS0FBWUEsRUFBRUEsRUFBRUE7WUFDMUVJLElBQUlBLEtBQUtBLEdBQUdBLElBQUlBLENBQUNBO1lBQ2pCQSxFQUFFQSxDQUFDQSxDQUFDQSxNQUFNQSxDQUFDQSxDQUFDQSxDQUFDQTtnQkFDWEEsS0FBS0EsR0FBR0EsTUFBTUEsR0FBR0EsTUFBTUEsQ0FBQ0E7WUFDMUJBLENBQUNBO1lBQ0RBLEVBQUVBLENBQUNBLENBQUNBLEtBQUtBLENBQUNBLENBQUNBLENBQUNBO2dCQUNWQSxLQUFLQSxHQUFHQSxDQUFDQSxLQUFLQSxHQUFHQSxLQUFLQSxHQUFHQSxHQUFHQSxHQUFHQSxFQUFFQSxDQUFDQSxHQUFHQSxRQUFRQSxHQUFHQSxLQUFLQSxDQUFDQTtZQUN4REEsQ0FBQ0E7WUFDREEsSUFBSUEsUUFBUUEsR0FBR0EsUUFBUUEsSUFBSUEsTUFBTUEsQ0FBQ0E7WUFDbENBLElBQUlBLENBQUNBLEtBQUtBLENBQUNBLFVBQVVBLENBQUNBLElBQUlBLENBQUNBLFNBQVNBLEVBQUVBLFFBQVFBLEVBQUVBLElBQUlBLENBQUNBLEVBQUVBLEtBQUtBLEVBQzFEQSxVQUFDQSxJQUFJQSxFQUFFQSxNQUFNQSxFQUFFQSxPQUFPQSxFQUFFQSxNQUFNQTtnQkFDNUJBLEVBQUVBLENBQUNBLElBQUlBLENBQUNBLENBQUNBO1lBQ1hBLENBQUNB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QSxDQUFDQSxtQkFBbUJBLEVBQzNEQSxDQUFDQSxRQUFRQSxFQUFFQSxnQkFBZ0JBLEVBQUVBLFdBQVdBLEVBQUVBLGNBQWNBLEVBQUVBLE9BQU9BLEVBQUVBLFVBQVVBLEVBQUVBLGFBQWFBLEVBQUVBLFlBQVlBLEVBQ3hHQSxVQUFDQSxNQUFNQSxFQUFFQSxjQUF1Q0EsRUFBRUEsU0FBNkJBLEVBQUVBLFlBQVlBLEVBQUVBLEtBQUtBLEVBQUVBLFFBQVFBLEVBQUVBLFdBQVdBLEVBQUVBLFVBQVVBO1FBRXJJQSxNQUFNQSxDQUFDQSxLQUFLQSxHQUFHQSxVQUFVQSxDQUFDQTtRQUUxQkEsTUFBTUEsQ0FBQ0EsWUFBWUEsR0FBR0EsWUFBWUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsSUFBSUEsU0FBU0EsQ0FBQ0EsTUFBTUEsRUFBRUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsSUFBSUEsRUFBRUEsQ0FBQ0E7UUFDL0VBLE1BQU1BLENBQUNBLEVBQUVBLEdBQUdBLFlBQVlBLENBQUNBLElBQUlBLENBQUNBLENBQUNBO1FBQy9CQSxNQUFNQSxDQUFDQSxJQUFJQSxHQUFHQSxZQUFZQSxDQUFDQSxNQUFNQSxDQUFDQSxDQUFDQTtRQUVuQ0EsTUFBTUEsQ0FBQ0EsVUFBVUEsR0FBR0EsWUFBWUEsQ0FBQ0EsZUFBZUEsQ0FBQ0EsQ0FBQ0E7UUFDbERBLE1BQU1BLENBQUNBLElBQUlBLEdBQUdBLFlBQVlBLENBQUNBLFVBQVVBLENBQUNBLENBQUNBO1FBQ3ZDQSxNQUFNQSxDQUFDQSxRQUFRQSxHQUFHQSxFQUFFQSxDQUFDQTtRQUNyQkEsSUFBSUEsU0FBU0EsR0FBR0EsTUFBTUEsQ0FBQ0EsWUFBWUEsQ0FBQ0EsS0FBS0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0E7UUFDL0NBLEVBQUVBLENBQUNBLENBQUNBLFNBQVNBLElBQUlBLFNBQVNBLENBQUNBLE1BQU1BLENBQUNBLENBQUNBLENBQUNBO1lBQ2xDQSxNQUFNQSxDQUFDQSxRQUFRQSxHQUFHQSxTQUFTQSxDQUFDQSxTQUFTQSxDQUFDQSxNQUFNQSxHQUFHQSxDQUFD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QSxJQUFJQSxFQUFFQSxDQUFDQTtRQUN0REEsSUFBSUEsU0FBU0EsR0FBR0EsTUFBTUEsQ0FBQ0Esa0JBQWtCQSxDQUFDQSxLQUFLQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQTtRQUNyREEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsU0FBU0EsSUFBSUEsU0FBU0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7WUFDbENBLE1BQU1BLENBQUNBLFFBQVFBLEdBQUdBLFNBQVNBLENBQUNBLFNBQVNBLENBQUNBLE1BQU1BLEdBQUdBLENBQUNBLENBQUNBLENBQUNBO1FBQ3BEQSxDQUFDQTtRQUNEQSxFQUFFQSxDQUFDQSxDQUFDQSxDQUFDQSxNQUFNQSxDQUFDQSxrQkFBa0JBLENBQUNBLFVBQVVBLENBQUNBLEdBQUdBLENBQUNBLElBQUlBLE1BQU1BLENBQUNBLGtCQUFrQkEsQ0FBQ0EsTUFBTUEsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7WUFDdkZBLE1BQU1BLENBQUNBLGtCQUFrQkEsR0FBR0EsR0FBR0EsR0FBR0EsTUFBTUEsQ0FBQ0Esa0JBQWtCQSxDQUFDQTtRQUM5REEsQ0FBQ0E7UUFFREEsTUFBTUEsQ0FBQ0EsVUFBVUEsR0FBR0EsWUFBWUEsQ0FBQ0EsZUFBZUEsQ0FBQ0EsQ0FBQ0E7UUFDbERBLE1BQU1BLENBQUNBLElBQUlBLEdBQUdBLFlBQVlBLENBQUNBLFVBQVVBLENBQUNBLENBQUNBO1FBRXZDQSxNQUFNQSxDQUFDQSxRQUFRQSxHQUFHQSxzQkFBZ0JBLENBQUNBLFVBQVVBLEVBQUVBLE1BQU1BLENBQUNBLFlBQVlBLENBQUNBLENBQUNBO1FBQ3BFQSxNQUFNQSxDQUFDQSxPQUFPQSxHQUFHQSxNQUFNQSxDQUFDQSxRQUFRQSxDQUFDQSxNQUFNQSxLQUFLQSxDQUFDQSxDQUFDQTtRQUU5Q0EsZUFBU0EsQ0FBQ0EsTUFBTUEsRUFBRUEsU0FBU0EsRUFBRUEsWUFBWUEsQ0FBQ0EsQ0FBQ0E7UUFDM0NBLG1DQUE2QkEsQ0FBQ0EsTUFBTUEsRUFBRUEsU0FBU0EsQ0FBQ0EsQ0FB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LEdBQUcsR0FBRyxHQUFHLFlBQVksR0FBRyxNQUFNLEdBQUcsU0FBUyxHQUFHLElBQUksQ0FBQyxDQUFDO29CQUMvRSxDQUFDO2dCQUNILENBQUMsQ0FBQ0EsQ0FBQ0E7WUFDUEEsQ0FBQ0E7UUFDSEEsQ0FBQ0E7UUFFRHZILFVBQVVBLEVBQUVBLENBQUNBO0lBRWZBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO0FBQ1JBLENBQUNBLEVBcE5NLEtBQUssS0FBTCxLQUFLLFFBb05YIiwiZmlsZSI6ImNvbXBpbGVkLmpzIiwic291cmNlc0NvbnRlbnQiOltudWxsLCIvLy8gQ29weXJpZ2h0IDIwMTQtMjAxNSBSZWQgSGF0LCBJbmMuIGFuZC9vciBpdHMgYWZmaWxpYXRlc1xuLy8vIGFuZCBvdGhlciBjb250cmlidXRvcnMgYXMgaW5kaWNhdGVkIGJ5IHRoZSBAYXV0aG9yIHRhZ3MuXG4vLy9cbi8vLyBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuLy8vIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbi8vLyBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbi8vL1xuLy8vICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4vLy9cbi8vLyBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4vLy8gZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuLy8vIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuLy8vIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbi8vLyBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cblxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL2luY2x1ZGVzLnRzXCIvPlxubW9kdWxlIE1haW4ge1xuXG4gIGV4cG9ydCB2YXIgcGx1Z2luTmFtZSA9IFwiZmFicmljOC1jb25zb2xlXCI7XG5cbiAgZXhwb3J0IHZhciBsb2c6IExvZ2dpbmcuTG9nZ2VyID0gTG9nZ2VyLmdldChwbHVnaW5OYW1lKTtcblxuICBleHBvcnQgdmFyIHRlbXBsYXRlUGF0aCA9IFwicGx1Z2lucy9tYWluL2h0bWxcIjtcblxuICAvLyBrdWJlcm5ldGVzIHNlcnZpY2UgbmFtZXNcbiAgZXhwb3J0IHZhciBjaGF0U2VydmljZU5hbWUgPSBcImxldHNjaGF0XCI7XG4gIGV4cG9ydCB2YXIgZ3JhZmFuYVNlcnZpY2VOYW1lID0gXCJncmFmYW5hXCI7XG4gIGV4cG9ydCB2YXIgYXBwTGlicmFyeVNlcnZpY2VOYW1lID0gXCJhcHAtbGlicmFyeVwiO1xuXG4gIGV4cG9ydCB2YXIgdmVyc2lvbjphbnkgPSB7fTtcblxufVxuIiwiLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vaW5jbHVkZXMudHNcIi8+XG5tb2R1bGUgRm9yZ2Uge1xuXG4gIGV4cG9ydCB2YXIgY29udGV4dCA9ICcvd29ya3NwYWNlcy86bmFtZXNwYWNlL2ZvcmdlJztcblxuICBleHBvcnQgdmFyIGhhc2ggPSAnIycgKyBjb250ZXh0O1xuICBleHBvcnQgdmFyIHBsdWdpbk5hbWUgPSAnRm9yZ2UnO1xuICBleHBvcnQgdmFyIHBsdWdpblBhdGggPSAncGx1Z2lucy9mb3JnZS8nO1xuICBleHBvcnQgdmFyIHRlbXBsYXRlUGF0aCA9IHBsdWdpblBhdGggKyAnaHRtbC8nO1xuICBleHBvcnQgdmFyIGxvZzpMb2dnaW5nLkxvZ2dlciA9IExvZ2dlci5nZXQocGx1Z2luTmFtZSk7XG5cbiAgZXhwb3J0IHZhciBkZWZhdWx0SWNvblVybCA9IENvcmUudXJsKFwiL2ltZy9mb3JnZS5zdmdcIik7XG5cbiAgZXhwb3J0IHZhciBnb2dzU2VydmljZU5hbWUgPSBLdWJlcm5ldGVzLmdvZ3NTZXJ2aWNlTmFtZTtcbiAgZXhwb3J0IHZhciBvcmlvblNlcnZpY2VOYW1lID0gXCJvcmlvblwiO1xuXG4gIGV4cG9ydCB2YXIgbG9nZ2VkSW5Ub0dvZ3MgPSBmYWxzZTtcblxuICBleHBvcnQgZnVuY3Rpb24gaXNGb3JnZSh3b3Jrc3BhY2UpIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiBpbml0U2NvcGUoJHNjb3BlLCAkbG9jYXRpb24sICRyb3V0ZVBhcmFtcykge1xuICAgICRzY29wZS5wcm9qZWN0SWQgPSAkcm91dGVQYXJhbXNbXCJwcm9qZWN0XCJdO1xuICAgICRzY29wZS4kd29ya3NwYWNlTGluayA9IERldmVsb3Blci53b3Jrc3BhY2VMaW5rKCk7XG4gICAgJHNjb3BlLiRwcm9qZWN0TGluayA9IERldmVsb3Blci5wcm9qZWN0TGluaygkc2NvcGUucHJvamVjdElkKTtcbiAgICAkc2NvcGUuYnJlYWRjcnVtYkNvbmZpZyA9IERldmVsb3Blci5jcmVhdGVQcm9qZWN0QnJlYWRjcnVtYnMoJHNjb3BlLnByb2plY3RJZCk7XG4gICAgJHNjb3BlLnN1YlRhYkNvbmZpZyA9IERldmVsb3Blci5jcmVhdGVQcm9qZWN0U3ViTmF2QmFycygkc2NvcGUucHJvamVjdElkKTtcbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiBjb21tYW5kTGluayhwcm9qZWN0SWQsIG5hbWUsIHJlc291cmNlUGF0aCkge1xuICAgIHZhciBsaW5rID0gRGV2ZWxvcGVyLnByb2plY3RMaW5rKHByb2plY3RJZCk7XG4gICAgaWYgKG5hbWUpIHtcbiAgICAgIGlmIChyZXNvdXJjZVBhdGgpIHtcbiAgICAgICAgcmV0dXJuIFVybEhlbHBlcnMuam9pbihsaW5rLCBcIi9mb3JnZS9jb21tYW5kXCIsIG5hbWUsIHJlc291cmNlUGF0aCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gVXJsSGVscGVycy5qb2luKGxpbmssIFwiL2ZvcmdlL2NvbW1hbmQvXCIsIG5hbWUpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiBjb21tYW5kc0xpbmsocmVzb3VyY2VQYXRoLCBwcm9qZWN0SWQpIHtcbiAgICB2YXIgbGluayA9IERldmVsb3Blci5wcm9qZWN0TGluayhwcm9qZWN0SWQpO1xuICAgIGlmIChyZXNvdXJjZVBhdGgpIHtcbiAgICAgIHJldHVybiBVcmxIZWxwZXJzLmpvaW4obGluaywgXCIvZm9yZ2UvY29tbWFuZHMvdXNlclwiLCByZXNvdXJjZVBhdGgpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gVXJsSGVscGVycy5qb2luKGxpbmssIFwiL2ZvcmdlL2NvbW1hbmRzXCIpO1xuICAgIH1cbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiByZXBvc0FwaVVybChGb3JnZUFwaVVSTCkge1xuICAgIHJldHVybiBVcmxIZWxwZXJzLmpvaW4oRm9yZ2VBcGlVUkwsIFwiL3JlcG9zXCIpO1xuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIHJlcG9BcGlVcmwoRm9yZ2VBcGlVUkwsIHBhdGgpIHtcbiAgICByZXR1cm4gVXJsSGVscGVycy5qb2luKEZvcmdlQXBpVVJMLCBcIi9yZXBvcy91c2VyXCIsIHBhdGgpO1xuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIGNvbW1hbmRBcGlVcmwoRm9yZ2VBcGlVUkwsIGNvbW1hbmRJZCwgcmVzb3VyY2VQYXRoID0gbnVsbCkge1xuICAgIHJldHVybiBVcmxIZWxwZXJzLmpvaW4oRm9yZ2VBcGlVUkwsIFwiY29tbWFuZFwiLCBjb21tYW5kSWQsIHJlc291cmNlUGF0aCk7XG4gIH1cblxuICBleHBvcnQgZnVuY3Rpb24gZXhlY3V0ZUNvbW1hbmRBcGlVcmwoRm9yZ2VBcGlVUkwsIGNvbW1hbmRJZCkge1xuICAgIHJldHVybiBVcmxIZWxwZXJzLmpvaW4oRm9yZ2VBcGlVUkwsIFwiY29tbWFuZFwiLCBcImV4ZWN1dGVcIiwgY29tbWFuZElkKTtcbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiB2YWxpZGF0ZUNvbW1hbmRBcGlVcmwoRm9yZ2VBcGlVUkwsIGNvbW1hbmRJZCkge1xuICAgIHJldHVybiBVcmxIZWxwZXJzLmpvaW4oRm9yZ2VBcGlVUkwsIFwiY29tbWFuZFwiLCBcInZhbGlkYXRlXCIsIGNvbW1hbmRJZCk7XG4gIH1cblxuICBleHBvcnQgZnVuY3Rpb24gY29tbWFuZElucHV0QXBpVXJsKEZvcmdlQXBpVVJMLCBjb21tYW5kSWQsIHJlc291cmNlUGF0aCkge1xuICAgIHJldHVybiBVcmxIZWxwZXJzLmpvaW4oRm9yZ2VBcGlVUkwsIFwiY29tbWFuZElucHV0XCIsIGNvbW1hbmRJZCwgcmVzb3VyY2VQYXRoKTtcbiAgfVxuXG5cblxuICAvKipcbiAgICogUmV0dXJucyB0aGUgcHJvamVjdCBmb3IgdGhlIGdpdmVuIHJlc291cmNlIHBhdGhcbiAgICovXG4gIGZ1bmN0aW9uIG1vZGVsUHJvamVjdChGb3JnZU1vZGVsLCByZXNvdXJjZVBhdGgpIHtcbiAgICBpZiAocmVzb3VyY2VQYXRoKSB7XG4gICAgICB2YXIgcHJvamVjdCA9IEZvcmdlTW9kZWwucHJvamVjdHNbcmVzb3VyY2VQYXRoXTtcbiAgICAgIGlmICghcHJvamVjdCkge1xuICAgICAgICBwcm9qZWN0ID0ge307XG4gICAgICAgIEZvcmdlTW9kZWwucHJvamVjdHNbcmVzb3VyY2VQYXRoXSA9IHByb2plY3Q7XG4gICAgICB9XG4gICAgICByZXR1cm4gcHJvamVjdDtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIEZvcmdlTW9kZWwucm9vdFByb2plY3Q7XG4gICAgfVxuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIHNldE1vZGVsQ29tbWFuZHMoRm9yZ2VNb2RlbCwgcmVzb3VyY2VQYXRoLCBjb21tYW5kcykge1xuICAgIHZhciBwcm9qZWN0ID0gbW9kZWxQcm9qZWN0KEZvcmdlTW9kZWwsIHJlc291cmNlUGF0aCk7XG4gICAgcHJvamVjdC4kY29tbWFuZHMgPSBjb21tYW5kcztcbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiBnZXRNb2RlbENvbW1hbmRzKEZvcmdlTW9kZWwsIHJlc291cmNlUGF0aCkge1xuICAgIHZhciBwcm9qZWN0ID0gbW9kZWxQcm9qZWN0KEZvcmdlTW9kZWwsIHJlc291cmNlUGF0aCk7XG4gICAgcmV0dXJuIHByb2plY3QuJGNvbW1hbmRzIHx8IFtdO1xuICB9XG5cbiAgZnVuY3Rpb24gbW9kZWxDb21tYW5kSW5wdXRNYXAoRm9yZ2VNb2RlbCwgcmVzb3VyY2VQYXRoKSB7XG4gICAgdmFyIHByb2plY3QgPSBtb2RlbFByb2plY3QoRm9yZ2VNb2RlbCwgcmVzb3VyY2VQYXRoKTtcbiAgICB2YXIgY29tbWFuZElucHV0cyA9IHByb2plY3QuJGNvbW1hbmRJbnB1dHM7XG4gICAgaWYgKCFjb21tYW5kSW5wdXRzKSB7XG4gICAgICBjb21tYW5kSW5wdXRzID0ge307XG4gICAgICBwcm9qZWN0LiRjb21tYW5kSW5wdXRzID0gY29tbWFuZElucHV0cztcbiAgICB9XG4gICAgcmV0dXJuIGNvbW1hbmRJbnB1dHM7XG4gIH1cblxuICBleHBvcnQgZnVuY3Rpb24gZ2V0TW9kZWxDb21tYW5kSW5wdXRzKEZvcmdlTW9kZWwsIHJlc291cmNlUGF0aCwgaWQpIHtcbiAgICB2YXIgY29tbWFuZElucHV0cyA9IG1vZGVsQ29tbWFuZElucHV0TWFwKEZvcmdlTW9kZWwsIHJlc291cmNlUGF0aCk7XG4gICAgcmV0dXJuIGNvbW1hbmRJbnB1dHNbaWRdO1xuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIHNldE1vZGVsQ29tbWFuZElucHV0cyhGb3JnZU1vZGVsLCByZXNvdXJjZVBhdGgsIGlkLCBpdGVtKSB7XG4gICAgdmFyIGNvbW1hbmRJbnB1dHMgPSBtb2RlbENvbW1hbmRJbnB1dE1hcChGb3JnZU1vZGVsLCByZXNvdXJjZVBhdGgpO1xuICAgIHJldHVybiBjb21tYW5kSW5wdXRzW2lkXSA9IGl0ZW07XG4gIH1cblxuICBleHBvcnQgZnVuY3Rpb24gZW5yaWNoUmVwbyhyZXBvKSB7XG4gICAgdmFyIG93bmVyID0gcmVwby5vd25lciB8fCB7fTtcbiAgICB2YXIgdXNlciA9IG93bmVyLnVzZXJuYW1lIHx8IHJlcG8udXNlcjtcbiAgICB2YXIgbmFtZSA9IHJlcG8ubmFtZTtcbiAgICB2YXIgcHJvamVjdElkID0gbmFtZTtcbiAgICB2YXIgYXZhdGFyX3VybCA9IG93bmVyLmF2YXRhcl91cmw7XG4gICAgaWYgKGF2YXRhcl91cmwgJiYgYXZhdGFyX3VybC5zdGFydHNXaXRoKFwiaHR0cC8vXCIpKSB7XG4gICAgICBhdmF0YXJfdXJsID0gXCJodHRwOi8vXCIgKyBhdmF0YXJfdXJsLnN1YnN0cmluZyg2KTtcbiAgICAgIG93bmVyLmF2YXRhcl91cmwgPSBhdmF0YXJfdXJsO1xuICAgIH1cbiAgICBpZiAodXNlciAmJiBuYW1lKSB7XG4gICAgICB2YXIgcmVzb3VyY2VQYXRoID0gdXNlciArIFwiL1wiICsgbmFtZTtcbiAgICAgIHJlcG8uJGNvbW1hbmRzTGluayA9IGNvbW1hbmRzTGluayhyZXNvdXJjZVBhdGgsIHByb2plY3RJZCk7XG4gICAgICByZXBvLiRidWlsZHNMaW5rID0gXCIva3ViZXJuZXRlcy9idWlsZHM/cT0vXCIgKyByZXNvdXJjZVBhdGggKyBcIi5naXRcIjtcbiAgICAgIHZhciBpbmplY3RvciA9IEhhd3Rpb0NvcmUuaW5qZWN0b3I7XG4gICAgICBpZiAoaW5qZWN0b3IpIHtcbiAgICAgICAgdmFyIFNlcnZpY2VSZWdpc3RyeSA9IGluamVjdG9yLmdldChcIlNlcnZpY2VSZWdpc3RyeVwiKTtcbiAgICAgICAgaWYgKFNlcnZpY2VSZWdpc3RyeSkge1xuICAgICAgICAgIHZhciBvcmlvbkxpbmsgPSBTZXJ2aWNlUmVnaXN0cnkuc2VydmljZUxpbmsob3Jpb25TZXJ2aWNlTmFtZSk7XG4gICAgICAgICAgdmFyIGdvZ3NTZXJ2aWNlID0gU2VydmljZVJlZ2lzdHJ5LmZpbmRTZXJ2aWNlKGdvZ3NTZXJ2aWNlTmFtZSk7XG4gICAgICAgICAgaWYgKG9yaW9uTGluayAmJiBnb2dzU2VydmljZSkge1xuICAgICAgICAgICAgdmFyIHBvcnRhbElwID0gZ29nc1NlcnZpY2UucG9ydGFsSVA7XG4gICAgICAgICAgICBpZiAocG9ydGFsSXApIHtcbiAgICAgICAgICAgICAgdmFyIHBvcnQgPSBnb2dzU2VydmljZS5wb3J0O1xuICAgICAgICAgICAgICB2YXIgcG9ydFRleHQgPSAocG9ydCAmJiBwb3J0ICE9PSA4MCAmJiBwb3J0ICE9PSA0NDMpID8gXCI6XCIgKyBwb3J0IDogXCJcIjtcbiAgICAgICAgICAgICAgdmFyIHByb3RvY29sID0gKHBvcnQgJiYgcG9ydCA9PT0gNDQzKSA/IFwiaHR0cHM6Ly9cIiA6IFwiaHR0cDovL1wiO1xuICAgICAgICAgICAgICB2YXIgZ2l0Q2xvbmVVcmwgPSBVcmxIZWxwZXJzLmpvaW4ocHJvdG9jb2wgKyBwb3J0YWxJcCArIHBvcnRUZXh0ICsgXCIvXCIsIHJlc291cmNlUGF0aCArIFwiLmdpdFwiKTtcblxuICAgICAgICAgICAgICByZXBvLiRvcGVuUHJvamVjdExpbmsgPSBVcmxIZWxwZXJzLmpvaW4ob3Jpb25MaW5rLFxuICAgICAgICAgICAgICAgIFwiL2dpdC9naXQtcmVwb3NpdG9yeS5odG1sIyxjcmVhdGVQcm9qZWN0Lm5hbWU9XCIgKyBuYW1lICsgXCIsY2xvbmVHaXQ9XCIgKyBnaXRDbG9uZVVybCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZUh0dHBDb25maWcoKSB7XG4gICAgdmFyIGF1dGhIZWFkZXIgPSBsb2NhbFN0b3JhZ2VbXCJnb2dzQXV0aG9yaXphdGlvblwiXTtcbiAgICB2YXIgZW1haWwgPSBsb2NhbFN0b3JhZ2VbXCJnb2dzRW1haWxcIl07XG4gICAgdmFyIGNvbmZpZyA9IHtcbiAgICAgIGhlYWRlcnM6IHtcbiAgICAgIH1cbi8qXG4gICAgICBoZWFkZXJzOiB7XG4gICAgICAgIEF1dGhvcml6YXRpb246IGF1dGhIZWFkZXIsXG4gICAgICAgIEVtYWlsOiBlbWFpbFxuICAgICAgfVxuKi9cbiAgICB9O1xuICAgIHJldHVybiBjb25maWc7XG4gIH1cblxuICBmdW5jdGlvbiBhZGRRdWVyeUFyZ3VtZW50KHVybCwgbmFtZSwgdmFsdWUpIHtcbiAgICBpZiAodXJsICYmIG5hbWUgJiYgdmFsdWUpIHtcbiAgICAgIHZhciBzZXAgPSAgKHVybC5pbmRleE9mKFwiP1wiKSA+PSAwKSA/IFwiJlwiIDogXCI/XCI7XG4gICAgICByZXR1cm4gdXJsICsgc2VwICsgIG5hbWUgKyBcIj1cIiArIGVuY29kZVVSSUNvbXBvbmVudCh2YWx1ZSk7XG4gICAgfVxuICAgIHJldHVybiB1cmw7XG4gIH1cblxuICBleHBvcnQgZnVuY3Rpb24gY3JlYXRlSHR0cFVybCh1cmwsIGF1dGhIZWFkZXIgPSBudWxsLCBlbWFpbCA9IG51bGwpIHtcbiAgICBhdXRoSGVhZGVyID0gYXV0aEhlYWRlciB8fCBsb2NhbFN0b3JhZ2VbXCJnb2dzQXV0aG9yaXphdGlvblwiXTtcbiAgICBlbWFpbCA9IGVtYWlsIHx8IGxvY2FsU3RvcmFnZVtcImdvZ3NFbWFpbFwiXTtcblxuICAgIHVybCA9IGFkZFF1ZXJ5QXJndW1lbnQodXJsLCBcIl9nb2dzQXV0aFwiLCBhdXRoSGVhZGVyKTtcbiAgICB1cmwgPSBhZGRRdWVyeUFyZ3VtZW50KHVybCwgXCJfZ29nc0VtYWlsXCIsIGVtYWlsKTtcbiAgICByZXR1cm4gdXJsO1xuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIGNvbW1hbmRNYXRjaGVzVGV4dChjb21tYW5kLCBmaWx0ZXJUZXh0KSB7XG4gICAgaWYgKGZpbHRlclRleHQpIHtcbiAgICAgIHJldHVybiBDb3JlLm1hdGNoRmlsdGVySWdub3JlQ2FzZShhbmd1bGFyLnRvSnNvbihjb21tYW5kKSwgZmlsdGVyVGV4dCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiBpc0xvZ2dlZEludG9Hb2dzKCkge1xuICAgIHZhciBsb2NhbFN0b3JhZ2UgPSBLdWJlcm5ldGVzLmluamVjdChcImxvY2FsU3RvcmFnZVwiKSB8fCB7fTtcbiAgICB2YXIgYXV0aEhlYWRlciA9IGxvY2FsU3RvcmFnZVtcImdvZ3NBdXRob3JpemF0aW9uXCJdO1xuICAgIC8vcmV0dXJuIGF1dGhIZWFkZXIgPyBsb2dnZWRJblRvR29ncyA6IGZhbHNlO1xuICAgIHJldHVybiBhdXRoSGVhZGVyID8gdHJ1ZSA6IGZhbHNlO1xuLypcbiAgICB2YXIgY29uZmlnID0gY3JlYXRlSHR0cENvbmZpZygpO1xuICAgIHJldHVybiBjb25maWcuaGVhZGVycy5BdXRob3JpemF0aW9uID8gdHJ1ZSA6IGZhbHNlO1xuKi9cbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiByZWRpcmVjdFRvR29nc0xvZ2luSWZSZXF1aXJlZCgkc2NvcGUsICRsb2NhdGlvbikge1xuICAgIGlmICghaXNMb2dnZWRJbnRvR29ncygpKSB7XG4gICAgICB2YXIgZGV2TGluayA9IERldmVsb3Blci5wcm9qZWN0TGluaygkc2NvcGUucHJvamVjdElkKTtcbiAgICAgIHZhciBsb2dpblBhZ2UgPSBVcmxIZWxwZXJzLmpvaW4oZGV2TGluaywgXCJmb3JnZS9yZXBvc1wiKTtcbiAgICAgIGxvZy5pbmZvKFwiTm90IGxvZ2dlZCBpbiBzbyByZWRpcmVjdGluZyB0byBcIiArIGxvZ2luUGFnZSk7XG4gICAgICAkbG9jYXRpb24ucGF0aChsb2dpblBhZ2UpXG4gICAgfVxuICB9XG59XG4iLCIvLy8gQ29weXJpZ2h0IDIwMTQtMjAxNSBSZWQgSGF0LCBJbmMuIGFuZC9vciBpdHMgYWZmaWxpYXRlc1xuLy8vIGFuZCBvdGhlciBjb250cmlidXRvcnMgYXMgaW5kaWNhdGVkIGJ5IHRoZSBAYXV0aG9yIHRhZ3MuXG4vLy9cbi8vLyBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuLy8vIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbi8vLyBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbi8vL1xuLy8vICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4vLy9cbi8vLyBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4vLy8gZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuLy8vIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuLy8vIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbi8vLyBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cblxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL2luY2x1ZGVzLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL2ZvcmdlL3RzL2ZvcmdlSGVscGVycy50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJtYWluR2xvYmFscy50c1wiLz5cblxubW9kdWxlIE1haW4ge1xuXG4gIGV4cG9ydCB2YXIgX21vZHVsZSA9IGFuZ3VsYXIubW9kdWxlKHBsdWdpbk5hbWUsIFtGb3JnZS5wbHVnaW5OYW1lXSk7XG5cbiAgdmFyIHRhYiA9IHVuZGVmaW5lZDtcblxuICBfbW9kdWxlLnJ1bigoJHJvb3RTY29wZSwgSGF3dGlvTmF2OiBIYXd0aW9NYWluTmF2LlJlZ2lzdHJ5LCBLdWJlcm5ldGVzTW9kZWwsIFNlcnZpY2VSZWdpc3RyeSwgcHJlZmVyZW5jZXNSZWdpc3RyeSkgPT4ge1xuXG4gICAgSGF3dGlvTmF2Lm9uKEhhd3Rpb01haW5OYXYuQWN0aW9ucy5DSEFOR0VELCBwbHVnaW5OYW1lLCAoaXRlbXMpID0+IHtcbiAgICAgIGl0ZW1zLmZvckVhY2goKGl0ZW0pID0+IHtcbiAgICAgICAgc3dpdGNoKGl0ZW0uaWQpIHtcbiAgICAgICAgICBjYXNlICdmb3JnZSc6XG4gICAgICAgICAgY2FzZSAnanZtJzpcbiAgICAgICAgICBjYXNlICd3aWtpJzpcbiAgICAgICAgICBjYXNlICdkb2NrZXItcmVnaXN0cnknOlxuICAgICAgICAgICAgaXRlbS5pc1ZhbGlkID0gKCkgPT4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH0pO1xuICAgIEhhd3Rpb05hdi5hZGQoe1xuICAgICAgaWQ6ICdsaWJyYXJ5JyxcbiAgICAgIHRpdGxlOiAoKSA9PiAnTGlicmFyeScsXG4gICAgICB0b29sdGlwOiAoKSA9PiAnVmlldyB0aGUgbGlicmFyeSBvZiBhcHBsaWNhdGlvbnMnLFxuICAgICAgaXNWYWxpZDogKCkgPT4gU2VydmljZVJlZ2lzdHJ5Lmhhc1NlcnZpY2UoYXBwTGlicmFyeVNlcnZpY2VOYW1lKSAmJiBTZXJ2aWNlUmVnaXN0cnkuaGFzU2VydmljZShcImFwcC1saWJyYXJ5LWpvbG9raWFcIiksXG4gICAgICBocmVmOiAoKSA9PiBcIi93aWtpL3ZpZXdcIixcbiAgICAgIGlzQWN0aXZlOiAoKSA9PiBmYWxzZVxuICAgIH0pO1xuXG4gICAgdmFyIGtpYmFuYVNlcnZpY2VOYW1lID0gS3ViZXJuZXRlcy5raWJhbmFTZXJ2aWNlTmFtZTtcblxuICAgIEhhd3Rpb05hdi5hZGQoe1xuICAgICAgaWQ6ICdraWJhbmEnLFxuICAgICAgdGl0bGU6ICgpID0+ICAnTG9ncycsXG4gICAgICB0b29sdGlwOiAoKSA9PiAnVmlldyBhbmQgc2VhcmNoIGFsbCBsb2dzIGFjcm9zcyBhbGwgY29udGFpbmVycyB1c2luZyBLaWJhbmEgYW5kIEVsYXN0aWNTZWFyY2gnLFxuICAgICAgaXNWYWxpZDogKCkgPT4gU2VydmljZVJlZ2lzdHJ5Lmhhc1NlcnZpY2Uoa2liYW5hU2VydmljZU5hbWUpLFxuICAgICAgaHJlZjogKCkgPT4gS3ViZXJuZXRlcy5raWJhbmFMb2dzTGluayhTZXJ2aWNlUmVnaXN0cnkpLFxuICAgICAgaXNBY3RpdmU6ICgpID0+IGZhbHNlXG4gICAgfSk7XG5cbiAgICBIYXd0aW9OYXYuYWRkKHtcbiAgICAgIGlkOiAnYXBpbWFuJyxcbiAgICAgIHRpdGxlOiAoKSA9PiAnQVBJIE1hbmFnZW1lbnQnLFxuICAgICAgdG9vbHRpcDogKCkgPT4gJ0FkZCBQb2xpY2llcyBhbmQgUGxhbnMgdG8geW91ciBBUElzIHdpdGggQXBpbWFuJyxcbiAgICAgIGlzVmFsaWQ6ICgpID0+IFNlcnZpY2VSZWdpc3RyeS5oYXNTZXJ2aWNlKCdhcGltYW4nKSxcbiAgICAgIG9sZEhyZWY6ICgpID0+IHsgLyogbm90aGluZyB0byBkbyAqLyB9LFxuICAgICAgaHJlZjogKCkgPT4ge1xuICAgICAgICB2YXIgaGFzaCA9IHtcbiAgICAgICAgICBiYWNrVG86IG5ldyBVUkkoKS50b1N0cmluZygpLFxuICAgICAgICAgIHRva2VuOiBIYXd0aW9PQXV0aC5nZXRPQXV0aFRva2VuKClcbiAgICAgICAgfTtcbiAgICAgICAgdmFyIHVyaSA9IG5ldyBVUkkoU2VydmljZVJlZ2lzdHJ5LnNlcnZpY2VMaW5rKCdhcGltYW4nKSk7XG4gICAgICAgIC8vIFRPRE8gaGF2ZSB0byBvdmVyd3JpdGUgdGhlIHBvcnQgaGVyZSBmb3Igc29tZSByZWFzb25cbiAgICAgICAgKDxhbnk+dXJpLnBvcnQoJzgwJykucXVlcnkoe30pLnBhdGgoJ2FwaW1hbnVpL2luZGV4Lmh0bWwnKSkuaGFzaChVUkkuZW5jb2RlKGFuZ3VsYXIudG9Kc29uKGhhc2gpKSk7XG4gICAgICAgIHJldHVybiB1cmkudG9TdHJpbmcoKTtcbiAgICAgIH0gICAgXG4gICAgfSk7XG5cbiAgICBIYXd0aW9OYXYuYWRkKHtcbiAgICAgIGlkOiAnZ3JhZmFuYScsXG4gICAgICB0aXRsZTogKCkgPT4gICdNZXRyaWNzJyxcbiAgICAgIHRvb2x0aXA6ICgpID0+ICdWaWV3cyBtZXRyaWNzIGFjcm9zcyBhbGwgY29udGFpbmVycyB1c2luZyBHcmFmYW5hIGFuZCBJbmZsdXhEQicsXG4gICAgICBpc1ZhbGlkOiAoKSA9PiBTZXJ2aWNlUmVnaXN0cnkuaGFzU2VydmljZShncmFmYW5hU2VydmljZU5hbWUpLFxuICAgICAgaHJlZjogKCkgPT4gU2VydmljZVJlZ2lzdHJ5LnNlcnZpY2VMaW5rKGdyYWZhbmFTZXJ2aWNlTmFtZSksXG4gICAgICBpc0FjdGl2ZTogKCkgPT4gZmFsc2VcbiAgICB9KTtcblxuICAgIEhhd3Rpb05hdi5hZGQoe1xuICAgICAgaWQ6IFwiY2hhdFwiLFxuICAgICAgdGl0bGU6ICgpID0+ICAnQ2hhdCcsXG4gICAgICB0b29sdGlwOiAoKSA9PiAnQ2hhdCByb29tIGZvciBkaXNjdXNzaW5nIHRoaXMgbmFtZXNwYWNlJyxcbiAgICAgIGlzVmFsaWQ6ICgpID0+IFNlcnZpY2VSZWdpc3RyeS5oYXNTZXJ2aWNlKGNoYXRTZXJ2aWNlTmFtZSksXG4gICAgICBocmVmOiAoKSA9PiB7XG4gICAgICAgIHZhciBhbnN3ZXIgPSBTZXJ2aWNlUmVnaXN0cnkuc2VydmljZUxpbmsoY2hhdFNlcnZpY2VOYW1lKTtcbiAgICAgICAgaWYgKGFuc3dlcikge1xuLypcbiAgICAgICAgICBUT0RPIGFkZCBhIGN1c3RvbSBsaW5rIHRvIHRoZSBjb3JyZWN0IHJvb20gZm9yIHRoZSBjdXJyZW50IG5hbWVzcGFjZT9cblxuICAgICAgICAgIHZhciBpcmNIb3N0ID0gXCJcIjtcbiAgICAgICAgICB2YXIgaXJjU2VydmljZSA9IFNlcnZpY2VSZWdpc3RyeS5maW5kU2VydmljZShcImh1Ym90XCIpO1xuICAgICAgICAgIGlmIChpcmNTZXJ2aWNlKSB7XG4gICAgICAgICAgICBpcmNIb3N0ID0gaXJjU2VydmljZS5wb3J0YWxJUDtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKGlyY0hvc3QpIHtcbiAgICAgICAgICAgIHZhciBuaWNrID0gbG9jYWxTdG9yYWdlW1wiZ29nc1VzZXJcIl0gfHwgbG9jYWxTdG9yYWdlW1wiaXJjTmlja1wiXSB8fCBcIm15bmFtZVwiO1xuICAgICAgICAgICAgdmFyIHJvb20gPSBcIiNmYWJyaWM4LVwiICsgIGN1cnJlbnRLdWJlcm5ldGVzTmFtZXNwYWNlKCk7XG4gICAgICAgICAgICBhbnN3ZXIgPSBVcmxIZWxwZXJzLmpvaW4oYW5zd2VyLCBcIi9raXdpXCIsIGlyY0hvc3QsIFwiPyZuaWNrPVwiICsgbmljayArIHJvb20pO1xuICAgICAgICAgIH1cbiovXG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGFuc3dlcjtcbiAgICAgIH0sXG4gICAgICBpc0FjdGl2ZTogKCkgPT4gZmFsc2VcbiAgICB9KTtcblxuICAgIC8vIFRPRE8gd2Ugc2hvdWxkIG1vdmUgdGhpcyB0byBhIG5pY2VyIGxpbmsgaW5zaWRlIHRoZSBMaWJyYXJ5IHNvb24gLSBhbHNvIGxldHMgaGlkZSB1bnRpbCBpdCB3b3Jrcy4uLlxuLypcbiAgICB3b3Jrc3BhY2UudG9wTGV2ZWxUYWJzLnB1c2goe1xuICAgICAgaWQ6ICdjcmVhdGVQcm9qZWN0JyxcbiAgICAgIHRpdGxlOiAoKSA9PiAgJ0NyZWF0ZScsXG4gICAgICB0b29sdGlwOiAoKSA9PiAnQ3JlYXRlcyBhIG5ldyBwcm9qZWN0JyxcbiAgICAgIGlzVmFsaWQ6ICgpID0+IFNlcnZpY2VSZWdpc3RyeS5oYXNTZXJ2aWNlKFwiYXBwLWxpYnJhcnlcIikgJiYgZmFsc2UsXG4gICAgICBocmVmOiAoKSA9PiBcIi9wcm9qZWN0L2NyZWF0ZVwiXG4gICAgfSk7XG4qL1xuXG4gICAgcHJlZmVyZW5jZXNSZWdpc3RyeS5hZGRUYWIoJ0Fib3V0ICcgKyB2ZXJzaW9uLm5hbWUsIFVybEhlbHBlcnMuam9pbih0ZW1wbGF0ZVBhdGgsICdhYm91dC5odG1sJykpO1xuXG4gICAgbG9nLmluZm8oXCJzdGFydGVkLCB2ZXJzaW9uOiBcIiwgdmVyc2lvbi52ZXJzaW9uKTtcbiAgICBsb2cuaW5mbyhcImNvbW1pdCBJRDogXCIsIHZlcnNpb24uY29tbWl0SWQpO1xuICB9KTtcblxuICBoYXd0aW9QbHVnaW5Mb2FkZXIucmVnaXN0ZXJQcmVCb290c3RyYXBUYXNrKChuZXh0KSA9PiB7XG4gICAgJC5hamF4KHtcbiAgICAgIHVybDogJ3ZlcnNpb24uanNvbj9yZXY9JyArIERhdGUubm93KCksIFxuICAgICAgc3VjY2VzczogKGRhdGEpID0+IHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICB2ZXJzaW9uID0gYW5ndWxhci5mcm9tSnNvbihkYXRhKTtcbiAgICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgdmVyc2lvbiA9IHtcbiAgICAgICAgICAgIG5hbWU6ICdmYWJyaWM4LWNvbnNvbGUnLFxuICAgICAgICAgICAgdmVyc2lvbjogJydcbiAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICAgIG5leHQoKTtcbiAgICAgIH0sXG4gICAgICBlcnJvcjogKGpxWEhSLCB0ZXh0LCBzdGF0dXMpID0+IHtcbiAgICAgICAgbG9nLmRlYnVnKFwiRmFpbGVkIHRvIGZldGNoIHZlcnNpb246IGpxWEhSOiBcIiwganFYSFIsIFwiIHRleHQ6IFwiLCB0ZXh0LCBcIiBzdGF0dXM6IFwiLCBzdGF0dXMpO1xuICAgICAgICBuZXh0KCk7XG4gICAgICB9LFxuICAgICAgZGF0YVR5cGU6IFwiaHRtbFwiXG4gICAgfSk7XG4gIH0pO1xuXG4gIGhhd3Rpb1BsdWdpbkxvYWRlci5hZGRNb2R1bGUocGx1Z2luTmFtZSk7XG59XG4iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwibWFpbkdsb2JhbHMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwibWFpblBsdWdpbi50c1wiLz5cblxubW9kdWxlIE1haW4ge1xuICBfbW9kdWxlLmNvbnRyb2xsZXIoJ01haW4uQWJvdXQnLCAoJHNjb3BlKSA9PiB7XG4gICAgJHNjb3BlLmluZm8gPSB2ZXJzaW9uO1xuICB9KTtcbn1cblxuIiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL2luY2x1ZGVzLnRzXCIvPlxuXG5cbi8qKlxuICogQG1vZHVsZSBXaWtpXG4gKi9cbm1vZHVsZSBXaWtpIHtcblxuICBleHBvcnQgdmFyIGxvZzpMb2dnaW5nLkxvZ2dlciA9IExvZ2dlci5nZXQoXCJXaWtpXCIpO1xuXG4gIGV4cG9ydCB2YXIgY2FtZWxOYW1lc3BhY2VzID0gW1wiaHR0cDovL2NhbWVsLmFwYWNoZS5vcmcvc2NoZW1hL3NwcmluZ1wiLCBcImh0dHA6Ly9jYW1lbC5hcGFjaGUub3JnL3NjaGVtYS9ibHVlcHJpbnRcIl07XG4gIGV4cG9ydCB2YXIgc3ByaW5nTmFtZXNwYWNlcyA9IFtcImh0dHA6Ly93d3cuc3ByaW5nZnJhbWV3b3JrLm9yZy9zY2hlbWEvYmVhbnNcIl07XG4gIGV4cG9ydCB2YXIgZHJvb2xzTmFtZXNwYWNlcyA9IFtcImh0dHA6Ly9kcm9vbHMub3JnL3NjaGVtYS9kcm9vbHMtc3ByaW5nXCJdO1xuICBleHBvcnQgdmFyIGRvemVyTmFtZXNwYWNlcyA9IFtcImh0dHA6Ly9kb3plci5zb3VyY2Vmb3JnZS5uZXRcIl07XG4gIGV4cG9ydCB2YXIgYWN0aXZlbXFOYW1lc3BhY2VzID0gW1wiaHR0cDovL2FjdGl2ZW1xLmFwYWNoZS5vcmcvc2NoZW1hL2NvcmVcIl07XG5cbiAgZXhwb3J0IHZhciBleGNsdWRlQWRqdXN0bWVudFByZWZpeGVzID0gW1wiaHR0cDovL1wiLCBcImh0dHBzOi8vXCIsIFwiI1wiXTtcblxuICBleHBvcnQgZW51bSBWaWV3TW9kZSB7IExpc3QsIEljb24gfTtcblxuICAvKipcbiAgICogVGhlIGN1c3RvbSB2aWV3cyB3aXRoaW4gdGhlIHdpa2kgbmFtZXNwYWNlOyBlaXRoZXIgXCIvd2lraS8kZm9vXCIgb3IgXCIvd2lraS9icmFuY2gvJGJyYW5jaC8kZm9vXCJcbiAgICovXG4gIGV4cG9ydCB2YXIgY3VzdG9tV2lraVZpZXdQYWdlcyA9IFtcIi9mb3JtVGFibGVcIiwgXCIvY2FtZWwvZGlhZ3JhbVwiLCBcIi9jYW1lbC9jYW52YXNcIiwgXCIvY2FtZWwvcHJvcGVydGllc1wiLCBcIi9kb3plci9tYXBwaW5nc1wiXTtcblxuICAvKipcbiAgICogV2hpY2ggZXh0ZW5zaW9ucyBkbyB3ZSB3aXNoIHRvIGhpZGUgaW4gdGhlIHdpa2kgZmlsZSBsaXN0aW5nXG4gICAqIEBwcm9wZXJ0eSBoaWRlRXh0ZW5zaW9uc1xuICAgKiBAZm9yIFdpa2lcbiAgICogQHR5cGUgQXJyYXlcbiAgICovXG4gIGV4cG9ydCB2YXIgaGlkZUV4dGVuc2lvbnMgPSBbXCIucHJvZmlsZVwiXTtcblxuICB2YXIgZGVmYXVsdEZpbGVOYW1lUGF0dGVybiA9IC9eW2EtekEtWjAtOS5fLV0qJC87XG4gIHZhciBkZWZhdWx0RmlsZU5hbWVQYXR0ZXJuSW52YWxpZCA9IFwiTmFtZSBtdXN0IGJlOiBsZXR0ZXJzLCBudW1iZXJzLCBhbmQgLiBfIG9yIC0gY2hhcmFjdGVyc1wiO1xuXG4gIHZhciBkZWZhdWx0RmlsZU5hbWVFeHRlbnNpb25QYXR0ZXJuID0gXCJcIjtcblxuICB2YXIgZGVmYXVsdExvd2VyQ2FzZUZpbGVOYW1lUGF0dGVybiA9IC9eW2EtejAtOS5fLV0qJC87XG4gIHZhciBkZWZhdWx0TG93ZXJDYXNlRmlsZU5hbWVQYXR0ZXJuSW52YWxpZCA9IFwiTmFtZSBtdXN0IGJlOiBsb3dlci1jYXNlIGxldHRlcnMsIG51bWJlcnMsIGFuZCAuIF8gb3IgLSBjaGFyYWN0ZXJzXCI7XG5cbiAgZXhwb3J0IGludGVyZmFjZSBHZW5lcmF0ZU9wdGlvbnMge1xuICAgIHdvcmtzcGFjZTogYW55O1xuICAgIGZvcm06IGFueTtcbiAgICBuYW1lOiBzdHJpbmc7XG4gICAgYnJhbmNoOiBzdHJpbmc7XG4gICAgcGFyZW50SWQ6IHN0cmluZztcbiAgICBzdWNjZXNzOiAoZmlsZUNvbnRlbnRzPzpzdHJpbmcpID0+IHZvaWQ7XG4gICAgZXJyb3I6IChlcnJvcjphbnkpID0+IHZvaWQ7XG4gIH1cblxuICAvKipcbiAgICogVGhlIHdpemFyZCB0cmVlIGZvciBjcmVhdGluZyBuZXcgY29udGVudCBpbiB0aGUgd2lraVxuICAgKiBAcHJvcGVydHkgZG9jdW1lbnRUZW1wbGF0ZXNcbiAgICogQGZvciBXaWtpXG4gICAqIEB0eXBlIEFycmF5XG4gICAqL1xuICBleHBvcnQgdmFyIGRvY3VtZW50VGVtcGxhdGVzID0gW1xuICAgIHtcbiAgICAgIGxhYmVsOiBcIkZvbGRlclwiLFxuICAgICAgdG9vbHRpcDogXCJDcmVhdGUgYSBuZXcgZm9sZGVyIHRvIGNvbnRhaW4gZG9jdW1lbnRzXCIsXG4gICAgICBmb2xkZXI6IHRydWUsXG4gICAgICBpY29uOiBcIi9pbWcvaWNvbnMvd2lraS9mb2xkZXIuZ2lmXCIsXG4gICAgICBleGVtcGxhcjogXCJteWZvbGRlclwiLFxuICAgICAgcmVnZXg6IGRlZmF1bHRMb3dlckNhc2VGaWxlTmFtZVBhdHRlcm4sXG4gICAgICBpbnZhbGlkOiBkZWZhdWx0TG93ZXJDYXNlRmlsZU5hbWVQYXR0ZXJuSW52YWxpZFxuICAgIH0sXG4gICAgLypcbiAgICB7XG4gICAgICBsYWJlbDogXCJBcHBcIixcbiAgICAgIHRvb2x0aXA6IFwiQ3JlYXRlcyBhIG5ldyBBcHAgZm9sZGVyIHVzZWQgdG8gY29uZmlndXJlIGFuZCBydW4gY29udGFpbmVyc1wiLFxuICAgICAgYWRkQ2xhc3M6IFwiZmEgZmEtY29nIGdyZWVuXCIsXG4gICAgICBleGVtcGxhcjogJ215YXBwJyxcbiAgICAgIHJlZ2V4OiBkZWZhdWx0RmlsZU5hbWVQYXR0ZXJuLFxuICAgICAgaW52YWxpZDogZGVmYXVsdEZpbGVOYW1lUGF0dGVybkludmFsaWQsXG4gICAgICBleHRlbnNpb246ICcnLFxuICAgICAgZ2VuZXJhdGVkOiB7XG4gICAgICAgIG1iZWFuOiBbJ2lvLmZhYnJpYzgnLCB7IHR5cGU6ICdLdWJlcm5ldGVzVGVtcGxhdGVNYW5hZ2VyJyB9XSxcbiAgICAgICAgaW5pdDogKHdvcmtzcGFjZSwgJHNjb3BlKSA9PiB7XG5cbiAgICAgICAgfSxcbiAgICAgICAgZ2VuZXJhdGU6IChvcHRpb25zOkdlbmVyYXRlT3B0aW9ucykgPT4ge1xuICAgICAgICAgIGxvZy5kZWJ1ZyhcIkdvdCBvcHRpb25zOiBcIiwgb3B0aW9ucyk7XG4gICAgICAgICAgb3B0aW9ucy5mb3JtLm5hbWUgPSBvcHRpb25zLm5hbWU7XG4gICAgICAgICAgb3B0aW9ucy5mb3JtLnBhdGggPSBvcHRpb25zLnBhcmVudElkO1xuICAgICAgICAgIG9wdGlvbnMuZm9ybS5icmFuY2ggPSBvcHRpb25zLmJyYW5jaDtcbiAgICAgICAgICB2YXIganNvbiA9IGFuZ3VsYXIudG9Kc29uKG9wdGlvbnMuZm9ybSk7XG4gICAgICAgICAgdmFyIGpvbG9raWEgPSA8Sm9sb2tpYS5JSm9sb2tpYT4gSGF3dGlvQ29yZS5pbmplY3Rvci5nZXQoXCJqb2xva2lhXCIpO1xuICAgICAgICAgIGpvbG9raWEucmVxdWVzdCh7XG4gICAgICAgICAgICB0eXBlOiAnZXhlYycsXG4gICAgICAgICAgICBtYmVhbjogJ2lvLmZhYnJpYzg6dHlwZT1LdWJlcm5ldGVzVGVtcGxhdGVNYW5hZ2VyJyxcbiAgICAgICAgICAgIG9wZXJhdGlvbjogJ2NyZWF0ZUFwcEJ5SnNvbicsXG4gICAgICAgICAgICBhcmd1bWVudHM6IFtqc29uXVxuICAgICAgICAgIH0sIENvcmUub25TdWNjZXNzKChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgbG9nLmRlYnVnKFwiR2VuZXJhdGVkIGFwcCwgcmVzcG9uc2U6IFwiLCByZXNwb25zZSk7XG4gICAgICAgICAgICBvcHRpb25zLnN1Y2Nlc3ModW5kZWZpbmVkKTsgXG4gICAgICAgICAgfSwge1xuICAgICAgICAgICAgZXJyb3I6IChyZXNwb25zZSkgPT4geyBvcHRpb25zLmVycm9yKHJlc3BvbnNlLmVycm9yKTsgfVxuICAgICAgICAgIH0pKTtcbiAgICAgICAgfSxcbiAgICAgICAgZm9ybTogKHdvcmtzcGFjZSwgJHNjb3BlKSA9PiB7XG4gICAgICAgICAgLy8gVE9ETyBkb2NrZXIgcmVnaXN0cnkgY29tcGxldGlvblxuICAgICAgICAgIGlmICghJHNjb3BlLmRvRG9ja2VyUmVnaXN0cnlDb21wbGV0aW9uKSB7XG4gICAgICAgICAgICAkc2NvcGUuZmV0Y2hEb2NrZXJSZXBvc2l0b3JpZXMgPSAoKSA9PiB7XG4gICAgICAgICAgICAgIHJldHVybiBEb2NrZXJSZWdpc3RyeS5jb21wbGV0ZURvY2tlclJlZ2lzdHJ5KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBzdW1tYXJ5TWFya2Rvd246ICdBZGQgYXBwIHN1bW1hcnkgaGVyZScsXG4gICAgICAgICAgICByZXBsaWNhQ291bnQ6IDFcbiAgICAgICAgICB9O1xuICAgICAgICB9LFxuICAgICAgICBzY2hlbWE6IHtcbiAgICAgICAgICBkZXNjcmlwdGlvbjogJ0FwcCBzZXR0aW5ncycsXG4gICAgICAgICAgdHlwZTogJ2phdmEubGFuZy5TdHJpbmcnLFxuICAgICAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgICAgICdkb2NrZXJJbWFnZSc6IHtcbiAgICAgICAgICAgICAgJ2Rlc2NyaXB0aW9uJzogJ0RvY2tlciBJbWFnZScsXG4gICAgICAgICAgICAgICd0eXBlJzogJ2phdmEubGFuZy5TdHJpbmcnLFxuICAgICAgICAgICAgICAnaW5wdXQtYXR0cmlidXRlcyc6IHsgXG4gICAgICAgICAgICAgICAgJ3JlcXVpcmVkJzogJycsIFxuICAgICAgICAgICAgICAgICdjbGFzcyc6ICdpbnB1dC14bGFyZ2UnLFxuICAgICAgICAgICAgICAgICd0eXBlYWhlYWQnOiAncmVwbyBmb3IgcmVwbyBpbiBmZXRjaERvY2tlclJlcG9zaXRvcmllcygpIHwgZmlsdGVyOiR2aWV3VmFsdWUnLFxuICAgICAgICAgICAgICAgICd0eXBlYWhlYWQtd2FpdC1tcyc6ICcyMDAnXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAnc3VtbWFyeU1hcmtkb3duJzoge1xuICAgICAgICAgICAgICAnZGVzY3JpcHRpb24nOiAnU2hvcnQgRGVzY3JpcHRpb24nLFxuICAgICAgICAgICAgICAndHlwZSc6ICdqYXZhLmxhbmcuU3RyaW5nJyxcbiAgICAgICAgICAgICAgJ2lucHV0LWF0dHJpYnV0ZXMnOiB7ICdjbGFzcyc6ICdpbnB1dC14bGFyZ2UnIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAncmVwbGljYUNvdW50Jzoge1xuICAgICAgICAgICAgICAnZGVzY3JpcHRpb24nOiAnUmVwbGljYSBDb3VudCcsXG4gICAgICAgICAgICAgICd0eXBlJzogJ2phdmEubGFuZy5JbnRlZ2VyJyxcbiAgICAgICAgICAgICAgJ2lucHV0LWF0dHJpYnV0ZXMnOiB7XG4gICAgICAgICAgICAgICAgbWluOiAnMCdcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICdsYWJlbHMnOiB7XG4gICAgICAgICAgICAgICdkZXNjcmlwdGlvbic6ICdMYWJlbHMnLFxuICAgICAgICAgICAgICAndHlwZSc6ICdtYXAnLFxuICAgICAgICAgICAgICAnaXRlbXMnOiB7XG4gICAgICAgICAgICAgICAgJ3R5cGUnOiAnc3RyaW5nJ1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSxcbiAgICB7XG4gICAgICBsYWJlbDogXCJGYWJyaWM4IFByb2ZpbGVcIixcbiAgICAgIHRvb2x0aXA6IFwiQ3JlYXRlIGEgbmV3IGVtcHR5IGZhYnJpYyBwcm9maWxlLiBVc2luZyBhIGh5cGhlbiAoJy0nKSB3aWxsIGNyZWF0ZSBhIGZvbGRlciBoZWlyYXJjaHksIGZvciBleGFtcGxlICdteS1hd2Vzb21lLXByb2ZpbGUnIHdpbGwgYmUgYXZhaWxhYmxlIHZpYSB0aGUgcGF0aCAnbXkvYXdlc29tZS9wcm9maWxlJy5cIixcbiAgICAgIHByb2ZpbGU6IHRydWUsXG4gICAgICBhZGRDbGFzczogXCJmYSBmYS1ib29rIGdyZWVuXCIsXG4gICAgICBleGVtcGxhcjogXCJ1c2VyLXByb2ZpbGVcIixcbiAgICAgIHJlZ2V4OiBkZWZhdWx0TG93ZXJDYXNlRmlsZU5hbWVQYXR0ZXJuLFxuICAgICAgaW52YWxpZDogZGVmYXVsdExvd2VyQ2FzZUZpbGVOYW1lUGF0dGVybkludmFsaWQsXG4gICAgICBmYWJyaWNPbmx5OiB0cnVlXG4gICAgfSxcbiAgICAqL1xuICAgIHtcbiAgICAgIGxhYmVsOiBcIlByb3BlcnRpZXMgRmlsZVwiLFxuICAgICAgdG9vbHRpcDogXCJBIHByb3BlcnRpZXMgZmlsZSB0eXBpY2FsbHkgdXNlZCB0byBjb25maWd1cmUgSmF2YSBjbGFzc2VzXCIsXG4gICAgICBleGVtcGxhcjogXCJwcm9wZXJ0aWVzLWZpbGUucHJvcGVydGllc1wiLFxuICAgICAgcmVnZXg6IGRlZmF1bHRGaWxlTmFtZVBhdHRlcm4sXG4gICAgICBpbnZhbGlkOiBkZWZhdWx0RmlsZU5hbWVQYXR0ZXJuSW52YWxpZCxcbiAgICAgIGV4dGVuc2lvbjogXCIucHJvcGVydGllc1wiXG4gICAgfSxcbiAgICB7XG4gICAgICBsYWJlbDogXCJKU09OIEZpbGVcIixcbiAgICAgIHRvb2x0aXA6IFwiQSBmaWxlIGNvbnRhaW5pbmcgSlNPTiBkYXRhXCIsXG4gICAgICBleGVtcGxhcjogXCJkb2N1bWVudC5qc29uXCIsXG4gICAgICByZWdleDogZGVmYXVsdEZpbGVOYW1lUGF0dGVybixcbiAgICAgIGludmFsaWQ6IGRlZmF1bHRGaWxlTmFtZVBhdHRlcm5JbnZhbGlkLFxuICAgICAgZXh0ZW5zaW9uOiBcIi5qc29uXCJcbiAgICB9LFxuICAgIC8qXG4gICAge1xuICAgICAgbGFiZWw6IFwiS2V5IFN0b3JlIEZpbGVcIixcbiAgICAgIHRvb2x0aXA6IFwiQ3JlYXRlcyBhIGtleXN0b3JlIChkYXRhYmFzZSkgb2YgY3J5cHRvZ3JhcGhpYyBrZXlzLCBYLjUwOSBjZXJ0aWZpY2F0ZSBjaGFpbnMsIGFuZCB0cnVzdGVkIGNlcnRpZmljYXRlcy5cIixcbiAgICAgIGV4ZW1wbGFyOiAna2V5c3RvcmUuamtzJyxcbiAgICAgIHJlZ2V4OiBkZWZhdWx0RmlsZU5hbWVQYXR0ZXJuLFxuICAgICAgaW52YWxpZDogZGVmYXVsdEZpbGVOYW1lUGF0dGVybkludmFsaWQsXG4gICAgICBleHRlbnNpb246IFwiLmprc1wiLFxuICAgICAgZ2VuZXJhdGVkOiB7XG4gICAgICAgIG1iZWFuOiBbJ2hhd3RpbycsIHsgdHlwZTogJ0tleXN0b3JlU2VydmljZScgfV0sXG4gICAgICAgIGluaXQ6IGZ1bmN0aW9uKHdvcmtzcGFjZSwgJHNjb3BlKSB7XG4gICAgICAgICAgdmFyIG1iZWFuID0gJ2hhd3Rpbzp0eXBlPUtleXN0b3JlU2VydmljZSc7XG4gICAgICAgICAgdmFyIHJlc3BvbnNlID0gd29ya3NwYWNlLmpvbG9raWEucmVxdWVzdCgge3R5cGU6IFwicmVhZFwiLCBtYmVhbjogbWJlYW4sIGF0dHJpYnV0ZTogXCJTZWN1cml0eVByb3ZpZGVySW5mb1wiIH0sIHtcbiAgICAgICAgICAgIHN1Y2Nlc3M6IChyZXNwb25zZSk9PntcbiAgICAgICAgICAgICAgJHNjb3BlLnNlY3VyaXR5UHJvdmlkZXJJbmZvID0gcmVzcG9uc2UudmFsdWU7XG4gICAgICAgICAgICAgIENvcmUuJGFwcGx5KCRzY29wZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZXJyb3I6IChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICBjb25zb2xlLmxvZygnQ291bGQgbm90IGZpbmQgdGhlIHN1cHBvcnRlZCBzZWN1cml0eSBhbGdvcml0aG1zOiAnLCByZXNwb25zZS5lcnJvcik7XG4gICAgICAgICAgICAgIENvcmUuJGFwcGx5KCRzY29wZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0sXG4gICAgICAgIGdlbmVyYXRlOiBmdW5jdGlvbihvcHRpb25zOkdlbmVyYXRlT3B0aW9ucykge1xuICAgICAgICAgIHZhciBlbmNvZGVkRm9ybSA9IEpTT04uc3RyaW5naWZ5KG9wdGlvbnMuZm9ybSlcbiAgICAgICAgICB2YXIgbWJlYW4gPSAnaGF3dGlvOnR5cGU9S2V5c3RvcmVTZXJ2aWNlJztcbiAgICAgICAgICB2YXIgcmVzcG9uc2UgPSBvcHRpb25zLndvcmtzcGFjZS5qb2xva2lhLnJlcXVlc3QoIHtcbiAgICAgICAgICAgICAgdHlwZTogJ2V4ZWMnLCBcbiAgICAgICAgICAgICAgbWJlYW46IG1iZWFuLFxuICAgICAgICAgICAgICBvcGVyYXRpb246ICdjcmVhdGVLZXlTdG9yZVZpYUpTT04oamF2YS5sYW5nLlN0cmluZyknLFxuICAgICAgICAgICAgICBhcmd1bWVudHM6IFtlbmNvZGVkRm9ybV1cbiAgICAgICAgICAgIH0sIHtcbiAgICAgICAgICAgICAgbWV0aG9kOidQT1NUJyxcbiAgICAgICAgICAgICAgc3VjY2VzczpmdW5jdGlvbihyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIG9wdGlvbnMuc3VjY2VzcyhyZXNwb25zZS52YWx1ZSlcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgZXJyb3I6ZnVuY3Rpb24ocmVzcG9uc2Upe1xuICAgICAgICAgICAgICAgIG9wdGlvbnMuZXJyb3IocmVzcG9uc2UuZXJyb3IpXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LFxuICAgICAgICBmb3JtOiBmdW5jdGlvbih3b3Jrc3BhY2UsICRzY29wZSl7IFxuICAgICAgICAgIHJldHVybiB7IFxuICAgICAgICAgICAgc3RvcmVUeXBlOiAkc2NvcGUuc2VjdXJpdHlQcm92aWRlckluZm8uc3VwcG9ydGVkS2V5U3RvcmVUeXBlc1swXSxcbiAgICAgICAgICAgIGNyZWF0ZVByaXZhdGVLZXk6IGZhbHNlLFxuICAgICAgICAgICAga2V5TGVuZ3RoOiA0MDk2LFxuICAgICAgICAgICAga2V5QWxnb3JpdGhtOiAkc2NvcGUuc2VjdXJpdHlQcm92aWRlckluZm8uc3VwcG9ydGVkS2V5QWxnb3JpdGhtc1swXSxcbiAgICAgICAgICAgIGtleVZhbGlkaXR5OiAzNjVcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIHNjaGVtYToge1xuICAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiS2V5c3RvcmUgU2V0dGluZ3NcIixcbiAgICAgICAgICAgXCJ0eXBlXCI6IFwiamF2YS5sYW5nLlN0cmluZ1wiLFxuICAgICAgICAgICBcInByb3BlcnRpZXNcIjogeyBcbiAgICAgICAgICAgICBcInN0b3JlUGFzc3dvcmRcIjoge1xuICAgICAgICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIktleXN0b3JlIHBhc3N3b3JkLlwiLFxuICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwicGFzc3dvcmRcIixcbiAgICAgICAgICAgICAgICdpbnB1dC1hdHRyaWJ1dGVzJzogeyBcInJlcXVpcmVkXCI6ICBcIlwiLCAgXCJuZy1taW5sZW5ndGhcIjo2IH1cbiAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgIFwic3RvcmVUeXBlXCI6IHtcbiAgICAgICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgdHlwZSBvZiBzdG9yZSB0byBjcmVhdGVcIixcbiAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImphdmEubGFuZy5TdHJpbmdcIixcbiAgICAgICAgICAgICAgICdpbnB1dC1lbGVtZW50JzogXCJzZWxlY3RcIixcbiAgICAgICAgICAgICAgICdpbnB1dC1hdHRyaWJ1dGVzJzogeyBcIm5nLW9wdGlvbnNcIjogIFwidiBmb3IgdiBpbiBzZWN1cml0eVByb3ZpZGVySW5mby5zdXBwb3J0ZWRLZXlTdG9yZVR5cGVzXCIgfVxuICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgXCJjcmVhdGVQcml2YXRlS2V5XCI6IHtcbiAgICAgICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJTaG91bGQgd2UgZ2VuZXJhdGUgYSBzZWxmLXNpZ25lZCBwcml2YXRlIGtleT9cIixcbiAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImJvb2xlYW5cIlxuICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgXCJrZXlDb21tb25OYW1lXCI6IHtcbiAgICAgICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgY29tbW9uIG5hbWUgb2YgdGhlIGtleSwgdHlwaWNhbGx5IHNldCB0byB0aGUgaG9zdG5hbWUgb2YgdGhlIHNlcnZlclwiLFxuICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwiamF2YS5sYW5nLlN0cmluZ1wiLFxuICAgICAgICAgICAgICAgJ2NvbnRyb2wtZ3JvdXAtYXR0cmlidXRlcyc6IHsgJ25nLXNob3cnOiBcImZvcm1EYXRhLmNyZWF0ZVByaXZhdGVLZXlcIiB9XG4gICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICBcImtleUxlbmd0aFwiOiB7XG4gICAgICAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIGxlbmd0aCBvZiB0aGUgY3J5cHRvZ3JhcGhpYyBrZXlcIixcbiAgICAgICAgICAgICAgIFwidHlwZVwiOiBcIkxvbmdcIixcbiAgICAgICAgICAgICAgICdjb250cm9sLWdyb3VwLWF0dHJpYnV0ZXMnOiB7ICduZy1zaG93JzogXCJmb3JtRGF0YS5jcmVhdGVQcml2YXRlS2V5XCIgfVxuICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgXCJrZXlBbGdvcml0aG1cIjoge1xuICAgICAgICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBrZXkgYWxnb3JpdGhtXCIsXG4gICAgICAgICAgICAgICBcInR5cGVcIjogXCJqYXZhLmxhbmcuU3RyaW5nXCIsXG4gICAgICAgICAgICAgICAnaW5wdXQtZWxlbWVudCc6IFwic2VsZWN0XCIsXG4gICAgICAgICAgICAgICAnaW5wdXQtYXR0cmlidXRlcyc6IHsgXCJuZy1vcHRpb25zXCI6ICBcInYgZm9yIHYgaW4gc2VjdXJpdHlQcm92aWRlckluZm8uc3VwcG9ydGVkS2V5QWxnb3JpdGhtc1wiIH0sXG4gICAgICAgICAgICAgICAnY29udHJvbC1ncm91cC1hdHRyaWJ1dGVzJzogeyAnbmctc2hvdyc6IFwiZm9ybURhdGEuY3JlYXRlUHJpdmF0ZUtleVwiIH1cbiAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgIFwia2V5VmFsaWRpdHlcIjoge1xuICAgICAgICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBudW1iZXIgb2YgZGF5cyB0aGUga2V5IHdpbGwgYmUgdmFsaWQgZm9yXCIsXG4gICAgICAgICAgICAgICBcInR5cGVcIjogXCJMb25nXCIsXG4gICAgICAgICAgICAgICAnY29udHJvbC1ncm91cC1hdHRyaWJ1dGVzJzogeyAnbmctc2hvdyc6IFwiZm9ybURhdGEuY3JlYXRlUHJpdmF0ZUtleVwiIH1cbiAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgIFwia2V5UGFzc3dvcmRcIjoge1xuICAgICAgICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlBhc3N3b3JkIHRvIHRoZSBwcml2YXRlIGtleVwiLFxuICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwicGFzc3dvcmRcIixcbiAgICAgICAgICAgICAgICdjb250cm9sLWdyb3VwLWF0dHJpYnV0ZXMnOiB7ICduZy1zaG93JzogXCJmb3JtRGF0YS5jcmVhdGVQcml2YXRlS2V5XCIgfVxuICAgICAgICAgICAgIH1cbiAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSxcbiAgICAqL1xuICAgIHtcbiAgICAgIGxhYmVsOiBcIk1hcmtkb3duIERvY3VtZW50XCIsXG4gICAgICB0b29sdGlwOiBcIkEgYmFzaWMgbWFya3VwIGRvY3VtZW50IHVzaW5nIHRoZSBNYXJrZG93biB3aWtpIG1hcmt1cCwgcGFydGljdWxhcmx5IHVzZWZ1bCBmb3IgUmVhZE1lIGZpbGVzIGluIGRpcmVjdG9yaWVzXCIsXG4gICAgICBleGVtcGxhcjogXCJSZWFkTWUubWRcIixcbiAgICAgIHJlZ2V4OiBkZWZhdWx0RmlsZU5hbWVQYXR0ZXJuLFxuICAgICAgaW52YWxpZDogZGVmYXVsdEZpbGVOYW1lUGF0dGVybkludmFsaWQsXG4gICAgICBleHRlbnNpb246IFwiLm1kXCJcbiAgICB9LFxuICAgIHtcbiAgICAgIGxhYmVsOiBcIlRleHQgRG9jdW1lbnRcIixcbiAgICAgIHRvb2x0aXA6IFwiQSBwbGFpbiB0ZXh0IGZpbGVcIixcbiAgICAgIGV4ZW1wbGFyOiBcImRvY3VtZW50LnRleHRcIixcbiAgICAgIHJlZ2V4OiBkZWZhdWx0RmlsZU5hbWVQYXR0ZXJuLFxuICAgICAgaW52YWxpZDogZGVmYXVsdEZpbGVOYW1lUGF0dGVybkludmFsaWQsXG4gICAgICBleHRlbnNpb246IFwiLnR4dFwiXG4gICAgfSxcbiAgICB7XG4gICAgICBsYWJlbDogXCJIVE1MIERvY3VtZW50XCIsXG4gICAgICB0b29sdGlwOiBcIkEgSFRNTCBkb2N1bWVudCB5b3UgY2FuIGVkaXQgZGlyZWN0bHkgdXNpbmcgdGhlIEhUTUwgbWFya3VwXCIsXG4gICAgICBleGVtcGxhcjogXCJkb2N1bWVudC5odG1sXCIsXG4gICAgICByZWdleDogZGVmYXVsdEZpbGVOYW1lUGF0dGVybixcbiAgICAgIGludmFsaWQ6IGRlZmF1bHRGaWxlTmFtZVBhdHRlcm5JbnZhbGlkLFxuICAgICAgZXh0ZW5zaW9uOiBcIi5odG1sXCJcbiAgICB9LFxuICAgIHtcbiAgICAgIGxhYmVsOiBcIlhNTCBEb2N1bWVudFwiLFxuICAgICAgdG9vbHRpcDogXCJBbiBlbXB0eSBYTUwgZG9jdW1lbnRcIixcbiAgICAgIGV4ZW1wbGFyOiBcImRvY3VtZW50LnhtbFwiLFxuICAgICAgcmVnZXg6IGRlZmF1bHRGaWxlTmFtZVBhdHRlcm4sXG4gICAgICBpbnZhbGlkOiBkZWZhdWx0RmlsZU5hbWVQYXR0ZXJuSW52YWxpZCxcbiAgICAgIGV4dGVuc2lvbjogXCIueG1sXCJcbiAgICB9LFxuICAgIHtcbiAgICAgIGxhYmVsOiBcIkludGVncmF0aW9uIEZsb3dzXCIsXG4gICAgICB0b29sdGlwOiBcIkNhbWVsIHJvdXRlcyBmb3IgZGVmaW5pbmcgeW91ciBpbnRlZ3JhdGlvbiBmbG93c1wiLFxuICAgICAgY2hpbGRyZW46IFtcbiAgICAgICAge1xuICAgICAgICAgIGxhYmVsOiBcIkNhbWVsIFhNTCBkb2N1bWVudFwiLFxuICAgICAgICAgIHRvb2x0aXA6IFwiQSB2YW5pbGxhIENhbWVsIFhNTCBkb2N1bWVudCBmb3IgaW50ZWdyYXRpb24gZmxvd3NcIixcbiAgICAgICAgICBpY29uOiBcIi9pbWcvaWNvbnMvY2FtZWwuc3ZnXCIsXG4gICAgICAgICAgZXhlbXBsYXI6IFwiY2FtZWwueG1sXCIsXG4gICAgICAgICAgcmVnZXg6IGRlZmF1bHRGaWxlTmFtZVBhdHRlcm4sXG4gICAgICAgICAgaW52YWxpZDogZGVmYXVsdEZpbGVOYW1lUGF0dGVybkludmFsaWQsXG4gICAgICAgICAgZXh0ZW5zaW9uOiBcIi54bWxcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgbGFiZWw6IFwiQ2FtZWwgT1NHaSBCbHVlcHJpbnQgWE1MIGRvY3VtZW50XCIsXG4gICAgICAgICAgdG9vbHRpcDogXCJBIHZhbmlsbGEgQ2FtZWwgWE1MIGRvY3VtZW50IGZvciBpbnRlZ3JhdGlvbiBmbG93cyB3aGVuIHVzaW5nIE9TR2kgQmx1ZXByaW50XCIsXG4gICAgICAgICAgaWNvbjogXCIvaW1nL2ljb25zL2NhbWVsLnN2Z1wiLFxuICAgICAgICAgIGV4ZW1wbGFyOiBcImNhbWVsLWJsdWVwcmludC54bWxcIixcbiAgICAgICAgICByZWdleDogZGVmYXVsdEZpbGVOYW1lUGF0dGVybixcbiAgICAgICAgICBpbnZhbGlkOiBkZWZhdWx0RmlsZU5hbWVQYXR0ZXJuSW52YWxpZCxcbiAgICAgICAgICBleHRlbnNpb246IFwiLnhtbFwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICBsYWJlbDogXCJDYW1lbCBTcHJpbmcgWE1MIGRvY3VtZW50XCIsXG4gICAgICAgICAgdG9vbHRpcDogXCJBIHZhbmlsbGEgQ2FtZWwgWE1MIGRvY3VtZW50IGZvciBpbnRlZ3JhdGlvbiBmbG93cyB3aGVuIHVzaW5nIHRoZSBTcHJpbmcgZnJhbWV3b3JrXCIsXG4gICAgICAgICAgaWNvbjogXCIvaW1nL2ljb25zL2NhbWVsLnN2Z1wiLFxuICAgICAgICAgIGV4ZW1wbGFyOiBcImNhbWVsLXNwcmluZy54bWxcIixcbiAgICAgICAgICByZWdleDogZGVmYXVsdEZpbGVOYW1lUGF0dGVybixcbiAgICAgICAgICBpbnZhbGlkOiBkZWZhdWx0RmlsZU5hbWVQYXR0ZXJuSW52YWxpZCxcbiAgICAgICAgICBleHRlbnNpb246IFwiLnhtbFwiXG4gICAgICAgIH1cbiAgICAgIF1cbiAgICB9LFxuICAgIHtcbiAgICAgIGxhYmVsOiBcIkRhdGEgTWFwcGluZyBEb2N1bWVudFwiLFxuICAgICAgdG9vbHRpcDogXCJEb3plciBiYXNlZCBjb25maWd1cmF0aW9uIG9mIG1hcHBpbmcgZG9jdW1lbnRzXCIsXG4gICAgICBpY29uOiBcIi9pbWcvaWNvbnMvZG96ZXIvZG96ZXIuZ2lmXCIsXG4gICAgICBleGVtcGxhcjogXCJkb3plci1tYXBwaW5nLnhtbFwiLFxuICAgICAgcmVnZXg6IGRlZmF1bHRGaWxlTmFtZVBhdHRlcm4sXG4gICAgICBpbnZhbGlkOiBkZWZhdWx0RmlsZU5hbWVQYXR0ZXJuSW52YWxpZCxcbiAgICAgIGV4dGVuc2lvbjogXCIueG1sXCJcbiAgICB9XG4gIF07XG5cbiAgLy8gVE9ETyBSRU1PVkVcbiAgZXhwb3J0IGZ1bmN0aW9uIGlzRk1DQ29udGFpbmVyKHdvcmtzcGFjZSkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIC8vIFRPRE8gUkVNT1ZFXG4gIGV4cG9ydCBmdW5jdGlvbiBpc1dpa2lFbmFibGVkKHdvcmtzcGFjZSwgam9sb2tpYSwgbG9jYWxTdG9yYWdlKSB7XG4gICAgcmV0dXJuIHRydWU7XG4vKlxuICAgIHJldHVybiBHaXQuY3JlYXRlR2l0UmVwb3NpdG9yeSh3b3Jrc3BhY2UsIGpvbG9raWEsIGxvY2FsU3RvcmFnZSkgIT09IG51bGw7XG4qL1xuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIGdvVG9MaW5rKGxpbmssICR0aW1lb3V0LCAkbG9jYXRpb24pIHtcbiAgICB2YXIgaHJlZiA9IENvcmUudHJpbUxlYWRpbmcobGluaywgXCIjXCIpO1xuICAgICR0aW1lb3V0KCgpID0+IHtcbiAgICAgIGxvZy5kZWJ1ZyhcIkFib3V0IHRvIG5hdmlnYXRlIHRvOiBcIiArIGhyZWYpO1xuICAgICAgJGxvY2F0aW9uLnVybChocmVmKTtcbiAgICB9LCAxMDApO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgYWxsIHRoZSBsaW5rcyBmb3IgdGhlIGdpdmVuIGJyYW5jaCBmb3IgdGhlIGN1c3RvbSB2aWV3cywgc3RhcnRpbmcgd2l0aCBcIi9cIlxuICAgKiBAcGFyYW0gJHNjb3BlXG4gICAqIEByZXR1cm5zIHtzdHJpbmdbXX1cbiAgICovXG4gIGV4cG9ydCBmdW5jdGlvbiBjdXN0b21WaWV3TGlua3MoJHNjb3BlKSB7XG4gICAgdmFyIHByZWZpeCA9IENvcmUudHJpbUxlYWRpbmcoV2lraS5zdGFydExpbmsoJHNjb3BlKSwgXCIjXCIpO1xuICAgIHJldHVybiBjdXN0b21XaWtpVmlld1BhZ2VzLm1hcChwYXRoID0+IHByZWZpeCArIHBhdGgpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgYSBuZXcgY3JlYXRlIGRvY3VtZW50IHdpemFyZCB0cmVlXG4gICAqIEBtZXRob2QgY3JlYXRlV2l6YXJkVHJlZVxuICAgKiBAZm9yIFdpa2lcbiAgICogQHN0YXRpY1xuICAgKi9cbiAgZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVdpemFyZFRyZWUod29ya3NwYWNlLCAkc2NvcGUpIHtcbiAgICB2YXIgcm9vdCA9IGNyZWF0ZUZvbGRlcihcIk5ldyBEb2N1bWVudHNcIik7XG4gICAgYWRkQ3JlYXRlV2l6YXJkRm9sZGVycyh3b3Jrc3BhY2UsICRzY29wZSwgcm9vdCwgZG9jdW1lbnRUZW1wbGF0ZXMpO1xuICAgIHJldHVybiByb290O1xuICB9XG5cbiAgZnVuY3Rpb24gY3JlYXRlRm9sZGVyKG5hbWUpOiBhbnkge1xuICAgIHJldHVybiB7XG4gICAgICBuYW1lOiBuYW1lLFxuICAgICAgY2hpbGRyZW46IFtdXG4gICAgfTtcbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiBhZGRDcmVhdGVXaXphcmRGb2xkZXJzKHdvcmtzcGFjZSwgJHNjb3BlLCBwYXJlbnQsIHRlbXBsYXRlczogYW55W10pIHtcbiAgICBhbmd1bGFyLmZvckVhY2godGVtcGxhdGVzLCAodGVtcGxhdGUpID0+IHtcblxuICAgICAgaWYgKCB0ZW1wbGF0ZS5nZW5lcmF0ZWQgKSB7XG4gICAgICAgIGlmICggdGVtcGxhdGUuZ2VuZXJhdGVkLmluaXQgKSB7XG4gICAgICAgICAgdGVtcGxhdGUuZ2VuZXJhdGVkLmluaXQod29ya3NwYWNlLCAkc2NvcGUpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHZhciB0aXRsZSA9IHRlbXBsYXRlLmxhYmVsIHx8IGtleTtcbiAgICAgIHZhciBub2RlID0gY3JlYXRlRm9sZGVyKHRpdGxlKTtcbiAgICAgIG5vZGUucGFyZW50ID0gcGFyZW50O1xuICAgICAgbm9kZS5lbnRpdHkgPSB0ZW1wbGF0ZTtcblxuICAgICAgdmFyIGFkZENsYXNzID0gdGVtcGxhdGUuYWRkQ2xhc3M7XG4gICAgICBpZiAoYWRkQ2xhc3MpIHtcbiAgICAgICAgbm9kZS5hZGRDbGFzcyA9IGFkZENsYXNzO1xuICAgICAgfVxuXG4gICAgICB2YXIga2V5ID0gdGVtcGxhdGUuZXhlbXBsYXI7XG4gICAgICB2YXIgcGFyZW50S2V5ID0gcGFyZW50LmtleSB8fCBcIlwiO1xuICAgICAgbm9kZS5rZXkgPSBwYXJlbnRLZXkgPyBwYXJlbnRLZXkgKyBcIl9cIiArIGtleSA6IGtleTtcbiAgICAgIHZhciBpY29uID0gdGVtcGxhdGUuaWNvbjtcbiAgICAgIGlmIChpY29uKSB7XG4gICAgICAgIG5vZGUuaWNvbiA9IENvcmUudXJsKGljb24pO1xuICAgICAgfVxuICAgICAgLy8gY29tcGlsZXIgd2FzIGNvbXBsYWluaW5nIGFib3V0ICdsYWJlbCcgaGFkIG5vIGlkZWEgd2hlcmUgaXQncyBjb21pbmcgZnJvbVxuICAgICAgLy8gdmFyIHRvb2x0aXAgPSB2YWx1ZVtcInRvb2x0aXBcIl0gfHwgdmFsdWVbXCJkZXNjcmlwdGlvblwiXSB8fCBsYWJlbDtcbiAgICAgIHZhciB0b29sdGlwID0gdGVtcGxhdGVbXCJ0b29sdGlwXCJdIHx8IHRlbXBsYXRlW1wiZGVzY3JpcHRpb25cIl0gfHwgJyc7XG4gICAgICBub2RlLnRvb2x0aXAgPSB0b29sdGlwO1xuICAgICAgaWYgKHRlbXBsYXRlW1wiZm9sZGVyXCJdKSB7XG4gICAgICAgIG5vZGUuaXNGb2xkZXIgPSAoKSA9PiB7IHJldHVybiB0cnVlOyB9O1xuICAgICAgfVxuICAgICAgcGFyZW50LmNoaWxkcmVuLnB1c2gobm9kZSk7XG5cbiAgICAgIHZhciBjaGlsZHJlbiA9IHRlbXBsYXRlLmNoaWxkcmVuO1xuICAgICAgaWYgKGNoaWxkcmVuKSB7XG4gICAgICAgIGFkZENyZWF0ZVdpemFyZEZvbGRlcnMod29ya3NwYWNlLCAkc2NvcGUsIG5vZGUsIGNoaWxkcmVuKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiBzdGFydExpbmsoJHNjb3BlKSB7XG4gICAgdmFyIHByb2plY3RJZCA9ICRzY29wZS5wcm9qZWN0SWQ7XG4gICAgdmFyIG93bmVyID0gJHNjb3BlLm93bmVyO1xuICAgIHZhciByZXBvSWQgPSAkc2NvcGUucmVwb0lkIHx8IHByb2plY3RJZDtcbiAgICB2YXIgc3RhcnQgPSBVcmxIZWxwZXJzLmpvaW4oRGV2ZWxvcGVyLnByb2plY3RMaW5rKHByb2plY3RJZCksIFwiL3dpa2lcIiwgb3duZXIsIHJlcG9JZCk7XG4gICAgdmFyIGJyYW5jaCA9ICRzY29wZS5icmFuY2g7XG4gICAgaWYgKGJyYW5jaCkge1xuICAgICAgc3RhcnQgPSBVcmxIZWxwZXJzLmpvaW4oc3RhcnQsICdicmFuY2gnLCBicmFuY2gpO1xuICAgIH1cbiAgICByZXR1cm4gc3RhcnQ7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyB0cnVlIGlmIHRoZSBnaXZlbiBmaWxlbmFtZS9wYXRoIGlzIGFuIGluZGV4IHBhZ2UgKG5hbWVkIGluZGV4LiogYW5kIGlzIGEgbWFya2Rvd24vaHRtbCBwYWdlKS5cbiAgICpcbiAgICogQHBhcmFtIHBhdGhcbiAgICogQHJldHVybnMge2Jvb2xlYW59XG4gICAqL1xuICBleHBvcnQgZnVuY3Rpb24gaXNJbmRleFBhZ2UocGF0aDogc3RyaW5nKSB7XG4gICAgcmV0dXJuIHBhdGggJiYgKHBhdGguZW5kc1dpdGgoXCJpbmRleC5tZFwiKSB8fCBwYXRoLmVuZHNXaXRoKFwiaW5kZXguaHRtbFwiKSB8fCBwYXRoLmVuZHNXaXRoKFwiaW5kZXhcIikpID8gdHJ1ZSA6IGZhbHNlO1xuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIHZpZXdMaW5rKCRzY29wZSwgcGFnZUlkOnN0cmluZywgJGxvY2F0aW9uLCBmaWxlTmFtZTpzdHJpbmcgPSBudWxsKSB7XG4gICAgdmFyIGxpbms6c3RyaW5nID0gbnVsbDtcbiAgICB2YXIgc3RhcnQgPSBzdGFydExpbmsoJHNjb3BlKTtcbiAgICBpZiAocGFnZUlkKSB7XG4gICAgICAvLyBmaWd1cmUgb3V0IHdoaWNoIHZpZXcgdG8gdXNlIGZvciB0aGlzIHBhZ2VcbiAgICAgIHZhciB2aWV3ID0gaXNJbmRleFBhZ2UocGFnZUlkKSA/IFwiL2Jvb2svXCIgOiBcIi92aWV3L1wiO1xuICAgICAgbGluayA9IHN0YXJ0ICsgdmlldyArIGVuY29kZVBhdGgoQ29yZS50cmltTGVhZGluZyhwYWdlSWQsIFwiL1wiKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIGxldHMgdXNlIHRoZSBjdXJyZW50IHBhdGhcbiAgICAgIHZhciBwYXRoOnN0cmluZyA9ICRsb2NhdGlvbi5wYXRoKCk7XG4gICAgICBsaW5rID0gXCIjXCIgKyBwYXRoLnJlcGxhY2UoLyhlZGl0fGNyZWF0ZSkvLCBcInZpZXdcIik7XG4gICAgfVxuICAgIGlmIChmaWxlTmFtZSAmJiBwYWdlSWQgJiYgcGFnZUlkLmVuZHNXaXRoKGZpbGVOYW1lKSkge1xuICAgICAgcmV0dXJuIGxpbms7XG4gICAgfVxuICAgIGlmIChmaWxlTmFtZSkge1xuICAgICAgaWYgKCFsaW5rLmVuZHNXaXRoKFwiL1wiKSkge1xuICAgICAgICBsaW5rICs9IFwiL1wiO1xuICAgICAgfVxuICAgICAgbGluayArPSBmaWxlTmFtZTtcbiAgICB9XG4gICAgcmV0dXJuIGxpbms7XG4gIH1cblxuICBleHBvcnQgZnVuY3Rpb24gYnJhbmNoTGluaygkc2NvcGUsIHBhZ2VJZDogc3RyaW5nLCAkbG9jYXRpb24sIGZpbGVOYW1lOnN0cmluZyA9IG51bGwpIHtcbiAgICByZXR1cm4gdmlld0xpbmsoJHNjb3BlLCBwYWdlSWQsICRsb2NhdGlvbiwgZmlsZU5hbWUpO1xuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIGVkaXRMaW5rKCRzY29wZSwgcGFnZUlkOnN0cmluZywgJGxvY2F0aW9uKSB7XG4gICAgdmFyIGxpbms6c3RyaW5nID0gbnVsbDtcbiAgICB2YXIgZm9ybWF0ID0gV2lraS5maWxlRm9ybWF0KHBhZ2VJZCk7XG4gICAgc3dpdGNoIChmb3JtYXQpIHtcbiAgICAgIGNhc2UgXCJpbWFnZVwiOlxuICAgICAgICBicmVhaztcbiAgICAgIGRlZmF1bHQ6XG4gICAgICB2YXIgc3RhcnQgPSBzdGFydExpbmsoJHNjb3BlKTtcbiAgICAgIGlmIChwYWdlSWQpIHtcbiAgICAgICAgbGluayA9IHN0YXJ0ICsgXCIvZWRpdC9cIiArIGVuY29kZVBhdGgocGFnZUlkKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIGxldHMgdXNlIHRoZSBjdXJyZW50IHBhdGhcbiAgICAgICAgdmFyIHBhdGggPSAkbG9jYXRpb24ucGF0aCgpO1xuICAgICAgICBsaW5rID0gXCIjXCIgKyBwYXRoLnJlcGxhY2UoLyh2aWV3fGNyZWF0ZSkvLCBcImVkaXRcIik7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBsaW5rO1xuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZUxpbmsoJHNjb3BlLCBwYWdlSWQ6c3RyaW5nLCAkbG9jYXRpb24pIHtcbiAgICB2YXIgcGF0aCA9ICRsb2NhdGlvbi5wYXRoKCk7XG4gICAgdmFyIHN0YXJ0ID0gc3RhcnRMaW5rKCRzY29wZSk7XG4gICAgdmFyIGxpbmsgPSAnJztcbiAgICBpZiAocGFnZUlkKSB7XG4gICAgICBsaW5rID0gc3RhcnQgKyBcIi9jcmVhdGUvXCIgKyBlbmNvZGVQYXRoKHBhZ2VJZCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIGxldHMgdXNlIHRoZSBjdXJyZW50IHBhdGhcbiAgICAgIGxpbmsgPSBcIiNcIiArIHBhdGgucmVwbGFjZSgvKHZpZXd8ZWRpdHxmb3JtVGFibGUpLywgXCJjcmVhdGVcIik7XG4gICAgfVxuICAgIC8vIHdlIGhhdmUgdGhlIGxpbmsgc28gbGV0cyBub3cgcmVtb3ZlIHRoZSBsYXN0IHBhdGhcbiAgICAvLyBvciBpZiB0aGVyZSBpcyBubyAvIGluIHRoZSBwYXRoIHRoZW4gcmVtb3ZlIHRoZSBsYXN0IHNlY3Rpb25cbiAgICB2YXIgaWR4ID0gbGluay5sYXN0SW5kZXhPZihcIi9cIik7XG4gICAgaWYgKGlkeCA+IDAgJiYgISRzY29wZS5jaGlsZHJlbiAmJiAhcGF0aC5zdGFydHNXaXRoKFwiL3dpa2kvZm9ybVRhYmxlXCIpKSB7XG4gICAgICBsaW5rID0gbGluay5zdWJzdHJpbmcoMCwgaWR4ICsgMSk7XG4gICAgfVxuICAgIHJldHVybiBsaW5rO1xuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIGVuY29kZVBhdGgocGFnZUlkOnN0cmluZykge1xuICAgIHJldHVybiBwYWdlSWQuc3BsaXQoXCIvXCIpLm1hcChlbmNvZGVVUklDb21wb25lbnQpLmpvaW4oXCIvXCIpO1xuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIGRlY29kZVBhdGgocGFnZUlkOnN0cmluZykge1xuICAgIHJldHVybiBwYWdlSWQuc3BsaXQoXCIvXCIpLm1hcChkZWNvZGVVUklDb21wb25lbnQpLmpvaW4oXCIvXCIpO1xuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIGZpbGVGb3JtYXQobmFtZTpzdHJpbmcsIGZpbGVFeHRlbnNpb25UeXBlUmVnaXN0cnk/KSB7XG4gICAgdmFyIGV4dGVuc2lvbiA9IGZpbGVFeHRlbnNpb24obmFtZSk7XG4gICAgaWYgKG5hbWUpIHtcbiAgICAgIGlmIChuYW1lID09PSBcIkplbmtpbnNmaWxlXCIpIHtcbiAgICAgICAgZXh0ZW5zaW9uID0gXCJncm9vdnlcIjtcbiAgICAgIH1cbiAgICB9XG4gICAgdmFyIGFuc3dlciA9IG51bGw7XG4gICAgaWYgKCFmaWxlRXh0ZW5zaW9uVHlwZVJlZ2lzdHJ5KSB7XG4gICAgICBmaWxlRXh0ZW5zaW9uVHlwZVJlZ2lzdHJ5ID0gSGF3dGlvQ29yZS5pbmplY3Rvci5nZXQoXCJmaWxlRXh0ZW5zaW9uVHlwZVJlZ2lzdHJ5XCIpO1xuICAgIH1cbiAgICBhbmd1bGFyLmZvckVhY2goZmlsZUV4dGVuc2lvblR5cGVSZWdpc3RyeSwgKGFycmF5LCBrZXkpID0+IHtcbiAgICAgIGlmIChhcnJheS5pbmRleE9mKGV4dGVuc2lvbikgPj0gMCkge1xuICAgICAgICBhbnN3ZXIgPSBrZXk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIGFuc3dlcjtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIHRoZSBmaWxlIG5hbWUgb2YgdGhlIGdpdmVuIHBhdGg7IHN0cmlwcGluZyBvZmYgYW55IGRpcmVjdG9yaWVzXG4gICAqIEBtZXRob2QgZmlsZU5hbWVcbiAgICogQGZvciBXaWtpXG4gICAqIEBzdGF0aWNcbiAgICogQHBhcmFtIHtTdHJpbmd9IHBhdGhcbiAgICogQHJldHVybiB7U3RyaW5nfVxuICAgKi9cbiAgZXhwb3J0IGZ1bmN0aW9uIGZpbGVOYW1lKHBhdGg6IHN0cmluZykge1xuICAgIGlmIChwYXRoKSB7XG4gICAgICAgdmFyIGlkeCA9IHBhdGgubGFzdEluZGV4T2YoXCIvXCIpO1xuICAgICAgaWYgKGlkeCA+IDApIHtcbiAgICAgICAgcmV0dXJuIHBhdGguc3Vic3RyaW5nKGlkeCArIDEpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcGF0aDtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIHRoZSBmb2xkZXIgb2YgdGhlIGdpdmVuIHBhdGggKGV2ZXJ5dGhpbmcgYnV0IHRoZSBsYXN0IHBhdGggbmFtZSlcbiAgICogQG1ldGhvZCBmaWxlUGFyZW50XG4gICAqIEBmb3IgV2lraVxuICAgKiBAc3RhdGljXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoXG4gICAqIEByZXR1cm4ge1N0cmluZ31cbiAgICovXG4gIGV4cG9ydCBmdW5jdGlvbiBmaWxlUGFyZW50KHBhdGg6IHN0cmluZykge1xuICAgIGlmIChwYXRoKSB7XG4gICAgICAgdmFyIGlkeCA9IHBhdGgubGFzdEluZGV4T2YoXCIvXCIpO1xuICAgICAgaWYgKGlkeCA+IDApIHtcbiAgICAgICAgcmV0dXJuIHBhdGguc3Vic3RyaW5nKDAsIGlkeCk7XG4gICAgICB9XG4gICAgfVxuICAgIC8vIGxldHMgcmV0dXJuIHRoZSByb290IGRpcmVjdG9yeVxuICAgIHJldHVybiBcIlwiO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgdGhlIGZpbGUgbmFtZSBmb3IgdGhlIGdpdmVuIG5hbWU7IHdlIGhpZGUgc29tZSBleHRlbnNpb25zXG4gICAqIEBtZXRob2QgaGlkZUZpbmVOYW1lRXh0ZW5zaW9uc1xuICAgKiBAZm9yIFdpa2lcbiAgICogQHN0YXRpY1xuICAgKiBAcGFyYW0ge1N0cmluZ30gbmFtZVxuICAgKiBAcmV0dXJuIHtTdHJpbmd9XG4gICAqL1xuICBleHBvcnQgZnVuY3Rpb24gaGlkZUZpbGVOYW1lRXh0ZW5zaW9ucyhuYW1lKSB7XG4gICAgaWYgKG5hbWUpIHtcbiAgICAgIGFuZ3VsYXIuZm9yRWFjaChXaWtpLmhpZGVFeHRlbnNpb25zLCAoZXh0ZW5zaW9uKSA9PiB7XG4gICAgICAgIGlmIChuYW1lLmVuZHNXaXRoKGV4dGVuc2lvbikpIHtcbiAgICAgICAgICBuYW1lID0gbmFtZS5zdWJzdHJpbmcoMCwgbmFtZS5sZW5ndGggLSBleHRlbnNpb24ubGVuZ3RoKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICAgIHJldHVybiBuYW1lO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgdGhlIFVSTCB0byBwZXJmb3JtIGEgR0VUIG9yIFBPU1QgZm9yIHRoZSBnaXZlbiBicmFuY2ggbmFtZSBhbmQgcGF0aFxuICAgKi9cbiAgZXhwb3J0IGZ1bmN0aW9uIGdpdFJlc3RVUkwoJHNjb3BlLCBwYXRoOiBzdHJpbmcpIHtcbiAgICB2YXIgdXJsID0gZ2l0UmVsYXRpdmVVUkwoJHNjb3BlLCBwYXRoKTtcbiAgICB1cmwgPSBDb3JlLnVybCgnLycgKyB1cmwpO1xuXG4vKlxuICAgIHZhciBjb25uZWN0aW9uTmFtZSA9IENvcmUuZ2V0Q29ubmVjdGlvbk5hbWVQYXJhbWV0ZXIoKTtcbiAgICBpZiAoY29ubmVjdGlvbk5hbWUpIHtcbiAgICAgIHZhciBjb25uZWN0aW9uT3B0aW9ucyA9IENvcmUuZ2V0Q29ubmVjdE9wdGlvbnMoY29ubmVjdGlvbk5hbWUpO1xuICAgICAgaWYgKGNvbm5lY3Rpb25PcHRpb25zKSB7XG4gICAgICAgIGNvbm5lY3Rpb25PcHRpb25zLnBhdGggPSB1cmw7XG4gICAgICAgIHVybCA9IDxzdHJpbmc+Q29yZS5jcmVhdGVTZXJ2ZXJDb25uZWN0aW9uVXJsKGNvbm5lY3Rpb25PcHRpb25zKTtcbiAgICAgIH1cbiAgICB9XG5cbiovXG4gICAgcmV0dXJuIHVybDtcbiAgfVxuXG4gICAgZnVuY3Rpb24gZ2l0VXJsUHJlZml4KCkge1xuICAgICAgICB2YXIgcHJlZml4ID0gXCJcIjtcbiAgICAgICAgdmFyIGluamVjdG9yID0gSGF3dGlvQ29yZS5pbmplY3RvcjtcbiAgICAgICAgaWYgKGluamVjdG9yKSB7XG4gICAgICAgICAgICBwcmVmaXggPSBpbmplY3Rvci5nZXQoXCJXaWtpR2l0VXJsUHJlZml4XCIpIHx8IFwiXCI7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHByZWZpeDtcbiAgICB9XG5cbiAgICAvKipcbiAgICogUmV0dXJucyBhIHJlbGF0aXZlIFVSTCB0byBwZXJmb3JtIGEgR0VUIG9yIFBPU1QgZm9yIHRoZSBnaXZlbiBicmFuY2gvcGF0aFxuICAgKi9cbiAgZXhwb3J0IGZ1bmN0aW9uIGdpdFJlbGF0aXZlVVJMKCRzY29wZSwgcGF0aDogc3RyaW5nKSB7XG4gICAgICB2YXIgYnJhbmNoID0gJHNjb3BlLmJyYW5jaDtcbiAgICB2YXIgcHJlZml4ID0gZ2l0VXJsUHJlZml4KCk7XG4gICAgYnJhbmNoID0gYnJhbmNoIHx8IFwibWFzdGVyXCI7XG4gICAgcGF0aCA9IHBhdGggfHwgXCIvXCI7XG4gICAgcmV0dXJuIFVybEhlbHBlcnMuam9pbihwcmVmaXgsIFwiZ2l0L1wiICsgYnJhbmNoLCBwYXRoKTtcbiAgfVxuXG5cbiAgLyoqXG4gICAqIFRha2VzIGEgcm93IGNvbnRhaW5pbmcgdGhlIGVudGl0eSBvYmplY3Q7IG9yIGNhbiB0YWtlIHRoZSBlbnRpdHkgZGlyZWN0bHkuXG4gICAqXG4gICAqIEl0IHRoZW4gdXNlcyB0aGUgbmFtZSwgZGlyZWN0b3J5IGFuZCB4bWxOYW1lc3BhY2VzIHByb3BlcnRpZXNcbiAgICpcbiAgICogQG1ldGhvZCBmaWxlSWNvbkh0bWxcbiAgICogQGZvciBXaWtpXG4gICAqIEBzdGF0aWNcbiAgICogQHBhcmFtIHthbnl9IHJvd1xuICAgKiBAcmV0dXJuIHtTdHJpbmd9XG4gICAqXG4gICAqL1xuICBleHBvcnQgZnVuY3Rpb24gZmlsZUljb25IdG1sKHJvdykge1xuICAgIHZhciBuYW1lID0gcm93Lm5hbWU7XG4gICAgdmFyIHBhdGggPSByb3cucGF0aDtcbiAgICB2YXIgYnJhbmNoID0gcm93LmJyYW5jaCA7XG4gICAgdmFyIGRpcmVjdG9yeSA9IHJvdy5kaXJlY3Rvcnk7XG4gICAgdmFyIHhtbE5hbWVzcGFjZXMgPSByb3cueG1sTmFtZXNwYWNlcztcbiAgICB2YXIgaWNvblVybCA9IHJvdy5pY29uVXJsO1xuICAgIHZhciBlbnRpdHkgPSByb3cuZW50aXR5O1xuICAgIGlmIChlbnRpdHkpIHtcbiAgICAgIG5hbWUgPSBuYW1lIHx8IGVudGl0eS5uYW1lO1xuICAgICAgcGF0aCA9IHBhdGggfHwgZW50aXR5LnBhdGg7XG4gICAgICBicmFuY2ggPSBicmFuY2ggfHwgZW50aXR5LmJyYW5jaDtcbiAgICAgIGRpcmVjdG9yeSA9IGRpcmVjdG9yeSB8fCBlbnRpdHkuZGlyZWN0b3J5O1xuICAgICAgeG1sTmFtZXNwYWNlcyA9IHhtbE5hbWVzcGFjZXMgfHwgZW50aXR5LnhtbE5hbWVzcGFjZXM7XG4gICAgICBpY29uVXJsID0gaWNvblVybCB8fCBlbnRpdHkuaWNvblVybDtcbiAgICB9XG4gICAgYnJhbmNoID0gYnJhbmNoIHx8IFwibWFzdGVyXCI7XG4gICAgdmFyIGNzcyA9IG51bGw7XG4gICAgdmFyIGljb246c3RyaW5nID0gbnVsbDtcbiAgICB2YXIgZXh0ZW5zaW9uID0gZmlsZUV4dGVuc2lvbihuYW1lKTtcbiAgICAvLyBUT0RPIGNvdWxkIHdlIHVzZSBkaWZmZXJlbnQgaWNvbnMgZm9yIG1hcmtkb3duIHYgeG1sIHYgaHRtbFxuICAgIGlmICh4bWxOYW1lc3BhY2VzICYmIHhtbE5hbWVzcGFjZXMubGVuZ3RoKSB7XG4gICAgICBpZiAoeG1sTmFtZXNwYWNlcy5hbnkoKG5zKSA9PiBXaWtpLmNhbWVsTmFtZXNwYWNlcy5hbnkobnMpKSkge1xuICAgICAgICBpY29uID0gXCJpbWcvaWNvbnMvY2FtZWwuc3ZnXCI7XG4gICAgICB9IGVsc2UgaWYgKHhtbE5hbWVzcGFjZXMuYW55KChucykgPT4gV2lraS5kb3plck5hbWVzcGFjZXMuYW55KG5zKSkpIHtcbiAgICAgICAgaWNvbiA9IFwiaW1nL2ljb25zL2RvemVyL2RvemVyLmdpZlwiO1xuICAgICAgfSBlbHNlIGlmICh4bWxOYW1lc3BhY2VzLmFueSgobnMpID0+IFdpa2kuYWN0aXZlbXFOYW1lc3BhY2VzLmFueShucykpKSB7XG4gICAgICAgIGljb24gPSBcImltZy9pY29ucy9tZXNzYWdlYnJva2VyLnN2Z1wiO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbG9nLmRlYnVnKFwiZmlsZSBcIiArIG5hbWUgKyBcIiBoYXMgbmFtZXNwYWNlcyBcIiArIHhtbE5hbWVzcGFjZXMpO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAoIWljb25VcmwgJiYgbmFtZSkge1xuICAgICAgdmFyIGxvd2VyTmFtZSA9IG5hbWUudG9Mb3dlckNhc2UoKTtcbiAgICAgIGlmIChsb3dlck5hbWUgPT0gXCJwb20ueG1sXCIpIHtcbiAgICAgICAgaWNvblVybCA9IFwiaW1nL21hdmVuLWljb24ucG5nXCI7XG4gICAgICB9IGVsc2UgaWYgKGxvd2VyTmFtZSA9PSBcImplbmtpbnNmaWxlXCIpIHtcbiAgICAgICAgaWNvblVybCA9IFwiaW1nL2plbmtpbnMtaWNvbi5zdmdcIjtcbiAgICAgIH0gZWxzZSBpZiAobG93ZXJOYW1lID09IFwiZmFicmljOC55bWxcIikge1xuICAgICAgICBpY29uVXJsID0gXCJpbWcvZmFicmljOF9pY29uLnN2Z1wiO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChpY29uVXJsKSB7XG4gICAgICBjc3MgPSBudWxsO1xuICAgICAgaWNvbiA9IGljb25Vcmw7XG4vKlxuICAgICAgdmFyIHByZWZpeCA9IGdpdFVybFByZWZpeCgpO1xuICAgICAgaWNvbiA9IFVybEhlbHBlcnMuam9pbihwcmVmaXgsIFwiZ2l0XCIsIGljb25VcmwpO1xuKi9cbi8qXG4gICAgICB2YXIgY29ubmVjdGlvbk5hbWUgPSBDb3JlLmdldENvbm5lY3Rpb25OYW1lUGFyYW1ldGVyKCk7XG4gICAgICBpZiAoY29ubmVjdGlvbk5hbWUpIHtcbiAgICAgICAgdmFyIGNvbm5lY3Rpb25PcHRpb25zID0gQ29yZS5nZXRDb25uZWN0T3B0aW9ucyhjb25uZWN0aW9uTmFtZSk7XG4gICAgICAgIGlmIChjb25uZWN0aW9uT3B0aW9ucykge1xuICAgICAgICAgIGNvbm5lY3Rpb25PcHRpb25zLnBhdGggPSBDb3JlLnVybCgnLycgKyBpY29uKTtcbiAgICAgICAgICBpY29uID0gPHN0cmluZz5Db3JlLmNyZWF0ZVNlcnZlckNvbm5lY3Rpb25VcmwoY29ubmVjdGlvbk9wdGlvbnMpO1xuICAgICAgICB9XG4gICAgICB9XG4qL1xuICAgIH1cbiAgICBpZiAoIWljb24pIHtcbiAgICAgIGlmIChkaXJlY3RvcnkpIHtcbiAgICAgICAgc3dpdGNoIChleHRlbnNpb24pIHtcbiAgICAgICAgICBjYXNlICdwcm9maWxlJzpcbiAgICAgICAgICAgIGNzcyA9IFwiZmEgZmEtYm9va1wiO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIC8vIGxvZy5kZWJ1ZyhcIk5vIG1hdGNoIGZvciBleHRlbnNpb246IFwiLCBleHRlbnNpb24sIFwiIHVzaW5nIGEgZ2VuZXJpYyBmb2xkZXIgaWNvblwiKTtcbiAgICAgICAgICAgIGNzcyA9IFwiZmEgZmEtZm9sZGVyIGZvbGRlci1pY29uXCI7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHN3aXRjaCAoZXh0ZW5zaW9uKSB7XG4gICAgICAgICAgY2FzZSAnamF2YSc6XG4gICAgICAgICAgICBpY29uID0gXCJpbWcvamF2YS5zdmdcIjtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIGNhc2UgJ3BuZyc6XG4gICAgICAgICAgY2FzZSAnc3ZnJzpcbiAgICAgICAgICBjYXNlICdqcGcnOlxuICAgICAgICAgIGNhc2UgJ2dpZic6XG4gICAgICAgICAgICBjc3MgPSBudWxsO1xuICAgICAgICAgICAgaWNvbiA9IFdpa2kuZ2l0UmVsYXRpdmVVUkwoYnJhbmNoLCBwYXRoKTtcbi8qXG4gICAgICAgICAgICB2YXIgY29ubmVjdGlvbk5hbWUgPSBDb3JlLmdldENvbm5lY3Rpb25OYW1lUGFyYW1ldGVyKCk7XG4gICAgICAgICAgICBpZiAoY29ubmVjdGlvbk5hbWUpIHtcbiAgICAgICAgICAgICAgdmFyIGNvbm5lY3Rpb25PcHRpb25zID0gQ29yZS5nZXRDb25uZWN0T3B0aW9ucyhjb25uZWN0aW9uTmFtZSk7XG4gICAgICAgICAgICAgIGlmIChjb25uZWN0aW9uT3B0aW9ucykge1xuICAgICAgICAgICAgICAgIGNvbm5lY3Rpb25PcHRpb25zLnBhdGggPSBDb3JlLnVybCgnLycgKyBpY29uKTtcbiAgICAgICAgICAgICAgICBpY29uID0gPHN0cmluZz5Db3JlLmNyZWF0ZVNlcnZlckNvbm5lY3Rpb25VcmwoY29ubmVjdGlvbk9wdGlvbnMpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4qL1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgY2FzZSAnanNvbic6XG4gICAgICAgICAgY2FzZSAneG1sJzpcbiAgICAgICAgICAgIGNzcyA9IFwiZmEgZmEtZmlsZS10ZXh0XCI7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICBjYXNlICdtZCc6XG4gICAgICAgICAgICBjc3MgPSBcImZhIGZhLWZpbGUtdGV4dC1vXCI7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgLy8gbG9nLmRlYnVnKFwiTm8gbWF0Y2ggZm9yIGV4dGVuc2lvbjogXCIsIGV4dGVuc2lvbiwgXCIgdXNpbmcgYSBnZW5lcmljIGZpbGUgaWNvblwiKTtcbiAgICAgICAgICAgIGNzcyA9IFwiZmEgZmEtZmlsZS1vXCI7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKGljb24pIHtcbiAgICAgIHJldHVybiBcIjxpbWcgc3JjPSdcIiArIENvcmUudXJsKGljb24pICsgXCInPlwiO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gXCI8aSBjbGFzcz0nXCIgKyBjc3MgKyBcIic+PC9pPlwiO1xuICAgIH1cbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiBpY29uQ2xhc3Mocm93KSB7XG4gICAgdmFyIG5hbWUgPSByb3cuZ2V0UHJvcGVydHkoXCJuYW1lXCIpO1xuICAgIHZhciBleHRlbnNpb24gPSBmaWxlRXh0ZW5zaW9uKG5hbWUpO1xuICAgIHZhciBkaXJlY3RvcnkgPSByb3cuZ2V0UHJvcGVydHkoXCJkaXJlY3RvcnlcIik7XG4gICAgaWYgKGRpcmVjdG9yeSkge1xuICAgICAgcmV0dXJuIFwiZmEgZmEtZm9sZGVyXCI7XG4gICAgfVxuICAgIGlmIChcInhtbFwiID09PSBleHRlbnNpb24pIHtcbiAgICAgICAgcmV0dXJuIFwiZmEgZmEtY29nXCI7XG4gICAgfSBlbHNlIGlmIChcIm1kXCIgPT09IGV4dGVuc2lvbikge1xuICAgICAgICByZXR1cm4gXCJmYSBmYS1maWxlLXRleHQtb1wiO1xuICAgIH1cbiAgICAvLyBUT0RPIGNvdWxkIHdlIHVzZSBkaWZmZXJlbnQgaWNvbnMgZm9yIG1hcmtkb3duIHYgeG1sIHYgaHRtbFxuICAgIHJldHVybiBcImZhIGZhLWZpbGUtb1wiO1xuICB9XG5cblxuICAvKipcbiAgICogRXh0cmFjdHMgdGhlIHBhZ2VJZCwgYnJhbmNoLCBvYmplY3RJZCBmcm9tIHRoZSByb3V0ZSBwYXJhbWV0ZXJzXG4gICAqIEBtZXRob2QgaW5pdFNjb3BlXG4gICAqIEBmb3IgV2lraVxuICAgKiBAc3RhdGljXG4gICAqIEBwYXJhbSB7Kn0gJHNjb3BlXG4gICAqIEBwYXJhbSB7YW55fSAkcm91dGVQYXJhbXNcbiAgICogQHBhcmFtIHtuZy5JTG9jYXRpb25TZXJ2aWNlfSAkbG9jYXRpb25cbiAgICovXG4gIGV4cG9ydCBmdW5jdGlvbiBpbml0U2NvcGUoJHNjb3BlLCAkcm91dGVQYXJhbXMsICRsb2NhdGlvbikge1xuICAgICRzY29wZS5wYWdlSWQgPSBXaWtpLnBhZ2VJZCgkcm91dGVQYXJhbXMsICRsb2NhdGlvbik7XG4gICAgJHNjb3BlLm93bmVyID0gJHJvdXRlUGFyYW1zW1wib3duZXJcIl07XG4gICAgJHNjb3BlLnJlcG9JZCA9ICRyb3V0ZVBhcmFtc1tcInJlcG9JZFwiXTtcbiAgICAkc2NvcGUucHJvamVjdElkID0gJHJvdXRlUGFyYW1zW1wicHJvamVjdElkXCJdO1xuICAgICRzY29wZS5uYW1lc3BhY2UgPSAkcm91dGVQYXJhbXNbXCJuYW1lc3BhY2VcIl07XG4gICAgJHNjb3BlLmJyYW5jaCA9ICRyb3V0ZVBhcmFtc1tcImJyYW5jaFwiXSB8fCAkbG9jYXRpb24uc2VhcmNoKClbXCJicmFuY2hcIl07XG4gICAgJHNjb3BlLm9iamVjdElkID0gJHJvdXRlUGFyYW1zW1wib2JqZWN0SWRcIl0gfHwgJHJvdXRlUGFyYW1zW1wiZGlmZk9iamVjdElkMVwiXTtcbiAgICAkc2NvcGUuc3RhcnRMaW5rID0gc3RhcnRMaW5rKCRzY29wZSk7XG4gICAgJHNjb3BlLiR2aWV3TGluayA9IHZpZXdMaW5rKCRzY29wZSwgJHNjb3BlLnBhZ2VJZCwgJGxvY2F0aW9uKTtcbiAgICAkc2NvcGUuaGlzdG9yeUxpbmsgPSBzdGFydExpbmsoJHNjb3BlKSArIFwiL2hpc3RvcnkvXCIgKyAoJHNjb3BlLnBhZ2VJZCB8fCBcIlwiKTtcbiAgICAkc2NvcGUud2lraVJlcG9zaXRvcnkgPSBuZXcgR2l0V2lraVJlcG9zaXRvcnkoJHNjb3BlKTtcblxuICAgICRzY29wZS4kd29ya3NwYWNlTGluayA9IERldmVsb3Blci53b3Jrc3BhY2VMaW5rKCk7XG4gICAgJHNjb3BlLiRwcm9qZWN0TGluayA9IERldmVsb3Blci5wcm9qZWN0TGluaygkc2NvcGUucHJvamVjdElkKTtcbiAgICAkc2NvcGUuYnJlYWRjcnVtYkNvbmZpZyA9IERldmVsb3Blci5jcmVhdGVQcm9qZWN0QnJlYWRjcnVtYnMoJHNjb3BlLnByb2plY3RJZCwgY3JlYXRlU291cmNlQnJlYWRjcnVtYnMoJHNjb3BlKSk7XG4gICAgJHNjb3BlLnN1YlRhYkNvbmZpZyA9IERldmVsb3Blci5jcmVhdGVQcm9qZWN0U3ViTmF2QmFycygkc2NvcGUucHJvamVjdElkKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBMb2FkcyB0aGUgYnJhbmNoZXMgZm9yIHRoaXMgd2lraSByZXBvc2l0b3J5IGFuZCBzdG9yZXMgdGhlbSBpbiB0aGUgYnJhbmNoZXMgcHJvcGVydHkgaW5cbiAgICogdGhlICRzY29wZSBhbmQgZW5zdXJlcyAkc2NvcGUuYnJhbmNoIGlzIHNldCB0byBhIHZhbGlkIHZhbHVlXG4gICAqXG4gICAqIEBwYXJhbSB3aWtpUmVwb3NpdG9yeVxuICAgKiBAcGFyYW0gJHNjb3BlXG4gICAqIEBwYXJhbSBpc0ZtYyB3aGV0aGVyIHdlIHJ1biBhcyBmYWJyaWM4IG9yIGFzIGhhd3Rpb1xuICAgKi9cbiAgZXhwb3J0IGZ1bmN0aW9uIGxvYWRCcmFuY2hlcyhqb2xva2lhLCB3aWtpUmVwb3NpdG9yeSwgJHNjb3BlLCBpc0ZtYyA9IGZhbHNlKSB7XG4gICAgd2lraVJlcG9zaXRvcnkuYnJhbmNoZXMoKHJlc3BvbnNlKSA9PiB7XG4gICAgICAvLyBsZXRzIHNvcnQgYnkgdmVyc2lvbiBudW1iZXJcbiAgICAgICRzY29wZS5icmFuY2hlcyA9IHJlc3BvbnNlLnNvcnRCeSgodikgPT4gQ29yZS52ZXJzaW9uVG9Tb3J0YWJsZVN0cmluZyh2KSwgdHJ1ZSk7XG5cbiAgICAgIC8vIGRlZmF1bHQgdGhlIGJyYW5jaCBuYW1lIGlmIHdlIGhhdmUgJ21hc3RlcidcbiAgICAgIGlmICghJHNjb3BlLmJyYW5jaCAmJiAkc2NvcGUuYnJhbmNoZXMuZmluZCgoYnJhbmNoKSA9PiB7XG4gICAgICAgIHJldHVybiBicmFuY2ggPT09IFwibWFzdGVyXCI7XG4gICAgICB9KSkge1xuICAgICAgICAkc2NvcGUuYnJhbmNoID0gXCJtYXN0ZXJcIjtcbiAgICAgIH1cbiAgICAgIENvcmUuJGFwcGx5KCRzY29wZSk7XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogRXh0cmFjdHMgdGhlIHBhZ2VJZCBmcm9tIHRoZSByb3V0ZSBwYXJhbWV0ZXJzXG4gICAqIEBtZXRob2QgcGFnZUlkXG4gICAqIEBmb3IgV2lraVxuICAgKiBAc3RhdGljXG4gICAqIEBwYXJhbSB7YW55fSAkcm91dGVQYXJhbXNcbiAgICogQHBhcmFtIEBuZy5JTG9jYXRpb25TZXJ2aWNlIEBsb2NhdGlvblxuICAgKiBAcmV0dXJuIHtTdHJpbmd9XG4gICAqL1xuICBleHBvcnQgZnVuY3Rpb24gcGFnZUlkKCRyb3V0ZVBhcmFtcywgJGxvY2F0aW9uKSB7XG4gICAgdmFyIHBhZ2VJZCA9ICRyb3V0ZVBhcmFtc1sncGFnZSddO1xuICAgIGlmICghcGFnZUlkKSB7XG4gICAgICAvLyBMZXRzIGRlYWwgd2l0aCB0aGUgaGFjayBvZiBBbmd1bGFySlMgbm90IHN1cHBvcnRpbmcgLyBpbiBhIHBhdGggdmFyaWFibGVcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgMTAwOyBpKyspIHtcbiAgICAgICAgdmFyIHZhbHVlID0gJHJvdXRlUGFyYW1zWydwYXRoJyArIGldO1xuICAgICAgICBpZiAoYW5ndWxhci5pc0RlZmluZWQodmFsdWUpKSB7XG4gICAgICAgICAgaWYgKCFwYWdlSWQpIHtcbiAgICAgICAgICAgIHBhZ2VJZCA9IHZhbHVlO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBwYWdlSWQgKz0gXCIvXCIgKyB2YWx1ZTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBicmVhaztcbiAgICAgIH1cbiAgICAgIHJldHVybiBwYWdlSWQgfHwgXCIvXCI7XG4gICAgfVxuXG4gICAgLy8gaWYgbm8gJHJvdXRlUGFyYW1zIHZhcmlhYmxlcyBsZXRzIGZpZ3VyZSBpdCBvdXQgZnJvbSB0aGUgJGxvY2F0aW9uXG4gICAgaWYgKCFwYWdlSWQpIHtcbiAgICAgIHBhZ2VJZCA9IHBhZ2VJZEZyb21VUkkoJGxvY2F0aW9uLnBhdGgoKSk7XG4gICAgfVxuICAgIHJldHVybiBwYWdlSWQ7XG4gIH1cblxuICBleHBvcnQgZnVuY3Rpb24gcGFnZUlkRnJvbVVSSSh1cmw6c3RyaW5nKSB7XG4gICAgdmFyIHdpa2lQcmVmaXggPSBcIi93aWtpL1wiO1xuICAgIGlmICh1cmwgJiYgdXJsLnN0YXJ0c1dpdGgod2lraVByZWZpeCkpIHtcbiAgICAgIHZhciBpZHggPSB1cmwuaW5kZXhPZihcIi9cIiwgd2lraVByZWZpeC5sZW5ndGggKyAxKTtcbiAgICAgIGlmIChpZHggPiAwKSB7XG4gICAgICAgIHJldHVybiB1cmwuc3Vic3RyaW5nKGlkeCArIDEsIHVybC5sZW5ndGgpXG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBudWxsXG5cbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiBmaWxlRXh0ZW5zaW9uKG5hbWUpIHtcbiAgICBpZiAobmFtZS5pbmRleE9mKCcjJykgPiAwKVxuICAgICAgbmFtZSA9IG5hbWUuc3Vic3RyaW5nKDAsIG5hbWUuaW5kZXhPZignIycpKTtcbiAgICByZXR1cm4gQ29yZS5maWxlRXh0ZW5zaW9uKG5hbWUsIFwibWFya2Rvd25cIik7XG4gIH1cblxuXG4gIGV4cG9ydCBmdW5jdGlvbiBvbkNvbXBsZXRlKHN0YXR1cykge1xuICAgIGNvbnNvbGUubG9nKFwiQ29tcGxldGVkIG9wZXJhdGlvbiB3aXRoIHN0YXR1czogXCIgKyBKU09OLnN0cmluZ2lmeShzdGF0dXMpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBQYXJzZXMgdGhlIGdpdmVuIEpTT04gdGV4dCByZXBvcnRpbmcgdG8gdGhlIHVzZXIgaWYgdGhlcmUgaXMgYSBwYXJzZSBlcnJvclxuICAgKiBAbWV0aG9kIHBhcnNlSnNvblxuICAgKiBAZm9yIFdpa2lcbiAgICogQHN0YXRpY1xuICAgKiBAcGFyYW0ge1N0cmluZ30gdGV4dFxuICAgKiBAcmV0dXJuIHthbnl9XG4gICAqL1xuICBleHBvcnQgZnVuY3Rpb24gcGFyc2VKc29uKHRleHQ6c3RyaW5nKSB7XG4gICAgaWYgKHRleHQpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIHJldHVybiBKU09OLnBhcnNlKHRleHQpO1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBDb3JlLm5vdGlmaWNhdGlvbihcImVycm9yXCIsIFwiRmFpbGVkIHRvIHBhcnNlIEpTT046IFwiICsgZSk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgLyoqXG4gICAqIEFkanVzdHMgYSByZWxhdGl2ZSBvciBhYnNvbHV0ZSBsaW5rIGZyb20gYSB3aWtpIG9yIGZpbGUgc3lzdGVtIHRvIG9uZSB1c2luZyB0aGUgaGFzaCBiYW5nIHN5bnRheFxuICAgKiBAbWV0aG9kIGFkanVzdEhyZWZcbiAgICogQGZvciBXaWtpXG4gICAqIEBzdGF0aWNcbiAgICogQHBhcmFtIHsqfSAkc2NvcGVcbiAgICogQHBhcmFtIHtuZy5JTG9jYXRpb25TZXJ2aWNlfSAkbG9jYXRpb25cbiAgICogQHBhcmFtIHtTdHJpbmd9IGhyZWZcbiAgICogQHBhcmFtIHtTdHJpbmd9IGZpbGVFeHRlbnNpb25cbiAgICogQHJldHVybiB7c3RyaW5nfVxuICAgKi9cbiAgZXhwb3J0IGZ1bmN0aW9uIGFkanVzdEhyZWYoJHNjb3BlLCAkbG9jYXRpb24sIGhyZWYsIGZpbGVFeHRlbnNpb24pIHtcbiAgICB2YXIgZXh0ZW5zaW9uID0gZmlsZUV4dGVuc2lvbiA/IFwiLlwiICsgZmlsZUV4dGVuc2lvbiA6IFwiXCI7XG5cbiAgICAvLyBpZiB0aGUgbGFzdCBwYXJ0IG9mIHRoZSBwYXRoIGhhcyBhIGRvdCBpbiBpdCBsZXRzXG4gICAgLy8gZXhjbHVkZSBpdCBhcyB3ZSBhcmUgcmVsYXRpdmUgdG8gYSBtYXJrZG93biBvciBodG1sIGZpbGUgaW4gYSBmb2xkZXJcbiAgICAvLyBzdWNoIGFzIHdoZW4gdmlld2luZyByZWFkbWUubWQgb3IgaW5kZXgubWRcbiAgICB2YXIgcGF0aCA9ICRsb2NhdGlvbi5wYXRoKCk7XG4gICAgdmFyIGZvbGRlclBhdGggPSBwYXRoO1xuICAgIHZhciBpZHggPSBwYXRoLmxhc3RJbmRleE9mKFwiL1wiKTtcbiAgICBpZiAoaWR4ID4gMCkge1xuICAgICAgdmFyIGxhc3ROYW1lID0gcGF0aC5zdWJzdHJpbmcoaWR4ICsgMSk7XG4gICAgICBpZiAobGFzdE5hbWUuaW5kZXhPZihcIi5cIikgPj0gMCkge1xuICAgICAgICBmb2xkZXJQYXRoID0gcGF0aC5zdWJzdHJpbmcoMCwgaWR4KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBEZWFsIHdpdGggcmVsYXRpdmUgVVJMcyBmaXJzdC4uLlxuICAgIGlmIChocmVmLnN0YXJ0c1dpdGgoJy4uLycpKSB7XG4gICAgICB2YXIgcGFydHMgPSBocmVmLnNwbGl0KCcvJyk7XG4gICAgICB2YXIgcGF0aFBhcnRzID0gZm9sZGVyUGF0aC5zcGxpdCgnLycpO1xuICAgICAgdmFyIHBhcmVudHMgPSBwYXJ0cy5maWx0ZXIoKHBhcnQpID0+IHtcbiAgICAgICAgcmV0dXJuIHBhcnQgPT09IFwiLi5cIjtcbiAgICAgIH0pO1xuICAgICAgcGFydHMgPSBwYXJ0cy5sYXN0KHBhcnRzLmxlbmd0aCAtIHBhcmVudHMubGVuZ3RoKTtcbiAgICAgIHBhdGhQYXJ0cyA9IHBhdGhQYXJ0cy5maXJzdChwYXRoUGFydHMubGVuZ3RoIC0gcGFyZW50cy5sZW5ndGgpO1xuXG4gICAgICByZXR1cm4gJyMnICsgcGF0aFBhcnRzLmpvaW4oJy8nKSArICcvJyArIHBhcnRzLmpvaW4oJy8nKSArIGV4dGVuc2lvbiArICRsb2NhdGlvbi5oYXNoKCk7XG4gICAgfVxuXG4gICAgLy8gVHVybiBhbiBhYnNvbHV0ZSBsaW5rIGludG8gYSB3aWtpIGxpbmsuLi5cbiAgICBpZiAoaHJlZi5zdGFydHNXaXRoKCcvJykpIHtcbiAgICAgIHJldHVybiBXaWtpLmJyYW5jaExpbmsoJHNjb3BlLCBocmVmICsgZXh0ZW5zaW9uLCAkbG9jYXRpb24pICsgZXh0ZW5zaW9uO1xuICAgIH1cblxuICAgIGlmICghV2lraS5leGNsdWRlQWRqdXN0bWVudFByZWZpeGVzLmFueSgoZXhjbHVkZSkgPT4ge1xuICAgICAgcmV0dXJuIGhyZWYuc3RhcnRzV2l0aChleGNsdWRlKTtcbiAgICB9KSkge1xuICAgICAgcmV0dXJuICcjJyArIGZvbGRlclBhdGggKyBcIi9cIiArIGhyZWYgKyBleHRlbnNpb24gKyAkbG9jYXRpb24uaGFzaCgpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gIH1cbn1cbiIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9pbmNsdWRlcy50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJ3aWtpSGVscGVycy50c1wiLz5cblxuLyoqXG4gKiBAbW9kdWxlIFdpa2lcbiAqIEBtYWluIFdpa2lcbiAqL1xubW9kdWxlIFdpa2kge1xuXG4gIGV4cG9ydCB2YXIgcGx1Z2luTmFtZSA9ICd3aWtpJztcbiAgZXhwb3J0IHZhciB0ZW1wbGF0ZVBhdGggPSAncGx1Z2lucy93aWtpL2h0bWwvJztcbiAgZXhwb3J0IHZhciB0YWI6YW55ID0gbnVsbDtcblxuICBleHBvcnQgdmFyIF9tb2R1bGUgPSBhbmd1bGFyLm1vZHVsZShwbHVnaW5OYW1lLCBbJ2hhd3Rpby1jb3JlJywgJ2hhd3Rpby11aScsICd0cmVlQ29udHJvbCcsICd1aS5jb2RlbWlycm9yJ10pO1xuICBleHBvcnQgdmFyIGNvbnRyb2xsZXIgPSBQbHVnaW5IZWxwZXJzLmNyZWF0ZUNvbnRyb2xsZXJGdW5jdGlvbihfbW9kdWxlLCAnV2lraScpO1xuICBleHBvcnQgdmFyIHJvdXRlID0gUGx1Z2luSGVscGVycy5jcmVhdGVSb3V0aW5nRnVuY3Rpb24odGVtcGxhdGVQYXRoKTtcblxuICBfbW9kdWxlLmNvbmZpZyhbXCIkcm91dGVQcm92aWRlclwiLCAoJHJvdXRlUHJvdmlkZXIpID0+IHtcblxuICAgIC8vIGFsbG93IG9wdGlvbmFsIGJyYW5jaCBwYXRocy4uLlxuICAgIGFuZ3VsYXIuZm9yRWFjaChbXCJcIiwgXCIvYnJhbmNoLzpicmFuY2hcIl0sIChwYXRoKSA9PiB7XG4gICAgICAvL3ZhciBzdGFydENvbnRleHQgPSAnL3dpa2knO1xuICAgICAgdmFyIHN0YXJ0Q29udGV4dCA9ICcvd29ya3NwYWNlcy86bmFtZXNwYWNlL3Byb2plY3RzLzpwcm9qZWN0SWQvd2lraS86b3duZXIvOnJlcG9JZCc7XG4gICAgICAkcm91dGVQcm92aWRlci5cbiAgICAgICAgICAgICAgd2hlbihVcmxIZWxwZXJzLmpvaW4oc3RhcnRDb250ZXh0LCBwYXRoLCAndmlldycpLCByb3V0ZSgndmlld1BhZ2UuaHRtbCcsIGZhbHNlKSkuXG4gICAgICAgICAgICAgIHdoZW4oVXJsSGVscGVycy5qb2luKHN0YXJ0Q29udGV4dCwgcGF0aCwgJ2NyZWF0ZS86cGFnZSonKSwgcm91dGUoJ2NyZWF0ZS5odG1sJywgZmFsc2UpKS5cbiAgICAgICAgICAgICAgd2hlbihzdGFydENvbnRleHQgKyBwYXRoICsgJy92aWV3LzpwYWdlKicsIHt0ZW1wbGF0ZVVybDogJ3BsdWdpbnMvd2lraS9odG1sL3ZpZXdQYWdlLmh0bWwnLCByZWxvYWRPblNlYXJjaDogZmFsc2V9KS5cbiAgICAgICAgICAgICAgd2hlbihzdGFydENvbnRleHQgKyBwYXRoICsgJy9ib29rLzpwYWdlKicsIHt0ZW1wbGF0ZVVybDogJ3BsdWdpbnMvd2lraS9odG1sL3ZpZXdCb29rLmh0bWwnLCByZWxvYWRPblNlYXJjaDogZmFsc2V9KS5cbiAgICAgICAgICAgICAgd2hlbihzdGFydENvbnRleHQgKyBwYXRoICsgJy9lZGl0LzpwYWdlKicsIHt0ZW1wbGF0ZVVybDogJ3BsdWdpbnMvd2lraS9odG1sL2VkaXRQYWdlLmh0bWwnfSkuXG4gICAgICAgICAgICAgIHdoZW4oc3RhcnRDb250ZXh0ICsgcGF0aCArICcvdmVyc2lvbi86cGFnZSpcXC86b2JqZWN0SWQnLCB7dGVtcGxhdGVVcmw6ICdwbHVnaW5zL3dpa2kvaHRtbC92aWV3UGFnZS5odG1sJ30pLlxuICAgICAgICAgICAgICB3aGVuKHN0YXJ0Q29udGV4dCArIHBhdGggKyAnL2hpc3RvcnkvOnBhZ2UqJywge3RlbXBsYXRlVXJsOiAncGx1Z2lucy93aWtpL2h0bWwvaGlzdG9yeS5odG1sJ30pLlxuICAgICAgICAgICAgICB3aGVuKHN0YXJ0Q29udGV4dCArIHBhdGggKyAnL2NvbW1pdC86cGFnZSpcXC86b2JqZWN0SWQnLCB7dGVtcGxhdGVVcmw6ICdwbHVnaW5zL3dpa2kvaHRtbC9jb21taXQuaHRtbCd9KS5cbiAgICAgICAgICAgICAgd2hlbihzdGFydENvbnRleHQgKyBwYXRoICsgJy9kaWZmLzpwYWdlKlxcLzpkaWZmT2JqZWN0SWQxLzpkaWZmT2JqZWN0SWQyJywge3RlbXBsYXRlVXJsOiAncGx1Z2lucy93aWtpL2h0bWwvdmlld1BhZ2UuaHRtbCcsIHJlbG9hZE9uU2VhcmNoOiBmYWxzZX0pLlxuICAgICAgICAgICAgICB3aGVuKHN0YXJ0Q29udGV4dCArIHBhdGggKyAnL2Zvcm1UYWJsZS86cGFnZSonLCB7dGVtcGxhdGVVcmw6ICdwbHVnaW5zL3dpa2kvaHRtbC9mb3JtVGFibGUuaHRtbCd9KS5cbiAgICAgICAgICAgICAgd2hlbihzdGFydENvbnRleHQgKyBwYXRoICsgJy9kb3plci9tYXBwaW5ncy86cGFnZSonLCB7dGVtcGxhdGVVcmw6ICdwbHVnaW5zL3dpa2kvaHRtbC9kb3plck1hcHBpbmdzLmh0bWwnfSkuXG4gICAgICAgICAgICAgIHdoZW4oc3RhcnRDb250ZXh0ICsgcGF0aCArICcvY29uZmlndXJhdGlvbnMvOnBhZ2UqJywgeyB0ZW1wbGF0ZVVybDogJ3BsdWdpbnMvd2lraS9odG1sL2NvbmZpZ3VyYXRpb25zLmh0bWwnIH0pLlxuICAgICAgICAgICAgICB3aGVuKHN0YXJ0Q29udGV4dCArIHBhdGggKyAnL2NvbmZpZ3VyYXRpb24vOnBpZC86cGFnZSonLCB7IHRlbXBsYXRlVXJsOiAncGx1Z2lucy93aWtpL2h0bWwvY29uZmlndXJhdGlvbi5odG1sJyB9KS5cbiAgICAgICAgICAgICAgd2hlbihzdGFydENvbnRleHQgKyBwYXRoICsgJy9uZXdDb25maWd1cmF0aW9uLzpmYWN0b3J5UGlkLzpwYWdlKicsIHsgdGVtcGxhdGVVcmw6ICdwbHVnaW5zL3dpa2kvaHRtbC9jb25maWd1cmF0aW9uLmh0bWwnIH0pO1xuICAgIH0pO1xufV0pO1xuXG4gIC8qKlxuICAgKiBCcmFuY2ggTWVudSBzZXJ2aWNlXG4gICAqL1xuICBleHBvcnQgaW50ZXJmYWNlIEJyYW5jaE1lbnUge1xuICAgIGFkZEV4dGVuc2lvbjogKGl0ZW06VUkuTWVudUl0ZW0pID0+IHZvaWQ7XG4gICAgYXBwbHlNZW51RXh0ZW5zaW9uczogKG1lbnU6VUkuTWVudUl0ZW1bXSkgPT4gdm9pZDtcbiAgfVxuXG4gIF9tb2R1bGUuZmFjdG9yeSgnd2lraUJyYW5jaE1lbnUnLCAoKSA9PiB7XG4gICAgdmFyIHNlbGYgPSB7XG4gICAgICBpdGVtczogW10sXG4gICAgICBhZGRFeHRlbnNpb246IChpdGVtOlVJLk1lbnVJdGVtKSA9PiB7XG4gICAgICAgIHNlbGYuaXRlbXMucHVzaChpdGVtKTtcbiAgICAgIH0sXG4gICAgICBhcHBseU1lbnVFeHRlbnNpb25zOiAobWVudTpVSS5NZW51SXRlbVtdKSA9PiB7XG4gICAgICAgIGlmIChzZWxmLml0ZW1zLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICB2YXIgZXh0ZW5kZWRNZW51OlVJLk1lbnVJdGVtW10gPSBbe1xuICAgICAgICAgIGhlYWRpbmc6IFwiQWN0aW9uc1wiXG4gICAgICAgIH1dO1xuICAgICAgICBzZWxmLml0ZW1zLmZvckVhY2goKGl0ZW06VUkuTWVudUl0ZW0pID0+IHtcbiAgICAgICAgICBpZiAoaXRlbS52YWxpZCgpKSB7XG4gICAgICAgICAgICBleHRlbmRlZE1lbnUucHVzaChpdGVtKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBpZiAoZXh0ZW5kZWRNZW51Lmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICBtZW51LmFkZChleHRlbmRlZE1lbnUpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfTtcbiAgICByZXR1cm4gc2VsZjtcbiAgfSk7XG5cbiAgX21vZHVsZS5mYWN0b3J5KCdXaWtpR2l0VXJsUHJlZml4JywgKCkgPT4ge1xuICAgICAgcmV0dXJuIFwiXCI7XG4gIH0pO1xuXG4gIF9tb2R1bGUuZmFjdG9yeSgnZmlsZUV4dGVuc2lvblR5cGVSZWdpc3RyeScsICgpID0+IHtcbiAgICByZXR1cm4ge1xuICAgICAgXCJpbWFnZVwiOiBbXCJzdmdcIiwgXCJwbmdcIiwgXCJpY29cIiwgXCJibXBcIiwgXCJqcGdcIiwgXCJnaWZcIl0sXG4gICAgICBcIm1hcmtkb3duXCI6IFtcIm1kXCIsIFwibWFya2Rvd25cIiwgXCJtZG93blwiLCBcIm1rZG5cIiwgXCJta2RcIl0sXG4gICAgICBcImh0bWxtaXhlZFwiOiBbXCJodG1sXCIsIFwieGh0bWxcIiwgXCJodG1cIl0sXG4gICAgICBcInRleHQveC1qYXZhXCI6IFtcImphdmFcIl0sXG4gICAgICBcInRleHQveC1ncm9vdnlcIjogW1wiZ3Jvb3Z5XCJdLFxuICAgICAgXCJ0ZXh0L3gtc2NhbGFcIjogW1wic2NhbGFcIl0sXG4gICAgICBcImphdmFzY3JpcHRcIjogW1wianNcIiwgXCJqc29uXCIsIFwiamF2YXNjcmlwdFwiLCBcImpzY3JpcHRcIiwgXCJlY21hc2NyaXB0XCIsIFwiZm9ybVwiXSxcbiAgICAgIFwieG1sXCI6IFtcInhtbFwiLCBcInhzZFwiLCBcIndzZGxcIiwgXCJhdG9tXCJdLFxuICAgICAgXCJwcm9wZXJ0aWVzXCI6IFtcInByb3BlcnRpZXNcIl1cbiAgICB9O1xuICB9KTtcblxuICBfbW9kdWxlLmZpbHRlcignZmlsZUljb25DbGFzcycsICgpID0+IGljb25DbGFzcyk7XG5cbiAgX21vZHVsZS5ydW4oW1wiJGxvY2F0aW9uXCIsXCJ2aWV3UmVnaXN0cnlcIiwgIFwibG9jYWxTdG9yYWdlXCIsIFwibGF5b3V0RnVsbFwiLCBcImhlbHBSZWdpc3RyeVwiLCBcInByZWZlcmVuY2VzUmVnaXN0cnlcIiwgXCJ3aWtpUmVwb3NpdG9yeVwiLFxuICAgIFwiJHJvb3RTY29wZVwiLCAoJGxvY2F0aW9uOm5nLklMb2NhdGlvblNlcnZpY2UsXG4gICAgICAgIHZpZXdSZWdpc3RyeSxcbiAgICAgICAgbG9jYWxTdG9yYWdlLFxuICAgICAgICBsYXlvdXRGdWxsLFxuICAgICAgICBoZWxwUmVnaXN0cnksXG4gICAgICAgIHByZWZlcmVuY2VzUmVnaXN0cnksXG4gICAgICAgIHdpa2lSZXBvc2l0b3J5LFxuICAgICAgICAkcm9vdFNjb3BlKSA9PiB7XG5cbiAgICB2aWV3UmVnaXN0cnlbJ3dpa2knXSA9IHRlbXBsYXRlUGF0aCArICdsYXlvdXRXaWtpLmh0bWwnO1xuLypcbiAgICBoZWxwUmVnaXN0cnkuYWRkVXNlckRvYygnd2lraScsICdwbHVnaW5zL3dpa2kvZG9jL2hlbHAubWQnLCAoKSA9PiB7XG4gICAgICByZXR1cm4gV2lraS5pc1dpa2lFbmFibGVkKHdvcmtzcGFjZSwgam9sb2tpYSwgbG9jYWxTdG9yYWdlKTtcbiAgICB9KTtcbiovXG5cbi8qXG4gICAgcHJlZmVyZW5jZXNSZWdpc3RyeS5hZGRUYWIoXCJHaXRcIiwgJ3BsdWdpbnMvd2lraS9odG1sL2dpdFByZWZlcmVuY2VzLmh0bWwnKTtcbiovXG5cbi8qXG4gICAgdGFiID0ge1xuICAgICAgaWQ6IFwid2lraVwiLFxuICAgICAgY29udGVudDogXCJXaWtpXCIsXG4gICAgICB0aXRsZTogXCJWaWV3IGFuZCBlZGl0IHdpa2kgcGFnZXNcIixcbiAgICAgIGlzVmFsaWQ6ICh3b3Jrc3BhY2U6V29ya3NwYWNlKSA9PiBXaWtpLmlzV2lraUVuYWJsZWQod29ya3NwYWNlLCBqb2xva2lhLCBsb2NhbFN0b3JhZ2UpLFxuICAgICAgaHJlZjogKCkgPT4gXCIjL3dpa2kvdmlld1wiLFxuICAgICAgaXNBY3RpdmU6ICh3b3Jrc3BhY2U6V29ya3NwYWNlKSA9PiB3b3Jrc3BhY2UuaXNMaW5rQWN0aXZlKFwiL3dpa2lcIikgJiYgIXdvcmtzcGFjZS5saW5rQ29udGFpbnMoXCJmYWJyaWNcIiwgXCJwcm9maWxlc1wiKSAmJiAhd29ya3NwYWNlLmxpbmtDb250YWlucyhcImVkaXRGZWF0dXJlc1wiKVxuICAgIH07XG4gICAgd29ya3NwYWNlLnRvcExldmVsVGFicy5wdXNoKHRhYik7XG4qL1xuXG4gICAgLy8gYWRkIGVtcHR5IHJlZ2V4cyB0byB0ZW1wbGF0ZXMgdGhhdCBkb24ndCBkZWZpbmVcbiAgICAvLyB0aGVtIHNvIG5nLXBhdHRlcm4gZG9lc24ndCBiYXJmXG4gICAgV2lraS5kb2N1bWVudFRlbXBsYXRlcy5mb3JFYWNoKCh0ZW1wbGF0ZTogYW55KSA9PiB7XG4gICAgICBpZiAoIXRlbXBsYXRlWydyZWdleCddKSB7XG4gICAgICAgIHRlbXBsYXRlLnJlZ2V4ID0gLyg/OikvO1xuICAgICAgfVxuICAgIH0pO1xuXG4gIH1dKTtcblxuICBoYXd0aW9QbHVnaW5Mb2FkZXIuYWRkTW9kdWxlKHBsdWdpbk5hbWUpO1xufVxuIiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL2luY2x1ZGVzLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIndpa2lIZWxwZXJzLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIndpa2lQbHVnaW4udHNcIi8+XG5cbi8qKlxuICogQG1vZHVsZSBXaWtpXG4gKi9cbm1vZHVsZSBXaWtpIHtcblxuICBfbW9kdWxlLmNvbnRyb2xsZXIoXCJXaWtpLkNvbW1pdENvbnRyb2xsZXJcIiwgW1wiJHNjb3BlXCIsIFwiJGxvY2F0aW9uXCIsIFwiJHJvdXRlUGFyYW1zXCIsIFwiJHRlbXBsYXRlQ2FjaGVcIiwgXCJtYXJrZWRcIiwgXCJmaWxlRXh0ZW5zaW9uVHlwZVJlZ2lzdHJ5XCIsICgkc2NvcGUsICRsb2NhdGlvbiwgJHJvdXRlUGFyYW1zLCAkdGVtcGxhdGVDYWNoZSwgbWFya2VkLCBmaWxlRXh0ZW5zaW9uVHlwZVJlZ2lzdHJ5KSA9PiB7XG5cbiAgICAvLyBUT0RPIHJlbW92ZSFcbiAgICB2YXIgaXNGbWMgPSBmYWxzZTtcbiAgICB2YXIgam9sb2tpYSA9IG51bGw7XG5cbiAgICBXaWtpLmluaXRTY29wZSgkc2NvcGUsICRyb3V0ZVBhcmFtcywgJGxvY2F0aW9uKTtcbiAgICB2YXIgd2lraVJlcG9zaXRvcnkgPSAkc2NvcGUud2lraVJlcG9zaXRvcnk7XG5cbiAgICAkc2NvcGUuY29tbWl0SWQgPSAkc2NvcGUub2JqZWN0SWQ7XG4gICAgJHNjb3BlLnNlbGVjdGVkSXRlbXMgPSBbXTtcblxuICAgIC8vIFRPRE8gd2UgY291bGQgY29uZmlndXJlIHRoaXM/XG4gICAgJHNjb3BlLmRhdGVGb3JtYXQgPSAnRUVFLCBNTU0gZCwgeSA6IGhoOm1tOnNzIGEnO1xuXG4gICAgJHNjb3BlLmdyaWRPcHRpb25zID0ge1xuICAgICAgZGF0YTogJ2NvbW1pdHMnLFxuICAgICAgc2hvd0ZpbHRlcjogZmFsc2UsXG4gICAgICBtdWx0aVNlbGVjdDogZmFsc2UsXG4gICAgICBzZWxlY3RXaXRoQ2hlY2tib3hPbmx5OiB0cnVlLFxuICAgICAgc2hvd1NlbGVjdGlvbkNoZWNrYm94OiB0cnVlLFxuICAgICAgZGlzcGxheVNlbGVjdGlvbkNoZWNrYm94IDogdHJ1ZSwgLy8gb2xkIHByZSAyLjAgY29uZmlnIVxuICAgICAgc2VsZWN0ZWRJdGVtczogJHNjb3BlLnNlbGVjdGVkSXRlbXMsXG4gICAgICBmaWx0ZXJPcHRpb25zOiB7XG4gICAgICAgIGZpbHRlclRleHQ6ICcnXG4gICAgICB9LFxuICAgICAgY29sdW1uRGVmczogW1xuICAgICAgICB7XG4gICAgICAgICAgZmllbGQ6ICdwYXRoJyxcbiAgICAgICAgICBkaXNwbGF5TmFtZTogJ0ZpbGUgTmFtZScsXG4gICAgICAgICAgY2VsbFRlbXBsYXRlOiAkdGVtcGxhdGVDYWNoZS5nZXQoJ2ZpbGVDZWxsVGVtcGxhdGUuaHRtbCcpLFxuICAgICAgICAgIHdpZHRoOiBcIioqKlwiLFxuICAgICAgICAgIGNlbGxGaWx0ZXI6IFwiXCJcbiAgICAgICAgfSxcbiAgICAgIF1cbiAgICB9O1xuXG4gICAgJHNjb3BlLiRvbihcIiRyb3V0ZUNoYW5nZVN1Y2Nlc3NcIiwgZnVuY3Rpb24gKGV2ZW50LCBjdXJyZW50LCBwcmV2aW91cykge1xuICAgICAgLy8gbGV0cyBkbyB0aGlzIGFzeW5jaHJvbm91c2x5IHRvIGF2b2lkIEVycm9yOiAkZGlnZXN0IGFscmVhZHkgaW4gcHJvZ3Jlc3NcbiAgICAgIHNldFRpbWVvdXQodXBkYXRlVmlldywgNTApO1xuICAgIH0pO1xuXG4gICAgJHNjb3BlLiR3YXRjaCgnd29ya3NwYWNlLnRyZWUnLCBmdW5jdGlvbiAoKSB7XG4gICAgICBpZiAoISRzY29wZS5naXQpIHtcbiAgICAgICAgLy8gbGV0cyBkbyB0aGlzIGFzeW5jaHJvbm91c2x5IHRvIGF2b2lkIEVycm9yOiAkZGlnZXN0IGFscmVhZHkgaW4gcHJvZ3Jlc3NcbiAgICAgICAgLy9jb25zb2xlLmxvZyhcIlJlbG9hZGluZyB0aGUgdmlldyBhcyB3ZSBub3cgc2VlbSB0byBoYXZlIGEgZ2l0IG1iZWFuIVwiKTtcbiAgICAgICAgc2V0VGltZW91dCh1cGRhdGVWaWV3LCA1MCk7XG4gICAgICB9XG4gICAgfSk7XG5cblxuICAgICRzY29wZS5jYW5SZXZlcnQgPSAoKSA9PiB7XG4gICAgICByZXR1cm4gJHNjb3BlLnNlbGVjdGVkSXRlbXMubGVuZ3RoID09PSAxO1xuICAgIH07XG5cbiAgICAkc2NvcGUucmV2ZXJ0ID0gKCkgPT4ge1xuICAgICAgaWYgKCRzY29wZS5zZWxlY3RlZEl0ZW1zLmxlbmd0aCA+IDApIHtcbiAgICAgICAgdmFyIHBhdGggPSBjb21taXRQYXRoKCRzY29wZS5zZWxlY3RlZEl0ZW1zWzBdKTtcbiAgICAgICAgdmFyIG9iamVjdElkID0gJHNjb3BlLmNvbW1pdElkO1xuICAgICAgICBpZiAocGF0aCAmJiBvYmplY3RJZCkge1xuICAgICAgICAgIHZhciBjb21taXRNZXNzYWdlID0gXCJSZXZlcnRpbmcgZmlsZSBcIiArICRzY29wZS5wYWdlSWQgKyBcIiB0byBwcmV2aW91cyB2ZXJzaW9uIFwiICsgb2JqZWN0SWQ7XG4gICAgICAgICAgd2lraVJlcG9zaXRvcnkucmV2ZXJ0VG8oJHNjb3BlLmJyYW5jaCwgb2JqZWN0SWQsICRzY29wZS5wYWdlSWQsIGNvbW1pdE1lc3NhZ2UsIChyZXN1bHQpID0+IHtcbiAgICAgICAgICAgIFdpa2kub25Db21wbGV0ZShyZXN1bHQpO1xuICAgICAgICAgICAgLy8gbm93IGxldHMgdXBkYXRlIHRoZSB2aWV3XG4gICAgICAgICAgICB1cGRhdGVWaWV3KCk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gY29tbWl0UGF0aChjb21taXQpIHtcbiAgICAgIHJldHVybiBjb21taXQucGF0aCB8fCBjb21taXQubmFtZTtcbiAgICB9XG5cbiAgICAkc2NvcGUuZGlmZiA9ICgpID0+IHtcbiAgICAgIGlmICgkc2NvcGUuc2VsZWN0ZWRJdGVtcy5sZW5ndGggPiAwKSB7XG4gICAgICAgIHZhciBjb21taXQgPSAkc2NvcGUuc2VsZWN0ZWRJdGVtc1swXTtcbiAgICAgICAgLypcbiAgICAgICAgIHZhciBjb21taXQgPSByb3c7XG4gICAgICAgICB2YXIgZW50aXR5ID0gcm93LmVudGl0eTtcbiAgICAgICAgIGlmIChlbnRpdHkpIHtcbiAgICAgICAgIGNvbW1pdCA9IGVudGl0eTtcbiAgICAgICAgIH1cbiAgICAgICAgICovXG4gICAgICAgIHZhciBsaW5rID0gc3RhcnRMaW5rKCRzY29wZSkgKyBcIi9kaWZmL1wiICsgY29tbWl0UGF0aChjb21taXQpICsgXCIvXCIgKyAkc2NvcGUuY29tbWl0SWQgKyBcIi9cIjtcbiAgICAgICAgdmFyIHBhdGggPSBDb3JlLnRyaW1MZWFkaW5nKGxpbmssIFwiI1wiKTtcbiAgICAgICAgJGxvY2F0aW9uLnBhdGgocGF0aCk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIHVwZGF0ZVZpZXcoKTtcblxuICAgIGZ1bmN0aW9uIHVwZGF0ZVZpZXcoKSB7XG4gICAgICB2YXIgY29tbWl0SWQgPSAkc2NvcGUuY29tbWl0SWQ7XG5cbiAgICAgIFdpa2kubG9hZEJyYW5jaGVzKGpvbG9raWEsIHdpa2lSZXBvc2l0b3J5LCAkc2NvcGUsIGlzRm1jKTtcblxuICAgICAgd2lraVJlcG9zaXRvcnkuY29tbWl0SW5mbyhjb21taXRJZCwgKGNvbW1pdEluZm8pID0+IHtcbiAgICAgICAgJHNjb3BlLmNvbW1pdEluZm8gPSBjb21taXRJbmZvO1xuICAgICAgICBDb3JlLiRhcHBseSgkc2NvcGUpO1xuICAgICAgfSk7XG5cbiAgICAgIHdpa2lSZXBvc2l0b3J5LmNvbW1pdFRyZWUoY29tbWl0SWQsIChjb21taXRzKSA9PiB7XG4gICAgICAgICRzY29wZS5jb21taXRzID0gY29tbWl0cztcbiAgICAgICAgYW5ndWxhci5mb3JFYWNoKGNvbW1pdHMsIChjb21taXQpID0+IHtcbiAgICAgICAgICBjb21taXQuZmlsZUljb25IdG1sID0gV2lraS5maWxlSWNvbkh0bWwoY29tbWl0KTtcbiAgICAgICAgICBjb21taXQuZmlsZUNsYXNzID0gY29tbWl0Lm5hbWUuZW5kc1dpdGgoXCIucHJvZmlsZVwiKSA/IFwiZ3JlZW5cIiA6IFwiXCI7XG4gICAgICAgICAgdmFyIGNoYW5nZVR5cGUgPSBjb21taXQuY2hhbmdlVHlwZTtcbiAgICAgICAgICB2YXIgcGF0aCA9IGNvbW1pdFBhdGgoY29tbWl0KTtcbiAgICAgICAgICBpZiAocGF0aCkge1xuICAgICAgICAgICAgY29tbWl0LmZpbGVMaW5rID0gc3RhcnRMaW5rKCRzY29wZSkgKyAnL3ZlcnNpb24vJyArIHBhdGggKyAnLycgKyBjb21taXRJZDtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKGNoYW5nZVR5cGUpIHtcbiAgICAgICAgICAgIGNoYW5nZVR5cGUgPSBjaGFuZ2VUeXBlLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgICAgICBpZiAoY2hhbmdlVHlwZS5zdGFydHNXaXRoKFwiYVwiKSkge1xuICAgICAgICAgICAgICBjb21taXQuY2hhbmdlQ2xhc3MgPSBcImNoYW5nZS1hZGRcIjtcbiAgICAgICAgICAgICAgY29tbWl0LmNoYW5nZSA9IFwiYWRkXCI7XG4gICAgICAgICAgICAgIGNvbW1pdC50aXRsZSA9IFwiYWRkZWRcIjtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoY2hhbmdlVHlwZS5zdGFydHNXaXRoKFwiZFwiKSkge1xuICAgICAgICAgICAgICBjb21taXQuY2hhbmdlQ2xhc3MgPSBcImNoYW5nZS1kZWxldGVcIjtcbiAgICAgICAgICAgICAgY29tbWl0LmNoYW5nZSA9IFwiZGVsZXRlXCI7XG4gICAgICAgICAgICAgIGNvbW1pdC50aXRsZSA9IFwiZGVsZXRlZFwiO1xuICAgICAgICAgICAgICBjb21taXQuZmlsZUxpbmsgPSBudWxsO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgY29tbWl0LmNoYW5nZUNsYXNzID0gXCJjaGFuZ2UtbW9kaWZ5XCI7XG4gICAgICAgICAgICAgIGNvbW1pdC5jaGFuZ2UgPSBcIm1vZGlmeVwiO1xuICAgICAgICAgICAgICBjb21taXQudGl0bGUgPSBcIm1vZGlmaWVkXCI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb21taXQuY2hhbmdlVHlwZUh0bWwgPSAnPHNwYW4gY2xhc3M9XCInICsgY29tbWl0LmNoYW5nZUNsYXNzICsgJ1wiPicgKyBjb21taXQudGl0bGUgKyAnPC9zcGFuPic7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfV0pO1xufVxuIiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL2luY2x1ZGVzLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIndpa2lIZWxwZXJzLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIndpa2lQbHVnaW4udHNcIi8+XG5cbm1vZHVsZSBXaWtpIHtcblxuICB2YXIgQ3JlYXRlQ29udHJvbGxlciA9IGNvbnRyb2xsZXIoXCJDcmVhdGVDb250cm9sbGVyXCIsIFtcIiRzY29wZVwiLCBcIiRsb2NhdGlvblwiLCBcIiRyb3V0ZVBhcmFtc1wiLCBcIiRyb3V0ZVwiLCBcIiRodHRwXCIsIFwiJHRpbWVvdXRcIiwgKCRzY29wZSwgJGxvY2F0aW9uOm5nLklMb2NhdGlvblNlcnZpY2UsICRyb3V0ZVBhcmFtczpuZy5yb3V0ZS5JUm91dGVQYXJhbXNTZXJ2aWNlLCAkcm91dGU6bmcucm91dGUuSVJvdXRlU2VydmljZSwgJGh0dHA6bmcuSUh0dHBTZXJ2aWNlLCAkdGltZW91dDpuZy5JVGltZW91dFNlcnZpY2UpID0+IHtcblxuICAgIFdpa2kuaW5pdFNjb3BlKCRzY29wZSwgJHJvdXRlUGFyYW1zLCAkbG9jYXRpb24pO1xuICAgIHZhciB3aWtpUmVwb3NpdG9yeSA9ICRzY29wZS53aWtpUmVwb3NpdG9yeTtcblxuXG4gICAgLy8gVE9ETyByZW1vdmVcbiAgICB2YXIgd29ya3NwYWNlID0gbnVsbDtcblxuICAgICRzY29wZS5jcmVhdGVEb2N1bWVudFRyZWUgPSBXaWtpLmNyZWF0ZVdpemFyZFRyZWUod29ya3NwYWNlLCAkc2NvcGUpO1xuICAgICRzY29wZS5jcmVhdGVEb2N1bWVudFRyZWVDaGlsZHJlbiA9ICRzY29wZS5jcmVhdGVEb2N1bWVudFRyZWUuY2hpbGRyZW47XG4gICAgJHNjb3BlLmNyZWF0ZURvY3VtZW50VHJlZUFjdGl2YXRpb25zID0gW1wiY2FtZWwtc3ByaW5nLnhtbFwiLCBcIlJlYWRNZS5tZFwiXTtcblxuICAgICRzY29wZS50cmVlT3B0aW9ucyA9IHtcbiAgICAgICAgbm9kZUNoaWxkcmVuOiBcImNoaWxkcmVuXCIsXG4gICAgICAgIGRpclNlbGVjdGFibGU6IHRydWUsXG4gICAgICAgIGluamVjdENsYXNzZXM6IHtcbiAgICAgICAgICAgIHVsOiBcImExXCIsXG4gICAgICAgICAgICBsaTogXCJhMlwiLFxuICAgICAgICAgICAgbGlTZWxlY3RlZDogXCJhN1wiLFxuICAgICAgICAgICAgaUV4cGFuZGVkOiBcImEzXCIsXG4gICAgICAgICAgICBpQ29sbGFwc2VkOiBcImE0XCIsXG4gICAgICAgICAgICBpTGVhZjogXCJhNVwiLFxuICAgICAgICAgICAgbGFiZWw6IFwiYTZcIixcbiAgICAgICAgICAgIGxhYmVsU2VsZWN0ZWQ6IFwiYThcIlxuICAgICAgICB9XG4gICAgfTtcblxuICAgICRzY29wZS5maWxlRXhpc3RzID0ge1xuICAgICAgZXhpc3RzOiBmYWxzZSxcbiAgICAgIG5hbWU6IFwiXCJcbiAgICB9O1xuICAgICRzY29wZS5uZXdEb2N1bWVudE5hbWUgPSBcIlwiO1xuICAgICRzY29wZS5zZWxlY3RlZENyZWF0ZURvY3VtZW50RXh0ZW5zaW9uID0gbnVsbDtcbiAgICAkc2NvcGUuZmlsZUV4aXN0cy5leGlzdHMgPSBmYWxzZTtcbiAgICAkc2NvcGUuZmlsZUV4aXN0cy5uYW1lID0gXCJcIjtcbiAgICAkc2NvcGUubmV3RG9jdW1lbnROYW1lID0gXCJcIjtcblxuICAgIGZ1bmN0aW9uIHJldHVyblRvRGlyZWN0b3J5KCkge1xuICAgICAgdmFyIGxpbmsgPSBXaWtpLnZpZXdMaW5rKCRzY29wZSwgJHNjb3BlLnBhZ2VJZCwgJGxvY2F0aW9uKVxuICAgICAgbG9nLmRlYnVnKFwiQ2FuY2VsbGluZywgZ29pbmcgdG8gbGluazogXCIsIGxpbmspO1xuICAgICAgV2lraS5nb1RvTGluayhsaW5rLCAkdGltZW91dCwgJGxvY2F0aW9uKTtcbiAgICB9XG5cbiAgICAkc2NvcGUuY2FuY2VsID0gKCkgPT4ge1xuICAgICAgcmV0dXJuVG9EaXJlY3RvcnkoKTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLm9uQ3JlYXRlRG9jdW1lbnRTZWxlY3QgPSAobm9kZSkgPT4ge1xuICAgICAgLy8gcmVzZXQgYXMgd2Ugc3dpdGNoIGJldHdlZW4gZG9jdW1lbnQgdHlwZXNcbiAgICAgICRzY29wZS5maWxlRXhpc3RzLmV4aXN0cyA9IGZhbHNlO1xuICAgICAgJHNjb3BlLmZpbGVFeGlzdHMubmFtZSA9IFwiXCI7XG4gICAgICB2YXIgZW50aXR5ID0gbm9kZSA/IG5vZGUuZW50aXR5IDogbnVsbDtcbiAgICAgICRzY29wZS5zZWxlY3RlZENyZWF0ZURvY3VtZW50VGVtcGxhdGUgPSBlbnRpdHk7XG4gICAgICAkc2NvcGUuc2VsZWN0ZWRDcmVhdGVEb2N1bWVudFRlbXBsYXRlUmVnZXggPSAkc2NvcGUuc2VsZWN0ZWRDcmVhdGVEb2N1bWVudFRlbXBsYXRlLnJlZ2V4IHx8IC8uKi87XG4gICAgICAkc2NvcGUuc2VsZWN0ZWRDcmVhdGVEb2N1bWVudFRlbXBsYXRlSW52YWxpZCA9ICRzY29wZS5zZWxlY3RlZENyZWF0ZURvY3VtZW50VGVtcGxhdGUuaW52YWxpZCB8fCBcImludmFsaWQgbmFtZVwiO1xuICAgICAgJHNjb3BlLnNlbGVjdGVkQ3JlYXRlRG9jdW1lbnRUZW1wbGF0ZUV4dGVuc2lvbiA9ICRzY29wZS5zZWxlY3RlZENyZWF0ZURvY3VtZW50VGVtcGxhdGUuZXh0ZW5zaW9uIHx8IG51bGw7XG4gICAgICBsb2cuZGVidWcoXCJFbnRpdHk6IFwiLCBlbnRpdHkpO1xuICAgICAgaWYgKGVudGl0eSkge1xuICAgICAgICBpZiAoZW50aXR5LmdlbmVyYXRlZCkge1xuICAgICAgICAgICRzY29wZS5mb3JtU2NoZW1hID0gZW50aXR5LmdlbmVyYXRlZC5zY2hlbWE7XG4gICAgICAgICAgJHNjb3BlLmZvcm1EYXRhID0gZW50aXR5LmdlbmVyYXRlZC5mb3JtKHdvcmtzcGFjZSwgJHNjb3BlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAkc2NvcGUuZm9ybVNjaGVtYSA9IHt9O1xuICAgICAgICAgICRzY29wZS5mb3JtRGF0YSA9IHt9O1xuICAgICAgICB9XG4gICAgICAgIENvcmUuJGFwcGx5KCRzY29wZSk7XG4gICAgICB9XG5cbiAgICB9O1xuXG4gICAgJHNjb3BlLmFkZEFuZENsb3NlRGlhbG9nID0gKGZpbGVOYW1lOnN0cmluZykgPT4ge1xuICAgICAgJHNjb3BlLm5ld0RvY3VtZW50TmFtZSA9IGZpbGVOYW1lO1xuICAgICAgdmFyIHRlbXBsYXRlID0gJHNjb3BlLnNlbGVjdGVkQ3JlYXRlRG9jdW1lbnRUZW1wbGF0ZTtcbiAgICAgIHZhciBwYXRoID0gZ2V0TmV3RG9jdW1lbnRQYXRoKCk7XG5cbiAgICAgIC8vIGNsZWFyICRzY29wZS5uZXdEb2N1bWVudE5hbWUgc28gd2UgZG9udCByZW1lbWJlciBpdCB3aGVuIHdlIG9wZW4gaXQgbmV4dCB0aW1lXG4gICAgICAkc2NvcGUubmV3RG9jdW1lbnROYW1lID0gbnVsbDtcblxuICAgICAgLy8gcmVzZXQgYmVmb3JlIHdlIGNoZWNrIGp1c3QgaW4gYSBiaXRcbiAgICAgICRzY29wZS5maWxlRXhpc3RzLmV4aXN0cyA9IGZhbHNlO1xuICAgICAgJHNjb3BlLmZpbGVFeGlzdHMubmFtZSA9IFwiXCI7XG4gICAgICAkc2NvcGUuZmlsZUV4dGVuc2lvbkludmFsaWQgPSBudWxsO1xuXG4gICAgICBpZiAoIXRlbXBsYXRlIHx8ICFwYXRoKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgLy8gdmFsaWRhdGUgaWYgdGhlIG5hbWUgbWF0Y2ggdGhlIGV4dGVuc2lvblxuICAgICAgaWYgKCRzY29wZS5zZWxlY3RlZENyZWF0ZURvY3VtZW50VGVtcGxhdGVFeHRlbnNpb24pIHtcbiAgICAgICAgdmFyIGlkeCA9IHBhdGgubGFzdEluZGV4T2YoJy4nKTtcbiAgICAgICAgaWYgKGlkeCA+IDApIHtcbiAgICAgICAgICB2YXIgZXh0ID0gcGF0aC5zdWJzdHJpbmcoaWR4KTtcbiAgICAgICAgICBpZiAoJHNjb3BlLnNlbGVjdGVkQ3JlYXRlRG9jdW1lbnRUZW1wbGF0ZUV4dGVuc2lvbiAhPT0gZXh0KSB7XG4gICAgICAgICAgICAkc2NvcGUuZmlsZUV4dGVuc2lvbkludmFsaWQgPSBcIkZpbGUgZXh0ZW5zaW9uIG11c3QgYmU6IFwiICsgJHNjb3BlLnNlbGVjdGVkQ3JlYXRlRG9jdW1lbnRUZW1wbGF0ZUV4dGVuc2lvbjtcbiAgICAgICAgICAgIENvcmUuJGFwcGx5KCRzY29wZSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vIHZhbGlkYXRlIGlmIHRoZSBmaWxlIGV4aXN0cywgYW5kIHVzZSB0aGUgc3luY2hyb25vdXMgY2FsbFxuICAgICAgd2lraVJlcG9zaXRvcnkuZXhpc3RzKCRzY29wZS5icmFuY2gsIHBhdGgsIChleGlzdHMpID0+IHtcbiAgICAgICAgJHNjb3BlLmZpbGVFeGlzdHMuZXhpc3RzID0gZXhpc3RzO1xuICAgICAgICAkc2NvcGUuZmlsZUV4aXN0cy5uYW1lID0gZXhpc3RzID8gcGF0aCA6IGZhbHNlO1xuICAgICAgICBpZiAoIWV4aXN0cykge1xuICAgICAgICAgIGRvQ3JlYXRlKCk7XG4gICAgICAgIH1cbiAgICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICAgIH0pO1xuXG4gICAgICBmdW5jdGlvbiBkb0NyZWF0ZSgpIHtcbiAgICAgICAgdmFyIG5hbWUgPSBXaWtpLmZpbGVOYW1lKHBhdGgpO1xuICAgICAgICB2YXIgZm9sZGVyID0gV2lraS5maWxlUGFyZW50KHBhdGgpO1xuICAgICAgICB2YXIgZXhlbXBsYXIgPSB0ZW1wbGF0ZS5leGVtcGxhcjtcblxuICAgICAgICB2YXIgY29tbWl0TWVzc2FnZSA9IFwiQ3JlYXRlZCBcIiArIHRlbXBsYXRlLmxhYmVsO1xuICAgICAgICB2YXIgZXhlbXBsYXJVcmkgPSBDb3JlLnVybChcIi9wbHVnaW5zL3dpa2kvZXhlbXBsYXIvXCIgKyBleGVtcGxhcik7XG5cbiAgICAgICAgaWYgKHRlbXBsYXRlLmZvbGRlcikge1xuICAgICAgICAgIENvcmUubm90aWZpY2F0aW9uKFwic3VjY2Vzc1wiLCBcIkNyZWF0aW5nIG5ldyBmb2xkZXIgXCIgKyBuYW1lKTtcblxuICAgICAgICAgIHdpa2lSZXBvc2l0b3J5LmNyZWF0ZURpcmVjdG9yeSgkc2NvcGUuYnJhbmNoLCBwYXRoLCBjb21taXRNZXNzYWdlLCAoc3RhdHVzKSA9PiB7XG4gICAgICAgICAgICB2YXIgbGluayA9IFdpa2kudmlld0xpbmsoJHNjb3BlLCBwYXRoLCAkbG9jYXRpb24pO1xuICAgICAgICAgICAgZ29Ub0xpbmsobGluaywgJHRpbWVvdXQsICRsb2NhdGlvbik7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSBpZiAodGVtcGxhdGUucHJvZmlsZSkge1xuXG4gICAgICAgICAgZnVuY3Rpb24gdG9QYXRoKHByb2ZpbGVOYW1lOnN0cmluZykge1xuICAgICAgICAgICAgdmFyIGFuc3dlciA9IFwiZmFicmljL3Byb2ZpbGVzL1wiICsgcHJvZmlsZU5hbWU7XG4gICAgICAgICAgICBhbnN3ZXIgPSBhbnN3ZXIucmVwbGFjZSgvLS9nLCBcIi9cIik7XG4gICAgICAgICAgICBhbnN3ZXIgPSBhbnN3ZXIgKyBcIi5wcm9maWxlXCI7XG4gICAgICAgICAgICByZXR1cm4gYW5zd2VyO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGZ1bmN0aW9uIHRvUHJvZmlsZU5hbWUocGF0aDpzdHJpbmcpIHtcbiAgICAgICAgICAgIHZhciBhbnN3ZXIgPSBwYXRoLnJlcGxhY2UoL15mYWJyaWNcXC9wcm9maWxlc1xcLy8sIFwiXCIpO1xuICAgICAgICAgICAgYW5zd2VyID0gYW5zd2VyLnJlcGxhY2UoL1xcLy9nLCBcIi1cIik7XG4gICAgICAgICAgICBhbnN3ZXIgPSBhbnN3ZXIucmVwbGFjZSgvXFwucHJvZmlsZSQvLCBcIlwiKTtcbiAgICAgICAgICAgIHJldHVybiBhbnN3ZXI7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gc3RyaXAgb2ZmIGFueSBwcm9maWxlIG5hbWUgaW4gY2FzZSB0aGUgdXNlciBjcmVhdGVzIGEgcHJvZmlsZSB3aGlsZSBsb29raW5nIGF0XG4gICAgICAgICAgLy8gYW5vdGhlciBwcm9maWxlXG4gICAgICAgICAgZm9sZGVyID0gZm9sZGVyLnJlcGxhY2UoL1xcLz0/KFxcdyopXFwucHJvZmlsZSQvLCBcIlwiKTtcblxuICAgICAgICAgIHZhciBjb25jYXRlbmF0ZWQgPSBmb2xkZXIgKyBcIi9cIiArIG5hbWU7XG5cbiAgICAgICAgICB2YXIgcHJvZmlsZU5hbWUgPSB0b1Byb2ZpbGVOYW1lKGNvbmNhdGVuYXRlZCk7XG4gICAgICAgICAgdmFyIHRhcmdldFBhdGggPSB0b1BhdGgocHJvZmlsZU5hbWUpO1xuXG4gICAgICAgIH0gZWxzZSBpZiAodGVtcGxhdGUuZ2VuZXJhdGVkKSB7XG4gICAgICAgICAgdmFyIG9wdGlvbnM6V2lraS5HZW5lcmF0ZU9wdGlvbnMgPSB7XG4gICAgICAgICAgICB3b3Jrc3BhY2U6IHdvcmtzcGFjZSxcbiAgICAgICAgICAgIGZvcm06ICRzY29wZS5mb3JtRGF0YSxcbiAgICAgICAgICAgIG5hbWU6IGZpbGVOYW1lLFxuICAgICAgICAgICAgcGFyZW50SWQ6IGZvbGRlcixcbiAgICAgICAgICAgIGJyYW5jaDogJHNjb3BlLmJyYW5jaCxcbiAgICAgICAgICAgIHN1Y2Nlc3M6IChjb250ZW50cyk9PiB7XG4gICAgICAgICAgICAgIGlmIChjb250ZW50cykge1xuICAgICAgICAgICAgICAgIHdpa2lSZXBvc2l0b3J5LnB1dFBhZ2UoJHNjb3BlLmJyYW5jaCwgcGF0aCwgY29udGVudHMsIGNvbW1pdE1lc3NhZ2UsIChzdGF0dXMpID0+IHtcbiAgICAgICAgICAgICAgICAgIGxvZy5kZWJ1ZyhcIkNyZWF0ZWQgZmlsZSBcIiArIG5hbWUpO1xuICAgICAgICAgICAgICAgICAgV2lraS5vbkNvbXBsZXRlKHN0YXR1cyk7XG4gICAgICAgICAgICAgICAgICByZXR1cm5Ub0RpcmVjdG9yeSgpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVyblRvRGlyZWN0b3J5KCk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBlcnJvcjogKGVycm9yKT0+IHtcbiAgICAgICAgICAgICAgQ29yZS5ub3RpZmljYXRpb24oJ2Vycm9yJywgZXJyb3IpO1xuICAgICAgICAgICAgICBDb3JlLiRhcHBseSgkc2NvcGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH07XG4gICAgICAgICAgdGVtcGxhdGUuZ2VuZXJhdGVkLmdlbmVyYXRlKG9wdGlvbnMpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIGxvYWQgdGhlIGV4YW1wbGUgZGF0YSAoaWYgYW55KSBhbmQgdGhlbiBhZGQgdGhlIGRvY3VtZW50IHRvIGdpdCBhbmQgY2hhbmdlIHRoZSBsaW5rIHRvIHRoZSBuZXcgZG9jdW1lbnRcbiAgICAgICAgICAkaHR0cC5nZXQoZXhlbXBsYXJVcmkpXG4gICAgICAgICAgICAuc3VjY2VzcyhmdW5jdGlvbiAoZGF0YSwgc3RhdHVzLCBoZWFkZXJzLCBjb25maWcpIHtcbiAgICAgICAgICAgICAgcHV0UGFnZShwYXRoLCBuYW1lLCBmb2xkZXIsIGRhdGEsIGNvbW1pdE1lc3NhZ2UpO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5lcnJvcihmdW5jdGlvbiAoZGF0YSwgc3RhdHVzLCBoZWFkZXJzLCBjb25maWcpIHtcbiAgICAgICAgICAgICAgLy8gY3JlYXRlIGFuIGVtcHR5IGZpbGVcbiAgICAgICAgICAgICAgcHV0UGFnZShwYXRoLCBuYW1lLCBmb2xkZXIsIFwiXCIsIGNvbW1pdE1lc3NhZ2UpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gcHV0UGFnZShwYXRoLCBuYW1lLCBmb2xkZXIsIGNvbnRlbnRzLCBjb21taXRNZXNzYWdlKSB7XG4gICAgICAvLyBUT0RPIGxldHMgY2hlY2sgdGhpcyBwYWdlIGRvZXMgbm90IGV4aXN0IC0gaWYgaXQgZG9lcyBsZXRzIGtlZXAgYWRkaW5nIGEgbmV3IHBvc3QgZml4Li4uXG4gICAgICB3aWtpUmVwb3NpdG9yeS5wdXRQYWdlKCRzY29wZS5icmFuY2gsIHBhdGgsIGNvbnRlbnRzLCBjb21taXRNZXNzYWdlLCAoc3RhdHVzKSA9PiB7XG4gICAgICAgIGxvZy5kZWJ1ZyhcIkNyZWF0ZWQgZmlsZSBcIiArIG5hbWUpO1xuICAgICAgICBXaWtpLm9uQ29tcGxldGUoc3RhdHVzKTtcblxuICAgICAgICAvLyBsZXRzIG5hdmlnYXRlIHRvIHRoZSBlZGl0IGxpbmtcbiAgICAgICAgLy8gbG9hZCB0aGUgZGlyZWN0b3J5IGFuZCBmaW5kIHRoZSBjaGlsZCBpdGVtXG4gICAgICAgICRzY29wZS5naXQgPSB3aWtpUmVwb3NpdG9yeS5nZXRQYWdlKCRzY29wZS5icmFuY2gsIGZvbGRlciwgJHNjb3BlLm9iamVjdElkLCAoZGV0YWlscykgPT4ge1xuICAgICAgICAgIC8vIGxldHMgZmluZCB0aGUgY2hpbGQgZW50cnkgc28gd2UgY2FuIGNhbGN1bGF0ZSBpdHMgY29ycmVjdCBlZGl0IGxpbmtcbiAgICAgICAgICB2YXIgbGluazpzdHJpbmcgPSBudWxsO1xuICAgICAgICAgIGlmIChkZXRhaWxzICYmIGRldGFpbHMuY2hpbGRyZW4pIHtcbiAgICAgICAgICAgIGxvZy5kZWJ1ZyhcInNjYW5uZWQgdGhlIGRpcmVjdG9yeSBcIiArIGRldGFpbHMuY2hpbGRyZW4ubGVuZ3RoICsgXCIgY2hpbGRyZW5cIik7XG4gICAgICAgICAgICB2YXIgY2hpbGQgPSBkZXRhaWxzLmNoaWxkcmVuLmZpbmQoYyA9PiBjLm5hbWUgPT09IGZpbGVOYW1lKTtcbiAgICAgICAgICAgIGlmIChjaGlsZCkge1xuICAgICAgICAgICAgICBsaW5rID0gJHNjb3BlLmNoaWxkTGluayhjaGlsZCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBsb2cuZGVidWcoXCJDb3VsZCBub3QgZmluZCBuYW1lICdcIiArIGZpbGVOYW1lICsgXCInIGluIHRoZSBsaXN0IG9mIGZpbGUgbmFtZXMgXCIgKyBKU09OLnN0cmluZ2lmeShkZXRhaWxzLmNoaWxkcmVuLm1hcChjID0+IGMubmFtZSkpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKCFsaW5rKSB7XG4gICAgICAgICAgICBsb2cuZGVidWcoXCJXQVJOSU5HOiBjb3VsZCBub3QgZmluZCB0aGUgY2hpbGRMaW5rIHNvIHJldmVydGluZyB0byB0aGUgd2lraSBlZGl0IHBhZ2UhXCIpO1xuICAgICAgICAgICAgbGluayA9IFdpa2kuZWRpdExpbmsoJHNjb3BlLCBwYXRoLCAkbG9jYXRpb24pO1xuICAgICAgICAgIH1cbiAgICAgICAgICAvL0NvcmUuJGFwcGx5KCRzY29wZSk7XG4gICAgICAgICAgZ29Ub0xpbmsobGluaywgJHRpbWVvdXQsICRsb2NhdGlvbik7XG4gICAgICAgIH0pO1xuICAgICAgfSlcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXROZXdEb2N1bWVudFBhdGgoKSB7XG4gICAgICB2YXIgdGVtcGxhdGUgPSAkc2NvcGUuc2VsZWN0ZWRDcmVhdGVEb2N1bWVudFRlbXBsYXRlO1xuICAgICAgaWYgKCF0ZW1wbGF0ZSkge1xuICAgICAgICBsb2cuZGVidWcoXCJObyB0ZW1wbGF0ZSBzZWxlY3RlZC5cIik7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuICAgICAgdmFyIGV4ZW1wbGFyID0gdGVtcGxhdGUuZXhlbXBsYXIgfHwgXCJcIjtcbiAgICAgIHZhciBuYW1lOnN0cmluZyA9ICRzY29wZS5uZXdEb2N1bWVudE5hbWUgfHwgZXhlbXBsYXI7XG5cbiAgICAgIGlmIChuYW1lLmluZGV4T2YoJy4nKSA8IDApIHtcbiAgICAgICAgLy8gbGV0cyBhZGQgdGhlIGZpbGUgZXh0ZW5zaW9uIGZyb20gdGhlIGV4ZW1wbGFyXG4gICAgICAgIHZhciBpZHggPSBleGVtcGxhci5sYXN0SW5kZXhPZihcIi5cIik7XG4gICAgICAgIGlmIChpZHggPiAwKSB7XG4gICAgICAgICAgbmFtZSArPSBleGVtcGxhci5zdWJzdHJpbmcoaWR4KTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyBsZXRzIGRlYWwgd2l0aCBkaXJlY3RvcmllcyBpbiB0aGUgbmFtZVxuICAgICAgdmFyIGZvbGRlcjpzdHJpbmcgPSAkc2NvcGUucGFnZUlkO1xuICAgICAgaWYgKCRzY29wZS5pc0ZpbGUpIHtcbiAgICAgICAgLy8gaWYgd2UgYXJlIGEgZmlsZSBsZXRzIGRpc2NhcmQgdGhlIGxhc3QgcGFydCBvZiB0aGUgcGF0aFxuICAgICAgICB2YXIgaWR4OmFueSA9IGZvbGRlci5sYXN0SW5kZXhPZihcIi9cIik7XG4gICAgICAgIGlmIChpZHggPD0gMCkge1xuICAgICAgICAgIGZvbGRlciA9IFwiXCI7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgZm9sZGVyID0gZm9sZGVyLnN1YnN0cmluZygwLCBpZHgpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICB2YXIgaWR4OmFueSA9IG5hbWUubGFzdEluZGV4T2YoXCIvXCIpO1xuICAgICAgaWYgKGlkeCA+IDApIHtcbiAgICAgICAgZm9sZGVyICs9IFwiL1wiICsgbmFtZS5zdWJzdHJpbmcoMCwgaWR4KTtcbiAgICAgICAgbmFtZSA9IG5hbWUuc3Vic3RyaW5nKGlkeCArIDEpO1xuICAgICAgfVxuICAgICAgZm9sZGVyID0gQ29yZS50cmltTGVhZGluZyhmb2xkZXIsIFwiL1wiKTtcbiAgICAgIHJldHVybiBmb2xkZXIgKyAoZm9sZGVyID8gXCIvXCIgOiBcIlwiKSArIG5hbWU7XG4gICAgfVxuXG4gIH1dKTtcblxufVxuIiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL2luY2x1ZGVzLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIndpa2lIZWxwZXJzLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIndpa2lQbHVnaW4udHNcIi8+XG5cbi8qKlxuICogQG1vZHVsZSBXaWtpXG4gKi9cbm1vZHVsZSBXaWtpIHtcbiAgX21vZHVsZS5jb250cm9sbGVyKFwiV2lraS5FZGl0Q29udHJvbGxlclwiLCBbXCIkc2NvcGVcIiwgXCIkbG9jYXRpb25cIiwgXCIkcm91dGVQYXJhbXNcIiwgXCJmaWxlRXh0ZW5zaW9uVHlwZVJlZ2lzdHJ5XCIsICgkc2NvcGUsICRsb2NhdGlvbiwgJHJvdXRlUGFyYW1zLCBmaWxlRXh0ZW5zaW9uVHlwZVJlZ2lzdHJ5KSA9PiB7XG5cbiAgICBXaWtpLmluaXRTY29wZSgkc2NvcGUsICRyb3V0ZVBhcmFtcywgJGxvY2F0aW9uKTtcbiAgICAkc2NvcGUuYnJlYWRjcnVtYkNvbmZpZy5wdXNoKGNyZWF0ZUVkaXRpbmdCcmVhZGNydW1iKCRzY29wZSkpO1xuXG4gICAgdmFyIHdpa2lSZXBvc2l0b3J5ID0gJHNjb3BlLndpa2lSZXBvc2l0b3J5O1xuXG4gICAgJHNjb3BlLmVudGl0eSA9IHtcbiAgICAgIHNvdXJjZTogbnVsbFxuICAgIH07XG5cbiAgICB2YXIgZm9ybWF0ID0gV2lraS5maWxlRm9ybWF0KCRzY29wZS5wYWdlSWQsIGZpbGVFeHRlbnNpb25UeXBlUmVnaXN0cnkpO1xuICAgIHZhciBmb3JtID0gbnVsbDtcbiAgICBpZiAoKGZvcm1hdCAmJiBmb3JtYXQgPT09IFwiamF2YXNjcmlwdFwiKSB8fCBpc0NyZWF0ZSgpKSB7XG4gICAgICBmb3JtID0gJGxvY2F0aW9uLnNlYXJjaCgpW1wiZm9ybVwiXTtcbiAgICB9XG5cbiAgICB2YXIgb3B0aW9ucyA9IHtcbiAgICAgIG1vZGU6IHtcbiAgICAgICAgbmFtZTogZm9ybWF0XG4gICAgICB9XG4gICAgfTtcbiAgICAkc2NvcGUuY29kZU1pcnJvck9wdGlvbnMgPSBDb2RlRWRpdG9yLmNyZWF0ZUVkaXRvclNldHRpbmdzKG9wdGlvbnMpO1xuICAgICRzY29wZS5tb2RpZmllZCA9IGZhbHNlO1xuXG5cbiAgICAkc2NvcGUuaXNWYWxpZCA9ICgpID0+ICRzY29wZS5maWxlTmFtZTtcblxuICAgICRzY29wZS5jYW5TYXZlID0gKCkgPT4gISRzY29wZS5tb2RpZmllZDtcblxuICAgICRzY29wZS4kd2F0Y2goJ2VudGl0eS5zb3VyY2UnLCAobmV3VmFsdWUsIG9sZFZhbHVlKSA9PiB7XG4gICAgICAkc2NvcGUubW9kaWZpZWQgPSBuZXdWYWx1ZSAmJiBvbGRWYWx1ZSAmJiBuZXdWYWx1ZSAhPT0gb2xkVmFsdWU7XG4gICAgfSwgdHJ1ZSk7XG5cbiAgICBsb2cuZGVidWcoXCJwYXRoOiBcIiwgJHNjb3BlLnBhdGgpO1xuXG4gICAgJHNjb3BlLiR3YXRjaCgnbW9kaWZpZWQnLCAobmV3VmFsdWUsIG9sZFZhbHVlKSA9PiB7XG4gICAgICBsb2cuZGVidWcoXCJtb2RpZmllZDogXCIsIG5ld1ZhbHVlKTtcbiAgICB9KTtcblxuICAgICRzY29wZS52aWV3TGluayA9ICgpID0+IFdpa2kudmlld0xpbmsoJHNjb3BlLCAkc2NvcGUucGFnZUlkLCAkbG9jYXRpb24sICRzY29wZS5maWxlTmFtZSk7XG5cbiAgICAkc2NvcGUuY2FuY2VsID0gKCkgPT4ge1xuICAgICAgZ29Ub1ZpZXcoKTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLnNhdmUgPSAoKSA9PiB7XG4gICAgICBpZiAoJHNjb3BlLm1vZGlmaWVkICYmICRzY29wZS5maWxlTmFtZSkge1xuICAgICAgICBzYXZlVG8oJHNjb3BlW1wicGFnZUlkXCJdKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgJHNjb3BlLmNyZWF0ZSA9ICgpID0+IHtcbiAgICAgIC8vIGxldHMgY29tYmluZSB0aGUgZmlsZSBuYW1lIHdpdGggdGhlIGN1cnJlbnQgcGFnZUlkICh3aGljaCBpcyB0aGUgZGlyZWN0b3J5KVxuICAgICAgdmFyIHBhdGggPSAkc2NvcGUucGFnZUlkICsgXCIvXCIgKyAkc2NvcGUuZmlsZU5hbWU7XG4gICAgICBjb25zb2xlLmxvZyhcImNyZWF0aW5nIG5ldyBmaWxlIGF0IFwiICsgcGF0aCk7XG4gICAgICBzYXZlVG8ocGF0aCk7XG4gICAgfTtcblxuICAgICRzY29wZS5vblN1Ym1pdCA9IChqc29uLCBmb3JtKSA9PiB7XG4gICAgICBpZiAoaXNDcmVhdGUoKSkge1xuICAgICAgICAkc2NvcGUuY3JlYXRlKCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAkc2NvcGUuc2F2ZSgpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICAkc2NvcGUub25DYW5jZWwgPSAoZm9ybSkgPT4ge1xuICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgIGdvVG9WaWV3KCk7XG4gICAgICAgIENvcmUuJGFwcGx5KCRzY29wZSlcbiAgICAgIH0sIDUwKTtcbiAgICB9O1xuXG5cbiAgICB1cGRhdGVWaWV3KCk7XG5cbiAgICBmdW5jdGlvbiBpc0NyZWF0ZSgpIHtcbiAgICAgIHJldHVybiAkbG9jYXRpb24ucGF0aCgpLnN0YXJ0c1dpdGgoXCIvd2lraS9jcmVhdGVcIik7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gdXBkYXRlVmlldygpIHtcbiAgICAgIC8vIG9ubHkgbG9hZCB0aGUgc291cmNlIGlmIG5vdCBpbiBjcmVhdGUgbW9kZVxuICAgICAgaWYgKGlzQ3JlYXRlKCkpIHtcbiAgICAgICAgdXBkYXRlU291cmNlVmlldygpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbG9nLmRlYnVnKFwiR2V0dGluZyBwYWdlLCBicmFuY2g6IFwiLCAkc2NvcGUuYnJhbmNoLCBcIiBwYWdlSWQ6IFwiLCAkc2NvcGUucGFnZUlkLCBcIiBvYmplY3RJZDogXCIsICRzY29wZS5vYmplY3RJZCk7XG4gICAgICAgIHdpa2lSZXBvc2l0b3J5LmdldFBhZ2UoJHNjb3BlLmJyYW5jaCwgJHNjb3BlLnBhZ2VJZCwgJHNjb3BlLm9iamVjdElkLCBvbkZpbGVDb250ZW50cyk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gb25GaWxlQ29udGVudHMoZGV0YWlscykge1xuICAgICAgdmFyIGNvbnRlbnRzID0gZGV0YWlscy50ZXh0O1xuICAgICAgJHNjb3BlLmVudGl0eS5zb3VyY2UgPSBjb250ZW50cztcbiAgICAgICRzY29wZS5maWxlTmFtZSA9ICRzY29wZS5wYWdlSWQuc3BsaXQoJy8nKS5sYXN0KCk7XG4gICAgICBsb2cuZGVidWcoXCJmaWxlIG5hbWU6IFwiLCAkc2NvcGUuZmlsZU5hbWUpO1xuICAgICAgbG9nLmRlYnVnKFwiZmlsZSBkZXRhaWxzOiBcIiwgZGV0YWlscyk7XG4gICAgICB1cGRhdGVTb3VyY2VWaWV3KCk7XG4gICAgICBDb3JlLiRhcHBseSgkc2NvcGUpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHVwZGF0ZVNvdXJjZVZpZXcoKSB7XG4gICAgICBpZiAoZm9ybSkge1xuICAgICAgICBpZiAoaXNDcmVhdGUoKSkge1xuICAgICAgICAgIC8vIGxldHMgZGVmYXVsdCBhIGZpbGUgbmFtZVxuICAgICAgICAgIGlmICghJHNjb3BlLmZpbGVOYW1lKSB7XG4gICAgICAgICAgICAkc2NvcGUuZmlsZU5hbWUgPSBcIlwiICsgQ29yZS5nZXRVVUlEKCkgKyBcIi5qc29uXCI7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIC8vIG5vdyBsZXRzIHRyeSBsb2FkIHRoZSBmb3JtIGRlZmludGlvbiBKU09OIHNvIHdlIGNhbiB0aGVuIHJlbmRlciB0aGUgZm9ybVxuICAgICAgICAkc2NvcGUuc291cmNlVmlldyA9IG51bGw7XG4gICAgICAgICRzY29wZS5naXQgPSB3aWtpUmVwb3NpdG9yeS5nZXRQYWdlKCRzY29wZS5icmFuY2gsIGZvcm0sICRzY29wZS5vYmplY3RJZCwgKGRldGFpbHMpID0+IHtcbiAgICAgICAgICBvbkZvcm1TY2hlbWEoV2lraS5wYXJzZUpzb24oZGV0YWlscy50ZXh0KSk7XG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgJHNjb3BlLnNvdXJjZVZpZXcgPSBcInBsdWdpbnMvd2lraS9odG1sL3NvdXJjZUVkaXQuaHRtbFwiO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIG9uRm9ybVNjaGVtYShqc29uKSB7XG4gICAgICAkc2NvcGUuZm9ybURlZmluaXRpb24gPSBqc29uO1xuICAgICAgaWYgKCRzY29wZS5lbnRpdHkuc291cmNlKSB7XG4gICAgICAgICRzY29wZS5mb3JtRW50aXR5ID0gV2lraS5wYXJzZUpzb24oJHNjb3BlLmVudGl0eS5zb3VyY2UpO1xuICAgICAgfVxuICAgICAgJHNjb3BlLnNvdXJjZVZpZXcgPSBcInBsdWdpbnMvd2lraS9odG1sL2Zvcm1FZGl0Lmh0bWxcIjtcbiAgICAgIENvcmUuJGFwcGx5KCRzY29wZSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ29Ub1ZpZXcoKSB7XG4gICAgICB2YXIgcGF0aCA9IENvcmUudHJpbUxlYWRpbmcoJHNjb3BlLnZpZXdMaW5rKCksIFwiI1wiKTtcbiAgICAgIGxvZy5kZWJ1ZyhcImdvaW5nIHRvIHZpZXcgXCIgKyBwYXRoKTtcbiAgICAgICRsb2NhdGlvbi5wYXRoKFdpa2kuZGVjb2RlUGF0aChwYXRoKSk7XG4gICAgICBsb2cuZGVidWcoXCJsb2NhdGlvbiBpcyBub3cgXCIgKyAkbG9jYXRpb24ucGF0aCgpKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzYXZlVG8ocGF0aDpzdHJpbmcpIHtcbiAgICAgIHZhciBjb21taXRNZXNzYWdlID0gJHNjb3BlLmNvbW1pdE1lc3NhZ2UgfHwgXCJVcGRhdGVkIHBhZ2UgXCIgKyAkc2NvcGUucGFnZUlkO1xuICAgICAgdmFyIGNvbnRlbnRzID0gJHNjb3BlLmVudGl0eS5zb3VyY2U7XG4gICAgICBpZiAoJHNjb3BlLmZvcm1FbnRpdHkpIHtcbiAgICAgICAgY29udGVudHMgPSBKU09OLnN0cmluZ2lmeSgkc2NvcGUuZm9ybUVudGl0eSwgbnVsbCwgXCIgIFwiKTtcbiAgICAgIH1cbiAgICAgIGxvZy5kZWJ1ZyhcIlNhdmluZyBmaWxlLCBicmFuY2g6IFwiLCAkc2NvcGUuYnJhbmNoLCBcIiBwYXRoOiBcIiwgJHNjb3BlLnBhdGgpO1xuICAgICAgLy9jb25zb2xlLmxvZyhcIkFib3V0IHRvIHdyaXRlIGNvbnRlbnRzICdcIiArIGNvbnRlbnRzICsgXCInXCIpO1xuICAgICAgd2lraVJlcG9zaXRvcnkucHV0UGFnZSgkc2NvcGUuYnJhbmNoLCBwYXRoLCBjb250ZW50cywgY29tbWl0TWVzc2FnZSwgKHN0YXR1cykgPT4ge1xuICAgICAgICBXaWtpLm9uQ29tcGxldGUoc3RhdHVzKTtcbiAgICAgICAgJHNjb3BlLm1vZGlmaWVkID0gZmFsc2U7XG4gICAgICAgIENvcmUubm90aWZpY2F0aW9uKFwic3VjY2Vzc1wiLCBcIlNhdmVkIFwiICsgcGF0aCk7XG4gICAgICAgIGdvVG9WaWV3KCk7XG4gICAgICAgIENvcmUuJGFwcGx5KCRzY29wZSk7XG4gICAgICB9KTtcbiAgICB9XG4gIH1dKTtcbn1cbiIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9pbmNsdWRlcy50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJ3aWtpSGVscGVycy50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJ3aWtpUGx1Z2luLnRzXCIvPlxuXG4vKipcbiAqIEBtb2R1bGUgV2lraVxuICovXG5tb2R1bGUgV2lraSB7XG5cbiAgLy8gY29udHJvbGxlciBmb3IgaGFuZGxpbmcgZmlsZSBkcm9wc1xuICBleHBvcnQgdmFyIEZpbGVEcm9wQ29udHJvbGxlciA9IF9tb2R1bGUuY29udHJvbGxlcihcIldpa2kuRmlsZURyb3BDb250cm9sbGVyXCIsIFtcIiRzY29wZVwiLCBcIkZpbGVVcGxvYWRlclwiLCBcIiRyb3V0ZVwiLCBcIiR0aW1lb3V0XCIsIFwidXNlckRldGFpbHNcIiwgKCRzY29wZSwgRmlsZVVwbG9hZGVyLCAkcm91dGU6bmcucm91dGUuSVJvdXRlU2VydmljZSwgJHRpbWVvdXQ6bmcuSVRpbWVvdXRTZXJ2aWNlLCB1c2VyRGV0YWlsczpDb3JlLlVzZXJEZXRhaWxzKSA9PiB7XG5cblxuICAgIHZhciB1cGxvYWRVUkkgPSBXaWtpLmdpdFJlc3RVUkwoJHNjb3BlLCAkc2NvcGUucGFnZUlkKSArICcvJztcbiAgICB2YXIgdXBsb2FkZXIgPSAkc2NvcGUudXBsb2FkZXIgPSBuZXcgRmlsZVVwbG9hZGVyKHtcbiAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgJ0F1dGhvcml6YXRpb24nOiBDb3JlLmF1dGhIZWFkZXJWYWx1ZSh1c2VyRGV0YWlscylcbiAgICAgIH0sXG4gICAgICBhdXRvVXBsb2FkOiB0cnVlLFxuICAgICAgd2l0aENyZWRlbnRpYWxzOiB0cnVlLFxuICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICB1cmw6IHVwbG9hZFVSSVxuICAgIH0pO1xuICAgICRzY29wZS5kb1VwbG9hZCA9ICgpID0+IHtcbiAgICAgIHVwbG9hZGVyLnVwbG9hZEFsbCgpO1xuICAgIH07XG4gICAgdXBsb2FkZXIub25XaGVuQWRkaW5nRmlsZUZhaWxlZCA9IGZ1bmN0aW9uIChpdGVtIC8qe0ZpbGV8RmlsZUxpa2VPYmplY3R9Ki8sIGZpbHRlciwgb3B0aW9ucykge1xuICAgICAgbG9nLmRlYnVnKCdvbldoZW5BZGRpbmdGaWxlRmFpbGVkJywgaXRlbSwgZmlsdGVyLCBvcHRpb25zKTtcbiAgICB9O1xuICAgIHVwbG9hZGVyLm9uQWZ0ZXJBZGRpbmdGaWxlID0gZnVuY3Rpb24gKGZpbGVJdGVtKSB7XG4gICAgICBsb2cuZGVidWcoJ29uQWZ0ZXJBZGRpbmdGaWxlJywgZmlsZUl0ZW0pO1xuICAgIH07XG4gICAgdXBsb2FkZXIub25BZnRlckFkZGluZ0FsbCA9IGZ1bmN0aW9uIChhZGRlZEZpbGVJdGVtcykge1xuICAgICAgbG9nLmRlYnVnKCdvbkFmdGVyQWRkaW5nQWxsJywgYWRkZWRGaWxlSXRlbXMpO1xuICAgIH07XG4gICAgdXBsb2FkZXIub25CZWZvcmVVcGxvYWRJdGVtID0gZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICAgIGlmICgnZmlsZScgaW4gaXRlbSkge1xuICAgICAgICBpdGVtLmZpbGVTaXplTUIgPSAoaXRlbS5maWxlLnNpemUgLyAxMDI0IC8gMTAyNCkudG9GaXhlZCgyKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGl0ZW0uZmlsZVNpemVNQiA9IDA7XG4gICAgICB9XG4gICAgICAvL2l0ZW0udXJsID0gVXJsSGVscGVycy5qb2luKHVwbG9hZFVSSSwgaXRlbS5maWxlLm5hbWUpO1xuICAgICAgaXRlbS51cmwgPSB1cGxvYWRVUkk7XG4gICAgICBsb2cuaW5mbyhcIkxvYWRpbmcgZmlsZXMgdG8gXCIgKyB1cGxvYWRVUkkpO1xuICAgICAgbG9nLmRlYnVnKCdvbkJlZm9yZVVwbG9hZEl0ZW0nLCBpdGVtKTtcbiAgICB9O1xuICAgIHVwbG9hZGVyLm9uUHJvZ3Jlc3NJdGVtID0gZnVuY3Rpb24gKGZpbGVJdGVtLCBwcm9ncmVzcykge1xuICAgICAgbG9nLmRlYnVnKCdvblByb2dyZXNzSXRlbScsIGZpbGVJdGVtLCBwcm9ncmVzcyk7XG4gICAgfTtcbiAgICB1cGxvYWRlci5vblByb2dyZXNzQWxsID0gZnVuY3Rpb24gKHByb2dyZXNzKSB7XG4gICAgICBsb2cuZGVidWcoJ29uUHJvZ3Jlc3NBbGwnLCBwcm9ncmVzcyk7XG4gICAgfTtcbiAgICB1cGxvYWRlci5vblN1Y2Nlc3NJdGVtID0gZnVuY3Rpb24gKGZpbGVJdGVtLCByZXNwb25zZSwgc3RhdHVzLCBoZWFkZXJzKSB7XG4gICAgICBsb2cuZGVidWcoJ29uU3VjY2Vzc0l0ZW0nLCBmaWxlSXRlbSwgcmVzcG9uc2UsIHN0YXR1cywgaGVhZGVycyk7XG4gICAgfTtcbiAgICB1cGxvYWRlci5vbkVycm9ySXRlbSA9IGZ1bmN0aW9uIChmaWxlSXRlbSwgcmVzcG9uc2UsIHN0YXR1cywgaGVhZGVycykge1xuICAgICAgbG9nLmRlYnVnKCdvbkVycm9ySXRlbScsIGZpbGVJdGVtLCByZXNwb25zZSwgc3RhdHVzLCBoZWFkZXJzKTtcbiAgICB9O1xuICAgIHVwbG9hZGVyLm9uQ2FuY2VsSXRlbSA9IGZ1bmN0aW9uIChmaWxlSXRlbSwgcmVzcG9uc2UsIHN0YXR1cywgaGVhZGVycykge1xuICAgICAgbG9nLmRlYnVnKCdvbkNhbmNlbEl0ZW0nLCBmaWxlSXRlbSwgcmVzcG9uc2UsIHN0YXR1cywgaGVhZGVycyk7XG4gICAgfTtcbiAgICB1cGxvYWRlci5vbkNvbXBsZXRlSXRlbSA9IGZ1bmN0aW9uIChmaWxlSXRlbSwgcmVzcG9uc2UsIHN0YXR1cywgaGVhZGVycykge1xuICAgICAgbG9nLmRlYnVnKCdvbkNvbXBsZXRlSXRlbScsIGZpbGVJdGVtLCByZXNwb25zZSwgc3RhdHVzLCBoZWFkZXJzKTtcbiAgICB9O1xuICAgIHVwbG9hZGVyLm9uQ29tcGxldGVBbGwgPSBmdW5jdGlvbiAoKSB7XG4gICAgICBsb2cuZGVidWcoJ29uQ29tcGxldGVBbGwnKTtcbiAgICAgIHVwbG9hZGVyLmNsZWFyUXVldWUoKTtcbiAgICAgICR0aW1lb3V0KCgpID0+IHtcbiAgICAgICAgbG9nLmluZm8oXCJDb21wbGV0ZWQgYWxsIHVwbG9hZHMuIExldHMgZm9yY2UgYSByZWxvYWRcIik7XG4gICAgICAgICRyb3V0ZS5yZWxvYWQoKTtcbiAgICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICAgIH0sIDIwMCk7XG4gICAgfTtcbiAgfV0pO1xuXG59XG4iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vaW5jbHVkZXMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwid2lraUhlbHBlcnMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwid2lraVBsdWdpbi50c1wiLz5cblxuLyoqXG4gKiBAbW9kdWxlIFdpa2lcbiAqL1xubW9kdWxlIFdpa2kge1xuXG4gIF9tb2R1bGUuY29udHJvbGxlcihcIldpa2kuRm9ybVRhYmxlQ29udHJvbGxlclwiLCBbXCIkc2NvcGVcIiwgXCIkbG9jYXRpb25cIiwgXCIkcm91dGVQYXJhbXNcIiwgKCRzY29wZSwgJGxvY2F0aW9uLCAkcm91dGVQYXJhbXMpID0+IHtcbiAgICBXaWtpLmluaXRTY29wZSgkc2NvcGUsICRyb3V0ZVBhcmFtcywgJGxvY2F0aW9uKTtcbiAgICB2YXIgd2lraVJlcG9zaXRvcnkgPSAkc2NvcGUud2lraVJlcG9zaXRvcnk7XG5cbiAgICAkc2NvcGUuY29sdW1uRGVmcyA9IFtdO1xuXG4gICAgJHNjb3BlLmdyaWRPcHRpb25zID0ge1xuICAgICAgIGRhdGE6ICdsaXN0JyxcbiAgICAgICBkaXNwbGF5Rm9vdGVyOiBmYWxzZSxcbiAgICAgICBzaG93RmlsdGVyOiBmYWxzZSxcbiAgICAgICBmaWx0ZXJPcHRpb25zOiB7XG4gICAgICAgICBmaWx0ZXJUZXh0OiAnJ1xuICAgICAgIH0sXG4gICAgICAgY29sdW1uRGVmczogJHNjb3BlLmNvbHVtbkRlZnNcbiAgICAgfTtcblxuXG4gICAgJHNjb3BlLnZpZXdMaW5rID0gKHJvdykgPT4ge1xuICAgICAgcmV0dXJuIGNoaWxkTGluayhyb3csIFwiL3ZpZXdcIik7XG4gICAgfTtcbiAgICAkc2NvcGUuZWRpdExpbmsgPSAocm93KSA9PiB7XG4gICAgICByZXR1cm4gY2hpbGRMaW5rKHJvdywgXCIvZWRpdFwiKTtcbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gY2hpbGRMaW5rKGNoaWxkLCBwcmVmaXgpIHtcbiAgICAgIHZhciBzdGFydCA9IFdpa2kuc3RhcnRMaW5rKCRzY29wZSk7XG4gICAgICB2YXIgY2hpbGRJZCA9IChjaGlsZCkgPyBjaGlsZFtcIl9pZFwiXSB8fCBcIlwiIDogXCJcIjtcbiAgICAgIHJldHVybiBDb3JlLmNyZWF0ZUhyZWYoJGxvY2F0aW9uLCBzdGFydCArIHByZWZpeCArIFwiL1wiICsgJHNjb3BlLnBhZ2VJZCArIFwiL1wiICsgY2hpbGRJZCk7XG4gICAgfVxuXG4gICAgdmFyIGxpbmtzQ29sdW1uID0ge1xuICAgICAgZmllbGQ6ICdfaWQnLFxuICAgICAgZGlzcGxheU5hbWU6ICdBY3Rpb25zJyxcbiAgICAgIGNlbGxUZW1wbGF0ZTogJzxkaXYgY2xhc3M9XCJuZ0NlbGxUZXh0XCJcIj48YSBuZy1ocmVmPVwie3t2aWV3TGluayhyb3cuZW50aXR5KX19XCIgY2xhc3M9XCJidG5cIj5WaWV3PC9hPiA8YSBuZy1ocmVmPVwie3tlZGl0TGluayhyb3cuZW50aXR5KX19XCIgY2xhc3M9XCJidG5cIj5FZGl0PC9hPjwvZGl2PidcbiAgICB9O1xuXG4gICAgJHNjb3BlLiRvbihcIiRyb3V0ZUNoYW5nZVN1Y2Nlc3NcIiwgZnVuY3Rpb24gKGV2ZW50LCBjdXJyZW50LCBwcmV2aW91cykge1xuICAgICAgLy8gbGV0cyBkbyB0aGlzIGFzeW5jaHJvbm91c2x5IHRvIGF2b2lkIEVycm9yOiAkZGlnZXN0IGFscmVhZHkgaW4gcHJvZ3Jlc3NcbiAgICAgIHNldFRpbWVvdXQodXBkYXRlVmlldywgNTApO1xuICAgIH0pO1xuXG4gICAgdmFyIGZvcm0gPSAkbG9jYXRpb24uc2VhcmNoKClbXCJmb3JtXCJdO1xuICAgIGlmIChmb3JtKSB7XG4gICAgICB3aWtpUmVwb3NpdG9yeS5nZXRQYWdlKCRzY29wZS5icmFuY2gsIGZvcm0sICRzY29wZS5vYmplY3RJZCwgb25Gb3JtRGF0YSk7XG4gICAgfVxuXG4gICAgdXBkYXRlVmlldygpO1xuXG4gICAgZnVuY3Rpb24gb25SZXN1bHRzKHJlc3BvbnNlKSB7XG4gICAgICB2YXIgbGlzdCA9IFtdO1xuICAgICAgdmFyIG1hcCA9IFdpa2kucGFyc2VKc29uKHJlc3BvbnNlKTtcbiAgICAgIGFuZ3VsYXIuZm9yRWFjaChtYXAsICh2YWx1ZSwga2V5KSA9PiB7XG4gICAgICAgIHZhbHVlW1wiX2lkXCJdID0ga2V5O1xuICAgICAgICBsaXN0LnB1c2godmFsdWUpO1xuICAgICAgfSk7XG4gICAgICAkc2NvcGUubGlzdCA9IGxpc3Q7XG4gICAgICBDb3JlLiRhcHBseSgkc2NvcGUpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHVwZGF0ZVZpZXcoKSB7XG4gICAgICB2YXIgZmlsdGVyID0gQ29yZS5wYXRoR2V0KCRzY29wZSwgW1wiZ3JpZE9wdGlvbnNcIiwgXCJmaWx0ZXJPcHRpb25zXCIsIFwiZmlsdGVyVGV4dFwiXSkgfHwgXCJcIjtcbiAgICAgICRzY29wZS5naXQgPSB3aWtpUmVwb3NpdG9yeS5qc29uQ2hpbGRDb250ZW50cygkc2NvcGUucGFnZUlkLCBcIiouanNvblwiLCBmaWx0ZXIsIG9uUmVzdWx0cyk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gb25Gb3JtRGF0YShkZXRhaWxzKSB7XG4gICAgICB2YXIgdGV4dCA9IGRldGFpbHMudGV4dDtcbiAgICAgIGlmICh0ZXh0KSB7XG4gICAgICAgICRzY29wZS5mb3JtRGVmaW5pdGlvbiA9IFdpa2kucGFyc2VKc29uKHRleHQpO1xuXG4gICAgICAgIHZhciBjb2x1bW5EZWZzID0gW107XG4gICAgICAgIHZhciBzY2hlbWEgPSAkc2NvcGUuZm9ybURlZmluaXRpb247XG4gICAgICAgIGFuZ3VsYXIuZm9yRWFjaChzY2hlbWEucHJvcGVydGllcywgKHByb3BlcnR5LCBuYW1lKSA9PiB7XG4gICAgICAgICAgaWYgKG5hbWUpIHtcbiAgICAgICAgICAgIGlmICghRm9ybXMuaXNBcnJheU9yTmVzdGVkT2JqZWN0KHByb3BlcnR5LCBzY2hlbWEpKSB7XG4gICAgICAgICAgICAgIHZhciBjb2xEZWYgPSB7XG4gICAgICAgICAgICAgICAgZmllbGQ6IG5hbWUsXG4gICAgICAgICAgICAgICAgZGlzcGxheU5hbWU6IHByb3BlcnR5LmRlc2NyaXB0aW9uIHx8IG5hbWUsXG4gICAgICAgICAgICAgICAgdmlzaWJsZTogdHJ1ZVxuICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICBjb2x1bW5EZWZzLnB1c2goY29sRGVmKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBjb2x1bW5EZWZzLnB1c2gobGlua3NDb2x1bW4pO1xuXG4gICAgICAgICRzY29wZS5jb2x1bW5EZWZzID0gY29sdW1uRGVmcztcbiAgICAgICAgJHNjb3BlLmdyaWRPcHRpb25zLmNvbHVtbkRlZnMgPSBjb2x1bW5EZWZzO1xuXG4gICAgICAgIC8vIG5vdyB3ZSBoYXZlIHRoZSBncmlkIGNvbHVtbiBzdHVmZiBsb2FkZWQsIGxldHMgbG9hZCB0aGUgZGF0YXRhYmxlXG4gICAgICAgICRzY29wZS50YWJsZVZpZXcgPSBcInBsdWdpbnMvd2lraS9odG1sL2Zvcm1UYWJsZURhdGF0YWJsZS5odG1sXCI7XG4gICAgICB9XG4gICAgfVxuICAgIENvcmUuJGFwcGx5KCRzY29wZSk7XG4gIH1dKTtcbn1cbiIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9pbmNsdWRlcy50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJ3aWtpSGVscGVycy50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJ3aWtpUGx1Z2luLnRzXCIvPlxuXG4vKipcbiAqIEBtb2R1bGUgV2lraVxuICovXG4gbW9kdWxlIFdpa2kge1xuICBfbW9kdWxlLmNvbnRyb2xsZXIoXCJXaWtpLkdpdFByZWZlcmVuY2VzXCIsIFtcIiRzY29wZVwiLCBcImxvY2FsU3RvcmFnZVwiLCBcInVzZXJEZXRhaWxzXCIsICgkc2NvcGUsIGxvY2FsU3RvcmFnZSwgdXNlckRldGFpbHMpID0+IHtcblxuICAgIHZhciBjb25maWcgPSB7XG4gICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgIGdpdFVzZXJOYW1lOiB7XG4gICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgbGFiZWw6ICdVc2VybmFtZScsXG4gICAgICAgICAgZGVzY3JpcHRpb246ICdUaGUgdXNlciBuYW1lIHRvIGJlIHVzZWQgd2hlbiBtYWtpbmcgY2hhbmdlcyB0byBmaWxlcyB3aXRoIHRoZSBzb3VyY2UgY29udHJvbCBzeXN0ZW0nXG4gICAgICAgIH0sXG4gICAgICAgIGdpdFVzZXJFbWFpbDoge1xuICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgIGxhYmVsOiAnRW1haWwnLFxuICAgICAgICAgIGRlc2NyaXB0aW9uOiAnVGhlIGVtYWlsIGFkZHJlc3MgdG8gdXNlIHdoZW4gbWFraW5nIGNoYW5nZXMgdG8gZmlsZXMgd2l0aCB0aGUgc291cmNlIGNvbnRyb2wgc3lzdGVtJ1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfTtcblxuICAgICRzY29wZS5lbnRpdHkgPSAkc2NvcGU7XG4gICAgJHNjb3BlLmNvbmZpZyA9IGNvbmZpZztcblxuICAgIENvcmUuaW5pdFByZWZlcmVuY2VTY29wZSgkc2NvcGUsIGxvY2FsU3RvcmFnZSwge1xuICAgICAgJ2dpdFVzZXJOYW1lJzoge1xuICAgICAgICAndmFsdWUnOiB1c2VyRGV0YWlscy51c2VybmFtZSB8fCBcIlwiXG4gICAgICB9LFxuICAgICAgJ2dpdFVzZXJFbWFpbCc6IHtcbiAgICAgICAgJ3ZhbHVlJzogJydcbiAgICAgIH0gIFxuICAgIH0pO1xuICB9XSk7XG4gfVxuIiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL2luY2x1ZGVzLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIndpa2lIZWxwZXJzLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIndpa2lQbHVnaW4udHNcIi8+XG5cbi8qKlxuICogQG1vZHVsZSBXaWtpXG4gKi9cbm1vZHVsZSBXaWtpIHtcblxuICBfbW9kdWxlLmNvbnRyb2xsZXIoXCJXaWtpLkhpc3RvcnlDb250cm9sbGVyXCIsIFtcIiRzY29wZVwiLCBcIiRsb2NhdGlvblwiLCBcIiRyb3V0ZVBhcmFtc1wiLCBcIiR0ZW1wbGF0ZUNhY2hlXCIsIFwibWFya2VkXCIsIFwiZmlsZUV4dGVuc2lvblR5cGVSZWdpc3RyeVwiLCAgKCRzY29wZSwgJGxvY2F0aW9uLCAkcm91dGVQYXJhbXMsICR0ZW1wbGF0ZUNhY2hlLCBtYXJrZWQsIGZpbGVFeHRlbnNpb25UeXBlUmVnaXN0cnkpID0+IHtcblxuICAgIC8vIFRPRE8gcmVtb3ZlIVxuICAgIHZhciBpc0ZtYyA9IGZhbHNlO1xuICAgIHZhciBqb2xva2lhID0gbnVsbDtcblxuICAgIFdpa2kuaW5pdFNjb3BlKCRzY29wZSwgJHJvdXRlUGFyYW1zLCAkbG9jYXRpb24pO1xuICAgIHZhciB3aWtpUmVwb3NpdG9yeSA9ICRzY29wZS53aWtpUmVwb3NpdG9yeTtcblxuICAgIC8vIFRPRE8gd2UgY291bGQgY29uZmlndXJlIHRoaXM/XG4gICAgJHNjb3BlLmRhdGVGb3JtYXQgPSAnRUVFLCBNTU0gZCwgeSBhdCBISDptbTpzcyBaJztcbiAgICAvLyd5eXl5LU1NLWRkIEhIOm1tOnNzIFonXG5cbiAgICAkc2NvcGUuZ3JpZE9wdGlvbnMgPSB7XG4gICAgICBkYXRhOiAnbG9ncycsXG4gICAgICBzaG93RmlsdGVyOiBmYWxzZSxcbiAgICAgIGVuYWJsZVJvd0NsaWNrU2VsZWN0aW9uOiBmYWxzZSxcbiAgICAgIG11bHRpU2VsZWN0OiB0cnVlLFxuICAgICAgc2VsZWN0ZWRJdGVtczogW10sXG4gICAgICBzaG93U2VsZWN0aW9uQ2hlY2tib3g6IHRydWUsXG4gICAgICBkaXNwbGF5U2VsZWN0aW9uQ2hlY2tib3ggOiB0cnVlLCAvLyBvbGQgcHJlIDIuMCBjb25maWchXG4gICAgICBmaWx0ZXJPcHRpb25zOiB7XG4gICAgICAgIGZpbHRlclRleHQ6ICcnXG4gICAgICB9LFxuICAgICAgY29sdW1uRGVmczogW1xuICAgICAgICB7XG4gICAgICAgICAgZmllbGQ6ICckZGF0ZScsXG4gICAgICAgICAgZGlzcGxheU5hbWU6ICdNb2RpZmllZCcsXG4gICAgICAgICAgY2VsbFRlbXBsYXRlOiAnPGRpdiBjbGFzcz1cIm5nQ2VsbFRleHRcIiB0aXRsZT1cInt7cm93LmVudGl0eS4kZGF0ZSB8IGRhdGU6XFwnRUVFLCBNTU0gZCwgeXl5eSA6IEhIOm1tOnNzIFpcXCd9fVwiPnt7cm93LmVudGl0eS4kZGF0ZS5yZWxhdGl2ZSgpfX08L2Rpdj4nLFxuICAgICAgICAgIHdpZHRoOiBcIioqXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIGZpZWxkOiAnc2hhJyxcbiAgICAgICAgICBkaXNwbGF5TmFtZTogJ0NoYW5nZScsXG4gICAgICAgICAgY2VsbFRlbXBsYXRlOiAkdGVtcGxhdGVDYWNoZS5nZXQoJ2NoYW5nZUNlbGxUZW1wbGF0ZS5odG1sJyksXG4gICAgICAgICAgY2VsbEZpbHRlcjogXCJcIixcbiAgICAgICAgICB3aWR0aDogXCIqXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIGZpZWxkOiAnYXV0aG9yJyxcbiAgICAgICAgICBkaXNwbGF5TmFtZTogJ0F1dGhvcicsXG4gICAgICAgICAgY2VsbEZpbHRlcjogXCJcIixcbiAgICAgICAgICB3aWR0aDogXCIqKlwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICBmaWVsZDogJ3Nob3J0X21lc3NhZ2UnLFxuICAgICAgICAgIGRpc3BsYXlOYW1lOiAnTWVzc2FnZScsXG4gICAgICAgICAgY2VsbFRlbXBsYXRlOiAnPGRpdiBjbGFzcz1cIm5nQ2VsbFRleHRcIiB0aXRsZT1cInt7cm93LmVudGl0eS5zaG9ydF9tZXNzYWdlfX1cIj57e3Jvdy5lbnRpdHkuc2hvcnRfbWVzc2FnZSAgfCBsaW1pdFRvOjEwMH19PC9kaXY+JyxcbiAgICAgICAgICB3aWR0aDogXCIqKioqXCJcbiAgICAgICAgfVxuICAgICAgXVxuICAgIH07XG5cbiAgICAkc2NvcGUuJG9uKFwiJHJvdXRlQ2hhbmdlU3VjY2Vzc1wiLCBmdW5jdGlvbiAoZXZlbnQsIGN1cnJlbnQsIHByZXZpb3VzKSB7XG4gICAgICAvLyBsZXRzIGRvIHRoaXMgYXN5bmNocm9ub3VzbHkgdG8gYXZvaWQgRXJyb3I6ICRkaWdlc3QgYWxyZWFkeSBpbiBwcm9ncmVzc1xuICAgICAgc2V0VGltZW91dCh1cGRhdGVWaWV3LCA1MCk7XG4gICAgfSk7XG5cbiAgICAkc2NvcGUuY2FuUmV2ZXJ0ID0gKCkgPT4ge1xuICAgICAgdmFyIHNlbGVjdGVkSXRlbXMgPSAkc2NvcGUuZ3JpZE9wdGlvbnMuc2VsZWN0ZWRJdGVtcztcbiAgICAgIHJldHVybiBzZWxlY3RlZEl0ZW1zLmxlbmd0aCA9PT0gMSAmJiBzZWxlY3RlZEl0ZW1zWzBdICE9PSAkc2NvcGUubG9nc1swXTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLnJldmVydCA9ICgpID0+IHtcbiAgICAgIHZhciBzZWxlY3RlZEl0ZW1zID0gJHNjb3BlLmdyaWRPcHRpb25zLnNlbGVjdGVkSXRlbXM7XG4gICAgICBpZiAoc2VsZWN0ZWRJdGVtcy5sZW5ndGggPiAwKSB7XG4gICAgICAgIHZhciBvYmplY3RJZCA9IHNlbGVjdGVkSXRlbXNbMF0uc2hhO1xuICAgICAgICBpZiAob2JqZWN0SWQpIHtcbiAgICAgICAgICB2YXIgY29tbWl0TWVzc2FnZSA9IFwiUmV2ZXJ0aW5nIGZpbGUgXCIgKyAkc2NvcGUucGFnZUlkICsgXCIgdG8gcHJldmlvdXMgdmVyc2lvbiBcIiArIG9iamVjdElkO1xuICAgICAgICAgIHdpa2lSZXBvc2l0b3J5LnJldmVydFRvKCRzY29wZS5icmFuY2gsIG9iamVjdElkLCAkc2NvcGUucGFnZUlkLCBjb21taXRNZXNzYWdlLCAocmVzdWx0KSA9PiB7XG4gICAgICAgICAgICBXaWtpLm9uQ29tcGxldGUocmVzdWx0KTtcbiAgICAgICAgICAgIC8vIG5vdyBsZXRzIHVwZGF0ZSB0aGUgdmlld1xuICAgICAgICAgICAgQ29yZS5ub3RpZmljYXRpb24oJ3N1Y2Nlc3MnLCBcIlN1Y2Nlc3NmdWxseSByZXZlcnRlZCBcIiArICRzY29wZS5wYWdlSWQpO1xuICAgICAgICAgICAgdXBkYXRlVmlldygpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIHNlbGVjdGVkSXRlbXMuc3BsaWNlKDAsIHNlbGVjdGVkSXRlbXMubGVuZ3RoKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgJHNjb3BlLmRpZmYgPSAoKSA9PiB7XG4gICAgICB2YXIgZGVmYXVsdFZhbHVlID0gXCIgXCI7XG4gICAgICB2YXIgb2JqZWN0SWQgPSBkZWZhdWx0VmFsdWU7XG4gICAgICB2YXIgc2VsZWN0ZWRJdGVtcyA9ICRzY29wZS5ncmlkT3B0aW9ucy5zZWxlY3RlZEl0ZW1zO1xuICAgICAgaWYgKHNlbGVjdGVkSXRlbXMubGVuZ3RoID4gMCkge1xuICAgICAgICBvYmplY3RJZCA9IHNlbGVjdGVkSXRlbXNbMF0uc2hhIHx8IGRlZmF1bHRWYWx1ZTtcbiAgICAgIH1cbiAgICAgIHZhciBiYXNlT2JqZWN0SWQgPSBkZWZhdWx0VmFsdWU7XG4gICAgICBpZiAoc2VsZWN0ZWRJdGVtcy5sZW5ndGggPiAxKSB7XG4gICAgICAgIGJhc2VPYmplY3RJZCA9IHNlbGVjdGVkSXRlbXNbMV0uc2hhIHx8ZGVmYXVsdFZhbHVlO1xuICAgICAgICAvLyBtYWtlIHRoZSBvYmplY3RJZCAodGhlIG9uZSB0aGF0IHdpbGwgc3RhcnQgd2l0aCBiLyBwYXRoKSBhbHdheXMgbmV3ZXIgdGhhbiBiYXNlT2JqZWN0SWRcbiAgICAgICAgaWYgKHNlbGVjdGVkSXRlbXNbMF0uZGF0ZSA8IHNlbGVjdGVkSXRlbXNbMV0uZGF0ZSkge1xuICAgICAgICAgIHZhciBfID0gYmFzZU9iamVjdElkO1xuICAgICAgICAgIGJhc2VPYmplY3RJZCA9IG9iamVjdElkO1xuICAgICAgICAgIG9iamVjdElkID0gXztcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgdmFyIGxpbmsgPSBzdGFydExpbmsoJHNjb3BlKSArIFwiL2RpZmYvXCIgKyAkc2NvcGUucGFnZUlkICsgXCIvXCIgKyBvYmplY3RJZCArIFwiL1wiICsgYmFzZU9iamVjdElkO1xuICAgICAgdmFyIHBhdGggPSBDb3JlLnRyaW1MZWFkaW5nKGxpbmssIFwiI1wiKTtcbiAgICAgICRsb2NhdGlvbi5wYXRoKHBhdGgpO1xuICAgIH07XG5cbiAgICB1cGRhdGVWaWV3KCk7XG5cbiAgICBmdW5jdGlvbiB1cGRhdGVWaWV3KCkge1xuICAgICAgdmFyIG9iamVjdElkID0gXCJcIjtcbiAgICAgIHZhciBsaW1pdCA9IDA7XG5cbiAgICAgICRzY29wZS5naXQgPSB3aWtpUmVwb3NpdG9yeS5oaXN0b3J5KCRzY29wZS5icmFuY2gsIG9iamVjdElkLCAkc2NvcGUucGFnZUlkLCBsaW1pdCwgKGxvZ0FycmF5KSA9PiB7XG4gICAgICAgIGFuZ3VsYXIuZm9yRWFjaChsb2dBcnJheSwgKGxvZykgPT4ge1xuICAgICAgICAgIC8vIGxldHMgdXNlIHRoZSBzaG9ydGVyIGhhc2ggZm9yIGxpbmtzIGJ5IGRlZmF1bHRcbiAgICAgICAgICB2YXIgY29tbWl0SWQgPSBsb2cuc2hhO1xuICAgICAgICAgIGxvZy4kZGF0ZSA9IERldmVsb3Blci5hc0RhdGUobG9nLmRhdGUpO1xuICAgICAgICAgIGxvZy5jb21taXRMaW5rID0gc3RhcnRMaW5rKCRzY29wZSkgKyBcIi9jb21taXQvXCIgKyAkc2NvcGUucGFnZUlkICsgXCIvXCIgKyBjb21taXRJZDtcbiAgICAgICAgfSk7XG4gICAgICAgICRzY29wZS5sb2dzID0gbG9nQXJyYXk7XG4gICAgICAgIENvcmUuJGFwcGx5KCRzY29wZSk7XG4gICAgICB9KTtcbiAgICAgIFdpa2kubG9hZEJyYW5jaGVzKGpvbG9raWEsIHdpa2lSZXBvc2l0b3J5LCAkc2NvcGUsIGlzRm1jKTtcbiAgICB9XG4gIH1dKTtcbn1cbiIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9pbmNsdWRlcy50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJ3aWtpSGVscGVycy50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJ3aWtpUGx1Z2luLnRzXCIvPlxuXG4vKipcbiAqIEBtb2R1bGUgV2lraVxuICovXG5tb2R1bGUgV2lraSB7XG4gIF9tb2R1bGUuY29udHJvbGxlcihcIldpa2kuTmF2QmFyQ29udHJvbGxlclwiLCBbXCIkc2NvcGVcIiwgXCIkbG9jYXRpb25cIiwgXCIkcm91dGVQYXJhbXNcIiwgXCJ3aWtpQnJhbmNoTWVudVwiLCAoJHNjb3BlLCAkbG9jYXRpb24sICRyb3V0ZVBhcmFtcywgd2lraUJyYW5jaE1lbnU6QnJhbmNoTWVudSkgPT4ge1xuXG4gICAgLy8gVE9ETyByZW1vdmUhXG4gICAgdmFyIGlzRm1jID0gZmFsc2U7XG5cbiAgICBXaWtpLmluaXRTY29wZSgkc2NvcGUsICRyb3V0ZVBhcmFtcywgJGxvY2F0aW9uKTtcbiAgICB2YXIgd2lraVJlcG9zaXRvcnkgPSAkc2NvcGUud2lraVJlcG9zaXRvcnk7XG5cbiAgICAkc2NvcGUuYnJhbmNoTWVudUNvbmZpZyA9IDxVSS5NZW51SXRlbT57XG4gICAgICB0aXRsZTogJHNjb3BlLmJyYW5jaCxcbiAgICAgIGl0ZW1zOiBbXVxuICAgIH07XG5cbiAgICAkc2NvcGUuVmlld01vZGUgPSBXaWtpLlZpZXdNb2RlO1xuICAgICRzY29wZS5zZXRWaWV3TW9kZSA9IChtb2RlOldpa2kuVmlld01vZGUpID0+IHtcbiAgICAgICRzY29wZS4kZW1pdCgnV2lraS5TZXRWaWV3TW9kZScsIG1vZGUpO1xuICAgIH07XG5cbiAgICB3aWtpQnJhbmNoTWVudS5hcHBseU1lbnVFeHRlbnNpb25zKCRzY29wZS5icmFuY2hNZW51Q29uZmlnLml0ZW1zKTtcblxuICAgICRzY29wZS4kd2F0Y2goJ2JyYW5jaGVzJywgKG5ld1ZhbHVlLCBvbGRWYWx1ZSkgPT4ge1xuICAgICAgaWYgKG5ld1ZhbHVlID09PSBvbGRWYWx1ZSB8fCAhbmV3VmFsdWUpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgJHNjb3BlLmJyYW5jaE1lbnVDb25maWcuaXRlbXMgPSBbXTtcbiAgICAgIGlmIChuZXdWYWx1ZS5sZW5ndGggPiAwKSB7XG4gICAgICAgICRzY29wZS5icmFuY2hNZW51Q29uZmlnLml0ZW1zLnB1c2goe1xuICAgICAgICAgIGhlYWRpbmc6IGlzRm1jID8gXCJWZXJzaW9uc1wiIDogXCJCcmFuY2hlc1wiXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgICAgbmV3VmFsdWUuc29ydCgpLmZvckVhY2goKGl0ZW0pID0+IHtcbiAgICAgICAgdmFyIG1lbnVJdGVtID0ge1xuICAgICAgICAgIHRpdGxlOiBpdGVtLFxuICAgICAgICAgIGljb246ICcnLFxuICAgICAgICAgIGFjdGlvbjogKCkgPT4ge31cbiAgICAgICAgfTtcbiAgICAgICAgaWYgKGl0ZW0gPT09ICRzY29wZS5icmFuY2gpIHtcbiAgICAgICAgICBtZW51SXRlbS5pY29uID0gXCJmYSBmYS1va1wiO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIG1lbnVJdGVtLmFjdGlvbiA9ICgpID0+IHtcbiAgICAgICAgICAgIHZhciB0YXJnZXRVcmwgPSBicmFuY2hMaW5rKGl0ZW0sIDxzdHJpbmc+JHNjb3BlLnBhZ2VJZCwgJGxvY2F0aW9uKTtcbiAgICAgICAgICAgICRsb2NhdGlvbi5wYXRoKENvcmUudG9QYXRoKHRhcmdldFVybCkpO1xuICAgICAgICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgJHNjb3BlLmJyYW5jaE1lbnVDb25maWcuaXRlbXMucHVzaChtZW51SXRlbSk7XG4gICAgICB9KTtcbiAgICAgIHdpa2lCcmFuY2hNZW51LmFwcGx5TWVudUV4dGVuc2lvbnMoJHNjb3BlLmJyYW5jaE1lbnVDb25maWcuaXRlbXMpO1xuICAgIH0sIHRydWUpO1xuXG4gICAgJHNjb3BlLmNyZWF0ZUxpbmsgPSAoKSA9PiB7XG4gICAgICB2YXIgcGFnZUlkID0gV2lraS5wYWdlSWQoJHJvdXRlUGFyYW1zLCAkbG9jYXRpb24pO1xuICAgICAgcmV0dXJuIFdpa2kuY3JlYXRlTGluaygkc2NvcGUsIHBhZ2VJZCwgJGxvY2F0aW9uKTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLnN0YXJ0TGluayA9IHN0YXJ0TGluaygkc2NvcGUpO1xuXG4gICAgJHNjb3BlLnNvdXJjZUxpbmsgPSAoKSA9PiB7XG4gICAgICB2YXIgcGF0aCA9ICRsb2NhdGlvbi5wYXRoKCk7XG4gICAgICB2YXIgYW5zd2VyID0gPHN0cmluZz5udWxsO1xuICAgICAgYW5ndWxhci5mb3JFYWNoKFdpa2kuY3VzdG9tVmlld0xpbmtzKCRzY29wZSksIChsaW5rKSA9PiB7XG4gICAgICAgIGlmIChwYXRoLnN0YXJ0c1dpdGgobGluaykpIHtcbiAgICAgICAgICBhbnN3ZXIgPSA8c3RyaW5nPkNvcmUuY3JlYXRlSHJlZigkbG9jYXRpb24sIFdpa2kuc3RhcnRMaW5rKCRzY29wZSkgKyBcIi92aWV3XCIgKyBwYXRoLnN1YnN0cmluZyhsaW5rLmxlbmd0aCkpXG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgLy8gcmVtb3ZlIHRoZSBmb3JtIHBhcmFtZXRlciBvbiB2aWV3L2VkaXQgbGlua3NcbiAgICAgIHJldHVybiAoIWFuc3dlciAmJiAkbG9jYXRpb24uc2VhcmNoKClbXCJmb3JtXCJdKVxuICAgICAgICAgICAgICA/IENvcmUuY3JlYXRlSHJlZigkbG9jYXRpb24sIFwiI1wiICsgcGF0aCwgW1wiZm9ybVwiXSlcbiAgICAgICAgICAgICAgOiBhbnN3ZXI7XG4gICAgfTtcblxuICAgICRzY29wZS5pc0FjdGl2ZSA9IChocmVmKSA9PiB7XG4gICAgICBpZiAoIWhyZWYpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGhyZWYuZW5kc1dpdGgoJHJvdXRlUGFyYW1zWydwYWdlJ10pO1xuICAgIH07XG5cbiAgICAkc2NvcGUuJG9uKFwiJHJvdXRlQ2hhbmdlU3VjY2Vzc1wiLCBmdW5jdGlvbiAoZXZlbnQsIGN1cnJlbnQsIHByZXZpb3VzKSB7XG4gICAgICAvLyBsZXRzIGRvIHRoaXMgYXN5bmNocm9ub3VzbHkgdG8gYXZvaWQgRXJyb3I6ICRkaWdlc3QgYWxyZWFkeSBpbiBwcm9ncmVzc1xuICAgICAgc2V0VGltZW91dChsb2FkQnJlYWRjcnVtYnMsIDUwKTtcbiAgICB9KTtcblxuICAgIGxvYWRCcmVhZGNydW1icygpO1xuXG4gICAgZnVuY3Rpb24gc3dpdGNoRnJvbVZpZXdUb0N1c3RvbUxpbmsoYnJlYWRjcnVtYiwgbGluaykge1xuICAgICAgdmFyIGhyZWYgPSBicmVhZGNydW1iLmhyZWY7XG4gICAgICBpZiAoaHJlZikge1xuICAgICAgICBicmVhZGNydW1iLmhyZWYgPSBocmVmLnJlcGxhY2UoXCJ3aWtpL3ZpZXdcIiwgbGluayk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbG9hZEJyZWFkY3J1bWJzKCkge1xuICAgICAgdmFyIHN0YXJ0ID0gV2lraS5zdGFydExpbmsoJHNjb3BlKTtcbiAgICAgIHZhciBocmVmID0gc3RhcnQgKyBcIi92aWV3XCI7XG4gICAgICAkc2NvcGUuYnJlYWRjcnVtYnMgPSBbXG4gICAgICAgIHtocmVmOiBocmVmLCBuYW1lOiBcInJvb3RcIn1cbiAgICAgIF07XG4gICAgICB2YXIgcGF0aCA9IFdpa2kucGFnZUlkKCRyb3V0ZVBhcmFtcywgJGxvY2F0aW9uKTtcbiAgICAgIHZhciBhcnJheSA9IHBhdGggPyBwYXRoLnNwbGl0KFwiL1wiKSA6IFtdO1xuICAgICAgYW5ndWxhci5mb3JFYWNoKGFycmF5LCAobmFtZSkgPT4ge1xuICAgICAgICBpZiAoIW5hbWUuc3RhcnRzV2l0aChcIi9cIikgJiYgIWhyZWYuZW5kc1dpdGgoXCIvXCIpKSB7XG4gICAgICAgICAgaHJlZiArPSBcIi9cIjtcbiAgICAgICAgfVxuICAgICAgICBocmVmICs9IFdpa2kuZW5jb2RlUGF0aChuYW1lKTtcbiAgICAgICAgaWYgKCFuYW1lLmlzQmxhbmsoKSkge1xuICAgICAgICAgICRzY29wZS5icmVhZGNydW1icy5wdXNoKHtocmVmOiBocmVmLCBuYW1lOiBuYW1lfSk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgLy8gbGV0cyBzd2l6emxlIHRoZSBsYXN0IG9uZSBvciB0d28gdG8gYmUgZm9ybVRhYmxlIHZpZXdzIGlmIHRoZSBsYXN0IG9yIDJuZCB0byBsYXN0XG4gICAgICB2YXIgbG9jID0gJGxvY2F0aW9uLnBhdGgoKTtcbiAgICAgIGlmICgkc2NvcGUuYnJlYWRjcnVtYnMubGVuZ3RoKSB7XG4gICAgICAgIHZhciBsYXN0ID0gJHNjb3BlLmJyZWFkY3J1bWJzWyRzY29wZS5icmVhZGNydW1icy5sZW5ndGggLSAxXTtcbiAgICAgICAgLy8gcG9zc2libHkgdHJpbSBhbnkgcmVxdWlyZWQgZmlsZSBleHRlbnNpb25zXG4gICAgICAgIGxhc3QubmFtZSA9IFdpa2kuaGlkZUZpbGVOYW1lRXh0ZW5zaW9ucyhsYXN0Lm5hbWUpO1xuXG4gICAgICAgIHZhciBzd2l6emxlZCA9IGZhbHNlO1xuICAgICAgICBhbmd1bGFyLmZvckVhY2goV2lraS5jdXN0b21WaWV3TGlua3MoJHNjb3BlKSwgKGxpbmspID0+IHtcbiAgICAgICAgICBpZiAoIXN3aXp6bGVkICYmIGxvYy5zdGFydHNXaXRoKGxpbmspKSB7XG4gICAgICAgICAgICAvLyBsZXRzIHN3aXp6bGUgdGhlIHZpZXcgdG8gdGhlIGN1cnJlbnQgbGlua1xuICAgICAgICAgICAgc3dpdGNoRnJvbVZpZXdUb0N1c3RvbUxpbmsoJHNjb3BlLmJyZWFkY3J1bWJzLmxhc3QoKSwgQ29yZS50cmltTGVhZGluZyhsaW5rLCBcIi9cIikpO1xuICAgICAgICAgICAgc3dpenpsZWQgPSB0cnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIGlmICghc3dpenpsZWQgJiYgJGxvY2F0aW9uLnNlYXJjaCgpW1wiZm9ybVwiXSkge1xuICAgICAgICAgIHZhciBsYXN0TmFtZSA9ICRzY29wZS5icmVhZGNydW1icy5sYXN0KCkubmFtZTtcbiAgICAgICAgICBpZiAobGFzdE5hbWUgJiYgbGFzdE5hbWUuZW5kc1dpdGgoXCIuanNvblwiKSkge1xuICAgICAgICAgICAgLy8gcHJldmlvdXMgYnJlYWRjcnVtYiBzaG91bGQgYmUgYSBmb3JtVGFibGVcbiAgICAgICAgICAgIHN3aXRjaEZyb21WaWV3VG9DdXN0b21MaW5rKCRzY29wZS5icmVhZGNydW1ic1skc2NvcGUuYnJlYWRjcnVtYnMubGVuZ3RoIC0gMl0sIFwid2lraS9mb3JtVGFibGVcIik7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICAvKlxuICAgICAgaWYgKGxvYy5zdGFydHNXaXRoKFwiL3dpa2kvaGlzdG9yeVwiKSB8fCBsb2Muc3RhcnRzV2l0aChcIi93aWtpL3ZlcnNpb25cIilcbiAgICAgICAgfHwgbG9jLnN0YXJ0c1dpdGgoXCIvd2lraS9kaWZmXCIpIHx8IGxvYy5zdGFydHNXaXRoKFwiL3dpa2kvY29tbWl0XCIpKSB7XG4gICAgICAgIC8vIGxldHMgYWRkIGEgaGlzdG9yeSB0YWJcbiAgICAgICAgJHNjb3BlLmJyZWFkY3J1bWJzLnB1c2goe2hyZWY6IFwiIy93aWtpL2hpc3RvcnkvXCIgKyBwYXRoLCBuYW1lOiBcIkhpc3RvcnlcIn0pO1xuICAgICAgfSBlbHNlIGlmICgkc2NvcGUuYnJhbmNoKSB7XG4gICAgICAgIHZhciBwcmVmaXggPVwiL3dpa2kvYnJhbmNoL1wiICsgJHNjb3BlLmJyYW5jaDtcbiAgICAgICAgaWYgKGxvYy5zdGFydHNXaXRoKHByZWZpeCArIFwiL2hpc3RvcnlcIikgfHwgbG9jLnN0YXJ0c1dpdGgocHJlZml4ICsgXCIvdmVyc2lvblwiKVxuICAgICAgICAgIHx8IGxvYy5zdGFydHNXaXRoKHByZWZpeCArIFwiL2RpZmZcIikgfHwgbG9jLnN0YXJ0c1dpdGgocHJlZml4ICsgXCIvY29tbWl0XCIpKSB7XG4gICAgICAgICAgLy8gbGV0cyBhZGQgYSBoaXN0b3J5IHRhYlxuICAgICAgICAgICRzY29wZS5icmVhZGNydW1icy5wdXNoKHtocmVmOiBcIiMvd2lraS9icmFuY2gvXCIgKyAkc2NvcGUuYnJhbmNoICsgXCIvaGlzdG9yeS9cIiArIHBhdGgsIG5hbWU6IFwiSGlzdG9yeVwifSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgICovXG4gICAgICB2YXIgbmFtZTpzdHJpbmcgPSBudWxsO1xuICAgICAgaWYgKGxvYy5zdGFydHNXaXRoKFwiL3dpa2kvdmVyc2lvblwiKSkge1xuICAgICAgICAvLyBsZXRzIGFkZCBhIHZlcnNpb24gdGFiXG4gICAgICAgIG5hbWUgPSAoJHJvdXRlUGFyYW1zW1wib2JqZWN0SWRcIl0gfHwgXCJcIikuc3Vic3RyaW5nKDAsIDYpIHx8IFwiVmVyc2lvblwiO1xuICAgICAgICAkc2NvcGUuYnJlYWRjcnVtYnMucHVzaCh7aHJlZjogXCIjXCIgKyBsb2MsIG5hbWU6IG5hbWV9KTtcbiAgICAgIH1cbiAgICAgIGlmIChsb2Muc3RhcnRzV2l0aChcIi93aWtpL2RpZmZcIikpIHtcbiAgICAgICAgLy8gbGV0cyBhZGQgYSB2ZXJzaW9uIHRhYlxuICAgICAgICB2YXIgdjEgPSAoJHJvdXRlUGFyYW1zW1wib2JqZWN0SWRcIl0gfHwgXCJcIikuc3Vic3RyaW5nKDAsIDYpO1xuICAgICAgICB2YXIgdjIgPSAoJHJvdXRlUGFyYW1zW1wiYmFzZU9iamVjdElkXCJdIHx8IFwiXCIpLnN1YnN0cmluZygwLCA2KTtcbiAgICAgICAgbmFtZSA9IFwiRGlmZlwiO1xuICAgICAgICBpZiAodjEpIHtcbiAgICAgICAgICBpZiAodjIpIHtcbiAgICAgICAgICAgIG5hbWUgKz0gXCIgXCIgKyB2MSArIFwiIFwiICsgdjI7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG5hbWUgKz0gXCIgXCIgKyB2MTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgJHNjb3BlLmJyZWFkY3J1bWJzLnB1c2goe2hyZWY6IFwiI1wiICsgbG9jLCBuYW1lOiBuYW1lfSk7XG4gICAgICB9XG4gICAgICBDb3JlLiRhcHBseSgkc2NvcGUpO1xuICAgIH1cbiAgfV0pO1xufVxuIiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL2luY2x1ZGVzLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIndpa2lIZWxwZXJzLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIndpa2lQbHVnaW4udHNcIi8+XG5cbi8qKlxuICogQG1vZHVsZSBXaWtpXG4gKi9cbm1vZHVsZSBXaWtpIHtcblxuICAvLyBtYWluIHBhZ2UgY29udHJvbGxlclxuICBleHBvcnQgdmFyIFZpZXdDb250cm9sbGVyID0gX21vZHVsZS5jb250cm9sbGVyKFwiV2lraS5WaWV3Q29udHJvbGxlclwiLCBbXCIkc2NvcGVcIiwgXCIkbG9jYXRpb25cIiwgXCIkcm91dGVQYXJhbXNcIiwgXCIkcm91dGVcIiwgXCIkaHR0cFwiLCBcIiR0aW1lb3V0XCIsIFwibWFya2VkXCIsIFwiZmlsZUV4dGVuc2lvblR5cGVSZWdpc3RyeVwiLCAgXCIkY29tcGlsZVwiLCBcIiR0ZW1wbGF0ZUNhY2hlXCIsIFwibG9jYWxTdG9yYWdlXCIsIFwiJGludGVycG9sYXRlXCIsIFwiJGRpYWxvZ1wiLCAoJHNjb3BlLCAkbG9jYXRpb246bmcuSUxvY2F0aW9uU2VydmljZSwgJHJvdXRlUGFyYW1zOm5nLnJvdXRlLklSb3V0ZVBhcmFtc1NlcnZpY2UsICRyb3V0ZTpuZy5yb3V0ZS5JUm91dGVTZXJ2aWNlLCAkaHR0cDpuZy5JSHR0cFNlcnZpY2UsICR0aW1lb3V0Om5nLklUaW1lb3V0U2VydmljZSwgbWFya2VkLCBmaWxlRXh0ZW5zaW9uVHlwZVJlZ2lzdHJ5LCAgJGNvbXBpbGU6bmcuSUNvbXBpbGVTZXJ2aWNlLCAkdGVtcGxhdGVDYWNoZTpuZy5JVGVtcGxhdGVDYWNoZVNlcnZpY2UsIGxvY2FsU3RvcmFnZSwgJGludGVycG9sYXRlOm5nLklJbnRlcnBvbGF0ZVNlcnZpY2UsICRkaWFsb2cpID0+IHtcblxuICAgICRzY29wZS5uYW1lID0gXCJXaWtpVmlld0NvbnRyb2xsZXJcIjtcblxuICAgIC8vIFRPRE8gcmVtb3ZlIVxuICAgIHZhciBpc0ZtYyA9IGZhbHNlO1xuXG4gICAgV2lraS5pbml0U2NvcGUoJHNjb3BlLCAkcm91dGVQYXJhbXMsICRsb2NhdGlvbik7XG4gICAgdmFyIHdpa2lSZXBvc2l0b3J5ID0gJHNjb3BlLndpa2lSZXBvc2l0b3J5O1xuXG4gICAgU2VsZWN0aW9uSGVscGVycy5kZWNvcmF0ZSgkc2NvcGUpO1xuXG4gICAgJHNjb3BlLmZhYnJpY1RvcExldmVsID0gXCJmYWJyaWMvcHJvZmlsZXMvXCI7XG5cbiAgICAkc2NvcGUudmVyc2lvbklkID0gJHNjb3BlLmJyYW5jaDtcblxuICAgICRzY29wZS5wYW5lVGVtcGxhdGUgPSAnJztcblxuICAgICRzY29wZS5wcm9maWxlSWQgPSBcIlwiO1xuICAgICRzY29wZS5zaG93UHJvZmlsZUhlYWRlciA9IGZhbHNlO1xuICAgICRzY29wZS5zaG93QXBwSGVhZGVyID0gZmFsc2U7XG5cbiAgICAkc2NvcGUub3BlcmF0aW9uQ291bnRlciA9IDE7XG4gICAgJHNjb3BlLnJlbmFtZURpYWxvZyA9IDxXaWtpRGlhbG9nPiBudWxsO1xuICAgICRzY29wZS5tb3ZlRGlhbG9nID0gPFdpa2lEaWFsb2c+IG51bGw7XG4gICAgJHNjb3BlLmRlbGV0ZURpYWxvZyA9IDxXaWtpRGlhbG9nPiBudWxsO1xuICAgICRzY29wZS5pc0ZpbGUgPSBmYWxzZTtcblxuICAgICRzY29wZS5yZW5hbWUgPSB7XG4gICAgICBuZXdGaWxlTmFtZTogXCJcIlxuICAgIH07XG4gICAgJHNjb3BlLm1vdmUgPSB7XG4gICAgICBtb3ZlRm9sZGVyOiBcIlwiXG4gICAgfTtcbiAgICAkc2NvcGUuVmlld01vZGUgPSBXaWtpLlZpZXdNb2RlO1xuXG4gICAgLy8gYmluZCBmaWx0ZXIgbW9kZWwgdmFsdWVzIHRvIHNlYXJjaCBwYXJhbXMuLi5cbiAgICBDb3JlLmJpbmRNb2RlbFRvU2VhcmNoUGFyYW0oJHNjb3BlLCAkbG9jYXRpb24sIFwic2VhcmNoVGV4dFwiLCBcInFcIiwgXCJcIik7XG5cbiAgICBTdG9yYWdlSGVscGVycy5iaW5kTW9kZWxUb0xvY2FsU3RvcmFnZSh7XG4gICAgICAkc2NvcGU6ICRzY29wZSxcbiAgICAgICRsb2NhdGlvbjogJGxvY2F0aW9uLFxuICAgICAgbG9jYWxTdG9yYWdlOiBsb2NhbFN0b3JhZ2UsXG4gICAgICBtb2RlbE5hbWU6ICdtb2RlJyxcbiAgICAgIHBhcmFtTmFtZTogJ3dpa2lWaWV3TW9kZScsXG4gICAgICBpbml0aWFsVmFsdWU6IFdpa2kuVmlld01vZGUuTGlzdCxcbiAgICAgIHRvOiBDb3JlLm51bWJlclRvU3RyaW5nLFxuICAgICAgZnJvbTogQ29yZS5wYXJzZUludFZhbHVlXG4gICAgfSk7XG5cbiAgICAvLyBvbmx5IHJlbG9hZCB0aGUgcGFnZSBpZiBjZXJ0YWluIHNlYXJjaCBwYXJhbWV0ZXJzIGNoYW5nZVxuICAgIENvcmUucmVsb2FkV2hlblBhcmFtZXRlcnNDaGFuZ2UoJHJvdXRlLCAkc2NvcGUsICRsb2NhdGlvbiwgWyd3aWtpVmlld01vZGUnXSk7XG5cbiAgICAkc2NvcGUuZ3JpZE9wdGlvbnMgPSB7XG4gICAgICBkYXRhOiAnY2hpbGRyZW4nLFxuICAgICAgZGlzcGxheUZvb3RlcjogZmFsc2UsXG4gICAgICBzZWxlY3RlZEl0ZW1zOiBbXSxcbiAgICAgIHNob3dTZWxlY3Rpb25DaGVja2JveDogdHJ1ZSxcbiAgICAgIGVuYWJsZVNvcnRpbmc6IGZhbHNlLFxuICAgICAgdXNlRXh0ZXJuYWxTb3J0aW5nOiB0cnVlLFxuICAgICAgY29sdW1uRGVmczogW1xuICAgICAgICB7XG4gICAgICAgICAgZmllbGQ6ICduYW1lJyxcbiAgICAgICAgICBkaXNwbGF5TmFtZTogJ05hbWUnLFxuICAgICAgICAgIGNlbGxUZW1wbGF0ZTogJHRlbXBsYXRlQ2FjaGUuZ2V0KCdmaWxlQ2VsbFRlbXBsYXRlLmh0bWwnKSxcbiAgICAgICAgICBoZWFkZXJDZWxsVGVtcGxhdGU6ICR0ZW1wbGF0ZUNhY2hlLmdldCgnZmlsZUNvbHVtblRlbXBsYXRlLmh0bWwnKVxuICAgICAgICB9XG4gICAgICBdXG4gICAgfTtcblxuICAgICRzY29wZS4kb24oJ1dpa2kuU2V0Vmlld01vZGUnLCAoJGV2ZW50LCBtb2RlOldpa2kuVmlld01vZGUpID0+IHtcbiAgICAgICRzY29wZS5tb2RlID0gbW9kZTtcbiAgICAgIHN3aXRjaChtb2RlKSB7XG4gICAgICAgIGNhc2UgVmlld01vZGUuTGlzdDpcbiAgICAgICAgICBsb2cuZGVidWcoXCJMaXN0IHZpZXcgbW9kZVwiKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSBWaWV3TW9kZS5JY29uOlxuICAgICAgICAgIGxvZy5kZWJ1ZyhcIkljb24gdmlldyBtb2RlXCIpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICRzY29wZS5tb2RlID0gVmlld01vZGUuTGlzdDtcbiAgICAgICAgICBsb2cuZGVidWcoXCJEZWZhdWx0aW5nIHRvIGxpc3QgdmlldyBtb2RlXCIpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH0pO1xuXG5cbiAgICAkc2NvcGUuY2hpbGRBY3Rpb25zID0gW107XG5cbiAgICB2YXIgbWF5YmVVcGRhdGVWaWV3ID0gQ29yZS50aHJvdHRsZWQodXBkYXRlVmlldywgMTAwMCk7XG5cbiAgICAkc2NvcGUubWFya2VkID0gKHRleHQpID0+IHtcbiAgICAgIGlmICh0ZXh0KSB7XG4gICAgICAgIHJldHVybiBtYXJrZWQodGV4dCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gJyc7XG4gICAgICB9XG4gICAgfTtcblxuXG4gICAgJHNjb3BlLiRvbignd2lraUJyYW5jaGVzVXBkYXRlZCcsIGZ1bmN0aW9uICgpIHtcbiAgICAgIHVwZGF0ZVZpZXcoKTtcbiAgICB9KTtcblxuICAgICRzY29wZS5jcmVhdGVEYXNoYm9hcmRMaW5rID0gKCkgPT4ge1xuICAgICAgdmFyIGhyZWYgPSAnL3dpa2kvYnJhbmNoLzpicmFuY2gvdmlldy8qcGFnZSc7XG4gICAgICB2YXIgcGFnZSA9ICRyb3V0ZVBhcmFtc1sncGFnZSddO1xuICAgICAgdmFyIHRpdGxlID0gcGFnZSA/IHBhZ2Uuc3BsaXQoXCIvXCIpLmxhc3QoKSA6IG51bGw7XG4gICAgICB2YXIgc2l6ZSA9IGFuZ3VsYXIudG9Kc29uKHtcbiAgICAgICAgc2l6ZV94OiAyLFxuICAgICAgICBzaXplX3k6IDJcbiAgICAgIH0pO1xuICAgICAgdmFyIGFuc3dlciA9IFwiIy9kYXNoYm9hcmQvYWRkP3RhYj1kYXNoYm9hcmRcIiArXG4gICAgICAgIFwiJmhyZWY9XCIgKyBlbmNvZGVVUklDb21wb25lbnQoaHJlZikgK1xuICAgICAgICBcIiZzaXplPVwiICsgZW5jb2RlVVJJQ29tcG9uZW50KHNpemUpICtcbiAgICAgICAgXCImcm91dGVQYXJhbXM9XCIgKyBlbmNvZGVVUklDb21wb25lbnQoYW5ndWxhci50b0pzb24oJHJvdXRlUGFyYW1zKSk7XG4gICAgICBpZiAodGl0bGUpIHtcbiAgICAgICAgYW5zd2VyICs9IFwiJnRpdGxlPVwiICsgZW5jb2RlVVJJQ29tcG9uZW50KHRpdGxlKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBhbnN3ZXI7XG4gICAgfTtcblxuICAgICRzY29wZS5kaXNwbGF5Q2xhc3MgPSAoKSA9PiB7XG4gICAgICBpZiAoISRzY29wZS5jaGlsZHJlbiB8fCAkc2NvcGUuY2hpbGRyZW4ubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHJldHVybiBcIlwiO1xuICAgICAgfVxuICAgICAgcmV0dXJuIFwic3BhbjlcIjtcbiAgICB9O1xuXG4gICAgJHNjb3BlLnBhcmVudExpbmsgPSAoKSA9PiB7XG4gICAgICB2YXIgc3RhcnQgPSBzdGFydExpbmsoJHNjb3BlKTtcbiAgICAgIHZhciBwcmVmaXggPSBzdGFydCArIFwiL3ZpZXdcIjtcbiAgICAgIC8vbG9nLmRlYnVnKFwicGFnZUlkOiBcIiwgJHNjb3BlLnBhZ2VJZClcbiAgICAgIHZhciBwYXJ0cyA9ICRzY29wZS5wYWdlSWQuc3BsaXQoXCIvXCIpO1xuICAgICAgLy9sb2cuZGVidWcoXCJwYXJ0czogXCIsIHBhcnRzKTtcbiAgICAgIHZhciBwYXRoID0gXCIvXCIgKyBwYXJ0cy5maXJzdChwYXJ0cy5sZW5ndGggLSAxKS5qb2luKFwiL1wiKTtcbiAgICAgIC8vbG9nLmRlYnVnKFwicGF0aDogXCIsIHBhdGgpO1xuICAgICAgcmV0dXJuIENvcmUuY3JlYXRlSHJlZigkbG9jYXRpb24sIHByZWZpeCArIHBhdGgsIFtdKTtcbiAgICB9O1xuXG5cbiAgICAkc2NvcGUuY2hpbGRMaW5rID0gKGNoaWxkKSA9PiB7XG4gICAgICB2YXIgc3RhcnQgPSBzdGFydExpbmsoJHNjb3BlKTtcbiAgICAgIHZhciBwcmVmaXggPSBzdGFydCArIFwiL3ZpZXdcIjtcbiAgICAgIHZhciBwb3N0Rml4ID0gXCJcIjtcbiAgICAgIHZhciBwYXRoID0gV2lraS5lbmNvZGVQYXRoKGNoaWxkLnBhdGgpO1xuICAgICAgaWYgKGNoaWxkLmRpcmVjdG9yeSkge1xuICAgICAgICAvLyBpZiB3ZSBhcmUgYSBmb2xkZXIgd2l0aCB0aGUgc2FtZSBuYW1lIGFzIGEgZm9ybSBmaWxlLCBsZXRzIGFkZCBhIGZvcm0gcGFyYW0uLi5cbiAgICAgICAgdmFyIGZvcm1QYXRoID0gcGF0aCArIFwiLmZvcm1cIjtcbiAgICAgICAgdmFyIGNoaWxkcmVuID0gJHNjb3BlLmNoaWxkcmVuO1xuICAgICAgICBpZiAoY2hpbGRyZW4pIHtcbiAgICAgICAgICB2YXIgZm9ybUZpbGUgPSBjaGlsZHJlbi5maW5kKChjaGlsZCkgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIGNoaWxkWydwYXRoJ10gPT09IGZvcm1QYXRoO1xuICAgICAgICAgIH0pO1xuICAgICAgICAgIGlmIChmb3JtRmlsZSkge1xuICAgICAgICAgICAgcHJlZml4ID0gc3RhcnQgKyBcIi9mb3JtVGFibGVcIjtcbiAgICAgICAgICAgIHBvc3RGaXggPSBcIj9mb3JtPVwiICsgZm9ybVBhdGg7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgeG1sTmFtZXNwYWNlcyA9IGNoaWxkLnhtbE5hbWVzcGFjZXM7XG4gICAgICAgIGlmICh4bWxOYW1lc3BhY2VzICYmIHhtbE5hbWVzcGFjZXMubGVuZ3RoKSB7XG4gICAgICAgICAgaWYgKHhtbE5hbWVzcGFjZXMuYW55KChucykgPT4gV2lraS5jYW1lbE5hbWVzcGFjZXMuYW55KG5zKSkpIHtcbiAgICAgICAgICAgIHByZWZpeCA9IHN0YXJ0ICsgXCIvY2FtZWwvY2FudmFzXCI7XG4gICAgICAgICAgfSBlbHNlIGlmICh4bWxOYW1lc3BhY2VzLmFueSgobnMpID0+IFdpa2kuZG96ZXJOYW1lc3BhY2VzLmFueShucykpKSB7XG4gICAgICAgICAgICBwcmVmaXggPSBzdGFydCArIFwiL2RvemVyL21hcHBpbmdzXCI7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGxvZy5kZWJ1ZyhcImNoaWxkIFwiICsgcGF0aCArIFwiIGhhcyBuYW1lc3BhY2VzIFwiICsgeG1sTmFtZXNwYWNlcyk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChjaGlsZC5wYXRoLmVuZHNXaXRoKFwiLmZvcm1cIikpIHtcbiAgICAgICAgICBwb3N0Rml4ID0gXCI/Zm9ybT0vXCI7XG4gICAgICAgIH0gZWxzZSBpZiAoV2lraS5pc0luZGV4UGFnZShjaGlsZC5wYXRoKSkge1xuICAgICAgICAgIC8vIGxldHMgZGVmYXVsdCB0byBib29rIHZpZXcgb24gaW5kZXggcGFnZXNcbiAgICAgICAgICBwcmVmaXggPSBzdGFydCArIFwiL2Jvb2tcIjtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIENvcmUuY3JlYXRlSHJlZigkbG9jYXRpb24sIFVybEhlbHBlcnMuam9pbihwcmVmaXgsIHBhdGgpICsgcG9zdEZpeCwgW1wiZm9ybVwiXSk7XG4gICAgfTtcblxuICAgICRzY29wZS5maWxlTmFtZSA9IChlbnRpdHkpID0+IHtcbiAgICAgIHJldHVybiBXaWtpLmhpZGVGaWxlTmFtZUV4dGVuc2lvbnMoZW50aXR5LmRpc3BsYXlOYW1lIHx8IGVudGl0eS5uYW1lKTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLmZpbGVDbGFzcyA9IChlbnRpdHkpID0+IHtcbiAgICAgIGlmIChlbnRpdHkubmFtZS5oYXMoXCIucHJvZmlsZVwiKSkge1xuICAgICAgICByZXR1cm4gXCJncmVlblwiO1xuICAgICAgfVxuICAgICAgcmV0dXJuIFwiXCI7XG4gICAgfTtcblxuICAgICRzY29wZS5maWxlSWNvbkh0bWwgPSAoZW50aXR5KSA9PiB7XG4gICAgICByZXR1cm4gV2lraS5maWxlSWNvbkh0bWwoZW50aXR5KTtcbiAgICB9O1xuXG5cbiAgICAkc2NvcGUuZm9ybWF0ID0gV2lraS5maWxlRm9ybWF0KCRzY29wZS5wYWdlSWQsIGZpbGVFeHRlbnNpb25UeXBlUmVnaXN0cnkpO1xuICAgIHZhciBvcHRpb25zID0ge1xuICAgICAgcmVhZE9ubHk6IHRydWUsXG4gICAgICBtb2RlOiB7XG4gICAgICAgIG5hbWU6ICRzY29wZS5mb3JtYXRcbiAgICAgIH1cbiAgICB9O1xuICAgICRzY29wZS5jb2RlTWlycm9yT3B0aW9ucyA9IENvZGVFZGl0b3IuY3JlYXRlRWRpdG9yU2V0dGluZ3Mob3B0aW9ucyk7XG5cbiAgICAkc2NvcGUuZWRpdExpbmsgPSAoKSA9PiB7XG4gICAgICB2YXIgcGFnZU5hbWUgPSAoJHNjb3BlLmRpcmVjdG9yeSkgPyAkc2NvcGUucmVhZE1lUGF0aCA6ICRzY29wZS5wYWdlSWQ7XG4gICAgICByZXR1cm4gKHBhZ2VOYW1lKSA/IFdpa2kuZWRpdExpbmsoJHNjb3BlLCBwYWdlTmFtZSwgJGxvY2F0aW9uKSA6IG51bGw7XG4gICAgfTtcblxuICAgICRzY29wZS5icmFuY2hMaW5rID0gKGJyYW5jaCkgPT4ge1xuICAgICAgaWYgKGJyYW5jaCkge1xuICAgICAgICByZXR1cm4gV2lraS5icmFuY2hMaW5rKGJyYW5jaCwgJHNjb3BlLnBhZ2VJZCwgJGxvY2F0aW9uKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBudWxsXG4gICAgfTtcblxuICAgICRzY29wZS5oaXN0b3J5TGluayA9IFwiIy93aWtpXCIgKyAoJHNjb3BlLmJyYW5jaCA/IFwiL2JyYW5jaC9cIiArICRzY29wZS5icmFuY2ggOiBcIlwiKSArIFwiL2hpc3RvcnkvXCIgKyAkc2NvcGUucGFnZUlkO1xuXG4gICAgJHNjb3BlLiR3YXRjaCgnd29ya3NwYWNlLnRyZWUnLCBmdW5jdGlvbiAoKSB7XG4gICAgICBpZiAoISRzY29wZS5naXQpIHtcbiAgICAgICAgLy8gbGV0cyBkbyB0aGlzIGFzeW5jaHJvbm91c2x5IHRvIGF2b2lkIEVycm9yOiAkZGlnZXN0IGFscmVhZHkgaW4gcHJvZ3Jlc3NcbiAgICAgICAgLy9sb2cuaW5mbyhcIlJlbG9hZGluZyB2aWV3IGFzIHRoZSB0cmVlIGNoYW5nZWQgYW5kIHdlIGhhdmUgYSBnaXQgbWJlYW4gbm93XCIpO1xuICAgICAgICBzZXRUaW1lb3V0KG1heWJlVXBkYXRlVmlldywgNTApO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgJHNjb3BlLiRvbihcIiRyb3V0ZUNoYW5nZVN1Y2Nlc3NcIiwgZnVuY3Rpb24gKGV2ZW50LCBjdXJyZW50LCBwcmV2aW91cykge1xuICAgICAgLy8gbGV0cyBkbyB0aGlzIGFzeW5jaHJvbm91c2x5IHRvIGF2b2lkIEVycm9yOiAkZGlnZXN0IGFscmVhZHkgaW4gcHJvZ3Jlc3NcbiAgICAgIC8vbG9nLmluZm8oXCJSZWxvYWRpbmcgdmlldyBkdWUgdG8gJHJvdXRlQ2hhbmdlU3VjY2Vzc1wiKTtcbiAgICAgIHNldFRpbWVvdXQobWF5YmVVcGRhdGVWaWV3LCA1MCk7XG4gICAgfSk7XG5cblxuICAgICRzY29wZS5vcGVuRGVsZXRlRGlhbG9nID0gKCkgPT4ge1xuICAgICAgaWYgKCRzY29wZS5ncmlkT3B0aW9ucy5zZWxlY3RlZEl0ZW1zLmxlbmd0aCkge1xuICAgICAgICAkc2NvcGUuc2VsZWN0ZWRGaWxlSHRtbCA9IFwiPHVsPlwiICsgJHNjb3BlLmdyaWRPcHRpb25zLnNlbGVjdGVkSXRlbXMubWFwKGZpbGUgPT4gXCI8bGk+XCIgKyBmaWxlLm5hbWUgKyBcIjwvbGk+XCIpLnNvcnQoKS5qb2luKFwiXCIpICsgXCI8L3VsPlwiO1xuXG4gICAgICAgIGlmICgkc2NvcGUuZ3JpZE9wdGlvbnMuc2VsZWN0ZWRJdGVtcy5maW5kKChmaWxlKSA9PiB7IHJldHVybiBmaWxlLm5hbWUuZW5kc1dpdGgoXCIucHJvZmlsZVwiKX0pKSB7XG4gICAgICAgICAgJHNjb3BlLmRlbGV0ZVdhcm5pbmcgPSBcIllvdSBhcmUgYWJvdXQgdG8gZGVsZXRlIGRvY3VtZW50KHMpIHdoaWNoIHJlcHJlc2VudCBGYWJyaWM4IHByb2ZpbGUocykuIFRoaXMgcmVhbGx5IGNhbid0IGJlIHVuZG9uZSEgV2lraSBvcGVyYXRpb25zIGFyZSBsb3cgbGV2ZWwgYW5kIG1heSBsZWFkIHRvIG5vbi1mdW5jdGlvbmFsIHN0YXRlIG9mIEZhYnJpYy5cIjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAkc2NvcGUuZGVsZXRlV2FybmluZyA9IG51bGw7XG4gICAgICAgIH1cblxuICAgICAgICAkc2NvcGUuZGVsZXRlRGlhbG9nID0gV2lraS5nZXREZWxldGVEaWFsb2coJGRpYWxvZywgPFdpa2kuRGVsZXRlRGlhbG9nT3B0aW9ucz57XG4gICAgICAgICAgY2FsbGJhY2tzOiAoKSA9PiB7IHJldHVybiAkc2NvcGUuZGVsZXRlQW5kQ2xvc2VEaWFsb2c7IH0sXG4gICAgICAgICAgc2VsZWN0ZWRGaWxlSHRtbDogKCkgPT4gIHsgcmV0dXJuICRzY29wZS5zZWxlY3RlZEZpbGVIdG1sOyB9LFxuICAgICAgICAgIHdhcm5pbmc6ICgpID0+IHsgcmV0dXJuICRzY29wZS5kZWxldGVXYXJuaW5nOyB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgICRzY29wZS5kZWxldGVEaWFsb2cub3BlbigpO1xuXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBsb2cuZGVidWcoXCJObyBpdGVtcyBzZWxlY3RlZCByaWdodCBub3chIFwiICsgJHNjb3BlLmdyaWRPcHRpb25zLnNlbGVjdGVkSXRlbXMpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICAkc2NvcGUuZGVsZXRlQW5kQ2xvc2VEaWFsb2cgPSAoKSA9PiB7XG4gICAgICB2YXIgZmlsZXMgPSAkc2NvcGUuZ3JpZE9wdGlvbnMuc2VsZWN0ZWRJdGVtcztcbiAgICAgIHZhciBmaWxlQ291bnQgPSBmaWxlcy5sZW5ndGg7XG4gICAgICBsb2cuZGVidWcoXCJEZWxldGluZyBzZWxlY3Rpb246IFwiICsgZmlsZXMpO1xuXG4gICAgICB2YXIgcGF0aHNUb0RlbGV0ZSA9IFtdO1xuICAgICAgYW5ndWxhci5mb3JFYWNoKGZpbGVzLCAoZmlsZSwgaWR4KSA9PiB7XG4gICAgICAgIHZhciBwYXRoID0gVXJsSGVscGVycy5qb2luKCRzY29wZS5wYWdlSWQsIGZpbGUubmFtZSk7XG4gICAgICAgIHBhdGhzVG9EZWxldGUucHVzaChwYXRoKTtcbiAgICAgIH0pO1xuXG4gICAgICBsb2cuZGVidWcoXCJBYm91dCB0byBkZWxldGUgXCIgKyBwYXRoc1RvRGVsZXRlKTtcbiAgICAgICRzY29wZS5naXQgPSB3aWtpUmVwb3NpdG9yeS5yZW1vdmVQYWdlcygkc2NvcGUuYnJhbmNoLCBwYXRoc1RvRGVsZXRlLCBudWxsLCAocmVzdWx0KSA9PiB7XG4gICAgICAgICRzY29wZS5ncmlkT3B0aW9ucy5zZWxlY3RlZEl0ZW1zID0gW107XG4gICAgICAgIHZhciBtZXNzYWdlID0gQ29yZS5tYXliZVBsdXJhbChmaWxlQ291bnQsIFwiZG9jdW1lbnRcIik7XG4gICAgICAgIENvcmUubm90aWZpY2F0aW9uKFwic3VjY2Vzc1wiLCBcIkRlbGV0ZWQgXCIgKyBtZXNzYWdlKTtcbiAgICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICAgICAgdXBkYXRlVmlldygpO1xuICAgICAgfSk7XG4gICAgICAkc2NvcGUuZGVsZXRlRGlhbG9nLmNsb3NlKCk7XG4gICAgfTtcblxuICAgICRzY29wZS4kd2F0Y2goXCJyZW5hbWUubmV3RmlsZU5hbWVcIiwgKCkgPT4ge1xuICAgICAgLy8gaWdub3JlIGVycm9ycyBpZiB0aGUgZmlsZSBpcyB0aGUgc2FtZSBhcyB0aGUgcmVuYW1lIGZpbGUhXG4gICAgICB2YXIgcGF0aCA9IGdldFJlbmFtZUZpbGVQYXRoKCk7XG4gICAgICBpZiAoJHNjb3BlLm9yaWdpbmFsUmVuYW1lRmlsZVBhdGggPT09IHBhdGgpIHtcbiAgICAgICAgJHNjb3BlLmZpbGVFeGlzdHMgPSB7IGV4aXN0czogZmFsc2UsIG5hbWU6IG51bGwgfTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNoZWNrRmlsZUV4aXN0cyhwYXRoKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgICRzY29wZS5yZW5hbWVBbmRDbG9zZURpYWxvZyA9ICgpID0+IHtcbiAgICAgIGlmICgkc2NvcGUuZ3JpZE9wdGlvbnMuc2VsZWN0ZWRJdGVtcy5sZW5ndGgpIHtcbiAgICAgICAgdmFyIHNlbGVjdGVkID0gJHNjb3BlLmdyaWRPcHRpb25zLnNlbGVjdGVkSXRlbXNbMF07XG4gICAgICAgIHZhciBuZXdQYXRoID0gZ2V0UmVuYW1lRmlsZVBhdGgoKTtcbiAgICAgICAgaWYgKHNlbGVjdGVkICYmIG5ld1BhdGgpIHtcbiAgICAgICAgICB2YXIgb2xkTmFtZSA9IHNlbGVjdGVkLm5hbWU7XG4gICAgICAgICAgdmFyIG5ld05hbWUgPSBXaWtpLmZpbGVOYW1lKG5ld1BhdGgpO1xuICAgICAgICAgIHZhciBvbGRQYXRoID0gVXJsSGVscGVycy5qb2luKCRzY29wZS5wYWdlSWQsIG9sZE5hbWUpO1xuICAgICAgICAgIGxvZy5kZWJ1ZyhcIkFib3V0IHRvIHJlbmFtZSBmaWxlIFwiICsgb2xkUGF0aCArIFwiIHRvIFwiICsgbmV3UGF0aCk7XG4gICAgICAgICAgJHNjb3BlLmdpdCA9IHdpa2lSZXBvc2l0b3J5LnJlbmFtZSgkc2NvcGUuYnJhbmNoLCBvbGRQYXRoLCBuZXdQYXRoLCBudWxsLCAocmVzdWx0KSA9PiB7XG4gICAgICAgICAgICBDb3JlLm5vdGlmaWNhdGlvbihcInN1Y2Nlc3NcIiwgXCJSZW5hbWVkIGZpbGUgdG8gIFwiICsgbmV3TmFtZSk7XG4gICAgICAgICAgICAkc2NvcGUuZ3JpZE9wdGlvbnMuc2VsZWN0ZWRJdGVtcy5zcGxpY2UoMCwgMSk7XG4gICAgICAgICAgICAkc2NvcGUucmVuYW1lRGlhbG9nLmNsb3NlKCk7XG4gICAgICAgICAgICBDb3JlLiRhcHBseSgkc2NvcGUpO1xuICAgICAgICAgICAgdXBkYXRlVmlldygpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICAkc2NvcGUucmVuYW1lRGlhbG9nLmNsb3NlKCk7XG4gICAgfTtcblxuICAgICRzY29wZS5vcGVuUmVuYW1lRGlhbG9nID0gKCkgPT4ge1xuICAgICAgdmFyIG5hbWUgPSBudWxsO1xuICAgICAgaWYgKCRzY29wZS5ncmlkT3B0aW9ucy5zZWxlY3RlZEl0ZW1zLmxlbmd0aCkge1xuICAgICAgICB2YXIgc2VsZWN0ZWQgPSAkc2NvcGUuZ3JpZE9wdGlvbnMuc2VsZWN0ZWRJdGVtc1swXTtcbiAgICAgICAgbmFtZSA9IHNlbGVjdGVkLm5hbWU7XG4gICAgICB9XG4gICAgICBpZiAobmFtZSkge1xuICAgICAgICAkc2NvcGUucmVuYW1lLm5ld0ZpbGVOYW1lID0gbmFtZTtcbiAgICAgICAgJHNjb3BlLm9yaWdpbmFsUmVuYW1lRmlsZVBhdGggPSBnZXRSZW5hbWVGaWxlUGF0aCgpO1xuXG4gICAgICAgICRzY29wZS5yZW5hbWVEaWFsb2cgPSBXaWtpLmdldFJlbmFtZURpYWxvZygkZGlhbG9nLCA8V2lraS5SZW5hbWVEaWFsb2dPcHRpb25zPntcbiAgICAgICAgICByZW5hbWU6ICgpID0+IHsgIHJldHVybiAkc2NvcGUucmVuYW1lOyB9LFxuICAgICAgICAgIGZpbGVFeGlzdHM6ICgpID0+IHsgcmV0dXJuICRzY29wZS5maWxlRXhpc3RzOyB9LFxuICAgICAgICAgIGZpbGVOYW1lOiAoKSA9PiB7IHJldHVybiAkc2NvcGUuZmlsZU5hbWU7IH0sXG4gICAgICAgICAgY2FsbGJhY2tzOiAoKSA9PiB7IHJldHVybiAkc2NvcGUucmVuYW1lQW5kQ2xvc2VEaWFsb2c7IH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgJHNjb3BlLnJlbmFtZURpYWxvZy5vcGVuKCk7XG5cbiAgICAgICAgJHRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICQoJyNyZW5hbWVGaWxlTmFtZScpLmZvY3VzKCk7XG4gICAgICAgIH0sIDUwKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGxvZy5kZWJ1ZyhcIk5vIGl0ZW1zIHNlbGVjdGVkIHJpZ2h0IG5vdyEgXCIgKyAkc2NvcGUuZ3JpZE9wdGlvbnMuc2VsZWN0ZWRJdGVtcyk7XG4gICAgICB9XG4gICAgfTtcblxuICAgICRzY29wZS5tb3ZlQW5kQ2xvc2VEaWFsb2cgPSAoKSA9PiB7XG4gICAgICB2YXIgZmlsZXMgPSAkc2NvcGUuZ3JpZE9wdGlvbnMuc2VsZWN0ZWRJdGVtcztcbiAgICAgIHZhciBmaWxlQ291bnQgPSBmaWxlcy5sZW5ndGg7XG4gICAgICB2YXIgbW92ZUZvbGRlciA9ICRzY29wZS5tb3ZlLm1vdmVGb2xkZXI7XG4gICAgICB2YXIgb2xkRm9sZGVyOnN0cmluZyA9ICRzY29wZS5wYWdlSWQ7XG4gICAgICBpZiAobW92ZUZvbGRlciAmJiBmaWxlQ291bnQgJiYgbW92ZUZvbGRlciAhPT0gb2xkRm9sZGVyKSB7XG4gICAgICAgIGxvZy5kZWJ1ZyhcIk1vdmluZyBcIiArIGZpbGVDb3VudCArIFwiIGZpbGUocykgdG8gXCIgKyBtb3ZlRm9sZGVyKTtcbiAgICAgICAgYW5ndWxhci5mb3JFYWNoKGZpbGVzLCAoZmlsZSwgaWR4KSA9PiB7XG4gICAgICAgICAgdmFyIG9sZFBhdGggPSBvbGRGb2xkZXIgKyBcIi9cIiArIGZpbGUubmFtZTtcbiAgICAgICAgICB2YXIgbmV3UGF0aCA9IG1vdmVGb2xkZXIgKyBcIi9cIiArIGZpbGUubmFtZTtcbiAgICAgICAgICBsb2cuZGVidWcoXCJBYm91dCB0byBtb3ZlIFwiICsgb2xkUGF0aCArIFwiIHRvIFwiICsgbmV3UGF0aCk7XG4gICAgICAgICAgJHNjb3BlLmdpdCA9IHdpa2lSZXBvc2l0b3J5LnJlbmFtZSgkc2NvcGUuYnJhbmNoLCBvbGRQYXRoLCBuZXdQYXRoLCBudWxsLCAocmVzdWx0KSA9PiB7XG4gICAgICAgICAgICBpZiAoaWR4ICsgMSA9PT0gZmlsZUNvdW50KSB7XG4gICAgICAgICAgICAgICRzY29wZS5ncmlkT3B0aW9ucy5zZWxlY3RlZEl0ZW1zLnNwbGljZSgwLCBmaWxlQ291bnQpO1xuICAgICAgICAgICAgICB2YXIgbWVzc2FnZSA9IENvcmUubWF5YmVQbHVyYWwoZmlsZUNvdW50LCBcImRvY3VtZW50XCIpO1xuICAgICAgICAgICAgICBDb3JlLm5vdGlmaWNhdGlvbihcInN1Y2Nlc3NcIiwgXCJNb3ZlZCBcIiArIG1lc3NhZ2UgKyBcIiB0byBcIiArIG5ld1BhdGgpO1xuICAgICAgICAgICAgICAkc2NvcGUubW92ZURpYWxvZy5jbG9zZSgpO1xuICAgICAgICAgICAgICBDb3JlLiRhcHBseSgkc2NvcGUpO1xuICAgICAgICAgICAgICB1cGRhdGVWaWV3KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgICAgJHNjb3BlLm1vdmVEaWFsb2cuY2xvc2UoKTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLmZvbGRlck5hbWVzID0gKHRleHQpID0+IHtcbiAgICAgIHJldHVybiB3aWtpUmVwb3NpdG9yeS5jb21wbGV0ZVBhdGgoJHNjb3BlLmJyYW5jaCwgdGV4dCwgdHJ1ZSwgbnVsbCk7XG4gICAgfTtcblxuICAgICRzY29wZS5vcGVuTW92ZURpYWxvZyA9ICgpID0+IHtcbiAgICAgIGlmICgkc2NvcGUuZ3JpZE9wdGlvbnMuc2VsZWN0ZWRJdGVtcy5sZW5ndGgpIHtcbiAgICAgICAgJHNjb3BlLm1vdmUubW92ZUZvbGRlciA9ICRzY29wZS5wYWdlSWQ7XG5cbiAgICAgICAgJHNjb3BlLm1vdmVEaWFsb2cgPSBXaWtpLmdldE1vdmVEaWFsb2coJGRpYWxvZywgPFdpa2kuTW92ZURpYWxvZ09wdGlvbnM+e1xuICAgICAgICAgIG1vdmU6ICgpID0+IHsgIHJldHVybiAkc2NvcGUubW92ZTsgfSxcbiAgICAgICAgICBmb2xkZXJOYW1lczogKCkgPT4geyByZXR1cm4gJHNjb3BlLmZvbGRlck5hbWVzOyB9LFxuICAgICAgICAgIGNhbGxiYWNrczogKCkgPT4geyByZXR1cm4gJHNjb3BlLm1vdmVBbmRDbG9zZURpYWxvZzsgfVxuICAgICAgICB9KTtcblxuICAgICAgICAkc2NvcGUubW92ZURpYWxvZy5vcGVuKCk7XG5cbiAgICAgICAgJHRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICQoJyNtb3ZlRm9sZGVyJykuZm9jdXMoKTtcbiAgICAgICAgfSwgNTApO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbG9nLmRlYnVnKFwiTm8gaXRlbXMgc2VsZWN0ZWQgcmlnaHQgbm93ISBcIiArICRzY29wZS5ncmlkT3B0aW9ucy5zZWxlY3RlZEl0ZW1zKTtcbiAgICAgIH1cbiAgICB9O1xuXG5cbiAgICBzZXRUaW1lb3V0KG1heWJlVXBkYXRlVmlldywgNTApO1xuXG4gICAgZnVuY3Rpb24gaXNEaWZmVmlldygpIHtcbiAgICAgIHJldHVybiAkcm91dGVQYXJhbXNbXCJkaWZmT2JqZWN0SWQxXCJdIHx8ICRyb3V0ZVBhcmFtc1tcImRpZmZPYmplY3RJZDJcIl0gPyB0cnVlIDogZmFsc2VcbiAgICB9XG5cbiAgICBmdW5jdGlvbiB1cGRhdGVWaWV3KCkge1xuICAgICAgICAvLyBUT0RPIHJlbW92ZSFcbiAgICAgICAgdmFyIGpvbG9raWEgPSBudWxsO1xuXG5cbiAgICAgIGlmIChpc0RpZmZWaWV3KCkpIHtcbiAgICAgICAgdmFyIGJhc2VPYmplY3RJZCA9ICRyb3V0ZVBhcmFtc1tcImRpZmZPYmplY3RJZDJcIl07XG4gICAgICAgICRzY29wZS5naXQgPSB3aWtpUmVwb3NpdG9yeS5kaWZmKCRzY29wZS5vYmplY3RJZCwgYmFzZU9iamVjdElkLCAkc2NvcGUucGFnZUlkLCBvbkZpbGVEZXRhaWxzKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgICRzY29wZS5naXQgPSB3aWtpUmVwb3NpdG9yeS5nZXRQYWdlKCRzY29wZS5icmFuY2gsICRzY29wZS5wYWdlSWQsICRzY29wZS5vYmplY3RJZCwgb25GaWxlRGV0YWlscyk7XG4gICAgICB9XG4gICAgICBXaWtpLmxvYWRCcmFuY2hlcyhqb2xva2lhLCB3aWtpUmVwb3NpdG9yeSwgJHNjb3BlLCBpc0ZtYyk7XG4gICAgfVxuXG4gICAgJHNjb3BlLnVwZGF0ZVZpZXcgPSB1cGRhdGVWaWV3O1xuXG4gICAgZnVuY3Rpb24gdmlld0NvbnRlbnRzKHBhZ2VOYW1lLCBjb250ZW50cykge1xuICAgICAgJHNjb3BlLnNvdXJjZVZpZXcgPSBudWxsO1xuXG4gICAgICB2YXIgZm9ybWF0OnN0cmluZyA9IG51bGw7XG4gICAgICBpZiAoaXNEaWZmVmlldygpKSB7XG4gICAgICAgIGZvcm1hdCA9IFwiZGlmZlwiO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZm9ybWF0ID0gV2lraS5maWxlRm9ybWF0KHBhZ2VOYW1lLCBmaWxlRXh0ZW5zaW9uVHlwZVJlZ2lzdHJ5KSB8fCAkc2NvcGUuZm9ybWF0O1xuICAgICAgfVxuICAgICAgbG9nLmRlYnVnKFwiRmlsZSBmb3JtYXQ6IFwiLCBmb3JtYXQpO1xuICAgICAgc3dpdGNoIChmb3JtYXQpIHtcbiAgICAgICAgY2FzZSBcImltYWdlXCI6XG4gICAgICAgICAgdmFyIGltYWdlVVJMID0gJ2dpdC8nICsgJHNjb3BlLmJyYW5jaDtcbiAgICAgICAgICBsb2cuZGVidWcoXCIkc2NvcGU6IFwiLCAkc2NvcGUpO1xuICAgICAgICAgIGltYWdlVVJMID0gVXJsSGVscGVycy5qb2luKGltYWdlVVJMLCAkc2NvcGUucGFnZUlkKTtcbiAgICAgICAgICB2YXIgaW50ZXJwb2xhdGVGdW5jID0gJGludGVycG9sYXRlKCR0ZW1wbGF0ZUNhY2hlLmdldChcImltYWdlVGVtcGxhdGUuaHRtbFwiKSk7XG4gICAgICAgICAgJHNjb3BlLmh0bWwgPSBpbnRlcnBvbGF0ZUZ1bmMoe1xuICAgICAgICAgICAgaW1hZ2VVUkw6IGltYWdlVVJMXG4gICAgICAgICAgfSk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgXCJtYXJrZG93blwiOlxuICAgICAgICAgICRzY29wZS5odG1sID0gY29udGVudHMgPyBtYXJrZWQoY29udGVudHMpIDogXCJcIjtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSBcImphdmFzY3JpcHRcIjpcbiAgICAgICAgICB2YXIgZm9ybSA9IG51bGw7XG4gICAgICAgICAgZm9ybSA9ICRsb2NhdGlvbi5zZWFyY2goKVtcImZvcm1cIl07XG4gICAgICAgICAgJHNjb3BlLnNvdXJjZSA9IGNvbnRlbnRzO1xuICAgICAgICAgICRzY29wZS5mb3JtID0gZm9ybTtcbiAgICAgICAgICBpZiAoZm9ybSkge1xuICAgICAgICAgICAgLy8gbm93IGxldHMgdHJ5IGxvYWQgdGhlIGZvcm0gSlNPTiBzbyB3ZSBjYW4gdGhlbiByZW5kZXIgdGhlIGZvcm1cbiAgICAgICAgICAgICRzY29wZS5zb3VyY2VWaWV3ID0gbnVsbDtcbiAgICAgICAgICAgICRzY29wZS5naXQgPSB3aWtpUmVwb3NpdG9yeS5nZXRQYWdlKCRzY29wZS5icmFuY2gsIGZvcm0sICRzY29wZS5vYmplY3RJZCwgKGRldGFpbHMpID0+IHtcbiAgICAgICAgICAgICAgb25Gb3JtU2NoZW1hKFdpa2kucGFyc2VKc29uKGRldGFpbHMudGV4dCkpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICRzY29wZS5zb3VyY2VWaWV3ID0gXCJwbHVnaW5zL3dpa2kvaHRtbC9zb3VyY2VWaWV3Lmh0bWxcIjtcbiAgICAgICAgICB9XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgJHNjb3BlLmh0bWwgPSBudWxsO1xuICAgICAgICAgICRzY29wZS5zb3VyY2UgPSBjb250ZW50cztcbiAgICAgICAgICAkc2NvcGUuc291cmNlVmlldyA9IFwicGx1Z2lucy93aWtpL2h0bWwvc291cmNlVmlldy5odG1sXCI7XG4gICAgICB9XG4gICAgICBDb3JlLiRhcHBseSgkc2NvcGUpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIG9uRm9ybVNjaGVtYShqc29uKSB7XG4gICAgICAkc2NvcGUuZm9ybURlZmluaXRpb24gPSBqc29uO1xuICAgICAgaWYgKCRzY29wZS5zb3VyY2UpIHtcbiAgICAgICAgJHNjb3BlLmZvcm1FbnRpdHkgPSBXaWtpLnBhcnNlSnNvbigkc2NvcGUuc291cmNlKTtcbiAgICAgIH1cbiAgICAgICRzY29wZS5zb3VyY2VWaWV3ID0gXCJwbHVnaW5zL3dpa2kvaHRtbC9mb3JtVmlldy5odG1sXCI7XG4gICAgICBDb3JlLiRhcHBseSgkc2NvcGUpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIG9uRmlsZURldGFpbHMoZGV0YWlscykge1xuICAgICAgdmFyIGNvbnRlbnRzID0gZGV0YWlscy50ZXh0O1xuICAgICAgJHNjb3BlLmRpcmVjdG9yeSA9IGRldGFpbHMuZGlyZWN0b3J5O1xuICAgICAgJHNjb3BlLmZpbGVEZXRhaWxzID0gZGV0YWlscztcblxuICAgICAgaWYgKGRldGFpbHMgJiYgZGV0YWlscy5mb3JtYXQpIHtcbiAgICAgICAgJHNjb3BlLmZvcm1hdCA9IGRldGFpbHMuZm9ybWF0O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgJHNjb3BlLmZvcm1hdCA9IFdpa2kuZmlsZUZvcm1hdCgkc2NvcGUucGFnZUlkLCBmaWxlRXh0ZW5zaW9uVHlwZVJlZ2lzdHJ5KTtcbiAgICAgIH1cbiAgICAgICRzY29wZS5jb2RlTWlycm9yT3B0aW9ucy5tb2RlLm5hbWUgPSAkc2NvcGUuZm9ybWF0O1xuICAgICAgJHNjb3BlLmNoaWxkcmVuID0gbnVsbDtcblxuICAgICAgaWYgKGRldGFpbHMuZGlyZWN0b3J5KSB7XG4gICAgICAgIHZhciBkaXJlY3RvcmllcyA9IGRldGFpbHMuY2hpbGRyZW4uZmlsdGVyKChkaXIpID0+IHtcbiAgICAgICAgICByZXR1cm4gZGlyLmRpcmVjdG9yeTtcbiAgICAgICAgfSk7XG4gICAgICAgIHZhciBwcm9maWxlcyA9IGRldGFpbHMuY2hpbGRyZW4uZmlsdGVyKChkaXIpID0+IHtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH0pO1xuICAgICAgICB2YXIgZmlsZXMgPSBkZXRhaWxzLmNoaWxkcmVuLmZpbHRlcigoZmlsZSkgPT4ge1xuICAgICAgICAgIHJldHVybiAhZmlsZS5kaXJlY3Rvcnk7XG4gICAgICAgIH0pO1xuICAgICAgICBkaXJlY3RvcmllcyA9IGRpcmVjdG9yaWVzLnNvcnRCeSgoZGlyKSA9PiB7XG4gICAgICAgICAgcmV0dXJuIGRpci5uYW1lO1xuICAgICAgICB9KTtcbiAgICAgICAgcHJvZmlsZXMgPSBwcm9maWxlcy5zb3J0QnkoKGRpcikgPT4ge1xuICAgICAgICAgIHJldHVybiBkaXIubmFtZTtcbiAgICAgICAgfSk7XG4gICAgICAgIGZpbGVzID0gZmlsZXMuc29ydEJ5KChmaWxlKSA9PiB7XG4gICAgICAgICAgcmV0dXJuIGZpbGUubmFtZTtcbiAgICAgICAgfSlcbiAgICAgICAgICAuc29ydEJ5KChmaWxlKSA9PiB7XG4gICAgICAgICAgICByZXR1cm4gZmlsZS5uYW1lLnNwbGl0KCcuJykubGFzdCgpO1xuICAgICAgICAgIH0pO1xuICAgICAgICAvLyBBbHNvIGVucmljaCB0aGUgcmVzcG9uc2Ugd2l0aCB0aGUgY3VycmVudCBicmFuY2gsIGFzIHRoYXQncyBwYXJ0IG9mIHRoZSBjb29yZGluYXRlIGZvciBsb2NhdGluZyB0aGUgYWN0dWFsIGZpbGUgaW4gZ2l0XG4gICAgICAgICRzY29wZS5jaGlsZHJlbiA9ICg8YW55PkFycmF5KS5jcmVhdGUoZGlyZWN0b3JpZXMsIHByb2ZpbGVzLCBmaWxlcykubWFwKChmaWxlKSA9PiB7XG4gICAgICAgICAgZmlsZS5icmFuY2ggPSAkc2NvcGUuYnJhbmNoO1xuICAgICAgICAgIGZpbGUuZmlsZU5hbWUgPSBmaWxlLm5hbWU7XG4gICAgICAgICAgaWYgKGZpbGUuZGlyZWN0b3J5KSB7XG4gICAgICAgICAgICBmaWxlLmZpbGVOYW1lICs9IFwiLnppcFwiO1xuICAgICAgICAgIH1cbiAgICAgICAgICBmaWxlLmRvd25sb2FkVVJMID0gV2lraS5naXRSZXN0VVJMKCRzY29wZSwgZmlsZS5wYXRoKTtcbiAgICAgICAgICByZXR1cm4gZmlsZTtcbiAgICAgICAgfSk7XG4gICAgICB9XG5cblxuICAgICAgJHNjb3BlLmh0bWwgPSBudWxsO1xuICAgICAgJHNjb3BlLnNvdXJjZSA9IG51bGw7XG4gICAgICAkc2NvcGUucmVhZE1lUGF0aCA9IG51bGw7XG5cbiAgICAgICRzY29wZS5pc0ZpbGUgPSBmYWxzZTtcbiAgICAgIGlmICgkc2NvcGUuY2hpbGRyZW4pIHtcbiAgICAgICAgJHNjb3BlLiRicm9hZGNhc3QoJ3BhbmUub3BlbicpO1xuICAgICAgICAvLyBpZiB3ZSBoYXZlIGEgcmVhZG1lIHRoZW4gbGV0cyByZW5kZXIgaXQuLi5cbiAgICAgICAgdmFyIGl0ZW0gPSAkc2NvcGUuY2hpbGRyZW4uZmluZCgoaW5mbykgPT4ge1xuICAgICAgICAgIHZhciBuYW1lID0gKGluZm8ubmFtZSB8fCBcIlwiKS50b0xvd2VyQ2FzZSgpO1xuICAgICAgICAgIHZhciBleHQgPSBmaWxlRXh0ZW5zaW9uKG5hbWUpO1xuICAgICAgICAgIHJldHVybiBuYW1lICYmIGV4dCAmJiAoKG5hbWUuc3RhcnRzV2l0aChcInJlYWRtZS5cIikgfHwgbmFtZSA9PT0gXCJyZWFkbWVcIikgfHwgKG5hbWUuc3RhcnRzV2l0aChcImluZGV4LlwiKSB8fCBuYW1lID09PSBcImluZGV4XCIpKTtcbiAgICAgICAgfSk7XG4gICAgICAgIGlmIChpdGVtKSB7XG4gICAgICAgICAgdmFyIHBhZ2VOYW1lID0gaXRlbS5wYXRoO1xuICAgICAgICAgICRzY29wZS5yZWFkTWVQYXRoID0gcGFnZU5hbWU7XG4gICAgICAgICAgd2lraVJlcG9zaXRvcnkuZ2V0UGFnZSgkc2NvcGUuYnJhbmNoLCBwYWdlTmFtZSwgJHNjb3BlLm9iamVjdElkLCAocmVhZG1lRGV0YWlscykgPT4ge1xuICAgICAgICAgICAgdmlld0NvbnRlbnRzKHBhZ2VOYW1lLCByZWFkbWVEZXRhaWxzLnRleHQpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIHZhciBrdWJlcm5ldGVzSnNvbiA9ICRzY29wZS5jaGlsZHJlbi5maW5kKChjaGlsZCkgPT4ge1xuICAgICAgICAgIHZhciBuYW1lID0gKGNoaWxkLm5hbWUgfHwgXCJcIikudG9Mb3dlckNhc2UoKTtcbiAgICAgICAgICB2YXIgZXh0ID0gZmlsZUV4dGVuc2lvbihuYW1lKTtcbiAgICAgICAgICByZXR1cm4gbmFtZSAmJiBleHQgJiYgbmFtZS5zdGFydHNXaXRoKFwia3ViZXJuZXRlc1wiKSAmJiBleHQgPT09IFwianNvblwiO1xuICAgICAgICB9KTtcbiAgICAgICAgaWYgKGt1YmVybmV0ZXNKc29uKSB7XG4gICAgICAgICAgd2lraVJlcG9zaXRvcnkuZ2V0UGFnZSgkc2NvcGUuYnJhbmNoLCBrdWJlcm5ldGVzSnNvbi5wYXRoLCB1bmRlZmluZWQsIChqc29uKSA9PiB7XG4gICAgICAgICAgICBpZiAoanNvbiAmJiBqc29uLnRleHQpIHtcbiAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAkc2NvcGUua3ViZXJuZXRlc0pzb24gPSBhbmd1bGFyLmZyb21Kc29uKGpzb24udGV4dCk7XG4gICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICAkc2NvcGUua3ViZXJuZXRlc0pzb24gPSB7XG4gICAgICAgICAgICAgICAgICBlcnJvclBhcnNpbmc6IHRydWUsXG4gICAgICAgICAgICAgICAgICBlcnJvcjogZVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgJHNjb3BlLnNob3dBcHBIZWFkZXIgPSB0cnVlO1xuICAgICAgICAgICAgICBDb3JlLiRhcHBseSgkc2NvcGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgICRzY29wZS4kYnJvYWRjYXN0KCdXaWtpLlZpZXdQYWdlLkNoaWxkcmVuJywgJHNjb3BlLnBhZ2VJZCwgJHNjb3BlLmNoaWxkcmVuKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgICRzY29wZS4kYnJvYWRjYXN0KCdwYW5lLmNsb3NlJyk7XG4gICAgICAgIHZhciBwYWdlTmFtZSA9ICRzY29wZS5wYWdlSWQ7XG4gICAgICAgIHZpZXdDb250ZW50cyhwYWdlTmFtZSwgY29udGVudHMpO1xuICAgICAgICAkc2NvcGUuaXNGaWxlID0gdHJ1ZTtcbiAgICAgIH1cbiAgICAgIENvcmUuJGFwcGx5KCRzY29wZSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY2hlY2tGaWxlRXhpc3RzKHBhdGgpIHtcbiAgICAgICRzY29wZS5vcGVyYXRpb25Db3VudGVyICs9IDE7XG4gICAgICB2YXIgY291bnRlciA9ICRzY29wZS5vcGVyYXRpb25Db3VudGVyO1xuICAgICAgaWYgKHBhdGgpIHtcbiAgICAgICAgd2lraVJlcG9zaXRvcnkuZXhpc3RzKCRzY29wZS5icmFuY2gsIHBhdGgsIChyZXN1bHQpID0+IHtcbiAgICAgICAgICAvLyBmaWx0ZXIgb2xkIHJlc3VsdHNcbiAgICAgICAgICBpZiAoJHNjb3BlLm9wZXJhdGlvbkNvdW50ZXIgPT09IGNvdW50ZXIpIHtcbiAgICAgICAgICAgIGxvZy5kZWJ1ZyhcImNoZWNrRmlsZUV4aXN0cyBmb3IgcGF0aCBcIiArIHBhdGggKyBcIiBnb3QgcmVzdWx0IFwiICsgcmVzdWx0KTtcbiAgICAgICAgICAgICRzY29wZS5maWxlRXhpc3RzLmV4aXN0cyA9IHJlc3VsdCA/IHRydWUgOiBmYWxzZTtcbiAgICAgICAgICAgICRzY29wZS5maWxlRXhpc3RzLm5hbWUgPSByZXN1bHQgPyByZXN1bHQubmFtZSA6IG51bGw7XG4gICAgICAgICAgICBDb3JlLiRhcHBseSgkc2NvcGUpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBsb2cuZGVidWcoXCJJZ25vcmluZyBvbGQgcmVzdWx0cyBmb3IgXCIgKyBwYXRoKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIENhbGxlZCBieSBoYXd0aW8gVE9DIGRpcmVjdGl2ZS4uLlxuICAgICRzY29wZS5nZXRDb250ZW50cyA9IChmaWxlbmFtZSwgY2IpID0+IHtcbiAgICAgIHZhciBwYWdlSWQgPSBmaWxlbmFtZTtcbiAgICAgIGlmICgkc2NvcGUuZGlyZWN0b3J5KSB7XG4gICAgICAgIHBhZ2VJZCA9ICRzY29wZS5wYWdlSWQgKyAnLycgKyBmaWxlbmFtZTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciBwYXRoUGFydHMgPSAkc2NvcGUucGFnZUlkLnNwbGl0KCcvJyk7XG4gICAgICAgIHBhdGhQYXJ0cyA9IHBhdGhQYXJ0cy5yZW1vdmUocGF0aFBhcnRzLmxhc3QoKSk7XG4gICAgICAgIHBhdGhQYXJ0cy5wdXNoKGZpbGVuYW1lKTtcbiAgICAgICAgcGFnZUlkID0gcGF0aFBhcnRzLmpvaW4oJy8nKTtcbiAgICAgIH1cbiAgICAgIGxvZy5kZWJ1ZyhcInBhZ2VJZDogXCIsICRzY29wZS5wYWdlSWQpO1xuICAgICAgbG9nLmRlYnVnKFwiYnJhbmNoOiBcIiwgJHNjb3BlLmJyYW5jaCk7XG4gICAgICBsb2cuZGVidWcoXCJmaWxlbmFtZTogXCIsIGZpbGVuYW1lKTtcbiAgICAgIGxvZy5kZWJ1ZyhcInVzaW5nIHBhZ2VJZDogXCIsIHBhZ2VJZCk7XG4gICAgICB3aWtpUmVwb3NpdG9yeS5nZXRQYWdlKCRzY29wZS5icmFuY2gsIHBhZ2VJZCwgdW5kZWZpbmVkLCAoZGF0YSkgPT4ge1xuICAgICAgICBjYihkYXRhLnRleHQpO1xuICAgICAgfSk7XG4gICAgfTtcblxuXG4gICAgZnVuY3Rpb24gZ2V0UmVuYW1lRmlsZVBhdGgoKSB7XG4gICAgICB2YXIgbmV3RmlsZU5hbWUgPSAkc2NvcGUucmVuYW1lLm5ld0ZpbGVOYW1lO1xuICAgICAgcmV0dXJuICgkc2NvcGUucGFnZUlkICYmIG5ld0ZpbGVOYW1lKSA/IFVybEhlbHBlcnMuam9pbigkc2NvcGUucGFnZUlkLCBuZXdGaWxlTmFtZSkgOiBudWxsO1xuICAgIH1cbiAgfV0pO1xufVxuIiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL2luY2x1ZGVzLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIndpa2lIZWxwZXJzLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIndpa2lQbHVnaW4udHNcIi8+XG5cbm1vZHVsZSBXaWtpIHtcblxuICBleHBvcnQgaW50ZXJmYWNlIFdpa2lEaWFsb2cge1xuICAgIG9wZW46ICgpID0+IHt9O1xuICAgIGNsb3NlOiAoKSA9PiB7fTtcbiAgfVxuXG4gIGV4cG9ydCBpbnRlcmZhY2UgUmVuYW1lRGlhbG9nT3B0aW9ucyB7XG4gICAgcmVuYW1lOiAoKSA9PiB7fTtcbiAgICBmaWxlRXhpc3RzOiAoKSA9PiB7fTtcbiAgICBmaWxlTmFtZTogKCkgPT4gU3RyaW5nO1xuICAgIGNhbGxiYWNrczogKCkgPT4gU3RyaW5nO1xuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIGdldFJlbmFtZURpYWxvZygkZGlhbG9nLCAkc2NvcGU6UmVuYW1lRGlhbG9nT3B0aW9ucyk6V2lraS5XaWtpRGlhbG9nIHtcbiAgICByZXR1cm4gJGRpYWxvZy5kaWFsb2coe1xuICAgICAgcmVzb2x2ZTogJHNjb3BlLFxuICAgICAgdGVtcGxhdGVVcmw6ICdwbHVnaW5zL3dpa2kvaHRtbC9tb2RhbC9yZW5hbWVEaWFsb2cuaHRtbCcsXG4gICAgICBjb250cm9sbGVyOiBbXCIkc2NvcGVcIiwgXCJkaWFsb2dcIiwgIFwiY2FsbGJhY2tzXCIsIFwicmVuYW1lXCIsIFwiZmlsZUV4aXN0c1wiLCBcImZpbGVOYW1lXCIsICgkc2NvcGUsIGRpYWxvZywgY2FsbGJhY2tzLCByZW5hbWUsIGZpbGVFeGlzdHMsIGZpbGVOYW1lKSA9PiB7XG4gICAgICAgICRzY29wZS5yZW5hbWUgID0gcmVuYW1lO1xuICAgICAgICAkc2NvcGUuZmlsZUV4aXN0cyAgPSBmaWxlRXhpc3RzO1xuICAgICAgICAkc2NvcGUuZmlsZU5hbWUgID0gZmlsZU5hbWU7XG5cbiAgICAgICAgJHNjb3BlLmNsb3NlID0gKHJlc3VsdCkgPT4ge1xuICAgICAgICAgIGRpYWxvZy5jbG9zZSgpO1xuICAgICAgICB9O1xuXG4gICAgICAgICRzY29wZS5yZW5hbWVBbmRDbG9zZURpYWxvZyA9IGNhbGxiYWNrcztcblxuICAgICAgfV1cbiAgICB9KTtcbiAgfVxuXG4gIGV4cG9ydCBpbnRlcmZhY2UgTW92ZURpYWxvZ09wdGlvbnMge1xuICAgIG1vdmU6ICgpID0+IHt9O1xuICAgIGZvbGRlck5hbWVzOiAoKSA9PiB7fTtcbiAgICBjYWxsYmFja3M6ICgpID0+IFN0cmluZztcbiAgfVxuXG5cbiAgZXhwb3J0IGZ1bmN0aW9uIGdldE1vdmVEaWFsb2coJGRpYWxvZywgJHNjb3BlOk1vdmVEaWFsb2dPcHRpb25zKTpXaWtpLldpa2lEaWFsb2cge1xuICAgIHJldHVybiAkZGlhbG9nLmRpYWxvZyh7XG4gICAgICByZXNvbHZlOiAkc2NvcGUsXG4gICAgICB0ZW1wbGF0ZVVybDogJ3BsdWdpbnMvd2lraS9odG1sL21vZGFsL21vdmVEaWFsb2cuaHRtbCcsXG4gICAgICBjb250cm9sbGVyOiBbXCIkc2NvcGVcIiwgXCJkaWFsb2dcIiwgIFwiY2FsbGJhY2tzXCIsIFwibW92ZVwiLCBcImZvbGRlck5hbWVzXCIsICgkc2NvcGUsIGRpYWxvZywgY2FsbGJhY2tzLCBtb3ZlLCBmb2xkZXJOYW1lcykgPT4ge1xuICAgICAgICAkc2NvcGUubW92ZSAgPSBtb3ZlO1xuICAgICAgICAkc2NvcGUuZm9sZGVyTmFtZXMgID0gZm9sZGVyTmFtZXM7XG5cbiAgICAgICAgJHNjb3BlLmNsb3NlID0gKHJlc3VsdCkgPT4ge1xuICAgICAgICAgIGRpYWxvZy5jbG9zZSgpO1xuICAgICAgICB9O1xuXG4gICAgICAgICRzY29wZS5tb3ZlQW5kQ2xvc2VEaWFsb2cgPSBjYWxsYmFja3M7XG5cbiAgICAgIH1dXG4gICAgfSk7XG4gIH1cblxuXG4gIGV4cG9ydCBpbnRlcmZhY2UgRGVsZXRlRGlhbG9nT3B0aW9ucyB7XG4gICAgY2FsbGJhY2tzOiAoKSA9PiBTdHJpbmc7XG4gICAgc2VsZWN0ZWRGaWxlSHRtbDogKCkgPT4gU3RyaW5nO1xuICAgIHdhcm5pbmc6ICgpID0+IHN0cmluZztcbiAgfVxuXG5cbiAgZXhwb3J0IGZ1bmN0aW9uIGdldERlbGV0ZURpYWxvZygkZGlhbG9nLCAkc2NvcGU6RGVsZXRlRGlhbG9nT3B0aW9ucyk6V2lraS5XaWtpRGlhbG9nIHtcbiAgICByZXR1cm4gJGRpYWxvZy5kaWFsb2coe1xuICAgICAgcmVzb2x2ZTogJHNjb3BlLFxuICAgICAgdGVtcGxhdGVVcmw6ICdwbHVnaW5zL3dpa2kvaHRtbC9tb2RhbC9kZWxldGVEaWFsb2cuaHRtbCcsXG4gICAgICBjb250cm9sbGVyOiBbXCIkc2NvcGVcIiwgXCJkaWFsb2dcIiwgIFwiY2FsbGJhY2tzXCIsIFwic2VsZWN0ZWRGaWxlSHRtbFwiLCBcIndhcm5pbmdcIiwgKCRzY29wZSwgZGlhbG9nLCBjYWxsYmFja3MsIHNlbGVjdGVkRmlsZUh0bWwsIHdhcm5pbmcpID0+IHtcblxuICAgICAgICAkc2NvcGUuc2VsZWN0ZWRGaWxlSHRtbCA9IHNlbGVjdGVkRmlsZUh0bWw7XG5cbiAgICAgICAgJHNjb3BlLmNsb3NlID0gKHJlc3VsdCkgPT4ge1xuICAgICAgICAgIGRpYWxvZy5jbG9zZSgpO1xuICAgICAgICB9O1xuXG4gICAgICAgICRzY29wZS5kZWxldGVBbmRDbG9zZURpYWxvZyA9IGNhbGxiYWNrcztcblxuICAgICAgICAkc2NvcGUud2FybmluZyA9IHdhcm5pbmc7XG4gICAgICB9XVxuICAgIH0pO1xuICB9XG5cblxuXG5cblxufSIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9pbmNsdWRlcy50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJ3aWtpSGVscGVycy50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJ3aWtpUGx1Z2luLnRzXCIvPlxuXG5tb2R1bGUgV2lraSB7XG5cbiAgX21vZHVsZS5kaXJlY3RpdmUoJ3dpa2lIcmVmQWRqdXN0ZXInLCBbXCIkbG9jYXRpb25cIiwgKCRsb2NhdGlvbikgPT4ge1xuICAgIHJldHVybiB7XG4gICAgICByZXN0cmljdDogJ0EnLFxuICAgICAgbGluazogKCRzY29wZSwgJGVsZW1lbnQsICRhdHRyKSA9PiB7XG5cbiAgICAgICAgJGVsZW1lbnQuYmluZCgnRE9NTm9kZUluc2VydGVkJywgKGV2ZW50KSA9PiB7XG4gICAgICAgICAgdmFyIGF5cyA9ICRlbGVtZW50LmZpbmQoJ2EnKTtcbiAgICAgICAgICBhbmd1bGFyLmZvckVhY2goYXlzLCAoYSkgPT4ge1xuICAgICAgICAgICAgaWYgKGEuaGFzQXR0cmlidXRlKCduby1hZGp1c3QnKSkge1xuICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBhID0gJChhKTtcbiAgICAgICAgICAgIHZhciBocmVmID0gKGEuYXR0cignaHJlZicpIHx8IFwiXCIpLnRyaW0oKTtcbiAgICAgICAgICAgIGlmIChocmVmKSB7XG4gICAgICAgICAgICAgIHZhciBmaWxlRXh0ZW5zaW9uID0gYS5hdHRyKCdmaWxlLWV4dGVuc2lvbicpO1xuICAgICAgICAgICAgICB2YXIgbmV3VmFsdWUgPSBXaWtpLmFkanVzdEhyZWYoJHNjb3BlLCAkbG9jYXRpb24sIGhyZWYsIGZpbGVFeHRlbnNpb24pO1xuICAgICAgICAgICAgICBpZiAobmV3VmFsdWUpIHtcbiAgICAgICAgICAgICAgICBhLmF0dHIoJ2hyZWYnLCBuZXdWYWx1ZSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcbiAgICAgICAgICB2YXIgaW1ncyA9ICRlbGVtZW50LmZpbmQoJ2ltZycpO1xuICAgICAgICAgIGFuZ3VsYXIuZm9yRWFjaChpbWdzLCAoYSkgPT4ge1xuICAgICAgICAgICAgaWYgKGEuaGFzQXR0cmlidXRlKCduby1hZGp1c3QnKSkge1xuICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBhID0gJChhKTtcbiAgICAgICAgICAgIHZhciBocmVmID0gKGEuYXR0cignc3JjJykgfHwgXCJcIikudHJpbSgpO1xuICAgICAgICAgICAgaWYgKGhyZWYpIHtcbiAgICAgICAgICAgICAgaWYgKGhyZWYuc3RhcnRzV2l0aChcIi9cIikpIHtcbiAgICAgICAgICAgICAgICBocmVmID0gQ29yZS51cmwoaHJlZik7XG4gICAgICAgICAgICAgICAgYS5hdHRyKCdzcmMnLCBocmVmKTtcblxuICAgICAgICAgICAgICAgIC8vIGxldHMgYXZvaWQgdGhpcyBlbGVtZW50IGJlaW5nIHJlcHJvY2Vzc2VkXG4gICAgICAgICAgICAgICAgYS5hdHRyKCduby1hZGp1c3QnLCAndHJ1ZScpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pXG4gICAgICB9XG4gICAgfVxuICB9XSk7XG5cbiAgX21vZHVsZS5kaXJlY3RpdmUoJ3dpa2lUaXRsZUxpbmtlcicsIFtcIiRsb2NhdGlvblwiLCAoJGxvY2F0aW9uKSA9PiB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHJlc3RyaWN0OiAnQScsXG4gICAgICBsaW5rOiAoJHNjb3BlLCAkZWxlbWVudCwgJGF0dHIpID0+IHtcbiAgICAgICAgdmFyIGxvYWRlZCA9IGZhbHNlO1xuXG4gICAgICAgIGZ1bmN0aW9uIG9mZnNldFRvcChlbGVtZW50cykge1xuICAgICAgICAgIGlmIChlbGVtZW50cykge1xuICAgICAgICAgICAgdmFyIG9mZnNldCA9IGVsZW1lbnRzLm9mZnNldCgpO1xuICAgICAgICAgICAgaWYgKG9mZnNldCkge1xuICAgICAgICAgICAgICByZXR1cm4gb2Zmc2V0LnRvcDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIDA7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBzY3JvbGxUb0hhc2goKSB7XG4gICAgICAgICAgdmFyIGFuc3dlciA9IGZhbHNlO1xuICAgICAgICAgIHZhciBpZCA9ICRsb2NhdGlvbi5zZWFyY2goKVtcImhhc2hcIl07XG4gICAgICAgICAgcmV0dXJuIHNjcm9sbFRvSWQoaWQpO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gc2Nyb2xsVG9JZChpZCkge1xuICAgICAgICAgIHZhciBhbnN3ZXIgPSBmYWxzZTtcbiAgICAgICAgICB2YXIgaWQgPSAkbG9jYXRpb24uc2VhcmNoKClbXCJoYXNoXCJdO1xuICAgICAgICAgIGlmIChpZCkge1xuICAgICAgICAgICAgdmFyIHNlbGVjdG9yID0gJ2FbbmFtZT1cIicgKyBpZCArICdcIl0nO1xuICAgICAgICAgICAgdmFyIHRhcmdldEVsZW1lbnRzID0gJGVsZW1lbnQuZmluZChzZWxlY3Rvcik7XG4gICAgICAgICAgICBpZiAodGFyZ2V0RWxlbWVudHMgJiYgdGFyZ2V0RWxlbWVudHMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgIHZhciBzY3JvbGxEdXJhdGlvbiA9IDE7XG4gICAgICAgICAgICAgIHZhciBkZWx0YSA9IG9mZnNldFRvcCgkKCRlbGVtZW50KSk7XG4gICAgICAgICAgICAgIHZhciB0b3AgPSBvZmZzZXRUb3AodGFyZ2V0RWxlbWVudHMpIC0gZGVsdGE7XG4gICAgICAgICAgICAgIGlmICh0b3AgPCAwKSB7XG4gICAgICAgICAgICAgICAgdG9wID0gMDtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAvL2xvZy5pbmZvKFwic2Nyb2xsaW5nIHRvIGhhc2g6IFwiICsgaWQgKyBcIiB0b3A6IFwiICsgdG9wICsgXCIgZGVsdGE6XCIgKyBkZWx0YSk7XG4gICAgICAgICAgICAgICQoJ2JvZHksaHRtbCcpLmFuaW1hdGUoe1xuICAgICAgICAgICAgICAgIHNjcm9sbFRvcDogdG9wXG4gICAgICAgICAgICAgIH0sIHNjcm9sbER1cmF0aW9uKTtcbiAgICAgICAgICAgICAgYW5zd2VyID0gdHJ1ZTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIC8vbG9nLmluZm8oXCJjb3VsZCBmaW5kIGVsZW1lbnQgZm9yOiBcIiArIHNlbGVjdG9yKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIGFuc3dlcjtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGFkZExpbmtzKGV2ZW50KSB7XG4gICAgICAgICAgdmFyIGhlYWRpbmdzID0gJGVsZW1lbnQuZmluZCgnaDEsaDIsaDMsaDQsaDUsaDYsaDcnKTtcbiAgICAgICAgICB2YXIgdXBkYXRlZCA9IGZhbHNlO1xuICAgICAgICAgIGFuZ3VsYXIuZm9yRWFjaChoZWFkaW5ncywgKGhlKSA9PiB7XG4gICAgICAgICAgICB2YXIgaDEgPSAkKGhlKTtcbiAgICAgICAgICAgIC8vIG5vdyBsZXRzIHRyeSBmaW5kIGEgY2hpbGQgaGVhZGVyXG4gICAgICAgICAgICB2YXIgYSA9IGgxLnBhcmVudChcImFcIik7XG4gICAgICAgICAgICBpZiAoIWEgfHwgIWEubGVuZ3RoKSB7XG4gICAgICAgICAgICAgIHZhciB0ZXh0ID0gaDEudGV4dCgpO1xuICAgICAgICAgICAgICBpZiAodGV4dCkge1xuICAgICAgICAgICAgICAgIHZhciB0YXJnZXQgPSB0ZXh0LnJlcGxhY2UoLyAvZywgXCItXCIpO1xuICAgICAgICAgICAgICAgIHZhciBwYXRoV2l0aEhhc2ggPSBcIiNcIiArICRsb2NhdGlvbi5wYXRoKCkgKyBcIj9oYXNoPVwiICsgdGFyZ2V0O1xuICAgICAgICAgICAgICAgIHZhciBsaW5rID0gQ29yZS5jcmVhdGVIcmVmKCRsb2NhdGlvbiwgcGF0aFdpdGhIYXNoLCBbJ2hhc2gnXSk7XG5cbiAgICAgICAgICAgICAgICAvLyBsZXRzIHdyYXAgdGhlIGhlYWRpbmcgaW4gYSBsaW5rXG4gICAgICAgICAgICAgICAgdmFyIG5ld0EgPSAkKCc8YSBuYW1lPVwiJyArIHRhcmdldCArICdcIiBocmVmPVwiJyArIGxpbmsgKyAnXCIgbmctY2xpY2s9XCJvbkxpbmtDbGljaygpXCI+PC9hPicpO1xuICAgICAgICAgICAgICAgIG5ld0Eub24oXCJjbGlja1wiLCAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHNjcm9sbFRvSWQodGFyZ2V0KSkge1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICB9LCA1MCk7XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICBuZXdBLmluc2VydEJlZm9yZShoMSk7XG4gICAgICAgICAgICAgICAgaDEuZGV0YWNoKCk7XG4gICAgICAgICAgICAgICAgbmV3QS5hcHBlbmQoaDEpO1xuICAgICAgICAgICAgICAgIHVwZGF0ZWQgPSB0cnVlO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgaWYgKHVwZGF0ZWQgJiYgIWxvYWRlZCkge1xuICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgIGlmIChzY3JvbGxUb0hhc2goKSkge1xuICAgICAgICAgICAgICAgIGxvYWRlZCA9IHRydWU7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sIDUwKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBvbkV2ZW50SW5zZXJ0ZWQoZXZlbnQpIHtcbiAgICAgICAgICAvLyBhdm9pZCBhbnkgbW9yZSBldmVudHMgd2hpbGUgd2UgZG8gb3VyIHRoaW5nXG4gICAgICAgICAgJGVsZW1lbnQudW5iaW5kKCdET01Ob2RlSW5zZXJ0ZWQnLCBvbkV2ZW50SW5zZXJ0ZWQpO1xuICAgICAgICAgIGFkZExpbmtzKGV2ZW50KTtcbiAgICAgICAgICAkZWxlbWVudC5iaW5kKCdET01Ob2RlSW5zZXJ0ZWQnLCBvbkV2ZW50SW5zZXJ0ZWQpO1xuICAgICAgICB9XG5cbiAgICAgICAgJGVsZW1lbnQuYmluZCgnRE9NTm9kZUluc2VydGVkJywgb25FdmVudEluc2VydGVkKTtcbiAgICAgIH1cbiAgICB9O1xuICB9XSk7XG5cbn1cbiIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9pbmNsdWRlcy50c1wiLz5cblxuXG4vKipcbiAqIEBtb2R1bGUgV2lraVxuICovXG5tb2R1bGUgV2lraSB7XG5cbiAgRGV2ZWxvcGVyLmN1c3RvbVByb2plY3RTdWJUYWJGYWN0b3JpZXMucHVzaChcbiAgICAoY29udGV4dCkgPT4ge1xuICAgICAgdmFyIHByb2plY3RMaW5rID0gY29udGV4dC5wcm9qZWN0TGluaztcbiAgICAgIHZhciBwcm9qZWN0TmFtZSA9IGNvbnRleHQucHJvamVjdE5hbWU7XG4gICAgICB2YXIgb3duZXIgPSBcIlwiO1xuICAgICAgdmFyIHJlcG9OYW1lID0gXCJcIjtcbiAgICAgIGlmIChwcm9qZWN0TmFtZSkge1xuICAgICAgICAvLyBUT0RPIHRoaXMgaXMgYSBiaXQgb2YgYSBoYWNrIC0gd2Ugc2hvdWxkIGV4cG9zZSB0aGlzIGEgYml0IGJldHRlciBzb21ld2hlcmU/XG4gICAgICAgIHZhciBpZHggPSBwcm9qZWN0TmFtZS5pbmRleE9mKCctJyk7XG4gICAgICAgIGlmIChpZHggPiAwKSB7XG4gICAgICAgICAgb3duZXIgPSBwcm9qZWN0TmFtZS5zdWJzdHJpbmcoMCwgaWR4KTtcbiAgICAgICAgICByZXBvTmFtZSA9IHByb2plY3ROYW1lLnN1YnN0cmluZyhpZHggKyAxKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgaXNWYWxpZDogKCkgPT4gcHJvamVjdExpbmsgJiYgb3duZXIgJiYgcmVwb05hbWUgJiYgRGV2ZWxvcGVyLmZvcmdlUmVhZHlMaW5rKCksXG4gICAgICAgIGhyZWY6IFVybEhlbHBlcnMuam9pbihwcm9qZWN0TGluaywgXCJ3aWtpXCIsIG93bmVyLCByZXBvTmFtZSwgXCJ2aWV3XCIpLFxuICAgICAgICBsYWJlbDogXCJTb3VyY2VcIixcbiAgICAgICAgdGl0bGU6IFwiQnJvd3NlIHRoZSBzb3VyY2UgY29kZSBvZiB0aGlzIHByb2plY3RcIlxuICAgICAgfTtcbiAgICB9KTtcblxuXG4gIGV4cG9ydCBmdW5jdGlvbiBjcmVhdGVTb3VyY2VCcmVhZGNydW1icygkc2NvcGUpIHtcbiAgICB2YXIgc291cmNlTGluayA9ICRzY29wZS4kdmlld0xpbmsgfHwgVXJsSGVscGVycy5qb2luKHN0YXJ0TGluaygkc2NvcGUpLCBcInZpZXdcIik7XG4gICAgcmV0dXJuIFtcbiAgICAgIHtcbiAgICAgICAgbGFiZWw6IFwiU291cmNlXCIsXG4gICAgICAgIGhyZWY6IHNvdXJjZUxpbmssXG4gICAgICAgIHRpdGxlOiBcIkJyb3dzZSB0aGUgc291cmNlIGNvZGUgb2YgdGhpcyBwcm9qZWN0XCJcbiAgICAgIH1cbiAgICBdXG4gIH1cblxuICBleHBvcnQgZnVuY3Rpb24gY3JlYXRlRWRpdGluZ0JyZWFkY3J1bWIoJHNjb3BlKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBsYWJlbDogXCJFZGl0aW5nXCIsXG4gICAgICAgIHRpdGxlOiBcIkVkaXRpbmcgdGhpcyBmaWxlXCJcbiAgICAgIH07XG4gIH1cbn1cbiIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9pbmNsdWRlcy50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJ3aWtpSGVscGVycy50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJ3aWtpUGx1Z2luLnRzXCIvPlxuXG4vKipcbiAqIEBtb2R1bGUgV2lraVxuICovXG5tb2R1bGUgV2lraSB7XG5cbiAgLyoqXG4gICAqIEBjbGFzcyBHaXRXaWtpUmVwb3NpdG9yeVxuICAgKi9cbiAgZXhwb3J0IGNsYXNzIEdpdFdpa2lSZXBvc2l0b3J5IHtcbiAgICBwdWJsaWMgZGlyZWN0b3J5UHJlZml4ID0gXCJcIjtcbiAgICBwcml2YXRlICRodHRwO1xuICAgIHByaXZhdGUgY29uZmlnO1xuICAgIHByaXZhdGUgYmFzZVVybDtcblxuXG4gICAgY29uc3RydWN0b3IoJHNjb3BlKSB7XG4gICAgICB2YXIgRm9yZ2VBcGlVUkwgPSBLdWJlcm5ldGVzLmluamVjdChcIkZvcmdlQXBpVVJMXCIpO1xuICAgICAgdGhpcy4kaHR0cCA9IEt1YmVybmV0ZXMuaW5qZWN0KFwiJGh0dHBcIik7XG4gICAgICB0aGlzLmNvbmZpZyA9IEZvcmdlLmNyZWF0ZUh0dHBDb25maWcoKTtcbiAgICAgIHZhciBvd25lciA9ICRzY29wZS5vd25lcjtcbiAgICAgIHZhciByZXBvTmFtZSA9ICRzY29wZS5yZXBvSWQ7XG4gICAgICB0aGlzLmJhc2VVcmwgPSBVcmxIZWxwZXJzLmpvaW4oRm9yZ2VBcGlVUkwsIFwicmVwb3MvdXNlclwiLCBvd25lciwgcmVwb05hbWUpO1xuICAgIH1cblxuICAgIHB1YmxpYyBnZXRQYWdlKGJyYW5jaDpzdHJpbmcsIHBhdGg6c3RyaW5nLCBvYmplY3RJZDpzdHJpbmcsIGZuKSB7XG4gICAgICAvLyBUT0RPIGlnbm9yaW5nIG9iamVjdElkXG4gICAgICB2YXIgcXVlcnkgPSBudWxsO1xuICAgICAgaWYgKGJyYW5jaCkge1xuICAgICAgICBxdWVyeSA9IFwicmVmPVwiICsgYnJhbmNoO1xuICAgICAgfVxuICAgICAgdGhpcy5kb0dldChVcmxIZWxwZXJzLmpvaW4oXCJjb250ZW50XCIsIHBhdGggfHwgXCIvXCIpLCBxdWVyeSxcbiAgICAgICAgKGRhdGEsIHN0YXR1cywgaGVhZGVycywgY29uZmlnKSA9PiB7XG4gICAgICAgICAgaWYgKGRhdGEpIHtcbiAgICAgICAgICAgIHZhciBkZXRhaWxzOiBhbnkgPSBudWxsO1xuICAgICAgICAgICAgaWYgKGFuZ3VsYXIuaXNBcnJheShkYXRhKSkge1xuICAgICAgICAgICAgICBhbmd1bGFyLmZvckVhY2goZGF0YSwgKGZpbGUpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoIWZpbGUuZGlyZWN0b3J5ICYmIGZpbGUudHlwZSA9PT0gXCJkaXJcIikge1xuICAgICAgICAgICAgICAgICAgZmlsZS5kaXJlY3RvcnkgPSB0cnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgIGRldGFpbHMgPSB7XG4gICAgICAgICAgICAgICAgZGlyZWN0b3J5OiB0cnVlLFxuICAgICAgICAgICAgICAgIGNoaWxkcmVuOiBkYXRhXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGRldGFpbHMgPSBkYXRhO1xuICAgICAgICAgICAgICB2YXIgY29udGVudCA9IGRhdGEuY29udGVudDtcbiAgICAgICAgICAgICAgaWYgKGNvbnRlbnQpIHtcbiAgICAgICAgICAgICAgICBkZXRhaWxzLnRleHQgPSBjb250ZW50LmRlY29kZUJhc2U2NCgpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBmbihkZXRhaWxzKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHB1YmxpYyBwdXRQYWdlKGJyYW5jaDpzdHJpbmcsIHBhdGg6c3RyaW5nLCBjb250ZW50czpzdHJpbmcsIGNvbW1pdE1lc3NhZ2U6c3RyaW5nLCBmbikge1xuICAgICAgdmFyIHF1ZXJ5ID0gbnVsbDtcbiAgICAgIGlmIChicmFuY2gpIHtcbiAgICAgICAgcXVlcnkgPSBcInJlZj1cIiArIGJyYW5jaDtcbiAgICAgIH1cbiAgICAgIGlmIChjb21taXRNZXNzYWdlKSB7XG4gICAgICAgIHF1ZXJ5ID0gKHF1ZXJ5ID8gcXVlcnkgKyBcIiZcIiA6IFwiXCIpICsgXCJtZXNzYWdlPVwiICsgZW5jb2RlVVJJQ29tcG9uZW50KGNvbW1pdE1lc3NhZ2UpO1xuICAgICAgfVxuICAgICAgdmFyIGJvZHkgPSBjb250ZW50cztcbiAgICAgIHRoaXMuZG9Qb3N0KFVybEhlbHBlcnMuam9pbihcImNvbnRlbnRcIiwgcGF0aCB8fCBcIi9cIiksIHF1ZXJ5LCBib2R5LFxuICAgICAgICAoZGF0YSwgc3RhdHVzLCBoZWFkZXJzLCBjb25maWcpID0+IHtcbiAgICAgICAgICBmbihkYXRhKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUmV0dXJuIHRoZSBoaXN0b3J5IG9mIHRoZSByZXBvc2l0b3J5IG9yIGEgc3BlY2lmaWMgZGlyZWN0b3J5IG9yIGZpbGUgcGF0aFxuICAgICAqIEBtZXRob2QgaGlzdG9yeVxuICAgICAqIEBmb3IgR2l0V2lraVJlcG9zaXRvcnlcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gYnJhbmNoXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IG9iamVjdElkXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IHBhdGhcbiAgICAgKiBAcGFyYW0ge051bWJlcn0gbGltaXRcbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBmblxuICAgICAqIEByZXR1cm4ge2FueX1cbiAgICAgKi9cbiAgICBwdWJsaWMgaGlzdG9yeShicmFuY2g6c3RyaW5nLCBvYmplY3RJZDpzdHJpbmcsIHBhdGg6c3RyaW5nLCBsaW1pdDpudW1iZXIsIGZuKSB7XG4gICAgICB2YXIgcXVlcnkgPSBudWxsO1xuICAgICAgaWYgKGJyYW5jaCkge1xuICAgICAgICBxdWVyeSA9IFwicmVmPVwiICsgYnJhbmNoO1xuICAgICAgfVxuICAgICAgaWYgKGxpbWl0KSB7XG4gICAgICAgIHF1ZXJ5ID0gKHF1ZXJ5ID8gcXVlcnkgKyBcIiZcIiA6IFwiXCIpICsgXCJsaW1pdD1cIiArIGxpbWl0O1xuICAgICAgfVxuICAgICAgdmFyIGNvbW1pdElkID0gb2JqZWN0SWQgfHwgYnJhbmNoO1xuICAgICAgdGhpcy5kb0dldChVcmxIZWxwZXJzLmpvaW4oXCJoaXN0b3J5XCIsIGNvbW1pdElkLCBwYXRoKSwgcXVlcnksXG4gICAgICAgIChkYXRhLCBzdGF0dXMsIGhlYWRlcnMsIGNvbmZpZykgPT4ge1xuICAgICAgICAgIGZuKGRhdGEpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwdWJsaWMgY29tbWl0SW5mbyhjb21taXRJZDpzdHJpbmcsIGZuKSB7XG4gICAgICB2YXIgcXVlcnkgPSBudWxsO1xuICAgICAgdGhpcy5kb0dldChVcmxIZWxwZXJzLmpvaW4oXCJjb21taXRJbmZvXCIsIGNvbW1pdElkKSwgcXVlcnksXG4gICAgICAgIChkYXRhLCBzdGF0dXMsIGhlYWRlcnMsIGNvbmZpZykgPT4ge1xuICAgICAgICAgIGZuKGRhdGEpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwdWJsaWMgY29tbWl0VHJlZShjb21taXRJZDpzdHJpbmcsIGZuKSB7XG4gICAgICB2YXIgcXVlcnkgPSBudWxsO1xuICAgICAgdGhpcy5kb0dldChVcmxIZWxwZXJzLmpvaW4oXCJjb21taXRUcmVlXCIsIGNvbW1pdElkKSwgcXVlcnksXG4gICAgICAgIChkYXRhLCBzdGF0dXMsIGhlYWRlcnMsIGNvbmZpZykgPT4ge1xuICAgICAgICAgIGZuKGRhdGEpO1xuICAgICAgICB9KTtcbiAgICB9XG5cblxuICAgIC8qKlxuICAgICAqIFBlcmZvcm1zIGEgZGlmZiBvbiB0aGUgdmVyc2lvbnNcbiAgICAgKiBAbWV0aG9kIGRpZmZcbiAgICAgKiBAZm9yIEdpdFdpa2lSZXBvc2l0b3J5XG4gICAgICogQHBhcmFtIHtTdHJpbmd9IG9iamVjdElkXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IGJhc2VPYmplY3RJZFxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gZm5cbiAgICAgKiBAcmV0dXJuIHthbnl9XG4gICAgICovXG4gICAgcHVibGljIGRpZmYob2JqZWN0SWQ6c3RyaW5nLCBiYXNlT2JqZWN0SWQ6c3RyaW5nLCBwYXRoOnN0cmluZywgZm4pIHtcbiAgICAgIHZhciBxdWVyeSA9IG51bGw7XG4gICAgICB2YXIgY29uZmlnOiBhbnkgPSBGb3JnZS5jcmVhdGVIdHRwQ29uZmlnKCk7XG4gICAgICBjb25maWcudHJhbnNmb3JtUmVzcG9uc2UgPSAoZGF0YSwgaGVhZGVyc0dldHRlciwgc3RhdHVzKSA9PiB7XG4gICAgICAgIGxvZy5pbmZvKFwiZ290IGRpZmYgZGF0YTogXCIgKyBkYXRhKTtcbiAgICAgICAgcmV0dXJuIGRhdGE7XG4gICAgICB9O1xuICAgICAgdGhpcy5kb0dldChVcmxIZWxwZXJzLmpvaW4oXCJkaWZmXCIsIG9iamVjdElkLCBiYXNlT2JqZWN0SWQsIHBhdGgpLCBxdWVyeSxcbiAgICAgICAgKGRhdGEsIHN0YXR1cywgaGVhZGVycywgY29uZmlnKSA9PiB7XG4gICAgICAgICAgdmFyIGRldGFpbHMgPSB7XG4gICAgICAgICAgICB0ZXh0OiBkYXRhLFxuICAgICAgICAgICAgZm9ybWF0OiBcImRpZmZcIixcbiAgICAgICAgICAgIGRpcmVjdG9yeTogZmFsc2VcbiAgICAgICAgICB9O1xuICAgICAgICAgIGZuKGRldGFpbHMpO1xuICAgICAgICB9LFxuICAgICAgICBudWxsLCBjb25maWcpO1xuICAgIH1cblxuXG4gICAgLyoqXG4gICAgICogR2V0IHRoZSBsaXN0IG9mIGJyYW5jaGVzXG4gICAgICogQG1ldGhvZCBicmFuY2hlc1xuICAgICAqIEBmb3IgR2l0V2lraVJlcG9zaXRvcnlcbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBmblxuICAgICAqIEByZXR1cm4ge2FueX1cbiAgICAgKi9cbiAgICBwdWJsaWMgYnJhbmNoZXMoZm4pIHtcbiAgICAgIHZhciBxdWVyeSA9IG51bGw7XG4gICAgICB0aGlzLmRvR2V0KFwibGlzdEJyYW5jaGVzXCIsIHF1ZXJ5LFxuICAgICAgICAoZGF0YSwgc3RhdHVzLCBoZWFkZXJzLCBjb25maWcpID0+IHtcbiAgICAgICAgICBmbihkYXRhKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcHVibGljIGV4aXN0cyhicmFuY2g6c3RyaW5nLCBwYXRoOnN0cmluZywgZm4pOiBCb29sZWFuIHtcbiAgICAgIHZhciBhbnN3ZXIgPSBmYWxzZTtcbiAgICAgIHRoaXMuZ2V0UGFnZShicmFuY2gsIHBhdGgsIG51bGwsIChkYXRhKSA9PiB7XG4gICAgICAgIGlmIChkYXRhLmRpcmVjdG9yeSkge1xuICAgICAgICAgIGlmIChkYXRhLmNoaWxkcmVuLmxlbmd0aCkge1xuICAgICAgICAgICAgYW5zd2VyID0gdHJ1ZTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgYW5zd2VyID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICBsb2cuaW5mbyhcImV4aXN0cyBcIiArIHBhdGggKyBcIiBhbnN3ZXIgPSBcIiArIGFuc3dlcik7XG4gICAgICAgIGlmIChhbmd1bGFyLmlzRnVuY3Rpb24oZm4pKSB7XG4gICAgICAgICAgZm4oYW5zd2VyKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICByZXR1cm4gYW5zd2VyO1xuICAgIH1cblxuICAgIHB1YmxpYyByZXZlcnRUbyhicmFuY2g6c3RyaW5nLCBvYmplY3RJZDpzdHJpbmcsIGJsb2JQYXRoOnN0cmluZywgY29tbWl0TWVzc2FnZTpzdHJpbmcsIGZuKSB7XG4gICAgICBpZiAoIWNvbW1pdE1lc3NhZ2UpIHtcbiAgICAgICAgY29tbWl0TWVzc2FnZSA9IFwiUmV2ZXJ0aW5nIFwiICsgYmxvYlBhdGggKyBcIiBjb21taXQgXCIgKyAob2JqZWN0SWQgfHwgYnJhbmNoKTtcbiAgICAgIH1cbiAgICAgIHZhciBxdWVyeSA9IG51bGw7XG4gICAgICBpZiAoYnJhbmNoKSB7XG4gICAgICAgIHF1ZXJ5ID0gXCJyZWY9XCIgKyBicmFuY2g7XG4gICAgICB9XG4gICAgICBpZiAoY29tbWl0TWVzc2FnZSkge1xuICAgICAgICBxdWVyeSA9IChxdWVyeSA/IHF1ZXJ5ICsgXCImXCIgOiBcIlwiKSArIFwibWVzc2FnZT1cIiArIGVuY29kZVVSSUNvbXBvbmVudChjb21taXRNZXNzYWdlKTtcbiAgICAgIH1cbiAgICAgIHZhciBib2R5ID0gXCJcIjtcbiAgICAgIHRoaXMuZG9Qb3N0KFVybEhlbHBlcnMuam9pbihcInJldmVydFwiLCBvYmplY3RJZCwgYmxvYlBhdGggfHwgXCIvXCIpLCBxdWVyeSwgYm9keSxcbiAgICAgICAgKGRhdGEsIHN0YXR1cywgaGVhZGVycywgY29uZmlnKSA9PiB7XG4gICAgICAgICAgZm4oZGF0YSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHB1YmxpYyByZW5hbWUoYnJhbmNoOnN0cmluZywgb2xkUGF0aDpzdHJpbmcsICBuZXdQYXRoOnN0cmluZywgY29tbWl0TWVzc2FnZTpzdHJpbmcsIGZuKSB7XG4gICAgICBpZiAoIWNvbW1pdE1lc3NhZ2UpIHtcbiAgICAgICAgY29tbWl0TWVzc2FnZSA9IFwiUmVuYW1pbmcgcGFnZSBcIiArIG9sZFBhdGggKyBcIiB0byBcIiArIG5ld1BhdGg7XG4gICAgICB9XG4gICAgICB2YXIgcXVlcnkgPSBudWxsO1xuICAgICAgaWYgKGJyYW5jaCkge1xuICAgICAgICBxdWVyeSA9IFwicmVmPVwiICsgYnJhbmNoO1xuICAgICAgfVxuICAgICAgaWYgKGNvbW1pdE1lc3NhZ2UpIHtcbiAgICAgICAgcXVlcnkgPSAocXVlcnkgPyBxdWVyeSArIFwiJlwiIDogXCJcIikgKyBcIm1lc3NhZ2U9XCIgKyBlbmNvZGVVUklDb21wb25lbnQoY29tbWl0TWVzc2FnZSk7XG4gICAgICB9XG4gICAgICBpZiAob2xkUGF0aCkge1xuICAgICAgICBxdWVyeSA9IChxdWVyeSA/IHF1ZXJ5ICsgXCImXCIgOiBcIlwiKSArIFwib2xkPVwiICsgZW5jb2RlVVJJQ29tcG9uZW50KG9sZFBhdGgpO1xuICAgICAgfVxuICAgICAgdmFyIGJvZHkgPSBcIlwiO1xuICAgICAgdGhpcy5kb1Bvc3QoVXJsSGVscGVycy5qb2luKFwibXZcIiwgbmV3UGF0aCB8fCBcIi9cIiksIHF1ZXJ5LCBib2R5LFxuICAgICAgICAoZGF0YSwgc3RhdHVzLCBoZWFkZXJzLCBjb25maWcpID0+IHtcbiAgICAgICAgICBmbihkYXRhKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcHVibGljIHJlbW92ZVBhZ2UoYnJhbmNoOnN0cmluZywgcGF0aDpzdHJpbmcsIGNvbW1pdE1lc3NhZ2U6c3RyaW5nLCBmbikge1xuICAgICAgaWYgKCFjb21taXRNZXNzYWdlKSB7XG4gICAgICAgIGNvbW1pdE1lc3NhZ2UgPSBcIlJlbW92aW5nIHBhZ2UgXCIgKyBwYXRoO1xuICAgICAgfVxuICAgICAgdmFyIHF1ZXJ5ID0gbnVsbDtcbiAgICAgIGlmIChicmFuY2gpIHtcbiAgICAgICAgcXVlcnkgPSBcInJlZj1cIiArIGJyYW5jaDtcbiAgICAgIH1cbiAgICAgIGlmIChjb21taXRNZXNzYWdlKSB7XG4gICAgICAgIHF1ZXJ5ID0gKHF1ZXJ5ID8gcXVlcnkgKyBcIiZcIiA6IFwiXCIpICsgXCJtZXNzYWdlPVwiICsgZW5jb2RlVVJJQ29tcG9uZW50KGNvbW1pdE1lc3NhZ2UpO1xuICAgICAgfVxuICAgICAgdmFyIGJvZHkgPSBcIlwiO1xuICAgICAgdGhpcy5kb1Bvc3QoVXJsSGVscGVycy5qb2luKFwicm1cIiwgcGF0aCB8fCBcIi9cIiksIHF1ZXJ5LCBib2R5LFxuICAgICAgICAoZGF0YSwgc3RhdHVzLCBoZWFkZXJzLCBjb25maWcpID0+IHtcbiAgICAgICAgICBmbihkYXRhKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcHVibGljIHJlbW92ZVBhZ2VzKGJyYW5jaDpzdHJpbmcsIHBhdGhzOkFycmF5PHN0cmluZz4sIGNvbW1pdE1lc3NhZ2U6c3RyaW5nLCBmbikge1xuICAgICAgaWYgKCFjb21taXRNZXNzYWdlKSB7XG4gICAgICAgIGNvbW1pdE1lc3NhZ2UgPSBcIlJlbW92aW5nIHBhZ2VcIiArIChwYXRocy5sZW5ndGggPiAxID8gXCJzXCIgOiBcIlwiKSArIFwiIFwiICsgcGF0aHMuam9pbihcIiwgXCIpO1xuICAgICAgfVxuICAgICAgdmFyIHF1ZXJ5ID0gbnVsbDtcbiAgICAgIGlmIChicmFuY2gpIHtcbiAgICAgICAgcXVlcnkgPSBcInJlZj1cIiArIGJyYW5jaDtcbiAgICAgIH1cbiAgICAgIGlmIChjb21taXRNZXNzYWdlKSB7XG4gICAgICAgIHF1ZXJ5ID0gKHF1ZXJ5ID8gcXVlcnkgKyBcIiZcIiA6IFwiXCIpICsgXCJtZXNzYWdlPVwiICsgZW5jb2RlVVJJQ29tcG9uZW50KGNvbW1pdE1lc3NhZ2UpO1xuICAgICAgfVxuICAgICAgdmFyIGJvZHkgPSBwYXRocztcbiAgICAgIHRoaXMuZG9Qb3N0KFVybEhlbHBlcnMuam9pbihcInJtXCIpLCBxdWVyeSwgYm9keSxcbiAgICAgICAgKGRhdGEsIHN0YXR1cywgaGVhZGVycywgY29uZmlnKSA9PiB7XG4gICAgICAgICAgZm4oZGF0YSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuXG5cbiAgICBwcml2YXRlIGRvR2V0KHBhdGgsIHF1ZXJ5LCBzdWNjZXNzRm4sIGVycm9yRm4gPSBudWxsLCBjb25maWcgPSBudWxsKSB7XG4gICAgICB2YXIgdXJsID0gRm9yZ2UuY3JlYXRlSHR0cFVybChVcmxIZWxwZXJzLmpvaW4odGhpcy5iYXNlVXJsLCBwYXRoKSk7XG4gICAgICBpZiAocXVlcnkpIHtcbiAgICAgICAgdXJsICs9IFwiJlwiICsgcXVlcnk7XG4gICAgICB9XG4gICAgICBpZiAoIWVycm9yRm4pIHtcbiAgICAgICAgZXJyb3JGbiA9IChkYXRhLCBzdGF0dXMsIGhlYWRlcnMsIGNvbmZpZykgPT4ge1xuICAgICAgICAgIGxvZy53YXJuKFwiZmFpbGVkIHRvIGxvYWQhIFwiICsgdXJsICsgXCIuIHN0YXR1czogXCIgKyBzdGF0dXMgKyBcIiBkYXRhOiBcIiArIGRhdGEpO1xuICAgICAgICB9O1xuXG4gICAgICB9XG4gICAgICBpZiAoIWNvbmZpZykge1xuICAgICAgICBjb25maWcgPSB0aGlzLmNvbmZpZztcbiAgICAgIH1cbiAgICAgIHRoaXMuJGh0dHAuZ2V0KHVybCwgY29uZmlnKS5cbiAgICAgICAgc3VjY2VzcyhzdWNjZXNzRm4pLlxuICAgICAgICBlcnJvcihlcnJvckZuKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGRvUG9zdChwYXRoLCBxdWVyeSwgYm9keSwgc3VjY2Vzc0ZuLCBlcnJvckZuID0gbnVsbCkge1xuICAgICAgdmFyIHVybCA9IEZvcmdlLmNyZWF0ZUh0dHBVcmwoVXJsSGVscGVycy5qb2luKHRoaXMuYmFzZVVybCwgcGF0aCkpO1xuICAgICAgaWYgKHF1ZXJ5KSB7XG4gICAgICAgIHVybCArPSBcIiZcIiArIHF1ZXJ5O1xuICAgICAgfVxuICAgICAgaWYgKCFlcnJvckZuKSB7XG4gICAgICAgIGVycm9yRm4gPSAoZGF0YSwgc3RhdHVzLCBoZWFkZXJzLCBjb25maWcpID0+IHtcbiAgICAgICAgICBsb2cud2FybihcImZhaWxlZCB0byBsb2FkISBcIiArIHVybCArIFwiLiBzdGF0dXM6IFwiICsgc3RhdHVzICsgXCIgZGF0YTogXCIgKyBkYXRhKTtcbiAgICAgICAgfTtcblxuICAgICAgfVxuICAgICAgdGhpcy4kaHR0cC5wb3N0KHVybCwgYm9keSwgdGhpcy5jb25maWcpLlxuICAgICAgICBzdWNjZXNzKHN1Y2Nlc3NGbikuXG4gICAgICAgIGVycm9yKGVycm9yRm4pO1xuICAgIH1cblxuXG4gICAgcHJpdmF0ZSBkb1Bvc3RGb3JtKHBhdGgsIHF1ZXJ5LCBib2R5LCBzdWNjZXNzRm4sIGVycm9yRm4gPSBudWxsKSB7XG4gICAgICB2YXIgdXJsID0gRm9yZ2UuY3JlYXRlSHR0cFVybChVcmxIZWxwZXJzLmpvaW4odGhpcy5iYXNlVXJsLCBwYXRoKSk7XG4gICAgICBpZiAocXVlcnkpIHtcbiAgICAgICAgdXJsICs9IFwiJlwiICsgcXVlcnk7XG4gICAgICB9XG4gICAgICBpZiAoIWVycm9yRm4pIHtcbiAgICAgICAgZXJyb3JGbiA9IChkYXRhLCBzdGF0dXMsIGhlYWRlcnMsIGNvbmZpZykgPT4ge1xuICAgICAgICAgIGxvZy53YXJuKFwiZmFpbGVkIHRvIGxvYWQhIFwiICsgdXJsICsgXCIuIHN0YXR1czogXCIgKyBzdGF0dXMgKyBcIiBkYXRhOiBcIiArIGRhdGEpO1xuICAgICAgICB9O1xuXG4gICAgICB9XG4gICAgICB2YXIgY29uZmlnID0gRm9yZ2UuY3JlYXRlSHR0cENvbmZpZygpO1xuICAgICAgaWYgKCFjb25maWcuaGVhZGVycykge1xuICAgICAgICBjb25maWcuaGVhZGVycyA9IHt9O1xuICAgICAgfVxuICAgICAgY29uZmlnLmhlYWRlcnNbXCJDb250ZW50LVR5cGVcIl0gPSBcImFwcGxpY2F0aW9uL3gtd3d3LWZvcm0tdXJsZW5jb2RlZDsgY2hhcnNldD11dGYtOFwiO1xuXG4gICAgICB0aGlzLiRodHRwLnBvc3QodXJsLCBib2R5LCBjb25maWcpLlxuICAgICAgICBzdWNjZXNzKHN1Y2Nlc3NGbikuXG4gICAgICAgIGVycm9yKGVycm9yRm4pO1xuICAgIH1cblxuXG5cbiAgICBwdWJsaWMgY29tcGxldGVQYXRoKGJyYW5jaDpzdHJpbmcsIGNvbXBsZXRpb25UZXh0OnN0cmluZywgZGlyZWN0b3JpZXNPbmx5OmJvb2xlYW4sIGZuKSB7XG4vKlxuICAgICAgcmV0dXJuIHRoaXMuZ2l0KCkuY29tcGxldGVQYXRoKGJyYW5jaCwgY29tcGxldGlvblRleHQsIGRpcmVjdG9yaWVzT25seSwgZm4pO1xuKi9cbiAgICB9XG5cblxuICAgIC8qKlxuICAgICAqIFJldHVybnMgdGhlIGZ1bGwgcGF0aCB0byB1c2UgaW4gdGhlIGdpdCByZXBvXG4gICAgICogQG1ldGhvZCBnZXRQYXRoXG4gICAgICogQGZvciBHaXRXaWtpUmVwb3NpdG9yeVxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoXG4gICAgICogQHJldHVybiB7U3RyaW5ne1xuICAgICAqL1xuICAgIHB1YmxpYyBnZXRQYXRoKHBhdGg6c3RyaW5nKSB7XG4gICAgICB2YXIgZGlyZWN0b3J5UHJlZml4ID0gdGhpcy5kaXJlY3RvcnlQcmVmaXg7XG4gICAgICByZXR1cm4gKGRpcmVjdG9yeVByZWZpeCkgPyBkaXJlY3RvcnlQcmVmaXggKyBwYXRoIDogcGF0aDtcbiAgICB9XG5cbiAgICBwdWJsaWMgZ2V0TG9nUGF0aChwYXRoOnN0cmluZykge1xuICAgICAgcmV0dXJuIENvcmUudHJpbUxlYWRpbmcodGhpcy5nZXRQYXRoKHBhdGgpLCBcIi9cIik7XG4gICAgfVxuXG5cbiAgICAvKipcbiAgICAgKiBHZXQgdGhlIGNvbnRlbnRzIG9mIGEgYmxvYlBhdGggZm9yIGEgZ2l2ZW4gY29tbWl0IG9iamVjdElkXG4gICAgICogQG1ldGhvZCBnZXRDb250ZW50XG4gICAgICogQGZvciBHaXRXaWtpUmVwb3NpdG9yeVxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBvYmplY3RJZFxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBibG9iUGF0aFxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGZuXG4gICAgICogQHJldHVybiB7YW55fVxuICAgICAqL1xuICAgIHB1YmxpYyBnZXRDb250ZW50KG9iamVjdElkOnN0cmluZywgYmxvYlBhdGg6c3RyaW5nLCBmbikge1xuLypcbiAgICAgIHZhciBmdWxsUGF0aCA9IHRoaXMuZ2V0TG9nUGF0aChibG9iUGF0aCk7XG4gICAgICB2YXIgZ2l0ID0gdGhpcy5naXQoKTtcbiAgICAgIGlmIChnaXQpIHtcbiAgICAgICAgZ2l0LmdldENvbnRlbnQob2JqZWN0SWQsIGZ1bGxQYXRoLCBmbik7XG4gICAgICB9XG4gICAgICByZXR1cm4gZ2l0O1xuKi9cbiAgICB9XG5cblxuXG4gICAgLyoqXG4gICAgICogR2V0IHRoZSBKU09OIGNvbnRlbnRzIG9mIHRoZSBwYXRoIHdpdGggb3B0aW9uYWwgbmFtZSB3aWxkY2FyZCBhbmQgc2VhcmNoXG4gICAgICogQG1ldGhvZCBqc29uQ2hpbGRDb250ZW50c1xuICAgICAqIEBmb3IgR2l0V2lraVJlcG9zaXRvcnlcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gcGF0aFxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBuYW1lV2lsZGNhcmRcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gc2VhcmNoXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gZm5cbiAgICAgKiBAcmV0dXJuIHthbnl9XG4gICAgICovXG4gICAgcHVibGljIGpzb25DaGlsZENvbnRlbnRzKHBhdGg6c3RyaW5nLCBuYW1lV2lsZGNhcmQ6c3RyaW5nLCBzZWFyY2g6c3RyaW5nLCBmbikge1xuLypcbiAgICAgIHZhciBmdWxsUGF0aCA9IHRoaXMuZ2V0TG9nUGF0aChwYXRoKTtcbiAgICAgIHZhciBnaXQgPSB0aGlzLmdpdCgpO1xuICAgICAgaWYgKGdpdCkge1xuICAgICAgICBnaXQucmVhZEpzb25DaGlsZENvbnRlbnQoZnVsbFBhdGgsIG5hbWVXaWxkY2FyZCwgc2VhcmNoLCBmbik7XG4gICAgICB9XG4gICAgICByZXR1cm4gZ2l0O1xuKi9cbiAgICB9XG5cblxuICAgIHB1YmxpYyBnaXQoKSB7XG4vKlxuICAgICAgdmFyIHJlcG9zaXRvcnkgPSB0aGlzLmZhY3RvcnlNZXRob2QoKTtcbiAgICAgIGlmICghcmVwb3NpdG9yeSkge1xuICAgICAgICBjb25zb2xlLmxvZyhcIk5vIHJlcG9zaXRvcnkgeWV0ISBUT0RPIHdlIHNob3VsZCB1c2UgYSBsb2NhbCBpbXBsIVwiKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiByZXBvc2l0b3J5O1xuKi9cbiAgICB9XG4gIH1cbn1cbiIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9pbmNsdWRlcy50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJ3aWtpSGVscGVycy50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJ3aWtpUGx1Z2luLnRzXCIvPlxuXG5tb2R1bGUgV2lraSB7XG5cbiAgZXhwb3J0IHZhciBUb3BMZXZlbENvbnRyb2xsZXIgPSBfbW9kdWxlLmNvbnRyb2xsZXIoXCJXaWtpLlRvcExldmVsQ29udHJvbGxlclwiLCBbJyRzY29wZScsICckcm91dGUnLCAnJHJvdXRlUGFyYW1zJywgKCRzY29wZSwgJHJvdXRlLCAkcm91dGVQYXJhbXMpID0+IHtcblxuICB9XSk7XG5cbn1cbiIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9pbmNsdWRlcy50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJmb3JnZUhlbHBlcnMudHNcIi8+XG5cbm1vZHVsZSBGb3JnZSB7XG5cbiAgZXhwb3J0IHZhciBfbW9kdWxlID0gYW5ndWxhci5tb2R1bGUocGx1Z2luTmFtZSwgWydoYXd0aW8tY29yZScsICdoYXd0aW8tdWknXSk7XG4gIGV4cG9ydCB2YXIgY29udHJvbGxlciA9IFBsdWdpbkhlbHBlcnMuY3JlYXRlQ29udHJvbGxlckZ1bmN0aW9uKF9tb2R1bGUsIHBsdWdpbk5hbWUpO1xuICBleHBvcnQgdmFyIHJvdXRlID0gUGx1Z2luSGVscGVycy5jcmVhdGVSb3V0aW5nRnVuY3Rpb24odGVtcGxhdGVQYXRoKTtcblxuICBfbW9kdWxlLmNvbmZpZyhbJyRyb3V0ZVByb3ZpZGVyJywgKCRyb3V0ZVByb3ZpZGVyOm5nLnJvdXRlLklSb3V0ZVByb3ZpZGVyKSA9PiB7XG5cbiAgICBjb25zb2xlLmxvZyhcIkxpc3RlbmluZyBvbjogXCIgKyBVcmxIZWxwZXJzLmpvaW4oY29udGV4dCwgJy9jcmVhdGVQcm9qZWN0JykpO1xuXG4gICAgJHJvdXRlUHJvdmlkZXIud2hlbihVcmxIZWxwZXJzLmpvaW4oY29udGV4dCwgJy9jcmVhdGVQcm9qZWN0JyksIHJvdXRlKCdjcmVhdGVQcm9qZWN0Lmh0bWwnLCBmYWxzZSkpXG4gICAgICAud2hlbihVcmxIZWxwZXJzLmpvaW4oY29udGV4dCwgJy9yZXBvcy86cGF0aConKSwgcm91dGUoJ3JlcG8uaHRtbCcsIGZhbHNlKSlcbiAgICAgIC53aGVuKFVybEhlbHBlcnMuam9pbihjb250ZXh0LCAnL3JlcG9zJyksIHJvdXRlKCdyZXBvcy5odG1sJywgZmFsc2UpKTtcblxuICAgIGFuZ3VsYXIuZm9yRWFjaChbY29udGV4dCwgJy93b3Jrc3BhY2VzLzpuYW1lc3BhY2UvcHJvamVjdHMvOnByb2plY3QvZm9yZ2UnXSwgKHBhdGgpID0+IHtcbiAgICAgICRyb3V0ZVByb3ZpZGVyXG4gICAgICAgIC53aGVuKFVybEhlbHBlcnMuam9pbihwYXRoLCAnL2NvbW1hbmRzJyksIHJvdXRlKCdjb21tYW5kcy5odG1sJywgZmFsc2UpKVxuICAgICAgICAud2hlbihVcmxIZWxwZXJzLmpvaW4ocGF0aCwgJy9jb21tYW5kcy86cGF0aConKSwgcm91dGUoJ2NvbW1hbmRzLmh0bWwnLCBmYWxzZSkpXG4gICAgICAgIC53aGVuKFVybEhlbHBlcnMuam9pbihwYXRoLCAnL2NvbW1hbmQvOmlkJyksIHJvdXRlKCdjb21tYW5kLmh0bWwnLCBmYWxzZSkpXG4gICAgICAgIC53aGVuKFVybEhlbHBlcnMuam9pbihwYXRoLCAnL2NvbW1hbmQvOmlkLzpwYXRoKicpLCByb3V0ZSgnY29tbWFuZC5odG1sJywgZmFsc2UpKTtcbiAgICB9KTtcblxuICB9XSk7XG5cbiAgX21vZHVsZS5mYWN0b3J5KCdGb3JnZUFwaVVSTCcsIFsnJHEnLCAnJHJvb3RTY29wZScsICgkcTpuZy5JUVNlcnZpY2UsICRyb290U2NvcGU6bmcuSVJvb3RTY29wZVNlcnZpY2UpID0+IHtcbiAgICByZXR1cm4gS3ViZXJuZXRlcy5rdWJlcm5ldGVzQXBpVXJsKCkgKyBcIi9wcm94eVwiICsgS3ViZXJuZXRlcy5rdWJlcm5ldGVzTmFtZXNwYWNlUGF0aCgpICsgXCIvc2VydmljZXMvZmFicmljOC1mb3JnZS9hcGkvZm9yZ2VcIjtcbiAgfV0pO1xuXG5cbiAgX21vZHVsZS5mYWN0b3J5KCdGb3JnZU1vZGVsJywgWyckcScsICckcm9vdFNjb3BlJywgKCRxOm5nLklRU2VydmljZSwgJHJvb3RTY29wZTpuZy5JUm9vdFNjb3BlU2VydmljZSkgPT4ge1xuICAgIHJldHVybiB7XG4gICAgICByb290UHJvamVjdDoge30sXG4gICAgICBwcm9qZWN0czogW11cbiAgICB9XG4gIH1dKTtcblxuICBfbW9kdWxlLnJ1bihbJ3ZpZXdSZWdpc3RyeScsICdIYXd0aW9OYXYnLCAodmlld1JlZ2lzdHJ5LCBIYXd0aW9OYXYpID0+IHtcbiAgICB2aWV3UmVnaXN0cnlbJ2ZvcmdlJ10gPSB0ZW1wbGF0ZVBhdGggKyAnbGF5b3V0Rm9yZ2UuaHRtbCc7XG4gIH1dKTtcblxuICBoYXd0aW9QbHVnaW5Mb2FkZXIuYWRkTW9kdWxlKHBsdWdpbk5hbWUpO1xufVxuIiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL2luY2x1ZGVzLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cImZvcmdlSGVscGVycy50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJmb3JnZVBsdWdpbi50c1wiLz5cblxubW9kdWxlIEZvcmdlIHtcblxuICBleHBvcnQgdmFyIENvbW1hbmRDb250cm9sbGVyID0gY29udHJvbGxlcihcIkNvbW1hbmRDb250cm9sbGVyXCIsXG4gICAgW1wiJHNjb3BlXCIsIFwiJHRlbXBsYXRlQ2FjaGVcIiwgXCIkbG9jYXRpb25cIiwgXCIkcm91dGVQYXJhbXNcIiwgXCIkaHR0cFwiLCBcIiR0aW1lb3V0XCIsIFwiRm9yZ2VBcGlVUkxcIiwgXCJGb3JnZU1vZGVsXCIsXG4gICAgICAoJHNjb3BlLCAkdGVtcGxhdGVDYWNoZTpuZy5JVGVtcGxhdGVDYWNoZVNlcnZpY2UsICRsb2NhdGlvbjpuZy5JTG9jYXRpb25TZXJ2aWNlLCAkcm91dGVQYXJhbXMsICRodHRwLCAkdGltZW91dCwgRm9yZ2VBcGlVUkwsIEZvcmdlTW9kZWwpID0+IHtcblxuICAgICAgICAkc2NvcGUubW9kZWwgPSBGb3JnZU1vZGVsO1xuXG4gICAgICAgICRzY29wZS5yZXNvdXJjZVBhdGggPSAkcm91dGVQYXJhbXNbXCJwYXRoXCJdIHx8ICRsb2NhdGlvbi5zZWFyY2goKVtcInBhdGhcIl0gfHwgXCJcIjtcbiAgICAgICAgJHNjb3BlLmlkID0gJHJvdXRlUGFyYW1zW1wiaWRcIl07XG4gICAgICAgICRzY29wZS5wYXRoID0gJHJvdXRlUGFyYW1zW1wicGF0aFwiXTtcblxuICAgICAgICAkc2NvcGUuYXZhdGFyX3VybCA9IGxvY2FsU3RvcmFnZVtcImdvZ3NBdmF0YXJVcmxcIl07XG4gICAgICAgICRzY29wZS51c2VyID0gbG9jYWxTdG9yYWdlW1wiZ29nc1VzZXJcIl07XG4gICAgICAgICRzY29wZS5yZXBvTmFtZSA9IFwiXCI7XG4gICAgICAgIHZhciBwYXRoU3RlcHMgPSAkc2NvcGUucmVzb3VyY2VQYXRoLnNwbGl0KFwiL1wiKTtcbiAgICAgICAgaWYgKHBhdGhTdGVwcyAmJiBwYXRoU3RlcHMubGVuZ3RoKSB7XG4gICAgICAgICAgJHNjb3BlLnJlcG9OYW1lID0gcGF0aFN0ZXBzW3BhdGhTdGVwcy5sZW5ndGggLSAxXTtcbiAgICAgICAgfVxuXG5cbiAgICAgICAgaW5pdFNjb3BlKCRzY29wZSwgJGxvY2F0aW9uLCAkcm91dGVQYXJhbXMpO1xuICAgICAgICByZWRpcmVjdFRvR29nc0xvZ2luSWZSZXF1aXJlZCgkc2NvcGUsICRsb2NhdGlvbik7XG5cbiAgICAgICAgJHNjb3BlLiRjb21wbGV0ZUxpbmsgPSAkc2NvcGUuJHByb2plY3RMaW5rO1xuICAgICAgICBpZiAoJHNjb3BlLnByb2plY3RJZCkge1xuXG4gICAgICAgIH1cbiAgICAgICAgJHNjb3BlLmNvbW1hbmRzTGluayA9IGNvbW1hbmRzTGluaygkc2NvcGUucmVzb3VyY2VQYXRoLCAkc2NvcGUucHJvamVjdElkKTtcbiAgICAgICAgJHNjb3BlLmNvbXBsZXRlZExpbmsgPSAkc2NvcGUucHJvamVjdElkID8gVXJsSGVscGVycy5qb2luKCRzY29wZS4kcHJvamVjdExpbmssIFwiZW52aXJvbm1lbnRzXCIpIDogJHNjb3BlLiRwcm9qZWN0TGluaztcblxuICAgICAgICAkc2NvcGUuZW50aXR5ID0ge1xuICAgICAgICB9O1xuICAgICAgICAkc2NvcGUuaW5wdXRMaXN0ID0gWyRzY29wZS5lbnRpdHldO1xuXG4gICAgICAgICRzY29wZS5zY2hlbWEgPSBnZXRNb2RlbENvbW1hbmRJbnB1dHMoRm9yZ2VNb2RlbCwgJHNjb3BlLnJlc291cmNlUGF0aCwgJHNjb3BlLmlkKTtcbiAgICAgICAgb25TY2hlbWFMb2FkKCk7XG5cbiAgICAgICAgZnVuY3Rpb24gb25Sb3V0ZUNoYW5nZWQoKSB7XG4gICAgICAgICAgY29uc29sZS5sb2coXCJyb3V0ZSB1cGRhdGVkOyBsZXRzIGNsZWFyIHRoZSBlbnRpdHlcIik7XG4gICAgICAgICAgJHNjb3BlLmVudGl0eSA9IHtcbiAgICAgICAgICB9O1xuICAgICAgICAgICRzY29wZS5pbnB1dExpc3QgPSBbJHNjb3BlLmVudGl0eV07XG4gICAgICAgICAgJHNjb3BlLnByZXZpb3VzU2NoZW1hSnNvbiA9IFwiXCI7XG4gICAgICAgICAgJHNjb3BlLnNjaGVtYSA9IG51bGw7XG4gICAgICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICAgICAgICB1cGRhdGVEYXRhKCk7XG4gICAgICAgIH1cblxuICAgICAgICAkc2NvcGUuJG9uKCckcm91dGVDaGFuZ2VTdWNjZXNzJywgb25Sb3V0ZUNoYW5nZWQpO1xuXG4gICAgICAgICRzY29wZS5leGVjdXRlID0gKCkgPT4ge1xuICAgICAgICAgIC8vIFRPRE8gY2hlY2sgaWYgdmFsaWQuLi5cbiAgICAgICAgICAkc2NvcGUucmVzcG9uc2UgPSBudWxsO1xuICAgICAgICAgICRzY29wZS5leGVjdXRpbmcgPSB0cnVlO1xuICAgICAgICAgICRzY29wZS5pbnZhbGlkID0gZmFsc2U7XG4gICAgICAgICAgJHNjb3BlLnZhbGlkYXRpb25FcnJvciA9IG51bGw7XG4gICAgICAgICAgdmFyIGNvbW1hbmRJZCA9ICRzY29wZS5pZDtcbiAgICAgICAgICB2YXIgcmVzb3VyY2VQYXRoID0gJHNjb3BlLnJlc291cmNlUGF0aDtcbiAgICAgICAgICB2YXIgdXJsID0gZXhlY3V0ZUNvbW1hbmRBcGlVcmwoRm9yZ2VBcGlVUkwsIGNvbW1hbmRJZCk7XG4gICAgICAgICAgdmFyIHJlcXVlc3QgPSB7XG4gICAgICAgICAgICByZXNvdXJjZTogcmVzb3VyY2VQYXRoLFxuICAgICAgICAgICAgaW5wdXRMaXN0OiAkc2NvcGUuaW5wdXRMaXN0XG4gICAgICAgICAgfTtcbiAgICAgICAgICB1cmwgPSBjcmVhdGVIdHRwVXJsKHVybCk7XG4gICAgICAgICAgbG9nLmluZm8oXCJBYm91dCB0byBwb3N0IHRvIFwiICsgdXJsICsgXCIgcGF5bG9hZDogXCIgKyBhbmd1bGFyLnRvSnNvbihyZXF1ZXN0KSk7XG4gICAgICAgICAgJGh0dHAucG9zdCh1cmwsIHJlcXVlc3QsIGNyZWF0ZUh0dHBDb25maWcoKSkuXG4gICAgICAgICAgICBzdWNjZXNzKGZ1bmN0aW9uIChkYXRhLCBzdGF0dXMsIGhlYWRlcnMsIGNvbmZpZykge1xuICAgICAgICAgICAgICAkc2NvcGUuZXhlY3V0aW5nID0gZmFsc2U7XG4gICAgICAgICAgICAgICRzY29wZS5pbnZhbGlkID0gZmFsc2U7XG4gICAgICAgICAgICAgICRzY29wZS52YWxpZGF0aW9uRXJyb3IgPSBudWxsO1xuICAgICAgICAgICAgICBpZiAoZGF0YSkge1xuICAgICAgICAgICAgICAgIGRhdGEubWVzc2FnZSA9IGRhdGEubWVzc2FnZSB8fCBkYXRhLm91dHB1dDtcbiAgICAgICAgICAgICAgICB2YXIgd2l6YXJkUmVzdWx0cyA9IGRhdGEud2l6YXJkUmVzdWx0cztcbiAgICAgICAgICAgICAgICBpZiAod2l6YXJkUmVzdWx0cykge1xuICAgICAgICAgICAgICAgICAgYW5ndWxhci5mb3JFYWNoKHdpemFyZFJlc3VsdHMuc3RlcFZhbGlkYXRpb25zLCAodmFsaWRhdGlvbikgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAoISRzY29wZS5pbnZhbGlkICYmICF2YWxpZGF0aW9uLnZhbGlkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgdmFyIG1lc3NhZ2VzID0gdmFsaWRhdGlvbi5tZXNzYWdlcyB8fCBbXTtcbiAgICAgICAgICAgICAgICAgICAgICBpZiAobWVzc2FnZXMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgbWVzc2FnZSA9IG1lc3NhZ2VzWzBdO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmludmFsaWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUudmFsaWRhdGlvbkVycm9yID0gbWVzc2FnZS5kZXNjcmlwdGlvbjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLnZhbGlkYXRpb25JbnB1dCA9IG1lc3NhZ2UuaW5wdXROYW1lO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICB2YXIgc3RlcElucHV0cyA9IHdpemFyZFJlc3VsdHMuc3RlcElucHV0cztcbiAgICAgICAgICAgICAgICAgIGlmIChzdGVwSW5wdXRzKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBzY2hlbWEgPSBfLmxhc3Qoc3RlcElucHV0cyk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChzY2hlbWEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuZW50aXR5ID0ge307XG4gICAgICAgICAgICAgICAgICAgICAgdXBkYXRlU2NoZW1hKHNjaGVtYSk7XG4gICAgICAgICAgICAgICAgICAgICAgLy8gbGV0cyBjb3B5IGFjcm9zcyBhbnkgZGVmYXVsdCB2YWx1ZXMgZnJvbSB0aGUgc2NoZW1hXG4gICAgICAgICAgICAgICAgICAgICAgYW5ndWxhci5mb3JFYWNoKHNjaGVtYVtcInByb3BlcnRpZXNcIl0sIChwcm9wZXJ0eSwgbmFtZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHZhbHVlID0gcHJvcGVydHkudmFsdWU7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgbG9nLmluZm8oXCJBZGRpbmcgZW50aXR5LlwiICsgbmFtZSArIFwiID0gXCIgKyB2YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5lbnRpdHlbbmFtZV0gPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuaW5wdXRMaXN0LnB1c2goJHNjb3BlLmVudGl0eSk7XG5cbiAgICAgICAgICAgICAgICAgICAgICBpZiAoZGF0YS5jYW5Nb3ZlVG9OZXh0U3RlcCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gbGV0cyBjbGVhciB0aGUgcmVzcG9uc2Ugd2UndmUgYW5vdGhlciB3aXphcmQgcGFnZSB0byBkb1xuICAgICAgICAgICAgICAgICAgICAgICAgZGF0YSA9IG51bGw7XG4gICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIG90aGVyd2lzZSBpbmRpY2F0ZSB0aGF0IHRoZSB3aXphcmQganVzdCBjb21wbGV0ZWQgYW5kIGxldHMgaGlkZSB0aGUgaW5wdXQgZm9ybVxuICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLndpemFyZENvbXBsZXRlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGlmICghJHNjb3BlLmludmFsaWQpIHtcbiAgICAgICAgICAgICAgICAkc2NvcGUucmVzcG9uc2UgPSBkYXRhO1xuICAgICAgICAgICAgICAgIHZhciBzdGF0dXMgPSAoKGRhdGEgfHwge30pLnN0YXR1cyB8fCBcIlwiKS50b1N0cmluZygpLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgICAgICAgICAgJHNjb3BlLnJlc3BvbnNlQ2xhc3MgPSB0b0JhY2tncm91bmRTdHlsZShzdGF0dXMpO1xuXG4gICAgICAgICAgICAgICAgdmFyIGZ1bGxOYW1lID0gKChkYXRhIHx8IHt9KS5vdXRwdXRQcm9wZXJ0aWVzIHx8IHt9KS5mdWxsTmFtZTtcbiAgICAgICAgICAgICAgICBpZiAoJHNjb3BlLnJlc3BvbnNlICYmIGZ1bGxOYW1lICYmICRzY29wZS5pZCA9PT0gJ3Byb2plY3QtbmV3Jykge1xuICAgICAgICAgICAgICAgICAgJHNjb3BlLnJlc3BvbnNlID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgIC8vIGxldHMgZm9yd2FyZCB0byB0aGUgZGV2b3BzIGVkaXQgcGFnZVxuICAgICAgICAgICAgICAgICAgdmFyIHByb2plY3RJZCA9IGZ1bGxOYW1lLnJlcGxhY2UoJy8nLCBcIi1cIik7XG4gICAgICAgICAgICAgICAgICB2YXIgZWRpdFBhdGggPSBVcmxIZWxwZXJzLmpvaW4oRGV2ZWxvcGVyLnByb2plY3RMaW5rKHByb2plY3RJZCksIFwiL2ZvcmdlL2NvbW1hbmQvZGV2b3BzLWVkaXQvdXNlclwiLCBmdWxsTmFtZSk7XG4gICAgICAgICAgICAgICAgICBsb2cuaW5mbyhcIk1vdmluZyB0byB0aGUgZGV2b3BzIGVkaXQgcGF0aDogXCIgKyBlZGl0UGF0aCk7XG4gICAgICAgICAgICAgICAgICAkbG9jYXRpb24ucGF0aChlZGl0UGF0aCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIENvcmUuJGFwcGx5KCRzY29wZSk7XG4gICAgICAgICAgICB9KS5cbiAgICAgICAgICAgIGVycm9yKGZ1bmN0aW9uIChkYXRhLCBzdGF0dXMsIGhlYWRlcnMsIGNvbmZpZykge1xuICAgICAgICAgICAgICAkc2NvcGUuZXhlY3V0aW5nID0gZmFsc2U7XG4gICAgICAgICAgICAgIGxvZy53YXJuKFwiRmFpbGVkIHRvIGxvYWQgXCIgKyB1cmwgKyBcIiBcIiArIGRhdGEgKyBcIiBcIiArIHN0YXR1cyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcblxuICAgICAgICAkc2NvcGUuJHdhdGNoQ29sbGVjdGlvbihcImVudGl0eVwiLCAoKSA9PiB7XG4gICAgICAgICAgdmFsaWRhdGUoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgZnVuY3Rpb24gdXBkYXRlU2NoZW1hKHNjaGVtYSkge1xuICAgICAgICAgIGlmIChzY2hlbWEpIHtcbiAgICAgICAgICAgIC8vIGxldHMgcmVtb3ZlIHRoZSB2YWx1ZXMgc28gdGhhdCB3ZSBjYW4gcHJvcGVybHkgY2hlY2sgd2hlbiB0aGUgc2NoZW1hIHJlYWxseSBkb2VzIGNoYW5nZVxuICAgICAgICAgICAgLy8gb3RoZXJ3aXNlIHRoZSBzY2hlbWEgd2lsbCBjaGFuZ2UgZXZlcnkgdGltZSB3ZSB0eXBlIGEgY2hhcmFjdGVyIDspXG4gICAgICAgICAgICB2YXIgc2NoZW1hV2l0aG91dFZhbHVlcyA9IGFuZ3VsYXIuY29weShzY2hlbWEpO1xuICAgICAgICAgICAgYW5ndWxhci5mb3JFYWNoKHNjaGVtYVdpdGhvdXRWYWx1ZXMucHJvcGVydGllcywgKHByb3BlcnR5KSA9PiB7XG4gICAgICAgICAgICAgIGRlbGV0ZSBwcm9wZXJ0eVtcInZhbHVlXCJdO1xuICAgICAgICAgICAgICBkZWxldGUgcHJvcGVydHlbXCJlbmFibGVkXCJdO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB2YXIganNvbiA9IGFuZ3VsYXIudG9Kc29uKHNjaGVtYVdpdGhvdXRWYWx1ZXMpO1xuICAgICAgICAgICAgaWYgKGpzb24gIT09ICRzY29wZS5wcmV2aW91c1NjaGVtYUpzb24pIHtcbiAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJ1cGRhdGVkIHNjaGVtYTogXCIgKyBqc29uKTtcbiAgICAgICAgICAgICAgJHNjb3BlLnByZXZpb3VzU2NoZW1hSnNvbiA9IGpzb247XG4gICAgICAgICAgICAgICRzY29wZS5zY2hlbWEgPSBzY2hlbWE7XG5cbiAgICAgICAgICAgICAgaWYgKCRzY29wZS5pZCA9PT0gXCJwcm9qZWN0LW5ld1wiKSB7XG4gICAgICAgICAgICAgICAgdmFyIGVudGl0eSA9ICRzY29wZS5lbnRpdHk7XG4gICAgICAgICAgICAgICAgLy8gbGV0cyBoaWRlIHRoZSB0YXJnZXQgbG9jYXRpb24hXG4gICAgICAgICAgICAgICAgdmFyIHByb3BlcnRpZXMgPSBzY2hlbWEucHJvcGVydGllcyB8fCB7fTtcbiAgICAgICAgICAgICAgICB2YXIgb3ZlcndyaXRlID0gcHJvcGVydGllcy5vdmVyd3JpdGU7XG4gICAgICAgICAgICAgICAgdmFyIGNhdGFsb2cgPSBwcm9wZXJ0aWVzLmNhdGFsb2c7XG4gICAgICAgICAgICAgICAgdmFyIHRhcmdldExvY2F0aW9uID0gcHJvcGVydGllcy50YXJnZXRMb2NhdGlvbjtcbiAgICAgICAgICAgICAgICBpZiAodGFyZ2V0TG9jYXRpb24pIHtcbiAgICAgICAgICAgICAgICAgIHRhcmdldExvY2F0aW9uLmhpZGRlbiA9IHRydWU7XG4gICAgICAgICAgICAgICAgICBpZiAob3ZlcndyaXRlKSB7XG4gICAgICAgICAgICAgICAgICAgIG92ZXJ3cml0ZS5oaWRkZW4gPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJoaWRpbmcgdGFyZ2V0TG9jYXRpb24hXCIpO1xuXG4gICAgICAgICAgICAgICAgICAvLyBsZXRzIGRlZmF1bHQgdGhlIHR5cGVcbiAgICAgICAgICAgICAgICAgIGlmICghZW50aXR5LnR5cGUpIHtcbiAgICAgICAgICAgICAgICAgICAgZW50aXR5LnR5cGUgPSBcIkZyb20gQXJjaGV0eXBlIENhdGFsb2dcIjtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGNhdGFsb2cpIHtcbiAgICAgICAgICAgICAgICAgIGlmICghZW50aXR5LmNhdGFsb2cpIHtcbiAgICAgICAgICAgICAgICAgICAgZW50aXR5LmNhdGFsb2cgPSBcImZhYnJpYzhcIjtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiB2YWxpZGF0ZSgpIHtcbiAgICAgICAgICBpZiAoJHNjb3BlLmV4ZWN1dGluZyB8fCAkc2NvcGUudmFsaWRhdGluZykge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgICB2YXIgbmV3SnNvbiA9IGFuZ3VsYXIudG9Kc29uKCRzY29wZS5lbnRpdHkpO1xuICAgICAgICAgIGlmIChuZXdKc29uID09PSAkc2NvcGUudmFsaWRhdGVkRW50aXR5SnNvbikge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAkc2NvcGUudmFsaWRhdGVkRW50aXR5SnNvbiA9IG5ld0pzb247XG4gICAgICAgICAgfVxuICAgICAgICAgIHZhciBjb21tYW5kSWQgPSAkc2NvcGUuaWQ7XG4gICAgICAgICAgdmFyIHJlc291cmNlUGF0aCA9ICRzY29wZS5yZXNvdXJjZVBhdGg7XG4gICAgICAgICAgdmFyIHVybCA9IHZhbGlkYXRlQ29tbWFuZEFwaVVybChGb3JnZUFwaVVSTCwgY29tbWFuZElkKTtcbiAgICAgICAgICAvLyBsZXRzIHB1dCB0aGUgZW50aXR5IGluIHRoZSBsYXN0IGl0ZW0gaW4gdGhlIGxpc3RcbiAgICAgICAgICB2YXIgaW5wdXRMaXN0ID0gW10uY29uY2F0KCRzY29wZS5pbnB1dExpc3QpO1xuICAgICAgICAgIGlucHV0TGlzdFtpbnB1dExpc3QubGVuZ3RoIC0gMV0gPSAkc2NvcGUuZW50aXR5O1xuICAgICAgICAgIHZhciByZXF1ZXN0ID0ge1xuICAgICAgICAgICAgcmVzb3VyY2U6IHJlc291cmNlUGF0aCxcbiAgICAgICAgICAgIGlucHV0TGlzdDogJHNjb3BlLmlucHV0TGlzdFxuICAgICAgICAgIH07XG4gICAgICAgICAgdXJsID0gY3JlYXRlSHR0cFVybCh1cmwpO1xuICAgICAgICAgIC8vbG9nLmluZm8oXCJBYm91dCB0byBwb3N0IHRvIFwiICsgdXJsICsgXCIgcGF5bG9hZDogXCIgKyBhbmd1bGFyLnRvSnNvbihyZXF1ZXN0KSk7XG4gICAgICAgICAgJHNjb3BlLnZhbGlkYXRpbmcgPSB0cnVlO1xuICAgICAgICAgICRodHRwLnBvc3QodXJsLCByZXF1ZXN0LCBjcmVhdGVIdHRwQ29uZmlnKCkpLlxuICAgICAgICAgICAgc3VjY2VzcyhmdW5jdGlvbiAoZGF0YSwgc3RhdHVzLCBoZWFkZXJzLCBjb25maWcpIHtcbiAgICAgICAgICAgICAgdGhpcy52YWxpZGF0aW9uID0gZGF0YTtcbiAgICAgICAgICAgICAgLy9jb25zb2xlLmxvZyhcImdvdCB2YWxpZGF0aW9uIFwiICsgYW5ndWxhci50b0pzb24oZGF0YSwgdHJ1ZSkpO1xuICAgICAgICAgICAgICB2YXIgd2l6YXJkUmVzdWx0cyA9IGRhdGEud2l6YXJkUmVzdWx0cztcbiAgICAgICAgICAgICAgaWYgKHdpemFyZFJlc3VsdHMpIHtcbiAgICAgICAgICAgICAgICB2YXIgc3RlcElucHV0cyA9IHdpemFyZFJlc3VsdHMuc3RlcElucHV0cztcbiAgICAgICAgICAgICAgICBpZiAoc3RlcElucHV0cykge1xuICAgICAgICAgICAgICAgICAgdmFyIHNjaGVtYSA9IF8ubGFzdChzdGVwSW5wdXRzKTtcbiAgICAgICAgICAgICAgICAgIHVwZGF0ZVNjaGVtYShzY2hlbWEpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBDb3JlLiRhcHBseSgkc2NvcGUpO1xuXG4gICAgICAgICAgICAgIC8qXG4gICAgICAgICAgICAgICAqIExldHMgdGhyb3R0bGUgdGhlIHZhbGlkYXRpb25zIHNvIHRoYXQgd2Ugb25seSBmaXJlIGFub3RoZXIgdmFsaWRhdGlvbiBhIGxpdHRsZVxuICAgICAgICAgICAgICAgKiBhZnRlciB3ZSd2ZSBnb3QgYSByZXBseSBhbmQgb25seSBpZiB0aGUgbW9kZWwgaGFzIGNoYW5nZWQgc2luY2UgdGhlblxuICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgJHRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICRzY29wZS52YWxpZGF0aW5nID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgdmFsaWRhdGUoKTtcbiAgICAgICAgICAgICAgfSwgMjAwKTtcbiAgICAgICAgICAgIH0pLlxuICAgICAgICAgICAgZXJyb3IoZnVuY3Rpb24gKGRhdGEsIHN0YXR1cywgaGVhZGVycywgY29uZmlnKSB7XG4gICAgICAgICAgICAgICRzY29wZS5leGVjdXRpbmcgPSBmYWxzZTtcbiAgICAgICAgICAgICAgbG9nLndhcm4oXCJGYWlsZWQgdG8gbG9hZCBcIiArIHVybCArIFwiIFwiICsgZGF0YSArIFwiIFwiICsgc3RhdHVzKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgdXBkYXRlRGF0YSgpO1xuXG4gICAgICAgIGZ1bmN0aW9uIHRvQmFja2dyb3VuZFN0eWxlKHN0YXR1cykge1xuICAgICAgICAgIGlmICghc3RhdHVzKSB7XG4gICAgICAgICAgICBzdGF0dXMgPSBcIlwiO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoc3RhdHVzLnN0YXJ0c1dpdGgoXCJzdWNcIikpIHtcbiAgICAgICAgICAgIHJldHVybiBcImJnLXN1Y2Nlc3NcIjtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIFwiYmctd2FybmluZ1wiXG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiB1cGRhdGVEYXRhKCkge1xuICAgICAgICAgICRzY29wZS5pdGVtID0gbnVsbDtcbiAgICAgICAgICB2YXIgY29tbWFuZElkID0gJHNjb3BlLmlkO1xuICAgICAgICAgIGlmIChjb21tYW5kSWQpIHtcbiAgICAgICAgICAgIHZhciByZXNvdXJjZVBhdGggPSAkc2NvcGUucmVzb3VyY2VQYXRoO1xuICAgICAgICAgICAgdmFyIHVybCA9IGNvbW1hbmRJbnB1dEFwaVVybChGb3JnZUFwaVVSTCwgY29tbWFuZElkLCByZXNvdXJjZVBhdGgpO1xuICAgICAgICAgICAgdXJsID0gY3JlYXRlSHR0cFVybCh1cmwpO1xuICAgICAgICAgICAgJGh0dHAuZ2V0KHVybCwgY3JlYXRlSHR0cENvbmZpZygpKS5cbiAgICAgICAgICAgICAgc3VjY2VzcyhmdW5jdGlvbiAoZGF0YSwgc3RhdHVzLCBoZWFkZXJzLCBjb25maWcpIHtcbiAgICAgICAgICAgICAgICBpZiAoZGF0YSkge1xuICAgICAgICAgICAgICAgICAgJHNjb3BlLmZldGNoZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJ1cGRhdGVEYXRhIGxvYWRlZCBzY2hlbWFcIik7XG4gICAgICAgICAgICAgICAgICB1cGRhdGVTY2hlbWEoZGF0YSk7XG4gICAgICAgICAgICAgICAgICBzZXRNb2RlbENvbW1hbmRJbnB1dHMoRm9yZ2VNb2RlbCwgJHNjb3BlLnJlc291cmNlUGF0aCwgJHNjb3BlLmlkLCAkc2NvcGUuc2NoZW1hKTtcbiAgICAgICAgICAgICAgICAgIG9uU2NoZW1hTG9hZCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBDb3JlLiRhcHBseSgkc2NvcGUpO1xuICAgICAgICAgICAgICB9KS5cbiAgICAgICAgICAgICAgZXJyb3IoZnVuY3Rpb24gKGRhdGEsIHN0YXR1cywgaGVhZGVycywgY29uZmlnKSB7XG4gICAgICAgICAgICAgICAgbG9nLndhcm4oXCJGYWlsZWQgdG8gbG9hZCBcIiArIHVybCArIFwiIFwiICsgZGF0YSArIFwiIFwiICsgc3RhdHVzKTtcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIENvcmUuJGFwcGx5KCRzY29wZSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gb25TY2hlbWFMb2FkKCkge1xuICAgICAgICAgIC8vIGxldHMgdXBkYXRlIHRoZSB2YWx1ZSBpZiBpdHMgYmxhbmsgd2l0aCB0aGUgZGVmYXVsdCB2YWx1ZXMgZnJvbSB0aGUgcHJvcGVydGllc1xuICAgICAgICAgIHZhciBzY2hlbWEgPSAkc2NvcGUuc2NoZW1hO1xuICAgICAgICAgICRzY29wZS5mZXRjaGVkID0gc2NoZW1hO1xuICAgICAgICAgIHZhciBlbnRpdHkgPSAkc2NvcGUuZW50aXR5O1xuICAgICAgICAgIGlmIChzY2hlbWEpIHtcbiAgICAgICAgICAgIGFuZ3VsYXIuZm9yRWFjaChzY2hlbWEucHJvcGVydGllcywgKHByb3BlcnR5LCBrZXkpID0+IHtcbiAgICAgICAgICAgICAgdmFyIHZhbHVlID0gcHJvcGVydHkudmFsdWU7XG4gICAgICAgICAgICAgIGlmICh2YWx1ZSAmJiAhZW50aXR5W2tleV0pIHtcbiAgICAgICAgICAgICAgICBlbnRpdHlba2V5XSA9IHZhbHVlO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1dKTtcbn1cbiIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9pbmNsdWRlcy50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJmb3JnZVBsdWdpbi50c1wiLz5cblxubW9kdWxlIEZvcmdlIHtcblxuICBleHBvcnQgdmFyIENvbW1hbmRzQ29udHJvbGxlciA9IGNvbnRyb2xsZXIoXCJDb21tYW5kc0NvbnRyb2xsZXJcIiwgW1wiJHNjb3BlXCIsIFwiJGRpYWxvZ1wiLCBcIiR3aW5kb3dcIiwgXCIkdGVtcGxhdGVDYWNoZVwiLCBcIiRyb3V0ZVBhcmFtc1wiLCBcIiRsb2NhdGlvblwiLCBcImxvY2FsU3RvcmFnZVwiLCBcIiRodHRwXCIsIFwiJHRpbWVvdXRcIiwgXCJGb3JnZUFwaVVSTFwiLCBcIkZvcmdlTW9kZWxcIixcbiAgICAoJHNjb3BlLCAkZGlhbG9nLCAkd2luZG93LCAkdGVtcGxhdGVDYWNoZSwgJHJvdXRlUGFyYW1zLCAkbG9jYXRpb246bmcuSUxvY2F0aW9uU2VydmljZSwgbG9jYWxTdG9yYWdlLCAkaHR0cCwgJHRpbWVvdXQsIEZvcmdlQXBpVVJMLCBGb3JnZU1vZGVsKSA9PiB7XG5cbiAgICAgICRzY29wZS5tb2RlbCA9IEZvcmdlTW9kZWw7XG4gICAgICAkc2NvcGUucmVzb3VyY2VQYXRoID0gJHJvdXRlUGFyYW1zW1wicGF0aFwiXSB8fCAkbG9jYXRpb24uc2VhcmNoKClbXCJwYXRoXCJdIHx8IFwiXCI7XG4gICAgICAkc2NvcGUucmVwb05hbWUgPSBcIlwiO1xuICAgICAgJHNjb3BlLnByb2plY3REZXNjcmlwdGlvbiA9ICRzY29wZS5yZXNvdXJjZVBhdGggfHwgXCJcIjtcbiAgICAgIHZhciBwYXRoU3RlcHMgPSAkc2NvcGUucHJvamVjdERlc2NyaXB0aW9uLnNwbGl0KFwiL1wiKTtcbiAgICAgIGlmIChwYXRoU3RlcHMgJiYgcGF0aFN0ZXBzLmxlbmd0aCkge1xuICAgICAgICAkc2NvcGUucmVwb05hbWUgPSBwYXRoU3RlcHNbcGF0aFN0ZXBzLmxlbmd0aCAtIDFdO1xuICAgICAgfVxuICAgICAgaWYgKCEkc2NvcGUucHJvamVjdERlc2NyaXB0aW9uLnN0YXJ0c1dpdGgoXCIvXCIpICYmICRzY29wZS5wcm9qZWN0RGVzY3JpcHRpb24ubGVuZ3RoID4gMCkge1xuICAgICAgICAkc2NvcGUucHJvamVjdERlc2NyaXB0aW9uID0gXCIvXCIgKyAkc2NvcGUucHJvamVjdERlc2NyaXB0aW9uO1xuICAgICAgfVxuXG4gICAgICAkc2NvcGUuYXZhdGFyX3VybCA9IGxvY2FsU3RvcmFnZVtcImdvZ3NBdmF0YXJVcmxcIl07XG4gICAgICAkc2NvcGUudXNlciA9IGxvY2FsU3RvcmFnZVtcImdvZ3NVc2VyXCJdO1xuXG4gICAgICAkc2NvcGUuY29tbWFuZHMgPSBnZXRNb2RlbENvbW1hbmRzKEZvcmdlTW9kZWwsICRzY29wZS5yZXNvdXJjZVBhdGgpO1xuICAgICAgJHNjb3BlLmZldGNoZWQgPSAkc2NvcGUuY29tbWFuZHMubGVuZ3RoICE9PSAwO1xuXG4gICAgICBpbml0U2NvcGUoJHNjb3BlLCAkbG9jYXRpb24sICRyb3V0ZVBhcmFtcyk7XG4gICAgICByZWRpcmVjdFRvR29nc0xvZ2luSWZSZXF1aXJlZCgkc2NvcGUsICRsb2NhdGlvbik7XG5cblxuICAgICAgJHNjb3BlLnRhYmxlQ29uZmlnID0ge1xuICAgICAgICBkYXRhOiAnY29tbWFuZHMnLFxuICAgICAgICBzaG93U2VsZWN0aW9uQ2hlY2tib3g6IHRydWUsXG4gICAgICAgIGVuYWJsZVJvd0NsaWNrU2VsZWN0aW9uOiBmYWxzZSxcbiAgICAgICAgbXVsdGlTZWxlY3Q6IHRydWUsXG4gICAgICAgIHNlbGVjdGVkSXRlbXM6IFtdLFxuICAgICAgICBmaWx0ZXJPcHRpb25zOiB7XG4gICAgICAgICAgZmlsdGVyVGV4dDogJGxvY2F0aW9uLnNlYXJjaCgpW1wicVwiXSB8fCAnJ1xuICAgICAgICB9LFxuICAgICAgICBjb2x1bW5EZWZzOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgZmllbGQ6ICduYW1lJyxcbiAgICAgICAgICAgIGRpc3BsYXlOYW1lOiAnTmFtZScsXG4gICAgICAgICAgICBjZWxsVGVtcGxhdGU6ICR0ZW1wbGF0ZUNhY2hlLmdldChcImlkVGVtcGxhdGUuaHRtbFwiKVxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgZmllbGQ6ICdkZXNjcmlwdGlvbicsXG4gICAgICAgICAgICBkaXNwbGF5TmFtZTogJ0Rlc2NyaXB0aW9uJ1xuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgZmllbGQ6ICdjYXRlZ29yeScsXG4gICAgICAgICAgICBkaXNwbGF5TmFtZTogJ0NhdGVnb3J5J1xuICAgICAgICAgIH1cbiAgICAgICAgXVxuICAgICAgfTtcblxuICAgICAgZnVuY3Rpb24gY29tbWFuZE1hdGNoZXMoY29tbWFuZCkge1xuICAgICAgICB2YXIgZmlsdGVyVGV4dCA9ICRzY29wZS50YWJsZUNvbmZpZy5maWx0ZXJPcHRpb25zLmZpbHRlclRleHQ7XG4gICAgICAgIHJldHVybiBjb21tYW5kTWF0Y2hlc1RleHQoY29tbWFuZCwgZmlsdGVyVGV4dCk7XG4gICAgICB9XG5cbiAgICAgICRzY29wZS5jb21tYW5kU2VsZWN0b3IgPSB7XG4gICAgICAgIGZpbHRlclRleHQ6IFwiXCIsXG4gICAgICAgIGZvbGRlcnM6IFtdLFxuICAgICAgICBzZWxlY3RlZENvbW1hbmRzOiBbXSxcbiAgICAgICAgZXhwYW5kZWRGb2xkZXJzOiB7fSxcblxuICAgICAgICBpc09wZW46IChmb2xkZXIpID0+IHtcbiAgICAgICAgICB2YXIgZmlsdGVyVGV4dCA9ICRzY29wZS50YWJsZUNvbmZpZy5maWx0ZXJPcHRpb25zLmZpbHRlclRleHQ7XG4gICAgICAgICAgaWYgKGZpbHRlclRleHQgIT09ICcnIHx8ICRzY29wZS5jb21tYW5kU2VsZWN0b3IuZXhwYW5kZWRGb2xkZXJzW2ZvbGRlci5pZF0pIHtcbiAgICAgICAgICAgIHJldHVybiBcIm9wZW5lZFwiO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gXCJjbG9zZWRcIjtcbiAgICAgICAgfSxcblxuICAgICAgICBjbGVhclNlbGVjdGVkOiAoKSA9PiB7XG4gICAgICAgICAgJHNjb3BlLmNvbW1hbmRTZWxlY3Rvci5leHBhbmRlZEZvbGRlcnMgPSB7fTtcbiAgICAgICAgICBDb3JlLiRhcHBseSgkc2NvcGUpO1xuICAgICAgICB9LFxuXG4gICAgICAgIHVwZGF0ZVNlbGVjdGVkOiAoKSA9PiB7XG4gICAgICAgICAgLy8gbGV0cyB1cGRhdGUgdGhlIHNlbGVjdGVkIGFwcHNcbiAgICAgICAgICB2YXIgc2VsZWN0ZWRDb21tYW5kcyA9IFtdO1xuICAgICAgICAgIGFuZ3VsYXIuZm9yRWFjaCgkc2NvcGUubW9kZWwuYXBwRm9sZGVycywgKGZvbGRlcikgPT4ge1xuICAgICAgICAgICAgdmFyIGFwcHMgPSBmb2xkZXIuYXBwcy5maWx0ZXIoKGFwcCkgPT4gYXBwLnNlbGVjdGVkKTtcbiAgICAgICAgICAgIGlmIChhcHBzKSB7XG4gICAgICAgICAgICAgIHNlbGVjdGVkQ29tbWFuZHMgPSBzZWxlY3RlZENvbW1hbmRzLmNvbmNhdChhcHBzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcbiAgICAgICAgICAkc2NvcGUuY29tbWFuZFNlbGVjdG9yLnNlbGVjdGVkQ29tbWFuZHMgPSBzZWxlY3RlZENvbW1hbmRzLnNvcnRCeShcIm5hbWVcIik7XG4gICAgICAgIH0sXG5cbiAgICAgICAgc2VsZWN0OiAoY29tbWFuZCwgZmxhZykgPT4ge1xuICAgICAgICAgIHZhciBpZCA9IGNvbW1hbmQubmFtZTtcbi8qXG4gICAgICAgICAgYXBwLnNlbGVjdGVkID0gZmxhZztcbiovXG4gICAgICAgICAgJHNjb3BlLmNvbW1hbmRTZWxlY3Rvci51cGRhdGVTZWxlY3RlZCgpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGdldFNlbGVjdGVkQ2xhc3M6IChhcHApID0+IHtcbiAgICAgICAgICBpZiAoYXBwLmFic3RyYWN0KSB7XG4gICAgICAgICAgICByZXR1cm4gXCJhYnN0cmFjdFwiO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoYXBwLnNlbGVjdGVkKSB7XG4gICAgICAgICAgICByZXR1cm4gXCJzZWxlY3RlZFwiO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gXCJcIjtcbiAgICAgICAgfSxcblxuICAgICAgICBzaG93Q29tbWFuZDogKGNvbW1hbmQpID0+IHtcbiAgICAgICAgICByZXR1cm4gY29tbWFuZE1hdGNoZXMoY29tbWFuZCk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgc2hvd0ZvbGRlcjogKGZvbGRlcikgPT4ge1xuICAgICAgICAgIHZhciBmaWx0ZXJUZXh0ID0gJHNjb3BlLnRhYmxlQ29uZmlnLmZpbHRlck9wdGlvbnMuZmlsdGVyVGV4dDtcbiAgICAgICAgICByZXR1cm4gIWZpbHRlclRleHQgfHwgZm9sZGVyLmNvbW1hbmRzLnNvbWUoKGFwcCkgPT4gY29tbWFuZE1hdGNoZXMoYXBwKSk7XG4gICAgICAgIH1cbiAgICAgIH07XG5cblxuICAgICAgdmFyIHVybCA9IFVybEhlbHBlcnMuam9pbihGb3JnZUFwaVVSTCwgXCJjb21tYW5kc1wiLCAkc2NvcGUucmVzb3VyY2VQYXRoKTtcbiAgICAgIHVybCA9IGNyZWF0ZUh0dHBVcmwodXJsKTtcbiAgICAgIGxvZy5pbmZvKFwiRmV0Y2hpbmcgY29tbWFuZHMgZnJvbTogXCIgKyB1cmwpO1xuICAgICAgJGh0dHAuZ2V0KHVybCwgY3JlYXRlSHR0cENvbmZpZygpKS5cbiAgICAgICAgc3VjY2VzcyhmdW5jdGlvbiAoZGF0YSwgc3RhdHVzLCBoZWFkZXJzLCBjb25maWcpIHtcbiAgICAgICAgICBpZiAoYW5ndWxhci5pc0FycmF5KGRhdGEpICYmIHN0YXR1cyA9PT0gMjAwKSB7XG4gICAgICAgICAgICB2YXIgcmVzb3VyY2VQYXRoID0gJHNjb3BlLnJlc291cmNlUGF0aDtcbiAgICAgICAgICAgIHZhciBmb2xkZXJNYXAgPSB7fTtcbiAgICAgICAgICAgIHZhciBmb2xkZXJzID0gW107XG4gICAgICAgICAgICAkc2NvcGUuY29tbWFuZHMgPSBfLnNvcnRCeShkYXRhLCBcIm5hbWVcIik7XG4gICAgICAgICAgICBhbmd1bGFyLmZvckVhY2goJHNjb3BlLmNvbW1hbmRzLCAoY29tbWFuZCkgPT4ge1xuICAgICAgICAgICAgICB2YXIgaWQgPSBjb21tYW5kLmlkIHx8IGNvbW1hbmQubmFtZTtcbiAgICAgICAgICAgICAgY29tbWFuZC4kbGluayA9IGNvbW1hbmRMaW5rKCRzY29wZS5wcm9qZWN0SWQsIGlkLCByZXNvdXJjZVBhdGgpO1xuXG4gICAgICAgICAgICAgIHZhciBuYW1lID0gY29tbWFuZC5uYW1lIHx8IGNvbW1hbmQuaWQ7XG4gICAgICAgICAgICAgIHZhciBmb2xkZXJOYW1lID0gY29tbWFuZC5jYXRlZ29yeTtcbiAgICAgICAgICAgICAgdmFyIHNob3J0TmFtZSA9IG5hbWU7XG4gICAgICAgICAgICAgIHZhciBuYW1lcyA9IG5hbWUuc3BsaXQoXCI6XCIsIDIpO1xuICAgICAgICAgICAgICBpZiAobmFtZXMgIT0gbnVsbCAmJiBuYW1lcy5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICAgICAgZm9sZGVyTmFtZSA9IG5hbWVzWzBdO1xuICAgICAgICAgICAgICAgIHNob3J0TmFtZSA9IG5hbWVzWzFdLnRyaW0oKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBpZiAoZm9sZGVyTmFtZSA9PT0gXCJQcm9qZWN0L0J1aWxkXCIpIHtcbiAgICAgICAgICAgICAgICBmb2xkZXJOYW1lID0gXCJQcm9qZWN0XCI7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgY29tbWFuZC4kc2hvcnROYW1lID0gc2hvcnROYW1lO1xuICAgICAgICAgICAgICBjb21tYW5kLiRmb2xkZXJOYW1lID0gZm9sZGVyTmFtZTtcbiAgICAgICAgICAgICAgdmFyIGZvbGRlciA9IGZvbGRlck1hcFtmb2xkZXJOYW1lXTtcbiAgICAgICAgICAgICAgaWYgKCFmb2xkZXIpIHtcbiAgICAgICAgICAgICAgICBmb2xkZXIgPSB7XG4gICAgICAgICAgICAgICAgICBuYW1lOiBmb2xkZXJOYW1lLFxuICAgICAgICAgICAgICAgICAgY29tbWFuZHM6IFtdXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICBmb2xkZXJNYXBbZm9sZGVyTmFtZV0gPSBmb2xkZXI7XG4gICAgICAgICAgICAgICAgZm9sZGVycy5wdXNoKGZvbGRlcik7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgZm9sZGVyLmNvbW1hbmRzLnB1c2goY29tbWFuZCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGZvbGRlcnMgPSBfLnNvcnRCeShmb2xkZXJzLCBcIm5hbWVcIik7XG4gICAgICAgICAgICBhbmd1bGFyLmZvckVhY2goZm9sZGVycywgKGZvbGRlcikgPT4ge1xuICAgICAgICAgICAgICBmb2xkZXIuY29tbWFuZHMgPSBfLnNvcnRCeShmb2xkZXIuY29tbWFuZHMsIFwiJHNob3J0TmFtZVwiKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgJHNjb3BlLmNvbW1hbmRTZWxlY3Rvci5mb2xkZXJzID0gZm9sZGVycztcblxuICAgICAgICAgICAgc2V0TW9kZWxDb21tYW5kcygkc2NvcGUubW9kZWwsICRzY29wZS5yZXNvdXJjZVBhdGgsICRzY29wZS5jb21tYW5kcyk7XG4gICAgICAgICAgICAkc2NvcGUuZmV0Y2hlZCA9IHRydWU7XG4gICAgICAgICAgfVxuICAgICAgICB9KS5cbiAgICAgICAgZXJyb3IoZnVuY3Rpb24gKGRhdGEsIHN0YXR1cywgaGVhZGVycywgY29uZmlnKSB7XG4gICAgICAgICAgbG9nLndhcm4oXCJmYWlsZWQgdG8gbG9hZCBcIiArIHVybCArIFwiLiBzdGF0dXM6IFwiICsgc3RhdHVzICsgXCIgZGF0YTogXCIgKyBkYXRhKTtcbiAgICAgICAgfSk7XG5cbiAgICB9XSk7XG59XG4iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vaW5jbHVkZXMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiZm9yZ2VIZWxwZXJzLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cImZvcmdlUGx1Z2luLnRzXCIvPlxuXG5tb2R1bGUgRm9yZ2Uge1xuXG4gIGV4cG9ydCB2YXIgUmVwb0NvbnRyb2xsZXIgPSBjb250cm9sbGVyKFwiUmVwb0NvbnRyb2xsZXJcIixcbiAgICBbXCIkc2NvcGVcIiwgXCIkdGVtcGxhdGVDYWNoZVwiLCBcIiRsb2NhdGlvblwiLCBcIiRyb3V0ZVBhcmFtc1wiLCBcIiRodHRwXCIsIFwiJHRpbWVvdXRcIiwgXCJGb3JnZUFwaVVSTFwiLFxuICAgICAgKCRzY29wZSwgJHRlbXBsYXRlQ2FjaGU6bmcuSVRlbXBsYXRlQ2FjaGVTZXJ2aWNlLCAkbG9jYXRpb246bmcuSUxvY2F0aW9uU2VydmljZSwgJHJvdXRlUGFyYW1zLCAkaHR0cCwgJHRpbWVvdXQsIEZvcmdlQXBpVVJMKSA9PiB7XG5cbiAgICAgICAgJHNjb3BlLm5hbWUgPSAkcm91dGVQYXJhbXNbXCJwYXRoXCJdO1xuXG4gICAgICAgIGluaXRTY29wZSgkc2NvcGUsICRsb2NhdGlvbiwgJHJvdXRlUGFyYW1zKTtcbiAgICAgICAgcmVkaXJlY3RUb0dvZ3NMb2dpbklmUmVxdWlyZWQoJHNjb3BlLCAkbG9jYXRpb24pO1xuXG4gICAgICAgICRzY29wZS4kb24oJyRyb3V0ZVVwZGF0ZScsICgkZXZlbnQpID0+IHtcbiAgICAgICAgICB1cGRhdGVEYXRhKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHVwZGF0ZURhdGEoKTtcblxuICAgICAgICBmdW5jdGlvbiB1cGRhdGVEYXRhKCkge1xuICAgICAgICAgIGlmICgkc2NvcGUubmFtZSkge1xuICAgICAgICAgICAgdmFyIHVybCA9IHJlcG9BcGlVcmwoRm9yZ2VBcGlVUkwsICRzY29wZS5uYW1lKTtcbiAgICAgICAgICAgIHVybCA9IGNyZWF0ZUh0dHBVcmwodXJsKTtcbiAgICAgICAgICAgIHZhciBjb25maWcgPSBjcmVhdGVIdHRwQ29uZmlnKCk7XG4gICAgICAgICAgICAkaHR0cC5nZXQodXJsLCBjb25maWcpLlxuICAgICAgICAgICAgICBzdWNjZXNzKGZ1bmN0aW9uIChkYXRhLCBzdGF0dXMsIGhlYWRlcnMsIGNvbmZpZykge1xuICAgICAgICAgICAgICAgIGlmIChkYXRhKSB7XG4gICAgICAgICAgICAgICAgICBlbnJpY2hSZXBvKGRhdGEpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAkc2NvcGUuZW50aXR5ID0gZGF0YTtcbiAgICAgICAgICAgICAgICAkc2NvcGUuZmV0Y2hlZCA9IHRydWU7XG4gICAgICAgICAgICAgIH0pLlxuICAgICAgICAgICAgICBlcnJvcihmdW5jdGlvbiAoZGF0YSwgc3RhdHVzLCBoZWFkZXJzLCBjb25maWcpIHtcbiAgICAgICAgICAgICAgICBsb2cud2FybihcImZhaWxlZCB0byBsb2FkIFwiICsgdXJsICsgXCIuIHN0YXR1czogXCIgKyBzdGF0dXMgKyBcIiBkYXRhOiBcIiArIGRhdGEpO1xuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgJHNjb3BlLmZldGNoZWQgPSB0cnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfV0pO1xufVxuIiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL2luY2x1ZGVzLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cImZvcmdlSGVscGVycy50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJmb3JnZVBsdWdpbi50c1wiLz5cblxubW9kdWxlIEZvcmdlIHtcblxuICBleHBvcnQgdmFyIFJlcG9zQ29udHJvbGxlciA9IGNvbnRyb2xsZXIoXCJSZXBvc0NvbnRyb2xsZXJcIiwgW1wiJHNjb3BlXCIsIFwiJGRpYWxvZ1wiLCBcIiR3aW5kb3dcIiwgXCIkdGVtcGxhdGVDYWNoZVwiLCBcIiRyb3V0ZVBhcmFtc1wiLCBcIiRsb2NhdGlvblwiLCBcImxvY2FsU3RvcmFnZVwiLCBcIiRodHRwXCIsIFwiJHRpbWVvdXRcIiwgXCJGb3JnZUFwaVVSTFwiLCBcIkt1YmVybmV0ZXNNb2RlbFwiLCBcIlNlcnZpY2VSZWdpc3RyeVwiLFxuICAgICgkc2NvcGUsICRkaWFsb2csICR3aW5kb3csICR0ZW1wbGF0ZUNhY2hlLCAkcm91dGVQYXJhbXMsICRsb2NhdGlvbjpuZy5JTG9jYXRpb25TZXJ2aWNlLCBsb2NhbFN0b3JhZ2UsICRodHRwLCAkdGltZW91dCwgRm9yZ2VBcGlVUkwsIEt1YmVybmV0ZXNNb2RlbDogS3ViZXJuZXRlcy5LdWJlcm5ldGVzTW9kZWxTZXJ2aWNlLCBTZXJ2aWNlUmVnaXN0cnkpID0+IHtcblxuICAgICAgJHNjb3BlLm1vZGVsID0gS3ViZXJuZXRlc01vZGVsO1xuICAgICAgJHNjb3BlLnJlc291cmNlUGF0aCA9ICRyb3V0ZVBhcmFtc1tcInBhdGhcIl07XG4gICAgICAkc2NvcGUuY29tbWFuZHNMaW5rID0gKHBhdGgpID0+IGNvbW1hbmRzTGluayhwYXRoLCAkc2NvcGUucHJvamVjdElkKTtcblxuICAgICAgaW5pdFNjb3BlKCRzY29wZSwgJGxvY2F0aW9uLCAkcm91dGVQYXJhbXMpO1xuXG4gICAgICAkc2NvcGUuJG9uKCdrdWJlcm5ldGVzTW9kZWxVcGRhdGVkJywgZnVuY3Rpb24gKCkge1xuICAgICAgICB1cGRhdGVMaW5rcygpO1xuICAgICAgICBDb3JlLiRhcHBseSgkc2NvcGUpO1xuICAgICAgfSk7XG5cbiAgICAgICRzY29wZS50YWJsZUNvbmZpZyA9IHtcbiAgICAgICAgZGF0YTogJ3Byb2plY3RzJyxcbiAgICAgICAgc2hvd1NlbGVjdGlvbkNoZWNrYm94OiB0cnVlLFxuICAgICAgICBlbmFibGVSb3dDbGlja1NlbGVjdGlvbjogZmFsc2UsXG4gICAgICAgIG11bHRpU2VsZWN0OiB0cnVlLFxuICAgICAgICBzZWxlY3RlZEl0ZW1zOiBbXSxcbiAgICAgICAgZmlsdGVyT3B0aW9uczoge1xuICAgICAgICAgIGZpbHRlclRleHQ6ICRsb2NhdGlvbi5zZWFyY2goKVtcInFcIl0gfHwgJydcbiAgICAgICAgfSxcbiAgICAgICAgY29sdW1uRGVmczogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIGZpZWxkOiAnbmFtZScsXG4gICAgICAgICAgICBkaXNwbGF5TmFtZTogJ1JlcG9zaXRvcnkgTmFtZScsXG4gICAgICAgICAgICBjZWxsVGVtcGxhdGU6ICR0ZW1wbGF0ZUNhY2hlLmdldChcInJlcG9UZW1wbGF0ZS5odG1sXCIpXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICBmaWVsZDogJ2FjdGlvbnMnLFxuICAgICAgICAgICAgZGlzcGxheU5hbWU6ICdBY3Rpb25zJyxcbiAgICAgICAgICAgIGNlbGxUZW1wbGF0ZTogJHRlbXBsYXRlQ2FjaGUuZ2V0KFwicmVwb0FjdGlvbnNUZW1wbGF0ZS5odG1sXCIpXG4gICAgICAgICAgfVxuICAgICAgICBdXG4gICAgICB9O1xuXG4gICAgICAkc2NvcGUubG9naW4gPSB7XG4gICAgICAgIGF1dGhIZWFkZXI6IGxvY2FsU3RvcmFnZVtcImdvZ3NBdXRob3JpemF0aW9uXCJdIHx8IFwiXCIsXG4gICAgICAgIHJlbG9naW46IGZhbHNlLFxuICAgICAgICBhdmF0YXJfdXJsOiBsb2NhbFN0b3JhZ2VbXCJnb2dzQXZhdGFyVXJsXCJdIHx8IFwiXCIsXG4gICAgICAgIHVzZXI6IGxvY2FsU3RvcmFnZVtcImdvZ3NVc2VyXCJdIHx8IFwiXCIsXG4gICAgICAgIHBhc3N3b3JkOiBcIlwiLFxuICAgICAgICBlbWFpbDogbG9jYWxTdG9yYWdlW1wiZ29nc0VtYWlsXCJdIHx8IFwiXCJcbiAgICAgIH07XG5cbiAgICAgICRzY29wZS5kb0xvZ2luID0gKCkgPT4ge1xuICAgICAgICB2YXIgbG9naW4gPSAkc2NvcGUubG9naW47XG4gICAgICAgIHZhciB1c2VyID0gbG9naW4udXNlcjtcbiAgICAgICAgdmFyIHBhc3N3b3JkID0gbG9naW4ucGFzc3dvcmQ7XG4gICAgICAgIGlmICh1c2VyICYmIHBhc3N3b3JkKSB7XG4gICAgICAgICAgdmFyIHVzZXJQd2QgPSB1c2VyICsgJzonICsgcGFzc3dvcmQ7XG4gICAgICAgICAgbG9naW4uYXV0aEhlYWRlciA9ICdCYXNpYyAnICsgKHVzZXJQd2QuZW5jb2RlQmFzZTY0KCkpO1xuICAgICAgICAgIHVwZGF0ZURhdGEoKTtcbiAgICAgICAgfVxuICAgICAgfTtcblxuICAgICAgJHNjb3BlLmxvZ291dCA9ICgpID0+IHtcbiAgICAgICAgZGVsZXRlIGxvY2FsU3RvcmFnZVtcImdvZ3NBdXRob3JpemF0aW9uXCJdO1xuICAgICAgICAkc2NvcGUubG9naW4uYXV0aEhlYWRlciA9IG51bGw7XG4gICAgICAgICRzY29wZS5sb2dpbi5sb2dnZWRJbiA9IGZhbHNlO1xuICAgICAgICAkc2NvcGUubG9naW4uZmFpbGVkID0gZmFsc2U7XG4gICAgICAgIGxvZ2dlZEluVG9Hb2dzID0gZmFsc2U7XG4gICAgICB9O1xuXG5cbiAgICAgICRzY29wZS5vcGVuQ29tbWFuZHMgPSAoKSA9PiB7XG4gICAgICAgIHZhciByZXNvdXJjZVBhdGggPSBudWxsO1xuICAgICAgICB2YXIgc2VsZWN0ZWQgPSAkc2NvcGUudGFibGVDb25maWcuc2VsZWN0ZWRJdGVtcztcbiAgICAgICAgaWYgKF8uaXNBcnJheShzZWxlY3RlZCkgJiYgc2VsZWN0ZWQubGVuZ3RoKSB7XG4gICAgICAgICAgcmVzb3VyY2VQYXRoID0gc2VsZWN0ZWRbMF0ucGF0aDtcbiAgICAgICAgfVxuICAgICAgICB2YXIgbGluayA9IGNvbW1hbmRzTGluayhyZXNvdXJjZVBhdGgsICRzY29wZS5wcm9qZWN0SWQpO1xuICAgICAgICBsb2cuaW5mbyhcIm1vdmluZyB0byBjb21tYW5kcyBsaW5rOiBcIiArIGxpbmspO1xuICAgICAgICAkbG9jYXRpb24ucGF0aChsaW5rKTtcbiAgICAgIH07XG5cbiAgICAgICRzY29wZS5kZWxldGUgPSAocHJvamVjdHMpID0+IHtcbiAgICAgICAgVUkubXVsdGlJdGVtQ29uZmlybUFjdGlvbkRpYWxvZyg8VUkuTXVsdGlJdGVtQ29uZmlybUFjdGlvbk9wdGlvbnM+e1xuICAgICAgICAgIGNvbGxlY3Rpb246IHByb2plY3RzLFxuICAgICAgICAgIGluZGV4OiAncGF0aCcsXG4gICAgICAgICAgb25DbG9zZTogKHJlc3VsdDpib29sZWFuKSA9PiB7XG4gICAgICAgICAgICBpZiAocmVzdWx0KSB7XG4gICAgICAgICAgICAgIGRvRGVsZXRlKHByb2plY3RzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9LFxuICAgICAgICAgIHRpdGxlOiAnRGVsZXRlIHByb2plY3RzPycsXG4gICAgICAgICAgYWN0aW9uOiAnVGhlIGZvbGxvd2luZyBwcm9qZWN0cyB3aWxsIGJlIHJlbW92ZWQgKHRob3VnaCB0aGUgZmlsZXMgd2lsbCByZW1haW4gb24geW91ciBmaWxlIHN5c3RlbSk6JyxcbiAgICAgICAgICBva1RleHQ6ICdEZWxldGUnLFxuICAgICAgICAgIG9rQ2xhc3M6ICdidG4tZGFuZ2VyJyxcbiAgICAgICAgICBjdXN0b206IFwiVGhpcyBvcGVyYXRpb24gaXMgcGVybWFuZW50IG9uY2UgY29tcGxldGVkIVwiLFxuICAgICAgICAgIGN1c3RvbUNsYXNzOiBcImFsZXJ0IGFsZXJ0LXdhcm5pbmdcIlxuICAgICAgICB9KS5vcGVuKCk7XG4gICAgICB9O1xuXG4gICAgICB1cGRhdGVMaW5rcygpO1xuXG4gICAgICBmdW5jdGlvbiBkb0RlbGV0ZShwcm9qZWN0cykge1xuICAgICAgICBhbmd1bGFyLmZvckVhY2gocHJvamVjdHMsIChwcm9qZWN0KSA9PiB7XG4gICAgICAgICAgbG9nLmluZm8oXCJEZWxldGluZyBcIiArIGFuZ3VsYXIudG9Kc29uKCRzY29wZS5wcm9qZWN0cykpO1xuICAgICAgICAgIHZhciBwYXRoID0gcHJvamVjdC5wYXRoO1xuICAgICAgICAgIGlmIChwYXRoKSB7XG4gICAgICAgICAgICB2YXIgdXJsID0gcmVwb0FwaVVybChGb3JnZUFwaVVSTCwgcGF0aCk7XG4gICAgICAgICAgICAkaHR0cC5kZWxldGUodXJsKS5cbiAgICAgICAgICAgICAgc3VjY2VzcyhmdW5jdGlvbiAoZGF0YSwgc3RhdHVzLCBoZWFkZXJzLCBjb25maWcpIHtcbiAgICAgICAgICAgICAgICB1cGRhdGVEYXRhKCk7XG4gICAgICAgICAgICAgIH0pLlxuICAgICAgICAgICAgICBlcnJvcihmdW5jdGlvbiAoZGF0YSwgc3RhdHVzLCBoZWFkZXJzLCBjb25maWcpIHtcbiAgICAgICAgICAgICAgICBsb2cud2FybihcImZhaWxlZCB0byBsb2FkIFwiICsgdXJsICsgXCIuIHN0YXR1czogXCIgKyBzdGF0dXMgKyBcIiBkYXRhOiBcIiArIGRhdGEpO1xuICAgICAgICAgICAgICAgIHZhciBtZXNzYWdlID0gXCJGYWlsZWQgdG8gUE9TVCB0byBcIiArIHVybCArIFwiIGdvdCBzdGF0dXM6IFwiICsgc3RhdHVzO1xuICAgICAgICAgICAgICAgIENvcmUubm90aWZpY2F0aW9uKCdlcnJvcicsIG1lc3NhZ2UpO1xuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICBmdW5jdGlvbiB1cGRhdGVMaW5rcygpIHtcbiAgICAgICAgdmFyICRnb2dzTGluayA9IFNlcnZpY2VSZWdpc3RyeS5zZXJ2aWNlUmVhZHlMaW5rKGdvZ3NTZXJ2aWNlTmFtZSk7XG4gICAgICAgIGlmICgkZ29nc0xpbmspIHtcbiAgICAgICAgICAkc2NvcGUuc2lnblVwVXJsID0gVXJsSGVscGVycy5qb2luKCRnb2dzTGluaywgXCJ1c2VyL3NpZ25fdXBcIik7XG4gICAgICAgICAgJHNjb3BlLmZvcmdvdFBhc3N3b3JkVXJsID0gVXJsSGVscGVycy5qb2luKCRnb2dzTGluaywgXCJ1c2VyL2ZvcmdldF9wYXNzd29yZFwiKTtcbiAgICAgICAgfVxuICAgICAgICAkc2NvcGUuJGdvZ3NMaW5rID0gJGdvZ3NMaW5rO1xuICAgICAgICAkc2NvcGUuJGZvcmdlTGluayA9IFNlcnZpY2VSZWdpc3RyeS5zZXJ2aWNlUmVhZHlMaW5rKEt1YmVybmV0ZXMuZmFicmljOEZvcmdlU2VydmljZU5hbWUpO1xuXG4gICAgICAgICRzY29wZS4kaGFzQ0RQaXBlbGluZVRlbXBsYXRlID0gXy5hbnkoJHNjb3BlLm1vZGVsLnRlbXBsYXRlcywgKHQpID0+IFwiY2QtcGlwZWxpbmVcIiA9PT0gS3ViZXJuZXRlcy5nZXROYW1lKHQpKTtcblxuICAgICAgICB2YXIgZXhwZWN0ZWRSQ1MgPSBbS3ViZXJuZXRlcy5nb2dzU2VydmljZU5hbWUsIEt1YmVybmV0ZXMuZmFicmljOEZvcmdlU2VydmljZU5hbWUsIEt1YmVybmV0ZXMuamVua2luc1NlcnZpY2VOYW1lXTtcbiAgICAgICAgdmFyIHJlcXVpcmVkUkNzID0ge307XG4gICAgICAgIHZhciBucyA9IEt1YmVybmV0ZXMuY3VycmVudEt1YmVybmV0ZXNOYW1lc3BhY2UoKTtcbiAgICAgICAgdmFyIHJ1bm5pbmdDRFBpcGVsaW5lID0gdHJ1ZTtcbiAgICAgICAgYW5ndWxhci5mb3JFYWNoKGV4cGVjdGVkUkNTLCAocmNOYW1lKSA9PiB7XG4gICAgICAgICAgdmFyIHJjID0gJHNjb3BlLm1vZGVsLmdldFJlcGxpY2F0aW9uQ29udHJvbGxlcihucywgcmNOYW1lKTtcbiAgICAgICAgICBpZiAocmMpIHtcbiAgICAgICAgICAgIHJlcXVpcmVkUkNzW3JjTmFtZV0gPSByYztcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcnVubmluZ0NEUGlwZWxpbmUgPSBmYWxzZTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICAkc2NvcGUuJHJlcXVpcmVkUkNzID0gcmVxdWlyZWRSQ3M7XG4gICAgICAgICRzY29wZS4kcnVubmluZ0NEUGlwZWxpbmUgPSBydW5uaW5nQ0RQaXBlbGluZTtcbiAgICAgICAgdmFyIHVybCA9IFwiXCI7XG4gICAgICAgICRsb2NhdGlvbiA9IEt1YmVybmV0ZXMuaW5qZWN0KFwiJGxvY2F0aW9uXCIpO1xuICAgICAgICBpZiAoJGxvY2F0aW9uKSB7XG4gICAgICAgICAgdXJsID0gJGxvY2F0aW9uLnVybCgpO1xuICAgICAgICB9XG4gICAgICAgIGlmICghdXJsKSB7XG4gICAgICAgICAgdXJsID0gd2luZG93LmxvY2F0aW9uLnRvU3RyaW5nKCk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gVE9ETyBzaG91bGQgd2Ugc3VwcG9ydCBhbnkgb3RoZXIgdGVtcGxhdGUgbmFtZXNwYWNlcz9cbiAgICAgICAgdmFyIHRlbXBsYXRlTmFtZXNwYWNlID0gXCJkZWZhdWx0XCI7XG4gICAgICAgICRzY29wZS4kcnVuQ0RQaXBlbGluZUxpbmsgPSBcIi9rdWJlcm5ldGVzL25hbWVzcGFjZS9cIiArIHRlbXBsYXRlTmFtZXNwYWNlICsgXCIvdGVtcGxhdGVzL1wiICsgbnMgKyBcIj9xPWNkLXBpcGVsaW5lJnJldHVyblRvPVwiICsgZW5jb2RlVVJJQ29tcG9uZW50KHVybCk7XG4gICAgICB9XG5cbiAgICAgIGZ1bmN0aW9uIHVwZGF0ZURhdGEoKSB7XG4gICAgICAgIHZhciBhdXRoSGVhZGVyID0gJHNjb3BlLmxvZ2luLmF1dGhIZWFkZXI7XG4gICAgICAgIHZhciBlbWFpbCA9ICRzY29wZS5sb2dpbi5lbWFpbCB8fCBcIlwiO1xuICAgICAgICBpZiAoYXV0aEhlYWRlcikge1xuICAgICAgICAgIHZhciB1cmwgPSByZXBvc0FwaVVybChGb3JnZUFwaVVSTCk7XG4gICAgICAgICAgdXJsID0gY3JlYXRlSHR0cFVybCh1cmwsIGF1dGhIZWFkZXIsIGVtYWlsKTtcbiAgICAgICAgICB2YXIgY29uZmlnID0ge1xuLypcbiAgICAgICAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgICAgICAgR29nc0F1dGhvcml6YXRpb246IGF1dGhIZWFkZXIsXG4gICAgICAgICAgICAgIEdvZ3NFbWFpbDogZW1haWxcbiAgICAgICAgICAgIH1cbiovXG4gICAgICAgICAgfTtcbiAgICAgICAgICAkaHR0cC5nZXQodXJsLCBjb25maWcpLlxuICAgICAgICAgICAgc3VjY2VzcyhmdW5jdGlvbiAoZGF0YSwgc3RhdHVzLCBoZWFkZXJzLCBjb25maWcpIHtcbiAgICAgICAgICAgICAgJHNjb3BlLmxvZ2luLmZhaWxlZCA9IGZhbHNlO1xuICAgICAgICAgICAgICAkc2NvcGUubG9naW4ubG9nZ2VkSW4gPSB0cnVlO1xuICAgICAgICAgICAgICBsb2dnZWRJblRvR29ncyA9IHRydWU7XG4gICAgICAgICAgICAgIHZhciBhdmF0YXJfdXJsID0gbnVsbDtcbiAgICAgICAgICAgICAgaWYgKHN0YXR1cyA9PT0gMjAwKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFkYXRhIHx8ICFhbmd1bGFyLmlzQXJyYXkoZGF0YSkpIHtcbiAgICAgICAgICAgICAgICAgIGRhdGEgPSBbXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8gbGV0cyBzdG9yZSBhIHN1Y2Nlc3NmdWwgbG9naW4gc28gdGhhdCB3ZSBoaWRlIHRoZSBsb2dpbiBwYWdlXG4gICAgICAgICAgICAgICAgbG9jYWxTdG9yYWdlW1wiZ29nc0F1dGhvcml6YXRpb25cIl0gPSBhdXRoSGVhZGVyO1xuICAgICAgICAgICAgICAgIGxvY2FsU3RvcmFnZVtcImdvZ3NFbWFpbFwiXSA9IGVtYWlsO1xuICAgICAgICAgICAgICAgIGxvY2FsU3RvcmFnZVtcImdvZ3NVc2VyXCJdID0gJHNjb3BlLmxvZ2luLnVzZXIgfHwgXCJcIjtcblxuICAgICAgICAgICAgICAgICRzY29wZS5wcm9qZWN0cyA9IF8uc29ydEJ5KGRhdGEsIFwibmFtZVwiKTtcbiAgICAgICAgICAgICAgICBhbmd1bGFyLmZvckVhY2goJHNjb3BlLnByb2plY3RzLCAocmVwbykgPT4ge1xuICAgICAgICAgICAgICAgICAgZW5yaWNoUmVwbyhyZXBvKTtcbiAgICAgICAgICAgICAgICAgIGlmICghYXZhdGFyX3VybCkge1xuICAgICAgICAgICAgICAgICAgICBhdmF0YXJfdXJsID0gQ29yZS5wYXRoR2V0KHJlcG8sIFtcIm93bmVyXCIsIFwiYXZhdGFyX3VybFwiXSk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChhdmF0YXJfdXJsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmxvZ2luLmF2YXRhcl91cmwgPSBhdmF0YXJfdXJsO1xuICAgICAgICAgICAgICAgICAgICAgIGxvY2FsU3RvcmFnZVtcImdvZ3NBdmF0YXJVcmxcIl0gPSBhdmF0YXJfdXJsO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgJHNjb3BlLmZldGNoZWQgPSB0cnVlO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KS5cbiAgICAgICAgICAgIGVycm9yKGZ1bmN0aW9uIChkYXRhLCBzdGF0dXMsIGhlYWRlcnMsIGNvbmZpZykge1xuICAgICAgICAgICAgICAkc2NvcGUubG9nb3V0KCk7XG4gICAgICAgICAgICAgICRzY29wZS5sb2dpbi5mYWlsZWQgPSB0cnVlO1xuICAgICAgICAgICAgICBpZiAoc3RhdHVzICE9PSA0MDMpIHtcbiAgICAgICAgICAgICAgICBsb2cud2FybihcImZhaWxlZCB0byBsb2FkIFwiICsgdXJsICsgXCIuIHN0YXR1czogXCIgKyBzdGF0dXMgKyBcIiBkYXRhOiBcIiArIGRhdGEpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICB1cGRhdGVEYXRhKCk7XG5cbiAgICB9XSk7XG59XG4iXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=
angular.module("fabric8-console-templates", []).run(["$templateCache", function($templateCache) {$templateCache.put("plugins/forge/html/command.html","<div ng-controller=\"Forge.CommandController\">\n  <div class=\"row\">\n    <div hawtio-breadcrumbs></div>\n  </div>\n\n  <div class=\"row\">\n    <div hawtio-tabs></div>\n  </div>\n\n<!--\n  <div class=\"row\">\n    <div class=\"col-md-12\">\n      <span class=\"pull-right\">&nbsp;</span>\n\n      <div class=\"user-icon-name pull-right\" ng-show=\"user\">\n        <a href=\"/forge/repos\" title=\"Browse the repositories for {{user}}\">\n          <img src=\"{{avatar_url}}\" class=\"avatar-small-img\" ng-show=\"avatar_url\">\n        </a>\n        &nbsp;\n        <a href=\"/forge/repos\" title=\"Browse the repositories for {{user}}\">\n          {{user}}\n        </a>\n        <span ng-show=\"repoName\">/\n          <a href=\"/forge/repos/{{repoName}}\" title=\"Browse the {{repoName}}repository\">\n            {{repoName}}\n          </a>\n        </span>\n      </div>\n    </div>\n  </div>\n-->\n  <div class=\"row\">\n    <div class=\"col-md-12\">\n      <h3>{{schema.info.description}}</h3>\n    </div>\n  </div>\n  <div class=\"row\" ng-show=\"executing\">\n    <div class=\"col-md-12\">\n      <p class=\"bg-info\">executing...\n        <i class=\"fa fa-spinner fa-spin\"></i>\n      </p>\n    </div>\n  </div>\n  <div class=\"row\" ng-show=\"response\">\n    <div class=\"col-md-12\">\n      <p ng-show=\"response.message\" ng-class=\"responseClass\"><span class=\"response-message\">{{response.message}}</span></p>\n      <p ng-show=\"response.output\" ng-class=\"responseClass\"><span class=\"response-output\">{{response.output}}</span></p>\n      <p ng-show=\"response.err\" ng-class=\"bg-warning\"><span class=\"response-err\">{{response.err}}</span></p>\n    </div>\n  </div>\n  <div class=\"row\" ng-show=\"response && !invalid\">\n    <div class=\"col-md-12\">\n      <a class=\"btn btn-primary\" href=\"{{completedLink}}\">Done</a>\n      <a class=\"btn btn-default\" ng-click=\"response = null\" ng-hide=\"wizardCompleted\">Hide</a>\n    </div>\n  </div>\n  <div class=\"row\" ng-show=\"validationError\">\n    <div class=\"col-md-12\">\n      <p class=\"bg-danger\">{{validationError}}</p>\n    </div>\n  </div>\n  <div class=\"row\">\n    <div class=\"col-md-12\">\n      <div ng-hide=\"fetched\">\n        <div class=\"align-center\">\n          <i class=\"fa fa-spinner fa-spin\"></i>\n        </div>\n      </div>\n      <div ng-show=\"fetched && !wizardCompleted\">\n        <div hawtio-form-2=\"schema\" entity=\'entity\'></div>\n      </div>\n    </div>\n  </div>\n  <div class=\"row\" ng-hide=\"wizardCompleted\">\n    <div class=\"col-md-2\">\n    </div>\n    <div class=\"col-md-2\">\n      <button class=\"btn btn-primary\"\n              title=\"Perform this command\"\n              ng-show=\"fetched\"\n              ng-disabled=\"executing\"\n              ng-click=\"execute()\">\n        Execute\n      </button>\n    </div>\n  </div>\n</div>\n");
$templateCache.put("plugins/forge/html/commands.html","<div class=\"row\" ng-controller=\"Forge.CommandsController\">\n  <div class=\"row\">\n    <div hawtio-breadcrumbs></div>\n  </div>\n\n  <div class=\"row\">\n    <div hawtio-tabs></div>\n  </div>\n\n  <div class=\"row\">\n    <div class=\"col-md-12\" ng-show=\"commands.length\">\n      <span ng-show=\"!id\">\n        Command: <hawtio-filter ng-model=\"tableConfig.filterOptions.filterText\"\n                                css-class=\"input-xxlarge\"\n                                placeholder=\"Filter commands...\"\n                                save-as=\"fabric8-forge-command-filter\"></hawtio-filter>\n      </span>\n      <span class=\"pull-right\">&nbsp;</span>\n\n      <div class=\"user-icon-name pull-right\" ng-show=\"user\">\n        <a href=\"/forge/repos\" title=\"Browse the repositories for {{user}}\">\n          <img src=\"{{avatar_url}}\" class=\"avatar-small-img\" ng-show=\"avatar_url\">\n        </a>\n        &nbsp;\n        <a href=\"/forge/repos\" title=\"Browse the repositories for {{user}}\">\n          {{user}}\n        </a>\n        <span ng-show=\"repoName\">/\n          <a href=\"/forge/repos/{{repoName}}\" title=\"Browse the {{repoName}}repository\">\n            {{repoName}}\n          </a>\n        </span>\n      </div>\n    </div>\n  </div>\n  <div class=\"row\">\n    <div class=\"col-md-12\">\n      <div ng-hide=\"fetched\">\n        <div class=\"align-center\">\n          <i class=\"fa fa-spinner fa-spin\"></i>\n        </div>\n      </div>\n      <div ng-show=\"fetched\">\n        <div ng-hide=\"commands.length\" class=\"align-center\">\n          <p class=\"alert alert-info\">There are no commands available!</p>\n        </div>\n        <div ng-show=\"commands.length\">\n        </div>\n        <div ng-show=\"mode == \'table\'\">\n          <table class=\"table table-condensed table-striped\" hawtio-simple-table=\"tableConfig\"></table>\n        </div>\n      </div>\n    </div>\n  </div>\n\n  <div ng-show=\"fetched && commands.length && mode != \'table\'\">\n    <div class=\"row\">\n      <ul>\n        <li class=\"no-list command-selector-folder\" ng-repeat=\"folder in commandSelector.folders\"\n            ng-show=\"commandSelector.showFolder(folder)\">\n          <div class=\"expandable\" ng-class=\"commandSelector.isOpen(folder)\">\n            <div title=\"{{folder.name}}\" class=\"title\">\n              <i class=\"expandable-indicator folder\"></i> <span class=\"folder-title\"\n                                                                ng-show=\"folder.name\">{{folder.name}}</span><span\n                    class=\"folder-title\" ng-hide=\"folder.name\">Uncategorized</span>\n            </div>\n            <div class=\"expandable-body\">\n              <ul>\n                <li class=\"no-list command\" ng-repeat=\"command in folder.commands\"\n                    ng-show=\"commandSelector.showCommand(command)\">\n                  <div class=\"inline-block command-selector-name\"\n                       ng-class=\"commandSelector.getSelectedClass(command)\">\n                    <span class=\"contained c-max\">\n                      <a href=\"{{command.$link}}\"\n                         title=\"{{command.description}}\">\n                        <span class=\"command-name\">{{command.$shortName}}</span>\n                      </a>\n                    </span>\n                  </div>\n                </li>\n              </ul>\n            </div>\n          </div>\n        </li>\n      </ul>\n    </div>\n  </div>\n</div>\n");
$templateCache.put("plugins/forge/html/createProject.html","<div class=\"row\" ng-controller=\"Forge.ReposController\">\n  <style>\n    .createProjectPage {\n      padding-top: 40px;\n    }\n  </style>\n\n  <div class=\"row\">\n    <div hawtio-breadcrumbs></div>\n  </div>\n\n  <div class=\"row\">\n    <div hawtio-tabs></div>\n  </div>\n\n  <div class=\"row\">\n    <div class=\"col-md-12\">\n      <span class=\"pull-right\">&nbsp;</span>\n      <a class=\"btn btn-default pull-right\" ng-click=\"logout()\" ng-show=\"login.loggedIn && $runningCDPipeline && $gogsLink && $forgeLink\"\n         title=\"Log out from the git repository\">\n        <i class=\"fa fa-sign-out\"></i> Log out</a>\n      </a>\n      <!--\n            <span class=\"pull-right\" ng-show=\"login.loggedIn\">&nbsp;</span>\n\n            <div class=\"user-icon-name pull-right\" ng-show=\"login.loggedIn\">\n              <img src=\"{{login.avatar_url}}\" class=\"avatar-small-img\" ng-show=\"login.avatar_url\">&nbsp;\n              {{login.user}}\n            </div>\n      -->\n    </div>\n  </div>\n\n\n  <div ng-show=\"model.fetched && $runningCDPipeline && (!$gogsLink || !$forgeLink)\">\n    <div class=\"createProjectPage\">\n      <div class=\"jumbotron\">\n        <p>Waiting for the <b>CD Pipeline</b> application to startup: &nbsp;&nbsp;<i class=\"fa fa-spinner fa-spin\"></i></p>\n\n        <ul class=\"pending-pods\">\n          <li class=\"ngCellText\" ng-repeat=\"item in $requiredRCs\">\n            <a ng-href=\"{{item | kubernetesPageLink}}\">\n              <img class=\"app-icon-small\" ng-src=\"{{item.$iconUrl}}\" ng-show=\"item.$iconUrl\">\n              <b>{{item.metadata.name}}</b>\n            </a>\n            <a ng-show=\"item.$podCounters.podsLink\" href=\"{{item.$podCounters.podsLink}}\" title=\"View pods\">\n              <span ng-show=\"item.$podCounters.ready\" class=\"badge badge-success\">{{item.$podCounters.ready}}</span>\n              <span ng-show=\"item.$podCounters.valid\" class=\"badge badge-info\">{{item.$podCounters.valid}}</span>\n              <span ng-show=\"item.$podCounters.waiting\" class=\"badge\">{{item.$podCounters.waiting}}</span>\n              <span ng-show=\"item.$podCounters.error\" class=\"badge badge-warning\">{{item.$podCounters.error}}</span>\n            </a>\n          </li>\n        </ul>\n        <p>Please be patient while the above pods are ready!</p>\n      </div>\n    </div>\n  </div>\n\n  <div ng-show=\"model.fetched && !$runningCDPipeline\">\n    <div class=\"createProjectPage\">\n      <div class=\"jumbotron\">\n        <p class=\"text-warning\">You are not running the <b>CD Pipeline</b> application in this workspace.</p>\n\n        <p>To be able to create new projects please run it!</p>\n\n        <p><a href=\"{{$runCDPipelineLink}}\" class=\"btn btn-lg btn-default\">Run the <b>CD Pipeline</b></a></p>\n      </div>\n    </div>\n  </div>\n\n  <div ng-show=\"$runningCDPipeline && $gogsLink && $forgeLink && (!login.authHeader || login.relogin)\">\n    <div ng-show=\"login.failed\">\n      <div class=\"bg-danger\">\n        <div class=\"invalid-login align-center\">\n          <h3>Invalid login/password. Please try again!</h3>\n        </div>\n      </div>\n    </div>\n    <h2 ng-hide=\"login.failed\">Please login to the git repository so that you can create a project</h2>\n\n    <form>\n      <div class=\"form-group\">\n        <label for=\"gitUsername\">User name</label>\n        <input type=\"text\" class=\"form-control\" id=\"gitUsername\" placeholder=\"Enter user name\" required=\"true\"\n               ng-model=\"login.user\">\n      </div>\n      <div class=\"form-group\">\n        <label for=\"gitPassword\">Password</label>\n        <input type=\"password\" class=\"form-control\" id=\"gitPassword\" placeholder=\"Password\" required=\"true\"\n               ng-model=\"login.password\">\n      </div>\n      <div class=\"form-group\">\n        <label for=\"gitEmail\">Email address</label>\n        <input type=\"email\" class=\"form-control\" id=\"gitEmail\" placeholder=\"Enter email\" required=\"true\"\n               ng-model=\"login.email\">\n      </div>\n      <div class=\"form-group\">\n        <button type=\"submit\" class=\"btn btn-primary\" ng-click=\"doLogin()\"\n                ng-disabled=\"!login.user || !login.password || !login.email\">\n          <i class=\"fa fa-sign-in\"></i> Sign In\n        </button>\n      </div>\n\n      <div class=\"form-group\" ng-show=\"forgotPasswordUrl\">\n        <a href=\"{{forgotPasswordUrl}}\">Forgot password?</a>\n      </div>\n\n      <div class=\"form-group\" ng-show=\"signUpUrl\">\n        <a href=\"{{signUpUrl}}\">Need an account? Sign up now.</a>\n      </div>\n    </form>\n  </div>\n\n  <div ng-hide=\"model.fetched || !login.authHeader || login.relogin || !$gogsLink ||!$forgeLink\">\n    <div class=\"row\">\n      <div class=\"col-md-12\">\n        <div class=\"align-center\">\n          <i class=\"fa fa-spinner fa-spin\"></i>\n        </div>\n      </div>\n    </div>\n  </div>\n\n  <div ng-show=\"model.fetched && login.authHeader && $gogsLink && $forgeLink\">\n    <div class=\"createProjectPage\">\n      <div class=\"jumbotron\">\n        <p class=\"align-center\">\n          <a class=\"btn btn-primary btn-lg\" href=\"{{$workspaceLink}}/forge/command/project-new\"\n             ng-show=\"login.loggedIn\"\n             title=\"Create a new project in this workspace using a wizard\">\n            <i class=\"fa fa-plus\"></i> Create Project using Wizard</a>\n          </a>\n        </p>\n\n        <p class=\"lead align-center\">\n          This wizard guides you though creating a new project, the git repository and the related builds and Continuous\n          Delivery Pipelines.\n        </p>\n      </div>\n    </div>\n  </div>\n</div>\n");
$templateCache.put("plugins/forge/html/layoutForge.html","<script type=\"text/ng-template\" id=\"idTemplate.html\">\n  <div class=\"ngCellText\">\n    <a href=\"\"\n       title=\"Execute command {{row.entity.name}}\"\n       ng-href=\"{{row.entity.$link}}\">\n      {{row.entity.name}}</a>\n  </div>\n</script>\n<script type=\"text/ng-template\" id=\"repoTemplate.html\">\n  <div class=\"ngCellText\">\n    <a title=\"View repository {{row.entity.name}}\"\n       ng-href=\"/forge/repos/{{row.entity.name}}\">\n      {{row.entity.name}}\n    </a>\n  </div>\n</script>\n<script type=\"text/ng-template\" id=\"repoActionsTemplate.html\">\n  <div class=\"ngCellText\">\n    <a ng-show=\"row.entity.$openProjectLink\"\n       class=\"btn btn-primary\" target=\"editor\"\n       title=\"Open project {{row.entity.name}} in an editor\"\n       ng-href=\"{{row.entity.$openProjectLink}}\">\n      <i class=\"fa fa-pencil-square\"></i>\n      Open\n    </a>\n    <a ng-show=\"row.entity.html_url\"\n       class=\"btn btn-default\" target=\"browse\"\n       title=\"Browse project {{row.entity.name}}\"\n       ng-href=\"{{row.entity.html_url}}\">\n      <i class=\"fa fa-external-link\"></i>\n      Repository\n    </a>\n    <a ng-show=\"row.entity.$buildsLink\"\n       class=\"btn btn-default\" target=\"builds\"\n       title=\"View builds for this repository {{row.entity.owner.username}}/{{row.entity.name}}\"\n       ng-href=\"{{row.entity.$buildsLink}}\">\n      <i class=\"fa fa-cog\"></i>\n      Builds\n    </a>\n    <a ng-show=\"row.entity.$commandsLink\"\n       class=\"btn btn-default\"\n       title=\"Commands for project {{row.entity.name}}\"\n       ng-href=\"{{row.entity.$commandsLink}}\">\n      <i class=\"fa fa-play-circle\"></i>\n      Run...\n    </a>\n  </div>\n</script>\n<script type=\"text/ng-template\" id=\"categoryTemplate.html\">\n  <div class=\"ngCellText\">\n    <span class=\"pod-label badge\"\n          class=\"background-light-grey mouse-pointer\">{{row.entity.category}}</span>\n  </div>\n</script>\n\n<div class=\"row\">\n  <div class=\"wiki-icon-view\">\n    <div class=\"row forge-view\" ng-view></div>\n  </div>\n</div>\n");
$templateCache.put("plugins/forge/html/repo.html","<div class=\"row\" ng-controller=\"Forge.RepoController\">\n  <div class=\"row\">\n    <div hawtio-breadcrumbs></div>\n  </div>\n\n  <div class=\"row\">\n    <div hawtio-tabs></div>\n  </div>\n\n  <div class=\"row\">\n    <div class=\"col-md-12\">\n      <span class=\"pull-right\">&nbsp;</span>\n      <a class=\"btn btn-default pull-right\"\n              href=\"/forge/repos\"><i class=\"fa fa-list\"></i></a>\n      <span class=\"pull-right\">&nbsp;</span>\n      <a ng-show=\"entity.$commandsLink\"\n         class=\"btn btn-default pull-right\"\n         title=\"Commands for project {{entity.name}}\"\n         ng-href=\"{{entity.$commandsLink}}\">\n        <i class=\"fa fa-play-circle\"></i>\n        Run...\n      </a>\n      <span class=\"pull-right\" ng-show=\"entity.$buildsLink\">&nbsp;</span>\n      <a ng-show=\"entity.$buildsLink\"\n         class=\"btn btn-primary pull-right\" target=\"builds\"\n         title=\"View builds for this repository {{entity.owner.username}}/{{entity.name}}\"\n         ng-href=\"{{entity.$buildsLink}}\">\n        <i class=\"fa fa-cog\"></i>\n        Builds\n      </a>\n      <span class=\"pull-right\">&nbsp;</span>\n      <a ng-show=\"entity.html_url\"\n         class=\"btn btn-default pull-right\" target=\"browse\"\n         title=\"Browse project {{entity.name}}\"\n         ng-href=\"{{entity.html_url}}\">\n        <i class=\"fa fa-external-link\"></i>\n        Browse\n      </a>\n    </div>\n  </div>\n\n  <div ng-hide=\"fetched\">\n    <div class=\"row\">\n      <div class=\"col-md-12\">\n        <div class=\"align-center\">\n          <i class=\"fa fa-spinner fa-spin\"></i>\n        </div>\n      </div>\n    </div>\n  </div>\n  <div ng-show=\"fetched\">\n    <div class=\"row\">\n      <div class=\"col-md-12\">\n        <h3 title=\"repository for {{entity.owner.username}}\">\n          <span ng-show=\"entity.owner.username\">\n            <a href=\"/forge/repos\" title=\"Browse the repositories for {{entity.owner.username}}\">\n              <img src=\"{{entity.owner.avatar_url}}\" class=\"avatar-small-img\" ng-show=\"entity.owner.avatar_url\">\n            </a>\n            &nbsp;\n            <a href=\"/forge/repos\" title=\"Browse the repositories for {{entity.owner.username}}\">\n              {{entity.owner.username}}\n            </a>\n             &nbsp;/&nbsp;\n          </span>\n          {{entity.name}}\n        </h3>\n      </div>\n    </div>\n\n    <div class=\"git-clone-tabs\">\n      <div class=\"row\">\n        <div class=\"col-md-12\">\n          <div class=\"tabbable\">\n            <div value=\"ssh\" class=\"tab-pane\" title=\"SSH\" ng-show=\"entity.ssh_url\">\n              <div class=\"git-clone-panel\">\n                <p>to clone this git repository via <b>ssh</b> from the command line:</p>\n              </div>\n\n              <div class=\"highlight\">\n                <pre>\n                  <code>git clone {{entity.ssh_url}}</code>\n                </pre>\n              </div>\n            </div>\n\n            <div value=\"http\" class=\"tab-pane\" title=\"HTTP\" ng-show=\"entity.clone_url\">\n              <div class=\"git-clone-panel\">\n                <p>to clone this git repository via <b>http</b> from the command line:</p>\n              </div>\n\n              <div class=\"highlight\">\n                <pre>\n                  <code>git clone {{entity.clone_url}}</code>\n                </pre>\n              </div>\n            </div>\n          </div>\n        </div>\n      </div>\n    </div>\n  </div>\n</div>\n");
$templateCache.put("plugins/forge/html/repos.html","<div class=\"row\" ng-controller=\"Forge.ReposController\">\n  <div class=\"row\">\n    <div hawtio-breadcrumbs></div>\n  </div>\n\n  <div class=\"row\">\n    <div hawtio-tabs></div>\n  </div>\n\n  <div class=\"row\">\n    <div class=\"col-md-12\">\n      <hawtio-filter ng-model=\"tableConfig.filterOptions.filterText\"\n                     ng-show=\"projects.length\"\n                     css-class=\"input-xxlarge\"\n                     placeholder=\"Filter repositories...\"></hawtio-filter>\n      <!--\n            <span class=\"pull-right\">&nbsp;</span>\n            <button ng-show=\"fetched\"\n                    class=\"btn btn-danger pull-right\"\n                    ng-disabled=\"tableConfig.selectedItems.length == 0\"\n                    ng-click=\"delete(tableConfig.selectedItems)\">\n              <i class=\"fa fa-remove\"></i> Delete\n            </button>\n      -->\n      <span class=\"pull-right\">&nbsp;</span>\n      <a class=\"btn btn-primary pull-right\" href=\"{{$workspaceLink}}/forge/command/project-new\"\n         ng-show=\"login.loggedIn\"\n         title=\"Create a new project and repository\">\n        <i class=\"fa fa-plus\"></i> Create Project</a>\n      </a>\n      <span class=\"pull-right\">&nbsp;</span>\n      <a class=\"btn btn-default pull-right\" ng-click=\"logout()\" ng-show=\"login.loggedIn\"\n         title=\"Log out from the git repository\">\n        <i class=\"fa fa-sign-out\"></i> Log out</a>\n      </a>\n      <span class=\"pull-right\" ng-show=\"login.loggedIn\">&nbsp;</span>\n      <div class=\"user-icon-name pull-right\" ng-show=\"login.loggedIn\">\n        <img src=\"{{login.avatar_url}}\" class=\"avatar-small-img\" ng-show=\"login.avatar_url\">&nbsp;\n        {{login.user}}\n      </div>\n    </div>\n  </div>\n\n\n  <div ng-show=\"!login.authHeader || login.relogin\">\n    <div ng-show=\"login.failed\">\n      <div class=\"bg-danger\">\n        <div class=\"invalid-login align-center\">\n          <h3>Invalid login/password. Please try again!</h3>\n        </div>\n      </div>\n    </div>\n    <h2 ng-hide=\"login.failed\">Please login to the git repository</h2>\n\n    <form>\n      <div class=\"form-group\">\n        <label for=\"gitUsername\">User name</label>\n        <input type=\"text\" class=\"form-control\" id=\"gitUsername\" placeholder=\"Enter user name\" required=\"true\"\n               ng-model=\"login.user\">\n      </div>\n      <div class=\"form-group\">\n        <label for=\"gitPassword\">Password</label>\n        <input type=\"password\" class=\"form-control\" id=\"gitPassword\" placeholder=\"Password\" required=\"true\"\n               ng-model=\"login.password\">\n      </div>\n      <div class=\"form-group\">\n        <label for=\"gitEmail\">Email address</label>\n        <input type=\"email\" class=\"form-control\" id=\"gitEmail\" placeholder=\"Enter email\" required=\"true\"\n               ng-model=\"login.email\">\n      </div>\n      <div class=\"form-group\">\n        <button type=\"submit\" class=\"btn btn-primary\" ng-click=\"doLogin()\"\n                ng-disabled=\"!login.user || !login.password || !login.email\">\n          <i class=\"fa fa-sign-in\"></i> Sign In\n        </button>\n      </div>\n\n      <div class=\"form-group\" ng-show=\"forgotPasswordUrl\">\n          <a href=\"{{forgotPasswordUrl}}\">Forgot password?</a>\n      </div>\n\n      <div class=\"form-group\" ng-show=\"signUpUrl\">\n        <a href=\"{{signUpUrl}}\">Need an account? Sign up now.</a>\n      </div>\n    </form>\n  </div>\n\n  <div ng-hide=\"fetched || !login.authHeader || login.relogin\">\n    <div class=\"row\">\n      <div class=\"col-md-12\">\n        <div class=\"align-center\">\n          <i class=\"fa fa-spinner fa-spin\"></i>\n        </div>\n      </div>\n    </div>\n  </div>\n\n  <div ng-show=\"fetched && login.authHeader\">\n    <div ng-hide=\"projects.length\" class=\"align-center\">\n      <div class=\"padded-div\">\n        <div class=\"row\">\n          <div class=\"col-md-12\">\n            <p class=\"alert alert-info\">There are no git repositories yet. Please create one!</p>\n          </div>\n        </div>\n      </div>\n    </div>\n    <div ng-show=\"projects.length\">\n      <div class=\"row\">\n        <div class=\"col-md-12\">\n          <table class=\"table table-condensed table-striped\" hawtio-simple-table=\"tableConfig\"></table>\n        </div>\n      </div>\n    </div>\n  </div>\n</div>\n");
$templateCache.put("plugins/main/html/about.html","<div ng-controller=\"Main.About\">\n  <p>Version: {{info.version}}</p>\n  <p>Commit ID: {{info.commitId}}</p>\n  <table class=\"table table-striped\">\n    <thead>\n      <tr>\n        <th>\n          Name\n        </th>\n        <th>\n          Version\n        </th>\n      </tr>\n    </thead>\n    <tbody>\n      <tr ng-repeat=\"(key, info) in info.packages\">\n        <td>{{key}}</td>\n        <td>{{info.version || \'--\'}}</td>\n      </tr>\n    </tbody>\n  </table>\n</div>\n");
$templateCache.put("plugins/wiki/exemplar/document.html","<h2>This is a title</h2>\n\n<p>Here are some notes</p>");
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
$templateCache.put("plugins/wiki/html/viewNavBar.html","<div class=\"row\">\n  <div hawtio-breadcrumbs></div>\n</div>\n\n<!--\n<div class=\"row\">\n  <div hawtio-tabs></div>\n</div>\n-->\n<div ng-hide=\"inDashboard\" class=\"wiki logbar\" ng-controller=\"Wiki.NavBarController\">\n  <div class=\"wiki logbar-container\">\n    <ul class=\"nav nav-tabs\">\n      <li ng-show=\"branches.length || branch\">\n        <div hawtio-drop-down=\"branchMenuConfig\"></div>\n      </li>\n      <li ng-repeat=\"link in breadcrumbs\" ng-class=\'{active : isActive(link.href) && !objectId}\'>\n        <a class=\"breadcrumb-link\" ng-href=\"{{link.href}}\">\n          <span class=\"contained c-medium\">{{link.name}}</span>\n        </a>\n      </li>\n      <li ng-show=\"objectId\">\n        <a ng-href=\"{{historyLink}}{{hash}}\">History</a>\n      </li>\n      <li ng-show=\"objectId\" class=\"active\">\n        <a>{{objectId}}</a>\n      </li>\n\n      <li class=\"pull-right dropdown\">\n        <a href=\"\" class=\"dropdown-toggle\" data-toggle=\"dropdown\">\n          Actions <span class=\"caret\"></span>\n        </a>\n        <ul class=\"dropdown-menu\">\n          <li ng-show=\"sourceLink()\">\n            <a ng-href=\"{{sourceLink()}}\" title=\"View source code\"\n               data-placement=\"bottom\">\n              <i class=\"fa fa-file-o\"></i> Source</a>\n          </li>\n          <li>\n            <a ng-href=\"{{historyLink}}{{hash}}\" ng-hide=\"!historyLink\" title=\"View the history of this file\"\n               data-placement=\"bottom\">\n              <i class=\"fa fa-comments-alt\"></i> History</a>\n          </li>\n          <!--\n          <li class=\"divider\">\n          </li>\n          -->\n          <li ng-hide=\"gridOptions.selectedItems.length !== 1\" hawtio-show object-name=\"{{gitMBean}}\" method-name=\"rename\">\n            <a ng-click=\"openRenameDialog()\"\n               title=\"Rename the selected document\"\n               data-placement=\"bottom\">\n              <i class=\"fa fa-adjust\"></i> Rename</a>\n          </li>\n          <li ng-hide=\"!gridOptions.selectedItems.length\" hawtio-show object-name=\"{{gitMBean}}\" method-name=\"rename\">\n            <a ng-click=\"openMoveDialog()\"\n               title=\"move the selected documents to a new folder\"\n               data-placement=\"bottom\">\n              <i class=\"fa fa-move\"></i> Move</a>\n          </li>\n          <!--\n          <li class=\"divider\">\n          </li>\n          -->\n          <li ng-hide=\"!gridOptions.selectedItems.length\" hawtio-show object-name=\"{{gitMBean}}\" method-name=\"remove\">\n            <a ng-click=\"openDeleteDialog()\"\n               title=\"Delete the selected document(s)\"\n               data-placement=\"bottom\">\n              <i class=\"fa fa-remove\"></i> Delete</a>\n          </li>\n          <li class=\"divider\" ng-show=\"childActions.length\">\n          </li>\n          <li ng-repeat=\"childAction in childActions\">\n            <a ng-click=\"childAction.doAction()\"\n               title=\"{{childAction.title}}\"\n               data-placement=\"bottom\">\n              <i class=\"{{childAction.icon}}\"></i> {{childAction.name}}</a>\n          </li>\n        </ul>\n      </li>\n      <li class=\"pull-right\" hawtio-show object-name=\"{{gitMBean}}\" method-name=\"write\">\n        <a ng-href=\"{{editLink()}}{{hash}}\" ng-hide=\"!editLink()\" title=\"Edit this page\"\n           data-placement=\"bottom\">\n          <i class=\"fa fa-edit\"></i> Edit</a>\n      </li>\n      <li class=\"pull-right\" hawtio-show object-name=\"{{gitMBean}}\" method-name=\"write\">\n        <a ng-href=\"{{createLink()}}{{hash}}\"\n           title=\"Create new page\"\n           data-placement=\"bottom\">\n          <i class=\"fa fa-plus\"></i> Create</a>\n      </li>\n      <li class=\"pull-right\">\n        <div class=\"btn-group\" \n             ng-hide=\"!children || profile\">\n          <a class=\"btn btn-sm\"\n             ng-disabled=\"mode == ViewMode.List\"\n             href=\"\" \n             ng-click=\"setViewMode(ViewMode.List)\">\n            <i class=\"fa fa-list\"></i></a>\n          <a class=\"btn btn-sm\" \n             ng-disabled=\"mode == ViewMode.Icon\"\n             href=\"\" \n             ng-click=\"setViewMode(ViewMode.Icon)\">\n            <i class=\"fa fa-th-large\"></i></a>\n        </div>\n      </li>\n      <li class=\"pull-right\">\n        <a href=\"\" ng-hide=\"children || profile\" title=\"Add to dashboard\" ng-href=\"{{createDashboardLink()}}\"\n           data-placement=\"bottom\">\n          <i class=\"fa fa-share\"></i>\n        </a>\n      </li>\n    </ul>\n  </div>\n</div>\n\n\n");
$templateCache.put("plugins/wiki/html/viewPage.html","<div ng-controller=\"Wiki.ViewController\">\n  <script type=\"text/ng-template\" id=\"fileCellTemplate.html\">\n    <div class=\"ngCellText\"\n         title=\"{{fileName(row.entity)}} - Last Modified: {{row.entity.lastModified | date:\'medium\'}}, Size: {{row.entity.size}}\">\n      <a href=\"{{childLink(row.entity)}}\" class=\"file-name\" hawtio-file-drop=\"{{row.entity.fileName}}\" download-url=\"{{row.entity.downloadURL}}\">\n        <span class=\"file-icon\"\n              ng-class=\"fileClass(row.entity)\"\n              compile=\"fileIconHtml(row)\">\n        </span>{{fileName(row.entity)}}\n      </a>\n    </div>\n  </script>\n\n  <script type=\"text/ng-template\" id=\"fileColumnTemplate.html\">\n    <div class=\"ngHeaderSortColumn {{col.headerClass}}\"\n         ng-style=\"{\'cursor\': col.cursor}\"\n         ng-class=\"{ \'ngSorted\': !noSortVisible }\">\n      <div class=\"ngHeaderText\" ng-hide=\"pageId === \'/\'\">\n        <a ng-href=\"{{parentLink()}}\"\n           class=\"wiki-file-list-up\"\n           title=\"Open the parent folder\">\n          <i class=\"fa fa-level-up\"></i> Up a directory\n        </a>\n      </div>\n    </div>\n  </script>\n\n  <script type=\"text/ng-template\" id=\"imageTemplate.html\">\n    <img src=\"{{imageURL}}\">\n  </script>\n\n  <ng-include src=\"\'plugins/wiki/html/viewNavBar.html\'\"></ng-include>\n\n  <!-- Icon View -->\n  <div ng-show=\"mode == ViewMode.Icon\" class=\"wiki-fixed\">\n    <div ng-hide=\"!showAppHeader\">\n      <div class=\"row\">\n        <div class=\"col-md-12\">\n          <div kubernetes-json=\"kubernetesJson\"></div>\n        </div>\n      </div>\n    </div>\n    <div class=\"row\" ng-show=\"html && children\">\n      <div class=\"col-md-12 wiki-icon-view-header\">\n        <h5>Directories and Files</h5>\n      </div>\n    </div>\n    <div class=\"row\" ng-hide=\"!directory\">\n      <div class=\"col-md-12\" ng-controller=\"Wiki.FileDropController\">\n        <div class=\"wiki-icon-view\" nv-file-drop nv-file-over uploader=\"uploader\" over-class=\"ready-drop\">\n          <div class=\"column-box mouse-pointer well\"\n               ng-repeat=\"child in children track by $index\"\n               ng-class=\"isInGroup(gridOptions.selectedItems, child, \'selected\', \'\')\"\n               ng-click=\"toggleSelectionFromGroup(gridOptions.selectedItems, child)\">\n            <div class=\"row\">\n              <div class=\"col-md-2\" hawtio-file-drop=\"{{child.fileName}}\" download-url=\"{{child.downloadURL}}\">\n                  <span class=\"app-logo\" ng-class=\"fileClass(child)\" compile=\"fileIconHtml(child)\"></span>\n              </div>\n              <div class=\"col-md-10\">\n                <h3>\n                  <a href=\"{{childLink(child)}}\">{{child.displayName || child.name}}</a>\n                </h3>\n              </div>\n            </div>\n            <div class=\"row\" ng-show=\"child.summary\">\n              <div class=\"col-md-12\">\n                <p compile=\"marked(child.summary)\"></p>\n              </div>\n            </div>\n          </div>\n        </div>\n      </div>\n    </div>\n    <div ng-hide=\"!html\" wiki-href-adjuster wiki-title-linker>\n      <div class=\"row\" style=\"margin-left: 10px\">\n        <div class=\"col-md-12\">\n          <div compile=\"html\"></div>\n        </div>\n      </div>\n    </div>\n  </div>\n  <!-- end Icon view -->\n\n  <!-- start List view -->\n  <div ng-show=\"mode == ViewMode.List\" class=\"wiki-fixed\">\n    <hawtio-pane position=\"left\" width=\"300\">\n      <div ng-controller=\"Wiki.FileDropController\">\n        <div class=\"wiki-list-view\" nv-file-drop nv-file-over uploader=\"uploader\" over-class=\"ready-drop\">\n          <div class=\"wiki-grid\" hawtio-list=\"gridOptions\"></div>\n        </div>\n      </div>\n    </hawtio-pane>\n    <div class=\"row\">\n      <div ng-class=\"col-md-12\">\n        <div ng-hide=\"!showProfileHeader\">\n          <div class=\"row\">\n            <div class=\"col-md-12\">\n              <div fabric-profile-details version-id=\"versionId\" profile-id=\"profileId\"></div>\n              <p></p>\n            </div>\n          </div>\n        </div>\n        <div ng-hide=\"!showAppHeader\">\n          <div class=\"row\">\n            <div class=\"col-md-12\">\n              <div kubernetes-json=\"kubernetesJson\" children=\"children\"></div>\n            </div>\n          </div>\n        </div>\n        <div ng-hide=\"!html\" wiki-href-adjuster wiki-title-linker>\n          <div class=\"row\" style=\"margin-left: 10px\">\n            <div class=\"col-md-12\">\n              <div compile=\"html\"></div>\n            </div>\n          </div>\n        </div>\n      </div>\n    </div>\n  </div>\n  <!-- end List view -->\n  <div ng-include=\"sourceView\" class=\"editor-autoresize\"></div>\n</div>\n");
$templateCache.put("plugins/wiki/html/modal/deleteDialog.html","<div>\n  <form class=\"form-horizontal\" ng-submit=\"deleteAndCloseDialog()\">\n    <div class=\"modal-header\"><h4>Delete Document</h4></div>\n    <div class=\"modal-body\">\n      <div class=\"control-group\">\n        <p>You are about to delete\n          <ng-pluralize count=\"gridOptions.selectedItems.length\"\n                        when=\"{\'1\': \'this document!\', \'other\': \'these {} documents!\'}\">\n          </ng-pluralize>\n        </p>\n\n        <div ng-bind-html-unsafe=\"selectedFileHtml\"></div>\n        <p class=\"alert alert-danger\" ng-show=\"warning\" ng-bind-html-unsafe=\"warning\">\n        </p>\n      </div>\n    </div>\n    <div class=\"modal-footer\">\n      <input class=\"btn btn-primary\" type=\"submit\"\n             value=\"Delete\">\n      <button class=\"btn btn-warning cancel\" type=\"button\" ng-click=\"close()\">Cancel</button>\n    </div>\n  </form>\n</div>\n");
$templateCache.put("plugins/wiki/html/modal/moveDialog.html","<div>\n    <form class=\"form-horizontal\" ng-submit=\"moveAndCloseDialog()\">\n    <div class=\"modal-header\"><h4>Move Document</h4></div>\n    <div class=\"modal-body\">\n      <div class=\"control-group\">\n        <label class=\"control-label\" for=\"moveFolder\">Folder</label>\n\n        <div class=\"controls\">\n          <input type=\"text\" id=\"moveFolder\" ng-model=\"move.moveFolder\"\n                 typeahead=\"title for title in folderNames($viewValue) | filter:$viewValue\" typeahead-editable=\'true\'>\n        </div>\n      </div>\n    </div>\n    <div class=\"modal-footer\">\n      <input class=\"btn btn-primary\" type=\"submit\"\n             ng-disabled=\"!move.moveFolder\"\n             value=\"Move\">\n      <button class=\"btn btn-warning cancel\" type=\"button\" ng-click=\"close()\">Cancel</button>\n    </div>\n  </form>\n</div>");
$templateCache.put("plugins/wiki/html/modal/renameDialog.html","<div>\n  <form class=\"form-horizontal\" ng-submit=\"renameAndCloseDialog()\">\n    <div class=\"modal-header\"><h4>Rename Document</h4></div>\n    <div class=\"modal-body\">\n      <div class=\"row\">\n        <div class=\"form-group\">\n          <label class=\"col-sm-2 control-label\" for=\"renameFileName\">Name</label>\n\n          <div class=\"col-sm-10\">\n            <input type=\"text\" id=\"renameFileName\" ng-model=\"rename.newFileName\">\n          </div>\n        </div>\n\n        <div class=\"form-group\">\n          <div ng-show=\"fileExists.exists\" class=\"alert\">\n            Please choose a different name as <b>{{fileExists.name}}</b> already exists\n          </div>\n        </div>\n      </div>\n    </div>\n    <div class=\"modal-footer\">\n      <input class=\"btn btn-primary\" type=\"submit\"\n             ng-disabled=\"!fileName || fileExists.exists\"\n             value=\"Rename\">\n      <button class=\"btn btn-warning cancel\" type=\"button\" ng-click=\"close()\">Cancel</button>\n    </div>\n  </form>\n</div>\n");}]); hawtioPluginLoader.addModule("fabric8-console-templates");