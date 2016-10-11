/// <reference path="../../includes.ts"/>
/// <reference path="wikiHelpers.ts"/>
/// <reference path="wikiPlugin.ts"/>

/**
 * @module Wiki
 */
module Wiki {

  // main page controller
  export var ViewController = _module.controller("Wiki.ViewController", ["$scope", "$location", "$routeParams", "$route", "$http", "$timeout", "marked", "fileExtensionTypeRegistry",  "$compile", "$templateCache", "localStorage", "$interpolate", "$dialog", ($scope, $location:ng.ILocationService, $routeParams:ng.route.IRouteParamsService, $route:ng.route.IRouteService, $http:ng.IHttpService, $timeout:ng.ITimeoutService, marked, fileExtensionTypeRegistry,  $compile:ng.ICompileService, $templateCache:ng.ITemplateCacheService, localStorage, $interpolate:ng.IInterpolateService, $dialog) => {

    $scope.name = "WikiViewController";

    // TODO remove!
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
    $scope.renameDialog = <WikiDialog> null;
    $scope.moveDialog = <WikiDialog> null;
    $scope.deleteDialog = <WikiDialog> null;
    $scope.isFile = false;

    $scope.rename = {
      newFileName: ""
    };
    $scope.move = {
      moveFolder: ""
    };
    $scope.ViewMode = Wiki.ViewMode;

    // bind filter model values to search params...
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

    // only reload the page if certain search parameters change
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

    $scope.$on('Wiki.SetViewMode', ($event, mode:Wiki.ViewMode) => {
      $scope.mode = mode;
      switch(mode) {
        case ViewMode.List:
          log.debug("List view mode");
          break;
        case ViewMode.Icon:
          log.debug("Icon view mode");
          break;
        default:
          $scope.mode = ViewMode.List;
          log.debug("Defaulting to list view mode");
          break;
      }
    });


    $scope.childActions = [];

    var maybeUpdateView = Core.throttled(updateView, 1000);

    $scope.marked = (text) => {
      if (text) {
        return marked(text);
      } else {
        return '';
      }
    };


    $scope.$on('wikiBranchesUpdated', function () {
      updateView();
    });

    $scope.createDashboardLink = () => {
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

    $scope.displayClass = () => {
      if (!$scope.children || $scope.children.length === 0) {
        return "";
      }
      return "span9";
    };

    $scope.parentLink = () => {
      var start = startLink($scope);
      var prefix = start + "/view";
      //log.debug("pageId: ", $scope.pageId)
      var parts = $scope.pageId.split("/");
      //log.debug("parts: ", parts);
      var path = "/" + parts.first(parts.length - 1).join("/");
      //log.debug("path: ", path);
      return Core.createHref($location, prefix + path, []);
    };


    $scope.childLink = (child) => {
      var start = startLink($scope);
      var prefix = start + "/view";
      var postFix = "";
      var path = Wiki.encodePath(child.path);
      if (child.directory) {
        // if we are a folder with the same name as a form file, lets add a form param...
        var formPath = path + ".form";
        var children = $scope.children;
        if (children) {
          var formFile = children.find((child) => {
            return child['path'] === formPath;
          });
          if (formFile) {
            prefix = start + "/formTable";
            postFix = "?form=" + formPath;
          }
        }
      } else {
        var xmlNamespaces = child.xml_namespaces || child.xmlNamespaces;
        if (xmlNamespaces && xmlNamespaces.length) {
          if (_.some(xmlNamespaces, (ns) => _.some(Wiki.camelNamespaces, ns))) {
            if (useCamelCanvasByDefault) {
              prefix = start + "/camel/canvas";
            } else {
              prefix = start + "/camel/properties";
            }
          } else if (_.some(xmlNamespaces, (ns) => _.some(Wiki.dozerNamespaces, ns))) {
            prefix = start + "/dozer/mappings";
          } else {
            log.debug("child " + path + " has namespaces " + xmlNamespaces);
          }
        }
        if (_.endsWith(child.path, ".form")) {
          postFix = "?form=/";
        } else if (Wiki.isIndexPage(child.path)) {
          // lets default to book view on index pages
          prefix = start + "/book";
        }
      }
      return Core.createHref($location, UrlHelpers.join(prefix, path) + postFix, ["form"]);
    };

    $scope.fileName = (entity) => {
      return Wiki.hideFileNameExtensions(entity.displayName || entity.name);
    };

    $scope.fileClass = (entity) => {
      if (entity.name.indexOf(".profile") > -1) {
        return "green";
      }
      return "";
    };

    $scope.fileIconHtml = entity => Wiki.fileIconHtml(entity, $scope);

    $scope.format = Wiki.fileFormat($scope.pageId, fileExtensionTypeRegistry);
    var options = {
      readOnly: true,
      mode: {
        name: $scope.format
      }
    };
    $scope.codeMirrorOptions = CodeEditor.createEditorSettings(options);

    $scope.editLink = () => {
      var pageName = ($scope.directory) ? $scope.readMePath : $scope.pageId;
      return (pageName) ? Wiki.editLink($scope, pageName, $location) : null;
    };

    $scope.forgeLink = () => {
      return Forge.projectCommandsLink($scope.namespace, $scope.projectId);
    };

    $scope.camelLink = () => {
      return Forge.projectCamelOverviewLink($scope.namespace, $scope.projectId);
    };

    $scope.branchLink = (branch) => {
      if (branch) {
        return Wiki.branchLink($scope.projectId, $scope.branch, $scope.pageId, $location);
      }
      return null
    };

    $scope.historyLink = "#/wiki" + ($scope.branch ? "/branch/" + $scope.branch : "") + "/history/" + $scope.pageId;

    $scope.$watch('workspace.tree', function () {
      if (!$scope.git) {
        // lets do this asynchronously to avoid Error: $digest already in progress
        //log.info("Reloading view as the tree changed and we have a git mbean now");
        setTimeout(maybeUpdateView, 50);
      }
    });

    $scope.$on("$routeChangeSuccess", function (event, current, previous) {
      // lets do this asynchronously to avoid Error: $digest already in progress
      //log.info("Reloading view due to $routeChangeSuccess");
      setTimeout(maybeUpdateView, 50);
    });


    $scope.openDeleteDialog = () => {
      if ($scope.gridOptions.selectedItems.length) {
        $scope.selectedFileHtml = "<ul>" + $scope.gridOptions.selectedItems.map(file => "<li>" + file.name + "</li>").sort().join("") + "</ul>";

        if ($scope.gridOptions.selectedItems.find((file) => { return file.name.endsWith(".profile")})) {
          $scope.deleteWarning = "You are about to delete document(s) which represent Fabric8 profile(s). This really can't be undone! Wiki operations are low level and may lead to non-functional state of Fabric.";
        } else {
          $scope.deleteWarning = null;
        }

        $scope.deleteDialog = Wiki.getDeleteDialog($dialog, <Wiki.DeleteDialogOptions>{
          callbacks: () => { return $scope.deleteAndCloseDialog; },
          selectedFileHtml: () =>  { return $scope.selectedFileHtml; },
          warning: () => { return $scope.deleteWarning; }
        });

        $scope.deleteDialog.open();

      } else {
        log.debug("No items selected right now! " + $scope.gridOptions.selectedItems);
      }
    };

    $scope.deleteAndCloseDialog = () => {
      var files = $scope.gridOptions.selectedItems;
      var fileCount = files.length;
      log.debug("Deleting selection: " + files);

      var pathsToDelete = [];
      angular.forEach(files, (file, idx) => {
        var path = UrlHelpers.join($scope.pageId, file.name);
        pathsToDelete.push(path);
      });

      log.debug("About to delete " + pathsToDelete);
      $scope.git = wikiRepository.removePages($scope.branch, pathsToDelete, null, (result) => {
        $scope.gridOptions.selectedItems = [];
        var message = Core.maybePlural(fileCount, "document");
        Core.notification("success", "Deleted " + message);
        Core.$apply($scope);
        updateView();
      });
      $scope.deleteDialog.close();
    };

    $scope.$watch("rename.newFileName", () => {
      // ignore errors if the file is the same as the rename file!
      var path = getRenameFilePath();
      if ($scope.originalRenameFilePath === path) {
        $scope.fileExists = { exists: false, name: null };
      } else {
        checkFileExists(path);
      }
    });

    $scope.renameAndCloseDialog = () => {
      if ($scope.gridOptions.selectedItems.length) {
        var selected = $scope.gridOptions.selectedItems[0];
        var newPath = getRenameFilePath();
        if (selected && newPath) {
          var oldName = selected.name;
          var newName = Wiki.fileName(newPath);
          var oldPath = UrlHelpers.join($scope.pageId, oldName);
          log.debug("About to rename file " + oldPath + " to " + newPath);
          $scope.git = wikiRepository.rename($scope.branch, oldPath, newPath, null, (result) => {
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

    $scope.openRenameDialog = () => {
      var name = null;
      if ($scope.gridOptions.selectedItems.length) {
        var selected = $scope.gridOptions.selectedItems[0];
        name = selected.name;
      }
      if (name) {
        $scope.rename.newFileName = name;
        $scope.originalRenameFilePath = getRenameFilePath();

        $scope.renameDialog = Wiki.getRenameDialog($dialog, <Wiki.RenameDialogOptions>{
          rename: () => {  return $scope.rename; },
          fileExists: () => { return $scope.fileExists; },
          fileName: () => { return $scope.fileName; },
          callbacks: () => { return $scope.renameAndCloseDialog; }
        });

        $scope.renameDialog.open();

        $timeout(() => {
          $('#renameFileName').focus();
        }, 50);
      } else {
        log.debug("No items selected right now! " + $scope.gridOptions.selectedItems);
      }
    };

    $scope.moveAndCloseDialog = () => {
      var files = $scope.gridOptions.selectedItems;
      var fileCount = files.length;
      var moveFolder = $scope.move.moveFolder;
      var oldFolder:string = $scope.pageId;
      if (moveFolder && fileCount && moveFolder !== oldFolder) {
        log.debug("Moving " + fileCount + " file(s) to " + moveFolder);
        angular.forEach(files, (file, idx) => {
          var oldPath = oldFolder + "/" + file.name;
          var newPath = moveFolder + "/" + file.name;
          log.debug("About to move " + oldPath + " to " + newPath);
          $scope.git = wikiRepository.rename($scope.branch, oldPath, newPath, null, (result) => {
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

    $scope.folderNames = (text) => {
      return wikiRepository.completePath($scope.branch, text, true, null);
    };

    $scope.openMoveDialog = () => {
      if ($scope.gridOptions.selectedItems.length) {
        $scope.move.moveFolder = $scope.pageId;

        $scope.moveDialog = Wiki.getMoveDialog($dialog, <Wiki.MoveDialogOptions>{
          move: () => {  return $scope.move; },
          folderNames: () => { return $scope.folderNames; },
          callbacks: () => { return $scope.moveAndCloseDialog; }
        });

        $scope.moveDialog.open();

        $timeout(() => {
          $('#moveFolder').focus();
        }, 50);
      } else {
        log.debug("No items selected right now! " + $scope.gridOptions.selectedItems);
      }
    };


    setTimeout(maybeUpdateView, 50);

    function isDiffView() {
      return $routeParams["diffObjectId1"] || $routeParams["diffObjectId2"] ? true : false
    }

    function updateView() {
        // TODO remove!
        var jolokia = null;


      if (isDiffView()) {
        var baseObjectId = $routeParams["diffObjectId2"];
        $scope.git = wikiRepository.diff($scope.objectId, baseObjectId, $scope.pageId, onFileDetails);
      } else {
        $scope.git = wikiRepository.getPage($scope.branch, $scope.pageId, $scope.objectId, onFileDetails);
      }
      Wiki.loadBranches(jolokia, wikiRepository, $scope, isFmc);
    }

    $scope.updateView = updateView;

    function viewContents(pageName, details) {
      let contents = details.text;
      $scope.sourceView = null;

      var format:string = null;
      if (isDiffView()) {
        format = "diff";
      } else {
        format = Wiki.fileFormat(pageName, fileExtensionTypeRegistry) || $scope.format;
      }
      log.debug("File format: ", format);
      switch (format) {
        case "image":
          $scope.html = $interpolate($templateCache.get<string>("imageTemplate.html"))({
            imageUrl: gitRestURL($scope, $scope.pageId, $scope.branch),
            mediaType: fileExtension($scope.pageId).toLowerCase() === 'svg' ? 'image/svg+xml' : 'application/octet-stream'
          });
          break;
        case "markdown":
          let renderer = new marked.Renderer();
          // Adapt the relative image URLs to retrieve content from the Forge API
          renderer.image = (href: string, title: string, text: string) => {
            let uri = new URI(href);
            if (uri.is('relative')) {
              if (_.startsWith(uri.path(), '/')) {
                uri.segment(['profiles', ...uri.segment()]);
              } else {
                uri = uri.absoluteTo(new URI(details.path).filename(''));
              }
              // Use URL.createObjectURL via angular-img-http-src to get an URL for the image BLOB
              return '<img http-src="' + gitRestURL($scope, uri.normalize().toString()) + '" alt="' + (title ? title : text) + '" />';
            } else {
              // Simply return the img tag with the original location
              return '<img src="' + href + '" alt="' + (title ? title : text) + '" />';
            }
          };
          $scope.html = contents ? marked(contents, {renderer: renderer}) : "";
          break;
        case "javascript":
          var form = null;
          form = $location.search()["form"];
          $scope.source = contents;
          $scope.form = form;
          if (form) {
            // now lets try load the form JSON so we can then render the form
            $scope.sourceView = null;
            $scope.git = wikiRepository.getPage($scope.branch, form, $scope.objectId, (details) => {
              onFormSchema(Wiki.parseJson(details.text));
            });
          } else {
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
      $scope.directory = details.directory;
      $scope.fileDetails = details;

      if (details && details.format) {
        $scope.format = details.format;
      } else {
        $scope.format = Wiki.fileFormat($scope.pageId, fileExtensionTypeRegistry);
      }
      $scope.codeMirrorOptions.mode.name = $scope.format;
      $scope.children = null;

      if (details.directory) {
        var directories = _.filter(details.children, (dir:any) => dir.directory);
        var profiles = _.filter(details.children, (dir) => false);
        var files = _.filter(details.children, (file:any) => !file.directory);
        directories = _.sortBy(directories, (dir:any) => dir.name);
        profiles = _.sortBy(profiles, (dir:any) => dir.name);
        files = _.sortBy(_.sortBy(files, (file:any) => file.name), (file) => _.last(file.name.split('.')));
        // Also enrich the response with the current branch, as that's part of the coordinate for locating the actual file in git
        $scope.children = [].concat(directories, profiles, files).map((file) => {
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
        // if we have a readme then lets render it...
        var item = $scope.children.find((info) => {
          var name = (info.name || "").toLowerCase();
          var ext = fileExtension(name);
          return name && ext && ((name.startsWith("readme.") || name === "readme") || (name.startsWith("index.") || name === "index"));
        });
        if (item) {
          var pageName = item.path;
          $scope.readMePath = pageName;
          wikiRepository.getPage($scope.branch, pageName, $scope.objectId, (readmeDetails) => {
            viewContents(pageName, readmeDetails);
          });
        }
        var kubernetesJson = $scope.children.find((child) => {
          var name = (child.name || "").toLowerCase();
          var ext = fileExtension(name);
          return name && ext && name.startsWith("kubernetes") && ext === "json";
        });
        if (kubernetesJson) {
          wikiRepository.getPage($scope.branch, kubernetesJson.path, undefined, (json) => {
            if (json && json.text) {
              try {
                $scope.kubernetesJson = angular.fromJson(json.text);
              } catch (e) {
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
      } else {
        $scope.$broadcast('pane.close');
        var pageName = $scope.pageId;
        viewContents(pageName, details);
        $scope.isFile = true;
      }
      Core.$apply($scope);
    }

    function checkFileExists(path) {
      $scope.operationCounter += 1;
      var counter = $scope.operationCounter;
      if (path) {
        wikiRepository.exists($scope.branch, path, (result) => {
          // filter old results
          if ($scope.operationCounter === counter) {
            log.debug("checkFileExists for path " + path + " got result " + result);
            $scope.fileExists.exists = result ? true : false;
            $scope.fileExists.name = result ? result.name : null;
            Core.$apply($scope);
          } else {
            // log.debug("Ignoring old results for " + path);
          }
        });
      }
    }

    // Called by hawtio TOC directive...
    $scope.getContents = (filename, cb) => {
      var pageId = filename;
      if ($scope.directory) {
        pageId = $scope.pageId + '/' + filename;
      } else {
        var pathParts = $scope.pageId.split('/');
        pathParts = pathParts.remove(pathParts.last());
        pathParts.push(filename);
        pageId = pathParts.join('/');
      }
      log.debug("pageId: ", $scope.pageId);
      log.debug("branch: ", $scope.branch);
      log.debug("filename: ", filename);
      log.debug("using pageId: ", pageId);
      wikiRepository.getPage($scope.branch, pageId, undefined, (data) => {
        cb(data.text);
      });
    };


    function getRenameFilePath() {
      var newFileName = $scope.rename.newFileName;
      return ($scope.pageId && newFileName) ? UrlHelpers.join($scope.pageId, newFileName) : null;
    }
  }]);
}
