/// <reference path="../../includes.ts"/>
/// <reference path="wikiHelpers.ts"/>

/**
 * @module Wiki
 * @main Wiki
 */
module Wiki {

  export var pluginName = 'wiki';
  export var templatePath = 'plugins/wiki/html/';
  export var tab:any = null;

  export var _module = angular.module(pluginName, ['hawtio-core', 'hawtio-ui', 'treeControl', 'ui.codemirror']);
  export var controller = PluginHelpers.createControllerFunction(_module, 'Wiki');
  export var route = PluginHelpers.createRoutingFunction(templatePath);

  _module.config(["$routeProvider", ($routeProvider) => {

    // allow optional branch paths...
    angular.forEach(["", "/branch/:branch"], (path) => {
      //var startContext = '/wiki';
      var startContext = '/workspaces/:namespace/projects/:projectId/wiki';
      $routeProvider.
              when(UrlHelpers.join(startContext, path, 'view'), route('viewPage.html', false)).
              when(UrlHelpers.join(startContext, path, 'create/:page*'), route('create.html', false)).
              when(startContext + path + '/view/:page*', {templateUrl: 'plugins/wiki/html/viewPage.html', reloadOnSearch: false}).
              when(startContext + path + '/book/:page*', {templateUrl: 'plugins/wiki/html/viewBook.html', reloadOnSearch: false}).
              when(startContext + path + '/edit/:page*', {templateUrl: 'plugins/wiki/html/editPage.html'}).
              when(startContext + path + '/version/:page*\/:objectId', {templateUrl: 'plugins/wiki/html/viewPage.html'}).
              when(startContext + path + '/history/:page*', {templateUrl: 'plugins/wiki/html/history.html'}).
              when(startContext + path + '/commit/:page*\/:objectId', {templateUrl: 'plugins/wiki/html/commit.html'}).
              when(startContext + path + '/commitDetail/:page*\/:objectId', {templateUrl: 'plugins/wiki/html/commitDetail.html'}).
              when(startContext + path + '/diff/:diffObjectId1/:diffObjectId2/:page*', {templateUrl: 'plugins/wiki/html/viewPage.html', reloadOnSearch: false}).
              when(startContext + path + '/formTable/:page*', {templateUrl: 'plugins/wiki/html/formTable.html'}).
              when(startContext + path + '/dozer/mappings/:page*', {templateUrl: 'plugins/wiki/html/dozerMappings.html'}).
              when(startContext + path + '/configurations/:page*', { templateUrl: 'plugins/wiki/html/configurations.html' }).
              when(startContext + path + '/configuration/:pid/:page*', { templateUrl: 'plugins/wiki/html/configuration.html' }).
              when(startContext + path + '/newConfiguration/:factoryPid/:page*', { templateUrl: 'plugins/wiki/html/configuration.html' }).
              when(startContext + path + '/camel/diagram/:page*', {templateUrl: 'plugins/wiki/html/camelDiagram.html'}).
              when(startContext + path + '/camel/canvas/:page*', {templateUrl: 'plugins/wiki/html/camelCanvas.html'}).
              when(startContext + path + '/camel/properties/:page*', {templateUrl: 'plugins/wiki/html/camelProperties.html'});
    });
}]);

  /**
   * Branch Menu service
   */
  export interface BranchMenu {
    addExtension: (item:UI.MenuItem) => void;
    applyMenuExtensions: (menu:UI.MenuItem[]) => void;
  }

  _module.factory('wikiBranchMenu', () => {
    var self = {
      items: [],
      addExtension: (item:UI.MenuItem) => {
        self.items.push(item);
      },
      applyMenuExtensions: (menu:UI.MenuItem[]) => {
        if (self.items.length === 0) {
          return;
        }
        var extendedMenu:UI.MenuItem[] = [{
          heading: "Actions"
        }];
        self.items.forEach((item:UI.MenuItem) => {
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

  _module.factory('WikiGitUrlPrefix', () => {
      return "";
  });

  _module.factory('fileExtensionTypeRegistry', () => {
    return {
      "image": ["svg", "png", "ico", "bmp", "jpg", "gif"],
      "markdown": ["md", "markdown", "mdown", "mkdn", "mkd"],
      "htmlmixed": ["html", "xhtml", "htm"],
      "text/x-ruby": ["rb"],
      "text/x-python": ["py"],
      "text/x-go": ["go"],
      "text/x-java": ["java"],
      "text/x-groovy": ["groovy"],
      "text/x-scala": ["scala"],
      "javascript": ["js", "json", "javascript", "jscript", "ecmascript", "form"],
      "xml": ["xml", "xsd", "wsdl", "atom"],
      "text/x-yaml": ["yaml", "yml"],
      "properties": ["properties"]
    };
  });

  _module.filter('fileIconClass', () => iconClass);

  _module.run(["$location","viewRegistry",  "localStorage", "layoutFull", "helpRegistry", "preferencesRegistry", "wikiRepository",
    "$rootScope", ($location:ng.ILocationService,
        viewRegistry,
        localStorage,
        layoutFull,
        helpRegistry,
        preferencesRegistry,
        wikiRepository,
        $rootScope) => {

    viewRegistry['wiki'] = templatePath + 'layoutWiki.html';
/*
    helpRegistry.addUserDoc('wiki', 'plugins/wiki/doc/help.md', () => {
      return Wiki.isWikiEnabled(workspace, jolokia, localStorage);
    });
*/

/*
    preferencesRegistry.addTab("Git", 'plugins/wiki/html/gitPreferences.html');
*/

/*
    tab = {
      id: "wiki",
      content: "Wiki",
      title: "View and edit wiki pages",
      isValid: (workspace:Workspace) => Wiki.isWikiEnabled(workspace, jolokia, localStorage),
      href: () => "#/wiki/view",
      isActive: (workspace:Workspace) => workspace.isLinkActive("/wiki") && !workspace.linkContains("fabric", "profiles") && !workspace.linkContains("editFeatures")
    };
    workspace.topLevelTabs.push(tab);
*/

    // add empty regexs to templates that don't define
    // them so ng-pattern doesn't barf
    Wiki.documentTemplates.forEach((template: any) => {
      if (!template['regex']) {
        template.regex = /(?:)/;
      }
    });

  }]);

  hawtioPluginLoader.addModule(pluginName);
}
