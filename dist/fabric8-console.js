

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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImluY2x1ZGVzLmpzIiwid2lraS90cy93aWtpSGVscGVycy50cyIsIndpa2kvdHMvd2lraVBsdWdpbi50cyIsIndpa2kvdHMvY29tbWl0LnRzIiwid2lraS90cy9jcmVhdGUudHMiLCJ3aWtpL3RzL2VkaXQudHMiLCJ3aWtpL3RzL2ZpbGVEcm9wLnRzIiwid2lraS90cy9mb3JtVGFibGUudHMiLCJ3aWtpL3RzL2dpdFByZWZlcmVuY2VzLnRzIiwid2lraS90cy9oaXN0b3J5LnRzIiwid2lraS90cy9uYXZiYXIudHMiLCJ3aWtpL3RzL3ZpZXcudHMiLCJ3aWtpL3RzL3dpa2lEaWFsb2dzLnRzIiwid2lraS90cy93aWtpRGlyZWN0aXZlcy50cyIsIndpa2kvdHMvd2lraU5hdmlnYXRpb24udHMiLCJ3aWtpL3RzL3dpa2lSZXBvc2l0b3J5LnRzIiwid2lraS90cy93aWtpVG9wTGV2ZWwudHMiLCJtYWluL3RzL21haW5HbG9iYWxzLnRzIiwiZm9yZ2UvdHMvZm9yZ2VIZWxwZXJzLnRzIiwibWFpbi90cy9tYWluUGx1Z2luLnRzIiwibWFpbi90cy9hYm91dC50cyIsImZvcmdlL3RzL2ZvcmdlUGx1Z2luLnRzIiwiZm9yZ2UvdHMvY29tbWFuZC50cyIsImZvcmdlL3RzL2NvbW1hbmRzLnRzIiwiZm9yZ2UvdHMvcmVwby50cyIsImZvcmdlL3RzL3JlcG9zLnRzIl0sIm5hbWVzIjpbIldpa2kiLCJXaWtpLlZpZXdNb2RlIiwiV2lraS5pc0ZNQ0NvbnRhaW5lciIsIldpa2kuaXNXaWtpRW5hYmxlZCIsIldpa2kuZ29Ub0xpbmsiLCJXaWtpLmN1c3RvbVZpZXdMaW5rcyIsIldpa2kuY3JlYXRlV2l6YXJkVHJlZSIsIldpa2kuY3JlYXRlRm9sZGVyIiwiV2lraS5hZGRDcmVhdGVXaXphcmRGb2xkZXJzIiwiV2lraS5zdGFydExpbmsiLCJXaWtpLmlzSW5kZXhQYWdlIiwiV2lraS52aWV3TGluayIsIldpa2kuYnJhbmNoTGluayIsIldpa2kuZWRpdExpbmsiLCJXaWtpLmNyZWF0ZUxpbmsiLCJXaWtpLmVuY29kZVBhdGgiLCJXaWtpLmRlY29kZVBhdGgiLCJXaWtpLmZpbGVGb3JtYXQiLCJXaWtpLmZpbGVOYW1lIiwiV2lraS5maWxlUGFyZW50IiwiV2lraS5oaWRlRmlsZU5hbWVFeHRlbnNpb25zIiwiV2lraS5naXRSZXN0VVJMIiwiV2lraS5naXRVcmxQcmVmaXgiLCJXaWtpLmdpdFJlbGF0aXZlVVJMIiwiV2lraS5maWxlSWNvbkh0bWwiLCJXaWtpLmljb25DbGFzcyIsIldpa2kuaW5pdFNjb3BlIiwiV2lraS5sb2FkQnJhbmNoZXMiLCJXaWtpLnBhZ2VJZCIsIldpa2kucGFnZUlkRnJvbVVSSSIsIldpa2kuZmlsZUV4dGVuc2lvbiIsIldpa2kub25Db21wbGV0ZSIsIldpa2kucGFyc2VKc29uIiwiV2lraS5hZGp1c3RIcmVmIiwiV2lraS5jb21taXRQYXRoIiwiV2lraS51cGRhdGVWaWV3IiwiV2lraS5yZXR1cm5Ub0RpcmVjdG9yeSIsIldpa2kuZG9DcmVhdGUiLCJXaWtpLmRvQ3JlYXRlLnRvUGF0aCIsIldpa2kuZG9DcmVhdGUudG9Qcm9maWxlTmFtZSIsIldpa2kucHV0UGFnZSIsIldpa2kuZ2V0TmV3RG9jdW1lbnRQYXRoIiwiV2lraS5pc0NyZWF0ZSIsIldpa2kub25GaWxlQ29udGVudHMiLCJXaWtpLnVwZGF0ZVNvdXJjZVZpZXciLCJXaWtpLm9uRm9ybVNjaGVtYSIsIldpa2kuZ29Ub1ZpZXciLCJXaWtpLnNhdmVUbyIsIldpa2kuY2hpbGRMaW5rIiwiV2lraS5vblJlc3VsdHMiLCJXaWtpLm9uRm9ybURhdGEiLCJXaWtpLnN3aXRjaEZyb21WaWV3VG9DdXN0b21MaW5rIiwiV2lraS5sb2FkQnJlYWRjcnVtYnMiLCJXaWtpLmlzRGlmZlZpZXciLCJXaWtpLnZpZXdDb250ZW50cyIsIldpa2kub25GaWxlRGV0YWlscyIsIldpa2kuY2hlY2tGaWxlRXhpc3RzIiwiV2lraS5nZXRSZW5hbWVGaWxlUGF0aCIsIldpa2kuZ2V0UmVuYW1lRGlhbG9nIiwiV2lraS5nZXRNb3ZlRGlhbG9nIiwiV2lraS5nZXREZWxldGVEaWFsb2ciLCJXaWtpLm9mZnNldFRvcCIsIldpa2kuc2Nyb2xsVG9IYXNoIiwiV2lraS5zY3JvbGxUb0lkIiwiV2lraS5hZGRMaW5rcyIsIldpa2kub25FdmVudEluc2VydGVkIiwiV2lraS5jcmVhdGVTb3VyY2VCcmVhZGNydW1icyIsIldpa2kuY3JlYXRlRWRpdGluZ0JyZWFkY3J1bWIiLCJXaWtpLkdpdFdpa2lSZXBvc2l0b3J5IiwiV2lraS5HaXRXaWtpUmVwb3NpdG9yeS5jb25zdHJ1Y3RvciIsIldpa2kuR2l0V2lraVJlcG9zaXRvcnkuZ2V0UGFnZSIsIldpa2kuR2l0V2lraVJlcG9zaXRvcnkucHV0UGFnZSIsIldpa2kuR2l0V2lraVJlcG9zaXRvcnkuaGlzdG9yeSIsIldpa2kuR2l0V2lraVJlcG9zaXRvcnkuY29tbWl0SW5mbyIsIldpa2kuR2l0V2lraVJlcG9zaXRvcnkuY29tbWl0VHJlZSIsIldpa2kuR2l0V2lraVJlcG9zaXRvcnkuZGlmZiIsIldpa2kuR2l0V2lraVJlcG9zaXRvcnkuYnJhbmNoZXMiLCJXaWtpLkdpdFdpa2lSZXBvc2l0b3J5LmV4aXN0cyIsIldpa2kuR2l0V2lraVJlcG9zaXRvcnkucmV2ZXJ0VG8iLCJXaWtpLkdpdFdpa2lSZXBvc2l0b3J5LnJlbmFtZSIsIldpa2kuR2l0V2lraVJlcG9zaXRvcnkucmVtb3ZlUGFnZSIsIldpa2kuR2l0V2lraVJlcG9zaXRvcnkucmVtb3ZlUGFnZXMiLCJXaWtpLkdpdFdpa2lSZXBvc2l0b3J5LmRvR2V0IiwiV2lraS5HaXRXaWtpUmVwb3NpdG9yeS5kb1Bvc3QiLCJXaWtpLkdpdFdpa2lSZXBvc2l0b3J5LmRvUG9zdEZvcm0iLCJXaWtpLkdpdFdpa2lSZXBvc2l0b3J5LmNvbXBsZXRlUGF0aCIsIldpa2kuR2l0V2lraVJlcG9zaXRvcnkuZ2V0UGF0aCIsIldpa2kuR2l0V2lraVJlcG9zaXRvcnkuZ2V0TG9nUGF0aCIsIldpa2kuR2l0V2lraVJlcG9zaXRvcnkuZ2V0Q29udGVudCIsIldpa2kuR2l0V2lraVJlcG9zaXRvcnkuanNvbkNoaWxkQ29udGVudHMiLCJXaWtpLkdpdFdpa2lSZXBvc2l0b3J5LmdpdCIsIk1haW4iLCJGb3JnZSIsIkZvcmdlLmlzRm9yZ2UiLCJGb3JnZS5pbml0U2NvcGUiLCJGb3JnZS5jb21tYW5kTGluayIsIkZvcmdlLmNvbW1hbmRzTGluayIsIkZvcmdlLnJlcG9zQXBpVXJsIiwiRm9yZ2UucmVwb0FwaVVybCIsIkZvcmdlLmNvbW1hbmRBcGlVcmwiLCJGb3JnZS5leGVjdXRlQ29tbWFuZEFwaVVybCIsIkZvcmdlLnZhbGlkYXRlQ29tbWFuZEFwaVVybCIsIkZvcmdlLmNvbW1hbmRJbnB1dEFwaVVybCIsIkZvcmdlLm1vZGVsUHJvamVjdCIsIkZvcmdlLnNldE1vZGVsQ29tbWFuZHMiLCJGb3JnZS5nZXRNb2RlbENvbW1hbmRzIiwiRm9yZ2UubW9kZWxDb21tYW5kSW5wdXRNYXAiLCJGb3JnZS5nZXRNb2RlbENvbW1hbmRJbnB1dHMiLCJGb3JnZS5zZXRNb2RlbENvbW1hbmRJbnB1dHMiLCJGb3JnZS5lbnJpY2hSZXBvIiwiRm9yZ2UuY3JlYXRlSHR0cENvbmZpZyIsIkZvcmdlLmFkZFF1ZXJ5QXJndW1lbnQiLCJGb3JnZS5jcmVhdGVIdHRwVXJsIiwiRm9yZ2UuY29tbWFuZE1hdGNoZXNUZXh0IiwiRm9yZ2UuaXNMb2dnZWRJbnRvR29ncyIsIkZvcmdlLnJlZGlyZWN0VG9Hb2dzTG9naW5JZlJlcXVpcmVkIiwiRm9yZ2Uub25Sb3V0ZUNoYW5nZWQiLCJGb3JnZS51cGRhdGVTY2hlbWEiLCJGb3JnZS52YWxpZGF0ZSIsIkZvcmdlLnRvQmFja2dyb3VuZFN0eWxlIiwiRm9yZ2UudXBkYXRlRGF0YSIsIkZvcmdlLm9uU2NoZW1hTG9hZCIsIkZvcmdlLmNvbW1hbmRNYXRjaGVzIiwiRm9yZ2UuZG9EZWxldGUiLCJGb3JnZS51cGRhdGVMaW5rcyJdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQ0tBLElBQU8sSUFBSSxDQTY4QlY7QUE3OEJELFdBQU8sSUFBSSxFQUFDLENBQUM7SUFFQUEsUUFBR0EsR0FBa0JBLE1BQU1BLENBQUNBLEdBQUdBLENBQUNBLE1BQU1BLENBQUNBLENBQUNBO0lBRXhDQSxvQkFBZUEsR0FBR0EsQ0FBQ0EsdUNBQXVDQSxFQUFFQSwwQ0FBMENBLENBQUNBLENBQUNBO0lBQ3hHQSxxQkFBZ0JBLEdBQUdBLENBQUNBLDZDQUE2Q0EsQ0FBQ0EsQ0FBQ0E7SUFDbkVBLHFCQUFnQkEsR0FBR0EsQ0FBQ0Esd0NBQXdDQSxDQUFDQSxDQUFDQTtJQUM5REEsb0JBQWVBLEdBQUdBLENBQUNBLDhCQUE4QkEsQ0FBQ0EsQ0FBQ0E7SUFDbkRBLHVCQUFrQkEsR0FBR0EsQ0FBQ0Esd0NBQXdDQSxDQUFDQSxDQUFDQTtJQUVoRUEsOEJBQXlCQSxHQUFHQSxDQUFDQSxTQUFTQSxFQUFFQSxVQUFVQSxFQUFFQSxHQUFHQSxDQUFDQSxDQUFDQTtJQUVwRUEsV0FBWUEsUUFBUUE7UUFBR0MsdUNBQUlBO1FBQUVBLHVDQUFJQTtJQUFDQSxDQUFDQSxFQUF2QkQsYUFBUUEsS0FBUkEsYUFBUUEsUUFBZUE7SUFBbkNBLElBQVlBLFFBQVFBLEdBQVJBLGFBQXVCQSxDQUFBQTtJQUFBQSxDQUFDQTtJQUt6QkEsd0JBQW1CQSxHQUFHQSxDQUFDQSxZQUFZQSxFQUFFQSxnQkFBZ0JBLEVBQUVBLGVBQWVBLEVBQUVBLG1CQUFtQkEsRUFBRUEsaUJBQWlCQSxDQUFDQSxDQUFDQTtJQVFoSEEsbUJBQWNBLEdBQUdBLENBQUNBLFVBQVVBLENBQUNBLENBQUNBO0lBRXpDQSxJQUFJQSxzQkFBc0JBLEdBQUdBLG1CQUFtQkEsQ0FBQ0E7SUFDakRBLElBQUlBLDZCQUE2QkEsR0FBR0EseURBQXlEQSxDQUFDQTtJQUU5RkEsSUFBSUEsK0JBQStCQSxHQUFHQSxFQUFFQSxDQUFDQTtJQUV6Q0EsSUFBSUEsK0JBQStCQSxHQUFHQSxnQkFBZ0JBLENBQUNBO0lBQ3ZEQSxJQUFJQSxzQ0FBc0NBLEdBQUdBLG9FQUFvRUEsQ0FBQ0E7SUFrQnZHQSxzQkFBaUJBLEdBQUdBO1FBQzdCQTtZQUNFQSxLQUFLQSxFQUFFQSxRQUFRQTtZQUNmQSxPQUFPQSxFQUFFQSwwQ0FBMENBO1lBQ25EQSxNQUFNQSxFQUFFQSxJQUFJQTtZQUNaQSxJQUFJQSxFQUFFQSw0QkFBNEJBO1lBQ2xDQSxRQUFRQSxFQUFFQSxVQUFVQTtZQUNwQkEsS0FBS0EsRUFBRUEsK0JBQStCQTtZQUN0Q0EsT0FBT0EsRUFBRUEsc0NBQXNDQTtTQUNoREE7UUE4RkRBO1lBQ0VBLEtBQUtBLEVBQUVBLGlCQUFpQkE7WUFDeEJBLE9BQU9BLEVBQUVBLDREQUE0REE7WUFDckVBLFFBQVFBLEVBQUVBLDRCQUE0QkE7WUFDdENBLEtBQUtBLEVBQUVBLHNCQUFzQkE7WUFDN0JBLE9BQU9BLEVBQUVBLDZCQUE2QkE7WUFDdENBLFNBQVNBLEVBQUVBLGFBQWFBO1NBQ3pCQTtRQUNEQTtZQUNFQSxLQUFLQSxFQUFFQSxXQUFXQTtZQUNsQkEsT0FBT0EsRUFBRUEsNkJBQTZCQTtZQUN0Q0EsUUFBUUEsRUFBRUEsZUFBZUE7WUFDekJBLEtBQUtBLEVBQUVBLHNCQUFzQkE7WUFDN0JBLE9BQU9BLEVBQUVBLDZCQUE2QkE7WUFDdENBLFNBQVNBLEVBQUVBLE9BQU9BO1NBQ25CQTtRQXNHREE7WUFDRUEsS0FBS0EsRUFBRUEsbUJBQW1CQTtZQUMxQkEsT0FBT0EsRUFBRUEsNkdBQTZHQTtZQUN0SEEsUUFBUUEsRUFBRUEsV0FBV0E7WUFDckJBLEtBQUtBLEVBQUVBLHNCQUFzQkE7WUFDN0JBLE9BQU9BLEVBQUVBLDZCQUE2QkE7WUFDdENBLFNBQVNBLEVBQUVBLEtBQUtBO1NBQ2pCQTtRQUNEQTtZQUNFQSxLQUFLQSxFQUFFQSxlQUFlQTtZQUN0QkEsT0FBT0EsRUFBRUEsbUJBQW1CQTtZQUM1QkEsUUFBUUEsRUFBRUEsZUFBZUE7WUFDekJBLEtBQUtBLEVBQUVBLHNCQUFzQkE7WUFDN0JBLE9BQU9BLEVBQUVBLDZCQUE2QkE7WUFDdENBLFNBQVNBLEVBQUVBLE1BQU1BO1NBQ2xCQTtRQUNEQTtZQUNFQSxLQUFLQSxFQUFFQSxlQUFlQTtZQUN0QkEsT0FBT0EsRUFBRUEsNkRBQTZEQTtZQUN0RUEsUUFBUUEsRUFBRUEsZUFBZUE7WUFDekJBLEtBQUtBLEVBQUVBLHNCQUFzQkE7WUFDN0JBLE9BQU9BLEVBQUVBLDZCQUE2QkE7WUFDdENBLFNBQVNBLEVBQUVBLE9BQU9BO1NBQ25CQTtRQUNEQTtZQUNFQSxLQUFLQSxFQUFFQSxjQUFjQTtZQUNyQkEsT0FBT0EsRUFBRUEsdUJBQXVCQTtZQUNoQ0EsUUFBUUEsRUFBRUEsY0FBY0E7WUFDeEJBLEtBQUtBLEVBQUVBLHNCQUFzQkE7WUFDN0JBLE9BQU9BLEVBQUVBLDZCQUE2QkE7WUFDdENBLFNBQVNBLEVBQUVBLE1BQU1BO1NBQ2xCQTtRQUNEQTtZQUNFQSxLQUFLQSxFQUFFQSxtQkFBbUJBO1lBQzFCQSxPQUFPQSxFQUFFQSxrREFBa0RBO1lBQzNEQSxRQUFRQSxFQUFFQTtnQkFDUkE7b0JBQ0VBLEtBQUtBLEVBQUVBLG9CQUFvQkE7b0JBQzNCQSxPQUFPQSxFQUFFQSxvREFBb0RBO29CQUM3REEsSUFBSUEsRUFBRUEsc0JBQXNCQTtvQkFDNUJBLFFBQVFBLEVBQUVBLFdBQVdBO29CQUNyQkEsS0FBS0EsRUFBRUEsc0JBQXNCQTtvQkFDN0JBLE9BQU9BLEVBQUVBLDZCQUE2QkE7b0JBQ3RDQSxTQUFTQSxFQUFFQSxNQUFNQTtpQkFDbEJBO2dCQUNEQTtvQkFDRUEsS0FBS0EsRUFBRUEsbUNBQW1DQTtvQkFDMUNBLE9BQU9BLEVBQUVBLDhFQUE4RUE7b0JBQ3ZGQSxJQUFJQSxFQUFFQSxzQkFBc0JBO29CQUM1QkEsUUFBUUEsRUFBRUEscUJBQXFCQTtvQkFDL0JBLEtBQUtBLEVBQUVBLHNCQUFzQkE7b0JBQzdCQSxPQUFPQSxFQUFFQSw2QkFBNkJBO29CQUN0Q0EsU0FBU0EsRUFBRUEsTUFBTUE7aUJBQ2xCQTtnQkFDREE7b0JBQ0VBLEtBQUtBLEVBQUVBLDJCQUEyQkE7b0JBQ2xDQSxPQUFPQSxFQUFFQSxvRkFBb0ZBO29CQUM3RkEsSUFBSUEsRUFBRUEsc0JBQXNCQTtvQkFDNUJBLFFBQVFBLEVBQUVBLGtCQUFrQkE7b0JBQzVCQSxLQUFLQSxFQUFFQSxzQkFBc0JBO29CQUM3QkEsT0FBT0EsRUFBRUEsNkJBQTZCQTtvQkFDdENBLFNBQVNBLEVBQUVBLE1BQU1BO2lCQUNsQkE7YUFDRkE7U0FDRkE7UUFDREE7WUFDRUEsS0FBS0EsRUFBRUEsdUJBQXVCQTtZQUM5QkEsT0FBT0EsRUFBRUEsZ0RBQWdEQTtZQUN6REEsSUFBSUEsRUFBRUEsNEJBQTRCQTtZQUNsQ0EsUUFBUUEsRUFBRUEsbUJBQW1CQTtZQUM3QkEsS0FBS0EsRUFBRUEsc0JBQXNCQTtZQUM3QkEsT0FBT0EsRUFBRUEsNkJBQTZCQTtZQUN0Q0EsU0FBU0EsRUFBRUEsTUFBTUE7U0FDbEJBO0tBQ0ZBLENBQUNBO0lBR0ZBLFNBQWdCQSxjQUFjQSxDQUFDQSxTQUFTQTtRQUN0Q0UsTUFBTUEsQ0FBQ0EsS0FBS0EsQ0FBQ0E7SUFDZkEsQ0FBQ0E7SUFGZUYsbUJBQWNBLEdBQWRBLGNBRWZBLENBQUFBO0lBR0RBLFNBQWdCQSxhQUFhQSxDQUFDQSxTQUFTQSxFQUFFQSxPQUFPQSxFQUFFQSxZQUFZQTtRQUM1REcsTUFBTUEsQ0FBQ0EsSUFBSUEsQ0FBQ0E7SUFJZEEsQ0FBQ0E7SUFMZUgsa0JBQWFBLEdBQWJBLGFBS2ZBLENBQUFBO0lBRURBLFNBQWdCQSxRQUFRQSxDQUFDQSxJQUFJQSxFQUFFQSxRQUFRQSxFQUFFQSxTQUFTQTtRQUNoREksSUFBSUEsSUFBSUEsR0FBR0EsSUFBSUEsQ0FBQ0EsV0FBV0EsQ0FBQ0EsSUFBSUEsRUFBRUEsR0FBR0EsQ0FBQ0EsQ0FBQ0E7UUFDdkNBLFFBQVFBLENBQUNBO1lBQ1BBLFFBQUdBLENBQUNBLEtBQUtBLENBQUNBLHdCQUF3QkEsR0FBR0EsSUFBSUEsQ0FBQ0EsQ0FBQ0E7WUFDM0NBLFNBQVNBLENBQUNBLEdBQUdBLENBQUNBLElBQUlBLENBQUNBLENBQUNBO1FBQ3RCQSxDQUFDQSxFQUFFQSxHQUFHQSxDQUFDQSxDQUFDQTtJQUNWQSxDQUFDQTtJQU5lSixhQUFRQSxHQUFSQSxRQU1mQSxDQUFBQTtJQU9EQSxTQUFnQkEsZUFBZUEsQ0FBQ0EsTUFBTUE7UUFDcENLLElBQUlBLE1BQU1BLEdBQUdBLElBQUlBLENBQUNBLFdBQVdBLENBQUNBLElBQUlBLENBQUNBLFNBQVNBLENBQUNBLE1BQU1BLENBQUNBLEVBQUVBLEdBQUdBLENBQUNBLENBQUNBO1FBQzNEQSxNQUFNQSxDQUFDQSx3QkFBbUJBLENBQUNBLEdBQUdBLENBQUNBLFVBQUFBLElBQUlBLElBQUlBLE9BQUFBLE1BQU1BLEdBQUdBLElBQUlBLEVBQWJBLENBQWFBLENBQUNBLENBQUNBO0lBQ3hEQSxDQUFDQTtJQUhlTCxvQkFBZUEsR0FBZkEsZUFHZkEsQ0FBQUE7SUFRREEsU0FBZ0JBLGdCQUFnQkEsQ0FBQ0EsU0FBU0EsRUFBRUEsTUFBTUE7UUFDaERNLElBQUlBLElBQUlBLEdBQUdBLFlBQVlBLENBQUNBLGVBQWVBLENBQUNBLENBQUNBO1FBQ3pDQSxzQkFBc0JBLENBQUNBLFNBQVNBLEVBQUVBLE1BQU1BLEVBQUVBLElBQUlBLEVBQUVBLHNCQUFpQkEsQ0FBQ0EsQ0FBQ0E7UUFDbkVBLE1BQU1BLENBQUNBLElBQUlBLENBQUNBO0lBQ2RBLENBQUNBO0lBSmVOLHFCQUFnQkEsR0FBaEJBLGdCQUlmQSxDQUFBQTtJQUVEQSxTQUFTQSxZQUFZQSxDQUFDQSxJQUFJQTtRQUN4Qk8sTUFBTUEsQ0FBQ0E7WUFDTEEsSUFBSUEsRUFBRUEsSUFBSUE7WUFDVkEsUUFBUUEsRUFBRUEsRUFBRUE7U0FDYkEsQ0FBQ0E7SUFDSkEsQ0FBQ0E7SUFFRFAsU0FBZ0JBLHNCQUFzQkEsQ0FBQ0EsU0FBU0EsRUFBRUEsTUFBTUEsRUFBRUEsTUFBTUEsRUFBRUEsU0FBZ0JBO1FBQ2hGUSxPQUFPQSxDQUFDQSxPQUFPQSxDQUFDQSxTQUFTQSxFQUFFQSxVQUFDQSxRQUFRQTtZQUVsQ0EsRUFBRUEsQ0FBQ0EsQ0FBRUEsUUFBUUEsQ0FBQ0EsU0FBVUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0JBQ3pCQSxFQUFFQSxDQUFDQSxDQUFFQSxRQUFRQSxDQUFDQSxTQUFTQSxDQUFDQSxJQUFLQSxDQUFDQSxDQUFDQSxDQUFDQTtvQkFDOUJBLFFBQVFBLENBQUNBLFNBQVNBLENBQUNBLElBQUlBLENBQUNBLFNBQVNBLEVBQUVBLE1BQU1BLENBQUNBLENBQUNBO2dCQUM3Q0EsQ0FBQ0E7WUFDSEEsQ0FBQ0E7WUFFREEsSUFBSUEsS0FBS0EsR0FBR0EsUUFBUUEsQ0FBQ0EsS0FBS0EsSUFBSUEsR0FBR0EsQ0FBQ0E7WUFDbENBLElBQUlBLElBQUlBLEdBQUdBLFlBQVlBLENBQUNBLEtBQUtBLENBQUNBLENBQUNBO1lBQy9CQSxJQUFJQSxDQUFDQSxNQUFNQSxHQUFHQSxNQUFNQSxDQUFDQTtZQUNyQkEsSUFBSUEsQ0FBQ0EsTUFBTUEsR0FBR0EsUUFBUUEsQ0FBQ0E7WUFFdkJBLElBQUlBLFFBQVFBLEdBQUdBLFFBQVFBLENBQUNBLFFBQVFBLENBQUNBO1lBQ2pDQSxFQUFFQSxDQUFDQSxDQUFDQSxRQUFRQSxDQUFDQSxDQUFDQSxDQUFDQTtnQkFDYkEsSUFBSUEsQ0FBQ0EsUUFBUUEsR0FBR0EsUUFBUUEsQ0FBQ0E7WUFDM0JBLENBQUNBO1lBRURBLElBQUlBLEdBQUdBLEdBQUdBLFFBQVFBLENBQUNBLFFBQVFBLENBQUNBO1lBQzVCQSxJQUFJQSxTQUFTQSxHQUFHQSxNQUFNQSxDQUFDQSxHQUFHQSxJQUFJQSxFQUFFQSxDQUFDQTtZQUNqQ0EsSUFBSUEsQ0FBQ0EsR0FBR0EsR0FBR0EsU0FBU0EsR0FBR0EsU0FBU0EsR0FBR0EsR0FBR0EsR0FBR0EsR0FBR0EsR0FBR0EsR0FBR0EsQ0FBQ0E7WUFDbkRBLElBQUlBLElBQUlBLEdBQUdBLFFBQVFBLENBQUNBLElBQUlBLENBQUNBO1lBQ3pCQSxFQUFFQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSxDQUFDQSxDQUFDQTtnQkFDVEEsSUFBSUEsQ0FBQ0EsSUFBSUEsR0FBR0EsSUFBSUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0E7WUFDN0JBLENBQUNBO1lBR0RBLElBQUlBLE9BQU9BLEdBQUdBLFFB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QUNBO0lBZGV6QixjQUFTQSxHQUFUQSxTQWNmQSxDQUFBQTtJQVlEQSxTQUFnQkEsU0FBU0EsQ0FBQ0EsTUFBTUEsRUFBRUEsWUFBWUEsRUFBRUEsU0FBU0E7UUFDdkQwQixNQUFNQSxDQUFDQSxNQUFNQSxHQUFHQSxJQUFJQSxDQUFDQSxNQUFNQSxDQUFDQSxZQUFZQSxFQUFFQSxTQUFTQSxDQUFDQSxDQUFDQTtRQUNyREEsTUFBTUEsQ0FBQ0EsS0FBS0EsR0FBR0EsWUFBWUEsQ0FBQ0EsT0FBT0EsQ0FBQ0EsQ0FBQ0E7UUFDckNBLE1BQU1BLENBQUNBLE1BQU1BLEdBQUdBLFlBQVlBLENBQUNBLFFBQVFBLENBQUNBLENBQUNBO1FBQ3ZDQSxNQUFNQSxDQUFDQSxTQUFTQSxHQUFHQSxZQUFZQSxDQUFDQSxXQUFXQSxDQUFDQSxDQUFDQTtRQUM3Q0EsTUFBTUEsQ0FBQ0EsU0FBU0EsR0FBR0EsWUFBWUEsQ0FBQ0EsV0FBV0EsQ0FBQ0EsQ0FBQ0E7UUFDN0NBLE1BQU1BLENBQUNBLE1BQU1BLEdBQUdBLFlBQVlBLENBQUNBLFFBQVFBLENBQUNBLElBQUlBLFNBQVNBLENBQUNBLE1BQU1BLEVBQUVBLENBQUNBLFFBQVFBLENBQUNBLENBQUNBO1FBQ3ZFQSxNQUFNQSxDQUFDQSxRQUFRQSxHQUFHQSxZQUFZQSxDQUFDQSxVQUFVQSxDQUFDQSxJQUFJQSxZQUFZQSxDQUFDQSxlQUFlQSxDQUFDQSxDQUFDQTtRQUM1RUEsTUFBTUEsQ0FBQ0EsU0FBU0EsR0FBR0EsU0FBU0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0E7UUFDckNBLE1BQU1BLENBQUNBLFNBQVNBLEdBQUdBLFFBQVFBLENBQUNBLE1BQU1BLEVBQUVBLE1BQU1BLENBQUNBLE1BQU1BLEVBQUVBLFNBQVNBLENBQUNBLENBQUNBO1FBQzlEQSxNQUFNQSxDQUFDQSxXQUFXQSxHQUFHQSxTQUFTQSxDQUFDQSxNQUFNQSxDQUFDQSxHQUFHQSxXQUFXQSxHQUFHQSxDQUFDQSxNQUFNQSxDQUFDQSxNQUFNQSxJQUFJQSxFQUFFQSxDQUFDQSxDQUFDQTtR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QUFJQSxHQUFHQSxTQUFTQSxDQUFDQSxJQUFJQSxFQUFFQSxDQUFDQTtRQUM1QkEsSUFBSUEsVUFBVUEsR0FBR0EsSUFBSUEsQ0FBQ0E7UUFDdEJBLElBQUlBLEdBQUdBLEdBQUdBLElBQUlBLENBQUNBLFdBQVdBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBO1FBQ2hDQSxFQUFFQSxDQUFDQSxDQUFDQSxHQUFHQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUNaQSxJQUFJQSxRQUFRQSxHQUFHQSxJQUFJQSxDQUFDQSxTQUFTQSxDQUFDQSxHQUFHQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUN2Q0EsRUFBRUEsQ0FBQ0EsQ0FBQ0EsUUFBUUEsQ0FBQ0EsT0FBT0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0JBQy9CQSxVQUFVQSxHQUFHQSxJQUFJQSxDQUFDQSxTQUFTQSxDQUFDQSxDQUFDQSxFQUFFQSxHQUFHQSxDQUFDQSxDQUFDQTtZQUN0Q0EsQ0FBQ0E7UUFDSEEsQ0FBQ0E7UUFHREEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsVUFBVUEsQ0FBQ0EsS0FBS0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7WUFDM0JBLElBQUlBLEtBQUtBLEdBQUdBLElBQUlBLENBQUNBLEtBQUtBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBO1lBQzVCQSxJQUFJQSxTQUFTQSxHQUFHQSxVQUFVQSxDQUFDQSxLQUFLQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQTtZQUN0Q0EsSUFBSUEsT0FBT0EsR0FBR0EsS0FBS0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsVUFBQ0EsSUFBSUE7Z0JBQzlCQSxNQUFNQSxDQUFDQSxJQUFJQSxLQUFLQSxJQUFJQSxDQUFDQTtZQUN2QkEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7WUFDSEEsS0FBS0EsR0FBR0EsS0FBS0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsS0FBS0EsQ0FBQ0EsTUFBTUEsR0FBR0EsT0FBT0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0E7WUFDbERBLFNBQVNBLEdBQUdBLFNBQVNBLENBQUNBLEtBQUtBLENBQUNBLFNBQVNBLENBQUNBLE1BQU1BLEdBQUdBLE9BQU9BLENBQUNBLE1BQU1BLENBQUNBLENBQUNBO1lBRS9EQSxNQUFNQSxDQUFDQSxHQUFHQSxHQUFHQSxTQUFTQSxDQUFDQSxJQUFJQSxDQUFDQSxHQUFHQSxDQUFDQSxHQUFHQSxHQUFHQSxHQUFHQSxLQUFLQSxDQUFDQSxJQUFJQSxDQUFDQSxHQUFHQSxDQUFDQSxHQUFHQSxTQUFTQSxHQUFHQSxTQUFTQSxDQUFDQSxJQUFJQSxFQUFFQSxDQUFDQTtRQUMxRkEsQ0FBQ0E7UUFHREEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsVUFBVUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7WUFDekJBLE1BQU1BLENBQUNBLElBQUlBLENBQUNBLFVBQVVBLENBQUNBLE1BQU1BLEVBQUVBLElBQUlBLEdBQUdBLFNBQVNBLEVBQUVBLFNBQVNBLENBQUNBLEdBQUdBLFNBQVNBLENBQUNBO1FBQzFFQSxDQUFDQTtRQUVEQSxFQUFFQSxDQUFDQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSx5QkFBeUJBLENBQUNBLEdBQUdBLENBQUNBLFVBQUNBLE9BQU9BO1lBQzlDQSxNQUFNQSxDQUFDQSxJQUFJQSxDQUFDQSxVQUFVQSxDQUFDQSxPQUFPQSxDQUFDQSxDQUFDQTtRQUNsQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7WUFDSEEsTUFBTUEsQ0FBQ0EsR0FBR0EsR0FBR0EsVUFBVUEsR0FBR0EsR0FBR0EsR0FBR0EsSUFBSUEsR0FBR0EsU0FBU0EsR0FBR0EsU0FBU0EsQ0FBQ0EsSUFBSUEsRUFBRUEsQ0FBQ0E7UUFDdEVBLENBQUNBO1FBQUNBLElBQUlBLENBQUNBLENBQUNBO1lBQ05BLE1BQU1BLENBQUNBLElBQUlBLENBQUNBO1FBQ2RBLENBQUNBO0lBQ0hBLENBQUNBO0lBekNlakMsZUFBVUEsR0FBVkEsVUF5Q2ZBLENBQUFB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QTt3QkFDbkVBLFNBQVNBLENBQUNBLElBQUlBLENBQUNBLElBQUlBLENBQUNBLE1BQU1BLENBQUNBLFNBQVNBLENBQUNBLENBQUNBLENBQUNBO3dCQUN2Q0EsSUFBSUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0E7b0JBQ3RCQSxDQUFDQSxDQUFBQTtnQkFDSEEsQ0FBQ0E7Z0JBQ0RBLE1BQU1BLENBQUNBLGdCQUFnQkEsQ0FBQ0EsS0FBS0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsUUFBUUEsQ0FBQ0EsQ0FBQ0E7WUFDL0NBLENBQUNBLENBQUNBLENBQUNBO1lBQ0hBLGNBQWNBLENBQUNBLG1CQUFtQkEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsZ0JBQWdCQSxDQUFDQSxLQUFLQSxDQUFDQSxDQUFDQTtRQUNwRUEsQ0FBQ0EsRUFBRUEsSUFBSUEsQ0FBQ0EsQ0FBQ0E7UUFFVEEsTUFBTUEsQ0FBQ0EsVUFBVUEsR0FBR0E7WUFDbEJBLElBQUlBLE1BQU1BLEdBQUdBLElBQUlBLENBQUNBLE1BQU1BLENBQUNBLFlBQVlBLEVBQUVBLFNBQVNBLENBQUNBLENBQUNBO1lBQ2xEQSxNQUFNQSxDQUFDQSxJQUFJQSxDQUFDQSxVQUFVQSxDQUFDQSxNQUFNQSxFQUFFQSxNQUFNQSxFQUFFQSxTQUFTQSxDQUFDQSxDQUFDQTtRQUNwREEsQ0FBQ0EsQ0FBQ0E7UUFFRkEsTUFBTUEsQ0FBQ0EsU0FBU0EsR0FBR0EsY0FBU0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0E7UUFFckNBLE1BQU1BLENBQUNBLFVBQVVBLEdBQUdBO1lBQ2xCQSxJQUFJQSxJQUFJQSxHQUFHQSxTQUFTQSxDQUFDQSxJQUFJQSxFQUFFQSxDQUFDQTtZQUM1QkEsSUFBSUEsTUFBTUEsR0FBV0EsSUFBSUEsQ0FBQ0E7WUFDMUJBLE9BQU9BLENBQUNBLE9BQU9BLENBQUNBLElBQUlBLENBQUNBLGVBQWVBLENBQUNBLE1BQU1BLENBQUNBLEVBQUVBLFVBQUNBLElBQUlBO2dCQUNqREEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsVUFBVUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7b0JBQzFCQSxNQUFNQSxHQUFXQSxJQUFJQSxDQUFDQSxVQUFVQSxDQUFDQSxTQUFTQSxFQUFFQSxJQUFJQSxDQUFDQSxTQUFTQSxDQUFDQSxNQUFNQSxDQUFDQSxHQUFHQSxPQUFPQSxHQUFHQSxJQUFJQSxDQUFDQSxTQUFTQSxDQUFDQSxJQUFJQSxDQUFDQSxNQUFNQSxDQUFDQSxDQUFDQSxDQUFBQTtnQkFDN0dBLENBQUNBO1lBQ0hBLENBQUNBLENBQUNBLENBQUNBO1lBRUhBLE1BQU1BLENBQUNBLENBQUNBLENBQUNBLE1BQU1BLElBQUlBLFNBQVNBLENBQUNBLE1BQU1BLEVBQUVBLENBQUNBLE1BQU1BLENBQUNBLENBQUNBLEdBQ3BDQSxJQUFJQSxDQUFDQSxVQUFVQSxDQUFDQSxTQUFTQSxFQUFFQSxHQUFHQSxHQUFHQSxJQUFJQSxFQUFFQSxDQUFDQSxNQUFNQSxDQUFDQSxDQUFDQSxHQUNoREEsTUFBTUEsQ0FBQ0E7UUFDbkJBLENBQUNBLENBQUNBO1FBRUZBLE1BQU1BLENBQUNBLFFBQVFBLEdBQUdBLFVBQUNBLElBQUlBO1lBQ3JCQSxFQUFFQSxDQUFDQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSxDQUFDQSxDQUFDQTtnQkFDVkEsTUFBTUEsQ0FBQ0EsS0FBS0EsQ0FBQ0E7WUFDZkEsQ0FBQ0E7WUFDREEsTUFBTUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsUUFBUUEsQ0FBQ0EsWUFBWUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7UUFDN0NBLENBQUNBLENBQUNBO1FBRUZBLE1BQU1BLENBQUNBLEdBQUdBLENBQUNBLHFCQUFxQkEsRUFBRUEsVUFBVUEsS0FBS0EsRUFBRUEsT0FBT0EsRUFBRUEsUUFBUUE7WUFFbEUsVUFBVSxDQUFDLGVBQWUsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUNsQyxDQUFDLENBQUNBLENBQUNBO1FBRUhBLGVBQWVBLEVBQUVBLENBQUNBO1FBRWxCQSxTQUFTQSwwQkFBMEJBLENBQUNBLFVBQVVBLEVBQUVBLElBQUlBO1lBQ2xEbUQsSUFBSUEsSUFBSUEsR0FBR0EsVUFBVUEsQ0FBQ0EsSUFBSUEsQ0FBQ0E7WUFDM0JBLEVBQUVBLENBQUNBLENBQUNBLElBQUlBLENBQUNBLENBQUNBLENBQUNBO2dCQUNUQSxVQUFVQSxDQUFDQSxJQUFJQSxHQUFHQSxJQUFJQSxDQUFDQSxPQUFPQSxDQUFDQSxXQUFXQSxFQUFFQSxJQUFJQSxDQUFDQSxDQUFDQTtZQUNwREEsQ0FBQ0E7UUFDSEEsQ0FBQ0E7UUFFRG5ELFNBQVNBLGVBQWVBO1lBQ3RCb0QsSUFBSUEsS0FBS0EsR0FBR0EsSUFBSUEsQ0FBQ0EsU0FBU0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0E7WUFDbkNBLElBQUlBLElBQUlBLEdBQUdBLEtBQUtBLEdBQUdBLE9BQU9BLENBQUNBO1lBQzNCQSxNQUFNQSxDQUFDQSxXQUFXQSxHQUFHQTtnQkFDbkJBLEVBQUNBLElBQUlBLEVBQUVBLElBQUlBLEVBQUVBLElBQUlBLEVBQUVBLE1BQU1BLEVBQUNBO2FBQzNCQSxDQUFDQTtZQUNGQSxJQUFJQSxJQUFJQSxHQUFHQSxJQUFJQSxDQUFDQSxNQUFNQSxDQUFDQSxZQUFZQSxFQUFFQSxTQUFTQSxDQUFDQSxDQUFDQTtZQUNoREEsSUFBSUEsS0FBS0EsR0FBR0EsSUFBSUEsR0FBR0EsSUFBSUEsQ0FBQ0EsS0FBS0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsR0FBR0EsRUFBRUEsQ0FBQ0E7WUFDeENBLE9BQU9BLENBQUNBLE9BQU9BLENBQUNBLEtBQUtBLEVBQUVBLFVBQUNBLElBQUlBO2dCQUMxQkEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsVUFBVUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsUUFBUUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7b0JBQ2pEQSxJQUFJQSxJQUFJQSxHQUFHQSxDQUFDQTtnQkFDZEEsQ0FBQ0E7Z0JBQ0RBLElBQUlBLElBQUlBLElBQUlBLENBQUNBLFVBQVVBLENBQUNBLElBQUlBLENBQUNBLENBQUNBO2dCQUM5QkEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsT0FBT0EsRUFBRUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7b0JBQ3BCQSxNQUFNQSxDQUFDQSxXQUFXQSxDQUFDQSxJQUFJQSxDQUFDQSxFQUFDQSxJQUFJQSxFQUFFQSxJQUFJQSxFQUFFQSxJQUFJQSxFQUFFQSxJQUFJQSxFQUFDQSxDQUFDQSxDQUFDQTtnQkFDcERBLENBQUNBO1lBQ0hBLENBQUNBLENBQUNBLENBQUNBO1lBRUhBLElBQUlBLEdBQUdBLEdBQUdBLFNBQVNBLENBQUNBLElBQUlBLEVBQUVBLENBQUNBO1lBQzNCQSxFQUFFQSxDQUFDQSxDQUFDQSxNQUFNQSxDQUFDQSxXQUFXQSxDQUFDQSxNQUFNQSxDQUFDQSxDQUFDQSxDQUFDQTtnQkFDOUJBLElBQUlBLElBQUlBLEdBQUdBLE1BQU1BLENBQUNBLFdBQVdBLENBQUNBLE1BQU1BLENBQUNBLFdBQVdBLENBQUNBLE1BQU1BLEdBQUdBLENBQUNBLENBQUNBLENBQUNBO2dCQUU3REEsSUFBSUEsQ0FBQ0EsSUFBSUEsR0FBR0EsSUFBSUEsQ0FBQ0Esc0JBQXNCQSxDQUFDQSxJQUFJQSxDQUFDQSxJQUFJQSxDQUFDQSxDQUFDQTtnQkFFbkRBLElBQUlBLFFBQVFBLEdBQUdBLEtBQUtBLENBQUNBO2dCQUNyQkEsT0FBT0EsQ0FBQ0EsT0FBT0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsZUFBZUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsRUFBRUEsVUFBQ0EsSUFBSUE7b0JBQ2pEQSxFQUFFQSxDQUFDQSxDQUFDQSxDQUFDQSxRQUFRQSxJQUFJQSxHQUFHQSxDQUFDQSxVQUFVQSxDQUFDQSxJQUFJQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTt3QkFFdENBLDBCQUEwQkEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsV0FBV0EsQ0FBQ0EsSUFBSUEsRUFBRUEsRUFBRUEsSUFBSUEsQ0FBQ0EsV0FBV0EsQ0FBQ0EsSUFBSUEsRUFBRUEsR0FBR0Es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QSxrQkFBa0JBLENBQUNBLElBQUlBLENBQUNBLEdBQ25DQSxRQUFRQSxHQUFHQSxrQkFBa0JBLENBQUNBLElBQUlBLENBQUNBLEdBQ25DQSxlQUFlQSxHQUFHQSxrQkFBa0JBLENBQUNBLE9BQU9BLENBQUNBLE1BQU1BLENBQUNBLFlBQVlBLENBQUNBLENBQUNBLENBQUNBO1lBQ3JFQSxFQUFFQSxDQUFDQSxDQUFDQSxLQUFLQSxDQUFDQSxDQUFDQSxDQUFDQTtnQkFDVkEsTUFBTUEsSUFBSUEsU0FBU0EsR0FBR0Esa0JBQWtCQSxDQUFDQSxLQUFLQSxDQUFDQSxDQUFDQTtZQUNsREEsQ0FBQ0E7WUFDREEsTUFBTUEsQ0FBQ0EsTUFBTUEsQ0FBQ0E7UUFDaEJBLENBQUNBLENBQUNBO1FBRUZBLE1BQU1BLENBQUNBLFlBQVlBLEdBQUdBO1lBQ3BCQSxFQUFFQSxDQUFDQSxDQUFDQSxDQUFDQSxNQUFNQSxDQUFDQSxRQUFRQSxJQUFJQSxNQUFNQSxDQUFDQSxRQUFRQSxDQUFDQSxNQUFNQSxLQUFLQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtnQkFDckRBLE1BQU1BLENBQUNBLEVBQUVBLENBQUNBO1lBQ1pBLENBQUNBO1lBQ0RBLE1BQU1BLENBQUNBLE9BQU9BLENBQUNBO1FBQ2pCQSxDQUFDQSxDQUFDQTtRQUVGQSxNQUFNQSxDQUFDQSxVQUFVQSxHQUFHQTtZQUNsQkEsSUFBSUEsS0FBS0EsR0FBR0EsY0FBU0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0E7WUFDOUJBLElBQUlBLE1BQU1BLEdBQUdBLEtBQUtBLEdBQUdBLE9BQU9BLENBQUNBO1lBRTdCQSxJQUFJQSxLQUFLQSxHQUFHQSxNQUFNQSxDQUFDQSxNQUFNQSxDQUFDQSxLQUFLQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQTtZQUVyQ0EsSUFBSUEsSUFBSUEsR0FBR0EsR0FBR0EsR0FBR0EsS0FBS0EsQ0FBQ0EsS0FBS0EsQ0FBQ0EsS0FBS0EsQ0FBQ0EsTUFBTUEsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsR0FBR0Es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QSxNQUFNQSxDQUFDQSxHQUFHQSxHQUFHQSxjQUFjQSxDQUFDQSxNQUFNQSxDQUFDQSxNQUFNQSxDQUFDQSxNQUFNQSxFQUFFQSxPQUFPQSxFQUFFQSxPQUFPQSxFQUFFQSxJQUFJQSxFQUFFQSxVQUFDQSxNQUFNQTt3QkFDL0VBLElBQUlBLENBQUNBLFlBQVlBLENBQUNBLFNBQVNBLEVBQUVBLG1CQUFtQkEsR0FBR0EsT0FBT0EsQ0FBQ0EsQ0FBQ0E7d0JBQzVEQSxNQUFNQSxDQUFDQSxXQUFXQSxDQUFDQSxhQUFhQSxDQUFDQSxNQUFNQSxDQUFDQSxDQUFDQSxFQUFFQSxDQUFDQSxDQUFDQSxDQUFDQTt3QkFDOUNBLE1BQU1BLENBQUNBLFlBQVlBLENBQUNBLEtBQUtBLEVBQUVBLENBQUNBO3dCQUM1QkEsSUFBSUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0E7d0JBQ3BCQSxVQUFVQSxFQUFFQSxDQUFDQTtvQkFDZkEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0JBQ0xBLENBQUNBO1lBQ0hBLENBQUNBO1lBQ0RBLE1BQU1BLENBQUNBLFlBQVlBLENBQUNBLEtBQUtBLEVBQUVBLENBQUNBO1FBQzlCQSxDQUFDQSxDQUFDQTtRQUVGQSxNQUFNQSxDQUFDQSxnQkFBZ0JBLEdBQUdBO1lBQ3hCQSxJQUFJQSxJQUFJQSxHQUFHQSxJQUFJQSxDQUFDQTtZQUNoQkEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsV0FBV0EsQ0FBQ0EsYUFBYUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0JBQzVDQSxJQUFJQSxRQUFRQSxHQUFHQSxNQUFNQSxDQUFDQSxXQUFXQSxDQUFDQSxhQUFhQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtnQkFDbkRBLElBQUlBLEdBQUdBLFFBQVFBLENBQUNBLElBQUlBLENBQUNBO1lBQ3ZCQSxDQUFDQTtZQUNEQSxFQUFFQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSxDQUFDQSxDQUFDQTtnQkFDVEEsTUFBTUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsV0FB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Z0JBQ0hBLElBQUlBLEtBQUtBLEdBQUdBLE9BQU9BLENBQUNBLFFBQVFBLENBQUNBLE1BQU1BLENBQUNBLFVBQUNBLElBQUlBO29CQUN2Q0EsTUFBTUEsQ0FBQ0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsU0FBU0EsQ0FBQ0E7Z0JBQ3pCQSxDQUFDQSxDQUFDQSxDQUFDQTtnQkFDSEEsV0FBV0EsR0FBR0EsV0FBV0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsVUFBQ0EsR0FBR0E7b0JBQ25DQSxNQUFNQSxDQUFDQSxHQUFHQSxDQUFDQSxJQUFJQSxDQUFDQTtnQkFDbEJBLENBQUNBLENBQUNBLENBQUNBO2dCQUNIQSxRQUFRQSxHQUFHQSxRQUFRQSxDQUFDQSxNQUFNQSxDQUFDQSxVQUFDQSxHQUFHQTtvQkFDN0JBLE1BQU1BLENBQUNBLEdBQUdBLENBQUNBLElBQUlBLENBQUNBO2dCQUNsQkEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0JBQ0hBLEtBQUtBLEdBQUdBLEtBQUtBLENBQUNBLE1BQU1BLENBQUNBLFVBQUNBLElBQUlBO29CQUN4QkEsTUFBTUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsSUFBSUEsQ0FBQ0E7Z0JBQ25CQSxDQUFDQSxDQUFDQSxDQUNDQSxNQUFNQSxDQUFDQSxVQUFDQSxJQUFJQTtvQkFDWEEsTUFBTUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsS0FBS0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsSUFBSUEsRUFBRUEsQ0FBQ0E7Z0JBQ3JDQSxDQUFDQSxDQUFDQSxDQUFDQTtnQkFFTEEsTUFBTUEsQ0FBQ0EsUUFBUUEsR0FBU0EsS0FBTUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsV0FBV0EsRUFBRUEsUUFBUUEsRUFBRUEsS0FBS0EsQ0FBQ0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsVUFBQ0EsSUFBSUE7b0JBQzNFQSxJQUFJQSxDQUFDQSxNQUFNQSxHQUFHQSxNQUFNQSxDQUFDQSxNQUFNQSxDQUFDQTtvQkFDNUJBLElBQUlBLENBQUNBLFFBQVFBLEdBQUdBLElBQUlBLENBQUNBLElBQUlBLENBQUNBO29C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QUNBLElBQUlBO1FBQzdCaUIsSUFBSUEsS0FBS0EsR0FBR0EsSUFBSUEsQ0FBQ0EsS0FBS0EsSUFBSUEsRUFBRUEsQ0FBQ0E7UUFDN0JBLElBQUlBLElBQUlBLEdBQUdBLEtBQUtBLENBQUNBLFFBQVFBLElBQUlBLElBQUlBLENBQUNBLElBQUlBLENBQUNBO1FBQ3ZDQSxJQUFJQSxJQUFJQSxHQUFHQSxJQUFJQSxDQUFDQSxJQUFJQSxDQUFDQTtRQUNyQkEsSUFBSUEsU0FBU0EsR0FBR0EsSUFBSUEsQ0FBQ0E7UUFDckJBLElBQUlBLFVBQVVBLEdBQUdBLEtBQUtBLENBQUNBLFVBQVVBLENBQUNBO1FBQ2xDQSxFQUFFQSxDQUFDQSxDQUFDQSxVQUFVQSxJQUFJQSxVQUFVQSxDQUFDQSxVQUFVQSxDQUFDQSxRQUFRQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUNsREEsVUFBVUEsR0FBR0EsU0FBU0EsR0FBR0EsVUFBVUEsQ0FBQ0EsU0FBU0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7WUFDakRBLEtBQUtBLENBQUNBLFVBQVVBLEdBQUdBLFVBQVVBLENBQUNBO1FBQ2hDQSxDQUFDQTtRQUNEQSxFQUFFQSxDQUFDQSxDQUFDQSxJQUFJQSxJQUFJQSxJQUFJQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUNqQkEsSUFBSUEsWUFBWUEsR0FBR0EsSUFBSUEsR0FBR0EsR0FBR0EsR0FBR0EsSUFBSUEsQ0FBQ0E7WUFDckNBLElBQUlBLENBQUNBLGFBQWFBLEdBQUdBLFlBQVlBLENBQUNBLFlBQVlBLEVBQUVBLFNBQVNBLENBQUNBLENBQUNBO1lBQzNEQSxJQUFJQSxDQUFDQSxXQUFXQSxHQUFHQSx3QkFBd0JBLEdBQUdBLFlBQVlBLEdBQUdBLE1BQU1BLENBQUNBO1lBQ3BFQSxJQUFJQSxRQUFRQSxHQUFHQSxVQUFVQSxDQUFDQSxRQUFRQSxDQUFDQTtZQUNuQ0EsRUFBRUEsQ0FBQ0EsQ0FBQ0EsUUFBUUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0JBQ2JBLElBQUlBLGVBQWVBLEdBQUdBLFFBQVFBLENBQUNBLEdB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LENBQUNBLG1CQUFtQkEsRUFDM0RBLENBQUNBLFFBQVFBLEVBQUVBLGdCQUFnQkEsRUFBRUEsV0FBV0EsRUFBRUEsY0FBY0EsRUFBRUEsT0FBT0EsRUFBRUEsVUFBVUEsRUFBRUEsYUFBYUEsRUFBRUEsWUFBWUEsRUFDeEdBLFVBQUNBLE1BQU1BLEVBQUVBLGNBQXVDQSxFQUFFQSxTQUE2QkEsRUFBRUEsWUFBWUEsRUFBRUEsS0FBS0EsRUFBRUEsUUFBUUEsRUFBRUEsV0FBV0EsRUFBRUEsVUFBVUE7UUFFcklBLE1BQU1BLENBQUNBLEtBQUtBLEdBQUdBLFVBQVVBLENBQUNBO1FBRTFCQSxNQUFNQSxDQUFDQSxZQUFZQSxHQUFHQSxZQUFZQSxDQUFDQSxNQUFNQSxDQUFDQSxJQUFJQSxTQUFTQSxDQUFDQSxNQUFNQSxFQUFFQSxDQUFDQSxNQUFNQSxDQUFDQSxJQUFJQSxFQUFFQSxDQUFDQTtRQUMvRUEsTUFBTUEsQ0FBQ0EsRUFBRUEsR0FBR0EsWUFBWUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0E7UUFDL0JBLE1BQU1BLENBQUNBLElBQUlBLEdBQUdBLFlBQVlBLENBQUNBLE1BQU1BLENBQUNBLENBQUNBO1FBRW5DQSxNQUFNQSxDQUFDQSxVQUFVQSxHQUFHQSxZQUFZQSxDQUFDQSxlQUFlQSxDQUFDQSxDQUFDQTtRQUNsREEsTUFBTUEsQ0FBQ0EsSUFBSUEsR0FBR0EsWUFBWUEsQ0FBQ0EsVUFBVUEsQ0FBQ0EsQ0FBQ0E7UUFDdkNBLE1BQU1BLENBQUNBLFFBQVFBLEdBQUdBLEVBQUVBLENBQUNBO1FBQ3JCQSxJQUFJQSxTQUFTQSxHQUFHQSxNQUFNQSxDQUFDQSxZQUFZQSxDQUFDQSxLQUFLQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQTtRQUMvQ0EsRUFBRUEsQ0FBQ0EsQ0FBQ0EsU0FBU0EsSUFBSUEsU0FBU0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7WUFDbENBLE1BQU1BLENBQUNBLFFBQVFBLEdBQUdBLFNBQVNBLENBQUNBLFNBQVNBLENBQUNBLE1BQU1BLEdBQUdBLENBQUNB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LElBQUlBLEVBQUVBLENBQUNBO1FBQ3REQSxJQUFJQSxTQUFTQSxHQUFHQSxNQUFNQSxDQUFDQSxrQkFBa0JBLENBQUNBLEtBQUtBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBO1FBQ3JEQSxFQUFFQSxDQUFDQSxDQUFDQSxTQUFTQSxJQUFJQSxTQUFTQSxDQUFDQSxNQUFNQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUNsQ0EsTUFBTUEsQ0FBQ0EsUUFBUUEsR0FBR0EsU0FBU0EsQ0FBQ0EsU0FBU0EsQ0FBQ0EsTUFBTUEsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7UUFDcERBLENBQUNBO1FBQ0RBLEVBQUVBLENBQUNBLENBQUNBLENBQUNBLE1BQU1BLENBQUNBLGtCQUFrQkEsQ0FBQ0EsVUFBVUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsSUFBSUEsTUFBTUEsQ0FBQ0Esa0JBQWtCQSxDQUFDQSxNQUFNQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUN2RkEsTUFBTUEsQ0FBQ0Esa0JBQWtCQSxHQUFHQSxHQUFHQSxHQUFHQSxNQUFNQSxDQUFDQSxrQkFBa0JBLENBQUNBO1FBQzlEQSxDQUFDQTtRQUVEQSxNQUFNQSxDQUFDQSxVQUFVQSxHQUFHQSxZQUFZQSxDQUFDQSxlQUFlQSxDQUFDQSxDQUFDQTtRQUNsREEsTUFBTUEsQ0FBQ0EsSUFBSUEsR0FBR0EsWUFBWUEsQ0FBQ0EsVUFBVUEsQ0FBQ0EsQ0FBQ0E7UUFFdkNBLE1BQU1BLENBQUNBLFFBQVFBLEdBQUdBLHNCQUFnQkEsQ0FBQ0EsVUFBVUEsRUFBRUEsTUFBTUEsQ0FBQ0EsWUFBWUEsQ0FBQ0EsQ0FBQ0E7UUFDcEVBLE1BQU1BLENBQUNBLE9BQU9BLEdBQUdBLE1BQU1BLENBQUNBLFFBQVFBLENBQUNBLE1BQU1BLEtBQUtBLENBQUNBLENBQUNBO1FBRTlDQSxlQUFTQSxDQUFDQSxNQUFNQSxFQUFFQSxTQUFTQSxFQUFFQSxZQUFZQSxDQUFDQSxDQUFDQTtRQUMzQ0EsbUNBQTZCQSxDQUFDQSxNQUFNQSxFQUFFQSxTQUFTQSxDQUFDQSxDQUFD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R0FBRyxHQUFHLEdBQUcsWUFBWSxHQUFHLE1BQU0sR0FBRyxTQUFTLEdBQUcsSUFBSSxDQUFDLENBQUM7b0JBQy9FLENBQUM7Z0JBQ0gsQ0FBQyxDQUFDQSxDQUFDQTtZQUNQQSxDQUFDQTtRQUNIQSxDQUFDQTtRQUVENUIsVUFBVUEsRUFBRUEsQ0FBQ0E7SUFFZkEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7QUFDUkEsQ0FBQ0EsRUFwTk0sS0FBSyxLQUFMLEtBQUssUUFvTlgiLCJmaWxlIjoiY29tcGlsZWQuanMiLCJzb3VyY2VzQ29udGVudCI6W251bGwsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9pbmNsdWRlcy50c1wiLz5cblxuXG4vKipcbiAqIEBtb2R1bGUgV2lraVxuICovXG5tb2R1bGUgV2lraSB7XG5cbiAgZXhwb3J0IHZhciBsb2c6TG9nZ2luZy5Mb2dnZXIgPSBMb2dnZXIuZ2V0KFwiV2lraVwiKTtcblxuICBleHBvcnQgdmFyIGNhbWVsTmFtZXNwYWNlcyA9IFtcImh0dHA6Ly9jYW1lbC5hcGFjaGUub3JnL3NjaGVtYS9zcHJpbmdcIiwgXCJodHRwOi8vY2FtZWwuYXBhY2hlLm9yZy9zY2hlbWEvYmx1ZXByaW50XCJdO1xuICBleHBvcnQgdmFyIHNwcmluZ05hbWVzcGFjZXMgPSBbXCJodHRwOi8vd3d3LnNwcmluZ2ZyYW1ld29yay5vcmcvc2NoZW1hL2JlYW5zXCJdO1xuICBleHBvcnQgdmFyIGRyb29sc05hbWVzcGFjZXMgPSBbXCJodHRwOi8vZHJvb2xzLm9yZy9zY2hlbWEvZHJvb2xzLXNwcmluZ1wiXTtcbiAgZXhwb3J0IHZhciBkb3plck5hbWVzcGFjZXMgPSBbXCJodHRwOi8vZG96ZXIuc291cmNlZm9yZ2UubmV0XCJdO1xuICBleHBvcnQgdmFyIGFjdGl2ZW1xTmFtZXNwYWNlcyA9IFtcImh0dHA6Ly9hY3RpdmVtcS5hcGFjaGUub3JnL3NjaGVtYS9jb3JlXCJdO1xuXG4gIGV4cG9ydCB2YXIgZXhjbHVkZUFkanVzdG1lbnRQcmVmaXhlcyA9IFtcImh0dHA6Ly9cIiwgXCJodHRwczovL1wiLCBcIiNcIl07XG5cbiAgZXhwb3J0IGVudW0gVmlld01vZGUgeyBMaXN0LCBJY29uIH07XG5cbiAgLyoqXG4gICAqIFRoZSBjdXN0b20gdmlld3Mgd2l0aGluIHRoZSB3aWtpIG5hbWVzcGFjZTsgZWl0aGVyIFwiL3dpa2kvJGZvb1wiIG9yIFwiL3dpa2kvYnJhbmNoLyRicmFuY2gvJGZvb1wiXG4gICAqL1xuICBleHBvcnQgdmFyIGN1c3RvbVdpa2lWaWV3UGFnZXMgPSBbXCIvZm9ybVRhYmxlXCIsIFwiL2NhbWVsL2RpYWdyYW1cIiwgXCIvY2FtZWwvY2FudmFzXCIsIFwiL2NhbWVsL3Byb3BlcnRpZXNcIiwgXCIvZG96ZXIvbWFwcGluZ3NcIl07XG5cbiAgLyoqXG4gICAqIFdoaWNoIGV4dGVuc2lvbnMgZG8gd2Ugd2lzaCB0byBoaWRlIGluIHRoZSB3aWtpIGZpbGUgbGlzdGluZ1xuICAgKiBAcHJvcGVydHkgaGlkZUV4dGVuc2lvbnNcbiAgICogQGZvciBXaWtpXG4gICAqIEB0eXBlIEFycmF5XG4gICAqL1xuICBleHBvcnQgdmFyIGhpZGVFeHRlbnNpb25zID0gW1wiLnByb2ZpbGVcIl07XG5cbiAgdmFyIGRlZmF1bHRGaWxlTmFtZVBhdHRlcm4gPSAvXlthLXpBLVowLTkuXy1dKiQvO1xuICB2YXIgZGVmYXVsdEZpbGVOYW1lUGF0dGVybkludmFsaWQgPSBcIk5hbWUgbXVzdCBiZTogbGV0dGVycywgbnVtYmVycywgYW5kIC4gXyBvciAtIGNoYXJhY3RlcnNcIjtcblxuICB2YXIgZGVmYXVsdEZpbGVOYW1lRXh0ZW5zaW9uUGF0dGVybiA9IFwiXCI7XG5cbiAgdmFyIGRlZmF1bHRMb3dlckNhc2VGaWxlTmFtZVBhdHRlcm4gPSAvXlthLXowLTkuXy1dKiQvO1xuICB2YXIgZGVmYXVsdExvd2VyQ2FzZUZpbGVOYW1lUGF0dGVybkludmFsaWQgPSBcIk5hbWUgbXVzdCBiZTogbG93ZXItY2FzZSBsZXR0ZXJzLCBudW1iZXJzLCBhbmQgLiBfIG9yIC0gY2hhcmFjdGVyc1wiO1xuXG4gIGV4cG9ydCBpbnRlcmZhY2UgR2VuZXJhdGVPcHRpb25zIHtcbiAgICB3b3Jrc3BhY2U6IGFueTtcbiAgICBmb3JtOiBhbnk7XG4gICAgbmFtZTogc3RyaW5nO1xuICAgIGJyYW5jaDogc3RyaW5nO1xuICAgIHBhcmVudElkOiBzdHJpbmc7XG4gICAgc3VjY2VzczogKGZpbGVDb250ZW50cz86c3RyaW5nKSA9PiB2b2lkO1xuICAgIGVycm9yOiAoZXJyb3I6YW55KSA9PiB2b2lkO1xuICB9XG5cbiAgLyoqXG4gICAqIFRoZSB3aXphcmQgdHJlZSBmb3IgY3JlYXRpbmcgbmV3IGNvbnRlbnQgaW4gdGhlIHdpa2lcbiAgICogQHByb3BlcnR5IGRvY3VtZW50VGVtcGxhdGVzXG4gICAqIEBmb3IgV2lraVxuICAgKiBAdHlwZSBBcnJheVxuICAgKi9cbiAgZXhwb3J0IHZhciBkb2N1bWVudFRlbXBsYXRlcyA9IFtcbiAgICB7XG4gICAgICBsYWJlbDogXCJGb2xkZXJcIixcbiAgICAgIHRvb2x0aXA6IFwiQ3JlYXRlIGEgbmV3IGZvbGRlciB0byBjb250YWluIGRvY3VtZW50c1wiLFxuICAgICAgZm9sZGVyOiB0cnVlLFxuICAgICAgaWNvbjogXCIvaW1nL2ljb25zL3dpa2kvZm9sZGVyLmdpZlwiLFxuICAgICAgZXhlbXBsYXI6IFwibXlmb2xkZXJcIixcbiAgICAgIHJlZ2V4OiBkZWZhdWx0TG93ZXJDYXNlRmlsZU5hbWVQYXR0ZXJuLFxuICAgICAgaW52YWxpZDogZGVmYXVsdExvd2VyQ2FzZUZpbGVOYW1lUGF0dGVybkludmFsaWRcbiAgICB9LFxuICAgIC8qXG4gICAge1xuICAgICAgbGFiZWw6IFwiQXBwXCIsXG4gICAgICB0b29sdGlwOiBcIkNyZWF0ZXMgYSBuZXcgQXBwIGZvbGRlciB1c2VkIHRvIGNvbmZpZ3VyZSBhbmQgcnVuIGNvbnRhaW5lcnNcIixcbiAgICAgIGFkZENsYXNzOiBcImZhIGZhLWNvZyBncmVlblwiLFxuICAgICAgZXhlbXBsYXI6ICdteWFwcCcsXG4gICAgICByZWdleDogZGVmYXVsdEZpbGVOYW1lUGF0dGVybixcbiAgICAgIGludmFsaWQ6IGRlZmF1bHRGaWxlTmFtZVBhdHRlcm5JbnZhbGlkLFxuICAgICAgZXh0ZW5zaW9uOiAnJyxcbiAgICAgIGdlbmVyYXRlZDoge1xuICAgICAgICBtYmVhbjogWydpby5mYWJyaWM4JywgeyB0eXBlOiAnS3ViZXJuZXRlc1RlbXBsYXRlTWFuYWdlcicgfV0sXG4gICAgICAgIGluaXQ6ICh3b3Jrc3BhY2UsICRzY29wZSkgPT4ge1xuXG4gICAgICAgIH0sXG4gICAgICAgIGdlbmVyYXRlOiAob3B0aW9uczpHZW5lcmF0ZU9wdGlvbnMpID0+IHtcbiAgICAgICAgICBsb2cuZGVidWcoXCJHb3Qgb3B0aW9uczogXCIsIG9wdGlvbnMpO1xuICAgICAgICAgIG9wdGlvbnMuZm9ybS5uYW1lID0gb3B0aW9ucy5uYW1lO1xuICAgICAgICAgIG9wdGlvbnMuZm9ybS5wYXRoID0gb3B0aW9ucy5wYXJlbnRJZDtcbiAgICAgICAgICBvcHRpb25zLmZvcm0uYnJhbmNoID0gb3B0aW9ucy5icmFuY2g7XG4gICAgICAgICAgdmFyIGpzb24gPSBhbmd1bGFyLnRvSnNvbihvcHRpb25zLmZvcm0pO1xuICAgICAgICAgIHZhciBqb2xva2lhID0gPEpvbG9raWEuSUpvbG9raWE+IEhhd3Rpb0NvcmUuaW5qZWN0b3IuZ2V0KFwiam9sb2tpYVwiKTtcbiAgICAgICAgICBqb2xva2lhLnJlcXVlc3Qoe1xuICAgICAgICAgICAgdHlwZTogJ2V4ZWMnLFxuICAgICAgICAgICAgbWJlYW46ICdpby5mYWJyaWM4OnR5cGU9S3ViZXJuZXRlc1RlbXBsYXRlTWFuYWdlcicsXG4gICAgICAgICAgICBvcGVyYXRpb246ICdjcmVhdGVBcHBCeUpzb24nLFxuICAgICAgICAgICAgYXJndW1lbnRzOiBbanNvbl1cbiAgICAgICAgICB9LCBDb3JlLm9uU3VjY2VzcygocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIGxvZy5kZWJ1ZyhcIkdlbmVyYXRlZCBhcHAsIHJlc3BvbnNlOiBcIiwgcmVzcG9uc2UpO1xuICAgICAgICAgICAgb3B0aW9ucy5zdWNjZXNzKHVuZGVmaW5lZCk7IFxuICAgICAgICAgIH0sIHtcbiAgICAgICAgICAgIGVycm9yOiAocmVzcG9uc2UpID0+IHsgb3B0aW9ucy5lcnJvcihyZXNwb25zZS5lcnJvcik7IH1cbiAgICAgICAgICB9KSk7XG4gICAgICAgIH0sXG4gICAgICAgIGZvcm06ICh3b3Jrc3BhY2UsICRzY29wZSkgPT4ge1xuICAgICAgICAgIC8vIFRPRE8gZG9ja2VyIHJlZ2lzdHJ5IGNvbXBsZXRpb25cbiAgICAgICAgICBpZiAoISRzY29wZS5kb0RvY2tlclJlZ2lzdHJ5Q29tcGxldGlvbikge1xuICAgICAgICAgICAgJHNjb3BlLmZldGNoRG9ja2VyUmVwb3NpdG9yaWVzID0gKCkgPT4ge1xuICAgICAgICAgICAgICByZXR1cm4gRG9ja2VyUmVnaXN0cnkuY29tcGxldGVEb2NrZXJSZWdpc3RyeSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgc3VtbWFyeU1hcmtkb3duOiAnQWRkIGFwcCBzdW1tYXJ5IGhlcmUnLFxuICAgICAgICAgICAgcmVwbGljYUNvdW50OiAxXG4gICAgICAgICAgfTtcbiAgICAgICAgfSxcbiAgICAgICAgc2NoZW1hOiB7XG4gICAgICAgICAgZGVzY3JpcHRpb246ICdBcHAgc2V0dGluZ3MnLFxuICAgICAgICAgIHR5cGU6ICdqYXZhLmxhbmcuU3RyaW5nJyxcbiAgICAgICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgICAgICAnZG9ja2VySW1hZ2UnOiB7XG4gICAgICAgICAgICAgICdkZXNjcmlwdGlvbic6ICdEb2NrZXIgSW1hZ2UnLFxuICAgICAgICAgICAgICAndHlwZSc6ICdqYXZhLmxhbmcuU3RyaW5nJyxcbiAgICAgICAgICAgICAgJ2lucHV0LWF0dHJpYnV0ZXMnOiB7IFxuICAgICAgICAgICAgICAgICdyZXF1aXJlZCc6ICcnLCBcbiAgICAgICAgICAgICAgICAnY2xhc3MnOiAnaW5wdXQteGxhcmdlJyxcbiAgICAgICAgICAgICAgICAndHlwZWFoZWFkJzogJ3JlcG8gZm9yIHJlcG8gaW4gZmV0Y2hEb2NrZXJSZXBvc2l0b3JpZXMoKSB8IGZpbHRlcjokdmlld1ZhbHVlJyxcbiAgICAgICAgICAgICAgICAndHlwZWFoZWFkLXdhaXQtbXMnOiAnMjAwJ1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgJ3N1bW1hcnlNYXJrZG93bic6IHtcbiAgICAgICAgICAgICAgJ2Rlc2NyaXB0aW9uJzogJ1Nob3J0IERlc2NyaXB0aW9uJyxcbiAgICAgICAgICAgICAgJ3R5cGUnOiAnamF2YS5sYW5nLlN0cmluZycsXG4gICAgICAgICAgICAgICdpbnB1dC1hdHRyaWJ1dGVzJzogeyAnY2xhc3MnOiAnaW5wdXQteGxhcmdlJyB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgJ3JlcGxpY2FDb3VudCc6IHtcbiAgICAgICAgICAgICAgJ2Rlc2NyaXB0aW9uJzogJ1JlcGxpY2EgQ291bnQnLFxuICAgICAgICAgICAgICAndHlwZSc6ICdqYXZhLmxhbmcuSW50ZWdlcicsXG4gICAgICAgICAgICAgICdpbnB1dC1hdHRyaWJ1dGVzJzoge1xuICAgICAgICAgICAgICAgIG1pbjogJzAnXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAnbGFiZWxzJzoge1xuICAgICAgICAgICAgICAnZGVzY3JpcHRpb24nOiAnTGFiZWxzJyxcbiAgICAgICAgICAgICAgJ3R5cGUnOiAnbWFwJyxcbiAgICAgICAgICAgICAgJ2l0ZW1zJzoge1xuICAgICAgICAgICAgICAgICd0eXBlJzogJ3N0cmluZydcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0sXG4gICAge1xuICAgICAgbGFiZWw6IFwiRmFicmljOCBQcm9maWxlXCIsXG4gICAgICB0b29sdGlwOiBcIkNyZWF0ZSBhIG5ldyBlbXB0eSBmYWJyaWMgcHJvZmlsZS4gVXNpbmcgYSBoeXBoZW4gKCctJykgd2lsbCBjcmVhdGUgYSBmb2xkZXIgaGVpcmFyY2h5LCBmb3IgZXhhbXBsZSAnbXktYXdlc29tZS1wcm9maWxlJyB3aWxsIGJlIGF2YWlsYWJsZSB2aWEgdGhlIHBhdGggJ215L2F3ZXNvbWUvcHJvZmlsZScuXCIsXG4gICAgICBwcm9maWxlOiB0cnVlLFxuICAgICAgYWRkQ2xhc3M6IFwiZmEgZmEtYm9vayBncmVlblwiLFxuICAgICAgZXhlbXBsYXI6IFwidXNlci1wcm9maWxlXCIsXG4gICAgICByZWdleDogZGVmYXVsdExvd2VyQ2FzZUZpbGVOYW1lUGF0dGVybixcbiAgICAgIGludmFsaWQ6IGRlZmF1bHRMb3dlckNhc2VGaWxlTmFtZVBhdHRlcm5JbnZhbGlkLFxuICAgICAgZmFicmljT25seTogdHJ1ZVxuICAgIH0sXG4gICAgKi9cbiAgICB7XG4gICAgICBsYWJlbDogXCJQcm9wZXJ0aWVzIEZpbGVcIixcbiAgICAgIHRvb2x0aXA6IFwiQSBwcm9wZXJ0aWVzIGZpbGUgdHlwaWNhbGx5IHVzZWQgdG8gY29uZmlndXJlIEphdmEgY2xhc3Nlc1wiLFxuICAgICAgZXhlbXBsYXI6IFwicHJvcGVydGllcy1maWxlLnByb3BlcnRpZXNcIixcbiAgICAgIHJlZ2V4OiBkZWZhdWx0RmlsZU5hbWVQYXR0ZXJuLFxuICAgICAgaW52YWxpZDogZGVmYXVsdEZpbGVOYW1lUGF0dGVybkludmFsaWQsXG4gICAgICBleHRlbnNpb246IFwiLnByb3BlcnRpZXNcIlxuICAgIH0sXG4gICAge1xuICAgICAgbGFiZWw6IFwiSlNPTiBGaWxlXCIsXG4gICAgICB0b29sdGlwOiBcIkEgZmlsZSBjb250YWluaW5nIEpTT04gZGF0YVwiLFxuICAgICAgZXhlbXBsYXI6IFwiZG9jdW1lbnQuanNvblwiLFxuICAgICAgcmVnZXg6IGRlZmF1bHRGaWxlTmFtZVBhdHRlcm4sXG4gICAgICBpbnZhbGlkOiBkZWZhdWx0RmlsZU5hbWVQYXR0ZXJuSW52YWxpZCxcbiAgICAgIGV4dGVuc2lvbjogXCIuanNvblwiXG4gICAgfSxcbiAgICAvKlxuICAgIHtcbiAgICAgIGxhYmVsOiBcIktleSBTdG9yZSBGaWxlXCIsXG4gICAgICB0b29sdGlwOiBcIkNyZWF0ZXMgYSBrZXlzdG9yZSAoZGF0YWJhc2UpIG9mIGNyeXB0b2dyYXBoaWMga2V5cywgWC41MDkgY2VydGlmaWNhdGUgY2hhaW5zLCBhbmQgdHJ1c3RlZCBjZXJ0aWZpY2F0ZXMuXCIsXG4gICAgICBleGVtcGxhcjogJ2tleXN0b3JlLmprcycsXG4gICAgICByZWdleDogZGVmYXVsdEZpbGVOYW1lUGF0dGVybixcbiAgICAgIGludmFsaWQ6IGRlZmF1bHRGaWxlTmFtZVBhdHRlcm5JbnZhbGlkLFxuICAgICAgZXh0ZW5zaW9uOiBcIi5qa3NcIixcbiAgICAgIGdlbmVyYXRlZDoge1xuICAgICAgICBtYmVhbjogWydoYXd0aW8nLCB7IHR5cGU6ICdLZXlzdG9yZVNlcnZpY2UnIH1dLFxuICAgICAgICBpbml0OiBmdW5jdGlvbih3b3Jrc3BhY2UsICRzY29wZSkge1xuICAgICAgICAgIHZhciBtYmVhbiA9ICdoYXd0aW86dHlwZT1LZXlzdG9yZVNlcnZpY2UnO1xuICAgICAgICAgIHZhciByZXNwb25zZSA9IHdvcmtzcGFjZS5qb2xva2lhLnJlcXVlc3QoIHt0eXBlOiBcInJlYWRcIiwgbWJlYW46IG1iZWFuLCBhdHRyaWJ1dGU6IFwiU2VjdXJpdHlQcm92aWRlckluZm9cIiB9LCB7XG4gICAgICAgICAgICBzdWNjZXNzOiAocmVzcG9uc2UpPT57XG4gICAgICAgICAgICAgICRzY29wZS5zZWN1cml0eVByb3ZpZGVySW5mbyA9IHJlc3BvbnNlLnZhbHVlO1xuICAgICAgICAgICAgICBDb3JlLiRhcHBseSgkc2NvcGUpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGVycm9yOiAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgY29uc29sZS5sb2coJ0NvdWxkIG5vdCBmaW5kIHRoZSBzdXBwb3J0ZWQgc2VjdXJpdHkgYWxnb3JpdGhtczogJywgcmVzcG9uc2UuZXJyb3IpO1xuICAgICAgICAgICAgICBDb3JlLiRhcHBseSgkc2NvcGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICB9LFxuICAgICAgICBnZW5lcmF0ZTogZnVuY3Rpb24ob3B0aW9uczpHZW5lcmF0ZU9wdGlvbnMpIHtcbiAgICAgICAgICB2YXIgZW5jb2RlZEZvcm0gPSBKU09OLnN0cmluZ2lmeShvcHRpb25zLmZvcm0pXG4gICAgICAgICAgdmFyIG1iZWFuID0gJ2hhd3Rpbzp0eXBlPUtleXN0b3JlU2VydmljZSc7XG4gICAgICAgICAgdmFyIHJlc3BvbnNlID0gb3B0aW9ucy53b3Jrc3BhY2Uuam9sb2tpYS5yZXF1ZXN0KCB7XG4gICAgICAgICAgICAgIHR5cGU6ICdleGVjJywgXG4gICAgICAgICAgICAgIG1iZWFuOiBtYmVhbixcbiAgICAgICAgICAgICAgb3BlcmF0aW9uOiAnY3JlYXRlS2V5U3RvcmVWaWFKU09OKGphdmEubGFuZy5TdHJpbmcpJyxcbiAgICAgICAgICAgICAgYXJndW1lbnRzOiBbZW5jb2RlZEZvcm1dXG4gICAgICAgICAgICB9LCB7XG4gICAgICAgICAgICAgIG1ldGhvZDonUE9TVCcsXG4gICAgICAgICAgICAgIHN1Y2Nlc3M6ZnVuY3Rpb24ocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBvcHRpb25zLnN1Y2Nlc3MocmVzcG9uc2UudmFsdWUpXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIGVycm9yOmZ1bmN0aW9uKHJlc3BvbnNlKXtcbiAgICAgICAgICAgICAgICBvcHRpb25zLmVycm9yKHJlc3BvbnNlLmVycm9yKVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSxcbiAgICAgICAgZm9ybTogZnVuY3Rpb24od29ya3NwYWNlLCAkc2NvcGUpeyBcbiAgICAgICAgICByZXR1cm4geyBcbiAgICAgICAgICAgIHN0b3JlVHlwZTogJHNjb3BlLnNlY3VyaXR5UHJvdmlkZXJJbmZvLnN1cHBvcnRlZEtleVN0b3JlVHlwZXNbMF0sXG4gICAgICAgICAgICBjcmVhdGVQcml2YXRlS2V5OiBmYWxzZSxcbiAgICAgICAgICAgIGtleUxlbmd0aDogNDA5NixcbiAgICAgICAgICAgIGtleUFsZ29yaXRobTogJHNjb3BlLnNlY3VyaXR5UHJvdmlkZXJJbmZvLnN1cHBvcnRlZEtleUFsZ29yaXRobXNbMF0sXG4gICAgICAgICAgICBrZXlWYWxpZGl0eTogMzY1XG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBzY2hlbWE6IHtcbiAgICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIktleXN0b3JlIFNldHRpbmdzXCIsXG4gICAgICAgICAgIFwidHlwZVwiOiBcImphdmEubGFuZy5TdHJpbmdcIixcbiAgICAgICAgICAgXCJwcm9wZXJ0aWVzXCI6IHsgXG4gICAgICAgICAgICAgXCJzdG9yZVBhc3N3b3JkXCI6IHtcbiAgICAgICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJLZXlzdG9yZSBwYXNzd29yZC5cIixcbiAgICAgICAgICAgICAgIFwidHlwZVwiOiBcInBhc3N3b3JkXCIsXG4gICAgICAgICAgICAgICAnaW5wdXQtYXR0cmlidXRlcyc6IHsgXCJyZXF1aXJlZFwiOiAgXCJcIiwgIFwibmctbWlubGVuZ3RoXCI6NiB9XG4gICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICBcInN0b3JlVHlwZVwiOiB7XG4gICAgICAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIHR5cGUgb2Ygc3RvcmUgdG8gY3JlYXRlXCIsXG4gICAgICAgICAgICAgICBcInR5cGVcIjogXCJqYXZhLmxhbmcuU3RyaW5nXCIsXG4gICAgICAgICAgICAgICAnaW5wdXQtZWxlbWVudCc6IFwic2VsZWN0XCIsXG4gICAgICAgICAgICAgICAnaW5wdXQtYXR0cmlidXRlcyc6IHsgXCJuZy1vcHRpb25zXCI6ICBcInYgZm9yIHYgaW4gc2VjdXJpdHlQcm92aWRlckluZm8uc3VwcG9ydGVkS2V5U3RvcmVUeXBlc1wiIH1cbiAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgIFwiY3JlYXRlUHJpdmF0ZUtleVwiOiB7XG4gICAgICAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiU2hvdWxkIHdlIGdlbmVyYXRlIGEgc2VsZi1zaWduZWQgcHJpdmF0ZSBrZXk/XCIsXG4gICAgICAgICAgICAgICBcInR5cGVcIjogXCJib29sZWFuXCJcbiAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgIFwia2V5Q29tbW9uTmFtZVwiOiB7XG4gICAgICAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIGNvbW1vbiBuYW1lIG9mIHRoZSBrZXksIHR5cGljYWxseSBzZXQgdG8gdGhlIGhvc3RuYW1lIG9mIHRoZSBzZXJ2ZXJcIixcbiAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImphdmEubGFuZy5TdHJpbmdcIixcbiAgICAgICAgICAgICAgICdjb250cm9sLWdyb3VwLWF0dHJpYnV0ZXMnOiB7ICduZy1zaG93JzogXCJmb3JtRGF0YS5jcmVhdGVQcml2YXRlS2V5XCIgfVxuICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgXCJrZXlMZW5ndGhcIjoge1xuICAgICAgICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBsZW5ndGggb2YgdGhlIGNyeXB0b2dyYXBoaWMga2V5XCIsXG4gICAgICAgICAgICAgICBcInR5cGVcIjogXCJMb25nXCIsXG4gICAgICAgICAgICAgICAnY29udHJvbC1ncm91cC1hdHRyaWJ1dGVzJzogeyAnbmctc2hvdyc6IFwiZm9ybURhdGEuY3JlYXRlUHJpdmF0ZUtleVwiIH1cbiAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgIFwia2V5QWxnb3JpdGhtXCI6IHtcbiAgICAgICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUga2V5IGFsZ29yaXRobVwiLFxuICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwiamF2YS5sYW5nLlN0cmluZ1wiLFxuICAgICAgICAgICAgICAgJ2lucHV0LWVsZW1lbnQnOiBcInNlbGVjdFwiLFxuICAgICAgICAgICAgICAgJ2lucHV0LWF0dHJpYnV0ZXMnOiB7IFwibmctb3B0aW9uc1wiOiAgXCJ2IGZvciB2IGluIHNlY3VyaXR5UHJvdmlkZXJJbmZvLnN1cHBvcnRlZEtleUFsZ29yaXRobXNcIiB9LFxuICAgICAgICAgICAgICAgJ2NvbnRyb2wtZ3JvdXAtYXR0cmlidXRlcyc6IHsgJ25nLXNob3cnOiBcImZvcm1EYXRhLmNyZWF0ZVByaXZhdGVLZXlcIiB9XG4gICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICBcImtleVZhbGlkaXR5XCI6IHtcbiAgICAgICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgbnVtYmVyIG9mIGRheXMgdGhlIGtleSB3aWxsIGJlIHZhbGlkIGZvclwiLFxuICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwiTG9uZ1wiLFxuICAgICAgICAgICAgICAgJ2NvbnRyb2wtZ3JvdXAtYXR0cmlidXRlcyc6IHsgJ25nLXNob3cnOiBcImZvcm1EYXRhLmNyZWF0ZVByaXZhdGVLZXlcIiB9XG4gICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICBcImtleVBhc3N3b3JkXCI6IHtcbiAgICAgICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJQYXNzd29yZCB0byB0aGUgcHJpdmF0ZSBrZXlcIixcbiAgICAgICAgICAgICAgIFwidHlwZVwiOiBcInBhc3N3b3JkXCIsXG4gICAgICAgICAgICAgICAnY29udHJvbC1ncm91cC1hdHRyaWJ1dGVzJzogeyAnbmctc2hvdyc6IFwiZm9ybURhdGEuY3JlYXRlUHJpdmF0ZUtleVwiIH1cbiAgICAgICAgICAgICB9XG4gICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0sXG4gICAgKi9cbiAgICB7XG4gICAgICBsYWJlbDogXCJNYXJrZG93biBEb2N1bWVudFwiLFxuICAgICAgdG9vbHRpcDogXCJBIGJhc2ljIG1hcmt1cCBkb2N1bWVudCB1c2luZyB0aGUgTWFya2Rvd24gd2lraSBtYXJrdXAsIHBhcnRpY3VsYXJseSB1c2VmdWwgZm9yIFJlYWRNZSBmaWxlcyBpbiBkaXJlY3Rvcmllc1wiLFxuICAgICAgZXhlbXBsYXI6IFwiUmVhZE1lLm1kXCIsXG4gICAgICByZWdleDogZGVmYXVsdEZpbGVOYW1lUGF0dGVybixcbiAgICAgIGludmFsaWQ6IGRlZmF1bHRGaWxlTmFtZVBhdHRlcm5JbnZhbGlkLFxuICAgICAgZXh0ZW5zaW9uOiBcIi5tZFwiXG4gICAgfSxcbiAgICB7XG4gICAgICBsYWJlbDogXCJUZXh0IERvY3VtZW50XCIsXG4gICAgICB0b29sdGlwOiBcIkEgcGxhaW4gdGV4dCBmaWxlXCIsXG4gICAgICBleGVtcGxhcjogXCJkb2N1bWVudC50ZXh0XCIsXG4gICAgICByZWdleDogZGVmYXVsdEZpbGVOYW1lUGF0dGVybixcbiAgICAgIGludmFsaWQ6IGRlZmF1bHRGaWxlTmFtZVBhdHRlcm5JbnZhbGlkLFxuICAgICAgZXh0ZW5zaW9uOiBcIi50eHRcIlxuICAgIH0sXG4gICAge1xuICAgICAgbGFiZWw6IFwiSFRNTCBEb2N1bWVudFwiLFxuICAgICAgdG9vbHRpcDogXCJBIEhUTUwgZG9jdW1lbnQgeW91IGNhbiBlZGl0IGRpcmVjdGx5IHVzaW5nIHRoZSBIVE1MIG1hcmt1cFwiLFxuICAgICAgZXhlbXBsYXI6IFwiZG9jdW1lbnQuaHRtbFwiLFxuICAgICAgcmVnZXg6IGRlZmF1bHRGaWxlTmFtZVBhdHRlcm4sXG4gICAgICBpbnZhbGlkOiBkZWZhdWx0RmlsZU5hbWVQYXR0ZXJuSW52YWxpZCxcbiAgICAgIGV4dGVuc2lvbjogXCIuaHRtbFwiXG4gICAgfSxcbiAgICB7XG4gICAgICBsYWJlbDogXCJYTUwgRG9jdW1lbnRcIixcbiAgICAgIHRvb2x0aXA6IFwiQW4gZW1wdHkgWE1MIGRvY3VtZW50XCIsXG4gICAgICBleGVtcGxhcjogXCJkb2N1bWVudC54bWxcIixcbiAgICAgIHJlZ2V4OiBkZWZhdWx0RmlsZU5hbWVQYXR0ZXJuLFxuICAgICAgaW52YWxpZDogZGVmYXVsdEZpbGVOYW1lUGF0dGVybkludmFsaWQsXG4gICAgICBleHRlbnNpb246IFwiLnhtbFwiXG4gICAgfSxcbiAgICB7XG4gICAgICBsYWJlbDogXCJJbnRlZ3JhdGlvbiBGbG93c1wiLFxuICAgICAgdG9vbHRpcDogXCJDYW1lbCByb3V0ZXMgZm9yIGRlZmluaW5nIHlvdXIgaW50ZWdyYXRpb24gZmxvd3NcIixcbiAgICAgIGNoaWxkcmVuOiBbXG4gICAgICAgIHtcbiAgICAgICAgICBsYWJlbDogXCJDYW1lbCBYTUwgZG9jdW1lbnRcIixcbiAgICAgICAgICB0b29sdGlwOiBcIkEgdmFuaWxsYSBDYW1lbCBYTUwgZG9jdW1lbnQgZm9yIGludGVncmF0aW9uIGZsb3dzXCIsXG4gICAgICAgICAgaWNvbjogXCIvaW1nL2ljb25zL2NhbWVsLnN2Z1wiLFxuICAgICAgICAgIGV4ZW1wbGFyOiBcImNhbWVsLnhtbFwiLFxuICAgICAgICAgIHJlZ2V4OiBkZWZhdWx0RmlsZU5hbWVQYXR0ZXJuLFxuICAgICAgICAgIGludmFsaWQ6IGRlZmF1bHRGaWxlTmFtZVBhdHRlcm5JbnZhbGlkLFxuICAgICAgICAgIGV4dGVuc2lvbjogXCIueG1sXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIGxhYmVsOiBcIkNhbWVsIE9TR2kgQmx1ZXByaW50IFhNTCBkb2N1bWVudFwiLFxuICAgICAgICAgIHRvb2x0aXA6IFwiQSB2YW5pbGxhIENhbWVsIFhNTCBkb2N1bWVudCBmb3IgaW50ZWdyYXRpb24gZmxvd3Mgd2hlbiB1c2luZyBPU0dpIEJsdWVwcmludFwiLFxuICAgICAgICAgIGljb246IFwiL2ltZy9pY29ucy9jYW1lbC5zdmdcIixcbiAgICAgICAgICBleGVtcGxhcjogXCJjYW1lbC1ibHVlcHJpbnQueG1sXCIsXG4gICAgICAgICAgcmVnZXg6IGRlZmF1bHRGaWxlTmFtZVBhdHRlcm4sXG4gICAgICAgICAgaW52YWxpZDogZGVmYXVsdEZpbGVOYW1lUGF0dGVybkludmFsaWQsXG4gICAgICAgICAgZXh0ZW5zaW9uOiBcIi54bWxcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgbGFiZWw6IFwiQ2FtZWwgU3ByaW5nIFhNTCBkb2N1bWVudFwiLFxuICAgICAgICAgIHRvb2x0aXA6IFwiQSB2YW5pbGxhIENhbWVsIFhNTCBkb2N1bWVudCBmb3IgaW50ZWdyYXRpb24gZmxvd3Mgd2hlbiB1c2luZyB0aGUgU3ByaW5nIGZyYW1ld29ya1wiLFxuICAgICAgICAgIGljb246IFwiL2ltZy9pY29ucy9jYW1lbC5zdmdcIixcbiAgICAgICAgICBleGVtcGxhcjogXCJjYW1lbC1zcHJpbmcueG1sXCIsXG4gICAgICAgICAgcmVnZXg6IGRlZmF1bHRGaWxlTmFtZVBhdHRlcm4sXG4gICAgICAgICAgaW52YWxpZDogZGVmYXVsdEZpbGVOYW1lUGF0dGVybkludmFsaWQsXG4gICAgICAgICAgZXh0ZW5zaW9uOiBcIi54bWxcIlxuICAgICAgICB9XG4gICAgICBdXG4gICAgfSxcbiAgICB7XG4gICAgICBsYWJlbDogXCJEYXRhIE1hcHBpbmcgRG9jdW1lbnRcIixcbiAgICAgIHRvb2x0aXA6IFwiRG96ZXIgYmFzZWQgY29uZmlndXJhdGlvbiBvZiBtYXBwaW5nIGRvY3VtZW50c1wiLFxuICAgICAgaWNvbjogXCIvaW1nL2ljb25zL2RvemVyL2RvemVyLmdpZlwiLFxuICAgICAgZXhlbXBsYXI6IFwiZG96ZXItbWFwcGluZy54bWxcIixcbiAgICAgIHJlZ2V4OiBkZWZhdWx0RmlsZU5hbWVQYXR0ZXJuLFxuICAgICAgaW52YWxpZDogZGVmYXVsdEZpbGVOYW1lUGF0dGVybkludmFsaWQsXG4gICAgICBleHRlbnNpb246IFwiLnhtbFwiXG4gICAgfVxuICBdO1xuXG4gIC8vIFRPRE8gUkVNT1ZFXG4gIGV4cG9ydCBmdW5jdGlvbiBpc0ZNQ0NvbnRhaW5lcih3b3Jrc3BhY2UpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICAvLyBUT0RPIFJFTU9WRVxuICBleHBvcnQgZnVuY3Rpb24gaXNXaWtpRW5hYmxlZCh3b3Jrc3BhY2UsIGpvbG9raWEsIGxvY2FsU3RvcmFnZSkge1xuICAgIHJldHVybiB0cnVlO1xuLypcbiAgICByZXR1cm4gR2l0LmNyZWF0ZUdpdFJlcG9zaXRvcnkod29ya3NwYWNlLCBqb2xva2lhLCBsb2NhbFN0b3JhZ2UpICE9PSBudWxsO1xuKi9cbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiBnb1RvTGluayhsaW5rLCAkdGltZW91dCwgJGxvY2F0aW9uKSB7XG4gICAgdmFyIGhyZWYgPSBDb3JlLnRyaW1MZWFkaW5nKGxpbmssIFwiI1wiKTtcbiAgICAkdGltZW91dCgoKSA9PiB7XG4gICAgICBsb2cuZGVidWcoXCJBYm91dCB0byBuYXZpZ2F0ZSB0bzogXCIgKyBocmVmKTtcbiAgICAgICRsb2NhdGlvbi51cmwoaHJlZik7XG4gICAgfSwgMTAwKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIGFsbCB0aGUgbGlua3MgZm9yIHRoZSBnaXZlbiBicmFuY2ggZm9yIHRoZSBjdXN0b20gdmlld3MsIHN0YXJ0aW5nIHdpdGggXCIvXCJcbiAgICogQHBhcmFtICRzY29wZVxuICAgKiBAcmV0dXJucyB7c3RyaW5nW119XG4gICAqL1xuICBleHBvcnQgZnVuY3Rpb24gY3VzdG9tVmlld0xpbmtzKCRzY29wZSkge1xuICAgIHZhciBwcmVmaXggPSBDb3JlLnRyaW1MZWFkaW5nKFdpa2kuc3RhcnRMaW5rKCRzY29wZSksIFwiI1wiKTtcbiAgICByZXR1cm4gY3VzdG9tV2lraVZpZXdQYWdlcy5tYXAocGF0aCA9PiBwcmVmaXggKyBwYXRoKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIGEgbmV3IGNyZWF0ZSBkb2N1bWVudCB3aXphcmQgdHJlZVxuICAgKiBAbWV0aG9kIGNyZWF0ZVdpemFyZFRyZWVcbiAgICogQGZvciBXaWtpXG4gICAqIEBzdGF0aWNcbiAgICovXG4gIGV4cG9ydCBmdW5jdGlvbiBjcmVhdGVXaXphcmRUcmVlKHdvcmtzcGFjZSwgJHNjb3BlKSB7XG4gICAgdmFyIHJvb3QgPSBjcmVhdGVGb2xkZXIoXCJOZXcgRG9jdW1lbnRzXCIpO1xuICAgIGFkZENyZWF0ZVdpemFyZEZvbGRlcnMod29ya3NwYWNlLCAkc2NvcGUsIHJvb3QsIGRvY3VtZW50VGVtcGxhdGVzKTtcbiAgICByZXR1cm4gcm9vdDtcbiAgfVxuXG4gIGZ1bmN0aW9uIGNyZWF0ZUZvbGRlcihuYW1lKTogYW55IHtcbiAgICByZXR1cm4ge1xuICAgICAgbmFtZTogbmFtZSxcbiAgICAgIGNoaWxkcmVuOiBbXVxuICAgIH07XG4gIH1cblxuICBleHBvcnQgZnVuY3Rpb24gYWRkQ3JlYXRlV2l6YXJkRm9sZGVycyh3b3Jrc3BhY2UsICRzY29wZSwgcGFyZW50LCB0ZW1wbGF0ZXM6IGFueVtdKSB7XG4gICAgYW5ndWxhci5mb3JFYWNoKHRlbXBsYXRlcywgKHRlbXBsYXRlKSA9PiB7XG5cbiAgICAgIGlmICggdGVtcGxhdGUuZ2VuZXJhdGVkICkge1xuICAgICAgICBpZiAoIHRlbXBsYXRlLmdlbmVyYXRlZC5pbml0ICkge1xuICAgICAgICAgIHRlbXBsYXRlLmdlbmVyYXRlZC5pbml0KHdvcmtzcGFjZSwgJHNjb3BlKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICB2YXIgdGl0bGUgPSB0ZW1wbGF0ZS5sYWJlbCB8fCBrZXk7XG4gICAgICB2YXIgbm9kZSA9IGNyZWF0ZUZvbGRlcih0aXRsZSk7XG4gICAgICBub2RlLnBhcmVudCA9IHBhcmVudDtcbiAgICAgIG5vZGUuZW50aXR5ID0gdGVtcGxhdGU7XG5cbiAgICAgIHZhciBhZGRDbGFzcyA9IHRlbXBsYXRlLmFkZENsYXNzO1xuICAgICAgaWYgKGFkZENsYXNzKSB7XG4gICAgICAgIG5vZGUuYWRkQ2xhc3MgPSBhZGRDbGFzcztcbiAgICAgIH1cblxuICAgICAgdmFyIGtleSA9IHRlbXBsYXRlLmV4ZW1wbGFyO1xuICAgICAgdmFyIHBhcmVudEtleSA9IHBhcmVudC5rZXkgfHwgXCJcIjtcbiAgICAgIG5vZGUua2V5ID0gcGFyZW50S2V5ID8gcGFyZW50S2V5ICsgXCJfXCIgKyBrZXkgOiBrZXk7XG4gICAgICB2YXIgaWNvbiA9IHRlbXBsYXRlLmljb247XG4gICAgICBpZiAoaWNvbikge1xuICAgICAgICBub2RlLmljb24gPSBDb3JlLnVybChpY29uKTtcbiAgICAgIH1cbiAgICAgIC8vIGNvbXBpbGVyIHdhcyBjb21wbGFpbmluZyBhYm91dCAnbGFiZWwnIGhhZCBubyBpZGVhIHdoZXJlIGl0J3MgY29taW5nIGZyb21cbiAgICAgIC8vIHZhciB0b29sdGlwID0gdmFsdWVbXCJ0b29sdGlwXCJdIHx8IHZhbHVlW1wiZGVzY3JpcHRpb25cIl0gfHwgbGFiZWw7XG4gICAgICB2YXIgdG9vbHRpcCA9IHRlbXBsYXRlW1widG9vbHRpcFwiXSB8fCB0ZW1wbGF0ZVtcImRlc2NyaXB0aW9uXCJdIHx8ICcnO1xuICAgICAgbm9kZS50b29sdGlwID0gdG9vbHRpcDtcbiAgICAgIGlmICh0ZW1wbGF0ZVtcImZvbGRlclwiXSkge1xuICAgICAgICBub2RlLmlzRm9sZGVyID0gKCkgPT4geyByZXR1cm4gdHJ1ZTsgfTtcbiAgICAgIH1cbiAgICAgIHBhcmVudC5jaGlsZHJlbi5wdXNoKG5vZGUpO1xuXG4gICAgICB2YXIgY2hpbGRyZW4gPSB0ZW1wbGF0ZS5jaGlsZHJlbjtcbiAgICAgIGlmIChjaGlsZHJlbikge1xuICAgICAgICBhZGRDcmVhdGVXaXphcmRGb2xkZXJzKHdvcmtzcGFjZSwgJHNjb3BlLCBub2RlLCBjaGlsZHJlbik7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICBleHBvcnQgZnVuY3Rpb24gc3RhcnRMaW5rKCRzY29wZSkge1xuICAgIHZhciBwcm9qZWN0SWQgPSAkc2NvcGUucHJvamVjdElkO1xuICAgIHZhciBvd25lciA9ICRzY29wZS5vd25lcjtcbiAgICB2YXIgcmVwb0lkID0gJHNjb3BlLnJlcG9JZCB8fCBwcm9qZWN0SWQ7XG4gICAgdmFyIHN0YXJ0ID0gVXJsSGVscGVycy5qb2luKERldmVsb3Blci5wcm9qZWN0TGluayhwcm9qZWN0SWQpLCBcIi93aWtpXCIsIG93bmVyLCByZXBvSWQpO1xuICAgIHZhciBicmFuY2ggPSAkc2NvcGUuYnJhbmNoO1xuICAgIGlmIChicmFuY2gpIHtcbiAgICAgIHN0YXJ0ID0gVXJsSGVscGVycy5qb2luKHN0YXJ0LCAnYnJhbmNoJywgYnJhbmNoKTtcbiAgICB9XG4gICAgcmV0dXJuIHN0YXJ0O1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgdHJ1ZSBpZiB0aGUgZ2l2ZW4gZmlsZW5hbWUvcGF0aCBpcyBhbiBpbmRleCBwYWdlIChuYW1lZCBpbmRleC4qIGFuZCBpcyBhIG1hcmtkb3duL2h0bWwgcGFnZSkuXG4gICAqXG4gICAqIEBwYXJhbSBwYXRoXG4gICAqIEByZXR1cm5zIHtib29sZWFufVxuICAgKi9cbiAgZXhwb3J0IGZ1bmN0aW9uIGlzSW5kZXhQYWdlKHBhdGg6IHN0cmluZykge1xuICAgIHJldHVybiBwYXRoICYmIChwYXRoLmVuZHNXaXRoKFwiaW5kZXgubWRcIikgfHwgcGF0aC5lbmRzV2l0aChcImluZGV4Lmh0bWxcIikgfHwgcGF0aC5lbmRzV2l0aChcImluZGV4XCIpKSA/IHRydWUgOiBmYWxzZTtcbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiB2aWV3TGluaygkc2NvcGUsIHBhZ2VJZDpzdHJpbmcsICRsb2NhdGlvbiwgZmlsZU5hbWU6c3RyaW5nID0gbnVsbCkge1xuICAgIHZhciBsaW5rOnN0cmluZyA9IG51bGw7XG4gICAgdmFyIHN0YXJ0ID0gc3RhcnRMaW5rKCRzY29wZSk7XG4gICAgaWYgKHBhZ2VJZCkge1xuICAgICAgLy8gZmlndXJlIG91dCB3aGljaCB2aWV3IHRvIHVzZSBmb3IgdGhpcyBwYWdlXG4gICAgICB2YXIgdmlldyA9IGlzSW5kZXhQYWdlKHBhZ2VJZCkgPyBcIi9ib29rL1wiIDogXCIvdmlldy9cIjtcbiAgICAgIGxpbmsgPSBzdGFydCArIHZpZXcgKyBlbmNvZGVQYXRoKENvcmUudHJpbUxlYWRpbmcocGFnZUlkLCBcIi9cIikpO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBsZXRzIHVzZSB0aGUgY3VycmVudCBwYXRoXG4gICAgICB2YXIgcGF0aDpzdHJpbmcgPSAkbG9jYXRpb24ucGF0aCgpO1xuICAgICAgbGluayA9IFwiI1wiICsgcGF0aC5yZXBsYWNlKC8oZWRpdHxjcmVhdGUpLywgXCJ2aWV3XCIpO1xuICAgIH1cbiAgICBpZiAoZmlsZU5hbWUgJiYgcGFnZUlkICYmIHBhZ2VJZC5lbmRzV2l0aChmaWxlTmFtZSkpIHtcbiAgICAgIHJldHVybiBsaW5rO1xuICAgIH1cbiAgICBpZiAoZmlsZU5hbWUpIHtcbiAgICAgIGlmICghbGluay5lbmRzV2l0aChcIi9cIikpIHtcbiAgICAgICAgbGluayArPSBcIi9cIjtcbiAgICAgIH1cbiAgICAgIGxpbmsgKz0gZmlsZU5hbWU7XG4gICAgfVxuICAgIHJldHVybiBsaW5rO1xuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIGJyYW5jaExpbmsoJHNjb3BlLCBwYWdlSWQ6IHN0cmluZywgJGxvY2F0aW9uLCBmaWxlTmFtZTpzdHJpbmcgPSBudWxsKSB7XG4gICAgcmV0dXJuIHZpZXdMaW5rKCRzY29wZSwgcGFnZUlkLCAkbG9jYXRpb24sIGZpbGVOYW1lKTtcbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiBlZGl0TGluaygkc2NvcGUsIHBhZ2VJZDpzdHJpbmcsICRsb2NhdGlvbikge1xuICAgIHZhciBsaW5rOnN0cmluZyA9IG51bGw7XG4gICAgdmFyIGZvcm1hdCA9IFdpa2kuZmlsZUZvcm1hdChwYWdlSWQpO1xuICAgIHN3aXRjaCAoZm9ybWF0KSB7XG4gICAgICBjYXNlIFwiaW1hZ2VcIjpcbiAgICAgICAgYnJlYWs7XG4gICAgICBkZWZhdWx0OlxuICAgICAgdmFyIHN0YXJ0ID0gc3RhcnRMaW5rKCRzY29wZSk7XG4gICAgICBpZiAocGFnZUlkKSB7XG4gICAgICAgIGxpbmsgPSBzdGFydCArIFwiL2VkaXQvXCIgKyBlbmNvZGVQYXRoKHBhZ2VJZCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBsZXRzIHVzZSB0aGUgY3VycmVudCBwYXRoXG4gICAgICAgIHZhciBwYXRoID0gJGxvY2F0aW9uLnBhdGgoKTtcbiAgICAgICAgbGluayA9IFwiI1wiICsgcGF0aC5yZXBsYWNlKC8odmlld3xjcmVhdGUpLywgXCJlZGl0XCIpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbGluaztcbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiBjcmVhdGVMaW5rKCRzY29wZSwgcGFnZUlkOnN0cmluZywgJGxvY2F0aW9uKSB7XG4gICAgdmFyIHBhdGggPSAkbG9jYXRpb24ucGF0aCgpO1xuICAgIHZhciBzdGFydCA9IHN0YXJ0TGluaygkc2NvcGUpO1xuICAgIHZhciBsaW5rID0gJyc7XG4gICAgaWYgKHBhZ2VJZCkge1xuICAgICAgbGluayA9IHN0YXJ0ICsgXCIvY3JlYXRlL1wiICsgZW5jb2RlUGF0aChwYWdlSWQpO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBsZXRzIHVzZSB0aGUgY3VycmVudCBwYXRoXG4gICAgICBsaW5rID0gXCIjXCIgKyBwYXRoLnJlcGxhY2UoLyh2aWV3fGVkaXR8Zm9ybVRhYmxlKS8sIFwiY3JlYXRlXCIpO1xuICAgIH1cbiAgICAvLyB3ZSBoYXZlIHRoZSBsaW5rIHNvIGxldHMgbm93IHJlbW92ZSB0aGUgbGFzdCBwYXRoXG4gICAgLy8gb3IgaWYgdGhlcmUgaXMgbm8gLyBpbiB0aGUgcGF0aCB0aGVuIHJlbW92ZSB0aGUgbGFzdCBzZWN0aW9uXG4gICAgdmFyIGlkeCA9IGxpbmsubGFzdEluZGV4T2YoXCIvXCIpO1xuICAgIGlmIChpZHggPiAwICYmICEkc2NvcGUuY2hpbGRyZW4gJiYgIXBhdGguc3RhcnRzV2l0aChcIi93aWtpL2Zvcm1UYWJsZVwiKSkge1xuICAgICAgbGluayA9IGxpbmsuc3Vic3RyaW5nKDAsIGlkeCArIDEpO1xuICAgIH1cbiAgICByZXR1cm4gbGluaztcbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiBlbmNvZGVQYXRoKHBhZ2VJZDpzdHJpbmcpIHtcbiAgICByZXR1cm4gcGFnZUlkLnNwbGl0KFwiL1wiKS5tYXAoZW5jb2RlVVJJQ29tcG9uZW50KS5qb2luKFwiL1wiKTtcbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiBkZWNvZGVQYXRoKHBhZ2VJZDpzdHJpbmcpIHtcbiAgICByZXR1cm4gcGFnZUlkLnNwbGl0KFwiL1wiKS5tYXAoZGVjb2RlVVJJQ29tcG9uZW50KS5qb2luKFwiL1wiKTtcbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiBmaWxlRm9ybWF0KG5hbWU6c3RyaW5nLCBmaWxlRXh0ZW5zaW9uVHlwZVJlZ2lzdHJ5Pykge1xuICAgIHZhciBleHRlbnNpb24gPSBmaWxlRXh0ZW5zaW9uKG5hbWUpO1xuICAgIGlmIChuYW1lKSB7XG4gICAgICBpZiAobmFtZSA9PT0gXCJKZW5raW5zZmlsZVwiKSB7XG4gICAgICAgIGV4dGVuc2lvbiA9IFwiZ3Jvb3Z5XCI7XG4gICAgICB9XG4gICAgfVxuICAgIHZhciBhbnN3ZXIgPSBudWxsO1xuICAgIGlmICghZmlsZUV4dGVuc2lvblR5cGVSZWdpc3RyeSkge1xuICAgICAgZmlsZUV4dGVuc2lvblR5cGVSZWdpc3RyeSA9IEhhd3Rpb0NvcmUuaW5qZWN0b3IuZ2V0KFwiZmlsZUV4dGVuc2lvblR5cGVSZWdpc3RyeVwiKTtcbiAgICB9XG4gICAgYW5ndWxhci5mb3JFYWNoKGZpbGVFeHRlbnNpb25UeXBlUmVnaXN0cnksIChhcnJheSwga2V5KSA9PiB7XG4gICAgICBpZiAoYXJyYXkuaW5kZXhPZihleHRlbnNpb24pID49IDApIHtcbiAgICAgICAgYW5zd2VyID0ga2V5O1xuICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiBhbnN3ZXI7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyB0aGUgZmlsZSBuYW1lIG9mIHRoZSBnaXZlbiBwYXRoOyBzdHJpcHBpbmcgb2ZmIGFueSBkaXJlY3Rvcmllc1xuICAgKiBAbWV0aG9kIGZpbGVOYW1lXG4gICAqIEBmb3IgV2lraVxuICAgKiBAc3RhdGljXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoXG4gICAqIEByZXR1cm4ge1N0cmluZ31cbiAgICovXG4gIGV4cG9ydCBmdW5jdGlvbiBmaWxlTmFtZShwYXRoOiBzdHJpbmcpIHtcbiAgICBpZiAocGF0aCkge1xuICAgICAgIHZhciBpZHggPSBwYXRoLmxhc3RJbmRleE9mKFwiL1wiKTtcbiAgICAgIGlmIChpZHggPiAwKSB7XG4gICAgICAgIHJldHVybiBwYXRoLnN1YnN0cmluZyhpZHggKyAxKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHBhdGg7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyB0aGUgZm9sZGVyIG9mIHRoZSBnaXZlbiBwYXRoIChldmVyeXRoaW5nIGJ1dCB0aGUgbGFzdCBwYXRoIG5hbWUpXG4gICAqIEBtZXRob2QgZmlsZVBhcmVudFxuICAgKiBAZm9yIFdpa2lcbiAgICogQHN0YXRpY1xuICAgKiBAcGFyYW0ge1N0cmluZ30gcGF0aFxuICAgKiBAcmV0dXJuIHtTdHJpbmd9XG4gICAqL1xuICBleHBvcnQgZnVuY3Rpb24gZmlsZVBhcmVudChwYXRoOiBzdHJpbmcpIHtcbiAgICBpZiAocGF0aCkge1xuICAgICAgIHZhciBpZHggPSBwYXRoLmxhc3RJbmRleE9mKFwiL1wiKTtcbiAgICAgIGlmIChpZHggPiAwKSB7XG4gICAgICAgIHJldHVybiBwYXRoLnN1YnN0cmluZygwLCBpZHgpO1xuICAgICAgfVxuICAgIH1cbiAgICAvLyBsZXRzIHJldHVybiB0aGUgcm9vdCBkaXJlY3RvcnlcbiAgICByZXR1cm4gXCJcIjtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIHRoZSBmaWxlIG5hbWUgZm9yIHRoZSBnaXZlbiBuYW1lOyB3ZSBoaWRlIHNvbWUgZXh0ZW5zaW9uc1xuICAgKiBAbWV0aG9kIGhpZGVGaW5lTmFtZUV4dGVuc2lvbnNcbiAgICogQGZvciBXaWtpXG4gICAqIEBzdGF0aWNcbiAgICogQHBhcmFtIHtTdHJpbmd9IG5hbWVcbiAgICogQHJldHVybiB7U3RyaW5nfVxuICAgKi9cbiAgZXhwb3J0IGZ1bmN0aW9uIGhpZGVGaWxlTmFtZUV4dGVuc2lvbnMobmFtZSkge1xuICAgIGlmIChuYW1lKSB7XG4gICAgICBhbmd1bGFyLmZvckVhY2goV2lraS5oaWRlRXh0ZW5zaW9ucywgKGV4dGVuc2lvbikgPT4ge1xuICAgICAgICBpZiAobmFtZS5lbmRzV2l0aChleHRlbnNpb24pKSB7XG4gICAgICAgICAgbmFtZSA9IG5hbWUuc3Vic3RyaW5nKDAsIG5hbWUubGVuZ3RoIC0gZXh0ZW5zaW9uLmxlbmd0aCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cbiAgICByZXR1cm4gbmFtZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIHRoZSBVUkwgdG8gcGVyZm9ybSBhIEdFVCBvciBQT1NUIGZvciB0aGUgZ2l2ZW4gYnJhbmNoIG5hbWUgYW5kIHBhdGhcbiAgICovXG4gIGV4cG9ydCBmdW5jdGlvbiBnaXRSZXN0VVJMKCRzY29wZSwgcGF0aDogc3RyaW5nKSB7XG4gICAgdmFyIHVybCA9IGdpdFJlbGF0aXZlVVJMKCRzY29wZSwgcGF0aCk7XG4gICAgdXJsID0gQ29yZS51cmwoJy8nICsgdXJsKTtcblxuLypcbiAgICB2YXIgY29ubmVjdGlvbk5hbWUgPSBDb3JlLmdldENvbm5lY3Rpb25OYW1lUGFyYW1ldGVyKCk7XG4gICAgaWYgKGNvbm5lY3Rpb25OYW1lKSB7XG4gICAgICB2YXIgY29ubmVjdGlvbk9wdGlvbnMgPSBDb3JlLmdldENvbm5lY3RPcHRpb25zKGNvbm5lY3Rpb25OYW1lKTtcbiAgICAgIGlmIChjb25uZWN0aW9uT3B0aW9ucykge1xuICAgICAgICBjb25uZWN0aW9uT3B0aW9ucy5wYXRoID0gdXJsO1xuICAgICAgICB1cmwgPSA8c3RyaW5nPkNvcmUuY3JlYXRlU2VydmVyQ29ubmVjdGlvblVybChjb25uZWN0aW9uT3B0aW9ucyk7XG4gICAgICB9XG4gICAgfVxuXG4qL1xuICAgIHJldHVybiB1cmw7XG4gIH1cblxuICAgIGZ1bmN0aW9uIGdpdFVybFByZWZpeCgpIHtcbiAgICAgICAgdmFyIHByZWZpeCA9IFwiXCI7XG4gICAgICAgIHZhciBpbmplY3RvciA9IEhhd3Rpb0NvcmUuaW5qZWN0b3I7XG4gICAgICAgIGlmIChpbmplY3Rvcikge1xuICAgICAgICAgICAgcHJlZml4ID0gaW5qZWN0b3IuZ2V0KFwiV2lraUdpdFVybFByZWZpeFwiKSB8fCBcIlwiO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBwcmVmaXg7XG4gICAgfVxuXG4gICAgLyoqXG4gICAqIFJldHVybnMgYSByZWxhdGl2ZSBVUkwgdG8gcGVyZm9ybSBhIEdFVCBvciBQT1NUIGZvciB0aGUgZ2l2ZW4gYnJhbmNoL3BhdGhcbiAgICovXG4gIGV4cG9ydCBmdW5jdGlvbiBnaXRSZWxhdGl2ZVVSTCgkc2NvcGUsIHBhdGg6IHN0cmluZykge1xuICAgICAgdmFyIGJyYW5jaCA9ICRzY29wZS5icmFuY2g7XG4gICAgdmFyIHByZWZpeCA9IGdpdFVybFByZWZpeCgpO1xuICAgIGJyYW5jaCA9IGJyYW5jaCB8fCBcIm1hc3RlclwiO1xuICAgIHBhdGggPSBwYXRoIHx8IFwiL1wiO1xuICAgIHJldHVybiBVcmxIZWxwZXJzLmpvaW4ocHJlZml4LCBcImdpdC9cIiArIGJyYW5jaCwgcGF0aCk7XG4gIH1cblxuXG4gIC8qKlxuICAgKiBUYWtlcyBhIHJvdyBjb250YWluaW5nIHRoZSBlbnRpdHkgb2JqZWN0OyBvciBjYW4gdGFrZSB0aGUgZW50aXR5IGRpcmVjdGx5LlxuICAgKlxuICAgKiBJdCB0aGVuIHVzZXMgdGhlIG5hbWUsIGRpcmVjdG9yeSBhbmQgeG1sTmFtZXNwYWNlcyBwcm9wZXJ0aWVzXG4gICAqXG4gICAqIEBtZXRob2QgZmlsZUljb25IdG1sXG4gICAqIEBmb3IgV2lraVxuICAgKiBAc3RhdGljXG4gICAqIEBwYXJhbSB7YW55fSByb3dcbiAgICogQHJldHVybiB7U3RyaW5nfVxuICAgKlxuICAgKi9cbiAgZXhwb3J0IGZ1bmN0aW9uIGZpbGVJY29uSHRtbChyb3cpIHtcbiAgICB2YXIgbmFtZSA9IHJvdy5uYW1lO1xuICAgIHZhciBwYXRoID0gcm93LnBhdGg7XG4gICAgdmFyIGJyYW5jaCA9IHJvdy5icmFuY2ggO1xuICAgIHZhciBkaXJlY3RvcnkgPSByb3cuZGlyZWN0b3J5O1xuICAgIHZhciB4bWxOYW1lc3BhY2VzID0gcm93LnhtbE5hbWVzcGFjZXM7XG4gICAgdmFyIGljb25VcmwgPSByb3cuaWNvblVybDtcbiAgICB2YXIgZW50aXR5ID0gcm93LmVudGl0eTtcbiAgICBpZiAoZW50aXR5KSB7XG4gICAgICBuYW1lID0gbmFtZSB8fCBlbnRpdHkubmFtZTtcbiAgICAgIHBhdGggPSBwYXRoIHx8IGVudGl0eS5wYXRoO1xuICAgICAgYnJhbmNoID0gYnJhbmNoIHx8IGVudGl0eS5icmFuY2g7XG4gICAgICBkaXJlY3RvcnkgPSBkaXJlY3RvcnkgfHwgZW50aXR5LmRpcmVjdG9yeTtcbiAgICAgIHhtbE5hbWVzcGFjZXMgPSB4bWxOYW1lc3BhY2VzIHx8IGVudGl0eS54bWxOYW1lc3BhY2VzO1xuICAgICAgaWNvblVybCA9IGljb25VcmwgfHwgZW50aXR5Lmljb25Vcmw7XG4gICAgfVxuICAgIGJyYW5jaCA9IGJyYW5jaCB8fCBcIm1hc3RlclwiO1xuICAgIHZhciBjc3MgPSBudWxsO1xuICAgIHZhciBpY29uOnN0cmluZyA9IG51bGw7XG4gICAgdmFyIGV4dGVuc2lvbiA9IGZpbGVFeHRlbnNpb24obmFtZSk7XG4gICAgLy8gVE9ETyBjb3VsZCB3ZSB1c2UgZGlmZmVyZW50IGljb25zIGZvciBtYXJrZG93biB2IHhtbCB2IGh0bWxcbiAgICBpZiAoeG1sTmFtZXNwYWNlcyAmJiB4bWxOYW1lc3BhY2VzLmxlbmd0aCkge1xuICAgICAgaWYgKHhtbE5hbWVzcGFjZXMuYW55KChucykgPT4gV2lraS5jYW1lbE5hbWVzcGFjZXMuYW55KG5zKSkpIHtcbiAgICAgICAgaWNvbiA9IFwiaW1nL2ljb25zL2NhbWVsLnN2Z1wiO1xuICAgICAgfSBlbHNlIGlmICh4bWxOYW1lc3BhY2VzLmFueSgobnMpID0+IFdpa2kuZG96ZXJOYW1lc3BhY2VzLmFueShucykpKSB7XG4gICAgICAgIGljb24gPSBcImltZy9pY29ucy9kb3plci9kb3plci5naWZcIjtcbiAgICAgIH0gZWxzZSBpZiAoeG1sTmFtZXNwYWNlcy5hbnkoKG5zKSA9PiBXaWtpLmFjdGl2ZW1xTmFtZXNwYWNlcy5hbnkobnMpKSkge1xuICAgICAgICBpY29uID0gXCJpbWcvaWNvbnMvbWVzc2FnZWJyb2tlci5zdmdcIjtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGxvZy5kZWJ1ZyhcImZpbGUgXCIgKyBuYW1lICsgXCIgaGFzIG5hbWVzcGFjZXMgXCIgKyB4bWxOYW1lc3BhY2VzKTtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKCFpY29uVXJsICYmIG5hbWUpIHtcbiAgICAgIHZhciBsb3dlck5hbWUgPSBuYW1lLnRvTG93ZXJDYXNlKCk7XG4gICAgICBpZiAobG93ZXJOYW1lID09IFwicG9tLnhtbFwiKSB7XG4gICAgICAgIGljb25VcmwgPSBcImltZy9tYXZlbi1pY29uLnBuZ1wiO1xuICAgICAgfSBlbHNlIGlmIChsb3dlck5hbWUgPT0gXCJqZW5raW5zZmlsZVwiKSB7XG4gICAgICAgIGljb25VcmwgPSBcImltZy9qZW5raW5zLWljb24uc3ZnXCI7XG4gICAgICB9IGVsc2UgaWYgKGxvd2VyTmFtZSA9PSBcImZhYnJpYzgueW1sXCIpIHtcbiAgICAgICAgaWNvblVybCA9IFwiaW1nL2ZhYnJpYzhfaWNvbi5zdmdcIjtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoaWNvblVybCkge1xuICAgICAgY3NzID0gbnVsbDtcbiAgICAgIGljb24gPSBpY29uVXJsO1xuLypcbiAgICAgIHZhciBwcmVmaXggPSBnaXRVcmxQcmVmaXgoKTtcbiAgICAgIGljb24gPSBVcmxIZWxwZXJzLmpvaW4ocHJlZml4LCBcImdpdFwiLCBpY29uVXJsKTtcbiovXG4vKlxuICAgICAgdmFyIGNvbm5lY3Rpb25OYW1lID0gQ29yZS5nZXRDb25uZWN0aW9uTmFtZVBhcmFtZXRlcigpO1xuICAgICAgaWYgKGNvbm5lY3Rpb25OYW1lKSB7XG4gICAgICAgIHZhciBjb25uZWN0aW9uT3B0aW9ucyA9IENvcmUuZ2V0Q29ubmVjdE9wdGlvbnMoY29ubmVjdGlvbk5hbWUpO1xuICAgICAgICBpZiAoY29ubmVjdGlvbk9wdGlvbnMpIHtcbiAgICAgICAgICBjb25uZWN0aW9uT3B0aW9ucy5wYXRoID0gQ29yZS51cmwoJy8nICsgaWNvbik7XG4gICAgICAgICAgaWNvbiA9IDxzdHJpbmc+Q29yZS5jcmVhdGVTZXJ2ZXJDb25uZWN0aW9uVXJsKGNvbm5lY3Rpb25PcHRpb25zKTtcbiAgICAgICAgfVxuICAgICAgfVxuKi9cbiAgICB9XG4gICAgaWYgKCFpY29uKSB7XG4gICAgICBpZiAoZGlyZWN0b3J5KSB7XG4gICAgICAgIHN3aXRjaCAoZXh0ZW5zaW9uKSB7XG4gICAgICAgICAgY2FzZSAncHJvZmlsZSc6XG4gICAgICAgICAgICBjc3MgPSBcImZhIGZhLWJvb2tcIjtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAvLyBsb2cuZGVidWcoXCJObyBtYXRjaCBmb3IgZXh0ZW5zaW9uOiBcIiwgZXh0ZW5zaW9uLCBcIiB1c2luZyBhIGdlbmVyaWMgZm9sZGVyIGljb25cIik7XG4gICAgICAgICAgICBjc3MgPSBcImZhIGZhLWZvbGRlciBmb2xkZXItaWNvblwiO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzd2l0Y2ggKGV4dGVuc2lvbikge1xuICAgICAgICAgIGNhc2UgJ2phdmEnOlxuICAgICAgICAgICAgaWNvbiA9IFwiaW1nL2phdmEuc3ZnXCI7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICBjYXNlICdwbmcnOlxuICAgICAgICAgIGNhc2UgJ3N2Zyc6XG4gICAgICAgICAgY2FzZSAnanBnJzpcbiAgICAgICAgICBjYXNlICdnaWYnOlxuICAgICAgICAgICAgY3NzID0gbnVsbDtcbiAgICAgICAgICAgIGljb24gPSBXaWtpLmdpdFJlbGF0aXZlVVJMKGJyYW5jaCwgcGF0aCk7XG4vKlxuICAgICAgICAgICAgdmFyIGNvbm5lY3Rpb25OYW1lID0gQ29yZS5nZXRDb25uZWN0aW9uTmFtZVBhcmFtZXRlcigpO1xuICAgICAgICAgICAgaWYgKGNvbm5lY3Rpb25OYW1lKSB7XG4gICAgICAgICAgICAgIHZhciBjb25uZWN0aW9uT3B0aW9ucyA9IENvcmUuZ2V0Q29ubmVjdE9wdGlvbnMoY29ubmVjdGlvbk5hbWUpO1xuICAgICAgICAgICAgICBpZiAoY29ubmVjdGlvbk9wdGlvbnMpIHtcbiAgICAgICAgICAgICAgICBjb25uZWN0aW9uT3B0aW9ucy5wYXRoID0gQ29yZS51cmwoJy8nICsgaWNvbik7XG4gICAgICAgICAgICAgICAgaWNvbiA9IDxzdHJpbmc+Q29yZS5jcmVhdGVTZXJ2ZXJDb25uZWN0aW9uVXJsKGNvbm5lY3Rpb25PcHRpb25zKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuKi9cbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIGNhc2UgJ2pzb24nOlxuICAgICAgICAgIGNhc2UgJ3htbCc6XG4gICAgICAgICAgICBjc3MgPSBcImZhIGZhLWZpbGUtdGV4dFwiO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgY2FzZSAnbWQnOlxuICAgICAgICAgICAgY3NzID0gXCJmYSBmYS1maWxlLXRleHQtb1wiO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIC8vIGxvZy5kZWJ1ZyhcIk5vIG1hdGNoIGZvciBleHRlbnNpb246IFwiLCBleHRlbnNpb24sIFwiIHVzaW5nIGEgZ2VuZXJpYyBmaWxlIGljb25cIik7XG4gICAgICAgICAgICBjc3MgPSBcImZhIGZhLWZpbGUtb1wiO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIGlmIChpY29uKSB7XG4gICAgICByZXR1cm4gXCI8aW1nIHNyYz0nXCIgKyBDb3JlLnVybChpY29uKSArIFwiJz5cIjtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIFwiPGkgY2xhc3M9J1wiICsgY3NzICsgXCInPjwvaT5cIjtcbiAgICB9XG4gIH1cblxuICBleHBvcnQgZnVuY3Rpb24gaWNvbkNsYXNzKHJvdykge1xuICAgIHZhciBuYW1lID0gcm93LmdldFByb3BlcnR5KFwibmFtZVwiKTtcbiAgICB2YXIgZXh0ZW5zaW9uID0gZmlsZUV4dGVuc2lvbihuYW1lKTtcbiAgICB2YXIgZGlyZWN0b3J5ID0gcm93LmdldFByb3BlcnR5KFwiZGlyZWN0b3J5XCIpO1xuICAgIGlmIChkaXJlY3RvcnkpIHtcbiAgICAgIHJldHVybiBcImZhIGZhLWZvbGRlclwiO1xuICAgIH1cbiAgICBpZiAoXCJ4bWxcIiA9PT0gZXh0ZW5zaW9uKSB7XG4gICAgICAgIHJldHVybiBcImZhIGZhLWNvZ1wiO1xuICAgIH0gZWxzZSBpZiAoXCJtZFwiID09PSBleHRlbnNpb24pIHtcbiAgICAgICAgcmV0dXJuIFwiZmEgZmEtZmlsZS10ZXh0LW9cIjtcbiAgICB9XG4gICAgLy8gVE9ETyBjb3VsZCB3ZSB1c2UgZGlmZmVyZW50IGljb25zIGZvciBtYXJrZG93biB2IHhtbCB2IGh0bWxcbiAgICByZXR1cm4gXCJmYSBmYS1maWxlLW9cIjtcbiAgfVxuXG5cbiAgLyoqXG4gICAqIEV4dHJhY3RzIHRoZSBwYWdlSWQsIGJyYW5jaCwgb2JqZWN0SWQgZnJvbSB0aGUgcm91dGUgcGFyYW1ldGVyc1xuICAgKiBAbWV0aG9kIGluaXRTY29wZVxuICAgKiBAZm9yIFdpa2lcbiAgICogQHN0YXRpY1xuICAgKiBAcGFyYW0geyp9ICRzY29wZVxuICAgKiBAcGFyYW0ge2FueX0gJHJvdXRlUGFyYW1zXG4gICAqIEBwYXJhbSB7bmcuSUxvY2F0aW9uU2VydmljZX0gJGxvY2F0aW9uXG4gICAqL1xuICBleHBvcnQgZnVuY3Rpb24gaW5pdFNjb3BlKCRzY29wZSwgJHJvdXRlUGFyYW1zLCAkbG9jYXRpb24pIHtcbiAgICAkc2NvcGUucGFnZUlkID0gV2lraS5wYWdlSWQoJHJvdXRlUGFyYW1zLCAkbG9jYXRpb24pO1xuICAgICRzY29wZS5vd25lciA9ICRyb3V0ZVBhcmFtc1tcIm93bmVyXCJdO1xuICAgICRzY29wZS5yZXBvSWQgPSAkcm91dGVQYXJhbXNbXCJyZXBvSWRcIl07XG4gICAgJHNjb3BlLnByb2plY3RJZCA9ICRyb3V0ZVBhcmFtc1tcInByb2plY3RJZFwiXTtcbiAgICAkc2NvcGUubmFtZXNwYWNlID0gJHJvdXRlUGFyYW1zW1wibmFtZXNwYWNlXCJdO1xuICAgICRzY29wZS5icmFuY2ggPSAkcm91dGVQYXJhbXNbXCJicmFuY2hcIl0gfHwgJGxvY2F0aW9uLnNlYXJjaCgpW1wiYnJhbmNoXCJdO1xuICAgICRzY29wZS5vYmplY3RJZCA9ICRyb3V0ZVBhcmFtc1tcIm9iamVjdElkXCJdIHx8ICRyb3V0ZVBhcmFtc1tcImRpZmZPYmplY3RJZDFcIl07XG4gICAgJHNjb3BlLnN0YXJ0TGluayA9IHN0YXJ0TGluaygkc2NvcGUpO1xuICAgICRzY29wZS4kdmlld0xpbmsgPSB2aWV3TGluaygkc2NvcGUsICRzY29wZS5wYWdlSWQsICRsb2NhdGlvbik7XG4gICAgJHNjb3BlLmhpc3RvcnlMaW5rID0gc3RhcnRMaW5rKCRzY29wZSkgKyBcIi9oaXN0b3J5L1wiICsgKCRzY29wZS5wYWdlSWQgfHwgXCJcIik7XG4gICAgJHNjb3BlLndpa2lSZXBvc2l0b3J5ID0gbmV3IEdpdFdpa2lSZXBvc2l0b3J5KCRzY29wZSk7XG5cbiAgICAkc2NvcGUuJHdvcmtzcGFjZUxpbmsgPSBEZXZlbG9wZXIud29ya3NwYWNlTGluaygpO1xuICAgICRzY29wZS4kcHJvamVjdExpbmsgPSBEZXZlbG9wZXIucHJvamVjdExpbmsoJHNjb3BlLnByb2plY3RJZCk7XG4gICAgJHNjb3BlLmJyZWFkY3J1bWJDb25maWcgPSBEZXZlbG9wZXIuY3JlYXRlUHJvamVjdEJyZWFkY3J1bWJzKCRzY29wZS5wcm9qZWN0SWQsIGNyZWF0ZVNvdXJjZUJyZWFkY3J1bWJzKCRzY29wZSkpO1xuICAgICRzY29wZS5zdWJUYWJDb25maWcgPSBEZXZlbG9wZXIuY3JlYXRlUHJvamVjdFN1Yk5hdkJhcnMoJHNjb3BlLnByb2plY3RJZCk7XG4gIH1cblxuICAvKipcbiAgICogTG9hZHMgdGhlIGJyYW5jaGVzIGZvciB0aGlzIHdpa2kgcmVwb3NpdG9yeSBhbmQgc3RvcmVzIHRoZW0gaW4gdGhlIGJyYW5jaGVzIHByb3BlcnR5IGluXG4gICAqIHRoZSAkc2NvcGUgYW5kIGVuc3VyZXMgJHNjb3BlLmJyYW5jaCBpcyBzZXQgdG8gYSB2YWxpZCB2YWx1ZVxuICAgKlxuICAgKiBAcGFyYW0gd2lraVJlcG9zaXRvcnlcbiAgICogQHBhcmFtICRzY29wZVxuICAgKiBAcGFyYW0gaXNGbWMgd2hldGhlciB3ZSBydW4gYXMgZmFicmljOCBvciBhcyBoYXd0aW9cbiAgICovXG4gIGV4cG9ydCBmdW5jdGlvbiBsb2FkQnJhbmNoZXMoam9sb2tpYSwgd2lraVJlcG9zaXRvcnksICRzY29wZSwgaXNGbWMgPSBmYWxzZSkge1xuICAgIHdpa2lSZXBvc2l0b3J5LmJyYW5jaGVzKChyZXNwb25zZSkgPT4ge1xuICAgICAgLy8gbGV0cyBzb3J0IGJ5IHZlcnNpb24gbnVtYmVyXG4gICAgICAkc2NvcGUuYnJhbmNoZXMgPSByZXNwb25zZS5zb3J0QnkoKHYpID0+IENvcmUudmVyc2lvblRvU29ydGFibGVTdHJpbmcodiksIHRydWUpO1xuXG4gICAgICAvLyBkZWZhdWx0IHRoZSBicmFuY2ggbmFtZSBpZiB3ZSBoYXZlICdtYXN0ZXInXG4gICAgICBpZiAoISRzY29wZS5icmFuY2ggJiYgJHNjb3BlLmJyYW5jaGVzLmZpbmQoKGJyYW5jaCkgPT4ge1xuICAgICAgICByZXR1cm4gYnJhbmNoID09PSBcIm1hc3RlclwiO1xuICAgICAgfSkpIHtcbiAgICAgICAgJHNjb3BlLmJyYW5jaCA9IFwibWFzdGVyXCI7XG4gICAgICB9XG4gICAgICBDb3JlLiRhcHBseSgkc2NvcGUpO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIEV4dHJhY3RzIHRoZSBwYWdlSWQgZnJvbSB0aGUgcm91dGUgcGFyYW1ldGVyc1xuICAgKiBAbWV0aG9kIHBhZ2VJZFxuICAgKiBAZm9yIFdpa2lcbiAgICogQHN0YXRpY1xuICAgKiBAcGFyYW0ge2FueX0gJHJvdXRlUGFyYW1zXG4gICAqIEBwYXJhbSBAbmcuSUxvY2F0aW9uU2VydmljZSBAbG9jYXRpb25cbiAgICogQHJldHVybiB7U3RyaW5nfVxuICAgKi9cbiAgZXhwb3J0IGZ1bmN0aW9uIHBhZ2VJZCgkcm91dGVQYXJhbXMsICRsb2NhdGlvbikge1xuICAgIHZhciBwYWdlSWQgPSAkcm91dGVQYXJhbXNbJ3BhZ2UnXTtcbiAgICBpZiAoIXBhZ2VJZCkge1xuICAgICAgLy8gTGV0cyBkZWFsIHdpdGggdGhlIGhhY2sgb2YgQW5ndWxhckpTIG5vdCBzdXBwb3J0aW5nIC8gaW4gYSBwYXRoIHZhcmlhYmxlXG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IDEwMDsgaSsrKSB7XG4gICAgICAgIHZhciB2YWx1ZSA9ICRyb3V0ZVBhcmFtc1sncGF0aCcgKyBpXTtcbiAgICAgICAgaWYgKGFuZ3VsYXIuaXNEZWZpbmVkKHZhbHVlKSkge1xuICAgICAgICAgIGlmICghcGFnZUlkKSB7XG4gICAgICAgICAgICBwYWdlSWQgPSB2YWx1ZTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcGFnZUlkICs9IFwiL1wiICsgdmFsdWU7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgYnJlYWs7XG4gICAgICB9XG4gICAgICByZXR1cm4gcGFnZUlkIHx8IFwiL1wiO1xuICAgIH1cblxuICAgIC8vIGlmIG5vICRyb3V0ZVBhcmFtcyB2YXJpYWJsZXMgbGV0cyBmaWd1cmUgaXQgb3V0IGZyb20gdGhlICRsb2NhdGlvblxuICAgIGlmICghcGFnZUlkKSB7XG4gICAgICBwYWdlSWQgPSBwYWdlSWRGcm9tVVJJKCRsb2NhdGlvbi5wYXRoKCkpO1xuICAgIH1cbiAgICByZXR1cm4gcGFnZUlkO1xuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIHBhZ2VJZEZyb21VUkkodXJsOnN0cmluZykge1xuICAgIHZhciB3aWtpUHJlZml4ID0gXCIvd2lraS9cIjtcbiAgICBpZiAodXJsICYmIHVybC5zdGFydHNXaXRoKHdpa2lQcmVmaXgpKSB7XG4gICAgICB2YXIgaWR4ID0gdXJsLmluZGV4T2YoXCIvXCIsIHdpa2lQcmVmaXgubGVuZ3RoICsgMSk7XG4gICAgICBpZiAoaWR4ID4gMCkge1xuICAgICAgICByZXR1cm4gdXJsLnN1YnN0cmluZyhpZHggKyAxLCB1cmwubGVuZ3RoKVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbnVsbFxuXG4gIH1cblxuICBleHBvcnQgZnVuY3Rpb24gZmlsZUV4dGVuc2lvbihuYW1lKSB7XG4gICAgaWYgKG5hbWUuaW5kZXhPZignIycpID4gMClcbiAgICAgIG5hbWUgPSBuYW1lLnN1YnN0cmluZygwLCBuYW1lLmluZGV4T2YoJyMnKSk7XG4gICAgcmV0dXJuIENvcmUuZmlsZUV4dGVuc2lvbihuYW1lLCBcIm1hcmtkb3duXCIpO1xuICB9XG5cblxuICBleHBvcnQgZnVuY3Rpb24gb25Db21wbGV0ZShzdGF0dXMpIHtcbiAgICBjb25zb2xlLmxvZyhcIkNvbXBsZXRlZCBvcGVyYXRpb24gd2l0aCBzdGF0dXM6IFwiICsgSlNPTi5zdHJpbmdpZnkoc3RhdHVzKSk7XG4gIH1cblxuICAvKipcbiAgICogUGFyc2VzIHRoZSBnaXZlbiBKU09OIHRleHQgcmVwb3J0aW5nIHRvIHRoZSB1c2VyIGlmIHRoZXJlIGlzIGEgcGFyc2UgZXJyb3JcbiAgICogQG1ldGhvZCBwYXJzZUpzb25cbiAgICogQGZvciBXaWtpXG4gICAqIEBzdGF0aWNcbiAgICogQHBhcmFtIHtTdHJpbmd9IHRleHRcbiAgICogQHJldHVybiB7YW55fVxuICAgKi9cbiAgZXhwb3J0IGZ1bmN0aW9uIHBhcnNlSnNvbih0ZXh0OnN0cmluZykge1xuICAgIGlmICh0ZXh0KSB7XG4gICAgICB0cnkge1xuICAgICAgICByZXR1cm4gSlNPTi5wYXJzZSh0ZXh0KTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgQ29yZS5ub3RpZmljYXRpb24oXCJlcnJvclwiLCBcIkZhaWxlZCB0byBwYXJzZSBKU09OOiBcIiArIGUpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIC8qKlxuICAgKiBBZGp1c3RzIGEgcmVsYXRpdmUgb3IgYWJzb2x1dGUgbGluayBmcm9tIGEgd2lraSBvciBmaWxlIHN5c3RlbSB0byBvbmUgdXNpbmcgdGhlIGhhc2ggYmFuZyBzeW50YXhcbiAgICogQG1ldGhvZCBhZGp1c3RIcmVmXG4gICAqIEBmb3IgV2lraVxuICAgKiBAc3RhdGljXG4gICAqIEBwYXJhbSB7Kn0gJHNjb3BlXG4gICAqIEBwYXJhbSB7bmcuSUxvY2F0aW9uU2VydmljZX0gJGxvY2F0aW9uXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBocmVmXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBmaWxlRXh0ZW5zaW9uXG4gICAqIEByZXR1cm4ge3N0cmluZ31cbiAgICovXG4gIGV4cG9ydCBmdW5jdGlvbiBhZGp1c3RIcmVmKCRzY29wZSwgJGxvY2F0aW9uLCBocmVmLCBmaWxlRXh0ZW5zaW9uKSB7XG4gICAgdmFyIGV4dGVuc2lvbiA9IGZpbGVFeHRlbnNpb24gPyBcIi5cIiArIGZpbGVFeHRlbnNpb24gOiBcIlwiO1xuXG4gICAgLy8gaWYgdGhlIGxhc3QgcGFydCBvZiB0aGUgcGF0aCBoYXMgYSBkb3QgaW4gaXQgbGV0c1xuICAgIC8vIGV4Y2x1ZGUgaXQgYXMgd2UgYXJlIHJlbGF0aXZlIHRvIGEgbWFya2Rvd24gb3IgaHRtbCBmaWxlIGluIGEgZm9sZGVyXG4gICAgLy8gc3VjaCBhcyB3aGVuIHZpZXdpbmcgcmVhZG1lLm1kIG9yIGluZGV4Lm1kXG4gICAgdmFyIHBhdGggPSAkbG9jYXRpb24ucGF0aCgpO1xuICAgIHZhciBmb2xkZXJQYXRoID0gcGF0aDtcbiAgICB2YXIgaWR4ID0gcGF0aC5sYXN0SW5kZXhPZihcIi9cIik7XG4gICAgaWYgKGlkeCA+IDApIHtcbiAgICAgIHZhciBsYXN0TmFtZSA9IHBhdGguc3Vic3RyaW5nKGlkeCArIDEpO1xuICAgICAgaWYgKGxhc3ROYW1lLmluZGV4T2YoXCIuXCIpID49IDApIHtcbiAgICAgICAgZm9sZGVyUGF0aCA9IHBhdGguc3Vic3RyaW5nKDAsIGlkeCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gRGVhbCB3aXRoIHJlbGF0aXZlIFVSTHMgZmlyc3QuLi5cbiAgICBpZiAoaHJlZi5zdGFydHNXaXRoKCcuLi8nKSkge1xuICAgICAgdmFyIHBhcnRzID0gaHJlZi5zcGxpdCgnLycpO1xuICAgICAgdmFyIHBhdGhQYXJ0cyA9IGZvbGRlclBhdGguc3BsaXQoJy8nKTtcbiAgICAgIHZhciBwYXJlbnRzID0gcGFydHMuZmlsdGVyKChwYXJ0KSA9PiB7XG4gICAgICAgIHJldHVybiBwYXJ0ID09PSBcIi4uXCI7XG4gICAgICB9KTtcbiAgICAgIHBhcnRzID0gcGFydHMubGFzdChwYXJ0cy5sZW5ndGggLSBwYXJlbnRzLmxlbmd0aCk7XG4gICAgICBwYXRoUGFydHMgPSBwYXRoUGFydHMuZmlyc3QocGF0aFBhcnRzLmxlbmd0aCAtIHBhcmVudHMubGVuZ3RoKTtcblxuICAgICAgcmV0dXJuICcjJyArIHBhdGhQYXJ0cy5qb2luKCcvJykgKyAnLycgKyBwYXJ0cy5qb2luKCcvJykgKyBleHRlbnNpb24gKyAkbG9jYXRpb24uaGFzaCgpO1xuICAgIH1cblxuICAgIC8vIFR1cm4gYW4gYWJzb2x1dGUgbGluayBpbnRvIGEgd2lraSBsaW5rLi4uXG4gICAgaWYgKGhyZWYuc3RhcnRzV2l0aCgnLycpKSB7XG4gICAgICByZXR1cm4gV2lraS5icmFuY2hMaW5rKCRzY29wZSwgaHJlZiArIGV4dGVuc2lvbiwgJGxvY2F0aW9uKSArIGV4dGVuc2lvbjtcbiAgICB9XG5cbiAgICBpZiAoIVdpa2kuZXhjbHVkZUFkanVzdG1lbnRQcmVmaXhlcy5hbnkoKGV4Y2x1ZGUpID0+IHtcbiAgICAgIHJldHVybiBocmVmLnN0YXJ0c1dpdGgoZXhjbHVkZSk7XG4gICAgfSkpIHtcbiAgICAgIHJldHVybiAnIycgKyBmb2xkZXJQYXRoICsgXCIvXCIgKyBocmVmICsgZXh0ZW5zaW9uICsgJGxvY2F0aW9uLmhhc2goKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICB9XG59XG4iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vaW5jbHVkZXMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwid2lraUhlbHBlcnMudHNcIi8+XG5cbi8qKlxuICogQG1vZHVsZSBXaWtpXG4gKiBAbWFpbiBXaWtpXG4gKi9cbm1vZHVsZSBXaWtpIHtcblxuICBleHBvcnQgdmFyIHBsdWdpbk5hbWUgPSAnd2lraSc7XG4gIGV4cG9ydCB2YXIgdGVtcGxhdGVQYXRoID0gJ3BsdWdpbnMvd2lraS9odG1sLyc7XG4gIGV4cG9ydCB2YXIgdGFiOmFueSA9IG51bGw7XG5cbiAgZXhwb3J0IHZhciBfbW9kdWxlID0gYW5ndWxhci5tb2R1bGUocGx1Z2luTmFtZSwgWydoYXd0aW8tY29yZScsICdoYXd0aW8tdWknLCAndHJlZUNvbnRyb2wnLCAndWkuY29kZW1pcnJvciddKTtcbiAgZXhwb3J0IHZhciBjb250cm9sbGVyID0gUGx1Z2luSGVscGVycy5jcmVhdGVDb250cm9sbGVyRnVuY3Rpb24oX21vZHVsZSwgJ1dpa2knKTtcbiAgZXhwb3J0IHZhciByb3V0ZSA9IFBsdWdpbkhlbHBlcnMuY3JlYXRlUm91dGluZ0Z1bmN0aW9uKHRlbXBsYXRlUGF0aCk7XG5cbiAgX21vZHVsZS5jb25maWcoW1wiJHJvdXRlUHJvdmlkZXJcIiwgKCRyb3V0ZVByb3ZpZGVyKSA9PiB7XG5cbiAgICAvLyBhbGxvdyBvcHRpb25hbCBicmFuY2ggcGF0aHMuLi5cbiAgICBhbmd1bGFyLmZvckVhY2goW1wiXCIsIFwiL2JyYW5jaC86YnJhbmNoXCJdLCAocGF0aCkgPT4ge1xuICAgICAgLy92YXIgc3RhcnRDb250ZXh0ID0gJy93aWtpJztcbiAgICAgIHZhciBzdGFydENvbnRleHQgPSAnL3dvcmtzcGFjZXMvOm5hbWVzcGFjZS9wcm9qZWN0cy86cHJvamVjdElkL3dpa2kvOm93bmVyLzpyZXBvSWQnO1xuICAgICAgJHJvdXRlUHJvdmlkZXIuXG4gICAgICAgICAgICAgIHdoZW4oVXJsSGVscGVycy5qb2luKHN0YXJ0Q29udGV4dCwgcGF0aCwgJ3ZpZXcnKSwgcm91dGUoJ3ZpZXdQYWdlLmh0bWwnLCBmYWxzZSkpLlxuICAgICAgICAgICAgICB3aGVuKFVybEhlbHBlcnMuam9pbihzdGFydENvbnRleHQsIHBhdGgsICdjcmVhdGUvOnBhZ2UqJyksIHJvdXRlKCdjcmVhdGUuaHRtbCcsIGZhbHNlKSkuXG4gICAgICAgICAgICAgIHdoZW4oc3RhcnRDb250ZXh0ICsgcGF0aCArICcvdmlldy86cGFnZSonLCB7dGVtcGxhdGVVcmw6ICdwbHVnaW5zL3dpa2kvaHRtbC92aWV3UGFnZS5odG1sJywgcmVsb2FkT25TZWFyY2g6IGZhbHNlfSkuXG4gICAgICAgICAgICAgIHdoZW4oc3RhcnRDb250ZXh0ICsgcGF0aCArICcvYm9vay86cGFnZSonLCB7dGVtcGxhdGVVcmw6ICdwbHVnaW5zL3dpa2kvaHRtbC92aWV3Qm9vay5odG1sJywgcmVsb2FkT25TZWFyY2g6IGZhbHNlfSkuXG4gICAgICAgICAgICAgIHdoZW4oc3RhcnRDb250ZXh0ICsgcGF0aCArICcvZWRpdC86cGFnZSonLCB7dGVtcGxhdGVVcmw6ICdwbHVnaW5zL3dpa2kvaHRtbC9lZGl0UGFnZS5odG1sJ30pLlxuICAgICAgICAgICAgICB3aGVuKHN0YXJ0Q29udGV4dCArIHBhdGggKyAnL3ZlcnNpb24vOnBhZ2UqXFwvOm9iamVjdElkJywge3RlbXBsYXRlVXJsOiAncGx1Z2lucy93aWtpL2h0bWwvdmlld1BhZ2UuaHRtbCd9KS5cbiAgICAgICAgICAgICAgd2hlbihzdGFydENvbnRleHQgKyBwYXRoICsgJy9oaXN0b3J5LzpwYWdlKicsIHt0ZW1wbGF0ZVVybDogJ3BsdWdpbnMvd2lraS9odG1sL2hpc3RvcnkuaHRtbCd9KS5cbiAgICAgICAgICAgICAgd2hlbihzdGFydENvbnRleHQgKyBwYXRoICsgJy9jb21taXQvOnBhZ2UqXFwvOm9iamVjdElkJywge3RlbXBsYXRlVXJsOiAncGx1Z2lucy93aWtpL2h0bWwvY29tbWl0Lmh0bWwnfSkuXG4gICAgICAgICAgICAgIHdoZW4oc3RhcnRDb250ZXh0ICsgcGF0aCArICcvZGlmZi86cGFnZSpcXC86ZGlmZk9iamVjdElkMS86ZGlmZk9iamVjdElkMicsIHt0ZW1wbGF0ZVVybDogJ3BsdWdpbnMvd2lraS9odG1sL3ZpZXdQYWdlLmh0bWwnLCByZWxvYWRPblNlYXJjaDogZmFsc2V9KS5cbiAgICAgICAgICAgICAgd2hlbihzdGFydENvbnRleHQgKyBwYXRoICsgJy9mb3JtVGFibGUvOnBhZ2UqJywge3RlbXBsYXRlVXJsOiAncGx1Z2lucy93aWtpL2h0bWwvZm9ybVRhYmxlLmh0bWwnfSkuXG4gICAgICAgICAgICAgIHdoZW4oc3RhcnRDb250ZXh0ICsgcGF0aCArICcvZG96ZXIvbWFwcGluZ3MvOnBhZ2UqJywge3RlbXBsYXRlVXJsOiAncGx1Z2lucy93aWtpL2h0bWwvZG96ZXJNYXBwaW5ncy5odG1sJ30pLlxuICAgICAgICAgICAgICB3aGVuKHN0YXJ0Q29udGV4dCArIHBhdGggKyAnL2NvbmZpZ3VyYXRpb25zLzpwYWdlKicsIHsgdGVtcGxhdGVVcmw6ICdwbHVnaW5zL3dpa2kvaHRtbC9jb25maWd1cmF0aW9ucy5odG1sJyB9KS5cbiAgICAgICAgICAgICAgd2hlbihzdGFydENvbnRleHQgKyBwYXRoICsgJy9jb25maWd1cmF0aW9uLzpwaWQvOnBhZ2UqJywgeyB0ZW1wbGF0ZVVybDogJ3BsdWdpbnMvd2lraS9odG1sL2NvbmZpZ3VyYXRpb24uaHRtbCcgfSkuXG4gICAgICAgICAgICAgIHdoZW4oc3RhcnRDb250ZXh0ICsgcGF0aCArICcvbmV3Q29uZmlndXJhdGlvbi86ZmFjdG9yeVBpZC86cGFnZSonLCB7IHRlbXBsYXRlVXJsOiAncGx1Z2lucy93aWtpL2h0bWwvY29uZmlndXJhdGlvbi5odG1sJyB9KTtcbiAgICB9KTtcbn1dKTtcblxuICAvKipcbiAgICogQnJhbmNoIE1lbnUgc2VydmljZVxuICAgKi9cbiAgZXhwb3J0IGludGVyZmFjZSBCcmFuY2hNZW51IHtcbiAgICBhZGRFeHRlbnNpb246IChpdGVtOlVJLk1lbnVJdGVtKSA9PiB2b2lkO1xuICAgIGFwcGx5TWVudUV4dGVuc2lvbnM6IChtZW51OlVJLk1lbnVJdGVtW10pID0+IHZvaWQ7XG4gIH1cblxuICBfbW9kdWxlLmZhY3RvcnkoJ3dpa2lCcmFuY2hNZW51JywgKCkgPT4ge1xuICAgIHZhciBzZWxmID0ge1xuICAgICAgaXRlbXM6IFtdLFxuICAgICAgYWRkRXh0ZW5zaW9uOiAoaXRlbTpVSS5NZW51SXRlbSkgPT4ge1xuICAgICAgICBzZWxmLml0ZW1zLnB1c2goaXRlbSk7XG4gICAgICB9LFxuICAgICAgYXBwbHlNZW51RXh0ZW5zaW9uczogKG1lbnU6VUkuTWVudUl0ZW1bXSkgPT4ge1xuICAgICAgICBpZiAoc2VsZi5pdGVtcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGV4dGVuZGVkTWVudTpVSS5NZW51SXRlbVtdID0gW3tcbiAgICAgICAgICBoZWFkaW5nOiBcIkFjdGlvbnNcIlxuICAgICAgICB9XTtcbiAgICAgICAgc2VsZi5pdGVtcy5mb3JFYWNoKChpdGVtOlVJLk1lbnVJdGVtKSA9PiB7XG4gICAgICAgICAgaWYgKGl0ZW0udmFsaWQoKSkge1xuICAgICAgICAgICAgZXh0ZW5kZWRNZW51LnB1c2goaXRlbSk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgaWYgKGV4dGVuZGVkTWVudS5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgbWVudS5hZGQoZXh0ZW5kZWRNZW51KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH07XG4gICAgcmV0dXJuIHNlbGY7XG4gIH0pO1xuXG4gIF9tb2R1bGUuZmFjdG9yeSgnV2lraUdpdFVybFByZWZpeCcsICgpID0+IHtcbiAgICAgIHJldHVybiBcIlwiO1xuICB9KTtcblxuICBfbW9kdWxlLmZhY3RvcnkoJ2ZpbGVFeHRlbnNpb25UeXBlUmVnaXN0cnknLCAoKSA9PiB7XG4gICAgcmV0dXJuIHtcbiAgICAgIFwiaW1hZ2VcIjogW1wic3ZnXCIsIFwicG5nXCIsIFwiaWNvXCIsIFwiYm1wXCIsIFwianBnXCIsIFwiZ2lmXCJdLFxuICAgICAgXCJtYXJrZG93blwiOiBbXCJtZFwiLCBcIm1hcmtkb3duXCIsIFwibWRvd25cIiwgXCJta2RuXCIsIFwibWtkXCJdLFxuICAgICAgXCJodG1sbWl4ZWRcIjogW1wiaHRtbFwiLCBcInhodG1sXCIsIFwiaHRtXCJdLFxuICAgICAgXCJ0ZXh0L3gtamF2YVwiOiBbXCJqYXZhXCJdLFxuICAgICAgXCJ0ZXh0L3gtZ3Jvb3Z5XCI6IFtcImdyb292eVwiXSxcbiAgICAgIFwidGV4dC94LXNjYWxhXCI6IFtcInNjYWxhXCJdLFxuICAgICAgXCJqYXZhc2NyaXB0XCI6IFtcImpzXCIsIFwianNvblwiLCBcImphdmFzY3JpcHRcIiwgXCJqc2NyaXB0XCIsIFwiZWNtYXNjcmlwdFwiLCBcImZvcm1cIl0sXG4gICAgICBcInhtbFwiOiBbXCJ4bWxcIiwgXCJ4c2RcIiwgXCJ3c2RsXCIsIFwiYXRvbVwiXSxcbiAgICAgIFwicHJvcGVydGllc1wiOiBbXCJwcm9wZXJ0aWVzXCJdXG4gICAgfTtcbiAgfSk7XG5cbiAgX21vZHVsZS5maWx0ZXIoJ2ZpbGVJY29uQ2xhc3MnLCAoKSA9PiBpY29uQ2xhc3MpO1xuXG4gIF9tb2R1bGUucnVuKFtcIiRsb2NhdGlvblwiLFwidmlld1JlZ2lzdHJ5XCIsICBcImxvY2FsU3RvcmFnZVwiLCBcImxheW91dEZ1bGxcIiwgXCJoZWxwUmVnaXN0cnlcIiwgXCJwcmVmZXJlbmNlc1JlZ2lzdHJ5XCIsIFwid2lraVJlcG9zaXRvcnlcIixcbiAgICBcIiRyb290U2NvcGVcIiwgKCRsb2NhdGlvbjpuZy5JTG9jYXRpb25TZXJ2aWNlLFxuICAgICAgICB2aWV3UmVnaXN0cnksXG4gICAgICAgIGxvY2FsU3RvcmFnZSxcbiAgICAgICAgbGF5b3V0RnVsbCxcbiAgICAgICAgaGVscFJlZ2lzdHJ5LFxuICAgICAgICBwcmVmZXJlbmNlc1JlZ2lzdHJ5LFxuICAgICAgICB3aWtpUmVwb3NpdG9yeSxcbiAgICAgICAgJHJvb3RTY29wZSkgPT4ge1xuXG4gICAgdmlld1JlZ2lzdHJ5Wyd3aWtpJ10gPSB0ZW1wbGF0ZVBhdGggKyAnbGF5b3V0V2lraS5odG1sJztcbi8qXG4gICAgaGVscFJlZ2lzdHJ5LmFkZFVzZXJEb2MoJ3dpa2knLCAncGx1Z2lucy93aWtpL2RvYy9oZWxwLm1kJywgKCkgPT4ge1xuICAgICAgcmV0dXJuIFdpa2kuaXNXaWtpRW5hYmxlZCh3b3Jrc3BhY2UsIGpvbG9raWEsIGxvY2FsU3RvcmFnZSk7XG4gICAgfSk7XG4qL1xuXG4vKlxuICAgIHByZWZlcmVuY2VzUmVnaXN0cnkuYWRkVGFiKFwiR2l0XCIsICdwbHVnaW5zL3dpa2kvaHRtbC9naXRQcmVmZXJlbmNlcy5odG1sJyk7XG4qL1xuXG4vKlxuICAgIHRhYiA9IHtcbiAgICAgIGlkOiBcIndpa2lcIixcbiAgICAgIGNvbnRlbnQ6IFwiV2lraVwiLFxuICAgICAgdGl0bGU6IFwiVmlldyBhbmQgZWRpdCB3aWtpIHBhZ2VzXCIsXG4gICAgICBpc1ZhbGlkOiAod29ya3NwYWNlOldvcmtzcGFjZSkgPT4gV2lraS5pc1dpa2lFbmFibGVkKHdvcmtzcGFjZSwgam9sb2tpYSwgbG9jYWxTdG9yYWdlKSxcbiAgICAgIGhyZWY6ICgpID0+IFwiIy93aWtpL3ZpZXdcIixcbiAgICAgIGlzQWN0aXZlOiAod29ya3NwYWNlOldvcmtzcGFjZSkgPT4gd29ya3NwYWNlLmlzTGlua0FjdGl2ZShcIi93aWtpXCIpICYmICF3b3Jrc3BhY2UubGlua0NvbnRhaW5zKFwiZmFicmljXCIsIFwicHJvZmlsZXNcIikgJiYgIXdvcmtzcGFjZS5saW5rQ29udGFpbnMoXCJlZGl0RmVhdHVyZXNcIilcbiAgICB9O1xuICAgIHdvcmtzcGFjZS50b3BMZXZlbFRhYnMucHVzaCh0YWIpO1xuKi9cblxuICAgIC8vIGFkZCBlbXB0eSByZWdleHMgdG8gdGVtcGxhdGVzIHRoYXQgZG9uJ3QgZGVmaW5lXG4gICAgLy8gdGhlbSBzbyBuZy1wYXR0ZXJuIGRvZXNuJ3QgYmFyZlxuICAgIFdpa2kuZG9jdW1lbnRUZW1wbGF0ZXMuZm9yRWFjaCgodGVtcGxhdGU6IGFueSkgPT4ge1xuICAgICAgaWYgKCF0ZW1wbGF0ZVsncmVnZXgnXSkge1xuICAgICAgICB0ZW1wbGF0ZS5yZWdleCA9IC8oPzopLztcbiAgICAgIH1cbiAgICB9KTtcblxuICB9XSk7XG5cbiAgaGF3dGlvUGx1Z2luTG9hZGVyLmFkZE1vZHVsZShwbHVnaW5OYW1lKTtcbn1cbiIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9pbmNsdWRlcy50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJ3aWtpSGVscGVycy50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJ3aWtpUGx1Z2luLnRzXCIvPlxuXG4vKipcbiAqIEBtb2R1bGUgV2lraVxuICovXG5tb2R1bGUgV2lraSB7XG5cbiAgX21vZHVsZS5jb250cm9sbGVyKFwiV2lraS5Db21taXRDb250cm9sbGVyXCIsIFtcIiRzY29wZVwiLCBcIiRsb2NhdGlvblwiLCBcIiRyb3V0ZVBhcmFtc1wiLCBcIiR0ZW1wbGF0ZUNhY2hlXCIsIFwibWFya2VkXCIsIFwiZmlsZUV4dGVuc2lvblR5cGVSZWdpc3RyeVwiLCAoJHNjb3BlLCAkbG9jYXRpb24sICRyb3V0ZVBhcmFtcywgJHRlbXBsYXRlQ2FjaGUsIG1hcmtlZCwgZmlsZUV4dGVuc2lvblR5cGVSZWdpc3RyeSkgPT4ge1xuXG4gICAgLy8gVE9ETyByZW1vdmUhXG4gICAgdmFyIGlzRm1jID0gZmFsc2U7XG4gICAgdmFyIGpvbG9raWEgPSBudWxsO1xuXG4gICAgV2lraS5pbml0U2NvcGUoJHNjb3BlLCAkcm91dGVQYXJhbXMsICRsb2NhdGlvbik7XG4gICAgdmFyIHdpa2lSZXBvc2l0b3J5ID0gJHNjb3BlLndpa2lSZXBvc2l0b3J5O1xuXG4gICAgJHNjb3BlLmNvbW1pdElkID0gJHNjb3BlLm9iamVjdElkO1xuICAgICRzY29wZS5zZWxlY3RlZEl0ZW1zID0gW107XG5cbiAgICAvLyBUT0RPIHdlIGNvdWxkIGNvbmZpZ3VyZSB0aGlzP1xuICAgICRzY29wZS5kYXRlRm9ybWF0ID0gJ0VFRSwgTU1NIGQsIHkgOiBoaDptbTpzcyBhJztcblxuICAgICRzY29wZS5ncmlkT3B0aW9ucyA9IHtcbiAgICAgIGRhdGE6ICdjb21taXRzJyxcbiAgICAgIHNob3dGaWx0ZXI6IGZhbHNlLFxuICAgICAgbXVsdGlTZWxlY3Q6IGZhbHNlLFxuICAgICAgc2VsZWN0V2l0aENoZWNrYm94T25seTogdHJ1ZSxcbiAgICAgIHNob3dTZWxlY3Rpb25DaGVja2JveDogdHJ1ZSxcbiAgICAgIGRpc3BsYXlTZWxlY3Rpb25DaGVja2JveCA6IHRydWUsIC8vIG9sZCBwcmUgMi4wIGNvbmZpZyFcbiAgICAgIHNlbGVjdGVkSXRlbXM6ICRzY29wZS5zZWxlY3RlZEl0ZW1zLFxuICAgICAgZmlsdGVyT3B0aW9uczoge1xuICAgICAgICBmaWx0ZXJUZXh0OiAnJ1xuICAgICAgfSxcbiAgICAgIGNvbHVtbkRlZnM6IFtcbiAgICAgICAge1xuICAgICAgICAgIGZpZWxkOiAncGF0aCcsXG4gICAgICAgICAgZGlzcGxheU5hbWU6ICdGaWxlIE5hbWUnLFxuICAgICAgICAgIGNlbGxUZW1wbGF0ZTogJHRlbXBsYXRlQ2FjaGUuZ2V0KCdmaWxlQ2VsbFRlbXBsYXRlLmh0bWwnKSxcbiAgICAgICAgICB3aWR0aDogXCIqKipcIixcbiAgICAgICAgICBjZWxsRmlsdGVyOiBcIlwiXG4gICAgICAgIH0sXG4gICAgICBdXG4gICAgfTtcblxuICAgICRzY29wZS4kb24oXCIkcm91dGVDaGFuZ2VTdWNjZXNzXCIsIGZ1bmN0aW9uIChldmVudCwgY3VycmVudCwgcHJldmlvdXMpIHtcbiAgICAgIC8vIGxldHMgZG8gdGhpcyBhc3luY2hyb25vdXNseSB0byBhdm9pZCBFcnJvcjogJGRpZ2VzdCBhbHJlYWR5IGluIHByb2dyZXNzXG4gICAgICBzZXRUaW1lb3V0KHVwZGF0ZVZpZXcsIDUwKTtcbiAgICB9KTtcblxuICAgICRzY29wZS4kd2F0Y2goJ3dvcmtzcGFjZS50cmVlJywgZnVuY3Rpb24gKCkge1xuICAgICAgaWYgKCEkc2NvcGUuZ2l0KSB7XG4gICAgICAgIC8vIGxldHMgZG8gdGhpcyBhc3luY2hyb25vdXNseSB0byBhdm9pZCBFcnJvcjogJGRpZ2VzdCBhbHJlYWR5IGluIHByb2dyZXNzXG4gICAgICAgIC8vY29uc29sZS5sb2coXCJSZWxvYWRpbmcgdGhlIHZpZXcgYXMgd2Ugbm93IHNlZW0gdG8gaGF2ZSBhIGdpdCBtYmVhbiFcIik7XG4gICAgICAgIHNldFRpbWVvdXQodXBkYXRlVmlldywgNTApO1xuICAgICAgfVxuICAgIH0pO1xuXG5cbiAgICAkc2NvcGUuY2FuUmV2ZXJ0ID0gKCkgPT4ge1xuICAgICAgcmV0dXJuICRzY29wZS5zZWxlY3RlZEl0ZW1zLmxlbmd0aCA9PT0gMTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLnJldmVydCA9ICgpID0+IHtcbiAgICAgIGlmICgkc2NvcGUuc2VsZWN0ZWRJdGVtcy5sZW5ndGggPiAwKSB7XG4gICAgICAgIHZhciBwYXRoID0gY29tbWl0UGF0aCgkc2NvcGUuc2VsZWN0ZWRJdGVtc1swXSk7XG4gICAgICAgIHZhciBvYmplY3RJZCA9ICRzY29wZS5jb21taXRJZDtcbiAgICAgICAgaWYgKHBhdGggJiYgb2JqZWN0SWQpIHtcbiAgICAgICAgICB2YXIgY29tbWl0TWVzc2FnZSA9IFwiUmV2ZXJ0aW5nIGZpbGUgXCIgKyAkc2NvcGUucGFnZUlkICsgXCIgdG8gcHJldmlvdXMgdmVyc2lvbiBcIiArIG9iamVjdElkO1xuICAgICAgICAgIHdpa2lSZXBvc2l0b3J5LnJldmVydFRvKCRzY29wZS5icmFuY2gsIG9iamVjdElkLCAkc2NvcGUucGFnZUlkLCBjb21taXRNZXNzYWdlLCAocmVzdWx0KSA9PiB7XG4gICAgICAgICAgICBXaWtpLm9uQ29tcGxldGUocmVzdWx0KTtcbiAgICAgICAgICAgIC8vIG5vdyBsZXRzIHVwZGF0ZSB0aGUgdmlld1xuICAgICAgICAgICAgdXBkYXRlVmlldygpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIGNvbW1pdFBhdGgoY29tbWl0KSB7XG4gICAgICByZXR1cm4gY29tbWl0LnBhdGggfHwgY29tbWl0Lm5hbWU7XG4gICAgfVxuXG4gICAgJHNjb3BlLmRpZmYgPSAoKSA9PiB7XG4gICAgICBpZiAoJHNjb3BlLnNlbGVjdGVkSXRlbXMubGVuZ3RoID4gMCkge1xuICAgICAgICB2YXIgY29tbWl0ID0gJHNjb3BlLnNlbGVjdGVkSXRlbXNbMF07XG4gICAgICAgIC8qXG4gICAgICAgICB2YXIgY29tbWl0ID0gcm93O1xuICAgICAgICAgdmFyIGVudGl0eSA9IHJvdy5lbnRpdHk7XG4gICAgICAgICBpZiAoZW50aXR5KSB7XG4gICAgICAgICBjb21taXQgPSBlbnRpdHk7XG4gICAgICAgICB9XG4gICAgICAgICAqL1xuICAgICAgICB2YXIgbGluayA9IHN0YXJ0TGluaygkc2NvcGUpICsgXCIvZGlmZi9cIiArIGNvbW1pdFBhdGgoY29tbWl0KSArIFwiL1wiICsgJHNjb3BlLmNvbW1pdElkICsgXCIvXCI7XG4gICAgICAgIHZhciBwYXRoID0gQ29yZS50cmltTGVhZGluZyhsaW5rLCBcIiNcIik7XG4gICAgICAgICRsb2NhdGlvbi5wYXRoKHBhdGgpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICB1cGRhdGVWaWV3KCk7XG5cbiAgICBmdW5jdGlvbiB1cGRhdGVWaWV3KCkge1xuICAgICAgdmFyIGNvbW1pdElkID0gJHNjb3BlLmNvbW1pdElkO1xuXG4gICAgICBXaWtpLmxvYWRCcmFuY2hlcyhqb2xva2lhLCB3aWtpUmVwb3NpdG9yeSwgJHNjb3BlLCBpc0ZtYyk7XG5cbiAgICAgIHdpa2lSZXBvc2l0b3J5LmNvbW1pdEluZm8oY29tbWl0SWQsIChjb21taXRJbmZvKSA9PiB7XG4gICAgICAgICRzY29wZS5jb21taXRJbmZvID0gY29tbWl0SW5mbztcbiAgICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICAgIH0pO1xuXG4gICAgICB3aWtpUmVwb3NpdG9yeS5jb21taXRUcmVlKGNvbW1pdElkLCAoY29tbWl0cykgPT4ge1xuICAgICAgICAkc2NvcGUuY29tbWl0cyA9IGNvbW1pdHM7XG4gICAgICAgIGFuZ3VsYXIuZm9yRWFjaChjb21taXRzLCAoY29tbWl0KSA9PiB7XG4gICAgICAgICAgY29tbWl0LmZpbGVJY29uSHRtbCA9IFdpa2kuZmlsZUljb25IdG1sKGNvbW1pdCk7XG4gICAgICAgICAgY29tbWl0LmZpbGVDbGFzcyA9IGNvbW1pdC5uYW1lLmVuZHNXaXRoKFwiLnByb2ZpbGVcIikgPyBcImdyZWVuXCIgOiBcIlwiO1xuICAgICAgICAgIHZhciBjaGFuZ2VUeXBlID0gY29tbWl0LmNoYW5nZVR5cGU7XG4gICAgICAgICAgdmFyIHBhdGggPSBjb21taXRQYXRoKGNvbW1pdCk7XG4gICAgICAgICAgaWYgKHBhdGgpIHtcbiAgICAgICAgICAgIGNvbW1pdC5maWxlTGluayA9IHN0YXJ0TGluaygkc2NvcGUpICsgJy92ZXJzaW9uLycgKyBwYXRoICsgJy8nICsgY29tbWl0SWQ7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChjaGFuZ2VUeXBlKSB7XG4gICAgICAgICAgICBjaGFuZ2VUeXBlID0gY2hhbmdlVHlwZS50b0xvd2VyQ2FzZSgpO1xuICAgICAgICAgICAgaWYgKGNoYW5nZVR5cGUuc3RhcnRzV2l0aChcImFcIikpIHtcbiAgICAgICAgICAgICAgY29tbWl0LmNoYW5nZUNsYXNzID0gXCJjaGFuZ2UtYWRkXCI7XG4gICAgICAgICAgICAgIGNvbW1pdC5jaGFuZ2UgPSBcImFkZFwiO1xuICAgICAgICAgICAgICBjb21taXQudGl0bGUgPSBcImFkZGVkXCI7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGNoYW5nZVR5cGUuc3RhcnRzV2l0aChcImRcIikpIHtcbiAgICAgICAgICAgICAgY29tbWl0LmNoYW5nZUNsYXNzID0gXCJjaGFuZ2UtZGVsZXRlXCI7XG4gICAgICAgICAgICAgIGNvbW1pdC5jaGFuZ2UgPSBcImRlbGV0ZVwiO1xuICAgICAgICAgICAgICBjb21taXQudGl0bGUgPSBcImRlbGV0ZWRcIjtcbiAgICAgICAgICAgICAgY29tbWl0LmZpbGVMaW5rID0gbnVsbDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGNvbW1pdC5jaGFuZ2VDbGFzcyA9IFwiY2hhbmdlLW1vZGlmeVwiO1xuICAgICAgICAgICAgICBjb21taXQuY2hhbmdlID0gXCJtb2RpZnlcIjtcbiAgICAgICAgICAgICAgY29tbWl0LnRpdGxlID0gXCJtb2RpZmllZFwiO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29tbWl0LmNoYW5nZVR5cGVIdG1sID0gJzxzcGFuIGNsYXNzPVwiJyArIGNvbW1pdC5jaGFuZ2VDbGFzcyArICdcIj4nICsgY29tbWl0LnRpdGxlICsgJzwvc3Bhbj4nO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIENvcmUuJGFwcGx5KCRzY29wZSk7XG4gICAgICB9KTtcbiAgICB9XG4gIH1dKTtcbn1cbiIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9pbmNsdWRlcy50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJ3aWtpSGVscGVycy50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJ3aWtpUGx1Z2luLnRzXCIvPlxuXG5tb2R1bGUgV2lraSB7XG5cbiAgdmFyIENyZWF0ZUNvbnRyb2xsZXIgPSBjb250cm9sbGVyKFwiQ3JlYXRlQ29udHJvbGxlclwiLCBbXCIkc2NvcGVcIiwgXCIkbG9jYXRpb25cIiwgXCIkcm91dGVQYXJhbXNcIiwgXCIkcm91dGVcIiwgXCIkaHR0cFwiLCBcIiR0aW1lb3V0XCIsICgkc2NvcGUsICRsb2NhdGlvbjpuZy5JTG9jYXRpb25TZXJ2aWNlLCAkcm91dGVQYXJhbXM6bmcucm91dGUuSVJvdXRlUGFyYW1zU2VydmljZSwgJHJvdXRlOm5nLnJvdXRlLklSb3V0ZVNlcnZpY2UsICRodHRwOm5nLklIdHRwU2VydmljZSwgJHRpbWVvdXQ6bmcuSVRpbWVvdXRTZXJ2aWNlKSA9PiB7XG5cbiAgICBXaWtpLmluaXRTY29wZSgkc2NvcGUsICRyb3V0ZVBhcmFtcywgJGxvY2F0aW9uKTtcbiAgICB2YXIgd2lraVJlcG9zaXRvcnkgPSAkc2NvcGUud2lraVJlcG9zaXRvcnk7XG5cblxuICAgIC8vIFRPRE8gcmVtb3ZlXG4gICAgdmFyIHdvcmtzcGFjZSA9IG51bGw7XG5cbiAgICAkc2NvcGUuY3JlYXRlRG9jdW1lbnRUcmVlID0gV2lraS5jcmVhdGVXaXphcmRUcmVlKHdvcmtzcGFjZSwgJHNjb3BlKTtcbiAgICAkc2NvcGUuY3JlYXRlRG9jdW1lbnRUcmVlQ2hpbGRyZW4gPSAkc2NvcGUuY3JlYXRlRG9jdW1lbnRUcmVlLmNoaWxkcmVuO1xuICAgICRzY29wZS5jcmVhdGVEb2N1bWVudFRyZWVBY3RpdmF0aW9ucyA9IFtcImNhbWVsLXNwcmluZy54bWxcIiwgXCJSZWFkTWUubWRcIl07XG5cbiAgICAkc2NvcGUudHJlZU9wdGlvbnMgPSB7XG4gICAgICAgIG5vZGVDaGlsZHJlbjogXCJjaGlsZHJlblwiLFxuICAgICAgICBkaXJTZWxlY3RhYmxlOiB0cnVlLFxuICAgICAgICBpbmplY3RDbGFzc2VzOiB7XG4gICAgICAgICAgICB1bDogXCJhMVwiLFxuICAgICAgICAgICAgbGk6IFwiYTJcIixcbiAgICAgICAgICAgIGxpU2VsZWN0ZWQ6IFwiYTdcIixcbiAgICAgICAgICAgIGlFeHBhbmRlZDogXCJhM1wiLFxuICAgICAgICAgICAgaUNvbGxhcHNlZDogXCJhNFwiLFxuICAgICAgICAgICAgaUxlYWY6IFwiYTVcIixcbiAgICAgICAgICAgIGxhYmVsOiBcImE2XCIsXG4gICAgICAgICAgICBsYWJlbFNlbGVjdGVkOiBcImE4XCJcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICAkc2NvcGUuZmlsZUV4aXN0cyA9IHtcbiAgICAgIGV4aXN0czogZmFsc2UsXG4gICAgICBuYW1lOiBcIlwiXG4gICAgfTtcbiAgICAkc2NvcGUubmV3RG9jdW1lbnROYW1lID0gXCJcIjtcbiAgICAkc2NvcGUuc2VsZWN0ZWRDcmVhdGVEb2N1bWVudEV4dGVuc2lvbiA9IG51bGw7XG4gICAgJHNjb3BlLmZpbGVFeGlzdHMuZXhpc3RzID0gZmFsc2U7XG4gICAgJHNjb3BlLmZpbGVFeGlzdHMubmFtZSA9IFwiXCI7XG4gICAgJHNjb3BlLm5ld0RvY3VtZW50TmFtZSA9IFwiXCI7XG5cbiAgICBmdW5jdGlvbiByZXR1cm5Ub0RpcmVjdG9yeSgpIHtcbiAgICAgIHZhciBsaW5rID0gV2lraS52aWV3TGluaygkc2NvcGUsICRzY29wZS5wYWdlSWQsICRsb2NhdGlvbilcbiAgICAgIGxvZy5kZWJ1ZyhcIkNhbmNlbGxpbmcsIGdvaW5nIHRvIGxpbms6IFwiLCBsaW5rKTtcbiAgICAgIFdpa2kuZ29Ub0xpbmsobGluaywgJHRpbWVvdXQsICRsb2NhdGlvbik7XG4gICAgfVxuXG4gICAgJHNjb3BlLmNhbmNlbCA9ICgpID0+IHtcbiAgICAgIHJldHVyblRvRGlyZWN0b3J5KCk7XG4gICAgfTtcblxuICAgICRzY29wZS5vbkNyZWF0ZURvY3VtZW50U2VsZWN0ID0gKG5vZGUpID0+IHtcbiAgICAgIC8vIHJlc2V0IGFzIHdlIHN3aXRjaCBiZXR3ZWVuIGRvY3VtZW50IHR5cGVzXG4gICAgICAkc2NvcGUuZmlsZUV4aXN0cy5leGlzdHMgPSBmYWxzZTtcbiAgICAgICRzY29wZS5maWxlRXhpc3RzLm5hbWUgPSBcIlwiO1xuICAgICAgdmFyIGVudGl0eSA9IG5vZGUgPyBub2RlLmVudGl0eSA6IG51bGw7XG4gICAgICAkc2NvcGUuc2VsZWN0ZWRDcmVhdGVEb2N1bWVudFRlbXBsYXRlID0gZW50aXR5O1xuICAgICAgJHNjb3BlLnNlbGVjdGVkQ3JlYXRlRG9jdW1lbnRUZW1wbGF0ZVJlZ2V4ID0gJHNjb3BlLnNlbGVjdGVkQ3JlYXRlRG9jdW1lbnRUZW1wbGF0ZS5yZWdleCB8fCAvLiovO1xuICAgICAgJHNjb3BlLnNlbGVjdGVkQ3JlYXRlRG9jdW1lbnRUZW1wbGF0ZUludmFsaWQgPSAkc2NvcGUuc2VsZWN0ZWRDcmVhdGVEb2N1bWVudFRlbXBsYXRlLmludmFsaWQgfHwgXCJpbnZhbGlkIG5hbWVcIjtcbiAgICAgICRzY29wZS5zZWxlY3RlZENyZWF0ZURvY3VtZW50VGVtcGxhdGVFeHRlbnNpb24gPSAkc2NvcGUuc2VsZWN0ZWRDcmVhdGVEb2N1bWVudFRlbXBsYXRlLmV4dGVuc2lvbiB8fCBudWxsO1xuICAgICAgbG9nLmRlYnVnKFwiRW50aXR5OiBcIiwgZW50aXR5KTtcbiAgICAgIGlmIChlbnRpdHkpIHtcbiAgICAgICAgaWYgKGVudGl0eS5nZW5lcmF0ZWQpIHtcbiAgICAgICAgICAkc2NvcGUuZm9ybVNjaGVtYSA9IGVudGl0eS5nZW5lcmF0ZWQuc2NoZW1hO1xuICAgICAgICAgICRzY29wZS5mb3JtRGF0YSA9IGVudGl0eS5nZW5lcmF0ZWQuZm9ybSh3b3Jrc3BhY2UsICRzY29wZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgJHNjb3BlLmZvcm1TY2hlbWEgPSB7fTtcbiAgICAgICAgICAkc2NvcGUuZm9ybURhdGEgPSB7fTtcbiAgICAgICAgfVxuICAgICAgICBDb3JlLiRhcHBseSgkc2NvcGUpO1xuICAgICAgfVxuXG4gICAgfTtcblxuICAgICRzY29wZS5hZGRBbmRDbG9zZURpYWxvZyA9IChmaWxlTmFtZTpzdHJpbmcpID0+IHtcbiAgICAgICRzY29wZS5uZXdEb2N1bWVudE5hbWUgPSBmaWxlTmFtZTtcbiAgICAgIHZhciB0ZW1wbGF0ZSA9ICRzY29wZS5zZWxlY3RlZENyZWF0ZURvY3VtZW50VGVtcGxhdGU7XG4gICAgICB2YXIgcGF0aCA9IGdldE5ld0RvY3VtZW50UGF0aCgpO1xuXG4gICAgICAvLyBjbGVhciAkc2NvcGUubmV3RG9jdW1lbnROYW1lIHNvIHdlIGRvbnQgcmVtZW1iZXIgaXQgd2hlbiB3ZSBvcGVuIGl0IG5leHQgdGltZVxuICAgICAgJHNjb3BlLm5ld0RvY3VtZW50TmFtZSA9IG51bGw7XG5cbiAgICAgIC8vIHJlc2V0IGJlZm9yZSB3ZSBjaGVjayBqdXN0IGluIGEgYml0XG4gICAgICAkc2NvcGUuZmlsZUV4aXN0cy5leGlzdHMgPSBmYWxzZTtcbiAgICAgICRzY29wZS5maWxlRXhpc3RzLm5hbWUgPSBcIlwiO1xuICAgICAgJHNjb3BlLmZpbGVFeHRlbnNpb25JbnZhbGlkID0gbnVsbDtcblxuICAgICAgaWYgKCF0ZW1wbGF0ZSB8fCAhcGF0aCkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIC8vIHZhbGlkYXRlIGlmIHRoZSBuYW1lIG1hdGNoIHRoZSBleHRlbnNpb25cbiAgICAgIGlmICgkc2NvcGUuc2VsZWN0ZWRDcmVhdGVEb2N1bWVudFRlbXBsYXRlRXh0ZW5zaW9uKSB7XG4gICAgICAgIHZhciBpZHggPSBwYXRoLmxhc3RJbmRleE9mKCcuJyk7XG4gICAgICAgIGlmIChpZHggPiAwKSB7XG4gICAgICAgICAgdmFyIGV4dCA9IHBhdGguc3Vic3RyaW5nKGlkeCk7XG4gICAgICAgICAgaWYgKCRzY29wZS5zZWxlY3RlZENyZWF0ZURvY3VtZW50VGVtcGxhdGVFeHRlbnNpb24gIT09IGV4dCkge1xuICAgICAgICAgICAgJHNjb3BlLmZpbGVFeHRlbnNpb25JbnZhbGlkID0gXCJGaWxlIGV4dGVuc2lvbiBtdXN0IGJlOiBcIiArICRzY29wZS5zZWxlY3RlZENyZWF0ZURvY3VtZW50VGVtcGxhdGVFeHRlbnNpb247XG4gICAgICAgICAgICBDb3JlLiRhcHBseSgkc2NvcGUpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyB2YWxpZGF0ZSBpZiB0aGUgZmlsZSBleGlzdHMsIGFuZCB1c2UgdGhlIHN5bmNocm9ub3VzIGNhbGxcbiAgICAgIHdpa2lSZXBvc2l0b3J5LmV4aXN0cygkc2NvcGUuYnJhbmNoLCBwYXRoLCAoZXhpc3RzKSA9PiB7XG4gICAgICAgICRzY29wZS5maWxlRXhpc3RzLmV4aXN0cyA9IGV4aXN0cztcbiAgICAgICAgJHNjb3BlLmZpbGVFeGlzdHMubmFtZSA9IGV4aXN0cyA/IHBhdGggOiBmYWxzZTtcbiAgICAgICAgaWYgKCFleGlzdHMpIHtcbiAgICAgICAgICBkb0NyZWF0ZSgpO1xuICAgICAgICB9XG4gICAgICAgIENvcmUuJGFwcGx5KCRzY29wZSk7XG4gICAgICB9KTtcblxuICAgICAgZnVuY3Rpb24gZG9DcmVhdGUoKSB7XG4gICAgICAgIHZhciBuYW1lID0gV2lraS5maWxlTmFtZShwYXRoKTtcbiAgICAgICAgdmFyIGZvbGRlciA9IFdpa2kuZmlsZVBhcmVudChwYXRoKTtcbiAgICAgICAgdmFyIGV4ZW1wbGFyID0gdGVtcGxhdGUuZXhlbXBsYXI7XG5cbiAgICAgICAgdmFyIGNvbW1pdE1lc3NhZ2UgPSBcIkNyZWF0ZWQgXCIgKyB0ZW1wbGF0ZS5sYWJlbDtcbiAgICAgICAgdmFyIGV4ZW1wbGFyVXJpID0gQ29yZS51cmwoXCIvcGx1Z2lucy93aWtpL2V4ZW1wbGFyL1wiICsgZXhlbXBsYXIpO1xuXG4gICAgICAgIGlmICh0ZW1wbGF0ZS5mb2xkZXIpIHtcbiAgICAgICAgICBDb3JlLm5vdGlmaWNhdGlvbihcInN1Y2Nlc3NcIiwgXCJDcmVhdGluZyBuZXcgZm9sZGVyIFwiICsgbmFtZSk7XG5cbiAgICAgICAgICB3aWtpUmVwb3NpdG9yeS5jcmVhdGVEaXJlY3RvcnkoJHNjb3BlLmJyYW5jaCwgcGF0aCwgY29tbWl0TWVzc2FnZSwgKHN0YXR1cykgPT4ge1xuICAgICAgICAgICAgdmFyIGxpbmsgPSBXaWtpLnZpZXdMaW5rKCRzY29wZSwgcGF0aCwgJGxvY2F0aW9uKTtcbiAgICAgICAgICAgIGdvVG9MaW5rKGxpbmssICR0aW1lb3V0LCAkbG9jYXRpb24pO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2UgaWYgKHRlbXBsYXRlLnByb2ZpbGUpIHtcblxuICAgICAgICAgIGZ1bmN0aW9uIHRvUGF0aChwcm9maWxlTmFtZTpzdHJpbmcpIHtcbiAgICAgICAgICAgIHZhciBhbnN3ZXIgPSBcImZhYnJpYy9wcm9maWxlcy9cIiArIHByb2ZpbGVOYW1lO1xuICAgICAgICAgICAgYW5zd2VyID0gYW5zd2VyLnJlcGxhY2UoLy0vZywgXCIvXCIpO1xuICAgICAgICAgICAgYW5zd2VyID0gYW5zd2VyICsgXCIucHJvZmlsZVwiO1xuICAgICAgICAgICAgcmV0dXJuIGFuc3dlcjtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBmdW5jdGlvbiB0b1Byb2ZpbGVOYW1lKHBhdGg6c3RyaW5nKSB7XG4gICAgICAgICAgICB2YXIgYW5zd2VyID0gcGF0aC5yZXBsYWNlKC9eZmFicmljXFwvcHJvZmlsZXNcXC8vLCBcIlwiKTtcbiAgICAgICAgICAgIGFuc3dlciA9IGFuc3dlci5yZXBsYWNlKC9cXC8vZywgXCItXCIpO1xuICAgICAgICAgICAgYW5zd2VyID0gYW5zd2VyLnJlcGxhY2UoL1xcLnByb2ZpbGUkLywgXCJcIik7XG4gICAgICAgICAgICByZXR1cm4gYW5zd2VyO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vIHN0cmlwIG9mZiBhbnkgcHJvZmlsZSBuYW1lIGluIGNhc2UgdGhlIHVzZXIgY3JlYXRlcyBhIHByb2ZpbGUgd2hpbGUgbG9va2luZyBhdFxuICAgICAgICAgIC8vIGFub3RoZXIgcHJvZmlsZVxuICAgICAgICAgIGZvbGRlciA9IGZvbGRlci5yZXBsYWNlKC9cXC89PyhcXHcqKVxcLnByb2ZpbGUkLywgXCJcIik7XG5cbiAgICAgICAgICB2YXIgY29uY2F0ZW5hdGVkID0gZm9sZGVyICsgXCIvXCIgKyBuYW1lO1xuXG4gICAgICAgICAgdmFyIHByb2ZpbGVOYW1lID0gdG9Qcm9maWxlTmFtZShjb25jYXRlbmF0ZWQpO1xuICAgICAgICAgIHZhciB0YXJnZXRQYXRoID0gdG9QYXRoKHByb2ZpbGVOYW1lKTtcblxuICAgICAgICB9IGVsc2UgaWYgKHRlbXBsYXRlLmdlbmVyYXRlZCkge1xuICAgICAgICAgIHZhciBvcHRpb25zOldpa2kuR2VuZXJhdGVPcHRpb25zID0ge1xuICAgICAgICAgICAgd29ya3NwYWNlOiB3b3Jrc3BhY2UsXG4gICAgICAgICAgICBmb3JtOiAkc2NvcGUuZm9ybURhdGEsXG4gICAgICAgICAgICBuYW1lOiBmaWxlTmFtZSxcbiAgICAgICAgICAgIHBhcmVudElkOiBmb2xkZXIsXG4gICAgICAgICAgICBicmFuY2g6ICRzY29wZS5icmFuY2gsXG4gICAgICAgICAgICBzdWNjZXNzOiAoY29udGVudHMpPT4ge1xuICAgICAgICAgICAgICBpZiAoY29udGVudHMpIHtcbiAgICAgICAgICAgICAgICB3aWtpUmVwb3NpdG9yeS5wdXRQYWdlKCRzY29wZS5icmFuY2gsIHBhdGgsIGNvbnRlbnRzLCBjb21taXRNZXNzYWdlLCAoc3RhdHVzKSA9PiB7XG4gICAgICAgICAgICAgICAgICBsb2cuZGVidWcoXCJDcmVhdGVkIGZpbGUgXCIgKyBuYW1lKTtcbiAgICAgICAgICAgICAgICAgIFdpa2kub25Db21wbGV0ZShzdGF0dXMpO1xuICAgICAgICAgICAgICAgICAgcmV0dXJuVG9EaXJlY3RvcnkoKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm5Ub0RpcmVjdG9yeSgpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZXJyb3I6IChlcnJvcik9PiB7XG4gICAgICAgICAgICAgIENvcmUubm90aWZpY2F0aW9uKCdlcnJvcicsIGVycm9yKTtcbiAgICAgICAgICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9O1xuICAgICAgICAgIHRlbXBsYXRlLmdlbmVyYXRlZC5nZW5lcmF0ZShvcHRpb25zKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBsb2FkIHRoZSBleGFtcGxlIGRhdGEgKGlmIGFueSkgYW5kIHRoZW4gYWRkIHRoZSBkb2N1bWVudCB0byBnaXQgYW5kIGNoYW5nZSB0aGUgbGluayB0byB0aGUgbmV3IGRvY3VtZW50XG4gICAgICAgICAgJGh0dHAuZ2V0KGV4ZW1wbGFyVXJpKVxuICAgICAgICAgICAgLnN1Y2Nlc3MoZnVuY3Rpb24gKGRhdGEsIHN0YXR1cywgaGVhZGVycywgY29uZmlnKSB7XG4gICAgICAgICAgICAgIHB1dFBhZ2UocGF0aCwgbmFtZSwgZm9sZGVyLCBkYXRhLCBjb21taXRNZXNzYWdlKTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAuZXJyb3IoZnVuY3Rpb24gKGRhdGEsIHN0YXR1cywgaGVhZGVycywgY29uZmlnKSB7XG4gICAgICAgICAgICAgIC8vIGNyZWF0ZSBhbiBlbXB0eSBmaWxlXG4gICAgICAgICAgICAgIHB1dFBhZ2UocGF0aCwgbmFtZSwgZm9sZGVyLCBcIlwiLCBjb21taXRNZXNzYWdlKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIHB1dFBhZ2UocGF0aCwgbmFtZSwgZm9sZGVyLCBjb250ZW50cywgY29tbWl0TWVzc2FnZSkge1xuICAgICAgLy8gVE9ETyBsZXRzIGNoZWNrIHRoaXMgcGFnZSBkb2VzIG5vdCBleGlzdCAtIGlmIGl0IGRvZXMgbGV0cyBrZWVwIGFkZGluZyBhIG5ldyBwb3N0IGZpeC4uLlxuICAgICAgd2lraVJlcG9zaXRvcnkucHV0UGFnZSgkc2NvcGUuYnJhbmNoLCBwYXRoLCBjb250ZW50cywgY29tbWl0TWVzc2FnZSwgKHN0YXR1cykgPT4ge1xuICAgICAgICBsb2cuZGVidWcoXCJDcmVhdGVkIGZpbGUgXCIgKyBuYW1lKTtcbiAgICAgICAgV2lraS5vbkNvbXBsZXRlKHN0YXR1cyk7XG5cbiAgICAgICAgLy8gbGV0cyBuYXZpZ2F0ZSB0byB0aGUgZWRpdCBsaW5rXG4gICAgICAgIC8vIGxvYWQgdGhlIGRpcmVjdG9yeSBhbmQgZmluZCB0aGUgY2hpbGQgaXRlbVxuICAgICAgICAkc2NvcGUuZ2l0ID0gd2lraVJlcG9zaXRvcnkuZ2V0UGFnZSgkc2NvcGUuYnJhbmNoLCBmb2xkZXIsICRzY29wZS5vYmplY3RJZCwgKGRldGFpbHMpID0+IHtcbiAgICAgICAgICAvLyBsZXRzIGZpbmQgdGhlIGNoaWxkIGVudHJ5IHNvIHdlIGNhbiBjYWxjdWxhdGUgaXRzIGNvcnJlY3QgZWRpdCBsaW5rXG4gICAgICAgICAgdmFyIGxpbms6c3RyaW5nID0gbnVsbDtcbiAgICAgICAgICBpZiAoZGV0YWlscyAmJiBkZXRhaWxzLmNoaWxkcmVuKSB7XG4gICAgICAgICAgICBsb2cuZGVidWcoXCJzY2FubmVkIHRoZSBkaXJlY3RvcnkgXCIgKyBkZXRhaWxzLmNoaWxkcmVuLmxlbmd0aCArIFwiIGNoaWxkcmVuXCIpO1xuICAgICAgICAgICAgdmFyIGNoaWxkID0gZGV0YWlscy5jaGlsZHJlbi5maW5kKGMgPT4gYy5uYW1lID09PSBmaWxlTmFtZSk7XG4gICAgICAgICAgICBpZiAoY2hpbGQpIHtcbiAgICAgICAgICAgICAgbGluayA9ICRzY29wZS5jaGlsZExpbmsoY2hpbGQpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgbG9nLmRlYnVnKFwiQ291bGQgbm90IGZpbmQgbmFtZSAnXCIgKyBmaWxlTmFtZSArIFwiJyBpbiB0aGUgbGlzdCBvZiBmaWxlIG5hbWVzIFwiICsgSlNPTi5zdHJpbmdpZnkoZGV0YWlscy5jaGlsZHJlbi5tYXAoYyA9PiBjLm5hbWUpKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICghbGluaykge1xuICAgICAgICAgICAgbG9nLmRlYnVnKFwiV0FSTklORzogY291bGQgbm90IGZpbmQgdGhlIGNoaWxkTGluayBzbyByZXZlcnRpbmcgdG8gdGhlIHdpa2kgZWRpdCBwYWdlIVwiKTtcbiAgICAgICAgICAgIGxpbmsgPSBXaWtpLmVkaXRMaW5rKCRzY29wZSwgcGF0aCwgJGxvY2F0aW9uKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgLy9Db3JlLiRhcHBseSgkc2NvcGUpO1xuICAgICAgICAgIGdvVG9MaW5rKGxpbmssICR0aW1lb3V0LCAkbG9jYXRpb24pO1xuICAgICAgICB9KTtcbiAgICAgIH0pXG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0TmV3RG9jdW1lbnRQYXRoKCkge1xuICAgICAgdmFyIHRlbXBsYXRlID0gJHNjb3BlLnNlbGVjdGVkQ3JlYXRlRG9jdW1lbnRUZW1wbGF0ZTtcbiAgICAgIGlmICghdGVtcGxhdGUpIHtcbiAgICAgICAgbG9nLmRlYnVnKFwiTm8gdGVtcGxhdGUgc2VsZWN0ZWQuXCIpO1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH1cbiAgICAgIHZhciBleGVtcGxhciA9IHRlbXBsYXRlLmV4ZW1wbGFyIHx8IFwiXCI7XG4gICAgICB2YXIgbmFtZTpzdHJpbmcgPSAkc2NvcGUubmV3RG9jdW1lbnROYW1lIHx8IGV4ZW1wbGFyO1xuXG4gICAgICBpZiAobmFtZS5pbmRleE9mKCcuJykgPCAwKSB7XG4gICAgICAgIC8vIGxldHMgYWRkIHRoZSBmaWxlIGV4dGVuc2lvbiBmcm9tIHRoZSBleGVtcGxhclxuICAgICAgICB2YXIgaWR4ID0gZXhlbXBsYXIubGFzdEluZGV4T2YoXCIuXCIpO1xuICAgICAgICBpZiAoaWR4ID4gMCkge1xuICAgICAgICAgIG5hbWUgKz0gZXhlbXBsYXIuc3Vic3RyaW5nKGlkeCk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8gbGV0cyBkZWFsIHdpdGggZGlyZWN0b3JpZXMgaW4gdGhlIG5hbWVcbiAgICAgIHZhciBmb2xkZXI6c3RyaW5nID0gJHNjb3BlLnBhZ2VJZDtcbiAgICAgIGlmICgkc2NvcGUuaXNGaWxlKSB7XG4gICAgICAgIC8vIGlmIHdlIGFyZSBhIGZpbGUgbGV0cyBkaXNjYXJkIHRoZSBsYXN0IHBhcnQgb2YgdGhlIHBhdGhcbiAgICAgICAgdmFyIGlkeDphbnkgPSBmb2xkZXIubGFzdEluZGV4T2YoXCIvXCIpO1xuICAgICAgICBpZiAoaWR4IDw9IDApIHtcbiAgICAgICAgICBmb2xkZXIgPSBcIlwiO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGZvbGRlciA9IGZvbGRlci5zdWJzdHJpbmcoMCwgaWR4KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgdmFyIGlkeDphbnkgPSBuYW1lLmxhc3RJbmRleE9mKFwiL1wiKTtcbiAgICAgIGlmIChpZHggPiAwKSB7XG4gICAgICAgIGZvbGRlciArPSBcIi9cIiArIG5hbWUuc3Vic3RyaW5nKDAsIGlkeCk7XG4gICAgICAgIG5hbWUgPSBuYW1lLnN1YnN0cmluZyhpZHggKyAxKTtcbiAgICAgIH1cbiAgICAgIGZvbGRlciA9IENvcmUudHJpbUxlYWRpbmcoZm9sZGVyLCBcIi9cIik7XG4gICAgICByZXR1cm4gZm9sZGVyICsgKGZvbGRlciA/IFwiL1wiIDogXCJcIikgKyBuYW1lO1xuICAgIH1cblxuICB9XSk7XG5cbn1cbiIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9pbmNsdWRlcy50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJ3aWtpSGVscGVycy50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJ3aWtpUGx1Z2luLnRzXCIvPlxuXG4vKipcbiAqIEBtb2R1bGUgV2lraVxuICovXG5tb2R1bGUgV2lraSB7XG4gIF9tb2R1bGUuY29udHJvbGxlcihcIldpa2kuRWRpdENvbnRyb2xsZXJcIiwgW1wiJHNjb3BlXCIsIFwiJGxvY2F0aW9uXCIsIFwiJHJvdXRlUGFyYW1zXCIsIFwiZmlsZUV4dGVuc2lvblR5cGVSZWdpc3RyeVwiLCAoJHNjb3BlLCAkbG9jYXRpb24sICRyb3V0ZVBhcmFtcywgZmlsZUV4dGVuc2lvblR5cGVSZWdpc3RyeSkgPT4ge1xuXG4gICAgV2lraS5pbml0U2NvcGUoJHNjb3BlLCAkcm91dGVQYXJhbXMsICRsb2NhdGlvbik7XG4gICAgJHNjb3BlLmJyZWFkY3J1bWJDb25maWcucHVzaChjcmVhdGVFZGl0aW5nQnJlYWRjcnVtYigkc2NvcGUpKTtcblxuICAgIHZhciB3aWtpUmVwb3NpdG9yeSA9ICRzY29wZS53aWtpUmVwb3NpdG9yeTtcblxuICAgICRzY29wZS5lbnRpdHkgPSB7XG4gICAgICBzb3VyY2U6IG51bGxcbiAgICB9O1xuXG4gICAgdmFyIGZvcm1hdCA9IFdpa2kuZmlsZUZvcm1hdCgkc2NvcGUucGFnZUlkLCBmaWxlRXh0ZW5zaW9uVHlwZVJlZ2lzdHJ5KTtcbiAgICB2YXIgZm9ybSA9IG51bGw7XG4gICAgaWYgKChmb3JtYXQgJiYgZm9ybWF0ID09PSBcImphdmFzY3JpcHRcIikgfHwgaXNDcmVhdGUoKSkge1xuICAgICAgZm9ybSA9ICRsb2NhdGlvbi5zZWFyY2goKVtcImZvcm1cIl07XG4gICAgfVxuXG4gICAgdmFyIG9wdGlvbnMgPSB7XG4gICAgICBtb2RlOiB7XG4gICAgICAgIG5hbWU6IGZvcm1hdFxuICAgICAgfVxuICAgIH07XG4gICAgJHNjb3BlLmNvZGVNaXJyb3JPcHRpb25zID0gQ29kZUVkaXRvci5jcmVhdGVFZGl0b3JTZXR0aW5ncyhvcHRpb25zKTtcbiAgICAkc2NvcGUubW9kaWZpZWQgPSBmYWxzZTtcblxuXG4gICAgJHNjb3BlLmlzVmFsaWQgPSAoKSA9PiAkc2NvcGUuZmlsZU5hbWU7XG5cbiAgICAkc2NvcGUuY2FuU2F2ZSA9ICgpID0+ICEkc2NvcGUubW9kaWZpZWQ7XG5cbiAgICAkc2NvcGUuJHdhdGNoKCdlbnRpdHkuc291cmNlJywgKG5ld1ZhbHVlLCBvbGRWYWx1ZSkgPT4ge1xuICAgICAgJHNjb3BlLm1vZGlmaWVkID0gbmV3VmFsdWUgJiYgb2xkVmFsdWUgJiYgbmV3VmFsdWUgIT09IG9sZFZhbHVlO1xuICAgIH0sIHRydWUpO1xuXG4gICAgbG9nLmRlYnVnKFwicGF0aDogXCIsICRzY29wZS5wYXRoKTtcblxuICAgICRzY29wZS4kd2F0Y2goJ21vZGlmaWVkJywgKG5ld1ZhbHVlLCBvbGRWYWx1ZSkgPT4ge1xuICAgICAgbG9nLmRlYnVnKFwibW9kaWZpZWQ6IFwiLCBuZXdWYWx1ZSk7XG4gICAgfSk7XG5cbiAgICAkc2NvcGUudmlld0xpbmsgPSAoKSA9PiBXaWtpLnZpZXdMaW5rKCRzY29wZSwgJHNjb3BlLnBhZ2VJZCwgJGxvY2F0aW9uLCAkc2NvcGUuZmlsZU5hbWUpO1xuXG4gICAgJHNjb3BlLmNhbmNlbCA9ICgpID0+IHtcbiAgICAgIGdvVG9WaWV3KCk7XG4gICAgfTtcblxuICAgICRzY29wZS5zYXZlID0gKCkgPT4ge1xuICAgICAgaWYgKCRzY29wZS5tb2RpZmllZCAmJiAkc2NvcGUuZmlsZU5hbWUpIHtcbiAgICAgICAgc2F2ZVRvKCRzY29wZVtcInBhZ2VJZFwiXSk7XG4gICAgICB9XG4gICAgfTtcblxuICAgICRzY29wZS5jcmVhdGUgPSAoKSA9PiB7XG4gICAgICAvLyBsZXRzIGNvbWJpbmUgdGhlIGZpbGUgbmFtZSB3aXRoIHRoZSBjdXJyZW50IHBhZ2VJZCAod2hpY2ggaXMgdGhlIGRpcmVjdG9yeSlcbiAgICAgIHZhciBwYXRoID0gJHNjb3BlLnBhZ2VJZCArIFwiL1wiICsgJHNjb3BlLmZpbGVOYW1lO1xuICAgICAgY29uc29sZS5sb2coXCJjcmVhdGluZyBuZXcgZmlsZSBhdCBcIiArIHBhdGgpO1xuICAgICAgc2F2ZVRvKHBhdGgpO1xuICAgIH07XG5cbiAgICAkc2NvcGUub25TdWJtaXQgPSAoanNvbiwgZm9ybSkgPT4ge1xuICAgICAgaWYgKGlzQ3JlYXRlKCkpIHtcbiAgICAgICAgJHNjb3BlLmNyZWF0ZSgpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgJHNjb3BlLnNhdmUoKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgJHNjb3BlLm9uQ2FuY2VsID0gKGZvcm0pID0+IHtcbiAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICBnb1RvVmlldygpO1xuICAgICAgICBDb3JlLiRhcHBseSgkc2NvcGUpXG4gICAgICB9LCA1MCk7XG4gICAgfTtcblxuXG4gICAgdXBkYXRlVmlldygpO1xuXG4gICAgZnVuY3Rpb24gaXNDcmVhdGUoKSB7XG4gICAgICByZXR1cm4gJGxvY2F0aW9uLnBhdGgoKS5zdGFydHNXaXRoKFwiL3dpa2kvY3JlYXRlXCIpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHVwZGF0ZVZpZXcoKSB7XG4gICAgICAvLyBvbmx5IGxvYWQgdGhlIHNvdXJjZSBpZiBub3QgaW4gY3JlYXRlIG1vZGVcbiAgICAgIGlmIChpc0NyZWF0ZSgpKSB7XG4gICAgICAgIHVwZGF0ZVNvdXJjZVZpZXcoKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGxvZy5kZWJ1ZyhcIkdldHRpbmcgcGFnZSwgYnJhbmNoOiBcIiwgJHNjb3BlLmJyYW5jaCwgXCIgcGFnZUlkOiBcIiwgJHNjb3BlLnBhZ2VJZCwgXCIgb2JqZWN0SWQ6IFwiLCAkc2NvcGUub2JqZWN0SWQpO1xuICAgICAgICB3aWtpUmVwb3NpdG9yeS5nZXRQYWdlKCRzY29wZS5icmFuY2gsICRzY29wZS5wYWdlSWQsICRzY29wZS5vYmplY3RJZCwgb25GaWxlQ29udGVudHMpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIG9uRmlsZUNvbnRlbnRzKGRldGFpbHMpIHtcbiAgICAgIHZhciBjb250ZW50cyA9IGRldGFpbHMudGV4dDtcbiAgICAgICRzY29wZS5lbnRpdHkuc291cmNlID0gY29udGVudHM7XG4gICAgICAkc2NvcGUuZmlsZU5hbWUgPSAkc2NvcGUucGFnZUlkLnNwbGl0KCcvJykubGFzdCgpO1xuICAgICAgbG9nLmRlYnVnKFwiZmlsZSBuYW1lOiBcIiwgJHNjb3BlLmZpbGVOYW1lKTtcbiAgICAgIGxvZy5kZWJ1ZyhcImZpbGUgZGV0YWlsczogXCIsIGRldGFpbHMpO1xuICAgICAgdXBkYXRlU291cmNlVmlldygpO1xuICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiB1cGRhdGVTb3VyY2VWaWV3KCkge1xuICAgICAgaWYgKGZvcm0pIHtcbiAgICAgICAgaWYgKGlzQ3JlYXRlKCkpIHtcbiAgICAgICAgICAvLyBsZXRzIGRlZmF1bHQgYSBmaWxlIG5hbWVcbiAgICAgICAgICBpZiAoISRzY29wZS5maWxlTmFtZSkge1xuICAgICAgICAgICAgJHNjb3BlLmZpbGVOYW1lID0gXCJcIiArIENvcmUuZ2V0VVVJRCgpICsgXCIuanNvblwiO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICAvLyBub3cgbGV0cyB0cnkgbG9hZCB0aGUgZm9ybSBkZWZpbnRpb24gSlNPTiBzbyB3ZSBjYW4gdGhlbiByZW5kZXIgdGhlIGZvcm1cbiAgICAgICAgJHNjb3BlLnNvdXJjZVZpZXcgPSBudWxsO1xuICAgICAgICAkc2NvcGUuZ2l0ID0gd2lraVJlcG9zaXRvcnkuZ2V0UGFnZSgkc2NvcGUuYnJhbmNoLCBmb3JtLCAkc2NvcGUub2JqZWN0SWQsIChkZXRhaWxzKSA9PiB7XG4gICAgICAgICAgb25Gb3JtU2NoZW1hKFdpa2kucGFyc2VKc29uKGRldGFpbHMudGV4dCkpO1xuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgICRzY29wZS5zb3VyY2VWaWV3ID0gXCJwbHVnaW5zL3dpa2kvaHRtbC9zb3VyY2VFZGl0Lmh0bWxcIjtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBvbkZvcm1TY2hlbWEoanNvbikge1xuICAgICAgJHNjb3BlLmZvcm1EZWZpbml0aW9uID0ganNvbjtcbiAgICAgIGlmICgkc2NvcGUuZW50aXR5LnNvdXJjZSkge1xuICAgICAgICAkc2NvcGUuZm9ybUVudGl0eSA9IFdpa2kucGFyc2VKc29uKCRzY29wZS5lbnRpdHkuc291cmNlKTtcbiAgICAgIH1cbiAgICAgICRzY29wZS5zb3VyY2VWaWV3ID0gXCJwbHVnaW5zL3dpa2kvaHRtbC9mb3JtRWRpdC5odG1sXCI7XG4gICAgICBDb3JlLiRhcHBseSgkc2NvcGUpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdvVG9WaWV3KCkge1xuICAgICAgdmFyIHBhdGggPSBDb3JlLnRyaW1MZWFkaW5nKCRzY29wZS52aWV3TGluaygpLCBcIiNcIik7XG4gICAgICBsb2cuZGVidWcoXCJnb2luZyB0byB2aWV3IFwiICsgcGF0aCk7XG4gICAgICAkbG9jYXRpb24ucGF0aChXaWtpLmRlY29kZVBhdGgocGF0aCkpO1xuICAgICAgbG9nLmRlYnVnKFwibG9jYXRpb24gaXMgbm93IFwiICsgJGxvY2F0aW9uLnBhdGgoKSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc2F2ZVRvKHBhdGg6c3RyaW5nKSB7XG4gICAgICB2YXIgY29tbWl0TWVzc2FnZSA9ICRzY29wZS5jb21taXRNZXNzYWdlIHx8IFwiVXBkYXRlZCBwYWdlIFwiICsgJHNjb3BlLnBhZ2VJZDtcbiAgICAgIHZhciBjb250ZW50cyA9ICRzY29wZS5lbnRpdHkuc291cmNlO1xuICAgICAgaWYgKCRzY29wZS5mb3JtRW50aXR5KSB7XG4gICAgICAgIGNvbnRlbnRzID0gSlNPTi5zdHJpbmdpZnkoJHNjb3BlLmZvcm1FbnRpdHksIG51bGwsIFwiICBcIik7XG4gICAgICB9XG4gICAgICBsb2cuZGVidWcoXCJTYXZpbmcgZmlsZSwgYnJhbmNoOiBcIiwgJHNjb3BlLmJyYW5jaCwgXCIgcGF0aDogXCIsICRzY29wZS5wYXRoKTtcbiAgICAgIC8vY29uc29sZS5sb2coXCJBYm91dCB0byB3cml0ZSBjb250ZW50cyAnXCIgKyBjb250ZW50cyArIFwiJ1wiKTtcbiAgICAgIHdpa2lSZXBvc2l0b3J5LnB1dFBhZ2UoJHNjb3BlLmJyYW5jaCwgcGF0aCwgY29udGVudHMsIGNvbW1pdE1lc3NhZ2UsIChzdGF0dXMpID0+IHtcbiAgICAgICAgV2lraS5vbkNvbXBsZXRlKHN0YXR1cyk7XG4gICAgICAgICRzY29wZS5tb2RpZmllZCA9IGZhbHNlO1xuICAgICAgICBDb3JlLm5vdGlmaWNhdGlvbihcInN1Y2Nlc3NcIiwgXCJTYXZlZCBcIiArIHBhdGgpO1xuICAgICAgICBnb1RvVmlldygpO1xuICAgICAgICBDb3JlLiRhcHBseSgkc2NvcGUpO1xuICAgICAgfSk7XG4gICAgfVxuICB9XSk7XG59XG4iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vaW5jbHVkZXMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwid2lraUhlbHBlcnMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwid2lraVBsdWdpbi50c1wiLz5cblxuLyoqXG4gKiBAbW9kdWxlIFdpa2lcbiAqL1xubW9kdWxlIFdpa2kge1xuXG4gIC8vIGNvbnRyb2xsZXIgZm9yIGhhbmRsaW5nIGZpbGUgZHJvcHNcbiAgZXhwb3J0IHZhciBGaWxlRHJvcENvbnRyb2xsZXIgPSBfbW9kdWxlLmNvbnRyb2xsZXIoXCJXaWtpLkZpbGVEcm9wQ29udHJvbGxlclwiLCBbXCIkc2NvcGVcIiwgXCJGaWxlVXBsb2FkZXJcIiwgXCIkcm91dGVcIiwgXCIkdGltZW91dFwiLCBcInVzZXJEZXRhaWxzXCIsICgkc2NvcGUsIEZpbGVVcGxvYWRlciwgJHJvdXRlOm5nLnJvdXRlLklSb3V0ZVNlcnZpY2UsICR0aW1lb3V0Om5nLklUaW1lb3V0U2VydmljZSwgdXNlckRldGFpbHM6Q29yZS5Vc2VyRGV0YWlscykgPT4ge1xuXG5cbiAgICB2YXIgdXBsb2FkVVJJID0gV2lraS5naXRSZXN0VVJMKCRzY29wZSwgJHNjb3BlLnBhZ2VJZCkgKyAnLyc7XG4gICAgdmFyIHVwbG9hZGVyID0gJHNjb3BlLnVwbG9hZGVyID0gbmV3IEZpbGVVcGxvYWRlcih7XG4gICAgICBoZWFkZXJzOiB7XG4gICAgICAgICdBdXRob3JpemF0aW9uJzogQ29yZS5hdXRoSGVhZGVyVmFsdWUodXNlckRldGFpbHMpXG4gICAgICB9LFxuICAgICAgYXV0b1VwbG9hZDogdHJ1ZSxcbiAgICAgIHdpdGhDcmVkZW50aWFsczogdHJ1ZSxcbiAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgdXJsOiB1cGxvYWRVUklcbiAgICB9KTtcbiAgICAkc2NvcGUuZG9VcGxvYWQgPSAoKSA9PiB7XG4gICAgICB1cGxvYWRlci51cGxvYWRBbGwoKTtcbiAgICB9O1xuICAgIHVwbG9hZGVyLm9uV2hlbkFkZGluZ0ZpbGVGYWlsZWQgPSBmdW5jdGlvbiAoaXRlbSAvKntGaWxlfEZpbGVMaWtlT2JqZWN0fSovLCBmaWx0ZXIsIG9wdGlvbnMpIHtcbiAgICAgIGxvZy5kZWJ1Zygnb25XaGVuQWRkaW5nRmlsZUZhaWxlZCcsIGl0ZW0sIGZpbHRlciwgb3B0aW9ucyk7XG4gICAgfTtcbiAgICB1cGxvYWRlci5vbkFmdGVyQWRkaW5nRmlsZSA9IGZ1bmN0aW9uIChmaWxlSXRlbSkge1xuICAgICAgbG9nLmRlYnVnKCdvbkFmdGVyQWRkaW5nRmlsZScsIGZpbGVJdGVtKTtcbiAgICB9O1xuICAgIHVwbG9hZGVyLm9uQWZ0ZXJBZGRpbmdBbGwgPSBmdW5jdGlvbiAoYWRkZWRGaWxlSXRlbXMpIHtcbiAgICAgIGxvZy5kZWJ1Zygnb25BZnRlckFkZGluZ0FsbCcsIGFkZGVkRmlsZUl0ZW1zKTtcbiAgICB9O1xuICAgIHVwbG9hZGVyLm9uQmVmb3JlVXBsb2FkSXRlbSA9IGZ1bmN0aW9uIChpdGVtKSB7XG4gICAgICBpZiAoJ2ZpbGUnIGluIGl0ZW0pIHtcbiAgICAgICAgaXRlbS5maWxlU2l6ZU1CID0gKGl0ZW0uZmlsZS5zaXplIC8gMTAyNCAvIDEwMjQpLnRvRml4ZWQoMik7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpdGVtLmZpbGVTaXplTUIgPSAwO1xuICAgICAgfVxuICAgICAgLy9pdGVtLnVybCA9IFVybEhlbHBlcnMuam9pbih1cGxvYWRVUkksIGl0ZW0uZmlsZS5uYW1lKTtcbiAgICAgIGl0ZW0udXJsID0gdXBsb2FkVVJJO1xuICAgICAgbG9nLmluZm8oXCJMb2FkaW5nIGZpbGVzIHRvIFwiICsgdXBsb2FkVVJJKTtcbiAgICAgIGxvZy5kZWJ1Zygnb25CZWZvcmVVcGxvYWRJdGVtJywgaXRlbSk7XG4gICAgfTtcbiAgICB1cGxvYWRlci5vblByb2dyZXNzSXRlbSA9IGZ1bmN0aW9uIChmaWxlSXRlbSwgcHJvZ3Jlc3MpIHtcbiAgICAgIGxvZy5kZWJ1Zygnb25Qcm9ncmVzc0l0ZW0nLCBmaWxlSXRlbSwgcHJvZ3Jlc3MpO1xuICAgIH07XG4gICAgdXBsb2FkZXIub25Qcm9ncmVzc0FsbCA9IGZ1bmN0aW9uIChwcm9ncmVzcykge1xuICAgICAgbG9nLmRlYnVnKCdvblByb2dyZXNzQWxsJywgcHJvZ3Jlc3MpO1xuICAgIH07XG4gICAgdXBsb2FkZXIub25TdWNjZXNzSXRlbSA9IGZ1bmN0aW9uIChmaWxlSXRlbSwgcmVzcG9uc2UsIHN0YXR1cywgaGVhZGVycykge1xuICAgICAgbG9nLmRlYnVnKCdvblN1Y2Nlc3NJdGVtJywgZmlsZUl0ZW0sIHJlc3BvbnNlLCBzdGF0dXMsIGhlYWRlcnMpO1xuICAgIH07XG4gICAgdXBsb2FkZXIub25FcnJvckl0ZW0gPSBmdW5jdGlvbiAoZmlsZUl0ZW0sIHJlc3BvbnNlLCBzdGF0dXMsIGhlYWRlcnMpIHtcbiAgICAgIGxvZy5kZWJ1Zygnb25FcnJvckl0ZW0nLCBmaWxlSXRlbSwgcmVzcG9uc2UsIHN0YXR1cywgaGVhZGVycyk7XG4gICAgfTtcbiAgICB1cGxvYWRlci5vbkNhbmNlbEl0ZW0gPSBmdW5jdGlvbiAoZmlsZUl0ZW0sIHJlc3BvbnNlLCBzdGF0dXMsIGhlYWRlcnMpIHtcbiAgICAgIGxvZy5kZWJ1Zygnb25DYW5jZWxJdGVtJywgZmlsZUl0ZW0sIHJlc3BvbnNlLCBzdGF0dXMsIGhlYWRlcnMpO1xuICAgIH07XG4gICAgdXBsb2FkZXIub25Db21wbGV0ZUl0ZW0gPSBmdW5jdGlvbiAoZmlsZUl0ZW0sIHJlc3BvbnNlLCBzdGF0dXMsIGhlYWRlcnMpIHtcbiAgICAgIGxvZy5kZWJ1Zygnb25Db21wbGV0ZUl0ZW0nLCBmaWxlSXRlbSwgcmVzcG9uc2UsIHN0YXR1cywgaGVhZGVycyk7XG4gICAgfTtcbiAgICB1cGxvYWRlci5vbkNvbXBsZXRlQWxsID0gZnVuY3Rpb24gKCkge1xuICAgICAgbG9nLmRlYnVnKCdvbkNvbXBsZXRlQWxsJyk7XG4gICAgICB1cGxvYWRlci5jbGVhclF1ZXVlKCk7XG4gICAgICAkdGltZW91dCgoKSA9PiB7XG4gICAgICAgIGxvZy5pbmZvKFwiQ29tcGxldGVkIGFsbCB1cGxvYWRzLiBMZXRzIGZvcmNlIGEgcmVsb2FkXCIpO1xuICAgICAgICAkcm91dGUucmVsb2FkKCk7XG4gICAgICAgIENvcmUuJGFwcGx5KCRzY29wZSk7XG4gICAgICB9LCAyMDApO1xuICAgIH07XG4gIH1dKTtcblxufVxuIiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL2luY2x1ZGVzLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIndpa2lIZWxwZXJzLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIndpa2lQbHVnaW4udHNcIi8+XG5cbi8qKlxuICogQG1vZHVsZSBXaWtpXG4gKi9cbm1vZHVsZSBXaWtpIHtcblxuICBfbW9kdWxlLmNvbnRyb2xsZXIoXCJXaWtpLkZvcm1UYWJsZUNvbnRyb2xsZXJcIiwgW1wiJHNjb3BlXCIsIFwiJGxvY2F0aW9uXCIsIFwiJHJvdXRlUGFyYW1zXCIsICgkc2NvcGUsICRsb2NhdGlvbiwgJHJvdXRlUGFyYW1zKSA9PiB7XG4gICAgV2lraS5pbml0U2NvcGUoJHNjb3BlLCAkcm91dGVQYXJhbXMsICRsb2NhdGlvbik7XG4gICAgdmFyIHdpa2lSZXBvc2l0b3J5ID0gJHNjb3BlLndpa2lSZXBvc2l0b3J5O1xuXG4gICAgJHNjb3BlLmNvbHVtbkRlZnMgPSBbXTtcblxuICAgICRzY29wZS5ncmlkT3B0aW9ucyA9IHtcbiAgICAgICBkYXRhOiAnbGlzdCcsXG4gICAgICAgZGlzcGxheUZvb3RlcjogZmFsc2UsXG4gICAgICAgc2hvd0ZpbHRlcjogZmFsc2UsXG4gICAgICAgZmlsdGVyT3B0aW9uczoge1xuICAgICAgICAgZmlsdGVyVGV4dDogJydcbiAgICAgICB9LFxuICAgICAgIGNvbHVtbkRlZnM6ICRzY29wZS5jb2x1bW5EZWZzXG4gICAgIH07XG5cblxuICAgICRzY29wZS52aWV3TGluayA9IChyb3cpID0+IHtcbiAgICAgIHJldHVybiBjaGlsZExpbmsocm93LCBcIi92aWV3XCIpO1xuICAgIH07XG4gICAgJHNjb3BlLmVkaXRMaW5rID0gKHJvdykgPT4ge1xuICAgICAgcmV0dXJuIGNoaWxkTGluayhyb3csIFwiL2VkaXRcIik7XG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIGNoaWxkTGluayhjaGlsZCwgcHJlZml4KSB7XG4gICAgICB2YXIgc3RhcnQgPSBXaWtpLnN0YXJ0TGluaygkc2NvcGUpO1xuICAgICAgdmFyIGNoaWxkSWQgPSAoY2hpbGQpID8gY2hpbGRbXCJfaWRcIl0gfHwgXCJcIiA6IFwiXCI7XG4gICAgICByZXR1cm4gQ29yZS5jcmVhdGVIcmVmKCRsb2NhdGlvbiwgc3RhcnQgKyBwcmVmaXggKyBcIi9cIiArICRzY29wZS5wYWdlSWQgKyBcIi9cIiArIGNoaWxkSWQpO1xuICAgIH1cblxuICAgIHZhciBsaW5rc0NvbHVtbiA9IHtcbiAgICAgIGZpZWxkOiAnX2lkJyxcbiAgICAgIGRpc3BsYXlOYW1lOiAnQWN0aW9ucycsXG4gICAgICBjZWxsVGVtcGxhdGU6ICc8ZGl2IGNsYXNzPVwibmdDZWxsVGV4dFwiXCI+PGEgbmctaHJlZj1cInt7dmlld0xpbmsocm93LmVudGl0eSl9fVwiIGNsYXNzPVwiYnRuXCI+VmlldzwvYT4gPGEgbmctaHJlZj1cInt7ZWRpdExpbmsocm93LmVudGl0eSl9fVwiIGNsYXNzPVwiYnRuXCI+RWRpdDwvYT48L2Rpdj4nXG4gICAgfTtcblxuICAgICRzY29wZS4kb24oXCIkcm91dGVDaGFuZ2VTdWNjZXNzXCIsIGZ1bmN0aW9uIChldmVudCwgY3VycmVudCwgcHJldmlvdXMpIHtcbiAgICAgIC8vIGxldHMgZG8gdGhpcyBhc3luY2hyb25vdXNseSB0byBhdm9pZCBFcnJvcjogJGRpZ2VzdCBhbHJlYWR5IGluIHByb2dyZXNzXG4gICAgICBzZXRUaW1lb3V0KHVwZGF0ZVZpZXcsIDUwKTtcbiAgICB9KTtcblxuICAgIHZhciBmb3JtID0gJGxvY2F0aW9uLnNlYXJjaCgpW1wiZm9ybVwiXTtcbiAgICBpZiAoZm9ybSkge1xuICAgICAgd2lraVJlcG9zaXRvcnkuZ2V0UGFnZSgkc2NvcGUuYnJhbmNoLCBmb3JtLCAkc2NvcGUub2JqZWN0SWQsIG9uRm9ybURhdGEpO1xuICAgIH1cblxuICAgIHVwZGF0ZVZpZXcoKTtcblxuICAgIGZ1bmN0aW9uIG9uUmVzdWx0cyhyZXNwb25zZSkge1xuICAgICAgdmFyIGxpc3QgPSBbXTtcbiAgICAgIHZhciBtYXAgPSBXaWtpLnBhcnNlSnNvbihyZXNwb25zZSk7XG4gICAgICBhbmd1bGFyLmZvckVhY2gobWFwLCAodmFsdWUsIGtleSkgPT4ge1xuICAgICAgICB2YWx1ZVtcIl9pZFwiXSA9IGtleTtcbiAgICAgICAgbGlzdC5wdXNoKHZhbHVlKTtcbiAgICAgIH0pO1xuICAgICAgJHNjb3BlLmxpc3QgPSBsaXN0O1xuICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiB1cGRhdGVWaWV3KCkge1xuICAgICAgdmFyIGZpbHRlciA9IENvcmUucGF0aEdldCgkc2NvcGUsIFtcImdyaWRPcHRpb25zXCIsIFwiZmlsdGVyT3B0aW9uc1wiLCBcImZpbHRlclRleHRcIl0pIHx8IFwiXCI7XG4gICAgICAkc2NvcGUuZ2l0ID0gd2lraVJlcG9zaXRvcnkuanNvbkNoaWxkQ29udGVudHMoJHNjb3BlLnBhZ2VJZCwgXCIqLmpzb25cIiwgZmlsdGVyLCBvblJlc3VsdHMpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIG9uRm9ybURhdGEoZGV0YWlscykge1xuICAgICAgdmFyIHRleHQgPSBkZXRhaWxzLnRleHQ7XG4gICAgICBpZiAodGV4dCkge1xuICAgICAgICAkc2NvcGUuZm9ybURlZmluaXRpb24gPSBXaWtpLnBhcnNlSnNvbih0ZXh0KTtcblxuICAgICAgICB2YXIgY29sdW1uRGVmcyA9IFtdO1xuICAgICAgICB2YXIgc2NoZW1hID0gJHNjb3BlLmZvcm1EZWZpbml0aW9uO1xuICAgICAgICBhbmd1bGFyLmZvckVhY2goc2NoZW1hLnByb3BlcnRpZXMsIChwcm9wZXJ0eSwgbmFtZSkgPT4ge1xuICAgICAgICAgIGlmIChuYW1lKSB7XG4gICAgICAgICAgICBpZiAoIUZvcm1zLmlzQXJyYXlPck5lc3RlZE9iamVjdChwcm9wZXJ0eSwgc2NoZW1hKSkge1xuICAgICAgICAgICAgICB2YXIgY29sRGVmID0ge1xuICAgICAgICAgICAgICAgIGZpZWxkOiBuYW1lLFxuICAgICAgICAgICAgICAgIGRpc3BsYXlOYW1lOiBwcm9wZXJ0eS5kZXNjcmlwdGlvbiB8fCBuYW1lLFxuICAgICAgICAgICAgICAgIHZpc2libGU6IHRydWVcbiAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgY29sdW1uRGVmcy5wdXNoKGNvbERlZik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgY29sdW1uRGVmcy5wdXNoKGxpbmtzQ29sdW1uKTtcblxuICAgICAgICAkc2NvcGUuY29sdW1uRGVmcyA9IGNvbHVtbkRlZnM7XG4gICAgICAgICRzY29wZS5ncmlkT3B0aW9ucy5jb2x1bW5EZWZzID0gY29sdW1uRGVmcztcblxuICAgICAgICAvLyBub3cgd2UgaGF2ZSB0aGUgZ3JpZCBjb2x1bW4gc3R1ZmYgbG9hZGVkLCBsZXRzIGxvYWQgdGhlIGRhdGF0YWJsZVxuICAgICAgICAkc2NvcGUudGFibGVWaWV3ID0gXCJwbHVnaW5zL3dpa2kvaHRtbC9mb3JtVGFibGVEYXRhdGFibGUuaHRtbFwiO1xuICAgICAgfVxuICAgIH1cbiAgICBDb3JlLiRhcHBseSgkc2NvcGUpO1xuICB9XSk7XG59XG4iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vaW5jbHVkZXMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwid2lraUhlbHBlcnMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwid2lraVBsdWdpbi50c1wiLz5cblxuLyoqXG4gKiBAbW9kdWxlIFdpa2lcbiAqL1xuIG1vZHVsZSBXaWtpIHtcbiAgX21vZHVsZS5jb250cm9sbGVyKFwiV2lraS5HaXRQcmVmZXJlbmNlc1wiLCBbXCIkc2NvcGVcIiwgXCJsb2NhbFN0b3JhZ2VcIiwgXCJ1c2VyRGV0YWlsc1wiLCAoJHNjb3BlLCBsb2NhbFN0b3JhZ2UsIHVzZXJEZXRhaWxzKSA9PiB7XG5cbiAgICB2YXIgY29uZmlnID0ge1xuICAgICAgcHJvcGVydGllczoge1xuICAgICAgICBnaXRVc2VyTmFtZToge1xuICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgIGxhYmVsOiAnVXNlcm5hbWUnLFxuICAgICAgICAgIGRlc2NyaXB0aW9uOiAnVGhlIHVzZXIgbmFtZSB0byBiZSB1c2VkIHdoZW4gbWFraW5nIGNoYW5nZXMgdG8gZmlsZXMgd2l0aCB0aGUgc291cmNlIGNvbnRyb2wgc3lzdGVtJ1xuICAgICAgICB9LFxuICAgICAgICBnaXRVc2VyRW1haWw6IHtcbiAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICBsYWJlbDogJ0VtYWlsJyxcbiAgICAgICAgICBkZXNjcmlwdGlvbjogJ1RoZSBlbWFpbCBhZGRyZXNzIHRvIHVzZSB3aGVuIG1ha2luZyBjaGFuZ2VzIHRvIGZpbGVzIHdpdGggdGhlIHNvdXJjZSBjb250cm9sIHN5c3RlbSdcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH07XG5cbiAgICAkc2NvcGUuZW50aXR5ID0gJHNjb3BlO1xuICAgICRzY29wZS5jb25maWcgPSBjb25maWc7XG5cbiAgICBDb3JlLmluaXRQcmVmZXJlbmNlU2NvcGUoJHNjb3BlLCBsb2NhbFN0b3JhZ2UsIHtcbiAgICAgICdnaXRVc2VyTmFtZSc6IHtcbiAgICAgICAgJ3ZhbHVlJzogdXNlckRldGFpbHMudXNlcm5hbWUgfHwgXCJcIlxuICAgICAgfSxcbiAgICAgICdnaXRVc2VyRW1haWwnOiB7XG4gICAgICAgICd2YWx1ZSc6ICcnXG4gICAgICB9ICBcbiAgICB9KTtcbiAgfV0pO1xuIH1cbiIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9pbmNsdWRlcy50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJ3aWtpSGVscGVycy50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJ3aWtpUGx1Z2luLnRzXCIvPlxuXG4vKipcbiAqIEBtb2R1bGUgV2lraVxuICovXG5tb2R1bGUgV2lraSB7XG5cbiAgX21vZHVsZS5jb250cm9sbGVyKFwiV2lraS5IaXN0b3J5Q29udHJvbGxlclwiLCBbXCIkc2NvcGVcIiwgXCIkbG9jYXRpb25cIiwgXCIkcm91dGVQYXJhbXNcIiwgXCIkdGVtcGxhdGVDYWNoZVwiLCBcIm1hcmtlZFwiLCBcImZpbGVFeHRlbnNpb25UeXBlUmVnaXN0cnlcIiwgICgkc2NvcGUsICRsb2NhdGlvbiwgJHJvdXRlUGFyYW1zLCAkdGVtcGxhdGVDYWNoZSwgbWFya2VkLCBmaWxlRXh0ZW5zaW9uVHlwZVJlZ2lzdHJ5KSA9PiB7XG5cbiAgICAvLyBUT0RPIHJlbW92ZSFcbiAgICB2YXIgaXNGbWMgPSBmYWxzZTtcbiAgICB2YXIgam9sb2tpYSA9IG51bGw7XG5cbiAgICBXaWtpLmluaXRTY29wZSgkc2NvcGUsICRyb3V0ZVBhcmFtcywgJGxvY2F0aW9uKTtcbiAgICB2YXIgd2lraVJlcG9zaXRvcnkgPSAkc2NvcGUud2lraVJlcG9zaXRvcnk7XG5cbiAgICAvLyBUT0RPIHdlIGNvdWxkIGNvbmZpZ3VyZSB0aGlzP1xuICAgICRzY29wZS5kYXRlRm9ybWF0ID0gJ0VFRSwgTU1NIGQsIHkgYXQgSEg6bW06c3MgWic7XG4gICAgLy8neXl5eS1NTS1kZCBISDptbTpzcyBaJ1xuXG4gICAgJHNjb3BlLmdyaWRPcHRpb25zID0ge1xuICAgICAgZGF0YTogJ2xvZ3MnLFxuICAgICAgc2hvd0ZpbHRlcjogZmFsc2UsXG4gICAgICBlbmFibGVSb3dDbGlja1NlbGVjdGlvbjogZmFsc2UsXG4gICAgICBtdWx0aVNlbGVjdDogdHJ1ZSxcbiAgICAgIHNlbGVjdGVkSXRlbXM6IFtdLFxuICAgICAgc2hvd1NlbGVjdGlvbkNoZWNrYm94OiB0cnVlLFxuICAgICAgZGlzcGxheVNlbGVjdGlvbkNoZWNrYm94IDogdHJ1ZSwgLy8gb2xkIHByZSAyLjAgY29uZmlnIVxuICAgICAgZmlsdGVyT3B0aW9uczoge1xuICAgICAgICBmaWx0ZXJUZXh0OiAnJ1xuICAgICAgfSxcbiAgICAgIGNvbHVtbkRlZnM6IFtcbiAgICAgICAge1xuICAgICAgICAgIGZpZWxkOiAnJGRhdGUnLFxuICAgICAgICAgIGRpc3BsYXlOYW1lOiAnTW9kaWZpZWQnLFxuICAgICAgICAgIGNlbGxUZW1wbGF0ZTogJzxkaXYgY2xhc3M9XCJuZ0NlbGxUZXh0XCIgdGl0bGU9XCJ7e3Jvdy5lbnRpdHkuJGRhdGUgfCBkYXRlOlxcJ0VFRSwgTU1NIGQsIHl5eXkgOiBISDptbTpzcyBaXFwnfX1cIj57e3Jvdy5lbnRpdHkuJGRhdGUucmVsYXRpdmUoKX19PC9kaXY+JyxcbiAgICAgICAgICB3aWR0aDogXCIqKlwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICBmaWVsZDogJ3NoYScsXG4gICAgICAgICAgZGlzcGxheU5hbWU6ICdDaGFuZ2UnLFxuICAgICAgICAgIGNlbGxUZW1wbGF0ZTogJHRlbXBsYXRlQ2FjaGUuZ2V0KCdjaGFuZ2VDZWxsVGVtcGxhdGUuaHRtbCcpLFxuICAgICAgICAgIGNlbGxGaWx0ZXI6IFwiXCIsXG4gICAgICAgICAgd2lkdGg6IFwiKlwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICBmaWVsZDogJ2F1dGhvcicsXG4gICAgICAgICAgZGlzcGxheU5hbWU6ICdBdXRob3InLFxuICAgICAgICAgIGNlbGxGaWx0ZXI6IFwiXCIsXG4gICAgICAgICAgd2lkdGg6IFwiKipcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgZmllbGQ6ICdzaG9ydF9tZXNzYWdlJyxcbiAgICAgICAgICBkaXNwbGF5TmFtZTogJ01lc3NhZ2UnLFxuICAgICAgICAgIGNlbGxUZW1wbGF0ZTogJzxkaXYgY2xhc3M9XCJuZ0NlbGxUZXh0XCIgdGl0bGU9XCJ7e3Jvdy5lbnRpdHkuc2hvcnRfbWVzc2FnZX19XCI+e3tyb3cuZW50aXR5LnNob3J0X21lc3NhZ2UgIHwgbGltaXRUbzoxMDB9fTwvZGl2PicsXG4gICAgICAgICAgd2lkdGg6IFwiKioqKlwiXG4gICAgICAgIH1cbiAgICAgIF1cbiAgICB9O1xuXG4gICAgJHNjb3BlLiRvbihcIiRyb3V0ZUNoYW5nZVN1Y2Nlc3NcIiwgZnVuY3Rpb24gKGV2ZW50LCBjdXJyZW50LCBwcmV2aW91cykge1xuICAgICAgLy8gbGV0cyBkbyB0aGlzIGFzeW5jaHJvbm91c2x5IHRvIGF2b2lkIEVycm9yOiAkZGlnZXN0IGFscmVhZHkgaW4gcHJvZ3Jlc3NcbiAgICAgIHNldFRpbWVvdXQodXBkYXRlVmlldywgNTApO1xuICAgIH0pO1xuXG4gICAgJHNjb3BlLmNhblJldmVydCA9ICgpID0+IHtcbiAgICAgIHZhciBzZWxlY3RlZEl0ZW1zID0gJHNjb3BlLmdyaWRPcHRpb25zLnNlbGVjdGVkSXRlbXM7XG4gICAgICByZXR1cm4gc2VsZWN0ZWRJdGVtcy5sZW5ndGggPT09IDEgJiYgc2VsZWN0ZWRJdGVtc1swXSAhPT0gJHNjb3BlLmxvZ3NbMF07XG4gICAgfTtcblxuICAgICRzY29wZS5yZXZlcnQgPSAoKSA9PiB7XG4gICAgICB2YXIgc2VsZWN0ZWRJdGVtcyA9ICRzY29wZS5ncmlkT3B0aW9ucy5zZWxlY3RlZEl0ZW1zO1xuICAgICAgaWYgKHNlbGVjdGVkSXRlbXMubGVuZ3RoID4gMCkge1xuICAgICAgICB2YXIgb2JqZWN0SWQgPSBzZWxlY3RlZEl0ZW1zWzBdLnNoYTtcbiAgICAgICAgaWYgKG9iamVjdElkKSB7XG4gICAgICAgICAgdmFyIGNvbW1pdE1lc3NhZ2UgPSBcIlJldmVydGluZyBmaWxlIFwiICsgJHNjb3BlLnBhZ2VJZCArIFwiIHRvIHByZXZpb3VzIHZlcnNpb24gXCIgKyBvYmplY3RJZDtcbiAgICAgICAgICB3aWtpUmVwb3NpdG9yeS5yZXZlcnRUbygkc2NvcGUuYnJhbmNoLCBvYmplY3RJZCwgJHNjb3BlLnBhZ2VJZCwgY29tbWl0TWVzc2FnZSwgKHJlc3VsdCkgPT4ge1xuICAgICAgICAgICAgV2lraS5vbkNvbXBsZXRlKHJlc3VsdCk7XG4gICAgICAgICAgICAvLyBub3cgbGV0cyB1cGRhdGUgdGhlIHZpZXdcbiAgICAgICAgICAgIENvcmUubm90aWZpY2F0aW9uKCdzdWNjZXNzJywgXCJTdWNjZXNzZnVsbHkgcmV2ZXJ0ZWQgXCIgKyAkc2NvcGUucGFnZUlkKTtcbiAgICAgICAgICAgIHVwZGF0ZVZpZXcoKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBzZWxlY3RlZEl0ZW1zLnNwbGljZSgwLCBzZWxlY3RlZEl0ZW1zLmxlbmd0aCk7XG4gICAgICB9XG4gICAgfTtcblxuICAgICRzY29wZS5kaWZmID0gKCkgPT4ge1xuICAgICAgdmFyIGRlZmF1bHRWYWx1ZSA9IFwiIFwiO1xuICAgICAgdmFyIG9iamVjdElkID0gZGVmYXVsdFZhbHVlO1xuICAgICAgdmFyIHNlbGVjdGVkSXRlbXMgPSAkc2NvcGUuZ3JpZE9wdGlvbnMuc2VsZWN0ZWRJdGVtcztcbiAgICAgIGlmIChzZWxlY3RlZEl0ZW1zLmxlbmd0aCA+IDApIHtcbiAgICAgICAgb2JqZWN0SWQgPSBzZWxlY3RlZEl0ZW1zWzBdLnNoYSB8fCBkZWZhdWx0VmFsdWU7XG4gICAgICB9XG4gICAgICB2YXIgYmFzZU9iamVjdElkID0gZGVmYXVsdFZhbHVlO1xuICAgICAgaWYgKHNlbGVjdGVkSXRlbXMubGVuZ3RoID4gMSkge1xuICAgICAgICBiYXNlT2JqZWN0SWQgPSBzZWxlY3RlZEl0ZW1zWzFdLnNoYSB8fGRlZmF1bHRWYWx1ZTtcbiAgICAgICAgLy8gbWFrZSB0aGUgb2JqZWN0SWQgKHRoZSBvbmUgdGhhdCB3aWxsIHN0YXJ0IHdpdGggYi8gcGF0aCkgYWx3YXlzIG5ld2VyIHRoYW4gYmFzZU9iamVjdElkXG4gICAgICAgIGlmIChzZWxlY3RlZEl0ZW1zWzBdLmRhdGUgPCBzZWxlY3RlZEl0ZW1zWzFdLmRhdGUpIHtcbiAgICAgICAgICB2YXIgXyA9IGJhc2VPYmplY3RJZDtcbiAgICAgICAgICBiYXNlT2JqZWN0SWQgPSBvYmplY3RJZDtcbiAgICAgICAgICBvYmplY3RJZCA9IF87XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHZhciBsaW5rID0gc3RhcnRMaW5rKCRzY29wZSkgKyBcIi9kaWZmL1wiICsgJHNjb3BlLnBhZ2VJZCArIFwiL1wiICsgb2JqZWN0SWQgKyBcIi9cIiArIGJhc2VPYmplY3RJZDtcbiAgICAgIHZhciBwYXRoID0gQ29yZS50cmltTGVhZGluZyhsaW5rLCBcIiNcIik7XG4gICAgICAkbG9jYXRpb24ucGF0aChwYXRoKTtcbiAgICB9O1xuXG4gICAgdXBkYXRlVmlldygpO1xuXG4gICAgZnVuY3Rpb24gdXBkYXRlVmlldygpIHtcbiAgICAgIHZhciBvYmplY3RJZCA9IFwiXCI7XG4gICAgICB2YXIgbGltaXQgPSAwO1xuXG4gICAgICAkc2NvcGUuZ2l0ID0gd2lraVJlcG9zaXRvcnkuaGlzdG9yeSgkc2NvcGUuYnJhbmNoLCBvYmplY3RJZCwgJHNjb3BlLnBhZ2VJZCwgbGltaXQsIChsb2dBcnJheSkgPT4ge1xuICAgICAgICBhbmd1bGFyLmZvckVhY2gobG9nQXJyYXksIChsb2cpID0+IHtcbiAgICAgICAgICAvLyBsZXRzIHVzZSB0aGUgc2hvcnRlciBoYXNoIGZvciBsaW5rcyBieSBkZWZhdWx0XG4gICAgICAgICAgdmFyIGNvbW1pdElkID0gbG9nLnNoYTtcbiAgICAgICAgICBsb2cuJGRhdGUgPSBEZXZlbG9wZXIuYXNEYXRlKGxvZy5kYXRlKTtcbiAgICAgICAgICBsb2cuY29tbWl0TGluayA9IHN0YXJ0TGluaygkc2NvcGUpICsgXCIvY29tbWl0L1wiICsgJHNjb3BlLnBhZ2VJZCArIFwiL1wiICsgY29tbWl0SWQ7XG4gICAgICAgIH0pO1xuICAgICAgICAkc2NvcGUubG9ncyA9IGxvZ0FycmF5O1xuICAgICAgICBDb3JlLiRhcHBseSgkc2NvcGUpO1xuICAgICAgfSk7XG4gICAgICBXaWtpLmxvYWRCcmFuY2hlcyhqb2xva2lhLCB3aWtpUmVwb3NpdG9yeSwgJHNjb3BlLCBpc0ZtYyk7XG4gICAgfVxuICB9XSk7XG59XG4iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vaW5jbHVkZXMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwid2lraUhlbHBlcnMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwid2lraVBsdWdpbi50c1wiLz5cblxuLyoqXG4gKiBAbW9kdWxlIFdpa2lcbiAqL1xubW9kdWxlIFdpa2kge1xuICBfbW9kdWxlLmNvbnRyb2xsZXIoXCJXaWtpLk5hdkJhckNvbnRyb2xsZXJcIiwgW1wiJHNjb3BlXCIsIFwiJGxvY2F0aW9uXCIsIFwiJHJvdXRlUGFyYW1zXCIsIFwid2lraUJyYW5jaE1lbnVcIiwgKCRzY29wZSwgJGxvY2F0aW9uLCAkcm91dGVQYXJhbXMsIHdpa2lCcmFuY2hNZW51OkJyYW5jaE1lbnUpID0+IHtcblxuICAgIC8vIFRPRE8gcmVtb3ZlIVxuICAgIHZhciBpc0ZtYyA9IGZhbHNlO1xuXG4gICAgV2lraS5pbml0U2NvcGUoJHNjb3BlLCAkcm91dGVQYXJhbXMsICRsb2NhdGlvbik7XG4gICAgdmFyIHdpa2lSZXBvc2l0b3J5ID0gJHNjb3BlLndpa2lSZXBvc2l0b3J5O1xuXG4gICAgJHNjb3BlLmJyYW5jaE1lbnVDb25maWcgPSA8VUkuTWVudUl0ZW0+e1xuICAgICAgdGl0bGU6ICRzY29wZS5icmFuY2gsXG4gICAgICBpdGVtczogW11cbiAgICB9O1xuXG4gICAgJHNjb3BlLlZpZXdNb2RlID0gV2lraS5WaWV3TW9kZTtcbiAgICAkc2NvcGUuc2V0Vmlld01vZGUgPSAobW9kZTpXaWtpLlZpZXdNb2RlKSA9PiB7XG4gICAgICAkc2NvcGUuJGVtaXQoJ1dpa2kuU2V0Vmlld01vZGUnLCBtb2RlKTtcbiAgICB9O1xuXG4gICAgd2lraUJyYW5jaE1lbnUuYXBwbHlNZW51RXh0ZW5zaW9ucygkc2NvcGUuYnJhbmNoTWVudUNvbmZpZy5pdGVtcyk7XG5cbiAgICAkc2NvcGUuJHdhdGNoKCdicmFuY2hlcycsIChuZXdWYWx1ZSwgb2xkVmFsdWUpID0+IHtcbiAgICAgIGlmIChuZXdWYWx1ZSA9PT0gb2xkVmFsdWUgfHwgIW5ld1ZhbHVlKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgICRzY29wZS5icmFuY2hNZW51Q29uZmlnLml0ZW1zID0gW107XG4gICAgICBpZiAobmV3VmFsdWUubGVuZ3RoID4gMCkge1xuICAgICAgICAkc2NvcGUuYnJhbmNoTWVudUNvbmZpZy5pdGVtcy5wdXNoKHtcbiAgICAgICAgICBoZWFkaW5nOiBpc0ZtYyA/IFwiVmVyc2lvbnNcIiA6IFwiQnJhbmNoZXNcIlxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICAgIG5ld1ZhbHVlLnNvcnQoKS5mb3JFYWNoKChpdGVtKSA9PiB7XG4gICAgICAgIHZhciBtZW51SXRlbSA9IHtcbiAgICAgICAgICB0aXRsZTogaXRlbSxcbiAgICAgICAgICBpY29uOiAnJyxcbiAgICAgICAgICBhY3Rpb246ICgpID0+IHt9XG4gICAgICAgIH07XG4gICAgICAgIGlmIChpdGVtID09PSAkc2NvcGUuYnJhbmNoKSB7XG4gICAgICAgICAgbWVudUl0ZW0uaWNvbiA9IFwiZmEgZmEtb2tcIjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBtZW51SXRlbS5hY3Rpb24gPSAoKSA9PiB7XG4gICAgICAgICAgICB2YXIgdGFyZ2V0VXJsID0gYnJhbmNoTGluayhpdGVtLCA8c3RyaW5nPiRzY29wZS5wYWdlSWQsICRsb2NhdGlvbik7XG4gICAgICAgICAgICAkbG9jYXRpb24ucGF0aChDb3JlLnRvUGF0aCh0YXJnZXRVcmwpKTtcbiAgICAgICAgICAgIENvcmUuJGFwcGx5KCRzY29wZSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgICRzY29wZS5icmFuY2hNZW51Q29uZmlnLml0ZW1zLnB1c2gobWVudUl0ZW0pO1xuICAgICAgfSk7XG4gICAgICB3aWtpQnJhbmNoTWVudS5hcHBseU1lbnVFeHRlbnNpb25zKCRzY29wZS5icmFuY2hNZW51Q29uZmlnLml0ZW1zKTtcbiAgICB9LCB0cnVlKTtcblxuICAgICRzY29wZS5jcmVhdGVMaW5rID0gKCkgPT4ge1xuICAgICAgdmFyIHBhZ2VJZCA9IFdpa2kucGFnZUlkKCRyb3V0ZVBhcmFtcywgJGxvY2F0aW9uKTtcbiAgICAgIHJldHVybiBXaWtpLmNyZWF0ZUxpbmsoJHNjb3BlLCBwYWdlSWQsICRsb2NhdGlvbik7XG4gICAgfTtcblxuICAgICRzY29wZS5zdGFydExpbmsgPSBzdGFydExpbmsoJHNjb3BlKTtcblxuICAgICRzY29wZS5zb3VyY2VMaW5rID0gKCkgPT4ge1xuICAgICAgdmFyIHBhdGggPSAkbG9jYXRpb24ucGF0aCgpO1xuICAgICAgdmFyIGFuc3dlciA9IDxzdHJpbmc+bnVsbDtcbiAgICAgIGFuZ3VsYXIuZm9yRWFjaChXaWtpLmN1c3RvbVZpZXdMaW5rcygkc2NvcGUpLCAobGluaykgPT4ge1xuICAgICAgICBpZiAocGF0aC5zdGFydHNXaXRoKGxpbmspKSB7XG4gICAgICAgICAgYW5zd2VyID0gPHN0cmluZz5Db3JlLmNyZWF0ZUhyZWYoJGxvY2F0aW9uLCBXaWtpLnN0YXJ0TGluaygkc2NvcGUpICsgXCIvdmlld1wiICsgcGF0aC5zdWJzdHJpbmcobGluay5sZW5ndGgpKVxuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIC8vIHJlbW92ZSB0aGUgZm9ybSBwYXJhbWV0ZXIgb24gdmlldy9lZGl0IGxpbmtzXG4gICAgICByZXR1cm4gKCFhbnN3ZXIgJiYgJGxvY2F0aW9uLnNlYXJjaCgpW1wiZm9ybVwiXSlcbiAgICAgICAgICAgICAgPyBDb3JlLmNyZWF0ZUhyZWYoJGxvY2F0aW9uLCBcIiNcIiArIHBhdGgsIFtcImZvcm1cIl0pXG4gICAgICAgICAgICAgIDogYW5zd2VyO1xuICAgIH07XG5cbiAgICAkc2NvcGUuaXNBY3RpdmUgPSAoaHJlZikgPT4ge1xuICAgICAgaWYgKCFocmVmKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBocmVmLmVuZHNXaXRoKCRyb3V0ZVBhcmFtc1sncGFnZSddKTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLiRvbihcIiRyb3V0ZUNoYW5nZVN1Y2Nlc3NcIiwgZnVuY3Rpb24gKGV2ZW50LCBjdXJyZW50LCBwcmV2aW91cykge1xuICAgICAgLy8gbGV0cyBkbyB0aGlzIGFzeW5jaHJvbm91c2x5IHRvIGF2b2lkIEVycm9yOiAkZGlnZXN0IGFscmVhZHkgaW4gcHJvZ3Jlc3NcbiAgICAgIHNldFRpbWVvdXQobG9hZEJyZWFkY3J1bWJzLCA1MCk7XG4gICAgfSk7XG5cbiAgICBsb2FkQnJlYWRjcnVtYnMoKTtcblxuICAgIGZ1bmN0aW9uIHN3aXRjaEZyb21WaWV3VG9DdXN0b21MaW5rKGJyZWFkY3J1bWIsIGxpbmspIHtcbiAgICAgIHZhciBocmVmID0gYnJlYWRjcnVtYi5ocmVmO1xuICAgICAgaWYgKGhyZWYpIHtcbiAgICAgICAgYnJlYWRjcnVtYi5ocmVmID0gaHJlZi5yZXBsYWNlKFwid2lraS92aWV3XCIsIGxpbmspO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGxvYWRCcmVhZGNydW1icygpIHtcbiAgICAgIHZhciBzdGFydCA9IFdpa2kuc3RhcnRMaW5rKCRzY29wZSk7XG4gICAgICB2YXIgaHJlZiA9IHN0YXJ0ICsgXCIvdmlld1wiO1xuICAgICAgJHNjb3BlLmJyZWFkY3J1bWJzID0gW1xuICAgICAgICB7aHJlZjogaHJlZiwgbmFtZTogXCJyb290XCJ9XG4gICAgICBdO1xuICAgICAgdmFyIHBhdGggPSBXaWtpLnBhZ2VJZCgkcm91dGVQYXJhbXMsICRsb2NhdGlvbik7XG4gICAgICB2YXIgYXJyYXkgPSBwYXRoID8gcGF0aC5zcGxpdChcIi9cIikgOiBbXTtcbiAgICAgIGFuZ3VsYXIuZm9yRWFjaChhcnJheSwgKG5hbWUpID0+IHtcbiAgICAgICAgaWYgKCFuYW1lLnN0YXJ0c1dpdGgoXCIvXCIpICYmICFocmVmLmVuZHNXaXRoKFwiL1wiKSkge1xuICAgICAgICAgIGhyZWYgKz0gXCIvXCI7XG4gICAgICAgIH1cbiAgICAgICAgaHJlZiArPSBXaWtpLmVuY29kZVBhdGgobmFtZSk7XG4gICAgICAgIGlmICghbmFtZS5pc0JsYW5rKCkpIHtcbiAgICAgICAgICAkc2NvcGUuYnJlYWRjcnVtYnMucHVzaCh7aHJlZjogaHJlZiwgbmFtZTogbmFtZX0pO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIC8vIGxldHMgc3dpenpsZSB0aGUgbGFzdCBvbmUgb3IgdHdvIHRvIGJlIGZvcm1UYWJsZSB2aWV3cyBpZiB0aGUgbGFzdCBvciAybmQgdG8gbGFzdFxuICAgICAgdmFyIGxvYyA9ICRsb2NhdGlvbi5wYXRoKCk7XG4gICAgICBpZiAoJHNjb3BlLmJyZWFkY3J1bWJzLmxlbmd0aCkge1xuICAgICAgICB2YXIgbGFzdCA9ICRzY29wZS5icmVhZGNydW1ic1skc2NvcGUuYnJlYWRjcnVtYnMubGVuZ3RoIC0gMV07XG4gICAgICAgIC8vIHBvc3NpYmx5IHRyaW0gYW55IHJlcXVpcmVkIGZpbGUgZXh0ZW5zaW9uc1xuICAgICAgICBsYXN0Lm5hbWUgPSBXaWtpLmhpZGVGaWxlTmFtZUV4dGVuc2lvbnMobGFzdC5uYW1lKTtcblxuICAgICAgICB2YXIgc3dpenpsZWQgPSBmYWxzZTtcbiAgICAgICAgYW5ndWxhci5mb3JFYWNoKFdpa2kuY3VzdG9tVmlld0xpbmtzKCRzY29wZSksIChsaW5rKSA9PiB7XG4gICAgICAgICAgaWYgKCFzd2l6emxlZCAmJiBsb2Muc3RhcnRzV2l0aChsaW5rKSkge1xuICAgICAgICAgICAgLy8gbGV0cyBzd2l6emxlIHRoZSB2aWV3IHRvIHRoZSBjdXJyZW50IGxpbmtcbiAgICAgICAgICAgIHN3aXRjaEZyb21WaWV3VG9DdXN0b21MaW5rKCRzY29wZS5icmVhZGNydW1icy5sYXN0KCksIENvcmUudHJpbUxlYWRpbmcobGluaywgXCIvXCIpKTtcbiAgICAgICAgICAgIHN3aXp6bGVkID0gdHJ1ZTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBpZiAoIXN3aXp6bGVkICYmICRsb2NhdGlvbi5zZWFyY2goKVtcImZvcm1cIl0pIHtcbiAgICAgICAgICB2YXIgbGFzdE5hbWUgPSAkc2NvcGUuYnJlYWRjcnVtYnMubGFzdCgpLm5hbWU7XG4gICAgICAgICAgaWYgKGxhc3ROYW1lICYmIGxhc3ROYW1lLmVuZHNXaXRoKFwiLmpzb25cIikpIHtcbiAgICAgICAgICAgIC8vIHByZXZpb3VzIGJyZWFkY3J1bWIgc2hvdWxkIGJlIGEgZm9ybVRhYmxlXG4gICAgICAgICAgICBzd2l0Y2hGcm9tVmlld1RvQ3VzdG9tTGluaygkc2NvcGUuYnJlYWRjcnVtYnNbJHNjb3BlLmJyZWFkY3J1bWJzLmxlbmd0aCAtIDJdLCBcIndpa2kvZm9ybVRhYmxlXCIpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgLypcbiAgICAgIGlmIChsb2Muc3RhcnRzV2l0aChcIi93aWtpL2hpc3RvcnlcIikgfHwgbG9jLnN0YXJ0c1dpdGgoXCIvd2lraS92ZXJzaW9uXCIpXG4gICAgICAgIHx8IGxvYy5zdGFydHNXaXRoKFwiL3dpa2kvZGlmZlwiKSB8fCBsb2Muc3RhcnRzV2l0aChcIi93aWtpL2NvbW1pdFwiKSkge1xuICAgICAgICAvLyBsZXRzIGFkZCBhIGhpc3RvcnkgdGFiXG4gICAgICAgICRzY29wZS5icmVhZGNydW1icy5wdXNoKHtocmVmOiBcIiMvd2lraS9oaXN0b3J5L1wiICsgcGF0aCwgbmFtZTogXCJIaXN0b3J5XCJ9KTtcbiAgICAgIH0gZWxzZSBpZiAoJHNjb3BlLmJyYW5jaCkge1xuICAgICAgICB2YXIgcHJlZml4ID1cIi93aWtpL2JyYW5jaC9cIiArICRzY29wZS5icmFuY2g7XG4gICAgICAgIGlmIChsb2Muc3RhcnRzV2l0aChwcmVmaXggKyBcIi9oaXN0b3J5XCIpIHx8IGxvYy5zdGFydHNXaXRoKHByZWZpeCArIFwiL3ZlcnNpb25cIilcbiAgICAgICAgICB8fCBsb2Muc3RhcnRzV2l0aChwcmVmaXggKyBcIi9kaWZmXCIpIHx8IGxvYy5zdGFydHNXaXRoKHByZWZpeCArIFwiL2NvbW1pdFwiKSkge1xuICAgICAgICAgIC8vIGxldHMgYWRkIGEgaGlzdG9yeSB0YWJcbiAgICAgICAgICAkc2NvcGUuYnJlYWRjcnVtYnMucHVzaCh7aHJlZjogXCIjL3dpa2kvYnJhbmNoL1wiICsgJHNjb3BlLmJyYW5jaCArIFwiL2hpc3RvcnkvXCIgKyBwYXRoLCBuYW1lOiBcIkhpc3RvcnlcIn0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICAqL1xuICAgICAgdmFyIG5hbWU6c3RyaW5nID0gbnVsbDtcbiAgICAgIGlmIChsb2Muc3RhcnRzV2l0aChcIi93aWtpL3ZlcnNpb25cIikpIHtcbiAgICAgICAgLy8gbGV0cyBhZGQgYSB2ZXJzaW9uIHRhYlxuICAgICAgICBuYW1lID0gKCRyb3V0ZVBhcmFtc1tcIm9iamVjdElkXCJdIHx8IFwiXCIpLnN1YnN0cmluZygwLCA2KSB8fCBcIlZlcnNpb25cIjtcbiAgICAgICAgJHNjb3BlLmJyZWFkY3J1bWJzLnB1c2goe2hyZWY6IFwiI1wiICsgbG9jLCBuYW1lOiBuYW1lfSk7XG4gICAgICB9XG4gICAgICBpZiAobG9jLnN0YXJ0c1dpdGgoXCIvd2lraS9kaWZmXCIpKSB7XG4gICAgICAgIC8vIGxldHMgYWRkIGEgdmVyc2lvbiB0YWJcbiAgICAgICAgdmFyIHYxID0gKCRyb3V0ZVBhcmFtc1tcIm9iamVjdElkXCJdIHx8IFwiXCIpLnN1YnN0cmluZygwLCA2KTtcbiAgICAgICAgdmFyIHYyID0gKCRyb3V0ZVBhcmFtc1tcImJhc2VPYmplY3RJZFwiXSB8fCBcIlwiKS5zdWJzdHJpbmcoMCwgNik7XG4gICAgICAgIG5hbWUgPSBcIkRpZmZcIjtcbiAgICAgICAgaWYgKHYxKSB7XG4gICAgICAgICAgaWYgKHYyKSB7XG4gICAgICAgICAgICBuYW1lICs9IFwiIFwiICsgdjEgKyBcIiBcIiArIHYyO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBuYW1lICs9IFwiIFwiICsgdjE7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgICRzY29wZS5icmVhZGNydW1icy5wdXNoKHtocmVmOiBcIiNcIiArIGxvYywgbmFtZTogbmFtZX0pO1xuICAgICAgfVxuICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICB9XG4gIH1dKTtcbn1cbiIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9pbmNsdWRlcy50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJ3aWtpSGVscGVycy50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJ3aWtpUGx1Z2luLnRzXCIvPlxuXG4vKipcbiAqIEBtb2R1bGUgV2lraVxuICovXG5tb2R1bGUgV2lraSB7XG5cbiAgLy8gbWFpbiBwYWdlIGNvbnRyb2xsZXJcbiAgZXhwb3J0IHZhciBWaWV3Q29udHJvbGxlciA9IF9tb2R1bGUuY29udHJvbGxlcihcIldpa2kuVmlld0NvbnRyb2xsZXJcIiwgW1wiJHNjb3BlXCIsIFwiJGxvY2F0aW9uXCIsIFwiJHJvdXRlUGFyYW1zXCIsIFwiJHJvdXRlXCIsIFwiJGh0dHBcIiwgXCIkdGltZW91dFwiLCBcIm1hcmtlZFwiLCBcImZpbGVFeHRlbnNpb25UeXBlUmVnaXN0cnlcIiwgIFwiJGNvbXBpbGVcIiwgXCIkdGVtcGxhdGVDYWNoZVwiLCBcImxvY2FsU3RvcmFnZVwiLCBcIiRpbnRlcnBvbGF0ZVwiLCBcIiRkaWFsb2dcIiwgKCRzY29wZSwgJGxvY2F0aW9uOm5nLklMb2NhdGlvblNlcnZpY2UsICRyb3V0ZVBhcmFtczpuZy5yb3V0ZS5JUm91dGVQYXJhbXNTZXJ2aWNlLCAkcm91dGU6bmcucm91dGUuSVJvdXRlU2VydmljZSwgJGh0dHA6bmcuSUh0dHBTZXJ2aWNlLCAkdGltZW91dDpuZy5JVGltZW91dFNlcnZpY2UsIG1hcmtlZCwgZmlsZUV4dGVuc2lvblR5cGVSZWdpc3RyeSwgICRjb21waWxlOm5nLklDb21waWxlU2VydmljZSwgJHRlbXBsYXRlQ2FjaGU6bmcuSVRlbXBsYXRlQ2FjaGVTZXJ2aWNlLCBsb2NhbFN0b3JhZ2UsICRpbnRlcnBvbGF0ZTpuZy5JSW50ZXJwb2xhdGVTZXJ2aWNlLCAkZGlhbG9nKSA9PiB7XG5cbiAgICAkc2NvcGUubmFtZSA9IFwiV2lraVZpZXdDb250cm9sbGVyXCI7XG5cbiAgICAvLyBUT0RPIHJlbW92ZSFcbiAgICB2YXIgaXNGbWMgPSBmYWxzZTtcblxuICAgIFdpa2kuaW5pdFNjb3BlKCRzY29wZSwgJHJvdXRlUGFyYW1zLCAkbG9jYXRpb24pO1xuICAgIHZhciB3aWtpUmVwb3NpdG9yeSA9ICRzY29wZS53aWtpUmVwb3NpdG9yeTtcblxuICAgIFNlbGVjdGlvbkhlbHBlcnMuZGVjb3JhdGUoJHNjb3BlKTtcblxuICAgICRzY29wZS5mYWJyaWNUb3BMZXZlbCA9IFwiZmFicmljL3Byb2ZpbGVzL1wiO1xuXG4gICAgJHNjb3BlLnZlcnNpb25JZCA9ICRzY29wZS5icmFuY2g7XG5cbiAgICAkc2NvcGUucGFuZVRlbXBsYXRlID0gJyc7XG5cbiAgICAkc2NvcGUucHJvZmlsZUlkID0gXCJcIjtcbiAgICAkc2NvcGUuc2hvd1Byb2ZpbGVIZWFkZXIgPSBmYWxzZTtcbiAgICAkc2NvcGUuc2hvd0FwcEhlYWRlciA9IGZhbHNlO1xuXG4gICAgJHNjb3BlLm9wZXJhdGlvbkNvdW50ZXIgPSAxO1xuICAgICRzY29wZS5yZW5hbWVEaWFsb2cgPSA8V2lraURpYWxvZz4gbnVsbDtcbiAgICAkc2NvcGUubW92ZURpYWxvZyA9IDxXaWtpRGlhbG9nPiBudWxsO1xuICAgICRzY29wZS5kZWxldGVEaWFsb2cgPSA8V2lraURpYWxvZz4gbnVsbDtcbiAgICAkc2NvcGUuaXNGaWxlID0gZmFsc2U7XG5cbiAgICAkc2NvcGUucmVuYW1lID0ge1xuICAgICAgbmV3RmlsZU5hbWU6IFwiXCJcbiAgICB9O1xuICAgICRzY29wZS5tb3ZlID0ge1xuICAgICAgbW92ZUZvbGRlcjogXCJcIlxuICAgIH07XG4gICAgJHNjb3BlLlZpZXdNb2RlID0gV2lraS5WaWV3TW9kZTtcblxuICAgIC8vIGJpbmQgZmlsdGVyIG1vZGVsIHZhbHVlcyB0byBzZWFyY2ggcGFyYW1zLi4uXG4gICAgQ29yZS5iaW5kTW9kZWxUb1NlYXJjaFBhcmFtKCRzY29wZSwgJGxvY2F0aW9uLCBcInNlYXJjaFRleHRcIiwgXCJxXCIsIFwiXCIpO1xuXG4gICAgU3RvcmFnZUhlbHBlcnMuYmluZE1vZGVsVG9Mb2NhbFN0b3JhZ2Uoe1xuICAgICAgJHNjb3BlOiAkc2NvcGUsXG4gICAgICAkbG9jYXRpb246ICRsb2NhdGlvbixcbiAgICAgIGxvY2FsU3RvcmFnZTogbG9jYWxTdG9yYWdlLFxuICAgICAgbW9kZWxOYW1lOiAnbW9kZScsXG4gICAgICBwYXJhbU5hbWU6ICd3aWtpVmlld01vZGUnLFxuICAgICAgaW5pdGlhbFZhbHVlOiBXaWtpLlZpZXdNb2RlLkxpc3QsXG4gICAgICB0bzogQ29yZS5udW1iZXJUb1N0cmluZyxcbiAgICAgIGZyb206IENvcmUucGFyc2VJbnRWYWx1ZVxuICAgIH0pO1xuXG4gICAgLy8gb25seSByZWxvYWQgdGhlIHBhZ2UgaWYgY2VydGFpbiBzZWFyY2ggcGFyYW1ldGVycyBjaGFuZ2VcbiAgICBDb3JlLnJlbG9hZFdoZW5QYXJhbWV0ZXJzQ2hhbmdlKCRyb3V0ZSwgJHNjb3BlLCAkbG9jYXRpb24sIFsnd2lraVZpZXdNb2RlJ10pO1xuXG4gICAgJHNjb3BlLmdyaWRPcHRpb25zID0ge1xuICAgICAgZGF0YTogJ2NoaWxkcmVuJyxcbiAgICAgIGRpc3BsYXlGb290ZXI6IGZhbHNlLFxuICAgICAgc2VsZWN0ZWRJdGVtczogW10sXG4gICAgICBzaG93U2VsZWN0aW9uQ2hlY2tib3g6IHRydWUsXG4gICAgICBlbmFibGVTb3J0aW5nOiBmYWxzZSxcbiAgICAgIHVzZUV4dGVybmFsU29ydGluZzogdHJ1ZSxcbiAgICAgIGNvbHVtbkRlZnM6IFtcbiAgICAgICAge1xuICAgICAgICAgIGZpZWxkOiAnbmFtZScsXG4gICAgICAgICAgZGlzcGxheU5hbWU6ICdOYW1lJyxcbiAgICAgICAgICBjZWxsVGVtcGxhdGU6ICR0ZW1wbGF0ZUNhY2hlLmdldCgnZmlsZUNlbGxUZW1wbGF0ZS5odG1sJyksXG4gICAgICAgICAgaGVhZGVyQ2VsbFRlbXBsYXRlOiAkdGVtcGxhdGVDYWNoZS5nZXQoJ2ZpbGVDb2x1bW5UZW1wbGF0ZS5odG1sJylcbiAgICAgICAgfVxuICAgICAgXVxuICAgIH07XG5cbiAgICAkc2NvcGUuJG9uKCdXaWtpLlNldFZpZXdNb2RlJywgKCRldmVudCwgbW9kZTpXaWtpLlZpZXdNb2RlKSA9PiB7XG4gICAgICAkc2NvcGUubW9kZSA9IG1vZGU7XG4gICAgICBzd2l0Y2gobW9kZSkge1xuICAgICAgICBjYXNlIFZpZXdNb2RlLkxpc3Q6XG4gICAgICAgICAgbG9nLmRlYnVnKFwiTGlzdCB2aWV3IG1vZGVcIik7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgVmlld01vZGUuSWNvbjpcbiAgICAgICAgICBsb2cuZGVidWcoXCJJY29uIHZpZXcgbW9kZVwiKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAkc2NvcGUubW9kZSA9IFZpZXdNb2RlLkxpc3Q7XG4gICAgICAgICAgbG9nLmRlYnVnKFwiRGVmYXVsdGluZyB0byBsaXN0IHZpZXcgbW9kZVwiKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9KTtcblxuXG4gICAgJHNjb3BlLmNoaWxkQWN0aW9ucyA9IFtdO1xuXG4gICAgdmFyIG1heWJlVXBkYXRlVmlldyA9IENvcmUudGhyb3R0bGVkKHVwZGF0ZVZpZXcsIDEwMDApO1xuXG4gICAgJHNjb3BlLm1hcmtlZCA9ICh0ZXh0KSA9PiB7XG4gICAgICBpZiAodGV4dCkge1xuICAgICAgICByZXR1cm4gbWFya2VkKHRleHQpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuICcnO1xuICAgICAgfVxuICAgIH07XG5cblxuICAgICRzY29wZS4kb24oJ3dpa2lCcmFuY2hlc1VwZGF0ZWQnLCBmdW5jdGlvbiAoKSB7XG4gICAgICB1cGRhdGVWaWV3KCk7XG4gICAgfSk7XG5cbiAgICAkc2NvcGUuY3JlYXRlRGFzaGJvYXJkTGluayA9ICgpID0+IHtcbiAgICAgIHZhciBocmVmID0gJy93aWtpL2JyYW5jaC86YnJhbmNoL3ZpZXcvKnBhZ2UnO1xuICAgICAgdmFyIHBhZ2UgPSAkcm91dGVQYXJhbXNbJ3BhZ2UnXTtcbiAgICAgIHZhciB0aXRsZSA9IHBhZ2UgPyBwYWdlLnNwbGl0KFwiL1wiKS5sYXN0KCkgOiBudWxsO1xuICAgICAgdmFyIHNpemUgPSBhbmd1bGFyLnRvSnNvbih7XG4gICAgICAgIHNpemVfeDogMixcbiAgICAgICAgc2l6ZV95OiAyXG4gICAgICB9KTtcbiAgICAgIHZhciBhbnN3ZXIgPSBcIiMvZGFzaGJvYXJkL2FkZD90YWI9ZGFzaGJvYXJkXCIgK1xuICAgICAgICBcIiZocmVmPVwiICsgZW5jb2RlVVJJQ29tcG9uZW50KGhyZWYpICtcbiAgICAgICAgXCImc2l6ZT1cIiArIGVuY29kZVVSSUNvbXBvbmVudChzaXplKSArXG4gICAgICAgIFwiJnJvdXRlUGFyYW1zPVwiICsgZW5jb2RlVVJJQ29tcG9uZW50KGFuZ3VsYXIudG9Kc29uKCRyb3V0ZVBhcmFtcykpO1xuICAgICAgaWYgKHRpdGxlKSB7XG4gICAgICAgIGFuc3dlciArPSBcIiZ0aXRsZT1cIiArIGVuY29kZVVSSUNvbXBvbmVudCh0aXRsZSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gYW5zd2VyO1xuICAgIH07XG5cbiAgICAkc2NvcGUuZGlzcGxheUNsYXNzID0gKCkgPT4ge1xuICAgICAgaWYgKCEkc2NvcGUuY2hpbGRyZW4gfHwgJHNjb3BlLmNoaWxkcmVuLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICByZXR1cm4gXCJcIjtcbiAgICAgIH1cbiAgICAgIHJldHVybiBcInNwYW45XCI7XG4gICAgfTtcblxuICAgICRzY29wZS5wYXJlbnRMaW5rID0gKCkgPT4ge1xuICAgICAgdmFyIHN0YXJ0ID0gc3RhcnRMaW5rKCRzY29wZSk7XG4gICAgICB2YXIgcHJlZml4ID0gc3RhcnQgKyBcIi92aWV3XCI7XG4gICAgICAvL2xvZy5kZWJ1ZyhcInBhZ2VJZDogXCIsICRzY29wZS5wYWdlSWQpXG4gICAgICB2YXIgcGFydHMgPSAkc2NvcGUucGFnZUlkLnNwbGl0KFwiL1wiKTtcbiAgICAgIC8vbG9nLmRlYnVnKFwicGFydHM6IFwiLCBwYXJ0cyk7XG4gICAgICB2YXIgcGF0aCA9IFwiL1wiICsgcGFydHMuZmlyc3QocGFydHMubGVuZ3RoIC0gMSkuam9pbihcIi9cIik7XG4gICAgICAvL2xvZy5kZWJ1ZyhcInBhdGg6IFwiLCBwYXRoKTtcbiAgICAgIHJldHVybiBDb3JlLmNyZWF0ZUhyZWYoJGxvY2F0aW9uLCBwcmVmaXggKyBwYXRoLCBbXSk7XG4gICAgfTtcblxuXG4gICAgJHNjb3BlLmNoaWxkTGluayA9IChjaGlsZCkgPT4ge1xuICAgICAgdmFyIHN0YXJ0ID0gc3RhcnRMaW5rKCRzY29wZSk7XG4gICAgICB2YXIgcHJlZml4ID0gc3RhcnQgKyBcIi92aWV3XCI7XG4gICAgICB2YXIgcG9zdEZpeCA9IFwiXCI7XG4gICAgICB2YXIgcGF0aCA9IFdpa2kuZW5jb2RlUGF0aChjaGlsZC5wYXRoKTtcbiAgICAgIGlmIChjaGlsZC5kaXJlY3RvcnkpIHtcbiAgICAgICAgLy8gaWYgd2UgYXJlIGEgZm9sZGVyIHdpdGggdGhlIHNhbWUgbmFtZSBhcyBhIGZvcm0gZmlsZSwgbGV0cyBhZGQgYSBmb3JtIHBhcmFtLi4uXG4gICAgICAgIHZhciBmb3JtUGF0aCA9IHBhdGggKyBcIi5mb3JtXCI7XG4gICAgICAgIHZhciBjaGlsZHJlbiA9ICRzY29wZS5jaGlsZHJlbjtcbiAgICAgICAgaWYgKGNoaWxkcmVuKSB7XG4gICAgICAgICAgdmFyIGZvcm1GaWxlID0gY2hpbGRyZW4uZmluZCgoY2hpbGQpID0+IHtcbiAgICAgICAgICAgIHJldHVybiBjaGlsZFsncGF0aCddID09PSBmb3JtUGF0aDtcbiAgICAgICAgICB9KTtcbiAgICAgICAgICBpZiAoZm9ybUZpbGUpIHtcbiAgICAgICAgICAgIHByZWZpeCA9IHN0YXJ0ICsgXCIvZm9ybVRhYmxlXCI7XG4gICAgICAgICAgICBwb3N0Rml4ID0gXCI/Zm9ybT1cIiArIGZvcm1QYXRoO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIHhtbE5hbWVzcGFjZXMgPSBjaGlsZC54bWxOYW1lc3BhY2VzO1xuICAgICAgICBpZiAoeG1sTmFtZXNwYWNlcyAmJiB4bWxOYW1lc3BhY2VzLmxlbmd0aCkge1xuICAgICAgICAgIGlmICh4bWxOYW1lc3BhY2VzLmFueSgobnMpID0+IFdpa2kuY2FtZWxOYW1lc3BhY2VzLmFueShucykpKSB7XG4gICAgICAgICAgICBwcmVmaXggPSBzdGFydCArIFwiL2NhbWVsL2NhbnZhc1wiO1xuICAgICAgICAgIH0gZWxzZSBpZiAoeG1sTmFtZXNwYWNlcy5hbnkoKG5zKSA9PiBXaWtpLmRvemVyTmFtZXNwYWNlcy5hbnkobnMpKSkge1xuICAgICAgICAgICAgcHJlZml4ID0gc3RhcnQgKyBcIi9kb3plci9tYXBwaW5nc1wiO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBsb2cuZGVidWcoXCJjaGlsZCBcIiArIHBhdGggKyBcIiBoYXMgbmFtZXNwYWNlcyBcIiArIHhtbE5hbWVzcGFjZXMpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoY2hpbGQucGF0aC5lbmRzV2l0aChcIi5mb3JtXCIpKSB7XG4gICAgICAgICAgcG9zdEZpeCA9IFwiP2Zvcm09L1wiO1xuICAgICAgICB9IGVsc2UgaWYgKFdpa2kuaXNJbmRleFBhZ2UoY2hpbGQucGF0aCkpIHtcbiAgICAgICAgICAvLyBsZXRzIGRlZmF1bHQgdG8gYm9vayB2aWV3IG9uIGluZGV4IHBhZ2VzXG4gICAgICAgICAgcHJlZml4ID0gc3RhcnQgKyBcIi9ib29rXCI7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiBDb3JlLmNyZWF0ZUhyZWYoJGxvY2F0aW9uLCBVcmxIZWxwZXJzLmpvaW4ocHJlZml4LCBwYXRoKSArIHBvc3RGaXgsIFtcImZvcm1cIl0pO1xuICAgIH07XG5cbiAgICAkc2NvcGUuZmlsZU5hbWUgPSAoZW50aXR5KSA9PiB7XG4gICAgICByZXR1cm4gV2lraS5oaWRlRmlsZU5hbWVFeHRlbnNpb25zKGVudGl0eS5kaXNwbGF5TmFtZSB8fCBlbnRpdHkubmFtZSk7XG4gICAgfTtcblxuICAgICRzY29wZS5maWxlQ2xhc3MgPSAoZW50aXR5KSA9PiB7XG4gICAgICBpZiAoZW50aXR5Lm5hbWUuaGFzKFwiLnByb2ZpbGVcIikpIHtcbiAgICAgICAgcmV0dXJuIFwiZ3JlZW5cIjtcbiAgICAgIH1cbiAgICAgIHJldHVybiBcIlwiO1xuICAgIH07XG5cbiAgICAkc2NvcGUuZmlsZUljb25IdG1sID0gKGVudGl0eSkgPT4ge1xuICAgICAgcmV0dXJuIFdpa2kuZmlsZUljb25IdG1sKGVudGl0eSk7XG4gICAgfTtcblxuXG4gICAgJHNjb3BlLmZvcm1hdCA9IFdpa2kuZmlsZUZvcm1hdCgkc2NvcGUucGFnZUlkLCBmaWxlRXh0ZW5zaW9uVHlwZVJlZ2lzdHJ5KTtcbiAgICB2YXIgb3B0aW9ucyA9IHtcbiAgICAgIHJlYWRPbmx5OiB0cnVlLFxuICAgICAgbW9kZToge1xuICAgICAgICBuYW1lOiAkc2NvcGUuZm9ybWF0XG4gICAgICB9XG4gICAgfTtcbiAgICAkc2NvcGUuY29kZU1pcnJvck9wdGlvbnMgPSBDb2RlRWRpdG9yLmNyZWF0ZUVkaXRvclNldHRpbmdzKG9wdGlvbnMpO1xuXG4gICAgJHNjb3BlLmVkaXRMaW5rID0gKCkgPT4ge1xuICAgICAgdmFyIHBhZ2VOYW1lID0gKCRzY29wZS5kaXJlY3RvcnkpID8gJHNjb3BlLnJlYWRNZVBhdGggOiAkc2NvcGUucGFnZUlkO1xuICAgICAgcmV0dXJuIChwYWdlTmFtZSkgPyBXaWtpLmVkaXRMaW5rKCRzY29wZSwgcGFnZU5hbWUsICRsb2NhdGlvbikgOiBudWxsO1xuICAgIH07XG5cbiAgICAkc2NvcGUuYnJhbmNoTGluayA9IChicmFuY2gpID0+IHtcbiAgICAgIGlmIChicmFuY2gpIHtcbiAgICAgICAgcmV0dXJuIFdpa2kuYnJhbmNoTGluayhicmFuY2gsICRzY29wZS5wYWdlSWQsICRsb2NhdGlvbik7XG4gICAgICB9XG4gICAgICByZXR1cm4gbnVsbFxuICAgIH07XG5cbiAgICAkc2NvcGUuaGlzdG9yeUxpbmsgPSBcIiMvd2lraVwiICsgKCRzY29wZS5icmFuY2ggPyBcIi9icmFuY2gvXCIgKyAkc2NvcGUuYnJhbmNoIDogXCJcIikgKyBcIi9oaXN0b3J5L1wiICsgJHNjb3BlLnBhZ2VJZDtcblxuICAgICRzY29wZS4kd2F0Y2goJ3dvcmtzcGFjZS50cmVlJywgZnVuY3Rpb24gKCkge1xuICAgICAgaWYgKCEkc2NvcGUuZ2l0KSB7XG4gICAgICAgIC8vIGxldHMgZG8gdGhpcyBhc3luY2hyb25vdXNseSB0byBhdm9pZCBFcnJvcjogJGRpZ2VzdCBhbHJlYWR5IGluIHByb2dyZXNzXG4gICAgICAgIC8vbG9nLmluZm8oXCJSZWxvYWRpbmcgdmlldyBhcyB0aGUgdHJlZSBjaGFuZ2VkIGFuZCB3ZSBoYXZlIGEgZ2l0IG1iZWFuIG5vd1wiKTtcbiAgICAgICAgc2V0VGltZW91dChtYXliZVVwZGF0ZVZpZXcsIDUwKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgICRzY29wZS4kb24oXCIkcm91dGVDaGFuZ2VTdWNjZXNzXCIsIGZ1bmN0aW9uIChldmVudCwgY3VycmVudCwgcHJldmlvdXMpIHtcbiAgICAgIC8vIGxldHMgZG8gdGhpcyBhc3luY2hyb25vdXNseSB0byBhdm9pZCBFcnJvcjogJGRpZ2VzdCBhbHJlYWR5IGluIHByb2dyZXNzXG4gICAgICAvL2xvZy5pbmZvKFwiUmVsb2FkaW5nIHZpZXcgZHVlIHRvICRyb3V0ZUNoYW5nZVN1Y2Nlc3NcIik7XG4gICAgICBzZXRUaW1lb3V0KG1heWJlVXBkYXRlVmlldywgNTApO1xuICAgIH0pO1xuXG5cbiAgICAkc2NvcGUub3BlbkRlbGV0ZURpYWxvZyA9ICgpID0+IHtcbiAgICAgIGlmICgkc2NvcGUuZ3JpZE9wdGlvbnMuc2VsZWN0ZWRJdGVtcy5sZW5ndGgpIHtcbiAgICAgICAgJHNjb3BlLnNlbGVjdGVkRmlsZUh0bWwgPSBcIjx1bD5cIiArICRzY29wZS5ncmlkT3B0aW9ucy5zZWxlY3RlZEl0ZW1zLm1hcChmaWxlID0+IFwiPGxpPlwiICsgZmlsZS5uYW1lICsgXCI8L2xpPlwiKS5zb3J0KCkuam9pbihcIlwiKSArIFwiPC91bD5cIjtcblxuICAgICAgICBpZiAoJHNjb3BlLmdyaWRPcHRpb25zLnNlbGVjdGVkSXRlbXMuZmluZCgoZmlsZSkgPT4geyByZXR1cm4gZmlsZS5uYW1lLmVuZHNXaXRoKFwiLnByb2ZpbGVcIil9KSkge1xuICAgICAgICAgICRzY29wZS5kZWxldGVXYXJuaW5nID0gXCJZb3UgYXJlIGFib3V0IHRvIGRlbGV0ZSBkb2N1bWVudChzKSB3aGljaCByZXByZXNlbnQgRmFicmljOCBwcm9maWxlKHMpLiBUaGlzIHJlYWxseSBjYW4ndCBiZSB1bmRvbmUhIFdpa2kgb3BlcmF0aW9ucyBhcmUgbG93IGxldmVsIGFuZCBtYXkgbGVhZCB0byBub24tZnVuY3Rpb25hbCBzdGF0ZSBvZiBGYWJyaWMuXCI7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgJHNjb3BlLmRlbGV0ZVdhcm5pbmcgPSBudWxsO1xuICAgICAgICB9XG5cbiAgICAgICAgJHNjb3BlLmRlbGV0ZURpYWxvZyA9IFdpa2kuZ2V0RGVsZXRlRGlhbG9nKCRkaWFsb2csIDxXaWtpLkRlbGV0ZURpYWxvZ09wdGlvbnM+e1xuICAgICAgICAgIGNhbGxiYWNrczogKCkgPT4geyByZXR1cm4gJHNjb3BlLmRlbGV0ZUFuZENsb3NlRGlhbG9nOyB9LFxuICAgICAgICAgIHNlbGVjdGVkRmlsZUh0bWw6ICgpID0+ICB7IHJldHVybiAkc2NvcGUuc2VsZWN0ZWRGaWxlSHRtbDsgfSxcbiAgICAgICAgICB3YXJuaW5nOiAoKSA9PiB7IHJldHVybiAkc2NvcGUuZGVsZXRlV2FybmluZzsgfVxuICAgICAgICB9KTtcblxuICAgICAgICAkc2NvcGUuZGVsZXRlRGlhbG9nLm9wZW4oKTtcblxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbG9nLmRlYnVnKFwiTm8gaXRlbXMgc2VsZWN0ZWQgcmlnaHQgbm93ISBcIiArICRzY29wZS5ncmlkT3B0aW9ucy5zZWxlY3RlZEl0ZW1zKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgJHNjb3BlLmRlbGV0ZUFuZENsb3NlRGlhbG9nID0gKCkgPT4ge1xuICAgICAgdmFyIGZpbGVzID0gJHNjb3BlLmdyaWRPcHRpb25zLnNlbGVjdGVkSXRlbXM7XG4gICAgICB2YXIgZmlsZUNvdW50ID0gZmlsZXMubGVuZ3RoO1xuICAgICAgbG9nLmRlYnVnKFwiRGVsZXRpbmcgc2VsZWN0aW9uOiBcIiArIGZpbGVzKTtcblxuICAgICAgdmFyIHBhdGhzVG9EZWxldGUgPSBbXTtcbiAgICAgIGFuZ3VsYXIuZm9yRWFjaChmaWxlcywgKGZpbGUsIGlkeCkgPT4ge1xuICAgICAgICB2YXIgcGF0aCA9IFVybEhlbHBlcnMuam9pbigkc2NvcGUucGFnZUlkLCBmaWxlLm5hbWUpO1xuICAgICAgICBwYXRoc1RvRGVsZXRlLnB1c2gocGF0aCk7XG4gICAgICB9KTtcblxuICAgICAgbG9nLmRlYnVnKFwiQWJvdXQgdG8gZGVsZXRlIFwiICsgcGF0aHNUb0RlbGV0ZSk7XG4gICAgICAkc2NvcGUuZ2l0ID0gd2lraVJlcG9zaXRvcnkucmVtb3ZlUGFnZXMoJHNjb3BlLmJyYW5jaCwgcGF0aHNUb0RlbGV0ZSwgbnVsbCwgKHJlc3VsdCkgPT4ge1xuICAgICAgICAkc2NvcGUuZ3JpZE9wdGlvbnMuc2VsZWN0ZWRJdGVtcyA9IFtdO1xuICAgICAgICB2YXIgbWVzc2FnZSA9IENvcmUubWF5YmVQbHVyYWwoZmlsZUNvdW50LCBcImRvY3VtZW50XCIpO1xuICAgICAgICBDb3JlLm5vdGlmaWNhdGlvbihcInN1Y2Nlc3NcIiwgXCJEZWxldGVkIFwiICsgbWVzc2FnZSk7XG4gICAgICAgIENvcmUuJGFwcGx5KCRzY29wZSk7XG4gICAgICAgIHVwZGF0ZVZpZXcoKTtcbiAgICAgIH0pO1xuICAgICAgJHNjb3BlLmRlbGV0ZURpYWxvZy5jbG9zZSgpO1xuICAgIH07XG5cbiAgICAkc2NvcGUuJHdhdGNoKFwicmVuYW1lLm5ld0ZpbGVOYW1lXCIsICgpID0+IHtcbiAgICAgIC8vIGlnbm9yZSBlcnJvcnMgaWYgdGhlIGZpbGUgaXMgdGhlIHNhbWUgYXMgdGhlIHJlbmFtZSBmaWxlIVxuICAgICAgdmFyIHBhdGggPSBnZXRSZW5hbWVGaWxlUGF0aCgpO1xuICAgICAgaWYgKCRzY29wZS5vcmlnaW5hbFJlbmFtZUZpbGVQYXRoID09PSBwYXRoKSB7XG4gICAgICAgICRzY29wZS5maWxlRXhpc3RzID0geyBleGlzdHM6IGZhbHNlLCBuYW1lOiBudWxsIH07XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjaGVja0ZpbGVFeGlzdHMocGF0aCk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICAkc2NvcGUucmVuYW1lQW5kQ2xvc2VEaWFsb2cgPSAoKSA9PiB7XG4gICAgICBpZiAoJHNjb3BlLmdyaWRPcHRpb25zLnNlbGVjdGVkSXRlbXMubGVuZ3RoKSB7XG4gICAgICAgIHZhciBzZWxlY3RlZCA9ICRzY29wZS5ncmlkT3B0aW9ucy5zZWxlY3RlZEl0ZW1zWzBdO1xuICAgICAgICB2YXIgbmV3UGF0aCA9IGdldFJlbmFtZUZpbGVQYXRoKCk7XG4gICAgICAgIGlmIChzZWxlY3RlZCAmJiBuZXdQYXRoKSB7XG4gICAgICAgICAgdmFyIG9sZE5hbWUgPSBzZWxlY3RlZC5uYW1lO1xuICAgICAgICAgIHZhciBuZXdOYW1lID0gV2lraS5maWxlTmFtZShuZXdQYXRoKTtcbiAgICAgICAgICB2YXIgb2xkUGF0aCA9IFVybEhlbHBlcnMuam9pbigkc2NvcGUucGFnZUlkLCBvbGROYW1lKTtcbiAgICAgICAgICBsb2cuZGVidWcoXCJBYm91dCB0byByZW5hbWUgZmlsZSBcIiArIG9sZFBhdGggKyBcIiB0byBcIiArIG5ld1BhdGgpO1xuICAgICAgICAgICRzY29wZS5naXQgPSB3aWtpUmVwb3NpdG9yeS5yZW5hbWUoJHNjb3BlLmJyYW5jaCwgb2xkUGF0aCwgbmV3UGF0aCwgbnVsbCwgKHJlc3VsdCkgPT4ge1xuICAgICAgICAgICAgQ29yZS5ub3RpZmljYXRpb24oXCJzdWNjZXNzXCIsIFwiUmVuYW1lZCBmaWxlIHRvICBcIiArIG5ld05hbWUpO1xuICAgICAgICAgICAgJHNjb3BlLmdyaWRPcHRpb25zLnNlbGVjdGVkSXRlbXMuc3BsaWNlKDAsIDEpO1xuICAgICAgICAgICAgJHNjb3BlLnJlbmFtZURpYWxvZy5jbG9zZSgpO1xuICAgICAgICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICAgICAgICAgIHVwZGF0ZVZpZXcoKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgJHNjb3BlLnJlbmFtZURpYWxvZy5jbG9zZSgpO1xuICAgIH07XG5cbiAgICAkc2NvcGUub3BlblJlbmFtZURpYWxvZyA9ICgpID0+IHtcbiAgICAgIHZhciBuYW1lID0gbnVsbDtcbiAgICAgIGlmICgkc2NvcGUuZ3JpZE9wdGlvbnMuc2VsZWN0ZWRJdGVtcy5sZW5ndGgpIHtcbiAgICAgICAgdmFyIHNlbGVjdGVkID0gJHNjb3BlLmdyaWRPcHRpb25zLnNlbGVjdGVkSXRlbXNbMF07XG4gICAgICAgIG5hbWUgPSBzZWxlY3RlZC5uYW1lO1xuICAgICAgfVxuICAgICAgaWYgKG5hbWUpIHtcbiAgICAgICAgJHNjb3BlLnJlbmFtZS5uZXdGaWxlTmFtZSA9IG5hbWU7XG4gICAgICAgICRzY29wZS5vcmlnaW5hbFJlbmFtZUZpbGVQYXRoID0gZ2V0UmVuYW1lRmlsZVBhdGgoKTtcblxuICAgICAgICAkc2NvcGUucmVuYW1lRGlhbG9nID0gV2lraS5nZXRSZW5hbWVEaWFsb2coJGRpYWxvZywgPFdpa2kuUmVuYW1lRGlhbG9nT3B0aW9ucz57XG4gICAgICAgICAgcmVuYW1lOiAoKSA9PiB7ICByZXR1cm4gJHNjb3BlLnJlbmFtZTsgfSxcbiAgICAgICAgICBmaWxlRXhpc3RzOiAoKSA9PiB7IHJldHVybiAkc2NvcGUuZmlsZUV4aXN0czsgfSxcbiAgICAgICAgICBmaWxlTmFtZTogKCkgPT4geyByZXR1cm4gJHNjb3BlLmZpbGVOYW1lOyB9LFxuICAgICAgICAgIGNhbGxiYWNrczogKCkgPT4geyByZXR1cm4gJHNjb3BlLnJlbmFtZUFuZENsb3NlRGlhbG9nOyB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgICRzY29wZS5yZW5hbWVEaWFsb2cub3BlbigpO1xuXG4gICAgICAgICR0aW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAkKCcjcmVuYW1lRmlsZU5hbWUnKS5mb2N1cygpO1xuICAgICAgICB9LCA1MCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBsb2cuZGVidWcoXCJObyBpdGVtcyBzZWxlY3RlZCByaWdodCBub3chIFwiICsgJHNjb3BlLmdyaWRPcHRpb25zLnNlbGVjdGVkSXRlbXMpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICAkc2NvcGUubW92ZUFuZENsb3NlRGlhbG9nID0gKCkgPT4ge1xuICAgICAgdmFyIGZpbGVzID0gJHNjb3BlLmdyaWRPcHRpb25zLnNlbGVjdGVkSXRlbXM7XG4gICAgICB2YXIgZmlsZUNvdW50ID0gZmlsZXMubGVuZ3RoO1xuICAgICAgdmFyIG1vdmVGb2xkZXIgPSAkc2NvcGUubW92ZS5tb3ZlRm9sZGVyO1xuICAgICAgdmFyIG9sZEZvbGRlcjpzdHJpbmcgPSAkc2NvcGUucGFnZUlkO1xuICAgICAgaWYgKG1vdmVGb2xkZXIgJiYgZmlsZUNvdW50ICYmIG1vdmVGb2xkZXIgIT09IG9sZEZvbGRlcikge1xuICAgICAgICBsb2cuZGVidWcoXCJNb3ZpbmcgXCIgKyBmaWxlQ291bnQgKyBcIiBmaWxlKHMpIHRvIFwiICsgbW92ZUZvbGRlcik7XG4gICAgICAgIGFuZ3VsYXIuZm9yRWFjaChmaWxlcywgKGZpbGUsIGlkeCkgPT4ge1xuICAgICAgICAgIHZhciBvbGRQYXRoID0gb2xkRm9sZGVyICsgXCIvXCIgKyBmaWxlLm5hbWU7XG4gICAgICAgICAgdmFyIG5ld1BhdGggPSBtb3ZlRm9sZGVyICsgXCIvXCIgKyBmaWxlLm5hbWU7XG4gICAgICAgICAgbG9nLmRlYnVnKFwiQWJvdXQgdG8gbW92ZSBcIiArIG9sZFBhdGggKyBcIiB0byBcIiArIG5ld1BhdGgpO1xuICAgICAgICAgICRzY29wZS5naXQgPSB3aWtpUmVwb3NpdG9yeS5yZW5hbWUoJHNjb3BlLmJyYW5jaCwgb2xkUGF0aCwgbmV3UGF0aCwgbnVsbCwgKHJlc3VsdCkgPT4ge1xuICAgICAgICAgICAgaWYgKGlkeCArIDEgPT09IGZpbGVDb3VudCkge1xuICAgICAgICAgICAgICAkc2NvcGUuZ3JpZE9wdGlvbnMuc2VsZWN0ZWRJdGVtcy5zcGxpY2UoMCwgZmlsZUNvdW50KTtcbiAgICAgICAgICAgICAgdmFyIG1lc3NhZ2UgPSBDb3JlLm1heWJlUGx1cmFsKGZpbGVDb3VudCwgXCJkb2N1bWVudFwiKTtcbiAgICAgICAgICAgICAgQ29yZS5ub3RpZmljYXRpb24oXCJzdWNjZXNzXCIsIFwiTW92ZWQgXCIgKyBtZXNzYWdlICsgXCIgdG8gXCIgKyBuZXdQYXRoKTtcbiAgICAgICAgICAgICAgJHNjb3BlLm1vdmVEaWFsb2cuY2xvc2UoKTtcbiAgICAgICAgICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICAgICAgICAgICAgdXBkYXRlVmlldygpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICAgICRzY29wZS5tb3ZlRGlhbG9nLmNsb3NlKCk7XG4gICAgfTtcblxuICAgICRzY29wZS5mb2xkZXJOYW1lcyA9ICh0ZXh0KSA9PiB7XG4gICAgICByZXR1cm4gd2lraVJlcG9zaXRvcnkuY29tcGxldGVQYXRoKCRzY29wZS5icmFuY2gsIHRleHQsIHRydWUsIG51bGwpO1xuICAgIH07XG5cbiAgICAkc2NvcGUub3Blbk1vdmVEaWFsb2cgPSAoKSA9PiB7XG4gICAgICBpZiAoJHNjb3BlLmdyaWRPcHRpb25zLnNlbGVjdGVkSXRlbXMubGVuZ3RoKSB7XG4gICAgICAgICRzY29wZS5tb3ZlLm1vdmVGb2xkZXIgPSAkc2NvcGUucGFnZUlkO1xuXG4gICAgICAgICRzY29wZS5tb3ZlRGlhbG9nID0gV2lraS5nZXRNb3ZlRGlhbG9nKCRkaWFsb2csIDxXaWtpLk1vdmVEaWFsb2dPcHRpb25zPntcbiAgICAgICAgICBtb3ZlOiAoKSA9PiB7ICByZXR1cm4gJHNjb3BlLm1vdmU7IH0sXG4gICAgICAgICAgZm9sZGVyTmFtZXM6ICgpID0+IHsgcmV0dXJuICRzY29wZS5mb2xkZXJOYW1lczsgfSxcbiAgICAgICAgICBjYWxsYmFja3M6ICgpID0+IHsgcmV0dXJuICRzY29wZS5tb3ZlQW5kQ2xvc2VEaWFsb2c7IH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgJHNjb3BlLm1vdmVEaWFsb2cub3BlbigpO1xuXG4gICAgICAgICR0aW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAkKCcjbW92ZUZvbGRlcicpLmZvY3VzKCk7XG4gICAgICAgIH0sIDUwKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGxvZy5kZWJ1ZyhcIk5vIGl0ZW1zIHNlbGVjdGVkIHJpZ2h0IG5vdyEgXCIgKyAkc2NvcGUuZ3JpZE9wdGlvbnMuc2VsZWN0ZWRJdGVtcyk7XG4gICAgICB9XG4gICAgfTtcblxuXG4gICAgc2V0VGltZW91dChtYXliZVVwZGF0ZVZpZXcsIDUwKTtcblxuICAgIGZ1bmN0aW9uIGlzRGlmZlZpZXcoKSB7XG4gICAgICByZXR1cm4gJHJvdXRlUGFyYW1zW1wiZGlmZk9iamVjdElkMVwiXSB8fCAkcm91dGVQYXJhbXNbXCJkaWZmT2JqZWN0SWQyXCJdID8gdHJ1ZSA6IGZhbHNlXG4gICAgfVxuXG4gICAgZnVuY3Rpb24gdXBkYXRlVmlldygpIHtcbiAgICAgICAgLy8gVE9ETyByZW1vdmUhXG4gICAgICAgIHZhciBqb2xva2lhID0gbnVsbDtcblxuXG4gICAgICBpZiAoaXNEaWZmVmlldygpKSB7XG4gICAgICAgIHZhciBiYXNlT2JqZWN0SWQgPSAkcm91dGVQYXJhbXNbXCJkaWZmT2JqZWN0SWQyXCJdO1xuICAgICAgICAkc2NvcGUuZ2l0ID0gd2lraVJlcG9zaXRvcnkuZGlmZigkc2NvcGUub2JqZWN0SWQsIGJhc2VPYmplY3RJZCwgJHNjb3BlLnBhZ2VJZCwgb25GaWxlRGV0YWlscyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAkc2NvcGUuZ2l0ID0gd2lraVJlcG9zaXRvcnkuZ2V0UGFnZSgkc2NvcGUuYnJhbmNoLCAkc2NvcGUucGFnZUlkLCAkc2NvcGUub2JqZWN0SWQsIG9uRmlsZURldGFpbHMpO1xuICAgICAgfVxuICAgICAgV2lraS5sb2FkQnJhbmNoZXMoam9sb2tpYSwgd2lraVJlcG9zaXRvcnksICRzY29wZSwgaXNGbWMpO1xuICAgIH1cblxuICAgICRzY29wZS51cGRhdGVWaWV3ID0gdXBkYXRlVmlldztcblxuICAgIGZ1bmN0aW9uIHZpZXdDb250ZW50cyhwYWdlTmFtZSwgY29udGVudHMpIHtcbiAgICAgICRzY29wZS5zb3VyY2VWaWV3ID0gbnVsbDtcblxuICAgICAgdmFyIGZvcm1hdDpzdHJpbmcgPSBudWxsO1xuICAgICAgaWYgKGlzRGlmZlZpZXcoKSkge1xuICAgICAgICBmb3JtYXQgPSBcImRpZmZcIjtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGZvcm1hdCA9IFdpa2kuZmlsZUZvcm1hdChwYWdlTmFtZSwgZmlsZUV4dGVuc2lvblR5cGVSZWdpc3RyeSkgfHwgJHNjb3BlLmZvcm1hdDtcbiAgICAgIH1cbiAgICAgIGxvZy5kZWJ1ZyhcIkZpbGUgZm9ybWF0OiBcIiwgZm9ybWF0KTtcbiAgICAgIHN3aXRjaCAoZm9ybWF0KSB7XG4gICAgICAgIGNhc2UgXCJpbWFnZVwiOlxuICAgICAgICAgIHZhciBpbWFnZVVSTCA9ICdnaXQvJyArICRzY29wZS5icmFuY2g7XG4gICAgICAgICAgbG9nLmRlYnVnKFwiJHNjb3BlOiBcIiwgJHNjb3BlKTtcbiAgICAgICAgICBpbWFnZVVSTCA9IFVybEhlbHBlcnMuam9pbihpbWFnZVVSTCwgJHNjb3BlLnBhZ2VJZCk7XG4gICAgICAgICAgdmFyIGludGVycG9sYXRlRnVuYyA9ICRpbnRlcnBvbGF0ZSgkdGVtcGxhdGVDYWNoZS5nZXQoXCJpbWFnZVRlbXBsYXRlLmh0bWxcIikpO1xuICAgICAgICAgICRzY29wZS5odG1sID0gaW50ZXJwb2xhdGVGdW5jKHtcbiAgICAgICAgICAgIGltYWdlVVJMOiBpbWFnZVVSTFxuICAgICAgICAgIH0pO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIFwibWFya2Rvd25cIjpcbiAgICAgICAgICAkc2NvcGUuaHRtbCA9IGNvbnRlbnRzID8gbWFya2VkKGNvbnRlbnRzKSA6IFwiXCI7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgXCJqYXZhc2NyaXB0XCI6XG4gICAgICAgICAgdmFyIGZvcm0gPSBudWxsO1xuICAgICAgICAgIGZvcm0gPSAkbG9jYXRpb24uc2VhcmNoKClbXCJmb3JtXCJdO1xuICAgICAgICAgICRzY29wZS5zb3VyY2UgPSBjb250ZW50cztcbiAgICAgICAgICAkc2NvcGUuZm9ybSA9IGZvcm07XG4gICAgICAgICAgaWYgKGZvcm0pIHtcbiAgICAgICAgICAgIC8vIG5vdyBsZXRzIHRyeSBsb2FkIHRoZSBmb3JtIEpTT04gc28gd2UgY2FuIHRoZW4gcmVuZGVyIHRoZSBmb3JtXG4gICAgICAgICAgICAkc2NvcGUuc291cmNlVmlldyA9IG51bGw7XG4gICAgICAgICAgICAkc2NvcGUuZ2l0ID0gd2lraVJlcG9zaXRvcnkuZ2V0UGFnZSgkc2NvcGUuYnJhbmNoLCBmb3JtLCAkc2NvcGUub2JqZWN0SWQsIChkZXRhaWxzKSA9PiB7XG4gICAgICAgICAgICAgIG9uRm9ybVNjaGVtYShXaWtpLnBhcnNlSnNvbihkZXRhaWxzLnRleHQpKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAkc2NvcGUuc291cmNlVmlldyA9IFwicGx1Z2lucy93aWtpL2h0bWwvc291cmNlVmlldy5odG1sXCI7XG4gICAgICAgICAgfVxuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICRzY29wZS5odG1sID0gbnVsbDtcbiAgICAgICAgICAkc2NvcGUuc291cmNlID0gY29udGVudHM7XG4gICAgICAgICAgJHNjb3BlLnNvdXJjZVZpZXcgPSBcInBsdWdpbnMvd2lraS9odG1sL3NvdXJjZVZpZXcuaHRtbFwiO1xuICAgICAgfVxuICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBvbkZvcm1TY2hlbWEoanNvbikge1xuICAgICAgJHNjb3BlLmZvcm1EZWZpbml0aW9uID0ganNvbjtcbiAgICAgIGlmICgkc2NvcGUuc291cmNlKSB7XG4gICAgICAgICRzY29wZS5mb3JtRW50aXR5ID0gV2lraS5wYXJzZUpzb24oJHNjb3BlLnNvdXJjZSk7XG4gICAgICB9XG4gICAgICAkc2NvcGUuc291cmNlVmlldyA9IFwicGx1Z2lucy93aWtpL2h0bWwvZm9ybVZpZXcuaHRtbFwiO1xuICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBvbkZpbGVEZXRhaWxzKGRldGFpbHMpIHtcbiAgICAgIHZhciBjb250ZW50cyA9IGRldGFpbHMudGV4dDtcbiAgICAgICRzY29wZS5kaXJlY3RvcnkgPSBkZXRhaWxzLmRpcmVjdG9yeTtcbiAgICAgICRzY29wZS5maWxlRGV0YWlscyA9IGRldGFpbHM7XG5cbiAgICAgIGlmIChkZXRhaWxzICYmIGRldGFpbHMuZm9ybWF0KSB7XG4gICAgICAgICRzY29wZS5mb3JtYXQgPSBkZXRhaWxzLmZvcm1hdDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgICRzY29wZS5mb3JtYXQgPSBXaWtpLmZpbGVGb3JtYXQoJHNjb3BlLnBhZ2VJZCwgZmlsZUV4dGVuc2lvblR5cGVSZWdpc3RyeSk7XG4gICAgICB9XG4gICAgICAkc2NvcGUuY29kZU1pcnJvck9wdGlvbnMubW9kZS5uYW1lID0gJHNjb3BlLmZvcm1hdDtcbiAgICAgICRzY29wZS5jaGlsZHJlbiA9IG51bGw7XG5cbiAgICAgIGlmIChkZXRhaWxzLmRpcmVjdG9yeSkge1xuICAgICAgICB2YXIgZGlyZWN0b3JpZXMgPSBkZXRhaWxzLmNoaWxkcmVuLmZpbHRlcigoZGlyKSA9PiB7XG4gICAgICAgICAgcmV0dXJuIGRpci5kaXJlY3Rvcnk7XG4gICAgICAgIH0pO1xuICAgICAgICB2YXIgcHJvZmlsZXMgPSBkZXRhaWxzLmNoaWxkcmVuLmZpbHRlcigoZGlyKSA9PiB7XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9KTtcbiAgICAgICAgdmFyIGZpbGVzID0gZGV0YWlscy5jaGlsZHJlbi5maWx0ZXIoKGZpbGUpID0+IHtcbiAgICAgICAgICByZXR1cm4gIWZpbGUuZGlyZWN0b3J5O1xuICAgICAgICB9KTtcbiAgICAgICAgZGlyZWN0b3JpZXMgPSBkaXJlY3Rvcmllcy5zb3J0QnkoKGRpcikgPT4ge1xuICAgICAgICAgIHJldHVybiBkaXIubmFtZTtcbiAgICAgICAgfSk7XG4gICAgICAgIHByb2ZpbGVzID0gcHJvZmlsZXMuc29ydEJ5KChkaXIpID0+IHtcbiAgICAgICAgICByZXR1cm4gZGlyLm5hbWU7XG4gICAgICAgIH0pO1xuICAgICAgICBmaWxlcyA9IGZpbGVzLnNvcnRCeSgoZmlsZSkgPT4ge1xuICAgICAgICAgIHJldHVybiBmaWxlLm5hbWU7XG4gICAgICAgIH0pXG4gICAgICAgICAgLnNvcnRCeSgoZmlsZSkgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIGZpbGUubmFtZS5zcGxpdCgnLicpLmxhc3QoKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgLy8gQWxzbyBlbnJpY2ggdGhlIHJlc3BvbnNlIHdpdGggdGhlIGN1cnJlbnQgYnJhbmNoLCBhcyB0aGF0J3MgcGFydCBvZiB0aGUgY29vcmRpbmF0ZSBmb3IgbG9jYXRpbmcgdGhlIGFjdHVhbCBmaWxlIGluIGdpdFxuICAgICAgICAkc2NvcGUuY2hpbGRyZW4gPSAoPGFueT5BcnJheSkuY3JlYXRlKGRpcmVjdG9yaWVzLCBwcm9maWxlcywgZmlsZXMpLm1hcCgoZmlsZSkgPT4ge1xuICAgICAgICAgIGZpbGUuYnJhbmNoID0gJHNjb3BlLmJyYW5jaDtcbiAgICAgICAgICBmaWxlLmZpbGVOYW1lID0gZmlsZS5uYW1lO1xuICAgICAgICAgIGlmIChmaWxlLmRpcmVjdG9yeSkge1xuICAgICAgICAgICAgZmlsZS5maWxlTmFtZSArPSBcIi56aXBcIjtcbiAgICAgICAgICB9XG4gICAgICAgICAgZmlsZS5kb3dubG9hZFVSTCA9IFdpa2kuZ2l0UmVzdFVSTCgkc2NvcGUsIGZpbGUucGF0aCk7XG4gICAgICAgICAgcmV0dXJuIGZpbGU7XG4gICAgICAgIH0pO1xuICAgICAgfVxuXG5cbiAgICAgICRzY29wZS5odG1sID0gbnVsbDtcbiAgICAgICRzY29wZS5zb3VyY2UgPSBudWxsO1xuICAgICAgJHNjb3BlLnJlYWRNZVBhdGggPSBudWxsO1xuXG4gICAgICAkc2NvcGUuaXNGaWxlID0gZmFsc2U7XG4gICAgICBpZiAoJHNjb3BlLmNoaWxkcmVuKSB7XG4gICAgICAgICRzY29wZS4kYnJvYWRjYXN0KCdwYW5lLm9wZW4nKTtcbiAgICAgICAgLy8gaWYgd2UgaGF2ZSBhIHJlYWRtZSB0aGVuIGxldHMgcmVuZGVyIGl0Li4uXG4gICAgICAgIHZhciBpdGVtID0gJHNjb3BlLmNoaWxkcmVuLmZpbmQoKGluZm8pID0+IHtcbiAgICAgICAgICB2YXIgbmFtZSA9IChpbmZvLm5hbWUgfHwgXCJcIikudG9Mb3dlckNhc2UoKTtcbiAgICAgICAgICB2YXIgZXh0ID0gZmlsZUV4dGVuc2lvbihuYW1lKTtcbiAgICAgICAgICByZXR1cm4gbmFtZSAmJiBleHQgJiYgKChuYW1lLnN0YXJ0c1dpdGgoXCJyZWFkbWUuXCIpIHx8IG5hbWUgPT09IFwicmVhZG1lXCIpIHx8IChuYW1lLnN0YXJ0c1dpdGgoXCJpbmRleC5cIikgfHwgbmFtZSA9PT0gXCJpbmRleFwiKSk7XG4gICAgICAgIH0pO1xuICAgICAgICBpZiAoaXRlbSkge1xuICAgICAgICAgIHZhciBwYWdlTmFtZSA9IGl0ZW0ucGF0aDtcbiAgICAgICAgICAkc2NvcGUucmVhZE1lUGF0aCA9IHBhZ2VOYW1lO1xuICAgICAgICAgIHdpa2lSZXBvc2l0b3J5LmdldFBhZ2UoJHNjb3BlLmJyYW5jaCwgcGFnZU5hbWUsICRzY29wZS5vYmplY3RJZCwgKHJlYWRtZURldGFpbHMpID0+IHtcbiAgICAgICAgICAgIHZpZXdDb250ZW50cyhwYWdlTmFtZSwgcmVhZG1lRGV0YWlscy50ZXh0KTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICB2YXIga3ViZXJuZXRlc0pzb24gPSAkc2NvcGUuY2hpbGRyZW4uZmluZCgoY2hpbGQpID0+IHtcbiAgICAgICAgICB2YXIgbmFtZSA9IChjaGlsZC5uYW1lIHx8IFwiXCIpLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgICAgdmFyIGV4dCA9IGZpbGVFeHRlbnNpb24obmFtZSk7XG4gICAgICAgICAgcmV0dXJuIG5hbWUgJiYgZXh0ICYmIG5hbWUuc3RhcnRzV2l0aChcImt1YmVybmV0ZXNcIikgJiYgZXh0ID09PSBcImpzb25cIjtcbiAgICAgICAgfSk7XG4gICAgICAgIGlmIChrdWJlcm5ldGVzSnNvbikge1xuICAgICAgICAgIHdpa2lSZXBvc2l0b3J5LmdldFBhZ2UoJHNjb3BlLmJyYW5jaCwga3ViZXJuZXRlc0pzb24ucGF0aCwgdW5kZWZpbmVkLCAoanNvbikgPT4ge1xuICAgICAgICAgICAgaWYgKGpzb24gJiYganNvbi50ZXh0KSB7XG4gICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgJHNjb3BlLmt1YmVybmV0ZXNKc29uID0gYW5ndWxhci5mcm9tSnNvbihqc29uLnRleHQpO1xuICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgJHNjb3BlLmt1YmVybmV0ZXNKc29uID0ge1xuICAgICAgICAgICAgICAgICAgZXJyb3JQYXJzaW5nOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgZXJyb3I6IGVcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICRzY29wZS5zaG93QXBwSGVhZGVyID0gdHJ1ZTtcbiAgICAgICAgICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICAkc2NvcGUuJGJyb2FkY2FzdCgnV2lraS5WaWV3UGFnZS5DaGlsZHJlbicsICRzY29wZS5wYWdlSWQsICRzY29wZS5jaGlsZHJlbik7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAkc2NvcGUuJGJyb2FkY2FzdCgncGFuZS5jbG9zZScpO1xuICAgICAgICB2YXIgcGFnZU5hbWUgPSAkc2NvcGUucGFnZUlkO1xuICAgICAgICB2aWV3Q29udGVudHMocGFnZU5hbWUsIGNvbnRlbnRzKTtcbiAgICAgICAgJHNjb3BlLmlzRmlsZSA9IHRydWU7XG4gICAgICB9XG4gICAgICBDb3JlLiRhcHBseSgkc2NvcGUpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGNoZWNrRmlsZUV4aXN0cyhwYXRoKSB7XG4gICAgICAkc2NvcGUub3BlcmF0aW9uQ291bnRlciArPSAxO1xuICAgICAgdmFyIGNvdW50ZXIgPSAkc2NvcGUub3BlcmF0aW9uQ291bnRlcjtcbiAgICAgIGlmIChwYXRoKSB7XG4gICAgICAgIHdpa2lSZXBvc2l0b3J5LmV4aXN0cygkc2NvcGUuYnJhbmNoLCBwYXRoLCAocmVzdWx0KSA9PiB7XG4gICAgICAgICAgLy8gZmlsdGVyIG9sZCByZXN1bHRzXG4gICAgICAgICAgaWYgKCRzY29wZS5vcGVyYXRpb25Db3VudGVyID09PSBjb3VudGVyKSB7XG4gICAgICAgICAgICBsb2cuZGVidWcoXCJjaGVja0ZpbGVFeGlzdHMgZm9yIHBhdGggXCIgKyBwYXRoICsgXCIgZ290IHJlc3VsdCBcIiArIHJlc3VsdCk7XG4gICAgICAgICAgICAkc2NvcGUuZmlsZUV4aXN0cy5leGlzdHMgPSByZXN1bHQgPyB0cnVlIDogZmFsc2U7XG4gICAgICAgICAgICAkc2NvcGUuZmlsZUV4aXN0cy5uYW1lID0gcmVzdWx0ID8gcmVzdWx0Lm5hbWUgOiBudWxsO1xuICAgICAgICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gbG9nLmRlYnVnKFwiSWdub3Jpbmcgb2xkIHJlc3VsdHMgZm9yIFwiICsgcGF0aCk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBDYWxsZWQgYnkgaGF3dGlvIFRPQyBkaXJlY3RpdmUuLi5cbiAgICAkc2NvcGUuZ2V0Q29udGVudHMgPSAoZmlsZW5hbWUsIGNiKSA9PiB7XG4gICAgICB2YXIgcGFnZUlkID0gZmlsZW5hbWU7XG4gICAgICBpZiAoJHNjb3BlLmRpcmVjdG9yeSkge1xuICAgICAgICBwYWdlSWQgPSAkc2NvcGUucGFnZUlkICsgJy8nICsgZmlsZW5hbWU7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgcGF0aFBhcnRzID0gJHNjb3BlLnBhZ2VJZC5zcGxpdCgnLycpO1xuICAgICAgICBwYXRoUGFydHMgPSBwYXRoUGFydHMucmVtb3ZlKHBhdGhQYXJ0cy5sYXN0KCkpO1xuICAgICAgICBwYXRoUGFydHMucHVzaChmaWxlbmFtZSk7XG4gICAgICAgIHBhZ2VJZCA9IHBhdGhQYXJ0cy5qb2luKCcvJyk7XG4gICAgICB9XG4gICAgICBsb2cuZGVidWcoXCJwYWdlSWQ6IFwiLCAkc2NvcGUucGFnZUlkKTtcbiAgICAgIGxvZy5kZWJ1ZyhcImJyYW5jaDogXCIsICRzY29wZS5icmFuY2gpO1xuICAgICAgbG9nLmRlYnVnKFwiZmlsZW5hbWU6IFwiLCBmaWxlbmFtZSk7XG4gICAgICBsb2cuZGVidWcoXCJ1c2luZyBwYWdlSWQ6IFwiLCBwYWdlSWQpO1xuICAgICAgd2lraVJlcG9zaXRvcnkuZ2V0UGFnZSgkc2NvcGUuYnJhbmNoLCBwYWdlSWQsIHVuZGVmaW5lZCwgKGRhdGEpID0+IHtcbiAgICAgICAgY2IoZGF0YS50ZXh0KTtcbiAgICAgIH0pO1xuICAgIH07XG5cblxuICAgIGZ1bmN0aW9uIGdldFJlbmFtZUZpbGVQYXRoKCkge1xuICAgICAgdmFyIG5ld0ZpbGVOYW1lID0gJHNjb3BlLnJlbmFtZS5uZXdGaWxlTmFtZTtcbiAgICAgIHJldHVybiAoJHNjb3BlLnBhZ2VJZCAmJiBuZXdGaWxlTmFtZSkgPyBVcmxIZWxwZXJzLmpvaW4oJHNjb3BlLnBhZ2VJZCwgbmV3RmlsZU5hbWUpIDogbnVsbDtcbiAgICB9XG4gIH1dKTtcbn1cbiIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9pbmNsdWRlcy50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJ3aWtpSGVscGVycy50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJ3aWtpUGx1Z2luLnRzXCIvPlxuXG5tb2R1bGUgV2lraSB7XG5cbiAgZXhwb3J0IGludGVyZmFjZSBXaWtpRGlhbG9nIHtcbiAgICBvcGVuOiAoKSA9PiB7fTtcbiAgICBjbG9zZTogKCkgPT4ge307XG4gIH1cblxuICBleHBvcnQgaW50ZXJmYWNlIFJlbmFtZURpYWxvZ09wdGlvbnMge1xuICAgIHJlbmFtZTogKCkgPT4ge307XG4gICAgZmlsZUV4aXN0czogKCkgPT4ge307XG4gICAgZmlsZU5hbWU6ICgpID0+IFN0cmluZztcbiAgICBjYWxsYmFja3M6ICgpID0+IFN0cmluZztcbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiBnZXRSZW5hbWVEaWFsb2coJGRpYWxvZywgJHNjb3BlOlJlbmFtZURpYWxvZ09wdGlvbnMpOldpa2kuV2lraURpYWxvZyB7XG4gICAgcmV0dXJuICRkaWFsb2cuZGlhbG9nKHtcbiAgICAgIHJlc29sdmU6ICRzY29wZSxcbiAgICAgIHRlbXBsYXRlVXJsOiAncGx1Z2lucy93aWtpL2h0bWwvbW9kYWwvcmVuYW1lRGlhbG9nLmh0bWwnLFxuICAgICAgY29udHJvbGxlcjogW1wiJHNjb3BlXCIsIFwiZGlhbG9nXCIsICBcImNhbGxiYWNrc1wiLCBcInJlbmFtZVwiLCBcImZpbGVFeGlzdHNcIiwgXCJmaWxlTmFtZVwiLCAoJHNjb3BlLCBkaWFsb2csIGNhbGxiYWNrcywgcmVuYW1lLCBmaWxlRXhpc3RzLCBmaWxlTmFtZSkgPT4ge1xuICAgICAgICAkc2NvcGUucmVuYW1lICA9IHJlbmFtZTtcbiAgICAgICAgJHNjb3BlLmZpbGVFeGlzdHMgID0gZmlsZUV4aXN0cztcbiAgICAgICAgJHNjb3BlLmZpbGVOYW1lICA9IGZpbGVOYW1lO1xuXG4gICAgICAgICRzY29wZS5jbG9zZSA9IChyZXN1bHQpID0+IHtcbiAgICAgICAgICBkaWFsb2cuY2xvc2UoKTtcbiAgICAgICAgfTtcblxuICAgICAgICAkc2NvcGUucmVuYW1lQW5kQ2xvc2VEaWFsb2cgPSBjYWxsYmFja3M7XG5cbiAgICAgIH1dXG4gICAgfSk7XG4gIH1cblxuICBleHBvcnQgaW50ZXJmYWNlIE1vdmVEaWFsb2dPcHRpb25zIHtcbiAgICBtb3ZlOiAoKSA9PiB7fTtcbiAgICBmb2xkZXJOYW1lczogKCkgPT4ge307XG4gICAgY2FsbGJhY2tzOiAoKSA9PiBTdHJpbmc7XG4gIH1cblxuXG4gIGV4cG9ydCBmdW5jdGlvbiBnZXRNb3ZlRGlhbG9nKCRkaWFsb2csICRzY29wZTpNb3ZlRGlhbG9nT3B0aW9ucyk6V2lraS5XaWtpRGlhbG9nIHtcbiAgICByZXR1cm4gJGRpYWxvZy5kaWFsb2coe1xuICAgICAgcmVzb2x2ZTogJHNjb3BlLFxuICAgICAgdGVtcGxhdGVVcmw6ICdwbHVnaW5zL3dpa2kvaHRtbC9tb2RhbC9tb3ZlRGlhbG9nLmh0bWwnLFxuICAgICAgY29udHJvbGxlcjogW1wiJHNjb3BlXCIsIFwiZGlhbG9nXCIsICBcImNhbGxiYWNrc1wiLCBcIm1vdmVcIiwgXCJmb2xkZXJOYW1lc1wiLCAoJHNjb3BlLCBkaWFsb2csIGNhbGxiYWNrcywgbW92ZSwgZm9sZGVyTmFtZXMpID0+IHtcbiAgICAgICAgJHNjb3BlLm1vdmUgID0gbW92ZTtcbiAgICAgICAgJHNjb3BlLmZvbGRlck5hbWVzICA9IGZvbGRlck5hbWVzO1xuXG4gICAgICAgICRzY29wZS5jbG9zZSA9IChyZXN1bHQpID0+IHtcbiAgICAgICAgICBkaWFsb2cuY2xvc2UoKTtcbiAgICAgICAgfTtcblxuICAgICAgICAkc2NvcGUubW92ZUFuZENsb3NlRGlhbG9nID0gY2FsbGJhY2tzO1xuXG4gICAgICB9XVxuICAgIH0pO1xuICB9XG5cblxuICBleHBvcnQgaW50ZXJmYWNlIERlbGV0ZURpYWxvZ09wdGlvbnMge1xuICAgIGNhbGxiYWNrczogKCkgPT4gU3RyaW5nO1xuICAgIHNlbGVjdGVkRmlsZUh0bWw6ICgpID0+IFN0cmluZztcbiAgICB3YXJuaW5nOiAoKSA9PiBzdHJpbmc7XG4gIH1cblxuXG4gIGV4cG9ydCBmdW5jdGlvbiBnZXREZWxldGVEaWFsb2coJGRpYWxvZywgJHNjb3BlOkRlbGV0ZURpYWxvZ09wdGlvbnMpOldpa2kuV2lraURpYWxvZyB7XG4gICAgcmV0dXJuICRkaWFsb2cuZGlhbG9nKHtcbiAgICAgIHJlc29sdmU6ICRzY29wZSxcbiAgICAgIHRlbXBsYXRlVXJsOiAncGx1Z2lucy93aWtpL2h0bWwvbW9kYWwvZGVsZXRlRGlhbG9nLmh0bWwnLFxuICAgICAgY29udHJvbGxlcjogW1wiJHNjb3BlXCIsIFwiZGlhbG9nXCIsICBcImNhbGxiYWNrc1wiLCBcInNlbGVjdGVkRmlsZUh0bWxcIiwgXCJ3YXJuaW5nXCIsICgkc2NvcGUsIGRpYWxvZywgY2FsbGJhY2tzLCBzZWxlY3RlZEZpbGVIdG1sLCB3YXJuaW5nKSA9PiB7XG5cbiAgICAgICAgJHNjb3BlLnNlbGVjdGVkRmlsZUh0bWwgPSBzZWxlY3RlZEZpbGVIdG1sO1xuXG4gICAgICAgICRzY29wZS5jbG9zZSA9IChyZXN1bHQpID0+IHtcbiAgICAgICAgICBkaWFsb2cuY2xvc2UoKTtcbiAgICAgICAgfTtcblxuICAgICAgICAkc2NvcGUuZGVsZXRlQW5kQ2xvc2VEaWFsb2cgPSBjYWxsYmFja3M7XG5cbiAgICAgICAgJHNjb3BlLndhcm5pbmcgPSB3YXJuaW5nO1xuICAgICAgfV1cbiAgICB9KTtcbiAgfVxuXG5cblxuXG5cbn0iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vaW5jbHVkZXMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwid2lraUhlbHBlcnMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwid2lraVBsdWdpbi50c1wiLz5cblxubW9kdWxlIFdpa2kge1xuXG4gIF9tb2R1bGUuZGlyZWN0aXZlKCd3aWtpSHJlZkFkanVzdGVyJywgW1wiJGxvY2F0aW9uXCIsICgkbG9jYXRpb24pID0+IHtcbiAgICByZXR1cm4ge1xuICAgICAgcmVzdHJpY3Q6ICdBJyxcbiAgICAgIGxpbms6ICgkc2NvcGUsICRlbGVtZW50LCAkYXR0cikgPT4ge1xuXG4gICAgICAgICRlbGVtZW50LmJpbmQoJ0RPTU5vZGVJbnNlcnRlZCcsIChldmVudCkgPT4ge1xuICAgICAgICAgIHZhciBheXMgPSAkZWxlbWVudC5maW5kKCdhJyk7XG4gICAgICAgICAgYW5ndWxhci5mb3JFYWNoKGF5cywgKGEpID0+IHtcbiAgICAgICAgICAgIGlmIChhLmhhc0F0dHJpYnV0ZSgnbm8tYWRqdXN0JykpIHtcbiAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYSA9ICQoYSk7XG4gICAgICAgICAgICB2YXIgaHJlZiA9IChhLmF0dHIoJ2hyZWYnKSB8fCBcIlwiKS50cmltKCk7XG4gICAgICAgICAgICBpZiAoaHJlZikge1xuICAgICAgICAgICAgICB2YXIgZmlsZUV4dGVuc2lvbiA9IGEuYXR0cignZmlsZS1leHRlbnNpb24nKTtcbiAgICAgICAgICAgICAgdmFyIG5ld1ZhbHVlID0gV2lraS5hZGp1c3RIcmVmKCRzY29wZSwgJGxvY2F0aW9uLCBocmVmLCBmaWxlRXh0ZW5zaW9uKTtcbiAgICAgICAgICAgICAgaWYgKG5ld1ZhbHVlKSB7XG4gICAgICAgICAgICAgICAgYS5hdHRyKCdocmVmJywgbmV3VmFsdWUpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgdmFyIGltZ3MgPSAkZWxlbWVudC5maW5kKCdpbWcnKTtcbiAgICAgICAgICBhbmd1bGFyLmZvckVhY2goaW1ncywgKGEpID0+IHtcbiAgICAgICAgICAgIGlmIChhLmhhc0F0dHJpYnV0ZSgnbm8tYWRqdXN0JykpIHtcbiAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYSA9ICQoYSk7XG4gICAgICAgICAgICB2YXIgaHJlZiA9IChhLmF0dHIoJ3NyYycpIHx8IFwiXCIpLnRyaW0oKTtcbiAgICAgICAgICAgIGlmIChocmVmKSB7XG4gICAgICAgICAgICAgIGlmIChocmVmLnN0YXJ0c1dpdGgoXCIvXCIpKSB7XG4gICAgICAgICAgICAgICAgaHJlZiA9IENvcmUudXJsKGhyZWYpO1xuICAgICAgICAgICAgICAgIGEuYXR0cignc3JjJywgaHJlZik7XG5cbiAgICAgICAgICAgICAgICAvLyBsZXRzIGF2b2lkIHRoaXMgZWxlbWVudCBiZWluZyByZXByb2Nlc3NlZFxuICAgICAgICAgICAgICAgIGEuYXR0cignbm8tYWRqdXN0JywgJ3RydWUnKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICB9KVxuICAgICAgfVxuICAgIH1cbiAgfV0pO1xuXG4gIF9tb2R1bGUuZGlyZWN0aXZlKCd3aWtpVGl0bGVMaW5rZXInLCBbXCIkbG9jYXRpb25cIiwgKCRsb2NhdGlvbikgPT4ge1xuICAgIHJldHVybiB7XG4gICAgICByZXN0cmljdDogJ0EnLFxuICAgICAgbGluazogKCRzY29wZSwgJGVsZW1lbnQsICRhdHRyKSA9PiB7XG4gICAgICAgIHZhciBsb2FkZWQgPSBmYWxzZTtcblxuICAgICAgICBmdW5jdGlvbiBvZmZzZXRUb3AoZWxlbWVudHMpIHtcbiAgICAgICAgICBpZiAoZWxlbWVudHMpIHtcbiAgICAgICAgICAgIHZhciBvZmZzZXQgPSBlbGVtZW50cy5vZmZzZXQoKTtcbiAgICAgICAgICAgIGlmIChvZmZzZXQpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIG9mZnNldC50b3A7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiAwO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gc2Nyb2xsVG9IYXNoKCkge1xuICAgICAgICAgIHZhciBhbnN3ZXIgPSBmYWxzZTtcbiAgICAgICAgICB2YXIgaWQgPSAkbG9jYXRpb24uc2VhcmNoKClbXCJoYXNoXCJdO1xuICAgICAgICAgIHJldHVybiBzY3JvbGxUb0lkKGlkKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIHNjcm9sbFRvSWQoaWQpIHtcbiAgICAgICAgICB2YXIgYW5zd2VyID0gZmFsc2U7XG4gICAgICAgICAgdmFyIGlkID0gJGxvY2F0aW9uLnNlYXJjaCgpW1wiaGFzaFwiXTtcbiAgICAgICAgICBpZiAoaWQpIHtcbiAgICAgICAgICAgIHZhciBzZWxlY3RvciA9ICdhW25hbWU9XCInICsgaWQgKyAnXCJdJztcbiAgICAgICAgICAgIHZhciB0YXJnZXRFbGVtZW50cyA9ICRlbGVtZW50LmZpbmQoc2VsZWN0b3IpO1xuICAgICAgICAgICAgaWYgKHRhcmdldEVsZW1lbnRzICYmIHRhcmdldEVsZW1lbnRzLmxlbmd0aCkge1xuICAgICAgICAgICAgICB2YXIgc2Nyb2xsRHVyYXRpb24gPSAxO1xuICAgICAgICAgICAgICB2YXIgZGVsdGEgPSBvZmZzZXRUb3AoJCgkZWxlbWVudCkpO1xuICAgICAgICAgICAgICB2YXIgdG9wID0gb2Zmc2V0VG9wKHRhcmdldEVsZW1lbnRzKSAtIGRlbHRhO1xuICAgICAgICAgICAgICBpZiAodG9wIDwgMCkge1xuICAgICAgICAgICAgICAgIHRvcCA9IDA7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgLy9sb2cuaW5mbyhcInNjcm9sbGluZyB0byBoYXNoOiBcIiArIGlkICsgXCIgdG9wOiBcIiArIHRvcCArIFwiIGRlbHRhOlwiICsgZGVsdGEpO1xuICAgICAgICAgICAgICAkKCdib2R5LGh0bWwnKS5hbmltYXRlKHtcbiAgICAgICAgICAgICAgICBzY3JvbGxUb3A6IHRvcFxuICAgICAgICAgICAgICB9LCBzY3JvbGxEdXJhdGlvbik7XG4gICAgICAgICAgICAgIGFuc3dlciA9IHRydWU7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAvL2xvZy5pbmZvKFwiY291bGQgZmluZCBlbGVtZW50IGZvcjogXCIgKyBzZWxlY3Rvcik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiBhbnN3ZXI7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBhZGRMaW5rcyhldmVudCkge1xuICAgICAgICAgIHZhciBoZWFkaW5ncyA9ICRlbGVtZW50LmZpbmQoJ2gxLGgyLGgzLGg0LGg1LGg2LGg3Jyk7XG4gICAgICAgICAgdmFyIHVwZGF0ZWQgPSBmYWxzZTtcbiAgICAgICAgICBhbmd1bGFyLmZvckVhY2goaGVhZGluZ3MsIChoZSkgPT4ge1xuICAgICAgICAgICAgdmFyIGgxID0gJChoZSk7XG4gICAgICAgICAgICAvLyBub3cgbGV0cyB0cnkgZmluZCBhIGNoaWxkIGhlYWRlclxuICAgICAgICAgICAgdmFyIGEgPSBoMS5wYXJlbnQoXCJhXCIpO1xuICAgICAgICAgICAgaWYgKCFhIHx8ICFhLmxlbmd0aCkge1xuICAgICAgICAgICAgICB2YXIgdGV4dCA9IGgxLnRleHQoKTtcbiAgICAgICAgICAgICAgaWYgKHRleHQpIHtcbiAgICAgICAgICAgICAgICB2YXIgdGFyZ2V0ID0gdGV4dC5yZXBsYWNlKC8gL2csIFwiLVwiKTtcbiAgICAgICAgICAgICAgICB2YXIgcGF0aFdpdGhIYXNoID0gXCIjXCIgKyAkbG9jYXRpb24ucGF0aCgpICsgXCI/aGFzaD1cIiArIHRhcmdldDtcbiAgICAgICAgICAgICAgICB2YXIgbGluayA9IENvcmUuY3JlYXRlSHJlZigkbG9jYXRpb24sIHBhdGhXaXRoSGFzaCwgWydoYXNoJ10pO1xuXG4gICAgICAgICAgICAgICAgLy8gbGV0cyB3cmFwIHRoZSBoZWFkaW5nIGluIGEgbGlua1xuICAgICAgICAgICAgICAgIHZhciBuZXdBID0gJCgnPGEgbmFtZT1cIicgKyB0YXJnZXQgKyAnXCIgaHJlZj1cIicgKyBsaW5rICsgJ1wiIG5nLWNsaWNrPVwib25MaW5rQ2xpY2soKVwiPjwvYT4nKTtcbiAgICAgICAgICAgICAgICBuZXdBLm9uKFwiY2xpY2tcIiwgKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChzY3JvbGxUb0lkKHRhcmdldCkpIHtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgfSwgNTApO1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgbmV3QS5pbnNlcnRCZWZvcmUoaDEpO1xuICAgICAgICAgICAgICAgIGgxLmRldGFjaCgpO1xuICAgICAgICAgICAgICAgIG5ld0EuYXBwZW5kKGgxKTtcbiAgICAgICAgICAgICAgICB1cGRhdGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICAgIGlmICh1cGRhdGVkICYmICFsb2FkZWQpIHtcbiAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICBpZiAoc2Nyb2xsVG9IYXNoKCkpIHtcbiAgICAgICAgICAgICAgICBsb2FkZWQgPSB0cnVlO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LCA1MCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gb25FdmVudEluc2VydGVkKGV2ZW50KSB7XG4gICAgICAgICAgLy8gYXZvaWQgYW55IG1vcmUgZXZlbnRzIHdoaWxlIHdlIGRvIG91ciB0aGluZ1xuICAgICAgICAgICRlbGVtZW50LnVuYmluZCgnRE9NTm9kZUluc2VydGVkJywgb25FdmVudEluc2VydGVkKTtcbiAgICAgICAgICBhZGRMaW5rcyhldmVudCk7XG4gICAgICAgICAgJGVsZW1lbnQuYmluZCgnRE9NTm9kZUluc2VydGVkJywgb25FdmVudEluc2VydGVkKTtcbiAgICAgICAgfVxuXG4gICAgICAgICRlbGVtZW50LmJpbmQoJ0RPTU5vZGVJbnNlcnRlZCcsIG9uRXZlbnRJbnNlcnRlZCk7XG4gICAgICB9XG4gICAgfTtcbiAgfV0pO1xuXG59XG4iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vaW5jbHVkZXMudHNcIi8+XG5cblxuLyoqXG4gKiBAbW9kdWxlIFdpa2lcbiAqL1xubW9kdWxlIFdpa2kge1xuXG4gIERldmVsb3Blci5jdXN0b21Qcm9qZWN0U3ViVGFiRmFjdG9yaWVzLnB1c2goXG4gICAgKGNvbnRleHQpID0+IHtcbiAgICAgIHZhciBwcm9qZWN0TGluayA9IGNvbnRleHQucHJvamVjdExpbms7XG4gICAgICB2YXIgcHJvamVjdE5hbWUgPSBjb250ZXh0LnByb2plY3ROYW1lO1xuICAgICAgdmFyIG93bmVyID0gXCJcIjtcbiAgICAgIHZhciByZXBvTmFtZSA9IFwiXCI7XG4gICAgICBpZiAocHJvamVjdE5hbWUpIHtcbiAgICAgICAgLy8gVE9ETyB0aGlzIGlzIGEgYml0IG9mIGEgaGFjayAtIHdlIHNob3VsZCBleHBvc2UgdGhpcyBhIGJpdCBiZXR0ZXIgc29tZXdoZXJlP1xuICAgICAgICB2YXIgaWR4ID0gcHJvamVjdE5hbWUuaW5kZXhPZignLScpO1xuICAgICAgICBpZiAoaWR4ID4gMCkge1xuICAgICAgICAgIG93bmVyID0gcHJvamVjdE5hbWUuc3Vic3RyaW5nKDAsIGlkeCk7XG4gICAgICAgICAgcmVwb05hbWUgPSBwcm9qZWN0TmFtZS5zdWJzdHJpbmcoaWR4ICsgMSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiB7XG4gICAgICAgIGlzVmFsaWQ6ICgpID0+IHByb2plY3RMaW5rICYmIG93bmVyICYmIHJlcG9OYW1lICYmIERldmVsb3Blci5mb3JnZVJlYWR5TGluaygpLFxuICAgICAgICBocmVmOiBVcmxIZWxwZXJzLmpvaW4ocHJvamVjdExpbmssIFwid2lraVwiLCBvd25lciwgcmVwb05hbWUsIFwidmlld1wiKSxcbiAgICAgICAgbGFiZWw6IFwiU291cmNlXCIsXG4gICAgICAgIHRpdGxlOiBcIkJyb3dzZSB0aGUgc291cmNlIGNvZGUgb2YgdGhpcyBwcm9qZWN0XCJcbiAgICAgIH07XG4gICAgfSk7XG5cblxuICBleHBvcnQgZnVuY3Rpb24gY3JlYXRlU291cmNlQnJlYWRjcnVtYnMoJHNjb3BlKSB7XG4gICAgdmFyIHNvdXJjZUxpbmsgPSAkc2NvcGUuJHZpZXdMaW5rIHx8IFVybEhlbHBlcnMuam9pbihzdGFydExpbmsoJHNjb3BlKSwgXCJ2aWV3XCIpO1xuICAgIHJldHVybiBbXG4gICAgICB7XG4gICAgICAgIGxhYmVsOiBcIlNvdXJjZVwiLFxuICAgICAgICBocmVmOiBzb3VyY2VMaW5rLFxuICAgICAgICB0aXRsZTogXCJCcm93c2UgdGhlIHNvdXJjZSBjb2RlIG9mIHRoaXMgcHJvamVjdFwiXG4gICAgICB9XG4gICAgXVxuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZUVkaXRpbmdCcmVhZGNydW1iKCRzY29wZSkge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgbGFiZWw6IFwiRWRpdGluZ1wiLFxuICAgICAgICB0aXRsZTogXCJFZGl0aW5nIHRoaXMgZmlsZVwiXG4gICAgICB9O1xuICB9XG59XG4iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vaW5jbHVkZXMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwid2lraUhlbHBlcnMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwid2lraVBsdWdpbi50c1wiLz5cblxuLyoqXG4gKiBAbW9kdWxlIFdpa2lcbiAqL1xubW9kdWxlIFdpa2kge1xuXG4gIC8qKlxuICAgKiBAY2xhc3MgR2l0V2lraVJlcG9zaXRvcnlcbiAgICovXG4gIGV4cG9ydCBjbGFzcyBHaXRXaWtpUmVwb3NpdG9yeSB7XG4gICAgcHVibGljIGRpcmVjdG9yeVByZWZpeCA9IFwiXCI7XG4gICAgcHJpdmF0ZSAkaHR0cDtcbiAgICBwcml2YXRlIGNvbmZpZztcbiAgICBwcml2YXRlIGJhc2VVcmw7XG5cblxuICAgIGNvbnN0cnVjdG9yKCRzY29wZSkge1xuICAgICAgdmFyIEZvcmdlQXBpVVJMID0gS3ViZXJuZXRlcy5pbmplY3QoXCJGb3JnZUFwaVVSTFwiKTtcbiAgICAgIHRoaXMuJGh0dHAgPSBLdWJlcm5ldGVzLmluamVjdChcIiRodHRwXCIpO1xuICAgICAgdGhpcy5jb25maWcgPSBGb3JnZS5jcmVhdGVIdHRwQ29uZmlnKCk7XG4gICAgICB2YXIgb3duZXIgPSAkc2NvcGUub3duZXI7XG4gICAgICB2YXIgcmVwb05hbWUgPSAkc2NvcGUucmVwb0lkO1xuICAgICAgdGhpcy5iYXNlVXJsID0gVXJsSGVscGVycy5qb2luKEZvcmdlQXBpVVJMLCBcInJlcG9zL3VzZXJcIiwgb3duZXIsIHJlcG9OYW1lKTtcbiAgICB9XG5cbiAgICBwdWJsaWMgZ2V0UGFnZShicmFuY2g6c3RyaW5nLCBwYXRoOnN0cmluZywgb2JqZWN0SWQ6c3RyaW5nLCBmbikge1xuICAgICAgLy8gVE9ETyBpZ25vcmluZyBvYmplY3RJZFxuICAgICAgdmFyIHF1ZXJ5ID0gbnVsbDtcbiAgICAgIGlmIChicmFuY2gpIHtcbiAgICAgICAgcXVlcnkgPSBcInJlZj1cIiArIGJyYW5jaDtcbiAgICAgIH1cbiAgICAgIHRoaXMuZG9HZXQoVXJsSGVscGVycy5qb2luKFwiY29udGVudFwiLCBwYXRoIHx8IFwiL1wiKSwgcXVlcnksXG4gICAgICAgIChkYXRhLCBzdGF0dXMsIGhlYWRlcnMsIGNvbmZpZykgPT4ge1xuICAgICAgICAgIGlmIChkYXRhKSB7XG4gICAgICAgICAgICB2YXIgZGV0YWlsczogYW55ID0gbnVsbDtcbiAgICAgICAgICAgIGlmIChhbmd1bGFyLmlzQXJyYXkoZGF0YSkpIHtcbiAgICAgICAgICAgICAgYW5ndWxhci5mb3JFYWNoKGRhdGEsIChmaWxlKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKCFmaWxlLmRpcmVjdG9yeSAmJiBmaWxlLnR5cGUgPT09IFwiZGlyXCIpIHtcbiAgICAgICAgICAgICAgICAgIGZpbGUuZGlyZWN0b3J5ID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICBkZXRhaWxzID0ge1xuICAgICAgICAgICAgICAgIGRpcmVjdG9yeTogdHJ1ZSxcbiAgICAgICAgICAgICAgICBjaGlsZHJlbjogZGF0YVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBkZXRhaWxzID0gZGF0YTtcbiAgICAgICAgICAgICAgdmFyIGNvbnRlbnQgPSBkYXRhLmNvbnRlbnQ7XG4gICAgICAgICAgICAgIGlmIChjb250ZW50KSB7XG4gICAgICAgICAgICAgICAgZGV0YWlscy50ZXh0ID0gY29udGVudC5kZWNvZGVCYXNlNjQoKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZm4oZGV0YWlscyk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwdWJsaWMgcHV0UGFnZShicmFuY2g6c3RyaW5nLCBwYXRoOnN0cmluZywgY29udGVudHM6c3RyaW5nLCBjb21taXRNZXNzYWdlOnN0cmluZywgZm4pIHtcbiAgICAgIHZhciBxdWVyeSA9IG51bGw7XG4gICAgICBpZiAoYnJhbmNoKSB7XG4gICAgICAgIHF1ZXJ5ID0gXCJyZWY9XCIgKyBicmFuY2g7XG4gICAgICB9XG4gICAgICBpZiAoY29tbWl0TWVzc2FnZSkge1xuICAgICAgICBxdWVyeSA9IChxdWVyeSA/IHF1ZXJ5ICsgXCImXCIgOiBcIlwiKSArIFwibWVzc2FnZT1cIiArIGVuY29kZVVSSUNvbXBvbmVudChjb21taXRNZXNzYWdlKTtcbiAgICAgIH1cbiAgICAgIHZhciBib2R5ID0gY29udGVudHM7XG4gICAgICB0aGlzLmRvUG9zdChVcmxIZWxwZXJzLmpvaW4oXCJjb250ZW50XCIsIHBhdGggfHwgXCIvXCIpLCBxdWVyeSwgYm9keSxcbiAgICAgICAgKGRhdGEsIHN0YXR1cywgaGVhZGVycywgY29uZmlnKSA9PiB7XG4gICAgICAgICAgZm4oZGF0YSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFJldHVybiB0aGUgaGlzdG9yeSBvZiB0aGUgcmVwb3NpdG9yeSBvciBhIHNwZWNpZmljIGRpcmVjdG9yeSBvciBmaWxlIHBhdGhcbiAgICAgKiBAbWV0aG9kIGhpc3RvcnlcbiAgICAgKiBAZm9yIEdpdFdpa2lSZXBvc2l0b3J5XG4gICAgICogQHBhcmFtIHtTdHJpbmd9IGJyYW5jaFxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBvYmplY3RJZFxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoXG4gICAgICogQHBhcmFtIHtOdW1iZXJ9IGxpbWl0XG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gZm5cbiAgICAgKiBAcmV0dXJuIHthbnl9XG4gICAgICovXG4gICAgcHVibGljIGhpc3RvcnkoYnJhbmNoOnN0cmluZywgb2JqZWN0SWQ6c3RyaW5nLCBwYXRoOnN0cmluZywgbGltaXQ6bnVtYmVyLCBmbikge1xuICAgICAgdmFyIHF1ZXJ5ID0gbnVsbDtcbiAgICAgIGlmIChicmFuY2gpIHtcbiAgICAgICAgcXVlcnkgPSBcInJlZj1cIiArIGJyYW5jaDtcbiAgICAgIH1cbiAgICAgIGlmIChsaW1pdCkge1xuICAgICAgICBxdWVyeSA9IChxdWVyeSA/IHF1ZXJ5ICsgXCImXCIgOiBcIlwiKSArIFwibGltaXQ9XCIgKyBsaW1pdDtcbiAgICAgIH1cbiAgICAgIHZhciBjb21taXRJZCA9IG9iamVjdElkIHx8IGJyYW5jaDtcbiAgICAgIHRoaXMuZG9HZXQoVXJsSGVscGVycy5qb2luKFwiaGlzdG9yeVwiLCBjb21taXRJZCwgcGF0aCksIHF1ZXJ5LFxuICAgICAgICAoZGF0YSwgc3RhdHVzLCBoZWFkZXJzLCBjb25maWcpID0+IHtcbiAgICAgICAgICBmbihkYXRhKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcHVibGljIGNvbW1pdEluZm8oY29tbWl0SWQ6c3RyaW5nLCBmbikge1xuICAgICAgdmFyIHF1ZXJ5ID0gbnVsbDtcbiAgICAgIHRoaXMuZG9HZXQoVXJsSGVscGVycy5qb2luKFwiY29tbWl0SW5mb1wiLCBjb21taXRJZCksIHF1ZXJ5LFxuICAgICAgICAoZGF0YSwgc3RhdHVzLCBoZWFkZXJzLCBjb25maWcpID0+IHtcbiAgICAgICAgICBmbihkYXRhKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcHVibGljIGNvbW1pdFRyZWUoY29tbWl0SWQ6c3RyaW5nLCBmbikge1xuICAgICAgdmFyIHF1ZXJ5ID0gbnVsbDtcbiAgICAgIHRoaXMuZG9HZXQoVXJsSGVscGVycy5qb2luKFwiY29tbWl0VHJlZVwiLCBjb21taXRJZCksIHF1ZXJ5LFxuICAgICAgICAoZGF0YSwgc3RhdHVzLCBoZWFkZXJzLCBjb25maWcpID0+IHtcbiAgICAgICAgICBmbihkYXRhKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG5cbiAgICAvKipcbiAgICAgKiBQZXJmb3JtcyBhIGRpZmYgb24gdGhlIHZlcnNpb25zXG4gICAgICogQG1ldGhvZCBkaWZmXG4gICAgICogQGZvciBHaXRXaWtpUmVwb3NpdG9yeVxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBvYmplY3RJZFxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBiYXNlT2JqZWN0SWRcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gcGF0aFxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGZuXG4gICAgICogQHJldHVybiB7YW55fVxuICAgICAqL1xuICAgIHB1YmxpYyBkaWZmKG9iamVjdElkOnN0cmluZywgYmFzZU9iamVjdElkOnN0cmluZywgcGF0aDpzdHJpbmcsIGZuKSB7XG4gICAgICB2YXIgcXVlcnkgPSBudWxsO1xuICAgICAgdmFyIGNvbmZpZzogYW55ID0gRm9yZ2UuY3JlYXRlSHR0cENvbmZpZygpO1xuICAgICAgY29uZmlnLnRyYW5zZm9ybVJlc3BvbnNlID0gKGRhdGEsIGhlYWRlcnNHZXR0ZXIsIHN0YXR1cykgPT4ge1xuICAgICAgICBsb2cuaW5mbyhcImdvdCBkaWZmIGRhdGE6IFwiICsgZGF0YSk7XG4gICAgICAgIHJldHVybiBkYXRhO1xuICAgICAgfTtcbiAgICAgIHRoaXMuZG9HZXQoVXJsSGVscGVycy5qb2luKFwiZGlmZlwiLCBvYmplY3RJZCwgYmFzZU9iamVjdElkLCBwYXRoKSwgcXVlcnksXG4gICAgICAgIChkYXRhLCBzdGF0dXMsIGhlYWRlcnMsIGNvbmZpZykgPT4ge1xuICAgICAgICAgIHZhciBkZXRhaWxzID0ge1xuICAgICAgICAgICAgdGV4dDogZGF0YSxcbiAgICAgICAgICAgIGZvcm1hdDogXCJkaWZmXCIsXG4gICAgICAgICAgICBkaXJlY3Rvcnk6IGZhbHNlXG4gICAgICAgICAgfTtcbiAgICAgICAgICBmbihkZXRhaWxzKTtcbiAgICAgICAgfSxcbiAgICAgICAgbnVsbCwgY29uZmlnKTtcbiAgICB9XG5cblxuICAgIC8qKlxuICAgICAqIEdldCB0aGUgbGlzdCBvZiBicmFuY2hlc1xuICAgICAqIEBtZXRob2QgYnJhbmNoZXNcbiAgICAgKiBAZm9yIEdpdFdpa2lSZXBvc2l0b3J5XG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gZm5cbiAgICAgKiBAcmV0dXJuIHthbnl9XG4gICAgICovXG4gICAgcHVibGljIGJyYW5jaGVzKGZuKSB7XG4gICAgICB2YXIgcXVlcnkgPSBudWxsO1xuICAgICAgdGhpcy5kb0dldChcImxpc3RCcmFuY2hlc1wiLCBxdWVyeSxcbiAgICAgICAgKGRhdGEsIHN0YXR1cywgaGVhZGVycywgY29uZmlnKSA9PiB7XG4gICAgICAgICAgZm4oZGF0YSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHB1YmxpYyBleGlzdHMoYnJhbmNoOnN0cmluZywgcGF0aDpzdHJpbmcsIGZuKTogQm9vbGVhbiB7XG4gICAgICB2YXIgYW5zd2VyID0gZmFsc2U7XG4gICAgICB0aGlzLmdldFBhZ2UoYnJhbmNoLCBwYXRoLCBudWxsLCAoZGF0YSkgPT4ge1xuICAgICAgICBpZiAoZGF0YS5kaXJlY3RvcnkpIHtcbiAgICAgICAgICBpZiAoZGF0YS5jaGlsZHJlbi5sZW5ndGgpIHtcbiAgICAgICAgICAgIGFuc3dlciA9IHRydWU7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGFuc3dlciA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgbG9nLmluZm8oXCJleGlzdHMgXCIgKyBwYXRoICsgXCIgYW5zd2VyID0gXCIgKyBhbnN3ZXIpO1xuICAgICAgICBpZiAoYW5ndWxhci5pc0Z1bmN0aW9uKGZuKSkge1xuICAgICAgICAgIGZuKGFuc3dlcik7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIGFuc3dlcjtcbiAgICB9XG5cbiAgICBwdWJsaWMgcmV2ZXJ0VG8oYnJhbmNoOnN0cmluZywgb2JqZWN0SWQ6c3RyaW5nLCBibG9iUGF0aDpzdHJpbmcsIGNvbW1pdE1lc3NhZ2U6c3RyaW5nLCBmbikge1xuICAgICAgaWYgKCFjb21taXRNZXNzYWdlKSB7XG4gICAgICAgIGNvbW1pdE1lc3NhZ2UgPSBcIlJldmVydGluZyBcIiArIGJsb2JQYXRoICsgXCIgY29tbWl0IFwiICsgKG9iamVjdElkIHx8IGJyYW5jaCk7XG4gICAgICB9XG4gICAgICB2YXIgcXVlcnkgPSBudWxsO1xuICAgICAgaWYgKGJyYW5jaCkge1xuICAgICAgICBxdWVyeSA9IFwicmVmPVwiICsgYnJhbmNoO1xuICAgICAgfVxuICAgICAgaWYgKGNvbW1pdE1lc3NhZ2UpIHtcbiAgICAgICAgcXVlcnkgPSAocXVlcnkgPyBxdWVyeSArIFwiJlwiIDogXCJcIikgKyBcIm1lc3NhZ2U9XCIgKyBlbmNvZGVVUklDb21wb25lbnQoY29tbWl0TWVzc2FnZSk7XG4gICAgICB9XG4gICAgICB2YXIgYm9keSA9IFwiXCI7XG4gICAgICB0aGlzLmRvUG9zdChVcmxIZWxwZXJzLmpvaW4oXCJyZXZlcnRcIiwgb2JqZWN0SWQsIGJsb2JQYXRoIHx8IFwiL1wiKSwgcXVlcnksIGJvZHksXG4gICAgICAgIChkYXRhLCBzdGF0dXMsIGhlYWRlcnMsIGNvbmZpZykgPT4ge1xuICAgICAgICAgIGZuKGRhdGEpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwdWJsaWMgcmVuYW1lKGJyYW5jaDpzdHJpbmcsIG9sZFBhdGg6c3RyaW5nLCAgbmV3UGF0aDpzdHJpbmcsIGNvbW1pdE1lc3NhZ2U6c3RyaW5nLCBmbikge1xuICAgICAgaWYgKCFjb21taXRNZXNzYWdlKSB7XG4gICAgICAgIGNvbW1pdE1lc3NhZ2UgPSBcIlJlbmFtaW5nIHBhZ2UgXCIgKyBvbGRQYXRoICsgXCIgdG8gXCIgKyBuZXdQYXRoO1xuICAgICAgfVxuICAgICAgdmFyIHF1ZXJ5ID0gbnVsbDtcbiAgICAgIGlmIChicmFuY2gpIHtcbiAgICAgICAgcXVlcnkgPSBcInJlZj1cIiArIGJyYW5jaDtcbiAgICAgIH1cbiAgICAgIGlmIChjb21taXRNZXNzYWdlKSB7XG4gICAgICAgIHF1ZXJ5ID0gKHF1ZXJ5ID8gcXVlcnkgKyBcIiZcIiA6IFwiXCIpICsgXCJtZXNzYWdlPVwiICsgZW5jb2RlVVJJQ29tcG9uZW50KGNvbW1pdE1lc3NhZ2UpO1xuICAgICAgfVxuICAgICAgaWYgKG9sZFBhdGgpIHtcbiAgICAgICAgcXVlcnkgPSAocXVlcnkgPyBxdWVyeSArIFwiJlwiIDogXCJcIikgKyBcIm9sZD1cIiArIGVuY29kZVVSSUNvbXBvbmVudChvbGRQYXRoKTtcbiAgICAgIH1cbiAgICAgIHZhciBib2R5ID0gXCJcIjtcbiAgICAgIHRoaXMuZG9Qb3N0KFVybEhlbHBlcnMuam9pbihcIm12XCIsIG5ld1BhdGggfHwgXCIvXCIpLCBxdWVyeSwgYm9keSxcbiAgICAgICAgKGRhdGEsIHN0YXR1cywgaGVhZGVycywgY29uZmlnKSA9PiB7XG4gICAgICAgICAgZm4oZGF0YSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHB1YmxpYyByZW1vdmVQYWdlKGJyYW5jaDpzdHJpbmcsIHBhdGg6c3RyaW5nLCBjb21taXRNZXNzYWdlOnN0cmluZywgZm4pIHtcbiAgICAgIGlmICghY29tbWl0TWVzc2FnZSkge1xuICAgICAgICBjb21taXRNZXNzYWdlID0gXCJSZW1vdmluZyBwYWdlIFwiICsgcGF0aDtcbiAgICAgIH1cbiAgICAgIHZhciBxdWVyeSA9IG51bGw7XG4gICAgICBpZiAoYnJhbmNoKSB7XG4gICAgICAgIHF1ZXJ5ID0gXCJyZWY9XCIgKyBicmFuY2g7XG4gICAgICB9XG4gICAgICBpZiAoY29tbWl0TWVzc2FnZSkge1xuICAgICAgICBxdWVyeSA9IChxdWVyeSA/IHF1ZXJ5ICsgXCImXCIgOiBcIlwiKSArIFwibWVzc2FnZT1cIiArIGVuY29kZVVSSUNvbXBvbmVudChjb21taXRNZXNzYWdlKTtcbiAgICAgIH1cbiAgICAgIHZhciBib2R5ID0gXCJcIjtcbiAgICAgIHRoaXMuZG9Qb3N0KFVybEhlbHBlcnMuam9pbihcInJtXCIsIHBhdGggfHwgXCIvXCIpLCBxdWVyeSwgYm9keSxcbiAgICAgICAgKGRhdGEsIHN0YXR1cywgaGVhZGVycywgY29uZmlnKSA9PiB7XG4gICAgICAgICAgZm4oZGF0YSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHB1YmxpYyByZW1vdmVQYWdlcyhicmFuY2g6c3RyaW5nLCBwYXRoczpBcnJheTxzdHJpbmc+LCBjb21taXRNZXNzYWdlOnN0cmluZywgZm4pIHtcbiAgICAgIGlmICghY29tbWl0TWVzc2FnZSkge1xuICAgICAgICBjb21taXRNZXNzYWdlID0gXCJSZW1vdmluZyBwYWdlXCIgKyAocGF0aHMubGVuZ3RoID4gMSA/IFwic1wiIDogXCJcIikgKyBcIiBcIiArIHBhdGhzLmpvaW4oXCIsIFwiKTtcbiAgICAgIH1cbiAgICAgIHZhciBxdWVyeSA9IG51bGw7XG4gICAgICBpZiAoYnJhbmNoKSB7XG4gICAgICAgIHF1ZXJ5ID0gXCJyZWY9XCIgKyBicmFuY2g7XG4gICAgICB9XG4gICAgICBpZiAoY29tbWl0TWVzc2FnZSkge1xuICAgICAgICBxdWVyeSA9IChxdWVyeSA/IHF1ZXJ5ICsgXCImXCIgOiBcIlwiKSArIFwibWVzc2FnZT1cIiArIGVuY29kZVVSSUNvbXBvbmVudChjb21taXRNZXNzYWdlKTtcbiAgICAgIH1cbiAgICAgIHZhciBib2R5ID0gcGF0aHM7XG4gICAgICB0aGlzLmRvUG9zdChVcmxIZWxwZXJzLmpvaW4oXCJybVwiKSwgcXVlcnksIGJvZHksXG4gICAgICAgIChkYXRhLCBzdGF0dXMsIGhlYWRlcnMsIGNvbmZpZykgPT4ge1xuICAgICAgICAgIGZuKGRhdGEpO1xuICAgICAgICB9KTtcbiAgICB9XG5cblxuXG4gICAgcHJpdmF0ZSBkb0dldChwYXRoLCBxdWVyeSwgc3VjY2Vzc0ZuLCBlcnJvckZuID0gbnVsbCwgY29uZmlnID0gbnVsbCkge1xuICAgICAgdmFyIHVybCA9IEZvcmdlLmNyZWF0ZUh0dHBVcmwoVXJsSGVscGVycy5qb2luKHRoaXMuYmFzZVVybCwgcGF0aCkpO1xuICAgICAgaWYgKHF1ZXJ5KSB7XG4gICAgICAgIHVybCArPSBcIiZcIiArIHF1ZXJ5O1xuICAgICAgfVxuICAgICAgaWYgKCFlcnJvckZuKSB7XG4gICAgICAgIGVycm9yRm4gPSAoZGF0YSwgc3RhdHVzLCBoZWFkZXJzLCBjb25maWcpID0+IHtcbiAgICAgICAgICBsb2cud2FybihcImZhaWxlZCB0byBsb2FkISBcIiArIHVybCArIFwiLiBzdGF0dXM6IFwiICsgc3RhdHVzICsgXCIgZGF0YTogXCIgKyBkYXRhKTtcbiAgICAgICAgfTtcblxuICAgICAgfVxuICAgICAgaWYgKCFjb25maWcpIHtcbiAgICAgICAgY29uZmlnID0gdGhpcy5jb25maWc7XG4gICAgICB9XG4gICAgICB0aGlzLiRodHRwLmdldCh1cmwsIGNvbmZpZykuXG4gICAgICAgIHN1Y2Nlc3Moc3VjY2Vzc0ZuKS5cbiAgICAgICAgZXJyb3IoZXJyb3JGbik7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBkb1Bvc3QocGF0aCwgcXVlcnksIGJvZHksIHN1Y2Nlc3NGbiwgZXJyb3JGbiA9IG51bGwpIHtcbiAgICAgIHZhciB1cmwgPSBGb3JnZS5jcmVhdGVIdHRwVXJsKFVybEhlbHBlcnMuam9pbih0aGlzLmJhc2VVcmwsIHBhdGgpKTtcbiAgICAgIGlmIChxdWVyeSkge1xuICAgICAgICB1cmwgKz0gXCImXCIgKyBxdWVyeTtcbiAgICAgIH1cbiAgICAgIGlmICghZXJyb3JGbikge1xuICAgICAgICBlcnJvckZuID0gKGRhdGEsIHN0YXR1cywgaGVhZGVycywgY29uZmlnKSA9PiB7XG4gICAgICAgICAgbG9nLndhcm4oXCJmYWlsZWQgdG8gbG9hZCEgXCIgKyB1cmwgKyBcIi4gc3RhdHVzOiBcIiArIHN0YXR1cyArIFwiIGRhdGE6IFwiICsgZGF0YSk7XG4gICAgICAgIH07XG5cbiAgICAgIH1cbiAgICAgIHRoaXMuJGh0dHAucG9zdCh1cmwsIGJvZHksIHRoaXMuY29uZmlnKS5cbiAgICAgICAgc3VjY2VzcyhzdWNjZXNzRm4pLlxuICAgICAgICBlcnJvcihlcnJvckZuKTtcbiAgICB9XG5cblxuICAgIHByaXZhdGUgZG9Qb3N0Rm9ybShwYXRoLCBxdWVyeSwgYm9keSwgc3VjY2Vzc0ZuLCBlcnJvckZuID0gbnVsbCkge1xuICAgICAgdmFyIHVybCA9IEZvcmdlLmNyZWF0ZUh0dHBVcmwoVXJsSGVscGVycy5qb2luKHRoaXMuYmFzZVVybCwgcGF0aCkpO1xuICAgICAgaWYgKHF1ZXJ5KSB7XG4gICAgICAgIHVybCArPSBcIiZcIiArIHF1ZXJ5O1xuICAgICAgfVxuICAgICAgaWYgKCFlcnJvckZuKSB7XG4gICAgICAgIGVycm9yRm4gPSAoZGF0YSwgc3RhdHVzLCBoZWFkZXJzLCBjb25maWcpID0+IHtcbiAgICAgICAgICBsb2cud2FybihcImZhaWxlZCB0byBsb2FkISBcIiArIHVybCArIFwiLiBzdGF0dXM6IFwiICsgc3RhdHVzICsgXCIgZGF0YTogXCIgKyBkYXRhKTtcbiAgICAgICAgfTtcblxuICAgICAgfVxuICAgICAgdmFyIGNvbmZpZyA9IEZvcmdlLmNyZWF0ZUh0dHBDb25maWcoKTtcbiAgICAgIGlmICghY29uZmlnLmhlYWRlcnMpIHtcbiAgICAgICAgY29uZmlnLmhlYWRlcnMgPSB7fTtcbiAgICAgIH1cbiAgICAgIGNvbmZpZy5oZWFkZXJzW1wiQ29udGVudC1UeXBlXCJdID0gXCJhcHBsaWNhdGlvbi94LXd3dy1mb3JtLXVybGVuY29kZWQ7IGNoYXJzZXQ9dXRmLThcIjtcblxuICAgICAgdGhpcy4kaHR0cC5wb3N0KHVybCwgYm9keSwgY29uZmlnKS5cbiAgICAgICAgc3VjY2VzcyhzdWNjZXNzRm4pLlxuICAgICAgICBlcnJvcihlcnJvckZuKTtcbiAgICB9XG5cblxuXG4gICAgcHVibGljIGNvbXBsZXRlUGF0aChicmFuY2g6c3RyaW5nLCBjb21wbGV0aW9uVGV4dDpzdHJpbmcsIGRpcmVjdG9yaWVzT25seTpib29sZWFuLCBmbikge1xuLypcbiAgICAgIHJldHVybiB0aGlzLmdpdCgpLmNvbXBsZXRlUGF0aChicmFuY2gsIGNvbXBsZXRpb25UZXh0LCBkaXJlY3Rvcmllc09ubHksIGZuKTtcbiovXG4gICAgfVxuXG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIHRoZSBmdWxsIHBhdGggdG8gdXNlIGluIHRoZSBnaXQgcmVwb1xuICAgICAqIEBtZXRob2QgZ2V0UGF0aFxuICAgICAqIEBmb3IgR2l0V2lraVJlcG9zaXRvcnlcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gcGF0aFxuICAgICAqIEByZXR1cm4ge1N0cmluZ3tcbiAgICAgKi9cbiAgICBwdWJsaWMgZ2V0UGF0aChwYXRoOnN0cmluZykge1xuICAgICAgdmFyIGRpcmVjdG9yeVByZWZpeCA9IHRoaXMuZGlyZWN0b3J5UHJlZml4O1xuICAgICAgcmV0dXJuIChkaXJlY3RvcnlQcmVmaXgpID8gZGlyZWN0b3J5UHJlZml4ICsgcGF0aCA6IHBhdGg7XG4gICAgfVxuXG4gICAgcHVibGljIGdldExvZ1BhdGgocGF0aDpzdHJpbmcpIHtcbiAgICAgIHJldHVybiBDb3JlLnRyaW1MZWFkaW5nKHRoaXMuZ2V0UGF0aChwYXRoKSwgXCIvXCIpO1xuICAgIH1cblxuXG4gICAgLyoqXG4gICAgICogR2V0IHRoZSBjb250ZW50cyBvZiBhIGJsb2JQYXRoIGZvciBhIGdpdmVuIGNvbW1pdCBvYmplY3RJZFxuICAgICAqIEBtZXRob2QgZ2V0Q29udGVudFxuICAgICAqIEBmb3IgR2l0V2lraVJlcG9zaXRvcnlcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gb2JqZWN0SWRcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gYmxvYlBhdGhcbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBmblxuICAgICAqIEByZXR1cm4ge2FueX1cbiAgICAgKi9cbiAgICBwdWJsaWMgZ2V0Q29udGVudChvYmplY3RJZDpzdHJpbmcsIGJsb2JQYXRoOnN0cmluZywgZm4pIHtcbi8qXG4gICAgICB2YXIgZnVsbFBhdGggPSB0aGlzLmdldExvZ1BhdGgoYmxvYlBhdGgpO1xuICAgICAgdmFyIGdpdCA9IHRoaXMuZ2l0KCk7XG4gICAgICBpZiAoZ2l0KSB7XG4gICAgICAgIGdpdC5nZXRDb250ZW50KG9iamVjdElkLCBmdWxsUGF0aCwgZm4pO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGdpdDtcbiovXG4gICAgfVxuXG5cblxuICAgIC8qKlxuICAgICAqIEdldCB0aGUgSlNPTiBjb250ZW50cyBvZiB0aGUgcGF0aCB3aXRoIG9wdGlvbmFsIG5hbWUgd2lsZGNhcmQgYW5kIHNlYXJjaFxuICAgICAqIEBtZXRob2QganNvbkNoaWxkQ29udGVudHNcbiAgICAgKiBAZm9yIEdpdFdpa2lSZXBvc2l0b3J5XG4gICAgICogQHBhcmFtIHtTdHJpbmd9IHBhdGhcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gbmFtZVdpbGRjYXJkXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IHNlYXJjaFxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGZuXG4gICAgICogQHJldHVybiB7YW55fVxuICAgICAqL1xuICAgIHB1YmxpYyBqc29uQ2hpbGRDb250ZW50cyhwYXRoOnN0cmluZywgbmFtZVdpbGRjYXJkOnN0cmluZywgc2VhcmNoOnN0cmluZywgZm4pIHtcbi8qXG4gICAgICB2YXIgZnVsbFBhdGggPSB0aGlzLmdldExvZ1BhdGgocGF0aCk7XG4gICAgICB2YXIgZ2l0ID0gdGhpcy5naXQoKTtcbiAgICAgIGlmIChnaXQpIHtcbiAgICAgICAgZ2l0LnJlYWRKc29uQ2hpbGRDb250ZW50KGZ1bGxQYXRoLCBuYW1lV2lsZGNhcmQsIHNlYXJjaCwgZm4pO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGdpdDtcbiovXG4gICAgfVxuXG5cbiAgICBwdWJsaWMgZ2l0KCkge1xuLypcbiAgICAgIHZhciByZXBvc2l0b3J5ID0gdGhpcy5mYWN0b3J5TWV0aG9kKCk7XG4gICAgICBpZiAoIXJlcG9zaXRvcnkpIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJObyByZXBvc2l0b3J5IHlldCEgVE9ETyB3ZSBzaG91bGQgdXNlIGEgbG9jYWwgaW1wbCFcIik7XG4gICAgICB9XG4gICAgICByZXR1cm4gcmVwb3NpdG9yeTtcbiovXG4gICAgfVxuICB9XG59XG4iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vaW5jbHVkZXMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwid2lraUhlbHBlcnMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwid2lraVBsdWdpbi50c1wiLz5cblxubW9kdWxlIFdpa2kge1xuXG4gIGV4cG9ydCB2YXIgVG9wTGV2ZWxDb250cm9sbGVyID0gX21vZHVsZS5jb250cm9sbGVyKFwiV2lraS5Ub3BMZXZlbENvbnRyb2xsZXJcIiwgWyckc2NvcGUnLCAnJHJvdXRlJywgJyRyb3V0ZVBhcmFtcycsICgkc2NvcGUsICRyb3V0ZSwgJHJvdXRlUGFyYW1zKSA9PiB7XG5cbiAgfV0pO1xuXG59XG4iLCIvLy8gQ29weXJpZ2h0IDIwMTQtMjAxNSBSZWQgSGF0LCBJbmMuIGFuZC9vciBpdHMgYWZmaWxpYXRlc1xuLy8vIGFuZCBvdGhlciBjb250cmlidXRvcnMgYXMgaW5kaWNhdGVkIGJ5IHRoZSBAYXV0aG9yIHRhZ3MuXG4vLy9cbi8vLyBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuLy8vIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbi8vLyBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbi8vL1xuLy8vICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4vLy9cbi8vLyBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4vLy8gZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuLy8vIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuLy8vIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbi8vLyBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cblxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL2luY2x1ZGVzLnRzXCIvPlxubW9kdWxlIE1haW4ge1xuXG4gIGV4cG9ydCB2YXIgcGx1Z2luTmFtZSA9IFwiZmFicmljOC1jb25zb2xlXCI7XG5cbiAgZXhwb3J0IHZhciBsb2c6IExvZ2dpbmcuTG9nZ2VyID0gTG9nZ2VyLmdldChwbHVnaW5OYW1lKTtcblxuICBleHBvcnQgdmFyIHRlbXBsYXRlUGF0aCA9IFwicGx1Z2lucy9tYWluL2h0bWxcIjtcblxuICAvLyBrdWJlcm5ldGVzIHNlcnZpY2UgbmFtZXNcbiAgZXhwb3J0IHZhciBjaGF0U2VydmljZU5hbWUgPSBcImxldHNjaGF0XCI7XG4gIGV4cG9ydCB2YXIgZ3JhZmFuYVNlcnZpY2VOYW1lID0gXCJncmFmYW5hXCI7XG4gIGV4cG9ydCB2YXIgYXBwTGlicmFyeVNlcnZpY2VOYW1lID0gXCJhcHAtbGlicmFyeVwiO1xuXG4gIGV4cG9ydCB2YXIgdmVyc2lvbjphbnkgPSB7fTtcblxufVxuIiwiLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vaW5jbHVkZXMudHNcIi8+XG5tb2R1bGUgRm9yZ2Uge1xuXG4gIGV4cG9ydCB2YXIgY29udGV4dCA9ICcvd29ya3NwYWNlcy86bmFtZXNwYWNlL2ZvcmdlJztcblxuICBleHBvcnQgdmFyIGhhc2ggPSAnIycgKyBjb250ZXh0O1xuICBleHBvcnQgdmFyIHBsdWdpbk5hbWUgPSAnRm9yZ2UnO1xuICBleHBvcnQgdmFyIHBsdWdpblBhdGggPSAncGx1Z2lucy9mb3JnZS8nO1xuICBleHBvcnQgdmFyIHRlbXBsYXRlUGF0aCA9IHBsdWdpblBhdGggKyAnaHRtbC8nO1xuICBleHBvcnQgdmFyIGxvZzpMb2dnaW5nLkxvZ2dlciA9IExvZ2dlci5nZXQocGx1Z2luTmFtZSk7XG5cbiAgZXhwb3J0IHZhciBkZWZhdWx0SWNvblVybCA9IENvcmUudXJsKFwiL2ltZy9mb3JnZS5zdmdcIik7XG5cbiAgZXhwb3J0IHZhciBnb2dzU2VydmljZU5hbWUgPSBLdWJlcm5ldGVzLmdvZ3NTZXJ2aWNlTmFtZTtcbiAgZXhwb3J0IHZhciBvcmlvblNlcnZpY2VOYW1lID0gXCJvcmlvblwiO1xuXG4gIGV4cG9ydCB2YXIgbG9nZ2VkSW5Ub0dvZ3MgPSBmYWxzZTtcblxuICBleHBvcnQgZnVuY3Rpb24gaXNGb3JnZSh3b3Jrc3BhY2UpIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiBpbml0U2NvcGUoJHNjb3BlLCAkbG9jYXRpb24sICRyb3V0ZVBhcmFtcykge1xuICAgICRzY29wZS5wcm9qZWN0SWQgPSAkcm91dGVQYXJhbXNbXCJwcm9qZWN0XCJdO1xuICAgICRzY29wZS4kd29ya3NwYWNlTGluayA9IERldmVsb3Blci53b3Jrc3BhY2VMaW5rKCk7XG4gICAgJHNjb3BlLiRwcm9qZWN0TGluayA9IERldmVsb3Blci5wcm9qZWN0TGluaygkc2NvcGUucHJvamVjdElkKTtcbiAgICAkc2NvcGUuYnJlYWRjcnVtYkNvbmZpZyA9IERldmVsb3Blci5jcmVhdGVQcm9qZWN0QnJlYWRjcnVtYnMoJHNjb3BlLnByb2plY3RJZCk7XG4gICAgJHNjb3BlLnN1YlRhYkNvbmZpZyA9IERldmVsb3Blci5jcmVhdGVQcm9qZWN0U3ViTmF2QmFycygkc2NvcGUucHJvamVjdElkKTtcbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiBjb21tYW5kTGluayhwcm9qZWN0SWQsIG5hbWUsIHJlc291cmNlUGF0aCkge1xuICAgIHZhciBsaW5rID0gRGV2ZWxvcGVyLnByb2plY3RMaW5rKHByb2plY3RJZCk7XG4gICAgaWYgKG5hbWUpIHtcbiAgICAgIGlmIChyZXNvdXJjZVBhdGgpIHtcbiAgICAgICAgcmV0dXJuIFVybEhlbHBlcnMuam9pbihsaW5rLCBcIi9mb3JnZS9jb21tYW5kXCIsIG5hbWUsIHJlc291cmNlUGF0aCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gVXJsSGVscGVycy5qb2luKGxpbmssIFwiL2ZvcmdlL2NvbW1hbmQvXCIsIG5hbWUpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiBjb21tYW5kc0xpbmsocmVzb3VyY2VQYXRoLCBwcm9qZWN0SWQpIHtcbiAgICB2YXIgbGluayA9IERldmVsb3Blci5wcm9qZWN0TGluayhwcm9qZWN0SWQpO1xuICAgIGlmIChyZXNvdXJjZVBhdGgpIHtcbiAgICAgIHJldHVybiBVcmxIZWxwZXJzLmpvaW4obGluaywgXCIvZm9yZ2UvY29tbWFuZHMvdXNlclwiLCByZXNvdXJjZVBhdGgpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gVXJsSGVscGVycy5qb2luKGxpbmssIFwiL2ZvcmdlL2NvbW1hbmRzXCIpO1xuICAgIH1cbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiByZXBvc0FwaVVybChGb3JnZUFwaVVSTCkge1xuICAgIHJldHVybiBVcmxIZWxwZXJzLmpvaW4oRm9yZ2VBcGlVUkwsIFwiL3JlcG9zXCIpO1xuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIHJlcG9BcGlVcmwoRm9yZ2VBcGlVUkwsIHBhdGgpIHtcbiAgICByZXR1cm4gVXJsSGVscGVycy5qb2luKEZvcmdlQXBpVVJMLCBcIi9yZXBvcy91c2VyXCIsIHBhdGgpO1xuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIGNvbW1hbmRBcGlVcmwoRm9yZ2VBcGlVUkwsIGNvbW1hbmRJZCwgcmVzb3VyY2VQYXRoID0gbnVsbCkge1xuICAgIHJldHVybiBVcmxIZWxwZXJzLmpvaW4oRm9yZ2VBcGlVUkwsIFwiY29tbWFuZFwiLCBjb21tYW5kSWQsIHJlc291cmNlUGF0aCk7XG4gIH1cblxuICBleHBvcnQgZnVuY3Rpb24gZXhlY3V0ZUNvbW1hbmRBcGlVcmwoRm9yZ2VBcGlVUkwsIGNvbW1hbmRJZCkge1xuICAgIHJldHVybiBVcmxIZWxwZXJzLmpvaW4oRm9yZ2VBcGlVUkwsIFwiY29tbWFuZFwiLCBcImV4ZWN1dGVcIiwgY29tbWFuZElkKTtcbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiB2YWxpZGF0ZUNvbW1hbmRBcGlVcmwoRm9yZ2VBcGlVUkwsIGNvbW1hbmRJZCkge1xuICAgIHJldHVybiBVcmxIZWxwZXJzLmpvaW4oRm9yZ2VBcGlVUkwsIFwiY29tbWFuZFwiLCBcInZhbGlkYXRlXCIsIGNvbW1hbmRJZCk7XG4gIH1cblxuICBleHBvcnQgZnVuY3Rpb24gY29tbWFuZElucHV0QXBpVXJsKEZvcmdlQXBpVVJMLCBjb21tYW5kSWQsIHJlc291cmNlUGF0aCkge1xuICAgIHJldHVybiBVcmxIZWxwZXJzLmpvaW4oRm9yZ2VBcGlVUkwsIFwiY29tbWFuZElucHV0XCIsIGNvbW1hbmRJZCwgcmVzb3VyY2VQYXRoKTtcbiAgfVxuXG5cblxuICAvKipcbiAgICogUmV0dXJucyB0aGUgcHJvamVjdCBmb3IgdGhlIGdpdmVuIHJlc291cmNlIHBhdGhcbiAgICovXG4gIGZ1bmN0aW9uIG1vZGVsUHJvamVjdChGb3JnZU1vZGVsLCByZXNvdXJjZVBhdGgpIHtcbiAgICBpZiAocmVzb3VyY2VQYXRoKSB7XG4gICAgICB2YXIgcHJvamVjdCA9IEZvcmdlTW9kZWwucHJvamVjdHNbcmVzb3VyY2VQYXRoXTtcbiAgICAgIGlmICghcHJvamVjdCkge1xuICAgICAgICBwcm9qZWN0ID0ge307XG4gICAgICAgIEZvcmdlTW9kZWwucHJvamVjdHNbcmVzb3VyY2VQYXRoXSA9IHByb2plY3Q7XG4gICAgICB9XG4gICAgICByZXR1cm4gcHJvamVjdDtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIEZvcmdlTW9kZWwucm9vdFByb2plY3Q7XG4gICAgfVxuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIHNldE1vZGVsQ29tbWFuZHMoRm9yZ2VNb2RlbCwgcmVzb3VyY2VQYXRoLCBjb21tYW5kcykge1xuICAgIHZhciBwcm9qZWN0ID0gbW9kZWxQcm9qZWN0KEZvcmdlTW9kZWwsIHJlc291cmNlUGF0aCk7XG4gICAgcHJvamVjdC4kY29tbWFuZHMgPSBjb21tYW5kcztcbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiBnZXRNb2RlbENvbW1hbmRzKEZvcmdlTW9kZWwsIHJlc291cmNlUGF0aCkge1xuICAgIHZhciBwcm9qZWN0ID0gbW9kZWxQcm9qZWN0KEZvcmdlTW9kZWwsIHJlc291cmNlUGF0aCk7XG4gICAgcmV0dXJuIHByb2plY3QuJGNvbW1hbmRzIHx8IFtdO1xuICB9XG5cbiAgZnVuY3Rpb24gbW9kZWxDb21tYW5kSW5wdXRNYXAoRm9yZ2VNb2RlbCwgcmVzb3VyY2VQYXRoKSB7XG4gICAgdmFyIHByb2plY3QgPSBtb2RlbFByb2plY3QoRm9yZ2VNb2RlbCwgcmVzb3VyY2VQYXRoKTtcbiAgICB2YXIgY29tbWFuZElucHV0cyA9IHByb2plY3QuJGNvbW1hbmRJbnB1dHM7XG4gICAgaWYgKCFjb21tYW5kSW5wdXRzKSB7XG4gICAgICBjb21tYW5kSW5wdXRzID0ge307XG4gICAgICBwcm9qZWN0LiRjb21tYW5kSW5wdXRzID0gY29tbWFuZElucHV0cztcbiAgICB9XG4gICAgcmV0dXJuIGNvbW1hbmRJbnB1dHM7XG4gIH1cblxuICBleHBvcnQgZnVuY3Rpb24gZ2V0TW9kZWxDb21tYW5kSW5wdXRzKEZvcmdlTW9kZWwsIHJlc291cmNlUGF0aCwgaWQpIHtcbiAgICB2YXIgY29tbWFuZElucHV0cyA9IG1vZGVsQ29tbWFuZElucHV0TWFwKEZvcmdlTW9kZWwsIHJlc291cmNlUGF0aCk7XG4gICAgcmV0dXJuIGNvbW1hbmRJbnB1dHNbaWRdO1xuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIHNldE1vZGVsQ29tbWFuZElucHV0cyhGb3JnZU1vZGVsLCByZXNvdXJjZVBhdGgsIGlkLCBpdGVtKSB7XG4gICAgdmFyIGNvbW1hbmRJbnB1dHMgPSBtb2RlbENvbW1hbmRJbnB1dE1hcChGb3JnZU1vZGVsLCByZXNvdXJjZVBhdGgpO1xuICAgIHJldHVybiBjb21tYW5kSW5wdXRzW2lkXSA9IGl0ZW07XG4gIH1cblxuICBleHBvcnQgZnVuY3Rpb24gZW5yaWNoUmVwbyhyZXBvKSB7XG4gICAgdmFyIG93bmVyID0gcmVwby5vd25lciB8fCB7fTtcbiAgICB2YXIgdXNlciA9IG93bmVyLnVzZXJuYW1lIHx8IHJlcG8udXNlcjtcbiAgICB2YXIgbmFtZSA9IHJlcG8ubmFtZTtcbiAgICB2YXIgcHJvamVjdElkID0gbmFtZTtcbiAgICB2YXIgYXZhdGFyX3VybCA9IG93bmVyLmF2YXRhcl91cmw7XG4gICAgaWYgKGF2YXRhcl91cmwgJiYgYXZhdGFyX3VybC5zdGFydHNXaXRoKFwiaHR0cC8vXCIpKSB7XG4gICAgICBhdmF0YXJfdXJsID0gXCJodHRwOi8vXCIgKyBhdmF0YXJfdXJsLnN1YnN0cmluZyg2KTtcbiAgICAgIG93bmVyLmF2YXRhcl91cmwgPSBhdmF0YXJfdXJsO1xuICAgIH1cbiAgICBpZiAodXNlciAmJiBuYW1lKSB7XG4gICAgICB2YXIgcmVzb3VyY2VQYXRoID0gdXNlciArIFwiL1wiICsgbmFtZTtcbiAgICAgIHJlcG8uJGNvbW1hbmRzTGluayA9IGNvbW1hbmRzTGluayhyZXNvdXJjZVBhdGgsIHByb2plY3RJZCk7XG4gICAgICByZXBvLiRidWlsZHNMaW5rID0gXCIva3ViZXJuZXRlcy9idWlsZHM/cT0vXCIgKyByZXNvdXJjZVBhdGggKyBcIi5naXRcIjtcbiAgICAgIHZhciBpbmplY3RvciA9IEhhd3Rpb0NvcmUuaW5qZWN0b3I7XG4gICAgICBpZiAoaW5qZWN0b3IpIHtcbiAgICAgICAgdmFyIFNlcnZpY2VSZWdpc3RyeSA9IGluamVjdG9yLmdldChcIlNlcnZpY2VSZWdpc3RyeVwiKTtcbiAgICAgICAgaWYgKFNlcnZpY2VSZWdpc3RyeSkge1xuICAgICAgICAgIHZhciBvcmlvbkxpbmsgPSBTZXJ2aWNlUmVnaXN0cnkuc2VydmljZUxpbmsob3Jpb25TZXJ2aWNlTmFtZSk7XG4gICAgICAgICAgdmFyIGdvZ3NTZXJ2aWNlID0gU2VydmljZVJlZ2lzdHJ5LmZpbmRTZXJ2aWNlKGdvZ3NTZXJ2aWNlTmFtZSk7XG4gICAgICAgICAgaWYgKG9yaW9uTGluayAmJiBnb2dzU2VydmljZSkge1xuICAgICAgICAgICAgdmFyIHBvcnRhbElwID0gZ29nc1NlcnZpY2UucG9ydGFsSVA7XG4gICAgICAgICAgICBpZiAocG9ydGFsSXApIHtcbiAgICAgICAgICAgICAgdmFyIHBvcnQgPSBnb2dzU2VydmljZS5wb3J0O1xuICAgICAgICAgICAgICB2YXIgcG9ydFRleHQgPSAocG9ydCAmJiBwb3J0ICE9PSA4MCAmJiBwb3J0ICE9PSA0NDMpID8gXCI6XCIgKyBwb3J0IDogXCJcIjtcbiAgICAgICAgICAgICAgdmFyIHByb3RvY29sID0gKHBvcnQgJiYgcG9ydCA9PT0gNDQzKSA/IFwiaHR0cHM6Ly9cIiA6IFwiaHR0cDovL1wiO1xuICAgICAgICAgICAgICB2YXIgZ2l0Q2xvbmVVcmwgPSBVcmxIZWxwZXJzLmpvaW4ocHJvdG9jb2wgKyBwb3J0YWxJcCArIHBvcnRUZXh0ICsgXCIvXCIsIHJlc291cmNlUGF0aCArIFwiLmdpdFwiKTtcblxuICAgICAgICAgICAgICByZXBvLiRvcGVuUHJvamVjdExpbmsgPSBVcmxIZWxwZXJzLmpvaW4ob3Jpb25MaW5rLFxuICAgICAgICAgICAgICAgIFwiL2dpdC9naXQtcmVwb3NpdG9yeS5odG1sIyxjcmVhdGVQcm9qZWN0Lm5hbWU9XCIgKyBuYW1lICsgXCIsY2xvbmVHaXQ9XCIgKyBnaXRDbG9uZVVybCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZUh0dHBDb25maWcoKSB7XG4gICAgdmFyIGF1dGhIZWFkZXIgPSBsb2NhbFN0b3JhZ2VbXCJnb2dzQXV0aG9yaXphdGlvblwiXTtcbiAgICB2YXIgZW1haWwgPSBsb2NhbFN0b3JhZ2VbXCJnb2dzRW1haWxcIl07XG4gICAgdmFyIGNvbmZpZyA9IHtcbiAgICAgIGhlYWRlcnM6IHtcbiAgICAgIH1cbi8qXG4gICAgICBoZWFkZXJzOiB7XG4gICAgICAgIEF1dGhvcml6YXRpb246IGF1dGhIZWFkZXIsXG4gICAgICAgIEVtYWlsOiBlbWFpbFxuICAgICAgfVxuKi9cbiAgICB9O1xuICAgIHJldHVybiBjb25maWc7XG4gIH1cblxuICBmdW5jdGlvbiBhZGRRdWVyeUFyZ3VtZW50KHVybCwgbmFtZSwgdmFsdWUpIHtcbiAgICBpZiAodXJsICYmIG5hbWUgJiYgdmFsdWUpIHtcbiAgICAgIHZhciBzZXAgPSAgKHVybC5pbmRleE9mKFwiP1wiKSA+PSAwKSA/IFwiJlwiIDogXCI/XCI7XG4gICAgICByZXR1cm4gdXJsICsgc2VwICsgIG5hbWUgKyBcIj1cIiArIGVuY29kZVVSSUNvbXBvbmVudCh2YWx1ZSk7XG4gICAgfVxuICAgIHJldHVybiB1cmw7XG4gIH1cblxuICBleHBvcnQgZnVuY3Rpb24gY3JlYXRlSHR0cFVybCh1cmwsIGF1dGhIZWFkZXIgPSBudWxsLCBlbWFpbCA9IG51bGwpIHtcbiAgICBhdXRoSGVhZGVyID0gYXV0aEhlYWRlciB8fCBsb2NhbFN0b3JhZ2VbXCJnb2dzQXV0aG9yaXphdGlvblwiXTtcbiAgICBlbWFpbCA9IGVtYWlsIHx8IGxvY2FsU3RvcmFnZVtcImdvZ3NFbWFpbFwiXTtcblxuICAgIHVybCA9IGFkZFF1ZXJ5QXJndW1lbnQodXJsLCBcIl9nb2dzQXV0aFwiLCBhdXRoSGVhZGVyKTtcbiAgICB1cmwgPSBhZGRRdWVyeUFyZ3VtZW50KHVybCwgXCJfZ29nc0VtYWlsXCIsIGVtYWlsKTtcbiAgICByZXR1cm4gdXJsO1xuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIGNvbW1hbmRNYXRjaGVzVGV4dChjb21tYW5kLCBmaWx0ZXJUZXh0KSB7XG4gICAgaWYgKGZpbHRlclRleHQpIHtcbiAgICAgIHJldHVybiBDb3JlLm1hdGNoRmlsdGVySWdub3JlQ2FzZShhbmd1bGFyLnRvSnNvbihjb21tYW5kKSwgZmlsdGVyVGV4dCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiBpc0xvZ2dlZEludG9Hb2dzKCkge1xuICAgIHZhciBsb2NhbFN0b3JhZ2UgPSBLdWJlcm5ldGVzLmluamVjdChcImxvY2FsU3RvcmFnZVwiKSB8fCB7fTtcbiAgICB2YXIgYXV0aEhlYWRlciA9IGxvY2FsU3RvcmFnZVtcImdvZ3NBdXRob3JpemF0aW9uXCJdO1xuICAgIC8vcmV0dXJuIGF1dGhIZWFkZXIgPyBsb2dnZWRJblRvR29ncyA6IGZhbHNlO1xuICAgIHJldHVybiBhdXRoSGVhZGVyID8gdHJ1ZSA6IGZhbHNlO1xuLypcbiAgICB2YXIgY29uZmlnID0gY3JlYXRlSHR0cENvbmZpZygpO1xuICAgIHJldHVybiBjb25maWcuaGVhZGVycy5BdXRob3JpemF0aW9uID8gdHJ1ZSA6IGZhbHNlO1xuKi9cbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiByZWRpcmVjdFRvR29nc0xvZ2luSWZSZXF1aXJlZCgkc2NvcGUsICRsb2NhdGlvbikge1xuICAgIGlmICghaXNMb2dnZWRJbnRvR29ncygpKSB7XG4gICAgICB2YXIgZGV2TGluayA9IERldmVsb3Blci5wcm9qZWN0TGluaygkc2NvcGUucHJvamVjdElkKTtcbiAgICAgIHZhciBsb2dpblBhZ2UgPSBVcmxIZWxwZXJzLmpvaW4oZGV2TGluaywgXCJmb3JnZS9yZXBvc1wiKTtcbiAgICAgIGxvZy5pbmZvKFwiTm90IGxvZ2dlZCBpbiBzbyByZWRpcmVjdGluZyB0byBcIiArIGxvZ2luUGFnZSk7XG4gICAgICAkbG9jYXRpb24ucGF0aChsb2dpblBhZ2UpXG4gICAgfVxuICB9XG59XG4iLCIvLy8gQ29weXJpZ2h0IDIwMTQtMjAxNSBSZWQgSGF0LCBJbmMuIGFuZC9vciBpdHMgYWZmaWxpYXRlc1xuLy8vIGFuZCBvdGhlciBjb250cmlidXRvcnMgYXMgaW5kaWNhdGVkIGJ5IHRoZSBAYXV0aG9yIHRhZ3MuXG4vLy9cbi8vLyBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuLy8vIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbi8vLyBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbi8vL1xuLy8vICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4vLy9cbi8vLyBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4vLy8gZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuLy8vIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuLy8vIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbi8vLyBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cblxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL2luY2x1ZGVzLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL2ZvcmdlL3RzL2ZvcmdlSGVscGVycy50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJtYWluR2xvYmFscy50c1wiLz5cblxubW9kdWxlIE1haW4ge1xuXG4gIGV4cG9ydCB2YXIgX21vZHVsZSA9IGFuZ3VsYXIubW9kdWxlKHBsdWdpbk5hbWUsIFtGb3JnZS5wbHVnaW5OYW1lXSk7XG5cbiAgdmFyIHRhYiA9IHVuZGVmaW5lZDtcblxuICBfbW9kdWxlLnJ1bigoJHJvb3RTY29wZSwgSGF3dGlvTmF2OiBIYXd0aW9NYWluTmF2LlJlZ2lzdHJ5LCBLdWJlcm5ldGVzTW9kZWwsIFNlcnZpY2VSZWdpc3RyeSwgcHJlZmVyZW5jZXNSZWdpc3RyeSkgPT4ge1xuXG4gICAgSGF3dGlvTmF2Lm9uKEhhd3Rpb01haW5OYXYuQWN0aW9ucy5DSEFOR0VELCBwbHVnaW5OYW1lLCAoaXRlbXMpID0+IHtcbiAgICAgIGl0ZW1zLmZvckVhY2goKGl0ZW0pID0+IHtcbiAgICAgICAgc3dpdGNoKGl0ZW0uaWQpIHtcbiAgICAgICAgICBjYXNlICdmb3JnZSc6XG4gICAgICAgICAgY2FzZSAnanZtJzpcbiAgICAgICAgICBjYXNlICd3aWtpJzpcbiAgICAgICAgICBjYXNlICdkb2NrZXItcmVnaXN0cnknOlxuICAgICAgICAgICAgaXRlbS5pc1ZhbGlkID0gKCkgPT4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH0pO1xuICAgIEhhd3Rpb05hdi5hZGQoe1xuICAgICAgaWQ6ICdsaWJyYXJ5JyxcbiAgICAgIHRpdGxlOiAoKSA9PiAnTGlicmFyeScsXG4gICAgICB0b29sdGlwOiAoKSA9PiAnVmlldyB0aGUgbGlicmFyeSBvZiBhcHBsaWNhdGlvbnMnLFxuICAgICAgaXNWYWxpZDogKCkgPT4gU2VydmljZVJlZ2lzdHJ5Lmhhc1NlcnZpY2UoYXBwTGlicmFyeVNlcnZpY2VOYW1lKSAmJiBTZXJ2aWNlUmVnaXN0cnkuaGFzU2VydmljZShcImFwcC1saWJyYXJ5LWpvbG9raWFcIiksXG4gICAgICBocmVmOiAoKSA9PiBcIi93aWtpL3ZpZXdcIixcbiAgICAgIGlzQWN0aXZlOiAoKSA9PiBmYWxzZVxuICAgIH0pO1xuXG4gICAgdmFyIGtpYmFuYVNlcnZpY2VOYW1lID0gS3ViZXJuZXRlcy5raWJhbmFTZXJ2aWNlTmFtZTtcblxuICAgIEhhd3Rpb05hdi5hZGQoe1xuICAgICAgaWQ6ICdraWJhbmEnLFxuICAgICAgdGl0bGU6ICgpID0+ICAnTG9ncycsXG4gICAgICB0b29sdGlwOiAoKSA9PiAnVmlldyBhbmQgc2VhcmNoIGFsbCBsb2dzIGFjcm9zcyBhbGwgY29udGFpbmVycyB1c2luZyBLaWJhbmEgYW5kIEVsYXN0aWNTZWFyY2gnLFxuICAgICAgaXNWYWxpZDogKCkgPT4gU2VydmljZVJlZ2lzdHJ5Lmhhc1NlcnZpY2Uoa2liYW5hU2VydmljZU5hbWUpLFxuICAgICAgaHJlZjogKCkgPT4gS3ViZXJuZXRlcy5raWJhbmFMb2dzTGluayhTZXJ2aWNlUmVnaXN0cnkpLFxuICAgICAgaXNBY3RpdmU6ICgpID0+IGZhbHNlXG4gICAgfSk7XG5cbiAgICBIYXd0aW9OYXYuYWRkKHtcbiAgICAgIGlkOiAnYXBpbWFuJyxcbiAgICAgIHRpdGxlOiAoKSA9PiAnQVBJIE1hbmFnZW1lbnQnLFxuICAgICAgdG9vbHRpcDogKCkgPT4gJ0FkZCBQb2xpY2llcyBhbmQgUGxhbnMgdG8geW91ciBBUElzIHdpdGggQXBpbWFuJyxcbiAgICAgIGlzVmFsaWQ6ICgpID0+IFNlcnZpY2VSZWdpc3RyeS5oYXNTZXJ2aWNlKCdhcGltYW4nKSxcbiAgICAgIG9sZEhyZWY6ICgpID0+IHsgLyogbm90aGluZyB0byBkbyAqLyB9LFxuICAgICAgaHJlZjogKCkgPT4ge1xuICAgICAgICB2YXIgaGFzaCA9IHtcbiAgICAgICAgICBiYWNrVG86IG5ldyBVUkkoKS50b1N0cmluZygpLFxuICAgICAgICAgIHRva2VuOiBIYXd0aW9PQXV0aC5nZXRPQXV0aFRva2VuKClcbiAgICAgICAgfTtcbiAgICAgICAgdmFyIHVyaSA9IG5ldyBVUkkoU2VydmljZVJlZ2lzdHJ5LnNlcnZpY2VMaW5rKCdhcGltYW4nKSk7XG4gICAgICAgIC8vIFRPRE8gaGF2ZSB0byBvdmVyd3JpdGUgdGhlIHBvcnQgaGVyZSBmb3Igc29tZSByZWFzb25cbiAgICAgICAgKDxhbnk+dXJpLnBvcnQoJzgwJykucXVlcnkoe30pLnBhdGgoJ2FwaW1hbnVpL2luZGV4Lmh0bWwnKSkuaGFzaChVUkkuZW5jb2RlKGFuZ3VsYXIudG9Kc29uKGhhc2gpKSk7XG4gICAgICAgIHJldHVybiB1cmkudG9TdHJpbmcoKTtcbiAgICAgIH0gICAgXG4gICAgfSk7XG5cbiAgICBIYXd0aW9OYXYuYWRkKHtcbiAgICAgIGlkOiAnZ3JhZmFuYScsXG4gICAgICB0aXRsZTogKCkgPT4gICdNZXRyaWNzJyxcbiAgICAgIHRvb2x0aXA6ICgpID0+ICdWaWV3cyBtZXRyaWNzIGFjcm9zcyBhbGwgY29udGFpbmVycyB1c2luZyBHcmFmYW5hIGFuZCBJbmZsdXhEQicsXG4gICAgICBpc1ZhbGlkOiAoKSA9PiBTZXJ2aWNlUmVnaXN0cnkuaGFzU2VydmljZShncmFmYW5hU2VydmljZU5hbWUpLFxuICAgICAgaHJlZjogKCkgPT4gU2VydmljZVJlZ2lzdHJ5LnNlcnZpY2VMaW5rKGdyYWZhbmFTZXJ2aWNlTmFtZSksXG4gICAgICBpc0FjdGl2ZTogKCkgPT4gZmFsc2VcbiAgICB9KTtcblxuICAgIEhhd3Rpb05hdi5hZGQoe1xuICAgICAgaWQ6IFwiY2hhdFwiLFxuICAgICAgdGl0bGU6ICgpID0+ICAnQ2hhdCcsXG4gICAgICB0b29sdGlwOiAoKSA9PiAnQ2hhdCByb29tIGZvciBkaXNjdXNzaW5nIHRoaXMgbmFtZXNwYWNlJyxcbiAgICAgIGlzVmFsaWQ6ICgpID0+IFNlcnZpY2VSZWdpc3RyeS5oYXNTZXJ2aWNlKGNoYXRTZXJ2aWNlTmFtZSksXG4gICAgICBocmVmOiAoKSA9PiB7XG4gICAgICAgIHZhciBhbnN3ZXIgPSBTZXJ2aWNlUmVnaXN0cnkuc2VydmljZUxpbmsoY2hhdFNlcnZpY2VOYW1lKTtcbiAgICAgICAgaWYgKGFuc3dlcikge1xuLypcbiAgICAgICAgICBUT0RPIGFkZCBhIGN1c3RvbSBsaW5rIHRvIHRoZSBjb3JyZWN0IHJvb20gZm9yIHRoZSBjdXJyZW50IG5hbWVzcGFjZT9cblxuICAgICAgICAgIHZhciBpcmNIb3N0ID0gXCJcIjtcbiAgICAgICAgICB2YXIgaXJjU2VydmljZSA9IFNlcnZpY2VSZWdpc3RyeS5maW5kU2VydmljZShcImh1Ym90XCIpO1xuICAgICAgICAgIGlmIChpcmNTZXJ2aWNlKSB7XG4gICAgICAgICAgICBpcmNIb3N0ID0gaXJjU2VydmljZS5wb3J0YWxJUDtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKGlyY0hvc3QpIHtcbiAgICAgICAgICAgIHZhciBuaWNrID0gbG9jYWxTdG9yYWdlW1wiZ29nc1VzZXJcIl0gfHwgbG9jYWxTdG9yYWdlW1wiaXJjTmlja1wiXSB8fCBcIm15bmFtZVwiO1xuICAgICAgICAgICAgdmFyIHJvb20gPSBcIiNmYWJyaWM4LVwiICsgIGN1cnJlbnRLdWJlcm5ldGVzTmFtZXNwYWNlKCk7XG4gICAgICAgICAgICBhbnN3ZXIgPSBVcmxIZWxwZXJzLmpvaW4oYW5zd2VyLCBcIi9raXdpXCIsIGlyY0hvc3QsIFwiPyZuaWNrPVwiICsgbmljayArIHJvb20pO1xuICAgICAgICAgIH1cbiovXG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGFuc3dlcjtcbiAgICAgIH0sXG4gICAgICBpc0FjdGl2ZTogKCkgPT4gZmFsc2VcbiAgICB9KTtcblxuICAgIC8vIFRPRE8gd2Ugc2hvdWxkIG1vdmUgdGhpcyB0byBhIG5pY2VyIGxpbmsgaW5zaWRlIHRoZSBMaWJyYXJ5IHNvb24gLSBhbHNvIGxldHMgaGlkZSB1bnRpbCBpdCB3b3Jrcy4uLlxuLypcbiAgICB3b3Jrc3BhY2UudG9wTGV2ZWxUYWJzLnB1c2goe1xuICAgICAgaWQ6ICdjcmVhdGVQcm9qZWN0JyxcbiAgICAgIHRpdGxlOiAoKSA9PiAgJ0NyZWF0ZScsXG4gICAgICB0b29sdGlwOiAoKSA9PiAnQ3JlYXRlcyBhIG5ldyBwcm9qZWN0JyxcbiAgICAgIGlzVmFsaWQ6ICgpID0+IFNlcnZpY2VSZWdpc3RyeS5oYXNTZXJ2aWNlKFwiYXBwLWxpYnJhcnlcIikgJiYgZmFsc2UsXG4gICAgICBocmVmOiAoKSA9PiBcIi9wcm9qZWN0L2NyZWF0ZVwiXG4gICAgfSk7XG4qL1xuXG4gICAgcHJlZmVyZW5jZXNSZWdpc3RyeS5hZGRUYWIoJ0Fib3V0ICcgKyB2ZXJzaW9uLm5hbWUsIFVybEhlbHBlcnMuam9pbih0ZW1wbGF0ZVBhdGgsICdhYm91dC5odG1sJykpO1xuXG4gICAgbG9nLmluZm8oXCJzdGFydGVkLCB2ZXJzaW9uOiBcIiwgdmVyc2lvbi52ZXJzaW9uKTtcbiAgICBsb2cuaW5mbyhcImNvbW1pdCBJRDogXCIsIHZlcnNpb24uY29tbWl0SWQpO1xuICB9KTtcblxuICBoYXd0aW9QbHVnaW5Mb2FkZXIucmVnaXN0ZXJQcmVCb290c3RyYXBUYXNrKChuZXh0KSA9PiB7XG4gICAgJC5hamF4KHtcbiAgICAgIHVybDogJ3ZlcnNpb24uanNvbj9yZXY9JyArIERhdGUubm93KCksIFxuICAgICAgc3VjY2VzczogKGRhdGEpID0+IHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICB2ZXJzaW9uID0gYW5ndWxhci5mcm9tSnNvbihkYXRhKTtcbiAgICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgdmVyc2lvbiA9IHtcbiAgICAgICAgICAgIG5hbWU6ICdmYWJyaWM4LWNvbnNvbGUnLFxuICAgICAgICAgICAgdmVyc2lvbjogJydcbiAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICAgIG5leHQoKTtcbiAgICAgIH0sXG4gICAgICBlcnJvcjogKGpxWEhSLCB0ZXh0LCBzdGF0dXMpID0+IHtcbiAgICAgICAgbG9nLmRlYnVnKFwiRmFpbGVkIHRvIGZldGNoIHZlcnNpb246IGpxWEhSOiBcIiwganFYSFIsIFwiIHRleHQ6IFwiLCB0ZXh0LCBcIiBzdGF0dXM6IFwiLCBzdGF0dXMpO1xuICAgICAgICBuZXh0KCk7XG4gICAgICB9LFxuICAgICAgZGF0YVR5cGU6IFwiaHRtbFwiXG4gICAgfSk7XG4gIH0pO1xuXG4gIGhhd3Rpb1BsdWdpbkxvYWRlci5hZGRNb2R1bGUocGx1Z2luTmFtZSk7XG59XG4iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwibWFpbkdsb2JhbHMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwibWFpblBsdWdpbi50c1wiLz5cblxubW9kdWxlIE1haW4ge1xuICBfbW9kdWxlLmNvbnRyb2xsZXIoJ01haW4uQWJvdXQnLCAoJHNjb3BlKSA9PiB7XG4gICAgJHNjb3BlLmluZm8gPSB2ZXJzaW9uO1xuICB9KTtcbn1cblxuIiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL2luY2x1ZGVzLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cImZvcmdlSGVscGVycy50c1wiLz5cblxubW9kdWxlIEZvcmdlIHtcblxuICBleHBvcnQgdmFyIF9tb2R1bGUgPSBhbmd1bGFyLm1vZHVsZShwbHVnaW5OYW1lLCBbJ2hhd3Rpby1jb3JlJywgJ2hhd3Rpby11aSddKTtcbiAgZXhwb3J0IHZhciBjb250cm9sbGVyID0gUGx1Z2luSGVscGVycy5jcmVhdGVDb250cm9sbGVyRnVuY3Rpb24oX21vZHVsZSwgcGx1Z2luTmFtZSk7XG4gIGV4cG9ydCB2YXIgcm91dGUgPSBQbHVnaW5IZWxwZXJzLmNyZWF0ZVJvdXRpbmdGdW5jdGlvbih0ZW1wbGF0ZVBhdGgpO1xuXG4gIF9tb2R1bGUuY29uZmlnKFsnJHJvdXRlUHJvdmlkZXInLCAoJHJvdXRlUHJvdmlkZXI6bmcucm91dGUuSVJvdXRlUHJvdmlkZXIpID0+IHtcblxuICAgIGNvbnNvbGUubG9nKFwiTGlzdGVuaW5nIG9uOiBcIiArIFVybEhlbHBlcnMuam9pbihjb250ZXh0LCAnL2NyZWF0ZVByb2plY3QnKSk7XG5cbiAgICAkcm91dGVQcm92aWRlci53aGVuKFVybEhlbHBlcnMuam9pbihjb250ZXh0LCAnL2NyZWF0ZVByb2plY3QnKSwgcm91dGUoJ2NyZWF0ZVByb2plY3QuaHRtbCcsIGZhbHNlKSlcbiAgICAgIC53aGVuKFVybEhlbHBlcnMuam9pbihjb250ZXh0LCAnL3JlcG9zLzpwYXRoKicpLCByb3V0ZSgncmVwby5odG1sJywgZmFsc2UpKVxuICAgICAgLndoZW4oVXJsSGVscGVycy5qb2luKGNvbnRleHQsICcvcmVwb3MnKSwgcm91dGUoJ3JlcG9zLmh0bWwnLCBmYWxzZSkpO1xuXG4gICAgYW5ndWxhci5mb3JFYWNoKFtjb250ZXh0LCAnL3dvcmtzcGFjZXMvOm5hbWVzcGFjZS9wcm9qZWN0cy86cHJvamVjdC9mb3JnZSddLCAocGF0aCkgPT4ge1xuICAgICAgJHJvdXRlUHJvdmlkZXJcbiAgICAgICAgLndoZW4oVXJsSGVscGVycy5qb2luKHBhdGgsICcvY29tbWFuZHMnKSwgcm91dGUoJ2NvbW1hbmRzLmh0bWwnLCBmYWxzZSkpXG4gICAgICAgIC53aGVuKFVybEhlbHBlcnMuam9pbihwYXRoLCAnL2NvbW1hbmRzLzpwYXRoKicpLCByb3V0ZSgnY29tbWFuZHMuaHRtbCcsIGZhbHNlKSlcbiAgICAgICAgLndoZW4oVXJsSGVscGVycy5qb2luKHBhdGgsICcvY29tbWFuZC86aWQnKSwgcm91dGUoJ2NvbW1hbmQuaHRtbCcsIGZhbHNlKSlcbiAgICAgICAgLndoZW4oVXJsSGVscGVycy5qb2luKHBhdGgsICcvY29tbWFuZC86aWQvOnBhdGgqJyksIHJvdXRlKCdjb21tYW5kLmh0bWwnLCBmYWxzZSkpO1xuICAgIH0pO1xuXG4gIH1dKTtcblxuICBfbW9kdWxlLmZhY3RvcnkoJ0ZvcmdlQXBpVVJMJywgWyckcScsICckcm9vdFNjb3BlJywgKCRxOm5nLklRU2VydmljZSwgJHJvb3RTY29wZTpuZy5JUm9vdFNjb3BlU2VydmljZSkgPT4ge1xuICAgIHJldHVybiBLdWJlcm5ldGVzLmt1YmVybmV0ZXNBcGlVcmwoKSArIFwiL3Byb3h5XCIgKyBLdWJlcm5ldGVzLmt1YmVybmV0ZXNOYW1lc3BhY2VQYXRoKCkgKyBcIi9zZXJ2aWNlcy9mYWJyaWM4LWZvcmdlL2FwaS9mb3JnZVwiO1xuICB9XSk7XG5cblxuICBfbW9kdWxlLmZhY3RvcnkoJ0ZvcmdlTW9kZWwnLCBbJyRxJywgJyRyb290U2NvcGUnLCAoJHE6bmcuSVFTZXJ2aWNlLCAkcm9vdFNjb3BlOm5nLklSb290U2NvcGVTZXJ2aWNlKSA9PiB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHJvb3RQcm9qZWN0OiB7fSxcbiAgICAgIHByb2plY3RzOiBbXVxuICAgIH1cbiAgfV0pO1xuXG4gIF9tb2R1bGUucnVuKFsndmlld1JlZ2lzdHJ5JywgJ0hhd3Rpb05hdicsICh2aWV3UmVnaXN0cnksIEhhd3Rpb05hdikgPT4ge1xuICAgIHZpZXdSZWdpc3RyeVsnZm9yZ2UnXSA9IHRlbXBsYXRlUGF0aCArICdsYXlvdXRGb3JnZS5odG1sJztcbiAgfV0pO1xuXG4gIGhhd3Rpb1BsdWdpbkxvYWRlci5hZGRNb2R1bGUocGx1Z2luTmFtZSk7XG59XG4iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vaW5jbHVkZXMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiZm9yZ2VIZWxwZXJzLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cImZvcmdlUGx1Z2luLnRzXCIvPlxuXG5tb2R1bGUgRm9yZ2Uge1xuXG4gIGV4cG9ydCB2YXIgQ29tbWFuZENvbnRyb2xsZXIgPSBjb250cm9sbGVyKFwiQ29tbWFuZENvbnRyb2xsZXJcIixcbiAgICBbXCIkc2NvcGVcIiwgXCIkdGVtcGxhdGVDYWNoZVwiLCBcIiRsb2NhdGlvblwiLCBcIiRyb3V0ZVBhcmFtc1wiLCBcIiRodHRwXCIsIFwiJHRpbWVvdXRcIiwgXCJGb3JnZUFwaVVSTFwiLCBcIkZvcmdlTW9kZWxcIixcbiAgICAgICgkc2NvcGUsICR0ZW1wbGF0ZUNhY2hlOm5nLklUZW1wbGF0ZUNhY2hlU2VydmljZSwgJGxvY2F0aW9uOm5nLklMb2NhdGlvblNlcnZpY2UsICRyb3V0ZVBhcmFtcywgJGh0dHAsICR0aW1lb3V0LCBGb3JnZUFwaVVSTCwgRm9yZ2VNb2RlbCkgPT4ge1xuXG4gICAgICAgICRzY29wZS5tb2RlbCA9IEZvcmdlTW9kZWw7XG5cbiAgICAgICAgJHNjb3BlLnJlc291cmNlUGF0aCA9ICRyb3V0ZVBhcmFtc1tcInBhdGhcIl0gfHwgJGxvY2F0aW9uLnNlYXJjaCgpW1wicGF0aFwiXSB8fCBcIlwiO1xuICAgICAgICAkc2NvcGUuaWQgPSAkcm91dGVQYXJhbXNbXCJpZFwiXTtcbiAgICAgICAgJHNjb3BlLnBhdGggPSAkcm91dGVQYXJhbXNbXCJwYXRoXCJdO1xuXG4gICAgICAgICRzY29wZS5hdmF0YXJfdXJsID0gbG9jYWxTdG9yYWdlW1wiZ29nc0F2YXRhclVybFwiXTtcbiAgICAgICAgJHNjb3BlLnVzZXIgPSBsb2NhbFN0b3JhZ2VbXCJnb2dzVXNlclwiXTtcbiAgICAgICAgJHNjb3BlLnJlcG9OYW1lID0gXCJcIjtcbiAgICAgICAgdmFyIHBhdGhTdGVwcyA9ICRzY29wZS5yZXNvdXJjZVBhdGguc3BsaXQoXCIvXCIpO1xuICAgICAgICBpZiAocGF0aFN0ZXBzICYmIHBhdGhTdGVwcy5sZW5ndGgpIHtcbiAgICAgICAgICAkc2NvcGUucmVwb05hbWUgPSBwYXRoU3RlcHNbcGF0aFN0ZXBzLmxlbmd0aCAtIDFdO1xuICAgICAgICB9XG5cblxuICAgICAgICBpbml0U2NvcGUoJHNjb3BlLCAkbG9jYXRpb24sICRyb3V0ZVBhcmFtcyk7XG4gICAgICAgIHJlZGlyZWN0VG9Hb2dzTG9naW5JZlJlcXVpcmVkKCRzY29wZSwgJGxvY2F0aW9uKTtcblxuICAgICAgICAkc2NvcGUuJGNvbXBsZXRlTGluayA9ICRzY29wZS4kcHJvamVjdExpbms7XG4gICAgICAgIGlmICgkc2NvcGUucHJvamVjdElkKSB7XG5cbiAgICAgICAgfVxuICAgICAgICAkc2NvcGUuY29tbWFuZHNMaW5rID0gY29tbWFuZHNMaW5rKCRzY29wZS5yZXNvdXJjZVBhdGgsICRzY29wZS5wcm9qZWN0SWQpO1xuICAgICAgICAkc2NvcGUuY29tcGxldGVkTGluayA9ICRzY29wZS5wcm9qZWN0SWQgPyBVcmxIZWxwZXJzLmpvaW4oJHNjb3BlLiRwcm9qZWN0TGluaywgXCJlbnZpcm9ubWVudHNcIikgOiAkc2NvcGUuJHByb2plY3RMaW5rO1xuXG4gICAgICAgICRzY29wZS5lbnRpdHkgPSB7XG4gICAgICAgIH07XG4gICAgICAgICRzY29wZS5pbnB1dExpc3QgPSBbJHNjb3BlLmVudGl0eV07XG5cbiAgICAgICAgJHNjb3BlLnNjaGVtYSA9IGdldE1vZGVsQ29tbWFuZElucHV0cyhGb3JnZU1vZGVsLCAkc2NvcGUucmVzb3VyY2VQYXRoLCAkc2NvcGUuaWQpO1xuICAgICAgICBvblNjaGVtYUxvYWQoKTtcblxuICAgICAgICBmdW5jdGlvbiBvblJvdXRlQ2hhbmdlZCgpIHtcbiAgICAgICAgICBjb25zb2xlLmxvZyhcInJvdXRlIHVwZGF0ZWQ7IGxldHMgY2xlYXIgdGhlIGVudGl0eVwiKTtcbiAgICAgICAgICAkc2NvcGUuZW50aXR5ID0ge1xuICAgICAgICAgIH07XG4gICAgICAgICAgJHNjb3BlLmlucHV0TGlzdCA9IFskc2NvcGUuZW50aXR5XTtcbiAgICAgICAgICAkc2NvcGUucHJldmlvdXNTY2hlbWFKc29uID0gXCJcIjtcbiAgICAgICAgICAkc2NvcGUuc2NoZW1hID0gbnVsbDtcbiAgICAgICAgICBDb3JlLiRhcHBseSgkc2NvcGUpO1xuICAgICAgICAgIHVwZGF0ZURhdGEoKTtcbiAgICAgICAgfVxuXG4gICAgICAgICRzY29wZS4kb24oJyRyb3V0ZUNoYW5nZVN1Y2Nlc3MnLCBvblJvdXRlQ2hhbmdlZCk7XG5cbiAgICAgICAgJHNjb3BlLmV4ZWN1dGUgPSAoKSA9PiB7XG4gICAgICAgICAgLy8gVE9ETyBjaGVjayBpZiB2YWxpZC4uLlxuICAgICAgICAgICRzY29wZS5yZXNwb25zZSA9IG51bGw7XG4gICAgICAgICAgJHNjb3BlLmV4ZWN1dGluZyA9IHRydWU7XG4gICAgICAgICAgJHNjb3BlLmludmFsaWQgPSBmYWxzZTtcbiAgICAgICAgICAkc2NvcGUudmFsaWRhdGlvbkVycm9yID0gbnVsbDtcbiAgICAgICAgICB2YXIgY29tbWFuZElkID0gJHNjb3BlLmlkO1xuICAgICAgICAgIHZhciByZXNvdXJjZVBhdGggPSAkc2NvcGUucmVzb3VyY2VQYXRoO1xuICAgICAgICAgIHZhciB1cmwgPSBleGVjdXRlQ29tbWFuZEFwaVVybChGb3JnZUFwaVVSTCwgY29tbWFuZElkKTtcbiAgICAgICAgICB2YXIgcmVxdWVzdCA9IHtcbiAgICAgICAgICAgIHJlc291cmNlOiByZXNvdXJjZVBhdGgsXG4gICAgICAgICAgICBpbnB1dExpc3Q6ICRzY29wZS5pbnB1dExpc3RcbiAgICAgICAgICB9O1xuICAgICAgICAgIHVybCA9IGNyZWF0ZUh0dHBVcmwodXJsKTtcbiAgICAgICAgICBsb2cuaW5mbyhcIkFib3V0IHRvIHBvc3QgdG8gXCIgKyB1cmwgKyBcIiBwYXlsb2FkOiBcIiArIGFuZ3VsYXIudG9Kc29uKHJlcXVlc3QpKTtcbiAgICAgICAgICAkaHR0cC5wb3N0KHVybCwgcmVxdWVzdCwgY3JlYXRlSHR0cENvbmZpZygpKS5cbiAgICAgICAgICAgIHN1Y2Nlc3MoZnVuY3Rpb24gKGRhdGEsIHN0YXR1cywgaGVhZGVycywgY29uZmlnKSB7XG4gICAgICAgICAgICAgICRzY29wZS5leGVjdXRpbmcgPSBmYWxzZTtcbiAgICAgICAgICAgICAgJHNjb3BlLmludmFsaWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgJHNjb3BlLnZhbGlkYXRpb25FcnJvciA9IG51bGw7XG4gICAgICAgICAgICAgIGlmIChkYXRhKSB7XG4gICAgICAgICAgICAgICAgZGF0YS5tZXNzYWdlID0gZGF0YS5tZXNzYWdlIHx8IGRhdGEub3V0cHV0O1xuICAgICAgICAgICAgICAgIHZhciB3aXphcmRSZXN1bHRzID0gZGF0YS53aXphcmRSZXN1bHRzO1xuICAgICAgICAgICAgICAgIGlmICh3aXphcmRSZXN1bHRzKSB7XG4gICAgICAgICAgICAgICAgICBhbmd1bGFyLmZvckVhY2god2l6YXJkUmVzdWx0cy5zdGVwVmFsaWRhdGlvbnMsICh2YWxpZGF0aW9uKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghJHNjb3BlLmludmFsaWQgJiYgIXZhbGlkYXRpb24udmFsaWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICB2YXIgbWVzc2FnZXMgPSB2YWxpZGF0aW9uLm1lc3NhZ2VzIHx8IFtdO1xuICAgICAgICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlcy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBtZXNzYWdlID0gbWVzc2FnZXNbMF07XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobWVzc2FnZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuaW52YWxpZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS52YWxpZGF0aW9uRXJyb3IgPSBtZXNzYWdlLmRlc2NyaXB0aW9uO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUudmFsaWRhdGlvbklucHV0ID0gbWVzc2FnZS5pbnB1dE5hbWU7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgIHZhciBzdGVwSW5wdXRzID0gd2l6YXJkUmVzdWx0cy5zdGVwSW5wdXRzO1xuICAgICAgICAgICAgICAgICAgaWYgKHN0ZXBJbnB1dHMpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHNjaGVtYSA9IF8ubGFzdChzdGVwSW5wdXRzKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHNjaGVtYSkge1xuICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5lbnRpdHkgPSB7fTtcbiAgICAgICAgICAgICAgICAgICAgICB1cGRhdGVTY2hlbWEoc2NoZW1hKTtcbiAgICAgICAgICAgICAgICAgICAgICAvLyBsZXRzIGNvcHkgYWNyb3NzIGFueSBkZWZhdWx0IHZhbHVlcyBmcm9tIHRoZSBzY2hlbWFcbiAgICAgICAgICAgICAgICAgICAgICBhbmd1bGFyLmZvckVhY2goc2NoZW1hW1wicHJvcGVydGllc1wiXSwgKHByb3BlcnR5LCBuYW1lKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgdmFsdWUgPSBwcm9wZXJ0eS52YWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh2YWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICBsb2cuaW5mbyhcIkFkZGluZyBlbnRpdHkuXCIgKyBuYW1lICsgXCIgPSBcIiArIHZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmVudGl0eVtuYW1lXSA9IHZhbHVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5pbnB1dExpc3QucHVzaCgkc2NvcGUuZW50aXR5KTtcblxuICAgICAgICAgICAgICAgICAgICAgIGlmIChkYXRhLmNhbk1vdmVUb05leHRTdGVwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBsZXRzIGNsZWFyIHRoZSByZXNwb25zZSB3ZSd2ZSBhbm90aGVyIHdpemFyZCBwYWdlIHRvIGRvXG4gICAgICAgICAgICAgICAgICAgICAgICBkYXRhID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gb3RoZXJ3aXNlIGluZGljYXRlIHRoYXQgdGhlIHdpemFyZCBqdXN0IGNvbXBsZXRlZCBhbmQgbGV0cyBoaWRlIHRoZSBpbnB1dCBmb3JtXG4gICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUud2l6YXJkQ29tcGxldGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgaWYgKCEkc2NvcGUuaW52YWxpZCkge1xuICAgICAgICAgICAgICAgICRzY29wZS5yZXNwb25zZSA9IGRhdGE7XG4gICAgICAgICAgICAgICAgdmFyIHN0YXR1cyA9ICgoZGF0YSB8fCB7fSkuc3RhdHVzIHx8IFwiXCIpLnRvU3RyaW5nKCkudG9Mb3dlckNhc2UoKTtcbiAgICAgICAgICAgICAgICAkc2NvcGUucmVzcG9uc2VDbGFzcyA9IHRvQmFja2dyb3VuZFN0eWxlKHN0YXR1cyk7XG5cbiAgICAgICAgICAgICAgICB2YXIgZnVsbE5hbWUgPSAoKGRhdGEgfHwge30pLm91dHB1dFByb3BlcnRpZXMgfHwge30pLmZ1bGxOYW1lO1xuICAgICAgICAgICAgICAgIGlmICgkc2NvcGUucmVzcG9uc2UgJiYgZnVsbE5hbWUgJiYgJHNjb3BlLmlkID09PSAncHJvamVjdC1uZXcnKSB7XG4gICAgICAgICAgICAgICAgICAkc2NvcGUucmVzcG9uc2UgPSBudWxsO1xuICAgICAgICAgICAgICAgICAgLy8gbGV0cyBmb3J3YXJkIHRvIHRoZSBkZXZvcHMgZWRpdCBwYWdlXG4gICAgICAgICAgICAgICAgICB2YXIgcHJvamVjdElkID0gZnVsbE5hbWUucmVwbGFjZSgnLycsIFwiLVwiKTtcbiAgICAgICAgICAgICAgICAgIHZhciBlZGl0UGF0aCA9IFVybEhlbHBlcnMuam9pbihEZXZlbG9wZXIucHJvamVjdExpbmsocHJvamVjdElkKSwgXCIvZm9yZ2UvY29tbWFuZC9kZXZvcHMtZWRpdC91c2VyXCIsIGZ1bGxOYW1lKTtcbiAgICAgICAgICAgICAgICAgIGxvZy5pbmZvKFwiTW92aW5nIHRvIHRoZSBkZXZvcHMgZWRpdCBwYXRoOiBcIiArIGVkaXRQYXRoKTtcbiAgICAgICAgICAgICAgICAgICRsb2NhdGlvbi5wYXRoKGVkaXRQYXRoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICAgICAgICAgIH0pLlxuICAgICAgICAgICAgZXJyb3IoZnVuY3Rpb24gKGRhdGEsIHN0YXR1cywgaGVhZGVycywgY29uZmlnKSB7XG4gICAgICAgICAgICAgICRzY29wZS5leGVjdXRpbmcgPSBmYWxzZTtcbiAgICAgICAgICAgICAgbG9nLndhcm4oXCJGYWlsZWQgdG8gbG9hZCBcIiArIHVybCArIFwiIFwiICsgZGF0YSArIFwiIFwiICsgc3RhdHVzKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgICAgICRzY29wZS4kd2F0Y2hDb2xsZWN0aW9uKFwiZW50aXR5XCIsICgpID0+IHtcbiAgICAgICAgICB2YWxpZGF0ZSgpO1xuICAgICAgICB9KTtcblxuICAgICAgICBmdW5jdGlvbiB1cGRhdGVTY2hlbWEoc2NoZW1hKSB7XG4gICAgICAgICAgaWYgKHNjaGVtYSkge1xuICAgICAgICAgICAgLy8gbGV0cyByZW1vdmUgdGhlIHZhbHVlcyBzbyB0aGF0IHdlIGNhbiBwcm9wZXJseSBjaGVjayB3aGVuIHRoZSBzY2hlbWEgcmVhbGx5IGRvZXMgY2hhbmdlXG4gICAgICAgICAgICAvLyBvdGhlcndpc2UgdGhlIHNjaGVtYSB3aWxsIGNoYW5nZSBldmVyeSB0aW1lIHdlIHR5cGUgYSBjaGFyYWN0ZXIgOylcbiAgICAgICAgICAgIHZhciBzY2hlbWFXaXRob3V0VmFsdWVzID0gYW5ndWxhci5jb3B5KHNjaGVtYSk7XG4gICAgICAgICAgICBhbmd1bGFyLmZvckVhY2goc2NoZW1hV2l0aG91dFZhbHVlcy5wcm9wZXJ0aWVzLCAocHJvcGVydHkpID0+IHtcbiAgICAgICAgICAgICAgZGVsZXRlIHByb3BlcnR5W1widmFsdWVcIl07XG4gICAgICAgICAgICAgIGRlbGV0ZSBwcm9wZXJ0eVtcImVuYWJsZWRcIl07XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHZhciBqc29uID0gYW5ndWxhci50b0pzb24oc2NoZW1hV2l0aG91dFZhbHVlcyk7XG4gICAgICAgICAgICBpZiAoanNvbiAhPT0gJHNjb3BlLnByZXZpb3VzU2NoZW1hSnNvbikge1xuICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcInVwZGF0ZWQgc2NoZW1hOiBcIiArIGpzb24pO1xuICAgICAgICAgICAgICAkc2NvcGUucHJldmlvdXNTY2hlbWFKc29uID0ganNvbjtcbiAgICAgICAgICAgICAgJHNjb3BlLnNjaGVtYSA9IHNjaGVtYTtcblxuICAgICAgICAgICAgICBpZiAoJHNjb3BlLmlkID09PSBcInByb2plY3QtbmV3XCIpIHtcbiAgICAgICAgICAgICAgICB2YXIgZW50aXR5ID0gJHNjb3BlLmVudGl0eTtcbiAgICAgICAgICAgICAgICAvLyBsZXRzIGhpZGUgdGhlIHRhcmdldCBsb2NhdGlvbiFcbiAgICAgICAgICAgICAgICB2YXIgcHJvcGVydGllcyA9IHNjaGVtYS5wcm9wZXJ0aWVzIHx8IHt9O1xuICAgICAgICAgICAgICAgIHZhciBvdmVyd3JpdGUgPSBwcm9wZXJ0aWVzLm92ZXJ3cml0ZTtcbiAgICAgICAgICAgICAgICB2YXIgY2F0YWxvZyA9IHByb3BlcnRpZXMuY2F0YWxvZztcbiAgICAgICAgICAgICAgICB2YXIgdGFyZ2V0TG9jYXRpb24gPSBwcm9wZXJ0aWVzLnRhcmdldExvY2F0aW9uO1xuICAgICAgICAgICAgICAgIGlmICh0YXJnZXRMb2NhdGlvbikge1xuICAgICAgICAgICAgICAgICAgdGFyZ2V0TG9jYXRpb24uaGlkZGVuID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgIGlmIChvdmVyd3JpdGUpIHtcbiAgICAgICAgICAgICAgICAgICAgb3ZlcndyaXRlLmhpZGRlbiA9IHRydWU7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcImhpZGluZyB0YXJnZXRMb2NhdGlvbiFcIik7XG5cbiAgICAgICAgICAgICAgICAgIC8vIGxldHMgZGVmYXVsdCB0aGUgdHlwZVxuICAgICAgICAgICAgICAgICAgaWYgKCFlbnRpdHkudHlwZSkge1xuICAgICAgICAgICAgICAgICAgICBlbnRpdHkudHlwZSA9IFwiRnJvbSBBcmNoZXR5cGUgQ2F0YWxvZ1wiO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoY2F0YWxvZykge1xuICAgICAgICAgICAgICAgICAgaWYgKCFlbnRpdHkuY2F0YWxvZykge1xuICAgICAgICAgICAgICAgICAgICBlbnRpdHkuY2F0YWxvZyA9IFwiZmFicmljOFwiO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIHZhbGlkYXRlKCkge1xuICAgICAgICAgIGlmICgkc2NvcGUuZXhlY3V0aW5nIHx8ICRzY29wZS52YWxpZGF0aW5nKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICAgIHZhciBuZXdKc29uID0gYW5ndWxhci50b0pzb24oJHNjb3BlLmVudGl0eSk7XG4gICAgICAgICAgaWYgKG5ld0pzb24gPT09ICRzY29wZS52YWxpZGF0ZWRFbnRpdHlKc29uKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICRzY29wZS52YWxpZGF0ZWRFbnRpdHlKc29uID0gbmV3SnNvbjtcbiAgICAgICAgICB9XG4gICAgICAgICAgdmFyIGNvbW1hbmRJZCA9ICRzY29wZS5pZDtcbiAgICAgICAgICB2YXIgcmVzb3VyY2VQYXRoID0gJHNjb3BlLnJlc291cmNlUGF0aDtcbiAgICAgICAgICB2YXIgdXJsID0gdmFsaWRhdGVDb21tYW5kQXBpVXJsKEZvcmdlQXBpVVJMLCBjb21tYW5kSWQpO1xuICAgICAgICAgIC8vIGxldHMgcHV0IHRoZSBlbnRpdHkgaW4gdGhlIGxhc3QgaXRlbSBpbiB0aGUgbGlzdFxuICAgICAgICAgIHZhciBpbnB1dExpc3QgPSBbXS5jb25jYXQoJHNjb3BlLmlucHV0TGlzdCk7XG4gICAgICAgICAgaW5wdXRMaXN0W2lucHV0TGlzdC5sZW5ndGggLSAxXSA9ICRzY29wZS5lbnRpdHk7XG4gICAgICAgICAgdmFyIHJlcXVlc3QgPSB7XG4gICAgICAgICAgICByZXNvdXJjZTogcmVzb3VyY2VQYXRoLFxuICAgICAgICAgICAgaW5wdXRMaXN0OiAkc2NvcGUuaW5wdXRMaXN0XG4gICAgICAgICAgfTtcbiAgICAgICAgICB1cmwgPSBjcmVhdGVIdHRwVXJsKHVybCk7XG4gICAgICAgICAgLy9sb2cuaW5mbyhcIkFib3V0IHRvIHBvc3QgdG8gXCIgKyB1cmwgKyBcIiBwYXlsb2FkOiBcIiArIGFuZ3VsYXIudG9Kc29uKHJlcXVlc3QpKTtcbiAgICAgICAgICAkc2NvcGUudmFsaWRhdGluZyA9IHRydWU7XG4gICAgICAgICAgJGh0dHAucG9zdCh1cmwsIHJlcXVlc3QsIGNyZWF0ZUh0dHBDb25maWcoKSkuXG4gICAgICAgICAgICBzdWNjZXNzKGZ1bmN0aW9uIChkYXRhLCBzdGF0dXMsIGhlYWRlcnMsIGNvbmZpZykge1xuICAgICAgICAgICAgICB0aGlzLnZhbGlkYXRpb24gPSBkYXRhO1xuICAgICAgICAgICAgICAvL2NvbnNvbGUubG9nKFwiZ290IHZhbGlkYXRpb24gXCIgKyBhbmd1bGFyLnRvSnNvbihkYXRhLCB0cnVlKSk7XG4gICAgICAgICAgICAgIHZhciB3aXphcmRSZXN1bHRzID0gZGF0YS53aXphcmRSZXN1bHRzO1xuICAgICAgICAgICAgICBpZiAod2l6YXJkUmVzdWx0cykge1xuICAgICAgICAgICAgICAgIHZhciBzdGVwSW5wdXRzID0gd2l6YXJkUmVzdWx0cy5zdGVwSW5wdXRzO1xuICAgICAgICAgICAgICAgIGlmIChzdGVwSW5wdXRzKSB7XG4gICAgICAgICAgICAgICAgICB2YXIgc2NoZW1hID0gXy5sYXN0KHN0ZXBJbnB1dHMpO1xuICAgICAgICAgICAgICAgICAgdXBkYXRlU2NoZW1hKHNjaGVtYSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIENvcmUuJGFwcGx5KCRzY29wZSk7XG5cbiAgICAgICAgICAgICAgLypcbiAgICAgICAgICAgICAgICogTGV0cyB0aHJvdHRsZSB0aGUgdmFsaWRhdGlvbnMgc28gdGhhdCB3ZSBvbmx5IGZpcmUgYW5vdGhlciB2YWxpZGF0aW9uIGEgbGl0dGxlXG4gICAgICAgICAgICAgICAqIGFmdGVyIHdlJ3ZlIGdvdCBhIHJlcGx5IGFuZCBvbmx5IGlmIHRoZSBtb2RlbCBoYXMgY2hhbmdlZCBzaW5jZSB0aGVuXG4gICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAkdGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgJHNjb3BlLnZhbGlkYXRpbmcgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB2YWxpZGF0ZSgpO1xuICAgICAgICAgICAgICB9LCAyMDApO1xuICAgICAgICAgICAgfSkuXG4gICAgICAgICAgICBlcnJvcihmdW5jdGlvbiAoZGF0YSwgc3RhdHVzLCBoZWFkZXJzLCBjb25maWcpIHtcbiAgICAgICAgICAgICAgJHNjb3BlLmV4ZWN1dGluZyA9IGZhbHNlO1xuICAgICAgICAgICAgICBsb2cud2FybihcIkZhaWxlZCB0byBsb2FkIFwiICsgdXJsICsgXCIgXCIgKyBkYXRhICsgXCIgXCIgKyBzdGF0dXMpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICB1cGRhdGVEYXRhKCk7XG5cbiAgICAgICAgZnVuY3Rpb24gdG9CYWNrZ3JvdW5kU3R5bGUoc3RhdHVzKSB7XG4gICAgICAgICAgaWYgKCFzdGF0dXMpIHtcbiAgICAgICAgICAgIHN0YXR1cyA9IFwiXCI7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChzdGF0dXMuc3RhcnRzV2l0aChcInN1Y1wiKSkge1xuICAgICAgICAgICAgcmV0dXJuIFwiYmctc3VjY2Vzc1wiO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gXCJiZy13YXJuaW5nXCJcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIHVwZGF0ZURhdGEoKSB7XG4gICAgICAgICAgJHNjb3BlLml0ZW0gPSBudWxsO1xuICAgICAgICAgIHZhciBjb21tYW5kSWQgPSAkc2NvcGUuaWQ7XG4gICAgICAgICAgaWYgKGNvbW1hbmRJZCkge1xuICAgICAgICAgICAgdmFyIHJlc291cmNlUGF0aCA9ICRzY29wZS5yZXNvdXJjZVBhdGg7XG4gICAgICAgICAgICB2YXIgdXJsID0gY29tbWFuZElucHV0QXBpVXJsKEZvcmdlQXBpVVJMLCBjb21tYW5kSWQsIHJlc291cmNlUGF0aCk7XG4gICAgICAgICAgICB1cmwgPSBjcmVhdGVIdHRwVXJsKHVybCk7XG4gICAgICAgICAgICAkaHR0cC5nZXQodXJsLCBjcmVhdGVIdHRwQ29uZmlnKCkpLlxuICAgICAgICAgICAgICBzdWNjZXNzKGZ1bmN0aW9uIChkYXRhLCBzdGF0dXMsIGhlYWRlcnMsIGNvbmZpZykge1xuICAgICAgICAgICAgICAgIGlmIChkYXRhKSB7XG4gICAgICAgICAgICAgICAgICAkc2NvcGUuZmV0Y2hlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcInVwZGF0ZURhdGEgbG9hZGVkIHNjaGVtYVwiKTtcbiAgICAgICAgICAgICAgICAgIHVwZGF0ZVNjaGVtYShkYXRhKTtcbiAgICAgICAgICAgICAgICAgIHNldE1vZGVsQ29tbWFuZElucHV0cyhGb3JnZU1vZGVsLCAkc2NvcGUucmVzb3VyY2VQYXRoLCAkc2NvcGUuaWQsICRzY29wZS5zY2hlbWEpO1xuICAgICAgICAgICAgICAgICAgb25TY2hlbWFMb2FkKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIENvcmUuJGFwcGx5KCRzY29wZSk7XG4gICAgICAgICAgICAgIH0pLlxuICAgICAgICAgICAgICBlcnJvcihmdW5jdGlvbiAoZGF0YSwgc3RhdHVzLCBoZWFkZXJzLCBjb25maWcpIHtcbiAgICAgICAgICAgICAgICBsb2cud2FybihcIkZhaWxlZCB0byBsb2FkIFwiICsgdXJsICsgXCIgXCIgKyBkYXRhICsgXCIgXCIgKyBzdGF0dXMpO1xuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgQ29yZS4kYXBwbHkoJHNjb3BlKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBvblNjaGVtYUxvYWQoKSB7XG4gICAgICAgICAgLy8gbGV0cyB1cGRhdGUgdGhlIHZhbHVlIGlmIGl0cyBibGFuayB3aXRoIHRoZSBkZWZhdWx0IHZhbHVlcyBmcm9tIHRoZSBwcm9wZXJ0aWVzXG4gICAgICAgICAgdmFyIHNjaGVtYSA9ICRzY29wZS5zY2hlbWE7XG4gICAgICAgICAgJHNjb3BlLmZldGNoZWQgPSBzY2hlbWE7XG4gICAgICAgICAgdmFyIGVudGl0eSA9ICRzY29wZS5lbnRpdHk7XG4gICAgICAgICAgaWYgKHNjaGVtYSkge1xuICAgICAgICAgICAgYW5ndWxhci5mb3JFYWNoKHNjaGVtYS5wcm9wZXJ0aWVzLCAocHJvcGVydHksIGtleSkgPT4ge1xuICAgICAgICAgICAgICB2YXIgdmFsdWUgPSBwcm9wZXJ0eS52YWx1ZTtcbiAgICAgICAgICAgICAgaWYgKHZhbHVlICYmICFlbnRpdHlba2V5XSkge1xuICAgICAgICAgICAgICAgIGVudGl0eVtrZXldID0gdmFsdWU7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfV0pO1xufVxuIiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL2luY2x1ZGVzLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cImZvcmdlUGx1Z2luLnRzXCIvPlxuXG5tb2R1bGUgRm9yZ2Uge1xuXG4gIGV4cG9ydCB2YXIgQ29tbWFuZHNDb250cm9sbGVyID0gY29udHJvbGxlcihcIkNvbW1hbmRzQ29udHJvbGxlclwiLCBbXCIkc2NvcGVcIiwgXCIkZGlhbG9nXCIsIFwiJHdpbmRvd1wiLCBcIiR0ZW1wbGF0ZUNhY2hlXCIsIFwiJHJvdXRlUGFyYW1zXCIsIFwiJGxvY2F0aW9uXCIsIFwibG9jYWxTdG9yYWdlXCIsIFwiJGh0dHBcIiwgXCIkdGltZW91dFwiLCBcIkZvcmdlQXBpVVJMXCIsIFwiRm9yZ2VNb2RlbFwiLFxuICAgICgkc2NvcGUsICRkaWFsb2csICR3aW5kb3csICR0ZW1wbGF0ZUNhY2hlLCAkcm91dGVQYXJhbXMsICRsb2NhdGlvbjpuZy5JTG9jYXRpb25TZXJ2aWNlLCBsb2NhbFN0b3JhZ2UsICRodHRwLCAkdGltZW91dCwgRm9yZ2VBcGlVUkwsIEZvcmdlTW9kZWwpID0+IHtcblxuICAgICAgJHNjb3BlLm1vZGVsID0gRm9yZ2VNb2RlbDtcbiAgICAgICRzY29wZS5yZXNvdXJjZVBhdGggPSAkcm91dGVQYXJhbXNbXCJwYXRoXCJdIHx8ICRsb2NhdGlvbi5zZWFyY2goKVtcInBhdGhcIl0gfHwgXCJcIjtcbiAgICAgICRzY29wZS5yZXBvTmFtZSA9IFwiXCI7XG4gICAgICAkc2NvcGUucHJvamVjdERlc2NyaXB0aW9uID0gJHNjb3BlLnJlc291cmNlUGF0aCB8fCBcIlwiO1xuICAgICAgdmFyIHBhdGhTdGVwcyA9ICRzY29wZS5wcm9qZWN0RGVzY3JpcHRpb24uc3BsaXQoXCIvXCIpO1xuICAgICAgaWYgKHBhdGhTdGVwcyAmJiBwYXRoU3RlcHMubGVuZ3RoKSB7XG4gICAgICAgICRzY29wZS5yZXBvTmFtZSA9IHBhdGhTdGVwc1twYXRoU3RlcHMubGVuZ3RoIC0gMV07XG4gICAgICB9XG4gICAgICBpZiAoISRzY29wZS5wcm9qZWN0RGVzY3JpcHRpb24uc3RhcnRzV2l0aChcIi9cIikgJiYgJHNjb3BlLnByb2plY3REZXNjcmlwdGlvbi5sZW5ndGggPiAwKSB7XG4gICAgICAgICRzY29wZS5wcm9qZWN0RGVzY3JpcHRpb24gPSBcIi9cIiArICRzY29wZS5wcm9qZWN0RGVzY3JpcHRpb247XG4gICAgICB9XG5cbiAgICAgICRzY29wZS5hdmF0YXJfdXJsID0gbG9jYWxTdG9yYWdlW1wiZ29nc0F2YXRhclVybFwiXTtcbiAgICAgICRzY29wZS51c2VyID0gbG9jYWxTdG9yYWdlW1wiZ29nc1VzZXJcIl07XG5cbiAgICAgICRzY29wZS5jb21tYW5kcyA9IGdldE1vZGVsQ29tbWFuZHMoRm9yZ2VNb2RlbCwgJHNjb3BlLnJlc291cmNlUGF0aCk7XG4gICAgICAkc2NvcGUuZmV0Y2hlZCA9ICRzY29wZS5jb21tYW5kcy5sZW5ndGggIT09IDA7XG5cbiAgICAgIGluaXRTY29wZSgkc2NvcGUsICRsb2NhdGlvbiwgJHJvdXRlUGFyYW1zKTtcbiAgICAgIHJlZGlyZWN0VG9Hb2dzTG9naW5JZlJlcXVpcmVkKCRzY29wZSwgJGxvY2F0aW9uKTtcblxuXG4gICAgICAkc2NvcGUudGFibGVDb25maWcgPSB7XG4gICAgICAgIGRhdGE6ICdjb21tYW5kcycsXG4gICAgICAgIHNob3dTZWxlY3Rpb25DaGVja2JveDogdHJ1ZSxcbiAgICAgICAgZW5hYmxlUm93Q2xpY2tTZWxlY3Rpb246IGZhbHNlLFxuICAgICAgICBtdWx0aVNlbGVjdDogdHJ1ZSxcbiAgICAgICAgc2VsZWN0ZWRJdGVtczogW10sXG4gICAgICAgIGZpbHRlck9wdGlvbnM6IHtcbiAgICAgICAgICBmaWx0ZXJUZXh0OiAkbG9jYXRpb24uc2VhcmNoKClbXCJxXCJdIHx8ICcnXG4gICAgICAgIH0sXG4gICAgICAgIGNvbHVtbkRlZnM6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICBmaWVsZDogJ25hbWUnLFxuICAgICAgICAgICAgZGlzcGxheU5hbWU6ICdOYW1lJyxcbiAgICAgICAgICAgIGNlbGxUZW1wbGF0ZTogJHRlbXBsYXRlQ2FjaGUuZ2V0KFwiaWRUZW1wbGF0ZS5odG1sXCIpXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICBmaWVsZDogJ2Rlc2NyaXB0aW9uJyxcbiAgICAgICAgICAgIGRpc3BsYXlOYW1lOiAnRGVzY3JpcHRpb24nXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICBmaWVsZDogJ2NhdGVnb3J5JyxcbiAgICAgICAgICAgIGRpc3BsYXlOYW1lOiAnQ2F0ZWdvcnknXG4gICAgICAgICAgfVxuICAgICAgICBdXG4gICAgICB9O1xuXG4gICAgICBmdW5jdGlvbiBjb21tYW5kTWF0Y2hlcyhjb21tYW5kKSB7XG4gICAgICAgIHZhciBmaWx0ZXJUZXh0ID0gJHNjb3BlLnRhYmxlQ29uZmlnLmZpbHRlck9wdGlvbnMuZmlsdGVyVGV4dDtcbiAgICAgICAgcmV0dXJuIGNvbW1hbmRNYXRjaGVzVGV4dChjb21tYW5kLCBmaWx0ZXJUZXh0KTtcbiAgICAgIH1cblxuICAgICAgJHNjb3BlLmNvbW1hbmRTZWxlY3RvciA9IHtcbiAgICAgICAgZmlsdGVyVGV4dDogXCJcIixcbiAgICAgICAgZm9sZGVyczogW10sXG4gICAgICAgIHNlbGVjdGVkQ29tbWFuZHM6IFtdLFxuICAgICAgICBleHBhbmRlZEZvbGRlcnM6IHt9LFxuXG4gICAgICAgIGlzT3BlbjogKGZvbGRlcikgPT4ge1xuICAgICAgICAgIHZhciBmaWx0ZXJUZXh0ID0gJHNjb3BlLnRhYmxlQ29uZmlnLmZpbHRlck9wdGlvbnMuZmlsdGVyVGV4dDtcbiAgICAgICAgICBpZiAoZmlsdGVyVGV4dCAhPT0gJycgfHwgJHNjb3BlLmNvbW1hbmRTZWxlY3Rvci5leHBhbmRlZEZvbGRlcnNbZm9sZGVyLmlkXSkge1xuICAgICAgICAgICAgcmV0dXJuIFwib3BlbmVkXCI7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiBcImNsb3NlZFwiO1xuICAgICAgICB9LFxuXG4gICAgICAgIGNsZWFyU2VsZWN0ZWQ6ICgpID0+IHtcbiAgICAgICAgICAkc2NvcGUuY29tbWFuZFNlbGVjdG9yLmV4cGFuZGVkRm9sZGVycyA9IHt9O1xuICAgICAgICAgIENvcmUuJGFwcGx5KCRzY29wZSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgdXBkYXRlU2VsZWN0ZWQ6ICgpID0+IHtcbiAgICAgICAgICAvLyBsZXRzIHVwZGF0ZSB0aGUgc2VsZWN0ZWQgYXBwc1xuICAgICAgICAgIHZhciBzZWxlY3RlZENvbW1hbmRzID0gW107XG4gICAgICAgICAgYW5ndWxhci5mb3JFYWNoKCRzY29wZS5tb2RlbC5hcHBGb2xkZXJzLCAoZm9sZGVyKSA9PiB7XG4gICAgICAgICAgICB2YXIgYXBwcyA9IGZvbGRlci5hcHBzLmZpbHRlcigoYXBwKSA9PiBhcHAuc2VsZWN0ZWQpO1xuICAgICAgICAgICAgaWYgKGFwcHMpIHtcbiAgICAgICAgICAgICAgc2VsZWN0ZWRDb21tYW5kcyA9IHNlbGVjdGVkQ29tbWFuZHMuY29uY2F0KGFwcHMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICAgICRzY29wZS5jb21tYW5kU2VsZWN0b3Iuc2VsZWN0ZWRDb21tYW5kcyA9IHNlbGVjdGVkQ29tbWFuZHMuc29ydEJ5KFwibmFtZVwiKTtcbiAgICAgICAgfSxcblxuICAgICAgICBzZWxlY3Q6IChjb21tYW5kLCBmbGFnKSA9PiB7XG4gICAgICAgICAgdmFyIGlkID0gY29tbWFuZC5uYW1lO1xuLypcbiAgICAgICAgICBhcHAuc2VsZWN0ZWQgPSBmbGFnO1xuKi9cbiAgICAgICAgICAkc2NvcGUuY29tbWFuZFNlbGVjdG9yLnVwZGF0ZVNlbGVjdGVkKCk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgZ2V0U2VsZWN0ZWRDbGFzczogKGFwcCkgPT4ge1xuICAgICAgICAgIGlmIChhcHAuYWJzdHJhY3QpIHtcbiAgICAgICAgICAgIHJldHVybiBcImFic3RyYWN0XCI7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChhcHAuc2VsZWN0ZWQpIHtcbiAgICAgICAgICAgIHJldHVybiBcInNlbGVjdGVkXCI7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiBcIlwiO1xuICAgICAgICB9LFxuXG4gICAgICAgIHNob3dDb21tYW5kOiAoY29tbWFuZCkgPT4ge1xuICAgICAgICAgIHJldHVybiBjb21tYW5kTWF0Y2hlcyhjb21tYW5kKTtcbiAgICAgICAgfSxcblxuICAgICAgICBzaG93Rm9sZGVyOiAoZm9sZGVyKSA9PiB7XG4gICAgICAgICAgdmFyIGZpbHRlclRleHQgPSAkc2NvcGUudGFibGVDb25maWcuZmlsdGVyT3B0aW9ucy5maWx0ZXJUZXh0O1xuICAgICAgICAgIHJldHVybiAhZmlsdGVyVGV4dCB8fCBmb2xkZXIuY29tbWFuZHMuc29tZSgoYXBwKSA9PiBjb21tYW5kTWF0Y2hlcyhhcHApKTtcbiAgICAgICAgfVxuICAgICAgfTtcblxuXG4gICAgICB2YXIgdXJsID0gVXJsSGVscGVycy5qb2luKEZvcmdlQXBpVVJMLCBcImNvbW1hbmRzXCIsICRzY29wZS5yZXNvdXJjZVBhdGgpO1xuICAgICAgdXJsID0gY3JlYXRlSHR0cFVybCh1cmwpO1xuICAgICAgbG9nLmluZm8oXCJGZXRjaGluZyBjb21tYW5kcyBmcm9tOiBcIiArIHVybCk7XG4gICAgICAkaHR0cC5nZXQodXJsLCBjcmVhdGVIdHRwQ29uZmlnKCkpLlxuICAgICAgICBzdWNjZXNzKGZ1bmN0aW9uIChkYXRhLCBzdGF0dXMsIGhlYWRlcnMsIGNvbmZpZykge1xuICAgICAgICAgIGlmIChhbmd1bGFyLmlzQXJyYXkoZGF0YSkgJiYgc3RhdHVzID09PSAyMDApIHtcbiAgICAgICAgICAgIHZhciByZXNvdXJjZVBhdGggPSAkc2NvcGUucmVzb3VyY2VQYXRoO1xuICAgICAgICAgICAgdmFyIGZvbGRlck1hcCA9IHt9O1xuICAgICAgICAgICAgdmFyIGZvbGRlcnMgPSBbXTtcbiAgICAgICAgICAgICRzY29wZS5jb21tYW5kcyA9IF8uc29ydEJ5KGRhdGEsIFwibmFtZVwiKTtcbiAgICAgICAgICAgIGFuZ3VsYXIuZm9yRWFjaCgkc2NvcGUuY29tbWFuZHMsIChjb21tYW5kKSA9PiB7XG4gICAgICAgICAgICAgIHZhciBpZCA9IGNvbW1hbmQuaWQgfHwgY29tbWFuZC5uYW1lO1xuICAgICAgICAgICAgICBjb21tYW5kLiRsaW5rID0gY29tbWFuZExpbmsoJHNjb3BlLnByb2plY3RJZCwgaWQsIHJlc291cmNlUGF0aCk7XG5cbiAgICAgICAgICAgICAgdmFyIG5hbWUgPSBjb21tYW5kLm5hbWUgfHwgY29tbWFuZC5pZDtcbiAgICAgICAgICAgICAgdmFyIGZvbGRlck5hbWUgPSBjb21tYW5kLmNhdGVnb3J5O1xuICAgICAgICAgICAgICB2YXIgc2hvcnROYW1lID0gbmFtZTtcbiAgICAgICAgICAgICAgdmFyIG5hbWVzID0gbmFtZS5zcGxpdChcIjpcIiwgMik7XG4gICAgICAgICAgICAgIGlmIChuYW1lcyAhPSBudWxsICYmIG5hbWVzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICAgICAgICBmb2xkZXJOYW1lID0gbmFtZXNbMF07XG4gICAgICAgICAgICAgICAgc2hvcnROYW1lID0gbmFtZXNbMV0udHJpbSgpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGlmIChmb2xkZXJOYW1lID09PSBcIlByb2plY3QvQnVpbGRcIikge1xuICAgICAgICAgICAgICAgIGZvbGRlck5hbWUgPSBcIlByb2plY3RcIjtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBjb21tYW5kLiRzaG9ydE5hbWUgPSBzaG9ydE5hbWU7XG4gICAgICAgICAgICAgIGNvbW1hbmQuJGZvbGRlck5hbWUgPSBmb2xkZXJOYW1lO1xuICAgICAgICAgICAgICB2YXIgZm9sZGVyID0gZm9sZGVyTWFwW2ZvbGRlck5hbWVdO1xuICAgICAgICAgICAgICBpZiAoIWZvbGRlcikge1xuICAgICAgICAgICAgICAgIGZvbGRlciA9IHtcbiAgICAgICAgICAgICAgICAgIG5hbWU6IGZvbGRlck5hbWUsXG4gICAgICAgICAgICAgICAgICBjb21tYW5kczogW11cbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIGZvbGRlck1hcFtmb2xkZXJOYW1lXSA9IGZvbGRlcjtcbiAgICAgICAgICAgICAgICBmb2xkZXJzLnB1c2goZm9sZGVyKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBmb2xkZXIuY29tbWFuZHMucHVzaChjb21tYW5kKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgZm9sZGVycyA9IF8uc29ydEJ5KGZvbGRlcnMsIFwibmFtZVwiKTtcbiAgICAgICAgICAgIGFuZ3VsYXIuZm9yRWFjaChmb2xkZXJzLCAoZm9sZGVyKSA9PiB7XG4gICAgICAgICAgICAgIGZvbGRlci5jb21tYW5kcyA9IF8uc29ydEJ5KGZvbGRlci5jb21tYW5kcywgXCIkc2hvcnROYW1lXCIpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAkc2NvcGUuY29tbWFuZFNlbGVjdG9yLmZvbGRlcnMgPSBmb2xkZXJzO1xuXG4gICAgICAgICAgICBzZXRNb2RlbENvbW1hbmRzKCRzY29wZS5tb2RlbCwgJHNjb3BlLnJlc291cmNlUGF0aCwgJHNjb3BlLmNvbW1hbmRzKTtcbiAgICAgICAgICAgICRzY29wZS5mZXRjaGVkID0gdHJ1ZTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pLlxuICAgICAgICBlcnJvcihmdW5jdGlvbiAoZGF0YSwgc3RhdHVzLCBoZWFkZXJzLCBjb25maWcpIHtcbiAgICAgICAgICBsb2cud2FybihcImZhaWxlZCB0byBsb2FkIFwiICsgdXJsICsgXCIuIHN0YXR1czogXCIgKyBzdGF0dXMgKyBcIiBkYXRhOiBcIiArIGRhdGEpO1xuICAgICAgICB9KTtcblxuICAgIH1dKTtcbn1cbiIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9pbmNsdWRlcy50c1wiLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJmb3JnZUhlbHBlcnMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiZm9yZ2VQbHVnaW4udHNcIi8+XG5cbm1vZHVsZSBGb3JnZSB7XG5cbiAgZXhwb3J0IHZhciBSZXBvQ29udHJvbGxlciA9IGNvbnRyb2xsZXIoXCJSZXBvQ29udHJvbGxlclwiLFxuICAgIFtcIiRzY29wZVwiLCBcIiR0ZW1wbGF0ZUNhY2hlXCIsIFwiJGxvY2F0aW9uXCIsIFwiJHJvdXRlUGFyYW1zXCIsIFwiJGh0dHBcIiwgXCIkdGltZW91dFwiLCBcIkZvcmdlQXBpVVJMXCIsXG4gICAgICAoJHNjb3BlLCAkdGVtcGxhdGVDYWNoZTpuZy5JVGVtcGxhdGVDYWNoZVNlcnZpY2UsICRsb2NhdGlvbjpuZy5JTG9jYXRpb25TZXJ2aWNlLCAkcm91dGVQYXJhbXMsICRodHRwLCAkdGltZW91dCwgRm9yZ2VBcGlVUkwpID0+IHtcblxuICAgICAgICAkc2NvcGUubmFtZSA9ICRyb3V0ZVBhcmFtc1tcInBhdGhcIl07XG5cbiAgICAgICAgaW5pdFNjb3BlKCRzY29wZSwgJGxvY2F0aW9uLCAkcm91dGVQYXJhbXMpO1xuICAgICAgICByZWRpcmVjdFRvR29nc0xvZ2luSWZSZXF1aXJlZCgkc2NvcGUsICRsb2NhdGlvbik7XG5cbiAgICAgICAgJHNjb3BlLiRvbignJHJvdXRlVXBkYXRlJywgKCRldmVudCkgPT4ge1xuICAgICAgICAgIHVwZGF0ZURhdGEoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdXBkYXRlRGF0YSgpO1xuXG4gICAgICAgIGZ1bmN0aW9uIHVwZGF0ZURhdGEoKSB7XG4gICAgICAgICAgaWYgKCRzY29wZS5uYW1lKSB7XG4gICAgICAgICAgICB2YXIgdXJsID0gcmVwb0FwaVVybChGb3JnZUFwaVVSTCwgJHNjb3BlLm5hbWUpO1xuICAgICAgICAgICAgdXJsID0gY3JlYXRlSHR0cFVybCh1cmwpO1xuICAgICAgICAgICAgdmFyIGNvbmZpZyA9IGNyZWF0ZUh0dHBDb25maWcoKTtcbiAgICAgICAgICAgICRodHRwLmdldCh1cmwsIGNvbmZpZykuXG4gICAgICAgICAgICAgIHN1Y2Nlc3MoZnVuY3Rpb24gKGRhdGEsIHN0YXR1cywgaGVhZGVycywgY29uZmlnKSB7XG4gICAgICAgICAgICAgICAgaWYgKGRhdGEpIHtcbiAgICAgICAgICAgICAgICAgIGVucmljaFJlcG8oZGF0YSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICRzY29wZS5lbnRpdHkgPSBkYXRhO1xuICAgICAgICAgICAgICAgICRzY29wZS5mZXRjaGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgfSkuXG4gICAgICAgICAgICAgIGVycm9yKGZ1bmN0aW9uIChkYXRhLCBzdGF0dXMsIGhlYWRlcnMsIGNvbmZpZykge1xuICAgICAgICAgICAgICAgIGxvZy53YXJuKFwiZmFpbGVkIHRvIGxvYWQgXCIgKyB1cmwgKyBcIi4gc3RhdHVzOiBcIiArIHN0YXR1cyArIFwiIGRhdGE6IFwiICsgZGF0YSk7XG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAkc2NvcGUuZmV0Y2hlZCA9IHRydWU7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XSk7XG59XG4iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vaW5jbHVkZXMudHNcIi8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiZm9yZ2VIZWxwZXJzLnRzXCIvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cImZvcmdlUGx1Z2luLnRzXCIvPlxuXG5tb2R1bGUgRm9yZ2Uge1xuXG4gIGV4cG9ydCB2YXIgUmVwb3NDb250cm9sbGVyID0gY29udHJvbGxlcihcIlJlcG9zQ29udHJvbGxlclwiLCBbXCIkc2NvcGVcIiwgXCIkZGlhbG9nXCIsIFwiJHdpbmRvd1wiLCBcIiR0ZW1wbGF0ZUNhY2hlXCIsIFwiJHJvdXRlUGFyYW1zXCIsIFwiJGxvY2F0aW9uXCIsIFwibG9jYWxTdG9yYWdlXCIsIFwiJGh0dHBcIiwgXCIkdGltZW91dFwiLCBcIkZvcmdlQXBpVVJMXCIsIFwiS3ViZXJuZXRlc01vZGVsXCIsIFwiU2VydmljZVJlZ2lzdHJ5XCIsXG4gICAgKCRzY29wZSwgJGRpYWxvZywgJHdpbmRvdywgJHRlbXBsYXRlQ2FjaGUsICRyb3V0ZVBhcmFtcywgJGxvY2F0aW9uOm5nLklMb2NhdGlvblNlcnZpY2UsIGxvY2FsU3RvcmFnZSwgJGh0dHAsICR0aW1lb3V0LCBGb3JnZUFwaVVSTCwgS3ViZXJuZXRlc01vZGVsOiBLdWJlcm5ldGVzLkt1YmVybmV0ZXNNb2RlbFNlcnZpY2UsIFNlcnZpY2VSZWdpc3RyeSkgPT4ge1xuXG4gICAgICAkc2NvcGUubW9kZWwgPSBLdWJlcm5ldGVzTW9kZWw7XG4gICAgICAkc2NvcGUucmVzb3VyY2VQYXRoID0gJHJvdXRlUGFyYW1zW1wicGF0aFwiXTtcbiAgICAgICRzY29wZS5jb21tYW5kc0xpbmsgPSAocGF0aCkgPT4gY29tbWFuZHNMaW5rKHBhdGgsICRzY29wZS5wcm9qZWN0SWQpO1xuXG4gICAgICBpbml0U2NvcGUoJHNjb3BlLCAkbG9jYXRpb24sICRyb3V0ZVBhcmFtcyk7XG5cbiAgICAgICRzY29wZS4kb24oJ2t1YmVybmV0ZXNNb2RlbFVwZGF0ZWQnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHVwZGF0ZUxpbmtzKCk7XG4gICAgICAgIENvcmUuJGFwcGx5KCRzY29wZSk7XG4gICAgICB9KTtcblxuICAgICAgJHNjb3BlLnRhYmxlQ29uZmlnID0ge1xuICAgICAgICBkYXRhOiAncHJvamVjdHMnLFxuICAgICAgICBzaG93U2VsZWN0aW9uQ2hlY2tib3g6IHRydWUsXG4gICAgICAgIGVuYWJsZVJvd0NsaWNrU2VsZWN0aW9uOiBmYWxzZSxcbiAgICAgICAgbXVsdGlTZWxlY3Q6IHRydWUsXG4gICAgICAgIHNlbGVjdGVkSXRlbXM6IFtdLFxuICAgICAgICBmaWx0ZXJPcHRpb25zOiB7XG4gICAgICAgICAgZmlsdGVyVGV4dDogJGxvY2F0aW9uLnNlYXJjaCgpW1wicVwiXSB8fCAnJ1xuICAgICAgICB9LFxuICAgICAgICBjb2x1bW5EZWZzOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgZmllbGQ6ICduYW1lJyxcbiAgICAgICAgICAgIGRpc3BsYXlOYW1lOiAnUmVwb3NpdG9yeSBOYW1lJyxcbiAgICAgICAgICAgIGNlbGxUZW1wbGF0ZTogJHRlbXBsYXRlQ2FjaGUuZ2V0KFwicmVwb1RlbXBsYXRlLmh0bWxcIilcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIGZpZWxkOiAnYWN0aW9ucycsXG4gICAgICAgICAgICBkaXNwbGF5TmFtZTogJ0FjdGlvbnMnLFxuICAgICAgICAgICAgY2VsbFRlbXBsYXRlOiAkdGVtcGxhdGVDYWNoZS5nZXQoXCJyZXBvQWN0aW9uc1RlbXBsYXRlLmh0bWxcIilcbiAgICAgICAgICB9XG4gICAgICAgIF1cbiAgICAgIH07XG5cbiAgICAgICRzY29wZS5sb2dpbiA9IHtcbiAgICAgICAgYXV0aEhlYWRlcjogbG9jYWxTdG9yYWdlW1wiZ29nc0F1dGhvcml6YXRpb25cIl0gfHwgXCJcIixcbiAgICAgICAgcmVsb2dpbjogZmFsc2UsXG4gICAgICAgIGF2YXRhcl91cmw6IGxvY2FsU3RvcmFnZVtcImdvZ3NBdmF0YXJVcmxcIl0gfHwgXCJcIixcbiAgICAgICAgdXNlcjogbG9jYWxTdG9yYWdlW1wiZ29nc1VzZXJcIl0gfHwgXCJcIixcbiAgICAgICAgcGFzc3dvcmQ6IFwiXCIsXG4gICAgICAgIGVtYWlsOiBsb2NhbFN0b3JhZ2VbXCJnb2dzRW1haWxcIl0gfHwgXCJcIlxuICAgICAgfTtcblxuICAgICAgJHNjb3BlLmRvTG9naW4gPSAoKSA9PiB7XG4gICAgICAgIHZhciBsb2dpbiA9ICRzY29wZS5sb2dpbjtcbiAgICAgICAgdmFyIHVzZXIgPSBsb2dpbi51c2VyO1xuICAgICAgICB2YXIgcGFzc3dvcmQgPSBsb2dpbi5wYXNzd29yZDtcbiAgICAgICAgaWYgKHVzZXIgJiYgcGFzc3dvcmQpIHtcbiAgICAgICAgICB2YXIgdXNlclB3ZCA9IHVzZXIgKyAnOicgKyBwYXNzd29yZDtcbiAgICAgICAgICBsb2dpbi5hdXRoSGVhZGVyID0gJ0Jhc2ljICcgKyAodXNlclB3ZC5lbmNvZGVCYXNlNjQoKSk7XG4gICAgICAgICAgdXBkYXRlRGF0YSgpO1xuICAgICAgICB9XG4gICAgICB9O1xuXG4gICAgICAkc2NvcGUubG9nb3V0ID0gKCkgPT4ge1xuICAgICAgICBkZWxldGUgbG9jYWxTdG9yYWdlW1wiZ29nc0F1dGhvcml6YXRpb25cIl07XG4gICAgICAgICRzY29wZS5sb2dpbi5hdXRoSGVhZGVyID0gbnVsbDtcbiAgICAgICAgJHNjb3BlLmxvZ2luLmxvZ2dlZEluID0gZmFsc2U7XG4gICAgICAgICRzY29wZS5sb2dpbi5mYWlsZWQgPSBmYWxzZTtcbiAgICAgICAgbG9nZ2VkSW5Ub0dvZ3MgPSBmYWxzZTtcbiAgICAgIH07XG5cblxuICAgICAgJHNjb3BlLm9wZW5Db21tYW5kcyA9ICgpID0+IHtcbiAgICAgICAgdmFyIHJlc291cmNlUGF0aCA9IG51bGw7XG4gICAgICAgIHZhciBzZWxlY3RlZCA9ICRzY29wZS50YWJsZUNvbmZpZy5zZWxlY3RlZEl0ZW1zO1xuICAgICAgICBpZiAoXy5pc0FycmF5KHNlbGVjdGVkKSAmJiBzZWxlY3RlZC5sZW5ndGgpIHtcbiAgICAgICAgICByZXNvdXJjZVBhdGggPSBzZWxlY3RlZFswXS5wYXRoO1xuICAgICAgICB9XG4gICAgICAgIHZhciBsaW5rID0gY29tbWFuZHNMaW5rKHJlc291cmNlUGF0aCwgJHNjb3BlLnByb2plY3RJZCk7XG4gICAgICAgIGxvZy5pbmZvKFwibW92aW5nIHRvIGNvbW1hbmRzIGxpbms6IFwiICsgbGluayk7XG4gICAgICAgICRsb2NhdGlvbi5wYXRoKGxpbmspO1xuICAgICAgfTtcblxuICAgICAgJHNjb3BlLmRlbGV0ZSA9IChwcm9qZWN0cykgPT4ge1xuICAgICAgICBVSS5tdWx0aUl0ZW1Db25maXJtQWN0aW9uRGlhbG9nKDxVSS5NdWx0aUl0ZW1Db25maXJtQWN0aW9uT3B0aW9ucz57XG4gICAgICAgICAgY29sbGVjdGlvbjogcHJvamVjdHMsXG4gICAgICAgICAgaW5kZXg6ICdwYXRoJyxcbiAgICAgICAgICBvbkNsb3NlOiAocmVzdWx0OmJvb2xlYW4pID0+IHtcbiAgICAgICAgICAgIGlmIChyZXN1bHQpIHtcbiAgICAgICAgICAgICAgZG9EZWxldGUocHJvamVjdHMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0sXG4gICAgICAgICAgdGl0bGU6ICdEZWxldGUgcHJvamVjdHM/JyxcbiAgICAgICAgICBhY3Rpb246ICdUaGUgZm9sbG93aW5nIHByb2plY3RzIHdpbGwgYmUgcmVtb3ZlZCAodGhvdWdoIHRoZSBmaWxlcyB3aWxsIHJlbWFpbiBvbiB5b3VyIGZpbGUgc3lzdGVtKTonLFxuICAgICAgICAgIG9rVGV4dDogJ0RlbGV0ZScsXG4gICAgICAgICAgb2tDbGFzczogJ2J0bi1kYW5nZXInLFxuICAgICAgICAgIGN1c3RvbTogXCJUaGlzIG9wZXJhdGlvbiBpcyBwZXJtYW5lbnQgb25jZSBjb21wbGV0ZWQhXCIsXG4gICAgICAgICAgY3VzdG9tQ2xhc3M6IFwiYWxlcnQgYWxlcnQtd2FybmluZ1wiXG4gICAgICAgIH0pLm9wZW4oKTtcbiAgICAgIH07XG5cbiAgICAgIHVwZGF0ZUxpbmtzKCk7XG5cbiAgICAgIGZ1bmN0aW9uIGRvRGVsZXRlKHByb2plY3RzKSB7XG4gICAgICAgIGFuZ3VsYXIuZm9yRWFjaChwcm9qZWN0cywgKHByb2plY3QpID0+IHtcbiAgICAgICAgICBsb2cuaW5mbyhcIkRlbGV0aW5nIFwiICsgYW5ndWxhci50b0pzb24oJHNjb3BlLnByb2plY3RzKSk7XG4gICAgICAgICAgdmFyIHBhdGggPSBwcm9qZWN0LnBhdGg7XG4gICAgICAgICAgaWYgKHBhdGgpIHtcbiAgICAgICAgICAgIHZhciB1cmwgPSByZXBvQXBpVXJsKEZvcmdlQXBpVVJMLCBwYXRoKTtcbiAgICAgICAgICAgICRodHRwLmRlbGV0ZSh1cmwpLlxuICAgICAgICAgICAgICBzdWNjZXNzKGZ1bmN0aW9uIChkYXRhLCBzdGF0dXMsIGhlYWRlcnMsIGNvbmZpZykge1xuICAgICAgICAgICAgICAgIHVwZGF0ZURhdGEoKTtcbiAgICAgICAgICAgICAgfSkuXG4gICAgICAgICAgICAgIGVycm9yKGZ1bmN0aW9uIChkYXRhLCBzdGF0dXMsIGhlYWRlcnMsIGNvbmZpZykge1xuICAgICAgICAgICAgICAgIGxvZy53YXJuKFwiZmFpbGVkIHRvIGxvYWQgXCIgKyB1cmwgKyBcIi4gc3RhdHVzOiBcIiArIHN0YXR1cyArIFwiIGRhdGE6IFwiICsgZGF0YSk7XG4gICAgICAgICAgICAgICAgdmFyIG1lc3NhZ2UgPSBcIkZhaWxlZCB0byBQT1NUIHRvIFwiICsgdXJsICsgXCIgZ290IHN0YXR1czogXCIgKyBzdGF0dXM7XG4gICAgICAgICAgICAgICAgQ29yZS5ub3RpZmljYXRpb24oJ2Vycm9yJywgbWVzc2FnZSk7XG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIGZ1bmN0aW9uIHVwZGF0ZUxpbmtzKCkge1xuICAgICAgICB2YXIgJGdvZ3NMaW5rID0gU2VydmljZVJlZ2lzdHJ5LnNlcnZpY2VSZWFkeUxpbmsoZ29nc1NlcnZpY2VOYW1lKTtcbiAgICAgICAgaWYgKCRnb2dzTGluaykge1xuICAgICAgICAgICRzY29wZS5zaWduVXBVcmwgPSBVcmxIZWxwZXJzLmpvaW4oJGdvZ3NMaW5rLCBcInVzZXIvc2lnbl91cFwiKTtcbiAgICAgICAgICAkc2NvcGUuZm9yZ290UGFzc3dvcmRVcmwgPSBVcmxIZWxwZXJzLmpvaW4oJGdvZ3NMaW5rLCBcInVzZXIvZm9yZ2V0X3Bhc3N3b3JkXCIpO1xuICAgICAgICB9XG4gICAgICAgICRzY29wZS4kZ29nc0xpbmsgPSAkZ29nc0xpbms7XG4gICAgICAgICRzY29wZS4kZm9yZ2VMaW5rID0gU2VydmljZVJlZ2lzdHJ5LnNlcnZpY2VSZWFkeUxpbmsoS3ViZXJuZXRlcy5mYWJyaWM4Rm9yZ2VTZXJ2aWNlTmFtZSk7XG5cbiAgICAgICAgJHNjb3BlLiRoYXNDRFBpcGVsaW5lVGVtcGxhdGUgPSBfLmFueSgkc2NvcGUubW9kZWwudGVtcGxhdGVzLCAodCkgPT4gXCJjZC1waXBlbGluZVwiID09PSBLdWJlcm5ldGVzLmdldE5hbWUodCkpO1xuXG4gICAgICAgIHZhciBleHBlY3RlZFJDUyA9IFtLdWJlcm5ldGVzLmdvZ3NTZXJ2aWNlTmFtZSwgS3ViZXJuZXRlcy5mYWJyaWM4Rm9yZ2VTZXJ2aWNlTmFtZSwgS3ViZXJuZXRlcy5qZW5raW5zU2VydmljZU5hbWVdO1xuICAgICAgICB2YXIgcmVxdWlyZWRSQ3MgPSB7fTtcbiAgICAgICAgdmFyIG5zID0gS3ViZXJuZXRlcy5jdXJyZW50S3ViZXJuZXRlc05hbWVzcGFjZSgpO1xuICAgICAgICB2YXIgcnVubmluZ0NEUGlwZWxpbmUgPSB0cnVlO1xuICAgICAgICBhbmd1bGFyLmZvckVhY2goZXhwZWN0ZWRSQ1MsIChyY05hbWUpID0+IHtcbiAgICAgICAgICB2YXIgcmMgPSAkc2NvcGUubW9kZWwuZ2V0UmVwbGljYXRpb25Db250cm9sbGVyKG5zLCByY05hbWUpO1xuICAgICAgICAgIGlmIChyYykge1xuICAgICAgICAgICAgcmVxdWlyZWRSQ3NbcmNOYW1lXSA9IHJjO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBydW5uaW5nQ0RQaXBlbGluZSA9IGZhbHNlO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgICRzY29wZS4kcmVxdWlyZWRSQ3MgPSByZXF1aXJlZFJDcztcbiAgICAgICAgJHNjb3BlLiRydW5uaW5nQ0RQaXBlbGluZSA9IHJ1bm5pbmdDRFBpcGVsaW5lO1xuICAgICAgICB2YXIgdXJsID0gXCJcIjtcbiAgICAgICAgJGxvY2F0aW9uID0gS3ViZXJuZXRlcy5pbmplY3QoXCIkbG9jYXRpb25cIik7XG4gICAgICAgIGlmICgkbG9jYXRpb24pIHtcbiAgICAgICAgICB1cmwgPSAkbG9jYXRpb24udXJsKCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCF1cmwpIHtcbiAgICAgICAgICB1cmwgPSB3aW5kb3cubG9jYXRpb24udG9TdHJpbmcoKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBUT0RPIHNob3VsZCB3ZSBzdXBwb3J0IGFueSBvdGhlciB0ZW1wbGF0ZSBuYW1lc3BhY2VzP1xuICAgICAgICB2YXIgdGVtcGxhdGVOYW1lc3BhY2UgPSBcImRlZmF1bHRcIjtcbiAgICAgICAgJHNjb3BlLiRydW5DRFBpcGVsaW5lTGluayA9IFwiL2t1YmVybmV0ZXMvbmFtZXNwYWNlL1wiICsgdGVtcGxhdGVOYW1lc3BhY2UgKyBcIi90ZW1wbGF0ZXMvXCIgKyBucyArIFwiP3E9Y2QtcGlwZWxpbmUmcmV0dXJuVG89XCIgKyBlbmNvZGVVUklDb21wb25lbnQodXJsKTtcbiAgICAgIH1cblxuICAgICAgZnVuY3Rpb24gdXBkYXRlRGF0YSgpIHtcbiAgICAgICAgdmFyIGF1dGhIZWFkZXIgPSAkc2NvcGUubG9naW4uYXV0aEhlYWRlcjtcbiAgICAgICAgdmFyIGVtYWlsID0gJHNjb3BlLmxvZ2luLmVtYWlsIHx8IFwiXCI7XG4gICAgICAgIGlmIChhdXRoSGVhZGVyKSB7XG4gICAgICAgICAgdmFyIHVybCA9IHJlcG9zQXBpVXJsKEZvcmdlQXBpVVJMKTtcbiAgICAgICAgICB1cmwgPSBjcmVhdGVIdHRwVXJsKHVybCwgYXV0aEhlYWRlciwgZW1haWwpO1xuICAgICAgICAgIHZhciBjb25maWcgPSB7XG4vKlxuICAgICAgICAgICAgaGVhZGVyczoge1xuICAgICAgICAgICAgICBHb2dzQXV0aG9yaXphdGlvbjogYXV0aEhlYWRlcixcbiAgICAgICAgICAgICAgR29nc0VtYWlsOiBlbWFpbFxuICAgICAgICAgICAgfVxuKi9cbiAgICAgICAgICB9O1xuICAgICAgICAgICRodHRwLmdldCh1cmwsIGNvbmZpZykuXG4gICAgICAgICAgICBzdWNjZXNzKGZ1bmN0aW9uIChkYXRhLCBzdGF0dXMsIGhlYWRlcnMsIGNvbmZpZykge1xuICAgICAgICAgICAgICAkc2NvcGUubG9naW4uZmFpbGVkID0gZmFsc2U7XG4gICAgICAgICAgICAgICRzY29wZS5sb2dpbi5sb2dnZWRJbiA9IHRydWU7XG4gICAgICAgICAgICAgIGxvZ2dlZEluVG9Hb2dzID0gdHJ1ZTtcbiAgICAgICAgICAgICAgdmFyIGF2YXRhcl91cmwgPSBudWxsO1xuICAgICAgICAgICAgICBpZiAoc3RhdHVzID09PSAyMDApIHtcbiAgICAgICAgICAgICAgICBpZiAoIWRhdGEgfHwgIWFuZ3VsYXIuaXNBcnJheShkYXRhKSkge1xuICAgICAgICAgICAgICAgICAgZGF0YSA9IFtdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyBsZXRzIHN0b3JlIGEgc3VjY2Vzc2Z1bCBsb2dpbiBzbyB0aGF0IHdlIGhpZGUgdGhlIGxvZ2luIHBhZ2VcbiAgICAgICAgICAgICAgICBsb2NhbFN0b3JhZ2VbXCJnb2dzQXV0aG9yaXphdGlvblwiXSA9IGF1dGhIZWFkZXI7XG4gICAgICAgICAgICAgICAgbG9jYWxTdG9yYWdlW1wiZ29nc0VtYWlsXCJdID0gZW1haWw7XG4gICAgICAgICAgICAgICAgbG9jYWxTdG9yYWdlW1wiZ29nc1VzZXJcIl0gPSAkc2NvcGUubG9naW4udXNlciB8fCBcIlwiO1xuXG4gICAgICAgICAgICAgICAgJHNjb3BlLnByb2plY3RzID0gXy5zb3J0QnkoZGF0YSwgXCJuYW1lXCIpO1xuICAgICAgICAgICAgICAgIGFuZ3VsYXIuZm9yRWFjaCgkc2NvcGUucHJvamVjdHMsIChyZXBvKSA9PiB7XG4gICAgICAgICAgICAgICAgICBlbnJpY2hSZXBvKHJlcG8pO1xuICAgICAgICAgICAgICAgICAgaWYgKCFhdmF0YXJfdXJsKSB7XG4gICAgICAgICAgICAgICAgICAgIGF2YXRhcl91cmwgPSBDb3JlLnBhdGhHZXQocmVwbywgW1wib3duZXJcIiwgXCJhdmF0YXJfdXJsXCJdKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGF2YXRhcl91cmwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUubG9naW4uYXZhdGFyX3VybCA9IGF2YXRhcl91cmw7XG4gICAgICAgICAgICAgICAgICAgICAgbG9jYWxTdG9yYWdlW1wiZ29nc0F2YXRhclVybFwiXSA9IGF2YXRhcl91cmw7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAkc2NvcGUuZmV0Y2hlZCA9IHRydWU7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pLlxuICAgICAgICAgICAgZXJyb3IoZnVuY3Rpb24gKGRhdGEsIHN0YXR1cywgaGVhZGVycywgY29uZmlnKSB7XG4gICAgICAgICAgICAgICRzY29wZS5sb2dvdXQoKTtcbiAgICAgICAgICAgICAgJHNjb3BlLmxvZ2luLmZhaWxlZCA9IHRydWU7XG4gICAgICAgICAgICAgIGlmIChzdGF0dXMgIT09IDQwMykge1xuICAgICAgICAgICAgICAgIGxvZy53YXJuKFwiZmFpbGVkIHRvIGxvYWQgXCIgKyB1cmwgKyBcIi4gc3RhdHVzOiBcIiArIHN0YXR1cyArIFwiIGRhdGE6IFwiICsgZGF0YSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHVwZGF0ZURhdGEoKTtcblxuICAgIH1dKTtcbn1cbiJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==
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
$templateCache.put("plugins/wiki/html/viewNavBar.html","<div class=\"row\">\n  <div hawtio-breadcrumbs></div>\n</div>\n\n<!--\n<div class=\"row\">\n  <div hawtio-tabs></div>\n</div>\n-->\n<div ng-hide=\"inDashboard\" class=\"wiki logbar\" ng-controller=\"Wiki.NavBarController\">\n  <div class=\"wiki logbar-container\">\n    <ul class=\"nav nav-tabs\">\n      <li ng-show=\"branches.length || branch\">\n        <div hawtio-drop-down=\"branchMenuConfig\"></div>\n      </li>\n      <li ng-repeat=\"link in breadcrumbs\" ng-class=\'{active : isActive(link.href) && !objectId}\'>\n        <a class=\"breadcrumb-link\" ng-href=\"{{link.href}}\">\n          <span class=\"contained c-medium\">{{link.name}}</span>\n        </a>\n      </li>\n      <li ng-show=\"objectId\">\n        <a ng-href=\"{{historyLink}}{{hash}}\">History</a>\n      </li>\n      <li ng-show=\"objectId\" class=\"active\">\n        <a>{{objectId}}</a>\n      </li>\n\n      <li class=\"pull-right dropdown\">\n        <a href=\"\" class=\"dropdown-toggle\" data-toggle=\"dropdown\">\n          <i class=\"fa fa-ellipsis-v\"></i>\n        </a>\n        <ul class=\"dropdown-menu\">\n          <li ng-show=\"sourceLink()\">\n            <a ng-href=\"{{sourceLink()}}\" title=\"View source code\"\n               data-placement=\"bottom\">\n              <i class=\"fa fa-file-o\"></i> Source</a>\n          </li>\n          <li>\n            <a ng-href=\"{{historyLink}}{{hash}}\" ng-hide=\"!historyLink\" title=\"View the history of this file\"\n               data-placement=\"bottom\">\n              <i class=\"fa fa-comments-alt\"></i> History</a>\n          </li>\n          <!--\n          <li class=\"divider\">\n          </li>\n          -->\n          <li ng-hide=\"gridOptions.selectedItems.length !== 1\" hawtio-show object-name=\"{{gitMBean}}\" method-name=\"rename\">\n            <a ng-click=\"openRenameDialog()\"\n               title=\"Rename the selected document\"\n               data-placement=\"bottom\">\n              <i class=\"fa fa-adjust\"></i> Rename</a>\n          </li>\n          <li ng-hide=\"!gridOptions.selectedItems.length\" hawtio-show object-name=\"{{gitMBean}}\" method-name=\"rename\">\n            <a ng-click=\"openMoveDialog()\"\n               title=\"move the selected documents to a new folder\"\n               data-placement=\"bottom\">\n              <i class=\"fa fa-move\"></i> Move</a>\n          </li>\n          <!--\n          <li class=\"divider\">\n          </li>\n          -->\n          <li ng-hide=\"!gridOptions.selectedItems.length\" hawtio-show object-name=\"{{gitMBean}}\" method-name=\"remove\">\n            <a ng-click=\"openDeleteDialog()\"\n               title=\"Delete the selected document(s)\"\n               data-placement=\"bottom\">\n              <i class=\"fa fa-remove\"></i> Delete</a>\n          </li>\n          <li class=\"divider\" ng-show=\"childActions.length\">\n          </li>\n          <li ng-repeat=\"childAction in childActions\">\n            <a ng-click=\"childAction.doAction()\"\n               title=\"{{childAction.title}}\"\n               data-placement=\"bottom\">\n              <i class=\"{{childAction.icon}}\"></i> {{childAction.name}}</a>\n          </li>\n        </ul>\n      </li>\n      <li class=\"pull-right\" hawtio-show object-name=\"{{gitMBean}}\" method-name=\"write\">\n        <a ng-href=\"{{editLink()}}{{hash}}\" ng-hide=\"!editLink()\" title=\"Edit this page\"\n           data-placement=\"bottom\">\n          <i class=\"fa fa-edit\"></i> Edit</a>\n      </li>\n      <li class=\"pull-right\" hawtio-show object-name=\"{{gitMBean}}\" method-name=\"write\">\n        <a ng-href=\"{{createLink()}}{{hash}}\"\n           title=\"Create new page\"\n           data-placement=\"bottom\">\n          <i class=\"fa fa-plus\"></i> Create</a>\n      </li>\n      <li class=\"pull-right\">\n        <div class=\"btn-group\" \n             ng-hide=\"!children || profile\">\n          <a class=\"btn btn-sm\"\n             ng-disabled=\"mode == ViewMode.List\"\n             href=\"\" \n             ng-click=\"setViewMode(ViewMode.List)\">\n            <i class=\"fa fa-list\"></i></a>\n          <a class=\"btn btn-sm\" \n             ng-disabled=\"mode == ViewMode.Icon\"\n             href=\"\" \n             ng-click=\"setViewMode(ViewMode.Icon)\">\n            <i class=\"fa fa-th-large\"></i></a>\n        </div>\n      </li>\n      <li class=\"pull-right\">\n        <a href=\"\" ng-hide=\"children || profile\" title=\"Add to dashboard\" ng-href=\"{{createDashboardLink()}}\"\n           data-placement=\"bottom\">\n          <i class=\"fa fa-share\"></i>\n        </a>\n      </li>\n    </ul>\n  </div>\n</div>\n\n\n");
$templateCache.put("plugins/wiki/html/viewPage.html","<div ng-controller=\"Wiki.ViewController\">\n  <script type=\"text/ng-template\" id=\"fileCellTemplate.html\">\n    <div class=\"ngCellText\"\n         title=\"{{fileName(row.entity)}} - Last Modified: {{row.entity.lastModified | date:\'medium\'}}, Size: {{row.entity.size}}\">\n      <a href=\"{{childLink(row.entity)}}\" class=\"file-name\" hawtio-file-drop=\"{{row.entity.fileName}}\" download-url=\"{{row.entity.downloadURL}}\">\n        <span class=\"file-icon\"\n              ng-class=\"fileClass(row.entity)\"\n              compile=\"fileIconHtml(row)\">\n        </span>{{fileName(row.entity)}}\n      </a>\n    </div>\n  </script>\n\n  <script type=\"text/ng-template\" id=\"fileColumnTemplate.html\">\n    <div class=\"ngHeaderSortColumn {{col.headerClass}}\"\n         ng-style=\"{\'cursor\': col.cursor}\"\n         ng-class=\"{ \'ngSorted\': !noSortVisible }\">\n      <div class=\"ngHeaderText\" ng-hide=\"pageId === \'/\'\">\n        <a ng-href=\"{{parentLink()}}\"\n           class=\"wiki-file-list-up\"\n           title=\"Open the parent folder\">\n          <i class=\"fa fa-level-up\"></i> Up a directory\n        </a>\n      </div>\n    </div>\n  </script>\n\n  <script type=\"text/ng-template\" id=\"imageTemplate.html\">\n    <img src=\"{{imageURL}}\">\n  </script>\n\n  <ng-include src=\"\'plugins/wiki/html/viewNavBar.html\'\"></ng-include>\n\n  <!-- Icon View -->\n  <div ng-show=\"mode == ViewMode.Icon\" class=\"wiki-fixed\">\n    <div ng-hide=\"!showAppHeader\">\n      <div class=\"row\">\n        <div class=\"col-md-12\">\n          <div kubernetes-json=\"kubernetesJson\"></div>\n        </div>\n      </div>\n    </div>\n    <div class=\"row\" ng-show=\"html && children\">\n      <div class=\"col-md-12 wiki-icon-view-header\">\n        <h5>Directories and Files</h5>\n      </div>\n    </div>\n    <div class=\"row\" ng-hide=\"!directory\">\n      <div class=\"col-md-12\" ng-controller=\"Wiki.FileDropController\">\n        <div class=\"wiki-icon-view\" nv-file-drop nv-file-over uploader=\"uploader\" over-class=\"ready-drop\">\n          <div class=\"column-box mouse-pointer well\"\n               ng-repeat=\"child in children track by $index\"\n               ng-class=\"isInGroup(gridOptions.selectedItems, child, \'selected\', \'\')\"\n               ng-click=\"toggleSelectionFromGroup(gridOptions.selectedItems, child)\">\n            <div class=\"row\">\n              <div class=\"col-md-2\" hawtio-file-drop=\"{{child.fileName}}\" download-url=\"{{child.downloadURL}}\">\n                  <span class=\"app-logo\" ng-class=\"fileClass(child)\" compile=\"fileIconHtml(child)\"></span>\n              </div>\n              <div class=\"col-md-10\">\n                <h3>\n                  <a href=\"{{childLink(child)}}\">{{child.displayName || child.name}}</a>\n                </h3>\n              </div>\n            </div>\n            <div class=\"row\" ng-show=\"child.summary\">\n              <div class=\"col-md-12\">\n                <p compile=\"marked(child.summary)\"></p>\n              </div>\n            </div>\n          </div>\n        </div>\n      </div>\n    </div>\n    <div ng-hide=\"!html\" wiki-href-adjuster wiki-title-linker>\n      <div class=\"row\" style=\"margin-left: 10px\">\n        <div class=\"col-md-12\">\n          <div compile=\"html\"></div>\n        </div>\n      </div>\n    </div>\n  </div>\n  <!-- end Icon view -->\n\n  <!-- start List view -->\n  <div ng-show=\"mode == ViewMode.List\" class=\"wiki-fixed\">\n    <hawtio-pane position=\"left\" width=\"300\">\n      <div ng-controller=\"Wiki.FileDropController\">\n        <div class=\"wiki-list-view\" nv-file-drop nv-file-over uploader=\"uploader\" over-class=\"ready-drop\">\n          <div class=\"wiki-grid\" hawtio-list=\"gridOptions\"></div>\n        </div>\n      </div>\n    </hawtio-pane>\n    <div class=\"row\">\n      <div ng-class=\"col-md-12\">\n        <div ng-hide=\"!showProfileHeader\">\n          <div class=\"row\">\n            <div class=\"col-md-12\">\n              <div fabric-profile-details version-id=\"versionId\" profile-id=\"profileId\"></div>\n              <p></p>\n            </div>\n          </div>\n        </div>\n        <div ng-hide=\"!showAppHeader\">\n          <div class=\"row\">\n            <div class=\"col-md-12\">\n              <div kubernetes-json=\"kubernetesJson\" children=\"children\"></div>\n            </div>\n          </div>\n        </div>\n        <div ng-hide=\"!html\" wiki-href-adjuster wiki-title-linker>\n          <div class=\"row\" style=\"margin-left: 10px\">\n            <div class=\"col-md-12\">\n              <div compile=\"html\"></div>\n            </div>\n          </div>\n        </div>\n      </div>\n    </div>\n  </div>\n  <!-- end List view -->\n  <div ng-include=\"sourceView\" class=\"editor-autoresize\"></div>\n</div>\n");
$templateCache.put("plugins/wiki/html/modal/deleteDialog.html","<div>\n  <form class=\"form-horizontal\" ng-submit=\"deleteAndCloseDialog()\">\n    <div class=\"modal-header\"><h4>Delete Document</h4></div>\n    <div class=\"modal-body\">\n      <div class=\"control-group\">\n        <p>You are about to delete\n          <ng-pluralize count=\"gridOptions.selectedItems.length\"\n                        when=\"{\'1\': \'this document!\', \'other\': \'these {} documents!\'}\">\n          </ng-pluralize>\n        </p>\n\n        <div ng-bind-html-unsafe=\"selectedFileHtml\"></div>\n        <p class=\"alert alert-danger\" ng-show=\"warning\" ng-bind-html-unsafe=\"warning\">\n        </p>\n      </div>\n    </div>\n    <div class=\"modal-footer\">\n      <input class=\"btn btn-primary\" type=\"submit\"\n             value=\"Delete\">\n      <button class=\"btn btn-warning cancel\" type=\"button\" ng-click=\"close()\">Cancel</button>\n    </div>\n  </form>\n</div>\n");
$templateCache.put("plugins/wiki/html/modal/moveDialog.html","<div>\n    <form class=\"form-horizontal\" ng-submit=\"moveAndCloseDialog()\">\n    <div class=\"modal-header\"><h4>Move Document</h4></div>\n    <div class=\"modal-body\">\n      <div class=\"control-group\">\n        <label class=\"control-label\" for=\"moveFolder\">Folder</label>\n\n        <div class=\"controls\">\n          <input type=\"text\" id=\"moveFolder\" ng-model=\"move.moveFolder\"\n                 typeahead=\"title for title in folderNames($viewValue) | filter:$viewValue\" typeahead-editable=\'true\'>\n        </div>\n      </div>\n    </div>\n    <div class=\"modal-footer\">\n      <input class=\"btn btn-primary\" type=\"submit\"\n             ng-disabled=\"!move.moveFolder\"\n             value=\"Move\">\n      <button class=\"btn btn-warning cancel\" type=\"button\" ng-click=\"close()\">Cancel</button>\n    </div>\n  </form>\n</div>");
$templateCache.put("plugins/wiki/html/modal/renameDialog.html","<div>\n  <form class=\"form-horizontal\" ng-submit=\"renameAndCloseDialog()\">\n    <div class=\"modal-header\"><h4>Rename Document</h4></div>\n    <div class=\"modal-body\">\n      <div class=\"row\">\n        <div class=\"form-group\">\n          <label class=\"col-sm-2 control-label\" for=\"renameFileName\">Name</label>\n\n          <div class=\"col-sm-10\">\n            <input type=\"text\" id=\"renameFileName\" ng-model=\"rename.newFileName\">\n          </div>\n        </div>\n\n        <div class=\"form-group\">\n          <div ng-show=\"fileExists.exists\" class=\"alert\">\n            Please choose a different name as <b>{{fileExists.name}}</b> already exists\n          </div>\n        </div>\n      </div>\n    </div>\n    <div class=\"modal-footer\">\n      <input class=\"btn btn-primary\" type=\"submit\"\n             ng-disabled=\"!fileName || fileExists.exists\"\n             value=\"Rename\">\n      <button class=\"btn btn-warning cancel\" type=\"button\" ng-click=\"close()\">Cancel</button>\n    </div>\n  </form>\n</div>\n");}]); hawtioPluginLoader.addModule("fabric8-console-templates");