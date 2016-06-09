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
      var funktionLink = Forge.projectFunktionOverviewLink(ns, projectId);
      var forgeLink = Forge.projectCommandsLink(ns, projectId);

      if( context.$scope ) {
        Forge.updateForgeProject(context.$scope);
      }

      return [{
        isValid: () => wikiLink && Developer.forgeReadyLink(),
        href: wikiLink,
        label: "Source",
        class: "fa fa-code-fork",
        isActive: (subTab, path) => {
          var rootPath = subTab.href.replace(/\/view/, '');
          return _.startsWith(path, rootPath);
        },
        title: "Browse the source code of this project"
      },
      {
        isValid: () => funktionLink && Developer.forgeReadyLink() && Forge.forgeProject().hasPerspective("funktion"),
        label: "Funktion",
        class: "fa fa-codepen",
        href: funktionLink,
        title: "View the Funktion perspective for this project",
        isActive: (subTab, path) => {
          if (path.search(/forge\/funktion/) !== -1) {
            return true;
          }
          return false;
        }
      },
      {
        isValid: () => camelLink && Developer.forgeReadyLink() && Forge.forgeProject().hasPerspective("camel"),
        label: "Camel",
        icon: "img/icons/camel.svg",
        href: camelLink,
        title: "View the camel perspective for this project",
        isActive: (subTab, path) => {
          if (path.search(/forge\/camel/) !== -1) {
            return true;
          }
          if (path.search(/forge\/command\/camel/) !== -1) {
            return true;
          }
          return false;
        }
      },
      {
        isValid: () => forgeLink && Developer.forgeReadyLink() && Forge.forgeProject().hasBuilder("maven"),
        label: "Forge",
        href: forgeLink,
        class: "fa fa-wrench",
        title: "Run a JBoss Forge command on this project",
        isActive: (subTab, path) => {
          if (path.search(/forge\/command/) !== -1) {
            return true;
          }
          return false;

        }
      }];
    });


  export function createSourceBreadcrumbs($scope) {
    var sourceLink = $scope.$viewLink || UrlHelpers.join(startLink($scope), "view");
    return [
      {
        label: "Source",
        class: "fa fa-code-fork",
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
