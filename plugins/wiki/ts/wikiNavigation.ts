/// <reference path="../../includes.ts"/>


/**
 * @module Wiki
 */
module Wiki {

  Developer.customProjectSubTabFactories.push(
    (context) => {
      var projectLink = context.projectLink;
      var wikiLink = null;
      if (projectLink) {
        wikiLink = UrlHelpers.join(projectLink, "wiki", "view");
      }
      var projectId = context.projectName;
      var ns = context.namespace;
      var camelLink = Forge.projectCamelOverviewLink(ns, projectId);
      var forgeLink = Forge.projectCommandsLink(ns, projectId);

      return [{
        isValid: () => wikiLink && Developer.forgeReadyLink(),
        href: wikiLink,
        label: "Source",
        isActive: (subTab, path) => {
          var rootPath = subTab.href.replace(/\/view/, '');
          log.debug("rootPath: ", rootPath, " path: ", path);
          return _.startsWith(path, rootPath);
        },
        title: "Browse the source code of this project"
      },
      {
        isValid: () => camelLink && Developer.forgeReadyLink(),
        label: "Camel",
        icon: "/img/icons/camel.svg",
        href: camelLink,
        title: "View the camel perspective for this project"
      },
      {
        isValid: () => forgeLink && Developer.forgeReadyLink(),
        label: "Forge",
        href: forgeLink,
        class: "fa fa-wrench",
        title: "Run a JBoss Forge command on this project"
      }];
    });


  export function createSourceBreadcrumbs($scope) {
    var sourceLink = $scope.$viewLink || UrlHelpers.join(startLink($scope), "view");
    return [
      {
        label: "Source",
        href: sourceLink,
        title: "Browse the source code of this project"
      }
    ]
  }

  export function createEditingBreadcrumb($scope) {
    return {
      label: "Editing",
      title: "Editing this file"
    };
  }
}
